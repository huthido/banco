"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getHistory, deleteHistory, clearHistory, type GameRecord } from "@/lib/client/savedBoards";
import { GAME_CATALOG } from "@/lib/games";
import { formatResult } from "@/func";

function meta(t: GameRecord["gameType"]) {
  return GAME_CATALOG.find((g) => g.type === t);
}

function timeAgo(ts: number): string {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s} giây trước`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  return `${Math.floor(h / 24)} ngày trước`;
}

/** Kết cục đối với chính người chơi: thắng / thua / hòa / xem. */
function outcomeBadge(rec: GameRecord) {
  if (rec.side === null) return { text: "Đã xem", cls: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300" };
  if (rec.result.winner === "draw") return { text: "Hòa", cls: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" };
  if (rec.result.winner === rec.side)
    return { text: "Thắng", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" };
  return { text: "Thua", cls: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" };
}

export function GameHistory() {
  const [records, setRecords] = useState<GameRecord[] | null>(null);

  const refresh = useCallback(() => {
    getHistory().then(setRecords);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (records === null || records.length === 0) return null;

  async function remove(id: string) {
    await deleteHistory(id);
    refresh();
  }
  async function clearAll() {
    await clearHistory();
    refresh();
  }

  return (
    <section className="mt-12">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Lịch sử ván đấu</h2>
        <button
          onClick={clearAll}
          className="text-sm text-slate-400 hover:text-red-500 dark:text-slate-500"
        >
          Xoá tất cả
        </button>
      </div>
      <ul className="space-y-3">
        {records.map((r) => {
          const m = meta(r.gameType);
          const badge = outcomeBadge(r);
          return (
            <li
              key={r.id}
              className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{m?.name ?? r.gameType}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}>
                    {badge.text}
                  </span>
                </div>
                <div className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
                  {(r.players.first ?? "?")} vs {(r.players.second ?? "?")} ·{" "}
                  {m ? formatResult(r.result, m.sides) : r.result.reason} · {r.moveHistory.length} nước ·{" "}
                  {timeAgo(r.finishedAt)}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Link
                  href={`/replay/${encodeURIComponent(r.id)}`}
                  className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500"
                >
                  Xem lại
                </Link>
                <button
                  onClick={() => remove(r.id)}
                  className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:border-red-500/60 dark:text-red-400 dark:hover:bg-red-950"
                >
                  Xoá
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
