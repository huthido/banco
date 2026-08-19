import type { GameMeta, GameResult, Side } from "@/types/game";

/**
 * Interface chung mọi loại cờ phải implement.
 * Server và UI chỉ làm việc qua interface này, không cần biết luật riêng.
 *
 * S = kiểu GameState, M = kiểu dữ liệu nước đi.
 */
export interface GameEngine<S = unknown, M = unknown> {
  readonly meta: GameMeta;

  /** Trạng thái bàn cờ ban đầu. */
  createInitialState(): S;

  /** true nếu `move` hợp lệ cho `side` tại `state`. */
  validateMove(state: S, move: M, side: Side): boolean;

  /** Áp dụng nước đi của `side`, trả về state MỚI (immutable). Giả định move đã hợp lệ. */
  applyMove(state: S, move: M, side: Side): S;

  /** null nếu ván chưa kết thúc; ngược lại trả kết quả. */
  checkResult(state: S, lastMove: M | null): GameResult | null;

  /** Nhãn ngắn mô tả nước đi để hiển thị lịch sử. */
  describeMove(move: M, side: Side): string;

  /**
   * (Tuỳ chọn) Phe đang bị chiếu — chỉ loại cờ có khái niệm chiếu implement
   * (vd cờ tướng). Trả null nếu không có ai bị chiếu hoặc game không có khái niệm này.
   * Server đưa vào snapshot để UI hiện cảnh báo mà không cần biết luật.
   */
  getCheck?(state: S): Side | null;
}
