import type { GameResult, Side } from "@/types/game";

/** Tên phe để hiển thị, dựa trên cặp tên do engine cung cấp. */
export function sideLabel(side: Side, sides: [string, string]): string {
  return side === "first" ? sides[0] : sides[1];
}

/** Mô tả kết quả ván đấu bằng tiếng Việt. */
export function formatResult(result: GameResult, sides: [string, string]): string {
  if (result.winner === "draw") return `Hòa cờ (${result.reason})`;
  return `${sideLabel(result.winner, sides)} thắng (${result.reason})`;
}

/** Định dạng thời điểm HH:MM. */
export function formatTime(at: number): string {
  const d = new Date(at);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}
