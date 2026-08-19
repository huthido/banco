import type { BotBrain } from "./types";
import type { GameType } from "@/types/game";
import { gomokuBot } from "./gomoku";
import { chessBot } from "./chess";
import { xiangqiBot } from "./xiangqi";
import { checkersBot } from "./checkers";

/**
 * Registry bot theo loại cờ. Loại chưa có bot (vd cờ vây) -> undefined:
 * UI không cho chọn "Chơi với máy".
 */
const registry: Partial<Record<GameType, BotBrain>> = {
  gomoku: gomokuBot as BotBrain,
  chess: chessBot as BotBrain,
  xiangqi: xiangqiBot as BotBrain,
  checkers: checkersBot as BotBrain,
};

/** Lấy bot cho loại cờ; null nếu loại này chưa có bot. */
export function getBotBrain(type: GameType): BotBrain | null {
  return registry[type] ?? null;
}

/** Loại cờ này có hỗ trợ chơi với máy không? */
export function isBotSupported(type: GameType): boolean {
  return registry[type] !== undefined;
}

export type { BotBrain, BotLevel } from "./types";
export { BOT_LEVELS, BOT_NAME } from "./types";
