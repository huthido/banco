"use client";

import { useEffect, useMemo, useState } from "react";
import { Chess, type Square } from "chess.js";
import type { ChessState } from "@/lib/games/chess";
import type { Side } from "@/types/game";

// Hai bộ ký tự RIÊNG cho mỗi bên (trắng = nét rỗng, đen = nét đặc) để luôn phân
// biệt được kể cả khi font tô màu cố định. Thêm U+FE0E (VS15) ép hiển thị dạng
// text (không thành emoji) nên màu CSS bên dưới có tác dụng.
const TEXT_VS = String.fromCharCode(0xfe0e); // U+FE0E
const GLYPH: Record<"w" | "b", Record<string, string>> = {
  w: { p: "♙", n: "♘", b: "♗", r: "♖", q: "♕", k: "♔" },
  b: { p: "♟", n: "♞", b: "♝", r: "♜", q: "♛", k: "♚" },
};

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = ["1", "2", "3", "4", "5", "6", "7", "8"];

export function ChessBoard({
  state,
  canPlay,
  orientation = "first",
  onMove,
  hint,
}: {
  state: ChessState;
  canPlay: boolean;
  orientation?: Side | null;
  onMove: (from: string, to: string) => void;
  /** Nước gợi ý (chơi với máy) — highlight ô đi và ô đến. */
  hint?: { from: string; to: string } | null;
}) {
  const chess = useMemo(() => new Chess(state.fen), [state.fen]);
  const [selected, setSelected] = useState<string | null>(null);

  // Thế cờ đổi (sau khi đi) -> bỏ chọn.
  useEffect(() => setSelected(null), [state.fen]);

  // Thứ tự ô theo hướng nhìn: phe Đen (second) thì lật bàn.
  const flip = orientation === "second";
  const rankOrder = flip ? [...RANKS] : [...RANKS].reverse(); // trên -> dưới
  const fileOrder = flip ? [...FILES].reverse() : [...FILES]; // trái -> phải

  const targets = useMemo(() => {
    if (!selected) return new Set<string>();
    return new Set(
      chess.moves({ square: selected as Square, verbose: true }).map((m) => m.to as string)
    );
  }, [selected, chess]);

  // Ô Vua đang bị chiếu (để tô đỏ).
  const checkSquare = useMemo(() => {
    if (!chess.isCheck()) return null;
    const turn = chess.turn();
    for (const f of FILES)
      for (const r of RANKS) {
        const p = chess.get((f + r) as Square);
        if (p && p.type === "k" && p.color === turn) return f + r;
      }
    return null;
  }, [chess]);

  function onCell(square: string) {
    if (!canPlay) return;
    if (selected && targets.has(square)) {
      onMove(selected, square);
      setSelected(null);
      return;
    }
    const p = chess.get(square as Square);
    setSelected(p && p.color === chess.turn() ? square : null);
  }

  const last = state.lastMove;

  return (
    <div className="w-[min(100%,480px)] rounded-lg bg-[#7a5230] p-2 shadow-md">
      <div
        className="grid overflow-hidden rounded"
        style={{
          gridTemplateColumns: "repeat(8, minmax(0, 1fr))",
          gridTemplateRows: "repeat(8, minmax(0, 1fr))",
          aspectRatio: "1 / 1",
          fontSize: "min(9vw, 44px)",
        }}
      >
        {rankOrder.map((rank) =>
          fileOrder.map((file) => {
            const square = file + rank;
            const piece = chess.get(square as Square);
            const light = (file.charCodeAt(0) + Number(rank)) % 2 === 1;
            const isTarget = targets.has(square);
            const isLast = last && (last.from === square || last.to === square);
            return (
              <button
                key={square}
                disabled={!canPlay}
                onClick={() => onCell(square)}
                aria-label={square}
                className="relative flex items-center justify-center"
                style={{ backgroundColor: light ? "#e9c89b" : "#a9744a" }}
              >
                {isLast && <span className="absolute inset-0 bg-yellow-300/45" />}
                {hint && (hint.from === square || hint.to === square) && (
                  <span className="absolute inset-0 bg-cyan-400/40 ring-2 ring-cyan-500" />
                )}
                {checkSquare === square && <span className="absolute inset-0 bg-red-500/50" />}
                {selected === square && <span className="absolute inset-0 bg-emerald-400/50" />}
                {piece && (
                  <span
                    className="relative z-10 leading-none"
                    style={{
                      filter: "drop-shadow(0 1px 1.5px rgba(15,23,42,0.4))",
                      ...(piece.color === "w"
                        ? { color: "#f8fafc", WebkitTextStroke: "0.8px #64748b" }
                        : { color: "#1e293b" }),
                    }}
                  >
                    {GLYPH[piece.color][piece.type] + TEXT_VS}
                  </span>
                )}
                {/* Gợi ý nước đi hợp lệ */}
                {isTarget && !piece && (
                  <span className="absolute h-1/4 w-1/4 rounded-full bg-black/30" />
                )}
                {isTarget && piece && (
                  <span className="absolute inset-[6%] z-20 rounded-full ring-2 ring-emerald-600/80" />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
