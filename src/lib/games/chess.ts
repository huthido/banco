import { Chess } from "chess.js";
import type { GameEngine } from "./engine";
import type { GameMeta, GameResult, Side } from "@/types/game";

export type ChessState = {
  /** FEN — biểu diễn đầy đủ thế cờ (serialize được, lưu/đi qua socket dễ). */
  fen: string;
  /** Nước vừa đi để highlight ô đi/đến. */
  lastMove: { from: string; to: string } | null;
};

export type ChessMove = { from: string; to: string; promotion?: string };

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const meta: GameMeta = {
  type: "chess",
  name: "Cờ vua",
  boardCols: 8,
  boardRows: 8,
  sides: ["Trắng", "Đen"],
  description: "Cờ vua quốc tế. Chiếu hết Vua đối phương để thắng.",
};

/** Trắng = đi trước (first), Đen = đi sau (second). */
function colorOf(side: Side): "w" | "b" {
  return side === "first" ? "w" : "b";
}

function isChessMove(v: unknown): v is ChessMove {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as ChessMove).from === "string" &&
    typeof (v as ChessMove).to === "string"
  );
}

export const chessEngine: GameEngine<ChessState, ChessMove> = {
  meta,

  createInitialState(): ChessState {
    return { fen: START_FEN, lastMove: null };
  },

  validateMove(state, move, side): boolean {
    if (!isChessMove(move)) return false;
    try {
      const c = new Chess(state.fen);
      if (c.turn() !== colorOf(side)) return false; // phòng thủ: đúng phe mới đi
      const res = c.move({ from: move.from, to: move.to, promotion: move.promotion || "q" });
      return !!res;
    } catch {
      return false;
    }
  },

  applyMove(state, move): ChessState {
    const c = new Chess(state.fen);
    const res = c.move({ from: move.from, to: move.to, promotion: move.promotion || "q" });
    return { fen: c.fen(), lastMove: { from: res.from, to: res.to } };
  },

  checkResult(state): GameResult | null {
    const c = new Chess(state.fen);
    if (c.isCheckmate()) {
      // Bên đến lượt bị chiếu hết -> thua.
      const winner: Side = c.turn() === "w" ? "second" : "first";
      return { winner, reason: "chiếu hết" };
    }
    if (c.isStalemate()) return { winner: "draw", reason: "hết nước đi (thế bí)" };
    if (c.isInsufficientMaterial()) return { winner: "draw", reason: "không đủ quân chiếu hết" };
    if (c.isThreefoldRepetition()) return { winner: "draw", reason: "lặp nước 3 lần" };
    if (c.isDraw()) return { winner: "draw", reason: "luật 50 nước" };
    return null;
  },

  describeMove(move, side): string {
    const who = side === "first" ? "Trắng" : "Đen";
    return `${who} ${move.from}→${move.to}`;
  },
};
