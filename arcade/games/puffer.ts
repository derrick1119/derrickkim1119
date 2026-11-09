/**
 * 복어 산호 정원 (20라운드 새 아이디어) — 날갯짓 통과 × 꾹 눌렀다 떼기 × 키우기.
 * 기준 9(조작 하나): 꾹 누르면 복어가 빵빵하게 부풀어(커지고) 둥실 떠오르고, 떼면 '뿌—' 물을 뿜으며 쭈그러들어 가라앉는다.
 *   뿜은 물이 닿은 모래에 산호가 자란다 — '얼마나 누를지'가 크기(=산호 크기·뜨는 높이), '언제 뗄지'가 심는 자리.
 *   누르는 동안 물이 닿을 자리와 자랄 산호가 미리 보인다(실제와 같은 계산).
 * 와우: 내가 지나간 모래밭이 산호 정원이 된다. 크게 부풀수록 큰 산호지만, 너무 오래 부풀면 높이 떠서 물이 안 닿는다.
 * 고민: 바위 굴문은 쭈그러진 채로만 쏙, 해파리에 찔리면 '뿌웅~' 바람이 빠져 빙글빙글. 화단을 꽉 채우면 물고기 가족(+5).
 * 판 = 바닷속 한 구간. 끝까지 헤엄쳐 산호 점수 목표를 채우면 별 1~3 + 내가 만든 정원을 훑어보는 장면, 못 채우면 하트 -1 그 판만 다시.
 * 펼쳐짐: 산호·큰 산호·물 주기·화단 완성(1판) → 바위 굴문(2판, 작게 통과 / 중간으로 넘기) → 해파리(3판, 위아래로 피하기)
 *        → 물기둥(4판, 작아도 떠오름) → 꽃게(5판, 작은 산호는 싹둑 — 크게 심기) → 고래 하품(6판, 빵빵하면 빨려 올라감)
 *        → 반짝 동굴(7판, 낮은 천장 · 깜깜한데 산호가 빛난다).
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.2, TAU = Math.PI * 2, STAGES = 7;
/** 앞으로 헤엄치는 속도(칸/틱) · 수면 높이 · 몸 반지름(쭈그렁 R0 → 빵빵 R0+R1) · 부력 */
const V = 0.045, YS = 3.9, R0 = 0.3, R1 = 0.44, P0 = 0.35, BUOY = 0.008, DRAG = 0.93, INF = 1 / 40, DEF = 1 / 16;
/** 산호가 되는 최소 바람 · 중간 산호 · 큰 산호 · 물이 닿는 거리(배 밑 → 모래) · 빵빵 한계(틱) · 기절 · 물기둥 */
const PMIN = 0.3, PMID = 0.62, PBIG = 0.9, REACH = 0.95, FORCE = 60, STUN = 55, LIFT = 0.0036, JX = 0.3;
const PTS = [1, 2, 4], WID = [1.0, 1.45, 2.0], BED_BONUS = 5;
const NAMES = ['산호 씨앗 모래밭', '바위 굴문', '해파리 숲', '물기둥 골짜기', '꽃게 마을', '고래 하품 바다', '반짝 동굴'];
const LEN = [44, 48, 50, 52, 54, 56, 58];
/** 판마다 별 목표 = 화단 길이 × 이 비율 (잘하는 봇·보통 사람 기준으로 맞춤) */
const GOALF: [number, number, number][] = [[0.22, 0.7, 1.15], [0.4, 0.85, 1.25], [0.42, 0.8, 1.15], [0.42, 0.8, 1.1], [0.42, 0.75, 1.05], [0.4, 0.7, 0.98], [0.4, 0.72, 1.05]];
const YAWN = 420, YAWN_ON = 110, HOLE = 0.95, PAUSE_CLEAR = 170;
const SEE: Record<string, string> = {
  coral: '🪸 뿜은 물이 닿은 모래에 산호가 자라요',
  big: '🌸 크게 부풀수록 큰 산호 — 흰동가리가 이사 와요',
  up: '💧 있던 산호에 또 뿜으면 한 단계 더 자라요',
  bed: '🐟 화단을 꽉 채우면 물고기 가족이 와요 +5',
  arch: '🕳️ 바위 굴문 — 쭈그러져야 쏙! (중간 크기면 위로 넘기)',
  jelly: '⚡ 해파리 — 찔리면 뿌웅~ 바람이 다 빠져요 (위아래로 피해요)',
  zone: '⬆️ 물기둥 — 쭈그러져도 둥실 떠올라요',
  crab: '🦀 꽃게 — 작은 산호는 싹둑! 크게 심어요',
  whale: '🐋 고래 하품 — 빵빵하면 위로 빨려 가요',
  cave: '✨ 반짝 동굴 — 천장이 낮아요, 산호가 길을 밝혀요',
};

export interface Box { x0: number; x1: number; y0: number; y1: number; a: number }
export interface Bed { x0: number; x1: number }
export interface Arch { x0: number; x1: number; hy: number; top: number }
export interface Jelly { x: number; y: number; amp: number; per: number; ph: number }
export interface Zone { x0: number; x1: number }
/** 소품: 0 다시마 · 1 바닷말 · 2 조개 · 3 불가사리 · 4 뒤 바위 · 5 말미잘 */
interface Deco { x: number; z: number; kind: number; s: number }
interface Fan { x: number; z: number; e: string; ph: number }
export interface Course {
  k: number; name: string; len: number; beds: Bed[]; boxes: Box[]; arches: Arch[]; jellies: Jelly[]; zones: Zone[];
  crabs: { bed: number; x: number; dir: number }[]; whale: boolean; cave: number; goal: [number, number, number]; deco: Deco[]; fans: Fan[];
}
export interface Body { x: number; y: number; vy: number; p: number; jet: boolean; stun: number; lock: boolean; maxT: number }
export interface Coral { x: number; a: number; b: number; tier: number; bed: number; t: number; v: number }
export interface Crab { bed: number; x: number; dir: number; flip: number; snip: number }
interface Ev { t: number; kind: string; x: number; y: number; text?: string; n?: number; x2?: number; y2?: number }
export interface PufferState {
  rng: Rng; seed: number; t: number; ct: number; k: number; c: Course; b: Body;
  corals: Coral[]; crabs: Crab[]; done: Uint8Array; pts: number; garden: number;
  phase: 'run' | 'pause'; pause: number; cleared: boolean; hearts: number; stars: number; lastStars: number; clears: number;
  planted: number; presses: number; lastBig: number; lastHit: number; lastJet: number;
  seen: Set<string>; tips: Set<string>; events: Ev[]; dead: boolean; won: boolean;
}

const ev = (s: PufferState, kind: string, x: number, y: number, text?: string, n?: number, x2?: number, y2?: number) => s.events.push({ t: s.t, kind, x, y, text, n, x2, y2 });
function see(s: PufferState, key: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  ev(s, 'new', 0, 0, SEE[key]);
}
function tip(s: PufferState, key: string, text: string) {
  if (s.tips.has(key)) return;
  s.tips.add(key);
  ev(s, 'new', 0, 0, text);
}
export const radius = (p: number) => R0 + R1 * p;
export const tierOf = (p: number) => (p >= PBIG ? 2 : p >= PMID ? 1 : 0);
export const yawning = (c: Course, ct: number) => c.whale && (ct + 200) % YAWN < YAWN_ON;
export const ceilAt = (c: Course, x: number) => (c.cave >= 0 && x >= c.cave ? 2.6 + 0.22 * Math.sin(x * 1.1) + 0.12 * Math.sin(x * 2.9 + 1) : 99);
export function jellyPos(j: Jelly, ct: number): [number, number] {
  return [j.x + 0.18 * Math.sin(ct / 70 + j.ph), j.y + j.amp * Math.sin((TAU * (ct + j.ph)) / j.per)];
}
export function groundAt(c: Course, x: number) {
  for (const bx of c.boxes) if (bx.y0 === 0 && x >= bx.x0 && x <= bx.x1) return bx.y1;
  return 0;
}
export function bedAt(c: Course, x: number) {
  for (let i = 0; i < c.beds.length; i++) if (x >= c.beds[i].x0 && x <= c.beds[i].x1) return i;
  return -1;
}
const inZone = (c: Course, x: number) => {
  for (const z of c.zones) if (x >= z.x0 && x <= z.x1) return true;
  return false;
};

/** 바닷속 한 구간 (같은 시드·같은 판이면 다시 해도 똑같다) */
export function makeCourse(seed: number, k: number): Course {
  const r = mulberry32((seed ^ 0x2c1b3c6d) + k * 7919), len = LEN[k];
  const c: Course = { k, name: NAMES[k], len, beds: [], boxes: [], arches: [], jellies: [], zones: [], crabs: [], whale: k === 5, cave: k === 6 ? 4.6 : -1, goal: [0, 0, 0], deco: [], fans: [] };
  let x = 0.9;
  const first = { arch: k === 1, jelly: k === 2, zone: k === 3, crab: k === 4 };
  const bed = (bl: number) => {
    const i = c.beds.length;
    c.beds.push({ x0: x, x1: x + bl });
    const mid = x + bl / 2;
    if (k >= 2 && i > 0 && (first.jelly || r() < (k === 2 ? 0.6 : 0.4))) {
      first.jelly = false;
      c.jellies.push({ x: mid + (r() - 0.5) * bl * 0.5, y: 1.1 + r() * (k === 6 ? 0.6 : 1.0), amp: 0.4 + r() * 0.35, per: 150 + r() * 90, ph: Math.floor(r() * 240) });
    }
    if (k >= 3 && i > 0 && (first.zone || r() < (k === 3 ? 0.35 : 0.15))) {
      first.zone = false;
      const zw = 0.9 + r() * 0.5, zx = x + 0.4 + r() * Math.max(0, bl - zw - 0.8);
      c.zones.push({ x0: zx, x1: zx + zw });
    }
    if (k >= 4 && i > 0 && bl >= 3 && (first.crab || r() < (k === 4 ? 0.55 : 0.3))) {
      first.crab = false;
      c.crabs.push({ bed: i, x: x + 0.5 + r() * (bl - 1), dir: r() < 0.5 ? -1 : 1 });
    }
    x += bl;
  };
  bed(k === 0 ? 5.4 : 4.2);
  while (x < len - 5) {
    const arch = k >= 1 && k !== 6 && (first.arch || r() < (k === 1 ? 0.5 : 0.3));
    if (arch) {
      first.arch = false;
      const w = 1.0 + r() * 0.45, hy = 0.3 + r() * 0.75, top = 2.3 + r() * 0.3, ai = c.arches.length;
      c.arches.push({ x0: x, x1: x + w, hy, top });
      c.boxes.push({ x0: x, x1: x + w, y0: 0, y1: hy, a: ai }, { x0: x, x1: x + w, y0: hy + HOLE, y1: top, a: ai });
      x += w;
    } else {
      const w = 0.7 + r() * 0.8, hg = k === 0 ? 0.32 + r() * 0.3 : 0.42 + r() * 0.6;
      c.boxes.push({ x0: x, x1: x + w, y0: 0, y1: hg, a: -1 });
      if (k >= 3 && r() < 0.3) c.zones.push({ x0: x - 0.6, x1: x + w * 0.6 });
      x += w;
    }
    const bl = (k === 0 ? 2.8 : 2.4) + r() * 2.0;
    if (x + bl > len - 1) break;
    bed(bl);
  }
  // 결승 바위(조개 대문)까지는 맨 모래
  const lb = c.beds.reduce((a, b) => a + b.x1 - b.x0, 0);
  c.goal = GOALF[k].map((f) => Math.max(3, Math.round(lb * f))) as [number, number, number];
  // 소품 · 구경꾼
  for (let dx = -2 + r(); dx < len + 8; dx += 0.7 + r() * 1.3) {
    const q = r();
    c.deco.push({ x: dx, z: 0.86 + r() * 0.1, kind: q < 0.45 ? 0 : q < 0.7 ? 1 : q < 0.85 ? 4 : 5, s: 0.7 + r() * 0.6 });
    if (r() < 0.45) c.deco.push({ x: dx + r(), z: 0.06 + r() * 0.08, kind: r() < 0.5 ? 2 : r() < 0.6 ? 3 : 1, s: 0.6 + r() * 0.5 });
  }
  c.deco.sort((a, b) => b.z - a.z);
  const FANS = [['🐙', '🐠', '🦐', '🐢'], ['🐙', '🦐', '🐠', '🐡'], ['🐠', '🦑', '🐙', '🦐'], ['🐠', '🦐', '🐙', '🐟'], ['🦞', '🐙', '🐠', '🦐'], ['🐬', '🐠', '🐙', '🦭'], ['🦑', '🐙', '🦐', '🐠']][k];
  for (let fx = 3 + r() * 3; fx < len + 3; fx += 4 + r() * 4) c.fans.push({ x: fx, z: 0.8, e: FANS[Math.floor(r() * 4)], ph: r() * 6 });
  return c;
}

const newBody = (): Body => ({ x: 0.2, y: 0.75, vy: 0, p: 0, jet: false, stun: 0, lock: false, maxT: 0 });
type Cb = (kind: string, x: number, y: number, n?: number) => void;

function bonk(b: Body, why: string, cb: Cb | undefined) {
  b.stun = STUN;
  b.jet = false;
  b.lock = true;
  b.maxT = 0;
  cb?.(why, b.x, b.y, b.p);
}

/**
 * 복어 한 틱 — 게임과 봇(앞날 흉내)이 같은 함수를 쓴다.
 * 돌려주는 값: 이번 틱에 뗀 바람(>0 = 물을 뿜음), -1 = 너무 작아서 '피식', 0 = 아무 일 없음.
 */
export function advance(b: Body, c: Course, hold: boolean, ct: number, cb?: Cb): number {
  let out = 0;
  if (b.stun > 0) {
    b.stun--;
    b.p = Math.max(0, b.p - 1 / 14);
    if (b.stun === 0) b.lock = hold;
  } else {
    if (!hold) b.lock = false;
    if (b.jet) {
      b.p -= DEF;
      if (b.p <= 0) (b.p = 0), (b.jet = false);
    } else if (hold && !b.lock) {
      if (b.p === 0) cb?.('puff', b.x, b.y);
      const was = b.p;
      b.p = Math.min(1, b.p + INF);
      if (was < PBIG && b.p >= PBIG) cb?.('max', b.x, b.y);
      if (b.p >= 1 && ++b.maxT >= FORCE) (out = b.p), (b.jet = true), (b.lock = true), (b.maxT = 0), cb?.('force', b.x, b.y);
    } else if (b.p > 0) {
      out = b.p >= PMIN ? b.p : -1;
      b.jet = true;
      b.maxT = 0;
    }
  }
  const r = R0 + R1 * b.p, yawn = yawning(c, ct);
  let a = (b.p - P0) * BUOY;
  if (inZone(c, b.x)) a += LIFT;
  if (yawn) a += 0.0042 * (0.15 + b.p);
  b.vy = (b.vy + a) * DRAG;
  if (b.stun > 0) b.vy += Math.sin(b.stun * 0.55) * 0.003;
  // 기절 중엔 남은 바람이 '뿌웅~' 빠지며 풍선처럼 이리저리 휙휙
  if (b.stun > 0 && b.p > 0) b.vy += Math.sin(b.stun * 0.9) * 0.012 * b.p;
  b.y += b.vy;
  b.x += b.stun > 0 ? V * 0.75 + b.p * 0.04 : V;
  // 모래 바닥 · 수면 · 동굴 천장
  if (b.y < r) (b.y = r), b.vy < 0 && (b.vy = 0);
  const top = Math.min(YS, ceilAt(c, b.x));
  if (b.y > top - r) {
    const hit = b.vy;
    b.y = top - r;
    b.vy = -Math.abs(b.vy) * 0.35 - (top < YS ? 0.006 : 0);
    if (yawn && b.p > 0.45 && b.stun === 0 && top >= YS) bonk(b, 'gulp', cb), (b.vy = -0.05);
    else if (hit > 0.012) cb?.(top < YS ? 'bump' : 'surf', b.x, b.y, hit);
  }
  // 바위 · 굴문
  const boxes = c.boxes;
  for (let i = 0; i < boxes.length; i++) {
    const bx = boxes[i];
    if (bx.x0 > b.x + 0.8) break;
    if (bx.x1 < b.x - 0.8) continue;
    const rr = R0 + R1 * b.p, cx = b.x < bx.x0 ? bx.x0 : b.x > bx.x1 ? bx.x1 : b.x, cy = b.y < bx.y0 ? bx.y0 : b.y > bx.y1 ? bx.y1 : b.y;
    const dx = b.x - cx, dy = b.y - cy, d2 = dx * dx + dy * dy;
    if (d2 >= rr * rr) continue;
    const ady = Math.abs(dy), adx = Math.abs(dx);
    if (dy > 0 && ady >= adx * 0.9) {
      // 위에 얹힘 (모서리면 미끄러져 올라탄다)
      b.y = bx.y1 + Math.sqrt(Math.max(0, rr * rr - dx * dx));
      if (b.vy < 0) b.vy = 0;
      continue;
    }
    if (dy < 0 && ady >= adx * 0.9) {
      b.y = bx.y0 - Math.sqrt(Math.max(0, rr * rr - dx * dx));
      if (b.vy > 0) b.vy = -b.vy * 0.3;
      continue;
    }
    if (rr - Math.sqrt(d2) < 0.05) continue;
    if (b.stun > 0) {
      // 이미 빙글빙글: 그냥 밀려 올라간다/내려간다
      if (bx.a >= 0) (b.y = c.arches[bx.a].hy + HOLE / 2), (b.p = Math.min(b.p, 0.3));
      else b.y = bx.y1 + rr;
      continue;
    }
    if (bx.a >= 0) {
      // 굴문에 끼면 쭈욱~ 바람이 빠지며 구멍 속으로
      const ar = c.arches[bx.a];
      bonk(b, 'stuck', cb);
      b.p = Math.min(b.p, 0.3);
      b.y = ar.hy + HOLE / 2;
      b.vy = 0;
    } else {
      bonk(b, 'bonk', cb);
      b.y = bx.y1 + R0 + R1 * b.p + 0.02;
      b.vy = 0.03;
    }
  }
  // 해파리
  if (b.stun === 0)
    for (const j of c.jellies) {
      if (Math.abs(j.x - b.x) > 1.4) continue;
      const [jx, jy] = jellyPos(j, ct), rr = R0 + R1 * b.p;
      const ex = (b.x - jx) / (0.3 + rr), ey = (b.y - (jy - 0.14)) / (0.46 + rr);
      if (ex * ex + ey * ey < 1) {
        bonk(b, 'sting', cb);
        b.vy = 0.035;
        break;
      }
    }
  return out;
}

export interface JetRes { kind: 'new' | 'up' | 'full' | 'high' | 'rock' | 'crab'; x: number; y: number; tier: number; gain: number; bed: number; ci: number; a: number; b: number; done: boolean; cover: number }
interface Garden { c: Course; corals: Coral[]; crabs: Crab[]; done: Uint8Array }

function span(g: Garden, bed: number, x: number, wd: number, skip: number): [number, number] {
  const B = g.c.beds[bed];
  let a = Math.max(B.x0, x - wd / 2), b = Math.min(B.x1, x + wd / 2);
  for (let i = 0; i < g.corals.length; i++) {
    const q = g.corals[i];
    if (i === skip || q.bed !== bed) continue;
    if (q.x < x) a = Math.max(a, q.b);
    else b = Math.min(b, q.a);
  }
  return [a, Math.max(a, b)];
}

/** 이 자리에서 뿜으면 무슨 일이 생기나 (바꾸지 않고 계산만 — 미리 보기·봇·실제가 같은 함수) */
export function jetAt(g: Garden, x: number, y: number, p: number): JetRes {
  const xl = x + JX, gr = groundAt(g.c, xl), tier = tierOf(p), d = y - radius(p) - gr;
  const res: JetRes = { kind: 'high', x: xl, y: gr, tier, gain: 0, bed: -1, ci: -1, a: 0, b: 0, done: false, cover: 0 };
  if (d > REACH) return res;
  const bed = bedAt(g.c, xl);
  if (gr > 0 || bed < 0) return (res.kind = 'rock'), res;
  res.bed = bed;
  for (const cr of g.crabs) if (cr.bed === bed && cr.flip === 0 && Math.abs(cr.x - xl) < 0.42) return (res.kind = 'crab'), res;
  let ci = -1;
  for (let i = 0; i < g.corals.length; i++) if (g.corals[i].bed === bed && xl >= g.corals[i].a - 0.05 && xl <= g.corals[i].b + 0.05) ci = i;
  const B = g.c.beds[bed];
  let covered = 0;
  for (const q of g.corals) if (q.bed === bed) covered += q.b - q.a;
  if (ci >= 0) {
    const q = g.corals[ci];
    res.ci = ci;
    if (q.tier >= 2) return (res.kind = 'full'), res;
    res.kind = 'up';
    res.tier = Math.min(2, Math.max(tier, q.tier + 1));
    res.gain = PTS[res.tier] - PTS[q.tier];
    [res.a, res.b] = span(g, bed, q.x, WID[res.tier], ci);
    res.a = Math.min(res.a, q.a);
    res.b = Math.max(res.b, q.b);
    res.cover = res.b - res.a - (q.b - q.a);
  } else {
    res.kind = 'new';
    res.gain = PTS[tier];
    [res.a, res.b] = span(g, bed, xl, WID[tier], -1);
    res.cover = res.b - res.a;
  }
  if (!g.done[bed] && B.x1 - B.x0 - covered - res.cover < 0.3) (res.done = true), (res.gain += BED_BONUS);
  return res;
}

function plant(s: PufferState, p: number) {
  const b = s.b, res = jetAt(s, b.x, b.y, p);
  s.lastJet = s.t;
  ev(s, 'jet', b.x, b.y, undefined, p, res.x, res.y + (res.kind === 'high' ? Math.max(0, b.y - radius(p) - REACH - 0.2) : 0));
  if (res.kind === 'high') return ev(s, 'high', res.x, b.y - radius(p) - REACH * 0.7, '허공에 뿌—… 안 닿았어요'), tip(s, 'high', '☝️ 너무 높이 뜨면 물이 모래까지 안 닿아요');
  if (res.kind === 'rock') return ev(s, 'rock', res.x, res.y, '바위엔 안 자라요');
  if (res.kind === 'crab') {
    for (const cr of s.crabs) if (cr.bed === res.bed && Math.abs(cr.x - res.x) < 0.42) cr.flip = 160;
    return ev(s, 'crabflip', res.x, 0, '꽃게 발라당~ 버둥버둥');
  }
  if (res.kind === 'full') return ev(s, 'full', res.x, 0.6, '이미 활짝!');
  s.pts += res.gain;
  s.planted++;
  if (res.kind === 'up') {
    const q = s.corals[res.ci];
    q.tier = res.tier;
    q.a = res.a;
    q.b = res.b;
    q.t = s.t;
    ev(s, 'up', q.x, 0, `쑥! +${res.gain - (res.done ? BED_BONUS : 0)}`, res.tier);
    see(s, 'up');
  } else {
    s.corals.push({ x: res.x, a: res.a, b: res.b, tier: res.tier, bed: res.bed, t: s.t, v: Math.floor(s.rng() * 4) });
    ev(s, 'coral', res.x, 0, ['작은 산호 +1', '산호 +2', '큰 산호!! +4'][res.tier], res.tier);
    see(s, 'coral');
  }
  if (res.tier === 2) (s.lastBig = s.t), see(s, 'big');
  if (res.done) {
    s.done[res.bed] = 1;
    const B = s.c.beds[res.bed];
    ev(s, 'bed', (B.x0 + B.x1) / 2, 1.2, '화단 꽉! 🐟 물고기 가족 +5');
    see(s, 'bed');
  }
}

function moveCrabs(s: PufferState) {
  for (const cr of s.crabs) {
    if (cr.flip > 0) {
      cr.flip--;
      continue;
    }
    if (cr.snip > 0) {
      cr.snip--;
      continue;
    }
    const B = s.c.beds[cr.bed], nx = cr.x + cr.dir * 0.012;
    if (nx < B.x0 + 0.2 || nx > B.x1 - 0.2) {
      cr.dir = -cr.dir;
      continue;
    }
    let blocked = false;
    for (let i = 0; i < s.corals.length; i++) {
      const q = s.corals[i];
      if (q.bed !== cr.bed || nx < q.a + 0.1 || nx > q.b - 0.1) continue;
      if (q.tier === 0) {
        s.corals.splice(i, 1);
        s.pts -= PTS[0];
        cr.snip = 50;
        ev(s, 'snip', q.x, 0.3, '싹둑! -1');
      } else (cr.dir = -cr.dir), (blocked = true);
      break;
    }
    if (!blocked) cr.x = nx;
  }
}

function startStage(s: PufferState) {
  s.c = makeCourse(s.seed, s.k);
  s.b = newBody();
  s.corals = [];
  s.crabs = s.c.crabs.map((q) => ({ ...q, flip: 0, snip: 0 }));
  s.done = new Uint8Array(s.c.beds.length);
  s.pts = 0;
  s.ct = 0;
  s.phase = 'run';
  ev(s, 'stage', 0, 0, `${s.k + 1}판 · ${s.c.name}`);
  if (s.c.whale) see(s, 'whale');
}

export const starsOf = (s: PufferState) => [0, 1, 2].filter((i) => s.pts >= s.c.goal[i]).length;

export const puffer: GameDef<PufferState> = {
  id: 'puffer',
  name: '복어 산호 정원',
  genes: ['flap', 'hold', 'farm'],
  twist: '꾹 누른 만큼 복어가 부풀어 커지고 떠오르며, 떼는 순간 뿜은 물이 닿은 모래에 그 크기만 한 산호가 자란다 — 크게 키울수록 큰 산호지만 높이 떠서 물이 안 닿고, 좁은 바위 틈은 쭈그러져야 지나간다',
  rules: [
    '꾹 누르면 빵빵하게 부풀어 떠오르고, 떼면 뿌— 물을 뿜으며 쭈그러들어요.',
    '뿜은 물이 닿은 모래에 산호가 자라요 — 클수록 큰 산호, 너무 높으면 안 닿아요!',
    '바위 틈은 작게, 해파리는 피해서 — 판 끝까지 산호 목표를 채우면 별!',
  ],
  controls: 'hold',
  hint: '꾹 누르면 빵빵(떠오름), 떼면 뿌— 산호 심기 / 스페이스',
  aspect: A,
  art: {
    concept: '햇살이 비치는 바닷속 산호 정원 디오라마',
    mood: '유리 수조처럼 단면이 보이는 바닷속 모래밭. 수면에서 햇살 기둥이 비스듬히 내려오고, 다시마가 흔들리며, 모래 단면엔 조개와 불가사리가 묻혀 있다. 노랗고 동글동글한 복어가 지나간 자리마다 분홍·주황·보라 산호가 피어나고 흰동가리와 물고기 가족이 이사 온다. 마지막엔 산호가 빛나는 깜깜한 동굴.',
    palette: { bg: '#0a2a44', ink: '#f4fbff', muted: '#7aa6c2', accent: '#ff8fb1', hot: '#ff5a6e', soft: '#bdf2ff' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, ct: 0, k: 0, phase: 'run', pause: 0, cleared: false, hearts: 3, stars: 0, lastStars: 0, clears: 0,
      pts: 0, garden: 0, planted: 0, presses: 0, lastBig: -999, lastHit: -999, lastJet: -999, seen: new Set<string>(), tips: new Set<string>(), events: [], dead: false, won: false,
    } as unknown as PufferState;
    startStage(s);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    if (s.events.length && s.t - s.events[0].t > 120) s.events = s.events.filter((e) => s.t - e.t <= 120);
    if (s.dead) return;
    if (s.phase === 'pause') {
      if (--s.pause <= 0) {
        if (s.cleared && s.k === STAGES - 1) (s.dead = true), (s.won = true);
        else (s.cleared && s.k++, startStage(s));
      }
      return;
    }
    s.ct++;
    const b = s.b, c = s.c;
    const jp = advance(b, c, !!inp.hold, s.ct, (kind, x, y, n) => {
      if (kind === 'puff') (s.presses++, ev(s, 'puff', x, y, s.presses === 1 ? '뽀옹!' : undefined));
      else if (kind === 'max') ev(s, 'max', x, y, '빵빵!');
      else if (kind === 'force') ev(s, 'force', x, y, '더는 못 참아! 뿌—');
      else if (kind === 'bonk') (s.lastHit = s.t), ev(s, 'bonk', x, y, '통! 어질어질~');
      else if (kind === 'stuck') (s.lastHit = s.t), ev(s, 'stuck', x, y, '끼었다! 쭈우욱~');
      else if (kind === 'sting') (s.lastHit = s.t), ev(s, 'sting', x, y, (n ?? 0) > 0.3 ? '따끔! 뿌웅~~' : '따끔!');
      else if (kind === 'gulp') (s.lastHit = s.t), ev(s, 'gulp', x, y, '후루룩~ 퉤!');
      else if (kind === 'bump') ev(s, 'bump', x, y, '통!');
      else if (kind === 'surf') ev(s, 'surf', x, y, '퐁!');
    });
    if (jp > 0) plant(s, jp);
    else if (jp < 0) ev(s, 'tiny', b.x, b.y, '피식~');
    moveCrabs(s);
    // 보이기 시작한 새것
    const ahead = b.x + 5.5;
    for (const a of c.arches) if (a.x0 < ahead && a.x1 > b.x - 1) see(s, 'arch');
    for (const j of c.jellies) if (j.x < ahead && j.x > b.x - 1) see(s, 'jelly');
    for (const z of c.zones) if (z.x0 < ahead && z.x1 > b.x - 1) see(s, 'zone');
    for (const cr of s.crabs) if (cr.x < ahead && cr.x > b.x - 1) see(s, 'crab');
    if (c.cave >= 0 && b.x > c.cave - 3) see(s, 'cave');
    if (b.x >= c.len) {
      const st = starsOf(s);
      s.phase = 'pause';
      s.pause = st > 0 ? PAUSE_CLEAR : 120;
      if (st > 0) {
        s.cleared = true;
        s.stars += st;
        s.lastStars = st;
        s.clears++;
        s.garden += s.pts;
        if (s.k === STAGES - 1) s.pause = PAUSE_CLEAR + 40;
        ev(s, 'clear', b.x, 0, `${s.k + 1}판 정원 완성! ${'★'.repeat(st)}${'☆'.repeat(3 - st)}`, st);
      } else {
        s.cleared = false;
        s.hearts--;
        ev(s, 'fail', b.x, 0, `산호가 모자라요 (${s.pts}/${c.goal[0]}) · ♥ -1 · 다시!`);
        if (s.hearts <= 0) s.dead = true;
      }
    }
  },
  over: (s) => s.dead,
  /** 완성한 판의 산호 점수 + 별 하나 10점, 7판 정원을 다 완성하면 30점 더 */
  score: (s) => s.garden + s.stars * 10 + (s.won ? 30 : 0),
  draw(ctx, s, w, h, th: Theme) {
    drawWorld(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
const hex = (c: string) => (c[0] === '#' ? [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)] : c.slice(c.indexOf('(') + 1, -1).split(',').map(Number));
function mix(a: string, b: string, f: number) {
  const p = hex(a), q = hex(b), u = Math.max(0, Math.min(1, f));
  return `rgb(${Math.round(p[0] + (q[0] - p[0]) * u)},${Math.round(p[1] + (q[1] - p[1]) * u)},${Math.round(p[2] + (q[2] - p[2]) * u)})`;
}
const rgba = (c: string, a: number) => {
  const p = hex(c);
  return `rgba(${p[0]},${p[1]},${p[2]},${a})`;
};
const hsh = (k: number) => ((Math.imul(k + 1, 2654435761) >>> 0) % 10007) / 10007;
const EMOJI_FONT = 'system-ui, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
function emo(ctx: CanvasRenderingContext2D, e: string, x: number, y: number, size: number, flip = false) {
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffffff';
  ctx.font = `${size}px ${EMOJI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (flip) (ctx.save(), ctx.translate(x, y), ctx.scale(-1, 1), ctx.fillText(e, 0, 0), ctx.restore());
  else ctx.fillText(e, x, y);
}
function say(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, size: number) {
  ctx.font = `800 ${size}px system-ui, sans-serif`;
  const tw = ctx.measureText(text).width + size;
  ctx.fillStyle = 'rgba(255,255,255,.93)';
  ctx.beginPath();
  ctx.roundRect(x - tw / 2, y - size * 0.85, tw, size * 1.5, size * 0.6);
  ctx.moveTo(x - 3, y + size * 0.6);
  ctx.lineTo(x, y + size * 1.05);
  ctx.lineTo(x + 4, y + size * 0.6);
  ctx.fill();
  ctx.fillStyle = '#16344a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y - size * 0.1);
}
function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color: string) {
  ctx.font = `900 ${size}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = 'rgba(6,24,40,.8)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

type Face = 'meh' | 'strain' | 'wow' | 'panic' | 'blow' | 'dizzy' | 'smug' | 'oops' | 'sad';
/** 복어 (원점 = 몸 가운데, 오른쪽을 본다, R = 몸 반지름 px) */
function drawPuffer(ctx: CanvasRenderingContext2D, R: number, p: number, face: Face, t: number) {
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // 꼬리지느러미 (살랑살랑)
  const wig = Math.sin(t * 0.35) * R * 0.12;
  ctx.fillStyle = '#f09a34';
  ctx.strokeStyle = '#a85e16';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-R * 0.82, 0);
  ctx.quadraticCurveTo(-R * 1.2, -R * 0.25 + wig, -R * 1.42 - p * R * 0.05, -R * 0.42 + wig);
  ctx.quadraticCurveTo(-R * 1.26, wig, -R * 1.42 - p * R * 0.05, R * 0.42 + wig);
  ctx.quadraticCurveTo(-R * 1.2, R * 0.25 + wig, -R * 0.82, 0);
  ctx.fill();
  ctx.stroke();
  // 가시 (부풀수록 삐죽)
  const sp = Math.max(0, (p - 0.3) / 0.7);
  if (sp > 0) {
    ctx.fillStyle = '#f7e2a8';
    ctx.strokeStyle = '#b07a2a';
    ctx.lineWidth = 1;
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * TAU + 0.1;
      if (Math.cos(a) > 0.75 && Math.sin(a) > -0.5 && Math.sin(a) < 0.45) continue; // 얼굴 앞은 비운다
      const L = R * (1 + 0.24 * sp);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a - 0.09) * R * 0.94, Math.sin(a - 0.09) * R * 0.94);
      ctx.lineTo(Math.cos(a) * L, Math.sin(a) * L);
      ctx.lineTo(Math.cos(a + 0.09) * R * 0.94, Math.sin(a + 0.09) * R * 0.94);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
  // 몸통
  const bg = ctx.createRadialGradient(-R * 0.3, -R * 0.4, R * 0.1, 0, 0, R);
  bg.addColorStop(0, '#fff2a0');
  bg.addColorStop(0.55, '#f8c84a');
  bg.addColorStop(1, '#de9a2c');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, TAU);
  ctx.fill();
  // 하얀 배
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, TAU);
  ctx.clip();
  ctx.fillStyle = 'rgba(255,250,232,.95)';
  ctx.beginPath();
  ctx.ellipse(R * 0.1, R * 0.62, R * 0.95, R * 0.55, -0.12, 0, TAU);
  ctx.fill();
  // 점박이 무늬
  ctx.fillStyle = 'rgba(150,90,30,.55)';
  for (const [sx, sy, sr] of [[-0.45, -0.45, 0.11], [-0.1, -0.62, 0.09], [-0.62, -0.05, 0.08], [-0.25, -0.2, 0.07], [0.12, -0.75, 0.06], [-0.7, -0.4, 0.06]])
    (ctx.beginPath(), ctx.arc(sx * R, sy * R, sr * R, 0, TAU), ctx.fill());
  ctx.restore();
  ctx.strokeStyle = '#9a6418';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, TAU);
  ctx.stroke();
  // 등지느러미 · 가슴지느러미 (파닥파닥)
  ctx.fillStyle = '#f0a43c';
  ctx.beginPath();
  ctx.moveTo(-R * 0.5, -R * 0.8);
  ctx.quadraticCurveTo(-R * 0.62, -R * 1.18, -R * 0.2, -R * 0.98);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  const fl = Math.sin(t * (face === 'strain' || face === 'panic' ? 1.4 : 0.6));
  ctx.save();
  ctx.translate(-R * 0.05, R * 0.18);
  ctx.rotate(0.5 + fl * 0.45);
  ctx.fillStyle = 'rgba(240,164,60,.95)';
  ctx.beginPath();
  ctx.ellipse(-R * 0.18, 0, R * 0.24, R * 0.11, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  // 얼굴: 몸이 커져도 눈·입은 조금만 커진다 (빵빵할수록 얼굴이 작아 보여 웃기다)
  const er = 2.6 + R * 0.13, e1x = R * 0.32, e2x = R * 0.68, ey = -R * 0.28, mx = R * 0.93, my = R * 0.1;
  const eye = (x: number, y: number, rr: number, px: number, py: number, lid: number) => {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#4a2a0a';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(x, y, rr, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#1a1208';
    ctx.beginPath();
    ctx.arc(x + px * rr * 0.45, y + py * rr * 0.45, rr * 0.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + px * rr * 0.45 - rr * 0.18, y + py * rr * 0.45 - rr * 0.2, rr * 0.16, 0, TAU);
    ctx.fill();
    if (lid > 0) {
      // 무표정: 윗눈꺼풀이 반쯤 덮는다
      ctx.fillStyle = '#f2b640';
      ctx.beginPath();
      ctx.arc(x, y, rr + 0.6, Math.PI, TAU);
      ctx.lineTo(x + rr + 0.6, y - rr + rr * 2 * lid);
      ctx.lineTo(x - rr - 0.6, y - rr + rr * 2 * lid);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#4a2a0a';
      ctx.beginPath();
      ctx.moveTo(x - rr, y - rr + rr * 2 * lid);
      ctx.lineTo(x + rr, y - rr + rr * 2 * lid);
      ctx.stroke();
    }
  };
  const blush = (al: number) => {
    ctx.fillStyle = `rgba(255,105,120,${al})`;
    ctx.beginPath();
    ctx.ellipse(R * 0.5, R * 0.12, er * 1.3, er * 0.7, 0, 0, TAU);
    ctx.fill();
  };
  ctx.strokeStyle = '#3a1e08';
  ctx.lineWidth = 1.6;
  if (face === 'strain') {
    blush(0.35 + p * 0.4);
    for (const [x, s] of [[e1x, 1], [e2x, -1]] as [number, number][]) {
      ctx.beginPath();
      ctx.moveTo(x - er * s, ey - er * 0.8);
      ctx.lineTo(x + er * 0.6 * s, ey);
      ctx.lineTo(x - er * s, ey + er * 0.8);
      ctx.stroke();
    }
    // 볼 빵빵 + 꾹 다문 입
    ctx.fillStyle = '#5a2010';
    ctx.beginPath();
    ctx.ellipse(mx - 1, my, er * 0.55, er * 0.22, 0, 0, TAU);
    ctx.fill();
  } else if (face === 'wow' || face === 'panic') {
    blush(0.55);
    const j = face === 'panic' ? Math.sin(t * 2.3) * 0.6 : 0;
    eye(e1x + j, ey, er * 1.18, 0, 0, 0);
    eye(e2x + j, ey + 0.5, er, 0.1, 0, 0);
    ctx.fillStyle = '#5a2010';
    ctx.beginPath();
    ctx.arc(mx - 1, my + 1, er * 0.42, 0, TAU);
    ctx.fill();
    if (face === 'panic') {
      const ph = (t % 26) / 26;
      ctx.fillStyle = '#9fe0ff';
      ctx.beginPath();
      ctx.ellipse(-R * 0.1, -R * 1.05 + ph * R * 0.5, 2.2, 3.2, 0, 0, TAU);
      ctx.fill();
    }
  } else if (face === 'blow') {
    for (const x of [e1x, e2x]) {
      ctx.beginPath();
      ctx.arc(x, ey + er * 0.3, er * 0.75, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
    // 오므린 입술 '3'
    ctx.fillStyle = '#ff7f8e';
    ctx.strokeStyle = '#8a2a2a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(mx + 1.5, my + 1, er * 0.55, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#5a1010';
    ctx.beginPath();
    ctx.arc(mx + 2.5, my + 1.5, er * 0.22, 0, TAU);
    ctx.fill();
  } else if (face === 'dizzy') {
    for (const x of [e1x, e2x]) {
      ctx.beginPath();
      for (let a = 0; a < TAU * 2; a += 0.4) {
        const rr = (a / (TAU * 2)) * er;
        const px = x + Math.cos(a + t * 0.4) * rr, py = ey + Math.sin(a + t * 0.4) * rr;
        if (a === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(mx - er, my);
    for (let q = 0; q <= 4; q++) ctx.lineTo(mx - er + (q * er) / 2, my + (q % 2 ? 1.6 : -1.6));
    ctx.stroke();
  } else if (face === 'smug') {
    blush(0.3);
    eye(e1x, ey, er, 0.6, 0.2, 0.55);
    eye(e2x, ey + 0.5, er * 0.9, 0.6, 0.2, 0.55);
    ctx.beginPath();
    ctx.moveTo(e1x - er, ey - er * 1.6);
    ctx.lineTo(e1x + er, ey - er * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(mx - er * 0.6, my - er * 0.2, er * 0.7, 0.2, Math.PI - 0.4);
    ctx.stroke();
  } else if (face === 'oops' || face === 'sad') {
    eye(e1x, ey, er, -0.2, 0.7, face === 'sad' ? 0.35 : 0);
    eye(e2x, ey + 0.5, er * 0.9, -0.2, 0.7, face === 'sad' ? 0.35 : 0);
    ctx.beginPath();
    ctx.moveTo(e1x - er, ey - er * 1.7);
    ctx.lineTo(e1x + er * 0.8, ey - er * 1.3);
    ctx.stroke();
    ctx.beginPath();
    if (face === 'sad') ctx.arc(mx - er * 0.6, my + er * 0.9, er * 0.6, Math.PI * 1.15, Math.PI * 1.85);
    else ctx.arc(mx - 1, my + 1, er * 0.35, 0, TAU);
    ctx.stroke();
    const ph = (t % 40) / 40;
    ctx.fillStyle = '#9fe0ff';
    ctx.beginPath();
    ctx.ellipse(R * 0.95, -R * 0.55 + ph * 4, 2, 3, 0, 0, TAU);
    ctx.fill();
  } else {
    // 무표정 (멍~)
    const blink = t % 190 < 6;
    if (blink)
      for (const x of [e1x, e2x]) {
        ctx.beginPath();
        ctx.moveTo(x - er, ey);
        ctx.lineTo(x + er, ey);
        ctx.stroke();
      }
    else (eye(e1x, ey, er, 0.4, 0.15, 0.45), eye(e2x, ey + 0.5, er * 0.9, 0.4, 0.15, 0.45));
    ctx.beginPath();
    ctx.moveTo(mx - er * 0.9, my + 0.5);
    ctx.lineTo(mx, my);
    ctx.stroke();
  }
}

const CORAL_C: [string, string][] = [['#ff5f9a', '#ffb6d2'], ['#ff8a3d', '#ffc890'], ['#9d6bff', '#d6c2ff'], ['#ffcf33', '#fff1a6'], ['#2fd3c0', '#a8f5ea']];
/** 산호 (원점 = 모래 위 밑동, sz = 높이 px). v = 모양(가지·뇌·부채·관), grow = 자라는 정도 */
function drawCoral(ctx: CanvasRenderingContext2D, sz: number, tier: number, v: number, t: number, grow: number, ci: number, accent = true) {
  const [c1, c2] = CORAL_C[(v + tier * 2 + ci) % 5], g = grow, sway = Math.sin(t / 40 + ci) * 0.06;
  ctx.save();
  ctx.scale(g, g);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (accent && tier >= 1) {
    // 중간·큰 산호는 옆에 작은 산호·말미잘이 같이 핀다 (덤불처럼)
    const side: [number, number, number][] = tier === 2 ? [[-0.72, 0.45, (v + 1) % 4], [0.7, 0.52, (v + 3) % 4], [-0.38, 0.32, (v + 2) % 4]] : [[-0.5, 0.4, (v + 1) % 4], [0.52, 0.45, (v + 2) % 4]];
    for (const [sx, ss, sv] of side) {
      ctx.save();
      ctx.translate(sx * sz, 0);
      drawCoral(ctx, sz * ss, 0, sv, t, 1, ci + 3 + Math.round(sx * 4), false);
      ctx.restore();
    }
    if (tier === 2) {
      ctx.strokeStyle = '#ff9ec4';
      ctx.lineWidth = 2.2;
      for (let q = -3; q <= 3; q++) {
        ctx.beginPath();
        ctx.moveTo(sz * 0.32 + q * 1.6, 0);
        ctx.quadraticCurveTo(sz * 0.32 + q * 3, -sz * 0.18, sz * 0.32 + q * 3.6 + Math.sin(t / 16 + q + ci) * 3, -sz * 0.3);
        ctx.stroke();
      }
    }
  }
  if (v === 0) {
    // 가지 산호
    const br = (x: number, y: number, a: number, len: number, wd: number, d: number) => {
      const x2 = x + Math.sin(a + sway) * len, y2 = y - Math.cos(a + sway) * len;
      ctx.strokeStyle = c1;
      ctx.lineWidth = wd;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      if (d > 0) (br(x2, y2, a - 0.45, len * 0.68, wd * 0.75, d - 1), br(x2, y2, a + 0.4, len * 0.62, wd * 0.75, d - 1));
      else {
        ctx.fillStyle = c2;
        ctx.beginPath();
        ctx.arc(x2, y2, wd * 0.62, 0, TAU);
        ctx.fill();
      }
    };
    br(0, 0, -0.1, sz * 0.42, sz * 0.13, tier >= 1 ? 2 : 1);
    br(sz * 0.05, 0, 0.55, sz * 0.3, sz * 0.1, 1);
  } else if (v === 1) {
    // 뇌 산호 (동글동글)
    const rw = sz * 0.55, rh = sz * 0.62;
    const gg = ctx.createRadialGradient(-rw * 0.3, -rh * 0.7, 2, 0, -rh * 0.3, rw * 1.1);
    gg.addColorStop(0, c2);
    gg.addColorStop(1, c1);
    ctx.fillStyle = gg;
    ctx.beginPath();
    ctx.ellipse(0, 0, rw, rh, 0, Math.PI, TAU);
    ctx.fill();
    ctx.strokeStyle = rgba('#000000', 0.18);
    ctx.lineWidth = 1.2;
    for (let q = 0; q < 3; q++) {
      ctx.beginPath();
      for (let a = 0; a <= 10; a++) {
        const xx = -rw * 0.8 + (a / 10) * rw * 1.6, yy = -rh * (0.25 + q * 0.22) * Math.sqrt(Math.max(0, 1 - (xx / rw) ** 2)) + Math.sin(a * 1.7 + q) * 2;
        if (a === 0) ctx.moveTo(xx, yy);
        else ctx.lineTo(xx, yy);
      }
      ctx.stroke();
    }
  } else if (v === 2) {
    // 부채 산호
    ctx.save();
    ctx.rotate(sway);
    ctx.fillStyle = rgba(c1 as string, 0.85);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, -sz * 0.1, sz * 0.72, -Math.PI * 0.86, -Math.PI * 0.14);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = c2;
    ctx.lineWidth = 1;
    for (let q = -3; q <= 3; q++) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.sin(q * 0.32) * sz * 0.7, -sz * 0.1 - Math.cos(q * 0.32) * sz * 0.66);
      ctx.stroke();
    }
    for (const rr of [0.3, 0.5]) {
      ctx.beginPath();
      ctx.arc(0, -sz * 0.1, sz * rr, -Math.PI * 0.82, -Math.PI * 0.18);
      ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = mix(c1, '#3a1020', 0.4);
    ctx.fillRect(-sz * 0.04, -sz * 0.12, sz * 0.08, sz * 0.12);
  } else {
    // 관 산호 (뽀글뽀글 관)
    const tubes = tier >= 1 ? [[-0.28, 0.55], [0, 0.85], [0.26, 0.65], [0.13, 0.38]] : [[-0.15, 0.55], [0.12, 0.75]];
    for (const [tx, th] of tubes) {
      const x = tx * sz + sway * sz * th, hgt = th * sz, wd = sz * 0.17;
      ctx.fillStyle = c1;
      ctx.beginPath();
      ctx.roundRect(x - wd / 2, -hgt, wd, hgt, wd * 0.4);
      ctx.fill();
      ctx.fillStyle = c2;
      ctx.beginPath();
      ctx.ellipse(x, -hgt, wd * 0.55, wd * 0.25, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = mix(c1, '#20060c', 0.55);
      ctx.beginPath();
      ctx.ellipse(x, -hgt, wd * 0.3, wd * 0.12, 0, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}
function drawFish(ctx: CanvasRenderingContext2D, x: number, y: number, sz: number, col: string, dir: number, t: number, clown = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  const wig = Math.sin(t * 0.5) * sz * 0.25;
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(-sz * 0.7, 0);
  ctx.lineTo(-sz * 1.15, -sz * 0.4 + wig);
  ctx.lineTo(-sz * 1.15, sz * 0.4 + wig);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, 0, sz * 0.8, sz * 0.45, 0, 0, TAU);
  ctx.fill();
  if (clown) {
    ctx.fillStyle = '#ffffff';
    for (const sx of [-0.35, 0.25]) (ctx.beginPath(), ctx.ellipse(sx * sz, 0, sz * 0.1, sz * 0.42, 0, 0, TAU), ctx.fill());
    ctx.strokeStyle = '#2a1408';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.ellipse(0, 0, sz * 0.8, sz * 0.45, 0, 0, TAU);
    ctx.stroke();
  }
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(sz * 0.42, -sz * 0.08, sz * 0.17, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#101010';
  ctx.beginPath();
  ctx.arc(sz * 0.46, -sz * 0.08, sz * 0.09, 0, TAU);
  ctx.fill();
  ctx.restore();
}
function drawJelly(ctx: CanvasRenderingContext2D, R: number, t: number, ph: number, mad: boolean, glow: number) {
  const pulse = 1 + Math.sin(t / 14 + ph) * 0.08;
  ctx.lineCap = 'round';
  // 촉수
  ctx.strokeStyle = 'rgba(255,170,220,.75)';
  ctx.lineWidth = 1.6;
  for (let q = 0; q < 5; q++) {
    const x0 = (q - 2) * R * 0.32;
    ctx.beginPath();
    ctx.moveTo(x0, 0);
    for (let s = 1; s <= 6; s++) ctx.lineTo(x0 + Math.sin(t / 10 + q + s * 0.9 + ph) * R * 0.16, s * R * 0.27);
    ctx.stroke();
  }
  // 갓
  ctx.shadowColor = '#ff9ad8';
  ctx.shadowBlur = 10 + glow * 14;
  const g = ctx.createRadialGradient(-R * 0.25, -R * 0.6, 2, 0, -R * 0.3, R * 1.1);
  g.addColorStop(0, 'rgba(255,235,250,.95)');
  g.addColorStop(1, 'rgba(240,120,210,.78)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, R * pulse, R * 0.9 / pulse, 0, Math.PI, TAU);
  for (let q = 0; q <= 6; q++) ctx.quadraticCurveTo(R * pulse - (q + 0.5) * ((2 * R * pulse) / 7), R * 0.22, R * pulse - (q + 1) * ((2 * R * pulse) / 7), 0);
  ctx.fill();
  ctx.shadowBlur = 0;
  // 얼굴: 평소엔 졸린 눈, 찌를 땐 화난 눈
  ctx.strokeStyle = '#7a2058';
  ctx.lineWidth = 1.4;
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    if (mad) (ctx.moveTo(sx * R * 0.42, -R * 0.5), ctx.lineTo(sx * R * 0.18, -R * 0.38));
    else ctx.arc(sx * R * 0.3, -R * 0.4, R * 0.12, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,90,150,.45)';
  for (const sx of [-1, 1]) (ctx.beginPath(), ctx.ellipse(sx * R * 0.52, -R * 0.22, R * 0.12, R * 0.07, 0, 0, TAU), ctx.fill());
}
function drawCrab(ctx: CanvasRenderingContext2D, R: number, t: number, flip: number, snip: number, dir: number) {
  ctx.save();
  if (flip > 0) (ctx.translate(0, -R * 0.55), ctx.rotate(Math.PI + Math.sin(t * 0.5) * 0.15), ctx.translate(0, R * 0.2));
  const fast = flip > 0 ? 1.2 : snip > 0 ? 0.9 : 0.35;
  ctx.strokeStyle = '#b8281e';
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  for (const sx of [-1, 1])
    for (let q = 0; q < 3; q++) {
      const a = Math.sin(t * fast + q * 1.3 + sx) * 0.25;
      ctx.beginPath();
      ctx.moveTo(sx * R * 0.4, -R * 0.25);
      ctx.lineTo(sx * R * (0.75 + q * 0.12), -R * (0.15 - a * 0.4));
      ctx.lineTo(sx * R * (0.85 + q * 0.14), R * 0.02);
      ctx.stroke();
    }
  // 집게
  const open = Math.abs(Math.sin(t * (snip > 0 ? 0.8 : 0.12))) * 0.6;
  for (const sx of [-1, 1]) {
    ctx.save();
    ctx.translate(sx * R * 0.62, -R * 0.62);
    ctx.fillStyle = '#ff5a40';
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.26, -Math.PI / 2 - open + (sx * Math.PI) / 2, (Math.PI * 3) / 2 + open + (sx * Math.PI) / 2 - 0.0001);
    ctx.lineTo(0, 0);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = '#e8432f';
  ctx.beginPath();
  ctx.ellipse(0, -R * 0.32, R * 0.55, R * 0.33, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,200,170,.5)';
  ctx.beginPath();
  ctx.ellipse(-R * 0.12, -R * 0.45, R * 0.25, R * 0.1, 0, 0, TAU);
  ctx.fill();
  // 눈자루
  for (const sx of [-1, 1]) {
    ctx.strokeStyle = '#b8281e';
    ctx.beginPath();
    ctx.moveTo(sx * R * 0.16 + dir * 0.5, -R * 0.55);
    ctx.lineTo(sx * R * 0.2 + dir * 1.5, -R * 0.82);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(sx * R * 0.2 + dir * 1.5, -R * 0.86, R * 0.11, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(sx * R * 0.2 + dir * 2, -R * 0.86, R * 0.05, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawWorld(ctx: CanvasRenderingContext2D, s: PufferState, w: number, h: number, th: Theme) {
  const fx = juice(s), c = s.c, b = s.b, k = c.k;
  const S = w / 7.5, hudT = w * 0.135, hudB = w * 0.105, T = S * 0.7, D = S * 1.25, skew = D * 0.36;
  const yF = h - hudB - T, L = 0.5;
  const pan = s.phase === 'pause' && s.cleared ? Math.max(0, Math.min(1, (PAUSE_CLEAR - 20 - s.pause) / (PAUSE_CLEAR - 50))) : 0;
  const ease = pan < 0.5 ? 2 * pan * pan : 1 - (2 - 2 * pan) ** 2 / 2;
  const camX = Math.max(-0.8, b.x - 2.6) * (1 - ease) - 0.6 * ease;
  const X = (wx: number, z: number) => (wx - camX) * S + z * skew;
  const Y = (z: number, hg: number) => yF - z * D - hg * S;
  const x0 = camX - 1.5, x1 = camX + 8.5;
  const vis = (x: number, pad = 1) => x > x0 - pad && x < x1 + pad;
  const cave = c.cave >= 0, inCave = cave ? Math.max(0, Math.min(1, (b.x - c.cave + 2) / 3)) : 0;
  const deep = k === 5 ? 0.35 : k === 2 ? 0.15 : 0;
  const recent = (kind: string, n: number) => s.events.some((e) => e.kind === kind && s.t - e.t < n);
  const yawn = yawning(c, s.ct), yawnSoon = c.whale && !yawn && (s.ct + 200) % YAWN > YAWN - 90;
  const poly = (pts: [number, number][], fill: string | CanvasGradient) => {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  };
  ctx.save();
  fx.begin(ctx);
  // ── 하늘 (수면 위) ──
  const sB = Y(1, YS), sFr = Y(0, YS);
  const sky = ctx.createLinearGradient(0, hudT, 0, sB);
  sky.addColorStop(0, mix('#7fd0ff', '#1a2440', inCave));
  sky.addColorStop(1, mix('#dff6ff', '#2a3458', inCave));
  ctx.fillStyle = sky;
  ctx.fillRect(-10, -10, w + 20, sB + 12);
  if (inCave < 1) {
    const sunX = w * 0.84, sunY = hudT + (sB - hudT) * 0.42;
    ctx.globalAlpha = 1 - inCave;
    const sg = ctx.createRadialGradient(sunX, sunY, 2, sunX, sunY, w * 0.22);
    sg.addColorStop(0, 'rgba(255,248,200,.95)');
    sg.addColorStop(0.18, 'rgba(255,240,170,.8)');
    sg.addColorStop(1, 'rgba(255,240,180,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(sunX - w * 0.22, sunY - w * 0.22, w * 0.44, w * 0.44);
    for (let i = 0; i < 3; i++) {
      const cx = ((((i * 173 + s.t * 0.12 - camX * S * 0.05) % (w + 140)) + w + 140) % (w + 140)) - 70, cy = hudT + 12 + i * 11;
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      for (const [dx, dy, r] of [[0, 0, 10], [11, -4, 8], [-11, -1, 7], [20, 2, 6]]) (ctx.beginPath(), ctx.arc(cx + dx, cy + dy, r, 0, TAU), ctx.fill());
    }
    // 갈매기
    ctx.strokeStyle = 'rgba(40,60,80,.7)';
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 2; i++) {
      const bx = w + 20 - ((s.t * (0.4 + i * 0.15) + i * 160) % (w + 60)), by = hudT + 18 + i * 14 + Math.sin(s.t / 25 + i) * 4, fl = Math.sin(s.t / 6 + i) * 3;
      ctx.beginPath();
      ctx.moveTo(bx - 6, by - fl);
      ctx.quadraticCurveTo(bx - 3, by - 2, bx, by);
      ctx.quadraticCurveTo(bx + 3, by - 2, bx + 6, by - fl);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  // ── 물 ──
  const wg = ctx.createLinearGradient(0, sB, 0, yF + T);
  wg.addColorStop(0, mix(mix('#5fd4ee', '#3b8fd8', deep), '#0e2a48', inCave));
  wg.addColorStop(0.5, mix(mix('#2aa0cc', '#1f5fae', deep), '#0a1c34', inCave));
  wg.addColorStop(1, mix(mix('#126d9e', '#123f80', deep), '#060f20', inCave));
  ctx.fillStyle = wg;
  ctx.fillRect(-10, sB, w + 20, h - sB + 10);
  // 햇살 기둥
  if (inCave < 1) {
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) {
      const bx = (((i * 97 + 40 - camX * S * 0.25) % (w + 160)) + w + 160) % (w + 160) - 80, sway = Math.sin(s.t / 90 + i * 1.7) * 14, al = (0.07 + 0.04 * Math.sin(s.t / 50 + i)) * (1 - inCave);
      const rg = ctx.createLinearGradient(0, sB, 0, yF);
      rg.addColorStop(0, `rgba(255,255,230,${al * 2})`);
      rg.addColorStop(1, 'rgba(255,255,230,0)');
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.moveTo(bx, sB);
      ctx.lineTo(bx + 26 + i * 3, sB);
      ctx.lineTo(bx - 40 + sway + i * 4, yF);
      ctx.lineTo(bx - 90 + sway, yF);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  // 먼 산호초 · 다시마 숲 (시차)
  for (const [par, base, amp, col] of [[0.2, Y(1, 0) - S * 0.9, S * 0.5, '#3f8fb0'], [0.45, Y(1, 0) - S * 0.35, S * 0.4, '#2f7a9e']] as [number, number, number, string][]) {
    ctx.fillStyle = mix(mix(col, '#2a4f8a', deep), '#0c1a30', inCave);
    ctx.beginPath();
    ctx.moveTo(-10, Y(1, 0) + 2);
    for (let px = -10; px <= w + 10; px += 8) {
      const q = (px + camX * S * par) / 40;
      ctx.lineTo(px, base - amp * (0.5 + 0.5 * Math.sin(q)) - amp * 0.4 * Math.abs(Math.sin(q * 2.7 + 1)));
    }
    ctx.lineTo(w + 10, Y(1, 0) + 2);
    ctx.fill();
  }
  // 고래 (6판): 수면 가까이 둥실, 하품하면 입이 쩍 — 그쪽으로 물이 빨려 올라간다
  if (c.whale) {
    const ws = w * 0.24, wx = w * 0.7 + Math.sin(s.t / 200) * 8, wy = sFr + ws * 0.42;
    const ph = (s.ct + 200) % YAWN, open = yawn ? Math.min(1, ph / 18, (YAWN_ON - ph) / 18) : 0;
    ctx.save();
    ctx.globalAlpha = 0.92;
    // 몸통 (큰 머리 → 꼬리)
    const bodyG = ctx.createLinearGradient(0, wy - ws * 0.4, 0, wy + ws * 0.4);
    bodyG.addColorStop(0, '#3d6fb0');
    bodyG.addColorStop(1, '#2a4f88');
    ctx.fillStyle = bodyG;
    ctx.beginPath();
    ctx.moveTo(wx - ws, wy);
    ctx.bezierCurveTo(wx - ws, wy - ws * 0.42, wx + ws * 0.2, wy - ws * 0.45, wx + ws * 0.85, wy - ws * 0.12);
    ctx.lineTo(wx + ws * 1.05, wy - ws * 0.05);
    ctx.lineTo(wx + ws * 1.35, wy - ws * 0.32 + Math.sin(s.t / 25) * 4);
    ctx.lineTo(wx + ws * 1.25, wy + Math.sin(s.t / 25) * 2);
    ctx.lineTo(wx + ws * 1.38, wy + ws * 0.22 + Math.sin(s.t / 25) * 4);
    ctx.lineTo(wx + ws * 1.02, wy + ws * 0.06);
    ctx.bezierCurveTo(wx + ws * 0.5, wy + ws * 0.3, wx - ws * 0.4, wy + ws * 0.42, wx - ws * 0.9, wy + ws * 0.12 + open * ws * 0.3);
    ctx.closePath();
    ctx.fill();
    // 배 줄무늬
    ctx.strokeStyle = 'rgba(200,225,250,.55)';
    ctx.lineWidth = 1.5;
    for (let q = 0; q < 4; q++) {
      ctx.beginPath();
      ctx.moveTo(wx - ws * 0.75 + q * 4, wy + ws * (0.16 + q * 0.04) + open * ws * 0.2 * (1 - q / 4));
      ctx.quadraticCurveTo(wx - ws * 0.1, wy + ws * (0.3 + q * 0.03), wx + ws * 0.4, wy + ws * (0.2 + q * 0.02));
      ctx.stroke();
    }
    // 입 (하품: 아래턱이 쩍)
    if (open > 0) {
      ctx.fillStyle = '#5a1a2a';
      ctx.beginPath();
      ctx.moveTo(wx - ws, wy);
      ctx.quadraticCurveTo(wx - ws * 0.6, wy + ws * 0.05, wx - ws * 0.3, wy + ws * 0.08);
      ctx.quadraticCurveTo(wx - ws * 0.55, wy + ws * (0.1 + open * 0.35), wx - ws * 0.92, wy + ws * 0.12 + open * ws * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ff8aa0';
      ctx.beginPath();
      ctx.ellipse(wx - ws * 0.6, wy + ws * (0.12 + open * 0.2), ws * 0.18, ws * 0.06 * open, 0.2, 0, TAU);
      ctx.fill();
    } else {
      ctx.strokeStyle = '#1a2f50';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(wx - ws * 0.97, wy + 2);
      ctx.quadraticCurveTo(wx - ws * 0.6, wy + ws * 0.12, wx - ws * 0.3, wy + ws * 0.06);
      ctx.stroke();
    }
    // 눈: 평소엔 끔뻑, 하품 전엔 스르르, 하품 중엔 꼭 감고
    const ex = wx - ws * 0.42, ey = wy - ws * 0.06;
    ctx.strokeStyle = '#0e1a30';
    ctx.lineWidth = 2;
    if (yawn) (ctx.beginPath(), ctx.moveTo(ex - 5, ey - 2), ctx.lineTo(ex + 1, ey + 1), ctx.lineTo(ex - 5, ey + 3), ctx.stroke());
    else if (yawnSoon) (ctx.beginPath(), ctx.arc(ex, ey, 4, 0.15, Math.PI - 0.15), ctx.stroke());
    else {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex, ey, 4.5, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#0e1a30';
      ctx.beginPath();
      ctx.arc(ex - 1, ey + 0.5, 2.4, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,120,140,.45)';
    ctx.beginPath();
    ctx.ellipse(ex - 2, ey + 8, 6, 3, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    // 물줄기 빨려 올라감
    if (yawn) {
      ctx.strokeStyle = 'rgba(230,248,255,.55)';
      ctx.lineWidth = 1.6;
      const mx = wx - ws * 0.9, my = wy + ws * 0.1;
      for (let q = 0; q < 8; q++) {
        const f = ((s.t * 1.8 + q * 25) % 100) / 100, sx = q * (w / 8) + 10, sy = yF - S * 0.6 - q * 6;
        const qx = sx + (mx - sx) * f, qy = sy + (my - sy) * f;
        ctx.beginPath();
        ctx.moveTo(qx, qy);
        ctx.lineTo(qx + (mx - sx) * 0.08, qy + (my - sy) * 0.08);
        ctx.stroke();
      }
      label(ctx, '하아아암~', wx - ws * 0.3, wy + ws * 0.7, 14, '#e8f4ff');
    } else if (yawnSoon) label(ctx, '😪 곧 하품…', wx - ws * 0.2, wy + ws * 0.62, 13, 'rgba(232,244,255,.9)');
  }
  // 먼 물고기 떼 (빵빵한 복어가 다가오면 흩어진다)
  {
    const px = X(b.x, L), py = Y(L, b.y);
    for (let i = 0; i < 9; i++) {
      const a = s.t / 160 + (i * TAU) / 9, cx = ((w * 0.5 + Math.cos(s.t / 300) * w * 0.35 - camX * S * 0.1) % (w + 120) + w + 120) % (w + 120) - 60;
      let fx0 = cx + Math.cos(a) * S * 0.9 + (i % 3) * 6, fy0 = sB + S * 1.4 + Math.sin(a * 2) * S * 0.35 + (i % 2) * 8;
      const dd = Math.hypot(fx0 - px, fy0 - py), scare = b.p > 0.6 && dd < S * 2.5 ? (1 - dd / (S * 2.5)) * S * 1.6 : 0;
      if (scare) (fx0 += ((fx0 - px) / (dd + 1)) * scare), (fy0 += ((fy0 - py) / (dd + 1)) * scare);
      ctx.globalAlpha = 0.55;
      drawFish(ctx, fx0, fy0, S * 0.09, mix('#bfe8ff', '#5f7fa8', inCave), -Math.sin(a) >= 0 ? 1 : -1, s.t + i * 7);
    }
    ctx.globalAlpha = 1;
  }
  // ── 수면 윗면 (물결) ──
  {
    const sg = ctx.createLinearGradient(0, sB, 0, sFr);
    sg.addColorStop(0, mix('#bff4ff', '#203a60', inCave));
    sg.addColorStop(1, mix('#7fe0f4', '#1a3050', inCave));
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.moveTo(-10, sB);
    for (let px = -10; px <= w + 10; px += 10) ctx.lineTo(px, sB + Math.sin(px / 23 + s.t / 20) * 1.5);
    for (let px = w + 10; px >= -10; px -= 10) ctx.lineTo(px, sFr + Math.sin(px / 19 - s.t / 17) * 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${0.75 - inCave * 0.6})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let px = -10; px <= w + 10; px += 10) (px === -10 ? ctx.moveTo(px, sFr + Math.sin(px / 19 - s.t / 17) * 2) : ctx.lineTo(px, sFr + Math.sin(px / 19 - s.t / 17) * 2));
    ctx.stroke();
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 12; i++) {
      const gx = hsh(i * 13) * w, gy = sB + 3 + hsh(i * 7 + 2) * (sFr - sB - 6), al = 0.6 * Math.max(0, Math.sin(s.t / 18 + i * 1.3));
      ctx.strokeStyle = `rgba(255,255,255,${al * (1 - inCave)})`;
      ctx.beginPath();
      ctx.moveTo(gx - 5, gy);
      ctx.quadraticCurveTo(gx, gy - 2, gx + 5, gy);
      ctx.stroke();
    }
    // 작은 나룻배 (수면 위 이웃)
    if (inCave < 1) {
      const bx = (((w * 0.3 - camX * S * 0.3) % (w + 120)) + w + 120) % (w + 120) - 60, by = (sB + sFr) / 2 + Math.sin(s.t / 30) * 1.5;
      ctx.globalAlpha = 1 - inCave;
      poly([[bx - 22, by - 4], [bx + 22, by - 4], [bx + 15, by + 6], [bx - 15, by + 6]], '#b0703a');
      poly([[bx - 22, by - 4], [bx + 22, by - 4], [bx + 21, by - 1], [bx - 21, by - 1]], '#d8935a');
      ctx.fillStyle = '#5a3a20';
      ctx.fillRect(bx - 1, by - 30, 2, 26);
      poly([[bx + 1, by - 30], [bx + 1, by - 7], [bx + 17, by - 8]], '#fff6e6');
      emo(ctx, '🐧', bx - 10, by - 11, 13);
      ctx.globalAlpha = 1;
    }
  }
  // ── 모래 바닥 윗면 ──
  const sx0 = X(x0, 0), sx1 = X(x1, 0);
  const sandTop = ctx.createLinearGradient(0, Y(1, 0), 0, yF);
  sandTop.addColorStop(0, mix(mix('#b9c9b0', '#9aa6c0', deep), '#2a3040', inCave));
  sandTop.addColorStop(1, mix('#f0dca8', '#4a4438', inCave));
  poly([[sx0, yF], [sx1, yF], [X(x1, 1), Y(1, 0)], [X(x0, 1), Y(1, 0)]], sandTop);
  // 모래 물결 무늬
  ctx.strokeStyle = `rgba(150,120,70,${0.25 - inCave * 0.15})`;
  ctx.lineWidth = 1;
  for (let i = Math.floor(x0); i < x1; i++)
    for (let q = 0; q < 3; q++) {
      const z = 0.12 + q * 0.3 + hsh(i * 3 + q) * 0.08, xx = i + hsh(i * 7 + q) * 0.6;
      ctx.beginPath();
      ctx.moveTo(X(xx, z), Y(z, 0));
      ctx.quadraticCurveTo(X(xx + 0.2, z) , Y(z, 0) - 2, X(xx + 0.4, z), Y(z, 0));
      ctx.stroke();
    }
  // 화단: 조약돌 테두리 안 고운 모래 (여기에만 산호가 자란다)
  c.beds.forEach((B, i) => {
    if (!vis(B.x0, 6) || B.x0 > x1 + 1) return;
    const done = s.done[i] === 1;
    poly([[X(B.x0, 0.2), Y(0.2, 0)], [X(B.x1, 0.2), Y(0.2, 0)], [X(B.x1, 0.8), Y(0.8, 0)], [X(B.x0, 0.8), Y(0.8, 0)]], mix(done ? '#ffe9b8' : '#d6ad72', '#3a3428', inCave * 0.8));
    // 고운 모래 알갱이
    for (let q = 0; q < (B.x1 - B.x0) * 9; q++) {
      const xx = B.x0 + 0.1 + hsh(i * 53 + q) * (B.x1 - B.x0 - 0.2), z = 0.26 + hsh(i * 71 + q * 3) * 0.48;
      ctx.fillStyle = q % 3 ? mix('#b88a52', '#2a2620', inCave * 0.8) : mix('#fff0c8', '#4a4438', inCave * 0.8);
      ctx.fillRect(X(xx, z), Y(z, 0), 2, 1.4);
    }
    for (let q = 0; q < (B.x1 - B.x0) * 5; q++) {
      const xx = B.x0 + q * 0.2, bob = hsh(i * 31 + q);
      for (const z of [0.2, 0.8]) {
        ctx.fillStyle = done ? (q % 2 ? '#ffd86a' : '#fff1b8') : mix(bob < 0.5 ? '#c9b8a0' : '#a8988a', '#2a2a30', inCave * 0.7);
        ctx.beginPath();
        ctx.ellipse(X(xx, z), Y(z, 0), 2.6, 1.5, 0, 0, TAU);
        ctx.fill();
      }
    }
    // 빈 자리 반짝 (심을 수 있는 곳)
    if (!done)
      for (let q = 0; q < (B.x1 - B.x0) * 1.5; q++) {
        const xx = B.x0 + 0.3 + hsh(i * 17 + q) * (B.x1 - B.x0 - 0.6);
        if (s.corals.some((cq) => cq.bed === i && xx >= cq.a && xx <= cq.b)) continue;
        const al = 0.5 * Math.max(0, Math.sin(s.t / 16 + q * 2.1));
        ctx.fillStyle = `rgba(255,255,230,${al})`;
        const sx = X(xx, 0.5), sy = Y(0.5, 0) - 2;
        ctx.beginPath();
        ctx.moveTo(sx, sy - 4);
        ctx.lineTo(sx + 1.2, sy - 1.2);
        ctx.lineTo(sx + 4, sy);
        ctx.lineTo(sx + 1.2, sy + 1.2);
        ctx.lineTo(sx, sy + 4);
        ctx.lineTo(sx - 1.2, sy + 1.2);
        ctx.lineTo(sx - 4, sy);
        ctx.lineTo(sx - 1.2, sy - 1.2);
        ctx.fill();
      }
  });
  // 맨 뒤 소품: 다시마 · 바닷말 · 바위 · 말미잘
  const drawDeco = (d: Deco) => {
    if (!vis(d.x)) return;
    const bx = X(d.x, d.z), by = Y(d.z, 0), sc = d.s * S;
    if (d.kind === 0) {
      ctx.strokeStyle = mix('#3f9a4a', '#1a3a2a', inCave);
      ctx.lineWidth = sc * 0.1;
      ctx.lineCap = 'round';
      for (let q = 0; q < 2; q++) {
        ctx.beginPath();
        ctx.moveTo(bx + q * 5, by);
        const hh = sc * (1.6 + q * 0.5);
        for (let y = 1; y <= 8; y++) ctx.lineTo(bx + q * 5 + Math.sin(s.t / 35 + y * 0.6 + d.x + q) * sc * 0.12 * (y / 8), by - (hh * y) / 8);
        ctx.stroke();
        ctx.fillStyle = mix('#5fbf5a', '#204a30', inCave);
        for (let y = 2; y <= 7; y += 2) {
          const lx = bx + q * 5 + Math.sin(s.t / 35 + y * 0.6 + d.x + q) * sc * 0.12 * (y / 8), ly = by - (hh * y) / 8;
          ctx.beginPath();
          ctx.ellipse(lx + (y % 4 ? 4 : -4), ly, sc * 0.12, sc * 0.05, y % 4 ? -0.5 : 0.5, 0, TAU);
          ctx.fill();
        }
      }
    } else if (d.kind === 1) {
      ctx.strokeStyle = mix('#6fcf6a', '#1f3a2a', inCave);
      ctx.lineWidth = 1.5;
      for (let q = -2; q <= 2; q++) {
        ctx.beginPath();
        ctx.moveTo(bx + q * 2, by);
        ctx.quadraticCurveTo(bx + q * 3 + Math.sin(s.t / 25 + q + d.x) * 3, by - sc * 0.3, bx + q * 4 + Math.sin(s.t / 25 + q + d.x) * 5, by - sc * (0.45 + Math.abs(q) * -0.05));
        ctx.stroke();
      }
    } else if (d.kind === 2) {
      ctx.fillStyle = '#ffd6c8';
      ctx.beginPath();
      ctx.moveTo(bx - sc * 0.14, by);
      ctx.quadraticCurveTo(bx, by - sc * 0.24, bx + sc * 0.14, by);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#d89a8a';
      ctx.lineWidth = 0.8;
      for (const q of [-0.07, 0, 0.07]) (ctx.beginPath(), ctx.moveTo(bx, by - sc * 0.02), ctx.lineTo(bx + q * sc, by - sc * 0.15), ctx.stroke());
    } else if (d.kind === 3) {
      ctx.fillStyle = '#ff8a5a';
      ctx.beginPath();
      for (let q = 0; q < 10; q++) {
        const a = (q / 10) * TAU - Math.PI / 2, rr = q % 2 ? sc * 0.06 : sc * 0.15;
        ctx.lineTo(bx + Math.cos(a) * rr, by - sc * 0.05 + Math.sin(a) * rr * 0.55);
      }
      ctx.fill();
    } else if (d.kind === 4) {
      ctx.fillStyle = mix('#5a7486', '#1a2430', inCave);
      ctx.beginPath();
      ctx.ellipse(bx, by, sc * 0.55, sc * 0.4, 0, Math.PI, TAU);
      ctx.fill();
      ctx.fillStyle = mix('#7a96a8', '#243240', inCave);
      ctx.beginPath();
      ctx.ellipse(bx - sc * 0.15, by - sc * 0.22, sc * 0.25, sc * 0.1, 0, 0, TAU);
      ctx.fill();
    } else {
      ctx.strokeStyle = mix('#ff9ec4', '#5a3050', inCave * 0.6);
      ctx.lineWidth = 2;
      for (let q = -3; q <= 3; q++) {
        ctx.beginPath();
        ctx.moveTo(bx + q * 1.5, by);
        ctx.quadraticCurveTo(bx + q * 3, by - sc * 0.2, bx + q * 3.5 + Math.sin(s.t / 18 + q) * 3, by - sc * 0.32);
        ctx.stroke();
      }
    }
  };
  for (const d of c.deco) if (d.z > 0.5) drawDeco(d);
  // 결승: 대왕 조개 대문 + 깃발
  if (vis(c.len, 3)) {
    const gx = X(c.len + 0.3, 0.55), gy = Y(0.55, 0);
    const open = s.phase === 'pause' && s.cleared ? 1 : 0.35 + 0.15 * Math.sin(s.t / 30);
    ctx.fillStyle = '#c8a8e8';
    ctx.beginPath();
    ctx.ellipse(gx, gy, S * 0.7, S * 0.3, 0, 0, Math.PI);
    ctx.fill();
    ctx.save();
    ctx.translate(gx - S * 0.7, gy);
    ctx.rotate(-open * 0.9);
    ctx.fillStyle = '#e2c8ff';
    ctx.beginPath();
    ctx.ellipse(S * 0.7, 0, S * 0.7, S * 0.36, 0, Math.PI, TAU);
    ctx.fill();
    ctx.strokeStyle = '#a080c8';
    ctx.lineWidth = 1;
    for (let q = 1; q < 6; q++) (ctx.beginPath(), ctx.moveTo(S * 0.7, 0), ctx.lineTo(S * 0.7 + Math.cos(Math.PI + (q * Math.PI) / 6) * S * 0.7, Math.sin(Math.PI + (q * Math.PI) / 6) * S * 0.36), ctx.stroke());
    ctx.restore();
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(gx, gy - 4, S * 0.12, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#6a4a2a';
    ctx.fillRect(gx + S * 0.8, gy - S * 1.6, 3, S * 1.6);
    poly([[gx + S * 0.8 + 3, gy - S * 1.6], [gx + S * 0.8 + 3 + S * 0.55, gy - S * 1.45 + Math.sin(s.t / 8) * 2], [gx + S * 0.8 + 3, gy - S * 1.25]], '#ff5a6e');
  }
  // 구경꾼 (뒤 모래): 큰 산호엔 '우와!', 복어가 당하면 '푸핫!'
  for (const f of c.fans) {
    if (!vis(f.x)) continue;
    const near = (kinds: string[], n: number) => s.events.find((e) => kinds.includes(e.kind) && s.t - e.t < n && Math.abs((e.x2 ?? e.x) - f.x) < 4.5);
    const cheer = near(['coral', 'bed', 'up'], 70), laugh = near(['sting', 'bonk', 'gulp', 'stuck', 'high', 'tiny'], 70);
    const big = cheer && (cheer.kind === 'bed' || (cheer.n ?? 0) >= 2);
    const hop = big ? Math.abs(Math.sin(s.t / 5 + f.ph)) * S * 0.3 : laugh ? Math.abs(Math.sin(s.t / 3)) * 3 : Math.abs(Math.sin(s.t / 30 + f.ph)) * 2;
    const fx0 = X(f.x, f.z), fy0 = Y(f.z, 0) - S * 0.28 - hop;
    ctx.save();
    ctx.translate(fx0, fy0);
    if (laugh) ctx.rotate(Math.sin(s.t / 3) * 0.2);
    emo(ctx, f.e, 0, 0, S * 0.5, b.x < f.x);
    ctx.restore();
    if (big && s.t - cheer.t < 50) say(ctx, fx0, fy0 - S * 0.45, cheer.kind === 'bed' ? '와아아!' : '우와!', 12);
    else if (laugh && s.t - laugh.t < 50) say(ctx, fx0, fy0 - S * 0.45, laugh.kind === 'high' || laugh.kind === 'tiny' ? '피식' : '푸핫!', 12);
  }
  // ── 바위 · 굴문 (뒤 벽 → 윗면 → 옆면 → 앞면) ──
  const rockC = mix('#6d8394', '#2a3442', inCave), rockT = mix('#93a9b4', '#34404e', inCave), rockS = mix('#4e6272', '#1c2430', inCave);
  for (const a of c.arches) {
    if (!vis(a.x0, 2)) continue;
    // 굴 속 어두운 벽
    poly([[X(a.x0, 0.78), Y(0.78, a.hy)], [X(a.x1, 0.78), Y(0.78, a.hy)], [X(a.x1, 0.78), Y(0.78, a.hy + HOLE)], [X(a.x0, 0.78), Y(0.78, a.hy + HOLE)]], '#16283a');
    poly([[X(a.x0, 0.2), Y(0.2, a.hy)], [X(a.x0, 0.78), Y(0.78, a.hy)], [X(a.x0, 0.78), Y(0.78, a.hy + HOLE)], [X(a.x0, 0.2), Y(0.2, a.hy + HOLE)]], 'rgba(10,20,30,.55)');
  }
  for (let i = 0; i < c.boxes.length; i++) {
    const bx = c.boxes[i];
    if (!vis(bx.x0, 2)) continue;
    const z0 = 0.2, z1 = 0.78, rad = Math.min(S * 0.22, ((bx.y1 - bx.y0) * S) / 2, ((bx.x1 - bx.x0) * S) / 3);
    // 바닥 그림자
    if (bx.y0 === 0) {
      ctx.fillStyle = 'rgba(20,40,60,.25)';
      ctx.beginPath();
      ctx.ellipse(X((bx.x0 + bx.x1) / 2 + 0.15, 0.5), Y(0.5, 0), ((bx.x1 - bx.x0) * S) / 2 + 8, D * 0.35, 0, 0, TAU);
      ctx.fill();
    }
    // 윗면 (울퉁불퉁 둥근 바위 머리)
    ctx.fillStyle = rockT;
    ctx.beginPath();
    ctx.moveTo(X(bx.x0, z0) + rad * 0.6, Y(z0, bx.y1));
    ctx.lineTo(X(bx.x1, z0) - rad * 0.2, Y(z0, bx.y1));
    ctx.quadraticCurveTo(X(bx.x1, (z0 + z1) / 2) + 3, Y((z0 + z1) / 2, bx.y1), X(bx.x1, z1) - rad * 0.3, Y(z1, bx.y1));
    ctx.lineTo(X(bx.x0, z1) + rad * 0.5, Y(z1, bx.y1));
    ctx.quadraticCurveTo(X(bx.x0, (z0 + z1) / 2) - 3, Y((z0 + z1) / 2, bx.y1), X(bx.x0, z0) + rad * 0.6, Y(z0, bx.y1));
    ctx.fill();
    // 오른쪽 옆면
    ctx.fillStyle = rockS;
    ctx.beginPath();
    ctx.moveTo(X(bx.x1, z0), Y(z0, bx.y0));
    ctx.lineTo(X(bx.x1, z1) - rad * 0.3, Y(z1, bx.y0));
    ctx.lineTo(X(bx.x1, z1) - rad * 0.3, Y(z1, bx.y1));
    ctx.quadraticCurveTo(X(bx.x1, (z0 + z1) / 2) + 3, Y((z0 + z1) / 2, bx.y1), X(bx.x1, z0) - rad * 0.2, Y(z0, bx.y1));
    ctx.closePath();
    ctx.fill();
    const fg = ctx.createLinearGradient(0, Y(z0, bx.y1), 0, Y(z0, bx.y0));
    fg.addColorStop(0, mix(rockC, '#ffffff', 0.12));
    fg.addColorStop(1, mix(rockC, '#000000', 0.3));
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.roundRect(X(bx.x0, z0), Y(z0, bx.y1), (bx.x1 - bx.x0) * S, (bx.y1 - bx.y0) * S, bx.y0 === 0 ? [rad, rad, 2, 2] : rad);
    ctx.fill();
    ctx.strokeStyle = 'rgba(20,30,45,.35)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // 따개비 · 이끼 · 금
    ctx.fillStyle = mix('#7fbf6a', '#2a4030', inCave);
    for (let q = 0; q < (bx.x1 - bx.x0) * 4; q++) {
      const xx = bx.x0 + 0.1 + hsh(i * 19 + q) * (bx.x1 - bx.x0 - 0.2);
      ctx.beginPath();
      ctx.ellipse(X(xx, z0 + 0.3), Y(z0 + 0.3, bx.y1), 3 + hsh(q + i) * 3, 1.6, 0, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(230,240,240,.55)';
    for (let q = 0; q < (bx.x1 - bx.x0) * (bx.y1 - bx.y0) * 3; q++) {
      const xx = bx.x0 + 0.1 + hsh(i * 7 + q * 3) * (bx.x1 - bx.x0 - 0.2), yy = bx.y0 + 0.08 + hsh(i * 11 + q) * (bx.y1 - bx.y0 - 0.16);
      ctx.beginPath();
      ctx.arc(X(xx, z0), Y(z0, yy), 1.6, 0, TAU);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(20,30,40,.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(X(bx.x0 + (bx.x1 - bx.x0) * 0.3, z0), Y(z0, bx.y1));
    ctx.lineTo(X(bx.x0 + (bx.x1 - bx.x0) * 0.45, z0), Y(z0, (bx.y0 + bx.y1) / 2));
    ctx.lineTo(X(bx.x0 + (bx.x1 - bx.x0) * 0.35, z0), Y(z0, bx.y0 + 0.05));
    ctx.stroke();
  }
  // 굴문 표시: 쭈그러져야 들어가는 구멍
  for (const a of c.arches) {
    if (!vis(a.x0, 2) || a.x1 < b.x - 1) continue;
    const fit = radius(b.p) < HOLE / 2 - 0.02;
    ctx.strokeStyle = fit ? 'rgba(160,255,180,.7)' : `rgba(255,120,120,${0.5 + 0.3 * Math.sin(s.t / 5)})`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(X(a.x0, L) - 2, Y(L, a.hy + HOLE), (a.x1 - a.x0) * S + 4, HOLE * S);
    ctx.setLineDash([]);
  }
  // ── 물기둥: 바닥 틈에서 물방울이 솟는다 ──
  for (const z of c.zones) {
    if (!vis(z.x0, 2)) continue;
    const zx0 = X(z.x0, L), zx1 = X(z.x1, L), zy = Y(L, 0);
    const cg = ctx.createLinearGradient(0, zy, 0, Y(L, YS));
    cg.addColorStop(0, 'rgba(220,250,255,.22)');
    cg.addColorStop(1, 'rgba(220,250,255,0)');
    ctx.fillStyle = cg;
    ctx.fillRect(zx0, Y(L, YS), zx1 - zx0, zy - Y(L, YS));
    ctx.fillStyle = '#3a4a58';
    ctx.beginPath();
    ctx.ellipse((zx0 + zx1) / 2, zy, (zx1 - zx0) * 0.35, 4, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(240,255,255,.85)';
    ctx.lineWidth = 1.2;
    for (let q = 0; q < 14; q++) {
      const ph = ((s.t * 1.6 + q * 37) % 200) / 200, bxp = zx0 + hsh(q + Math.floor(z.x0 * 10)) * (zx1 - zx0) + Math.sin(s.t / 9 + q) * 3, byp = zy - ph * (zy - Y(L, YS));
      ctx.beginPath();
      ctx.arc(bxp, byp, 1.5 + (q % 3), 0, TAU);
      ctx.stroke();
    }
    emo(ctx, '⬆️', (zx0 + zx1) / 2, zy - S * 0.35, 13);
  }
  // ── 산호 정원 ──
  const glow: [number, number, number, string][] = [];
  s.corals.forEach((q, i) => {
    if (!vis(q.x)) return;
    const bx = X(q.x, L), by = Y(L, 0), age = s.t - q.t, gr = Math.min(1, age / 30), g2 = gr < 1 ? gr * (1 + 0.25 * Math.sin(gr * Math.PI)) : 1;
    // 산호가 덮은 모래 (정원 넓이)
    ctx.fillStyle = mix(['#f7b8c8', '#ffd0a0', '#d8c0ff'][q.tier], '#3a2a40', inCave * 0.5);
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.ellipse(X((q.a + q.b) / 2, L), by, ((q.b - q.a) * S) / 2, D * 0.22, 0, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.translate(bx, by);
    if (cave) (ctx.shadowColor = CORAL_C[(q.v + q.tier * 2 + i) % 5][0]), (ctx.shadowBlur = 14);
    drawCoral(ctx, S * [0.55, 0.82, 1.18][q.tier], q.tier, q.v, s.t, g2, i);
    ctx.shadowBlur = 0;
    ctx.restore();
    if (q.tier === 2) {
      // 큰 산호엔 흰동가리가 산다 (들락날락)
      const ph = (s.t + i * 50) % 240, out = ph < 150 ? Math.min(1, ph / 20, (150 - ph) / 20) : 0;
      if (out > 0 && gr >= 1) drawFish(ctx, bx + Math.sin(s.t / 30 + i) * S * 0.45 * out, by - S * (0.55 + 0.35 * out), S * 0.14, '#ff7a1a', Math.cos(s.t / 30 + i) > 0 ? 1 : -1, s.t, true);
    }
    if (cave) glow.push([bx, by - S * 0.4, S * (0.8 + q.tier * 0.35), CORAL_C[(q.v + q.tier * 2 + i) % 5][1]]);
  });
  // 완성한 화단: 물고기 가족이 빙글빙글
  c.beds.forEach((B, i) => {
    if (!s.done[i] || !vis(B.x0, 4)) return;
    const cx = X((B.x0 + B.x1) / 2, L), cy = Y(L, 1.5);
    for (let q = 0; q < 4; q++) {
      const a = s.t / 45 + (q * TAU) / 4 + i;
      drawFish(ctx, cx + Math.cos(a) * S * 0.9, cy + Math.sin(a) * S * 0.25, S * (q === 0 ? 0.16 : 0.11), ['#4fc3ff', '#ffd23f', '#ffd23f', '#ffd23f'][q], -Math.sin(a) > 0 ? 1 : -1, s.t + q * 9);
    }
  });
  // ── 꽃게 ──
  for (const cr of s.crabs) {
    if (!vis(cr.x)) continue;
    const cx = X(cr.x, L + 0.08), cy = Y(L + 0.08, 0);
    ctx.fillStyle = 'rgba(40,30,20,.25)';
    ctx.beginPath();
    ctx.ellipse(cx, cy, S * 0.3, S * 0.07, 0, 0, TAU);
    ctx.fill();
    ctx.save();
    ctx.translate(cx, cy);
    drawCrab(ctx, S * 0.36, s.t, cr.flip, cr.snip, cr.dir);
    ctx.restore();
    if (cr.flip > 0 && cr.flip % 60 > 30) label(ctx, '버둥버둥', cx, cy - S * 0.7, 12, '#ffe0d0');
    if (cr.snip > 25) label(ctx, '냠냠', cx, cy - S * 0.7, 12, '#ffd0d0');
  }
  // ── 복어 ──
  const px = X(b.x, L), py = Y(L, b.y), R = radius(b.p) * S;
  // 바닥 그림자
  {
    const gy = Y(L, groundAt(c, b.x)), hgt = Math.max(0, b.y - radius(b.p) - groundAt(c, b.x));
    ctx.fillStyle = `rgba(20,40,60,${Math.max(0.08, 0.35 - hgt * 0.07)})`;
    ctx.beginPath();
    ctx.ellipse(px + hgt * 3, gy, R * (1 + hgt * 0.15), R * 0.28, 0, 0, TAU);
    ctx.fill();
  }
  // 누르는 중: 물이 닿을 자리 미리 보기 (실제와 같은 계산)
  const inflating = b.p > 0 && !b.jet && b.stun === 0 && s.phase === 'run';
  if (inflating && b.p >= PMIN * 0.7) {
    const res = jetAt(s, b.x, b.y, Math.max(b.p, PMIN)), ok = res.kind === 'new' || res.kind === 'up';
    const mx = px + R * 0.9, my = py + R * 0.2, lx = X(res.x, L), ly = Y(L, res.y);
    const endY = res.kind === 'high' ? Y(L, b.y - radius(b.p) - REACH) : ly;
    ctx.strokeStyle = ok ? 'rgba(200,255,255,.9)' : 'rgba(255,150,150,.85)';
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 4]);
    ctx.lineDashOffset = -s.t * 0.8;
    ctx.beginPath();
    ctx.moveTo(mx, my);
    ctx.quadraticCurveTo(mx + 4, (my + endY) / 2, lx, endY);
    ctx.stroke();
    ctx.setLineDash([]);
    if (ok) {
      ctx.save();
      ctx.translate(lx, ly);
      ctx.globalAlpha = 0.45 + 0.2 * Math.sin(s.t / 5);
      drawCoral(ctx, S * [0.55, 0.82, 1.18][res.tier], res.tier, 3, s.t, 1, 0);
      ctx.globalAlpha = 1;
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,.8)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(X((res.a + res.b) / 2, L), ly, Math.max(4, ((res.b - res.a) * S) / 2), D * 0.18, 0, 0, TAU);
      ctx.stroke();
    }
    const txt = res.kind === 'high' ? '너무 높아요!' : res.kind === 'rock' ? '바위 ✕' : res.kind === 'crab' ? '꽃게 조심!' : res.kind === 'full' ? '이미 활짝' : res.kind === 'up' ? `더 키우기 +${res.gain}` : `${['작은 산호', '산호', '큰 산호!'][res.tier]} +${res.gain}`;
    label(ctx, txt, Math.min(w - 50, Math.max(50, lx)), (res.kind === 'high' ? endY : ly) + 15, 13, ok ? (res.tier === 2 ? '#ffe27a' : '#e8fbff') : '#ffb0b0');
  }
  // 뿜는 물줄기
  const jetE = [...s.events].reverse().find((e) => e.kind === 'jet');
  if (jetE && s.t - jetE.t < 18) {
    const age = s.t - jetE.t, lx = X(jetE.x2!, L), ly = Y(L, jetE.y2!), mx = px + R * 0.85, my = py + R * 0.25;
    ctx.strokeStyle = `rgba(220,250,255,${0.85 - age / 24})`;
    ctx.lineWidth = 3 + (jetE.n ?? 0) * 5 * (1 - age / 18);
    ctx.beginPath();
    ctx.moveTo(mx, my);
    ctx.quadraticCurveTo(mx + 6, (my + ly) / 2, lx, ly);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    for (let q = 0; q < 6; q++) {
      const f = ((age * 0.08 + q / 6) % 1), bx2 = mx + (lx - mx) * f + Math.sin(q * 3 + age) * 3, by2 = my + (ly - my) * f;
      ctx.beginPath();
      ctx.arc(bx2, by2, 2 + (q % 2), 0, TAU);
      ctx.fill();
    }
  }
  // 거품 꼬리 (부풀 땐 와르르)
  for (let q = 0; q < (inflating ? 7 : 3); q++) {
    const ph = ((s.t * (inflating ? 2.2 : 0.8) + q * 29) % 70) / 70;
    ctx.strokeStyle = `rgba(235,252,255,${0.8 * (1 - ph)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(px - R * 0.9 - ph * S * 0.6 + Math.sin(ph * 9 + q) * 3, py - R * 0.3 - ph * S * 0.9, 1.5 + (q % 3), 0, TAU);
    ctx.stroke();
  }
  // 표정
  const since = (kind: string) => {
    let a = 9999;
    for (const e of s.events) if (e.kind === kind) a = Math.min(a, s.t - e.t);
    return a;
  };
  let face: Face = 'meh';
  if (s.phase === 'pause') face = s.cleared ? 'smug' : 'sad';
  else if (b.stun > 0) face = 'dizzy';
  else if (b.jet) face = since('high') < 40 ? 'oops' : 'blow';
  else if (inflating) face = b.p >= PBIG ? (b.maxT > 28 ? 'panic' : 'wow') : 'strain';
  else if (since('high') < 70 || since('tiny') < 50 || since('rock') < 50) face = 'oops';
  else if (s.t - s.lastBig < 80 || since('bed') < 90) face = 'smug';
  const spin = b.stun > 0 ? (STUN - b.stun) * 0.28 * (b.stun / STUN + 0.3) : b.jet ? 0.42 : Math.max(-0.25, Math.min(0.25, -b.vy * 5));
  const squash = since('bump') < 10 || since('surf') < 10 ? 1 - 0.18 * (1 - Math.min(since('bump'), since('surf')) / 10) : 1;
  const wob = inflating ? 1 + Math.sin(s.t * 0.9) * 0.025 : since('puff') < 12 ? 1 + 0.12 * Math.sin(since('puff') * 0.8) * (1 - since('puff') / 12) : 1;
  ctx.save();
  ctx.translate(px + (face === 'panic' ? Math.sin(s.t * 2.1) * 1.2 : 0), py);
  ctx.rotate(spin);
  ctx.scale(wob / Math.sqrt(squash), wob * squash);
  drawPuffer(ctx, R, b.p, face, s.t);
  ctx.restore();
  if (b.stun > 0)
    for (let q = 0; q < 3; q++) {
      const a = s.t / 7 + (q * TAU) / 3;
      label(ctx, '★', px + Math.cos(a) * R * 1.2, py - R * 1.05 + Math.sin(a) * R * 0.3, 12, '#ffe27a');
    }
  if (cave) glow.push([px, py, S * (1.3 + b.p * 1.1), '#fff0b0']);
  // ── 해파리 ──
  const stungRecent = recent('sting', 60), zap = since('sting') < 14;
  for (const j of c.jellies) {
    if (!vis(j.x, 2)) continue;
    const [jx, jy] = jellyPos(j, s.ct);
    ctx.save();
    ctx.translate(X(jx, L), Y(L, jy));
    drawJelly(ctx, S * 0.3, s.t, j.ph, stungRecent && Math.abs(jx - b.x) < 2, inCave);
    ctx.restore();
    if (cave) glow.push([X(jx, L), Y(L, jy), S * 0.9, '#ff9ad8']);
  }
  // 찌릿! (해파리에 쏘인 순간)
  if (zap) {
    ctx.strokeStyle = '#fff36a';
    ctx.lineWidth = 2;
    for (let q = 0; q < 6; q++) {
      const a = (q / 6) * TAU + s.t * 0.3, r1 = R * 1.05, r2 = R * 1.5;
      ctx.beginPath();
      ctx.moveTo(px + Math.cos(a) * r1, py + Math.sin(a) * r1);
      ctx.lineTo(px + Math.cos(a + 0.15) * (r1 + r2) / 2, py + Math.sin(a + 0.15) * (r1 + r2) / 2);
      ctx.lineTo(px + Math.cos(a - 0.05) * r2, py + Math.sin(a - 0.05) * r2);
      ctx.stroke();
    }
  }
  // 앞 소품 (조개·불가사리·바닷말)
  for (const d of c.deco) if (d.z <= 0.5) drawDeco(d);
  // ── 동굴: 낮은 천장 + 깜깜함, 산호·해파리·복어만 빛난다 ──
  if (cave && inCave > 0) {
    const cx0 = Math.max(x0, c.cave - 0.5), ceilY = (xx: number) => Y(L, ceilAt(c, xx));
    const dark = ctx.createRadialGradient(px, py, R * 0.8, px, py, S * (2.4 + b.p * 1.6));
    dark.addColorStop(0, 'rgba(4,10,24,0)');
    dark.addColorStop(1, `rgba(4,10,24,${0.7 * inCave})`);
    ctx.fillStyle = dark;
    ctx.fillRect(-10, sB - 30, w + 20, h);
    // 천장 바위 (어둠 위에 실루엣 + 푸른 테두리 빛 → 천장 높이가 보인다)
    const rg = ctx.createLinearGradient(0, sB - 40, 0, Y(L, 2.4));
    rg.addColorStop(0, '#1a2234');
    rg.addColorStop(1, '#3a465e');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.moveTo(X(cx0, L), sB - 40);
    for (let xx = cx0; xx <= x1 + 0.5; xx += 0.2) ctx.lineTo(X(xx, L), ceilY(xx));
    ctx.lineTo(X(x1 + 0.5, L), sB - 40);
    ctx.closePath();
    ctx.fill();
    for (let xx = Math.ceil(cx0 * 2) / 2; xx <= x1; xx += 0.5) {
      const cy = ceilY(xx), ln = S * (0.12 + hsh(Math.floor(xx * 2)) * 0.3);
      ctx.fillStyle = '#46546e';
      ctx.beginPath();
      ctx.moveTo(X(xx, L) - 6, cy - 3);
      ctx.lineTo(X(xx, L) + 6, cy - 3);
      ctx.lineTo(X(xx, L), cy + ln);
      ctx.fill();
      ctx.fillStyle = 'rgba(160,190,230,.35)';
      ctx.beginPath();
      ctx.moveTo(X(xx, L) - 4, cy - 2);
      ctx.lineTo(X(xx, L) - 1, cy - 2);
      ctx.lineTo(X(xx, L), cy + ln * 0.8);
      ctx.fill();
      if (hsh(Math.floor(xx * 2) + 7) < 0.3) glow.push([X(xx, L) + 9, cy + 6, S * 0.5, '#7ff0ff']), (ctx.fillStyle = '#9ff6ff'), ctx.fillRect(X(xx, L) + 7, cy, 4, 7);
    }
    ctx.strokeStyle = `rgba(120,220,255,${0.55 * inCave})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let xx = cx0; xx <= x1 + 0.5; xx += 0.2) (xx === cx0 ? ctx.moveTo(X(xx, L), ceilY(xx)) : ctx.lineTo(X(xx, L), ceilY(xx)));
    ctx.stroke();
    ctx.globalCompositeOperation = 'lighter';
    for (const [gx, gy, gr2, col] of glow) {
      const gg = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr2 * 1.3);
      gg.addColorStop(0, rgba(col, 0.55 * inCave));
      gg.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = gg;
      ctx.fillRect(gx - gr2 * 1.3, gy - gr2 * 1.3, gr2 * 2.6, gr2 * 2.6);
    }
    // 반짝 플랑크톤
    for (let q = 0; q < 30; q++) {
      const gx = (((hsh(q * 5) * w * 1.5 - camX * S * 0.6 + s.t * 0.2) % w) + w) % w, gy = sB + hsh(q * 9 + 1) * (yF - sB) + Math.sin(s.t / 30 + q) * 6;
      ctx.fillStyle = `rgba(140,255,230,${0.7 * inCave * Math.abs(Math.sin(s.t / 20 + q))})`;
      ctx.beginPath();
      ctx.arc(gx, gy, 1.8, 0, TAU);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  // ── 바닥 앞 단면: 모래층 · 묻힌 조개 ──
  {
    const fy = yF;
    const layers: [number, string][] = [[0, '#e8cf94'], [0.25, '#d4b47a'], [0.45, '#b8935e'], [0.62, '#8a6a48'], [0.78, '#2a3a4a']];
    for (let i = 0; i < layers.length; i++) {
      const y0 = fy + layers[i][0] * T, y1 = fy + (i + 1 < layers.length ? layers[i + 1][0] : 1) * T;
      ctx.fillStyle = mix(layers[i][1], '#141820', inCave * 0.75);
      ctx.beginPath();
      ctx.moveTo(-10, y0);
      for (let px2 = -10; px2 <= w + 10; px2 += 12) ctx.lineTo(px2, y0 + (i ? Math.sin((px2 + camX * S) / 31 + i) * 1.5 : 0));
      ctx.lineTo(w + 10, y1 + 2);
      ctx.lineTo(-10, y1 + 2);
      ctx.closePath();
      ctx.fill();
    }
    for (let i = Math.floor(x0); i < x1 + 1; i++) {
      if (hsh(i * 13) < 0.55) continue;
      const ex = X(i + hsh(i) * 0.8, 0), ey = fy + T * (0.35 + hsh(i * 3) * 0.45);
      if (hsh(i * 29) < 0.5) {
        ctx.fillStyle = mix('#fff0e0', '#3a3a40', inCave * 0.7);
        ctx.beginPath();
        ctx.moveTo(ex - 4, ey);
        ctx.quadraticCurveTo(ex, ey - 6, ex + 4, ey);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = mix('#9a8a7a', '#2a2a30', inCave * 0.7);
        ctx.beginPath();
        ctx.ellipse(ex, ey, 3 + hsh(i) * 3, 2, 0, 0, TAU);
        ctx.fill();
      }
    }
    // 앞 유리 반사 (수조)
    ctx.strokeStyle = 'rgba(255,255,255,.07)';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(w * 0.08, sFr + 10);
    ctx.lineTo(w * 0.0, sFr + 80);
    ctx.moveTo(w * 0.9, sFr + 30);
    ctx.lineTo(w * 0.8, yF - 20);
    ctx.stroke();
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(w * 0.95, sFr + 40);
    ctx.lineTo(w * 0.86, yF - 30);
    ctx.stroke();
  }
  // ── 연출 ──
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const ex = X(e.x, L), ey = Y(L, e.y);
    if (e.kind === 'puff') (fx.burst(ex, ey, '#e8fbff', e.text ? 26 : 10, e.text ? 4 : 2.5, 2.5), e.text && (fx.pop(ex, ey - S * 0.9, e.text, '#ffffff', 22), fx.ring(ex, ey, '#ffffff', S * 1.2, 3), fx.kick(3)));
    if (e.kind === 'max') (fx.pop(ex + S * 0.9, ey - S * 0.75, e.text!, '#ffe27a', 16), fx.burst(ex, ey, '#ffffff', 14, 3, 2));
    if (e.kind === 'jet') fx.burst(px + R * 0.9, py + R * 0.3, '#ffffff', 10, 2.5, 2);
    if (e.kind === 'coral') {
      const lx = X(e.x, L), ly = Y(L, 0);
      fx.burst(lx, ly, '#f0dca8', 14, 2.5, 2.5);
      fx.burst(lx, ly - S * 0.4, CORAL_C[(e.n ?? 0) % 5][0], 10 + (e.n ?? 0) * 10, 2 + (e.n ?? 0), 2.5);
      fx.ring(lx, ly - 4, '#ffffff', S * (0.4 + (e.n ?? 0) * 0.25), 2);
      fx.pop(lx - S * 0.7, ly - S * 0.35, e.text!, (e.n ?? 0) === 2 ? '#ffe27a' : '#ffd0e0', (e.n ?? 0) === 2 ? 18 : 15);
      if ((e.n ?? 0) === 2) (fx.kick(4), fx.blink('#ffd0f0', 0.15));
    }
    if (e.kind === 'up') (fx.burst(X(e.x, L), Y(L, 0) - S * 0.4, '#b8ff9a', 14, 2.5, 2), fx.pop(X(e.x, L) - S * 0.7, Y(L, 0) - S * 0.35, e.text!, '#c8ffb0', 15));
    if (e.kind === 'bed') (fx.ring(ex, ey, '#ffe27a', S * 2.4, 5), fx.burst(ex, ey, '#ffe27a', 30, 4, 3), fx.pop(Math.max(w * 0.3, Math.min(w * 0.7, ex)), Y(L, 3.1), e.text!, '#ffe27a', 17), fx.blink('#fff6c8', 0.18));
    if (e.kind === 'high') (fx.burst(ex, ey, '#cfefff', 10, 1.5, 2), fx.pop(ex, ey + 6, e.text!, '#d8e8f0', 13));
    if (e.kind === 'rock') (fx.burst(ex, ey, '#a0a8b0', 10, 2, 2), fx.pop(ex, ey - S * 0.5, e.text!, '#e0e6ea', 13));
    if (e.kind === 'full') fx.pop(X(e.x, L), Y(L, 1.3), e.text!, '#ffffff', 13);
    if (e.kind === 'crabflip') (fx.burst(X(e.x, L), Y(L, 0.3), '#ff8a6a', 14, 3, 2), fx.pop(X(e.x, L), Y(L, 1.2), e.text!, '#ffd0c0', 14));
    if (e.kind === 'snip') (fx.burst(X(e.x, L), Y(L, 0.3), '#ff9ac0', 12, 2.5, 2), fx.pop(X(e.x, L), Y(L, 1.1), e.text!, '#ff9a9a', 14));
    if (e.kind === 'tiny') (fx.burst(ex - R, ey, '#ffffff', 4, 1, 1.5), fx.pop(ex - S * 0.4, ey - S * 0.5, e.text!, '#ffffff', 13));
    if (e.kind === 'bonk' || e.kind === 'stuck') (fx.kick(7), fx.burst(ex, ey, '#ffffff', 16, 3, 2.5), fx.ring(ex, ey, '#ffd0a0', S * 1.1, 3));
    if (e.kind === 'sting') (fx.kick(8), fx.blink('#ff9ad8', 0.22), fx.burst(ex, ey, '#ffb0e0', 22, 4, 2.5));
    if (e.kind === 'gulp') (fx.kick(8), fx.burst(ex, ey, '#d8f0ff', 22, 4, 2.5));
    if (e.kind === 'bump' || e.kind === 'surf') (fx.ring(ex, ey - R, '#ffffff', S * 0.6, 2), fx.pop(ex, ey - R - 8, e.text!, '#ffffff', 13));
    if (e.kind === 'force') fx.pop(ex, ey - S * 1.2, e.text!, '#ffd0d0', 15);
    if (e.kind === 'stage') fx.pop(w / 2, h * 0.42, e.text!, '#ffffff', 22);
    if (e.kind === 'clear') {
      fx.pop(w / 2, h * 0.34, e.text!, '#ffe27a', 22);
      for (const [cx, col] of [[0.2, '#ff8fb1'], [0.4, '#ffe27a'], [0.6, '#7ee0ff'], [0.8, '#b48cff']] as [number, string][]) fx.burst(w * cx, h * 0.34, col, 22, 5, 3);
      fx.blink('#fff6c8', 0.22);
    }
    if (e.kind === 'fail') (fx.pop(w / 2, h * 0.34, e.text!, '#ffb0b8', 16), fx.kick(8), fx.blink('#0a1830', 0.35));
  }
  fx.memo.t = s.t;
  // 말풍선: 기절 중엔 투덜
  if (b.stun > 0 && b.stun > STUN - 40) {
    const e = [...s.events].reverse().find((q) => q.kind === 'bonk' || q.kind === 'stuck' || q.kind === 'sting' || q.kind === 'gulp');
    if (e) say(ctx, px, py - R - S * 0.55, e.text!, 13);
  }
  ctx.restore();

  // ── HUD (위 띠) ──
  const hg = ctx.createLinearGradient(0, 0, 0, hudT);
  hg.addColorStop(0, 'rgba(6,30,52,.92)');
  hg.addColorStop(1, 'rgba(6,30,52,.75)');
  ctx.fillStyle = hg;
  ctx.fillRect(0, 0, w, hudT);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = th.ink;
  ctx.font = `900 ${Math.max(13, w * 0.038)}px system-ui, sans-serif`;
  ctx.fillText(`🐡 ${s.k + 1}/${STAGES}판 · ${c.name}`, 9, hudT * 0.28);
  ctx.textAlign = 'right';
  ctx.fillStyle = th.hot;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - 9, hudT * 0.28);
  {
    const fs = Math.max(12, w * 0.034), by = hudT * 0.72;
    ctx.font = `900 ${fs}px system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`🪸 ${s.pts}`, 9, by);
    const gt = s.pts >= c.goal[0] ? '통과 ✓' : `목표 ${c.goal[0]}`;
    ctx.font = `900 ${Math.max(12, w * 0.031)}px system-ui, sans-serif`;
    const gw = ctx.measureText('목표 00').width;
    ctx.font = `900 ${fs}px system-ui, sans-serif`;
    const sw = ctx.measureText('⭐ 00').width;
    const bx = 9 + ctx.measureText('🪸 00').width + 10, bw = w - bx - gw - sw - 26, bh = hudT * 0.26, max = c.goal[2] * 1.1;
    const at = (v: number) => bw * Math.max(0, Math.min(1, v / max));
    ctx.fillStyle = 'rgba(255,255,255,.14)';
    ctx.beginPath();
    ctx.roundRect(bx, by - bh / 2, bw, bh, bh / 2);
    ctx.fill();
    const pg = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    pg.addColorStop(0, '#ff8fb1');
    pg.addColorStop(1, '#ffd27a');
    ctx.fillStyle = s.pts >= c.goal[0] ? pg : '#ff8fb1';
    ctx.beginPath();
    ctx.roundRect(bx, by - bh / 2, Math.max(bh, at(s.pts)), bh, bh / 2);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.font = `900 ${Math.max(12, bh * 1.15)}px system-ui, sans-serif`;
    for (let i = 0; i < 3; i++) {
      const gx = bx + at(c.goal[i]);
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(6,30,52,.9)';
      ctx.strokeText('★', gx, by + 1);
      ctx.fillStyle = s.pts >= c.goal[i] ? '#ffe27a' : 'rgba(255,255,255,.75)';
      ctx.fillText('★', gx, by + 1);
    }
    ctx.textAlign = 'left';
    ctx.font = `900 ${Math.max(12, w * 0.031)}px system-ui, sans-serif`;
    ctx.fillStyle = s.pts >= c.goal[0] ? '#b8ffb0' : '#ffffff';
    ctx.fillText(gt, bx + bw + 8, by);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffe27a';
    ctx.font = `900 ${fs}px system-ui, sans-serif`;
    ctx.fillText(`⭐ ${s.stars}`, w - 9, by);
  }
  // 아래 띠: 구간 지도 (화단·굴문·해파리) + 점수
  const bb = h - hudB;
  ctx.fillStyle = 'rgba(6,30,52,.85)';
  ctx.fillRect(0, bb, w, hudB);
  {
    const mx0 = 16, mx1 = w - 70, my = bb + hudB * 0.42, M = (wx: number) => mx0 + (Math.max(0, Math.min(c.len, wx)) / c.len) * (mx1 - mx0);
    ctx.strokeStyle = 'rgba(255,255,255,.25)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(mx0, my);
    ctx.lineTo(mx1, my);
    ctx.stroke();
    c.beds.forEach((B, i) => {
      ctx.fillStyle = s.done[i] ? '#ffe27a' : '#e8c48e';
      ctx.fillRect(M(B.x0), my - 2.5, M(B.x1) - M(B.x0) - 1, 5);
    });
    for (const q of s.corals) ((ctx.fillStyle = '#ff8fb1'), ctx.fillRect(M(q.a), my - 2.5, Math.max(1, M(q.b) - M(q.a)), 5));
    for (const a of c.arches) ((ctx.fillStyle = '#9ab0c0'), ctx.fillRect(M(a.x0), my - 6, 3, 12));
    for (const j of c.jellies) ((ctx.fillStyle = '#ff9ad8'), ctx.beginPath(), ctx.arc(M(j.x), my - 6, 2.5, 0, TAU), ctx.fill());
    emo(ctx, '🐡', M(b.x), my - 1, 15);
    emo(ctx, '🏁', mx1 + 9, my - 2, 13);
    ctx.font = `800 ${Math.max(12, w * 0.032)}px system-ui, sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.fillText(`${puffer.score(s)}점`, w - 8, my);
    ctx.textAlign = 'left';
    ctx.font = `700 ${Math.max(12, w * 0.03)}px system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(200,235,255,.8)';
    const bigs = s.corals.filter((q) => q.tier === 2).length, beds = s.done.reduce((a, v) => a + v, 0);
    ctx.fillText(`이번 판: 큰 산호 ${bigs} · 꽉 찬 화단 ${beds}/${c.beds.length}`, mx0, bb + hudB * 0.8);
  }
  // 새 소식 띠 (위 HUD 아래)
  const hintOn = s.phase === 'run' && ((k === 0 && s.planted === 0 && s.ct > 8) || (k === 0 && s.seen.has('coral') && !s.seen.has('big') && s.ct < 900) || (k === 1 && s.ct < 400 && s.ct > 30));
  let ny = hudT + (hintOn ? 74 : 16);
  for (const e of s.events) {
    if (e.kind !== 'new') continue;
    const age = s.t - e.t, al = Math.min(1, (120 - age) / 25, age / 6);
    if (al <= 0) continue;
    ctx.globalAlpha = al;
    ctx.font = `800 ${Math.max(12, w * 0.034)}px system-ui, sans-serif`;
    const tw = ctx.measureText(e.text!).width + 18;
    ctx.fillStyle = 'rgba(6,30,52,.78)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw / 2, ny - 12, tw, 24, 12);
    ctx.fill();
    ctx.fillStyle = '#fff3c4';
    ctx.textAlign = 'center';
    ctx.fillText(e.text!, w / 2, ny + 1);
    ny += 28;
  }
  ctx.globalAlpha = 1;
  // 첫 안내
  const hintBox = (t1: string, t2?: string) => {
    ctx.textAlign = 'center';
    ctx.font = `900 ${Math.max(13, w * 0.038)}px system-ui, sans-serif`;
    const tw = Math.max(ctx.measureText(t1).width, t2 ? ctx.measureText(t2).width : 0) + 24;
    const hy = hudT + 6;
    ctx.fillStyle = 'rgba(6,30,52,.72)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw / 2, hy, tw, t2 ? 50 : 30, 12);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(t1, w / 2, hy + 15);
    if (t2) (ctx.fillStyle = '#bdf2ff'), (ctx.font = `800 ${Math.max(12, w * 0.032)}px system-ui, sans-serif`), ctx.fillText(t2, w / 2, hy + 35);
  };
  if (s.phase === 'run' && k === 0 && s.planted === 0 && s.ct > 8) hintBox('👆 꾹 누르면 빵빵! 떼면 뿌—', '물이 닿은 모래에 산호가 자라요');
  else if (s.phase === 'run' && k === 0 && s.seen.has('coral') && !s.seen.has('big') && s.ct < 900) hintBox('더 오래 꾹 = 큰 산호!', '너무 높이 뜨면 물이 안 닿아요');
  else if (s.phase === 'run' && k === 1 && s.ct < 400 && s.ct > 30) hintBox('🕳️ 굴문은 쭈그러져서 쏙!', '빵빵하면 끼어요 — 떼고 들어가요');
  if (s.phase === 'pause') {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(6,30,52,.7)';
    ctx.beginPath();
    ctx.roundRect(w * 0.12, h * 0.44, w * 0.76, 32, 12);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 ${Math.max(12, w * 0.035)}px system-ui, sans-serif`;
    ctx.fillText(s.cleared ? (s.k === STAGES - 1 ? '🏆 바닷속 정원 완성! 복어 정원사' : `다음: ${s.k + 2}판 ${NAMES[s.k + 1]}`) : `♥ ${s.hearts} — 같은 구간 다시 심어요`, w / 2, h * 0.44 + 16);
  }
}

// ───────────────────────────── 봇 ─────────────────────────────
const OFF: Input = { tap: false, dir: 0, hold: false };
const moods = new WeakMap<object, { press: number; len: number; k: number }>();
/** 못하는 봇: 아무 때나 누르고 아무만큼 누른다 */
export const pufferRandom: Bot<PufferState> = {
  name: '아무렇게나',
  act(s, rng) {
    if (s.phase !== 'run') return OFF;
    let m = moods.get(s);
    const key = s.k * 10 + s.hearts;
    if (!m || m.k !== key || s.ct > m.press + m.len + 2) moods.set(s, (m = { press: s.ct + 8 + Math.floor(rng() * 80), len: 6 + Math.floor(rng() * 64), k: key }));
    return { tap: false, dir: 0, hold: s.ct >= m.press && s.ct < m.press + m.len };
  },
};

const T1 = [0, 3, 6, 12, 18, 24, 33], T2 = [9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42, 45, 51], TAIL = 45;
const HOLDON = [0, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 34, 38, 44];
function jetValue(r: JetRes) {
  if (r.kind === 'new' || r.kind === 'up') return r.gain + 0.8 * r.cover;
  return r.kind === 'crab' ? -0.6 : -0.3;
}
let hit = false;
const flag: Cb = (kind) => {
  if (kind === 'bonk' || kind === 'sting' || kind === 'gulp' || kind === 'stuck') hit = true;
};
/** 떼고 난 뒤 TAIL틱: 부딪히면 큰 손해, 끝 높이가 높을수록 다음 심기가 늦어진다 */
function tail(b: Body, c: Course, ct: number) {
  hit = false;
  for (let i = 0; i < TAIL && !hit; i++) advance(b, c, false, ct + i + 1, flag);
  return (hit ? -6 : 0) - 0.25 * Math.max(0, b.y - radius(b.p) - groundAt(c, b.x));
}
interface Plan { press: number; release: number; t: number }
const plans = new WeakMap<object, Plan>();
function bestPlan(s: PufferState): Plan {
  const c = s.c, ct0 = s.ct, inflating = s.b.p > 0 && !s.b.jet && s.b.stun === 0;
  let best: Plan = { press: -1, release: -1, t: ct0 }, bv = -1e9;
  // 그냥 가라앉기
  {
    const wb = { ...s.b };
    hit = false;
    let i = 0;
    for (; i < 34 && !hit; i++) advance(wb, c, false, ct0 + i + 1, flag);
    bv = (hit ? -6 : 0) + (hit ? 0 : tail(wb, c, ct0 + i)) - 0.4;
  }
  const t1s = inflating ? [0] : T1, t2s = inflating ? HOLDON : T2;
  const base = { ...s.b };
  let tw = 0, baseHit = false;
  for (const t1 of t1s) {
    hit = false;
    while (tw < t1 && !hit) advance(base, c, false, ct0 + ++tw, flag);
    if (hit) baseHit = true;
    if (baseHit) break;
    const hb = { ...base };
    let held = 0;
    for (const t2 of t2s) {
      hit = false;
      while (held < t2 && !hit && !hb.jet) advance(hb, c, true, ct0 + t1 + ++held, flag);
      if (hit || hb.jet) break;
      const rb = { ...hb };
      hit = false;
      const p = advance(rb, c, false, ct0 + t1 + t2 + 1, flag);
      let v = hit ? -6 : 0;
      if (p > 0) v += jetValue(jetAt(s, rb.x, rb.y, p));
      else if (!inflating || t2 > 0) v -= 0.5;
      v += tail(rb, c, ct0 + t1 + t2 + 1) - 0.012 * (t1 + t2);
      if (v > bv) (bv = v), (best = { press: ct0 + t1, release: ct0 + t1 + t2, t: ct0 });
    }
  }
  return best;
}
/** 잘하는 봇: 6틱마다 '언제 누르고 얼마나 누를지' 수십 가지를 앞날 흉내(부력·바위·해파리·고래)로 겨뤄, 큰 산호를 빈자리에 심는 것을 고른다 */
export const pufferSmart: Bot<PufferState> = {
  name: '산호 정원사',
  act(s) {
    if (s.phase !== 'run' || s.b.stun > 0 || s.b.jet) return OFF;
    let p = plans.get(s);
    if (!p || s.ct - p.t >= 6 || s.ct < 2 || p.t > s.ct) plans.set(s, (p = bestPlan(s)));
    if (p.press < 0) return OFF;
    return { tap: false, dir: 0, hold: s.ct + 1 > p.press && s.ct + 1 <= p.release };
  },
};
