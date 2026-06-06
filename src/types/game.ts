// Các kiểu dữ liệu cốt lõi cho game, dùng chung client + server.

export type GameType = "gomoku" | "chess" | "xiangqi" | "go" | "checkers";

/** Hai phe chơi, không phụ thuộc tên cụ thể (đen/đỏ/trắng tùy game). */
export type Side = "first" | "second";

export type GameResult = {
  winner: Side | "draw";
  reason: string;
};

/** Nước đi tổng quát — mỗi engine tự định nghĩa cấu trúc cụ thể trong `data`. */
export type Move = {
  side: Side;
  /** Dữ liệu nước đi do engine quy định (vd { x, y } cho gomoku, { from, to } cho chess). */
  data: unknown;
  /** Mô tả ngắn để hiển thị trong lịch sử nước đi. */
  label?: string;
  at: number;
};

export type GameMeta = {
  type: GameType;
  /** Tên hiển thị tiếng Việt. */
  name: string;
  boardCols: number;
  boardRows: number;
  /** Tên 2 phe để hiển thị, [first, second]. */
  sides: [string, string];
  /** Mô tả ngắn cho trang chủ. */
  description: string;
};
