"use client";

import { useState } from "react";

const QUICK = ["Hay!", "Nước cờ đẹp 👏", "Chiếu!", "Để xem...", "Thua rồi 😅", "Gg 🤝"];

/** Ô nhập tin nhắn nhanh cho người chơi — hiện lên bàn cờ. */
export function BoardSay({ onSend }: { onSend: (text: string) => void }) {
  const [text, setText] = useState("");

  function submit(value: string) {
    const t = value.trim();
    if (t) onSend(t);
    setText("");
  }

  return (
    <div className="mt-3 w-[min(96vw,480px)]">
      {/* Hàng nút nhanh: luôn 1 dòng, scroll ngang khi tràn (compact trên mobile) */}
      <div className="no-scrollbar mb-2 overflow-x-auto">
        <div className="mx-auto flex w-max items-center gap-1.5 px-0.5 py-0.5">
          {QUICK.map((q) => (
            <button
              key={q}
              onClick={() => submit(q)}
              className="shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(text);
        }}
        className="flex gap-2"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={120}
          placeholder="Nhắn cho đối thủ ngay trên bàn…"
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
        />
        <button className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500">
          Gửi
        </button>
      </form>
    </div>
  );
}
