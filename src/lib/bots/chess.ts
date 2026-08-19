import { Chess } from "chess.js";
import type { Move as JsMove } from "chess.js";
import type { BotBrain, BotLevel } from "@/lib/bots/types";
import type { ChessMove, ChessState } from "@/lib/games/chess";
import type { Side } from "@/types/game";

/**
 * Bot AI cờ vua — THUẦN (pure), không side-effect, chỉ dùng Math.random cho phần
 * ngẫu nhiên. Dùng chess.js làm engine tìm kiếm: tạo `new Chess(fen)` một lần rồi
 * `move()` + `undo()` trực tiếp (KHÔNG clone FEN mỗi node để giữ hiệu năng).
 *
 * Ghi chú hiệu năng: trong chess.js 1.x, `moves({ verbose: true })` và `move(object)`
 * dựng đối tượng Move đầy đủ (SAN + serialize FEN + make/undo) cho TỪNG nước —
 * tốn O(N²) mỗi node, làm depth 3 vượt budget 1 giây ở thế cờ nhiều nước ăn.
 * Vì vậy tìm kiếm nội bộ dùng SAN (`moves()` non-verbose + `move(san)`, public API,
 * 1 lần sinh nước/node); root vẫn dùng `move({ from, to, promotion })` để trả về
 * nước đúng contract của app.
 */

// --- Đánh giá vật chất ---
const PIECE_VALUE: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 0, // Vua không tính vật chất (chiếu hết xử lý riêng trong tìm kiếm)
};

/** 4 ô trung tâm bàn cờ — thưởng nhẹ vị trí cho Mã/Tốt (cấp 4). */
const CENTER_SQUARES = ["d4", "e4", "d5", "e5"] as const;
const CENTER_BONUS = 10;

/** Điểm chiếu hết — luôn lớn hơn mọi chênh lệch vật chất. */
const MATE_SCORE = 1_000_000;

function colorOf(side: Side): "w" | "b" {
  return side === "first" ? "w" : "b";
}

/** Map nước chess.js (verbose) sang ChessMove của app; chỉ giữ promotion khi có. */
function toChessMove(m: JsMove): ChessMove {
  return m.promotion
    ? { from: m.from, to: m.to, promotion: m.promotion }
    : { from: m.from, to: m.to };
}

/**
 * Đánh giá thế cờ từ góc nhìn `rootColor` (bên được gọi):
 * điểm = tổng quân của rootColor − tổng quân đối phương.
 * `centerBonus` (cấp 4): cộng vài điểm nếu Mã/Tốt đứng ở 4 ô trung tâm.
 */
export function evaluateChess(c: Chess, rootColor: "w" | "b", centerBonus = false): number {
  let score = 0;
  const board = c.board();
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const sq = board[r][f];
      if (!sq) continue;
      const v = PIECE_VALUE[sq.type] ?? 0;
      score += sq.color === rootColor ? v : -v;
    }
  }
  if (centerBonus) {
    for (const sq of CENTER_SQUARES) {
      const p = c.get(sq);
      if (p && (p.type === "n" || p.type === "p")) {
        score += p.color === rootColor ? CENTER_BONUS : -CENTER_BONUS;
      }
    }
  }
  return score;
}

type SearchOpts = {
  /** Thưởng vị trí trung tâm cho Mã/Tốt (cấp 4). */
  centerBonus: boolean;
  /** Sắp xếp nước ăn quân trước (cấp 4). */
  order: boolean;
};

/** Move ordering (SAN): nước ăn quân (chứa 'x') xét trước. */
function orderSans(sans: string[]): string[] {
  return sans.slice().sort((a, b) => (b.includes("x") ? 1 : 0) - (a.includes("x") ? 1 : 0));
}

/** Move ordering (verbose, dùng ở root): quân bị ăn càng giá trị thì xét càng sớm (MVV). */
function orderMoves(moves: JsMove[]): JsMove[] {
  return moves.slice().sort((a, b) => {
    const va = a.captured ? PIECE_VALUE[a.captured] ?? 0 : 0;
    const vb = b.captured ? PIECE_VALUE[b.captured] ?? 0 : 0;
    return vb - va;
  });
}

/**
 * Minimax + alpha-beta. `maximizing = true` khi lượt bên được gọi (rootColor) đang đi.
 * Điểm luôn tính từ góc nhìn rootColor; chiếu hết/thế bí cho điểm cực trị.
 * Nội bộ dùng SAN (`c.move(san)` — có thể throw nên wrap try/catch) + `c.undo()`
 * để khôi phục đầy đủ (kể cả promotion / en passant / nhập thành).
 */
function search(
  c: Chess,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  rootColor: "w" | "b",
  opts: SearchOpts
): number {
  if (depth === 0) {
    // Ở lá vẫn phát hiện chiếu hết/thế bí để thấy mate ngay sát tầm nhìn.
    if (c.moves().length === 0) {
      if (c.isCheckmate()) return maximizing ? -MATE_SCORE : MATE_SCORE;
      return 0; // thế bí
    }
    return evaluateChess(c, rootColor, opts.centerBonus);
  }

  const sans = c.moves();
  if (sans.length === 0) {
    if (c.isCheckmate()) return maximizing ? -MATE_SCORE : MATE_SCORE;
    return 0; // thế bí
  }

  const ordered = opts.order ? orderSans(sans) : sans;
  if (maximizing) {
    let best = -Infinity;
    for (const san of ordered) {
      try {
        c.move(san);
      } catch {
        continue; // nước không hợp lệ (phòng thủ) — bỏ qua
      }
      const score = search(c, depth - 1, alpha, beta, false, rootColor, opts);
      c.undo();
      if (score > best) best = score;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  }

  let best = Infinity;
  for (const san of ordered) {
    try {
      c.move(san);
    } catch {
      continue;
    }
    const score = search(c, depth - 1, alpha, beta, true, rootColor, opts);
    c.undo();
    if (score < best) best = score;
    if (best < beta) beta = best;
    if (alpha >= beta) break;
  }
  return best;
}

/** Chọn nước tốt nhất theo minimax depth `depth` (+ alpha-beta, tuỳ chọn ordering). */
function bestMoveBySearch(
  c: Chess,
  depth: number,
  rootColor: "w" | "b",
  opts: SearchOpts
): ChessMove | null {
  const moves = c.moves({ verbose: true });
  if (moves.length === 0) return null;
  const ordered = opts.order ? orderMoves(moves) : moves;
  let bestScore = -Infinity;
  let best: JsMove | null = null;
  for (const m of ordered) {
    try {
      c.move({ from: m.from, to: m.to, promotion: m.promotion });
    } catch {
      continue;
    }
    const score = search(c, depth - 1, -Infinity, Infinity, false, rootColor, opts);
    c.undo();
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return best ? toChessMove(best) : null;
}

/** Nước đi của bot theo cấp độ. Trả null nếu không còn nước hợp lệ (chiếu hết/thế bí). */
export function chooseChessMove(state: ChessState, side: Side, level: BotLevel): ChessMove | null {
  const c = new Chess(state.fen);
  const rootColor = colorOf(side);
  const moves = c.moves({ verbose: true });
  if (moves.length === 0) return null;

  // Cấp 0 (Tập chơi) & 1 (Dễ): ngẫu nhiên trong nước hợp lệ.
  if (level <= 1) {
    return toChessMove(moves[Math.floor(Math.random() * moves.length)]);
  }
  // Cấp 2 (Trung bình): nếu có nước ăn quân thì ăn (chọn ngẫu nhiên), ngược lại random.
  if (level === 2) {
    const captures = moves.filter((m) => m.captured);
    const pool = captures.length > 0 ? captures : moves;
    return toChessMove(pool[Math.floor(Math.random() * pool.length)]);
  }
  // Cấp 3 (Khá): minimax depth 2 + alpha-beta + đánh giá vật chất.
  if (level === 3) {
    return bestMoveBySearch(c, 2, rootColor, { centerBonus: false, order: false });
  }
  // Cấp 4 (Cao): minimax depth 3 + alpha-beta + move ordering + thưởng trung tâm.
  return bestMoveBySearch(c, 3, rootColor, { centerBonus: true, order: true });
}

/** Gợi ý cho NGƯỜI chơi: luôn minimax depth 2 (dùng cùng tìm kiếm cấp 3), bất kể level. */
export function suggestChessMove(state: ChessState, side: Side, _level: BotLevel): ChessMove | null {
  const c = new Chess(state.fen);
  return bestMoveBySearch(c, 2, colorOf(side), { centerBonus: false, order: false });
}

export const chessBot: BotBrain<ChessState, ChessMove> = {
  chooseMove: chooseChessMove,
  suggestMove: suggestChessMove,
};
