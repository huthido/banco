"use client";

import type { GomokuState } from "@/lib/games/gomoku";
import { coordToIndex } from "@/func";

export function GomokuBoard({
  state,
  canPlay,
  onPlace,
}: {
  state: GomokuState;
  canPlay: boolean;
  onPlace: (x: number, y: number) => void;
}) {
  const { grid, cols, rows, last } = state;

  return (
    // Container vuông co theo viewport: tối đa 480px, không tràn trên mobile.
    <div className="w-[min(96vw,480px)] rounded-lg bg-board p-2 shadow-md sm:p-3 dark:bg-[#5a3f20]">
      <div
        className="grid w-full"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
          aspectRatio: `${cols} / ${rows}`,
        }}
      >
        {Array.from({ length: rows }).map((_, y) =>
          Array.from({ length: cols }).map((__, x) => {
            const cell = grid[coordToIndex(x, y, cols)];
            const isLast = last && last.x === x && last.y === y;
            return (
              <button
                key={`${x}-${y}`}
                disabled={!canPlay || cell !== null}
                onClick={() => onPlace(x, y)}
                className="relative flex items-center justify-center"
                aria-label={`Ô ${x + 1},${y + 1}`}
              >
                {/* Đường kẻ bàn cờ */}
                <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-boardline/60 dark:bg-amber-100/25" />
                <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-boardline/60 dark:bg-amber-100/25" />
                {cell && (
                  <span
                    className={`relative z-10 h-[68%] w-[68%] rounded-full ${
                      cell === "first"
                        ? "bg-slate-900 shadow dark:bg-slate-950 dark:ring-1 dark:ring-slate-400/50"
                        : "border border-slate-300 bg-white shadow"
                    } ${isLast ? "ring-2 ring-red-500" : ""}`}
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
