// Logic đồng hồ cờ — THUẦN (không phụ thuộc socket/Next), nhận `now` tiêm vào để test tất định.
// Xem specs/001-game-clock/data-model.md & research.md.
import type { Side } from "@/types/game";
import type { TimeControl, ClockState } from "@/types/room";

const other = (s: Side): Side => (s === "first" ? "second" : "first");

/** Khởi tạo đồng hồ từ cấu hình thời gian. Trả về undefined nếu không giới hạn. */
export function initClock(tc: TimeControl): ClockState | undefined {
  if (tc.mode !== "limited") return undefined;
  return {
    remainingMs: { first: tc.baseMs, second: tc.baseMs },
    running: null,
    turnStartedAt: null,
  };
}

/** Bắt đầu tính giờ cho một bên (khi ván bắt đầu). */
export function startTurn(clock: ClockState, side: Side, now: number): ClockState {
  return { ...clock, running: side, turnStartedAt: now };
}

/** Thời gian còn lại "đang đếm" của một bên tại thời điểm `now`. */
export function liveRemaining(clock: ClockState, side: Side, now: number): number {
  if (clock.running === side && clock.turnStartedAt !== null) {
    return clock.remainingMs[side] - (now - clock.turnStartedAt);
  }
  return clock.remainingMs[side];
}

/** Bên đang chạy đã hết giờ chưa (trả về bên đó hoặc null). */
export function timedOutSide(clock: ClockState, now: number): Side | null {
  if (clock.running === null) return null;
  return liveRemaining(clock, clock.running, now) <= 0 ? clock.running : null;
}

/**
 * `mover` vừa hoàn tất một nước hợp lệ: trừ thời gian đã dùng cho lượt đó, cộng
 * increment (Fischer) nếu còn giờ, rồi chuyển đồng hồ sang đối thủ.
 */
export function applyMove(
  clock: ClockState,
  mover: Side,
  now: number,
  incrementMs: number
): ClockState {
  const elapsed =
    clock.running === mover && clock.turnStartedAt !== null ? now - clock.turnStartedAt : 0;
  let rem = clock.remainingMs[mover] - elapsed;
  if (rem > 0) rem += incrementMs;
  return {
    remainingMs: { ...clock.remainingMs, [mover]: rem },
    running: other(mover),
    turnStartedAt: now,
  };
}

/** Dừng mọi đồng hồ (ván kết thúc): chốt lại thời gian còn lại của bên đang chạy. */
export function stop(clock: ClockState, now: number): ClockState {
  if (clock.running !== null && clock.turnStartedAt !== null) {
    const s = clock.running;
    const rem = Math.max(0, clock.remainingMs[s] - (now - clock.turnStartedAt));
    return { remainingMs: { ...clock.remainingMs, [s]: rem }, running: null, turnStartedAt: null };
  }
  return { ...clock, running: null, turnStartedAt: null };
}
