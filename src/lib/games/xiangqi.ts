import type { GameEngine } from "./engine";
import type { GameMeta, GameResult, Side } from "@/types/game";
import { coordToIndex, inBounds } from "@/func";

// Toạ độ: x 0..8 (cột), y 0..9 (hàng). y=0 phía trên (Đen/second), y=9 phía dưới (Đỏ/first).
// Đỏ đi trước. Sông giữa y=4 và y=5. Cung: cột 3..5; Đỏ y7..9, Đen y0..2.

export const XIANGQI_COLS = 9;
export const XIANGQI_ROWS = 10;

export type XiangqiPieceType =
  | "general"
  | "advisor"
  | "elephant"
  | "horse"
  | "chariot"
  | "cannon"
  | "soldier";

export type XiangqiCell = { side: Side; type: XiangqiPieceType } | null;

export type XiangqiState = {
  grid: XiangqiCell[];
  cols: number;
  rows: number;
  last: { fx: number; fy: number; tx: number; ty: number } | null;
};

export type XiangqiMove = { fx: number; fy: number; tx: number; ty: number };

const meta: GameMeta = {
  type: "xiangqi",
  name: "Cờ tướng",
  boardCols: XIANGQI_COLS,
  boardRows: XIANGQI_ROWS,
  sides: ["Đỏ", "Đen"],
  description: "Cờ tướng Trung Hoa. Bắt được Tướng đối phương là thắng.",
};

const cell = (side: Side, type: XiangqiPieceType): XiangqiCell => ({ side, type });

function initialGrid(): XiangqiCell[] {
  const g: XiangqiCell[] = new Array(XIANGQI_COLS * XIANGQI_ROWS).fill(null);
  const set = (x: number, y: number, c: XiangqiCell) => (g[coordToIndex(x, y, XIANGQI_COLS)] = c);
  const backRow: XiangqiPieceType[] = [
    "chariot", "horse", "elephant", "advisor", "general", "advisor", "elephant", "horse", "chariot",
  ];
  // Đen (trên)
  backRow.forEach((t, x) => set(x, 0, cell("second", t)));
  set(1, 2, cell("second", "cannon"));
  set(7, 2, cell("second", "cannon"));
  [0, 2, 4, 6, 8].forEach((x) => set(x, 3, cell("second", "soldier")));
  // Đỏ (dưới)
  backRow.forEach((t, x) => set(x, 9, cell("first", t)));
  set(1, 7, cell("first", "cannon"));
  set(7, 7, cell("first", "cannon"));
  [0, 2, 4, 6, 8].forEach((x) => set(x, 6, cell("first", "soldier")));
  return g;
}

const at = (g: XiangqiCell[], x: number, y: number): XiangqiCell =>
  inBounds(x, y, XIANGQI_COLS, XIANGQI_ROWS) ? g[coordToIndex(x, y, XIANGQI_COLS)] : null;

const inPalace = (x: number, y: number, side: Side): boolean =>
  x >= 3 && x <= 5 && (side === "first" ? y >= 7 && y <= 9 : y >= 0 && y <= 2);

/** Số quân nằm giữa 2 ô trên cùng hàng/cột (không tính 2 đầu). */
function countBetween(g: XiangqiCell[], fx: number, fy: number, tx: number, ty: number): number {
  let n = 0;
  const dx = Math.sign(tx - fx);
  const dy = Math.sign(ty - fy);
  let x = fx + dx;
  let y = fy + dy;
  while (x !== tx || y !== ty) {
    if (at(g, x, y)) n++;
    x += dx;
    y += dy;
  }
  return n;
}

/** Hợp lệ về hình học/đường đi (chưa xét luật Tướng đối mặt). */
function geometryOk(g: XiangqiCell[], m: XiangqiMove, side: Side): boolean {
  const { fx, fy, tx, ty } = m;
  if (!inBounds(tx, ty, XIANGQI_COLS, XIANGQI_ROWS)) return false;
  const piece = at(g, fx, fy);
  if (!piece || piece.side !== side) return false;
  const dest = at(g, tx, ty);
  if (dest && dest.side === side) return false; // không ăn quân nhà
  const dx = tx - fx;
  const dy = ty - fy;
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);

  switch (piece.type) {
    case "general":
      return adx + ady === 1 && inPalace(tx, ty, side);
    case "advisor":
      return adx === 1 && ady === 1 && inPalace(tx, ty, side);
    case "elephant": {
      if (adx !== 2 || ady !== 2) return false;
      if (at(g, fx + dx / 2, fy + dy / 2)) return false; // mắt Tượng
      return side === "first" ? ty >= 5 : ty <= 4; // không qua sông
    }
    case "horse": {
      if (!((adx === 1 && ady === 2) || (adx === 2 && ady === 1))) return false;
      // chân Mã
      if (adx === 2) return !at(g, fx + Math.sign(dx), fy);
      return !at(g, fx, fy + Math.sign(dy));
    }
    case "chariot":
      if (dx !== 0 && dy !== 0) return false;
      return countBetween(g, fx, fy, tx, ty) === 0;
    case "cannon": {
      if (dx !== 0 && dy !== 0) return false;
      const between = countBetween(g, fx, fy, tx, ty);
      return dest ? between === 1 : between === 0; // ăn: nhảy 1 ngòi; đi: trống
    }
    case "soldier": {
      const forward = side === "first" ? -1 : 1; // Đỏ đi lên (y giảm)
      const crossed = side === "first" ? fy <= 4 : fy >= 5;
      if (dx === 0 && dy === forward) return true; // tiến
      if (crossed && ady === 0 && adx === 1) return true; // qua sông: đi ngang
      return false;
    }
  }
}

function applyTo(g: XiangqiCell[], m: XiangqiMove): XiangqiCell[] {
  const ng = g.slice();
  ng[coordToIndex(m.tx, m.ty, XIANGQI_COLS)] = ng[coordToIndex(m.fx, m.fy, XIANGQI_COLS)];
  ng[coordToIndex(m.fx, m.fy, XIANGQI_COLS)] = null;
  return ng;
}

function findGeneral(g: XiangqiCell[], side: Side): { x: number; y: number } | null {
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c && c.side === side && c.type === "general")
      return { x: i % XIANGQI_COLS, y: Math.floor(i / XIANGQI_COLS) };
  }
  return null;
}

/** Hai Tướng KHÔNG được đối mặt trực tiếp trên cùng cột (không có quân chắn). */
function generalsFacing(g: XiangqiCell[]): boolean {
  const a = findGeneral(g, "first");
  const b = findGeneral(g, "second");
  if (!a || !b || a.x !== b.x) return false;
  return countBetween(g, a.x, a.y, b.x, b.y) === 0;
}

function isXiangqiMove(v: unknown): v is XiangqiMove {
  const m = v as XiangqiMove;
  return (
    typeof v === "object" &&
    v !== null &&
    [m.fx, m.fy, m.tx, m.ty].every((n) => typeof n === "number")
  );
}

export const xiangqiEngine: GameEngine<XiangqiState, XiangqiMove> = {
  meta,

  createInitialState(): XiangqiState {
    return { grid: initialGrid(), cols: XIANGQI_COLS, rows: XIANGQI_ROWS, last: null };
  },

  validateMove(state, move, side): boolean {
    if (!isXiangqiMove(move)) return false;
    if (move.fx === move.tx && move.fy === move.ty) return false;
    if (!geometryOk(state.grid, move, side)) return false;
    // Sau khi đi, hai Tướng không được đối mặt.
    return !generalsFacing(applyTo(state.grid, move));
  },

  applyMove(state, move): XiangqiState {
    return { ...state, grid: applyTo(state.grid, move), last: { ...move } };
  },

  checkResult(state): GameResult | null {
    const red = findGeneral(state.grid, "first");
    const black = findGeneral(state.grid, "second");
    if (!black) return { winner: "first", reason: "bắt được Tướng" };
    if (!red) return { winner: "second", reason: "bắt được Tướng" };
    return null;
  },

  describeMove(move, side): string {
    const who = side === "first" ? "Đỏ" : "Đen";
    return `${who} (${move.fx + 1},${move.fy + 1})→(${move.tx + 1},${move.ty + 1})`;
  },
};

/** Các ô đích hợp lệ cho quân tại (fx,fy) — dùng cho gợi ý trên bàn. */
export function xiangqiTargets(state: XiangqiState, fx: number, fy: number): XiangqiMove[] {
  const piece = at(state.grid, fx, fy);
  if (!piece) return [];
  const out: XiangqiMove[] = [];
  for (let ty = 0; ty < XIANGQI_ROWS; ty++)
    for (let tx = 0; tx < XIANGQI_COLS; tx++) {
      const m = { fx, fy, tx, ty };
      if (xiangqiEngine.validateMove(state, m, piece.side)) out.push(m);
    }
  return out;
}

const PIECE_NAME: Record<XiangqiPieceType, { first: string; second: string }> = {
  general: { first: "帥", second: "將" },
  advisor: { first: "仕", second: "士" },
  elephant: { first: "相", second: "象" },
  horse: { first: "傌", second: "馬" },
  chariot: { first: "俥", second: "車" },
  cannon: { first: "炮", second: "砲" },
  soldier: { first: "兵", second: "卒" },
};

export function xiangqiGlyph(c: NonNullable<XiangqiCell>): string {
  return PIECE_NAME[c.type][c.side];
}
