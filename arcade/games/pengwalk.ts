/**
 * 🐧 펭귄 떼 길잡이 (37라운드: 살아 움직이는 세계 — 톡) — 길잡이 놓기 × 몰이.
 * 세상은 저절로 움직인다: 펭귄들이 왼쪽 위 굴에서 줄지어 뒤뚱뒤뚱 걸어 나와, 얼음 절벽에 깎인 세 층 길을 지그재그로 내려가
 *   오른쪽 아래 이글루로 간다. 길에는 낭떠러지(틈)·얼음벽·물살·미끄러운 비탈·바다표범이 있다.
 * 손이 하는 일은 하나: 길·장애를 직접 톡. 그 자리에 맞는 도구가 저절로 정해져 쑥 솟는다 —
 *   틈 → 얼음 다리(배로 쭉 미끄러져 건넘) · 벽 앞 → 눈 점프대(통 튀어 공중제비) · 물살 → 얼음 뗏목(3마리씩 건네줌)
 *   · 비탈 → 미끄럼(슝). 갈림길 표지판을 톡 하면 화살표가 바뀌어 줄이 다른 길로 간다(얼음 안 듦). 카드·단추 고르기 없음.
 * 규칙(결정적, 고정 간격): 펭귄은 앞 펭귄과 간격을 두고 걷고, 못 지나는 곳 앞에서는 줄이 선다(판 시작 5초·1판 11초는 아무도 안 빠짐). 맨 앞은 끝에서
 *   2.4초 휘청이다 퐁(벽이면 쿵 — 어질어질하다 비틀 퐁). 빠진 펭귄은 바다를 헤엄쳐 굴로 돌아가 줄 맨 뒤에 다시 선다(늦어짐),
 *   두 번 빠지면 바닷가 얼음에 앉아 덜덜(못 감). 얼음 조각(도구 수)은 판마다 정해져 있다.
 * 와우: 도구가 쩡 솟는 순간, 줄 서 있던 펭귄들이 차례로 배로 쭉 미끄러지고 통 튀어 공중제비 — 수십 번 같은 동작이 줄줄이.
 * 판 6개: 목표 = 정한 수 이상을 이글루에. 별(판마다 하나씩 늘림) = 펭귄 N마리 집으로 · 아무도 안 빠지기 · 얼음 N개만 쓰기.
 *   실패 = 줄이 다 끝났는데 집에 간 펭귄이 모자람 → 하트 -1, 같은 판 다시. 하트 셋을 다 잃거나 6판을 마치면 끝.
 * 펼쳐짐(하는 일이 바뀐다): 1 얼음 다리(틈을 톡) → 2 점프대(벽 앞을 톡 — 자리마다 도구가 다름) → 3 갈림길·바다표범
 *   (표지판을 톡 해 줄을 돌림) → 4 뗏목·물살(길을 돌려 더 싼 길로) → 5 미끄럼 비탈(얼음을 아끼는 길 고르기)
 *   → 6 금 간 다리(다섯 마리 지나면 깨짐 — 지나간 자리를 다시 톡).
 * 고민: 얼음은 모자라고 길은 갈린다 — 어느 길로 보내고, 어디에 얼음을 쓰고, 무엇을 아낄지. 늘 맨 앞 펭귄 앞을 톡 하면
 *   기본 길의 장애를 다 막느라 얼음이 모자라거나 바다표범에게 가고, 깨진 다리를 못 본다.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5;
/** 세 층 길의 땅 높이 · 바다 · 아래 띠 (화면 폭 단위) */
const Y0 = 0.4, Y1 = 0.68, Y2 = 0.96, SEA = 1.09, BAND = 1.19;
const BURROW_X = 0.07, DOOR_X = 0.79, IGLOO_X = 0.865;
/** 걷는 빠르기(폭/틱) · 줄 간격 · 굴에서 나오는 간격 */
const V = 0.14 / 60, QS = 0.072, SPAWN_T = 42;
/** 휘청 · 어질 시간 · 판이 시작되고 아무도 안 빠지는 시간(1판 첫 시도 11초, 그 밖 5초) */
const TEETER_T = 144, BONK_T = 110, FIRST_SAFE = 660, STAGE_SAFE = 300;
const BRIDGE_K = 3, SLIDE_K = 3.4, CHUTE_K = 2.4;
const JUMP_T = 42, RAMP_L = 0.085;
/** 도구를 보면 신나서 뛰어감 · 다리를 건넌 뒤 배로 쭉 미끄러지는 거리 */
const RUN_K = 1.8, RUN_D = 0.32, BOOST = 0.15;
const RAFT_CAP = 3, RAFT_V = 0.17 / 60, RAFT_WAIT = 40;
const SWIM_V = 0.32 / 60, BACK_T = 50, ENTER_T = 26;
const RESULT_OK = 180, RESULT_FAIL = 160, BANNER_T = 170, SPOT_T = 260, STAGE_MAX = 60 * 100;
const STAR_PTS = 100, CLEAR_PTS = 50, HOME_PTS = 10, ICE_PTS = 20, WIN_PTS = 300;

/** 장애 */
const GAP = 0, WALL = 1, WATER = 2, SLOPE = 3, SEAL = 4;
const TOOL = ['다리', '점프대', '뗏목', '미끄럼', ''];
/** 길 조각 종류 */
const WALKL = 0, STEPS = 1, CHUTE = 2, SLOPEL = 3;
const HOME = -1, FORK = -2;
/** 펭귄 상태 */
const IN = 0, GO = 1, TEETER = 2, BONK = 3, JUMP = 4, RAFT = 5, FLY = 6, SWIM = 7, BACK = 8, OUT = 9, ENTER = 10;
/** 빠지는 모양 */
const F_FALL = 0, F_SEAL = 1, F_TUMBLE = 2, F_STAGGER = 3, F_SWEPT = 4;

interface HazDef { k: number; leg: number; x0?: number; x1?: number }
interface StageDef {
  key: string;
  name: string;
  news: string;
  spot: string;
  hint: string;
  n: number;
  goal: number;
  ice: number;
  /** 톡 한 곳에서 가장 가까운 장애로 붙는 거리 (1판은 화면 어디든) */
  snap: number;
  /** 화면이 뜰 때 이미 걸어 나와 있는 펭귄 수 */
  pre: number;
  /** 갈림길 x · 처음 화살표(0 → 곧장, 1 ↓ 미끄럼 굴) */
  fork: { f: number; def: number } | null;
  /** 가운데 층 오른쪽 길이 끝나 아래로 내려가는 x */
  g: number;
  slope?: boolean;
  /** 금 간 다리: 이 수만큼 지나면 깨짐 */
  crack?: number;
  star3?: number;
  haz: HazDef[];
}

export const STAGES: StageDef[] = [
  {
    key: 'bridge', name: '첫 다리', news: '', spot: '얼음 다리', hint: '틈을 톡 하면 얼음 다리가 솟아요',
    n: 8, goal: 6, ice: 2, snap: 9, pre: 3, fork: null, g: 0.42,
    haz: [{ k: GAP, leg: 0, x0: 0.52, x1: 0.65 }],
  },
  {
    key: 'ramp', name: '얼음벽', news: '점프대 — 벽 앞을 톡 하면 통 넘어요', spot: '얼음벽', hint: '벽 앞을 톡 = 점프대, 틈을 톡 = 다리',
    n: 10, goal: 7, ice: 2, snap: 0.25, pre: 1, fork: null, g: 0.4,
    haz: [{ k: WALL, leg: 0, x0: 0.5, x1: 0.57 }, { k: GAP, leg: 5, x0: 0.57, x1: 0.7 }],
  },
  {
    key: 'fork', name: '갈림길', news: '갈림길 — 표지판을 톡 하면 길이 바뀌어요', spot: '표지판', hint: '바다표범 쪽은 위험! 표지판을 톡',
    n: 11, goal: 8, ice: 3, snap: 0.17, pre: 1, fork: { f: 0.53, def: 1 }, g: 0.68, star3: 2,
    haz: [{ k: GAP, leg: 0, x0: 0.27, x1: 0.4 }, { k: WALL, leg: 1, x0: 0.71, x1: 0.78 }, { k: SEAL, leg: 7, x0: 0.26 }],
  },
  {
    key: 'raft', name: '물살 뗏목', news: '뗏목 — 물살을 톡 하면 3마리씩 건네줘요', spot: '물살', hint: '얼음이 덜 드는 길은 어느 쪽?',
    n: 11, goal: 8, ice: 2, snap: 0.17, pre: 1, fork: { f: 0.5, def: 0 }, g: 0.66, star3: 1,
    haz: [{ k: GAP, leg: 1, x0: 0.62, x1: 0.75 }, { k: GAP, leg: 3, x0: 0.72, x1: 0.85 }, { k: WATER, leg: 7, x0: 0.15, x1: 0.39 }],
  },
  {
    key: 'slide', name: '미끄럼 비탈', news: '미끄럼 — 비탈을 톡 하면 슝 내려가요', spot: '비탈', hint: '얼음을 아끼는 길을 골라요',
    n: 12, goal: 8, ice: 3, snap: 0.17, pre: 1, fork: { f: 0.4, def: 1 }, g: 0.62, slope: true, star3: 2,
    haz: [{ k: SLOPE, leg: 2 }, { k: GAP, leg: 5, x0: 0.63, x1: 0.75 }, { k: GAP, leg: 7, x0: 0.16, x1: 0.28 }, { k: WALL, leg: 9, x0: 0.33, x1: 0.4 }],
  },
  {
    key: 'crack', name: '금 간 다리', news: '금 간 다리 — 다섯 마리 지나면 깨져요', spot: '금 간 얼음', hint: '깨진 다리는 다시 톡!',
    n: 12, goal: 8, ice: 5, snap: 0.17, pre: 1, fork: { f: 0.52, def: 0 }, g: 0.66, crack: 5, star3: 4,
    haz: [{ k: GAP, leg: 0, x0: 0.28, x1: 0.41 }, { k: WALL, leg: 1, x0: 0.7, x1: 0.77 }, { k: WATER, leg: 7, x0: 0.15, x1: 0.39 }],
  },
];
export const STAGE_COUNT = STAGES.length;

// ───────────────────────────── 길 ─────────────────────────────
interface Leg { ax: number; ay: number; bx: number; by: number; len: number; kind: number; next: number; rank: number; dir: number }
interface Haz {
  k: number; leg: number; u0: number; u1: number; xa: number; xb: number; y: number;
  fixed: boolean; entered: number; on: number; raft: Raft | null;
  riseT: number; slapT: number; brokeT: number; uses: number; chainN: number; lastUse: number;
}
interface Raft { p: number; mv: number; riders: number[]; lastBoard: number; nextOff: number }
interface Peng {
  id: number; st: number; leg: number; u: number; x: number; y: number; t: number;
  wet: boolean; face: number; ph: number; seat: number; how: number; hz: number; boost: number;
  ax: number; ay: number; bx: number; by: number; dur: number; hop: number; spin: number;
}
interface Sim {
  st: number; d: StageDef; legs: Leg[]; byLeg: number[][]; haz: Haz[]; pens: Peng[]; queue: number[]; nextSpawn: number;
  sign: number; signT: number; ice: number; used: number; home: number; falls: number; outN: number; first: boolean;
}
interface Ev { t: number; kind: string; x: number; y: number; text?: string; n?: number }

export interface PengState extends Sim {
  rng: Rng; seed: number; t: number; stage: number; phase: 'play' | 'result'; pt: number; seeds: number[];
  hearts: number; stars: number; got: number; starOk: boolean[]; pts: number; ok: boolean; why: string;
  down: boolean; seen: Set<string>; banner: { head: string; sub: string; t: number } | null;
  spot: { x: number; y: number; r: number; t: number; label: string } | null;
  events: Ev[]; dead: boolean; won: boolean; tries: number; again: boolean; firstTap: number; wowN: number; taps: number;
}

function mkLeg(ax: number, ay: number, bx: number, by: number, kind: number, next: number, rank: number): Leg {
  return { ax, ay, bx, by, len: Math.hypot(bx - ax, by - ay), kind, next, rank, dir: bx >= ax ? 1 : -1 };
}
/** 길 조각 10개: 0 위층(굴→갈림길) · 1 위층 오른쪽 · 2 계단/비탈 · 3 가운데층 오른쪽 · 4 계단 · 5 아래층(→이글루)
 *  · 6 미끄럼 굴 · 7 가운데층 왼쪽 · 8 계단 · 9 아래층 왼쪽 */
function buildLegs(d: StageDef): Leg[] {
  const f = d.fork ? d.fork.f : 0.9, g = d.g;
  return [
    mkLeg(BURROW_X, Y0, f, Y0, WALKL, d.fork ? FORK : 2, 0),
    mkLeg(f, Y0, 0.9, Y0, WALKL, 2, 1),
    d.slope ? mkLeg(0.9, Y0, 0.72, Y1, SLOPEL, 3, 2) : mkLeg(0.9, Y0, 0.95, Y1, STEPS, 3, 2),
    mkLeg(d.slope ? 0.72 : 0.95, Y1, g, Y1, WALKL, 4, 3),
    mkLeg(g, Y1, g - 0.055, Y2, STEPS, 5, 4),
    mkLeg(g - 0.055, Y2, DOOR_X, Y2, WALKL, HOME, 5),
    mkLeg(f, Y0, f - 0.055, Y1, CHUTE, 7, 1),
    mkLeg(f - 0.055, Y1, 0.115, Y1, WALKL, 8, 2),
    mkLeg(0.115, Y1, 0.06, Y2, STEPS, 9, 3),
    mkLeg(0.06, Y2, g - 0.055, Y2, WALKL, 5, 4),
  ];
}
const legPos = (L: Leg, u: number): [number, number] => {
  const k = L.len > 0 ? u / L.len : 0;
  return [L.ax + (L.bx - L.ax) * k, L.ay + (L.by - L.ay) * k];
};
const nextLeg = (S: Sim, li: number) => {
  const n = S.legs[li].next;
  return n === FORK ? (S.sign ? 6 : 1) : n;
};

function buildHaz(d: StageDef, legs: Leg[], rng: Rng): { haz: Haz[]; byLeg: number[][] } {
  const haz: Haz[] = [];
  for (const hd of d.haz) {
    const L = legs[hd.leg];
    const j = (rng() - 0.5) * 0.026;
    let u0 = 0, u1 = L.len, xa = L.ax, xb = L.bx;
    if (hd.k !== SLOPE) {
      xa = (hd.x0 ?? 0.5) + j;
      xb = (hd.x1 ?? hd.x0 ?? 0.5) + j;
      if (L.dir > 0) (u0 = xa - L.ax), (u1 = xb - L.ax);
      else (u0 = L.ax - xb), (u1 = L.ax - xa);
    } else (u0 = 0.004), (u1 = L.len);
    haz.push({ k: hd.k, leg: hd.leg, u0, u1, xa: Math.min(xa, xb), xb: Math.max(xa, xb), y: L.ay, fixed: false, entered: 0, on: 0, raft: null, riseT: -999, slapT: -999, brokeT: -999, uses: 0, chainN: 0, lastUse: -999 });
  }
  const byLeg = legs.map(() => [] as number[]);
  haz.forEach((h, i) => byLeg[h.leg].push(i));
  for (const b of byLeg) b.sort((a, c) => haz[a].u0 - haz[c].u0);
  return { haz, byLeg };
}

// ───────────────────────────── 시뮬레이션 ─────────────────────────────
const ev = (E: PengState | null, kind: string, x: number, y: number, text?: string, n?: number) => E && E.events.push({ t: E.t, kind, x, y, text, n });
function see(E: PengState | null, key: string) {
  if (E && key && !E.seen.has(key)) E.seen.add(key);
}
const wow = (E: PengState | null) => E && E.wowN++;
const solid = (p: Peng) => p.st === GO || p.st === TEETER || p.st === BONK;

function newPeng(id: number): Peng {
  return { id, st: IN, leg: 0, u: 0, x: BURROW_X, y: Y0, t: 0, wet: false, face: 1, ph: ((id * 0.618) % 1) * 6.28, seat: 0, how: 0, hz: -1, boost: 0, ax: 0, ay: 0, bx: 0, by: 0, dur: 1, hop: 0, spin: 0 };
}

function setPos(S: Sim, p: Peng) {
  const L = S.legs[p.leg];
  [p.x, p.y] = legPos(L, Math.min(p.u, L.len));
  p.face = L.dir;
}

/** 앞 펭귄까지 남은 거리 (같은 길 조각 · 다음 조각 앞머리) */
function gapAhead(S: Sim, p: Peng): number {
  const L = S.legs[p.leg], nl = nextLeg(S, p.leg);
  let d = 9;
  for (const q of S.pens) {
    if (q === p || !solid(q)) continue;
    if (q.leg === p.leg) {
      if (q.u > p.u || (q.u === p.u && q.id < p.id)) d = Math.min(d, q.u - p.u);
    } else if (q.leg === nl && nl >= 0) d = Math.min(d, L.len - p.u + q.u);
  }
  return d;
}

function fly(S: Sim, p: Peng, how: number, E: PengState | null) {
  const dir = p.face;
  p.st = FLY;
  p.how = how;
  p.t = S.st;
  p.ax = p.x;
  p.ay = p.y;
  const far = how === F_SEAL ? 0.12 : how === F_FALL ? 0.04 : how === F_SWEPT ? 0.05 : how === F_TUMBLE ? 0.06 : -0.035;
  p.bx = Math.max(0.06, Math.min(0.96, p.x + dir * far));
  p.by = SEA;
  p.hop = how === F_SEAL ? 0.2 : how === F_STAGGER ? 0.03 : how === F_TUMBLE ? 0.05 : 0.025;
  p.dur = Math.round(22 + (SEA - p.y) * 55 + (how === F_SEAL ? 14 : 0));
  p.spin = how === F_SEAL ? 2 : how === F_TUMBLE ? 3 : how === F_STAGGER ? 1 : 0.6;
  S.falls++;
  if (!E) return;
  const txt = how === F_SEAL ? '통!' : how === F_TUMBLE ? '데굴데굴~' : how === F_STAGGER ? '어질…' : how === F_SWEPT ? '으아아~' : '으앗!';
  ev(E, 'oops', p.x, p.y - 0.12, txt);
  if (how === F_SEAL) see(E, 'seal');
  if (how === F_TUMBLE) see(E, 'tumble');
}

function fix(S: Sim, i: number, E: PengState | null) {
  const h = S.haz[i];
  h.fixed = true;
  h.entered = 0;
  h.on = 0;
  h.riseT = S.st;
  S.ice--;
  S.used++;
  if (h.k === WATER) h.raft = { p: 0, mv: 0, riders: [], lastBoard: S.st - 30, nextOff: 0 };
  if (!E) return;
  const [ax, ay] = anchorOf(S, i);
  ev(E, 'rise', ax, ay, h.k === WALL ? '뽕!' : h.k === WATER ? '둥실!' : h.k === SLOPE ? '슈욱!' : '쩡!', h.k);
  see(E, ['bridge', 'ramp', 'raft', 'slide'][h.k]);
  wow(E);
}

/** 도구를 쓴 순간: 줄줄이 연출 */
function used(S: Sim, h: Haz, p: Peng, E: PengState | null) {
  h.uses++;
  h.chainN = S.st - h.lastUse < 56 ? h.chainN + 1 : 1;
  h.lastUse = S.st;
  if (!E) return;
  const words = [['쭉~', '쭈욱~', '쭉!'], ['통!', '휘릭!', '통통!'], ['폴짝', '폴짝!', '쏙'], ['슝~', '슈웅~', '슝!']][h.k] ?? ['!'];
  ev(E, 'use', p.x, p.y - 0.13, words[h.uses % 3], h.k);
  if (h.chainN % 3 === 0) {
    ev(E, 'chain', p.x, p.y - 0.2, `줄줄이 ${h.chainN}!`, h.chainN);
    wow(E);
  }
}

function walk(S: Sim, p: Peng, E: PengState | null) {
  const L = S.legs[p.leg];
  let k = L.kind === CHUTE ? CHUTE_K : 1;
  let stop = -1, stopH = -1;
  let h: Haz | null = null, hi = -1;
  for (const j of S.byLeg[p.leg]) {
    const q = S.haz[j];
    if (q.u1 >= p.u - 1e-9) {
      h = q;
      hi = j;
      break;
    }
  }
  if (h) {
    if (h.k === GAP) {
      if (p.u >= h.u0 - 1e-9) k = BRIDGE_K;
      else if (!(h.fixed && !(S.d.crack && h.entered >= S.d.crack))) (stop = h.u0 - 0.02), (stopH = hi);
      else if (p.u > h.u0 - RUN_D) k = RUN_K;
    } else if (h.k === WALL) {
      if (!h.fixed) (stop = h.u0 - 0.03), (stopH = hi);
      else if (p.u > h.u0 - RAMP_L - RUN_D) k = RUN_K;
    } else if (h.k === WATER) {
      if (p.u < h.u0) (stop = h.u0 - 0.02), (stopH = hi);
    } else if (h.k === SLOPE) {
      if (h.fixed) k = SLIDE_K;
      else if (p.u <= h.u0 + 1e-9) (stop = h.u0), (stopH = hi);
    }
  }
  if (p.boost > 0) k = Math.max(k, 1 + 2.4 * Math.min(1, p.boost / BOOST));
  const room = gapAhead(S, p) - QS;
  let mv = Math.max(0, Math.min(V * k, room));
  if (stop >= 0) mv = Math.min(mv, Math.max(0, stop - p.u));
  const old = p.u;
  p.u += mv;
  if (p.boost > 0) p.boost = Math.max(0, p.boost - Math.max(mv, V * 0.6));
  setPos(S, p);
  if (h) {
    if (h.k === GAP && h.fixed && old < h.u0 && p.u >= h.u0) {
      h.entered++;
      h.on++;
      used(S, h, p, E);
      see(E, 'slidebelly');
    }
    if (h.k === GAP && old <= h.u1 && p.u > h.u1 && old >= h.u0 - 1e-9) {
      h.on = Math.max(0, h.on - 1);
      p.boost = BOOST;
      if (S.d.crack && h.fixed && h.entered >= S.d.crack && h.on === 0) {
        h.fixed = false;
        h.brokeT = S.st;
        if (E) {
          ev(E, 'crack', (h.xa + h.xb) / 2, h.y, '쩍! 와르르', 0);
          see(E, 'broke');
        }
      }
    }
    if (h.k === WALL && h.fixed && p.u >= h.u0 - RAMP_L) return jump(S, p, h, hi, E);
    if (h.k === SEAL && p.u >= h.u0) {
      h.slapT = S.st;
      return fly(S, p, F_SEAL, E);
    }
    if (h.k === SLOPE && h.fixed && old <= h.u0 + 1e-9 && p.u > h.u0) used(S, h, p, E);
  }
  if (stop >= 0 && p.u >= stop - 1e-6 && stopH >= 0) {
    const q = S.haz[stopH];
    if (q.k === WATER && q.fixed && q.raft) {
      const R = q.raft;
      if (R.mv === 0 && R.riders.length < RAFT_CAP && S.st - R.lastBoard >= 9) {
        p.st = RAFT;
        p.t = S.st;
        p.hz = stopH;
        p.ax = p.x;
        p.ay = p.y;
        R.riders.push(p.id);
        R.lastBoard = S.st;
        used(S, q, p, E);
        see(E, 'raftride');
      }
      return;
    }
    p.st = q.k === WALL ? BONK : TEETER;
    p.t = S.st;
    p.hz = stopH;
    if (E) {
      if (q.k === WALL) ev(E, 'bonk', p.x + p.face * 0.02, p.y - 0.08, '쿵!'), see(E, 'bonk');
      else ev(E, 'eek', p.x, p.y - 0.13, '어? 어?');
    }
    return;
  }
  if (p.u >= L.len - 1e-9) {
    const n = nextLeg(S, p.leg);
    if (n === HOME) {
      p.st = ENTER;
      p.t = S.st;
      S.home++;
      if (E) {
        ev(E, 'home', IGLOO_X, Y2 - 0.1, `+1`, S.home);
        see(E, 'home');
      }
      return;
    }
    if (L.next === FORK && E) see(E, S.sign ? 'chute' : 'straight');
    if (L.kind === CHUTE || L.kind === SLOPEL) p.boost = BOOST * (L.kind === SLOPEL ? 1.3 : 0.8);
    p.u -= L.len;
    p.leg = n;
    setPos(S, p);
  }
}

function jump(S: Sim, p: Peng, h: Haz, hi: number, E: PengState | null) {
  const L = S.legs[h.leg];
  const [lx, ly] = legPos(L, Math.min(L.len, h.u1 + 0.055));
  p.st = JUMP;
  p.t = S.st;
  p.hz = hi;
  p.ax = p.x;
  p.ay = p.y;
  p.bx = lx;
  p.by = ly;
  p.dur = JUMP_T;
  p.hop = 0.165;
  used(S, h, p, E);
  see(E, 'flip');
}

function raftTick(S: Sim, h: Haz, E: PengState | null) {
  const R = h.raft!;
  const span = Math.max(0.05, h.u1 - h.u0);
  if (R.mv === 0) {
    if (R.riders.length >= RAFT_CAP || (R.riders.length > 0 && S.st - R.lastBoard >= RAFT_WAIT)) R.mv = 1;
  } else if (R.mv === 1) {
    R.p += RAFT_V / span;
    if (R.p >= 1) (R.p = 1), (R.mv = 2), (R.nextOff = S.st + 8);
  } else if (R.mv === 2) {
    if (!R.riders.length) R.mv = 3;
    else if (S.st >= R.nextOff) {
      const land = h.u1 + 0.025;
      const busy = S.pens.some((q) => solid(q) && q.leg === h.leg && q.u >= h.u1 - 0.01 && q.u < land + QS);
      if (!busy) {
        const p = S.pens[R.riders.shift()!];
        p.st = GO;
        p.leg = h.leg;
        p.u = land;
        setPos(S, p);
        R.nextOff = S.st + 11;
        if (E) ev(E, 'hop', p.x, p.y - 0.1, '폴짝');
      }
    }
  } else {
    R.p -= (RAFT_V * 1.7) / span;
    if (R.p <= 0) (R.p = 0), (R.mv = 0);
  }
  // 탄 펭귄 자리
  const L = S.legs[h.leg];
  const [nx, ny] = legPos(L, h.u0 - 0.005), [fx2] = legPos(L, h.u1 + 0.005);
  const cx = nx + (fx2 - nx) * R.p;
  R.riders.forEach((id, k) => {
    const p = S.pens[id];
    const sx = cx + (k - (R.riders.length - 1) / 2) * 0.042;
    const hopIn = Math.min(1, (S.st - p.t) / 12);
    p.x = p.ax + (sx - p.ax) * hopIn;
    p.y = ny + 0.012 - Math.sin(hopIn * Math.PI) * 0.05;
    p.seat = k;
    p.face = L.dir;
  });
}

function tick(S: Sim, E: PengState | null) {
  S.st++;
  if (S.queue.length && S.st >= S.nextSpawn) {
    const blocked = S.pens.some((q) => solid(q) && q.leg === 0 && q.u < QS + 0.004);
    if (!blocked) {
      const p = S.pens[S.queue.shift()!];
      p.st = GO;
      p.leg = 0;
      p.u = 0;
      p.t = S.st;
      setPos(S, p);
      S.nextSpawn = S.st + SPAWN_T;
    }
  }
  for (const h of S.haz) if (h.raft) raftTick(S, h, E);
  // 앞에 있는 펭귄부터 (뒤 펭귄이 막히지 않게)
  const order = S.pens.filter(solid).sort((a, b) => S.legs[b.leg].rank - S.legs[a.leg].rank || b.u - a.u);
  for (const p of order) {
    if (p.st === GO) walk(S, p, E);
    else if (p.st === TEETER) {
      const h = S.haz[p.hz];
      const open = h.k === GAP ? h.fixed && !(S.d.crack && h.entered >= S.d.crack) : h.fixed;
      if (open) p.st = GO;
      else {
        const end = Math.max(p.t + TEETER_T, S.first ? FIRST_SAFE : STAGE_SAFE);
        if (S.st >= end) fly(S, p, h.k === SLOPE ? F_TUMBLE : h.k === WATER ? F_SWEPT : F_FALL, E);
      }
    } else if (p.st === BONK) {
      const h = S.haz[p.hz];
      if (h.fixed) jump(S, p, h, p.hz, E);
      else if (S.st >= Math.max(p.t + BONK_T, S.first ? FIRST_SAFE : STAGE_SAFE)) fly(S, p, F_STAGGER, E);
    }
  }
  for (const p of S.pens) {
    if (p.st === JUMP) {
      const k = (S.st - p.t) / p.dur;
      p.x = p.ax + (p.bx - p.ax) * k;
      p.y = p.ay + (p.by - p.ay) * k - p.hop * 4 * k * (1 - k);
      if (k >= 1) {
        const h = S.haz[p.hz], L = S.legs[h.leg];
        p.st = GO;
        p.leg = h.leg;
        p.u = Math.min(L.len, h.u1 + 0.055);
        setPos(S, p);
        if (E) ev(E, 'land', p.x, p.y, '', 0);
      }
    } else if (p.st === FLY) {
      const k = Math.min(1, (S.st - p.t) / p.dur);
      p.x = p.ax + (p.bx - p.ax) * k;
      p.y = p.ay + (p.by - p.ay) * k * k - p.hop * 4 * k * (1 - k);
      if (k >= 1) {
        p.st = SWIM;
        p.t = S.st;
        p.y = SEA;
        if (E) {
          ev(E, 'splash', p.x, SEA, '퐁!', p.how);
          see(E, 'splash');
        }
      }
    } else if (p.st === SWIM) {
      p.x -= SWIM_V;
      p.face = -1;
      if (p.x <= 0.05) {
        if (p.wet) {
          p.st = OUT;
          p.seat = S.outN++;
          p.t = S.st;
          if (E) ev(E, 'out', 0.08, SEA - 0.05, '에취!');
        } else {
          p.st = BACK;
          p.t = S.st;
        }
      }
    } else if (p.st === BACK) {
      if (S.st - p.t >= BACK_T) {
        p.st = IN;
        p.wet = true;
        S.queue.push(p.id);
        if (E) see(E, 'wet');
      }
    }
  }
}

const resolved = (S: Sim) => S.pens.every((p) => (p.st === ENTER && S.st - p.t >= ENTER_T) || p.st === OUT) || S.st > STAGE_MAX;

function anchorOf(S: Sim, i: number): [number, number] {
  const h = S.haz[i];
  if (h.k === SLOPE) {
    const L = S.legs[h.leg];
    return [(L.ax + L.bx) / 2 + 0.015, (L.ay + L.by) / 2];
  }
  if (h.k === WALL) {
    const L = S.legs[h.leg];
    return [L.dir > 0 ? h.xa - 0.025 : h.xb + 0.025, h.y - 0.045];
  }
  return [(h.xa + h.xb) / 2, h.y - 0.005];
}
const signAnchor = (S: Sim): [number, number] => [S.d.fork ? S.d.fork.f : 0.5, Y0 - 0.17];

function cloneSim(S: Sim): Sim {
  return {
    st: S.st, d: S.d, legs: S.legs, byLeg: S.byLeg,
    haz: S.haz.map((h) => ({ ...h, raft: h.raft ? { ...h.raft, riders: [...h.raft.riders] } : null })),
    pens: S.pens.map((p) => ({ ...p })), queue: [...S.queue], nextSpawn: S.nextSpawn,
    sign: S.sign, signT: S.signT, ice: S.ice, used: S.used, home: S.home, falls: S.falls, outN: S.outN, first: S.first,
  };
}

// ───────────────────────────── 판 ─────────────────────────────
function newStage(s: PengState) {
  const d = STAGES[s.stage], rng = mulberry32(s.seeds[s.stage]);
  s.d = d;
  s.legs = buildLegs(d);
  const hz = buildHaz(d, s.legs, rng);
  s.haz = hz.haz;
  s.byLeg = hz.byLeg;
  s.pens = [];
  s.queue = [];
  for (let i = 0; i < d.n; i++) {
    s.pens.push(newPeng(i));
    s.queue.push(i);
  }
  // 화면이 뜰 때 이미 줄지어 걸어 나와 있다
  const lead = d.pre >= 3 ? 0.27 : 0.1;
  for (let i = 0; i < d.pre; i++) {
    const p = s.pens[s.queue.shift()!];
    p.st = GO;
    p.leg = 0;
    p.u = Math.max(0, lead - i * 0.095);
    setPos(s, p);
  }
  s.st = 0;
  s.nextSpawn = 26;
  s.sign = d.fork ? d.fork.def : 0;
  s.signT = -999;
  s.ice = d.ice;
  s.used = 0;
  s.home = 0;
  s.falls = 0;
  s.outN = 0;
  s.first = s.stage === 0 && !s.again;
  s.phase = 'play';
  s.pt = 0;
  s.starOk = starList(s.stage).map(() => false);
  s.banner = { head: `${s.stage + 1}판 · ${d.name}`, sub: s.again ? '다시 한 번! 어디를 먼저 톡 할까요' : s.stage ? `NEW ${d.news}` : '펭귄들을 이글루까지!', t: s.t };
  see(s, d.key);
  let sp: [number, number, number] | null = null;
  if (d.key === 'ramp') sp = anchorOf(s, 0).concat(0.1) as [number, number, number];
  else if (d.key === 'fork') sp = [...signAnchor(s), 0.1] as [number, number, number];
  else if (d.key === 'raft') sp = anchorOf(s, 2).concat(0.14) as [number, number, number];
  else if (d.key === 'slide') sp = anchorOf(s, 0).concat(0.12) as [number, number, number];
  else if (d.key === 'crack') sp = anchorOf(s, 0).concat(0.1) as [number, number, number];
  s.spot = sp && !s.again ? { x: sp[0], y: sp[1], r: sp[2], t: s.t, label: d.spot } : null;
}

function starList(stage: number): string[] {
  const d = STAGES[stage], out = [`펭귄 ${d.goal}마리 집으로`];
  if (stage >= 1) out.push('아무도 안 빠지기');
  if (stage >= 2 && d.star3 !== undefined) out.push(`얼음 ${d.star3}개만 쓰기`);
  return out;
}
const starsOf = (S: Sim, stage: number) => {
  const d = STAGES[stage];
  return starList(stage).map((_, k) => (k === 0 ? S.home >= d.goal : k === 1 ? S.falls === 0 : S.used <= (d.star3 ?? 99)));
};

function endStage(s: PengState) {
  s.phase = 'result';
  s.pt = 0;
  const d = STAGES[s.stage];
  s.ok = s.home >= d.goal;
  if (s.ok) {
    s.starOk = starsOf(s, s.stage);
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    // 뒤 판일수록 별이 크다 (1판 100 → 6판 350)
    s.pts += s.got * STAR_PTS * (1 + s.stage * 0.5) + CLEAR_PTS + s.home * HOME_PTS + s.ice * ICE_PTS;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    wow(s);
    ev(s, 'clear', 0.5, 0.5, s.won ? '모두 집으로!' : '판 성공!');
  } else {
    s.why = `집에 간 펭귄 ${s.home}마리 — ${d.goal}마리가 필요해요`;
    s.hearts--;
    s.tries++;
    ev(s, 'fail', 0.5, 0.5, s.why);
  }
}

type Target = { sign: true } | { sign: false; i: number };
/** 톡 한 곳 → 가장 가까운 알맞은 자리 (넉넉하게 붙는다) */
function pickTarget(S: Sim, wx: number, wy: number): Target | null {
  let best: Target | null = null, bd = S.d.snap;
  if (S.d.fork) {
    const [ax, ay] = signAnchor(S), dd = Math.hypot(wx - ax, (wy - ay) * 1.3);
    if (dd < bd) (bd = dd), (best = { sign: true });
  }
  S.haz.forEach((h, i) => {
    if (h.k === SEAL) return;
    const [ax, ay] = anchorOf(S, i), dd = Math.hypot(wx - ax, (wy - ay) * 1.3) * (h.fixed ? 1.6 : 1);
    if (dd < bd) (bd = dd), (best = { sign: false, i });
  });
  return best;
}

function tap(s: PengState, wx: number, wy: number) {
  if (s.phase !== 'play') return;
  if (wy < 0.09 || wy > BAND) return;
  s.taps++;
  const tg = pickTarget(s, wx, wy);
  if (!tg) return void ev(s, 'puff', wx, wy, '', 0);
  if (s.firstTap < 0) s.firstTap = s.t;
  s.banner = null;
  if (tg.sign) {
    s.sign = 1 - s.sign;
    s.signT = s.st;
    const [ax, ay] = signAnchor(s);
    ev(s, 'sign', ax, ay, s.sign ? '↓ 미끄럼 굴로!' : '→ 곧장!');
    see(s, 'sign');
    return;
  }
  const h = s.haz[tg.i];
  const [ax, ay] = anchorOf(s, tg.i);
  if (h.fixed) return void ev(s, 'puff', ax, ay, '', 1);
  if (s.ice <= 0) return void ev(s, 'noice', ax, ay - 0.06, '얼음이 없어요');
  fix(s, tg.i, s);
}

// ───────────────────────────── GameDef ─────────────────────────────
const game: GameDef<PengState> = {
  id: 'pengwalk',
  name: '🐧 펭귄 떼 길잡이',
  genes: ['guide', 'herd'],
  twist: '펭귄 떼는 저절로 줄지어 걸어오고, 길을 톡 하면 그 자리에 맞는 도구(틈엔 얼음 다리·벽 앞엔 점프대·물살엔 뗏목·비탈엔 미끄럼)가 저절로 정해져 솟는다 — 줄 서 있던 펭귄들이 차례로 쭉 미끄러지고 통 튀어 공중제비, 모자란 얼음으로 어느 길에 무엇을 놓을지가 고민',
  rules: [
    '펭귄들이 저절로 걸어와요. 길을 톡 하면 그 자리에 맞는 다리·점프대·뗏목이 솟아요.',
    '얼음은 몇 개뿐! 표지판을 톡 하면 길이 바뀌어요. 정한 수만큼 이글루로 보내요.',
  ],
  controls: 'touch',
  hint: '길을 톡 = 도구가 쑥! / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '햇살 비치는 남극 얼음 절벽 디오라마 — 세 층으로 깎인 눈길, 뒤뚱 펭귄 행렬, 아래 바다와 이글루',
    mood: '맑은 하늘과 분홍빛 산 아래 얼음 절벽에 눈길이 지그재그로 나 있고, 굴에서 펭귄들이 줄지어 뒤뚱뒤뚱 걸어 나온다. 톡 하면 얼음 다리가 쩡 솟고 줄 서 있던 펭귄들이 배로 쭉 미끄러지고 점프대에서 통 튀어 공중제비를 돈다. 빠진 펭귄은 퐁 — 바다를 헤엄쳐 굴로 돌아가고, 이글루 앞 아기 펭귄들이 폴짝폴짝 반긴다.',
    palette: { bg: '#bfe6fb', ink: '#14304a', muted: '#6a8aa8', accent: '#ff6a3d', hot: '#ffb02e', soft: '#eef9ff' },
  },
  reveals: (s) => s.seen.size,
  guard: (s) => s.pens.filter((p) => !p.wet && p.st !== FLY && p.st !== SWIM && p.st !== BACK && p.st !== OUT).length,
  cleared: (s) => (s.phase === 'result' && s.ok ? { stage: s.stage, got: s.got, of: s.starOk.length } : null),
  wows: (s) => s.wowN,
  create(seed) {
    const rng = mulberry32(seed);
    const s = {
      rng, seed, t: 0, stage: 0, phase: 'play', pt: 0, seeds: STAGES.map(() => Math.floor(rng() * 1e9)),
      st: 0, d: STAGES[0], legs: [], byLeg: [], haz: [], pens: [], queue: [], nextSpawn: 0, sign: 0, signT: -999,
      ice: 0, used: 0, home: 0, falls: 0, outN: 0, first: true,
      hearts: 3, stars: 0, got: 0, starOk: [], pts: 0, ok: false, why: '', down: false, seen: new Set<string>(), banner: null, spot: null,
      events: [], dead: false, won: false, tries: 0, again: false, firstTap: -1, wowN: 0, taps: 0,
    } as unknown as PengState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    const p = inp.pointer ?? null;
    const fresh = !!p && !s.down;
    s.down = !!p;
    s.t++;
    s.pt++;
    if (s.events.length > 60) s.events = s.events.filter((e) => s.t - e.t < 120);
    if (s.phase === 'result') {
      tick(s, null);
      const T = s.ok ? RESULT_OK : RESULT_FAIL;
      if (s.pt >= T || (fresh && s.pt > 70)) {
        if (s.ok) {
          if (s.won) s.dead = true;
          else (s.again = false), s.stage++, newStage(s);
        } else if (s.hearts <= 0) s.dead = true;
        else (s.again = true), newStage(s);
      }
      return;
    }
    if (fresh) tap(s, p!.x, p!.y * A);
    tick(s, s);
    if (s.spot && s.t - s.spot.t > SPOT_T) s.spot = null;
    if (resolved(s)) endStage(s);
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};
export const pengwalk = game;

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
const at = (x: number, y: number): Input => ({ tap: false, dir: 0, pointer: { x, y: y / A } });
const ready = (s: PengState) => s.phase === 'play' && s.st >= 24;

/** 지금 갈 수 있는 길 조각 (표지판 sg일 때) */
function reach(S: Sim, sg: number): Set<number> {
  const out = new Set<number>(), stack = [0];
  for (const p of S.pens) if (solid(p) || p.st === JUMP || p.st === RAFT) stack.push(p.st === JUMP || p.st === RAFT ? S.haz[p.hz].leg : p.leg);
  while (stack.length) {
    const l = stack.pop()!;
    if (l < 0 || out.has(l)) continue;
    out.add(l);
    const n = S.legs[l].next;
    stack.push(n === FORK ? (sg ? 6 : 1) : n);
  }
  return out;
}
function combos(a: number[], k: number): number[][] {
  if (k <= 0) return [[]];
  if (a.length < k) return [];
  const [h, ...t] = a;
  return [...combos(t, k - 1).map((c) => [h, ...c]), ...combos(t, k)];
}
interface Plan { sign: number; keep: number[]; val: number }
/** 아직 이 장애를 지나야 할 펭귄이 있나 (깨진 다리를 괜히 다시 놓지 않게) */
function needed(S: Sim, i: number): boolean {
  const h = S.haz[i];
  const from = (l: number) => {
    for (let k = 0; k < 12 && l >= 0; k++) {
      if (l === h.leg) return true;
      l = nextLeg(S, l);
    }
    return false;
  };
  for (const p of S.pens) {
    if (p.st === IN || p.st === BACK || ((p.st === FLY || p.st === SWIM) && !p.wet)) {
      if (from(0)) return true;
    } else if (solid(p) && (p.leg === h.leg ? p.u < h.u1 : from(p.leg))) return true;
  }
  return false;
}
function simulate(s: PengState, sign: number, keep: number[]): number {
  const S = cloneSim(s);
  S.sign = sign;
  for (let t = 0; t < 4200 && !resolved(S); t++) {
    if (S.ice > 0 && t % 6 === 0) for (const i of keep) if (!S.haz[i].fixed && S.ice > 0 && needed(S, i)) fix(S, i, null);
    tick(S, null);
  }
  const ok = starsOf(S, s.stage);
  return (ok[0] ? 1000 : 0) + ok.filter(Boolean).length * 300 + S.home * 10 + S.ice * 3 - (sign !== s.sign ? 1 : 0);
}
function makePlan(s: PengState): Plan {
  const signs = s.d.fork ? [s.sign, 1 - s.sign] : [s.sign];
  let best: Plan = { sign: s.sign, keep: [], val: -1 };
  for (const sg of signs) {
    const legs = reach(s, sg);
    const route = s.haz.map((_, i) => i).filter((i) => s.haz[i].k !== SEAL && legs.has(s.haz[i].leg));
    const need = route.filter((i) => !s.haz[i].fixed), have = route.filter((i) => s.haz[i].fixed);
    const subs = need.length <= s.ice ? [need] : combos(need, s.ice);
    for (const sub of subs) {
      const keep = [...have, ...sub];
      const val = simulate(s, sg, keep);
      if (val > best.val) best = { sign: sg, keep, val };
    }
  }
  const rank = (i: number) => s.legs[s.haz[i].leg].rank * 10 + s.haz[i].u0;
  best.keep.sort((a, b) => rank(a) - rank(b));
  return best;
}
const sigOf = (s: PengState) => `${s.stage}:${s.tries}:${s.sign}:${s.ice}:${s.haz.map((h) => (h.fixed ? 1 : 0)).join('')}`;
const smartMem = new WeakMap<object, { plan: Plan | null; sig: string; last: number; down: boolean }>();

/** 잘하는 봇: 두 길 × 얼음 놓을 곳을 끝까지 시뮬레이션해 가장 좋은 길·자리를 고르고, 깨진 다리는 다시 놓는다 */
export const pengwalkSmart: Bot<PengState> = {
  name: '길 박사',
  act(s) {
    if (!ready(s)) return NO;
    let m = smartMem.get(s);
    if (!m) smartMem.set(s, (m = { plan: null, sig: '', last: -99, down: false }));
    // 누른 다음 판단에서는 꼭 손을 뗀다 (사람 속도로 판단해도 톡이 이어 붙지 않게)
    if (m.down) return (m.down = false), NO;
    const sig = sigOf(s);
    if (!m.plan || m.sig !== sig) (m.plan = makePlan(s)), (m.sig = sig);
    if (s.t - m.last < 10) return NO;
    const P = m.plan;
    if (s.d.fork && s.sign !== P.sign) {
      m.last = s.t;
      m.down = true;
      return at(...signAnchor(s));
    }
    if (s.ice > 0)
      for (const i of P.keep)
        if (!s.haz[i].fixed && needed(s, i)) {
          m.last = s.t;
          m.down = true;
          return at(...anchorOf(s, i));
        }
    return NO;
  },
};

const dumbMem = new WeakMap<object, { next: number; hold: number; x: number; y: number }>();
/** 못하는 봇: 아무 데나, 아무 때나 톡 */
export const pengwalkRandom: Bot<PengState> = {
  name: '아무 데나 톡',
  act(s, rng) {
    let m = dumbMem.get(s);
    if (!m) dumbMem.set(s, (m = { next: s.t + 20 + Math.floor(rng() * 60), hold: 0, x: 0, y: 0 }));
    if (m.hold > 0) {
      m.hold--;
      return m.hold > 0 ? { tap: false, dir: 0, pointer: { x: m.x, y: m.y } } : NO;
    }
    if (s.t < m.next) return NO;
    m.next = s.t + 30 + Math.floor(rng() * 110);
    m.x = rng();
    m.y = rng();
    m.hold = 2 + Math.floor(rng() * 4);
    return { tap: false, dir: 0, pointer: { x: m.x, y: m.y } };
  },
};

const habitMem = new WeakMap<object, number>();
function habitTap(s: PengState, f: () => [number, number] | null): Input {
  if (!ready(s)) return NO;
  const last = habitMem.get(s) ?? -99;
  if (s.t - last < 27) return NO;
  habitMem.set(s, s.t);
  const p = f();
  return p ? at(p[0], p[1]) : NO;
}
/** 버릇 봇: 늘 맨 앞 펭귄 바로 앞 땅을 톡 */
export const pengwalkHabit: Bot<PengState> = {
  name: '늘 맨 앞 펭귄 바로 앞 톡',
  act(s) {
    return habitTap(s, () => {
      let lead: Peng | null = null;
      for (const p of s.pens) if (solid(p) && (!lead || s.legs[p.leg].rank * 10 + p.u > s.legs[lead.leg].rank * 10 + lead.u)) lead = p;
      if (!lead) return null;
      let L = s.legs[lead.leg], u = lead.u + 0.08;
      if (u > L.len) {
        const n = nextLeg(s, lead.leg);
        if (n >= 0) (u -= L.len), (L = s.legs[n]);
        else u = L.len;
      }
      const [x, y] = legPos(L, Math.min(u, L.len));
      return [x, y - 0.02];
    });
  },
};
/** 독립 버릇 봇: 늘 화면 가운데를 톡 */
export const pengwalkHabit2: Bot<PengState> = {
  name: '늘 화면 가운데 톡',
  act(s) {
    return habitTap(s, () => [0.5, (Y0 + Y2) / 2]);
  },
};

/** 시험·스크린샷용: k판(0부터)으로 바로 */
export function jumpTo(s: PengState, k: number) {
  s.stage = k;
  s.again = false;
  newStage(s);
}

// ───────────────────────────── 그리기 ─────────────────────────────
type C2 = CanvasRenderingContext2D;
const TAU = Math.PI * 2;
const hsh = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
function rr(ctx: C2, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}
function ell(ctx: C2, x: number, y: number, rx: number, ry: number, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
}
function starPath(ctx: C2, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5, q = k % 2 ? r * 0.46 : r;
    ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
  }
  ctx.closePath();
}
function heartPath(ctx: C2, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.9);
  ctx.bezierCurveTo(x - r * 1.5, y - r * 0.1, x - r * 0.8, y - r * 1.2, x, y - r * 0.45);
  ctx.bezierCurveTo(x + r * 0.8, y - r * 1.2, x + r * 1.5, y - r * 0.1, x, y + r * 0.9);
  ctx.closePath();
}
function sparkle(ctx: C2, x: number, y: number, r: number, a: number) {
  if (a <= 0.02) return;
  ctx.globalAlpha = Math.min(1, a);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** 펭귄 그림 자세 */
const P_WALK = 0, P_STAND = 1, P_TEETER = 2, P_DIZZY = 3, P_BELLY = 4, P_FLIP = 5, P_FALL = 6, P_SWIM = 7, P_COLD = 8, P_CHEER = 9;
/** 펭귄. (x,y) = 발 자리, u = 크기 */
function drawPeng(ctx: C2, x: number, y: number, u: number, face: number, pose: number, t: number, ph: number, rot = 0, wet = false, baby = false) {
  ctx.save();
  ctx.translate(x, y);
  const step = Math.sin(t * 0.32 + ph);
  if (pose === P_SWIM) {
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ell(ctx, 0, u * 0.05, u * 1.1, u * 0.28);
    ctx.fill();
    ctx.beginPath();
    ctx.rect(-u * 3, -u * 5, u * 6, u * 5);
    ctx.clip();
    ctx.translate(0, u * 1.0 + Math.sin(t * 0.25 + ph) * u * 0.08);
  } else if (pose !== P_FALL && pose !== P_FLIP) {
    ctx.fillStyle = 'rgba(30,80,120,.22)';
    ell(ctx, 0, u * 0.03, u * (pose === P_BELLY ? 1.2 : 0.7), u * 0.16);
    ctx.fill();
  }
  if (pose === P_BELLY) {
    ctx.translate(0, -u * 0.62);
    ctx.rotate(face * Math.PI * 0.5 + rot);
    ctx.translate(0, u * 1.15);
  } else if (pose === P_FLIP || pose === P_FALL) {
    ctx.translate(0, -u * 1.15);
    ctx.rotate(rot);
    ctx.translate(0, u * 1.15);
  } else if (pose === P_WALK) {
    ctx.translate(0, -Math.abs(step) * u * 0.12);
    ctx.rotate(step * 0.13);
  } else if (pose === P_TEETER) {
    ctx.rotate(face * (0.32 + Math.sin(t * 0.45 + ph) * 0.2));
  } else if (pose === P_DIZZY) {
    ctx.scale(1.08, 0.82);
    ctx.rotate(Math.sin(t * 0.2) * 0.1);
  } else if (pose === P_COLD) {
    ctx.translate(Math.sin(t * 1.7 + ph) * u * 0.05, 0);
    ctx.scale(1.05, 0.86);
  } else if (pose === P_CHEER) {
    ctx.translate(0, -Math.abs(Math.sin(t * 0.2 + ph)) * u * 0.5);
  } else ctx.translate(0, Math.sin(t * 0.08 + ph) * u * 0.03);
  ctx.scale(face, 1);
  const lw = Math.max(1, u * 0.08);
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#0e1630';
  // 발
  if (pose !== P_SWIM) {
    ctx.fillStyle = '#ff9a2a';
    const fa = pose === P_WALK ? step * 0.14 : 0;
    ell(ctx, -u * 0.22 - fa * u, -u * 0.04, u * 0.24, u * 0.11);
    ctx.fill();
    ctx.stroke();
    ell(ctx, u * 0.26 + fa * u, -u * 0.04, u * 0.24, u * 0.11);
    ctx.fill();
    ctx.stroke();
  }
  // 날개 (뒤)
  const flail = pose === P_TEETER || pose === P_FALL ? Math.sin(t * 0.9 + ph) * 0.7 + 1.4 : pose === P_CHEER ? Math.sin(t * 0.5 + ph) * 0.4 + 1.9 : pose === P_BELLY ? -0.5 : pose === P_FLIP ? 1.5 : pose === P_WALK ? 0.25 + step * 0.15 : 0.15;
  ctx.fillStyle = baby ? '#7a8798' : '#1c2544';
  ctx.save();
  ctx.translate(-u * 0.5, -u * 1.42);
  ctx.rotate(0.2 + flail);
  ell(ctx, 0, u * 0.42, u * 0.15, u * 0.5);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  // 몸
  const g = ctx.createLinearGradient(-u * 0.6, -u * 2.3, u * 0.7, 0);
  if (baby) {
    g.addColorStop(0, '#c4ccd8');
    g.addColorStop(1, '#8e9aac');
  } else {
    g.addColorStop(0, wet ? '#56709a' : '#3f4f7c');
    g.addColorStop(0.5, wet ? '#33466e' : '#252f52');
    g.addColorStop(1, '#141a30');
  }
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, -u * 2.32);
  ctx.bezierCurveTo(u * 0.68, -u * 2.32, u * 0.76, -u * 1.2, u * 0.66, -u * 0.5);
  ctx.bezierCurveTo(u * 0.58, -u * 0.05, u * 0.26, 0, 0, 0);
  ctx.bezierCurveTo(-u * 0.26, 0, -u * 0.58, -u * 0.05, -u * 0.66, -u * 0.5);
  ctx.bezierCurveTo(-u * 0.76, -u * 1.2, -u * 0.68, -u * 2.32, 0, -u * 2.32);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 배
  const bg = ctx.createLinearGradient(0, -u * 1.5, 0, 0);
  bg.addColorStop(0, '#ffffff');
  bg.addColorStop(1, '#d8eaf6');
  ctx.fillStyle = bg;
  ell(ctx, u * 0.12, -u * 0.86, u * 0.44, u * 0.72);
  ctx.fill();
  // 얼굴
  ctx.fillStyle = '#ffffff';
  ell(ctx, u * 0.18, -u * 1.62, u * 0.38, u * 0.3);
  ctx.fill();
  const scared = pose === P_TEETER || pose === P_FALL || pose === P_DIZZY;
  const happy = pose === P_BELLY || pose === P_FLIP || pose === P_CHEER;
  const blink = !scared && !happy && (t + Math.floor(ph * 97)) % 190 < 7;
  for (const ex of [0.05, 0.33]) {
    const cx = u * ex, cy = -u * 1.7;
    ctx.fillStyle = '#10182c';
    ctx.strokeStyle = '#10182c';
    if (pose === P_DIZZY) {
      ctx.lineWidth = Math.max(1, u * 0.06);
      ctx.beginPath();
      for (let a = 0; a < 9; a++) {
        const r = u * 0.015 * a, an = a * 1.1 + t * 0.3;
        ctx.lineTo(cx + Math.cos(an) * r, cy + Math.sin(an) * r);
      }
      ctx.stroke();
    } else if (blink || pose === P_COLD) {
      ctx.lineWidth = Math.max(1, u * 0.07);
      ctx.beginPath();
      ctx.moveTo(cx - u * 0.08, cy);
      ctx.lineTo(cx + u * 0.08, cy);
      ctx.stroke();
    } else if (happy) {
      ctx.lineWidth = Math.max(1.2, u * 0.08);
      ctx.beginPath();
      ctx.arc(cx, cy + u * 0.05, u * 0.085, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else if (scared) {
      ctx.fillStyle = '#ffffff';
      ell(ctx, cx, cy, u * 0.13, u * 0.15);
      ctx.fill();
      ctx.lineWidth = Math.max(1, u * 0.04);
      ctx.stroke();
      ctx.fillStyle = '#10182c';
      ell(ctx, cx + u * 0.03, cy + u * 0.02, u * 0.05, u * 0.05);
      ctx.fill();
    } else {
      ell(ctx, cx, cy, u * 0.075, u * 0.1);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ell(ctx, cx + u * 0.025, cy - u * 0.04, u * 0.03, u * 0.03);
      ctx.fill();
    }
  }
  // 볼
  ctx.fillStyle = 'rgba(255,110,140,.55)';
  ell(ctx, u * 0.44, -u * 1.5, u * 0.09, u * 0.055);
  ctx.fill();
  ell(ctx, -u * 0.07, -u * 1.5, u * 0.08, u * 0.05);
  ctx.fill();
  // 부리
  const open = scared ? 1 : happy ? 0.6 : 0;
  ctx.fillStyle = '#ffa42e';
  ctx.strokeStyle = '#b8600a';
  ctx.lineWidth = Math.max(0.8, u * 0.04);
  ctx.beginPath();
  ctx.moveTo(u * 0.38, -u * 1.64);
  ctx.lineTo(u * 0.74, -u * 1.57 + open * u * 0.02);
  ctx.lineTo(u * 0.38, -u * 1.49);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  if (open) {
    ctx.fillStyle = '#ff7a1a';
    ctx.beginPath();
    ctx.moveTo(u * 0.4, -u * 1.48);
    ctx.lineTo(u * 0.66, -u * 1.47 + open * u * 0.13);
    ctx.lineTo(u * 0.4, -u * 1.38);
    ctx.closePath();
    ctx.fill();
  }
  // 날개 (앞)
  ctx.fillStyle = baby ? '#8e9aac' : '#252f52';
  ctx.strokeStyle = '#0e1630';
  ctx.lineWidth = lw;
  ctx.save();
  ctx.translate(u * 0.52, -u * 1.38);
  ctx.rotate(-0.15 - flail);
  ell(ctx, 0, u * 0.42, u * 0.15, u * 0.5);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  // 목도리 (못 간 펭귄)
  if (pose === P_COLD) {
    ctx.fillStyle = '#ff4a4a';
    rr(ctx, -u * 0.62, -u * 1.36, u * 1.3, u * 0.24, u * 0.12);
    ctx.fill();
    rr(ctx, -u * 0.5, -u * 1.25, u * 0.22, u * 0.5, u * 0.08);
    ctx.fill();
  }
  if (wet && pose !== P_SWIM) {
    ctx.fillStyle = '#8fdcff';
    for (let k = 0; k < 2; k++) {
      const dy = ((t * 0.6 + k * 20 + ph * 10) % 30) / 30;
      ctx.globalAlpha = 1 - dy;
      ell(ctx, -u * 0.3 + k * u * 0.5, -u * 1.9 + dy * u * 1.6, u * 0.06, u * 0.1);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  if (pose === P_DIZZY) {
    for (let k = 0; k < 3; k++) {
      const a = t * 0.12 + (k * TAU) / 3;
      starPath(ctx, x + Math.cos(a) * u * 0.7, y - u * 2.3 + Math.sin(a) * u * 0.22, u * 0.18);
      ctx.fillStyle = '#ffd23a';
      ctx.fill();
    }
  }
  if (pose === P_TEETER) {
    ctx.fillStyle = '#8fdcff';
    ell(ctx, x - face * u * 0.55, y - u * 2.2 + ((t * 0.5) % 6) * u * 0.04, u * 0.08, u * 0.13);
    ctx.fill();
  }
}

function drawHand(ctx: C2, x: number, y: number, k: number, press: number) {
  ctx.save();
  ctx.translate(x + k * 0.05, y + press * k * 0.14);
  ctx.rotate(-0.35);
  ctx.fillStyle = 'rgba(20,60,90,.22)';
  ell(ctx, k * 0.25, k * 1.3, k * 0.42, k * 0.12);
  ctx.fill();
  ctx.fillStyle = '#fff4ea';
  ctx.strokeStyle = '#3a2a20';
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

/** 층 하나의 길(눈 덮인 얼음 턱) — x 구간들 */
const LT = 0.042, LF = 0.012, LD = 0.068;
function ledge(ctx: C2, w: number, y: number, x0: number, x1: number, t: number, top = false) {
  const X = (v: number) => v * w;
  const yb = (y - LT) * w, yf = (y + LF) * w, yd = (y + LF + LD) * w;
  // 아래 그림자 (뒤 벽에)
  if (!top) {
    const sg = ctx.createLinearGradient(0, yd, 0, yd + w * 0.07);
    sg.addColorStop(0, 'rgba(20,70,120,.35)');
    sg.addColorStop(1, 'rgba(20,70,120,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(X(x0) + 4, yd, X(x1 - x0) - 4, w * 0.07);
  }
  // 앞면 (얼음)
  const fg = ctx.createLinearGradient(0, yf, 0, yd);
  fg.addColorStop(0, '#d3f1fc');
  fg.addColorStop(0.5, '#9bd6f0');
  fg.addColorStop(1, '#6ab4dc');
  ctx.fillStyle = fg;
  rr(ctx, X(x0), yf - 2, X(x1 - x0), yd - yf + 2, [0, 0, 6, 6] as unknown as number);
  ctx.fill();
  // 고드름
  ctx.fillStyle = '#e6f8ff';
  for (let k = 0; k < (x1 - x0) / 0.045; k++) {
    const ix = x0 + 0.02 + k * 0.045 + hsh(k + y * 50) * 0.02;
    if (ix > x1 - 0.015) break;
    const ln = (0.012 + hsh(k * 3 + y * 20) * 0.022) * w;
    ctx.beginPath();
    ctx.moveTo(X(ix) - 3, yd - 1);
    ctx.lineTo(X(ix) + 3, yd - 1);
    ctx.lineTo(X(ix), yd + ln);
    ctx.closePath();
    ctx.fill();
  }
  // 앞면 결
  ctx.strokeStyle = 'rgba(255,255,255,.45)';
  ctx.lineWidth = 1.2;
  for (let k = 0; k < (x1 - x0) / 0.07; k++) {
    const ix = x0 + 0.03 + k * 0.07 + hsh(k * 7 + y) * 0.03;
    if (ix > x1 - 0.02) break;
    ctx.beginPath();
    ctx.moveTo(X(ix), yf + 3);
    ctx.lineTo(X(ix) + 4, yd - 6);
    ctx.stroke();
  }
  // 윗면 (눈)
  const tg = ctx.createLinearGradient(0, yb, 0, yf);
  tg.addColorStop(0, top ? '#e9f6fd' : '#dcf0fb');
  tg.addColorStop(1, '#ffffff');
  ctx.fillStyle = tg;
  ctx.beginPath();
  ctx.moveTo(X(x0), yf);
  ctx.lineTo(X(x0), yb + 3);
  ctx.quadraticCurveTo(X(x0), yb, X(x0) + 3, yb);
  ctx.lineTo(X(x1) - 3, yb);
  ctx.quadraticCurveTo(X(x1), yb, X(x1), yb + 3);
  ctx.lineTo(X(x1), yf);
  // 눈 턱이 앞으로 살짝 부푼 모양
  for (let k = 20; k >= 0; k--) {
    const fx = x0 + ((x1 - x0) * k) / 20;
    ctx.lineTo(X(fx), yf + Math.sin(k * 1.7 + y * 9) * 1.4 + 1.5);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,180,220,.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(X(x0), yb + 0.5);
  ctx.lineTo(X(x1), yb + 0.5);
  ctx.stroke();
  // 앞 턱에 비친 따뜻한 햇살
  ctx.strokeStyle = 'rgba(255,226,170,.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(X(x0) + 3, yf + 2);
  ctx.lineTo(X(x1) - 3, yf + 2);
  ctx.stroke();
  // 턱 밑 그늘
  const ao = ctx.createLinearGradient(0, yf + 3, 0, yf + w * 0.025);
  ao.addColorStop(0, 'rgba(40,110,170,.28)');
  ao.addColorStop(1, 'rgba(40,110,170,0)');
  ctx.fillStyle = ao;
  ctx.fillRect(X(x0), yf + 3, X(x1 - x0), w * 0.022);
  // 반짝
  for (let k = 0; k < (x1 - x0) / 0.12; k++) {
    const ix = x0 + 0.05 + k * 0.12 + hsh(k * 13 + y * 3) * 0.05;
    if (ix > x1 - 0.02) break;
    sparkle(ctx, X(ix), yb + (yf - yb) * (0.3 + hsh(k + 9) * 0.5), w * 0.008, 0.4 + 0.6 * Math.sin(t * 0.05 + k * 2.3 + y * 7));
  }
}

/** 틈(낭떠러지) 안쪽 — 깊은 얼음 골짜기 */
function crevasse(ctx: C2, w: number, y: number, xa: number, xb: number) {
  const X = (v: number) => v * w;
  const yb = (y - LT) * w, yf = (y + LF) * w, yd = (y + LF + LD) * w, mid = X((xa + xb) / 2);
  const g = ctx.createLinearGradient(0, yb, 0, yd + X(0.06));
  g.addColorStop(0, '#4f9fd0');
  g.addColorStop(0.45, '#1f5f92');
  g.addColorStop(1, '#0c2a48');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(X(xa) - 1, yb);
  ctx.lineTo(X(xb) + 1, yb);
  ctx.lineTo(X(xb) - 2, yf + 2);
  ctx.lineTo(X(xb) + 2, yf + (yd - yf) * 0.45);
  ctx.lineTo(X(xb) - 5, yd + 2);
  ctx.lineTo(mid + X(0.012), yd + X(0.035));
  ctx.lineTo(mid - X(0.006), yd + X(0.06));
  ctx.lineTo(mid - X(0.016), yd + X(0.03));
  ctx.lineTo(X(xa) + 5, yd + 2);
  ctx.lineTo(X(xa) - 2, yf + (yd - yf) * 0.5);
  ctx.lineTo(X(xa) + 2, yf + 2);
  ctx.closePath();
  ctx.fill();
  // 잘린 면: 왼쪽은 밝고 오른쪽은 그늘
  ctx.fillStyle = 'rgba(220,245,255,.85)';
  ctx.beginPath();
  ctx.moveTo(X(xa) - 1, yb);
  ctx.lineTo(X(xa) + X(0.016), yb + X(0.012));
  ctx.lineTo(X(xa) + X(0.012), yd - 2);
  ctx.lineTo(X(xa) + 5, yd + 2);
  ctx.lineTo(X(xa) - 2, yf + (yd - yf) * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(40,110,160,.8)';
  ctx.beginPath();
  ctx.moveTo(X(xb) + 1, yb);
  ctx.lineTo(X(xb) - X(0.016), yb + X(0.012));
  ctx.lineTo(X(xb) - X(0.014), yd - 2);
  ctx.lineTo(X(xb) - 5, yd + 2);
  ctx.lineTo(X(xb) + 2, yf + (yd - yf) * 0.45);
  ctx.closePath();
  ctx.fill();
  // 눈 처마
  ctx.fillStyle = '#ffffff';
  ell(ctx, X(xa) - 1, yb + 1, X(0.012), X(0.006));
  ctx.fill();
  ell(ctx, X(xb) + 1, yb + 1, X(0.012), X(0.006));
  ctx.fill();
}

/** 작은 소품: 눈사람 · 생선 상자 (길 뒤쪽) */
function drawProps(ctx: C2, w: number, s: PengState, t: number) {
  const X = (v: number) => v * w;
  const free = (x: number, y: number) => !s.haz.some((h) => Math.abs(h.y - y) < 0.01 && x > h.xa - 0.07 && x < h.xb + 0.07);
  // 눈사람
  const sx = 0.2, sy = Y2 - 0.03;
  if (free(sx, Y2)) {
    const bx = X(sx), by = X(sy);
    ctx.fillStyle = 'rgba(30,80,120,.2)';
    ell(ctx, bx + 3, by, X(0.035), X(0.008));
    ctx.fill();
    for (const [dy, r] of [[-0.026, 0.03], [-0.072, 0.022]]) {
      const g = ctx.createRadialGradient(bx - X(r * 0.4), by + X(dy - r * 0.4), 1, bx, by + X(dy), X(r));
      g.addColorStop(0, '#ffffff');
      g.addColorStop(1, '#cde6f4');
      ctx.fillStyle = g;
      ell(ctx, bx, by + X(dy), X(r), X(r));
      ctx.fill();
    }
    ctx.fillStyle = '#ff4a4a';
    rr(ctx, bx - X(0.022), by - X(0.054), X(0.044), X(0.01), 3);
    ctx.fill();
    ctx.fillStyle = '#ff8a2a';
    ctx.beginPath();
    ctx.moveTo(bx + X(0.006), by - X(0.076));
    ctx.lineTo(bx + X(0.03), by - X(0.072));
    ctx.lineTo(bx + X(0.006), by - X(0.068));
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1a2230';
    ell(ctx, bx - X(0.006), by - X(0.08), X(0.003), X(0.0035));
    ctx.fill();
    ell(ctx, bx + X(0.008), by - X(0.081), X(0.003), X(0.0035));
    ctx.fill();
    ctx.strokeStyle = '#7a5030';
    ctx.lineWidth = 2;
    const wv = Math.sin(t * 0.06) * X(0.006);
    ctx.beginPath();
    ctx.moveTo(bx - X(0.025), by - X(0.035));
    ctx.lineTo(bx - X(0.05), by - X(0.055) + wv);
    ctx.moveTo(bx + X(0.025), by - X(0.035));
    ctx.lineTo(bx + X(0.048), by - X(0.05));
    ctx.stroke();
  }
  // 생선 상자 (가운데층 오른쪽 끝)
  const cx = 0.975, cy = Y1 - 0.025;
  {
    const bx = X(cx), by = X(cy);
    ctx.fillStyle = 'rgba(30,80,120,.2)';
    ell(ctx, bx, by + X(0.004), X(0.03), X(0.007));
    ctx.fill();
    for (let k = 0; k < 3; k++) {
      ctx.fillStyle = ['#ff9a4a', '#6ab4e8', '#ffb04a'][k];
      ctx.save();
      ctx.translate(bx - X(0.012) + k * X(0.012), by - X(0.03));
      ctx.rotate(-0.6 + k * 0.5);
      ell(ctx, 0, 0, X(0.008), X(0.018));
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, -X(0.016));
      ctx.lineTo(-X(0.008), -X(0.028));
      ctx.lineTo(X(0.008), -X(0.028));
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    const g = ctx.createLinearGradient(0, by - X(0.03), 0, by);
    g.addColorStop(0, '#d89a58');
    g.addColorStop(1, '#a8682e');
    ctx.fillStyle = g;
    rr(ctx, bx - X(0.026), by - X(0.03), X(0.052), X(0.032), 3);
    ctx.fill();
    ctx.strokeStyle = '#6a3a14';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx - X(0.026), by - X(0.016));
    ctx.lineTo(bx + X(0.026), by - X(0.016));
    ctx.stroke();
  }
}

function drawBurrow(ctx: C2, w: number, s: PengState, t: number) {
  const X = (v: number) => v * w;
  const gx = X(0.055), gy = X(Y0 + 0.004);
  ctx.fillStyle = 'rgba(30,80,120,.2)';
  ell(ctx, gx + X(0.01), gy, X(0.08), X(0.014));
  ctx.fill();
  const g = ctx.createLinearGradient(0, gy - X(0.14), 0, gy);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, '#cfe9f7');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(gx - X(0.08), gy);
  ctx.bezierCurveTo(gx - X(0.08), gy - X(0.15), gx + X(0.09), gy - X(0.16), gx + X(0.085), gy);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(100,160,200,.6)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // 입구
  ctx.fillStyle = '#20384f';
  ctx.beginPath();
  ctx.moveTo(gx - X(0.005), gy);
  ctx.bezierCurveTo(gx - X(0.005), gy - X(0.1), gx + X(0.075), gy - X(0.1), gx + X(0.075), gy);
  ctx.closePath();
  ctx.fill();
  // 기다리는 펭귄 눈
  const waiting = s.queue.length;
  for (let k = 0; k < Math.min(3, waiting); k++) {
    const ex = gx + X(0.018 + k * 0.02), ey = gy - X(0.05 - (k % 2) * 0.012);
    if ((t + k * 37) % 160 < 8) continue;
    ctx.fillStyle = '#ffffff';
    ell(ctx, ex, ey, X(0.006), X(0.007));
    ctx.fill();
    ell(ctx, ex + X(0.009), ey, X(0.006), X(0.007));
    ctx.fill();
  }
  // 입구 테두리 눈
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = X(0.012);
  ctx.beginPath();
  ctx.moveTo(gx - X(0.008), gy);
  ctx.bezierCurveTo(gx - X(0.008), gy - X(0.108), gx + X(0.078), gy - X(0.108), gx + X(0.078), gy);
  ctx.stroke();
  if (waiting) {
    ctx.font = `900 ${Math.max(12, X(0.036))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    rr(ctx, gx - X(0.045), gy - X(0.205), X(0.09), X(0.045), X(0.02));
    ctx.fill();
    ctx.fillStyle = '#20506e';
    ctx.fillText(`${waiting}마리`, gx, gy - X(0.182));
  }
}

function drawIgloo(ctx: C2, w: number, s: PengState, t: number, cheer: number) {
  const X = (v: number) => v * w;
  const cx = X(IGLOO_X + 0.02), by = X(Y2 + 0.004), r = X(0.108);
  ctx.fillStyle = 'rgba(30,80,120,.22)';
  ell(ctx, cx, by, r * 1.15, X(0.016));
  ctx.fill();
  const g = ctx.createRadialGradient(cx - r * 0.4, by - r * 0.8, r * 0.1, cx, by - r * 0.4, r * 1.2);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, '#bfe0f2');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, by, r, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(90,150,195,.7)';
  ctx.lineWidth = 1.3;
  ctx.stroke();
  // 블록 줄
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, by, r, Math.PI, 0);
  ctx.clip();
  for (let k = 1; k < 4; k++) {
    const yy = by - (r * k) / 4;
    ctx.beginPath();
    ctx.moveTo(cx - r, yy);
    ctx.lineTo(cx + r, yy);
    ctx.stroke();
    for (let j = -3; j <= 3; j++) {
      const xx = cx + j * r * 0.32 + (k % 2) * r * 0.16;
      ctx.beginPath();
      ctx.moveTo(xx, yy);
      ctx.lineTo(xx, yy + r / 4);
      ctx.stroke();
    }
  }
  ctx.restore();
  // 입구 굴 (왼쪽)
  const dx = X(DOOR_X + 0.012);
  ctx.fillStyle = '#eaf6fd';
  ctx.beginPath();
  ctx.moveTo(dx - X(0.03), by);
  ctx.lineTo(dx - X(0.03), by - X(0.045));
  ctx.quadraticCurveTo(dx - X(0.03), by - X(0.075), dx + X(0.01), by - X(0.075));
  ctx.lineTo(cx - r * 0.5, by - X(0.075));
  ctx.lineTo(cx - r * 0.5, by);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  const glow = ctx.createRadialGradient(dx, by - X(0.03), 1, dx, by - X(0.03), X(0.05));
  glow.addColorStop(0, '#ffd77a');
  glow.addColorStop(1, '#5a3a20');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.moveTo(dx - X(0.022), by);
  ctx.lineTo(dx - X(0.022), by - X(0.035));
  ctx.quadraticCurveTo(dx - X(0.022), by - X(0.058), dx + X(0.0), by - X(0.058));
  ctx.quadraticCurveTo(dx + X(0.022), by - X(0.058), dx + X(0.022), by - X(0.035));
  ctx.lineTo(dx + X(0.022), by);
  ctx.closePath();
  ctx.fill();
  // 깃발 + 집에 온 수
  const fx = cx + r * 0.1, fy = by - r - X(0.01);
  ctx.strokeStyle = '#7a5030';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(fx, fy + X(0.012));
  ctx.lineTo(fx, fy - X(0.07));
  ctx.stroke();
  const wv = Math.sin(t * 0.12) * X(0.006);
  ctx.fillStyle = '#ff5a3a';
  ctx.beginPath();
  ctx.moveTo(fx, fy - X(0.07));
  ctx.quadraticCurveTo(fx + X(0.04), fy - X(0.075) + wv, fx + X(0.085), fy - X(0.06));
  ctx.lineTo(fx + X(0.085), fy - X(0.025));
  ctx.quadraticCurveTo(fx + X(0.04), fy - X(0.04) - wv, fx, fy - X(0.03));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${Math.max(12, X(0.036))}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${s.home}/${s.d.goal}`, fx + X(0.042), fy - X(0.047));
  // 구경꾼 아기 펭귄
  for (let k = 0; k < 2; k++) {
    const bx = X(0.905 + k * 0.045), byy = by + X(0.004);
    drawPeng(ctx, bx, byy, X(0.026), -1, cheer > 0 ? P_CHEER : P_STAND, t + k * 13, k * 2.1, 0, false, true);
  }
}

function drawSign(ctx: C2, w: number, s: PengState, t: number) {
  const X = (v: number) => v * w;
  const [ax, ay] = signAnchor(s);
  const px = X(ax + 0.035), gy = X(Y0 - 0.005);
  const wob = Math.max(0, 1 - (s.st - s.signT) / 30) * Math.sin((s.st - s.signT) * 0.7) * 0.25;
  ctx.fillStyle = 'rgba(30,80,120,.22)';
  ell(ctx, px, gy + 2, X(0.02), X(0.006));
  ctx.fill();
  ctx.fillStyle = '#9a5a2a';
  rr(ctx, px - X(0.008), X(ay), X(0.016), gy - X(ay), 2);
  ctx.fill();
  ctx.save();
  ctx.translate(X(ax), X(ay));
  ctx.rotate(wob);
  const bw = X(0.15), bh = X(0.085);
  if (s.phase === 'play') {
    ctx.strokeStyle = `rgba(255,220,80,${0.45 + 0.35 * Math.sin(t * 0.15)})`;
    ctx.lineWidth = 4;
    rr(ctx, -bw / 2 - 4, -bh / 2 - 4, bw + 8, bh + 8, X(0.03));
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(60,30,10,.25)';
  rr(ctx, -bw / 2 + 2, -bh / 2 + 3, bw, bh, X(0.022));
  ctx.fill();
  const bg = ctx.createLinearGradient(0, -bh / 2, 0, bh / 2);
  bg.addColorStop(0, '#ffe7b0');
  bg.addColorStop(1, '#f2c47a');
  ctx.fillStyle = bg;
  rr(ctx, -bw / 2, -bh / 2, bw, bh, X(0.022));
  ctx.fill();
  ctx.strokeStyle = '#8a4a1a';
  ctx.lineWidth = 2;
  ctx.stroke();
  // 화살표
  ctx.fillStyle = '#ff4a2a';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (s.sign === 0) {
    const L = bw * 0.36, hh = bh * 0.22;
    ctx.moveTo(-L, -hh * 0.55);
    ctx.lineTo(L * 0.3, -hh * 0.55);
    ctx.lineTo(L * 0.3, -hh * 1.4);
    ctx.lineTo(L, 0);
    ctx.lineTo(L * 0.3, hh * 1.4);
    ctx.lineTo(L * 0.3, hh * 0.55);
    ctx.lineTo(-L, hh * 0.55);
  } else {
    const hh = bh * 0.36, ww = bw * 0.1;
    ctx.moveTo(-ww * 0.6, -hh);
    ctx.lineTo(ww * 0.6, -hh);
    ctx.lineTo(ww * 0.6, hh * 0.2);
    ctx.lineTo(ww * 1.6, hh * 0.2);
    ctx.lineTo(0, hh);
    ctx.lineTo(-ww * 1.6, hh * 0.2);
    ctx.lineTo(-ww * 0.6, hh * 0.2);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.fill();
  ctx.restore();
}

function drawSeal(ctx: C2, x: number, y: number, u: number, face: number, t: number, slap: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(30,80,120,.25)';
  ell(ctx, 0, u * 0.05, u * 1.5, u * 0.22);
  ctx.fill();
  ctx.scale(face, 1);
  const k = slap >= 0 && slap < 30 ? Math.sin((slap / 30) * Math.PI) : 0;
  const breath = Math.sin(t * 0.05) * 0.04;
  ctx.lineWidth = Math.max(1, u * 0.07);
  ctx.strokeStyle = '#3a4656';
  // 꼬리
  ctx.save();
  ctx.translate(-u * 1.2, -u * 0.3);
  ctx.rotate(-0.3 - k * 1.6);
  ctx.fillStyle = '#7d8c9c';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-u * 0.7, -u * 0.35);
  ctx.lineTo(-u * 0.6, u * 0.25);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  // 몸
  const g = ctx.createLinearGradient(0, -u * 1.1, 0, 0);
  g.addColorStop(0, '#a9b6c4');
  g.addColorStop(1, '#6f7e90');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-u * 1.3, -u * 0.1);
  ctx.bezierCurveTo(-u * 1.3, -u * (0.9 + breath), u * 0.4, -u * (1.25 + breath), u * 0.95, -u * 0.75);
  ctx.bezierCurveTo(u * 1.25, -u * 0.45, u * 1.15, 0, u * 0.6, 0);
  ctx.lineTo(-u * 1.1, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 점박이
  ctx.fillStyle = 'rgba(70,85,105,.45)';
  for (let j = 0; j < 4; j++) {
    ell(ctx, -u * 0.8 + j * u * 0.35, -u * 0.6 - (j % 2) * u * 0.15, u * 0.06, u * 0.05);
    ctx.fill();
  }
  // 앞지느러미
  ctx.fillStyle = '#6a7a8c';
  ell(ctx, u * 0.3, -u * 0.1, u * 0.3, u * 0.12, 0.4 - k);
  ctx.fill();
  // 눈 (졸림 / 신남)
  ctx.strokeStyle = '#1a2230';
  ctx.fillStyle = '#1a2230';
  if (k > 0.05) {
    ell(ctx, u * 0.78, -u * 0.86, u * 0.08, u * 0.09);
    ctx.fill();
  } else {
    ctx.lineWidth = Math.max(1, u * 0.07);
    ctx.beginPath();
    ctx.arc(u * 0.78, -u * 0.86, u * 0.08, 0.1, Math.PI - 0.1);
    ctx.stroke();
  }
  ell(ctx, u * 1.12, -u * 0.62, u * 0.07, u * 0.055);
  ctx.fill();
  ctx.strokeStyle = 'rgba(30,40,50,.6)';
  ctx.lineWidth = 1;
  for (const dy of [-0.05, 0.03]) {
    ctx.beginPath();
    ctx.moveTo(u * 1.05, -u * 0.55);
    ctx.lineTo(u * 1.4, -u * (0.55 + dy * 2));
    ctx.stroke();
  }
  ctx.restore();
  if (k <= 0.05) {
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.font = `900 ${Math.max(12, u * 0.6)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    const zz = (t * 0.4) % 40;
    ctx.globalAlpha = 1 - zz / 40;
    ctx.fillText('z', x + face * u * 0.7, y - u * 1.5 - zz * 0.4);
    ctx.globalAlpha = 1;
  }
}

function drawWall(ctx: C2, w: number, h: Haz, t: number) {
  const X = (v: number) => v * w;
  const x0 = X(h.xa), x1 = X(h.xb), yb = X(h.y + 0.004), top = X(h.y - 0.112), dep = X(0.03);
  ctx.fillStyle = 'rgba(30,80,120,.25)';
  ell(ctx, (x0 + x1) / 2 + 3, yb, (x1 - x0) * 0.75, X(0.012));
  ctx.fill();
  // 옆면
  ctx.fillStyle = '#6fb6de';
  ctx.beginPath();
  ctx.moveTo(x1, yb);
  ctx.lineTo(x1 + dep * 0.4, yb - dep);
  ctx.lineTo(x1 + dep * 0.4, top - dep);
  ctx.lineTo(x1, top);
  ctx.closePath();
  ctx.fill();
  // 윗면
  ctx.fillStyle = '#f2fbff';
  ctx.beginPath();
  ctx.moveTo(x0, top);
  ctx.lineTo(x0 + dep * 0.4, top - dep);
  ctx.lineTo(x1 + dep * 0.4, top - dep);
  ctx.lineTo(x1, top);
  ctx.closePath();
  ctx.fill();
  // 앞면
  const g = ctx.createLinearGradient(x0, top, x1, yb);
  g.addColorStop(0, '#e2f7ff');
  g.addColorStop(0.5, '#a8dcf3');
  g.addColorStop(1, '#79c0e4');
  ctx.fillStyle = g;
  ctx.fillRect(x0, top, x1 - x0, yb - top);
  ctx.strokeStyle = '#4f9cc8';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x0, top, x1 - x0, yb - top);
  ctx.strokeStyle = 'rgba(255,255,255,.8)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x0 + 4, top + 5);
  ctx.lineTo(x0 + 4, yb - 8);
  ctx.moveTo(x0 + 8, top + 5);
  ctx.lineTo(x1 - 6, top + 14);
  ctx.stroke();
  sparkle(ctx, x0 + (x1 - x0) * 0.7, top + (yb - top) * 0.3, X(0.012), 0.5 + 0.5 * Math.sin(t * 0.07 + h.xa * 10));
}

function drawRamp(ctx: C2, w: number, s: Sim, h: Haz, age: number) {
  const X = (v: number) => v * w;
  const L = s.legs[h.leg], dir = L.dir;
  const front = dir > 0 ? h.xa : h.xb;
  const grow = Math.min(1, age / 10), over = age < 16 ? 1 + Math.sin((age / 16) * Math.PI) * 0.18 : 1;
  const x0 = X(front - dir * RAMP_L), x1 = X(front), yb = X(h.y + 0.006), ht = X(0.072) * grow * over;
  ctx.fillStyle = 'rgba(30,80,120,.22)';
  ell(ctx, (x0 + x1) / 2, yb, Math.abs(x1 - x0) * 0.6, X(0.012));
  ctx.fill();
  const g = ctx.createLinearGradient(0, yb - ht, 0, yb);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, '#bfe2f4');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x0, yb);
  ctx.quadraticCurveTo(x0 + (x1 - x0) * 0.6, yb - ht * 0.3, x1, yb - ht);
  ctx.lineTo(x1, yb);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#5aa8d4';
  ctx.lineWidth = 2;
  ctx.stroke();
  // 줄무늬
  ctx.strokeStyle = 'rgba(255,120,80,.75)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x0 + (x1 - x0) * 0.35, yb - ht * 0.08);
  ctx.lineTo(x0 + (x1 - x0) * 0.4, yb);
  ctx.moveTo(x0 + (x1 - x0) * 0.7, yb - ht * 0.4);
  ctx.lineTo(x0 + (x1 - x0) * 0.75, yb);
  ctx.stroke();
}

function drawBridge(ctx: C2, w: number, s: Sim, h: Haz, age: number, t: number) {
  const X = (v: number) => v * w;
  const grow = Math.min(1, age / 9), over = age < 16 ? Math.sin((age / 16) * Math.PI) * X(0.03) : 0;
  const x0 = X(h.xa - 0.016), x1 = X(h.xb + 0.016), y = X(h.y + 0.006) + (1 - grow) * X(0.08) - over;
  const th = X(0.034);
  // 버팀 얼음 기둥
  ctx.fillStyle = `rgba(150,220,250,${0.7 * grow})`;
  for (const a of [0.3, 0.7]) {
    const px = x0 + (x1 - x0) * a;
    ctx.beginPath();
    ctx.moveTo(px - X(0.01), y + th * 0.3);
    ctx.lineTo(px + X(0.01), y + th * 0.3);
    ctx.lineTo(px + X(0.004), y + X(0.075) * grow);
    ctx.lineTo(px - X(0.004), y + X(0.075) * grow);
    ctx.closePath();
    ctx.fill();
  }
  ctx.save();
  ctx.globalAlpha = 0.4 + 0.6 * grow;
  const g = ctx.createLinearGradient(0, y - th, 0, y + th * 1.4);
  g.addColorStop(0, '#f4fdff');
  g.addColorStop(0.4, '#aee9ff');
  g.addColorStop(1, '#4fb3e0');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x0, y - th * 0.3);
  ctx.quadraticCurveTo((x0 + x1) / 2, y - th * 1.2, x1, y - th * 0.3);
  ctx.lineTo(x1, y + th * 0.6);
  ctx.quadraticCurveTo((x0 + x1) / 2, y + th * 0.1, x0, y + th * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#2f8fc4';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x0 + 5, y - th * 0.45);
  ctx.quadraticCurveTo((x0 + x1) / 2, y - th * 1.05, x1 - 5, y - th * 0.45);
  ctx.stroke();
  // 금 (금 간 다리)
  const cap = s.d.crack;
  if (cap) {
    const n = Math.min(cap, h.entered);
    ctx.strokeStyle = n >= cap - 1 ? '#d0402a' : '#1d6a9a';
    ctx.lineWidth = 1.4;
    for (let k = 0; k < n; k++) {
      const cx = x0 + (x1 - x0) * (0.2 + 0.6 * hsh(k * 5 + 1)), cy = y - th * 0.3;
      ctx.beginPath();
      ctx.moveTo(cx, cy - th * 0.4);
      ctx.lineTo(cx + th * 0.3, cy + th * 0.1);
      ctx.lineTo(cx - th * 0.1, cy + th * 0.4);
      ctx.lineTo(cx + th * 0.2, cy + th * 0.8);
      ctx.stroke();
    }
    if (n >= cap) {
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 0.6);
      ctx.fillStyle = '#d0402a';
      ctx.font = `900 ${Math.max(12, X(0.04))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('쩍…', (x0 + x1) / 2, y - th * 2);
    }
  }
  ctx.restore();
  sparkle(ctx, x0 + (x1 - x0) * 0.3, y - th * 0.7, X(0.012), 0.6 + 0.4 * Math.sin(t * 0.09));
}

/** 물살이 앞 턱을 넘어 바다까지 떨어지는 폭포 (아래층 뒤로 지나감) */
function drawFall(ctx: C2, w: number, h: Haz, t: number) {
  const X = (v: number) => v * w;
  const x0 = X(h.xa), x1 = X(h.xb), yf = X(h.y + LF);
  const fg = ctx.createLinearGradient(0, yf, 0, X(SEA));
  fg.addColorStop(0, 'rgba(110,215,245,.97)');
  fg.addColorStop(1, 'rgba(60,180,225,.9)');
  ctx.fillStyle = fg;
  ctx.fillRect(x0 + 2, yf, x1 - x0 - 4, X(SEA) - yf);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, yf, x1 - x0, X(SEA) - yf);
  ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,.8)';
  ctx.lineWidth = 2.2;
  for (let k = 0; k < 9; k++) {
    const xx = x0 + 5 + (k / 8) * (x1 - x0 - 10);
    const off = ((t * 3 + k * 23) % 60) / 60;
    const yy = yf + off * (X(SEA) - yf);
    ctx.beginPath();
    ctx.moveTo(xx, yy);
    ctx.lineTo(xx, yy + X(0.05));
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  for (let k = 0; k < 6; k++) {
    const xx = x0 + ((k + 0.5) / 6) * (x1 - x0);
    ell(ctx, xx + 3, X(SEA) + 1, X(0.016) + Math.sin(t * 0.25 + k * 2) * 2, X(0.008));
    ctx.fill();
  }
}

function drawWater(ctx: C2, w: number, s: Sim, h: Haz, t: number) {
  const X = (v: number) => v * w;
  const x0 = X(h.xa), x1 = X(h.xb), yb = X(h.y - LT), yf = X(h.y + LF), yd = X(h.y + LF + LD);
  // 웅덩이 (윗면)
  const g = ctx.createLinearGradient(0, yb, 0, yf);
  g.addColorStop(0, '#54c6e6');
  g.addColorStop(1, '#2aa7d6');
  ctx.fillStyle = g;
  ctx.fillRect(x0, yb, x1 - x0, yf - yb + 2);
  // 물살 결 (앞으로 흐름)
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, yb, x1 - x0, X(SEA) - yb);
  ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,.75)';
  ctx.lineWidth = 2;
  for (let k = 0; k < 6; k++) {
    const yy = yb + (((t * 0.6 + k * 9) % 40) / 40) * (yf - yb);
    const xx = x0 + ((k * 0.17 + 0.08) % 1) * (x1 - x0);
    ctx.beginPath();
    ctx.moveTo(xx - 8, yy);
    ctx.quadraticCurveTo(xx, yy - 2, xx + 8, yy);
    ctx.stroke();
  }
  // 앞 턱을 넘는 물 (위쪽만)
  const fg = ctx.createLinearGradient(0, yf, 0, yd + X(0.03));
  fg.addColorStop(0, 'rgba(120,220,248,1)');
  fg.addColorStop(1, 'rgba(80,195,235,.95)');
  ctx.fillStyle = fg;
  ctx.fillRect(x0 + 2, yf, x1 - x0 - 4, yd - yf + X(0.03));
  ctx.strokeStyle = 'rgba(255,255,255,.85)';
  ctx.lineWidth = 2.2;
  for (let k = 0; k < 9; k++) {
    const xx = x0 + 5 + (k / 8) * (x1 - x0 - 10);
    const off = ((t * 3 + k * 23) % 30) / 30;
    const yy = yf + off * (yd - yf + X(0.03));
    ctx.beginPath();
    ctx.moveTo(xx, yy);
    ctx.lineTo(xx, yy + X(0.03));
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  for (let k = 0; k < 6; k++) {
    const xx = x0 + ((k + 0.5) / 6) * (x1 - x0);
    ell(ctx, xx, yf + 1, X(0.012) + Math.sin(t * 0.3 + k) * 1.5, X(0.007));
    ctx.fill();
  }
  // 웅덩이 둑(잘린 면)
  ctx.fillStyle = '#c2ebfa';
  ctx.fillRect(x0 - 1, yb, X(0.01), yd - yb);
  ctx.fillStyle = '#5aa3cf';
  ctx.fillRect(x1 - X(0.01) + 1, yb, X(0.01), yd - yb);
  // 뗏목
  const R = h.raft;
  if (R) {
    const L = s.legs[h.leg];
    const [nx] = legPos(L, h.u0 - 0.005), [fx2] = legPos(L, h.u1 + 0.005);
    const cx = X(nx + (fx2 - nx) * R.p), cy = X(h.y + 0.012) + Math.sin(t * 0.12) * 1.5;
    const age = s.st - h.riseT, grow = Math.min(1, age / 10);
    const rw = X(0.075) * grow;
    ctx.fillStyle = 'rgba(20,70,110,.3)';
    ell(ctx, cx, cy + X(0.012), rw * 1.05, X(0.014));
    ctx.fill();
    const rg = ctx.createLinearGradient(0, cy - X(0.02), 0, cy + X(0.015));
    rg.addColorStop(0, '#ffffff');
    rg.addColorStop(1, '#9ad8f2');
    ctx.fillStyle = rg;
    rr(ctx, cx - rw, cy - X(0.012), rw * 2, X(0.024), X(0.01));
    ctx.fill();
    ctx.strokeStyle = '#3f9acb';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // 깃발
    ctx.strokeStyle = '#7a5030';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx + rw * 0.8, cy - X(0.01));
    ctx.lineTo(cx + rw * 0.8, cy - X(0.06));
    ctx.stroke();
    ctx.fillStyle = '#ff5a3a';
    ctx.beginPath();
    ctx.moveTo(cx + rw * 0.8, cy - X(0.06));
    ctx.lineTo(cx + rw * 0.8 + X(0.03), cy - X(0.05) + Math.sin(t * 0.2) * 1.5);
    ctx.lineTo(cx + rw * 0.8, cy - X(0.04));
    ctx.closePath();
    ctx.fill();
  }
}

/** 계단 (눈 계단) */
function drawSteps(ctx: C2, w: number, L: Leg) {
  const X = (v: number) => v * w;
  const n = 6;
  for (let k = 0; k < n; k++) {
    const a = k / n, b = (k + 1) / n;
    const xa = L.ax + (L.bx - L.ax) * a, ya = L.ay + (L.by - L.ay) * b;
    const sw = 0.07;
    const g = ctx.createLinearGradient(0, X(ya - 0.012), 0, X(ya + 0.03));
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.3, '#d9f0fb');
    g.addColorStop(1, '#88c6e6');
    ctx.fillStyle = g;
    rr(ctx, X(xa - sw / 2 + (L.bx - L.ax) * 0.5 / n), X(ya - 0.012), X(sw), X(0.044), 3);
    ctx.fill();
    ctx.strokeStyle = 'rgba(80,140,190,.6)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

/** 미끄럼 굴 (갈림길에서 가운데층으로) */
function drawChute(ctx: C2, w: number, s: PengState, front: boolean) {
  const X = (v: number) => v * w;
  const L = s.legs[6];
  const f = L.ax;
  if (!front) {
    // 구멍 + 관
    ctx.strokeStyle = 'rgba(70,170,220,.55)';
    ctx.lineWidth = X(0.07);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(X(f), X(Y0 + 0.01));
    ctx.quadraticCurveTo(X(f + 0.03), X((Y0 + Y1) / 2), X(L.bx), X(Y1 - 0.02));
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.5)';
    ctx.lineWidth = X(0.014);
    ctx.beginPath();
    ctx.moveTo(X(f - 0.015), X(Y0 + 0.02));
    ctx.quadraticCurveTo(X(f + 0.012), X((Y0 + Y1) / 2), X(L.bx - 0.015), X(Y1 - 0.03));
    ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.fillStyle = s.sign ? '#163a58' : '#2a5a7a';
    ell(ctx, X(f), X(Y0 - 0.012), X(0.04), X(0.017));
    ctx.fill();
  } else {
    // 뚜껑 (곧장일 때)
    if (!s.sign) {
      ctx.fillStyle = '#c98a4a';
      rr(ctx, X(f - 0.045), X(Y0 - 0.026), X(0.09), X(0.024), 3);
      ctx.fill();
      ctx.strokeStyle = '#7a4a1a';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(X(f - 0.015), X(Y0 - 0.026));
      ctx.lineTo(X(f - 0.015), X(Y0 - 0.002));
      ctx.moveTo(X(f + 0.015), X(Y0 - 0.026));
      ctx.lineTo(X(f + 0.015), X(Y0 - 0.002));
      ctx.stroke();
    }
    // 관 앞쪽 반투명
    ctx.strokeStyle = 'rgba(200,240,255,.35)';
    ctx.lineWidth = X(0.07);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(X(f), X(Y0 + 0.03));
    ctx.quadraticCurveTo(X(f + 0.03), X((Y0 + Y1) / 2), X(L.bx), X(Y1 - 0.02));
    ctx.stroke();
    ctx.lineCap = 'butt';
  }
}

function drawSlope(ctx: C2, w: number, s: Sim, h: Haz, t: number) {
  const X = (v: number) => v * w;
  const L = s.legs[h.leg];
  // 얼음 비탈 (뒤 벽에 기댄 쐐기)
  ctx.fillStyle = '#7cc0e2';
  ctx.beginPath();
  ctx.moveTo(X(L.ax + 0.01), X(L.ay + LF));
  ctx.lineTo(X(L.bx - 0.03), X(L.by + LF));
  ctx.lineTo(X(L.ax + 0.01), X(L.by + LF));
  ctx.closePath();
  ctx.fill();
  const g = ctx.createLinearGradient(X(L.ax), X(L.ay), X(L.bx), X(L.by));
  g.addColorStop(0, '#e6f9ff');
  g.addColorStop(1, '#a6dcf3');
  ctx.strokeStyle = g;
  ctx.lineWidth = X(0.03);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(X(L.ax), X(L.ay));
  ctx.lineTo(X(L.bx), X(L.by));
  ctx.stroke();
  ctx.lineCap = 'butt';
  // 반짝 (미끄러움)
  for (let k = 0; k < 3; k++) {
    const a = 0.25 + k * 0.25;
    sparkle(ctx, X(L.ax + (L.bx - L.ax) * a), X(L.ay + (L.by - L.ay) * a - 0.012), X(0.013), 0.5 + 0.5 * Math.sin(t * 0.1 + k * 2));
  }
  if (h.fixed) {
    const age = s.st - h.riseT, grow = Math.min(1, age / 10);
    const nx = L.ax + (L.bx - L.ax) * grow, ny = L.ay + (L.by - L.ay) * grow;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#2f9fe0';
    ctx.lineWidth = X(0.045);
    ctx.beginPath();
    ctx.moveTo(X(L.ax), X(L.ay - 0.006));
    ctx.lineTo(X(nx), X(ny - 0.006));
    ctx.stroke();
    ctx.strokeStyle = '#bff0ff';
    ctx.lineWidth = X(0.026);
    ctx.stroke();
    ctx.setLineDash([6, 8]);
    ctx.lineDashOffset = -t * 2;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineCap = 'butt';
  }
}

/** 아직 안 놓은 도구 미리 보기 (점선 + 이름) */
function ghost(ctx: C2, w: number, s: PengState, i: number, t: number) {
  const X = (v: number) => v * w;
  const h = s.haz[i], [ax, ay] = anchorOf(s, i);
  const a = 0.55 + 0.35 * Math.sin(t * 0.12 + i);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.setLineDash([5, 4]);
  ctx.lineDashOffset = -t * 0.5;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.2;
  if (h.k === GAP) {
    ctx.beginPath();
    ctx.moveTo(X(h.xa - 0.01), X(h.y));
    ctx.quadraticCurveTo(X((h.xa + h.xb) / 2), X(h.y - 0.03), X(h.xb + 0.01), X(h.y));
    ctx.stroke();
  } else if (h.k === WALL) {
    const dir = s.legs[h.leg].dir, fr = dir > 0 ? h.xa : h.xb;
    ctx.beginPath();
    ctx.moveTo(X(fr - dir * RAMP_L), X(h.y + 0.004));
    ctx.lineTo(X(fr), X(h.y - 0.08));
    ctx.lineTo(X(fr), X(h.y + 0.004));
    ctx.stroke();
  } else if (h.k === WATER) {
    rr(ctx, X(h.xb - 0.09), X(h.y - 0.01), X(0.075 * 2), X(0.024), 4);
    ctx.stroke();
  } else if (h.k === SLOPE) {
    const L = s.legs[h.leg];
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(X(L.ax), X(L.ay - 0.01));
    ctx.lineTo(X(L.bx), X(L.by - 0.01));
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  // 이름 표
  const lab = TOOL[h.k];
  ctx.font = `900 ${Math.max(12, X(0.036))}px system-ui, sans-serif`;
  const tw = ctx.measureText(lab).width + X(0.04);
  const ly = X(ay + (h.k === WALL ? -0.12 : h.k === SLOPE ? 0 : 0.078));
  const lx = Math.max(tw / 2 + 3, Math.min(w - tw / 2 - 3, X(ax)));
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = 'rgba(22,80,126,.85)';
  rr(ctx, lx - tw / 2, ly - X(0.022), tw, X(0.044), X(0.022));
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(lab, lx, ly + 1);
  ctx.restore();
}

const evMark = new WeakMap<object, number>();
const bigWord = new WeakMap<object, { text: string; t: number; x: number; y: number; k: number }>();
const cheerT = new WeakMap<object, number>();
/** 도구가 솟은 순간: 둘레 줄 선 펭귄들이 한꺼번에 폴짝 (그림만) */
const hooray = new WeakMap<object, { t: number; x: number; y: number }>();

function drawAll(ctx: C2, s: PengState, w: number, h: number, th: Theme) {
  void th;
  const fx = juice(s), t = s.t, d = s.d;
  const X = (v: number) => v * w;
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, X(sz))}px system-ui, sans-serif`);
  // ── 사건 → 연출 ──
  {
    const last = evMark.get(s) ?? -1;
    for (const e of s.events) {
      if (e.t <= last) continue;
      const ex = X(e.x), ey = X(e.y);
      switch (e.kind) {
        case 'rise':
          fx.kick(10);
          fx.blink('#ffffff', 0.4);
          fx.ring(ex, ey, '#ffffff', X(0.22), 5);
          fx.ring(ex, ey, '#9fe6ff', X(0.34), 3);
          fx.burst(ex, ey, '#ffffff', 26, 5.5, 3.2);
          fx.burst(ex, ey, '#8fe0ff', 18, 4, 2.6);
          bigWord.set(s, { text: e.text ?? '쩡!', t: e.t, x: ex, y: ey - X(0.08), k: e.n ?? 0 });
          hooray.set(s, { t: e.t, x: e.x, y: e.y });
          break;
        case 'use': {
          const lp = fx.memo.usePop ?? -99;
          if (e.t - lp > 20) {
            fx.memo.usePop = e.t;
            fx.memo.useSide = -(fx.memo.useSide ?? 1);
            fx.pop(ex + fx.memo.useSide * X(0.03), ey, e.text ?? '', '#ffffff', X(0.04));
          }
          fx.burst(ex, ey + X(0.11), e.n === 2 ? '#bff0ff' : '#ffffff', 7, 2.4, 2.2);
          break;
        }
        case 'chain':
          fx.pop(ex, ey, e.text ?? '', '#ffd23a', X(0.07));
          fx.burst(ex, ey, '#ffd23a', 20, 4.5, 2.6);
          fx.kick(5);
          break;
        case 'land':
          fx.burst(ex, ey, '#ffffff', 8, 2, 2.2);
          break;
        case 'oops':
          fx.pop(ex, ey, e.text ?? '', '#ffe2d6', X(0.04));
          break;
        case 'eek':
          fx.pop(ex, ey, e.text ?? '', '#fff6c0', X(0.036));
          break;
        case 'splash':
          fx.burst(ex, ey, '#ffffff', 22, 4.5, 2.8);
          fx.burst(ex, ey, '#7fe0ff', 14, 3.5, 2.2);
          fx.ring(ex, ey, 'rgba(255,255,255,.9)', X(0.08), 3);
          fx.pop(ex, ey - X(0.05), '퐁!', '#ffffff', X(0.05));
          fx.kick(3);
          break;
        case 'bonk':
          fx.burst(ex, ey, '#ffd23a', 12, 3, 2.4);
          fx.pop(ex, ey - X(0.04), '쿵!', '#ffe08a', X(0.05));
          fx.kick(4);
          break;
        case 'crack':
          fx.burst(ex, ey, '#bff0ff', 30, 5, 3);
          fx.burst(ex, ey, '#ffffff', 16, 4, 2.4);
          fx.pop(ex, ey - X(0.08), e.text ?? '', '#ffb3a0', X(0.055));
          fx.kick(8);
          break;
        case 'home':
          fx.burst(ex, ey, '#ff8fb0', 10, 3, 2.4);
          fx.burst(ex, ey, '#ffd23a', 8, 3, 2);
          fx.pop(ex, ey - X(0.04), e.text ?? '+1', '#fff3a0', X(0.05));
          cheerT.set(s, t);
          break;
        case 'sign':
          fx.ring(ex, ey, '#ffd23a', X(0.12), 4);
          fx.pop(ex, ey - X(0.08), e.text ?? '', '#ffffff', X(0.045));
          fx.kick(3);
          break;
        case 'puff':
          fx.ring(ex, ey, 'rgba(255,255,255,.85)', X(0.05), 2.5);
          fx.burst(ex, ey, '#ffffff', 5, 1.5, 1.8);
          break;
        case 'noice':
          fx.pop(ex, ey, e.text ?? '', '#ffb3a8', X(0.042));
          break;
        case 'out':
          fx.pop(ex, ey, e.text ?? '', '#ffffff', X(0.04));
          break;
        case 'hop':
          fx.burst(ex, ey + X(0.1), '#bff0ff', 5, 1.6, 1.8);
          break;
        case 'clear':
          fx.blink('#fff6c0', 0.3);
          for (let k = 0; k < 5; k++) fx.burst(X(0.15 + k * 0.17), X(0.35), ['#ffd23a', '#ff6a8a', '#7fe0ff', '#9aff8a', '#ffffff'][k], 16, 5, 2.8);
          break;
      }
    }
    evMark.set(s, s.events.length ? s.events[s.events.length - 1].t : last);
  }
  ctx.save();
  fx.begin(ctx);
  // ── 하늘 ──
  {
    const g = ctx.createLinearGradient(0, 0, 0, X(0.37));
    g.addColorStop(0, '#5cb8ef');
    g.addColorStop(0.5, '#a9e0fb');
    g.addColorStop(0.85, '#ffe3c4');
    g.addColorStop(1, '#ffd2a8');
    ctx.fillStyle = g;
    ctx.fillRect(-10, -10, w + 20, X(0.38) + 10);
    // 해
    const sx = X(0.8 - Math.min(1, s.st / 3000) * 0.12), sy = X(0.155);
    const sg = ctx.createRadialGradient(sx, sy, 2, sx, sy, X(0.16));
    sg.addColorStop(0, 'rgba(255,250,210,1)');
    sg.addColorStop(0.25, 'rgba(255,236,160,.8)');
    sg.addColorStop(1, 'rgba(255,220,150,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(sx - X(0.17), sy - X(0.17), X(0.34), X(0.34));
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(t * 0.003);
    ctx.fillStyle = 'rgba(255,240,180,.35)';
    for (let k = 0; k < 10; k++) {
      ctx.rotate(TAU / 10);
      ctx.beginPath();
      ctx.moveTo(-X(0.012), X(0.05));
      ctx.lineTo(X(0.012), X(0.05));
      ctx.lineTo(0, X(0.11));
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = '#fff6c8';
    ell(ctx, sx, sy, X(0.04), X(0.04));
    ctx.fill();
    // 갈매기
    for (let k = 0; k < 2; k++) {
      const gx = X(((0.2 + k * 0.55 + t * 0.0006 * (k ? 0.8 : 1)) % 1.3) - 0.15), gy = X(0.2 + k * 0.05 + Math.sin(t * 0.02 + k) * 0.012);
      const fl = Math.sin(t * 0.25 + k * 2) * X(0.012);
      ctx.strokeStyle = '#3a5068';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(gx - X(0.03), gy - fl);
      ctx.quadraticCurveTo(gx - X(0.012), gy - X(0.014), gx, gy);
      ctx.quadraticCurveTo(gx + X(0.012), gy - X(0.014), gx + X(0.03), gy - fl);
      ctx.stroke();
      ctx.lineCap = 'butt';
    }
    // 구름
    for (let k = 0; k < 3; k++) {
      const cx = ((0.15 + k * 0.42 + t * 0.00005 * (1 + k * 0.4)) % 1.3) - 0.15, cy = 0.13 + k * 0.035;
      ctx.fillStyle = 'rgba(255,255,255,.92)';
      for (const [dx, dy, r] of [[0, 0, 0.035], [0.035, -0.012, 0.03], [0.07, 0, 0.028], [0.035, 0.008, 0.035]]) {
        ell(ctx, X(cx + dx), X(cy + dy), X(r * 1.2), X(r * 0.75));
        ctx.fill();
      }
    }
    // 먼 산 (두 겹)
    const mtn = (base: number, col: string, cap: string, seed: number, amp: number) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(-5, X(base));
      const pk: number[][] = [];
      for (let k = 0; k <= 6; k++) {
        const px = (k / 6) * 1.1 - 0.05, py = base - amp * (0.5 + hsh(k + seed) * 0.6);
        pk.push([px, py]);
        ctx.lineTo(X(px - 0.08), X(base - amp * 0.2));
        ctx.lineTo(X(px), X(py));
      }
      ctx.lineTo(w + 5, X(base));
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = cap;
      for (const [px, py] of pk) {
        ctx.beginPath();
        ctx.moveTo(X(px - 0.035), X(py + 0.03));
        ctx.lineTo(X(px), X(py));
        ctx.lineTo(X(px + 0.035), X(py + 0.03));
        ctx.lineTo(X(px + 0.012), X(py + 0.022));
        ctx.lineTo(X(px), X(py + 0.032));
        ctx.closePath();
        ctx.fill();
      }
    };
    mtn(0.36, '#c6b4ea', '#ffffff', 3, 0.11);
    mtn(0.37, '#a6c8f0', '#f4fbff', 11, 0.06);
  }
  // ── 절벽 (뒤 벽) ──
  {
    const top = X(Y0 - LT), bot = X(SEA);
    const g = ctx.createLinearGradient(0, top, 0, bot);
    g.addColorStop(0, '#a8daf1');
    g.addColorStop(1, '#6cb2db');
    ctx.fillStyle = g;
    ctx.fillRect(-10, top, w + 20, bot - top + 2);
    ctx.strokeStyle = 'rgba(255,255,255,.22)';
    ctx.lineWidth = 2;
    for (let k = 0; k < 14; k++) {
      const xx = X(hsh(k * 3.1) * 1.0), y0 = top + X(hsh(k * 1.7) * 0.6);
      ctx.beginPath();
      ctx.moveTo(xx, y0);
      ctx.lineTo(xx + X(0.02), y0 + X(0.08 + hsh(k) * 0.06));
      ctx.stroke();
    }
    for (let k = 0; k < 8; k++) sparkle(ctx, X(hsh(k * 5.3)), top + X(0.08 + hsh(k * 2.9) * 0.6), X(0.01), 0.3 + 0.5 * Math.sin(t * 0.04 + k * 1.9));
  }
  // ── 바다 ──
  {
    const top = X(SEA - 0.008), bot = X(BAND) + 4;
    const g = ctx.createLinearGradient(0, top, 0, bot);
    g.addColorStop(0, '#45c6e2');
    g.addColorStop(1, '#1a8dc0');
    ctx.fillStyle = g;
    ctx.fillRect(-10, top, w + 20, bot - top);
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = 1.6;
    for (let r = 0; r < 3; r++) {
      const yy = top + X(0.022 + r * 0.03);
      ctx.beginPath();
      for (let k = 0; k <= 24; k++) {
        const xx = (k / 24) * w;
        ctx.lineTo(xx, yy + Math.sin(k * 1.3 + t * 0.06 + r * 2) * 1.6);
      }
      ctx.stroke();
    }
    // 떠다니는 얼음 조각
    for (let k = 0; k < 3; k++) {
      const fx2 = X(((0.3 + k * 0.33 + t * 0.00025 * (1 + k * 0.3)) % 1.2) - 0.1), fy = top + X(0.045 + (k % 2) * 0.025) + Math.sin(t * 0.05 + k) * 1.2;
      const fw = X(0.04 + (k % 2) * 0.02);
      ctx.fillStyle = 'rgba(20,80,120,.25)';
      ell(ctx, fx2, fy + X(0.008), fw, X(0.008));
      ctx.fill();
      ctx.fillStyle = '#f4fcff';
      rr(ctx, fx2 - fw, fy - X(0.008), fw * 2, X(0.014), X(0.007));
      ctx.fill();
      ctx.fillStyle = '#9fd8f0';
      ctx.fillRect(fx2 - fw + 2, fy + X(0.003), fw * 2 - 4, X(0.004));
    }
    // 절벽 밑 거품
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    for (let k = 0; k < 16; k++) {
      ell(ctx, X(k / 15), top + 1, X(0.03) + Math.sin(t * 0.08 + k) * 2, X(0.007));
      ctx.fill();
    }
    // 못 간 펭귄 얼음섬
    if (s.outN > 0) {
      const fw = X(0.07 + Math.min(5, Math.ceil(s.outN / 2)) * 0.05);
      ctx.fillStyle = 'rgba(20,70,110,.3)';
      ell(ctx, X(0.03) + fw / 2, X(SEA + 0.03), fw / 2 + 3, X(0.012));
      ctx.fill();
      ctx.fillStyle = '#f2fbff';
      rr(ctx, X(0.03), X(SEA + 0.005), fw, X(0.02), 5);
      ctx.fill();
      ctx.strokeStyle = '#7cc0e2';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }
  // ── 층 길 ──
  const holes = (tier: number) => {
    const out: number[][] = [];
    for (const hz of s.haz) {
      if ((hz.k === GAP || hz.k === WATER) && Math.abs(hz.y - [Y0, Y1, Y2][tier]) < 0.01) out.push([hz.xa, hz.xb]);
    }
    return out.sort((a, b) => a[0] - b[0]);
  };
  const ledgeCut = (tier: number, x0: number, x1: number) => {
    let cur = x0;
    const y = [Y0, Y1, Y2][tier];
    for (const [a, b] of holes(tier)) {
      if (b < x0 || a > x1) continue;
      if (a > cur) ledge(ctx, w, y, cur, a, t, tier === 0);
      cur = Math.max(cur, b);
    }
    if (cur < x1) ledge(ctx, w, y, cur, x1, t, tier === 0);
    for (const [a, b] of holes(tier)) if (!(b < x0 || a > x1)) {
      const hz = s.haz.find((q) => q.xa === a && Math.abs(q.y - y) < 0.01)!;
      if (hz.k === GAP) crevasse(ctx, w, y, a, b);
    }
  };
  // 아래층 · 절벽 밑동
  {
    const g = ctx.createLinearGradient(0, X(Y2 + LF + LD), 0, X(SEA));
    g.addColorStop(0, '#4f98c4');
    g.addColorStop(1, '#3a84b4');
    ctx.fillStyle = g;
    ctx.fillRect(-5, X(Y2 + LF + LD - 0.004), w + 10, X(SEA - Y2 - LF - LD) + 4);
  }
  for (const hz of s.haz) if (hz.k === WATER) drawFall(ctx, w, hz, t);
  ledgeCut(2, -0.02, 1.02);
  if (d.fork) ledgeCut(1, 0.09, d.fork.f - 0.035);
  ledgeCut(1, d.g - 0.012, 1.02);
  ledgeCut(0, -0.02, 0.93);
  // 물살 (웅덩이·폭포)
  for (const hz of s.haz) if (hz.k === WATER) drawWater(ctx, w, s, hz, t);
  // 계단 · 비탈 · 미끄럼 굴
  for (const li of [2, 4, 8]) {
    if (li === 8 && !d.fork) continue;
    const L = s.legs[li];
    if (L.kind === STEPS) drawSteps(ctx, w, L);
  }
  for (const hz of s.haz) if (hz.k === SLOPE) drawSlope(ctx, w, s, hz, t);
  if (d.fork) drawChute(ctx, w, s, false);
  drawProps(ctx, w, s, t);
  drawBurrow(ctx, w, s, t);
  drawIgloo(ctx, w, s, t, t - (cheerT.get(s) ?? -999) < 80 ? 1 : 0);
  // 장애 · 도구
  for (const hz of s.haz) {
    if (hz.k === WALL) {
      if (hz.fixed) drawRamp(ctx, w, s, hz, s.st - hz.riseT);
      drawWall(ctx, w, hz, t);
    } else if (hz.k === GAP && hz.fixed) drawBridge(ctx, w, s, hz, s.st - hz.riseT, t);
    else if (hz.k === GAP && s.st - hz.brokeT < 40) {
      // 깨진 다리 조각이 떨어진다
      const a = (s.st - hz.brokeT) / 40;
      ctx.fillStyle = `rgba(180,235,255,${1 - a})`;
      for (let k = 0; k < 5; k++) {
        const px = hz.xa + ((k + 0.5) / 5) * (hz.xb - hz.xa);
        rr(ctx, X(px - 0.012), X(hz.y + a * a * 0.4 + hsh(k) * 0.02), X(0.024), X(0.016), 3);
        ctx.fill();
      }
    } else if (hz.k === SEAL) {
      const [sx, sy] = legPos(s.legs[hz.leg], hz.u0);
      drawSeal(ctx, X(sx), X(sy + 0.004), X(0.058), -s.legs[hz.leg].dir, t, s.st - hz.slapT);
    }
  }
  if (d.fork) drawSign(ctx, w, s, t);
  // 미리 보기
  if (s.phase === 'play') s.haz.forEach((hz, i) => hz.k !== SEAL && !hz.fixed && ghost(ctx, w, s, i, t));
  // ── 펭귄 ──
  const U = X(0.05);
  const list = s.pens.filter((p) => p.st !== IN && p.st !== BACK && !(p.st === ENTER && s.st - p.t > ENTER_T)).sort((a, b) => a.y - b.y);
  for (const p of list) {
    const L = s.legs[p.leg];
    let pose = P_WALK, rot = 0, px = X(p.x), py = X(p.y);
    if (p.st === GO) {
      const h0 = s.byLeg[p.leg].map((i) => s.haz[i]).find((q) => q.k === GAP && q.fixed && p.u >= q.u0 - 0.004 && p.u <= q.u1 + 0.004);
      const sl = L.kind === SLOPEL || L.kind === CHUTE;
      const moving = s.pens.some((q) => q === p) && gapAhead(s, p) > QS + 0.004;
      if (h0 || sl || p.boost > 0.025) {
        pose = P_BELLY;
        if (sl) rot = Math.atan2(L.by - L.ay, Math.abs(L.bx - L.ax)) * L.dir;
      } else pose = moving ? P_WALK : P_STAND;
      if (L.kind === STEPS) py -= Math.abs(Math.sin((p.u / L.len) * Math.PI * 5)) * X(0.014);
    } else if (p.st === TEETER) pose = P_TEETER;
    else if (p.st === BONK) pose = P_DIZZY;
    else if (p.st === JUMP) {
      pose = P_FLIP;
      rot = ((s.st - p.t) / p.dur) * TAU * p.face;
    } else if (p.st === RAFT) pose = P_STAND;
    else if (p.st === FLY) {
      pose = P_FALL;
      rot = (s.st - p.t) * 0.08 * p.spin * p.face;
    } else if (p.st === SWIM) pose = P_SWIM;
    else if (p.st === OUT) {
      const row = p.seat % 2, col = Math.floor(p.seat / 2);
      drawPeng(ctx, X(0.055 + col * 0.05 + row * 0.025), X(SEA + 0.012 - row * 0.012), U * 0.72, 1, P_COLD, t, p.ph, 0, true);
      continue;
    } else if (p.st === ENTER) {
      const k = (s.st - p.t) / ENTER_T;
      ctx.save();
      ctx.globalAlpha = 1 - k;
      drawPeng(ctx, X(DOOR_X + k * 0.03), py, U * (1 - k * 0.5), 1, P_WALK, t, p.ph, 0, p.wet);
      ctx.restore();
      continue;
    }
    const hy = hooray.get(s);
    if (hy && t - hy.t < 26 && (p.st === GO || p.st === TEETER || p.st === BONK) && pose !== P_BELLY && Math.abs(p.x - hy.x) < 0.5 && Math.abs(p.y - hy.y) < 0.12) {
      const k = (t - hy.t - Math.abs(p.x - hy.x) * 20) / 18;
      if (k > 0 && k < 1) {
        pose = P_CHEER;
        py -= Math.sin(k * Math.PI) * X(0.04);
      }
    }
    drawPeng(ctx, px, py, U, p.face, pose, t, p.ph, rot, p.wet);
  }
  if (d.fork) drawChute(ctx, w, s, true);
  // 큰 글자 (쩡!)
  const bw = bigWord.get(s);
  if (bw && t - bw.t < 46) {
    const age = t - bw.t, sc = age < 6 ? 0.5 + age * 0.17 : 1.5 - Math.min(0.5, (age - 6) * 0.03);
    ctx.save();
    ctx.globalAlpha = Math.min(1, (46 - age) / 14);
    ctx.translate(Math.max(X(0.15), Math.min(w - X(0.15), bw.x)), bw.y - age * 0.4);
    ctx.scale(sc, sc);
    font(0.075, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#1d5a8a';
    ctx.strokeText(bw.text, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(bw.text, 0, 0);
    ctx.restore();
  }
  // NEW 스포트라이트
  if (s.spot && s.phase === 'play' && t - s.spot.t < SPOT_T) {
    const sp = s.spot, a = Math.min(1, (SPOT_T - (t - sp.t)) / 30), pul = 1 + 0.06 * Math.sin(t * 0.2);
    const cx = X(sp.x), cy = X(sp.y), rx = X(sp.r) * pul, ry = X(sp.r * 0.8) * pul;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = '#ffd23a';
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 7]);
    ctx.lineDashOffset = -t * 0.8;
    ell(ctx, cx, cy, rx, ry);
    ctx.stroke();
    ctx.setLineDash([]);
    font(0.038, 900);
    const lab = `NEW  ${sp.label}`, tw = ctx.measureText(lab).width + X(0.05);
    const lx = Math.max(tw / 2 + 4, Math.min(w - tw / 2 - 4, cx)), ly = Math.max(X(0.12), cy - ry - X(0.045));
    if (s.banner && t - s.banner.t < BANNER_T && ly < X(0.21)) ctx.globalAlpha = 0;
    ctx.fillStyle = '#ff5a3a';
    rr(ctx, lx - tw / 2, ly - X(0.025), tw, X(0.05), X(0.025));
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(lab, lx, ly + 1);
    ctx.restore();
  }
  // 첫 판 안내: 손가락이 틈을 톡
  if (s.stage === 0 && s.firstTap < 0 && s.phase === 'play' && s.haz[0] && !s.haz[0].fixed) {
    const [ax, ay] = anchorOf(s, 0);
    const cyc = t % 70, press = cyc < 10 ? cyc / 10 : cyc < 20 ? 1 - (cyc - 10) / 10 : 0;
    const hx = X(ax), hy = X(ay);
    if (cyc >= 10 && cyc < 40) {
      const u = (cyc - 10) / 30;
      ctx.strokeStyle = `rgba(255,255,255,${1 - u})`;
      ctx.lineWidth = 3;
      ell(ctx, hx, hy, X(0.03 + u * 0.08), X((0.03 + u * 0.08) * 0.7));
      ctx.stroke();
    }
    drawHand(ctx, hx, hy, X(0.09), press);
    font(0.044, 900);
    const txt = '👆 길을 톡! 다리가 생겨요', tw = ctx.measureText(txt).width + X(0.06), bx = Math.max(tw / 2 + 6, Math.min(w - tw / 2 - 6, hx)), by = hy + X(0.175);
    ctx.fillStyle = 'rgba(255,255,255,.97)';
    rr(ctx, bx - tw / 2, by - X(0.034), tw, X(0.068), X(0.034));
    ctx.fill();
    ctx.strokeStyle = '#ff6a3d';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(bx - 7, by - X(0.032));
    ctx.lineTo(bx + 7, by - X(0.032));
    ctx.lineTo(bx, by - X(0.056));
    ctx.closePath();
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#16507e';
    ctx.fillText(txt, bx, by + 1);
  }
  ctx.restore();

  // ═════ 위 띠: 판 · 하트 · 별 ═════
  {
    const hb = X(0.088);
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    rr(ctx, X(0.015), X(0.01), w - X(0.03), hb - X(0.012), X(0.035));
    ctx.fill();
    ctx.strokeStyle = 'rgba(40,130,190,.45)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    const cy = X(0.01) + (hb - X(0.012)) / 2;
    ctx.fillStyle = '#ff6a3d';
    ell(ctx, X(0.06), cy, X(0.028), X(0.028));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    font(0.036, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(s.stage + 1), X(0.06), cy + 1);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#14304a';
    font(0.042, 900);
    ctx.fillText(d.name, X(0.1), cy + 1, X(0.34));
    const nw = Math.min(X(0.34), ctx.measureText(d.name).width);
    font(0.036, 700);
    ctx.fillStyle = '#6a8aa8';
    ctx.fillText(` / ${STAGE_COUNT}`, X(0.1) + nw, cy + 2);
    ctx.textAlign = 'right';
    font(0.042, 900);
    const st = String(s.stars), sw = ctx.measureText(st).width;
    ctx.fillStyle = '#d88a08';
    ctx.fillText(st, w - X(0.04), cy + 1);
    starPath(ctx, w - X(0.04) - sw - X(0.026), cy, X(0.021));
    ctx.fillStyle = '#ffd23a';
    ctx.fill();
    ctx.strokeStyle = '#9a5a08';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    for (let j = 0; j < 3; j++) {
      const hx = w - X(0.04) - sw - X(0.09) - j * X(0.052);
      heartPath(ctx, hx, cy, X(0.018));
      ctx.fillStyle = 2 - j < s.hearts ? '#ff4a5e' : 'rgba(60,90,120,.18)';
      ctx.fill();
      ctx.strokeStyle = 2 - j < s.hearts ? '#9a1a2a' : 'rgba(60,90,120,.3)';
      ctx.lineWidth = 1.3;
      ctx.stroke();
    }
  }
  // ═════ 판 카드 · 결과 ═════
  {
    let head = '', sub = '', a = 0, age = 0;
    if (s.phase === 'result') {
      age = s.pt;
      a = Math.min(1, age / 8);
    } else if (s.banner && t - s.banner.t < BANNER_T) {
      age = t - s.banner.t;
      a = Math.min(1, age / 8, (BANNER_T - age) / 25);
      (head = s.banner.head), (sub = s.banner.sub);
    }
    if (s.phase === 'result' && a > 0) {
      const ok = s.ok, L = starList(s.stage);
      const cw = X(0.84), ch = ok ? X(0.2) + L.length * X(0.05) : X(0.24), cy = X(0.55);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(w / 2, cy);
      const pop = Math.min(1, 0.6 + age / 12);
      ctx.scale(pop, pop);
      ctx.fillStyle = 'rgba(10,40,70,.3)';
      rr(ctx, -cw / 2 + 3, -ch / 2 + 6, cw, ch, X(0.04));
      ctx.fill();
      const cg = ctx.createLinearGradient(0, -ch / 2, 0, ch / 2);
      cg.addColorStop(0, '#ffffff');
      cg.addColorStop(1, ok ? '#e2f6ff' : '#eef0f6');
      ctx.fillStyle = cg;
      rr(ctx, -cw / 2, -ch / 2, cw, ch, X(0.04));
      ctx.fill();
      ctx.strokeStyle = ok ? '#2a92d0' : '#8a9ab0';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      font(0.06, 900);
      ctx.fillStyle = ok ? '#e8412f' : '#4a5a78';
      ctx.fillText(ok ? (s.won ? '모두 이글루로!' : '집에 왔어요!') : '앗, 펭귄이 모자라요…', 0, -ch / 2 + X(0.055), cw - X(0.06));
      if (ok) {
        const nS = s.starOk.length;
        for (let j = 0; j < nS; j++) {
          const ag = s.pt - (14 + j * 14), sx = (j - (nS - 1) / 2) * X(0.1), sy = -ch / 2 + X(0.125);
          const ps = ag < 0 ? 0.8 : ag < 8 ? 1.9 - 0.9 * (ag / 8) : 1;
          starPath(ctx, sx, sy, X(0.036) * ps);
          ctx.fillStyle = ag >= 0 && s.starOk[j] ? '#ffc93a' : 'rgba(60,80,110,.15)';
          ctx.fill();
          ctx.strokeStyle = ag >= 0 && s.starOk[j] ? '#9a5a08' : 'rgba(60,80,110,.3)';
          ctx.lineWidth = 1.6;
          ctx.stroke();
          if (ag >= 0 && s.starOk[j] && (fx.memo['st' + j] ?? -1) < s.t - ag) (fx.memo['st' + j] = s.t - ag), fx.burst(w / 2 + sx, cy + sy, '#ffd23a', 16, 3, 2.4);
        }
        font(0.038, 800);
        L.forEach((txt, j) => {
          const yy = -ch / 2 + X(0.2) + j * X(0.05);
          ctx.fillStyle = s.starOk[j] ? '#1d5a8a' : '#9aa8b8';
          ctx.fillText(`${s.starOk[j] ? '★' : '☆'} ${txt}`, 0, yy, cw - X(0.06));
        });
      } else {
        font(0.038, 800);
        ctx.fillStyle = '#4a5a78';
        ctx.fillText(s.why, 0, -X(0.005), cw - X(0.06));
        font(0.036, 800);
        ctx.fillStyle = '#d0402a';
        ctx.fillText(s.hearts > 0 ? '하트 -1 · 같은 판 다시' : '하트가 없어요 — 끝', 0, X(0.06), cw - X(0.06));
      }
      ctx.restore();
    } else if (head && a > 0) {
      ctx.save();
      ctx.globalAlpha = a;
      font(0.052, 900);
      const w1 = ctx.measureText(head).width;
      font(0.036, 800);
      const w2 = ctx.measureText(sub).width;
      const cw = Math.min(w - X(0.04), Math.max(w1, w2) + X(0.08)), ch = X(0.112);
      ctx.translate(w / 2, X(0.142));
      ctx.fillStyle = 'rgba(10,40,70,.25)';
      rr(ctx, -cw / 2 + 2, -ch / 2 + 4, cw, ch, X(0.035));
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.96)';
      rr(ctx, -cw / 2, -ch / 2, cw, ch, X(0.035));
      ctx.fill();
      ctx.strokeStyle = '#2a92d0';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      font(0.052, 900);
      ctx.fillStyle = '#16507e';
      ctx.fillText(head, 0, -X(0.022), cw - X(0.04));
      font(0.036, 800);
      ctx.fillStyle = sub.startsWith('NEW') ? '#d0402a' : '#3a6a90';
      ctx.fillText(sub, 0, X(0.028), cw - X(0.04));
      ctx.restore();
    }
  }
  // ═════ 아래 띠: 얼음 · 별 조건 · 안내 ═════
  {
    const ty = BAND, tb = h / w;
    const g = ctx.createLinearGradient(0, X(ty), 0, X(tb));
    g.addColorStop(0, 'rgba(16,62,98,.97)');
    g.addColorStop(1, 'rgba(10,40,70,.99)');
    ctx.fillStyle = g;
    rr(ctx, 0, X(ty), w, X(tb - ty) + 4, X(0.03));
    ctx.fill();
    const r1 = X(ty + 0.04);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e6f8ff';
    font(0.04, 900);
    ctx.fillText('얼음', X(0.03), r1);
    const dx0 = X(0.155), dstep = X(0.062);
    for (let k = 0; k < d.ice; k++) {
      const cx = dx0 + k * dstep, used = k >= s.ice;
      ctx.save();
      ctx.translate(cx, r1);
      ctx.globalAlpha = used ? 0.22 : 1;
      const cs = X(0.022);
      ctx.fillStyle = '#e8fbff';
      ctx.beginPath();
      ctx.moveTo(0, -cs);
      ctx.lineTo(cs, -cs * 0.5);
      ctx.lineTo(cs, cs * 0.6);
      ctx.lineTo(0, cs * 1.1);
      ctx.lineTo(-cs, cs * 0.6);
      ctx.lineTo(-cs, -cs * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#8fd8f6';
      ctx.beginPath();
      ctx.moveTo(0, cs * 0.05);
      ctx.lineTo(cs, -cs * 0.5);
      ctx.lineTo(cs, cs * 0.6);
      ctx.lineTo(0, cs * 1.1);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.textAlign = 'right';
    font(0.04, 900);
    ctx.fillStyle = s.home >= d.goal ? '#9aff8a' : '#ffffff';
    ctx.fillText(`🐧 집에 ${s.home} / ${d.goal}`, X(0.97), r1);
    // 별 조건
    const L = starList(s.stage);
    const okk = L.map((_, k) => (s.phase === 'result' && s.ok ? s.starOk[k] : k === 0 ? s.home >= d.goal : false));
    const bad = L.map((_, k) => (k === 0 ? s.phase === 'result' && !s.ok : k === 1 ? s.falls > 0 : s.used > (d.star3 ?? 99)));
    L.forEach((txt, k) => {
      const yy = X(ty + 0.095 + k * 0.047);
      ctx.textAlign = 'left';
      starPath(ctx, X(0.05), yy, X(0.018));
      ctx.fillStyle = okk[k] ? '#ffd23a' : bad[k] ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.6)';
      ctx.fill();
      font(0.038, 800);
      ctx.fillStyle = okk[k] ? '#ffe9a0' : bad[k] ? 'rgba(255,255,255,.42)' : '#eaf8ff';
      const extra = bad[k] && k > 0 ? '  — 놓쳤어요' : '';
      ctx.fillText(txt + extra, X(0.085), yy, X(0.88));
    });
    let hint = d.hint;
    const first = s.stage === 0 && s.firstTap < 0 && s.phase === 'play';
    if (first) hint = '👆 틈을 톡 하면 얼음 다리가 쩡!';
    else if (s.phase === 'result') hint = s.ok ? (s.won ? '펭귄 길잡이 최고!' : '다음 판엔 새것이 나와요') : '어디에 얼음을 쓸지 다시 생각해요';
    else if (s.ice <= 0 && s.haz.some((q) => q.k !== SEAL && !q.fixed)) hint = d.fork ? '얼음을 다 썼어요 — 표지판으로 길을 바꿔 봐요' : '얼음을 다 썼어요';
    ctx.textAlign = 'center';
    ctx.fillStyle = first ? '#ffffff' : '#ffe9a8';
    font(0.038, 900);
    ctx.fillText(hint, w / 2, X(tb - 0.034), w - X(0.05));
  }
}
