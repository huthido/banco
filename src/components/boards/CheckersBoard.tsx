"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CHECKERS_COLS,
  CHECKERS_ROWS,
  checkersLegalMoves,
  type CheckersState,
  type CheckersMove,
} from "@/lib/games/checkers";
import { coordToIndex } from "@/func";
import type { Side } from "@/types/game";

type Sq = { x: number; y: number };
const eq = (a: Sq, b: Sq) => a.x === b.x && a.y === b.y;
const samePath = (a: Sq[], b: Sq[]) => a.length === b.length && a.every((s, i) => eq(s, b[i]));

export function CheckersBoard({
  state,
  canPlay,
  mySide = "first",
  onMove,
}: {
  state: CheckersState;
  canPlay: boolean;
  mySide?: Side | null;
  onMove: (move: CheckersMove) => void;
}) {
  const [path, setPath] = useState<Sq[]>([]);
  useEffect(() => setPath([]), [state]);

  const legal = useMemo(
    () => (canPlay && mySide ? checkersLegalMoves(state, mySide) : []),
    [state, canPlay, mySide]
  );

  const nextSquares = useMemo(() => {
    if (path.length === 0) return new Set<string>();
    const s = new Set<string>();
    for (const mv of legal) {
      if (mv.path.length > path.length && path.every((p, i) => eq(p, mv.path[i]))) {
        const n = mv.path[path.length];
        s.add(`${n.x},${n.y}`);
      }
    }
    return s;
  }, [legal, path]);

  function onCell(x: number, y: number) {
    if (!canPlay) return;
    const here = { x, y };
    if (path.length >= 1 && nextSquares.has(`${x},${y}`)) {
      const np = [...path, here];
      if (legal.some((mv) => samePath(mv.path, np))) {
        onMove({ path: np });
        setPath([]);
      } else setPath(np);
      return;
    }
    if (path.length > 1) return; // đang ăn liên hoàn: chỉ được đi tiếp
    setPath(legal.some((mv) => eq(mv.path[0], here)) ? [here] : []);
  }

  const flip = mySide === "second";
  const ys = Array.from({ length: CHECKERS_ROWS }, (_, i) => (flip ? i : CHECKERS_ROWS - 1 - i));
  const xs = Array.from({ length: CHECKERS_COLS }, (_, i) => (flip ? CHECKERS_COLS - 1 - i : i));
  const lastPath = state.last?.path ?? [];

  return (
    <div className="w-[min(96vw,480px)] rounded-lg bg-[#7a5230] p-2 shadow-md">
      <div
        className="grid overflow-hidden rounded"
        style={{
          gridTemplateColumns: `repeat(${CHECKERS_COLS}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${CHECKERS_ROWS}, minmax(0, 1fr))`,
          aspectRatio: "1 / 1",
        }}
      >
        {ys.map((y) =>
          xs.map((x) => {
            const dark = (x + y) % 2 === 1;
            const piece = state.grid[coordToIndex(x, y, CHECKERS_COLS)];
            const inPath = path.some((p) => eq(p, { x, y }));
            const isNext = nextSquares.has(`${x},${y}`);
            const isLast = lastPath.some((p) => eq(p, { x, y }));
            return (
              <button
                key={`${x}-${y}`}
                disabled={!canPlay}
                onClick={() => onCell(x, y)}
                aria-label={`${x},${y}`}
                className="relative flex items-center justify-center"
                style={{ backgroundColor: dark ? "#a9744a" : "#e9c89b" }}
              >
                {isLast && <span className="absolute inset-0 bg-yellow-300/35" />}
                {inPath && <span className="absolute inset-0 bg-emerald-400/40" />}
                {piece && (
                  <span
                    className={`relative z-10 flex h-[78%] w-[78%] items-center justify-center rounded-full border-2 text-base font-bold leading-none shadow ${
                      piece.side === "first"
                        ? "border-red-300 bg-red-600 text-yellow-200"
                        : "border-slate-500 bg-slate-900 text-yellow-300"
                    }`}
                  >
                    {piece.king ? "♚" : ""}
                  </span>
                )}
                {isNext && (
                  <span className="absolute z-20 h-1/3 w-1/3 rounded-full bg-emerald-600/60" />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
