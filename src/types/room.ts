import type { GameType, Side, GameResult, Move } from "./game";

export type Role = "player" | "spectator";

export type RoomStatus = "waiting" | "playing" | "finished";

/** Một slot người chơi trong phòng (server-side). */
export type PlayerSlot = {
  /** id ổn định lưu ở localStorage để reconnect giữ slot. */
  id: string;
  name: string;
  socketId: string | null;
  connected: boolean;
};

/** Trạng thái phòng đầy đủ phía server. */
export type Room = {
  id: string;
  gameType: GameType;
  status: RoomStatus;
  /** Phòng công khai sẽ hiện ở sảnh chờ trang chủ; ai cũng ngồi được ghế trống. */
  isPublic: boolean;
  players: { first?: PlayerSlot; second?: PlayerSlot };
  spectators: Map<string, { name: string; socketId: string }>;
  /** Trạng thái bàn cờ do engine quản lý. */
  state: unknown;
  moveHistory: Move[];
  inviteToken: string;
  turn: Side;
  result?: GameResult;
  /** Theo dõi ai đã bấm "đánh lại". */
  rematchVotes: Set<Side>;
  createdAt: number;
};

/** Thông tin một người chơi gửi xuống client (không lộ socketId nội bộ là ok). */
export type PublicPlayer = {
  name: string;
  connected: boolean;
} | null;

/** Ảnh chụp trạng thái phòng gửi cho client. */
export type RoomSnapshot = {
  id: string;
  gameType: GameType;
  status: RoomStatus;
  isPublic: boolean;
  players: { first: PublicPlayer; second: PublicPlayer };
  spectatorCount: number;
  state: unknown;
  moveHistory: Move[];
  turn: Side;
  result?: GameResult;
  rematch: { first: boolean; second: boolean };
  /** Vai trò của chính người nhận snapshot này. */
  you: { role: Role; side: Side | null };
};

/** Tóm tắt một phòng công khai để hiển thị ở sảnh chờ trang chủ. */
export type PublicRoomInfo = {
  id: string;
  gameType: GameType;
  /** Tên chủ phòng đang chờ đối thủ. */
  host: string;
  /** Phe còn trống mà người mới sẽ ngồi vào. */
  openSide: Side;
  createdAt: number;
};
