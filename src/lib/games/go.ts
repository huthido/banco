import type { GameEngine } from "./engine";
import type { GameMeta, GameResult, Side } from "@/types/game";
import { coordToIndex, indexToCoord, inBounds, otherSide } from "@/func";

// Cờ vây 19×19. first = Đen (đi trước), second = Trắng (+komi 6.5).
// Luật: đặt quân -> bắt nhóm địch hết khí -> cấm tự sát -> cấm ko (lặp lại thế ngay
// trước). Hai lần bỏ lượt liên tiếp -> kết thúc, tính điểm theo vùng (area scoring).

export const GO_SIZE = 19;
const KOMI = 6.5;

export type GoCell = Side | null;
export type GoState = {
  grid: GoCell[];
  cols: number;
  rows: number;
  turn: Side;
  last: { x: number; y: number } | null;
  koPoint: { x: number; y: number } | null;
  passes: number;
  captures: { first: number; second: number };
};
export type GoMove = { x: number; y: number } | { pass: true };

const meta: GameMeta = {
  type: "go",
  name: "Cờ vây",
  boardCols: GO_SIZE,
  boardRows: GO_SIZE,
  sides: ["Đen", "Trắng"],
  description: "Vây đất và bắt quân trên bàn 19×19. Bỏ lượt 2 lần để tính điểm.",
};

function neighbors(x: number, y: number): [number, number][] {
  return ([[1, 0], [-1, 0], [0, 1], [0, -1]] as [number, number][])
    .map(([dx, dy]) => [x + dx, y + dy] as [number, number])
    .filter(([nx, ny]) => inBounds(nx, ny, GO_SIZE, GO_SIZE));
}

/** Nhóm liên thông cùng màu chứa (sx,sy) + số khí. */
function groupAt(g: GoCell[], sx: number, sy: number): { stones: number[]; libs: number } {
  const color = g[coordToIndex(sx, sy, GO_SIZE)];
  const seen = new Set<number>();
  const libs = new Set<number>();
  const stack = [[sx, sy]] as [number, number][];
  const stones: number[] = [];
  while (stack.length) {
    const [x, y] = stack.pop()!;
    const i = coordToIndex(x, y, GO_SIZE);
    if (seen.has(i)) continue;
    seen.add(i);
    stones.push(i);
    for (const [nx, ny] of neighbors(x, y)) {
      const ni = coordToIndex(nx, ny, GO_SIZE);
      const c = g[ni];
      if (c === null) libs.add(ni);
      else if (c === color && !seen.has(ni)) stack.push([nx, ny]);
    }
  }
  return { stones, libs: libs.size };
}

/** Đặt quân + bắt quân. Trả null nếu phạm luật (tự sát). */
function place(
  grid: GoCell[],
  x: number,
  y: number,
  side: Side
): { grid: GoCell[]; captured: number[] } | null {
  const i = coordToIndex(x, y, GO_SIZE);
  if (grid[i] !== null) return null;
  const g = grid.slice();
  g[i] = side;
  const opp = otherSide(side);
  const captured: number[] = [];
  for (const [nx, ny] of neighbors(x, y)) {
    if (g[coordToIndex(nx, ny, GO_SIZE)] === opp) {
      const grp = groupAt(g, nx, ny);
      if (grp.libs === 0) {
        for (const s of grp.stones) {
          g[s] = null;
          captured.push(s);
        }
      }
    }
  }
  if (groupAt(g, x, y).libs === 0) return null; // tự sát
  return { grid: g, captured };
}

function isGoMove(v: unknown): v is GoMove {
  if (typeof v !== "object" || v === null) return false;
  const m = v as { x?: unknown; y?: unknown; pass?: unknown };
  if (m.pass === true) return true;
  return typeof m.x === "number" && typeof m.y === "number";
}
const isPass = (m: GoMove): m is { pass: true } => "pass" in m && m.pass === true;

export const goEngine: GameEngine<GoState, GoMove> = {
  meta,

  createInitialState(): GoState {
    return {
      grid: new Array(GO_SIZE * GO_SIZE).fill(null),
      cols: GO_SIZE,
      rows: GO_SIZE,
      turn: "first",
      last: null,
      koPoint: null,
      passes: 0,
      captures: { first: 0, second: 0 },
    };
  },

  validateMove(state, move, side): boolean {
    if (!isGoMove(move)) return false;
    if (state.turn !== side) return false;
    if (isPass(move)) return true;
    if (!inBounds(move.x, move.y, GO_SIZE, GO_SIZE)) return false;
    if (state.koPoint && state.koPoint.x === move.x && state.koPoint.y === move.y) return false;
    return place(state.grid, move.x, move.y, side) !== null;
  },

  applyMove(state, move, side): GoState {
    if (isPass(move)) {
      return { ...state, turn: otherSide(side), last: null, koPoint: null, passes: state.passes + 1 };
    }
    const res = place(state.grid, move.x, move.y, side)!;
    // Ko: nếu vừa bắt đúng 1 quân và quân vừa đặt thành nhóm 1 quân/1 khí -> cấm đánh lại ô đó.
    let koPoint: GoState["koPoint"] = null;
    const own = groupAt(res.grid, move.x, move.y);
    if (res.captured.length === 1 && own.stones.length === 1 && own.libs === 1) {
      koPoint = indexToCoord(res.captured[0], GO_SIZE);
    }
    const captures = { ...state.captures };
    captures[side] += res.captured.length;
    return {
      ...state,
      grid: res.grid,
      turn: otherSide(side),
      last: { x: move.x, y: move.y },
      koPoint,
      passes: 0,
      captures,
    };
  },

  checkResult(state): GameResult | null {
    if (state.passes < 2) return null;
    const score = scoreGo(state.grid);
    const black = score.first;
    const white = score.second + KOMI;
    const reason = `Đen ${black} – Trắng ${white} (komi ${KOMI})`;
    return { winner: black > white ? "first" : "second", reason };
  },

  describeMove(move, side): string {
    const who = side === "first" ? "Đen" : "Trắng";
    if (isPass(move)) return `${who} bỏ lượt`;
    return `${who} (${move.x + 1},${move.y + 1})`;
  },
};

/** Tính điểm theo vùng: quân trên bàn + đất vây kín bởi một màu. */
function scoreGo(g: GoCell[]): { first: number; second: number } {
  let first = 0;
  let second = 0;
  for (const c of g) {
    if (c === "first") first++;
    else if (c === "second") second++;
  }
  const seen = new Set<number>();
  for (let i = 0; i < g.length; i++) {
    if (g[i] !== null || seen.has(i)) continue;
    // Flood fill vùng trống, ghi nhận màu các quân bao quanh.
    const region: number[] = [];
    const borders = new Set<Side>();
    const stack = [i];
    while (stack.length) {
      const j = stack.pop()!;
      if (seen.has(j)) continue;
      seen.add(j);
      region.push(j);
      const { x, y } = indexToCoord(j, GO_SIZE);
      for (const [nx, ny] of neighbors(x, y)) {
        const ni = coordToIndex(nx, ny, GO_SIZE);
        const c = g[ni];
        if (c === null) {
          if (!seen.has(ni)) stack.push(ni);
        } else borders.add(c);
      }
    }
    if (borders.size === 1) {
      const owner = [...borders][0];
      if (owner === "first") first += region.length;
      else second += region.length;
    }
  }
  return { first, second };
}

export { GO_SIZE as GO_COLS };
