import type { BotBrain, BotLevel } from "./types";
import type { Side } from "@/types/game";
import { coordToIndex } from "@/func";
import {
  CHECKERS_COLS,
  checkersEngine,
  checkersLegalMoves,
  type CheckersMove,
  type CheckersState,
} from "@/lib/games/checkers";

// Bot CỜ ĐAM (luật Anh/Mỹ): thuần (pure), không side-effect — chỉ Math.random
// cho phần ngẫu nhiên. Nguồn nước hợp lệ duy nhất là checkersLegalMoves (đã xử lý
// đúng luật: bắt buộc ăn, ăn liên hoàn nối hết).

// ---- Đánh giá thế cờ ----
const MAN_VALUE = 1;
const KING_VALUE = 2;
const KING_BONUS = 0.1; // thưởng nhẹ Hậu (cấp 4)
const ROW_BONUS = 0.1; // thưởng quân ở 2 hàng cuối phía đối phương (cấp 4)
const WIN_SCORE = 1_000_000; // thắng/thua trong minimax

/** Số quân bị ăn trong một nước = số bước nhảy dài 2 trên path. */
export function capturesInMove(move: CheckersMove): number {
  let n = 0;
  for (let i = 1; i < move.path.length; i++) {
    if (Math.abs(move.path[i].x - move.path[i - 1].x) === 2) n++;
  }
  return n;
}

/** Quân của `side` ở hàng y có nằm trong 2 hàng cuối phía đối phương không. */
function isFarRow(side: Side, y: number): boolean {
  return side === "first" ? y <= 1 : y >= CHECKERS_COLS - 2;
}

/**
 * Đánh giá thế cờ từ góc nhìn `side`: quân thường = 1, Hậu = 2.
 * `bonus=true` (cấp 4) cộng thêm thưởng nhẹ Hậu (+0.1) và quân ở 2 hàng cuối
 * phía đối phương (+0.1 mỗi quân).
 */
export function evaluateCheckers(state: CheckersState, side: Side, bonus: boolean): number {
  let score = 0;
  for (let y = 0; y < state.rows; y++) {
    for (let x = 0; x < state.cols; x++) {
      const p = state.grid[coordToIndex(x, y, state.cols)];
      if (!p) continue;
      let v = p.king ? KING_VALUE : MAN_VALUE;
      if (bonus) {
        if (p.king) v += KING_BONUS;
        if (isFarRow(p.side, y)) v += ROW_BONUS;
      }
      score += p.side === side ? v : -v;
    }
  }
  return score;
}

/**
 * Minimax + alpha-beta từ góc nhìn `rootSide` (điểm > 0 = rootSide đang lợi).
 * `ordered=true`: sắp xếp nước ăn nhiều trước (move ordering) — tăng hiệu quả
 * cắt tỉa; đồng thời bật đánh giá chi tiết (thưởng Hậu + hàng xa).
 * `ordered=false`: minimax thường (cửa sổ đầy đủ → không bị cắt tỉa), đánh giá cơ bản.
 */
function search(
  state: CheckersState,
  depth: number,
  alpha: number,
  beta: number,
  rootSide: Side,
  ordered: boolean
): number {
  const toMove = state.turn;
  let moves = checkersLegalMoves(state, toMove);
  if (moves.length === 0) {
    // Bên tới lượt hết nước hợp lệ → thua ngay.
    return rootSide === toMove ? -WIN_SCORE : WIN_SCORE;
  }
  if (depth === 0) return evaluateCheckers(state, rootSide, ordered);
  if (ordered) {
    moves = moves
      .map((m) => ({ m, c: capturesInMove(m) }))
      .sort((a, b) => b.c - a.c)
      .map((o) => o.m);
  }
  if (toMove === rootSide) {
    let best = -Infinity;
    for (const mv of moves) {
      const v = search(checkersEngine.applyMove(state, mv, toMove), depth - 1, alpha, beta, rootSide, ordered);
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) break; // cắt tỉa alpha-beta
    }
    return best;
  }
  let best = Infinity;
  for (const mv of moves) {
    const v = search(checkersEngine.applyMove(state, mv, toMove), depth - 1, alpha, beta, rootSide, ordered);
    if (v < best) best = v;
    if (v < beta) beta = v;
    if (alpha >= beta) break; // cắt tỉa alpha-beta
  }
  return best;
}

/** Nước tốt nhất theo minimax: nước mở đầu + tìm kiếm depth-1 ply còn lại. */
function bestMoveBySearch(
  state: CheckersState,
  side: Side,
  depth: number,
  ordered: boolean
): CheckersMove | null {
  const moves = checkersLegalMoves(state, side);
  if (moves.length === 0) return null;
  const orderedMoves = ordered
    ? [...moves].sort((a, b) => capturesInMove(b) - capturesInMove(a))
    : moves;
  let best: CheckersMove | null = null;
  let bestScore = -Infinity;
  for (const mv of orderedMoves) {
    const next = checkersEngine.applyMove(state, mv, side);
    const v = search(next, depth - 1, -Infinity, Infinity, side, ordered);
    if (v > bestScore) {
      bestScore = v;
      best = mv;
    }
  }
  return best;
}

/** Cấp 2: chọn nước ăn nhiều nhất (path dài nhất); cùng độ dài → ngẫu nhiên. */
function chooseLongestCapture(moves: CheckersMove[]): CheckersMove {
  let maxLen = 0;
  for (const m of moves) if (m.path.length > maxLen) maxLen = m.path.length;
  const best = moves.filter((m) => m.path.length === maxLen);
  return best[Math.floor(Math.random() * best.length)];
}

/** Nước đi chính của bot theo cấp độ. */
export function chooseCheckersMove(
  state: CheckersState,
  side: Side,
  level: BotLevel
): CheckersMove | null {
  const moves = checkersLegalMoves(state, side);
  if (moves.length === 0) return null;
  // Cấp 0-1: ngẫu nhiên trong nước hợp lệ (Tập chơi / Dễ).
  if (level <= 1) return moves[Math.floor(Math.random() * moves.length)];
  if (level === 2) return chooseLongestCapture(moves);
  if (level === 3) return bestMoveBySearch(state, side, 3, false); // minimax depth 3
  return bestMoveBySearch(state, side, 4, true); // Cấp 4: depth 4 + alpha-beta + ordering
}

/** Gợi ý cho NGƯỜI chơi: luôn nước tốt theo minimax depth 3, bất kể level. */
export function suggestCheckersMove(
  state: CheckersState,
  side: Side,
  _level: BotLevel
): CheckersMove | null {
  return bestMoveBySearch(state, side, 3, false);
}

export const checkersBot: BotBrain<CheckersState, CheckersMove> = {
  chooseMove: chooseCheckersMove,
  suggestMove: suggestCheckersMove,
};
