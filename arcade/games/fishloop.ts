/**
 * 🐟 물고기 떼 그물 두르기 (37라운드: 살아 움직이는 세계 — 한 번 긋기) — 한 번 그어 두르기(lasso) × 떼(swarm).
 * 세상: 맑은 바다를 비스듬히 내려다본다. 은빛 물고기 떼 여럿(수백 마리)이 저절로 빙글빙글 돌며(가운데가 빈 고리로 도는 '밀링')
 *   숨 쉬듯 모였다 퍼졌다 하고 천천히 떠다닌다. 상어·해파리·거북이도 지나가고, 하늘의 해가 천천히 진다(판마다 70초 남짓).
 * 손짓 하나: 누르고 쓱 둘러 긋기 = 그물 하나. 손가락이 지나간 자리에 바로 그물 줄(부표가 동동)이 깔리고, 지금 닫으면 몇 마리인지
 *   말풍선과 금빛 테두리로 미리 보인다. 한 바퀴 돌아 시작점에 닿으면 그 순간, 아니면 떼는 순간 끝과 시작이 이어져 닫히고
 *   그물이 휙 오므라들어 안에 든 물고기가 한꺼번에 배로 끌려 올라간다. 선 바로 바깥 것도 잡힌 것으로 친다(넉넉하게).
 *   그물 줄 길이(잉크)는 판마다 정해져 있다. 키보드: 화살표로 커서, 스페이스를 누른 채 화살표로 둘러 긋기.
 * 떼는 눈이 있다: 펜 끝이 떼 둘레에서 1초쯤 머물면 놀라 달아나고 흩어지기 시작하며, 떼 한가운데로 들어오면 바로 흩어진다.
 *   펜 끝·그물 줄에서는 물러난다 — 떼 밖에서 시작해 단숨에 빙 두르면 안쪽 것들이 가운데로 몰려 한가득(1.4초 안이면 거의 다).
 * 와우: 크게 감싸는 순간 그물이 휙 오므라들며 수십~백여 마리가 은빛으로 한꺼번에 퍼덕이며 올라간다(바다가 잠깐 느려짐).
 *   상어를 같이 감싸면 그물이 찌익 — 상어가 찢어진 그물을 목도리처럼 두르고 우쭐, 갈매기가 깔깔(줄 반은 건진다).
 * 판 8개: 정한 수 이상 잡기(배가 가득 차면 바로 끝). 그물 줄을 다 쓰거나 해가 지면 끝 — 모자라면 하트 −1, 같은 바다 다시.
 *   처음 10초는 무슨 일이 있어도 잃지 않는다.
 * 펼쳐짐(하는 일이 바뀐다): 1 큰 떼(바깥에서 빙 두르기) → 2 상어(빼고 두르기·지나가길 기다리기) → 3 해파리(줄이 닿으면 녹아 그 자리에서
 *   닫힘 — 사이로 길 내기) → 4 두 떼가 합쳐졌다 갈라짐(합쳐질 때를 기다려 한 번에) → 5 먹이 구름(떼가 몰려가 꽉 뭉친다, 줄이 짧다 —
 *   어디서 기다릴지) → 6 황금 다랑어(펜 끝이 가까이 오면 달아남 — 멀찍이 넉넉하게) → 7 작은 떼 다섯(가까운 둘을 한 그물에) → 8 모두 함께.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import { REACT, type Bot, type GameDef, type Input, type Theme } from '../core.ts';
import { juice } from '../juice.ts';

/** 화면 세로 ÷ 가로 */
const A = 1.5;
/** 화면(가로 폭 단위): 위 띠 아래 · 바다 좌표 y=0 자리 · 바다 세로 · 아래 띠 시작 */
const HUD_H = 0.085, SEA_Y = 0.205, SH = 1.04, BAND = SEA_Y + SH;
/** 물고기가 다니는 곳 (바다 좌표) */
const FX0 = 0.05, FX1 = 0.95, FY0 = 0.2, FY1 = SH - 0.05;
/** 배 (바다 좌표): 잡은 것이 올라가는 곳 */
const BOAT_X = 0.5, BOAT_Y = 0.11, CRANE_X = 0.66, CRANE_Y = 0.02;
/** 배 그림 크기 */
const BOAT_S = 1.22;
const TAU = Math.PI * 2;

// ── 물고기 ──
/** 용수철(자리 따라가기) · 감쇠 · 보통 최고 속도 · 놀랐을 때 최고 속도 */
const K_SPRING = 0.012, DAMP = 0.12, VF = 0.009, VFLEE = 0.017;
/** 펜 끝에서 물러나는 반지름·세기 · 그물 줄에서 물러나는 반지름·세기 */
const TIP_R = 0.085, TIP_F = 0.0024, LINE_R = 0.036, LINE_F = 0.0013;
/** 상어·거북이 둘레를 비켜 가는 반지름·세기 */
const SHARK_AV = 0.11, SHARK_F = 0.0024, TURT_AV = 0.075;
/** 떼가 놀람: 펜 끝이 떼 둘레(반지름+PAD)에 있으면 초당 1, 떼 속(반지름×CORE)이면 초당 4. 놀람 SC0초부터 흩어지기 시작, SC1초면 다 흩어짐 */
const ALARM_PAD = 0.09, ALARM_CORE = 0.72, SC0 = 0.9, SC1 = 1.8;
/** 떼 가운데가 빈 정도 (밀링: 가운데는 비고 고리로 돈다) */
const HOLLOW = 0.28;
/** 떼 중심 이동: 따라가기 비율 · 최고 속도 */
const CFOLLOW = 0.03, CMAX = 0.0042;
/** 놀란 떼가 펜 끝에서 달아나는 속도 */
const FLEE_V = 0.0045;

// ── 그물 ──
/** 그물 점 간격 · 이보다 짧으면 그물이 안 된다(톡) · 남은 줄이 이보다 짧으면 끝 · 선 바로 바깥도 잡힘(넉넉) */
const PT_STEP = 0.012, MINLEN = 0.06, MIN_INK = 0.25, EDGE_GRACE = 0.016;
/** 저절로 닫힘: 시작점에서 이만큼 멀어졌다가, 줄이 이만큼 깔린 뒤, 시작점 이만큼 안으로 돌아오면 */
const CLOSE_FAR = 0.09, CLOSE_LEN = 0.3, CLOSE_R = 0.045;
/** 목표를 채운 뒤 남은 줄이 이보다 짧으면 판이 끝난다 (반지름 0.1 원 하나) */
const LOOP_MIN = 0.63;
/** 오므라드는 시간 · 배로 올라가는 시간 */
export const SHRINK_T = 22, LIFT_T = 44;
/** 한 그물에 이만큼이면 큰 순간 */
const WOW_N = 10;
/** 해파리: 그물 줄이 이만큼 가까이 지나가면 녹는다 */
const JR = 0.036;
/** 황금 다랑어: 펜 끝이 이만큼 오면 달아남 · 몇 마리 값 */
const TUNA_WARY = 0.13, TUNA_VAL = 10;
/** 상어: 헤엄 속도 */
const SHARK_V = 0.0034;
/** 먹이 구름: 쉼 · 생기는 중(미리 보임) · 먹는 중 */
const FOOD_GAP = 90, FOOD_GROW = 120, FOOD_FEED = 430, FOOD_CYC = FOOD_GAP + FOOD_GROW + FOOD_FEED;
const RESULT = 200, CARD_T = 160, NEWS_T = 180;
/** 처음 10초는 지지 않는다 */
const SAFE_T = 600;
const FISH_PTS = 2, STAR_PTS = 200, CLEAR_PTS = 50, INK_PTS = 60, WIN_PTS = 500, PERFECT_PTS = 150;

type Star =
  | { k: 'count'; n: number }
  | { k: 'more'; n: number }
  | { k: 'shark' }
  | { k: 'jelly' }
  | { k: 'nets'; m: number; n: number }
  | { k: 'big'; n: number }
  | { k: 'tuna' };

/** p = 떠다니는 길 [가운데 x, y, 폭 x, y, 주기 x(초), y(초), 위상 x, y] */
interface SchoolDef { n: number; r: number; spin: number; p: number[]; br: number; bp: number; pair?: number }
interface StageDef {
  key: string;
  name: string;
  news: string;
  hint: string;
  schools: SchoolDef[];
  /** 두 떼가 도는 자리 [가운데 x, y, 떨어진 거리, 한 바퀴(초), 합쳐지는 주기(초)] */
  pair?: number[];
  sharks?: number[][];
  jellies?: number[][];
  food?: number[][];
  tuna?: number[];
  ink: number;
  /** 해 지기까지 (초) */
  day: number;
  /** 배가 가득 차는 수 (이만큼 잡으면 바로 끝) */
  full: number;
  stars: Star[];
}

const S = (n: number, r: number, spin: number, p: number[], br = 0.22, bp = 7, pair?: number): SchoolDef => ({ n, r, spin, p, br: Math.min(0.34, br * 1.5), bp, pair });

export const STAGES: StageDef[] = [
  {
    key: 'ball', name: '첫 바다', news: '', hint: '떼 바깥에서 시작해 빙 둘러요',
    schools: [
      S(160, 0.22, 0.01, [0.5, 0.62, 0.1, 0.08, 23, 17, 0, 1.2], 0.18, 7),
      S(55, 0.13, -0.013, [0.24, 0.9, 0.1, 0.06, 17, 21, 1, 0], 0.2, 6),
      S(55, 0.13, 0.013, [0.76, 0.34, 0.1, 0.08, 19, 15, 2, 1], 0.2, 6.5),
    ],
    ink: 4.2, day: 75, full: 130, stars: [{ k: 'count', n: 25 }],
  },
  {
    key: 'shark', name: '상어', news: '🦈 상어 — 그물에 같이 넣으면 찢어져요!', hint: '상어가 지나간 뒤에, 상어는 빼고 둘러요',
    schools: [
      S(70, 0.13, 0.013, [0.36, 0.5, 0.16, 0.14, 21, 15, 0.5, 0], 0.22, 6.5),
      S(70, 0.13, -0.013, [0.66, 0.8, 0.16, 0.14, 18, 23, 2, 1], 0.22, 7),
      S(60, 0.12, 0.014, [0.6, 0.36, 0.2, 0.08, 15, 19, 1, 2], 0.2, 6),
    ],
    sharks: [[0.5, 0.6, 0.3, 0.3, 13, 9.5, 0, 0]],
    ink: 3.4, day: 70, full: 110, stars: [{ k: 'count', n: 55 }, { k: 'shark' }],
  },
  {
    key: 'jelly', name: '해파리', news: '🪼 해파리 — 그물 줄이 닿으면 녹아서 거기서 닫혀요!', hint: '해파리 사이로 줄을 내요',
    schools: [
      S(70, 0.13, -0.013, [0.5, 0.6, 0.2, 0.17, 19, 25, 1, 0], 0.22, 6),
      S(65, 0.12, 0.014, [0.3, 0.75, 0.16, 0.16, 16, 21, 0, 2], 0.2, 7),
      S(65, 0.12, -0.014, [0.7, 0.48, 0.16, 0.16, 23, 17, 2, 0.5], 0.2, 6.5),
    ],
    jellies: [[0.24, 0.42], [0.76, 0.4], [0.27, 0.84], [0.73, 0.86], [0.5, 0.3], [0.5, 0.95]],
    ink: 3.2, day: 70, full: 140, stars: [{ k: 'count', n: 90 }, { k: 'jelly' }, { k: 'nets', m: 3, n: 110 }],
  },
  {
    key: 'pair', name: '두 떼', news: '🐟🐟 두 떼 — 합쳐졌다 갈라져요. 합쳐질 때 한 번에!', hint: '두 떼가 하나로 뭉칠 때 크게 둘러요',
    schools: [
      S(85, 0.13, 0.014, [0.5, 0.6, 0, 0, 1, 1, 0, 0], 0.15, 6, 1), S(85, 0.13, -0.014, [0.5, 0.6, 0, 0, 1, 1, 0, 0], 0.15, 6, -1),
      S(50, 0.11, 0.015, [0.5, 0.95, 0.3, 0.05, 15, 11, 0, 0], 0.2, 6),
    ],
    pair: [0.5, 0.56, 0.3, 17, 9],
    ink: 2.8, day: 70, full: 170, stars: [{ k: 'count', n: 110 }, { k: 'big', n: 110 }, { k: 'nets', m: 2, n: 140 }],
  },
  {
    key: 'food', name: '먹이 구름', news: '🦐 먹이 구름 — 떼가 몰려와 꽉 뭉쳐요. 그물 줄이 짧아요!', hint: '분홍 구름에 떼가 모이면 작게 휙',
    schools: [
      S(60, 0.12, 0.013, [0.3, 0.45, 0.12, 0.15, 17, 13, 0, 1], 0.18, 7), S(60, 0.12, -0.013, [0.7, 0.8, 0.13, 0.15, 15, 19, 2, 0], 0.18, 7),
      S(60, 0.12, 0.013, [0.72, 0.4, 0.13, 0.1, 19, 15, 1, 2], 0.18, 7),
    ],
    sharks: [[0.5, 0.6, 0.34, 0.3, 15, 11, 0, 0]],
    food: [[0.5, 0.6], [0.28, 0.84], [0.7, 0.36]],
    ink: 2.0, day: 70, full: 140, stars: [{ k: 'count', n: 85 }, { k: 'shark' }, { k: 'big', n: 85 }],
  },
  {
    key: 'tuna', name: '황금 다랑어', news: '✨ 황금 다랑어 — 펜 끝이 다가오면 달아나요. 멀찍이!', hint: '다랑어는 넉넉하게 크게 둘러요',
    schools: [
      S(65, 0.13, 0.012, [0.5, 0.62, 0.2, 0.18, 20, 16, 0.4, 0], 0.22, 6.5), S(60, 0.12, -0.013, [0.3, 0.42, 0.14, 0.12, 15, 18, 1, 1], 0.2, 6),
      S(60, 0.12, 0.013, [0.7, 0.85, 0.14, 0.1, 17, 14, 2, 0], 0.2, 7),
    ],
    jellies: [[0.22, 0.36], [0.8, 0.5], [0.24, 0.92], [0.78, 0.94]],
    tuna: [0.5, 0.6, 0.28, 0.26, 12, 9, 1.3, 0],
    ink: 3.2, day: 70, full: 140, stars: [{ k: 'count', n: 85 }, { k: 'tuna' }, { k: 'jelly' }],
  },
  {
    key: 'small', name: '작은 떼 다섯', news: '🐟 작은 떼 다섯 — 가까운 둘을 한 그물에 묶어요', hint: '두 떼가 가까워질 때 함께 둘러요',
    schools: [
      S(42, 0.085, 0.016, [0.3, 0.42, 0.14, 0.12, 13, 11, 0, 0.5], 0.15, 6), S(42, 0.085, -0.016, [0.7, 0.45, 0.14, 0.13, 12, 14, 2, 0], 0.15, 6),
      S(42, 0.085, 0.016, [0.32, 0.82, 0.13, 0.13, 14, 12, 1, 2.4], 0.15, 6), S(42, 0.085, -0.016, [0.68, 0.84, 0.14, 0.12, 11, 13, 3, 1], 0.15, 6),
      S(42, 0.085, 0.016, [0.5, 0.62, 0.2, 0.16, 10, 15, 0.7, 2], 0.15, 6),
    ],
    sharks: [[0.5, 0.6, 0.34, 0.32, 16, 12, 0, 0]],
    ink: 3.0, day: 70, full: 150, stars: [{ k: 'count', n: 90 }, { k: 'shark' }, { k: 'big', n: 75 }],
  },
  {
    key: 'all', name: '모두 함께', news: '🌅 모두 함께 — 두 떼 · 상어 · 해파리 · 다랑어!', hint: '뭉칠 때를 기다려 위험한 건 빼고',
    schools: [
      S(80, 0.13, 0.014, [0.5, 0.62, 0, 0, 1, 1, 0, 0], 0.15, 6, 1), S(80, 0.13, -0.014, [0.5, 0.62, 0, 0, 1, 1, 0, 0], 0.15, 6, -1),
      S(50, 0.11, 0.015, [0.5, 0.3, 0.3, 0.05, 14, 11, 1, 0], 0.2, 6),
    ],
    pair: [0.5, 0.64, 0.3, 15, 10],
    sharks: [[0.5, 0.6, 0.36, 0.33, 14, 10, 0, 0]],
    jellies: [[0.2, 0.36], [0.8, 0.38], [0.18, 0.94], [0.82, 0.92]],
    tuna: [0.5, 0.62, 0.3, 0.28, 11, 8, 0.2, 1],
    ink: 3.2, day: 75, full: 170, stars: [{ k: 'count', n: 110 }, { k: 'shark' }, { k: 'tuna' }],
  },
];
export const STAGE_COUNT = STAGES.length;

interface School {
  cx: number; cy: number; vx: number; vy: number; r0: number; spin: number; rot: number;
  alarm: number; scat: number; pack: number; n: number; br: number; bp: number; ph: number;
  p: number[]; pair: number;
}
interface Shark { x: number; y: number; vx: number; vy: number; a: number; p: number[]; smug: number; tail: number }
interface Jelly { x: number; y: number; ph: number; zap: number }
interface Tuna { x: number; y: number; vx: number; vy: number; a: number; p: number[]; bolt: number; caught: boolean }
interface Turtle { x: number; y: number; dir: number; t0: number }
interface Net { pts: number[]; len: number; tx: number; ty: number; alive: boolean; t0: number; far: number }
interface Haul {
  pts: number[]; cx: number; cy: number; t0: number;
  /** 잡힌 물고기 [x, y, 각도] */
  fish: number[];
  n: number; torn: boolean; tuna: boolean; sharkI: number;
}
interface Ev { t: number; kind: string; x: number; y: number; text?: string; n?: number }

export interface FishState {
  rng: Rng; seed: number; t: number; st: number; stage: number; phase: 'play' | 'result'; pt: number; flip: boolean[];
  n: number;
  x: Float64Array; y: Float64Array; vx: Float64Array; vy: Float64Array; ang: Float64Array;
  u: Float64Array; th: Float64Array; ph: Float64Array; sc: Int8Array; live: Uint8Array;
  schools: School[]; sharks: Shark[]; jellies: Jelly[]; tuna: Tuna | null; turtle: Turtle | null; turtleN: number;
  pairP: number[] | null; foodP: number[][] | null;
  net: Net | null; down: boolean; hauls: Haul[];
  ink: number; ink0: number; nets: number; caught: number; bestNet: number; tears: number; melts: number; tunaGot: boolean; fastOk: boolean;
  hearts: number; stars: number; got: number; starOk: boolean[]; pts: number; ok: boolean; why: string;
  dead: boolean; won: boolean; again: boolean; tries: number; endBy: string;
  firstTouch: number; strokeEnd: number; seen: Set<string>; newsQ: string[]; news: { text: string; t: number } | null;
  events: Ev[]; wowN: number; slow: number;
  /** 연출: 고양이 선장 표정(0 보통 · 1 긋는 중 · 2 깜짝 · 3 만세 · 4 시무룩 · 5 영차) · 갈매기 */
  mood: number; moodT: number; gullT: number; gullMood: number; lastN: number; lastT: number;
}

const ev = (s: FishState, kind: string, x: number, y: number, text?: string, n?: number) => s.events.push({ t: s.t, kind, x, y, text, n });
function see(s: FishState, key: string, text: string) {
  if (!key || s.seen.has(key)) return;
  s.seen.add(key);
  if (text) s.newsQ.push(text);
}
const clampF = (x: number, lo: number, hi: number) => (x < lo ? lo : x > hi ? hi : x);
const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const wrapA = (a: number) => {
  while (a > Math.PI) a -= TAU;
  while (a < -Math.PI) a += TAU;
  return a;
};
const liss = (p: number[], T: number): [number, number] => [p[0] + p[2] * Math.sin((TAU * T) / (p[4] * 60) + p[6]), p[1] + p[3] * Math.sin((TAU * T) / (p[5] * 60) + p[7])];

/** 손가락(화면 0~1 · 0~1) → 바다 좌표 */
function toSea(p: { x: number; y: number }) {
  return { x: clampF(p.x, 0, 1), y: clampF(p.y * A - SEA_Y, 0, SH) };
}
const toScreen = (x: number, y: number) => ({ x, y: (y + SEA_Y) / A });

// ───────────────────────────── 시뮬레이션 ─────────────────────────────
/** 먹이 구름: 판 시간 T의 상태 (판마다 정해진 차례 — 미리 알 수 있다) */
function foodAt(spots: number[][] | null, T: number): { x: number; y: number; grow: number; feed: boolean; k: number; age: number } | null {
  if (!spots) return null;
  const c = Math.floor(T / FOOD_CYC), r = T % FOOD_CYC, k = c % spots.length;
  if (r < FOOD_GAP) return null;
  const [x, y] = spots[k];
  if (r < FOOD_GAP + FOOD_GROW) return { x, y, grow: (r - FOOD_GAP) / FOOD_GROW, feed: false, k, age: r - FOOD_GAP };
  return { x, y, grow: 1, feed: true, k, age: r - FOOD_GAP };
}

function schoolTarget(pairP: number[] | null, foodP: number[][] | null, sc: School, T: number): [number, number] {
  const f = foodAt(foodP, T);
  if (f && f.feed) return [f.x, f.y];
  if (sc.pair && pairP) {
    const phi = (TAU * T) / (pairP[3] * 60), d = pairP[2] * (0.5 + 0.5 * Math.cos((TAU * T) / (pairP[4] * 60)));
    return [pairP[0] + Math.cos(phi) * d * sc.pair, pairP[1] + Math.sin(phi) * d * sc.pair * 0.85];
  }
  return liss(sc.p, T);
}

/** 떼 반지름 (숨 · 먹이에 뭉침 · 놀라 흩어짐) */
const radius = (sc: School, T: number) => sc.r0 * (1 + sc.br * Math.sin((TAU * T) / (sc.bp * 60) + sc.ph)) * sc.pack * (1 + 1.25 * sc.scat);

/** 떼 하나 한 틱 (봇이 내다볼 때도 같은 함수) */
function stepSchool(pairP: number[] | null, foodP: number[][] | null, sc: School, T: number, tip: { x: number; y: number } | null) {
  const [tx, ty] = schoolTarget(pairP, foodP, sc, T);
  let dx = (tx - sc.cx) * CFOLLOW, dy = (ty - sc.cy) * CFOLLOW;
  const m = Math.hypot(dx, dy);
  if (m > CMAX) (dx *= CMAX / m), (dy *= CMAX / m);
  sc.vx = dx;
  sc.vy = dy;
  sc.cx += dx;
  sc.cy += dy;
  sc.rot += sc.spin;
  const f = foodAt(foodP, T), near = !!f && f.feed && Math.hypot(f.x - sc.cx, f.y - sc.cy) < 0.09;
  sc.pack += ((near ? 0.52 : 1) - sc.pack) * 0.035;
  const R = radius(sc, T);
  if (tip) {
    const ex = sc.cx - tip.x, ey = sc.cy - tip.y, d = Math.hypot(ex, ey);
    if (d < R * ALARM_CORE) sc.alarm += 4 / 60;
    else if (d < R + ALARM_PAD) sc.alarm += 1 / 60;
    else sc.alarm = Math.max(0, sc.alarm - 0.8 / 60);
    // 놀란 떼는 펜 끝에서 달아난다
    const fl = FLEE_V * smooth((sc.alarm - 0.7) / 1.0);
    if (fl > 0 && d < R + ALARM_PAD + 0.1) {
      sc.cx = clampF(sc.cx + (ex / (d || 1)) * fl, FX0 + 0.04, FX1 - 0.04);
      sc.cy = clampF(sc.cy + (ey / (d || 1)) * fl, FY0 + 0.04, FY1 - 0.04);
    }
  } else sc.alarm = Math.max(0, sc.alarm - 0.8 / 60);
  if (sc.alarm > 3) sc.alarm = 3;
  const tg = smooth((sc.alarm - SC0) / (SC1 - SC0));
  sc.scat += (tg - sc.scat) * 0.08;
}

function stepShark(sh: Shark, T: number) {
  const [tx, ty] = liss(sh.p, T + 40);
  const dx = tx - sh.x, dy = ty - sh.y, d = Math.hypot(dx, dy) || 1;
  const want = Math.min(SHARK_V, d * 0.05);
  sh.vx += ((dx / d) * want - sh.vx) * 0.04;
  sh.vy += ((dy / d) * want - sh.vy) * 0.04;
  sh.x = clampF(sh.x + sh.vx, 0.02, 0.98);
  sh.y = clampF(sh.y + sh.vy, 0.18, SH - 0.02);
  if (Math.hypot(sh.vx, sh.vy) > 0.0004) sh.a += wrapA(Math.atan2(sh.vy, sh.vx) - sh.a) * 0.08;
  sh.tail += 0.12 + Math.hypot(sh.vx, sh.vy) * 30;
  if (sh.smug > 0) sh.smug--;
}

function stepTuna(s: FishState, tu: Tuna, T: number, tip: { x: number; y: number } | null) {
  if (tu.caught) return;
  if (tu.bolt > 0) {
    tu.bolt--;
    tu.vx *= 0.975;
    tu.vy *= 0.975;
  } else {
    const [tx, ty] = liss(tu.p, T + 30);
    const dx = tx - tu.x, dy = ty - tu.y, d = Math.hypot(dx, dy) || 1, want = Math.min(0.0034, d * 0.05);
    tu.vx += ((dx / d) * want - tu.vx) * 0.05;
    tu.vy += ((dy / d) * want - tu.vy) * 0.05;
  }
  if (tip && tu.bolt <= 0) {
    const dx = tu.x - tip.x, dy = tu.y - tip.y, d = Math.hypot(dx, dy);
    if (d < TUNA_WARY) {
      const ux = d > 1e-6 ? dx / d : 1, uy = d > 1e-6 ? dy / d : 0;
      tu.vx = ux * 0.012;
      tu.vy = uy * 0.012;
      tu.bolt = 55;
      ev(s, 'bolt', tu.x, tu.y, '휙!');
      see(s, 'bolt', '✨ 다랑어는 펜 끝이 가까우면 달아나요 — 멀찍이!');
    }
  }
  tu.x += tu.vx;
  tu.y += tu.vy;
  if (tu.x < FX0) (tu.x = FX0), (tu.vx = Math.abs(tu.vx));
  if (tu.x > FX1) (tu.x = FX1), (tu.vx = -Math.abs(tu.vx));
  if (tu.y < FY0) (tu.y = FY0), (tu.vy = Math.abs(tu.vy));
  if (tu.y > FY1) (tu.y = FY1), (tu.vy = -Math.abs(tu.vy));
  if (Math.hypot(tu.vx, tu.vy) > 0.0004) tu.a += wrapA(Math.atan2(tu.vy, tu.vx) - tu.a) * 0.12;
}

/** 물고기 한 틱: 떼 안 제자리(고리로 도는 자리)를 용수철로 따라가고, 펜 끝·그물 줄·상어·거북이에서 물러난다 */
function stepFish(s: FishState, T: number, tip: { x: number; y: number } | null) {
  const nS = s.schools.length, Rk = new Float64Array(nS), Sk = new Float64Array(nS);
  for (let k = 0; k < nS; k++) (Rk[k] = radius(s.schools[k], T)), (Sk[k] = s.schools[k].scat);
  const net = s.net && s.net.alive ? s.net : null;
  let bx0 = 0, by0 = 0, bx1 = -1, by1 = -1;
  if (net) {
    bx0 = by0 = 9;
    bx1 = by1 = -9;
    const P = net.pts;
    for (let k = 0; k < P.length; k += 2) {
      if (P[k] < bx0) bx0 = P[k];
      if (P[k] > bx1) bx1 = P[k];
      if (P[k + 1] < by0) by0 = P[k + 1];
      if (P[k + 1] > by1) by1 = P[k + 1];
    }
    bx0 -= LINE_R;
    by0 -= LINE_R;
    bx1 += LINE_R;
    by1 += LINE_R;
  }
  const X = s.x, Y = s.y, VX = s.vx, VY = s.vy;
  const tt = s.turtle;
  for (let i = 0; i < s.n; i++) {
    if (!s.live[i]) continue;
    const k = s.sc[i], sc = s.schools[k], R = Rk[k], u = s.u[i];
    const a = s.th[i] + sc.rot * (1.25 - 0.5 * u), wob = 1 + 0.07 * Math.sin(s.ph[i] + T * 0.05);
    const sx = sc.cx + Math.cos(a) * R * u * wob, sy = sc.cy + Math.sin(a) * R * u * wob;
    const x = X[i], y = Y[i];
    let ax = (sx - x) * K_SPRING - VX[i] * DAMP, ay = (sy - y) * K_SPRING - VY[i] * DAMP, flee = false;
    const scat = Sk[k];
    if (scat > 0.02) {
      const ex = x - sc.cx, ey = y - sc.cy, el = Math.hypot(ex, ey) || 1e-6;
      ax += (ex / el) * 0.0009 * scat;
      ay += (ey / el) * 0.0009 * scat;
      flee = true;
    }
    if (tip) {
      const ex = x - tip.x, ey = y - tip.y, d2 = ex * ex + ey * ey;
      if (d2 < TIP_R * TIP_R) {
        const d = Math.sqrt(d2) || 1e-6, f = TIP_F * (1 - d / TIP_R);
        ax += (ex / d) * f;
        ay += (ey / d) * f;
        flee = true;
      }
    }
    if (net && x > bx0 && x < bx1 && y > by0 && y < by1) {
      const P = net.pts;
      let bd = LINE_R * LINE_R, qx = 0, qy = 0;
      for (let q = 0; q < P.length; q += 2) {
        const ex = x - P[q], ey = y - P[q + 1], d2 = ex * ex + ey * ey;
        if (d2 < bd) (bd = d2), (qx = ex), (qy = ey);
      }
      if (bd < LINE_R * LINE_R) {
        const d = Math.sqrt(bd) || 1e-6, f = LINE_F * (1 - d / LINE_R);
        ax += (qx / d) * f;
        ay += (qy / d) * f;
        flee = true;
      }
    }
    for (const sh of s.sharks) {
      const ex = x - sh.x, ey = y - sh.y, d2 = ex * ex + ey * ey;
      if (d2 < SHARK_AV * SHARK_AV) {
        const d = Math.sqrt(d2) || 1e-6, f = SHARK_F * (1 - d / SHARK_AV);
        ax += (ex / d) * f;
        ay += (ey / d) * f;
        flee = true;
      }
    }
    if (tt) {
      const ex = x - tt.x, ey = y - tt.y, d2 = ex * ex + ey * ey;
      if (d2 < TURT_AV * TURT_AV) {
        const d = Math.sqrt(d2) || 1e-6, f = 0.0012 * (1 - d / TURT_AV);
        ax += (ex / d) * f;
        ay += (ey / d) * f;
      }
    }
    if (x < FX0) ax += (FX0 - x) * 0.04;
    if (x > FX1) ax += (FX1 - x) * 0.04;
    if (y < FY0) ay += (FY0 - y) * 0.04;
    if (y > FY1) ay += (FY1 - y) * 0.04;
    let vx = VX[i] + ax, vy = VY[i] + ay;
    const sp = Math.hypot(vx, vy), cap = flee ? VFLEE : VF;
    if (sp > cap) (vx *= cap / sp), (vy *= cap / sp);
    VX[i] = vx;
    VY[i] = vy;
    X[i] = x + vx;
    Y[i] = y + vy;
    if (sp > 0.0003) s.ang[i] += wrapA(Math.atan2(vy, vx) - s.ang[i]) * 0.3;
  }
}

function stepWorld(s: FishState) {
  const T = s.st, tip = s.net && s.net.alive ? { x: s.net.tx, y: s.net.ty } : null;
  for (const sc of s.schools) stepSchool(s.pairP, s.foodP, sc, T, sc.n > 0 ? tip : null);
  for (const sh of s.sharks) stepShark(sh, T);
  for (const j of s.jellies) {
    j.x = clampF(j.x + 0.00055 * Math.cos(j.ph + T * 0.0035), 0.07, 0.93);
    j.y = clampF(j.y + 0.00045 * Math.sin(1.7 * j.ph + T * 0.0029), 0.24, SH - 0.07);
    if (j.zap > 0) j.zap--;
  }
  if (s.tuna) stepTuna(s, s.tuna, T, tip);
  // 거북이: 가끔 옆에서 느릿느릿 지나간다 (그물 밑으로 쏙 — 안 잡힌다)
  if (!s.turtle && T >= 420 + s.turtleN * 1500) {
    const dir = (s.turtleN + (s.flip[s.stage] ? 1 : 0)) % 2 ? -1 : 1;
    s.turtle = { x: dir > 0 ? -0.08 : 1.08, y: 0.4 + ((s.turtleN * 0.37 + s.stage * 0.21) % 1) * 0.5, dir, t0: T };
    s.turtleN++;
  }
  if (s.turtle) {
    const tt = s.turtle;
    tt.x += tt.dir * 0.0021;
    tt.y += 0.00035 * Math.sin((T - tt.t0) * 0.012);
    if (tt.x < -0.12 || tt.x > 1.12) s.turtle = null;
  }
  stepFish(s, T, tip);
}

// ── 그물 ──
function wind(P: number[], x: number, y: number): boolean {
  let wn = 0;
  const n = P.length;
  for (let k = 0; k < n; k += 2) {
    const ax = P[k], ay = P[k + 1], j = (k + 2) % n, bx = P[j], by = P[j + 1];
    const c = (bx - ax) * (y - ay) - (x - ax) * (by - ay);
    if (ay <= y) {
      if (by > y && c > 0) wn++;
    } else if (by <= y && c < 0) wn--;
  }
  return wn !== 0;
}
function edgeD2(P: number[], x: number, y: number): number {
  let best = 9;
  const n = P.length;
  for (let k = 0; k < n; k += 2) {
    const ax = P[k], ay = P[k + 1], j = (k + 2) % n, ex = P[j] - ax, ey = P[j + 1] - ay, l2 = ex * ex + ey * ey || 1e-12;
    const u = clampF(((x - ax) * ex + (y - ay) * ey) / l2, 0, 1), dx = x - ax - ex * u, dy = y - ay - ey * u, d2 = dx * dx + dy * dy;
    if (d2 < best) best = d2;
  }
  return best;
}
/** 닫힌 그물 안인가 (선 바로 바깥도 넉넉하게 안으로 친다) */
export function inNet(P: number[], x: number, y: number, grace = EDGE_GRACE): boolean {
  return wind(P, x, y) || edgeD2(P, x, y) < grace * grace;
}

/** 펜 끝을 옮긴다: 줄이 깔리고 줄(잉크)이 줄어든다. 해파리에 닿으면 그 자리에서 녹아 닫히고, 줄이 떨어지면 거기서 닫힌다 */
function advanceTip(s: FishState, nt: Net, qx: number, qy: number) {
  let dx = qx - nt.tx, dy = qy - nt.ty, dl = Math.hypot(dx, dy);
  if (dl < 1e-6) return;
  let why = '';
  // 해파리
  let cut = 2, cj = -1;
  for (let k = 0; k < s.jellies.length; k++) {
    const j = s.jellies[k], l2 = dl * dl, u = clampF(((j.x - nt.tx) * dx + (j.y - nt.ty) * dy) / l2, 0, 1);
    if (Math.hypot(j.x - nt.tx - dx * u, j.y - nt.ty - dy * u) < JR && u < cut) (cut = u), (cj = k);
  }
  if (cj >= 0) {
    dx *= cut;
    dy *= cut;
    dl *= cut;
    why = 'melt';
  }
  if (dl > s.ink) {
    const f = s.ink / dl;
    dx *= f;
    dy *= f;
    dl = s.ink;
    if (!why) why = 'ink';
  }
  s.ink -= dl;
  nt.len += dl;
  nt.tx += dx;
  nt.ty += dy;
  const P = nt.pts;
  const lx = P[P.length - 2], ly = P[P.length - 1], gap = Math.hypot(nt.tx - lx, nt.ty - ly);
  if (gap >= PT_STEP) {
    const m = Math.floor(gap / PT_STEP);
    for (let q = 1; q <= m; q++) P.push(lx + ((nt.tx - lx) * q) / m, ly + ((nt.ty - ly) * q) / m);
  }
  const ds = Math.hypot(nt.tx - P[0], nt.ty - P[1]);
  nt.far = Math.max(nt.far, ds);
  // 한 바퀴 돌아 시작점에 다시 닿으면 그 순간 저절로 닫힌다
  if (!why && nt.far > CLOSE_FAR && nt.len > CLOSE_LEN && ds < CLOSE_R) {
    ev(s, 'snap', nt.tx, nt.ty);
    closeNet(s, nt);
    return;
  }
  if (why === 'melt') {
    const j = s.jellies[cj];
    j.zap = 50;
    s.melts++;
    ev(s, 'melt', nt.tx, nt.ty, '지글!');
    see(s, 'melt', '🪼 해파리에 닿으면 줄이 녹아 거기서 닫혀요');
    closeNet(s, nt);
  } else if (why === 'ink') {
    ev(s, 'inkout', nt.tx, nt.ty, '줄 끝!');
    closeNet(s, nt);
  }
}

function startNet(s: FishState, x: number, y: number) {
  s.net = { pts: [x, y], len: 0, tx: x, ty: y, alive: true, t0: s.t, far: 0 };
  ev(s, 'start', x, y);
}

/** 그물을 닫는다: 안에 든 것이 한꺼번에 잡혀 배로 올라간다 (상어가 들면 찢어진다) */
function closeNet(s: FishState, nt: Net) {
  nt.alive = false;
  s.strokeEnd = s.t;
  const P = nt.pts;
  const lx = P[P.length - 2], ly = P[P.length - 1];
  if (Math.hypot(nt.tx - lx, nt.ty - ly) > 1e-4) P.push(nt.tx, nt.ty);
  if (nt.len < MINLEN || P.length < 6) {
    s.ink = Math.min(s.ink0, s.ink + nt.len);
    ev(s, 'tiny', nt.tx, nt.ty, '쓱 둘러야 그물!');
    return;
  }
  s.nets++;
  // 둘레·넓이
  let cx = 0, cy = 0, x0 = 9, y0 = 9, x1 = -9, y1 = -9;
  for (let k = 0; k < P.length; k += 2) {
    cx += P[k];
    cy += P[k + 1];
    x0 = Math.min(x0, P[k]);
    x1 = Math.max(x1, P[k]);
    y0 = Math.min(y0, P[k + 1]);
    y1 = Math.max(y1, P[k + 1]);
  }
  cx /= P.length / 2;
  cy /= P.length / 2;
  const g = EDGE_GRACE;
  let sharkI = -1;
  s.sharks.forEach((sh, k) => {
    if (sharkI < 0 && sh.x > x0 - g && sh.x < x1 + g && sh.y > y0 - g && sh.y < y1 + g && wind(P, sh.x, sh.y)) sharkI = k;
  });
  const torn = sharkI >= 0;
  const fish: number[] = [];
  let n = 0;
  for (let i = 0; i < s.n; i++) {
    if (!s.live[i]) continue;
    const x = s.x[i], y = s.y[i];
    if (x < x0 - g || x > x1 + g || y < y0 - g || y > y1 + g || !inNet(P, x, y)) continue;
    n++;
    if (torn) continue;
    s.live[i] = 0;
    s.schools[s.sc[i]].n--;
    fish.push(x, y, s.ang[i]);
  }
  const tu = s.tuna;
  const gotTuna = !torn && !!tu && !tu.caught && inNet(P, tu.x, tu.y, 0.01);
  if (gotTuna) tu!.caught = true;
  const turtleIn = !!s.turtle && wind(P, s.turtle.x, s.turtle.y);
  const h: Haul = { pts: P.slice(), cx, cy, t0: s.t, fish, n: torn ? 0 : n, torn, tuna: gotTuna, sharkI };
  s.hauls.push(h);
  // 남은 떼는 놀라 흩어졌다가 다시 모인다
  for (const sc of s.schools) if (sc.cx > x0 - 0.25 && sc.cx < x1 + 0.25 && sc.cy > y0 - 0.25 && sc.cy < y1 + 0.25) sc.alarm = Math.max(sc.alarm, 1.25);
  if (turtleIn) ev(s, 'turtle', s.turtle!.x, s.turtle!.y, '쏙~');
  if (torn) {
    const sh = s.sharks[sharkI];
    sh.smug = 170;
    s.tears++;
    // 찢어진 그물은 반만 건진다
    s.ink = Math.min(s.ink0, s.ink + nt.len * 0.5);
    ev(s, 'tear', sh.x, sh.y, '찌익!', n);
    see(s, 'tear', '🦈 상어가 그물을 찢었어요 (줄 반은 건짐) — 상어는 빼고!');
    s.mood = 4;
    s.moodT = 90;
    s.gullMood = 2;
    s.gullT = 80;
    return;
  }
  const got = n + (gotTuna ? TUNA_VAL : 0);
  s.caught += got;
  s.bestNet = Math.max(s.bestNet, got);
  s.lastN = got;
  s.lastT = s.t;
  if (gotTuna) {
    s.tunaGot = true;
    ev(s, 'tuna', tu!.x, tu!.y, '황금 다랑어!');
    see(s, 'tunagot', '');
  }
  if (got >= WOW_N) {
    s.wowN++;
    s.slow = 12;
    ev(s, 'wow', cx, cy, got >= 40 ? `와르르 ${got}마리!` : `${got}마리!`, got);
    see(s, 'wow', '');
    s.mood = 3;
    s.moodT = 110;
    s.gullMood = 1;
    s.gullT = 70;
  } else if (got > 0) {
    ev(s, 'close', cx, cy, `${got}마리`, got);
    s.mood = 2;
    s.moodT = 50;
  } else {
    ev(s, 'empty', cx, cy, '텅…', 0);
    s.mood = 4;
    s.moodT = 50;
  }
  see(s, 'catch', '');
  const d = STAGES[s.stage];
  for (const st of d.stars) if (st.k === 'nets' && !s.fastOk && s.nets <= st.m && s.caught >= st.n) s.fastOk = true;
}

// ── 판 ──
function newStage(s: FishState) {
  const d = STAGES[s.stage], fl = s.flip[s.stage], rng = s.rng;
  const fp = (p: number[]) => (fl ? [1 - p[0], p[1], -p[2], p[3], p[4], p[5], p[6], p[7]] : p.slice());
  s.st = 0;
  s.pairP = d.pair ? [fl ? 1 - d.pair[0] : d.pair[0], d.pair[1], d.pair[2], fl ? -d.pair[3] : d.pair[3], d.pair[4]] : null;
  s.foodP = d.food ? d.food.map(([x, y]) => [fl ? 1 - x : x, y]) : null;
  s.schools = d.schools.map((q) => ({ cx: 0, cy: 0, vx: 0, vy: 0, r0: q.r, spin: fl ? -q.spin : q.spin, rot: 0, alarm: 0, scat: 0, pack: 1, n: q.n, br: q.br, bp: q.bp, ph: rng() * TAU, p: fp(q.p), pair: q.pair ?? 0 }));
  for (const sc of s.schools) [sc.cx, sc.cy] = schoolTarget(s.pairP, s.foodP, sc, 0);
  s.sharks = (d.sharks ?? []).map((p) => {
    const q = fp(p), [x, y] = liss(q, 0), [x2, y2] = liss(q, 40);
    return { x, y, vx: 0, vy: 0, a: Math.atan2(y2 - y, x2 - x), p: q, smug: 0, tail: 0 };
  });
  s.jellies = (d.jellies ?? []).map(([x, y]) => ({ x: fl ? 1 - x : x, y, ph: rng() * TAU, zap: 0 }));
  if (d.tuna) {
    const q = fp(d.tuna), [x, y] = liss(q, 0);
    s.tuna = { x, y, vx: 0, vy: 0, a: 0, p: q, bolt: 0, caught: false };
  } else s.tuna = null;
  s.turtle = null;
  s.turtleN = 0;
  const n = d.schools.reduce((a, q) => a + q.n, 0);
  s.n = n;
  s.x = new Float64Array(n);
  s.y = new Float64Array(n);
  s.vx = new Float64Array(n);
  s.vy = new Float64Array(n);
  s.ang = new Float64Array(n);
  s.u = new Float64Array(n);
  s.th = new Float64Array(n);
  s.ph = new Float64Array(n);
  s.sc = new Int8Array(n);
  s.live = new Uint8Array(n).fill(1);
  let i = 0;
  s.schools.forEach((sc, k) => {
    const R = radius(sc, 0);
    for (let q = 0; q < d.schools[k].n; q++, i++) {
      const u = Math.sqrt(HOLLOW * HOLLOW + (1 - HOLLOW * HOLLOW) * rng()), th = rng() * TAU;
      s.u[i] = u;
      s.th[i] = th;
      s.ph[i] = rng() * TAU;
      s.sc[i] = k;
      s.x[i] = sc.cx + Math.cos(th) * R * u;
      s.y[i] = sc.cy + Math.sin(th) * R * u;
      const tang = th + (sc.spin > 0 ? Math.PI / 2 : -Math.PI / 2);
      s.ang[i] = tang;
      s.vx[i] = Math.cos(tang) * Math.abs(sc.spin) * R * u;
      s.vy[i] = Math.sin(tang) * Math.abs(sc.spin) * R * u;
    }
  });
  s.net = null;
  s.hauls = [];
  s.ink = s.ink0 = d.ink;
  s.nets = 0;
  s.caught = 0;
  s.bestNet = 0;
  s.tears = 0;
  s.melts = 0;
  s.tunaGot = false;
  s.fastOk = false;
  s.phase = 'play';
  s.pt = 0;
  s.endBy = '';
  s.starOk = d.stars.map(() => false);
  s.strokeEnd = s.t;
  s.lastN = 0;
  s.lastT = -99;
  if (d.key) s.seen.add(d.key);
}

function starNow(s: FishState, st: Star): boolean {
  switch (st.k) {
    case 'count': case 'more': return s.caught >= st.n;
    case 'shark': return s.tears === 0;
    case 'jelly': return s.melts === 0;
    case 'nets': return s.fastOk;
    case 'big': return s.bestNet >= st.n;
    case 'tuna': return s.tunaGot;
  }
}
const NUM = ['', '한', '두', '세', '네', '다섯'];
export function starText(st: Star): string {
  switch (st.k) {
    case 'count': return `물고기 ${st.n}마리`;
    case 'more': return `${st.n}마리 넘게`;
    case 'shark': return '상어는 빼고';
    case 'jelly': return '해파리에 안 닿기';
    case 'nets': return `그물 ${NUM[st.m]} 번에 ${st.n}마리`;
    case 'big': return `한 그물에 ${st.n}마리`;
    case 'tuna': return '황금 다랑어 잡기';
  }
}

function endStage(s: FishState, ok: boolean, why: string, by: string) {
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  s.why = why;
  s.endBy = by;
  if (s.net && s.net.alive) closeNet(s, s.net);
  s.net = null;
  const d = STAGES[s.stage];
  if (ok) {
    s.starOk = d.stars.map((st) => starNow(s, st));
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    s.pts += s.got * STAR_PTS + s.caught * FISH_PTS + CLEAR_PTS + (by === 'full' ? Math.round(s.ink * INK_PTS) : 0) + (s.got >= 3 ? PERFECT_PTS : 0);
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    ev(s, 'clear', 0.5, 0.5, by === 'full' ? '만선!' : '잘 잡았다!');
    s.mood = 3;
    s.moodT = 150;
  } else {
    s.hearts--;
    s.tries++;
    ev(s, 'fail', 0.5, 0.5, why);
    s.mood = 4;
    s.moodT = 150;
  }
}

function handlePointer(s: FishState, p: { x: number; y: number } | null) {
  if (p && s.phase === 'play') {
    const q = toSea(p);
    if (!s.down) {
      s.down = true;
      if (s.ink < MIN_INK) return void ev(s, 'nope', q.x, q.y, '그물 줄을 다 썼어요');
      if (s.firstTouch < 0) s.firstTouch = s.t;
      startNet(s, q.x, q.y);
      s.mood = 1;
      s.moodT = 0;
      return;
    }
    const nt = s.net;
    if (nt && nt.alive) advanceTip(s, nt, q.x, q.y);
    return;
  }
  if (!p && s.down) {
    s.down = false;
    if (s.net && s.net.alive) closeNet(s, s.net);
    s.net = null;
    if (s.mood === 1) s.mood = 0;
  }
}

export const fishloop: GameDef<FishState> & { wows(s: FishState): number } = {
  id: 'fishloop',
  name: '🐟 물고기 떼 그물 두르기',
  genes: ['lasso', 'swarm'],
  twist: '쓱 한 번 둘러 그은 줄이 그대로 그물이 되어, 떼면 휙 오므라들며 안에 든 수십 마리가 한꺼번에 올라온다 — 그런데 떼에게 눈이 있어 펜 끝이 다가오면 흩어지기 시작하니, 떼가 뭉칠 때를 보고 바깥에서 크게 단숨에 둘러야 한다',
  rules: [
    '쓱 둘러 긋고 떼면 그물이 닫혀 안에 든 물고기가 잡혀요.',
    '떼는 펜 끝을 보면 흩어져요. 상어를 넣으면 그물이 찢어져요!',
  ],
  controls: 'touch',
  hint: '쓱 둘러 긋기 = 그물 / 화살표로 옮기고 스페이스를 누른 채 화살표로 둘러요',
  aspect: A,
  art: {
    concept: '햇살 비치는 맑은 바다 고깃배 — 은빛 물고기 떼와 고양이 선장',
    mood: '모래 바닥에 햇빛 그물무늬가 일렁이는 에메랄드 바다, 산호와 해초가 흔들리고 은빛 물고기 수백 마리가 빙글빙글 돈다. 노란 우비를 입은 고양이 선장이 빨간 고깃배에서 침을 흘리며 기다리고, 갈매기가 뱃머리에서 구경한다. 해가 지면 바다가 노을빛으로 물든다.',
    palette: { bg: '#bfefff', ink: '#0f3a4a', muted: '#6aa0b0', accent: '#ffc83d', hot: '#ff5a4f', soft: '#e8fbff' },
  },
  reveals: (s) => s.seen.size,
  guard: (s) => s.caught,
  cleared: (s) => (s.phase === 'result' && s.ok ? { stage: s.stage, got: s.got, of: s.starOk.length } : null),
  wows: (s) => s.wowN,
  create(seed) {
    const rng = mulberry32(seed);
    const flip = STAGES.map(() => rng() < 0.5);
    const s = {
      rng, seed, t: 0, st: 0, stage: 0, phase: 'play', pt: 0, flip, n: 0,
      schools: [], sharks: [], jellies: [], tuna: null, turtle: null, turtleN: 0, pairP: null, foodP: null,
      net: null, down: false, hauls: [], ink: 0, ink0: 0, nets: 0, caught: 0, bestNet: 0, tears: 0, melts: 0, tunaGot: false, fastOk: false,
      hearts: 3, stars: 0, got: 0, starOk: [], pts: 0, ok: false, why: '', dead: false, won: false, again: false, tries: 0, endBy: '',
      firstTouch: -1, strokeEnd: 0, seen: new Set<string>(), newsQ: [], news: null, events: [], wowN: 0, slow: 0,
      mood: 0, moodT: 0, gullT: 0, gullMood: 0, lastN: 0, lastT: -99,
    } as unknown as FishState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    s.events = s.events.filter((e) => s.t - e.t < 120);
    handlePointer(s, inp.pointer ?? null);
    // 큰 순간엔 바다가 잠깐 느려진다 (세 틱에 한 틱만 움직임)
    if (s.slow > 0) s.slow--;
    if (s.slow <= 0 || s.slow % 3 === 0) {
      stepWorld(s);
      s.st++;
    }
    s.hauls = s.hauls.filter((h) => {
      const age = s.t - h.t0;
      if (!h.torn && age === SHRINK_T + LIFT_T) {
        ev(s, 'land', BOAT_X, BOAT_Y, `+${h.n + (h.tuna ? TUNA_VAL : 0)}`, h.n);
        if (h.n > 0) (s.mood = 3), (s.moodT = Math.max(s.moodT, 40));
      }
      return age < SHRINK_T + LIFT_T + (h.torn ? 10 : 1);
    });
    if (s.moodT > 0 && --s.moodT === 0) s.mood = s.down ? 1 : 0;
    if (s.gullT > 0 && --s.gullT === 0) s.gullMood = 0;
    if (!s.news || s.t - s.news.t > NEWS_T) s.news = s.newsQ.length ? { text: s.newsQ.shift()!, t: s.t } : s.news;
    s.pt++;
    const d = STAGES[s.stage];
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
    if (s.down && s.st < d.day * 60 + 300) return;
    if (s.hauls.length) return;
    const goal = (d.stars[0] as { n: number }).n;
    let alive = 0;
    for (const q of s.schools) alive += Math.max(0, q.n);
    if (s.caught >= d.full) endStage(s, true, '', 'full');
    else if ((s.ink < MIN_INK || alive < 4) && s.st >= SAFE_T) endStage(s, s.caught >= goal, `${goal - s.caught}마리 모자라요`, 'ink');
    // 목표를 채웠고 남은 줄로는 작은 그물 하나도 못 두르면 돌아간다
    else if (s.caught >= goal && s.ink < LOOP_MIN) endStage(s, true, '', 'ink');
    else if (s.st >= d.day * 60) endStage(s, s.caught >= goal, `해가 졌어요 · ${goal - s.caught}마리 모자라요`, 'sun');
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
const NO: Input = { tap: false, dir: 0, pointer: null };
const SPEED = 0.03;

/** 원 그물 길: 가운데·반지름·시작 각도·도는 쪽 (끝은 시작을 조금 지나 겹친다) */
function circlePath(cx: number, cy: number, r: number, a0: number, dir: number, speed = SPEED, span = TAU + 0.18): Path {
  const n = Math.max(14, Math.ceil((r * span) / 0.022)), pts: number[] = [];
  for (let k = 0; k <= n; k++) {
    const a = a0 + (dir * span * k) / n;
    pts.push(clampF(cx + Math.cos(a) * r, 0.005, 0.995), clampF(cy + Math.sin(a) * r, 0.005, SH - 0.005));
  }
  return mkPath(pts, speed);
}

/** 두 원이 겹치는 넓이 */
function lens(r1: number, r2: number, d: number): number {
  if (d >= r1 + r2) return 0;
  if (d <= Math.abs(r1 - r2)) return Math.PI * Math.min(r1, r2) ** 2;
  const a1 = Math.acos(clampF((d * d + r1 * r1 - r2 * r2) / (2 * d * r1), -1, 1)), a2 = Math.acos(clampF((d * d + r2 * r2 - r1 * r1) / (2 * d * r2), -1, 1));
  return r1 * r1 * a1 + r2 * r2 * a2 - 0.5 * Math.sqrt(Math.max(0, (-d + r1 + r2) * (d + r1 - r2) * (d - r1 + r2) * (d + r1 + r2)));
}
/** 떼 하나에서 원 안에 들 것으로 보이는 수 (떼 = 가운데가 빈 고리 모양으로 고르게) */
function expectIn(n: number, C: number, Cy: number, R: number, px: number, py: number, r: number) {
  const d = Math.hypot(px - C, py - Cy), outer = lens(r, R, d), inner = lens(r, R * HOLLOW, d);
  return (n * (outer - inner)) / (Math.PI * R * R * (1 - HOLLOW * HOLLOW));
}

interface Plan { v: number; wait: number; cx: number; cy: number; r: number }
/**
 * 잘하는 봇: 떼·상어·다랑어를 몇 틱 앞까지 같은 규칙으로 돌려 보고(기다림 0~2.3초 × 원 후보 수십 개),
 * 들 물고기 수 − 줄 값 − 위험(상어 들어감·해파리 닿음·다랑어 놀람)으로 가장 좋은 '때와 원'을 고른다. 지금이 아니면 기다린다.
 */
function plan(s: FishState): Plan | null {
  const d = STAGES[s.stage], spd = botSpeed.get(s) ?? SPEED;
  const need = Math.max(1, d.full - s.caught), goal = (d.stars[0] as { n: number }).n;
  const ink = s.ink;
  if (ink < MIN_INK) return null;
  const lam = clampF((need / Math.max(0.35, ink)) * 0.5, 3, 70);
  const scs = s.schools.map((q) => ({ ...q })), shs = s.sharks.map((q) => ({ ...q })), tu = s.tuna && !s.tuna.caught ? { ...s.tuna } : null;
  const starJelly = d.stars.some((x) => x.k === 'jelly');
  const big = d.stars.find((x) => x.k === 'big') as { n: number } | undefined;
  const nets = d.stars.find((x) => x.k === 'nets') as { m: number; n: number } | undefined;
  const WAITS = [0, 12, 26, 44, 66, 92, 120, 150, 190, 240, 300, 370, 450];
  let best: Plan | null = null, stepped = 0;
  const left = d.day * 60 - s.st;
  for (const wt of WAITS) {
    if (wt > 0 && wt > left - 120) break;
    while (stepped < wt) {
      const T = s.st + stepped;
      for (const q of scs) stepSchool(s.pairP, s.foodP, q, T, null);
      for (const q of shs) stepShark(q, T);
      if (tu) {
        const [tx, ty] = liss(tu.p, T + 30), dx = tx - tu.x, dy = ty - tu.y, dd = Math.hypot(dx, dy) || 1, want = Math.min(0.0034, dd * 0.05);
        if (tu.bolt > 0) tu.bolt--, (tu.vx *= 0.975), (tu.vy *= 0.975);
        else (tu.vx += ((dx / dd) * want - tu.vx) * 0.05), (tu.vy += ((dy / dd) * want - tu.vy) * 0.05);
        tu.x = clampF(tu.x + tu.vx, FX0, FX1);
        tu.y = clampF(tu.y + tu.vy, FY0, FY1);
      }
      stepped++;
    }
    // 무리: 떼 하나씩 + 가까운 둘씩 묶기
    const live = scs.map((q, k) => ({ q, k })).filter((o) => o.q.n > 3);
    const groups: { x: number; y: number; r: number }[] = [];
    const D0 = 36;
    const at = (q: School) => ({ x: q.cx + q.vx * D0, y: q.cy + q.vy * D0, R: radius(q, s.st + wt + D0) });
    for (const o of live) {
      const a = at(o.q);
      groups.push({ x: a.x, y: a.y, r: a.R });
    }
    const merge = (ids: number[]) => {
      const as = ids.map((i) => ({ ...at(live[i].q), n: live[i].q.n }));
      const nn = as.reduce((z, o) => z + o.n, 0), gx = as.reduce((z, o) => z + o.x * o.n, 0) / nn, gy = as.reduce((z, o) => z + o.y * o.n, 0) / nn;
      groups.push({ x: gx, y: gy, r: Math.max(...as.map((o) => Math.hypot(o.x - gx, o.y - gy) + o.R)) * 0.92 });
    };
    for (let i = 0; i < live.length; i++)
      for (let j = i + 1; j < live.length; j++) {
        const a = at(live[i].q), b = at(live[j].q);
        if (Math.hypot(a.x - b.x, a.y - b.y) <= a.R + b.R + 0.22) merge([i, j]);
      }
    if (live.length >= 3) {
      const all = live.map((_, i) => i), as = all.map((i) => at(live[i].q));
      const mx = as.reduce((z, o) => z + o.x, 0) / as.length, my = as.reduce((z, o) => z + o.y, 0) / as.length;
      if (Math.max(...as.map((o) => Math.hypot(o.x - mx, o.y - my) + o.R)) < 0.32) merge(all);
    }
    if (tu) groups.push({ x: tu.x + tu.vx * D0, y: tu.y + tu.vy * D0, r: TUNA_WARY * 0.8 });
    for (const g of groups) {
      const no = wt === 0 ? 9 : 5;
      for (let oi = 0; oi < no; oi++) {
        const oa = wt === 0 ? (oi * TAU) / 8 : (oi * TAU) / 4 + 0.785, od = oi === no - 1 ? 0 : 0.32 * g.r;
        const px = clampF(g.x + Math.cos(oa) * od, 0.06, 0.94), py = clampF(g.y + Math.sin(oa) * od, 0.12, SH - 0.06);
        for (const rf of wt === 0 ? [0.85, 1.05, 1.25, 1.5] : [0.9, 1.15, 1.45]) {
          const r = Math.max(0.07, g.r * rf + 0.03);
          if (px - r < -0.02 || px + r > 1.02 || py - r < 0.0 || py + r > SH + 0.02) continue;
          const len = TAU * r * 1.03;
          if (len > ink + 0.02) continue;
          const Dt = Math.round(len / spd);
          let cnt = 0;
          for (const q of scs) {
            if (q.n <= 0) continue;
            const qx = q.cx + q.vx * Dt, qy = q.cy + q.vy * Dt, R = radius(q, s.st + wt + Dt);
            let e = expectIn(q.n, qx, qy, R, px, py, r + EDGE_GRACE);
            // 펜 끝이 떼 둘레(반지름+PAD) 안을 오래 지나면 놀라 흩어진다: 둘레 안을 지나는 몫 × 그리는 시간
            const dd = Math.hypot(qx - px, qy - py), near = r + dd < R + ALARM_PAD ? 1 : r - dd > R + ALARM_PAD ? 0 : 0.5;
            const al = (near * Dt) / 60;
            if (e > 0 && al > 0.7) e *= 1 - 0.65 * smooth((al - 0.7) / 1.1);
            cnt += e;
          }
          let v = Math.min(cnt, need + 4) - lam * len;
          // 상어가 들어갈까 (긋는 동안 움직이는 것까지)
          let bad = false;
          for (const q of shs) {
            const qx = q.x + q.vx * Dt, qy = q.y + q.vy * Dt;
            if (Math.hypot(qx - px, qy - py) < r + 0.05 || Math.hypot(q.x - px, q.y - py) < r + 0.02) bad = true;
          }
          if (bad) continue;
          // 해파리에 닿을까
          let touch = false;
          for (const j of s.jellies) if (Math.abs(Math.hypot(j.x - px, j.y - py) - r) < JR + 0.022) touch = true;
          if (touch) v -= starJelly ? 200 : cnt * 0.6 + 10;
          // 다랑어
          if (tu) {
            const qx = tu.x + tu.vx * Dt * 0.5, qy = tu.y + tu.vy * Dt * 0.5, dd = Math.hypot(qx - px, qy - py);
            if (dd < r - TUNA_WARY - 0.02) v += TUNA_VAL + 25;
          }
          if (big && s.bestNet < big.n && cnt >= big.n + 4) v += 60;
          if (nets && !s.fastOk && s.nets < nets.m) v += cnt * 0.6 * (s.nets + 1 === nets.m && s.caught + cnt >= nets.n ? 2 : 1);
          if (s.caught < goal && s.caught + cnt >= goal) v += 8;
          if (cnt < 2) continue;
          const vv = v - wt * 0.04;
          if (!best || vv > best.v) best = { v: vv, wait: wt, cx: px, cy: py, r };
        }
      }
    }
  }
  return best;
}

interface Drive { key: string; p: Path | null; t0: number; done: boolean; end: boolean; next: number }
function drive(m: Drive, s: FishState): Input {
  if (!m.p || m.done) return NO;
  const tt = s.t - m.t0;
  if (tt * m.p.speed >= m.p.len) {
    if (m.end) return (m.done = true), NO;
    m.end = true;
  }
  const q = pathAt(m.p, Math.min(m.p.len, tt * m.p.speed));
  return { tap: false, dir: 0, pointer: toScreen(q.x, q.y) };
}
const ready = (s: FishState) => s.phase === 'play' && !s.down && s.ink >= MIN_INK && s.t - s.strokeEnd > 8 && !s.hauls.some((h) => s.t - h.t0 < SHRINK_T);

/** 봇이 긋는 빠르기 (판단 간격이 길면 그만큼 천천히 — 계획도 그 빠르기로 잰다) */
const botSpeed = new WeakMap<object, number>();
/** 잘하는 봇이 마지막으로 정한 '기다릴 틱' (다시 생각하는 간격을 늘리는 데 쓴다) */
const planWait = new WeakMap<object, number>();
/** 획 봇 틀: pick이 길을 주면 그 길을 손가락처럼 긋는다(사람처럼 느린 판단 간격이면 그만큼 천천히). null이면 잠깐 기다린다 */
function strokeBot(name: string, pick: (s: FishState, rng: Rng) => Path | null, wait = 9): Bot<FishState> {
  const mem = new WeakMap<object, Drive>(), last = new WeakMap<object, { t: number; gap: number }>();
  return {
    name,
    act(s, rng) {
      const lc = last.get(s);
      const gap = lc ? Math.max(1, s.t - lc.t) : REACT;
      last.set(s, { t: s.t, gap });
      let m = mem.get(s);
      if (m && !m.done) {
        if (s.phase !== 'play') m.done = true;
        else return drive(m, s);
      }
      if (!ready(s)) return NO;
      if (m && s.t < m.next) return NO;
      const g = last.get(s)!.gap;
      botSpeed.set(s, g > REACT ? Math.min(SPEED, 0.16 / g) : SPEED);
      const p = pick(s, rng);
      if (p && g > REACT) p.speed = Math.min(p.speed, 0.16 / g);
      const nx = p ? wait : clampF(Math.round((planWait.get(s) ?? 0) / 3), wait, 30);
      mem.set(s, (m = { key: `${s.stage}:${s.nets}`, p, t0: s.t, done: !p, end: false, next: s.t + nx }));
      return drive(m, s);
    },
  };
}

/** 잘하는 봇: 몇 틱 앞을 내다보고 가장 좋은 때·원을 고른다 (상어는 빼고, 해파리는 비키고, 다랑어는 멀찍이) */
const waitMem = new WeakMap<object, { key: string; since: number }>();
export const fishloopSmart: Bot<FishState> = strokeBot('그물 선장', (s) => {
  const b = plan(s);
  const key = `${s.stage}:${s.tries}:${s.nets}`;
  let wm = waitMem.get(s);
  if (!wm || wm.key !== key) waitMem.set(s, (wm = { key, since: s.t }));
  // 오래 기다려도 좋은 때가 안 오면(줄이 모자라 큰 원을 못 두를 때 등) 지금 가장 나은 것을 두른다
  const stuck = s.t - wm.since > 600;
  planWait.set(s, b ? b.wait : 0);
  if (!b) return stuck ? dumpLoop(s) : null;
  if (b.wait > 0 && !stuck) return null;
  // 시작은 배 쪽(위)에서, 떼가 도는 쪽으로
  const near = s.schools.reduce((a, q) => (q.n > 0 && Math.hypot(q.cx - b.cx, q.cy - b.cy) < Math.hypot(a.cx - b.cx, a.cy - b.cy) ? q : a), s.schools[0]);
  let a0 = -Math.PI / 2 + s.nets * 2.1;
  // 해파리가 있으면 해파리에서 먼 각도에서 시작
  if (s.jellies.length) {
    let bestA = a0, bd = -1;
    for (let k = 0; k < 12; k++) {
      const a = (k * TAU) / 12, x = b.cx + Math.cos(a) * b.r, y = b.cy + Math.sin(a) * b.r;
      const dd = Math.min(...s.jellies.map((j) => Math.hypot(j.x - x, j.y - y)));
      if (dd > bd) (bd = dd), (bestA = a);
    }
    a0 = bestA;
  }
  return circlePath(b.cx, b.cy, b.r, a0, near.spin >= 0 ? 1 : -1);
}, 8);

/** 남은 줄을 다 써서 가장 많이 남은 떼를 두른다 */
function dumpLoop(s: FishState): Path | null {
  const q = s.schools.reduce((a, b) => (b.n > a.n ? b : a), s.schools[0]);
  if (q.n <= 0 || s.ink < MIN_INK) return null;
  const r = clampF(Math.min(radius(q, s.st) + 0.04, (s.ink * 0.95) / TAU), 0.04, 0.45);
  return circlePath(clampF(q.cx, r, 1 - r), clampF(q.cy, r, SH - r), r, -Math.PI / 2, q.spin >= 0 ? 1 : -1);
}

/** 버릇 봇: 늘 가장 큰 떼 한가운데를 작은 원으로 (때도 위험도 안 본다) */
export const fishloopHabit: Bot<FishState> = strokeBot('늘 떼 가운데 작은 원', (s) => {
  const q = s.schools.reduce((a, b) => (b.n > a.n ? b : a), s.schools[0]);
  if (q.n <= 0) return null;
  return circlePath(q.cx, q.cy, 0.1, -Math.PI / 2, 1);
});

/** 독립 버릇 봇: 늘 화면 가운데에 큰 원 */
export const fishloopHabit2: Bot<FishState> = strokeBot('늘 가운데 큰 원', () => circlePath(0.5, 0.6, 0.3, -Math.PI / 2, 1));

/** 못하는 봇: 아무 데서나 아무렇게나 둥글게 휙 (모양·크기·속도 제각각, 기다리지도 않는다) */
const dumbMem = new WeakMap<object, { next: number; p: Path | null; t0: number }>();
export const fishloopRandom: Bot<FishState> = {
  name: '아무렇게나 휙',
  act(s, rng) {
    let m = dumbMem.get(s);
    if (!m) dumbMem.set(s, (m = { next: s.t + 20 + Math.floor(rng() * 70), p: null, t0: 0 }));
    if (m.p) {
      const tt = s.t - m.t0;
      if (tt * m.p.speed <= m.p.len && s.phase === 'play') {
        const q = pathAt(m.p, tt * m.p.speed);
        return { tap: false, dir: 0, pointer: toScreen(q.x, q.y) };
      }
      m.p = null;
      m.next = s.t + 20 + Math.floor(rng() * 90);
      return NO;
    }
    if (s.t < m.next || s.phase !== 'play') return NO;
    const cx = 0.1 + rng() * 0.8, cy = 0.15 + rng() * (SH - 0.3), r = 0.06 + rng() * 0.24, a0 = rng() * TAU, span = TAU * (0.45 + rng() * 0.7);
    const dir = rng() < 0.5 ? 1 : -1, wob = rng() * 0.35, wf = 2 + Math.floor(rng() * 3), n = 24, pts: number[] = [];
    for (let k = 0; k <= n; k++) {
      const a = a0 + (dir * span * k) / n, rr = r * (1 + wob * Math.sin(wf * a));
      pts.push(clampF(cx + Math.cos(a) * rr, 0.01, 0.99), clampF(cy + Math.sin(a) * rr, 0.01, SH - 0.01));
    }
    m.p = mkPath(pts, 0.015 + rng() * 0.03);
    m.t0 = s.t;
    return { tap: false, dir: 0, pointer: toScreen(pts[0], pts[1]) };
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
type C2 = CanvasRenderingContext2D;
/** 물고기 그림 길이 (화면 폭 비율) */
const FISH_L = 0.054;
const hsh = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
function mixC(a: string, b: string, u: number) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = Math.round(lerp(pa >> 16, pb >> 16, u)), g = Math.round(lerp((pa >> 8) & 255, (pb >> 8) & 255, u)), bl = Math.round(lerp(pa & 255, pb & 255, u));
  return `rgb(${r},${g},${bl})`;
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
function sparkle(ctx: C2, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r * 0.22, y - r * 0.22);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x + r * 0.22, y + r * 0.22);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r * 0.22, y + r * 0.22);
  ctx.lineTo(x - r, y);
  ctx.lineTo(x - r * 0.22, y - r * 0.22);
  ctx.closePath();
  ctx.fill();
}

// ── 물고기 그림 (한 번 그려 두고 돌려 찍는다) ──
const SPR = new Map<string, HTMLCanvasElement>();
/** kind 0 은빛 · 1 번쩍(흰빛) · 2 그물 안(금빛 테) */
function fishSprite(kind: number, L: number): HTMLCanvasElement {
  const key = `${kind}:${L}`;
  let c = SPR.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = Math.ceil(L * 1.25);
  c.height = Math.ceil(L * 0.62);
  const g = c.getContext('2d')!;
  g.translate(c.width / 2, c.height / 2);
  g.scale(L, L);
  const body = () => {
    g.beginPath();
    g.moveTo(0.5, 0);
    g.bezierCurveTo(0.42, -0.15, 0.05, -0.19, -0.3, -0.07);
    g.lineTo(-0.36, -0.03);
    g.lineTo(-0.36, 0.03);
    g.lineTo(-0.3, 0.07);
    g.bezierCurveTo(0.05, 0.19, 0.42, 0.15, 0.5, 0);
    g.closePath();
  };
  const tail = () => {
    g.beginPath();
    g.moveTo(-0.33, 0);
    g.quadraticCurveTo(-0.46, -0.06, -0.56, -0.17);
    g.quadraticCurveTo(-0.5, 0, -0.56, 0.17);
    g.quadraticCurveTo(-0.46, 0.06, -0.33, 0);
    g.closePath();
  };
  if (kind === 2) {
    g.shadowColor = 'rgba(255,230,120,.95)';
    g.shadowBlur = L * 0.18;
  }
  tail();
  g.fillStyle = kind === 1 ? '#f4fbff' : '#7fb8d8';
  g.fill();
  body();
  const gr = g.createLinearGradient(0, -0.17, 0, 0.17);
  if (kind === 1) {
    gr.addColorStop(0, '#ffffff');
    gr.addColorStop(0.5, '#e6f7ff');
    gr.addColorStop(1, '#ffffff');
  } else {
    gr.addColorStop(0, '#d8f2ff');
    gr.addColorStop(0.3, '#6fb3dc');
    gr.addColorStop(0.5, '#2b6aa6');
    gr.addColorStop(0.7, '#6fb3dc');
    gr.addColorStop(1, '#d8f2ff');
  }
  g.fillStyle = gr;
  g.fill();
  g.shadowBlur = 0;
  // 등 줄무늬 · 비늘 반짝
  g.strokeStyle = kind === 1 ? 'rgba(170,215,240,.8)' : 'rgba(20,60,110,.75)';
  g.lineWidth = 0.035;
  g.beginPath();
  g.moveTo(0.36, 0);
  g.lineTo(-0.3, 0);
  g.stroke();
  g.fillStyle = 'rgba(255,255,255,.75)';
  g.beginPath();
  g.ellipse(0.12, -0.08, 0.16, 0.03, -0.1, 0, TAU);
  g.fill();
  // 눈 (위에서 보면 양쪽에)
  g.fillStyle = '#10243a';
  for (const sy of [-1, 1]) {
    g.beginPath();
    g.arc(0.36, sy * 0.075, 0.035, 0, TAU);
    g.fill();
  }
  g.fillStyle = '#ffffff';
  for (const sy of [-1, 1]) {
    g.beginPath();
    g.arc(0.372, sy * 0.068, 0.013, 0, TAU);
    g.fill();
  }
  if (kind === 2) {
    g.strokeStyle = 'rgba(255,214,90,.95)';
    g.lineWidth = 0.05;
    body();
    g.stroke();
  }
  SPR.set(key, c);
  return c;
}

// ── 바다 바닥 (판마다 한 번 그려 둔다) ──
const FLOOR = new Map<string, HTMLCanvasElement>();
function floorCanvas(s: FishState, w: number, dpr: number): HTMLCanvasElement {
  const key = `${s.stage}:${s.flip[s.stage]}:${Math.round(w)}:${dpr}`;
  let c = FLOOR.get(key);
  if (c) return c;
  if (FLOOR.size > 6) FLOOR.clear();
  c = document.createElement('canvas');
  const H = SH * w;
  c.width = Math.ceil(w * dpr);
  c.height = Math.ceil(H * dpr);
  const g = c.getContext('2d')!;
  g.scale(dpr, dpr);
  const R = (v: number) => v * w;
  const seed = s.stage * 97 + (s.flip[s.stage] ? 13 : 0);
  // 모래
  const sg = g.createLinearGradient(0, 0, 0, H);
  sg.addColorStop(0, '#d9e8cf');
  sg.addColorStop(0.35, '#f1dfb0');
  sg.addColorStop(1, '#f6e2b4');
  g.fillStyle = sg;
  g.fillRect(0, 0, w, H);
  // 모래 물결무늬
  g.lineCap = 'round';
  for (let k = 0; k < 26; k++) {
    const y0 = R(0.05 + k * 0.042), amp = R(0.008 + hsh(seed + k) * 0.006), f = 9 + hsh(seed + k * 3) * 5, ph = hsh(seed + k * 7) * TAU;
    g.strokeStyle = k % 2 ? 'rgba(190,150,90,.16)' : 'rgba(255,255,240,.35)';
    g.lineWidth = R(0.004 + (k / 26) * 0.003);
    g.beginPath();
    for (let x = 0; x <= w; x += 6) {
      const y = y0 + Math.sin((x / w) * f + ph) * amp;
      if (x) g.lineTo(x, y);
      else g.moveTo(x, y);
    }
    g.stroke();
  }
  // 조약돌·조개·불가사리
  for (let k = 0; k < 34; k++) {
    const x = R(0.04 + hsh(seed + k * 11) * 0.92), y = R(0.12 + hsh(seed + k * 13) * (SH - 0.16)), r = R(0.006 + hsh(seed + k * 17) * 0.008);
    g.fillStyle = ['#d7c3a0', '#c9b597', '#e8d6b6', '#bfae92'][k % 4];
    g.beginPath();
    g.ellipse(x, y, r * 1.3, r, hsh(k) * 3, 0, TAU);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,.4)';
    g.beginPath();
    g.ellipse(x - r * 0.3, y - r * 0.35, r * 0.5, r * 0.3, 0, 0, TAU);
    g.fill();
  }
  const starfish = (x: number, y: number, r: number, col: string, rot: number) => {
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    g.fillStyle = col;
    g.beginPath();
    for (let k = 0; k < 10; k++) {
      const a = (k * Math.PI) / 5, rr = k % 2 ? r * 0.42 : r;
      const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
      if (k) g.lineTo(px, py);
      else g.moveTo(px, py);
    }
    g.closePath();
    g.fill();
    g.fillStyle = 'rgba(255,255,255,.55)';
    for (let k = 0; k < 5; k++) {
      const a = (k * TAU) / 5;
      g.beginPath();
      g.arc(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, r * 0.08, 0, TAU);
      g.fill();
    }
    g.restore();
  };
  const shell = (x: number, y: number, r: number, rot: number) => {
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    g.fillStyle = '#ffe9e0';
    g.beginPath();
    g.moveTo(0, r * 0.5);
    g.arc(0, 0, r, Math.PI * 1.1, Math.PI * 1.9);
    g.closePath();
    g.fill();
    g.strokeStyle = '#e8a99a';
    g.lineWidth = 1;
    for (let k = -2; k <= 2; k++) {
      g.beginPath();
      g.moveTo(0, r * 0.45);
      g.lineTo(Math.sin(k * 0.3) * r, -Math.cos(k * 0.3) * r * 0.9);
      g.stroke();
    }
    g.restore();
  };
  starfish(R(0.16), R(0.62), R(0.026), '#ff8a5c', 0.3);
  starfish(R(0.83), R(0.98), R(0.022), '#ff6f91', 1.1);
  shell(R(0.62), R(0.92), R(0.014), 0.4);
  shell(R(0.36), R(0.27), R(0.012), -0.3);
  // 바위 (가장자리)
  const rock = (x: number, y: number, rx: number, ry: number, k: number) => {
    g.fillStyle = 'rgba(40,60,70,.22)';
    g.beginPath();
    g.ellipse(x + rx * 0.15, y + ry * 0.5, rx * 1.05, ry * 0.7, 0, 0, TAU);
    g.fill();
    const rg = g.createLinearGradient(x - rx, y - ry, x + rx, y + ry);
    rg.addColorStop(0, '#a9b8b4');
    rg.addColorStop(1, '#5f7473');
    g.fillStyle = rg;
    g.beginPath();
    for (let q = 0; q < 9; q++) {
      const a = (q * TAU) / 9, rr = 0.82 + hsh(k * 31 + q) * 0.25;
      const px = x + Math.cos(a) * rx * rr, py = y + Math.sin(a) * ry * rr;
      if (q) g.lineTo(px, py);
      else g.moveTo(px, py);
    }
    g.closePath();
    g.fill();
    g.fillStyle = 'rgba(120,170,90,.55)';
    g.beginPath();
    g.ellipse(x - rx * 0.2, y - ry * 0.45, rx * 0.55, ry * 0.3, -0.2, 0, TAU);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,.25)';
    g.beginPath();
    g.ellipse(x - rx * 0.35, y - ry * 0.3, rx * 0.25, ry * 0.12, -0.3, 0, TAU);
    g.fill();
  };
  // 산호
  const branch = (x: number, y: number, sz: number, col: string, dk: string, k: number) => {
    g.fillStyle = 'rgba(40,60,70,.2)';
    g.beginPath();
    g.ellipse(x + sz * 0.15, y + sz * 0.12, sz * 0.75, sz * 0.3, 0, 0, TAU);
    g.fill();
    g.lineCap = 'round';
    const arm = (x0: number, y0: number, a: number, l: number, wd: number, dep: number) => {
      const x1 = x0 + Math.cos(a) * l, y1 = y0 + Math.sin(a) * l;
      g.strokeStyle = dk;
      g.lineWidth = wd + 2;
      g.beginPath();
      g.moveTo(x0, y0);
      g.lineTo(x1, y1);
      g.stroke();
      g.strokeStyle = col;
      g.lineWidth = wd;
      g.beginPath();
      g.moveTo(x0, y0);
      g.lineTo(x1, y1);
      g.stroke();
      if (dep > 0) {
        arm(x1, y1, a - 0.45 - hsh(k + dep) * 0.2, l * 0.72, wd * 0.75, dep - 1);
        arm(x1, y1, a + 0.45 + hsh(k + dep * 3) * 0.2, l * 0.72, wd * 0.75, dep - 1);
      } else {
        g.fillStyle = '#ffffff';
        g.globalAlpha = 0.55;
        g.beginPath();
        g.arc(x1, y1, wd * 0.35, 0, TAU);
        g.fill();
        g.globalAlpha = 1;
      }
    };
    for (let q = 0; q < 3; q++) arm(x, y, -Math.PI / 2 + (q - 1) * 0.6, sz * 0.36, sz * 0.13, 2);
  };
  const brain = (x: number, y: number, r: number, col: string, dk: string) => {
    g.fillStyle = 'rgba(40,60,70,.22)';
    g.beginPath();
    g.ellipse(x + r * 0.2, y + r * 0.45, r * 1.05, r * 0.6, 0, 0, TAU);
    g.fill();
    const bg = g.createRadialGradient(x - r * 0.3, y - r * 0.4, r * 0.1, x, y, r);
    bg.addColorStop(0, '#fff1c8');
    bg.addColorStop(0.4, col);
    bg.addColorStop(1, dk);
    g.fillStyle = bg;
    g.beginPath();
    g.ellipse(x, y, r, r * 0.82, 0, 0, TAU);
    g.fill();
    g.strokeStyle = dk;
    g.lineWidth = 1.2;
    for (let q = -2; q <= 2; q++) {
      g.beginPath();
      for (let k = 0; k <= 10; k++) {
        const u = k / 10, px = x - r * 0.8 + u * r * 1.6, py = y + q * r * 0.26 + Math.sin(u * 9 + q) * r * 0.06;
        if (Math.hypot((px - x) / r, (py - y) / (r * 0.82)) > 0.9) continue;
        if (k) g.lineTo(px, py);
        else g.moveTo(px, py);
      }
      g.stroke();
    }
  };
  const fan = (x: number, y: number, sz: number, col: string) => {
    g.fillStyle = 'rgba(40,60,70,.18)';
    g.beginPath();
    g.ellipse(x + sz * 0.2, y + sz * 0.1, sz * 0.6, sz * 0.22, 0, 0, TAU);
    g.fill();
    g.strokeStyle = col;
    g.lineWidth = 1.4;
    for (let q = 0; q < 9; q++) {
      const a = -Math.PI / 2 + (q - 4) * 0.17;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + Math.cos(a) * sz * 0.5, y + Math.sin(a) * sz * 0.5 - sz * 0.05, x + Math.cos(a) * sz, y + Math.sin(a) * sz);
      g.stroke();
    }
    g.globalAlpha = 0.35;
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(x, y);
    for (let q = 0; q <= 8; q++) {
      const a = -Math.PI / 2 + (q - 4) * 0.17;
      g.lineTo(x + Math.cos(a) * sz, y + Math.sin(a) * sz);
    }
    g.closePath();
    g.fill();
    g.globalAlpha = 1;
  };
  const fl = s.flip[s.stage];
  const X = (x: number) => R(fl ? 1 - x : x);
  rock(X(0.03), R(0.4), R(0.07), R(0.05), seed + 1);
  rock(X(0.98), R(0.7), R(0.06), R(0.045), seed + 2);
  rock(X(0.12), R(1.03), R(0.08), R(0.05), seed + 3);
  rock(X(0.92), R(0.2), R(0.055), R(0.04), seed + 4);
  brain(X(0.06), R(0.82), R(0.04), '#ffb35c', '#c96f2a');
  brain(X(0.95), R(0.47), R(0.035), '#b9e46a', '#6f9d32');
  brain(X(0.82), R(1.04), R(0.045), '#ff9f9f', '#c4545c');
  branch(X(0.04), R(0.58), R(0.09), '#ff7aa8', '#c9467a', seed + 5);
  branch(X(0.96), R(0.92), R(0.1), '#ff9a52', '#c45f20', seed + 6);
  branch(X(0.3), R(1.05), R(0.08), '#c58cff', '#7d4fc0', seed + 7);
  branch(X(0.97), R(0.32), R(0.075), '#ff7aa8', '#c9467a', seed + 8);
  fan(X(0.05), R(0.25), R(0.07), '#a873e8');
  fan(X(0.6), R(1.06), R(0.06), '#ff6f91');
  fan(X(0.94), R(0.62), R(0.06), '#ffb347');
  FLOOR.set(key, c);
  return c;
}

function drawSky(ctx: C2, s: FishState, w: number, df: number) {
  const R = (v: number) => v * w, top = R(HUD_H), hz = R(SEA_Y);
  const g = ctx.createLinearGradient(0, top, 0, hz);
  const sk0 = df < 0.6 ? mixC('#6cc6ff', '#7cb8f0', df / 0.6) : mixC('#7cb8f0', '#6a5fb0', (df - 0.6) / 0.4);
  const sk1 = df < 0.6 ? mixC('#d8f4ff', '#ffe6b0', df / 0.6) : mixC('#ffe6b0', '#ff8a5c', (df - 0.6) / 0.4);
  g.addColorStop(0, sk0);
  g.addColorStop(1, sk1);
  ctx.fillStyle = g;
  ctx.fillRect(0, top, w, hz - top);
  // 해
  const sx = R(0.16 + df * 0.66), sy = lerp(top + R(0.035), hz - R(0.004), df * df);
  const sr = R(0.034);
  const halo = ctx.createRadialGradient(sx, sy, sr * 0.5, sx, sy, sr * 3.4);
  halo.addColorStop(0, df < 0.7 ? 'rgba(255,250,210,.85)' : 'rgba(255,190,120,.85)');
  halo.addColorStop(1, 'rgba(255,240,200,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(sx - sr * 3.4, sy - sr * 3.4, sr * 6.8, sr * 6.8);
  ctx.fillStyle = df < 0.7 ? '#fff6c2' : mixC('#ffd27a', '#ff7a45', (df - 0.7) / 0.3);
  ctx.beginPath();
  ctx.arc(sx, sy, sr, 0, TAU);
  ctx.fill();
  // 구름
  ctx.fillStyle = df < 0.7 ? 'rgba(255,255,255,.9)' : 'rgba(255,220,200,.85)';
  for (let k = 0; k < 3; k++) {
    const cx = ((k * 0.37 + s.t * 0.00006 * (1 + k * 0.3) + 0.1) % 1.3) * w - R(0.15), cy = top + R(0.025 + (k % 2) * 0.03), cr = R(0.018 + k * 0.004);
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, TAU);
    ctx.arc(cx + cr * 1.1, cy - cr * 0.4, cr * 1.2, 0, TAU);
    ctx.arc(cx + cr * 2.3, cy, cr * 0.95, 0, TAU);
    ctx.rect(cx, cy, cr * 2.3, cr * 0.8);
    ctx.fill();
  }
  // 먼 섬과 야자수
  const isl = (x: number, wd: number, ht: number) => {
    ctx.fillStyle = df < 0.7 ? '#5fb08a' : mixC('#5fb08a', '#5a4a7a', (df - 0.7) / 0.3);
    ctx.beginPath();
    ctx.moveTo(x - wd, hz);
    ctx.quadraticCurveTo(x - wd * 0.3, hz - ht * 1.6, x + wd * 0.2, hz - ht);
    ctx.quadraticCurveTo(x + wd * 0.7, hz - ht * 0.5, x + wd, hz);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = ctx.fillStyle;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, hz - ht * 1.1);
    ctx.quadraticCurveTo(x + R(0.004), hz - ht * 1.8, x + R(0.01), hz - ht * 2.3);
    ctx.stroke();
    for (const a of [-2.6, -2.0, -1.0, -0.4]) {
      ctx.beginPath();
      ctx.moveTo(x + R(0.01), hz - ht * 2.3);
      ctx.quadraticCurveTo(x + R(0.01) + Math.cos(a) * R(0.02), hz - ht * 2.3 + Math.sin(a) * R(0.012) - R(0.004), x + R(0.01) + Math.cos(a) * R(0.03), hz - ht * 2.3 + R(0.006));
      ctx.stroke();
    }
  };
  isl(R(0.84), R(0.09), R(0.022));
  isl(R(0.1), R(0.06), R(0.014));
  // 먼 돛단배
  const bx = ((0.3 + s.t * 0.00004) % 1.2) * w - R(0.1);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(bx, hz - R(0.006));
  ctx.lineTo(bx + R(0.004), hz - R(0.03));
  ctx.lineTo(bx + R(0.02), hz - R(0.006));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#c0504d';
  ctx.fillRect(bx - R(0.004), hz - R(0.007), R(0.028), R(0.004));
  // 갈매기 V
  ctx.strokeStyle = 'rgba(60,70,90,.6)';
  ctx.lineWidth = 1.3;
  for (let k = 0; k < 2; k++) {
    const gx = ((0.55 + k * 0.08 + s.t * 0.0003) % 1.2) * w - R(0.1), gy = top + R(0.04 + k * 0.015) + Math.sin(s.t * 0.05 + k) * R(0.003);
    ctx.beginPath();
    ctx.moveTo(gx - R(0.01), gy - R(0.004));
    ctx.quadraticCurveTo(gx - R(0.004), gy - R(0.006), gx, gy);
    ctx.quadraticCurveTo(gx + R(0.004), gy - R(0.006), gx + R(0.01), gy - R(0.004));
    ctx.stroke();
  }
}

const demoMem = new WeakMap<object, number>();
const recentSay = new WeakMap<object, { x: number; y: number; t: number }[]>();

function drawAll(ctx: C2, s: FishState, w: number, h: number, th: Theme) {
  const fx = juice(s), t = s.t, T = s.st, d = STAGES[s.stage];
  const R = (v: number) => v * w;
  const SX = (x: number) => x * w, SY = (y: number) => (SEA_Y + y) * w;
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.round(R(sz))}px system-ui, sans-serif`);
  const dpr = Math.abs(ctx.getTransform().a) || 1;
  const df = clampF(T / (d.day * 60), 0, 1);
  const say = (x: number, y: number, text: string, col: string, size: number) => {
    let rec = recentSay.get(s);
    if (!rec) recentSay.set(s, (rec = []));
    for (let k = 0; k < 6 && rec.some((q) => s.t - q.t < 30 && Math.abs(q.x - x) < w * 0.2 && Math.abs(q.y - y) < size + 2); k++) y -= size + 3;
    rec.push({ x, y, t: s.t });
    if (rec.length > 16) rec.shift();
    fx.pop(Math.max(w * 0.14, Math.min(w * 0.86, x)), Math.max(R(HUD_H + 0.04), y), text, col, size);
  };

  ctx.save();
  const zt = fx.memo.zoomT ?? -99, za = Math.max(0, 1 - (t - zt) / 16);
  if (za > 0) {
    const zs = 1 + 0.035 * za, zx = fx.memo.zx ?? w / 2, zy = fx.memo.zy ?? R(0.7);
    ctx.translate(zx, zy);
    ctx.scale(zs, zs);
    ctx.translate(-zx, -zy);
  }
  fx.begin(ctx);
  drawSky(ctx, s, w, df);

  // ── 바다 ──
  const top = SY(0), bot = SY(SH);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, top, w, bot - top + 2);
  ctx.clip();
  ctx.drawImage(floorCanvas(s, w, dpr), 0, top, w, SH * w);
  // 해초 (흔들린다)
  const fl = s.flip[s.stage];
  for (let k = 0; k < 7; k++) {
    const bx = SX(fl ? 1 - [0.02, 0.07, 0.94, 0.98, 0.2, 0.75, 0.45][k] : [0.02, 0.07, 0.94, 0.98, 0.2, 0.75, 0.45][k]);
    const by = SY([0.5, 0.95, 0.8, 0.4, 1.06, 1.07, 1.07][k]), len = R(0.09 + (k % 3) * 0.025);
    ctx.strokeStyle = k % 2 ? '#3f9d5a' : '#58b86a';
    ctx.lineWidth = R(0.012);
    ctx.lineCap = 'round';
    for (let q = 0; q < 2; q++) {
      ctx.beginPath();
      ctx.moveTo(bx + q * R(0.012), by);
      for (let u = 1; u <= 6; u++) {
        const yy = by - (len * u) / 6, xx = bx + q * R(0.012) + Math.sin(t * 0.035 + k + u * 0.6 + q) * R(0.008) * u * 0.6;
        ctx.lineTo(xx, yy);
      }
      ctx.stroke();
    }
  }
  // 물빛 (먼 쪽이 깊고 가까운 쪽이 맑다) · 노을빛
  const wg = ctx.createLinearGradient(0, top, 0, bot);
  wg.addColorStop(0, 'rgba(8,108,168,.66)');
  wg.addColorStop(0.3, 'rgba(16,160,200,.5)');
  wg.addColorStop(1, 'rgba(36,196,212,.36)');
  ctx.fillStyle = wg;
  ctx.fillRect(0, top, w, bot - top);
  if (df > 0.55) {
    ctx.fillStyle = `rgba(255,120,60,${(0.2 * (df - 0.55)) / 0.45})`;
    ctx.fillRect(0, top, w, bot - top);
  }
  // 햇빛 그물무늬 (일렁임)
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = 'rgba(255,255,230,.10)';
  ctx.lineWidth = R(0.006);
  for (let k = 0; k < 13; k++) {
    ctx.beginPath();
    for (let q = 0; q <= 24; q++) {
      const x = (q / 24) * w, y = top + R(0.04 + k * 0.083) + Math.sin(q * 0.9 + t * 0.03 + k * 1.7) * R(0.018) + Math.sin(q * 0.35 - t * 0.02 + k) * R(0.012);
      if (q) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.stroke();
  }
  for (let k = 0; k < 12; k++) {
    ctx.beginPath();
    for (let q = 0; q <= 26; q++) {
      const y = top + (q / 26) * (bot - top), x = R(0.04 + k * 0.085) + Math.sin(q * 0.8 - t * 0.028 + k * 2.1) * R(0.02) + Math.sin(q * 0.3 + t * 0.017 + k) * R(0.012);
      if (q) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.stroke();
  }
  // 빛줄기
  for (let k = 0; k < 4; k++) {
    const x0 = R(0.12 + k * 0.26 + Math.sin(t * 0.008 + k) * 0.03);
    const lg = ctx.createLinearGradient(0, top, 0, top + R(0.8));
    lg.addColorStop(0, 'rgba(255,255,220,.14)');
    lg.addColorStop(1, 'rgba(255,255,220,0)');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.moveTo(x0, top);
    ctx.lineTo(x0 + R(0.07), top);
    ctx.lineTo(x0 + R(0.25), top + R(0.8));
    ctx.lineTo(x0 + R(0.12), top + R(0.8));
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // 배 그림자 (바닥에)
  const bob = Math.sin(t * 0.05) * R(0.004);
  ctx.fillStyle = 'rgba(10,50,70,.22)';
  ctx.beginPath();
  ctx.ellipse(SX(BOAT_X + 0.06), SY(BOAT_Y + 0.2), R(0.22), R(0.06), 0, 0, TAU);
  ctx.fill();

  // 먹이 구름
  const food = foodAt(s.foodP, T);
  if (food) drawFood(ctx, s, w, food, SX, SY);

  // ── 그림자들 (바닥) ──
  ctx.fillStyle = 'rgba(10,60,80,.16)';
  ctx.beginPath();
  for (let i = 0; i < s.n; i++) {
    if (!s.live[i]) continue;
    const x = SX(s.x[i] + 0.012), y = SY(s.y[i] + 0.04);
    ctx.moveTo(x + R(0.019), y);
    ctx.ellipse(x, y, R(0.019), R(0.007), s.ang[i], 0, TAU);
  }
  ctx.fill();
  ctx.fillStyle = 'rgba(10,60,80,.2)';
  for (const sh of s.sharks) {
    ctx.beginPath();
    ctx.ellipse(SX(sh.x + 0.02), SY(sh.y + 0.07), R(0.09), R(0.03), sh.a, 0, TAU);
    ctx.fill();
  }
  if (s.tuna && !s.tuna.caught) {
    ctx.beginPath();
    ctx.ellipse(SX(s.tuna.x + 0.015), SY(s.tuna.y + 0.055), R(0.05), R(0.016), s.tuna.a, 0, TAU);
    ctx.fill();
  }
  if (s.turtle) {
    ctx.beginPath();
    ctx.ellipse(SX(s.turtle.x + 0.015), SY(s.turtle.y + 0.05), R(0.05), R(0.035), 0, 0, TAU);
    ctx.fill();
  }
  for (const j of s.jellies) {
    ctx.beginPath();
    ctx.ellipse(SX(j.x + 0.02), SY(j.y + 0.09), R(0.03), R(0.012), 0, 0, TAU);
    ctx.fill();
  }

  // ── 그물 미리 보기: 지금 닫으면 안에 들 것 ──
  const nt = s.net && s.net.alive ? s.net : null;
  let inPoly: number[] | null = null, preview = 0, prevShark = false, prevTuna = false, mark: Uint8Array | null = null;
  if (nt && nt.pts.length >= 4) {
    inPoly = nt.pts.concat([nt.tx, nt.ty]);
    let x0 = 9, x1 = -9, y0 = 9, y1 = -9;
    for (let k = 0; k < inPoly.length; k += 2) (x0 = Math.min(x0, inPoly[k])), (x1 = Math.max(x1, inPoly[k])), (y0 = Math.min(y0, inPoly[k + 1])), (y1 = Math.max(y1, inPoly[k + 1]));
    mark = new Uint8Array(s.n);
    for (let i = 0; i < s.n; i++) if (s.live[i] && s.x[i] > x0 && s.x[i] < x1 && s.y[i] > y0 && s.y[i] < y1 && wind(inPoly, s.x[i], s.y[i])) (mark[i] = 1), preview++;
    for (const sh of s.sharks) if (wind(inPoly, sh.x, sh.y)) prevShark = true;
    if (s.tuna && !s.tuna.caught && wind(inPoly, s.tuna.x, s.tuna.y)) (prevTuna = true), (preview += TUNA_VAL);
  }

  // ── 거북이 ──
  if (s.turtle) drawTurtle(ctx, s, w, SX(s.turtle.x), SY(s.turtle.y));

  // ── 물고기 ──
  const L = Math.max(6, Math.round(R(FISH_L) * dpr)), sprN = fishSprite(0, L), sprF = fishSprite(1, L), sprG = fishSprite(2, L);
  const sw = sprN.width / dpr, shh = sprN.height / dpr, fsz = L / dpr;
  for (let i = 0; i < s.n; i++) {
    if (!s.live[i]) continue;
    const sc = s.schools[s.sc[i]], sp = Math.hypot(s.vx[i], s.vy[i]);
    const gl = Math.sin(s.ph[i] * 5 + t * 0.07 + s.th[i] * 3);
    const flash = gl > 0.965 || (sc.scat > 0.25 && gl > 0.55) || sp > 0.011;
    const spr = mark && mark[i] ? sprG : flash ? sprF : sprN;
    const x = SX(s.x[i]), y = SY(s.y[i]), a = s.ang[i] + Math.sin(t * 0.3 + s.ph[i]) * 0.12, k = 0.9 + 0.18 * s.u[i];
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.scale(k, k);
    ctx.drawImage(spr, -sw / 2, -shh / 2, sw, shh);
    ctx.restore();
    if (gl > 0.988) {
      ctx.fillStyle = 'rgba(255,255,255,.95)';
      sparkle(ctx, x + Math.cos(a) * fsz * 0.15, y + Math.sin(a) * fsz * 0.15, fsz * 0.34);
    }
  }
  // ── 다랑어 · 상어 · 해파리 ──
  if (s.tuna && !s.tuna.caught) drawTuna(ctx, s, w, s.tuna, SX(s.tuna.x), SY(s.tuna.y));
  for (const sh of s.sharks) drawShark(ctx, w, sh, SX(sh.x), SY(sh.y));
  for (const j of s.jellies) {
    const danger = !!nt && Math.hypot(nt.tx - j.x, nt.ty - j.y) < 0.16;
    drawJelly(ctx, s, w, j, SX(j.x), SY(j.y), danger);
  }
  // ── 오므라드는 그물 ──
  for (const hl of s.hauls) if (t - hl.t0 < SHRINK_T + (hl.torn ? 10 : 0)) drawHaulShrink(ctx, s, w, hl, SX, SY, dpr);
  // ── 긋는 중인 그물 ──
  if (nt && inPoly) drawNetLive(ctx, s, w, nt, inPoly, preview, prevShark, prevTuna, SX, SY);
  // 수면 반짝
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  for (let k = 0; k < 18; k++) {
    const ph = (t * 0.02 + k * 1.7) % TAU, a = Math.max(0, Math.sin(ph));
    if (a < 0.2) continue;
    const x = SX((hsh(k * 3.1) + t * 0.0004 * (1 + (k % 3))) % 1), y = SY(0.04 + hsh(k * 7.7) * (SH - 0.08));
    ctx.globalAlpha = a * 0.7;
    sparkle(ctx, x, y, R(0.008) * a);
  }
  ctx.globalAlpha = 1;
  // 가장자리 그늘
  const vg = ctx.createRadialGradient(w / 2, SY(0.6), R(0.4), w / 2, SY(0.6), R(0.85));
  vg.addColorStop(0, 'rgba(0,40,70,0)');
  vg.addColorStop(1, 'rgba(0,40,70,.28)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, top, w, bot - top);
  // 수평선 아래 물빛 띠
  const hg = ctx.createLinearGradient(0, top, 0, top + R(0.06));
  hg.addColorStop(0, 'rgba(10,90,140,.55)');
  hg.addColorStop(1, 'rgba(10,90,140,0)');
  ctx.fillStyle = hg;
  ctx.fillRect(0, top, w, R(0.06));
  ctx.restore();

  // ── 배 · 끌어올리는 그물 ──
  drawBoat(ctx, s, w, bob, SX, SY);
  for (const hl of s.hauls) if (!hl.torn && t - hl.t0 >= SHRINK_T) drawHaulLift(ctx, s, w, hl, SX, SY, bob);

  // ── 첫 판 시범: 손가락이 떼를 빙 두른다 ──
  const demo = s.stage === 0 && s.firstTouch < 0 && s.phase === 'play';
  if (demo) {
    const q = s.schools[0], r = radius(q, T) + 0.07, per = 120, ph = (t % (per + 40)) / per, u = clampF(ph, 0, 1), e = u < 1 ? u * (2 - u) : 1;
    let a0 = demoMem.get(s);
    if (a0 === undefined) demoMem.set(s, (a0 = -Math.PI / 2));
    const cx = SX(q.cx), cy = SY(q.cy);
    ctx.save();
    ctx.globalAlpha = ph <= 1 ? 0.9 : Math.max(0, 1 - (ph - 1) * 3);
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.lineWidth = R(0.009);
    ctx.setLineDash([R(0.022), R(0.014)]);
    ctx.lineDashOffset = -t * 0.8;
    ctx.beginPath();
    ctx.arc(cx, cy, R(r), a0, a0 + TAU * 1.03 * e);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    const ha = a0 + TAU * 1.03 * e;
    drawHand(ctx, cx + Math.cos(ha) * R(r) + R(0.02), cy + Math.sin(ha) * R(r) + R(0.012), R(0.11), ph <= 1);
  }

  // ── NEW 스포트라이트 ──
  if (d.key && s.stage > 0 && s.nets === 0 && s.phase === 'play' && s.pt < 480) {
    let nx = 0.5, ny = 0.6, nr = 0.14;
    if ((d.key === 'shark' || d.key === 'all') && s.sharks[0]) (nx = s.sharks[0].x), (ny = s.sharks[0].y), (nr = 0.12);
    if (d.key === 'jelly') {
      const j = s.jellies.reduce((a, b) => (Math.hypot(b.x - 0.5, b.y - 0.6) < Math.hypot(a.x - 0.5, a.y - 0.6) ? b : a));
      (nx = j.x), (ny = j.y), (nr = 0.07);
    }
    if (d.key === 'pair' && s.pairP) (nx = s.pairP[0]), (ny = s.pairP[1]), (nr = 0.34);
    if (d.key === 'food' && s.foodP) {
      const f = foodAt(s.foodP, T) ?? { x: s.foodP[0][0], y: s.foodP[0][1] };
      (nx = f.x), (ny = f.y), (nr = 0.1);
    }
    if (d.key === 'tuna' && s.tuna) (nx = s.tuna.x), (ny = s.tuna.y), (nr = 0.1);
    if (d.key === 'small') (nx = s.schools[0].cx), (ny = s.schools[0].cy), (nr = 0.12);
    const pu = 1 + 0.06 * Math.sin(t * 0.15);
    ctx.save();
    ctx.strokeStyle = '#fff6a8';
    ctx.lineWidth = 3;
    ctx.setLineDash([R(0.018), R(0.012)]);
    ctx.lineDashOffset = -t * 0.6;
    ctx.beginPath();
    ctx.arc(SX(nx), SY(ny), R(nr * pu), 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    const tx = SX(nx), ty = Math.max(SY(0.02), SY(ny) - R(nr * pu) - R(0.03));
    ctx.fillStyle = '#ff5a5a';
    ctx.beginPath();
    ctx.roundRect(tx - R(0.06), ty - R(0.022), R(0.12), R(0.044), R(0.022));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    font(0.036, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('NEW', tx, ty + 1);
    ctx.restore();
  }

  // ── 사건 연출 ──
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const x = SX(e.x), y = SY(e.y);
    if (e.kind === 'start') fx.ring(x, y, '#ffffff', R(0.07), 3), fx.burst(x, y, '#d8f6ff', 10, 2.4, 2.2);
    if (e.kind === 'snap') fx.ring(x, y, '#fff6a8', R(0.09), 5), say(x, y - R(0.05), '휙!', '#fff6a8', 22);
    if (e.kind === 'close') {
      fx.ring(x, y, '#ffffff', R(0.16), 4);
      fx.burst(x, y, '#e8f8ff', 14, 3.2, 2.4);
      fx.kick(3);
      say(x, y - R(0.07), e.text!, '#ffffff', 20);
    }
    if (e.kind === 'wow') {
      const n = e.n ?? 12, big = n >= 40;
      fx.ring(x, y, '#ffffff', R(big ? 0.34 : 0.24), 7);
      fx.ring(x, y, '#ffe680', R(big ? 0.22 : 0.16), 5);
      fx.burst(x, y, '#ffffff', big ? 46 : 30, big ? 6.4 : 5, 3);
      fx.burst(x, y, '#bfe8ff', big ? 36 : 22, big ? 5 : 4, 2.6);
      fx.burst(x, y, '#ffe066', big ? 20 : 10, 4, 2.4);
      fx.kick(big ? 11 : 7);
      fx.blink('#ffffff', big ? 0.32 : 0.2);
      fx.memo.zoomT = t;
      fx.memo.zx = x;
      fx.memo.zy = y;
      say(x, y - R(0.1), e.text!, '#fff066', big ? 30 : 25);
      say(x, y - R(0.02), '퍼덕퍼덕!', '#ffffff', 17);
    }
    if (e.kind === 'empty') say(x, y - R(0.05), e.text!, '#d8eef7', 18);
    if (e.kind === 'tear') {
      fx.burst(x, y, '#e8b06a', 26, 4.6, 2.6);
      fx.ring(x, y, '#ff6b5a', R(0.2), 6);
      fx.kick(9);
      fx.blink('#ffd0c8', 0.18);
      say(x, y - R(0.1), e.text!, '#ffb3a8', 28);
      say(x, y - R(0.18), '히히~ 내 목도리!', '#ffffff', 17);
    }
    if (e.kind === 'melt') {
      fx.burst(x, y, '#ffe066', 18, 3.6, 2.2);
      fx.burst(x, y, '#ff8fd1', 14, 3, 2.4);
      fx.ring(x, y, '#ff8fd1', R(0.1), 4);
      fx.kick(4);
      say(x, y - R(0.07), e.text!, '#ffd0f0', 22);
    }
    if (e.kind === 'inkout') say(x, y - R(0.06), e.text!, '#ffe9b0', 18);
    if (e.kind === 'tiny') say(x, y - R(0.06), e.text!, '#ffffff', 17);
    if (e.kind === 'nope') say(x, y - R(0.06), e.text!, '#ffd6cc', 16);
    if (e.kind === 'bolt') fx.burst(x, y, '#ffe066', 12, 3.4, 2.2), say(x, y - R(0.06), e.text!, '#ffe066', 18);
    if (e.kind === 'tuna') fx.burst(x, y, '#ffd84a', 34, 5, 3), fx.ring(x, y, '#ffe680', R(0.18), 6), say(x, y - R(0.12), e.text!, '#ffe066', 24);
    if (e.kind === 'turtle') say(x, y - R(0.06), e.text!, '#d8ffd0', 17);
    if (e.kind === 'land') {
      const bx = SX(BOAT_X - 0.085), by = SY(BOAT_Y - 0.06);
      fx.burst(bx, by, '#ffffff', 16, 3.6, 2.4);
      fx.burst(bx, by, '#9fe0ff', 12, 3, 2.6);
      fx.ring(bx, by, '#ffe680', R(0.09), 4);
      say(bx, by - R(0.05), e.text!, '#ffe066', (e.n ?? 0) >= 30 ? 26 : 21);
    }
    if (e.kind === 'clear') {
      fx.burst(w * 0.3, SY(0.45), '#ffe066', 44, 6.4, 3.4);
      fx.burst(w * 0.7, SY(0.45), '#9fe0ff', 44, 6.4, 3.4);
      fx.burst(w * 0.5, SY(0.6), '#ffffff', 40, 6, 3);
      fx.ring(w / 2, SY(0.5), '#ffe066', R(0.5), 8);
      fx.blink('#fff6c8', 0.25);
    }
    if (e.kind === 'fail') fx.kick(8), fx.blink(th.hot, 0.18);
  }
  fx.memo.t = s.t;
  // 끌어올리는 동안 물방울
  for (const hl of s.hauls) {
    const age = t - hl.t0;
    if (hl.torn || age < SHRINK_T || age > SHRINK_T + LIFT_T || t % 3) continue;
    const p = liftPos(hl, age, bob);
    fx.burst(SX(p.x), SY(p.y) + R(0.03), 'rgba(200,240,255,.9)', 2, 1.2, 2);
  }
  ctx.restore();
  drawHud(ctx, s, w, h, font);
}

function drawFood(ctx: C2, s: FishState, w: number, f: { x: number; y: number; grow: number; feed: boolean; age: number }, SX: (x: number) => number, SY: (y: number) => number) {
  const R = (v: number) => v * w, t = s.t, x = SX(f.x), y = SY(f.y);
  const left = f.feed ? 1 - 0.55 * clampF((f.age - FOOD_GROW) / FOOD_FEED, 0, 1) : f.grow;
  const r = R(0.08) * left;
  if (!f.feed) {
    ctx.strokeStyle = `rgba(255,170,210,${0.5 + 0.4 * Math.sin(t * 0.2)})`;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([R(0.014), R(0.01)]);
    ctx.beginPath();
    ctx.arc(x, y, R(0.085), 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  const g = ctx.createRadialGradient(x, y, 1, x, y, r * 1.5 + 1);
  g.addColorStop(0, 'rgba(255,160,200,.55)');
  g.addColorStop(1, 'rgba(255,160,200,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.5 + 1, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ff7fae';
  const n = Math.round(46 * left);
  for (let k = 0; k < n; k++) {
    const a = hsh(k) * TAU + t * 0.03 * (1 + hsh(k + 5)), rr = Math.sqrt(hsh(k + 9)) * r;
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * 0.8;
    ctx.beginPath();
    ctx.ellipse(px, py, R(0.006), R(0.0035), a, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${Math.round(R(0.036))}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(160,40,90,.7)';
  const lab = f.feed ? '냠냠' : '먹이!';
  ctx.strokeText(lab, x, y - R(0.1));
  ctx.fillText(lab, x, y - R(0.1));
}

function drawTurtle(ctx: C2, s: FishState, w: number, x: number, y: number) {
  const R = (v: number) => v * w, tt = s.turtle!, t = s.t, a = tt.dir > 0 ? 0 : Math.PI;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a + Math.sin(t * 0.03) * 0.08);
  const fl = Math.sin(t * 0.12) * 0.5;
  ctx.fillStyle = '#7cc46e';
  ctx.strokeStyle = '#3f7d3f';
  ctx.lineWidth = 1.5;
  for (const [fx0, fy0, s0] of [[0.025, -0.03, 1], [0.025, 0.03, -1], [-0.03, -0.025, 1], [-0.03, 0.025, -1]] as number[][]) {
    ctx.save();
    ctx.translate(R(fx0), R(fy0));
    ctx.rotate(s0 * (0.6 + (fx0 > 0 ? fl : -fl)));
    ctx.beginPath();
    ctx.ellipse(0, s0 * -R(0.012) * -1, R(fx0 > 0 ? 0.022 : 0.014), R(0.008), 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  // 머리
  ctx.beginPath();
  ctx.ellipse(R(0.052), 0, R(0.016), R(0.013), 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#10243a';
  ctx.beginPath();
  ctx.arc(R(0.058), -R(0.007), R(0.0035), 0, TAU);
  ctx.arc(R(0.058), R(0.007), R(0.0035), 0, TAU);
  ctx.fill();
  // 등딱지
  const g = ctx.createRadialGradient(-R(0.008), -R(0.012), R(0.004), 0, 0, R(0.045));
  g.addColorStop(0, '#9be07f');
  g.addColorStop(1, '#3f8a45');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, R(0.042), R(0.034), 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#2f6a35';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(220,255,200,.6)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let k = 0; k < 6; k++) {
    const aa = (k * TAU) / 6, px = Math.cos(aa) * R(0.014), py = Math.sin(aa) * R(0.012);
    if (k) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
  for (let k = 0; k < 6; k++) {
    const aa = (k * TAU) / 6;
    ctx.beginPath();
    ctx.moveTo(Math.cos(aa) * R(0.014), Math.sin(aa) * R(0.012));
    ctx.lineTo(Math.cos(aa) * R(0.036), Math.sin(aa) * R(0.029));
    ctx.stroke();
  }
  ctx.restore();
}

function drawTuna(ctx: C2, s: FishState, w: number, tu: Tuna, x: number, y: number) {
  const R = (v: number) => v * w, t = s.t, L = R(0.13), bolt = tu.bolt > 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tu.a);
  if (bolt) {
    ctx.strokeStyle = 'rgba(255,255,255,.7)';
    ctx.lineWidth = 2;
    for (let k = -1; k <= 1; k++) {
      ctx.beginPath();
      ctx.moveTo(-L * 0.6, k * L * 0.08);
      ctx.lineTo(-L * (1 + 0.2 * Math.abs(k)), k * L * 0.1);
      ctx.stroke();
    }
  }
  const sw = Math.sin(t * (bolt ? 0.6 : 0.25)) * 0.3;
  // 꼬리
  ctx.save();
  ctx.translate(-L * 0.36, 0);
  ctx.rotate(sw);
  ctx.fillStyle = '#e8a417';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-L * 0.12, -L * 0.04, -L * 0.2, -L * 0.17);
  ctx.quadraticCurveTo(-L * 0.14, 0, -L * 0.2, L * 0.17);
  ctx.quadraticCurveTo(-L * 0.12, L * 0.04, 0, 0);
  ctx.fill();
  ctx.restore();
  // 지느러미
  ctx.fillStyle = '#f0b52a';
  for (const sy of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(L * 0.12, sy * L * 0.1);
    ctx.lineTo(-L * 0.06, sy * L * 0.24);
    ctx.lineTo(-L * 0.02, sy * L * 0.1);
    ctx.closePath();
    ctx.fill();
  }
  const g = ctx.createLinearGradient(0, -L * 0.14, 0, L * 0.14);
  g.addColorStop(0, '#fff3a8');
  g.addColorStop(0.5, '#f2b51c');
  g.addColorStop(1, '#fff3a8');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(L * 0.5, 0);
  ctx.bezierCurveTo(L * 0.42, -L * 0.17, L * 0.0, -L * 0.18, -L * 0.38, -L * 0.04);
  ctx.lineTo(-L * 0.38, L * 0.04);
  ctx.bezierCurveTo(L * 0.0, L * 0.18, L * 0.42, L * 0.17, L * 0.5, 0);
  ctx.fill();
  ctx.strokeStyle = '#b97a10';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(160,100,10,.6)';
  ctx.beginPath();
  ctx.moveTo(L * 0.32, 0);
  ctx.lineTo(-L * 0.32, 0);
  ctx.stroke();
  // 눈 (달아날 땐 놀란 눈)
  for (const sy of [-1, 1]) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(L * 0.32, sy * L * 0.075, L * (bolt ? 0.05 : 0.04), 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#10243a';
    ctx.beginPath();
    ctx.arc(L * 0.335, sy * L * 0.075, L * (bolt ? 0.018 : 0.024), 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = '#fff8c8';
  for (let k = 0; k < 4; k++) {
    const ph = (t * 0.05 + k * 1.6) % TAU, a = Math.max(0, Math.sin(ph));
    if (a < 0.3) continue;
    ctx.globalAlpha = a;
    sparkle(ctx, x + Math.cos(k * 2.1 + t * 0.01) * L * 0.5, y + Math.sin(k * 2.1 + t * 0.01) * L * 0.3, R(0.012) * a);
  }
  ctx.globalAlpha = 1;
}

function drawShark(ctx: C2, w: number, sh: Shark, x: number, y: number) {
  const R = (v: number) => v * w, L = R(0.21), smug = sh.smug > 0, sw = Math.sin(sh.tail) * 0.25;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(sh.a);
  // 꼬리
  ctx.save();
  ctx.translate(-L * 0.36, 0);
  ctx.rotate(sw);
  ctx.fillStyle = '#5f7f97';
  ctx.beginPath();
  ctx.moveTo(L * 0.04, -L * 0.035);
  ctx.lineTo(-L * 0.14, -L * 0.035);
  ctx.quadraticCurveTo(-L * 0.22, -L * 0.1, -L * 0.25, -L * 0.15);
  ctx.quadraticCurveTo(-L * 0.18, 0, -L * 0.25, L * 0.13);
  ctx.quadraticCurveTo(-L * 0.2, L * 0.08, -L * 0.14, L * 0.035);
  ctx.lineTo(L * 0.04, L * 0.035);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // 가슴지느러미
  ctx.fillStyle = '#6f8fa8';
  for (const sy of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(L * 0.14, sy * L * 0.08);
    ctx.quadraticCurveTo(L * 0.02, sy * L * 0.24, -L * 0.1, sy * L * 0.27);
    ctx.quadraticCurveTo(-L * 0.02, sy * L * 0.14, -L * 0.02, sy * L * 0.07);
    ctx.closePath();
    ctx.fill();
  }
  // 몸
  const g = ctx.createLinearGradient(0, -L * 0.13, 0, L * 0.13);
  g.addColorStop(0, '#a9c4d6');
  g.addColorStop(0.5, '#6f8fa8');
  g.addColorStop(1, '#a9c4d6');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(L * 0.52, 0);
  ctx.bezierCurveTo(L * 0.48, -L * 0.1, L * 0.3, -L * 0.135, L * 0.05, -L * 0.13);
  ctx.bezierCurveTo(-L * 0.18, -L * 0.12, -L * 0.32, -L * 0.06, -L * 0.4, -L * 0.03);
  ctx.lineTo(-L * 0.4, L * 0.03);
  ctx.bezierCurveTo(-L * 0.32, L * 0.06, -L * 0.18, L * 0.12, L * 0.05, L * 0.13);
  ctx.bezierCurveTo(L * 0.3, L * 0.135, L * 0.48, L * 0.1, L * 0.52, 0);
  ctx.fill();
  ctx.strokeStyle = '#46637a';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // 등지느러미 (위에서 보면 진한 세모)
  ctx.fillStyle = '#4c6a82';
  ctx.beginPath();
  ctx.moveTo(L * 0.08, 0);
  ctx.lineTo(-L * 0.12, -L * 0.035);
  ctx.lineTo(-L * 0.12, L * 0.035);
  ctx.closePath();
  ctx.fill();
  // 아가미 줄
  ctx.strokeStyle = 'rgba(60,85,105,.7)';
  ctx.lineWidth = 1.2;
  for (let k = 0; k < 3; k++)
    for (const sy of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(L * (0.26 - k * 0.035), sy * L * 0.07);
      ctx.lineTo(L * (0.24 - k * 0.035), sy * L * 0.115);
      ctx.stroke();
    }
  // 얼굴: 눈썹·눈 (우쭐하면 반쯤 감은 눈 + 이빨 웃음)
  for (const sy of [-1, 1]) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(L * 0.38, sy * L * 0.06, L * 0.04, L * 0.033, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#10243a';
    ctx.beginPath();
    ctx.arc(L * 0.395, sy * L * 0.058, L * 0.019, 0, TAU);
    ctx.fill();
    if (smug) {
      ctx.fillStyle = '#6f8fa8';
      ctx.beginPath();
      ctx.ellipse(L * 0.38, sy * L * 0.06, L * 0.043, L * 0.036, 0, sy > 0 ? Math.PI * 1.05 : -Math.PI * 0.05, sy > 0 ? Math.PI * 1.95 : Math.PI * 1.05);
      ctx.fill();
    }
    ctx.strokeStyle = '#2d4356';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(L * 0.34, sy * L * (smug ? 0.1 : 0.105));
    ctx.lineTo(L * 0.43, sy * L * (smug ? 0.07 : 0.085));
    ctx.stroke();
  }
  if (smug) {
    // 씩 웃는 입
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#2d4356';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(L * 0.5, -L * 0.05);
    ctx.quadraticCurveTo(L * 0.56, 0, L * 0.5, L * 0.05);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // 찢어진 그물 목도리
    ctx.strokeStyle = '#e8b06a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(L * 0.2, -L * 0.15);
    ctx.quadraticCurveTo(L * 0.26, 0, L * 0.2, L * 0.15);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,240,210,.85)';
    ctx.lineWidth = 1;
    for (let k = -3; k <= 3; k++) {
      ctx.beginPath();
      ctx.moveTo(L * 0.23, k * L * 0.04);
      ctx.lineTo(L * 0.1, k * L * 0.05 + L * 0.02);
      ctx.stroke();
    }
    ctx.fillStyle = '#ff5a4f';
    ctx.beginPath();
    ctx.arc(L * 0.2, -L * 0.15, L * 0.025, 0, TAU);
    ctx.arc(L * 0.2, L * 0.15, L * 0.025, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawJelly(ctx: C2, s: FishState, w: number, j: Jelly, x: number, y: number, danger: boolean) {
  const R = (v: number) => v * w, t = s.t, pu = 1 + 0.07 * Math.sin(t * 0.08 + j.ph), r = R(0.042) * pu, zap = j.zap > 0;
  const by = y + Math.sin(t * 0.03 + j.ph) * R(0.004);
  const g0 = ctx.createRadialGradient(x, by, r * 0.3, x, by, r * 2.4);
  g0.addColorStop(0, danger || zap ? 'rgba(255,90,140,.45)' : 'rgba(255,170,230,.35)');
  g0.addColorStop(1, 'rgba(255,170,230,0)');
  ctx.fillStyle = g0;
  ctx.beginPath();
  ctx.arc(x, by, r * 2.4, 0, TAU);
  ctx.fill();
  if (danger) {
    ctx.strokeStyle = `rgba(255,70,110,${0.6 + 0.3 * Math.sin(t * 0.4)})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([R(0.01), R(0.008)]);
    ctx.beginPath();
    ctx.arc(x, by + r * 0.3, R(JR + 0.006), 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // 촉수
  ctx.strokeStyle = 'rgba(255,170,230,.75)';
  ctx.lineWidth = R(0.004);
  ctx.lineCap = 'round';
  for (let k = 0; k < 5; k++) {
    const x0 = x + (k - 2) * r * 0.32;
    ctx.beginPath();
    ctx.moveTo(x0, by + r * 0.3);
    for (let u = 1; u <= 6; u++) ctx.lineTo(x0 + Math.sin(t * 0.09 + k + u * 0.9 + j.ph) * R(0.005), by + r * 0.3 + u * R(0.011));
    ctx.stroke();
  }
  // 갓
  const g = ctx.createRadialGradient(x - r * 0.3, by - r * 0.4, r * 0.1, x, by, r * 1.1);
  g.addColorStop(0, '#fff0fa');
  g.addColorStop(0.5, zap ? '#ff7aa8' : '#ffa8dc');
  g.addColorStop(1, zap ? '#e0306a' : '#e070c0');
  ctx.fillStyle = g;
  ctx.globalAlpha = 0.92;
  ctx.beginPath();
  ctx.ellipse(x, by, r, r * 0.78, 0, Math.PI, TAU);
  for (let k = 0; k <= 6; k++) ctx.lineTo(x + r - (k * 2 * r) / 6, by + (k % 2 ? r * 0.28 : r * 0.12));
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.35, by - r * 0.42, r * 0.22, r * 0.12, -0.5, 0, TAU);
  ctx.fill();
  // 얼굴
  ctx.fillStyle = '#5a2048';
  ctx.beginPath();
  ctx.arc(x - r * 0.25, by - r * 0.05, r * 0.08, 0, TAU);
  ctx.arc(x + r * 0.25, by - r * 0.05, r * 0.08, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#5a2048';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  if (zap) ctx.moveTo(x - r * 0.12, by + r * 0.1), ctx.lineTo(x + r * 0.12, by + r * 0.1);
  else ctx.arc(x, by + r * 0.02, r * 0.12, 0.2, Math.PI - 0.2);
  ctx.stroke();
  if (zap) {
    ctx.strokeStyle = '#fff066';
    ctx.lineWidth = 2;
    for (let k = 0; k < 4; k++) {
      const a = k * 1.6 + t * 0.5;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * r * 1.1, by + Math.sin(a) * r * 1.1);
      ctx.lineTo(x + Math.cos(a + 0.2) * r * 1.5, by + Math.sin(a + 0.2) * r * 1.4);
      ctx.lineTo(x + Math.cos(a - 0.1) * r * 1.8, by + Math.sin(a - 0.1) * r * 1.8);
      ctx.stroke();
    }
  }
}

/** 그물 줄: 굵은 밧줄 + 꼬임 + 부표 (화면 좌표 점들) */
function drawRope(ctx: C2, w: number, P: number[], closed: boolean, t: number, floats = true) {
  const R = (v: number) => v * w;
  if (P.length < 4) return;
  const path = () => {
    ctx.beginPath();
    for (let k = 0; k < P.length; k += 2) (k ? ctx.lineTo(P[k], P[k + 1]) : ctx.moveTo(P[k], P[k + 1]));
    if (closed) ctx.closePath();
  };
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(20,50,60,.35)';
  ctx.lineWidth = R(0.016);
  ctx.save();
  ctx.translate(R(0.006), R(0.012));
  path();
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = '#7a4a22';
  ctx.lineWidth = R(0.014);
  path();
  ctx.stroke();
  ctx.strokeStyle = '#f0c27a';
  ctx.lineWidth = R(0.009);
  path();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(150,95,40,.8)';
  ctx.lineWidth = R(0.009);
  ctx.setLineDash([R(0.006), R(0.008)]);
  path();
  ctx.stroke();
  ctx.setLineDash([]);
  if (!floats) return;
  // 부표 (줄을 따라 일정 간격)
  let acc = 0, idx = 0;
  for (let k = 2; k < P.length; k += 2) {
    acc += Math.hypot(P[k] - P[k - 2], P[k + 1] - P[k - 1]);
    if (acc < R(0.075)) continue;
    acc = 0;
    const bob = Math.sin(t * 0.12 + k) * R(0.002), x = P[k], y = P[k + 1] + bob, r = R(0.012);
    ctx.fillStyle = 'rgba(20,50,60,.3)';
    ctx.beginPath();
    ctx.ellipse(x + R(0.004), y + R(0.012), r, r * 0.5, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = idx++ % 2 ? '#ffffff' : '#ff5a4f';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(80,20,20,.6)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.8)';
    ctx.beginPath();
    ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.3, 0, TAU);
    ctx.fill();
  }
}
/** 그물 안 그물코 */
function drawMesh(ctx: C2, w: number, P: number[], alpha: number, warn: boolean) {
  const R = (v: number) => v * w;
  ctx.save();
  ctx.beginPath();
  for (let k = 0; k < P.length; k += 2) (k ? ctx.lineTo(P[k], P[k + 1]) : ctx.moveTo(P[k], P[k + 1]));
  ctx.closePath();
  ctx.fillStyle = warn ? `rgba(255,80,80,${0.16 * alpha})` : `rgba(255,245,210,${0.12 * alpha})`;
  ctx.fill();
  ctx.clip();
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (let k = 0; k < P.length; k += 2) (x0 = Math.min(x0, P[k])), (x1 = Math.max(x1, P[k])), (y0 = Math.min(y0, P[k + 1])), (y1 = Math.max(y1, P[k + 1]));
  const gap = R(0.026), span = x1 - x0 + y1 - y0;
  ctx.strokeStyle = warn ? `rgba(255,170,170,${0.55 * alpha})` : `rgba(255,250,235,${0.45 * alpha})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let d = -span; d < span; d += gap) {
    ctx.moveTo(x0 + d, y0);
    ctx.lineTo(x0 + d + span, y0 + span);
    ctx.moveTo(x1 - d, y0);
    ctx.lineTo(x1 - d - span, y0 + span);
  }
  ctx.stroke();
  ctx.restore();
}

function drawNetLive(ctx: C2, s: FishState, w: number, nt: Net, P: number[], preview: number, shark: boolean, tuna: boolean, SX: (x: number) => number, SY: (y: number) => number) {
  const R = (v: number) => v * w, t = s.t;
  const SP: number[] = [];
  for (let k = 0; k < P.length; k += 2) SP.push(SX(P[k]), SY(P[k + 1]));
  drawMesh(ctx, w, SP, 1, shark);
  // 닫힐 자리 (끝 → 시작) 점선
  ctx.strokeStyle = 'rgba(255,255,255,.85)';
  ctx.lineWidth = R(0.006);
  ctx.setLineDash([R(0.014), R(0.012)]);
  ctx.lineDashOffset = -t * 0.8;
  ctx.beginPath();
  ctx.moveTo(SX(nt.tx), SY(nt.ty));
  ctx.lineTo(SX(nt.pts[0]), SY(nt.pts[1]));
  ctx.stroke();
  ctx.setLineDash([]);
  drawRope(ctx, w, SP, false, t);
  // 시작점 고리
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(SX(nt.pts[0]), SY(nt.pts[1]), R(0.016), 0, TAU);
  ctx.stroke();
  // 펜 끝 빛
  const tx = SX(nt.tx), ty = SY(nt.ty);
  const g = ctx.createRadialGradient(tx, ty, 1, tx, ty, R(0.05));
  g.addColorStop(0, 'rgba(255,255,255,.9)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(tx, ty, R(0.05), 0, TAU);
  ctx.fill();
  // 지금 닫으면 몇 마리 (말풍선)
  const txt = shark ? '🦈 상어! 찢어져요' : `🐟 ${preview}${tuna ? ' ✨' : ''}`;
  ctx.font = `900 ${Math.round(R(0.04))}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const bw = ctx.measureText(txt).width + R(0.04), bx = clampF(tx, bw / 2 + 4, w - bw / 2 - 4), by = Math.max(SY(0.04), ty - R(0.075));
  ctx.fillStyle = shark ? 'rgba(200,40,40,.92)' : 'rgba(10,60,90,.85)';
  ctx.beginPath();
  ctx.roundRect(bx - bw / 2, by - R(0.026), bw, R(0.052), R(0.026));
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillText(txt, bx, by + 1);
  // 남은 줄이 거의 없으면 깜빡
  if (s.ink < 0.3) {
    ctx.fillStyle = `rgba(255,220,120,${0.6 + 0.4 * Math.sin(t * 0.5)})`;
    ctx.font = `900 ${Math.round(R(0.036))}px system-ui, sans-serif`;
    ctx.fillText('줄이 다 돼 가요!', bx, by + R(0.05));
  }
}

const easeOut = (u: number) => 1 - (1 - u) * (1 - u) * (1 - u);
function drawHaulShrink(ctx: C2, s: FishState, w: number, hl: Haul, SX: (x: number) => number, SY: (y: number) => number, dpr: number) {
  const R = (v: number) => v * w, t = s.t, age = t - hl.t0, u = clampF(age / SHRINK_T, 0, 1), k = easeOut(u);
  const sc = hl.torn ? 1 - 0.35 * k : 1 - 0.7 * k;
  const SP: number[] = [];
  for (let q = 0; q < hl.pts.length; q += 2) {
    const px = hl.cx + (hl.pts[q] - hl.cx) * sc, py = hl.cy + (hl.pts[q + 1] - hl.cy) * sc;
    // 찢어질 땐 줄이 상어 쪽에서 끊겨 흩어진다
    SP.push(SX(px), SY(py));
  }
  if (hl.torn) {
    const a = Math.max(0, 1 - (age - SHRINK_T * 0.6) / 14);
    ctx.globalAlpha = a;
    drawMesh(ctx, w, SP, 1, true);
    // 끊긴 조각들
    const n = SP.length / 2, cut = 8;
    for (let c = 0; c < cut; c++) {
      const a0 = Math.floor((c * n) / cut), a1 = Math.floor(((c + 0.7) * n) / cut), seg: number[] = [], fly = Math.max(0, age - SHRINK_T * 0.5) * R(0.004);
      const ang = (c / cut) * TAU;
      for (let q = a0; q < a1; q++) seg.push(SP[q * 2] + Math.cos(ang) * fly, SP[q * 2 + 1] + Math.sin(ang) * fly);
      drawRope(ctx, w, seg, false, t, false);
    }
    ctx.globalAlpha = 1;
    return;
  }
  // 잡힌 물고기: 가운데로 끌려 모이며 퍼덕 (은빛이 번쩍번쩍)
  const L = Math.max(6, Math.round(R(FISH_L) * dpr)), sprN = fishSprite(0, L), sprF = fishSprite(1, L), sw = sprN.width / dpr, sh = sprN.height / dpr;
  const glow = ctx.createRadialGradient(SX(hl.cx), SY(hl.cy), 1, SX(hl.cx), SY(hl.cy), R(0.05 + 0.12 * (1 - k)));
  glow.addColorStop(0, `rgba(255,255,230,${0.55 * k})`);
  glow.addColorStop(1, 'rgba(255,255,230,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(SX(hl.cx) - R(0.2), SY(hl.cy) - R(0.2), R(0.4), R(0.4));
  for (let q = 0; q < hl.fish.length; q += 3) {
    const j = q / 3, f = 1 - 0.74 * k * (0.7 + 0.3 * hsh(j));
    const px = SX(hl.cx + (hl.fish[q] - hl.cx) * f) + Math.sin(t * 0.9 + j) * R(0.004) * k, py = SY(hl.cy + (hl.fish[q + 1] - hl.cy) * f);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(hl.fish[q + 2] + Math.sin(t * 0.8 + j * 1.7) * 1.1 * k);
    const spr = (t + j * 5) % 9 < 3 ? sprF : sprN;
    ctx.drawImage(spr, -sw / 2, -sh / 2, sw, sh);
    ctx.restore();
  }
  drawMesh(ctx, w, SP, 0.8 + k * 0.6, false);
  drawRope(ctx, w, SP, true, t);
}

/** 끌어올리는 그물 자루 위치 (바다 좌표) */
function liftPos(hl: Haul, age: number, bob: number) {
  const u = clampF((age - SHRINK_T) / LIFT_T, 0, 1), e = u * u * (3 - 2 * u);
  return { x: lerp(hl.cx, CRANE_X, e), y: lerp(hl.cy, CRANE_Y + 0.05, e) - Math.sin(Math.PI * e) * 0.12 + bob * 0, u };
}
function drawHaulLift(ctx: C2, s: FishState, w: number, hl: Haul, SX: (x: number) => number, SY: (y: number) => number, bob: number) {
  const R = (v: number) => v * w, t = s.t, age = t - hl.t0, p = liftPos(hl, age, bob);
  const x = SX(p.x), y = SY(p.y), r = R(Math.min(0.085, 0.032 + Math.sqrt(hl.n) * 0.006)) * (1 - 0.25 * p.u);
  // 기중기에서 내려온 줄
  ctx.strokeStyle = '#5a3a1a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(SX(CRANE_X), SY(CRANE_Y) + bob);
  ctx.lineTo(x, y - r);
  ctx.stroke();
  // 자루
  ctx.fillStyle = 'rgba(200,240,255,.45)';
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.95, r, 0, 0, TAU);
  ctx.fill();
  // 자루 속 물고기 (퍼덕)
  const dpr = Math.abs(ctx.getTransform().a) || 1, Lp = Math.max(6, Math.round(R(FISH_L) * dpr)), sN = fishSprite(0, Lp), sF = fishSprite(1, Lp), fw = sN.width / dpr, fh = sN.height / dpr;
  const n = Math.min(40, Math.max(1, Math.round(hl.n / 2.5)));
  for (let k = 0; k < n; k++) {
    const a = hsh(k * 3.3) * TAU, rr = Math.sqrt(hsh(k * 5.1)) * r * 0.72, fx = x + Math.cos(a) * rr, fy = y + Math.sin(a) * rr * 0.9 + r * 0.08;
    const fa = hsh(k) * TAU + Math.sin(t * 0.7 + k) * 0.9;
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(fa);
    ctx.scale(0.9, 0.9);
    ctx.drawImage((t + k * 3) % 10 < 3 ? sF : sN, -fw / 2, -fh / 2, fw, fh);
    ctx.restore();
  }
  if (hl.tuna) {
    ctx.fillStyle = '#ffd84a';
    ctx.beginPath();
    ctx.ellipse(x, y, r * 0.5, r * 0.2, Math.sin(t * 0.5) * 0.6, 0, TAU);
    ctx.fill();
  }
  // 그물코
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.95, r, 0, 0, TAU);
  ctx.clip();
  ctx.strokeStyle = 'rgba(240,194,122,.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let d = -r * 2; d < r * 2; d += R(0.02)) {
    ctx.moveTo(x - r + d, y - r);
    ctx.lineTo(x + r + d, y + r);
    ctx.moveTo(x + r - d, y - r);
    ctx.lineTo(x - r - d, y + r);
  }
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = '#7a4a22';
  ctx.lineWidth = R(0.008);
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.95, r, 0, 0, TAU);
  ctx.stroke();
  // 묶은 꼭지
  ctx.fillStyle = '#f0c27a';
  ctx.beginPath();
  ctx.arc(x, y - r, R(0.01), 0, TAU);
  ctx.fill();
}

function drawHand(ctx: C2, x: number, y: number, sz: number, press: boolean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.35);
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#0f3a4a';
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

/** 고깃배 · 고양이 선장 · 갈매기 */
function drawBoat(ctx: C2, s: FishState, w: number, bob: number, SX: (x: number) => number, SY: (y: number) => number) {
  const R = (v: number) => v * w, t = s.t, d = STAGES[s.stage];
  const bx = SX(BOAT_X), by = SY(BOAT_Y) + bob, rock = Math.sin(t * 0.04) * 0.02;
  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(rock);
  ctx.scale(BOAT_S, BOAT_S);
  // 물결 거품
  ctx.strokeStyle = 'rgba(255,255,255,.75)';
  ctx.lineWidth = 2;
  for (let k = 0; k < 2; k++) {
    ctx.beginPath();
    ctx.ellipse(0, R(0.05 + k * 0.012), R(0.22 + k * 0.03 + Math.sin(t * 0.06 + k) * 0.006), R(0.022 + k * 0.006), 0, 0.1, Math.PI - 0.1);
    ctx.stroke();
  }
  // 선체 옆면
  const hg = ctx.createLinearGradient(0, -R(0.01), 0, R(0.06));
  hg.addColorStop(0, '#ff6b55');
  hg.addColorStop(1, '#c23a2c');
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.moveTo(-R(0.2), -R(0.01));
  ctx.quadraticCurveTo(-R(0.19), R(0.055), -R(0.1), R(0.06));
  ctx.lineTo(R(0.12), R(0.06));
  ctx.quadraticCurveTo(R(0.2), R(0.05), R(0.23), -R(0.02));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(-R(0.198), R(0.008));
  ctx.lineTo(R(0.222), R(0.002));
  ctx.lineTo(R(0.214), R(0.016));
  ctx.lineTo(-R(0.194), R(0.022));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#1d5e86';
  ctx.font = `900 ${Math.round(R(0.03))}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('냥냥호', R(0.03), R(0.04));
  // 구명 튜브
  const lbx = -R(0.12), lby = R(0.032), lr = R(0.02);
  ctx.lineWidth = R(0.011);
  for (let k = 0; k < 4; k++) {
    ctx.strokeStyle = k % 2 ? '#ffffff' : '#ff4a3d';
    ctx.beginPath();
    ctx.arc(lbx, lby, lr, (k * Math.PI) / 2, ((k + 1) * Math.PI) / 2);
    ctx.stroke();
  }
  // 갑판
  const dg = ctx.createLinearGradient(0, -R(0.05), 0, 0);
  dg.addColorStop(0, '#c98a4b');
  dg.addColorStop(1, '#e8b073');
  ctx.fillStyle = dg;
  ctx.beginPath();
  ctx.moveTo(-R(0.2), -R(0.01));
  ctx.quadraticCurveTo(-R(0.2), -R(0.055), -R(0.12), -R(0.058));
  ctx.lineTo(R(0.13), -R(0.058));
  ctx.quadraticCurveTo(R(0.2), -R(0.05), R(0.23), -R(0.02));
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,70,30,.35)';
  ctx.lineWidth = 1;
  for (let k = 1; k < 4; k++) {
    ctx.beginPath();
    ctx.moveTo(-R(0.19), -R(0.01) - k * R(0.012));
    ctx.lineTo(R(0.21), -R(0.02) - k * R(0.009));
    ctx.stroke();
  }
  // 기중기 기둥
  const cx = (SX(CRANE_X) - bx) / BOAT_S, cy = (SY(CRANE_Y) - by + bob) / BOAT_S;
  ctx.strokeStyle = '#6b4423';
  ctx.lineWidth = R(0.012);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(R(0.1), -R(0.03));
  ctx.lineTo(R(0.1), cy - R(0.01));
  ctx.lineTo(cx, cy);
  ctx.stroke();
  // 깃발 (바람에 펄럭)
  const fw = Math.sin(t * 0.15) * R(0.004);
  ctx.fillStyle = '#4fc3f7';
  ctx.beginPath();
  ctx.moveTo(R(0.1), cy - R(0.01));
  ctx.lineTo(R(0.1) - R(0.05), cy - R(0.003) + fw);
  ctx.lineTo(R(0.1), cy + R(0.018));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(R(0.082), cy + R(0.003) + fw * 0.5, R(0.005), 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  ctx.arc(cx, cy, R(0.011), 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#7a5a10';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // 물고기 상자 (잡은 만큼 차오른다)
  const fill = clampF(s.caught / d.full, 0, 1);
  const kx = -R(0.12), ky = -R(0.06), kw = R(0.1), kh = R(0.05);
  ctx.fillStyle = '#8b5a2b';
  ctx.fillRect(kx, ky, kw, kh);
  ctx.fillStyle = '#5c3a18';
  ctx.fillRect(kx, ky, kw, R(0.008));
  // 쌓인 물고기 더미
  if (fill > 0) {
    const ph = kh * 0.2 + fill * R(0.05);
    ctx.save();
    ctx.beginPath();
    ctx.rect(kx - R(0.01), ky - ph, kw + R(0.02), ph + R(0.01));
    ctx.clip();
    const nF = Math.round(6 + fill * 22);
    for (let k = 0; k < nF; k++) {
      const fx = kx + R(0.008) + hsh(k * 2.7) * (kw - R(0.016)), fy = ky + R(0.004) - hsh(k * 4.1) * ph, a = hsh(k * 9.3) * TAU + Math.sin(t * 0.3 + k) * (s.t - s.lastT < 60 ? 0.6 : 0.05);
      ctx.save();
      ctx.translate(fx, fy);
      ctx.rotate(a);
      ctx.fillStyle = (t + k * 7) % 40 < 3 ? '#ffffff' : k % 3 ? '#a8d4ec' : '#7fb3d6';
      ctx.beginPath();
      ctx.ellipse(0, 0, R(0.015), R(0.0055), 0, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-R(0.013), 0);
      ctx.lineTo(-R(0.02), -R(0.005));
      ctx.lineTo(-R(0.02), R(0.005));
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }
  ctx.strokeStyle = '#5c3a18';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(kx, ky, kw, kh);
  // 고양이 선장
  ctx.save();
  ctx.translate(R(0.02), -R(0.05));
  ctx.scale(1.1, 1.1);
  drawCat(ctx, s, w, 0, 0);
  ctx.restore();
  // 앞 난간
  ctx.strokeStyle = '#7a4a22';
  ctx.lineWidth = R(0.01);
  ctx.beginPath();
  ctx.moveTo(-R(0.2), -R(0.01));
  ctx.lineTo(R(0.23), -R(0.02));
  ctx.stroke();
  // 갈매기 (뱃머리)
  drawGull(ctx, s, w, R(0.2), -R(0.03));
  ctx.restore();
}

function drawCat(ctx: C2, s: FishState, w: number, x: number, y: number) {
  const R = (v: number) => v * w, t = s.t, m = s.mood;
  const hop = m === 3 ? -Math.abs(Math.sin(t * 0.25)) * R(0.012) : 0;
  ctx.save();
  ctx.translate(x, y + hop);
  // 몸 (노란 우비)
  ctx.fillStyle = '#ffd23f';
  ctx.strokeStyle = '#c99a10';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-R(0.03), 0);
  ctx.quadraticCurveTo(-R(0.034), -R(0.04), -R(0.018), -R(0.05));
  ctx.lineTo(R(0.018), -R(0.05));
  ctx.quadraticCurveTo(R(0.034), -R(0.04), R(0.03), 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  for (let k = 0; k < 2; k++) {
    ctx.beginPath();
    ctx.arc(0, -R(0.035) + k * R(0.016), R(0.004), 0, TAU);
    ctx.fill();
  }
  // 팔: 만세 · 영차 · 보통
  const hauling = s.hauls.some((h) => !h.torn && t - h.t0 >= SHRINK_T);
  ctx.strokeStyle = '#ffd23f';
  ctx.lineWidth = R(0.013);
  ctx.lineCap = 'round';
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sx * R(0.024), -R(0.04));
    if (m === 3) ctx.lineTo(sx * R(0.045), -R(0.085) + Math.sin(t * 0.3 + sx) * R(0.006));
    else if (hauling) ctx.lineTo(sx * R(0.02) + R(0.03), -R(0.03) + Math.sin(t * 0.4 + sx * 1.5) * R(0.008));
    else ctx.lineTo(sx * R(0.04), -R(0.018));
    ctx.stroke();
  }
  ctx.fillStyle = '#f6a04d';
  for (const sx of [-1, 1]) {
    const px = m === 3 ? sx * R(0.045) : hauling ? sx * R(0.02) + R(0.03) : sx * R(0.04), py = m === 3 ? -R(0.085) + Math.sin(t * 0.3 + sx) * R(0.006) : hauling ? -R(0.03) + Math.sin(t * 0.4 + sx * 1.5) * R(0.008) : -R(0.018);
    ctx.beginPath();
    ctx.arc(px, py, R(0.008), 0, TAU);
    ctx.fill();
  }
  // 머리
  const hx = 0, hy = -R(0.078), hr = R(0.04);
  ctx.fillStyle = '#f6a04d';
  ctx.strokeStyle = '#b8642a';
  ctx.lineWidth = 1.5;
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(hx + sx * hr * 0.95, hy - hr * 0.2);
    ctx.lineTo(hx + sx * hr * 1.15, hy - hr * 1.1);
    ctx.lineTo(hx + sx * hr * 0.4, hy - hr * 0.75);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.ellipse(hx, hy, hr, hr * 0.88, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(190,100,40,.7)';
  ctx.lineWidth = 2;
  for (let k = -1; k <= 1; k++) {
    ctx.beginPath();
    ctx.moveTo(hx + k * hr * 0.3, hy - hr * 0.86);
    ctx.lineTo(hx + k * hr * 0.25, hy - hr * 0.6);
    ctx.stroke();
  }
  // 모자 (노란 방수모)
  ctx.fillStyle = '#ffd23f';
  ctx.strokeStyle = '#c99a10';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(hx, hy - hr * 0.55, hr * 1.25, hr * 0.28, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(hx, hy - hr * 0.72, hr * 0.72, hr * 0.42, 0, Math.PI, TAU);
  ctx.fill();
  ctx.stroke();
  // 주둥이
  ctx.fillStyle = '#fff4e6';
  ctx.beginPath();
  ctx.ellipse(hx, hy + hr * 0.38, hr * 0.42, hr * 0.3, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ff7a8a';
  ctx.beginPath();
  ctx.ellipse(hx, hy + hr * 0.22, hr * 0.1, hr * 0.07, 0, 0, TAU);
  ctx.fill();
  // 눈
  const ex = hr * 0.38, ey = hy - hr * 0.02;
  const nt = s.net && s.net.alive ? s.net : null;
  const lookX = nt ? clampF((nt.tx - BOAT_X) * 3, -1, 1) : Math.sin(t * 0.01) * 0.5, lookY = nt ? 1 : 0.6;
  ctx.fillStyle = '#10243a';
  ctx.strokeStyle = '#10243a';
  ctx.lineWidth = 2;
  for (const sx of [-1, 1]) {
    const qx = hx + sx * ex;
    if (m === 3) {
      ctx.beginPath();
      ctx.arc(qx, ey + hr * 0.06, hr * 0.13, Math.PI + 0.3, TAU - 0.3);
      ctx.stroke();
    } else if (m === 4) {
      ctx.beginPath();
      ctx.moveTo(qx - hr * 0.13, ey - sx * hr * 0.0 - hr * 0.04);
      ctx.lineTo(qx + hr * 0.13, ey + (sx > 0 ? -hr * 0.1 : hr * 0.02));
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(qx, ey + hr * 0.05, hr * 0.07, 0, TAU);
      ctx.fill();
    } else if (m === 2) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(qx, ey, hr * 0.17, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#10243a';
      ctx.beginPath();
      ctx.arc(qx, ey, hr * 0.08, 0, TAU);
      ctx.fill();
    } else {
      ctx.fillStyle = '#10243a';
      ctx.beginPath();
      ctx.ellipse(qx + lookX * hr * 0.05, ey + lookY * hr * 0.04, hr * 0.1, hr * 0.13, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(qx + lookX * hr * 0.05 - hr * 0.03, ey + lookY * hr * 0.04 - hr * 0.05, hr * 0.035, 0, TAU);
      ctx.fill();
    }
  }
  // 입
  ctx.strokeStyle = '#5a2a10';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (m === 3) {
    ctx.fillStyle = '#c0394b';
    ctx.moveTo(hx - hr * 0.2, hy + hr * 0.36);
    ctx.quadraticCurveTo(hx, hy + hr * 0.75, hx + hr * 0.2, hy + hr * 0.36);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // 침
    ctx.fillStyle = '#9fe0ff';
    ctx.beginPath();
    ctx.ellipse(hx + hr * 0.15, hy + hr * 0.62 + ((t * 0.3) % 6), hr * 0.05, hr * 0.08, 0, 0, TAU);
    ctx.fill();
  } else if (m === 2) {
    ctx.arc(hx, hy + hr * 0.45, hr * 0.08, 0, TAU);
    ctx.stroke();
  } else if (m === 4) {
    ctx.arc(hx, hy + hr * 0.58, hr * 0.14, Math.PI + 0.4, TAU - 0.4);
    ctx.stroke();
    ctx.fillStyle = '#9fe0ff';
    ctx.beginPath();
    ctx.ellipse(hx + hr * 0.75, hy - hr * 0.2, hr * 0.08, hr * 0.13, 0, 0, TAU);
    ctx.fill();
  } else if (m === 1) {
    ctx.moveTo(hx - hr * 0.16, hy + hr * 0.42);
    ctx.quadraticCurveTo(hx, hy + hr * 0.5, hx + hr * 0.16, hy + hr * 0.42);
    ctx.stroke();
    ctx.fillStyle = '#ff7a8a';
    ctx.beginPath();
    ctx.ellipse(hx + hr * 0.08, hy + hr * 0.52, hr * 0.07, hr * 0.06, 0, 0, TAU);
    ctx.fill();
  } else {
    ctx.moveTo(hx - hr * 0.18, hy + hr * 0.4);
    ctx.quadraticCurveTo(hx - hr * 0.08, hy + hr * 0.5, hx, hy + hr * 0.38);
    ctx.quadraticCurveTo(hx + hr * 0.08, hy + hr * 0.5, hx + hr * 0.18, hy + hr * 0.4);
    ctx.stroke();
  }
  // 수염
  ctx.strokeStyle = 'rgba(80,40,20,.6)';
  ctx.lineWidth = 1;
  for (const sx of [-1, 1])
    for (let k = -1; k <= 1; k += 2) {
      ctx.beginPath();
      ctx.moveTo(hx + sx * hr * 0.4, hy + hr * 0.36 + k * hr * 0.05);
      ctx.lineTo(hx + sx * hr * 1.0, hy + hr * 0.3 + k * hr * 0.12);
      ctx.stroke();
    }
  ctx.restore();
}

function drawGull(ctx: C2, s: FishState, w: number, x: number, y: number) {
  const R = (v: number) => v * w, t = s.t, m = s.gullMood;
  const hop = m === 1 ? -Math.abs(Math.sin(t * 0.3)) * R(0.012) : 0;
  ctx.save();
  ctx.translate(x, y + hop);
  // 다리
  ctx.strokeStyle = '#ff9f2a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-R(0.004), 0);
  ctx.lineTo(-R(0.004), -R(0.01));
  ctx.moveTo(R(0.004), 0);
  ctx.lineTo(R(0.004), -R(0.01));
  ctx.stroke();
  // 몸
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#8aa0b0';
  ctx.beginPath();
  ctx.ellipse(0, -R(0.022), R(0.02), R(0.015), -0.2, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // 날개 (신나면 퍼덕)
  ctx.fillStyle = '#b8c8d4';
  const wa = m === 1 ? Math.sin(t * 0.5) * 0.9 - 0.6 : m === 2 ? Math.sin(t * 0.8) * 0.3 : 0;
  ctx.save();
  ctx.translate(-R(0.005), -R(0.026));
  ctx.rotate(wa);
  ctx.beginPath();
  ctx.ellipse(-R(0.01), 0, R(0.016), R(0.007), 0.3, 0, TAU);
  ctx.fill();
  ctx.restore();
  // 머리
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(R(0.014), -R(0.04), R(0.011), 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffb02a';
  ctx.beginPath();
  ctx.moveTo(R(0.022), -R(0.042));
  ctx.lineTo(R(0.036), -R(0.038) + (m ? Math.sin(t * 0.6) * R(0.003) : 0));
  ctx.lineTo(R(0.022), -R(0.035));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#10243a';
  ctx.beginPath();
  ctx.arc(R(0.017), -R(0.043), R(0.0025), 0, TAU);
  ctx.fill();
  if (m && t % 40 < 26) {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = 'rgba(0,40,60,.6)';
    ctx.lineWidth = 3;
    ctx.font = `900 ${Math.round(R(0.036))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    const tx = m === 1 ? '끼룩!' : '깔깔';
    ctx.strokeText(tx, R(0.02), -R(0.065));
    ctx.fillText(tx, R(0.02), -R(0.065));
  }
  ctx.restore();
}

function drawHud(ctx: C2, s: FishState, w: number, h: number, font: (sz: number, wgt?: number) => void) {
  const R = (v: number) => v * w, Y = (y: number) => y * w, d = STAGES[s.stage], t = s.t;
  // ═════════════ 위 띠 ═════════════
  const hb = R(HUD_H);
  ctx.fillStyle = 'rgba(8,48,74,.92)';
  ctx.fillRect(0, 0, w, hb);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  font(0.045, 900);
  const ttl = `🐟 ${s.stage + 1}번째 바다`, tw1 = ctx.measureText(ttl).width;
  ctx.fillText(ttl, R(0.03), hb * 0.52);
  font(0.036, 800);
  ctx.fillStyle = '#9fd8ee';
  ctx.fillText(` · ${d.name}`, R(0.03) + tw1, hb * 0.55);
  ctx.textAlign = 'right';
  font(0.042, 900);
  ctx.fillStyle = '#ffd84a';
  const stt = `★ ${s.stars}`;
  ctx.fillText(stt, w - R(0.03), hb * 0.52);
  ctx.fillStyle = '#ff6b6b';
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - R(0.05) - ctx.measureText(stt).width, hb * 0.52);
  // 해 지기 경고
  const left = d.day * 60 - s.st;
  if (s.phase === 'play' && left < 20 * 60 && left > 0) {
    ctx.textAlign = 'center';
    font(0.036, 900);
    ctx.fillStyle = `rgba(255,${180 + 60 * Math.sin(t * 0.2)},120,1)`;
    ctx.strokeStyle = 'rgba(60,20,10,.7)';
    ctx.lineWidth = 3;
    const tx = `🌅 해가 져요 · ${Math.ceil(left / 60)}초`;
    ctx.strokeText(tx, w / 2, Y(SEA_Y - 0.02));
    ctx.fillText(tx, w / 2, Y(SEA_Y - 0.02));
  }
  // 새것 알림 띠
  if (s.news && s.t - s.news.t < NEWS_T) {
    const age = s.t - s.news.t, a = Math.min(1, age / 10, (NEWS_T - age) / 20);
    ctx.globalAlpha = a;
    font(0.036, 900);
    ctx.textAlign = 'center';
    const tx = s.news.text, tw2 = Math.min(w - 10, ctx.measureText(tx).width + 24), by2 = Y(BAND - 0.035);
    ctx.fillStyle = 'rgba(8,48,74,.92)';
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
      if (s.ok) (head = s.won ? '바다 정복! 🎉' : s.endBy === 'full' ? '만선!' : '잘 잡았다!'), (sub = `잡은 물고기 ${s.caught}마리${s.endBy === 'full' && s.ink > 0.05 ? ` · 남은 줄 +${Math.round(s.ink * INK_PTS)}점` : ''}`), (col = '#ffd84a');
      else (head = `앗… ${s.why}`), (sub = s.hearts > 0 ? '하트 −1 · 같은 바다 다시' : '끝 — 그래도 맛있는 저녁!'), (col = '#ffb3a8');
    } else if (s.pt < CARD_T && s.nets === 0 && !s.down) {
      age = s.pt;
      a = Math.min(1, (CARD_T - s.pt) / 20);
      head = `${s.again ? '다시! ' : ''}${s.stage + 1}번째 바다 · ${d.name}`;
      sub = `그물 줄 ${Math.round(d.ink * 10)}m · ${starText(d.stars[0])}`;
      nw = d.news;
    }
    if (head) {
      const sc = Math.min(1, 0.6 + age / 12), cyy = Y(s.phase === 'result' ? 0.62 : s.stage === 0 ? 0.5 : 1.07), ch = nw ? 0.158 : 0.11;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(w / 2, cyy);
      ctx.scale(sc, sc);
      ctx.fillStyle = 'rgba(8,48,74,.93)';
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
      ctx.fillStyle = '#f0fbff';
      font(0.036, 800);
      ctx.fillText(sub, 0, R(0.03), R(0.82));
      if (nw) {
        ctx.fillStyle = '#ffe9a8';
        font(0.036, 900);
        ctx.fillText(nw, 0, R(0.077), R(0.84));
      }
      ctx.restore();
    }
  }
  // 첫 판 안내 (크게)
  if (s.stage === 0 && s.firstTouch < 0 && s.phase === 'play') {
    const bob = Math.sin(t * 0.12) * R(0.006);
    ctx.save();
    font(0.058, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const tx = '👆 쓱 둘러 그물로!', tw = ctx.measureText(tx).width + R(0.08), yy = Y(1.18) + bob;
    ctx.fillStyle = 'rgba(8,48,74,.86)';
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
  g.addColorStop(0, 'rgba(10,58,88,.97)');
  g.addColorStop(1, 'rgba(6,38,62,.99)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(0, Y(ty), w, Y(tb - ty) + 4, [R(0.03), R(0.03), 0, 0]);
  ctx.fill();
  // 그물 줄 남은 길이 (밧줄 막대)
  const rows = d.stars.length, pad = (3 - rows) * 0.022;
  const r1 = Y(ty + 0.032 + pad * 0.6);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#d8f2ff';
  font(0.036, 900);
  ctx.fillText('그물 줄', R(0.03), r1);
  const bx0 = R(0.18), bw = R(0.3), fr = clampF(s.ink / Math.max(0.01, s.ink0), 0, 1);
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath();
  ctx.roundRect(bx0, r1 - R(0.014), bw, R(0.028), R(0.014));
  ctx.fill();
  if (fr > 0) {
    ctx.fillStyle = s.ink < LOOP_MIN ? '#ff9f6a' : '#f0c27a';
    ctx.beginPath();
    ctx.roundRect(bx0, r1 - R(0.014), Math.max(R(0.028), bw * fr), R(0.028), R(0.014));
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,70,30,.7)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let x = bx0 + R(0.008); x < bx0 + bw * fr - R(0.004); x += R(0.012)) {
      ctx.moveTo(x, r1 + R(0.012));
      ctx.lineTo(x + R(0.008), r1 - R(0.012));
    }
    ctx.stroke();
  }
  ctx.fillStyle = '#ffffff';
  font(0.036, 900);
  ctx.fillText(`${Math.round(s.ink * 10)}m`, bx0 + bw + R(0.012), r1 + 1);
  // 잡은 수
  const goal = (d.stars[0] as { n: number }).n;
  ctx.textAlign = 'right';
  font(0.04, 900);
  ctx.fillStyle = s.caught >= goal ? '#ffd84a' : '#ffffff';
  ctx.fillText(s.caught >= goal ? `🐟 ${s.caught} ✓` : `🐟 ${s.caught} / ${goal}`, w - R(0.025), r1 + 1);
  // 별 조건 (한 줄씩)
  for (let k = 0; k < rows; k++) {
    const st = d.stars[k], ry = Y(ty + 0.074 + pad + k * 0.04);
    const ok = s.phase === 'result' && s.ok ? s.starOk[k] : starNow(s, st) && (st.k !== 'shark' && st.k !== 'jelly' ? true : s.nets > 0);
    const lost = (st.k === 'shark' && s.tears > 0) || (st.k === 'jelly' && s.melts > 0) || (st.k === 'nets' && s.nets >= st.m && !s.fastOk) || (st.k === 'tuna' && s.phase === 'result' && !s.tunaGot);
    star5(ctx, R(0.05), ry, R(0.017));
    ctx.fillStyle = ok ? '#ffd43b' : lost ? 'rgba(255,255,255,.15)' : 'rgba(255,255,255,.3)';
    ctx.fill();
    ctx.textAlign = 'left';
    font(0.036, 800);
    ctx.fillStyle = ok ? '#fff1c4' : lost ? 'rgba(255,255,255,.4)' : '#e0f4ff';
    let label = starText(st);
    if (st.k === 'nets') label += ` (지금 ${s.nets}번)`;
    if (st.k === 'big' && s.bestNet > 0) label += ` (최고 ${s.bestNet})`;
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
  if (s.phase === 'result') hint = s.ok ? (s.won ? '모든 바다 정복! 고양이 선장 배불러요' : `★ ${s.got}개! 다음 바다엔 새것이 나와요`) : '떼 바깥에서 시작해 단숨에 빙 둘러 봐요';
  else if (s.down && s.net && s.net.alive) hint = '빙 둘러서 떼면 그물이 휙!';
  else if (s.caught >= goal) hint = `목표 달성! 배가 차면(${d.full}마리) 바로 돌아가요`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffe9a8';
  font(0.036, 900);
  ctx.fillText(hint, w / 2, Y(ty + 0.078 + pad * 1.4 + rows * 0.04), w - R(0.05));
}
