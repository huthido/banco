"use client";

import { useEffect, useMemo, useState } from "react";
import {
  XIANGQI_COLS,
  XIANGQI_ROWS,
  xiangqiTargets,
  xiangqiGlyph,
  type XiangqiState,
} from "@/lib/games/xiangqi";
import { coordToIndex } from "@/func";
import type { Side } from "@/types/game";

export function XiangqiBoard({
  state,
  canPlay,
  mySide = "first",
  onMove,
  hint,
}: {
  state: XiangqiState;
  canPlay: boolean;
  mySide?: Side | null;
  onMove: (from: { x: number; y: number }, to: { x: number; y: number }) => void;
  /** Nước gợi ý (chơi với máy) — highlight ô đi và ô đến. */
  hint?: { fx: number; fy: number; tx: number; ty: number } | null;
}) {
  const [sel, setSel] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => setSel(null), [state]);

  const flip = mySide === "second";
  const ys = flip
    ? Array.from({ length: XIANGQI_ROWS }, (_, i) => XIANGQI_ROWS - 1 - i)
    : Array.from({ length: XIANGQI_ROWS }, (_, i) => i);
  const xs = flip
    ? Array.from({ length: XIANGQI_COLS }, (_, i) => XIANGQI_COLS - 1 - i)
    : Array.from({ length: XIANGQI_COLS }, (_, i) => i);

  const targets = useMemo(() => {
    if (!sel) return new Set<string>();
    return new Set(xiangqiTargets(state, sel.x, sel.y).map((m) => `${m.tx},${m.ty}`));
  }, [sel, state]);

  function onCell(x: number, y: number) {
    if (!canPlay) return;
    if (sel && targets.has(`${x},${y}`)) {
      onMove(sel, { x, y });
      setSel(null);
      return;
    }
    const c = state.grid[coordToIndex(x, y, XIANGQI_COLS)];
    setSel(c && c.side === mySide ? { x, y } : null);
  }

  const last = state.last;

  return (
    <div className="w-[min(100%,440px)] touch-manipulation select-none rounded-lg bg-board p-2 shadow-md sm:p-3 dark:bg-[#5a3f20]">
      <div
        className="relative grid w-full"
        style={{
          gridTemplateColumns: `repeat(${XIANGQI_COLS}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${XIANGQI_ROWS}, minmax(0, 1fr))`,
          aspectRatio: `${XIANGQI_COLS} / ${XIANGQI_ROWS}`,
          fontSize: "min(6.5vw, 28px)",
        }}
      >
        {/* Lớp nền: sông + đường chéo 2 cung — vẽ theo toạ độ gốc (không bị flip). */}
        <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
          {/* Sông: vùng giữa giao điểm hàng 4 và 5 (45%–55% chiều cao), chỉ đổi màu */}
          <div
            className="absolute left-0 right-0 bg-black/15 dark:bg-black/35"
            style={{ top: "45%", height: "10%" }}
          />
          {/* Quân đặt ở giao điểm (x+0.5, y+0.5) trong toạ độ ô -> SVG vẽ đúng giao điểm */}
          <svg viewBox="0 0 9 10" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
            {/* Cung trên (Đen, giao điểm y 0..2) */}
            <line x1={3.5} y1={0.5} x2={5.5} y2={2.5} className="stroke-boardline/60 dark:stroke-amber-100/25" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
            <line x1={5.5} y1={0.5} x2={3.5} y2={2.5} className="stroke-boardline/60 dark:stroke-amber-100/25" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
            {/* Cung dưới (Đỏ, giao điểm y 7..9) */}
            <line x1={3.5} y1={9.5} x2={5.5} y2={7.5} className="stroke-boardline/60 dark:stroke-amber-100/25" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
            <line x1={5.5} y1={9.5} x2={3.5} y2={7.5} className="stroke-boardline/60 dark:stroke-amber-100/25" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
          </svg>
        </div>
        {ys.map((y) =>
          xs.map((x) => {
            const c = state.grid[coordToIndex(x, y, XIANGQI_COLS)];
            const isSel = sel && sel.x === x && sel.y === y;
            const isTarget = targets.has(`${x},${y}`);
            const isLast = last && ((last.fx === x && last.fy === y) || (last.tx === x && last.ty === y));
            return (
              <button
                key={`${x}-${y}`}
                disabled={!canPlay}
                onClick={() => onCell(x, y)}
                aria-label={`${x},${y}`}
                className="relative flex items-center justify-center active:brightness-90 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-cyan-500"
              >
                {/* Lưới */}
                <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-boardline/60 dark:bg-amber-100/25" />
                <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-boardline/60 dark:bg-amber-100/25" />
                {isLast && <span className="absolute inset-[10%] rounded-full bg-yellow-300/40" />}
                {hint && ((hint.fx === x && hint.fy === y) || (hint.tx === x && hint.ty === y)) && (
                  <span className="absolute inset-[6%] z-20 rounded-full bg-cyan-400/40 ring-2 ring-cyan-500" />
                )}
                {c && (
                  <span
                    className={`relative z-10 flex h-[86%] w-[86%] items-center justify-center rounded-full border-2 bg-[#f3e2c0] font-semibold leading-none shadow dark:bg-[#e6d2a8] ${
                      c.side === "first"
                        ? "border-red-700 text-red-700"
                        : "border-slate-800 text-slate-900"
                    } ${isSel ? "ring-2 ring-emerald-500 ring-offset-1" : ""}`}
                  >
                    {xiangqiGlyph(c)}
                  </span>
                )}
                {isTarget && (
                  <span
                    className={`absolute z-20 rounded-full ${
                      c ? "inset-[6%] ring-2 ring-emerald-600/80" : "h-1/4 w-1/4 bg-emerald-600/40"
                    }`}
                  />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
