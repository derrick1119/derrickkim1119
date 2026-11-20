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
/** 낭떠러지 앞에서 이만큼 떨어져 선다 (떨어지는 상자가 머리에 안 닿게) */
const LOOK = 0.04;
/** 제자리까지 되감은 뒤 쉬는 틱 · 다시 톡으로 멈춘 뒤 쉬는 틱 · 멈출 때 '걸림 자리'로 붙는 거리(τ) */
const HOLD_FULL = 110, HOLD_STOP = 100, SNAP = 90, SNAP_UP = 90;
/** 모래시계를 뒤집을 때마다 드는 모래 한 줌(틱) — 아무거나 다 되감으면 금방 바닥난다 */
const PINCH = 25;
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
  /** 크기(소리 높낮이) · 처음 움직인 틱 · 태어난 틱 · 부딪히면 다치나(0 = 물에 뜬 빈 통처럼 괜찮음) · 이번 되감기를 시작한 τ */
  big: number; moved: number; born: number; harm: number; rs: number;
  /** 제자리까지 되감은 뒤 쉬는 틱 (첫 판 다리는 넉넉히) */
  hf: number;
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
      D.x = P.x, D.y = P.y + th.h * 0.75, D.r = th.w * 0.36;
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
        if (!up && atR(q)) (plank(th, i, t1), E('plankLift', P.x, th.y + BR_DEPTH, i, th.id));
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
  th.hold = th.hf;
  E?.('origin', x, y, 0, th.id);
}
/** 걸림 자리(말뚝)에 걸 수 있나: 그 자리로 다가오는 중(조금 앞)이거나, 이번 되감기에서 막 지나쳤을 때 */
const canDock = (th: Thing) => th.dock >= 0 && ((th.tau >= th.dock && th.tau <= th.dock + SNAP) || (th.tau < th.dock && th.rs > th.dock && th.tau >= th.dock - SNAP_UP));
/** 되감기를 멈춘다 (다시 톡 · 모래 바닥) */
function stopRew(W: World, th: Thing, E: Sink, why: number) {
  W.rew = -1;
  th.st = HOLD;
  th.hold = HOLD_STOP;
  if (canDock(th)) {
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
  th.rs = th.tau;
  W.rew = th.id;
  W.taps++;
  const pinch = Math.min(PINCH, W.sand);
  W.sand -= pinch;
  W.used += pinch;
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
    x: bx, y: by, x2: tx, y2: ty - 0.035, w: 0.08, h: 0.16 + Math.abs(tx - bx) * 0.12, n: F, path: null, big: 0.4, moved: W.t, born: W.t, harm: 1, rs: 0, hf: HOLD_FULL,
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
        // 주인공이 올라탄 뗏목·통나무는 말뚝(걸림 자리)을 지나치지 않고 척 걸린다
        if (th.dock >= 0 && H.on === th.id && th.tau > th.dock && th.tau - RW <= th.dock) {
          th.tau = th.dock + 1;
          stopRew(W, th, E, 0);
          break;
        }
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
  // 한 발 앞 발판 (조금 더 앞까지 이어져 있어야 걷는다 — 낭떠러지 끝에 바짝 서지 않게)
  let nb = -9, ny = 0, nbest = 9;
  for (let i = 0; i < SUP.length; i += 4) {
    if (nx < SUP[i] || nx > SUP[i + 1]) continue;
    const dy = Math.abs(SUP[i + 2] - H.y);
    if (dy <= STEP && dy < nbest) (nbest = dy), (nb = SUP[i + 3]), (ny = SUP[i + 2]);
  }
  if (nb === -9) return wait(W, H, E);
  if (nx + LOOK < 1) {
    let ok = false;
    const fx = nx + LOOK;
    for (let i = 0; i < SUP.length && !ok; i += 4) if (fx >= SUP[i] && fx <= SUP[i + 1] && Math.abs(SUP[i + 2] - ny) <= STEP) ok = true;
    if (!ok) return wait(W, H, E);
  }
  // 길을 막은 도깨비 앞에서는 겁먹고 선다
  for (const a of W.ac) if (a.role === R_WALK && !a.ko && Math.abs(a.y - H.y) < 0.05 && a.x - H.x > 0 && a.x - H.x < 0.085) return wait(W, H, E);
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
  return { id: NID++, k, tau: 0, dur: 1, st: WAIT, hold: 1, owner: -1, rider: -1, dock: -1, x: 0, y: 0, x2: 0, y2: 0, w: 0, h: 0, n: 0, path: null, big: 1, moved: -1, born: 0, harm: 1, rs: 0, hf: HOLD_FULL, ...o };
}
/** 판이 시작되기 전에 이미 벌어진 일 (끝 자세에서 시작 — 되감기 값이 정해져 있다) */
function pre(th: Thing): Thing {
  th.tau = th.dur;
  th.st = FWD;
  th.hold = 0;
  th.moved = -60;
  return th;
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
      const br = bridgeT(0.4, 0.62, lane, 1);
      // 화면이 뜨자마자 삐걱 — 첫 판자는 0.1~0.2초 만에 떨어지기 시작
      br.st = FWD;
      br.hold = 0;
      br.moved = 0;
      br.tau = Math.round(rnd(r, 4, 8));
      // 첫 판: 다시 세운 다리는 오래 버틴다 (느린 사람도 건넌다)
      br.hf = 900;
      L.things.push(br);
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
      L.things.push(pre(bridgeT(0.62, 0.8, lane, 1)));
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
      // 꽃밭으로 떨어지는 화분 (길은 안 막는다 — 버릇 봇이 속는 것)
      const gm = Ac('grandma', R_DECO, 0.26, 0.5);
      L.actors.push(gm);
      L.things.push(potT(rnd(r, 0.2, 0.24), 0.5, Math.round(rnd(r, 4, 12)), gm.id, 0.77));
      L.deco.balc = L.things[2].x;
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
      L.things.push(raftT(0.6, lane - 0.16, 1.17, 0.21, Math.round(rnd(r, 10, 20)), -1, lane));
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
      L.things.push(T('gear', { path: gp, hold: Math.round(rnd(r, 26, 36)), owner: m.id, big: 1.4 }));
      L.things[0].dur = gp.length / 3 - 1;
      // 길을 막은 도깨비 (구르는 톱니에 꽈당 — 그 뒤에 되감아야)
      L.actors.push(Ac('walker', R_WALK, rnd(r, 0.37, 0.41), lane));
      // 창가 화분이 고양이 위로
      const gm = Ac('grandma', R_DECO, 0.84, 0.5), cat = Ac('cat', R_VILL, 0.79, lane);
      L.actors.push(gm, cat);
      L.things.push(potT(0.79, 0.5, Math.round(rnd(r, 60, 120)), gm.id, lane));
      L.deco.balc = 0.79;
      L.heroDelay = 140;
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
      L.ground = [0, 0.36, lane, 0.66, 1, UP3];
      L.gate = [0.36, 0.5, lane];
      L.shaft = [0.5, 0.66, UP3, lane];
      L.gearY = UP3;
      L.fallY = lane + 0.2;
      const m = Ac('machine', R_DECO, 0.15, 0.6);
      L.actors.push(m);
      const gp = rollPath([0.15, 0.64, 0.18, 0.7, 0.29, lane, 0.36, lane, 0.43, lane + 0.17], 0.05, 0.001, 0.00009, 0.0042, 18);
      L.things.push(T('gear', { path: gp, hold: Math.round(rnd(r, 14, 22)), owner: m.id, big: 1.4 }));
      L.things[0].dur = gp.length / 3 - 1;
      L.actors.push(Ac('walker', R_WALK, rnd(r, 0.27, 0.3), lane));
      L.things.push(crateT(0.58, UP3, lane, 0.17, Math.round(rnd(r, 60, 80))));
      const gx = rnd(r, 0.82, 0.9);
      L.actors.push(Ac('goblin', R_ARCH, gx, UP3, { next: Math.round(rnd(r, 150, 180)), per: 190 }));
      L.deco.roof = gx;
      L.heroDelay = 150;
      L.sand = 260;
      break;
    }
  }
  return L;
}

// ───────────────────────────── 앞을 셈 (같은 세계로) ─────────────────────────────
interface Out { win: boolean; fail: boolean; t: number; x: number; hurt: number; used: number; saved: number; stuck: boolean }
/** 아무것도 안 하고(또는 되감는 물건을 걸림 자리에서 멈추며) 앞으로 세어 본다 */
function rollout(W0: World, maxT = 1300, dockId = -1): Out {
  const W = cloneWorld(W0), H = W.hero, t0 = W.t;
  let still = 0;
  while (W.t - t0 < maxT) {
    if (dockId >= 0 && W.rew === dockId) {
      const th = thingOf(W, dockId)!;
      if (th.tau <= th.dock + 30) tapThing(W, th, null);
    }
    stepWorld(W, null);
    if (H.st === H_WIN || H.st === H_FAIL) break;
    if (H.st === H_WAIT) {
      still++;
      if (still > 420 && W.rew < 0) break;
    } else still = 0;
  }
  return { win: H.st === H_WIN, fail: H.st === H_FAIL, t: W.t, x: H.x, hurt: W.hurt, used: W.used, saved: W.saved, stuck: H.st === H_WAIT };
}
/** 결과의 값: 이기기 ≫ 안 다치게·구하기 ≫ 모래 아끼기 > 빨리 */
function value(o: Out): number {
  let v = -4 * o.used - 2500 * o.hurt + 2500 * o.saved;
  if (o.win) v += 30000 - 0.5 * o.t;
  else if (o.fail) v += 4000 * o.x;
  else v += 9000 + 4000 * o.x;
  return v;
}
/** 지금 톡 할 수 있는(되감을 수 있는) 물건 */
const tappable = (th: Thing) => th.st !== DONE && th.st !== REW && th.tau > 0;
const DEC = 6, LATER = 12;
function tryTap(W: World, id: number, toDock: boolean): number {
  const c = cloneWorld(W);
  tapThing(c, thingOf(c, id)!, null);
  return value(rollout(c, 1300, toDock ? id : -1));
}

/** 잘하는 머리: 지금 무엇을(또는 멈춤을) 톡 할까 — 같은 세계로 앞을 세어 본다. 돌려주는 값: 물건 id(-1 없음) · 걸림 자리에서 멈출 생각인가 */
const PICK = { id: -1, dock: false };
function decide(W: World, base: Out): typeof PICK {
  PICK.id = -1;
  PICK.dock = false;
  const bv = value(base);
  if (W.rew >= 0) {
    const c = cloneWorld(W);
    tapThing(c, thingOf(c, W.rew)!, null);
    if (value(rollout(c)) >= bv - 0.5) PICK.id = W.rew;
    return PICK;
  }
  if (base.win && base.hurt === 0) return PICK;
  let bestV = bv + 1;
  for (const th of W.th) {
    if (!tappable(th) || W.sand <= 0) continue;
    let vNow = tryTap(W, th.id, false), dk = false;
    if (th.dock >= 0 && th.tau > th.dock + 4) {
      const v2 = tryTap(W, th.id, true);
      if (v2 > vNow) (vNow = v2), (dk = true);
    }
    if (vNow <= bestV) continue;
    // 조금 뒤에 해도 똑같이 좋으면 기다린다 (되감기는 늦을수록 비싸지만, 다시 벌어지는 일은 너무 일찍 하면 헛일)
    const c2 = cloneWorld(W);
    for (let k = 0; k < LATER; k++) stepWorld(c2, null);
    const t2 = thingOf(c2, th.id);
    if (t2 && tappable(t2) && c2.hero.st !== H_FAIL) {
      tapThing(c2, t2, null);
      if (value(rollout(c2, 1300, dk ? th.id : -1)) >= vNow - 0.5) continue;
    }
    PICK.id = th.id;
    PICK.dock = dk;
    bestV = vNow;
  }
  return PICK;
}
/** 남은 계획을 그대로 따라 끝까지 세어 본다 (계획이 아직 맞는지 확인) */
function simPlan(W0: World, acts: number[], i0: number, maxT = 1800): Out {
  const W = cloneWorld(W0), H = W.hero, t0 = W.t;
  let i = i0;
  while (W.t - t0 < maxT && H.st !== H_WIN && H.st !== H_FAIL) {
    while (i < acts.length) {
      const th = thingOf(W, acts[i + 1]), ts = acts[i + 2];
      if (ts >= 0) {
        if (!th || th.st !== REW) (i += 3);
        else if (th.tau <= ts) (tapThing(W, th, null), (i += 3));
        else break;
      } else if (W.t >= acts[i]) {
        if (th && tappable(th)) tapThing(W, th, null);
        i += 3;
      } else break;
    }
    stepWorld(W, null);
  }
  return { win: H.st === H_WIN, fail: H.st === H_FAIL, t: W.t, x: H.x, hurt: W.hurt, used: W.used, saved: W.saved, stuck: H.st === H_WAIT };
}
/** 판 하나를 처음부터 끝까지 잘하는 머리로 둬 본다 → 할 일 목록 [틱, 물건 id, 멈출 τ(-1이면 되감기 시작)] */
interface Plan { acts: number[]; used: number; win: boolean; hurt: number; saved: number; t: number }
function planFrom(W0: World, maxT = 3600): Plan {
  const W = cloneWorld(W0), acts: number[] = [];
  let intent = -1;
  let base = rollout(W);
  const t0 = W.t;
  while (W.t - t0 < maxT && W.hero.st !== H_WIN && W.hero.st !== H_FAIL) {
    if (W.t % DEC === 0) {
      const p = decide(W, base);
      if (p.id >= 0) {
        const wasRew = W.rew === p.id;
        acts.push(W.t, p.id, wasRew ? thingOf(W, p.id)!.tau : -1);
        tapThing(W, thingOf(W, p.id)!, null);
        intent = !wasRew && p.dock ? p.id : -1;
        base = rollout(W, 1300, intent);
      }
    }
    stepWorld(W, null);
    if (W.rew < 0) intent = -1;
    if (W.t % DEC === 0 && (base.t <= W.t || W.rew >= 0)) base = rollout(W, 1300, intent);
  }
  return { acts, used: W.used, win: W.hero.st === H_WIN, hurt: W.hurt, saved: W.saved, t: W.t - t0 };
}

// ───────────────────────────── 버릇 봇의 머리 ─────────────────────────────
/** 버릇 1: 쉬는 틈만 나면 '가장 먼저 움직이기 시작한 것'을 되감는다 (끝까지) */
function habitFirst(W: World): number {
  if (W.rew >= 0 || W.sand <= 0) return -1;
  let best: Thing | null = null;
  for (const th of W.th) if (tappable(th) && th.st === FWD && (!best || th.moved < best.moved)) best = th;
  return best ? best.id : -1;
}
/** 버릇 2: 곧 일이 나면(주인공이 막히거나 맞거나 누가 다치면) '주인공에 가장 가까운 것'을 되감는다 (끝까지) */
function habitNear(W: World): number {
  if (W.rew >= 0 || W.sand <= 0) return -1;
  const o = rollout(W, 75);
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
    L.par = Math.max(30, Math.ceil((pl.used + 20) / 6) * 6);
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
    s.spot = { x: sx, y: sy, r: 0.11, label: d.spot, t: s.t + 150 };
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
    // 배우는 판: 어디를 톡 해도 움직인 물건 중 가장 가까운 것 (처음 하는 사람의 첫 손길은 반드시 '착!')
    let bd2 = s.stage === 0 ? 3 : 0.3;
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
      if (kind === 'plankMend') {
        const th = thingOf(s.W, id);
        if (th && v !== th.n - 1) return;
      }
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
            if (STAGES[s.stage].ch !== STAGES[s.stage - 1].ch) (s.phase = 'chapter'), (s.pt = 0), ev(s, 'chapter', 0.5, 0.5);
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
interface Mind { stage: number; tries: number; plan: Plan | null; i: number; up: boolean; want: number; again: boolean }
const minds = new WeakMap<object, Mind>();
function mindOf(s: RewState): Mind {
  let m = minds.get(s);
  if (!m) minds.set(s, (m = { stage: -1, tries: -1, plan: null, i: 0, up: false, want: -1, again: false }));
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
/** 잘하는 봇: 판마다 같은 세계로 끝까지 둬 본 계획대로 톡. 멈춤은 'τ가 여기까지 오면'으로 따르고, 세계가 계획과 어긋나면 다시 계획 */
export const rewindoneSmart: Bot<RewState> = {
  name: '시계 장인',
  act(s) {
    const m = mindOf(s), sk = skip(s, m);
    if (sk) return sk;
    if (s.down || m.up) return (m.up = false), NO;
    const W = s.W;
    if (W.hero.st === H_WIN || W.hero.st === H_FAIL) return NO;
    if (m.again && m.plan) {
      // 늦게 눌렀다: 남은 계획이 여전히 같은 결과를 내면 그대로, 나빠지면 다시 세운다
      m.again = false;
      const o = simPlan(W, m.plan.acts, m.i);
      if (!o.win || o.hurt > m.plan.hurt || o.used > m.plan.used + 4 || o.saved < m.plan.saved) {
        m.plan = planFrom(W);
        m.i = 0;
      }
    }
    if (!m.plan) {
      const key = `${s.variant}:${s.stage}:start`;
      m.plan = W.t === 0 && W.used === 0 ? planCache.get(key) ?? null : null;
      if (!m.plan) {
        m.plan = planFrom(W);
        if (W.t === 0 && W.used === 0) planCache.set(key, m.plan);
      }
      m.i = 0;
    }
    const pl = m.plan, a = pl.acts;
    const replan = () => {
      m.plan = planFrom(W);
      m.i = 0;
    };
    if (m.i >= a.length) {
      // 계획이 끝났는데 앞으로 셈이 '이김'이 아니면 다시
      if (W.t % 30 < REACT_SMART && W.rew < 0 && W.sand > 0) {
        const o = rollout(W);
        if (!o.win || o.hurt > W.hurt) replan();
      }
      return NO;
    }
    const id = a[m.i + 1], ts = a[m.i + 2], th = thingOf(W, id);
    if (ts >= 0) {
      // 멈춤: 되감는 중이 아니면 지나간 일 · τ가 목표까지 오면 톡
      if (!th || th.st !== REW) return (m.i += 3), NO;
      if (th.tau > ts) return NO;
      m.i += 3;
      m.up = true;
      return { tap: false, dir: 0, pointer: tapPoint(th) };
    }
    if (W.t < a[m.i]) return NO;
    const late = W.t - a[m.i];
    m.i += 3;
    if (!th || !tappable(th)) {
      replan();
      return NO;
    }
    // 늦게 누르면(사람 속도·느린 화면) 남은 계획이 그 세계에 안 맞을 수 있다 — 누른 뒤 확인
    if (late > 0) m.again = true;
    m.up = true;
    return { tap: false, dir: 0, pointer: tapPoint(th) };
  },
};
const REACT_SMART = 3;
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
      if (W.hero.st === H_WIN || W.hero.st === H_FAIL || W.t < m.want) return NO;
      m.want = W.t + DEC;
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
export const _dbg = { jump: (s: RewState, st: number) => ((s.stage = st), (s.fixed = st), (s.gears = st), newStage(s)), rollout, value, tryTap, tap: (W: World, th: Thing, E: Sink) => tapThing(W, th, E), rawLevel, planFrom: (L: Level) => planFrom(newWorld(L)), trialHabit, habitFirst, habitNear, starsOf, newWorld, stepWorld };
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
const TAU2 = Math.PI * 2;
const cl01 = (q: number) => Math.max(0, Math.min(1, q));
const hsh = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
function ell(ctx: C2, x: number, y: number, rx: number, ry: number, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU2);
}
function rr(ctx: C2, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, Math.max(0.1, w), Math.max(0.1, h), Math.max(0, Math.min(r, w / 2, h / 2)));
}
function lin(ctx: C2, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}
function starPath(ctx: C2, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5, q = k % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
  }
  ctx.closePath();
}
function heartPath(ctx: C2, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.9);
  ctx.bezierCurveTo(x - r * 1.5, y - r * 0.1, x - r * 0.8, y - r * 1.2, x, y - r * 0.4);
  ctx.bezierCurveTo(x + r * 0.8, y - r * 1.2, x + r * 1.5, y - r * 0.1, x, y + r * 0.9);
}
/** 톱니바퀴 모양 (바깥 톱니 + 가운데 구멍) */
function gearPath(ctx: C2, x: number, y: number, r: number, n: number, rot: number, hole = 0.35) {
  ctx.beginPath();
  for (let k = 0; k < n * 2; k++) {
    const a0 = rot + (k * Math.PI) / n, a1 = rot + ((k + 1) * Math.PI) / n, q = k % 2 ? r * 0.8 : r;
    ctx.lineTo(x + Math.cos(a0 + 0.06) * q, y + Math.sin(a0 + 0.06) * q);
    ctx.lineTo(x + Math.cos(a1 - 0.06) * q, y + Math.sin(a1 - 0.06) * q);
  }
  ctx.closePath();
  ctx.moveTo(x + r * hole, y);
  ctx.arc(x, y, r * hole, 0, TAU2, true);
}
function brass(ctx: C2, x: number, y: number, r: number, n: number, rot: number, glow = 0) {
  if (glow > 0) {
    ctx.fillStyle = `rgba(255,220,120,${0.3 * glow})`;
    ell(ctx, x, y, r * 1.6, r * 1.6);
    ctx.fill();
  }
  ctx.fillStyle = lin(ctx, x - r, y - r, x + r, y + r, [[0, '#ffe08a'], [0.5, '#f2b544'], [1, '#c4841c']]);
  gearPath(ctx, x, y, r, n, rot);
  ctx.fill('evenodd');
  ctx.strokeStyle = '#8a5a10';
  ctx.lineWidth = Math.max(1, r * 0.08);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.45)';
  ell(ctx, x - r * 0.35, y - r * 0.45, r * 0.25, r * 0.12, -0.6);
  ctx.fill();
}
function shadow(ctx: C2, x: number, y: number, rx: number, a = 0.22) {
  ctx.fillStyle = `rgba(70,45,40,${a})`;
  ell(ctx, x, y, rx, rx * 0.28);
  ctx.fill();
}
/** 시계 문양: 되감는 물건 둘레에 번쩍 — 바늘이 거꾸로 돈다 */
function clockGlyph(ctx: C2, x: number, y: number, r: number, t: number, a: number) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.strokeStyle = '#7fe8ff';
  ctx.lineWidth = Math.max(2, r * 0.07);
  ctx.shadowColor = '#5fd8ff';
  ctx.shadowBlur = r * 0.35;
  ell(ctx, x, y, r, r);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.lineWidth = Math.max(1.5, r * 0.04);
  for (let k = 0; k < 12; k++) {
    const an = (k / 12) * TAU2, q0 = k % 3 ? 0.86 : 0.78;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(an) * r * q0, y + Math.sin(an) * r * q0);
    ctx.lineTo(x + Math.cos(an) * r * 0.95, y + Math.sin(an) * r * 0.95);
    ctx.stroke();
  }
  // 거꾸로 도는 바늘
  const h1 = -t * 0.25, h2 = -t * 0.06;
  ctx.lineWidth = Math.max(2, r * 0.06);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(h1) * r * 0.72, y + Math.sin(h1) * r * 0.72);
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(h2) * r * 0.45, y + Math.sin(h2) * r * 0.45);
  ctx.stroke();
  // 거꾸로 화살표
  ctx.beginPath();
  ctx.arc(x, y, r * 1.12, -1.9, -0.6);
  ctx.stroke();
  const ax = x + Math.cos(-1.9) * r * 1.12, ay = y + Math.sin(-1.9) * r * 1.12;
  ctx.beginPath();
  ctx.moveTo(ax - r * 0.12, ay - r * 0.02);
  ctx.lineTo(ax + r * 0.02, ay + r * 0.12);
  ctx.lineTo(ax + r * 0.08, ay - r * 0.1);
  ctx.closePath();
  ctx.fillStyle = '#7fe8ff';
  ctx.fill();
  ctx.restore();
}
/** 작은 모래시계 아이콘 */
function hourglass(ctx: C2, x: number, y: number, r: number, fill: number, flip: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(flip * Math.PI);
  ctx.fillStyle = '#8a5a2a';
  rr(ctx, -r * 0.75, -r * 1.12, r * 1.5, r * 0.22, r * 0.08);
  ctx.fill();
  rr(ctx, -r * 0.75, r * 0.9, r * 1.5, r * 0.22, r * 0.08);
  ctx.fill();
  ctx.fillStyle = 'rgba(220,245,255,.85)';
  ctx.beginPath();
  ctx.moveTo(-r * 0.6, -r * 0.9);
  ctx.lineTo(r * 0.6, -r * 0.9);
  ctx.lineTo(r * 0.1, 0);
  ctx.lineTo(r * 0.6, r * 0.9);
  ctx.lineTo(-r * 0.6, r * 0.9);
  ctx.lineTo(-r * 0.1, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#6a4a2a';
  ctx.lineWidth = Math.max(1, r * 0.1);
  ctx.stroke();
  ctx.fillStyle = '#ffc94a';
  const top = cl01(fill);
  ctx.beginPath();
  ctx.moveTo(-r * 0.5 * top, -r * 0.08 - r * 0.75 * top);
  ctx.lineTo(r * 0.5 * top, -r * 0.08 - r * 0.75 * top);
  ctx.lineTo(0, -r * 0.05);
  ctx.closePath();
  ctx.fill();
  const bot = 1 - top;
  ctx.beginPath();
  ctx.moveTo(-r * 0.55, r * 0.88);
  ctx.lineTo(r * 0.55, r * 0.88);
  ctx.lineTo(r * 0.55 * (1 - bot * 0.7), r * 0.88 - r * 0.7 * bot);
  ctx.lineTo(-r * 0.55 * (1 - bot * 0.7), r * 0.88 - r * 0.7 * bot);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
function drawHand(ctx: C2, x: number, y: number, k: number, press: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.35);
  ctx.scale(1 - press * 0.12, 1 - press * 0.12);
  ctx.fillStyle = 'rgba(40,20,40,.25)';
  ell(ctx, k * 0.1, k * 1.25, k * 0.5, k * 0.16);
  ctx.fill();
  ctx.fillStyle = '#fff3e6';
  ctx.strokeStyle = '#6a3a4a';
  ctx.lineWidth = Math.max(1.5, k * 0.07);
  rr(ctx, -k * 0.16, -k * 0.95, k * 0.32, k * 0.95, k * 0.16);
  ctx.fill();
  ctx.stroke();
  rr(ctx, -k * 0.45, -k * 0.15, k * 0.95, k * 0.95, k * 0.3);
  ctx.fill();
  ctx.stroke();
  for (let q = 0; q < 2; q++) {
    rr(ctx, k * (0.12 + q * 0.2) - k * 0.1, -k * 0.35, k * 0.22, k * 0.4, k * 0.1);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

// ── 캐릭터 ──
type Mood = 'idle' | 'happy' | 'shock' | 'worry' | 'dizzy' | 'wet' | 'cheer' | 'sleep' | 'grin';
/** 꼬마 시계공 부엉이 (발 위치 x,y · u = 몸 단위 px, 키 약 11u) */
function drawOwl(ctx: C2, x: number, y: number, u: number, mood: Mood, t: number, walk: number, tilt = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  const bob = walk ? Math.abs(Math.sin(t * 0.32)) * 0.5 * u : mood === 'cheer' ? Math.abs(Math.sin(t * 0.3)) * 1.6 * u : 0;
  ctx.translate(0, -bob);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // 발
  const st = walk ? Math.sin(t * 0.32) : 0;
  ctx.fillStyle = '#ff9d2a';
  ell(ctx, -1.3 * u + st * 0.6 * u, -0.25 * u, 1.05 * u, 0.5 * u);
  ctx.fill();
  ell(ctx, 1.3 * u - st * 0.6 * u, -0.25 * u, 1.05 * u, 0.5 * u);
  ctx.fill();
  // 몸통
  ctx.fillStyle = lin(ctx, -3.8 * u, -8 * u, 3.8 * u, 0, [[0, '#c98d4e'], [0.6, '#a8703a'], [1, '#7e5028']]);
  ell(ctx, 0, -4.4 * u, 3.9 * u, 4.4 * u);
  ctx.fill();
  // 귀깃
  ctx.fillStyle = '#8a5a2c';
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sd * 1.9 * u, -7.6 * u);
    ctx.lineTo(sd * 3.4 * u, -9.9 * u + Math.sin(t * 0.1 + sd) * 0.2 * u);
    ctx.lineTo(sd * 3.3 * u, -6.8 * u);
    ctx.closePath();
    ctx.fill();
  }
  // 배 깃털
  ctx.fillStyle = '#f7e6c4';
  ell(ctx, 0, -3.4 * u, 2.5 * u, 2.9 * u);
  ctx.fill();
  ctx.strokeStyle = 'rgba(170,120,70,.45)';
  ctx.lineWidth = Math.max(1, 0.18 * u);
  for (let r = 0; r < 3; r++)
    for (let c = -1; c <= 1; c++) {
      ctx.beginPath();
      ctx.arc(c * 0.9 * u + (r % 2) * 0.45 * u, -4.8 * u + r * 0.95 * u, 0.42 * u, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }
  // 연장 띠 · 렌치
  ctx.fillStyle = '#6a3c1e';
  rr(ctx, -3.5 * u, -2.2 * u, 7 * u, 0.9 * u, 0.4 * u);
  ctx.fill();
  ctx.fillStyle = '#ffcf4a';
  rr(ctx, -0.5 * u, -2.25 * u, 1 * u, 1 * u, 0.2 * u);
  ctx.fill();
  ctx.fillStyle = '#c8ccd8';
  rr(ctx, 2.2 * u, -2.8 * u, 0.45 * u, 2 * u, 0.2 * u);
  ctx.fill();
  // 날개
  const up = mood === 'cheer' || mood === 'shock' || mood === 'dizzy';
  ctx.fillStyle = '#946033';
  for (const sd of [-1, 1]) {
    ctx.save();
    ctx.translate(sd * 3.5 * u, -4.4 * u);
    ctx.rotate(sd * (up ? -1.1 + Math.sin(t * 0.5) * 0.25 : mood === 'worry' ? 0.35 : 0.15 + (walk ? Math.sin(t * 0.32) * 0.12 * sd : 0)));
    ell(ctx, 0, 1.3 * u, 1.05 * u, 2.3 * u);
    ctx.fill();
    ctx.restore();
  }
  // 얼굴판
  ctx.fillStyle = '#e9c48e';
  ell(ctx, -1.45 * u, -6.1 * u, 1.75 * u, 1.7 * u);
  ctx.fill();
  ell(ctx, 1.45 * u, -6.1 * u, 1.75 * u, 1.7 * u);
  ctx.fill();
  // 눈
  const ey = -6.1 * u;
  if (mood === 'happy' || mood === 'cheer') {
    ctx.strokeStyle = '#2a1a10';
    ctx.lineWidth = Math.max(1.5, 0.4 * u);
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(sd * 1.45 * u, ey + 0.3 * u, 0.85 * u, Math.PI + 0.3, -0.3);
      ctx.stroke();
    }
  } else if (mood === 'dizzy') {
    ctx.strokeStyle = '#2a1a10';
    ctx.lineWidth = Math.max(1.2, 0.3 * u);
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      for (let k = 0; k < 14; k++) {
        const a = k * 0.8 + t * 0.2, q = 0.08 * k * u;
        ctx.lineTo(sd * 1.45 * u + Math.cos(a) * q, ey + Math.sin(a) * q);
      }
      ctx.stroke();
    }
  } else if (mood === 'sleep') {
    ctx.strokeStyle = '#2a1a10';
    ctx.lineWidth = Math.max(1.5, 0.35 * u);
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sd * 1.45 * u - 0.8 * u, ey);
      ctx.lineTo(sd * 1.45 * u + 0.8 * u, ey);
      ctx.stroke();
    }
  } else {
    const big = mood === 'shock' ? 1.18 : 1, pr = mood === 'shock' ? 0.45 : mood === 'worry' ? 0.6 : 0.68;
    const lookY = mood === 'worry' ? 0.35 * u : 0;
    for (const sd of [-1, 1]) {
      ctx.fillStyle = '#ffffff';
      ell(ctx, sd * 1.45 * u, ey, 1.25 * u * big, 1.25 * u * big);
      ctx.fill();
      ctx.strokeStyle = '#ffb02e';
      ctx.lineWidth = Math.max(1, 0.25 * u);
      ctx.stroke();
      ctx.fillStyle = '#1e1414';
      const blink = mood === 'idle' && t % 180 < 6 ? 0.15 : 1;
      ell(ctx, sd * 1.45 * u + 0.25 * u, ey + lookY, pr * u, pr * u * blink);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ell(ctx, sd * 1.45 * u + 0.05 * u, ey - 0.3 * u + lookY, 0.25 * u, 0.25 * u);
      ctx.fill();
    }
    if (mood === 'worry') {
      ctx.strokeStyle = '#5a3418';
      ctx.lineWidth = Math.max(1.2, 0.3 * u);
      for (const sd of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(sd * 0.6 * u, -7.5 * u);
        ctx.lineTo(sd * 2.4 * u, -7.9 * u);
        ctx.stroke();
      }
      // 땀방울
      ctx.fillStyle = '#7fd0ff';
      const dy = (t % 60) / 60;
      ell(ctx, 3.3 * u, -7 * u + dy * 2 * u, 0.4 * u, 0.6 * u);
      ctx.fill();
    }
  }
  // 부리
  ctx.fillStyle = '#ff9d2a';
  ctx.beginPath();
  if (mood === 'shock' || mood === 'cheer') {
    ctx.moveTo(-0.5 * u, -5.1 * u);
    ctx.lineTo(0.5 * u, -5.1 * u);
    ctx.lineTo(0, -4.0 * u);
  } else {
    ctx.moveTo(-0.55 * u, -5.3 * u);
    ctx.lineTo(0.55 * u, -5.3 * u);
    ctx.lineTo(0, -4.4 * u);
  }
  ctx.closePath();
  ctx.fill();
  // 모자 (초록 모자 + 고글 + 톱니 휘장)
  ctx.fillStyle = '#3aa86a';
  ctx.beginPath();
  ctx.ellipse(0, -8.1 * u, 2.6 * u, 1.3 * u, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#2a8a52';
  rr(ctx, -3 * u, -8.25 * u, 6 * u, 0.6 * u, 0.3 * u);
  ctx.fill();
  ctx.fillStyle = '#5a6a7a';
  rr(ctx, -2.2 * u, -8.85 * u, 4.4 * u, 0.55 * u, 0.25 * u);
  ctx.fill();
  for (const sd of [-1, 1]) {
    ctx.fillStyle = '#9ad8ff';
    ell(ctx, sd * 1.1 * u, -8.6 * u, 0.62 * u, 0.5 * u);
    ctx.fill();
    ctx.strokeStyle = '#3a4a5a';
    ctx.lineWidth = Math.max(1, 0.2 * u);
    ctx.stroke();
  }
  brass(ctx, 0, -9.35 * u, 0.62 * u, 6, t * 0.05);
  ctx.restore();
}

interface Spec { fur: string; furD: string; belly: string; ear: 'long' | 'round' | 'point' | 'horn' | 'none'; snout: 'pig' | 'fox' | 'cat' | 'mole' | 'beaver' | 'none' | 'duck'; acc: string; s: number }
const SPECIES: Record<string, Spec> = {
  grandma: { fur: '#f5efe8', furD: '#d9cfc4', belly: '#ffffff', ear: 'long', snout: 'none', acc: 'shawl', s: 1 },
  farmer: { fur: '#f6b3b0', furD: '#e08a8a', belly: '#ffd6d3', ear: 'point', snout: 'pig', acc: 'straw', s: 1.08 },
  kid: { fur: '#f58a3a', furD: '#d0682a', belly: '#fff3e0', ear: 'point', snout: 'fox', acc: 'scarf', s: 0.82 },
  mom: { fur: '#f08a3a', furD: '#c8622a', belly: '#fff3e0', ear: 'point', snout: 'fox', acc: 'apron', s: 1 },
  cat: { fur: '#f7a64a', furD: '#d8822a', belly: '#fff2dc', ear: 'point', snout: 'cat', acc: 'bell', s: 0.72 },
  beaver: { fur: '#a8703f', furD: '#7e5028', belly: '#e8c49a', ear: 'round', snout: 'beaver', acc: 'helmet', s: 0.95 },
  mole: { fur: '#7a6a80', furD: '#5a4a60', belly: '#a898b0', ear: 'none', snout: 'mole', acc: 'lamp', s: 0.9 },
  goblin: { fur: '#7cd07a', furD: '#4ea05a', belly: '#b8f0a8', ear: 'horn', snout: 'none', acc: 'bow', s: 0.92 },
  walker: { fur: '#7fb0ff', furD: '#5a84d8', belly: '#c8dcff', ear: 'horn', snout: 'none', acc: 'club', s: 1.05 },
  duck: { fur: '#ffe05a', furD: '#f0b830', belly: '#fff3a0', ear: 'none', snout: 'duck', acc: '', s: 0.55 },
};
/** 마을 사람·도깨비 (발 위치 x,y · u 단위 px) */
function critter(ctx: C2, k: string, x: number, y: number, u: number, mood: Mood, t: number, dir = 1, arms = 0) {
  const sp = SPECIES[k] ?? SPECIES.kid;
  u *= sp.s;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const bob = mood === 'cheer' || mood === 'happy' ? Math.abs(Math.sin(t * 0.25)) * 1.2 * u : Math.sin(t * 0.06) * 0.15 * u;
  if (mood === 'dizzy' && (k === 'goblin' || k === 'walker')) {
    // 꽈당 — 뒤로 누워 버둥
    ctx.rotate(-1.35);
    ctx.translate(-3 * u, -1.5 * u);
  }
  ctx.translate(0, -bob);
  if (sp.snout === 'duck') {
    ctx.fillStyle = sp.fur;
    ell(ctx, 0, -2 * u, 3 * u, 2 * u);
    ctx.fill();
    ell(ctx, 2.2 * u, -4.2 * u, 1.6 * u, 1.6 * u);
    ctx.fill();
    ctx.fillStyle = '#ff8a2a';
    ell(ctx, 3.9 * u, -4 * u, 0.9 * u, 0.45 * u);
    ctx.fill();
    ctx.fillStyle = '#1e1414';
    ell(ctx, 2.6 * u, -4.6 * u, 0.32 * u, 0.32 * u);
    ctx.fill();
    ctx.restore();
    return;
  }
  // 꼬리
  ctx.strokeStyle = sp.furD;
  ctx.fillStyle = sp.furD;
  if (k === 'cat') {
    ctx.lineWidth = 1.1 * u;
    ctx.beginPath();
    ctx.moveTo(-2.4 * u, -1.6 * u);
    ctx.quadraticCurveTo(-5.2 * u, -2 * u + Math.sin(t * 0.12) * u, -4.4 * u, -5.4 * u);
    ctx.stroke();
  } else if (k === 'kid' || k === 'mom') {
    ctx.fillStyle = sp.fur;
    ell(ctx, -3.2 * u, -2.2 * u, 2.3 * u, 1.1 * u, -0.5 + Math.sin(t * 0.1) * 0.1);
    ctx.fill();
    ctx.fillStyle = '#fff6ea';
    ell(ctx, -5 * u, -3.2 * u, 0.8 * u, 0.6 * u, -0.5);
    ctx.fill();
  } else if (k === 'beaver') {
    ctx.fillStyle = '#6a4a3a';
    ell(ctx, -3.2 * u, -0.8 * u, 2.4 * u, 0.9 * u, 0.2);
    ctx.fill();
  }
  // 다리
  ctx.fillStyle = sp.furD;
  ell(ctx, -1.1 * u, -0.35 * u, 0.95 * u, 0.5 * u);
  ctx.fill();
  ell(ctx, 1.1 * u, -0.35 * u, 0.95 * u, 0.5 * u);
  ctx.fill();
  // 몸
  ctx.fillStyle = lin(ctx, -2.6 * u, -5 * u, 2.6 * u, 0, [[0, sp.fur], [1, sp.furD]]);
  ell(ctx, 0, -2.6 * u, 2.5 * u, 2.6 * u);
  ctx.fill();
  ctx.fillStyle = sp.belly;
  ell(ctx, 0.3 * u, -2.3 * u, 1.5 * u, 1.8 * u);
  ctx.fill();
  if (sp.acc === 'apron') {
    ctx.fillStyle = '#ffffff';
    rr(ctx, -1.4 * u, -3.4 * u, 2.8 * u, 3 * u, 0.6 * u);
    ctx.fill();
  }
  if (sp.acc === 'shawl') {
    ctx.fillStyle = '#d0608a';
    ctx.beginPath();
    ctx.moveTo(-2.6 * u, -4.4 * u);
    ctx.lineTo(2.6 * u, -4.4 * u);
    ctx.lineTo(0.2 * u, -1.4 * u);
    ctx.closePath();
    ctx.fill();
  }
  // 팔
  ctx.strokeStyle = sp.furD;
  ctx.lineWidth = 1.1 * u;
  const raise = arms || mood === 'cheer' || mood === 'shock';
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sd * 1.9 * u, -3.4 * u);
    if (raise) ctx.lineTo(sd * 3.2 * u, -5.8 * u + Math.sin(t * 0.4 + sd) * 0.4 * u);
    else ctx.lineTo(sd * 2.8 * u, -1.8 * u);
    ctx.stroke();
  }
  // 무기
  if (sp.acc === 'bow') {
    ctx.strokeStyle = '#8a5228';
    ctx.lineWidth = 0.55 * u;
    ctx.beginPath();
    ctx.arc(3.2 * u, -4 * u, 2.6 * u, -1.3, 1.3);
    ctx.stroke();
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 0.2 * u;
    ctx.beginPath();
    ctx.moveTo(3.2 * u + Math.cos(-1.3) * 2.6 * u, -4 * u + Math.sin(-1.3) * 2.6 * u);
    ctx.lineTo(3.2 * u + (arms ? -1.6 * u : 0), -4 * u);
    ctx.lineTo(3.2 * u + Math.cos(1.3) * 2.6 * u, -4 * u + Math.sin(1.3) * 2.6 * u);
    ctx.stroke();
  } else if (sp.acc === 'club') {
    ctx.save();
    ctx.translate(3 * u, -3.4 * u);
    ctx.rotate(-0.5 + Math.sin(t * 0.08) * 0.2);
    ctx.fillStyle = '#b5733f';
    rr(ctx, -0.6 * u, -5 * u, 1.6 * u, 5 * u, 0.8 * u);
    ctx.fill();
    ctx.fillStyle = '#e8e0d0';
    for (let q = 0; q < 3; q++) (ell(ctx, 0.2 * u, -4.2 * u + q * 1.2 * u, 0.25 * u, 0.25 * u), ctx.fill());
    ctx.restore();
  }
  // 머리
  const hy = -6.4 * u, hr = 2.3 * u;
  ctx.fillStyle = sp.fur;
  if (sp.ear === 'long') {
    for (const sd of [-1, 1]) {
      ctx.save();
      ctx.translate(sd * 0.9 * u, hy - 1.6 * u);
      ctx.rotate(sd * 0.25 + Math.sin(t * 0.07 + sd) * 0.06);
      ctx.fillStyle = sp.fur;
      ell(ctx, 0, -2 * u, 0.85 * u, 2.4 * u);
      ctx.fill();
      ctx.fillStyle = '#ffc0cc';
      ell(ctx, 0, -1.9 * u, 0.4 * u, 1.7 * u);
      ctx.fill();
      ctx.restore();
    }
  } else if (sp.ear === 'point') {
    for (const sd of [-1, 1]) {
      ctx.fillStyle = sp.fur;
      ctx.beginPath();
      ctx.moveTo(sd * 0.6 * u, hy - 1.8 * u);
      ctx.lineTo(sd * 2.2 * u, hy - 3.6 * u);
      ctx.lineTo(sd * 2.3 * u, hy - 0.6 * u);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = k === 'farmer' ? '#e88a88' : '#3a2a2a';
      ctx.beginPath();
      ctx.moveTo(sd * 1.1 * u, hy - 1.8 * u);
      ctx.lineTo(sd * 2.0 * u, hy - 3 * u);
      ctx.lineTo(sd * 2.0 * u, hy - 1.2 * u);
      ctx.closePath();
      ctx.fill();
    }
  } else if (sp.ear === 'round') {
    for (const sd of [-1, 1]) (ell(ctx, sd * 1.8 * u, hy - 1.7 * u, 0.8 * u, 0.8 * u), (ctx.fillStyle = sp.furD), ctx.fill());
  }
  ctx.fillStyle = lin(ctx, 0, hy - hr, 0, hy + hr, [[0, sp.fur], [1, sp.furD]]);
  ell(ctx, 0, hy, hr, hr * 0.95);
  ctx.fill();
  if (sp.ear === 'horn') {
    ctx.fillStyle = '#ffe08a';
    ctx.beginPath();
    ctx.moveTo(-0.5 * u, hy - 1.9 * u);
    ctx.lineTo(0.2 * u, hy - 3.9 * u);
    ctx.lineTo(0.8 * u, hy - 1.8 * u);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#c8a040';
    ctx.lineWidth = Math.max(1, 0.2 * u);
    ctx.stroke();
  }
  // 주둥이
  if (sp.snout === 'pig') {
    ctx.fillStyle = '#ff9a9a';
    ell(ctx, 0.9 * u, hy + 0.6 * u, 1 * u, 0.75 * u);
    ctx.fill();
    ctx.fillStyle = '#c86a6a';
    ell(ctx, 0.6 * u, hy + 0.6 * u, 0.18 * u, 0.28 * u);
    ctx.fill();
    ell(ctx, 1.2 * u, hy + 0.6 * u, 0.18 * u, 0.28 * u);
    ctx.fill();
  } else if (sp.snout === 'fox' || sp.snout === 'cat') {
    ctx.fillStyle = sp.belly;
    ell(ctx, 0.8 * u, hy + 0.8 * u, 1.2 * u, 0.8 * u);
    ctx.fill();
    ctx.fillStyle = '#3a2020';
    ell(ctx, 1.5 * u, hy + 0.45 * u, 0.32 * u, 0.24 * u);
    ctx.fill();
  } else if (sp.snout === 'mole') {
    ctx.fillStyle = '#ff9ab0';
    ell(ctx, 1.6 * u, hy + 0.4 * u, 0.6 * u, 0.5 * u);
    ctx.fill();
  } else if (sp.snout === 'beaver') {
    ctx.fillStyle = sp.belly;
    ell(ctx, 0.8 * u, hy + 0.8 * u, 1.1 * u, 0.75 * u);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    rr(ctx, 0.5 * u, hy + 1.2 * u, 0.7 * u, 0.9 * u, 0.15 * u);
    ctx.fill();
    ctx.fillStyle = '#3a2020';
    ell(ctx, 1.3 * u, hy + 0.4 * u, 0.3 * u, 0.22 * u);
    ctx.fill();
  }
  // 눈
  ctx.fillStyle = '#1e1414';
  ctx.strokeStyle = '#1e1414';
  ctx.lineWidth = Math.max(1.2, 0.3 * u);
  const ex = 0.75 * u, ey2 = hy - 0.4 * u;
  if (mood === 'happy' || mood === 'cheer') {
    for (const sd of [-1, 1]) (ctx.beginPath(), ctx.arc(sd * ex + 0.3 * u, ey2 + 0.2 * u, 0.45 * u, Math.PI + 0.3, -0.3), ctx.stroke());
  } else if (mood === 'dizzy') {
    for (const sd of [-1, 1]) {
      const cx = sd * ex + 0.3 * u;
      ctx.beginPath();
      ctx.moveTo(cx - 0.4 * u, ey2 - 0.4 * u);
      ctx.lineTo(cx + 0.4 * u, ey2 + 0.4 * u);
      ctx.moveTo(cx + 0.4 * u, ey2 - 0.4 * u);
      ctx.lineTo(cx - 0.4 * u, ey2 + 0.4 * u);
      ctx.stroke();
    }
  } else if (mood === 'sleep') {
    for (const sd of [-1, 1]) (ctx.beginPath(), ctx.moveTo(sd * ex, ey2), ctx.lineTo(sd * ex + 0.7 * u, ey2), ctx.stroke());
  } else {
    const r0 = mood === 'shock' ? 0.55 : 0.42;
    for (const sd of [-1, 1]) {
      ctx.fillStyle = '#ffffff';
      if (mood === 'shock') (ell(ctx, sd * ex + 0.3 * u, ey2, r0 * 1.5 * u, r0 * 1.5 * u), ctx.fill());
      ctx.fillStyle = '#1e1414';
      ell(ctx, sd * ex + 0.3 * u, ey2, r0 * u, r0 * u * (t % 200 < 6 ? 0.2 : 1));
      ctx.fill();
    }
  }
  if (sp.acc === 'shawl') {
    // 안경
    ctx.strokeStyle = '#8a6a3a';
    ctx.lineWidth = Math.max(1, 0.2 * u);
    for (const sd of [-1, 1]) (ell(ctx, sd * ex + 0.3 * u, ey2, 0.75 * u, 0.7 * u), ctx.stroke());
  }
  // 입
  ctx.strokeStyle = '#3a1a1a';
  ctx.lineWidth = Math.max(1, 0.25 * u);
  ctx.beginPath();
  if (mood === 'shock' || mood === 'wet') (ell(ctx, 0.6 * u, hy + 1.3 * u, 0.4 * u, 0.5 * u), (ctx.fillStyle = '#7a2a2a'), ctx.fill());
  else if (mood === 'grin' || sp.ear === 'horn') {
    ctx.arc(0.5 * u, hy + 0.7 * u, 0.9 * u, 0.2, Math.PI - 0.2);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(1 * u, hy + 1.4 * u);
    ctx.lineTo(1.3 * u, hy + 1.95 * u);
    ctx.lineTo(1.5 * u, hy + 1.35 * u);
    ctx.fill();
  } else (ctx.arc(0.5 * u, hy + 0.9 * u, 0.55 * u, 0.3, Math.PI - 0.3), ctx.stroke());
  // 볼
  ctx.fillStyle = 'rgba(255,120,140,.35)';
  ell(ctx, 1.9 * u, hy + 0.6 * u, 0.5 * u, 0.32 * u);
  ctx.fill();
  // 모자
  if (sp.acc === 'straw') {
    ctx.fillStyle = '#f2d06a';
    ell(ctx, 0, hy - 1.7 * u, 3.4 * u, 0.7 * u);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, hy - 1.9 * u, 1.9 * u, 1.4 * u, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#d04a3a';
    rr(ctx, -1.9 * u, hy - 2.3 * u, 3.8 * u, 0.45 * u, 0.2 * u);
    ctx.fill();
  } else if (sp.acc === 'helmet' || sp.acc === 'lamp') {
    ctx.fillStyle = '#ffcf3a';
    ctx.beginPath();
    ctx.ellipse(0, hy - 1 * u, 2.4 * u, 1.9 * u, 0, Math.PI, 0);
    ctx.fill();
    rr(ctx, -2.7 * u, hy - 1.1 * u, 5.4 * u, 0.5 * u, 0.25 * u);
    ctx.fill();
    if (sp.acc === 'lamp') {
      ctx.fillStyle = '#fff6b0';
      ell(ctx, 0, hy - 2 * u, 0.6 * u, 0.6 * u);
      ctx.fill();
    }
  } else if (sp.acc === 'scarf') {
    ctx.fillStyle = '#3a8aff';
    rr(ctx, -2 * u, hy + 1.6 * u, 4 * u, 0.8 * u, 0.4 * u);
    ctx.fill();
  } else if (sp.acc === 'bell') {
    ctx.fillStyle = '#ffcf3a';
    ell(ctx, 0.3 * u, hy + 2.3 * u, 0.45 * u, 0.45 * u);
    ctx.fill();
  }
  if (mood === 'wet') {
    ctx.fillStyle = '#7fd0ff';
    for (let q = 0; q < 3; q++) (ell(ctx, (-1.5 + q * 1.5) * u, hy - 2.4 * u + ((t * 0.08 + q * 0.4) % 1) * 3 * u, 0.25 * u, 0.4 * u), ctx.fill());
  }
  ctx.restore();
  if (mood === 'dizzy') {
    ctx.fillStyle = '#ffd23a';
    for (let q = 0; q < 3; q++) {
      const a = t * 0.12 + (q * TAU2) / 3;
      starPath(ctx, x + Math.cos(a) * 3 * u, y - 9 * u + Math.sin(a) * 0.8 * u, 0.7 * u);
      ctx.fill();
    }
  }
}

// ── 물건 그리기 (τ를 받아 같은 함수로 잔상·되감기도 그린다) ──
interface View { X: (x: number) => number; Y: (y: number) => number; R: (r: number) => number; t: number; fixed: number }
function drawPlank(ctx: C2, v: View, th: Thing, i: number, tau: number) {
  plank(th, i, tau);
  const pw = (th.x2 - th.x) / th.n;
  ctx.save();
  ctx.translate(v.X(P.x), v.Y(P.y));
  ctx.rotate(P.a);
  const w = v.R(pw * 0.96), hh = v.R(0.026);
  ctx.fillStyle = 'rgba(60,30,10,.25)';
  rr(ctx, -w / 2 + 1, hh * 0.2 + 2, w, hh, hh * 0.3);
  ctx.fill();
  ctx.fillStyle = lin(ctx, 0, -hh / 2, 0, hh, [[0, '#e8a868'], [0.5, '#c07a3e'], [1, '#8a5228']]);
  rr(ctx, -w / 2, -hh / 2, w, hh * 1.3, hh * 0.3);
  ctx.fill();
  ctx.strokeStyle = 'rgba(90,45,15,.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-w * 0.4, -hh * 0.1);
  ctx.lineTo(w * 0.35, -hh * 0.1);
  ctx.stroke();
  ctx.fillStyle = '#5a3a2a';
  ell(ctx, -w * 0.38, 0, hh * 0.13, hh * 0.13);
  ctx.fill();
  ell(ctx, w * 0.38, 0, hh * 0.13, hh * 0.13);
  ctx.fill();
  ctx.restore();
}
function drawBridgeT(ctx: C2, v: View, th: Thing, tau: number) {
  const X = v.X, Y = v.Y, R = v.R;
  // 난간 밧줄: 판자가 다 제자리일 때만 팽팽
  const allIn = tau <= brFall(0);
  for (const xx of [th.x, th.x2]) {
    ctx.fillStyle = lin(ctx, X(xx) - R(0.01), 0, X(xx) + R(0.01), 0, [[0, '#9a5a2a'], [1, '#6a3a1a']]);
    rr(ctx, X(xx) - R(0.009), Y(th.y - 0.075), R(0.018), R(0.09), R(0.006));
    ctx.fill();
    ctx.fillStyle = '#c0803e';
    ell(ctx, X(xx), Y(th.y - 0.075), R(0.011), R(0.006));
    ctx.fill();
  }
  ctx.strokeStyle = '#d8b07a';
  ctx.lineWidth = Math.max(1.5, R(0.005));
  ctx.beginPath();
  ctx.moveTo(X(th.x), Y(th.y - 0.07));
  if (allIn) ctx.quadraticCurveTo(X((th.x + th.x2) / 2), Y(th.y - 0.045), X(th.x2), Y(th.y - 0.07));
  else {
    ctx.quadraticCurveTo(X(th.x + 0.02), Y(th.y + 0.04), X(th.x + 0.03), Y(th.y + 0.08));
    ctx.moveTo(X(th.x2), Y(th.y - 0.07));
    ctx.quadraticCurveTo(X(th.x2 - 0.02), Y(th.y + 0.04), X(th.x2 - 0.03), Y(th.y + 0.08));
  }
  ctx.stroke();
  for (let i = 0; i < th.n; i++) drawPlank(ctx, v, th, i, tau);
}
function drawPot(ctx: C2, v: View, th: Thing, tau: number, a = 1) {
  const X = v.X, Y = v.Y, R = v.R, hit = potHit(th);
  if (tau < hit) {
    pose(th, tau);
    ctx.save();
    ctx.globalAlpha *= a;
    const px = X(P.x), py = Y(P.y + 0.035);
    ctx.translate(px, py);
    ctx.rotate(P.a);
    potShape(ctx, R(0.03), 0, 0, v.t);
    ctx.restore();
    return;
  }
  // 깨진 조각 (τ가 거꾸로면 모여 붙는다)
  const q = cl01((tau - hit) / 14);
  const ex = q * (2 - q);
  ctx.save();
  ctx.globalAlpha *= a;
  const gx = X(th.x), gy = Y(th.y2);
  ctx.fillStyle = 'rgba(110,70,40,.75)';
  ell(ctx, gx, gy - R(0.004), R(0.05) * (0.4 + 0.6 * ex), R(0.012));
  ctx.fill();
  for (let k = 0; k < 7; k++) {
    const ang = -Math.PI * (0.15 + 0.7 * (k / 6)), d = R(0.055) * ex * (0.6 + hsh(k + th.id) * 0.6);
    const sx = gx + Math.cos(ang) * d * 1.3, sy = gy - R(0.015) - Math.sin(-ang) * d * 0.4 * (1 - ex) - R(0.004) * k * (1 - ex);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(ang * ex * 2 + k);
    ctx.fillStyle = k % 2 ? '#d86a3a' : '#b8502a';
    ctx.beginPath();
    ctx.moveTo(-R(0.012), -R(0.006));
    ctx.lineTo(R(0.011), -R(0.009));
    ctx.lineTo(R(0.006), R(0.008));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  // 꽃 한 송이가 바닥에
  ctx.fillStyle = '#ff5a7a';
  ell(ctx, gx + R(0.02) * ex, gy - R(0.012), R(0.009), R(0.009));
  ctx.fill();
  ctx.restore();
}
function potShape(ctx: C2, r: number, x: number, y: number, t: number) {
  // 화분 (바닥 기준 위로)
  ctx.fillStyle = 'rgba(60,30,10,.2)';
  ell(ctx, x, y + r * 0.05, r * 0.9, r * 0.2);
  ctx.fill();
  ctx.fillStyle = lin(ctx, x - r, 0, x + r, 0, [[0, '#f08a52'], [0.6, '#d0622e'], [1, '#a84820']]);
  ctx.beginPath();
  ctx.moveTo(x - r * 0.75, y);
  ctx.lineTo(x + r * 0.75, y);
  ctx.lineTo(x + r, y - r * 1.4);
  ctx.lineTo(x - r, y - r * 1.4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e8743a';
  rr(ctx, x - r * 1.12, y - r * 1.6, r * 2.24, r * 0.38, r * 0.12);
  ctx.fill();
  // 꽃
  ctx.strokeStyle = '#3a9a4a';
  ctx.lineWidth = Math.max(1, r * 0.12);
  for (let k = -1; k <= 1; k++) {
    ctx.beginPath();
    ctx.moveTo(x + k * r * 0.4, y - r * 1.6);
    ctx.lineTo(x + k * r * 0.6, y - r * 2.4 - Math.abs(k) * r * -0.2);
    ctx.stroke();
  }
  for (let k = -1; k <= 1; k++) {
    const fx2 = x + k * r * 0.62, fy = y - r * 2.5 + Math.abs(k) * r * 0.2 + Math.sin(t * 0.08 + k) * r * 0.05;
    ctx.fillStyle = k ? '#ffcf3a' : '#ff5a7a';
    for (let p = 0; p < 5; p++) (ell(ctx, fx2 + Math.cos((p * TAU2) / 5) * r * 0.22, fy + Math.sin((p * TAU2) / 5) * r * 0.22, r * 0.18, r * 0.18), ctx.fill());
    ctx.fillStyle = '#fff6c0';
    ell(ctx, fx2, fy, r * 0.12, r * 0.12);
    ctx.fill();
  }
}
function drawBarrel(ctx: C2, v: View, th: Thing, tau: number, a = 1) {
  const X = v.X, Y = v.Y, R = v.R, n = th.path!.length / 3 - 1;
  pose(th, tau);
  const r = th.harm ? 0.034 : 0.03;
  ctx.save();
  ctx.globalAlpha *= a;
  if (tau >= n - 0.5 && th.harm) {
    // 와장창 — 판자 조각 (τ가 n을 넘은 만큼 퍼짐)
    const q = cl01((tau - n + 14) / 14);
    for (let k = 0; k < 6; k++) {
      const ang = -Math.PI * (k / 5), d = R(0.05) * q;
      ctx.save();
      ctx.translate(X(P.x) + Math.cos(ang) * d * 1.4, Y(P.y) - R(0.012) - Math.sin(-ang) * d * 0.5);
      ctx.rotate(k + q * 2);
      ctx.fillStyle = k % 2 ? '#b8743a' : '#9a5a28';
      rr(ctx, -R(0.016), -R(0.005), R(0.032), R(0.01), R(0.003));
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    return;
  }
  const x = X(P.x), y = Y(P.y) - R(r);
  if (th.harm) shadow(ctx, x, Y(P.y), R(r * 0.9));
  else {
    // 물에 뜬 통: 물결
    ctx.strokeStyle = 'rgba(255,255,255,.6)';
    ctx.lineWidth = 1.5;
    ell(ctx, x, Y(P.y) - R(0.004), R(r * 1.3), R(r * 0.35));
    ctx.stroke();
  }
  ctx.translate(x, y);
  ctx.rotate(P.a);
  ctx.fillStyle = lin(ctx, -R(r), -R(r), R(r), R(r), [[0, '#e0a060'], [1, '#9a5a28']]);
  ell(ctx, 0, 0, R(r), R(r));
  ctx.fill();
  ctx.strokeStyle = '#6a3a1a';
  ctx.lineWidth = Math.max(1, R(0.003));
  for (let k = 0; k < 6; k++) {
    const an = (k / 6) * TAU2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(an) * R(r), Math.sin(an) * R(r));
    ctx.stroke();
  }
  ctx.strokeStyle = '#5a5a6a';
  ctx.lineWidth = Math.max(2, R(0.006));
  ell(ctx, 0, 0, R(r * 0.95), R(r * 0.95));
  ctx.stroke();
  ell(ctx, 0, 0, R(r * 0.55), R(r * 0.55));
  ctx.stroke();
  ctx.fillStyle = '#5a3418';
  ell(ctx, 0, 0, R(r * 0.18), R(r * 0.18));
  ctx.fill();
  ctx.restore();
}
function drawArrowT(ctx: C2, v: View, th: Thing, tau: number, a = 1) {
  pose(th, tau);
  const X = v.X, Y = v.Y, R = v.R;
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.translate(X(P.x), Y(P.y));
  ctx.rotate(P.a);
  const L = R(0.075);
  ctx.strokeStyle = '#8a5228';
  ctx.lineWidth = Math.max(2, R(0.006));
  ctx.beginPath();
  ctx.moveTo(-L, 0);
  ctx.lineTo(0, 0);
  ctx.stroke();
  ctx.fillStyle = '#c8ccd8';
  ctx.beginPath();
  ctx.moveTo(R(0.016), 0);
  ctx.lineTo(-R(0.004), -R(0.009));
  ctx.lineTo(-R(0.004), R(0.009));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ff4a5a';
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(-L, 0);
    ctx.lineTo(-L - R(0.012), sd * R(0.011));
    ctx.lineTo(-L + R(0.016), sd * R(0.004));
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}
function drawRaft(ctx: C2, v: View, th: Thing, tau: number, a = 1) {
  if (tau >= th.dur) return;
  pose(th, tau);
  const X = v.X, Y = v.Y, R = v.R, w = R(th.w), x = X(P.x), y = Y(P.y);
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.strokeStyle = 'rgba(255,255,255,.55)';
  ctx.lineWidth = 2;
  ell(ctx, x, y + R(0.012), w * 0.58, R(0.022));
  ctx.stroke();
  ctx.translate(x, y);
  ctx.rotate(P.a);
  for (let k = 0; k < 2; k++) {
    ctx.fillStyle = lin(ctx, 0, -R(0.012), 0, R(0.03), [[0, '#d89a58'], [1, '#8a5228']]);
    rr(ctx, -w / 2, -R(0.008) + k * R(0.016), w, R(0.02), R(0.01));
    ctx.fill();
  }
  ctx.strokeStyle = '#6a3a1a';
  ctx.lineWidth = 1;
  for (let q = 1; q < 6; q++) {
    ctx.beginPath();
    ctx.moveTo(-w / 2 + (q * w) / 6, -R(0.006));
    ctx.lineTo(-w / 2 + (q * w) / 6, R(0.026));
    ctx.stroke();
  }
  ctx.strokeStyle = '#f2d8a0';
  ctx.lineWidth = Math.max(1.5, R(0.004));
  for (const q of [-0.3, 0.3]) {
    ctx.beginPath();
    ctx.moveTo(q * w, -R(0.01));
    ctx.lineTo(q * w, R(0.028));
    ctx.stroke();
  }
  // 작은 깃발
  ctx.strokeStyle = '#6a3a1a';
  ctx.beginPath();
  ctx.moveTo(w * 0.42, 0);
  ctx.lineTo(w * 0.42, -R(0.06));
  ctx.stroke();
  ctx.fillStyle = '#ff5a5a';
  ctx.beginPath();
  ctx.moveTo(w * 0.42, -R(0.06));
  ctx.lineTo(w * 0.42 + R(0.028), -R(0.05) + Math.sin(v.t * 0.2) * R(0.003));
  ctx.lineTo(w * 0.42, -R(0.04));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
function drawLogT(ctx: C2, v: View, th: Thing, tau: number, a = 1) {
  if (tau >= th.dur) return;
  pose(th, tau);
  const X = v.X, Y = v.Y, R = v.R;
  ctx.save();
  ctx.globalAlpha *= a;
  if (tau < LOG_LIE) {
    // 나무가 밑동을 축으로 오른쪽으로 쓰러진다
    const bx = X(th.x), by = Y(th.y);
    ctx.fillStyle = '#8a5a2a';
    ell(ctx, bx, by, R(0.022), R(0.008));
    ctx.fill();
    ctx.translate(bx, by);
    ctx.rotate(P.a);
    const L = R(th.w);
    ctx.fillStyle = lin(ctx, -R(0.014), 0, R(0.014), 0, [[0, '#a8703a'], [1, '#6a4020']]);
    rr(ctx, -R(0.013), -L * 0.82, R(0.026), L * 0.84, R(0.008));
    ctx.fill();
    // 갉아 먹은 자국
    ctx.fillStyle = '#f2d8a0';
    ctx.beginPath();
    ctx.moveTo(-R(0.013), -R(0.012));
    ctx.lineTo(R(0.002), -R(0.02));
    ctx.lineTo(-R(0.013), -R(0.03));
    ctx.fill();
    for (let k = 0; k < 5; k++) {
      ctx.fillStyle = ['#5cc05a', '#4aa84a', '#7ad86a'][k % 3];
      ell(ctx, (hsh(k + 9) - 0.5) * R(0.06), -L * 0.82 - R(0.01) + (hsh(k + 3) - 0.5) * R(0.05), R(0.036), R(0.032));
      ctx.fill();
    }
    ctx.restore();
    return;
  }
  const y = Y(P.y), x0 = X(th.x - 0.02), x1 = X(th.x2);
  ctx.strokeStyle = 'rgba(255,255,255,.55)';
  ctx.lineWidth = 2;
  ell(ctx, (x0 + x1) / 2, y + R(0.012), (x1 - x0) * 0.55, R(0.02));
  ctx.stroke();
  ctx.fillStyle = lin(ctx, 0, y - R(0.012), 0, y + R(0.024), [[0, '#c08048'], [1, '#6a4020']]);
  rr(ctx, x0, y - R(0.012), x1 - x0, R(0.03), R(0.015));
  ctx.fill();
  ctx.fillStyle = '#f2d8a0';
  ell(ctx, x0 + R(0.004), y + R(0.003), R(0.008), R(0.014));
  ctx.fill();
  ctx.strokeStyle = 'rgba(90,50,20,.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x0 + R(0.02), y);
  ctx.lineTo(x1 - R(0.04), y + R(0.002));
  ctx.stroke();
  for (let k = 0; k < 4; k++) {
    ctx.fillStyle = ['#5cc05a', '#4aa84a', '#7ad86a'][k % 3];
    ell(ctx, x1 - R(0.02) + (hsh(k + 9) - 0.3) * R(0.05), y - R(0.01) + (hsh(k + 3) - 0.5) * R(0.03), R(0.03), R(0.022));
    ctx.fill();
  }
  ctx.restore();
}
function drawBalloonT(ctx: C2, v: View, th: Thing, tau: number, a = 1) {
  if (tau >= th.dur) return;
  pose(th, tau);
  const X = v.X, Y = v.Y, R = v.R, x = X(P.x), y = Y(P.y);
  ctx.save();
  ctx.globalAlpha *= a;
  const by = y + R(0.12);
  ctx.strokeStyle = 'rgba(80,60,60,.7)';
  ctx.lineWidth = 1;
  const cols = ['#ff5a6a', '#ffcf3a', '#5ab8ff'];
  for (let k = 0; k < 3; k++) {
    const bx = x + (k - 1) * R(0.026) + Math.sin(v.t * 0.05 + k) * R(0.003), byy = y - R(0.01) - (k === 1 ? R(0.02) : 0);
    ctx.beginPath();
    ctx.moveTo(bx, byy + R(0.03));
    ctx.lineTo(x, by - R(0.012));
    ctx.stroke();
    ctx.fillStyle = cols[k];
    ell(ctx, bx, byy, R(0.024), R(0.03));
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ell(ctx, bx - R(0.008), byy - R(0.01), R(0.006), R(0.009), -0.4);
    ctx.fill();
  }
  // 바구니
  ctx.fillStyle = lin(ctx, 0, by - R(0.014), 0, by + R(0.02), [[0, '#d8a050'], [1, '#9a6a28']]);
  rr(ctx, x - R(0.026), by - R(0.012), R(0.052), R(0.026), R(0.008));
  ctx.fill();
  ctx.strokeStyle = '#7a4a1a';
  ctx.lineWidth = 1;
  for (let q = 1; q < 4; q++) (ctx.beginPath(), ctx.moveTo(x - R(0.026) + q * R(0.013), by - R(0.012)), ctx.lineTo(x - R(0.026) + q * R(0.013), by + R(0.014)), ctx.stroke());
  ctx.restore();
}
function drawCrateT(ctx: C2, v: View, th: Thing, tau: number, a = 1) {
  pose(th, tau);
  const X = v.X, Y = v.Y, R = v.R, x = X(P.x), top = Y(P.y), w = R(th.w), hh = R(th.h);
  ctx.save();
  ctx.globalAlpha *= a;
  // 밧줄 (해어지기 전엔 크레인에 매달림)
  ctx.strokeStyle = '#d8b07a';
  ctx.lineWidth = Math.max(1.5, R(0.004));
  ctx.beginPath();
  if (tau <= CR_FRAY) {
    ctx.moveTo(x, Y(0.36));
    ctx.lineTo(x, top);
  } else {
    ctx.moveTo(x, Y(0.36));
    ctx.lineTo(x + R(0.01), Y(0.36) + R(0.08));
  }
  ctx.stroke();
  ctx.translate(x, top + hh / 2);
  ctx.rotate(P.a);
  ctx.fillStyle = lin(ctx, 0, -hh / 2, 0, hh / 2, [[0, '#e8b070'], [1, '#a8682e']]);
  rr(ctx, -w / 2, -hh / 2, w, hh, R(0.008));
  ctx.fill();
  ctx.strokeStyle = '#7a4418';
  ctx.lineWidth = Math.max(2, R(0.006));
  ctx.strokeRect(-w / 2 + R(0.006), -hh / 2 + R(0.006), w - R(0.012), hh - R(0.012));
  ctx.beginPath();
  ctx.moveTo(-w / 2 + R(0.008), -hh / 2 + R(0.008));
  ctx.lineTo(w / 2 - R(0.008), hh / 2 - R(0.008));
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.25)';
  rr(ctx, -w / 2 + R(0.01), -hh / 2 + R(0.008), w - R(0.02), R(0.01), R(0.004));
  ctx.fill();
  ctx.restore();
}
function drawGearT(ctx: C2, v: View, th: Thing, tau: number, a = 1) {
  pose(th, tau);
  const X = v.X, Y = v.Y, R = v.R;
  ctx.save();
  ctx.globalAlpha *= a;
  shadow(ctx, X(P.x), Y(P.y), R(0.04));
  brass(ctx, X(P.x), Y(P.y) - R(0.05), R(0.05), 10, P.a);
  ctx.restore();
}
function drawWaterT(ctx: C2, v: View, th: Thing, tau: number) {
  const X = v.X, Y = v.Y, R = v.R, lv = water(th, tau), t = v.t;
  const tx = X(th.x), ty = Y(th.y);
  // 물탱크 (기둥 위)
  ctx.fillStyle = '#8a5a2a';
  for (const sd of [-1, 1]) {
    ctx.save();
    ctx.translate(tx + sd * R(0.04), ty + R(0.02));
    ctx.rotate(sd * -0.08);
    rr(ctx, -R(0.006), 0, R(0.012), Y(th.h - 0.06) - ty, R(0.004));
    ctx.fill();
    ctx.restore();
  }
  const sh = tau > 0 && tau < WAT_CRACK ? Math.sin(tau * 2.1) * R(0.004) : 0;
  ctx.fillStyle = lin(ctx, tx - R(0.06), 0, tx + R(0.06), 0, [[0, '#d89a58'], [0.5, '#b8783a'], [1, '#8a5228']]);
  rr(ctx, tx - R(0.058) + sh, ty - R(0.07), R(0.116), R(0.09), R(0.02));
  ctx.fill();
  ctx.fillStyle = '#5a6a7a';
  rr(ctx, tx - R(0.06) + sh, ty - R(0.052), R(0.12), R(0.009), R(0.004));
  ctx.fill();
  rr(ctx, tx - R(0.06) + sh, ty - R(0.005), R(0.12), R(0.009), R(0.004));
  ctx.fill();
  ctx.fillStyle = '#c84a3a';
  ctx.beginPath();
  ctx.moveTo(tx - R(0.07) + sh, ty - R(0.068));
  ctx.lineTo(tx + sh, ty - R(0.11));
  ctx.lineTo(tx + R(0.07) + sh, ty - R(0.068));
  ctx.closePath();
  ctx.fill();
  // 쏟아지는 물줄기 (되감으면 거꾸로 솟는다)
  const flowing = tau > WAT_CRACK && tau < WAT_CRACK + WAT_FILL && th.st !== DONE && th.st !== HOLD;
  const by = Y(th.h);
  if (flowing || (th.st === REW && tau > WAT_CRACK)) {
    const dir = th.st === REW ? -1 : 1;
    const sx = tx + R(0.05), ex2 = X((th.x2 + th.y2) / 2);
    ctx.strokeStyle = 'rgba(90,190,250,.85)';
    ctx.lineWidth = R(0.016);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sx, ty - R(0.02));
    ctx.quadraticCurveTo(sx + R(0.06), ty, ex2, by - R(0.01));
    ctx.stroke();
    ctx.fillStyle = '#e8f8ff';
    for (let k = 0; k < 8; k++) {
      const q = (((t * 0.04 * dir + k / 8) % 1) + 1) % 1;
      const qx = (1 - q) * (1 - q) * sx + 2 * (1 - q) * q * (sx + R(0.06)) + q * q * ex2, qy = (1 - q) * (1 - q) * (ty - R(0.02)) + 2 * (1 - q) * q * ty + q * q * (by - R(0.01));
      ell(ctx, qx, qy, R(0.006), R(0.006));
      ctx.fill();
    }
  }
  // 웅덩이 물
  if (lv > 0.01) {
    const x0 = X(th.x2), x1 = X(th.y2), d = R(0.06) * lv;
    ctx.fillStyle = lin(ctx, 0, by - d, 0, by + R(0.02), [[0, 'rgba(110,210,255,.92)'], [1, 'rgba(40,140,210,.95)']]);
    rr(ctx, x0, by - d, x1 - x0, d + R(0.02), R(0.01));
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.7)';
    ctx.lineWidth = 1.5;
    for (let k = 0; k < 3; k++) {
      const wx = x0 + ((k + 0.5) / 3) * (x1 - x0);
      ctx.beginPath();
      ctx.arc(wx, by - d + R(0.004), R(0.012) + ((t * 0.3 + k * 9) % 12), Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
  }
}
function drawThingAt(ctx: C2, v: View, th: Thing, tau: number, a = 1) {
  switch (th.k) {
    case 'bridge':
      return drawBridgeT(ctx, v, th, tau);
    case 'pot':
      return drawPot(ctx, v, th, tau, a);
    case 'barrel':
      return drawBarrel(ctx, v, th, tau, a);
    case 'arrow':
      return drawArrowT(ctx, v, th, tau, a);
    case 'raft':
      return drawRaft(ctx, v, th, tau, a);
    case 'log':
      return drawLogT(ctx, v, th, tau, a);
    case 'balloon':
      return drawBalloonT(ctx, v, th, tau, a);
    case 'crate':
      return drawCrateT(ctx, v, th, tau, a);
    case 'gear':
      return drawGearT(ctx, v, th, tau, a);
    case 'water':
      return drawWaterT(ctx, v, th, tau);
  }
}
/** 물건의 '지나온 길'(되감으면 이 길을 거꾸로 간다) — 흐린 점선 */
function drawTrail(ctx: C2, v: View, th: Thing, col: string) {
  if (th.k === 'bridge' || th.k === 'water' || th.tau < 6) return;
  ctx.save();
  ctx.setLineDash([3, 5]);
  ctx.strokeStyle = col;
  ctx.lineWidth = 2;
  ctx.beginPath();
  const step = Math.max(3, Math.floor(th.tau / 24));
  for (let q = 0; q <= th.tau; q += step) {
    pose(th, q);
    let x = P.x, y = P.y;
    if (th.k === 'barrel') y -= 0.034;
    else if (th.k === 'gear') y -= 0.05;
    else if (th.k === 'crate') (y += th.h / 2), (x = th.x);
    else if (th.k === 'log' && q < LOG_LIE) continue;
    else if (th.k === 'pot') y += q < POT_TT ? 0.01 : 0;
    if (q === 0) ctx.moveTo(v.X(x), v.Y(y));
    else ctx.lineTo(v.X(x), v.Y(y));
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}
/** 앞으로 갈 길(위험한 것) — 붉은 점선과 떨어질 자리 */
function drawFuture(ctx: C2, v: View, th: Thing) {
  if (th.st === DONE || th.st === REW) return;
  const X = v.X, Y = v.Y, R = v.R;
  if (th.k === 'arrow' && th.tau < th.n) {
    ctx.save();
    ctx.setLineDash([4, 6]);
    ctx.strokeStyle = 'rgba(255,90,80,.75)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let q = th.tau; q <= th.n; q += 4) {
      pose(th, q);
      if (q === th.tau) ctx.moveTo(X(P.x), Y(P.y));
      else ctx.lineTo(X(P.x), Y(P.y));
    }
    ctx.stroke();
    ctx.setLineDash([]);
    const pul = 1 + Math.sin(v.t * 0.3) * 0.15;
    ctx.strokeStyle = 'rgba(255,70,60,.85)';
    ctx.lineWidth = 2.5;
    ell(ctx, X(th.x2), Y(th.y2 + 0.035), R(0.03) * pul, R(0.01) * pul);
    ctx.stroke();
    ctx.restore();
  } else if ((th.k === 'barrel' || th.k === 'gear') && th.harm && th.tau < th.path!.length / 3 - 1 && th.st !== WAIT) {
    const n = th.path!.length / 3 - 1;
    ctx.save();
    ctx.setLineDash([3, 6]);
    ctx.strokeStyle = 'rgba(255,90,80,.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let q = th.tau; q <= n; q += 5) {
      pose(th, q);
      const y = P.y - (th.k === 'gear' ? 0.05 : 0.034);
      if (q === th.tau) ctx.moveTo(X(P.x), Y(y));
      else ctx.lineTo(X(P.x), Y(y));
    }
    ctx.stroke();
    ctx.restore();
  } else if (th.k === 'pot' && th.tau < POT_TT && th.tau > 0) {
    // 떨어질 자리
    const pul = 0.6 + Math.sin(v.t * 0.3) * 0.3;
    ctx.strokeStyle = `rgba(255,70,60,${pul})`;
    ctx.lineWidth = 2;
    ell(ctx, X(th.x), Y(th.y2), R(0.04), R(0.012));
    ctx.stroke();
  }
}

// ── 무대 ──
function drawSky(ctx: C2, v: View, w: number, ch: number) {
  const { Y, t } = v;
  const top = ch === 2 ? ['#ffe9c8', '#ffd9a8'] : ['#7ccfff', '#c6ecff'];
  ctx.fillStyle = lin(ctx, 0, 0, 0, Y(0.5), [[0, top[0]], [0.7, top[1]], [1, '#fff4dc']]);
  ctx.fillRect(-20, -20, w + 40, Y(0.6) + 20);
  if (ch === 2) return;
  // 해
  const sx = w * 0.84, sy = Y(0.07);
  ctx.fillStyle = 'rgba(255,240,170,.45)';
  ell(ctx, sx, sy, w * 0.09, w * 0.09);
  ctx.fill();
  ctx.fillStyle = '#ffe36a';
  ell(ctx, sx, sy, w * 0.045, w * 0.045);
  ctx.fill();
  // 구름
  for (let k = 0; k < 4; k++) {
    const cx = ((hsh(k + 40) * 1.4 + t * 0.00012 * (1 + k * 0.3)) % 1.4) * w - w * 0.2, cy = Y(0.04 + hsh(k + 41) * 0.16), cs = w * (0.05 + hsh(k + 42) * 0.03);
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    ell(ctx, cx, cy, cs * 1.6, cs * 0.6);
    ctx.fill();
    ell(ctx, cx - cs * 0.6, cy - cs * 0.3, cs * 0.8, cs * 0.6);
    ctx.fill();
    ell(ctx, cx + cs * 0.5, cy - cs * 0.45, cs * 0.9, cs * 0.75);
    ctx.fill();
  }
}
/** 먼 마을(언덕 · 풍차 · 시계탑) — 복원된 만큼 살아난다 */
function drawPanorama(ctx: C2, v: View, w: number, ch: number) {
  const { X, Y, R, t, fixed } = v;
  // 무지개
  if (fixed >= 8) {
    ctx.save();
    ctx.globalAlpha = 0.45;
    const cols = ['#ff6a6a', '#ffb04a', '#ffe36a', '#7ad86a', '#5ab8ff', '#a87aff'];
    cols.forEach((c, i) => {
      ctx.strokeStyle = c;
      ctx.lineWidth = R(0.012);
      ctx.beginPath();
      ctx.arc(X(0.3), Y(0.42), R(0.36 - i * 0.012), Math.PI * 1.05, Math.PI * 1.75);
      ctx.stroke();
    });
    ctx.restore();
  }
  // 언덕
  ctx.fillStyle = ch === 1 ? '#9ad87a' : '#b8e08a';
  ctx.beginPath();
  ctx.moveTo(0, Y(0.42));
  ctx.quadraticCurveTo(X(0.18), Y(0.22), X(0.4), Y(0.36));
  ctx.quadraticCurveTo(X(0.7), Y(0.26), X(1), Y(0.34));
  ctx.lineTo(X(1), Y(0.5));
  ctx.lineTo(0, Y(0.5));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = ch === 1 ? '#7cc85e' : '#9ad07a';
  ctx.beginPath();
  ctx.moveTo(0, Y(0.44));
  ctx.quadraticCurveTo(X(0.3), Y(0.33), X(0.55), Y(0.42));
  ctx.quadraticCurveTo(X(0.8), Y(0.36), X(1), Y(0.4));
  ctx.lineTo(X(1), Y(0.5));
  ctx.lineTo(0, Y(0.5));
  ctx.closePath();
  ctx.fill();
  // 풍차 (4판부터 돈다)
  {
    const mx = X(0.14), my = Y(0.26);
    ctx.fillStyle = '#f6efe4';
    ctx.beginPath();
    ctx.moveTo(mx - R(0.02), my + R(0.07));
    ctx.lineTo(mx + R(0.02), my + R(0.07));
    ctx.lineTo(mx + R(0.012), my);
    ctx.lineTo(mx - R(0.012), my);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#d0584a';
    ctx.beginPath();
    ctx.moveTo(mx - R(0.016), my);
    ctx.lineTo(mx, my - R(0.018));
    ctx.lineTo(mx + R(0.016), my);
    ctx.fill();
    const rot = fixed >= 4 ? t * 0.03 : 0.3;
    ctx.strokeStyle = '#8a6a4a';
    ctx.lineWidth = 2;
    for (let k = 0; k < 4; k++) {
      const a = rot + (k * Math.PI) / 2;
      ctx.beginPath();
      ctx.moveTo(mx, my);
      ctx.lineTo(mx + Math.cos(a) * R(0.05), my + Math.sin(a) * R(0.05));
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,250,240,.9)';
      ctx.save();
      ctx.translate(mx + Math.cos(a) * R(0.03), my + Math.sin(a) * R(0.03));
      ctx.rotate(a);
      ctx.fillRect(-R(0.02), 0, R(0.04), R(0.01));
      ctx.restore();
    }
  }
  // 물레방아 (5판부터 돈다)
  {
    const mx = X(0.88), my = Y(0.36);
    ctx.fillStyle = '#f2e2c8';
    ctx.fillRect(mx - R(0.035), my - R(0.03), R(0.05), R(0.05));
    ctx.fillStyle = '#c86a4a';
    ctx.beginPath();
    ctx.moveTo(mx - R(0.042), my - R(0.03));
    ctx.lineTo(mx - R(0.01), my - R(0.055));
    ctx.lineTo(mx + R(0.022), my - R(0.03));
    ctx.closePath();
    ctx.fill();
    const wr = R(0.028), wx = mx + R(0.03), wy = my + R(0.005), rot = fixed >= 5 ? t * 0.04 : 0;
    ctx.strokeStyle = '#8a5a2a';
    ctx.lineWidth = 2;
    ell(ctx, wx, wy, wr, wr);
    ctx.stroke();
    for (let k = 0; k < 8; k++) {
      const a = rot + (k * Math.PI) / 4;
      ctx.beginPath();
      ctx.moveTo(wx, wy);
      ctx.lineTo(wx + Math.cos(a) * wr, wy + Math.sin(a) * wr);
      ctx.stroke();
    }
    if (fixed >= 5) {
      ctx.fillStyle = 'rgba(150,220,255,.8)';
      for (let k = 0; k < 4; k++) (ell(ctx, wx + wr * 0.9, wy + wr * 0.4 + ((t * 0.5 + k * 5) % 14), R(0.003), R(0.004)), ctx.fill());
    }
  }
  // 시계탑 (가운데 뒤)
  const tx = X(0.56), tw = R(0.11), tb = Y(0.45), tt = Y(0.08);
  ctx.fillStyle = lin(ctx, tx - tw / 2, 0, tx + tw / 2, 0, [[0, '#f2dcc0'], [1, '#d8b894']]);
  ctx.fillRect(tx - tw / 2, tt, tw, tb - tt);
  ctx.fillStyle = '#4a7ac0';
  ctx.beginPath();
  ctx.moveTo(tx - tw * 0.62, tt);
  ctx.lineTo(tx, tt - R(0.07));
  ctx.lineTo(tx + tw * 0.62, tt);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffcf3a';
  ell(ctx, tx, tt - R(0.072), R(0.006), R(0.006));
  ctx.fill();
  // 종 (11판)
  ctx.fillStyle = '#5a4a3a';
  rr(ctx, tx - R(0.022), tt + R(0.008), R(0.044), R(0.03), R(0.012));
  ctx.fill();
  if (fixed >= 11) {
    ctx.fillStyle = '#ffc94a';
    ctx.save();
    ctx.translate(tx, tt + R(0.012));
    ctx.rotate(Math.sin(t * 0.08) * 0.3);
    ctx.beginPath();
    ctx.moveTo(-R(0.012), R(0.02));
    ctx.quadraticCurveTo(-R(0.01), 0, 0, 0);
    ctx.quadraticCurveTo(R(0.01), 0, R(0.012), R(0.02));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  clockFace(ctx, tx, Y(0.17), R(0.04), t, fixed);
  // 집 지붕들
  for (let k = 0; k < 7; k++) {
    const hx = X(-0.02 + k * 0.17 + (k > 3 ? 0.05 : 0)), hy = Y(0.4 + hsh(k) * 0.03), hw = R(0.07 + hsh(k + 5) * 0.03);
    if (Math.abs(hx - tx) < tw) continue;
    ctx.fillStyle = ['#ffd9b8', '#f8e6c8', '#ffe2d0'][k % 3];
    ctx.fillRect(hx - hw / 2, hy, hw, R(0.06));
    ctx.fillStyle = ['#e2685a', '#4a8ad0', '#f08a3a'][k % 3];
    ctx.beginPath();
    ctx.moveTo(hx - hw * 0.6, hy);
    ctx.lineTo(hx, hy - R(0.035));
    ctx.lineTo(hx + hw * 0.6, hy);
    ctx.closePath();
    ctx.fill();
  }
  // 새 떼 (7판)
  if (fixed >= 7) {
    ctx.strokeStyle = '#5a5a7a';
    ctx.lineWidth = 1.5;
    for (let k = 0; k < 5; k++) {
      const bx = ((t * 0.0015 + k * 0.13) % 1.3) * w - w * 0.1, by = Y(0.1 + k * 0.025 + Math.sin(t * 0.03 + k) * 0.01), fl = Math.sin(t * 0.3 + k) * R(0.006);
      ctx.beginPath();
      ctx.moveTo(bx - R(0.01), by - fl);
      ctx.lineTo(bx, by);
      ctx.lineTo(bx + R(0.01), by - fl);
      ctx.stroke();
    }
  }
}
/** 시계판 — 9판에 숫자, 12판에 바늘이 다시 돈다 */
function clockFace(ctx: C2, x: number, y: number, r: number, t: number, fixed: number) {
  ctx.fillStyle = '#8a6a4a';
  ell(ctx, x, y, r * 1.12, r * 1.12);
  ctx.fill();
  ctx.fillStyle = fixed >= 9 ? '#fffbe8' : '#e8e0d0';
  ell(ctx, x, y, r, r);
  ctx.fill();
  ctx.fillStyle = fixed >= 9 ? '#3a2a1a' : 'rgba(60,40,30,.25)';
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * TAU2;
    ell(ctx, x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8, r * 0.07, r * 0.07);
    ctx.fill();
  }
  if (fixed >= 10) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    brass(ctx, x, y, r * 0.42, 8, t * 0.02);
    ctx.restore();
  }
  const h1 = fixed >= 12 ? t * 0.01 : -1.2, h2 = fixed >= 12 ? t * 0.0009 : 0.5;
  ctx.strokeStyle = '#2a1a10';
  ctx.lineWidth = Math.max(1.5, r * 0.08);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(h1) * r * 0.75, y + Math.sin(h1) * r * 0.75);
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(h2) * r * 0.5, y + Math.sin(h2) * r * 0.5);
  ctx.stroke();
}
/** 2장 강가: 집 뒤의 풀밭과 나무 */
function drawMeadow(ctx: C2, v: View, w: number) {
  const { X, Y, R, t } = v;
  ctx.fillStyle = lin(ctx, 0, Y(0.44), 0, Y(0.8), [[0, '#a8dc84'], [1, '#8fcf6a']]);
  ctx.fillRect(-10, Y(0.44), w + 20, Y(0.8) - Y(0.44));
  for (let k = 0; k < 9; k++) {
    const tx = X(-0.04 + k * 0.13 + hsh(k + 60) * 0.04), ty = Y(0.7 + hsh(k + 61) * 0.06), sz = R(0.05 + hsh(k + 62) * 0.025);
    ctx.fillStyle = '#7a5030';
    ctx.fillRect(tx - R(0.007), ty - sz * 0.4, R(0.014), sz * 0.9);
    ctx.fillStyle = ['#5cb84a', '#4aa83e', '#6cc858'][k % 3];
    const sw = Math.sin(t * 0.02 + k) * R(0.002);
    ell(ctx, tx + sw, ty - sz * 0.8, sz * 0.75, sz * 0.62);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.15)';
    ell(ctx, tx - sz * 0.25 + sw, ty - sz * 1.0, sz * 0.3, sz * 0.2);
    ctx.fill();
  }
}
/** 1장 장터 · 2장 강가의 뒷줄 집들 */
function drawHouses(ctx: C2, v: View, L: Level, s: RewState) {
  const { X, Y, R, t, fixed } = v;
  const ch = L.ch;
  const base = Y(0.78);
  const cols = ch === 0 ? ['#ffb8a0', '#ffe08a', '#a8e0c8', '#c4ccff', '#ffc4dc', '#ffd0a0'] : ['#f6e6c8', '#e8f0d0', '#ffe8d0', '#e0ecf8'];
  const roofs = ['#e2584a', '#3f7fc1', '#f08a3a', '#7a5ac8', '#3aa86a'];
  const xs = ch === 0 ? [-0.02, 0.18, 0.36, 0.56, 0.74, 0.9] : [0.02, 0.26, 0.74, 0.92];
  const alley = L.deco.alley;
  for (let k = 0; k < xs.length; k++) {
    const x0 = xs[k], x1 = k + 1 < xs.length ? xs[k + 1] : 1.06;
    if (alley !== undefined && x0 < alley + 0.05 && x1 > alley - 0.05) continue;
    if (ch === 1 && L.canal && x0 < L.canal[1] + 0.02 && x1 > L.canal[0] - 0.02) continue;
    const hTop = Y(ch === 0 ? 0.42 + hsh(k + 3) * 0.06 : 0.52 + hsh(k + 3) * 0.06), xa = X(x0), xb = X(x1) - R(0.01);
    ctx.fillStyle = lin(ctx, xa, 0, xb, 0, [[0, cols[k % cols.length]], [1, shade(cols[k % cols.length], 0.88)]]);
    ctx.fillRect(xa, hTop, xb - xa, base - hTop);
    // 벽 아래 그늘
    ctx.fillStyle = 'rgba(90,50,40,.12)';
    ctx.fillRect(xa, base - R(0.03), xb - xa, R(0.03));
    // 지붕
    ctx.fillStyle = roofs[k % roofs.length];
    ctx.beginPath();
    ctx.moveTo(xa - R(0.012), hTop + R(0.004));
    ctx.lineTo(xa + R(0.02), hTop - R(0.05));
    ctx.lineTo(xb - R(0.02), hTop - R(0.05));
    ctx.lineTo(xb + R(0.012), hTop + R(0.004));
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.fillRect(xa + R(0.02), hTop - R(0.05), xb - xa - R(0.04), R(0.008));
    // 굴뚝 연기
    if (k % 2 === 0) {
      const cx = xb - R(0.04);
      ctx.fillStyle = '#9a5a4a';
      ctx.fillRect(cx, hTop - R(0.07), R(0.018), R(0.03));
      for (let q = 0; q < 3; q++) {
        const ph = ((t * 0.01 + q / 3 + k * 0.2) % 1);
        ctx.fillStyle = `rgba(255,255,255,${0.6 * (1 - ph)})`;
        ell(ctx, cx + R(0.01) + ph * R(0.03), hTop - R(0.08) - ph * R(0.06), R(0.01 + ph * 0.012), R(0.008 + ph * 0.01));
        ctx.fill();
      }
    }
    // 창문 (2층)
    const nw = Math.max(1, Math.floor((xb - xa) / R(0.09)));
    for (let q = 0; q < nw; q++) {
      const wx = xa + ((q + 0.5) / nw) * (xb - xa), wy = hTop + R(0.04);
      if (L.deco.balc !== undefined && Math.abs(wx - X(L.deco.balc)) < R(0.05)) continue;
      ctx.fillStyle = '#ffffff';
      rr(ctx, wx - R(0.025), wy - R(0.004), R(0.05), R(0.062), R(0.012));
      ctx.fill();
      ctx.fillStyle = lin(ctx, 0, wy, 0, wy + R(0.05), [[0, '#8ab8e8'], [1, '#5a80b8']]);
      rr(ctx, wx - R(0.019), wy + R(0.002), R(0.038), R(0.05), R(0.01));
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      ctx.fillRect(wx - R(0.015), wy + R(0.006), R(0.008), R(0.02));
      // 꽃상자 (2판부터 핀다)
      ctx.fillStyle = '#9a5a2a';
      rr(ctx, wx - R(0.03), wy + R(0.056), R(0.06), R(0.012), R(0.004));
      ctx.fill();
      for (let f = 0; f < 4; f++) {
        ctx.fillStyle = fixed >= 2 ? ['#ff5a7a', '#ffcf3a', '#ff8ad0', '#ffffff'][(f + q + k) % 4] : '#7a9a5a';
        ell(ctx, wx - R(0.022) + f * R(0.015), wy + R(0.052), R(fixed >= 2 ? 0.008 : 0.005), R(fixed >= 2 ? 0.008 : 0.005));
        ctx.fill();
      }
    }
    // 1층 문·차양
    if (ch === 0) {
      const dx = (xa + xb) / 2;
      ctx.fillStyle = ['#ff6a5a', '#3aa0d0', '#ffb02e', '#6ac86a'][k % 4];
      ctx.beginPath();
      ctx.moveTo(dx - R(0.06), base - R(0.11));
      ctx.lineTo(dx + R(0.06), base - R(0.11));
      ctx.lineTo(dx + R(0.07), base - R(0.08));
      ctx.lineTo(dx - R(0.07), base - R(0.08));
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.6)';
      for (let q = 0; q < 4; q++) ctx.fillRect(dx - R(0.06) + q * R(0.034), base - R(0.11), R(0.017), R(0.03));
      ctx.fillStyle = '#8a5a3a';
      rr(ctx, dx - R(0.02), base - R(0.075), R(0.04), R(0.075), R(0.014));
      ctx.fill();
    }
  }
  // 발코니 (화분 판)
  if (L.deco.balc !== undefined) {
    const bx = X(L.deco.balc), by = Y(0.5);
    ctx.fillStyle = '#ffffff';
    rr(ctx, bx - R(0.05), by - R(0.09), R(0.1), R(0.09), R(0.02));
    ctx.fill();
    ctx.fillStyle = '#4a3a5a';
    rr(ctx, bx - R(0.042), by - R(0.085), R(0.084), R(0.085), R(0.016));
    ctx.fill();
    ctx.fillStyle = '#b8783a';
    rr(ctx, bx - R(0.075), by, R(0.15), R(0.014), R(0.005));
    ctx.fill();
    ctx.strokeStyle = '#8a5a2a';
    ctx.lineWidth = 2;
    for (let q = 0; q < 7; q++) {
      ctx.beginPath();
      ctx.moveTo(bx - R(0.07) + q * R(0.023), by + R(0.014));
      ctx.lineTo(bx - R(0.07) + q * R(0.023), by + R(0.045));
      ctx.stroke();
    }
    ctx.fillRect(bx - R(0.075), by + R(0.042), R(0.15), R(0.006));
  }
  void s;
}
const shade = (hex: string, k = 0.8) => {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * k), g = Math.round(((n >> 8) & 255) * k), b = Math.round((n & 255) * k);
  return `rgb(${r},${g},${b})`;
};
/** 길(돌길·흙길)과 물길 */
function drawGround(ctx: C2, v: View, L: Level, w: number) {
  const { X, Y, R, t, fixed } = v;
  const ch = L.ch;
  if (ch === 2) return;
  const lane = LY;
  // 뒤 인도
  ctx.fillStyle = ch === 0 ? '#f2e6d2' : '#a8d880';
  ctx.fillRect(0, Y(0.78), w, Y(lane - 0.055) - Y(0.78));
  // 길
  const top = Y(lane - 0.055), bot = Y(lane + 0.07);
  ctx.fillStyle = ch === 0 ? lin(ctx, 0, top, 0, bot, [[0, '#e2cfb0'], [1, '#d2b890']]) : lin(ctx, 0, top, 0, bot, [[0, '#e8c890'], [1, '#d8b070']]);
  ctx.fillRect(0, top, w, bot - top);
  if (ch === 0) {
    ctx.strokeStyle = 'rgba(150,110,70,.28)';
    ctx.lineWidth = 1;
    for (let r = 0; r < 4; r++) {
      const yy = top + ((r + 0.5) / 4) * (bot - top);
      for (let c = 0; c < 14; c++) {
        const xx = ((c + (r % 2) * 0.5) / 13) * w;
        rr(ctx, xx - R(0.03), yy - R(0.012), R(0.06), R(0.024), R(0.01));
        ctx.stroke();
      }
    }
  } else {
    ctx.fillStyle = 'rgba(160,110,60,.25)';
    for (let k = 0; k < 30; k++) (ell(ctx, hsh(k + 77) * w, top + hsh(k + 78) * (bot - top), R(0.006), R(0.003)), ctx.fill());
  }
  // 앞 인도·꽃밭
  ctx.fillStyle = ch === 0 ? '#e8d8bc' : '#8fd16a';
  ctx.fillRect(0, bot, w, Y(BOTY + 0.02) - bot);
  ctx.fillStyle = ch === 0 ? '#cdb894' : '#74b850';
  ctx.fillRect(0, bot, w, R(0.012));
  if (ch === 1) {
    // 풀잎
    ctx.strokeStyle = '#5aa040';
    ctx.lineWidth = 1.5;
    for (let k = 0; k < 40; k++) {
      const gx = hsh(k + 300) * w, gy = bot + R(0.03) + hsh(k + 301) * R(0.25);
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx + Math.sin(t * 0.04 + k) * R(0.004), gy - R(0.014));
      ctx.stroke();
    }
  }
  // 가로등 (3판부터 불빛)
  if (ch === 0)
    for (const lx of [0.08, 0.95]) {
      const px = X(lx), py = Y(0.79);
      ctx.fillStyle = '#4a4a5a';
      ctx.fillRect(px - R(0.004), py - R(0.16), R(0.008), R(0.16));
      ctx.fillStyle = fixed >= 3 ? '#fff2a0' : '#9a9aa8';
      rr(ctx, px - R(0.014), py - R(0.19), R(0.028), R(0.03), R(0.008));
      ctx.fill();
      if (fixed >= 3) {
        ctx.fillStyle = 'rgba(255,240,150,.3)';
        ell(ctx, px, py - R(0.175), R(0.04), R(0.04));
        ctx.fill();
      }
    }
  // 물길 (도랑 · 강)
  if (L.canal) {
    const [c0, c1] = L.canal;
    const x0 = X(c0), x1 = X(c1), yTop = Y(ch === 0 ? 0.735 : 0.78), yBot = Y(BOTY + 0.02);
    if (ch === 0) {
      // 집 아래 돌 아치에서 흘러나오는 도랑
      const mx = (x0 + x1) / 2, rw = (x1 - x0) / 2 + R(0.01);
      ctx.fillStyle = '#c8b494';
      ctx.beginPath();
      ctx.moveTo(mx - rw - R(0.014), Y(0.785));
      ctx.lineTo(mx - rw - R(0.014), Y(0.735));
      ctx.ellipse(mx, Y(0.735), rw + R(0.014), R(0.055), 0, Math.PI, 0);
      ctx.lineTo(mx + rw + R(0.014), Y(0.785));
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#2a3a4a';
      ctx.beginPath();
      ctx.moveTo(mx - rw, Y(0.785));
      ctx.lineTo(mx - rw, Y(0.74));
      ctx.ellipse(mx, Y(0.74), rw, R(0.045), 0, Math.PI, 0);
      ctx.lineTo(mx + rw, Y(0.785));
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(120,100,80,.5)';
      ctx.lineWidth = 1;
      for (let k = 0; k < 7; k++) {
        const a = Math.PI + (k / 6) * Math.PI;
        ctx.beginPath();
        ctx.moveTo(mx + Math.cos(a) * rw, Y(0.74) + Math.sin(a) * R(0.045));
        ctx.lineTo(mx + Math.cos(a) * (rw + R(0.014)), Y(0.735) + Math.sin(a) * R(0.055));
        ctx.stroke();
      }
    } else {
      // 먼 언덕에서 굽이쳐 내려오는 강
      const mx = (x0 + x1) / 2, hw = (x1 - x0) / 2, fx0 = mx + R(0.05);
      ctx.fillStyle = lin(ctx, 0, Y(0.44), 0, yTop, [[0, '#b8ecff'], [1, '#5ad0f5']]);
      ctx.beginPath();
      ctx.moveTo(fx0 - hw * 0.2, Y(0.44));
      ctx.bezierCurveTo(fx0 - hw * 0.6, Y(0.52), x0 + hw * 0.3, Y(0.66), x0, yTop);
      ctx.lineTo(x1, yTop);
      ctx.bezierCurveTo(x1 + hw * 0.1, Y(0.66), fx0 + hw * 0.5, Y(0.52), fx0 + hw * 0.2, Y(0.44));
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.5)';
      ctx.lineWidth = 1.5;
      for (let k = 0; k < 5; k++) {
        const q = ((t * 0.004 + k / 5) % 1), yy = Y(0.46) + q * (yTop - Y(0.46)), half = hw * (0.25 + q * 0.75) * 0.5;
        ctx.beginPath();
        ctx.moveTo(mx - half * 0.5, yy);
        ctx.lineTo(mx + half * 0.3, yy);
        ctx.stroke();
      }
    }
    ctx.fillStyle = ch === 0 ? '#b8a88a' : '#a88a5a';
    ctx.fillRect(x0 - R(0.012), yTop, x1 - x0 + R(0.024), yBot - yTop);
    ctx.fillStyle = lin(ctx, 0, yTop, 0, yBot, [[0, '#5ad0f5'], [1, '#2a90d0']]);
    ctx.fillRect(x0, yTop, x1 - x0, yBot - yTop);
    // 흐르는 물결 (아래로)
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = 2;
    for (let k = 0; k < 12; k++) {
      const fy = yTop + (((t * 0.9 + k * 47) % (yBot - yTop)) + (yBot - yTop)) % (yBot - yTop), fx2 = x0 + (hsh(k) * 0.8 + 0.1) * (x1 - x0);
      ctx.beginPath();
      ctx.moveTo(fx2 - R(0.012), fy);
      ctx.quadraticCurveTo(fx2, fy + R(0.006), fx2 + R(0.012), fy);
      ctx.stroke();
    }
    // 강둑 그늘 · 갈대(강가)
    ctx.fillStyle = 'rgba(30,80,120,.25)';
    ctx.fillRect(x0, yTop, R(0.012), yBot - yTop);
    if (ch === 1) {
      ctx.strokeStyle = '#4a9a3a';
      ctx.lineWidth = 2;
      for (let k = 0; k < 8; k++) {
        const rx = k % 2 ? x1 + R(0.008) : x0 - R(0.008), ry = Y(0.95 + k * 0.03);
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx + Math.sin(t * 0.05 + k) * R(0.006), ry - R(0.05));
        ctx.stroke();
        ctx.fillStyle = '#8a5a2a';
        ell(ctx, rx + Math.sin(t * 0.05 + k) * R(0.006), ry - R(0.05), R(0.004), R(0.01));
        ctx.fill();
      }
      // 보 (폭포)
      ctx.fillStyle = '#e8f8ff';
      for (let k = 0; k < 8; k++) (ell(ctx, x0 + ((k + 0.5) / 8) * (x1 - x0), Y(1.17) + Math.sin(t * 0.3 + k) * 2, R(0.014), R(0.008)), ctx.fill());
      // 나룻배 (6판)
      if (fixed >= 6) {
        const bx = x1 - R(0.03), by = Y(0.58) + Math.sin(t * 0.05) * 2;
        ctx.fillStyle = '#c8783a';
        ctx.beginPath();
        ctx.moveTo(bx - R(0.04), by);
        ctx.lineTo(bx + R(0.04), by);
        ctx.lineTo(bx + R(0.025), by + R(0.018));
        ctx.lineTo(bx - R(0.025), by + R(0.018));
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx, by - R(0.05));
        ctx.lineTo(bx + R(0.03), by - R(0.01));
        ctx.closePath();
        ctx.fill();
      }
    }
    // 길이 물길을 만나는 돌 가장자리
    ctx.fillStyle = ch === 0 ? '#c8b08a' : '#b89060';
    ctx.fillRect(x0 - R(0.012), top, R(0.012), bot - top);
    ctx.fillRect(x1, top, R(0.012), bot - top);
  }
  // 마른 웅덩이 (물탱크 판)
  if (L.basin) {
    const [b0, b1] = L.basin;
    ctx.fillStyle = '#c8b090';
    rr(ctx, X(b0), Y(lane - 0.03), X(b1) - X(b0), R(0.08), R(0.02));
    ctx.fill();
    ctx.fillStyle = 'rgba(120,90,60,.3)';
    rr(ctx, X(b0) + R(0.008), Y(lane - 0.02), X(b1) - X(b0) - R(0.016), R(0.05), R(0.015));
    ctx.fill();
  }
}
/** 앞마당 장식 (화단 · 과일 수레 · 상자 더미 · 비계) */
function drawFront(ctx: C2, v: View, L: Level, W: World) {
  const { X, Y, R, t, fixed } = v;
  const inCanal = (x: number) => !!L.canal && x > L.canal[0] - 0.04 && x < L.canal[1] + 0.04;
  if (L.ch === 0) {
    // 길가 화단 (2판부터 꽃)
    for (let k = 0; k < 9; k++) {
      const fx = 0.06 + k * 0.11;
      if (inCanal(fx) || (L.deco.alley !== undefined && Math.abs(fx - L.deco.alley) < 0.08) || fx < 0.2) continue;
      const px = X(fx), py = Y(0.985);
      ctx.fillStyle = '#b8743a';
      rr(ctx, px - R(0.04), py - R(0.012), R(0.08), R(0.03), R(0.008));
      ctx.fill();
      ctx.fillStyle = '#5aa84a';
      ell(ctx, px, py - R(0.014), R(0.04), R(0.016));
      ctx.fill();
      for (let f = 0; f < 4; f++) {
        ctx.fillStyle = fixed >= 2 ? ['#ff5a7a', '#ffcf3a', '#ff8ad0', '#ffffff'][(f + k) % 4] : '#7aa85a';
        ell(ctx, px - R(0.027) + f * R(0.018), py - R(0.022) + Math.sin(t * 0.05 + f + k) * R(0.002), R(fixed >= 2 ? 0.008 : 0.005), R(fixed >= 2 ? 0.008 : 0.005));
        ctx.fill();
      }
    }
    // 과일 수레 (오른쪽 앞)
    const cx = X(0.9), cy = Y(1.14);
    ctx.fillStyle = '#9a5a2a';
    rr(ctx, cx - R(0.08), cy - R(0.05), R(0.16), R(0.05), R(0.008));
    ctx.fill();
    for (let k = 0; k < 7; k++) {
      ctx.fillStyle = ['#ff5a4a', '#ffb02e', '#7ad04a', '#ff5a4a'][k % 4];
      ell(ctx, cx - R(0.065) + k * R(0.022), cy - R(0.056) - (k % 2) * R(0.008), R(0.012), R(0.012));
      ctx.fill();
    }
    ctx.fillStyle = '#ff6a5a';
    ctx.beginPath();
    ctx.moveTo(cx - R(0.09), cy - R(0.12));
    ctx.lineTo(cx + R(0.09), cy - R(0.12));
    ctx.lineTo(cx + R(0.1), cy - R(0.09));
    ctx.lineTo(cx - R(0.1), cy - R(0.09));
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    for (let q = 0; q < 5; q++) ctx.fillRect(cx - R(0.09) + q * R(0.04), cy - R(0.12), R(0.02), R(0.03));
    ctx.fillStyle = '#6a3a1a';
    ctx.fillRect(cx - R(0.085), cy - R(0.09), R(0.006), R(0.045));
    ctx.fillRect(cx + R(0.079), cy - R(0.09), R(0.006), R(0.045));
    // 술통이 부딪칠 상자 더미
    if (L.deco.alley !== undefined) {
      const bx = X(L.deco.alley + 0.02), byy = Y(1.17);
      for (let k = 0; k < 3; k++) {
        ctx.fillStyle = '#d8a060';
        rr(ctx, bx - R(0.05) + (k % 2) * R(0.05), byy - R(0.04) * (k === 2 ? 2 : 1), R(0.048), R(0.04), R(0.004));
        ctx.fill();
        ctx.strokeStyle = '#8a5228';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  } else if (L.ch === 1) {
    // 들꽃 · 울타리
    for (let k = 0; k < 14; k++) {
      const fx = hsh(k + 500), fy = 0.96 + hsh(k + 501) * 0.2;
      if (inCanal(fx)) continue;
      ctx.fillStyle = ['#ff8ab8', '#ffffff', '#ffcf3a'][k % 3];
      ell(ctx, X(fx), Y(fy), R(0.008), R(0.008));
      ctx.fill();
    }
    ctx.strokeStyle = '#b8884a';
    ctx.lineWidth = 2;
    for (const [a, b] of [[0.0, 0.2], [0.78, 1.0]] as [number, number][]) {
      if (inCanal((a + b) / 2)) continue;
      ctx.beginPath();
      ctx.moveTo(X(a), Y(0.775));
      ctx.lineTo(X(b), Y(0.775));
      ctx.stroke();
      for (let q = a; q <= b; q += 0.05) (ctx.beginPath(), ctx.moveTo(X(q), Y(0.79)), ctx.lineTo(X(q), Y(0.75)), ctx.stroke());
    }
    // 엄마 여우의 선착장
    if (L.key === 'raft' && L.canal) {
      ctx.fillStyle = '#b8783a';
      ctx.fillRect(X(L.canal[0] - 0.08), Y(LY + 0.02), R(0.1), R(0.02));
    }
  } else {
    // 시계탑 안: 높은 곳 배우의 발판 (창턱 · 비계)
    for (const a of W.ac) {
      if (a.y > 0.7 || (a.k !== 'grandma' && a.k !== 'beaver')) continue;
      const px = X(a.x), py = Y(a.y);
      ctx.fillStyle = '#8a5a3a';
      ctx.fillRect(px - R(0.006) - R(0.05), py, R(0.012), Y(0.95) - py);
      ctx.fillRect(px - R(0.006) + R(0.05), py, R(0.012), Y(0.95) - py);
      ctx.strokeStyle = 'rgba(120,80,50,.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px - R(0.05), py + R(0.02));
      ctx.lineTo(px + R(0.05), Y(0.93));
      ctx.moveTo(px + R(0.05), py + R(0.02));
      ctx.lineTo(px - R(0.05), Y(0.93));
      ctx.stroke();
      ctx.fillStyle = lin(ctx, 0, py, 0, py + R(0.02), [[0, '#d8a060'], [1, '#9a6030']]);
      rr(ctx, px - R(0.085), py, R(0.17), R(0.02), R(0.004));
      ctx.fill();
    }
    // 걸린 등불
    for (const lx of [0.3, 0.72]) {
      const px = X(lx), py = Y(0.47) + Math.sin(t * 0.04 + lx * 9) * R(0.004);
      ctx.strokeStyle = '#6a4a3a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, py);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,220,130,.35)';
      ell(ctx, px, py + R(0.02), R(0.04), R(0.04));
      ctx.fill();
      ctx.fillStyle = '#ffd86a';
      rr(ctx, px - R(0.012), py, R(0.024), R(0.036), R(0.008));
      ctx.fill();
    }
  }
}
/** 1판부터 살아나는 분수 (앞마당) */
function drawFountain(ctx: C2, v: View, x: number, y: number) {
  const { X, Y, R, t, fixed } = v;
  const cx = X(x), cy = Y(y);
  ctx.fillStyle = '#d8d0c4';
  ell(ctx, cx, cy, R(0.07), R(0.022));
  ctx.fill();
  ctx.fillStyle = fixed >= 1 ? '#6ad0f5' : '#b8a890';
  ell(ctx, cx, cy - R(0.004), R(0.06), R(0.016));
  ctx.fill();
  ctx.fillStyle = '#c8c0b4';
  ctx.fillRect(cx - R(0.008), cy - R(0.05), R(0.016), R(0.048));
  ell(ctx, cx, cy - R(0.05), R(0.025), R(0.008));
  ctx.fill();
  if (fixed >= 1) {
    ctx.fillStyle = 'rgba(200,240,255,.9)';
    for (let k = 0; k < 10; k++) {
      const q = ((t * 0.03 + k / 10) % 1), a = (k / 10) * TAU2;
      ell(ctx, cx + Math.cos(a) * R(0.035) * q, cy - R(0.06) - Math.sin(q * Math.PI) * R(0.05) + q * R(0.04), R(0.005), R(0.005));
      ctx.fill();
    }
  }
}
/** 3장 시계탑 안 */
function drawTower(ctx: C2, v: View, _L: Level, w: number) {
  const { X, Y, R, t, fixed } = v;
  // 뒷벽 벽돌
  ctx.fillStyle = lin(ctx, 0, 0, 0, Y(1.2), [[0, '#f0d8b4'], [1, '#d8b88e']]);
  ctx.fillRect(-10, -10, w + 20, Y(1.25) + 10);
  ctx.strokeStyle = 'rgba(150,100,60,.18)';
  ctx.lineWidth = 1;
  for (let r = 0; r < 26; r++) {
    const yy = Y(r * 0.048);
    ctx.beginPath();
    ctx.moveTo(0, yy);
    ctx.lineTo(w, yy);
    ctx.stroke();
    for (let c = 0; c < 9; c++) {
      const xx = ((c + (r % 2) * 0.5) / 8) * w;
      ctx.beginPath();
      ctx.moveTo(xx, yy);
      ctx.lineTo(xx, yy + R(0.048));
      ctx.stroke();
    }
  }
  // 둥근 창 (밖의 하늘과 마을)
  for (const wx of [0.14, 0.86]) {
    const cx = X(wx), cy = Y(0.2);
    ctx.fillStyle = lin(ctx, 0, cy - R(0.07), 0, cy + R(0.07), [[0, '#8fd8ff'], [1, '#d8f2ff']]);
    ell(ctx, cx, cy, R(0.065), R(0.08));
    ctx.fill();
    ctx.fillStyle = '#9ad87a';
    ctx.beginPath();
    ctx.ellipse(cx, cy + R(0.08), R(0.065), R(0.04), 0, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = '#8a5a3a';
    ctx.lineWidth = R(0.012);
    ell(ctx, cx, cy, R(0.068), R(0.083));
    ctx.stroke();
    ctx.lineWidth = R(0.005);
    ctx.beginPath();
    ctx.moveTo(cx - R(0.065), cy);
    ctx.lineTo(cx + R(0.065), cy);
    ctx.moveTo(cx, cy - R(0.08));
    ctx.lineTo(cx, cy + R(0.08));
    ctx.stroke();
  }
  // 큰 시계판 뒷모습 + 큰 톱니들 (10판부터 돈다)
  const rot = fixed >= 10 ? t * 0.004 : 0;
  ctx.save();
  ctx.globalAlpha = 0.55;
  brass(ctx, X(0.32), Y(0.24), R(0.09), 14, rot);
  brass(ctx, X(0.66), Y(0.3), R(0.07), 12, -rot * 1.3 + 0.1);
  brass(ctx, X(0.5), Y(0.12), R(0.05), 10, rot * 1.8);
  ctx.restore();
  clockFace(ctx, X(0.5), Y(0.31), R(0.08), t, fixed);
  // 큰 종 (11판부터 흔들리며 울린다)
  {
    const bx = X(0.5), by = Y(0.02), sw = fixed >= 11 ? Math.sin(t * 0.05) * 0.25 : 0;
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(sw);
    ctx.fillStyle = '#6a4a3a';
    ctx.fillRect(-R(0.004), -R(0.04), R(0.008), R(0.03));
    ctx.fillStyle = lin(ctx, -R(0.04), 0, R(0.04), 0, [[0, '#ffe08a'], [0.6, '#e0a83a'], [1, '#a8741c']]);
    ctx.beginPath();
    ctx.moveTo(-R(0.02), -R(0.01));
    ctx.quadraticCurveTo(-R(0.025), R(0.04), -R(0.045), R(0.06));
    ctx.lineTo(R(0.045), R(0.06));
    ctx.quadraticCurveTo(R(0.025), R(0.04), R(0.02), -R(0.01));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  // 기둥
  ctx.fillStyle = '#c8a07a';
  for (const px of [0.02, 0.98]) ctx.fillRect(X(px) - R(0.02), 0, R(0.04), Y(1.25));
}
/** 바닥 판(3/4 두께) — 3장 */
function drawFloors(ctx: C2, v: View, L: Level) {
  const { X, Y, R } = v;
  const g = L.ground;
  for (let i = 0; i < g.length; i += 3) {
    const x0 = X(g[i]), x1 = X(g[i + 1]), y = Y(g[i + 2]);
    const th = g[i + 2] < 0.8 ? R(0.05) : Y(1.21) - y;
    ctx.fillStyle = lin(ctx, 0, y, 0, y + th, [[0, '#b8784a'], [1, '#7a4a2a']]);
    ctx.fillRect(x0, y, x1 - x0, th);
    ctx.fillStyle = lin(ctx, 0, y - R(0.03), 0, y, [[0, '#e8b47a'], [1, '#d09a5e']]);
    ctx.fillRect(x0, y - R(0.03), x1 - x0, R(0.03));
    ctx.strokeStyle = 'rgba(100,60,30,.35)';
    ctx.lineWidth = 1;
    for (let q = x0 + R(0.06); q < x1; q += R(0.06)) {
      ctx.beginPath();
      ctx.moveTo(q, y - R(0.03));
      ctx.lineTo(q, y);
      ctx.stroke();
    }
    if (g[i + 2] < 0.8) {
      // 위층 난간
      ctx.strokeStyle = '#8a5a2a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x0 + R(0.03), y - R(0.1));
      ctx.lineTo(x1, y - R(0.1));
      ctx.stroke();
      for (let q = x0 + R(0.03); q < x1; q += R(0.04)) {
        ctx.beginPath();
        ctx.moveTo(q, y - R(0.1));
        ctx.lineTo(q, y - R(0.03));
        ctx.stroke();
      }
    }
  }
  if (L.shaft) {
    const [s0, s1, yt, yb] = L.shaft;
    ctx.fillStyle = 'rgba(60,35,25,.55)';
    ctx.fillRect(X(s0), Y(yt), X(s1) - X(s0), Y(yb + 0.2) - Y(yt));
    // 크레인
    ctx.fillStyle = '#6a4a3a';
    ctx.fillRect(X(s0) - R(0.02), Y(0.33), X(s1) - X(s0) + R(0.12), R(0.02));
    ctx.fillRect(X(s1) + R(0.08), Y(0.33), R(0.02), Y(UP3) - Y(0.33));
    brass(ctx, X((s0 + s1) / 2), Y(0.36), R(0.016), 8, 0);
  }
}

/** 시계 부품 (목표) */
function drawPart(ctx: C2, v: View, x: number, y: number, got: boolean) {
  const { X, Y, R, t } = v;
  const bx = X(x), by = Y(y);
  ctx.fillStyle = '#9a7a5a';
  rr(ctx, bx - R(0.025), by - R(0.03), R(0.05), R(0.03), R(0.008));
  ctx.fill();
  ctx.fillStyle = '#c8a888';
  rr(ctx, bx - R(0.03), by - R(0.036), R(0.06), R(0.01), R(0.004));
  ctx.fill();
  if (got) return;
  const fy = by - R(0.07) + Math.sin(t * 0.08) * R(0.006);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = 'rgba(255,220,120,.25)';
  ell(ctx, bx, fy, R(0.05), R(0.05));
  ctx.fill();
  ctx.restore();
  brass(ctx, bx, fy, R(0.026), 8, t * 0.03, 1);
  ctx.fillStyle = '#ffffff';
  for (let k = 0; k < 3; k++) {
    const a = t * 0.05 + (k * TAU2) / 3;
    starPath(ctx, bx + Math.cos(a) * R(0.04), fy + Math.sin(a) * R(0.03), R(0.006));
    ctx.fill();
  }
}

function heroMood(s: RewState): Mood {
  const H = s.W.hero, t = s.t;
  if (H.st === H_FAIL) return H.why.includes('풍덩') || H.why.includes('물') ? 'wet' : 'dizzy';
  if (H.st === H_WIN) return 'cheer';
  if (H.st === H_FALL) return 'shock';
  const e = s.events;
  for (let i = e.length - 1; i >= 0 && t - e[i].t < 50; i--) {
    const k = e[i].kind;
    if (k === 'plankMend' || k === 'catch' || k === 'ko' || k === 'rescue' || k === 'dock' || k === 'machine' || k === 'potMend') return 'cheer';
    if (k === 'stuck' || k === 'potBreak' || k === 'creak') return 'shock';
  }
  if (H.st === H_WAIT) return 'worry';
  if (H.st === H_IDLE) return 'idle';
  return 'happy';
}

function drawAll(ctx: C2, s: RewState, w: number, h: number, _th: Theme) {
  const fx = juice(s), t = s.t, L = s.L, W = s.W, H = W.hero;
  const X = (x: number) => x * w, Y = (y: number) => (TOPH + y) * w, R = (r: number) => r * w;
  const v: View = { X, Y, R, t, fixed: s.fixed };
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  ctx.fillStyle = L.ch === 2 ? '#e8cca8' : '#bfe6ff';
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  fx.begin(ctx);
  // ═════════ 무대 ═════════
  if (L.ch === 2) drawTower(ctx, v, L, w);
  else {
    drawSky(ctx, v, w, L.ch);
    drawPanorama(ctx, v, w, L.ch);
    if (L.ch === 1) drawMeadow(ctx, v, w);
    else {
      ctx.fillStyle = '#e8d4b8';
      ctx.fillRect(-10, Y(0.48), w + 20, Y(0.8) - Y(0.48));
    }
    drawHouses(ctx, v, L, s);
    // 술통 골목: 뒤로 올라가는 비탈 + 수레
    if (L.deco.alley !== undefined) {
      const ax = L.deco.alley, top = L.deco.top;
      // 골목 안쪽: 멀리 보이는 작은 집들
      ctx.fillStyle = '#f0d8c0';
      ctx.fillRect(X(ax - 0.07), Y(0.36), R(0.14), Y(0.79) - Y(0.36));
      for (const sd of [-1, 1]) {
        const hx = X(ax + sd * 0.05);
        ctx.fillStyle = sd < 0 ? '#ffd0b0' : '#d8e8ff';
        ctx.fillRect(hx - R(0.035), Y(0.4), R(0.07), Y(0.79) - Y(0.4));
        ctx.fillStyle = sd < 0 ? '#e2685a' : '#4a8ad0';
        ctx.beginPath();
        ctx.moveTo(hx - R(0.045), Y(0.4));
        ctx.lineTo(hx, Y(0.36));
        ctx.lineTo(hx + R(0.045), Y(0.4));
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#7aa0d0';
        for (let q = 0; q < 3; q++) ctx.fillRect(hx - R(0.012), Y(0.43 + q * 0.11), R(0.024), R(0.04));
      }
      ctx.fillStyle = 'rgba(90,60,40,.18)';
      ctx.fillRect(X(ax - 0.07), Y(0.36), R(0.14), Y(0.79) - Y(0.36));
      ctx.fillStyle = '#d8c4a4';
      ctx.beginPath();
      ctx.moveTo(X(ax - 0.06), Y(0.79));
      ctx.lineTo(X(ax - 0.035), Y(top));
      ctx.lineTo(X(ax + 0.035), Y(top));
      ctx.lineTo(X(ax + 0.06), Y(0.79));
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(150,110,70,.3)';
      for (let q = 0; q < 8; q++) {
        const yy = Y(top + ((0.79 - top) * q) / 8);
        ctx.beginPath();
        ctx.moveTo(X(ax - 0.04), yy);
        ctx.lineTo(X(ax + 0.04), yy);
        ctx.stroke();
      }
      // 수레
      const cx = X(ax + 0.01), cy = Y(top);
      ctx.fillStyle = '#9a5a2a';
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(0.25);
      rr(ctx, -R(0.06), -R(0.04), R(0.1), R(0.035), R(0.006));
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#5a3418';
      ell(ctx, cx - R(0.04), cy + R(0.005), R(0.014), R(0.014));
      ctx.fill();
    }
  }
  if (L.ch !== 2) {
    drawGround(ctx, v, L, w);
    if (L.ch === 0) drawFountain(ctx, v, 0.12, 1.1);
  } else drawFloors(ctx, v, L);
  drawFront(ctx, v, L, W);
  // 지붕 위 도깨비 자리(망루)
  for (const a of W.ac)
    if (a.role === R_ARCH && L.ch !== 2) {
      ctx.fillStyle = '#9a6a4a';
      rr(ctx, X(a.x - 0.06), Y(a.y), R(0.12), R(0.018), R(0.004));
      ctx.fill();
    }
  // 기계 · 도개교 (톱니 판)
  const mach = W.ac.find((a) => a.k === 'machine');
  if (mach) {
    const mx = X(mach.x), my = Y(mach.y), on = W.mach >= 0;
    ctx.fillStyle = lin(ctx, mx - R(0.07), 0, mx + R(0.07), 0, [[0, '#8a6a5a'], [1, '#5a4038']]);
    rr(ctx, mx - R(0.07), my - R(0.1), R(0.14), R(0.13), R(0.016));
    ctx.fill();
    ctx.fillStyle = '#3a2a24';
    ell(ctx, mx, my + R(0.04), R(0.056), R(0.056));
    ctx.fill();
    if (on) brass(ctx, mx, my + R(0.04), R(0.05), 10, t * 0.06, 0.6);
    else {
      ctx.strokeStyle = 'rgba(255,220,120,.6)';
      ctx.setLineDash([4, 4]);
      ell(ctx, mx, my + R(0.04), R(0.05), R(0.05));
      ctx.stroke();
      ctx.setLineDash([]);
    }
    brass(ctx, mx - R(0.045), my - R(0.06), R(0.025), 8, on ? -t * 0.1 : 0);
    brass(ctx, mx + R(0.04), my - R(0.065), R(0.02), 8, on ? t * 0.12 : 0);
    ctx.fillStyle = on ? '#7aff8a' : '#ff6a5a';
    ell(ctx, mx, my - R(0.088), R(0.008), R(0.008));
    ctx.fill();
  }
  if (L.gate) {
    const [g0, g1, gy] = L.gate;
    // 구덩이
    ctx.fillStyle = 'rgba(50,30,20,.7)';
    ctx.fillRect(X(g0), Y(gy), X(g1) - X(g0), Y(1.21) - Y(gy));
    const q = W.mach >= 0 ? cl01((W.t - W.mach) / 56) : 0;
    const ang = (1 - q) * 1.35;
    ctx.save();
    ctx.translate(X(g1), Y(gy));
    ctx.rotate(ang);
    ctx.fillStyle = lin(ctx, 0, -R(0.03), 0, 0, [[0, '#d89a5e'], [1, '#8a5228']]);
    rr(ctx, -(X(g1) - X(g0)), -R(0.03), X(g1) - X(g0), R(0.03), R(0.006));
    ctx.fill();
    ctx.strokeStyle = '#5a3418';
    ctx.lineWidth = 1;
    for (let k = 1; k < 6; k++) (ctx.beginPath(), ctx.moveTo(-(X(g1) - X(g0)) * (k / 6), -R(0.03)), ctx.lineTo(-(X(g1) - X(g0)) * (k / 6), 0), ctx.stroke());
    ctx.restore();
    // 사슬
    ctx.strokeStyle = '#7a7a8a';
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 2]);
    ctx.beginPath();
    ctx.moveTo(X(g1), Y(gy - 0.32));
    ctx.lineTo(X(g1) - Math.cos(ang) * (X(g1) - X(g0)), Y(gy) - Math.sin(ang) * (X(g1) - X(g0)));
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // 목표
  drawPart(ctx, v, L.gearX, L.gearY, H.st === H_WIN);
  // 말뚝 (걸림 자리): 되감는 통나무·뗏목이 걸 수 있는 동안 빛나며 '지금 톡!'
  for (const th of W.th) {
    if (th.dock < 0 || !L.canal) continue;
    const can = th.st === REW && canDock(th);
    for (const bx of [L.canal[0] - 0.012, L.canal[1] + 0.012]) {
      const px = X(bx), py = Y(LY + 0.01);
      if (can) {
        ctx.fillStyle = `rgba(140,255,160,${0.35 + Math.sin(t * 0.5) * 0.15})`;
        ell(ctx, px, py - R(0.03), R(0.03), R(0.045));
        ctx.fill();
      }
      ctx.fillStyle = lin(ctx, px - R(0.01), 0, px + R(0.01), 0, [[0, can ? '#9af0a0' : '#a8703a'], [1, can ? '#4ac060' : '#6a4020']]);
      rr(ctx, px - R(0.009), py - R(0.06), R(0.018), R(0.07), R(0.006));
      ctx.fill();
      ctx.fillStyle = can ? '#d8ffd8' : '#c8904e';
      ell(ctx, px, py - R(0.06), R(0.009), R(0.005));
      ctx.fill();
    }
    if (can) {
      font(0.036, 900);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const lx = X((L.canal[0] + L.canal[1]) / 2), ly = Y(LY - 0.13), tw = ctx.measureText('지금 다시 톡!').width + R(0.04);
      ctx.fillStyle = '#3ab85a';
      rr(ctx, lx - tw / 2, ly - R(0.024), tw, R(0.048), R(0.024));
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText('지금 다시 톡!', lx, ly + 1);
    }
  }
  // ═════════ 물건 ═════════
  const rewTh = W.rew >= 0 ? thingOf(W, W.rew) : undefined;
  for (const th of W.th) {
    if (th.st === DONE && th.k !== 'water') continue;
    // 지나온 길 (되감을 수 있는 것)
    if (th.st !== WAIT && th.tau > 0) drawTrail(ctx, v, th, th.st === REW ? 'rgba(127,232,255,.8)' : 'rgba(255,255,255,.4)');
    drawFuture(ctx, v, th);
  }
  // 집 주인·배우(뒤쪽: 발코니·지붕·수레·물탱크)
  for (const a of W.ac) if (a.y < 0.7 && a.role !== R_RIDER && a.k !== 'machine') drawActor(ctx, v, s, a);
  for (const th of W.th) {
    if (th.st === DONE && th.k !== 'water') continue;
    // 잔상: 되감는 물건은 조금 전(τ가 컸던) 자리들이 시안빛으로 남는다
    if (th.st === REW && th.k !== 'water' && th.k !== 'bridge') {
      ctx.save();
      for (let k = 3; k >= 1; k--) {
        ctx.globalAlpha = 0.14 * (4 - k);
        drawThingAt(ctx, v, th, Math.min(th.dur, th.tau + k * 7), 1);
      }
      ctx.restore();
    }
    drawThingAt(ctx, v, th, th.tau);
    // 쉬는 중 고리 (곧 다시 움직인다)
    if (th.st === HOLD && th.k !== 'arrow') {
      pose(th, th.tau);
      const cx = th.k === 'bridge' ? X((th.x + th.x2) / 2) : X(P.x), cy = th.k === 'bridge' ? Y(th.y - 0.1) : Y(P.y - 0.08);
      const max = th.tau === 0 ? th.hf : HOLD_STOP, q = Math.min(1, th.hold / max);
      ctx.strokeStyle = 'rgba(255,255,255,.85)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, R(0.022), -Math.PI / 2, -Math.PI / 2 + TAU2 * q);
      ctx.stroke();
      hourglass(ctx, cx, cy, R(0.011), q, 0);
    }
  }
  // ═════════ 배우 (길 위) ═════════
  for (const a of W.ac) if ((a.y >= 0.7 || a.role === R_RIDER) && a.k !== 'machine') drawActor(ctx, v, s, a);
  // 주인공
  {
    const u = R(0.0128), mood = heroMood(s), walk = H.st === H_WALK ? 1 : 0;
    const fail = H.st === H_FAIL;
    let hx = X(H.x), hy = Y(H.y), tilt = 0;
    if (H.st === H_FALL) tilt = Math.sin(t * 0.6) * 0.4;
    if (fail && mood === 'dizzy') tilt = -0.25;
    if (fail && mood === 'wet') hy = Y(Math.min(H.fallY, H.y)) + Math.sin(t * 0.1) * 2;
    shadow(ctx, hx, Y(H.y), R(0.035), fail && mood === 'wet' ? 0 : 0.22);
    if (fail && mood === 'wet') {
      // 물에 빠져 튜브 타고 둥실
      ctx.fillStyle = '#ff5a5a';
      ell(ctx, hx, hy - R(0.01), R(0.045), R(0.016));
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      for (const sd of [-1, 1]) (ell(ctx, hx + sd * R(0.03), hy - R(0.01), R(0.01), R(0.012)), ctx.fill());
    }
    drawOwl(ctx, hx, hy - (fail && mood === 'wet' ? R(0.01) : 0), u, mood, t, walk, tilt);
    if (H.st === H_WAIT && t % 90 < 50) {
      ctx.fillStyle = '#ffffff';
      rr(ctx, hx - R(0.02), hy - R(0.165), R(0.04), R(0.034), R(0.012));
      ctx.fill();
      font(0.028, 900);
      ctx.fillStyle = '#ff5a4a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', hx, hy - R(0.147));
    }
    hx += 0;
  }
  // ═════════ 되감기 빛 (시계 문양) ═════════
  if (rewTh) {
    const tc = thingCenter(rewTh), age = t - (fx.memo['rw' + rewTh.id] ?? t);
    const big = age < 16 ? 1.5 - age / 32 : 1;
    clockGlyph(ctx, X(tc.x), Y(tc.y), R(tc.r) * big, t, age < 16 ? 0.9 - age * 0.025 : 0.5);
    // 모래가 물건으로 흘러간다
    ctx.fillStyle = '#ffd25a';
    for (let k = 0; k < 6; k++) {
      const q = ((t * 0.035 + k / 6) % 1), sx = X(0.07), sy = Y(1.25);
      const px = sx + (X(tc.x) - sx) * q, py = sy + (Y(tc.y) - sy) * q - Math.sin(q * Math.PI) * R(0.12);
      ell(ctx, px, py, R(0.005), R(0.005));
      ctx.fill();
    }
  }
  // ═════════ 손가락 안내 ═════════
  drawGuide(ctx, s, v, font);
  // ═════════ 사건 → 연출 · 소리 ═════════
  doEvents(ctx, s, v);
  ctx.restore();
  drawHud(ctx, s, w, h, v, font);
}
/** 물건의 가운데·크기 (시계 문양 자리) */
function thingCenter(th: Thing): { x: number; y: number; r: number } {
  pose(th, th.tau);
  switch (th.k) {
    case 'bridge':
      return { x: (th.x + th.x2) / 2, y: th.y - 0.01, r: 0.13 };
    case 'water':
      return { x: th.x, y: th.y - 0.03, r: 0.1 };
    case 'raft':
      return { x: P.x, y: P.y, r: 0.12 };
    case 'log':
      return th.tau < LOG_LIE ? { x: th.x + Math.sin(P.a) * th.w * 0.5, y: th.y - Math.cos(P.a) * th.w * 0.5, r: 0.12 } : { x: (th.x + th.x2) / 2, y: P.y, r: 0.13 };
    case 'crate':
      return { x: P.x, y: P.y + th.h / 2, r: 0.11 };
    case 'gear':
      return { x: P.x, y: P.y - 0.05, r: 0.08 };
    case 'barrel':
      return { x: P.x, y: P.y - 0.034, r: 0.07 };
    case 'balloon':
      return { x: P.x, y: P.y + 0.05, r: 0.09 };
    case 'pot':
      return { x: P.x, y: P.y, r: 0.07 };
    default:
      return { x: P.x, y: P.y, r: 0.06 };
  }
}
function drawActor(ctx: C2, v: View, s: RewState, a: Actor) {
  const { X, Y, R, t } = v;
  const W = s.W, u = R(0.0105);
  let mood: Mood = 'idle', arms = 0;
  const recent = (k: string, id = -1) => s.events.some((e) => e.kind === k && t - e.t < 70 && (id < 0 || e.id === id));
  if (a.hurt) mood = 'wet';
  else if (a.ko) mood = 'dizzy';
  else if (a.saved) mood = 'cheer';
  else if (a.role === R_ARCH) mood = 'grin';
  else if (a.role === R_WALK) mood = 'grin';
  // 주인: 자기 물건이 움직이면 팔 벌려 기다린다, 받으면 기뻐한다
  const own = W.th.find((q) => q.owner === a.id && q.k !== 'arrow');
  if (own && a.role === R_DECO) {
    if (own.st === DONE) mood = t - a.t < 120 ? 'cheer' : 'happy';
    else if (own.tau > 0) (mood = 'shock'), (arms = 1);
  }
  if (a.k === 'cat' && a.role === R_VILL && !a.hurt) mood = s.L.key === 'water' ? 'sleep' : 'idle';
  if (a.role === R_VILL && !a.hurt && W.th.some((q) => dangerOf(q) !== null && Math.hypot(D.x - a.x, D.y - a.y) < 0.25)) mood = 'shock';
  if (a.role === R_RIDER && !a.saved && !a.hurt) mood = 'shock';
  if (a.k === 'goblin' && !a.ko && a.next - W.t < 50 && a.next - W.t > 0) arms = 1;
  if (a.k === 'kid' && a.role === R_DECO && s.L.key === 'bridge') mood = recent('plankMend') ? 'cheer' : W.th[0].tau > 20 ? 'shock' : 'happy';
  let dir = a.x > 0.5 ? -1 : 1;
  if (a.k === 'goblin' || a.k === 'walker') dir = -1;
  if (a.k === 'machine') return;
  if (a.hurt && a.role === R_RIDER) return;
  if (a.role !== R_RIDER || a.saved) shadow(ctx, X(a.x), Y(a.y), R(0.025), 0.18);
  critter(ctx, a.k, X(a.x), Y(a.y), u, mood, t + a.id * 13, dir, arms);
}
/** 처음 하는 사람: 손가락이 물건 위에서 톡 + 안내 한 줄 */
function drawGuide(ctx: C2, s: RewState, v: View, font: (sz: number, w?: number) => void) {
  const { X, Y, R, t } = v;
  const W = s.W, H = W.hero;
  let target: Thing | null = null, line = '';
  if (s.stage === 0 && s.firstTap < 0 && s.phase === 'play') {
    target = W.th[0];
    line = '다리를 톡! 다리만 시간이 거꾸로';
  } else if (s.phase === 'play' && H.st === H_WAIT && s.idleT > 150 && t - s.lastTap > 150) {
    let bd = 9;
    for (const th of W.th) {
      if (!tappable(th)) continue;
      pose(th, th.tau);
      const d = Math.hypot(P.x - H.x, P.y - H.y);
      if (d < bd) (bd = d), (target = th);
    }
    line = W.sand > 0 ? '막혔어요 — 무엇을 되감을까?' : '';
  }
  if (target) {
    const c = thingCenter(target), pr = (t % 50) / 50, press = pr > 0.55 && pr < 0.8 ? 1 : 0;
    ctx.strokeStyle = `rgba(255,255,255,${0.8 - pr * 0.6})`;
    ctx.lineWidth = 3;
    ell(ctx, X(c.x), Y(c.y), R(0.03 + pr * 0.05), R(0.03 + pr * 0.05));
    ctx.stroke();
    drawHand(ctx, X(c.x) + R(0.02), Y(c.y) + R(0.075) - press * R(0.012), R(0.06), press);
  }
  if (line) {
    font(0.042, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const tw = ctx.measureText('👆 ' + line).width + R(0.06), cy = Y(0.6);
    ctx.fillStyle = 'rgba(40,30,60,.72)';
    rr(ctx, X(0.5) - tw / 2, cy - R(0.034), tw, R(0.068), R(0.034));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText('👆 ' + line, X(0.5), cy + 1);
  }
}
/** 사건 → 파티클·글자·흔들림·소리 (사건마다 소리, 큰 것은 낮게, 연쇄는 높아지게) */
function doEvents(_ctx: C2, s: RewState, v: View) {
  const fx = juice(s), { X, Y, R, t } = v;
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    if (e.t <= seenT || e.t > t) continue;
    const x = X(e.x), y = Y(e.y), cx = Math.max(R(0.14), Math.min(X(1) - R(0.14), x));
    const th = e.id >= 0 ? thingOf(s.W, e.id) : undefined, big = th ? th.big : 1;
    switch (e.kind) {
      case 'rew': {
        fx.memo['rw' + e.id] = t;
        const c = th ? thingCenter(th) : { x: e.x, y: e.y, r: 0.08 };
        fx.ring(X(c.x), Y(c.y), '#7fe8ff', R(c.r * 1.5), 6);
        fx.ring(X(c.x), Y(c.y), '#ffffff', R(c.r * 0.9), 3);
        fx.burst(X(c.x), Y(c.y), '#ffd25a', 18, 4, 2.4);
        fx.burst(X(c.x), Y(c.y), '#7fe8ff', 14, 3, 2.2);
        fx.pop(Math.max(R(0.14), Math.min(X(1) - R(0.14), X(c.x))), Math.max(R(0.16), Y(c.y) - R(c.r) - R(0.09)), '되감기!', '#bff6ff', s.firstTap === t ? 34 : 26);
        fx.blink('#bff0ff', s.firstTap === t ? 0.3 : 0.14);
        fx.kick(s.firstTap === t ? 6 : 3);
        fx.sound('rewind', 1.25 / big, 1);
        fx.sound('whoosh', 0.7 / big, 0.6);
        break;
      }
      case 'stop':
        fx.pop(cx, y - R(0.06), '멈춤!', '#ffffff', 20);
        fx.ring(x, y, '#ffffff', R(0.07), 3);
        fx.sound('tick', 1, 0.8);
        fx.sound('thud', 1.6, 0.4);
        break;
      case 'dock':
        fx.pop(cx, y - R(0.07), '척! 걸렸다', '#fff27a', 26);
        fx.ring(x, y, '#fff27a', R(0.12), 5);
        fx.burst(x, y, '#ffffff', 16, 3.5, 2.2);
        fx.kick(4);
        fx.sound('thud', 0.9, 0.9);
        fx.sound('ding', 1.1, 0.8);
        break;
      case 'origin':
        if (th?.k !== 'bridge') fx.pop(cx, y - R(0.07), '착!', '#fff27a', 30);
        fx.ring(x, y, '#ffd25a', R(0.1), 5);
        fx.burst(x, y, '#ffd25a', 16, 3.5, 2.4);
        fx.sound('ding', 1, 0.9);
        break;
      case 'catch': {
        fx.pop(cx, y - R(0.08), '받았다! 고마워!', '#ffe0f0', 26);
        fx.burst(x, y, '#ff8ab8', 16, 3.5, 2.6);
        fx.burst(x, y, '#ffd25a', 12, 3, 2);
        fx.ring(x, y, '#ffd25a', R(0.12), 5);
        fx.kick(3);
        fx.sound('chime', 1, 1);
        break;
      }
      case 'ko':
        fx.pop(cx, y - R(0.13), '뿅! 꽈당!', '#fff27a', 38);
        for (const c of ['#ffe066', '#7ad86a', '#ffffff']) fx.burst(x, y - R(0.04), c, 16, 5, 2.6);
        fx.ring(x, y - R(0.04), '#fff27a', R(0.16), 6);
        fx.blink('#fff6c8', 0.25);
        fx.kick(8);
        fx.sound('boing', 0.8, 1.2);
        fx.sound('thud', 1.2, 0.6);
        break;
      case 'rescue':
        fx.pop(cx, y - R(0.12), '구했다!', '#ffe0f0', 34);
        fx.burst(x, y - R(0.04), '#ff8ab8', 20, 4, 2.6);
        fx.ring(x, y - R(0.04), '#ffd25a', R(0.14), 6);
        fx.kick(4);
        fx.sound('chime', 1.25, 1);
        break;
      case 'machine':
        fx.pop(cx, y - R(0.12), '철컥! 기계가 돌아요', '#fff27a', 26);
        fx.burst(x, y, '#ffd25a', 26, 5, 2.8);
        fx.ring(x, y, '#ffd25a', R(0.18), 6);
        fx.blink('#fff6c8', 0.2);
        fx.kick(6);
        fx.sound('coin', 0.8, 1);
        fx.sound('clear', 0.8, 0.7);
        break;
      case 'plankMend': {
        const n = th ? th.n : 4, k = n - 1 - e.v;
        if (k === n - 1) fx.pop(cx, y - R(0.08), '착!', '#fff27a', 40);
        fx.burst(x, y, '#ffd25a', 10 + k * 4, 3 + k * 0.6, 2.2);
        fx.burst(x, y + R(0.03), '#bff0ff', 8, 3, 2);
        fx.ring(x, y, '#ffd25a', R(0.06 + k * 0.02), 4);
        fx.kick(2 + k);
        fx.sound('ding', 0.9 + k * 0.14, 0.8);
        if (k === n - 1) (fx.blink('#fff6c8', 0.18), fx.sound('chime', 1.1, 0.8));
        break;
      }
      case 'potMend':
      case 'barrelMend':
        fx.pop(cx, y - R(0.06), '착!', '#fff27a', 28);
        fx.burst(x, y - R(0.02), '#ffd25a', 18, 3.5, 2.4);
        fx.ring(x, y - R(0.02), '#ffffff', R(0.08), 4);
        fx.sound('ding', 1.3, 0.9);
        break;
      case 'logLift':
      case 'treeUp':
      case 'crateLift':
        fx.burst(x, y, '#bff0ff', 12, 3, 2.2);
        fx.sound('swell', 0.8 / big, 0.8);
        break;
      case 'creak':
        fx.pop(cx, y - R(0.06), '삐걱…', '#ffe8c8', 18);
        fx.sound('crack', 0.6, 0.4);
        break;
      case 'plankLift':
        // 물속 판자가 거꾸로 솟는다 — 물방울이 판자를 따라 위로
        fx.burst(x, y, '#bff0ff', 14, 3, 2.4);
        fx.burst(x, y - R(0.02), '#ffffff', 8, 2, 1.8);
        fx.ring(x, y, 'rgba(191,240,255,.9)', R(0.05), 3);
        fx.sound('swell', 1.2 + e.v * 0.08, 0.5);
        break;
      case 'plankSplash':
        fx.burst(x, y, '#bff0ff', 12, 3.5, 2.4);
        fx.burst(x, y, '#ffffff', 6, 2.5, 2);
        if (e.v === 0) fx.pop(cx, y - R(0.04), '풍덩!', '#e8f8ff', 22);
        fx.kick(2);
        fx.sound('splash', 1.15 - e.v * 0.05, 0.6);
        break;
      case 'potFall':
        fx.sound('whoosh', 1.5, 0.5);
        break;
      case 'potBreak':
        fx.pop(cx, y - R(0.06), '쨍그랑!', '#ffd8c8', 26);
        fx.burst(x, y - R(0.01), '#d86a3a', 18, 4, 2.4);
        fx.burst(x, y - R(0.01), '#7a5a3a', 10, 3, 2);
        fx.kick(4);
        fx.sound('crack', 1.4, 0.9);
        break;
      case 'barrelSmash':
        fx.pop(cx, y - R(0.06), '와장창!', '#ffe0c8', 24);
        fx.burst(x, y - R(0.02), '#b8743a', 18, 4, 2.6);
        fx.kick(4);
        fx.sound('crack', 0.8, 0.8);
        fx.sound('thud', 0.9, 0.7);
        break;
      case 'gearStop':
        fx.burst(x, y, '#c8a080', 10, 2.5, 2);
        fx.sound('thud', 0.7, 0.8);
        break;
      case 'arrowStick':
        fx.burst(x, y, '#c8a080', 8, 2, 1.8);
        fx.sound('thud', 1.8, 0.4);
        break;
      case 'arrowHome':
        fx.ring(x, y, '#7fe8ff', R(0.06), 3);
        fx.sound('whoosh', 1.9, 0.4);
        break;
      case 'arrowPull':
        fx.burst(x, y, '#c8a080', 6, 2, 1.6);
        fx.sound('pop', 1.6, 0.5);
        break;
      case 'gearUnstop':
        fx.burst(x, y, '#ffd25a', 10, 2.5, 2);
        fx.sound('swell', 0.7, 0.7);
        break;
      case 'chapter':
        for (const c of ['#ffd25a', '#ffffff', '#7fe8ff']) fx.burst(X(0.5), Y(0.5), c, 18, 5, 2.6);
        fx.sound('chime', 0.8, 1);
        break;
      case 'shoot':
        fx.pop(cx, y - R(0.04), '슝!', '#ffe0d0', 20);
        fx.sound('zap', 1.4, 0.5);
        fx.sound('whoosh', 1.6, 0.4);
        break;
      case 'weir':
        fx.burst(x, y, '#ffffff', 20, 4, 2.6);
        fx.sound('splash', 0.7, 0.9);
        break;
      case 'treeFall':
        fx.pop(cx, y - R(0.2), '쿵— 기우뚱', '#fff2d0', 20);
        fx.sound('crack', 0.7, 0.7);
        break;
      case 'logLand':
        fx.burst(x, y, '#bff0ff', 22, 4.5, 2.6);
        fx.kick(5);
        fx.sound('thud', 0.6, 1);
        fx.sound('splash', 0.8, 0.8);
        break;
      case 'burst':
        fx.pop(cx, y - R(0.12), '콸콸!', '#bff0ff', 28);
        fx.burst(x, y, '#7fd8ff', 22, 4.5, 2.6);
        fx.kick(4);
        fx.sound('crack', 0.9, 0.6);
        fx.sound('splash', 0.8, 1);
        break;
      case 'crateDrop':
        fx.sound('whoosh', 0.8, 0.6);
        break;
      case 'crateLand':
        fx.pop(cx, y - R(0.05), '쿵!', '#ffe0c8', 30);
        fx.burst(x, y, '#e8d0b0', 20, 4, 2.6);
        fx.kick(7);
        fx.sound('thud', 0.55, 1.2);
        break;
      case 'balloonGone':
      case 'lost':
        fx.pop(cx, Math.max(R(0.2), y - R(0.06)), '아앗, 놓쳤다…', '#ffe0e0', 22);
        fx.sound('fail', 1.3, 0.5);
        break;
      case 'hurt':
        fx.pop(cx, y - R(0.08), '아야!', '#ffd0d0', 26);
        fx.burst(x, y, '#ffffff', 12, 3, 2);
        fx.kick(5);
        fx.sound('thud', 1.1, 0.8);
        fx.sound('fail', 1.4, 0.4);
        break;
      case 'wet':
        fx.pop(cx, y - R(0.08), '냐아아!', '#bff0ff', 26);
        fx.burst(x, y, '#7fd8ff', 14, 3, 2.2);
        fx.sound('splash', 1.3, 0.7);
        break;
      case 'bonk':
        fx.pop(cx, y - R(0.12), s.W.hero.why || '쿵!', '#ffd0c0', 30);
        for (const c of ['#ffffff', '#ffe066']) fx.burst(x, y, c, 16, 4.5, 2.4);
        fx.ring(x, y, '#ffe066', R(0.1), 5);
        fx.kick(9);
        fx.blink('#ffb0a0', 0.2);
        fx.sound('boing', 0.7, 1);
        fx.sound('thud', 0.9, 0.9);
        break;
      case 'splash':
        fx.pop(cx, y - R(0.1), '풍덩!', '#bff0ff', 34);
        fx.burst(x, y, '#bff0ff', 26, 5, 2.8);
        fx.burst(x, y, '#ffffff', 12, 3.5, 2);
        fx.kick(7);
        fx.sound('splash', 0.6, 1.2);
        break;
      case 'fall':
        fx.sound('whoosh', 0.6, 0.7);
        break;
      case 'stuck':
        fx.pop(cx, y - R(0.18), '어?', '#ffffff', 22);
        fx.sound('tick', 0.8, 0.4);
        break;
      case 'board':
        fx.sound('pop', 1.4, 0.4);
        break;
      case 'go':
        fx.sound('pop', 1.2, 0.5);
        break;
      case 'gearGet':
        fx.pop(cx, y - R(0.14), '시계 부품!', '#fff27a', 36);
        for (const c of ['#ffd25a', '#ffffff', '#ffe066']) fx.burst(x, y - R(0.07), c, 20, 5, 2.8);
        fx.ring(x, y - R(0.07), '#ffd25a', R(0.18), 6);
        fx.blink('#fff6c8', 0.25);
        fx.kick(6);
        fx.sound('coin', 1, 1);
        fx.sound('chime', 1.2, 0.8);
        break;
      case 'notyet':
        fx.pop(cx, y - R(0.05), '아직 그대로예요', '#ffffff', 16);
        fx.sound('tick', 1.3, 0.4);
        break;
      case 'nosand':
        fx.pop(cx, y - R(0.05), '모래가 없어요', '#ffd0c0', 18);
        fx.sound('fail', 1.6, 0.4);
        break;
      case 'empty':
        fx.pop(cx, y - R(0.06), '모래가 다 떨어졌다!', '#ffd0c0', 20);
        fx.sound('fail', 1.4, 0.5);
        break;
      case 'miss':
        fx.ring(x, y, 'rgba(255,255,255,.8)', R(0.04), 2);
        fx.sound('tick', 1.5, 0.3);
        break;
      case 'clear':
        for (const c of ['#ffe066', '#ff8ab8', '#7fe8ff', '#7ad86a', '#ffffff']) fx.burst(X(0.5), Y(0.45), c, 20, 6, 3);
        fx.blink('#fff6c8', 0.22);
        fx.sound('clear', 1, 1);
        break;
      case 'fail':
        fx.kick(9);
        fx.blink('#ff9a8a', 0.2);
        fx.sound('fail', 1, 0.9);
        break;
    }
  }
  // 되감는 동안 시계가 거꾸로 째깍 · 쉬던 물건이 곧 다시 움직이면 똑딱 (사건 아닌 '지금'의 소리)
  if (s.phase === 'play' && t !== fx.memo.tk) {
    fx.memo.tk = t;
    const W = s.W;
    if (W.rew >= 0 && t % 9 === 0) fx.sound('tick', 1.8 - ((t / 9) % 4) * 0.12, 0.3);
    for (const th of W.th) if (th.st === HOLD && th.k !== 'arrow' && th.hold < 40 && th.hold % 12 === 0) fx.sound('tick', 1.1, 0.35);
  }
  if (s.phase === 'result' && s.ok && s.won && t % 14 === 0) {
    const fxx = X(0.15 + hsh(t) * 0.7), fyy = Y(0.08 + hsh(t + 1) * 0.25);
    for (const c of ['#ff5a7a', '#ffd25a', '#7fe8ff', '#7ad86a']) fx.burst(fxx, fyy, c, 10, 4, 2.4);
    fx.sound('pop', 0.7 + hsh(t + 2) * 0.6, 0.6);
  }
  fx.memo.t = t;
}

function starText(s: RewState, k: StarK): string {
  const L = s.L;
  if (k === 'goal') return '시계 부품까지 가기';
  if (k === 'sand') return `되감기 ${(L.par / 60).toFixed(1)}초 안에`;
  if (k === 'safe') return '아무도 안 다치게';
  const r = L.actors.find((a) => a.role === R_RIDER);
  return r && r.k === 'cat' ? '고양이 구하기' : '아이 구하기';
}
function drawHud(ctx: C2, s: RewState, w: number, h: number, v: View, font: (sz: number, w?: number) => void) {
  const { R } = v;
  const L = s.L, W = s.W, d = STAGES[s.stage], t = s.t;
  // ── 위 띠: 판 · 부품 · 하트
  ctx.fillStyle = 'rgba(52,34,70,.9)';
  ctx.fillRect(0, 0, w, R(TOPH));
  ctx.fillStyle = '#ffb02e';
  ctx.fillRect(0, R(TOPH) - 2, w, 2);
  font(0.04, 900);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff2d8';
  ctx.fillText(`${d.ch + 1}-${(s.stage % 4) + 1} ${d.name}`, R(0.03), R(0.044), R(0.46));
  for (let k = 0; k < 3; k++) {
    heartPath(ctx, w - R(0.04) - k * R(0.048), R(0.042), R(0.016));
    ctx.fillStyle = k < s.hearts ? '#ff4a5a' : 'rgba(255,255,255,.18)';
    ctx.fill();
  }
  brass(ctx, w - R(0.285), R(0.043), R(0.02), 8, t * 0.02);
  font(0.036, 900);
  ctx.fillStyle = '#ffe6a0';
  ctx.fillText(`${s.gears}/${STAGE_COUNT}`, w - R(0.258), R(0.045));
  // ── 아래 띠: 모래시계 · 별 조건
  const by = (TOPH + BOTY) * w;
  ctx.fillStyle = lin(ctx, 0, by, 0, h, [[0, '#4a2e5e'], [1, '#2e1c40']]);
  ctx.fillRect(0, by, w, h - by);
  ctx.fillStyle = '#ffb02e';
  ctx.fillRect(0, by, w, 2);
  const sand = Math.max(0, W.sand), q = sand / L.sand, rewing = W.rew >= 0;
  const fx = juice(s), flipAge = t - (fx.memo.flip ?? -99);
  if (rewing && (fx.memo.flipId ?? -1) !== W.rew) (fx.memo.flipId = W.rew), (fx.memo.flip = t);
  if (!rewing) fx.memo.flipId = -1;
  const ry = by + R(0.045);
  hourglass(ctx, R(0.055), ry, R(0.028), q, flipAge < 14 ? flipAge / 14 : 0);
  const bx0 = R(0.1), bw = w - R(0.13), bh = R(0.03);
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  rr(ctx, bx0, ry - bh / 2, bw, bh, bh / 2);
  ctx.fill();
  ctx.fillStyle = lin(ctx, 0, ry - bh / 2, 0, ry + bh / 2, [[0, '#ffe08a'], [1, '#f2a83a']]);
  rr(ctx, bx0, ry - bh / 2, Math.max(bh, bw * q), bh, bh / 2);
  ctx.fill();
  if (rewing) {
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    const sx = bx0 + bw * q - R(0.01) - ((t * 2) % R(0.04));
    ctx.fillRect(sx, ry - bh / 2 + 2, R(0.012), bh - 4);
  }
  // 별 기준선 (모래를 이만큼 남기면 ★)
  if (L.stars.includes('sand')) {
    const px = bx0 + bw * (1 - L.par / L.sand);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(px, ry - bh * 0.85);
    ctx.lineTo(px, ry + bh * 0.85);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffd23a';
    starPath(ctx, px, ry - bh * 0.95, R(0.012));
    ctx.fill();
  }
  font(0.03, 900);
  ctx.fillStyle = '#4a2e1a';
  ctx.textAlign = 'left';
  ctx.fillText(`모래 ${(sand / 60).toFixed(1)}초`, bx0 + R(0.012), ry + 1);
  // 별 조건 (한 줄 말)
  const live = starsLive(s), res = s.phase === 'result' && s.ok ? s.starOk : live;
  font(0.033, 800);
  let cx = R(0.03), cy = by + R(0.105);
  L.stars.forEach((k, j) => {
    const txt = starText(s, k), tw = ctx.measureText(txt).width + R(0.07);
    if (cx + tw > w - R(0.02)) (cx = R(0.03)), (cy += R(0.05));
    const on = res[j], broken = !on && ((k === 'sand' && W.used > L.par) || ((k === 'safe' || k === 'rescue') && W.hurt > 0));
    ctx.fillStyle = on ? 'rgba(255,220,90,.22)' : 'rgba(0,0,0,.28)';
    rr(ctx, cx, cy - R(0.022), tw, R(0.044), R(0.022));
    ctx.fill();
    ctx.fillStyle = on ? '#ffcf3a' : broken ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.55)';
    starPath(ctx, cx + R(0.027), cy, R(0.017));
    ctx.fill();
    ctx.fillStyle = on ? '#fff6d0' : broken ? 'rgba(255,230,220,.5)' : '#fff0dc';
    ctx.textAlign = 'left';
    ctx.fillText(txt, cx + R(0.052), cy + 1);
    if (broken) {
      ctx.strokeStyle = 'rgba(255,150,140,.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx + R(0.05), cy + 1);
      ctx.lineTo(cx + tw - R(0.014), cy + 1);
      ctx.stroke();
    }
    cx += tw + R(0.016);
  });
  // ── 판 띠·결과·장 넘김
  drawCards(ctx, s, w, v, font);
}
/** 지금 지켜지고 있는 별 (부품은 아직이면 꺼짐) */
function starsLive(s: RewState): boolean[] {
  const L = s.L, W = s.W, win = W.hero.st === H_WIN;
  return L.stars.map((k) => (k === 'goal' ? win : k === 'sand' ? W.used <= L.par : k === 'safe' ? W.hurt === 0 : W.saved > 0));
}
/** 복원된 것 작은 그림 (결과 화면) */
function fixIcon(ctx: C2, k: number, x: number, y: number, r: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  const pop = 1 + Math.max(0, Math.sin(t * 0.15)) * 0.08;
  ctx.scale(pop, pop);
  ctx.fillStyle = '#fff3d0';
  ell(ctx, 0, 0, r * 1.15, r * 1.15);
  ctx.fill();
  ctx.strokeStyle = '#ffb02e';
  ctx.lineWidth = 2;
  ctx.stroke();
  if (k === 0) {
    ctx.fillStyle = '#5ac8f0';
    ell(ctx, 0, r * 0.45, r * 0.8, r * 0.25);
    ctx.fill();
    for (let q = 0; q < 5; q++) (ell(ctx, (q - 2) * r * 0.25, -r * 0.2 - Math.abs(Math.sin(t * 0.2 + q)) * r * 0.4, r * 0.1, r * 0.1), ctx.fill());
  } else if (k === 1) {
    for (let q = 0; q < 3; q++) (ctx.fillStyle = ['#ff5a7a', '#ffcf3a', '#ff8ad0'][q], ell(ctx, (q - 1) * r * 0.5, -r * 0.1, r * 0.28, r * 0.28), ctx.fill());
    ctx.fillStyle = '#9a5a2a';
    ctx.fillRect(-r * 0.75, r * 0.25, r * 1.5, r * 0.35);
  } else if (k === 2) {
    ctx.fillStyle = '#4a4a5a';
    ctx.fillRect(-r * 0.06, -r * 0.3, r * 0.12, r * 1);
    ctx.fillStyle = '#fff2a0';
    rr(ctx, -r * 0.3, -r * 0.7, r * 0.6, r * 0.45, r * 0.1);
    ctx.fill();
  } else if (k === 3 || k === 4) {
    ctx.strokeStyle = '#8a5a2a';
    ctx.lineWidth = 2;
    for (let q = 0; q < (k === 3 ? 4 : 8); q++) {
      const a = t * 0.06 + (q * TAU2) / (k === 3 ? 4 : 8);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85);
      ctx.stroke();
    }
  } else if (k === 5) {
    ctx.fillStyle = '#c8783a';
    ctx.beginPath();
    ctx.moveTo(-r * 0.7, r * 0.1);
    ctx.lineTo(r * 0.7, r * 0.1);
    ctx.lineTo(r * 0.45, r * 0.45);
    ctx.lineTo(-r * 0.45, r * 0.45);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, r * 0.1);
    ctx.lineTo(0, -r * 0.7);
    ctx.lineTo(r * 0.45, 0);
    ctx.fill();
  } else if (k === 6) {
    ctx.strokeStyle = '#5a5a7a';
    ctx.lineWidth = 2;
    for (let q = 0; q < 3; q++) {
      const bx = (q - 1) * r * 0.5, by = (q % 2) * r * 0.3 - r * 0.1, fl = Math.sin(t * 0.3 + q) * r * 0.15;
      ctx.beginPath();
      ctx.moveTo(bx - r * 0.2, by - fl);
      ctx.lineTo(bx, by);
      ctx.lineTo(bx + r * 0.2, by - fl);
      ctx.stroke();
    }
  } else if (k === 7) {
    ['#ff6a6a', '#ffe36a', '#7ad86a', '#5ab8ff'].forEach((c, i) => {
      ctx.strokeStyle = c;
      ctx.lineWidth = r * 0.14;
      ctx.beginPath();
      ctx.arc(0, r * 0.4, r * (0.85 - i * 0.15), Math.PI, 0);
      ctx.stroke();
    });
  } else if (k === 9) brass(ctx, 0, 0, r * 0.8, 10, t * 0.05);
  else if (k === 10) {
    ctx.fillStyle = '#e0a83a';
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, -r * 0.5);
    ctx.quadraticCurveTo(-r * 0.4, r * 0.2, -r * 0.7, r * 0.5);
    ctx.lineTo(r * 0.7, r * 0.5);
    ctx.quadraticCurveTo(r * 0.4, r * 0.2, r * 0.3, -r * 0.5);
    ctx.fill();
  } else clockFace(ctx, 0, 0, r * 0.8, t * 8, k === 8 ? 9 : 12);
  ctx.restore();
}
const FIX_TEXT = ['분수가 다시 솟아요!', '창가 꽃이 활짝!', '가로등에 불이 켜져요!', '풍차가 돌아요!', '물레방아가 돌아요!', '나룻배가 돌아왔어요!', '새 떼가 돌아왔어요!', '무지개가 떴어요!', '시계 숫자판이 빛나요!', '큰 톱니가 돌아요!', '종이 다시 울려요!', '시계 바늘이 다시 가요!'];
function drawCards(ctx: C2, s: RewState, w: number, v: View, font: (sz: number, w?: number) => void) {
  const { R, t } = v;
  const mid = R(0.6);
  if (s.phase === 'chapter') {
    const d = STAGES[s.stage], a = Math.min(1, s.pt / 10);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(40,24,60,.6)';
    ctx.fillRect(0, R(TOPH), w, R(BOTY));
    const cw = w - R(0.12), ch = R(0.4);
    ctx.translate(w / 2, mid);
    ctx.fillStyle = lin(ctx, 0, -ch / 2, 0, ch / 2, [[0, '#fffaf0'], [1, '#ffe8c8']]);
    rr(ctx, -cw / 2, -ch / 2, cw, ch, R(0.04));
    ctx.fill();
    ctx.strokeStyle = '#ffb02e';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    font(0.07, 900);
    ctx.fillStyle = '#5a2e7a';
    ctx.fillText(`${d.ch + 1}장 · ${CH_NAME[d.ch]}`, 0, -R(0.11));
    font(0.04, 800);
    ctx.fillStyle = '#8a5a3a';
    ctx.fillText(CH_SUB[d.ch], 0, -R(0.04));
    // 모은 부품 줄
    for (let k = 0; k < STAGE_COUNT; k++) {
      const gx = (k - (STAGE_COUNT - 1) / 2) * R(0.058), on = k < s.gears;
      if (on) brass(ctx, gx, R(0.05), R(0.022), 8, t * 0.03);
      else (ctx.strokeStyle = 'rgba(120,90,60,.35)', ctx.lineWidth = 2, ell(ctx, gx, R(0.05), R(0.018), R(0.018)), ctx.stroke());
    }
    font(0.034, 800);
    ctx.fillStyle = '#6a4a3a';
    ctx.fillText('부품이 모일수록 시계탑 마을이 살아나요', 0, R(0.13));
    ctx.restore();
    return;
  }
  let head = '', sub = '', a = 0, age = 0;
  if (s.phase === 'result') {
    age = s.pt;
    a = Math.min(1, age / 8);
    if (s.ok) head = s.won ? '시계탑이 다시 움직여요!' : '시계 부품을 찾았어요!';
    else (head = '어이쿠!'), (sub = s.hearts > 0 ? `${s.why} · 하트 -1 · 다시 해 봐요` : `${s.why} · 하트가 없어요`);
  } else if (s.banner && t - s.banner.t < 170) {
    age = t - s.banner.t;
    a = Math.min(1, age / 8, (170 - age) / 25);
    (head = s.banner.head), (sub = s.banner.sub);
  }
  if (!head || a <= 0) return;
  const okRes = s.phase === 'result' && s.ok;
  const pop = Math.min(1, 0.55 + age / 10);
  ctx.save();
  ctx.globalAlpha = a;
  font(0.056, 900);
  const w1 = ctx.measureText(head).width;
  font(0.036, 800);
  const w2 = sub ? ctx.measureText(sub).width : 0;
  const cw = Math.min(w - R(0.04), Math.max(w1, w2, okRes ? R(0.8) : 0) + R(0.1)), chh = (okRes ? R(0.42) : sub ? R(0.15) : R(0.09)) * pop;
  ctx.translate(w / 2, okRes ? R(0.58) : R(0.36));
  ctx.fillStyle = 'rgba(40,20,50,.35)';
  rr(ctx, -cw / 2 + 3, -chh / 2 + 5, cw, chh, R(0.035));
  ctx.fill();
  ctx.fillStyle = lin(ctx, 0, -chh / 2, 0, chh / 2, [[0, '#fffaf0'], [1, '#ffecd0']]);
  rr(ctx, -cw / 2, -chh / 2, cw, chh, R(0.035));
  ctx.fill();
  ctx.strokeStyle = s.phase === 'result' && !s.ok ? '#8a7aa8' : '#ffb02e';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (okRes) {
    font(0.054, 900);
    ctx.fillStyle = '#c8402a';
    ctx.fillText(head, 0, -chh / 2 + R(0.05), cw - R(0.06));
    const nS = s.starOk.length, fx = juice(s);
    for (let j = 0; j < nS; j++) {
      const ag = s.pt - (14 + j * 14), sx = (j - (nS - 1) / 2) * R(0.1), popS = ag < 0 ? 0.8 : ag < 8 ? 1.9 - 0.9 * (ag / 8) : 1;
      starPath(ctx, sx, -chh / 2 + R(0.12), R(0.038) * popS);
      ctx.fillStyle = ag >= 0 && s.starOk[j] ? '#ffc93a' : 'rgba(90,50,20,.15)';
      ctx.fill();
      ctx.strokeStyle = ag >= 0 && s.starOk[j] ? '#9a5a08' : 'rgba(90,50,20,.35)';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      if (ag >= 0 && s.starOk[j] && (fx.memo['st' + j] ?? -1) < s.t - ag) {
        fx.memo['st' + j] = s.t - ag;
        fx.burst(w / 2 + sx, R(0.58) - chh / 2 + R(0.12), '#ffd23a', 16, 3, 2.4);
        fx.sound('ding', 1 + j * 0.25, 0.8);
      }
    }
    // 모은 부품 줄
    for (let k = 0; k < STAGE_COUNT; k++) {
      const gx = (k - (STAGE_COUNT - 1) / 2) * R(0.062), on = k < s.gears, fresh = k === s.gears - 1;
      const gy = -chh / 2 + R(0.2);
      if (on) brass(ctx, gx, gy - (fresh ? Math.max(0, 1 - s.pt / 30) * R(0.06) : 0), R(fresh ? 0.026 : 0.021), 8, t * 0.03, fresh ? 1 : 0);
      else (ctx.strokeStyle = 'rgba(120,90,60,.35)', ctx.lineWidth = 2, ell(ctx, gx, gy, R(0.018), R(0.018)), ctx.stroke());
    }
    font(0.04, 900);
    ctx.fillStyle = '#3a8a4a';
    const ftxt = `복원: ${FIX_TEXT[s.stage]}`, fw = Math.min(cw - R(0.16), ctx.measureText(ftxt).width);
    ctx.fillText(ftxt, R(0.03), -chh / 2 + R(0.27), cw - R(0.16));
    fixIcon(ctx, s.stage, -fw / 2 - R(0.03), -chh / 2 + R(0.265), R(0.03), t);
    if (!s.won) {
      const nd = STAGES[s.stage + 1];
      font(0.033, 800);
      ctx.fillStyle = '#6a4a5a';
      ctx.fillText(`다음: ${nd.name}${nd.news ? ' — 새 장치!' : ''}`, 0, -chh / 2 + R(0.33), cw - R(0.06));
      font(0.03, 700);
      ctx.fillStyle = '#9a7a8a';
      ctx.fillText(`그다음 복원: ${FIX_TEXT[s.stage + 1]}`, 0, -chh / 2 + R(0.377), cw - R(0.06));
    }
  } else {
    font(0.056, 900);
    ctx.fillStyle = s.phase === 'result' ? '#5a4a78' : '#5a2e7a';
    ctx.fillText(head, 0, sub ? -R(0.028) : R(0.002), w - R(0.1));
    if (sub) {
      font(0.036, 800);
      ctx.fillStyle = sub.startsWith('NEW') ? '#d0402a' : '#6a3a2a';
      ctx.fillText(sub, 0, R(0.038), w - R(0.08));
    }
  }
  ctx.restore();
  // 새것 스포트라이트
  if (s.spot && s.phase === 'play') {
    const sp = s.spot, ag = t - sp.t, aa = Math.min(1, ag / 10, (200 - ag) / 30);
    if (aa > 0 && ag >= 0) {
      ctx.save();
      ctx.globalAlpha = aa;
      ctx.strokeStyle = '#ffe066';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 5]);
      ell(ctx, v.X(sp.x), v.Y(sp.y), R(sp.r) * (1 + Math.sin(t * 0.15) * 0.05), R(sp.r) * (1 + Math.sin(t * 0.15) * 0.05));
      ctx.stroke();
      ctx.setLineDash([]);
      font(0.032, 900);
      ctx.textAlign = 'center';
      const lx = Math.max(R(0.12), Math.min(w - R(0.12), v.X(sp.x))), ly = v.Y(sp.y) - R(sp.r) - R(0.03);
      const tw = ctx.measureText('NEW ' + sp.label).width + R(0.04);
      ctx.fillStyle = '#ff5a4a';
      rr(ctx, lx - tw / 2, ly - R(0.022), tw, R(0.044), R(0.022));
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.textBaseline = 'middle';
      ctx.fillText('NEW ' + sp.label, lx, ly + 1);
      ctx.restore();
    }
  }
}
