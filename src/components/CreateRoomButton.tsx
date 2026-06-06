"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { GameType, Side } from "@/types/game";

export function CreateRoomButton({ gameType }: { gameType: GameType }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [side, setSide] = useState<Side>("first");

  async function create() {
    setLoading(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameType, hostSide: side }),
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
      <button
        onClick={create}
        disabled={loading}
        className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
      >
        {loading ? "Đang tạo…" : "Tạo bàn"}
      </button>
    </div>
  );
}
