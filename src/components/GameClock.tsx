"use client";

/** Định dạng mm:ss (làm tròn lên giây). */
function fmt(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, "0")}`;
}

/**
 * Hiển thị một đồng hồ. `active` = bên này đang tới lượt (làm nổi bật).
 * Dưới 10s chuyển màu cảnh báo.
 */
export function GameClock({
  label,
  name,
  ms,
  active,
}: {
  label: string;
  name?: string | null;
  ms: number;
  active: boolean;
}) {
  const low = ms <= 10_000;
  return (
    <div
      className={[
        "flex min-w-[88px] flex-col items-center rounded-lg border px-3 py-1.5 transition",
        active
          ? "border-emerald-400 bg-emerald-50 dark:border-emerald-500/70 dark:bg-emerald-950"
          : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800",
      ].join(" ")}
    >
      <span className="text-[11px] text-slate-500 dark:text-slate-400">
        {label}
        {name ? ` · ${name}` : ""}
      </span>
      <span
        className={[
          "font-mono text-xl font-semibold tabular-nums",
          low ? "text-red-600 dark:text-red-400" : "text-slate-800 dark:text-slate-100",
          active ? "" : "opacity-70",
        ].join(" ")}
      >
        {fmt(ms)}
      </span>
    </div>
  );
}
