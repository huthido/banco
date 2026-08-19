import { describe, it, expect } from "vitest";
import {
  xiangqiEngine,
  xiangqiInCheck,
  XIANGQI_COLS,
  XIANGQI_ROWS,
  type XiangqiState,
  type XiangqiPieceType,
} from "../../src/lib/games/xiangqi";
import { coordToIndex } from "../../src/func";
import type { Side } from "../../src/types/game";

/** Bàn trống 9×10 để dựng thế cờ thủ công. */
function emptyState(): XiangqiState {
  return {
    grid: new Array(XIANGQI_COLS * XIANGQI_ROWS).fill(null),
    cols: XIANGQI_COLS,
    rows: XIANGQI_ROWS,
    last: null,
  };
}

function put(s: XiangqiState, x: number, y: number, side: Side, type: XiangqiPieceType): void {
  s.grid[coordToIndex(x, y, XIANGQI_COLS)] = { side, type };
}

describe("xiangqi — phát hiện chiếu (check)", () => {
  it("bàn khởi tạo không ai bị chiếu", () => {
    const s = xiangqiEngine.createInitialState();
    expect(xiangqiInCheck(s.grid, "first")).toBe(false);
    expect(xiangqiInCheck(s.grid, "second")).toBe(false);
    expect(xiangqiEngine.getCheck?.(s)).toBeNull();
  });

  it("Xe đối phương nhìn thẳng Tướng thì Tướng bị chiếu", () => {
    const s = emptyState();
    put(s, 4, 9, "first", "general"); // Tướng Đỏ
    put(s, 4, 0, "second", "general"); // Tướng Đen
    put(s, 4, 2, "second", "chariot"); // Xe Đen chiếu cột 4
    expect(xiangqiInCheck(s.grid, "first")).toBe(true);
    expect(xiangqiInCheck(s.grid, "second")).toBe(false);
    expect(xiangqiEngine.getCheck?.(s)).toBe("first");
  });

  it("hai Tướng đối mặt (không quân chắn) là chiếu", () => {
    const s = emptyState();
    put(s, 4, 9, "first", "general");
    put(s, 4, 0, "second", "general");
    expect(xiangqiInCheck(s.grid, "first")).toBe(true);
    expect(xiangqiInCheck(s.grid, "second")).toBe(true);
  });

  it("Tướng đã bị bắt thì không tính là bị chiếu (không crash)", () => {
    const s = emptyState();
    put(s, 4, 0, "second", "general");
    expect(xiangqiInCheck(s.grid, "first")).toBe(false);
  });
});

describe("xiangqi — luật chuẩn: cấm nước đi khiến Tướng mình bị chiếu", () => {
  it("rời quân chắn ra để lộ Tướng bị chiếu -> nước đi bị chặn", () => {
    const s = emptyState();
    put(s, 4, 9, "first", "general");
    put(s, 4, 8, "first", "advisor"); // Sĩ Đỏ đang chắn cột 4
    put(s, 4, 0, "second", "general");
    put(s, 4, 1, "second", "chariot"); // Xe Đen nhìn xuống cột 4
    // Tướng Đỏ đang an toàn nhờ Sĩ chắn.
    expect(xiangqiInCheck(s.grid, "first")).toBe(false);
    // Sĩ đi chéo sang (5,7) -> rời cột 4 -> lộ Tướng -> bất hợp lệ.
    expect(xiangqiEngine.validateMove(s, { fx: 4, fy: 8, tx: 5, ty: 7 }, "first")).toBe(false);
  });

  it("không được ăn Tướng đối phương (luật chuẩn)", () => {
    const s = emptyState();
    put(s, 4, 9, "first", "general");
    put(s, 4, 0, "second", "general");
    put(s, 4, 2, "first", "chariot"); // Xe Đỏ có nước ăn Tướng Đen
    expect(xiangqiEngine.validateMove(s, { fx: 4, fy: 2, tx: 4, ty: 0 }, "first")).toBe(false);
  });

  it("state cũ (biến thể bắt-Tướng) có Tướng biến mất vẫn cho kết quả phòng thủ", () => {
    const s = emptyState();
    put(s, 4, 9, "first", "general");
    // Không có Tướng Đen — dữ liệu cũ.
    s.last = { fx: 4, fy: 2, tx: 4, ty: 0, side: "first" };
    expect(xiangqiEngine.checkResult(s, null)).toEqual({
      winner: "first",
      reason: "bắt được Tướng",
    });
  });
});

describe("xiangqi — chiếu bí (checkmate)", () => {
  it("bị chiếu và không còn nước thoát -> thắng ngay cho bên vừa đi", () => {
    // Thế chiếu bí: Tướng Đỏ (4,9); Xe Đen (0,9) khoá hàng dưới; Xe Đen (4,5) tiến
    // xuống (4,2) chiếu dọc cột 4 — Tướng Đỏ không còn ô nào an toàn.
    const s0 = emptyState();
    put(s0, 4, 9, "first", "general");
    put(s0, 4, 0, "second", "general");
    put(s0, 0, 9, "second", "chariot");
    put(s0, 4, 5, "second", "chariot");

    const s1 = xiangqiEngine.applyMove(s0, { fx: 4, fy: 5, tx: 4, ty: 2 }, "second");
    expect(xiangqiInCheck(s1.grid, "first")).toBe(true);
    const r = xiangqiEngine.checkResult(s1, { fx: 4, fy: 5, tx: 4, ty: 2 });
    expect(r).toEqual({ winner: "second", reason: "chiếu bí" });
  });

  it("bị chiếu nhưng còn nước thoát -> chưa kết thúc", () => {
    // Xe Đen chiếu dọc cột 4 nhưng Tướng Đỏ còn chạy sang (3,9) an toàn.
    const s0 = emptyState();
    put(s0, 4, 9, "first", "general");
    put(s0, 4, 0, "second", "general");
    put(s0, 4, 5, "second", "chariot");

    const s1 = xiangqiEngine.applyMove(s0, { fx: 4, fy: 5, tx: 4, ty: 2 }, "second");
    expect(xiangqiInCheck(s1.grid, "first")).toBe(true);
    expect(xiangqiEngine.checkResult(s1, { fx: 4, fy: 5, tx: 4, ty: 2 })).toBeNull();
  });
});

describe("xiangqi — hết nước đi (không bị chiếu) cũng là thua", () => {
  it("Tướng bị vây kín, mọi nước đều đưa vào thế bị chiếu -> thua", () => {
    // Tướng Đỏ (4,9) bị vây: Xe Đen (3,2) chặn (3,9); Xe Đen (5,2) chặn (5,9);
    // Mã Đen (2,7) chặn (4,8). Hiện tại Tướng Đỏ KHÔNG bị chiếu nhưng hết nước.
    const s0 = emptyState();
    put(s0, 4, 9, "first", "general");
    put(s0, 3, 0, "second", "general");
    put(s0, 3, 2, "second", "chariot");
    put(s0, 5, 2, "second", "chariot");
    put(s0, 2, 7, "second", "horse");

    expect(xiangqiInCheck(s0.grid, "first")).toBe(false);
    // Đen đi một nước không đổi thế, rồi tới lượt Đỏ — Đỏ hết nước -> thua.
    const s1 = xiangqiEngine.applyMove(s0, { fx: 3, fy: 2, tx: 3, ty: 3 }, "second");
    const r = xiangqiEngine.checkResult(s1, { fx: 3, fy: 2, tx: 3, ty: 3 });
    expect(r).toEqual({ winner: "second", reason: "đối thủ hết nước đi" });
  });
});
