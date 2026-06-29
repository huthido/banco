"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { GameType, Side } from "@/types/game";
import type { TimeControl } from "@/types/room";

/** Các mốc thời gian dựng sẵn cho đồng hồ cờ. */
const TIME_PRESETS: { key: string; label: string; tc: TimeControl }[] = [
  { key: "unlimited", label: "♾️ Không giới hạn", tc: { mode: "unlimited" } },
  { key: "60+0", label: "⚡ 1 phút", tc: { mode: "limited", baseMs: 60_000, incrementMs: 0 } },
  { key: "180+2", label: "🚀 3 phút +2s", tc: { mode: "limited", baseMs: 180_000, incrementMs: 2_000 } },
  { key: "300+0", label: "⏱️ 5 phút", tc: { mode: "limited", baseMs: 300_000, incrementMs: 0 } },
  { key: "600+5", label: "🕙 10 phút +5s", tc: { mode: "limited", baseMs: 600_000, incrementMs: 5_000 } },
];

export function CreateRoomButton({ gameType }: { gameType: GameType }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [side, setSide] = useState<Side>("first");
  const [isPublic, setIsPublic] = useState(false);
  const [timeKey, setTimeKey] = useState("unlimited");

  async function create() {
    setLoading(true);
    try {
      const timeControl = (TIME_PRESETS.find((p) => p.key === timeKey) ?? TIME_PRESETS[0]).tc;
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameType, hostSide: side, isPublic, timeControl }),
      });
      if (!res.ok) throw new Error("Tạo bàn thất bại");
      const data: { roomId: string; inviteToken: string } = await res.json();
      // Host vào phòng kèm token (để giành slot người chơi) + cờ host.
      router.push(`/room/${data.roomId}?invite=${data.inviteToken}&host=1`);
    } catch (e) {
      alert((e as Error).message);
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <select
          value={side}
          onChange={(e) => setSide(e.target.value as Side)}
          className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
          aria-label="Chọn phe"
        >
          <option value="first">Đi trước</option>
          <option value="second">Đi sau</option>
        </select>
        <label className="flex select-none items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          🌐 Công khai
        </label>
      </div>
      <select
        value={timeKey}
        onChange={(e) => setTimeKey(e.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
        aria-label="Chọn thời gian"
      >
        {TIME_PRESETS.map((p) => (
          <option key={p.key} value={p.key}>
            {p.label}
          </option>
        ))}
      </select>
      <button
        onClick={create}
        disabled={loading}
        className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
      >
        {loading ? "Đang tạo…" : "Tạo bàn"}
      </button>
    </div>
  );
}
