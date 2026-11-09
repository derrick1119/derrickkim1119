/**
 * 스케이트 거북이 2 (19라운드 오너 아이디어·오너 선택 → 20라운드 다듬은 판) — 무한 러너 × 꾹 눌렀다 떼기 × 콤보.
 * 오너: "스케이트 타는 거북이 — 와우 포인트잖아, 웃기잖아".
 * 기준 9(조작 하나): 꾹 누르면 등껍질 속으로 쏙(빨라지고 낮아지고 스프링처럼 충전), 떼면 다리가 튀어나오며 폴짝(오래 눌렀을수록 높이).
 *   공중에서 꾹 = 등껍질 회전, 떼면 다리가 나와 똑바로 착지. 누르는 동안 '지금 떼면' 궤적·착지(N회전·✗ 꽈당)를 점선으로 보여 준다.
 * 와우: 느릿느릿 무표정한 거북이가 등껍질에 쏙 들어가는 순간 '슝~' 하고 미끄러져 날아간다. 실수하면 뒤집혀 팽이처럼 데굴데굴(게임 끝 아님).
 * 첫 3초: 무표정하게 뚜벅뚜벅 → 달팽이가 "느림보~ 먼저 간다~" 추월, 다람쥐가 "ㅋㅋ 느려~", 거북이 "…" → 첫 꾹: 쏙! 바퀴 헛돌며 흙먼지 → 슝~~
 *   → 달팽이를 휙 지나치면 달팽이가 바람에 팽글팽글 "으아앗?!" → 떼면 놀란 얼굴로 뿅!
 * 웃음(다듬은 판에서 더함): 넘어진 까닭마다 다른 꼴(돌=뒤집혀 팽이, 오리=엄마 오리가 콕콕, 빨랫줄=목 걸려 대롱대롱+양말 모자, 난간=지이잉 떨기, 회전 실패=오래 팽이),
 *   털고 일어나면 머쓱한 얼굴로 "…계획대로야." 같은 한마디, 구경꾼은 회전마다 심사위원 점수판(5~10)·넘어지면 배꼽 잡고 데굴·슝 지나가면 휘청,
 *   2판 토끼가 놀리며 앞질러 가더니 낮잠 → 지나치면 깜짝 놀라 쫓아오다 꽈당. 표정 7가지(무표정·놀람·우쭐·어질·힘줌·기겁·머쓱).
 * 목표·보상: 판(코스)마다 해 지기 전에 결승선 — 묘기·🍓·남은 시간 점수로 별 1~3. 해가 지면 하트 -1, 그 코스만 다시. 8코스 완주가 끝.
 *   다듬은 판 공정함: 보통 사람 봇(회전 안 함, 꾹 ~0.4초, 0.1~0.2초 오차)이 1~5판을 거의 늘 8초쯤 남기고 첫 시도에 완주 — 하트는 욕심낸 회전(꽈당 = 긴 팽이)으로 잃는다.
 * 하는 일이 바뀐다: 돌멩이(1판, 떼서 넘기) → 점프대(2판, 공중 회전) → 빨랫줄(3판, 숨어서 밑으로) → 오리 가족·웅덩이(4판, 속도 모아 멀리 / 때 맞추기)
 *                  → 난간(5판, 올라타 갈기·밑으로 빠지기) → 꽁꽁 호수(6판, 속도가 안 줄어듦) → 맞바람·달팽이 라이벌(7판) → 밤 축제(8판).
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.15, TAU = Math.PI * 2, COURSES = 8, LANE = 0.32;
/** 걷기(다리로 밀기) · 등껍질 속도 · 얼음 위 등껍질 속도 (칸/틱) */
const VWALK = 0.035, VTUCK = 0.1, VICE = 0.14, ACC = 0.0022, FRIC = 0.0008, GLIDE = 0.00025, PUSH = 0.0006;
/** 등껍질 속에 이만큼(틱) 넘게 있으면 답답해서 저절로 튀어나온다 — 계속 누르고 있을 필요가 없게 (기준 8) */
const TUCKMAX = 75;
/**
 * 폴짝 높이는 등껍질 속에 있던 시간만큼 (스프링처럼 꾹 = 충전): 톡 = 뿅(낮게) · 0.6초 = 폴짜악(높게) — '얼마나 누를지'가 높이·거리를 바꾼다 (기준 11, 다듬은 판)
 * 넘어짐: 장애물에 콩 = 짧게 데굴(BAIL) · 회전하다 꽈당 = 길게 팽이 돌기(BAILF) — 하트를 잃는 건 주로 욕심낸 묘기 탓이 되게
 */
const G = 0.0055, HOP0 = 0.08, HOP1 = 0.106, CHARGE = 36, SPIN = TAU / 24, BAIL = 56, BAILF = 96, HALF = 0.2, HU = 0.55, HT = 0.28;
export const hopV = (tt: number) => HOP0 + (HOP1 - HOP0) * Math.min(1, tt / CHARGE);
const SPINPTS = [0, 100, 250, 450, 700, 1000];
const NAMES = ['연못가 산책로', '점프대 공원', '빨래 마을', '오리 연못', '난간 광장', '꽁꽁 호수', '바람 언덕', '밤 축제'];
const LEN = [38, 50, 56, 62, 68, 72, 76, 84];
/** 판마다 해 지는 시간 = 길이 ÷ VREF. 보통 사람(회전 안 함, 0.1~0.15초 오차)이 1~5판을 8초 넘게 남기고 들어오게 (다듬기 전엔 3~5초였다) */
const VREF = [0.026, 0.042, 0.0467, 0.0492, 0.0515, 0.06, 0.06, 0.0609];
const SNAILV = 0.054;
type Kind = 'rock' | 'ramp' | 'bar' | 'puddle' | 'duck' | 'rail';
const UNLOCK: Record<Kind, number> = { rock: 0, ramp: 1, bar: 2, duck: 3, puddle: 3, rail: 4 };
const NEWK: Kind[][] = [['rock'], ['ramp'], ['bar'], ['duck', 'puddle'], ['rail'], [], [], []];
const ZONES: ['ice' | 'wind', number, number][][] = [[], [], [], [], [], [['ice', 9, 28], ['ice', 42, 60]], [['wind', 10, 22], ['wind', 34, 46], ['wind', 56, 66]], [['ice', 16, 28], ['wind', 46, 56]]];
const FANS = [['🐰', '🐸', '🐿️', '🐤'], ['🐰', '🦔', '🐻', '🐤'], ['🐱', '🐰', '🐔', '🐶'], ['🦆', '🐸', '🐰', '🐤'], ['🐶', '🐱', '🐰', '🦔'], ['🐧', '🦭', '🐰', '🦊'], ['🐑', '🐐', '🐰', '🐄'], ['🦉', '🦊', '🐰', '🦝']];
const SEE: Record<string, string> = {
  rock: '🪨 돌멩이 — 떼면 폴짝 넘어요',
  ramp: '🛹 점프대 — 날면서 꾹 = 빙글빙글 회전!',
  bar: '🧦 빨랫줄 — 꾹 숨어서 밑으로 쏙!',
  duck: '🦆 오리 가족 — 건널 땐 오래 눌러 높이 뛰거나 기다려요',
  puddle: '💧 웅덩이 — 빠르게 와서 휙 넘어요',
  rail: '🔩 난간 — 오래 눌러 높이 올라타 꾹 = 갈기!',
  ice: '❄️ 꽁꽁 호수 — 미끄러워서 속도가 안 줄어요',
  wind: '🍃 맞바람 — 등껍질에 숨어야 앞으로 가요',
  snail: '🐌 로켓 달팽이 — 저 녀석보다 먼저 결승!',
  night: '🏮 밤 축제 — 등불 아래를 잘 봐요',
};

export interface Ob { kind: Kind; x: number; w: number; h: number; ph: number }
interface Zone { kind: 'ice' | 'wind'; x0: number; x1: number }
interface Berry { x: number; y: number }
interface Fan { x: number; z: number; e: string; ph: number }
/** 판 위 소품: 0 나무 · 1 가로등 · 2 덤불 · 3 연못 · 4 집 · 5 눈사람 · 6 풍차 · 7 축제 천막 */
interface Deco { x: number; kind: number; s: number; z: number }
export interface Course {
  k: number; name: string; len: number; obs: Ob[]; ramps: Ob[]; rails: number[]; zones: Zone[]; berries: Berry[];
  time: number; snail: number; night: boolean; t2: number; t3: number; fans: Fan[]; deco: Deco[];
}
/** fin = 회전을 다 돌고 다리를 편 뒤 지난 틱 (착지 직전에 끝냈으면 '아슬아슬') */
export interface Body { x: number; y: number; vy: number; v: number; tuck: boolean; air: boolean; rot: number; rotTo: number; bail: number; rail: number; grind: number; combo: number; oi: number; bi: number; tt: number; lock: boolean; fin: number }
interface Ev { t: number; kind: string; x: number; y: number; text?: string; n?: number }
export interface TurtleState {
  rng: Rng; seed: number; t: number; ct: number; k: number; c: Course; b: Body; got: Uint8Array;
  phase: 'run' | 'pause'; pause: number; cleared: boolean; hearts: number; stars: number; total: number; cpts: number; done: number;
  snailX: number; snailPassed: number; snailT: number; lastTrick: number; lastBail: number; sock: number; tucks: number; hops: number; lastStars: number;
  /** 넘어진 까닭(그림용) · 털고 일어난 때(머쓱한 얼굴) · 2판 토끼(-1 없음, 0 달림, 1 낮잠, 2 깨서 쫓음, 3 꽈당) */
  bailWhy: string; upT: number; sayT: number; hare: number; hareX: number; hareT: number;
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
  const rs = c.ramps;
  for (let i = 0; i < rs.length; i++) {
    const r = rs[i];
    if (x >= r.x && x <= r.x + r.w) return ((x - r.x) / r.w) * r.h;
  }
  return 0;
}
function zoneAt(c: Course, x: number) {
  const zs = c.zones;
  for (let i = 0; i < zs.length; i++) if (x >= zs[i].x0 && x <= zs[i].x1) return zs[i].kind;
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
      w = 0.9 + r() * 0.4;
      c.obs.push({ kind, x, w, h: 0.34, ph: 0 });
      berry(x + w / 2, 0.14);
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
  // 별: ★★ = 깔끔하게 + 회전 한두 번(보통 사람이 손에 닿게), ★★★ = 회전을 꾸준히 (보통 사람 봇·장인 봇 점수로 맞춤)
  c.t2 = Math.round((pot * 0.45 + 50) / 50) * 50;
  c.t3 = Math.round((pot * 1.9 + 150) / 50) * 50;
  for (let fx = 2 + r() * 3; fx < len + 3; fx += 3 + r() * 3.5) c.fans.push({ x: fx, z: 0.6 + r() * 0.18, e: FANS[k][Math.floor(r() * 4)], ph: r() * 6 });
  const special = [3, -1, 4, 3, -1, 5, 6, 7][k];
  for (let dx = -0.5 + r() * 2; dx < len + 5; dx += 2.2 + r() * 2.8) {
    const sp = special >= 0 && r() < 0.3;
    const kind = sp && (special === 4 || special === 6 || special === 7) ? special : r() < (k === 7 ? 0.5 : 0.22) ? 1 : 0;
    c.deco.push({ x: dx, kind, s: 0.8 + r() * 0.45, z: 1 });
    if (sp && (special === 3 || special === 5)) c.deco.push({ x: dx + 0.8, kind: special, s: 0.9 + r() * 0.4, z: special === 3 ? 0.8 : 0.84 });
    else if (r() < 0.55) c.deco.push({ x: dx + 1 + r(), kind: 2, s: 0.7 + r() * 0.5, z: 0.86 + r() * 0.06 });
  }
  c.deco.sort((a, b) => b.z - a.z);
  return c;
}

const newBody = (): Body => ({ x: 0.6, y: 0, vy: 0, v: 0, tuck: false, air: false, rot: 0, rotTo: 0, bail: 0, rail: -1, grind: 0, combo: 0, oi: 0, bi: 0, tt: 0, lock: false, fin: 99 });
type Cb = (kind: string, x: number, y: number, n?: number, text?: string) => void;

/**
 * 거북이 한 틱 — 게임과 봇(앞날 흉내)이 같은 함수를 쓴다. 얻은 점수를 돌려준다.
 * got: [딸기들 | 장애물들] 처리 여부 (봇은 복사본으로 흉내 낸다)
 */
function bailB(b: Body, got: Uint8Array, why: string, j: number, cb?: Cb) {
  if (j >= 0) got[j] = 1;
  // 회전하다 꽈당은 길게 팽이 돌기, 빨랫줄은 줄에 걸려 대롱대롱(거의 멈춤), 나머지는 짧게 데굴
  b.bail = why === 'flip' ? BAILF : BAIL;
  b.v *= why === 'flip' ? 0.35 : why === 'bar' ? 0.15 : 0.6;
  b.combo = 0;
  b.tuck = false;
  b.rail = -1;
  b.grind = 0;
  b.rot = 0;
  b.rotTo = 0;
  if (b.vy > 0) b.vy = 0;
  cb?.('bail', b.x, b.y, 0, why);
}
function endGrind(b: Body, cb?: Cb) {
  if (b.grind >= 18) (b.combo++, cb?.('grind', b.x, b.y, b.grind));
  b.grind = 0;
}

export function advance(b: Body, c: Course, got: Uint8Array, hold: boolean, ct: number, cb?: Cb): number {
  const nb = c.berries.length;
  let pts = 0;
  const mult = multOf(b.combo);
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
    if (b.bail === 0) (b.air = false), (b.y = g), (b.vy = 0), (b.tuck = false), (b.lock = hold), cb?.('up', b.x, b.y);
    return 0;
  }
  const z = zoneAt(c, b.x);
  if (!hold) b.lock = false;
  let want = hold && !b.lock;
  if (b.tuck && !b.air && b.tt >= TUCKMAX) (want = false), (b.lock = true), cb?.('stuffy', b.x, b.y);
  if (want && !b.tuck) {
    b.tuck = true;
    b.tt = 0;
    cb?.(b.air ? 'curl' : 'tuck', b.x, b.y, b.v);
  } else if (!want && b.tuck) {
    b.tuck = false;
    if (b.air) {
      const f = b.rot / TAU, fl = Math.floor(f);
      b.rotTo = (f - fl < 0.12 ? fl : fl + 1) * TAU;
    } else {
      if (b.rail >= 0) endGrind(b, cb);
      b.air = true;
      b.vy = hopV(b.tt);
      b.rail = -1;
      cb?.('hop', b.x, b.y, b.tt);
    }
  }
  if (b.air) {
    if (z === 'wind' && !b.tuck) b.v = Math.max(0.012, b.v - 0.0007);
  } else if (b.rail >= 0) b.v = b.tuck ? Math.min(0.12, b.v + 0.0006) : Math.max(VWALK, b.v - 0.002);
  else if (b.tuck) {
    const vm = z === 'ice' ? VICE : VTUCK;
    b.v = b.v < vm ? Math.min(vm, b.v + ACC) : Math.max(vm, b.v - FRIC);
  } else if (z === 'wind') b.v = Math.max(0.01, b.v - 0.0016);
  else if (z !== 'ice') b.v = b.v > VWALK ? Math.max(VWALK, b.v - GLIDE) : Math.min(VWALK, b.v + PUSH);
  if (b.tuck) b.tt++;
  const py = b.y;
  b.x += b.v;
  if (b.rail >= 0) {
    const r = c.obs[b.rail];
    if (b.x > r.x + r.w) (endGrind(b, cb), (b.rail = -1), (b.air = true), (b.vy = 0.03));
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
    else if (b.rot < b.rotTo) (b.rot = Math.min(b.rotTo, b.rot + SPIN * 2)), (b.fin = 0);
    else if (b.rot > b.rotTo) (b.rot = Math.max(b.rotTo, b.rot - SPIN)), (b.fin = 0); // 한 바퀴를 살짝 넘겨 뗐으면 되감아 똑바로
    else b.fin++;
    const g = groundAt(c, b.x);
    let landed = false;
    if (b.vy < 0)
      for (let q = 0; q < c.rails.length; q++) {
        const i = c.rails[q], r = c.obs[i];
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
      const ok = onRail || (b.tuck ? Math.abs(b.rot - n * TAU) < 0.2 * TAU : Math.abs(b.rot - b.rotTo) < 0.6);
      const spins = onRail ? Math.floor(b.rot / TAU + 0.12) : n;
      b.rot = 0;
      b.rotTo = 0;
      if (!ok) return bailB(b, got, 'flip', -1, cb), pts;
      // 떼고 나서 착지 직전(3틱 안)에야 다 돌았으면 '아슬아슬' (점수는 같고 연출만)
      if (spins > 0) (pts += SPINPTS[Math.min(5, spins)] * mult), (b.combo += spins), cb?.('spin', b.x, b.y, spins, !b.tuck && b.fin <= 3 ? 'close' : '');
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
        if (o.kind === 'rock') (pts += 10), cb?.('pass', o.x + o.w / 2, o.h, 10, '');
        else if (o.kind === 'bar') (pts += 20 * mult), b.combo++, cb?.('pass', o.x, 0.3, 20 * mult, '쏙!');
        else if (o.kind === 'puddle') (pts += 15), cb?.('pass', o.x + o.w / 2, 0.5, 15, '휙!');
        else if (o.kind === 'duck' && duckIn(o, ct)) (pts += 30 * mult), b.combo++, cb?.('pass', o.x + o.w / 2, 0.6, 30 * mult, '꽥?!');
      }
      continue;
    }
    if (got[j] || b.rail === i) continue;
    if (o.kind === 'rock' && b.y < o.h) bailB(b, got, 'rock', j, cb);
    else if (o.kind === 'duck' && b.y < o.h && duckIn(o, ct)) bailB(b, got, 'duck', j, cb);
    else if (o.kind === 'bar' && top > o.h) bailB(b, got, 'bar', j, cb);
    else if (o.kind === 'rail' && b.y < o.h - 0.03 && top > o.h - 0.1) bailB(b, got, 'rail', j, cb);
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
  s.snailT = -999;
  s.hare = s.k === 1 ? 0 : -1;
  s.hareX = 0.2;
  s.hareT = -999;
  ev(s, 'course', 0, 0, `${s.k + 1}판 · ${s.c.name}`);
  if (s.c.night) see(s, 'night');
  if (s.c.snail) see(s, 'snail');
}
const timeLeft = (s: TurtleState) => (s.c.snail ? (s.c.len - s.snailX) / s.c.snail : s.c.time - s.ct);
const BAILTXT: Record<string, string> = { rock: '쿵! 데굴데굴~', duck: '꽥꽥! 콕콕콕!', bar: '빨랫줄에 대롱대롱~', rail: '깡! 지이잉~', flip: '꽈당! 팽이 거북~' };
/** 털고 일어난 무표정 거북이의 한마디 (웃음은 태연한 척에서) */
const UPTXT = ['…계획대로야.', '안 아파.', '방금 건 연습.', '못 본 걸로 해.', '…', '바닥이 먼저 왔어.', '거북이는 원래 이래.', '음. 다시.'];

export const turtle: GameDef<TurtleState> = {
  id: 'turtle',
  name: '스케이트 거북이 2',
  genes: ['endless', 'hold', 'combo'],
  origin: '오너 아이디어 — "스케이트 타는 거북이, 와우 포인트잖아 웃기잖아" (2026-11-08)',
  twist: '느릿느릿 무표정한 거북이가 등껍질에 쏙 숨는 순간 스케이트처럼 슝~ 미끄러진다 — 숨은 만큼 빨라지고 스프링처럼 눌려 떼면 그만큼 높이 튀고, 공중에서 숨으면 등껍질이 팽이처럼 돈다',
  rules: ['꾹 누르면 등껍질에 쏙 — 슝~ 빨라지고 낮은 건 밑으로! 떼면 폴짝, 오래 누를수록 높이.', '공중에서 꾹 = 빙글빙글 회전! 점선 끝에 ✗가 뜨기 전에 떼야 똑바로 착지해요.', '해 지기 전에 결승선까지 — 묘기·🍓 점수로 별을 모아요.'],
  controls: 'hold',
  hint: '꾹 누르면 등껍질에 쏙(슝~), 떼면 폴짝 — 오래 누를수록 높이 / 스페이스',
  aspect: A,
  art: {
    concept: '노을 지는 공원 스케이트 디오라마',
    mood: '나무 탁자 위에 놓인 길쭉한 공원 디오라마. 흙층이 보이는 땅 위로 돌길이 나 있고, 해가 지며 하늘이 하늘색→금빛→보랏빛으로 물든다. 토끼·개구리 구경꾼이 묘기마다 환호하고, 무표정한 거북이가 롤러스케이트로 슝 지나간다.',
    palette: { bg: '#2b1d2e', ink: '#fff8ec', muted: '#a08a7a', accent: '#7ed957', hot: '#ff6b5a', soft: '#ffe0a8' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = { rng: mulberry32(seed), seed, t: 0, ct: 0, k: 0, phase: 'run', pause: 0, cleared: false, hearts: 3, stars: 0, total: 0, cpts: 0, done: 0, snailX: 0, snailPassed: 0, snailT: -999, lastTrick: -999, lastBail: -999, sock: -999, tucks: 0, hops: 0, lastStars: 0, bailWhy: 'rock', upT: -999, sayT: -999, hare: -1, hareX: 0, hareT: -999, seen: new Set<string>(), events: [], dead: false } as unknown as TurtleState;
    startCourse(s);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    if (s.events.length) s.events = s.events.filter((e) => s.t - e.t < (e.kind === 'new' ? 200 : 90));
    const hold = !!inp.hold;
    if (s.phase === 'pause') {
      if (--s.pause <= 0) {
        if (s.cleared && s.k === COURSES - 1) s.dead = true;
        else (s.cleared && s.k++, startCourse(s));
      }
      return;
    }
    s.ct++;
    const b = s.b, c = s.c, m0 = multOf(b.combo);
    const pts = advance(b, c, s.got, hold, s.ct, (kind, x, y, n, text) => {
      if (kind === 'tuck') (s.tucks++, ev(s, kind, x, y, s.tucks === 1 ? '쏙! 슝~~' : (n ?? 0) < 0.05 ? '슝~' : undefined));
      else if (kind === 'hop') (s.hops++, ev(s, kind, x, y, s.hops === 1 ? '뿅!' : (n ?? 0) >= CHARGE ? '폴짜악!' : undefined, n));
      else if (kind === 'spin') {
        const t = n === 1 ? '빙글 1회전!' : n === 2 ? '2회전!! 빙글빙글' : `${n}회전!!! 팽이 거북`;
        ev(s, kind, x, y, text === 'close' ? `아슬아슬~ ${t}` : t, n);
        s.lastTrick = s.t;
        if (((n ?? 0) >= 3 || text === 'close') && s.t - s.sayT > 300) (s.sayT = s.t), ev(s, 'say', x, y, text === 'close' ? '…계산대로.' : '후훗.');
      } else if (kind === 'bail') (ev(s, kind, x, y, BAILTXT[text ?? 'flip']), (s.lastBail = s.t), (s.bailWhy = text ?? 'flip'), text === 'bar' && (s.sock = s.t));
      else if (kind === 'up') (s.upT = s.sayT = s.t), ev(s, 'say', x, y, UPTXT[Math.floor(s.rng() * UPTXT.length)]);
      else if (kind === 'berry') ev(s, kind, x, y, `+${n}`);
      else if (kind === 'pass') ev(s, kind, x, y, text ? `${text} +${n}` : `+${n}`);
      else if (kind === 'grind') (ev(s, kind, x, y, '끼이익~ 갈기!'), (s.lastTrick = s.t));
      else if (kind === 'splash') ev(s, kind, x, y, '첨벙!');
      else if (kind === 'stuffy') ev(s, kind, x, y, '답답해! 퐁!');
      else if (kind === 'launch') ev(s, kind, x, y, '휘익~');
      else ev(s, kind, x, y);
    });
    s.cpts += pts;
    s.total += pts;
    if (multOf(b.combo) > m0) {
      // 같은 틱의 묘기 글자에 붙여서 한 줄로 (글자가 겹치지 않게)
      const last = s.events.at(-1);
      if (last && last.t === s.t && (last.kind === 'spin' || last.kind === 'pass' || last.kind === 'grind')) last.text += ` 콤보×${multOf(b.combo)}`;
      else ev(s, 'combo', b.x, b.y, `${b.combo}연속 콤보! ×${multOf(b.combo)}`);
    }
    // 보이기 시작한 새것
    for (let i = b.oi; i < c.obs.length && c.obs[i].x < b.x + 6.5; i++) see(s, c.obs[i].kind);
    for (const r of c.ramps) if (r.x > b.x && r.x < b.x + 6.5) see(s, 'ramp');
    for (const z of c.zones) if (z.x0 < b.x + 6.5 && z.x1 > b.x) see(s, z.kind);
    // 달팽이: 평소엔 뒤 산책로의 구경꾼(느리면 추월당한다), 7판엔 로켓 스케이트 라이벌
    if (c.snail) {
      if (s.ct > 60) s.snailX += c.snail;
    } else s.snailX += 0.045;
    if (!s.snailPassed && s.ct > 20 && s.snailX > b.x + 0.3 && b.x < c.len) (s.snailPassed = 1), (s.snailT = s.t), ev(s, 'snail', s.snailX, 0.4, c.snail ? '먼저 간다~ 느림보 거북!' : '느림보~ 먼저 간다~');
    // 달팽이한테 추월당한 무표정 거북이: 한 박자 쉬고 "…"
    if (s.snailPassed === 1 && s.t - s.snailT === 35 && !b.bail && !b.tuck) (s.sayT = s.t), ev(s, 'say', b.x, b.y, '…');
    if (s.snailPassed === 1 && b.x > s.snailX + 0.4) (s.snailPassed = 2), (s.snailT = s.t), ev(s, 'snail', s.snailX, 0.4, c.snail ? '…!? 반칙이야!' : '으아앗?! 뭐야 저 거북이');
    // 2판: 토끼가 놀리며 앞질러 가더니 결승 앞에서 낮잠 — 슝 지나가면 깜짝 놀라 쫓아오다 꽈당 (+50)
    if (s.hare === 0) {
      if (s.ct === 24) ev(s, 'hare', s.hareX, 0.5, 'ㅋㅋ 거북이가 스케이트?');
      if (s.ct > 40) s.hareX += 0.15;
      if (s.hareX >= c.len * 0.55) (s.hare = 1), (s.hareT = s.t), ev(s, 'hare', s.hareX, 0.5, '하암~ 한숨 자야지 zZ');
    } else if (s.hare === 1 && b.x > s.hareX + 0.2) {
      (s.hare = 2), (s.hareT = s.t), (s.cpts += 50), (s.total += 50);
      ev(s, 'hare', s.hareX, 0.5, '…어?! 거북이가?!');
      ev(s, 'bonus', b.x, 0.6, '🐇 낮잠 자는 토끼 추월! +50', 50);
    } else if (s.hare === 2) {
      // 허겁지겁 쫓아와 앞지르더니… 제 발에 걸려 꽈당
      s.hareX += 0.15;
      if (s.t - s.hareT > 56) (s.hare = 3), (s.hareT = s.t), ev(s, 'hare', s.hareX, 0.5, '꽈당! 데굴데굴~');
    } else if (s.hare === 3 && s.t - s.hareT < 30) s.hareX += 0.04;
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
      ev(s, 'say', b.x, b.y, st === 3 ? '…별거 아냐.' : st === 2 ? '음. 나쁘지 않군.' : '…다음엔 진심으로.');
      if (bonus) ev(s, 'bonus', b.x, 0, `남은 시간 +${bonus}`);
    } else if (timeLeft(s) <= 0) {
      s.hearts--;
      s.cleared = false;
      ev(s, 'fail', b.x, 0, c.snail ? '🐌 달팽이가 먼저… ♥ -1 · 다시!' : '해가 졌어요… ♥ -1 · 다시!');
      ev(s, 'say', b.x, b.y, c.snail ? '…달팽이한테?' : '…해가 너무 빨라.');
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
function emo(ctx: CanvasRenderingContext2D, e: string, x: number, y: number, size: number, flip = false, rot = 0) {
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffffff';
  ctx.font = `${size}px ${EMOJI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (flip || rot) (ctx.save(), ctx.translate(x, y), ctx.rotate(rot), ctx.scale(flip ? -1 : 1, 1), ctx.fillText(e, 0, 0), ctx.restore());
  else ctx.fillText(e, x, y);
}
/** 말풍선 (휴대폰 390px에서도 읽히게 글자 12px 이상) */
function bubble(ctx: CanvasRenderingContext2D, x0: number, y: number, text: string, size: number, w = 9999) {
  if (x0 < -16 || x0 > w + 16) return; // 말하는 이가 화면 밖이면 말풍선도 없다
  size = Math.max(12, size);
  ctx.font = `800 ${size}px system-ui, sans-serif`;
  const tw = ctx.measureText(text).width + size, x = Math.max(tw / 2 + 3, Math.min(w - tw / 2 - 3, x0));
  ctx.fillStyle = 'rgba(255,255,255,.92)';
  ctx.beginPath();
  ctx.roundRect(x - tw / 2, y - size * 0.85, tw, size * 1.5, size * 0.6);
  const tx = Math.max(x - tw / 2 + 6, Math.min(x + tw / 2 - 6, x0));
  ctx.moveTo(tx - 3, y + size * 0.6);
  ctx.lineTo(tx, y + size * 1.05);
  ctx.lineTo(tx + 4, y + size * 0.6);
  ctx.fill();
  ctx.fillStyle = '#3a2a2a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y - size * 0.1);
}

/** 무표정 · 놀람 · 우쭐 · 어질어질 · 힘줌(꾹 충전 끝) · 기겁(이대로면 꽈당) · 머쓱(털고 일어남) */
type Face = 'meh' | 'wow' | 'smug' | 'dizzy' | 'strain' | 'panic' | 'sheep';
/** why/bt = 넘어진 까닭과 넘어진 뒤 지난 틱, ch = 등껍질 충전(0~1, 납작하게 눌린다) */
interface Look { tuck: boolean; rot: number; face: Face; walk: number; ice: boolean; sock: boolean; shades: boolean; bail: number; t: number; why: string; bt: number; ch: number }

/** 구경꾼이 드는 심사위원 점수판 (5~10점, 10점은 빨간 글씨) */
function scoreCard(ctx: CanvasRenderingContext2D, x: number, y: number, sc: number) {
  ctx.fillStyle = '#7a4e2d';
  ctx.fillRect(x - 1, y + 8, 2, 12);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#3a2a2a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x - 15, y - 10, 30, 20, 3);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = sc >= 10 ? '#e8453c' : '#222222';
  ctx.font = `900 13px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(sc % 1 ? sc.toFixed(1) : String(sc), x, y + 1);
}
const FANREACT = new Set(['spin', 'bail', 'splash', 'grind', 'pass', 'snail']);

/** 식은땀 한 방울 (거북이 단위 좌표) */
function sweat(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.fillStyle = '#8fd3ff';
  ctx.beginPath();
  ctx.moveTo(x, y - r * 1.4);
  ctx.quadraticCurveTo(x + r, y, x, y + r * 0.6);
  ctx.quadraticCurveTo(x - r, y, x, y - r * 1.4);
  ctx.fill();
}

/** 거북이 (원점 = 발밑 가운데, 오른쪽을 본다, u = 거북이 한 칸의 px) */
function drawTurtle(ctx: CanvasRenderingContext2D, u: number, o: Look) {
  ctx.save();
  ctx.scale(u, u);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (o.bail > 0) {
    const bt = o.bt;
    if (o.why === 'rail' && bt < 22) {
      // 깡! 난간에 박고 꼿꼿이 선 채 소리굽쇠처럼 지이잉 떤다
      const a = 1 - bt / 22, q = Math.sin(bt * 2.6);
      ctx.translate(0, -0.2);
      ctx.scale(1 + q * 0.16 * a, 1 - q * 0.08 * a);
      ctx.translate(0, 0.2);
    } else if (o.why === 'bar' && bt < 34) {
      // 빨랫줄에 목이 걸려 대롱대롱 그네 (들어 올리는 건 바깥에서)
      ctx.translate(0, -0.62);
      ctx.rotate(Math.sin(bt * 0.3) * 0.55 * (1 - bt / 44));
      ctx.translate(0, 0.62);
    } else {
      // 한 바퀴 휙 뒤집혀 등으로 누운 뒤 팽이처럼 돈다 (꽈당은 더 빨리, 점점 느려지며)
      const q = bt - (o.why === 'rail' ? 22 : o.why === 'bar' ? 34 : 0), flip = Math.min(1, q / 9);
      const sp = Math.cos(q * (o.why === 'flip' ? 0.75 : 0.45) * (1 - Math.min(0.6, q / 160)));
      ctx.translate(0, -0.2);
      if (flip >= 1) ctx.scale(Math.max(0.3, Math.abs(sp)) * (sp < 0 ? -1 : 1), 1);
      ctx.rotate(Math.PI * (flip < 1 ? flip * 2 - 1 : 1) + Math.sin(o.t * 0.3) * 0.25 * flip);
      ctx.translate(0, 0.22);
    }
  } else {
    ctx.translate(0, -0.24);
    ctx.rotate(o.rot);
    ctx.translate(0, 0.24);
  }
  // 꾹 충전: 등껍질이 납작하게 눌린다 (떼면 그만큼 높이 폴짝)
  if (o.ch > 0) ctx.scale(1 + o.ch * 0.07, 1 - o.ch * 0.12);
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
  const head = legs ? { x: 0.45, y: base - 0.2 } : null;
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
    // 등껍질 속에서 빼꼼 내다보는 눈 (힘줄 땐 ><, 기겁하면 왕눈 + 식은땀)
    ctx.fillStyle = '#1d2a12';
    ctx.beginPath();
    ctx.ellipse(0.31, base - 0.06, o.face === 'panic' ? 0.065 : 0.05, o.face === 'panic' ? 0.055 : 0.045, 0, 0, TAU);
    ctx.fill();
    if (o.face === 'strain') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.014;
      for (const [ex, d] of [[0.293, 1], [0.337, -1]] as [number, number][]) {
        ctx.beginPath();
        ctx.moveTo(ex - 0.012 * d, base - 0.078);
        ctx.lineTo(ex + 0.01 * d, base - 0.065);
        ctx.lineTo(ex - 0.012 * d, base - 0.052);
        ctx.stroke();
      }
    } else if (o.face === 'panic') {
      for (const ex of [0.285, 0.34]) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ex, base - 0.065, 0.024, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#111111';
        ctx.beginPath();
        ctx.arc(ex + 0.004, base - 0.065, 0.007, 0, TAU);
        ctx.fill();
      }
      sweat(ctx, 0.2, base - 0.3, 0.05);
    } else {
      ctx.fillStyle = '#ffffff';
      for (const ex of [0.295, 0.335]) (ctx.beginPath(), ctx.arc(ex, base - 0.065, 0.016, 0, TAU), ctx.fill());
    }
  } else {
    const { x: hx, y: hy } = head;
    const hg = ctx.createRadialGradient(hx + 0.03, hy - 0.05, 0.02, hx, hy, 0.15);
    hg.addColorStop(0, '#b6e27a');
    hg.addColorStop(1, '#79b544');
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.ellipse(hx, hy, 0.16, 0.145, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,120,140,.45)';
    ctx.beginPath();
    ctx.ellipse(hx + 0.01, hy + 0.05, 0.035, 0.02, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#2b3a1a';
    ctx.beginPath();
    ctx.arc(hx + 0.14, hy - 0.01, 0.01, 0, TAU);
    ctx.fill();
    const ex = hx + 0.05, ey = hy - 0.04;
    ctx.strokeStyle = '#2a1e14';
    ctx.lineWidth = 0.018;
    if (o.face === 'dizzy') {
      ctx.beginPath();
      for (let a = 0; a < 9; a += 0.4) ctx.lineTo(ex + Math.cos(a + o.t * 0.3) * a * 0.006, ey + Math.sin(a + o.t * 0.3) * a * 0.006);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(hx + 0.08, hy + 0.06, 0.03, 0.02, 0, 0, TAU);
      ctx.stroke();
    } else if (o.face === 'sheep') {
      // 머쓱: 반쯤 감은 눈이 아래로 슬쩍, 볼 빨개지고 입은 삐뚤, 식은땀 한 방울
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(ex, ey, 0.06, 0.06, 0, 0, TAU);
      ctx.fill();
      ctx.lineWidth = 0.012;
      ctx.stroke();
      ctx.fillStyle = '#1a1410';
      ctx.beginPath();
      ctx.arc(ex - 0.012, ey + 0.026, 0.026, 0, TAU);
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(ex, ey, 0.064, 0.064, 0, 0, TAU);
      ctx.clip();
      ctx.fillStyle = '#86bf4e';
      ctx.fillRect(ex - 0.08, ey - 0.09, 0.16, 0.095);
      ctx.restore();
      ctx.strokeStyle = '#2a1e14';
      ctx.lineWidth = 0.016;
      ctx.beginPath();
      ctx.moveTo(ex - 0.06, ey + 0.004);
      ctx.lineTo(ex + 0.06, ey + 0.004);
      ctx.moveTo(hx + 0.04, hy + 0.06);
      ctx.quadraticCurveTo(hx + 0.065, hy + 0.045, hx + 0.085, hy + 0.062);
      ctx.quadraticCurveTo(hx + 0.1, hy + 0.075, hx + 0.12, hy + 0.055);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,90,110,.7)';
      ctx.beginPath();
      ctx.ellipse(hx - 0.02, hy + 0.03, 0.04, 0.024, 0, 0, TAU);
      ctx.fill();
      sweat(ctx, hx - 0.08, hy - 0.12, 0.045);
    } else if (o.face === 'panic' || o.face === 'strain') {
      // 기겁: 왕눈에 콩알 눈동자, 입 쩍, 눈썹 번쩍 (힘줌은 질끈 감은 눈 ><)
      if (o.face === 'panic') {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(ex, ey - 0.005, 0.078, 0.088, 0, 0, TAU);
        ctx.fill();
        ctx.lineWidth = 0.012;
        ctx.stroke();
        ctx.fillStyle = '#1a1410';
        ctx.beginPath();
        ctx.arc(ex + 0.01, ey, 0.014, 0, TAU);
        ctx.fill();
        sweat(ctx, hx - 0.1, hy - 0.1, 0.05);
        sweat(ctx, hx + 0.13, hy - 0.13, 0.035);
      } else {
        ctx.lineWidth = 0.022;
        ctx.beginPath();
        ctx.moveTo(ex - 0.05, ey - 0.04);
        ctx.lineTo(ex + 0.03, ey);
        ctx.lineTo(ex - 0.05, ey + 0.04);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,90,90,.6)';
        ctx.beginPath();
        ctx.ellipse(hx - 0.01, hy + 0.04, 0.05, 0.03, 0, 0, TAU);
        ctx.fill();
      }
      ctx.strokeStyle = '#2a1e14';
      ctx.lineWidth = 0.016;
      ctx.beginPath();
      ctx.arc(ex, ey - 0.075, 0.05, Math.PI * 1.2, Math.PI * 1.8);
      ctx.stroke();
      ctx.fillStyle = '#5a1e1e';
      ctx.beginPath();
      ctx.ellipse(hx + 0.085, hy + 0.07, o.face === 'panic' ? 0.03 : 0.035, o.face === 'panic' ? 0.04 : 0.012, 0, 0, TAU);
      ctx.fill();
    } else if (o.face === 'smug') {
      ctx.beginPath();
      ctx.arc(ex, ey + 0.015, 0.035, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(hx + 0.04, hy + 0.055);
      ctx.quadraticCurveTo(hx + 0.08, hy + 0.075, hx + 0.12, hy + 0.035);
      ctx.stroke();
    } else {
      const wow = o.face === 'wow', rx = wow ? 0.072 : 0.06, ry = wow ? 0.082 : 0.065;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(ex, ey, rx, ry, 0, 0, TAU);
      ctx.fill();
      ctx.lineWidth = 0.012;
      ctx.stroke();
      ctx.fillStyle = '#1a1410';
      ctx.beginPath();
      ctx.arc(ex + 0.022, ey + (wow ? 0 : 0.014), wow ? 0.024 : 0.032, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex + 0.032, ey - 0.006, 0.01, 0, TAU);
      ctx.fill();
      if (!wow) {
        // 무표정: 눈꺼풀이 반쯤 덮였다 (가끔 느릿하게 꿈뻑)
        const blink = o.t % 200 < 8 ? 0.06 : 0;
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(ex, ey, rx + 0.004, ry + 0.004, 0, 0, TAU);
        ctx.clip();
        ctx.fillStyle = '#86bf4e';
        ctx.fillRect(ex - 0.08, ey - 0.09, 0.16, 0.085 + blink);
        ctx.restore();
        ctx.strokeStyle = '#2a1e14';
        ctx.lineWidth = 0.016;
        ctx.beginPath();
        ctx.moveTo(ex - rx, ey - 0.005 + blink);
        ctx.lineTo(ex + rx, ey - 0.005 + blink);
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
    if (o.shades && o.face !== 'dizzy' && o.face !== 'panic') {
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

/** 판 위 소품 (px,py = 바닥 가운데) */
function drawProp(ctx: CanvasRenderingContext2D, d: Deco, px: number, py: number, S: number, k: number, dusk: number, t: number, lit: boolean) {
  const s = S * d.s;
  const shade = (rx: number) => {
    ctx.fillStyle = 'rgba(40,30,20,.2)';
    ctx.beginPath();
    ctx.ellipse(px - rx * 0.35, py + 1, rx, rx * 0.22, 0, 0, TAU);
    ctx.fill();
  };
  if (d.kind === 0) return drawTree(ctx, px, py, S, k, d.s, dusk);
  if (d.kind === 1) {
    shade(S * 0.25);
    ctx.fillStyle = '#3b3346';
    ctx.fillRect(px - 1.5, py - S * 1.3, 3, S * 1.3);
    ctx.fillStyle = lit ? '#ffd27a' : '#e8dcc0';
    ctx.shadowColor = '#ffb347';
    ctx.shadowBlur = lit ? 16 : 0;
    ctx.beginPath();
    ctx.roundRect(px - 5, py - S * 1.3 - 10, 10, 11, 3);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#3b3346';
    ctx.fillRect(px - 6, py - S * 1.3 - 12, 12, 3);
    return;
  }
  if (d.kind === 2) {
    shade(s * 0.35);
    const col = k === 5 ? ['#f4fbff', '#b9d3e0'] : k === 7 ? ['#4f7a52', '#22382a'] : ['#8fd06a', '#3f8a3a'];
    for (const [dx, dy, r] of [[-0.18, -0.14, 0.17], [0.16, -0.15, 0.18], [0, -0.25, 0.2]] as [number, number, number][]) {
      const g = ctx.createRadialGradient(px + s * (dx + 0.06), py + s * (dy - 0.08), 1, px + s * dx, py + s * dy, s * r);
      g.addColorStop(0, mix(col[0], '#e8a07a', dusk * 0.4));
      g.addColorStop(1, mix(col[1], '#3b2a4a', dusk * 0.5));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px + s * dx, py + s * dy, s * r, 0, TAU);
      ctx.fill();
    }
    if (k !== 5 && k !== 7) for (const [dx, dy] of [[-0.12, -0.25], [0.1, -0.32], [0.2, -0.12]]) (ctx.fillStyle = ['#ff8fb1', '#ffffff', '#ffd23f'][Math.floor(d.x) % 3]), ctx.beginPath(), ctx.arc(px + s * dx, py + s * dy, 1.8, 0, TAU), ctx.fill();
    return;
  }
  if (d.kind === 3) {
    // 연못: 물·연잎·갈대
    const rx = S * 1.3 * d.s, ry = S * 0.28;
    ctx.fillStyle = '#9b8a6a';
    ctx.beginPath();
    ctx.ellipse(px, py, rx + 4, ry + 3, 0, 0, TAU);
    ctx.fill();
    const g = ctx.createLinearGradient(0, py - ry, 0, py + ry);
    g.addColorStop(0, mix('#5fb4e6', '#5a5aa0', dusk));
    g.addColorStop(1, mix('#2f7fc0', '#2d2d6a', dusk));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(px, py, rx, ry, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.5)';
    ctx.lineWidth = 1;
    const rp = (t % 90) / 90;
    ctx.beginPath();
    ctx.ellipse(px + rx * 0.3, py, rx * 0.35 * rp, ry * 0.4 * rp, 0, 0, TAU);
    ctx.stroke();
    for (const [dx, dy] of [[-0.5, -0.2], [0.1, 0.3], [0.55, -0.1]]) {
      ctx.fillStyle = '#4fa84a';
      ctx.beginPath();
      ctx.ellipse(px + rx * dx, py + ry * dy, 6, 2.6, 0, 0.3, TAU - 0.3);
      ctx.lineTo(px + rx * dx, py + ry * dy);
      ctx.fill();
    }
    ctx.fillStyle = '#ff9ec4';
    ctx.beginPath();
    ctx.arc(px + rx * 0.1, py + ry * 0.3 - 2, 2.2, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#6b8a3a';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
      const rx2 = px - rx * 0.95 + i * 3, sw = Math.sin(t / 20 + i) * 1.5;
      ctx.beginPath();
      ctx.moveTo(rx2, py);
      ctx.lineTo(rx2 + sw, py - 12 - (i % 2) * 5);
      ctx.stroke();
    }
    return;
  }
  if (d.kind === 4) {
    // 빨래 마을 오두막 (앞면 + 옆면 + 지붕)
    const wd = s * 0.9, ht = s * 0.7, dp = s * 0.28;
    shade(wd * 0.6);
    ctx.fillStyle = mix('#c9a27a', '#6a5068', dusk * 0.6);
    ctx.beginPath();
    ctx.moveTo(px + wd / 2, py);
    ctx.lineTo(px + wd / 2 + dp, py - dp * 0.7);
    ctx.lineTo(px + wd / 2 + dp, py - ht - dp * 0.7);
    ctx.lineTo(px + wd / 2, py - ht);
    ctx.fill();
    ctx.fillStyle = mix('#f3e3c8', '#8d7090', dusk * 0.6);
    ctx.fillRect(px - wd / 2, py - ht, wd, ht);
    ctx.fillStyle = mix(['#d4614a', '#4a7fc0', '#e0a040'][Math.floor(d.x) % 3], '#4a2a4a', dusk * 0.5);
    ctx.beginPath();
    ctx.moveTo(px - wd / 2 - 4, py - ht);
    ctx.lineTo(px, py - ht - s * 0.45);
    ctx.lineTo(px + dp, py - ht - s * 0.45 - dp * 0.7);
    ctx.lineTo(px + wd / 2 + dp + 4, py - ht - dp * 0.7);
    ctx.lineTo(px + wd / 2 + 4, py - ht);
    ctx.fill();
    ctx.fillStyle = '#7a4e2d';
    ctx.fillRect(px - wd * 0.12, py - ht * 0.55, wd * 0.24, ht * 0.55);
    ctx.fillStyle = lit ? '#ffd36b' : '#9fd3f0';
    if (lit) (ctx.shadowColor = '#ffd36b'), (ctx.shadowBlur = 10);
    ctx.fillRect(px - wd * 0.4, py - ht * 0.75, wd * 0.18, wd * 0.16);
    ctx.fillRect(px + wd * 0.22, py - ht * 0.75, wd * 0.18, wd * 0.16);
    ctx.shadowBlur = 0;
    return;
  }
  if (d.kind === 5) {
    shade(s * 0.3);
    for (const [dy, r] of [[-0.18, 0.2], [-0.48, 0.15], [-0.7, 0.11]]) {
      const g = ctx.createRadialGradient(px + s * 0.05, py + s * (dy - 0.06), 1, px, py + s * dy, s * r);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(1, '#c8dceb');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py + s * dy, s * r, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#222222';
    ctx.fillRect(px - s * 0.06, py - s * 0.74, 2, 2);
    ctx.fillRect(px + s * 0.03, py - s * 0.74, 2, 2);
    ctx.fillStyle = '#ff8a3d';
    ctx.beginPath();
    ctx.moveTo(px, py - s * 0.69);
    ctx.lineTo(px + s * 0.16, py - s * 0.67);
    ctx.lineTo(px, py - s * 0.65);
    ctx.fill();
    ctx.fillStyle = '#d24a3a';
    ctx.fillRect(px - s * 0.13, py - s * 0.6, s * 0.26, 3);
    ctx.strokeStyle = '#6e4529';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px - s * 0.12, py - s * 0.5);
    ctx.lineTo(px - s * 0.32, py - s * 0.62);
    ctx.moveTo(px + s * 0.12, py - s * 0.5);
    ctx.lineTo(px + s * 0.3, py - s * 0.66);
    ctx.stroke();
    return;
  }
  if (d.kind === 6) {
    // 풍차: 바람 언덕에선 날개가 빙빙
    shade(s * 0.4);
    ctx.fillStyle = mix('#f0e2c8', '#7a6a88', dusk * 0.6);
    ctx.beginPath();
    ctx.moveTo(px - s * 0.25, py);
    ctx.lineTo(px - s * 0.14, py - s * 1.3);
    ctx.lineTo(px + s * 0.14, py - s * 1.3);
    ctx.lineTo(px + s * 0.25, py);
    ctx.fill();
    ctx.fillStyle = '#b5523a';
    ctx.beginPath();
    ctx.moveTo(px - s * 0.2, py - s * 1.3);
    ctx.lineTo(px, py - s * 1.55);
    ctx.lineTo(px + s * 0.2, py - s * 1.3);
    ctx.fill();
    ctx.fillStyle = '#7a4e2d';
    ctx.fillRect(px - s * 0.06, py - s * 0.3, s * 0.12, s * 0.3);
    ctx.save();
    ctx.translate(px, py - s * 1.3);
    ctx.rotate(t * 0.06 + d.x);
    for (let i = 0; i < 4; i++) {
      ctx.rotate(TAU / 4);
      ctx.fillStyle = '#fff8ec';
      ctx.fillRect(2, -s * 0.07, s * 0.62, s * 0.14);
      ctx.strokeStyle = '#8a6a4a';
      ctx.lineWidth = 1;
      ctx.strokeRect(2, -s * 0.07, s * 0.62, s * 0.14);
    }
    ctx.restore();
    return;
  }
  // 7: 밤 축제 천막
  const wd = s * 1.0, ht = s * 0.75;
  shade(wd * 0.5);
  ctx.fillStyle = '#5a3a2a';
  ctx.fillRect(px - wd / 2, py - ht * 0.45, wd, ht * 0.45);
  ctx.fillStyle = '#7a4e2d';
  ctx.fillRect(px - wd / 2 - 2, py - ht * 0.48, wd + 4, 4);
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i % 2 ? '#fff3e0' : '#e8453c';
    ctx.beginPath();
    ctx.moveTo(px - wd / 2 + (i / 6) * wd, py - ht);
    ctx.lineTo(px - wd / 2 + ((i + 1) / 6) * wd, py - ht);
    ctx.lineTo(px - wd / 2 + ((i + 1) / 6) * wd, py - ht * 0.78);
    ctx.quadraticCurveTo(px - wd / 2 + ((i + 0.5) / 6) * wd, py - ht * 0.7, px - wd / 2 + (i / 6) * wd, py - ht * 0.78);
    ctx.fill();
  }
  ctx.fillStyle = '#e8453c';
  ctx.beginPath();
  ctx.moveTo(px - wd / 2 - 4, py - ht);
  ctx.lineTo(px, py - ht - s * 0.35);
  ctx.lineTo(px + wd / 2 + 4, py - ht);
  ctx.fill();
  ctx.fillStyle = '#ffd27a';
  ctx.shadowColor = '#ffb347';
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.arc(px - wd * 0.3, py - ht * 0.62, 3.5, 0, TAU);
  ctx.arc(px + wd * 0.3, py - ht * 0.62, 3.5, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;
}

/** 지금 떼면 어떻게 되나 (그리기 전용 흉내 — 시뮬레이션 상태는 건드리지 않는다): 궤적 [x,y,…] · 꽈당 · 회전 수 · 첨벙 · 난간 */
interface Pre { pts: number[]; crash: boolean; spins: number; splash: boolean; rail: boolean }
function preview(s: TurtleState): Pre | null {
  const b0 = s.b;
  if (s.phase !== 'run' || b0.bail || !b0.tuck) return null;
  const b: Body = { ...b0 }, got = s.got.slice(), r: Pre = { pts: [], crash: false, spins: 0, splash: false, rail: false };
  let ct = s.ct;
  for (let i = 0; i < 110; i++) {
    advance(b, s.c, got, false, ++ct, (kind, _x, _y, n) => {
      if (kind === 'bail') r.crash = true;
      else if (kind === 'spin') r.spins = n ?? 0;
      else if (kind === 'splash') r.splash = true;
      else if (kind === 'rail') r.rail = true;
    });
    r.pts.push(b.x, b.y);
    if (r.crash || r.splash || !b.air) break;
  }
  return r;
}

function drawWorld(ctx: CanvasRenderingContext2D, s: TurtleState, w: number, h: number, th: Theme) {
  const fx = juice(s), c = s.c, b = s.b, k = c.k;
  const S = w / 7, U = S * 1.4;
  const camX = b.x - 1.45;
  const yF = h * 0.8, D = h * 0.26, T = h * 0.075, skew = D * 0.42;
  const X = (wx: number, z: number) => (wx - camX) * S + z * skew;
  const Y = (z: number, hg: number) => yF - z * D - hg * S;
  const frac = c.night ? 1 : c.snail ? Math.max(0, s.snailX) / c.len : Math.min(1, s.ct / c.time);
  const dusk = c.night ? 1 : Math.max(0, (frac - 0.45) / 0.55);
  const top = w * 0.12, yBack = yF - D;
  const x0 = Math.max(-0.6, camX - 3), x1 = Math.min(c.len + 4, camX + 10);
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
  // 새 떼 · (바람 언덕) 연
  ctx.strokeStyle = c.night ? 'rgba(200,200,255,.5)' : 'rgba(60,50,70,.6)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    const bx = w + 30 - ((s.t * (0.5 + i * 0.12) + i * 140 + camX * S * 0.05) % (w + 80)), by = top + 50 + i * 16 + Math.sin(s.t / 30 + i) * 6, fl = Math.sin(s.t / 5 + i * 2) * 4;
    ctx.beginPath();
    ctx.moveTo(bx - 6, by - fl);
    ctx.quadraticCurveTo(bx - 3, by - 2, bx, by);
    ctx.quadraticCurveTo(bx + 3, by - 2, bx + 6, by - fl);
    ctx.stroke();
  }
  if (k === 6)
    for (let i = 0; i < 2; i++) {
      const kx = w * (0.3 + i * 0.35) + Math.sin(s.t / 25 + i) * 10, ky = top + 40 + i * 20 + Math.cos(s.t / 20 + i) * 6;
      ctx.fillStyle = i ? '#ff6b6b' : '#ffd23f';
      ctx.beginPath();
      ctx.moveTo(kx, ky - 12);
      ctx.lineTo(kx + 9, ky);
      ctx.lineTo(kx, ky + 14);
      ctx.lineTo(kx - 9, ky);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(kx, ky + 14);
      ctx.quadraticCurveTo(kx - 20, ky + 50, kx - 10 - i * 30, yBack - 10);
      ctx.stroke();
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
  const tb = ctx.createLinearGradient(0, yBack, 0, h);
  tb.addColorStop(0, '#9a6a48');
  tb.addColorStop(0.5, '#7a4e34');
  tb.addColorStop(1, '#3d2519');
  ctx.fillStyle = tb;
  ctx.fillRect(-10, yBack + 3, w + 20, h - yBack + 10);
  ctx.strokeStyle = 'rgba(0,0,0,.12)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 12; i++) {
    const gy = yBack + 8 + i * ((h - yBack) / 12);
    ctx.beginPath();
    ctx.moveTo(0, gy);
    for (let px = 0; px <= w; px += 20) ctx.lineTo(px, gy + Math.sin(px / 40 + i) * 1.5);
    ctx.stroke();
  }
  // 땅 덩어리: 윗면(풀) · 돌길 · 앞면(흙층) · 오른쪽 끝면
  const sx0 = X(-0.6, 0), sx1 = X(c.len + 4, 0);
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.fillRect(sx0 + 6, yF + T, sx1 - sx0, 10);
  ctx.beginPath();
  ctx.moveTo(sx0 - 10, yF + T);
  ctx.lineTo(X(-0.6, 1) - 12, yBack + 6);
  ctx.lineTo(X(-0.6, 1), yBack);
  ctx.lineTo(sx0, yF);
  ctx.fill();
  const tg = ctx.createLinearGradient(0, yBack, 0, yF);
  tg.addColorStop(0, mix(k === 5 ? '#e6f2f6' : k === 6 ? '#b9cf6e' : '#98cf62', '#6c5a7a', dusk * 0.6));
  tg.addColorStop(1, mix(k === 5 ? '#c9dfe8' : k === 6 ? '#93b04c' : '#6fb144', '#4f4060', dusk * 0.6));
  ctx.fillStyle = tg;
  ctx.beginPath();
  ctx.moveTo(X(-0.6, 0), yF);
  ctx.lineTo(X(c.len + 4, 0), yF);
  ctx.lineTo(X(c.len + 4, 1), yBack);
  ctx.lineTo(X(-0.6, 1), yBack);
  ctx.fill();
  // 판 뒤 모서리 (배경 그림과 판이 만나는 곳)
  ctx.strokeStyle = 'rgba(255,255,255,.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(X(-0.6, 1), yBack);
  ctx.lineTo(X(c.len + 4, 1), yBack);
  ctx.stroke();
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
  // 판 위 소품: 뒤 나무·집·풍차 → 울타리 → 연못·덤불·눈사람
  const lit = dusk > 0.35;
  for (const d of c.deco) if (d.z >= 0.95 && d.x > x0 - 1.5 && d.x < x1 + 1) drawProp(ctx, d, X(d.x, d.z), Y(d.z, 0) + 2, S, k, dusk, s.t, lit);
  ctx.strokeStyle = mix('#a77a4f', '#5a4050', dusk * 0.6);
  ctx.fillStyle = mix('#c99a6a', '#6a5060', dusk * 0.6);
  ctx.lineWidth = 2;
  for (let q = Math.max(-0.5, Math.floor(x0 * 2) / 2); q < Math.min(c.len + 4, x1 + 1); q += 0.5) ctx.fillRect(X(q, 0.97) - 1.5, Y(0.97, 0.32), 3, 0.32 * S);
  for (const hg of [0.12, 0.25]) (ctx.beginPath(), ctx.moveTo(X(Math.max(-0.5, x0), 0.97), Y(0.97, hg)), ctx.lineTo(X(Math.min(c.len + 4, x1 + 1), 0.97), Y(0.97, hg)), ctx.stroke());
  for (const d of c.deco) if (d.z < 0.95 && d.x > x0 - 2.5 && d.x < x1 + 1) drawProp(ctx, d, X(d.x, d.z), Y(d.z, 0), S, k, dusk, s.t, lit);
  // 구경꾼: 회전엔 심사위원 점수판, 넘어지면 데굴데굴 배꼽 잡고, 슝 지나가면 바람에 휘청
  // 말풍선·점수판은 맨 나중에 (거북이·빨래에 가리지 않게)
  const talk: (() => void)[] = [];
  const fast = !b.air && !b.bail && b.v > 0.085;
  for (const f of c.fans) {
    if (f.x < x0 || f.x > x1) continue;
    const near = s.events.filter((e) => s.t - e.t < 80 && Math.abs(e.x - f.x) < 4 && FANREACT.has(e.kind)).at(-1);
    const ago = near ? s.t - near.t : 99, v = Math.floor(f.ph * 7) % 3;
    const jump = (near?.kind === 'spin' || near?.kind === 'grind') && ago < 50 ? Math.abs(Math.sin(ago / 5)) * 8 : 0;
    const laugh = near?.kind === 'bail' && f.ph > 2 ? 1 : 0;
    const gap = Math.abs(b.x - f.x), blown = fast && gap < 1.2 ? -0.5 * (1 - gap / 1.2) : 0;
    const px = X(f.x, f.z), py = Y(f.z, 0);
    ctx.fillStyle = 'rgba(30,20,10,.22)';
    ctx.beginPath();
    ctx.ellipse(px - 2, py + 1, 8, 2.5, 0, 0, TAU);
    ctx.fill();
    emo(ctx, f.e, px + laugh * Math.sin(s.t / 3.5) * 3, py - 10 - jump - Math.abs(Math.sin(s.t / 18 + f.ph)) * 1.5, S * 0.46, b.x > f.x, laugh ? Math.sin(s.t / 3.5) * 0.6 : blown);
    if (!near) continue;
    if (near.kind === 'spin') {
      const sc = Math.min(10, Math.max(5, Math.round((5.5 + (near.n ?? 1) * 1.5 + (near.text?.startsWith('아슬') ? 1 : 0) + (v - 1) * 0.5) * 2) / 2));
      talk.push(() => scoreCard(ctx, px, py - 36 - jump, sc));
    }
    else if (ago < (near.kind === 'snail' ? 80 : 55)) {
      const k2 = near.kind;
      const say = k2 === 'bail' ? (laugh ? ['ㅋㅋㅋ', 'ㅋㅋㅋㅋ', '푸핫!'][v] : '헉!') : k2 === 'splash' ? ['꽥!', '시원~', '으악 물!'][v] : k2 === 'pass' ? '오~' : k2 === 'grind' ? ['끼익~', '불꽃!', '와아!'][v] : k2 === 'snail' ? (near.text?.startsWith('느림') ? 'ㅋㅋ 느려~' : '헐 빨라!') : '와아!';
      if (k2 !== 'snail' || ago > 25) talk.push(() => bubble(ctx, px, py - (k2 === 'snail' ? 62 : 34) - jump, say, 12, w));
    }
  }
  // 2판 토끼: 놀리며 앞질러 → 결승 앞에서 낮잠 zZ → 거북이가 슝 지나가면 깜짝 → 쫓아오다 꽈당
  if (s.hare >= 0 && s.hareX > x0 - 1 && s.hareX < x1 + 1) {
    const hz = 0.5, px = X(s.hareX, hz), py = Y(hz, 0), ag = s.t - s.hareT;
    ctx.fillStyle = 'rgba(30,20,10,.25)';
    ctx.beginPath();
    ctx.ellipse(px, py + 1, 11, 2.8, 0, 0, TAU);
    ctx.fill();
    const hop = s.hare === 0 ? Math.abs(Math.sin(s.t / 4)) * 9 : s.hare === 2 ? Math.abs(Math.sin(s.t / 3)) * 11 : s.hare === 3 && ag < 30 ? Math.abs(Math.sin(ag / 5)) * 10 : 0;
    const rot = s.hare === 1 ? -1.35 : s.hare === 3 ? (ag < 30 ? ag * 0.4 : Math.PI) : 0;
    emo(ctx, '🐇', px, py - 11 - hop, S * 0.52, s.hare !== 1, rot);
    if (s.hare === 1) {
      ctx.font = `800 ${Math.max(12, S * 0.24)}px system-ui, sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      for (let i = 0; i < 2; i++) {
        const q = ((s.t / 40 + i * 0.5) % 1);
        ctx.globalAlpha = 1 - q;
        ctx.fillText(i ? 'Z' : 'z', px + 8 + q * 10, py - 26 - q * 18);
      }
      ctx.globalAlpha = 1;
    }
    if (s.hare === 3 && ag >= 30) for (let i = 0; i < 3; i++) (ctx.fillStyle = '#ffd23f'), ctx.fillText('★', px + Math.cos(s.t / 8 + i * 2.1) * 12, py - 22 + Math.sin(s.t / 8 + i * 2.1) * 3);
    const hs = s.events.filter((e) => e.kind === 'hare').at(-1);
    if (hs && s.t - hs.t < 90) talk.push(() => bubble(ctx, px + 34, py - 44 - hop, hs.text!, 12, w));
  }
  // 달팽이 (뒤 산책로) — 거북이가 슝 지나가면 바람에 휙 돌아간다
  if (s.snailX > x0 && s.snailX < x1) {
    const sg = s.t - s.snailT, spun = s.snailPassed === 2 && sg < 36 ? sg : 99;
    const px = X(s.snailX, 0.58), py = Y(0.58, 0) - (spun < 36 ? Math.sin((spun / 36) * Math.PI) * 14 : 0);
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
    emo(ctx, '🐌', px, py - 11, S * 0.42, true, spun < 36 ? spun * 0.53 : 0);
    const said = s.events.filter((e) => e.kind === 'snail').at(-1);
    // 처음 놀리던 말은 거북이가 쏙 숨는 순간 끊긴다 (말풍선끼리 안 겹치게)
    if (said && s.t - said.t < 80 && (s.snailPassed === 2 || !b.tuck)) talk.push(() => bubble(ctx, px + 26, py - 40, said.text!, 12, w));
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
      const cx = X(o.x + o.w / 2, LANE), cy = Y(LANE, 0), rw = o.w * S * 0.72, rh = o.h * S * 1.1;
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
      const hitAgo = s.t - s.lastBail, scared = hitAgo < 60 && Math.abs(b.x - o.x - o.w / 2) < 2 ? 1 - hitAgo / 60 : 0;
      const draw = () => {
        for (let i = 0; i < 4; i++) {
          const dz = zc + (i % 2) * 0.04, px = X(o.x + 0.15 + i * 0.27, dz) + scared * (i - 1.5) * 14, py = Y(dz, 0) - Math.abs(Math.sin(s.t / 6 + i)) * 2 - scared * Math.abs(Math.sin(s.t / 3 + i)) * 16;
          shadowAt(px, py + 2, 6);
          emo(ctx, i === 0 ? '🦆' : '🐥', px, py - (i === 0 ? 10 : 7), S * (i === 0 ? 0.42 : 0.3), moving < 0);
        }
        if (Math.abs(zc - LANE) < 0.2) (ctx.fillStyle = '#ffd23f'), (ctx.font = `900 ${Math.max(14, S * 0.3)}px system-ui`), ctx.fillText('!', X(o.x + o.w / 2, zc), Y(zc, 0) - S * 0.75);
      };
      if (zc > LANE) draw();
      else front.push(draw);
    } else if (o.kind === 'rail') {
      const px0 = X(o.x, LANE), px1 = X(o.x + o.w, LANE), py = Y(LANE, o.h);
      (ctx.fillStyle = 'rgba(30,20,10,.22)'), ctx.fillRect(px0 - 6, Y(LANE, 0) - 1, px1 - px0, 4);
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
      // 빨랫줄: 길 뒤 기둥 둘 사이 줄에 빨래가 낮게 걸려 있다 (빨래는 거북이 앞에 그린다)
      const zp = LANE + 0.17, LH = 1.15, xa = X(o.x - 0.08, zp), xb = X(o.x + o.w + 0.08, zp), yl = Y(zp, LH);
      ctx.strokeStyle = '#7a5232';
      ctx.lineWidth = 3;
      for (const px of [xa, xb]) (ctx.beginPath(), ctx.moveTo(px, Y(zp, 0)), ctx.lineTo(px, yl - 4), ctx.stroke());
      front.push(() => {
        const sway = Math.sin(s.t / 14 + o.x) * 2;
        ctx.strokeStyle = '#f4efe6';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(xa, yl);
        ctx.quadraticCurveTo((xa + xb) / 2, yl + 8, xb, yl);
        ctx.stroke();
        const items = Math.max(3, Math.round(o.w / 0.28));
        for (let i = 0; i < items; i++) {
          const f = (i + 0.5) / items, cx = X(o.x + o.w * f, LANE), lyy = yl + 8 * (1 - (2 * f - 1) ** 2) + 2, bot = Y(LANE, o.h + 0.03 + (i % 2) * 0.05);
          const wd = ((o.w / items) * S) * 0.85, col = ['#fff5e8', '#8fd3ff', '#ff8fb1', '#ffd23f', '#b8ff8a'][(i + Math.floor(o.x)) % 5];
          ctx.fillStyle = col;
          ctx.beginPath();
          if (i % 3 === 1) {
            // 양말
            ctx.moveTo(cx - wd * 0.2, lyy);
            ctx.lineTo(cx + wd * 0.15, lyy);
            ctx.lineTo(cx + wd * 0.15 + sway, bot - wd * 0.25);
            ctx.quadraticCurveTo(cx + wd * 0.5 + sway, bot, cx + wd * 0.1 + sway, bot);
            ctx.lineTo(cx - wd * 0.2 + sway, bot - wd * 0.1);
          } else {
            // 셔츠·수건
            ctx.moveTo(cx - wd / 2, lyy);
            ctx.lineTo(cx + wd / 2, lyy);
            ctx.lineTo(cx + wd / 2 + sway, bot);
            for (let q = 4; q >= 0; q--) ctx.lineTo(cx - wd / 2 + sway + (q / 4) * wd, bot + (q % 2 ? 2.5 : 0));
          }
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = 'rgba(0,0,0,.12)';
          ctx.fillRect(cx - wd / 2 + sway, bot - 4, wd, 3);
          ctx.fillStyle = '#c69c6d';
          ctx.fillRect(cx - 2, lyy - 3, 3, 6);
        }
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
  // 결승 아치: 줄무늬 풍선 기둥 둘 + 체크 현수막
  const fin = c.len, ZA = 0.66, ZB = 0.02, AH = 1.95;
  const pillar = (z: number) => {
    const px = X(fin, z), py = Y(z, 0);
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = i % 2 ? '#ffffff' : '#ff5c6c';
      ctx.beginPath();
      ctx.roundRect(px - S * 0.11, py - ((i + 1) / 7) * AH * S, S * 0.22, (AH * S) / 7 + 1, S * 0.08);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.fillRect(px - S * 0.06, py - AH * S, 3, AH * S);
  };
  if (fin > x0 - 1 && fin < x1 + 1) {
    pillar(ZA);
    front.push(() => {
      pillar(ZB);
      for (let i = 0; i < 10; i++)
        for (let j = 0; j < 2; j++) {
          const z0 = ZA - (i / 10) * (ZA - ZB), z1 = ZA - ((i + 1) / 10) * (ZA - ZB), hg = AH + 0.08 - j * 0.17;
          ctx.fillStyle = (i + j) % 2 ? '#222222' : '#ffffff';
          ctx.beginPath();
          ctx.moveTo(X(fin, z0), Y(z0, hg));
          ctx.lineTo(X(fin, z1), Y(z1, hg));
          ctx.lineTo(X(fin, z1), Y(z1, hg - 0.17));
          ctx.lineTo(X(fin, z0), Y(z0, hg - 0.17));
          ctx.fill();
        }
      const mx = X(fin, (ZA + ZB) / 2), my = Y((ZA + ZB) / 2, AH + 0.5);
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath();
      ctx.roundRect(mx - S * 0.5, my - S * 0.17, S, S * 0.34, 6);
      ctx.fill();
      ctx.fillStyle = '#5a2a10';
      ctx.font = `900 ${Math.max(12, S * 0.24)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('결승!', mx, my + 1);
      emo(ctx, '🎈', X(fin, ZA) + 8, Y(ZA, AH + 0.35) + Math.sin(s.t / 15) * 3, S * 0.35);
      emo(ctx, '🎈', X(fin, ZB) - 6, Y(ZB, AH + 0.3) + Math.cos(s.t / 15) * 3, S * 0.35);
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
  if (b.air && (b.tuck || b.rot < b.rotTo) && !b.bail) {
    // 빙글빙글 회전 자국
    ctx.strokeStyle = 'rgba(255,255,255,.7)';
    ctx.lineCap = 'round';
    for (let i = 0; i < 2; i++) {
      ctx.lineWidth = 3 - i;
      ctx.beginPath();
      ctx.arc(tx, ty - U * 0.24, U * (0.48 + i * 0.1), b.rot - Math.PI * 0.5 + i * Math.PI, b.rot + i * Math.PI);
      ctx.stroke();
    }
  }
  // 지금 떼면? — 누르는 동안 폴짝 궤적·착지(회전 수·꽈당)를 점선으로 미리 보여 준다 (기준 11: 얼마나 누를지 보이게)
  const pre = preview(s);
  if (pre) {
    const n = pre.pts.length / 2;
    for (let i = 2; i < n; i += 3) {
      const px = X(pre.pts[i * 2], LANE), py = Y(LANE, pre.pts[i * 2 + 1]);
      ctx.globalAlpha = 0.35 + 0.5 * (i / n);
      ctx.fillStyle = pre.crash ? '#ff8a7a' : '#ffffff';
      ctx.beginPath();
      ctx.arc(px, py - U * 0.2, 2.2, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    const lx = X(pre.pts[(n - 1) * 2], LANE), ly = Y(LANE, pre.pts[(n - 1) * 2 + 1]);
    const tag = pre.crash ? '✗ 꽈당' : pre.splash ? '첨벙' : pre.spins ? `${pre.spins}회전` : pre.rail ? '갈기!' : '';
    ctx.strokeStyle = pre.crash ? '#ff5c5c' : '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(lx, ly, 9, 3, 0, 0, TAU);
    ctx.stroke();
    if (tag && b.air) {
      ctx.font = `900 ${Math.max(12, S * 0.26)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(40,20,20,.75)';
      ctx.strokeText(tag, lx, ly - 12);
      ctx.fillStyle = pre.crash ? '#ff7a6a' : '#ffd23f';
      ctx.fillText(tag, lx, ly - 12);
    }
  }
  const ch = b.tuck && !b.air && !b.bail && b.rail < 0 ? Math.min(1, b.tt / CHARGE) : 0;
  const face: Face = b.bail ? 'dizzy' : s.t - s.upT < 80 ? 'sheep' : pre?.crash && b.air ? 'panic' : ch >= 1 ? 'strain' : s.phase === 'pause' && s.cleared ? 'smug' : s.t - s.lastTrick < 70 ? 'smug' : (b.air && !b.tuck) || (!b.tuck && b.v > 0.065) ? 'wow' : 'meh';
  const bt = b.bail ? (s.bailWhy === 'flip' ? BAILF : BAIL) - b.bail : 0;
  // 빨랫줄에 걸리면 줄 높이까지 들려 대롱대롱, 오리에게 걸리면 엄마 오리가 콕콕
  const hang = b.bail && s.bailWhy === 'bar' ? (bt < 30 ? 0.62 : Math.max(0, 0.62 * (1 - (bt - 30) / 5))) * S : 0;
  const drawT = () => {
  ctx.save();
  // 걸을 땐 통통 · 껍질 속이 답답해지면 부들부들 떨며 김이 난다 (곧 퐁!) · 꽉 충전되면 바르르
  const stuffy = b.tuck && !b.air && b.tt > 48;
  const shake = stuffy ? Math.sin(s.t * 1.7) * 1.5 : ch >= 1 ? Math.sin(s.t * 2.3) * 0.8 : 0;
  ctx.translate(tx + shake, ty - hang - (!b.tuck && !b.air && !b.bail ? Math.abs(Math.sin(b.x * 9)) * 2 : 0));
  if (stuffy && s.t % 4 === 0) fx.burst(tx - U * 0.05, ty - U * 0.5, 'rgba(255,255,255,.8)', 2, 1.2, 3);
  // 첫 꾹: 바퀴가 헛돌며 흙먼지 펑펑 (부르릉) — 그다음 슝
  const ft = s.events.find((e) => e.kind === 'tuck' && e.text === '쏙! 슝~~');
  if (ft && s.t - ft.t < 16 && b.tuck) (ctx.translate(Math.sin(s.t * 2.9) * 2.5, 0), fx.burst(tx - U * 0.3, gy - 3, s.t % 2 ? '#e6cfa0' : '#c9b08a', 3, 2.6, 3.2));
  drawTurtle(ctx, U, { tuck: b.tuck && !b.bail, rot: b.rot, face, walk: b.x * 9, ice, sock: s.t - s.sock < 420, shades: b.combo >= 3, bail: b.bail, t: s.t, why: s.bailWhy, bt, ch });
  ctx.restore();
  };
  // 빨랫줄에 걸려 대롱대롱일 땐 빨래 앞에 (보이게)
  if (!hang) drawT();
  if (b.bail && s.bailWhy === 'duck') {
    // 엄마 오리 출동: 뒤집힌 거북이 배를 콕콕
    const peck = Math.max(0, Math.sin(bt * 0.5)), dx = tx + U * 0.42, dy = ty - U * 0.2;
    emo(ctx, '🦆', dx, dy - U * 0.1, S * 0.5, true, -peck * 0.6);
    if (fx.delta('peck', Math.floor(bt / 13)) > 0) fx.pop(dx - U * 0.2, dy - U * 0.45, '콕!', '#ffe08a', 13);
  }
  if (b.bail && s.bailWhy === 'rail' && bt < 22 && bt % 3 === 0) fx.burst(tx + U * 0.3, ty - U * 0.3, '#e8eef5', 2, 2, 1.5);
  if (b.bail)
    for (let i = 0; i < 3; i++) {
      const a = s.t / 8 + (i * TAU) / 3;
      ctx.fillStyle = '#ffd23f';
      ctx.font = `900 ${Math.max(12, S * 0.22)}px system-ui`;
      ctx.fillText('★', tx + Math.cos(a) * U * 0.38, ty - hang - U * 0.6 + Math.sin(a) * U * 0.1);
    }
  // 거북이의 한마디 (무표정하게 태연한 척)
  const said = s.events.filter((e) => e.kind === 'say').at(-1);
  if (said && s.t - said.t < 85 && !b.bail) talk.push(() => bubble(ctx, tx - U * 0.3, ty - hang - U * (b.tuck ? 0.75 : 1.02), said.text!, 13, w));
  if (b.combo >= 2 && !b.bail && !(said && s.t - said.t < 85)) {
    ctx.font = `900 ${Math.max(12, S * 0.22)}px system-ui, sans-serif`;
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
  if (hang) drawT();
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
    ctx.fillStyle = 'rgba(8,10,40,.36)';
    ctx.fillRect(-10, -10, w + 20, h + 20);
    ctx.globalCompositeOperation = 'lighter';
    const glow = (gx: number, gyy: number, r: number, a: number) => {
      const lg = ctx.createRadialGradient(gx, gyy, 0, gx, gyy, r);
      lg.addColorStop(0, `rgba(255,190,90,${a})`);
      lg.addColorStop(1, 'rgba(255,190,90,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(gx - r, gyy - r, r * 2, r * 2);
    };
    for (const d of c.deco)
      if ((d.kind === 1 || d.kind === 7) && d.x > x0 - 2 && d.x < x1 + 2) (glow(X(d.x, 1), Y(1, d.kind === 1 ? 1.3 : 0.5), S * 1.4, 0.4), glow(X(d.x, LANE), Y(LANE, 0), S * 1.3, 0.22));
    glow(tx + U * 0.3, ty - U * 0.3, S * 2, 0.3);
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
  const vg = ctx.createRadialGradient(w / 2, h * 0.55, h * 0.35, w / 2, h * 0.55, h * 0.8);
  vg.addColorStop(0, 'rgba(30,10,25,0)');
  vg.addColorStop(1, 'rgba(30,10,25,.38)');
  ctx.fillStyle = vg;
  ctx.fillRect(-10, -10, w + 20, h + 20);
  for (const f of talk) f();
  // 사건 → 연출
  const seenT = fx.memo.t ?? -1;
  /** 거북이 근처 글자는 겹치지 않게 위로 쌓는다 */
  const say = (x: number, y: number, text: string, color: string, size: number) => {
    const slot = (fx.memo.pt ?? -99) > s.t - 24 ? ((fx.memo.ps ?? 0) + 1) % 4 : 0;
    fx.memo.pt = s.t;
    fx.memo.ps = slot;
    fx.pop(Math.max(w * 0.32, Math.min(w * 0.68, x)), y - slot * size * 1.15, text, color, size);
  };
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const ex = X(e.x, LANE), ey = Y(LANE, e.y);
    if (e.kind === 'tuck') {
      const big = e.text === '쏙! 슝~~';
      if (e.text) (say(ex + (big ? U * 0.6 : 0), ey - U * (big ? 1.25 : 0.7), e.text, '#ffffff', big ? 26 : 20), fx.ring(ex, ey - U * 0.2, '#ffffff', U * (big ? 1.3 : 0.7), big ? 5 : 3));
      fx.burst(ex - U * 0.35, ey - 3, '#e6cfa0', big ? 26 : 10, big ? 4 : 2.5, big ? 3.5 : 2.5);
      fx.kick(big ? 6 : 2);
    }
    if (e.kind === 'hop') {
      fx.burst(ex, ey - 2, '#f0dfb8', 7 + Math.min(1, (e.n ?? 0) / CHARGE) * 10, 1.8 + Math.min(1, (e.n ?? 0) / CHARGE) * 1.5, 2);
      if (e.text) (say(ex, ey - U * 0.8, e.text, '#fff3c4', e.text === '뿅!' ? 20 : 17), e.text === '폴짜악!' && fx.ring(ex, ey, '#fff3c4', U * 0.8, 3));
    }
    if (e.kind === 'stuffy') (say(ex, ey - U * 0.9, e.text!, '#ffe0a8', 15), fx.burst(ex + U * 0.3, ey - U * 0.3, '#ffffff', 10, 2.5, 2));
    if (e.kind === 'launch') (fx.ring(ex, ey, '#fff3c4', U * 0.6, 3), fx.burst(ex, ey, '#f0dfb8', 8, 2.5, 2));
    if (e.kind === 'land') fx.burst(ex, ey - 2, '#f0dfb8', 8, 2, 2);
    if (e.kind === 'spin') (say(ex, ey - U * 1.1, e.text!, '#ffd23f', 18 + (e.n ?? 1) * 3), fx.ring(ex, ey - U * 0.3, '#ffd23f', U * (0.8 + (e.n ?? 1) * 0.3), 4), fx.burst(ex, ey - U * 0.3, '#fff2a8', 18 + (e.n ?? 1) * 8, 4, 2.5), fx.kick(3 + (e.n ?? 1)), (e.n ?? 1) >= 2 && fx.blink('#fff3c4', 0.18));
    if (e.kind === 'bail' && e.text!.startsWith('꽥')) (fx.burst(ex + U * 0.3, ey - U * 0.3, '#ffffff', 16, 4, 2.5), fx.burst(ex + U * 0.3, ey - U * 0.3, '#ffd23f', 10, 3.5, 2));
    if (e.kind === 'bail') (say(ex, ey - U * 0.95, e.text!, '#ff8a7a', 20), fx.burst(ex, ey - U * 0.2, '#c8a07a', 16, 3.5, 3), fx.burst(ex, ey - U * 0.4, '#ffffff', 10, 3, 2), fx.kick(9), fx.blink(th.hot, 0.12));
    if (e.kind === 'berry') (fx.pop(ex + 6, Math.min(ey, Y(LANE, b.y)) - U * 0.8, e.text!, '#ff8aa0', 12), fx.burst(ex, ey, '#ff4d6d', 8, 2, 2));
    if (e.kind === 'splash') (fx.pop(ex, ey - U * 0.6, e.text!, '#8fd3ff', 17), fx.burst(ex, ey - 4, '#9fd8ff', 26, 3.5, 3), fx.ring(ex, ey, '#cfefff', U * 0.9, 3), fx.kick(4));
    if (e.kind === 'pass') e.text!.startsWith('+') ? fx.pop(ex + 8, ey - U * 0.5, e.text!, '#ffffff', 12) : say(ex + U * 0.3, ey - U * 0.6, e.text!, '#ffffff', 14);
    if (e.kind === 'grind') (say(ex, ey - U * 0.9, e.text!, '#ffb347', 16), fx.burst(ex, ey, '#ffcf4a', 16, 3, 2));
    if (e.kind === 'rail') fx.burst(ex, ey, '#ffcf4a', 12, 3, 2);
    if (e.kind === 'combo') (say(ex, ey - U * 1.1, e.text!, '#b8ff8a', 17), fx.ring(ex, ey - U * 0.3, '#b8ff8a', U * 1.2, 3));
    if (e.kind === 'course') fx.pop(w / 2, h * 0.48, e.text!, '#ffffff', 22);
    if (e.kind === 'clear') {
      fx.pop(w / 2, h * 0.32, e.text!, '#ffd23f', 26);
      for (const [cx, col] of [[0.25, '#ff6b6b'], [0.5, '#ffd23f'], [0.75, '#7ed957'], [0.4, '#6cc6ff'], [0.6, '#ff8fb1']] as [number, string][]) fx.burst(w * cx, h * 0.3, col, 22, 5.5, 3);
      fx.blink('#fff6c8', 0.25);
    }
    if (e.kind === 'bonus') fx.pop(w / 2, h * 0.39, e.text!, '#ffffff', 15);
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
  const F = (q: number) => Math.max(12, S * q);
  ctx.font = `900 ${F(0.27)}px system-ui, sans-serif`;
  ctx.fillText(`🐢 ${s.k + 1}/${COURSES}판 · ${c.name}`, 10, hb * 0.3);
  ctx.textAlign = 'right';
  ctx.fillStyle = th.hot;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - 10, hb * 0.3);
  ctx.textAlign = 'left';
  ctx.font = `800 ${F(0.23)}px system-ui, sans-serif`;
  const nb = c.berries.length;
  let gotB = 0;
  for (let i = 0; i < nb; i++) gotB += s.got[i] ? 1 : 0;
  ctx.fillStyle = th.soft;
  ctx.fillText(`🍓 ${gotB}/${nb}  ⭐ ${s.stars}  점수 ${turtle.score(s)}`, 10, hb * 0.74);
  ctx.textAlign = 'right';
  const left = Math.max(0, timeLeft(s) / 60);
  ctx.fillStyle = left < 6 && s.phase === 'run' ? th.hot : th.ink;
  ctx.fillText(c.snail ? `🐌 라이벌 ${Math.round((Math.max(0, s.snailX) / c.len) * 100)}%` : `${c.night ? '🌙' : '☀️'} ${Math.ceil(left)}초`, w - 10, hb * 0.74);
  // 아래 띠: 코스 지도 + 별 점수 막대 (글자 12px 이상이라 세 줄로)
  const bb = h - Math.max(46, w * 0.135);
  ctx.fillStyle = 'rgba(40,22,30,.72)';
  ctx.fillRect(0, bb, w, h - bb);
  const mx0 = 22, mx1 = w - 22, my = bb + 10;
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
  // 이번 판 점수 막대: 왼쪽에 점수, 막대 위 ★★·★★★ 표 (숫자 대신 표만 — 좁은 화면에서 안 겹치게)
  ctx.font = `900 13px system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  const py2 = h - 13, bx0 = mx0 + Math.max(46, ctx.measureText(`${s.cpts}점`).width + 8), pw = mx1 - bx0, pf = Math.min(1, s.cpts / (c.t3 * 1.15));
  ctx.fillText(`${s.cpts}점`, mx0 - 12, py2);
  ctx.fillStyle = 'rgba(255,255,255,.15)';
  ctx.beginPath();
  ctx.roundRect(bx0, py2 - 4, pw, 8, 4);
  ctx.fill();
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  ctx.roundRect(bx0, py2 - 4, Math.max(8, pw * pf), 8, 4);
  ctx.fill();
  ctx.font = `900 12px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  for (const [v, lab] of [[c.t2, '★★'], [c.t3, '★★★']] as [number, string][]) {
    const qx = bx0 + pw * Math.min(1, v / (c.t3 * 1.15)), on = s.cpts >= v, tw = ctx.measureText(lab).width + 8;
    ctx.fillStyle = on ? '#ffd23f' : 'rgba(70,45,55,.95)';
    ctx.strokeStyle = on ? '#fff3c4' : 'rgba(255,255,255,.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(qx - tw / 2, py2 - 8, tw, 16, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = on ? '#5a2a10' : '#ffffff';
    ctx.fillText(lab, qx, py2 + 1);
  }
  // 첫 안내
  /** 안내 상자 (두 줄, 화면 위 하늘 자리) — 돌려주는 값은 상자 아래 끝 */
  const hintBox = (y: number, t1: string, t2?: string, a = 1) => {
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.font = `900 ${F(0.27)}px system-ui, sans-serif`;
    const w1 = ctx.measureText(t1).width;
    ctx.font = `800 ${F(0.23)}px system-ui, sans-serif`;
    const tw = Math.min(w - 8, Math.max(w1, t2 ? ctx.measureText(t2).width : 0) + 24), hh = t2 ? F(0.27) + F(0.23) + 18 : F(0.27) + 14;
    ctx.fillStyle = 'rgba(40,22,30,.74)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw / 2, y, tw, hh, 12);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${F(0.27)}px system-ui, sans-serif`;
    ctx.fillText(t1, w / 2, y + 7 + F(0.27) / 2);
    if (t2) (ctx.fillStyle = '#ffe0a8'), (ctx.font = `800 ${F(0.23)}px system-ui, sans-serif`), ctx.fillText(t2, w / 2, y + 11 + F(0.27) + F(0.23) / 2);
    ctx.globalAlpha = 1;
    return y + hh + 6;
  };
  let hy = top + 8;
  if (s.phase === 'run' && k === 0 && (s.tucks === 0 || s.hops === 0) && s.ct > 10) hy = hintBox(hy, '👆 꾹 누르면 등껍질에 쏙 — 슝~', '떼면 폴짝! 오래 누를수록 높이');
  else if (s.phase === 'run' && k === 1 && s.ct < 420 && s.ct > 30) hy = hintBox(hy, '🛹 날면서 꾹 = 빙글빙글 회전!', '점선 끝에 ✗ 꽈당이 뜨기 전에 떼요');
  // 새로 나온 것 (3초 동안 상자로)
  const nw = s.events.filter((e) => e.kind === 'new').at(-1);
  if (nw && s.t - nw.t < 200 && s.phase === 'run') {
    const [t1, t2] = nw.text!.split(' — ');
    hintBox(hy, t1, t2, Math.min(1, (200 - (s.t - nw.t)) / 30, (s.t - nw.t) / 8));
  }
  if (s.phase === 'pause') {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(40,22,30,.6)';
    ctx.beginPath();
    ctx.roundRect(w * 0.12, top + 10, w * 0.76, 30, 12);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 ${F(0.22)}px system-ui, sans-serif`;
    ctx.fillText(s.cleared ? (s.k === COURSES - 1 ? '🏆 8코스 완주! 거북이 전설' : `다음: ${s.k + 2}판 ${NAMES[s.k + 1]}`) : `♥ ${s.hearts} — 같은 코스 다시!`, w / 2, top + 25);
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
  let pts = 0, ct = s.ct, bad = 0, pb = b.bail;
  for (let i = 0; i < HZ; i++) {
    pts += advance(b, c, got, seq[i] === 1, ++ct);
    if (b.bail > pb) {
      bad = 1;
      break;
    }
    pb = b.bail;
  }
  // 공중이면 떼고 착지까지 확인
  for (let i = 0; !bad && i < 50 && b.air; i++) {
    pts += advance(b, c, got, false, ++ct);
    if (b.bail > pb) bad = 1;
    pb = b.bail;
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
