import type { Role, RoomStatus } from "./room";
import type { RoomSnapshot } from "./room";
import type { GameResult, GameType, Side, Move } from "./game";

/** Dữ liệu khôi phục phòng từ IndexedDB khi phòng không còn trên server. */
export type RoomRestore = {
  gameType: GameType;
  inviteToken: string;
  state: unknown;
  moveHistory: Move[];
  turn: Side;
  status: RoomStatus;
  result?: GameResult;
  yourSide: Side | null;
};

/** Sự kiện client -> server. */
export interface ClientToServerEvents {
  "room:join": (
    payload: {
      roomId: string;
      role: Role;
      name: string;
      playerId: string;
      inviteToken?: string;
      /** Nếu phòng đã mất, server dùng dữ liệu này để dựng lại bàn cờ. */
      restore?: RoomRestore;
    },
    ack: (res: { ok: true; snapshot: RoomSnapshot } | { ok: false; error: string }) => void
  ) => void;
  "move:make": (payload: { roomId: string; data: unknown }) => void;
  "game:resign": (payload: { roomId: string }) => void;
  "game:rematch": (payload: { roomId: string }) => void;
  "chat:send": (payload: { roomId: string; text: string }) => void;
  "reaction:send": (payload: { roomId: string; emoji: string }) => void;
  /** Tin nhắn nhanh của người chơi, hiện thành bong bóng trên bàn cờ. */
  "board:say": (payload: { roomId: string; text: string }) => void;
}

export type ChatMessage = {
  id: string;
  name: string;
  text: string;
  at: number;
};

/** Sự kiện server -> client. */
export interface ServerToClientEvents {
  "room:state": (snapshot: RoomSnapshot) => void;
  "game:over": (result: GameResult) => void;
  "peer:joined": (info: { name: string; role: Role }) => void;
  "peer:left": (info: { name: string; role: Role }) => void;
  "chat:message": (msg: ChatMessage) => void;
  /** Một lượt thả cảm xúc, broadcast cho cả phòng (gồm cả người gửi). */
  "reaction:burst": (r: { id: string; emoji: string; name: string }) => void;
  /** Tin nhắn bong bóng trên bàn cờ — kèm phe để định vị. */
  "board:message": (m: { side: Side; name: string; text: string; at: number }) => void;
  error: (err: { code: string; message: string }) => void;
}
