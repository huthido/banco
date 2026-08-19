import type { Side } from "@/types/game";

/**
 * Các cấp độ bot.
 * - 0: "Tập chơi" — bot đi nước hợp lệ ngẫu nhiên (rất yếu); người chơi luôn có nút
 *   Gợi ý (suggestMove) để học cách chơi.
 * - 1: Dễ — ngẫu nhiên trong nước hợp lệ.
 * - 2: Trung bình — heuristic cơ bản (ưu tiên ăn quân...).
 * - 3: Khá — heuristic đầy đủ / minimax nông (2 ply).
 * - 4: Cao — minimax sâu hơn + alpha-beta / đánh giá tốt hơn.
 */
export type BotLevel = 0 | 1 | 2 | 3 | 4;

export const BOT_LEVELS: { level: BotLevel; name: string; desc: string }[] = [
  { level: 0, name: "Tập chơi", desc: "Bot rất yếu + luôn có nút Gợi ý nước đi" },
  { level: 1, name: "Dễ", desc: "Đi ngẫu nhiên trong nước hợp lệ" },
  { level: 2, name: "Trung bình", desc: "Ưu tiên ăn quân, phòng thủ cơ bản" },
  { level: 3, name: "Khá", desc: "Heuristic đầy đủ + nhìn trước 2 nước" },
  { level: 4, name: "Cao", desc: "Tìm kiếm sâu + đánh giá thế cờ tốt hơn" },
];

export const BOT_NAME = "🤖 Máy";

/**
 * Bộ não bot cho một loại cờ. THUẦN (pure) — không side-effect, không import
 * socket/Next. Server gọi `chooseMove` khi tới lượt bot, và `suggestMove` cho
 * nút "Gợi ý" của người chơi (chế độ Tập chơi / bất kỳ cấp nào khi chơi máy).
 */
export interface BotBrain<S = unknown, M = unknown> {
  /** Nước đi của bot. Trả null nếu không có nước hợp lệ nào. */
  chooseMove(state: S, side: Side, level: BotLevel): M | null;
  /** Nước gợi ý cho NGƯỜI chơi (nước "tốt" theo đánh giá của bot). */
  suggestMove(state: S, side: Side, level: BotLevel): M | null;
}
