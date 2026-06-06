"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAllBoards, deleteBoard, type SavedBoard } from "@/lib/client/savedBoards";
import { GAME_CATALOG } from "@/lib/games";
import { buildInviteLink, copyToClipboard, currentOrigin, roomPath } from "@/func";

const STATUS_LABEL: Record<SavedBoard["status"], string> = {
  waiting: "Đang chờ",
  playing: "Đang chơi",
  finished: "Đã kết thúc",
};

function gameName(t: SavedBoard["gameType"]): string {
  return GAME_CATALOG.find((g) => g.type === t)?.name ?? t;
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

export function SavedBoards() {
  const router = useRouter();
  const [boards, setBoards] = useState<SavedBoard[] | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  const refresh = useCallback(() => {
    getAllBoards().then(setBoards);
  }, []);

  useEffect(() => {
    setOrigin(currentOrigin());
    refresh();
  }, [refresh]);

  if (boards === null || boards.length === 0) return null;

  async function copyInvite(b: SavedBoard) {
    if (!b.inviteToken) return;
    const ok = await copyToClipboard(buildInviteLink(origin, b.id, b.inviteToken));
    if (ok) {
      setCopied(b.id);
      setTimeout(() => setCopied(null), 1500);
    }
  }

  function open(b: SavedBoard) {
    const url = b.inviteToken ? `${roomPath(b.id)}?invite=${b.inviteToken}` : roomPath(b.id);
    router.push(url);
  }

  async function remove(b: SavedBoard) {
    await deleteBoard(b.id);
    refresh();
  }

  return (
    <section className="mt-12">
      <h2 className="mb-4 text-xl font-semibold">Bàn cờ đã lưu</h2>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        Mở lại để chơi tiếp hoặc mời lại đối thủ — kể cả sau khi đóng trình duyệt.
      </p>
      <ul className="space-y-3">
        {boards.map((b) => (
          <li
            key={b.id}
            className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-700 dark:bg-slate-800"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{gameName(b.gameType)}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                  {STATUS_LABEL[b.status]}
                </span>
                {!b.inviteToken && (
                  <span className="text-xs text-slate-400 dark:text-slate-500">(người xem)</span>
                )}
              </div>
              <div className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
                {(b.players.first ?? "?")} vs {(b.players.second ?? "?")} ·{" "}
                {b.moveHistory.length} nước · {timeAgo(b.updatedAt)}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                onClick={() => open(b)}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Mở lại
              </button>
              {b.inviteToken && (
                <button
                  onClick={() => copyInvite(b)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700"
                >
                  {copied === b.id ? "Đã copy ✓" : "Copy link mời"}
                </button>
              )}
              <button
                onClick={() => remove(b)}
                className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:border-red-500/60 dark:text-red-400 dark:hover:bg-red-950"
              >
                Xoá
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
