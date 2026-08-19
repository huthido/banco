"use client";

import { REACTIONS } from "@/func";

/** Thanh nút thả cảm xúc — hiển thị cho cả người chơi và người xem. */
export function ReactionBar({ onReact }: { onReact: (emoji: string) => void }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {REACTIONS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onReact(emoji)}
          aria-label={`Thả ${emoji}`}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-xl transition hover:scale-110 hover:bg-slate-50 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
