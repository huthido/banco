import type { BotBrain, BotLevel } from "./types";
import type { Side } from "@/types/game";
import type {
  XiangqiCell,
  XiangqiMove,
  XiangqiPieceType,
  XiangqiState,
} from "@/lib/games/xiangqi";
import { XIANGQI_COLS, XIANGQI_ROWS, xiangqiEngine, xiangqiInCheck, xiangqiTargets } from "@/lib/games/xiangqi";
import { otherSide } from "@/func";

/**
 * Bot chơi Cờ tướng (Xiangqi). THUẦN (pure): không side-effect, chỉ dùng
 * Math.random cho phần ngẫu nhiên. Mọi nước đi đều được liệt kê qua
 * `xiangqiTargets` (đã validate luật chuẩn — không ăn Tướng, không để mình bị chiếu).
 *
 * Giá trị quân (nhân 10 cho số nguyên). Tướng không bao giờ bị ăn (validate
 * chặn) nên chỉ mang tính cân bằng trong đánh giá.
 */
const PIECE_VALUE: Record<XiangqiPieceType, number> = {
  general: 10000,
  advisor: 20,
  elephant: 20,
  horse: 40,
  chariot: 90,
  cannon: 45,
  soldier: 10,
};

/** Thưởng nhỏ khi nước đi tạo chiếu (level 3+). */
const CHECK_BONUS = 30;
/** Điểm khi một bên hết nước hợp lệ (chiếu bí / hết nước đi) — coi như thua. */
const LOSE_SCORE = -1_000_000;
/** Tổng nước hợp lệ 2 bên vượt ngưỡng này thì cấp 4 tự hạ về cấp 3 (tránh treo). */
const MOVE_BUDGET = 400;

/** Giá trị quân tại (x,y): Tốt qua sông (first: y<=4, second: y>=5) đáng 20. */
export function valueOf(c: NonNullable<XiangqiCell>, y: number): number {
  if (c.type === "soldier") {
    const crossed = c.side === "first" ? y <= 4 : y >= 5;
    return crossed ? 20 : 10;
  }
  return PIECE_VALUE[c.type];
}

/** Tất cả nước hợp lệ của `side`: duyệt grid, gọi xiangqiTargets cho từng quân. */
export function allMoves(state: XiangqiState, side: Side): XiangqiMove[] {
  const { grid, cols, rows } = state;
  const out: XiangqiMove[] = [];
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const c = grid[y * cols + x];
      if (c && c.side === side) out.push(...xiangqiTargets(state, x, y));
    }
  return out;
}

/** Vật chất của `side` trên grid (theo bảng giá trị, không tính Tướng bị ăn — không xảy ra). */
function material(grid: XiangqiCell[], side: Side): number {
  let total = 0;
  for (let y = 0; y < XIANGQI_ROWS; y++)
    for (let x = 0; x < XIANGQI_COLS; x++) {
      const c = grid[y * XIANGQI_COLS + x];
      if (c && c.side === side) total += valueOf(c, y);
    }
  return total;
}

/** Điểm thế cờ từ góc nhìn `side`: vật chất mình − vật chất đối + thưởng nếu đang chiếu. */
export function evaluate(grid: XiangqiCell[], side: Side): number {
  let score = material(grid, side) - material(grid, otherSide(side));
  if (xiangqiInCheck(grid, otherSide(side))) score += CHECK_BONUS;
  return score;
}

/** Cấp 2: nước ăn quân đối phương có GIÁ TRỊ cao nhất; không có thì null (gọi nơi khác random). */
export function bestCapture(state: XiangqiState, side: Side): XiangqiMove | null {
  const enemy = otherSide(side);
  let best: XiangqiMove[] = [];
  let bestVal = -Infinity;
  for (const m of allMoves(state, side)) {
    const dest = state.grid[m.ty * state.cols + m.tx];
    if (dest && dest.side === enemy) {
      const v = valueOf(dest, m.ty);
      if (v > bestVal) {
        bestVal = v;
        best = [m];
      } else if (v === bestVal) {
        best.push(m);
      }
    }
  }
  if (best.length === 0) return null;
  return best[Math.floor(Math.random() * best.length)];
}

/** Cấp 3: nước tốt nhất theo đánh giá 1-ply (mô phỏng bằng applyMove); hòa thì random. */
export function bestOnePly(state: XiangqiState, side: Side): XiangqiMove | null {
  const moves = allMoves(state, side);
  if (moves.length === 0) return null;
  let best: XiangqiMove[] = [];
  let bestScore = -Infinity;
  for (const m of moves) {
    const score = evaluate(xiangqiEngine.applyMove(state, m, side).grid, side);
    if (score > bestScore) {
      bestScore = score;
      best = [m];
    } else if (score === bestScore) {
      best.push(m);
    }
  }
  return best[Math.floor(Math.random() * best.length)];
}

/** Sắp xếp nước đi: nước ăn quân (giá trị quân bị ăn cao hơn) lên trước — move ordering. */
function orderedMoves(state: XiangqiState, side: Side): XiangqiMove[] {
  const enemy = otherSide(side);
  const scored = allMoves(state, side).map((m) => {
    const dest = state.grid[m.ty * state.cols + m.tx];
    return { m, v: dest && dest.side === enemy ? valueOf(dest, m.ty) : 0 };
  });
  scored.sort((a, b) => b.v - a.v);
  return scored.map((s) => s.m);
}

/** Minimax negamax + alpha-beta. Điểm từ góc nhìn `side` (bên được đi). */
function negamax(state: XiangqiState, side: Side, depth: number, alpha: number, beta: number): number {
  if (depth === 0) return evaluate(state.grid, side);
  const moves = orderedMoves(state, side);
  if (moves.length === 0) return LOSE_SCORE; // hết nước hợp lệ = thua (kể cả không bị chiếu)
  let best = -Infinity;
  for (const m of moves) {
    const val = -negamax(xiangqiEngine.applyMove(state, m, side), otherSide(side), depth - 1, -beta, -alpha);
    if (val > best) best = val;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

/** Cấp 4: minimax depth 2 + alpha-beta; tổng nước 2 bên > ngưỡng thì hạ về 1-ply. */
export function bestMinimax(state: XiangqiState, side: Side): XiangqiMove | null {
  const moves = orderedMoves(state, side);
  if (moves.length === 0) return null;
  const total = moves.length + allMoves(state, otherSide(side)).length;
  if (total > MOVE_BUDGET) return bestOnePly(state, side);
  let best: XiangqiMove[] = [];
  let bestScore = -Infinity;
  for (const m of moves) {
    const score = -negamax(xiangqiEngine.applyMove(state, m, side), otherSide(side), 1, -Infinity, Infinity);
    if (score > bestScore) {
      bestScore = score;
      best = [m];
    } else if (score === bestScore) {
      best.push(m);
    }
  }
  return best[Math.floor(Math.random() * best.length)];
}

/** Nước đi chính của bot theo cấp độ. */
export function chooseXiangqiMove(state: XiangqiState, side: Side, level: BotLevel): XiangqiMove | null {
  // Cấp 0 (Tập chơi) & 1 (Dễ): ngẫu nhiên trong nước hợp lệ.
  if (level <= 1) {
    const moves = allMoves(state, side);
    if (moves.length === 0) return null;
    return moves[Math.floor(Math.random() * moves.length)];
  }
  // Cấp 2 (Trung bình): ưu tiên ăn quân giá trị nhất; không ăn được thì random.
  if (level === 2) {
    const cap = bestCapture(state, side);
    if (cap) return cap;
    const moves = allMoves(state, side);
    if (moves.length === 0) return null;
    return moves[Math.floor(Math.random() * moves.length)];
  }
  // Cấp 3 (Khá): đánh giá 1-ply.
  if (level === 3) return bestOnePly(state, side);
  // Cấp 4 (Cao): minimax depth 2 + alpha-beta (tự hạ cấp khi nhánh quá rộng).
  return bestMinimax(state, side);
}

/** Gợi ý cho NGƯỜI chơi: luôn trả nước tốt theo đánh giá 1-ply (như cấp 3), bất kể level. */
export function suggestXiangqiMove(state: XiangqiState, side: Side, _level: BotLevel): XiangqiMove | null {
  return bestOnePly(state, side);
}

export const xiangqiBot: BotBrain<XiangqiState, XiangqiMove> = {
  chooseMove: chooseXiangqiMove,
  suggestMove: suggestXiangqiMove,
};
