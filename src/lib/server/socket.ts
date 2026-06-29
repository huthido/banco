import type { Server, Socket } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents, ChatMessage } from "@/types/events";
import type { Side } from "@/types/game";
import type { Role, Room } from "@/types/room";
import { getEngine } from "@/lib/games";
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

      // Ván vừa đủ 2 người -> bắt đầu đếm giờ cho bên đi trước.
      if (room.status === "playing") {
        startClock(room, Date.now());
        armClockTimer(io, room);
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

      const now = Date.now();

      // Đua timeout↔move (U1/FR-005): nếu bên này đã hết giờ trước khi nước tới -> thua do hết giờ,
      // ưu tiên timeout thay vì áp dụng nước đi muộn.
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
      if (!engine.validateMove(room.state, payload.data, side)) {
        socket.emit("error", { code: "INVALID_MOVE", message: "Nước đi không hợp lệ." });
        return;
      }

      room.state = engine.applyMove(room.state, payload.data, side);
      room.moveHistory.push({
        side,
        data: payload.data,
        label: engine.describeMove(payload.data, side),
        at: now,
      });

      const result = engine.checkResult(room.state, payload.data);
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
