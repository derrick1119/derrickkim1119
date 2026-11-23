/**
 * 🥚 알 깨기 부화 둥지 (44라운드: 작은 손맛 장난감) — 톡 하나 × 연쇄 × 도감.
 * 한 동작: 둥지 가득한 알을 톡 → 찌직, 쩍! 무엇이 나올지 깜짝 → 나온 아기가 저마다 다른 짓으로 옆 알을 깨뜨린다 → 줄줄이 부화.
 *   병아리는 콕콕 쪼고 · 아기 용은 에취! 불 · 아기 고래는 물 뿜기 · 아기 거북은 데굴데굴 볼링 · 아기 공룡은 쿵 · 토끼는 콩콩 · 번개새는 찌릿.
 * 알 무늬가 무엇이 나올지 살짝 알려 준다(점박이 = 새 · 불꽃 = 용 · 물방울 = 물 쪽 …). 같은 무늬에서도 아기는 여럿, 가끔 드문 것(황금 병아리·무지개 용·별 고래).
 * 톡으로 나온 아기는 가장 많이 깰 쪽을 보고, 다른 아기에게 깨어난 아기는 맞은 쪽에서 밀려난 방향으로 — 그래서 '어디를 먼저'가 연쇄를 가른다.
 * 2차(공장): 연쇄(×N)는 꺼지기 전에(사건이 끝나고 1초 안) 또 톡 하면 이어진다 — '언제' 톡 할지가 고민. 다 논 아기는 둥지 밖으로 콩 나가고,
 *   엄마 새가 빈자리에 새 알을 0.3~0.6초마다 톡톡 던져 넣어 둥지는 늘 차 있다(새 알 무늬는 섞여서 좋은 자리가 계속 바뀐다).
 * 둥지 하나 = 톡 8번을 다 쓰고 연쇄가 끝나면 끝. 하트·실패 없음 — 점수·최고 기록·도감. 한 연쇄의 k번째 아기는 k점(10번째부터 가파르게).
 * 별 셋(쉬운 말): 아기 N마리 · 새 친구 만나기 · 한 번에 N마리. 둥지마다 새 알 하나가 풀린다(6가지) — 7번째 둥지가 마지막.
 * 결정적: 난수는 둥지를 만들 때와 엄마가 알을 채울 때만(s.rng, 놀이 틱 안). 깨짐·연쇄는 시간표(사건 줄)로만 흘러서 봇이 그대로 앞질러 셈할 수 있다.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5, TAU = Math.PI * 2;
// ───────────────────────────── 자리 (가로 폭 = 1, 세로 0~1.5) ─────────────────────────────
/** 둥지 바닥(반지름 1인 원) → 화면: x = NX + gx·RX, y = NY + gz·RY */
const NX = 0.5, NY = 0.92, RX = 0.52, RY = 0.39, FLOOR = 0.84;
/** 엄마 새: 왼쪽 위 구석에 작게 (발 자리, 몸 반지름) — 오른쪽(둥지)을 본다 */
const MX = 0.115, MY = 0.335, MU = 0.058;
const TAPS = 8, NESTS = 6;
/** 연쇄가 꺼지기 전 여유(사건이 다 끝나고 1.5초) · 다 논 아기가 둥지를 떠나기까지 · 엄마가 던진 알이 날아오는 틱 */
const GRACE = 90, LEAVE = 150, DROP_T = 18;
const TAP_T = 8, HIT_T = 7, POP_T = 12, END_WAIT = 40, RES_MIN = 30, RES_AUTO = 60 * 45, END_T = 220;
const EGG_H = 2.4, VS = 1.45;
const SHARD_R = 0.16, CONE = 0.34, GAP = 0.03, SMALL_P = [0.8, 0.46, 0.4, 0.38, 0.36, 0.34, 0.32];
const HOLES = [0, 1, 1, 2, 1, 1, 1];
const NEST_N = [22, 24, 26, 27, 28, 29, 30];
const HATCH_GOAL = [20, 26, 30, 32, 34, 36];
const CHAIN_GOAL = [25, 40, 54, 60, 70, 66];
/** 한 연쇄에서 k번째 아기의 점수: k점, 30점까지 (연쇄가 끊기면 다시 1점부터) */
const ptsOf = (k: number) => Math.min(k, 30);

// ───────────────────────────── 알 · 아기 ─────────────────────────────
export type ET = 'spot' | 'flame' | 'drop' | 'stripe' | 'giant' | 'star' | 'zap' | 'rainbow' | 'gold';
const START: ET[] = ['spot', 'flame', 'drop'];
/** 둥지를 깰 때마다 하나씩 풀린다 (1번 둥지 뒤 → 줄무늬 …) */
const UNLOCK: ET[] = ['stripe', 'giant', 'star', 'zap', 'rainbow'];
export const ET_NAME: Record<ET, string> = { spot: '점박이 알', flame: '불꽃 알', drop: '물방울 알', stripe: '줄무늬 알', giant: '왕 알', star: '별무늬 알', zap: '번개 알', rainbow: '무지개 알', gold: '황금 알' };
const ET_LINE: Record<ET, string> = { spot: '콕콕 쪼아요', flame: '에취! 불', drop: '물을 뿜어요', stripe: '데굴데굴 볼링!', giant: '쿵! 둘레를 와르르', star: '콩콩 뛰어 깨요', zap: '찌릿! 멀리 튀어요', rainbow: '무엇이든 나와요', gold: '반짝! 동전 와르르' };
type Fam = 'peck' | 'fire' | 'splash' | 'roll' | 'hop' | 'stomp' | 'zap' | 'gold';
interface Sp { name: string; fam: Fam; n: number; r: number; L: number; w: number; dmg: number; fan: number; rare: boolean }
const sp = (name: string, fam: Fam, o: Partial<Sp> = {}): Sp => ({ name, fam, n: 2, r: 0.36, L: 1, w: 0.12, dmg: 1, fan: 1, rare: false, ...o });
export const SP: Sp[] = [
  sp('병아리', 'peck', { n: 1, r: 0.28 }),
  sp('아기 오리', 'peck', { n: 1, r: 0.4 }),
  sp('아기 부엉이', 'peck', { n: 2, r: 0.28 }),
  sp('아기 용', 'fire', { L: 0.62, w: 0.09 }),
  sp('보라 아기 용', 'fire', { L: 0.85, w: 0.07 }),
  sp('아기 고래', 'splash', { r: 0.26 }),
  sp('아기 물개', 'splash', { r: 0.22 }),
  sp('아기 거북', 'roll', { n: 3, L: 1.2, dmg: 1 }),
  sp('아기 고슴도치', 'roll', { n: 2, L: 0.9, dmg: 2 }),
  sp('아기 공룡', 'stomp', { r: 0.56, dmg: 1 }),
  sp('아기 토끼', 'hop', { n: 2, r: 0.36 }),
  sp('아기 개구리', 'hop', { n: 3, r: 0.3 }),
  sp('아기 번개새', 'zap', { n: 3, r: 0.5 }),
  sp('무지개 용', 'fire', { L: 0.8, w: 0.09, fan: 3, rare: true }),
  sp('별 고래', 'splash', { r: 0.45, rare: true }),
  sp('황금 병아리', 'gold', { r: 0.4, rare: true }),
];
const SPN = SP.length;
const EGG_SP: Record<ET, [number, number][]> = {
  spot: [[0, 55], [1, 30], [2, 15]],
  flame: [[3, 62], [4, 35], [13, 3]],
  drop: [[5, 58], [6, 39], [14, 3]],
  stripe: [[7, 60], [8, 40]],
  giant: [[9, 1]],
  star: [[10, 55], [11, 45]],
  zap: [[12, 1]],
  gold: [[15, 1]],
  rainbow: [],
};
const FAM_ET: Record<Fam, ET> = { peck: 'spot', fire: 'flame', splash: 'drop', roll: 'stripe', stomp: 'giant', hop: 'star', zap: 'zap', gold: 'gold' };

// ───────────────────────────── 상태 ─────────────────────────────
const HATCH = 0, HIT = 1, ACT = 2;
/** st: 0 그대로 · 1 깨지는 중 · 2 아기가 껍데기 안 · 3 아기가 떠나 빈자리 · 4 엄마가 던져 날아오는 중(th = 내려앉는 틱) */
interface Egg { x: number; z: number; r: number; t: ET; sp: number; hp: number; hp0: number; st: number; tc: number; th: number; ch: number; dx: number; dz: number; tap: boolean; h: number; fr: number }
interface QE { t: number; k: number; e: number; d: number; ch: number; fx: number; fz: number }
/** 그림용 아기 기록: path = (x, z, t) 셋씩 — 쪼는 곳·굴러간 길·뛴 곳·번개 */
interface Baby { e: number; sp: number; x: number; z: number; t0: number; ta: number; te: number; dx: number; dz: number; path: number[]; ex: number; ez: number; big: boolean; L: number; r: number; fr: number }
interface Ev { t: number; k: string; x: number; z: number; n: number; m: number }
type Phase = 'play' | 'result' | 'end';

export interface NestState {
  rng: Rng; seed: number; t: number; lt: number; hold: number; pt: number;
  phase: Phase; nest: number; stage: number;
  eggs: Egg[]; q: QE[]; babies: Baby[];
  /** combo: 지금 이어지는 연쇄의 아기 수 · pend: 남은 깨짐 사건 수 · live: 연쇄가 살아 있나 · lastEv: 마지막 깨짐 틱 */
  taps: number; combo: number; comboPts: number; live: boolean; pend: number; lastEv: number; maxChain: number; hatched: number; endT: number;
  free: number[]; dropT: number; newHit: boolean;
  pts: number; nestPts: number; best: number; newBest: boolean; got: number; starOk: boolean[];
  unlocked: ET[]; newT: ET | null; unlockT: ET | null; dex: number[]; nestNew: number[];
  seen: Set<string>; wowN: number; events: Ev[]; sim: boolean; down: boolean; lastTap: number; dead: boolean; firstTap: number; won: boolean;
}

const ev = (s: NestState, k: string, x = 0, z = 0, n = 0, m = 0) => void (s.sim || s.events.push({ t: s.t, k, x, z, n, m }));
const see = (s: NestState, key: string) => void (s.sim || s.seen.add(key));
const hyp = Math.hypot;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
/** 알 가운데(화면, 폭 단위) */
const eggCx = (e: Egg) => NX + e.x * RX;
const eggCy = (e: Egg) => NY + e.z * RY - e.r * RX * VS * EGG_H * 0.5;

function pushQ(q: QE[], e: QE) {
  let lo = 0, hi = q.length;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (q[m].t <= e.t) lo = m + 1;
    else hi = m;
  }
  q.splice(lo, 0, e);
}

function pickW(r: Rng, w: [number, number][]): number {
  let tot = 0;
  for (const [, x] of w) tot += x;
  let v = r() * tot;
  for (const [k, x] of w) if ((v -= x) < 0) return k;
  return w[w.length - 1][0];
}

/** 무늬에서 나올 아기 (무지개 알 = 풀린 것 무엇이든, 드문 것 35%) */
function pickSp(s: NestState, t: ET): number {
  const r = s.rng;
  if (t !== 'rainbow') return pickW(r, EGG_SP[t]);
  if (r() < 0.35) return 13 + Math.floor(r() * 3);
  const pool: number[] = [];
  for (let i = 0; i < SPN; i++) if (!SP[i].rare && s.unlocked.includes(FAM_ET[SP[i].fam])) pool.push(i);
  return pool[Math.floor(r() * pool.length)];
}

// ───────────────────────────── 둥지 만들기 ─────────────────────────────
function newNest(s: NestState) {
  const r = s.rng, n = s.nest, N = NEST_N[n];
  s.eggs = [];
  s.q = [];
  s.babies = [];
  s.taps = TAPS;
  s.combo = 0;
  s.comboPts = 0;
  s.live = false;
  s.pend = 0;
  s.lastEv = -999;
  s.free = [];
  s.dropT = 0;
  s.newHit = false;
  s.maxChain = 0;
  s.hatched = 0;
  s.endT = -1;
  s.nestPts = 0;
  s.nestNew = [];
  s.lt = 0;
  s.pt = 0;
  s.hold = 0;
  s.phase = 'play';
  s.lastTap = -999;
  s.unlockT = null;
  s.stage = n;
  s.newT = n > 0 ? UNLOCK[n - 1] : null;
  // 종류: 특별한 알 몇 개 + 이번에 풀린 알은 넉넉히(스포트라이트) + 나머지는 기본 알
  const types: ET[] = [];
  const add = (t: ET, k: number) => {
    if (s.unlocked.includes(t)) for (let i = 0; i < k; i++) types.push(t);
  };
  add('giant', 1);
  add('gold', 1);
  add('rainbow', s.newT === 'rainbow' ? 3 : 2);
  add('zap', s.newT === 'zap' ? 3 : 2);
  if (s.newT === 'stripe' || s.newT === 'star') add(s.newT, 4);
  const basic = s.unlocked.filter((t) => t === 'spot' || t === 'flame' || t === 'drop' || t === 'stripe' || t === 'star');
  const wt: Record<string, number> = { spot: 4, flame: 2.4, drop: 2.4, stripe: 2, star: 2 };
  const bw = basic.map((t, i) => [i, wt[t]] as [number, number]);
  while (types.length < N) types.push(basic[pickW(r, bw)]);
  // 자리: 둥지를 빽빽이(지푸라기 빈터 한두 군데). 작은 알은 한 번, 보통·큰 알은 두 번 맞아야 깨진다(톡은 언제나 한 번에)
  const holes: [number, number, number][] = [];
  for (let k = 0; k < HOLES[n]; k++) {
    const a = Math.PI + r() * Math.PI, d = 0.3 + r() * 0.4;
    holes.push([Math.cos(a) * d, Math.sin(a) * d, 0.15 + r() * 0.1]);
  }
  const order = types.map((t, i) => [t === 'giant' ? 0 : 1, i] as [number, number]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  for (const [, ti] of order) {
    const t = types[ti];
    const roll = r();
    const rr = t === 'giant' ? 0.16 : t === 'gold' ? 0.1 : roll < SMALL_P[n] ? 0.085 : roll < 0.8 + SMALL_P[n] * 0.25 ? 0.1 : 0.115;
    const hp = t === 'giant' ? 2 : rr > 0.09 && t !== 'gold' ? 2 : 1;
    for (let tr = 0; tr < 500; tr++) {
      const a = r() * TAU, d = Math.sqrt(r()) * (FLOOR - rr), x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (tr < 300 && holes.some(([hx, hz, hr]) => hyp(hx - x, hz - z) < hr + rr)) continue;
      if (s.eggs.some((o) => hyp(o.x - x, o.z - z) < o.r + rr + GAP)) continue;
      const spi = pickSp(s, t);
      s.eggs.push({ x, z, r: rr, t, sp: spi, hp, hp0: hp, st: 0, tc: -99, th: 0, ch: 0, dx: 0, dz: 0, tap: false, h: r(), fr: 1e9 });
      break;
    }
  }
  for (const e of s.eggs) see(s, 'et:' + e.t);
  ev(s, 'nest', 0, 0, n);
}

// ───────────────────────────── 깨기 · 연쇄 ─────────────────────────────
/** 연쇄가 살아 있나: 남은 깨짐이 있거나, 끝난 지 1.5초가 안 됐다 */
const alive = (s: NestState) => s.pend > 0 || (s.live && s.lt - s.lastEv <= GRACE);
function sched(s: NestState, q: QE) {
  s.pend++;
  pushQ(s.q, q);
}
function tapEgg(s: NestState, i: number) {
  const e = s.eggs[i];
  if (!alive(s)) (s.combo = 0), (s.comboPts = 0);
  s.live = true;
  e.st = 1;
  e.tap = true;
  e.th = s.lt + TAP_T;
  sched(s, { t: s.lt + TAP_T, k: HATCH, e: i, d: 0, ch: 0, fx: e.x, fz: e.z });
  s.taps--;
  s.lastTap = s.lt;
  s.hold = 2;
  if (s.firstTap < 0) s.firstTap = s.t;
  ev(s, 'tap', e.x, e.z, i);
}

function proc(s: NestState, q: QE) {
  const e = s.eggs[q.e];
  if (q.k === ACT) return ev(s, 'act', e.x, e.z, q.d, e.sp);
  s.pend--;
  s.lastEv = s.lt;
  if (q.k === HATCH) return hatch(s, q.e);
  if (e.st !== 0) return;
  e.hp -= q.d;
  const dx = e.x - q.fx, dz = e.z - q.fz, l = hyp(dx, dz) || 1;
  if (e.hp <= 0) {
    e.st = 1;
    e.th = s.lt + HIT_T;
    e.dx = dx / l;
    e.dz = dz / l;
    sched(s, { t: e.th, k: HATCH, e: q.e, d: 0, ch: 0, fx: q.fx, fz: q.fz });
    ev(s, 'crack', e.x, e.z, 2, q.e);
  } else {
    e.tc = s.lt;
    ev(s, 'crack', e.x, e.z, 1, q.e);
  }
}

function hatch(s: NestState, i: number) {
  const e = s.eggs[i], d = SP[e.sp];
  e.st = 2;
  e.th = s.lt;
  const k = ++s.combo, pk = ptsOf(k) + (d.fam === 'gold' ? 20 : 0);
  s.hatched++;
  s.pts += pk;
  s.nestPts += pk;
  s.comboPts += pk;
  if (k > s.maxChain) s.maxChain = k;
  if (e.t === s.newT) s.newHit = true;
  if (e.tap) {
    // 톡으로 깬 알: 껍데기 조각이 튀어 바로 옆 알에 금을 낸다 (첫 1초가 시원하게)
    for (let j = 0; j < s.eggs.length; j++) {
      const o = s.eggs[j], q = hyp(o.x - e.x, o.z - e.z);
      if (j !== i && o.st === 0 && q < SHARD_R + o.r) sched(s, { t: s.lt + 3 + Math.round(q * 10), k: HIT, e: j, d: 1, ch: 0, fx: e.x, fz: e.z });
    }
  }
  if (!s.sim) {
    if (e.tap) s.hold = 3;
    ev(s, 'hatch', e.x, e.z, k, e.sp);
    if (!s.dex[e.sp]) {
      s.dex[e.sp] = 1;
      s.nestNew.push(e.sp);
      s.wowN++;
      see(s, 'sp:' + e.sp);
      ev(s, 'new', e.x, e.z, k, e.sp);
    } else if (d.rare) (s.wowN++), ev(s, 'rare', e.x, e.z, k, e.sp);
    if (k % 6 === 0) (s.wowN++), ev(s, 'combo', e.x, e.z, k);
  }
  act(s, i);
}

/** 불: 곧은 띠 (fan > 1 이면 부채꼴 셋) — 각 알이 처음 닿는 틱 */
function fireHits(s: NestState, i: number, a: number, d: Sp, ta: number, out: number[] | null): number {
  const e = s.eggs[i], dirs = d.fan > 1 ? [a - 0.55, a, a + 0.55] : [a];
  let n = 0;
  for (let j = 0; j < s.eggs.length; j++) {
    const o = s.eggs[j];
    if (j === i || o.st !== 0) continue;
    const rx = o.x - e.x, rz = o.z - e.z;
    let best = Infinity;
    for (const b of dirs) {
      const cx = Math.cos(b), cz = Math.sin(b), al = rx * cx + rz * cz, pe = Math.abs(rx * cz - rz * cx);
      if (al > 0 && al < d.L && pe < d.w + o.r * 0.7) best = Math.min(best, al);
    }
    if (best < Infinity) (n++), out && out.push(j, ta + Math.round(best * 9), e.x, e.z);
  }
  return n;
}
/** 데굴데굴: 둥지 벽에 한 번까지 튕기는 길 (x, z, 누적 길이) */
function rollPath(x: number, z: number, dx: number, dz: number, L: number): number[] {
  const pts = [x, z, 0];
  let left = L, acc = 0;
  for (let b = 0; b < 3 && left > 1e-6; b++) {
    // |p + d·t| = W 풀기
    const W = FLOOR + 0.04, pd = x * dx + z * dz, pp = x * x + z * z - W * W;
    const tt = -pd + Math.sqrt(Math.max(0, pd * pd - pp));
    const step = Math.min(left, Math.max(0.02, tt));
    x += dx * step;
    z += dz * step;
    acc += step;
    left -= step;
    pts.push(x, z, acc);
    if (left > 1e-6) {
      const l = hyp(x, z) || 1, nx = x / l, nz = z / l, dot = dx * nx + dz * nz;
      dx -= 2 * dot * nx;
      dz -= 2 * dot * nz;
      x -= nx * 0.02;
      z -= nz * 0.02;
    }
  }
  return pts;
}
const ROLL_V = 0.055;
function cutPath(p: number[], L: number): number[] {
  const out = [p[0], p[1], 0];
  for (let k = 3; k < p.length; k += 3) {
    if (p[k + 2] <= L) out.push(p[k], p[k + 1], p[k + 2]);
    else {
      const u = (L - p[k - 1]) / Math.max(1e-9, p[k + 2] - p[k - 1]);
      out.push(p[k - 3] + (p[k] - p[k - 3]) * u, p[k - 2] + (p[k + 1] - p[k - 2]) * u, L);
      break;
    }
  }
  return out;
}
function rollHits(s: NestState, i: number, path: number[], ta: number, out: number[] | null): number {
  let n = 0;
  for (let j = 0; j < s.eggs.length; j++) {
    const o = s.eggs[j];
    if (j === i || o.st !== 0) continue;
    let best = Infinity, bx = 0, bz = 0;
    for (let k = 0; k + 3 < path.length; k += 3) {
      const x0 = path[k], z0 = path[k + 1], x1 = path[k + 3], z1 = path[k + 4], sx = x1 - x0, sz = z1 - z0, ll = sx * sx + sz * sz || 1e-9;
      const u = clamp(((o.x - x0) * sx + (o.z - z0) * sz) / ll, 0, 1), px = x0 + sx * u, pz = z0 + sz * u;
      if (hyp(o.x - px, o.z - pz) < 0.085 + o.r) {
        const at = path[k + 2] + Math.sqrt(ll) * u;
        if (at < best) (best = at), (bx = px - sx / Math.sqrt(ll) * 0.15), (bz = pz - sz / Math.sqrt(ll) * 0.15);
      }
    }
    if (best < Infinity) (n++), out && out.push(j, ta + Math.round(best / ROLL_V), bx, bz);
  }
  return n;
}
/** 톡으로 나온 불·굴림 아기는 가장 많이 깰 쪽을 본다 (가운데 쪽부터 살핀다) */
function aim(s: NestState, i: number, d: Sp): number {
  const e = s.eggs[i], base = Math.atan2(-e.z, -e.x);
  let best = base, bn = -1;
  for (let j = 0; j < 24; j++) {
    const a = base + (j % 2 ? 1 : -1) * Math.ceil(j / 2) * (TAU / 24);
    const n = d.fam === 'fire' ? fireHits(s, i, a, d, 0, null) : rollHits(s, i, rollPath(e.x, e.z, Math.cos(a), Math.sin(a), d.L), 0, null);
    if (n > bn) (bn = n), (best = a);
  }
  return best;
}

function act(s: NestState, i: number) {
  const e = s.eggs[i], d = SP[e.sp], t0 = s.lt + POP_T;
  let dx = e.dx, dz = e.dz;
  if (e.tap || (dx === 0 && dz === 0)) {
    const l = hyp(e.x, e.z);
    (dx = l > 0.05 ? -e.x / l : 0), (dz = l > 0.05 ? -e.z / l : 1);
  }
  if (e.tap && (d.fam === 'fire' || d.fam === 'roll')) {
    const a = aim(s, i, d);
    (dx = Math.cos(a)), (dz = Math.sin(a));
  }
  const hits: number[] = [], path: number[] = [];
  let ta = t0, te = t0 + 20, ex = e.x, ez = e.z;
  /** 가장 가까운 알 — 다른 아기에게 깨어난 아기는 밀려난 쪽(앞 부채꼴)만 본다 */
  const near = (x: number, z: number, R: number, skip: Set<number>, fx: number, fz: number, cone: boolean) => {
    let bj = -1, bd = Infinity;
    for (let j = 0; j < s.eggs.length; j++) {
      const o = s.eggs[j];
      if (j === i || o.st !== 0 || skip.has(j)) continue;
      const q = hyp(o.x - x, o.z - z);
      if (cone && ((o.x - x) * fx + (o.z - z) * fz) < CONE * q) continue;
      if (q < R + o.r && q < bd) (bd = q), (bj = j);
    }
    return bj;
  };
  switch (d.fam) {
    case 'peck': {
      ta = t0 + 6;
      const used = new Set<number>();
      for (let k = 0; k < d.n; k++) {
        const j = near(e.x, e.z, d.r, used, dx, dz, !e.tap);
        if (j < 0) break;
        used.add(j);
        const t = ta + 4 + 8 * k;
        hits.push(j, t, e.x, e.z);
        path.push(s.eggs[j].x, s.eggs[j].z, t);
      }
      te = ta + 8 * Math.max(1, used.size) + 8;
      break;
    }
    case 'fire': {
      ta = t0 + 18;
      fireHits(s, i, Math.atan2(dz, dx), d, ta, hits);
      te = ta + Math.round(d.L * 9) + 16;
      break;
    }
    case 'splash': {
      ta = t0 + 12;
      for (let j = 0; j < s.eggs.length; j++) {
        const o = s.eggs[j], q = hyp(o.x - e.x, o.z - e.z);
        if (j !== i && o.st === 0 && q < d.r + o.r * 0.5) hits.push(j, ta + 10 + Math.round(q * 10), e.x, e.z);
      }
      te = ta + 28;
      break;
    }
    case 'roll': {
      ta = t0 + 10;
      let p = rollPath(e.x, e.z, dx, dz, d.L);
      rollHits(s, i, p, ta, hits);
      if (hits.length > d.n * 4) {
        // 데굴데굴 n개까지 — n번째에 쿵 멈춘다
        const ord = [...Array(hits.length / 4).keys()].sort((a, b) => hits[a * 4 + 1] - hits[b * 4 + 1]).slice(0, d.n);
        const keep = ord.flatMap((k) => hits.slice(k * 4, k * 4 + 4));
        hits.length = 0;
        hits.push(...keep);
        p = cutPath(p, (keep[keep.length - 3] - ta) * ROLL_V + 0.04);
      }
      for (let k = 0; k < p.length; k += 3) path.push(p[k], p[k + 1], ta + Math.round(p[k + 2] / ROLL_V));
      (ex = p[p.length - 3]), (ez = p[p.length - 2]);
      te = path[path.length - 1] + 14;
      break;
    }
    case 'hop': {
      ta = t0 + 6;
      const used = new Set<number>();
      let cx = e.x, cz = e.z, fx = dx, fz = dz;
      for (let k = 0; k < d.n; k++) {
        const j = near(cx, cz, d.r, used, fx, fz, !e.tap || k > 0);
        if (j < 0) break;
        used.add(j);
        const t = ta + 15 * (k + 1), o = s.eggs[j], l = hyp(o.x - cx, o.z - cz) || 1;
        hits.push(j, t, cx, cz);
        path.push(o.x, o.z, t);
        (fx = (o.x - cx) / l), (fz = (o.z - cz) / l), (cx = o.x), (cz = o.z);
      }
      (ex = cx), (ez = cz);
      te = ta + 15 * Math.max(1, used.size) + 10;
      break;
    }
    case 'stomp': {
      // 왕 알: 톡으로 깨우면 졸려서 작게 쿵, 연쇄로 깨우면 신나서 크게 쿵쿵 (두 번 맞은 셈)
      ta = t0 + 26;
      const R = e.tap ? d.r * 0.62 : d.r;
      for (let j = 0; j < s.eggs.length; j++) {
        const o = s.eggs[j], q = hyp(o.x - e.x, o.z - e.z);
        if (j !== i && o.st === 0 && q < R + o.r) hits.push(j, ta + 2 + Math.round(q * 7), e.x, e.z);
      }
      te = ta + 24;
      break;
    }
    case 'zap': {
      ta = t0 + 12;
      const used = new Set<number>();
      let cx = e.x, cz = e.z;
      for (let k = 0; k < d.n; k++) {
        const j = near(cx, cz, d.r, used, 0, 0, false);
        if (j < 0) break;
        used.add(j);
        const t = ta + 5 * (k + 1), o = s.eggs[j];
        hits.push(j, t, cx, cz);
        path.push(o.x, o.z, t);
        (cx = o.x), (cz = o.z);
      }
      te = ta + 5 * Math.max(1, used.size) + 14;
      break;
    }
    case 'gold': {
      ta = t0 + 14;
      for (let j = 0; j < s.eggs.length; j++) {
        const o = s.eggs[j], q = hyp(o.x - e.x, o.z - e.z);
        if (j !== i && o.st === 0 && q < d.r + o.r * 0.5) hits.push(j, ta + 6 + Math.round(q * 10), e.x, e.z);
      }
      te = ta + 26;
      break;
    }
  }
  const dmg = d.fam === 'hop' || (d.fam === 'stomp' && !e.tap) ? 2 : d.dmg;
  for (let k = 0; k < hits.length; k += 4) sched(s, { t: hits[k + 1], k: HIT, e: hits[k], d: dmg, ch: 0, fx: hits[k + 2], fz: hits[k + 3] });
  e.fr = te + LEAVE;
  if (s.sim) return;
  pushQ(s.q, { t: ta, k: ACT, e: i, d: 0, ch: 0, fx: 0, fz: 0 });
  s.babies.push({ e: i, sp: e.sp, x: e.x, z: e.z, t0: s.lt, ta, te, dx, dz, path, ex, ez, big: e.t === 'giant', L: d.L, r: e.r, fr: e.fr });
}

function run(s: NestState) {
  while (s.q.length && s.q[0].t <= s.lt) proc(s, s.q.shift()!);
}
/** T틱까지만 (첫 톡 손가락: 1초 안에 가장 크게 터질 알) */
function ffUntil(s: NestState, T: number) {
  while (s.q.length && s.q[0].t <= T) {
    const q = s.q.shift()!;
    if (q.t > s.lt) s.lt = q.t;
    proc(s, q);
  }
}
/** 남은 사건을 끝까지 (봇의 앞질러 셈) */
function ff(s: NestState) {
  while (s.q.length) {
    const q = s.q.shift()!;
    if (q.t > s.lt) s.lt = q.t;
    proc(s, q);
  }
}

/** 다 논 아기는 둥지 밖으로 콩 — 빈자리에 엄마 새가 새 알을 톡 던져 넣는다 (놀이 틱에서만, 봇의 앞질러 셈에는 없음) */
function refill(s: NestState) {
  for (let i = 0; i < s.eggs.length; i++) {
    const e = s.eggs[i];
    if (e.st === 2 && s.lt >= e.fr) (e.st = 3), (e.th = s.lt), s.free.push(i);
    else if (e.st === 4 && s.lt >= e.th) (e.st = 0), ev(s, 'land', e.x, e.z, i);
  }
  if (!s.free.length || s.lt < s.dropT || s.taps <= 0) return;
  const r = s.rng, o = s.eggs[s.free.shift()!];
  const pool: [ET, number][] = [['spot', 4], ['flame', 2.4], ['drop', 2.4], ['stripe', 2], ['star', 2], ['zap', 0.8], ['rainbow', 0.6], ['gold', 0.3]];
  // 황금 알은 5번째 둥지부터 엄마가 가끔 던져 주는 깜짝 선물
  const ok = pool.filter(([t]) => s.unlocked.includes(t) || (t === 'gold' && s.nest >= 4));
  if (s.newT && s.newT !== 'giant') ok.push([s.newT, 1.5]);
  let t = o.r >= 0.15 && s.unlocked.includes('giant') && r() < 0.5 ? 'giant' : ok[pickW(r, ok.map(([, w], k) => [k, w] as [number, number]))][0];
  if (t === 'giant' && o.r < 0.15) t = 'spot';
  const rr = t === 'giant' ? 0.16 : o.r >= 0.15 ? 0.115 : o.r, hp = t === 'giant' ? 2 : rr > 0.09 && t !== 'gold' ? 2 : 1;
  s.eggs.push({ x: o.x, z: o.z, r: rr, t, sp: pickSp(s, t), hp, hp0: hp, st: 4, tc: -99, th: s.lt + DROP_T, ch: 0, dx: 0, dz: 0, tap: false, h: r(), fr: 1e9 });
  s.dropT = s.lt + (s.free.length > 4 ? 10 + Math.floor(r() * 6) : 18 + Math.floor(r() * 18));
  see(s, 'et:' + t);
  ev(s, 'drop', o.x, o.z, s.eggs.length - 1);
}
function finishNest(s: NestState) {
  s.starOk = [s.hatched >= HATCH_GOAL[s.nest], s.nestNew.length > 0 || s.newHit, s.maxChain >= CHAIN_GOAL[s.nest]];
  s.got = s.starOk.filter(Boolean).length;
  s.pt = 0;
  s.phase = 'result';
  s.newBest = s.nestPts > s.best;
  s.best = Math.max(s.best, s.nestPts);
  if (s.nest < UNLOCK.length) {
    s.unlockT = UNLOCK[s.nest];
    s.unlocked.push(s.unlockT);
    see(s, 'unlock:' + s.unlockT);
  }
  ev(s, 'result', 0, 0, s.got);
}
function nextNest(s: NestState) {
  if (s.nest + 1 >= NESTS) return ((s.phase = 'end'), (s.pt = 0), ev(s, 'final', 0, 0, 1));
  s.nest++;
  newNest(s);
}

function onTap(s: NestState, px: number, py: number) {
  if (hyp(px - (MX + 0.01), py - (MY - MU * 1.05)) < MU * 1.5) return ev(s, 'mom', MX, MY);
  let bi = -1, bd = Infinity;
  for (let i = 0; i < s.eggs.length; i++) {
    const e = s.eggs[i];
    if (e.st !== 0) continue;
    const q = hyp(px - eggCx(e), (py - eggCy(e)) * 0.85);
    if (q < Math.max(0.085, e.r * RX * VS * 1.6) && q < bd) (bd = q), (bi = i);
  }
  if (bi >= 0) return s.taps > 0 ? tapEgg(s, bi) : ev(s, 'empty', s.eggs[bi].x, s.eggs[bi].z);
  for (let k = s.babies.length - 1; k >= 0; k--) {
    const b = s.babies[k], e = s.eggs[b.e];
    if (e.st === 2 && s.lt > b.te + 6 && hyp(px - eggCx(e), (py - eggCy(e)) * 0.85) < 0.07) return ev(s, 'baby', b.x, b.z, k);
  }
  ev(s, 'straw', (px - NX) / RX, (py - NY) / RY);
}

// ───────────────────────────── 게임 ─────────────────────────────
const game: GameDef<NestState> & { wows(s: NestState): number } = {
  id: 'eggnest',
  name: '🥚 알 깨기 부화 둥지',
  genes: ['eggnest', 'chain', 'collect'],
  twist: '알을 톡 하면 무엇이 나올지 깜짝 — 나온 아기가 저마다 다른 짓(콕콕·에취 불·물 뿜기·데굴 볼링·쿵)으로 옆 알을 깨서 둥지가 줄줄이 부화한다. 연쇄가 꺼지기 전에 엄마가 새로 채운 알을 또 톡 하면 ×N이 이어진다',
  rules: [
    '알을 톡 — 쩍! 나온 아기가 저마다 다른 짓으로 옆 알을 깨요.',
    '연쇄가 꺼지기 전에 또 톡 하면 ×N이 이어져요. 빈자리는 엄마 새가 채워요.',
    '톡은 둥지마다 8번. 무늬가 힌트, 큰 알은 두 번 맞아야 깨져요.',
  ],
  controls: 'touch',
  hint: '알을 톡 — 쩍! 줄줄이 부화 / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '햇살 드는 나무 위 커다란 둥지 — 알 서른 개가 들썩들썩, 쩍 깨면 아기들이 줄줄이',
    mood: '아침 햇살이 잎 사이로 쏟아지는 나무 위. 지푸라기 둥지에 무늬 알이 빽빽하고, 통통한 엄마 새가 가지에서 지켜본다. 쩍! 하면 병아리·아기 용·아기 고래가 뿅 나와 콕콕·에취·촤악 — 옆 알이 줄줄이 깨지고 아기들은 둥지 테두리에 줄지어 앉아 환호.',
    palette: { bg: '#fff3d6', ink: '#5a3418', muted: '#a8875f', accent: '#ffc531', hot: '#ff6b4a', soft: '#ffe9bf' },
  },
  reveals: (s) => s.seen.size,
  cleared: (s) => (s.phase === 'result' ? { stage: s.nest, got: s.got, of: 3 } : null),
  wows: (s) => s.wowN,
  create(seed) {
    const s: NestState = {
      rng: mulberry32(seed), seed, t: 0, lt: 0, hold: 0, pt: 0, phase: 'play', nest: 0, stage: 0,
      eggs: [], q: [], babies: [], taps: TAPS, combo: 0, comboPts: 0, live: false, pend: 0, lastEv: -999, maxChain: 0, hatched: 0, endT: -1,
      free: [], dropT: 0, newHit: false,
      pts: 0, nestPts: 0, best: 0, newBest: false, got: 0, starOk: [false, false, false],
      unlocked: [...START], newT: null, unlockT: null, dex: new Array(SPN).fill(0), nestNew: [],
      seen: new Set<string>(), wowN: 0, events: [], sim: false, down: false, lastTap: -999, dead: false, firstTap: -1, won: false,
    };
    newNest(s);
    return s;
  },
  step(s, inp: Input) {
    if (s.dead) return;
    s.t++;
    s.pt++;
    const p = inp.pointer ?? null, tap = !!p && !s.down;
    s.down = !!p;
    if (s.phase === 'play') {
      if (tap && p) onTap(s, p.x, p.y * A);
      if (s.hold > 0) s.hold--;
      else {
        s.lt++;
        run(s);
        refill(s);
      }
      // 연쇄가 꺼짐: 남은 깨짐이 없고 1.5초가 지났다 (톡이 없으면 바로)
      if (s.live && s.pend === 0 && (s.taps <= 0 || s.lt - s.lastEv > GRACE)) {
        s.live = false;
        if (s.combo >= 10) s.wowN++;
        ev(s, 'chainEnd', 0, 0, s.combo, s.comboPts);
      }
      if (s.taps <= 0 && !s.live && s.pend === 0) {
        if (s.endT < 0) (s.endT = s.lt), ev(s, 'out');
        else if (s.lt - s.endT >= END_WAIT) finishNest(s);
      }
    } else {
      s.lt++;
      if (s.phase === 'end') {
        if ((tap && s.pt >= 70) || s.pt >= END_T) s.dead = true;
      } else if ((tap && s.pt >= RES_MIN) || s.pt >= RES_AUTO) nextNest(s);
    }
    if (s.events.length > 120) s.events.splice(0, s.events.length - 120);
    while (s.events.length && s.t - s.events[0].t > 200) s.events.shift();
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};
export const eggnest = game;

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
const at = (x: number, y: number): Input => ({ tap: false, dir: 0, pointer: { x, y: y / A } });
const eggAt = (e: Egg) => at(eggCx(e), eggCy(e));
function clone(s: NestState): NestState {
  return { ...s, sim: true, eggs: s.eggs.map((e) => ({ ...e })), q: s.q.slice(), free: [], babies: [], events: [] };
}
/** 알마다 '지금 톡 하면 연쇄가 끝날 때까지 몇 점 더'를 똑같은 사건 줄로 앞질러 셈한다 — 좋은 넷은 그다음 톡까지 한 수 더 */
function oneStep(s: NestState): { i: number; v: number; c: NestState }[] {
  const base = clone(s);
  ff(base);
  const p0 = base.pts, h0 = base.hatched, out: { i: number; v: number; c: NestState }[] = [];
  for (let i = 0; i < s.eggs.length; i++) {
    if (s.eggs[i].st !== 0 || base.eggs[i].st !== 0) continue;
    const c = clone(s);
    tapEgg(c, i);
    ff(c);
    out.push({ i, v: c.pts - p0 + 0.6 * (c.hatched - h0) + s.eggs[i].h * 1e-3, c });
  }
  return out.sort((a, b) => b.v - a.v);
}
export function bestTap(s: NestState): number {
  const top = oneStep(s);
  if (!top.length) return -1;
  let bi = top[0].i, bv = -Infinity;
  for (const o of top.slice(0, 4)) {
    let v = o.v;
    if (o.c.taps > 0) {
      const nx = oneStep(o.c);
      v += nx.length ? nx[0].v * 0.8 : 0;
    }
    if (v > bv) (bv = v), (bi = o.i);
  }
  return bi;
}
/** 첫 톡 손가락: 1.2초 안에 가장 많이 깨어나는 알 (같으면 끝까지 더 길게) */
export function firstTap(s: NestState): number {
  let bi = -1, bv = -Infinity;
  for (let i = 0; i < s.eggs.length; i++) {
    if (s.eggs[i].st !== 0) continue;
    const c = clone(s);
    tapEgg(c, i);
    ffUntil(c, s.lt + 72);
    const early = c.hatched;
    ff(c);
    const v = early * 3 + c.hatched;
    if (v > bv) (bv = v), (bi = i);
  }
  return bi;
}
/** 결과·실패 카드는 잠깐 보고 톡 */
function between(s: NestState): Input | null {
  if (s.phase === 'play') return null;
  return !s.down && s.pt >= RES_MIN + 6 + (s.phase === 'end' ? 50 : 0) ? at(0.5, 0.9) : NO;
}
/** 봇: 연쇄가 꺼지기 직전에(엄마가 채운 알까지 보고) 가장 크게 이어질 알을 셈해 톡 */
export const eggnestSmart: Bot<NestState> = {
  name: '연쇄를 앞질러 셈해 꺼지기 전에 이어 붙이기',
  act(s) {
    const mid = between(s);
    if (mid) return mid;
    if (s.down || s.taps <= 0) return NO;
    if (alive(s) ? s.pend > 0 || s.lt - s.lastEv < 10 : s.free.length > 3 && s.lt - s.lastTap < 90) return NO;
    const i = bestTap(s);
    return i < 0 ? NO : eggAt(s.eggs[i]);
  },
};
/** 봇: 아무 때나(평균 0.7초) 둥지 아무 곳이나 톡 (처음 하는 사람) */
export const eggnestRandom: Bot<NestState> = {
  name: '아무 때나 아무 데나 톡',
  act(s, rng) {
    if (s.down || rng() >= 1 / 40) return NO;
    if (s.phase !== 'play') return at(0.1 + rng() * 0.8, 0.3 + rng() * 1.0);
    return at(0.08 + rng() * 0.84, 0.6 + rng() * 0.64);
  },
};
const idle = (s: NestState) => !s.down && s.taps > 0 && s.pend === 0;
/** 버릇 봇: 깨짐이 멎으면 곧바로 늘 가장 큰 알 */
export const eggnestHabit: Bot<NestState> = {
  name: '버릇: 늘 가장 큰 알',
  act(s) {
    const mid = between(s);
    if (mid) return mid;
    if (!idle(s)) return NO;
    let bi = -1;
    for (let i = 0; i < s.eggs.length; i++) if (s.eggs[i].st === 0 && (bi < 0 || s.eggs[i].r > s.eggs[bi].r)) bi = i;
    return bi < 0 ? NO : eggAt(s.eggs[bi]);
  },
};
/** 독립 버릇 봇: 깨짐이 멎으면 곧바로 늘 둥지 한가운데에 가장 가까운 알 */
export const eggnestHabit2: Bot<NestState> = {
  name: '버릇: 늘 가운데 알',
  act(s) {
    const mid = between(s);
    if (mid) return mid;
    if (!idle(s)) return NO;
    let bi = -1, bd = Infinity;
    for (let i = 0; i < s.eggs.length; i++) {
      const e = s.eggs[i], q = hyp(e.x, e.z);
      if (e.st === 0 && q < bd) (bd = q), (bi = i);
    }
    return bi < 0 ? NO : eggAt(s.eggs[bi]);
  },
};
/** 측정·스크린샷용: k번째 둥지로 건너뛰기 (그 앞에 풀렸을 알은 다 풀어 둔다) */
export const __jump = (s: NestState, k: number) => {
  s.nest = k;
  s.unlocked = [...START, ...UNLOCK.slice(0, k)];
  newNest(s);
};

// ───────────────────────────── 그리기: 도구 ─────────────────────────────
type C2 = CanvasRenderingContext2D;
const OUT = '#5a3418', LW = 0.1;
const hsh = (k: number) => {
  const v = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
function ell(g: C2, x: number, y: number, rx: number, ry: number, rot = 0) {
  g.beginPath();
  g.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU);
}
function lin(g: C2, x0: number, y0: number, x1: number, y1: number, ...st: [number, string][]) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of st) gr.addColorStop(o, c);
  return gr;
}
function radg(g: C2, x: number, y: number, r0: number, r1: number, ...st: [number, string][]) {
  const gr = g.createRadialGradient(x, y, Math.max(0, r0), x, y, Math.max(0.01, r1));
  for (const [o, c] of st) gr.addColorStop(o, c);
  return gr;
}
function rr(g: C2, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.roundRect(x, y, w, h, Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2)));
}
function starPath(g: C2, x: number, y: number, r: number, k = 0.47, rot = -Math.PI / 2, n = 5) {
  g.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i * Math.PI) / n, q = i % 2 ? r * k : r;
    if (i) g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
    else g.moveTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
  }
  g.closePath();
}
function layer(w: number, h: number, paint: (c: C2) => void) {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.ceil(w));
  cv.height = Math.max(1, Math.ceil(h));
  paint(cv.getContext('2d')!);
  return cv;
}
const devScale = (g: C2) => (typeof g.getTransform === 'function' ? Math.min(3, Math.max(1, Math.round(g.getTransform().a || 1))) : 1);
function ink(g: C2, fill: string | CanvasGradient, lw = LW, stroke = OUT) {
  g.fillStyle = fill;
  g.fill();
  if (lw > 0) (g.strokeStyle = stroke), (g.lineWidth = lw), g.stroke();
}
function shine(g: C2, x: number, y: number, rx: number, ry: number, rot = -0.5, a = 0.55) {
  ell(g, x, y, rx, ry, rot);
  g.fillStyle = `rgba(255,255,255,${a})`;
  g.fill();
}
function blush(g: C2, x: number, y: number, r: number) {
  ell(g, x, y, r, r * 0.62);
  g.fillStyle = 'rgba(255,110,130,.4)';
  g.fill();
}
function line(g: C2, pts: number[], col: string, lw: number) {
  g.beginPath();
  g.moveTo(pts[0], pts[1]);
  for (let k = 2; k < pts.length; k += 2) g.lineTo(pts[k], pts[k + 1]);
  g.strokeStyle = col;
  g.lineWidth = lw;
  g.stroke();
}
/** #rrggbb 섞기 */
function mix(a: string, b: string, t: number) {
  const p = (c: string, i: number) => parseInt(c.slice(1 + i * 2, 3 + i * 2), 16);
  const v = [0, 1, 2].map((i) => Math.round(p(a, i) + (p(b, i) - p(a, i)) * t));
  return `rgb(${v[0]},${v[1]},${v[2]})`;
}

// ───────────────────────────── 스티커 굽기 ─────────────────────────────
const SPR = new Map<string, HTMLCanvasElement>();
const sprQ = (px: number) => Math.ceil(2 ** (Math.ceil(Math.log2(Math.max(6, px)) * 3 - 1e-6) / 3));
interface Frame { w: number; h: number; ox: number; oy: number }
const F_EGG: Frame = { w: 2.6, h: 2.9, ox: 1.3, oy: 2.6 }, F_BABY: Frame = { w: 3.9, h: 4.2, ox: 1.95, oy: 3.4 }, F_MOM: Frame = { w: 4.4, h: 3.4, ox: 2.0, oy: 2.85 };
function spr(key: string, fr: Frame, px: number, paint: (g: C2) => void): HTMLCanvasElement {
  const q = sprQ(px), k = key + ':' + q;
  let cv = SPR.get(k);
  if (!cv) {
    if (SPR.size > 500) SPR.clear();
    cv = layer(fr.w * q, fr.h * q, (g) => {
      g.translate(fr.ox * q, fr.oy * q);
      g.scale(q, q);
      g.lineJoin = 'round';
      g.lineCap = 'round';
      paint(g);
    });
    SPR.set(k, cv);
  }
  return cv;
}
function stamp(g: C2, cv: HTMLCanvasElement, fr: Frame, u: number) {
  g.drawImage(cv, -fr.ox * u, -fr.oy * u, fr.w * u, fr.h * u);
}
/** 미리 굽기 줄: 그림 프레임 밖에서 조금씩 (놀이 중 한 프레임이 길어지지 않게) */
const WQ: (() => void)[] = [], WK = new Set<string>();
let pumping = false, pumpBudget = 6;
function want(key: string, make: () => void) {
  if (WK.has(key)) return;
  WK.add(key);
  WQ.push(make);
}
function idlePump() {
  if (pumping || !WQ.length || typeof setTimeout !== 'function') return;
  pumping = true;
  const go = () => {
    const a = performance.now();
    while (WQ.length && performance.now() - a < pumpBudget) WQ.shift()!();
    if (WQ.length) setTimeout(go, 16);
    else pumping = false;
  };
  setTimeout(go, 0);
}
/** 자주 쓰는 글자는 한 번 구워 찍는다 */
const GLY = new Map<string, HTMLCanvasElement>();
function gtext(g: C2, str: string, x: number, y: number, px: number, wgt: number, fill: string, stroke: string, lw: number, align: 'center' | 'left' | 'right' = 'center') {
  const sc = devScale(g), size = Math.max(12, Math.round(px)), key = `${str}|${size}|${wgt}|${fill}|${stroke}|${lw}|${sc}`;
  let cv = GLY.get(key);
  if (!cv) {
    if (GLY.size > 160) GLY.clear();
    const font = `${wgt} ${size}px system-ui, sans-serif`;
    const probe = document.createElement('canvas').getContext('2d')!;
    probe.font = font;
    const tw = Math.ceil(probe.measureText(str).width + lw * 2 + 4), th = Math.ceil(size * 1.4 + lw * 2);
    cv = layer(tw * sc, th * sc, (q) => {
      q.scale(sc, sc);
      q.font = font;
      q.textAlign = 'center';
      q.textBaseline = 'middle';
      q.lineJoin = 'round';
      if (lw > 0) (q.lineWidth = lw), (q.strokeStyle = stroke), q.strokeText(str, tw / 2, th / 2);
      q.fillStyle = fill;
      q.fillText(str, tw / 2, th / 2);
    });
    GLY.set(key, cv);
  }
  const W = cv.width / sc, H = cv.height / sc;
  g.drawImage(cv, align === 'center' ? x - W / 2 : align === 'left' ? x - 2 - Math.max(0, lw) : x - W + 2 + Math.max(0, lw), y - H / 2, W, H);
}

// ───────────────────────────── 알 (단위: 반폭 = 1, 바닥 = (0,0), 높이 2.4) ─────────────────────────────
function eggPath(g: C2) {
  g.beginPath();
  g.moveTo(0, 0);
  g.bezierCurveTo(0.78, 0, 1.06, -0.6, 1.0, -1.1);
  g.bezierCurveTo(0.94, -1.85, 0.52, -2.4, 0, -2.4);
  g.bezierCurveTo(-0.52, -2.4, -0.94, -1.85, -1.0, -1.1);
  g.bezierCurveTo(-1.06, -0.6, -0.78, 0, 0, 0);
  g.closePath();
}
const EGG_COL: Record<ET, [string, string, string]> = {
  spot: ['#fffdf6', '#fbead0', '#d6b388'],
  flame: ['#fff9f0', '#ffdcbd', '#e3a06c'],
  drop: ['#fbfeff', '#d9efff', '#93bfe6'],
  stripe: ['#fbfff4', '#e1f3cd', '#a3cb83'],
  giant: ['#fffdf2', '#f4e6c2', '#c8ad78'],
  star: ['#fdfaff', '#ebdeff', '#ad94d6'],
  zap: ['#fffef2', '#fff1a6', '#dcbf55'],
  rainbow: ['#ffffff', '#fff4f9', '#d6bfd6'],
  gold: ['#fff7cf', '#ffd23a', '#c4860e'],
};
/** 지그재그 깨진 금 (y ≈ -1.15) */
const ZIG = [-1.12, -1.15, -0.84, -1.38, -0.56, -1.02, -0.28, -1.34, 0, -0.98, 0.28, -1.32, 0.56, -1.0, 0.84, -1.36, 1.12, -1.12];
function zigClip(g: C2, top: boolean) {
  g.beginPath();
  g.moveTo(-1.3, top ? -2.6 : 0.2);
  g.lineTo(-1.3, ZIG[1]);
  for (let k = 0; k < ZIG.length; k += 2) g.lineTo(ZIG[k], ZIG[k + 1]);
  g.lineTo(1.3, ZIG[ZIG.length - 1]);
  g.lineTo(1.3, top ? -2.6 : 0.2);
  g.closePath();
  g.clip();
}
function pattern(g: C2, t: ET) {
  const dots = (pts: number[], col: string, edge: string) => {
    for (let k = 0; k < pts.length; k += 3) {
      ell(g, pts[k], pts[k + 1], pts[k + 2], pts[k + 2] * 0.86, 0.4);
      g.fillStyle = col;
      g.fill();
      g.strokeStyle = edge;
      g.lineWidth = 0.04;
      g.stroke();
    }
  };
  switch (t) {
    case 'spot':
      dots([-0.42, -1.9, 0.17, 0.36, -1.6, 0.23, -0.22, -1.12, 0.13, 0.56, -0.82, 0.15, -0.62, -0.62, 0.19, 0.08, -0.42, 0.12, 0.08, -2.17, 0.1, -0.72, -1.45, 0.09], '#c98446', '#a8672f');
      break;
    case 'giant':
      dots([-0.45, -1.85, 0.26, 0.42, -1.45, 0.3, -0.3, -0.95, 0.22, 0.55, -0.6, 0.2, -0.75, -0.45, 0.16, 0.1, -2.2, 0.12], '#5cbf9f', '#3c9a7c');
      break;
    case 'flame':
      for (const [x0, hh, s0] of [[-0.55, 1.5, 0.34], [0.3, 1.9, 0.42], [0.85, 1.1, 0.26]]) {
        for (const [col, k] of [['#ff6a3d', 1], ['#ffc548', 0.55]] as [string, number][]) {
          g.beginPath();
          g.moveTo(x0 - s0 * k, 0.1);
          g.quadraticCurveTo(x0 - s0 * k * 1.3, -hh * 0.55 * k, x0 + 0.05, -hh * k - 0.1 * (1 - k));
          g.quadraticCurveTo(x0 + s0 * k * 0.3, -hh * 0.6 * k, x0 + s0 * k * 0.9, -hh * 0.42 * k);
          g.quadraticCurveTo(x0 + s0 * k * 1.2, -hh * 0.2 * k, x0 + s0 * k, 0.1);
          g.closePath();
          g.fillStyle = col;
          g.fill();
        }
      }
      break;
    case 'drop':
      for (const [x, y, r] of [[-0.45, -1.75, 0.2], [0.42, -1.45, 0.24], [-0.3, -0.85, 0.2], [0.5, -0.6, 0.16], [0.05, -2.1, 0.12]]) {
        g.beginPath();
        g.moveTo(x, y - r * 1.9);
        g.bezierCurveTo(x + r * 0.4, y - r * 1.1, x + r, y - r * 0.3, x + r, y + r * 0.1);
        g.arc(x, y + r * 0.1, r, 0, Math.PI);
        g.bezierCurveTo(x - r, y - r * 0.3, x - r * 0.4, y - r * 1.1, x, y - r * 1.9);
        g.fillStyle = '#4aa6ff';
        g.fill();
        ell(g, x - r * 0.35, y - r * 0.1, r * 0.22, r * 0.34, -0.4);
        g.fillStyle = 'rgba(255,255,255,.85)';
        g.fill();
      }
      break;
    case 'stripe':
      for (const y of [-1.7, -0.95]) {
        g.beginPath();
        for (let k = 0; k <= 10; k++) g.lineTo(-1.1 + k * 0.22, y + (k % 2 ? -0.16 : 0.16));
        g.strokeStyle = '#5fb43c';
        g.lineWidth = 0.26;
        g.stroke();
        g.strokeStyle = '#9ee07a';
        g.lineWidth = 0.08;
        g.stroke();
      }
      break;
    case 'star':
      for (const [x, y, r] of [[-0.42, -1.8, 0.22], [0.4, -1.4, 0.26], [-0.35, -0.85, 0.2], [0.5, -0.6, 0.16], [0.05, -2.12, 0.12]]) {
        starPath(g, x, y, r, 0.5, -Math.PI / 2 + x);
        g.fillStyle = '#ffcf3a';
        g.fill();
        g.strokeStyle = '#e09a10';
        g.lineWidth = 0.04;
        g.stroke();
      }
      break;
    case 'zap':
      for (const [x, y, s0] of [[-0.3, -1.6, 0.9], [0.45, -0.85, 0.7]]) {
        g.beginPath();
        g.moveTo(x - 0.1 * s0, y - 0.7 * s0);
        g.lineTo(x + 0.35 * s0, y - 0.7 * s0);
        g.lineTo(x + 0.08 * s0, y - 0.1 * s0);
        g.lineTo(x + 0.38 * s0, y - 0.1 * s0);
        g.lineTo(x - 0.25 * s0, y + 0.75 * s0);
        g.lineTo(x - 0.02 * s0, y + 0.08 * s0);
        g.lineTo(x - 0.32 * s0, y + 0.08 * s0);
        g.closePath();
        g.fillStyle = '#3d8bff';
        g.fill();
        g.strokeStyle = '#ffffff';
        g.lineWidth = 0.05;
        g.stroke();
      }
      break;
    case 'rainbow': {
      const cols = ['#ff8f8f', '#ffbe6e', '#fff07a', '#9de884', '#82c3ff', '#c39bff'];
      for (let k = 0; k < 6; k++) {
        g.beginPath();
        g.moveTo(-1.2, -2.45 + k * 0.42);
        g.quadraticCurveTo(0, -2.25 + k * 0.42, 1.2, -2.45 + k * 0.42);
        g.lineTo(1.2, -2.03 + k * 0.42);
        g.quadraticCurveTo(0, -1.83 + k * 0.42, -1.2, -2.03 + k * 0.42);
        g.closePath();
        g.fillStyle = cols[k];
        g.fill();
      }
      g.fillStyle = 'rgba(255,255,255,.28)';
      g.fillRect(-1.2, -2.5, 2.4, 2.6);
      break;
    }
    case 'gold':
      g.fillStyle = 'rgba(255,255,255,.5)';
      g.beginPath();
      g.moveTo(-1, -1.5);
      g.lineTo(-0.2, -2.4);
      g.lineTo(0.1, -2.4);
      g.lineTo(-1, -1.1);
      g.closePath();
      g.fill();
      for (const [x, y, r] of [[0.45, -1.7, 0.2], [-0.4, -0.8, 0.15], [0.5, -0.65, 0.12]]) {
        starPath(g, x, y, r, 0.25, 0, 4);
        g.fillStyle = '#ffffff';
        g.fill();
      }
      break;
  }
}
/** part: 0 통째 · 1 아래 껍데기(깨진 컵) · 2 위 뚜껑 */
function paintEgg(g: C2, t: ET, crack: number, part: number) {
  const c = EGG_COL[t];
  g.save();
  if (part) zigClip(g, part === 2);
  eggPath(g);
  g.fillStyle = radg(g, -0.38, -1.65, 0.1, 2.4, [0, c[0]], [0.45, c[1]], [1, c[2]]);
  g.fill();
  g.save();
  eggPath(g);
  g.clip();
  pattern(g, t);
  g.fillStyle = lin(g, 0, -1.0, 0, 0, [0, 'rgba(120,70,20,0)'], [1, 'rgba(120,70,20,.2)']);
  g.fillRect(-1.2, -1.0, 2.4, 1.1);
  if (part === 1) {
    // 컵 안쪽 그늘
    ell(g, 0, -1.12, 0.96, 0.3);
    g.fillStyle = lin(g, 0, -1.4, 0, -0.85, [0, '#8a6038'], [1, '#e8cfa4']);
    g.fill();
  }
  g.restore();
  eggPath(g);
  g.strokeStyle = OUT;
  g.lineWidth = 0.11;
  g.stroke();
  g.restore();
  if (part) {
    g.save();
    if (part === 1) zigClip(g, false);
    else zigClip(g, true);
    g.restore();
    line(g, ZIG, OUT, 0.09);
    line(g, ZIG.map((v, k) => (k % 2 ? v + 0.06 : v)), 'rgba(255,255,255,.7)', 0.05);
  }
  if (part !== 1) {
    shine(g, -0.42, -1.7, 0.2, 0.36, -0.35, 0.78);
    shine(g, -0.55, -1.15, 0.07, 0.07, 0, 0.6);
  }
  if (crack > 0 && !part) {
    const c1 = [0.12, -2.38, 0.34, -2.0, 0.08, -1.74, 0.36, -1.48, 0.18, -1.2];
    line(g, c1, '#5a3418', 0.08);
    line(g, c1.map((v, k) => (k % 2 ? v : v + 0.06)), 'rgba(255,255,255,.75)', 0.04);
    if (crack > 1) {
      const c2 = [-0.62, -1.95, -0.34, -1.62, -0.58, -1.36, -0.28, -1.02, -0.45, -0.74];
      line(g, c2, '#5a3418', 0.08);
      line(g, [0.08, -1.74, -0.2, -1.55, -0.34, -1.62], '#5a3418', 0.06);
      line(g, [0.36, -1.48, 0.7, -1.3, 0.82, -1.0], '#5a3418', 0.06);
      g.beginPath();
      g.moveTo(-0.05, -2.36);
      g.lineTo(0.12, -2.38);
      g.lineTo(0.2, -2.18);
      g.lineTo(0.02, -2.12);
      g.closePath();
      g.fillStyle = '#3a2210';
      g.fill();
    }
  }
}
const eggSpr = (t: ET, crack: number, part: number, px: number) => spr(`e${t}${crack}${part}`, F_EGG, px, (g) => paintEgg(g, t, crack, part));

// ───────────────────────────── 아기 (단위: 몸 반지름 ≈ 1, 발 = (0,0)) ─────────────────────────────
type Kind = 'bird' | 'dragon' | 'whale' | 'seal' | 'turtle' | 'hog' | 'dino' | 'bunny' | 'frog';
interface Look { k: Kind; body: string; dark: string; belly: string; acc: string; v: string }
const lk = (k: Kind, body: string, dark: string, belly: string, acc: string, v = ''): Look => ({ k, body, dark, belly, acc, v });
const LOOK: Look[] = [
  lk('bird', '#ffd84a', '#e9a21c', '#fff2a8', '#ff9a2a', 'chick'),
  lk('bird', '#fff0a2', '#dcbc58', '#fffbe2', '#ff8a2a', 'duck'),
  lk('bird', '#b88a62', '#7a5536', '#f4e2c6', '#ffb43a', 'owl'),
  lk('dragon', '#ff6d4d', '#cc3e2b', '#ffe2a6', '#fff0b8'),
  lk('dragon', '#a97dff', '#7350d2', '#ffe9b4', '#ffe27a'),
  lk('whale', '#5fb2ff', '#2f78d6', '#e2f3ff', '#ffffff'),
  lk('seal', '#bcc6d4', '#7f8ca2', '#eef2f8', '#3b3b4b'),
  lk('turtle', '#8fd46c', '#4f9a3c', '#ecf8cc', '#b07a3c'),
  lk('hog', '#c58e5c', '#7a4e2a', '#ffe4c6', '#5b3a20'),
  lk('dino', '#5fcca8', '#2f9a80', '#e9fff1', '#ff9a4a'),
  lk('bunny', '#ffffff', '#cfc6dc', '#fff6fa', '#ffaac8'),
  lk('frog', '#82d85c', '#3f9e3a', '#f1ffd2', '#ff7a9a'),
  lk('bird', '#5c8cff', '#3050c8', '#e6eeff', '#ffe04a', 'thunder'),
  lk('dragon', '#ff9ad0', '#b05ad8', '#fff6d0', '#ffd84a', 'rainbow'),
  lk('whale', '#3d4fb0', '#232f78', '#cbd8ff', '#ffe46a', 'star'),
  lk('bird', '#ffd23a', '#c98410', '#fff4b0', '#ff8a10', 'gold'),
];
const P_POP = 0, P_SIT = 1, P_ACT = 2, P_CHEER = 3, P_BLINK = 4;
function eyes(g: C2, kind: string, x: number, y: number, r: number) {
  for (const sx of [-1, 1]) {
    const ex = x + sx * 0.36;
    if (kind === 'happy') {
      g.beginPath();
      g.arc(ex, y + r * 0.4, r * 0.8, Math.PI * 1.15, Math.PI * 1.85);
      g.strokeStyle = '#2a1a10';
      g.lineWidth = 0.1;
      g.stroke();
    } else if (kind === 'blink') {
      g.beginPath();
      g.arc(ex, y - r * 0.3, r * 0.75, Math.PI * 0.2, Math.PI * 0.8);
      g.strokeStyle = '#2a1a10';
      g.lineWidth = 0.09;
      g.stroke();
    } else if (kind === 'squeeze') {
      line(g, [ex - sx * r * 0.7, y - r * 0.7, ex + sx * r * 0.5, y, ex - sx * r * 0.7, y + r * 0.7], '#2a1a10', 0.1);
    } else {
      const big = kind === 'big', rr0 = big ? r * 1.3 : r;
      ell(g, ex, y, rr0 * 0.9, rr0);
      g.fillStyle = '#24160c';
      g.fill();
      ell(g, ex - rr0 * 0.3, y - rr0 * 0.38, rr0 * 0.36, rr0 * 0.36);
      g.fillStyle = '#ffffff';
      g.fill();
      ell(g, ex + rr0 * 0.28, y + rr0 * 0.32, rr0 * 0.15, rr0 * 0.15);
      g.fill();
      if (kind === 'angry') line(g, [ex - sx * r * 1.1, y - r * 1.5, ex + sx * r * 0.7, y - r * 1.0], '#2a1a10', 0.09);
    }
  }
}
function mouth(g: C2, kind: string, x: number, y: number, w0: number) {
  g.beginPath();
  if (kind === 'o') {
    ell(g, x, y + 0.04, w0 * 0.42, w0 * 0.5);
    g.fillStyle = '#7a2a2a';
    g.fill();
    g.strokeStyle = '#2a1a10';
    g.lineWidth = 0.06;
    g.stroke();
  } else if (kind === 'open') {
    g.moveTo(x - w0, y - 0.04);
    g.quadraticCurveTo(x, y + w0 * 1.5, x + w0, y - 0.04);
    g.closePath();
    g.fillStyle = '#7a2a2a';
    g.fill();
    g.strokeStyle = '#2a1a10';
    g.lineWidth = 0.06;
    g.stroke();
    ell(g, x, y + w0 * 0.5, w0 * 0.45, w0 * 0.25);
    g.fillStyle = '#ff8a9a';
    g.fill();
  } else {
    g.arc(x, y - w0 * 0.4, w0 * 0.8, Math.PI * 0.2, Math.PI * 0.8);
    g.strokeStyle = '#2a1a10';
    g.lineWidth = 0.07;
    g.stroke();
  }
}
function paintBall(g: C2, L: Look) {
  // 몸을 말아 공 (등딱지 / 가시)
  if (L.k === 'hog') {
    g.beginPath();
    for (let k = 0; k < 22; k++) {
      const a = (k / 22) * TAU, q = k % 2 ? 0.95 : 1.28;
      g.lineTo(Math.cos(a) * q, -1 + Math.sin(a) * q);
    }
    g.closePath();
    ink(g, radg(g, -0.3, -1.4, 0.1, 1.4, [0, '#a8784e'], [1, L.acc]), 0.09);
    ell(g, 0.35, -0.75, 0.42, 0.34);
    ink(g, L.belly, 0.07);
    ell(g, 0.62, -0.78, 0.09, 0.08);
    g.fillStyle = '#2a1a10';
    g.fill();
  } else {
    ell(g, 0, -1, 1.02, 1.0);
    ink(g, radg(g, -0.35, -1.45, 0.1, 1.3, [0, '#d8a868'], [0.6, L.acc], [1, '#7a4e22']), 0.1);
    for (const [x, y] of [[0, -1], [-0.52, -0.72], [0.52, -0.72], [-0.52, -1.3], [0.52, -1.3], [0, -1.62], [0, -0.38]]) {
      g.beginPath();
      for (let k = 0; k < 6; k++) g.lineTo(x + Math.cos((k / 6) * TAU) * 0.26, y + Math.sin((k / 6) * TAU) * 0.24);
      g.closePath();
      g.strokeStyle = 'rgba(70,40,10,.55)';
      g.lineWidth = 0.06;
      g.stroke();
    }
  }
  shine(g, -0.4, -1.5, 0.28, 0.16, -0.5, 0.55);
}
function paintBaby(g: C2, i: number, pose: number) {
  const L = LOOK[i], k = L.k;
  if (pose === P_ACT && (k === 'turtle' || k === 'hog')) return paintBall(g, L);
  g.save();
  if (pose === P_POP) g.scale(0.9, 1.1);
  if (pose === P_ACT && (k === 'bunny' || k === 'frog')) g.scale(0.84, 1.2);
  const wide = k === 'whale' || k === 'seal', rx = wide ? 1.12 : 1, ry = wide ? 0.9 : 0.97;
  const up = pose === P_POP || pose === P_CHEER;
  const bodyFill = L.v === 'rainbow'
    ? lin(g, -1, -2, 1, 0, [0, '#ff8f8f'], [0.25, '#ffd36e'], [0.5, '#a6ec8a'], [0.75, '#86c6ff'], [1, '#c79bff'])
    : radg(g, -0.35, -1.45, 0.1, 1.55, [0, mix(L.body, '#ffffff', 0.45)], [0.55, L.body], [1, L.dark]);
  // ── 뒤: 꼬리·날개·귀·등딱지·가시·등판 ──
  if (k === 'dragon') {
    for (const sx of [-1, 1]) {
      g.beginPath();
      g.moveTo(sx * 0.6, -1.35);
      g.quadraticCurveTo(sx * 1.45, -2.0, sx * 1.55, -1.25);
      g.quadraticCurveTo(sx * 1.3, -1.25, sx * 1.25, -1.0);
      g.quadraticCurveTo(sx * 1.05, -1.15, sx * 0.8, -0.95);
      g.closePath();
      ink(g, L.dark, 0.08);
    }
    g.beginPath();
    g.moveTo(0.6, -0.35);
    g.quadraticCurveTo(1.5, -0.3, 1.55, -0.85);
    g.lineTo(1.25, -0.6);
    g.quadraticCurveTo(1.1, -0.45, 0.7, -0.6);
    g.closePath();
    ink(g, L.dark, 0.08);
  } else if (k === 'whale') {
    g.beginPath();
    g.moveTo(0.85, -0.7);
    g.quadraticCurveTo(1.35, -0.9, 1.45, -1.45);
    g.quadraticCurveTo(1.6, -1.1, 1.85, -1.25);
    g.quadraticCurveTo(1.6, -0.6, 0.95, -0.4);
    g.closePath();
    ink(g, L.dark, 0.08);
  } else if (k === 'turtle') {
    ell(g, 0, -0.98, 1.2, 1.0);
    ink(g, radg(g, -0.4, -1.5, 0.1, 1.5, [0, '#e0b070'], [0.6, L.acc], [1, '#7a4e22']), 0.1);
  } else if (k === 'hog') {
    g.beginPath();
    for (let j = 0; j <= 16; j++) {
      const a = Math.PI * (1.02 + (j / 16) * 0.96) - 0.0, q = j % 2 ? 1.05 : 1.42;
      g.lineTo(Math.cos(a) * q * 1.02, -0.95 + Math.sin(a) * q);
    }
    g.lineTo(1.0, -0.6);
    g.lineTo(-1.0, -0.6);
    g.closePath();
    ink(g, L.acc, 0.08);
  } else if (k === 'dino') {
    for (const [x, y, s0] of [[-0.55, -1.75, 0.28], [0, -2.02, 0.34], [0.55, -1.75, 0.28]]) {
      g.beginPath();
      g.moveTo(x - s0, y + s0 * 0.6);
      g.lineTo(x, y - s0);
      g.lineTo(x + s0, y + s0 * 0.6);
      g.closePath();
      ink(g, L.acc, 0.08);
    }
    g.beginPath();
    g.moveTo(0.7, -0.35);
    g.quadraticCurveTo(1.6, -0.25, 1.7, -0.75);
    g.quadraticCurveTo(1.4, -0.55, 0.8, -0.75);
    g.closePath();
    ink(g, L.dark, 0.08);
  } else if (k === 'bunny') {
    const back = pose === P_ACT;
    for (const sx of [-1, 1]) {
      g.save();
      g.translate(sx * 0.36, -1.7);
      g.rotate(sx * (back ? 0.9 : 0.18));
      ell(g, 0, -0.55, 0.24, 0.66);
      ink(g, bodyFill, 0.09);
      ell(g, 0, -0.5, 0.11, 0.46);
      g.fillStyle = L.acc;
      g.fill();
      g.restore();
    }
  }
  // ── 발 ──
  const footCol = k === 'bird' ? L.acc : L.dark;
  const lift = pose === P_ACT && k === 'dino';
  for (const sx of [-1, 1]) {
    ell(g, sx * 0.4, sx > 0 && lift ? -0.4 : -0.06, 0.26, 0.13);
    ink(g, footCol, 0.07);
  }
  // ── 몸 ──
  ell(g, 0, -ry, rx, ry);
  ink(g, bodyFill);
  if (k !== 'turtle') {
    ell(g, 0, -0.6, rx * 0.62, ry * 0.48);
    g.fillStyle = L.belly;
    g.fill();
  } else {
    ell(g, 0, -0.75, 0.62, 0.62);
    ink(g, L.belly, 0.07);
  }
  if (L.v === 'star') {
    for (const [x, y, r0] of [[-0.6, -1.35, 0.13], [0.55, -1.5, 0.1], [0.7, -0.85, 0.09], [-0.75, -0.75, 0.08]]) {
      starPath(g, x, y, r0, 0.45);
      g.fillStyle = L.acc;
      g.fill();
    }
  }
  // ── 얼굴 ──
  const ey = k === 'frog' ? -1.78 : -1.15;
  if (k === 'frog') {
    for (const sx of [-1, 1]) {
      ell(g, sx * 0.42, -1.75, 0.32, 0.3);
      ink(g, bodyFill, 0.08);
      ell(g, sx * 0.42, -1.75, 0.2, 0.2);
      g.fillStyle = '#ffffff';
      g.fill();
    }
  }
  if (L.v === 'owl') {
    for (const sx of [-1, 1]) {
      ell(g, sx * 0.36, -1.15, 0.32, 0.3);
      g.fillStyle = L.belly;
      g.fill();
      ell(g, sx * 0.36, -1.15, 0.22, 0.22);
      g.fillStyle = '#ffd25a';
      g.fill();
    }
  }
  let ek = 'open';
  if (pose === P_POP) ek = 'big';
  else if (pose === P_CHEER) ek = 'happy';
  else if (pose === P_BLINK) ek = 'blink';
  else if (pose === P_ACT) ek = k === 'dragon' || L.v === 'thunder' ? 'squeeze' : k === 'whale' || k === 'seal' ? 'happy' : k === 'dino' ? 'angry' : 'open';
  eyes(g, ek, 0, ey + (k === 'frog' ? 0.03 : 0), k === 'frog' ? 0.12 : 0.15);
  blush(g, -0.62, -0.88, pose === P_ACT && k === 'dragon' ? 0.24 : 0.16);
  blush(g, 0.62, -0.88, pose === P_ACT && k === 'dragon' ? 0.24 : 0.16);
  const mk = pose === P_POP ? 'o' : pose === P_CHEER ? 'open' : pose === P_ACT ? 'open' : 'smile';
  if (k === 'bird') {
    const open = pose !== P_SIT && pose !== P_BLINK;
    if (L.v === 'duck') {
      ell(g, 0, -0.86 + (open ? 0.04 : 0), 0.32, open ? 0.16 : 0.12);
      ink(g, L.acc, 0.07);
      if (open) line(g, [-0.28, -0.84, 0.28, -0.84], '#7a3a10', 0.05);
    } else {
      g.beginPath();
      g.moveTo(-0.17, -0.98);
      g.lineTo(0.17, -0.98);
      g.lineTo(0, open ? -0.86 : -0.74);
      g.closePath();
      ink(g, L.acc, 0.06);
      if (open) {
        g.beginPath();
        g.moveTo(-0.13, -0.82);
        g.lineTo(0.13, -0.82);
        g.lineTo(0, -0.64);
        g.closePath();
        ink(g, mix(L.acc, '#000000', 0.15), 0.06);
      }
    }
  } else if (k === 'dragon') {
    ell(g, 0, -0.8, 0.4, 0.26);
    ink(g, L.belly, 0.07);
    for (const sx of [-1, 1]) {
      ell(g, sx * 0.13, -0.86, 0.05, 0.04);
      g.fillStyle = '#5a2a1a';
      g.fill();
    }
    if (pose === P_ACT) {
      ell(g, 0, -0.62, 0.26, 0.17);
      g.fillStyle = radg(g, 0, -0.62, 0, 0.26, [0, '#fff2a0'], [0.6, '#ff8a3a'], [1, '#7a2a2a']);
      g.fill();
    } else mouth(g, mk, 0, -0.6, 0.16);
  } else if (k === 'seal') {
    g.beginPath();
    g.moveTo(-0.1, -0.95);
    g.lineTo(0.1, -0.95);
    g.lineTo(0, -0.84);
    g.closePath();
    ink(g, L.acc, 0.05);
    for (const sx of [-1, 1]) for (const dy of [-0.05, 0.06]) line(g, [sx * 0.2, -0.86 + dy, sx * 0.62, -0.92 + dy * 2], 'rgba(60,60,80,.7)', 0.035);
    mouth(g, mk, 0, -0.7, 0.13);
  } else if (k === 'hog' || k === 'bunny') {
    ell(g, 0, -0.9, k === 'hog' ? 0.11 : 0.08, k === 'hog' ? 0.08 : 0.06);
    g.fillStyle = k === 'hog' ? '#2a1a10' : L.acc;
    g.fill();
    mouth(g, mk, 0, -0.72, 0.13);
  } else mouth(g, mk, 0, k === 'frog' ? -0.95 : -0.74, k === 'frog' ? 0.32 : 0.18);
  // ── 앞: 날개·팔 ──
  const armCol = k === 'bird' ? L.dark : L.dark;
  for (const sx of [-1, 1]) {
    g.save();
    if (k === 'bird') {
      g.translate(sx * 0.9, up ? -1.25 : -0.85);
      g.rotate(sx * (up ? -1.1 : 0.45));
      ell(g, 0, 0, 0.36, 0.2);
    } else {
      g.translate(sx * 0.82, up ? -1.2 : -0.7);
      g.rotate(sx * (up ? -0.9 : 0.5));
      ell(g, 0, 0, wide ? 0.32 : 0.22, wide ? 0.15 : 0.14);
    }
    ink(g, armCol, 0.07);
    g.restore();
  }
  // ── 머리 장식 ──
  if (L.v === 'chick' || L.v === 'gold') {
    for (const [a, l0] of [[-0.5, 0.32], [0, 0.4], [0.5, 0.3]]) {
      g.beginPath();
      g.moveTo(a * 0.2, -1.9);
      g.quadraticCurveTo(a * 0.5 + 0.1, -2.1 - l0, a * 0.7, -2.0 - l0 * 0.7);
      g.strokeStyle = L.dark;
      g.lineWidth = 0.1;
      g.stroke();
    }
  } else if (L.v === 'duck') {
    g.beginPath();
    g.moveTo(0, -1.92);
    g.quadraticCurveTo(0.35, -2.35, 0.05, -2.3);
    g.strokeStyle = L.dark;
    g.lineWidth = 0.1;
    g.stroke();
  } else if (L.v === 'owl') {
    for (const sx of [-1, 1]) {
      g.beginPath();
      g.moveTo(sx * 0.35, -1.78);
      g.lineTo(sx * 0.72, -2.2);
      g.lineTo(sx * 0.75, -1.6);
      g.closePath();
      ink(g, L.dark, 0.07);
    }
  } else if (L.v === 'thunder') {
    g.beginPath();
    g.moveTo(-0.1, -1.85);
    g.lineTo(0.25, -2.3);
    g.lineTo(0.12, -2.05);
    g.lineTo(0.4, -2.15);
    g.lineTo(0.1, -1.8);
    g.closePath();
    ink(g, L.acc, 0.06);
  } else if (k === 'dragon') {
    for (const sx of [-1, 1]) {
      g.beginPath();
      g.moveTo(sx * 0.22, -1.85);
      g.quadraticCurveTo(sx * 0.42, -2.35, sx * 0.55, -2.25);
      g.lineTo(sx * 0.5, -1.78);
      g.closePath();
      ink(g, L.acc, 0.07);
    }
  }
  if (L.v === 'gold' || L.v === 'rainbow' || L.v === 'star') {
    for (const [x, y, r0] of [[-1.25, -1.9, 0.22], [1.3, -1.6, 0.16]]) {
      starPath(g, x, y, r0, 0.3, 0, 4);
      g.fillStyle = '#fffbe0';
      g.fill();
    }
  }
  // ── 하는 짓 그림 ──
  if (pose === P_ACT && k === 'whale') {
    for (const [dx0, h0] of [[-0.35, 0.9], [0, 1.25], [0.35, 0.9]]) {
      g.beginPath();
      g.moveTo(0, -1.85);
      g.quadraticCurveTo(dx0 * 0.4, -1.85 - h0, dx0 * 1.6, -1.85 - h0 * 0.55);
      g.strokeStyle = '#6cc3ff';
      g.lineWidth = 0.16;
      g.stroke();
      g.strokeStyle = '#e8f6ff';
      g.lineWidth = 0.06;
      g.stroke();
    }
  }
  shine(g, -0.42, -1.58, 0.26, 0.15, -0.5, 0.5);
  g.restore();
}
const babySpr = (i: number, pose: number, px: number) => spr(`b${i}:${pose}`, F_BABY, px, (g) => paintBaby(g, i, pose));

// ───────────────────────────── 엄마 새 (왼쪽을 본다, 발 = (0,0)) ─────────────────────────────
const M_IDLE = 0, M_HAPPY = 1, M_WOW = 2, M_DIZZY = 3, M_BLINK = 4;
function paintMom(g: C2, pose: number) {
  g.save();
  if (pose === M_DIZZY) g.rotate(0.12);
  // 꼬리
  for (const [x, y, rot] of [[1.55, -1.75, -0.7], [1.72, -1.4, -0.35], [1.62, -1.05, 0]]) {
    ell(g, x, y, 0.62, 0.17, rot);
    ink(g, lin(g, 0.9, -1, 2.2, -1.6, [0, '#d2552f'], [1, '#8c3018']), 0.08);
  }
  // 몸
  ell(g, 0.08, -1.05, 1.18, 1.0);
  ink(g, radg(g, -0.4, -1.55, 0.1, 1.8, [0, '#ffc59a'], [0.45, '#ff8a5a'], [1, '#d4502c']));
  ell(g, -0.32, -0.82, 0.7, 0.64, -0.2);
  g.fillStyle = radg(g, -0.4, -1.0, 0.05, 0.8, [0, '#fffaf0'], [1, '#ffe1bf']);
  g.fill();
  // 날개
  g.save();
  if (pose === M_WOW) (g.translate(0.55, -1.55), g.rotate(-1.0));
  else if (pose === M_HAPPY) (g.translate(0.5, -1.2), g.rotate(-0.35));
  else (g.translate(0.48, -0.95), g.rotate(0.35));
  ell(g, 0, 0, 0.68, 0.42);
  ink(g, lin(g, -0.6, 0, 0.7, 0, [0, '#ff7a4a'], [1, '#b8401f']), 0.09);
  for (const k of [-0.2, 0.1, 0.4]) line(g, [k, -0.28, k + 0.2, 0.25], 'rgba(120,30,10,.45)', 0.05);
  g.restore();
  if (pose === M_WOW) {
    g.save();
    g.translate(-0.75, -1.45);
    g.rotate(0.9);
    ell(g, 0, 0, 0.5, 0.28);
    ink(g, '#e85a34', 0.08);
    g.restore();
  }
  // 볏
  for (const [a, l0] of [[-0.45, 0.42], [-0.15, 0.55], [0.15, 0.4]]) {
    g.beginPath();
    g.moveTo(-0.35 + a * 0.3, -1.95);
    g.quadraticCurveTo(-0.3 + a, -2.25 - l0 * (pose === M_WOW ? 1.3 : 1), -0.15 + a * 1.4, -2.15 - l0 * 0.6);
    g.strokeStyle = '#d4502c';
    g.lineWidth = 0.13;
    g.stroke();
  }
  // 부리
  if (pose === M_WOW || pose === M_DIZZY) {
    g.beginPath();
    g.moveTo(-0.95, -1.38);
    g.lineTo(-1.42, -1.38);
    g.lineTo(-0.98, -1.2);
    g.closePath();
    ink(g, '#ffc531', 0.07);
    g.beginPath();
    g.moveTo(-0.98, -1.12);
    g.lineTo(-1.3, -0.98);
    g.lineTo(-0.92, -0.96);
    g.closePath();
    ink(g, '#f0a020', 0.07);
  } else {
    g.beginPath();
    g.moveTo(-0.95, -1.36);
    g.lineTo(-1.42, -1.2);
    g.lineTo(-0.95, -1.06);
    g.closePath();
    ink(g, '#ffc531', 0.07);
    if (pose === M_HAPPY) line(g, [-1.38, -1.2, -1.0, -1.18], '#a0600a', 0.04);
  }
  // 눈
  const ex = -0.5, ey = -1.45;
  if (pose === M_HAPPY) {
    g.beginPath();
    g.arc(ex, ey + 0.08, 0.15, Math.PI * 1.1, Math.PI * 1.9);
    g.strokeStyle = '#2a1a10';
    g.lineWidth = 0.09;
    g.stroke();
  } else if (pose === M_BLINK) {
    g.beginPath();
    g.arc(ex, ey - 0.06, 0.14, Math.PI * 0.15, Math.PI * 0.85);
    g.strokeStyle = '#2a1a10';
    g.lineWidth = 0.08;
    g.stroke();
  } else if (pose === M_DIZZY) {
    g.beginPath();
    for (let k = 0; k < 26; k++) {
      const a = k * 0.55, q = 0.02 + k * 0.007;
      g.lineTo(ex + Math.cos(a) * q, ey + Math.sin(a) * q);
    }
    g.strokeStyle = '#2a1a10';
    g.lineWidth = 0.05;
    g.stroke();
  } else {
    const r0 = pose === M_WOW ? 0.22 : 0.16;
    ell(g, ex, ey, r0 * 0.88, r0);
    g.fillStyle = '#24160c';
    g.fill();
    ell(g, ex - r0 * 0.3, ey - r0 * 0.38, r0 * 0.38, r0 * 0.38);
    g.fillStyle = '#ffffff';
    g.fill();
    if (pose === M_WOW) {
      starPath(g, ex + r0 * 0.2, ey + r0 * 0.25, r0 * 0.35, 0.4);
      g.fill();
    }
  }
  blush(g, -0.68, -1.12, 0.17);
  shine(g, -0.2, -1.75, 0.36, 0.17, -0.3, 0.45);
  // 발
  for (const x of [-0.3, 0.2]) line(g, [x, -0.2, x - 0.05, 0.02, x - 0.2, 0.08, x - 0.05, 0.02, x + 0.12, 0.1], '#e88a1a', 0.09);
  g.restore();
}
const momSpr = (pose: number, px: number) => spr('m' + pose, F_MOM, px, (g) => paintMom(g, pose));

// ───────────────────────────── 배경 · 둥지 (한 번 굽기) ─────────────────────────────
function leaf(g: C2, x: number, y: number, len: number, ang: number, col: string) {
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  g.beginPath();
  g.moveTo(0, 0);
  g.quadraticCurveTo(len * 0.5, -len * 0.32, len, 0);
  g.quadraticCurveTo(len * 0.5, len * 0.32, 0, 0);
  g.closePath();
  g.fillStyle = lin(g, 0, -len * 0.3, 0, len * 0.3, [0, mix(col, '#ffffff', 0.3)], [1, mix(col, '#000000', 0.18)]);
  g.fill();
  g.strokeStyle = mix(col, '#000000', 0.35);
  g.lineWidth = Math.max(0.6, len * 0.03);
  g.stroke();
  g.beginPath();
  g.moveTo(len * 0.05, 0);
  g.lineTo(len * 0.85, 0);
  g.strokeStyle = 'rgba(255,255,230,.45)';
  g.stroke();
  g.restore();
}
function foliage(g: C2, cx: number, cy: number, r: number, n: number, seed: number, dark: boolean) {
  for (let k = 0; k < n; k++) {
    const a = hsh(seed + k) * TAU, d = Math.sqrt(hsh(seed + k + 50)) * r, q = r * (0.3 + hsh(seed + k + 99) * 0.35);
    const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * 0.7;
    ell(g, x, y, q, q * 0.92);
    g.fillStyle = dark ? (k % 2 ? '#4d9a46' : '#5aa850') : k % 3 ? '#79c45a' : '#8fd468';
    g.fill();
    ell(g, x - q * 0.25, y - q * 0.3, q * 0.55, q * 0.4);
    g.fillStyle = dark ? 'rgba(160,220,120,.25)' : 'rgba(230,255,190,.45)';
    g.fill();
  }
}
function branch(g: C2, pts: number[], w0: number, w1: number) {
  const n = pts.length / 2 - 1;
  for (const pass of [0, 1, 2]) {
    for (let k = 0; k < n; k++) {
      const lw = w0 + (w1 - w0) * (k / Math.max(1, n - 1));
      g.beginPath();
      g.moveTo(pts[k * 2], pts[k * 2 + 1] - (pass === 2 ? lw * 0.22 : 0));
      g.lineTo(pts[k * 2 + 2], pts[k * 2 + 3] - (pass === 2 ? lw * 0.22 : 0));
      g.strokeStyle = pass === 0 ? '#4a2c14' : pass === 1 ? '#8c5a30' : 'rgba(220,170,110,.55)';
      g.lineWidth = pass === 0 ? lw + 3 : pass === 1 ? lw : lw * 0.25;
      g.stroke();
    }
  }
}
const TWIG = ['#6b4220', '#8a5a2b', '#a8743a', '#c4914e', '#dcae68', '#5a3618'];
function twigs(g: C2, w: number, n: number, seed: number, f0: number, f1: number, a0: number, a1: number, dy0: number, dy1: number, light: number) {
  const cx = NX * w, cy = NY * w, rx = RX * w, ry = RY * w;
  for (let k = 0; k < n; k++) {
    const a = a0 + hsh(seed + k) * (a1 - a0), f = f0 + hsh(seed + k + 777) * (f1 - f0), dy = dy0 + hsh(seed + k + 333) * (dy1 - dy0);
    const x = cx + Math.cos(a) * rx * f, y = cy + Math.sin(a) * ry * f + dy * w;
    const ta = a + Math.PI / 2 + (hsh(seed + k + 55) - 0.5) * 1.2, len = w * (0.035 + hsh(seed + k + 66) * 0.05);
    const ci = Math.floor(hsh(seed + k + 88) * TWIG.length);
    g.beginPath();
    g.moveTo(x - Math.cos(ta) * len * 0.5, y - Math.sin(ta) * len * 0.5 * 0.7);
    g.quadraticCurveTo(x + (hsh(k + seed + 9) - 0.5) * len * 0.3, y - len * 0.08, x + Math.cos(ta) * len * 0.5, y + Math.sin(ta) * len * 0.5 * 0.7);
    g.strokeStyle = mix(TWIG[ci], '#fff0c8', light * hsh(seed + k + 11));
    g.lineWidth = w * (0.004 + hsh(seed + k + 44) * 0.006);
    g.stroke();
  }
}
const ORX = 1.26, ORY = 1.34, WALL = 0.08;
function ringPath(g: C2, w: number, front: boolean) {
  const cx = NX * w, cy = NY * w, rx = RX * w, ry = RY * w;
  g.beginPath();
  g.ellipse(cx, cy, rx * ORX, ry * ORY, 0, 0, TAU);
  g.ellipse(cx, cy, rx * 0.99, ry * 0.99, 0, TAU, 0, true);
  if (front) {
    g.save();
    g.beginPath();
    g.rect(0, cy, w, w);
    g.clip();
    g.beginPath();
    g.ellipse(cx, cy, rx * ORX, ry * ORY, 0, 0, TAU);
    g.ellipse(cx, cy, rx * 0.99, ry * 0.99, 0, TAU, 0, true);
  }
}
function paintBack(g: C2, w: number, h: number) {
  const X = (x: number) => x * w;
  g.fillStyle = lin(g, 0, 0, 0, h, [0, '#8fd3ff'], [0.28, '#cdeeff'], [0.5, '#fff4d8'], [1, '#ffe0a4']);
  g.fillRect(0, 0, w, h);
  g.fillStyle = radg(g, X(0.12), X(0.02), 0, X(0.85), [0, 'rgba(255,252,222,1)'], [0.22, 'rgba(255,240,184,.65)'], [1, 'rgba(255,240,184,0)']);
  g.fillRect(0, 0, w, h);
  // 먼 잎 (뒤)
  foliage(g, X(0.98), X(0.05), X(0.34), 22, 3, true);
  foliage(g, X(0.02), X(0.62), X(0.22), 14, 40, true);
  foliage(g, X(1.02), X(0.78), X(0.2), 12, 70, true);
  // 햇살 줄기
  for (let k = 0; k < 5; k++) {
    const a = 0.55 + k * 0.17;
    g.beginPath();
    g.moveTo(X(0.08), X(-0.02));
    g.lineTo(X(0.08) + Math.cos(a - 0.04) * X(1.8), X(-0.02) + Math.sin(a - 0.04) * X(1.8));
    g.lineTo(X(0.08) + Math.cos(a + 0.04) * X(1.8), X(-0.02) + Math.sin(a + 0.04) * X(1.8));
    g.closePath();
    g.fillStyle = 'rgba(255,255,230,.13)';
    g.fill();
  }
  // 가지: 엄마 가지 · 둥지 밑 가지
  branch(g, [X(-0.06), X(0.3), X(0.08), X(0.338), X(0.2), X(0.345), X(0.3), X(0.326), X(0.36), X(0.3)], X(0.034), X(0.012));
  branch(g, [X(0.24), X(0.34), X(0.28), X(0.29), X(0.3), X(0.25)], X(0.01), X(0.006));
  branch(g, [X(-0.06), X(1.46), X(0.18), X(1.32), X(0.42), X(1.24), X(0.62), X(1.2)], X(0.07), X(0.04));
  branch(g, [X(1.06), X(1.42), X(0.86), X(1.3), X(0.7), X(1.23)], X(0.06), X(0.035));
  foliage(g, X(0.08), X(0.06), X(0.2), 14, 120, false);
  for (let k = 0; k < 7; k++) leaf(g, X(0.18 + hsh(k + 200) * 0.18), X(0.27 + hsh(k + 210) * 0.08), X(0.045 + hsh(k + 220) * 0.03), -0.6 - hsh(k + 230) * 2, k % 2 ? '#79c45a' : '#5fae4a');
  for (let k = 0; k < 7; k++) leaf(g, X(hsh(k + 300) * 0.25), X(1.25 + hsh(k + 310) * 0.2), X(0.06 + hsh(k + 320) * 0.04), -1.2 + hsh(k + 330) * 2.4, k % 2 ? '#79c45a' : '#5fae4a');
  for (let k = 0; k < 6; k++) leaf(g, X(0.8 + hsh(k + 400) * 0.22), X(1.28 + hsh(k + 410) * 0.18), X(0.06 + hsh(k + 420) * 0.04), Math.PI + 0.8 - hsh(k + 430) * 2, k % 2 ? '#8fd468' : '#5fae4a');
  // 둥지 그림자
  const cx = NX * w, cy = NY * w, rx = RX * w, ry = RY * w;
  ell(g, cx, cy + X(WALL) + X(0.03), rx * ORX * 1.02, ry * ORY * 1.0);
  g.fillStyle = 'rgba(70,35,10,.28)';
  g.fill();
  // 둥지 바깥 벽(옆면)
  wall(g, w);
  // 테 윗면 (고리 전체)
  ringPath(g, w, false);
  g.fillStyle = lin(g, 0, cy - ry * ORY, 0, cy + ry * ORY, [0, '#d4a05e'], [0.5, '#b07a40'], [1, '#8a5a2c']);
  g.fill('evenodd');
  twigs(g, w, 320, 1, 1.0, ORX * 0.98, Math.PI, TAU, 0, 0, 0.5);
  twigs(g, w, 200, 9001, 1.0, ORX * 0.98, 0, Math.PI, 0, 0, 0.3);
  // 바닥
  ell(g, cx, cy, rx, ry);
  g.fillStyle = radg(g, cx, cy + ry * 0.25, rx * 0.1, rx * 1.05, [0, '#f8e2a8'], [0.65, '#e6bd74'], [1, '#b8843e']);
  g.fill();
  g.save();
  ell(g, cx, cy, rx, ry);
  g.clip();
  for (let k = 0; k < 220; k++) {
    const a = hsh(k + 500) * TAU, d = Math.sqrt(hsh(k + 600)), x = cx + Math.cos(a) * rx * d, y = cy + Math.sin(a) * ry * d, ta = hsh(k + 700) * Math.PI, len = w * (0.02 + hsh(k + 800) * 0.035);
    line(g, [x, y, x + Math.cos(ta) * len, y + Math.sin(ta) * len * 0.6], k % 3 ? 'rgba(255,240,190,.75)' : 'rgba(150,100,40,.45)', w * 0.004);
  }
  // 안쪽 벽 그늘 (뒤쪽)
  g.fillStyle = lin(g, 0, cy - ry, 0, cy - ry * 0.35, [0, 'rgba(90,50,15,.45)'], [1, 'rgba(90,50,15,0)']);
  g.fillRect(cx - rx, cy - ry, rx * 2, ry * 0.7);
  // 솜털
  for (let k = 0; k < 9; k++) {
    const a = hsh(k + 900) * TAU, d = 0.3 + hsh(k + 910) * 0.6, x = cx + Math.cos(a) * rx * d, y = cy + Math.sin(a) * ry * d;
    for (let j = 0; j < 4; j++) {
      ell(g, x + (j - 1.5) * w * 0.006, y - (j % 2) * w * 0.004, w * 0.012, w * 0.007, j * 0.6);
      g.fillStyle = 'rgba(255,255,255,.8)';
      g.fill();
    }
  }
  g.restore();
}
function wall(g: C2, w: number) {
  const cx = NX * w, cy = NY * w, rx = RX * w * ORX, ry = RY * w * ORY, T = WALL * w;
  g.beginPath();
  g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI);
  g.lineTo(cx - rx, cy + T);
  g.ellipse(cx, cy + T, rx, ry, 0, Math.PI, 0, true);
  g.closePath();
  g.fillStyle = lin(g, 0, cy, 0, cy + ry + T, [0, '#9a6532'], [1, '#5e3816']);
  g.fill();
  twigs(g, w, 160, 4242, ORX * 0.9, ORX * 1.02, 0.05, Math.PI - 0.05, 0.01, WALL - 0.005, 0.15);
}
const FRONT_Y0 = NY - 0.01, FRONT_Y1 = NY + RY * ORY + WALL + 0.03;
function paintFront(g: C2, w: number) {
  g.translate(0, -FRONT_Y0 * w);
  wall(g, w);
  ringPath(g, w, true);
  g.fillStyle = lin(g, 0, NY * w, 0, (NY + RY * ORY) * w, [0, '#c4904e'], [1, '#8a5a2c']);
  g.fill('evenodd');
  twigs(g, w, 240, 77, 1.0, ORX * 0.98, 0.06, Math.PI - 0.06, 0, 0, 0.45);
  // 안쪽으로 삐져나온 지푸라기
  twigs(g, w, 50, 555, 0.93, 1.03, 0.25, Math.PI - 0.25, -0.004, 0.004, 0.7);
  g.restore();
}
const BGS = new Map<string, HTMLCanvasElement>();
function bakeBg(w: number, h: number, sc: number): HTMLCanvasElement {
  const key = `b:${w}:${sc}`;
  let cv = BGS.get(key);
  if (!cv) {
    if (BGS.size > 6) BGS.clear();
    cv = layer(w * sc, h * sc, (g) => {
      g.scale(sc, sc);
      g.lineCap = 'round';
      paintBack(g, w, h);
    });
    BGS.set(key, cv);
  }
  return cv;
}
function bakeFront(w: number, sc: number): HTMLCanvasElement {
  const key = `f:${w}:${sc}`;
  let cv = BGS.get(key);
  if (!cv) {
    cv = layer(w * sc, (FRONT_Y1 - FRONT_Y0) * w * sc, (g) => {
      g.scale(sc, sc);
      g.lineCap = 'round';
      g.save();
      paintFront(g, w);
    });
    BGS.set(key, cv);
  }
  return cv;
}

// ───────────────────────────── 장면 ─────────────────────────────
const PART_MAX = 70;
const easeBack = (f: number) => {
  const c = 1.9;
  return 1 + (c + 1) * (f - 1) ** 3 + c * (f - 1) ** 2;
};
/** 한 연쇄의 음 높이: 도레미솔라 → 한 옥타브씩 */
const STEP = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3];
const pitchOf = (k: number) => Math.min(3.4, 0.85 * 2 ** Math.floor((k - 1) / 5) * STEP[(k - 1) % 5]);
/** 아기마다 고유 울음 (처음 만날 때) */
const CRY: [Parameters<ReturnType<typeof juice>['sound']>[0], number][][] = [
  [['pop', 2.4], ['tick', 2.0]], [['boing', 1.9], ['pop', 1.2]], [['swell', 1.5], ['ding', 0.7]], [['zap', 0.7], ['boing', 0.8]],
  [['zap', 0.55], ['swell', 0.9]], [['splash', 0.7], ['swell', 0.6]], [['boing', 1.1], ['pop', 1.6]], [['thud', 1.6], ['pop', 1.0]],
  [['tick', 0.9], ['boing', 1.4]], [['thud', 0.6], ['swell', 0.5]], [['boing', 2.3], ['pop', 2.0]], [['boing', 0.7], ['pop', 0.7]],
  [['zap', 1.7], ['ding', 1.4]], [['chime', 1.0], ['zap', 1.0]], [['chime', 0.8], ['swell', 0.7]], [['coin', 1.0], ['chime', 1.3]],
];
const KCOL = ['#ffffff', '#fff3a0', '#ffd84a', '#ffab3a', '#ff7a5a', '#ff5aa8'];
const kcol = (k: number) => KCOL[Math.min(KCOL.length - 1, Math.floor(k / 4))];
const hintMemo = new WeakMap<object, { key: string; i: number }>();
function hintEgg(s: NestState): number {
  let m = hintMemo.get(s);
  const key = `${s.nest}:${s.hatched}:${s.taps}:${s.eggs.length}`;
  if (!m || (m.key !== key && !s.q.length)) hintMemo.set(s, (m = { key, i: s.firstTap < 0 && s.nest === 0 ? firstTap(s) : (oneStep(s)[0]?.i ?? -1) }));
  return m.i;
}
function prebake(s: NestState, w: number, sc2: number) {
  const pxE = (r: number) => r * RX * VS * w * sc2 * 1.15;
  for (const e of s.eggs) {
    const px = pxE(e.r);
    for (const c of [0, 1, 2]) want(`e${e.t}${c}:${sprQ(px)}`, () => eggSpr(e.t, c, 0, px));
    want(`c${e.t}:${sprQ(px)}`, () => (eggSpr(e.t, 0, 1, px), eggSpr(e.t, 0, 2, px)));
    const pb = px * (e.t === 'giant' ? 1.25 : 1.0);
    for (const p of [P_POP, P_SIT, P_ACT, P_CHEER, P_BLINK]) want(`b${e.sp}:${p}:${sprQ(pb)}`, () => babySpr(e.sp, p, pb));
  }
}

function drawAll(ctx: C2, s: NestState, w: number, h: number, _th: Theme) {
  const fx = juice(s), X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w, lt = s.lt, t = s.t;
  const sc = devScale(ctx), sc2 = Math.min(2, sc), Q = (u: number) => u * sc2 * 1.15;
  const SX = (gx: number) => X(NX + gx * RX), SY = (gz: number) => Y(NY + gz * RY);
  const seenT = fx.memo.t ?? -1;
  let sn = 0;
  const snd = (n: Parameters<typeof fx.sound>[0], p = 1, v = 1) => void (sn++ < 3 && fx.sound(n, p, v));
  const puff = (x: number, y: number, col: string, n: number, spd = 3, size = 3) => {
    if (fx.particles.length < PART_MAX) fx.burst(x, y, col, Math.min(n, PART_MAX - fx.particles.length), spd, size);
  };
  const say = (x: number, y: number, str: string, col: string, size: number) => {
    while (fx.popups.length >= 5) fx.popups.shift();
    fx.pop(clamp(x, w * 0.1, w * 0.9), Math.max(Y(0.2), y), str, col, size);
  };
  if (s.phase !== 'play' && fx.memo.clr !== s.nest) (fx.memo.clr = s.nest), (fx.popups.length = 0);
  pumpBudget = s.phase === 'play' ? 5 : 12;
  prebake(s, w, sc2);
  idlePump();
  const ctr = (e: Egg) => [SX(e.x), SY(e.z) - e.r * RX * VS * w * EGG_H * 0.5] as const;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.save();
  fx.begin(ctx);
  ctx.drawImage(bakeBg(Math.round(w), Math.round(h), sc), 0, 0, w, h);
  // ── 살아 있는 나무: 햇살 먼지 · 나비 ──
  ctx.fillStyle = 'rgba(255,250,215,.8)';
  for (let i = 0; i < 8; i++) {
    const f = (t * 0.0035 + hsh(i)) % 1;
    ctx.globalAlpha = 0.6 * Math.sin(f * Math.PI);
    ell(ctx, X(0.15 + hsh(i + 9) * 0.5 + f * 0.12), Y(0.12 + f * 0.5), R(0.005), R(0.005));
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < 2; i++) {
    const p = t * 0.008 + i * 3.1, bx = X(0.3 + 0.25 * Math.sin(p * 0.7 + i) + i * 0.3), by = Y(0.3 + 0.08 * Math.sin(p * 1.3) + i * 0.05), fl = Math.abs(Math.sin(t * 0.35 + i));
    for (const sx of [-1, 1]) {
      ell(ctx, bx + sx * R(0.016) * fl, by, R(0.016) * fl + 0.8, R(0.021), sx * 0.4);
      ctx.fillStyle = i ? '#ff9ecb' : '#ffd84a';
      ctx.fill();
    }
  }
  // 둥실 내려오는 깃털 · 잎
  for (let i = 0; i < 3; i++) {
    const f = (t * (0.0022 + i * 0.0006) + i * 0.37) % 1, fx0 = X(0.12 + i * 0.33 + Math.sin(f * 9 + i) * 0.06), fy0 = Y(-0.05 + f * 1.45), a = Math.sin(f * 11 + i) * 0.8;
    ctx.save();
    ctx.translate(fx0, fy0);
    ctx.rotate(a);
    if (i === 1) leaf(ctx, -R(0.02), 0, R(0.045), 0, '#8fd468');
    else {
      ell(ctx, 0, 0, R(0.022), R(0.008));
      ctx.fillStyle = i ? '#ffd6c0' : '#ffffff';
      ctx.fill();
      ctx.strokeStyle = 'rgba(200,140,100,.6)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
  }
  // ── 엄마 새 (왼쪽 위 구석, 표정만) ──
  {
    let mp = M_IDLE;
    const mt = fx.memo.momT ?? -999, mpose = fx.memo.momP ?? 0;
    if (t - mt < (mpose === M_WOW ? 60 : mpose === M_HAPPY ? 16 : 30)) mp = mpose;
    else if (s.phase === 'result' || s.phase === 'end') mp = M_HAPPY;
    else if ((t + 37) % 220 < 8) mp = M_BLINK;
    const u = R(MU), hop = mp === M_WOW ? Math.abs(Math.sin((t - mt) * 0.3)) * R(0.016) : mp === M_HAPPY ? Math.abs(Math.sin((t - mt) * 0.3)) * R(0.008) : 0;
    ctx.save();
    ctx.translate(X(MX), Y(MY) - hop);
    const br = 1 + Math.sin(t * 0.05) * 0.015;
    ctx.scale(-1 / br, br);
    stamp(ctx, momSpr(mp, Q(u)), F_MOM, u);
    ctx.restore();
  }
  // ── 그림자 (한 번에) ──
  ctx.beginPath();
  for (const e of s.eggs) {
    if (e.st === 3) continue;
    const u = e.r * RX * VS * w * (e.st === 4 ? clamp(1 - (e.th - lt) / DROP_T, 0.2, 1) : 1);
    ctx.moveTo(SX(e.x) + u * 1.05, SY(e.z) + u * 0.12);
    ctx.ellipse(SX(e.x), SY(e.z) + u * 0.12, u * 1.05, u * 0.38, 0, 0, TAU);
  }
  ctx.fillStyle = 'rgba(90,50,10,.22)';
  ctx.fill();
  // ── 알·껍데기·아기 (앞뒤 순서) ──
  const items: { y: number; k: number; i: number }[] = [];
  const later: number[] = [], flying: number[] = [];
  const first = new Map<number, number>();
  s.babies.forEach((b, i) => first.has(b.sp) || first.set(b.sp, i));
  const bst = s.babies.map((b, i) => (lt - b.fr > 26 ? null : babyAt(s, b, i, first.get(b.sp) === i)));
  s.eggs.forEach((e, i) => (e.st === 4 ? flying.push(i) : e.st === 3 && lt - e.th > 14 ? 0 : items.push({ y: SY(e.z) + (e.st >= 2 ? 0.5 : 0), k: 0, i })));
  bst.forEach((b, i) => b && (b.late ? later.push(i) : items.push({ y: Y(NY + b.z * RY), k: 1, i })));
  items.sort((a, b) => a.y - b.y);
  const hint = s.phase === 'play' && s.taps > 0 && (s.firstTap < 0 || (lt - s.lastTap > 420 && !alive(s))) ? hintEgg(s) : -1;
  const spot = s.newT && lt < 300 ? s.newT : null;
  const drawEgg = (i: number) => {
    const e = s.eggs[i], u = e.r * RX * VS * w, bx = SX(e.x), by = SY(e.z), tilt = (e.h - 0.5) * 0.16;
    if (e.st === 3) {
      // 아기가 떠난 껍데기: 바스락 부서져 사라짐
      const f = (lt - e.th) / 14;
      ctx.save();
      ctx.globalAlpha = 1 - f;
      ctx.translate(bx, by);
      ctx.scale(1 + f * 0.3, 1 - f * 0.6);
      stamp(ctx, eggSpr(e.t, 0, 1, Q(u)), F_EGG, u);
      ctx.restore();
      return;
    }
    if (e.st === 2) {
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(tilt * 0.5);
      stamp(ctx, eggSpr(e.t, 0, 1, Q(u)), F_EGG, u);
      ctx.restore();
      const dt = lt - e.th;
      if (dt < 30) {
        const sd = e.h > 0.5 ? 1 : -1;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - Math.max(0, dt - 20) / 10);
        ctx.translate(bx + sd * dt * u * 0.14, by - u * 1.2 - dt * u * 0.3 + dt * dt * u * 0.016);
        ctx.rotate(sd * dt * 0.22);
        ctx.translate(0, u * 1.2);
        stamp(ctx, eggSpr(e.t, 0, 2, Q(u)), F_EGG, u);
        ctx.restore();
      }
      return;
    }
    let jx = 0, dy = 0, rot = tilt, sx = 1, sy = 1, crack = e.hp < e.hp0 ? 1 : 0;
    // 떨어져 들어오기 (둥지가 새로 차는 0.7초) · 엄마가 던진 알이 쏙 내려앉음
    const dl = e.h * 22, fall = clamp((lt - dl) / 14, 0, 1);
    if (e.fr === 1e9 && e.th > 0 && e.st === 0 && lt - e.th < 10) {
      const q = (lt - e.th) / 10;
      (sy = 1 - 0.18 * Math.sin(q * Math.PI)), (sx = 1 + 0.12 * Math.sin(q * Math.PI));
    } else if (fall < 1) dy = -((1 - fall) ** 2) * R(0.5);
    else if (lt - dl < 24) {
      const q = (lt - dl - 14) / 10;
      (sy = 1 - 0.14 * Math.sin(q * Math.PI)), (sx = 1 + 0.1 * Math.sin(q * Math.PI));
    }
    // 안에서 들썩들썩 (금 간 알은 더 자주) · 가끔 콩 뛰어오름
    const per = crack ? 80 : 170, wt = (s.t + Math.floor(e.h * 997)) % per;
    if (wt < 28) rot += Math.sin(wt * 0.75) * (crack ? 0.22 : 0.17) * (1 - wt / 28);
    const hop = (s.t + Math.floor(e.h * 4999)) % 330;
    if (hop < 16 && e.st === 0) {
      dy -= Math.sin((hop / 16) * Math.PI) * u * 0.35;
      if (hop > 10) (sy *= 0.93), (sx *= 1.05);
    }
    if (lt - e.tc < 12) (jx = Math.sin((lt - e.tc) * 2.6) * u * 0.18 * (1 - (lt - e.tc) / 12)), (sx *= 1.05);
    if (e.st === 1) {
      const tot = e.tap ? TAP_T : HIT_T, pr = clamp(1 - (e.th - lt) / tot, 0, 1);
      crack = pr > 0.35 || !e.tap ? 2 : 1;
      jx = Math.sin(lt * 2.9 + e.h * 9) * u * 0.16 * (0.4 + pr);
      sx *= 1 + 0.12 * pr;
      sy *= 1 + 0.1 * pr;
    }
    if (spot === e.t || i === hint) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.15);
      ell(ctx, bx, by - u * 1.1, u * 1.7, u * 1.9);
      ctx.fillStyle = `rgba(255,250,200,${0.25 + 0.3 * pulse})`;
      ctx.fill();
    }
    ctx.save();
    ctx.translate(bx + jx, by + dy);
    ctx.rotate(rot);
    ctx.scale(sx, sy);
    stamp(ctx, eggSpr(e.t, crack, 0, Q(u)), F_EGG, u);
    ctx.restore();
  };
  /** 엄마 새가 던진 알: 엄마 부리에서 빈자리로 포물선 */
  const drawFlying = (i: number) => {
    const e = s.eggs[i], u = e.r * RX * VS * w, f = clamp(1 - (e.th - lt) / DROP_T, 0, 1), sd = e.h > 0.5 ? 1 : -1;
    const x0 = X(MX + 0.07), y0 = Y(MY - 0.07), x1 = SX(e.x), y1 = SY(e.z);
    ctx.globalAlpha = 0.5 * f;
    ell(ctx, x1, y1 - u * 0.1, u * 1.2 * (1.4 - f * 0.4), u * 0.45 * (1.4 - f * 0.4));
    ctx.strokeStyle = '#fff6c8';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.translate(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f * f - Math.sin(f * Math.PI) * R(0.1));
    ctx.rotate(sd * (1 - f) * 3);
    ctx.scale(0.7 + 0.3 * f, 0.7 + 0.3 * f);
    stamp(ctx, eggSpr(e.t, 0, 0, Q(u)), F_EGG, u);
    ctx.restore();
  };
  const drawBaby = (i: number) => {
    const b = bst[i]!, bb = s.babies[i];
    const u = bb.r * RX * VS * w * (bb.big ? 1.25 : 1.0), x = X(NX + b.x * RX), y = Y(NY + b.z * RY) - b.lift * u;
    const dt = s.lt - bb.t0;
    if (dt < 8) {
      // 쩍! 만화 같은 별 터짐 (아기 뒤)
      const f = dt / 8, r0 = u * (1.6 + f * 1.4);
      ctx.globalAlpha = 1 - f * 0.8;
      starPath(ctx, x, Y(NY + b.z * RY) - u * 1.3, r0, 0.55, f * 0.6, 9);
      ink(ctx, dt < 3 ? '#ffffff' : '#fff3a8', 2.5, '#ffb52a');
      ctx.globalAlpha = 1;
    }
    ctx.save();
    ctx.globalAlpha = b.alpha;
    ctx.translate(x, y);
    if (b.rot) ctx.rotate(b.rot);
    ctx.scale(b.flip ? -b.sc : b.sc, b.sc * b.sy);
    stamp(ctx, babySpr(bb.sp, b.pose, Q(u)), F_BABY, u);
    ctx.restore();
    ctx.globalAlpha = 1;
    if (b.isNew) {
      // 처음 본 아기: 반짝반짝 + 작은 NEW 딱지
      const f = (lt - bb.t0) / 70;
      ctx.globalAlpha = Math.min(1, (1 - f) * 2.5);
      for (let k = 0; k < 4; k++) {
        const a = k * 1.57 + lt * 0.08;
        starPath(ctx, x + Math.cos(a) * u * 1.5, y - u * 1.2 + Math.sin(a) * u * 1.2, u * (0.26 + 0.1 * Math.sin(lt * 0.3 + k)), 0.3, 0, 4);
        ctx.fillStyle = k % 2 ? '#ff9ecb' : '#fff3a0';
        ctx.fill();
      }
      gtext(ctx, 'NEW', x, y - u * 2.75, Math.max(12, u * 0.62), 900, '#ffffff', '#ff4f7a', 4);
      ctx.globalAlpha = 1;
    }
  };
  for (const it of items) it.k ? drawBaby(it.i) : drawEgg(it.i);
  ctx.drawImage(bakeFront(Math.round(w), sc), 0, Y(FRONT_Y0), w, Y(FRONT_Y1 - FRONT_Y0));
  for (const i of later) drawBaby(i);
  for (const i of flying) drawFlying(i);
  // ── 하는 짓 (불·물·쿵·번개·반짝) ──
  for (const b of s.babies) effect(ctx, s, b, w, X, Y, R);
  // ── 손가락 ──
  if (hint >= 0) {
    const e = s.eggs[hint], [hx, hy] = ctr(e), press = Math.max(0, Math.sin(t * 0.13));
    ctx.beginPath();
    ctx.arc(hx, hy, R(0.03) + press * R(0.025), 0, TAU);
    ctx.strokeStyle = `rgba(255,255,255,${0.9 - press * 0.6})`;
    ctx.lineWidth = 3;
    ctx.stroke();
    drawHand(ctx, hx + R(0.035), hy + R(0.06) + press * R(0.012), R(0.11));
  }
  // ── 처음 보는 아기 스포트라이트 (0.4초) ──
  {
    const f = (t - (fx.memo.spotT ?? -999)) / 24;
    if (f >= 0 && f < 1) {
      const str = f < 0.2 ? f / 0.2 : 1 - (f - 0.2) / 0.8, bx = SX(fx.memo.spotX ?? 0), by = SY(fx.memo.spotZ ?? 0) - R(0.06);
      ctx.fillStyle = radg(ctx, bx, by, R(0.09), R(0.8), [0, 'rgba(40,20,5,0)'], [0.18, `rgba(40,20,5,${0.42 * str})`], [1, `rgba(40,20,5,${0.5 * str})`]);
      ctx.fillRect(0, 0, w, h);
      ctx.beginPath();
      ctx.moveTo(bx - R(0.04), 0);
      ctx.lineTo(bx + R(0.04), 0);
      ctx.lineTo(bx + R(0.1), by + R(0.05));
      ctx.lineTo(bx - R(0.1), by + R(0.05));
      ctx.closePath();
      ctx.fillStyle = `rgba(255,248,205,${0.28 * str})`;
      ctx.fill();
    }
  }

  // 둥지가 새로 찰 때 톡톡톡 내려앉는 소리
  if (s.phase === 'play' && lt < 40 && fx.memo.landLt !== lt) {
    fx.memo.landLt = lt;
    for (const e of s.eggs) if (Math.floor(e.h * 22) + 14 === lt) snd('tick', 0.7 + e.h * 0.6, 0.35);
  }
  // ── 방금 일어난 일: 소리 · 가루 · 흔들림 · 숫자 (한 번만) ──
  for (const ev0 of s.events) {
    if (ev0.t <= seenT) continue;
    const e = ev0.k === 'tap' || ev0.k === 'crack' ? s.eggs[ev0.k === 'tap' ? ev0.n : ev0.m] : null;
    const ex = SX(ev0.x), ez = SY(ev0.z), u = R(0.045);
    switch (ev0.k) {
      case 'nest':
        snd('whoosh', 0.9, 0.6);
        snd('chime', 1.1, 0.4);
        break;
      case 'tap': {
        const [cx, cy] = e ? ctr(e) : [ex, ez];
        snd('crack', 1.45, 0.75);
        snd('tick', 1.3, 0.6);
        fx.ring(cx, cy, '#ffffff', R(0.07), 4);
        puff(cx, cy - u * 0.6, EGG_COL[e ? e.t : 'spot'][1], 6, 3, 2.6);
        puff(cx, cy, '#ffffff', 4, 2.5, 2);
        fx.kick(3);
        break;
      }
      case 'crack': {
        const [cx, cy] = e ? ctr(e) : [ex, ez];
        if (ev0.n === 1) snd('tick', 0.9 + hsh(ev0.t) * 0.5, 0.55), snd('crack', 1.9, 0.3);
        puff(cx, cy - u * 0.5, e ? EGG_COL[e.t][1] : '#ffffff', 3, 2.2, 2);
        break;
      }
      case 'hatch': {
        const k = ev0.n, big = k >= 6, cy = ez - u * 1.3;
        snd('crack', 0.8 + hsh(ev0.t + k) * 0.2, 0.8);
        snd('pop', pitchOf(k), 0.95);
        const se = s.eggs.find((q) => q.x === ev0.x && q.z === ev0.z);
        puff(ex, cy, se ? EGG_COL[se.t][1] : '#fff3d6', 7, 3.6, 2.8);
        puff(ex, cy, '#ffffff', 4 + Math.min(6, k), 3 + Math.min(3, k * 0.2), 2.4);
        fx.kick(2 + Math.min(6, k * 0.35));
        if (big) fx.ring(ex, cy, kcol(k), R(0.06 + Math.min(0.08, k * 0.004)), 3);
        fx.memo.hatchT = t;
        fx.memo.hatchX = ev0.x;
        fx.memo.hatchZ = ev0.z;
        fx.memo.bumpT = t;
        if (fx.memo.momP !== M_WOW || t - (fx.memo.momT ?? 0) > 50) (fx.memo.momT = t), (fx.memo.momP = M_HAPPY);
        break;
      }
      case 'new': {
        // 처음 보는 아기: 0.4초 스포트라이트 + 고유 울음 (연쇄는 안 멈춘다)
        const rare = SP[ev0.m].rare;
        for (const [n0, p0] of CRY[ev0.m]) fx.sound(n0, p0, 0.9);
        fx.memo.spotT = t;
        fx.memo.spotX = ev0.x;
        fx.memo.spotZ = ev0.z;
        if (rare) (snd('swell', 1, 1), fx.blink('#fff6c8', 0.5), fx.kick(12), puff(ex, ez - u * 2, '#ffd84a', 20, 6, 3.4));
        fx.ring(ex, ez - u * 1.4, rare ? '#ffd84a' : '#ff9ecb', R(rare ? 0.3 : 0.14), rare ? 6 : 4);
        if (!rare) (puff(ex, ez - u * 1.8, '#ff9ecb', 6, 3.5, 2.6), puff(ex, ez - u * 1.8, '#fff3a0', 6, 3.5, 2.6), fx.blink('#fff8e0', 0.12));
        if (rare) say(X(0.5), Y(0.5), 'NEW!', '#ffd84a', 44);
        fx.memo.momT = t;
        fx.memo.momP = M_WOW;
        break;
      }
      case 'rare':
        snd('swell', 1.1, 0.8);
        fx.blink('#fff6c8', 0.3);
        puff(ex, ez - u * 2, '#ffd84a', 14, 5, 3);
        break;
      case 'combo':
        snd('ding', 0.9 + Math.min(1, ev0.n / 30), 0.9);
        fx.kick(7);
        fx.ring(X(0.5), Y(NY), kcol(ev0.n), R(0.45), 6);
        fx.memo.cheerT = t;
        fx.memo.momT = t;
        fx.memo.momP = M_WOW;
        break;
      case 'act': {
        const fam = SP[ev0.m].fam;
        if (fam === 'peck') snd('tick', 2.2, 0.6);
        else if (fam === 'fire') (snd('whoosh', 1.5, 0.9), snd('zap', 0.6, 0.6), fx.kick(4));
        else if (fam === 'splash') snd('splash', 1.1, 0.9);
        else if (fam === 'roll') (snd('whoosh', 0.7, 0.8), snd('boing', 0.6, 0.5));
        else if (fam === 'hop') snd('boing', 1.3, 0.8);
        else if (fam === 'stomp') (snd('thud', 0.5, 1.4), snd('crack', 0.6, 0.8), fx.kick(14), fx.blink('#fff1c8', 0.25), puff(ex, ez, '#e6c48a', 14, 5, 3.2));
        else if (fam === 'zap') (snd('zap', 1.4, 0.9), fx.kick(5), fx.blink('#e8f0ff', 0.2));
        else if (fam === 'gold') (snd('coin', 1, 0.9), snd('chime', 1.3, 0.8), puff(ex, ez - u, '#ffd23a', 16, 5, 3));
        break;
      }
      case 'chainEnd': {
        // 연쇄가 꺼짐: 합계 하나만 크게
        const k = ev0.n;
        fx.memo.endT = t;
        fx.memo.endK = k;
        fx.memo.endPts = ev0.m;
        if (k >= 3) snd('coin', 0.8 + Math.min(0.6, k / 60), 0.9), snd('chime', 0.9 + Math.min(0.5, k / 80), 0.8);
        if (k >= 25) {
          fx.blink('#fff6c8', 0.35);
          fx.kick(10);
          for (let j = 0; j < 6; j++) fx.burst(X(0.12 + j * 0.15), Y(0.62 + (j % 2) * 0.12), ['#ffd84a', '#ff9ecb', '#8fd3ff', '#9de884', '#ffab3a', '#c39bff'][j], 8, 6.5, 3.4);
          fx.memo.cheerT = t;
          fx.memo.momT = t;
          fx.memo.momP = M_WOW;
        }
        break;
      }
      case 'drop':
        snd('whoosh', 1.9, 0.25);
        if (fx.memo.momP !== M_WOW || t - (fx.memo.momT ?? 0) > 50) (fx.memo.momT = t), (fx.memo.momP = M_HAPPY);
        break;
      case 'land':
        snd('tick', 1.0 + hsh(ev0.n) * 0.5, 0.45);
        puff(ex, ez, '#e6c48a', 3, 1.8, 2.2);
        break;
      case 'out':
        snd('swell', 0.7, 0.4);
        break;
      case 'result':
        snd('clear', 1, 0.9);
        break;
      case 'final':
        snd(ev0.n ? 'clear' : 'fail', 0.85, 1);
        break;
      case 'mom':
        snd('boing', 1.6, 0.7);
        snd('pop', 1.8, 0.5);
        puff(X(MX + 0.02), Y(MY - 0.1), '#ffb08a', 6, 3, 2.4);
        fx.memo.momT = t;
        fx.memo.momP = M_HAPPY;
        break;
      case 'baby':
        snd('pop', 2.1, 0.6);
        fx.memo.pokeT = t;
        fx.memo.pokeI = ev0.n;
        break;
      case 'straw':
        snd('tick', 0.7, 0.4);
        puff(ex, ez, '#e6c48a', 5, 2.2, 2.2);
        break;
      case 'empty':
        snd('tick', 0.6, 0.6);
        fx.memo.emptyT = t;
        break;
    }
  }
  fx.memo.t = t;
  ctx.restore();
  drawHud(ctx, s, w, h);
}

interface BState { x: number; z: number; lift: number; pose: number; sc: number; sy: number; flip: boolean; rot: number; late: boolean; isNew: boolean; alpha: number }
/** 아기 한 마리의 지금 모습 (그리기 전용 — 시뮬레이션은 안 바꾼다) */
function babyAt(s: NestState, b: Baby, idx: number, firstOfSp: boolean): BState {
  const lt = s.lt, d = SP[b.sp], dt = lt - b.t0, fx = juice(s);
  const o: BState = { x: b.x, z: b.z, lift: 0, pose: P_SIT, sc: 1, sy: 1, flip: b.dx < 0, rot: 0, late: false, isNew: false, alpha: 1 };
  o.isNew = firstOfSp && s.nestNew.includes(b.sp) && dt < 70;
  if (lt >= b.fr) {
    // 다 놀았으면 둥지 밖으로 콩 — 뒤쪽 테두리 너머로
    const f = clamp((lt - b.fr) / 24, 0, 1);
    o.x = b.x * (1 - f * 0.2);
    o.z = b.z + (-1.3 - b.z) * f;
    o.lift = Math.sin(f * Math.PI) * 2.2 + f * 1.2;
    o.sc = 1 - f * 0.35;
    o.alpha = 1 - f * f;
    o.pose = P_CHEER;
    o.late = f > 0.15;
    return o;
  }
  if (dt < POP_T + 6) {
    // 뿅: 껍데기에서 튀어 올랐다 쏙 앉는다
    const f = clamp(dt / (POP_T + 6), 0, 1);
    o.lift = f < 0.45 ? -1.3 + (f / 0.45) * 2.6 : 1.3 * (1 - (f - 0.45) / 0.55) ** 2 * 1.0;
    o.sc = f < 0.45 ? 0.7 + (f / 0.45) * 0.55 : 1.25 - 0.25 * ((f - 0.45) / 0.55);
    o.sy = f < 0.45 ? 1.15 : f > 0.85 ? 0.88 + (1 - f) * 0.6 : 1;
    o.pose = P_POP;
    return o;
  }
  if (lt < b.ta) {
    o.pose = dt < POP_T + 10 ? P_POP : P_SIT;
    if (d.fam === 'fire' && b.ta - lt < 16) {
      // 에… 에… 엣취!
      const f = 1 - (b.ta - lt) / 16;
      o.pose = P_ACT;
      o.sy = 1 + 0.12 * f;
      o.rot = (o.flip ? 1 : -1) * 0.25 * f;
    }
    if (d.fam === 'stomp' && b.ta - lt < 14) (o.lift = (1 - (b.ta - lt) / 14) * 0.8), (o.pose = P_ACT);
    return o;
  }
  if (lt < b.te) {
    o.pose = P_ACT;
    const p = b.path;
    if (d.fam === 'roll') {
      let k = 0;
      while (k + 3 < p.length && p[k + 5] <= lt) k += 3;
      if (k + 3 < p.length) {
        const f = clamp((lt - p[k + 2]) / Math.max(1, p[k + 5] - p[k + 2]), 0, 1);
        (o.x = p[k] + (p[k + 3] - p[k]) * f), (o.z = p[k + 1] + (p[k + 4] - p[k + 1]) * f);
        o.rot = (lt - b.ta) * 0.5 * (b.dx < 0 ? -1 : 1);
      } else (o.x = b.ex), (o.z = b.ez), (o.pose = lt - (p[p.length - 1] ?? b.ta) < 10 ? P_POP : P_SIT);
      o.late = false;
    } else if (d.fam === 'hop' && p.length) {
      let px = b.x, pz = b.z, t0 = b.ta, k = 0;
      while (k < p.length && p[k + 2] <= lt) (px = p[k]), (pz = p[k + 1]), (t0 = p[k + 2]), (k += 3);
      if (k < p.length) {
        const f = clamp((lt - t0) / Math.max(1, p[k + 2] - t0), 0, 1);
        (o.x = px + (p[k] - px) * f), (o.z = pz + (p[k + 1] - pz) * f);
        o.lift = Math.sin(f * Math.PI) * 2.2;
        o.flip = p[k] < px;
        o.late = true;
      } else (o.x = px), (o.z = pz), (o.pose = P_CHEER);
    } else if (d.fam === 'peck' && p.length) {
      const k = Math.min(p.length / 3 - 1, Math.floor((lt - b.ta) / 8));
      o.flip = p[k * 3] < b.x;
      o.rot = (o.flip ? -1 : 1) * 0.35 * Math.max(0, Math.sin(((lt - b.ta) % 8) / 8 * Math.PI));
    } else if (d.fam === 'stomp') {
      const f = (lt - b.ta) / 10;
      o.lift = f < 1 ? 0 : 0;
      o.sy = f < 1 ? 0.8 + 0.2 * f : 1;
      o.sc = 1.05;
    } else if (d.fam === 'splash') o.sy = 1 + 0.08 * Math.sin((lt - b.ta) * 0.6);
    return o;
  }
  // 자기 껍데기로 콩 (굴러간·뛰어간 아기)
  const away = hyp(b.ex - b.x, b.ez - b.z) > 0.02, ht = lt - b.te;
  if (away && ht < 22) {
    const f = clamp(ht / 22, 0, 1);
    o.x = b.ex + (b.x - b.ex) * f;
    o.z = b.ez + (b.z - b.ez) * f;
    o.lift = Math.sin(f * Math.PI) * 2.4;
    o.pose = P_CHEER;
    o.flip = b.x < b.ex;
    o.late = true;
    return o;
  }
  o.flip = b.x > 0.15 ? true : b.x < -0.15 ? false : b.dx < 0;
  const cheer = s.t - (fx.memo.cheerT ?? -999), poke = s.t - (fx.memo.pokeT ?? -999) < 24 && fx.memo.pokeI === idx;
  const ph = b.e * 37 + b.sp * 11, near = s.t - (fx.memo.hatchT ?? -999) < 14 && hyp((fx.memo.hatchX ?? 9) - b.x, (fx.memo.hatchZ ?? 9) - b.z) < 0.45;
  if (cheer < 70 || poke || s.phase === 'result' || s.phase === 'end') {
    o.pose = P_CHEER;
    o.lift = Math.abs(Math.sin((s.t + ph) * 0.22)) * (poke ? 1.6 : 0.9);
  } else if (near) {
    o.pose = P_POP;
    o.lift = Math.sin(((s.t - (fx.memo.hatchT ?? 0)) / 14) * Math.PI) * 0.5;
  } else {
    o.pose = (s.t + ph) % 260 < 9 ? P_BLINK : P_SIT;
    o.sy = 1 + 0.03 * Math.sin((s.t + ph) * 0.08);
  }
  return o;
}

/** 아기가 하는 짓의 효과 그림 */
function effect(ctx: C2, s: NestState, b: Baby, w: number, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number) {
  const lt = s.lt, d = SP[b.sp];
  if (lt < b.ta - 2 || lt > b.te + 12) return;
  const SX = (gx: number) => X(NX + gx * RX), SY = (gz: number) => Y(NY + gz * RY), u = R(0.045) * (b.big ? 1.5 : 1);
  const P = (gx: number, gz: number, lift = 0) => [SX(gx), SY(gz) - lift] as const;
  switch (d.fam) {
    case 'fire': {
      // 에취! 불 뭉치가 줄지어 뿜어져 나간다 (멀수록 크게, 노랑 → 주황 → 빨강)
      const f = lt - b.ta, a0 = Math.atan2(b.dz, b.dx), dirs = d.fan > 1 ? [a0 - 0.55, a0, a0 + 0.55] : [a0];
      const len = Math.min(d.L, Math.max(0, f) / 9), fade = clamp(1 - (f - d.L * 9) / 22, 0, 1);
      if (f < 0 || len <= 0) return;
      const N = 9, rw = R(d.w * RX) * 1.5;
      for (const a of dirs) {
        const cx = Math.cos(a), cz = Math.sin(a);
        for (const [lay, k0] of [[0, 1], [1, 0.66], [2, 0.36]] as [number, number][]) {
          for (let j = 0; j < N; j++) {
            const q = (j + 0.5) / N, gx = b.x + cx * (0.06 + len * q), gz = b.z + cz * (0.06 + len * q);
            const jit = Math.sin(lt * 1.3 + j * 2.1 + lay) * 0.15, [px, py] = P(gx, gz, u * (1.1 - q * 0.5));
            const r0 = rw * (0.35 + q * 0.9) * k0 * (1 + jit) * (0.6 + 0.4 * fade);
            ell(ctx, px + jit * rw * 0.3, py - jit * rw * 0.3, r0, r0 * 0.85);
            ctx.globalAlpha = fade * (lay ? 1 : 0.85);
            ctx.fillStyle = lay === 0 ? (d.fan > 1 ? ['#ff6ad0', '#8a6aff', '#5ad0ff'][j % 3] : q > 0.6 ? '#e8402a' : '#ff6a2a') : lay === 1 ? '#ffae3a' : '#fff6b8';
            ctx.fill();
          }
        }
      }
      ctx.globalAlpha = 1;
      if (f % 3 === 0 && f < d.L * 9) {
        const fx = juice(s), [ex, ey] = P(b.x + Math.cos(a0) * len, b.z + Math.sin(a0) * len, u * 0.6);
        if (fx.particles.length < PART_MAX) fx.burst(ex, ey, '#ffb03a', 2, 2, 2.4);
      }
      return;
    }
    case 'splash': {
      const f = lt - b.ta;
      const [bx, by] = P(b.x, b.z, u * 1.9);
      if (f < 14) {
        const hh = R(0.05 + 0.1 * Math.min(1, (f + 2) / 6));
        ctx.fillStyle = lin(ctx, bx, by - hh, bx, by, [0, 'rgba(200,236,255,.95)'], [1, 'rgba(90,170,255,.9)']);
        rr(ctx, bx - R(0.012), by - hh, R(0.024), hh, R(0.012));
        ctx.fill();
      }
      for (let k = 0; k < 12; k++) {
        const a = hsh(b.e * 13 + k) * TAU, q = Math.sqrt(hsh(b.e * 7 + k + 3)) * d.r, tx = b.x + Math.cos(a) * q, tz = b.z + Math.sin(a) * q;
        const t0 = 4 + Math.round(q * 10) + 6, ff = (f - (t0 - 10)) / 10;
        if (ff < 0 || ff > 1.6) continue;
        const [x1, y1] = P(tx, tz);
        if (ff <= 1) {
          const x = bx + (x1 - bx) * ff, y = by - R(0.14) + (y1 - by + R(0.14)) * ff - Math.sin(ff * Math.PI) * R(0.08);
          ell(ctx, x, y, R(0.008), R(0.012));
          ctx.fillStyle = '#5ab0ff';
          ctx.fill();
        } else {
          ctx.globalAlpha = 1 - (ff - 1) / 0.6;
          ell(ctx, x1, y1, R(0.03) * ff, R(0.012) * ff);
          ctx.strokeStyle = '#bfe6ff';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
      return;
    }
    case 'stomp': {
      const f = lt - b.ta;
      if (f < 0 || f > 22) return;
      const R0 = d.r * (s.eggs[b.e].tap ? 0.62 : 1) * Math.min(1, f / 10);
      ctx.globalAlpha = 1 - f / 22;
      ell(ctx, SX(b.x), SY(b.z), R0 * RX * w, R0 * RY * w);
      ctx.strokeStyle = '#fff3c8';
      ctx.lineWidth = 6 * (1 - f / 22) + 1;
      ctx.stroke();
      ell(ctx, SX(b.x), SY(b.z), R0 * RX * w * 0.85, R0 * RY * w * 0.85);
      ctx.strokeStyle = '#c99a55';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.globalAlpha = 1;
      return;
    }
    case 'gold': {
      const f = lt - b.ta;
      if (f < 0 || f > 26) return;
      ctx.globalAlpha = 1 - f / 26;
      const R0 = d.r * Math.min(1, f / 12);
      ell(ctx, SX(b.x), SY(b.z), R0 * RX * w, R0 * RY * w);
      ctx.strokeStyle = '#ffd23a';
      ctx.lineWidth = 4;
      ctx.stroke();
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU + f * 0.05;
        starPath(ctx, SX(b.x + Math.cos(a) * R0), SY(b.z + Math.sin(a) * R0) - R(0.02), R(0.012), 0.3, 0, 4);
        ctx.fillStyle = '#fff6b0';
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      return;
    }
    case 'zap': {
      const p = b.path;
      let px = b.x, pz = b.z;
      for (let k = 0; k < p.length; k += 3) {
        const tt = p[k + 2], age = lt - tt;
        if (age > -5 && age < 8) {
          const [x0, y0] = P(px, pz, u * 1.2), [x1, y1] = P(p[k], p[k + 1], u * 1.1);
          const pts: number[] = [x0, y0];
          for (let j = 1; j < 6; j++) {
            const f = j / 6, jit = (hsh(j + k * 7 + Math.floor(lt / 2) * 3) - 0.5) * R(0.04);
            pts.push(x0 + (x1 - x0) * f + jit, y0 + (y1 - y0) * f + jit * 0.6);
          }
          pts.push(x1, y1);
          ctx.globalAlpha = age < 0 ? 0.5 : 1 - age / 8;
          line(ctx, pts, '#7fb2ff', 7);
          line(ctx, pts, '#ffffff', 2.5);
          ctx.globalAlpha = 1;
        }
        (px = p[k]), (pz = p[k + 1]);
      }
      return;
    }
    case 'peck': {
      const p = b.path;
      for (let k = 0; k < p.length; k += 3) {
        const age = lt - p[k + 2];
        if (age < 0 || age > 10) continue;
        const [x, y] = P(p[k], p[k + 1], R(0.06));
        starPath(ctx, x, y, R(0.02) * (1 + age * 0.08), 0.45, age * 0.2);
        ctx.globalAlpha = 1 - age / 10;
        ink(ctx, '#fff6b0', 1.5, '#e0a020');
        ctx.globalAlpha = 1;
      }
      return;
    }
    case 'roll': {
      const f = lt - b.ta;
      if (f >= 0 && f % 4 === 0 && lt < b.te - 14) {
        const st = babyAt(s, b, 0, false), fx = juice(s);
        if (fx.particles.length < PART_MAX) fx.burst(SX(st.x), SY(st.z), '#e6c48a', 2, 1.6, 2.4);
      }
      return;
    }
  }
}
function drawHand(ctx: C2, x: number, y: number, k: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.35);
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-k * 0.13, -k * 0.05);
  ctx.lineTo(-k * 0.13, -k * 0.62);
  ctx.quadraticCurveTo(0, -k * 0.75, k * 0.13, -k * 0.62);
  ctx.lineTo(k * 0.13, -k * 0.2);
  ctx.quadraticCurveTo(k * 0.45, -k * 0.25, k * 0.42, k * 0.05);
  ctx.quadraticCurveTo(k * 0.4, k * 0.45, 0, k * 0.5);
  ctx.quadraticCurveTo(-k * 0.38, k * 0.45, -k * 0.38, k * 0.12);
  ctx.quadraticCurveTo(-k * 0.38, -k * 0.08, -k * 0.13, -k * 0.05);
  ctx.closePath();
  ink(ctx, '#ffffff', Math.max(2, k * 0.05));
  ell(ctx, 0, -k * 0.55, k * 0.08, k * 0.05);
  ctx.fillStyle = '#ffd6e0';
  ctx.fill();
  ctx.restore();
}

// ───────────────────────────── 띠 · 카드 ─────────────────────────────
function starIcon(ctx: C2, x: number, y: number, r: number, on: boolean) {
  starPath(ctx, x, y, r, 0.48);
  ink(ctx, on ? radg(ctx, x - r * 0.3, y - r * 0.3, 0, r * 1.3, [0, '#fff6b0'], [1, '#ffb800']) : 'rgba(150,110,70,.25)', Math.max(1.5, r * 0.14), on ? '#a86a00' : 'rgba(120,80,40,.45)');
}
function drawHud(ctx: C2, s: NestState, w: number, h: number) {
  const fx = juice(s), X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w, t = s.t;
  const disp = fx.memo.disp ?? 0, nd = Math.abs(s.pts - disp) < 0.6 ? s.pts : disp + (s.pts - disp) * 0.16;
  fx.memo.disp = nd;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // ── 위 띠: 최고 · 점수 · 둥지 ──
  rr(ctx, X(0.025), Y(0.016), X(0.95), Y(0.088), Y(0.044));
  ctx.fillStyle = 'rgba(255,250,236,.92)';
  ctx.fill();
  ctx.strokeStyle = '#e2b46a';
  ctx.lineWidth = 2;
  ctx.stroke();
  gtext(ctx, `최고 ${s.best}`, X(0.06), Y(0.061), R(0.036), 800, '#a8875f', '', 0, 'left');
  const bump = clamp(1 - (t - (fx.memo.bumpT ?? -99)) / 12, 0, 1);
  ctx.font = `900 ${Math.round(R(0.066) * (1 + bump * 0.16))}px system-ui, sans-serif`;
  ctx.lineJoin = 'round';
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#ffffff';
  const str = String(Math.round(nd));
  ctx.strokeText(str, X(0.5), Y(0.062));
  ctx.fillStyle = bump > 0 ? '#e0641a' : '#7a4214';
  ctx.fillText(str, X(0.5), Y(0.062));
  gtext(ctx, `둥지 ${s.nest + 1}/${NESTS}`, X(0.855), Y(0.061), R(0.04), 800, '#7a4214', '', 0);
  if (s.phase === 'play') {
    // ── 별 셋 (쉬운 말): 아기 N마리 · 새 친구 · 한 번에 N마리 ──
    const by = Y(0.137), ch = R(0.042), goals = [`아기 ${Math.min(s.hatched, HATCH_GOAL[s.nest])}/${HATCH_GOAL[s.nest]}`, '새 친구', `한 번에 ${CHAIN_GOAL[s.nest]}`];
    const ok = [s.hatched >= HATCH_GOAL[s.nest], s.nestNew.length > 0 || s.newHit, s.maxChain >= CHAIN_GOAL[s.nest]];
    const xs = [0.04, 0.37, 0.64], ws = [0.3, 0.24, 0.32];
    for (let j = 0; j < 3; j++) {
      rr(ctx, X(xs[j]), by - ch / 2, X(ws[j]), ch, ch / 2);
      ctx.fillStyle = ok[j] ? 'rgba(255,238,160,.96)' : 'rgba(255,250,236,.9)';
      ctx.fill();
      ctx.strokeStyle = ok[j] ? '#e0a020' : '#d8a860';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      if (j === 0 && !ok[0]) {
        rr(ctx, X(xs[0]) + 2, by - ch / 2 + 2, (X(ws[0]) - 4) * clamp(s.hatched / HATCH_GOAL[s.nest], 0, 1), ch - 4, ch / 2);
        ctx.fillStyle = 'rgba(255,214,90,.55)';
        ctx.fill();
      }
      starIcon(ctx, X(xs[j]) + ch * 0.55, by, R(0.018), ok[j]);
      gtext(ctx, goals[j], X(xs[j] + ws[j] / 2) + ch * 0.3, by + 0.5, R(0.034), 800, '#7a4214', '', 0);
    }
    // ── ×N (엄마 새 옆): 꺼지기 전 남은 시간 고리 · 꺼지면 합계 하나 ──
    const k = s.combo, live = alive(s), cx = X(0.34), cy = Y(0.265);
    if (live && k >= 1) {
      const pop = clamp(1 - (t - (fx.memo.bumpT ?? -99)) / 10, 0, 1), sz = R(0.06) + Math.min(R(0.05), k * R(0.0012));
      if (s.pend === 0) {
        const left = clamp(1 - (s.lt - s.lastEv) / GRACE, 0, 1);
        ctx.beginPath();
        ctx.arc(cx - sz * 0.55, cy, sz * 0.62, -Math.PI / 2, -Math.PI / 2 + TAU * left);
        ctx.strokeStyle = left < 0.35 && t % 10 < 5 ? '#ff4f7a' : '#ffffff';
        ctx.lineWidth = 4;
        ctx.stroke();
      }
      ctx.save();
      ctx.translate(cx - sz * 0.55, cy + sz * 0.42);
      stamp(ctx, babySpr(0, P_CHEER, sz * 0.5 * 2.3), F_BABY, sz * 0.4);
      ctx.restore();
      ctx.font = `900 ${Math.round(sz * (1 + pop * 0.3))}px system-ui, sans-serif`;
      ctx.textAlign = 'left';
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#7a3a10';
      ctx.strokeText(`×${k}`, cx, cy);
      ctx.fillStyle = kcol(k);
      ctx.fillText(`×${k}`, cx, cy);
      ctx.textAlign = 'center';
    }
    const ea = t - (fx.memo.endT ?? -999);
    if (!live && ea < 80 && (fx.memo.endK ?? 0) >= 2) {
      const f = ea / 80, p = easeBack(clamp(ea / 10, 0, 1));
      ctx.globalAlpha = clamp((1 - f) * 3, 0, 1);
      ctx.save();
      ctx.translate(X(0.42), Y(0.265) - f * R(0.03));
      ctx.scale(p, p);
      gtext(ctx, `+${fx.memo.endPts ?? 0}`, 0, 0, R(0.075) + Math.min(R(0.04), (fx.memo.endK ?? 0) * R(0.0008)), 900, '#ffd84a', '#7a3a10', 6);
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    // ── 둥지 시작: 둥지 이름 · 새 알 (첫 톡에서 걷힌다) ──
    const bl = s.taps === TAPS ? 150 : s.taps === TAPS - 1 ? Math.min(150, s.lastTap + 10) : 0;
    if (s.lt < bl && s.nest > 0) {
      ctx.globalAlpha = clamp((bl - s.lt) / 10, 0, 1) * clamp(s.lt / 6, 0, 1);
      gtext(ctx, `둥지 ${s.nest + 1}`, X(0.62), Y(0.215), R(0.06), 900, '#ffffff', '#7a4214', 6);
      if (s.newT) {
        const u = R(0.026);
        ctx.save();
        ctx.translate(X(0.4), Y(0.33));
        stamp(ctx, eggSpr(s.newT, 0, 0, u * 2.3), F_EGG, u);
        ctx.restore();
        gtext(ctx, 'NEW', X(0.4), Y(0.35), R(0.028), 900, '#ffffff', '#ff4f7a', 4);
        gtext(ctx, `${ET_NAME[s.newT]} · ${ET_LINE[s.newT]}`, X(0.46), Y(0.29), R(0.036), 900, '#7a4214', '#ffffff', 4, 'left');
      }
      ctx.globalAlpha = 1;
    }
    if (s.firstTap < 0 && s.nest === 0) {
      rr(ctx, X(0.25), Y(0.215), X(0.71), Y(0.06), Y(0.03));
      ctx.fillStyle = 'rgba(255,255,255,.92)';
      ctx.fill();
      ctx.strokeStyle = '#e2b46a';
      ctx.lineWidth = 2;
      ctx.stroke();
      gtext(ctx, '알을 톡! 아기가 옆 알을 깨요', X(0.605), Y(0.246), R(0.038), 800, '#7a4214', '', 0);
    } else if (s.nest === 0 && s.taps >= TAPS - 2 && alive(s) && s.pend === 0) {
      // 처음 연쇄가 꺼지려 할 때 한 번 알려 준다
      gtext(ctx, '꺼지기 전에 또 톡!', X(0.68), Y(0.33), R(0.04), 900, '#ffffff', '#e0641a', 5);
    }
  }
  // ── 아래: 남은 톡 (알 8개) ──
  {
    const gap = X(0.085), cx0 = X(0.5) - (gap * (TAPS - 1)) / 2, y = Y(1.455), u = R(0.021);
    const sh = t - (fx.memo.emptyT ?? -99) < 16 ? Math.sin(t * 2.4) * R(0.01) : 0;
    rr(ctx, cx0 - gap * 0.65 + sh, y - u * 3.0, gap * (TAPS - 1) + gap * 1.3, u * 3.6, u * 1.8);
    ctx.fillStyle = 'rgba(255,248,230,.9)';
    ctx.fill();
    ctx.strokeStyle = '#e2b46a';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    for (let j = 0; j < TAPS; j++) {
      const on = j < s.taps, nx = on && j === s.taps - 1 && s.phase === 'play';
      ctx.save();
      ctx.translate(cx0 + gap * j + sh, y - (nx ? Math.abs(Math.sin(t * 0.12)) * R(0.008) : 0));
      stamp(ctx, eggSpr('spot', 0, on ? 0 : 1, u * 2.3), F_EGG, u);
      ctx.restore();
    }
  }
  if (s.phase !== 'play') drawCard(ctx, s, w, h);
}

function drawCard(ctx: C2, s: NestState, w: number, h: number) {
  const fx = juice(s), X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w, pt = s.pt, t = s.t;
  const ap = clamp(pt / 14, 0, 1), e = easeBack(ap);
  ctx.fillStyle = `rgba(70,35,10,${0.32 * ap})`;
  ctx.fillRect(0, Y(0.105), w, h - Y(0.105));
  ctx.save();
  ctx.translate(0, (1 - e) * Y(0.4));
  ctx.globalAlpha = ap;
  const cx = X(0.5), top = Y(0.2), bot = Y(1.36);
  ctx.shadowColor = 'rgba(80,40,10,.35)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 4;
  rr(ctx, X(0.04), top, X(0.92), bot - top, R(0.06));
  ctx.fillStyle = lin(ctx, 0, top, 0, bot, [0, '#fffaf0'], [1, '#ffeccb']);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#e2a64e';
  ctx.lineWidth = 3;
  ctx.stroke();
  const sndOnce = (key: string, n: Parameters<typeof fx.sound>[0], p: number) => {
    const k = `${key}:${s.nest}:${s.phase}`;
    if (fx.memo[k]) return;
    fx.memo[k] = 1;
    fx.sound(n, p, 0.9);
  };
  if (s.phase === 'result') {
    gtext(ctx, `둥지 ${s.nest + 1} 부화!`, cx, Y(0.26), R(0.058), 900, '#7a4214', '', 0);
    const labels = [`아기 ${HATCH_GOAL[s.nest]}마리`, '새 친구 만나기', `한 번에 ${CHAIN_GOAL[s.nest]}마리`];
    for (let j = 0; j < 3; j++) {
      const at0 = 14 + j * 10, f = clamp((pt - at0) / 8, 0, 1), on = s.starOk[j] && f > 0;
      if (on && f > 0) sndOnce('star' + j, 'coin', 1 + j * 0.12);
      const x = X(0.2 + j * 0.3), y = Y(0.35);
      const sz = R(0.05) * (on ? 0.6 + 0.4 * easeBack(f) : 1);
      starIcon(ctx, x, y, sz, on);
      gtext(ctx, labels[j], x, Y(0.41), R(0.033), 800, on ? '#a86a00' : '#a8875f', '', 0);
    }
    const cnt = Math.round(s.nestPts * clamp((pt - 10) / 30, 0, 1));
    gtext(ctx, `+${cnt}`, cx, Y(0.49), R(0.08), 900, '#e0641a', '#ffffff', 5);
    if (s.newBest && s.nest > 0 && pt > 40) {
      const p = easeBack(clamp((pt - 40) / 10, 0, 1));
      sndOnce('best', 'chime', 1.4);
      ctx.save();
      ctx.translate(X(0.79), Y(0.47));
      ctx.rotate(0.18);
      ctx.scale(p, p);
      gtext(ctx, '최고 기록!', 0, 0, R(0.046), 900, '#ffffff', '#ff4f7a', 5);
      ctx.restore();
    } else gtext(ctx, `최고 ${s.best} · 한 번에 최고 ${s.maxChain}마리`, cx, Y(0.555), R(0.034), 800, '#a8875f', '', 0);
    if (s.unlockT) {
      const f = clamp((pt - 44) / 10, 0, 1);
      if (f > 0) sndOnce('unlock', 'swell', 1.2);
      const u = R(0.04) * (0.4 + 0.6 * easeBack(f));
      rr(ctx, X(0.1), Y(0.595), X(0.8), Y(0.13), R(0.03));
      ctx.fillStyle = 'rgba(255,236,180,.8)';
      ctx.fill();
      ctx.save();
      ctx.translate(X(0.2), Y(0.705));
      ctx.rotate(Math.sin(t * 0.1) * 0.08);
      stamp(ctx, eggSpr(s.unlockT, 0, 0, u * 2.3), F_EGG, u);
      ctx.restore();
      gtext(ctx, 'NEW', X(0.2), Y(0.612), R(0.03), 900, '#ffffff', '#ff4f7a', 4);
      gtext(ctx, `다음 둥지에 ${ET_NAME[s.unlockT]}`, X(0.3), Y(0.636), R(0.04), 900, '#7a4214', '', 0, 'left');
      gtext(ctx, ET_LINE[s.unlockT], X(0.3), Y(0.685), R(0.038), 800, '#e0641a', '', 0, 'left');
    } else gtext(ctx, '마지막 둥지까지 다 깨웠어요!', cx, Y(0.66), R(0.042), 900, '#e0641a', '', 0);
    dexRow(ctx, s, w, Y(0.8));
  } else {
    gtext(ctx, '둥지 6개 다 깨웠어요!', cx, Y(0.27), R(0.054), 900, '#7a4214', '', 0);
    gtext(ctx, String(s.pts), cx, Y(0.41), R(0.1), 900, '#e0641a', '#ffffff', 6);
    gtext(ctx, `최고 둥지 ${s.best}점`, cx, Y(0.52), R(0.04), 800, '#a8875f', '', 0);
    dexRow(ctx, s, w, Y(0.68));
  }
  if (pt >= RES_MIN) {
    const p = Math.max(0, Math.sin(t * 0.13));
    gtext(ctx, s.phase === 'result' ? '톡 — 다음 둥지' : '톡 — 처음부터', cx, Y(1.27), R(0.046), 900, '#ffffff', '#e0641a', 5);
    drawHand(ctx, cx + R(0.22), Y(1.3) + p * R(0.01), R(0.08));
  }
  ctx.restore();
}
/** 도감: 16칸 (8 × 2, 크게) — 처음 본 아기는 분홍 테두리로 콩콩, 드문 것은 금빛 칸 */
function dexRow(ctx: C2, s: NestState, w: number, y0: number) {
  const R = (r: number) => r * w, gx = R(0.105), gy = R(0.13), x0 = w / 2 - gx * 3.5, u = R(0.036), t = s.t;
  gtext(ctx, `도감 ${s.dex.filter(Boolean).length}/${SPN}`, w / 2, y0 - R(0.04), R(0.042), 900, '#7a4214', '', 0);
  for (let i = 0; i < SPN; i++) {
    const x = x0 + (i % 8) * gx, y = y0 + R(0.065) + Math.floor(i / 8) * gy, has = s.dex[i], nw = s.nestNew.includes(i);
    rr(ctx, x - R(0.048), y - R(0.058), R(0.096), R(0.116), R(0.03));
    ctx.fillStyle = has ? (SP[i].rare ? 'rgba(255,226,120,.95)' : 'rgba(255,255,255,.96)') : 'rgba(160,120,80,.16)';
    ctx.fill();
    ctx.strokeStyle = nw ? '#ff4f7a' : 'rgba(170,120,60,.5)';
    ctx.lineWidth = nw ? 3 : 1.2;
    ctx.stroke();
    if (has) {
      ctx.save();
      ctx.translate(x, y + R(0.045) - (nw ? Math.abs(Math.sin(t * 0.2 + i)) * R(0.01) : 0));
      stamp(ctx, babySpr(i, nw ? P_CHEER : P_SIT, u * 2.3), F_BABY, u);
      ctx.restore();
    } else gtext(ctx, '?', x, y, R(0.05), 900, 'rgba(140,100,60,.55)', '', 0);
    if (nw) gtext(ctx, 'NEW', x, y - R(0.06), R(0.026), 900, '#ffffff', '#ff4f7a', 3);
  }
}
export const __clone = (s: NestState) => clone(s), __tap = (s: NestState, i: number) => tapEgg(s, i), __ff = (s: NestState) => ff(s);
export const __eggPt = (s: NestState, i: number) => ({ x: eggCx(s.eggs[i]), y: eggCy(s.eggs[i]) / A });
