// Danh sách emoji thả cảm xúc — dùng chung client (thanh nút) + server (validate).

export const REACTIONS = ["👍", "🔥", "😂", "😮", "❤️"] as const;

export type ReactionEmoji = (typeof REACTIONS)[number];

export function isReaction(v: unknown): v is ReactionEmoji {
  return typeof v === "string" && (REACTIONS as readonly string[]).includes(v);
}
