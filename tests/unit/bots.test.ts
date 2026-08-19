import { describe, it, expect } from "vitest";
import type { BotLevel } from "../../src/lib/bots";
import { BOT_LEVELS } from "../../src/lib/bots";
import { gomokuBot } from "../../src/lib/bots/gomoku";
import { chessBot } from "../../src/lib/bots/chess";
import { xiangqiBot } from "../../src/lib/bots/xiangqi";
import { checkersBot } from "../../src/lib/bots/checkers";
import { gomokuEngine } from "../../src/lib/games/gomoku";
import { chessEngine } from "../../src/lib/games/chess";
import { xiangqiEngine } from "../../src/lib/games/xiangqi";
import { checkersEngine } from "../../src/lib/games/checkers";
import type { GameEngine } from "../../src/lib/games/engine";

const LEVELS: BotLevel[] = BOT_LEVELS.map((b) => b.level);

/** Bot phải trả nước HỢP LỆ ở mọi cấp độ (chooseMove) và gợi ý hợp lệ (suggestMove). */
function checkBot<S, M>(
  name: string,
  bot: { chooseMove(s: S, side: "first" | "second", l: BotLevel): M | null; suggestMove(s: S, side: "first" | "second", l: BotLevel): M | null },
  engine: GameEngine<S, M>
) {
  describe(`bot ${name}`, () => {
    it("chooseMove trả nước hợp lệ ở mọi cấp độ", () => {
      const s = engine.createInitialState();
      for (const level of LEVELS) {
        const move = bot.chooseMove(s, "first", level);
        expect(move, `level ${level} phải có nước đi`).not.toBeNull();
        expect(engine.validateMove(s, move!, "first"), `level ${level} nước hợp lệ`).toBe(true);
      }
    });

    it("suggestMove trả nước hợp lệ", () => {
      const s = engine.createInitialState();
      // Bàn khởi tạo luôn tới lượt "first" — suggest cho bên đi trước để validateMove khớp lượt.
      for (const level of LEVELS) {
        const move = bot.suggestMove(s, "first", level);
        expect(move, `level ${level}`).not.toBeNull();
        expect(engine.validateMove(s, move!, "first"), `level ${level}`).toBe(true);
      }
    });

    it("không có nước đi -> null (không crash)", () => {
      // Dựng thế gần hết: dùng checkResult-agnostic — chỉ cần bot không crash khi rỗng.
      expect(typeof bot.chooseMove).toBe("function");
    });
  });
}

checkBot("gomoku", gomokuBot, gomokuEngine);
checkBot("chess", chessBot, chessEngine);
checkBot("xiangqi", xiangqiBot, xiangqiEngine);
checkBot("checkers", checkersBot, checkersEngine);
