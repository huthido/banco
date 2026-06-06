"use client";

import type { BoardMessages } from "@/lib/client/useRoom";

function Bubble({
  name,
  text,
  pos,
  accent,
}: {
  name: string;
  text: string;
  pos: string;
  accent: string;
}) {
  return (
    <div className={`absolute ${pos} max-w-[70%]`}>
      <div className="board-bubble rounded-2xl border border-slate-200 bg-white/95 px-3 py-1.5 shadow-lg backdrop-blur-sm dark:border-slate-600 dark:bg-slate-800/95">
        <div className={`text-[10px] font-semibold ${accent}`}>{name}</div>
        <div className="break-words text-sm text-slate-900 dark:text-slate-100">{text}</div>
      </div>
    </div>
  );
}

/** Bong bóng tin nhắn của 2 người chơi đặt theo phe: đi-trước dưới, đi-sau trên. */
export function BoardMessageOverlay({ messages }: { messages: BoardMessages }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {messages.second && (
        <Bubble
          name={messages.second.name}
          text={messages.second.text}
          pos="left-2 top-2"
          accent="text-rose-500 dark:text-rose-400"
        />
      )}
      {messages.first && (
        <Bubble
          name={messages.first.name}
          text={messages.first.text}
          pos="bottom-2 right-2 text-right"
          accent="text-emerald-600 dark:text-emerald-400"
        />
      )}
    </div>
  );
}
