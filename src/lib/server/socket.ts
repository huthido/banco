import type { Server, Socket } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents, ChatMessage } from "@/types/events";
import type { Side } from "@/types/game";
import type { Role, Room } from "@/types/room";
import { getEngine } from "@/lib/games";
import { getBotBrain, type BotLevel } from "@/lib/bots";
import {
  getRoom,
  restoreRoom,
  joinRoom,
  handleDisconnect,
  snapshotFor,
  resetForRematch,
  bothWantRematch,
  startRoomCleanup,
  startClock,
  advanceClock,
  stopClock,
  listClockSyncs,
} from "./rooms";
import { liveRemaining, timedOutSide } from "./clock";
import { isMyTurn, sanitizeChat, sanitizeSay, sanitizeName, genToken, isReaction } from "@/func";

/** Dữ liệu gắn vào mỗi socket. */
interface SocketData {
  roomId?: string;
  playerId?: string;
  role?: Role;
  side?: Side | null;
  name?: string;
}

export type AppServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;
type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

/** Gửi snapshot cá nhân hóa cho mọi socket trong phòng. */
function broadcastRoom(io: AppServer, room: Room) {
  const sockets = io.sockets.adapter.rooms.get(room.id);
  if (!sockets) return;
  for (const socketId of sockets) {
    const s = io.sockets.sockets.get(socketId) as AppSocket | undefined;
    if (!s) continue;
    s.emit("room:state", snapshotFor(room, { role: s.data.role ?? "spectator", side: s.data.side ?? null }));
  }
}

// Quản lý setTimeout phát hiện hết giờ — một timer cho mỗi phòng (custom server, 1 process).
const clockTimers = new Map<string, ReturnType<typeof setTimeout>>();

function clearClockTimer(roomId: string) {
  const t = clockTimers.get(roomId);
  if (t) {
    clearTimeout(t);
    clockTimers.delete(roomId);
  }
}

/** (Re)arm timer hết giờ cho bên đang chạy của phòng (đúng `remainingMs`). */
function armClockTimer(io: AppServer, room: Room) {
  clearClockTimer(room.id);
  const clock = room.clock;
  if (!clock || clock.running === null || room.status !== "playing") return;
  const delay = Math.max(0, liveRemaining(clock, clock.running, Date.now()));
  const t = setTimeout(() => onClockTimeout(io, room.id), delay);
  t.unref?.();
  clockTimers.set(room.id, t);
}

/** Khi timer bắn: chốt kết quả thua do hết giờ (server là nguồn chân lý — FR-005). */
function onClockTimeout(io: AppServer, roomId: string) {
  const room = getRoom(roomId);
  if (!room || room.status !== "playing" || !room.clock || room.clock.running === null) return;
  const now = Date.now();
  if (timedOutSide(room.clock, now) !== room.clock.running) {
    armClockTimer(io, room); // chưa thật sự hết (đã đổi lượt) -> arm lại
    return;
  }
  const loser = room.clock.running;
  const winner: Side = loser === "first" ? "second" : "first";
  stopClock(room, now);
  room.result = { winner, reason: "timeout" };
  room.status = "finished";
  clearClockTimer(roomId);
  broadcastRoom(io, room);
  io.to(roomId).emit("game:over", room.result);
}

/**
 * Áp dụng nước đi HỢP LỆ của `side` vào phòng rồi broadcast.
 * Dùng chung cho người chơi (move:make) và bot — tránh trùng lệch logic.
 * Giả định move đã được validate ở caller (vẫn validate lại để phòng thủ).
 */
function applyMoveToRoom(io: AppServer, room: Room, side: Side, data: unknown) {
  const now = Date.now();
  // Đua timeout↔move (U1/FR-005): hết giờ trước khi nước tới -> thua, không áp dụng nước muộn.
  if (room.clock && timedOutSide(room.clock, now) === side) {
    const winner: Side = side === "first" ? "second" : "first";
    stopClock(room, now);
    room.result = { winner, reason: "timeout" };
    room.status = "finished";
    clearClockTimer(room.id);
    broadcastRoom(io, room);
    io.to(room.id).emit("game:over", room.result);
    return;
  }
  const engine = getEngine(room.gameType);
  if (!engine.validateMove(room.state, data, side)) return;
  room.state = engine.applyMove(room.state, data, side);
  room.moveHistory.push({ side, data, label: engine.describeMove(data, side), at: now });
  const result = engine.checkResult(room.state, data);
  if (result) {
    room.result = result;
    room.status = "finished";
    stopClock(room, now);
    clearClockTimer(room.id);
  } else {
    room.turn = side === "first" ? "second" : "first";
    advanceClock(room, side, now); // trừ giờ bên vừa đi + increment + chuyển đồng hồ sang đối thủ
    armClockTimer(io, room);
  }
  broadcastRoom(io, room);
  if (result) io.to(room.id).emit("game:over", result);
  else maybeScheduleBotMove(io, room); // sau nước người -> tới lượt bot
}

// Timer đi nước của bot — một timer mỗi phòng (custom server, 1 process).
const botTimers = new Map<string, ReturnType<typeof setTimeout>>();

function clearBotTimer(roomId: string) {
  const t = botTimers.get(roomId);
  if (t) {
    clearTimeout(t);
    botTimers.delete(roomId);
  }
}

/** Độ trễ "suy nghĩ" của bot theo cấp độ (cấp cao nghĩ lâu hơn chút). */
function botDelayMs(level: number): number {
  return 350 + level * 120 + Math.floor(Math.random() * 250);
}

/**
 * Lên lịch cho bot đi khi tới lượt bot (đúng 1 timer mỗi phòng, không trùng).
 * An toàn khi gọi nhiều lần.
 */
function maybeScheduleBotMove(io: AppServer, room: Room) {
  if (!room.bot || room.status !== "playing" || room.result) return;
  if (room.turn !== room.bot.side) return;
  if (botTimers.has(room.id)) return;
  const level = room.bot.level;
  const t = setTimeout(() => {
    botTimers.delete(room.id);
    const cur = getRoom(room.id);
    if (!cur || !cur.bot || cur.status !== "playing" || cur.result) return;
    if (cur.turn !== cur.bot.side) return;
    const brain = getBotBrain(cur.gameType);
    if (!brain) return;
    const move = brain.chooseMove(cur.state, cur.bot.side, level as BotLevel);
    if (!move) return; // không có nước hợp lệ -> engine khác đã kết thúc ván
    applyMoveToRoom(io, cur, cur.bot.side, move);
  }, botDelayMs(level));
  t.unref?.();
  botTimers.set(room.id, t);
}

export function registerSocketHandlers(io: AppServer): void {
  startRoomCleanup();

  // Đồng bộ đồng hồ nhẹ định kỳ (5s) cho mọi phòng đang chạy giờ — người xem không bị lệch
  // khi một lượt kéo dài (giữa các snapshot). Client nội suy giữa các lần sync.
  const syncTimer = setInterval(() => {
    for (const c of listClockSyncs()) {
      io.to(c.id).emit("clock:sync", {
        roomId: c.id,
        remainingMs: c.remainingMs,
        running: c.running,
        serverNow: c.serverNow,
      });
    }
  }, 5000);
  syncTimer.unref?.();

  io.on("connection", (socket: AppSocket) => {
    socket.on("room:join", (payload, ack) => {
      let room = getRoom(payload.roomId);
      // Phòng đã mất nhưng client có bản lưu -> khôi phục.
      if (!room && payload.restore && payload.restore.inviteToken === payload.inviteToken) {
        room = restoreRoom(payload.roomId, payload.restore) ?? undefined;
      }
      if (!room) {
        ack({ ok: false, error: "Phòng không tồn tại hoặc đã đóng." });
        return;
      }
      const name = sanitizeName(payload.name);
      const outcome = joinRoom(room, {
        playerId: payload.playerId,
        name,
        role: payload.role,
        inviteToken: payload.inviteToken,
        socketId: socket.id,
      });

      socket.data.roomId = room.id;
      socket.data.playerId = payload.playerId;
      socket.data.role = outcome.role;
      socket.data.side = outcome.side;
      socket.data.name = name;
      socket.join(room.id);

      // Ván vừa đủ 2 người -> bắt đầu đếm giờ cho bên đi trước; nếu bot đi trước thì lên lịch.
      if (room.status === "playing") {
        startClock(room, Date.now());
        armClockTimer(io, room);
        maybeScheduleBotMove(io, room);
      }

      ack({ ok: true, snapshot: snapshotFor(room, { role: outcome.role, side: outcome.side }) });
      socket.to(room.id).emit("peer:joined", { name, role: outcome.role });
      broadcastRoom(io, room);
    });

    socket.on("move:make", (payload) => {
      const room = getRoom(payload.roomId);
      if (!room) return;
      const side = socket.data.side;
      if (socket.data.role !== "player" || !side) {
        socket.emit("error", { code: "NOT_PLAYER", message: "Bạn không phải người chơi." });
        return;
      }
      if (room.status !== "playing") {
        socket.emit("error", { code: "NOT_PLAYING", message: "Ván chưa bắt đầu hoặc đã kết thúc." });
        return;
      }
      if (!isMyTurn(room.turn, side)) {
        socket.emit("error", { code: "NOT_YOUR_TURN", message: "Chưa tới lượt bạn." });
        return;
      }

      const engine = getEngine(room.gameType);
      if (!engine.validateMove(room.state, payload.data, side)) {
        socket.emit("error", { code: "INVALID_MOVE", message: "Nước đi không hợp lệ." });
        return;
      }

      applyMoveToRoom(io, room, side, payload.data);
    });

    socket.on("game:resign", (payload) => {
      const room = getRoom(payload.roomId);
      if (!room) return;
      const side = socket.data.side;
      if (socket.data.role !== "player" || !side || room.status !== "playing") return;
      const winner: Side = side === "first" ? "second" : "first";
      room.result = { winner, reason: "đối thủ xin thua" };
      room.status = "finished";
      stopClock(room, Date.now());
      clearClockTimer(room.id);
      broadcastRoom(io, room);
      io.to(room.id).emit("game:over", room.result);
    });

    socket.on("game:rematch", (payload) => {
      const room = getRoom(payload.roomId);
      if (!room) return;
      const side = socket.data.side;
      if (socket.data.role !== "player" || !side || room.status !== "finished") return;

      if (room.bot) {
        // Chơi với máy: bot luôn đồng ý -> reset ngay (không cần chờ vote).
        resetForRematch(room);
        syncPlayerSides(io, room);
        clearClockTimer(room.id);
        clearBotTimer(room.id);
        startClock(room, Date.now());
        armClockTimer(io, room);
        broadcastRoom(io, room);
        maybeScheduleBotMove(io, room); // sau hoán phe, bot có thể đi trước
        return;
      }

      room.rematchVotes.add(side);
      if (bothWantRematch(room)) {
        resetForRematch(room); // cũng đặt lại đồng hồ theo timeControl
        // Sau khi hoán phe, cập nhật side của 2 socket người chơi.
        syncPlayerSides(io, room);
        // Bắt đầu lại đồng hồ cho ván mới (startClock/armClockTimer tự bỏ qua nếu chưa "playing").
        clearClockTimer(room.id);
        startClock(room, Date.now());
        armClockTimer(io, room);
      }
      broadcastRoom(io, room);
    });

    // Gợi ý nước đi (chế độ chơi với máy — đặc biệt cấp "Tập chơi"): server tính bằng bot brain.
    socket.on("hint:request", (payload, ack) => {
      const room = getRoom(payload.roomId);
      if (!room) {
        ack?.({ ok: false, error: "Phòng không tồn tại." });
        return;
      }
      const side = socket.data.side;
      if (socket.data.role !== "player" || !side) {
        ack?.({ ok: false, error: "Bạn không phải người chơi." });
        return;
      }
      const brain = room.bot ? getBotBrain(room.gameType) : null;
      if (!brain) {
        ack?.({ ok: false, error: "Phòng này không có gợi ý." });
        return;
      }
      const move = brain.suggestMove(room.state, side, room.bot!.level as BotLevel);
      if (!move) {
        ack?.({ ok: false, error: "Không có nước gợi ý." });
        return;
      }
      ack?.({ ok: true, move });
    });

    socket.on("chat:send", (payload) => {
      const room = getRoom(payload.roomId);
      if (!room) return;
      const text = sanitizeChat(payload.text);
      if (!text) return;
      const msg: ChatMessage = {
        id: genToken(),
        name: socket.data.name ?? "Ẩn danh",
        text,
        at: Date.now(),
      };
      io.to(room.id).emit("chat:message", msg);
    });

    // Thả cảm xúc: ai trong phòng cũng gửi được (người chơi + người xem).
    socket.on("reaction:send", (payload) => {
      const room = getRoom(payload.roomId);
      if (!room) return;
      if (socket.data.roomId !== room.id) return; // phải đang ở trong phòng
      if (!isReaction(payload.emoji)) return; // chỉ chấp nhận emoji trong danh sách
      io.to(room.id).emit("reaction:burst", {
        id: genToken(),
        emoji: payload.emoji,
        name: socket.data.name ?? "Ẩn danh",
      });
    });

    // Tin nhắn hiện trên bàn cờ — CHỈ người chơi (2 đối thủ) gửi được.
    socket.on("board:say", (payload) => {
      const room = getRoom(payload.roomId);
      if (!room) return;
      const side = socket.data.side;
      if (socket.data.role !== "player" || !side) {
        socket.emit("error", { code: "NOT_PLAYER", message: "Chỉ người chơi mới nhắn trên bàn." });
        return;
      }
      const text = sanitizeSay(payload.text);
      if (!text) return;
      io.to(room.id).emit("board:message", {
        side,
        name: socket.data.name ?? "Người chơi",
        text,
        at: Date.now(),
      });
    });

    socket.on("disconnect", () => {
      const affected = handleDisconnect(socket.id);
      for (const { room, name, role } of affected) {
        socket.to(room.id).emit("peer:left", { name, role });
        broadcastRoom(io, room);
      }
    });
  });
}

/** Sau rematch (đã hoán phe), gán lại side cho 2 socket người chơi theo playerId. */
function syncPlayerSides(io: AppServer, room: Room) {
  const sockets = io.sockets.adapter.rooms.get(room.id);
  if (!sockets) return;
  for (const socketId of sockets) {
    const s = io.sockets.sockets.get(socketId) as AppSocket | undefined;
    if (!s || s.data.role !== "player") continue;
    if (room.players.first?.id === s.data.playerId) s.data.side = "first";
    else if (room.players.second?.id === s.data.playerId) s.data.side = "second";
  }
}
