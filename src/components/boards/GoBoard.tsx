"use client";

import { GO_SIZE, type GoState, type GoMove } from "@/lib/games/go";
import { coordToIndex } from "@/func";

export function GoBoard({
  state,
  canPlay,
  onMove,
}: {
  state: GoState;
  canPlay: boolean;
  onMove: (move: GoMove) => void;
}) {
  const { grid, last, koPoint } = state;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-[min(100%,540px)] touch-manipulation select-none rounded-lg bg-board p-2 shadow-md sm:p-3 dark:bg-[#5a3f20]">
        <div
          className="grid w-full"
          style={{
            gridTemplateColumns: `repeat(${GO_SIZE}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${GO_SIZE}, minmax(0, 1fr))`,
            aspectRatio: "1 / 1",
          }}
        >
          {Array.from({ length: GO_SIZE }).map((_, y) =>
            Array.from({ length: GO_SIZE }).map((__, x) => {
              const cell = grid[coordToIndex(x, y, GO_SIZE)];
              const isLast = last && last.x === x && last.y === y;
              const isKo = koPoint && koPoint.x === x && koPoint.y === y;
              return (
                <button
                  key={`${x}-${y}`}
                  disabled={!canPlay || cell !== null}
                  onClick={() => onMove({ x, y })}
                  aria-label={`${x},${y}`}
                  className="relative flex items-center justify-center active:brightness-90 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-cyan-500"
                >
                  <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-boardline/60 dark:bg-amber-100/25" />
                  <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-boardline/60 dark:bg-amber-100/25" />
                  {cell && (
                    <span
                      className={`relative z-10 h-[82%] w-[82%] rounded-full ${
                        cell === "first"
                          ? "bg-slate-900 dark:bg-slate-950 dark:ring-1 dark:ring-slate-400/40"
                          : "border border-slate-300 bg-white"
                      } ${isLast ? "ring-2 ring-red-500" : ""}`}
                    />
                  )}
                  {isKo && !cell && (
                    <span className="absolute h-1/3 w-1/3 border border-slate-500/70" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-300">
        <span>Bắt: Đen {state.captures.first} · Trắng {state.captures.second}</span>
        {canPlay && (
          <button
            onClick={() => onMove({ pass: true })}
            aria-label="pass"
            className="rounded-lg border border-slate-300 px-3 py-1 font-medium hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700"
          >
            Bỏ lượt
          </button>
        )}
        {state.passes === 1 && <span className="text-amber-600 dark:text-amber-400">Đối thủ đã bỏ lượt</span>}
      </div>
    </div>
  );
}
