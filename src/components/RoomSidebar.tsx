"use client";

import Link from "next/link";
import type { RoomSnapshot } from "@/types/room";
import type { GameMeta } from "@/types/game";
import { InviteLinks } from "./InviteLinks";
import { BOT_LEVELS } from "@/lib/bots";

function PlayerRow({
  label,
  player,
  active,
  isYou,
}: {
  label: string;
  player: RoomSnapshot["players"]["first"];
  active: boolean;
  isYou: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
        active
          ? "border-emerald-400 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-950"
          : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
      }`}
    >
      <div>
        <div className="text-xs text-slate-400 dark:text-slate-500">{label}</div>
        <div className="font-medium">
          {player ? player.name : <span className="text-slate-400 dark:text-slate-500">Đang chờ…</span>}
          {isYou && <span className="ml-1 text-xs text-emerald-600">(bạn)</span>}
        </div>
      </div>
      {player && (
        <span
          className={`h-2.5 w-2.5 rounded-full ${player.connected ? "bg-emerald-500" : "bg-slate-300"}`}
          title={player.connected ? "Đang kết nối" : "Mất kết nối"}
        />
      )}
    </div>
  );
}

export function RoomSidebar({
  snapshot,
  meta,
  inviteToken,
}: {
  snapshot: RoomSnapshot;
  meta: GameMeta;
  inviteToken?: string;
}) {
  const { players, turn, status, you, spectatorCount, isPublic } = snapshot;

  const statusText =
    status === "waiting"
      ? "Đang chờ đủ người chơi…"
      : status === "playing"
        ? `Lượt: ${turn === "first" ? meta.sides[0] : meta.sides[1]}`
        : "Ván đã kết thúc";

  return (
    <aside className="w-full space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{meta.name}</h2>
          {snapshot.bot && (
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900 dark:text-violet-300">
              🤖 Máy · {BOT_LEVELS[snapshot.bot.level]?.name ?? snapshot.bot.level}
            </span>
          )}
          {isPublic && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
              🌐 Công khai
            </span>
          )}
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">{statusText}</p>
        <Link
          href={`/guide/${meta.type}`}
          target="_blank"
          className="text-sm text-emerald-600 hover:underline dark:text-emerald-400"
        >
          Xem luật chơi ↗
        </Link>
      </div>

      <div className="space-y-2">
        <PlayerRow
          label={meta.sides[0]}
          player={players.first}
          active={status === "playing" && turn === "first"}
          isYou={you.side === "first"}
        />
        <PlayerRow
          label={meta.sides[1]}
          player={players.second}
          active={status === "playing" && turn === "second"}
          isYou={you.side === "second"}
        />
      </div>

      <div className="text-sm text-slate-500 dark:text-slate-400">
        👀 {spectatorCount} người xem ·{" "}
        {you.role === "player" ? "Bạn là người chơi" : "Bạn đang xem"}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <InviteLinks roomId={snapshot.id} inviteToken={inviteToken} />
      </div>
    </aside>
  );
}
