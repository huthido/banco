// Helper sinh link mời + copy clipboard. Dùng chung client (và server có thể tạo path).

/** Đường dẫn tương đối tới phòng (không kèm origin). */
export function roomPath(roomId: string): string {
  return `/room/${roomId}`;
}

/** Link mời ĐỐI THỦ — kèm inviteToken để giành slot người chơi 2. */
export function buildInviteLink(origin: string, roomId: string, inviteToken: string): string {
  return `${origin}${roomPath(roomId)}?invite=${encodeURIComponent(inviteToken)}`;
}

/** Link mời NGƯỜI XEM — không token, luôn vào vai spectator. */
export function buildSpectatorLink(origin: string, roomId: string): string {
  return `${origin}${roomPath(roomId)}`;
}

/** Lấy origin hiện tại an toàn (trả "" khi chạy SSR). */
export function currentOrigin(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

/** Copy text vào clipboard, trả về true nếu thành công. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // rơi xuống fallback
  }
  return false;
}
