import type { BotBrain, BotLevel } from "./types";
import type { GomokuState, GomokuMove } from "@/lib/games/gomoku";
import { LINE_DIRECTIONS, coordToIndex, countLine } from "@/func";
import type { Side } from "@/types/game";

const other = (s: Side): Side => (s === "first" ? "second" : "first");

/** Các ô trống còn đặt được. */
function emptyCells(s: GomokuState): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let y = 0; y < s.rows; y++)
    for (let x = 0; x < s.cols; x++)
      if (s.grid[coordToIndex(x, y, s.cols)] === null) out.push({ x, y });
  return out;
}

/** Điểm của ô (x,y) nếu `side` đặt quân vào: chuỗi dài hơn -> điểm cao hơn. */
function cellScore(s: GomokuState, x: number, y: number, side: Side): number {
  const grid = s.grid.slice();
  grid[coordToIndex(x, y, s.cols)] = side;
  let total = 0;
  for (const dir of LINE_DIRECTIONS) {
    const len = countLine(grid, s.cols, s.rows, { x, y }, dir, side);
    // Điểm theo độ dài chuỗi có thể tạo ra (5 = thắng ngay).
    total += len >= 5 ? 1_000_000 : [0, 1, 10, 100, 1_000][len] ?? 0;
  }
  return total;
}

/** Điểm tổng hợp: tấn công (đặt quân mình) + phòng thủ (chặn quân địch). */
function score(s: GomokuState, x: number, y: number, side: Side): number {
  const attack = cellScore(s, x, y, side);
  const defend = cellScore(s, x, y, other(side));
  // Phòng thủ hơi kém hơn tấn công để bot không chơi thủ quá.
  return attack + defend * 0.95;
}

/** Trọng số trung tâm: ô gần tâm bàn được ưu tiên nhẹ. */
function centerWeight(s: GomokuState, x: number, y: number): number {
  const cx = (s.cols - 1) / 2;
  const cy = (s.rows - 1) / 2;
  const d = Math.hypot(x - cx, y - cy);
  return Math.max(0, 1 - d / Math.max(s.cols, s.rows));
}

function bestBy(s: GomokuState, side: Side, scorer: (x: number, y: number) => number): GomokuMove | null {
  const cells = emptyCells(s);
  if (cells.length === 0) return null;
  let best = cells[0];
  let bestScore = -Infinity;
  for (const c of cells) {
    const sc = scorer(c.x, c.y);
    if (sc > bestScore) {
      bestScore = sc;
      best = c;
    }
  }
  return { x: best.x, y: best.y };
}

/** Nước đi chính của bot theo cấp độ. */
export function chooseGomokuMove(s: GomokuState, side: Side, level: BotLevel): GomokuMove | null {
  const cells = emptyCells(s);
  if (cells.length === 0) return null;
  // Cấp 0-1: ngẫu nhiên trong nước hợp lệ (Tập chơi / Dễ).
  if (level <= 1) {
    return cells[Math.floor(Math.random() * cells.length)];
  }
  if (level === 2) {
    // Chỉ ưu tiên tấn công.
    return bestBy(s, side, (x, y) => cellScore(s, x, y, side));
  }
  if (level === 3) {
    return bestBy(s, side, (x, y) => score(s, x, y, side));
  }
  // Cấp 4: tấn công + phòng thủ + ưu tiên trung tâm (ván đầu).
  const stones = s.grid.filter((c) => c !== null).length;
  const center = stones < 6 ? 0.35 : 0;
  return bestBy(s, side, (x, y) => score(s, x, y, side) + center * centerWeight(s, x, y) * 1_000);
}

/** Gợi ý cho người chơi: luôn trả nước "hay" theo đánh giá đầy đủ. */
export function suggestGomokuMove(s: GomokuState, side: Side, _level: BotLevel): GomokuMove | null {
  return bestBy(s, side, (x, y) => score(s, x, y, side));
}

export const gomokuBot: BotBrain<GomokuState, GomokuMove> = {
  chooseMove: chooseGomokuMove,
  suggestMove: suggestGomokuMove,
};
