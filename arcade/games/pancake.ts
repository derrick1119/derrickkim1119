/**
 * 흔들 팬케이크 탑 (29라운드: 한눈에 아는 놀이 × 진짜 물리) — 더미 쌓기 정렬 × 넘어지는 탑 × 가리키기(톡).
 * 뼈대(요즘 잘 팔리는 더미 정렬): 식탁 위 접시 7~12개(벌집 배치). 쟁반 맨 앞 팬케이크 더미를 빈 접시에 톡 놓으면,
 *   맞닿은 접시들의 맨 위 같은 색 팬케이크가 날아와 쌓이고 연쇄한다. 한 색이 8장 모이면 손님이 '냠' 먹는다.
 *   반죽(쟁반 더미)은 판마다 정해진 만큼 — 바닥에 쏟아 버린 만큼 모자라진다. 빈 접시가 없거나 반죽이 떨어지면 실패.
 * 물리(이게 우리 것 — 결정적 고정 간격): 더미마다 2차원 기울기 θ와 각속도 ω를 가진 말랑한 진자다.
 *   ω += −k·θ − c·ω (+ 기우는 식탁의 힘),  k = KS/(높이+KH) — 높을수록 물렁해서 더 크게 흔들린다.
 *   한 장이 앉을 때 치는 힘 ∝ 1/√(높이+3) → 대략 '옮겨 온 장수 × 결과 높이'가 40쯤 넘으면 쓰러진다(시럽 접시는 그 절반).
 *   날아와 앉는 팬케이크는 '날아온 방향'으로 더미를 툭 친다(양쪽에서 동시에 오면 서로 상쇄). 높이×기울기가 한계를 넘으면
 *   기운 쪽으로 와르르 — 위쪽 절반이 그 방향으로 한 장씩 날아가, 높이에 비례한 거리에 떨어진다(높은 탑일수록 멀리).
 *   떨어진 자리에서 가장 가까운 접시에 쌓이고(또 같은 색끼리 합쳐 연쇄, 그 더미도 맞아 흔들려 도미노), 접시 밖 바닥이면 강아지가 날름.
 * 미리 보기: 빈 접시를 누르고 있으면 같은 시뮬레이션을 끝까지 돌려 — 날아올 팬케이크(화살표·+n), 쓰러질 탑과 방향, 쏟아질 자리(고스트),
 *   바닥에 떨어져 강아지 몫이 될 것, 손님이 먹을 접시를 보여 준다. 떼면 그대로 일어난다(누른 자리 밖에서 떼면 취소).
 * 판 7개: 목표 = 손님 N명 먹이기. 별(쉬운 말) — 1판 '손님 모두 먹이기'만(별 셋), 2판 '하나도 바닥에 안 떨어뜨리기'가 붙고,
 *   3판부터 '쓰러뜨려서 손님 먹이기'·'한 번에 두 손님 먹이기' 중 하나가 더 붙는다. 실패 = 하트 −1, 같은 식탁·새 반죽으로 다시.
 * 전략(측정): 똑같이 2수 앞을 내다보되 '탑은 안 쓰러진다'고 믿는 봇은 3판부터 ★3이 44% → 13%로 떨어진다 — 물리가 수를 바꾼다.
 * 펼쳐짐(하는 일이 바뀐다): 1 아침 손님(톡·합치기·냠) → 2 높은 탑(흔들림·쓰러짐·강아지: 바깥으로 안 쓰러지게)
 *   → 3 시럽 접시(미끌 — 낮아도 쓰러짐: 쏟을 곳을 겨냥) → 4 버터 접시(묵직 — 높이 쌓아 두는 창고)
 *   → 5 주문 손님(말풍선 색부터: 다음 색을 모아 두면 한 번에 둘) → 6 기우는 식탁(무거운 쪽으로 기울어 탑이 쏠림: 무게 맞추기) → 7 잔칫날(다).
 * 웃음: 맨 위 팬케이크에 얼굴 — 쌓일 때 >_<, 흔들리면 식은땀, 쓰러질 땐 O_O. 손님은 와르르에 깜짝, 냠냠 먹으면 볼이 빵빵.
 *   식탁 아래 강아지는 바닥에 떨어진 팬케이크로 달려가 날름 — 꼬리 붕붕.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5;
// ───────────────────────────── 식탁(평면) ─────────────────────────────
/** 접시 간격 · 떨어진 팬케이크를 받는 거리 · 이웃 거리 */
const SP = 0.215, CATCH = SP * 0.6, NBD = SP * 1.1;
/** 한 색이 이만큼 모이면 손님이 먹는다 · 이보다 낮은 더미는 안 쓰러진다 */
const EAT_N = 8, MIN_TOP = 5;
/** 흔들림(진자): 단단함 KS/(h+KH) · 감쇠 · 쓰러지는 한계(기울기×높이) · 날아와 치는 힘(옮겨 옴/쏟아짐/떠나는 반동) · 기우는 식탁 */
const KS = 0.12, KH = 4, DAMP = 0.06, LIM = 3.2, JT = 0.033, JF = 0.05, JR = 0.008, TG = 0.0007;
/** 쓰러질 때 k번째 팬케이크가 떨어지는 거리 = FALL0 + k×FALLS (높을수록 멀리) */
const FALL0 = 0.02, FALLS = 0.024;
const FT = 15, STAG = 3, DROP = 14, EAT_T = 26, CAP = 1500;
/** 한 번 놓을 때 쓰러질 수 있는 횟수(이걸 넘으면 탑이 기우뚱 버틴다 — 끝없이 주고받지 않게) */
const TOPPLE_CAP = 5;
const NORMAL = 0, SYRUP = 1, BUTTER = 2;
const K_LIM = [1, 0.6, 1.45], K_KICK = [1, 1.3, 0.45], K_DAMP = [1, 0.45, 1.3];
const RESULT_OK = 200, RESULT_FAIL = 160, NEWS_T = 190, CARD_T = 150, LOCK_T = 24;

// ───────────────────────────── 판 ─────────────────────────────
type Star = 'all' | 'nofloor' | 'topple' | 'double';
interface StageDef {
  key: string; name: string; emoji: string; rows: number[]; colors: number; goal: number; pre: number; preH: [number, number]; qH: [number, number];
  syrup?: number; butter?: number; order?: boolean; tilt?: boolean; slack: number; stars: Star[]; news: string; spot: string; tip: string;
}
export const STAGES: StageDef[] = [
  { key: 'start', slack: 2.6, name: '아침 손님', emoji: '🥞', rows: [2, 3, 2], colors: 2, goal: 2, pre: 4, preH: [2, 4], qH: [2, 3], stars: ['all'], news: '🥞 빈 접시를 톡 → 맞닿은 같은 색이 날아와요', spot: '', tip: '같은 색 10장이 모이면 손님이 냠!' },
  { key: 'topple', slack: 1.45, name: '높은 탑', emoji: '🗼', rows: [3, 4, 3], colors: 3, goal: 3, pre: 6, preH: [5, 8], qH: [2, 5], stars: ['all', 'nofloor'], news: '😵 높은 탑은 흔들흔들 — 기운 쪽으로 와르르!', spot: '😵 높을수록 흔들 — 날아온 쪽 반대로 기울어요', tip: '바깥으로 쓰러지면 강아지 차지!' },
  { key: 'syrup', slack: 1.6, name: '시럽 접시', emoji: '🍯', rows: [3, 4, 3], colors: 3, goal: 3, pre: 6, preH: [3, 7], qH: [2, 5], syrup: 2, stars: ['all', 'topple', 'nofloor'], news: '🍯 시럽 접시 — 미끌미끌, 낮아도 잘 쓰러져요', spot: '🍯 시럽 접시 — 쓰러뜨려 옆 접시에 쏟기', tip: '시럽 접시로 쓰러뜨려 옆 접시에 쏟아요' },
  { key: 'butter', slack: 1.6, name: '버터 접시', emoji: '🧈', rows: [2, 3, 4, 3], colors: 4, goal: 3, pre: 7, preH: [3, 7], qH: [2, 5], butter: 2, syrup: 1, stars: ['all', 'nofloor', 'double'], news: '🧈 버터 접시 — 묵직해서 높이 쌓아도 버텨요', spot: '🧈 버터 접시 — 높이 쌓아 둬도 안 쓰러져요', tip: '섞인 높은 더미는 버터 접시에' },
  { key: 'order', slack: 1.7, name: '주문 손님', emoji: '📝', rows: [3, 4, 3], colors: 3, goal: 3, pre: 6, preH: [3, 7], qH: [2, 5], order: true, stars: ['all', 'double', 'nofloor'], news: '📝 주문 손님 — 말풍선 색부터 먹어요', spot: '📝 차례인 손님 색만 먹어요', tip: '다음 주문 색을 10장 모아 두면 한 번에 둘!' },
  { key: 'tilt', slack: 1.6, name: '기우는 식탁', emoji: '⚖️', rows: [2, 3, 4, 3], colors: 4, goal: 3, pre: 7, preH: [4, 8], qH: [2, 5], tilt: true, stars: ['all', 'nofloor', 'topple'], news: '⚖️ 기우는 식탁 — 무거운 쪽으로 기울어요', spot: '⚖️ 무거운 쪽으로 기울면 탑이 그쪽으로 쏠려요', tip: '무게를 고르게, 아니면 기운 쪽으로 쏟기' },
  { key: 'final', slack: 1.6, name: '잔칫날', emoji: '🎉', rows: [2, 3, 4, 3], colors: 4, goal: 4, pre: 7, preH: [3, 7], qH: [2, 5], syrup: 1, butter: 1, tilt: true, stars: ['all', 'topple', 'nofloor'], news: '🎉 잔칫날 — 시럽·버터·기우는 식탁 다 나와요', spot: '', tip: '쓰러질 쪽을 미리 보고 놓아요' },
];
export const STAGE_COUNT = STAGES.length;
export const STAR_WORD: Record<Star, string> = { all: '손님 모두 먹이기', nofloor: '하나도 바닥에 안 떨어뜨리기', topple: '쓰러뜨려서 손님 먹이기', double: '한 번에 두 손님 먹이기' };

interface Plate { x: number; y: number; kind: number; nb: number[] }
export interface Level { P: Plate[]; n: number; pre: number[][]; queue: number[][]; goal: number; order: number[] | null; tilt: boolean; cx: number; cy: number; pal: number[]; d: StageDef }

function shuffle<T>(a: T[], r: Rng): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function hexRows(rows: number[]): number[][] {
  const out: number[][] = [], dy = SP * 0.866;
  rows.forEach((n, r) => {
    for (let i = 0; i < n; i++) out.push([0.5 + (i - (n - 1) / 2) * SP, 0.5 + (r - (rows.length - 1) / 2) * dy]);
  });
  return out;
}
function makeStack(r: Rng, pal: number[], lo: number, hi: number): number[] {
  const n = lo + Math.floor(r() * (hi - lo + 1)), out: number[] = [];
  let c = pal[Math.floor(r() * pal.length)];
  while (out.length < n) {
    const len = 1 + Math.floor(r() * 3);
    for (let k = 0; k < len && out.length < n; k++) out.push(c);
    let c2 = c;
    for (let g = 0; g < 8 && c2 === c; g++) c2 = pal[Math.floor(r() * pal.length)];
    c = c2;
  }
  return out;
}

// ───────────────────────────── 세계(시뮬레이션) ─────────────────────────────
interface Stk { c: number[]; tx: number; ty: number; wx: number; wy: number; hit: number }
/** 날아가는 팬케이크: kind 0 = 옮겨 옴, 1 = 쓰러져 쏟아짐. to −1 = 바닥 */
export interface Fly { col: number; kind: number; from: number; to: number; x0: number; y0: number; z0: number; x1: number; y1: number; lx: number; ly: number; t0: number; t1: number; dx: number; dy: number }
export interface World {
  t: number; st: Stk[]; fl: Fly[]; dq: number[]; hold: number;
  fed: number; lost: number; topples: number; tc: number; turnEats: number; maxEats: number; tEat: boolean; touched: number; oi: number; gx: number; gy: number;
  /** 측정용: 쓰러짐을 모르는 세계(물리 빼면 무엇이 사라지나 — 자가 검사 봇만 쓴다) */
  blind?: boolean;
}
export type Rec =
  | { k: 'xfer'; from: number; to: number; n: number; col: number }
  | { k: 'topple'; p: number; ux: number; uy: number; m: number; h: number }
  | { k: 'land'; to: number; col: number; kind: number }
  | { k: 'floor'; x: number; y: number; col: number; from: number }
  | { k: 'eat'; p: number; col: number; n: number; touched: boolean; h: number; nth: number };

const cloneW = (W: World): World => ({ ...W, st: W.st.map((s) => ({ ...s, c: s.c.slice() })), fl: W.fl.map((f) => ({ ...f })), dq: W.dq.slice() });
const runOf = (c: number[]) => {
  const h = c.length;
  let n = 0;
  while (n < h && c[h - 1 - n] === c[h - 1]) n++;
  return n;
};
const stiff = (h: number, kind: number) => (KS / (h + KH)) * (kind === BUTTER ? 1.25 : 1);
const damp = (kind: number) => DAMP * K_DAMP[kind];
export const limOf = (kind: number) => LIM * K_LIM[kind];

function tiltTarget(L: Level, W: World): [number, number] {
  if (!L.tilt) return [0, 0];
  let sx = 0, sy = 0;
  for (let i = 0; i < L.n; i++) {
    const h = W.st[i].c.length;
    sx += h * (L.P[i].x - L.cx);
    sy += h * (L.P[i].y - L.cy);
  }
  return [sx * TG, sy * TG];
}
function nearest(L: Level, x: number, y: number) {
  let best = -1, bd = CATCH;
  for (let i = 0; i < L.n; i++) {
    const d = Math.hypot(L.P[i].x - x, L.P[i].y - y);
    if (d < bd) (bd = d), (best = i);
  }
  return best;
}

function land(L: Level, W: World, f: Fly, R: Rec[] | null) {
  if (f.to < 0) {
    W.lost++;
    R?.push({ k: 'floor', x: f.lx, y: f.ly, col: f.col, from: f.from });
    return;
  }
  const s = W.st[f.to];
  s.c.push(f.col);
  const h = s.c.length, j = ((f.kind ? JF : JT) * K_KICK[L.P[f.to].kind]) / Math.sqrt(h + 3);
  s.wx += f.dx * j;
  s.wy += f.dy * j;
  s.hit = W.t;
  if (f.kind) {
    W.touched |= 1 << f.to;
    if (!W.dq.includes(f.to)) W.dq.push(f.to);
  }
  R?.push({ k: 'land', to: f.to, col: f.col, kind: f.kind });
}

/** 기운 쪽으로 와르르: 위쪽 절반이 한 장씩, 높이에 비례한 거리로 날아간다 */
function topple(L: Level, W: World, i: number, R: Rec[] | null) {
  const s = W.st[i], h = s.c.length, th = Math.hypot(s.tx, s.ty), ux = s.tx / th, uy = s.ty / th, P = L.P[i];
  const fling = 1 + Math.min(0.3, Math.hypot(s.wx, s.wy) * 5);
  const m = Math.ceil(h / 2), b = h - m, keep: number[] = [];
  let out = 0;
  for (let j = 0; j < m; j++) {
    const d = (FALL0 + (b + j + 1) * FALLS) * fling, lx = P.x + ux * d, ly = P.y + uy * d, to = nearest(L, lx, ly), col = s.c[b + j];
    if (to === i) {
      keep.push(col);
      continue;
    }
    const x1 = to >= 0 ? L.P[to].x : lx, y1 = to >= 0 ? L.P[to].y : ly;
    W.fl.push({ col, kind: 1, from: i, to, x0: P.x, y0: P.y, z0: b + j, x1, y1, lx, ly, t0: W.t + j, t1: W.t + 13 + j * 3, dx: ux, dy: uy });
    out++;
  }
  s.c.length = b;
  for (const c of keep) s.c.push(c);
  s.tx = -ux * 0.03;
  s.ty = -uy * 0.03;
  s.wx = s.wy = 0;
  W.topples++;
  W.tc++;
  if (!W.dq.includes(i)) W.dq.push(i);
  R?.push({ k: 'topple', p: i, ux, uy, m: out, h });
}

/** 합치기: 맨 앞 더미의 맨 위 색과 같은 이웃은 모두 동시에 옮겨 온다 → 다 모였는데 10장 넘으면 냠 */
function proc(L: Level, W: World, R: Rec[] | null) {
  while (W.dq.length) {
    const x = W.dq[0], sx = W.st[x], hx = sx.c.length;
    if (!hx) {
      W.dq.shift();
      continue;
    }
    const c = sx.c[hx - 1], Q = L.P[x];
    let any = false;
    for (const y of Q.nb) {
      const sy = W.st[y], hy = sy.c.length;
      if (!hy || sy.c[hy - 1] !== c) continue;
      const n = runOf(sy.c), P = L.P[y], dx = Q.x - P.x, dy = Q.y - P.y, dd = Math.hypot(dx, dy);
      for (let j = 0; j < n; j++) W.fl.push({ col: c, kind: 0, from: y, to: x, x0: P.x, y0: P.y, z0: hy - 1 - j, x1: Q.x, y1: Q.y, lx: Q.x, ly: Q.y, t0: W.t + j * STAG, t1: W.t + j * STAG + FT, dx: dx / dd, dy: dy / dd });
      sy.c.length = hy - n;
      const jr = (JR * K_KICK[P.kind]) / Math.sqrt(hy - n + 3);
      sy.wx -= (dx / dd) * jr;
      sy.wy -= (dy / dd) * jr;
      if ((W.touched >> y) & 1) W.touched |= 1 << x;
      if (!W.dq.includes(y)) W.dq.push(y);
      R?.push({ k: 'xfer', from: y, to: x, n, col: c });
      any = true;
    }
    if (any) return;
    const run = runOf(sx.c);
    if (run >= EAT_N && (!L.order || L.order[W.oi] === c)) {
      sx.c.length = hx - run;
      W.fed++;
      W.turnEats++;
      if (W.turnEats > W.maxEats) W.maxEats = W.turnEats;
      const tch = !!((W.touched >> x) & 1);
      if (tch) W.tEat = true;
      if (L.order) {
        W.oi++;
        for (let i = 0; i < L.n; i++) if (!W.dq.includes(i) && W.st[i].c.length && runOf(W.st[i].c) >= EAT_N) W.dq.push(i);
      }
      W.hold = W.t + EAT_T;
      R?.push({ k: 'eat', p: x, col: c, n: run, touched: tch, h: hx, nth: W.fed });
      return;
    }
    W.dq.shift();
  }
}

export function wtick(L: Level, W: World, R: Rec[] | null) {
  W.t++;
  if (W.fl.length) {
    let j = 0;
    const fl = W.fl;
    for (let i = 0; i < fl.length; i++) {
      const f = fl[i];
      if (W.t < f.t1) fl[j++] = f;
      else land(L, W, f, R);
    }
    fl.length = j;
  }
  if (L.tilt) {
    const [gx, gy] = tiltTarget(L, W);
    W.gx += (gx - W.gx) * 0.06;
    W.gy += (gy - W.gy) * 0.06;
  }
  for (let i = 0; i < L.n; i++) {
    const s = W.st[i], h = s.c.length;
    if (!h) {
      s.tx = s.ty = s.wx = s.wy = 0;
      continue;
    }
    const kd = L.P[i].kind, k = stiff(h, kd), c = damp(kd);
    s.wx += -k * s.tx - c * s.wx + W.gx;
    s.wy += -k * s.ty - c * s.wy + W.gy;
    s.tx += s.wx;
    s.ty += s.wy;
    if (h >= MIN_TOP) {
      const lean = Math.hypot(s.tx, s.ty) * h, lim = limOf(kd);
      if (lean > lim) {
        if (W.tc < TOPPLE_CAP && !W.blind) topple(L, W, i, R);
        else {
          // 기우뚱 버티기: 한계에서 멈춘다
          const f = (lim * 0.95) / lean;
          s.tx *= f;
          s.ty *= f;
          s.wx = s.wy = 0;
        }
      }
    }
  }
  if (!W.fl.length && W.t >= W.hold && W.dq.length) proc(L, W, R);
}

/** 이 더미가 지금 흔들림만으로 쓰러질 수 있나 (에너지로 닿을 수 있는 최대 기울기) */
export function swayMax(L: Level, W: World, i: number) {
  const s = W.st[i], h = s.c.length;
  if (!h) return 0;
  const kd = L.P[i].kind, k = stiff(h, kd), ex = W.gx / k, ey = W.gy / k;
  const E = 0.5 * (s.wx * s.wx + s.wy * s.wy) + 0.5 * k * ((s.tx - ex) ** 2 + (s.ty - ey) ** 2);
  return (Math.hypot(ex, ey) + Math.sqrt((2 * E) / k)) * h;
}
export function settled(L: Level, W: World) {
  if (W.fl.length || W.dq.length || W.t < W.hold) return false;
  if (L.tilt) {
    const [gx, gy] = tiltTarget(L, W);
    if (Math.abs(gx - W.gx) + Math.abs(gy - W.gy) > 2e-6) return false;
  }
  if (W.tc >= TOPPLE_CAP) return true;
  for (let i = 0; i < L.n; i++) if (W.st[i].c.length >= MIN_TOP && swayMax(L, W, i) > limOf(L.P[i].kind) * 0.97) return false;
  return true;
}
export function resolve(L: Level, W: World, R: Rec[] | null = null, cap = CAP) {
  for (let k = 0; k < cap && !settled(L, W); k++) wtick(L, W, R);
}
function placeW(W: World, p: number, stack: number[]) {
  const s = W.st[p];
  s.c = stack.slice();
  s.tx = s.ty = s.wx = s.wy = 0;
  s.hit = W.t + DROP;
  W.dq = [p];
  W.hold = W.t + DROP;
  W.turnEats = 0;
  W.touched = 0;
  W.tc = 0;
}
function newWorld(L: Level): World {
  const W: World = { t: 0, st: L.pre.map((c) => ({ c: c.slice(), tx: 0, ty: 0, wx: 0, wy: 0, hit: -99 })), fl: [], dq: [], hold: 0, fed: 0, lost: 0, topples: 0, tc: 0, turnEats: 0, maxEats: 0, tEat: false, touched: 0, oi: 0, gx: 0, gy: 0 };
  if (L.tilt) {
    [W.gx, W.gy] = tiltTarget(L, W);
    W.st.forEach((s, i) => {
      if (!s.c.length) return;
      const k = stiff(s.c.length, L.P[i].kind);
      s.tx = W.gx / k;
      s.ty = W.gy / k;
    });
  }
  return W;
}
const empties = (L: Level, W: World) => {
  const out: number[] = [];
  for (let i = 0; i < L.n; i++) if (!W.st[i].c.length) out.push(i);
  return out;
};
export const starMet = (st: Star, W: World, done: boolean) =>
  st === 'all' ? done : st === 'nofloor' ? done && W.lost === 0 : st === 'topple' ? done && W.tEat : done && W.maxEats >= 2;
/** 별 수: 조건이 하나면 다 먹이면 별 셋, 둘이면 2+1, 셋이면 1+1+1 */
export function starsOf(L: Level, W: World, done: boolean) {
  const st = L.d.stars;
  if (!done) return 0;
  if (st.length === 1) return 3;
  if (st.length === 2) return 2 + (starMet(st[1], W, done) ? 1 : 0);
  return 1 + (starMet(st[1], W, done) ? 1 : 0) + (starMet(st[2], W, done) ? 1 : 0);
}

// ───────────────────────────── 판 만들기 ─────────────────────────────
const levelCache = new Map<string, Level>();
export function buildLevel(seed: number, stage: number, retry = 0): Level {
  const ck = `${seed}:${stage}:${retry}`, hit = levelCache.get(ck);
  if (hit) return hit;
  const d = STAGES[stage], r = mulberry32((seed * 31 + stage * 7919 + 17) >>> 0);
  const P: Plate[] = hexRows(d.rows).map(([x, y]) => ({ x, y, kind: NORMAL, nb: [] }));
  P.forEach((p, i) => (p.nb = P.map((_, j) => j).filter((j) => j !== i && Math.hypot(P[j].x - p.x, P[j].y - p.y) < NBD)));
  const n = P.length, ids = shuffle([...Array(n).keys()], r);
  let q = 0;
  for (let k = 0; k < (d.syrup ?? 0); k++) P[ids[q++]].kind = SYRUP;
  for (let k = 0; k < (d.butter ?? 0); k++) P[ids[q++]].kind = BUTTER;
  const pal = shuffle([0, 1, 2, 3, 4, 5], r).slice(0, d.colors);
  let pre: number[][] = P.map(() => []);
  if (d.key === 'start') {
    // 첫 톡에 큰 일: 가운데에 놓으면 세 쪽에서 분홍이 날아와 10장 → 냠! (그리고 노랑이 따라 모인다)
    const [a, b] = pal;
    pre = [[b, b, a, a], [], [b, a, a, a], [], [b, a, a, a], [a, b, b], []];
  } else {
    const spots = shuffle([...Array(n).keys()], r).slice(0, d.pre);
    for (const i of spots) pre[i] = makeStack(r, pal, d.preH[0], d.preH[1]);
  }
  // 다시 할 때는 같은 식탁에 새 반죽 (쟁반 더미 순서만 새로)
  const rq = retry ? mulberry32((seed * 131 + stage * 977 + retry * 7907) >>> 0) : r;
  const queue: number[][] = [];
  if (d.key === 'start' && !retry) queue.push([pal[1], pal[0], pal[0]]);
  while (queue.length < 80) queue.push(makeStack(rq, pal, d.qH[0], d.qH[1]));
  let order: number[] | null = null;
  if (d.order) {
    // 손님마다 다른 맛 (팔레트를 섞어 차례로) — 같은 맛을 두 번 기다리게 하지 않는다
    order = [];
    while (order.length < d.goal + 6) order.push(...shuffle(pal.slice(), r));
  }
  const L: Level = { P, n, pre, queue, goal: d.goal, order, tilt: !!d.tilt, cx: 0.5, cy: 0.5, pal, d };
  // 처음 놓인 더미끼리 붙은 같은 색·기운 식탁에 못 버티는 탑은 미리 정리해 둔다 (시작하자마자 혼자 움직이지 않게)
  if (d.key !== 'start') {
    const W = newWorld(L);
    W.dq = [...Array(n).keys()];
    resolve(L, W);
    L.pre = W.st.map((s) => s.c.slice());
    if (L.order) L.order = L.order.slice(W.oi);
  }
  // 반죽(쟁반 더미)은 정해진 만큼: 손님 수 × 10장에 여유(slack)를 두고, 이미 식탁에 있는 만큼 뺀다
  const onTable = L.pre.reduce((a, c) => a + c.length, 0), avg = (d.qH[0] + d.qH[1]) / 2;
  L.queue = queue.slice(0, Math.max(d.goal * 2 + 1, Math.ceil((d.goal * EAT_N * d.slack - onTable * 0.45) / avg)));
  if (levelCache.size > 300) levelCache.clear();
  levelCache.set(ck, L);
  return L;
}

// ───────────────────────────── 상태 ─────────────────────────────
/** 연출 이벤트 (화면 좌표: 가로 0~1, 세로 0~A) */
interface Ev { t: number; kind: string; x: number; y: number; text?: string; col?: string; v?: number }
interface VEat { col: number; x: number; y: number; t0: number; seat: number }
interface VFloor { col: number; x: number; y: number; vy: number; vx: number; gy: number; eaten: number; spin: number; hit: boolean }
export interface PState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'play' | 'result'; pt: number;
  L: Level; W: World; qi: number; busy: boolean;
  down: boolean; ax: number; ay: number; press: number; lastTap: number; taps: number; firstTap: boolean;
  hearts: number; stars: number; got: number; starOk: boolean[]; pts: number; ok: boolean; why: string; won: boolean; dead: boolean; tries: number; again: boolean;
  seen: Set<string>; events: Ev[]; news: { text: string; t: number } | null; newsQ: string[]; startT: number;
  vEat: VEat[]; vFloor: VFloor[]; dog: { x: number; tx: number; chew: number; wag: number; face: number }; cust: { mood: number; t: number }[]; gasp: number;
}
const ev = (s: PState, kind: string, x: number, y: number, text?: string, col?: string, v?: number) => s.events.push({ t: s.t, kind, x, y, text, col, v });
function see(s: PState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  if (text) s.newsQ.push(text);
}

// 화면 배치 (가로 0~1, 세로 0~A): 식탁 평면 (x, y) → 화면 (x, CY + (y−0.5)·KY), 팬케이크 한 장 두께 PZ
const CY = 0.665, KY = 0.6, PZ = 0.0165, CRX = 0.066, TILT_VIS = 40;
const TAB_RX = 0.495, TAB_RY = 0.262, FLOOR_Y = 1.085, PANEL_Y = 1.16, SEAT_Y = 0.215;
const SX = (x: number) => x;
const SYp = (y: number) => CY + (y - 0.5) * KY;
/** 기우는 식탁: 무거운 쪽이 내려간다(화면에서 아래로) */
const zOff = (W: World, x: number, y: number) => Math.max(-0.045, Math.min(0.045, (W.gx * (x - 0.5) + W.gy * (y - 0.5)) * TILT_VIS));
const plateXY = (L: Level, W: World, i: number): [number, number] => [SX(L.P[i].x), SYp(L.P[i].y) + zOff(W, L.P[i].x, L.P[i].y)];
const seatX = (n: number, k: number) => 0.5 + (k - (n - 1) / 2) * Math.min(0.23, 0.82 / n);
const HIT = 0.105;

function newStage(s: PState) {
  s.L = buildLevel(s.seed, s.stage, s.again ? s.tries : 0);
  s.W = newWorld(s.L);
  s.qi = 0;
  s.busy = false;
  s.phase = 'play';
  s.pt = 0;
  s.press = -1;
  s.taps = 0;
  s.startT = s.t;
  s.got = 0;
  s.starOk = [false, false, false];
  s.vEat = [];
  s.vFloor = [];
  s.cust = Array.from({ length: s.L.goal }, () => ({ mood: 0, t: -99 }));
  const d = s.L.d;
  see(s, d.key, '');
}

function finish(s: PState, ok: boolean, why: string) {
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  s.why = why;
  const L = s.L, W = s.W;
  if (ok) {
    const st = starsOf(L, W, true);
    s.got = st;
    s.stars += st;
    s.starOk = L.d.stars.map((x) => starMet(x, W, true));
    // 별 점수: 판이 갈수록 크고, 별을 많이 딸수록 더 크게(별 수의 제곱) — 다 먹이기만 한 판과 별 셋 판의 차이가 크다
    s.pts += st * st * (10 + 35 * s.stage) + W.fed * 10;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += 500);
    ev(s, 'clear', 0.5, 0.6, undefined, undefined, st);
    s.cust.forEach((c) => ((c.mood = 3), (c.t = s.t)));
  } else {
    s.hearts--;
    s.tries++;
    ev(s, 'fail', 0.5, 0.6);
    s.cust.forEach((c) => c.mood === 0 && ((c.mood = 4), (c.t = s.t)));
  }
}

function pickPlate(s: PState, x: number, y: number) {
  const L = s.L;
  let best = -1, bd = HIT;
  for (let i = 0; i < L.n; i++) {
    const [px, py] = plateXY(L, s.W, i), d = Math.hypot(px - x, (py - y) / (KY * 1.05));
    if (d < bd) (bd = d), (best = i);
  }
  return best;
}

function place(s: PState, k: number) {
  const L = s.L, stack = L.queue[s.qi];
  placeW(s.W, k, stack);
  s.qi++;
  s.busy = true;
  s.taps++;
  s.lastTap = s.t;
  s.firstTap = true;
  const [x, y] = plateXY(L, s.W, k);
  ev(s, 'drop', x, y, undefined, undefined, k);
}

function endTurn(s: PState) {
  s.busy = false;
  const L = s.L, W = s.W;
  if (W.fed >= L.goal) return finish(s, true, '');
  if (s.qi >= L.queue.length) return finish(s, false, '반죽이 다 떨어졌어요!');
  if (!empties(L, W).length) return finish(s, false, '빈 접시가 없어요!');
}

/** 시뮬레이션 기록 → 화면 연출 */
function react(s: PState, R: Rec[]) {
  const L = s.L, W = s.W;
  for (const e of R) {
    if (e.k === 'eat') {
      const [x, y] = plateXY(L, W, e.p), seat = Math.min(e.nth - 1, s.cust.length - 1), top = y - (e.h - e.n) * PZ;
      for (let k = 0; k < Math.min(e.n, 12); k++) s.vEat.push({ col: e.col, x, y: top - k * PZ, t0: s.t + k * 2, seat });
      if (seat >= 0) (s.cust[seat].mood = 2), (s.cust[seat].t = s.t);
      ev(s, 'eat', x, top - e.n * PZ, e.n >= 11 ? `냠냠냠! ${e.n}장` : '냠!', '#fff1a8', e.n);
      if (W.turnEats >= 2) ev(s, 'double', 0.5, 0.42, `한 번에 ${W.turnEats}손님!`, '#ffd166', W.turnEats), see(s, 'double', '');
      if (e.touched) ev(s, 'teat', x, top - e.n * PZ - 0.06, '쏟아져서 냠!', '#ffcf8a'), see(s, 'teat', '');
      see(s, 'eat', '');
    } else if (e.k === 'topple') {
      const [x, y] = plateXY(L, W, e.p);
      ev(s, 'topple', x + e.ux * 0.04, y - e.h * PZ * 0.6, e.h >= 11 ? '와르르르!' : '와르르!', '#ffe0b8', e.h);
      s.gasp = s.t;
      see(s, 'topple', '😵 너무 기운 탑은 그쪽으로 와르르!');
    } else if (e.k === 'floor') {
      const sx = SX(e.x), sy = SYp(e.y) + zOff(W, e.x, e.y);
      s.vFloor.push({ col: e.col, x: sx, y: sy - 0.02, vx: (e.x - L.P[e.from].x) * 0.035, vy: -0.006, gy: FLOOR_Y + 0.02 + ((s.vFloor.length * 37) % 5) * 0.007, eaten: -1, spin: 0, hit: false });
      see(s, 'dog', '🐶 바닥에 떨어진 건 강아지가 날름!');
    } else if (e.k === 'land' && e.kind === 1) {
      const [x, y] = plateXY(L, W, e.to);
      ev(s, 'plop', x, y - W.st[e.to].c.length * PZ, undefined, undefined, e.to);
    }
  }
}

function cosmetic(s: PState) {
  // 바닥 팬케이크: 떨어져 튕기고, 강아지가 달려가 날름
  for (const f of s.vFloor) {
    if (f.eaten >= 0) continue;
    f.vy += 0.0016;
    f.x = Math.max(0.03, Math.min(0.97, f.x + f.vx));
    f.y += f.vy;
    f.vx *= 0.97;
    f.spin += f.hit ? 0 : 0.25;
    if (f.y > f.gy) {
      f.y = f.gy;
      f.vy *= -0.3;
      f.vx *= 0.5;
      if (!f.hit) (f.hit = true), (f.spin = 0), ev(s, 'thud', f.x, f.gy - 0.02, '툭!', '#ffe9c4');
    }
  }
  const dg = s.dog;
  let g: VFloor | null = null;
  for (const f of s.vFloor) if (f.eaten < 0 && f.hit && (!g || Math.abs(f.x - dg.x) < Math.abs(g.x - dg.x))) g = f;
  if (g) dg.tx = Math.max(0.08, Math.min(0.92, g.x));
  else if (s.t % 420 === 0) dg.tx = [0.82, 0.18, 0.66][(s.t / 420) % 3];
  const dv = dg.tx - dg.x;
  if (Math.abs(dv) > 0.004) (dg.x += Math.sign(dv) * Math.min(Math.abs(dv), g ? 0.014 : 0.004)), (dg.face = dv > 0 ? 1 : -1);
  if (g && Math.abs(g.x - dg.x) < 0.035) {
    g.eaten = s.t;
    dg.chew = s.t;
    ev(s, 'lick', g.x, g.gy - 0.075, ['날름!', '냠냠멍!', '헥헥 냠!'][s.vFloor.indexOf(g) % 3], '#ffe9c4');
  }
  dg.wag += s.t - dg.chew < 60 ? 0.6 : 0.15;
  if (s.vFloor.length > 24) s.vFloor = s.vFloor.filter((f) => f.eaten < 0 || s.t - f.eaten < 30);
  if (s.vEat.length) s.vEat = s.vEat.filter((v) => s.t < v.t0 + 32);
  for (const c of s.cust) if (c.mood === 2 && s.t - c.t > 75) (c.mood = 1), (c.t = s.t);
}

export const pancake: GameDef<PState> = {
  id: 'pancake',
  name: '흔들 팬케이크 탑',
  genes: ['stacksort', 'topple', 'pointer'],
  twist: '팬케이크 더미는 말랑한 진자라서, 날아와 앉는 팬케이크가 온 방향으로 더미를 밀어 흔든다 — 높을수록 크게 흔들리다 한계를 넘으면 기운 쪽으로 와르르 쏟아져, 떨어진 접시에서 또 같은 색끼리 합쳐 연쇄한다(바깥으로 쏟으면 강아지 차지)',
  rules: ['빈 접시를 톡 → 쟁반의 팬케이크가 놓이고, 맞닿은 같은 색이 날아와 쌓여요. 같은 색 8장이면 손님이 냠!', '높은 탑은 흔들흔들 — 너무 기울면 그쪽으로 와르르 쏟아져요. 빈 접시가 없으면 실패.'],
  controls: 'touch',
  hint: '빈 접시를 톡! 누르고 있으면 날아올 것·쓰러질 쪽이 보여요 / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '동물 손님의 아침 팬케이크 카페',
    mood: '햇살 드는 아침 카페, 깅엄 식탁보 위 하얀 접시에 말랑한 색 팬케이크가 탑처럼 쌓여 흔들흔들 — 맨 위 팬케이크엔 얼굴이 있고, 곰·토끼·고양이·돼지 손님이 포크를 들고 기다리며, 식탁 아래 강아지가 떨어지는 팬케이크를 노린다.',
    palette: { bg: '#4a2c22', ink: '#fff8ec', muted: '#e8c9a8', accent: '#ffc94a', hot: '#ff6b5a', soft: '#ffe9c9' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'play', pt: 0, qi: 0, busy: false,
      down: false, ax: 0, ay: 0, press: -1, lastTap: -99, taps: 0, firstTap: false,
      hearts: 3, stars: 0, got: 0, starOk: [false, false, false], pts: 0, ok: false, why: '', won: false, dead: false, tries: 0, again: false,
      seen: new Set<string>(), events: [], news: null, newsQ: [], startT: 0,
      vEat: [], vFloor: [], dog: { x: 0.82, tx: 0.82, chew: -99, wag: 0, face: -1 }, cust: [], gasp: -99,
    } as unknown as PState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    const p = inp.pointer ?? null, release = !p && s.down;
    if (p) (s.ax = p.x), (s.ay = p.y * A);
    s.down = !!p;
    s.t++;
    s.pt++;
    if (s.newsQ.length && (!s.news || s.t - s.news.t > NEWS_T)) s.news = { text: s.newsQ.shift()!, t: s.t };
    if (s.events.length > 60 || (s.events.length && s.t - s.events[0].t > 240)) s.events = s.events.filter((e) => s.t - e.t < 240);
    const R: Rec[] = [];
    wtick(s.L, s.W, R);
    if (R.length) react(s, R);
    cosmetic(s);
    if (s.phase === 'result') {
      if (s.pt >= (s.ok ? RESULT_OK : RESULT_FAIL)) {
        if (s.ok) {
          if (s.won) s.dead = true;
          else (s.again = false), s.stage++, newStage(s);
        } else if (s.hearts <= 0) s.dead = true;
        else (s.again = true), newStage(s);
      }
      return;
    }
    if (s.busy && settled(s.L, s.W)) endTurn(s);
    if (s.phase !== 'play') return;
    if (p) s.press = pickPlate(s, s.ax, s.ay);
    if (!release) return;
    const k = s.press;
    s.press = -1;
    if (s.busy || s.t - s.startT < LOCK_T) return;
    if (k < 0) {
      if (s.ay > 0.38 && s.ay < 0.95) ev(s, 'miss', s.ax, s.ay, '빈 접시를 톡!', '#fff3df');
      return;
    }
    if (s.W.st[k].c.length) {
      const [x, y] = plateXY(s.L, s.W, k);
      ev(s, 'full', x, y - s.W.st[k].c.length * PZ - 0.03, '빈 접시에 놓아요!', '#ffd0c8');
      return;
    }
    place(s, k);
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
function value(L: Level, W: World, left: number): number {
  const d = L.d;
  let v = Math.min(W.fed, L.goal) * 4000;
  if (W.fed >= L.goal) {
    v += 1e6;
    for (const st of d.stars) if (starMet(st, W, true)) v += 2e4;
    return v;
  }
  let empty = 0;
  for (let i = 0; i < L.n; i++) {
    const c = W.st[i].c, h = c.length;
    if (!h) {
      empty++;
      continue;
    }
    const run = runOf(c);
    let segs = 1;
    for (let k = 1; k < h; k++) if (c[k] !== c[k - 1]) segs++;
    const want = !L.order || L.order.slice(W.oi, W.oi + 2).includes(c[h - 1]);
    v += run * run * (want ? 7 : 3) - (segs - 1) * 80 - Math.max(0, h - 7) * 35 * (L.P[i].kind === BUTTER ? 0.3 : 1);
  }
  if (!empty || left <= 0) return -1e6 + W.fed * 4000;
  v += Math.min(empty, 4) * 400 + empty * 60;
  if (W.lost) v -= W.lost * 60 + (d.stars.includes('nofloor') ? 2500 : 0);
  if (d.stars.includes('topple') && W.tEat) v += 2500;
  if (d.stars.includes('double') && W.maxEats >= 2) v += 2500;
  return v;
}
function simPlace(L: Level, W0: World, p: number, stack: number[]) {
  const W = cloneW(W0);
  placeW(W, p, stack);
  resolve(L, W);
  return W;
}
/** 잘하는 봇: 빈 접시마다 놓고 끝까지 굴려 보고(1수), 좋은 몇 개는 다음 더미까지(2수) 내다본다 */
export function planMove(s: PState, blind = false): number {
  const L = s.L, W0 = blind ? { ...cloneW(s.W), blind: true } : s.W, front = L.queue[s.qi], next = L.queue[s.qi + 1], em = empties(L, W0);
  if (!em.length || !front) return -1;
  const left = L.queue.length - s.qi - 1;
  const sc = em.map((p) => {
    const W = simPlace(L, W0, p, front);
    return { p, W, v: value(L, W, left) };
  });
  sc.sort((a, b) => b.v - a.v || a.p - b.p);
  let best = sc[0].p, bv = -Infinity;
  for (const c of sc.slice(0, 4)) {
    let v = c.v;
    if (c.W.fed < L.goal && next) {
      let m = -Infinity;
      for (const q of empties(L, c.W)) m = Math.max(m, value(L, simPlace(L, c.W, q, next), left - 1));
      v = m === -Infinity ? -2e6 : m + c.v * 0.05;
    }
    if (v > bv) (bv = v), (best = c.p);
  }
  return best;
}
/** 버릇 하나: 앞 더미 맨 위 색이 가장 많이 옮겨 올 빈 접시 (같으면 앞 번호) */
export function habitPick(L: Level, W: World, front: number[]) {
  const c = front[front.length - 1];
  let best = -1, bv = -1;
  for (const i of empties(L, W)) {
    let n = 0;
    for (const y of L.P[i].nb) {
      const cy = W.st[y].c;
      if (cy.length && cy[cy.length - 1] === c) n += runOf(cy);
    }
    if (n > bv) (bv = n), (best = i);
  }
  return best;
}
/** 독립 버릇: 늘 가운데에 가장 가까운 빈 접시 */
export function centerPick(L: Level, W: World) {
  let best = -1, bd = 9;
  for (const i of empties(L, W)) {
    const d = Math.hypot(L.P[i].x - L.cx, L.P[i].y - L.cy);
    if (d < bd - 1e-9) (bd = d), (best = i);
  }
  return best;
}

const NO: Input = { tap: false, dir: 0, pointer: null };
const at = (s: PState, i: number): Input => {
  const [x, y] = plateXY(s.L, s.W, i);
  return { tap: false, dir: 0, pointer: { x, y: y / A } };
};
const ready = (s: PState) => s.phase === 'play' && !s.busy && !s.down && s.t - s.startT >= 40 && s.t - s.lastTap >= 24;
const brain = new WeakMap<object, { key: string; m: number }>();
export const pancakeSmart: Bot<PState> = {
  name: '팬케이크 장인',
  act(s) {
    if (!ready(s)) return NO;
    const key = `${s.stage}:${s.tries}:${s.qi}`;
    let m = brain.get(s);
    if (!m || m.key !== key) brain.set(s, (m = { key, m: planMove(s) }));
    return m.m >= 0 ? at(s, m.m) : NO;
  },
};
/** 자가 검사용: 똑같이 내다보지만 '탑은 안 쓰러진다'고 믿는 봇 (물리를 빼고 생각하면 얼마나 손해인가) */
const blindBrain = new WeakMap<object, { key: string; m: number }>();
export const pancakeBlind: Bot<PState> = {
  name: '쓰러짐을 모르는 장인',
  act(s) {
    if (!ready(s)) return NO;
    const key = `${s.stage}:${s.tries}:${s.qi}`;
    let m = blindBrain.get(s);
    if (!m || m.key !== key) blindBrain.set(s, (m = { key, m: planMove(s, true) }));
    return m.m >= 0 ? at(s, m.m) : NO;
  },
};
export const pancakeHabit: Bot<PState> = {
  name: '버릇: 같은 색이 가장 많이 오는 자리',
  act(s) {
    if (!ready(s)) return NO;
    const f = s.L.queue[s.qi];
    const m = f ? habitPick(s.L, s.W, f) : -1;
    return m >= 0 ? at(s, m) : NO;
  },
};
export const pancakeCenter: Bot<PState> = {
  name: '버릇: 늘 가운데부터',
  act(s) {
    if (!ready(s)) return NO;
    const m = centerPick(s.L, s.W);
    return m >= 0 ? at(s, m) : NO;
  },
};
const dumbAt = new WeakMap<object, { next: number; until: number; p: { x: number; y: number } }>();
/** 못하는 봇: 아무 때나 아무 빈 접시(가끔 아무 데나) */
export const pancakeRandom: Bot<PState> = {
  name: '아무 접시나 톡',
  act(s, rng) {
    let m = dumbAt.get(s);
    if (!m) dumbAt.set(s, (m = { next: 30 + Math.floor(rng() * 60), until: -1, p: { x: 0, y: 0 } }));
    if (s.t < m.until) return { tap: false, dir: 0, pointer: m.p };
    if (s.t < m.next) return NO;
    m.next = s.t + 30 + Math.floor(rng() * 110);
    m.until = s.t + 2 + Math.floor(rng() * 4);
    const em = empties(s.L, s.W);
    if (rng() < 0.2 || !em.length) m.p = { x: rng(), y: rng() };
    else {
      const [x, y] = plateXY(s.L, s.W, em[Math.floor(rng() * em.length)]);
      m.p = { x: x + (rng() - 0.5) * 0.04, y: (y + (rng() - 0.5) * 0.03) / A };
    }
    return { tap: false, dir: 0, pointer: m.p };
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
const TAU = Math.PI * 2;
const hex = (c: string) => [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16));
const mix = (a: string, b: string, t: number) => {
  const p = hex(a), q = hex(b);
  return `rgb(${p.map((v, i) => Math.round(v + (q[i] - v) * t)).join(',')})`;
};
/** 맛(색) 여섯: 딸기·블루베리·말차·레몬·초코·포도 — 위는 맛 색, 옆은 노릇하게 구운 색이 섞인다 */
const FLAV = [
  { top: '#ff8fb0', side: '#d26a7c', hi: '#ffd2df', name: '딸기' },
  { top: '#86a8ff', side: '#6576b8', hi: '#d8e4ff', name: '블루베리' },
  { top: '#9fd977', side: '#7d9c4c', hi: '#e0f5cc', name: '말차' },
  { top: '#ffd75e', side: '#c9973a', hi: '#fff3c4', name: '레몬' },
  { top: '#a8714d', side: '#73472e', hi: '#dcb89c', name: '초코' },
  { top: '#c69cff', side: '#8a66b8', hi: '#ecdcff', name: '포도' },
].map((f) => ({ ...f, side: mix(f.side, '#b8773c', 0.35), rim: mix(f.side, '#5a3418', 0.45) }));
const CRIT = [
  { fur: '#b4805a', dark: '#7c5438', in: '#ecc9a2' },
  { fur: '#f6f0e8', dark: '#cfc3b6', in: '#ffb6c8' },
  { fur: '#f4a85e', dark: '#c47833', in: '#ffd8b0' },
  { fur: '#f7b2c3', dark: '#d9869c', in: '#ffd9e3' },
];
type Fn = (v: number) => number;

interface Prev { xf: { from: number; to: number; n: number; col: number }[]; top: { p: number; ux: number; uy: number; h: number }[]; land: Map<number, number[]>; fl: { x: number; y: number; col: number }[]; eat: { p: number; n: number; col: number }[]; fed: number; lost: number; wob: { p: number; r: number; ux: number; uy: number }[] }
const PREV = new WeakMap<object, { key: string; p: Prev }>();
/** 미리 보기 = 같은 시뮬레이션을 끝까지 돌린 기록 */
function preview(s: PState, k: number): Prev {
  const key = `${k}:${s.qi}:${s.W.t}`, c = PREV.get(s);
  if (c && c.key === key) return c.p;
  const W = cloneW(s.W), R: Rec[] = [];
  placeW(W, k, s.L.queue[s.qi]);
  // 끝까지 굴리며 더미마다 가장 크게 기운 순간을 잰다 (쓰러지진 않지만 아슬아슬한 탑)
  const L = s.L, mx = L.P.map(() => ({ r: 0, ux: 0, uy: 0 })), fell = new Set<number>();
  for (let n = 0; n < CAP && !settled(L, W); n++) {
    const before = R.length;
    wtick(L, W, R);
    for (let j = before; j < R.length; j++) if (R[j].k === 'topple') fell.add((R[j] as { p: number }).p);
    for (let i = 0; i < L.n; i++) {
      const st = W.st[i], h = st.c.length;
      if (h < MIN_TOP) continue;
      const th = Math.hypot(st.tx, st.ty), r = (th * h) / limOf(L.P[i].kind);
      if (r > mx[i].r) mx[i] = { r, ux: st.tx / th, uy: st.ty / th };
    }
  }
  const p: Prev = { xf: [], top: [], land: new Map(), fl: [], eat: [], fed: W.fed - s.W.fed, lost: W.lost - s.W.lost, wob: [] };
  mx.forEach((m, i) => m.r >= 0.55 && !fell.has(i) && p.wob.push({ p: i, r: Math.min(1, m.r), ux: m.ux, uy: m.uy }));
  for (const e of R) {
    if (e.k === 'xfer') p.xf.push({ from: e.from, to: e.to, n: e.n, col: e.col });
    else if (e.k === 'topple') p.top.push({ p: e.p, ux: e.ux, uy: e.uy, h: e.h });
    else if (e.k === 'land' && e.kind === 1) p.land.set(e.to, [...(p.land.get(e.to) ?? []), e.col]);
    else if (e.k === 'floor') p.fl.push({ x: e.x, y: e.y, col: e.col });
    else if (e.k === 'eat') p.eat.push({ p: e.p, n: e.n, col: e.col });
  }
  PREV.set(s, { key, p });
  return p;
}

function ell(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU);
}
/** 팬케이크 한 장 (화면 px): 옆면(노릇) + 윗면(맛 색) + 윤기 */
function cake(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, th: number, col: number, alpha = 1) {
  const F = FLAV[col];
  ctx.globalAlpha = alpha;
  ctx.fillStyle = F.rim;
  ell(ctx, x, y + th * 0.5 + 0.6, rx, ry);
  ctx.fill();
  ctx.fillStyle = F.side;
  ell(ctx, x, y + th * 0.5, rx, ry);
  ctx.fill();
  ctx.fillRect(x - rx, y - th * 0.5, rx * 2, th);
  ctx.fillStyle = F.top;
  ell(ctx, x, y - th * 0.5, rx, ry);
  ctx.fill();
  ctx.fillStyle = F.side;
  ctx.globalAlpha = alpha * 0.35;
  ell(ctx, x, y - th * 0.5, rx * 0.72, ry * 0.68);
  ctx.fill();
  ctx.globalAlpha = alpha * 0.85;
  ctx.fillStyle = F.top;
  ell(ctx, x, y - th * 0.5, rx * 0.62, ry * 0.56);
  ctx.fill();
  ctx.fillStyle = F.hi;
  ctx.globalAlpha = alpha * 0.7;
  ell(ctx, x - rx * 0.3, y - th * 0.5 - ry * 0.25, rx * 0.32, ry * 0.22);
  ctx.fill();
  ctx.globalAlpha = 1;
}
/** 맨 위 팬케이크 얼굴: 0 방긋 · 1 찌그러짐 >_< · 2 식은땀 · 3 O_O */
function cakeFace(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, mood: number, t: number) {
  const ex = rx * 0.3, ey = y - ry * 0.08, er = Math.max(1.4, rx * 0.075);
  ctx.strokeStyle = '#3a2016';
  ctx.fillStyle = '#3a2016';
  ctx.lineWidth = Math.max(1.3, rx * 0.06);
  ctx.lineCap = 'round';
  if (mood === 1) {
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + sx * ex - sx * er * 1.3, ey - er);
      ctx.lineTo(x + sx * ex + sx * er * 0.6, ey);
      ctx.lineTo(x + sx * ex - sx * er * 1.3, ey + er);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(x - rx * 0.14, ey + ry * 0.42);
    for (let k = 1; k <= 4; k++) ctx.lineTo(x - rx * 0.14 + (k * rx * 0.28) / 4, ey + ry * (0.42 + (k % 2 ? 0.1 : 0)));
    ctx.stroke();
  } else if (mood >= 2) {
    const big = mood === 3 ? 1.6 : 1.2;
    for (const sx of [-1, 1]) {
      ctx.fillStyle = '#ffffff';
      ell(ctx, x + sx * ex, ey, er * 1.6 * big, er * 1.4 * big);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#3a2016';
      ell(ctx, x + sx * ex + Math.sin(t * 0.3) * er * 0.4, ey, er * 0.7, er * 0.7);
      ctx.fill();
    }
    if (mood === 3) {
      ell(ctx, x, ey + ry * 0.48, rx * 0.09, ry * 0.2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(x - rx * 0.12, ey + ry * 0.5);
      ctx.quadraticCurveTo(x, ey + ry * 0.3, x + rx * 0.12, ey + ry * 0.5);
      ctx.stroke();
      ctx.fillStyle = '#7fd0ff';
      ctx.beginPath();
      const dx = x + rx * 0.62, dy = ey - ry * 0.3 + ((t * 0.6) % 6);
      ctx.moveTo(dx, dy - er * 2.2);
      ctx.quadraticCurveTo(dx + er * 1.3, dy, dx, dy + er);
      ctx.quadraticCurveTo(dx - er * 1.3, dy, dx, dy - er * 2.2);
      ctx.fill();
    }
  } else {
    const blink = t % 170 < 6;
    for (const sx of [-1, 1]) {
      if (blink) {
        ctx.beginPath();
        ctx.moveTo(x + sx * ex - er, ey);
        ctx.lineTo(x + sx * ex + er, ey);
        ctx.stroke();
      } else {
        ell(ctx, x + sx * ex, ey, er, er * 1.15);
        ctx.fill();
      }
    }
    ctx.beginPath();
    ctx.arc(x, ey + ry * 0.18, rx * 0.12, 0.2, Math.PI - 0.2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,120,140,.45)';
    for (const sx of [-1, 1]) (ell(ctx, x + sx * rx * 0.5, ey + ry * 0.25, rx * 0.1, ry * 0.12), ctx.fill());
  }
}

function drawAll(ctx: CanvasRenderingContext2D, s: PState, w: number, h: number, th: Theme) {
  const fx = juice(s), t = s.t, L = s.L, W = s.W, d = L.d;
  const X: Fn = (x) => x * w, Y: Fn = (y) => y * w, R: Fn = (r) => r * w;
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  // ── 연출: 새 사건마다 한 번씩 ──
  const last = fx.memo.ev ?? -1;
  for (const e of s.events) {
    if (e.t <= last) continue;
    const ex = X(e.x), ey = Y(e.y);
    if (e.kind === 'eat') {
      const big = (e.v ?? 8) >= 11;
      fx.burst(ex, ey, '#fff1a8', big ? 34 : 22, big ? 5 : 4, 3.2);
      fx.burst(ex, ey, '#ffb36b', 14, 3, 2.6);
      fx.ring(ex, ey, '#fff1a8', R(big ? 0.22 : 0.15), 5);
      fx.pop(ex, ey - R(0.02), e.text ?? '냠!', e.col, big ? 30 : 24);
      if (big) fx.kick(5);
    } else if (e.kind === 'double') {
      fx.pop(ex, ey, e.text ?? '', '#ffd166', 30);
      fx.blink('#fff3c4', 0.35);
      fx.kick(8);
      for (let k = 0; k < 4; k++) fx.burst(X(0.2 + k * 0.2), Y(0.3), ['#ff8fb0', '#86a8ff', '#ffd75e', '#9fd977'][k], 14, 4, 3);
    } else if (e.kind === 'teat') fx.pop(ex, ey, e.text ?? '', e.col, 20);
    else if (e.kind === 'topple') {
      const v = e.v ?? 6;
      fx.kick(4 + v * 0.45);
      fx.burst(ex, ey, '#f3c48a', 16 + v, 3.5, 3);
      fx.ring(ex, ey, 'rgba(255,220,170,.9)', R(0.12 + v * 0.01), 4);
      fx.pop(ex, ey - R(0.03), e.text ?? '와르르!', e.col, 18 + Math.min(10, v));
    } else if (e.kind === 'plop') (fx.burst(ex, ey, '#ffe6bf', 6, 2, 2), fx.ring(ex, ey, 'rgba(255,255,255,.7)', R(0.06), 2));
    else if (e.kind === 'drop') (fx.ring(ex, ey, '#ffffff', R(0.1), 3), fx.burst(ex, ey, '#ffe6bf', 8, 2.2, 2));
    else if (e.kind === 'thud') (fx.burst(ex, ey, '#e8c89a', 6, 2, 2), fx.pop(ex, ey - R(0.02), e.text ?? '', e.col, 14));
    else if (e.kind === 'lick' || e.kind === 'miss' || e.kind === 'full') fx.pop(ex, ey, e.text ?? '', e.col, e.kind === 'lick' ? 18 : 15);
    else if (e.kind === 'clear') {
      fx.blink('#fff6d0', 0.45);
      fx.kick(6);
      for (let k = 0; k < 6; k++) fx.burst(X(0.1 + k * 0.16), Y(0.35 + (k % 2) * 0.2), FLAV[k].top, 18, 5, 3.2);
    } else if (e.kind === 'fail') (fx.kick(9), fx.blink('#ffb0a0', 0.3));
  }
  fx.memo.ev = t;

  ctx.save();
  fx.begin(ctx);
  drawRoom(ctx, s, w, h, X, Y, R, t);
  drawCustomers(ctx, s, X, Y, R, font, t);
  drawTable(ctx, s, X, Y, R, t);
  // ── 접시와 팬케이크 탑 (뒤에서 앞으로) ──
  const pressK = s.down && s.phase === 'play' && !s.busy ? s.press : -1;
  const pre = pressK >= 0 && !W.st[pressK].c.length && s.qi < L.queue.length ? preview(s, pressK) : null;
  const order = [...Array(L.n).keys()].sort((a, b) => L.P[a].y - L.P[b].y || L.P[a].x - L.P[b].x);
  for (const i of order) drawPlate(ctx, s, i, X, Y, R, t, pressK === i);
  for (const i of order) drawStack(ctx, s, i, X, Y, R, t, pressK === i && pre ? L.queue[s.qi] : null);
  drawFlights(ctx, s, X, Y, R);
  if (pre) drawPreview(ctx, s, pressK, pre, X, Y, R, font, t);
  drawFloor(ctx, s, X, Y, R, t);
  ctx.restore();
  drawPanel(ctx, s, w, h, X, Y, R, font, th, pre);
  drawHud(ctx, s, w, X, Y, R, font, th);
  drawCards(ctx, s, w, X, Y, R, font, t);
  void d;
}

function drawRoom(ctx: CanvasRenderingContext2D, s: PState, w: number, h: number, X: Fn, Y: Fn, R: Fn, t: number) {
  // 벽: 따뜻한 크림색 줄무늬 벽지
  const wall = ctx.createLinearGradient(0, 0, 0, Y(0.5));
  wall.addColorStop(0, '#ffe2bd');
  wall.addColorStop(1, '#ffd4a1');
  ctx.fillStyle = wall;
  ctx.fillRect(-10, -10, w + 20, Y(0.5) + 10);
  ctx.fillStyle = 'rgba(255,255,255,.28)';
  for (let k = 0; k < 13; k++) ctx.fillRect(X(k / 12) - R(0.018), 0, R(0.036), Y(0.5));
  // 창문: 아침 하늘·해·구름
  const wx0 = X(0.2), wy0 = Y(0.07), ww = R(0.6), wh = R(0.2);
  ctx.fillStyle = '#8d5b3b';
  ctx.beginPath();
  ctx.roundRect(wx0 - R(0.014), wy0 - R(0.014), ww + R(0.028), wh + R(0.028), R(0.02));
  ctx.fill();
  const sky = ctx.createLinearGradient(0, wy0, 0, wy0 + wh);
  sky.addColorStop(0, '#8fd3ff');
  sky.addColorStop(1, '#fff2c9');
  ctx.fillStyle = sky;
  ctx.fillRect(wx0, wy0, ww, wh);
  ctx.save();
  ctx.beginPath();
  ctx.rect(wx0, wy0, ww, wh);
  ctx.clip();
  const sun = ctx.createRadialGradient(X(0.68), Y(0.13), R(0.01), X(0.68), Y(0.13), R(0.12));
  sun.addColorStop(0, 'rgba(255,248,200,1)');
  sun.addColorStop(0.3, 'rgba(255,224,120,.9)');
  sun.addColorStop(1, 'rgba(255,224,120,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(wx0, wy0, ww, wh);
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  for (let k = 0; k < 3; k++) {
    const cx = X(((0.25 + k * 0.27 + t * 0.00006 * (k + 1)) % 0.75) + 0.12), cy = Y(0.11 + k * 0.035);
    for (let j = 0; j < 3; j++) (ell(ctx, cx + R(0.025) * (j - 1), cy - (j === 1 ? R(0.01) : 0), R(0.028), R(0.016)), ctx.fill());
  }
  // 먼 언덕
  ctx.fillStyle = '#9fd78a';
  ctx.beginPath();
  ctx.moveTo(wx0, wy0 + wh);
  for (let x = 0; x <= 1.001; x += 0.05) ctx.lineTo(wx0 + ww * x, wy0 + wh - R(0.03) - R(0.02) * Math.sin(x * 7 + 1));
  ctx.lineTo(wx0 + ww, wy0 + wh);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = '#8d5b3b';
  ctx.lineWidth = R(0.01);
  ctx.beginPath();
  ctx.moveTo(wx0 + ww / 2, wy0);
  ctx.lineTo(wx0 + ww / 2, wy0 + wh);
  ctx.stroke();
  // 햇살 빛줄기
  ctx.fillStyle = 'rgba(255,246,210,.16)';
  ctx.beginPath();
  ctx.moveTo(wx0, wy0 + wh);
  ctx.lineTo(wx0 + ww, wy0 + wh);
  ctx.lineTo(X(0.98), Y(0.75));
  ctx.lineTo(X(0.02), Y(0.75));
  ctx.fill();
  // 깃발 줄
  ctx.strokeStyle = '#a0704a';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let x = 0; x <= 1.001; x += 0.02) ctx.lineTo(X(x), Y(0.085 + 0.025 * Math.sin(x * Math.PI)));
  ctx.stroke();
  for (let k = 0; k < 11; k++) {
    const x = 0.05 + k * 0.09, y = 0.085 + 0.025 * Math.sin(x * Math.PI), sw = Math.sin(t * 0.03 + k) * 0.004;
    ctx.fillStyle = FLAV[k % 6].top;
    ctx.beginPath();
    ctx.moveTo(X(x - 0.022), Y(y));
    ctx.lineTo(X(x + 0.022), Y(y));
    ctx.lineTo(X(x + sw), Y(y + 0.045));
    ctx.fill();
  }
  // 아래 벽 판자(징두리) + 바닥
  const wain = ctx.createLinearGradient(0, Y(0.33), 0, Y(0.5));
  wain.addColorStop(0, '#c98d5c');
  wain.addColorStop(1, '#a86d43');
  ctx.fillStyle = wain;
  ctx.fillRect(-10, Y(0.33), w + 20, Y(0.17));
  ctx.fillStyle = '#e8b382';
  ctx.fillRect(-10, Y(0.33), w + 20, R(0.008));
  ctx.strokeStyle = 'rgba(90,50,25,.25)';
  for (let k = 0; k < 9; k++) (ctx.beginPath(), ctx.moveTo(X(k / 8), Y(0.34)), ctx.lineTo(X(k / 8), Y(0.5)), ctx.stroke());
  const fl = ctx.createLinearGradient(0, Y(0.5), 0, h);
  fl.addColorStop(0, '#9a5f37');
  fl.addColorStop(1, '#6e4024');
  ctx.fillStyle = fl;
  ctx.fillRect(-10, Y(0.5), w + 20, h - Y(0.5) + 10);
  ctx.strokeStyle = 'rgba(40,20,8,.25)';
  ctx.lineWidth = 1;
  for (let k = 0; k < 12; k++) {
    const y = 0.5 + k * 0.06 + k * k * 0.002;
    ctx.beginPath();
    ctx.moveTo(0, Y(y));
    ctx.lineTo(w, Y(y));
    ctx.stroke();
  }
  void s;
}

/** 손님 머리 (곰·토끼·고양이·돼지): mood 0 기다림 · 1 배부름 · 2 냠냠 · 3 신남 · 4 시무룩, gasp = 와르르에 깜짝 */
function drawCritter(ctx: CanvasRenderingContext2D, kind: number, x: number, y: number, r: number, mood: number, t: number, gasp: boolean, chew: number) {
  const C = CRIT[kind];
  ctx.lineWidth = Math.max(1.2, r * 0.07);
  ctx.strokeStyle = C.dark;
  // 귀
  ctx.fillStyle = C.fur;
  if (kind === 0) {
    for (const sx of [-1, 1]) {
      ell(ctx, x + sx * r * 0.72, y - r * 0.72, r * 0.34, r * 0.34);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = C.in;
      ell(ctx, x + sx * r * 0.72, y - r * 0.72, r * 0.18, r * 0.18);
      ctx.fill();
      ctx.fillStyle = C.fur;
    }
  } else if (kind === 1) {
    for (const sx of [-1, 1]) {
      const sway = Math.sin(t * 0.05 + sx) * 0.08 + (gasp ? -sx * 0.25 : 0);
      ctx.save();
      ctx.translate(x + sx * r * 0.38, y - r * 0.75);
      ctx.rotate(sx * 0.12 + sway);
      ell(ctx, 0, -r * 0.55, r * 0.22, r * 0.62);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = C.in;
      ell(ctx, 0, -r * 0.55, r * 0.11, r * 0.45);
      ctx.fill();
      ctx.fillStyle = C.fur;
      ctx.restore();
    }
  } else {
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + sx * r * 0.85, y - r * 0.3);
      ctx.lineTo(x + sx * r * (kind === 2 ? 0.78 : 0.85), y - r * (kind === 2 ? 1.12 : 0.95));
      ctx.lineTo(x + sx * r * 0.25, y - r * 0.82);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
  // 머리
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r * 1.05);
  g.addColorStop(0, mix(C.fur, '#ffffff', 0.35));
  g.addColorStop(1, C.fur);
  ctx.fillStyle = g;
  const puff = mood === 2 ? 1 + 0.06 * Math.abs(Math.sin(chew * 0.5)) : 1;
  ell(ctx, x, y, r * puff, r * 0.95);
  ctx.fill();
  ctx.stroke();
  // 주둥이/코
  if (kind === 3) {
    ctx.fillStyle = mix(C.fur, '#d9607a', 0.35);
    ell(ctx, x, y + r * 0.2, r * 0.3, r * 0.2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = C.dark;
    for (const sx of [-1, 1]) (ell(ctx, x + sx * r * 0.1, y + r * 0.2, r * 0.05, r * 0.08), ctx.fill());
  } else {
    ctx.fillStyle = kind === 0 ? C.in : mix(C.fur, '#ffffff', 0.5);
    ell(ctx, x, y + r * 0.28, r * 0.34, r * 0.24);
    ctx.fill();
    ctx.fillStyle = '#3a2418';
    ell(ctx, x, y + r * 0.16, r * 0.1, r * 0.07);
    ctx.fill();
  }
  // 볼
  ctx.fillStyle = mood === 2 ? 'rgba(255,110,130,.55)' : 'rgba(255,120,140,.35)';
  for (const sx of [-1, 1]) (ell(ctx, x + sx * r * 0.58, y + r * 0.22, r * (mood === 2 ? 0.2 : 0.14), r * 0.1), ctx.fill());
  // 눈·입
  const ex = r * 0.36, ey = y - r * 0.08;
  ctx.strokeStyle = '#2a1810';
  ctx.fillStyle = '#2a1810';
  ctx.lineWidth = Math.max(1.4, r * 0.09);
  ctx.lineCap = 'round';
  const my = y + r * 0.46;
  if (gasp && mood !== 2) {
    for (const sx of [-1, 1]) {
      ctx.fillStyle = '#ffffff';
      ell(ctx, x + sx * ex, ey, r * 0.17, r * 0.19);
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = '#2a1810';
      ell(ctx, x + sx * ex, ey + r * 0.02, r * 0.07, r * 0.07);
      ctx.fill();
    }
    ell(ctx, x, my, r * 0.1, r * 0.13);
    ctx.fill();
  } else if (mood === 1 || mood === 3) {
    for (const sx of [-1, 1]) (ctx.beginPath(), ctx.arc(x + sx * ex, ey + r * 0.04, r * 0.12, Math.PI + 0.3, -0.3), ctx.stroke());
    ctx.beginPath();
    if (mood === 3) (ctx.arc(x, my - r * 0.08, r * 0.17, 0.1, Math.PI - 0.1), ctx.fill());
    else (ctx.arc(x, my - r * 0.12, r * 0.12, 0.3, Math.PI - 0.3), ctx.stroke());
  } else if (mood === 2) {
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + sx * ex - r * 0.1, ey - r * 0.06);
      ctx.lineTo(x + sx * ex + r * 0.06 * sx, ey);
      ctx.lineTo(x + sx * ex - r * 0.1, ey + r * 0.06);
      ctx.stroke();
    }
    const open = Math.abs(Math.sin(chew * 0.45));
    ctx.fillStyle = '#7a2a2a';
    ell(ctx, x, my - r * 0.06, r * 0.16, r * (0.04 + 0.12 * open));
    ctx.fill();
  } else if (mood === 4) {
    for (const sx of [-1, 1]) (ctx.beginPath(), ctx.moveTo(x + sx * ex - r * 0.1, ey - r * 0.04 * sx), ctx.lineTo(x + sx * ex + r * 0.1, ey + r * 0.04 * sx), ctx.stroke());
    ctx.beginPath();
    ctx.arc(x, my + r * 0.06, r * 0.12, Math.PI + 0.4, -0.4);
    ctx.stroke();
    ctx.fillStyle = '#7fd0ff';
    ell(ctx, x + ex + r * 0.05, ey + r * 0.25 + ((t * 0.5) % 8) * 0.4, r * 0.06, r * 0.09);
    ctx.fill();
  } else {
    const blink = (t + kind * 37) % 190 < 7;
    for (const sx of [-1, 1]) {
      if (blink) (ctx.beginPath(), ctx.moveTo(x + sx * ex - r * 0.1, ey), ctx.lineTo(x + sx * ex + r * 0.1, ey), ctx.stroke());
      else {
        ell(ctx, x + sx * ex, ey, r * 0.085, r * 0.1);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ell(ctx, x + sx * ex + r * 0.03, ey - r * 0.04, r * 0.03, r * 0.03);
        ctx.fill();
        ctx.fillStyle = '#2a1810';
      }
    }
    ctx.beginPath();
    ctx.moveTo(x - r * 0.12, my - r * 0.1);
    ctx.quadraticCurveTo(x - r * 0.06, my - r * 0.02, x, my - r * 0.1);
    ctx.quadraticCurveTo(x + r * 0.06, my - r * 0.02, x + r * 0.12, my - r * 0.1);
    ctx.stroke();
  }
}

function drawCustomers(ctx: CanvasRenderingContext2D, s: PState, X: Fn, Y: Fn, R: Fn, font: (sz: number, w?: number) => void, t: number) {
  const L = s.L, W = s.W, n = s.cust.length, gasp = t - s.gasp < 60;
  for (let k = 0; k < n; k++) {
    const c = s.cust[k], kind = (k + s.stage) % 4, fed = k < W.fed || c.mood === 2;
    const bob = c.mood === 3 ? -Math.abs(Math.sin((t - c.t) * 0.15)) * 0.02 : gasp && !fed ? -0.012 : Math.sin(t * 0.04 + k) * 0.003;
    const x = X(seatX(n, k)), y = Y(SEAT_Y + bob), r = R(0.05);
    // 의자 등받이
    ctx.fillStyle = '#7a4a2c';
    ctx.beginPath();
    ctx.roundRect(x - r * 1.25, y + r * 0.2, r * 2.5, r * 2.6, r * 0.5);
    ctx.fill();
    ctx.fillStyle = '#9a6038';
    ctx.beginPath();
    ctx.roundRect(x - r * 1.05, y + r * 0.4, r * 2.1, r * 2.2, r * 0.4);
    ctx.fill();
    // 몸 + 턱받이
    const C = CRIT[kind];
    ctx.fillStyle = C.fur;
    ctx.strokeStyle = C.dark;
    ctx.lineWidth = 1.5;
    ell(ctx, x, y + r * 1.75, r * 0.95, r * 1.0);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(x - r * 0.62, y + r * 0.95);
    ctx.lineTo(x + r * 0.62, y + r * 0.95);
    ctx.quadraticCurveTo(x + r * 0.5, y + r * 2.1, x, y + r * 2.3);
    ctx.quadraticCurveTo(x - r * 0.5, y + r * 2.1, x - r * 0.62, y + r * 0.95);
    ctx.fill();
    ctx.strokeStyle = FLAV[(k + 2) % 6].side;
    ctx.lineWidth = 2;
    ctx.stroke();
    if (fed && c.mood !== 2) {
      // 배부른 배 + 동그라미 표시
      ctx.fillStyle = mix(C.fur, '#ffffff', 0.2);
      ell(ctx, x, y + r * 2.05, r * 0.55, r * 0.35);
      ctx.fill();
    }
    drawCritter(ctx, kind, x, y, r, c.mood === 0 && fed ? 1 : c.mood, t, gasp && c.mood !== 2, t - c.t);
    // 냠냠 중이면 입으로 들어가는 팬케이크 조각
    if (c.mood === 2) {
      ctx.fillStyle = '#ffffff';
      font(0.032, 900);
      ctx.textAlign = 'center';
      ctx.fillText('냠냠', x + r * 1.3, y - r * 0.9 - Math.abs(Math.sin(t * 0.2)) * 4);
    }
    // 포크(기다리는 손님) · 배부르면 ✓
    if (!fed) {
      ctx.strokeStyle = '#d9dde3';
      ctx.lineWidth = 2.2;
      const fxp = x + r * 1.05, fy = y + r * 0.9 + Math.sin(t * 0.08 + k) * 2;
      ctx.beginPath();
      ctx.moveTo(fxp, fy + r * 0.9);
      ctx.lineTo(fxp, fy - r * 0.2);
      ctx.stroke();
      ctx.lineWidth = 1.4;
      for (let j = -1; j <= 1; j++) (ctx.beginPath(), ctx.moveTo(fxp + j * r * 0.12, fy - r * 0.2), ctx.lineTo(fxp + j * r * 0.12, fy - r * 0.55), ctx.stroke());
    } else if (c.mood !== 2) {
      ctx.fillStyle = '#3fbf6f';
      ell(ctx, x + r * 0.95, y - r * 0.75, r * 0.3, r * 0.3);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + r * 0.82, y - r * 0.75);
      ctx.lineTo(x + r * 0.92, y - r * 0.63);
      ctx.lineTo(x + r * 1.1, y - r * 0.88);
      ctx.stroke();
    }
    // 주문 말풍선 (주문 손님 판)
    if (L.order && !fed) {
      const want = L.order[k], cur = k === W.oi, bw = r * 2.9, bh = r * 1.05, bx = x - bw / 2, by = y - r * 2.3;
      ctx.globalAlpha = cur ? 1 : 0.75;
      ctx.fillStyle = cur ? '#fffdf5' : 'rgba(255,253,245,.85)';
      ctx.strokeStyle = cur ? '#ff9a3c' : '#c9a98a';
      ctx.lineWidth = cur ? 2.5 : 1.5;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, r * 0.35);
      ctx.moveTo(x - r * 0.15, by + bh);
      ctx.lineTo(x, by + bh + r * 0.3);
      ctx.lineTo(x + r * 0.15, by + bh);
      ctx.fill();
      ctx.stroke();
      cake(ctx, bx + r * 0.62, by + bh * 0.66, r * 0.46, r * 0.22, r * 0.16, want);
      cake(ctx, bx + r * 0.62, by + bh * 0.46, r * 0.46, r * 0.22, r * 0.16, want);
      ctx.fillStyle = cur ? '#c4520a' : '#5a3418';
      font(0.032, 900);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(cur ? '먼저!' : `${k + 1}번`, bx + r * 1.2, by + bh * 0.53, bw - r * 1.3);
      ctx.globalAlpha = 1;
    }
  }
  // 와르르에 깜짝 "헉!"
  if (gasp && n) {
    const k = Math.floor(s.gasp / 7) % n;
    if (s.cust[k].mood !== 2) {
      ctx.fillStyle = '#ffffff';
      font(0.036, 900);
      ctx.textAlign = 'center';
      ctx.fillText(['헉!', '어머!', '으앗!'][Math.floor(s.gasp / 3) % 3], X(seatX(n, k)) - R(0.07), Y(SEAT_Y - 0.06));
    }
  }
}

function drawTable(ctx: CanvasRenderingContext2D, s: PState, X: Fn, Y: Fn, R: Fn, t: number) {
  const W = s.W;
  const rim = (rx: number, ry: number, dy: number) => {
    ctx.beginPath();
    for (let k = 0; k <= 48; k++) {
      const a = (k / 48) * TAU, ex = 0.5 + Math.cos(a) * rx, ey = CY + Math.sin(a) * ry, py = 0.5 + (ey - CY) / KY;
      ctx.lineTo(X(ex), Y(ey + dy + zOff(W, ex, py)));
    }
    ctx.closePath();
  };
  // 바닥 그림자 + 다리
  ctx.fillStyle = 'rgba(30,12,4,.35)';
  ell(ctx, X(0.5), Y(FLOOR_Y + 0.025), R(0.46), R(0.045));
  ctx.fill();
  for (const lx of [0.13, 0.87]) {
    const g = ctx.createLinearGradient(X(lx - 0.02), 0, X(lx + 0.02), 0);
    g.addColorStop(0, '#8a5634');
    g.addColorStop(0.5, '#b97a4c');
    g.addColorStop(1, '#6e4024');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(X(lx - 0.022), Y(0.84));
    ctx.lineTo(X(lx + 0.022), Y(0.84));
    ctx.lineTo(X(lx + 0.015), Y(FLOOR_Y + 0.02));
    ctx.lineTo(X(lx - 0.015), Y(FLOOR_Y + 0.02));
    ctx.fill();
  }
  // 식탁 두께
  ctx.fillStyle = '#7a4626';
  rim(TAB_RX, TAB_RY, 0.032);
  ctx.fill();
  ctx.fillStyle = '#b06c3e';
  rim(TAB_RX, TAB_RY, 0.016);
  ctx.fill();
  // 식탁보 (깅엄) + 늘어진 끝단
  ctx.fillStyle = '#e95d55';
  rim(TAB_RX - 0.004, TAB_RY - 0.002, 0.024);
  ctx.fill();
  ctx.save();
  rim(TAB_RX - 0.004, TAB_RY - 0.002, 0);
  ctx.fillStyle = '#fff6ec';
  ctx.fill();
  ctx.clip();
  ctx.fillStyle = 'rgba(233,93,85,.32)';
  for (let k = -12; k <= 12; k++) ctx.fillRect(X(0.5 + k * 0.05 - 0.0125), Y(0.3), R(0.025), R(0.75));
  for (let k = -8; k <= 8; k++) ctx.fillRect(0, Y(CY + k * 0.03 - 0.0075), X(1), R(0.015));
  const sh = ctx.createRadialGradient(X(0.5), Y(CY - 0.05), R(0.1), X(0.5), Y(CY), R(0.55));
  sh.addColorStop(0, 'rgba(255,250,230,.25)');
  sh.addColorStop(1, 'rgba(120,50,20,.18)');
  ctx.fillStyle = sh;
  ctx.fillRect(0, Y(0.3), X(1), R(0.8));
  ctx.restore();
  ctx.strokeStyle = 'rgba(160,50,40,.6)';
  ctx.lineWidth = 1.5;
  rim(TAB_RX - 0.004, TAB_RY - 0.002, 0);
  ctx.stroke();
  // 기우는 식탁: 식탁보 위에 내리막 화살표 (기운 만큼 길게)
  if (s.L.tilt) {
    const m = Math.hypot(W.gx, W.gy);
    if (m > 1e-4) {
      const len = Math.min(0.28, m * 70), ux = W.gx / m, uy = (W.gy / m) * KY, cx = X(0.5), cy = Y(CY), a = Math.atan2(uy, ux);
      ctx.save();
      ctx.globalAlpha = Math.min(0.5, m * 220);
      ctx.translate(cx, cy);
      ctx.rotate(a);
      ctx.fillStyle = '#c0392b';
      const L2 = R(len), wd = R(0.035);
      ctx.beginPath();
      ctx.moveTo(-L2 * 0.5, -wd * 0.5);
      ctx.lineTo(L2 * 0.5 - wd, -wd * 0.5);
      ctx.lineTo(L2 * 0.5 - wd, -wd * 1.2);
      ctx.lineTo(L2 * 0.5 + wd * 0.4, 0);
      ctx.lineTo(L2 * 0.5 - wd, wd * 1.2);
      ctx.lineTo(L2 * 0.5 - wd, wd * 0.5);
      ctx.lineTo(-L2 * 0.5, wd * 0.5);
      ctx.fill();
      ctx.restore();
    }
  }
  // 기우는 식탁: 앞 모서리의 수평계
  if (s.L.tilt) {
    const bx = X(0.5), by = Y(CY + TAB_RY + 0.048), bw = R(0.2), bh = R(0.036);
    ctx.fillStyle = '#5b3a22';
    ctx.beginPath();
    ctx.roundRect(bx - bw / 2 - 3, by - bh / 2 - 3, bw + 6, bh + 6, bh / 2 + 3);
    ctx.fill();
    ctx.fillStyle = '#c8f5a0';
    ctx.beginPath();
    ctx.roundRect(bx - bw / 2, by - bh / 2, bw, bh, bh / 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.35)';
    ctx.lineWidth = 1;
    for (const sx of [-1, 1]) (ctx.beginPath(), ctx.moveTo(bx + sx * R(0.02), by - bh / 2), ctx.lineTo(bx + sx * R(0.02), by + bh / 2), ctx.stroke());
    const off = Math.max(-1, Math.min(1, -W.gx * 300)) * (bw / 2 - bh / 2);
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ell(ctx, bx + off, by, bh * 0.42, bh * 0.36);
    ctx.fill();
    // 어느 쪽으로 기울었는지 말로
    const m = Math.hypot(W.gx, W.gy);
    if (m > 6e-4) {
      const side = Math.abs(W.gx) >= Math.abs(W.gy) ? (W.gx > 0 ? '오른쪽으로 기울어요 →' : '← 왼쪽으로 기울어요') : W.gy > 0 ? '↓ 앞으로 기울어요' : '↑ 뒤로 기울어요';
      ctx.font = `900 ${Math.max(12, Math.round(R(0.032)))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(60,25,10,.85)';
      const ty = by + bh / 2 + R(0.026), wob = Math.sin(t * 0.12) * 1.5;
      ctx.strokeText(side, bx + wob, ty);
      ctx.fillStyle = m > 1.6e-3 ? '#ffb3a0' : '#fff1d6';
      ctx.fillText(side, bx + wob, ty);
    }
  }
}

function drawPlate(ctx: CanvasRenderingContext2D, s: PState, i: number, X: Fn, Y: Fn, R: Fn, t: number, pressed: boolean) {
  const L = s.L, W = s.W, P = L.P[i], [px, py] = plateXY(L, W, i), x = X(px), y = Y(py), rx = R(0.094), ry = rx * KY;
  ctx.fillStyle = 'rgba(90,30,10,.22)';
  ell(ctx, x + R(0.006), y + R(0.012), rx, ry);
  ctx.fill();
  const g = ctx.createLinearGradient(0, y - ry, 0, y + ry);
  g.addColorStop(0, P.kind === BUTTER ? '#fff6d8' : '#ffffff');
  g.addColorStop(1, P.kind === BUTTER ? '#f0dfa8' : '#e3e6ee');
  ctx.fillStyle = g;
  ell(ctx, x, y, rx, ry);
  ctx.fill();
  ctx.strokeStyle = P.kind === BUTTER ? '#d9b54a' : '#a9c3de';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.fillStyle = P.kind === BUTTER ? '#fbefc4' : '#f3f5f9';
  ell(ctx, x, y + ry * 0.06, rx * 0.72, ry * 0.68);
  ctx.fill();
  ctx.strokeStyle = 'rgba(150,170,200,.45)';
  ctx.lineWidth = 1;
  ctx.stroke();
  if (P.kind === SYRUP) {
    // 반짝이는 시럽 웅덩이 + 흘러내림
    const sg = ctx.createRadialGradient(x - rx * 0.2, y - ry * 0.2, 1, x, y, rx * 0.85);
    sg.addColorStop(0, '#ffcf6a');
    sg.addColorStop(1, '#c9781a');
    ctx.fillStyle = sg;
    ctx.beginPath();
    for (let k = 0; k <= 20; k++) {
      const a = (k / 20) * TAU, rr = 0.82 + 0.1 * Math.sin(a * 3 + i);
      ctx.lineTo(x + Math.cos(a) * rx * rr, y + ry * 0.04 + Math.sin(a) * ry * rr * 0.92);
    }
    ctx.fill();
    ctx.fillStyle = '#d98a22';
    for (const dx of [-0.5, 0.35]) {
      ctx.beginPath();
      ctx.ellipse(x + dx * rx, y + ry * 0.92 + 2, R(0.008), R(0.012 + 0.004 * Math.sin(t * 0.05 + dx)), 0, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,.65)';
    ell(ctx, x - rx * 0.35, y - ry * 0.25, rx * 0.18, ry * 0.12);
    ctx.fill();
  } else if (P.kind === BUTTER) {
    // 버터 덩이 (접시 가장자리)
    const bx = x + rx * 0.72, by = y - ry * 0.5, bs = R(0.024);
    ctx.fillStyle = '#e8c23a';
    ctx.fillRect(bx - bs, by - bs * 0.4, bs * 2, bs * 0.9);
    ctx.fillStyle = '#ffe88a';
    ctx.beginPath();
    ctx.moveTo(bx - bs, by - bs * 0.4);
    ctx.lineTo(bx - bs * 0.5, by - bs * 0.9);
    ctx.lineTo(bx + bs * 1.5, by - bs * 0.9);
    ctx.lineTo(bx + bs, by - bs * 0.4);
    ctx.fill();
  }
  // 빈 접시: 놓을 수 있을 때 살짝 반짝 (첫 판 첫 톡은 가운데를 손가락으로 가리킨다)
  const can = s.phase === 'play' && !s.busy && !W.st[i].c.length;
  if (can) {
    ctx.strokeStyle = pressed ? '#ffd23a' : `rgba(255,255,255,${0.35 + 0.25 * Math.sin(t * 0.08 + i)})`;
    ctx.lineWidth = pressed ? 3.5 : 2;
    ctx.setLineDash(pressed ? [] : [5, 4]);
    ell(ctx, x, y, rx * 0.86, ry * 0.86);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (s.stage === 0 && !s.firstTap && i === 3 && s.phase === 'play' && t - s.startT > 30 && !s.again) {
    const b = Math.abs(Math.sin(t * 0.1)) * R(0.03);
    ctx.fillStyle = '#ffffff';
    ctx.font = `${Math.round(R(0.075))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('👆', x + R(0.02), y + R(0.06) + b);
  }
}

/** 탑 한 개: 기울기만큼 위로 갈수록 휘어진다(말랑) + 막 맞으면 찌그러짐 */
function stackPose(s: PState, i: number, k: number, h: number): [number, number] {
  const st = s.W.st[i], f = (k + 1) * PZ * (0.6 + (0.8 * (k + 1)) / Math.max(1, h));
  return [st.tx * f, st.ty * f * KY];
}
function leanRatio(s: PState, i: number) {
  const st = s.W.st[i], h = st.c.length;
  return h < MIN_TOP ? 0 : (Math.hypot(st.tx, st.ty) * h) / limOf(s.L.P[i].kind);
}
function drawStack(ctx: CanvasRenderingContext2D, s: PState, i: number, X: Fn, Y: Fn, R: Fn, t: number, ghost: number[] | null) {
  const L = s.L, W = s.W, st = W.st[i], [px, py] = plateXY(L, W, i);
  const age = W.t - st.hit, sq = age >= 0 && age < 14 ? 1 - 0.28 * Math.exp(-age / 4) * Math.cos(age * 0.6) : 1;
  const drop = age < 0 ? -age : 0;
  const h = st.c.length, rx = R(CRX), ry = rx * KY * 0.9, thk = R(PZ) * sq;
  const lr = leanRatio(s, i);
  // 그림자는 기운 쪽으로 늘어진다
  if (h) {
    const [ox, oy] = stackPose(s, i, h - 1, h);
    ctx.fillStyle = 'rgba(80,30,10,.2)';
    ell(ctx, X(px + ox * 0.5) + R(0.01), Y(py + oy * 0.5) + R(0.008), rx * 1.05 + Math.abs(R(ox)) * 0.4, ry * 1.05);
    ctx.fill();
  }
  for (let k = 0; k < h; k++) {
    const [ox, oy] = stackPose(s, i, k, h), x = X(px + ox), y = Y(py + oy) - (k + 0.5) * thk - R(drop * 0.02);
    cake(ctx, x, y, rx, ry, thk, st.c[k]);
    if (k === h - 1) cakeFace(ctx, x, y - thk * 0.5, rx, ry, age >= 0 && age < 18 ? 1 : lr > 0.82 ? 3 : lr > 0.45 ? 2 : 0, t + i * 13);
  }
  // 아직 안 떠난(곧 날아갈) 팬케이크는 원래 자리에
  for (const f of W.fl) {
    if (f.from !== i || W.t >= f.t0) continue;
    const [ox, oy] = stackPose(s, i, f.z0, Math.max(h, f.z0 + 1)), x = X(px + ox), y = Y(py + oy) - (f.z0 + 0.5) * thk;
    cake(ctx, x, y, rx, ry, thk, f.col);
  }
  if (ghost) {
    for (let k = 0; k < ghost.length; k++) cake(ctx, X(px), Y(py) - (k + 0.5) * R(PZ), rx, ry, R(PZ), ghost[k], 0.55);
  }
  // 위험하게 기우는 탑: 빨간 경고 (높이가 한계에 가까울수록)
  if (lr > 0.6 && h >= MIN_TOP) {
    const [ox, oy] = stackPose(s, i, h - 1, h), x = X(px + ox), y = Y(py + oy) - h * thk - R(0.03);
    ctx.globalAlpha = Math.min(1, (lr - 0.6) * 3) * (0.6 + 0.4 * Math.sin(t * 0.4));
    ctx.fillStyle = '#ff5a4f';
    ctx.font = `900 ${Math.round(R(0.045))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', x, y);
    ctx.globalAlpha = 1;
  }
}

function drawFlights(ctx: CanvasRenderingContext2D, s: PState, X: Fn, Y: Fn, R: Fn) {
  const L = s.L, W = s.W, rx = R(CRX), ry = rx * KY * 0.9, thk = R(PZ);
  const stackAt = new Map<number, number>();
  for (const f of W.fl) {
    if (W.t < f.t0) continue;
    const u = Math.min(1, (W.t - f.t0) / Math.max(1, f.t1 - f.t0));
    const [sx0, sy0] = plateXY(L, W, f.from), [ox, oy] = stackPose(s, f.from, f.z0, f.z0 + 1);
    const x0 = sx0 + ox, y0 = sy0 + oy - (f.z0 + 0.5) * PZ;
    let x1: number, y1: number;
    if (f.to >= 0) {
      const [tx, ty] = plateXY(L, W, f.to), q = stackAt.get(f.to) ?? 0;
      stackAt.set(f.to, q + 1);
      x1 = tx;
      y1 = ty - (W.st[f.to].c.length + q + 0.5) * PZ;
    } else {
      x1 = SX(f.lx);
      y1 = SYp(f.ly) + zOff(W, f.lx, f.ly) + 0.02;
    }
    const arc = f.kind ? 0.03 + f.z0 * 0.003 : 0.09;
    const e = f.kind ? u * u : u;
    const x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * e - Math.sin(Math.PI * u) * arc;
    ctx.save();
    ctx.translate(X(x), Y(y));
    ctx.rotate(f.kind ? f.dx * u * 2.2 : Math.sin(u * Math.PI) * 0.35 * Math.sign(f.dx || 1));
    cake(ctx, 0, 0, rx, ry, thk, f.col);
    if (f.kind && u > 0.1) cakeFace(ctx, 0, -thk * 0.5, rx, ry, 3, s.t);
    ctx.restore();
  }
  // 손님에게 날아가는 팬케이크 (냠)
  for (const v of s.vEat) {
    const u = (s.t - v.t0) / 26;
    if (u < 0 || u > 1) continue;
    const n = s.cust.length, tx = seatX(n, Math.max(0, v.seat)), ty = SEAT_Y + 0.03, e = u * u * (3 - 2 * u);
    const x = v.x + (tx - v.x) * e, y = v.y + (ty - v.y) * e - Math.sin(Math.PI * u) * 0.08, sc = 1 - 0.55 * u;
    cake(ctx, X(x), Y(y), rx * sc, ry * sc, thk * sc, v.col);
  }
}

function drawPreview(ctx: CanvasRenderingContext2D, s: PState, k: number, p: Prev, X: Fn, Y: Fn, R: Fn, font: (sz: number, w?: number) => void, t: number) {
  const L = s.L, W = s.W, top = (i: number) => {
    const [x, y] = plateXY(L, W, i);
    return [x, y - (W.st[i].c.length + (i === k ? L.queue[s.qi].length : 0)) * PZ] as [number, number];
  };
  ctx.lineCap = 'round';
  // 날아올 팬케이크: 곡선 화살표 + 장수
  for (const x of p.xf) {
    const [ax, ay] = top(x.from), [bx, by] = top(x.to), mx = (ax + bx) / 2, my = Math.min(ay, by) - 0.07;
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.lineWidth = R(0.016);
    ctx.beginPath();
    ctx.moveTo(X(ax), Y(ay));
    ctx.quadraticCurveTo(X(mx), Y(my), X(bx), Y(by));
    ctx.stroke();
    ctx.strokeStyle = FLAV[x.col].side;
    ctx.lineWidth = R(0.009);
    ctx.setLineDash([R(0.02), R(0.012)]);
    ctx.lineDashOffset = -t * 0.8;
    ctx.stroke();
    ctx.setLineDash([]);
    const a = Math.atan2(by - my, bx - mx), hx = X(bx), hy = Y(by);
    ctx.fillStyle = FLAV[x.col].side;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(hx - Math.cos(a - 0.5) * R(0.03), hy - Math.sin(a - 0.5) * R(0.03));
    ctx.lineTo(hx - Math.cos(a + 0.5) * R(0.03), hy - Math.sin(a + 0.5) * R(0.03));
    ctx.fill();
    const lx = X(mx), ly = Y(my + 0.012);
    ctx.fillStyle = 'rgba(60,30,15,.85)';
    ctx.beginPath();
    ctx.roundRect(lx - R(0.032), ly - R(0.02), R(0.064), R(0.04), R(0.02));
    ctx.fill();
    ctx.fillStyle = FLAV[x.col].top;
    font(0.032, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`+${x.n}`, lx, ly + 1);
  }
  // 와르르: 쓰러질 탑 고리 + 쓰러질 쪽 큰 화살표
  for (const q of p.top) {
    const [x, y] = plateXY(L, W, q.p), hy = y - Math.min(q.h, 14) * PZ * 0.5;
    ctx.strokeStyle = `rgba(255,80,60,${0.6 + 0.3 * Math.sin(t * 0.3)})`;
    ctx.lineWidth = 3;
    ell(ctx, X(x), Y(y), R(0.1), R(0.1) * KY);
    ctx.stroke();
    const ex = x + q.ux * 0.17, ey = hy + q.uy * 0.17 * KY + 0.02;
    ctx.strokeStyle = 'rgba(255,255,255,.95)';
    ctx.lineWidth = R(0.024);
    ctx.beginPath();
    ctx.moveTo(X(x), Y(hy));
    ctx.quadraticCurveTo(X(x + q.ux * 0.1), Y(hy - 0.04), X(ex), Y(ey));
    ctx.stroke();
    ctx.strokeStyle = '#ff5a3c';
    ctx.lineWidth = R(0.014);
    ctx.stroke();
    const a = Math.atan2(Y(ey) - Y(hy - 0.04), X(ex) - X(x + q.ux * 0.1));
    ctx.fillStyle = '#ff5a3c';
    ctx.beginPath();
    ctx.moveTo(X(ex) + Math.cos(a) * R(0.012), Y(ey) + Math.sin(a) * R(0.012));
    ctx.lineTo(X(ex) - Math.cos(a - 0.6) * R(0.035), Y(ey) - Math.sin(a - 0.6) * R(0.035));
    ctx.lineTo(X(ex) - Math.cos(a + 0.6) * R(0.035), Y(ey) - Math.sin(a + 0.6) * R(0.035));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    font(0.034, 900);
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(160,30,20,.9)';
    ctx.strokeText('와르르!', X(x), Y(hy - 0.06));
    ctx.fillText('와르르!', X(x), Y(hy - 0.06));
  }
  // 아슬아슬: 쓰러지진 않지만 크게 기울 탑 (기울 쪽으로 작은 물결 화살표)
  for (const q of p.wob) {
    const [x, y] = plateXY(L, W, q.p), hy = y - (W.st[q.p].c.length + (q.p === k ? L.queue[s.qi].length : 0)) * PZ - 0.035;
    const sw = Math.sin(t * 0.25) * 0.012 * q.r;
    ctx.strokeStyle = q.r > 0.8 ? '#ff7a3c' : '#ffc23c';
    ctx.lineWidth = R(0.009);
    ctx.beginPath();
    for (let j = 0; j <= 8; j++) {
      const u = j / 8, bx = x + q.ux * (u - 0.3) * 0.08 + sw, by = hy + q.uy * (u - 0.3) * 0.08 * KY - Math.sin(u * Math.PI * 3) * 0.008;
      ctx.lineTo(X(bx), Y(by));
    }
    ctx.stroke();
    ctx.fillStyle = q.r > 0.8 ? '#ff7a3c' : '#ffc23c';
    font(0.03, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(70,30,10,.85)';
    ctx.strokeText(q.r > 0.8 ? '아슬아슬!' : '흔들', X(x), Y(hy - 0.03));
    ctx.fillText(q.r > 0.8 ? '아슬아슬!' : '흔들', X(x), Y(hy - 0.03));
  }
  // 쏟아질 자리: 접시 위 고스트
  for (const [i, cols] of p.land) {
    const [x, y] = top(i);
    cols.slice(0, 8).forEach((c, j) => cake(ctx, X(x), Y(y) - (j + 0.5) * R(PZ), R(CRX * 0.9), R(CRX * 0.9) * KY * 0.9, R(PZ), c, 0.5));
  }
  // 바닥으로 떨어질 것: 고스트 + 강아지
  for (const f of p.fl) {
    const x = X(SX(f.x)), y = Y(SYp(f.y) + zOff(W, f.x, f.y));
    cake(ctx, x, y, R(CRX * 0.8), R(CRX * 0.8) * KY * 0.9, R(PZ), f.col, 0.45);
    ctx.strokeStyle = 'rgba(255,60,40,.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - R(0.018), y - R(0.018));
    ctx.lineTo(x + R(0.018), y + R(0.018));
    ctx.moveTo(x + R(0.018), y - R(0.018));
    ctx.lineTo(x - R(0.018), y + R(0.018));
    ctx.stroke();
  }
  // 손님이 먹을 접시
  for (const e of p.eat) {
    const [x, y] = plateXY(L, W, e.p), by = Y(y) - R(0.15);
    ctx.fillStyle = 'rgba(255,248,220,.95)';
    ctx.strokeStyle = '#ffb000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(X(x) - R(0.05), by - R(0.024), R(0.1), R(0.048), R(0.024));
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#c45a00';
    font(0.034, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('냠!', X(x), by + 1);
  }
}

function drawDog(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, face: number, t: number, chew: number, wag: number) {
  const licking = t - chew < 40;
  ctx.fillStyle = 'rgba(30,10,0,.3)';
  ell(ctx, x, y + u * 0.5, u * 1.1, u * 0.2);
  ctx.fill();
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(face, 1);
  // 꼬리
  ctx.strokeStyle = '#c98a4a';
  ctx.lineWidth = u * 0.16;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-u * 0.8, -u * 0.1);
  ctx.quadraticCurveTo(-u * 1.2, -u * 0.5 + Math.sin(wag) * u * 0.2, -u * 1.05 + Math.sin(wag) * u * 0.3, -u * 0.8);
  ctx.stroke();
  // 다리
  ctx.fillStyle = '#c98a4a';
  const step = Math.sin(t * 0.4) * u * 0.06;
  for (const lx of [-0.55, -0.25, 0.3, 0.55]) (ctx.beginPath(), ctx.roundRect(u * lx - u * 0.09, u * 0.05, u * 0.18, u * 0.42 + (lx > 0 ? step : -step), u * 0.08), ctx.fill());
  // 몸
  const g = ctx.createLinearGradient(0, -u * 0.5, 0, u * 0.4);
  g.addColorStop(0, '#f0b877');
  g.addColorStop(1, '#c98a4a');
  ctx.fillStyle = g;
  ell(ctx, 0, 0, u * 0.95, u * 0.45);
  ctx.fill();
  ctx.fillStyle = '#fff1dc';
  ell(ctx, u * 0.2, u * 0.15, u * 0.45, u * 0.22);
  ctx.fill();
  // 목줄
  ctx.fillStyle = '#e8453a';
  ctx.beginPath();
  ctx.roundRect(u * 0.48, -u * 0.38, u * 0.14, u * 0.62, u * 0.06);
  ctx.fill();
  ctx.fillStyle = '#ffd23a';
  ell(ctx, u * 0.6, u * 0.22, u * 0.08, u * 0.08);
  ctx.fill();
  // 머리
  const hx = u * 0.85, hy = -u * 0.45 + (licking ? Math.sin(t * 0.6) * u * 0.05 : 0);
  ctx.fillStyle = '#f0b877';
  ell(ctx, hx, hy, u * 0.45, u * 0.42);
  ctx.fill();
  ctx.fillStyle = '#9a5a2a';
  ctx.save();
  ctx.translate(hx - u * 0.3, hy - u * 0.15);
  ctx.rotate(0.5 + Math.sin(wag * 0.5) * 0.15);
  ell(ctx, 0, u * 0.2, u * 0.14, u * 0.32);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#fff1dc';
  ell(ctx, hx + u * 0.28, hy + u * 0.12, u * 0.24, u * 0.18);
  ctx.fill();
  ctx.fillStyle = '#2a1810';
  ell(ctx, hx + u * 0.46, hy + u * 0.04, u * 0.08, u * 0.06);
  ctx.fill();
  ell(ctx, hx + u * 0.08, hy - u * 0.12, u * 0.06, licking ? u * 0.02 : u * 0.07);
  ctx.fill();
  if (licking || Math.sin(t * 0.05) > 0.4) {
    ctx.fillStyle = '#ff7c94';
    ell(ctx, hx + u * 0.34 + (licking ? Math.sin(t * 0.8) * u * 0.06 : 0), hy + u * 0.32, u * 0.08, u * 0.14);
    ctx.fill();
  }
  ctx.restore();
}

function drawFloor(ctx: CanvasRenderingContext2D, s: PState, X: Fn, Y: Fn, R: Fn, t: number) {
  const rx = R(CRX * 0.9), ry = rx * KY * 0.9;
  for (const f of s.vFloor) {
    if (f.eaten >= 0) continue;
    ctx.save();
    ctx.translate(X(f.x), Y(f.y));
    ctx.rotate(f.hit ? 0 : f.spin);
    cake(ctx, 0, 0, rx, ry, R(PZ), f.col);
    ctx.restore();
  }
  const dg = s.dog;
  drawDog(ctx, X(dg.x), Y(FLOOR_Y + 0.0), R(0.055), dg.face, t, dg.chew, dg.wag);
}

function drawPanel(ctx: CanvasRenderingContext2D, s: PState, w: number, h: number, X: Fn, Y: Fn, R: Fn, font: (sz: number, w?: number) => void, th: Theme, pre: Prev | null) {
  const L = s.L, W = s.W, d = L.d, t = s.t, y0 = Y(PANEL_Y);
  const g = ctx.createLinearGradient(0, y0, 0, h);
  g.addColorStop(0, '#6b3f27');
  g.addColorStop(1, '#3f2418');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(0, y0, w, h - y0 + 4, [R(0.03), R(0.03), 0, 0]);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,220,170,.25)';
  ctx.fillRect(0, y0, w, 2);
  // 쟁반: 맨 앞 더미 (톡 하면 이게 놓인다) + 그다음
  const tx = X(0.16), ty = Y(PANEL_Y + 0.135);
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ell(ctx, tx + 2, ty + R(0.012), R(0.135), R(0.045));
  ctx.fill();
  ctx.fillStyle = '#c9c9d2';
  ell(ctx, tx, ty + R(0.006), R(0.135), R(0.045));
  ctx.fill();
  ctx.fillStyle = '#eef0f5';
  ell(ctx, tx, ty, R(0.13), R(0.042));
  ctx.fill();
  const front = L.queue[s.qi], next = L.queue[s.qi + 1], left = L.queue.length - s.qi;
  if (front) {
    const bounce = !s.busy && s.phase === 'play' ? Math.abs(Math.sin(t * 0.09)) * R(0.008) : 0;
    const crx = R(0.06), cry = crx * KY * 0.9, cth = R(PZ * 0.95);
    for (let k = 0; k < front.length; k++) cake(ctx, tx - R(0.03), ty - (k + 0.5) * cth - bounce, crx, cry, cth, front[k]);
    cakeFace(ctx, tx - R(0.03), ty - front.length * cth - bounce, crx, cry, s.busy ? 2 : 0, t);
  }
  if (next) {
    const crx = R(0.035), cry = crx * KY * 0.9, cth = R(PZ * 0.6);
    for (let k = 0; k < next.length; k++) cake(ctx, tx + R(0.075), ty - R(0.004) - (k + 0.5) * cth, crx, cry, cth, next[k], 0.85);
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffe9c9';
  font(0.032, 800);
  ctx.fillText(left > 0 ? `남은 반죽 ${left}` : '반죽 끝!', tx, Y(PANEL_Y + 0.207));
  // 별 조건 (쉬운 말)
  const sx = X(0.33), rowY = (k: number) => Y(PANEL_Y + 0.045 + k * 0.052);
  const nst = d.stars.length, starsFor = (k: number) => (nst === 1 ? 3 : nst === 2 && k === 0 ? 2 : 1);
  d.stars.forEach((st, k) => {
    const done = s.phase === 'result' && s.ok;
    const ok = done ? s.starOk[k] : st === 'all' ? false : st === 'nofloor' ? W.lost === 0 : st === 'topple' ? W.tEat : W.maxEats >= 2;
    const bad = (st === 'nofloor' && W.lost > 0) || (s.phase === 'result' && !s.ok);
    const yy = rowY(k), ns = starsFor(k);
    ctx.fillStyle = ok && st !== 'nofloor' ? 'rgba(255,216,74,.22)' : 'rgba(255,255,255,.07)';
    ctx.beginPath();
    ctx.roundRect(sx, yy - R(0.022), X(0.985) - sx, R(0.044), R(0.022));
    ctx.fill();
    ctx.textAlign = 'left';
    font(0.032, 900);
    ctx.fillStyle = bad ? 'rgba(255,255,255,.3)' : '#ffd84a';
    ctx.fillText('★'.repeat(ns), sx + R(0.012), yy + 1);
    const sw = ctx.measureText('★'.repeat(ns)).width;
    font(0.033, 800);
    ctx.fillStyle = bad ? 'rgba(255,240,220,.45)' : '#fff3e0';
    const label = st === 'all' ? `${STAR_WORD.all} (${Math.min(W.fed, L.goal)}/${L.goal})` : STAR_WORD[st];
    ctx.fillText(label, sx + R(0.02) + sw, yy + 1, X(0.93) - sx - sw - R(0.02));
    ctx.textAlign = 'center';
    font(0.034, 900);
    ctx.fillStyle = bad ? '#ff8a7a' : ok ? '#7dff9a' : 'rgba(255,255,255,.35)';
    ctx.fillText(bad ? '✗' : ok ? '✓' : '·', X(0.958), yy + 1);
  });
  // 안내 한 줄
  let hint = d.tip;
  const first = s.stage === 0 && !s.firstTap && s.phase === 'play' && !s.again;
  if (first) hint = '👆 가운데 빈 접시를 톡!';
  else if (pre) {
    hint = pre.top.length ? (pre.fl.length ? `와르르! ${pre.fl.length}장은 바닥으로 — 강아지 차지` : '와르르! 쏟아져서 옆 접시에 합쳐져요') : pre.fed ? `떼면 손님 ${pre.fed}명이 냠!` : pre.xf.length ? '떼면 같은 색이 날아와요' : '떼면 여기에 놓여요';
  } else if (s.down && s.press >= 0 && W.st[s.press].c.length && s.phase === 'play') hint = '빈 접시에 놓아요';
  else if (s.busy) hint = '흔들흔들…';
  else if (s.phase === 'result') hint = s.ok ? (s.won ? '모든 손님이 배불러요!' : '다음 판엔 새것이 나와요') : '누르고 있으면 쓰러질 쪽이 보여요';
  else if (s.stage === 0 && s.taps < 3) hint = '누르고 있으면 날아올 것이 보여요 · 떼면 놓기';
  ctx.textAlign = 'center';
  ctx.fillStyle = first ? '#ffffff' : '#ffe3a8';
  font(first ? 0.042 : 0.036, 900);
  ctx.fillText(hint, w / 2, Y(PANEL_Y + 0.27), w - R(0.05));
  void th;
}

function drawHud(ctx: CanvasRenderingContext2D, s: PState, w: number, X: Fn, Y: Fn, R: Fn, font: (sz: number, w?: number) => void, th: Theme) {
  const d = s.L.d, hb = R(0.068);
  ctx.fillStyle = 'rgba(74,44,34,.92)';
  ctx.fillRect(0, 0, w, hb);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  font(0.042, 900);
  const ttl = `${s.stage + 1}판 · ${d.emoji} ${d.name}`;
  ctx.fillText(ttl, R(0.03), hb * 0.54, w * 0.6);
  ctx.textAlign = 'right';
  font(0.04, 900);
  ctx.fillStyle = '#ffd84a';
  const stt = `★ ${s.stars}`;
  ctx.fillText(stt, w - R(0.03), hb * 0.54);
  ctx.fillStyle = th.hot;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - R(0.06) - ctx.measureText(stt).width, hb * 0.54);
  // 새것 알림
  if (s.news && s.t - s.news.t < NEWS_T) {
    const age = s.t - s.news.t, a = Math.min(1, age / 10, (NEWS_T - age) / 20), drop = Math.max(0, 10 - age) * 2;
    ctx.globalAlpha = a;
    font(0.035, 900);
    ctx.textAlign = 'center';
    const tx = s.news.text, tw2 = Math.min(w - 10, ctx.measureText(tx).width + 24), by2 = Y(0.105) + drop;
    ctx.fillStyle = 'rgba(74,36,20,.94)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw2 / 2, by2 - R(0.025), tw2, R(0.05), R(0.025));
    ctx.fill();
    ctx.strokeStyle = th.accent;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(tx, w / 2, by2 + 1, w - 24);
    ctx.globalAlpha = 1;
  }
  void X;
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

function drawCards(ctx: CanvasRenderingContext2D, s: PState, w: number, X: Fn, Y: Fn, R: Fn, font: (sz: number, w?: number) => void, t: number) {
  const L = s.L, d = L.d, fx = juice(s);
  // 새 장치 스포트라이트: 그 판을 처음 할 때, 시작 카드 뒤 잠깐
  const age = t - s.startT;
  if (s.phase === 'play' && !s.again && d.spot && age > CARD_T && age < CARD_T + 150 && !s.down) {
    let x = -1, y = -1, rr = 0.13;
    if (d.key === 'syrup' || d.key === 'butter') {
      const i = L.P.findIndex((p) => p.kind === (d.key === 'syrup' ? SYRUP : BUTTER));
      if (i >= 0) [x, y] = plateXY(L, s.W, i);
    } else if (d.key === 'order') (x = seatX(s.cust.length, s.W.oi)), (y = SEAT_Y - 0.03), (rr = 0.12);
    else if (d.key === 'tilt') (x = 0.5), (y = CY + TAB_RY + 0.04), (rr = 0.12);
    else if (d.key === 'topple') {
      let bi = -1;
      s.W.st.forEach((st, i) => (bi < 0 || st.c.length > s.W.st[bi].c.length) && (bi = i));
      if (bi >= 0) [x, y] = plateXY(L, s.W, bi), (y -= s.W.st[bi].c.length * PZ * 0.5), (rr = 0.12 + s.W.st[bi].c.length * 0.006);
    }
    if (x >= 0) {
      const a = Math.min(1, (age - CARD_T) / 10, (CARD_T + 150 - age) / 18), cx = X(x), cy = Y(y), r = R(rr) * (1 + 0.05 * Math.sin(age * 0.2));
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(30,12,4,.6)';
      ctx.beginPath();
      ctx.rect(0, R(0.068), w, Y(PANEL_Y) - R(0.068));
      ctx.arc(cx, cy, r, 0, TAU, true);
      ctx.fill('evenodd');
      ctx.strokeStyle = '#fff1a8';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.lineDashOffset = -age;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      font(0.034, 900);
      const label = d.spot, tw = Math.min(w - 8, ctx.measureText(label).width + R(0.05)), ly = y > 0.6 ? cy - r - R(0.06) : cy + r + R(0.06), lx = Math.max(tw / 2 + 4, Math.min(w - tw / 2 - 4, cx));
      ctx.fillStyle = 'rgba(90,40,20,.96)';
      ctx.beginPath();
      ctx.roundRect(lx - tw / 2, ly - R(0.03), tw, R(0.06), R(0.03));
      ctx.fill();
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff6e0';
      ctx.fillText(label, lx, ly + 1, tw - R(0.03));
      font(0.03, 900);
      const nb = 'NEW!', nw2 = ctx.measureText(nb).width + R(0.03);
      ctx.fillStyle = '#ff5a6e';
      ctx.beginPath();
      ctx.roundRect(lx - tw / 2 - R(0.01), ly - R(0.055), nw2, R(0.04), R(0.02));
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText(nb, lx - tw / 2 - R(0.01) + nw2 / 2, ly - R(0.034));
      ctx.restore();
    }
  }
  // 판 카드: 시작 · 결과
  let show = false, a = 1, sc = 1;
  if (s.phase === 'result') (show = true), (a = Math.min(1, s.pt / 10)), (sc = Math.min(1, 0.6 + s.pt / 14));
  else if (age < CARD_T && s.taps === 0 && !s.down) (show = true), (a = Math.min(1, (CARD_T - age) / 20, age / 6 + 0.2)), (sc = Math.min(1, 0.7 + age / 14));
  if (!show) return;
  // 시작 카드는 위쪽에 (첫 판 손가락이 가리키는 가운데 접시가 가려지지 않게), 결과 카드는 식탁 가운데
  const lines = d.stars.length, ch = R(0.2 + lines * 0.05), cy = s.phase === 'result' ? Y(0.6) : Y(0.3) + ch / 2;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(w / 2, cy);
  ctx.scale(sc, sc);
  ctx.fillStyle = s.phase === 'result' && !s.ok ? 'rgba(80,24,20,.93)' : 'rgba(74,36,20,.93)';
  ctx.beginPath();
  ctx.roundRect(-R(0.44), -ch / 2, R(0.88), ch, R(0.04));
  ctx.fill();
  ctx.strokeStyle = s.phase === 'result' && !s.ok ? '#ffb3a8' : '#ffd166';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let y = -ch / 2 + R(0.045);
  if (s.phase === 'result') {
    if (s.ok) {
      ctx.fillStyle = '#fff1a8';
      font(0.05, 900);
      ctx.fillText(s.won ? '모든 손님이 배불러요! 🎉' : '손님 모두 배불러요!', 0, y, R(0.82));
      y += R(0.06);
      for (let k = 0; k < 3; k++) {
        const ag = s.pt - (12 + k * 12);
        if (ag < 0) continue;
        const got = k < s.got, pop = ag < 8 ? 1.9 - 0.9 * (ag / 8) : 1, sx = (k - 1) * R(0.075);
        ctx.save();
        ctx.translate(sx, y);
        ctx.scale(pop, pop);
        star(ctx, 0, 0, R(0.028));
        ctx.fillStyle = got ? '#ffd43b' : 'rgba(255,255,255,.12)';
        ctx.fill();
        ctx.strokeStyle = got ? '#fff3b0' : 'rgba(255,255,255,.45)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
        if (got && (fx.memo['star' + k] ?? -1) < s.t - ag) (fx.memo['star' + k] = s.t - ag), fx.burst(w / 2 + sx, cy + y, '#ffe066', 16, 3, 2.4);
      }
      y += R(0.055);
      d.stars.forEach((st, k) => {
        const got = s.starOk[k];
        ctx.fillStyle = got ? '#bff7c4' : 'rgba(255,240,220,.55)';
        font(0.035, 800);
        ctx.fillText(`${got ? '✓' : '✗'} ${STAR_WORD[st]}`, 0, y, R(0.82));
        y += R(0.045);
      });
    } else {
      ctx.fillStyle = '#ffd0c8';
      font(0.05, 900);
      ctx.fillText(`앗… ${s.why}`, 0, y, R(0.82));
      y += R(0.065);
      ctx.fillStyle = '#fffaf0';
      font(0.037, 800);
      ctx.fillText(s.hearts > 0 ? '하트 −1 · 같은 식탁, 새 반죽으로 다시!' : '끝 — 손님들이 고마워해요!', 0, y, R(0.82));
      y += R(0.05);
      ctx.fillStyle = '#ffe3a8';
      font(0.034, 800);
      ctx.fillText('누르고 있으면 쓰러질 쪽이 보여요', 0, y, R(0.82));
    }
  } else {
    ctx.fillStyle = '#ffffff';
    font(0.05, 900);
    ctx.fillText(`${s.again ? '다시! ' : ''}${s.stage + 1}판 · ${d.emoji} ${d.name}`, 0, y, R(0.82));
    y += R(0.058);
    ctx.fillStyle = '#ffe9c9';
    font(0.038, 800);
    ctx.fillText(`손님 ${L.goal}명에게 같은 색 8장씩!`, 0, y, R(0.82));
    y += R(0.052);
    const nst = d.stars.length;
    d.stars.forEach((st, k) => {
      const ns = nst === 1 ? 3 : nst === 2 && k === 0 ? 2 : 1;
      ctx.fillStyle = '#ffd84a';
      font(0.036, 900);
      ctx.fillText(`${'★'.repeat(ns)} ${STAR_WORD[st]}`, 0, y, R(0.82));
      y += R(0.047);
    });
    if (!s.again && d.news) {
      ctx.fillStyle = '#ffe9a8';
      font(0.034, 900);
      ctx.fillText(d.news, 0, y + R(0.005), R(0.84));
    }
  }
  ctx.restore();
}
