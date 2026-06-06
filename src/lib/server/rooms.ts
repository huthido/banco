import type { GameType, Side } from "@/types/game";
import type { Room, RoomSnapshot, Role, PublicPlayer, PlayerSlot } from "@/types/room";
import { genRoomId, genToken, otherSide } from "@/func";
import { getEngine, isGameSupported } from "@/lib/games";
import type { RoomRestore } from "@/types/events";

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

/** Tạo phòng mới, người tạo sẽ là phe `hostSide`. Trả về room. */
export function createRoom(gameType: GameType, hostSide: Side = "first"): Room {
  const engine = getEngine(gameType);
  let id = genRoomId();
  while (rooms.has(id)) id = genRoomId();

  const room: Room = {
    id,
    gameType,
    status: "waiting",
    players: {},
    spectators: new Map(),
    state: engine.createInitialState(),
    moveHistory: [],
    inviteToken: genToken(),
    turn: "first",
    rematchVotes: new Set<Side>(),
    createdAt: Date.now(),
  };
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
    players: {},
    spectators: new Map(),
    state: data.state ?? engine.createInitialState(),
    moveHistory: Array.isArray(data.moveHistory) ? data.moveHistory : [],
    inviteToken: data.inviteToken,
    turn: data.turn === "second" ? "second" : "first",
    result: data.result,
    rematchVotes: new Set<Side>(),
    createdAt: Date.now(),
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

  // 3) Đối thủ vào bằng link mời (token đúng) và còn slot trống.
  if (wantPlayer && tokenOk && (firstOpen || secondOpen)) {
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

/** Reset ván cho rematch: đổi state mới, giữ nguyên người chơi, hoán phe. */
export function resetForRematch(room: Room) {
  const engine = getEngine(room.gameType);
  room.state = engine.createInitialState();
  room.moveHistory = [];
  room.turn = "first";
  room.result = undefined;
  room.rematchVotes.clear();
  // Hoán phe để công bằng.
  const { first, second } = room.players;
  room.players.first = second;
  room.players.second = first;
  room.status = room.players.first && room.players.second ? "playing" : "waiting";
}

/** Tạo snapshot gửi cho 1 client cụ thể (đính kèm vai trò của họ). */
export function snapshotFor(room: Room, you: { role: Role; side: Side | null }): RoomSnapshot {
  const pub = (slot?: PlayerSlot): PublicPlayer =>
    slot ? { name: slot.name, connected: slot.connected } : null;

  return {
    id: room.id,
    gameType: room.gameType,
    status: room.status,
    players: { first: pub(room.players.first), second: pub(room.players.second) },
    spectatorCount: room.spectators.size,
    state: room.state,
    moveHistory: room.moveHistory,
    turn: room.turn,
    result: room.result,
    rematch: {
      first: room.rematchVotes.has("first"),
      second: room.rematchVotes.has("second"),
    },
    you,
  };
}

/** Phe đối diện đã sẵn sàng rematch chưa (cả 2 phe đồng ý). */
export function bothWantRematch(room: Room): boolean {
  return room.rematchVotes.has("first") && room.rematchVotes.has("second");
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
