import type { GameEngine } from "./engine";
import type { GameMeta, GameResult, Side } from "@/types/game";
import { LINE_DIRECTIONS, coordToIndex, countLine, createGrid, inBounds } from "@/func";

export const GOMOKU_COLS = 15;
export const GOMOKU_ROWS = 15;
const WIN_LENGTH = 5;

/** Ô bàn caro: null = trống, hoặc phe đã đặt quân. */
export type GomokuCell = Side | null;

export type GomokuState = {
  /** Lưới phẳng cols*rows. */
  grid: GomokuCell[];
  cols: number;
  rows: number;
  /** Ô vừa đi gần nhất để highlight. */
  last: { x: number; y: number } | null;
};

export type GomokuMove = { x: number; y: number };

const meta: GameMeta = {
  type: "gomoku",
  name: "Cờ caro",
  boardCols: GOMOKU_COLS,
  boardRows: GOMOKU_ROWS,
  sides: ["Quân đen", "Quân trắng"],
  description: "Đặt 5 quân liên tiếp theo hàng ngang, dọc hoặc chéo để thắng.",
};

function isGomokuMove(v: unknown): v is GomokuMove {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as GomokuMove).x === "number" &&
    typeof (v as GomokuMove).y === "number"
  );
}

export const gomokuEngine: GameEngine<GomokuState, GomokuMove> = {
  meta,

  createInitialState(): GomokuState {
    return {
      grid: createGrid<GomokuCell>(GOMOKU_COLS, GOMOKU_ROWS, null),
      cols: GOMOKU_COLS,
      rows: GOMOKU_ROWS,
      last: null,
    };
  },

  validateMove(state, move, _side): boolean {
    if (!isGomokuMove(move)) return false;
    if (!inBounds(move.x, move.y, state.cols, state.rows)) return false;
    return state.grid[coordToIndex(move.x, move.y, state.cols)] === null;
  },

  applyMove(state, move, side): GomokuState {
    const grid = state.grid.slice();
    grid[coordToIndex(move.x, move.y, state.cols)] = side;
    return {
      ...state,
      grid,
      last: { x: move.x, y: move.y },
    };
  },

  checkResult(state): GameResult | null {
    if (!state.last) return null;
    const { x, y } = state.last;
    const value = state.grid[coordToIndex(x, y, state.cols)];
    if (value === null) return null;
    for (const dir of LINE_DIRECTIONS) {
      if (countLine(state.grid, state.cols, state.rows, { x, y }, dir, value) >= WIN_LENGTH) {
        return { winner: value, reason: "đủ 5 quân liên tiếp" };
      }
    }
    // Hòa khi kín bàn.
    if (state.grid.every((c) => c !== null)) {
      return { winner: "draw", reason: "kín bàn" };
    }
    return null;
  },

  describeMove(move, side): string {
    const col = String.fromCharCode(65 + move.x); // A, B, C...
    return `${side === "first" ? "Đen" : "Trắng"} ${col}${move.y + 1}`;
  },
};
