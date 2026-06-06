"use client";

import type { Move } from "@/types/game";

export function MoveHistory({ moves }: { moves: Move[] }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">Lịch sử nước đi</h3>
      {moves.length === 0 ? (
        <p className="text-xs text-slate-400 dark:text-slate-500">Chưa có nước đi nào.</p>
      ) : (
        <ol className="max-h-40 space-y-1 overflow-y-auto text-xs text-slate-600 dark:text-slate-300">
          {moves.map((m, i) => (
            <li key={i} className="flex gap-2">
              <span className="w-6 text-right text-slate-400 dark:text-slate-500">{i + 1}.</span>
              <span>{m.label ?? JSON.stringify(m.data)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
