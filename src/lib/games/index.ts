import type { GameEngine } from "./engine";
import type { GameType, GameMeta } from "@/types/game";
import { gomokuEngine } from "./gomoku";
import { chessEngine } from "./chess";
import { xiangqiEngine } from "./xiangqi";
import { checkersEngine } from "./checkers";
import { goEngine } from "./go";

/**
 * Registry các engine. Thêm loại cờ mới = thêm 1 dòng ở đây.
 * Các loại chưa làm để `undefined` -> UI biết là "sắp ra mắt".
 */
const registry: Partial<Record<GameType, GameEngine>> = {
  gomoku: gomokuEngine as GameEngine,
  chess: chessEngine as GameEngine,
  xiangqi: xiangqiEngine as GameEngine,
  checkers: checkersEngine as GameEngine,
  go: goEngine as GameEngine,
};

/** Lấy engine theo loại; throw nếu chưa hỗ trợ. */
export function getEngine(type: GameType): GameEngine {
  const e = registry[type];
  if (!e) throw new Error(`Game type chưa hỗ trợ: ${type}`);
  return e;
}

/** Có hỗ trợ loại này chưa? */
export function isGameSupported(type: GameType): boolean {
  return registry[type] !== undefined;
}

/** Danh sách meta để hiển thị trang chủ (kèm cờ available). */
export type GameCatalogEntry = GameMeta & { available: boolean };

/** Toàn bộ loại cờ trong dự định, kèm trạng thái đã hỗ trợ hay chưa. */
export const GAME_CATALOG: GameCatalogEntry[] = [
  {
    type: "gomoku",
    name: "Cờ caro",
    boardCols: 15,
    boardRows: 15,
    sides: ["Quân đen", "Quân trắng"],
    description: "Đặt 5 quân liên tiếp theo hàng ngang, dọc hoặc chéo để thắng.",
    available: true,
  },
  {
    type: "chess",
    name: "Cờ vua",
    boardCols: 8,
    boardRows: 8,
    sides: ["Trắng", "Đen"],
    description: "Cờ vua quốc tế. Chiếu hết Vua đối phương để thắng.",
    available: true,
  },
  {
    type: "xiangqi",
    name: "Cờ tướng",
    boardCols: 9,
    boardRows: 10,
    sides: ["Đỏ", "Đen"],
    description: "Cờ tướng Trung Hoa với Tướng, Sĩ, Tượng, Mã, Xe, Pháo, Tốt.",
    available: true,
  },
  {
    type: "checkers",
    name: "Cờ đam",
    boardCols: 8,
    boardRows: 8,
    sides: ["Đỏ", "Đen"],
    description: "Ăn quân chéo, lên hậu khi tới hàng cuối.",
    available: true,
  },
  {
    type: "go",
    name: "Cờ vây",
    boardCols: 19,
    boardRows: 19,
    sides: ["Đen", "Trắng"],
    description: "Vây đất và bắt quân trên bàn 19×19.",
    available: true,
  },
];

export type { GameEngine } from "./engine";
