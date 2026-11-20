// 화면/전장 상수
export const W = 720, H = 1280;
export const FIELD = { x0: 34, x1: 686, y0: 176, y1: 1078 };
// 배치 격자 (아군: 아래, 적군: 위)
export const GRID = { cols: 6, rows: 3, cw: 104, ch: 84, x0: 48, py0: 818, ey0: 192 };
export const CELL = 24; // 길찾기 격자 크기

export function cellCenter(team, col, row) {
  const y0 = team === 0 ? GRID.py0 : GRID.ey0;
  // 적군 진형은 위아래를 뒤집어 0번 줄이 전열이 되게 한다
  const r = team === 0 ? row : GRID.rows - 1 - row;
  return { x: GRID.x0 + (col + 0.5) * GRID.cw, y: y0 + (r + 0.5) * GRID.ch };
}
export function cellAt(x, y) {
  const col = Math.floor((x - GRID.x0) / GRID.cw), row = Math.floor((y - GRID.py0) / GRID.ch);
  if (col < 0 || col >= GRID.cols || row < 0 || row >= GRID.rows) return null;
  return { col, row };
}
