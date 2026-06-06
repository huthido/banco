"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getSavedName, getSavedNameSync, setSavedName } from "@/lib/client/savedBoards";

export function NameDialog({ onSubmit }: { onSubmit: (name: string) => void }) {
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Prefill tên đã lưu và bôi đen để dễ sửa.
  useEffect(() => {
    const fill = (n: string | null) => {
      if (n) {
        setName(n);
        inputRef.current?.select();
      }
    };
    const sync = getSavedNameSync(); // tức thì từ localStorage
    if (sync) fill(sync);
    else getSavedName().then(fill); // dự phòng IndexedDB
  }, []);

  function submit() {
    const n = name.trim();
    if (!n) return;
    void setSavedName(n); // nhớ cho lần sau
    onSubmit(n);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800"
      >
        <Link
          href="/"
          aria-label="Đóng, về trang chủ"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
        >
          ✕
        </Link>
        <h2 className="text-xl font-semibold">Nhập tên hiển thị</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Tên này sẽ hiện cho đối thủ và người xem.
        </p>
        <input
          ref={inputRef}
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={24}
          placeholder="Ví dụ: Kỳ thủ ẩn danh"
          className="mt-4 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={!name.trim()}
          className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          Vào phòng
        </button>
        <Link
          href="/"
          className="mt-3 block text-center text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
        >
          ← Về trang chủ
        </Link>
      </form>
    </div>
  );
}
