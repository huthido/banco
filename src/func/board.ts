// Helper toạ độ bàn cờ dạng lưới, dùng chung cho mọi engine ô-vuông (gomoku, go, checkers).

export type Cell = { x: number; y: number };

/** 4 hướng cơ bản (ngang, dọc, 2 chéo) — mỗi hướng là 1 vector. */
export const LINE_DIRECTIONS: ReadonlyArray<Cell> = [
  { x: 1, y: 0 }, // ngang
  { x: 0, y: 1 }, // dọc
  { x: 1, y: 1 }, // chéo xuống-phải
  { x: 1, y: -1 }, // chéo lên-phải
];

export function inBounds(x: number, y: number, cols: number, rows: number): boolean {
  return x >= 0 && x < cols && y >= 0 && y < rows;
}

/** Chuyển (x, y) -> chỉ số phẳng trong mảng 1 chiều. */
export function coordToIndex(x: number, y: number, cols: number): number {
  return y * cols + x;
}

/** Chuyển chỉ số phẳng -> (x, y). */
export function indexToCoord(index: number, cols: number): Cell {
  return { x: index % cols, y: Math.floor(index / cols) };
}

/** Tạo lưới rỗng cols×rows điền giá trị `fill`. */
export function createGrid<T>(cols: number, rows: number, fill: T): T[] {
  return new Array(cols * rows).fill(fill);
}

/**
 * Đếm số quân liên tiếp cùng giá trị qua 1 ô theo cả 2 chiều của 1 hướng.
 * Trả về tổng độ dài chuỗi (gồm chính ô đang xét).
 */
export function countLine<T>(
  grid: T[],
  cols: number,
  rows: number,
  start: Cell,
  dir: Cell,
  value: T
): number {
  let count = 1;
  for (const sign of [1, -1]) {
    let x = start.x + dir.x * sign;
    let y = start.y + dir.y * sign;
    while (inBounds(x, y, cols, rows) && grid[coordToIndex(x, y, cols)] === value) {
      count++;
      x += dir.x * sign;
      y += dir.y * sign;
    }
  }
  return count;
}
