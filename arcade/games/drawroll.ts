/**
 * 그려서 굴리는 햄스터 공 (36라운드: 직접 만지는 물리 장난감 — 한 번 긋기)
 *   그린 선이 길이 된다(drawline) × 가리키기(pointer).
 * 손짓 하나: 한 번 긋기. 손가락이 지나간 자리에 바로 굵은 크레용 선이 그려지고, 떼는 순간 그 선이 나무 길로 굳으며
 *   햄스터 공이 '출발!' 하고 진짜 물리(중력·경사·튕김)로 그 위를 굴러간다. 공이 구르는 동안엔 손을 쉬어도 된다(시간 압박 없음).
 *   공이 길 위에서 멈추면(낭떠러지·집 말고) 남은 잉크로 한 번 더 긋고, 떼면 다시 출발.
 * 규칙(결정적): 고정 간격(1/60, 안에서 2번 나눔) 원 vs 선분 사슬 충돌. 선은 사람이 그린 그대로(점 간격만 0.03으로 고름).
 *   잉크(그을 수 있는 길이)와 선 수는 판마다 정해져 있다. 공이 강·화면 밖으로 떨어지거나, 선을 다 쓰고 멈추면 그 판 다시(하트 −1, 1·2판은 안 깎임).
 * 와우: 내가 그린 삐뚤빼뚤한 선이 그대로 나무 길이 되어 햄스터 공이 데굴데굴 굴러가며 별을 줍고, 끊긴 끝에서 붕 날아 집 구멍에 쏙.
 * 판 8개(하는 일이 바뀐다): 첫 길 → 별 줍기(길 모양을 휘기) → 낭떠러지(잉크가 모자라 끝을 올려 점프) → 용수철(떨어뜨려 튕기기)
 *   → 바람 기둥(들어가는 빠르기로 높이 정하기) → 단추 문(단추를 먼저 밟는 길) → 고리(빠르기를 모아 한 바퀴) → 쌍둥이(한 길로 둘 다).
 * 웃음: 공 속 햄스터는 달리고(빠르면 뒤집혀 빙글), 날면 만세, 떨어지면 '풍덩' 하고 눈이 빙글빙글. 지붕 위 참새가 구경하며 놀란다.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5;
/** 물리 (화면 폭 = 1) */
const G = 2.4, R = 0.06, LT = 0.011, SUB = 2, DT = 1 / 60 / SUB;
/** 떼는 순간 햄스터가 달려 나가는 빠르기 · 구름 저항 · 닿아 있을 때 감쇠 · 튕김 */
const DASH = 0.25, DRIVE = 0.55, DRIVE_T = 26, ROLL_FR = 0.2, DAMP = 0.1, AIR = 0.02, BOUNCE = 0.3;
const SPRING_V = 1.95, WIND_V = -1.75, WIND_KY = 3.4, WIND_KX = 0.35, WIND_FADE = 0.16, WIND_CURL = 0.9;
const REST_V = 0.05, REST_T = 30, ROLL_MAX = 60 * 14;
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
    pads: [[0.19, 0.44]], house: [0.86, 1.24], stars: [], ink: 1.6, strokes: 2, goals: ['home'], safe: true,
    demo: [[0.23, 0.45], [0.36, 0.6], [0.5, 0.86], [0.62, 1.08], [0.73, 1.23]],
  },
  {
    name: '별 줍기', key: 'star', news: '⭐ 별 — 공이 지나가면 주워요', hint: '길을 휘어서 별 쪽으로 지나가게!',
    blocks: [[0, 0.4, 0.22, 1.6, CLIFF]],
    ground: [[0.2, 1.02], [0.42, 1.1], [0.66, 1.2], [1.02, 1.2]],
    pads: [[0.19, 0.4]], house: [0.86, 1.2], stars: [[0.5, 0.72]], ink: 1.4, strokes: 2, goals: ['home', 'stars'], safe: true,
    spot: [0.5, 0.72, 0.09, 0.09],
  },
  {
    name: '낭떠러지', key: 'jump', news: '🪂 잉크가 모자라요 — 끝을 올려 붕!', hint: '끝을 위로 휘면 공이 붕 날아요',
    blocks: [[0, 0.3, 0.24, 1.6, CLIFF], [0.78, 0.5, 1.02, 1.6, CLIFF]],
    pads: [[0.21, 0.3]], house: [0.9, 0.5], stars: [[0.6, 0.24]], ink: 0.45, strokes: 2, goals: ['home', 'stars', 'one'],
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
    blocks: [[0, 0.3, 0.2, 1.6, CLIFF], [0.36, 1.1, 0.76, 1.6, CLIFF]],
    ground: [[0.74, 1.1], [0.84, 1.07], [0.92, 0.98], [1.02, 0.8]],
    btn: [0.93, 0.95], gate: true, pads: [[0.17, 0.3]], house: [0.52, 1.1, 1], stars: [[0.52, 0.5]], ink: 0.8, strokes: 2, goals: ['home', 'stars', 'one'],
    spot: [0.93, 0.95, 0.08, 0.08],
  },
  {
    name: '고리', key: 'loop', news: '🎡 고리 — 빠르면 한 바퀴 빙글!', hint: '높이에서 쭉 내려와야 한 바퀴 돌아요',
    blocks: [[0, 0.36, 0.18, 1.6, CLIFF], [0.42, 1.18, 1.02, 1.6, WOOD]],
    loop: [0.65, 1.05, 0.13], pads: [[0.15, 0.36]], house: [0.92, 1.18], stars: [[0.65, 0.97], [0.3, 0.8]], ink: 0.9, strokes: 2, goals: ['home', 'stars', 'half'],
    spot: [0.65, 1.05, 0.17, 0.17],
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
interface Ball { x: number; y: number; vx: number; vy: number; drv: number; dd: number; rot: number; nx: number; ny: number; con: boolean; air: number; slow: number; home: number; out: boolean; hop: boolean; spun: number }
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
    balls: L.pads.map((p) => ({ x: p.x, y: p.y - R, vx: 0, vy: 0, drv: 0, dd: L.dir, rot: 0, nx: 0, ny: -1, con: true, air: 0, slow: REST_T, home: -1, out: false, hop: false, spun: 0 })),
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
    if (b.air === 27 && !b.hop) (b.hop = true), S.ev?.('air', b.x, b.y);
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
  if (!s.again) s.banner = { head: `${s.stage + 1}판 · ${d.name}`, sub: d.news ? `NEW  ${d.news}` : d.goals.map((g) => GOAL_TEXT(g, d))[0], t: s.t };
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
  } else for (let i = 0; i < 90; i++) tryPar(randPar());
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
function drawAll(ctx: CanvasRenderingContext2D, s: RollState, w: number, h: number, th: Theme) {
  const fx = juice(s);
  void fx;
  void th;
  ctx.fillStyle = '#8fd6ff';
  ctx.fillRect(0, 0, w, h);
}

/** 시험·스크린샷용: k판(0부터)으로 바로 */
export function jumpTo(s: RollState, k: number) {
  s.stage = k;
  s.again = false;
  newStage(s);
}
/** 시험용 속살 (판 설계 도구가 쓴다) */
export const __t = { layout, newSim, cloneSim, tick, verdict, penDown, penMove, penUp, dash, trial, plan, catmull, anchors, frontOf, doorPt, value, slide, fallPath, resample };
