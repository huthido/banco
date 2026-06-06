"use client";

import type { GameType, Side, GameResult, Move } from "@/types/game";
import type { Role, RoomStatus } from "@/types/room";

const DB_NAME = "banco";
const DB_VERSION = 3;
const STORE = "boards";
const STORE_HISTORY = "history";
const STORE_PREFS = "prefs";

/** Một bàn cờ đã lưu trong IndexedDB (đủ để mở lại + khôi phục + mời lại). */
export type SavedBoard = {
  id: string; // = roomId (khoá chính)
  gameType: GameType;
  /** Có token => bạn là người chơi, mở lại sẽ giành lại ghế + có link mời. */
  inviteToken?: string;
  role: Role;
  side: Side | null;
  name: string;
  state: unknown;
  moveHistory: Move[];
  turn: Side;
  status: RoomStatus;
  result?: GameResult;
  players: { first: string | null; second: string | null };
  updatedAt: number;
};

/** Một ván đã kết thúc, lưu trong lịch sử (để xem lại / thống kê). */
export type GameRecord = {
  /** Khoá ổn định: `${roomId}:${số nước}:${winner}` -> ghi lại idempotent, không trùng. */
  id: string;
  roomId: string;
  gameType: GameType;
  result: GameResult;
  /** Phe của bạn trong ván (null nếu xem). */
  side: Side | null;
  players: { first: string | null; second: string | null };
  moveHistory: Move[];
  /** Thế cờ cuối, để xem nhanh/khởi điểm replay. */
  finalState: unknown;
  finishedAt: number;
};

/** Dữ liệu gửi lên server để khôi phục phòng nếu phòng đã bị mất (server restart). */
export type RestorePayload = {
  gameType: GameType;
  inviteToken: string;
  state: unknown;
  moveHistory: Move[];
  turn: Side;
  status: RoomStatus;
  result?: GameResult;
  yourSide: Side | null;
};

function hasIDB(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_HISTORY)) {
        db.createObjectStore(STORE_HISTORY, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_PREFS)) {
        db.createObjectStore(STORE_PREFS, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(storeName, mode);
        const req = fn(t.objectStore(storeName));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        t.oncomplete = () => db.close();
      })
  );
}

/** Lưu (ghi đè) một bàn cờ. Im lặng nếu IndexedDB không khả dụng. */
export async function putBoard(board: SavedBoard): Promise<void> {
  if (!hasIDB()) return;
  try {
    await tx(STORE, "readwrite", (s) => s.put(board));
  } catch {
    // bỏ qua lỗi lưu (vd chế độ riêng tư)
  }
}

export async function getBoard(id: string): Promise<SavedBoard | null> {
  if (!hasIDB()) return null;
  try {
    const r = await tx<SavedBoard | undefined>(STORE, "readonly", (s) => s.get(id));
    return r ?? null;
  } catch {
    return null;
  }
}

/** Tất cả bàn cờ đã lưu, mới nhất lên đầu. */
export async function getAllBoards(): Promise<SavedBoard[]> {
  if (!hasIDB()) return [];
  try {
    const r = await tx<SavedBoard[]>(STORE, "readonly", (s) => s.getAll());
    return (r ?? []).sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export async function deleteBoard(id: string): Promise<void> {
  if (!hasIDB()) return;
  try {
    await tx(STORE, "readwrite", (s) => s.delete(id));
  } catch {
    // bỏ qua
  }
}

// ---- Lịch sử ván đấu ----

/** Ghi một ván đã kết thúc (idempotent theo id). */
export async function addHistory(rec: GameRecord): Promise<void> {
  if (!hasIDB()) return;
  try {
    await tx(STORE_HISTORY, "readwrite", (s) => s.put(rec));
  } catch {
    // bỏ qua
  }
}

export async function getRecord(id: string): Promise<GameRecord | null> {
  if (!hasIDB()) return null;
  try {
    const r = await tx<GameRecord | undefined>(STORE_HISTORY, "readonly", (s) => s.get(id));
    return r ?? null;
  } catch {
    return null;
  }
}

/** Tất cả ván đã lưu, mới nhất lên đầu. */
export async function getHistory(): Promise<GameRecord[]> {
  if (!hasIDB()) return [];
  try {
    const r = await tx<GameRecord[]>(STORE_HISTORY, "readonly", (s) => s.getAll());
    return (r ?? []).sort((a, b) => b.finishedAt - a.finishedAt);
  } catch {
    return [];
  }
}

export async function deleteHistory(id: string): Promise<void> {
  if (!hasIDB()) return;
  try {
    await tx(STORE_HISTORY, "readwrite", (s) => s.delete(id));
  } catch {
    // bỏ qua
  }
}

export async function clearHistory(): Promise<void> {
  if (!hasIDB()) return;
  try {
    await tx(STORE_HISTORY, "readwrite", (s) => s.clear());
  } catch {
    // bỏ qua
  }
}

// ---- Tuỳ chọn người dùng (prefs) ----

const NAME_KEY = "displayName";
const NAME_LS_KEY = "banco:displayName"; // localStorage: đồng bộ, tin cậy

function lsGet(key: string): string | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}
function lsSet(key: string, value: string): void {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
  } catch {
    // bỏ qua
  }
}

/**
 * Lấy tên hiển thị đã lưu (để prefill ô nhập tên).
 * Ưu tiên localStorage (tức thì), dự phòng IndexedDB.
 */
export async function getSavedName(): Promise<string | null> {
  const ls = lsGet(NAME_LS_KEY);
  if (ls) return ls;
  if (!hasIDB()) return null;
  try {
    const r = await tx<{ key: string; value: string } | undefined>(
      STORE_PREFS,
      "readonly",
      (s) => s.get(NAME_KEY)
    );
    const v = r?.value ?? null;
    if (v) lsSet(NAME_LS_KEY, v); // đồng bộ ngược về localStorage
    return v;
  } catch {
    return null;
  }
}

/** Phiên bản đồng bộ — đọc ngay từ localStorage (dùng cho prefill tức thì). */
export function getSavedNameSync(): string | null {
  return lsGet(NAME_LS_KEY);
}

/** Lưu tên hiển thị để dùng cho các lần sau (cả localStorage và IndexedDB). */
export async function setSavedName(name: string): Promise<void> {
  lsSet(NAME_LS_KEY, name);
  if (!hasIDB()) return;
  try {
    await tx(STORE_PREFS, "readwrite", (s) => s.put({ key: NAME_KEY, value: name }));
  } catch {
    // bỏ qua
  }
}

/** Dựng payload khôi phục từ bàn đã lưu — chỉ khi là người chơi (có token). */
export function toRestorePayload(board: SavedBoard): RestorePayload | undefined {
  if (!board.inviteToken) return undefined;
  return {
    gameType: board.gameType,
    inviteToken: board.inviteToken,
    state: board.state,
    moveHistory: board.moveHistory,
    turn: board.turn,
    status: board.status,
    result: board.result,
    yourSide: board.side,
  };
}
