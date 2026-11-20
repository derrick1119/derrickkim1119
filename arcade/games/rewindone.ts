/**
 * ⏪ 한 물건만 되감기 (38라운드: 오너가 고른 아이디어를 깊게 — 톡) — 한 물건만 되감기 × 깊어지는 판 × 도감(복원).
 * 세상은 저절로 앞으로 흐른다: 다리가 무너지고, 화분이 떨어져 깨지고, 술통이 굴러오고, 도깨비가 화살을 쏘고,
 *   뗏목이 떠내려가고, 물탱크가 터지고, 풍선이 고양이를 싣고 날아간다.
 * 손짓 하나(톡): 물건을 톡 하면 **그 물건 하나만** 자기 시간이 거꾸로 감긴다 — 지나온 길을 그대로 되짚는다
 *   (조각이 모여 붙고, 술통이 비탈을 거슬러 오르고, 화살이 쏜 도깨비에게 돌아간다). 다른 것은 계속 앞으로 → 엇갈림.
 *   다시 톡 하면 그 자리에서 멈춰 잠깐 쉬었다가 다시 앞으로. 제자리까지 되감으면: 주인이 있으면 받아 들고(영영 해결),
 *   없으면 잠깐 쉬었다가 같은 일이 다시 벌어진다. 되감는 동안 모래시계 모래가 준다.
 * 판 목표: 꼬마 시계공(부엉이)이 저절로 걸어가 시계 부품에 닿게. 별: 부품까지 · 아무도 안 다치게(또는 구하기) · 되감기 N초 안에.
 * 더 하고 싶게: 판을 깨면 부품이 시계탑으로 날아가 마을이 하나씩 복원된다(분수 → 꽃 → 가로등 → 풍차 → 물레방아 …
 *   → 시계 바늘). 다음 판의 새 장치와 다음 복원이 결과 화면에 미리 보인다. 장 셋(장터 · 강가 · 시계탑) × 판 넷.
 * 결정적: 모든 물건은 '자기 시간 τ'의 함수로만 움직인다(같은 τ → 같은 자세). 되감기 = τ가 거꾸로. 봇·미리 보기가 같은 세계를 돌린다.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

// ───────────────────────────── 화면·세계 상수 ─────────────────────────────
/** 화면 세로 ÷ 가로 */
const A = 1.5;
/** 위 띠 높이(폭 단위) — 세계 y=0이 화면 TOPH */
const TOPH = 0.085;
/** 세계 y가 이 아래면 아래 띠 */
const BOTY = 1.2;
/** 걷는 속도 · 한 발 높이(넘을 수 있는 단차) · 중력 · 되감기 속도(자기 시간 틱/틱) */
const V = 0.0034, STEP = 0.03, G = 0.0009, RW = 2;
/** 제자리까지 되감은 뒤 쉬는 틱 · 다시 톡으로 멈춘 뒤 쉬는 틱 · 멈출 때 '걸림 자리'로 붙는 거리(τ) */
const HOLD_FULL = 150, HOLD_STOP = 120, SNAP = 90;
/** 주인공 몸(발에서 위로) · 반지름 */
const HCY = 0.05, HR = 0.036;
/** 톡이 물건을 잡는 거리 */
const TAP_R = 0.13;

type Kind = 'bridge' | 'pot' | 'barrel' | 'arrow' | 'raft' | 'log' | 'water' | 'balloon' | 'crate' | 'gear';
const WAIT = 0, FWD = 1, REW = 2, HOLD = 3, DONE = 4;

export interface Thing {
  id: number; k: Kind;
  /** 자기 시간 · 길의 끝 · 상태 · 쉬는 틱 */
  tau: number; dur: number; st: number; hold: number;
  /** 주인(배우 id, 없으면 -1) · 태운 배우 · 멈출 때 붙는 자리(τ, 없으면 -1) */
  owner: number; rider: number; dock: number;
  x: number; y: number; x2: number; y2: number; w: number; h: number; n: number;
  /** 구르는 것: τ마다 [x, y, 회전] */
  path: Float32Array | null;
  /** 크기(소리 높낮이) · 처음 움직인 틱 · 태어난 틱 · 부딪히면 다치나(0 = 물에 뜬 빈 통처럼 괜찮음) */
  big: number; moved: number; born: number; harm: number;
}

/** 배우 종류 · 역할 */
type AK = 'grandma' | 'farmer' | 'kid' | 'cat' | 'beaver' | 'mole' | 'goblin' | 'walker' | 'mom' | 'machine' | 'duck';
const R_DECO = 0, R_VILL = 1, R_ARCH = 2, R_WALK = 3, R_RIDER = 4;
export interface Actor {
  id: number; k: AK; role: number; x: number; y: number; x0: number; x1: number; vx: number;
  ride: number; ko: boolean; hurt: boolean; saved: boolean; t: number;
  /** 활: 다음 쏠 틱 · 간격 · 쏜 수 · 과녁(0 주인공, 1 마을 사람 번갈아) */
  next: number; per: number; shots: number; alt: number; pause: number;
}

const H_IDLE = 0, H_WALK = 1, H_WAIT = 2, H_FALL = 3, H_FAIL = 4, H_WIN = 5;
export interface Hero { x: number; y: number; st: number; on: number; vy: number; t: number; delay: number; waitT: number; why: string; fallY: number }

// ───────────────────────────── 판 정의 ─────────────────────────────
type Key = 'bridge' | 'pot' | 'barrel' | 'arrow' | 'raft' | 'log' | 'water' | 'balloon' | 'crate' | 'gear' | 'cross' | 'grand';
type StarK = 'goal' | 'sand' | 'safe' | 'rescue';
interface StageDef { key: Key; ch: number; name: string; news: string; hint: string; stars: StarK[]; fix: string; spot: string }
export const STAGES: StageDef[] = [
  { key: 'bridge', ch: 0, name: '무너진 다리', news: '', hint: '다리를 톡! 다리만 시간이 거꾸로', stars: ['goal'], fix: '분수', spot: '' },
  { key: 'pot', ch: 0, name: '떨어진 화분', news: '제자리까지 되감으면 주인이 받아 들어요', hint: '깨진 화분을 톡 — 할머니 손으로 쏙', stars: ['goal', 'sand'], fix: '꽃 화단', spot: '할머니' },
  { key: 'barrel', ch: 0, name: '굴러오는 술통', news: '굴러오는 통 — 위험한 것만 골라 되감아요', hint: '점선을 봐요: 누구에게 굴러가나?', stars: ['goal', 'safe', 'sand'], fix: '가로등', spot: '술통 수레' },
  { key: 'arrow', ch: 0, name: '도깨비 화살', news: '날아간 화살을 되감으면 쏜 도깨비가 뿅!', hint: '화살을 톡 — 도깨비에게 돌아가요', stars: ['goal', 'safe', 'sand'], fix: '풍차', spot: '도깨비' },
  { key: 'raft', ch: 1, name: '떠내려간 뗏목', news: '뗏목을 되감으면 탄 아이도 함께 돌아와요', hint: '폭포에 닿기 전에 뗏목을 톡', stars: ['goal', 'rescue', 'sand'], fix: '물레방아', spot: '뗏목' },
  { key: 'log', ch: 1, name: '통나무 다리', news: '되감는 중에 다시 톡 — 그 자리에 멈춰요', hint: '통나무가 강을 가로지를 때 다시 톡!', stars: ['goal', 'safe', 'sand'], fix: '나룻배', spot: '말뚝' },
  { key: 'water', ch: 1, name: '터진 물탱크', news: '쏟아진 물도 거꾸로 — 물탱크로 쏙', hint: '물이 차기 전에 물탱크를 톡', stars: ['goal', 'safe', 'sand'], fix: '새 떼', spot: '물탱크' },
  { key: 'balloon', ch: 1, name: '날아간 고양이', news: '날아가는 풍선을 되감아 고양이를 내려요', hint: '풍선을 톡 — 아이 품으로', stars: ['goal', 'rescue', 'sand'], fix: '무지개', spot: '풍선' },
  { key: 'crate', ch: 2, name: '상자 승강기', news: '올라탄 채로 되감으면 같이 올라가요', hint: '부엉이가 상자에 타면 톡!', stars: ['goal', 'safe', 'sand'], fix: '숫자판', spot: '상자' },
  { key: 'gear', ch: 2, name: '굴러간 톱니', news: '톱니를 되감아 끼우면 기계가 움직여요', hint: '거꾸로 구르는 톱니에 부딪히지 않게', stars: ['goal', 'safe', 'sand'], fix: '큰 톱니', spot: '톱니 기계' },
  { key: 'cross', ch: 2, name: '하나씩만', news: '되감기는 한 번에 하나 — 순서가 중요해요', hint: '상자를 올리는 동안엔 화살을 못 돌려요', stars: ['goal', 'safe', 'sand'], fix: '큰 종', spot: '도깨비' },
  { key: 'grand', ch: 2, name: '시계탑 꼭대기', news: '마지막 — 전부 다 나와요', hint: '무엇부터 되감을지 차례를 봐요', stars: ['goal', 'safe', 'sand'], fix: '시계 바늘', spot: '' },
];
export const STAGE_COUNT = STAGES.length;
const CH_NAME = ['장터', '강가', '시계탑'];
const CH_SUB = ['부서진 것을 되돌려요', '떠내려간 것을 되돌려요', '거꾸로 타고 올라가요'];

export interface Level {
  key: Key; ch: number; ground: number[]; things: Thing[]; actors: Actor[]; sand: number; par: number; stars: StarK[];
  gearX: number; gearY: number; heroX: number; heroY: number; heroDelay: number; fallY: number;
  /** 물길(세로 강·도랑) · 마른 웅덩이 · 승강기 구멍 · 도개교(기계가 움직이면 내려옴) */
  canal: [number, number] | null; basin: [number, number] | null; shaft: [number, number, number, number] | null; gate: [number, number, number] | null;
  /** 판 장식(골목·수레·발코니·탑 위치) */
  deco: Record<string, number>;
}

// ───────────────────────────── 물건의 자세 (τ의 함수) ─────────────────────────────
/** 자세 한 벌(전역 하나를 돌려쓴다 — 할당 없음) */
const P = { x: 0, y: 0, a: 0, s: 0 };
const smooth = (q: number) => (q <= 0 ? 0 : q >= 1 ? 1 : q * q * (3 - 2 * q));
// 다리
const BR_FALL0 = 14, BR_GAP = 7, BR_DEPTH = 0.13;
const brFall = (i: number) => BR_FALL0 + i * BR_GAP;
const brLand = Math.sqrt((2 * BR_DEPTH) / G);
/** 다리 판자 i의 처짐·기울기 */
function plank(th: Thing, i: number, tau: number) {
  const pw = (th.x2 - th.x) / th.n, cx = th.x + (i + 0.5) * pw;
  P.x = cx;
  P.y = th.y;
  P.a = 0;
  const f = brFall(i);
  if (tau < f) {
    if (tau > 0) P.a = Math.sin(tau * 1.9 + i) * 0.03 * (tau / f), (P.y += Math.abs(Math.sin(tau * 2.3 + i)) * 0.003);
    return P;
  }
  const dt = tau - f, sg = i % 2 ? 1 : -1;
  if (dt < brLand) {
    P.y += 0.5 * G * dt * dt;
    P.a = sg * 0.07 * dt;
    P.x += sg * 0.0008 * dt;
  } else {
    const fl = dt - brLand;
    P.y += BR_DEPTH + fl * 0.0007 + Math.sin(fl * 0.2 + i) * 0.004;
    P.a = sg * (0.07 * brLand + fl * 0.004);
    P.x += sg * 0.0008 * brLand;
  }
  return P;
}
// 화분
const POT_TT = 40;
const potFall = (th: Thing) => Math.sqrt((2 * (th.y2 - th.y)) / G);
const potHit = (th: Thing) => POT_TT + potFall(th);
// 뗏목·통나무 흘러가기
const RAFT_V = 0.0009, LOG_V = 0.0008;
const LOG_CHOP = 44, LOG_FALL = 30, LOG_LIE = LOG_CHOP + LOG_FALL;
// 물탱크
const WAT_CRACK = 16, WAT_FILL = 84;
const water = (_th: Thing, tau: number) => smooth((tau - WAT_CRACK) / WAT_FILL);
// 상자
const CR_FRAY = 24;
const crFall = (th: Thing) => Math.sqrt((2 * (th.y2 - th.y)) / G);
// 풍선
const BAL_V = 0.0011;

/** 물건의 대표 자세(톡 잡기·위험·그리기) */
function pose(th: Thing, tau: number) {
  P.a = 0;
  P.s = 1;
  switch (th.k) {
    case 'bridge': {
      // 가운데 판자들의 평균
      let sx = 0, sy = 0;
      for (let i = 0; i < th.n; i++) (plank(th, i, tau), (sx += P.x), (sy += P.y));
      P.x = sx / th.n;
      P.y = sy / th.n + 0.01;
      P.a = 0;
      break;
    }
    case 'pot': {
      P.x = th.x;
      if (tau <= POT_TT) {
        P.y = th.y - 0.035;
        P.a = Math.sin(tau * 0.42) * 0.32 * (tau / POT_TT);
      } else {
        const dt = tau - POT_TT, ft = potFall(th);
        if (dt < ft) {
          P.y = th.y - 0.035 + 0.5 * G * dt * dt;
          P.a = 0.32 + dt * 0.12;
        } else (P.y = th.y2 - 0.02), (P.a = 0);
      }
      break;
    }
    case 'barrel':
    case 'gear': {
      const p = th.path!, n = p.length / 3 - 1, i = Math.max(0, Math.min(n, Math.floor(tau)));
      P.x = p[i * 3];
      P.y = p[i * 3 + 1];
      P.a = p[i * 3 + 2];
      break;
    }
    case 'arrow': {
      const q = Math.min(1, tau / th.n);
      P.x = th.x + (th.x2 - th.x) * q;
      P.y = th.y + (th.y2 - th.y) * q - th.h * 4 * q * (1 - q);
      const dx = (th.x2 - th.x) / th.n, dy = (th.y2 - th.y) / th.n - (th.h * 4 * (1 - 2 * q)) / th.n;
      P.a = Math.atan2(dy, dx);
      break;
    }
    case 'raft': {
      P.x = th.x + Math.sin(tau * 0.05) * 0.004;
      P.y = th.y + RAFT_V * tau;
      P.a = Math.sin(tau * 0.07) * 0.03;
      break;
    }
    case 'log': {
      if (tau < LOG_CHOP) {
        P.x = th.x;
        P.y = th.y;
        P.a = tau > 4 ? Math.sin(tau * 1.3) * 0.025 : 0;
      } else if (tau < LOG_LIE) {
        const q = (tau - LOG_CHOP) / LOG_FALL;
        P.x = th.x;
        P.y = th.y;
        P.a = (Math.PI / 2) * q * q;
      } else {
        P.x = th.x;
        P.y = th.y + LOG_V * (tau - LOG_LIE);
        P.a = Math.PI / 2 + Math.sin((tau - LOG_LIE) * 0.04) * 0.02;
      }
      break;
    }
    case 'water': {
      P.x = (th.x2 + th.y2) / 2;
      P.y = LYof(th);
      P.s = water(th, tau);
      break;
    }
    case 'balloon': {
      const d = tau;
      P.x = th.x + d * 0.0009 + Math.sin(d * 0.045) * 0.02;
      P.y = th.y - d * BAL_V - Math.min(d, 20) * 0.0006;
      P.a = Math.sin(d * 0.06) * 0.15;
      break;
    }
    case 'crate': {
      P.x = th.x;
      if (tau <= CR_FRAY) (P.y = th.y), (P.a = Math.sin(tau * 0.8) * 0.04 * (tau / CR_FRAY));
      else {
        const dt = tau - CR_FRAY, ft = crFall(th);
        P.y = dt < ft ? th.y + 0.5 * G * dt * dt : th.y2;
        P.a = 0;
      }
      break;
    }
  }
  return P;
}
const LYof = (th: Thing) => th.h;

// ───────────────────────────── 세계 ─────────────────────────────
export interface World {
  t: number; L: Level; th: Thing[]; ac: Actor[]; hero: Hero; sand: number; used: number; rew: number; nid: number;
  hurt: number; saved: number; ko: number; mach: number; taps: number;
}
interface Ev { t: number; kind: string; x: number; y: number; v: number; id: number; text?: string }
type Sink = ((kind: string, x: number, y: number, v?: number, id?: number) => void) | null;

const cloneT = (q: Thing): Thing => ({ ...q });
const cloneA = (q: Actor): Actor => ({ ...q });
export function cloneWorld(W: World): World {
  return { ...W, th: W.th.map(cloneT), ac: W.ac.map(cloneA), hero: { ...W.hero } };
}
function newWorld(L: Level): World {
  const W: World = {
    t: 0, L, th: L.things.map(cloneT), ac: L.actors.map(cloneA), sand: L.sand, used: 0, rew: -1, nid: 100, hurt: 0, saved: 0, ko: 0, mach: -1, taps: 0,
    hero: { x: L.heroX, y: L.heroY, st: H_IDLE, on: -1, vy: 0, t: 0, delay: L.heroDelay, waitT: 0, why: '', fallY: L.fallY },
  };
  return W;
}
const thingOf = (W: World, id: number) => W.th.find((q) => q.id === id);
const actorOf = (W: World, id: number) => W.ac.find((q) => q.id === id);

/** 화분 조각·홍수가 막는 길 [x0, x1, y] */
function blockOf(th: Thing): [number, number, number] | null {
  if (th.st === DONE) return null;
  if (th.k === 'pot' && th.tau >= potHit(th) - 1) return [th.x - 0.065, th.x + 0.065, th.y2];
  if (th.k === 'water' && water(th, th.tau) > 0.18) return [th.x2, th.y2, th.h];
  return null;
}
/** 위험한 동그라미(움직이는 동안) — 앞으로든 거꾸로든 */
const D = { x: 0, y: 0, r: 0 };
function dangerOf(th: Thing): typeof D | null {
  if (th.st === DONE || th.st === WAIT || !th.harm) return null;
  const t = th.tau;
  if (th.st === HOLD && th.k !== 'arrow') return null;
  switch (th.k) {
    case 'pot': {
      if (t < POT_TT + 4 || t > potHit(th)) return null;
      pose(th, t);
      D.x = P.x, D.y = P.y - 0.03, D.r = 0.035;
      return D;
    }
    case 'barrel': {
      const n = th.path!.length / 3 - 1;
      if (t < 6 || t >= n) return null;
      pose(th, t);
      D.x = P.x, D.y = P.y - 0.034, D.r = 0.034;
      return D;
    }
    case 'gear': {
      const n = th.path!.length / 3 - 1;
      if (t < 14 || t >= n) return null;
      pose(th, t);
      D.x = P.x, D.y = P.y - 0.055, D.r = 0.05;
      return D;
    }
    case 'arrow': {
      if (th.st === HOLD || t < th.n * 0.3 || t >= th.n) return null;
      pose(th, t);
      D.x = P.x, D.y = P.y, D.r = 0.022;
      return D;
    }
    case 'crate': {
      if (t <= CR_FRAY + 2 || t >= CR_FRAY + crFall(th)) return null;
      pose(th, t);
      D.x = P.x, D.y = P.y + th.h * 0.75, D.r = th.w * 0.42;
      return D;
    }
  }
  return null;
}

/** 발판들 [x0, x1, y, id] — 땅(id -1)과 물건 */
function supports(W: World, out: number[]) {
  out.length = 0;
  const g = W.L.ground;
  for (let i = 0; i < g.length; i += 3) out.push(g[i], g[i + 1], g[i + 2], -1);
  const gate = W.L.gate;
  if (gate && W.mach >= 0 && W.t - W.mach >= 56) out.push(gate[0], gate[1], gate[2], -2);
  for (const th of W.th) {
    if (th.st === DONE && th.k !== 'raft' && th.k !== 'log') continue;
    if (th.k === 'bridge') {
      const pw = (th.x2 - th.x) / th.n;
      for (let i = 0; i < th.n; i++) if (th.tau <= brFall(i) + 1) out.push(th.x + i * pw - (i === 0 ? 0.004 : 0), th.x + (i + 1) * pw + (i === th.n - 1 ? 0.004 : 0), th.y, th.id);
    } else if (th.k === 'raft') {
      if (th.tau < th.dur) out.push(th.x - th.w / 2, th.x + th.w / 2, th.y + RAFT_V * th.tau, th.id);
    } else if (th.k === 'log') {
      if (th.tau >= LOG_LIE && th.tau < th.dur) out.push(th.x - 0.02, th.x2, th.y + LOG_V * (th.tau - LOG_LIE), th.id);
    } else if (th.k === 'crate') {
      pose(th, th.tau);
      out.push(th.x - th.w / 2, th.x + th.w / 2, P.y, th.id);
    }
  }
}
const SUP: number[] = [];

/** 사건 τ 경계(앞으로 지날 때 · 거꾸로 지날 때) */
function crossEv(_W: World, th: Thing, t0: number, t1: number, E: Sink) {
  if (!E || t0 === t1) return;
  const up = t1 > t0, lo = Math.min(t0, t1), hi = Math.max(t0, t1);
  const at = (q: number) => q > lo && q <= hi;
  const atR = (q: number) => q >= lo && q < hi;
  pose(th, t1);
  const x = P.x, y = P.y;
  switch (th.k) {
    case 'bridge':
      if (up && at(1)) E('creak', x, th.y, 0, th.id);
      for (let i = 0; i < th.n; i++) {
        const q = brFall(i) + brLand;
        if (up && at(q)) (plank(th, i, t1), E('plankSplash', P.x, th.y + BR_DEPTH, i, th.id));
        if (!up && atR(brFall(i))) (plank(th, i, t1), E('plankMend', P.x, th.y, i, th.id));
      }
      break;
    case 'pot': {
      const q = potHit(th);
      if (up && at(POT_TT)) E('potFall', x, y, 0, th.id);
      if (up && at(q)) E('potBreak', th.x, th.y2, 0, th.id);
      if (!up && atR(q)) E('potMend', th.x, th.y2, 0, th.id);
      break;
    }
    case 'barrel':
    case 'gear': {
      const n = th.path!.length / 3 - 1;
      if (up && at(n)) E(th.k === 'gear' ? 'gearStop' : 'barrelSmash', x, y, 0, th.id);
      if (!up && atR(n)) E(th.k === 'gear' ? 'gearUnstop' : 'barrelMend', x, y, 0, th.id);
      break;
    }
    case 'arrow':
      if (up && at(th.n)) E('arrowStick', x, y, 0, th.id);
      if (!up && atR(th.n)) E('arrowPull', x, y, 0, th.id);
      break;
    case 'raft':
      if (up && at(th.dur)) E('weir', x, y, 0, th.id);
      break;
    case 'log':
      if (up && at(LOG_CHOP)) E('treeFall', th.x, th.y, 0, th.id);
      if (up && at(LOG_LIE)) E('logLand', (th.x + th.x2) / 2, th.y, 0, th.id);
      if (!up && atR(LOG_CHOP)) E('treeUp', th.x, th.y, 0, th.id);
      if (!up && atR(LOG_LIE)) E('logLift', (th.x + th.x2) / 2, th.y, 0, th.id);
      break;
    case 'water':
      if (up && at(WAT_CRACK)) E('burst', th.x, th.y, 0, th.id);
      break;
    case 'crate': {
      const q = CR_FRAY + crFall(th);
      if (up && at(CR_FRAY)) E('crateDrop', x, y, 0, th.id);
      if (up && at(q)) E('crateLand', th.x, th.y2, 0, th.id);
      if (!up && atR(q)) E('crateLift', th.x, th.y2, 0, th.id);
      break;
    }
    case 'balloon':
      if (up && at(th.dur)) E('balloonGone', x, y, 0, th.id);
      break;
  }
}

/** 제자리까지 되감았다 */
function origin(W: World, th: Thing, E: Sink) {
  th.tau = 0;
  W.rew = -1;
  pose(th, 0);
  const x = P.x, y = P.y;
  if (th.rider >= 0) {
    const r = actorOf(W, th.rider);
    if (r && !r.saved && !r.hurt) {
      r.saved = true;
      r.ride = -1;
      r.t = W.t;
      W.saved++;
      th.rider = -1;
      E?.('rescue', r.x, r.y, 0, r.id);
    }
  }
  if (th.owner >= 0) {
    const o = actorOf(W, th.owner)!;
    if (o.k === 'goblin' || o.k === 'walker') {
      if (!o.ko) (o.ko = true), (o.t = W.t), W.ko++, E?.('ko', o.x, o.y, 1, o.id);
      th.st = DONE;
      E?.('arrowHome', x, y, 0, th.id);
      return;
    }
    th.st = DONE;
    o.t = W.t;
    if (o.k === 'machine') (W.mach = W.t), E?.('machine', o.x, o.y, 0, th.id);
    else E?.('catch', x, y, 0, th.id);
    return;
  }
  th.st = HOLD;
  th.hold = HOLD_FULL;
  E?.('origin', x, y, 0, th.id);
}
/** 되감기를 멈춘다 (다시 톡 · 모래 바닥) */
function stopRew(W: World, th: Thing, E: Sink, why: number) {
  W.rew = -1;
  th.st = HOLD;
  th.hold = HOLD_STOP;
  if (th.dock >= 0 && Math.abs(th.tau - th.dock) <= SNAP) {
    th.tau = th.dock;
    pose(th, th.tau);
    E?.('dock', P.x, P.y, 0, th.id);
  } else {
    pose(th, th.tau);
    E?.(why ? 'empty' : 'stop', P.x, P.y, 0, th.id);
  }
}
/** 톡 한 물건에 하는 일 (세계·봇·미리 보기 공용). 돌려주는 값: 0 아무 일 없음 · 1 되감기 시작 · 2 멈춤 */
function tapThing(W: World, th: Thing, E: Sink): number {
  if (th.st === REW) return stopRew(W, th, E, 0), 2;
  if (th.st === DONE) return 0;
  pose(th, th.tau);
  if (th.tau <= 0) return E?.('notyet', P.x, P.y, 0, th.id), 0;
  if (W.sand <= 0) return E?.('nosand', P.x, P.y, 0, th.id), 0;
  if (W.rew >= 0) {
    const o = thingOf(W, W.rew);
    if (o) stopRew(W, o, E, 0);
  }
  th.st = REW;
  W.rew = th.id;
  W.taps++;
  E?.('rew', P.x, P.y, th.big, th.id);
  return 1;
}

/** 도깨비가 쏘는 화살 */
function shoot(W: World, g: Actor, E: Sink) {
  const H = W.hero, tgtKid = g.alt > 0 && g.shots % 2 === 1;
  const F = 104;
  let tx: number, ty: number;
  const kid = tgtKid ? W.ac.find((a) => a.role === R_VILL && !a.hurt) : undefined;
  if (kid) (tx = kid.x), (ty = kid.y);
  else {
    const walking = H.st === H_WALK || H.st === H_IDLE;
    tx = Math.max(0.06, Math.min(0.95, H.x + (walking ? V * F * 0.97 : 0)));
    ty = H.y;
  }
  const bx = g.x - 0.03, by = g.y - 0.06;
  const th: Thing = {
    id: W.nid++, k: 'arrow', tau: 0, dur: F, st: FWD, hold: 0, owner: g.id, rider: -1, dock: -1,
    x: bx, y: by, x2: tx, y2: ty - 0.035, w: 0.08, h: 0.16 + Math.abs(tx - bx) * 0.12, n: F, path: null, big: 0.4, moved: W.t, born: W.t, harm: 1,
  };
  W.th.push(th);
  g.shots++;
  E?.('shoot', bx, by, 0, th.id);
}

/** 세계 한 틱. E가 있으면 사건을 알린다(봇·미리 보기는 null) */
export function stepWorld(W: World, E: Sink) {
  W.t++;
  const H = W.hero;
  // ── 물건
  for (const th of W.th) {
    const t0 = th.tau;
    switch (th.st) {
      case WAIT:
        if (--th.hold <= 0) (th.st = FWD), (th.moved = W.t);
        break;
      case HOLD:
        if (--th.hold <= 0) th.st = FWD;
        break;
      case FWD:
        if (th.tau < th.dur) th.tau++;
        break;
      case REW:
        th.tau = Math.max(0, th.tau - RW);
        W.sand--;
        W.used++;
        if (th.tau <= 0) origin(W, th, E);
        else if (W.sand <= 0) stopRew(W, th, E, 1);
        break;
    }
    if (th.tau !== t0) crossEv(W, th, t0, th.tau, E);
    // 끝까지 가 버리면 태운 배우는 위험
    if (th.rider >= 0 && th.st === FWD && th.tau >= th.dur) {
      const r = actorOf(W, th.rider);
      if (r && !r.hurt && !r.saved) (r.hurt = true), (r.t = W.t), W.hurt++, E?.('lost', r.x, r.y, 0, r.id);
      th.rider = -1;
    }
  }
  // 오래된 화살(꽂힌 것)은 치운다 (세계를 가볍게)
  if (W.th.length > 14) W.th = W.th.filter((q) => !(q.k === 'arrow' && (q.st === DONE || (q.tau >= q.dur && W.t - q.born > 600))));
  // ── 배우
  for (const a of W.ac) {
    if (a.role === R_RIDER && a.ride >= 0 && !a.hurt) {
      const th = thingOf(W, a.ride);
      if (th) {
        pose(th, th.tau);
        if (th.k === 'raft') (a.x = P.x - 0.03), (a.y = P.y);
        else if (th.k === 'balloon') (a.x = P.x), (a.y = P.y + 0.13);
      }
    }
    if (a.role === R_ARCH && !a.ko && H.st !== H_WIN && H.st !== H_FAIL && W.t >= a.next) {
      shoot(W, a, E);
      a.next += a.per;
    }
  }
  // ── 주인공
  stepHero(W, E);
  // ── 부딪힘
  for (const th of W.th) {
    const d = dangerOf(th);
    if (!d) continue;
    if ((H.st === H_WALK || H.st === H_WAIT || H.st === H_IDLE) && H.on !== th.id && Math.hypot(H.x - d.x, H.y - HCY - d.y) < d.r + HR) {
      H.st = H_FAIL;
      H.why = th.k === 'arrow' ? '화살에 콕!' : th.k === 'pot' ? '화분에 쿵!' : th.k === 'gear' ? '톱니에 데굴!' : th.k === 'crate' ? '상자에 쿵!' : '술통에 데굴!';
      H.t = W.t;
      E?.('bonk', H.x, H.y - HCY, 0, th.id);
      continue;
    }
    for (const a of W.ac) {
      if (a.hurt || a.ko || a.saved || (a.role !== R_VILL && a.role !== R_ARCH && a.role !== R_WALK)) continue;
      if (th.k === 'arrow' && th.owner === a.id) continue;
      if (Math.hypot(a.x - d.x, a.y - 0.04 - d.y) < d.r + 0.034) {
        if (a.role === R_VILL) (a.hurt = true), (a.t = W.t), W.hurt++, E?.('hurt', a.x, a.y - 0.04, 0, a.id);
        else (a.ko = true), (a.t = W.t), W.ko++, E?.('ko', a.x, a.y, 0, a.id);
        if (th.k === 'arrow' && th.st !== REW) (th.st = DONE);
      }
    }
  }
  // 물: 웅덩이에 있던 마을 사람은 젖는다
  for (const th of W.th) {
    if (th.k !== 'water' || th.st === DONE || water(th, th.tau) < 0.5) continue;
    for (const a of W.ac) if (a.role === R_VILL && !a.hurt && a.x > th.x2 && a.x < th.y2) (a.hurt = true), (a.t = W.t), W.hurt++, E?.('wet', a.x, a.y - 0.03, 0, a.id);
  }
}

function stepHero(W: World, E: Sink) {
  const H = W.hero, L = W.L;
  if (H.st === H_WIN || H.st === H_FAIL) return;
  if (H.st === H_IDLE) {
    if (W.t >= H.delay) (H.st = H_WALK), (H.t = W.t);
    return;
  }
  if (H.st === H_FALL) {
    H.vy += G;
    H.y += H.vy;
    if (H.y > H.fallY) {
      H.st = H_FAIL;
      H.why = H.why || '풍덩!';
      H.t = W.t;
      E?.('splash', H.x, H.fallY, 0, -1);
    }
    return;
  }
  supports(W, SUP);
  // 발밑: 올라탄 것이 움직이면 같이
  let under = -9, uy = 0, best = 9;
  for (let i = 0; i < SUP.length; i += 4) {
    if (H.x < SUP[i] - 0.006 || H.x > SUP[i + 1] + 0.006) continue;
    const dy = Math.abs(SUP[i + 2] - H.y);
    const lim = SUP[i + 3] === H.on && H.on >= 0 ? 0.08 : STEP;
    if (dy <= lim && dy < best) (best = dy), (under = SUP[i + 3]), (uy = SUP[i + 2]);
  }
  if (under === -9) {
    H.st = H_FALL;
    H.vy = 0;
    H.why = '풍덩!';
    E?.('fall', H.x, H.y, 0, H.on);
    return;
  }
  if (under !== H.on && under >= 0) E?.('board', H.x, uy, 0, under);
  H.on = under;
  H.y = uy;
  // 막힘(화분 조각·물)
  const nx = H.x + V;
  for (const th of W.th) {
    const b = blockOf(th);
    if (!b) continue;
    if (Math.abs(H.y - b[2]) > 0.06) continue;
    if (H.x > b[0] + 0.01 && H.x < b[1] - 0.01) {
      if (th.k === 'water') {
        H.st = H_FAIL;
        H.why = '물에 휩쓸렸어요!';
        H.t = W.t;
        E?.('splash', H.x, H.y, 0, th.id);
        return;
      }
    }
    if (nx + 0.025 > b[0] && H.x + 0.025 <= b[0] + 0.004) return wait(W, H, E);
  }
  // 한 발 앞 발판
  let nb = -9, ny = 0, nbest = 9;
  for (let i = 0; i < SUP.length; i += 4) {
    if (nx < SUP[i] || nx > SUP[i + 1]) continue;
    const dy = Math.abs(SUP[i + 2] - H.y);
    if (dy <= STEP && dy < nbest) (nbest = dy), (nb = SUP[i + 3]), (ny = SUP[i + 2]);
  }
  if (nb === -9) return wait(W, H, E);
  if (H.st === H_WAIT) E?.('go', H.x, H.y, 0, -1);
  H.st = H_WALK;
  H.waitT = 0;
  H.x = nx;
  H.y = ny;
  H.on = nb;
  if (H.x >= L.gearX - 0.02 && Math.abs(H.y - L.gearY) < 0.05) {
    H.st = H_WIN;
    H.t = W.t;
    E?.('gearGet', L.gearX, L.gearY, 0, -1);
  }
}
function wait(W: World, H: Hero, E: Sink) {
  if (H.st !== H_WAIT) (H.st = H_WAIT), (H.t = W.t), E?.('stuck', H.x, H.y, 0, -1);
  H.waitT++;
}

// ───────────────────────────── 판 만들기 ─────────────────────────────
const rnd = (r: Rng, a: number, b: number) => a + (b - a) * r();
let NID = 1;
function T(k: Kind, o: Partial<Thing>): Thing {
  return { id: NID++, k, tau: 0, dur: 1, st: WAIT, hold: 1, owner: -1, rider: -1, dock: -1, x: 0, y: 0, x2: 0, y2: 0, w: 0, h: 0, n: 0, path: null, big: 1, moved: -1, born: 0, harm: 1, ...o };
}
function Ac(k: AK, role: number, x: number, y: number, o: Partial<Actor> = {}): Actor {
  return { id: NID++, k, role, x, y, x0: x, x1: x, vx: 0, ride: -1, ko: false, hurt: false, saved: false, t: -99, next: 1e9, per: 0, shots: 0, alt: 0, pause: 0, ...o };
}
/** 구르는 길: 꺾은선을 따라 가속해 구른다 → [x, y, 회전] τ마다 */
function rollPath(pts: number[], r: number, v0: number, acc: number, vmax: number, tail = 14): Float32Array {
  const out: number[] = [];
  let seg = 0, s = 0, v = v0, rot = 0;
  const segLen = (i: number) => Math.hypot(pts[i * 2 + 2] - pts[i * 2], pts[i * 2 + 3] - pts[i * 2 + 1]);
  const nSeg = pts.length / 2 - 1;
  for (let guard = 0; guard < 2000; guard++) {
    const L0 = segLen(seg), q = Math.min(1, s / L0);
    const x = pts[seg * 2] + (pts[seg * 2 + 2] - pts[seg * 2]) * q, y = pts[seg * 2 + 1] + (pts[seg * 2 + 3] - pts[seg * 2 + 1]) * q;
    out.push(x, y, rot);
    if (seg >= nSeg - 1 && s >= L0) break;
    v = Math.min(vmax, v + acc);
    s += v;
    rot += (v / r) * (pts[seg * 2 + 2] >= pts[seg * 2] ? 1 : -1);
    while (s > segLen(seg) && seg < nSeg - 1) (s -= segLen(seg)), seg++;
    if (seg === nSeg - 1 && s > segLen(seg)) s = segLen(seg);
  }
  const lx = out[out.length - 3], ly = out[out.length - 2], lr = out[out.length - 1];
  for (let k = 0; k < tail; k++) out.push(lx, ly, lr);
  return new Float32Array(out);
}
const LY = 0.86, LY3 = 0.95, UP3 = 0.6;

function bridgeT(x0: number, x1: number, y: number, w0: number, n = 4): Thing {
  return T('bridge', { x: x0, x2: x1, y, n, hold: w0, dur: Math.ceil(brFall(n - 1) + brLand + 34), big: 1.2 });
}
function potT(x: number, yb: number, w0: number, owner: number, yl = LY): Thing {
  const th = T('pot', { x, y: yb, y2: yl, hold: w0, owner, big: 0.6 });
  th.dur = Math.ceil(potHit(th) + 16);
  return th;
}
function raftT(x: number, y0: number, y1: number, w: number, w0: number, rider: number, dockY = -1): Thing {
  const th = T('raft', { x, y: y0, y2: y1, w, hold: w0, rider, big: 1.1 });
  th.dur = Math.ceil((y1 - y0) / RAFT_V);
  if (dockY > 0) th.dock = Math.round((dockY - y0) / RAFT_V);
  return th;
}
function logT(xb: number, x2: number, y: number, w0: number, yEnd = 1.18): Thing {
  const th = T('log', { x: xb, x2, y, hold: w0, w: x2 - xb, big: 1.3 });
  th.dur = Math.ceil(LOG_LIE + (yEnd - y) / LOG_V);
  th.dock = LOG_LIE;
  return th;
}
function crateT(x: number, yTop: number, yRest: number, w: number, w0: number): Thing {
  const th = T('crate', { x, y: yTop, y2: yRest, w, h: Math.min(0.2, yRest - yTop + 0.05), hold: w0, big: 1.3 });
  th.h = 0.12;
  th.dur = Math.ceil(CR_FRAY + crFall(th) + 10);
  return th;
}

function baseLevel(key: Key, ch: number): Level {
  return {
    key, ch, ground: [], things: [], actors: [], sand: 240, par: 0, stars: [], gearX: 0.91, gearY: ch === 2 ? LY3 : LY, heroX: 0.07, heroY: ch === 2 ? LY3 : LY, heroDelay: 40,
    fallY: (ch === 2 ? LY3 : LY) + 0.16, canal: null, basin: null, shaft: null, gate: null, deco: {},
  };
}

/** 판의 모양 (변형 r로 시간·자리를 조금씩 흔든다) */
function rawLevel(si: number, r: Rng): Level {
  const d = STAGES[si], L = baseLevel(d.key, d.ch);
  L.stars = d.stars;
  const lane = L.heroY;
  switch (d.key) {
    case 'bridge': {
      L.ground = [0, 0.4, lane, 0.62, 1, lane];
      L.canal = [0.4, 0.62];
      L.things.push(bridgeT(0.4, 0.62, lane, Math.round(rnd(r, 14, 22))));
      L.things[0].dur += 0;
      L.actors.push(Ac('kid', R_DECO, 0.78, lane), Ac('duck', R_DECO, 0.5, 1.02));
      L.heroDelay = 16;
      L.sand = 300;
      break;
    }
    case 'pot': {
      L.ground = [0, 0.56, lane, 0.74, 1, lane];
      L.canal = [0.56, 0.74];
      const px = rnd(r, 0.32, 0.36);
      const gm = Ac('grandma', R_DECO, px + 0.05, 0.5);
      L.actors.push(gm, Ac('cat', R_DECO, px - 0.06, 0.5), Ac('duck', R_DECO, 0.65, 1.05));
      L.things.push(potT(px, 0.5, Math.round(rnd(r, 8, 16)), gm.id));
      L.things.push(bridgeT(0.56, 0.74, lane, Math.round(rnd(r, 96, 120))));
      L.deco.balc = px;
      L.sand = 240;
      break;
    }
    case 'barrel': {
      L.ground = [0, 1, lane];
      const ax = rnd(r, 0.47, 0.53), top = 0.47;
      const fm = Ac('farmer', R_DECO, ax + 0.07, top - 0.005);
      const gm = Ac('grandma', R_VILL, rnd(r, 0.8, 0.86), 1.05);
      L.actors.push(fm, gm);
      L.deco.alley = ax;
      L.deco.top = top;
      // A: 곧장 앞으로 → 상자 더미(괜찮음) · B: 길을 따라 왼쪽(주인공 쪽) · C: 앞 인도를 따라 오른쪽(할머니 쪽)
      const down = [ax, top + 0.01, ax, lane];
      const paths = {
        A: [...down, ax + 0.02, 1.13],
        B: [...down, 0.03, lane],
        C: [...down, ax + 0.01, 1.05, 0.97, 1.05],
      };
      const order: ('A' | 'B' | 'C')[][] = [['A', 'B', 'C'], ['A', 'C', 'B'], ['B', 'A', 'C']];
      const ord = order[Math.floor(r() * order.length)];
      let w0 = Math.round(rnd(r, 12, 20));
      for (const kk of ord) {
        L.things.push(T('barrel', { path: rollPath(paths[kk], 0.034, 0.0012, 0.00011, 0.0052), hold: w0, owner: fm.id, big: 1 }));
        w0 += Math.round(rnd(r, 46, 62));
      }
      for (const th of L.things) th.dur = th.path!.length / 3 - 1;
      L.sand = 240;
      break;
    }
    case 'arrow': {
      L.ground = [0, 0.62, lane, 0.8, 1, lane];
      L.canal = [0.62, 0.8];
      const gx = rnd(r, 0.28, 0.4);
      const gb = Ac('goblin', R_ARCH, gx, 0.36, { next: Math.round(rnd(r, 70, 90)), per: Math.round(rnd(r, 150, 175)), alt: 1 });
      const kid = Ac('kid', R_VILL, rnd(r, 0.86, 0.9), lane);
      L.actors.push(gb, kid);
      L.deco.roof = gx;
      L.things.push(bridgeT(0.62, 0.8, lane, Math.round(rnd(r, 26, 40))));
      L.gearX = 0.93;
      L.sand = 240;
      break;
    }
    case 'raft': {
      L.ground = [0, 0.45, lane, 0.63, 1, lane];
      L.canal = [0.45, 0.63];
      const kid = Ac('kid', R_RIDER, 0.51, lane), mom = Ac('mom', R_DECO, 0.38, lane);
      L.actors.push(kid, mom);
      const raft = raftT(0.54, lane, 1.17, 0.21, Math.round(rnd(r, 10, 18)), kid.id);
      kid.ride = raft.id;
      L.things.push(raft);
      // 물에 떠내려가는 빈 통(먼저 움직임)
      const bx = 0.5 + rnd(r, -0.02, 0.02);
      L.things.push(T('barrel', { path: rollPath([bx, 0.5, bx + 0.02, 1.16], 0.03, 0.0011, 0, 0.0011, 4), hold: 2, big: 0.8, harm: 0 }));
      L.things[1].dur = L.things[1].path!.length / 3 - 1;
      L.sand = 240;
      break;
    }
    case 'log': {
      L.ground = [0, 0.42, lane, 0.62, 1, lane];
      L.canal = [0.42, 0.62];
      const bv = Ac('beaver', R_DECO, 0.33, lane);
      L.actors.push(bv);
      L.things.push(logT(0.4, 0.66, lane, Math.round(rnd(r, 6, 14))));
      L.actors.push(Ac('duck', R_DECO, 0.52, 1.0), Ac('kid', R_VILL, rnd(r, 0.84, 0.9), lane));
      const gx = rnd(r, 0.72, 0.8);
      L.actors.push(Ac('goblin', R_ARCH, gx, 0.36, { next: Math.round(rnd(r, 120, 150)), per: Math.round(rnd(r, 160, 180)), alt: 1 }));
      L.deco.roof = gx;
      L.sand = 200;
      break;
    }
    case 'water': {
      L.ground = [0, 1, lane];
      const bx0 = rnd(r, 0.26, 0.3), bx1 = bx0 + 0.17;
      const mole = Ac('mole', R_DECO, bx0 + 0.13, 0.4);
      const cat = Ac('cat', R_VILL, bx0 + 0.08, lane);
      L.actors.push(mole, cat);
      L.basin = [bx0, bx1];
      L.things.push(T('water', { x: bx0 + 0.08, y: 0.42, x2: bx0, y2: bx1, h: lane, hold: Math.round(rnd(r, 30, 44)), owner: mole.id, dur: WAT_CRACK + WAT_FILL, big: 1.2 }));
      L.canal = [0.6, 0.78];
      L.ground = [0, 0.6, lane, 0.78, 1, lane];
      L.things.push(logT(0.58, 0.82, lane, Math.round(rnd(r, 4, 10))));
      L.actors.push(Ac('beaver', R_DECO, 0.53, lane));
      L.sand = 260;
      break;
    }
    case 'balloon': {
      L.ground = [0, 0.5, lane, 0.7, 1, lane];
      L.canal = [0.5, 0.7];
      const kid = Ac('kid', R_DECO, 0.2, lane), cat = Ac('cat', R_RIDER, 0.21, lane - 0.12);
      L.actors.push(kid, cat);
      const bal = T('balloon', { x: 0.22, y: lane - 0.25, hold: Math.round(rnd(r, 26, 40)), owner: kid.id, rider: cat.id, dur: 300, big: 0.7 });
      cat.ride = bal.id;
      L.things.push(bal);
      L.things.push(raftT(0.6, lane, 1.17, 0.21, Math.round(rnd(r, 10, 20)), -1));
      const gx = rnd(r, 0.8, 0.86);
      L.actors.push(Ac('goblin', R_ARCH, gx, 0.36, { next: Math.round(rnd(r, 160, 190)), per: 200 }));
      L.deco.roof = gx;
      L.sand = 260;
      break;
    }
    case 'crate': {
      L.ground = [0, 0.5, lane, 0.66, 1, UP3];
      L.shaft = [0.5, 0.66, UP3, lane];
      L.gearY = UP3;
      L.things.push(crateT(0.58, UP3, lane, 0.17, Math.round(rnd(r, 14, 24))));
      // 비계에서 떨어지는 페인트 통(먼저 움직임 · 주인 있음)
      const pt = Ac('beaver', R_DECO, 0.3, 0.46);
      L.actors.push(pt);
      L.things.push(potT(rnd(r, 0.22, 0.28), 0.48, 4, pt.id, lane));
      L.actors.push(Ac('cat', R_VILL, 0.14, lane));
      L.sand = 240;
      break;
    }
    case 'gear': {
      L.ground = [0, 0.46, lane, 0.66, 1, lane];
      L.gate = [0.46, 0.66, lane];
      L.fallY = lane + 0.2;
      const m = Ac('machine', R_DECO, 0.22, 0.6);
      L.actors.push(m);
      const gp = rollPath([0.22, 0.64, 0.25, 0.7, 0.4, lane, 0.47, lane, 0.55, lane + 0.17], 0.05, 0.001, 0.00009, 0.0042, 18);
      L.things.push(T('gear', { path: gp, hold: Math.round(rnd(r, 30, 42)), owner: m.id, big: 1.4 }));
      L.things[0].dur = gp.length / 3 - 1;
      L.actors.push(Ac('kid', R_VILL, 0.84, lane));
      L.gearX = 0.93;
      L.sand = 240;
      break;
    }
    case 'cross': {
      L.ground = [0, 0.5, lane, 0.66, 1, UP3];
      L.shaft = [0.5, 0.66, UP3, lane];
      L.gearY = UP3;
      L.things.push(crateT(0.58, UP3, lane, 0.17, Math.round(rnd(r, 8, 16))));
      const gx = rnd(r, 0.82, 0.88);
      L.actors.push(Ac('goblin', R_ARCH, gx, UP3, { next: Math.round(rnd(r, 100, 130)), per: Math.round(rnd(r, 165, 185)) }));
      L.actors.push(Ac('cat', R_DECO, 0.2, lane));
      L.deco.roof = gx;
      L.sand = 240;
      break;
    }
    case 'grand': {
      L.ground = [0, 0.3, lane, 0.46, 0.5, lane, 0.66, 1, UP3];
      L.gate = [0.3, 0.46, lane];
      L.shaft = [0.5, 0.66, UP3, lane];
      L.gearY = UP3;
      L.fallY = lane + 0.2;
      const m = Ac('machine', R_DECO, 0.12, 0.6);
      L.actors.push(m);
      const gp = rollPath([0.12, 0.64, 0.15, 0.7, 0.24, lane, 0.31, lane, 0.38, lane + 0.17], 0.05, 0.001, 0.00009, 0.0042, 18);
      L.things.push(T('gear', { path: gp, hold: Math.round(rnd(r, 16, 26)), owner: m.id, big: 1.4 }));
      L.things[0].dur = gp.length / 3 - 1;
      L.things.push(crateT(0.58, UP3, lane, 0.17, Math.round(rnd(r, 60, 80))));
      const gx = rnd(r, 0.82, 0.9);
      L.actors.push(Ac('goblin', R_ARCH, gx, UP3, { next: Math.round(rnd(r, 120, 150)), per: 190 }));
      L.deco.roof = gx;
      L.sand = 260;
      break;
    }
  }
  return L;
}

// ───────────────────────────── 앞을 셈 (같은 세계로) ─────────────────────────────
interface Out { win: boolean; fail: boolean; t: number; x: number; hurt: number; used: number; saved: number; stuck: boolean }
function rollout(W0: World, maxT = 1300): Out {
  const W = cloneWorld(W0), H = W.hero, t0 = W.t;
  let still = 0;
  while (W.t - t0 < maxT) {
    stepWorld(W, null);
    if (H.st === H_WIN || H.st === H_FAIL) break;
    if (H.st === H_WAIT) {
      still++;
      if (still > 420 && W.rew < 0) break;
    } else still = 0;
  }
  return { win: H.st === H_WIN, fail: H.st === H_FAIL, t: W.t, x: H.x, hurt: W.hurt, used: W.used, saved: W.saved, stuck: H.st === H_WAIT };
}
/** 결과의 값: 이기기 ≫ 안 다치게 ≫ 모래 아끼기 > 빨리 */
function value(o: Out): number {
  let v = -4 * o.used - 2500 * o.hurt;
  if (o.win) v += 30000 - 0.5 * o.t;
  else if (o.fail) v += 4000 * o.x;
  else v += 9000 + 4000 * o.x;
  return v;
}
/** 지금 톡 할 수 있는(되감을 수 있는) 물건 */
const tappable = (th: Thing) => th.st !== DONE && th.st !== REW && th.tau > 0;
const DEC = 6, LATER = 12;

/** 잘하는 머리: 지금 무엇을(또는 멈춤을) 톡 할까 — 같은 세계로 앞을 세어 본다 */
function decide(W: World, base: Out): number {
  const bv = value(base);
  if (W.rew >= 0) {
    const c = cloneWorld(W);
    tapThing(c, thingOf(c, W.rew)!, null);
    return value(rollout(c)) >= bv - 0.5 ? W.rew : -1;
  }
  if (base.win && base.hurt === 0) return -1;
  let best = -1, bestV = bv + 1;
  for (const th of W.th) {
    if (!tappable(th) || W.sand <= 0) continue;
    const c = cloneWorld(W);
    tapThing(c, thingOf(c, th.id)!, null);
    const vNow = value(rollout(c));
    if (vNow <= bestV) continue;
    // 조금 뒤에 해도 똑같이 좋으면 기다린다 (되감기는 늦을수록 비싸지만, 다시 벌어지는 일은 너무 일찍 하면 헛일)
    const c2 = cloneWorld(W);
    for (let k = 0; k < LATER; k++) stepWorld(c2, null);
    const t2 = thingOf(c2, th.id);
    if (t2 && tappable(t2) && c2.hero.st !== H_FAIL) {
      tapThing(c2, t2, null);
      if (value(rollout(c2)) >= vNow - 0.5) continue;
    }
    best = th.id;
    bestV = vNow;
  }
  return best;
}
/** 판 하나를 처음부터 끝까지 잘하는 머리로 둬 본다 → 할 일 목록 [틱, 물건 id] */
interface Plan { acts: number[]; used: number; win: boolean; hurt: number; t: number }
function planFrom(W0: World, maxT = 3600): Plan {
  const W = cloneWorld(W0), acts: number[] = [];
  let base = rollout(W);
  const t0 = W.t;
  while (W.t - t0 < maxT && W.hero.st !== H_WIN && W.hero.st !== H_FAIL) {
    if (W.t % DEC === 0) {
      const id = decide(W, base);
      if (id >= 0) {
        acts.push(W.t, id);
        tapThing(W, thingOf(W, id)!, null);
        base = rollout(W);
      }
    }
    stepWorld(W, null);
    if (W.rew < 0 && W.t % DEC === 0 && base.t <= W.t) base = rollout(W);
  }
  return { acts, used: W.used, win: W.hero.st === H_WIN, hurt: W.hurt, t: W.t - t0 };
}

// ───────────────────────────── 버릇 봇의 머리 ─────────────────────────────
/** 버릇 1: 쉬는 틈만 나면 '가장 먼저 움직이기 시작한 것'을 되감는다 (끝까지) */
function habitFirst(W: World): number {
  if (W.rew >= 0 || W.sand <= 0) return -1;
  let best: Thing | null = null;
  for (const th of W.th) if (tappable(th) && th.st === FWD && th.tau < th.dur && (!best || th.moved < best.moved)) best = th;
  return best ? best.id : -1;
}
/** 버릇 2: 곧 일이 나면(주인공이 막히거나 맞거나 누가 다치면) '주인공에 가장 가까운 것'을 되감는다 (끝까지) */
function habitNear(W: World): number {
  if (W.rew >= 0 || W.sand <= 0) return -1;
  const o = rollout(W, 100);
  if (!(o.fail || o.hurt > W.hurt || o.stuck || (W.hero.st === H_WAIT))) return -1;
  const H = W.hero;
  let best = -1, bd = 9;
  for (const th of W.th) {
    if (!tappable(th)) continue;
    pose(th, th.tau);
    const d = Math.hypot(P.x - H.x, P.y - H.y);
    if (d < bd) (bd = d), (best = th.id);
  }
  return best;
}
/** 버릇 머리로 판 하나를 끝까지 */
function trialHabit(L: Level, pick: (W: World) => number, maxT = 3600): World {
  const W = newWorld(L);
  while (W.t < maxT && W.hero.st !== H_WIN && W.hero.st !== H_FAIL) {
    if (W.t % DEC === 0) {
      const id = pick(W);
      if (id >= 0) tapThing(W, thingOf(W, id)!, null);
    }
    stepWorld(W, null);
  }
  return W;
}
function starsOf(L: Level, W: World): boolean[] {
  const win = W.hero.st === H_WIN;
  return L.stars.map((k) => (k === 'goal' ? win : k === 'sand' ? win && W.used <= L.par : k === 'safe' ? win && W.hurt === 0 : win && W.saved > 0 && W.hurt === 0));
}

// ───────────────────────────── 판 고르기 (변형 셋, 잘하는 머리로 검사) ─────────────────────────────
const VARIANTS = 3;
const levelCache = new Map<string, Level>();
const planCache = new Map<string, Plan>();
export function buildLevel(variant: number, si: number): Level {
  const ck = `${variant}:${si}`;
  const c = levelCache.get(ck);
  if (c) return c;
  const r = mulberry32((variant * 7919 + si * 104729 + 17) >>> 0);
  let pick: Level | null = null, fb: Level | null = null;
  for (let tries = 0; tries < 8 && !pick; tries++) {
    const L = rawLevel(si, r);
    const W = newWorld(L), pl = planFrom(W);
    if (!pl.win) continue;
    L.par = Math.max(30, Math.ceil((pl.used * 1.12 + 10) / 6) * 6);
    if (pl.hurt > 0 && L.stars.includes('safe')) continue;
    fb ??= L;
    if (si >= 2) {
      const hb = trialHabit(L, habitFirst);
      if (starsOf(L, hb).every(Boolean)) continue;
    }
    planCache.set(`${ck}:start`, pl);
    pick = L;
  }
  const L = pick ?? fb ?? rawLevel(0, mulberry32(5));
  if (!pick && !fb) L.par = 120;
  levelCache.set(ck, L);
  return L;
}

// ───────────────────────────── 상태 ─────────────────────────────
export interface RewState {
  seed: number; variant: number; t: number; stage: number; phase: 'play' | 'result' | 'chapter'; pt: number; endT: number;
  L: Level; W: World; hearts: number; stars: number; got: number; starOk: boolean[]; pts: number; ok: boolean; why: string; won: boolean; dead: boolean; again: boolean; tries: number;
  gears: number; fixed: number;
  seen: Set<string>; events: Ev[]; banner: { head: string; sub: string; t: number } | null; spot: { x: number; y: number; r: number; label: string; t: number } | null;
  wowN: number; firstTap: number; down: boolean; ax: number; ay: number; slow: number; magnet: boolean; idleT: number; lastTap: number;
  sel: number;
}
const ev = (s: RewState, kind: string, x: number, y: number, v = 0, id = -1, text?: string) => s.events.push({ t: s.t, kind, x, y, v, id, text });
const see = (s: RewState, key: string) => s.seen.add(key);

function newStage(s: RewState) {
  const d = STAGES[s.stage];
  s.L = buildLevel(s.variant, s.stage);
  s.W = newWorld(s.L);
  s.phase = 'play';
  s.pt = 0;
  s.endT = -1;
  s.got = 0;
  s.starOk = s.L.stars.map(() => false);
  s.magnet = s.stage <= 1 && !s.again;
  s.idleT = 0;
  s.sel = -1;
  see(s, d.key);
  if (s.again) s.banner = { head: `다시! ${s.stage + 1}판 · ${d.name}`, sub: d.hint, t: s.t };
  else s.banner = s.stage === 0 ? null : { head: `${s.stage + 1}판 · ${d.name}`, sub: d.news ? `NEW  ${d.news}` : d.hint, t: s.t };
  s.spot = null;
  if (!s.again && s.stage > 0 && d.spot) {
    const L = s.L, th = L.things[0];
    pose(th, 0);
    let sx = P.x, sy = P.y;
    const own = L.actors.find((a) => a.k === 'grandma' || a.k === 'farmer' || a.k === 'goblin' || a.k === 'machine' || a.k === 'walker');
    if ((d.key === 'pot' || d.key === 'barrel' || d.key === 'arrow' || d.key === 'gear' || d.key === 'cross') && own) (sx = own.x), (sy = own.y - 0.05);
    if (d.key === 'log') (sx = (th.x + th.x2) / 2), (sy = th.y);
    s.spot = { x: sx, y: sy, r: 0.11, label: d.spot, t: s.t };
  }
  s.again = false;
}

/** 손가락이 닿은 자리 → 가장 가까운 물건을 톡 */
function tapAt(s: RewState, px: number, py: number) {
  const W = s.W, wx = px, wy = py * A - TOPH;
  if (s.banner && s.t - s.banner.t < 150) s.banner.t = s.t - 150;
  let best: Thing | null = null, bd = TAP_R;
  for (const th of W.th) {
    if (th.st === DONE) continue;
    const d = tapDist(th, wx, wy);
    if (d < bd) (bd = d), (best = th);
  }
  if (!best && s.magnet) {
    // 배우는 판: 움직인 물건 가까이(넉넉히)를 톡 하면 그 물건
    let bd2 = 0.3;
    for (const th of W.th) {
      if (th.st === DONE || th.tau <= 0) continue;
      const d = tapDist(th, wx, wy);
      if (d < bd2) (bd2 = d), (best = th);
    }
  }
  if (!best) {
    ev(s, 'miss', wx, wy);
    return;
  }
  const r = tapThing(W, best, sinkOf(s));
  s.sel = best.id;
  s.lastTap = s.t;
  if (r === 1) {
    if (s.firstTap < 0) (s.firstTap = s.t), (s.slow = 10);
    see(s, 'rewind');
  } else if (r === 2) see(s, 'stop');
}
/** 톡 한 자리와 물건 사이 거리(물건마다 잡히는 모양이 다르다 — 넉넉히) */
function tapDist(th: Thing, x: number, y: number): number {
  pose(th, th.tau);
  switch (th.k) {
    case 'bridge': {
      const cx = (th.x + th.x2) / 2, hw = (th.x2 - th.x) / 2 + 0.02;
      const dx = Math.max(0, Math.abs(x - cx) - hw), dy = y < th.y - 0.08 ? th.y - 0.08 - y : y > th.y + 0.24 ? y - th.y - 0.24 : 0;
      return Math.hypot(dx, dy);
    }
    case 'water': {
      const dx = Math.max(0, th.x2 - 0.01 - x, x - th.y2 - 0.01), dy = Math.max(0, th.h - 0.1 - y, y - th.h - 0.08);
      const dt = Math.hypot(x - th.x, y - th.y);
      return Math.min(Math.hypot(dx, dy), Math.max(0, dt - 0.06));
    }
    case 'raft':
    case 'log': {
      if (th.k === 'log' && th.tau < LOG_LIE) {
        // 서 있는(쓰러지는) 나무: 줄기 둘레
        const ang = P.a, len = th.w;
        const ex = th.x + Math.sin(ang) * len, ey = th.y - Math.cos(ang) * len;
        return segDist(x, y, th.x, th.y, ex, ey);
      }
      const x0 = th.k === 'raft' ? th.x - th.w / 2 : th.x - 0.02, x1 = th.k === 'raft' ? th.x + th.w / 2 : th.x2;
      return segDist(x, y, x0, P.y - 0.01, x1, P.y - 0.01);
    }
    case 'crate':
      return Math.max(0, Math.hypot(x - P.x, y - (P.y + 0.06)) - 0.07);
    case 'balloon':
      return Math.max(0, Math.min(Math.hypot(x - P.x, y - P.y), Math.hypot(x - P.x, y - P.y - 0.13)) - 0.04);
    case 'pot':
      return Math.max(0, Math.hypot(x - P.x, y - P.y) - (th.tau >= potHit(th) ? 0.05 : 0.02));
    case 'gear':
      return Math.max(0, Math.hypot(x - P.x, y - (P.y - 0.05)) - 0.04);
    case 'arrow':
      return Math.max(0, Math.hypot(x - P.x, y - P.y) - 0.02);
    default:
      return Math.hypot(x - P.x, y - P.y);
  }
}
function segDist(px: number, py: number, x0: number, y0: number, x1: number, y1: number) {
  const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy;
  const q = l2 > 0 ? Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / l2)) : 0;
  return Math.hypot(px - (x0 + dx * q), py - (y0 + dy * q));
}

const PTS_CLEAR = 120, PTS_STAR = [0, 80, 180, 320], PTS_WIN = 500;
function finish(s: RewState, ok: boolean, why: string) {
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  s.why = why;
  const L = s.L, W = s.W;
  if (ok) {
    s.starOk = starsOf(L, W);
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    s.gears++;
    s.fixed = Math.max(s.fixed, s.stage + 1);
    s.pts += Math.round((PTS_CLEAR + PTS_STAR[s.got] + Math.max(0, W.sand) * 0.5 + W.saved * 40 + W.ko * 30) * (1 + 0.12 * s.stage));
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += PTS_WIN + s.hearts * 120);
    ev(s, 'clear', 0.5, 0.5, s.got);
    see(s, 'fix' + s.stage);
  } else {
    s.hearts--;
    s.tries++;
    ev(s, 'fail', 0.5, 0.5, 0, -1, why);
  }
}

/** 사건 받기: 세계가 알리는 일을 화면 사건으로 · 큰 순간 · 새것 */
function sinkOf(s: RewState): Sink {
  return (kind, x, y, v = 0, id = -1) => {
    ev(s, kind, x, y, v, id);
    if (kind === 'plankMend' || kind === 'potMend' || kind === 'barrelMend' || kind === 'logLift' || kind === 'crateLift') {
      if (kind === 'plankMend' && v !== 0) return;
      s.wowN++;
      see(s, 'mend');
      s.slow = Math.max(s.slow, 8);
    } else if (kind === 'catch') (s.wowN++, see(s, 'catch'), (s.slow = Math.max(s.slow, 10)));
    else if (kind === 'ko') (s.wowN++, see(s, 'ko'), (s.slow = Math.max(s.slow, 16)));
    else if (kind === 'rescue') (s.wowN++, see(s, 'rescue'), (s.slow = Math.max(s.slow, 12)));
    else if (kind === 'machine') (s.wowN++, see(s, 'machine'), (s.slow = Math.max(s.slow, 12)));
    else if (kind === 'dock') (s.wowN++, see(s, 'dock'));
    else if (kind === 'board') {
      const th = thingOf(s.W, id);
      if (th && th.k === 'crate') see(s, 'ride');
    } else if (kind === 'origin') {
      const th = thingOf(s.W, id);
      if (th && th.k === 'crate' && s.W.hero.on === th.id) (s.wowN++, see(s, 'lift'));
    }
  };
}

export const rewindone: GameDef<RewState> & { wows(s: RewState): number } = {
  id: 'rewindone',
  name: '⏪ 한 물건만 되감기',
  genes: ['rewindone', 'depth', 'collect'],
  twist: '세상 전체가 아니라 톡 한 물건 하나만 자기 시간이 거꾸로 감긴다 — 무너진 다리가 다시 서는 동안에도 다른 것은 계속 앞으로 흘러, 되돌아간 화살이 쏜 도깨비를 맞히고 거꾸로 오르는 상자가 주인공을 태워 올린다',
  rules: ['세상은 저절로 흘러가요. 물건을 톡 하면 그 물건만 시간이 거꾸로!', '다시 톡 하면 멈춰요. 모래를 아껴 꼬마 시계공을 시계 부품까지.'],
  controls: 'touch',
  origin: '오너가 고른 아이디어 (38라운드): 한 물건만 되감기',
  hint: '물건을 톡! (다시 톡 = 멈춤) / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '밝은 3/4 시점 시계탑 마을 — 꼬마 시계공 부엉이의 되감기 모험',
    mood: '아침 햇살이 비치는 알록달록 장터·강가·시계탑. 멈춰 버린 시계탑 마을에서 무너지고 쏟아지는 일이 저절로 벌어지고, 톡 한 물건만 시계 문양 빛에 감싸여 지나온 길을 거꾸로 되짚는다 — 조각이 빨려 모여 착! 붙으면 마을 사람들이 박수. 판을 깰 때마다 분수가 솟고 풍차가 돌며 마을이 살아난다.',
    palette: { bg: '#bfe6ff', ink: '#2a2238', muted: '#8a7f9a', accent: '#ffb02e', hot: '#ff5a4a', soft: '#fff3dc' },
  },
  reveals: (s) => s.seen.size,
  guard: (s) => s.L.actors.filter((a) => a.role === R_VILL || a.role === R_RIDER).length - s.W.hurt,
  cleared: (s) => (s.phase === 'result' && s.ok ? { stage: s.stage, got: s.got, of: s.starOk.length } : null),
  wows: (s) => s.wowN,
  create(seed) {
    const s = {
      seed, variant: ((seed >>> 0) * 2654435761 >>> 0) % VARIANTS, t: 0, stage: 0, phase: 'play', pt: 0, endT: -1, hearts: 3, stars: 0, got: 0, starOk: [], pts: 0, ok: false, why: '', won: false, dead: false, again: false, tries: 0,
      gears: 0, fixed: 0, seen: new Set<string>(), events: [], banner: null, spot: null, wowN: 0, firstTap: -1, down: false, ax: 0.5, ay: 0.5, slow: 0, magnet: true, idleT: 0, lastTap: -99, sel: -1,
    } as unknown as RewState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    const p = inp.pointer ?? null, press = !!p && !s.down;
    if (p) (s.ax = p.x), (s.ay = p.y);
    s.down = !!p;
    s.t++;
    s.pt++;
    if (s.slow > 0) s.slow--;
    if (s.events.length > 90 || (s.events.length && s.t - s.events[0].t > 240)) s.events = s.events.filter((e) => s.t - e.t < 240);
    if (s.spot && s.t - s.spot.t > 200) s.spot = null;
    if (s.phase === 'result') {
      if (s.pt >= (s.ok ? 210 : 150) || (press && s.pt > 50)) {
        if (s.ok) {
          if (s.won) s.dead = true;
          else {
            s.stage++;
            if (STAGES[s.stage].ch !== STAGES[s.stage - 1].ch) (s.phase = 'chapter'), (s.pt = 0);
            else newStage(s);
          }
        } else if (s.hearts <= 0) s.dead = true;
        else (s.again = true), newStage(s);
      }
      return;
    }
    if (s.phase === 'chapter') {
      if (s.pt >= 120 || (press && s.pt > 30)) newStage(s);
      return;
    }
    if (press) tapAt(s, p!.x, p!.y);
    // 큰 순간엔 잠깐 느려진다 (세계를 두 틱에 한 번만)
    if (!(s.slow > 0 && s.t % 2 === 0)) stepWorld(s.W, sinkOf(s));
    const W = s.W, H = W.hero;
    if (H.st === H_WAIT && W.rew < 0) s.idleT++;
    else s.idleT = 0;
    if (s.endT < 0) {
      if (H.st === H_WIN) s.endT = s.t + 70;
      else if (H.st === H_FAIL) s.endT = s.t + 80;
      else if (H.st === H_WAIT && W.sand <= 0 && H.waitT > 420) (H.st = H_FAIL), (H.why = '모래가 바닥났어요!'), (s.endT = s.t + 40);
    }
    if (s.endT >= 0 && s.t >= s.endT) {
      if (H.st === H_WIN) finish(s, true, '');
      else finish(s, false, H.why || '어이쿠!');
    }
  },
  over: (s) => s.dead,
  score: (s) => Math.round(s.pts),
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
/** 물건을 누르는 자리 (화면 비율) */
function tapPoint(th: Thing): { x: number; y: number } {
  pose(th, th.tau);
  let x = P.x, y = P.y;
  if (th.k === 'bridge') y = th.y + 0.05;
  else if (th.k === 'crate') y = P.y + 0.06;
  else if (th.k === 'gear') y = P.y - 0.05;
  else if (th.k === 'water') (x = (th.x2 + th.y2) / 2), (y = th.h - 0.02);
  else if (th.k === 'log' && th.tau < LOG_LIE) (x = th.x + Math.sin(P.a) * th.w * 0.5), (y = th.y - Math.cos(P.a) * th.w * 0.5);
  else if (th.k === 'log' || th.k === 'raft') (x = th.k === 'log' ? (th.x + th.x2) / 2 : th.x), (y = P.y - 0.01);
  else if (th.k === 'balloon') y = P.y + 0.02;
  return { x, y: (y + TOPH) / A };
}
interface Mind { stage: number; tries: number; plan: Plan | null; i: number; up: boolean; want: number }
const minds = new WeakMap<object, Mind>();
function mindOf(s: RewState): Mind {
  let m = minds.get(s);
  if (!m) minds.set(s, (m = { stage: -1, tries: -1, plan: null, i: 0, up: false, want: -1 }));
  if (m.stage !== s.stage || m.tries !== s.tries) (m.stage = s.stage), (m.tries = s.tries), (m.plan = null), (m.i = 0), (m.want = -1);
  return m;
}
/** 결과 화면은 톡으로 넘긴다 */
function skip(s: RewState, m: Mind): Input | null {
  if (s.phase === 'play') return null;
  if (m.up) return (m.up = false), NO;
  if (s.pt > 52) return (m.up = true), { tap: false, dir: 0, pointer: { x: 0.5, y: 0.5 } };
  return NO;
}
/** 잘하는 봇: 판마다 같은 세계로 끝까지 둬 본 계획대로 톡 (어긋나면 다시 계획) */
export const rewindoneSmart: Bot<RewState> = {
  name: '시계 장인',
  act(s) {
    const m = mindOf(s), sk = skip(s, m);
    if (sk) return sk;
    if (s.down || m.up) return (m.up = false), NO;
    const W = s.W;
    if (W.hero.st === H_WIN || W.hero.st === H_FAIL) return NO;
    if (!m.plan) {
      const key = `${s.variant}:${s.stage}:start`;
      m.plan = W.t === 0 && W.used === 0 ? planCache.get(key) ?? null : null;
      if (!m.plan) {
        m.plan = planFrom(W);
        if (W.t === 0) planCache.set(key, m.plan);
        m.i = 0;
        // 계획의 시작이 지금보다 이르면(지금 세계에서 다시 세운 계획) 그대로
      }
      m.i = 0;
      while (m.i < m.plan.acts.length && m.plan.acts[m.i] < W.t - 30) m.i += 2;
    }
    // 바라던 결과가 아니면 다시 계획
    if (m.want >= 0) {
      const th = thingOf(W, m.want);
      const ok = th && (th.st === REW || th.st === HOLD || th.st === DONE || th.tau === 0);
      m.want = -1;
      if (!ok) {
        m.plan = planFrom(W);
        m.i = 0;
      }
    }
    const pl = m.plan;
    if (m.i < pl.acts.length && W.t >= pl.acts[m.i]) {
      const id = pl.acts[m.i + 1];
      m.i += 2;
      const th = thingOf(W, id);
      if (!th) return NO;
      m.want = id;
      m.up = true;
      return { tap: false, dir: 0, pointer: tapPoint(th) };
    }
    return NO;
  },
};
const habitMemo = new Map<string, number[]>();
/** 버릇 봇: 버릇 머리가 고른 물건을 톡 (같은 판이면 같은 결정 — 기억해 둔다) */
function habitBot(name: string, pick: (W: World) => number): Bot<RewState> {
  return {
    name,
    act(s) {
      const m = mindOf(s), sk = skip(s, m);
      if (sk) return sk;
      if (s.down || m.up) return (m.up = false), NO;
      const W = s.W;
      if (W.hero.st === H_WIN || W.hero.st === H_FAIL || W.t % DEC !== 0) return NO;
      const id = pick(W);
      if (id < 0) return NO;
      const th = thingOf(W, id)!;
      m.up = true;
      return { tap: false, dir: 0, pointer: tapPoint(th) };
    },
  };
}
void habitMemo;
/** 측정·조율용 (게임에는 안 씀) */
export const _dbg = { planFrom: (L: Level) => planFrom(newWorld(L)), trialHabit, habitFirst, habitNear, starsOf, newWorld, stepWorld };
export const rewindoneHabit: Bot<RewState> = habitBot('버릇: 먼저 움직인 것부터', habitFirst);
export const rewindoneHabit2: Bot<RewState> = habitBot('버릇: 주인공에 가까운 것', habitNear);
const dumbAt = new WeakMap<object, { next: number; until: number; p: { x: number; y: number } }>();
/** 못하는 봇: 아무 때나 아무 데나 톡 (화면 위 물건 근처를 더 자주) */
export const rewindoneRandom: Bot<RewState> = {
  name: '아무 데나 톡',
  act(s, rng) {
    let m = dumbAt.get(s);
    if (!m) dumbAt.set(s, (m = { next: 20 + Math.floor(rng() * 60), until: -1, p: { x: 0, y: 0 } }));
    if (s.t < m.until) return { tap: false, dir: 0, pointer: m.p };
    if (s.t < m.next) return NO;
    m.next = s.t + 40 + Math.floor(rng() * 120);
    m.until = s.t + 2 + Math.floor(rng() * 4);
    m.p = { x: 0.04 + rng() * 0.92, y: 0.12 + rng() * 0.74 };
    return { tap: false, dir: 0, pointer: m.p };
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
type C2 = CanvasRenderingContext2D;
function drawAll(ctx: C2, s: RewState, w: number, h: number, _th: Theme) {
  const fx = juice(s);
  ctx.save();
  fx.begin(ctx);
  ctx.fillStyle = '#bfe6ff';
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  void TOPH;
  void BOTY;
}
