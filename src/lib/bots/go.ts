import type { BotBrain, BotLevel } from "./types";
import type { GoState, GoMove, GoCell } from "@/lib/games/go";
import { coordToIndex, otherSide } from "@/func";
import type { Side } from "@/types/game";

const GO = 19;

function neighbors(x: number, y: number): [number, number][] {
  return ([[1, 0], [-1, 0], [0, 1], [0, -1]] as [number, number][])    .map(([dx, dy]) => [x + dx, y + dy] as [number, number])
    .filter(([nx, ny]) => nx >= 0 && nx < GO && ny >= 0 && ny < GO);
}

/** Nhóm liên thông + số khí. */
function groupAt(g: GoCell[], sx: number, sy: number): { stones: number[]; libs: number } {
  const color = g[coordToIndex(sx, sy, GO)];
  if (color === null) return { stones: [], libs: 0 };
  const seen = new Set<number>();
  const libs = new Set<number>();
  const stack: [number, number][] = [[sx, sy]];
  const stones: number[] = [];
  while (stack.length) {
    const [x, y] = stack.pop()!;
    const i = coordToIndex(x, y, GO);
    if (seen.has(i)) continue;
    seen.add(i);
    stones.push(i);
    for (const [nx, ny] of neighbors(x, y)) {
      const ni = coordToIndex(nx, ny, GO);
      const c = g[ni];
      if (c === null) libs.add(ni);
      else if (c === color && !seen.has(ni)) stack.push([nx, ny]);
    }
  }
  return { stones, libs: libs.size };
}

/**
 * Thử đặt quân. Trả grid mới + số quân bị bắt, hoặc null nếu phạm luật (tự sát).
 * GIỐNG logic trong go.ts — bot cần giả lập để đánh giá nước đi.
 */
function tryPlace(
  grid: GoCell[],
  x: number,
  y: number,
  side: Side
): { grid: GoCell[]; captured: number } | null {
  const i = coordToIndex(x, y, GO);
  if (grid[i] !== null) return null;
  const g = grid.slice();
  g[i] = side;
  const opp = otherSide(side);
  let captured = 0;
  for (const [nx, ny] of neighbors(x, y)) {
    if (g[coordToIndex(nx, ny, GO)] === opp) {
      const grp = groupAt(g, nx, ny);
      if (grp.libs === 0) {
        for (const s of grp.stones) g[s] = null;
        captured += grp.stones.length;
      }
    }
  }
  if (groupAt(g, x, y).libs === 0) return null; // tự sát
  return { grid: g, captured };
}

// ── Heuristic ──────────────────────────────────────────────────────────

/** Số quân địch bị bắt nếu ta đánh (x,y). */
function captureScore(grid: GoCell[], x: number, y: number, side: Side): number {
  const r = tryPlace(grid, x, y, side);
  return r ? r.captured : 0;
}

/** Số khí của nhóm sẽ chứa (x,y) sau khi đặt. */
function libertyScoreAfter(grid: GoCell[], x: number, y: number, side: Side): number {
  const r = tryPlace(grid, x, y, side);
  if (!r) return 0;
  return groupAt(r.grid, x, y).libs;
}

/** Có nhóm địch nào bị đẩy xuống 1 khí (atari) không. */
function atariScore(grid: GoCell[], x: number, y: number, side: Side): number {
  const r = tryPlace(grid, x, y, side);
  if (!r) return 0;
  const opp = otherSide(side);
  const seen = new Set<number>();
  let count = 0;
  for (let idx = 0; idx < r.grid.length; idx++) {
    if (r.grid[idx] !== opp || seen.has(idx)) continue;
    const { x: gx, y: gy } = { x: idx % GO, y: Math.floor(idx / GO) };
    const grp = groupAt(r.grid, gx, gy);
    for (const s of grp.stones) seen.add(s);
    if (grp.libs === 1) count++;
  }
  return count;
}

/** Có nhóm ta nào đang ở atari và được giải cứu không. */
function defendScore(grid: GoCell[], x: number, y: number, side: Side): number {
  // Tìm nhóm ta đang ở atari (1 khí) trước khi đi.
  const seen = new Set<number>();
  let saved = 0;
  for (let idx = 0; idx < grid.length; idx++) {
    if (grid[idx] !== side || seen.has(idx)) continue;
    const { x: gx, y: gy } = { x: idx % GO, y: Math.floor(idx / GO) };
    const grp = groupAt(grid, gx, gy);
    for (const s of grp.stones) seen.add(s);
    if (grp.libs === 1) {
      // Nhóm này đang bị đe dọa — kiểm tra nước đi có giải cứu không.
      for (const s of grp.stones) {
        const { x: sx, y: sy } = { x: s % GO, y: Math.floor(s / GO) };
        for (const [nx, ny] of neighbors(sx, sy)) {
          if (nx === x && ny === y) {
            // Nước này liền kề nhóm bị đe dọa — có thể giải cứu.
            saved++;
          }
        }
      }
    }
  }
  return saved;
}

/** Trọng số vị trí: ưu tiên vùng trung tâm nhẹ ở đầu ván. */
function positionWeight(x: number, y: number, totalStones: number): number {
  if (totalStones > 80) return 0; // hết-opening
  const cx = (GO - 1) / 2;
  const cy = (GO - 1) / 2;
  const d = Math.hypot(x - cx, y - cy);
  return Math.max(0, 1 - d / (GO / 2)) * 3;
}

/** Điểm tổng hợp cho một nước đi. */
function score(grid: GoCell[], x: number, y: number, side: Side, totalStones: number): number {
  const cap = captureScore(grid, x, y, side);
  const lib = libertyScoreAfter(grid, x, y, side);
  const atk = atariScore(grid, x, y, side);
  const def = defendScore(grid, x, y, side);
  const pos = positionWeight(x, y, totalStones);

  return (
    cap * 100 + // bắt quân: rất có giá trị
    atk * 40 +  // đẩy địch vào atari: đe dọa bắt
    def * 35 +  // giải cứu nhóm ta
    lib * 3 +   // nhiều khí = nhóm mạnh
    pos
  );
}

/** Tìm nước đi tốt nhất theo scorer. */
function bestMove(
  grid: GoCell[],
  side: Side,
  scorer: (x: number, y: number) => number
): { x: number; y: number } | null {
  let best: { x: number; y: number } | null = null;
  let bestScore = -Infinity;
  for (let y = 0; y < GO; y++) {
    for (let x = 0; x < GO; x++) {
      if (grid[coordToIndex(x, y, GO)] !== null) continue;
      const sc = scorer(x, y);
      if (sc > bestScore) {
        bestScore = sc;
        best = { x, y };
      }
    }
  }
  return best;
}

// ── Chọn nước đi ───────────────────────────────────────────────────────

function chooseGoMove(state: GoState, side: Side, level: BotLevel): GoMove | null {
  const { grid } = state;
  const totalStones = grid.filter((c) => c !== null).length;

  // Cấp 0-1: ngẫu nhiên nước hợp lệ.
  if (level <= 1) {
    const valid: { x: number; y: number }[] = [];
    for (let y = 0; y < GO; y++)
      for (let x = 0; x < GO; x++) {
        if (grid[coordToIndex(x, y, GO)] !== null) continue;
        if (tryPlace(grid, x, y, side) !== null) valid.push({ x, y });
      }
    if (valid.length === 0) return { pass: true };
    return valid[Math.floor(Math.random() * valid.length)];
  }

  // Cấp 2: ưu tiên bắt quân + cơ bản.
  if (level === 2) {
    const m = bestMove(grid, side, (x, y) => {
      const cap = captureScore(grid, x, y, side);
      const lib = libertyScoreAfter(grid, x, y, side);
      return cap * 100 + lib * 2;
    });
    return m ?? { pass: true };
  }

  // Cấp 3: tấn công + phòng thủ.
  if (level === 3) {
    const m = bestMove(grid, side, (x, y) => score(grid, x, y, side, totalStones));
    return m ?? { pass: true };
  }

  // Cấp 4: heuristic đầy đủ + vị trí đầu ván.
  const m = bestMove(grid, side, (x, y) => {
    const s = score(grid, x, y, side, totalStones);
    // Nếu điểm âm → không nên đi, bỏ lượt.
    return s > 0 ? s : -1;
  });
  return m ?? { pass: true };
}

function suggestGoMove(state: GoState, side: Side, _level: BotLevel): GoMove | null {
  const totalStones = state.grid.filter((c) => c !== null).length;
  const m = bestMove(state.grid, side, (x, y) => score(state.grid, x, y, side, totalStones));
  return m ?? { pass: true };
}

export const goBot: BotBrain<GoState, GoMove> = {
  chooseMove: chooseGoMove,
  suggestMove: suggestGoMove,
};
