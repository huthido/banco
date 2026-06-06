"use client";

/** Lớp phủ hiển thị emoji bay lên trên bàn cờ (không chặn click). */
export function ReactionOverlay({ reactions }: { reactions: { id: string; emoji: string }[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {reactions.map((r) => (
        <span
          key={r.id}
          className="reaction-float absolute bottom-2 text-3xl sm:text-4xl"
          // Vị trí ngang ổn định theo id (không nhảy khi re-render, không cần random).
          style={{ left: `${10 + (hash(r.id) % 78)}%` }}
        >
          {r.emoji}
        </span>
      ))}
    </div>
  );
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
