"use client";

import { useEffect, useState } from "react";
import { type Theme, applyTheme, resolveInitialTheme } from "@/lib/client/theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  // Đồng bộ state với theme thực tế đã được script trong <head> áp dụng.
  useEffect(() => {
    setTheme(resolveInitialTheme());
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  }

  return (
    <button
      onClick={toggle}
      aria-label="Chuyển giao diện sáng/tối"
      title={theme === "dark" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
      className="fixed right-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-lg shadow-sm transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
    >
      {/* Trước khi mount: ẩn icon để khớp SSR, tránh hydration mismatch */}
      {theme === null ? "" : theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
