import type { GameEngine } from "./engine";
import type { GameMeta, GameResult, Side } from "@/types/game";
import { coordToIndex, inBounds, otherSide } from "@/func";

// Cờ đam 8×8 (luật kiểu Anh/Mỹ): quân thường đi chéo tiến 1; ăn bằng cách nhảy
// qua quân địch kề tới ô trống phía sau; ăn liên hoàn bắt buộc nối hết; bắt buộc
// ăn nếu có nước ăn; tới hàng cuối phong Hậu (đi/ăn chéo cả 4 hướng, 1 bước).
// first = Đỏ (dưới, đi lên y giảm), second = Đen (trên, đi xuống y tăng).

export const CHECKERS_COLS = 8;
export const CHECKERS_ROWS = 8;

export type CheckersCell = { side: Side; king: boolean } | null;
export type CheckersState = {
  grid: CheckersCell[];
  cols: number;
  rows: number;
  turn: Side; // phe sắp đi (để xét hết nước)
  last: { path: { x: number; y: number }[] } | null;
};
export type CheckersMove = { path: { x: number; y: number }[] };

const meta: GameMeta = {
  type: "checkers",
  name: "Cờ đam",
  boardCols: CHECKERS_COLS,
  boardRows: CHECKERS_ROWS,
  sides: ["Đỏ", "Đen"],
  description: "Đi chéo, ăn quân bằng cách nhảy. Tới hàng cuối lên Hậu.",
};

const dark = (x: number, y: number) => (x + y) % 2 === 1;
const at = (g: CheckersCell[], x: number, y: number): CheckersCell =>
  inBounds(x, y, CHECKERS_COLS, CHECKERS_ROWS) ? g[coordToIndex(x, y, CHECKERS_COLS)] : null;
const promoRow = (side: Side) => (side === "first" ? 0 : CHECKERS_ROWS - 1);

function initialGrid(): CheckersCell[] {
  const g: CheckersCell[] = new Array(CHECKERS_COLS * CHECKERS_ROWS).fill(null);
  for (let y = 0; y < CHECKERS_ROWS; y++)
    for (let x = 0; x < CHECKERS_COLS; x++) {
      if (!dark(x, y)) continue;
      if (y <= 2) g[coordToIndex(x, y, CHECKERS_COLS)] = { side: "second", king: false };
      else if (y >= 5) g[coordToIndex(x, y, CHECKERS_COLS)] = { side: "first", king: false };
    }
  return g;
}

/** Hướng đi của quân: thường đi tiến; Hậu cả 4 hướng. */
function dirsFor(piece: NonNullable<CheckersCell>): [number, number][] {
  if (piece.king) return [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  const dy = piece.side === "first" ? -1 : 1;
  return [[1, dy], [-1, dy]];
}

type Sq = { x: number; y: number };

/** DFS sinh các chuỗi ăn (nối hết) bắt đầu từ quân tại (x,y). */
function jumpsFrom(
  g: CheckersCell[],
  x: number,
  y: number,
  piece: NonNullable<CheckersCell>,
  path: Sq[]
): Sq[][] {
  const out: Sq[][] = [];
  for (const [dx, dy] of dirsFor(piece)) {
    const mx = x + dx, my = y + dy;
    const lx = x + 2 * dx, ly = y + 2 * dy;
    if (!inBounds(lx, ly, CHECKERS_COLS, CHECKERS_ROWS)) continue;
    const mid = at(g, mx, my);
    if (!mid || mid.side === piece.side) continue; // phải nhảy qua quân địch
    if (at(g, lx, ly)) continue; // ô đáp phải trống
    // mô phỏng: bỏ quân bị ăn, dời quân tới ô đáp
    const ng = g.slice();
    ng[coordToIndex(mx, my, CHECKERS_COLS)] = null;
    ng[coordToIndex(x, y, CHECKERS_COLS)] = null;
    const promoted = !piece.king && ly === promoRow(piece.side);
    const moved = { side: piece.side, king: piece.king || promoted };
    ng[coordToIndex(lx, ly, CHECKERS_COLS)] = moved;
    const newPath = [...path, { x: lx, y: ly }];
    // Quân thường vừa phong Hậu thì DỪNG chuỗi (luật Anh/Mỹ).
    const cont = promoted ? [] : jumpsFrom(ng, lx, ly, moved, newPath);
    if (cont.length === 0) out.push(newPath);
    else out.push(...cont);
  }
  return out;
}

/** Toàn bộ nước hợp lệ của `side` (ưu tiên ăn nếu có — bắt buộc ăn). */
export function checkersLegalMoves(state: CheckersState, side: Side): CheckersMove[] {
  const g = state.grid;
  const jumps: CheckersMove[] = [];
  const steps: CheckersMove[] = [];
  for (let y = 0; y < CHECKERS_ROWS; y++)
    for (let x = 0; x < CHECKERS_COLS; x++) {
      const p = at(g, x, y);
      if (!p || p.side !== side) continue;
      const js = jumpsFrom(g, x, y, p, [{ x, y }]);
      for (const seq of js) jumps.push({ path: seq });
      if (js.length === 0) {
        for (const [dx, dy] of dirsFor(p)) {
          const tx = x + dx, ty = y + dy;
          if (inBounds(tx, ty, CHECKERS_COLS, CHECKERS_ROWS) && !at(g, tx, ty))
            steps.push({ path: [{ x, y }, { x: tx, y: ty }] });
        }
      }
    }
  return jumps.length > 0 ? jumps : steps; // bắt buộc ăn
}

const samePath = (a: Sq[], b: Sq[]) =>
  a.length === b.length && a.every((s, i) => s.x === b[i].x && s.y === b[i].y);

function isCheckersMove(v: unknown): v is CheckersMove {
  const m = v as CheckersMove;
  return (
    typeof v === "object" &&
    v !== null &&
    Array.isArray(m.path) &&
    m.path.length >= 2 &&
    m.path.every((s) => typeof s?.x === "number" && typeof s?.y === "number")
  );
}

export const checkersEngine: GameEngine<CheckersState, CheckersMove> = {
  meta,

  createInitialState(): CheckersState {
    return { grid: initialGrid(), cols: CHECKERS_COLS, rows: CHECKERS_ROWS, turn: "first", last: null };
  },

  validateMove(state, move, side): boolean {
    if (!isCheckersMove(move)) return false;
    if (state.turn !== side) return false;
    return checkersLegalMoves(state, side).some((mv) => samePath(mv.path, move.path));
  },

  applyMove(state, move, side): CheckersState {
    const g = state.grid.slice();
    const path = move.path;
    const start = path[0];
    const piece = at(g, start.x, start.y)!;
    g[coordToIndex(start.x, start.y, CHECKERS_COLS)] = null;
    // Xoá quân bị ăn (điểm giữa của mỗi bước nhảy dài 2).
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], b = path[i];
      if (Math.abs(b.x - a.x) === 2) {
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        g[coordToIndex(mx, my, CHECKERS_COLS)] = null;
      }
    }
    const end = path[path.length - 1];
    const king = piece.king || end.y === promoRow(side);
    g[coordToIndex(end.x, end.y, CHECKERS_COLS)] = { side, king };
    return { ...state, grid: g, turn: otherSide(side), last: { path } };
  },

  checkResult(state): GameResult | null {
    const toMove = state.turn;
    if (checkersLegalMoves(state, toMove).length === 0) {
      const hasPieces = state.grid.some((c) => c?.side === toMove);
      return {
        winner: otherSide(toMove),
        reason: hasPieces ? "đối thủ hết nước đi" : "đối thủ hết quân",
      };
    }
    return null;
  },

  describeMove(move, side): string {
    const who = side === "first" ? "Đỏ" : "Đen";
    const p = move.path;
    const cap = p.length > 2 || Math.abs(p[1].x - p[0].x) === 2 ? " (ăn)" : "";
    return `${who} ${p.map((s) => `${s.x + 1},${s.y + 1}`).join("→")}${cap}`;
  },
};
