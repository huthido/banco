"use client";

import { useEffect, useState } from "react";
import { buildInviteLink, buildSpectatorLink, copyToClipboard, currentOrigin } from "@/func";

function CopyRow({ label, hint, value }: { label: string; hint: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const ok = await copyToClipboard(value);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <button
          onClick={copy}
          className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700"
        >
          {copied ? "Đã copy ✓" : "Copy"}
        </button>
      </div>
      <p className="mb-1 text-xs text-slate-400 dark:text-slate-500">{hint}</p>
      <input
        readOnly
        value={value}
        onFocus={(e) => e.currentTarget.select()}
        className="w-full truncate rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300"
      />
    </div>
  );
}

export function InviteLinks({ roomId, inviteToken }: { roomId: string; inviteToken?: string }) {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(currentOrigin()), []);
  if (!origin) return null;

  return (
    <div className="space-y-4">
      {inviteToken && (
        <CopyRow
          label="🎯 Link mời đối thủ"
          hint="Gửi cho người bạn muốn chơi cùng — họ sẽ ngồi vào ghế còn trống."
          value={buildInviteLink(origin, roomId, inviteToken)}
        />
      )}
      <CopyRow
        label="👀 Link mời người xem"
        hint="Ai mở link này chỉ xem được, không đi quân."
        value={buildSpectatorLink(origin, roomId)}
      />
    </div>
  );
}
