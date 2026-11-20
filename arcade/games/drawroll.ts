/**
 * 그려서 굴리는 햄스터 공 (36라운드: 직접 만지는 물리 장난감 — 한 번 긋기)
 *   그린 선이 길이 된다(drawline) × 가리키기(pointer).
 * 손짓 하나: 한 번 긋기. 손가락이 지나간 자리에 바로 굵은 크레용 선이 그려지고(지금 떼면 공이 갈 길이 하얀 점으로 0.8초 보인다),
 *   떼는 순간 그 선이 처음부터 끝까지 톡톡 나무 길로 굳으며 출발 문이 탁 넘어가고 햄스터 공이 '출발!' — 진짜 물리(중력·경사·튕김)로 굴러간다.
 *   공이 구르는 동안엔 손을 쉰다(시간 압박 없음). 공이 길 위에서 멈추면 남은 잉크로 한 번 더 긋고, 떼면 다시 출발.
 *   공 근처(앞·아래)에서 시작한 획은 공 발밑과 저절로 이어지고, 다른 공 발밑 근처에서 끝난 획은 그 공까지 이어진다(턱에 걸려 멈추지 않게).
 * 규칙(결정적): 고정 간격(1/60, 안에서 3번 나눔, 세상은 1.25배속) 원 vs 선분 사슬 충돌 · 구름 저항 · 튕김 · 에너지 지킴(틈에 끼어 튀어 오르지 않게).
 *   선은 사람이 그린 그대로(점 간격만 0.03으로 고름). 잉크(그을 수 있는 길이)와 선 수는 판마다 정해져 있다.
 *   공이 강·화면 밖으로 떨어지거나, 선을 다 쓰고 멈추면 그 판 다시(하트 −1, 1·2판은 안 깎임). 하트 셋을 다 잃거나 8판을 마치면 끝.
 * 와우: 내가 그린 삐뚤빼뚤한 선이 그대로 나무 길이 되어 햄스터 공이 데굴데굴 '쌩~' 굴러가며 별을 줍고, 끊긴 끝에서 붕 날아 집 구멍에 쏙.
 * 판 8개(하는 일이 바뀐다): 1 첫 길(내리막 긋기) → 2 별 줍기(길을 휘어 별 지나기) → 3 낭떠러지(잉크가 모자라 끝을 올려 붕 점프)
 *   → 4 용수철(공을 용수철 위로 떨어뜨려 높이 뿅 — 옆으로 너무 빠르면 집 벽에 쿵) → 5 바람 기둥(기둥 아래로 들여보내면 둥실 떠 집 쪽으로)
 *   → 6 단추 문(문이 반대쪽: 집을 넘어 날아가 비탈 위 단추를 누르고 굴러 돌아와 쏙 — 곧은 선은 지붕에 막힌다)
 *   → 7 고리(높이에서 빠르기를 모아 나무 고리를 한 바퀴) → 8 쌍둥이(양쪽 공이 같이 출발 — 한 줄로 V를 그려 가운데 양쪽 문 집에 둘 다).
 * 별(한 판에 하나씩 늘어 셋): 햄스터를 집으로 · 별 줍기 · 선 한 번만 긋기 / 잉크 반 남기기.
 * 웃음: 공 속 햄스터는 기다리며 쳇바퀴를 달리고, 구르면 신나고, 아주 빠르면 같이 빙글, 날면 만세, 풍덩 빠지면 눈이 빙글빙글(강에 둥둥),
 *   멈추면 갸우뚱 '?'. 집 지붕 위 참새가 공을 따라 고개를 돌리고, 큰일마다 파닥이며 ♪, 실패하면 날개로 눈을 가린다. 집에 들어가면 창문으로 손 흔들기.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5;
/** 물리 (화면 폭 = 1) */
/** 한 틱(1/60초)에 세상은 1.25틱만큼 흐른다 (장난감이 쌩 구르게) */
const G = 2.4, R = 0.06, LT = 0.011, SUB = 3, DT = 1.25 / 60 / SUB;
/** 떼는 순간 햄스터가 달려 나가는 빠르기 · 구름 저항 · 닿아 있을 때 감쇠 · 튕김 */
const DASH = 0.25, DRIVE = 0.55, DRIVE_T = 21, ROLL_FR = 0.2, DAMP = 0.1, AIR = 0.02, BOUNCE = 0.3;
const SPRING_V = 1.95, WIND_V = -1.75, WIND_KY = 3.4, WIND_KX = 0.35, WIND_FADE = 0.16, WIND_CURL = 0.9;
const REST_V = 0.05, REST_T = 26, ROLL_MAX = 60 * 12;
/** 선: 점 간격 · 공 둘레 안 그려지는 거리 · 가장 짧은 획 */
const MINSEG = 0.03, KEEP = R + LT + 0.004, MIN_STROKE = 0.06;
const RIVER = 1.36, OUT_Y = 1.42;
const RESULT_OK = 200, RESULT_FAIL = 170;
const STAR_PTS = 100, INK_PTS = 40, WIN_PTS = 300, HEART_PTS = 60;
const STAR_R = 0.035;

const CLIFF = 0, WOOD = 1;
const K_STATIC = 0, K_DRAWN = 1, K_SPRING = 2, K_GATE = 3, K_LOOP = 4;
const G_ALL = 0, G_LOOP0 = 1, G_LOOP1 = 2, G_GATE = 3;

type Goal = 'home' | 'stars' | 'one' | 'half';
interface StageDef {
  name: string;
  key: string;
  news: string;
  hint: string;
  /** [x0, y0, x1, y1, 종류] 위(y0)가 윗면 */
  blocks: number[][];
  /** 1판 언덕 윗면 */
  ground?: number[][];
  /** 출발대 [x, 윗면 y] */
  pads: number[][];
  /** 집 [가운데 x, 바닥 y] */
  house: number[];
  gate?: boolean;
  btn?: number[];
  spring?: number[];
  wind?: number[];
  loop?: number[];
  stars: number[][];
  ink: number;
  strokes: number;
  goals: Goal[];
  safe?: boolean;
  /** NEW 스포트라이트 자리 [x, y, rx, ry] */
  spot?: number[];
  demo?: number[][];
}

export const STAGES: StageDef[] = [
  {
    name: '첫 길', key: 'draw', news: '', hint: '👆 출발대에서 집까지 길을 쓱 그려요!',
    blocks: [[0, 0.44, 0.22, 1.6, CLIFF]],
    ground: [[0.2, 1.08], [0.45, 1.15], [0.7, 1.24], [1.02, 1.24]],
    pads: [[0.19, 0.44]], house: [0.86, 1.24], stars: [], ink: 1.6, strokes: 3, goals: ['home'], safe: true,
    demo: [[0.23, 0.45], [0.36, 0.6], [0.5, 0.86], [0.62, 1.08], [0.73, 1.23]],
  },
  {
    name: '별 줍기', key: 'star', news: '⭐ 별 — 공이 지나가면 주워요', hint: '길을 휘어서 별 쪽으로 지나가게!',
    blocks: [[0, 0.4, 0.22, 1.6, CLIFF]],
    ground: [[0.2, 1.02], [0.42, 1.1], [0.66, 1.2], [1.02, 1.2]],
    pads: [[0.19, 0.4]], house: [0.86, 1.2], stars: [[0.5, 0.72]], ink: 1.5, strokes: 3, goals: ['home', 'stars'], safe: true,
    spot: [0.5, 0.72, 0.09, 0.09],
  },
  {
    name: '낭떠러지', key: 'jump', news: '🪂 잉크가 모자라요 — 끝을 올려 붕!', hint: '끝을 위로 휘면 공이 붕 날아요',
    blocks: [[0, 0.3, 0.24, 1.6, CLIFF], [0.76, 0.5, 1.02, 1.6, CLIFF]],
    pads: [[0.21, 0.3]], house: [0.88, 0.5], stars: [[0.6, 0.24]], ink: 0.45, strokes: 2, goals: ['home', 'stars', 'one'],
    spot: [0.5, 0.5, 0.2, 0.2],
  },
  {
    name: '용수철', key: 'spring', news: '🌀 용수철 — 떨어지면 뿅! 높이 튀어요', hint: '용수철 위로 떨어뜨리면 높이 뿅!',
    blocks: [[0, 0.5, 0.2, 1.6, CLIFF], [0.48, 1.2, 0.62, 1.6, WOOD], [0.72, 0.5, 1.02, 1.6, CLIFF]],
    spring: [0.49, 0.61, 1.18], pads: [[0.17, 0.5]], house: [0.88, 0.5], stars: [[0.66, 0.3], [0.36, 0.9]], ink: 1.1, strokes: 2, goals: ['home', 'stars', 'half'],
    spot: [0.55, 1.15, 0.1, 0.08],
  },
  {
    name: '바람 기둥', key: 'wind', news: '🍃 바람 기둥 — 들어가면 둥실 떠올라요', hint: '바람 기둥 아래로 들어가면 둥실!',
    blocks: [[0, 0.86, 0.2, 1.6, CLIFF], [0.42, 1.24, 0.66, 1.6, WOOD], [0.7, 0.56, 1.02, 1.6, CLIFF]],
    wind: [0.42, 0.3, 0.66, 1.22], pads: [[0.17, 0.86]], house: [0.88, 0.56], stars: [[0.34, 1.06], [0.54, 0.72]], ink: 0.7, strokes: 2, goals: ['home', 'stars', 'one'],
    spot: [0.54, 0.75, 0.13, 0.42],
  },
  {
    name: '단추 문', key: 'button', news: '🔴 단추 문 — 집 뒤 단추를 누르면 문이 열려요', hint: '집을 넘어 단추를 누르고 굴러 돌아와요!',
    blocks: [[0, 0.5, 0.2, 1.6, CLIFF], [0.36, 1.1, 0.8, 1.6, CLIFF]],
    ground: [[0.78, 1.1], [0.88, 1.065], [0.95, 0.97], [0.99, 0.82], [0.99, 0.5]],
    btn: [0.94, 0.95], gate: true, pads: [[0.17, 0.5]], house: [0.6, 1.1, 1], stars: [[0.6, 0.62]], ink: 0.8, strokes: 2, goals: ['home', 'stars', 'one'],
    spot: [0.94, 0.95, 0.08, 0.08],
  },
  {
    name: '고리', key: 'loop', news: '🎡 고리 — 빠르면 한 바퀴 빙글!', hint: '높이에서 쭉 내려와야 한 바퀴 돌아요',
    blocks: [[0, 0.5, 0.16, 1.6, CLIFF], [0.28, 1.18, 1.02, 1.6, WOOD]],
    loop: [0.65, 1.04, 0.14], pads: [[0.13, 0.5]], house: [0.89, 1.18], stars: [[0.65, 0.95], [0.3, 0.84]], ink: 0.9, strokes: 2, goals: ['home', 'stars', 'one'],
    spot: [0.65, 1.04, 0.18, 0.18],
  },
  {
    name: '쌍둥이', key: 'twin', news: '🐹🐹 쌍둥이 — 한 길로 둘 다 집에!', hint: '양쪽 공이 같이 출발해요 — 한 줄로 둘 다!',
    blocks: [[0, 0.36, 0.2, 1.6, CLIFF], [0.8, 0.5, 1.02, 1.6, CLIFF], [0.36, 1.12, 0.64, 1.6, WOOD]],
    pads: [[0.17, 0.36], [0.83, 0.5]], house: [0.5, 1.12, 2], stars: [[0.28, 0.86], [0.7, 0.84]], ink: 1.8, strokes: 2, goals: ['home', 'stars', 'one'],
    spot: [0.5, 0.45, 0.45, 0.14],
  },
];
export const STAGE_COUNT = STAGES.length;

const GOAL_TEXT = (g: Goal, d: StageDef) =>
  g === 'home' ? (d.pads.length > 1 ? '둘 다 집으로' : '햄스터를 집으로') : g === 'stars' ? (d.stars.length > 1 ? `별 ${d.stars.length}개 다 줍기` : '별 하나 줍기') : g === 'one' ? '선 한 번만 긋기' : '잉크 반 남기기';

// ───────────────────────────── 판 배치 (뒤집기·흔들기 적용) ─────────────────────────────
interface Seg { ax: number; ay: number; bx: number; by: number; r: number; k: number; grp: number; sid: number; x0: number; x1: number; y0: number; y1: number }
interface Block { x0: number; y0: number; x1: number; y1: number; kind: number }
interface Layout {
  d: StageDef;
  flip: boolean;
  dir: number;
  blocks: Block[];
  ground: number[][] | null;
  pads: { x: number; y: number; f: number }[];
  /** f: 문이 난 쪽(-1 왼쪽 · 1 오른쪽 · 0 양쪽) */
  house: { x: number; y: number; f: number; front: number; two: boolean };
  btn: { x: number; y: number } | null;
  spring: { x0: number; x1: number; y: number; tilt: number } | null;
  wind: { x0: number; x1: number; y0: number; y1: number } | null;
  loop: { x: number; y: number; r: number } | null;
  segs: Seg[];
  spot: number[] | null;
  demo: number[][] | null;
}
interface Ball { x: number; y: number; vx: number; vy: number; drv: number; dd: number; zm: boolean; rot: number; nx: number; ny: number; con: boolean; air: number; slow: number; home: number; out: boolean; hop: boolean; spun: number }
interface Star { x: number; y: number; got: number }
interface Sim {
  t: number;
  segs: Seg[];
  balls: Ball[];
  stars: Star[];
  gateOpen: boolean;
  loopPh: number;
  loops: number;
  moving: boolean;
  rollT: number;
  ink: number;
  used: number;
  sid: number;
  pen: { x: number; y: number } | null;
  /** 이 획이 이어 줄 공 (공 근처에서 시작한 획은 공 발밑과 저절로 이어진다) */
  link: number;
  from: number;
  penLen: number;
  penFirst: number;
  dry: boolean;
  springT: number;
  dashes: number;
  ev: ((kind: string, x: number, y: number, text?: string) => void) | null;
}

function mkSeg(ax: number, ay: number, bx: number, by: number, r: number, k: number, grp = G_ALL, sid = 0): Seg {
  return { ax, ay, bx, by, r, k, grp, sid, x0: Math.min(ax, bx) - r - R, x1: Math.max(ax, bx) + r + R, y0: Math.min(ay, by) - r - R, y1: Math.max(ay, by) + r + R };
}

const HW = 0.1, HH = 0.165, DOOR_H = 0.15, DOOR_CATCH = 0.045;
function layout(k: number, flip: boolean, jit: number[]): Layout {
  const d = STAGES[k];
  const fx = (x: number) => (flip ? 1 - x : x);
  const dir = flip ? -1 : 1;
  const segs: Seg[] = [];
  const blocks: Block[] = d.blocks.map(([x0, y0, x1, y1, kind]) => ({ x0: Math.min(fx(x0), fx(x1)), y0, x1: Math.max(fx(x0), fx(x1)), y1, kind }));
  for (const b of blocks) {
    segs.push(mkSeg(b.x0, b.y0, b.x1, b.y0, 0, K_STATIC));
    segs.push(mkSeg(b.x0, b.y0, b.x0, Math.min(b.y1, 1.6), 0, K_STATIC));
    segs.push(mkSeg(b.x1, b.y0, b.x1, Math.min(b.y1, 1.6), 0, K_STATIC));
    if (b.y1 < 1.5) segs.push(mkSeg(b.x0, b.y1, b.x1, b.y1, 0, K_STATIC));
  }
  const ground = d.ground ? d.ground.map(([x, y]) => [fx(x), y]) : null;
  if (ground) for (let i = 0; i + 1 < ground.length; i++) segs.push(mkSeg(ground[i][0], ground[i][1], ground[i + 1][0], ground[i + 1][1], 0, K_STATIC));
  const pads = d.pads.map(([x, y]) => ({ x: fx(x), y, f: Math.sign(fx(d.house[0]) - fx(x)) || dir }));
  for (const p of pads) segs.push(mkSeg(p.x - p.f * 0.095, p.y - 0.1, p.x - p.f * 0.095, p.y, 0.008, K_STATIC));
  // 집: 지붕 · 문 위 벽 · 뒷벽 (바닥은 아래 땅)
  // house[2]: 없음 = 문이 출발대 쪽 · 1 = 문이 반대쪽(뒤로 돌아 들어간다) · 2 = 양쪽 문
  const two = d.house[2] === 2;
  const hx = fx(d.house[0]), hy = d.house[1], f = two ? 0 : d.house[2] === 1 ? dir : -dir, front = hx + (f || -1) * HW, back = hx - (f || -1) * HW;
  segs.push(mkSeg(two ? hx - HW : front, hy - HH, hx, hy - HH - 0.11, 0.006, K_STATIC));
  segs.push(mkSeg(hx, hy - HH - 0.11, two ? hx + HW : back - f * 0.025, hy - HH, 0.006, K_STATIC));
  segs.push(mkSeg(front, hy - HH, front, hy - DOOR_H, 0.008, K_STATIC));
  segs.push(mkSeg(back, hy - HH, back, two ? hy - DOOR_H : hy, 0.008, K_STATIC));
  if (d.gate) segs.push(mkSeg(front + f * 0.014, hy - DOOR_H - 0.01, front + f * 0.014, hy, 0.008, K_GATE, G_GATE));
  // 용수철: 집 쪽으로 살짝 기운 판 (기운 쪽으로 튕긴다). tilt = 집 쪽 끝이 낮아지는 정도(라디안)
  const spring = d.spring ? { x0: Math.min(fx(d.spring[0]), fx(d.spring[1])), x1: Math.max(fx(d.spring[0]), fx(d.spring[1])), y: d.spring[2], tilt: (d.spring[3] ?? 0) * dir } : null;
  if (spring) {
    const hx2 = (spring.x1 - spring.x0) / 2, cx = (spring.x0 + spring.x1) / 2, dy = Math.sin(spring.tilt) * hx2;
    segs.push(mkSeg(cx - hx2, spring.y - dy, cx + hx2, spring.y + dy, 0.01, K_SPRING));
  }
  const wind = d.wind ? { x0: Math.min(fx(d.wind[0]), fx(d.wind[2])), x1: Math.max(fx(d.wind[0]), fx(d.wind[2])), y0: d.wind[1], y1: d.wind[3] } : null;
  const loop = d.loop ? { x: fx(d.loop[0]), y: d.loop[1], r: d.loop[2] } : null;
  if (loop) {
    // 고리: 아래(바닥)에서 들어와 오른쪽(진행 방향) 벽을 타고 올라 꼭대기 → 반대쪽 → 다시 바닥. 들어올 땐 뒤쪽 아래 사분면이 열려 있고,
    // 꼭대기를 지나면 그 사분면이 닫히고 앞쪽 아래 사분면이 열려 빠져나간다 (2D 고리의 흔한 방법)
    const N = 32;
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2;
      const am = (a0 + a1) / 2;
      const mx = Math.cos(am) * dir, my = Math.sin(am);
      // 아래 사분면(my > 0): 진행 방향 쪽(mx > 0)은 들어올 때만, 뒤쪽은 나갈 때만
      const grp = my > 0.05 ? (mx > 0 ? G_LOOP0 : G_LOOP1) : G_ALL;
      segs.push(mkSeg(loop.x + Math.cos(a0) * loop.r, loop.y + Math.sin(a0) * loop.r, loop.x + Math.cos(a1) * loop.r, loop.y + Math.sin(a1) * loop.r, 0.006, K_LOOP, grp));
    }
  }
  const btn = d.btn ? { x: fx(d.btn[0]), y: d.btn[1] } : null;
  void jit;
  return {
    d, flip, dir, blocks, ground, pads, house: { x: hx, y: hy, f, front, two }, btn, spring, wind, loop, segs,
    spot: d.spot ? [fx(d.spot[0]), d.spot[1], d.spot[2], d.spot[3]] : null,
    demo: d.demo ? d.demo.map(([x, y]) => [fx(x), y]) : null,
  };
}

function newSim(L: Layout, jit: number[]): Sim {
  const d = L.d;
  return {
    t: 0,
    segs: L.segs.slice(),
    balls: L.pads.map((p) => ({ x: p.x, y: p.y - R, vx: 0, vy: 0, drv: 0, dd: L.dir, zm: false, rot: 0, nx: 0, ny: -1, con: true, air: 0, slow: REST_T, home: -1, out: false, hop: false, spun: 0 })),
    stars: d.stars.map(([x, y], i) => ({ x: (L.flip ? 1 - x : x) + (jit[i * 2] - 0.5) * 0.03, y: y + (jit[i * 2 + 1] - 0.5) * 0.03, got: -1 })),
    gateOpen: !d.gate,
    loopPh: 0,
    loops: 0,
    moving: false,
    rollT: 0,
    ink: d.ink,
    used: 0,
    sid: 0,
    pen: null,
    link: -1,
    from: -1,
    penLen: 0,
    penFirst: 0,
    dry: false,
    springT: -99,
    dashes: 0,
    ev: null,
  };
}

function cloneSim(S: Sim): Sim {
  return { ...S, segs: S.segs.slice(), balls: S.balls.map((b) => ({ ...b })), stars: S.stars.map((q) => ({ ...q })), pen: S.pen ? { ...S.pen } : null, ev: null };
}

// ───────────────────────────── 물리 ─────────────────────────────
const active = (S: Sim, g: Seg) => g.grp === G_ALL || (g.grp === G_LOOP0 ? S.loopPh === 0 : g.grp === G_LOOP1 ? S.loopPh === 1 : !S.gateOpen);
const inWind = (w: Layout['wind'], x: number, y: number) => !!w && x > w.x0 && x < w.x1 && y > w.y0 - 0.02 && y < w.y1;

function sub(L: Layout, S: Sim) {
  const w = L.wind;
  for (const b of S.balls) {
    if (b.home >= 0 || b.out) continue;
    let ax = 0, ay = G;
    // 에너지 지킴: 선 틈에 끼어 밀려 나오며 튀어 오르는 일(에너지가 생기는 것)을 막는다 — 용수철·바람만 에너지를 준다
    const e0 = 0.5 * (b.vx * b.vx + b.vy * b.vy) - G * b.y, sp0 = S.springT;
    let free = false;
    if (w && inWind(w, b.x, b.y)) {
      free = true;
      const fade = Math.max(0, Math.min(1, (b.y - w.y0) / WIND_FADE));
      // 기둥 꼭대기에선 바람이 집 쪽으로 살짝 휘어 나간다
      ax += WIND_KX * (WIND_CURL * L.dir * (1 - fade) - b.vx);
      ay += WIND_KY * (WIND_V * fade - b.vy);
    }
    b.vx += ax * DT;
    b.vy += ay * DT;
    b.vx *= 1 - AIR * DT;
    b.vy *= 1 - AIR * DT;
    b.x += b.vx * DT;
    b.y += b.vy * DT;
    let nx = 0, ny = 0, hit = false;
    for (let i = 0; i < S.segs.length; i++) {
      const g = S.segs[i];
      if (b.x < g.x0 || b.x > g.x1 || b.y < g.y0 || b.y > g.y1) continue;
      if (g.grp !== G_ALL && !active(S, g)) continue;
      const rr = R + g.r, dx = g.bx - g.ax, dy = g.by - g.ay, l2 = dx * dx + dy * dy;
      let u = l2 > 0 ? ((b.x - g.ax) * dx + (b.y - g.ay) * dy) / l2 : 0;
      u = u < 0 ? 0 : u > 1 ? 1 : u;
      let ex = b.x - (g.ax + dx * u), ey = b.y - (g.ay + dy * u);
      const d2 = ex * ex + ey * ey;
      if (d2 >= rr * rr) continue;
      const dd = Math.sqrt(d2) || 1e-9;
      ex /= dd;
      ey /= dd;
      b.x += ex * (rr - dd);
      b.y += ey * (rr - dd);
      const vn = b.vx * ex + b.vy * ey;
      if (vn < 0) {
        if (g.k === K_SPRING && ey < -0.3) {
          const out = Math.max(-vn * 0.5, SPRING_V);
          b.vx += (out - vn) * ex;
          b.vy += (out - vn) * ey;
          if (S.t - S.springT > 10) (S.springT = S.t), S.ev?.('spring', b.x, b.y + R);
        } else {
          const e = -vn > 0.35 ? BOUNCE : 0;
          b.vx -= (1 + e) * vn * ex;
          b.vy -= (1 + e) * vn * ey;
          if (-vn > 0.9) S.ev?.('thud', b.x - ex * R, b.y - ey * R);
        }
      }
      nx += ex;
      ny += ey;
      hit = true;
    }
    if (hit) {
      const nl = Math.hypot(nx, ny) || 1;
      nx /= nl;
      ny /= nl;
      b.nx = nx;
      b.ny = ny;
      b.con = true;
      let tx = -ny, ty = nx;
      // 떼고 잠깐은 햄스터가 공 속에서 달려 굴린다 (턱 끝에 멈춰 서지 않게)
      if (b.drv > 0 && ny < -0.2) {
        const sg = tx * b.dd > 0 ? 1 : -1;
        b.vx += tx * sg * DRIVE * DT;
        b.vy += ty * sg * DRIVE * DT;
      }
      const vt = b.vx * tx + b.vy * ty;
      const dec = (ROLL_FR + Math.abs(vt) * DAMP) * DT * Math.max(0.25, -ny);
      const nvt = Math.abs(vt) <= dec ? 0 : vt - Math.sign(vt) * dec;
      b.vx += (nvt - vt) * tx;
      b.vy += (nvt - vt) * ty;
      b.rot += (nvt * DT) / R;
    } else b.rot += (b.vx * DT * 0.3) / R;
    if (!free && S.springT === sp0) {
      const k2 = 0.5 * (b.vx * b.vx + b.vy * b.vy), e1 = k2 - G * b.y;
      if (e1 > e0 + 1e-6 && k2 > 1e-9) {
        const f = Math.sqrt(Math.max(0, e0 + G * b.y) / k2);
        b.vx *= f;
        b.vy *= f;
      }
    }
  }
  // 쌍둥이: 공끼리 부딪힘
  if (S.balls.length > 1) {
    const [p, q] = S.balls;
    if (p.home < 0 && q.home < 0 && !p.out && !q.out) {
      let ex = q.x - p.x, ey = q.y - p.y;
      const d = Math.hypot(ex, ey);
      if (d < 2 * R && d > 1e-9) {
        ex /= d;
        ey /= d;
        const pen = (2 * R - d) / 2;
        p.x -= ex * pen;
        p.y -= ey * pen;
        q.x += ex * pen;
        q.y += ey * pen;
        const rel = (q.vx - p.vx) * ex + (q.vy - p.vy) * ey;
        if (rel < 0) {
          const j = (-(1 + 0.4) * rel) / 2;
          p.vx -= j * ex;
          p.vy -= j * ey;
          q.vx += j * ex;
          q.vy += j * ey;
          if (-rel > 0.5) S.ev?.('bonk', (p.x + q.x) / 2, (p.y + q.y) / 2);
        }
      }
    }
  }
}

function tick(L: Layout, S: Sim) {
  S.t++;
  for (const b of S.balls) b.con = false;
  for (let k = 0; k < SUB; k++) sub(L, S);
  S.rollT++;
  const H = L.house;
  for (const b of S.balls) {
    if (b.home >= 0 || b.out) continue;
    b.air = b.con ? 0 : b.air + 1;
    if (b.drv > 0) b.drv--;
    if (b.air === 0 && b.hop) {
      b.hop = false;
      S.ev?.('land', b.x, b.y + R);
    }
    if (b.air === 22 && !b.hop) (b.hop = true), S.ev?.('air', b.x, b.y);
    for (const st of S.stars)
      if (st.got < 0 && (b.x - st.x) ** 2 + (b.y - st.y) ** 2 < (R + STAR_R) ** 2) (st.got = S.t), S.ev?.('star', st.x, st.y);
    if (!S.gateOpen && L.btn && Math.hypot(b.x - L.btn.x, b.y - L.btn.y) < R + 0.045) (S.gateOpen = true), S.ev?.('button', L.btn.x, L.btn.y);
    if (L.loop) {
      const lp = L.loop, rx = (b.x - lp.x) * L.dir, ry = b.y - lp.y, dd = Math.hypot(rx, ry);
      if (S.loopPh === 0 && rx < -0.02 && ry < 0 && dd < lp.r) (S.loopPh = 1), (b.spun = 0);
      else if (S.loopPh === 1) {
        // 꼭대기를 넘어 바닥을 앞으로 지나면 한 바퀴 · 고리를 벗어나면 처음 상태로
        if (!b.spun && rx > 0.01 && ry > lp.r * 0.3) (S.loops++, (b.spun = S.t)), S.ev?.('loop', lp.x, lp.y);
        if (dd > lp.r + 0.08) S.loopPh = 0;
      }
    }
    // 집: 문을 지나 안으로
    // 문 앞 DOOR_CATCH 안으로 들어오면 쏙 (문 높이 안에서, 집 쪽에서 오는 공만)
    const side = Math.sign(b.x - H.x), doorSide = H.two || side === H.f;
    const inDoor = S.gateOpen && doorSide && Math.abs(b.x - H.x) < HW + DOOR_CATCH && b.y > H.y - DOOR_H - 0.01 && b.y < H.y + 0.02;
    if (inDoor || (Math.abs(b.x - H.x) < HW - 0.012 && b.y > H.y - HH - 0.01 && b.y < H.y + 0.01)) {
      b.home = S.t;
      S.ev?.('home', b.x, b.y);
    }
    if (b.y > OUT_Y || b.x < -0.1 || b.x > 1.1) (b.out = true), S.ev?.('out', b.x, Math.min(b.y, RIVER));
    const sp = Math.hypot(b.vx, b.vy), w = L.wind && inWind(L.wind, b.x, b.y);
    if (!b.zm && sp > 1.7) (b.zm = true), S.ev?.('zoom', b.x, b.y);
    if (b.drv <= 0 && ((b.con && sp < REST_V) || (w && sp < 0.14))) b.slow++;
    else b.slow = 0;
  }
}

/** 1 = 모두 집 · -1 = 떨어짐 · 2 = 멈춤 · 0 = 구르는 중 */
function verdict(S: Sim): number {
  if (S.balls.some((b) => b.out)) return -1;
  if (S.balls.every((b) => b.home >= 0)) return 1;
  if (S.rollT >= ROLL_MAX || S.balls.every((b) => b.home >= 0 || b.slow >= REST_T)) return 2;
  return 0;
}

// ───────────────────────────── 긋기 ─────────────────────────────
const toW = (p: { x: number; y: number }) => ({ x: p.x, y: p.y * A });
function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  let u = l2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
  u = u < 0 ? 0 : u > 1 ? 1 : u;
  return Math.hypot(px - ax - dx * u, py - ay - dy * u);
}
/** 공 발밑 앞쪽 (선이 여기서 시작하면 공이 턱 없이 올라탄다) */
function footOf(L: Layout, b: Ball) {
  const dir = Math.sign(L.house.x - b.x) || L.dir;
  return { x: b.x + dir * 0.04, y: b.y + R + LT, dir };
}
function penDown(L: Layout, S: Sim, x: number, y: number) {
  S.sid++;
  S.pen = { x, y };
  S.penLen = 0;
  S.penFirst = S.segs.length;
  S.link = -1;
  // 공 가까이(앞·아래)에서 시작한 획은 공 발밑과 이어 준다 — 턱에 걸려 멈추지 않게
  let best = 0.16;
  S.balls.forEach((b, i) => {
    if (b.home >= 0 || b.out) return;
    const f = footOf(L, b), d = Math.hypot(x - f.x, y - f.y);
    if (d < best && (x - b.x) * f.dir > -0.03 && y > b.y - 0.02) (best = d), (S.link = i);
  });
  S.from = S.link;
}
function addSeg(S: Sim, ax: number, ay: number, bx: number, by: number): number {
  let d = Math.hypot(bx - ax, by - ay);
  if (d > S.ink) (bx = ax + ((bx - ax) * S.ink) / d), (by = ay + ((by - ay) * S.ink) / d), (d = S.ink);
  if (d < 0.002) return 0;
  S.segs.push(mkSeg(ax, ay, bx, by, LT, K_DRAWN, G_ALL, S.sid));
  S.ink -= d;
  S.penLen += d;
  return d;
}
function penMove(L: Layout, S: Sim, x: number, y: number): number {
  const p = S.pen;
  if (!p || Math.hypot(x - p.x, y - p.y) < MINSEG) return 0;
  if (S.ink <= 0.002) {
    if (!S.dry) (S.dry = true), S.ev?.('dry', p.x, p.y);
    (p.x = x), (p.y = y);
    return 0;
  }
  let got = 0;
  if (S.link >= 0) {
    const b = S.balls[S.link], f = footOf(L, b);
    if (Math.hypot(p.x - b.x, p.y - b.y) >= KEEP) {
      // 시작점이 공 밖: 공 발밑 → 시작점을 먼저 잇는다
      if (segDist(b.x, b.y, f.x, f.y, p.x, p.y) >= R + LT) got += addSeg(S, f.x, f.y, p.x, p.y);
    } else if (Math.hypot(x - b.x, y - b.y) >= KEEP) (p.x = f.x), (p.y = f.y);
    else return ((p.x = x), (p.y = y), 0);
    S.link = -1;
  }
  let blocked = false;
  for (const b of S.balls) if (b.home < 0 && !b.out && segDist(b.x, b.y, p.x, p.y, x, y) < KEEP) blocked = true;
  if (!blocked && S.ink > 0.002) got += addSeg(S, p.x, p.y, x, y);
  (p.x = x), (p.y = y);
  return got;
}
/** 떼기: 획이 충분히 길면 굳히고 true. 너무 짧으면 지우고 잉크를 돌려준다 */
function penUp(L: Layout, S: Sim): boolean {
  const p = S.pen;
  // 다른 공 발밑 가까이에서 끝난 획: 그 공 발밑까지 이어 준다 (쌍둥이를 한 줄로)
  if (p && S.penLen > 0)
    S.balls.forEach((b, i) => {
      if (i === S.from || b.home >= 0 || b.out) return;
      const f = footOf(L, b);
      if (Math.hypot(p.x - f.x, p.y - f.y) < 0.16 && segDist(b.x, b.y, p.x, p.y, f.x, f.y) >= R + LT) addSeg(S, p.x, p.y, f.x, f.y);
    });
  S.pen = null;
  if (S.penLen >= MIN_STROKE) return (S.used++, true);
  S.ink += S.penLen;
  S.segs.length = S.penFirst;
  S.penLen = 0;
  return false;
}
function dash(L: Layout, S: Sim) {
  for (const b of S.balls) {
    if (b.home >= 0 || b.out) continue;
    const dir = Math.sign(L.house.x - b.x) || L.dir;
    let tx = dir, ty = 0;
    if (b.air === 0 && b.ny < -0.3) {
      (tx = -b.ny), (ty = b.nx);
      if (tx * dir < 0) (tx = -tx), (ty = -ty);
    }
    b.vx = tx * DASH;
    b.vy = ty * DASH;
    b.slow = 0;
    b.drv = DRIVE_T;
    b.dd = dir;
    b.zm = false;
  }
  S.moving = true;
  S.rollT = 0;
  S.dashes++;
}

// ───────────────────────────── 게임 상태 ─────────────────────────────
interface Ev { id: number; t: number; kind: string; x: number; y: number; text?: string }
export interface RollState {
  rng: Rng;
  seed: number;
  t: number;
  stage: number;
  flips: boolean[];
  jits: number[][];
  L: Layout;
  S: Sim;
  phase: 'play' | 'result';
  pt: number;
  ok: boolean;
  why: string;
  hearts: number;
  stars: number;
  got: number;
  starOk: boolean[];
  pts: number;
  dead: boolean;
  won: boolean;
  tries: number;
  again: boolean;
  down: boolean;
  drawing: boolean;
  tip: { x: number; y: number } | null;
  drew: boolean;
  stageT: number;
  dashT: number;
  hard: Map<number, number>;
  seen: Set<string>;
  news: { text: string; t: number } | null;
  banner: { head: string; sub: string; t: number } | null;
  events: Ev[];
  eid: number;
  wowN: number;
  waitT: number;
  failKind: string;
}

function ev(s: RollState, kind: string, x: number, y: number, text?: string) {
  s.events.push({ id: ++s.eid, t: s.t, kind, x, y, text });
  if (s.events.length > 60) s.events.splice(0, s.events.length - 60);
}
function wow(s: RollState, text: string, x: number, y: number) {
  s.wowN++;
  ev(s, 'wow', x, y, text);
}
function see(s: RollState, key: string, text: string) {
  if (!key || s.seen.has(key)) return;
  s.seen.add(key);
  s.news = { text, t: s.t };
}

function newStage(s: RollState) {
  s.L = layout(s.stage, s.flips[s.stage], s.jits[s.stage]);
  s.S = newSim(s.L, s.jits[s.stage]);
  s.S.ev = (kind, x, y, text) => simEvent(s, kind, x, y, text);
  s.phase = 'play';
  s.pt = 0;
  s.drawing = false;
  s.tip = null;
  s.stageT = s.t;
  s.dashT = -999;
  s.hard = new Map();
  s.waitT = s.t;
  s.starOk = s.L.d.goals.map(() => false);
  const d = s.L.d;
  if (!s.again && s.stage === 0) s.banner = null;
  else if (!s.again) s.banner = { head: `${s.stage + 1}판 · ${d.name}`, sub: d.news ? `NEW  ${d.news}` : d.goals.map((g) => GOAL_TEXT(g, d))[0], t: s.t };
  else s.banner = { head: '다시 한 번!', sub: d.hint, t: s.t };
  if (d.key) s.seen.add(d.key);
}

function simEvent(s: RollState, kind: string, x: number, y: number, text?: string) {
  if (kind === 'air') wow(s, '붕~', x, y - 0.08);
  else if (kind === 'spring') wow(s, '뿅!', x, y - 0.1);
  else if (kind === 'loop') wow(s, '한 바퀴!', x, y);
  else if (kind === 'home') wow(s, '쏙!', x, y - 0.12);
  else if (kind === 'button') ev(s, 'button', x, y, '딸깍! 문이 열렸어요');
  else if (kind === 'dry') {
    ev(s, 'dry', x, y, '잉크 끝!');
    see(s, 'inkout', '✏️ 잉크를 다 쓰면 선이 더 안 그려져요');
  } else ev(s, kind, x, y, text);
}

function goalsMet(L: Layout, S: Sim): boolean[] {
  const allHome = S.balls.every((b) => b.home >= 0);
  return L.d.goals.map((g) => (g === 'home' ? allHome : g === 'stars' ? allHome && S.stars.every((q) => q.got >= 0) : g === 'one' ? allHome && S.used <= 1 : allHome && S.ink >= L.d.ink / 2 - 1e-9));
}

function endStage(s: RollState, ok: boolean, why: string, kind = '') {
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  s.why = why;
  s.failKind = kind;
  s.drawing = false;
  s.tip = null;
  const d = s.L.d;
  if (ok) {
    s.starOk = goalsMet(s.L, s.S);
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    s.pts += s.got * STAR_PTS + Math.round((s.S.ink / d.ink) * INK_PTS);
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS + s.hearts * HEART_PTS);
  } else {
    if (!d.safe) s.hearts--;
    s.tries++;
  }
}

function release(s: RollState) {
  const S = s.S;
  s.drawing = false;
  s.tip = null;
  if (!penUp(s.L, S)) return void ev(s, 'short', 0.5, 0.7, '조금 더 길게 그어요');
  s.hard.set(S.sid, s.t);
  dash(s.L, S);
  s.dashT = s.t;
  const b = S.balls.find((q) => q.home < 0) ?? S.balls[0];
  if (S.dashes === 1) wow(s, '출발!', b.x, b.y - 0.1);
  else ev(s, 'go', b.x, b.y - 0.1, '한 번 더!');
}

export const drawroll: GameDef<RollState> = {
  id: 'drawroll',
  name: '✏️ 그려서 굴리는 햄스터 공',
  genes: ['drawline', 'pointer'],
  twist: '내가 손가락으로 그린 삐뚤빼뚤한 선이 떼는 순간 그대로 나무 길로 굳고, 햄스터 공이 진짜 물리로 그 위를 굴러 — 끝을 올리면 붕 날고, 가파르면 쌩, 평평하면 멈칫한다',
  rules: [
    '손가락으로 길을 쓱 그려요 — 떼면 길이 굳고 햄스터 공이 출발!',
    '공을 집에 넣으면 성공. 잉크와 선 수는 정해져 있고, 공이 떨어지면 다시 해요.',
  ],
  controls: 'touch',
  hint: '손가락으로 길을 쓱 그렸다 떼기 / 화살표로 움직이며 스페이스를 누르고 있으면 그려져요',
  aspect: A,
  art: {
    concept: '햇살 언덕의 크레용 길 — 투명한 공 속 햄스터가 내가 그린 나무 길을 굴러 집으로',
    mood: '파란 하늘에 뭉게구름이 흐르고 멀리 초록 언덕과 풍차가 보인다. 풀 덮인 절벽 위 출발대에서 공 속 햄스터가 쳇바퀴를 굴리며 기다리고, 손가락이 지나간 자리에 주황 크레용 선이 반짝이며 그려지다 떼는 순간 나무 판자 길로 톡톡 굳는다. 아래로는 반짝이는 강이 흐르고, 빨간 지붕 햄스터 집 위 참새가 구경한다.',
    palette: { bg: '#8fd6ff', ink: '#3a2a14', muted: '#7a6a4a', accent: '#ffcf3a', hot: '#ff6a3d', soft: '#fff6dc' },
  },
  reveals: (s) => s.seen.size,
  guard: (s) => s.S.balls.filter((b) => !b.out).length,
  cleared: (s) => (s.phase === 'result' && s.ok ? { stage: s.stage, got: s.got, of: s.starOk.length } : null),
  wows: (s) => s.wowN,
  create(seed) {
    const rng = mulberry32(seed);
    const flips = STAGES.map((_, i) => i > 0 && rng() < 0.5);
    const jits = STAGES.map(() => Array.from({ length: 8 }, () => rng()));
    const s = {
      rng, seed, t: 0, stage: 0, flips, jits, phase: 'play', pt: 0, ok: false, why: '', hearts: 3, stars: 0, got: 0, starOk: [], pts: 0,
      dead: false, won: false, tries: 0, again: false, down: false, drawing: false, tip: null, drew: false, stageT: 0, dashT: -999,
      hard: new Map(), seen: new Set<string>(), news: null, banner: null, events: [], eid: 0, wowN: 0, waitT: 0, failKind: '',
    } as unknown as RollState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    const p = inp.pointer ?? null;
    const fresh = !!p && !s.down;
    s.down = !!p;
    const S = s.S;
    if (s.phase === 'play') {
      if (s.drawing) {
        if (p) {
          const q = toW(p);
          penMove(s.L, S, q.x, q.y);
          s.tip = q;
        } else release(s);
      } else if (fresh) {
        if (!S.moving && S.used < s.L.d.strokes && S.ink > 0.01) {
          const q = toW(p!);
          penDown(s.L, S, q.x, q.y);
          ev(s, 'pen', q.x, q.y, '쓱—');
          s.drawing = true;
          s.drew = true;
          s.tip = q;
          if (s.banner && s.t - s.banner.t > 20) s.banner = null;
        } else if (S.moving) ev(s, 'busy', toW(p!).x, toW(p!).y);
      }
      if (S.moving) {
        tick(s.L, S);
        const v = verdict(S);
        if (v === 1) endStage(s, true, '');
        else if (v === -1) endStage(s, false, '앗, 떨어졌다!', 'out');
        else if (v === 2) {
          S.moving = false;
          for (const b of S.balls) if (b.home < 0) (b.vx = 0), (b.vy = 0);
          if (S.used < s.L.d.strokes && S.ink > 0.03) {
            s.waitT = s.t;
            ev(s, 'rest', S.balls.find((b) => b.home < 0)!.x, S.balls.find((b) => b.home < 0)!.y - 0.1, '멈췄다! 한 번 더 그어요');
            see(s, 'rest', '✋ 공이 멈추면 한 번 더 그을 수 있어요');
          } else endStage(s, false, '멈춰 버렸어요…', 'stop');
        }
      }
    } else {
      if (S.moving) tick(s.L, S);
      s.pt++;
      const T = s.ok ? RESULT_OK : RESULT_FAIL;
      if (s.pt >= T || (fresh && s.pt > 50)) {
        if (s.ok) {
          if (s.won) s.dead = true;
          else (s.again = false), s.stage++, newStage(s);
        } else if (s.hearts <= 0) s.dead = true;
        else (s.again = true), newStage(s);
      }
    }
    if (s.news && s.t - s.news.t > 200) s.news = null;
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
const at = (x: number, y: number): Input => ({ tap: false, dir: 0, pointer: { x, y: y / A } });

function hashStr(str: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) (h ^= str.charCodeAt(i)), (h = Math.imul(h, 0x01000193));
  return h >>> 0;
}
/** 공 앞 바닥 높이에서 시작하는 점 */
function frontOf(L: Layout, S: Sim) {
  const b = S.balls.find((q) => q.home < 0 && !q.out) ?? S.balls[0];
  const dir = Math.sign(L.house.x - b.x) || L.dir;
  return { x: b.x + dir * 0.085, y: b.y + R + LT * 0.5, dir };
}
/** 공이 들어갈 문 앞 바닥 (양쪽 문 집은 공이 있는 쪽 문) */
function doorPt(L: Layout, bx = L.house.x - L.dir) {
  const side = L.house.two ? Math.sign(bx - L.house.x) || -1 : L.house.f;
  return { x: L.house.x + side * (HW + 0.07), y: L.house.y + LT * 0.5 };
}

/** 점 목록(화면 0~1 · y는 /A)을 MINSEG보다 넓게 고르게 */
function resample(pts: number[][], step: number): number[][] {
  const out: number[][] = [pts[0]];
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
    const d = Math.hypot(bx - ax, by - ay);
    acc += d;
    if (acc >= step || i === pts.length - 1) out.push([bx, by]), (acc = 0);
  }
  return out;
}
function catmull(ctrl: number[][], step = 0.04): number[][] {
  const P = [ctrl[0], ...ctrl, ctrl[ctrl.length - 1]];
  const raw: number[][] = [];
  for (let i = 1; i + 2 < P.length; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    const n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 0.01));
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      raw.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  raw.push(ctrl[ctrl.length - 1]);
  return resample(raw, step);
}
const clampPt = (p: number[]) => [Math.max(0.01, Math.min(0.99, p[0])), Math.max(0.16, Math.min(1.34, p[1]))];

interface Outcome { v: number; S: Sim }
/** 획 하나를 같은 물리로 끝까지 굴려 본다 (pts는 화면 좌표, y는 0~A) */
function trial(L: Layout, S0: Sim, pts: number[][], maxT = 60 * 9): Outcome | null {
  const S = cloneSim(S0);
  const ptr = pts.map((p) => toW({ x: p[0], y: p[1] / A }));
  penDown(L, S, ptr[0].x, ptr[0].y);
  for (let i = 1; i < ptr.length; i++) penMove(L, S, ptr[i].x, ptr[i].y);
  if (!penUp(L, S)) return null;
  dash(L, S);
  let v = 0;
  for (let t = 0; t < maxT && v === 0; t++) (tick(L, S), (v = verdict(S)));
  return { v: value(L, S, v === 0 ? 2 : v), S };
}
function value(L: Layout, S: Sim, v: number): number {
  const stars = S.stars.filter((q) => q.got >= 0).length;
  let dist = 0;
  for (const b of S.balls) if (b.home < 0) dist += Math.hypot(b.x - doorPt(L, b.x).x, b.y - doorPt(L, b.x).y);
  if (v === 1) return 30000 + goalsMet(L, S).filter(Boolean).length * 6000 + (S.ink / L.d.ink) * 800 - S.used * 50;
  if (v === -1) return -30000 + stars * 300 - dist * 1000;
  const left = L.d.strokes - S.used > 0 && S.ink > 0.05;
  const home = S.balls.filter((b) => b.home >= 0).length;
  return (left ? 4000 : -20000) + stars * 1500 + home * 3000 - dist * 4000 + S.ink * 300;
}

/** 후보 획 여럿(공 앞에서 · 아무 데서나)을 시뮬레이션해 가장 좋은 것을 고른다. 같은 상태 → 같은 계획(봇 rng 안 씀) */
const planCache = new Map<string, number[][]>();
function planKey(s: RollState) {
  const S = s.S;
  return `${s.seed}|${s.stage}|${s.tries}|${S.used}|${S.balls.map((b) => `${b.x.toFixed(5)},${b.y.toFixed(5)}`).join(';')}`;
}
/** 길이 지나야 할 곳(공 가운데가 지나도록 선은 그 아래) · 끝낼 곳(공이 날아가거나 떨어질 자리) */
function anchors(L: Layout, S: Sim): { via: number[][]; ends: number[][] } {
  const dp = doorPt(L, frontOf(L, S).x), via: number[][] = [], ends: number[][] = [[dp.x, dp.y]];
  for (const q of S.stars) if (q.got < 0) via.push([q.x, q.y + R + LT]);
  if (L.btn) for (const k of [0.1, 0.2, 0.3]) ends.push([L.house.x + L.dir * (HW + k), L.house.y - 0.25 - k]);
  if (L.spring) {
    const c = (L.spring.x0 + L.spring.x1) / 2;
    for (const h of [0.12, 0.22, 0.35]) ends.push([c - L.dir * h * 0.7, L.spring.y - h]);
  }
  if (L.wind) for (const h of [0.08, 0.25, 0.45]) ends.push([L.dir > 0 ? L.wind.x0 - 0.01 : L.wind.x1 + 0.01, L.wind.y1 - h]);
  if (L.loop) ends.push([L.loop.x - L.dir * (L.loop.r + 0.03), L.loop.y + L.loop.r - 0.001]);
  return { via, ends };
}
/** 부드러운 미끄럼틀 한 토막: p에서 a0 방향으로 나가 q에 a1 방향으로 들어가는 3차 베지어 (각도는 진행 방향 기준, +는 아래) */
function slide(p: number[], q: number[], a0: number, a1: number, l0: number, l1: number, dir: number): number[][] {
  const c1 = [p[0] + Math.cos(a0) * l0 * dir, p[1] + Math.sin(a0) * l0], c2 = [q[0] - Math.cos(a1) * l1 * dir, q[1] - Math.sin(a1) * l1];
  const out: number[][] = [];
  const n = Math.max(4, Math.ceil((Math.hypot(q[0] - p[0], q[1] - p[1]) + l0 + l1) / 0.012));
  for (let k = 0; k <= n; k++) {
    const t = k / n, u = 1 - t;
    out.push([u * u * u * p[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * q[0], u * u * u * p[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * q[1]]);
  }
  return out;
}
/** 선을 안 그으면 공이 떨어지는 길 (받아 주는 선을 놓을 자리) */
function fallPath(L: Layout, S0: Sim): number[][] {
  const S = cloneSim(S0);
  dash(L, S);
  const out: number[][] = [];
  for (let t = 0; t < 90 && verdict(S) === 0; t++) {
    tick(L, S);
    const b = S.balls.find((q) => q.home < 0) ?? S.balls[0];
    if (t % 3 === 2) out.push([b.x, b.y, b.vx, b.vy, b.air]);
  }
  return out;
}
interface Cand { v: number; pts: number[][]; par: number[] }
function plan(s: RollState): number[][] {
  const key = planKey(s);
  const hit = planCache.get(key);
  if (hit) return hit;
  const L = s.L, S = s.S, rng = mulberry32(hashStr(key));
  const f = frontOf(L, S), an = anchors(L, S), fall = fallPath(L, S).filter((q) => q[4] > 2);
  const cands: Cand[] = [];
  const rr = (a: number, b: number) => a + rng() * (b - a);
  const pick = <T,>(a: T[]) => a[Math.floor(rng() * a.length)];
  const D = f.dir;
  /** par: [종류, 시작 i, 끝 i, a0, a1, l0, l1, 지날 곳 i, 지날 각, 흔들 x, 흔들 y, 끝 x, 끝 y] → 점 목록 */
  const build = (par: number[]): number[][] | null => {
    const [kind, si, , a0, a1, l0, l1, vi, av, jx, jy, ex, ey] = par;
    let P0: number[], A0 = a0;
    if (kind === 1) {
      const q = fall[Math.min(fall.length - 1, Math.floor(si))];
      if (!q) return null;
      const sp = Math.hypot(q[2], q[3]) || 1, nx = (-q[3] / sp) * -D, ny = (q[2] / sp) * D;
      // 공이 떨어지는 길 바로 아래·앞에서, 떨어지는 방향으로 받아 준다
      P0 = [q[0] + (q[2] / sp) * 0.05 + nx * (R + LT + 0.004) * (ny > 0 ? 1 : -1), q[1] + (q[3] / sp) * 0.05 + Math.abs(ny) * (R + LT + 0.004)];
      A0 = Math.atan2(q[3], Math.abs(q[2]) + 1e-6);
    } else P0 = [f.x, f.y];
    const E = [ex + jx, ey + jy];
    let raw: number[][];
    if (vi >= 0 && an.via[vi]) {
      const V = an.via[vi];
      raw = [...slide(P0, V, A0, av, l0, 0.08, D), ...slide(V, E, av, a1, 0.08, l1, D).slice(1)];
    } else raw = slide(P0, E, A0, a1, l0, l1, D);
    const pts = resample(raw.map(clampPt), 0.035);
    return pts.length >= 3 ? pts : null;
  };
  const tryPar = (par: number[]) => {
    const pts = build(par);
    if (!pts) return;
    const o = trial(L, S, pts);
    if (o) cands.push({ v: o.v, pts, par });
  };
  const randPar = (): number[] => {
    const kind = fall.length && rng() < 0.35 ? 1 : 0;
    const E = rng() < 0.85 ? pick(an.ends) : [rr(0.1, 0.9), rr(0.4, 1.3)];
    const vi = an.via.length && rng() < 0.55 ? Math.floor(rng() * an.via.length) : -1;
    const a1 = rng() < 0.35 ? rr(-1.1, -0.2) : rr(-0.2, 0.9);
    return [kind, rr(0, fall.length), 0, rr(0.15, 1.3), a1, rr(0.05, 0.45), rr(0.05, 0.4), vi, rr(-0.5, 0.5), rr(-0.05, 0.05), rr(-0.05, 0.05), E[0], E[1]];
  };
  const live = S.balls.filter((b) => b.home < 0 && !b.out);
  if (L.house.two && live.length === 2) {
    // 쌍둥이: 한쪽 공 → 그쪽 문 → 집 바닥 → 다른 쪽 문 → 다른 공 (한 줄)
    const half = (b: Ball, a0: number, a1: number, l0: number, l1: number, jx: number) => {
      const d = Math.sign(L.house.x - b.x), dp = doorPt(L, b.x);
      return slide([b.x + d * 0.085, b.y + R + LT * 0.5], [dp.x + jx * d, dp.y], a0, a1, l0, l1, d);
    };
    const twin = (par: number[]) => {
      const raw = [...half(live[0], par[0], par[1], par[2], par[3], par[4]), ...half(live[1], par[5], par[6], par[7], par[8], par[9]).reverse()];
      const pts = resample(raw.map(clampPt), 0.035);
      const o = trial(L, S, pts);
      if (o) cands.push({ v: o.v, pts, par: [-1, ...par] });
    };
    const rp = () => [rr(0.1, 1.2), rr(-0.4, 0.5), rr(0.05, 0.45), rr(0.05, 0.4), rr(-0.04, 0.06)];
    for (let i = 0; i < 50; i++) twin([...rp(), ...rp()]);
    cands.sort((a, b) => b.v - a.v);
    for (const c of cands.slice(0, 4)) for (let j = 0; j < 8; j++) twin(c.par.slice(1).map((x, k) => x + rr(-1, 1) * [0.15, 0.15, 0.06, 0.06, 0.02][k % 5]));
  } else
    // 집에 들어가는 후보가 나올 때까지 (최대 세 번) 더 찾아본다
    for (let round = 0; round < 3 && !cands.some((c) => c.v >= 30000); round++) for (let i = 0; i < 70; i++) tryPar(randPar());
  cands.sort((a, b) => b.v - a.v);
  const SC = [0, 3, 0, 0.15, 0.2, 0.06, 0.06, 0, 0.15, 0.03, 0.03, 0, 0];
  for (const c of cands.filter((q) => q.par[0] >= 0).slice(0, 6))
    for (let j = 0; j < 9; j++) tryPar(c.par.map((x, k) => (k === 0 || k === 7 ? x : x + rr(-1, 1) * SC[k])));
  cands.sort((a, b) => b.v - a.v);
  const best = cands[0]?.pts ?? [[f.x, f.y], [f.x + D * 0.12, f.y + 0.05], [f.x + D * 0.24, f.y + 0.1]];
  planCache.set(key, best);
  return best;
}

interface Pen { key: string; pts: number[][]; i: number }
const penMem = new WeakMap<object, Pen>();
/** 정해 둔 점을 하나씩 짚으며 긋고, 다 짚으면 뗀다 */
function drive(s: RollState, make: () => number[][]): Input {
  if (s.phase !== 'play' || s.S.moving) return NO;
  const key = `${s.stage}|${s.tries}|${s.S.used}`;
  let m = penMem.get(s);
  if (!m || m.key !== key) {
    if (s.down || s.drawing) return NO;
    if (s.t - s.waitT < 8 || s.t - s.stageT < 8) return NO;
    penMem.set(s, (m = { key, pts: make(), i: 0 }));
  }
  if (m.i < m.pts.length) {
    const p = m.pts[m.i++];
    return at(p[0], p[1]);
  }
  return NO;
}
export const drawrollSmart: Bot<RollState> = { name: '길 설계사', act: (s) => drive(s, () => plan(s)) };

/** 버릇 봇: 늘 공에서 집 문까지 곧은 선 하나 */
export const drawrollHabit: Bot<RollState> = {
  name: '늘 집까지 곧은 선',
  act: (s) =>
    drive(s, () => {
      const f = frontOf(s.L, s.S), dp = doorPt(s.L, f.x);
      return resample([[f.x, f.y], [dp.x, dp.y]].flatMap((p, i, a) => (i ? Array.from({ length: 20 }, (_, k) => [a[0][0] + ((p[0] - a[0][0]) * (k + 1)) / 20, a[0][1] + ((p[1] - a[0][1]) * (k + 1)) / 20]) : [p])), 0.04);
    }),
};
/** 독립 버릇 봇: 늘 공에서 집 문까지 아래로 볼록한 곡선 하나 */
export const drawrollHabit2: Bot<RollState> = {
  name: '늘 아래로 볼록한 곡선',
  act: (s) =>
    drive(s, () => {
      const f = frontOf(s.L, s.S), dp = doorPt(s.L, f.x), sag = 0.3 * Math.hypot(dp.x - f.x, dp.y - f.y);
      const cx = (f.x + dp.x) / 2, cy = (f.y + dp.y) / 2 + sag * 2;
      const pts: number[][] = [];
      for (let k = 0; k <= 40; k++) {
        const t = k / 40;
        pts.push([(1 - t) ** 2 * f.x + 2 * (1 - t) * t * cx + t * t * dp.x, Math.min(1.34, (1 - t) ** 2 * f.y + 2 * (1 - t) * t * cy + t * t * dp.y)]);
      }
      return resample(pts, 0.04);
    }),
};

const dumbMem = new WeakMap<object, { next: number; left: number; x: number; y: number; a: number; da: number; v: number }>();
/** 못하는 봇: 아무 데서나 아무 방향으로 아무렇게나 한 획 */
export const drawrollRandom: Bot<RollState> = {
  name: '아무렇게나 쓱',
  act(s, rng) {
    let m = dumbMem.get(s);
    if (!m) dumbMem.set(s, (m = { next: s.t + 20 + Math.floor(rng() * 50), left: 0, x: 0, y: 0, a: 0, da: 0, v: 0 }));
    if (m.left > 0) {
      m.left--;
      if (m.left === 0) return (m.next = s.t + 20 + Math.floor(rng() * 70)), NO;
      m.a += m.da;
      m.x = Math.max(0.01, Math.min(0.99, m.x + Math.cos(m.a) * m.v));
      m.y = Math.max(0.12, Math.min(1.4, m.y + Math.sin(m.a) * m.v));
      return at(m.x, m.y);
    }
    if (s.t < m.next) return NO;
    m.x = 0.05 + rng() * 0.9;
    m.y = 0.25 + rng() * 1.05;
    m.a = rng() * Math.PI * 2;
    m.da = (rng() - 0.5) * 0.12;
    m.v = 0.008 + rng() * 0.02;
    m.left = 8 + Math.floor(rng() * 40);
    return at(m.x, m.y);
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
type C2 = CanvasRenderingContext2D;
const TAU = Math.PI * 2;
const OUT = '#5a3a1e';
const hsh = (k: number) => {
  const v = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
function ell(ctx: C2, x: number, y: number, rx: number, ry: number, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
}
function rr(ctx: C2, x: number, y: number, w: number, h: number, r: number) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function lin(ctx: C2, x0: number, y0: number, x1: number, y1: number, ...st: [number, string][]) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of st) g.addColorStop(o, c);
  return g;
}
function rad(ctx: C2, x: number, y: number, r0: number, r1: number, ...st: [number, string][]) {
  const g = ctx.createRadialGradient(x, y, Math.max(0, r0), x, y, Math.max(0.1, r1));
  for (const [o, c] of st) g.addColorStop(o, c);
  return g;
}
function starPath(ctx: C2, x: number, y: number, r: number, rot = -Math.PI / 2) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = rot + (k * Math.PI) / 5, q = k % 2 ? r * 0.46 : r;
    k ? ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q) : ctx.moveTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
  }
  ctx.closePath();
}
function heartPath(ctx: C2, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.9);
  ctx.bezierCurveTo(x - r * 1.6, y - r * 0.1, x - r * 0.9, y - r * 1.25, x, y - r * 0.45);
  ctx.bezierCurveTo(x + r * 0.9, y - r * 1.25, x + r * 1.6, y - r * 0.1, x, y + r * 0.9);
  ctx.closePath();
}

/** 화면 연출만의 기억 (시뮬레이션과 무관) */
interface Look {
  ev: number;
  springT: number;
  btnT: number;
  birdT: number;
  birdMood: number;
  trail: number[][];
  pv: { key: string; pts: number[][] } | null;
  flying: { x: number; y: number; t: number }[];
  hardDone: Map<number, number>;
  gateT: number;
}
const LOOKS = new WeakMap<object, Look>();
function lookOf(s: RollState): Look {
  let l = LOOKS.get(s);
  if (!l) LOOKS.set(s, (l = { ev: 0, springT: -999, btnT: -999, birdT: -999, birdMood: 0, trail: [], pv: null, flying: [], hardDone: new Map(), gateT: -999 }));
  return l;
}

function drawAll(ctx: C2, s: RollState, w: number, h: number, th: Theme) {
  void th;
  const fx = juice(s), look = lookOf(s);
  const L = s.L, S = s.S, t = s.t;
  const X = (x: number) => x * w, Y = (y: number) => y * w, R2 = (r: number) => r * w;
  ctx.save();
  fx.begin(ctx);
  drawSky(ctx, w, h, t);
  drawRiver(ctx, w, Y, t);
  if (L.wind) drawWind(ctx, L, X, Y, R2, t);
  for (const b of L.blocks) drawBlockShadow(ctx, b, X, Y, R2);
  if (L.ground) drawGround(ctx, L.ground, X, Y, R2, t);
  for (const b of L.blocks) drawBlock(ctx, b, X, Y, R2, t);
  if (L.loop) drawLoop(ctx, L, X, Y, R2, t, S.loopPh);
  if (L.spring) drawSpring(ctx, L, X, Y, R2, t - look.springT);
  if (L.btn) drawButton(ctx, L, X, Y, R2, S.gateOpen, t - look.btnT);
  for (const p of L.pads) drawPad(ctx, p, X, Y, R2, t, s.dashT >= 0 && S.dashes > 0 ? t - s.dashT : -1, L);
  // 집 안으로 들어간 공은 집 앞면보다 먼저 (가려지게)
  for (const b of S.balls) if (b.home >= 0) drawBall(ctx, s, b, X, Y, R2, t, look);
  drawHouse(ctx, s, X, Y, R2, t, look);
  drawStars(ctx, S, X, Y, R2, t);
  drawLines(ctx, s, X, Y, R2, t, fx, look);
  if (s.drawing) drawPreview(ctx, s, X, Y, R2, look);
  for (const b of S.balls) if (b.home < 0) drawBall(ctx, s, b, X, Y, R2, t, look);
  drawBird(ctx, s, X, Y, R2, t, look);
  if (s.phase === 'play' && !s.drawing && S.dashes === 0) {
    if (s.stage === 0 && !s.drew) drawDemo(ctx, s, X, Y, R2, w, t);
    else if (L.spot && !s.again && t - s.stageT < 280) drawSpot(ctx, L, X, Y, R2, w, t - s.stageT);
  }
  if (s.drawing && s.tip) {
    // 크레용 끝 반짝이
    if (t % 3 === 0) fx.burst(X(s.tip.x), Y(s.tip.y), t % 6 ? '#fff27a' : '#ffffff', 2, 1.6, 2);
  }
  handleEvents(s, fx, look, X, Y);
  ctx.restore();
  drawHud(ctx, s, w, h, X, Y, R2, t, fx, look);
}

// ── 하늘·언덕·강 ──
function drawSky(ctx: C2, w: number, h: number, t: number) {
  ctx.fillStyle = lin(ctx, 0, 0, 0, h, [0, '#5fc2ff'], [0.45, '#9fdcff'], [0.8, '#d8f4ff'], [1, '#eafaff']);
  ctx.fillRect(0, 0, w, h);
  // 해
  const sx = w * 0.5, sy = w * 0.24;
  ctx.fillStyle = rad(ctx, sx, sy, 0, w * 0.3, [0, 'rgba(255,248,200,.85)'], [1, 'rgba(255,248,200,0)']);
  ctx.fillRect(sx - w * 0.3, sy - w * 0.3, w * 0.6, w * 0.6);
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(t * 0.004);
  ctx.fillStyle = 'rgba(255,240,150,.28)';
  for (let k = 0; k < 12; k++) {
    ctx.rotate(TAU / 12);
    ctx.beginPath();
    ctx.moveTo(w * 0.07, -w * 0.012);
    ctx.lineTo(w * 0.16, 0);
    ctx.lineTo(w * 0.07, w * 0.012);
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = rad(ctx, sx - w * 0.012, sy - w * 0.012, 0, w * 0.05, [0, '#fffbe0'], [1, '#ffd84a']);
  ell(ctx, sx, sy, w * 0.045, w * 0.045);
  ctx.fill();
  // 구름 (천천히 흐른다)
  for (let k = 0; k < 5; k++) {
    const cw = w * (0.2 + hsh(k) * 0.12), sp = 0.05 + hsh(k + 9) * 0.07;
    const x = ((hsh(k + 3) * (w + cw * 2) + t * sp) % (w + cw * 2)) - cw, y = w * (0.2 + hsh(k + 5) * 0.55);
    cloud(ctx, x, y, cw);
  }
  // 먼 언덕 · 풍차 · 가까운 언덕
  hill(ctx, w, w * 1.0, w * 0.1, '#bfe9c8', '#a7dcb4', 1.3, 0.8);
  const mx = w * 0.78, my = w * 0.86;
  ctx.fillStyle = '#e9f3f0';
  ctx.beginPath();
  ctx.moveTo(mx - w * 0.025, my + w * 0.12);
  ctx.lineTo(mx - w * 0.012, my);
  ctx.lineTo(mx + w * 0.012, my);
  ctx.lineTo(mx + w * 0.025, my + w * 0.12);
  ctx.fill();
  ctx.save();
  ctx.translate(mx, my);
  ctx.rotate(t * 0.02);
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#b6c9c4';
  ctx.lineWidth = 1;
  for (let k = 0; k < 4; k++) {
    ctx.rotate(TAU / 4);
    ctx.fillRect(-w * 0.004, 0, w * 0.012, w * 0.07);
    ctx.strokeRect(-w * 0.004, 0, w * 0.012, w * 0.07);
  }
  ctx.restore();
  hill(ctx, w, w * 1.12, w * 0.12, '#9edb8a', '#86cc72', 2.1, 2.3);
  // 작은 나무들
  for (let k = 0; k < 6; k++) {
    const x = w * (0.08 + k * 0.17 + hsh(k + 30) * 0.05), y = w * (1.1 + Math.sin(k * 2.1 + 2.3) * 0.05);
    ctx.fillStyle = '#8a6a4a';
    ctx.fillRect(x - 1.5, y - w * 0.02, 3, w * 0.03);
    ctx.fillStyle = k % 2 ? '#6fc25a' : '#7fd068';
    ell(ctx, x, y - w * 0.035, w * 0.022, w * 0.028);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.25)';
    ell(ctx, x - w * 0.007, y - w * 0.045, w * 0.008, w * 0.01);
    ctx.fill();
  }
}
function cloud(ctx: C2, x: number, y: number, cw: number) {
  ctx.fillStyle = 'rgba(160,200,230,.35)';
  for (const [dx, dy, r] of [[0.2, 0.12, 0.2], [0.45, 0.06, 0.27], [0.7, 0.13, 0.2]]) (ell(ctx, x + dx * cw, y + dy * cw + cw * 0.04, r * cw, r * cw * 0.8), ctx.fill());
  ctx.fillStyle = '#ffffff';
  for (const [dx, dy, r] of [[0.2, 0.12, 0.2], [0.45, 0.04, 0.27], [0.7, 0.12, 0.2], [0.35, 0.16, 0.18], [0.58, 0.17, 0.18]]) (ell(ctx, x + dx * cw, y + dy * cw, r * cw, r * cw * 0.78), ctx.fill());
}
function hill(ctx: C2, w: number, base: number, amp: number, c0: string, c1: string, f: number, ph: number) {
  ctx.fillStyle = lin(ctx, 0, base - amp, 0, base + amp * 2, [0, c0], [1, c1]);
  ctx.beginPath();
  ctx.moveTo(0, w * 2);
  for (let k = 0; k <= 24; k++) ctx.lineTo((k / 24) * w, base - amp * (0.5 + 0.5 * Math.sin((k / 24) * Math.PI * f + ph)));
  ctx.lineTo(w, w * 2);
  ctx.fill();
}
function drawRiver(ctx: C2, w: number, Y: (y: number) => number, t: number) {
  const y0 = Y(RIVER - 0.01);
  ctx.fillStyle = lin(ctx, 0, y0, 0, Y(1.5), [0, '#5fd0f5'], [1, '#2f95d8']);
  ctx.fillRect(0, y0, w, Y(1.6) - y0);
  ctx.strokeStyle = 'rgba(255,255,255,.55)';
  ctx.lineWidth = 2;
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    const yy = y0 + 4 + k * 7;
    for (let x = 0; x <= w; x += 6) {
      const v = yy + Math.sin(x * 0.06 + t * 0.06 + k * 2) * 1.6;
      x ? ctx.lineTo(x, v) : ctx.moveTo(x, v);
    }
    ctx.globalAlpha = 0.6 - k * 0.15;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(255,255,255,.8)';
  for (let k = 0; k < 7; k++) {
    const x = ((hsh(k + 50) * w + t * (0.25 + hsh(k) * 0.3)) % w), a = 0.5 + 0.5 * Math.sin(t * 0.1 + k * 3);
    ctx.globalAlpha = a;
    ctx.fillRect(x, y0 + 6 + hsh(k + 7) * 14, 3, 1.5);
  }
  ctx.globalAlpha = 1;
}

// ── 땅 ──
function drawBlockShadow(ctx: C2, b: Block, X: (x: number) => number, Y: (y: number) => number, R2: (r: number) => number) {
  ctx.fillStyle = 'rgba(40,70,110,.16)';
  ctx.fillRect(X(b.x0) + R2(0.018), Y(b.y0) + R2(0.03), X(b.x1) - X(b.x0), Y(Math.min(1.6, b.y1)) - Y(b.y0));
}
function drawBlock(ctx: C2, b: Block, X: (x: number) => number, Y: (y: number) => number, R2: (r: number) => number, t: number) {
  const x0 = X(b.x0), x1 = X(b.x1), y0 = Y(b.y0), y1 = Y(Math.min(1.6, b.y1)), dp = R2(0.022);
  if (b.kind === WOOD) {
    // 나무 기둥: 세로 판자 + 윗판
    ctx.fillStyle = lin(ctx, x0, 0, x1, 0, [0, '#c98446'], [0.5, '#e6a862'], [1, '#b8733a']);
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.strokeStyle = 'rgba(110,60,20,.45)';
    ctx.lineWidth = 1.2;
    const n = Math.max(2, Math.round((x1 - x0) / R2(0.04)));
    for (let k = 1; k < n; k++) (ctx.beginPath(), ctx.moveTo(x0 + ((x1 - x0) * k) / n, y0), ctx.lineTo(x0 + ((x1 - x0) * k) / n, y1), ctx.stroke());
    ctx.fillStyle = 'rgba(90,50,20,.55)';
    for (let k = 0; k < n; k++) for (let j = 0; j < 4; j++) (ell(ctx, x0 + ((x1 - x0) * (k + 0.5)) / n, y0 + R2(0.03 + j * 0.09), 1.3, 1.3), ctx.fill());
    ctx.fillStyle = '#f6c98c';
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0 + dp * 0.6, y0 - dp * 0.7);
    ctx.lineTo(x1 + dp * 0.6, y0 - dp * 0.7);
    ctx.lineTo(x1, y0);
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
    return;
  }
  // 풀 덮인 흙 절벽
  ctx.fillStyle = lin(ctx, 0, y0, 0, y1, [0, '#e2a468'], [0.5, '#c98a52'], [1, '#a46a3a']);
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, x1 - x0, y1 - y0);
  ctx.clip();
  ctx.strokeStyle = 'rgba(120,70,30,.35)';
  ctx.lineWidth = 2;
  for (let k = 1; k < 12; k++) {
    const yy = y0 + R2(0.09) * k;
    if (yy > y1) break;
    ctx.beginPath();
    for (let x = x0; x <= x1 + 4; x += 6) {
      const v = yy + Math.sin(x * 0.08 + k) * 2;
      x === x0 ? ctx.moveTo(x, v) : ctx.lineTo(x, v);
    }
    ctx.stroke();
  }
  for (let k = 0; k < 14; k++) {
    const px = x0 + hsh(k + b.x0 * 91) * (x1 - x0), py = y0 + R2(0.06) + hsh(k + 3 + b.y0 * 37) * (y1 - y0);
    ctx.fillStyle = k % 3 ? 'rgba(255,230,190,.45)' : 'rgba(120,80,50,.4)';
    ell(ctx, px, py, R2(0.008 + hsh(k) * 0.008), R2(0.006 + hsh(k) * 0.005));
    ctx.fill();
  }
  ctx.restore();
  // 아래로 갈수록 어둡게 · 풀 끝에 늘어진 덩굴
  ctx.fillStyle = lin(ctx, 0, y0, 0, y1, [0, 'rgba(60,30,10,0)'], [1, 'rgba(60,30,10,.28)']);
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  ctx.fillStyle = 'rgba(255,240,210,.18)';
  ctx.fillRect(x0, y0, Math.min(R2(0.025), x1 - x0), y1 - y0);
  ctx.strokeStyle = '#4fa83a';
  ctx.lineWidth = 2;
  for (let k = 0; k < Math.max(1, Math.floor((x1 - x0) / R2(0.12))); k++) {
    const vx = x0 + R2(0.03) + k * R2(0.12) + hsh(k + b.y0 * 7) * R2(0.05), len = R2(0.05 + hsh(k + 2 + b.x0) * 0.08);
    if (vx > x1 - 4) break;
    ctx.beginPath();
    ctx.moveTo(vx, y0 + R2(0.02));
    ctx.quadraticCurveTo(vx + Math.sin(t * 0.03 + k) * 3, y0 + len * 0.6, vx + 2, y0 + len);
    ctx.stroke();
    ctx.fillStyle = '#5fbe45';
    for (let j = 1; j < 4; j++) (ell(ctx, vx + (j % 2 ? 3 : -3), y0 + R2(0.02) + (len * j) / 4, 2.6, 1.6, j % 2 ? 0.5 : -0.5), ctx.fill());
  }
  // 윗면 (3/4으로 보이는 풀밭)
  ctx.fillStyle = '#b6ef7e';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x0 + dp * 0.6, y0 - dp * 0.75);
  ctx.lineTo(x1 + dp * 0.6, y0 - dp * 0.75);
  ctx.lineTo(x1, y0);
  ctx.fill();
  ctx.fillStyle = lin(ctx, 0, y0 - 2, 0, y0 + R2(0.035), [0, '#7fd64e'], [1, '#56b03a']);
  rr(ctx, x0 - 2, y0 - 2, x1 - x0 + 4, R2(0.035), R2(0.012));
  ctx.fill();
  // 풀잎·꽃
  ctx.fillStyle = '#5cb83c';
  for (let x = x0 + 3; x < x1 - 2; x += 7) {
    const hgt = R2(0.012) * (0.6 + hsh(x * 0.37) * 0.8), sw = Math.sin(t * 0.05 + x * 0.1) * 1.2;
    ctx.beginPath();
    ctx.moveTo(x - 2, y0);
    ctx.lineTo(x + sw, y0 - hgt);
    ctx.lineTo(x + 2, y0);
    ctx.fill();
  }
  for (let k = 0; k < Math.floor((x1 - x0) / R2(0.09)); k++) {
    const px = x0 + R2(0.04) + k * R2(0.09) + hsh(k + b.x0 * 13) * R2(0.03), py = y0 - R2(0.006);
    ctx.fillStyle = ['#ff8fb8', '#fff27a', '#ffffff'][k % 3];
    for (let j = 0; j < 5; j++) (ell(ctx, px + Math.cos((j * TAU) / 5) * 2.2, py + Math.sin((j * TAU) / 5) * 2.2, 1.8, 1.8), ctx.fill());
    ctx.fillStyle = '#ffb02e';
    ell(ctx, px, py, 1.4, 1.4);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(90,50,20,.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x0, y0 + R2(0.03));
  ctx.lineTo(x0, y1);
  ctx.moveTo(x1, y0 + R2(0.03));
  ctx.lineTo(x1, y1);
  ctx.stroke();
}
function drawGround(ctx: C2, g: number[][], X: (x: number) => number, Y: (y: number) => number, R2: (r: number) => number, t: number) {
  ctx.fillStyle = lin(ctx, 0, Y(1.0), 0, Y(1.5), [0, '#d9a066'], [1, '#a46a3a']);
  ctx.beginPath();
  ctx.moveTo(X(g[0][0]), Y(1.6));
  for (const [x, y] of g) ctx.lineTo(X(x), Y(y));
  ctx.lineTo(X(g[g.length - 1][0]), Y(1.6));
  ctx.fill();
  ctx.strokeStyle = '#5cb83c';
  ctx.lineWidth = R2(0.03);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  g.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y) + R2(0.012)) : ctx.moveTo(X(x), Y(y) + R2(0.012))));
  ctx.stroke();
  ctx.strokeStyle = '#86dc5a';
  ctx.lineWidth = R2(0.012);
  ctx.beginPath();
  g.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y) + R2(0.004)) : ctx.moveTo(X(x), Y(y) + R2(0.004))));
  ctx.stroke();
  ctx.fillStyle = '#5cb83c';
  for (let i = 0; i + 1 < g.length; i++) {
    const [ax, ay] = g[i], [bx, by] = g[i + 1], n = Math.floor(((bx - ax) * 1) / 0.02);
    for (let k = 0; k < n; k++) {
      const u = k / n, x = X(ax + (bx - ax) * u), y = Y(ay + (by - ay) * u), sw = Math.sin(t * 0.05 + x * 0.1);
      ctx.beginPath();
      ctx.moveTo(x - 2, y);
      ctx.lineTo(x + sw, y - R2(0.012) * (0.6 + hsh(x) * 0.7));
      ctx.lineTo(x + 2, y);
      ctx.fill();
    }
  }
}

// ── 장치 ──
function drawPad(ctx: C2, p: { x: number; y: number; f: number }, X: (x: number) => number, Y: (y: number) => number, R2: (r: number) => number, t: number, since: number, L: Layout) {
  void L;
  const lip = p.x + p.f * 0.03, back = p.x - p.f * 0.095;
  // 깃발 기둥 (뒤쪽 벽)
  ctx.strokeStyle = '#7a4a1e';
  ctx.lineWidth = R2(0.012);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(X(back), Y(p.y));
  ctx.lineTo(X(back), Y(p.y - 0.17));
  ctx.stroke();
  const wv = Math.sin(t * 0.12) * R2(0.01);
  ctx.fillStyle = '#ff5a5a';
  ctx.beginPath();
  ctx.moveTo(X(back), Y(p.y - 0.17));
  ctx.quadraticCurveTo(X(back + p.f * 0.05), Y(p.y - 0.165) + wv, X(back + p.f * 0.09), Y(p.y - 0.15) + wv);
  ctx.lineTo(X(back), Y(p.y - 0.12));
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${Math.max(9, R2(0.026))}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('출발', X(back + p.f * 0.04), Y(p.y - 0.148) + wv * 0.5);
  // 나무 발판
  ctx.fillStyle = '#e8a862';
  rr(ctx, Math.min(X(back), X(lip)), Y(p.y) - R2(0.01), Math.abs(X(lip) - X(back)), R2(0.016), 3);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // 출발 문: 떼기 전엔 세워져 있다가 떼면 탁 넘어간다
  const ang = since < 0 ? 0 : Math.min(1, since / 8) * (Math.PI / 2) * p.f;
  ctx.save();
  ctx.translate(X(lip), Y(p.y));
  ctx.rotate(ang);
  ctx.fillStyle = '#ffd23a';
  rr(ctx, -R2(0.007), -R2(0.075), R2(0.014), R2(0.075), 3);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = '#ff5a5a';
  for (let k = 0; k < 3; k++) ctx.fillRect(-R2(0.007), -R2(0.065) + k * R2(0.022), R2(0.014), R2(0.008));
  ctx.restore();
}
function drawSpring(ctx: C2, L: Layout, X: (x: number) => number, Y: (y: number) => number, R2: (r: number) => number, age: number) {
  const sp = L.spring!;
  const squash = age >= 0 && age < 18 ? Math.sin((age / 18) * Math.PI) * (1 - age / 18) : 0;
  const top = Y(sp.y) - R2(0.012) + squash * R2(0.035) * (age < 4 ? 1 : -0.6);
  const bot = Y(sp.y + 0.024);
  // 용수철 감긴 줄
  ctx.strokeStyle = '#e23a3a';
  ctx.lineWidth = R2(0.008);
  ctx.beginPath();
  const n = 6, cx0 = X(sp.x0) + R2(0.015), cx1 = X(sp.x1) - R2(0.015);
  for (let k = 0; k <= n; k++) {
    const y = bot + ((top - bot) * k) / n;
    k % 2 ? ctx.lineTo(cx1, y) : k ? ctx.lineTo(cx0, y) : ctx.moveTo(cx0, y);
  }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.7)';
  ctx.lineWidth = R2(0.003);
  ctx.stroke();
  // 윗판
  ctx.fillStyle = lin(ctx, 0, top - R2(0.012), 0, top + R2(0.008), [0, '#fff27a'], [1, '#f2a91c']);
  rr(ctx, X(sp.x0), top - R2(0.012), X(sp.x1) - X(sp.x0), R2(0.018), 4);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#ff5a5a';
  for (let k = 0; k < 3; k++) ctx.fillRect(X(sp.x0) + R2(0.02) + k * R2(0.04), top - R2(0.008), R2(0.018), R2(0.006));
}
function drawButton(ctx: C2, L: Layout, X: (x: number) => number, Y: (y: number) => number, R2: (r: number) => number, open: boolean, age: number) {
  const b = L.btn!;
  // 기둥 + 단추
  ctx.fillStyle = '#9aa3ad';
  ctx.fillRect(X(b.x) - R2(0.008), Y(b.y), R2(0.016), R2(0.12));
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.2;
  ctx.strokeRect(X(b.x) - R2(0.008), Y(b.y), R2(0.016), R2(0.12));
  ctx.fillStyle = '#7a8590';
  rr(ctx, X(b.x) - R2(0.04), Y(b.y) - R2(0.012), R2(0.08), R2(0.02), 4);
  ctx.fill();
  ctx.stroke();
  const press = open ? 0.6 : 0, pulse = open ? 0 : 0.5 + 0.5 * Math.sin(age * 0.15);
  if (!open) {
    ctx.fillStyle = `rgba(255,90,90,${0.25 * pulse})`;
    ell(ctx, X(b.x), Y(b.y) - R2(0.02), R2(0.06), R2(0.05));
    ctx.fill();
  }
  ctx.fillStyle = open ? lin(ctx, 0, Y(b.y) - R2(0.04), 0, Y(b.y), [0, '#9dff8a'], [1, '#2fb84a']) : lin(ctx, 0, Y(b.y) - R2(0.04), 0, Y(b.y), [0, '#ff9a8a'], [1, '#e2233a']);
  ctx.beginPath();
  ctx.ellipse(X(b.x), Y(b.y) - R2(0.012), R2(0.032), R2(0.03 * (1 - press)), 0, Math.PI, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  ell(ctx, X(b.x) - R2(0.012), Y(b.y) - R2(0.03 * (1 - press)), R2(0.008), R2(0.005));
  ctx.fill();
}
function drawWind(ctx: C2, L: Layout, X: (x: number) => number, Y: (y: number) => number, R2: (r: number) => number, t: number) {
  const w = L.wind!, x0 = X(w.x0), x1 = X(w.x1), y0 = Y(w.y0), y1 = Y(w.y1);
  ctx.fillStyle = lin(ctx, 0, y0, 0, y1, [0, 'rgba(190,255,235,0)'], [0.25, 'rgba(190,255,235,.28)'], [1, 'rgba(170,250,225,.45)']);
  rr(ctx, x0, y0, x1 - x0, y1 - y0, R2(0.03));
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.55)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 6]);
  ctx.lineDashOffset = t * 0.8;
  ctx.beginPath();
  ctx.moveTo(x0, y1);
  ctx.lineTo(x0, y0 + R2(0.05));
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1, y0 + R2(0.05));
  ctx.stroke();
  ctx.setLineDash([]);
  // 위로 흐르는 바람 줄
  ctx.lineCap = 'round';
  for (let k = 0; k < 12; k++) {
    const x = x0 + ((k + 0.5) / 12) * (x1 - x0), per = y1 - y0, y = y1 - ((t * (2.2 + hsh(k) * 1.2) + hsh(k + 4) * per) % per);
    const len = R2(0.06 + hsh(k + 2) * 0.05), a = Math.min(1, (y - y0) / R2(0.12));
    ctx.strokeStyle = `rgba(255,255,255,${0.8 * a})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x + Math.sin(y * 0.05) * 3, y);
    ctx.quadraticCurveTo(x + 4, y - len / 2, x + Math.sin((y - len) * 0.05) * 3, y - len);
    ctx.stroke();
  }
  // 날리는 잎
  for (let k = 0; k < 4; k++) {
    const per = y1 - y0, y = y1 - ((t * 1.6 + hsh(k + 20) * per) % per), x = x0 + (x1 - x0) * (0.2 + 0.6 * hsh(k + 11)) + Math.sin(t * 0.06 + k) * R2(0.03);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * 0.08 + k);
    ctx.fillStyle = k % 2 ? '#7fd068' : '#ffb84a';
    ell(ctx, 0, 0, R2(0.012), R2(0.006));
    ctx.fill();
    ctx.restore();
  }
  // 꼭대기: 집 쪽으로 휘는 화살표
  ctx.strokeStyle = 'rgba(255,255,255,.75)';
  ctx.lineWidth = 2.5;
  const ax = (x0 + x1) / 2, ay = y0 + R2(0.05), dir = L.dir;
  ctx.beginPath();
  ctx.moveTo(ax - dir * R2(0.03), ay + R2(0.05));
  ctx.quadraticCurveTo(ax, ay - R2(0.02), ax + dir * R2(0.07), ay);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(ax + dir * R2(0.07), ay);
  ctx.lineTo(ax + dir * R2(0.05), ay - R2(0.02));
  ctx.moveTo(ax + dir * R2(0.07), ay);
  ctx.lineTo(ax + dir * R2(0.045), ay + R2(0.012));
  ctx.stroke();
  // 선풍기
  const fxp = (x0 + x1) / 2, fy = y1 - R2(0.012);
  ctx.fillStyle = '#7aa0b8';
  rr(ctx, x0 + R2(0.01), fy - R2(0.01), x1 - x0 - R2(0.02), R2(0.026), 5);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.save();
  ctx.translate(fxp, fy);
  ctx.scale(1, 0.35);
  ctx.rotate(t * 0.5);
  ctx.fillStyle = '#e8f6ff';
  for (let k = 0; k < 4; k++) {
    ctx.rotate(TAU / 4);
    ell(ctx, R2(0.04), 0, R2(0.04), R2(0.014));
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = '#ff5a5a';
  ell(ctx, fxp, fy, R2(0.012), R2(0.006));
  ctx.fill();
}
function drawLoop(ctx: C2, L: Layout, X: (x: number) => number, Y: (y: number) => number, R2: (r: number) => number, t: number, ph: number) {
  const lp = L.loop!, cx = X(lp.x), cy = Y(lp.y), r = R2(lp.r);
  // 다리
  ctx.strokeStyle = '#a8683a';
  ctx.lineWidth = R2(0.014);
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.7, cy + r * 0.3);
  ctx.lineTo(cx - r * 0.9, cy + r * 1.02);
  ctx.moveTo(cx + r * 0.7, cy + r * 0.3);
  ctx.lineTo(cx + r * 0.9, cy + r * 1.02);
  ctx.stroke();
  // 나무 고리
  ctx.strokeStyle = '#8a4f22';
  ctx.lineWidth = R2(0.03);
  ell(ctx, cx + 1, cy + 2, r, r);
  ctx.stroke();
  ctx.strokeStyle = '#e8a65a';
  ctx.lineWidth = R2(0.022);
  ell(ctx, cx, cy, r, r);
  ctx.stroke();
  ctx.strokeStyle = '#ffd9a0';
  ctx.lineWidth = R2(0.005);
  ell(ctx, cx, cy, r - R2(0.006), r - R2(0.006));
  ctx.stroke();
  ctx.fillStyle = 'rgba(110,60,20,.6)';
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * TAU;
    ell(ctx, cx + Math.cos(a) * r, cy + Math.sin(a) * r, 1.4, 1.4);
    ctx.fill();
  }
  // 도는 방향 화살표
  ctx.strokeStyle = 'rgba(255,255,255,.8)';
  ctx.lineWidth = 2.5;
  const a0 = -Math.PI * 0.15 + (t * 0.03) % 0.4;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.55, a0 - (L.dir > 0 ? 1.2 : -1.2), a0, L.dir < 0);
  ctx.stroke();
  void ph;
}
function drawStars(ctx: C2, S: Sim, X: (x: number) => number, Y: (y: number) => number, R2: (r: number) => number, t: number) {
  for (const [i, q] of S.stars.entries()) {
    if (q.got >= 0) continue;
    const bob = Math.sin(t * 0.07 + i * 2) * R2(0.006), x = X(q.x), y = Y(q.y) + bob, r = R2(STAR_R);
    ctx.fillStyle = rad(ctx, x, y, 0, r * 2.2, [0, 'rgba(255,240,140,.7)'], [1, 'rgba(255,240,140,0)']);
    ell(ctx, x, y, r * 2.2, r * 2.2);
    ctx.fill();
    const rot = -Math.PI / 2 + Math.sin(t * 0.05 + i) * 0.25;
    starPath(ctx, x + 1.5, y + 2, r, rot);
    ctx.fillStyle = 'rgba(140,80,0,.3)';
    ctx.fill();
    starPath(ctx, x, y, r, rot);
    ctx.fillStyle = rad(ctx, x - r * 0.3, y - r * 0.3, 0, r * 1.3, [0, '#fff8c4'], [0.5, '#ffd23a'], [1, '#f2a000']);
    ctx.fill();
    ctx.strokeStyle = '#a86400';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = '#7a4a08';
    ell(ctx, x - r * 0.2, y, r * 0.07, r * 0.11);
    ctx.fill();
    ell(ctx, x + r * 0.2, y, r * 0.07, r * 0.11);
    ctx.fill();
    if ((t + i * 20) % 50 < 12) {
      const a = ((t + i * 20) % 50) / 12;
      ctx.strokeStyle = `rgba(255,255,255,${1 - a})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + r * 0.9, y - r * (0.9 + a * 0.6));
      ctx.lineTo(x + r * 0.9, y - r * (0.9 - a * 0.6) - r * 0.6);
      ctx.stroke();
    }
  }
}

// ── 집 ──
function drawHouse(ctx: C2, s: RollState, X: (x: number) => number, Y: (y: number) => number, R2: (r: number) => number, t: number, look: Look) {
  const H = s.L.house, S = s.S, hx = X(H.x), fy = Y(H.y), hw = R2(HW), hh = R2(HH), rh = R2(0.11);
  // 그림자
  ctx.fillStyle = 'rgba(40,70,40,.22)';
  ell(ctx, hx + R2(0.02), fy, hw * 1.15, R2(0.018));
  ctx.fill();
  // 굴뚝 + 연기
  const chx = hx + hw * 0.45;
  ctx.fillStyle = '#c25a3a';
  ctx.fillRect(chx - R2(0.016), fy - hh - rh * 0.9, R2(0.032), rh * 0.6);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.3;
  ctx.strokeRect(chx - R2(0.016), fy - hh - rh * 0.9, R2(0.032), rh * 0.6);
  for (let k = 0; k < 3; k++) {
    const a = ((t * 0.6 + k * 30) % 90) / 90;
    ctx.fillStyle = `rgba(255,255,255,${0.7 * (1 - a)})`;
    ell(ctx, chx + Math.sin(a * 4 + k) * R2(0.012), fy - hh - rh * 0.95 - a * R2(0.08), R2(0.012 + a * 0.012), R2(0.012 + a * 0.012));
    ctx.fill();
  }
  // 벽
  ctx.fillStyle = lin(ctx, hx - hw, 0, hx + hw, 0, [0, '#fff6e4'], [1, '#f6e2c0']);
  ctx.fillRect(hx - hw, fy - hh, hw * 2, hh);
  ctx.strokeStyle = 'rgba(190,150,100,.45)';
  ctx.lineWidth = 1;
  for (let k = 1; k < 5; k++) (ctx.beginPath(), ctx.moveTo(hx - hw, fy - (hh * k) / 5), ctx.lineTo(hx + hw, fy - (hh * k) / 5), ctx.stroke());
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.8;
  ctx.strokeRect(hx - hw, fy - hh, hw * 2, hh);
  // 문 (쥐구멍 같은 둥근 문) — 문이 난 쪽
  const sides = H.two ? [-1, 1] : [H.f];
  const openA = S.gateOpen ? Math.min(1, (t - look.gateT) / 20) : 0;
  for (const sd of sides) {
    const dx0 = hx + sd * hw, dw = R2(0.13), dh = R2(DOOR_H);
    const cx = dx0 - sd * dw * 0.5;
    ctx.fillStyle = '#4a2a14';
    ctx.beginPath();
    ctx.moveTo(dx0, fy);
    ctx.lineTo(dx0, fy - dh + dw * 0.45);
    ctx.quadraticCurveTo(dx0, fy - dh, cx, fy - dh);
    ctx.quadraticCurveTo(dx0 - sd * dw, fy - dh, dx0 - sd * dw, fy - dh + dw * 0.45);
    ctx.lineTo(dx0 - sd * dw, fy);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rad(ctx, cx, fy - dh * 0.3, 0, dw, [0, 'rgba(255,200,120,.35)'], [1, 'rgba(255,200,120,0)']);
    ctx.fill();
    ctx.strokeStyle = '#a8683a';
    ctx.lineWidth = R2(0.01);
    ctx.stroke();
    // 잠긴 문 판자 (단추를 누르면 위로 쓱)
    if (S.balls.length && s.L.d.gate && openA < 1) {
      const lift = openA * dh;
      ctx.save();
      ctx.beginPath();
      ctx.rect(Math.min(dx0, dx0 - sd * dw) - 2, fy - dh - 2, dw + 4, dh + 2);
      ctx.clip();
      for (let k = 0; k < 3; k++) {
        const px = Math.min(dx0, dx0 - sd * dw) + (k * dw) / 3;
        ctx.fillStyle = k % 2 ? '#d89a5a' : '#c98446';
        ctx.fillRect(px, fy - dh - lift, dw / 3, dh);
        ctx.strokeStyle = OUT;
        ctx.lineWidth = 1;
        ctx.strokeRect(px, fy - dh - lift, dw / 3, dh);
      }
      ctx.fillStyle = '#e2233a';
      ell(ctx, cx, fy - dh * 0.5 - lift, R2(0.014), R2(0.014));
      ctx.fill();
      ctx.restore();
    }
  }
  // 창문 (집에 들어간 햄스터가 손을 흔든다)
  const wx = H.two ? hx : hx - (H.f || -1) * hw * 0.35, wy = fy - hh * 0.62, wr = R2(0.03);
  ctx.fillStyle = '#9ee0ff';
  ell(ctx, wx, wy, wr, wr);
  ctx.fill();
  const inside = S.balls.filter((b) => b.home >= 0);
  if (inside.length) {
    const age = t - Math.min(...inside.map((b) => b.home)) - 14;
    if (age > 0) {
      ctx.save();
      ell(ctx, wx, wy, wr, wr);
      ctx.clip();
      const pop = Math.min(1, age / 10);
      drawHamster(ctx, wx, wy + wr * (1.4 - pop * 0.9), wr * 0.95, 0, 'home', t, 0);
      ctx.restore();
    }
  }
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.6;
  ell(ctx, wx, wy, wr, wr);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(wx - wr, wy);
  ctx.lineTo(wx + wr, wy);
  ctx.stroke();
  // 꽃 화분
  ctx.fillStyle = '#c25a3a';
  ctx.fillRect(wx - wr * 1.1, wy + wr * 1.05, wr * 2.2, R2(0.012));
  for (let k = 0; k < 3; k++) {
    ctx.fillStyle = ['#ff8fb8', '#fff27a', '#ff6a3d'][k];
    ell(ctx, wx - wr * 0.7 + k * wr * 0.7, wy + wr * 1.0, R2(0.007), R2(0.007));
    ctx.fill();
  }
  // 지붕 (기와)
  const ov = R2(0.025);
  ctx.fillStyle = lin(ctx, 0, fy - hh - rh, 0, fy - hh, [0, '#ff8a5a'], [1, '#e2502a']);
  ctx.beginPath();
  ctx.moveTo(hx - hw - ov, fy - hh + R2(0.004));
  ctx.lineTo(hx, fy - hh - rh);
  ctx.lineTo(hx + hw + ov, fy - hh + R2(0.004));
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(150,40,20,.5)';
  ctx.lineWidth = 1.2;
  for (let k = 1; k < 4; k++) {
    const yy = fy - hh - rh + (rh * k) / 4, half = (hw + ov) * (k / 4);
    ctx.beginPath();
    for (let j = 0; j < 6; j++) {
      const x = hx - half + ((2 * half) * j) / 6;
      ctx.moveTo(x, yy);
      ctx.quadraticCurveTo(x + half / 6, yy + R2(0.012), x + (2 * half) / 6, yy);
    }
    ctx.stroke();
  }
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(hx - hw - ov, fy - hh + R2(0.004));
  ctx.lineTo(hx, fy - hh - rh);
  ctx.lineTo(hx + hw + ov, fy - hh + R2(0.004));
  ctx.closePath();
  ctx.stroke();
  // 문패
  ctx.fillStyle = '#fff6dc';
  rr(ctx, hx - R2(0.035), fy - hh - rh * 0.45, R2(0.07), R2(0.03), 4);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#7a4a1e';
  ctx.font = `900 ${Math.max(8, R2(0.022))}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('집', hx, fy - hh - rh * 0.45 + R2(0.015));
}

// ── 선 (크레용 → 나무 길) ──
function strokes(S: Sim): { sid: number; paths: number[][][] }[] {
  const out: { sid: number; paths: number[][][] }[] = [];
  let cur: { sid: number; paths: number[][][] } | null = null, last: Seg | null = null;
  for (const g of S.segs) {
    if (g.k !== K_DRAWN) continue;
    if (!cur || cur.sid !== g.sid) out.push((cur = { sid: g.sid, paths: [] })), (last = null);
    if (last && Math.abs(last.bx - g.ax) < 1e-9 && Math.abs(last.by - g.ay) < 1e-9) cur.paths[cur.paths.length - 1].push([g.bx, g.by]);
    else cur.paths.push([[g.ax, g.ay], [g.bx, g.by]]);
    last = g;
  }
  return out;
}
function smoothPath(ctx: C2, pts: number[][], X: (x: number) => number, Y: (y: number) => number, dy = 0) {
  ctx.beginPath();
  ctx.moveTo(X(pts[0][0]), Y(pts[0][1]) + dy);
  for (let i = 1; i < pts.length - 1; i++) ctx.quadraticCurveTo(X(pts[i][0]), Y(pts[i][1]) + dy, (X(pts[i][0]) + X(pts[i + 1][0])) / 2, (Y(pts[i][1]) + Y(pts[i + 1][1])) / 2 + dy);
  ctx.lineTo(X(pts[pts.length - 1][0]), Y(pts[pts.length - 1][1]) + dy);
}
function drawLines(ctx: C2, s: RollState, X: (x: number) => number, Y: (y: number) => number, R2: (r: number) => number, t: number, fx: ReturnType<typeof juice>, look: Look) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const st of strokes(s.S)) {
    const hard = s.hard.get(st.sid);
    // 굳는 물결: 떼는 순간부터 처음 → 끝으로 톡톡 나무가 된다
    let idx = 0;
    const total = st.paths.reduce((a, p) => a + p.length, 0);
    const done = hard === undefined ? -1 : Math.min(total, ((t - hard) / 10) * total);
    for (const path of st.paths) {
      const n = path.length;
      const cut = Math.max(0, Math.min(n, Math.floor(done - idx)));
      if (cut >= 2) woodPath(ctx, path.slice(0, cut), X, Y, R2, hard !== undefined && t - hard < 14);
      if (cut < n) crayonPath(ctx, path.slice(Math.max(0, cut - 1)), X, Y, R2, t);
      idx += n;
    }
    if (hard !== undefined) {
      const prev = look.hardDone.get(st.sid) ?? 0, nowDone = Math.floor(Math.max(0, done));
      if (nowDone > prev) {
        // 굳는 자리에 나무 부스러기
        let k = 0;
        for (const path of st.paths)
          for (const p of path) {
            if (k >= prev && k < nowDone && k % 3 === 0) fx.burst(X(p[0]), Y(p[1]), k % 2 ? '#e8a65a' : '#fff1c4', 2, 1.4, 2);
            k++;
          }
        look.hardDone.set(st.sid, nowDone);
      }
    }
  }
}
function crayonPath(ctx: C2, pts: number[][], X: (x: number) => number, Y: (y: number) => number, R2: (r: number) => number, t: number) {
  if (pts.length < 2) return;
  const glow = 0.5 + 0.5 * Math.sin(t * 0.3);
  ctx.strokeStyle = `rgba(255,240,150,${0.35 + 0.25 * glow})`;
  ctx.lineWidth = R2(0.04);
  smoothPath(ctx, pts, X, Y);
  ctx.stroke();
  ctx.strokeStyle = '#d9482a';
  ctx.lineWidth = R2(0.026);
  smoothPath(ctx, pts, X, Y, 1);
  ctx.stroke();
  ctx.strokeStyle = '#ff7a3d';
  ctx.lineWidth = R2(0.022);
  smoothPath(ctx, pts, X, Y);
  ctx.stroke();
  // 크레용 결 (밝은 줄)
  ctx.strokeStyle = 'rgba(255,214,150,.75)';
  ctx.lineWidth = R2(0.005);
  ctx.setLineDash([R2(0.014), R2(0.01)]);
  smoothPath(ctx, pts, X, Y, -R2(0.005));
  ctx.stroke();
  ctx.setLineDash([]);
}
function woodPath(ctx: C2, pts: number[][], X: (x: number) => number, Y: (y: number) => number, R2: (r: number) => number, fresh: boolean) {
  ctx.strokeStyle = 'rgba(60,40,20,.18)';
  ctx.lineWidth = R2(0.028);
  smoothPath(ctx, pts, X, Y, R2(0.018));
  ctx.stroke();
  ctx.strokeStyle = '#8a4f22';
  ctx.lineWidth = R2(0.028);
  smoothPath(ctx, pts, X, Y, R2(0.006));
  ctx.stroke();
  ctx.strokeStyle = fresh ? '#ffcf8a' : '#e3a056';
  ctx.lineWidth = R2(0.024);
  smoothPath(ctx, pts, X, Y);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,230,180,.85)';
  ctx.lineWidth = R2(0.006);
  smoothPath(ctx, pts, X, Y, -R2(0.006));
  ctx.stroke();
  // 판자 이음매·못
  ctx.fillStyle = 'rgba(90,50,20,.65)';
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (acc > 0.06) {
      acc = 0;
      ell(ctx, X(pts[i][0]), Y(pts[i][1]), 1.4, 1.4);
      ctx.fill();
    }
  }
}
/** 그리는 동안: 지금 떼면 공이 어디로 갈지 0.8초만 점으로 */
function drawPreview(ctx: C2, s: RollState, X: (x: number) => number, Y: (y: number) => number, R2: (r: number) => number, look: Look) {
  const S = s.S, key = `${s.stage}:${s.tries}:${S.segs.length}:${S.ink.toFixed(4)}`;
  if (!look.pv || look.pv.key !== key) {
    const C = cloneSim(S), pts: number[][] = [];
    if (penUp(s.L, C)) {
      dash(s.L, C);
      for (let k = 0; k < 60 && verdict(C) === 0; k++) {
        tick(s.L, C);
        if (k % 4 === 3) for (const b of C.balls) if (b.home < 0 && !b.out) pts.push([b.x, b.y, k]);
      }
    }
    look.pv = { key, pts };
  }
  for (const [x, y, k] of look.pv.pts) {
    ctx.fillStyle = `rgba(255,255,255,${0.9 - k / 80})`;
    ell(ctx, X(x), Y(y), R2(0.009), R2(0.009));
    ctx.fill();
    ctx.strokeStyle = `rgba(90,60,30,${0.4 - k / 140})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

// ── 햄스터 공 ──
function ballMood(s: RollState, b: Ball): string {
  if (b.out) return 'dizzy';
  if (b.home >= 0) return 'home';
  if (s.phase === 'result' && !s.ok) return s.failKind === 'stop' ? 'huh' : 'dizzy';
  if (!s.S.moving) return s.S.dashes ? 'huh' : 'wait';
  if (b.air > 12) return 'fly';
  return Math.hypot(b.vx, b.vy) > 1.3 ? 'zoom' : 'roll';
}
function drawBall(ctx: C2, s: RollState, b: Ball, X: (x: number) => number, Y: (y: number) => number, R2: (r: number) => number, t: number, look: Look) {
  let x = b.x, y = b.y;
  const H = s.L.house;
  if (b.home >= 0) {
    // 문으로 쏙 들어가 안쪽으로 굴러간다
    const a = Math.min(1, (t - b.home) / 16);
    x += (H.x - x) * a;
    y += (H.y - R - y) * a;
    if (a >= 1) return;
  }
  if (b.out) {
    // 강에 풍덩: 둥둥 떠서 어질어질
    y = RIVER + 0.01 + Math.sin(t * 0.12) * 0.006;
  }
  const waiting = s.phase === 'play' && !s.S.moving && s.S.dashes === 0 && b.home < 0;
  const r = R2(R), px = X(x) + (waiting ? Math.sin(t * 0.45) * R2(0.003) : 0), py = Y(y);
  const sp = Math.hypot(b.vx, b.vy);
  // 빠르면 바람 줄
  if (s.S.moving && sp > 1.0 && b.home < 0 && !b.out) {
    const ux = b.vx / sp, uy = b.vy / sp;
    ctx.strokeStyle = 'rgba(255,255,255,.7)';
    ctx.lineWidth = 2;
    for (let k = -1; k <= 1; k++) {
      const ox = -uy * k * r * 0.6, oy = ux * k * r * 0.6, l = r * (0.8 + sp * 0.5);
      ctx.beginPath();
      ctx.moveTo(px - ux * r * 1.1 + ox, py - uy * r * 1.1 + oy);
      ctx.lineTo(px - ux * (r * 1.1 + l) + ox, py - uy * (r * 1.1 + l) + oy);
      ctx.stroke();
    }
  }
  const mood = ballMood(s, b);
  // 그림자 (발밑)
  if (b.con && !b.out) {
    ctx.fillStyle = 'rgba(40,40,60,.18)';
    ell(ctx, px - b.nx * r * 0.9, py - b.ny * r * 0.95, r * 0.75, r * 0.2, Math.atan2(-b.nx, b.ny));
    ctx.fill();
  }
  // 투명한 공 뒷면
  ctx.fillStyle = rad(ctx, px - r * 0.35, py - r * 0.4, r * 0.1, r * 1.1, [0, 'rgba(255,255,255,.55)'], [0.6, 'rgba(200,240,255,.35)'], [1, 'rgba(150,215,245,.45)']);
  ell(ctx, px, py, r, r);
  ctx.fill();
  // 쳇바퀴 바닥(공 안 아랫부분)
  ctx.save();
  ell(ctx, px, py, r * 0.97, r * 0.97);
  ctx.clip();
  // 햄스터: 보통은 서 있고, 아주 빠르면 공과 같이 빙글
  const spin = mood === 'zoom' ? b.rot : mood === 'dizzy' ? t * 0.15 : 0;
  const tilt = Math.max(-0.35, Math.min(0.35, b.vx * 0.25));
  drawHamster(ctx, px, py + r * 0.1, r * 0.88, spin + (mood === 'zoom' ? 0 : tilt), mood, t, b.rot);
  ctx.restore();
  // 공 앞면: 테두리·반짝임·도는 줄
  ctx.strokeStyle = 'rgba(70,140,190,.75)';
  ctx.lineWidth = 2;
  ell(ctx, px, py, r, r);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.85)';
  ctx.lineWidth = 1.5;
  ell(ctx, px, py, r - 2, r - 2);
  ctx.stroke();
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(b.rot);
  ctx.strokeStyle = 'rgba(120,190,230,.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.35, r * 0.97, 0, 0, TAU);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  ctx.beginPath();
  ctx.ellipse(px - r * 0.38, py - r * 0.45, r * 0.28, r * 0.13, -0.7, 0, TAU);
  ctx.fill();
  ell(ctx, px + r * 0.45, py + r * 0.38, r * 0.06, r * 0.06);
  ctx.fill();
  if (mood === 'dizzy') {
    for (let k = 0; k < 3; k++) {
      const a = t * 0.12 + (k * TAU) / 3;
      starPath(ctx, px + Math.cos(a) * r * 0.9, py - r * 1.15 + Math.sin(a) * r * 0.25, r * 0.18);
      ctx.fillStyle = '#ffe14a';
      ctx.fill();
    }
  }
  void look;
}
/** 햄스터 (공 속): mood = wait 달리기 · roll 신남 · zoom 빙글 · fly 만세 · home 웃음 · dizzy 어질 · huh 갸우뚱 */
function drawHamster(ctx: C2, x: number, y: number, k: number, rot: number, mood: string, t: number, roll: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const run = mood === 'wait' ? t * 0.45 : roll * 2.2;
  const bounce = mood === 'wait' ? Math.abs(Math.sin(run)) * k * 0.06 : 0;
  ctx.translate(0, -bounce);
  // 발 (달리기)
  ctx.fillStyle = '#ffd9c4';
  for (const sd of [-1, 1]) {
    const ph = Math.sin(run + (sd > 0 ? 0 : Math.PI));
    ell(ctx, sd * k * 0.22 + ph * k * 0.12, k * 0.5, k * 0.11, k * 0.08);
    ctx.fill();
  }
  // 몸통
  ctx.fillStyle = lin(ctx, 0, -k * 0.6, 0, k * 0.5, [0, '#f7b267'], [1, '#e08a3c']);
  ell(ctx, 0, k * 0.02, k * 0.55, k * 0.52);
  ctx.fill();
  ctx.strokeStyle = '#8a4a14';
  ctx.lineWidth = Math.max(1, k * 0.05);
  ctx.stroke();
  ctx.fillStyle = '#fff3dc';
  ell(ctx, 0, k * 0.16, k * 0.36, k * 0.33);
  ctx.fill();
  // 귀
  for (const sd of [-1, 1]) {
    ctx.fillStyle = '#e8904a';
    ell(ctx, sd * k * 0.34, -k * 0.42, k * 0.15, k * 0.14);
    ctx.fill();
    ctx.strokeStyle = '#8a4a14';
    ctx.stroke();
    ctx.fillStyle = '#ffb3b8';
    ell(ctx, sd * k * 0.34, -k * 0.41, k * 0.08, k * 0.07);
    ctx.fill();
  }
  // 팔 (만세 / 달리기)
  ctx.fillStyle = '#ffd9c4';
  for (const sd of [-1, 1]) {
    if (mood === 'fly' || mood === 'home') ell(ctx, sd * k * 0.5, -k * 0.35 + Math.sin(t * 0.4 + sd) * k * 0.04, k * 0.09, k * 0.12, sd * 0.5);
    else ell(ctx, sd * k * 0.3, k * 0.22 + Math.sin(run + sd) * k * 0.05, k * 0.09, k * 0.08);
    ctx.fill();
  }
  // 얼굴
  const ey = -k * 0.12;
  ctx.fillStyle = '#2a1608';
  if (mood === 'home') {
    ctx.strokeStyle = '#2a1608';
    ctx.lineWidth = Math.max(1.2, k * 0.06);
    for (const sd of [-1, 1]) (ctx.beginPath(), ctx.arc(sd * k * 0.18, ey + k * 0.03, k * 0.07, Math.PI * 1.1, Math.PI * 1.9), ctx.stroke());
  } else if (mood === 'dizzy') {
    ctx.strokeStyle = '#2a1608';
    ctx.lineWidth = Math.max(1, k * 0.045);
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      for (let a = 0; a < 4 * Math.PI; a += 0.5) {
        const rr2 = (a / (4 * Math.PI)) * k * 0.09;
        const xx = sd * k * 0.18 + Math.cos(a + t * 0.2) * rr2, yy = ey + Math.sin(a + t * 0.2) * rr2;
        a ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
      }
      ctx.stroke();
    }
  } else {
    const big = mood === 'fly' || mood === 'zoom' ? 1.35 : 1;
    for (const sd of [-1, 1]) {
      ell(ctx, sd * k * 0.18, ey, k * 0.065 * big, k * 0.085 * big);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ell(ctx, sd * k * 0.18 - k * 0.02, ey - k * 0.03, k * 0.025 * big, k * 0.025 * big);
      ctx.fill();
      ctx.fillStyle = '#2a1608';
    }
  }
  // 볼·코·입
  ctx.fillStyle = 'rgba(255,120,140,.45)';
  ell(ctx, -k * 0.3, ey + k * 0.14, k * 0.08, k * 0.05);
  ctx.fill();
  ell(ctx, k * 0.3, ey + k * 0.14, k * 0.08, k * 0.05);
  ctx.fill();
  ctx.fillStyle = '#ff7a9a';
  ell(ctx, 0, ey + k * 0.1, k * 0.045, k * 0.035);
  ctx.fill();
  ctx.strokeStyle = '#5a2a10';
  ctx.lineWidth = Math.max(1, k * 0.04);
  ctx.beginPath();
  if (mood === 'fly' || mood === 'zoom') (ctx.fillStyle = '#c23a3a'), ell(ctx, 0, ey + k * 0.22, k * 0.06, k * 0.07), ctx.fill();
  else if (mood === 'huh') (ctx.moveTo(-k * 0.06, ey + k * 0.2), ctx.lineTo(k * 0.06, ey + k * 0.18), ctx.stroke());
  else (ctx.moveTo(-k * 0.07, ey + k * 0.17), ctx.quadraticCurveTo(0, ey + k * 0.25, k * 0.07, ey + k * 0.17), ctx.stroke());
  ctx.restore();
  if (mood === 'huh') {
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${Math.max(10, k * 0.7)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('?', x + k * 0.75, y - k * 0.75);
  }
}

// ── 구경꾼 참새 (집 지붕 위) ──
function drawBird(ctx: C2, s: RollState, X: (x: number) => number, Y: (y: number) => number, R2: (r: number) => number, t: number, look: Look) {
  const H = s.L.house, bx = X(H.x + (H.two ? 0.04 : -(H.f || -1) * 0.04)), by = Y(H.y - HH - 0.085);
  const age = t - look.birdT, excited = age < 50, sad = s.phase === 'result' && !s.ok;
  const hop = excited ? Math.abs(Math.sin(age * 0.3)) * R2(0.03) : (t % 140) < 10 ? Math.sin(((t % 140) / 10) * Math.PI) * R2(0.012) : 0;
  const ball = s.S.balls.find((b) => b.home < 0) ?? s.S.balls[0];
  const face = ball && ball.x < H.x ? -1 : 1;
  ctx.save();
  ctx.translate(bx, by - hop);
  ctx.scale(face, 1);
  const k = R2(0.03);
  ctx.fillStyle = '#9a6a3e';
  ell(ctx, 0, 0, k, k * 0.82);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = '#fff3dc';
  ell(ctx, k * 0.25, k * 0.25, k * 0.55, k * 0.45);
  ctx.fill();
  // 날개 (신나면 파닥, 슬프면 눈 가림)
  ctx.fillStyle = '#7a4a22';
  if (sad) ell(ctx, k * 0.55, -k * 0.35, k * 0.45, k * 0.2, -0.4);
  else ell(ctx, -k * 0.25, -k * 0.05 - (excited ? Math.sin(t * 0.8) * k * 0.3 : 0), k * 0.55, k * 0.28, excited ? -0.6 : 0.2);
  ctx.fill();
  ctx.fillStyle = '#ffb02e';
  ctx.beginPath();
  ctx.moveTo(k * 0.85, -k * 0.15);
  ctx.lineTo(k * 1.25, -k * 0.05);
  ctx.lineTo(k * 0.85, k * 0.08);
  ctx.fill();
  if (!sad) {
    ctx.fillStyle = '#1a0e04';
    ell(ctx, k * 0.5, -k * 0.25, k * 0.11, k * 0.13);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ell(ctx, k * 0.47, -k * 0.3, k * 0.04, k * 0.04);
    ctx.fill();
  }
  ctx.strokeStyle = '#ffb02e';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-k * 0.1, k * 0.75);
  ctx.lineTo(-k * 0.1, k * 1.0);
  ctx.moveTo(k * 0.2, k * 0.75);
  ctx.lineTo(k * 0.2, k * 1.0);
  ctx.stroke();
  ctx.restore();
  if (excited && age % 20 < 10) {
    ctx.fillStyle = '#ff5a8a';
    ctx.font = `900 ${Math.max(11, R2(0.035))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('♪', bx + R2(0.05) * face, by - R2(0.06) - (age % 20));
  }
}

// ── 첫 판 시범 · NEW ──
function drawHand(ctx: C2, x: number, y: number, k: number, press: number) {
  ctx.save();
  ctx.translate(x, y + press * k * 0.12);
  ctx.rotate(-0.3);
  ctx.fillStyle = 'rgba(60,30,10,.22)';
  ell(ctx, k * 0.2, k * 1.25, k * 0.4, k * 0.12);
  ctx.fill();
  ctx.fillStyle = '#fff6ec';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(2, k * 0.08);
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
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
function drawDemo(ctx: C2, s: RollState, X: (x: number) => number, Y: (y: number) => number, R2: (r: number) => number, w: number, t: number) {
  const d = s.L.demo;
  if (!d) return;
  const pts = catmull(d, 0.01);
  const age = (t - s.stageT) % 170, p = Math.min(1, Math.max(0, (age - 20) / 100)), n = Math.max(2, Math.floor(pts.length * p));
  if (age > 20) {
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,.75)';
    ctx.lineWidth = R2(0.03);
    ctx.setLineDash([R2(0.02), R2(0.025)]);
    ctx.beginPath();
    pts.slice(0, n).forEach((q, i) => (i ? ctx.lineTo(X(q[0]), Y(q[1])) : ctx.moveTo(X(q[0]), Y(q[1]))));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(255,122,61,.85)';
    ctx.lineWidth = R2(0.012);
    ctx.stroke();
  }
  const q = pts[Math.min(pts.length - 1, n - 1)];
  drawHand(ctx, X(q[0]) + R2(0.01), Y(q[1]), R2(0.085), age < 20 ? 1 - age / 20 : age > 125 ? Math.min(1, (age - 125) / 10) : 0);
  // 큰 안내 한 줄
  const txt = '👆 길을 쓱 그려요!', fs = Math.max(16, w * 0.06);
  ctx.font = `900 ${fs}px system-ui, sans-serif`;
  const tw = ctx.measureText(txt).width + R2(0.08), cy = Y(0.27), pul = 1 + 0.03 * Math.sin(t * 0.12);
  ctx.save();
  ctx.translate(w / 2, cy);
  ctx.scale(pul, pul);
  ctx.fillStyle = 'rgba(90,40,10,.25)';
  rr(ctx, -tw / 2 + 2, -fs * 0.85 + 4, tw, fs * 1.7, fs * 0.85);
  ctx.fill();
  ctx.fillStyle = '#fffaf0';
  rr(ctx, -tw / 2, -fs * 0.85, tw, fs * 1.7, fs * 0.85);
  ctx.fill();
  ctx.strokeStyle = '#ff7a3d';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#d9482a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(txt, 0, 1);
  ctx.restore();
}
function drawSpot(ctx: C2, L: Layout, X: (x: number) => number, Y: (y: number) => number, R2: (r: number) => number, w: number, age: number) {
  const [sx, sy, rx, ry] = L.spot!;
  const a = Math.min(1, age / 10, (280 - age) / 30), pul = 1 + 0.05 * Math.sin(age * 0.2);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.strokeStyle = '#ffd23a';
  ctx.lineWidth = 4;
  ctx.setLineDash([10, 7]);
  ctx.lineDashOffset = -age * 0.8;
  ell(ctx, X(sx), Y(sy), R2(rx) * pul, R2(ry) * pul);
  ctx.stroke();
  ctx.setLineDash([]);
  const lab = 'NEW', fs = Math.max(12, w * 0.038);
  ctx.font = `900 ${fs}px system-ui, sans-serif`;
  const tw = ctx.measureText(lab).width + fs;
  const lx = Math.max(tw / 2 + 4, Math.min(w - tw / 2 - 4, X(sx))), ly = Math.max(Y(0.18), Y(sy) - R2(ry) * pul - fs * 0.4);
  ctx.fillStyle = '#ff5a3a';
  rr(ctx, lx - tw / 2, ly - fs * 0.7, tw, fs * 1.4, fs * 0.7);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(lab, lx, ly + 1);
  ctx.restore();
}

// ── 사건 → 연출 ──
function handleEvents(s: RollState, fx: ReturnType<typeof juice>, look: Look, X: (x: number) => number, Y: (y: number) => number) {
  for (const e of s.events) {
    if (e.id <= look.ev) continue;
    look.ev = e.id;
    const x = Math.max(X(0.14), Math.min(X(0.86), X(e.x))), y = Math.max(Y(0.3), Y(e.y));
    if (e.kind === 'wow') {
      const big = e.text === '출발!' || e.text === '쏙!' || e.text === '한 바퀴!';
      fx.pop(x, y, e.text ?? '', e.text === '쏙!' ? '#ffe14a' : '#ffffff', big ? 34 : 28);
      fx.ring(x, y + 18, '#ffffff', big ? 80 : 60, 5);
      fx.burst(x, y + 18, '#ffd23a', big ? 26 : 16, 4.2, 3.4);
      fx.kick(big ? 7 : 5);
      look.birdT = s.t;
      if (e.text === '출발!') fx.burst(x, y + 30, '#e8d2b0', 12, 2.6, 3), fx.blink('#fff6c0', 0.18);
      if (e.text === '뿅!') look.springT = s.t;
      if (e.text === '쏙!') {
        for (const c of ['#ff5a8a', '#3dbbff', '#7fe05a', '#ffd23a']) fx.burst(x, y + 20, c, 12, 5, 3.2);
        fx.blink('#fffbe0', 0.3);
      }
    } else if (e.kind === 'star') {
      fx.burst(x, y, '#ffe14a', 18, 3.6, 3);
      fx.burst(x, y, '#ffffff', 8, 2.4, 2);
      fx.ring(x, y, '#fff27a', 46, 4);
      fx.pop(x, y - 16, '+★', '#ffe14a', 22);
      fx.kick(2.5);
      look.flying.push({ x: e.x, y: e.y, t: s.t });
    } else if (e.kind === 'thud' || e.kind === 'land') {
      fx.burst(x, y, '#e8d2b0', e.kind === 'land' ? 10 : 6, 2.2, 2.6);
      if (e.kind === 'land') fx.kick(2);
    } else if (e.kind === 'button') {
      fx.pop(x, y - 30, '딸깍! 문이 열렸어요', '#9dff8a', 20);
      fx.ring(x, y, '#7fe05a', 60, 5);
      fx.kick(3);
      look.btnT = s.t;
      look.gateT = s.t;
    } else if (e.kind === 'out') {
      fx.burst(x, y, '#bfeaff', 26, 4.6, 3.4);
      fx.burst(x, y, '#ffffff', 14, 3.2, 2.6);
      fx.ring(x, y, '#ffffff', 50, 4);
      fx.pop(x, y - 30, '풍덩!', '#ffffff', 30);
      fx.kick(6);
    } else if (e.kind === 'zoom') {
      fx.pop(x, y - 34, '쌩~!', '#fff6a0', 24);
      fx.burst(x, y, '#ffffff', 6, 2.4, 2);
    } else if (e.kind === 'pen') {
      fx.pop(x + 26, y - 18, e.text ?? '', '#ffb084', 18);
      fx.burst(x, y, '#fff27a', 8, 2.2, 2.4);
    } else if (e.kind === 'bonk') {
      fx.pop(x, y - 20, '콩!', '#ffffff', 22);
      fx.burst(x, y, '#ffffff', 8, 2.6, 2.4);
    } else if (e.kind === 'rest' || e.kind === 'go' || e.kind === 'dry' || e.kind === 'busy' || e.kind === 'short') {
      fx.pop(x, y, e.text ?? (e.kind === 'busy' ? '데굴데굴 구르는 중!' : ''), e.kind === 'dry' ? '#ffb4a0' : '#fffaf0', e.kind === 'busy' ? 15 : 20);
    }
  }
  if (s.phase === 'result' && s.ok && s.pt === 1) look.birdT = s.t;
}

// ── HUD ──
function drawHud(ctx: C2, s: RollState, w: number, h: number, X: (x: number) => number, Y: (y: number) => number, R2: (r: number) => number, t: number, fx: ReturnType<typeof juice>, look: Look) {
  void X;
  const d = s.L.d, S = s.S;
  const font = (sz: number, wgt = 900) => (ctx.font = `${wgt} ${Math.max(12, sz * w)}px system-ui, sans-serif`);
  // 윗띠
  const hb = R2(0.085);
  ctx.fillStyle = lin(ctx, 0, 0, 0, hb, [0, 'rgba(255,252,240,.96)'], [1, 'rgba(255,240,210,.94)']);
  ctx.fillRect(0, 0, w, hb);
  ctx.fillStyle = 'rgba(110,60,20,.3)';
  ctx.fillRect(0, hb - 1.5, w, 1.5);
  const cy = hb / 2, cx = R2(0.055);
  ctx.fillStyle = lin(ctx, cx, cy - R2(0.03), cx, cy + R2(0.03), [0, '#ffe878'], [1, '#f2a91c']);
  ell(ctx, cx, cy, R2(0.032), R2(0.032));
  ctx.fill();
  ctx.strokeStyle = '#7a4a08';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#5b3512';
  font(0.038);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(s.stage + 1), cx, cy + 1);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#4a2a10';
  font(0.044);
  ctx.fillText(d.name, R2(0.1), cy + 1, R2(0.36));
  const nw = Math.min(R2(0.36), ctx.measureText(d.name).width);
  font(0.034, 700);
  ctx.fillStyle = '#8a6a4a';
  ctx.fillText(` / ${STAGE_COUNT}`, R2(0.1) + nw, cy + 2);
  ctx.textAlign = 'right';
  font(0.044);
  const st = String(s.stars), sw = ctx.measureText(st).width;
  ctx.fillStyle = '#d88a08';
  ctx.fillText(st, w - R2(0.03), cy + 1);
  starPath(ctx, w - R2(0.03) - sw - R2(0.028), cy, R2(0.022));
  ctx.fillStyle = '#ffd23a';
  ctx.fill();
  ctx.strokeStyle = '#7a4a08';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  for (let j = 0; j < 3; j++) {
    const hx2 = w - R2(0.03) - sw - R2(0.09) - j * R2(0.054);
    heartPath(ctx, hx2, cy, R2(0.019));
    ctx.fillStyle = 2 - j < s.hearts ? lin(ctx, hx2, cy - R2(0.02), hx2, cy + R2(0.02), [0, '#ff8a95'], [1, '#e2334a']) : 'rgba(110,60,20,.15)';
    ctx.fill();
    ctx.strokeStyle = 2 - j < s.hearts ? '#8a1a2a' : 'rgba(110,60,20,.3)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
  // 별 조건 (한 줄 말)
  const goals = d.goals, gy = R2(0.115), gh = R2(0.046), gap = R2(0.012);
  font(0.034, 800);
  const live = goalsNow(s);
  const tws = goals.map((g) => ctx.measureText(GOAL_TEXT(g, d)).width + R2(0.075));
  let tot = tws.reduce((a, b) => a + b, 0) + gap * (goals.length - 1);
  const sc = Math.min(1, (w - R2(0.03)) / tot);
  tot *= sc;
  let gx = (w - tot) / 2;
  goals.forEach((g, i) => {
    const cw = tws[i] * sc, on = live[i];
    ctx.fillStyle = on ? 'rgba(255,236,150,.97)' : 'rgba(255,250,236,.92)';
    rr(ctx, gx, gy - gh / 2, cw, gh, gh / 2);
    ctx.fill();
    ctx.strokeStyle = on ? '#d88a08' : 'rgba(110,60,20,.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    starPath(ctx, gx + R2(0.03) * sc + 2, gy, R2(0.017));
    ctx.fillStyle = on ? '#ffc93a' : 'rgba(110,60,20,.18)';
    ctx.fill();
    ctx.strokeStyle = on ? '#9a5a08' : 'rgba(110,60,20,.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#4a2a10';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    font(0.034 * Math.max(0.9, sc), 800);
    ctx.fillText(GOAL_TEXT(g, d), gx + R2(0.055) * sc + 2, gy + 1, cw - R2(0.06));
    gx += cw + gap;
  });
  // 주운 별이 위로 날아간다
  look.flying = look.flying.filter((f) => s.t - f.t < 30);
  for (const f of look.flying) {
    const a = (s.t - f.t) / 30, sx = Y(f.x) + (w / 2 - Y(f.x)) * a * a, sy = Y(f.y) + (gy - Y(f.y)) * a;
    starPath(ctx, sx, sy, R2(0.03) * (1 - a * 0.4));
    ctx.fillStyle = '#ffd23a';
    ctx.fill();
  }
  // 아랫판: 크레용 잉크 · 남은 선 · 안내
  const by0 = Y(1.425);
  ctx.fillStyle = lin(ctx, 0, by0, 0, h, [0, 'rgba(160,98,48,.96)'], [1, 'rgba(120,70,30,.98)']);
  rr(ctx, R2(0.015), by0, w - R2(0.03), h - by0 - R2(0.012), R2(0.03));
  ctx.fill();
  ctx.strokeStyle = 'rgba(70,35,10,.7)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,220,170,.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(R2(0.03), by0 + R2(0.006));
  ctx.lineTo(w - R2(0.03), by0 + R2(0.006));
  ctx.stroke();
  const frac = Math.max(0, S.ink / d.ink), crY = (by0 + h - R2(0.012)) / 2, crX0 = R2(0.115), crW = R2(0.48);
  ctx.fillStyle = '#fff1d6';
  font(0.03, 800);
  ctx.textAlign = 'left';
  ctx.fillText('잉크', R2(0.035), crY + 1);
  // 크레용: 남은 잉크만큼 길다 (그릴수록 짧아진다)
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  rr(ctx, crX0, crY - R2(0.016), crW, R2(0.032), R2(0.016));
  ctx.fill();
  if (frac > 0.01) {
    const cl = crW * frac, tipW = Math.min(R2(0.035), cl * 0.4);
    ctx.fillStyle = lin(ctx, 0, crY - R2(0.016), 0, crY + R2(0.016), [0, '#ff9a5a'], [1, '#e2502a']);
    rr(ctx, crX0, crY - R2(0.016), cl - tipW, R2(0.032), R2(0.008));
    ctx.fill();
    ctx.fillStyle = '#fff1c4';
    ctx.fillRect(crX0 + R2(0.02), crY - R2(0.016), Math.max(0, Math.min(R2(0.12), cl - tipW - R2(0.03))), R2(0.032));
    ctx.fillStyle = '#ff7a3d';
    ctx.beginPath();
    ctx.moveTo(crX0 + cl - tipW, crY - R2(0.016));
    ctx.lineTo(crX0 + cl, crY);
    ctx.lineTo(crX0 + cl - tipW, crY + R2(0.016));
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(crX0 + R2(0.008), crY - R2(0.016));
    ctx.lineTo(crX0 + cl - tipW, crY - R2(0.016));
    ctx.lineTo(crX0 + cl, crY);
    ctx.lineTo(crX0 + cl - tipW, crY + R2(0.016));
    ctx.lineTo(crX0 + R2(0.008), crY + R2(0.016));
    ctx.stroke();
    if (s.drawing && t % 4 < 2) fx.burst(crX0 + cl, crY, '#ffb084', 1, 1, 1.6);
  }
  if (d.goals.includes('half')) {
    ctx.strokeStyle = '#fff27a';
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(crX0 + crW / 2, crY - R2(0.024));
    ctx.lineTo(crX0 + crW / 2, crY + R2(0.024));
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // 남은 선
  const left = Math.max(0, d.strokes - S.used);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#fff1d6';
  font(0.032, 800);
  ctx.fillText('선', w - R2(0.035) - d.strokes * R2(0.05), crY + 1);
  for (let k = 0; k < d.strokes; k++) {
    const px = w - R2(0.06) - k * R2(0.05);
    ctx.save();
    ctx.translate(px, crY);
    ctx.rotate(-0.7);
    ctx.fillStyle = k < left ? '#ff7a3d' : 'rgba(255,255,255,.18)';
    rr(ctx, -R2(0.007), -R2(0.022), R2(0.014), R2(0.036), 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-R2(0.007), R2(0.014));
    ctx.lineTo(0, R2(0.028));
    ctx.lineTo(R2(0.007), R2(0.014));
    ctx.fill();
    ctx.restore();
  }
  // 안내 한 줄
  let hint = d.hint;
  if (s.phase === 'result') hint = s.ok ? (s.won ? '모든 집에 쏙! 최고예요' : '다음 판엔 새것이 나와요') : '길을 바꿔 다시 그어 봐요';
  else if (s.drawing) hint = S.ink <= 0.003 ? '잉크 끝! 떼면 출발' : '떼면 굳어서 출발! (하얀 점 = 굴러갈 길)';
  else if (S.moving) hint = '데굴데굴~ 구경해요';
  else if (S.dashes > 0) hint = `✋ 멈췄어요 — 한 번 더 그어요 (남은 선 ${left})`;
  else if (s.stage === 0 && !s.drew) hint = '👆 출발대에서 집까지 길을 쓱 그려요!';
  font(0.036, 900);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff6dc';
  ctx.strokeStyle = 'rgba(20,50,90,.75)';
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  const hy = by0 - R2(0.03);
  ctx.strokeText(hint, w / 2, hy, w - R2(0.06));
  ctx.fillText(hint, w / 2, hy, w - R2(0.06));
  drawCards(ctx, s, w, R2, font, fx);
}
/** 지금 이 순간 이미 딴 별 조건 (결과 화면에선 확정값) */
function goalsNow(s: RollState): boolean[] {
  if (s.phase === 'result') return s.ok ? s.starOk : s.L.d.goals.map(() => false);
  const S = s.S, d = s.L.d;
  return d.goals.map((g) => (g === 'stars' ? S.stars.every((q) => q.got >= 0) : g === 'one' ? false : g === 'half' ? false : false));
}
function drawCards(ctx: C2, s: RollState, w: number, R2: (r: number) => number, font: (sz: number, wgt?: number) => void, fx: ReturnType<typeof juice>) {
  const d = s.L.d, t = s.t;
  let head = '', sub = '', a = 0, age = 0, cy = R2(0.4);
  if (s.phase === 'result') {
    age = s.pt;
    a = Math.min(1, age / 8);
    cy = R2(s.ok ? 0.74 : 0.7);
    if (s.ok) head = s.won ? '모든 집에 쏙! 🎉' : s.S.balls.length > 1 ? '둘 다 쏙쏙!' : '집에 쏙!';
    else {
      head = s.failKind === 'stop' ? '멈춰 버렸어요…' : '앗, 풍덩!';
      sub = d.safe ? '이 판은 하트가 안 깎여요 · 다시!' : s.hearts > 0 ? '하트 -1 · 같은 판 다시' : '하트가 없어요 — 끝';
    }
  } else if (s.banner && !s.drawing && s.S.dashes === 0 && t - s.banner.t < 170) {
    age = t - s.banner.t;
    a = Math.min(1, age / 8, (170 - age) / 25);
    cy = R2(s.stage === 0 && !s.again ? 0.43 : 0.33);
    (head = s.banner.head), (sub = s.banner.sub);
  }
  if (!head || a <= 0) return;
  const pop = Math.min(1, 0.5 + age / 10);
  ctx.save();
  ctx.globalAlpha = a;
  font(0.054);
  const w1 = ctx.measureText(head).width;
  font(0.034, 800);
  const w2 = sub ? ctx.measureText(sub).width : 0;
  const okRes = s.phase === 'result' && s.ok;
  const cw = Math.min(w - R2(0.04), Math.max(w1, w2, okRes ? R2(0.62) : 0) + R2(0.1)), ch = (okRes ? R2(0.25) : sub ? R2(0.15) : R2(0.09)) * pop;
  ctx.translate(w / 2, cy);
  ctx.fillStyle = 'rgba(60,30,10,.3)';
  rr(ctx, -cw / 2 + 3, -ch / 2 + 5, cw, ch, R2(0.035));
  ctx.fill();
  ctx.fillStyle = lin(ctx, 0, -ch / 2, 0, ch / 2, [0, '#fffaf0'], [1, '#ffe8c0']);
  rr(ctx, -cw / 2, -ch / 2, cw, ch, R2(0.035));
  ctx.fill();
  ctx.strokeStyle = '#8a5a20';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = s.phase === 'result' ? (s.ok ? '#ff6a3a' : '#7a8aa8') : '#3d9df5';
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo((sd * cw) / 2, -ch * 0.25);
    ctx.lineTo(sd * (cw / 2 + R2(0.035)), -ch * 0.3);
    ctx.lineTo(sd * (cw / 2 + R2(0.02)), 0);
    ctx.lineTo(sd * (cw / 2 + R2(0.035)), ch * 0.3);
    ctx.lineTo((sd * cw) / 2, ch * 0.25);
    ctx.closePath();
    ctx.fill();
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  font(0.054);
  ctx.fillStyle = s.phase === 'result' ? (s.ok ? '#d0500a' : '#5a6a88') : '#2a5a9a';
  if (okRes) {
    ctx.fillText(head, 0, -R2(0.075), w - R2(0.1));
    const nS = s.starOk.length;
    for (let j = 0; j < nS; j++) {
      const ag = s.pt - (16 + j * 14), sx = (j - (nS - 1) / 2) * R2(0.2);
      const popS = ag < 0 ? 0.8 : ag < 8 ? 1.9 - 0.9 * (ag / 8) : 1;
      starPath(ctx, sx, -R2(0.005), R2(0.038) * popS);
      ctx.fillStyle = ag >= 0 && s.starOk[j] ? '#ffc93a' : 'rgba(90,50,20,.15)';
      ctx.fill();
      ctx.strokeStyle = ag >= 0 && s.starOk[j] ? '#9a5a08' : 'rgba(90,50,20,.35)';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      if (ag >= 0 && s.starOk[j] && (fx.memo['st' + j] ?? -1) < t - ag) (fx.memo['st' + j] = t - ag), fx.burst(w / 2 + sx, cy, '#ffd23a', 16, 3, 2.4);
      font(0.028, 800);
      ctx.fillStyle = s.starOk[j] ? '#6a4a1a' : 'rgba(106,74,26,.5)';
      ctx.fillText(GOAL_TEXT(d.goals[j], d), sx, R2(0.055), R2(0.2));
    }
  } else {
    ctx.fillText(head, 0, sub ? -R2(0.028) : R2(0.002), w - R2(0.1));
    if (sub) {
      font(0.034, 800);
      ctx.fillStyle = sub.startsWith('NEW') ? '#d0402a' : '#6a4a2a';
      ctx.fillText(sub, 0, R2(0.035), w - R2(0.1));
    }
  }
  ctx.restore();
}

/** 시험·스크린샷용: k판(0부터)으로 바로 */
export function jumpTo(s: RollState, k: number) {
  s.stage = k;
  s.again = false;
  newStage(s);
}
/** 시험용 속살 (판 설계 도구가 쓴다) */
export const __t = { layout, newSim, cloneSim, tick, verdict, penDown, penMove, penUp, dash, trial, plan, catmull, anchors, frontOf, doorPt, value, slide, fallPath, resample };
