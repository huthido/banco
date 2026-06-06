"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/types/events";
import { formatTime } from "@/func";

export function Chat({
  messages,
  onSend,
}: {
  messages: ChatMessage[];
  onSend: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col">
      <h3 className="mb-2 text-sm font-semibold">Trò chuyện</h3>
      <div className="mb-2 h-40 space-y-1 overflow-y-auto rounded-md border border-slate-100 bg-slate-50 p-2 text-xs dark:border-slate-700 dark:bg-slate-900">
        {messages.length === 0 ? (
          <p className="text-slate-400 dark:text-slate-500">Chưa có tin nhắn.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id}>
              <span className="text-slate-400 dark:text-slate-500">[{formatTime(m.at)}]</span>{" "}
              <span className="font-medium">{m.name}:</span> <span>{m.text}</span>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const t = text.trim();
          if (t) {
            onSend(t);
            setText("");
          }
        }}
        className="flex gap-2"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          placeholder="Nhập tin nhắn…"
          className="flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
        />
        <button className="rounded-md bg-slate-700 px-3 py-1 text-xs font-medium text-white hover:bg-slate-800">
          Gửi
        </button>
      </form>
    </div>
  );
}
