"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { PublicRoomInfo } from "@/types/room";
import { GAME_CATALOG } from "@/lib/games";

function gameName(type: PublicRoomInfo["gameType"]): string {
  return GAME_CATALOG.find((g) => g.type === type)?.name ?? type;
}

/** Sảnh chờ trên trang chủ: liệt kê phòng công khai đang chờ đối thủ, tự làm mới. */
export function PublicLobby() {
  const [rooms, setRooms] = useState<PublicRoomInfo[] | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch("/api/rooms", { cache: "no-store" });
        if (!res.ok) return;
        const data: { rooms: PublicRoomInfo[] } = await res.json();
        if (alive) setRooms(data.rooms);
      } catch {
        // im lặng — lần poll sau thử lại
      }
    }
    load();
    const timer = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        🌐 Phòng công khai
        {rooms && rooms.length > 0 && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
            {rooms.length}
          </span>
        )}
      </h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Các bàn đang chờ đối thủ — bấm Tham gia để vào chơi ngay, không cần link mời.
      </p>

      {rooms === null ? (
        <p className="mt-4 text-sm text-slate-400 dark:text-slate-500">Đang tải…</p>
      ) : rooms.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400 dark:text-slate-500">
          Chưa có phòng công khai nào. Hãy tạo bàn và bật “Công khai” để mọi người vào chơi.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {rooms.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-600 dark:bg-slate-900"
            >
              <div className="min-w-0">
                <div className="font-medium">{gameName(r.gameType)}</div>
                <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {r.host} đang chờ đối thủ
                </div>
              </div>
              <Link
                href={`/room/${r.id}?join=1`}
                className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Tham gia
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
