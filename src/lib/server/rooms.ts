import type { GameType, Side } from "@/types/game";
import type { Room, RoomSnapshot, Role, PublicPlayer, PlayerSlot, PublicRoomInfo, TimeControl } from "@/types/room";
import { genRoomId, genToken, otherSide } from "@/func";
import { getEngine, isGameSupported } from "@/lib/games";
import type { RoomRestore } from "@/types/events";
import { initClock, startTurn, applyMove as clockApplyMove, stop as clockStop, liveRemaining } from "./clock";
import { BOT_NAME, BOT_LEVELS } from "@/lib/bots/types";

/**
 * Kho phòng in-memory. Lưu trên globalThis để API route của Next (dev mode chạy
 * trong module context riêng) và Socket.IO server cùng chia sẻ MỘT Map duy nhất.
 */
type RoomStore = {
  rooms: Map<string, Room>;
  hostSideHint: Map<string, Side>;
  cleanupStarted: boolean;
};

const g = globalThis as unknown as { __bancoStore?: RoomStore };
const store: RoomStore =
  g.__bancoStore ??
  (g.__bancoStore = { rooms: new Map(), hostSideHint: new Map(), cleanupStarted: false });

const rooms = store.rooms;

const ROOM_TTL_MS = 1000 * 60 * 60 * 6; // 6 giờ
const EMPTY_GRACE_MS = 1000 * 60 * 10; // phòng trống quá 10 phút thì dọn

/** Tạo phòng mới, người tạo sẽ là phe `hostSide`. `botLevel` (0-4) bật chế độ chơi với máy. */
export function createRoom(
  gameType: GameType,
  hostSide: Side = "first",
  isPublic = false,
  timeControl: TimeControl = { mode: "unlimited" },
  botLevel?: number
): Room {
  const engine = getEngine(gameType);
  let id = genRoomId();
  while (rooms.has(id)) id = genRoomId();

  const room: Room = {
    id,
    gameType,
    status: "waiting",
    isPublic,
    players: {},
    spectators: new Map(),
    state: engine.createInitialState(),
    moveHistory: [],
    inviteToken: genToken(),
    turn: "first",
    rematchVotes: new Set<Side>(),
    createdAt: Date.now(),
    timeControl,
    clock: initClock(timeControl),
  };
  // Chơi với máy: bot ngồi phe đối diện host, luôn "kết nối".
  if (botLevel !== undefined) {
    const botSide: Side = hostSide === "first" ? "second" : "first";
    room.players[botSide] = {
      id: `bot:${genToken()}`,
      name: `${BOT_NAME} (${BOT_LEVELS[botLevel]?.name ?? botLevel})`,
      socketId: null,
      connected: true,
    };
    room.bot = { level: botLevel, side: botSide };
  }
  rooms.set(id, room);
  // Lưu host muốn ngồi phe nào (xử lý khi họ join qua socket).
  store.hostSideHint.set(id, hostSide);
  return room;
}

export function takeHostSideHint(roomId: string): Side {
  const s = store.hostSideHint.get(roomId) ?? "first";
  store.hostSideHint.delete(roomId);
  return s;
}

export function getRoom(id: string): Room | undefined {
  return rooms.get(id);
}

/**
 * Khôi phục phòng từ snapshot client lưu (IndexedDB) khi phòng không còn trên
 * server (vd server đã restart). Trả về phòng đã tồn tại nếu có, hoặc null nếu
 * loại cờ không hỗ trợ.
 */
export function restoreRoom(roomId: string, data: RoomRestore): Room | null {
  const existing = rooms.get(roomId);
  if (existing) return existing;
  if (!isGameSupported(data.gameType)) return null;

  const engine = getEngine(data.gameType);
  // Bàn đang chơi dở -> đặt 'waiting' để nối lại khi đối thủ vào; đã xong -> giữ 'finished'.
  const status = data.status === "finished" ? "finished" : "waiting";

  const room: Room = {
    id: roomId,
    gameType: data.gameType,
    status,
    isPublic: false,
    players: {},
    spectators: new Map(),
    state: data.state ?? engine.createInitialState(),
    moveHistory: Array.isArray(data.moveHistory) ? data.moveHistory : [],
    inviteToken: data.inviteToken,
    turn: data.turn === "second" ? "second" : "first",
    result: data.result,
    rematchVotes: new Set<Side>(),
    createdAt: Date.now(),
    // MVP: khôi phục phòng không kèm đồng hồ (xem Assumptions trong spec — độ chính xác
    // tuyệt đối sau restart ngoài phạm vi v1). Phòng khôi phục chạy ở chế độ không giới hạn.
    timeControl: { mode: "unlimited" },
  };
  rooms.set(roomId, room);
  // Giữ đúng phe cho người khôi phục khi họ join ngay sau đó.
  if (data.yourSide) store.hostSideHint.set(roomId, data.yourSide);
  return room;
}

/** Tìm slot mà 1 playerId đang giữ (để reconnect). */
function findOwnedSide(room: Room, playerId: string): Side | null {
  if (room.players.first?.id === playerId) return "first";
  if (room.players.second?.id === playerId) return "second";
  return null;
}

export type JoinOutcome = {
  role: Role;
  side: Side | null;
  reconnected: boolean;
};

/**
 * Quyết định vai trò khi 1 người vào phòng:
 * - Đang giữ slot (cùng playerId) -> reconnect lại đúng phe.
 * - role=player + có inviteToken hợp lệ + còn slot trống -> ngồi vào slot trống.
 * - Phòng chưa có ai (host đầu tiên) -> ngồi phe gợi ý.
 * - Còn lại -> spectator.
 */
export function joinRoom(
  room: Room,
  opts: { playerId: string; name: string; role: Role; inviteToken?: string; socketId: string }
): JoinOutcome {
  const { playerId, name, role, inviteToken, socketId } = opts;

  // 1) Reconnect: đã giữ slot.
  const owned = findOwnedSide(room, playerId);
  if (owned) {
    const slot = room.players[owned]!;
    slot.socketId = socketId;
    slot.connected = true;
    slot.name = name || slot.name;
    return { role: "player", side: owned, reconnected: true };
  }

  const firstOpen = !room.players.first;
  const secondOpen = !room.players.second;
  const wantPlayer = role === "player";
  const tokenOk = inviteToken !== undefined && inviteToken === room.inviteToken;
  const isHostFirstJoin = room.players.first === undefined && room.players.second === undefined;

  // 2) Host vào lần đầu (chưa ai ngồi) -> ngồi phe gợi ý.
  if (wantPlayer && isHostFirstJoin) {
    const side = takeHostSideHint(room.id);
    seat(room, side, playerId, name, socketId);
    return { role: "player", side, reconnected: false };
  }

  // 3) Đối thủ vào bằng link mời (token đúng) HOẶC phòng công khai, và còn slot trống.
  if (wantPlayer && (tokenOk || room.isPublic) && (firstOpen || secondOpen)) {
    const side: Side = firstOpen ? "first" : "second";
    seat(room, side, playerId, name, socketId);
    return { role: "player", side, reconnected: false };
  }

  // 4) Mặc định: người xem.
  room.spectators.set(playerId, { name, socketId });
  return { role: "spectator", side: null, reconnected: false };
}

function seat(room: Room, side: Side, playerId: string, name: string, socketId: string) {
  const slot: PlayerSlot = { id: playerId, name, socketId, connected: true };
  room.players[side] = slot;
  // Đủ 2 người -> bắt đầu chơi.
  if (room.players.first && room.players.second && room.status === "waiting") {
    room.status = "playing";
  }
}

/** Đánh dấu mất kết nối theo socketId. Trả về thông tin để báo phòng. */
export function handleDisconnect(
  socketId: string
): { room: Room; name: string; role: Role }[] {
  const affected: { room: Room; name: string; role: Role }[] = [];
  for (const room of rooms.values()) {
    for (const side of ["first", "second"] as Side[]) {
      const slot = room.players[side];
      if (slot && slot.socketId === socketId) {
        slot.connected = false;
        slot.socketId = null;
        affected.push({ room, name: slot.name, role: "player" });
      }
    }
    for (const [pid, spec] of room.spectators) {
      if (spec.socketId === socketId) {
        room.spectators.delete(pid);
        affected.push({ room, name: spec.name, role: "spectator" });
      }
    }
  }
  return affected;
}

/**
 * Bắt đầu đếm giờ cho bên đang tới lượt khi ván vừa vào trạng thái "playing"
 * (chỉ khi có đồng hồ và chưa chạy). An toàn khi gọi nhiều lần.
 */
export function startClock(room: Room, now: number): void {
  if (room.clock && room.clock.running === null && room.status === "playing") {
    room.clock = startTurn(room.clock, room.turn, now);
  }
}

/** Cập nhật đồng hồ sau khi `mover` đi một nước hợp lệ (trừ giờ + increment + đổi bên). */
export function advanceClock(room: Room, mover: Side, now: number): void {
  if (!room.clock) return;
  const inc = room.timeControl.mode === "limited" ? room.timeControl.incrementMs : 0;
  room.clock = clockApplyMove(room.clock, mover, now, inc);
}

/** Dừng đồng hồ khi ván kết thúc (mọi lý do). */
export function stopClock(room: Room, now: number): void {
  if (room.clock) room.clock = clockStop(room.clock, now);
}

/** Reset ván cho rematch: đổi state mới, giữ nguyên người chơi, hoán phe. */
export function resetForRematch(room: Room) {
  const engine = getEngine(room.gameType);
  room.state = engine.createInitialState();
  room.moveHistory = [];
  room.turn = "first";
  room.result = undefined;
  room.rematchVotes.clear();
  // Đặt lại đồng hồ theo cấu hình ban đầu của phòng (FR-008).
  room.clock = initClock(room.timeControl);
  // Hoán phe để công bằng.
  const { first, second } = room.players;
  room.players.first = second;
  room.players.second = first;
  // Bot đổi phe theo slot mới (slot bot có id bắt đầu "bot:").
  if (room.bot) {
    if (room.players.first?.id.startsWith("bot:")) room.bot.side = "first";
    else if (room.players.second?.id.startsWith("bot:")) room.bot.side = "second";
  }
  room.status = room.players.first && room.players.second ? "playing" : "waiting";
}

/** Tạo snapshot gửi cho 1 client cụ thể (đính kèm vai trò của họ). */
export function snapshotFor(room: Room, you: { role: Role; side: Side | null }): RoomSnapshot {
  const pub = (slot?: PlayerSlot): PublicPlayer =>
    slot ? { name: slot.name, connected: slot.connected } : null;

  const now = Date.now();
  const clock = room.clock
    ? {
        remainingMs: {
          first: liveRemaining(room.clock, "first", now),
          second: liveRemaining(room.clock, "second", now),
        },
        running: room.clock.running,
        serverNow: now,
      }
    : undefined;

  return {
    id: room.id,
    gameType: room.gameType,
    status: room.status,
    isPublic: room.isPublic,
    players: { first: pub(room.players.first), second: pub(room.players.second) },
    spectatorCount: room.spectators.size,
    state: room.state,
    moveHistory: room.moveHistory,
    turn: room.turn,
    result: room.result,
    // Phe đang bị chiếu (vd cờ tướng) — engine nào không có khái niệm này thì null.
    check: getEngine(room.gameType).getCheck?.(room.state) ?? null,
    // Chơi với máy: cấp độ bot để client hiển thị + bật nút Gợi ý.
    bot: room.bot ? { level: room.bot.level } : undefined,
    rematch: {
      first: room.rematchVotes.has("first"),
      second: room.rematchVotes.has("second"),
    },
    timeControl: room.timeControl,
    clock,
    you,
  };
}

/** Phe đối diện đã sẵn sàng rematch chưa (cả 2 phe đồng ý). */
export function bothWantRematch(room: Room): boolean {
  return room.rematchVotes.has("first") && room.rematchVotes.has("second");
}

/**
 * Danh sách phòng công khai đang chờ đối thủ: phải đang ở trạng thái `waiting`,
 * có chủ phòng ĐANG kết nối và còn đúng 1 ghế trống để người mới ngồi vào.
 */
export function listPublicRooms(): PublicRoomInfo[] {
  const out: PublicRoomInfo[] = [];
  for (const room of rooms.values()) {
    if (!room.isPublic || room.status !== "waiting") continue;
    if (room.bot) continue; // phòng chơi với máy không hiện ở sảnh công khai
    const { first, second } = room.players;
    // Khi waiting, tối đa 1 ghế có người -> phe còn trống là phe chưa có slot.
    const openSide: Side | null = !first ? "first" : !second ? "second" : null;
    if (!openSide) continue;
    const host = first ?? second;
    if (!host || !host.connected) continue; // chủ phòng phải còn online
    out.push({
      id: room.id,
      gameType: room.gameType,
      host: host.name,
      openSide,
      createdAt: room.createdAt,
    });
  }
  // Mới tạo gần đây lên đầu.
  out.sort((a, b) => b.createdAt - a.createdAt);
  return out;
}

/** Dữ liệu đồng bộ đồng hồ cho các phòng đang có đồng hồ chạy (để emit định kỳ). */
export function listClockSyncs(): {
  id: string;
  remainingMs: { first: number; second: number };
  running: Side;
  serverNow: number;
}[] {
  const now = Date.now();
  const out: ReturnType<typeof listClockSyncs> = [];
  for (const room of rooms.values()) {
    const c = room.clock;
    if (room.status !== "playing" || !c || c.running === null) continue;
    out.push({
      id: room.id,
      remainingMs: { first: liveRemaining(c, "first", now), second: liveRemaining(c, "second", now) },
      running: c.running,
      serverNow: now,
    });
  }
  return out;
}

export { otherSide };

/** Dọn phòng cũ / trống định kỳ (chỉ chạy 1 lần). */
export function startRoomCleanup(): void {
  if (store.cleanupStarted) return;
  store.cleanupStarted = true;
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [id, room] of rooms) {
      const empty =
        room.spectators.size === 0 &&
        !room.players.first?.connected &&
        !room.players.second?.connected;
      const tooOld = now - room.createdAt > ROOM_TTL_MS;
      const emptyTooLong = empty && now - room.createdAt > EMPTY_GRACE_MS;
      if (tooOld || emptyTooLong) {
        rooms.delete(id);
        store.hostSideHint.delete(id);
      }
    }
  }, 1000 * 60);
  timer.unref?.();
}
