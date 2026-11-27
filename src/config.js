// 화면/전장 상수 — 가로 화면(1280×720). 아군은 왼쪽에서 오른쪽으로 행군하고 요괴는 오른쪽에서 걸어 들어온다
export const W = 1280, H = 720;
export const HUD_H = 64, BAR_Y = 566;
// 보이는 전장(발 위치 기준)과 시뮬레이션 전장. 시뮬레이션 쪽이 오른쪽으로 더 넓어 화면 밖에서 요괴가 모인다
export const VIEW = { x0: 270, x1: 1256, y0: 134, y1: 548 };   // 왼쪽 250 은 결재함 (ui/dispatch.js)
export const FIELD = { x0: 270, x1: 1720, y0: 134, y1: 548 };
export const MID_Y = (VIEW.y0 + VIEW.y1) / 2;
export const CELL = 24; // 길찾기 격자 크기
export const BANNER_POS = { x: 304, y: MID_Y };
// 요괴 진형: 열(0~5)은 길의 폭, 줄(0=전열)은 깊이
export function spawnPos(col, row) { return { x: VIEW.x1 + 70 + row * 96, y: VIEW.y0 + 40 + col * ((VIEW.y1 - VIEW.y0 - 80) / 5) }; }
