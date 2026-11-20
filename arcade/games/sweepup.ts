/**
 * 빗자루 한 번 쓸기 (36라운드: 직접 만지는 물리 장난감 — 한 번 긋기) — 한 번 쓸기 × 가리키기.
 * 손짓 하나: 누르고 쓱 움직였다 떼기 = 빗자루 한 번 쓸기. 손가락이 지나가는 동안 폭 넓은 빗자루가 그 길을 그대로 따라가며
 *   바닥의 작은 물건을 바로 민다(손가락보다 0.05초 늦게 따라오는 무게감만 있다). 획의 정확도는 따지지 않는다.
 *   키보드는 화살표로 커서를 옮기고, 스페이스를 누른 채 화살표 = 쓸기.
 * 물리(결정적, 고정 간격 1/60): 원 수백 개. 격자 이웃 찾기로 서로 부딪히고(질량·튕김), 바닥 마찰로 굴러가다 멈춘다.
 *   빗자루 = 손가락 쪽으로 움직이는 넓은 막대. 이번 틱에 막대가 지나간 자리의 물건은 막대 앞으로 옮겨지고 막대 속도를 받는다
 *   (그래서 한 번 쓱 = 앞에 더미가 쌓이며 우르르). 구멍 둘레의 비탈은 가장자리 것을 끌어당겨 쏙 빨아들인다.
 * 와우: 쓱 한 번에 구슬 수십 개가 진짜 물리로 와르르 밀려 같은 색 구멍으로 퐁퐁퐁 — 덜 들어간 건 흩어져 굴러가다 멈춘다.
 * 판 8개(마루 3 · 부엌 2 · 마당 3): 쓸기 횟수 안에 목표 개수를 같은 색 구멍에. 다른 색 구멍에 들면 −1. 시간 제한 없음.
 *   별 = 판마다 한 줄씩 늘어난다(1판 1개 · 2판 2개 · 3판부터 3개). 쓸기를 다 쓰고 멈췄는데 목표에 못 미치면 하트 −1, 같은 판 다시.
 * 펼쳐짐(하는 일이 바뀐다): 1 한 색 → 2 두 색(색 갈라 쓸기) → 3 잠자는 고양이(닿으면 깨서 펄쩍 — 돌아 쓸기)
 *   → 4 쏟은 물(웅덩이에 밀어 넣으면 쭉 미끄러져 멀리 — 미끄럼으로 보내기) → 5 색깔 발(같은 색만 지나감 — 섞인 더미를 발에 대고 거르기)
 *   → 6 비탈 마당(도토리는 굴러 내려오고 낙엽은 그 자리 — 끝까지 밀기) → 7 뚜껑 바구니(가득 차면 꽉 닫힘 — 나눠 담기)
 *   → 8 세 가지 색 + 고양이 + 웅덩이 (모두 함께).
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import { REACT, type Bot, type GameDef, type Input, type Theme } from '../core.ts';
import { juice } from '../juice.ts';

/** 화면 세로 ÷ 가로 */
const A = 1.5;
/** 바닥 평면: 가로 0~W, 세로 0~H (0 = 뒤 벽, H = 앞) */
const W = 1, H = 1.45;
/** 이웃 찾기 격자 */
const CS = 0.046, GC = Math.ceil(W / CS) + 1, GR = Math.ceil(H / CS) + 1;

// 물건 종류: 구슬 · 사탕 · 낙엽 · 도토리
const MARBLE = 0, CANDY = 1, LEAF = 2, ACORN = 3;
const KR = [0.02, 0.021, 0.023, 0.021];
/** 틱마다 속도에 곱하는 마찰 (구슬은 잘 구르고 낙엽은 바로 멈춘다) */
const KFR = [0.955, 0.935, 0.86, 0.95];
const KM = [1, 1, 0.6, 1.2];
/** 비탈에 굴러 내려가는 정도 (낙엽은 안 구른다) */
const KROLL = [1, 0.7, 0, 1];
const KNAME = ['구슬', '사탕', '낙엽', '도토리'];
/** 웅덩이 위 마찰 */
const FR_WET = 0.992;
const SLEEP2 = 0.00018 * 0.00018;
const CALM = 0.0007;
const REST = 0.25, WALL_REST = 0.4;
/** 빗자루: 막대 반 길이 · 막대 반 두께 · 손가락 따라가기 · 물건에 주는 속도 상한 · 한 획 최대 길이 */
const BL = 0.15, BT = 0.016, FOLLOW = 0.6, VMAX = 0.028, PUSHK = 1.0, LMAX = 1.6;
/** 획으로 치는 최소 길이 (이보다 짧게 떼면 쓸기를 안 쓴다) */
const MINLEN = 0.035;
/** 구멍: 둘레 비탈 폭 · 끌어당김 · 빠지는 반지름 비율 */
const RIM = 0.022, PULL = 0.0009, CAPF = 0.82;
/** 고양이: 몸 반지름 · 깨는 충돌 속도 · 깨는 충돌 수 · 펄쩍 시간 · 깰 때 밀어내는 반지름·세기 */
const CAT_R = 0.095, CAT_HIT = 0.016, CAT_BUMPS = 6, JUMP_T = 80, CAT_BLAST_R = 0.26, CAT_BLAST = 0.02;
const RESULT = 190, CARD_T = 150, NEWS_T = 170;
const STAR_PTS = 100, NET_PTS = 2, LEFT_PTS = 30, WIN_PTS = 300;
/** 큰 순간: 한 획에 이만큼 밀면 '와르르' · 이 틱 안에 이만큼 들어가면 '퐁퐁퐁' */
const SURGE_N = 30, COMBO_T = 40, COMBO_N = 6;

type Star = { k: 'count'; n: number } | { k: 'clean'; n: number } | { k: 'cat' } | { k: 'fast'; m: number; n: number } | { k: 'more'; n: number } | { k: 'lids' };

interface PileDef {
  x: number; y: number; rx: number; ry: number; n: number; k: number;
  /** 색 비율 (색 번호 = 자리) */
  cols: number[];
}
interface StageDef {
  /** 0 마루 · 1 부엌 · 2 마당 */
  place: number;
  key: string;
  news: string;
  hint: string;
  piles: PileDef[];
  /** [x, y, r, 색, 뚜껑까지 개수(0 = 없음)] */
  holes: number[][];
  /** [ax, ay, bx, by, 색(-1 = 벽, 그 색만 지나가는 발)] */
  segs?: number[][];
  /** [x, y, rx, ry] 웅덩이 */
  puds?: number[][];
  /** 비탈: 틱마다 더해지는 속도 [gx, gy] */
  slope?: number[];
  /** 고양이 자리들 (첫 자리에서 자고, 깨면 다음 자리로 펄쩍) */
  cat?: number[][];
  sweeps: number;
  stars: Star[];
}

const P = (x: number, y: number, rx: number, ry: number, n: number, k: number, cols: number[]): PileDef => ({ x, y, rx, ry, n, k, cols });

/** 판 8개. 좌표는 뒤집기 전 — 판마다 시드로 좌우를 뒤집고 물건 자리를 새로 흩뿌린다 */
export const STAGES: StageDef[] = [
  {
    place: 0, key: 'sweep', news: '', hint: '구슬 더미 뒤에서 구멍 쪽으로 쓱!',
    piles: [P(0.5, 0.72, 0.5, 0.72, 190, MARBLE, [1]), P(0.5, 0.72, 0.2, 0.25, 40, MARBLE, [1])],
    holes: [[0.22, 0.36, 0.15, 0, 0], [0.78, 0.36, 0.15, 0, 0], [0.22, 1.08, 0.15, 0, 0], [0.78, 1.08, 0.15, 0, 0]],
    sweeps: 6, stars: [{ k: 'count', n: 30 }],
  },
  {
    place: 0, key: 'two', news: '🔵 파란 구슬 — 같은 색 구멍에! 다른 색은 −1', hint: '빨강은 빨간 구멍, 파랑은 파란 구멍',
    piles: [P(0.25, 0.72, 0.25, 0.72, 100, MARBLE, [1, 0]), P(0.75, 0.72, 0.25, 0.72, 100, MARBLE, [0, 1]), P(0.5, 0.72, 0.12, 0.5, 30, MARBLE, [1, 1])],
    holes: [[0.2, 0.36, 0.14, 0, 0], [0.2, 1.08, 0.14, 0, 0], [0.8, 0.36, 0.14, 1, 0], [0.8, 1.08, 0.14, 1, 0]],
    sweeps: 6, stars: [{ k: 'count', n: 25 }, { k: 'clean', n: 3 }],
  },
  {
    place: 0, key: 'cat', news: '🐈 잠자는 고양이 — 빗자루나 구슬이 세게 닿으면 깨요!', hint: '고양이를 비켜 돌아서 쓸어요',
    piles: [P(0.3, 1.0, 0.22, 0.26, 85, MARBLE, [1, 0]), P(0.7, 1.0, 0.22, 0.26, 85, MARBLE, [0, 1]), P(0.5, 1.28, 0.2, 0.09, 24, MARBLE, [1, 1])],
    holes: [[0.2, 0.3, 0.13, 0, 0], [0.8, 0.3, 0.13, 1, 0]],
    cat: [[0.3, 0.64], [0.7, 0.64]],
    sweeps: 5, stars: [{ k: 'count', n: 40 }, { k: 'clean', n: 4 }, { k: 'cat' }],
  },
  {
    place: 1, key: 'puddle', news: '💧 쏟은 물 — 웅덩이에 밀면 쭉 미끄러져요', hint: '웅덩이로 밀면 멀리 미끄러져 가요',
    piles: [P(0.28, 1.17, 0.2, 0.15, 75, CANDY, [1, 0]), P(0.72, 1.17, 0.2, 0.15, 75, CANDY, [0, 1]), P(0.5, 0.95, 0.12, 0.08, 20, CANDY, [1, 1])],
    holes: [[0.16, 0.2, 0.11, 0, 0], [0.84, 0.2, 0.11, 1, 0]],
    puds: [[0.5, 0.56, 0.44, 0.24]],
    sweeps: 4, stars: [{ k: 'count', n: 45 }, { k: 'clean', n: 4 }, { k: 'fast', m: 3, n: 40 }],
  },
  {
    place: 1, key: 'curtain', news: '🎏 색깔 발 — 같은 색만 지나가요!', hint: '섞인 더미를 발 쪽으로 밀면 저절로 갈라져요',
    piles: [P(0.5, 0.78, 0.46, 0.2, 150, CANDY, [1, 1]), P(0.5, 1.1, 0.3, 0.12, 30, CANDY, [1, 1])],
    holes: [[0.24, 0.23, 0.13, 0, 0], [0.76, 0.23, 0.13, 1, 0]],
    segs: [[0, 0.42, 0.5, 0.42, 0], [0.5, 0.42, 1, 0.42, 1], [0.5, 0, 0.5, 0.42, -1]],
    sweeps: 5, stars: [{ k: 'count', n: 40 }, { k: 'fast', m: 3, n: 45 }, { k: 'more', n: 70 }],
  },
  {
    place: 2, key: 'slope', news: '⛰️ 비탈 마당 — 도토리는 굴러 내려와요', hint: '도토리는 바구니까지 끝까지 밀어요',
    piles: [P(0.5, 0.1, 0.42, 0.06, 70, ACORN, [0, 0, 0, 1]), P(0.5, 0.62, 0.3, 0.2, 100, LEAF, [1])],
    holes: [[0.5, 1.24, 0.13, 3, 0], [0.14, 1.12, 0.12, 0, 0], [0.86, 1.12, 0.12, 0, 0]],
    slope: [0, -0.00032],
    sweeps: 5, stars: [{ k: 'count', n: 50 }, { k: 'clean', n: 4 }, { k: 'more', n: 85 }],
  },
  {
    place: 2, key: 'lids', news: '🧺 뚜껑 바구니 — 가득 차면 꽉 닫혀요', hint: '바구니마다 나눠 담아요 — 찬 바구니는 닫혀요',
    piles: [P(0.3, 0.86, 0.22, 0.24, 80, LEAF, [1, 0, 0]), P(0.7, 0.86, 0.22, 0.24, 80, LEAF, [0, 0, 1]), P(0.5, 1.22, 0.3, 0.08, 30, LEAF, [1, 0, 1])],
    holes: [[0.15, 0.22, 0.1, 0, 22], [0.5, 0.2, 0.1, 2, 22], [0.85, 0.22, 0.1, 0, 22], [0.5, 0.5, 0.09, 2, 22]],
    sweeps: 5, stars: [{ k: 'count', n: 55 }, { k: 'clean', n: 5 }, { k: 'lids' }],
  },
  {
    place: 2, key: 'mix3', news: '🍂 세 가지 색 + 고양이 + 웅덩이 — 다 함께!', hint: '고양이는 비키고, 웅덩이는 미끄럼틀로',
    piles: [P(0.19, 1.1, 0.15, 0.22, 55, LEAF, [0, 0, 1]), P(0.81, 1.1, 0.15, 0.22, 55, LEAF, [1, 0, 0]), P(0.5, 1.0, 0.12, 0.15, 55, ACORN, [0, 0, 0, 1])],
    holes: [[0.12, 0.62, 0.11, 2, 0], [0.88, 0.62, 0.11, 0, 0], [0.5, 0.15, 0.11, 3, 0]],
    puds: [[0.5, 0.33, 0.2, 0.1]],
    cat: [[0.5, 0.62], [0.32, 0.4], [0.68, 0.4]],
    sweeps: 6, stars: [{ k: 'count', n: 55 }, { k: 'clean', n: 6 }, { k: 'cat' }],
  },
];
export const STAGE_COUNT = STAGES.length;

interface Hole { x: number; y: number; r: number; col: number; cap: number; n: number; shut: boolean; bad: number; popT: number; cn: number; ct: number; wn: number; wt: number }
interface Seg { ax: number; ay: number; bx: number; by: number; col: number }
interface Pud { x: number; y: number; rx: number; ry: number }
interface Cat { x: number; y: number; spots: number[][]; si: number; jump: number; fx: number; fy: number; bumps: number; woke: number }
interface Broom {
  down: boolean; x: number; y: number; tx: number; ty: number; dx: number; dy: number; has: boolean;
  len: number; tired: boolean; spd: number; counted: boolean;
}
interface Sim {
  t: number; n: number;
  x: Float64Array; y: Float64Array; vx: Float64Array; vy: Float64Array; ox: Float64Array; oy: Float64Array; ang: Float64Array;
  k: Uint8Array; c: Int8Array; live: Uint8Array; hit: Uint8Array;
  /** 지난 틱에 남에게 밀려 자리가 바뀐 것 (가만히 있어도 한 번 더 살핀다) */
  mv: Uint8Array;
  holes: Hole[]; segs: Seg[]; puds: Pud[]; gx: number; gy: number;
  cat: Cat | null; b: Broom;
  good: number; bad: number; pushed: number; moving: number;
}
interface Ev { t: number; kind: string; x: number; y: number; text?: string; n?: number; col?: number }
interface Fall { x: number; y: number; hx: number; hy: number; k: number; c: number; t: number; ok: boolean; a: number }

export interface SweepState extends Sim {
  rng: Rng; seed: number; stage: number; phase: 'play' | 'result'; pt: number; flip: boolean[];
  left: number; used: number; hearts: number; stars: number; got: number; starOk: boolean[]; pts: number;
  ok: boolean; why: string; dead: boolean; won: boolean; again: boolean; tries: number;
  down: boolean; firstTouch: number; strokeEnd: number; fastOk: boolean;
  seen: Set<string>; newsQ: string[]; news: { text: string; t: number } | null;
  events: Ev[]; falls: Fall[]; wowN: number; recent: number[]; surged: boolean; total: number;
  /** 연출: 빗자루 표정·구경꾼 강아지 */
  mood: number; moodT: number; dogT: number; dogMood: number; trail: number[];
}

const ev = (s: SweepState, kind: string, x: number, y: number, text?: string, n?: number, col?: number) => s.events.push({ t: s.t, kind, x, y, text, n, col });
function see(s: SweepState, key: string, text: string) {
  if (!key || s.seen.has(key)) return;
  s.seen.add(key);
  if (text) s.newsQ.push(text);
}

// ───────── 화면 배치 (가로 0~1, 세로 0~A, 가로 폭 기준) — 앞에서 비스듬히 내려다본 바닥: 뒤가 좁고 앞이 넓다 ─────────
const Y0 = 0.3, KY = 0.66, SB = 0.8, SF = 0.95;
const scl = (y: number) => SB + (SF - SB) * (y / H);
const PX = (x: number, y: number) => 0.5 + (x - 0.5) * scl(y);
const PY = (y: number) => Y0 + y * KY;
const BAND = 1.276;
function toFloor(sx: number, sy: number) {
  const y = (sy - Y0) / KY;
  return { x: 0.5 + (sx - 0.5) / scl(y), y };
}
const clampF = (x: number, lo: number, hi: number) => (x < lo ? lo : x > hi ? hi : x);

// ───────────────────────────── 시뮬레이션 ─────────────────────────────
const head = new Int32Array(GC * GR), nxt = new Int32Array(1024);
type Emit = ((kind: string, x: number, y: number, i: number, extra?: number) => void) | null;

function broomStep(S: Sim, E: Emit) {
  const b = S.b;
  if (!b.down) return;
  const x0 = b.x, y0 = b.y;
  const x1 = x0 + (b.tx - x0) * FOLLOW, y1 = y0 + (b.ty - y0) * FOLLOW;
  const mx = x1 - x0, my = y1 - y0, ml = Math.hypot(mx, my);
  b.x = x1;
  b.y = y1;
  if (b.tired) return;
  b.len += ml;
  if (ml < 1e-5) return void (b.spd *= 0.5);
  const ux = mx / ml, uy = my / ml;
  if (!b.has) (b.dx = ux), (b.dy = uy), (b.has = true);
  else {
    let dx = b.dx * 0.62 + ux * 0.38, dy = b.dy * 0.62 + uy * 0.38;
    const dl = Math.hypot(dx, dy);
    if (dl < 1e-6) (dx = ux), (dy = uy);
    else (dx /= dl), (dy /= dl);
    b.dx = dx;
    b.dy = dy;
  }
  b.spd = ml;
  const dx = b.dx, dy = b.dy, nx = -dy, ny = dx;
  const md = Math.max(0, mx * dx + my * dy);
  const back = md + BT + 0.006, sb = Math.min(VMAX, ml) * PUSHK;
  const X = S.x, Y = S.y, VX = S.vx, VY = S.vy, L = S.live, K = S.k;
  const reach = (BL + back + 0.05) ** 2;
  for (let i = 0; i < S.n; i++) {
    if (!L[i]) continue;
    const px = X[i] - x1, py = Y[i] - y1;
    if (px * px + py * py > reach) continue;
    const r = KR[K[i]], u = px * dx + py * dy, v = px * nx + py * ny;
    if (v > BL + r * 0.4 || v < -BL - r * 0.4 || u > BT + r || u < -(back + r)) continue;
    const uu = BT + r + 0.0008;
    S.mv[i] = 1;
    X[i] = x1 + dx * uu + nx * v;
    Y[i] = y1 + dy * uu + ny * v;
    const vd = VX[i] * dx + VY[i] * dy, vt = VX[i] * nx + VY[i] * ny;
    const nvd = Math.max(vd, sb), nvt = vt * 0.7 + (Math.abs(v) > BL - r ? (v > 0 ? 0.0016 : -0.0016) : 0);
    VX[i] = dx * nvd + nx * nvt;
    VY[i] = dy * nvd + ny * nvt;
    if (!S.hit[i]) (S.hit[i] = 1), S.pushed++;
  }
  // 잠자는 고양이에 빗자루가 닿으면 깬다
  const c = S.cat;
  if (c && c.jump < 0) {
    const ex = c.x - x1, ey = c.y - y1, v = Math.max(-BL, Math.min(BL, ex * nx + ey * ny));
    const qx = x1 + nx * v, qy = y1 + ny * v;
    if (Math.hypot(c.x - qx, c.y - qy) < CAT_R + BT + 0.005) wakeCat(S, E);
  }
}

function wakeCat(S: Sim, E: Emit) {
  const c = S.cat!;
  c.woke++;
  c.jump = 0;
  c.fx = c.x;
  c.fy = c.y;
  c.bumps = 0;
  const X = S.x, Y = S.y;
  for (let i = 0; i < S.n; i++) {
    if (!S.live[i]) continue;
    const dx = X[i] - c.x, dy = Y[i] - c.y, d = Math.hypot(dx, dy);
    if (d < CAT_BLAST_R && d > 1e-6) {
      const f = CAT_BLAST * (1 - d / CAT_BLAST_R) + 0.004;
      S.vx[i] += (dx / d) * f;
      S.vy[i] += (dy / d) * f;
    }
  }
  E?.('cat', c.x, c.y, -1);
}

function phys(S: Sim, E: Emit) {
  S.t++;
  const n = S.n, X = S.x, Y = S.y, VX = S.vx, VY = S.vy, K = S.k, L = S.live;
  if (S.segs.length) S.ox.set(X), S.oy.set(Y);
  const MV = S.mv;
  broomStep(S, E);
  const c = S.cat;
  if (c && c.jump >= 0) {
    c.jump++;
    const to = c.spots[(c.si + 1) % c.spots.length];
    if (c.jump >= JUMP_T) {
      c.si = (c.si + 1) % c.spots.length;
      c.x = to[0];
      c.y = to[1];
      c.jump = -1;
      for (let i = 0; i < S.n; i++) if (S.live[i] && Math.hypot(S.x[i] - c.x, S.y[i] - c.y) < CAT_R + 0.03) S.mv[i] = 1;
      E?.('catland', c.x, c.y, -1);
    }
  }
  // 1. 움직이기: 비탈 · 구멍 둘레 · 마찰
  let moving = 0;
  const holes = S.holes, puds = S.puds, gx = S.gx, gy = S.gy;
  const slope = gx !== 0 || gy !== 0;
  for (let i = 0; i < n; i++) {
    if (!L[i]) continue;
    let vx = VX[i], vy = VY[i];
    const k = K[i], px = X[i], py = Y[i];
    // 가만히 있고 아무도 안 밀었으면 건너뛴다
    if (!vx && !vy && !MV[i] && !(slope && KROLL[k] > 0)) continue;
    MV[i] = 0;
    if (slope) {
      const rf = KROLL[k];
      if (rf > 0) (vx += gx * rf), (vy += gy * rf);
    }
    for (let h = 0; h < holes.length; h++) {
      const o = holes[h];
      if (o.shut) continue;
      const dx = o.x - px, dy = o.y - py, rr = o.r + RIM, d2 = dx * dx + dy * dy;
      if (d2 < rr * rr) {
        const d = Math.sqrt(d2) + 1e-9;
        vx += (dx / d) * PULL;
        vy += (dy / d) * PULL;
      }
    }
    let fr = KFR[k];
    for (let q = 0; q < puds.length; q++) {
      const p = puds[q], ex = (px - p.x) / p.rx, ey = (py - p.y) / p.ry;
      if (ex * ex + ey * ey < 1) {
        fr = FR_WET;
        break;
      }
    }
    vx *= fr;
    vy *= fr;
    if (vx * vx + vy * vy < SLEEP2) (vx = 0), (vy = 0);
    else moving++;
    VX[i] = vx;
    VY[i] = vy;
    X[i] = px + vx;
    Y[i] = py + vy;
    if (vx || vy) S.ang[i] += (vx - vy * 0.5) * (k === LEAF ? 9 : 30);
  }
  S.moving = moving;
  if (!moving && !S.b.down) return;
  // 2. 서로 부딪히기 (격자 이웃)
  head.fill(-1);
  for (let i = 0; i < n; i++) {
    if (!L[i]) continue;
    const cx = clampF(Math.floor(X[i] / CS), 0, GC - 1), cy = clampF(Math.floor(Y[i] / CS), 0, GR - 1), id = cy * GC + cx;
    nxt[i] = head[id];
    head[id] = i;
  }
  for (let i = 0; i < n; i++) {
    // 움직이는 것만 이웃을 찾는다 (둘 다 움직이면 번호가 작은 쪽이 맡는다)
    if (!L[i] || (!VX[i] && !VY[i])) continue;
    const cx = clampF(Math.floor(X[i] / CS), 0, GC - 1), cy = clampF(Math.floor(Y[i] / CS), 0, GR - 1);
    const ri = KR[K[i]], mi = 1 / KM[K[i]];
    for (let gy2 = cy - 1; gy2 <= cy + 1; gy2++) {
      if (gy2 < 0 || gy2 >= GR) continue;
      for (let gx2 = cx - 1; gx2 <= cx + 1; gx2++) {
        if (gx2 < 0 || gx2 >= GC) continue;
        for (let j = head[gy2 * GC + gx2]; j >= 0; j = nxt[j]) {
          if (j === i || (j < i && (VX[j] || VY[j]))) continue;
          const dx = X[j] - X[i], dy = Y[j] - Y[i], rr = ri + KR[K[j]], d2 = dx * dx + dy * dy;
          if (d2 >= rr * rr) continue;
          const d = Math.sqrt(d2) || 1e-6, nx = d2 ? dx / d : 1, ny = d2 ? dy / d : 0, ov = rr - d;
          const mj = 1 / KM[K[j]], sm = mi + mj;
          X[i] -= nx * ov * (mi / sm);
          Y[i] -= ny * ov * (mi / sm);
          X[j] += nx * ov * (mj / sm);
          Y[j] += ny * ov * (mj / sm);
          MV[j] = 1;
          const rv = (VX[j] - VX[i]) * nx + (VY[j] - VY[i]) * ny;
          if (rv < 0) {
            // 살짝 맞닿은 것은 튕기지 않는다 (비탈에 쌓인 더미가 떨지 않게)
            const imp = (-(1 + (rv > -0.0015 ? 0 : REST)) * rv) / sm;
            VX[i] -= imp * mi * nx;
            VY[i] -= imp * mi * ny;
            VX[j] += imp * mj * nx;
            VY[j] += imp * mj * ny;
          }
        }
      }
    }
  }
  // 3. 벽 · 발 · 고양이
  const segs = S.segs, OX = S.ox, OY = S.oy;
  for (let i = 0; i < n; i++) {
    if (!L[i] || (!VX[i] && !VY[i] && !MV[i])) continue;
    const r = KR[K[i]];
    if (X[i] < r) (X[i] = r), VX[i] < 0 && (VX[i] = VX[i] > -0.0015 ? 0 : -VX[i] * WALL_REST);
    else if (X[i] > W - r) (X[i] = W - r), VX[i] > 0 && (VX[i] = VX[i] < 0.0015 ? 0 : -VX[i] * WALL_REST);
    if (Y[i] < r) (Y[i] = r), VY[i] < 0 && (VY[i] = VY[i] > -0.0015 ? 0 : -VY[i] * WALL_REST);
    else if (Y[i] > H - r) (Y[i] = H - r), VY[i] > 0 && (VY[i] = VY[i] < 0.0015 ? 0 : -VY[i] * WALL_REST);
    for (let q = 0; q < segs.length; q++) {
      const g = segs[q];
      if (g.col === S.c[i]) continue;
      const ex = g.bx - g.ax, ey = g.by - g.ay, l2 = ex * ex + ey * ey;
      const uRaw = ((X[i] - g.ax) * ex + (Y[i] - g.ay) * ey) / l2;
      if (uRaw < -0.1 || uRaw > 1.1) continue;
      const u = clampF(uRaw, 0, 1), qx = g.ax + ex * u, qy = g.ay + ey * u;
      const sOld = (OX[i] - g.ax) * ey - (OY[i] - g.ay) * ex, sNew = (X[i] - g.ax) * ey - (Y[i] - g.ay) * ex;
      let dx = X[i] - qx, dy = Y[i] - qy, d = Math.hypot(dx, dy);
      const len = Math.sqrt(l2);
      if (uRaw >= 0 && uRaw <= 1 && sOld * sNew < 0) {
        // 지나가 버렸으면 원래 쪽으로 되돌린다
        const sg = sOld > 0 ? 1 : -1;
        (dx = (ey / len) * sg), (dy = (-ex / len) * sg), (d = 0);
        X[i] = qx + dx * (r + 0.001);
        Y[i] = qy + dy * (r + 0.001);
      } else if (d < r) {
        if (d < 1e-7) continue;
        (dx /= d), (dy /= d);
        X[i] = qx + dx * (r + 0.0005);
        Y[i] = qy + dy * (r + 0.0005);
      } else continue;
      const vn = VX[i] * dx + VY[i] * dy;
      if (vn < 0) (VX[i] -= (1 + WALL_REST) * vn * dx), (VY[i] -= (1 + WALL_REST) * vn * dy);
    }
    if (c && c.jump < 0) {
      const dx = X[i] - c.x, dy = Y[i] - c.y, rr = CAT_R + r, d2 = dx * dx + dy * dy;
      if (d2 < rr * rr) {
        const d = Math.sqrt(d2) || 1e-6, nx = dx / d, ny = dy / d;
        X[i] = c.x + nx * rr;
        Y[i] = c.y + ny * rr;
        const vn = VX[i] * nx + VY[i] * ny;
        if (vn < 0) {
          if (-vn > CAT_HIT) c.bumps++;
          VX[i] -= (1 + WALL_REST) * vn * nx;
          VY[i] -= (1 + WALL_REST) * vn * ny;
        }
      }
    }
  }
  if (c && c.jump < 0 && c.bumps >= CAT_BUMPS) wakeCat(S, E);
  // 4. 구멍에 쏙
  for (let h = 0; h < holes.length; h++) {
    const o = holes[h];
    if (o.shut) continue;
    const cr = o.r * CAPF, cr2 = cr * cr;
    for (let i = 0; i < n; i++) {
      if (!L[i] || (!VX[i] && !VY[i] && !MV[i])) continue;
      const dx = X[i] - o.x, dy = Y[i] - o.y;
      if (dx * dx + dy * dy >= cr2) continue;
      L[i] = 0;
      const ok = o.col === S.c[i];
      if (ok) S.good++;
      else (S.bad++), o.bad++;
      o.n++;
      E?.(ok ? 'in' : 'wrong', X[i], Y[i], i, h);
      if (o.cap && o.n >= o.cap) {
        o.shut = true;
        E?.('lid', o.x, o.y, -1, h);
        break;
      }
    }
  }
}

const calm = (S: Sim) => {
  if (S.b.down || (S.cat && S.cat.jump >= 0)) return false;
  const cm = CALM + Math.hypot(S.gx, S.gy) * 5, c2 = cm * cm;
  for (let i = 0; i < S.n; i++) if (S.live[i] && S.vx[i] * S.vx[i] + S.vy[i] * S.vy[i] > c2) return false;
  return true;
};

// 같은 모양 객체로만 만든다 (모양이 섞이면 물리 고리가 느려진다)
const copyHole = (h: Hole): Hole => ({ x: h.x, y: h.y, r: h.r, col: h.col, cap: h.cap, n: h.n, shut: h.shut, bad: h.bad, popT: h.popT, cn: h.cn, ct: h.ct, wn: h.wn, wt: h.wt });
const copyCat = (c: Cat): Cat => ({ x: c.x, y: c.y, spots: c.spots, si: c.si, jump: c.jump, fx: c.fx, fy: c.fy, bumps: c.bumps, woke: c.woke });
const copyBroom = (b: Broom): Broom => ({ down: b.down, x: b.x, y: b.y, tx: b.tx, ty: b.ty, dx: b.dx, dy: b.dy, has: b.has, len: b.len, tired: b.tired, spd: b.spd, counted: b.counted });
function cloneSim(S: Sim): Sim {
  return {
    t: S.t, n: S.n,
    x: S.x.slice(), y: S.y.slice(), vx: S.vx.slice(), vy: S.vy.slice(), ox: S.ox.slice(), oy: S.oy.slice(), ang: S.ang.slice(),
    k: S.k, c: S.c, live: S.live.slice(), hit: S.hit.slice(), mv: S.mv.slice(),
    holes: S.holes.map(copyHole), segs: S.segs, puds: S.puds, gx: S.gx, gy: S.gy,
    cat: S.cat ? copyCat(S.cat) : null, b: copyBroom(S.b),
    good: S.good, bad: S.bad, pushed: S.pushed, moving: S.moving,
  };
}

/** 판 하나 차리기: 더미마다 물건을 흩뿌리고(구멍 둘레는 비워 둔다) 살짝 풀어 겹침을 없앤다 */
function newStage(s: SweepState) {
  const d = STAGES[s.stage], fl = s.flip[s.stage], rng = s.rng;
  const fx = (x: number) => (fl ? W - x : x);
  s.holes = d.holes.map(([x, y, r, col, cap]) => copyHole({ x: fx(x), y, r, col, cap, n: 0, shut: false, bad: 0, popT: -99, cn: 0, ct: -99, wn: 0, wt: -99 }));
  s.segs = (d.segs ?? []).map(([ax, ay, bx, by, col]) => ({ ax: fx(ax), ay, bx: fx(bx), by, col }));
  s.puds = (d.puds ?? []).map(([x, y, rx, ry]) => ({ x: fx(x), y, rx, ry }));
  s.gx = d.slope ? (fl ? -d.slope[0] : d.slope[0]) : 0;
  s.gy = d.slope ? d.slope[1] : 0;
  s.cat = d.cat ? copyCat({ x: fx(d.cat[0][0]), y: d.cat[0][1], spots: d.cat.map(([x, y]) => [fx(x), y]), si: 0, jump: -1, fx: 0, fy: 0, bumps: 0, woke: 0 }) : null;
  const xs: number[] = [], ys: number[] = [], ks: number[] = [], cs: number[] = [];
  const PG = 0.05, pgw = Math.ceil(W / PG) + 1, pgrid = new Map<number, number[]>();
  const pcell = (x: number, y: number) => Math.floor(clampF(y, 0, H) / PG) * pgw + Math.floor(clampF(x, 0, W) / PG);
  const ok = (x: number, y: number, r: number) => {
    if (x < r || x > W - r || y < r || y > H - r) return false;
    for (const h of s.holes) if (Math.hypot(x - h.x, y - h.y) < h.r + RIM + r + 0.02) return false;
    if (s.cat && Math.hypot(x - s.cat.x, y - s.cat.y) < CAT_R + r + 0.03) return false;
    for (const g of s.segs) {
      const ex = g.bx - g.ax, ey = g.by - g.ay, l2 = ex * ex + ey * ey, u = clampF(((x - g.ax) * ex + (y - g.ay) * ey) / l2, 0, 1);
      if (Math.hypot(x - g.ax - ex * u, y - g.ay - ey * u) < r + 0.01) return false;
    }
    // 발 안쪽 주머니는 비워 둔다
    if (s.segs.length && y < 0.46) return false;
    return true;
  };
  for (const p of d.piles) {
    const tot = p.cols.reduce((a, b) => a + b, 0);
    for (let q = 0; q < p.n; q++) {
      // 색: 비율대로 차례 섞기 (결정적)
      let pick = rng() * tot, col = 0;
      for (; col < p.cols.length - 1 && pick >= p.cols[col]; col++) pick -= p.cols[col];
      const r = KR[p.k];
      let x = 0, y = 0;
      for (let tr = 0; tr < 40; tr++) {
        const a = rng() * Math.PI * 2, rad = Math.sqrt(rng());
        x = fx(p.x) + Math.cos(a) * rad * p.rx;
        y = p.y + Math.sin(a) * rad * p.ry;
        if (!ok(x, y, r)) continue;
        let clash = false;
        const cx0 = Math.floor(clampF(x, 0, W) / PG), cy0 = Math.floor(clampF(y, 0, H) / PG);
        for (let gy = cy0 - 1; gy <= cy0 + 1 && !clash; gy++)
          for (let gx = cx0 - 1; gx <= cx0 + 1 && !clash; gx++)
            for (const j of pgrid.get(gy * pgw + gx) ?? []) if (Math.hypot(xs[j] - x, ys[j] - y) < r + KR[ks[j]] - 0.004) (clash = true);
        if (!clash) break;
      }
      if (!ok(x, y, r)) continue;
      const pc = pcell(x, y);
      if (!pgrid.has(pc)) pgrid.set(pc, []);
      pgrid.get(pc)!.push(xs.length);
      xs.push(x), ys.push(y), ks.push(p.k), cs.push(col);
    }
  }
  const n = xs.length;
  s.n = n;
  s.x = Float64Array.from(xs);
  s.y = Float64Array.from(ys);
  s.vx = new Float64Array(n);
  s.vy = new Float64Array(n);
  s.ox = new Float64Array(n);
  s.oy = new Float64Array(n);
  s.ang = Float64Array.from(xs.map(() => rng() * Math.PI * 2));
  s.k = Uint8Array.from(ks);
  s.c = Int8Array.from(cs);
  s.live = new Uint8Array(n).fill(1);
  s.hit = new Uint8Array(n);
  s.mv = new Uint8Array(n);
  s.total = n;
  s.good = 0;
  s.bad = 0;
  s.pushed = 0;
  s.b = copyBroom({ down: false, x: 0.5, y: H * 0.86, tx: 0.5, ty: H * 0.86, dx: 0, dy: -1, has: false, len: 0, tired: false, spd: 0, counted: false });
  s.left = d.sweeps;
  s.used = 0;
  s.phase = 'play';
  s.pt = 0;
  s.fastOk = false;
  s.starOk = d.stars.map(() => false);
  s.strokeEnd = s.t;
  s.falls = [];
  s.recent = [];
  s.surged = false;
  if (d.key) s.seen.add(d.key);
}

const net = (S: Sim) => S.good - S.bad;
function starNow(s: SweepState, st: Star): boolean {
  switch (st.k) {
    case 'count': case 'more': return net(s) >= st.n;
    case 'clean': return s.bad <= st.n;
    case 'cat': return !s.cat || s.cat.woke === 0;
    case 'fast': return s.fastOk;
    case 'lids': return s.holes.every((h) => h.shut || !h.cap);
  }
}
export function starText(st: Star, k = MARBLE): string {
  const nm = KNAME[k];
  switch (st.k) {
    case 'count': return `${nm} ${st.n}개 넣기`;
    case 'more': return `${st.n}개 넘게 넣기`;
    case 'clean': return st.n ? `다른 색은 ${st.n}개까지만` : '색 안 섞기';
    case 'cat': return '고양이 안 깨우기';
    case 'fast': return `${['', '한', '두', '세', '네'][st.m]} 번 만에 ${st.n}개`;
    case 'lids': return '바구니 다 채우기';
  }
}

function endStage(s: SweepState, ok: boolean, why: string) {
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  s.why = why;
  const d = STAGES[s.stage];
  if (ok) {
    s.starOk = d.stars.map((st) => starNow(s, st));
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    s.pts += s.got * STAR_PTS + Math.max(0, net(s)) * NET_PTS + s.left * LEFT_PTS;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    ev(s, 'clear', 0.5, 0.7, s.won ? '대청소 끝! ✨' : '깨끗!');
  } else {
    s.hearts--;
    s.tries++;
    ev(s, 'fail', 0.5, 0.7, why);
  }
}

function emitter(s: SweepState): Emit {
  return (kind, x, y, i, extra) => {
    if (kind === 'in' || kind === 'wrong') {
      const h = s.holes[extra!];
      s.falls.push({ x, y, hx: h.x, hy: h.y, k: s.k[i], c: s.c[i], t: s.t, ok: kind === 'in', a: s.ang[i] });
      if (s.falls.length > 90) s.falls.shift();
      if (kind === 'in') {
        s.recent.push(s.t);
        h.popT = s.t;
        // 구멍마다 이어 들어간 수 (화면에 '퐁 ×N'으로 커진다)
        if (s.t - h.ct > COMBO_T) h.cn = 0;
        h.cn++;
        h.ct = s.t;
        while (s.recent.length && s.t - s.recent[0] > COMBO_T) s.recent.shift();
        if (s.recent.length === COMBO_N) {
          s.wowN++;
          ev(s, 'combo', h.x, h.y, undefined, COMBO_N);
          s.mood = 3;
          s.moodT = 70;
          s.dogMood = 1;
          s.dogT = 60;
        } else if (s.recent.length === 20 || s.recent.length === 40) ev(s, 'combo', h.x, h.y, undefined, s.recent.length);
        else ev(s, 'in', h.x, h.y, undefined, undefined, s.c[i]);
      } else {
        if (s.t - h.wt > COMBO_T) h.wn = 0;
        h.wn++;
        h.wt = s.t;
        ev(s, 'wrong', h.x, h.y, '앗!', undefined, s.c[i]);
        see(s, 'wrongseen', '😵 다른 색 구멍에 들면 −1이에요');
        s.mood = 4;
        s.moodT = 60;
        s.dogMood = 2;
        s.dogT = 60;
      }
    } else if (kind === 'lid') {
      ev(s, 'lid', x, y, '꽉!');
    } else if (kind === 'cat') {
      ev(s, 'cat', x, y, '냐아앙!');
      s.mood = 5;
      s.moodT = 70;
      s.dogMood = 2;
      s.dogT = 70;
    } else if (kind === 'catland') ev(s, 'catland', x, y, 'Zzz…');
  };
}

/** 손가락(화면 0~1 · 0~1) → 바닥 좌표. 바닥 밖은 가장자리로 붙인다 */
function pointerFloor(p: { x: number; y: number }) {
  const q = toFloor(p.x, p.y * A);
  return { x: clampF(q.x, -0.02, W + 0.02), y: clampF(q.y, -0.02, H + 0.02) };
}

function handlePointer(s: SweepState, p: { x: number; y: number } | null) {
  const b = s.b;
  if (p && s.phase === 'play') {
    const f = pointerFloor(p);
    if (!s.down) {
      s.down = true;
      if (s.left <= 0) return void ev(s, 'nope', f.x, f.y, '쓸기를 다 썼어요');
      if (s.firstTouch < 0) s.firstTouch = s.t;
      b.down = true;
      b.x = b.tx = f.x;
      b.y = b.ty = f.y;
      b.has = false;
      b.len = 0;
      b.tired = false;
      b.counted = false;
      b.spd = 0;
      s.hit.fill(0);
      s.pushed = 0;
      s.surged = false;
      s.trail = [];
      if (s.cat) s.cat.bumps = 0; // 고양이는 한 번 쓸 때 세게 여러 번 맞아야 깬다
      ev(s, 'land', f.x, f.y, '쓱!');
      return;
    }
    if (!b.down) return;
    b.tx = f.x;
    b.ty = f.y;
    return;
  }
  if (!p && s.down) {
    s.down = false;
    if (b.down) {
      b.down = false;
      s.strokeEnd = s.t;
      if (!b.counted) ev(s, 'cancel', b.x, b.y);
    }
  }
}

export const sweepup: GameDef<SweepState> & { wows(s: SweepState): number } = {
  id: 'sweepup',
  name: '🧹 빗자루 한 번 쓸기',
  genes: ['sweep', 'pointer'],
  twist: '빗자루가 손가락이 지나간 길을 그대로 따라가며 수백 개의 구슬을 진짜 물리로 한꺼번에 밀어서, 쓱 한 번에 구멍으로 퐁퐁퐁 수십 개가 쏟아진다 — 어디서 어느 길로 쓸지가 섞임과 개수를 정한다',
  rules: [
    '쓱 한 번 긋기 = 빗자루 한 번 쓸기. 지나간 길의 물건이 우르르 밀려요.',
    '같은 색 구멍에 들면 +1, 다른 색이면 −1. 쓸기 횟수 안에 목표만큼!',
  ],
  controls: 'touch',
  hint: '쓱 한 번 긋기 = 빗자루 쓸기 / 화살표로 옮기고 스페이스를 누른 채 화살표',
  aspect: A,
  art: {
    concept: '할머니 집 대청소 — 마루·부엌·마당에 쏟아진 구슬과 사탕과 낙엽',
    mood: '햇살이 드는 꿀색 나무 마루에 반짝이는 유리구슬이 가득, 체크무늬 부엌엔 알록달록 사탕, 가을 마당엔 단풍잎과 도토리. 눈 달린 짚 빗자루가 힘주어 쓱 — 구경하던 강아지가 꼬리를 흔든다.',
    palette: { bg: '#f6e7cf', ink: '#3b2a1a', muted: '#a08a70', accent: '#ffb84d', hot: '#ff6b5a', soft: '#fff4e0' },
  },
  reveals: (s) => s.seen.size,
  guard: (s) => s.total - s.bad,
  cleared: (s) => (s.phase === 'result' && s.ok ? { stage: s.stage, got: s.got, of: s.starOk.length } : null),
  wows: (s) => s.wowN,
  create(seed) {
    const rng = mulberry32(seed);
    const flip = STAGES.map(() => rng() < 0.5);
    const s = {
      rng, seed, t: 0, n: 0, stage: 0, phase: 'play', pt: 0, flip,
      left: 0, used: 0, hearts: 3, stars: 0, got: 0, starOk: [], pts: 0, ok: false, why: '', dead: false, won: false, again: false, tries: 0,
      down: false, firstTouch: -1, strokeEnd: 0, fastOk: false, seen: new Set<string>(), newsQ: [], news: null,
      events: [], falls: [], wowN: 0, recent: [], surged: false, total: 0, mood: 0, moodT: 0, dogT: 0, dogMood: 0, trail: [],
    } as unknown as SweepState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    s.events = s.events.filter((e) => s.t - e.t < 120);
    handlePointer(s, inp.pointer ?? null);
    const b = s.b, E = emitter(s);
    phys(s, E);
    // 한 획으로 치기 · 너무 길면 빗자루가 지쳐서 들린다
    if (b.down && !b.counted && b.len >= MINLEN) {
      b.counted = true;
      s.left--;
      s.used++;
      see(s, 'sweep', '');
    }
    if (b.down && !b.tired && b.len >= LMAX) (b.tired = true), ev(s, 'tired', b.x, b.y, '휴~ 한 번 끝!');
    if (b.down && b.counted && !s.surged && s.pushed >= SURGE_N) {
      s.surged = true;
      s.wowN++;
      ev(s, 'surge', b.x + b.dx * 0.08, b.y + b.dy * 0.08, '와르르!', s.pushed);
    }
    if (b.down && b.counted && !b.tired && b.spd > 0.002) {
      s.mood = 1;
      s.moodT = 8;
      s.trail.push(b.x, b.y);
      if (s.trail.length > 80) s.trail.splice(0, 2);
    }
    if (s.moodT > 0 && --s.moodT === 0) s.mood = 0;
    if (s.dogT > 0 && --s.dogT === 0) s.dogMood = 0;
    const d = STAGES[s.stage];
    for (const st of d.stars) if (st.k === 'fast' && !s.fastOk && s.used <= st.m && net(s) >= st.n) s.fastOk = true;
    if (!s.news || s.t - s.news.t > NEWS_T) s.news = s.newsQ.length ? { text: s.newsQ.shift()!, t: s.t } : s.news;
    s.pt++;
    if (s.phase === 'result') {
      if (s.pt >= RESULT) {
        if (s.ok) {
          if (s.won) s.dead = true;
          else (s.again = false), s.stage++, newStage(s);
        } else if (s.hearts <= 0) s.dead = true;
        else (s.again = true), newStage(s);
      }
      return;
    }
    if (b.down) return;
    const goal = (d.stars[0] as { n: number }).n;
    const settled = calm(s) || s.t - s.strokeEnd > 420;
    if (!settled || s.t - s.strokeEnd < 20) return;
    const alive = s.live.some((v, i) => v && s.holes.some((h) => !h.shut && h.col === s.c[i]));
    if (s.left <= 0 || !alive) {
      if (net(s) >= goal) endStage(s, true, '');
      else endStage(s, false, s.left <= 0 ? `${goal - net(s)}개 모자라요` : '더 넣을 게 없어요');
    }
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
type Path = { pts: number[]; len: number; speed: number };
function mkPath(pts: number[], speed: number): Path {
  let len = 0;
  for (let k = 2; k < pts.length; k += 2) len += Math.hypot(pts[k] - pts[k - 2], pts[k + 1] - pts[k - 1]);
  return { pts, len, speed };
}
function pathAt(p: Path, dist: number) {
  let left = Math.max(0, dist);
  for (let k = 2; k < p.pts.length; k += 2) {
    const ax = p.pts[k - 2], ay = p.pts[k - 1], bx = p.pts[k], by = p.pts[k + 1], l = Math.hypot(bx - ax, by - ay);
    if (left <= l || k === p.pts.length - 2) {
      const u = l > 0 ? Math.min(1, left / l) : 1;
      return { x: ax + (bx - ax) * u, y: ay + (by - ay) * u };
    }
    left -= l;
  }
  return { x: p.pts[0], y: p.pts[1] };
}
const toScreen = (x: number, y: number) => ({ x: PX(x, y), y: PY(y) / A });
const NO: Input = { tap: false, dir: 0, pointer: null };

function nearlyCalm(S: Sim) {
  const c2 = 0.0025 * 0.0025;
  for (let i = 0; i < S.n; i++) if (S.live[i] && S.vx[i] * S.vx[i] + S.vy[i] * S.vy[i] > c2) return false;
  return true;
}
/** 봇이 그은 획을 같은 물리로 미리 돌려 본다 (REACT틱마다 손가락이 움직이는 것까지 똑같이) */
function simStroke(S: Sim, p: Path, settle: number): Sim {
  const b = S.b;
  const st = pathAt(p, 0);
  b.down = true;
  b.x = b.tx = st.x;
  b.y = b.ty = st.y;
  b.has = false;
  b.len = 0;
  b.tired = false;
  if (S.cat) S.cat.bumps = 0;
  const dur = Math.ceil(p.len / p.speed / REACT) * REACT + REACT;
  for (let tt = 0; tt < dur; tt++) {
    if (tt % REACT === 0) {
      const q = pathAt(p, tt * p.speed);
      b.tx = q.x;
      b.ty = q.y;
    }
    phys(S, null);
    if (!b.tired && b.len >= LMAX) b.tired = true;
  }
  b.down = false;
  // 봇용으로 가볍게: 거의 멈추면(남은 건 값 매기기가 거리로 본다) 거기서 끊는다
  for (let tt = 0; tt < settle; tt++) {
    phys(S, null);
    if (tt % 6 === 5 && nearlyCalm(S)) break;
  }
  return S;
}

function holeFor(S: Sim, col: number) {
  return S.holes.filter((h) => !h.shut && h.col === col);
}
/** 내다본 판의 값: 넣은 수 · 섞인 수 · 별 조건 · 남은 것이 맞는 구멍에 얼마나 가까운가 */
/** 봇용으로 입자 수를 줄인 판: 획이 지나갈 길 둘레의 것만 (먼 것은 이 획으로 안 바뀌니 모든 후보에서 똑같다) */
function corridor(S: Sim, p: Path): Sim {
  const keep: number[] = [], reach = BL + 0.22;
  for (let i = 0; i < S.n; i++) {
    if (!S.live[i]) continue;
    for (let k = 2; k < p.pts.length; k += 2) {
      const ax = p.pts[k - 2], ay = p.pts[k - 1], ex = p.pts[k] - ax, ey = p.pts[k + 1] - ay, l2 = ex * ex + ey * ey || 1e-9;
      const u = clampF(((S.x[i] - ax) * ex + (S.y[i] - ay) * ey) / l2, 0, 1.25);
      if (Math.hypot(S.x[i] - ax - ex * u, S.y[i] - ay - ey * u) < reach) {
        keep.push(i);
        break;
      }
    }
  }
  const m = keep.length;
  const f = (a: Float64Array) => Float64Array.from(keep, (i) => a[i]);
  const C = cloneSim({ ...S, n: 0, x: f(S.x), y: f(S.y), vx: f(S.vx), vy: f(S.vy), ox: f(S.ox), oy: f(S.oy), ang: f(S.ang), k: Uint8Array.from(keep, (i) => S.k[i]), c: Int8Array.from(keep, (i) => S.c[i]), live: new Uint8Array(m).fill(1), hit: new Uint8Array(m), mv: new Uint8Array(m) });
  C.n = m;
  return C;
}
/** 남은 것이 맞는 구멍에 얼마나 가깝고, 틀린 구멍에 얼마나 아슬아슬한가 */
function potential(S: Sim) {
  let v = 0;
  for (let i = 0; i < S.n; i++) {
    if (!S.live[i]) continue;
    let best = 9, worst = 9;
    for (const h of S.holes) {
      if (h.shut) continue;
      const dd = Math.hypot(S.x[i] - h.x, S.y[i] - h.y) - h.r;
      if (h.col === S.c[i]) best = Math.min(best, dd);
      else worst = Math.min(worst, dd);
    }
    if (best < 9) v += 3.2 * Math.max(0, 1 - best / 0.7);
    // 발이 막아 주는 판에선 다른 색 구멍 옆이어도 위험하지 않다
    if (worst < 0.25 && !S.segs.length) v -= 4 * (1 - worst / 0.25);
  }
  return v;
}
function value(s: SweepState, S: Sim, plies: number): number {
  const d = STAGES[s.stage];
  let v = S.good * 10 - S.bad * 16;
  for (const st of d.stars) {
    if (st.k === 'clean' && S.bad > st.n) v -= 260 + (S.bad - st.n) * 12;
    if (st.k === 'cat' && S.cat && S.cat.woke > 0) v -= 420;
    if (st.k === 'fast' && s.used + plies <= st.m && S.good - S.bad >= st.n) v += 160;
    if (st.k === 'lids') v += S.holes.filter((h) => h.shut).length * 40;
  }
  const goal = (d.stars[0] as { n: number }).n;
  if (S.good - S.bad >= goal) v += 120;
  return v;
}

/** 무리 찾기: 색마다 성긴 칸에 세어 많은 칸 몇 개 */
function clusters(S: Sim, col: number, top: number) {
  const G = 0.16, nx = Math.ceil(W / G), ny = Math.ceil(H / G), cnt = new Float64Array(nx * ny), sx = new Float64Array(nx * ny), sy = new Float64Array(nx * ny);
  for (let i = 0; i < S.n; i++) {
    if (!S.live[i] || S.c[i] !== col) continue;
    const id = clampF(Math.floor(S.y[i] / G), 0, ny - 1) * nx + clampF(Math.floor(S.x[i] / G), 0, nx - 1);
    cnt[id]++;
    sx[id] += S.x[i];
    sy[id] += S.y[i];
  }
  const out: { x: number; y: number; n: number }[] = [];
  for (let id = 0; id < cnt.length; id++) if (cnt[id] >= 1) out.push({ x: sx[id] / cnt[id], y: sy[id] / cnt[id], n: cnt[id] });
  out.sort((a, b) => b.n - a.n);
  return out.slice(0, top);
}

/** 길 따라 빗자루 폭 안에 든 물건을 세어 대강 점수 (맞는 색 +, 다른 색 −, 고양이 근처 −) */
function roughScore(S: Sim, p: Path, col: number) {
  let good = 0, bad = 0;
  for (let i = 0; i < S.n; i++) {
    if (!S.live[i]) continue;
    let near = false;
    for (let k = 2; k < p.pts.length && !near; k += 2) {
      const ax = p.pts[k - 2], ay = p.pts[k - 1], ex = p.pts[k] - ax, ey = p.pts[k + 1] - ay, l2 = ex * ex + ey * ey || 1e-9;
      const u = clampF(((S.x[i] - ax) * ex + (S.y[i] - ay) * ey) / l2, 0, 1);
      if (Math.hypot(S.x[i] - ax - ex * u, S.y[i] - ay - ey * u) < BL) near = true;
    }
    if (near) S.c[i] === col ? good++ : bad++;
  }
  let pen = 0;
  if (S.cat && S.cat.jump < 0)
    for (let k = 2; k < p.pts.length; k += 2) {
      const ax = p.pts[k - 2], ay = p.pts[k - 1], ex = p.pts[k] - ax, ey = p.pts[k + 1] - ay, l2 = ex * ex + ey * ey || 1e-9;
      const u = clampF(((S.cat.x - ax) * ex + (S.cat.y - ay) * ey) / l2, 0, 1);
      if (Math.hypot(S.cat.x - ax - ex * u, S.cat.y - ay - ey * u) < CAT_R + BL + 0.03) pen += 40;
    }
  return good - bad * (S.segs.length ? 0.2 : 1.6) - pen;
}

const SPEED = 0.034;
function candidates(s: SweepState): { p: Path; col: number }[] {
  const out: { p: Path; col: number }[] = [];
  const cols = [...new Set(s.holes.filter((h) => !h.shut).map((h) => h.col))];
  const clip = (v: number[]) => v.map((q, k) => (k % 2 ? clampF(q, 0.02, H - 0.02) : clampF(q, 0.02, W - 0.02)));
  // 발이 있는 판: 발 앞 줄을 곧장 위로 · 발 앞을 따라 옆으로 갔다가 위로
  if (s.segs.length)
    for (const h of s.holes) {
      if (h.shut) continue;
      for (const off of [-0.13, 0, 0.13]) out.push({ p: mkPath(clip([h.x + off, 1.3, h.x + off, h.y]), SPEED), col: h.col });
      out.push({ p: mkPath(clip([W - h.x, 0.53, h.x, 0.53, h.x, h.y]), SPEED), col: h.col });
    }
  for (const col of cols) {
    const hs = holeFor(s, col);
    for (const c of clusters(s, col, 3)) {
      for (const h of hs) {
        const dx = h.x - c.x, dy = h.y - c.y, dl = Math.hypot(dx, dy) || 1e-6, ux = dx / dl, uy = dy / dl, nx = -uy, ny = ux;
        if (dl > 1.35) continue;
        const back = 0.13;
        for (const off of [0, 0.075, -0.075]) {
          const sx = c.x - ux * back + nx * off, sy = c.y - uy * back + ny * off;
          out.push({ p: mkPath(clip([sx, sy, h.x + ux * 0.02, h.y + uy * 0.02]), SPEED), col });
        }
        for (const side of [1, -1]) {
          const sx = c.x - ux * back, sy = c.y - uy * back, mx = (c.x + h.x) / 2 + nx * side * 0.2, my = (c.y + h.y) / 2 + ny * side * 0.2;
          out.push({ p: mkPath(clip([sx, sy, c.x + nx * side * 0.06, c.y + ny * side * 0.06, mx, my, h.x, h.y]), SPEED), col });
        }
        // 발 안의 구멍은 발 앞에서 곧장 들어간다
        if (s.segs.length) {
          const fy = 0.56;
          for (const off of [0, 0.08, -0.08]) out.push({ p: mkPath(clip([c.x - ux * back + nx * off, c.y - uy * back + ny * off, h.x + (c.x - h.x) * 0.3, fy, h.x, h.y]), SPEED), col });
          // 발 쪽으로 곧장 위로
          out.push({ p: mkPath(clip([c.x, c.y + 0.14, c.x, h.y]), SPEED), col });
        }
        // 잠자는 고양이가 길에 있으면 옆으로 돌아가는 길
        const ct = s.cat;
        if (ct && ct.jump < 0) {
          const u = clampF(((ct.x - c.x) * ux + (ct.y - c.y) * uy) / dl, 0, 1), qx = c.x + dx * u, qy = c.y + dy * u;
          if (Math.hypot(ct.x - qx, ct.y - qy) < CAT_R + BL + 0.06)
            for (const side of [1, -1]) {
              const wx = ct.x + nx * side * (CAT_R + BL + 0.08), wy = ct.y + ny * side * (CAT_R + BL + 0.08);
              out.push({ p: mkPath(clip([c.x - ux * back, c.y - uy * back, wx, wy, h.x, h.y]), SPEED), col });
              out.push({ p: mkPath(clip([c.x - ux * back + nx * side * 0.07, c.y - uy * back + ny * side * 0.07, wx, wy, h.x, h.y]), SPEED), col });
            }
        }
      }
    }
  }
  return out;
}

function plan(s: SweepState): Path | null {
  const cs = candidates(s);
  if (!cs.length) return null;
  const ranked = cs.map((c) => ({ ...c, r: roughScore(s, c.p, c.col) })).sort((a, b) => b.r - a.r).slice(0, 5);
  let best: Path | null = null, bv = -1e9;
  for (const c of ranked) {
    const S = corridor(s, c.p), p0 = potential(S);
    simStroke(S, c.p, s.cat ? 50 : 28);
    const v = value(s, S, 1) + potential(S) - p0;
    if (v > bv) (bv = v), (best = c.p);
  }
  return best;
}

interface Drive { key: string; p: Path | null; t0: number; done: boolean; end: boolean; n: number }
function drive(m: Drive, s: SweepState): Input {
  if (!m.p || m.done) return NO;
  const tt = s.t - m.t0;
  // 끝점은 꼭 한 번 보내고 뗀다 (느린 손이라도 획이 끝까지 그어지게)
  if (tt * m.p.speed >= m.p.len) {
    if (m.end) return (m.done = true), NO;
    m.end = true;
  }
  const q = pathAt(m.p, Math.min(m.p.len, tt * m.p.speed));
  return { tap: false, dir: 0, pointer: toScreen(q.x, q.y) };
}
const ready = (s: SweepState) => s.phase === 'play' && s.left > 0 && !s.down && s.t - s.strokeEnd > 12 && (calm(s) || s.t - s.strokeEnd > 200);

function strokeBot(name: string, pick: (s: SweepState, rng: Rng) => Path | null): Bot<SweepState> {
  const mem = new WeakMap<object, Drive>();
  return {
    name,
    act(s, rng) {
      let m = mem.get(s);
      if (m && !m.done) {
        if (s.phase !== 'play') m.done = true;
        else return drive(m, s);
      }
      if (!ready(s)) return NO;
      const key = `${s.stage}:${s.tries}:${s.used}`;
      // 같은 쓸기를 계속 계획하지 않는다 (짧아서 안 쳐진 획은 두 번까지만 다시)
      if (m && m.key === key && (m.n >= 2 || !m.p)) return NO;
      const p = pick(s, rng);
      mem.set(s, (m = { key, p, t0: s.t, done: !p, end: false, n: m && m.key === key ? m.n + 1 : 0 }));
      return drive(m, s);
    },
  };
}

/** 봇: 후보 획(무리 뒤에서 맞는 구멍으로 곧게·옆으로·돌아서)을 같은 물리로 돌려 보고 가장 좋은 획 */
export const sweepupSmart: Bot<SweepState> = strokeBot('쓸기 박사', (s) => plan(s));

/** 버릇 봇: 늘 가장 많이 모인 곳에서 가장 가까운 구멍 쪽으로 곧장 긋는다 (색은 안 본다) */
export const sweepupHabit: Bot<SweepState> = strokeBot('늘 가까운 구멍으로 곧장', (s) => {
  let best: { x: number; y: number; n: number } | null = null;
  for (let col = 0; col < 4; col++) for (const c of clusters(s, col, 1)) if (!best || c.n > best.n) best = c;
  if (!best) return null;
  let hb: Hole | null = null, hd = 9;
  for (const h of s.holes) if (!h.shut && Math.hypot(h.x - best.x, h.y - best.y) < hd) (hd = Math.hypot(h.x - best.x, h.y - best.y)), (hb = h);
  if (!hb) return null;
  const ux = (hb.x - best.x) / (hd || 1), uy = (hb.y - best.y) / (hd || 1);
  return mkPath([clampF(best.x - ux * 0.13, 0.02, W - 0.02), clampF(best.y - uy * 0.13, 0.02, H - 0.02), hb.x, hb.y], SPEED);
});

/** 독립 버릇 봇: 늘 바닥 가운데를 가로로 쓱 (번갈아 왼쪽→오른쪽, 오른쪽→왼쪽) */
export const sweepupHabit2: Bot<SweepState> = strokeBot('늘 가운데를 가로로', (s) => {
  const y = H * 0.5, lr = s.used % 2 === 0;
  return mkPath(lr ? [0.04, y, 0.96, y] : [0.96, y, 0.04, y], SPEED);
});

/** 봇: 아무 데서나 아무 쪽으로 아무렇게나 쓱 (멈추길 기다리지도 않는다) */
const dumbMem = new WeakMap<object, { next: number; p: Path | null; t0: number }>();
export const sweepupRandom: Bot<SweepState> = {
  name: '아무렇게나 쓱',
  act(s, rng) {
    let m = dumbMem.get(s);
    if (!m) dumbMem.set(s, (m = { next: s.t + 20 + Math.floor(rng() * 60), p: null, t0: 0 }));
    if (m.p) {
      const tt = s.t - m.t0;
      if (tt * m.p.speed <= m.p.len) {
        const q = pathAt(m.p, tt * m.p.speed);
        return { tap: false, dir: 0, pointer: toScreen(q.x, q.y) };
      }
      m.p = null;
      m.next = s.t + 20 + Math.floor(rng() * 90);
      return NO;
    }
    if (s.t < m.next || s.phase !== 'play') return NO;
    const x = 0.05 + rng() * 0.9, y = 0.05 + rng() * (H - 0.1), a = rng() * Math.PI * 2, l = 0.3 + rng() * 0.7;
    const ex = clampF(x + Math.cos(a) * l, 0.02, W - 0.02), ey = clampF(y + Math.sin(a) * l, 0.02, H - 0.02);
    m.p = mkPath([x, y, ex, ey], 0.018 + rng() * 0.03);
    m.t0 = s.t;
    return { tap: false, dir: 0, pointer: toScreen(x, y) };
  },
};


// ───────────────────────────── 그리기 ─────────────────────────────
type C2 = CanvasRenderingContext2D;
const TAU = Math.PI * 2;
const hsh = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
/** 색 번호별 [밝은, 기본, 어두운] — 구슬 */
const MCOL = [
  ['#ffd0c8', '#ff4f4a', '#b8231f'],
  ['#cfeaff', '#3b9cf5', '#1a58a8'],
  ['#fff3b0', '#ffcc2a', '#c48600'],
  ['#f0c79a', '#b0703a', '#6e4220'],
];
const CCOL = [
  ['#ffd6e2', '#ff5a8c', '#bd2a5b'],
  ['#c9f3ff', '#2fb6ef', '#16749f'],
  MCOL[2],
  MCOL[3],
];
const LCOL = [
  ['#ffc49e', '#f2582c', '#a3341a'],
  MCOL[1],
  ['#fff2a0', '#f6c21a', '#b78400'],
  ['#f0c79a', '#b0703a', '#6e4220'],
];
const pal = (k: number, c: number) => (k === CANDY ? CCOL[c] : k === LEAF || k === ACORN ? LCOL[c] : MCOL[c]);
const PLACE = ['마루', '부엌', '마당'];
const stageKind = (st: StageDef, col: number) => st.piles.find((p) => (p.cols[col] ?? 0) > 0)?.k ?? st.piles[0].k;
function noun(st: StageDef) {
  const ks = new Set(st.piles.map((p) => p.k));
  return ks.size === 1 ? KNAME[st.piles[0].k] + ' ' : '';
}
function starLabel(st: StageDef, x: Star) {
  if (x.k === 'count') return `${noun(st)}${x.n}개 넣기`;
  return starText(x);
}

const SPR = new Map<string, HTMLCanvasElement>();
/** 물건 그림 (색·크기마다 한 번 그려 두고 찍는다) */
function sprite(k: number, c: number, rpx: number): HTMLCanvasElement {
  const key = `${k}:${c}:${rpx}`;
  let cv = SPR.get(key);
  if (cv) return cv;
  cv = document.createElement('canvas');
  const size = Math.ceil(rpx * 3.2) + 2;
  cv.width = cv.height = size;
  const g = cv.getContext('2d')!;
  g.translate(size / 2, size / 2);
  const r = rpx, p = pal(k, c);
  if (k === MARBLE) {
    const gr = g.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.08, 0, 0, r);
    gr.addColorStop(0, p[0]);
    gr.addColorStop(0.45, p[1]);
    gr.addColorStop(1, p[2]);
    g.fillStyle = gr;
    g.beginPath();
    g.arc(0, 0, r, 0, TAU);
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,.5)';
    g.lineWidth = r * 0.22;
    g.beginPath();
    g.arc(r * 0.05, r * 0.05, r * 0.55, 0.3, 1.9);
    g.stroke();
    g.fillStyle = 'rgba(255,255,255,.95)';
    g.beginPath();
    g.ellipse(-r * 0.36, -r * 0.4, r * 0.28, r * 0.17, -0.6, 0, TAU);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,.55)';
    g.beginPath();
    g.arc(r * 0.42, r * 0.38, r * 0.1, 0, TAU);
    g.fill();
    g.strokeStyle = 'rgba(60,20,0,.25)';
    g.lineWidth = Math.max(0.8, r * 0.1);
    g.beginPath();
    g.arc(0, 0, r - g.lineWidth / 2, 0, TAU);
    g.stroke();
  } else if (k === CANDY) {
    // 포장지 꼬리 (양옆)
    g.fillStyle = 'rgba(255,255,255,.75)';
    g.strokeStyle = p[2];
    g.lineWidth = Math.max(0.7, r * 0.08);
    for (const sd of [1, -1]) {
      g.beginPath();
      g.moveTo(sd * r * 0.75, 0);
      g.lineTo(sd * r * 1.5, -r * 0.55);
      g.lineTo(sd * r * 1.38, 0);
      g.lineTo(sd * r * 1.5, r * 0.55);
      g.closePath();
      g.fill();
      g.stroke();
    }
    const gr = g.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
    gr.addColorStop(0, p[0]);
    gr.addColorStop(0.5, p[1]);
    gr.addColorStop(1, p[2]);
    g.fillStyle = gr;
    g.beginPath();
    g.arc(0, 0, r * 0.92, 0, TAU);
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,.85)';
    g.lineWidth = r * 0.2;
    for (let q = 0; q < 3; q++) {
      g.beginPath();
      g.arc(0, 0, r * 0.55, (q / 3) * TAU, (q / 3) * TAU + 1.1);
      g.stroke();
    }
    g.fillStyle = 'rgba(255,255,255,.9)';
    g.beginPath();
    g.ellipse(-r * 0.34, -r * 0.42, r * 0.22, r * 0.13, -0.6, 0, TAU);
    g.fill();
  } else if (k === LEAF) {
    if (c === 2) {
      // 은행잎: 부채꼴
      const gr = g.createLinearGradient(0, -r, 0, r);
      gr.addColorStop(0, p[0]);
      gr.addColorStop(1, p[1]);
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(0, r * 0.7);
      g.lineTo(-r * 1.15, -r * 0.45);
      g.quadraticCurveTo(-r * 0.6, -r * 1.2, -r * 0.08, -r * 0.75);
      g.lineTo(0, -r * 0.5);
      g.lineTo(r * 0.08, -r * 0.75);
      g.quadraticCurveTo(r * 0.6, -r * 1.2, r * 1.15, -r * 0.45);
      g.closePath();
      g.fill();
      g.strokeStyle = p[2];
      g.lineWidth = Math.max(0.7, r * 0.09);
      g.stroke();
      g.strokeStyle = 'rgba(160,110,0,.45)';
      g.lineWidth = Math.max(0.5, r * 0.05);
      for (let q = -2; q <= 2; q++) {
        g.beginPath();
        g.moveTo(0, r * 0.6);
        g.lineTo(q * r * 0.36, -r * 0.7);
        g.stroke();
      }
      g.strokeStyle = p[2];
      g.lineWidth = Math.max(0.8, r * 0.12);
      g.beginPath();
      g.moveTo(0, r * 0.65);
      g.lineTo(r * 0.1, r * 1.3);
      g.stroke();
    } else {
      // 단풍잎: 다섯 갈래
      g.fillStyle = p[1];
      g.beginPath();
      for (let q = 0; q < 10; q++) {
        const a = -Math.PI / 2 + (q / 10) * TAU, rr = q % 2 ? r * 0.5 : r * (q === 4 || q === 6 ? 0.95 : 1.25);
        const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
        if (q) g.lineTo(x, y);
        else g.moveTo(x, y);
      }
      g.closePath();
      g.fill();
      g.strokeStyle = p[2];
      g.lineWidth = Math.max(0.7, r * 0.09);
      g.stroke();
      g.strokeStyle = p[0];
      g.lineWidth = Math.max(0.6, r * 0.07);
      for (let q = 0; q < 5; q++) {
        const a = -Math.PI / 2 + (q / 5) * TAU;
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95);
        g.stroke();
      }
      g.strokeStyle = p[2];
      g.lineWidth = Math.max(0.8, r * 0.12);
      g.beginPath();
      g.moveTo(0, r * 0.2);
      g.lineTo(r * 0.15, r * 1.25);
      g.stroke();
    }
  } else {
    // 도토리: 몸 + 깍정이
    const gr = g.createRadialGradient(-r * 0.3, 0, r * 0.1, 0, r * 0.2, r);
    gr.addColorStop(0, p[0]);
    gr.addColorStop(0.55, p[1]);
    gr.addColorStop(1, p[2]);
    g.fillStyle = gr;
    g.beginPath();
    g.ellipse(0, r * 0.2, r * 0.78, r * 0.85, 0, 0, TAU);
    g.fill();
    g.fillStyle = '#7a5330';
    g.beginPath();
    g.ellipse(0, -r * 0.3, r * 0.92, r * 0.5, 0, Math.PI, TAU);
    g.ellipse(0, -r * 0.3, r * 0.92, r * 0.2, 0, 0, Math.PI);
    g.fill();
    g.strokeStyle = 'rgba(40,20,5,.45)';
    g.lineWidth = Math.max(0.5, r * 0.06);
    for (let q = -3; q <= 3; q++) {
      g.beginPath();
      g.moveTo(q * r * 0.25 - r * 0.2, -r * 0.75);
      g.lineTo(q * r * 0.25 + r * 0.2, -r * 0.15);
      g.stroke();
    }
    g.fillStyle = '#5a3a1e';
    g.fillRect(-r * 0.08, -r * 1.05, r * 0.16, r * 0.35);
    g.fillStyle = 'rgba(255,255,255,.7)';
    g.beginPath();
    g.ellipse(-r * 0.32, r * 0.15, r * 0.14, r * 0.26, 0.2, 0, TAU);
    g.fill();
  }
  SPR.set(key, cv);
  return cv;
}

function star5(ctx: C2, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r * 0.45 : r;
    if (k) ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

const demoMem = new WeakMap<object, { key: string; pts: number[] }>();
const recentSay = new WeakMap<object, { x: number; y: number; t: number }[]>();

function drawAll(ctx: C2, s: SweepState, w: number, h: number, th: Theme) {
  const fx = juice(s), t = s.t, d = STAGES[s.stage], place = d.place;
  const Y = (y: number) => y * w, R = (r: number) => r * w;
  const SX = (x: number, y: number) => PX(x, y) * w, SY = (y: number) => PY(y) * w;
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.round(R(sz))}px system-ui, sans-serif`);
  const dpr = Math.abs(ctx.getTransform().a) || 1;
  const say = (x: number, y: number, text: string, col: string, size: number) => {
    let rec = recentSay.get(s);
    if (!rec) recentSay.set(s, (rec = []));
    for (let k = 0; k < 6 && rec.some((q) => s.t - q.t < 30 && Math.abs(q.x - x) < w * 0.2 && Math.abs(q.y - y) < size + 2); k++) y -= size + 3;
    rec.push({ x, y, t: s.t });
    if (rec.length > 16) rec.shift();
    fx.pop(Math.max(w * 0.12, Math.min(w * 0.88, x)), y, text, col, size);
  };
  const fpoly = (pts: number[][]) => {
    ctx.beginPath();
    pts.forEach(([x, y], k) => (k ? ctx.lineTo(SX(x, y), SY(y)) : ctx.moveTo(SX(x, y), SY(y))));
    ctx.closePath();
  };
  /** 바닥 위 타원 (원근으로 납작) */
  const fell = (cx: number, cy: number, rx: number, ry: number) => {
    ctx.beginPath();
    ctx.ellipse(SX(cx, cy), SY(cy), Math.max(0.5, rx * w * scl(cy)), Math.max(0.5, ry * w * KY), 0, 0, TAU);
  };

  ctx.save();
  // 큰 순간엔 장면이 살짝 '쿵' 다가온다
  const zt = fx.memo.zoomT ?? -99, za = Math.max(0, 1 - (t - zt) / 14);
  if (za > 0) {
    const zs = 1 + 0.025 * za;
    ctx.translate(w / 2, Y(0.75));
    ctx.scale(zs, zs);
    ctx.translate(-w / 2, -Y(0.75));
  }
  fx.begin(ctx);
  drawRoom(ctx, s, w, place);
  drawFloor(ctx, s, w, place, fpoly, fell);
  // 웅덩이
  for (const p of s.puds) {
    ctx.save();
    fell(p.x, p.y, p.rx + 0.02, p.ry + 0.02);
    ctx.fillStyle = 'rgba(80,140,190,.18)';
    ctx.fill();
    fell(p.x, p.y, p.rx, p.ry);
    const g = ctx.createLinearGradient(0, SY(p.y - p.ry), 0, SY(p.y + p.ry));
    g.addColorStop(0, 'rgba(170,225,255,.85)');
    g.addColorStop(1, 'rgba(90,175,235,.8)');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,.6)';
    ctx.lineWidth = 2;
    for (let k = 0; k < 5; k++) {
      const yy = p.y - p.ry * 0.6 + k * p.ry * 0.3, ph = Math.sin(t * 0.05 + k) * 0.03;
      ctx.beginPath();
      ctx.moveTo(SX(p.x - p.rx * 0.6 + ph, yy), SY(yy));
      ctx.lineTo(SX(p.x - p.rx * 0.2 + ph, yy), SY(yy));
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.beginPath();
    ctx.ellipse(SX(p.x + p.rx * 0.35, p.y), SY(p.y - p.ry * 0.45), R(p.rx * 0.25), R(p.ry * 0.12), -0.2, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.75)';
    ctx.lineWidth = 1.5;
    fell(p.x, p.y, p.rx, p.ry);
    ctx.stroke();
  }
  // 빗자루 자국 (먼지 쓸린 길)
  if (s.trail.length > 4) {
    ctx.strokeStyle = place === 2 ? 'rgba(120,80,40,.12)' : 'rgba(255,255,255,.16)';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = R(BL * 1.7);
    ctx.beginPath();
    for (let k = 0; k < s.trail.length; k += 2) {
      const x = SX(s.trail[k], s.trail[k + 1]), y = SY(s.trail[k + 1]);
      if (k) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.stroke();
  }
  // 구멍 (단지·바구니): 속 → 떨어지는 것 → 테두리
  s.holes.forEach((o, hi) => drawHole(ctx, s, o, hi, w, place, dpr));

  // ── 깊이 순서로: 물건 · 발 · 고양이 ──
  const order: number[] = [];
  for (let i = 0; i < s.n; i++) if (s.live[i]) order.push(i);
  order.sort((a, b) => s.y[a] - s.y[b]);
  // 그림자 먼저
  ctx.fillStyle = place === 2 ? 'rgba(90,55,20,.25)' : 'rgba(80,40,10,.22)';
  for (const i of order) {
    const r = KR[s.k[i]] * w * scl(s.y[i]);
    ctx.beginPath();
    ctx.ellipse(SX(s.x[i], s.y[i]) + r * 0.2, SY(s.y[i]) + r * 0.45, r * 0.95, r * 0.42, 0, 0, TAU);
    ctx.fill();
  }
  const segs = s.segs.map((g) => ({ g, y: Math.max(g.ay, g.by) })).sort((a, b) => a.y - b.y);
  let si = 0, catDone = !s.cat;
  const catY = s.cat ? (s.cat.jump >= 0 ? 99 : s.cat.y) : 99;
  for (const i of order) {
    const y = s.y[i];
    while (si < segs.length && segs[si].y < y) drawSeg(ctx, s, segs[si++].g, w);
    if (!catDone && catY < y) (catDone = true), drawCat(ctx, s, w);
    const r = KR[s.k[i]] * w * scl(y), rp = Math.max(2, Math.round(r * dpr * 2) / 2), spr = sprite(s.k[i], s.c[i], rp);
    const sx = SX(s.x[i], y), sy = SY(y) - r * 0.35, sz = spr.width / dpr;
    const sp = Math.hypot(s.vx[i], s.vy[i]);
    if (s.k[i] === MARBLE && sp < 0.001) ctx.drawImage(spr, sx - sz / 2, sy - sz / 2, sz, sz);
    else {
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(s.k[i] === MARBLE ? 0 : s.ang[i]);
      ctx.drawImage(spr, -sz / 2, -sz / 2, sz, sz);
      ctx.restore();
    }
    // 반짝 (가만히 있는 구슬 몇 개가 번갈아)
    if (s.k[i] === MARBLE && (i * 37 + (t >> 2)) % 97 === 0) {
      ctx.fillStyle = 'rgba(255,255,255,.95)';
      ctx.beginPath();
      const sr = r * 0.7;
      ctx.moveTo(sx - r * 0.3, sy - r * 0.3 - sr);
      ctx.lineTo(sx - r * 0.3 + sr * 0.22, sy - r * 0.3 - sr * 0.22);
      ctx.lineTo(sx - r * 0.3 + sr, sy - r * 0.3);
      ctx.lineTo(sx - r * 0.3 + sr * 0.22, sy - r * 0.3 + sr * 0.22);
      ctx.lineTo(sx - r * 0.3, sy - r * 0.3 + sr);
      ctx.lineTo(sx - r * 0.3 - sr * 0.22, sy - r * 0.3 + sr * 0.22);
      ctx.lineTo(sx - r * 0.3 - sr, sy - r * 0.3);
      ctx.lineTo(sx - r * 0.3 - sr * 0.22, sy - r * 0.3 - sr * 0.22);
      ctx.closePath();
      ctx.fill();
    }
  }
  while (si < segs.length) drawSeg(ctx, s, segs[si++].g, w);
  if (!catDone) drawCat(ctx, s, w);

  // 첫 판 시범: 손가락이 빗자루를 쓱
  const demo = s.stage === 0 && s.firstTouch < 0 && s.phase === 'play';
  if (demo) {
    let m = demoMem.get(s);
    const key = `${s.stage}:${s.tries}`;
    if (!m || m.key !== key) {
      const h0 = s.holes[0];
      let bx = 0.5, by = 0.75;
      const cl = clusters(s, 0, 1)[0];
      if (cl) (bx = cl.x), (by = cl.y);
      let hb = h0, hd = 9;
      for (const o of s.holes) if (Math.hypot(o.x - bx, o.y - by) < hd) (hd = Math.hypot(o.x - bx, o.y - by)), (hb = o);
      const ux = (hb.x - bx) / hd, uy = (hb.y - by) / hd;
      demoMem.set(s, (m = { key, pts: [bx - ux * 0.16, by - uy * 0.16, hb.x - ux * 0.02, hb.y - uy * 0.02] }));
    }
    const ph = (t % 130) / 100, u = Math.min(1, Math.max(0, ph * 1.2 - 0.1)), e = u * u * (3 - 2 * u);
    const gx = m.pts[0] + (m.pts[2] - m.pts[0]) * e, gy = m.pts[1] + (m.pts[3] - m.pts[1]) * e;
    const dl = Math.hypot(m.pts[2] - m.pts[0], m.pts[3] - m.pts[1]);
    ctx.globalAlpha = ph < 1.05 ? 0.8 : 0.3;
    drawBroomAt(ctx, s, w, gx, gy, (m.pts[2] - m.pts[0]) / dl, (m.pts[3] - m.pts[1]) / dl, 0, 1, true);
    ctx.globalAlpha = 1;
    // 지나갈 길 화살표
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.setLineDash([R(0.02), R(0.014)]);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(SX(m.pts[0], m.pts[1]), SY(m.pts[1]));
    ctx.lineTo(SX(m.pts[2], m.pts[3]), SY(m.pts[3]));
    ctx.stroke();
    ctx.setLineDash([]);
    drawHand(ctx, SX(gx, gy) + R(0.03), SY(gy) + R(0.01), R(0.1), ph < 1.05);
  } else drawBroom(ctx, s, w);

  // NEW 스포트라이트: 이 판의 새것 둘레에 고리
  if (d.key && s.stage > 0 && s.used === 0 && s.phase === 'play' && s.pt < 420) {
    let nx = 0.5, ny = 0.6, nr = 0.14;
    if (d.key === 'cat' || d.key === 'mix3') s.cat && ((nx = s.cat.x), (ny = s.cat.y), (nr = 0.16));
    if (d.key === 'puddle') (nx = s.puds[0].x), (ny = s.puds[0].y), (nr = 0.3);
    if (d.key === 'curtain') (nx = s.segs[0].ax * 0.5 + s.segs[0].bx * 0.5), (ny = s.segs[0].ay), (nr = 0.2);
    if (d.key === 'two') {
      const o = s.holes.find((q) => q.col === 1)!;
      (nx = o.x), (ny = o.y), (nr = o.r + 0.05);
    }
    if (d.key === 'lids') (nx = s.holes[0].x), (ny = s.holes[0].y), (nr = 0.14);
    if (d.key === 'slope') (nx = 0.5), (ny = 0.45), (nr = 0.22);
    const pu = 1 + 0.06 * Math.sin(t * 0.15);
    ctx.save();
    ctx.strokeStyle = '#fff6a8';
    ctx.lineWidth = 3;
    ctx.setLineDash([R(0.018), R(0.012)]);
    ctx.lineDashOffset = -t * 0.6;
    fell(nx, ny, nr * pu, nr * pu);
    ctx.stroke();
    ctx.setLineDash([]);
    const tx = SX(nx, ny), ty = SY(ny) - R(nr * KY * pu) - R(0.035);
    ctx.fillStyle = '#ff5a5a';
    ctx.beginPath();
    ctx.roundRect(tx - R(0.06), ty - R(0.022), R(0.12), R(0.044), R(0.022));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    font(0.032, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('NEW', tx, ty + 1);
    ctx.restore();
  }
  // 비탈 화살표
  if (s.gy || s.gx) {
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    for (let k = 0; k < 3; k++)
      for (const xx of [0.08, 0.92]) {
        const yy = 0.35 + k * 0.32 + (((t * 0.4) % 32) / 32) * -0.1;
        ctx.beginPath();
        ctx.moveTo(SX(xx, yy - 0.05), SY(yy - 0.05));
        ctx.lineTo(SX(xx + 0.035, yy + 0.01), SY(yy + 0.01));
        ctx.lineTo(SX(xx - 0.035, yy + 0.01), SY(yy + 0.01));
        ctx.closePath();
        ctx.fill();
      }
  }

  // 구멍마다 '퐁 ×N' (이어 들어갈수록 커진다) · 섞이면 빨간 '−N'
  for (const o of s.holes) {
    const ox = SX(o.x, o.y), oy = SY(o.y) - R(o.r * KY) - R(0.05);
    for (const [n, last, good] of [[o.cn, o.ct, true], [o.wn, o.wt, false]] as [number, number, boolean][]) {
      const age = t - last;
      if (n < (good ? 2 : 1) || age > 70) continue;
      const a = Math.min(1, (70 - age) / 20), bump = Math.max(0, 1 - age / 8), sz = (good ? 16 + Math.min(18, n * 0.6) : 18) * (1 + 0.35 * bump);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.font = `900 ${Math.round(sz * (w / 380))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 4;
      ctx.strokeStyle = good ? 'rgba(90,50,10,.75)' : 'rgba(90,10,10,.8)';
      const tx = good ? `퐁 ×${n}` : `앗! −${n}`, yy = oy - (good ? 0 : R(0.05)) - (1 - a) * R(0.03);
      ctx.strokeText(tx, ox, yy);
      ctx.fillStyle = good ? (n >= 15 ? '#fff066' : '#ffffff') : '#ffb3a8';
      ctx.fillText(tx, ox, yy);
      ctx.restore();
    }
  }
  // ── 사건 연출 ──
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const x = SX(e.x, e.y), y = SY(e.y);
    if (e.kind === 'land') fx.burst(x, y, place === 2 ? '#d9b27a' : '#fff1d6', 14, 2.6, 2.4), fx.ring(x, y, '#ffffff', R(0.12), 3), say(x, y - R(0.09), e.text!, '#ffffff', 20);
    if (e.kind === 'surge') fx.burst(x, y, '#fff3c4', 26, 4.2, 2.8), fx.kick(6), (fx.memo.zoomT = t), say(x, y - R(0.1), e.text!, '#ffe066', 28);
    if (e.kind === 'in') {
      const col = pal(stageKind(d, e.col ?? 0), e.col ?? 0)[1];
      fx.burst(x, y - R(0.02), col, 5, 2.4, 2.2);
      fx.burst(x, y - R(0.02), '#ffffff', 3, 2, 1.8);
    }
    if (e.kind === 'combo') {
      const big = (e.n ?? 6) >= 14;
      fx.burst(x, y - R(0.03), '#ffe066', big ? 34 : 22, big ? 5.4 : 4.2, 3);
      fx.ring(x, y, '#ffffff', R(big ? 0.22 : 0.15), 5);
      fx.kick(big ? 9 : 6);
      fx.blink('#fff6d0', big ? 0.25 : 0.14);
      fx.memo.zoomT = t;
      if (!big) say(x, y - R(0.2), '퐁퐁퐁!', '#fff066', 24);
    }
    if (e.kind === 'wrong') fx.burst(x, y, '#5a3a3a', 14, 3, 2.4), fx.ring(x, y, '#ff5a5a', R(0.13), 4), fx.kick(4);
    if (e.kind === 'lid') fx.burst(x, y, '#e8c28a', 26, 4, 2.8), fx.ring(x, y, '#fff1d0', R(0.16), 5), fx.kick(5), say(x, y - R(0.1), e.text!, '#ffe9b0', 24);
    if (e.kind === 'cat') fx.burst(x, y - R(0.04), '#ffb066', 30, 5, 3), fx.ring(x, y, '#ffffff', R(0.24), 6), fx.kick(10), fx.blink('#ffe8d0', 0.2), say(x, y - R(0.16), e.text!, '#ffd0a0', 28);
    if (e.kind === 'catland') fx.burst(x, y, '#ffffff', 10, 2.2, 2), say(x, y - R(0.1), e.text!, '#e8f0ff', 15);
    if (e.kind === 'tired') say(x, y - R(0.12), e.text!, '#fff1d6', 17);
    if (e.kind === 'nope') say(x, y - R(0.06), e.text!, '#ffd6cc', 16), fx.kick(1.5);
    if (e.kind === 'clear') fx.burst(w * 0.3, Y(0.7), '#ffe066', 44, 6.4, 3.4), fx.burst(w * 0.7, Y(0.7), '#ff9ec4', 44, 6.4, 3.4), fx.burst(w * 0.5, Y(0.85), '#ffffff', 40, 6, 3), fx.ring(w / 2, Y(0.75), '#ffe066', R(0.5), 8), fx.blink('#fff6c8', 0.25);
    if (e.kind === 'fail') fx.kick(8), fx.blink(th.hot, 0.18);
  }
  fx.memo.t = s.t;
  // 쓸고 있는 동안 빗자루 뒤로 먼지
  if (s.b.down && !s.b.tired && s.b.spd > 0.004 && t % 3 === 0) {
    const bx = s.b.x - s.b.dx * 0.03, by = s.b.y - s.b.dy * 0.03;
    fx.burst(SX(bx, by), SY(by), place === 2 ? 'rgba(200,160,100,.8)' : 'rgba(255,245,225,.85)', 3, 1.6, 2.6);
  }
  ctx.restore();

  drawHud(ctx, s, w, h, th, font);
}

/** 뒤 벽 · 옆 벽 (곳마다 다르게) */
function drawRoom(ctx: C2, s: SweepState, w: number, place: number) {
  const R = (r: number) => r * w, t = s.t;
  const by = PY(0) * w, bl = PX(0, 0) * w, br = PX(W, 0) * w, fy = PY(H) * w, fl = PX(0, H) * w, frr = PX(W, H) * w;
  if (place === 2) {
    // 하늘 · 먼 산 · 감나무 · 울타리
    const g = ctx.createLinearGradient(0, 0, 0, by);
    g.addColorStop(0, '#9fd8f5');
    g.addColorStop(1, '#fdf0d0');
    ctx.fillStyle = g;
    ctx.fillRect(-10, -10, w + 20, by + 12);
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    for (let k = 0; k < 3; k++) {
      const cx = ((k * 0.37 + t * 0.00012 * (k + 1)) % 1.2) * w - R(0.1), cy = R(0.12 + k * 0.035);
      ctx.beginPath();
      ctx.arc(cx, cy, R(0.03), 0, TAU);
      ctx.arc(cx + R(0.035), cy - R(0.012), R(0.035), 0, TAU);
      ctx.arc(cx + R(0.07), cy, R(0.026), 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#a9c98a';
    ctx.beginPath();
    ctx.moveTo(0, by - R(0.07));
    ctx.quadraticCurveTo(R(0.25), by - R(0.16), R(0.5), by - R(0.09));
    ctx.quadraticCurveTo(R(0.75), by - R(0.03), w, by - R(0.12));
    ctx.lineTo(w, by);
    ctx.lineTo(0, by);
    ctx.fill();
    // 울타리
    for (let k = 0; k < 15; k++) {
      const x0 = k * R(0.07) - R(0.01), hh = R(0.085 + (k % 2) * 0.01);
      ctx.fillStyle = k % 2 ? '#c9925a' : '#d9a46a';
      ctx.beginPath();
      ctx.moveTo(x0, by + 2);
      ctx.lineTo(x0, by - hh + R(0.012));
      ctx.lineTo(x0 + R(0.028), by - hh);
      ctx.lineTo(x0 + R(0.056), by - hh + R(0.012));
      ctx.lineTo(x0 + R(0.056), by + 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(90,50,20,.18)';
      ctx.fillRect(x0 + R(0.046), by - hh + R(0.014), R(0.01), hh);
    }
    ctx.fillStyle = '#a8703c';
    ctx.fillRect(0, by - R(0.065), w, R(0.012));
    ctx.fillRect(0, by - R(0.03), w, R(0.012));
    // 감나무 가지
    ctx.strokeStyle = '#6b4424';
    ctx.lineWidth = R(0.018);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(w + 4, R(0.1));
    ctx.quadraticCurveTo(R(0.82), R(0.11), R(0.66), R(0.16));
    ctx.moveTo(R(0.84), R(0.115));
    ctx.quadraticCurveTo(R(0.8), R(0.16), R(0.76), R(0.2));
    ctx.stroke();
    for (const [x, y] of [[0.7, 0.18], [0.79, 0.21], [0.88, 0.14], [0.62, 0.175]]) {
      ctx.fillStyle = '#ff8c2a';
      ctx.beginPath();
      ctx.arc(R(x), R(y), R(0.022), 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      ctx.beginPath();
      ctx.arc(R(x - 0.007), R(y - 0.007), R(0.006), 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#4f7a2a';
      ctx.fillRect(R(x - 0.008), R(y - 0.026), R(0.016), R(0.008));
    }
    // 옆: 풀숲
    for (const [a, b2, c2] of [[0, bl, fl], [w, br, frr]]) {
      ctx.fillStyle = '#8cc46a';
      ctx.beginPath();
      ctx.moveTo(a, by);
      ctx.lineTo(b2, by);
      ctx.lineTo(c2, fy);
      ctx.lineTo(a, fy);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#6fae4f';
    for (let k = 0; k < 16; k++) {
      const left = k < 8, yy = by + ((k % 8) / 8) * (fy - by) + R(0.02), xx = left ? R(0.005 + 0.01 * (k % 3)) : w - R(0.005 + 0.01 * (k % 3));
      ctx.beginPath();
      ctx.arc(xx, yy, R(0.025 + 0.008 * (k % 2)), 0, TAU);
      ctx.fill();
    }
    drawDog(ctx, s, w, R(0.12), by - R(0.006));
    return;
  }
  if (place === 0) {
    // 한지 벽 · 나무 기둥 · 창살 문 · 창
    ctx.fillStyle = '#fbf0d8';
    ctx.fillRect(-10, -10, w + 20, by + 12);
    ctx.fillStyle = '#a8703c';
    ctx.fillRect(-10, R(0.085), w + 20, R(0.018));
    for (const x of [0.02, 0.5, 0.97]) ctx.fillRect(R(x) - R(0.012), R(0.085), R(0.024), by - R(0.085));
    // 창살 문 (왼쪽)
    const dx0 = R(0.2), dy0 = R(0.115), dw = R(0.24), dh = by - dy0 - R(0.012);
    ctx.fillStyle = '#fffaf0';
    ctx.fillRect(dx0, dy0, dw, dh);
    ctx.strokeStyle = '#b47a44';
    ctx.lineWidth = R(0.006);
    ctx.strokeRect(dx0, dy0, dw, dh);
    ctx.lineWidth = R(0.0035);
    for (let k = 1; k < 6; k++) {
      ctx.beginPath();
      ctx.moveTo(dx0 + (dw * k) / 6, dy0);
      ctx.lineTo(dx0 + (dw * k) / 6, dy0 + dh);
      ctx.stroke();
    }
    for (let k = 1; k < 4; k++) {
      ctx.beginPath();
      ctx.moveTo(dx0, dy0 + (dh * k) / 4);
      ctx.lineTo(dx0 + dw, dy0 + (dh * k) / 4);
      ctx.stroke();
    }
    // 창 (오른쪽) + 햇살
    const wx = R(0.62), wy = R(0.115), ww = R(0.26), wh = R(0.11);
    const sg = ctx.createLinearGradient(0, wy, 0, wy + wh);
    sg.addColorStop(0, '#bfe8ff');
    sg.addColorStop(1, '#fff8dc');
    ctx.fillStyle = sg;
    ctx.fillRect(wx, wy, ww, wh);
    ctx.fillStyle = '#9fd07a';
    ctx.beginPath();
    ctx.arc(wx + ww * 0.3, wy + wh, R(0.05), Math.PI, TAU);
    ctx.arc(wx + ww * 0.75, wy + wh, R(0.04), Math.PI, TAU);
    ctx.fill();
    ctx.strokeStyle = '#b47a44';
    ctx.lineWidth = R(0.008);
    ctx.strokeRect(wx, wy, ww, wh);
    ctx.beginPath();
    ctx.moveTo(wx + ww / 2, wy);
    ctx.lineTo(wx + ww / 2, wy + wh);
    ctx.stroke();
    // 화분
    ctx.fillStyle = '#d86a3c';
    ctx.beginPath();
    ctx.moveTo(R(0.86), by - R(0.002));
    ctx.lineTo(R(0.84), by - R(0.05));
    ctx.lineTo(R(0.93), by - R(0.05));
    ctx.lineTo(R(0.91), by - R(0.002));
    ctx.fill();
    ctx.fillStyle = '#5fae55';
    for (let k = 0; k < 5; k++) {
      ctx.beginPath();
      ctx.ellipse(R(0.885 + (k - 2) * 0.013), by - R(0.075 + (k % 2) * 0.012), R(0.012), R(0.03), (k - 2) * 0.35, 0, TAU);
      ctx.fill();
    }
  } else {
    // 부엌: 흰 타일 벽 · 조리대 · 창 · 냄비
    ctx.fillStyle = '#f4fbf8';
    ctx.fillRect(-10, -10, w + 20, by + 12);
    ctx.strokeStyle = 'rgba(140,180,170,.35)';
    ctx.lineWidth = 1;
    for (let r = 0; r < 8; r++) {
      const yy = R(0.085) + r * R(0.028);
      ctx.beginPath();
      ctx.moveTo(0, yy);
      ctx.lineTo(w, yy);
      ctx.stroke();
      for (let c = 0; c < 14; c++) {
        const xx = c * R(0.075) + (r % 2 ? R(0.037) : 0);
        ctx.beginPath();
        ctx.moveTo(xx, yy);
        ctx.lineTo(xx, yy + R(0.028));
        ctx.stroke();
      }
    }
    const wx = R(0.36), wy = R(0.1), ww = R(0.28), wh = R(0.09);
    const sg = ctx.createLinearGradient(0, wy, 0, wy + wh);
    sg.addColorStop(0, '#bfe8ff');
    sg.addColorStop(1, '#fff8dc');
    ctx.fillStyle = sg;
    ctx.fillRect(wx, wy, ww, wh);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = R(0.01);
    ctx.strokeRect(wx, wy, ww, wh);
    ctx.fillStyle = '#ffb3b3';
    ctx.beginPath();
    ctx.moveTo(wx - R(0.01), wy - R(0.006));
    ctx.quadraticCurveTo(wx + R(0.04), wy + R(0.05), wx + R(0.005), wy + wh);
    ctx.lineTo(wx - R(0.02), wy + wh);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(wx + ww + R(0.01), wy - R(0.006));
    ctx.quadraticCurveTo(wx + ww - R(0.04), wy + R(0.05), wx + ww - R(0.005), wy + wh);
    ctx.lineTo(wx + ww + R(0.02), wy + wh);
    ctx.fill();
    // 조리대
    const cy = by - R(0.07);
    ctx.fillStyle = '#e9b27a';
    ctx.fillRect(-4, cy, w + 8, R(0.016));
    ctx.fillStyle = '#7fc8b5';
    ctx.fillRect(-4, cy + R(0.016), w + 8, by - cy - R(0.016));
    ctx.strokeStyle = 'rgba(40,100,90,.4)';
    ctx.lineWidth = 1.2;
    for (let k = 0; k < 6; k++) {
      ctx.strokeRect(k * R(0.17) + R(0.01), cy + R(0.022), R(0.15), by - cy - R(0.03));
      ctx.fillStyle = '#f5e2c0';
      ctx.fillRect(k * R(0.17) + R(0.075), cy + R(0.03), R(0.02), R(0.006));
    }
    // 냄비 · 주전자
    ctx.fillStyle = '#e8574a';
    ctx.beginPath();
    ctx.roundRect(R(0.1), cy - R(0.04), R(0.1), R(0.04), [R(0.006), R(0.006), R(0.014), R(0.014)]);
    ctx.fill();
    ctx.fillStyle = '#c8433a';
    ctx.fillRect(R(0.09), cy - R(0.044), R(0.12), R(0.008));
    ctx.fillStyle = '#ffd36a';
    ctx.beginPath();
    ctx.ellipse(R(0.82), cy - R(0.022), R(0.04), R(0.024), 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#e9a93a';
    ctx.fillRect(R(0.81), cy - R(0.052), R(0.02), R(0.01));
    ctx.strokeStyle = '#e9a93a';
    ctx.lineWidth = R(0.006);
    ctx.beginPath();
    ctx.moveTo(R(0.855), cy - R(0.025));
    ctx.lineTo(R(0.885), cy - R(0.04));
    ctx.stroke();
    // 김
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    for (let k = 0; k < 3; k++) {
      const a = ((t * 0.7 + k * 40) % 120) / 120;
      ctx.beginPath();
      ctx.arc(R(0.15) + Math.sin(a * 6 + k) * R(0.01), cy - R(0.05) - a * R(0.06), R(0.008 + a * 0.012), 0, TAU);
      ctx.globalAlpha = 1 - a;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  // 걸레받이
  ctx.fillStyle = place === 0 ? '#8a5a30' : '#5aa08f';
  ctx.fillRect(-4, by - R(0.012), w + 8, R(0.014));
  // 옆 벽
  for (const [a, b2, c2, dark] of [[0, bl, fl, 0.1], [w, br, frr, 0.06]] as number[][]) {
    ctx.fillStyle = place === 0 ? `rgba(120,70,30,${0.25 + dark})` : `rgba(60,120,110,${0.22 + dark})`;
    ctx.beginPath();
    ctx.moveTo(a, R(0.085));
    ctx.lineTo(b2, R(0.085));
    ctx.lineTo(b2, by);
    ctx.lineTo(c2, fy);
    ctx.lineTo(a, fy);
    ctx.closePath();
    ctx.fillStyle = place === 0 ? '#ead6b4' : '#dbeee8';
    ctx.fill();
    ctx.fillStyle = `rgba(90,50,20,${dark + 0.05})`;
    ctx.fill();
  }
  drawDog(ctx, s, w, place === 0 ? R(0.12) : R(0.2), by - R(0.006));
}

function drawFloor(ctx: C2, s: SweepState, w: number, place: number, fpoly: (p: number[][]) => void, fell: (cx: number, cy: number, rx: number, ry: number) => void) {
  const R = (r: number) => r * w;
  const SX = (x: number, y: number) => PX(x, y) * w, SY = (y: number) => PY(y) * w;
  // 바닥 두께 (앞 테두리)
  ctx.fillStyle = place === 0 ? '#9a6232' : place === 1 ? '#7fb5a6' : '#b88a55';
  ctx.beginPath();
  ctx.moveTo(SX(0, H), SY(H));
  ctx.lineTo(SX(W, H), SY(H));
  ctx.lineTo(SX(W, H) + R(0.01), SY(H) + R(0.03));
  ctx.lineTo(SX(0, H) - R(0.01), SY(H) + R(0.03));
  ctx.closePath();
  ctx.fill();
  fpoly([[0, 0], [W, 0], [W, H], [0, H]]);
  if (place === 0) {
    const g = ctx.createLinearGradient(0, SY(0), 0, SY(H));
    g.addColorStop(0, '#e5b06e');
    g.addColorStop(1, '#f0c587');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.save();
    fpoly([[0, 0], [W, 0], [W, H], [0, H]]);
    ctx.clip();
    // 널 (앞뒤로 긴 판자) · 이음매 · 결
    const NP = 9;
    for (let k = 0; k < NP; k++) {
      const x0 = k / NP, x1 = (k + 1) / NP;
      ctx.fillStyle = `rgba(${hsh(k) > 0.5 ? '255,235,200' : '150,90,40'},${0.06 + hsh(k * 3) * 0.08})`;
      fpoly([[x0, 0], [x1, 0], [x1, H], [x0, H]]);
      ctx.fill();
      ctx.strokeStyle = 'rgba(120,70,30,.35)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(SX(x0, 0), SY(0));
      ctx.lineTo(SX(x0, H), SY(H));
      ctx.stroke();
      for (let q = 0; q < 2; q++) {
        const yy = (hsh(k * 7 + q * 13) * 0.6 + q * 0.7) * H * 0.9;
        ctx.beginPath();
        ctx.moveTo(SX(x0, yy), SY(yy));
        ctx.lineTo(SX(x1, yy), SY(yy));
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(160,100,45,.18)';
      ctx.lineWidth = 1;
      for (let q = 0; q < 3; q++) {
        const xx = x0 + (q + 0.5) / NP / 3.2;
        ctx.beginPath();
        ctx.moveTo(SX(xx, 0), SY(0));
        for (let yy = 0.1; yy <= H; yy += 0.1) ctx.lineTo(SX(xx + Math.sin(yy * 7 + k + q) * 0.004, yy), SY(yy));
        ctx.stroke();
      }
    }
    // 창으로 드는 햇살
    ctx.fillStyle = 'rgba(255,250,215,.28)';
    fpoly([[0.55, 0], [0.85, 0], [0.62, H], [0.18, H]]);
    ctx.fill();
    ctx.restore();
  } else if (place === 1) {
    ctx.fillStyle = '#fff4e2';
    ctx.fill();
    const T = 0.125;
    for (let r = 0; r * T < H; r++)
      for (let c = 0; c * T < W; c++) {
        if ((r + c) % 2) continue;
        ctx.fillStyle = '#bfe6d8';
        fpoly([[c * T, r * T], [(c + 1) * T, r * T], [(c + 1) * T, Math.min(H, (r + 1) * T)], [c * T, Math.min(H, (r + 1) * T)]]);
        ctx.fill();
      }
    ctx.strokeStyle = 'rgba(120,160,150,.35)';
    ctx.lineWidth = 1;
    for (let c = 0; c <= 8; c++) {
      ctx.beginPath();
      ctx.moveTo(SX(c * T, 0), SY(0));
      ctx.lineTo(SX(c * T, H), SY(H));
      ctx.stroke();
    }
    for (let r = 0; r * T <= H; r++) {
      ctx.beginPath();
      ctx.moveTo(SX(0, r * T), SY(r * T));
      ctx.lineTo(SX(W, r * T), SY(r * T));
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    fpoly([[0.3, 0], [0.7, 0], [0.62, H], [0.2, H]]);
    ctx.fill();
  } else {
    const g = ctx.createLinearGradient(0, SY(0), 0, SY(H));
    g.addColorStop(0, s.gy ? '#c99c62' : '#ddb985');
    g.addColorStop(1, '#ecd2a4');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.save();
    fpoly([[0, 0], [W, 0], [W, H], [0, H]]);
    ctx.clip();
    for (let k = 0; k < 70; k++) {
      const x = hsh(k * 3.1), y = hsh(k * 5.7) * H, r = 0.004 + hsh(k * 9.3) * 0.007;
      ctx.fillStyle = k % 3 ? 'rgba(150,110,70,.35)' : 'rgba(255,245,225,.6)';
      fell(x, y, r * 1.3, r);
      ctx.fill();
    }
    if (s.gy) {
      ctx.strokeStyle = 'rgba(120,80,40,.18)';
      ctx.lineWidth = 2;
      for (let k = 1; k < 6; k++) {
        const yy = k * 0.24;
        ctx.beginPath();
        ctx.moveTo(SX(0, yy), SY(yy));
        ctx.quadraticCurveTo(SX(0.5, yy + 0.04), SY(yy + 0.04), SX(W, yy), SY(yy));
        ctx.stroke();
      }
    }
    ctx.restore();
    ctx.fillStyle = '#78b453';
    for (let k = 0; k < 22; k++) {
      const left = k % 2 === 0, yy = (k / 22) * H, xx = left ? 0.01 : W - 0.01;
      const sx = SX(xx, yy), sy = SY(yy);
      ctx.beginPath();
      ctx.moveTo(sx - R(0.012), sy);
      ctx.lineTo(sx - R(0.004), sy - R(0.03));
      ctx.lineTo(sx + R(0.002), sy - R(0.006));
      ctx.lineTo(sx + R(0.01), sy - R(0.028));
      ctx.lineTo(sx + R(0.012), sy);
      ctx.fill();
    }
  }
  // 바닥 가장자리 그늘
  const eg = ctx.createLinearGradient(0, SY(0), 0, SY(0) + R(0.05));
  eg.addColorStop(0, 'rgba(60,30,10,.25)');
  eg.addColorStop(1, 'rgba(60,30,10,0)');
  ctx.fillStyle = eg;
  fpoly([[0, 0], [W, 0], [W, 0.08], [0, 0.08]]);
  ctx.fill();
}

function drawHole(ctx: C2, s: SweepState, o: Hole, hi: number, w: number, place: number, dpr: number) {
  const R = (r: number) => r * w, t = s.t, d = STAGES[s.stage];
  const SX = (x: number, y: number) => PX(x, y) * w, SY = (y: number) => PY(y) * w;
  const p = pal(stageKind(d, o.col), o.col);
  const cx = SX(o.x, o.y), cy = SY(o.y), rx = R(o.r * scl(o.y)), ry = R(o.r * KY);
  const glow = Math.max(0, 1 - (t - o.popT) / 16), bad = s.events.some((e) => e.kind === 'wrong' && Math.abs(e.x - o.x) < 0.01 && t - e.t < 20);
  // 바닥 그늘 + 바깥 테두리 (두께)
  ctx.fillStyle = 'rgba(60,30,10,.25)';
  ctx.beginPath();
  ctx.ellipse(cx + R(0.008), cy + R(0.012), rx * 1.2, ry * 1.25, 0, 0, TAU);
  ctx.fill();
  const rimW = R(0.028);
  ctx.fillStyle = p[2];
  ctx.beginPath();
  ctx.ellipse(cx, cy + R(0.008), rx + rimW * 0.6, ry + rimW * 0.55, 0, 0, TAU);
  ctx.fill();
  const rg = ctx.createLinearGradient(0, cy - ry, 0, cy + ry);
  rg.addColorStop(0, p[0]);
  rg.addColorStop(1, p[1]);
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx + rimW * 0.6, ry + rimW * 0.5, 0, 0, TAU);
  ctx.fill();
  if (o.shut) {
    // 뚜껑
    const lg = ctx.createLinearGradient(0, cy - ry, 0, cy + ry);
    lg.addColorStop(0, '#f3d49a');
    lg.addColorStop(1, '#c8924e');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.ellipse(cx, cy - R(0.006), rx * 1.02, ry * 1.02, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,70,30,.5)';
    ctx.lineWidth = 1.2;
    for (let k = -2; k <= 2; k++) {
      ctx.beginPath();
      ctx.ellipse(cx, cy - R(0.006), rx * (0.25 + 0.18 * (k + 2)), ry * (0.25 + 0.18 * (k + 2)), 0, 0, TAU);
      ctx.stroke();
    }
    ctx.fillStyle = '#8a5a2a';
    ctx.beginPath();
    ctx.ellipse(cx, cy - R(0.016), R(0.018), R(0.01), 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${Math.round(R(0.034))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('꽉!', cx, cy + ry * 0.35);
    return;
  }
  // 속 (어두운 구멍, 안쪽에 색 빛)
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU);
  const ig = ctx.createRadialGradient(cx, cy + ry * 0.4, ry * 0.1, cx, cy, rx * 1.1);
  ig.addColorStop(0, '#2a160a');
  ig.addColorStop(0.7, '#4a2a14');
  ig.addColorStop(1, p[2]);
  ctx.fillStyle = ig;
  ctx.fill();
  ctx.clip();
  // 안에 쌓인 것 (들어간 수만큼 바닥이 차오른다)
  const fill = Math.min(1, o.n / Math.max(18, o.cap || 40));
  if (o.n > 0) {
    for (let k = 0; k < Math.min(o.n, 26); k++) {
      const a = hsh(k * 3.3 + hi) * TAU, rr = Math.sqrt(hsh(k * 7.1 + hi)) * 0.8;
      const ix = cx + Math.cos(a) * rx * rr, iy = cy + ry * 0.55 - fill * ry * 0.6 + Math.sin(a) * ry * rr * 0.5;
      const kk = stageKind(d, o.col), rp = Math.max(2, Math.round(R(KR[kk]) * scl(o.y) * dpr * 2) / 2);
      const spr = sprite(kk, k < o.bad ? (o.col === 0 ? 1 : 0) : o.col, rp), sz = spr.width / dpr;
      ctx.globalAlpha = 0.55 + fill * 0.35;
      ctx.drawImage(spr, ix - sz / 2, iy - sz / 2, sz, sz);
    }
    ctx.globalAlpha = 1;
  }
  // 떨어지는 것: 구멍 가운데로 빨려 들며 작아진다
  for (const f of s.falls) {
    if (Math.abs(f.hx - o.x) > 1e-6 || Math.abs(f.hy - o.y) > 1e-6) continue;
    const a = (t - f.t) / 16;
    if (a > 1) continue;
    const e = a * a, x = f.x + (f.hx - f.x) * e, y = f.y + (f.hy - f.y) * e + a * 0.03;
    const rp = Math.max(2, Math.round(R(KR[f.k]) * scl(y) * dpr * 2) / 2), spr = sprite(f.k, f.c, rp), sz = (spr.width / dpr) * (1 - a * 0.55);
    ctx.save();
    ctx.translate(SX(x, y), SY(y));
    ctx.rotate(f.a + a * 3);
    ctx.drawImage(spr, -sz / 2, -sz / 2, sz, sz);
    ctx.restore();
  }
  // 안쪽 벽 그늘 (앞쪽 테두리 밑)
  const sg = ctx.createLinearGradient(0, cy - ry, 0, cy - ry * 0.2);
  sg.addColorStop(0, 'rgba(0,0,0,.55)');
  sg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(cx - rx, cy - ry, rx * 2, ry);
  ctx.restore();
  // 테두리 반짝 (방금 퐁)
  if (glow > 0 || bad) {
    ctx.strokeStyle = bad ? '#ff4a4a' : `rgba(255,255,220,${glow})`;
    ctx.lineWidth = R(0.012);
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx + R(0.006), ry + R(0.005), 0, 0, TAU);
    ctx.stroke();
  }
  // 바구니 결 (마당) · 단지 무늬 (마루·부엌)
  ctx.strokeStyle = place === 2 ? 'rgba(90,50,20,.45)' : 'rgba(255,255,255,.55)';
  ctx.lineWidth = place === 2 ? 1.4 : 2;
  ctx.beginPath();
  if (place === 2) {
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * TAU;
      ctx.moveTo(cx + Math.cos(a) * rx * 1.02, cy + Math.sin(a) * ry * 1.02);
      ctx.lineTo(cx + Math.cos(a) * (rx + rimW * 0.55), cy + Math.sin(a) * (ry + rimW * 0.5));
    }
  } else ctx.ellipse(cx, cy - R(0.002), rx + rimW * 0.3, ry + rimW * 0.25, 0, Math.PI * 1.1, Math.PI * 1.6);
  ctx.stroke();
  // 표지: 구멍 뒤에 꽂힌 작은 깃발 (색 + 그림)
  const fxp = cx + rx * 0.75, fyp = cy - ry * 0.7;
  ctx.strokeStyle = '#7a4a22';
  ctx.lineWidth = R(0.006);
  ctx.beginPath();
  ctx.moveTo(fxp, fyp);
  ctx.lineTo(fxp, fyp - R(0.075));
  ctx.stroke();
  ctx.fillStyle = '#fffaf0';
  ctx.beginPath();
  ctx.roundRect(fxp, fyp - R(0.077), R(0.05), R(0.04), R(0.008));
  ctx.fill();
  ctx.strokeStyle = p[2];
  ctx.lineWidth = 1.5;
  ctx.stroke();
  const kk = stageKind(d, o.col), rp = Math.max(2, Math.round(R(0.013) * dpr * 2) / 2), spr = sprite(kk, o.col, rp), sz = spr.width / dpr;
  ctx.drawImage(spr, fxp + R(0.025) - sz / 2, fyp - R(0.057) - sz / 2, sz, sz);
  if (o.cap) {
    ctx.fillStyle = 'rgba(50,30,15,.75)';
    ctx.beginPath();
    ctx.roundRect(cx - R(0.04), cy + ry + R(0.012), R(0.08), R(0.032), R(0.016));
    ctx.fill();
    ctx.fillStyle = '#fff1d0';
    ctx.font = `900 ${Math.round(R(0.026))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${o.n}/${o.cap}`, cx, cy + ry + R(0.029));
  }
}

/** 색깔 발(같은 색만 지나감) · 낮은 칸막이 */
function drawSeg(ctx: C2, s: SweepState, g: Seg, w: number) {
  const R = (r: number) => r * w, t = s.t;
  const SX = (x: number, y: number) => PX(x, y) * w, SY = (y: number) => PY(y) * w;
  const ax = SX(g.ax, g.ay), ay = SY(g.ay), bx = SX(g.bx, g.by), by = SY(g.by);
  if (g.col < 0) {
    const hh = R(0.045);
    ctx.fillStyle = '#b8824a';
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.lineTo(bx, by - hh);
    ctx.lineTo(ax, ay - hh);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e2b67e';
    ctx.beginPath();
    ctx.moveTo(ax - R(0.008), ay - hh);
    ctx.lineTo(bx - R(0.008), by - hh);
    ctx.lineTo(bx + R(0.008), by - hh);
    ctx.lineTo(ax + R(0.008), ay - hh);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = R(0.012);
    ctx.strokeStyle = '#e2b67e';
    ctx.beginPath();
    ctx.moveTo(ax, ay - hh);
    ctx.lineTo(bx, by - hh);
    ctx.stroke();
    return;
  }
  const d = STAGES[s.stage], p = pal(stageKind(d, g.col), g.col), hh = R(0.085);
  // 비치는 색 천 + 줄마다 구슬 꿴 발 (바람에 살랑)
  ctx.fillStyle = p[1];
  ctx.globalAlpha = 0.22;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.lineTo(bx, by - hh);
  ctx.lineTo(ax, ay - hh);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  const n = 16;
  for (let k = 0; k <= n; k++) {
    const u = k / n, x = ax + (bx - ax) * u, y = ay + (by - ay) * u, sway = Math.sin(t * 0.05 + k * 0.7) * R(0.004);
    ctx.strokeStyle = 'rgba(255,255,255,.65)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y - hh);
    ctx.lineTo(x + sway, y);
    ctx.stroke();
    for (let q = 0; q < 5; q++) {
      const yy = y - hh + (q + 0.6) * (hh / 5.2), xx = x + sway * ((q + 0.6) / 5.2);
      ctx.fillStyle = q % 2 ? p[0] : p[1];
      ctx.beginPath();
      ctx.arc(xx, yy, R(0.009), 0, TAU);
      ctx.fill();
    }
  }
  ctx.strokeStyle = '#9a6232';
  ctx.lineWidth = R(0.012);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(ax, ay - hh);
  ctx.lineTo(bx, by - hh);
  ctx.stroke();
  ctx.fillStyle = p[1];
  ctx.fillRect(Math.min(ax, bx), Math.min(ay, by) - hh - R(0.004), Math.abs(bx - ax), R(0.006));
}

function drawCat(ctx: C2, s: SweepState, w: number) {
  const c = s.cat!, t = s.t, R = (r: number) => r * w;
  let x = c.x, y = c.y, z = 0;
  const jumping = c.jump >= 0;
  if (jumping) {
    const to = c.spots[(c.si + 1) % c.spots.length], a = Math.min(1, c.jump / JUMP_T);
    x = c.fx + (to[0] - c.fx) * a;
    y = c.fy + (to[1] - c.fy) * a;
    z = Math.sin(a * Math.PI) * 0.22 + (a < 0.15 ? a * 0.6 : 0);
  }
  const sx = PX(x, y) * w, sy = PY(y) * w, u = R(CAT_R) * scl(y);
  ctx.fillStyle = 'rgba(60,30,10,.25)';
  ctx.beginPath();
  ctx.ellipse(sx, sy + u * 0.25, u * 1.15 * (1 - z), u * 0.45 * (1 - z), 0, 0, TAU);
  ctx.fill();
  const cy = sy - R(z) - u * 0.25;
  ctx.save();
  ctx.translate(sx, cy);
  const orange = '#ffa94d', dark = '#e07a1f', cream = '#fff1dc';
  if (!jumping) {
    const br = 1 + Math.sin(t * 0.05) * 0.03;
    // 꼬리
    ctx.strokeStyle = dark;
    ctx.lineWidth = u * 0.28;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, u * 0.1, u * 0.95, 0.2, 1.9 + Math.sin(t * 0.03) * 0.1);
    ctx.stroke();
    // 몸 (동그랗게 말림)
    const g = ctx.createRadialGradient(-u * 0.3, -u * 0.35, u * 0.1, 0, 0, u * 1.1);
    g.addColorStop(0, '#ffc47e');
    g.addColorStop(1, orange);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, u * 1.02 * br, u * 0.72 * br, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = dark;
    ctx.lineWidth = u * 0.1;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.arc(u * 0.2, -u * 0.2, u * (0.35 + k * 0.18), -2.4, -1.4);
      ctx.stroke();
    }
    // 머리
    ctx.fillStyle = orange;
    ctx.beginPath();
    ctx.ellipse(-u * 0.55, u * 0.05, u * 0.48, u * 0.42, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-u * 0.95, -u * 0.12);
    ctx.lineTo(-u * 0.92, -u * 0.55);
    ctx.lineTo(-u * 0.65, -u * 0.3);
    ctx.moveTo(-u * 0.45, -u * 0.32);
    ctx.lineTo(-u * 0.25, -u * 0.6);
    ctx.lineTo(-u * 0.15, -u * 0.18);
    ctx.fill();
    ctx.fillStyle = '#ffc9c9';
    ctx.beginPath();
    ctx.moveTo(-u * 0.88, -u * 0.2);
    ctx.lineTo(-u * 0.87, -u * 0.43);
    ctx.lineTo(-u * 0.72, -u * 0.3);
    ctx.fill();
    ctx.fillStyle = cream;
    ctx.beginPath();
    ctx.ellipse(-u * 0.6, u * 0.22, u * 0.28, u * 0.17, 0, 0, TAU);
    ctx.fill();
    // 감은 눈 (맞으면 한쪽 눈을 슬쩍 뜬다) · 코
    ctx.strokeStyle = '#5a3218';
    ctx.lineWidth = Math.max(1.2, u * 0.07);
    for (const ex of [-0.78, -0.42]) {
      if (c.bumps >= 3 && ex > -0.5) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(u * ex, u * 0.02, u * 0.1, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#3a2210';
        ctx.beginPath();
        ctx.arc(u * ex + u * 0.02, u * 0.03, u * 0.05, 0, TAU);
        ctx.fill();
        continue;
      }
      ctx.beginPath();
      ctx.arc(u * ex, u * 0.02, u * 0.09, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }
    ctx.fillStyle = '#ff8fa3';
    ctx.beginPath();
    ctx.arc(-u * 0.6, u * 0.15, u * 0.05, 0, TAU);
    ctx.fill();
    // 앞발
    ctx.fillStyle = cream;
    ctx.beginPath();
    ctx.ellipse(-u * 0.25, u * 0.5, u * 0.18, u * 0.11, 0, 0, TAU);
    ctx.ellipse(u * 0.05, u * 0.55, u * 0.18, u * 0.11, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    if (c.bumps >= 1) {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = 'rgba(160,60,20,.7)';
      ctx.lineWidth = 3;
      ctx.font = `900 ${Math.round(R(0.04))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      const tx = c.bumps >= 4 ? '으르릉…' : c.bumps >= 2 ? '?!' : '음냐…';
      ctx.strokeText(tx, sx + u * 0.6, cy - u * 1.0);
      ctx.fillText(tx, sx + u * 0.6, cy - u * 1.0);
    }
    // Zzz
    const zt = (t % 120) / 120;
    ctx.fillStyle = `rgba(255,255,255,${1 - zt})`;
    ctx.strokeStyle = `rgba(90,60,140,${0.6 * (1 - zt)})`;
    ctx.lineWidth = 2.5;
    ctx.font = `900 ${Math.round(R(0.032) + zt * R(0.012))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.strokeText('z', sx - u * 0.9, cy - u * 0.75 - zt * R(0.06));
    ctx.fillText('z', sx - u * 0.9, cy - u * 0.75 - zt * R(0.06));
    ctx.font = `900 ${Math.round(R(0.026))}px system-ui, sans-serif`;
    ctx.strokeText('Z', sx - u * 1.25, cy - u * 1.1 - zt * R(0.05));
    ctx.fillText('Z', sx - u * 1.25, cy - u * 1.1 - zt * R(0.05));
    return;
  }
  // 펄쩍! (털 세우고 눈 번쩍)
  const a = c.jump / JUMP_T;
  ctx.rotate(Math.sin(a * Math.PI * 2) * 0.3);
  ctx.fillStyle = orange;
  for (let k = 0; k < 14; k++) {
    const an = (k / 14) * TAU;
    ctx.beginPath();
    ctx.moveTo(Math.cos(an) * u * 0.6, Math.sin(an) * u * 0.5);
    ctx.lineTo(Math.cos(an + 0.22) * u * 1.05, Math.sin(an + 0.22) * u * 0.85);
    ctx.lineTo(Math.cos(an + 0.44) * u * 0.6, Math.sin(an + 0.44) * u * 0.5);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(0, 0, u * 0.75, u * 0.62, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = orange;
  ctx.lineWidth = u * 0.22;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(u * 0.6, 0);
  ctx.lineTo(u * 1.1, -u * 0.9);
  ctx.stroke();
  for (const [ex, ey] of [[-0.42, -0.65], [0.42, -0.65]]) {
    ctx.fillStyle = orange;
    ctx.beginPath();
    ctx.moveTo(u * (ex - 0.2), u * (ey + 0.2));
    ctx.lineTo(u * ex, u * (ey - 0.25));
    ctx.lineTo(u * (ex + 0.2), u * (ey + 0.2));
    ctx.fill();
  }
  for (const ex of [-0.28, 0.28]) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(u * ex, -u * 0.12, u * 0.2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#2a1a0a';
    ctx.beginPath();
    ctx.arc(u * ex, -u * 0.1, u * 0.08, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = '#7a2a2a';
  ctx.beginPath();
  ctx.ellipse(0, u * 0.25, u * 0.14, u * 0.16, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** 구경꾼 강아지: 빗자루를 눈으로 따라가고, 퐁퐁퐁엔 펄쩍, 섞이면 갸우뚱 */
function drawDog(ctx: C2, s: SweepState, w: number, x: number, y: number) {
  const t = s.t, u = w * 0.06, R = (r: number) => r * w;
  const jump = s.dogMood === 1 ? Math.abs(Math.sin((60 - s.dogT) * 0.25)) * R(0.03) : 0;
  const tilt = s.dogMood === 2 ? 0.35 : 0;
  const look = Math.max(-1, Math.min(1, (PX(s.b.x, s.b.y) * w - x) / (w * 0.4)));
  ctx.save();
  ctx.translate(x, y - jump);
  ctx.fillStyle = 'rgba(60,30,10,.25)';
  ctx.beginPath();
  ctx.ellipse(0, jump, u * 1.2, u * 0.3, 0, 0, TAU);
  ctx.fill();
  // 꼬리 (살랑)
  const wag = Math.sin(t * (s.dogMood === 1 ? 0.6 : 0.18)) * 0.6;
  ctx.strokeStyle = '#e8b06a';
  ctx.lineWidth = u * 0.28;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(u * 0.7, -u * 0.4);
  ctx.quadraticCurveTo(u * 1.2, -u * 0.9, u * (1.1 + wag * 0.4), -u * 1.4);
  ctx.stroke();
  // 몸
  ctx.fillStyle = '#f4c98a';
  ctx.beginPath();
  ctx.ellipse(0, -u * 0.55, u * 0.85, u * 0.6, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fff3e0';
  ctx.beginPath();
  ctx.ellipse(-u * 0.1, -u * 0.35, u * 0.45, u * 0.35, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#f4c98a';
  ctx.beginPath();
  ctx.ellipse(-u * 0.45, -u * 0.05, u * 0.22, u * 0.14, 0, 0, TAU);
  ctx.ellipse(u * 0.25, -u * 0.05, u * 0.22, u * 0.14, 0, 0, TAU);
  ctx.fill();
  // 머리
  ctx.translate(-u * 0.05 + look * u * 0.15, -u * 1.35);
  ctx.rotate(tilt + look * 0.08);
  ctx.fillStyle = '#f4c98a';
  ctx.beginPath();
  ctx.ellipse(0, 0, u * 0.62, u * 0.55, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#b8783a';
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(sd * u * 0.55, u * 0.05 + (s.dogMood === 2 ? -u * 0.15 : 0), u * 0.2, u * 0.42, sd * (s.dogMood === 1 ? -0.9 : -0.25), 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = '#fff3e0';
  ctx.beginPath();
  ctx.ellipse(look * u * 0.12, u * 0.22, u * 0.3, u * 0.22, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#2a1a0a';
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    if (s.dogMood === 1) ctx.arc(sd * u * 0.24 + look * u * 0.1, -u * 0.08, u * 0.09, Math.PI, TAU);
    else ctx.arc(sd * u * 0.24 + look * u * 0.12, -u * 0.08, u * 0.085, 0, TAU);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(look * u * 0.14, u * 0.12, u * 0.1, u * 0.07, 0, 0, TAU);
  ctx.fill();
  if (s.dogMood === 1) {
    ctx.fillStyle = '#ff7a8a';
    ctx.beginPath();
    ctx.ellipse(look * u * 0.14, u * 0.34, u * 0.08, u * 0.12, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  if (s.dogMood && s.dogT > 30) {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = 'rgba(90,50,20,.55)';
    ctx.lineWidth = 3;
    ctx.font = `900 ${Math.round(R(0.04))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    const tx = s.dogMood === 1 ? '멍!' : '?';
    ctx.strokeText(tx, x + u * 1.3, y - u * 2.3 - jump);
    ctx.fillText(tx, x + u * 1.3, y - u * 2.3 - jump);
  }
}

/** 시범용 손가락 */
function drawHand(ctx: C2, x: number, y: number, sz: number, press: boolean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.35);
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#5a3a1a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-sz * 0.13, -sz * 0.05, sz * 0.26, sz * 0.62, sz * 0.13);
  ctx.roundRect(-sz * 0.34, sz * 0.38, sz * 0.68, sz * 0.5, sz * 0.2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-sz * 0.11, sz * 0.36, sz * 0.22, sz * 0.08);
  if (press) {
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, -sz * 0.08, sz * 0.22, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBroom(ctx: C2, s: SweepState, w: number) {
  const b = s.b, down = b.down && !b.tired;
  const dx = b.has ? b.dx : 0, dy = b.has ? b.dy : -1;
  const lift = down ? 0 : 0.03 + 0.008 * Math.sin(s.t * 0.08);
  drawBroomAt(ctx, s, w, b.x, b.y, dx, dy, lift, s.mood, false);
}

/** 눈 달린 짚 빗자루 (막대 = 바닥에 닿는 솔 끝) */
function drawBroomAt(ctx: C2, s: SweepState, w: number, x: number, y: number, dx: number, dy: number, lift: number, mood: number, ghost: boolean) {
  const R = (r: number) => r * w, t = s.t;
  const SX = (xx: number, yy: number) => PX(xx, yy) * w, SY = (yy: number) => PY(yy) * w;
  const nx = -dy, ny = dx, z = R(lift);
  const moving = s.b.down && s.b.spd > 0.003 && !ghost;
  // 바닥 그림자
  ctx.fillStyle = `rgba(60,30,10,${lift > 0 ? 0.16 : 0.28})`;
  ctx.beginPath();
  ctx.ellipse(SX(x, y), SY(y) + R(0.005), R(BL * 1.05) * scl(y), R(0.032), Math.atan2(ny * KY, nx * scl(y)), 0, TAU);
  ctx.fill();
  // 솔 끝 (앞) · 묶음 (위)
  const bend = moving ? 0.02 : 0;
  const tip = (sd: number) => [x + nx * BL * sd + dx * (BT - bend), y + ny * BL * sd + dy * (BT - bend)];
  const top = (sd: number) => [x + nx * BL * 0.72 * sd - dx * 0.035, y + ny * BL * 0.72 * sd - dy * 0.035];
  const T1 = tip(1), T2 = tip(-1), U1 = top(1), U2 = top(-1);
  const zb = R(0.06);
  const p = (q: number[], zz: number) => [SX(q[0], q[1]), SY(q[1]) - zz];
  const a1 = p(T1, z), a2 = p(T2, z), b1 = p(U1, z + zb), b2 = p(U2, z + zb);
  const g = ctx.createLinearGradient(0, b1[1], 0, a1[1]);
  g.addColorStop(0, '#d9a441');
  g.addColorStop(1, '#f7dc8a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(a1[0], a1[1]);
  // 솔 끝은 살짝 부채꼴
  const mid = p([x + dx * (BT - bend + 0.012), y + dy * (BT - bend + 0.012)], z);
  ctx.quadraticCurveTo(mid[0] * 2 - (a1[0] + a2[0]) / 2, mid[1] * 2 - (a1[1] + a2[1]) / 2, a2[0], a2[1]);
  ctx.lineTo(b2[0], b2[1]);
  ctx.lineTo(b1[0], b1[1]);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#a8742a';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(150,100,30,.55)';
  ctx.lineWidth = 1;
  for (let k = 1; k < 12; k++) {
    const u = k / 12, wig = moving ? Math.sin(t * 0.9 + k) * 1.5 : 0;
    ctx.beginPath();
    ctx.moveTo(b1[0] + (b2[0] - b1[0]) * u, b1[1] + (b2[1] - b1[1]) * u);
    ctx.lineTo(a1[0] + (a2[0] - a1[0]) * u + wig, a1[1] + (a2[1] - a1[1]) * u);
    ctx.stroke();
  }
  // 묶음 띠 (빨간 천)
  ctx.strokeStyle = '#c9302a';
  ctx.lineWidth = R(0.016);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(b1[0], b1[1]);
  ctx.lineTo(b2[0], b2[1]);
  ctx.stroke();
  // 자루: 뒤로 비스듬히 위로 (머리 뒤에서 나온다)
  const cx = (b1[0] + b2[0]) / 2, cy = (b1[1] + b2[1]) / 2 - R(0.016);
  const sdx = dx * scl(y), sdy = dy * KY, sl = Math.hypot(sdx, sdy) || 1;
  const hx = cx - (sdx / sl) * R(0.1), hy = cy - R(0.25) - Math.max(0, -(sdy / sl)) * R(0.02);
  ctx.strokeStyle = '#8a5428';
  ctx.lineWidth = R(0.024);
  ctx.beginPath();
  ctx.moveTo(cx, cy - R(0.01));
  ctx.lineTo(hx, hy);
  ctx.stroke();
  ctx.strokeStyle = '#c48848';
  ctx.lineWidth = R(0.01);
  ctx.beginPath();
  ctx.moveTo(cx - R(0.004), cy - R(0.012));
  ctx.lineTo(hx - R(0.004), hy);
  ctx.stroke();
  ctx.fillStyle = '#e8483a';
  ctx.beginPath();
  ctx.arc(hx, hy, R(0.016), 0, TAU);
  ctx.fill();
  // 머리: 빨간 땡땡이 두건을 쓴 짚 뭉치 (얼굴이 여기에)
  const hw = R(0.12), hh = R(0.07), tilt = Math.atan2(b2[1] - b1[1], b2[0] - b1[0]);
  const ang = Math.abs(tilt) > Math.PI / 2 ? tilt - Math.PI : tilt;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(ang * 0.6 + (moving ? Math.sin(t * 0.5) * 0.04 : 0));
  ctx.fillStyle = 'rgba(80,40,10,.25)';
  ctx.beginPath();
  ctx.roundRect(-hw / 2 + 2, -hh / 2 + 3, hw, hh, hh * 0.45);
  ctx.fill();
  const hg = ctx.createLinearGradient(0, -hh / 2, 0, hh / 2);
  hg.addColorStop(0, '#fbe3a0');
  hg.addColorStop(1, '#e2b252');
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.roundRect(-hw / 2, -hh / 2, hw, hh, hh * 0.45);
  ctx.fill();
  // 두건
  ctx.fillStyle = '#ef4a3c';
  ctx.beginPath();
  ctx.moveTo(-hw / 2, -hh * 0.05);
  ctx.quadraticCurveTo(-hw / 2, -hh / 2 - R(0.012), 0, -hh / 2 - R(0.014));
  ctx.quadraticCurveTo(hw / 2, -hh / 2 - R(0.012), hw / 2, -hh * 0.05);
  ctx.quadraticCurveTo(0, -hh * 0.22, -hw / 2, -hh * 0.05);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  for (const [qx, qy] of [[-0.3, -0.32], [0, -0.42], [0.3, -0.32], [-0.15, -0.2], [0.16, -0.2]]) {
    ctx.beginPath();
    ctx.arc(qx * hw, qy * hh, R(0.0045), 0, TAU);
    ctx.fill();
  }
  // 두건 매듭 (옆으로 팔랑)
  ctx.fillStyle = '#d63a2e';
  const flap = Math.sin(t * (moving ? 0.6 : 0.1)) * R(0.006);
  ctx.beginPath();
  ctx.moveTo(hw / 2 - R(0.004), -hh * 0.2);
  ctx.lineTo(hw / 2 + R(0.03), -hh * 0.45 + flap);
  ctx.lineTo(hw / 2 + R(0.024), -hh * 0.05 + flap);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(140,90,30,.5)';
  ctx.lineWidth = 1;
  for (let k = -3; k <= 3; k++) {
    ctx.beginPath();
    ctx.moveTo(k * hw * 0.13, hh * 0.32);
    ctx.lineTo(k * hw * 0.14, hh / 2 - 1);
    ctx.stroke();
  }
  ctx.restore();
  if (ghost) return;
  // 얼굴 (묶음 띠 위)
  const fx2 = cx, fy2 = cy + R(0.006), e = R(0.016);
  // 볼
  ctx.fillStyle = 'rgba(255,120,120,.55)';
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(fx2 + sd * R(0.043), fy2 + R(0.016), R(0.011), R(0.007), 0, 0, TAU);
    ctx.fill();
  }
  const lx = (sdx / sl) * e * 0.4, ly = (sdy / sl) * e * 0.4;
  const blink = mood === 0 && t % 170 < 6;
  for (const sd of [-1, 1]) {
    const ex = fx2 + sd * R(0.024);
    if (mood === 1) {
      ctx.strokeStyle = '#3a1a0a';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(ex - e * 0.8, fy2 - e * 0.7);
      ctx.lineTo(ex + e * 0.6 * sd, fy2);
      ctx.lineTo(ex - e * 0.8, fy2 + e * 0.7);
      ctx.stroke();
      continue;
    }
    if (mood === 3 || blink) {
      ctx.strokeStyle = '#3a1a0a';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(ex, fy2 + (blink ? -e * 0.2 : e * 0.3), e * 0.75, Math.PI + 0.3, TAU - 0.3);
      ctx.stroke();
      continue;
    }
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(ex, fy2, e * (mood === 5 ? 1.15 : 0.95), e * (mood === 5 ? 1.25 : 1.1), 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#3a1a0a';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    if (mood === 4) {
      ctx.strokeStyle = '#3a1a0a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(ex, fy2, e * 0.5, t * 0.4, t * 0.4 + 4.5);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#2a1408';
      ctx.beginPath();
      ctx.arc(ex + lx, fy2 + ly, e * (mood === 5 ? 0.35 : 0.5), 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex + lx - e * 0.2, fy2 + ly - e * 0.25, e * 0.17, 0, TAU);
      ctx.fill();
    }
  }
  // 입
  ctx.strokeStyle = '#3a1a0a';
  ctx.fillStyle = '#7a2a1a';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  if (mood === 1) {
    ctx.moveTo(fx2 - e * 0.6, fy2 + e * 1.5);
    ctx.lineTo(fx2 + e * 0.6, fy2 + e * 1.5);
    ctx.stroke();
    // 땀
    ctx.fillStyle = '#8fd8ff';
    ctx.beginPath();
    ctx.ellipse(fx2 + R(0.05), fy2 - e, e * 0.4, e * 0.6, 0.3, 0, TAU);
    ctx.fill();
  } else if (mood === 3 || mood === 5) {
    ctx.ellipse(fx2, fy2 + e * 1.55, e * 0.6, e * (mood === 5 ? 0.75 : 0.55), 0, 0, mood === 5 ? TAU : Math.PI);
    ctx.fill();
  } else if (mood === 4) {
    ctx.moveTo(fx2 - e * 0.7, fy2 + e * 1.7);
    ctx.quadraticCurveTo(fx2, fy2 + e * 1.2, fx2 + e * 0.7, fy2 + e * 1.7);
    ctx.stroke();
  } else {
    ctx.arc(fx2, fy2 + e * 1.0, e * 0.55, 0.3, Math.PI - 0.3);
    ctx.stroke();
  }
}

function drawHud(ctx: C2, s: SweepState, w: number, h: number, th: Theme, font: (sz: number, wgt?: number) => void) {
  const R = (r: number) => r * w, Y = (y: number) => y * w, d = STAGES[s.stage], t = s.t;
  // ═════════════ 위 띠 ═════════════
  const hb = R(0.085);
  ctx.fillStyle = 'rgba(70,40,20,.88)';
  ctx.fillRect(0, 0, w, hb);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  font(0.045, 900);
  const ttl = `🧹 ${s.stage + 1}번째 청소`, tw1 = ctx.measureText(ttl).width;
  ctx.fillText(ttl, R(0.03), hb * 0.52);
  font(0.036, 800);
  ctx.fillStyle = '#e8cfa8';
  ctx.fillText(` · ${PLACE[d.place]} / ${STAGE_COUNT}`, R(0.03) + tw1, hb * 0.55);
  ctx.textAlign = 'right';
  font(0.042, 900);
  ctx.fillStyle = '#ffd84a';
  const stt = `★ ${s.stars}`;
  ctx.fillText(stt, w - R(0.03), hb * 0.52);
  ctx.fillStyle = th.hot;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - R(0.05) - ctx.measureText(stt).width, hb * 0.52);
  // 새것 알림 띠
  if (s.news && s.t - s.news.t < NEWS_T) {
    const age = s.t - s.news.t, a = Math.min(1, age / 10, (NEWS_T - age) / 20);
    ctx.globalAlpha = a;
    font(0.036, 900);
    ctx.textAlign = 'center';
    const tx = s.news.text, tw2 = Math.min(w - 10, ctx.measureText(tx).width + 24), by2 = Y(BAND - 0.035);
    ctx.fillStyle = 'rgba(70,40,20,.92)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw2 / 2, by2 - R(0.026), tw2, R(0.052), R(0.026));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(tx, w / 2, by2, w - 24);
    ctx.globalAlpha = 1;
  }
  // 판 카드: 시작 · 끝 · 실패
  {
    let head = '', sub = '', nw = '', col = '#ffffff', age = 0, a = 1;
    if (s.phase === 'result') {
      age = s.pt;
      if (s.ok) (head = s.won ? '대청소 끝! ✨' : '깨끗!'), (sub = `넣은 수 ${net(s)}${s.bad ? ` (섞임 ${s.bad})` : ''}${s.left ? ` · 남은 쓸기 +${s.left * LEFT_PTS}점` : ''}`), (col = '#ffd84a');
      else (head = `앗… ${s.why}`), (sub = s.hearts > 0 ? '하트 −1 · 같은 청소 다시' : '끝 — 그래도 반짝반짝해졌어요!'), (col = '#ffb3a8');
    } else if (s.pt < CARD_T && s.used === 0) {
      age = s.pt;
      a = Math.min(1, (CARD_T - s.pt) / 20);
      head = s.again ? `다시! ${s.stage + 1}번째 청소 · ${PLACE[d.place]}` : `${s.stage + 1}번째 청소 · ${PLACE[d.place]}`;
      sub = `쓸기 ${d.sweeps}번 · ${starLabel(d, d.stars[0])}`;
      nw = d.news;
    }
    if (head) {
      const sc = Math.min(1, 0.6 + age / 12), cyy = Y(s.phase === 'result' ? 0.62 : 0.2), ch = nw ? 0.158 : 0.11;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(w / 2, cyy);
      ctx.scale(sc, sc);
      ctx.fillStyle = 'rgba(70,40,20,.92)';
      ctx.beginPath();
      ctx.roundRect(-R(0.44), -R(0.055), R(0.88), R(ch), R(0.04));
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = col;
      font(0.048, 900);
      if (s.phase === 'result' && s.ok) {
        const nS = s.starOk.length, hw = ctx.measureText(head).width, sw = R(0.056), x0 = -(hw + R(0.02) + sw * nS) / 2;
        ctx.textAlign = 'left';
        ctx.fillText(head, x0, -R(0.018));
        for (let k = 0; k < nS; k++) {
          const ag = s.pt - (10 + k * 13);
          if (ag < 0) continue;
          const got = s.starOk[k], pop = ag < 8 ? 1.9 - 0.9 * (ag / 8) : 1, sx = x0 + hw + R(0.02) + sw * (k + 0.5);
          ctx.save();
          ctx.translate(sx, -R(0.018));
          ctx.scale(pop, pop);
          star5(ctx, 0, 0, R(0.024));
          ctx.fillStyle = got ? '#ffd43b' : 'rgba(255,255,255,.12)';
          ctx.fill();
          ctx.strokeStyle = got ? '#fff3b0' : 'rgba(255,255,255,.45)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();
          const fx = juice(s);
          if (got && (fx.memo['star' + k] ?? -1) < s.t - ag) (fx.memo['star' + k] = s.t - ag), fx.burst(w / 2 + sx, cyy - R(0.018), '#ffe066', 16, 3, 2.4);
        }
        ctx.textAlign = 'center';
      } else ctx.fillText(head, 0, -R(0.018), R(0.82));
      ctx.fillStyle = '#fffaf0';
      font(0.036, 800);
      ctx.fillText(sub, 0, R(0.03), R(0.82));
      if (nw) {
        ctx.fillStyle = '#ffe9a8';
        font(0.037, 900);
        ctx.fillText(nw, 0, R(0.077), R(0.84));
      }
      ctx.restore();
    }
  }
  // 첫 판 안내 (크게)
  if (s.stage === 0 && s.firstTouch < 0 && s.phase === 'play') {
    const bob = Math.sin(t * 0.12) * R(0.006);
    ctx.save();
    font(0.06, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const tx = '👆 쓱 쓸어 구멍에!', tw = ctx.measureText(tx).width + R(0.08), yy = Y(1.1) + bob;
    ctx.fillStyle = 'rgba(70,40,20,.85)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw / 2, yy - R(0.045), tw, R(0.09), R(0.045));
    ctx.fill();
    ctx.strokeStyle = '#ffd84a';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(tx, w / 2, yy + 1);
    ctx.restore();
  }
  // ═════════════ 아래 띠 ═════════════
  const ty = BAND, tb = h / w;
  const g = ctx.createLinearGradient(0, Y(ty), 0, Y(tb));
  g.addColorStop(0, 'rgba(84,50,26,.96)');
  g.addColorStop(1, 'rgba(60,34,16,.98)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(0, Y(ty), w, Y(tb - ty) + 4, [R(0.03), R(0.03), 0, 0]);
  ctx.fill();
  // 쓸기 남은 수: 작은 빗자루들
  const r1 = Y(ty + 0.032);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffeacc';
  font(0.038, 900);
  ctx.fillText('쓸기', R(0.03), r1);
  for (let k = 0; k < d.sweeps; k++) {
    const cx = R(0.14) + k * R(0.05), on = k < s.left;
    ctx.globalAlpha = on ? 1 : 0.28;
    ctx.strokeStyle = '#c48848';
    ctx.lineWidth = R(0.007);
    ctx.beginPath();
    ctx.moveTo(cx + R(0.008), r1 - R(0.024));
    ctx.lineTo(cx, r1);
    ctx.stroke();
    ctx.fillStyle = '#f7d27a';
    ctx.beginPath();
    ctx.moveTo(cx - R(0.006), r1 - R(0.004));
    ctx.lineTo(cx + R(0.006), r1 - R(0.004));
    ctx.lineTo(cx + R(0.016), r1 + R(0.02));
    ctx.lineTo(cx - R(0.016), r1 + R(0.02));
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e8483a';
    ctx.fillRect(cx - R(0.008), r1 - R(0.006), R(0.016), R(0.005));
  }
  ctx.globalAlpha = 1;
  // 넣은 수 막대
  const goal = (d.stars[0] as { n: number }).n, more = d.stars.find((x) => x.k === 'more') as { n: number } | undefined, top = more ? more.n : goal;
  const bx0 = R(0.47), bw = R(0.36), nn = net(s);
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath();
  ctx.roundRect(bx0, r1 - R(0.016), bw, R(0.032), R(0.016));
  ctx.fill();
  const fr = Math.max(0, Math.min(1, nn / top));
  if (fr > 0) {
    const bg = ctx.createLinearGradient(bx0, 0, bx0 + bw, 0);
    bg.addColorStop(0, '#ffd84a');
    bg.addColorStop(1, '#ff9f3a');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(bx0, r1 - R(0.016), Math.max(R(0.032), bw * fr), R(0.032), R(0.016));
    ctx.fill();
  }
  if (more) {
    const gx = bx0 + bw * (goal / top);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(gx, r1 - R(0.02));
    ctx.lineTo(gx, r1 + R(0.02));
    ctx.stroke();
  }
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  font(0.038, 900);
  ctx.fillText(nn >= goal ? `${nn}개 ✓` : `${nn} / ${goal}`, w - R(0.025), r1);
  // 별 조건 (한 줄씩)
  const rows = d.stars.length;
  for (let k = 0; k < rows; k++) {
    const st = d.stars[k], ry = Y(ty + 0.072 + k * 0.04);
    const ok = s.phase === 'result' && s.ok ? s.starOk[k] : starNow(s, st) && (st.k !== 'clean' && st.k !== 'cat' ? true : s.used > 0);
    const lost = (st.k === 'clean' && s.bad > st.n) || (st.k === 'cat' && !!s.cat && s.cat.woke > 0) || (st.k === 'fast' && s.used > st.m && !s.fastOk);
    star5(ctx, R(0.05), ry, R(0.017));
    ctx.fillStyle = ok ? '#ffd43b' : lost ? 'rgba(255,255,255,.15)' : 'rgba(255,255,255,.3)';
    ctx.fill();
    ctx.textAlign = 'left';
    font(0.036, 800);
    ctx.fillStyle = ok ? '#fff1c4' : lost ? 'rgba(255,255,255,.4)' : '#ffeacc';
    let label = starLabel(d, st);
    if (st.k === 'clean') label += s.bad ? ` (지금 ${s.bad}개)` : '';
    if (st.k === 'more') label += ` (지금 ${nn})`;
    ctx.fillText(label, R(0.085), ry + 1, R(0.78));
    if (lost) {
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffb3a8';
      ctx.fillText('놓침', w - R(0.03), ry + 1);
    } else if (ok) {
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffd84a';
      ctx.fillText('✓', w - R(0.03), ry + 1);
    }
  }
  // 안내 한 줄
  let hint = d.hint;
  if (s.phase === 'result') hint = s.ok ? (s.won ? '모든 청소 끝! 반짝반짝' : `★ ${s.got}개! 다음 청소엔 새것이 나와요`) : '더미 뒤에서 구멍 쪽으로 길게 쓸어 봐요';
  else if (s.left <= 0 && !s.b.down) hint = '굴러가는 게 멈추길 기다려요…';
  else if (s.b.down) hint = s.b.tired ? '손을 떼면 다음 쓸기' : '그대로 쓱— 떼면 끝';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffe9a8';
  font(0.036, 900);
  ctx.fillText(hint, w / 2, Y(ty + 0.072 + rows * 0.04 + (rows < 3 ? 0.006 : -0.002)), w - R(0.05));
}
