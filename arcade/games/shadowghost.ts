/**
 * 그림자 길 유령 꼬마 (33라운드: 길 찾기 — 주인공이 앞으로 나아감) — 해 끌어 그림자 길 × 가리키기 × 연쇄.
 * 기준 9(손이 하는 일은 하나): 화면을 누른 채 끌면 손가락을 따라 해가 하늘 길을 움직이고, 마을의 모든 그림자
 *   (나무·지붕·울타리·우체통·빨랫줄·파라솔·구름·트럭)가 해의 각도대로 휙휙 돈다. 떼면 해는 그 자리에 머문다.
 *   키보드는 화살표로 커서 + 스페이스(누르는 동안 해가 커서를 따라감).
 * 규칙(결정적, 3줄): 햇빛을 싫어하는 꼬마 유령은 돌길을 따라 **그림자 위로만** 저절로 걷는다 — 앞이 그늘이면 끝까지 슝 미끄러지고,
 *   그늘 끝에서는 발을 동동 기다린다. 해를 옮겨 유령 발밑이 햇빛에 드러나면 '앗 뜨거' 몸이 줄어든다(지킬 것 = 몸 크기).
 *   너무 줄면 하트 -1·그 판 다시. 길 옆 별사탕은 **그늘 속에 있을 때만** 지나가며 쏙 줍는다.
 * 와우: 첫 끌기에 해가 하늘을 가로지르며 마을의 그림자가 한꺼번에 시계바늘처럼 휙 돌고, 지붕 그림자가 다리가 되자 유령이 '슝' 건너가 별사탕을 줍는다.
 * 판 8개: 목표 = 골목 끝의 잃어버린 장난감까지 데려다 주기. 별 = 1판 하나, 판마다 하나씩(장난감 찾아 주기 · 별사탕 다 줍기 · 한 번도 안 줄어들기).
 * 펼쳐짐(하는 일이 바뀐다): 1판 지붕·나무(해를 옮겨 다리 놓기) → 2판 별사탕(길 옆 사탕까지 그늘 늘이기 — 무엇을 먼저)
 *   → 3판 구름(지나가는 구름 그림자를 기다렸다 타기) → 4판 빨랫줄(바람에 흔들리는 이불 그림자 — 때 맞추기)
 *   → 5판 볼록거울(반사 빛 동그라미는 그림자와 거꾸로 움직인다 — 비키기) → 6판 큰 파라솔(높아서 그림자가 멀리 — 천천히 끌어 유령을 실어 나르기)
 *   → 7판 트럭(지나가는 트럭 그림자에 올라타 쭉) → 8판 해 질 녘(그림자가 아주 길다 — 모두 섞어서, 친구 유령 만나기).
 * 웃음: 햇빛에 닿은 유령은 눈이 동그래지고 머리에서 김이 피어오르며 쪼그라든다. 담장 위 고양이는 큰 순간마다 '냥!', 창가 할머니는 박수.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

// ───────────────────────────── 상수 ─────────────────────────────
/** 화면 세로 ÷ 가로 */
const A = 1.5;
/** 땅의 깊이 줄임(3/4 시점): 그림자 세로 성분에 곱한다 */
const C = 0.62;
/** 해 위치 격자 (그림자 계산을 격자마다 한 번만 하고 캐시) */
const NU = 400;
/** 해가 손가락을 따라가는 속도 (u/틱) */
const SUNV = 0.03;
/** 유령 걸음: 그늘 끝까지 남은 거리에 비례해 빨라진다 (미끄러지듯 쭉) */
const VMIN = 0.002, KV = 0.05, VMAX = 0.009, VPANIC = 0.009, MARGIN = 0.035, PANIC_R = 0.09;
/** 별사탕을 줍는 거리(길 위 거리) */
const PICK = 0.04;
const FAIL_SZ = 0.35, REGEN = 0.004;
const RESULT_OK = 200, RESULT_FAIL = 170, CARD_T = 170, NEWS_T = 160;
const CANDY_PTS = 10, CLEAR_PTS = 20, STAR_PTS = 50, WIN_PTS = 100;
/** 큰 순간: 한 번에 이만큼 넘게 미끄러지면 '그림자 다리!' */
const BIG_GLIDE = 0.22;

/** 해 u(0 왼쪽 끝 ~ 1 오른쪽 끝) → 화면 위치 */
const sunX = (u: number) => 0.1 + 0.8 * u;
const sunY = (u: number) => 0.33 - 0.17 * Math.sin(Math.PI * u);
const uOf = (px: number) => Math.max(0, Math.min(1, (px - 0.1) / 0.8));

// ───────────────────────────── 판 정의 ─────────────────────────────
type OK = 'tree' | 'house' | 'hedge' | 'mail' | 'porch' | 'bush' | 'cloud' | 'laundry' | 'mirror' | 'parasol' | 'truck' | 'wall';
/** 물건 하나. (x, y) = 땅에 닿은 앞쪽 가운데(화면 좌표, w 단위) */
export interface Obj {
  k: OK; x: number; y: number;
  /** 너비(x)·깊이(y)·높이 */
  w?: number; d?: number; h?: number;
  /** 나무 잎·파라솔 반지름, 잎 가운데 높이 */
  r?: number; hc?: number;
  /** 지붕 꼭대기 높이(벽 위로) */
  roof?: number;
  /** 거울이 바라보는 쪽 (-1 왼쪽 · 1 오른쪽) */
  face?: -1 | 1;
  /** 움직이는 것: 속도(w/틱)·시작 자리·주기(틱)·흔들림 크기 */
  v?: number; x0?: number; per?: number; amp?: number;
  /** 색 바꾸기 */
  col?: number;
}
type StarK = 'goal' | 'candy' | 'nohurt';
interface Star { k: StarK; label: string }
interface StageDef {
  key: string; name: string; news: string; hint: string;
  /** 유령이 걷는 돌길 (꺾은선) */
  path: number[][];
  objs: Obj[];
  /** 별사탕 자리 */
  candies: number[][];
  stars: Star[];
  /** 처음 해 자리 */
  sun0: number;
  /** 그림자 길이 배수 (해 질 녘) */
  lf?: number;
  /** 햇빛에 줄어드는 빠르기 (틱마다) */
  burn: number;
  /** 제한 시간(초) */
  time: number;
}

const GOAL: Star = { k: 'goal', label: '장난감 찾아 주기' };
const CANDY: Star = { k: 'candy', label: '별사탕 다 줍기' };
const NOHURT: Star = { k: 'nohurt', label: '한 번도 안 줄어들기' };

const STAGE_DEFS: StageDef[] = [
  {
    key: 'roof', name: '빨간 지붕 골목', news: '', hint: '해를 옮기면 그림자가 돌아요 — 그늘이 이어지면 유령이 건너가요',
    path: [[0.09, 0.8], [0.64, 0.8], [0.64, 1.17], [0.9, 1.17]],
    objs: [
      { k: 'porch', x: 0.075, y: 0.86, w: 0.17, d: 0.12, h: 0.16 },
      { k: 'house', x: 0.3, y: 0.71, w: 0.26, d: 0.14, h: 0.17, roof: 0.07, col: 0 },
      { k: 'tree', x: 0.53, y: 0.72, h: 0.1, hc: 0.18, r: 0.08 },
      { k: 'hedge', x: 0.565, y: 1.16, w: 0.05, d: 0.34, h: 0.07 },
      { k: 'tree', x: 0.83, y: 1.0, h: 0.1, hc: 0.16, r: 0.065 },
      { k: 'porch', x: 0.85, y: 1.23, w: 0.32, d: 0.12, h: 0.15 },
    ],
    candies: [[0.4, 0.8], [0.64, 0.98]],
    stars: [GOAL], sun0: 0.98, burn: 0.001, time: 90,
  },
  {
    key: 'candy', name: '별사탕 담장길', news: '별사탕 — 그늘 속에 있을 때만 주워요', hint: '별사탕까지 그늘이 닿게 — 무엇을 먼저 할지 골라요',
    path: [[0.09, 1.2], [0.38, 1.2], [0.38, 0.8], [0.9, 0.8]],
    objs: [
      { k: 'porch', x: 0.075, y: 1.26, w: 0.17, d: 0.12, h: 0.15 },
      { k: 'tree', x: 0.23, y: 1.12, h: 0.1, hc: 0.17, r: 0.075 },
      { k: 'wall', x: 0.305, y: 1.14, w: 0.045, d: 0.34, h: 0.09 },
      { k: 'tree', x: 0.3, y: 0.73, h: 0.1, hc: 0.17, r: 0.075 },
      { k: 'mail', x: 0.46, y: 0.75, w: 0.04, d: 0.03, h: 0.11 },
      { k: 'house', x: 0.6, y: 0.71, w: 0.2, d: 0.14, h: 0.17, roof: 0.07, col: 1 },
      { k: 'tree', x: 0.77, y: 0.7, h: 0.1, hc: 0.18, r: 0.07 },
      { k: 'porch', x: 0.92, y: 0.86, w: 0.18, d: 0.12, h: 0.15 },
    ],
    candies: [[0.24, 1.2], [0.45, 1.0], [0.66, 0.85]],
    stars: [GOAL, CANDY], sun0: 0.82, burn: 0.0035, time: 60,
  },
  {
    key: 'cloud', name: '구름 지나는 광장', news: '구름 — 지나가는 구름 그림자에 올라타요', hint: '구름 그림자가 오면 올라타요 — 해를 옮기면 구름 그림자도 밀려요',
    path: [[0.09, 0.96], [0.92, 0.96]],
    objs: [
      { k: 'porch', x: 0.075, y: 1.02, w: 0.17, d: 0.12, h: 0.15 },
      { k: 'tree', x: 0.22, y: 0.88, h: 0.1, hc: 0.17, r: 0.075 },
      { k: 'tree', x: 0.8, y: 0.88, h: 0.1, hc: 0.17, r: 0.075 },
      { k: 'porch', x: 0.92, y: 1.02, w: 0.18, d: 0.12, h: 0.15 },
      { k: 'cloud', x: 0, y: 0.78, x0: -0.35, v: 0.0024, h: 0.22, r: 0.16 },
      { k: 'cloud', x: 0, y: 0.78, x0: 0.6, v: 0.0024, h: 0.22, r: 0.15 },
    ],
    candies: [[0.5, 1.04], [0.62, 0.89]],
    stars: [GOAL, CANDY, NOHURT], sun0: 0.5, burn: 0.009, time: 60,
  },
  {
    key: 'laundry', name: '빨래 널린 마당', news: '빨랫줄 — 바람에 흔들리는 이불 그림자', hint: '이불이 앞으로 흔들릴 때 그늘이 길을 덮어요 — 때를 맞춰요',
    path: [[0.09, 1.0], [0.92, 1.0]],
    objs: [
      { k: 'porch', x: 0.075, y: 1.06, w: 0.17, d: 0.12, h: 0.15 },
      { k: 'tree', x: 0.2, y: 0.92, h: 0.1, hc: 0.17, r: 0.075 },
      { k: 'laundry', x: 0.385, y: 0.885, w: 0.2, d: 0.13, h: 0.18, per: 210, amp: 0.75, x0: 0 },
      { k: 'laundry', x: 0.6, y: 0.885, w: 0.2, d: 0.13, h: 0.18, per: 210, amp: 0.75, x0: -0.95 },
      { k: 'tree', x: 0.775, y: 0.92, h: 0.1, hc: 0.17, r: 0.075 },
      { k: 'porch', x: 0.92, y: 1.06, w: 0.18, d: 0.12, h: 0.15 },
    ],
    candies: [[0.31, 1.06], [0.66, 0.95]],
    stars: [GOAL, CANDY, NOHURT], sun0: 0.9, burn: 0.009, time: 60,
  },
  {
    key: 'mirror', name: '볼록거울 모퉁이', news: '볼록거울 — 반사 빛은 그림자와 거꾸로 움직여요', hint: '반짝이는 빛 동그라미는 햇빛이에요 — 유령에게 닿지 않게',
    path: [[0.09, 1.1], [0.55, 1.1], [0.55, 0.78], [0.9, 0.78]],
    objs: [
      { k: 'porch', x: 0.075, y: 1.16, w: 0.17, d: 0.12, h: 0.15 },
      { k: 'tree', x: 0.18, y: 1.02, h: 0.1, hc: 0.17, r: 0.075 },
      { k: 'house', x: 0.355, y: 1.01, w: 0.18, d: 0.12, h: 0.15, roof: 0.06, col: 3 },
      { k: 'tree', x: 0.485, y: 0.985, h: 0.1, hc: 0.17, r: 0.08 },
      { k: 'hedge', x: 0.49, y: 0.9, w: 0.04, d: 0.14, h: 0.08 },
      { k: 'mirror', x: 0.63, y: 1.0, face: -1, h: 0.16, r: 0.045 },
      { k: 'tree', x: 0.46, y: 0.72, h: 0.1, hc: 0.17, r: 0.075 },
      { k: 'house', x: 0.7, y: 0.69, w: 0.26, d: 0.12, h: 0.17, roof: 0.07, col: 0 },
      { k: 'porch', x: 0.92, y: 0.84, w: 0.18, d: 0.12, h: 0.15 },
    ],
    candies: [[0.3, 1.16], [0.62, 0.86]],
    stars: [GOAL, CANDY, NOHURT], sun0: 0.5, burn: 0.009, time: 60,
  },
  {
    key: 'parasol', name: '파라솔 카페 거리', news: '큰 파라솔 — 높아서 그림자가 멀리 움직여요', hint: '해를 천천히 끌면 파라솔 그늘에 유령을 태워 갈 수 있어요',
    path: [[0.09, 0.95], [0.92, 0.95]],
    objs: [
      { k: 'porch', x: 0.075, y: 1.01, w: 0.17, d: 0.12, h: 0.15 },
      { k: 'parasol', x: 0.22, y: 0.79, h: 0.3, r: 0.12 },
      { k: 'mail', x: 0.6, y: 1.06, w: 0.04, d: 0.03, h: 0.11 },
      { k: 'porch', x: 0.92, y: 1.01, w: 0.18, d: 0.12, h: 0.15 },
    ],
    candies: [[0.5, 1.02], [0.75, 0.9]],
    stars: [GOAL, CANDY, NOHURT], sun0: 0.5, burn: 0.009, time: 60,
  },
  {
    key: 'truck', name: '트럭 지나가는 길', news: '트럭 — 지나가는 트럭 그림자를 타요', hint: '트럭 그림자가 인도까지 닿게 해를 맞추면 쭉 실려 가요',
    path: [[0.09, 1.0], [0.91, 1.0]],
    objs: [
      { k: 'porch', x: 0.075, y: 1.04, w: 0.17, d: 0.12, h: 0.15 },
      { k: 'truck', x: 0, y: 0.9, w: 0.26, d: 0.09, h: 0.17, v: 0.0042, per: 420, x0: 0 },
      { k: 'tree', x: 0.5, y: 0.955, h: 0.1, hc: 0.16, r: 0.065 },
      { k: 'porch', x: 0.925, y: 1.04, w: 0.17, d: 0.12, h: 0.15 },
    ],
    candies: [[0.4, 1.06], [0.62, 1.06]],
    stars: [GOAL, CANDY, NOHURT], sun0: 0.5, burn: 0.009, time: 60,
  },
  {
    key: 'sunset', name: '노을 언덕길', news: '해 질 녘 — 그림자가 아주 길어요', hint: '해가 낮아 그림자가 길어요 — 조금만 끌어도 멀리 돌아요',
    path: [[0.09, 1.12], [0.52, 1.12], [0.52, 0.84], [0.91, 0.84]],
    objs: [
      { k: 'porch', x: 0.075, y: 1.18, w: 0.17, d: 0.12, h: 0.15 },
      { k: 'tree', x: 0.21, y: 1.03, h: 0.1, hc: 0.16, r: 0.07 },
      { k: 'house', x: 0.38, y: 1.02, w: 0.16, d: 0.11, h: 0.13, roof: 0.05, col: 2 },
      { k: 'hedge', x: 0.465, y: 1.02, w: 0.04, d: 0.2, h: 0.06 },
      { k: 'mirror', x: 0.6, y: 1.05, face: -1, h: 0.15, r: 0.045 },
      { k: 'house', x: 0.74, y: 0.75, w: 0.22, d: 0.12, h: 0.15, roof: 0.06, col: 1 },
      { k: 'cloud', x: 0, y: 0.8, x0: 0.1, v: 0.0024, h: 0.06, r: 0.15 },
      { k: 'porch', x: 0.91, y: 0.9, w: 0.2, d: 0.12, h: 0.15 },
    ],
    candies: [[0.3, 1.18], [0.58, 0.95], [0.66, 0.79]],
    stars: [GOAL, CANDY, NOHURT], sun0: 0.5, lf: 1.35, burn: 0.01, time: 70,
  },
];
/**
 * 마을 꾸미기: 뒷줄 집·나무(지평선 바로 앞)와 맨 앞 덤불을 판마다 덧붙인다.
 * 뒷줄 그림자는 길(y ≥ 0.72)까지 닿지 않고, 맨 앞 덤불 그림자는 화면 아래로만 떨어진다 — 놀이는 그대로.
 */
function scenery(d: StageDef, i: number): StageDef {
  const extra: Obj[] = [];
  const busy = (x: number, y0: number, y1: number, r: number) => d.objs.some((o) => Math.abs(o.x - x) < (o.w ?? 0.1) / 2 + r && o.y > y0 && o.y - (o.d ?? 0.05) < y1);
  [0.1, 0.33, 0.6, 0.86].forEach((x, k) => {
    if (busy(x, 0.45, 0.76, 0.1)) return;
    if ((k + i) % 3 === 2) extra.push({ k: 'tree', x, y: 0.585, h: 0.09, hc: 0.14, r: 0.06 });
    else extra.push({ k: 'house', x, y: 0.58, w: 0.17, d: 0.07, h: 0.12, roof: 0.05, col: (k + i * 2) % 4 });
  });
  [0.06, 0.27, 0.5, 0.73, 0.95].forEach((x, k) => {
    if (busy(x, 1.18, 1.4, 0.06) || d.path.some((q) => Math.abs(q[0] - x) < 0.07 && q[1] > 1.22)) return;
    extra.push({ k: 'bush', x: x + ((i + k) % 2 ? 0.02 : -0.02), y: 1.315, r: 0.045 + ((i * 3 + k) % 3) * 0.008, h: 0.05 });
  });
  return { ...d, objs: [...d.objs, ...extra] };
}
export const STAGES: StageDef[] = STAGE_DEFS.map(scenery);
export const STAGE_COUNT = STAGES.length;

// ───────────────────────────── 기하 ─────────────────────────────
type Pt = [number, number];
type Poly = Pt[];
type Iv = [number, number];

/** 높이 1의 점이 땅에 떨어지는 그림자 벡터 */
function sunVec(u: number, lf = 1): Pt {
  const psi = u * Math.PI, L = (0.9 + 2.0 * Math.pow(Math.abs(u - 0.5) * 2, 1.6)) * lf;
  return [L * Math.cos(psi), L * C * Math.sin(psi)];
}
/** 해의 기울기(그림자 길이 배수) */
const sunLen = (u: number, lf = 1) => (0.9 + 2.0 * Math.pow(Math.abs(u - 0.5) * 2, 1.6)) * lf;

const cross = (ax: number, ay: number, bx: number, by: number) => ax * by - ay * bx;
function area(p: Poly) {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const q = p[i], r = p[(i + 1) % p.length];
    a += q[0] * r[1] - r[0] * q[1];
  }
  return a / 2;
}
/** 볼록 껍질 (모노톤 체인) — 넓이 양수 방향 */
function hull(pts: Pt[]): Poly {
  const P = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (P.length < 3) return P;
  const lo: Pt[] = [], up: Pt[] = [];
  for (const p of P) {
    while (lo.length >= 2 && cross(lo[lo.length - 1][0] - lo[lo.length - 2][0], lo[lo.length - 1][1] - lo[lo.length - 2][1], p[0] - lo[lo.length - 2][0], p[1] - lo[lo.length - 2][1]) <= 0) lo.pop();
    lo.push(p);
  }
  for (let i = P.length - 1; i >= 0; i--) {
    const p = P[i];
    while (up.length >= 2 && cross(up[up.length - 1][0] - up[up.length - 2][0], up[up.length - 1][1] - up[up.length - 2][1], p[0] - up[up.length - 2][0], p[1] - up[up.length - 2][1]) <= 0) up.pop();
    up.push(p);
  }
  lo.pop();
  up.pop();
  const h = lo.concat(up);
  return area(h) < 0 ? h.reverse() : h;
}
/** 땅 위 타원(그림자): 가운데 (cx,cy), 땅에서 잰 반지름 a(그림자 방향)·b(가로), 방향 psi */
function ellPoly(cx: number, cy: number, a: number, b: number, psi: number, n = 14): Poly {
  const out: Poly = [], c = Math.cos(psi), s = Math.sin(psi);
  for (let k = 0; k < n; k++) {
    const th = (k / n) * Math.PI * 2, ca = Math.cos(th), sa = Math.sin(th);
    out.push([cx + a * ca * c - b * sa * s, cy + C * (a * ca * s + b * sa * c)]);
  }
  return area(out) < 0 ? out.reverse() : out;
}
function inPoly(p: Poly, x: number, y: number) {
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length];
    if (cross(b[0] - a[0], b[1] - a[1], x - a[0], y - a[1]) < 0) return false;
  }
  return p.length >= 3;
}
/** 선분 (x0,y0)→(x1,y1) 가운데 볼록 다각형 안에 든 t 구간 */
function clipSeg(p: Poly, x0: number, y0: number, x1: number, y1: number): Iv | null {
  let t0 = 0, t1 = 1;
  const dx = x1 - x0, dy = y1 - y0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length], ex = b[0] - a[0], ey = b[1] - a[1];
    const n0 = cross(ex, ey, x0 - a[0], y0 - a[1]), n1 = cross(ex, ey, dx, dy);
    if (Math.abs(n1) < 1e-12) {
      if (n0 < 0) return null;
      continue;
    }
    const t = -n0 / n1;
    if (n1 > 0) t0 = Math.max(t0, t);
    else t1 = Math.min(t1, t);
    if (t0 > t1) return null;
  }
  return [t0, t1];
}
function mergeIv(iv: Iv[]): Iv[] {
  if (iv.length < 2) return iv;
  iv.sort((a, b) => a[0] - b[0]);
  const out: Iv[] = [[iv[0][0], iv[0][1]]];
  for (let i = 1; i < iv.length; i++) {
    const l = out[out.length - 1];
    if (iv[i][0] <= l[1] + 0.015) l[1] = Math.max(l[1], iv[i][1]);
    else out.push([iv[i][0], iv[i][1]]);
  }
  return out;
}
function subIv(a: Iv[], cut: Iv[]): Iv[] {
  if (!cut.length) return a;
  let cur = a;
  for (const [c0, c1] of cut) {
    const nx: Iv[] = [];
    for (const [a0, a1] of cur) {
      if (c1 <= a0 || c0 >= a1) nx.push([a0, a1]);
      else {
        if (c0 > a0) nx.push([a0, c0]);
        if (c1 < a1) nx.push([c1, a1]);
      }
    }
    cur = nx;
  }
  return cur;
}

/** 길 (꺾은선) */
interface Path { pts: number[][]; cum: number[]; len: number }
function mkPath(pts: number[][]): Path {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, cum, len: cum[cum.length - 1] };
}
function pathAt(P: Path, p: number): Pt {
  p = Math.max(0, Math.min(P.len, p));
  for (let i = 1; i < P.pts.length; i++) {
    if (p <= P.cum[i] || i === P.pts.length - 1) {
      const L = P.cum[i] - P.cum[i - 1] || 1e-9, t = (p - P.cum[i - 1]) / L;
      return [P.pts[i - 1][0] + (P.pts[i][0] - P.pts[i - 1][0]) * t, P.pts[i - 1][1] + (P.pts[i][1] - P.pts[i - 1][1]) * t];
    }
  }
  return [P.pts[0][0], P.pts[0][1]];
}
/** 점에서 가장 가까운 길 위 거리 */
function pathProj(P: Path, x: number, y: number) {
  let best = 0, bd = 1e9;
  for (let i = 1; i < P.pts.length; i++) {
    const [ax, ay] = P.pts[i - 1], [bx, by] = P.pts[i], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1e-9;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2)), qx = ax + dx * t, qy = ay + dy * t, d = Math.hypot(x - qx, y - qy);
    if (d < bd) (bd = d), (best = P.cum[i - 1] + t * Math.sqrt(L2));
  }
  return best;
}
function polyIv(P: Path, poly: Poly, out: Iv[]) {
  if (poly.length < 3) return;
  for (let i = 1; i < P.pts.length; i++) {
    const [ax, ay] = P.pts[i - 1], [bx, by] = P.pts[i];
    const c = clipSeg(poly, ax, ay, bx, by);
    if (c && c[1] > c[0]) {
      const L = P.cum[i] - P.cum[i - 1];
      out.push([P.cum[i - 1] + c[0] * L, P.cum[i - 1] + c[1] * L]);
    }
  }
}

const isDyn = (o: Obj) => o.k === 'cloud' || o.k === 'laundry' || o.k === 'truck';

/** 물건 하나의 그림자 다각형들 (해 u, 세계 시각 wt) */
function shadowOf(o: Obj, u: number, lf: number, wt: number, out: Poly[]) {
  const [vx, vy] = sunVec(u, lf), psi = u * Math.PI, Lf = sunLen(u, lf);
  const at = (x: number, y: number, h: number): Pt => [x + h * vx, y + h * vy];
  switch (o.k) {
    case 'porch': {
      // 지붕 있는 현관: 늘 그늘 (해와 무관)
      const w = o.w!, d = o.d!;
      out.push(hull([[o.x - w / 2, o.y - d], [o.x + w / 2, o.y - d], [o.x + w / 2, o.y], [o.x - w / 2, o.y]]));
      return;
    }
    case 'tree': {
      const tw = 0.008, top = o.hc! - o.r! * 0.4;
      out.push(hull([[o.x - tw, o.y], [o.x + tw, o.y], at(o.x - tw, o.y, top), at(o.x + tw, o.y, top)]));
      const r = o.r!, [cx, cy] = at(o.x, o.y - 0.004, o.hc!);
      out.push(ellPoly(cx, cy, r * Math.sqrt(1 + Lf * Lf), r, psi));
      return;
    }
    case 'bush': {
      const r = o.r!, [cx, cy] = at(o.x, o.y - r * C * 0.5, o.h! * 0.55);
      out.push(hull([...ellPoly(o.x, o.y - r * C * 0.5, r, r, 0, 10), ...ellPoly(cx, cy, r * Math.sqrt(1 + Lf * Lf * 0.3), r, psi, 10)]));
      return;
    }
    case 'parasol': {
      const tw = 0.006;
      out.push(hull([[o.x - tw, o.y], [o.x + tw, o.y], at(o.x - tw, o.y, o.h!), at(o.x + tw, o.y, o.h!)]));
      const [cx, cy] = at(o.x, o.y, o.h!);
      out.push(ellPoly(cx, cy, o.r!, o.r!, 0));
      return;
    }
    case 'house': case 'hedge': case 'wall': case 'mail': {
      const w = o.w!, d = o.d ?? 0.02, h = o.h!, x0 = o.x - w / 2, x1 = o.x + w / 2, y0 = o.y - d, y1 = o.y;
      const pts: Pt[] = [[x0, y0], [x1, y0], [x1, y1], [x0, y1], at(x0, y0, h), at(x1, y0, h), at(x1, y1, h), at(x0, y1, h)];
      if (o.roof) pts.push(at(o.x, y0, h + o.roof), at(o.x, y1, h + o.roof));
      if (o.k === 'mail') {
        // 기둥 위 우체통: 기둥은 가늘다
        const bh = 0.045;
        out.push(hull([[o.x - 0.005, o.y], [o.x + 0.005, o.y], at(o.x - 0.005, o.y, h - bh), at(o.x + 0.005, o.y, h - bh)]));
        out.push(hull([at(x0, y0, h - bh), at(x1, y0, h - bh), at(x1, y1, h - bh), at(x0, y1, h - bh), at(x0, y0, h), at(x1, y0, h), at(x1, y1, h), at(x0, y1, h)]));
        return;
      }
      out.push(hull(pts));
      return;
    }
    case 'cloud': {
      const cx = cloudX(o, wt), [sx, sy] = at(cx, o.y, o.h!);
      out.push(ellPoly(sx, sy, o.r!, o.r! * 0.85, 0));
      return;
    }
    case 'truck': {
      const tx = truckX(o, wt);
      if (tx < -0.6 || tx > 1.6) return;
      const w = o.w!, d = o.d!, h = o.h!, x0 = tx - w / 2, x1 = tx + w / 2, y0 = o.y - d, y1 = o.y;
      out.push(hull([[x0, y0], [x1, y0], [x1, y1], [x0, y1], at(x0, y0, h), at(x1, y0, h), at(x1, y1, h), at(x0, y1, h)]));
      return;
    }
    case 'laundry': {
      // 빨랫줄에 넌 이불: 바람에 앞뒤로 흔들린다(줄을 축으로 돎) → 그림자 아래 끝이 오르내린다
      const th = laundrySwing(o, wt), w = o.w!, h = o.h!, len = o.d!;
      const x0 = o.x - w / 2, x1 = o.x + w / 2, by = o.y + len * Math.sin(th), bh = h - len * Math.cos(th);
      out.push(hull([at(x0, o.y, h), at(x1, o.y, h), at(x1, by, bh), at(x0, by, bh)]));
      return;
    }
    case 'mirror': {
      const tw = 0.005;
      out.push(hull([[o.x - tw, o.y], [o.x + tw, o.y], at(o.x - tw, o.y, o.h!), at(o.x + tw, o.y, o.h!)]));
      return;
    }
  }
}
/** 볼록거울이 되비춘 빛 동그라미 (없으면 null) — 그림자와 거꾸로(좌우가 뒤집혀) 움직인다 */
function beamOf(o: Obj, u: number, lf: number): Poly | null {
  if (o.k !== 'mirror') return null;
  const [vx, vy] = sunVec(u, lf), f = o.face!;
  // 왼쪽을 보는 거울은 해가 왼쪽에 있을 때(빛이 오른쪽으로 갈 때)만 비춘다
  const k = -f * vx;
  if (k < 0.25) return null;
  const Lf = sunLen(u, lf), rx = o.x - f * 0.012, cx = rx - o.h! * vx * 0.95, cy = o.y + o.h! * vy * 0.95;
  const r = o.r!;
  return ellPoly(cx, cy, r * Math.sqrt(1 + Lf * Lf) * 0.8, r, Math.atan2(vy / C, -vx));
}
const cloudX = (o: Obj, wt: number) => {
  const span = 1.9, x = o.x0! + o.v! * wt;
  return ((((x + 0.45) % span) + span) % span) - 0.45;
};
const truckX = (o: Obj, wt: number) => {
  const per = o.per!, ph = (((wt + (o.x0 ?? 0)) % per) + per) % per;
  return o.v! > 0 ? -0.4 + ph * o.v! : 1.4 + ph * o.v!;
};
/** 이불의 흔들림 각도 (+ = 앞으로) */
const laundrySwing = (o: Obj, wt: number) => Math.sin((wt * Math.PI * 2) / o.per! + (o.x0 ?? 0)) * (o.amp ?? 0.6);

// ── 해 격자마다 고정 물건 그림자를 한 번만 계산 ──
interface Cov { iv: Iv[]; beam: Iv[]; candy: boolean[]; candyBeam: boolean[] }
const COV = new Map<string, (Cov | undefined)[]>();
interface Geo { key: string; def: StageDef; path: Path; objs: Obj[]; cand: { x: number; y: number; p: number }[]; dyn: Obj[]; stat: Obj[] }
const GEO = new Map<string, Geo>();
function geoOf(stage: number, flip: boolean): Geo {
  const key = `${stage}:${flip ? 1 : 0}`;
  let g = GEO.get(key);
  if (g) return g;
  const d = STAGES[stage], F = (x: number) => (flip ? 1 - x : x);
  const objs = d.objs.map((o) => ({ ...o, x: F(o.x), face: o.face ? ((flip ? -o.face : o.face) as -1 | 1) : undefined, v: o.v !== undefined ? (flip ? -o.v : o.v) : undefined, x0: o.x0 !== undefined && o.k === 'cloud' && flip ? 1 - o.x0 : o.x0 }));
  const path = mkPath(d.path.map(([x, y]) => [F(x), y]));
  const cand = d.candies.map(([x, y]) => ({ x: F(x), y, p: pathProj(path, F(x), y) }));
  g = { key, def: d, path, objs, cand, dyn: objs.filter(isDyn), stat: objs.filter((o) => !isDyn(o)) };
  GEO.set(key, g);
  return g;
}
const uIdx = (u: number) => Math.max(0, Math.min(NU, Math.round(u * NU)));
function staticCov(G: Geo, ui: number): Cov {
  let arr = COV.get(G.key);
  if (!arr) COV.set(G.key, (arr = []));
  const hit = arr[ui];
  if (hit) return hit;
  const u = ui / NU, lf = G.def.lf ?? 1, polys: Poly[] = [], beams: Poly[] = [];
  for (const o of G.stat) {
    shadowOf(o, u, lf, 0, polys);
    const b = beamOf(o, u, lf);
    if (b) beams.push(b);
  }
  const iv: Iv[] = [], bv: Iv[] = [];
  for (const p of polys) polyIv(G.path, p, iv);
  for (const b of beams) polyIv(G.path, b, bv);
  const c: Cov = {
    iv: mergeIv(iv), beam: mergeIv(bv),
    candy: G.cand.map((q) => polys.some((p) => inPoly(p, q.x, q.y))),
    candyBeam: G.cand.map((q) => beams.some((b) => inPoly(b, q.x, q.y))),
  };
  arr[ui] = c;
  return c;
}
function dynPolys(G: Geo, u: number, wt: number): Poly[] {
  const out: Poly[] = [];
  for (const o of G.dyn) shadowOf(o, u, G.def.lf ?? 1, wt, out);
  return out;
}
/** 지금 해 자리·시각에서 길 위 그늘 구간들 */
function coverAt(G: Geo, ui: number, wt: number): Iv[] {
  const c = staticCov(G, ui);
  if (!G.dyn.length) return c.beam.length ? subIv(c.iv, c.beam) : c.iv;
  const iv: Iv[] = c.iv.map((q) => [q[0], q[1]] as Iv);
  for (const p of dynPolys(G, ui / NU, wt)) polyIv(G.path, p, iv);
  return subIv(mergeIv(iv), c.beam);
}
function candyShaded(G: Geo, ui: number, wt: number, j: number) {
  const c = staticCov(G, ui);
  if (c.candyBeam[j]) return false;
  if (c.candy[j]) return true;
  if (!G.dyn.length) return false;
  const q = G.cand[j];
  return dynPolys(G, ui / NU, wt).some((p) => inPoly(p, q.x, q.y));
}
const ivAt = (C2: Iv[], p: number) => C2.find((q) => q[0] - 1e-6 <= p && p <= q[1] + 1e-6) ?? null;

// ───────────────────────────── 상태 ─────────────────────────────
interface Ev { t: number; kind: string; x: number; y: number; n?: number; text?: string }
export interface GhostState {
  rng: Rng; seed: number; t: number; wt: number; stage: number; flip: boolean; phase: 'play' | 'result'; pt: number; ok: boolean; why: string;
  hearts: number; stars: number; got: number; starOk: boolean[]; pts: number; won: boolean; dead: boolean; again: boolean; tries: number;
  /** 해 */
  u: number; aimU: number | null; down: boolean;
  /** 유령: 길 위 거리 · 몸 크기 · 햇빛에 닿은 틱 · 이번 미끄러짐 거리 */
  p: number; sz: number; hot: number; hurt: number; glide: number; glideBig: boolean; moving: number; face: number;
  taken: boolean[]; candies: number; started: boolean; firstPress: number; firstBig: number; wows: number;
  /** 이번 판에서 처음 누른 때(판 시작부터 틱, 안 눌렀으면 -1) — 시작 카드·NEW 스포트라이트를 일찍 치운다 */
  pressAt: number;
  /** 이번 판 시간(틱) */
  st: number;
  seen: Set<string>; newsQ: string[]; news: { text: string; t: number } | null;
  events: Ev[];
  /** 연출용 (시뮬레이션 결과와 무관) */
  mood: number; moodT: number; catT: number; granT: number; prevU: number; swing: number;
}
const ev = (s: GhostState, kind: string, x: number, y: number, n?: number, text?: string) => s.events.push({ t: s.t, kind, x, y, n, text });
function see(s: GhostState, key: string, text: string) {
  if (!key || s.seen.has(key)) return;
  s.seen.add(key);
  if (text) s.newsQ.push(text);
}
const geo = (s: GhostState) => geoOf(s.stage, s.flip);

function newStage(s: GhostState) {
  const d = STAGES[s.stage];
  if (!s.again) s.flip = s.stage > 0 && s.rng() < 0.5;
  const G = geo(s);
  s.u = s.flip ? 1 - d.sun0 : d.sun0;
  s.aimU = null;
  s.down = false;
  s.p = 0;
  s.sz = 1;
  s.hot = 0;
  s.hurt = 0;
  s.glide = 0;
  s.glideBig = false;
  s.moving = 0;
  s.taken = G.cand.map(() => false);
  s.candies = 0;
  s.st = 0;
  s.phase = 'play';
  s.pt = 0;
  s.pressAt = -1;
  s.starOk = d.stars.map(() => false);
  s.wt = s.stage === 0 ? 0 : Math.floor(s.rng() * 600);
  s.prevU = s.u;
  see(s, d.key, '');
  // 시작하자마자 이미 그늘이면 그 끝까지는 미리 가 있는다 (첫 장면: 그늘 끝에서 발 동동)
  const iv = ivAt(coverAt(G, uIdx(s.u), s.wt), 0);
  if (iv && iv[1] - MARGIN > 0) s.p = Math.min(iv[1] - MARGIN, G.path.len);
}

function starMet(s: GhostState, st: Star) {
  switch (st.k) {
    case 'goal': return true;
    case 'candy': return s.candies >= s.taken.length;
    case 'nohurt': return s.hurt <= 6;
  }
}

function endStage(s: GhostState, ok: boolean, why: string) {
  if (s.phase !== 'play') return;
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  s.why = why;
  s.down = false;
  s.aimU = null;
  const d = STAGES[s.stage];
  const [gx, gy] = pathAt(geo(s).path, s.p);
  if (ok) {
    s.starOk = d.stars.map((q) => starMet(s, q));
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    // 판이 갈수록 별 값이 커진다 (1판 ×1 … 8판 ×2.75)
    s.pts += Math.round((CLEAR_PTS + s.got * STAR_PTS) * (1 + 0.25 * s.stage));
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    s.mood = 2;
    s.moodT = 999;
    ev(s, 'clear', gx, gy);
  } else {
    s.hearts--;
    s.tries++;
    s.mood = 4;
    s.moodT = 999;
    ev(s, 'fail', gx, gy, 0, why);
  }
}

/** 유령 한 틱: 그늘 끝까지 미끄러지고, 햇빛에 닿으면 줄어들며 가까운 그늘로 허둥지둥 */
function ghostStep(s: GhostState) {
  const G = geo(s), d = G.def, L = G.path.len, ui = uIdx(s.u);
  const cov = coverAt(G, ui, s.wt), cur = ivAt(cov, s.p);
  const p0 = s.p;
  if (cur) {
    const end = cur[1] >= L - 0.02 ? L : cur[1] - MARGIN;
    if (end > s.p + 1e-4) {
      const v = Math.min(VMAX, VMIN + KV * (end - s.p));
      s.p = Math.min(end, s.p + v);
    } else if (end < s.p - 1e-4) s.p = Math.max(cur[0], s.p - Math.min(VMAX, Math.max(VMIN, s.p - end)));
    s.sz = Math.min(1, s.sz + REGEN);
    s.hot = 0;
  } else {
    // 햇빛! 가까운 그늘 쪽으로 허둥지둥
    let best = -1, bd = 1e9;
    for (const [a, b] of cov) {
      const q = s.p < a ? a + 0.01 : b - 0.01, dd = Math.abs(q - s.p);
      if (dd < bd && dd < PANIC_R) (bd = dd), (best = q);
    }
    if (best >= 0) s.p += Math.sign(best - s.p) * Math.min(VPANIC, Math.abs(best - s.p));
    s.sz -= d.burn;
    s.hurt++;
    if (s.hot === 0) {
      const [x, y] = pathAt(G.path, s.p);
      ev(s, 'hot', x, y);
    }
    s.hot++;
  }
  const dp = s.p - p0;
  s.moving = dp;
  if (Math.abs(dp) > 1e-4) s.face = dp > 0 ? 1 : -1;
  // 미끄러짐 길이 (큰 순간)
  if (dp > 1e-4) {
    s.glide += dp;
    if (!s.glideBig && s.glide >= BIG_GLIDE && s.started) {
      s.glideBig = true;
      s.wows++;
      if (s.firstBig < 0) s.firstBig = s.t;
      const [x, y] = pathAt(G.path, s.p);
      ev(s, 'bridge', x, y, Math.round(s.glide * 100));
    }
  } else if (dp <= 1e-4) {
    if (s.glideBig) {
      const [x, y] = pathAt(G.path, s.p);
      ev(s, 'land', x, y, Math.round(s.glide * 100));
    }
    s.glide = 0;
    s.glideBig = false;
  }
  // 별사탕: 그늘 속에 있을 때만 쏙
  for (let j = 0; j < G.cand.length; j++) {
    if (s.taken[j] || Math.abs(s.p - G.cand[j].p) > PICK) continue;
    if (candyShaded(G, ui, s.wt, j)) {
      s.taken[j] = true;
      s.candies++;
      s.pts += CANDY_PTS;
      ev(s, 'candy', G.cand[j].x, G.cand[j].y, s.candies, s.candies >= G.cand.length ? 'all' : '');
    }
  }
  if (s.p >= L - 0.004) return endStage(s, true, '');
  if (s.sz <= FAIL_SZ) return endStage(s, false, '햇빛에 녹아 버렸어요');
  if (s.st >= d.time * 60) return endStage(s, false, '시간이 다 됐어요');
}

function cosmetic(s: GhostState) {
  if (s.moodT > 0 && --s.moodT === 0) s.mood = 0;
  s.swing = s.swing * 0.85 + (s.u - s.prevU) * 0.15 * 60;
  s.prevU = s.u;
  s.events = s.events.filter((e) => s.t - e.t < 90);
  if (!s.news || s.t - s.news.t > NEWS_T) s.news = s.newsQ.length ? { text: s.newsQ.shift()!, t: s.t } : s.news;
}

export const shadowghost: GameDef<GhostState> & { wows: (s: GhostState) => number } = {
  id: 'shadowghost',
  name: '그림자 길 유령 꼬마',
  genes: ['sunshadow', 'pointer', 'chain'],
  twist: '해를 끌면 마을의 모든 그림자가 한꺼번에 돌아서, 한 그림자를 길에 이으면 다른 그림자는 유령 발밑에서 빠져나간다 — 어느 그늘을 먼저 잇고 무엇을 아낄지 고르는 그림자 다리 놓기',
  rules: [
    '누른 채 끌면 해가 손가락을 따라가고, 마을의 그림자가 모두 돌아요.',
    '유령은 그림자 위로만 걸어요. 햇빛에 닿으면 몸이 줄어요(너무 줄면 하트 -1).',
    '길 옆 별사탕은 그늘 속에 있을 때만 주워요. 장난감까지 데려다 주면 다음 판!',
  ],
  controls: 'touch',
  hint: '누른 채 끌면 해가 따라와요 / 화살표로 겨누고 스페이스',
  aspect: A,
  art: {
    concept: '한낮의 파스텔 골목 디오라마 — 해를 끌면 그림자가 도는 마을',
    mood: '하늘색 하늘에 뭉게구름, 주황 지붕과 초록 나무, 따뜻한 돌길. 해를 끌면 보랏빛 투명 그림자들이 시계바늘처럼 한꺼번에 돌고, 하얀 꼬마 유령이 그늘을 따라 슝 미끄러진다. 담장 위 고양이와 창가 할머니가 구경한다.',
    palette: { bg: '#bfe6ff', ink: '#3a2c4a', muted: '#8a7fa8', accent: '#ffb347', hot: '#ff6b5a', soft: '#fff4dc' },
  },
  reveals: (s) => s.seen.size,
  guard: (s) => Math.round(s.sz * 100),
  cleared: (s) => (s.phase === 'result' && s.ok ? { stage: s.stage, got: s.got, of: s.starOk.length } : null),
  wows: (s) => s.wows,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, wt: 0, stage: 0, flip: false, phase: 'play', pt: 0, ok: false, why: '',
      hearts: 3, stars: 0, got: 0, starOk: [], pts: 0, won: false, dead: false, again: false, tries: 0,
      u: 0.5, aimU: null, down: false, p: 0, sz: 1, hot: 0, hurt: 0, glide: 0, glideBig: false, moving: 0, face: 1,
      taken: [], candies: 0, started: false, firstPress: -1, firstBig: -1, wows: 0, st: 0, pressAt: -1,
      seen: new Set<string>(), newsQ: [], news: null, events: [],
      mood: 0, moodT: 0, catT: -999, granT: -999, prevU: 0.5, swing: 0,
    } as GhostState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    const p = inp.pointer ?? null;
    if (s.phase === 'play') {
      if (p) {
        if (!s.down) {
          s.down = true;
          if (s.firstPress < 0) s.firstPress = s.t;
          if (s.pressAt < 0) s.pressAt = s.pt;
          s.started = true;
        }
        s.aimU = uOf(p.x);
      } else {
        s.down = false;
        s.aimU = null;
      }
      if (s.aimU !== null) {
        const du = s.aimU - s.u;
        s.u += Math.sign(du) * Math.min(SUNV, Math.abs(du));
      }
      // 1판은 첫 손짓 전엔 세상이 기다린다 (구름·트럭·시간)
      if (s.started || s.stage > 0) {
        s.wt++;
        s.st++;
      }
      ghostStep(s);
      cosmetic(s);
      s.pt++;
      return;
    }
    s.down = false;
    s.aimU = null;
    s.pt++;
    cosmetic(s);
    if (s.pt >= (s.ok ? RESULT_OK : RESULT_FAIL)) {
      if (s.ok) {
        if (s.won) s.dead = true;
        else (s.again = false), s.stage++, newStage(s);
      } else if (s.hearts <= 0) s.dead = true;
      else (s.again = true), newStage(s);
    }
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
const aimAt = (u: number): Input => ({ tap: false, dir: 0, pointer: { x: sunX(u), y: 0.2 } });

interface Plan { u: number; v: number }
/**
 * 해를 u로 옮기면: 가는 동안 유령이 햇빛에 닿는 틱 · 옮긴 뒤 갈 수 있는 거리 · 별사탕 득실 · 조금 뒤에도 그늘인가.
 * relax(0~1): 오래 못 가고 있으면 별사탕을 놓치거나 조금 데는 것도 받아들인다.
 */
function judge(s: GhostState, u: number, opt: { candy: boolean; sweep: boolean; ahead: number }, relax: number): Plan {
  const G = geo(s), L = G.path.len, ui = uIdx(u), u0i = uIdx(s.u);
  let burn = 0;
  if (opt.sweep && ui !== u0i) {
    const step = ui > u0i ? 6 : -6, ticks = Math.abs(ui - u0i) / (SUNV * NU);
    let n = 0, bad = 0;
    for (let k = u0i; step > 0 ? k < ui : k > ui; k += step) {
      n++;
      if (!ivAt(coverAt(G, k, s.wt), s.p)) bad++;
    }
    burn = n ? (bad / n) * ticks : 0;
  }
  const arrive = Math.ceil(Math.abs(ui - u0i) / (SUNV * NU));
  const cov = coverAt(G, ui, s.wt + arrive), cur = ivAt(cov, s.p);
  if (!cur) return { u, v: -1000 - burn * 10 };
  const end = cur[1] >= L - 0.02 ? L : cur[1] - MARGIN;
  let v = 100 * Math.max(0, end - s.p) - burn * 12 * (1 - 0.7 * relax);
  if (end >= L) v += 400;
  if (opt.candy)
    for (let j = 0; j < G.cand.length; j++) {
      if (s.taken[j]) continue;
      const cp = G.cand[j].p;
      if (cp < s.p - PICK) continue;
      const sh = candyShaded(G, ui, s.wt + arrive, j);
      if (end >= cp - PICK + 0.004 && sh) v += 60;
      else if (end > cp + PICK && !sh) v -= 140 * (1 - relax);
    }
  // 움직이는 그늘: 조금 뒤에도 유령이 설 자리가 그늘인가
  if (opt.ahead > 0 && G.dyn.length) {
    const later = coverAt(G, ui, s.wt + arrive + opt.ahead), stop = Math.min(end, s.p + VMAX * opt.ahead);
    if (!ivAt(later, stop)) v -= 160 * (1 - 0.6 * relax);
  }
  return { u, v };
}
const mem = new WeakMap<object, { tgt: number | null; next: number; p: number; since: number; stage: number }>();
function planBot(s: GhostState, opt: { candy: boolean; sweep: boolean; ahead: number }, every: number): Input {
  if (s.phase !== 'play') return NO;
  let m = mem.get(s);
  if (!m) mem.set(s, (m = { tgt: null, next: 0, p: s.p, since: s.t, stage: -1 }));
  if (m.stage !== s.stage * 10 + s.tries || s.p > m.p + 0.01) (m.p = s.p), (m.since = s.t), (m.stage = s.stage * 10 + s.tries);
  if (m.tgt !== null) {
    if (Math.abs(s.u - m.tgt) < 0.004) m.tgt = null;
    else return aimAt(m.tgt);
  }
  if (s.t < m.next && s.hot === 0) return NO;
  m.next = s.t + every;
  const relax = Math.min(1, Math.max(0, (s.t - m.since - 150) / 300));
  const here = judge(s, s.u, opt, relax);
  let best = here;
  for (let k = 0; k <= 40; k++) {
    const j = judge(s, k / 40, opt, relax);
    if (j.v > best.v + 1) best = j;
  }
  if (best === here || Math.abs(best.u - s.u) < 0.004) return NO;
  m.tgt = best.u;
  return aimAt(best.u);
}

// ── 잘하는 봇: 고정 그림자 판은 길 찾기(해 옮기기 순서 탐색), 움직이는 그림자 판은 짧은 미리 돌려 보기 ──
const US = [...Array(41).keys()].map((i) => i * 10);
/** 해를 a→b로 옮기는 동안 p가 햇빛에 드러나는 격자 칸 수 */
function sweepBad(G: Geo, a: number, b: number, p: number, wt: number) {
  const st = a < b ? 4 : -4;
  let bad = 0;
  for (let x = a; st > 0 ? x < b : x > b; x += st) if (!ivAt(coverAt(G, x, wt), p)) bad++;
  return bad + (ivAt(coverAt(G, b, wt), p) ? 0 : 3);
}
/** 해를 ui에 두면 유령이 멈출 자리와 그동안 덴 틱 (발밑이 햇빛이면 가까운 그늘로 허둥지둥 간 뒤) */
function restAt(G: Geo, ui: number, p: number, wt: number): { r: number; burn: number } | null {
  const cov = coverAt(G, ui, wt);
  let iv = ivAt(cov, p), burn = 0;
  if (!iv) {
    let bq = -1, bd = 1e9;
    for (const [a, b] of cov) {
      const q = p < a ? a + 0.01 : b - 0.01, dd = Math.abs(q - p);
      if (dd < bd && dd < PANIC_R) (bd = dd), (bq = q);
    }
    if (bq < 0) return null;
    burn = Math.ceil(bd / VPANIC);
    p = bq;
    iv = ivAt(cov, p);
    if (!iv) return null;
  }
  return { r: Math.max(p, iv[1] >= G.path.len - 0.02 ? G.path.len : iv[1] - MARGIN), burn };
}
/** 고정 그림자 판: (멈춘 자리, 해 자리, 주운 별사탕)에서 장난감까지 — 옮기는 수 + 덴 칸 + 놓친 별사탕이 가장 적은 해 순서 */
const ROUTE = new Map<string, number[] | null>();
function route(G: Geo, p0: number, u0: number, mask0: number, wt: number): number[] | null {
  const key = `${G.key}:${Math.round(p0 * 200)}:${u0}:${mask0}`;
  if (ROUTE.has(key)) return ROUTE.get(key)!;
  const nC = G.cand.length, full = (1 << nC) - 1, L = G.path.len, burnW = G.def.stars.some((q) => q.k === 'nohurt') ? 25 : 3;
  type N = { p: number; u: number; m: number; c: number; plan: number[] };
  const best = new Map<string, number>();
  let q: N[] = [{ p: p0, u: u0, m: mask0, c: 0, plan: [] }], found: N | null = null;
  for (let depth = 0; depth < 10 && q.length; depth++) {
    const nx: N[] = [];
    for (const n of q) {
      if (n.p >= L - 0.004) {
        const c = n.c + 60 * (nC - popc(n.m & full));
        if (!found || c < found.c) found = { ...n, c };
        continue;
      }
      for (const u of US) {
        if (u === n.u) continue;
        const rs = restAt(G, u, n.p, wt);
        if (rs === null || rs.r < n.p + 0.006) continue;
        const r = rs.r, bad = sweepBad(G, n.u, u, n.p, wt) + rs.burn * 3;
        let m = n.m;
        for (let j = 0; j < nC; j++) if (!((m >> j) & 1) && G.cand[j].p + PICK >= n.p && G.cand[j].p - PICK <= r && candyShaded(G, u, wt, j)) m |= 1 << j;
        const c = n.c + 1 + burnW * bad, k = `${Math.round(r * 200)}:${u}:${m}`;
        if ((best.get(k) ?? 1e9) <= c) continue;
        best.set(k, c);
        nx.push({ p: r, u, m, c, plan: [...n.plan, u] });
      }
    }
    // 가지치기: 비용이 낮은 것만 남긴다
    nx.sort((a, b) => a.c - b.c || b.p - a.p);
    q = nx.slice(0, 260);
  }
  const plan = found ? found.plan : null;
  ROUTE.set(key, plan);
  return plan;
}
const popc = (m: number) => {
  let c = 0;
  for (; m; m &= m - 1) c++;
  return c;
};
/** 움직이는 그림자 판: 해를 u에 두고 n틱 미리 돌려 본 유령 (자리·덴 틱·주운 별사탕·다 왔나) */
function rollout(s: GhostState, u: number, n: number) {
  const G = geo(s), L = G.path.len, ui = uIdx(u);
  let p = s.p, su = s.u, burn = 0, got = 0, wt = s.wt, done = false, sz = s.sz;
  const taken = s.taken.slice();
  for (let k = 0; k < n; k++) {
    wt++;
    su += Math.sign(u - su) * Math.min(SUNV, Math.abs(u - su));
    const qi = Math.abs(u - su) < 1e-9 ? ui : uIdx(su), cov = coverAt(G, qi, wt), cur = ivAt(cov, p);
    if (cur) {
      const end = cur[1] >= L - 0.02 ? L : cur[1] - MARGIN;
      if (end > p + 1e-4) p = Math.min(end, p + Math.min(VMAX, VMIN + KV * (end - p)));
      else if (end < p - 1e-4) p = Math.max(cur[0], p - Math.min(VMAX, Math.max(VMIN, p - end)));
      sz = Math.min(1, sz + REGEN);
    } else {
      burn++;
      sz -= G.def.burn;
      let bq = -1, bd = 1e9;
      for (const [a, b] of cov) {
        const q = p < a ? a + 0.01 : b - 0.01, dd = Math.abs(q - p);
        if (dd < bd && dd < PANIC_R) (bd = dd), (bq = q);
      }
      if (bq >= 0) p += Math.sign(bq - p) * Math.min(VPANIC, Math.abs(bq - p));
    }
    for (let j = 0; j < G.cand.length; j++) if (!taken[j] && Math.abs(p - G.cand[j].p) <= PICK && candyShaded(G, qi, wt, j)) (taken[j] = true), got++;
    if (p >= L - 0.004) {
      done = true;
      break;
    }
    if (sz <= FAIL_SZ) break;
  }
  // 지나쳐 버린(못 주운) 별사탕
  let lost = 0;
  for (let j = 0; j < G.cand.length; j++) if (!taken[j] && G.cand[j].p + PICK < p) lost++;
  return { p, burn, got, lost, done, sz };
}
const smartMem = new WeakMap<object, { tgt: number | null; next: number; plan: number[] | null; key: string; step: number; p: number; since: number }>();
/** 봇: 고정 그림자 판은 해 옮기기 순서를 끝까지 찾아 그대로, 움직이는 그림자 판은 해 자리마다 2초를 미리 돌려 본다 */
export const shadowghostSmart: Bot<GhostState> = {
  name: '그늘 길 내다보기',
  act(s) {
    if (s.phase !== 'play') return NO;
    const G = geo(s);
    let m = smartMem.get(s);
    const key = `${s.stage}:${s.tries}`;
    if (!m || m.key !== key) smartMem.set(s, (m = { tgt: null, next: 0, plan: null, key, step: 0, p: s.p, since: s.t }));
    if (s.p > m.p + 0.01) (m.p = s.p), (m.since = s.t);
    if (m.tgt !== null) {
      if (Math.abs(s.u - m.tgt) < 0.004) m.tgt = null;
      else return aimAt(m.tgt);
    }
    if (!G.dyn.length) {
      // 유령이 멈출 때까지 기다렸다가 다음 수
      if (Math.abs(s.moving) > 1e-4 && s.hot === 0) return NO;
      let mask = 0;
      s.taken.forEach((q, j) => q && (mask |= 1 << j));
      const plan = route(G, s.p, uIdx(s.u), mask, s.wt);
      if (!plan || !plan.length) return planBot(s, { candy: true, sweep: true, ahead: 0 }, 9);
      m.tgt = plan[0] / NU;
      return aimAt(m.tgt);
    }
    if (s.t < m.next && s.hot === 0) return NO;
    m.next = s.t + 12;
    const wait = Math.min(1, Math.max(0, (s.t - m.since - 240) / 360));
    const opts = new Set<number>([s.u]);
    for (let k = 0; k <= 20; k++) opts.add(k / 20);
    let best = s.u, bv = -1e9;
    // 별 '한 번도 안 줄어들기'가 아직 살아 있으면 데는 것은 다 와 가는 것보다 비싸다
    const alive = G.def.stars.some((q) => q.k === 'nohurt') && s.hurt <= 3;
    for (const u of opts) {
      const r = rollout(s, u, 110);
      const burnCost = r.burn > 0 ? (alive ? 360 + 8 * r.burn : 30 + 5 * r.burn) * (1 - 0.7 * wait) : 0;
      const v = (r.done ? 250 : 0) + 100 * (r.p - s.p) + 70 * r.got - 90 * r.lost * (1 - wait) - burnCost - (r.sz <= FAIL_SZ ? 2000 : 0) - (u === s.u ? 0 : 3);
      if (v > bv) (bv = v), (best = u);
    }
    if (Math.abs(best - s.u) < 0.004) return NO;
    m.tgt = best;
    return aimAt(best);
  },
};

const dumbMem = new WeakMap<object, { next: number; hold: number; x: number; y: number }>();
/** 봇: 아무 때나 아무 데나 눌러 끈다 */
export const shadowghostRandom: Bot<GhostState> = {
  name: '아무 데나 끌기',
  act(s, rng) {
    let m = dumbMem.get(s);
    if (!m) dumbMem.set(s, (m = { next: s.t + 20 + Math.floor(rng() * 60), hold: 0, x: 0.5, y: 0.5 }));
    if (m.hold > 0) {
      m.hold--;
      return m.hold > 0 ? { tap: false, dir: 0, pointer: { x: m.x, y: m.y } } : NO;
    }
    if (s.t < m.next) return NO;
    m.next = s.t + 40 + Math.floor(rng() * 120);
    m.x = rng();
    m.y = rng();
    m.hold = 2 + Math.floor(rng() * 40);
    return { tap: false, dir: 0, pointer: { x: m.x, y: m.y } };
  },
};

/** 버릇 봇: 늘 유령 바로 앞이 가장 멀리 그늘이 되는 각도로 해를 둔다 (가는 길의 햇빛·별사탕·움직이는 그늘은 안 봄) */
export const shadowghostHabit: Bot<GhostState> = {
  name: '늘 눈앞만 그늘로',
  act: (s) => planBot(s, { candy: false, sweep: false, ahead: 0 }, 9),
};

const sideMem = new WeakMap<object, { side: number; since: number; p: number }>();
/** 독립 버릇 봇: 해를 늘 한쪽 끝에 둔다 — 유령이 2초 넘게 못 가면 반대쪽 끝으로 */
export const shadowghostHabit2: Bot<GhostState> = {
  name: '해는 늘 끝에서 끝으로',
  act(s) {
    if (s.phase !== 'play') return NO;
    let m = sideMem.get(s);
    if (!m) sideMem.set(s, (m = { side: 0, since: s.t, p: s.p }));
    if (s.p > m.p + 0.01) (m.p = s.p), (m.since = s.t);
    if (s.t - m.since > 120) (m.side = 1 - m.side), (m.since = s.t), (m.p = s.p);
    const u = m.side ? 0.99 : 0.01;
    return Math.abs(s.u - u) > 0.004 ? aimAt(u) : NO;
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
const TAU = Math.PI * 2;
const hsh = (k: number) => {
  const v = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
type C2 = CanvasRenderingContext2D;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function ell(ctx: C2, x: number, y: number, rx: number, ry: number, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
}
function lin(ctx: C2, x0: number, y0: number, x1: number, y1: number, ...st: [number, string][]) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of st) g.addColorStop(o, c);
  return g;
}
function radg(ctx: C2, x: number, y: number, r0: number, r1: number, ...st: [number, string][]) {
  const g = ctx.createRadialGradient(x, y, Math.max(0, r0), x, y, Math.max(0.1, r1));
  for (const [o, c] of st) g.addColorStop(o, c);
  return g;
}
function rr(ctx: C2, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2)));
}
function starPath(ctx: C2, x: number, y: number, r: number, inner = 0.45, n = 5) {
  ctx.beginPath();
  for (let k = 0; k < n * 2; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / n, q = k % 2 ? r * inner : r;
    if (k) ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
    else ctx.moveTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
  }
  ctx.closePath();
}
function heartPath(ctx: C2, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.9);
  ctx.bezierCurveTo(x - r * 1.5, y - r * 0.1, x - r * 0.9, y - r * 1.25, x, y - r * 0.45);
  ctx.bezierCurveTo(x + r * 0.9, y - r * 1.25, x + r * 1.5, y - r * 0.1, x, y + r * 0.9);
  ctx.closePath();
}
function outlined(ctx: C2, fill: string | CanvasGradient, lw: number, stroke = OUT) {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = lw;
  ctx.strokeStyle = stroke;
  ctx.stroke();
}
/** 따뜻한 갈색 윤곽선 (그림책 느낌) */
const OUT = '#5b4033';
const INK = '#4a3550';
/** 그림자 색: 투명한 보랏빛 푸른색 */
const SHADE = 'rgba(84,66,206,0.42)';
const WALLS = ['#fff1dc', '#ffe3ea', '#e2f3ff', '#eaf7dc'];
const ROOFS = [['#f5894c', '#d9663a'], ['#ef6f62', '#cf5248'], ['#f6a64a', '#d9862e'], ['#ec8bb0', '#c96c90']];
const CANDY_COL = ['#ff8fc0', '#ffd25a', '#8fe3c9', '#a8b8ff', '#ffb27a'];
/** 지평선(땅이 시작되는 곳) · 아래 띠가 시작되는 곳 */
const HZ = 0.5, GB = 1.33;

interface Bg { sky: HTMLCanvasElement; ground: HTMLCanvasElement }
const BG = new Map<string, Bg>();
function layer(w: number, h: number, sc: number, paint: (c: C2) => void) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w * sc));
  c.height = Math.max(1, Math.ceil(h * sc));
  const g = c.getContext('2d')!;
  g.scale(sc, sc);
  paint(g);
  return c;
}
function getBg(w: number, h: number, sc: number, G: Geo, dusk: boolean): Bg {
  const key = `${w}x${h}:${sc}:${G.key}`;
  const hit = BG.get(key);
  if (hit) return hit;
  const X = (x: number) => x * w, Y = (y: number) => y * w, R = X;
  const sky = layer(w, Y(HZ) + R(0.02), sc, (g) => {
    g.fillStyle = dusk
      ? lin(g, 0, 0, 0, Y(HZ), [0, '#86b2f2'], [0.45, '#f8c6c0'], [0.8, '#ffd9a6'], [1, '#fff0c8'])
      : lin(g, 0, 0, 0, Y(HZ), [0, '#6fc3f6'], [0.5, '#a6dcfb'], [0.85, '#d8f1ff'], [1, '#f3fbff']);
    g.fillRect(0, 0, w, Y(HZ) + R(0.02));
    // 먼 산 두 겹
    for (const [base, amp, col, ph] of [[HZ - 0.07, 0.035, dusk ? '#c9a7c8' : '#b4dccb', 1.3], [HZ - 0.035, 0.025, dusk ? '#b597b8' : '#9fd1b6', 4.1]] as [number, number, string, number][]) {
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(0, Y(HZ) + 2);
      for (let k = 0; k <= 40; k++) {
        const x = k / 40;
        g.lineTo(X(x), Y(base - amp * (0.5 + 0.5 * Math.sin(x * 7 + ph) * Math.sin(x * 3.1 + ph * 2))));
      }
      g.lineTo(w, Y(HZ) + 2);
      g.closePath();
      g.fill();
    }
    // 먼 마을 (작은 집 실루엣)
    for (let k = 0; k < 11; k++) {
      const x = 0.02 + k * 0.095 + hsh(k) * 0.03, hw = 0.03 + hsh(k + 3) * 0.02, hh = 0.025 + hsh(k + 7) * 0.02, by = HZ - 0.008;
      g.fillStyle = dusk ? '#e7c3c8' : '#f1e6d6';
      g.fillRect(X(x - hw), Y(by - hh), R(hw * 2), R(hh));
      g.fillStyle = dusk ? '#d99a92' : ['#f0a77c', '#ea9a8a', '#f2bd7a'][k % 3];
      g.beginPath();
      g.moveTo(X(x - hw - 0.005), Y(by - hh));
      g.lineTo(X(x), Y(by - hh - 0.022));
      g.lineTo(X(x + hw + 0.005), Y(by - hh));
      g.closePath();
      g.fill();
      g.fillStyle = 'rgba(120,170,220,.55)';
      g.fillRect(X(x - hw * 0.4), Y(by - hh * 0.7), R(hw * 0.5), R(hh * 0.35));
    }
    // 지평선 빛 번짐
    g.fillStyle = lin(g, 0, Y(HZ - 0.05), 0, Y(HZ), [0, 'rgba(255,255,255,0)'], [1, dusk ? 'rgba(255,230,190,.55)' : 'rgba(255,255,255,.5)']);
    g.fillRect(0, Y(HZ - 0.05), w, R(0.05));
  });
  const ground = layer(w, h, sc, (g) => {
    // 풀밭
    g.fillStyle = lin(g, 0, Y(HZ), 0, Y(GB), [0, dusk ? '#b9d58e' : '#b5e39a'], [1, dusk ? '#a6c77c' : '#9ad67f']);
    g.fillRect(0, Y(HZ), w, Y(GB) - Y(HZ) + 2);
    // 풀 무늬
    for (let k = 0; k < 140; k++) {
      const x = hsh(k * 1.7), y = HZ + 0.01 + hsh(k * 2.3 + 5) * (GB - HZ - 0.02);
      g.fillStyle = k % 3 ? 'rgba(80,150,70,.18)' : 'rgba(255,255,220,.25)';
      g.beginPath();
      g.ellipse(X(x), Y(y), R(0.012 + hsh(k) * 0.012), R(0.004), 0, 0, TAU);
      g.fill();
    }
    // 돌길 (꺾은선을 따라 둥근 판석)
    const P = G.path.pts;
    g.lineJoin = 'round';
    g.lineCap = 'round';
    const stroke = (lw: number, col: string) => {
      g.strokeStyle = col;
      g.lineWidth = R(lw);
      g.beginPath();
      P.forEach((q, i) => (i ? g.lineTo(X(q[0]), Y(q[1])) : g.moveTo(X(q[0]), Y(q[1]))));
      g.stroke();
    };
    stroke(0.1, 'rgba(120,90,50,.18)');
    stroke(0.088, '#e7c38e');
    stroke(0.074, '#f7dfb3');
    let seed = 1;
    for (let i = 1; i < P.length; i++) {
      const [ax, ay] = P[i - 1], [bx, by] = P[i], L = Math.hypot(bx - ax, by - ay), nx = -(by - ay) / L, ny = (bx - ax) / L;
      for (let d = 0; d < L; d += 0.026) {
        for (const off of [-0.021, 0, 0.021]) {
          seed++;
          const jx = (hsh(seed) - 0.5) * 0.008, jy = (hsh(seed + 9) - 0.5) * 0.006, t = d / L;
          const x = ax + (bx - ax) * t + nx * off + jx, y = ay + (by - ay) * t + ny * off * 0.8 + jy;
          const c = ['#fbe8c6', '#f6dbb0', '#fde9cf', '#f3d5a6'][Math.floor(hsh(seed + 3) * 4)];
          g.fillStyle = 'rgba(176,130,80,.35)';
          g.beginPath();
          g.ellipse(X(x), Y(y) + 1, R(0.0105), R(0.0072), 0, 0, TAU);
          g.fill();
          g.fillStyle = c;
          g.beginPath();
          g.ellipse(X(x), Y(y), R(0.0098), R(0.0066), 0, 0, TAU);
          g.fill();
        }
      }
    }
    // 길가 꽃 (길에서 떨어진 곳에만)
    const near = (x: number, y: number) => {
      for (let i = 1; i < P.length; i++) {
        const [ax, ay] = P[i - 1], [bx, by] = P[i], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
        const t = clamp(((x - ax) * dx + (y - ay) * dy) / L2, 0, 1);
        if (Math.hypot(x - ax - dx * t, y - ay - dy * t) < 0.07) return true;
      }
      for (const o of G.objs) if (Math.abs(o.x - x) < (o.w ?? 0.12) / 2 + 0.03 && y < o.y + 0.02 && y > o.y - (o.d ?? 0.06) - 0.02) return true;
      return false;
    };
    for (let k = 0; k < 60; k++) {
      const x = 0.03 + hsh(k * 3.3 + 1) * 0.94, y = HZ + 0.03 + hsh(k * 5.1 + 2) * (GB - HZ - 0.05);
      if (near(x, y)) continue;
      const col = ['#ff9ec4', '#fff27a', '#ffffff', '#c9a7ff', '#ffb07a'][k % 5];
      for (let j = 0; j < 3; j++) {
        const fx = X(x + (hsh(k + j * 7) - 0.5) * 0.03), fy = Y(y + (hsh(k + j * 5) - 0.5) * 0.015);
        g.fillStyle = 'rgba(70,140,60,.5)';
        g.fillRect(fx - 0.5, fy, 1, R(0.012));
        g.fillStyle = col;
        for (let p = 0; p < 5; p++) {
          g.beginPath();
          g.arc(fx + Math.cos((p * TAU) / 5) * R(0.005), fy + Math.sin((p * TAU) / 5) * R(0.005), R(0.0045), 0, TAU);
          g.fill();
        }
        g.fillStyle = '#ffd34a';
        g.beginPath();
        g.arc(fx, fy, R(0.003), 0, TAU);
        g.fill();
      }
    }
    // 차도 (트럭 판)
    for (const o of G.objs)
      if (o.k === 'truck') {
        const y0 = o.y - o.d! - 0.03, y1 = o.y + 0.02;
        g.fillStyle = '#c9c2d6';
        g.fillRect(0, Y(y0), w, Y(y1) - Y(y0));
        g.fillStyle = '#b3abc4';
        g.fillRect(0, Y(y1) - 3, w, 3);
        g.fillStyle = '#fff6d8';
        for (let x = 0.02; x < 1; x += 0.1) g.fillRect(X(x), Y((y0 + y1) / 2) - 1.5, R(0.05), 3);
        g.fillStyle = '#efe6f4';
        g.fillRect(0, Y(y1), w, R(0.012));
      }
  });
  const bg = { sky, ground };
  BG.set(key, bg);
  return bg;
}

// ── 물건 그리기 ──
function drawSun(ctx: C2, x: number, y: number, r: number, t: number, held: number, dusk: boolean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = radg(ctx, 0, 0, r * 0.6, r * (3.2 + held * 0.8), [0, dusk ? 'rgba(255,190,120,.55)' : 'rgba(255,240,150,.6)'], [0.45, dusk ? 'rgba(255,170,120,.18)' : 'rgba(255,236,150,.2)'], [1, 'rgba(255,236,150,0)']);
  ctx.beginPath();
  ctx.arc(0, 0, r * (3.2 + held * 0.8), 0, TAU);
  ctx.fill();
  ctx.rotate(t * 0.01);
  for (let k = 0; k < 12; k++) {
    ctx.rotate(TAU / 12);
    const L = r * (k % 2 ? 1.45 : 1.7) * (1 + 0.06 * Math.sin(t * 0.1 + k));
    ctx.fillStyle = dusk ? '#ffb070' : '#ffd23f';
    ctx.beginPath();
    ctx.moveTo(-r * 0.18, -r * 1.02);
    ctx.lineTo(0, -L);
    ctx.lineTo(r * 0.18, -r * 1.02);
    ctx.closePath();
    ctx.fill();
  }
  ctx.rotate(-t * 0.01);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  outlined(ctx, radg(ctx, -r * 0.3, -r * 0.35, r * 0.1, r * 1.1, [0, '#fff9d0'], [0.6, dusk ? '#ffc061' : '#ffd84a'], [1, dusk ? '#f39a3c' : '#f7b52c']), Math.max(1.5, r * 0.08), '#d9822b');
  // 얼굴
  ctx.strokeStyle = '#7a3e1c';
  ctx.lineWidth = Math.max(1.4, r * 0.09);
  ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    if (held > 0.5) {
      ctx.moveTo(s * r * 0.48, -r * 0.2);
      ctx.lineTo(s * r * 0.26, -r * 0.1);
      ctx.lineTo(s * r * 0.48, -r * 0.0);
    } else ctx.arc(s * r * 0.35, -r * 0.1, r * 0.13, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  }
  ctx.beginPath();
  if (held > 0.5) ctx.arc(0, r * 0.32, r * 0.13, 0, TAU);
  else ctx.arc(0, r * 0.18, r * 0.24, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,120,90,.45)';
  for (const s of [-1, 1]) {
    ell(ctx, s * r * 0.55, r * 0.22, r * 0.15, r * 0.09);
    ctx.fill();
  }
  ctx.restore();
}

function drawTree(ctx: C2, x: number, y: number, k: number, hc: number, r: number, t: number, ph: number) {
  const sway = Math.sin(t * 0.03 + ph) * k * 0.01;
  // 줄기
  ctx.beginPath();
  ctx.moveTo(x - k * 0.018, y);
  ctx.quadraticCurveTo(x - k * 0.012, y - k * hc * 0.5, x - k * 0.01 + sway, y - k * (hc - r * 0.3));
  ctx.lineTo(x + k * 0.01 + sway, y - k * (hc - r * 0.3));
  ctx.quadraticCurveTo(x + k * 0.012, y - k * hc * 0.5, x + k * 0.018, y);
  ctx.closePath();
  outlined(ctx, lin(ctx, x - k * 0.02, 0, x + k * 0.02, 0, [0, '#b98656'], [1, '#8f6038']), 1.5);
  // 잎 덩어리
  const cx = x + sway * 2, cy = y - k * hc, R = k * r;
  const blobs = [[-0.55, 0.2, 0.62], [0.55, 0.22, 0.6], [0, -0.35, 0.72], [-0.3, -0.05, 0.7], [0.32, -0.02, 0.68]];
  ctx.beginPath();
  for (const [bx, by, br] of blobs) {
    ctx.moveTo(cx + bx * R + br * R, cy + by * R);
    ctx.arc(cx + bx * R, cy + by * R, br * R, 0, TAU);
  }
  ctx.lineWidth = 3;
  ctx.strokeStyle = OUT;
  ctx.stroke();
  ctx.fillStyle = radg(ctx, cx - R * 0.3, cy - R * 0.45, R * 0.1, R * 1.4, [0, '#a6e38a'], [0.55, '#6cc46a'], [1, '#3f9a55']);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,220,.35)';
  for (const [bx, by] of [[-0.35, -0.4], [0.1, -0.6], [-0.6, 0]]) {
    ell(ctx, cx + bx * R, cy + by * R, R * 0.18, R * 0.1, -0.4);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(30,90,50,.25)';
  ell(ctx, cx, cy + R * 0.55, R * 0.85, R * 0.25);
  ctx.fill();
}

function drawHouse(ctx: C2, o: Obj, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, t: number, granny: { t: number } | null, near: number) {
  const x0 = X(o.x - o.w! / 2), x1 = X(o.x + o.w! / 2), yb = Y(o.y), H = R(o.h!), D = R(o.d!), rf = R(o.roof ?? 0.05), cx = X(o.x);
  const col = o.col ?? 0, wall = WALLS[col % 4], [r0, r1] = ROOFS[col % 4];
  // 앞벽
  rr(ctx, x0, yb - H, x1 - x0, H, 2);
  outlined(ctx, lin(ctx, x0, 0, x1, 0, [0, wall], [0.85, wall], [1, 'rgba(200,170,150,1)']), 2);
  ctx.fillStyle = 'rgba(120,80,60,.1)';
  ctx.fillRect(x0 + 1, yb - H * 0.18, x1 - x0 - 2, H * 0.18 - 1);
  // 문
  const dw = R(0.032), dh = H * 0.5;
  rr(ctx, cx - dw / 2 - R(o.w! * 0.18), yb - dh, dw, dh, dw * 0.45);
  outlined(ctx, '#b4774a', 1.5);
  ctx.fillStyle = '#ffd36b';
  ctx.beginPath();
  ctx.arc(cx - R(o.w! * 0.18) + dw * 0.25, yb - dh * 0.45, 1.6, 0, TAU);
  ctx.fill();
  // 창문 (할머니가 내다보는 창)
  const ww = R(0.042), wh = R(0.036), wx = cx + R(o.w! * 0.17) - ww / 2, wy = yb - H * 0.72;
  rr(ctx, wx, wy, ww, wh, 3);
  outlined(ctx, granny ? '#fff4d6' : lin(ctx, wx, wy, wx + ww, wy + wh, [0, '#bfe8ff'], [1, '#86c8f2']), 1.6);
  if (granny) drawGranny(ctx, wx + ww / 2, wy + wh, ww, t, granny.t, near);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(wx + ww / 2, wy);
  ctx.lineTo(wx + ww / 2, wy + wh * (granny ? 0.15 : 1));
  if (!granny) {
    ctx.moveTo(wx, wy + wh / 2);
    ctx.lineTo(wx + ww, wy + wh / 2);
  }
  ctx.stroke();
  // 화분 상자
  rr(ctx, wx - 2, wy + wh, ww + 4, R(0.01), 2);
  outlined(ctx, '#c98a5a', 1.2);
  for (let j = 0; j < 4; j++) {
    ctx.fillStyle = ['#ff7fa8', '#ffd84a', '#ff9e6b', '#ffffff'][j];
    ctx.beginPath();
    ctx.arc(wx + (j + 0.5) * (ww / 4), wy + wh - 1, R(0.0055), 0, TAU);
    ctx.fill();
  }
  // 지붕 (박공이 앞을 본다: 앞 세모 + 양쪽 비탈이 뒤로)
  const ey = yb - H, ry = ey - rf, back = D;
  ctx.beginPath();
  ctx.moveTo(x0 - R(0.012), ey);
  ctx.lineTo(cx, ry);
  ctx.lineTo(cx, ry - back);
  ctx.lineTo(x0 - R(0.012), ey - back);
  ctx.closePath();
  outlined(ctx, lin(ctx, x0, ey, cx, ry, [0, r0], [1, '#ffb27e']), 2);
  ctx.beginPath();
  ctx.moveTo(x1 + R(0.012), ey);
  ctx.lineTo(cx, ry);
  ctx.lineTo(cx, ry - back);
  ctx.lineTo(x1 + R(0.012), ey - back);
  ctx.closePath();
  outlined(ctx, r1, 2);
  // 기와 줄
  ctx.strokeStyle = 'rgba(120,50,30,.25)';
  ctx.lineWidth = 1;
  for (let j = 1; j < 4; j++) {
    const u = j / 4;
    ctx.beginPath();
    ctx.moveTo(x0 - R(0.012) + (cx - x0 + R(0.012)) * u, ey - rf * u);
    ctx.lineTo(x0 - R(0.012) + (cx - x0 + R(0.012)) * u, ey - rf * u - back);
    ctx.moveTo(x1 + R(0.012) - (x1 + R(0.012) - cx) * u, ey - rf * u);
    ctx.lineTo(x1 + R(0.012) - (x1 + R(0.012) - cx) * u, ey - rf * u - back);
    ctx.stroke();
  }
  // 앞 박공 세모
  ctx.beginPath();
  ctx.moveTo(x0 + 1, ey);
  ctx.lineTo(cx, ry + 2);
  ctx.lineTo(x1 - 1, ey);
  ctx.closePath();
  outlined(ctx, wall, 1.5);
  ctx.beginPath();
  ctx.arc(cx, ey - rf * 0.4, R(0.009), 0, TAU);
  outlined(ctx, '#bfe8ff', 1.2);
  // 굴뚝
  const chx = cx + (x1 - cx) * 0.55, chy = ey - rf * 0.45 - back * 0.5;
  rr(ctx, chx - R(0.01), chy - R(0.035), R(0.02), R(0.035), 1);
  outlined(ctx, '#d9826a', 1.4);
  for (let j = 0; j < 2; j++) {
    const ph = (t * 0.01 + j * 0.5) % 1;
    ctx.fillStyle = `rgba(255,255,255,${0.6 * (1 - ph)})`;
    ctx.beginPath();
    ctx.arc(chx + Math.sin(ph * 6) * 3, chy - R(0.04) - ph * R(0.06), R(0.008 + ph * 0.01), 0, TAU);
    ctx.fill();
  }
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(cx, ry);
  ctx.lineTo(cx, ry - back);
  ctx.stroke();
}

function drawGranny(ctx: C2, x: number, y: number, k: number, t: number, react: number, near: number) {
  const age = t - react, clap = age < 70, bob = Math.sin(t * 0.05) * k * 0.03;
  ctx.save();
  ctx.translate(x + (near - 0.5) * k * 0.15, y + bob);
  // 머리·얼굴
  ctx.beginPath();
  ctx.arc(0, -k * 0.42, k * 0.26, 0, TAU);
  outlined(ctx, '#ffe0c4', 1.3);
  ctx.beginPath();
  ctx.arc(0, -k * 0.62, k * 0.2, Math.PI, 0);
  ctx.arc(0, -k * 0.78, k * 0.1, 0, TAU);
  outlined(ctx, '#e9e6f2', 1.2);
  ctx.strokeStyle = '#5a4060';
  ctx.lineWidth = 1;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(s * k * 0.1, -k * 0.44, k * 0.07, 0, TAU);
    ctx.stroke();
  }
  ctx.fillStyle = '#5a4060';
  ctx.beginPath();
  if (clap) ctx.arc(0, -k * 0.27, k * 0.06, 0, TAU);
  else ctx.arc(0, -k * 0.3, k * 0.06, 0.1 * Math.PI, 0.9 * Math.PI);
  clap ? ctx.fill() : ctx.stroke();
  ctx.fillStyle = 'rgba(255,120,120,.4)';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(s * k * 0.17, -k * 0.34, k * 0.05, 0, TAU);
    ctx.fill();
  }
  // 손 (박수)
  if (clap) {
    const c = Math.abs(Math.sin(age * 0.5)) * k * 0.1;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(s * (k * 0.06 + c), -k * 0.1, k * 0.07, 0, TAU);
      outlined(ctx, '#ffe0c4', 1);
    }
  }
  ctx.restore();
}

function drawCat(ctx: C2, x: number, y: number, k: number, t: number, react: number, look: number) {
  const age = t - react, jump = age < 30 ? Math.sin((age / 30) * Math.PI) * k * 0.5 : 0;
  ctx.save();
  ctx.translate(x, y - jump);
  // 꼬리
  ctx.strokeStyle = OUT;
  ctx.lineWidth = k * 0.13 + 2;
  ctx.lineCap = 'round';
  const tw = Math.sin(t * 0.06) * 0.5;
  ctx.beginPath();
  ctx.moveTo(k * 0.25, -k * 0.1);
  ctx.quadraticCurveTo(k * 0.6, -k * 0.1, k * 0.55 + tw * k * 0.2, -k * 0.55);
  ctx.stroke();
  ctx.strokeStyle = '#f2a65a';
  ctx.lineWidth = k * 0.13;
  ctx.stroke();
  // 몸
  ell(ctx, 0, -k * 0.2, k * 0.33, k * 0.22);
  outlined(ctx, '#f6b26b', 1.6);
  ctx.fillStyle = '#fff1dc';
  ell(ctx, -k * 0.05, -k * 0.12, k * 0.16, k * 0.11);
  ctx.fill();
  // 머리
  const hx = -k * 0.25 + look * k * 0.04, hy = -k * 0.48;
  ctx.beginPath();
  ctx.moveTo(hx - k * 0.2, hy - k * 0.05);
  ctx.lineTo(hx - k * 0.17, hy - k * 0.32);
  ctx.lineTo(hx - k * 0.05, hy - k * 0.17);
  ctx.lineTo(hx + k * 0.05, hy - k * 0.17);
  ctx.lineTo(hx + k * 0.17, hy - k * 0.32);
  ctx.lineTo(hx + k * 0.2, hy - k * 0.05);
  ctx.closePath();
  outlined(ctx, '#f6b26b', 1.4);
  ell(ctx, hx, hy, k * 0.22, k * 0.18);
  outlined(ctx, '#f6b26b', 1.4);
  ctx.strokeStyle = '#d98a3a';
  ctx.lineWidth = 1.4;
  for (const s of [-1, 0, 1]) {
    ctx.beginPath();
    ctx.moveTo(hx + s * k * 0.06, hy - k * 0.17);
    ctx.lineTo(hx + s * k * 0.05, hy - k * 0.1);
    ctx.stroke();
  }
  ctx.fillStyle = INK;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    if (age < 40) ctx.arc(hx + s * k * 0.08, hy, k * 0.04, 0, TAU);
    else ell(ctx, hx + s * k * 0.08 + look * k * 0.015, hy, k * 0.025, k * 0.045);
    ctx.fill();
  }
  ctx.fillStyle = '#ff8fa8';
  ctx.beginPath();
  ctx.arc(hx, hy + k * 0.05, k * 0.025, 0, TAU);
  ctx.fill();
  ctx.restore();
  if (age < 50) {
    ctx.font = `900 ${Math.max(12, k * 0.38)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText('냥!', x - k * 0.2, y - k * 1.05 - jump);
    ctx.fillStyle = '#e0702a';
    ctx.fillText('냥!', x - k * 0.2, y - k * 1.05 - jump);
  }
}

function drawCandy(ctx: C2, x: number, y: number, r: number, t: number, shaded: boolean, col: string, ph: number) {
  const bob = Math.sin(t * 0.08 + ph) * r * 0.25;
  ctx.fillStyle = 'rgba(80,60,140,.22)';
  ell(ctx, x, y + r * 0.2, r * 0.8, r * 0.3);
  ctx.fill();
  if (shaded) {
    ctx.fillStyle = radg(ctx, x, y - r - bob, 0, r * 2.4, [0, 'rgba(255,255,255,.75)'], [1, 'rgba(255,255,255,0)']);
    ctx.beginPath();
    ctx.arc(x, y - r - bob, r * 2.4, 0, TAU);
    ctx.fill();
  }
  ctx.save();
  ctx.translate(x, y - r - bob);
  ctx.rotate(t * 0.02 + ph);
  starPath(ctx, 0, 0, r, 0.62, 7);
  outlined(ctx, radg(ctx, -r * 0.3, -r * 0.3, 0, r * 1.2, [0, '#ffffff'], [0.45, col], [1, col]), 1.4, '#7a5070');
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  ctx.beginPath();
  ctx.arc(x - r * 0.3, y - r * 1.3 - bob, r * 0.2, 0, TAU);
  ctx.fill();
  if (shaded && Math.sin(t * 0.15 + ph * 3) > 0.6) {
    ctx.fillStyle = '#ffffff';
    starPath(ctx, x + r * 0.9, y - r * 1.9 - bob, r * 0.4, 0.3, 4);
    ctx.fill();
  }
  if (!shaded) {
    // 햇빛에 반짝반짝 달아오름 (여기선 못 주워요)
    ctx.strokeStyle = 'rgba(255,170,60,.7)';
    ctx.lineWidth = 1.3;
    for (let j = 0; j < 2; j++) {
      const yy = y - r * 2.4 - bob - ((t * 0.6 + j * 8) % 14);
      ctx.beginPath();
      ctx.moveTo(x + (j - 0.5) * r, yy + 6);
      ctx.quadraticCurveTo(x + (j - 0.5) * r + 3, yy + 3, x + (j - 0.5) * r, yy);
      ctx.stroke();
    }
  }
}

/** 꼬마 유령. k = 몸 너비(px). pose: 0 기다림 1 미끄러짐 2 뜨거움 3 기쁨 4 녹음 */
function drawGhost(ctx: C2, x: number, y: number, k: number, t: number, pose: number, face: number, lean: number, hot: number) {
  const hover = pose === 4 ? 0 : k * (0.16 + 0.05 * Math.sin(t * 0.09));
  // 땅 그림자
  ctx.fillStyle = 'rgba(70,50,130,.28)';
  ell(ctx, x, y, k * (pose === 4 ? 0.7 : 0.42), k * 0.11);
  ctx.fill();
  ctx.save();
  ctx.translate(x, y - hover);
  if (pose === 2) ctx.translate(Math.sin(t * 1.7) * k * 0.035, 0);
  const sx = pose === 1 ? 1.12 : pose === 4 ? 1.5 : 1, sy = pose === 1 ? 0.92 : pose === 4 ? 0.35 : 1;
  ctx.scale(sx, sy);
  ctx.rotate(lean * 0.25 * face);
  const W = k * 0.5, Hb = k * 1.05;
  // 몸 (시트 자락이 물결)
  ctx.beginPath();
  ctx.moveTo(-W, -Hb * 0.45);
  ctx.bezierCurveTo(-W, -Hb * 1.12, W, -Hb * 1.12, W, -Hb * 0.45);
  const n = 4, wave = (pose === 0 ? 0.09 : 0.06) * k;
  ctx.lineTo(W * 1.04, -k * 0.02);
  for (let i = n; i >= 0; i--) {
    const xx = -W * 1.04 + (2.08 * W * i) / n, ph = t * 0.22 + i * 1.7;
    const dip = i % 2 ? wave * (1.2 + Math.sin(ph)) : -wave * 0.4;
    if (i === n) ctx.lineTo(xx, dip);
    else ctx.quadraticCurveTo(xx + (W * 1.04) / n, dip + wave * (1.5 + Math.sin(ph)), xx, dip);
  }
  ctx.lineTo(-W, -Hb * 0.45);
  ctx.closePath();
  const warm = clamp(hot, 0, 1);
  ctx.fillStyle = radg(ctx, -W * 0.35, -Hb * 0.8, k * 0.05, k * 1.1, [0, '#ffffff'], [0.55, warm > 0.05 ? `rgb(255,${Math.round(246 - 40 * warm)},${Math.round(250 - 70 * warm)})` : '#f7f4ff'], [1, warm > 0.05 ? '#f6c3c8' : '#d9d0f2']);
  ctx.fill();
  ctx.lineWidth = Math.max(2, k * 0.045);
  ctx.strokeStyle = '#6a5a8c';
  ctx.stroke();
  // 팔
  const armY = -Hb * 0.38, wav = pose === 3 ? Math.sin(t * 0.4) * 0.6 : pose === 2 ? 1.1 : pose === 1 ? -0.5 : Math.sin(t * 0.12) * 0.25;
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.translate(s * W * 0.98, armY);
    ctx.rotate(s * (0.5 + wav * (s > 0 ? 1 : 0.7)));
    ell(ctx, s * k * 0.08, 0, k * 0.13, k * 0.07);
    ctx.fillStyle = '#f4f0ff';
    ctx.fill();
    ctx.lineWidth = Math.max(1.6, k * 0.035);
    ctx.stroke();
    ctx.restore();
  }
  // 얼굴
  const fx2 = face * k * 0.05, fy = -Hb * 0.6;
  ctx.fillStyle = 'rgba(255,130,160,.55)';
  for (const s of [-1, 1]) {
    ell(ctx, fx2 + s * k * 0.24, fy + k * 0.12, k * 0.08, k * 0.05);
    ctx.fill();
  }
  ctx.fillStyle = '#2b2440';
  ctx.strokeStyle = '#2b2440';
  ctx.lineCap = 'round';
  if (pose === 1 || pose === 3) {
    ctx.lineWidth = Math.max(2, k * 0.05);
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(fx2 + s * k * 0.15, fy + k * 0.02, k * 0.07, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    }
  } else if (pose === 4) {
    ctx.lineWidth = Math.max(1.8, k * 0.04);
    for (const s of [-1, 1]) {
      const ex = fx2 + s * k * 0.15, ey = fy;
      ctx.beginPath();
      ctx.moveTo(ex - k * 0.05, ey - k * 0.05);
      ctx.lineTo(ex + k * 0.05, ey + k * 0.05);
      ctx.moveTo(ex + k * 0.05, ey - k * 0.05);
      ctx.lineTo(ex - k * 0.05, ey + k * 0.05);
      ctx.stroke();
    }
  } else {
    const er = pose === 2 ? k * 0.1 : k * 0.075, eh = pose === 2 ? k * 0.1 : k * 0.1 * (Math.sin(t * 0.03) > 0.97 ? 0.15 : 1);
    for (const s of [-1, 1]) {
      ell(ctx, fx2 + s * k * 0.15, fy, er, eh);
      ctx.fillStyle = '#2b2440';
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ell(ctx, fx2 + s * k * 0.15 - er * 0.3, fy - eh * 0.35, er * 0.35, er * 0.35);
      ctx.fill();
    }
  }
  // 입
  ctx.lineWidth = Math.max(1.6, k * 0.035);
  ctx.beginPath();
  if (pose === 2) {
    ell(ctx, fx2, fy + k * 0.17, k * 0.07, k * 0.09);
    ctx.fillStyle = '#7a2a3a';
    ctx.fill();
  } else if (pose === 4) {
    ctx.moveTo(fx2 - k * 0.08, fy + k * 0.16);
    ctx.quadraticCurveTo(fx2 - k * 0.04, fy + k * 0.12, fx2, fy + k * 0.16);
    ctx.quadraticCurveTo(fx2 + k * 0.04, fy + k * 0.2, fx2 + k * 0.08, fy + k * 0.16);
    ctx.stroke();
  } else {
    ctx.arc(fx2, fy + k * 0.1, k * (pose === 3 ? 0.09 : 0.06), 0.15 * Math.PI, 0.85 * Math.PI);
    if (pose === 3) {
      ctx.closePath();
      ctx.fillStyle = '#7a2a3a';
      ctx.fill();
    } else ctx.stroke();
  }
  ctx.restore();
  // 김 (뜨거울 때)
  if (pose === 2 || hot > 0.2)
    for (let j = 0; j < 3; j++) {
      const ph = (t * 0.035 + j / 3) % 1;
      ctx.strokeStyle = `rgba(255,255,255,${0.85 * (1 - ph)})`;
      ctx.lineWidth = Math.max(2, k * 0.05);
      ctx.beginPath();
      const bx = x + (j - 1) * k * 0.22, by = y - hover - k * 1.05 - ph * k * 0.5;
      ctx.moveTo(bx, by + k * 0.12);
      ctx.quadraticCurveTo(bx + k * 0.08, by + k * 0.06, bx, by);
      ctx.quadraticCurveTo(bx - k * 0.08, by - k * 0.06, bx, by - k * 0.12);
      ctx.stroke();
    }
}

/** 장난감: 곰 인형 (마지막 판은 친구 유령) */
function drawToy(ctx: C2, x: number, y: number, k: number, t: number, friend: boolean, happy: boolean) {
  if (friend) {
    drawGhostFriend(ctx, x, y, k, t, happy);
    return;
  }
  const bob = happy ? Math.abs(Math.sin(t * 0.2)) * k * 0.15 : 0;
  ctx.fillStyle = 'rgba(70,50,130,.25)';
  ell(ctx, x, y, k * 0.4, k * 0.1);
  ctx.fill();
  ctx.save();
  ctx.translate(x, y - bob);
  for (const s of [-1, 1]) {
    ell(ctx, s * k * 0.2, -k * 0.08, k * 0.13, k * 0.1);
    outlined(ctx, '#c98a52', 1.4);
  }
  ell(ctx, 0, -k * 0.3, k * 0.27, k * 0.28);
  outlined(ctx, '#d99a5e', 1.6);
  ctx.fillStyle = '#f3d2a6';
  ell(ctx, 0, -k * 0.25, k * 0.15, k * 0.15);
  ctx.fill();
  for (const s of [-1, 1]) {
    ell(ctx, s * k * 0.3, -k * 0.38 + (happy ? Math.sin(t * 0.3) * k * 0.05 : 0), k * 0.09, k * 0.07);
    outlined(ctx, '#d99a5e', 1.4);
  }
  ctx.beginPath();
  ctx.arc(0, -k * 0.68, k * 0.23, 0, TAU);
  outlined(ctx, '#d99a5e', 1.6);
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(s * k * 0.17, -k * 0.86, k * 0.08, 0, TAU);
    outlined(ctx, '#c98a52', 1.4);
  }
  ctx.fillStyle = '#f3d2a6';
  ell(ctx, 0, -k * 0.62, k * 0.1, k * 0.08);
  ctx.fill();
  ctx.fillStyle = INK;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(s * k * 0.08, -k * 0.72, k * 0.03, 0, TAU);
    ctx.fill();
  }
  ell(ctx, 0, -k * 0.65, k * 0.035, k * 0.025);
  ctx.fill();
  ctx.fillStyle = '#ff7fa8';
  ctx.beginPath();
  ctx.moveTo(0, -k * 0.5);
  ctx.lineTo(-k * 0.1, -k * 0.56);
  ctx.lineTo(-k * 0.1, -k * 0.44);
  ctx.closePath();
  ctx.moveTo(0, -k * 0.5);
  ctx.lineTo(k * 0.1, -k * 0.56);
  ctx.lineTo(k * 0.1, -k * 0.44);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
function drawGhostFriend(ctx: C2, x: number, y: number, k: number, t: number, happy: boolean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(0.85, 0.85);
  drawGhost(ctx, 0, 0, k * 1.1, t + 40, happy ? 3 : 0, -1, 0, 0);
  ctx.restore();
  ctx.fillStyle = '#ff8fc0';
  ctx.beginPath();
  const bx = x + k * 0.22, by = y - k * 1.08;
  for (const s of [-1, 1]) {
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + s * k * 0.14, by - k * 0.08);
    ctx.lineTo(bx + s * k * 0.14, by + k * 0.08);
    ctx.closePath();
  }
  ctx.fill();
}

function drawPorch(ctx: C2, o: Obj, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, start: boolean, t: number) {
  const x0 = X(o.x - o.w! / 2), x1 = X(o.x + o.w! / 2), yb = Y(o.y), yt = Y(o.y - o.d!), H = R(o.h!);
  // 뒷벽
  rr(ctx, x0 + R(0.01), yt - H * 0.9, x1 - x0 - R(0.02), H * 0.9 + R(0.01), 3);
  outlined(ctx, start ? '#b98a6a' : '#fff1dc', 2);
  if (start) {
    // 유령의 집: 낡은 나무 판자 + 어두운 문
    ctx.strokeStyle = 'rgba(90,60,40,.4)';
    ctx.lineWidth = 1;
    for (let x = x0 + R(0.03); x < x1 - R(0.015); x += R(0.025)) {
      ctx.beginPath();
      ctx.moveTo(x, yt - H * 0.9);
      ctx.lineTo(x, yt + R(0.01));
      ctx.stroke();
    }
    rr(ctx, (x0 + x1) / 2 - R(0.03), yt - H * 0.62, R(0.06), H * 0.62 + R(0.01), R(0.03));
    outlined(ctx, '#4a3550', 2);
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    for (const s of [-1, 1]) {
      ell(ctx, (x0 + x1) / 2 + s * R(0.01), yt - H * 0.4, R(0.006), R(0.008));
      ctx.fill();
    }
  } else {
    rr(ctx, (x0 + x1) / 2 - R(0.025), yt - H * 0.6, R(0.05), H * 0.6 + R(0.01), R(0.02));
    outlined(ctx, '#9fd6a0', 1.6);
  }
  // 기둥
  for (const px of [x0 + R(0.012), x1 - R(0.012)]) {
    rr(ctx, px - R(0.006), yb - H, R(0.012), H, 2);
    outlined(ctx, start ? '#8f6038' : '#ffffff', 1.4);
  }
  // 차양 (줄무늬 천)
  const ay = yb - H, ad = R(0.03);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x0 - R(0.012), ay);
  ctx.lineTo(x1 + R(0.012), ay);
  ctx.lineTo(x1 + R(0.006), ay - ad - (yb - yt));
  ctx.lineTo(x0 - R(0.006), ay - ad - (yb - yt));
  ctx.closePath();
  ctx.clip();
  const stripes = start ? ['#8f7bb8', '#b8a6dc'] : ['#ff8f7a', '#fff6ec'];
  const sw = R(0.025);
  for (let x = x0 - R(0.02), i = 0; x < x1 + R(0.02); x += sw, i++) {
    ctx.fillStyle = stripes[i % 2];
    ctx.fillRect(x, ay - ad - (yb - yt) - 2, sw + 0.5, ad + (yb - yt) + 4);
  }
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(x0 - R(0.012), ay);
  ctx.lineTo(x1 + R(0.012), ay);
  ctx.lineTo(x1 + R(0.006), ay - ad - (yb - yt));
  ctx.lineTo(x0 - R(0.006), ay - ad - (yb - yt));
  ctx.closePath();
  ctx.lineWidth = 2;
  ctx.strokeStyle = OUT;
  ctx.stroke();
  // 차양 끝 물결
  ctx.beginPath();
  for (let x = x0 - R(0.012), i = 0; x <= x1 + R(0.012) + 0.1; x += sw / 2, i++) {
    ctx.arc(x + sw / 4, ay, sw / 4, 0, Math.PI);
  }
  ctx.fillStyle = stripes[0];
  ctx.fill();
  if (start) {
    ctx.font = `900 ${Math.max(12, R(0.032))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.fillText('유령집', (x0 + x1) / 2, yt - H * 0.72 + Math.sin(t * 0.05) * 1.5);
  }
}

function drawBush(ctx: C2, x: number, y: number, r: number, t: number, ph: number) {
  const sw = Math.sin(t * 0.04 + ph) * r * 0.04;
  ctx.beginPath();
  for (const [bx, by, br] of [[-0.6, -0.35, 0.55], [0.55, -0.35, 0.55], [0, -0.7, 0.62], [-0.1, -0.3, 0.6]]) {
    ctx.moveTo(x + bx * r + sw + br * r, y + by * r);
    ctx.arc(x + bx * r + sw, y + by * r, br * r, 0, TAU);
  }
  ctx.lineWidth = 2.6;
  ctx.strokeStyle = OUT;
  ctx.stroke();
  ctx.fillStyle = radg(ctx, x - r * 0.3, y - r * 0.9, r * 0.1, r * 1.5, [0, '#a9e58c'], [0.6, '#6cc46a'], [1, '#48a35a']);
  ctx.fill();
  for (let k = 0; k < 4; k++) {
    ctx.fillStyle = ['#ff8fb0', '#ffffff', '#ffd84a', '#ff8fb0'][k];
    ctx.beginPath();
    ctx.arc(x + (hsh(ph + k) - 0.5) * r * 1.4, y - r * (0.35 + hsh(ph + k + 9) * 0.6), r * 0.11, 0, TAU);
    ctx.fill();
  }
}
function drawHedge(ctx: C2, o: Obj, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, wall: boolean) {
  const x0 = X(o.x - o.w! / 2), x1 = X(o.x + o.w! / 2), yb = Y(o.y), yt = Y(o.y - o.d!), H = R(o.h!);
  // 윗면 + 앞면
  rr(ctx, x0, yt - H, x1 - x0, yb - yt, R(0.012));
  outlined(ctx, wall ? '#f4e2c6' : '#8fd97a', 1.8);
  rr(ctx, x0, yb - H, x1 - x0, H, R(0.01));
  outlined(ctx, wall ? lin(ctx, 0, yb - H, 0, yb, [0, '#e8cfa6'], [1, '#d2b386']) : lin(ctx, 0, yb - H, 0, yb, [0, '#6cc46a'], [1, '#4aa65a']), 1.8);
  if (wall) {
    ctx.strokeStyle = 'rgba(140,100,60,.35)';
    ctx.lineWidth = 1;
    for (let yy = yt - H + R(0.02); yy < yb - R(0.005); yy += R(0.022)) {
      ctx.beginPath();
      ctx.moveTo(x0 + 2, yy);
      ctx.lineTo(x1 - 2, yy);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = 'rgba(255,255,220,.3)';
    for (let yy = yt - H + R(0.012); yy < yb - H; yy += R(0.03)) {
      ell(ctx, (x0 + x1) / 2, yy, (x1 - x0) * 0.3, R(0.006));
      ctx.fill();
    }
  }
}
function drawMail(ctx: C2, o: Obj, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number) {
  const x = X(o.x), yb = Y(o.y), H = R(o.h!), bw = R(o.w!), bh = R(0.05);
  rr(ctx, x - R(0.005), yb - H + bh * 0.5, R(0.01), H - bh * 0.5, 2);
  outlined(ctx, '#9a7b6a', 1.3);
  rr(ctx, x - bw / 2, yb - H, bw, bh, R(0.014));
  outlined(ctx, lin(ctx, x - bw / 2, 0, x + bw / 2, 0, [0, '#ff6b5a'], [1, '#d9443a']), 1.6);
  ctx.fillStyle = '#5a2a2a';
  ctx.fillRect(x - bw * 0.3, yb - H + bh * 0.3, bw * 0.6, 2);
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  ctx.fillRect(x - bw * 0.38, yb - H + 2, bw * 0.15, bh * 0.5);
}
function drawMirror(ctx: C2, o: Obj, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, t: number, on: boolean) {
  const x = X(o.x), yb = Y(o.y), H = R(o.h!), r = R(o.r! * 1.05), f = o.face!;
  rr(ctx, x - R(0.006), yb - H, R(0.012), H, 2);
  outlined(ctx, '#ff9d3a', 1.4);
  ctx.save();
  ctx.translate(x - f * R(0.008), yb - H);
  ell(ctx, 0, 0, r * 0.62, r);
  outlined(ctx, '#ff8a2a', 2.2);
  ell(ctx, 0, 0, r * 0.48, r * 0.84);
  ctx.fillStyle = lin(ctx, -r * 0.5, -r, r * 0.5, r, [0, '#e8f6ff'], [0.5, '#9fd2f2'], [1, '#6aaee0']);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  ell(ctx, -f * r * 0.15, -r * 0.35, r * 0.1, r * 0.28, 0.2);
  ctx.fill();
  if (on) {
    const gl = 0.6 + 0.4 * Math.sin(t * 0.3);
    ctx.fillStyle = radg(ctx, 0, 0, 0, r * 2.2, [0, `rgba(255,250,200,${0.9 * gl})`], [1, 'rgba(255,250,200,0)']);
    ctx.beginPath();
    ctx.arc(0, 0, r * 2.2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    starPath(ctx, f * r * 0.1, -r * 0.2, r * 0.6 * gl, 0.25, 4);
    ctx.fill();
  }
  ctx.restore();
}
function drawParasol(ctx: C2, o: Obj, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, t: number) {
  const x = X(o.x), yb = Y(o.y), H = R(o.h!), r = R(o.r! * 1.1);
  // 탁자·의자
  ell(ctx, x, yb - R(0.04), R(0.05), R(0.018));
  outlined(ctx, '#ffffff', 1.5);
  rr(ctx, x - R(0.005), yb - R(0.04), R(0.01), R(0.04), 2);
  outlined(ctx, '#c9b7a6', 1.2);
  for (const s of [-1, 1]) {
    rr(ctx, x + s * R(0.075) - R(0.016), yb - R(0.05), R(0.032), R(0.04), 4);
    outlined(ctx, '#9fd6ff', 1.4);
  }
  ctx.fillStyle = '#ff8fa8';
  ell(ctx, x - R(0.012), yb - R(0.048), R(0.012), R(0.006));
  ctx.fill();
  rr(ctx, x - R(0.008), yb - H, R(0.016), H - R(0.04), 3);
  outlined(ctx, lin(ctx, x - R(0.008), 0, x + R(0.008), 0, [0, '#ffffff'], [1, '#d8cfe6']), 1.5);
  // 우산 (줄무늬 갓)
  const top = yb - H - R(0.065), sway = Math.sin(t * 0.04) * 1.5;
  for (let i = 0; i < 8; i++) {
    const a0 = Math.PI + (i * Math.PI) / 8, a1 = Math.PI + ((i + 1) * Math.PI) / 8;
    ctx.beginPath();
    ctx.moveTo(x + sway, top);
    ctx.lineTo(x + Math.cos(a0) * r, yb - H + Math.sin(a0) * -R(0.0));
    ctx.lineTo(x + Math.cos(a1) * r, yb - H);
    ctx.closePath();
    ctx.fillStyle = i % 2 ? '#ffffff' : '#ff6b6b';
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(x + sway, top);
  ctx.lineTo(x - r, yb - H);
  for (let i = 0; i < 8; i++) ctx.quadraticCurveTo(x - r + ((i + 0.5) * 2 * r) / 8, yb - H + R(0.016), x - r + ((i + 1) * 2 * r) / 8, yb - H);
  ctx.closePath();
  ctx.lineWidth = 2;
  ctx.strokeStyle = OUT;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + sway, top - 2, R(0.008), 0, TAU);
  outlined(ctx, '#ffd84a', 1.2);
}
function drawLaundry(ctx: C2, o: Obj, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, wt: number) {
  const th = laundrySwing(o, wt), x0 = X(o.x - o.w! / 2 - 0.02), x1 = X(o.x + o.w! / 2 + 0.02), yb = Y(o.y), H = R(o.h!);
  for (const px of [x0, x1]) {
    rr(ctx, px - R(0.005), yb - H - R(0.01), R(0.01), H + R(0.01), 2);
    outlined(ctx, '#b98656', 1.3);
  }
  ctx.strokeStyle = '#7a6a5a';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(x0, yb - H);
  ctx.quadraticCurveTo((x0 + x1) / 2, yb - H + R(0.01), x1, yb - H);
  ctx.stroke();
  // 이불: 줄에서 내려와 앞뒤로 흔들린다 (앞으로 오면 아래 끝이 내려와 보인다)
  const len = R(o.d!), sx0 = X(o.x - o.w! / 2), sx1 = X(o.x + o.w! / 2), top = yb - H + R(0.006);
  const by = top + len * Math.cos(th) + len * Math.sin(th) * 0.35, fl = Math.sin(th);
  ctx.beginPath();
  ctx.moveTo(sx0, top);
  ctx.lineTo(sx1, top);
  ctx.quadraticCurveTo(sx1 + fl * R(0.01), (top + by) / 2, sx1, by);
  for (let i = 4; i >= 0; i--) {
    const xx = sx0 + ((sx1 - sx0) * i) / 4;
    ctx.quadraticCurveTo(xx + (sx1 - sx0) / 8, by + R(0.008), xx, by);
  }
  ctx.quadraticCurveTo(sx0 + fl * R(0.01), (top + by) / 2, sx0, top);
  ctx.closePath();
  const shade = 0.5 + 0.5 * fl;
  ctx.fillStyle = lin(ctx, 0, top, 0, by, [0, '#ffffff'], [1, `rgb(${Math.round(225 + 25 * shade)},${Math.round(235 + 15 * shade)},255)`]);
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = 'rgba(130,190,255,.45)';
  for (let x = sx0 + R(0.01); x < sx1; x += R(0.035)) ctx.fillRect(x, top, R(0.012), by - top);
  ctx.fillStyle = 'rgba(255,150,190,.5)';
  for (let k = 0; k < 4; k++) {
    ctx.beginPath();
    ctx.arc(sx0 + (sx1 - sx0) * (0.2 + k * 0.2), top + (by - top) * (0.3 + 0.4 * (k % 2)), R(0.008), 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = OUT;
  ctx.stroke();
  for (const px of [sx0 + R(0.01), sx1 - R(0.01)]) {
    ctx.fillStyle = '#ffd84a';
    ctx.fillRect(px - 1.5, top - R(0.01), 3, R(0.016));
  }
}
function drawTruck(ctx: C2, o: Obj, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, wt: number) {
  const tx = truckX(o, wt);
  if (tx < -0.5 || tx > 1.5) return;
  const dir = Math.sign(o.v!) || 1, x0 = X(tx - o.w! / 2), x1 = X(tx + o.w! / 2), yb = Y(o.y), H = R(o.h!), D = R(o.d!);
  const bounce = Math.abs(Math.sin(wt * 0.4)) * 1.2;
  ctx.save();
  ctx.translate(0, -bounce);
  // 짐칸 (뒤) · 운전석 (앞)
  const cabW = (x1 - x0) * 0.32, boxX0 = dir > 0 ? x0 : x0 + cabW, boxX1 = dir > 0 ? x1 - cabW : x1;
  rr(ctx, boxX0, yb - H - D * 0.4, boxX1 - boxX0, D * 0.4, 3);
  outlined(ctx, '#d9f0ff', 1.6);
  rr(ctx, boxX0, yb - H, boxX1 - boxX0, H - R(0.02), 4);
  outlined(ctx, lin(ctx, 0, yb - H, 0, yb, [0, '#8fd0ff'], [1, '#5fb0ea']), 2);
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${Math.max(12, R(0.03))}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('빵 배달', (boxX0 + boxX1) / 2, yb - H * 0.45);
  const cx0 = dir > 0 ? x1 - cabW : x0, cx1 = dir > 0 ? x1 : x0 + cabW;
  rr(ctx, cx0, yb - H * 0.8, cx1 - cx0, H * 0.8 - R(0.02), 6);
  outlined(ctx, '#ffd25a', 2);
  rr(ctx, cx0 + (cx1 - cx0) * 0.18, yb - H * 0.72, (cx1 - cx0) * 0.64, H * 0.3, 4);
  outlined(ctx, '#bfe8ff', 1.4);
  ctx.fillStyle = '#fff7c0';
  ell(ctx, dir > 0 ? cx1 - 2 : cx0 + 2, yb - H * 0.25, R(0.008), R(0.01));
  ctx.fill();
  for (const wx of [x0 + (x1 - x0) * 0.2, x0 + (x1 - x0) * 0.8]) {
    ctx.beginPath();
    ctx.arc(wx, yb - R(0.012), R(0.022), 0, TAU);
    outlined(ctx, '#4a3a4a', 1.5);
    ctx.save();
    ctx.translate(wx, yb - R(0.012));
    ctx.rotate(wt * 0.2 * dir);
    ctx.fillStyle = '#d9d0e0';
    ctx.fillRect(-R(0.009), -1, R(0.018), 2);
    ctx.fillRect(-1, -R(0.009), 2, R(0.018));
    ctx.restore();
  }
  ctx.restore();
  // 매연 퐁퐁
  for (let j = 0; j < 3; j++) {
    const ph = (wt * 0.02 + j / 3) % 1, ex = (dir > 0 ? x0 : x1) - dir * ph * R(0.08);
    ctx.fillStyle = `rgba(255,255,255,${0.7 * (1 - ph)})`;
    ctx.beginPath();
    ctx.arc(ex, yb - R(0.02) - ph * R(0.03), R(0.008 + ph * 0.012), 0, TAU);
    ctx.fill();
  }
}
function drawCloud(ctx: C2, x: number, y: number, k: number, t: number, dusk: boolean) {
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 0.02 + x) * 1.5);
  const blobs = [[-0.55, 0.1, 0.38], [-0.15, -0.18, 0.5], [0.35, -0.1, 0.44], [0.7, 0.12, 0.3], [0.1, 0.15, 0.45]];
  ctx.beginPath();
  for (const [bx, by, br] of blobs) {
    ctx.moveTo(bx * k + br * k, by * k);
    ctx.arc(bx * k, by * k, br * k, 0, TAU);
  }
  ctx.fillStyle = dusk ? '#fff0e6' : '#ffffff';
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = dusk ? '#e7b6b0' : '#b9d6ef';
  ctx.stroke();
  ctx.fill();
  ctx.fillStyle = dusk ? 'rgba(240,170,170,.35)' : 'rgba(170,200,240,.35)';
  ell(ctx, 0.1 * k, 0.28 * k, 0.75 * k, 0.12 * k);
  ctx.fill();
  // 구름 얼굴 (졸린 눈)
  ctx.strokeStyle = '#8aa6c8';
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(s * k * 0.15, -k * 0.02, k * 0.06, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,160,180,.5)';
  for (const s of [-1, 1]) {
    ell(ctx, s * k * 0.3, k * 0.08, k * 0.07, k * 0.04);
    ctx.fill();
  }
  ctx.restore();
}
function drawHand(ctx: C2, x: number, y: number, k: number, press: number) {
  ctx.save();
  ctx.translate(x, y + press * k * 0.1);
  ctx.rotate(-0.25);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = INK;
  ctx.lineWidth = k * 0.07;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-k * 0.12, 0);
  ctx.lineTo(-k * 0.12, k * 0.55);
  ctx.quadraticCurveTo(-k * 0.45, k * 0.42, -k * 0.38, k * 0.62);
  ctx.lineTo(-k * 0.12, k * 1.05);
  ctx.quadraticCurveTo(k * 0.1, k * 1.25, k * 0.42, k * 1.05);
  ctx.quadraticCurveTo(k * 0.55, k * 0.75, k * 0.48, k * 0.5);
  ctx.quadraticCurveTo(k * 0.45, k * 0.38, k * 0.32, k * 0.4);
  ctx.quadraticCurveTo(k * 0.3, k * 0.3, k * 0.18, k * 0.32);
  ctx.quadraticCurveTo(k * 0.15, k * 0.24, k * 0.1, k * 0.26);
  ctx.lineTo(k * 0.1, 0);
  ctx.quadraticCurveTo(-k * 0.01, -k * 0.14, -k * 0.12, 0);
  ctx.closePath();
  ctx.stroke();
  ctx.fill();
  ctx.restore();
}

const TRAIL = new WeakMap<object, { x: number; y: number; t: number }[]>();
const trailOf = (s: GhostState) => {
  let a = TRAIL.get(s);
  if (!a) TRAIL.set(s, (a = []));
  return a;
};
const BAND: Record<string, string> = { roof: '그림자 다리!', candy: '그림자 다리!', cloud: '구름 타고 슝!', laundry: '이불 그늘 슝!', mirror: '그림자 다리!', parasol: '파라솔 타고 슝!', truck: '트럭 타고 슝!', sunset: '긴 그림자 쭈욱!' };
const SPOT: Record<string, OK> = { cloud: 'cloud', laundry: 'laundry', mirror: 'mirror', parasol: 'parasol', truck: 'truck' };
const SPOT_LABEL: Record<string, string> = { candy: '별사탕', cloud: '구름', laundry: '빨랫줄', mirror: '볼록거울', parasol: '큰 파라솔', truck: '트럭', sunset: '해 질 녘' };

function drawAll(ctx: C2, s: GhostState, w: number, h: number, th: Theme) {
  void th;
  const fx = juice(s), X = (x: number) => x * w, Y = (y: number) => y * w, R = X;
  const G = geo(s), d = G.def, t = s.t, wt = s.wt, ui = uIdx(s.u), u = ui / NU, lf = d.lf ?? 1, dusk = d.key === 'sunset';
  const sc = typeof ctx.getTransform === 'function' ? ctx.getTransform().a || 1 : 1;
  const bg = getBg(Math.round(w), Math.round(h), Math.min(3, Math.max(1, Math.round(sc))), G, dusk);
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  const [gx, gy] = pathAt(G.path, s.p);
  const cov = coverAt(G, ui, wt);
  const held = s.down && s.phase === 'play' ? 1 : 0;

  ctx.save();
  fx.begin(ctx);
  ctx.fillStyle = '#9ad67f';
  ctx.fillRect(-20, -20, w + 40, h + 40);
  ctx.drawImage(bg.sky, 0, 0, w, Y(HZ) + R(0.02));
  // 해 길 (점선 호)
  ctx.save();
  ctx.setLineDash([R(0.008), R(0.014)]);
  ctx.strokeStyle = held ? 'rgba(255,255,255,.85)' : 'rgba(255,255,255,.5)';
  ctx.lineWidth = held ? 2.5 : 1.8;
  ctx.beginPath();
  for (let k = 0; k <= 30; k++) {
    const q = k / 30;
    k ? ctx.lineTo(X(sunX(q)), Y(sunY(q))) : ctx.moveTo(X(sunX(q)), Y(sunY(q)));
  }
  ctx.stroke();
  ctx.restore();
  // 구름 (하늘)
  for (const o of G.objs) if (o.k === 'cloud') drawCloud(ctx, X(cloudX(o, wt)), Y(0.2 + (o.x0! > 0.3 ? 0.04 : 0)), R(o.r! * 0.75), t, dusk);
  drawSun(ctx, X(sunX(s.u)), Y(sunY(s.u)), R(0.062), t, held, dusk);
  ctx.drawImage(bg.ground, 0, 0, w, h);

  // ── 그림자 (한 번에 칠해 겹쳐도 같은 진하기) ──
  const polys: Poly[] = [];
  for (const o of G.objs) shadowOf(o, u, lf, wt, polys);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, Y(HZ), w, Y(GB) - Y(HZ));
  ctx.clip();
  ctx.beginPath();
  for (const p of polys) {
    p.forEach((q, i) => (i ? ctx.lineTo(X(q[0]), Y(q[1])) : ctx.moveTo(X(q[0]), Y(q[1]))));
    ctx.closePath();
  }
  ctx.fillStyle = dusk ? 'rgba(118,64,196,0.44)' : SHADE;
  ctx.fill('nonzero');
  ctx.restore();
  // 길 위 그늘·햇빛 표시: 그늘 길은 시원한 점선, 앞쪽 햇빛 길은 반짝
  {
    const L = G.path.len;
    ctx.save();
    ctx.lineCap = 'round';
    for (const [a, b] of cov) {
      if (b < s.p - 0.02) continue;
      ctx.strokeStyle = 'rgba(200,230,255,.55)';
      ctx.lineWidth = R(0.012);
      ctx.setLineDash([R(0.012), R(0.016)]);
      ctx.lineDashOffset = -t * 0.6;
      ctx.beginPath();
      for (let q = Math.max(a, s.p), k = 0; q <= b + 1e-6; q = Math.min(b, q + 0.02), k++) {
        const [px, py] = pathAt(G.path, q);
        k ? ctx.lineTo(X(px), Y(py)) : ctx.moveTo(X(px), Y(py));
        if (q >= b) break;
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);
    // 앞쪽 햇빛 반짝 (위험)
    for (let q = s.p + 0.03; q < L - 0.02; q += 0.045) {
      if (ivAt(cov, q)) continue;
      const [px, py] = pathAt(G.path, q), tw = 0.5 + 0.5 * Math.sin(t * 0.2 + q * 40);
      ctx.fillStyle = `rgba(255,236,140,${0.35 + 0.35 * tw})`;
      starPath(ctx, X(px), Y(py), R(0.007 + 0.004 * tw), 0.3, 4);
      ctx.fill();
    }
    ctx.restore();
  }
  // 반사 빛 동그라미 (볼록거울)
  for (const o of G.objs) {
    const b = beamOf(o, u, lf);
    if (!b) continue;
    const gl = 0.75 + 0.25 * Math.sin(t * 0.25);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const mx = X(o.x - o.face! * 0.008), my = Y(o.y) - R(o.h!);
    let cx = 0, cy = 0;
    for (const q of b) (cx += q[0] / b.length), (cy += q[1] / b.length);
    ctx.strokeStyle = `rgba(255,240,170,${0.25 * gl})`;
    ctx.lineWidth = R(0.03);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(mx, my);
    ctx.lineTo(X(cx), Y(cy));
    ctx.stroke();
    ctx.beginPath();
    b.forEach((q, i) => (i ? ctx.lineTo(X(q[0]), Y(q[1])) : ctx.moveTo(X(q[0]), Y(q[1]))));
    ctx.closePath();
    ctx.fillStyle = `rgba(255,236,150,${0.55 * gl})`;
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = `rgba(255,180,60,${0.8 * gl})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    b.forEach((q, i) => (i ? ctx.lineTo(X(q[0]), Y(q[1])) : ctx.moveTo(X(q[0]), Y(q[1]))));
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffffff';
    for (let j = 0; j < 3; j++) {
      const a = t * 0.05 + (j * TAU) / 3;
      starPath(ctx, X(cx) + Math.cos(a) * R(0.03), Y(cy) + Math.sin(a) * R(0.015), R(0.006), 0.3, 4);
      ctx.fill();
    }
  }

  // ── 서 있는 것들: 깊이(발 y) 순서로 ──
  type Item = { y: number; draw: () => void };
  const items: Item[] = [];
  const reactT = (k: string) => fx.memo[k] ?? -999;
  const houses = G.objs.filter((o) => o.k === 'house');
  const grannyHouse = houses.length ? houses[houses.length - 1] : null;
  const walls = G.objs.filter((o) => o.k === 'wall' || o.k === 'hedge');
  const catOn = walls[0] ?? G.objs.find((o) => o.k === 'porch' && o !== G.objs[0]) ?? null;
  for (const o of G.objs) {
    switch (o.k) {
      case 'tree': items.push({ y: o.y, draw: () => drawTree(ctx, X(o.x), Y(o.y), w, o.hc!, o.r!, t, o.x * 10) }); break;
      case 'house': items.push({ y: o.y, draw: () => drawHouse(ctx, o, X, Y, R, t, o === grannyHouse ? { t: reactT('gran') } : null, clamp(gx - o.x + 0.5, 0, 1)) }); break;
      case 'hedge': case 'wall': items.push({ y: o.y, draw: () => drawHedge(ctx, o, X, Y, R, o.k === 'wall') }); break;
      case 'mail': items.push({ y: o.y, draw: () => drawMail(ctx, o, X, Y, R) }); break;
      case 'porch': items.push({ y: o.y - o.d! - 0.01, draw: () => drawPorch(ctx, o, X, Y, R, o === G.objs[0], t) }); break;
      case 'mirror': items.push({ y: o.y, draw: () => drawMirror(ctx, o, X, Y, R, t, !!beamOf(o, u, lf)) }); break;
      case 'parasol': items.push({ y: o.y, draw: () => drawParasol(ctx, o, X, Y, R, t) }); break;
      case 'laundry': items.push({ y: o.y, draw: () => drawLaundry(ctx, o, X, Y, R, wt) }); break;
      case 'truck': items.push({ y: o.y, draw: () => drawTruck(ctx, o, X, Y, R, wt) }); break;
      case 'bush': items.push({ y: o.y, draw: () => drawBush(ctx, X(o.x), Y(o.y), R(o.r!), t, o.x * 7) }); break;
      default: break;
    }
  }
  if (catOn) {
    const top = catOn.k === 'porch' ? catOn.y - catOn.h! - 0.03 : catOn.y - catOn.d! - catOn.h! + 0.004;
    const cxp = catOn.k === 'porch' ? catOn.x + 0.03 : catOn.x;
    items.push({ y: catOn.y + 0.0005, draw: () => drawCat(ctx, X(cxp), Y(top), R(0.092), t, reactT('cat'), clamp((gx - cxp) * 4, -1, 1)) });
  }
  // 장난감 (길 끝)
  const goal = G.path.pts[G.path.pts.length - 1];
  items.push({ y: goal[1] + 0.003, draw: () => drawToy(ctx, X(goal[0] + (s.flip ? -0.02 : 0.02)), Y(goal[1] + 0.003), R(0.075), t, dusk, s.phase === 'result' && s.ok) });
  // 별사탕
  G.cand.forEach((q, j) => {
    if (s.taken[j]) return;
    const sh = candyShaded(G, ui, wt, j);
    items.push({ y: q.y, draw: () => drawCandy(ctx, X(q.x), Y(q.y), R(0.027), t, sh, CANDY_COL[(j + s.stage) % CANDY_COL.length], j * 2.1) });
  });
  // 유령
  const hotV = s.hot > 0 ? 1 : Math.max(0, 1 - s.sz) * 0.6;
  const pose = s.phase === 'result' ? (s.ok ? 3 : 4) : s.hot > 0 ? 2 : s.moving > VMIN * 1.2 ? 1 : 0;
  const gk = R(0.135) * (0.55 + 0.45 * clamp(s.sz, 0, 1));
  items.push({
    y: gy + 0.0002,
    draw: () => {
      // 미끄러진 자국 (꼬리)
      for (const q of trailOf(s)) {
        const a = Math.max(0, 1 - (t - q.t) / 18);
        if (a <= 0) continue;
        ctx.fillStyle = `rgba(255,255,255,${0.35 * a})`;
        ell(ctx, X(q.x), Y(q.y) - gk * 0.55, gk * 0.42 * a, gk * 0.45 * a);
        ctx.fill();
      }
      let hop = 0;
      if (pose === 0 && s.phase === 'play') hop = Math.abs(Math.sin(t * 0.25)) * R(0.008);
      drawGhost(ctx, X(gx), Y(gy) - hop, gk, t, pose, s.face, pose === 1 ? 1 : 0, hotV);
      // 몸 크기 (줄면 보이는 막대)
      if (s.phase === 'play' && (s.sz < 0.985 || s.hot > 0)) {
        const bw = R(0.09), bx = X(gx) - bw / 2, by = Y(gy) - gk * 1.45 - R(0.02);
        rr(ctx, bx - 2, by - 2, bw + 4, R(0.016) + 4, R(0.01));
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        ctx.fill();
        const fr = clamp((s.sz - FAIL_SZ) / (1 - FAIL_SZ), 0, 1);
        rr(ctx, bx, by, bw * fr, R(0.016), R(0.008));
        ctx.fillStyle = fr < 0.35 ? '#ff5a5a' : fr < 0.7 ? '#ffb347' : '#8fd06a';
        ctx.fill();
      }
    },
  });
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.draw();
  // 꼬리 자국 기록 (연출)
  const tr = trailOf(s);
  if (s.moving > VMIN * 1.5 && t % 3 === 0 && tr[tr.length - 1]?.t !== t) tr.push({ x: gx, y: gy, t });
  if (tr.length > 10) tr.shift();

  // 뜨거울 때: 화면 가장자리가 붉게
  if (s.hot > 0 && s.phase === 'play') {
    ctx.fillStyle = radg(ctx, X(gx), Y(gy), R(0.25), R(1.0), [0, 'rgba(255,120,60,0)'], [1, `rgba(255,120,60,${0.22 + 0.08 * Math.sin(t * 0.5)})`]);
    ctx.fillRect(0, 0, w, h);
  }

  // 첫 안내: 손가락이 해를 잡아 끄는 시늉
  if (s.stage === 0 && !s.started && s.phase === 'play') {
    const cyc = (t % 120) / 120, mv = clamp((cyc - 0.15) / 0.55, 0, 1), ez = mv * mv * (3 - 2 * mv);
    const u0 = s.u, u1 = 0.5, hu = u0 + (u1 - u0) * ez, hx = X(sunX(hu)), hy = Y(sunY(hu));
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 6]);
    ctx.lineDashOffset = -t * 0.8;
    ctx.beginPath();
    for (let k = 0; k <= 20; k++) {
      const q = u0 + (u1 - u0) * (k / 20);
      k ? ctx.lineTo(X(sunX(q)), Y(sunY(q)) + R(0.1)) : ctx.moveTo(X(sunX(q)), Y(sunY(q)) + R(0.1));
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.beginPath();
    ctx.moveTo(X(sunX(u1)) - R(0.02), Y(sunY(u1)) + R(0.1));
    ctx.lineTo(X(sunX(u1)) + R(0.01), Y(sunY(u1)) + R(0.08));
    ctx.lineTo(X(sunX(u1)) + R(0.01), Y(sunY(u1)) + R(0.12));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    drawHand(ctx, hx + R(0.01), hy + R(0.02), R(0.1), cyc < 0.15 || cyc > 0.75 ? 0 : 1);
    // 유령 말풍선: "그늘이 없어…"
    const bx = clamp(X(gx) + R(0.16), R(0.15), w - R(0.15)), by = Y(gy) - R(0.24);
    font(0.034, 900);
    const msg = '그늘이 없어…', tw = ctx.measureText(msg).width + R(0.04);
    rr(ctx, bx - tw / 2, by - R(0.025), tw, R(0.05), R(0.02));
    outlined(ctx, '#ffffff', 2, '#6a5a8c');
    ctx.fillStyle = INK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(msg, bx, by + 1);
  }
  // 새것 스포트라이트 (판 시작 몇 초)
  {
    const key = d.key, kind = SPOT[key];
    let tx = -1, ty = -1, rad = 0;
    if (kind) {
      const o = G.objs.find((q) => q.k === kind);
      if (o) {
        if (o.k === 'cloud') {
          // 구름은 그림자 쪽을 비춘다
          const pl: Poly[] = [];
          shadowOf(o, u, lf, wt, pl);
          const q = pl[0];
          tx = q ? q.reduce((a2, b2) => a2 + b2[0], 0) / q.length : cloudX(o, wt);
          ty = q ? q.reduce((a2, b2) => a2 + b2[1], 0) / q.length : o.y;
          rad = 0.17;
        } else if (o.k === 'truck') ((tx = clamp(truckX(o, wt), 0.15, 0.85)), (ty = o.y - 0.06), (rad = 0.16));
        else ((tx = o.x), (ty = o.y - (o.h ?? 0.1) * 0.6), (rad = 0.13));
      }
    } else if (key === 'candy' && G.cand.length > 1) ((tx = G.cand[1].x), (ty = G.cand[1].y - 0.02), (rad = 0.08));
    const age = s.pt, end = s.pressAt >= 0 ? Math.min(170, Math.max(s.pressAt + 30, 60)) : 170;
    if (tx >= 0 && s.phase === 'play' && age > 20 && age < end && !s.again) {
      const a = Math.min(1, (age - 20) / 10, (end - age) / 20), cx = X(tx), cy = Y(ty), r0 = R(rad);
      ctx.save();
      ctx.fillStyle = `rgba(40,30,70,${0.38 * a})`;
      ctx.beginPath();
      ctx.rect(-20, Y(HZ) - R(0.2), w + 40, Y(GB) - Y(HZ) + R(0.2));
      ctx.arc(cx, cy, r0, 0, TAU, true);
      ctx.fill();
      ctx.strokeStyle = `rgba(255,216,74,${a})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, r0 + Math.sin(t * 0.3) * 2, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = a;
      font(0.04, 900);
      const label = `NEW  ${SPOT_LABEL[key]}`, tw = ctx.measureText(label).width + R(0.04), lx = clamp(cx, tw / 2 + 6, w - tw / 2 - 6), ly = cy - r0 - R(0.04) < Y(HZ) ? cy + r0 + R(0.04) : cy - r0 - R(0.04);
      rr(ctx, lx - tw / 2, ly - R(0.026), tw, R(0.052), R(0.026));
      outlined(ctx, '#ffd84a', 2, '#ffffff');
      ctx.fillStyle = INK;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, lx, ly + 1);
      ctx.restore();
    }
  }

  // ── 사건 연출 ──
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const ex = X(e.x), ey = Y(e.y);
    if (e.kind === 'bridge') {
      fx.memo.bigT = t;
      fx.memo.bigX = ex;
      fx.memo.bigY = ey;
      fx.kick(5);
      fx.ring(ex, ey - R(0.06), '#d8ccff', R(0.16), 5);
      fx.burst(ex, ey - R(0.06), '#ffffff', 18, 4, 2.6);
      fx.burst(ex, ey - R(0.06), '#c9b8ff', 12, 3, 2.2);
      fx.memo.cat = t;
    }
    if (e.kind === 'land') {
      fx.burst(ex, ey, '#e8e2ff', 10, 2.4, 2);
      fx.pop(ex, ey - R(0.2), '착!', '#ffffff', 15);
    }
    if (e.kind === 'candy') {
      const col = CANDY_COL[(e.n ?? 0) % CANDY_COL.length];
      fx.burst(ex, ey - R(0.03), col, 16, 3.4, 2.4);
      fx.burst(ex, ey - R(0.03), '#ffffff', 8, 2.4, 1.6);
      fx.ring(ex, ey - R(0.03), col, R(0.07), 3);
      fx.pop(ex, ey - R(0.09), e.text === 'all' ? '별사탕 다 모았다!' : '+별사탕', e.text === 'all' ? '#fff27a' : '#ffffff', e.text === 'all' ? 18 : 15);
      fx.kick(e.text === 'all' ? 4 : 2);
      if (e.text === 'all') fx.memo.gran = t;
    }
    if (e.kind === 'hot') {
      fx.burst(ex, ey - R(0.12), '#ffffff', 10, 2.6, 2.4);
      fx.burst(ex, ey - R(0.1), '#ffb36b', 8, 2.4, 2);
      fx.blink('#ffd0a0', 0.14);
      fx.kick(4);
      if (t - (fx.memo.ow ?? -99) > 50) (fx.memo.ow = t), fx.pop(ex, ey - R(0.22), '앗 뜨거!', '#ff7a4a', 18);
    }
    if (e.kind === 'clear') {
      fx.burst(ex, ey - R(0.08), '#ffd84a', 36, 5, 3);
      fx.burst(ex, ey - R(0.08), '#ff9ec4', 26, 4.4, 2.6);
      fx.ring(ex, ey - R(0.06), '#ffffff', R(0.3), 6);
      fx.blink('#fff6d0', 0.25);
      fx.memo.cat = t;
      fx.memo.gran = t;
    }
    if (e.kind === 'fail') {
      fx.kick(6);
      fx.burst(ex, ey - R(0.04), '#ffffff', 22, 3.4, 3);
      fx.pop(ex, ey - R(0.18), '흐물흐물…', '#ffffff', 18);
    }
  }
  fx.memo.t = t;
  ctx.restore();

  // 큰 순간 띠: '그림자 다리!'
  if (fx.memo.bigT !== undefined && t - fx.memo.bigT < 56) {
    const age = t - fx.memo.bigT, sc2 = age < 6 ? 1.7 - 0.7 * (age / 6) : 1, a = Math.min(1, (56 - age) / 16);
    const txt = BAND[d.key] ?? '그림자 다리!', size = Math.round(R(0.075));
    ctx.font = `900 ${size}px system-ui, sans-serif`;
    const half = ctx.measureText(txt).width / 2 + 24;
    const bx = clamp(fx.memo.bigX, half + 6, w - half - 6), by = clamp(fx.memo.bigY - R(0.34), Y(HZ + 0.02), Y(1.05));
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(bx, by);
    ctx.rotate(-0.05);
    ctx.scale(sc2, sc2);
    ctx.font = `900 ${size}px system-ui, sans-serif`;
    const tw = ctx.measureText(txt).width;
    rr(ctx, -tw / 2 - 16, -size * 0.75, tw + 32, size * 1.5, size * 0.75);
    ctx.fillStyle = 'rgba(255,255,255,.95)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#8f7bd8';
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#5b4aa8';
    ctx.strokeText(txt, 0, 2);
    ctx.fillStyle = lin(ctx, 0, -size / 2, 0, size / 2, [0, '#e9f6ff'], [0.5, '#b6a6ff'], [1, '#8a72f0']);
    ctx.fillText(txt, 0, 2);
    for (let i = 0; i < 3; i++) {
      const an = t * 0.08 + (i * TAU) / 3;
      ctx.fillStyle = '#ffd84a';
      starPath(ctx, Math.cos(an) * (tw / 2 + 22), Math.sin(an) * (size * 0.85), 5);
      ctx.fill();
    }
    ctx.restore();
  }

  // ═════════════ 위 띠 ═════════════
  ctx.textBaseline = 'middle';
  const hb = R(0.085);
  ctx.fillStyle = 'rgba(0,0,0,.08)';
  ctx.fillRect(0, hb, w, 3);
  ctx.fillStyle = lin(ctx, 0, 0, 0, hb, [0, '#fffaf0'], [1, '#ffeccc']);
  ctx.fillRect(0, 0, w, hb);
  ctx.fillStyle = '#f2c27a';
  ctx.fillRect(0, hb - 2, w, 2);
  {
    const cx = R(0.05), cy = hb / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, R(0.03), 0, TAU);
    outlined(ctx, lin(ctx, cx, cy - R(0.03), cx, cy + R(0.03), [0, '#ffe08a'], [1, '#f5a73a']), 2, '#b86a1e');
    ctx.fillStyle = '#5a2e08';
    font(0.036, 900);
    ctx.textAlign = 'center';
    ctx.fillText(String(s.stage + 1), cx, cy + 1);
    ctx.textAlign = 'left';
    ctx.fillStyle = INK;
    font(0.042, 900);
    ctx.fillText(d.name, R(0.095), cy + 1);
    const nw = ctx.measureText(d.name).width;
    font(0.034, 700);
    ctx.fillStyle = '#9a86a8';
    ctx.fillText(` / ${STAGE_COUNT}`, R(0.095) + nw, cy + 2);
  }
  {
    const cy = hb / 2;
    ctx.textAlign = 'right';
    font(0.042, 900);
    const st = String(s.stars), sw = ctx.measureText(st).width;
    ctx.fillStyle = '#e8961e';
    ctx.fillText(st, w - R(0.03), cy + 1);
    starPath(ctx, w - R(0.03) - sw - R(0.025), cy, R(0.02));
    outlined(ctx, '#ffd23f', 1.2, '#b86a1e');
    for (let j = 0; j < 3; j++) {
      const hx = w - R(0.03) - sw - R(0.08) - j * R(0.048);
      heartPath(ctx, hx, cy, R(0.017));
      outlined(ctx, 2 - j < s.hearts ? lin(ctx, hx, cy - R(0.02), hx, cy + R(0.02), [0, '#ff9aa5'], [1, '#e8455a']) : 'rgba(120,90,110,.15)', 1.4, 2 - j < s.hearts ? '#a8283a' : 'rgba(120,90,110,.35)');
    }
    // 남은 시간이 적으면 시계
    const left = d.time - s.st / 60;
    if (s.phase === 'play' && left < 15 && (s.started || s.stage > 0)) {
      const tx2 = w - R(0.03) - sw - R(0.08) - 3 * R(0.048) - R(0.05);
      ctx.beginPath();
      ctx.arc(tx2, cy, R(0.022), 0, TAU);
      outlined(ctx, left < 6 && Math.floor(t / 10) % 2 ? '#ffcfc4' : '#ffffff', 1.6, '#c8503a');
      ctx.strokeStyle = '#c8503a';
      ctx.beginPath();
      ctx.moveTo(tx2, cy);
      ctx.lineTo(tx2 + Math.cos(-Math.PI / 2 + (1 - left / 15) * TAU) * R(0.016), cy + Math.sin(-Math.PI / 2 + (1 - left / 15) * TAU) * R(0.016));
      ctx.stroke();
      font(0.03, 900);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#c8503a';
      ctx.fillText(String(Math.ceil(left)), tx2 - R(0.03), cy + 1);
    }
  }
  // 판 카드 (지평선 위)
  {
    let head = '', sub = '', age = 0, a = 1;
    if (s.phase === 'result') {
      age = s.pt;
      a = Math.min(1, age / 8);
      if (s.ok) head = s.won ? (dusk ? '친구 유령을 만났어요!' : '모두 찾아 줬어요!') : dusk ? '친구 유령을 만났어요!' : '장난감을 찾아 줬어요!';
      else (head = `으앗… ${s.why}`), (sub = s.hearts > 0 ? '하트 -1 · 같은 판 다시' : '끝 — 유령 꼬마가 낮잠 자러 가요');
    } else if (s.pt < CARD_T && (s.stage > 0 || s.again) && (s.pressAt < 0 || s.pt < s.pressAt + 25)) {
      age = s.pt;
      a = Math.min(1, (CARD_T - s.pt) / 20, age / 6, s.pressAt >= 0 ? (s.pressAt + 25 - s.pt) / 25 : 1);
      head = `${s.again ? '다시! ' : ''}${s.stage + 1}판 · ${d.name}`;
      sub = d.news ? `NEW  ${d.news}` : '해를 끌어 그림자 길을 만들어요';
    }
    if (head) {
      const cy = Y(0.42), pop = Math.min(1, 0.4 + age / 10);
      ctx.save();
      ctx.globalAlpha = a;
      font(0.045, 900);
      const w1 = ctx.measureText(head).width;
      font(0.035, 800);
      const w2 = sub ? ctx.measureText(sub).width : 0;
      const cw = Math.min(w - R(0.05), Math.max(w1, w2) + R(0.1)) * pop, ch = s.phase === 'result' && s.ok ? R(0.15) : sub ? R(0.13) : R(0.08);
      ctx.fillStyle = 'rgba(70,40,90,.18)';
      rr(ctx, w / 2 - cw / 2 + 2, cy - ch / 2 + 5, cw, ch, R(0.04));
      ctx.fill();
      rr(ctx, w / 2 - cw / 2, cy - ch / 2, cw, ch, R(0.04));
      outlined(ctx, lin(ctx, 0, cy - ch / 2, 0, cy + ch / 2, [0, '#fffdf6'], [1, '#ffeed2']), 3, '#f0b45a');
      ctx.beginPath();
      ctx.rect(w / 2 - cw / 2, cy - ch / 2, cw, ch);
      ctx.clip();
      ctx.textAlign = 'center';
      font(0.045, 900);
      ctx.fillStyle = s.phase === 'result' ? (s.ok ? '#b8641a' : '#c0403a') : INK;
      if (s.phase === 'result' && s.ok) {
        ctx.fillText(head, w / 2, cy - R(0.035), w - R(0.08));
        const n = s.starOk.length;
        for (let j = 0; j < n; j++) {
          const ag = s.pt - (14 + j * 12);
          const sx = w / 2 + (j - (n - 1) / 2) * R(0.08), sy = cy + R(0.035);
          const pp = ag < 0 ? 1 : ag < 8 ? 1.9 - 0.9 * (ag / 8) : 1;
          starPath(ctx, sx, sy, R(0.03) * pp);
          outlined(ctx, ag >= 0 && s.starOk[j] ? '#ffc93a' : 'rgba(150,110,60,.18)', 1.6, ag >= 0 && s.starOk[j] ? '#b8641a' : 'rgba(150,110,60,.4)');
          if (ag >= 0 && s.starOk[j] && (fx.memo['st' + j] ?? -1) < s.t - ag) (fx.memo['st' + j] = s.t - ag), fx.burst(sx, sy, '#ffd84a', 16, 3, 2.4);
        }
      } else {
        ctx.fillText(head, w / 2, cy - (sub ? R(0.025) : 0), w - R(0.08));
        if (sub) {
          font(0.035, 800);
          ctx.fillStyle = d.news && s.phase === 'play' ? '#8a4ad0' : '#7a5a6a';
          ctx.fillText(sub, w / 2, cy + R(0.035), w - R(0.08));
        }
      }
      ctx.restore();
    }
  }
  // ═════════════ 아래 띠: 별 조건 · 안내 ═════════════
  {
    const ty = Y(GB);
    ctx.fillStyle = 'rgba(0,0,0,.08)';
    ctx.fillRect(0, ty - 3, w, 3);
    ctx.fillStyle = lin(ctx, 0, ty, 0, h, [0, '#fffaf0'], [1, '#ffefd6']);
    ctx.fillRect(0, ty, w, h - ty + 2);
    ctx.fillStyle = '#f2c27a';
    ctx.fillRect(0, ty, w, 2);
    const r2 = ty + R(0.05);
    const stars = d.stars;
    const all = s.taken.length, got = s.candies;
    const labels = stars.map((q) => (q.k === 'candy' ? `${q.label} ${got}/${all}` : q.label));
    const ok = stars.map((q) => (s.phase === 'result' && s.ok ? s.starOk[stars.indexOf(q)] : q.k === 'candy' ? got >= all : false));
    const bad = stars.map((q) => q.k === 'nohurt' && s.hurt > 6);
    font(0.033, 800);
    const ws = labels.map((l) => ctx.measureText(l).width + R(0.065));
    const gap = R(0.012), tot = ws.reduce((a2, b2) => a2 + b2, 0) + gap * (ws.length - 1), scl = Math.min(1, (w - R(0.03)) / tot);
    let xx = (w - tot * scl) / 2;
    for (let j = 0; j < labels.length; j++) {
      const pw = ws[j] * scl;
      rr(ctx, xx, r2 - R(0.026), pw, R(0.052), R(0.026));
      outlined(ctx, ok[j] ? '#fff1b8' : bad[j] ? 'rgba(160,140,150,.18)' : '#ffffff', 1.6, ok[j] ? '#f0a41e' : bad[j] ? 'rgba(160,140,150,.4)' : '#e8c8a0');
      starPath(ctx, xx + R(0.025) * scl + 2, r2, R(0.014));
      ctx.fillStyle = ok[j] ? '#ffc21e' : bad[j] ? 'rgba(160,140,150,.4)' : '#e6d0b0';
      ctx.fill();
      ctx.textAlign = 'left';
      ctx.fillStyle = bad[j] ? 'rgba(120,100,110,.5)' : INK;
      font(0.033, 800);
      ctx.fillText(labels[j], xx + R(0.047) * scl, r2 + 1, pw - R(0.055) * scl);
      xx += pw + gap * scl;
    }
    let hint = d.hint;
    if (s.stage === 0 && !s.started && s.phase === 'play') hint = '👆 해를 끌어 그림자 길을 만들어요';
    else if (s.hot > 0 && s.phase === 'play') hint = '앗 뜨거! 유령 발밑에 그늘을 돌려줘요';
    else if (s.phase === 'result') hint = s.ok ? (s.won ? '마을을 다 다녔어요!' : `★ ${s.got}개! 다음 판엔 새것이 나와요`) : '유령 발밑의 그늘이 빠지지 않게 천천히';
    const first = s.stage === 0 && !s.started;
    font(first ? 0.04 : 0.034, 900);
    ctx.textAlign = 'center';
    ctx.fillStyle = first ? '#8a4ad0' : '#7a5a6a';
    ctx.fillText(hint, w / 2, ty + R(0.125), w - R(0.04));
  }
}

/** 판 설계 도구용 (계기판·테스트는 안 씀) */
function startAt(s: GhostState, k: number) {
  s.stage = k;
  s.again = false;
  newStage(s);
}
export const __dbg = { geoOf, coverAt, candyShaded, staticCov, shadowOf, beamOf, inPoly, startAt };
