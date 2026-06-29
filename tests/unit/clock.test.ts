import { describe, it, expect } from "vitest";
import {
  initClock,
  startTurn,
  liveRemaining,
  timedOutSide,
  applyMove,
  stop,
} from "../../src/lib/server/clock";
import type { ClockState } from "../../src/types/room";

const base = (): ClockState =>
  initClock({ mode: "limited", baseMs: 60_000, incrementMs: 0 })!;

describe("clock — khởi tạo", () => {
  it("unlimited -> không có đồng hồ", () => {
    expect(initClock({ mode: "unlimited" })).toBeUndefined();
  });
  it("limited -> mỗi bên đầy baseMs, chưa chạy", () => {
    const c = base();
    expect(c.remainingMs).toEqual({ first: 60_000, second: 60_000 });
    expect(c.running).toBeNull();
    expect(c.turnStartedAt).toBeNull();
  });
});

describe("clock — đếm lùi chỉ bên đang chạy (FR-002)", () => {
  it("liveRemaining trừ thời gian đã trôi của bên đang chạy, bên kia giữ nguyên", () => {
    const c = startTurn(base(), "first", 1_000);
    expect(liveRemaining(c, "first", 6_000)).toBe(55_000); // trôi 5s
    expect(liveRemaining(c, "second", 6_000)).toBe(60_000); // không chạy
  });
});

describe("clock — đổi lượt khi đi nước (FR-003)", () => {
  it("trừ thời gian bên vừa đi rồi chuyển sang đối thủ", () => {
    const c = startTurn(base(), "first", 1_000);
    const after = applyMove(c, "first", 5_000, 0); // first dùng 4s
    expect(after.remainingMs.first).toBe(56_000);
    expect(after.remainingMs.second).toBe(60_000);
    expect(after.running).toBe("second");
    expect(after.turnStartedAt).toBe(5_000);
  });
});

describe("clock — phát hiện hết giờ (FR-004)", () => {
  it("bên đang chạy về <= 0 thì timedOutSide trả về bên đó", () => {
    const c = startTurn(base(), "first", 0);
    expect(timedOutSide(c, 59_000)).toBeNull(); // còn 1s
    expect(timedOutSide(c, 60_000)).toBe("first"); // đúng 0
    expect(timedOutSide(c, 61_000)).toBe("first"); // quá giờ
  });
});

describe("clock — dừng khi kết thúc", () => {
  it("stop chốt thời gian còn lại và bỏ running", () => {
    const c = startTurn(base(), "first", 1_000);
    const s = stop(c, 4_000); // first đã dùng 3s
    expect(s.running).toBeNull();
    expect(s.turnStartedAt).toBeNull();
    expect(s.remainingMs.first).toBe(57_000);
  });
});

describe("clock — increment Fischer (US2 / FR-003)", () => {
  it("cộng increment cho bên vừa đi nếu còn giờ", () => {
    const c0 = initClock({ mode: "limited", baseMs: 60_000, incrementMs: 3_000 })!;
    const c1 = startTurn(c0, "first", 0);
    const after = applyMove(c1, "first", 4_000, 3_000); // dùng 4s, +3s
    expect(after.remainingMs.first).toBe(60_000 - 4_000 + 3_000); // 59_000
  });
  it("KHÔNG cộng increment nếu đã hết giờ (rem <= 0)", () => {
    const c0 = initClock({ mode: "limited", baseMs: 5_000, incrementMs: 3_000 })!;
    const c1 = startTurn(c0, "first", 0);
    const after = applyMove(c1, "first", 6_000, 3_000); // dùng 6s > 5s
    expect(after.remainingMs.first).toBeLessThanOrEqual(0);
  });
});

describe("clock — reset ván mới (US2 / FR-008)", () => {
  it("initClock theo cùng cấu hình trả về quỹ thời gian đầy, chưa chạy", () => {
    const tc = { mode: "limited", baseMs: 180_000, incrementMs: 2_000 } as const;
    const fresh = initClock(tc)!;
    expect(fresh.remainingMs).toEqual({ first: 180_000, second: 180_000 });
    expect(fresh.running).toBeNull();
    expect(fresh.turnStartedAt).toBeNull();
  });
});
