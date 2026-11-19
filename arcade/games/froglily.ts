/**
 * 연잎 개구리 대경주 (33라운드: 경주 뼈대) — 물결 경주 × 꾹 눌렀다 떼기 × 콤보.
 * 조작(손가락 하나, 하는 일 하나): 화면 어디든 꾹 = 내 개구리가 웅크려 힘을 모은다(오래 누를수록 멀리, 착지 고리가 앞으로 미끄러진다).
 *   떼면 앞으로 크게 폴짝 — 포물선을 그리며 연잎에 철퍼덕. 키보드는 스페이스 꾹.
 * 규칙(결정적, 고정 간격 물리):
 *   - 내려앉은 곳에서 둥근 물결이 퍼진다(멀리 뛸수록 크게). 물결이 닿은 연잎은 출렁이고, 그 위에 앉아 있던 개구리는 첨벙 빠져 늦어진다.
 *     뛰는 중(공중)인 개구리는 안 빠진다. 경쟁자의 물결에는 나도 빠진다 — 경쟁자가 내 옆을 노리면 먼저 뛰어 피한다.
 *   - 연잎 밖 물에 떨어지면 첨벙, 하트 -1(뛴 잎으로 헤엄쳐 돌아간다). 꼴찌로 들어오면 하트 -1, 그 판 다시. 하트 셋을 다 잃으면 끝.
 *   - 경쟁자 셋은 성격이 있다: 조심쟁이(짧고 안전하게), 덤벙이(멀리 뛰다 자주 빠짐), 심술쟁이(남 옆에, 특히 내 옆에 내려앉음).
 * 와우: 첫 꾹이 출발 신호 — 경쟁자 셋이 커다란 가시연잎으로 폴짝 올라선 순간 내가 그 잎에 철퍼덕, 물결에 셋이 한꺼번에 '꾸엑!' 첨벙.
 * 판 7개(하는 일이 바뀐다): 1 아침 연못(물결로 빠뜨리기) → 2 가라앉는 연잎(오래 앉으면 꼬르륵 → 짧게 끊어 뛰기)
 *   → 3 연꽃 발판(내리면 퐁 튀어 멀리 + 큰 물결 → 좁은 꽃을 노리기) → 4 물살(잎이 오르내림 → 떼는 때를 맞추기)
 *   → 5 오리 가족(등에 타면 끌려감 → 움직이는 오리 잡기) → 6 왜가리(1등 머리 위 그림자가 멈추면 콕 → 피해 뛰기)
 *   → 7 여우비(물결이 커짐 → 한 번에 여럿).
 * 웃음: 빠진 개구리는 허우적대며 '꾸엑!', 덤벙이는 혀를 내밀고 멀리 뛰다 첨벙, 심술쟁이는 눈썹을 치켜뜨고 내 옆을 노린다.
 *   물가 버드나무 위 물총새가 큰 순간마다 '찌르릇!'.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import { REACT, type Bot, type GameDef, type Input, type Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5;
/** 연못 깊이(세로, 0 먼 쪽 ~ VMAX 가까운 쪽). 가로(u)는 경주 방향 — 화면 폭 = 1 */
const VMAX = 1.3;
/** 점프: 가장 짧게 · 가장 멀리 · 다 모으는 틱 · 날아가는 틱 = F0 + F1×거리 · 내려앉아 다시 웅크리기까지 */
const DMIN = 0.14, DMAX = 0.64, CH_T = 56, F0 = 20, F1 = 16, LAND_T = 14;
/** 물결: 퍼지는 속도 · 반지름 = (R0 + R1×모은 힘) × 배수 */
const RV = 0.016, R0 = 0.13, R1 = 0.15;
/** 빠진 개구리: 물결에 빠짐 · 물에 떨어짐(나) · 경쟁자가 물에 떨어짐 · 올라와서 다시 뛰기까지 */
const DUNK_T = 56, MISS_T = 80, MISS_TR = 60, CLIMB_T = 10;
/** 가라앉는 잎: 견디는 틱 · 잠겨 있는 틱 */
const SINK_T = 72, SUNK_T = 220;
/** 연꽃 발판: 튀는 거리 · 물결 배수 */
const LOTUS_D = 0.62, LOTUS_MUL = 1.75;
/** 오리: 등 반지름 · 헤엄 속도 */
const DUCK_R = 0.08, DUCK_V = 0.0085;
/** 왜가리: 그림자 반지름 · 노리고 멈춘 틱 · 그림자 속도 · 쉬는 틱 */
const HERON_R = 0.15, LOCK_T = 60, HERON_V = 0.012, HERON_REST = 150, HERON_F = 0.008;
const RESULT_OK = 190, RESULT_FAIL = 170, CARD_T = 170, NEWS_T = 160;
const RANK_PTS = [400, 250, 120, 0], STAR_PTS = 100, DUNK_PTS = 20, WIN_PTS = 300;
/** 출발 통나무 위 자리: 나 · 조심쟁이 · 덤벙이 · 심술쟁이 */
const V0 = [0.78, 0.3, 0.54, 1.02];
const NAMES = ['나', '조심쟁이', '덤벙이', '심술쟁이'];

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const flightT = (D: number) => Math.round(F0 + F1 * D);
const distOf = (c: number) => DMIN + (DMAX - DMIN) * c;
/** 힘은 처음엔 천천히, 끝으로 갈수록 빨리 찬다 — 멀리 뛸수록 시간당 빠르지만 겨누기 어렵다 */
const CURVE = 1.4;
const chOf = (h: number) => Math.pow(clamp(h / CH_T, 0, 1), CURVE);
const holdFor = (D: number) => Math.max(1, Math.round(Math.pow(clamp((D - DMIN) / (DMAX - DMIN), 0, 1), 1 / CURVE) * CH_T));
const zPeak = (D: number) => 0.07 + 0.3 * D;

type Feat = 'none' | 'sink' | 'lotus' | 'current' | 'duck' | 'heron' | 'rain';
type StarK = 'finish' | 'rank1' | 'dunk' | 'dry' | 'duck' | 'noheron' | 'multi';
interface Star { k: StarK; n: number; label: string }
interface StageDef {
  key: Feat; name: string; news: string; hint: string; L: number; assist: number;
  gap: [number, number]; per: [number, number]; r: [number, number]; hole: number;
  sink: number; lotus: number; cur: number;
  /** 경쟁자 쉬는 틱 [조심쟁이, 덤벙이, 심술쟁이] · 덤벙이 거리 오차 · 심술쟁이가 나를 노리나 */
  rest: [number, number, number]; chr: number; err: number; aim: boolean; rain: number;
  stars: Star[];
}
const S = (k: StarK, n: number, label: string): Star => ({ k, n, label });
const FIN = S('finish', 1, '결승까지 가기'), WIN1 = S('rank1', 1, '1등 하기');
export const STAGES: StageDef[] = [
  {
    key: 'none', name: '아침 연못', news: '', hint: '경쟁자 옆에 철퍼덕 내리면 물결에 첨벙!', L: 4.2, assist: 0.3,
    gap: [0.24, 0.3], per: [3, 4], r: [0.1, 0.125], hole: 0.05, sink: 0, lotus: 0, cur: 0,
    rest: [80, 50, 62], chr: 1.2, err: 0.2, aim: false, rain: 1, stars: [FIN],
  },
  {
    key: 'sink', name: '가라앉는 연잎', news: '가라앉는 연잎 — 오래 앉으면 꼬르륵', hint: '갈색 잎은 오래 앉으면 꼬르륵 — 얼른 뛰어요', L: 5.2, assist: 0.09,
    gap: [0.26, 0.34], per: [3, 4], r: [0.09, 0.115], hole: 0.15, sink: 0.45, lotus: 0, cur: 0,
    rest: [54, 34, 42], chr: 1.05, err: 0.16, aim: false, rain: 1, stars: [FIN, WIN1],
  },
  {
    key: 'lotus', name: '연꽃 발판', news: '연꽃 발판 — 내리면 퐁! 멀리 튀고 물결이 커요', hint: '분홍 연꽃에 내리면 퐁! 멀리 튀고 큰 물결', L: 5.6, assist: 0.06,
    gap: [0.27, 0.36], per: [3, 4], r: [0.085, 0.11], hole: 0.2, sink: 0.12, lotus: 1, cur: 0,
    rest: [18, 10, 14], chr: 0.78, err: 0.13, aim: true, rain: 1, stars: [FIN, WIN1, S('dunk', 2, '경쟁자 둘 빠뜨리기')],
  },
  {
    key: 'current', name: '물살 여울', news: '물살 — 연잎이 오르내리며 흘러요', hint: '고리가 초록일 때 떼요 — 잎이 흘러와요', L: 5.6, assist: 0.06,
    gap: [0.27, 0.36], per: [3, 4], r: [0.085, 0.11], hole: 0.2, sink: 0.1, lotus: 0, cur: 1,
    rest: [16, 9, 12], chr: 0.68, err: 0.13, aim: true, rain: 1, stars: [FIN, WIN1, S('dry', 0, '한 번도 안 빠지기')],
  },
  {
    key: 'duck', name: '오리 가족', news: '오리 가족 — 등에 내리면 태워 줘요', hint: '엄마 오리 등에 내리면 쭉 끌려가요', L: 6.0, assist: 0.06,
    gap: [0.27, 0.37], per: [3, 4], r: [0.085, 0.11], hole: 0.22, sink: 0.15, lotus: 0.4, cur: 0,
    rest: [15, 8, 11], chr: 0.66, err: 0.12, aim: true, rain: 1, stars: [FIN, WIN1, S('duck', 1, '오리 타고 가기')],
  },
  {
    key: 'heron', name: '왜가리 물가', news: '왜가리 — 1등 머리 위 그림자가 멈추면 콕!', hint: '그림자가 멈추면 얼른 뛰어 피해요', L: 6.0, assist: 0.06,
    gap: [0.27, 0.37], per: [3, 4], r: [0.085, 0.11], hole: 0.22, sink: 0.15, lotus: 0.4, cur: 0,
    rest: [15, 8, 11], chr: 0.66, err: 0.12, aim: true, rain: 1, stars: [FIN, WIN1, S('noheron', 0, '왜가리에게 안 잡히기')],
  },
  {
    key: 'rain', name: '여우비 연못', news: '여우비 — 물결이 훨씬 커져요', hint: '비 오는 날은 물결이 커요 — 한 번에 여럿!', L: 6.3, assist: 0.06,
    gap: [0.27, 0.37], per: [3, 4], r: [0.085, 0.11], hole: 0.22, sink: 0.15, lotus: 0.5, cur: 0,
    rest: [16, 9, 12], chr: 0.68, err: 0.12, aim: true, rain: 1.35, stars: [FIN, WIN1, S('multi', 2, '한 번에 둘 빠뜨리기')],
  },
];
export const STAGE_COUNT = STAGES.length;

type PadK = 'pad' | 'giant' | 'sink' | 'lotus';
interface Pad { id: number; k: PadK; u: number; v: number; r: number; amp: number; ph: number; om: number; load: number; sunk: number; wob: number; wobA: number; seed: number; keep: boolean }
interface Duck { id: number; u0: number; v0: number; t0: number; amp: number; ph: number; end: number; seed: number }
interface Ripple { id: number; u: number; v: number; R: number; t0: number; by: number; front: number; hit: number[]; dunks: number; done: boolean; big: boolean }
/** 개구리 상태 */
const SIT = 0, AIR = 1, SWIM = 2, DONE = 3, GRAB = 4;
interface Plan { D: number; H: number; c: number; quiet?: boolean }
interface Frog {
  i: number; u: number; v: number; z: number; st: number;
  pad: number; duck: number; ou: number; ov: number;
  hold: number; rec: number; rest: number; plan: Plan | null;
  u0: number; v0: number; u1: number; v1: number; ft: number; fe: number; D: number; c: number; rm: number; bounce: number;
  tm: number; tm0: number; swimTo: number; fin: number; wet: number;
  // 연출
  seed: number; landT: number; dunkT: number; jumpT: number; sayT: number; say: string; by: number;
}
interface Heron { st: 'rest' | 'track' | 'lock' | 'peck' | 'carry'; u: number; v: number; tm: number; target: number; carry: number; cu: number; cv: number; peckT: number }
interface Ev { id: number; t: number; kind: string; u: number; v: number; n?: number; who?: number; text?: string }

export interface FrogState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'play' | 'result'; pt: number; ok: boolean; why: string;
  hearts: number; stars: number; got: number; starOk: boolean[]; pts: number; won: boolean; dead: boolean; again: boolean; tries: number;
  pads: Pad[]; ducks: Duck[]; frogs: Frog[]; ripples: Ripple[]; heron: Heron | null; nid: number;
  /** 첫 꾹 전에는 경주가 시작되지 않는다 (출발 신호) */
  wait: boolean; held: boolean; freeze: number; finOrder: number[]; rank: number;
  dunks: number; sdunks: number; bestMulti: number; combo: number; bestCombo: number; swet: number; rides: number; snatched: number; lotusN: number;
  duckT: number; firstPress: number; firstBig: number; jumps: number; wowN: number;
  seen: Set<string>; newsQ: string[]; news: { text: string; t: number } | null; spot: { kind: string; t: number; label: string; u: number; v: number } | null;
  events: Ev[]; evN: number; log: { stage: number; ok: boolean; got: number; rank: number; t: number }[]; st0: number;
}

const ev = (s: FrogState, kind: string, u: number, v: number, n?: number, who?: number, text?: string) => s.events.push({ id: ++s.evN, t: s.t, kind, u, v, n, who, text });
function see(s: FrogState, key: string, text: string) {
  if (!key || s.seen.has(key)) return false;
  s.seen.add(key);
  if (text) s.newsQ.push(text);
  return true;
}

// ───────────────────────────── 시뮬레이션 ─────────────────────────────

const padV = (p: Pad, t: number) => (p.amp ? p.v + p.amp * Math.sin(p.om * t + p.ph) : p.v);
const sunkAt = (p: Pad, t: number) => p.sunk > t;
function duckPos(d: Duck, t: number): [number, number] {
  const k = Math.max(0, t - d.t0);
  return [Math.min(d.end, d.u0 + DUCK_V * k), d.v0 + d.amp * Math.sin(k * 0.025 + d.ph)];
}

interface Land { k: 'pad' | 'duck' | 'fin' | 'water'; idx: number; u: number; v: number; m: number }
/** t 틱에 (u, v)에 내려앉으면 어디인가. 도움(assist): 잎 가장자리에서 이만큼 밖이면 잎 안쪽으로 당겨 준다 */
function landAt(s: FrogState, u: number, v: number, t: number, assist: number, from = -1e9): Land {
  const L = STAGES[s.stage].L;
  if (u >= L) return { k: 'fin', idx: -1, u, v, m: 1 };
  for (const d of s.ducks) {
    const [du, dv] = duckPos(d, t);
    if (t >= d.t0 && Math.hypot(u - du, v - dv) < DUCK_R) return { k: 'duck', idx: d.id, u, v, m: 1 - Math.hypot(u - du, v - dv) / DUCK_R };
  }
  let best = -1, bm = -1e9, near = -1, nd = 1e9;
  for (let i = 0; i < s.pads.length; i++) {
    const p = s.pads[i];
    if (Math.abs(p.u - u) > p.r + assist + 0.01 || sunkAt(p, t)) continue;
    const pv = padV(p, t), d = Math.hypot(u - p.u, v - pv), m = 1 - d / p.r;
    if (m > 0 && m > bm) (bm = m), (best = i);
    else if (m <= 0 && d - p.r < nd && p.u > from + 0.06) (nd = d - p.r), (near = i);
  }
  if (best >= 0) return { k: 'pad', idx: best, u, v, m: bm };
  if (near >= 0 && nd < assist) {
    const p = s.pads[near], pv = padV(p, t), d = Math.hypot(u - p.u, v - pv) || 1e-6;
    return { k: 'pad', idx: near, u: p.u + ((u - p.u) / d) * p.r * 0.8, v: pv + ((v - pv) / d) * p.r * 0.8, m: 0.2 };
  }
  return { k: 'water', idx: -1, u, v, m: 0 };
}

/** 개구리가 t 틱에 서 있는 자리 (잎·오리를 따라 움직인다) */
function seatPos(s: FrogState, f: Frog, t: number): [number, number] {
  if (f.duck >= 0) {
    const d = s.ducks.find((q) => q.id === f.duck);
    if (d) {
      const [u, v] = duckPos(d, t);
      return [u + f.ou, v + f.ov];
    }
  }
  if (f.pad >= 0) {
    const p = s.pads[f.pad];
    return [p.u + f.ou, padV(p, t) + f.ov];
  }
  return [f.u, f.v];
}

function mkFrog(i: number, u: number, v: number, seed: number): Frog {
  return {
    i, u, v, z: 0, st: SIT, pad: -1, duck: -1, ou: 0, ov: 0, hold: 0, rec: 0, rest: 0, plan: null,
    u0: u, v0: v, u1: u, v1: v, ft: 1, fe: 0, D: 0, c: 0, rm: 1, bounce: 0, tm: 0, tm0: 1, swimTo: -1, fin: 0, wet: 0,
    seed, landT: -99, dunkT: -99, jumpT: -99, sayT: -99, say: '', by: -1,
  };
}

function launch(s: FrogState, f: Frog, D: number, c: number, rm: number) {
  f.st = AIR;
  f.u0 = f.u;
  f.v0 = f.v;
  f.u1 = f.u + D;
  f.v1 = f.v;
  f.D = D;
  f.c = c;
  f.rm = rm;
  f.ft = flightT(D);
  f.fe = 0;
  f.pad = -1;
  f.duck = -1;
  f.hold = 0;
  f.plan = null;
  f.bounce = 0;
  f.jumpT = s.t;
  if (f.i === 0) {
    s.jumps++;
    if (s.held) s.held = false;
  }
  ev(s, rm > 1 ? 'boing' : 'jump', f.u, f.v, Math.round(c * 100), f.i);
}

function say(s: FrogState, f: Frog, text: string) {
  f.say = text;
  f.sayT = s.t;
}

function dunk(s: FrogState, f: Frog, by: number, cu: number, cv: number, why: 'ripple' | 'sink') {
  if (f.st !== SIT) return false;
  const [su, sv] = seatPos(s, f, s.t);
  let to = f.pad;
  if (f.duck >= 0) to = nearestPad(s, su, sv, -1, su + 0.05);
  else if (why === 'sink') to = nearestPad(s, su, sv, f.pad, su + 0.15);
  const p = to >= 0 ? s.pads[to] : null;
  // 물결이 온 쪽 반대로 미끄러져 빠진다
  let du = su - cu, dv = sv - cv;
  const dd = Math.hypot(du, dv) || 1;
  du /= dd;
  dv /= dd;
  const rr = p ? p.r : 0.08;
  f.u = (p ? p.u : su) + du * (rr + 0.035);
  f.v = clamp((p ? padV(p, s.t) : sv) + dv * (rr + 0.035) * 0.9, 0.06, VMAX - 0.04);
  f.st = SWIM;
  f.tm = f.tm0 = DUNK_T;
  f.swimTo = to;
  f.pad = -1;
  f.duck = -1;
  f.hold = 0;
  f.plan = null;
  f.bounce = 0;
  f.dunkT = s.t;
  f.by = by;
  f.wet++;
  say(s, f, f.i === 0 ? '으악!' : '꾸엑!');
  if (f.i === 0) {
    s.swet++;
    if (s.combo >= 2) ev(s, 'break', f.u, f.v, s.combo);
    s.combo = 0;
  }
  ev(s, 'dunk', f.u, f.v, why === 'sink' ? 1 : 0, f.i, String(by));
  return true;
}

function nearestPad(s: FrogState, u: number, v: number, skip: number, maxU: number): number {
  let best = -1, bd = 1e9;
  for (let i = 0; i < s.pads.length; i++) {
    const p = s.pads[i];
    if (i === skip || sunkAt(p, s.t) || p.u > maxU || p.k === 'lotus') continue;
    if (s.frogs.some((f) => f.st === SIT && f.pad === i && p.k !== 'giant')) continue;
    const d = Math.hypot(p.u - u, padV(p, s.t) - v);
    if (d < bd) (bd = d), (best = i);
  }
  // 뒤쪽에 잎이 없으면 (출발 통나무 앞) 가장 가까운 잎으로
  return best < 0 && maxU < 1e8 ? nearestPad(s, u, v, skip, 1e9) : best;
}

/** 뒤 판일수록 점수가 크다 (1판 ×1 … 7판 ×4) */
const stageMul = (k: number) => 1 + 0.5 * k;
function addPts(s: FrogState, n: number) {
  s.pts += Math.round(n * stageMul(s.stage) * (1 + 0.25 * Math.min(8, s.combo)));
}

function makeRipple(s: FrogState, f: Frog, u: number, v: number) {
  const d = STAGES[s.stage];
  const R = (R0 + R1 * f.c) * f.rm * d.rain;
  if (R < 0.03) return;
  const rp: Ripple = { id: ++s.nid, u, v, R, t0: s.t, by: f.i, front: 0, hit: [], dunks: 0, done: false, big: f.rm > 1 };
  s.ripples.push(rp);
  ev(s, 'ripple', u, v, Math.round(R * 100), f.i);
  rippleStep(s, rp);
}

function rippleStep(s: FrogState, rp: Ripple) {
  if (rp.done) return;
  for (const p of s.pads) {
    if (rp.hit.includes(p.id) || Math.abs(p.u - rp.u) > rp.front + p.r + 0.02 || sunkAt(p, s.t)) continue;
    const d = Math.hypot(p.u - rp.u, padV(p, s.t) - rp.v) - p.r;
    if (d > rp.front) continue;
    rp.hit.push(p.id);
    p.wob = s.t;
    p.wobA = clamp(1 - Math.max(0, d) / Math.max(0.05, rp.R), 0.3, 1);
    for (const f of s.frogs) {
      if (f.i === rp.by || f.st !== SIT || f.pad !== p.id || f.duck >= 0) continue;
      if (dunk(s, f, rp.by, rp.u, rp.v, 'ripple')) {
        rp.dunks++;
        if (rp.by === 0 && rp.dunks === 2) {
          s.wowN++;
          if (s.firstBig < 0) s.firstBig = s.t;
          ev(s, 'multi', rp.u, rp.v, 2, 0, 'multi');
        } else if (rp.by === 0 && rp.dunks > 2) ev(s, 'multi', rp.u, rp.v, rp.dunks, 0, 'more');
        if (rp.by === 0) {
          s.dunks++;
          s.sdunks++;
          addPts(s, DUNK_PTS);
          s.freeze = Math.max(s.freeze, 3);
          see(s, 'dunk', '');
        } else if (f.i === 0 && rp.by > 0) see(s, 'meanhit', '');
      }
    }
  }
  rp.front += RV;
  if (rp.front > rp.R) {
    rp.done = true;
    if (rp.by === 0) {
      if (rp.dunks > 0) {
        s.combo++;
        s.bestCombo = Math.max(s.bestCombo, s.combo);
      }
      s.bestMulti = Math.max(s.bestMulti, rp.dunks);
      if (rp.dunks === 1 && s.combo >= 3) {
        s.wowN++;
        ev(s, 'multi', rp.u, rp.v, s.combo, 0, 'combo');
      }
    }
  }
}

function land(s: FrogState, f: Frog) {
  const d = STAGES[s.stage];
  const L = landAt(s, f.u1, f.v1, s.t, f.i === 0 ? d.assist : 0, f.u0);
  f.z = 0;
  f.landT = s.t;
  if (L.k === 'fin') {
    f.u = f.u1;
    f.v = f.v1;
    finish(s, f);
    return;
  }
  if (L.k === 'water') {
    f.u = L.u;
    f.v = L.v;
    f.st = SWIM;
    f.tm = f.tm0 = f.i === 0 ? MISS_T : MISS_TR;
    f.swimTo = nearestPad(s, f.u, f.v, -1, f.u + 0.04);
    f.dunkT = s.t;
    f.by = -2;
    f.wet++;
    say(s, f, f.i === 0 ? '첨벙!' : '어푸푸!');
    ev(s, 'miss', f.u, f.v, 0, f.i);
    if (f.i === 0) {
      s.swet++;
      s.combo = 0;
      s.hearts--;
      ev(s, 'heart', f.u, f.v);
      if (s.hearts <= 0) endStage(s, false, '하트를 다 잃었어요', false);
    }
    return;
  }
  f.st = SIT;
  f.rec = LAND_T;
  if (f.i > 0) f.rest = restOf(s, f);
  if (L.k === 'duck') {
    const dk = s.ducks.find((q) => q.id === L.idx)!;
    const [du, dv] = duckPos(dk, s.t);
    f.duck = dk.id;
    f.pad = -1;
    f.ou = L.u - du;
    f.ov = L.v - dv;
    f.u = L.u;
    f.v = L.v;
    if (f.i === 0) {
      s.rides++;
      if (see(s, 'spot-ride', '')) s.spot = null;
    }
    say(s, f, f.i === 0 ? '오리야 가자!' : '꽥?');
    ev(s, 'duck', L.u, L.v, 0, f.i);
    makeRipple(s, f, L.u, L.v);
    return;
  }
  const p = s.pads[L.idx];
  f.pad = L.idx;
  f.duck = -1;
  f.ou = L.u - p.u;
  f.ov = L.v - padV(p, s.t);
  f.u = L.u;
  f.v = L.v;
  ev(s, 'land', L.u, L.v, Math.round(f.c * 100), f.i);
  makeRipple(s, f, L.u, L.v);
  if (p.k === 'lotus') {
    f.bounce = 6;
    if (f.i === 0) s.lotusN++;
  }
}

function finish(s: FrogState, f: Frog) {
  f.st = DONE;
  s.finOrder.push(f.i);
  f.fin = s.finOrder.length;
  ev(s, 'finish', f.u, f.v, f.fin, f.i);
  if (s.phase !== 'play') return;
  if (f.i === 0) {
    s.rank = f.fin;
    endStage(s, f.fin <= 3, f.fin <= 3 ? '' : '꼴찌로 들어왔어요', true);
  } else if (s.finOrder.length >= 3 && !s.finOrder.includes(0)) {
    s.rank = 4;
    endStage(s, false, '셋 다 먼저 들어왔어요 — 꼴찌', true);
  }
}

/** 경쟁자: 다음 점프 고르기 (성격마다 다르다) */
function rivalPlan(s: FrogState, f: Frog): Plan | null {
  const d = STAGES[s.stage], me = s.frogs[0];
  let best: Plan | null = null, bv = -1e9;
  for (let D = DMIN; D <= DMAX + 1e-9; D += 0.025) {
    const H = Math.max(1, Math.round(holdFor(D) * d.chr)), tr = s.t + H, tl = tr + flightT(D);
    const [su, sv] = seatPos(s, f, tr);
    const L = landAt(s, su + D, sv, tl, 0);
    if (L.k === 'water' || L.k === 'duck') continue;
    let v = D;
    if (L.k === 'fin') v = 10 - D;
    else {
      const p = s.pads[L.idx];
      if (p.k === 'sink' && p.load > SINK_T * 0.5) continue;
      if (f.i === 1) {
        if (L.m < 0.4 || D > 0.42) continue;
        v = D + L.m * 0.1 - (p.k === 'sink' ? 0.15 : 0);
      } else if (f.i === 2) {
        if (L.m < 0.15) continue;
      } else {
        if (L.m < 0.3 || D > 0.56) continue;
        if (d.aim) {
          const R = (R0 + R1 * chOf(holdFor(D))) * d.rain;
          for (const o of s.frogs) {
            if (o === f || o.st !== SIT) continue;
            const [ou, ov] = seatPos(s, o, tl);
            const pr = o.pad >= 0 ? s.pads[o.pad].r : 0.08;
            if (Math.hypot(ou - L.u, ov - L.v) - pr > R * 0.85) continue;
            const rt = o.plan ? s.t + o.plan.H - o.hold : 1e9;
            if (rt < tl + 4) continue;
            v += o.i === 0 ? 0.5 : 0.15;
          }
        }
      }
    }
    if (v > bv) (bv = v), (best = { D, H, c: chOf(holdFor(D)) });
  }
  const mk = (D: number): Plan => ({ D, H: Math.max(1, Math.round(holdFor(D) * d.chr)), c: chOf(holdFor(D)) });
  if (best && f.i === 2 && d.err > 0) best = mk(clamp(best.D + (s.rng() - 0.45) * d.err * 2, DMIN, DMAX));
  // 갈 곳이 없으면 앞 잎이 올 때까지 기다리다가, 오래 막히면 멀리 뛴다
  if (!best && f.rest < -90) best = mk(DMAX * 0.8);
  void me;
  return best;
}

function restOf(s: FrogState, f: Frog): number {
  const d = STAGES[s.stage], me = s.frogs[0];
  let r = d.rest[f.i - 1] * (0.8 + 0.4 * s.rng());
  // 고무줄: 앞서 나간 경쟁자는 느긋해지고, 뒤처진 경쟁자는 서두른다 (배우는 1·2판은 더 크게 기다려 준다)
  const lead = f.u - me.u;
  if (s.stage <= 1) {
    if (lead > 0.6) r = r * 2.4 + 20;
  } else if (lead > 1.1) r *= 1.6;
  else if (lead < -1.1) r *= 0.7;
  return Math.round(r);
}

function frogStep(s: FrogState, f: Frog, inp: Input | null) {
  const d = STAGES[s.stage];
  switch (f.st) {
    case SIT: {
      const [su, sv] = seatPos(s, f, s.t);
      f.u = su;
      f.v = sv;
      // 잎 가운데로 엉금엉금 (큰 잎·오리는 그 자리)
      const settle = f.pad >= 0 && s.pads[f.pad].k !== 'giant';
      if (settle) (f.ou *= 0.86), (f.ov *= 0.86);
      if (f.duck >= 0) (f.ou *= 0.9), (f.ov *= 0.9);
      if (f.bounce > 0 && --f.bounce === 0) {
        launch(s, f, LOTUS_D, 1, LOTUS_MUL);
        ev(s, 'lotus', f.u, f.v, 0, f.i);
        break;
      }
      if (f.rec > 0) {
        f.rec--;
        break;
      }
      if (inp) {
        // 나: 누르는 동안 모으고, 떼면 뛴다
        if (inp.hold) f.hold++;
        else if (f.hold > 0) launch(s, f, distOf(chOf(f.hold)), chOf(f.hold), 1);
      } else {
        if (!f.plan) {
          if (--f.rest > 0) break;
          f.plan = rivalPlan(s, f);
          if (!f.plan) break;
        }
        f.hold++;
        if (f.hold >= f.plan.H) launch(s, f, f.plan.D, f.plan.c, f.plan.quiet ? 0 : 1);
      }
      break;
    }
    case AIR: {
      f.fe++;
      const k = f.fe / f.ft;
      f.u = f.u0 + (f.u1 - f.u0) * k;
      f.v = f.v0 + (f.v1 - f.v0) * k;
      f.z = 4 * zPeak(f.D) * k * (1 - k);
      if (f.fe >= f.ft) land(s, f);
      break;
    }
    case SWIM: {
      const p = f.swimTo >= 0 ? s.pads[f.swimTo] : null;
      if (p && !sunkAt(p, s.t)) {
        const pv = padV(p, s.t), du = f.u - p.u, dv = f.v - pv, dd = Math.hypot(du, dv) || 1;
        const tu = p.u + (du / dd) * p.r * 0.95, tv = pv + (dv / dd) * p.r * 0.95;
        const k = f.tm < f.tm0 * 0.6 ? 0.08 : 0.02;
        f.u += (tu - f.u) * k;
        f.v += (tv - f.v) * k;
      }
      if (--f.tm > 0) break;
      if (!p || sunkAt(p, s.t) || s.frogs.some((o) => o !== f && o.st === SIT && o.pad === f.swimTo && p.k !== 'giant')) {
        f.swimTo = nearestPad(s, f.u, f.v, -1, f.u + 0.1);
        f.tm = 24;
        break;
      }
      f.st = SIT;
      f.pad = f.swimTo;
      f.ou = f.u - p.u;
      f.ov = f.v - padV(p, s.t);
      f.rec = CLIMB_T;
      f.rest = f.i === 0 ? 0 : restOf(s, f);
      ev(s, 'climb', f.u, f.v, 0, f.i);
      break;
    }
    case GRAB:
      break;
  }
  void d;
}

function sinkStep(s: FrogState) {
  for (let i = 0; i < s.pads.length; i++) {
    const p = s.pads[i];
    if (p.k !== 'sink') continue;
    if (sunkAt(p, s.t)) continue;
    if (p.sunk && p.sunk === s.t) p.load = 0;
    const on = s.frogs.some((f) => f.st === SIT && f.pad === i);
    p.load = on ? p.load + 1 : Math.max(0, p.load - 0.5);
    if (p.load >= SINK_T) {
      p.sunk = s.t + SUNK_T;
      p.load = 0;
      ev(s, 'sinkdown', p.u, padV(p, s.t));
      for (const f of s.frogs) if (f.st === SIT && f.pad === i) dunk(s, f, -1, p.u - 0.1, padV(p, s.t), 'sink');
    }
  }
}

function duckStep(s: FrogState) {
  const d = STAGES[s.stage];
  if (d.key !== 'duck') return;
  const me = s.frogs[0];
  if (--s.duckT <= 0) {
    s.duckT = 330 + Math.floor(s.rng() * 120);
    const u0 = Math.max(0.1, me.u - 0.55);
    if (u0 < d.L - 1.2) {
      const dk: Duck = { id: ++s.nid, u0, v0: 0.3 + s.rng() * 0.7, t0: s.t, amp: 0.12 + s.rng() * 0.1, ph: s.rng() * 6, end: Math.min(d.L - 0.45, u0 + 3.2), seed: Math.floor(s.rng() * 1e6) };
      s.ducks.push(dk);
      if (see(s, 'spot-duck', '')) s.spot = { kind: 'duck', t: s.t, label: '엄마 오리 — 등에 타요', u: u0, v: dk.v0 };
    }
  }
  s.ducks = s.ducks.filter((q) => {
    const [u] = duckPos(q, s.t);
    return u >= q.end - 1e-6 ? s.t - q.t0 < (q.end - q.u0) / DUCK_V + 240 : true;
  });
  for (const f of s.frogs) if (f.duck >= 0 && !s.ducks.some((q) => q.id === f.duck)) dunk(s, f, -1, f.u - 0.1, f.v, 'sink');
}

function heronStep(s: FrogState) {
  const hr = s.heron;
  if (!hr) return;
  hr.tm--;
  switch (hr.st) {
    case 'rest':
      if (hr.tm <= 0) {
        // 1등 머리 위로
        let tg = -1, bu = -1;
        for (const f of s.frogs) if (f.st !== DONE && f.u > bu) (bu = f.u), (tg = f.i);
        if (tg < 0) break;
        const f = s.frogs[tg];
        hr.st = 'track';
        hr.target = tg;
        hr.u = f.u + 0.55;
        hr.v = clamp(f.v - 0.2, 0.1, VMAX - 0.1);
        hr.tm = 150;
        if (see(s, 'spot-heron', '')) s.spot = { kind: 'heron', t: s.t, label: '왜가리 그림자 — 멈추면 콕!', u: hr.u, v: hr.v };
      }
      break;
    case 'track': {
      const f = s.frogs[hr.target];
      if (f.st === DONE) {
        hr.st = 'rest';
        hr.tm = 30;
        break;
      }
      const du = f.u - hr.u, dv = f.v - hr.v, dd = Math.hypot(du, dv);
      if ((dd < 0.025 || hr.tm <= 0) && (f.st === SIT || f.st === AIR) && !(f.st === SIT && f.rec > 0 && f.dunkT > s.t - 120)) {
        hr.st = 'lock';
        hr.tm = LOCK_T;
        ev(s, 'lock', hr.u, hr.v, 0, hr.target);
      } else if (dd > 1e-6) {
        const sp = Math.min(dd, HERON_V);
        hr.u += (du / dd) * sp;
        hr.v += (dv / dd) * sp;
      }
      break;
    }
    case 'lock': {
      // 멈춘 듯 천천히 따라오다가 콕
      const f = s.frogs[hr.target];
      if (f.st !== DONE && f.st !== SWIM && hr.tm > 6) {
        const du = f.u - hr.u, dv = f.v - hr.v, dd = Math.hypot(du, dv);
        if (dd > 1e-4) {
          const sp = Math.min(dd, HERON_F);
          hr.u += (du / dd) * sp;
          hr.v += (dv / dd) * sp;
        }
      }
      if (hr.tm <= 0) {
        hr.st = 'peck';
        hr.tm = 14;
        hr.peckT = s.t;
        hr.carry = -1;
        for (const f of s.frogs) {
          if (f.st !== SIT) continue;
          if (Math.hypot(f.u - hr.u, f.v - hr.v) > HERON_R) continue;
          f.st = GRAB;
          f.pad = -1;
          f.duck = -1;
          f.hold = 0;
          f.plan = null;
          f.bounce = 0;
          hr.carry = f.i;
          hr.cu = f.u;
          hr.cv = f.v;
          say(s, f, '꽥!');
          f.sayT = s.t;
          if (f.i === 0) s.snatched++;
          ev(s, 'snatch', f.u, f.v, 0, f.i);
          break;
        }
        ev(s, 'peck', hr.u, hr.v, hr.carry >= 0 ? 1 : 0);
      }
      break;
    }
    case 'peck':
      if (hr.tm <= 0) {
        if (hr.carry >= 0) (hr.st = 'carry'), (hr.tm = 60);
        else (hr.st = 'rest'), (hr.tm = HERON_REST);
      }
      break;
    case 'carry': {
      const f = s.frogs[hr.carry];
      f.u = hr.cu - 0.7 * (1 - hr.tm / 60);
      f.v = hr.cv;
      f.z = 0.35 * Math.sin((Math.PI * (60 - hr.tm)) / 60) + 0.1;
      hr.u = f.u;
      hr.v = f.v;
      if (hr.tm <= 0) {
        f.u = Math.max(0.2, f.u);
        f.z = 0;
        f.st = SWIM;
        f.tm = f.tm0 = 40;
        f.swimTo = nearestPad(s, f.u, f.v, -1, f.u + 0.1);
        f.dunkT = s.t;
        f.by = -3;
        f.wet++;
        if (f.i === 0) (s.swet++), (s.combo = 0);
        ev(s, 'drop', f.u, f.v, 0, f.i);
        hr.st = 'rest';
        hr.tm = HERON_REST;
        hr.carry = -1;
      }
      break;
    }
  }
}

function genCourse(s: FrogState) {
  const d = STAGES[s.stage], R = s.rng;
  const pads: Pad[] = [];
  const add = (k: PadK, u: number, v: number, r: number) => {
    const p: Pad = { id: ++s.nid, k, u, v, r, amp: 0, ph: 0, om: 0, load: 0, sunk: 0, wob: -99, wobA: 0, seed: Math.floor(R() * 1e6), keep: false };
    pads.push(p);
    return p;
  };
  const free = (u: number, v: number, r: number) => pads.every((p) => Math.hypot(p.u - u, p.v - v) > p.r + r - 0.015);
  let u = 0.42;
  if (s.stage === 0) {
    add('giant', 0.46, 0.66, 0.42);
    u = 1.02;
  }
  while (u < d.L - 0.12) {
    const n = d.per[0] + Math.floor(R() * (d.per[1] - d.per[0] + 1));
    const slot = (1.18 - 0.14) / n;
    for (let j = 0; j < n; j++) {
      const v = 0.14 + slot * (j + 0.2 + 0.6 * R()), r = d.r[0] + (d.r[1] - d.r[0]) * R(), uu = u + (R() - 0.5) * 0.14;
      if (R() < d.hole || !free(uu, v, r)) continue;
      add('pad', uu, v, r);
    }
    u += d.gap[0] + (d.gap[1] - d.gap[0]) * R();
  }
  pads.sort((a, b) => a.u - b.u);
  // 연꽃 발판: 튀어 내릴 자리에 잎을 보장한다
  if (d.lotus > 0) {
    let nextU = 0.9;
    for (const p of [...pads]) {
      if (p.k !== 'pad' || p.u < nextU || p.u + LOTUS_D > d.L + 0.2) continue;
      if (R() > d.lotus) {
        nextU = p.u + 0.5;
        continue;
      }
      p.k = 'lotus';
      p.r = Math.min(p.r, 0.085);
      nextU = p.u + 1.1 + R() * 0.4;
      const lu = p.u + LOTUS_D;
      if (lu >= d.L) continue;
      const q0 = pads.find((q) => q !== p && Math.hypot(q.u - lu, q.v - p.v) < q.r * 0.6);
      if (q0) q0.keep = true;
      else add('pad', lu + 0.01, p.v, 0.11).keep = true;
    }
    pads.sort((a, b) => a.u - b.u);
  }
  if (d.sink > 0) for (const p of pads) if (p.k === 'pad' && !p.keep && p.u > 0.8 && R() < d.sink) p.k = 'sink';
  // 이어짐 고치기: 출발 자리와 모든 잎에서 곧장 앞으로 뛰어 닿을 잎(또는 결승)이 있어야 한다
  const reach = (su: number, sv: number) =>
    su + DMAX - 0.04 >= d.L ||
    pads.some((q) => q.k !== 'giant' && q.k !== 'sink' && q.u - su >= DMIN + 0.03 && q.u - su <= DMAX - 0.04 && Math.abs(q.v - sv) < q.r * 0.6) ||
    pads.some((q) => q.k === 'giant' && Math.hypot(q.u - clamp(q.u, su + DMIN + 0.03, su + DMAX - 0.04), q.v - sv) < q.r * 0.9);
  for (let pass = 0; pass < 6; pass++) {
    let fixed = 0;
    const src: [number, number][] = [...V0.map((v): [number, number] => [0, v]), ...pads.filter((p) => p.k !== 'giant').map((p): [number, number] => [p.u, p.v])];
    src.sort((a, b) => a[0] - b[0]);
    for (const [su, sv] of src) {
      if (reach(su, sv)) continue;
      add('pad', su + 0.3 + R() * 0.2, clamp(sv + (R() - 0.5) * 0.04, 0.12, VMAX - 0.1), d.r[1]);
      fixed++;
    }
    if (!fixed) break;
  }
  pads.sort((a, b) => a.u - b.u);
  if (d.cur > 0)
    for (const p of pads) {
      if (p.k === 'giant' || p.u < 0.7) continue;
      p.amp = 0.12 + 0.12 * R();
      p.om = 0.018 + 0.012 * R();
      p.ph = R() * Math.PI * 2;
      p.v = clamp(p.v, 0.12 + p.amp, VMAX - 0.1 - p.amp);
    }
  for (let i = 0; i < pads.length; i++) pads[i].id = i;
  s.pads = pads;
}

function newStage(s: FrogState) {
  const d = STAGES[s.stage];
  genCourse(s);
  s.frogs = V0.map((v, i) => mkFrog(i, 0, v, Math.floor(s.rng() * 1e6)));
  for (const f of s.frogs) f.rest = f.i === 0 ? 0 : 6 + Math.floor(s.rng() * 14);
  s.ripples = [];
  s.ducks = [];
  s.duckT = 60;
  s.heron = d.key === 'heron' ? { st: 'rest', u: 0, v: 0, tm: 200, target: -1, carry: -1, cu: 0, cv: 0, peckT: -99 } : null;
  s.finOrder = [];
  s.rank = 0;
  s.sdunks = 0;
  s.bestMulti = 0;
  s.combo = 0;
  s.bestCombo = 0;
  s.swet = 0;
  s.rides = 0;
  s.snatched = 0;
  s.lotusN = 0;
  s.phase = 'play';
  s.pt = 0;
  s.freeze = 0;
  s.starOk = d.stars.map(() => false);
  s.st0 = s.t;
  s.wait = true;
  s.held = false;
  if (d.key !== 'none') see(s, d.key, '');
  s.seen.add('st' + s.stage);
  if (d.key === 'sink' || d.key === 'lotus') {
    const p = s.pads.find((q) => q.k === d.key);
    if (p) s.spot = { kind: d.key, t: s.t, label: d.key === 'sink' ? '가라앉는 연잎' : '연꽃 발판', u: p.u, v: p.v };
  }
}

function starMet(s: FrogState, q: Star): boolean {
  switch (q.k) {
    case 'finish': return s.rank >= 1 && s.rank <= 3;
    case 'rank1': return s.rank === 1;
    case 'dunk': return s.sdunks >= q.n;
    case 'dry': return s.swet === 0;
    case 'duck': return s.rides >= q.n;
    case 'noheron': return s.snatched === 0;
    case 'multi': return s.bestMulti >= q.n;
  }
}
function starNow(s: FrogState, q: Star): number {
  switch (q.k) {
    case 'dunk': return s.sdunks;
    case 'duck': return s.rides;
    case 'multi': return s.bestMulti;
    default: return -1;
  }
}

function endStage(s: FrogState, ok: boolean, why: string, loseHeart: boolean) {
  if (s.phase !== 'play') return;
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  s.why = why;
  const d = STAGES[s.stage];
  if (ok) {
    s.starOk = d.stars.map((q) => starMet(s, q));
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    s.pts += Math.round((RANK_PTS[s.rank - 1] + s.got * STAR_PTS) * stageMul(s.stage));
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    ev(s, 'clear', 0, 0, s.rank);
  } else {
    if (loseHeart) s.hearts--;
    s.tries++;
    ev(s, 'fail', 0, 0, 0, 0, why);
  }
  s.log.push({ stage: s.stage, ok, got: ok ? s.got : 0, rank: s.rank, t: s.t - s.st0 });
}

function cosmetic(s: FrogState) {
  s.events = s.events.filter((e) => s.t - e.t < 90);
  s.ripples = s.ripples.filter((r) => !r.done || s.t - r.t0 < 70);
  if (s.spot && s.t - s.spot.t > 360) s.spot = null;
  if (!s.news || s.t - s.news.t > NEWS_T) s.news = s.newsQ.length ? { text: s.newsQ.shift()!, t: s.t } : s.news;
}

function world(s: FrogState, inp: Input) {
  for (const rp of s.ripples) if (!rp.done && rp.t0 < s.t) rippleStep(s, rp);
  sinkStep(s);
  duckStep(s);
  heronStep(s);
  for (const f of s.frogs) {
    if (s.phase !== 'play') break;
    frogStep(s, f, f.i === 0 ? inp : null);
  }
}

export const froglily: GameDef<FrogState> & { wows: (s: FrogState) => number } = {
  id: 'froglily',
  name: '연잎 개구리 대경주',
  genes: ['ripplerace', 'hold', 'combo'],
  twist: '내려앉은 자리의 물결이 둘레 연잎을 출렁여 그 위의 경쟁자를 물에 빠뜨린다 — 멀리 뛸수록 물결이 크지만 연잎을 놓치기 쉽고, 경쟁자의 물결엔 나도 빠지니 "얼마나 멀리·언제 떼나"가 곧 공격이자 피하기다',
  rules: [
    '꾹 누르면 힘을 모으고(오래 누를수록 멀리), 떼면 폴짝! 물에 떨어지면 하트 -1.',
    '내려앉은 물결이 둘레 연잎을 출렁여요 — 그 위의 개구리는 첨벙 빠져 늦어져요(나도!).',
    '결승 연꽃까지 경주! 꼴찌로 들어오면 하트 -1, 그 판 다시.',
  ],
  controls: 'hold',
  hint: '꾹 누르면 웅크리고, 떼면 폴짝! / 스페이스 꾹',
  aspect: A,
  art: {
    concept: '햇살 반짝이는 아침 연못의 개구리 경주 — 물빛 수채 그림책',
    mood: '맑은 청록 물 위에 둥근 연잎이 징검다리처럼 떠 있고, 물속엔 수초가 흔들리고 물고기 그림자가 지나간다. 분홍 연꽃과 버드나무 가지, 물결마다 햇빛이 반짝인다. 철퍼덕 내려앉으면 물결이 둥글게 퍼져 옆 개구리가 꾸엑 하고 빠진다.',
    palette: { bg: '#bff0ff', ink: '#163a2c', muted: '#5b8a7a', accent: '#3fb950', hot: '#ff5a6e', soft: '#e8fbf4' },
  },
  guard: (s) => s.hearts,
  cleared: (s) => (s.phase === 'result' && s.ok ? { stage: s.stage, got: s.got, of: s.starOk.length } : null),
  wows: (s) => s.wowN,
  reveals: (s) => [...s.seen].filter((k) => !k.startsWith('st') && !k.startsWith('spot')).length,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'play', pt: 0, ok: false, why: '',
      hearts: 3, stars: 0, got: 0, starOk: [false], pts: 0, won: false, dead: false, again: false, tries: 0,
      pads: [], ducks: [], frogs: [], ripples: [], heron: null, nid: 0,
      wait: true, held: false, freeze: 0, finOrder: [], rank: 0,
      dunks: 0, sdunks: 0, bestMulti: 0, combo: 0, bestCombo: 0, swet: 0, rides: 0, snatched: 0, lotusN: 0,
      duckT: 60, firstPress: -1, firstBig: -1, jumps: 0, wowN: 0,
      seen: new Set<string>(), newsQ: [], news: null, spot: null, events: [], evN: 0, log: [], st0: 0,
    } as FrogState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    const hold = !!inp.hold;
    if (s.phase === 'result') {
      s.pt++;
      for (const f of s.frogs) if (f.st === AIR) {
        f.fe = Math.min(f.ft - 1, f.fe + 1);
        const k = f.fe / f.ft;
        f.u = f.u0 + (f.u1 - f.u0) * k;
        f.z = 4 * zPeak(f.D) * k * (1 - k);
      }
      cosmetic(s);
      if (s.pt >= (s.ok ? RESULT_OK : RESULT_FAIL)) {
        if (s.ok) {
          if (s.won) s.dead = true;
          else (s.again = false), s.stage++, newStage(s);
        } else if (s.hearts <= 0) s.dead = true;
        else (s.again = true), newStage(s);
      }
      return;
    }
    if (s.wait) {
      s.pt++;
      cosmetic(s);
      if (!hold) return;
      // 첫 꾹 = 출발 신호
      s.wait = false;
      s.held = true;
      if (s.firstPress < 0) s.firstPress = s.t;
      ev(s, 'go', 0, 0);
      if (s.stage === 0)
        for (const f of s.frogs.slice(1)) {
          f.rest = 0;
          const D = f.i === 2 ? 0.34 : 0.28;
          f.plan = { D, H: 2 + f.i, c: 0, quiet: true };
        }
    }
    if (s.freeze > 0) {
      s.freeze--;
      cosmetic(s);
      return;
    }
    world(s, { ...inp, hold });
    cosmetic(s);
    s.pt++;
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, hold: false };
const HOLD: Input = { tap: false, dir: 0, hold: true };

interface Threat { u: number; v: number; R: number; t: number; who: number }
/** 지금 보이는 위험: 퍼지는 물결 · 날아가는 개구리의 내려앉을 물결 · 웅크린 경쟁자가 정해 둔 점프 */
function threats(s: FrogState, me: Frog): Threat[] {
  const d = STAGES[s.stage], out: Threat[] = [];
  for (const rp of s.ripples) if (!rp.done && rp.by !== 0) out.push({ u: rp.u, v: rp.v, R: rp.R, t: rp.t0, who: rp.by });
  for (const f of s.frogs) {
    if (f === me) continue;
    if (f.st === AIR) {
      const tl = s.t + (f.ft - f.fe);
      const L = landAt(s, f.u1, f.v1, tl, 0);
      if (L.k === 'pad' || L.k === 'duck') out.push({ u: L.u, v: L.v, R: (R0 + R1 * f.c) * f.rm * d.rain, t: tl, who: f.i });
      if (L.k === 'pad' && s.pads[L.idx].k === 'lotus') {
        const tl2 = tl + 6 + flightT(LOTUS_D), L2 = landAt(s, L.u + LOTUS_D, L.v, tl2, 0);
        if (L2.k === 'pad') out.push({ u: L2.u, v: L2.v, R: (R0 + R1) * LOTUS_MUL * d.rain, t: tl2, who: f.i });
      }
    } else if (f.st === SIT && f.plan) {
      const tr = s.t + Math.max(0, f.plan.H - f.hold) + f.rec, tl = tr + flightT(f.plan.D);
      const [su, sv] = seatPos(s, f, tr);
      const L = landAt(s, su + f.plan.D, sv, tl, 0);
      if (L.k === 'pad') out.push({ u: L.u, v: L.v, R: (R0 + R1 * f.plan.c) * d.rain, t: tl, who: f.i });
    }
  }
  return out;
}
/** 위험 하나가 (u, v)의 반지름 r 잎에 닿는 틱 (안 닿으면 무한) */
function hitTime(th: Threat, u: number, v: number, r: number) {
  const dd = Math.hypot(u - th.u, v - th.v) - r;
  if (dd > th.R) return 1e9;
  return th.t + Math.max(0, dd) / RV;
}

function padR(s: FrogState, f: Frog) {
  return f.pad >= 0 ? s.pads[f.pad].r : 0.07;
}

/** 내 자리에 위험이 닿는 가장 이른 틱 (물결·가라앉음·왜가리) */
function seatDanger(s: FrogState, me: Frog, ths: Threat[]): number {
  let t = 1e9;
  const r = padR(s, me);
  for (const th of ths) {
    const [u, v] = seatPos(s, me, Math.min(th.t, s.t + 60));
    const ht = hitTime(th, u, v, r);
    if (ht >= s.t) t = Math.min(t, ht);
  }
  if (me.pad >= 0 && s.pads[me.pad].k === 'sink') t = Math.min(t, s.t + (SINK_T - s.pads[me.pad].load) - 2);
  const pk = heronPeck(s);
  if (pk) {
    const [u, v] = seatPos(s, me, pk.t);
    if (pk.me || Math.hypot(u - pk.u, v - pk.v) < HERON_R + 0.03) t = Math.min(t, pk.t - 1);
  }
  return t;
}

/** 왜가리가 콕 할 틱과 그때 그림자 자리 (노리는 개구리를 따라간다). me = 내가 노려지면 어디 있든 따라온다 */
function heronPeck(s: FrogState): { t: number; u: number; v: number; me: boolean } | null {
  const hr = s.heron;
  if (!hr || (hr.st !== 'lock' && hr.st !== 'track')) return null;
  const f = s.frogs[hr.target];
  const dd0 = Math.hypot(f.u - hr.u, f.v - hr.v);
  const pk = hr.st === 'lock' ? s.t + hr.tm : s.t + Math.ceil(dd0 / HERON_V) + LOCK_T;
  let tu = f.u, tv = f.v;
  if (f.st === SIT) [tu, tv] = seatPos(s, f, pk);
  else if (f.st === AIR) (tu = f.u1), (tv = f.v1);
  if (hr.st === 'track') return { t: pk, u: tu, v: tv, me: hr.target === 0 };
  const mv = HERON_F * Math.max(0, hr.tm - 6), dd = Math.hypot(tu - hr.u, tv - hr.v), k = dd > 1e-6 ? Math.min(1, mv / dd) : 0;
  return { t: pk, u: hr.u + (tu - hr.u) * k, v: hr.v + (tv - hr.v) * k, me: hr.target === 0 };
}

let pace = 7;
/** 이 자리가 뒤에서 오는 경쟁자의 줄(곧장 앞으로만 뛰니까 세로 자리가 같은 줄)에 얼마나 드러나 있나 */
function expo(s: FrogState, me: Frog, u: number, v: number): number {
  const d = STAGES[s.stage], Rm = (R0 + R1) * d.rain + 0.1;
  let sum = 0;
  for (const r of s.frogs) {
    if (r === me || r.st === DONE || r.st === GRAB) continue;
    const ru = r.st === AIR ? r.u1 : r.u, rv = r.st === AIR ? r.v1 : r.v;
    if (ru > u + 0.05 || u - ru > DMAX + 0.3) continue;
    const dv = Math.abs(v - rv);
    if (dv > Rm) continue;
    sum += (r.i === 3 && d.aim ? 3 : 1) * (1 - dv / Rm);
  }
  return sum;
}
/** 잘하는 봇의 눈: tRel 틱 뒤에 c 만큼 모아 떼면 얼마나 좋은가 */
let seatExpo = 0, EXPO_T = 6, EXPO_L = 200;
function judge(s: FrogState, me: Frog, tRel: number, c: number, ths: Threat[], danger: number): number {
  const d = STAGES[s.stage], D = distOf(c), tr = s.t + tRel, tl = tr + flightT(D);
  const [su, sv] = seatPos(s, me, tr);
  const L = landAt(s, su + D, sv, tl, d.assist * 0.5, su);
  if (L.k === 'water') return -8000 - D;
  if (tr >= danger) return -5000 - tRel;
  let v = D * 1000 - (tRel + flightT(D) + LAND_T) * pace + (L.k === 'pad' ? Math.min(L.m, 0.6) * 260 : 0) - seatExpo * tRel * EXPO_T;
  if (L.k === 'fin') return 6000 - tRel * 4;
  const wants = d.stars.map((q) => q.k);
  const hunt = (wants.includes('dunk') && s.sdunks < 2) || (wants.includes('multi') && s.bestMulti < 2);
  // 물결로 빠뜨리기
  const R = (R0 + R1 * c) * d.rain * (L.k === 'pad' && s.pads[L.idx].k === 'lotus' ? 1 : 1);
  let dn = 0;
  for (const o of s.frogs) {
    if (o === me || o.st === DONE) continue;
    let ou: number, ov: number, from: number, until: number, r: number;
    if (o.st === SIT) {
      [ou, ov] = seatPos(s, o, tl);
      r = padR(s, o);
      from = 0;
      until = o.plan ? s.t + Math.max(0, o.plan.H - o.hold) + o.rec : s.t + o.rec + Math.max(0, o.rest) + 8;
      if (o.bounce > 0) until = s.t + o.bounce;
    } else if (o.st === AIR) {
      const ot = s.t + (o.ft - o.fe), OL = landAt(s, o.u1, o.v1, ot, 0);
      if (OL.k !== 'pad' || s.pads[OL.idx].k === 'lotus') continue;
      ou = OL.u;
      ov = OL.v;
      r = s.pads[OL.idx].r;
      from = ot;
      until = ot + LAND_T + 6;
    } else continue;
    if (o.duck >= 0) continue;
    const ht = tl + Math.max(0, Math.hypot(ou - L.u, ov - L.v) - r) / RV;
    if (Math.hypot(ou - L.u, ov - L.v) - r > R || ht < from || ht > until) continue;
    dn++;
    const ahead = o.u > me.u - 0.15 || o.st === AIR;
    v += ahead ? 260 : 120;
    if (hunt) v += 450;
  }
  if (dn >= 2 && wants.includes('multi') && s.bestMulti < 2) v += 400;
  // 내려앉은 뒤 곧 남의 물결·가라앉음·왜가리에 당하나
  let r2 = 0.08, lu = L.u, lv = L.v;
  if (L.k === 'pad') {
    const p = s.pads[L.idx];
    r2 = p.r;
    lu = p.u;
    lv = padV(p, tl);
    if (p.k === 'lotus') {
      const tl2 = tl + 6 + flightT(LOTUS_D), L2 = landAt(s, L.u + LOTUS_D, L.v, tl2, 0);
      if (L2.k === 'water') return -6000;
      v += LOTUS_D * 1000 - (6 + flightT(LOTUS_D)) * pace + 150;
      const R2 = (R0 + R1) * LOTUS_MUL * d.rain;
      let n2 = 0;
      for (const o of s.frogs) {
        if (o === me || o.st !== SIT || o.duck >= 0) continue;
        const [ou, ov] = seatPos(s, o, tl2);
        if (Math.hypot(ou - L2.u, ov - L2.v) - padR(s, o) < R2) n2++;
      }
      v += n2 * 140 + (n2 >= 2 && wants.includes('multi') ? 300 : 0);
      if (L2.k === 'pad') (lu = s.pads[L2.idx].u), (lv = padV(s.pads[L2.idx], tl2)), (r2 = s.pads[L2.idx].r);
      return v + lookahead(s, lu, lv, tl2 + LAND_T, ths);
    }
    if (p.k === 'sink' && p.load > SINK_T * 0.4) v -= 400;
  } else if (L.k === 'duck') {
    v += wants.includes('duck') && s.rides === 0 ? 900 : 350;
  }
  for (const th of ths) {
    const ht = hitTime(th, lu, lv, r2);
    if (ht >= tl - 2 && ht < tl + LAND_T + 14) v -= 700;
  }
  if (L.k === 'pad') v -= expo(s, me, lu, lv) * EXPO_L;
  const pk = heronPeck(s);
  if (pk && pk.t > tl - 2) {
    if (pk.me || Math.hypot(lu - pk.u, lv - pk.v) < HERON_R + 0.04) {
      // 콕 하기 전에 이 잎에서 다시 뛰어 공중에 있을 수 있나
      const avail = pk.t - 2 - tl - LAND_T;
      let esc = false;
      for (let D2 = DMIN; D2 <= DMAX && !esc; D2 += 0.05) {
        if (holdFor(D2) > avail) break;
        const t2 = Math.max(tl + LAND_T + holdFor(D2), pk.t - flightT(D2));
        esc = landAt(s, lu + D2, lv, t2 + flightT(D2), 0).k !== 'water';
      }
      if (!esc) v -= wants.includes('noheron') ? 1800 : 1000;
    }
  }
  return v + (L.k === 'pad' ? lookahead(s, lu, lv, tl + LAND_T, ths) : 0);
}

/** 한 수 앞: 내려앉은 잎 가운데에서 다음에 갈 수 있는 가장 좋은 점프 */
function lookahead(s: FrogState, u: number, v: number, t0: number, ths: Threat[]): number {
  const d = STAGES[s.stage];
  let best = -900;
  void ths;
  for (let D = DMIN + 0.03; D <= DMAX; D += 0.06) {
    const tl = t0 + holdFor(D) + flightT(D), L = landAt(s, u + D, v, tl, 0);
    if (L.k === 'water') continue;
    const val = L.k === 'fin' ? 600 : D * 1000 - (holdFor(D) + flightT(D) + LAND_T) * pace + (L.m - 0.3) * 60;
    if (val > best) best = val;
  }
  return best * 0.45 + (d.cur ? 60 : 0);
}

/**
 * 잘하는 봇: 지금 웅크리기 시작하거나(조금 기다렸다가) 이미 모은 힘으로 언제 뗄지를 모두 그려 보고 고른다.
 * 물에 떨어지지 않게, 경쟁자가 앉은 잎 옆에 내려앉게, 남의 물결이 오기 전에 뛰게.
 */
export const froglilySmart: Bot<FrogState> = {
  name: '물결 내다보고 뛰기',
  act(s) {
    if (s.phase !== 'play') return NO;
    if (s.wait) return HOLD;
    const me = s.frogs[0];
    if (me.st !== SIT || me.bounce > 0) return NO;
    if (me.rec > 0) return NO;
    const ths = threats(s, me), danger = seatDanger(s, me, ths);
    // 별이 '빠뜨리기'인데 이미 크게 앞서면, 서두르지 않고 무리 곁에서 노린다
    const d = STAGES[s.stage], lead = me.u - Math.max(...s.frogs.slice(1).filter((f) => f.st !== DONE).map((f) => f.u), -9);
    const hunt = d.stars.some((q) => (q.k === 'dunk' && s.sdunks < q.n) || (q.k === 'multi' && s.bestMulti < q.n));
    pace = hunt && lead > 0.35 && me.u < d.L - 1 ? 2 : 7;
    seatExpo = expo(s, me, me.u, me.v);
    let m = stuckMem.get(s);
    if (!m) stuckMem.set(s, (m = { n: 0 }));
    if (me.hold > 0) {
      let best = -1e9, bt = 0;
      for (let tr = 0; tr <= CH_T - me.hold + 30; tr += REACT) {
        const c = chOf(me.hold + tr), v = judge(s, me, tr, c, ths, danger);
        if (v > best) (best = v), (bt = tr);
      }
      // 어디로 뛰어도 물이면 (잎이 흘러오거나 떠오를 때까지) 꾹 참는다 — 너무 오래면 어쩔 수 없이 뛴다
      if (best <= -7999 && ++m.n < 300) return HOLD;
      m.n = 0;
      return bt === 0 ? NO : HOLD;
    }
    let best = -1e9, bs = 0;
    for (const ts of s.heron ? [0, 3, 6, 9, 12, 16, 20, 25, 30, 36, 42] : [0, 6, 12, 24, 40]) {
      for (let H = REACT; H <= CH_T + 24; H += REACT) {
        const v = judge(s, me, ts + H, chOf(H), ths, danger) - ts * 0.5;
        if (v > best) (best = v), (bs = ts);
      }
    }
    return bs === 0 ? HOLD : NO;
  },
};

const stuckMem = new WeakMap<object, { n: number }>();
const dumbMem = new WeakMap<object, { next: number; hold: number }>();
/** 못하는 봇: 아무 때나 아무만큼 꾹 눌렀다 뗀다 */
export const froglilyRandom: Bot<FrogState> = {
  name: '아무 때나 폴짝',
  act(s, rng) {
    let m = dumbMem.get(s);
    if (!m) dumbMem.set(s, (m = { next: s.t + 20 + Math.floor(rng() * 50), hold: 0 }));
    if (m.hold > 0) {
      m.hold--;
      return m.hold > 0 ? HOLD : NO;
    }
    if (s.t < m.next) return NO;
    m.next = s.t + 30 + Math.floor(rng() * 110);
    m.hold = 1 + Math.floor(rng() * 50);
    return HOLD;
  },
};

/** 버릇 봇: 늘 가장 가까운 앞 연잎으로 짧게 (고리가 잎에 닿으면 바로 뗀다) */
export const froglilyHabit: Bot<FrogState> = {
  name: '늘 가장 가까운 앞 잎으로',
  act(s) {
    if (s.phase !== 'play') return NO;
    if (s.wait) return HOLD;
    const me = s.frogs[0];
    if (me.st !== SIT || me.rec > 0 || me.bounce > 0) return NO;
    if (me.hold <= 0) return HOLD;
    const c = chOf(me.hold), D = distOf(c), tl = s.t + flightT(D);
    const L = landAt(s, me.u + D, me.v, tl, STAGES[s.stage].assist, me.u);
    return L.k !== 'water' || c >= 1 ? NO : HOLD;
  },
};

/** 독립 버릇 봇: 늘 끝까지 모아 가장 멀리 */
export const froglilyHabit2: Bot<FrogState> = {
  name: '늘 끝까지 모아 멀리',
  act(s) {
    if (s.phase !== 'play') return NO;
    if (s.wait) return HOLD;
    const me = s.frogs[0];
    if (me.st !== SIT || me.rec > 0 || me.bounce > 0) return NO;
    return me.hold >= CH_T ? NO : HOLD;
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
type C2 = CanvasRenderingContext2D;
const TAU = Math.PI * 2;
const hsh = (k: number) => {
  const v = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
function ell(ctx: C2, x: number, y: number, rx: number, ry: number, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
}
function lin(ctx: C2, x0: number, y0: number, x1: number, y1: number, ...st: [number, string][]) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of st) g.addColorStop(o, c);
  return g;
}
function radg(ctx: C2, x: number, y: number, r0: number, r1: number, ...st: [number, string][]) {
  const g = ctx.createRadialGradient(x, y, Math.max(0, r0), x, y, Math.max(0.1, r1));
  for (const [o, c] of st) g.addColorStop(o, c);
  return g;
}
function rr(ctx: C2, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2)));
}
function starPath(ctx: C2, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5, q = k % 2 ? r * 0.45 : r;
    if (k) ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
    else ctx.moveTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
  }
  ctx.closePath();
}
function heartPath(ctx: C2, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.9);
  ctx.bezierCurveTo(x - r * 1.5, y - r * 0.1, x - r * 0.9, y - r * 1.25, x, y - r * 0.45);
  ctx.bezierCurveTo(x + r * 0.9, y - r * 1.25, x + r * 1.5, y - r * 0.1, x, y + r * 0.9);
  ctx.closePath();
}
function fs(ctx: C2, fill: string | CanvasGradient, lw = 0, stroke = OUT) {
  ctx.fillStyle = fill;
  ctx.fill();
  if (lw > 0) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}
const OUT = '#1e3d2a';

/** 화면 배치(폭 단위): 위 띠 · 연못 위 끝(먼 물가) · 깊이 눌림 · 가까운 물가 · 아래 띠 */
const HB = 0.085, PY0 = 0.45, SQ = 0.577, NB = 1.2, GB = 1.3;

interface Look { body: string; light: string; dark: string; belly: string; spot: string; name: string }
const LOOKS: Look[] = [
  { body: '#5ccb4b', light: '#a6ee70', dark: '#235f29', belly: '#eaf9b2', spot: '#3c9c38', name: '나' },
  { body: '#38b9ad', light: '#86e6d6', dark: '#175a53', belly: '#d6f7ea', spot: '#23908a', name: '조심쟁이' },
  { body: '#f5c432', light: '#ffe68a', dark: '#87600c', belly: '#fff4c4', spot: '#d79a12', name: '덤벙이' },
  { body: '#9d6ad6', light: '#cba6f6', dark: '#41236a', belly: '#efe2ff', spot: '#7a48b4', name: '심술쟁이' },
];

interface Pose { sq: number; tilt: number; crouch: number; air: number; mood: number; puff: number; swim: number; blink: boolean; arms: number; t: number }
/** mood: 0 보통 · 1 힘줌 · 2 신남 · 3 놀람·허우적 · 4 우쭐(심술) · 5 어질 */
function drawFrog(ctx: C2, x: number, y: number, k: number, i: number, p: Pose) {
  const L = LOOKS[i], lw = Math.max(1.3, k * 0.035), t = p.t;
  ctx.save();
  ctx.translate(x, y);
  if (p.swim > 0) {
    // 물에 빠짐: 머리만 내밀고 허우적
    const bob = Math.sin(t * 0.35) * k * 0.04;
    ctx.translate(0, k * 0.36 + bob);
  }
  ctx.rotate(p.tilt);
  ctx.scale(1 + (1 - p.sq) * 0.6, p.sq);
  const cr = p.crouch;
  ctx.translate(0, cr * k * 0.06);
  if (p.swim > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(-k * 2, -k * 3, k * 4, k * 2.62);
    ctx.clip();
  }
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // 다리는 마디 있는 굵은 선: 앉으면 접히고, 뛰면 뒤로 쭉, 빠지면 위로 버둥
  const legOut = p.air;
  const mix = (a0: number[], a1: number[], q: number) => a0.map((v, j) => v + (a1[j] - v) * q);
  const limb = (pts: number[], wd: number, col: string) => {
    for (const [c, ww] of [[L.dark, wd + lw * 2.2], [col, wd]] as [string, number][]) {
      ctx.strokeStyle = c;
      ctx.lineWidth = ww;
      ctx.beginPath();
      for (let j = 0; j < pts.length; j += 2) (j ? ctx.lineTo(k * pts[j], k * pts[j + 1]) : ctx.moveTo(k * pts[j], k * pts[j + 1]));
      ctx.stroke();
    }
  };
  const foot = (x0: number, y0: number, ang: number, col: string) => {
    ctx.save();
    ctx.translate(k * x0, k * y0);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(0, -k * 0.02);
    ctx.lineTo(k * 0.13, -k * 0.05);
    ctx.lineTo(k * 0.1, 0);
    ctx.lineTo(k * 0.14, k * 0.035);
    ctx.lineTo(0, k * 0.025);
    ctx.closePath();
    fs(ctx, col, lw * 0.9, L.dark);
    ctx.restore();
  };
  const sitLeg = [-0.12, -0.2, 0.06, -0.1 + cr * 0.04, -0.2, -0.02, -0.04, 0];
  const jumpLeg = [-0.14, -0.24, -0.42, -0.14, -0.7, -0.08, -0.86, -0.04];
  const swimLeg = [-0.12, -0.2, -0.3, -0.05, -0.45, 0.05, -0.55, 0.1];
  const leg = p.swim > 0 ? swimLeg : mix(sitLeg, jumpLeg, legOut);
  // 먼 쪽 다리 (조금 어둡게)
  ctx.save();
  ctx.translate(k * 0.06, -k * 0.03);
  limb(leg.slice(0, 6), k * 0.11, L.spot);
  foot(leg[4], leg[5], legOut > 0.3 ? Math.PI : 0, L.spot);
  ctx.restore();
  // 몸통
  ell(ctx, -k * 0.02, -k * (0.3 - cr * 0.05), k * (0.42 + cr * 0.05 + legOut * 0.04), k * (0.3 - cr * 0.04 - legOut * 0.03), -0.32 + legOut * 0.2);
  fs(ctx, lin(ctx, 0, -k * 0.62, 0, 0, [0, L.light], [0.45, L.body], [1, L.spot]), lw, L.dark);
  // 등 무늬
  ctx.fillStyle = L.spot;
  for (const [sx, sy, sr] of [[-0.2, -0.42, 0.05], [-0.04, -0.5, 0.035], [-0.28, -0.28, 0.035], [0.02, -0.36, 0.028]] as number[][]) {
    ell(ctx, k * sx, k * (sy + cr * 0.04), k * sr, k * sr * 0.8);
    ctx.fill();
  }
  // 배
  ell(ctx, k * 0.16, -k * 0.2, k * 0.2, k * 0.14, -0.5);
  ctx.fillStyle = L.belly;
  ctx.fill();
  // 가까운 쪽 다리 (굵은 허벅지)
  limb(leg.slice(0, 6), k * 0.15, L.body);
  ell(ctx, k * (leg[0] + leg[2]) * 0.5, k * (leg[1] + leg[3]) * 0.5 - k * 0.01, k * 0.07, k * 0.035, Math.atan2(leg[3] - leg[1], leg[2] - leg[0]));
  ctx.fillStyle = 'rgba(255,255,255,.28)';
  ctx.fill();
  foot(leg[4], leg[5], legOut > 0.3 ? Math.PI : 0, L.body);
  // 머리
  ell(ctx, k * 0.22, -k * (0.5 - cr * 0.05), k * 0.3, k * 0.22, -0.12);
  fs(ctx, lin(ctx, 0, -k * 0.75, 0, -k * 0.28, [0, L.light], [0.6, L.body], [1, L.body]), lw, L.dark);
  ell(ctx, k * 0.26, -k * (0.4 - cr * 0.05), k * 0.22, k * 0.09, -0.15);
  ctx.fillStyle = L.belly;
  ctx.fill();
  // 앞다리
  const arm = p.arms;
  if (p.swim > 0) {
    for (const sgn of [-1, 1]) {
      const wv = Math.sin(t * 0.55 + (sgn > 0 ? 0 : Math.PI));
      const hx = 0.2 + sgn * (0.46 + wv * 0.06), hy = -0.62 - wv * sgn * 0.14;
      limb([0.2 + sgn * 0.16, -0.4, 0.2 + sgn * 0.34, -0.5 - wv * sgn * 0.05, hx, hy], k * 0.07, L.body);
      ell(ctx, k * hx, k * hy, k * 0.05, k * 0.05);
      fs(ctx, L.light, lw * 0.8, L.dark);
    }
  } else {
    const sitArm = [0.26, -0.24, 0.32, -0.12, 0.3, -0.01];
    const fly = [0.26, -0.28, 0.44, -0.3, 0.6, -0.36];
    const up = [0.24, -0.3, 0.32, -0.55, 0.36, -0.8];
    let am = mix(sitArm, fly, legOut);
    if (arm > 0.6) am = mix(am, up, Math.min(1, (arm - 0.6) * 2.5));
    limb(am, k * 0.075, L.body);
    ell(ctx, k * am[4], k * am[5], k * 0.045, k * 0.035);
    fs(ctx, L.light, lw * 0.8, L.dark);
  }
  // 울음주머니 (볼 부풀리기)
  if (p.puff > 0.05) {
    ell(ctx, k * 0.38, -k * (0.34 - cr * 0.04), k * (0.07 + 0.11 * p.puff), k * (0.06 + 0.09 * p.puff));
    ctx.fillStyle = 'rgba(255,250,225,.92)';
    ctx.fill();
    ctx.lineWidth = lw * 0.8;
    ctx.strokeStyle = L.dark;
    ctx.stroke();
    ell(ctx, k * 0.35, -k * (0.37 - cr * 0.04), k * 0.03, k * 0.02);
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.fill();
  }
  // 입
  const mood = p.mood;
  const my = -k * (0.45 - cr * 0.05);
  ctx.strokeStyle = L.dark;
  ctx.lineWidth = lw * 1.1;
  ctx.beginPath();
  if (mood === 3) {
    ell(ctx, k * 0.42, my + k * 0.02, k * 0.05, k * 0.06);
    ctx.fillStyle = '#7a2030';
    ctx.fill();
    ctx.stroke();
  } else if (mood === 2) {
    ctx.moveTo(k * 0.2, my - k * 0.01);
    ctx.quadraticCurveTo(k * 0.38, my + k * 0.1, k * 0.5, my - k * 0.04);
    ctx.lineTo(k * 0.2, my - k * 0.01);
    ctx.fillStyle = '#c0384a';
    ctx.fill();
    ctx.stroke();
  } else if (mood === 1) {
    ctx.moveTo(k * 0.24, my);
    ctx.lineTo(k * 0.5, my - k * 0.01);
    ctx.stroke();
  } else if (mood === 4) {
    ctx.moveTo(k * 0.22, my + k * 0.01);
    ctx.quadraticCurveTo(k * 0.38, my + k * 0.02, k * 0.5, my - k * 0.06);
    ctx.stroke();
  } else {
    ctx.moveTo(k * 0.2, my - k * 0.01);
    ctx.quadraticCurveTo(k * 0.36, my + k * 0.06, k * 0.5, my - k * 0.03);
    ctx.stroke();
  }
  // 덤벙이 혀
  if (i === 2 && mood !== 3 && mood !== 1) {
    ctx.beginPath();
    ctx.moveTo(k * 0.4, my + k * 0.01);
    ctx.quadraticCurveTo(k * 0.47, my + k * 0.12, k * 0.41, my + k * 0.12);
    ctx.quadraticCurveTo(k * 0.37, my + k * 0.07, k * 0.36, my + k * 0.02);
    fs(ctx, '#ff7f9c', lw * 0.8, '#a83a54');
  }
  // 볼
  ell(ctx, k * 0.38, -k * (0.49 - cr * 0.05), k * 0.055, k * 0.032);
  ctx.fillStyle = 'rgba(255,120,140,.55)';
  ctx.fill();
  // 눈 (먼 눈 → 가까운 눈)
  const eyes: number[][] = [[0.13, -0.68, 0.105], [0.32, -0.66, 0.125]];
  for (let e = 0; e < 2; e++) {
    const [ex0, ey0, er0] = eyes[e], ex = k * ex0, ey = k * (ey0 + cr * 0.08), er = k * er0;
    ell(ctx, ex, ey + er * 0.25, er * 1.05, er * 0.95);
    fs(ctx, lin(ctx, 0, ey - er, 0, ey + er, [0, L.light], [1, L.body]), lw, L.dark);
    const shut = p.blink || mood === 1;
    if (shut) {
      ctx.strokeStyle = L.dark;
      ctx.lineWidth = lw * 1.2;
      ctx.beginPath();
      if (mood === 1) {
        ctx.moveTo(ex - er * 0.6, ey - er * 0.2);
        ctx.lineTo(ex + er * 0.3, ey + er * 0.05);
        ctx.lineTo(ex - er * 0.5, ey + er * 0.35);
      } else {
        ctx.moveTo(ex - er * 0.6, ey + er * 0.05);
        ctx.quadraticCurveTo(ex, ey + er * 0.4, ex + er * 0.6, ey + er * 0.05);
      }
      ctx.stroke();
      continue;
    }
    const big = mood === 3 ? 1.12 : 1;
    ell(ctx, ex, ey, er * 0.78 * big, er * 0.8 * big);
    fs(ctx, '#ffffff', lw * 0.6, L.dark);
    if (mood === 5) {
      ctx.strokeStyle = '#2a1a2a';
      ctx.lineWidth = lw;
      ctx.beginPath();
      for (let a = 0; a < 9; a += 0.4) ctx.lineTo(ex + Math.cos(a + t * 0.3) * a * er * 0.07, ey + Math.sin(a + t * 0.3) * a * er * 0.07);
      ctx.stroke();
    } else {
      const pr = mood === 3 ? er * 0.24 : er * 0.42, px = ex + er * (mood === 3 ? 0 : 0.22), py = ey + er * 0.05;
      ell(ctx, px, py, pr, pr * 1.1);
      ctx.fillStyle = '#16141c';
      ctx.fill();
      ell(ctx, px - pr * 0.35, py - pr * 0.4, pr * 0.35, pr * 0.35);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
    // 눈꺼풀: 심술쟁이는 반쯤 덮은 눈, 덤벙이는 졸린 눈
    if (i === 3 || (i === 2 && mood === 0)) {
      ctx.beginPath();
      ctx.ellipse(ex, ey, er * 0.82, er * 0.84, 0, Math.PI * (i === 3 ? 1.08 : 1.0), Math.PI * (i === 3 ? 1.92 : 2.0));
      ctx.closePath();
      fs(ctx, L.body, lw * 0.6, L.dark);
    }
  }
  // 소품
  if (i === 0) {
    // 빨간 머리띠 + 펄럭이는 꼬리
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(k * 0.22, -k * (0.54 - cr * 0.05), k * 0.31, k * 0.075, -0.12, Math.PI * 0.95, Math.PI * 2.05);
    ctx.lineWidth = k * 0.085;
    ctx.strokeStyle = '#a81e1e';
    ctx.stroke();
    ctx.lineWidth = k * 0.06;
    ctx.strokeStyle = '#ec3a32';
    ctx.stroke();
    const kx = -k * 0.06, ky = -k * (0.55 - cr * 0.05), fl = p.air > 0.2 ? 1.6 : 1;
    for (const ph of [0, 1.6]) {
      ctx.beginPath();
      ctx.moveTo(kx, ky);
      const ex2 = kx - k * 0.26 * fl, ey2 = ky + k * (0.06 + 0.06 * Math.sin(t * 0.3 + ph)) - (p.air > 0.2 ? k * 0.05 : 0);
      ctx.quadraticCurveTo(kx - k * 0.12, ky + k * 0.1 * Math.sin(t * 0.25 + ph), ex2, ey2);
      ctx.lineWidth = k * 0.065;
      ctx.strokeStyle = '#a81e1e';
      ctx.stroke();
      ctx.lineWidth = k * 0.04;
      ctx.strokeStyle = '#ff5045';
      ctx.stroke();
    }
    ell(ctx, kx, ky, k * 0.045, k * 0.04);
    fs(ctx, '#ec3a32', lw * 0.8, '#7a1010');
    ctx.restore();
  } else if (i === 1) {
    // 동그란 안경
    ctx.strokeStyle = '#5a3a1e';
    ctx.lineWidth = lw * 1.2;
    for (const [ex0, ey0, er0] of eyes) {
      ell(ctx, k * ex0, k * (ey0 + cr * 0.08), k * er0 * 0.95, k * er0 * 0.95);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(k * 0.23, k * (-0.68 + cr * 0.08));
    ctx.lineTo(k * 0.21, k * (-0.68 + cr * 0.08));
    ctx.stroke();
  } else if (i === 3) {
    // 치켜뜬 눈썹
    ctx.strokeStyle = '#2c1048';
    ctx.lineWidth = lw * 1.6;
    for (const [ex0, ey0, er0] of eyes) {
      ctx.beginPath();
      ctx.moveTo(k * (ex0 - er0 * 0.9), k * (ey0 + cr * 0.08 - er0 * 1.25));
      ctx.lineTo(k * (ex0 + er0 * 0.8), k * (ey0 + cr * 0.08 - er0 * 0.7));
      ctx.stroke();
    }
  }
  if (p.swim > 0) ctx.restore();
  ctx.restore();
}

function drawLotus(ctx: C2, x: number, y: number, k: number, t: number, open: number) {
  // 분홍 연꽃 (3/4 시점)
  ctx.save();
  ctx.translate(x, y);
  const sway = Math.sin(t * 0.04) * 0.04;
  ctx.rotate(sway);
  const petal = (a: number, len: number, wd: number, c0: string, c1: string) => {
    ctx.save();
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-wd, -len * 0.55, 0, -len);
    ctx.quadraticCurveTo(wd, -len * 0.55, 0, 0);
    fs(ctx, lin(ctx, 0, -len, 0, 0, [0, c0], [1, c1]), 1.2, '#b0406a');
    ctx.restore();
  };
  for (let j = 0; j < 7; j++) petal(-1.35 + (j / 6) * 2.7, k * (0.8 + 0.15 * open), k * 0.32, '#ff8ab8', '#ffe4ef');
  for (let j = 0; j < 5; j++) petal(-0.9 + (j / 4) * 1.8, k * 0.72, k * 0.26, '#ff6fa5', '#fff0f6');
  ell(ctx, 0, -k * 0.2, k * 0.17, k * 0.1);
  fs(ctx, radg(ctx, 0, -k * 0.22, 0, k * 0.17, [0, '#fff6a0'], [1, '#f2b622']), 1, '#a87010');
  ctx.restore();
}

function drawDuck(ctx: C2, x: number, y: number, k: number, t: number, kid: boolean, ride: boolean) {
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 0.12) * k * 0.03);
  const lw = Math.max(1.2, k * 0.035);
  // 물그림자 + 물결
  ell(ctx, 0, k * 0.05, k * 0.62, k * 0.16);
  ctx.fillStyle = 'rgba(20,90,110,.25)';
  ctx.fill();
  const body = kid ? '#ffe04a' : '#fffaf0', shade = kid ? '#f0b820' : '#d8d2c4';
  // 몸
  ctx.beginPath();
  ctx.moveTo(-k * 0.55, -k * 0.18);
  ctx.quadraticCurveTo(-k * 0.62, -k * 0.42, -k * 0.38, -k * 0.34);
  ctx.quadraticCurveTo(-k * 0.05, -k * 0.38, k * 0.3, -k * 0.24);
  ctx.quadraticCurveTo(k * 0.52, -k * 0.1, k * 0.38, k * 0.04);
  ctx.quadraticCurveTo(0, k * 0.12, -k * 0.42, k * 0.02);
  ctx.closePath();
  fs(ctx, lin(ctx, 0, -k * 0.4, 0, k * 0.1, [0, body], [1, shade]), lw, '#5a4a2a');
  // 날개
  ell(ctx, -k * 0.12, -k * 0.16, k * 0.25, k * 0.1, -0.15);
  fs(ctx, shade, lw * 0.8, '#7a6a4a');
  // 머리
  const hx = k * 0.3, hy = -k * 0.48;
  ell(ctx, hx, hy, k * 0.17, k * 0.16);
  fs(ctx, lin(ctx, 0, hy - k * 0.16, 0, hy + k * 0.16, [0, body], [1, shade]), lw, '#5a4a2a');
  // 부리
  ctx.beginPath();
  ctx.moveTo(hx + k * 0.12, hy - k * 0.02);
  ctx.quadraticCurveTo(hx + k * 0.34, hy, hx + k * 0.3, hy + k * 0.06);
  ctx.quadraticCurveTo(hx + k * 0.2, hy + k * 0.08, hx + k * 0.12, hy + k * 0.05);
  ctx.closePath();
  fs(ctx, '#ff9a2a', lw * 0.8, '#9a4a10');
  ell(ctx, hx + k * 0.05, hy - k * 0.04, k * 0.035, k * 0.04);
  ctx.fillStyle = '#1a1420';
  ctx.fill();
  ell(ctx, hx + k * 0.06, hy - k * 0.055, k * 0.012, k * 0.012);
  ctx.fillStyle = '#fff';
  ctx.fill();
  if (!kid) {
    // 볼터치 + 등에 앉을 자리 반짝
    ell(ctx, hx + k * 0.02, hy + k * 0.06, k * 0.04, k * 0.025);
    ctx.fillStyle = 'rgba(255,140,150,.6)';
    ctx.fill();
    if (!ride) {
      ctx.strokeStyle = `rgba(255,255,255,${0.5 + 0.4 * Math.sin(t * 0.2)})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ell(ctx, -k * 0.12, -k * 0.34, k * 0.22, k * 0.07);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  ctx.restore();
}

function drawHeron(ctx: C2, x: number, y: number, k: number, t: number, dive: number, beakOpen: number) {
  // 하늘을 나는 왜가리 (날개 펄럭) — dive가 1이면 목을 쭉 빼고 내리꽂음
  ctx.save();
  ctx.translate(x, y);
  const flap = Math.sin(t * 0.22) * (1 - dive * 0.7);
  const lw = Math.max(1.5, k * 0.025);
  // 날개
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(1, 1);
    ctx.beginPath();
    ctx.moveTo(-k * 0.05, -k * 0.02);
    ctx.quadraticCurveTo(-k * 0.2, -k * (0.25 + 0.2 * flap * side), -k * 0.62, -k * (0.12 + 0.35 * flap) * (side > 0 ? 1 : 0.6));
    ctx.quadraticCurveTo(-k * 0.35, k * 0.06, -k * 0.05, k * 0.06);
    ctx.closePath();
    fs(ctx, lin(ctx, 0, -k * 0.4, 0, k * 0.1, [0, side > 0 ? '#c8d4e2' : '#a8b8cc'], [1, '#7a8aa4']), lw, '#3a4458');
    ctx.restore();
  }
  // 몸
  ell(ctx, 0, 0, k * 0.26, k * 0.09, 0.1 + dive * 0.5);
  fs(ctx, lin(ctx, 0, -k * 0.1, 0, k * 0.1, [0, '#e2e8f0'], [1, '#a4b2c6']), lw, '#3a4458');
  // 다리
  ctx.strokeStyle = '#e0a040';
  ctx.lineWidth = lw * 1.2;
  ctx.beginPath();
  ctx.moveTo(-k * 0.2, k * 0.03);
  ctx.lineTo(-k * 0.5, k * (0.05 + dive * 0.1));
  ctx.stroke();
  // 목 + 머리
  const nx = k * (0.22 + dive * 0.1), ny = k * (0.0 + dive * 0.3);
  ctx.strokeStyle = '#3a4458';
  ctx.lineWidth = k * 0.085;
  ctx.beginPath();
  ctx.moveTo(k * 0.18, -k * 0.02);
  ctx.quadraticCurveTo(k * 0.3, -k * 0.16 + dive * k * 0.1, nx + k * 0.08, ny - k * 0.05);
  ctx.stroke();
  ctx.strokeStyle = '#eef2f6';
  ctx.lineWidth = k * 0.06;
  ctx.stroke();
  ell(ctx, nx + k * 0.1, ny - k * 0.06, k * 0.065, k * 0.05);
  fs(ctx, '#eef2f6', lw, '#3a4458');
  // 검은 깃 + 눈
  ctx.strokeStyle = '#1e2430';
  ctx.lineWidth = lw * 1.4;
  ctx.beginPath();
  ctx.moveTo(nx + k * 0.06, ny - k * 0.1);
  ctx.lineTo(nx - k * 0.08, ny - k * 0.16);
  ctx.stroke();
  ell(ctx, nx + k * 0.12, ny - k * 0.07, k * 0.014, k * 0.014);
  ctx.fillStyle = '#1e2430';
  ctx.fill();
  // 부리
  ctx.fillStyle = '#ffb02a';
  ctx.strokeStyle = '#8a5a10';
  ctx.lineWidth = lw * 0.7;
  const bx = nx + k * 0.15, by = ny - k * 0.06, ang = 0.25 + dive * 0.8;
  for (const s2 of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + Math.cos(ang + s2 * beakOpen * 0.25) * k * 0.28, by + Math.sin(ang + s2 * beakOpen * 0.25) * k * 0.28);
    ctx.lineTo(bx, by + s2 * k * 0.025);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawKingfisher(ctx: C2, x: number, y: number, k: number, t: number, hop: number) {
  ctx.save();
  ctx.translate(x, y - Math.max(0, Math.sin(hop * 0.4)) * k * 0.25 * (hop > 0 ? 1 : 0));
  const lw = Math.max(1.1, k * 0.04);
  ell(ctx, 0, 0, k * 0.24, k * 0.2, -0.3);
  fs(ctx, lin(ctx, 0, -k * 0.2, 0, k * 0.2, [0, '#2a9be8'], [0.55, '#1e78c8'], [0.56, '#ff9a3a'], [1, '#f07a20']), lw, '#173a5a');
  ell(ctx, k * 0.16, -k * 0.2, k * 0.15, k * 0.13);
  fs(ctx, '#2a8ee0', lw, '#173a5a');
  ell(ctx, k * 0.2, -k * 0.16, k * 0.06, k * 0.035);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ell(ctx, k * 0.2, -k * 0.23, k * 0.03, k * 0.03);
  ctx.fillStyle = '#10141c';
  ctx.fill();
  ctx.beginPath();
  const op = hop > 0 ? 0.2 : 0;
  ctx.moveTo(k * 0.28, -k * 0.22);
  ctx.lineTo(k * 0.55, -k * 0.2 - op * k * 0.3);
  ctx.lineTo(k * 0.28, -k * 0.16);
  ctx.closePath();
  fs(ctx, '#2a2a30', lw * 0.6, '#10141c');
  ctx.beginPath();
  ctx.moveTo(-k * 0.2, k * 0.05);
  ctx.lineTo(-k * 0.42, k * 0.18 + Math.sin(t * 0.1) * k * 0.03);
  ctx.lineTo(-k * 0.18, k * 0.14);
  ctx.closePath();
  fs(ctx, '#1e6ab8', lw * 0.6, '#173a5a');
  ctx.restore();
}

function drawHand(ctx: C2, x: number, y: number, k: number, press: number) {
  ctx.save();
  ctx.translate(x, y + press * k * 0.12);
  ctx.rotate(-0.25);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#2a3a30';
  ctx.lineWidth = k * 0.07;
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
  ctx.stroke();
  ctx.fill();
  ctx.restore();
}

/** 연잎 하나 (3/4 시점 타원, 홈 하나, 잎맥, 출렁임) */
function drawPad(ctx: C2, s: FrogState, p: Pad, x: number, y: number, R: number, t: number, hot: boolean) {
  const age = t - p.wob, wob = age >= 0 && age < 46 ? p.wobA * Math.exp(-age / 14) : 0;
  const sunkNow = sunkAt(p, t);
  const sinkK = p.k === 'sink' ? p.load / SINK_T : 0;
  const dip = wob * Math.sin(age * 0.55) * R * 0.08 + sinkK * R * 0.1 + (sunkNow ? R * 0.2 : 0);
  const tilt = wob * Math.sin(age * 0.42 + 1) * 0.12;
  ctx.save();
  ctx.translate(x, y + dip);
  ctx.rotate(tilt);
  const sy = SQ * (1 + wob * 0.12 * Math.sin(age * 0.6));
  // 물그림자
  if (!sunkNow) {
    ell(ctx, R * 0.06, R * 0.16 * sy + 2, R * 1.04, R * sy * 1.02);
    ctx.fillStyle = 'rgba(16,96,110,.28)';
    ctx.fill();
  }
  ctx.save();
  ctx.scale(1, sy);
  const notch = (p.seed % 628) / 100;
  const giant = p.k === 'giant';
  ctx.beginPath();
  if (giant) ctx.arc(0, 0, R, 0, TAU);
  else {
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, R, notch + 0.22, notch - 0.22 + TAU);
    ctx.closePath();
  }
  let c0 = '#9ee26a', c1 = '#55b445', c2 = '#2f8236';
  if (p.k === 'sink') (c0 = '#d6cf6e'), (c1 = '#a8a03c'), (c2 = '#6e6a22');
  if (giant) (c0 = '#a8e872'), (c1 = '#5cbc48'), (c2 = '#3a9036');
  ctx.globalAlpha = sunkNow ? 0.28 : 1 - sinkK * 0.35;
  fs(ctx, radg(ctx, -R * 0.2, -R * 0.3, R * 0.05, R * 1.1, [0, c0], [0.6, c1], [1, c2]), 1.8 / sy, '#24602a');
  // 잎맥
  ctx.strokeStyle = 'rgba(220,255,190,.45)';
  ctx.lineWidth = 1.2 / sy;
  ctx.beginPath();
  const nv = giant ? 14 : 7;
  for (let j = 0; j < nv; j++) {
    const a = notch + 0.5 + (j / nv) * (TAU - 1);
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * R * 0.86, Math.sin(a) * R * 0.86);
  }
  ctx.stroke();
  // 위쪽 테 반짝
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.9, Math.PI * 1.1, Math.PI * 1.65);
  ctx.strokeStyle = 'rgba(255,255,230,.6)';
  ctx.lineWidth = 2.2 / sy;
  ctx.stroke();
  if (giant) {
    // 가시연잎의 들린 테두리
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.97, 0, TAU);
    ctx.lineWidth = R * 0.08;
    ctx.strokeStyle = '#c86a58';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.97, Math.PI, TAU);
    ctx.lineWidth = R * 0.035;
    ctx.strokeStyle = '#f2a08a';
    ctx.stroke();
  }
  if (p.k === 'sink' && !sunkNow) {
    // 갈색 반점
    ctx.fillStyle = 'rgba(110,80,20,.4)';
    for (let j = 0; j < 4; j++) {
      ell(ctx, (hsh(p.seed + j) - 0.5) * R, (hsh(p.seed + j * 3) - 0.5) * R, R * 0.12, R * 0.1);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  // 가라앉는 중: 물방울 보글보글 + 물 덮임
  if (p.k === 'sink' && (sinkK > 0.25 || sunkNow)) {
    const n = sunkNow ? 2 : 1 + Math.floor(sinkK * 4);
    for (let j = 0; j < n; j++) {
      const ph = (t * 0.04 + j * 0.37 + hsh(p.seed + j)) % 1;
      ell(ctx, (hsh(p.seed * 3 + j) - 0.5) * R * 1.4, -ph * R * 0.6, R * (0.05 + 0.03 * j), R * (0.05 + 0.03 * j));
      ctx.strokeStyle = `rgba(255,255,255,${0.8 * (1 - ph)})`;
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    if (sinkK > 0.55 && !sunkNow) {
      ctx.font = `900 ${Math.max(12, R * 0.34)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(40,40,10,.6)';
      ctx.strokeText('꼬르륵', 0, -R * 0.75);
      ctx.fillStyle = '#fff7c0';
      ctx.fillText('꼬르륵', 0, -R * 0.75);
    }
  }
  if (hot) {
    ctx.save();
    ctx.scale(1, sy);
    ctx.beginPath();
    ctx.arc(0, 0, R * 1.04, 0, TAU);
    ctx.strokeStyle = 'rgba(255,255,255,.95)';
    ctx.lineWidth = 3 / sy;
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
  if (p.k === 'lotus' && !sunkNow) {
    const glow = 0.5 + 0.5 * Math.sin(t * 0.12 + p.seed);
    ell(ctx, x, y + dip, R * 0.9, R * SQ * 0.8);
    ctx.strokeStyle = `rgba(255,170,210,${0.35 + 0.4 * glow})`;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    drawLotus(ctx, x, y + dip - R * 0.05, R * 0.95, t + p.seed, wob);
  }
  void s;
}

function poseOf(s: FrogState, f: Frog, t: number): Pose {
  const p: Pose = { sq: 1, tilt: 0, crouch: 0, air: 0, mood: 0, puff: 0, swim: 0, blink: (t + f.seed) % 170 < 7, arms: 0, t };
  if (f.i === 3 && STAGES[s.stage].aim) p.mood = 4;
  if (s.wait) {
    // 출발 전 몸 풀기: 들썩들썩, 볼 부풀리기
    const ph = (t + f.seed * 7) % 120;
    p.sq = 1 + 0.06 * Math.sin(t * 0.18 + f.i);
    p.puff = ph < 30 ? Math.sin((ph / 30) * Math.PI) : 0;
    p.arms = f.i === 0 ? 0.3 + 0.3 * Math.sin(t * 0.2) : 0;
    return p;
  }
  if (f.st === SIT) {
    const c = f.i === 0 ? chOf(f.hold) : f.plan ? chOf(Math.min(f.hold, f.plan.H)) : 0;
    const land = t - f.landT;
    if (f.hold > 0) {
      p.crouch = 0.25 + c * 0.75;
      p.sq = 1 - p.crouch * 0.26 + (c > 0.8 ? Math.sin(t * 1.3) * 0.02 : 0);
      p.mood = c > 0.35 ? 1 : p.mood;
      p.puff = c;
    } else if (land < 10) {
      p.sq = 0.72 + 0.28 * (land / 10);
      p.mood = 2;
    } else if (f.rec > 0 && t - f.dunkT < 120) p.mood = 5;
    if (t - f.sayT < 40 && f.say === '꾸엑!') p.puff = 1;
  } else if (f.st === AIR) {
    const k = f.fe / f.ft;
    p.air = 1 - Math.abs(k - 0.4) * 0.8;
    p.sq = 0.92;
    p.tilt = (0.5 - k) * -0.8;
    p.mood = f.rm > 1 ? 3 : 2;
    p.arms = 0.5;
  } else if (f.st === SWIM) {
    p.swim = 1;
    p.mood = 3;
    p.puff = t - f.dunkT < 30 ? 1 : 0;
  } else if (f.st === DONE) {
    p.mood = 2;
    p.arms = 1;
    p.sq = 1 + 0.05 * Math.sin(t * 0.3);
  } else if (f.st === GRAB) {
    p.mood = 3;
    p.air = 0.8 + 0.2 * Math.sin(t * 0.6);
    p.tilt = 0.4 * Math.sin(t * 0.4);
  }
  return p;
}

const RANK_TXT = ['', '1등', '2등', '3등', '4등'];

function drawAll(ctx: C2, s: FrogState, w: number, h: number, th: Theme) {
  void th;
  const fx = juice(s), d = STAGES[s.stage], t = s.t, me = s.frogs[0];
  const R = (r: number) => r * w;
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  // ── 카메라 (그리기 전용) ──
  if (fx.memo.camStage !== s.st0) {
    fx.memo.camStage = s.st0;
    fx.memo.cam = -0.1;
  }
  const want = s.wait ? -0.1 : clamp(me.u - 0.27, -0.1, d.L - 0.62);
  fx.memo.cam = (fx.memo.cam ?? want) + (want - (fx.memo.cam ?? want)) * 0.12;
  const cam = fx.memo.cam;
  const X = (u: number) => (u - cam) * w, Y = (v: number) => R(PY0 + v * SQ);
  const ds = (v: number) => 0.9 + 0.16 * (v / VMAX);
  const FK = 0.15;

  // ── 이벤트 → 연출 ──
  const last = fx.memo.ev ?? 0;
  for (const e of s.events) {
    if (e.id <= last) continue;
    fx.memo.ev = e.id;
    const ex = X(e.u), ey = Y(e.v), mine = e.who === 0;
    switch (e.kind) {
      case 'go':
        fx.kick(5);
        fx.memo.bigT = t;
        fx.memo.bigN = 0;
        fx.memo.bigK = 2;
        break;
      case 'jump':
        fx.burst(ex, ey, 'rgba(230,255,255,.95)', mine ? 10 : 5, 2.4, 2.2);
        break;
      case 'boing':
        fx.burst(ex, ey - R(0.05), '#ff9fc8', 18, 4, 3);
        fx.pop(ex, ey - R(0.12), '퐁!', '#ff6fa5', 22);
        if (mine) fx.kick(4);
        break;
      case 'land':
        fx.burst(ex, ey, '#e8ffff', mine ? 16 : 8, mine ? 3.6 : 2.4, 2.6);
        fx.burst(ex, ey, '#7fe0ff', mine ? 8 : 4, 2.6, 2);
        if (mine) fx.kick(2 + (e.n ?? 0) / 40);
        break;
      case 'ripple':
        break;
      case 'dunk': {
        fx.burst(ex, ey, '#ffffff', 22, 4.6, 3.2);
        fx.burst(ex, ey, '#8ae6ff', 12, 3.4, 2.6);
        const who = e.who ?? 0;
        if (e.text === '0') fx.kick(5);
        if (who === 0) (fx.kick(7), fx.blink('#ff8080', 0.18));
        (fx.memo as Record<string, number>)['crown' + who] = t;
        break;
      }
      case 'miss':
        fx.burst(ex, ey, '#ffffff', 26, 5, 3.4);
        fx.burst(ex, ey, '#6fd8ff', 14, 3.6, 2.8);
        if (mine) (fx.kick(9), fx.blink('#ff6060', 0.25));
        (fx.memo as Record<string, number>)['crown' + (e.who ?? 0)] = t;
        break;
      case 'heart':
        fx.pop(ex, ey - R(0.22), '-1', '#ff4a5a', 26);
        break;
      case 'multi':
        fx.memo.bigT = t;
        fx.memo.bigN = e.n ?? 2;
        fx.memo.bigK = e.text === 'combo' ? 1 : 0;
        fx.memo.birdT = t;
        if (e.text !== 'more') {
          fx.kick(e.text === 'combo' ? 6 : 11);
          fx.blink('#ffffff', 0.35);
          fx.burst(ex, ey, '#ffe066', 26, 6, 3.4);
        } else fx.kick(13);
        break;
      case 'finish': {
        const n = e.n ?? 1;
        fx.burst(ex, ey - R(0.06), '#ff8ab8', 20, 5, 3);
        fx.burst(ex, ey - R(0.06), '#ffe066', 16, 4, 2.6);
        fx.pop(ex, ey - R(0.16), RANK_TXT[n] ?? '', mine ? '#ffe066' : '#ffffff', mine ? 30 : 18);
        if (mine) fx.kick(6);
        break;
      }
      case 'lotus':
        break;
      case 'duck':
        fx.pop(ex, ey - R(0.14), mine ? '오리 타기!' : '꽥?', '#fff3a0', mine ? 20 : 16);
        fx.burst(ex, ey, '#ffffff', 10, 3, 2.4);
        break;
      case 'lock':
        fx.pop(ex, ey - R(0.1), '!', '#ff4040', 30);
        break;
      case 'peck':
        fx.kick(e.n ? 9 : 4);
        fx.burst(ex, ey, '#ffffff', 14, 4, 2.6);
        if (!e.n) fx.pop(ex, ey - R(0.1), '헛방!', '#ffffff', 18);
        break;
      case 'snatch':
        fx.burst(ex, ey - R(0.05), '#e8eef6', 18, 4.5, 3);
        fx.pop(ex, ey - R(0.18), mine ? '꽥! 잡혔다' : '꽥!', mine ? '#ff6a6a' : '#ffffff', 20);
        if (mine) fx.blink('#ffffff', 0.3);
        break;
      case 'drop':
        fx.burst(ex, ey, '#ffffff', 18, 4, 3);
        (fx.memo as Record<string, number>)['crown' + (e.who ?? 0)] = t;
        break;
      case 'sinkdown':
        fx.burst(ex, ey, '#ffffff', 12, 2.6, 2.6);
        fx.pop(ex, ey - R(0.08), '꼬르륵', '#fff7c0', 16);
        break;
      case 'clear':
        fx.burst(w / 2, R(0.25), '#ffe066', 30, 6, 3.2);
        fx.burst(w / 2, R(0.25), '#ff8ab8', 20, 5, 3);
        fx.blink('#fffbe0', 0.3);
        break;
      case 'fail':
        fx.kick(6);
        break;
      case 'break':
        fx.pop(ex, ey - R(0.2), '콤보 끊김', '#ffd0d0', 15);
        break;
    }
  }

  ctx.save();
  fx.begin(ctx);
  // ═════════════ 하늘 · 먼 언덕 · 나무 (시차) ═════════════
  ctx.fillStyle = lin(ctx, 0, 0, 0, R(PY0), [0, '#7fd0ff'], [0.55, '#bfeaff'], [1, '#e8fbff']);
  ctx.fillRect(-20, -20, w + 40, R(PY0) + 22);
  // 해
  {
    const sx = R(0.8), sy = R(0.17);
    ctx.fillStyle = radg(ctx, sx, sy, 0, R(0.32), [0, 'rgba(255,250,210,.95)'], [0.25, 'rgba(255,240,170,.55)'], [1, 'rgba(255,240,170,0)']);
    ctx.fillRect(sx - R(0.35), sy - R(0.35), R(0.7), R(0.7));
    ell(ctx, sx, sy, R(0.055), R(0.055));
    ctx.fillStyle = '#fffbe2';
    ctx.fill();
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(t * 0.003);
    ctx.strokeStyle = 'rgba(255,245,190,.45)';
    ctx.lineWidth = 3;
    for (let j = 0; j < 12; j++) {
      const a = (j / 12) * TAU;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * R(0.08), Math.sin(a) * R(0.08));
      ctx.lineTo(Math.cos(a) * R(0.11 + (j % 2) * 0.03), Math.sin(a) * R(0.11 + (j % 2) * 0.03));
      ctx.stroke();
    }
    ctx.restore();
  }
  // 구름
  for (let j = 0; j < 4; j++) {
    const cx = ((((j * 0.31 + 0.1 - cam * 0.04 + t * 0.00012 * (1 + j * 0.3)) % 1.3) + 1.3) % 1.3) * w - R(0.15), cy = R(0.12 + (j % 2) * 0.07 + j * 0.012);
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    for (const [ox, oy, rr0] of [[0, 0, 0.05], [0.05, -0.02, 0.06], [0.11, 0, 0.045], [0.055, 0.015, 0.05]] as number[][]) {
      ell(ctx, cx + R(ox), cy + R(oy), R(rr0), R(rr0 * 0.75));
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(190,225,245,.5)';
    ell(ctx, cx + R(0.055), cy + R(0.03), R(0.09), R(0.02));
    ctx.fill();
  }
  if (d.key === 'rain') {
    // 여우비 무지개
    ctx.save();
    ctx.globalAlpha = 0.45;
    const cols = ['#ff7a7a', '#ffb36a', '#ffe66a', '#8ae67a', '#6ac8ff', '#9a8aff'];
    for (let j = 0; j < cols.length; j++) {
      ctx.beginPath();
      ctx.arc(R(0.35) - cam * R(0.03), R(0.5), R(0.4 - j * 0.018), Math.PI * 1.08, Math.PI * 1.92);
      ctx.strokeStyle = cols[j];
      ctx.lineWidth = R(0.018);
      ctx.stroke();
    }
    ctx.restore();
  }
  // 먼 언덕 두 겹
  const hill = (base: number, amp: number, par: number, c0: string, c1: string, seed: number) => {
    ctx.beginPath();
    ctx.moveTo(-10, R(PY0) + 2);
    for (let x = -10; x <= w + 10; x += 8) {
      const u = (x / w + cam * par) * 3;
      ctx.lineTo(x, R(base) - R(amp) * (0.55 + 0.3 * Math.sin(u * 1.7 + seed) + 0.15 * Math.sin(u * 4.1 + seed * 2)));
    }
    ctx.lineTo(w + 10, R(PY0) + 2);
    ctx.closePath();
    ctx.fillStyle = lin(ctx, 0, R(base - amp), 0, R(PY0), [0, c0], [1, c1]);
    ctx.fill();
  };
  hill(0.38, 0.09, 0.08, '#a8dcb0', '#c6ecd0', 1);
  hill(0.41, 0.07, 0.16, '#7cc88a', '#9ad8a2', 4);
  // 나무 줄 (버드나무·둥근 나무)
  {
    const par = 0.32;
    const k0 = Math.floor((cam * par - 0.2) / 0.16), k1 = k0 + 9;
    for (let k = k0; k <= k1; k++) {
      const tx = (k * 0.16 + hsh(k) * 0.08 - cam * par) * w, ty = R(0.43), tr = R(0.05 + hsh(k + 9) * 0.03);
      ctx.fillStyle = '#5e8a4a';
      ctx.fillRect(tx - 2, ty - tr * 0.6, 4, tr * 0.7);
      const cg = hsh(k + 3) > 0.5;
      ctx.fillStyle = cg ? '#5fb05a' : '#74c260';
      ell(ctx, tx, ty - tr, tr, tr * 0.9);
      ctx.fill();
      ell(ctx, tx - tr * 0.5, ty - tr * 0.7, tr * 0.7, tr * 0.6);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,220,.35)';
      ell(ctx, tx - tr * 0.3, ty - tr * 1.3, tr * 0.45, tr * 0.3);
      ctx.fill();
    }
  }
  // 먼 물가 풀둑
  ctx.fillStyle = lin(ctx, 0, R(PY0 - 0.035), 0, R(PY0 + 0.01), [0, '#8ad66a'], [1, '#5aa848']);
  ctx.beginPath();
  ctx.moveTo(-10, R(PY0 + 0.012));
  for (let x = -10; x <= w + 10; x += 10) ctx.lineTo(x, R(PY0 - 0.022) + Math.sin((x / w + cam * 0.6) * 18) * R(0.006));
  ctx.lineTo(w + 10, R(PY0 + 0.012));
  ctx.closePath();
  ctx.fill();

  // ═════════════ 연못 ═════════════
  const py0 = R(PY0), py1 = R(NB);
  ctx.fillStyle = lin(ctx, 0, py0, 0, py1, [0, '#a8f0ea'], [0.25, '#6fdadb'], [0.7, '#38bccb'], [1, '#26a4be']);
  ctx.fillRect(-20, py0, w + 40, py1 - py0 + 2);
  // 먼 물가 반사광
  ctx.fillStyle = lin(ctx, 0, py0, 0, py0 + R(0.06), [0, 'rgba(255,255,255,.55)'], [1, 'rgba(255,255,255,0)']);
  ctx.fillRect(-20, py0, w + 40, R(0.06));
  // 물속 수초 (연못과 같이 흐름)
  {
    const k0 = Math.floor((cam - 0.3) / 0.21), k1 = Math.ceil((cam + 1.3) / 0.21);
    ctx.lineCap = 'round';
    for (let k = k0; k <= k1; k++) {
      const u = k * 0.21 + hsh(k * 1.7) * 0.15, v = 0.2 + hsh(k * 2.3) * 1.05, x = X(u), y = Y(v);
      ctx.strokeStyle = `rgba(20,110,90,${0.22 + 0.12 * (v / VMAX)})`;
      ctx.lineWidth = R(0.012);
      for (let b = 0; b < 3; b++) {
        ctx.beginPath();
        const bx = x + (b - 1) * R(0.02), hgt = R(0.06 + hsh(k + b) * 0.05);
        ctx.moveTo(bx, y);
        ctx.quadraticCurveTo(bx + Math.sin(t * 0.03 + k + b) * R(0.03), y - hgt * 0.5, bx + Math.sin(t * 0.03 + k + b + 1) * R(0.04), y - hgt);
        ctx.stroke();
      }
    }
  }
  // 물고기 그림자
  for (let j = 0; j < 3; j++) {
    const span = 2.4, u0 = Math.floor(cam / span) * span;
    let fu = u0 + ((hsh(j * 5) * span + t * 0.0016 * (1 + j * 0.4)) % span);
    if (fu < cam - 0.3) fu += span;
    const fv = 0.25 + j * 0.33 + Math.sin(t * 0.01 + j * 2) * 0.08, x = X(fu), y = Y(fv);
    if (x < -40 || x > w + 40) continue;
    ctx.fillStyle = 'rgba(14,70,90,.2)';
    ell(ctx, x, y, R(0.045), R(0.014));
    ctx.fill();
    ctx.beginPath();
    const wag = Math.sin(t * 0.3 + j) * R(0.01);
    ctx.moveTo(x - R(0.04), y);
    ctx.lineTo(x - R(0.075), y - R(0.015) + wag);
    ctx.lineTo(x - R(0.075), y + R(0.015) + wag);
    ctx.closePath();
    ctx.fill();
  }
  // 햇빛 물결 무늬
  ctx.strokeStyle = 'rgba(255,255,255,.16)';
  ctx.lineWidth = 1.6;
  for (let j = 0; j < 11; j++) {
    const yy = py0 + R(0.03) + j * R(0.068);
    ctx.beginPath();
    for (let x = -10; x <= w + 10; x += 12) {
      const u = x / w + cam;
      ctx.lineTo(x, yy + Math.sin(u * 13 + t * 0.03 + j * 1.7) * R(0.008) + Math.sin(u * 31 - t * 0.02 + j) * R(0.004));
    }
    ctx.stroke();
  }
  // 반짝임
  for (let j = 0; j < 18; j++) {
    const u = cam - 0.1 + ((hsh(j * 3.1) * 1.3 + 13) % 1.3), v = hsh(j * 7.3) * VMAX, a = Math.max(0, Math.sin(t * 0.06 + j * 2.1));
    if (a < 0.5) continue;
    const x = X(u), y = Y(v), sz = R(0.012) * a;
    ctx.fillStyle = `rgba(255,255,255,${(a - 0.5) * 1.6})`;
    ctx.beginPath();
    ctx.moveTo(x - sz * 2, y);
    ctx.lineTo(x, y - sz * 0.6);
    ctx.lineTo(x + sz * 2, y);
    ctx.lineTo(x, y + sz * 0.6);
    ctx.closePath();
    ctx.fill();
  }

  // ── 물결 (시뮬레이션과 같은 속도로 퍼진다) ──
  for (const rp of s.ripples) {
    const age = t - rp.t0, fr = Math.min(rp.R, age * RV);
    const fade = rp.done ? Math.max(0, 1 - (age - rp.R / RV) / 30) : 1;
    if (fade <= 0) continue;
    const x = X(rp.u), y = Y(rp.v);
    for (let j = 0; j < 3; j++) {
      const rj = fr - j * 0.03;
      if (rj <= 0.005) continue;
      ell(ctx, x, y, R(rj), R(rj) * SQ);
      ctx.strokeStyle = j === 0 ? `rgba(255,255,255,${0.85 * fade})` : `rgba(230,255,255,${0.45 * fade})`;
      ctx.lineWidth = (j === 0 ? 3.2 : 1.8) * (rp.big ? 1.4 : 1);
      ctx.stroke();
    }
    if (j0(rp)) {
      ell(ctx, x, y, R(fr + 0.006), R(fr + 0.006) * SQ);
      ctx.strokeStyle = `rgba(20,110,140,${0.25 * fade})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
  // 비 오는 날 작은 물결
  if (d.key === 'rain') {
    for (let j = 0; j < 14; j++) {
      const ph = (t + j * 23) % 50, seed = Math.floor((t + j * 23) / 50) * 31 + j;
      const u = cam + hsh(seed) * 1.1, v = hsh(seed + 7) * VMAX, r0 = 0.005 + ph * 0.0011;
      ell(ctx, X(u), Y(v), R(r0), R(r0) * SQ);
      ctx.strokeStyle = `rgba(255,255,255,${0.5 * (1 - ph / 50)})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }

  // ── 출발 통나무 · 결승 ──
  {
    const lx = X(-0.06);
    if (lx > -R(0.2)) {
      const y0 = Y(0.04), y1 = Y(1.25), lw2 = R(0.085);
      ell(ctx, lx + R(0.01), (y0 + y1) / 2 + R(0.015), lw2 * 0.7, (y1 - y0) / 2 + R(0.01));
      ctx.fillStyle = 'rgba(16,90,100,.3)';
      ctx.fill();
      rr(ctx, lx - lw2 / 2, y0, lw2, y1 - y0, lw2 / 2);
      fs(ctx, lin(ctx, lx - lw2 / 2, 0, lx + lw2 / 2, 0, [0, '#8a5a32'], [0.4, '#c48a52'], [1, '#6a4022']), 2, '#4a2a12');
      ctx.strokeStyle = 'rgba(80,40,10,.5)';
      ctx.lineWidth = 1.5;
      for (let j = 0; j < 9; j++) {
        const yy = y0 + ((j + 0.5) / 9) * (y1 - y0);
        ctx.beginPath();
        ctx.moveTo(lx - lw2 * 0.35, yy);
        ctx.quadraticCurveTo(lx, yy + R(0.012), lx + lw2 * 0.35, yy - R(0.004));
        ctx.stroke();
      }
      ell(ctx, lx, y1 - R(0.01), lw2 / 2, lw2 * 0.28);
      fs(ctx, radg(ctx, lx, y1 - R(0.01), 0, lw2 / 2, [0, '#f2cf96'], [0.6, '#d8a868'], [1, '#a87040']), 2, '#4a2a12');
      ctx.strokeStyle = 'rgba(120,70,30,.6)';
      ctx.lineWidth = 1;
      ell(ctx, lx, y1 - R(0.01), lw2 * 0.25, lw2 * 0.14);
      ctx.stroke();
      // 출발 깃발
      const fxp = lx + R(0.02), fyp = Y(0.04);
      ctx.strokeStyle = '#5a3a1a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(fxp, fyp);
      ctx.lineTo(fxp, fyp - R(0.17));
      ctx.stroke();
      ctx.beginPath();
      const wv = Math.sin(t * 0.15) * R(0.008);
      ctx.moveTo(fxp, fyp - R(0.17));
      ctx.quadraticCurveTo(fxp + R(0.08), fyp - R(0.16) + wv, fxp + R(0.14), fyp - R(0.15));
      ctx.lineTo(fxp + R(0.14), fyp - R(0.1));
      ctx.quadraticCurveTo(fxp + R(0.08), fyp - R(0.11) - wv, fxp, fyp - R(0.1));
      ctx.closePath();
      fs(ctx, '#ff6a5a', 1.5, '#8a2a1a');
      font(0.032, 900);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('출발', fxp + R(0.068), fyp - R(0.133));
    }
    const fxl = X(d.L);
    if (fxl < w + R(0.3)) {
      // 결승: 큰 연잎 무대 + 연꽃 + 깃발 줄
      ctx.fillStyle = 'rgba(255,190,220,.25)';
      ctx.fillRect(fxl, py0, w, py1 - py0);
      for (let j = 0; j < 6; j++) {
        const vv = 0.12 + j * 0.22, uu = d.L + 0.2 + (j % 2) * 0.12;
        drawPad(ctx, s, { id: -1, k: 'giant', u: uu, v: vv, r: 0.17, amp: 0, ph: 0, om: 0, load: 0, sunk: 0, wob: -99, wobA: 0, seed: 77 + j, keep: false }, X(uu), Y(vv), R(0.17), t, false);
      }
      for (let j = 0; j < 4; j++) drawLotus(ctx, X(d.L + 0.42 + (j % 2) * 0.1), Y(0.2 + j * 0.3), R(0.09), t + j * 40, 0.5);
      // 깃발 줄
      const top = Y(-0.06), bot = Y(VMAX + 0.02);
      for (const yy of [top, bot]) {
        ctx.strokeStyle = '#5a3a1a';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(fxl, yy);
        ctx.lineTo(fxl, yy - R(0.2));
        ctx.stroke();
        ell(ctx, fxl, yy - R(0.22), R(0.014), R(0.04));
        fs(ctx, '#8a5a2a', 1, '#3a2010');
      }
      ctx.strokeStyle = 'rgba(90,60,30,.8)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(fxl, top - R(0.19));
      ctx.quadraticCurveTo(fxl + R(0.03), (top + bot) / 2 - R(0.12), fxl, bot - R(0.19));
      ctx.stroke();
      const cols = ['#ff6a8a', '#ffd84a', '#ffffff', '#6ad0ff'];
      for (let j = 0; j < 12; j++) {
        const k = (j + 0.5) / 12, yy = top - R(0.19) + (bot - top) * k, xx = fxl + R(0.03) * 4 * k * (1 - k);
        ctx.beginPath();
        ctx.moveTo(xx, yy - R(0.012));
        ctx.lineTo(xx + R(0.035), yy + Math.sin(t * 0.2 + j) * R(0.005));
        ctx.lineTo(xx, yy + R(0.012));
        ctx.closePath();
        fs(ctx, cols[j % 4], 1, 'rgba(60,40,20,.6)');
      }
      // 결승 현수막
      const by = Y(-0.06) - R(0.24);
      rr(ctx, fxl - R(0.085), by - R(0.03), R(0.17), R(0.06), R(0.02));
      fs(ctx, lin(ctx, 0, by - R(0.03), 0, by + R(0.03), [0, '#ff8ab0'], [1, '#e8508a']), 2, '#8a2050');
      font(0.036, 900);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('결승', fxl, by + 1);
    }
  }

  // ── 연잎 (먼 쪽부터) ──
  const preview = previewOf(s, me);
  const vis = s.pads.filter((p) => X(p.u) > -R(0.6) && X(p.u) < w + R(0.6));
  vis.sort((a, b) => padV(a, t) - padV(b, t));
  for (const p of vis) drawPad(ctx, s, p, X(p.u), Y(padV(p, t)), R(p.r), t, !!preview && preview.L.k === 'pad' && preview.L.idx === p.id);

  // ── 왜가리 그림자 ──
  const hr = s.heron;
  if (hr && hr.st !== 'rest' && hr.st !== 'carry') {
    const x = X(hr.u), y = Y(hr.v), lock = hr.st === 'lock', k = lock ? 1 - hr.tm / LOCK_T : 0;
    ell(ctx, x, y, R(HERON_R), R(HERON_R) * SQ);
    ctx.fillStyle = `rgba(20,40,60,${0.18 + 0.22 * k})`;
    ctx.fill();
    // 날개 모양 그림자
    ctx.fillStyle = `rgba(20,40,60,${0.2 + 0.2 * k})`;
    ctx.beginPath();
    ctx.moveTo(x - R(0.12), y);
    ctx.quadraticCurveTo(x, y - R(0.04), x + R(0.12), y);
    ctx.quadraticCurveTo(x, y + R(0.02), x - R(0.12), y);
    ctx.fill();
    if (lock) {
      ctx.save();
      ctx.setLineDash([R(0.02), R(0.012)]);
      ctx.lineDashOffset = -t * 0.8;
      ell(ctx, x, y, R(HERON_R * (1.25 - 0.25 * k)), R(HERON_R * (1.25 - 0.25 * k)) * SQ);
      ctx.strokeStyle = `rgba(255,60,60,${0.6 + 0.4 * Math.sin(t * 0.5)})`;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.ellipse(x, y, R(HERON_R) * 0.6, R(HERON_R) * 0.6 * SQ, 0, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - k));
      ctx.strokeStyle = '#ff4040';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();
    }
  }

  // ── 위험 표시: 경쟁자가 정해 둔 내려앉을 자리 ──
  if (s.phase === 'play' && !s.wait) {
    const myR = me.pad >= 0 ? s.pads[me.pad].r : 0.07;
    for (const f of s.frogs) {
      if (f.i === 0) continue;
      let lu = 0, lv = 0, Rr = 0, ok = false;
      if (f.st === AIR && f.rm > 0) {
        lu = f.u1;
        lv = f.v1;
        Rr = (R0 + R1 * f.c) * f.rm * d.rain;
        ok = true;
      } else if (f.st === SIT && f.plan && !f.plan.quiet && f.hold > 4) {
        const [su, sv] = seatPos(s, f, t);
        lu = su + f.plan.D;
        lv = sv;
        Rr = (R0 + R1 * f.plan.c) * d.rain;
        ok = true;
      }
      if (!ok) continue;
      const danger = me.st === SIT && Math.hypot(me.u - lu, me.v - lv) - myR < Rr;
      const x = X(lu), y = Y(lv), L = LOOKS[f.i];
      ctx.save();
      ctx.globalAlpha = 0.85;
      ell(ctx, x, y, R(0.035), R(0.035) * SQ);
      ctx.strokeStyle = L.body;
      ctx.lineWidth = 3;
      ctx.stroke();
      ell(ctx, x, y, R(0.012), R(0.012) * SQ);
      ctx.fillStyle = L.body;
      ctx.fill();
      if (danger) {
        ctx.setLineDash([R(0.016), R(0.012)]);
        ctx.lineDashOffset = -t;
        ell(ctx, x, y, R(Rr), R(Rr) * SQ);
        ctx.strokeStyle = `rgba(255,70,70,${0.55 + 0.35 * Math.sin(t * 0.4)})`;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();
      if (danger) fx.memo.dangerT = t;
    }
  }

  // ── 내 점프 미리 보기: 포물선 점선 · 착지 고리 · 물결 원 ──
  if (preview) {
    const { L, D, c } = preview;
    const sx0 = X(me.u), sy0 = Y(me.v), lx = X(L.u), ly = Y(L.v), wet = L.k === 'water';
    const col = wet ? '#ff4a4a' : '#ffffff';
    // 물결 원
    if (!wet && L.k !== 'fin') {
      const Rr = (R0 + R1 * c) * d.rain;
      ctx.save();
      ctx.setLineDash([R(0.014), R(0.012)]);
      ctx.lineDashOffset = -t * 0.6;
      ell(ctx, lx, ly, R(Rr), R(Rr) * SQ);
      ctx.strokeStyle = 'rgba(255,255,255,.75)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
    // 포물선 점
    const zp = zPeak(D);
    for (let j = 1; j < 14; j++) {
      const k = j / 14, x = sx0 + (lx - sx0) * k, y = sy0 + (ly - sy0) * k - R(4 * zp * k * (1 - k)) - R(0.05);
      ell(ctx, x, y, R(0.008), R(0.008));
      ctx.fillStyle = wet ? 'rgba(255,90,90,.9)' : 'rgba(255,255,255,.95)';
      ctx.fill();
    }
    // 착지 고리
    const pul = 1 + 0.08 * Math.sin(t * 0.5);
    ell(ctx, lx, ly, R(0.05) * pul, R(0.05) * SQ * pul);
    ctx.fillStyle = wet ? 'rgba(255,60,60,.25)' : 'rgba(120,255,140,.3)';
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 3.5;
    ctx.stroke();
    if (wet) {
      ctx.strokeStyle = '#ff3a3a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(lx - R(0.02), ly - R(0.012));
      ctx.lineTo(lx + R(0.02), ly + R(0.012));
      ctx.moveTo(lx + R(0.02), ly - R(0.012));
      ctx.lineTo(lx - R(0.02), ly + R(0.012));
      ctx.stroke();
      font(0.036, 900);
      ctx.textAlign = 'center';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(120,10,10,.7)';
      ctx.strokeText('물이에요!', lx, ly - R(0.05));
      ctx.fillStyle = '#ffffff';
      ctx.fillText('물이에요!', lx, ly - R(0.05));
    }
  }

  // ── 개구리·오리 (먼 쪽부터) ──
  type Item = { v: number; draw: () => void };
  const items: Item[] = [];
  for (const dk of s.ducks) {
    if (t < dk.t0) continue;
    const [du, dv] = duckPos(dk, t), x = X(du), y = Y(dv);
    if (x < -R(0.4) || x > w + R(0.4)) continue;
    const ride = s.frogs.some((f) => f.duck === dk.id);
    items.push({ v: dv, draw: () => {
      for (let j = 3; j >= 1; j--) {
        const [ku, kv] = duckPos(dk, t - j * 16);
        drawDuck(ctx, X(ku) - R(0.04 * j), Y(kv), R(0.075) * ds(kv), t + j * 9, true, false);
      }
      drawDuck(ctx, x, y, R(0.16) * ds(dv), t, false, ride);
    } });
  }
  const sayList: { x: number; y: number; text: string; age: number; i: number }[] = [];
  for (const f of s.frogs) {
    if (f.st === GRAB && hr && hr.st === 'carry') continue;
    const x = X(f.u), y = Y(f.v), k = R(FK) * ds(f.v) * (f.i === 0 ? 1.08 : 1);
    if (x < -k * 2 || x > w + k * 2) continue;
    items.push({ v: f.v, draw: () => {
      // 그림자
      if (f.st !== SWIM) {
        const zz = R(f.z);
        ell(ctx, x, y + R(0.004), k * 0.45 * (1 - Math.min(0.5, f.z * 1.6)), k * 0.13 * (1 - Math.min(0.5, f.z * 1.6)));
        ctx.fillStyle = `rgba(10,60,60,${0.32 - Math.min(0.18, f.z * 0.6)})`;
        ctx.fill();
        void zz;
      }
      const pose = poseOf(s, f, t);
      const by = y - R(f.z) - (f.st === DONE ? Math.abs(Math.sin(t * 0.2 + f.i)) * k * 0.15 : 0);
      if (f.st === SWIM) {
        // 물 왕관 + 고리
        const age = t - ((fx.memo as Record<string, number>)['crown' + f.i] ?? -99);
        if (age < 16) {
          ctx.fillStyle = `rgba(255,255,255,${1 - age / 16})`;
          for (let j = 0; j < 7; j++) {
            const a = Math.PI + (j / 6) * Math.PI, hh = k * (0.35 + 0.25 * Math.sin(j * 2.3)) * Math.sin((age / 16) * Math.PI);
            ell(ctx, x + Math.cos(a) * k * 0.4, y - hh * 0.5 + Math.sin(a) * k * 0.05, k * 0.05, hh * 0.5 + 1);
            ctx.fill();
          }
        }
        ell(ctx, x, y + k * 0.02, k * (0.5 + 0.06 * Math.sin(t * 0.3)), k * 0.14);
        ctx.strokeStyle = 'rgba(255,255,255,.8)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      drawFrog(ctx, x, by, k, f.i, pose);
      if (f.st === SWIM) {
        ell(ctx, x, y + k * 0.03, k * 0.42, k * 0.1);
        ctx.fillStyle = 'rgba(60,190,210,.45)';
        ctx.fill();
      }
      // 내 개구리 모으는 힘 고리
      if (f.i === 0 && f.st === SIT && f.hold > 0 && s.phase === 'play') {
        const c = chOf(f.hold);
        ctx.beginPath();
        ctx.ellipse(x, y + R(0.004), k * 0.62, k * 0.2, 0, -Math.PI / 2, -Math.PI / 2 + TAU * c);
        ctx.strokeStyle = c >= 1 ? '#ffe066' : '#ffffff';
        ctx.lineWidth = 4;
        ctx.stroke();
      }
      if (t - f.sayT < 50 && f.say) sayList.push({ x, y: by - k * 0.95, text: f.say, age: t - f.sayT, i: f.i });
    } });
  }
  items.sort((a, b) => a.v - b.v);
  for (const it of items) it.draw();
  // 왜가리 (하늘에서 내리꽂기 · 물고 날아감)
  if (hr && hr.st !== 'rest') {
    let x = X(hr.u), y = Y(hr.v), dive = 0, beak = 0.2;
    const k = R(0.3);
    if (hr.st === 'track') y = R(0.2) + Math.sin(t * 0.05) * R(0.02);
    else if (hr.st === 'lock') {
      const q = 1 - hr.tm / LOCK_T;
      y = R(0.2) + (Y(hr.v) - R(0.2) - R(0.16)) * q * q * 0.5;
      beak = q;
    } else if (hr.st === 'peck') {
      const q = 1 - hr.tm / 14;
      dive = Math.sin(q * Math.PI);
      y = R(0.2) + (Y(hr.v) - R(0.24) - R(0.2)) * (0.5 + 0.5 * dive);
      beak = 1 - dive;
    } else if (hr.st === 'carry') {
      y = Y(hr.v) - R(0.3) - R(0.1) * Math.sin(((60 - hr.tm) / 60) * Math.PI);
      x = X(hr.u);
    }
    if (hr.st === 'carry' && hr.carry >= 0) {
      const f = s.frogs[hr.carry], kf = R(FK) * 0.9;
      drawFrog(ctx, x + k * 0.35, y + k * 0.42, kf, f.i, poseOf(s, f, t));
    }
    drawHeron(ctx, x, y, k, t, dive, beak);
  }
  // 말풍선 외침
  for (const q of sayList) {
    const a = Math.min(1, (50 - q.age) / 12), sc = q.age < 6 ? 0.6 + q.age / 15 : 1;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(q.x + R(0.03), q.y - q.age * 0.25);
    ctx.scale(sc, sc);
    font(0.04, 900);
    const tw = ctx.measureText(q.text).width;
    rr(ctx, -tw / 2 - 7, -R(0.027), tw + 14, R(0.054), R(0.027));
    fs(ctx, '#ffffff', 2, q.i === 0 ? '#c82a2a' : LOOKS[q.i].dark);
    ctx.beginPath();
    ctx.moveTo(-R(0.012), R(0.025));
    ctx.lineTo(-R(0.02), R(0.05));
    ctx.lineTo(R(0.006), R(0.025));
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.fillStyle = q.i === 0 ? '#c82a2a' : LOOKS[q.i].dark;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(q.text, 0, 1);
    ctx.restore();
  }
  // 경쟁자를 빠뜨릴 수 있으면 머리 위 '!'
  if (preview && preview.L.k !== 'water') {
    const Rr = (R0 + R1 * preview.c) * d.rain;
    for (const f of s.frogs) {
      if (f.i === 0 || f.st !== SIT || f.duck >= 0) continue;
      const pr = f.pad >= 0 ? s.pads[f.pad].r : 0.07;
      if (Math.hypot(f.u - preview.L.u, f.v - preview.L.v) - pr > Rr) continue;
      const x = X(f.u), y = Y(f.v) - R(FK) * 1.15, bob = Math.sin(t * 0.4) * R(0.006);
      ell(ctx, x, y + bob, R(0.025), R(0.025));
      fs(ctx, '#ffe04a', 2, '#8a5a00');
      font(0.036, 900);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#5a3200';
      ctx.fillText('!', x, y + bob + 1);
    }
  }
  // 내가 위험하면 머리 위 빨간 '!'
  if (fx.memo.dangerT === t && me.st === SIT) {
    const x = X(me.u), y = Y(me.v) - R(FK) * 1.2, bob = Math.sin(t * 0.6) * R(0.008);
    ell(ctx, x, y + bob, R(0.028), R(0.028));
    fs(ctx, '#ff4a4a', 2, '#7a0a0a');
    font(0.04, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('!', x, y + bob + 1);
  }

  // ═════════════ 가까운 물가 (앞 풀·부들) ═════════════
  {
    const y0 = R(NB);
    ctx.fillStyle = lin(ctx, 0, y0 - R(0.01), 0, R(GB), [0, '#7ccc58'], [1, '#4f9c3c']);
    ctx.beginPath();
    ctx.moveTo(-10, R(GB) + 2);
    ctx.lineTo(-10, y0);
    for (let x = -10; x <= w + 10; x += 9) ctx.lineTo(x, y0 + Math.sin((x / w + cam * 1.2) * 21) * R(0.007) - R(0.002));
    ctx.lineTo(w + 10, R(GB) + 2);
    ctx.closePath();
    ctx.fill();
    // 물가 반짝 테
    ctx.strokeStyle = 'rgba(255,255,255,.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = -10; x <= w + 10; x += 9) ctx.lineTo(x, y0 + Math.sin((x / w + cam * 1.2) * 21) * R(0.007) - R(0.004));
    ctx.stroke();
    // 풀잎·부들 (앞쪽 시차)
    const par = 1.25, k0 = Math.floor((cam * par - 0.1) / 0.07), k1 = k0 + 17;
    for (let k = k0; k <= k1; k++) {
      const x = (k * 0.07 + hsh(k * 1.3) * 0.05 - cam * par) * w, base = R(GB) + 2, hh = R(0.04 + hsh(k) * 0.05);
      const sway = Math.sin(t * 0.04 + k) * R(0.008);
      ctx.strokeStyle = hsh(k + 2) > 0.5 ? '#3f8a34' : '#5aa840';
      ctx.lineWidth = R(0.009);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, base);
      ctx.quadraticCurveTo(x + sway, base - hh * 0.6, x + sway * 2 + R(0.01), base - hh);
      ctx.stroke();
      if (hsh(k + 5) > 0.75) {
        // 부들
        ctx.strokeStyle = '#4a7a2a';
        ctx.lineWidth = R(0.006);
        ctx.beginPath();
        ctx.moveTo(x + R(0.015), base);
        ctx.lineTo(x + R(0.015) + sway * 2, base - hh * 1.5);
        ctx.stroke();
        ell(ctx, x + R(0.015) + sway * 2, base - hh * 1.5 + R(0.02), R(0.008), R(0.024));
        fs(ctx, '#8a5a2a', 1, '#4a2a10');
      } else if (hsh(k + 7) > 0.8) {
        // 작은 꽃
        ell(ctx, x + sway * 2 + R(0.01), base - hh, R(0.009), R(0.009));
        ctx.fillStyle = hsh(k + 8) > 0.5 ? '#ffe066' : '#ff9ac0';
        ctx.fill();
      }
    }
  }
  // 버드나무 가지 + 물총새 (위 왼쪽, 화면에 붙음)
  {
    const sway = Math.sin(t * 0.025) * R(0.01);
    ctx.strokeStyle = '#6a4a2a';
    ctx.lineWidth = R(0.018);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-R(0.02), R(HB + 0.03));
    ctx.quadraticCurveTo(R(0.12), R(HB + 0.02), R(0.26), R(HB + 0.06));
    ctx.stroke();
    for (let j = 0; j < 9; j++) {
      const bx = R(0.01 + j * 0.03), by = R(HB + 0.03 + j * 0.004), len = R(0.1 + hsh(j + 40) * 0.12);
      ctx.strokeStyle = 'rgba(80,140,60,.85)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + sway * 0.5, by + len * 0.5, bx + sway, by + len);
      ctx.stroke();
      ctx.fillStyle = j % 2 ? '#8ad06a' : '#6ab850';
      for (let q = 1; q < 6; q++) {
        const qq = q / 6;
        ell(ctx, bx + sway * qq + (q % 2 ? 2 : -2), by + len * qq, R(0.006), R(0.014), q % 2 ? 0.4 : -0.4);
        ctx.fill();
      }
    }
    const hop = t - (fx.memo.birdT ?? -999);
    drawKingfisher(ctx, R(0.2), R(HB + 0.045), R(0.075), t, hop < 30 ? hop : 0);
    if (hop < 50) {
      font(0.034, 900);
      ctx.textAlign = 'left';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(20,60,100,.6)';
      ctx.strokeText('찌르릇!', R(0.25), R(HB + 0.02));
      ctx.fillStyle = '#ffffff';
      ctx.fillText('찌르릇!', R(0.25), R(HB + 0.02));
    }
    // 잠자리 한 마리
    const dx = R(0.5 + 0.35 * Math.sin(t * 0.007)), dy = R(0.3 + 0.06 * Math.sin(t * 0.013));
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    for (const sg of [-1, 1]) {
      ell(ctx, dx - R(0.006), dy + sg * R(0.01), R(0.018), R(0.006), sg * (0.3 + 0.3 * Math.sin(t * 1.4)));
      ctx.fill();
    }
    ctx.strokeStyle = '#e8503a';
    ctx.lineWidth = R(0.007);
    ctx.beginPath();
    ctx.moveTo(dx + R(0.012), dy);
    ctx.lineTo(dx - R(0.035), dy + R(0.003));
    ctx.stroke();
  }
  // 여우비 빗줄기
  if (d.key === 'rain') {
    ctx.strokeStyle = 'rgba(255,255,255,.45)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let j = 0; j < 40; j++) {
      const x = ((hsh(j) * w + t * 2.2) % (w + 40)) - 20, y = ((hsh(j * 3) * h + t * 9) % (R(GB) + 20)) - 20;
      ctx.moveTo(x, y);
      ctx.lineTo(x - R(0.012), y + R(0.045));
    }
    ctx.stroke();
  }

  // ── 첫 화면 안내: 이름표 · 손가락 ──
  if (s.wait) {
    for (const f of s.frogs) {
      const x = X(f.u) + R(0.11), y = Y(f.v) - R(0.05);
      font(f.i === 0 ? 0.036 : 0.032, 900);
      const txt = LOOKS[f.i].name, tw = ctx.measureText(txt).width;
      rr(ctx, x - 4, y - R(0.022), tw + 10, R(0.044), R(0.022));
      fs(ctx, f.i === 0 ? '#ec3a32' : 'rgba(255,255,255,.92)', 1.5, f.i === 0 ? '#7a1010' : LOOKS[f.i].dark);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = f.i === 0 ? '#ffffff' : LOOKS[f.i].dark;
      ctx.fillText(txt, x + 1, y + 1);
    }
    const cyc = (t % 90) / 90, press = cyc < 0.6 ? Math.min(1, cyc * 4) : Math.max(0, 1 - (cyc - 0.6) * 6);
    drawHand(ctx, X(me.u) + R(0.05), Y(me.v) - R(0.02), R(0.1), press);
  }
  ctx.restore();

  // ═════════════ 큰 순간 띠 ═════════════
  if (fx.memo.bigT !== undefined && t - fx.memo.bigT < (fx.memo.bigK === 2 ? 40 : 60)) {
    const age = t - fx.memo.bigT, n = fx.memo.bigN, combo = fx.memo.bigK === 1;
    const sc2 = age < 7 ? 1.9 - 0.9 * (age / 7) : 1, a = Math.min(1, ((fx.memo.bigK === 2 ? 40 : 60) - age) / 14);
    const go = fx.memo.bigK === 2;
    const txt = go ? '출발!' : combo ? `콤보 ×${n}!` : n >= 3 ? '셋 한꺼번에 첨벙!' : '둘 한꺼번에 첨벙!';
    const size = go ? 30 : Math.min(34, combo ? 24 : 22 + n * 3);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(w / 2, R(0.3));
    ctx.rotate(-0.04);
    ctx.scale(sc2, sc2);
    ctx.font = `900 ${size}px system-ui, sans-serif`;
    const tw = ctx.measureText(txt).width;
    rr(ctx, -tw / 2 - 18, -size * 0.78, tw + 36, size * 1.56, size * 0.78);
    fs(ctx, go ? lin(ctx, 0, -size, 0, size, [0, '#ff9a6a'], [1, '#e8483a']) : lin(ctx, 0, -size, 0, size, [0, '#5fe0e6'], [1, '#1f9ab8']), 3, go ? '#7a1a10' : '#0e4a64');
    ctx.fillStyle = 'rgba(255,255,255,.3)';
    rr(ctx, -tw / 2 - 10, -size * 0.66, tw + 20, size * 0.4, size * 0.2);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 6;
    ctx.strokeStyle = go ? '#6a1208' : '#0a3a50';
    ctx.strokeText(txt, 0, 2);
    ctx.fillStyle = lin(ctx, 0, -size / 2, 0, size / 2, [0, '#ffffff'], [0.5, '#fff6a8'], [1, '#ffd23a']);
    ctx.fillText(txt, 0, 2);
    for (let j = 0; j < 4; j++) {
      const an = t * 0.09 + (j * TAU) / 4;
      ell(ctx, Math.cos(an) * (tw / 2 + 24), Math.sin(an) * size * 0.95, 5, 6);
      ctx.fillStyle = '#bff6ff';
      ctx.fill();
    }
    ctx.restore();
  }

  // ═════════════ 위 띠: 판 · 하트 · 별 ═════════════
  ctx.textBaseline = 'middle';
  const hb = R(HB);
  ctx.fillStyle = lin(ctx, 0, 0, 0, hb, [0, 'rgba(255,255,255,.94)'], [1, 'rgba(236,252,246,.92)']);
  ctx.fillRect(0, 0, w, hb);
  ctx.fillStyle = 'rgba(60,150,90,.35)';
  ctx.fillRect(0, hb - 2, w, 2);
  {
    const cx = R(0.055), cy = hb / 2;
    ell(ctx, cx, cy, R(0.031), R(0.031));
    fs(ctx, lin(ctx, cx, cy - R(0.03), cx, cy + R(0.03), [0, '#8ee86a'], [1, '#3a9a3a']), 2, '#1e5a2a');
    ctx.fillStyle = '#ffffff';
    font(0.036, 900);
    ctx.textAlign = 'center';
    ctx.fillText(String(s.stage + 1), cx, cy + 1);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#1e4a30';
    font(0.044, 900);
    ctx.fillText(d.name, R(0.1), cy + 1);
    const nw = ctx.measureText(d.name).width;
    font(0.034, 700);
    ctx.fillStyle = '#6a9a7a';
    ctx.fillText(` / ${STAGE_COUNT}`, R(0.1) + nw, cy + 2);
  }
  {
    const cy = hb / 2;
    ctx.textAlign = 'right';
    font(0.042, 900);
    const st = String(s.stars), sw = ctx.measureText(st).width;
    ctx.fillStyle = '#c88a00';
    ctx.fillText(st, w - R(0.03), cy + 1);
    starPath(ctx, w - R(0.03) - sw - R(0.025), cy, R(0.022));
    fs(ctx, '#ffd23a', 1.4, '#a86a00');
    for (let j = 0; j < 3; j++) {
      const hx = w - R(0.03) - sw - R(0.085) - j * R(0.052);
      heartPath(ctx, hx, cy, R(0.018));
      const on = 2 - j < s.hearts;
      fs(ctx, on ? lin(ctx, hx, cy - R(0.02), hx, cy + R(0.02), [0, '#ff8a95'], [1, '#e02a40']) : 'rgba(30,60,40,.1)', 1.5, on ? '#8a1020' : 'rgba(30,60,40,.3)');
    }
  }
  // 판 카드 (하늘 자리)
  {
    let head = '', sub = '', age = 0, a = 1;
    if (s.phase === 'result') {
      age = s.pt;
      a = Math.min(1, age / 8);
      if (s.ok) head = s.won ? '연못 대경주 우승!' : `${RANK_TXT[s.rank]}! 결승 연꽃 도착`;
      else (head = `으앗… ${s.why}`), (sub = s.hearts > 0 ? '하트 -1 · 같은 판 다시' : '끝 — 개구리가 연잎에서 꾸벅꾸벅');
    } else if (s.wait && (s.stage > 0 || s.again)) {
      age = s.pt;
      a = Math.min(1, age / 6);
      head = `${s.again ? '다시! ' : ''}${s.stage + 1}판 · ${d.name}`;
      sub = d.news ? `NEW  ${d.news}` : '꾹 누르면 출발!';
    } else if (!s.wait && s.pt < CARD_T * 0.6 && s.stage > 0 && d.news) {
      age = s.pt;
      a = Math.min(1, (CARD_T * 0.6 - s.pt) / 20);
      head = `NEW  ${d.news.split(' — ')[0]}`;
      sub = d.news.split(' — ')[1] ?? '';
    }
    if (head) {
      const cy = R(0.205), unroll = Math.min(1, 0.3 + age / 10);
      ctx.save();
      ctx.globalAlpha = a;
      font(0.046, 900);
      const w1 = ctx.measureText(head).width;
      font(0.036, 800);
      const w2 = sub ? ctx.measureText(sub).width : 0;
      const cw = Math.min(w - R(0.06), Math.max(w1, w2) + R(0.1)) * unroll, chh = sub || (s.phase === 'result' && s.ok) ? R(0.13) : R(0.08);
      ctx.fillStyle = 'rgba(20,80,60,.22)';
      rr(ctx, w / 2 - cw / 2 + 3, cy - chh / 2 + 4, cw, chh, R(0.03));
      ctx.fill();
      rr(ctx, w / 2 - cw / 2, cy - chh / 2, cw, chh, R(0.03));
      fs(ctx, lin(ctx, 0, cy - chh / 2, 0, cy + chh / 2, [0, '#ffffff'], [1, '#e6fbef']), 2.5, '#3a9a5a');
      ctx.beginPath();
      ctx.rect(w / 2 - cw / 2, cy - chh / 2, cw, chh);
      ctx.clip();
      ctx.textAlign = 'center';
      font(0.046, 900);
      ctx.fillStyle = s.phase === 'result' ? (s.ok ? '#c06a00' : '#b8283a') : '#1e5a36';
      if (s.phase === 'result' && s.ok) {
        ctx.fillText(head, w / 2, cy - R(0.027), w - R(0.1));
        const n = d.stars.length;
        for (let j = 0; j < n; j++) {
          const ag = s.pt - (12 + j * 12), sx = w / 2 + (j - (n - 1) / 2) * R(0.075), sy = cy + R(0.032);
          const pop = ag < 0 ? 0 : ag < 8 ? 1.9 - 0.9 * (ag / 8) : 1;
          starPath(ctx, sx, sy, R(0.028) * (ag < 0 ? 1 : pop));
          fs(ctx, ag >= 0 && s.starOk[j] ? '#ffc93a' : 'rgba(40,90,60,.15)', 1.5, ag >= 0 && s.starOk[j] ? '#9a6a00' : 'rgba(40,90,60,.4)');
          if (ag >= 0 && s.starOk[j] && (fx.memo['st' + j] ?? -1) < s.t - ag) (fx.memo['st' + j] = s.t - ag), fx.burst(sx, sy, '#ffd84a', 16, 3, 2.4);
        }
      } else {
        ctx.fillText(head, w / 2, cy - (sub ? R(0.027) : 0), w - R(0.1));
        if (sub) {
          font(0.036, 800);
          ctx.fillStyle = sub.startsWith('NEW') || (d.news && s.phase === 'play') ? '#d0306a' : '#4a6a50';
          ctx.fillText(sub, w / 2, cy + R(0.034), w - R(0.1));
        }
      }
      ctx.restore();
    }
  }
  // NEW 스포트라이트
  if (s.spot && s.phase === 'play' && !s.wait) {
    const age = t - s.spot.t, x = X(s.spot.u), y = Y(s.spot.v);
    if (age < 240 && x > 0 && x < w) {
      const pul = 1 + 0.12 * Math.sin(age * 0.25);
      ctx.save();
      ctx.globalAlpha = Math.min(1, (240 - age) / 30);
      ell(ctx, x, y, R(0.13) * pul, R(0.13) * SQ * pul);
      ctx.strokeStyle = '#ffe04a';
      ctx.lineWidth = 3.5;
      ctx.setLineDash([R(0.02), R(0.012)]);
      ctx.lineDashOffset = -age;
      ctx.stroke();
      ctx.setLineDash([]);
      font(0.034, 900);
      const tw = ctx.measureText(`NEW ${s.spot.label}`).width + R(0.06);
      const lx = clamp(x, tw / 2 + 4, w - tw / 2 - 4), ly = R(PY0 + 0.035);
      // 물가 위 이름표에서 고리까지 점선
      ctx.strokeStyle = 'rgba(255,224,74,.9)';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(lx, ly + R(0.025));
      ctx.lineTo(x, y - R(0.13) * SQ * pul);
      ctx.stroke();
      ctx.setLineDash([]);
      rr(ctx, lx - tw / 2, ly - R(0.025), tw, R(0.05), R(0.025));
      fs(ctx, '#ffe04a', 2, '#8a5a00');
      ctx.fillStyle = '#4a2a00';
      ctx.textAlign = 'center';
      ctx.fillText(`NEW ${s.spot.label}`, lx, ly + 1, tw - 6);
      ctx.restore();
    }
  }
  // 화면 밖 경쟁자 표시
  if (!s.wait)
    for (const f of s.frogs) {
      if (f.i === 0 || f.st === DONE) continue;
      const x = X(f.u);
      if (x > -R(0.02) && x < w + R(0.02)) continue;
      const right = x >= w, ax = right ? w - R(0.035) : R(0.035), ay = clamp(Y(f.v) - R(0.05), R(HB + 0.05), R(NB - 0.03));
      ell(ctx, ax, ay, R(0.026), R(0.026));
      fs(ctx, LOOKS[f.i].body, 2, LOOKS[f.i].dark);
      ctx.beginPath();
      const sg = right ? 1 : -1;
      ctx.moveTo(ax + sg * R(0.032), ay - R(0.012));
      ctx.lineTo(ax + sg * R(0.05), ay);
      ctx.lineTo(ax + sg * R(0.032), ay + R(0.012));
      ctx.closePath();
      fs(ctx, LOOKS[f.i].dark);
      ell(ctx, ax - R(0.008), ay - R(0.006), R(0.007), R(0.007));
      ell(ctx, ax + R(0.008), ay - R(0.006), R(0.007), R(0.007));
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }

  // ═════════════ 아래 띠: 순위 · 경주 길 · 별 · 안내 ═════════════
  {
    const ty = R(GB);
    ctx.fillStyle = lin(ctx, 0, ty, 0, h, [0, '#fbe6b8'], [1, '#eccb8a']);
    rr(ctx, 0, ty, w, h - ty + 4, R(0.025));
    ctx.fill();
    ctx.strokeStyle = 'rgba(150,100,40,.25)';
    ctx.lineWidth = 1;
    for (let j = 1; j < 4; j++) {
      ctx.beginPath();
      ctx.moveTo(0, ty + j * R(0.05));
      ctx.lineTo(w, ty + j * R(0.05));
      ctx.stroke();
    }
    ctx.fillStyle = '#4fa040';
    ctx.fillRect(0, ty, w, 3);
    // 순위
    const r1 = ty + R(0.045);
    const order = [...s.frogs].sort((a, b) => (a.st === DONE ? 10 + 5 - a.fin : a.u) > (b.st === DONE ? 10 + 5 - b.fin : b.u) ? -1 : 1);
    const myRank = s.wait ? 0 : s.phase === 'result' && s.rank ? s.rank : order.indexOf(me) + 1;
    {
      const bx = R(0.075);
      const pop = t - (fx.memo.rankT ?? -99) < 10 ? 1.25 - (t - fx.memo.rankT) / 40 : 1;
      if (fx.memo.myRank !== myRank) {
        if (fx.memo.myRank !== undefined && myRank < fx.memo.myRank && !s.wait) fx.pop(X(me.u), Y(me.v) - R(0.2), '추월!', '#ffe066', 20);
        fx.memo.myRank = myRank;
        fx.memo.rankT = t;
      }
      ctx.save();
      ctx.translate(bx, r1);
      ctx.scale(pop, pop);
      ell(ctx, 0, 0, R(0.055), R(0.035));
      fs(ctx, myRank === 1 ? lin(ctx, 0, -R(0.035), 0, R(0.035), [0, '#fff3a0'], [1, '#f0b020']) : lin(ctx, 0, -R(0.035), 0, R(0.035), [0, '#ffffff'], [1, '#d8e8e0']), 2, myRank === 1 ? '#9a6a00' : '#4a6a5a');
      font(0.042, 900);
      ctx.textAlign = 'center';
      ctx.fillStyle = myRank === 1 ? '#7a4a00' : '#2a4a3a';
      ctx.fillText(myRank ? RANK_TXT[myRank] : '준비', 0, 1);
      ctx.restore();
    }
    // 경주 길
    {
      const gx = R(0.16), gw = w - R(0.22), gy = r1;
      rr(ctx, gx, gy - R(0.012), gw, R(0.024), R(0.012));
      fs(ctx, lin(ctx, 0, gy - R(0.012), 0, gy + R(0.012), [0, '#7ad8e0'], [1, '#3ab0c8']), 1.5, '#2a7a8a');
      // 출발 깃발 · 결승 연꽃
      ctx.fillStyle = '#ff6a5a';
      ctx.beginPath();
      ctx.moveTo(gx + 2, gy - R(0.03));
      ctx.lineTo(gx + R(0.03), gy - R(0.022));
      ctx.lineTo(gx + 2, gy - R(0.012));
      ctx.closePath();
      ctx.fill();
      drawLotus(ctx, gx + gw + R(0.005), gy + R(0.012), R(0.032), t, 0.5);
      for (const f of [...s.frogs].reverse()) {
        const k = clamp(f.st === DONE ? 1 : f.u / d.L, 0, 1), fx2 = gx + k * gw, fy = gy - (f.i === 0 ? 0 : (f.i - 2) * R(0.004));
        const rr2 = R(f.i === 0 ? 0.024 : 0.018);
        ell(ctx, fx2, fy, rr2, rr2);
        fs(ctx, LOOKS[f.i].body, 2, f.i === 0 ? '#a81e1e' : LOOKS[f.i].dark);
        ell(ctx, fx2 - rr2 * 0.35, fy - rr2 * 0.3, rr2 * 0.28, rr2 * 0.28);
        ell(ctx, fx2 + rr2 * 0.35, fy - rr2 * 0.3, rr2 * 0.28, rr2 * 0.28);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        if (f.st === SWIM) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ell(ctx, fx2, fy + rr2 * 0.6, rr2 * 1.2, rr2 * 0.4);
          ctx.stroke();
        }
      }
    }
    // 별 줄 (쉬운 말)
    const r2 = ty + R(0.105);
    {
      const labels = d.stars.map((q, j) => {
        const now = starNow(s, q);
        return q.label + (j > 1 && now > 0 && now < q.n && s.phase === 'play' && q.n > 1 ? ` ${now}/${q.n}` : '');
      });
      const live = d.stars.map((q) => (q.k === 'finish' || q.k === 'rank1' ? false : q.k === 'dry' || q.k === 'noheron' ? false : starMet(s, q)));
      const ok = s.phase === 'result' && s.ok ? s.starOk : live;
      const bad = d.stars.map((q) => (q.k === 'dry' && s.swet > 0) || (q.k === 'noheron' && s.snatched > 0));
      font(0.033, 800);
      const ws = labels.map((l) => ctx.measureText(l).width + R(0.065));
      const gap = R(0.012), tot = ws.reduce((a2, b2) => a2 + b2, 0) + gap * (ws.length - 1), scale = Math.min(1, (w - R(0.03)) / tot);
      let xx = (w - tot * scale) / 2;
      for (let j = 0; j < labels.length; j++) {
        const pw = ws[j] * scale;
        rr(ctx, xx, r2 - R(0.026), pw, R(0.052), R(0.026));
        fs(ctx, ok[j] ? 'rgba(255,214,60,.45)' : bad[j] ? 'rgba(120,80,40,.15)' : 'rgba(255,255,255,.6)', 1.4, ok[j] ? '#c08a00' : bad[j] ? 'rgba(120,80,40,.25)' : 'rgba(140,100,50,.45)');
        starPath(ctx, xx + R(0.025) * scale + 2, r2, R(0.015));
        fs(ctx, ok[j] ? '#ffc93a' : bad[j] ? 'rgba(120,80,40,.25)' : 'rgba(180,140,80,.6)', 1, ok[j] ? '#9a6a00' : 'rgba(120,80,40,.4)');
        ctx.textAlign = 'left';
        ctx.fillStyle = ok[j] ? '#6a4200' : bad[j] ? 'rgba(90,60,30,.45)' : '#5a3a1a';
        font(0.033, 800);
        ctx.fillText(labels[j], xx + R(0.05) * scale, r2 + 1, pw - R(0.058) * scale);
        xx += pw + gap * scale;
      }
    }
    // 안내 한 줄
    {
      let hint = d.hint;
      const first = s.wait && s.stage === 0 && !s.again;
      if (first) hint = '👆 꾹 누르면 웅크리고, 떼면 폴짝!';
      else if (s.wait) hint = '👆 꾹 누르면 출발!';
      else if (me.st === SIT && me.hold > 0 && s.phase === 'play') hint = preview && preview.L.k === 'water' ? '고리가 빨개요 — 조금 더 / 덜 모아요' : '고리가 초록일 때 떼요!';
      else if (me.st === SWIM && s.phase === 'play') hint = '허우적… 잎으로 올라가는 중';
      else if (s.phase === 'result') hint = s.ok ? (s.won ? '모든 판 우승!' : `★ ${s.got}개! 다음 판엔 새것이 나와요`) : '경쟁자 옆에 내리면 물결로 빠뜨려요';
      font(first ? 0.04 : 0.035, 900);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.fillStyle = first ? '#1e5a36' : '#5a3a1a';
      ctx.fillText(hint, w / 2, ty + R(0.163), w - R(0.04));
    }
  }
  void A;
  void NAMES;
}
const j0 = (rp: Ripple) => rp.big;

interface Preview { L: Land; D: number; c: number }
function previewOf(s: FrogState, me: Frog): Preview | null {
  if (s.phase !== 'play' || s.wait || me.st !== SIT || me.rec > 0) return null;
  if (me.hold <= 0) return null;
  const c = chOf(me.hold), D = distOf(c), tl = s.t + flightT(D);
  const L = landAt(s, me.u + D, me.v, tl, STAGES[s.stage].assist, me.u);
  return { L, D, c };
}
