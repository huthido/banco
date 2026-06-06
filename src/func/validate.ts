import type { Side } from "@/types/game";

/** Đảo phe. */
export function otherSide(side: Side): Side {
  return side === "first" ? "second" : "first";
}

/** Kiểm tra có đúng lượt của `side` không. */
export function isMyTurn(turn: Side, side: Side | null): boolean {
  return side !== null && turn === side;
}

/** Làm sạch tên hiển thị: cắt khoảng trắng, giới hạn độ dài, fallback. */
export function sanitizeName(raw: string | undefined | null, fallback = "Người chơi"): string {
  const name = (raw ?? "").trim().slice(0, 24);
  return name.length > 0 ? name : fallback;
}

/** Làm sạch nội dung chat. */
export function sanitizeChat(raw: string): string {
  return raw.trim().slice(0, 500);
}

/** Làm sạch tin nhắn bong bóng trên bàn cờ (ngắn). */
export function sanitizeSay(raw: string): string {
  return raw.trim().slice(0, 120);
}
