/**
 * 스케이트 거북이 (19라운드 · 오너 아이디어 "스케이트 타는 거북이 — 와우 포인트잖아, 웃기잖아") — 무한 러너 × 꾹 눌렀다 떼기 × 콤보.
 * 기준 9(조작 하나): 꾹 누르면 등껍질 속으로 쏙(빨라지고 낮아짐), 떼면 다리가 튀어나오며 폴짝. 공중에서 꾹 = 등껍질 회전, 떼면 다리가 나와 똑바로 착지.
 * 와우: 느릿느릿 무표정한 거북이가 등껍질에 쏙 들어가는 순간 '슝~' 하고 미끄러져 날아간다. 실수하면 뒤집혀 팽이처럼 데굴데굴(게임 끝 아님).
 * 첫 3초: 1판 첫 꾹 → 쏙·슝~(먼지·속도선), 떼면 놀란 얼굴로 폴짝. 안 누르면 뒤에서 달팽이가 추월한다.
 * 목표·보상: 판(코스)마다 해 지기 전에 결승선 — 묘기·🍓·남은 시간 점수로 별 1~3. 해가 지면 하트 -1, 그 코스만 다시. 8코스 완주가 끝.
 * 하는 일이 바뀐다: 돌멩이(1판, 떼서 넘기) → 점프대(2판, 공중 회전) → 빨랫줄(3판, 숨어서 밑으로) → 오리 가족·웅덩이(4판, 속도 모아 멀리 / 때 맞추기)
 *                  → 난간(5판, 올라타 갈기·밑으로 빠지기) → 꽁꽁 호수(6판, 속도가 안 줄어듦) → 맞바람·달팽이 라이벌(7판) → 밤 축제(8판).
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.15, TAU = Math.PI * 2, COURSES = 8, LANE = 0.32;
/** 걷기(다리로 밀기) · 등껍질 속도 · 얼음 위 등껍질 속도 (칸/틱) */
const VWALK = 0.035, VTUCK = 0.1, VICE = 0.14, ACC = 0.0022, FRIC = 0.0008, PUSH = 0.0006;
const G = 0.0055, HOP = 0.09, SPIN = TAU / 24, BAIL = 70, HALF = 0.2, HU = 0.55, HT = 0.28;
const SPINPTS = [0, 100, 250, 450, 700, 1000];
const NAMES = ['연못가 산책로', '점프대 공원', '빨래 마을', '오리 연못', '난간 광장', '꽁꽁 호수', '바람 언덕', '밤 축제'];
const LEN = [38, 50, 56, 62, 68, 72, 76, 84];
const VREF = [0.026, 0.042, 0.05, 0.055, 0.06, 0.066, 0.064, 0.066];
const SNAILV = 0.064;
type Kind = 'rock' | 'ramp' | 'bar' | 'puddle' | 'duck' | 'rail';
const UNLOCK: Record<Kind, number> = { rock: 0, ramp: 1, bar: 2, duck: 3, puddle: 3, rail: 4 };
const NEWK: Kind[][] = [['rock'], ['ramp'], ['bar'], ['duck', 'puddle'], ['rail'], [], [], []];
const ZONES: ['ice' | 'wind', number, number][][] = [[], [], [], [], [], [['ice', 9, 28], ['ice', 42, 60]], [['wind', 10, 22], ['wind', 34, 46], ['wind', 56, 66]], [['ice', 16, 28], ['wind', 46, 56]]];
const FANS = [['🐰', '🐸', '🐿️', '🐤'], ['🐰', '🦔', '🐻', '🐤'], ['🐱', '🐰', '🐔', '🐶'], ['🦆', '🐸', '🐰', '🐤'], ['🐶', '🐱', '🐰', '🦔'], ['🐧', '🦭', '🐰', '🦊'], ['🐑', '🐐', '🐰', '🐄'], ['🦉', '🦊', '🐰', '🦝']];
const SEE: Record<string, string> = {
  rock: '🪨 돌멩이 — 떼면 폴짝 넘어요',
  ramp: '🛹 점프대 — 공중에서 꾹 누르면 빙글 회전!',
  bar: '🧦 빨랫줄 — 꾹 숨어서 밑으로 쏙!',
  duck: '🦆 오리 가족 — 건너는 중엔 멀리 뛰거나 기다려요',
  puddle: '💧 웅덩이 — 빠르게 와서 휙 넘어요',
  rail: '🔩 난간 — 올라타서 꾹 = 끼이익 갈기! (숨으면 밑으로)',
  ice: '❄️ 꽁꽁 호수 — 미끄러워서 속도가 안 줄어요',
  wind: '🍃 맞바람 — 등껍질에 숨어야 앞으로 가요',
  snail: '🐌 달팽이 라이벌 — 저 녀석보다 먼저 결승!',
  night: '🏮 밤 축제 — 등불 아래를 잘 봐요',
};

export interface Ob { kind: Kind; x: number; w: number; h: number; ph: number }
interface Zone { kind: 'ice' | 'wind'; x0: number; x1: number }
interface Berry { x: number; y: number }
interface Fan { x: number; z: number; e: string; ph: number }
export interface Course {
  k: number; name: string; len: number; obs: Ob[]; ramps: Ob[]; rails: number[]; zones: Zone[]; berries: Berry[];
  time: number; snail: number; night: boolean; t2: number; t3: number; fans: Fan[]; deco: { x: number; kind: number; s: number }[];
}
export interface Body { x: number; y: number; vy: number; v: number; tuck: boolean; air: boolean; rot: number; rotTo: number; bail: number; rail: number; grind: number; combo: number; oi: number; bi: number }
interface Ev { t: number; kind: string; x: number; y: number; text?: string; n?: number }
export interface TurtleState {
  rng: Rng; seed: number; t: number; ct: number; k: number; c: Course; b: Body; got: Uint8Array;
  phase: 'run' | 'pause'; pause: number; cleared: boolean; hearts: number; stars: number; total: number; cpts: number; done: number;
  snailX: number; snailPassed: number; lastTrick: number; lastBail: number; sock: number; tucks: number; hops: number; lastStars: number;
  seen: Set<string>; events: Ev[]; dead: boolean;
}

const ev = (s: TurtleState, kind: string, x: number, y: number, text?: string, n?: number) => s.events.push({ t: s.t, kind, x, y, text, n });
function see(s: TurtleState, key: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  ev(s, 'new', 0, 0, SEE[key]);
}
export const multOf = (combo: number) => 1 + Math.min(4, Math.floor(combo / 3));
/** 오리 가족은 뒤 연못과 앞 풀밭 사이를 오간다 — 길 위에 있는 동안만 막힌다 */
export const duckZ = (o: Ob, ct: number) => LANE + 0.3 * Math.cos(((ct + o.ph) / 240) * TAU);
const duckIn = (o: Ob, ct: number) => Math.abs(duckZ(o, ct) - LANE) < 0.2;
export function groundAt(c: Course, x: number) {
  for (const r of c.ramps) if (x >= r.x && x <= r.x + r.w) return ((x - r.x) / r.w) * r.h;
  return 0;
}
function zoneAt(c: Course, x: number) {
  for (const z of c.zones) if (x >= z.x0 && x <= z.x1) return z.kind;
  return null;
}

/** 코스 하나 (같은 시드·같은 판이면 다시 해도 똑같다) */
export function makeCourse(seed: number, k: number): Course {
  const r = mulberry32((seed ^ 0x5bd1e995) + k * 7919), len = LEN[k];
  const c: Course = { k, name: NAMES[k], len, obs: [], ramps: [], rails: [], zones: [], berries: [], time: 0, snail: k === 6 ? SNAILV : 0, night: k === 7, t2: 0, t3: 0, fans: [], deco: [] };
  for (const [kind, x0, x1] of ZONES[k]) c.zones.push({ kind, x0, x1 });
  const pool = (Object.keys(UNLOCK) as Kind[]).filter((q) => UNLOCK[q] <= k);
  const first = [...NEWK[k]];
  let x = k === 0 ? 8 : 6.5, pot = 0;
  const berry = (bx: number, by: number) => c.berries.push({ x: bx, y: by });
  while (x < len - 5) {
    const onIce = zoneAt(c, x) === 'ice';
    let kind: Kind;
    if (first.length) kind = first.shift()!;
    else {
      const opts = pool.filter((q) => !onIce || q === 'rock' || q === 'ramp');
      const wts = opts.map((q) => (NEWK[k].includes(q) ? 3 : q === 'rock' ? 1.6 : 1));
      let p = r() * wts.reduce((a, b) => a + b, 0), i = 0;
      while (i < opts.length - 1 && (p -= wts[i]) > 0) i++;
      kind = opts[i];
    }
    let w = 0, gap = [5.5, 4.5, 4, 3.8, 3.6, 3.4, 3.4, 3.2][k] + r() * 2.5;
    if (kind === 'rock') {
      w = 0.34 + r() * 0.1;
      c.obs.push({ kind, x, w, h: k === 0 ? 0.18 : 0.22 + r() * 0.07, ph: 0 });
      if (r() < 0.6) berry(x + w / 2, 0.78);
      pot += 10;
    } else if (kind === 'ramp') {
      w = 1.3;
      c.ramps.push({ kind, x, w, h: 0.45, ph: 0 });
      berry(x + w + 1.1, 1.35);
      berry(x + w + 2.2, 1.85);
      gap += 4;
      pot += 270;
    } else if (kind === 'bar') {
      w = 0.5;
      c.obs.push({ kind, x, w, h: 0.34, ph: 0 });
      berry(x + 0.25, 0.14);
      pot += 30;
    } else if (kind === 'puddle') {
      w = 1 + r() * 0.9;
      c.obs.push({ kind, x, w, h: 0, ph: 0 });
      berry(x + w / 2, 0.75);
      pot += 25;
    } else if (kind === 'duck') {
      w = 1.1;
      c.obs.push({ kind, x, w, h: 0.32, ph: Math.floor(r() * 240) });
      pot += 40;
      gap += 0.8;
    } else {
      w = 3 + r() * 1.5;
      c.rails.push(c.obs.length);
      c.obs.push({ kind, x, w, h: 0.5, ph: 0 });
      for (let bx = x + 0.8; bx < x + w - 0.3; bx += 1) berry(bx, 0.68);
      gap += 1.5;
      pot += 90;
    }
    // 빈 길엔 바닥 딸기 한 줄
    if (r() < 0.5 && gap > 3.5) for (let q = 0; q < 3; q++) berry(x + w + 1.2 + q * 0.55, 0.25);
    x += w + gap;
  }
  c.berries.sort((a, b) => a.x - b.x);
  c.obs.sort((a, b) => a.x - b.x);
  c.rails = c.obs.flatMap((o, i) => (o.kind === 'rail' ? [i] : []));
  pot += c.berries.length * 10;
  c.time = k === 6 ? Math.round(len / SNAILV) + 60 : Math.round(len / VREF[k]);
  c.t2 = Math.max(50, Math.round((pot * 0.5) / 50) * 50);
  c.t3 = Math.max(100, Math.round((pot * 1.0) / 50) * 50);
  for (let fx = 2 + r() * 3; fx < len + 3; fx += 3 + r() * 3.5) c.fans.push({ x: fx, z: 0.68 + r() * 0.2, e: FANS[k][Math.floor(r() * 4)], ph: r() * 6 });
  for (let dx = -1.5 + r() * 2; dx < len + 5; dx += 2.2 + r() * 2.8) c.deco.push({ x: dx, kind: r() < (k === 7 ? 0.5 : 0.25) ? 1 : 0, s: 0.8 + r() * 0.45 });
  return c;
}

const newBody = (): Body => ({ x: 0.6, y: 0, vy: 0, v: 0, tuck: false, air: false, rot: 0, rotTo: 0, bail: 0, rail: -1, grind: 0, combo: 0, oi: 0, bi: 0 });
type Cb = (kind: string, x: number, y: number, n?: number, text?: string) => void;

/**
 * 거북이 한 틱 — 게임과 봇(앞날 흉내)이 같은 함수를 쓴다. 얻은 점수를 돌려준다.
 * got: [딸기들 | 장애물들] 처리 여부 (봇은 복사본으로 흉내 낸다)
 */
export function advance(b: Body, c: Course, got: Uint8Array, hold: boolean, ct: number, cb?: Cb): number {
  const nb = c.berries.length;
  let pts = 0;
  const mult = multOf(b.combo);
  const bail = (why: string, j: number) => {
    if (j >= 0) got[j] = 1;
    b.bail = BAIL;
    b.v *= 0.5;
    b.combo = 0;
    b.tuck = false;
    b.rail = -1;
    b.grind = 0;
    b.rot = 0;
    b.rotTo = 0;
    if (b.vy > 0) b.vy = 0;
    cb?.('bail', b.x, b.y, 0, why);
  };
  const endGrind = () => {
    if (b.grind >= 18) (b.combo++, cb?.('grind', b.x, b.y, b.grind));
    b.grind = 0;
  };
  if (b.bail > 0) {
    // 뒤집혀서 데굴데굴 미끄러지는 중 — 조작은 안 먹는다
    b.bail--;
    b.x += b.v;
    b.v *= 0.965;
    const g = groundAt(c, b.x);
    if (b.air || b.y > g + 0.01) {
      b.y += b.vy;
      b.vy -= G;
      if (b.y <= g) (b.y = g), (b.air = false), (b.vy = 0);
    } else b.y = g;
    while (b.oi < c.obs.length && c.obs[b.oi].x + c.obs[b.oi].w < b.x - HALF) (got[nb + b.oi] = got[nb + b.oi] || 1), b.oi++;
    if (b.bail === 0) (b.air = false), (b.y = g), (b.vy = 0), (b.tuck = hold);
    return 0;
  }
  const z = zoneAt(c, b.x);
  if (hold && !b.tuck) {
    b.tuck = true;
    cb?.(b.air ? 'curl' : 'tuck', b.x, b.y, b.v);
  } else if (!hold && b.tuck) {
    b.tuck = false;
    if (b.air) {
      const f = b.rot / TAU, fl = Math.floor(f);
      b.rotTo = (f - fl < 0.12 ? fl : fl + 1) * TAU;
    } else {
      if (b.rail >= 0) endGrind();
      b.air = true;
      b.vy = HOP;
      b.rail = -1;
      cb?.('hop', b.x, b.y);
    }
  }
  if (b.air) {
    if (z === 'wind' && !b.tuck) b.v = Math.max(0.012, b.v - 0.0007);
  } else if (b.rail >= 0) b.v = b.tuck ? Math.min(0.12, b.v + 0.0006) : Math.max(VWALK, b.v - 0.002);
  else if (b.tuck) {
    const vm = z === 'ice' ? VICE : VTUCK;
    b.v = b.v < vm ? Math.min(vm, b.v + ACC) : Math.max(vm, b.v - FRIC);
  } else if (z === 'wind') b.v = Math.max(0.01, b.v - 0.0016);
  else if (z !== 'ice') b.v = b.v > VWALK ? Math.max(VWALK, b.v - FRIC) : Math.min(VWALK, b.v + PUSH);
  const py = b.y;
  b.x += b.v;
  if (b.rail >= 0) {
    const r = c.obs[b.rail];
    if (b.x > r.x + r.w) (endGrind(), (b.rail = -1), (b.air = true), (b.vy = 0.03));
    else {
      b.y = r.h;
      if (b.tuck) (b.grind++, b.grind % 4 === 0 && (pts += 5 * mult));
      else b.grind = 0;
    }
  }
  if (b.air) {
    b.y += b.vy;
    b.vy -= G;
    if (b.tuck) b.rot += SPIN;
    else if (b.rot < b.rotTo) b.rot = Math.min(b.rotTo, b.rot + SPIN * 2);
    const g = groundAt(c, b.x);
    let landed = false;
    if (b.vy < 0)
      for (const i of c.rails) {
        const r = c.obs[i];
        if (!got[nb + i] && py >= r.h - 0.03 && b.y <= r.h && b.x >= r.x && b.x <= r.x + r.w) {
          (b.rail = i), (b.y = r.h), (landed = true);
          break;
        }
      }
    if (!landed && b.y <= g) (b.y = g), (landed = true);
    if (landed) {
      b.air = false;
      b.vy = 0;
      const n = Math.round(b.rot / TAU), onRail = b.rail >= 0 && b.tuck;
      const ok = onRail || (b.tuck ? Math.abs(b.rot - n * TAU) < 0.75 : Math.abs(b.rot - b.rotTo) < 0.45);
      const spins = onRail ? Math.floor(b.rot / TAU + 0.12) : n;
      b.rot = 0;
      b.rotTo = 0;
      if (!ok) return bail('flip', -1), pts;
      if (spins > 0) (pts += SPINPTS[Math.min(5, spins)] * mult), (b.combo += spins), cb?.('spin', b.x, b.y, spins);
      else cb?.('land', b.x, b.y);
      if (b.rail >= 0) cb?.('rail', b.x, b.y);
    }
  } else if (b.rail < 0) {
    const g = groundAt(c, b.x);
    if (py > 0.05 && g < py - 0.04) (b.air = true), (b.y = py), (b.vy = 0.03 + b.v * 0.9), cb?.('launch', b.x, b.y);
    else b.y = g;
  }
  // 장애물
  const top = b.y + (b.tuck ? HT : HU);
  for (let i = b.oi; i < c.obs.length; i++) {
    const o = c.obs[i], j = nb + i;
    if (o.x > b.x + HALF) break;
    if (o.x + o.w < b.x - HALF) {
      if (i === b.oi) b.oi++;
      if (!got[j]) {
        got[j] = 1;
        if (o.kind === 'rock') (pts += 10), cb?.('pass', o.x + o.w / 2, o.h, 10, '폴짝!');
        else if (o.kind === 'bar') (pts += 20 * mult), b.combo++, cb?.('pass', o.x, 0.3, 20 * mult, '쏙!');
        else if (o.kind === 'puddle') (pts += 15), cb?.('pass', o.x + o.w / 2, 0.5, 15, '휙!');
        else if (o.kind === 'duck' && duckIn(o, ct)) (pts += 30 * mult), b.combo++, cb?.('pass', o.x + o.w / 2, 0.6, 30 * mult, '꽥?!');
      }
      continue;
    }
    if (got[j] || b.rail === i) continue;
    if (o.kind === 'rock' && b.y < o.h) bail('rock', j);
    else if (o.kind === 'duck' && b.y < o.h && duckIn(o, ct)) bail('duck', j);
    else if (o.kind === 'bar' && top > o.h) bail('bar', j);
    else if (o.kind === 'rail' && b.y < o.h - 0.03 && top > o.h - 0.1) bail('rail', j);
    else if (o.kind === 'puddle' && !b.air) (got[j] = 2), (b.v *= 0.45), cb?.('splash', o.x + o.w / 2, 0);
    if (b.bail) return pts;
  }
  // 딸기
  const cy = b.y + (b.tuck ? 0.15 : 0.3);
  for (let i = b.bi; i < nb; i++) {
    const q = c.berries[i];
    if (q.x > b.x + 0.32) break;
    if (q.x < b.x - 0.32) {
      if (i === b.bi) b.bi++;
      continue;
    }
    if (!got[i] && Math.abs(q.y - cy) < 0.36) (got[i] = 1), (pts += 10 * mult), cb?.('berry', q.x, q.y, 10 * mult);
  }
  return pts;
}

function startCourse(s: TurtleState) {
  s.c = makeCourse(s.seed, s.k);
  s.b = newBody();
  s.got = new Uint8Array(s.c.berries.length + s.c.obs.length);
  s.ct = 0;
  s.cpts = 0;
  s.phase = 'run';
  s.snailX = s.c.snail ? -0.4 : 0.15;
  s.snailPassed = 0;
  ev(s, 'course', 0, 0, `${s.k + 1}판 · ${s.c.name}`);
  if (s.c.night) see(s, 'night');
  if (s.c.snail) see(s, 'snail');
}
const timeLeft = (s: TurtleState) => (s.c.snail ? (s.c.len - s.snailX) / s.c.snail : s.c.time - s.ct);
const BAILTXT: Record<string, string> = { rock: '쿵! 데굴데굴~', duck: '꽥꽥! 데굴데굴~', bar: '콩! 양말 모자…', rail: '깡! 데굴데굴~', flip: '꽈당! 데굴데굴~' };

export const turtle: GameDef<TurtleState> = {
  id: 'turtle',
  name: '스케이트 거북이 🐢',
  genes: ['endless', 'hold', 'combo'],
  origin: '오너 아이디어 — "스케이트 타는 거북이, 와우 포인트잖아 웃기잖아" (2026-11-08)',
  twist: '느릿느릿 거북이가 등껍질에 쏙 숨는 순간 스케이트처럼 슝~ 미끄러진다 — 숨으면 빨라지고 낮아지지만 못 뛰고, 떼야 폴짝 뛰며, 공중에서 숨으면 등껍질이 팽이처럼 돈다',
  rules: ['꾹 누르면 등껍질에 쏙 — 빨라지고 낮은 건 밑으로 지나가요. 떼면 폴짝!', '공중에서 꾹 누르면 빙글빙글 회전! 땅에 닿기 전에 떼야 똑바로 착지해요.', '해 지기 전에 결승선까지 — 묘기·🍓 점수로 별을 모아요.'],
  controls: 'hold',
  hint: '꾹 누르면 등껍질에 쏙(슝~), 떼면 폴짝 / 스페이스',
  aspect: A,
  art: {
    concept: '노을 지는 공원 스케이트 디오라마',
    mood: '나무 탁자 위에 놓인 길쭉한 공원 디오라마. 흙층이 보이는 땅 위로 돌길이 나 있고, 해가 지며 하늘이 하늘색→금빛→보랏빛으로 물든다. 토끼·개구리 구경꾼이 묘기마다 환호하고, 무표정한 거북이가 롤러스케이트로 슝 지나간다.',
    palette: { bg: '#2b1d2e', ink: '#fff8ec', muted: '#a08a7a', accent: '#7ed957', hot: '#ff6b5a', soft: '#ffe0a8' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = { rng: mulberry32(seed), seed, t: 0, ct: 0, k: 0, phase: 'run', pause: 0, cleared: false, hearts: 3, stars: 0, total: 0, cpts: 0, done: 0, snailX: 0, snailPassed: 0, lastTrick: -999, lastBail: -999, sock: -999, tucks: 0, hops: 0, lastStars: 0, seen: new Set<string>(), events: [], dead: false } as unknown as TurtleState;
    startCourse(s);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    if (s.events.length) s.events = s.events.filter((e) => s.t - e.t < 90);
    const hold = !!inp.hold;
    if (s.phase === 'pause') {
      if (--s.pause <= 0) {
        if (s.cleared) s.k++;
        if (s.k >= COURSES) s.dead = true;
        else startCourse(s);
      }
      return;
    }
    s.ct++;
    const b = s.b, c = s.c, m0 = multOf(b.combo);
    const pts = advance(b, c, s.got, hold, s.ct, (kind, x, y, n, text) => {
      if (kind === 'tuck') (s.tucks++, ev(s, kind, x, y, (n ?? 0) < 0.05 ? '슝~' : undefined));
      else if (kind === 'hop') (s.hops++, ev(s, kind, x, y));
      else if (kind === 'spin') (ev(s, kind, x, y, n === 1 ? '빙글 1회전!' : n === 2 ? '2회전!! 빙글빙글' : `${n}회전!!! 팽이 거북`, n), (s.lastTrick = s.t));
      else if (kind === 'bail') (ev(s, kind, x, y, BAILTXT[text ?? 'flip']), (s.lastBail = s.t), text === 'bar' && (s.sock = s.t));
      else if (kind === 'berry') ev(s, kind, x, y, `+${n}`);
      else if (kind === 'pass') ev(s, kind, x, y, `${text} +${n}`);
      else if (kind === 'grind') (ev(s, kind, x, y, '끼이익~ 갈기!'), (s.lastTrick = s.t));
      else if (kind === 'splash') ev(s, kind, x, y, '첨벙!');
      else if (kind === 'launch') ev(s, kind, x, y, '휘익~');
      else ev(s, kind, x, y);
    });
    s.cpts += pts;
    s.total += pts;
    if (multOf(b.combo) > m0) ev(s, 'combo', b.x, b.y, `${b.combo}연속 콤보! ×${multOf(b.combo)}`);
    // 보이기 시작한 새것
    for (let i = b.oi; i < c.obs.length && c.obs[i].x < b.x + 6.5; i++) see(s, c.obs[i].kind);
    for (const r of c.ramps) if (r.x > b.x && r.x < b.x + 6.5) see(s, 'ramp');
    for (const z of c.zones) if (z.x0 < b.x + 6.5 && z.x1 > b.x) see(s, z.kind);
    // 달팽이: 평소엔 뒤 산책로의 구경꾼(느리면 추월당한다), 7판엔 로켓 스케이트 라이벌
    if (c.snail) {
      if (s.ct > 60) s.snailX += c.snail;
    } else s.snailX += 0.045;
    if (!s.snailPassed && s.ct > 20 && s.snailX > b.x + 0.3 && b.x < c.len) (s.snailPassed = 1), ev(s, 'snail', s.snailX, 0.4, c.snail ? '🐌 라이벌: 먼저 간다~' : '🐌 달팽이한테 추월당함…');
    if (s.snailPassed === 1 && b.x > s.snailX + 0.6) (s.snailPassed = 2), ev(s, 'snail', s.snailX, 0.4, '🐌 …!?');
    if (b.x >= c.len) {
      const bonus = Math.max(0, Math.floor(timeLeft(s) / 6));
      s.cpts += bonus;
      s.total += bonus;
      const st = 1 + (s.cpts >= c.t2 ? 1 : 0) + (s.cpts >= c.t3 ? 1 : 0);
      s.stars += st;
      s.lastStars = st;
      s.done++;
      s.cleared = true;
      s.phase = 'pause';
      s.pause = 110;
      if (s.k === COURSES - 1) s.pause = 160;
      ev(s, 'clear', b.x, 0, `${s.k + 1}판 완주! ${'★'.repeat(st)}${'☆'.repeat(3 - st)}`, st);
      if (bonus) ev(s, 'bonus', b.x, 0, `남은 시간 +${bonus}`);
    } else if (timeLeft(s) <= 0) {
      s.hearts--;
      s.cleared = false;
      ev(s, 'fail', b.x, 0, c.snail ? '🐌 달팽이가 먼저… ♥ -1 · 다시!' : '해가 졌어요… ♥ -1 · 다시!');
      if (s.hearts <= 0) s.dead = true;
      else (s.phase = 'pause'), (s.pause = 100);
    }
  },
  over: (s) => s.dead,
  score: (s) => s.total + s.stars * 100 + s.done * 200,
  draw(ctx, s, w, h, th: Theme) {
    drawWorld(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
const hex = (c: string) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
function mix(a: string, b: string, f: number) {
  const p = hex(a), q = hex(b);
  return `rgb(${p.map((v, i) => Math.round(v + (q[i] - v) * Math.max(0, Math.min(1, f)))).join(',')})`;
}
function grad(stops: string[], f: number) {
  const n = stops.length - 1, x = Math.max(0, Math.min(0.9999, f)) * n, i = Math.floor(x);
  return mix(stops[i], stops[i + 1], x - i);
}
const SKY_T = ['#6ec6ff', '#86b9f2', '#ea8f6d', '#3b2e6b'], SKY_B = ['#e2f5ff', '#ffe6ad', '#ffb46c', '#e57a5c'];
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
function bubble(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, size: number) {
  ctx.font = `800 ${size}px system-ui, sans-serif`;
  const tw = ctx.measureText(text).width + size;
  ctx.fillStyle = 'rgba(255,255,255,.92)';
  ctx.beginPath();
  ctx.roundRect(x - tw / 2, y - size * 0.85, tw, size * 1.5, size * 0.6);
  ctx.moveTo(x - 3, y + size * 0.6);
  ctx.lineTo(x, y + size * 1.05);
  ctx.lineTo(x + 4, y + size * 0.6);
  ctx.fill();
  ctx.fillStyle = '#3a2a2a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y - size * 0.1);
}

type Face = 'meh' | 'wow' | 'smug' | 'dizzy';
interface Look { tuck: boolean; rot: number; face: Face; walk: number; ice: boolean; sock: boolean; shades: boolean; bail: number; t: number }

/** 거북이 (원점 = 발밑 가운데, 오른쪽을 본다, u = 거북이 한 칸의 px) */
function drawTurtle(ctx: CanvasRenderingContext2D, u: number, o: Look) {
  ctx.save();
  ctx.scale(u, u);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (o.bail > 0) {
    // 뒤집혀서 팽이처럼 데굴데굴 — 좌우로 납작해졌다 펴졌다 하며 돈다
    const sp = Math.cos(o.t * 0.45);
    ctx.translate(0, -0.2);
    ctx.scale(Math.max(0.3, Math.abs(sp)) * (sp < 0 ? -1 : 1), 1);
    ctx.rotate(Math.PI + Math.sin(o.t * 0.3) * 0.25);
    ctx.translate(0, 0.22);
  } else {
    ctx.translate(0, -0.24);
    ctx.rotate(o.rot);
    ctx.translate(0, 0.24);
  }
  const base = o.tuck ? -0.08 : -0.15;
  // 스케이트 (등껍질 속에 숨어도 스케이트는 밖에)
  const legs = !o.tuck || o.bail > 0;
  for (const [i, lx] of [[0, -0.17], [1, 0.15]] as [number, number][]) {
    const lift = legs && o.bail === 0 ? Math.max(0, Math.sin(o.walk + i * Math.PI)) * 0.035 : o.bail > 0 ? Math.sin(o.t * 0.9 + i * 2) * 0.05 : 0;
    const by = -lift;
    if (legs) {
      ctx.fillStyle = '#86bf4e';
      ctx.beginPath();
      ctx.ellipse(lx, base + 0.01 + by * 0.5, 0.055, 0.06, 0, 0, TAU);
      ctx.fill();
    }
    // 부츠
    ctx.fillStyle = o.ice ? '#f4f4f8' : '#e8453c';
    ctx.beginPath();
    ctx.roundRect(lx - 0.085, -0.12 + by, 0.18, 0.075, 0.03);
    ctx.fill();
    ctx.fillStyle = o.ice ? '#9fb6c8' : '#ffffff';
    ctx.fillRect(lx - 0.08, -0.12 + by, 0.17, 0.018);
    if (o.ice) {
      ctx.strokeStyle = '#cfd8e3';
      ctx.lineWidth = 0.022;
      ctx.beginPath();
      ctx.moveTo(lx - 0.09, -0.02 + by);
      ctx.lineTo(lx + 0.1, -0.02 + by);
      ctx.quadraticCurveTo(lx + 0.14, -0.02 + by, lx + 0.13, -0.05 + by);
      ctx.stroke();
      ctx.lineWidth = 0.014;
      ctx.beginPath();
      ctx.moveTo(lx - 0.05, -0.045 + by);
      ctx.lineTo(lx - 0.05, -0.02 + by);
      ctx.moveTo(lx + 0.06, -0.045 + by);
      ctx.lineTo(lx + 0.06, -0.02 + by);
      ctx.stroke();
    } else
      for (const wx of [-0.05, 0.06]) {
        ctx.fillStyle = '#ffd23f';
        ctx.beginPath();
        ctx.arc(lx + wx, -0.032 + by, 0.034, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#9a6b00';
        ctx.beginPath();
        ctx.arc(lx + wx, -0.032 + by, 0.012, 0, TAU);
        ctx.fill();
      }
  }
  // 꼬리
  if (legs) {
    ctx.fillStyle = '#86bf4e';
    ctx.beginPath();
    ctx.moveTo(-0.3, base - 0.06);
    ctx.lineTo(-0.42, base - 0.02);
    ctx.lineTo(-0.3, base - 0.0);
    ctx.fill();
  }
  // 목·머리 (등껍질 뒤에 먼저)
  const head = legs ? { x: 0.43, y: base - 0.17 } : null;
  if (head) {
    ctx.strokeStyle = '#86bf4e';
    ctx.lineWidth = 0.13;
    ctx.beginPath();
    ctx.moveTo(0.22, base - 0.08);
    ctx.lineTo(head.x - 0.06, head.y + 0.02);
    ctx.stroke();
  }
  // 등껍질: 배딱지 띠 + 둥근 지붕 + 육각 무늬
  ctx.fillStyle = '#e2c07a';
  ctx.beginPath();
  ctx.roundRect(-0.34, base - 0.05, 0.68, 0.075, 0.035);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,80,30,.45)';
  ctx.lineWidth = 0.012;
  for (let k = -0.22; k < 0.3; k += 0.11) (ctx.beginPath(), ctx.moveTo(k, base - 0.045), ctx.lineTo(k, base + 0.02), ctx.stroke());
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, base - 0.04, 0.33, 0.31, 0, Math.PI, TAU);
  ctx.closePath();
  const sg = ctx.createLinearGradient(-0.2, base - 0.35, 0.25, base);
  sg.addColorStop(0, '#8ad25a');
  sg.addColorStop(0.55, '#4f9e36');
  sg.addColorStop(1, '#2f6e27');
  ctx.fillStyle = sg;
  ctx.fill();
  ctx.clip();
  ctx.strokeStyle = '#2b5e22';
  ctx.lineWidth = 0.022;
  const hexp = (cx: number, cy: number, r: number, fill: string) => {
    ctx.beginPath();
    for (let k = 0; k < 6; k++) ctx.lineTo(cx + Math.cos((k / 6) * TAU) * r, cy + Math.sin((k / 6) * TAU) * r * 0.8);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.stroke();
  };
  hexp(0, base - 0.24, 0.11, '#6dbb45');
  hexp(-0.2, base - 0.15, 0.1, '#5aa83c');
  hexp(0.2, base - 0.15, 0.1, '#5aa83c');
  hexp(-0.1, base - 0.04, 0.08, '#4c9534');
  hexp(0.1, base - 0.04, 0.08, '#4c9534');
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,.45)';
  ctx.lineWidth = 0.03;
  ctx.beginPath();
  ctx.ellipse(0, base - 0.04, 0.27, 0.25, 0, Math.PI * 1.15, Math.PI * 1.45);
  ctx.stroke();
  if (!head) {
    // 등껍질 속에서 빼꼼 내다보는 눈
    ctx.fillStyle = '#1d2a12';
    ctx.beginPath();
    ctx.ellipse(0.31, base - 0.06, 0.05, 0.045, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    for (const ex of [0.295, 0.335]) (ctx.beginPath(), ctx.arc(ex, base - 0.065, 0.016, 0, TAU), ctx.fill());
  } else {
    const { x: hx, y: hy } = head;
    const hg = ctx.createRadialGradient(hx + 0.03, hy - 0.05, 0.02, hx, hy, 0.15);
    hg.addColorStop(0, '#b6e27a');
    hg.addColorStop(1, '#79b544');
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.ellipse(hx, hy, 0.135, 0.125, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,120,140,.45)';
    ctx.beginPath();
    ctx.ellipse(hx + 0.01, hy + 0.05, 0.035, 0.02, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#2b3a1a';
    ctx.beginPath();
    ctx.arc(hx + 0.115, hy - 0.005, 0.009, 0, TAU);
    ctx.fill();
    const ex = hx + 0.045, ey = hy - 0.035;
    ctx.strokeStyle = '#2a1e14';
    ctx.lineWidth = 0.018;
    if (o.face === 'dizzy') {
      ctx.beginPath();
      for (let a = 0; a < 9; a += 0.4) ctx.lineTo(ex + Math.cos(a + o.t * 0.3) * a * 0.006, ey + Math.sin(a + o.t * 0.3) * a * 0.006);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(hx + 0.08, hy + 0.06, 0.03, 0.02, 0, 0, TAU);
      ctx.stroke();
    } else if (o.face === 'smug') {
      ctx.beginPath();
      ctx.arc(ex, ey + 0.015, 0.035, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(hx + 0.04, hy + 0.055);
      ctx.quadraticCurveTo(hx + 0.08, hy + 0.075, hx + 0.12, hy + 0.035);
      ctx.stroke();
    } else {
      const wow = o.face === 'wow', rx = wow ? 0.06 : 0.05, ry = wow ? 0.068 : 0.055;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(ex, ey, rx, ry, 0, 0, TAU);
      ctx.fill();
      ctx.lineWidth = 0.012;
      ctx.stroke();
      ctx.fillStyle = '#1a1410';
      ctx.beginPath();
      ctx.arc(ex + 0.018, ey + (wow ? 0 : 0.012), wow ? 0.02 : 0.026, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex + 0.026, ey - 0.006, 0.008, 0, TAU);
      ctx.fill();
      if (!wow) {
        // 무표정: 눈꺼풀이 반쯤 덮였다
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(ex, ey, rx + 0.004, ry + 0.004, 0, 0, TAU);
        ctx.clip();
        ctx.fillStyle = '#86bf4e';
        ctx.fillRect(ex - 0.07, ey - 0.08, 0.14, 0.075);
        ctx.restore();
        ctx.strokeStyle = '#2a1e14';
        ctx.lineWidth = 0.016;
        ctx.beginPath();
        ctx.moveTo(ex - rx, ey - 0.005);
        ctx.lineTo(ex + rx, ey - 0.005);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(hx + 0.05, hy + 0.06);
        ctx.lineTo(hx + 0.115, hy + 0.055);
        ctx.stroke();
      } else {
        ctx.strokeStyle = '#2a1e14';
        ctx.lineWidth = 0.016;
        ctx.beginPath();
        ctx.arc(ex, ey - 0.06, 0.05, Math.PI * 1.2, Math.PI * 1.8);
        ctx.stroke();
        ctx.fillStyle = '#5a1e1e';
        ctx.beginPath();
        ctx.ellipse(hx + 0.085, hy + 0.065, 0.022, 0.028, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#8fd3ff';
        ctx.beginPath();
        ctx.moveTo(hx - 0.1, hy - 0.1);
        ctx.quadraticCurveTo(hx - 0.13, hy - 0.04, hx - 0.1, hy - 0.03);
        ctx.quadraticCurveTo(hx - 0.07, hy - 0.04, hx - 0.1, hy - 0.1);
        ctx.fill();
      }
    }
    if (o.shades && o.face !== 'dizzy') {
      ctx.fillStyle = '#111111';
      ctx.beginPath();
      ctx.roundRect(ex - 0.065, ey - 0.04, 0.13, 0.06, 0.02);
      ctx.fill();
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 0.015;
      ctx.beginPath();
      ctx.moveTo(ex - 0.06, ey - 0.03);
      ctx.lineTo(hx - 0.1, hy - 0.04);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.7)';
      ctx.beginPath();
      ctx.moveTo(ex - 0.03, ey - 0.025);
      ctx.lineTo(ex + 0.0, ey - 0.025);
      ctx.stroke();
    }
    if (o.sock) {
      // 빨랫줄에 박고 얻은 양말 모자
      ctx.fillStyle = '#ff8fb1';
      ctx.beginPath();
      ctx.moveTo(hx - 0.12, hy - 0.06);
      ctx.quadraticCurveTo(hx - 0.02, hy - 0.2, hx + 0.1, hy - 0.1);
      ctx.lineTo(hx + 0.08, hy - 0.07);
      ctx.quadraticCurveTo(hx - 0.02, hy - 0.13, hx - 0.1, hy - 0.02);
      ctx.lineTo(hx - 0.2, hy + 0.02);
      ctx.quadraticCurveTo(hx - 0.24, hy - 0.04, hx - 0.12, hy - 0.06);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.02;
      ctx.beginPath();
      ctx.moveTo(hx - 0.06, hy - 0.12);
      ctx.lineTo(hx - 0.03, hy - 0.08);
      ctx.moveTo(hx + 0.01, hy - 0.14);
      ctx.lineTo(hx + 0.03, hy - 0.1);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, S: number, k: number, sc: number, dusk: number) {
  const s = S * sc;
  ctx.fillStyle = 'rgba(40,30,20,.18)';
  ctx.beginPath();
  ctx.ellipse(x - s * 0.28, y + s * 0.03, s * 0.5, s * 0.1, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#6e4529';
  ctx.fillRect(x - s * 0.06, y - s * 0.6, s * 0.12, s * 0.6);
  if (k === 5) {
    // 눈 덮인 전나무
    for (let i = 0; i < 3; i++) {
      const ty = y - s * (0.45 + i * 0.32), tw = s * (0.42 - i * 0.1);
      ctx.fillStyle = mix('#3f7d5a', '#2c3f5a', dusk);
      ctx.beginPath();
      ctx.moveTo(x - tw, ty);
      ctx.lineTo(x, ty - s * 0.5);
      ctx.lineTo(x + tw, ty);
      ctx.fill();
      ctx.fillStyle = '#f4fbff';
      ctx.beginPath();
      ctx.moveTo(x - tw * 0.5, ty - s * 0.25);
      ctx.lineTo(x, ty - s * 0.5);
      ctx.lineTo(x + tw * 0.5, ty - s * 0.25);
      ctx.quadraticCurveTo(x, ty - s * 0.18, x - tw * 0.5, ty - s * 0.25);
      ctx.fill();
    }
    return;
  }
  const leaf = k === 6 ? ['#c8d86a', '#7c9a3a'] : k === 7 ? ['#4a7a5a', '#203a35'] : ['#9ad566', '#3f8a3a'];
  for (const [dx, dy, r] of [[-0.24, -0.72, 0.3], [0.26, -0.75, 0.32], [0, -0.98, 0.38]] as [number, number, number][]) {
    const g = ctx.createRadialGradient(x + s * (dx + 0.12), y + s * (dy - 0.12), s * 0.05, x + s * dx, y + s * dy, s * r);
    g.addColorStop(0, mix(leaf[0], '#e09a6a', dusk * 0.5));
    g.addColorStop(1, mix(leaf[1], '#3b2a4a', dusk * 0.6));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x + s * dx, y + s * dy, s * r, 0, TAU);
    ctx.fill();
  }
}

function drawWorld(ctx: CanvasRenderingContext2D, s: TurtleState, w: number, h: number, th: Theme) {
  const fx = juice(s), c = s.c, b = s.b, k = c.k;
  const S = w / 8, U = S * 1.25;
  const camX = b.x - 1.7;
  const yF = h * 0.75, D = h * 0.17, T = h * 0.09, skew = D * 0.55;
  const X = (wx: number, z: number) => (wx - camX) * S + z * skew;
  const Y = (z: number, hg: number) => yF - z * D - hg * S;
  const frac = c.night ? 1 : c.snail ? Math.max(0, s.snailX) / c.len : Math.min(1, s.ct / c.time);
  const dusk = c.night ? 1 : Math.max(0, (frac - 0.45) / 0.55);
  const top = w * 0.12, yBack = yF - D;
  const x0 = Math.max(-2, camX - 3), x1 = Math.min(c.len + 4, camX + 11);
  const hit = s.events.filter((e) => s.t - e.t < 50);
  ctx.save();
  fx.begin(ctx);
  // 하늘
  const sky = ctx.createLinearGradient(0, 0, 0, yBack);
  sky.addColorStop(0, c.night ? '#0d1030' : grad(SKY_T, frac));
  sky.addColorStop(1, c.night ? '#3a2758' : grad(SKY_B, frac));
  ctx.fillStyle = sky;
  ctx.fillRect(-10, -10, w + 20, yBack + 20);
  if (c.night)
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(255,255,230,${0.3 + 0.5 * Math.abs(Math.sin(s.t / 30 + i))})`;
      ctx.fillRect(((i * 7919) % 997) / 997 * w, top + ((i * 104729) % 991) / 991 * (yBack - top) * 0.7, 1.6, 1.6);
    }
  // 해 (판 시계): 오른쪽 하늘에서 언덕 너머로 진다
  const sunX = w * 0.8, sunY = top + (0.12 + frac * 0.9) * (yBack - top);
  if (!c.night) {
    const sunC = mix('#fff4b8', '#ff7a3d', frac);
    const glow = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, w * 0.45);
    glow.addColorStop(0, mix('#fff6c8', '#ffb070', frac).replace('rgb', 'rgba').replace(')', ',.55)'));
    glow.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, yBack);
    ctx.fillStyle = sunC;
    ctx.shadowColor = sunC;
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.arc(sunX, sunY, w * 0.055, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
  } else {
    ctx.fillStyle = '#fff3c4';
    ctx.shadowColor = '#fff3c4';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(w * 0.82, top + 34, w * 0.045, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0d1030';
    ctx.beginPath();
    ctx.arc(w * 0.82 + 8, top + 30, w * 0.04, 0, TAU);
    ctx.fill();
  }
  // 구름
  for (let i = 0; i < 4; i++) {
    const cx = ((((i * 211 + s.t * 0.08 - camX * S * 0.08) % (w + 160)) + w + 160) % (w + 160)) - 80, cy = top + 22 + i * 19;
    ctx.fillStyle = c.night ? 'rgba(120,120,170,.25)' : mix('#ffffff', '#ffc2a8', frac).replace('rgb', 'rgba').replace(')', ',.8)');
    for (const [dx, dy, r] of [[0, 0, 14], [14, -5, 11], [-14, -2, 10], [26, 2, 8]]) (ctx.beginPath(), ctx.arc(cx + dx, cy + dy, r, 0, TAU), ctx.fill());
  }
  // 먼 언덕 + 작은 마을 (시차)
  for (const [par, base, amp, col0, col1] of [[0.15, yBack - 34, 16, '#a8d494', '#7c5a8e'], [0.35, yBack - 12, 12, '#7fc06a', '#5b3f6e']] as [number, number, number, string, string][]) {
    ctx.fillStyle = c.night ? mix(col1, '#141432', 0.6) : mix(col0, col1, dusk);
    ctx.beginPath();
    ctx.moveTo(0, yBack + 4);
    for (let px = 0; px <= w + 8; px += 8) {
      const q = (px + camX * S * par) / 60;
      ctx.lineTo(px, base - amp * Math.sin(q) - amp * 0.5 * Math.sin(q * 2.3 + 1));
    }
    ctx.lineTo(w, yBack + 4);
    ctx.fill();
    if (par < 0.2)
      for (let i = Math.floor((camX * S * par) / 90) - 1; i < (camX * S * par + w) / 90 + 1; i++) {
        const hx = i * 90 + 30 - camX * S * par, q = (hx + camX * S * par) / 60;
        const hy = base - amp * Math.sin(q) - amp * 0.5 * Math.sin(q * 2.3 + 1) + 4;
        ctx.fillStyle = mix('#f2e0c8', '#8d7090', dusk);
        ctx.fillRect(hx - 6, hy - 9, 12, 9);
        ctx.fillStyle = mix('#d4614a', '#6a3550', dusk);
        ctx.beginPath();
        ctx.moveTo(hx - 8, hy - 9);
        ctx.lineTo(hx, hy - 16);
        ctx.lineTo(hx + 8, hy - 9);
        ctx.fill();
        if (dusk > 0.3) (ctx.fillStyle = '#ffd36b'), (ctx.shadowColor = '#ffd36b'), (ctx.shadowBlur = 6), ctx.fillRect(hx - 2, hy - 6, 4, 4), (ctx.shadowBlur = 0);
      }
  }
  // 나무 탁자 (디오라마가 놓인 곳)
  const tb = ctx.createLinearGradient(0, yF, 0, h);
  tb.addColorStop(0, '#6b4430');
  tb.addColorStop(1, '#3d2519');
  ctx.fillStyle = tb;
  ctx.fillRect(-10, yF, w + 20, h - yF + 10);
  ctx.strokeStyle = 'rgba(0,0,0,.12)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    const gy = yF + T + 6 + i * 9;
    ctx.beginPath();
    ctx.moveTo(0, gy);
    for (let px = 0; px <= w; px += 20) ctx.lineTo(px, gy + Math.sin(px / 40 + i) * 1.5);
    ctx.stroke();
  }
  // 땅 덩어리: 윗면(풀) · 돌길 · 앞면(흙층) · 오른쪽 끝면
  const sx0 = X(-2, 0), sx1 = X(c.len + 4, 0);
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.fillRect(sx0 + 6, yF + T, sx1 - sx0, 10);
  const tg = ctx.createLinearGradient(0, yBack, 0, yF);
  tg.addColorStop(0, mix(k === 5 ? '#e6f2f6' : k === 6 ? '#b9cf6e' : '#98cf62', '#6c5a7a', dusk * 0.6));
  tg.addColorStop(1, mix(k === 5 ? '#c9dfe8' : k === 6 ? '#93b04c' : '#6fb144', '#4f4060', dusk * 0.6));
  ctx.fillStyle = tg;
  ctx.beginPath();
  ctx.moveTo(X(-2, 0), yF);
  ctx.lineTo(X(c.len + 4, 0), yF);
  ctx.lineTo(X(c.len + 4, 1), yBack);
  ctx.lineTo(X(-2, 1), yBack);
  ctx.fill();
  // 얼음판
  for (const z of c.zones) {
    if (z.kind !== 'ice' || z.x1 < x0 || z.x0 > x1) continue;
    const ig = ctx.createLinearGradient(0, yBack, 0, yF);
    ig.addColorStop(0, '#eaf8ff');
    ig.addColorStop(1, '#a6d8f2');
    ctx.fillStyle = ig;
    ctx.beginPath();
    ctx.moveTo(X(z.x0, 0.05), yF - 0.05 * D);
    ctx.lineTo(X(z.x1, 0.05), yF - 0.05 * D);
    ctx.lineTo(X(z.x1, 0.92), yF - 0.92 * D);
    ctx.lineTo(X(z.x0, 0.92), yF - 0.92 * D);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.75)';
    ctx.lineWidth = 2;
    for (let q = Math.ceil(z.x0); q < z.x1; q += 1.7) (ctx.beginPath(), ctx.moveTo(X(q, 0.2), Y(0.2, 0)), ctx.lineTo(X(q + 0.6, 0.5), Y(0.5, 0)), ctx.stroke());
    for (let i = 0; i < 10; i++) {
      const q = z.x0 + ((i * 3.7 + s.t * 0.0) % (z.x1 - z.x0)), a = Math.abs(Math.sin(s.t / 12 + i * 1.9));
      if (q < x0 || q > x1) continue;
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      const px = X(q, 0.15 + (i % 5) * 0.15), py = Y(0.15 + (i % 5) * 0.15, 0);
      ctx.fillRect(px - 2.5 * a, py - 0.5, 5 * a, 1);
      ctx.fillRect(px - 0.5, py - 2.5 * a, 1, 5 * a);
    }
  }
  // 돌길
  ctx.fillStyle = mix('#ead8b2', '#9a8098', dusk * 0.5);
  ctx.beginPath();
  ctx.moveTo(X(x0, 0.18), Y(0.18, 0));
  ctx.lineTo(X(x1, 0.18), Y(0.18, 0));
  ctx.lineTo(X(x1, 0.46), Y(0.46, 0));
  ctx.lineTo(X(x0, 0.46), Y(0.46, 0));
  ctx.fill();
  for (const z of c.zones)
    if (z.kind === 'ice' && z.x1 > x0 && z.x0 < x1) {
      ctx.fillStyle = 'rgba(190,230,250,.85)';
      ctx.beginPath();
      ctx.moveTo(X(z.x0, 0.18), Y(0.18, 0));
      ctx.lineTo(X(z.x1, 0.18), Y(0.18, 0));
      ctx.lineTo(X(z.x1, 0.46), Y(0.46, 0));
      ctx.lineTo(X(z.x0, 0.46), Y(0.46, 0));
      ctx.fill();
    }
  ctx.strokeStyle = 'rgba(110,80,50,.25)';
  ctx.lineWidth = 1;
  for (let q = Math.floor(x0 / 0.8) * 0.8; q < x1; q += 0.8) (ctx.beginPath(), ctx.moveTo(X(q, 0.18), Y(0.18, 0)), ctx.lineTo(X(q, 0.46), Y(0.46, 0)), ctx.stroke());
  ctx.strokeStyle = 'rgba(90,60,40,.4)';
  ctx.lineWidth = 1.5;
  for (const zz of [0.18, 0.46]) (ctx.beginPath(), ctx.moveTo(X(x0, zz), Y(zz, 0)), ctx.lineTo(X(x1, zz), Y(zz, 0)), ctx.stroke());
  // 출발선
  if (x0 < 1.5) {
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 4; i++) ctx.fillRect(X(0.2, 0.18 + i * 0.07), Y(0.18 + i * 0.07, 0) - 2, 5, 3);
  }
  // 앞면 흙층
  const fg = ctx.createLinearGradient(0, yF, 0, yF + T);
  fg.addColorStop(0, k === 5 ? '#9fc6da' : '#9a6a44');
  fg.addColorStop(0.25, '#83563a');
  fg.addColorStop(1, '#4e3122');
  ctx.fillStyle = fg;
  ctx.fillRect(sx0, yF, sx1 - sx0, T);
  ctx.strokeStyle = 'rgba(40,20,10,.35)';
  ctx.lineWidth = 2;
  for (const f of [0.38, 0.7]) {
    ctx.beginPath();
    for (let q = Math.floor(x0 * 2) / 2; q <= x1; q += 0.5) ctx.lineTo(X(q, 0), yF + T * f + Math.sin(q * 1.7 + f * 9) * 2);
    ctx.stroke();
  }
  for (let q = Math.floor(x0); q < x1; q += 1) {
    const r1 = ((Math.floor(q) * 7919) % 101) / 101;
    if (r1 < 0.45) continue;
    ctx.fillStyle = r1 > 0.8 ? '#b9ab9a' : '#6d4a34';
    ctx.beginPath();
    ctx.ellipse(X(q + r1 * 0.8, 0), yF + T * (0.25 + r1 * 0.55), 3 + r1 * 3, 2 + r1 * 1.5, 0, 0, TAU);
    ctx.fill();
  }
  // 오른쪽 끝면
  if (c.len + 4 < x1 + 1) {
    ctx.fillStyle = '#5a3826';
    ctx.beginPath();
    ctx.moveTo(sx1, yF);
    ctx.lineTo(X(c.len + 4, 1), yBack);
    ctx.lineTo(X(c.len + 4, 1), yBack + T);
    ctx.lineTo(sx1, yF + T);
    ctx.fill();
  }
  // 풀 가장자리
  ctx.fillStyle = k === 5 ? '#f4fbff' : mix('#5e9e38', '#3d3a50', dusk * 0.6);
  ctx.fillRect(sx0, yF - 1, sx1 - sx0, 4);
  for (let q = Math.floor(x0 / 0.17) * 0.17; q < x1; q += 0.17) {
    const r1 = ((Math.round(q / 0.17) * 104729) % 97) / 97, px = X(q, 0);
    ctx.beginPath();
    ctx.moveTo(px - 2, yF + 2);
    ctx.lineTo(px + r1 * 2, yF - 3 - r1 * 4);
    ctx.lineTo(px + 2, yF + 2);
    ctx.fill();
    if (r1 > 0.86 && k !== 5) {
      ctx.fillStyle = ['#ff8fb1', '#ffd23f', '#ffffff'][Math.round(q / 0.17) % 3];
      ctx.beginPath();
      ctx.arc(px, yF - 5, 2.2, 0, TAU);
      ctx.fill();
      ctx.fillStyle = k === 5 ? '#f4fbff' : mix('#5e9e38', '#3d3a50', dusk * 0.6);
    }
  }
  // 뒤쪽 나무·가로등
  for (const d of c.deco) {
    if (d.x < x0 - 1 || d.x > x1) continue;
    const px = X(d.x, 1.0), py = Y(1.0, 0) + 2;
    if (d.kind === 0) drawTree(ctx, px, py, S, k, d.s, dusk);
    else {
      ctx.fillStyle = 'rgba(40,30,20,.2)';
      ctx.beginPath();
      ctx.ellipse(px - 8, py + 1, 10, 2.5, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#3b3346';
      ctx.fillRect(px - 1.5, py - S * 1.3, 3, S * 1.3);
      const on = dusk > 0.35;
      ctx.fillStyle = on ? '#ffd27a' : '#e8dcc0';
      ctx.shadowColor = '#ffb347';
      ctx.shadowBlur = on ? 16 : 0;
      ctx.beginPath();
      ctx.roundRect(px - 5, py - S * 1.3 - 10, 10, 11, 3);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
  // 구경꾼: 묘기에 환호, 넘어지면 깜짝
  for (const f of c.fans) {
    if (f.x < x0 || f.x > x1) continue;
    const near = hit.find((e) => Math.abs(e.x - f.x) < 4 && ['spin', 'bail', 'splash', 'grind', 'pass'].includes(e.kind));
    const jump = near && (near.kind === 'spin' || near.kind === 'grind') ? Math.abs(Math.sin((s.t - near.t) / 5)) * 8 : 0;
    const px = X(f.x, f.z), py = Y(f.z, 0);
    ctx.fillStyle = 'rgba(30,20,10,.22)';
    ctx.beginPath();
    ctx.ellipse(px - 2, py + 1, 8, 2.5, 0, 0, TAU);
    ctx.fill();
    emo(ctx, f.e, px, py - 10 - jump - Math.abs(Math.sin(s.t / 18 + f.ph)) * 1.5, S * 0.42, b.x > f.x);
    if (near) bubble(ctx, px, py - 34 - jump, near.kind === 'bail' ? (f.ph > 3 ? 'ㅋㅋㅋ' : '헉!') : near.kind === 'splash' ? '꽥!' : near.kind === 'pass' ? '오~' : f.ph > 3 ? '와아!' : '👏', 10);
  }
  // 달팽이 (뒤 산책로)
  if (s.snailX > x0 && s.snailX < x1) {
    const px = X(s.snailX, 0.58), py = Y(0.58, 0);
    ctx.fillStyle = 'rgba(30,20,10,.25)';
    ctx.beginPath();
    ctx.ellipse(px, py + 1, 10, 2.5, 0, 0, TAU);
    ctx.fill();
    if (c.snail) {
      ctx.fillStyle = '#d24a3a';
      ctx.fillRect(px - 10, py - 4, 20, 3);
      ctx.fillStyle = '#ffd23f';
      for (const wx of [-6, 6]) (ctx.beginPath(), ctx.arc(px + wx, py, 2, 0, TAU), ctx.fill());
      ctx.fillStyle = `rgba(255,${150 + (s.t % 6) * 15},60,.9)`;
      ctx.beginPath();
      ctx.moveTo(px - 10, py - 5);
      ctx.lineTo(px - 20 - (s.t % 4) * 2, py - 2.5);
      ctx.lineTo(px - 10, py - 1);
      ctx.fill();
    }
    emo(ctx, '🐌', px, py - 11, S * 0.38, true);
  }
  // 길 위의 것들: 뒤쪽(오리 뒤편·빨랫줄 먼 기둥) → 길 → 거북이 → 앞쪽
  const front: (() => void)[] = [];
  const shadowAt = (px: number, py: number, rx: number) => {
    ctx.fillStyle = 'rgba(30,20,10,.25)';
    ctx.beginPath();
    ctx.ellipse(px - rx * 0.2, py + 1, rx, rx * 0.28, 0, 0, TAU);
    ctx.fill();
  };
  for (const o of c.obs) {
    if (o.x + o.w < x0 || o.x > x1) continue;
    const onIce = zoneAt(c, o.x) === 'ice';
    if (o.kind === 'puddle') {
      const cx = X(o.x + o.w / 2, LANE), cy = Y(LANE, 0), rx = (o.w / 2) * S, ry = D * 0.16;
      const pg = ctx.createRadialGradient(cx, cy, 2, cx, cy, rx);
      pg.addColorStop(0, '#7cc3f0');
      pg.addColorStop(1, '#3f86c8');
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.55)';
      ctx.lineWidth = 1.2;
      const rp = (s.t % 60) / 60;
      ctx.beginPath();
      ctx.ellipse(cx + rx * 0.2, cy, rx * 0.5 * rp, ry * 0.5 * rp, 0, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      ctx.beginPath();
      ctx.ellipse(cx - rx * 0.4, cy - ry * 0.3, rx * 0.2, ry * 0.18, 0, 0, TAU);
      ctx.fill();
    } else if (o.kind === 'rock') {
      const cx = X(o.x + o.w / 2, LANE), cy = Y(LANE, 0), rw = o.w * S * 0.62, rh = o.h * S;
      shadowAt(cx, cy, rw * 1.1);
      if (onIce) {
        ctx.fillStyle = 'rgba(200,235,255,.9)';
        ctx.strokeStyle = '#7fb8d8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx - rw, cy);
        ctx.lineTo(cx - rw * 0.7, cy - rh * 1.1);
        ctx.lineTo(cx + rw * 0.2, cy - rh * 1.25);
        ctx.lineTo(cx + rw, cy - rh * 0.5);
        ctx.lineTo(cx + rw * 0.8, cy);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.8)';
        ctx.fillRect(cx - rw * 0.5, cy - rh * 0.9, 3, rh * 0.5);
      } else {
        const rg = ctx.createRadialGradient(cx + rw * 0.3, cy - rh, 1, cx, cy - rh * 0.5, rw * 1.2);
        rg.addColorStop(0, '#d8d2c8');
        rg.addColorStop(1, '#7d746a');
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.ellipse(cx, cy - rh * 0.45, rw, rh * 0.62, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#6aa84f';
        ctx.beginPath();
        ctx.ellipse(cx - rw * 0.2, cy - rh * 0.95, rw * 0.35, rh * 0.15, -0.3, 0, TAU);
        ctx.fill();
      }
    } else if (o.kind === 'duck') {
      const zc = duckZ(o, s.ct), moving = Math.sin(((s.ct + o.ph) / 240) * TAU);
      const draw = () => {
        for (let i = 0; i < 4; i++) {
          const dz = zc + (i % 2) * 0.04, px = X(o.x + 0.15 + i * 0.27, dz), py = Y(dz, 0) - Math.abs(Math.sin(s.t / 6 + i)) * 2;
          shadowAt(px, py + 2, 6);
          emo(ctx, i === 0 ? '🦆' : '🐥', px, py - (i === 0 ? 10 : 7), S * (i === 0 ? 0.42 : 0.3), moving < 0);
        }
        if (Math.abs(zc - LANE) < 0.2) (ctx.fillStyle = '#ffd23f'), (ctx.font = `900 ${S * 0.22}px system-ui`), ctx.fillText('!', X(o.x + o.w / 2, zc), Y(zc, 0) - S * 0.7);
      };
      if (zc > LANE) draw();
      else front.push(draw);
    } else if (o.kind === 'rail') {
      const px0 = X(o.x, LANE), px1 = X(o.x + o.w, LANE), py = Y(LANE, o.h);
      shadowAt((px0 + px1) / 2, Y(LANE, 0), (px1 - px0) * 0.5);
      ctx.strokeStyle = '#59606a';
      ctx.lineWidth = 3;
      for (const q of [0.25, o.w / 2, o.w - 0.25]) (ctx.beginPath(), ctx.moveTo(X(o.x + q, LANE + 0.04), Y(LANE + 0.04, 0)), ctx.lineTo(X(o.x + q, LANE + 0.04), Y(LANE + 0.04, o.h)), ctx.stroke());
      const rgd = ctx.createLinearGradient(0, py - 4, 0, py + 4);
      rgd.addColorStop(0, '#f2f6fa');
      rgd.addColorStop(1, '#7d8894');
      ctx.strokeStyle = rgd;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(px0, py);
      ctx.lineTo(px1, py);
      ctx.stroke();
      ctx.fillStyle = '#ffcf3f';
      for (let q = 0.4; q < o.w; q += 0.8) ctx.fillRect(X(o.x + q, LANE) - 3, py - 2, 6, 4);
    } else if (o.kind === 'bar') {
      // 빨랫줄: 먼 기둥·줄·빨래 (빨래는 거북이 앞에 그린다)
      const xa = X(o.x + 0.25, 0.7), xb = X(o.x + 0.25, 0.02), ya = Y(0.7, 1.55), yb = Y(0.02, 1.55);
      ctx.strokeStyle = '#7a5232';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(xa, Y(0.7, 0));
      ctx.lineTo(xa, ya);
      ctx.stroke();
      front.push(() => {
        ctx.strokeStyle = '#7a5232';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(xb, Y(0.02, 0));
        ctx.lineTo(xb, yb);
        ctx.stroke();
        ctx.strokeStyle = '#f4efe6';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(xa, ya);
        ctx.quadraticCurveTo((xa + xb) / 2, (ya + yb) / 2 + 6, xb, yb);
        ctx.stroke();
        const sway = Math.sin(s.t / 14 + o.x) * 2;
        const cloth = (z: number, len: number, col: string, wd: number) => {
          const px = X(o.x + 0.25, z), py = Y(z, 1.55) + 4;
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.moveTo(px - wd / 2, py);
          ctx.lineTo(px + wd / 2, py);
          ctx.lineTo(px + wd / 2 + sway, py + len);
          for (let i = 4; i >= 0; i--) ctx.lineTo(px - wd / 2 + sway + (i / 4) * wd, py + len + (i % 2 ? 3 : 0));
          ctx.fill();
          ctx.fillStyle = '#c69c6d';
          ctx.fillRect(px - wd / 2 + 2, py - 3, 3, 6);
          ctx.fillRect(px + wd / 2 - 5, py - 3, 3, 6);
        };
        cloth(0.58, S * 0.5, '#8fd3ff', S * 0.3);
        cloth(LANE, (1.55 - o.h) * S - 6, '#fff5e8', S * 0.55);
        const px = X(o.x + 0.25, LANE), py = Y(LANE, 1.55) + 4;
        ctx.fillStyle = '#ff8fb1';
        for (let i = 0; i < 3; i++) ctx.fillRect(px - S * 0.22 + sway * 0.5, py + 10 + i * 9, S * 0.44, 3);
        cloth(0.1, S * 0.4, '#ff8fb1', S * 0.16);
      });
    }
  }
  for (const r of c.ramps) {
    if (r.x + r.w < x0 || r.x > x1) continue;
    const zf = LANE - 0.14, zb = LANE + 0.14;
    const p = (wx: number, z: number, hg: number): [number, number] => [X(wx, z), Y(z, hg)];
    shadowAt(X(r.x + r.w * 0.7, LANE), Y(LANE, 0), r.w * S * 0.5);
    const poly = (pts: [number, number][], col: string | CanvasGradient) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      for (const [px, py] of pts) ctx.lineTo(px, py);
      ctx.closePath();
      ctx.fill();
    };
    poly([p(r.x, zf, 0), p(r.x + r.w, zf, r.h), p(r.x + r.w, zb, r.h), p(r.x, zb, 0)], '#e2ac6c');
    ctx.strokeStyle = 'rgba(120,70,30,.45)';
    ctx.lineWidth = 1;
    for (let q = 0.2; q < 1; q += 0.2) (ctx.beginPath(), ctx.moveTo(...p(r.x + r.w * q, zf, r.h * q)), ctx.lineTo(...p(r.x + r.w * q, zb, r.h * q)), ctx.stroke());
    poly([p(r.x + r.w, zf, 0), p(r.x + r.w, zf, r.h), p(r.x + r.w, zb, r.h), p(r.x + r.w, zb, 0)], '#8a5530');
    poly([p(r.x, zf, 0), p(r.x + r.w, zf, 0), p(r.x + r.w, zf, r.h)], '#b47440');
    ctx.fillStyle = '#ff5c6c';
    const [fxp, fyp] = p(r.x + r.w, zb, r.h);
    ctx.fillRect(fxp - 1, fyp - 16, 2, 16);
    ctx.beginPath();
    ctx.moveTo(fxp + 1, fyp - 16);
    ctx.lineTo(fxp + 10, fyp - 13);
    ctx.lineTo(fxp + 1, fyp - 10);
    ctx.fill();
  }
  // 딸기
  for (let i = 0; i < c.berries.length; i++) {
    const q = c.berries[i];
    if (s.got[i] || q.x < x0 || q.x > x1) continue;
    const px = X(q.x, LANE), py = Y(LANE, q.y) - Math.sin(s.t / 10 + i) * 2;
    ctx.fillStyle = 'rgba(30,20,10,.18)';
    ctx.beginPath();
    ctx.ellipse(px, Y(LANE, groundAt(c, q.x)) + 1, 5, 1.5, 0, 0, TAU);
    ctx.fill();
    emo(ctx, '🍓', px, py, S * 0.3);
  }
  // 결승 아치 (먼 기둥)
  const fin = c.len;
  if (fin > x0 - 1 && fin < x1 + 1) {
    const pa = X(fin, 0.68), pb = X(fin, 0.02);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(pa - 2, Y(0.68, 1.9), 4, 1.9 * S);
    front.push(() => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(pb - 2, Y(0.02, 1.9), 4, 1.9 * S);
      for (let i = 0; i < 10; i++)
        for (let j = 0; j < 2; j++) {
          const z0 = 0.68 - (i / 10) * 0.66, z1 = 0.68 - ((i + 1) / 10) * 0.66, hg = 1.9 - j * 0.14;
          ctx.fillStyle = (i + j) % 2 ? '#222222' : '#ffffff';
          ctx.beginPath();
          ctx.moveTo(X(fin, z0), Y(z0, hg));
          ctx.lineTo(X(fin, z1), Y(z1, hg));
          ctx.lineTo(X(fin, z1), Y(z1, hg - 0.14));
          ctx.lineTo(X(fin, z0), Y(z0, hg - 0.14));
          ctx.fill();
        }
      emo(ctx, '🎈', pa + 6, Y(0.68, 2.2) + Math.sin(s.t / 15) * 3, S * 0.35);
      emo(ctx, '🎈', pb - 4, Y(0.02, 2.15) + Math.cos(s.t / 15) * 3, S * 0.35);
    });
  }
  // 거북이
  const ice = zoneAt(c, b.x) === 'ice';
  const tx = X(b.x, LANE), gy = Y(LANE, groundAt(c, b.x)), ty = Y(LANE, b.y);
  const hgt = b.y - groundAt(c, b.x);
  ctx.fillStyle = `rgba(30,20,10,${0.32 * Math.max(0.25, 1 - hgt / 2.2)})`;
  ctx.beginPath();
  ctx.ellipse(tx - 3, gy + 1, U * 0.36 * Math.max(0.5, 1 - hgt / 3), U * 0.08, 0, 0, TAU);
  ctx.fill();
  if (b.v > 0.06 && !b.bail) {
    ctx.strokeStyle = 'rgba(255,255,255,.75)';
    ctx.lineWidth = 2;
    const len = (b.v - 0.05) * 500;
    for (let i = 0; i < 5; i++) {
      const ly = ty - U * (0.06 + i * 0.09), off = ((s.t * 7 + i * 13) % 20);
      ctx.globalAlpha = 0.35 + 0.1 * i;
      ctx.beginPath();
      ctx.moveTo(tx - U * 0.42 - off, ly);
      ctx.lineTo(tx - U * 0.42 - off - len * (0.6 + (i % 2) * 0.5), ly);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  const face: Face = b.bail ? 'dizzy' : s.phase === 'pause' && s.cleared ? 'smug' : s.t - s.lastTrick < 70 ? 'smug' : (b.air && !b.tuck) || (!b.tuck && b.v > 0.065) ? 'wow' : 'meh';
  ctx.save();
  ctx.translate(tx, ty);
  drawTurtle(ctx, U, { tuck: b.tuck && !b.bail, rot: b.rot, face, walk: b.x * 9, ice, sock: s.t - s.sock < 420, shades: b.combo >= 3, bail: b.bail, t: s.t });
  ctx.restore();
  if (b.bail)
    for (let i = 0; i < 3; i++) {
      const a = s.t / 8 + (i * TAU) / 3;
      ctx.fillStyle = '#ffd23f';
      ctx.font = `900 ${S * 0.18}px system-ui`;
      ctx.fillText('★', tx + Math.cos(a) * U * 0.35, ty - U * 0.55 + Math.sin(a) * U * 0.1);
    }
  if (b.combo >= 2 && !b.bail) {
    ctx.font = `900 ${S * 0.2}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd23f';
    ctx.strokeStyle = 'rgba(60,30,10,.7)';
    ctx.lineWidth = 3;
    const label = `콤보 ${b.combo} ×${multOf(b.combo)}`;
    ctx.strokeText(label, tx, ty - U * 0.78);
    ctx.fillText(label, tx, ty - U * 0.78);
  }
  // 갈기 불꽃·빠를 때 먼지
  if (b.rail >= 0 && b.tuck && s.t % 2 === 0) fx.burst(tx + U * 0.1, ty, s.t % 4 ? '#ffcf4a' : '#ff8a3d', 3, 2.5, 1.6);
  if (!b.air && b.tuck && b.v > 0.08 && b.rail < 0 && s.t % 5 === 0) fx.burst(tx - U * 0.3, gy - 2, ice ? '#e8f8ff' : '#e6cfa0', 2, 1.2, 2);
  for (const f of front) f();
  // 바람: 잎이 왼쪽으로 날린다
  for (const z of c.zones) {
    if (z.kind !== 'wind' || z.x1 < x0 || z.x0 > x1) continue;
    const l = Math.max(0, X(z.x0, 0)), r2 = Math.min(w, X(z.x1, 0));
    ctx.strokeStyle = 'rgba(255,255,255,.45)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 14; i++) {
      const px = r2 - ((s.t * (4 + (i % 3)) + i * 47) % Math.max(1, r2 - l)), py = top + 30 + ((i * 37) % 100) / 100 * (yF - top - 40);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + 16 + (i % 4) * 4, py);
      ctx.stroke();
      if (i % 3 === 0) {
        ctx.save();
        ctx.translate(px, py + 6);
        ctx.rotate(s.t / 6 + i);
        ctx.fillStyle = i % 2 ? '#e0a03a' : '#9acd4a';
        ctx.beginPath();
        ctx.ellipse(0, 0, 4, 2, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    }
  }
  // 노을빛·밤
  if (dusk > 0 && !c.night) (ctx.fillStyle = `rgba(255,110,60,${dusk * 0.13})`), ctx.fillRect(-10, -10, w + 20, h + 20);
  if (c.night) {
    ctx.fillStyle = 'rgba(8,10,40,.5)';
    ctx.fillRect(-10, -10, w + 20, h + 20);
    ctx.globalCompositeOperation = 'lighter';
    const glow = (gx: number, gyy: number, r: number, a: number) => {
      const lg = ctx.createRadialGradient(gx, gyy, 0, gx, gyy, r);
      lg.addColorStop(0, `rgba(255,190,90,${a})`);
      lg.addColorStop(1, 'rgba(255,190,90,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(gx - r, gyy - r, r * 2, r * 2);
    };
    for (const d of c.deco) if (d.kind === 1 && d.x > x0 - 2 && d.x < x1 + 2) glow(X(d.x, 1), Y(1, 1.3), S * 1.6, 0.35);
    glow(tx + U * 0.3, ty - U * 0.3, S * 1.5, 0.28);
    ctx.globalCompositeOperation = 'source-over';
    // 줄 전구
    for (let q = Math.floor(x0); q < x1; q += 0.5) {
      const zz = 0.95, px = X(q, zz), py = Y(zz, 1.6) + Math.sin(q * 2) * 4;
      ctx.fillStyle = ['#ff6b6b', '#ffd23f', '#7ed957', '#6cc6ff'][Math.round(q * 2) % 4];
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, TAU);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    for (let i = 0; i < 8; i++) {
      const a = Math.abs(Math.sin(s.t / 20 + i * 2.1));
      ctx.fillStyle = `rgba(220,255,120,${a})`;
      ctx.beginPath();
      ctx.arc(((i * 97 + s.t * 0.3) % w), top + 40 + ((i * 53) % 120), 1.8, 0, TAU);
      ctx.fill();
    }
  }
  // 사건 → 연출
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const ex = X(e.x, LANE), ey = Y(LANE, e.y);
    if (e.kind === 'tuck') (e.text && (fx.pop(ex, ey - U * 0.6, e.text, '#ffffff', 20), fx.ring(ex, ey - U * 0.2, '#ffffff', U * 0.7, 3)), fx.burst(ex - U * 0.35, ey - 3, '#e6cfa0', 10, 2.5, 2.5), fx.kick(2));
    if (e.kind === 'hop') fx.burst(ex, ey - 2, '#f0dfb8', 7, 1.8, 2);
    if (e.kind === 'launch') fx.pop(ex, ey - U * 0.7, e.text!, '#fff3c4', 16);
    if (e.kind === 'land') fx.burst(ex, ey - 2, '#f0dfb8', 8, 2, 2);
    if (e.kind === 'spin') (fx.pop(ex, ey - U, e.text!, '#ffd23f', 18 + (e.n ?? 1) * 3), fx.ring(ex, ey - U * 0.3, '#ffd23f', U * (0.8 + (e.n ?? 1) * 0.3), 4), fx.burst(ex, ey - U * 0.3, '#fff2a8', 18 + (e.n ?? 1) * 8, 4, 2.5), fx.kick(3 + (e.n ?? 1)), (e.n ?? 1) >= 2 && fx.blink('#fff3c4', 0.18));
    if (e.kind === 'bail') (fx.pop(ex, ey - U * 0.9, e.text!, th.hot, 18), fx.burst(ex, ey - U * 0.2, '#c8a07a', 16, 3.5, 3), fx.burst(ex, ey - U * 0.4, '#ffffff', 10, 3, 2), fx.kick(9), fx.blink(th.hot, 0.12));
    if (e.kind === 'berry') (fx.pop(ex, ey - 12, e.text!, '#ff6b81', 13), fx.burst(ex, ey, '#ff4d6d', 8, 2, 2));
    if (e.kind === 'splash') (fx.pop(ex, ey - U * 0.6, e.text!, '#8fd3ff', 17), fx.burst(ex, ey - 4, '#9fd8ff', 26, 3.5, 3), fx.ring(ex, ey, '#cfefff', U * 0.9, 3), fx.kick(4));
    if (e.kind === 'pass') fx.pop(ex, ey - U * 0.7, e.text!, '#ffffff', 14);
    if (e.kind === 'grind') (fx.pop(ex, ey - U * 0.8, e.text!, '#ffb347', 16), fx.burst(ex, ey, '#ffcf4a', 16, 3, 2));
    if (e.kind === 'rail') fx.burst(ex, ey, '#ffcf4a', 12, 3, 2);
    if (e.kind === 'combo') (fx.pop(w / 2, h * 0.3, e.text!, th.accent, 20), fx.blink('#eaffd8', 0.1));
    if (e.kind === 'snail') fx.pop(X(e.x, 0.58), Y(0.58, 0) - 34, e.text!, '#fff3c4', 13);
    if (e.kind === 'course') fx.pop(w / 2, h * 0.24, e.text!, '#ffffff', 22);
    if (e.kind === 'new') fx.pop(w / 2, h * 0.33, e.text!, '#fff3c4', 14);
    if (e.kind === 'clear') {
      fx.pop(w / 2, h * 0.27, e.text!, '#ffd23f', 26);
      for (const [cx, col] of [[0.25, '#ff6b6b'], [0.5, '#ffd23f'], [0.75, '#7ed957'], [0.4, '#6cc6ff'], [0.6, '#ff8fb1']] as [number, string][]) fx.burst(w * cx, h * 0.3, col, 22, 5.5, 3);
      fx.blink('#fff6c8', 0.25);
    }
    if (e.kind === 'bonus') fx.pop(w / 2, h * 0.36, e.text!, '#ffffff', 15);
    if (e.kind === 'fail') (fx.pop(w / 2, h * 0.3, e.text!, th.hot, 19), fx.kick(10), fx.blink('#3a1a3a', 0.35));
  }
  fx.memo.t = s.t;
  ctx.restore();

  // ── HUD ──
  const hb = top;
  const hg = ctx.createLinearGradient(0, 0, 0, hb);
  hg.addColorStop(0, 'rgba(40,22,30,.82)');
  hg.addColorStop(1, 'rgba(40,22,30,.55)');
  ctx.fillStyle = hg;
  ctx.fillRect(0, 0, w, hb);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = th.ink;
  ctx.font = `900 ${S * 0.27}px system-ui, sans-serif`;
  ctx.fillText(`🐢 ${s.k + 1}/${COURSES}판 · ${c.name}`, 10, hb * 0.3);
  ctx.textAlign = 'right';
  ctx.fillStyle = th.hot;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - 10, hb * 0.3);
  ctx.textAlign = 'left';
  ctx.font = `800 ${S * 0.23}px system-ui, sans-serif`;
  const nb = c.berries.length;
  let gotB = 0;
  for (let i = 0; i < nb; i++) gotB += s.got[i] ? 1 : 0;
  ctx.fillStyle = th.soft;
  ctx.fillText(`🍓 ${gotB}/${nb}  ⭐ ${s.stars}  점수 ${turtle.score(s)}`, 10, hb * 0.74);
  ctx.textAlign = 'right';
  const left = Math.max(0, timeLeft(s) / 60);
  ctx.fillStyle = left < 6 && s.phase === 'run' ? th.hot : th.ink;
  ctx.fillText(c.snail ? `🐌 라이벌 ${Math.round((Math.max(0, s.snailX) / c.len) * 100)}%` : `${c.night ? '🌙' : '☀️'} ${Math.ceil(left)}초`, w - 10, hb * 0.74);
  // 아래 띠: 코스 지도 + 별 점수 막대
  const bb = h - w * 0.105;
  ctx.fillStyle = 'rgba(40,22,30,.72)';
  ctx.fillRect(0, bb, w, h - bb);
  const mx0 = 22, mx1 = w - 22, my = bb + (h - bb) * 0.3;
  ctx.strokeStyle = 'rgba(255,255,255,.3)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(mx0, my);
  ctx.lineTo(mx1, my);
  ctx.stroke();
  const M = (wx: number) => mx0 + (Math.max(0, Math.min(c.len, wx)) / c.len) * (mx1 - mx0);
  ctx.strokeStyle = th.accent;
  ctx.beginPath();
  ctx.moveTo(mx0, my);
  ctx.lineTo(M(b.x), my);
  ctx.stroke();
  for (const z of c.zones) ((ctx.fillStyle = z.kind === 'ice' ? 'rgba(170,225,255,.8)' : 'rgba(220,240,180,.6)'), ctx.fillRect(M(z.x0), my - 1.5, M(z.x1) - M(z.x0), 3));
  emo(ctx, '🏁', mx1 + 8, my - 2, 13);
  if (c.snail) emo(ctx, '🐌', M(s.snailX), my - 7, 13, true);
  emo(ctx, '🐢', M(b.x), my - 7, 14);
  const py2 = bb + (h - bb) * 0.72, pw = mx1 - mx0, pf = Math.min(1, s.cpts / (c.t3 * 1.15));
  ctx.fillStyle = 'rgba(255,255,255,.15)';
  ctx.beginPath();
  ctx.roundRect(mx0, py2 - 4, pw, 8, 4);
  ctx.fill();
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  ctx.roundRect(mx0, py2 - 4, Math.max(8, pw * pf), 8, 4);
  ctx.fill();
  ctx.font = `800 ${S * 0.18}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  for (const [v, lab] of [[c.t2, '★★'], [c.t3, '★★★']] as [number, string][]) {
    const qx = mx0 + pw * Math.min(1, v / (c.t3 * 1.15));
    ctx.fillStyle = s.cpts >= v ? '#ffd23f' : 'rgba(255,255,255,.75)';
    ctx.fillRect(qx - 1, py2 - 7, 2, 14);
    ctx.fillText(`${lab} ${v}`, qx, py2 - 13 + (lab.length === 2 ? 0 : 0));
  }
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('', mx0, py2);
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  ctx.fillText(`${s.cpts}점`, 4, py2 - 13);
  // 첫 안내
  const say = (t1: string, t2?: string) => {
    ctx.textAlign = 'center';
    ctx.font = `900 ${S * 0.27}px system-ui, sans-serif`;
    const tw = Math.max(ctx.measureText(t1).width, t2 ? ctx.measureText(t2).width : 0) + 24;
    ctx.fillStyle = 'rgba(40,22,30,.7)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw / 2, top + 10, tw, t2 ? 50 : 30, 12);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(t1, w / 2, top + 25);
    if (t2) (ctx.fillStyle = '#ffe0a8'), (ctx.font = `800 ${S * 0.22}px system-ui, sans-serif`), ctx.fillText(t2, w / 2, top + 45);
  };
  if (s.phase === 'run' && k === 0 && (s.tucks === 0 || s.hops === 0) && s.ct > 10) say('👆 꾹 누르면 등껍질에 쏙 — 슝~', '떼면 폴짝! 돌멩이를 넘어요');
  else if (s.phase === 'run' && k === 1 && s.ct < 420 && s.ct > 30) say('🛹 점프대에서 날면 꾹 = 빙글!', '땅에 닿기 전에 떼야 똑바로 착지');
  if (s.phase === 'pause') {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(40,22,30,.6)';
    ctx.beginPath();
    ctx.roundRect(w * 0.18, h * 0.38, w * 0.64, 34, 12);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 ${S * 0.22}px system-ui, sans-serif`;
    ctx.fillText(s.cleared ? (s.k === COURSES - 1 ? '🏆 8코스 완주! 거북이 전설' : `다음: ${s.k + 2}판 ${NAMES[s.k + 1]}`) : `♥ ${s.hearts} — 같은 코스 다시!`, w / 2, h * 0.38 + 17);
  }
}

// ───────────────────────────── 봇 ─────────────────────────────
const moods = new WeakMap<object, { hold: boolean; until: number }>();
/** 봇: 아무 때나 누르고 아무 때나 뗀다 */
export const turtleRandom: Bot<TurtleState> = {
  name: '아무렇게나',
  act(s, rng) {
    let m = moods.get(s);
    if (!m || s.t >= m.until) moods.set(s, (m = { hold: m ? !m.hold : false, until: s.t + 6 + Math.floor(rng() * 60) }));
    return { tap: false, dir: 0, hold: m.hold };
  },
};

const T1 = [0, 3, 6, 9, 12, 18, 24, 30, 39, 48], T2 = [3, 6, 12, 21, 33, 999], HZ = 54;
const plans = new WeakMap<object, { t: number; seq: Uint8Array }>();
/** 앞으로 HZ틱 동안 seq대로 눌렀을 때의 값: 점수 + 나아간 거리(시간이 빠듯할수록 비싸게) − 넘어짐 */
function value(s: TurtleState, seq: Uint8Array, pw: number): number {
  const b: Body = { ...s.b }, got = s.got.slice(), c = s.c, x0 = b.x, combo = b.combo;
  let pts = 0, ct = s.ct, bad = 0;
  for (let i = 0; i < HZ; i++) {
    pts += advance(b, c, got, seq[i] === 1, ++ct);
    if (b.bail === BAIL) {
      bad = 1;
      break;
    }
  }
  // 공중이면 떼고 착지까지 확인
  for (let i = 0; !bad && i < 50 && b.air; i++) {
    pts += advance(b, c, got, false, ++ct);
    if (b.bail === BAIL) bad = 1;
  }
  return pts + pw * (b.x - x0 + b.v * 20) - bad * (700 + combo * 90 + pw * 8);
}
function bestPlan(s: TurtleState): Uint8Array {
  const cur = s.b.tuck ? 1 : 0, slack = timeLeft(s) - (s.c.len - s.b.x) / 0.092;
  const pw = slack < 0 ? 400 : slack < 240 ? 140 : slack < 600 ? 50 : 25;
  let best = new Uint8Array(HZ).fill(cur), bv = value(s, best, pw);
  for (const t1 of T1)
    for (const t2 of T2) {
      const seq = new Uint8Array(HZ);
      for (let i = 0; i < HZ; i++) seq[i] = i >= t1 && i < t1 + t2 ? 1 - cur : cur;
      const v = value(s, seq, pw);
      if (v > bv) (bv = v), (best = seq);
    }
  return best;
}
/** 봇: 6틱마다 '언제 숨고 언제 뗄지' 60여 가지를 앞날 흉내로 겨뤄 가장 좋은 것을 따른다 */
export const turtleSmart: Bot<TurtleState> = {
  name: '스케이트 장인',
  act(s) {
    if (s.phase !== 'run') return { tap: false, dir: 0, hold: false };
    let p = plans.get(s);
    if (!p || s.t - p.t >= 6 || s.ct < 3) plans.set(s, (p = { t: s.t, seq: bestPlan(s) }));
    return { tap: false, dir: 0, hold: p.seq[s.t - p.t] === 1 };
  },
};
