/**
 * 🍡 꼬치 꿰기 포장마차 (44라운드 손맛 장난감 · 긋기 실험) — 한 화면 · 한 동작(쓱 긋기) · 하루 58초.
 * 불판에서 재료가 '퐁퐁' 튀어 오른다. 손가락으로 쓱 그으면 그은 선이 그대로 대나무 꼬치가 되고,
 *   선이 스친 재료가 손가락이 지나간 순서대로 쏙쏙쏙 꿰인다(하나마다 음이 올라감). 긋는 동안 세상이 느려진다.
 * 떼면 꼬치가 착 펴지며 점수가 터지고, 불판에 올라가 지글지글 → 말풍선 재료가 다 꿰인 손님이 받아 가 펄쩍.
 *   길게 꿸수록 뒤 재료일수록 점수가 커지고(+10 +15 +20 …), 같은 재료 셋이면 ×2, 빨간 고추는 매워서 ×½, 탄 것은 깎임.
 * 판 = 장사 하루(58초 — 계기판 3분 안에 사흘째까지). 끝나면 점수·최고 기록·새 재료 풀림, 톡 하면 다음 날. 이레 동안 새것 여섯:
 *   새우(높이 뜀) → 파인애플(달콤 ×1.5) → 마시멜로(불판에서 부풀어 펑) → 대왕 소시지(두 칸) → 단골 곰(큰 주문) → 황금 메추리알(×2).
 * 정답 없음 · 기다림 없음 · 잃는 것 없음: 어떻게 그어도 무언가 꿰이고, 아무것도 안 꿰여도 휙 소리와 함께 꼬치가 날아간다.
 * 키보드: 1·2·3 = 가장 많이 꿰이는 선으로 자동 긋기 · 스페이스를 누른 채 화살표 = 직접 긋기.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5, TAU = Math.PI * 2;
/** 화면 단위: 가로 폭 = 1, 세로 0~A. 카운터 윗면 · 작업대 시작 · 불판 윗면(재료가 튀어 오르는 곳) · 불판 앞 */
const COUNTER_Y = 0.43, AIR_TOP = 0.47, GRILL_Y = 1.27, GRILL_B = 1.455;
/** 불판 위 꼬치 자리(줄) · 손님 자리 · 손님 머리 · 말풍선 */
const RACK_Y = [1.312, 1.362, 1.412];
const CUST_X = [0.18, 0.5, 0.82], CUST_Y = 0.322, BUB_Y = 0.168;
/** 하루 · 날 수 · 결과 화면(톡 받기 시작 · 저절로 넘어감) */
const DAY_T = 58 * 60, DAYS = 7, RES_MIN = 66, RES_AUTO = 60 * 14;
/** 긋는 동안 세상 빠르기 · 한 획 최대 틱 · 꼬치 칸 · 판정 여유(재료 반지름에 더함) · 첫 꼬치 자석 · 중력(틱²) */
const SLOW = 0.3, STROKE_MAX = 100, CAP = 8, HIT = 0.04, GRAV = 0.0005;
/** 꼬치가 펴짐 · 불판에 착 · 손님에게 날아감 · 받음 (틱) */
/** 곧게 편 꼬치에서 재료 사이 (반지름 배) */
const SPACE = 1.5;
const T_STRAIGHT = 9, T_LAND = 20, T_GIVE = 40, T_DELIV = 54;
const ORDER_PTS = 80, BEAR_MUL = 2.5, MALLOW_PTS = 20, BURNT_PTS = 15;
/** 손님: 지루해서 떠남 · 들어옴 · 나감 · 기뻐함 · 빈자리 */
const BORED_T = 60 * 24, CUST_IN = 26, CUST_OUT = 24, HAPPY_T = 66, CUST_GAP = 12;

// ───────────────────────────── 재료 ─────────────────────────────
export type IK = 'tteok' | 'saus' | 'leek' | 'shrimp' | 'pine' | 'mallow' | 'big' | 'egg' | 'chili' | 'burnt';
interface IKDef { name: string; base: number; r: number; slots: number; grav: number; col: string; bad?: boolean }
export const IKD: Record<IK, IKDef> = {
  tteok: { name: '떡', base: 10, r: 0.065, slots: 1, grav: 1, col: '#fff3d6' },
  saus: { name: '소시지', base: 15, r: 0.065, slots: 1, grav: 1, col: '#e8553e' },
  leek: { name: '파', base: 10, r: 0.062, slots: 1, grav: 1, col: '#7ccf52' },
  shrimp: { name: '새우', base: 25, r: 0.065, slots: 1, grav: 1.25, col: '#ff8a4c' },
  pine: { name: '파인애플', base: 15, r: 0.065, slots: 1, grav: 1, col: '#ffd23f' },
  mallow: { name: '마시멜로', base: 12, r: 0.065, slots: 1, grav: 0.55, col: '#fff0f6' },
  big: { name: '대왕 소시지', base: 40, r: 0.088, slots: 2, grav: 1.3, col: '#d2452f' },
  egg: { name: '황금 메추리알', base: 30, r: 0.055, slots: 1, grav: 1.15, col: '#ffd84a' },
  chili: { name: '매운 고추', base: 0, r: 0.061, slots: 1, grav: 1, col: '#ff3b30', bad: true },
  burnt: { name: '탄 것', base: 0, r: 0.064, slots: 1, grav: 1, col: '#3a3030', bad: true },
};
export type CK = 'cat' | 'dog' | 'bunny' | 'peng' | 'fox' | 'bear';
export const CKN: Record<CK, string> = { cat: '고양이', dog: '강아지', bunny: '토끼', peng: '펭귄', fox: '여우', bear: '단골 곰' };

/** 날마다: 새것 · 나오는 재료 · 피할 것과 비율 · 주문 길이 · 손님 · 곰 비율 · 황금알 비율 · 별(손님 수 · 한 꼬치 개수) */
interface DayDef { add: IK | CK | null; pool: IK[]; haz: IK[]; hazP: number; ord: [number, number]; cust: CK[]; bear: number; egg: number; s2: number; s3: number }
const BASE: IK[] = ['tteok', 'saus', 'leek'];
export const DAYDEF: DayDef[] = [
  { add: null, pool: BASE, haz: [], hazP: 0, ord: [2, 3], cust: ['cat', 'dog', 'bunny'], bear: 0, egg: 0, s2: 8, s3: 5 },
  { add: 'shrimp', pool: [...BASE, 'shrimp'], haz: ['chili'], hazP: 0.07, ord: [2, 3], cust: ['cat', 'dog', 'bunny', 'peng'], bear: 0, egg: 0, s2: 10, s3: 5 },
  { add: 'pine', pool: ['tteok', 'saus', 'shrimp', 'pine'], haz: ['chili'], hazP: 0.08, ord: [2, 3], cust: ['cat', 'dog', 'bunny', 'peng', 'fox'], bear: 0, egg: 0, s2: 17, s3: 6 },
  { add: 'mallow', pool: ['tteok', 'leek', 'pine', 'mallow'], haz: ['chili', 'burnt'], hazP: 0.1, ord: [2, 4], cust: ['cat', 'dog', 'bunny', 'peng', 'fox'], bear: 0, egg: 0, s2: 12, s3: 6 },
  { add: 'big', pool: ['saus', 'leek', 'mallow', 'big'], haz: ['chili', 'burnt'], hazP: 0.1, ord: [3, 4], cust: ['cat', 'dog', 'bunny', 'peng', 'fox'], bear: 0, egg: 0, s2: 9, s3: 6 },
  { add: 'bear', pool: ['tteok', 'saus', 'shrimp', 'pine'], haz: ['chili', 'burnt'], hazP: 0.11, ord: [3, 4], cust: ['cat', 'dog', 'bunny', 'peng', 'fox'], bear: 0.3, egg: 0, s2: 9, s3: 7 },
  { add: 'egg', pool: ['tteok', 'saus', 'shrimp', 'mallow'], haz: ['chili', 'burnt'], hazP: 0.11, ord: [3, 4], cust: ['cat', 'dog', 'bunny', 'peng', 'fox'], bear: 0.3, egg: 0.05, s2: 7, s3: 7 },
];
export const addName = (a: IK | CK | null) => (a ? (a in IKD ? IKD[a as IK].name : CKN[a as CK]) : '');

// ───────────────────────────── 상태 ─────────────────────────────
interface P { x: number; y: number }
/** 공중 재료: 기다림(발사 전) · 맴돎(첫 물결은 꼭대기에서 잠깐 둥실) · 첫 물결인가 · 오늘의 새것인가 */
interface It { id: number; k: IK; x: number; y: number; vx: number; vy: number; rot: number; vr: number; born: number; wait: number; hover: number; wel: boolean; nw: boolean }
/** 꿰인 재료: 꿰인 자리 · 원래 자리(쏙 빨려 드는 그림) · 꿰인 틱 · 이 재료가 준 점수 */
interface Sk { id: number; k: IK; x: number; y: number; fx: number; fy: number; at: number; rot: number; pts: number }
interface Stroke { pts: P[]; tip: P; on: Sk[]; t0: number; slots: number; mag: boolean; trip: boolean }
/** 다 꿰인 꼬치: 곧게 편 선(가운데·각도·길이) · 불판 줄 · 받을 손님 · 점수 */
interface Done { id: number; on: Sk[]; cx: number; cy: number; ang: number; len: number; row: number; cust: number; val: number; t: number; mallow: number; chili: boolean; done: boolean }
type CSt = 'in' | 'wait' | 'res' | 'happy' | 'out';
interface Cust { id: number; k: CK; ord: IK[]; st: CSt; t: number; res: number; spicy: boolean; got: IK[]; bonus: number; bored: boolean }
interface Ev { id: number; t: number; k: string; x: number; y: number; n: number; v: number; a: string }
export interface SkewerState {
  rng: Rng; seed: number; t: number; day: number; dt: number; phase: 'day' | 'result' | 'end'; pt: number;
  items: It[]; stroke: Stroke | null; done: Done[]; cust: (Cust | null)[]; gap: number[];
  nid: number; spawnT: number; ws: number; down: boolean;
  auto: { x0: number; y0: number; x1: number; y1: number; n: number; i: number } | null;
  dayScore: number; total: number; best: number; record: boolean; served: number; maxN: number; strokes: number; dayStrokes: number;
  got: number; stars: boolean[]; firstStroke: boolean; dayFirst: boolean; final: boolean;
  seen: Set<string>; wowN: number; ev: Ev[]; evN: number; dead: boolean;
  dayScores: number[]; miss: { pts: P[]; t: number } | null; bigSk: number; lastSk: number; hold: number; lastX?: number;
}
type S = SkewerState;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function ev(s: S, k: string, x: number, y: number, n = 0, v = 0, a = '') {
  s.ev.push({ id: ++s.evN, t: s.t, k, x, y, n, v, a });
}
function see(s: S, key: string) {
  if (s.seen.has(key)) return false;
  s.seen.add(key);
  return true;
}
function wow(s: S) {
  s.wowN++;
}
/** k번째 칸(1부터)의 재료 점수: 뒤로 갈수록 +50%씩 */
const slotPts = (k: IK, slot: number) => Math.round(IKD[k].base * (1 + 0.5 * (slot - 1)));

export interface Val { val: number; n: number; triple: boolean; pine: boolean; egg: boolean; chili: number; burnt: number; mallow: number; big: boolean }
/** 꼬치 점수: 칸마다 점수 합 → 같은 재료 셋 ×2 · 파인애플 ×1.5 · 황금알 ×2 · 고추 ×½ · 탄 것 −15 */
export function value(kinds: IK[]): Val {
  let v = 0, slot = 0, chili = 0, burnt = 0, mallow = 0, pine = false, egg = false, big = false;
  const cnt = new Map<IK, number>();
  for (const k of kinds) {
    const d = IKD[k];
    slot++;
    if (k === 'chili') chili++;
    else if (k === 'burnt') burnt++;
    else v += slotPts(k, slot);
    slot += d.slots - 1;
    cnt.set(k, (cnt.get(k) ?? 0) + 1);
    if (k === 'pine') pine = true;
    if (k === 'egg') egg = true;
    if (k === 'big') big = true;
    if (k === 'mallow') mallow++;
  }
  let triple = false;
  for (const [k, c] of cnt) if (!IKD[k].bad && c >= 3) triple = true;
  if (triple) v *= 2;
  if (pine) v *= 1.5;
  if (egg) v *= 2;
  if (chili) v *= 0.5;
  v -= burnt * BURNT_PTS;
  return { val: Math.max(0, Math.round(v / 5) * 5), n: kinds.length, triple, pine, egg, chili, burnt, mallow, big };
}
/** 꼬치가 주문을 다 담았나 (순서 상관없이, 더 꿰여 있어도 된다) */
export function covers(kinds: IK[], ord: IK[]) {
  const left = new Map<IK, number>();
  for (const k of kinds) left.set(k, (left.get(k) ?? 0) + 1);
  for (const k of ord) {
    const n = left.get(k) ?? 0;
    if (n <= 0) return false;
    left.set(k, n - 1);
  }
  return true;
}
/** 주문 칸마다 지금 꼬치로 채워졌나 (말풍선 불 켜기) */
export function lit(kinds: IK[], ord: IK[]): boolean[] {
  const left = new Map<IK, number>();
  for (const k of kinds) left.set(k, (left.get(k) ?? 0) + 1);
  return ord.map((k) => {
    const n = left.get(k) ?? 0;
    if (n > 0) left.set(k, n - 1);
    return n > 0;
  });
}
const orderBonus = (c: Cust) => Math.round((ORDER_PTS * c.ord.length * (c.k === 'bear' ? BEAR_MUL : 1)) / 5) * 5;
const openCust = (c: Cust | null): c is Cust => !!c && (c.st === 'wait' || c.st === 'in');

// ───────────────────────────── 재료 튀어 오르기 ─────────────────────────────
/** 재료마다 뛰는 높이: 새우는 펄쩍 높이 · 대왕 소시지는 묵직하게 낮게 */
const APEX: Partial<Record<IK, number>> = { shrimp: -0.14, big: 0.08, egg: -0.06 };
function launch(s: S, k: IK, x: number, apex: number, tx = x, wait = 0, hover = 0, wel = false): It {
  const apexY = wel ? apex : clamp(apex + (APEX[k] ?? 0), 0.52, 1.02);
  const g = GRAV * IKD[k].grav, h = Math.max(0.08, GRILL_Y - apexY), vy = -Math.sqrt(2 * g * h), T = -vy / g;
  const nw = DAYDEF[s.day].add === k && s.dt < 60 * 30;
  const it: It = { id: ++s.nid, k, x, y: GRILL_Y + 0.01, vx: (tx - x) / T, vy, rot: (s.rng() - 0.5) * 0.8, vr: (s.rng() - 0.5) * 0.07, born: s.t, wait, hover, wel, nw };
  s.items.push(it);
  return it;
}
function wants(s: S): IK[] {
  const out: IK[] = [];
  for (const c of s.cust) if (openCust(c)) out.push(...c.ord);
  return out;
}
function pickType(s: S): IK {
  const d = DAYDEF[s.day], r = s.rng();
  if (d.hazP && s.dt > 60 * 5 && r < d.hazP) return d.haz[Math.floor(s.rng() * d.haz.length)];
  if (d.egg && r < d.hazP + d.egg) return 'egg';
  const add = d.add && d.add in IKD ? (d.add as IK) : null;
  if (add && s.dt < 60 * 25 && s.rng() < 0.3) return add;
  const w = wants(s);
  if (w.length && s.rng() < 0.4) return w[Math.floor(s.rng() * w.length)];
  return d.pool[Math.floor(s.rng() * d.pool.length)];
}
/** 한 번 '퐁': 작은 묶음(가로 셋 · 비스듬히 셋 · 부채 · 줄줄이 · 둘 · 높이 하나)이 판 여기저기서 쉬지 않고 올라온다.
 *  한 묶음만 그으면 2~4개 — 긴 꼬치는 여러 묶음을 한 획에 이어야 나온다 */
function burst(s: S) {
  const r = s.rng(), R = () => s.rng();
  let shape = 'row';
  if (r < 0.22) shape = 'row';
  else if (r < 0.44) shape = 'stair';
  else if (r < 0.6) shape = 'fan';
  else if (r < 0.76) shape = 'chain';
  else if (r < 0.92) shape = 'pair';
  else shape = 'high';
  // 지난 묶음과 다른 쪽에서 (판 전체를 쓰게)
  const side = (s.lastX ?? 0.5) < 0.5 ? 0.55 + R() * 0.3 : 0.15 + R() * 0.3, y = 0.54 + R() * 0.44;
  s.lastX = side;
  if (shape === 'row') {
    const n = 3;
    for (let i = 0; i < n; i++) {
      const x = clamp(side + (i - 1) * 0.15, 0.08, 0.92);
      launch(s, pickType(s), x, y + (R() - 0.5) * 0.03, x, 0);
    }
  } else if (shape === 'stair') {
    const up = R() < 0.5;
    for (let i = 0; i < 3; i++) {
      const x = clamp(side + (i - 1) * 0.14, 0.08, 0.92);
      launch(s, pickType(s), x, clamp(y + (i - 1) * (up ? -0.09 : 0.09), 0.53, 1.0), x, 0);
    }
  } else if (shape === 'fan') {
    const n = 3;
    for (let i = 0; i < n; i++) launch(s, pickType(s), side, clamp(y + Math.abs(i - 1) * 0.05, 0.53, 1.0), clamp(side + 0.16 * (i - 1), 0.08, 0.92), i * 2);
  } else if (shape === 'chain') {
    const n = 3 + Math.floor(R() * 2), left = side < 0.5, x = left ? 0.06 : 0.94, tx = left ? side + 0.15 : side - 0.15;
    for (let i = 0; i < n; i++) launch(s, pickType(s), x, y, tx, i * 6);
  } else if (shape === 'pair') {
    launch(s, pickType(s), side - 0.07, y, side - 0.08, 0);
    launch(s, pickType(s), side + 0.07, y + 0.02, side + 0.08, 3);
  } else {
    launch(s, pickType(s), side, 0.55 + R() * 0.1, side + (R() - 0.5) * 0.2, 0);
  }
  ev(s, 'burst', 0.5, GRILL_Y, 0, 0, shape);
}
/** 하루의 첫 물결: 다섯 개가 꼭대기에서 둥실 — 손가락 그림이 그 줄을 쓱 긋는다. 가운데 손님 주문은 이 물결로 채워진다 */
function welcomeKinds(s: S): IK[] {
  const add = DAYDEF[s.day].add;
  const nw: IK = add && add in IKD ? (add as IK) : 'tteok';
  const pool = DAYDEF[s.day].pool.filter((k) => k !== nw && k !== 'big');
  const a = pool[Math.floor(s.rng() * pool.length)], b = pool[Math.floor(s.rng() * pool.length)];
  return nw === 'big' ? ['saus', 'big', a, 'big', b] : [nw, a, nw, b, nw];
}
function welcome(s: S, kinds: IK[]) {
  for (let i = 0; i < kinds.length; i++) {
    const x = 0.14 + i * 0.18, y = 0.78 - 0.06 * Math.sin((Math.PI * i) / (kinds.length - 1));
    launch(s, kinds[i], x, y, x, i * 4, s.day === 0 ? 170 : 120, true);
  }
}
function welcomeOrder(kinds: IK[]): IK[] {
  return kinds[1] === 'big' ? ['big', 'big', 'saus'] : [kinds[0], kinds[2], kinds[1]];
}

// ───────────────────────────── 손님 ─────────────────────────────
function newCust(s: S, slot: number, ord?: IK[], st: CSt = 'in'): Cust {
  const d = DAYDEF[s.day];
  const others = new Set(s.cust.filter((c, i) => c && i !== slot).map((c) => c!.k));
  let k: CK = d.cust[Math.floor(s.rng() * d.cust.length)];
  for (let n = 0; n < 6 && others.has(k); n++) k = d.cust[Math.floor(s.rng() * d.cust.length)];
  if (d.bear && !others.has('bear') && s.rng() < d.bear) k = 'bear';
  if (!ord) {
    const len = k === 'bear' ? 5 : d.ord[0] + Math.floor(s.rng() * (d.ord[1] - d.ord[0] + 1));
    const pool = d.pool.filter((q) => q !== 'big' || s.rng() < 0.5);
    ord = [];
    for (let i = 0; i < len; i++) ord.push(i && s.rng() < 0.35 ? ord[i - 1] : pool[Math.floor(s.rng() * pool.length)]);
    ord.sort((a, b) => Object.keys(IKD).indexOf(a) - Object.keys(IKD).indexOf(b));
  }
  if (see(s, 'c:' + k)) ev(s, 'newcust', CUST_X[slot], CUST_Y, slot, 0, k);
  return { id: ++s.nid, k, ord, st, t: st === 'wait' ? Math.floor(s.rng() * 200) : 0, res: -1, spicy: false, got: [], bonus: 0, bored: false };
}
function custStep(s: S) {
  for (let i = 0; i < 3; i++) {
    const c = s.cust[i];
    if (!c) {
      if (--s.gap[i] <= 0) s.cust[i] = newCust(s, i);
      continue;
    }
    c.t++;
    if (c.st === 'in' && c.t >= CUST_IN) (c.st = 'wait'), (c.t = 0);
    else if (c.st === 'wait' && c.t >= BORED_T) (c.st = 'out'), (c.t = 0), (c.bored = true), ev(s, 'bored', CUST_X[i], CUST_Y, i);
    else if (c.st === 'happy' && c.t >= HAPPY_T) (c.st = 'out'), (c.t = 0);
    else if (c.st === 'out' && c.t >= CUST_OUT) (s.cust[i] = null), (s.gap[i] = CUST_GAP);
  }
}

// ───────────────────────────── 긋기 ─────────────────────────────
function startStroke(s: S, p: P) {
  s.stroke = { pts: [{ ...p }], tip: { ...p }, on: [], t0: s.t, slots: 0, mag: !s.firstStroke, trip: false };
  s.strokes++;
  s.dayStrokes++;
  ev(s, 'press', p.x, p.y);
  sweep(s, p, p);
}
function skewer(s: S, it: It, cx: number, cy: number) {
  const st = s.stroke!, d = IKD[it.k];
  if (st.slots + d.slots > CAP) return;
  s.items.splice(s.items.indexOf(it), 1);
  const pts = d.bad ? 0 : slotPts(it.k, st.slots + 1);
  st.on.push({ id: it.id, k: it.k, x: cx, y: cy, fx: it.x, fy: it.y, at: s.t, rot: it.rot, pts });
  st.slots += d.slots;
  s.lastSk = s.t;
  ev(s, 'sk', cx, cy, st.on.length, pts, it.k);
  if (!d.bad && !st.trip && st.on.filter((o) => o.k === it.k).length === 3) (st.trip = true), ev(s, 'trip', cx, cy, st.on.length, 0, it.k);
  if (it.k === 'chili' && see(s, 'chili')) ev(s, 'first', cx, cy, 0, 0, 'chili');
  if (it.k === 'burnt' && see(s, 'burnt')) ev(s, 'first', cx, cy, 0, 0, 'burnt');
  if (st.slots >= CAP) finishStroke(s);
}
/** 선분 a→b에 닿은 공중 재료를 선을 따라 순서대로 꿴다 (재료 반지름 + 넉넉한 여유) */
function sweep(s: S, a: P, b: P) {
  const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy;
  const hits: { it: It; u: number; cx: number; cy: number }[] = [];
  for (const it of s.items) {
    if (it.wait > 0) continue;
    const u = L2 > 1e-9 ? clamp(((it.x - a.x) * dx + (it.y - a.y) * dy) / L2, 0, 1) : 0;
    const cx = a.x + dx * u, cy = a.y + dy * u;
    // 첫 꼬치는 첫 물결 재료를 더 넓게(자석) 잡는다
    const extra = s.stroke && s.stroke.mag && it.wel ? 0.1 : 0;
    if (Math.hypot(it.x - cx, it.y - cy) <= IKD[it.k].r + HIT + extra) hits.push({ it, u, cx, cy });
  }
  hits.sort((p, q) => p.u - q.u);
  for (const h of hits) if (s.stroke) skewer(s, h.it, h.cx, h.cy);
}
function moveStroke(s: S, p: P) {
  const st = s.stroke!;
  sweep(s, st.tip, p);
  if (!s.stroke) return;
  st.tip = { ...p };
  const last = st.pts[st.pts.length - 1];
  if (Math.hypot(p.x - last.x, p.y - last.y) > 0.008 && st.pts.length < 160) st.pts.push({ ...p });
}
/** 첫 꼬치는 자석: 떼는 순간 남은 첫 물결 재료가 제자리에서 꼬치로 쏙쏙 날아와 꿰인다 (처음 하는 사람도 첫 획이 가장 시원하게) */
function magnet(s: S) {
  const rest = s.items.filter((it) => it.wel).sort((a, b) => a.x - b.x);
  for (const it of rest) if (s.stroke) skewer(s, it, it.x, it.wait > 0 ? GRILL_Y - 0.05 : it.y);
}
function finishStroke(s: S) {
  const st = s.stroke;
  if (!st) return;
  if (st.mag) magnet(s);
  s.stroke = null;
  s.firstStroke = true;
  s.dayFirst = true;
  if (!st.on.length) {
    s.miss = { pts: st.pts.length > 1 ? st.pts : [st.tip, { x: st.tip.x + 0.05, y: st.tip.y }], t: s.t };
    ev(s, 'miss', st.tip.x, st.tip.y);
    return;
  }
  const kinds = st.on.map((o) => o.k), V = value(kinds);
  // 꿴 만큼 불판이 바로 다시 퐁 (바로 이어 그어도 늘 꿸 게 있다)
  s.spawnT = Math.min(s.spawnT, 6);
  // 곧게 편 꼬치: 첫 재료 → 마지막 재료 방향 (하나뿐이면 그은 방향)
  const f = st.on[0], l = st.on[st.on.length - 1];
  let ang = Math.atan2(l.y - f.y, l.x - f.x);
  if (Math.hypot(l.x - f.x, l.y - f.y) < 0.03) {
    const p0 = st.pts[0], p1 = st.tip;
    ang = Math.hypot(p1.x - p0.x, p1.y - p0.y) > 0.02 ? Math.atan2(p1.y - p0.y, p1.x - p0.x) : 0;
  }
  let len = 0;
  for (const o of st.on) len += IKD[o.k].r * SPACE;
  let cx = 0, cy = 0;
  for (const o of st.on) (cx += o.x), (cy += o.y);
  cx /= st.on.length;
  cy /= st.on.length;
  {
    const hx = Math.abs(Math.cos(ang)) * (len / 2 + 0.08), hy = Math.abs(Math.sin(ang)) * (len / 2 + 0.08);
    cx = clamp(cx, Math.min(0.5, hx + 0.01), Math.max(0.5, 0.99 - hx));
    cy = clamp(cy, Math.min(0.85, AIR_TOP + hy), Math.max(0.85, GRILL_Y - hy));
  }
  // 받을 손님: 주문을 다 담은 손님 중 주문이 가장 긴(같으면 오래 기다린) 손님
  let ci = -1, bl = 0, bt = -1;
  for (let i = 0; i < 3; i++) {
    const c = s.cust[i];
    if (!openCust(c) || !covers(kinds, c.ord)) continue;
    const L = c.ord.length * (c.k === 'bear' ? 2 : 1);
    if (L > bl || (L === bl && c.t > bt)) (ci = i), (bl = L), (bt = c.t);
  }
  const used = new Set(s.done.filter((d) => d.t < T_GIVE).map((d) => d.row));
  let row = 0;
  for (let r = 0; r < RACK_Y.length; r++) if (!used.has(r)) { row = r; break; }
  const d: Done = { id: ++s.nid, on: st.on, cx, cy, ang, len, row, cust: ci, val: V.val, t: 0, mallow: V.mallow, chili: V.chili > 0, done: false };
  if (ci >= 0) (s.cust[ci]!.st = 'res'), (s.cust[ci]!.res = d.id);
  s.done.push(d);
  s.dayScore += V.val;
  s.total += V.val;
  s.maxN = Math.max(s.maxN, V.n);
  s.bigSk = Math.max(s.bigSk, V.n);
  const flags = (V.triple ? 't' : '') + (V.pine ? 'p' : '') + (V.egg ? 'e' : '') + (V.chili ? 'c' : '') + (V.burnt ? 'b' : '') + (ci >= 0 ? 'm' : '') + (st.slots >= CAP ? 'f' : '');
  ev(s, 'done', cx, cy, V.n, V.val, flags);
  if (V.triple && see(s, 'triple')) ev(s, 'first', cx, cy, 0, 0, 'triple');
  if (V.n >= 6) see(s, 'big6');
  if (ci >= 0) see(s, 'match');
  if (V.n >= 5 || V.triple || ci >= 0) wow(s);
  s.hold = V.n >= 6 ? 8 : V.n >= 4 ? 4 : 0;
}
function startAuto(s: S) {
  const L = bestLine(s, 3);
  if (!L) return;
  const n = Math.max(4, Math.ceil(Math.hypot(L.x1 - L.x0, L.y1 - L.y0) / 0.04));
  s.auto = { x0: L.x0, y0: L.y0, x1: L.x1, y1: L.y1, n, i: 0 };
}
function autoStep(s: S) {
  const a = s.auto!, f = a.i / a.n, p = { x: a.x0 + (a.x1 - a.x0) * f, y: a.y0 + (a.y1 - a.y0) * f };
  if (a.i === 0) startStroke(s, p);
  else if (s.stroke) moveStroke(s, p);
  if (++a.i > a.n || !s.stroke) (s.auto = null), finishStroke(s);
}

// ───────────────────────────── 하루 ─────────────────────────────
function deliver(s: S, d: Done) {
  d.done = true;
  const c = d.cust >= 0 ? s.cust[d.cust] : null;
  if (c && c.res === d.id) {
    const b = Math.round((orderBonus(c) * (d.chili ? 0.5 : 1)) / 5) * 5;
    c.st = 'happy';
    c.t = 0;
    c.spicy = d.chili;
    c.got = d.on.map((o) => o.k);
    c.bonus = b;
    s.dayScore += b;
    s.total += b;
    s.served++;
    ev(s, 'serve', CUST_X[d.cust], CUST_Y, d.cust, b, c.k + (d.chili ? ':hot' : ''));
    if (c.k === 'bear') see(s, 'bear');
  } else ev(s, 'sell', 0.9, COUNTER_Y, 0, 0);
}
function doneStep(s: S) {
  for (const d of s.done) {
    d.t++;
    if (d.t === T_LAND) ev(s, 'land', 0.5, RACK_Y[d.row], d.on.length, 0, d.chili ? 'c' : '');
    if (d.t === T_LAND + 14 && d.mallow) {
      const b = d.mallow * MALLOW_PTS;
      s.dayScore += b;
      s.total += b;
      d.val += b;
      ev(s, 'puff', 0.5, RACK_Y[d.row], d.mallow, b);
      see(s, 'mallowpop');
    }
    if (d.t === T_DELIV) deliver(s, d);
  }
  s.done = s.done.filter((d) => !d.done);
}
function worldStep(s: S, ws = s.ws) {
  for (let i = s.items.length - 1; i >= 0; i--) {
    const it = s.items[i];
    if (it.wait > 0) {
      it.wait -= ws;
      if (it.wait <= 0) {
        ev(s, 'pop', it.x, GRILL_Y, 0, 0, it.k);
        if (see(s, 'i:' + it.k) && it.nw) ev(s, 'first', it.x, GRILL_Y - 0.1, 0, 0, it.k);
      }
      continue;
    }
    const g = GRAV * IKD[it.k].grav;
    if (it.hover > 0 && it.vy > -0.0012) {
      it.hover -= ws;
      it.vy = it.vy * 0.82 + Math.sin((s.t + it.id * 23) * 0.07) * 0.00011;
      it.vx *= 0.9;
    } else it.vy += g * ws;
    it.x += it.vx * ws;
    it.y += it.vy * ws;
    it.rot += it.vr * ws;
    const r = IKD[it.k].r;
    if (it.x < r && it.vx < 0) it.vx = -it.vx * 0.7;
    if (it.x > 1 - r && it.vx > 0) it.vx = -it.vx * 0.7;
    if (it.y > GRILL_Y + 0.015 && it.vy > 0) {
      s.items.splice(i, 1);
      ev(s, 'drop', it.x, GRILL_Y, 0, 0, it.k);
    }
  }
  // 첫 물결이 맴도는 동안(첫 날 첫 획 전)은 쉬고, 다 떨어지면 다시 띄운다
  const welAir = s.items.some((it) => it.wel);
  if (s.day === 0 && !s.firstStroke) {
    if (!welAir && !s.stroke) welcome(s, welcomeKinds(s));
    return;
  }
  s.spawnT -= ws;
  if (s.spawnT <= 0) {
    if (s.items.length < 14) burst(s);
    // 판이 비면 더 빨리 채운다 — 기다린다고 더 많이 모이지 않게
    const n = s.items.length;
    s.spawnT = n < 5 ? 12 + s.rng() * 8 : n < 9 ? 22 + s.rng() * 12 : 32 + s.rng() * 12;
  }
}
function startDay(s: S) {
  s.dt = 0;
  s.phase = 'day';
  s.dayScore = 0;
  s.served = 0;
  s.maxN = 0;
  s.dayStrokes = 0;
  s.dayFirst = false;
  s.items = [];
  s.done = [];
  s.stroke = null;
  s.auto = null;
  s.ws = 1;
  s.spawnT = s.day === 0 ? 24 : 40;
  const kinds = welcomeKinds(s);
  s.cust = [null, null, null];
  s.cust[1] = newCust(s, 1, welcomeOrder(kinds), 'wait');
  s.cust[0] = newCust(s, 0, undefined, 'wait');
  s.cust[2] = newCust(s, 2, undefined, 'wait');
  s.gap = [0, 0, 0];
  welcome(s, kinds);
  ev(s, 'day', 0.5, 0.8, s.day);
}
function closeDay(s: S) {
  if (s.stroke) finishStroke(s);
  s.auto = null;
  for (const d of s.done) if (!d.done) deliver(s, d);
  s.done = [];
  for (const it of s.items) if (it.wait <= 0) ev(s, 'drop', it.x, Math.min(it.y, GRILL_Y), 0, 0, it.k);
  s.items = [];
  const D = DAYDEF[s.day];
  s.stars = [true, s.served >= D.s2, s.maxN >= D.s3];
  s.got = s.stars.filter(Boolean).length;
  s.record = s.dayScore > s.best;
  if (s.record && s.day > 0) see(s, 'record');
  s.best = Math.max(s.best, s.dayScore);
  s.dayScores.push(s.dayScore);
  s.final = s.day >= DAYS - 1;
  s.phase = 'result';
  s.pt = 0;
  ev(s, 'close', 0.5, 0.8, s.got, s.dayScore, s.record ? 'r' : '');
}

const game: GameDef<S> & { wows(s: S): number } = {
  id: 'skewerstall',
  name: '🍡 꼬치 꿰기 포장마차',
  genes: ['skewerstall', 'slice', 'order'],
  twist: '그은 선이 그대로 꼬치가 된다 — 불판에서 튀어 오른 재료가 손가락이 지나간 순서대로 쏙쏙 꿰이고, 긋는 동안 세상이 느려지며, 말풍선 재료가 다 꿰이면 손님이 펄쩍 뛴다',
  rules: [
    '튀어 오른 재료를 손가락으로 쓱 그으면, 선이 스친 재료가 줄줄이 꼬치에 꿰여요.',
    '말풍선 재료를 다 꿰면 손님이 받아 가요. 길게 꿸수록, 같은 재료 셋이면 점수가 커져요.',
    '빨간 고추·탄 것은 피하기. 하루 1분 장사, 날마다 새 재료가 하나씩 풀려요.',
  ],
  controls: 'touch',
  hint: '쓱 그어 꼬치 / 키보드 1 = 자동 꿰기',
  aspect: A,
  art: {
    concept: '밤 시장 꼬치 포장마차 — 전구 줄 아래 숯불 불판에서 통통한 재료들이 퐁퐁 튀어 오르고, 카운터 너머 동물 손님들이 말풍선으로 주문한다',
    mood: '보랏빛 밤거리에 노란 전구 줄이 출렁이고 빨강·크림 줄무늬 차양 아래 숯불이 주황으로 일렁인다. 표정 있는 떡·소시지·파가 퐁 뛰어오르고, 쓱 그은 대나무 꼬치에 쏙쏙 꿰이면 김이 확 피어오르며 고양이·토끼·펭귄 손님이 펄쩍 뛴다.',
    palette: { bg: '#3b2f5e', ink: '#3a2416', muted: '#8a6a5a', accent: '#ffcf3a', hot: '#ff5a3a', soft: '#fff3d6' },
  },
  reveals: (s) => s.seen.size,
  cleared: (s) => (s.phase === 'result' ? { stage: s.day, got: s.got, of: 3 } : null),
  wows: (s) => s.wowN,
  create(seed) {
    const s: S = {
      rng: mulberry32(seed), seed, t: 0, day: 0, dt: 0, phase: 'day', pt: 0,
      items: [], stroke: null, done: [], cust: [null, null, null], gap: [0, 0, 0],
      nid: 0, spawnT: 30, ws: 1, down: false, auto: null,
      dayScore: 0, total: 0, best: 0, record: false, served: 0, maxN: 0, strokes: 0, dayStrokes: 0,
      got: 0, stars: [false, false, false], firstStroke: false, dayFirst: false, final: false,
      seen: new Set<string>(), wowN: 0, ev: [], evN: 0, dead: false, dayScores: [], miss: null, bigSk: 0, lastSk: -99, hold: 0,
    };
    startDay(s);
    // 화면이 뜨면 이미 퐁퐁 — 첫 물결이 떠오르는 중
    for (let i = 0; i < 34; i++) worldStep(s), custStep(s);
    s.ev = [];
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    const p = inp.pointer ? { x: clamp(inp.pointer.x, 0, 1), y: clamp(inp.pointer.y, 0, 1) * A } : null;
    const fresh = !!p && !s.down, rel = !p && s.down;
    s.down = !!p;
    if (s.phase === 'end') return;
    if (s.phase === 'result') {
      s.pt++;
      if (((fresh || inp.pick !== undefined) && s.pt >= RES_MIN) || s.pt >= RES_AUTO) {
        if (s.final) (s.phase = 'end'), (s.dead = true);
        else s.day++, startDay(s);
      }
      if (s.ev.length > 80) s.ev.splice(0, s.ev.length - 80);
      return;
    }
    s.dt++;
    if (s.auto) autoStep(s);
    else {
      if (inp.pick !== undefined && !s.stroke) startAuto(s);
      else if (fresh) startStroke(s, p!);
      else if (p && s.stroke) moveStroke(s, p);
      if (rel && s.stroke) finishStroke(s);
    }
    if (s.stroke) {
      if (s.t - s.stroke.t0 >= STROKE_MAX) finishStroke(s);
    }
    const target = s.stroke ? SLOW : 1;
    s.ws += (target - s.ws) * (target < s.ws ? 0.45 : 0.16);
    // 긴 꼬치를 떼는 순간 세상이 잠깐 멈춘다 (손맛)
    worldStep(s, s.hold > 0 ? 0 : s.ws);
    if (s.hold > 0) s.hold--;
    doneStep(s);
    custStep(s);
    const left = DAY_T - s.dt;
    if (left > 0 && left <= 600 && left % 60 === 0) ev(s, 'tick', 0.5, 0.04, left / 60);
    if (s.dt >= DAY_T) closeDay(s);
    if (s.ev.length > 80) s.ev.splice(0, s.ev.length - 80);
  },
  over: (s) => s.dead,
  score: (s) => s.total,
  draw(ctx, s, w, h, _th: Theme) {
    drawAll(ctx, s, w, h);
  },
};
export const skewerstall = game;

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
const at = (x: number, y: number): Input => ({ tap: false, dir: 0, pointer: { x: clamp(x, 0, 1), y: clamp(y / A, 0, 1) } });
interface Line { x0: number; y0: number; x1: number; y1: number; v: number; n: number }
/** 지금 공중 재료를 lead(세상 틱) 뒤 자리로 내다본다 */
function predict(it: It, lead: number): P {
  if (it.hover > 0 && it.vy > -0.0012) return { x: it.x, y: it.y };
  const g = GRAV * IKD[it.k].grav;
  return { x: it.x + it.vx * lead, y: it.y + it.vy * lead + 0.5 * g * lead * lead };
}
/** 꼬치 하나의 값(봇이 셈): 점수 + 다 담은 손님 중 가장 큰 주문 + 마시멜로 + 길이(별) */
function estimate(s: S, kinds: IK[]): number {
  if (!kinds.length) return 0;
  const V = value(kinds);
  let ob = 0;
  for (const c of s.cust) if (openCust(c) && covers(kinds, c.ord)) ob = Math.max(ob, orderBonus(c));
  return V.val + ob + V.mallow * MALLOW_PTS + (V.n >= DAYDEF[s.day].s3 ? 60 : 0) + V.n * 4;
}
/** 가장 값진 직선: 재료 두 개를 지나는 직선마다 그 띠 안의 재료를 순서대로(양쪽 방향, 끝의 나쁜 것은 잘라) 셈 */
function bestLine(s: S, lead: number, mode: 'smart' | 'pair' = 'smart'): Line | null {
  const its: { it: It; p: P }[] = [];
  for (const it of s.items) {
    if (it.wait > 0) continue;
    const p = predict(it, lead);
    if (p.y < AIR_TOP - 0.02 || p.y > GRILL_Y - 0.02 || p.x < 0.01 || p.x > 0.99) continue;
    its.push({ it, p });
  }
  if (!its.length) return null;
  let best = null as Line | null;
  const consider = (ax: number, ay: number, ux: number, uy: number) => {
    const inside: { k: IK; t: number }[] = [];
    for (const q of its) {
      const dx = q.p.x - ax, dy = q.p.y - ay, d = Math.abs(dx * uy - dy * ux);
      if (d <= IKD[q.it.k].r + HIT * 0.7) inside.push({ k: q.it.k, t: dx * ux + dy * uy });
    }
    if (!inside.length) return;
    inside.sort((a, b) => a.t - b.t);
    for (const dir of [1, -1]) {
      const list = dir > 0 ? inside : [...inside].reverse();
      // 앞쪽 나쁜 것 건너뛰기: 처음 좋은 재료부터, 칸이 차거나 나쁜 것이 나오기 전까지 / 나쁜 것을 감수하고 끝까지
      let a = 0;
      while (a < list.length && IKD[list[a].k].bad) a++;
      if (a >= list.length) continue;
      for (const stopAtBad of [true, false]) {
        const kinds: IK[] = [];
        let slots = 0, b = a;
        for (; b < list.length; b++) {
          const k = list[b].k;
          if (stopAtBad && IKD[k].bad) break;
          if (slots + IKD[k].slots > CAP) break;
          kinds.push(k);
          slots += IKD[k].slots;
        }
        const v = estimate(s, kinds);
        if (!best || v > best.v) {
          const t0 = list[a].t, t1 = list[b - 1].t, m = 0.05 * dir;
          best = { x0: ax + ux * (t0 - m), y0: ay + uy * (t0 - m), x1: ax + ux * (t1 + m), y1: ay + uy * (t1 + m), v, n: kinds.length };
        }
        if (!list.slice(a).some((q) => IKD[q.k].bad)) break;
      }
    }
  };
  if (mode === 'pair') {
    // 버릇: 가장 가까운 좋은 재료 둘만 (그 둘을 잇는 짧은 선)
    let bi = -1, bj = -1, bd = 9;
    for (let i = 0; i < its.length; i++)
      for (let j = i + 1; j < its.length; j++) {
        if (IKD[its[i].it.k].bad || IKD[its[j].it.k].bad) continue;
        const d = Math.hypot(its[i].p.x - its[j].p.x, its[i].p.y - its[j].p.y);
        if (d < bd) (bd = d), (bi = i), (bj = j);
      }
    if (bi < 0) return null;
    const a = its[bi].p, b = its[bj].p, L = Math.max(1e-6, bd), ux = (b.x - a.x) / L, uy = (b.y - a.y) / L;
    return { x0: a.x - ux * 0.03, y0: a.y - uy * 0.03, x1: b.x + ux * 0.03, y1: b.y + uy * 0.03, v: 0, n: 2 };
  }
  for (let i = 0; i < its.length; i++) {
    for (let j = i + 1; j < its.length; j++) {
      const dx = its[j].p.x - its[i].p.x, dy = its[j].p.y - its[i].p.y, L = Math.hypot(dx, dy);
      if (L < 1e-6 || L > 0.95) continue;
      consider(its[i].p.x, its[i].p.y, dx / L, dy / L);
    }
    consider(its[i].p.x, its[i].p.y, 1, 0);
  }
  if (best) {
    const b = best as Line;
    b.x0 = clamp(b.x0, 0.01, 0.99);
    b.x1 = clamp(b.x1, 0.01, 0.99);
    b.y0 = clamp(b.y0, 0.2, A - 0.02);
    b.y1 = clamp(b.y1, 0.2, A - 0.02);
  }
  return best;
}

interface Plan { x0: number; y0: number; x1: number; y1: number; n: number; i: number }
interface Mem { plan: Plan | null; next: number; tapped: number; tries: number }
function memOf(map: WeakMap<object, Mem>, s: S, next = 0): Mem {
  let m = map.get(s);
  if (!m) map.set(s, (m = { plan: null, next, tapped: -1, tries: 0 }));
  return m;
}
/** 획 하나를 틱마다 포인터로: 누름 → 한 걸음씩 → 뗌 */
function runPlan(s: S, m: Mem, gap: number): Input {
  const p = m.plan!;
  if (p.i > p.n || (p.i > 0 && !s.stroke && !s.auto)) {
    m.plan = null;
    m.next = s.t + gap;
    return NO;
  }
  const f = p.i / p.n;
  p.i++;
  return at(p.x0 + (p.x1 - p.x0) * f, p.y0 + (p.y1 - p.y0) * f);
}
function resultTap(s: S, m: Mem, wait: number): Input {
  if (s.down) return NO;
  if (s.pt >= RES_MIN + wait && m.tapped !== s.day) {
    m.tapped = s.day;
    return at(0.5, 1.0);
  }
  return NO;
}
function plan(l: { x0: number; y0: number; x1: number; y1: number }, step: number): Plan {
  return { x0: l.x0, y0: l.y0, x1: l.x1, y1: l.y1, n: Math.max(1, Math.ceil(Math.hypot(l.x1 - l.x0, l.y1 - l.y0) / step)), i: 0 };
}

/** 잘하는 봇: 재료 두 개를 지나는 모든 직선을 셈해 가장 값진(주문·길이·같은 재료 셋) 선을 긋는다. gap = 뗀 뒤 쉬는 틱 */
export function skewerstallSmartAt(gap: number): Bot<S> {
  const smartMem = new WeakMap<object, Mem>();
  return {
  name: '가장 값진 선을 셈해 긋기',
  act(s) {
    const m = memOf(smartMem, s);
    if (s.phase === 'result') return (m.plan = null), resultTap(s, m, 8);
    if (s.phase !== 'day') return NO;
    if (m.plan) return runPlan(s, m, gap);
    if (s.down || s.stroke) return NO;
    if (s.t < m.next) return NO;
    const L = bestLine(s, 5);
    if (!L) return NO;
    // 아주 싼 선이면 조금 더 기다려 본다(최대 0.6초)
    if (L.v < 90 && m.tries < 6) {
      m.tries++;
      m.next = s.t + 6;
      return NO;
    }
    m.tries = 0;
    m.plan = plan(L, 0.11);
    return runPlan(s, m, gap);
  },
  };
}
export const skewerstallSmart = skewerstallSmartAt(40);

const dumbMem = new WeakMap<object, Mem>();
/** 못하는 봇: 아무 때나 아무 데서 아무 방향으로 쓱 */
export const skewerstallRandom: Bot<S> = {
  name: '아무 데나 쓱',
  act(s, rng) {
    const m = memOf(dumbMem, s, s.t + 10 + Math.floor(rng() * 40));
    if (s.phase === 'result') return (m.plan = null), resultTap(s, m, 20 + Math.floor(rng() * 40));
    if (s.phase !== 'day') return NO;
    if (m.plan) return runPlan(s, m, 20 + Math.floor(rng() * 90));
    if (s.down || s.t < m.next) return NO;
    const x0 = 0.05 + rng() * 0.9, y0 = 0.3 + rng() * 1.05, a = rng() * TAU, L = 0.08 + rng() * 0.6;
    m.plan = plan({ x0, y0, x1: clamp(x0 + Math.cos(a) * L, 0.02, 0.98), y1: clamp(y0 + Math.sin(a) * L, 0.2, A - 0.02) }, 0.05 + rng() * 0.1);
    return runPlan(s, m, 20);
  },
};

const habitMem = new WeakMap<object, Mem>();
/** 버릇 봇: 늘 같은 높이에서 가로로 한 줄 쭉 */
export const skewerstallHabit: Bot<S> = {
  name: '버릇: 늘 가로로 한 줄',
  act(s) {
    const m = memOf(habitMem, s);
    if (s.phase === 'result') return (m.plan = null), resultTap(s, m, 10);
    if (s.phase !== 'day') return NO;
    if (m.plan) return runPlan(s, m, 26);
    if (s.down || s.t < m.next || !s.items.length) return NO;
    m.plan = plan({ x0: 0.05, y0: 0.78, x1: 0.95, y1: 0.78 }, 0.11);
    return runPlan(s, m, 26);
  },
};
const habit2Mem = new WeakMap<object, Mem>();
/** 독립 버릇 봇: 늘 가장 가까운 좋은 재료 둘만 */
export const skewerstallHabit2: Bot<S> = {
  name: '버릇: 늘 가장 가까운 둘만',
  act(s) {
    const m = memOf(habit2Mem, s);
    if (s.phase === 'result') return (m.plan = null), resultTap(s, m, 10);
    if (s.phase !== 'day') return NO;
    if (m.plan) return runPlan(s, m, 22);
    if (s.down || s.t < m.next) return NO;
    const L = bestLine(s, 4, 'pair');
    if (!L) return NO;
    m.plan = plan(L, 0.11);
    return runPlan(s, m, 22);
  },
};


// ───────────────────────────── 그림 도구 ─────────────────────────────
type C2 = CanvasRenderingContext2D;
const OUT = '#4a2614';
function layer(w: number, h: number, paint: (c: C2) => void) {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.ceil(w));
  cv.height = Math.max(1, Math.ceil(h));
  paint(cv.getContext('2d')!);
  return cv;
}
const devScale = (ctx: C2) => (typeof ctx.getTransform === 'function' ? Math.min(3, Math.max(1, Math.round((ctx.getTransform().a || 1) * 4) / 4)) : 1);
/** 그림판 배율(기기 픽셀) — 그리기 시작할 때 한 번 읽는다 (흔들림·확대 중에도 글자 조각을 새로 굽지 않게) */
let DPR = 1;
function ell(g: C2, x: number, y: number, rx: number, ry: number, rot = 0) {
  g.beginPath();
  g.ellipse(x, y, Math.max(0.001, rx), Math.max(0.001, ry), rot, 0, TAU);
}
function rr(g: C2, x: number, y: number, w: number, h: number, r: number) {
  const q = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + q, y);
  g.arcTo(x + w, y, x + w, y + h, q);
  g.arcTo(x + w, y + h, x, y + h, q);
  g.arcTo(x, y + h, x, y, q);
  g.arcTo(x, y, x + w, y, q);
  g.closePath();
}
function ink(g: C2, fill: string | CanvasGradient, lw: number, stroke = OUT) {
  g.fillStyle = fill;
  g.fill();
  if (lw > 0) (g.strokeStyle = stroke), (g.lineWidth = lw), g.stroke();
}
function shine(g: C2, x: number, y: number, rx: number, ry: number, rot = -0.4, a = 0.6) {
  ell(g, x, y, rx, ry, rot);
  g.fillStyle = `rgba(255,255,255,${a})`;
  g.fill();
}
function lin(g: C2, x0: number, y0: number, x1: number, y1: number, ...stops: [number, string][]) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) gr.addColorStop(o, c);
  return gr;
}
function rad(g: C2, x: number, y: number, r0: number, r1: number, ...stops: [number, string][]) {
  const gr = g.createRadialGradient(x, y, r0, x, y, r1);
  for (const [o, c] of stops) gr.addColorStop(o, c);
  return gr;
}
function line(g: C2, x0: number, y0: number, x1: number, y1: number, col: string, lw: number) {
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x1, y1);
  g.strokeStyle = col;
  g.lineWidth = lw;
  g.stroke();
}
function star(g: C2, x: number, y: number, r: number, k = 0.5, n = 5, rot = -Math.PI / 2) {
  g.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i * Math.PI) / n, q = i % 2 ? r * k : r;
    if (i) g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
    else g.moveTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
  }
  g.closePath();
}
/** 그림 안에서 쓰는 작은 해시 (그리기 전용 — 시뮬레이션과 무관) */
const hash = (n: number) => {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
};

// ───────────────────────────── 스티커 굽기 ─────────────────────────────
const SPR = new Map<string, HTMLCanvasElement>();
/** 1/3옥타브 계단으로 굽는다 — 크기가 조금씩 달라도 새로 굽지 않는다 */
const q3 = (px: number) => Math.ceil(2 ** (Math.ceil(Math.log2(Math.max(6, px)) * 3 - 1e-6) / 3));
interface Frame { w: number; h: number; ox: number; oy: number }
const F_ITEM: Frame = { w: 3.2, h: 3.2, ox: 1.6, oy: 1.6 }, F_CUST: Frame = { w: 3.8, h: 5.2, ox: 1.9, oy: 2.5 }, F_HAND: Frame = { w: 2.4, h: 2.8, ox: 0.5, oy: 0.3 };
function spr(key: string, fr: Frame, px: number, paint: (g: C2) => void): HTMLCanvasElement {
  const q = q3(px), k = key + ':' + q;
  let cv = SPR.get(k);
  if (!cv) {
    if (SPR.size > 520) SPR.clear();
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
/** (0,0) = 스티커 기준점, u = 단위 px */
function stamp(ctx: C2, cv: HTMLCanvasElement, fr: Frame, u: number) {
  ctx.drawImage(cv, -fr.ox * u, -fr.oy * u, fr.w * u, fr.h * u);
}
/** 미리 굽기 줄: 그림 프레임 밖(setTimeout)에서 조금씩 — 놀이 중 한 프레임이 길어지지 않게 */
const WQ: (() => void)[] = [], WK = new Set<string>();
let pumping = false;
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
    while (WQ.length && performance.now() - a < 5) WQ.shift()!();
    if (WQ.length) setTimeout(go, 20);
    else pumping = false;
  };
  setTimeout(go, 0);
}

// ───────────────────────────── 재료 그림 (반지름 = 1) ─────────────────────────────
/** 얼굴: 0 방긋 · 1 꿰임(> <) · 2 구움(^^) · 3 화남(고추) · 4 어질(탄 것) */
function face(g: C2, mode: number, x: number, y: number, z: number, eye = '#3a1c0c') {
  const ex = 0.3 * z, ey = y - 0.02 * z;
  g.lineWidth = 0.1 * z;
  g.strokeStyle = eye;
  g.fillStyle = eye;
  if (mode === 0 || mode === 3) {
    ell(g, x - ex, ey, 0.1 * z, 0.13 * z);
    g.fill();
    ell(g, x + ex, ey, 0.1 * z, 0.13 * z);
    g.fill();
    ell(g, x - ex + 0.03 * z, ey - 0.05 * z, 0.035 * z, 0.035 * z);
    g.fillStyle = '#fff';
    g.fill();
    ell(g, x + ex + 0.03 * z, ey - 0.05 * z, 0.035 * z, 0.035 * z);
    g.fill();
    if (mode === 3) {
      line(g, x - ex - 0.14 * z, ey - 0.24 * z, x - ex + 0.1 * z, ey - 0.15 * z, eye, 0.09 * z);
      line(g, x + ex + 0.14 * z, ey - 0.24 * z, x + ex - 0.1 * z, ey - 0.15 * z, eye, 0.09 * z);
      g.beginPath();
      g.arc(x, y + 0.3 * z, 0.12 * z, Math.PI * 1.15, Math.PI * 1.85);
      g.strokeStyle = eye;
      g.stroke();
    } else {
      g.beginPath();
      g.arc(x, y + 0.12 * z, 0.13 * z, 0.15 * Math.PI, 0.85 * Math.PI);
      g.strokeStyle = eye;
      g.stroke();
    }
  } else if (mode === 1) {
    for (const sx of [-1, 1]) {
      g.beginPath();
      g.moveTo(x + sx * ex - 0.1 * z * sx, ey - 0.1 * z);
      g.lineTo(x + sx * ex + 0.06 * z * sx, ey);
      g.lineTo(x + sx * ex - 0.1 * z * sx, ey + 0.1 * z);
      g.stroke();
    }
    ell(g, x, y + 0.2 * z, 0.11 * z, 0.13 * z);
    g.fillStyle = '#8a2a1a';
    g.fill();
  } else if (mode === 2) {
    for (const sx of [-1, 1]) {
      g.beginPath();
      g.arc(x + sx * ex, ey + 0.04 * z, 0.1 * z, Math.PI * 1.1, Math.PI * 1.9);
      g.stroke();
    }
    g.beginPath();
    g.arc(x, y + 0.1 * z, 0.16 * z, 0.1 * Math.PI, 0.9 * Math.PI);
    g.fillStyle = '#8a2a1a';
    g.fill();
  } else {
    for (const sx of [-1, 1]) {
      line(g, x + sx * ex - 0.09 * z, ey - 0.09 * z, x + sx * ex + 0.09 * z, ey + 0.09 * z, '#ffb38a', 0.08 * z);
      line(g, x + sx * ex + 0.09 * z, ey - 0.09 * z, x + sx * ex - 0.09 * z, ey + 0.09 * z, '#ffb38a', 0.08 * z);
    }
    g.beginPath();
    g.moveTo(x - 0.14 * z, y + 0.24 * z);
    for (let i = 1; i <= 4; i++) g.lineTo(x - 0.14 * z + i * 0.07 * z, y + (i % 2 ? 0.18 : 0.24) * z);
    g.strokeStyle = '#ffb38a';
    g.stroke();
  }
  if (mode !== 4) {
    ell(g, x - ex - 0.13 * z, y + 0.12 * z, 0.1 * z, 0.06 * z);
    g.fillStyle = 'rgba(255,110,120,.45)';
    g.fill();
    ell(g, x + ex + 0.13 * z, y + 0.12 * z, 0.1 * z, 0.06 * z);
    g.fill();
  }
}
function grillMarks(g: C2, x0: number, x1: number, y0: number, y1: number) {
  g.save();
  g.globalAlpha = 0.55;
  for (let i = 0; i < 3; i++) {
    const x = x0 + ((x1 - x0) * (i + 0.6)) / 3.2;
    line(g, x - 0.12, y0, x + 0.12, y1, '#5a2a10', 0.12);
  }
  g.restore();
}
function paintItem(g: C2, k: IK, mode: number) {
  const lw = 0.15, cooked = mode === 2;
  switch (k) {
    case 'tteok': {
      rr(g, -1.1, -0.64, 2.2, 1.28, 0.6);
      ink(g, lin(g, 0, -0.64, 0, 0.64, [0, cooked ? '#fff0c8' : '#ffffff'], [0.55, cooked ? '#f6d48c' : '#fbf0dc'], [1, cooked ? '#d99a4a' : '#e6cfa6']), lw);
      ell(g, -0.74, 0, 0.24, 0.56);
      g.fillStyle = cooked ? 'rgba(210,150,80,.5)' : 'rgba(226,200,160,.55)';
      g.fill();
      shine(g, 0.15, -0.38, 0.62, 0.11, 0, 0.9);
      if (cooked) grillMarks(g, -0.7, 0.9, -0.5, 0.5);
      face(g, mode, 0.15, 0.06, 0.95);
      break;
    }
    case 'saus':
    case 'big': {
      const bigk = k === 'big';
      rr(g, -1.15, -0.62, 2.3, 1.24, 0.62);
      ink(g, lin(g, 0, -0.62, 0, 0.62, [0, bigk ? '#ff8a62' : '#ff8a6a'], [0.5, bigk ? '#e04a2e' : '#e8553e'], [1, cooked ? '#8a2412' : '#b8301f']), lw);
      for (const x of [-0.55, 0, 0.55]) line(g, x - 0.14, -0.5, x + 0.1, -0.12, 'rgba(255,200,170,.85)', 0.1);
      shine(g, -0.1, -0.36, 0.7, 0.11, 0, 0.7);
      if (bigk) {
        g.beginPath();
        g.moveTo(-0.95, -0.02);
        for (let i = 1; i <= 9; i++) g.lineTo(-0.95 + i * 0.21, i % 2 ? -0.22 : -0.02);
        g.strokeStyle = OUT;
        g.lineWidth = 0.2;
        g.stroke();
        g.strokeStyle = '#ffd23f';
        g.lineWidth = 0.12;
        g.stroke();
      }
      if (cooked) grillMarks(g, -0.8, 0.9, -0.45, 0.45);
      face(g, mode, 0.1, 0.18, bigk ? 0.85 : 0.9, '#3a0c06');
      break;
    }
    case 'leek': {
      rr(g, -1.08, -0.56, 2.16, 1.12, 0.5);
      ink(g, lin(g, -1.08, 0, 1.08, 0, [0, '#ffffff'], [0.4, '#f2f7dc'], [0.52, '#a8e070'], [1, cooked ? '#4a9a2a' : '#5cc23a']), lw);
      for (const y of [-0.22, 0.1]) line(g, -0.8, y, 0.85, y, 'rgba(120,170,80,.35)', 0.05);
      ell(g, 1.0, 0, 0.12, 0.42);
      g.fillStyle = 'rgba(70,140,40,.5)';
      g.fill();
      shine(g, -0.25, -0.33, 0.6, 0.1, 0, 0.9);
      if (cooked) grillMarks(g, -0.7, 0.8, -0.45, 0.45);
      face(g, mode, -0.25, 0.05, 0.85);
      break;
    }
    case 'shrimp': {
      // 둥글게 말린 새우: 머리 쪽이 굵고 꼬리로 갈수록 가는 C자 몸 + 흰 줄무늬 + 부채 꼬리 + 더듬이
      g.scale(1.22, 1.22);
      const cx = 0.08, cy = 0.05, Rc = 0.5, a0 = -0.55 * Math.PI, span = 1.25 * Math.PI, N = 14;
      const P = (t: number, o: number) => {
        const a = a0 - t * span, th = 0.4 - 0.24 * t;
        return [cx + Math.cos(a) * (Rc + o * th), cy + Math.sin(a) * (Rc + o * th)] as [number, number];
      };
      // 꼬리 부채
      const [ex, ey] = P(1, 0), ta = a0 - span - Math.PI / 2;
      for (const d of [-0.55, 0, 0.55]) {
        const a = ta + d;
        ell(g, ex + Math.cos(a) * 0.3, ey + Math.sin(a) * 0.3, 0.3, 0.14, a);
        ink(g, cooked ? '#e8401a' : '#ff6a3a', 0.1);
      }
      line(g, P(0, 0)[0] - 0.1, P(0, 0)[1] - 0.3, -0.85, -1.3, OUT, 0.06);
      line(g, P(0, 0)[0], P(0, 0)[1] - 0.35, -0.3, -1.4, OUT, 0.06);
      g.beginPath();
      for (let i = 0; i <= N; i++) {
        const [x, y] = P(i / N, 1);
        if (i) g.lineTo(x, y);
        else g.moveTo(x, y);
      }
      for (let i = N; i >= 0; i--) {
        const [x, y] = P(i / N, -1);
        g.lineTo(x, y);
      }
      g.closePath();
      ink(g, lin(g, -0.6, -0.6, 0.6, 0.6, [0, cooked ? '#ffb070' : '#ffc6a0'], [0.5, cooked ? '#ff6a2a' : '#ff8a4c'], [1, cooked ? '#c8401a' : '#f0602a']), 0.13);
      for (const t of [0.22, 0.4, 0.58, 0.76]) {
        const [x0, y0] = P(t, -0.85), [x1, y1] = P(t, 0.85);
        line(g, x0, y0, x1, y1, 'rgba(255,245,235,.9)', 0.09);
      }
      // 둥근 머리
      const [hx, hy] = P(0, 0);
      ell(g, hx, hy, 0.42, 0.4);
      ink(g, rad(g, hx - 0.12, hy - 0.15, 0.05, 0.5, [0, cooked ? '#ffb070' : '#ffd0b0'], [1, cooked ? '#ff6a2a' : '#ff8a4c']), 0.13);
      face(g, mode, hx + 0.02, hy + 0.02, 0.6);
      break;
    }
    case 'pine': {
      g.beginPath();
      g.moveTo(-1.0, 0.62);
      g.lineTo(1.0, 0.62);
      g.lineTo(0.55, -0.72);
      g.lineTo(-0.55, -0.72);
      g.closePath();
      g.lineJoin = 'round';
      ink(g, lin(g, 0, -0.72, 0, 0.62, [0, '#fff27a'], [0.6, '#ffd23f'], [1, cooked ? '#e09a10' : '#f0b21a']), lw);
      g.save();
      g.globalAlpha = 0.35;
      for (let i = -3; i <= 3; i++) {
        line(g, i * 0.3 - 0.3, 0.55, i * 0.3 + 0.2, -0.65, '#d99000', 0.05);
        line(g, i * 0.3 + 0.3, 0.55, i * 0.3 - 0.2, -0.65, '#d99000', 0.05);
      }
      g.restore();
      line(g, -0.52, -0.66, 0.52, -0.66, '#fffbe0', 0.1);
      if (cooked) grillMarks(g, -0.6, 0.7, -0.4, 0.45);
      face(g, mode, 0, 0.08, 0.85);
      break;
    }
    case 'mallow': {
      rr(g, -0.88, -0.82, 1.76, 1.64, 0.5);
      ink(g, cooked ? lin(g, 0, -0.82, 0, 0.82, [0, '#ffe2a8'], [0.5, '#f2b062'], [1, '#c47a34']) : lin(g, 0, -0.82, 0, 0.82, [0, '#fff0f6'], [0.55, '#ffc4da'], [1, '#ff9cc0']), lw);
      rr(g, -0.7, -0.7, 1.4, 0.5, 0.25);
      g.fillStyle = cooked ? 'rgba(255,235,190,.5)' : 'rgba(255,255,255,.75)';
      g.fill();
      shine(g, -0.35, -0.5, 0.3, 0.12, -0.3, 0.95);
      face(g, mode, 0, 0.12, 0.9);
      break;
    }
    case 'egg': {
      ell(g, 0, 0.05, 0.8, 0.98, 0.25);
      ink(g, rad(g, -0.25, -0.3, 0.1, 1.2, [0, '#fff8c8'], [0.45, '#ffd84a'], [1, '#d8920c']), lw);
      for (let i = 0; i < 6; i++) {
        ell(g, Math.cos(i * 2.3) * 0.45, Math.sin(i * 1.7) * 0.55, 0.07, 0.05, i);
        g.fillStyle = 'rgba(150,90,10,.55)';
        g.fill();
      }
      star(g, -0.34, -0.46, 0.26, 0.35, 4, 0);
      g.fillStyle = '#ffffff';
      g.fill();
      face(g, mode, 0.05, 0.18, 0.75);
      break;
    }
    case 'chili': {
      g.beginPath();
      g.moveTo(-0.85, -0.45);
      g.bezierCurveTo(-0.2, -0.85, 0.9, -0.4, 1.05, 0.75);
      g.bezierCurveTo(0.55, 0.3, -0.1, 0.35, -0.75, 0.2);
      g.closePath();
      ink(g, lin(g, 0, -0.7, 0, 0.6, [0, '#ff7a6a'], [0.5, '#ff3b30'], [1, '#b8160e']), lw);
      shine(g, -0.1, -0.42, 0.42, 0.08, 0.2, 0.75);
      ell(g, -0.85, -0.13, 0.22, 0.34, 0.3);
      ink(g, '#4cae3a', 0.1);
      line(g, -0.95, -0.2, -1.25, -0.55, '#3a8a2a', 0.14);
      face(g, 3, 0.0, -0.05, 0.75, '#3a0606');
      break;
    }
    case 'burnt': {
      g.beginPath();
      for (let i = 0; i <= 14; i++) {
        const a = (i / 14) * TAU, q = 0.85 + (i % 2 ? 0.12 : -0.04) + Math.sin(i * 2.1) * 0.05;
        if (i) g.lineTo(Math.cos(a) * q * 1.1, Math.sin(a) * q * 0.85);
        else g.moveTo(Math.cos(a) * q * 1.1, Math.sin(a) * q * 0.85);
      }
      g.closePath();
      ink(g, rad(g, -0.3, -0.3, 0.1, 1.2, [0, '#5a4a46'], [1, '#1e1818']), lw, '#120c0c');
      for (let i = 0; i < 5; i++) {
        ell(g, Math.cos(i * 1.9) * 0.6, Math.sin(i * 2.7) * 0.45, 0.06, 0.06);
        g.fillStyle = '#ff7a2a';
        g.fill();
      }
      face(g, 4, 0.05, 0.0, 0.85);
      break;
    }
  }
}
const itemSpr = (k: IK, mode: number, px: number) => spr('i' + k + mode, F_ITEM, px, (g) => paintItem(g, k, mode));

// ───────────────────────────── 손님 그림 (머리 반지름 = 1, 머리 가운데 = (0,0)) ─────────────────────────────
interface Coat { fur: string; dark: string; light: string; muzzle: string; inner: string; nose: string; shirt: string; shirt2: string }
const COAT: Record<CK, Coat> = {
  cat: { fur: '#ffb04a', dark: '#e07a2a', light: '#ffd79a', muzzle: '#fff4e2', inner: '#ff9fb0', nose: '#ff7f9a', shirt: '#4aa3ff', shirt2: '#2a78d8' },
  dog: { fur: '#f6e2bf', dark: '#a8683a', light: '#fff4e0', muzzle: '#fffaf0', inner: '#a8683a', nose: '#3a2416', shirt: '#ff6b6b', shirt2: '#d84a4a' },
  bunny: { fur: '#fbfbff', dark: '#d6d9ec', light: '#ffffff', muzzle: '#ffffff', inner: '#ffb3c6', nose: '#ff8fab', shirt: '#6fd08a', shirt2: '#3fa862' },
  peng: { fur: '#3b4560', dark: '#252b3e', light: '#5a6684', muzzle: '#ffffff', inner: '#ffffff', nose: '#ffb02e', shirt: '#ffd23f', shirt2: '#e0a81a' },
  fox: { fur: '#ff8a3d', dark: '#d8601c', light: '#ffc08a', muzzle: '#fff6ea', inner: '#3a2416', nose: '#3a2416', shirt: '#a88bff', shirt2: '#7a5ae0' },
  bear: { fur: '#b07444', dark: '#7a4a26', light: '#d8a070', muzzle: '#f3d6b0', inner: '#d8a070', nose: '#3a2416', shirt: '#ffffff', shirt2: '#dcdcdc' },
};
/** 손님 얼굴: 0 보통 · 1 깜빡 · 2 두근(다 꿰임) · 3 기쁨 · 4 매움 · 5 지루 */
function paintCust(g: C2, k: CK, mode: number) {
  const C = COAT[k], lw = 0.12;
  // 몸(어깨) — 카운터 아래로 이어진다
  ell(g, 0, 1.9, 1.4, 1.05);
  ink(g, lin(g, 0, 0.9, 0, 2.9, [0, C.shirt], [1, C.shirt2]), lw);
  if (k === 'bear') {
    rr(g, -0.85, 1.15, 1.7, 1.6, 0.4);
    ink(g, '#ffffff', 0.1);
    line(g, -0.6, 1.15, -1.0, 0.95, OUT, 0.08);
    line(g, 0.6, 1.15, 1.0, 0.95, OUT, 0.08);
  } else {
    g.beginPath();
    g.moveTo(-0.55, 0.95);
    g.lineTo(0, 1.35);
    g.lineTo(0.55, 0.95);
    g.strokeStyle = 'rgba(255,255,255,.85)';
    g.lineWidth = 0.14;
    g.stroke();
  }
  // 귀 (머리 뒤)
  if (k === 'cat' || k === 'fox') {
    const big = k === 'fox' ? 1.25 : 1;
    for (const sx of [-1, 1]) {
      g.beginPath();
      g.moveTo(sx * 0.25, -0.75);
      g.lineTo(sx * 0.9 * big, -1.25 * big);
      g.lineTo(sx * 0.92, -0.25);
      g.closePath();
      ink(g, C.fur, lw);
      g.beginPath();
      g.moveTo(sx * 0.38, -0.7);
      g.lineTo(sx * 0.82 * big, -1.05 * big);
      g.lineTo(sx * 0.82, -0.38);
      g.closePath();
      g.fillStyle = k === 'fox' ? '#3a2416' : C.inner;
      g.fill();
    }
  } else if (k === 'bunny') {
    for (const sx of [-1, 1]) {
      ell(g, sx * 0.42, -1.45, 0.3, 0.82, sx * 0.12);
      ink(g, C.fur, lw);
      ell(g, sx * 0.42, -1.4, 0.15, 0.6, sx * 0.12);
      g.fillStyle = C.inner;
      g.fill();
    }
  } else if (k === 'bear') {
    for (const sx of [-1, 1]) {
      ell(g, sx * 0.78, -0.72, 0.36, 0.36);
      ink(g, C.fur, lw);
      ell(g, sx * 0.78, -0.72, 0.18, 0.18);
      g.fillStyle = C.light;
      g.fill();
    }
  }
  // 머리
  ell(g, 0, 0, 1.05, 0.95);
  ink(g, rad(g, -0.35, -0.4, 0.1, 1.3, [0, C.light], [0.55, C.fur], [1, C.dark]), lw);
  if (k === 'peng') {
    ell(g, -0.33, 0.12, 0.48, 0.62);
    g.fillStyle = '#ffffff';
    g.fill();
    ell(g, 0.33, 0.12, 0.48, 0.62);
    g.fill();
    ell(g, 0, 0.4, 0.62, 0.42);
    g.fill();
  }
  if (k === 'cat') for (const x of [-0.22, 0, 0.22]) line(g, x, -0.92, x * 1.2, -0.62, C.dark, 0.1);
  if (k === 'dog') {
    ell(g, 0.42, -0.15, 0.3, 0.26, 0.3);
    g.fillStyle = 'rgba(168,104,58,.45)';
    g.fill();
  }
  if (k === 'bear') {
    // 단골 머리띠
    g.beginPath();
    g.ellipse(0, -0.2, 1.07, 0.5, 0, Math.PI * 1.08, Math.PI * 1.92);
    g.strokeStyle = OUT;
    g.lineWidth = 0.34;
    g.stroke();
    g.strokeStyle = '#ff5a4a';
    g.lineWidth = 0.22;
    g.stroke();
    ell(g, 0.95, -0.42, 0.16, 0.12, 0.5);
    ink(g, '#ff5a4a', 0.08);
  }
  // 주둥이
  if (k !== 'peng') {
    ell(g, 0, 0.36, k === 'fox' ? 0.5 : 0.46, 0.32);
    g.fillStyle = C.muzzle;
    g.fill();
  }
  if (k === 'fox')
    for (const sx of [-1, 1]) {
      g.beginPath();
      g.moveTo(sx * 1.0, 0.05);
      g.quadraticCurveTo(sx * 0.6, 0.55, sx * 0.15, 0.62);
      g.lineTo(sx * 0.55, 0.15);
      g.closePath();
      g.fillStyle = C.muzzle;
      g.fill();
    }
  // 볼
  const blushA = mode === 3 ? 0.7 : mode === 2 ? 0.6 : 0.4;
  for (const sx of [-1, 1]) {
    ell(g, sx * 0.62, 0.3, 0.2, 0.12);
    g.fillStyle = `rgba(255,110,130,${blushA})`;
    g.fill();
  }
  // 눈
  const ey = -0.08, ex = 0.4, eye = k === 'peng' ? '#1a1a2a' : '#2a160c';
  g.fillStyle = eye;
  g.strokeStyle = eye;
  g.lineWidth = 0.12;
  for (const sx of [-1, 1]) {
    const x = sx * ex;
    if (mode === 0) {
      ell(g, x, ey, 0.13, 0.17);
      g.fillStyle = eye;
      g.fill();
      ell(g, x + 0.04, ey - 0.06, 0.05, 0.05);
      g.fillStyle = '#fff';
      g.fill();
    } else if (mode === 1) {
      line(g, x - 0.13, ey + 0.02, x + 0.13, ey + 0.02, eye, 0.1);
    } else if (mode === 2) {
      ell(g, x, ey, 0.19, 0.23);
      g.fillStyle = eye;
      g.fill();
      ell(g, x + 0.06, ey - 0.08, 0.08, 0.08);
      g.fillStyle = '#fff';
      g.fill();
      ell(g, x - 0.06, ey + 0.08, 0.04, 0.04);
      g.fill();
    } else if (mode === 3) {
      g.beginPath();
      g.arc(x, ey + 0.06, 0.15, Math.PI * 1.1, Math.PI * 1.9);
      g.strokeStyle = eye;
      g.lineWidth = 0.11;
      g.stroke();
    } else if (mode === 4) {
      g.beginPath();
      g.moveTo(x - 0.14 * sx, ey - 0.12);
      g.lineTo(x + 0.1 * sx, ey);
      g.lineTo(x - 0.14 * sx, ey + 0.12);
      g.strokeStyle = eye;
      g.lineWidth = 0.1;
      g.stroke();
    } else {
      ell(g, x, ey + 0.03, 0.13, 0.1);
      g.fillStyle = eye;
      g.fill();
      line(g, x - 0.17, ey - 0.04, x + 0.17, ey - 0.04, k === 'peng' ? '#ffffff' : C.dark, 0.09);
    }
  }
  // 코·입
  if (k === 'peng') {
    const open = mode === 2 || mode === 3 || mode === 4;
    g.beginPath();
    g.moveTo(-0.22, 0.24);
    g.lineTo(0.22, 0.24);
    g.lineTo(0, open ? 0.42 : 0.5);
    g.closePath();
    ink(g, C.nose, 0.08);
    if (open) {
      g.beginPath();
      g.moveTo(-0.18, 0.5);
      g.lineTo(0.18, 0.5);
      g.lineTo(0, 0.68);
      g.closePath();
      ink(g, '#ff9a1a', 0.08);
    }
  } else {
    ell(g, 0, 0.2, k === 'bear' || k === 'dog' ? 0.14 : 0.1, k === 'bear' || k === 'dog' ? 0.1 : 0.07);
    g.fillStyle = C.nose;
    g.fill();
    g.strokeStyle = eye;
    g.lineWidth = 0.08;
    if (mode === 2) {
      ell(g, 0, 0.47, 0.12, 0.14);
      g.fillStyle = '#7a1a1a';
      g.fill();
    } else if (mode === 3 || mode === 4) {
      g.beginPath();
      g.moveTo(-0.3, 0.36);
      g.quadraticCurveTo(0, 0.82, 0.3, 0.36);
      g.closePath();
      ink(g, '#8a1a1a', 0.08, eye);
      ell(g, 0, 0.6, 0.13, 0.08);
      g.fillStyle = '#ff7a8a';
      g.fill();
      if (k === 'bunny') {
        rr(g, -0.1, 0.36, 0.2, 0.14, 0.03);
        ink(g, '#ffffff', 0.04, eye);
      }
    } else if (mode === 5) line(g, -0.15, 0.45, 0.15, 0.45, eye, 0.08);
    else {
      g.beginPath();
      g.moveTo(-0.2, 0.38);
      g.quadraticCurveTo(-0.1, 0.48, 0, 0.36);
      g.quadraticCurveTo(0.1, 0.48, 0.2, 0.38);
      g.stroke();
    }
    if (k === 'cat')
      for (const sx of [-1, 1]) {
        line(g, sx * 0.5, 0.3, sx * 1.15, 0.2, 'rgba(74,38,20,.6)', 0.04);
        line(g, sx * 0.5, 0.4, sx * 1.15, 0.45, 'rgba(74,38,20,.6)', 0.04);
      }
  }
  if (mode === 4) {
    ell(g, 0, 0, 1.05, 0.95);
    g.fillStyle = 'rgba(255,40,30,.28)';
    g.fill();
  }
  // 늘어진 귀 (강아지, 머리 앞)
  if (k === 'dog')
    for (const sx of [-1, 1]) {
      ell(g, sx * 0.95, -0.05, 0.3, 0.62, sx * -0.35);
      ink(g, lin(g, 0, -0.6, 0, 0.6, [0, C.dark], [1, '#7a4422']), lw);
    }
  shine(g, -0.4, -0.55, 0.28, 0.12, -0.5, 0.45);
}
const custSpr = (k: CK, mode: number, px: number) => spr('c' + k + mode, F_CUST, px, (g) => paintCust(g, k, mode));

/** 손가락 그림 (끝 = (0,0)) */
function paintHand(g: C2) {
  g.lineWidth = 0.09;
  g.strokeStyle = OUT;
  // 검지
  rr(g, -0.16, -0.05, 0.32, 1.0, 0.16);
  ink(g, '#ffffff', 0.09);
  // 손바닥
  rr(g, -0.2, 0.62, 1.15, 1.1, 0.38);
  ink(g, lin(g, 0, 0.6, 0, 1.7, [0, '#ffffff'], [1, '#e8eef8']), 0.09);
  for (let i = 0; i < 3; i++) {
    rr(g, 0.16 + i * 0.26, 0.6, 0.27, 0.42, 0.13);
    ink(g, '#ffffff', 0.08);
  }
  // 엄지
  ell(g, -0.25, 1.05, 0.2, 0.34, 0.5);
  ink(g, '#ffffff', 0.08);
  rr(g, -0.16, -0.05, 0.32, 1.0, 0.16);
  g.fillStyle = '#ffffff';
  g.fill();
  ell(g, 0, 0.12, 0.09, 0.07);
  g.fillStyle = 'rgba(255,170,170,.6)';
  g.fill();
}
const handSpr = (px: number) => spr('hand', F_HAND, px, paintHand);
/** 빛 번짐 */
const glowSpr = (col: string, px: number) =>
  spr('glow' + col, F_ITEM, px, (g) => {
    ell(g, 0, 0, 1.55, 1.55);
    g.fillStyle = rad(g, 0, 0, 0, 1.55, [0, `rgba(${col},0.9)`], [0.35, `rgba(${col},0.35)`], [1, `rgba(${col},0)`]);
    g.fill();
  });

// ───────────────────────────── 배경 굽기 ─────────────────────────────
/** 뒤: 밤하늘 · 먼 가게 · 차양 · 전구 줄 (카운터 윗면까지) */
function bakeBack(w: number, sc: number): HTMLCanvasElement {
  const H = (COUNTER_Y + 0.03) * w;
  return layer(w * sc, H * sc, (g) => {
    g.scale(sc, sc);
    g.lineJoin = 'round';
    g.lineCap = 'round';
    const X = (x: number) => x * w;
    g.fillStyle = lin(g, 0, 0, 0, H, [0, '#25275e'], [0.45, '#4a3a86'], [0.8, '#8a5c96'], [1, '#c98a8a']);
    g.fillRect(0, 0, w, H);
    // 별
    for (let i = 0; i < 26; i++) {
      g.fillStyle = `rgba(255,250,220,${0.35 + hash(i) * 0.5})`;
      g.fillRect(hash(i * 7 + 1) * w, (0.12 + hash(i * 13 + 2) * 0.12) * w, 1.6, 1.6);
    }
    // 먼 가게들 (실루엣 + 불 켜진 창 + 빨간 초롱)
    for (let i = 0; i < 7; i++) {
      const x0 = X(-0.05 + i * 0.16 + hash(i + 40) * 0.04), bw = X(0.13 + hash(i + 50) * 0.04), top = X(0.2 + hash(i + 60) * 0.06);
      g.fillStyle = i % 2 ? '#3d3170' : '#463a7c';
      g.beginPath();
      g.moveTo(x0, H);
      g.lineTo(x0, top + X(0.03));
      g.lineTo(x0 + bw / 2, top);
      g.lineTo(x0 + bw, top + X(0.03));
      g.lineTo(x0 + bw, H);
      g.closePath();
      g.fill();
      g.fillStyle = 'rgba(255,200,110,.75)';
      g.fillRect(x0 + bw * 0.2, top + X(0.06), bw * 0.25, X(0.03));
      g.fillRect(x0 + bw * 0.58, top + X(0.06), bw * 0.25, X(0.03));
      g.fillStyle = 'rgba(255,200,110,.25)';
      g.fillRect(x0 + bw * 0.1, top + X(0.05), bw * 0.8, X(0.05));
    }
    // 먼 초롱 줄
    g.beginPath();
    g.moveTo(0, X(0.205));
    g.quadraticCurveTo(w / 2, X(0.25), w, X(0.205));
    g.strokeStyle = 'rgba(40,20,40,.6)';
    g.lineWidth = 1;
    g.stroke();
    for (let i = 0; i < 8; i++) {
      const x = X(0.06 + i * 0.125), y = X(0.215 + 0.03 * Math.sin((Math.PI * (i + 0.5)) / 8));
      ell(g, x, y, X(0.03), X(0.03));
      g.fillStyle = rad(g, x, y, 0, X(0.03), [0, 'rgba(255,150,90,.55)'], [1, 'rgba(255,150,90,0)']);
      g.fill();
      ell(g, x, y, X(0.012), X(0.015));
      g.fillStyle = '#ff6a4a';
      g.fill();
    }
    // 보케
    for (let i = 0; i < 16; i++) {
      const x = hash(i * 3 + 5) * w, y = X(0.24 + hash(i * 5 + 7) * 0.17), r = X(0.012 + hash(i * 11) * 0.022);
      ell(g, x, y, r, r);
      g.fillStyle = ['rgba(255,210,120,.22)', 'rgba(255,150,120,.2)', 'rgba(255,235,180,.2)'][i % 3];
      g.fill();
    }
    // 거리 바닥 빛
    g.fillStyle = lin(g, 0, X(0.35), 0, H, [0, 'rgba(255,190,120,0)'], [1, 'rgba(255,190,120,.35)']);
    g.fillRect(0, X(0.35), w, H - X(0.35));
    // 차양: 빨강·크림 줄무늬 + 물결 끝
    const aw = X(0.105), st = 12;
    for (let i = 0; i < st; i++) {
      g.fillStyle = i % 2 ? '#fff1d8' : '#e8473c';
      g.fillRect((i * w) / st, 0, w / st + 1, aw);
    }
    for (let i = 0; i < st; i++) {
      const cx = ((i + 0.5) * w) / st, r = w / st / 2;
      g.beginPath();
      g.arc(cx, aw, r, 0, Math.PI);
      g.fillStyle = i % 2 ? '#fff1d8' : '#e8473c';
      g.fill();
      g.strokeStyle = 'rgba(90,30,20,.55)';
      g.lineWidth = 1.2;
      g.stroke();
    }
    g.fillStyle = lin(g, 0, 0, 0, aw, [0, 'rgba(60,20,20,.45)'], [0.6, 'rgba(60,20,20,0)'], [1, 'rgba(255,255,255,.12)']);
    g.fillRect(0, 0, w, aw);
    // 차양 아래 그늘
    g.fillStyle = lin(g, 0, aw, 0, aw + X(0.06), [0, 'rgba(20,10,40,.35)'], [1, 'rgba(20,10,40,0)']);
    g.fillRect(0, aw + X(0.02), w, X(0.06));
    pillars(g, w, 0.09 * w, H);
    // 전구 줄
    g.beginPath();
    g.moveTo(-2, X(0.128));
    g.quadraticCurveTo(w / 2, X(0.168), w + 2, X(0.128));
    g.strokeStyle = '#2a1a14';
    g.lineWidth = 1.4;
    g.stroke();
  });
}
/** 가게 기둥 (양옆) */
function pillars(g: C2, w: number, y0: number, y1: number) {
  for (const x0 of [0, w - w * 0.032]) {
    g.fillStyle = lin(g, x0, 0, x0 + w * 0.032, 0, [0, '#4a2610'], [0.5, '#7a4422'], [1, '#4a2610']);
    g.fillRect(x0, y0, w * 0.032, y1 - y0);
    line(g, x0 + (x0 ? 1 : w * 0.032 - 1), y0, x0 + (x0 ? 1 : w * 0.032 - 1), y1, 'rgba(255,200,140,.35)', 1.2);
  }
}
/** 빨간 종이 초롱 */
function lantern(g: C2, x: number, y: number, r: number) {
  line(g, x, y - r * 2.2, x, y - r * 0.9, '#2a1a14', 1.2);
  ell(g, x, y, r * 1.6, r * 1.6);
  g.fillStyle = rad(g, x, y, 0, r * 1.6, [0, 'rgba(255,170,90,.45)'], [1, 'rgba(255,170,90,0)']);
  g.fill();
  ell(g, x, y, r * 0.85, r);
  ink(g, rad(g, x - r * 0.2, y - r * 0.3, r * 0.1, r, [0, '#ffb08a'], [0.6, '#f0402a'], [1, '#b8201a']), 1.2, '#5a1008');
  for (const k of [-0.45, 0, 0.45]) {
    g.beginPath();
    g.ellipse(x, y, r * 0.85 * Math.abs(k || 0.05), r, 0, -Math.PI / 2, Math.PI / 2, k < 0);
    g.strokeStyle = 'rgba(120,20,10,.45)';
    g.lineWidth = 1;
    g.stroke();
  }
  rr(g, x - r * 0.4, y - r * 1.12, r * 0.8, r * 0.22, 2);
  ink(g, '#ffcf3a', 1, '#6a4a0a');
  rr(g, x - r * 0.4, y + r * 0.9, r * 0.8, r * 0.22, 2);
  ink(g, '#ffcf3a', 1, '#6a4a0a');
  line(g, x, y + r * 1.12, x, y + r * 1.7, '#ffcf3a', 1.5);
}
/** 전구 자리 (전구 줄 위) */
const BULBS = Array.from({ length: 11 }, (_, i) => {
  const x = 0.04 + i * 0.092, y = 0.128 + 0.04 * (1 - (2 * x - 1) ** 2) * 0.5 + 0.006;
  return { x, y, col: ['255,214,90', '255,150,90', '255,120,170', '150,230,190'][i % 4] };
});
/** 앞: 카운터 · 작업대 · 숯불 불판 */
function bakeFront(w: number, h: number, sc: number): HTMLCanvasElement {
  const y0 = (COUNTER_Y - 0.11) * w;
  return layer(w * sc, (h - y0) * sc, (g) => {
    g.scale(sc, sc);
    g.translate(0, -y0);
    g.lineJoin = 'round';
    g.lineCap = 'round';
    const X = (x: number) => x * w;
    // 작업대 (나무 판)
    const t0 = X(COUNTER_Y + 0.04), t1 = X(GRILL_Y - 0.02);
    for (let i = 0; i < 7; i++) {
      g.fillStyle = i % 2 ? '#a5643a' : '#9a5a33';
      g.fillRect((i * w) / 7, t0, w / 7 + 1, t1 - t0);
      line(g, (i * w) / 7, t0, (i * w) / 7, t1, 'rgba(60,25,10,.35)', 1.2);
      for (let k = 0; k < 4; k++) {
        const yy = t0 + hash(i * 9 + k) * (t1 - t0);
        line(g, (i * w) / 7 + X(0.02), yy, (i * w) / 7 + X(0.11), yy + X(0.01), 'rgba(70,30,10,.18)', 1);
      }
    }
    g.fillStyle = rad(g, w / 2, X(1.3), X(0.1), X(0.9), [0, 'rgba(255,170,80,.5)'], [0.6, 'rgba(255,140,60,.15)'], [1, 'rgba(255,140,60,0)']);
    g.fillRect(0, t0, w, t1 - t0);
    g.fillStyle = lin(g, 0, t0, 0, t0 + X(0.12), [0, 'rgba(30,10,10,.45)'], [1, 'rgba(30,10,10,0)']);
    g.fillRect(0, t0, w, X(0.12));
    g.fillStyle = rad(g, w / 2, X(0.66), X(0.05), X(0.62), [0, 'rgba(255,232,170,.22)'], [1, 'rgba(255,232,170,0)']);
    g.fillRect(0, t0, w, t1 - t0);
    pillars(g, w, X(COUNTER_Y - 0.11), t1 + X(0.02));
    for (const [x, y] of [[0.016, 0.6], [0.984, 0.66]]) lantern(g, X(x), X(y), X(0.034));
    // 옆 소품: 왼쪽 대나무 꼬치 통 · 오른쪽 양념 그릇
    {
      const cx = X(0.085), cy = X(1.19);
      for (let i = 0; i < 7; i++) line(g, cx - X(0.02) + i * X(0.007), cy - X(0.02), cx - X(0.03) + i * X(0.01), cy - X(0.13) - hash(i) * X(0.02), '#e8c27a', 2);
      rr(g, cx - X(0.035), cy - X(0.04), X(0.07), X(0.08), X(0.012));
      ink(g, lin(g, cx - X(0.035), 0, cx + X(0.035), 0, [0, '#7ab84a'], [1, '#4a8a2a']), 1.5);
      const bx = X(0.915), by = X(1.2);
      ell(g, bx, by, X(0.05), X(0.022));
      ink(g, '#f4f0e8', 1.5);
      ell(g, bx, by - X(0.004), X(0.04), X(0.014));
      g.fillStyle = '#c8401a';
      g.fill();
    }
    // 카운터 (윗면 + 앞면)
    const c0 = X(COUNTER_Y - 0.02), c1 = X(COUNTER_Y + 0.012), c2 = X(COUNTER_Y + 0.05);
    g.fillStyle = 'rgba(20,10,10,.35)';
    g.fillRect(0, c2, w, X(0.018));
    g.fillStyle = lin(g, 0, c0, 0, c1, [0, '#ffd99a'], [1, '#e0a462']);
    g.fillRect(0, c0, w, c1 - c0);
    line(g, 0, c0 + 1, w, c0 + 1, 'rgba(255,255,255,.7)', 1.5);
    g.fillStyle = lin(g, 0, c1, 0, c2, [0, '#b8723c'], [1, '#8a4c24']);
    g.fillRect(0, c1, w, c2 - c1);
    for (let i = 1; i < 9; i++) line(g, (i * w) / 9, c1, (i * w) / 9, c2, 'rgba(60,25,10,.4)', 1);
    line(g, 0, c1, w, c1, OUT, 1.2);
    // 카운터 위 소품: 양념병 둘 · 포장 봉투
    for (const [x, col] of [[0.055, '#ff4a3a'], [0.092, '#ffcf2a']] as [number, string][]) {
      rr(g, X(x - 0.014), c0 - X(0.06), X(0.028), X(0.062), X(0.008));
      ink(g, lin(g, X(x - 0.014), 0, X(x + 0.014), 0, [0, col], [1, '#00000033']), 1.2);
      g.beginPath();
      g.moveTo(X(x - 0.007), c0 - X(0.06));
      g.lineTo(X(x), c0 - X(0.085));
      g.lineTo(X(x + 0.007), c0 - X(0.06));
      g.closePath();
      ink(g, '#ffffff', 1);
    }
    {
      const bx = X(0.928), by = c0 + X(0.005);
      g.beginPath();
      g.moveTo(bx - X(0.035), by);
      g.lineTo(bx - X(0.03), by - X(0.07));
      g.lineTo(bx + X(0.03), by - X(0.07));
      g.lineTo(bx + X(0.035), by);
      g.closePath();
      ink(g, lin(g, 0, by - X(0.07), 0, by, [0, '#e6c08a'], [1, '#c89a5e']), 1.2);
      line(g, bx - X(0.03), by - X(0.06), bx + X(0.03), by - X(0.06), 'rgba(90,50,20,.5)', 1);
    }
    // 숯불 불판
    const g0 = X(GRILL_Y - 0.03), g1 = X(GRILL_B + 0.02);
    rr(g, X(0.015), g0, X(0.97), g1 - g0, X(0.03));
    ink(g, lin(g, 0, g0, 0, g1, [0, '#4a4244'], [0.2, '#2a2426'], [1, '#1a1416']), 2, '#120c0c');
    rr(g, X(0.045), g0 + X(0.022), X(0.91), g1 - g0 - X(0.04), X(0.018));
    g.fillStyle = rad(g, w / 2, X(1.37), X(0.05), X(0.6), [0, '#ff8a2a'], [0.35, '#d8401a'], [0.75, '#6a1a0e'], [1, '#2a0c08']);
    g.fill();
    // 숯: 빛나는 바닥 위에 검은 숯 조각, 틈과 가장자리가 주황으로 달아오른다
    g.save();
    rr(g, X(0.045), g0 + X(0.022), X(0.91), g1 - g0 - X(0.04), X(0.018));
    g.clip();
    for (let row = 0; row < 4; row++)
      for (let col = 0; col < 15; col++) {
        const i = row * 15 + col, x = X(0.05 + (col + (row % 2) * 0.5) * 0.062 + (hash(i * 3) - 0.5) * 0.02), y = X(GRILL_Y + 0.012 + row * 0.05 + (hash(i * 5) - 0.5) * 0.015);
        const r = X(0.028 + hash(i * 7) * 0.01);
        g.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * TAU + hash(i + k * 11) * 0.6, q = r * (0.75 + hash(i * 13 + k) * 0.35);
          if (k) g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q * 0.72);
          else g.moveTo(x + Math.cos(a) * q, y + Math.sin(a) * q * 0.72);
        }
        g.closePath();
        const hot = hash(i * 17);
        g.fillStyle = lin(g, 0, y - r, 0, y + r, [0, hot < 0.3 ? '#6a5048' : '#4a3a36'], [0.6, '#2a1e1a'], [1, hot < 0.5 ? '#8a2a10' : '#1a1210']);
        g.fill();
        g.strokeStyle = hot < 0.45 ? 'rgba(255,150,50,.95)' : 'rgba(255,110,40,.55)';
        g.lineWidth = hot < 0.45 ? 2 : 1.2;
        g.stroke();
        if (hot > 0.7) {
          ell(g, x - r * 0.2, y - r * 0.25, r * 0.35, r * 0.18);
          g.fillStyle = 'rgba(230,220,215,.35)';
          g.fill();
        }
      }
    g.restore();
    // 석쇠
    for (const y of [1.29, 1.335, 1.38, 1.425]) {
      line(g, X(0.04), X(y) + 1.5, X(0.96), X(y) + 1.5, 'rgba(0,0,0,.45)', 2.5);
      line(g, X(0.04), X(y), X(0.96), X(y), '#b8b0aa', 2.2);
      line(g, X(0.04), X(y) - 0.6, X(0.96), X(y) - 0.6, 'rgba(255,255,255,.55)', 0.8);
    }
    for (let i = 0; i < 7; i++) line(g, X(0.08 + i * 0.14), g0 + X(0.02), X(0.08 + i * 0.14), g1 - X(0.02), 'rgba(150,140,135,.6)', 1.2);
    // 테두리 윗면 빛
    line(g, X(0.04), g0 + 1.5, X(0.96), g0 + 1.5, 'rgba(255,200,160,.45)', 1.5);
    // 불판 앞 판
    for (const x of [0.06, 0.94]) {
      ell(g, X(x), g1 - X(0.018), 2.2, 2.2);
      g.fillStyle = '#8a8284';
      g.fill();
    }
  });
}

// ───────────────────────────── 장면 그리기 ─────────────────────────────
interface Puff { x: number; y: number; vx: number; vy: number; r: number; life: number; max: number; col: string; grow: number }
interface Ember { x: number; y: number; vx: number; vy: number; life: number }
interface Pop { x: number; y: number; str: string; col: string; size: number; age: number; life: number; delay: number; tags: [string, string][] }
interface View { pops: Pop[]; lastPop: number; sizNext: number; ready: Set<number>; zoom: { t: number; x: number; y: number; k: number } | null; lastT: number; lastEv: number; puffs: Puff[]; embers: Ember[]; sq: { due: number; name: SfxN; p: number; v: number }[]; lastDue: number; disp: number; flash: Map<number, number> }
type SfxN = 'pop' | 'thud' | 'whoosh' | 'ding' | 'chime' | 'splash' | 'crack' | 'boing' | 'swell' | 'shrink' | 'coin' | 'clear' | 'tick' | 'zap';
const VIEW = new WeakMap<object, View>();
const BG = new Map<string, { b: HTMLCanvasElement; f: HTMLCanvasElement; vig: HTMLCanvasElement }>();
/** 도레미솔라 — 꿰일 때마다 한 칸씩 올라간다 */
/** 불판 위 꼬치 배율 */
const RACK_K = 0.6;
const SCALE = [1, 1.122, 1.26, 1.498, 1.682, 2, 2.245, 2.52, 2.996];
const easeOut = (f: number) => 1 - (1 - f) ** 3;
const easeBack = (f: number) => 1 + 2.4 * (f - 1) ** 3 + 1.4 * (f - 1) ** 2;
const now = () => (typeof performance !== 'undefined' ? performance.now() : 0);
const fmt = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/** 자주 쓰는 글자는 한 번 구워 찍는다 (느린 폰에서 글자 모양 잡기가 무겁다) */
const GLY = new Map<string, HTMLCanvasElement>();
function gtext(ctx: C2, str: string, x: number, y: number, px: number, wgt: number, fill: string, stroke = '', lw = 0, align: 'center' | 'left' | 'right' = 'center') {
  const sc = DPR, size = Math.max(11, Math.round(px)), key = `${str}|${size}|${wgt}|${fill}|${stroke}|${lw}|${sc}`;
  let cv = GLY.get(key);
  if (!cv) {
    if (GLY.size > 400) GLY.clear();
    const font = `${wgt} ${size}px system-ui, sans-serif`;
    const probe = probeCtx();
    probe.font = font;
    const tw = Math.ceil(probe.measureText(str).width + lw * 2 + 4), th = Math.ceil(size * 1.35 + lw * 2);
    cv = layer(tw * sc, th * sc, (g) => {
      g.scale(sc, sc);
      g.font = font;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineJoin = 'round';
      if (lw > 0) (g.lineWidth = lw), (g.strokeStyle = stroke), g.strokeText(str, tw / 2, th / 2);
      g.fillStyle = fill;
      g.fillText(str, tw / 2, th / 2);
    });
    GLY.set(key, cv);
  }
  const cw = cv.width / sc, ch = cv.height / sc;
  ctx.drawImage(cv, align === 'center' ? x - cw / 2 : align === 'left' ? x - 2 : x - cw + 2, y - ch / 2, cw, ch);
}

/** 바뀌는 숫자(점수 올라감)는 글자 하나씩 구워 찍는다 — 값마다 새로 굽지 않게 */
const CH = new Map<string, { cv: HTMLCanvasElement; adv: number }>();
let PROBE: C2 | null = null;
const probeCtx = () => PROBE ?? (PROBE = document.createElement('canvas').getContext('2d')!);
const POP_INK = 'rgba(60,20,10,.85)';
/** 글자 조각을 미리 구울 때 쓰는 빈 그림판 (배율만 맞춘다) */
const GCTX = new Map<number, C2>();
const GLY_CTX = (sc: number) => {
  let c = GCTX.get(sc);
  if (!c) {
    c = document.createElement('canvas').getContext('2d')!;
    c.setTransform(sc, 0, 0, sc, 0, 0);
    GCTX.set(sc, c);
  }
  return c;
};
function ntext(ctx: C2, str: string, x: number, y: number, px: number, wgt: number, fill: string, stroke = '', lw = 0, align: 'center' | 'left' = 'center') {
  const sc = DPR, size = Math.max(11, Math.round(px)), font = `${wgt} ${size}px system-ui, sans-serif`;
  const gl: { cv: HTMLCanvasElement; adv: number }[] = [];
  let tw = 0;
  for (const c of str) {
    const key = `${c}|${size}|${wgt}|${fill}|${stroke}|${lw}|${sc}`;
    let g = CH.get(key);
    if (!g) {
      if (CH.size > 700) CH.clear();
      const probe = probeCtx();
      probe.font = font;
      const adv = probe.measureText(c).width, cw = Math.ceil(adv + lw * 2 + 4), chh = Math.ceil(size * 1.35 + lw * 2);
      const cv = layer(cw * sc, chh * sc, (q) => {
        q.scale(sc, sc);
        q.font = font;
        q.textAlign = 'center';
        q.textBaseline = 'middle';
        q.lineJoin = 'round';
        if (lw > 0) (q.lineWidth = lw), (q.strokeStyle = stroke), q.strokeText(c, cw / 2, chh / 2);
        q.fillStyle = fill;
        q.fillText(c, cw / 2, chh / 2);
      });
      CH.set(key, (g = { cv, adv }));
    }
    gl.push(g);
    tw += g.adv;
  }
  let cx = align === 'center' ? x - tw / 2 : x;
  for (const g of gl) {
    const cw = g.cv.width / sc, chh = g.cv.height / sc;
    ctx.drawImage(g.cv, cx + g.adv / 2 - cw / 2, y - chh / 2, cw, chh);
    cx += g.adv;
  }
}
function viewOf(s: S): View {
  let v = VIEW.get(s);
  if (!v) VIEW.set(s, (v = { pops: [], lastPop: 0, sizNext: 0, ready: new Set(), zoom: null, lastT: s.t, lastEv: s.evN, puffs: [], embers: [], sq: [], lastDue: 0, disp: s.dayScore, flash: new Map() }));
  return v;
}
function puff(V: View, x: number, y: number, n: number, col: string, spread = 0.02, up = 0.0035, r = 0.018) {
  for (let i = 0; i < n; i++) {
    if (V.puffs.length > 36) V.puffs.shift();
    const a = hash(V.puffs.length * 31 + i * 7 + Math.round(x * 997)), b = hash(i * 13 + Math.round(y * 991));
    V.puffs.push({ x: x + (a - 0.5) * spread * 2, y, vx: (a - 0.5) * 0.002, vy: -up * (0.6 + b * 0.8), r: r * (0.7 + b * 0.6), life: 40 + b * 24, max: 64, col, grow: 1.012 });
  }
}
/** 떠오르는 숫자 (글자 조각을 구워 찍는다). kind 0 = 재료 하나(떼면 합계로 빨려 듦) · 1 = 합계·보너스 · 2 = 곱하기(같이 빨려 듦) */
const POP_SIZES = [28, 34, 40, 48], WHITE = '#ffffff', GOLD = '#ffd23f', PINK = '#ffd2e2';
/** 떠오르는 숫자는 사건마다 하나(합계·손님 보너스) — 곱하기는 합계 옆 작은 딱지 */
function addPop(V: View, x: number, y: number, str: string, col: string, size: number, delay = 0, tags: [string, string][] = []) {
  if (V.pops.length > 8) V.pops.shift();
  const q = POP_SIZES.find((z) => z >= size) ?? 48;
  V.pops.push({ x, y, str, col, size: q, age: 0, life: 62, delay, tags });
}
function drawPops(ctx: C2, V: View, dn: number) {
  for (const p of V.pops) {
    if (p.delay > 0) {
      p.delay -= dn;
      continue;
    }
    p.age += dn;
    const k = 1 + 0.6 * Math.max(0, 1 - p.age / 7), a = Math.min(1, p.life / 14);
    p.y -= 0.5 * dn;
    p.life -= dn;
    if (p.life <= 0) continue;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(p.x, p.y);
    ctx.scale(k, k);
    // 합계는 글자 조각으로 (값이 늘 달라 통째로 구우면 매번 새로 굽는다)
    ntext(ctx, p.str, 0, 0, p.size, 900, p.col, POP_INK, 4);
    // 곱하기 딱지: 합계 오른쪽 위에 작게, 하나씩 톡톡 붙는다
    let tx = p.str.length * p.size * 0.3 + 6;
    for (let i = 0; i < p.tags.length; i++) {
      if (p.age < 5 + i * 4) break;
      const [t, col] = p.tags[i], tw = 12 + t.length * 8, kk = easeBack(Math.min(1, (p.age - 5 - i * 4) / 6));
      ctx.save();
      ctx.translate(tx + tw / 2, -p.size * 0.42);
      ctx.scale(kk, kk);
      ctx.rotate(-0.12);
      rr(ctx, -tw / 2, -11, tw, 22, 11);
      ink(ctx, col, 2, '#5a2a0a');
      gtext(ctx, t, 0, 0.5, 15, 900, '#5a2a0a');
      ctx.restore();
      tx += tw + 4;
    }
    ctx.restore();
  }
  V.pops = V.pops.filter((p) => p.life > 0);
}
function queue(V: View, name: SfxN, p: number, v: number, gap = 0) {
  const t = now(), due = gap ? Math.max(t, V.lastDue + gap) : t;
  if (gap) V.lastDue = due;
  V.sq.push({ due, name, p, v });
  return due;
}
/** 재료마다 꿰이는 소리: 떡 퐁 · 소시지 낮은 퐁 · 새우 뾰옹 · 대왕 쿵 · 황금알 딸랑 */
const SK_SND: Record<IK, [SfxN, number]> = { tteok: ['pop', 0.9], saus: ['pop', 0.7], leek: ['pop', 1.2], shrimp: ['boing', 1.4], pine: ['pop', 1.05], mallow: ['pop', 1.45], big: ['thud', 1.0], egg: ['chime', 1.6], chili: ['zap', 1.2], burnt: ['thud', 1.7] };
/** 사건 → 연출·소리 (시뮬레이션은 소리를 모른다) */
function fxEvents(s: S, V: View, w: number) {
  const fx = juice(s), X = (x: number) => x * w;
  for (const e of s.ev) {
    if (e.id <= V.lastEv) continue;
    V.lastEv = e.id;
    const x = X(e.x), y = X(e.y);
    switch (e.k) {
      case 'pop':
        // 퐁 — 한 묶음이 한꺼번에 올라와도 퐁퐁퐁 하나씩
        V.lastPop = Math.max(now(), V.lastPop + 42);
        V.sq.push({ due: V.lastPop, name: 'pop', p: 0.42 + hash(e.id * 3) * 0.16, v: 0.24 });
        puff(V, e.x, GRILL_Y - 0.005, 1, 'rgba(255,240,220,.5)', 0.01, 0.002, 0.012);
        break;
      case 'press':
        queue(V, 'whoosh', 1.7, 0.25);
        break;
      case 'sk': {
        const n = e.n, col = IKD[e.a as IK].col;
        const due = queue(V, 'ding', SCALE[Math.min(8, n - 1)] * 0.75, 0.34, 60), [sn, sp] = SK_SND[e.a as IK];
        V.sq.push({ due, name: sn, p: sp * (1 + n * 0.03), v: 0.8 });
        fx.burst(x, y, col, 4 + (n >> 1), 2.2 + n * 0.25, 2.8);
        fx.burst(x, y, '#ffffff', 2, 3, 1.8);
        fx.ring(x, y, 'rgba(255,255,255,.9)', X(0.05 + n * 0.006), 3);
        fx.kick(0.8 + n * 0.4);
        V.flash.set(e.n, s.t);
        if (e.a === 'chili') fx.burst(x, y, '#ff5a2a', 10, 3.5, 3);
        if (e.a === 'burnt') (puff(V, e.x, e.y, 4, 'rgba(60,50,50,.55)', 0.02, 0.004, 0.022));
        break;
      }
      case 'trip':
        queue(V, 'chime', 1.15, 0.8);
        fx.burst(x, y, '#fff3a0', 10, 5, 2.8);
        fx.ring(x, y, '#ffd23f', X(0.16), 5);
        break;
      case 'done': {
        const v = e.v, n = e.n, f = e.a;
        queue(V, 'boing', 0.7 + n * 0.05, 0.55);
        const size = Math.round(22 + Math.min(32, v / 28));
        // 합계 하나만 크게 + 곱하기 딱지
        const tags: [string, string][] = [];
        if (f.includes('t')) tags.push(['×2', '#ffd23f']);
        if (f.includes('p')) tags.push(['×1.5', '#ffe766']);
        if (f.includes('e')) tags.push(['×2', '#ffd84a']);
        if (f.includes('c')) tags.push(['×½', '#ff8a7a']);
        const tx = clamp(x - X(0.04) * tags.length, X(0.2), X(0.66)), ty = Math.max(X(0.52), y - X(0.16));
        addPop(V, tx, ty, '+' + fmt(v), n >= 4 ? GOLD : WHITE, size, 4, tags);
        if (n >= 4) V.zoom = { t: s.t, x, y, k: n >= 6 ? 0.07 : 0.035 };
        if (n >= 6) {
          fx.kick(10);
          fx.blink('#fff0b0', 0.4);
          queue(V, 'thud', 0.7, 1);
          queue(V, 'swell', 1.1, 0.6);
          fx.burst(x, y, '#ffd23f', 16, 6, 3.8);
          fx.ring(x, y, '#ffd23f', X(0.4), 7);
        } else if (n >= 4) (fx.kick(4), fx.ring(x, y, '#ffe9a0', X(0.22), 5));
        if (f.includes('t')) fx.burst(x, y, '#fff3a0', 10, 5, 2.8);
        if (f.includes('e')) queue(V, 'chime', 1.5, 0.7);
        if (f.includes('c')) queue(V, 'crack', 0.9, 0.6);
        if (f.includes('m')) queue(V, 'ding', 1.5, 0.5);
        break;
      }
      case 'miss':
        queue(V, 'whoosh', 0.85, 0.6);
        break;
      case 'land':
        queue(V, 'thud', 1.5, 0.45);
        queue(V, 'splash', 1.9, 0.55);
        puff(V, 0.5, e.y - 0.01, 6 + e.n, 'rgba(255,255,255,.62)', 0.18, 0.004, 0.026);
        fx.burst(x, y, '#ffb36a', 5, 3, 2);
        if (e.a === 'c') (fx.burst(x, y, '#ff4a1a', 12, 5, 3.6), fx.burst(x, y, '#ffd23f', 6, 4, 2.6), fx.kick(5), queue(V, 'crack', 0.7, 0.8));
        break;
      case 'puff':
        queue(V, 'pop', 0.5, 1);
        fx.burst(x, y, '#ffd2e2', 12, 5, 3.6);
        fx.burst(x, y, '#ffffff', 6, 4, 3);
        addPop(V, x, y - X(0.08), '+' + e.v, PINK, 28);
        fx.kick(3);
        break;
      case 'serve': {
        const bear = e.a.startsWith('bear'), hot = e.a.endsWith(':hot');
        queue(V, 'coin', 1, 0.8);
        queue(V, 'chime', bear ? 0.8 : 1.25, 0.65);
        fx.burst(x, y, '#ff7aa2', 10, 4, 3.4);
        fx.burst(x, y - X(0.04), '#ffe14a', 6, 5, 2.6);
        addPop(V, x, y - X(0.12), '+' + e.v, GOLD, bear ? 40 : 28);
        if (bear) (fx.kick(9), queue(V, 'thud', 0.55, 1), queue(V, 'clear', 0.9, 0.6), fx.blink('#ffe0a0', 0.3));
        if (hot) (fx.burst(x, y + X(0.04), '#ff4a1a', 12, 5, 3.4), queue(V, 'zap', 0.7, 0.7));
        break;
      }
      case 'sell':
        queue(V, 'coin', 1.35, 0.4);
        fx.burst(x, y - X(0.03), '#ffd23f', 6, 2.5, 2);
        break;
      case 'drop':
        puff(V, e.x, GRILL_Y, 1, 'rgba(255,255,255,.4)', 0.01, 0.003, 0.014);
        break;
      case 'bored':
        queue(V, 'shrink', 0.7, 0.25);
        break;
      case 'tick':
        queue(V, 'tick', e.n <= 3 ? 1.3 : 1, 0.9);
        break;
      case 'close':
        queue(V, 'ding', 0.8, 0.9);
        queue(V, 'clear', 1, 0.8);
        break;
      case 'day':
        queue(V, 'swell', 1.1, 0.5);
        break;
      case 'first':
        queue(V, 'ding', 1.4, 0.5);
        fx.ring(x, y, '#ffe14a', X(0.16), 4);
        break;
    }
  }
  // 불판은 늘 지글지글 (손 안 대도 살아 있는 소리) — 꼬치가 올라가 있으면 더 크게
  if (s.phase !== 'end' && s.t >= V.sizNext) {
    const rack = s.done.some((d) => d.t >= T_LAND && d.t < T_GIVE);
    V.sizNext = s.t + 16 + Math.floor(hash(s.t) * 22);
    queue(V, 'splash', 2.3 + hash(s.t * 3) * 0.7, rack ? 0.16 : 0.08);
    if (hash(s.t * 7) < 0.5) queue(V, 'tick', 0.7 + hash(s.t * 5) * 0.8, 0.35);
  }
  const t = now();
  V.sq.sort((a, b) => a.due - b.due);
  while (V.sq.length && V.sq[0].due <= t + 1) {
    const q = V.sq.shift()!;
    fx.sound(q.name, q.p, q.v);
  }
  if (V.sq.length > 24) V.sq.splice(0, V.sq.length - 24);
}
/** 김·연기·불씨 (그리기 전용) */
function tickAmbient(s: S, V: View, n: number) {
  for (let k = 0; k < n; k++) {
    const tt = s.t - n + k;
    if (tt % 7 === 0 && V.embers.length < 12) V.embers.push({ x: 0.08 + hash(tt) * 0.84, y: GRILL_Y + 0.02 + hash(tt * 3) * 0.12, vx: (hash(tt * 5) - 0.5) * 0.001, vy: -0.0035 - hash(tt * 7) * 0.003, life: 50 + hash(tt * 9) * 40 });
    if (tt % 9 === 0) puff(V, 0.1 + hash(tt * 11) * 0.8, GRILL_Y + 0.04, 1, 'rgba(255,255,255,.16)', 0.02, 0.0022, 0.03);
    for (const d of s.done) if (d.t >= T_LAND && d.t < T_GIVE && (tt + d.id) % 5 === 0) puff(V, 0.5 + (hash(tt + d.id) - 0.5) * d.len * 0.8, RACK_Y[d.row] - 0.01, 1, 'rgba(255,255,255,.5)', 0.01, 0.0045, 0.02);
    for (const it of s.items) if (it.k === 'burnt' && it.wait <= 0 && (tt + it.id) % 6 === 0) puff(V, it.x, it.y - 0.02, 1, 'rgba(70,60,60,.45)', 0.005, 0.002, 0.014);
    for (const p of V.puffs) (p.x += p.vx), (p.y += p.vy), (p.vy *= 0.985), (p.r *= p.grow), p.life--;
    for (const e of V.embers) (e.x += e.vx + Math.sin((e.life + e.y * 900) * 0.15) * 0.0006), (e.y += e.vy), e.life--;
  }
  V.puffs = V.puffs.filter((p) => p.life > 0);
  V.embers = V.embers.filter((e) => e.life > 0 && e.y > AIR_TOP);
}

/** 꼬치 하나 (가운데 cx·cy, 각도 ang, 배율 k): 대나무 막대 + 재료 (재료는 늘 똑바로 서서 웃는다) */
function drawStick(ctx: C2, kinds: IK[], cx: number, cy: number, ang: number, k: number, mode: number, w: number, sc: number, fresh = -1, alpha = 1) {
  const R = (u: number) => u * w * k;
  let L = 0;
  for (const q of kinds) L += IKD[q].r * SPACE;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx * w, cy * w);
  ctx.rotate(ang);
  const a0 = -R(L / 2 + 0.07), a1 = R(L / 2 + 0.05);
  stickLine(ctx, a0, a1, R(1));
  let x = -L / 2;
  for (let i = 0; i < kinds.length; i++) {
    const q = kinds[i], r = IKD[q].r, u = r * w * k;
    x += r * SPACE * 0.5;
    ctx.save();
    ctx.translate(R(x), 0);
    ctx.rotate(-ang);
    const pop = fresh >= 0 ? Math.max(0, 1 - Math.abs(fresh - i * 1.2) / 4) : 0;
    if (pop) ctx.scale(1 + pop * 0.25, 1 + pop * 0.25);
    stamp(ctx, itemSpr(q, mode, u * sc), F_ITEM, u);
    ctx.restore();
    x += r * SPACE * 0.5;
  }
  ctx.restore();
}
function stickLine(ctx: C2, a0: number, a1: number, u: number) {
  const lw = Math.max(2.5, u * 0.016);
  ctx.lineCap = 'round';
  line(ctx, a0, 0, a1, 0, OUT, lw + 2.2);
  line(ctx, a0, 0, a1, 0, '#f0c878', lw);
  line(ctx, a0, -lw * 0.2, a1, -lw * 0.2, 'rgba(255,250,225,.75)', lw * 0.3);
  ctx.beginPath();
  ctx.moveTo(a1 + lw * 2.2, 0);
  ctx.lineTo(a1 - lw * 0.2, -lw * 0.75);
  ctx.lineTo(a1 - lw * 0.2, lw * 0.75);
  ctx.closePath();
  ctx.fillStyle = '#f0c878';
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ell(ctx, a0, 0, lw * 0.75, lw * 0.75);
  ctx.fillStyle = '#c89a52';
  ctx.fill();
}
/** 다 꿰인 꼬치의 지금 모습: 펴짐 → 불판으로 휙 → 지글 → 손님에게 */
function donePose(d: Done) {
  const t = d.t, ra = Math.cos(d.ang) >= 0 ? 0 : Math.PI, rx = 0.5, ry = RACK_Y[d.row];
  if (t < T_STRAIGHT) return { cx: d.cx, cy: d.cy, ang: d.ang, k: 1, mode: 1, f: t / T_STRAIGHT, ph: 0 };
  if (t < T_LAND) {
    const f = easeOut((t - T_STRAIGHT) / (T_LAND - T_STRAIGHT));
    let da = ra - d.ang;
    while (da > Math.PI) da -= TAU;
    while (da < -Math.PI) da += TAU;
    return { cx: d.cx + (rx - d.cx) * f, cy: d.cy + (ry - d.cy) * f - 0.12 * Math.sin(Math.PI * f), ang: d.ang + da * f, k: 1 - (1 - RACK_K) * f, mode: 1, f, ph: 1 };
  }
  if (t < T_GIVE) return { cx: rx, cy: ry, ang: ra, k: RACK_K, mode: t > T_LAND + 3 ? 2 : 1, f: (t - T_LAND) / (T_GIVE - T_LAND), ph: 2 };
  const f = easeOut((t - T_GIVE) / (T_DELIV - T_GIVE));
  const tx = d.cust >= 0 ? CUST_X[d.cust] + 0.07 : 0.928, ty = d.cust >= 0 ? CUST_Y + 0.02 : COUNTER_Y - 0.05;
  let da = -Math.PI / 2 - ra;
  while (da > Math.PI) da -= TAU;
  while (da < -Math.PI) da += TAU;
  return { cx: rx + (tx - rx) * f, cy: ry + (ty - ry) * f - 0.18 * Math.sin(Math.PI * f), ang: ra + da * f, k: RACK_K - (d.cust >= 0 ? 0.2 : 0.3) * f, mode: 2, f, ph: 3 };
}
function drawDone(ctx: C2, s: S, d: Done, w: number, sc: number) {
  const P = donePose(d), kinds = d.on.map((o) => o.k);
  if (P.ph === 0) {
    // 펴지는 중: 꿰인 자리 → 곧은 자리 (트왕 흔들림)
    const f = easeBack(Math.min(1, P.f + 0.12));
    let L = 0;
    for (const q of kinds) L += IKD[q].r * SPACE;
    const ca = Math.cos(d.ang), sa = Math.sin(d.ang), wob = Math.sin(d.t * 1.6) * (1 - P.f) * 0.012;
    const a = { x: d.cx - ca * (L / 2 + 0.07), y: d.cy - sa * (L / 2 + 0.07) }, b = { x: d.cx + ca * (L / 2 + 0.05), y: d.cy + sa * (L / 2 + 0.05) };
    ctx.save();
    ctx.translate(a.x * w, a.y * w);
    ctx.rotate(d.ang);
    stickLine(ctx, 0, Math.hypot(b.x - a.x, b.y - a.y) * w, w);
    ctx.restore();
    let x = -L / 2;
    for (const o of d.on) {
      const r = IKD[o.k].r;
      x += r * SPACE * 0.5;
      const tx = d.cx + ca * x - sa * wob, ty = d.cy + sa * x + ca * wob;
      const px = o.x + (tx - o.x) * f, py = o.y + (ty - o.y) * f, u = r * w;
      ctx.save();
      ctx.translate(px * w, py * w);
      ctx.scale(1 + 0.12 * (1 - P.f), 1 - 0.1 * (1 - P.f));
      stamp(ctx, itemSpr(o.k, 1, u * sc), F_ITEM, u);
      ctx.restore();
      x += r * SPACE * 0.5;
    }
    return;
  }
  const jit = P.ph === 2 ? Math.sin(s.t * 2.1 + d.id) * 0.0016 : 0;
  const land = P.ph === 2 && d.t - T_LAND < 6 ? 1 - (d.t - T_LAND) / 6 : 0;
  if (P.ph === 2 && d.mallow && d.t >= T_LAND + 8 && d.t < T_LAND + 14) {
    // 마시멜로가 부풀어 오른다
    drawStick(ctx, kinds, P.cx, P.cy + jit, P.ang, P.k * (1 + (d.t - T_LAND - 8) * 0.03), P.mode, w, sc);
    return;
  }
  ctx.save();
  if (land) {
    ctx.translate(P.cx * w, P.cy * w);
    ctx.scale(1 + land * 0.08, 1 - land * 0.18);
    ctx.translate(-P.cx * w, -P.cy * w);
  }
  drawStick(ctx, kinds, P.cx, P.cy + jit, P.ang, P.k, P.mode, w, sc, -1, P.ph === 3 && d.cust < 0 ? 1 - P.f * 0.7 : 1);
  ctx.restore();
}

function drawCust(ctx: C2, s: S, i: number, c: Cust, w: number, sc: number, live: IK[] | null) {
  const big = c.k === 'bear' ? 1.16 : 1, u = 0.062 * w * big;
  let oy = Math.sin(s.t * 0.05 + i * 2.1) * 0.003;
  if (c.st === 'in') oy += (1 - easeBack(Math.min(1, c.t / CUST_IN))) * 0.17;
  if (c.st === 'out') oy += (c.t / CUST_OUT) ** 2 * 0.2;
  if (c.st === 'happy') oy -= Math.abs(Math.sin(c.t * 0.21)) * 0.055 * (1 - c.t / HAPPY_T) + 0.01;
  const allLit = !!live && live.length > 0 && openCust(c) && lit(live, c.ord).every(Boolean);
  let mode = 0;
  if (c.st === 'happy') mode = c.spicy ? 4 : 3;
  else if (c.st === 'out' && c.bored) mode = 5;
  else if (c.st === 'res' || allLit) mode = 2;
  else if ((s.t + c.id * 37) % 200 < 8) mode = 1;
  const x = CUST_X[i] * w, y = (CUST_Y + oy) * w - (big - 1) * u * 0.6;
  ctx.save();
  ctx.translate(x, y);
  if (c.st === 'happy') ctx.rotate(Math.sin(c.t * 0.3) * 0.08);
  if (allLit) ctx.rotate(Math.sin(s.t * 0.5) * 0.05);
  stamp(ctx, custSpr(c.k, mode, u * sc), F_CUST, u);
  if (c.st === 'happy') {
    // 받은 꼬치를 번쩍 들고 냠냠 (재료가 하나씩 사라진다)
    const left = c.got.slice(Math.min(c.got.length, Math.floor(c.t / 11)));
    ctx.restore();
    if (left.length) drawStick(ctx, left, CUST_X[i] + 0.075 * big, CUST_Y + oy - 0.01, -Math.PI / 2 + 0.25, 0.38, 2, w, sc);
    ctx.save();
    ctx.translate(x, y);
    ell(ctx, u * 1.15, u * 0.55, u * 0.26, u * 0.22);
    ink(ctx, COAT[c.k].fur, 1.5);
    if (c.spicy) {
      // 앗 매워! 입에서 불 · 머리에서 김
      for (let k = 0; k < 5; k++) {
        const f = (c.t * 0.11 + k * 0.2) % 1, sx = Math.sin(k * 2.1 + c.t * 0.3) * u * 0.25;
        ell(ctx, sx, u * (0.6 + f * 1.3), u * (0.38 - f * 0.22), u * (0.5 - f * 0.25));
        ctx.fillStyle = f < 0.35 ? 'rgba(255,236,120,.95)' : f < 0.7 ? 'rgba(255,150,40,.9)' : 'rgba(255,70,30,.75)';
        ctx.fill();
      }
      for (const sx of [-1, 1]) {
        const f = (c.t * 0.05 + (sx + 1) * 0.25) % 1;
        ell(ctx, sx * u * (0.9 + f * 0.3), -u * (0.9 + f * 0.8), u * (0.16 + f * 0.2), u * (0.16 + f * 0.2));
        ctx.fillStyle = `rgba(255,255,255,${0.8 * (1 - f)})`;
        ctx.fill();
      }
    }
  }
  ctx.restore();
}
function drawBubble(ctx: C2, s: S, i: number, c: Cust, w: number, sc: number, live: IK[] | null) {
  if (c.st !== 'wait' && c.st !== 'in' && c.st !== 'res') return;
  const n = c.ord.length, ic = (n >= 5 ? 0.052 : n === 4 ? 0.06 : 0.068) * w, gap = 0.004 * w, pad = 0.012 * w;
  const bw = n * ic + (n - 1) * gap + pad * 2, bh = ic + pad * 1.5;
  const ap = c.st === 'in' ? easeBack(Math.min(1, c.t / 14)) : 1;
  const L = live && c.st !== 'res' ? lit(live, c.ord) : null, all = !!L && L.every(Boolean);
  const bx = clamp(CUST_X[i] * w, bw / 2 + 3, w - bw / 2 - 3), by = BUB_Y * w + (all ? Math.sin(s.t * 0.6) * 2 : 0);
  const bored = c.st === 'wait' && c.t > BORED_T - 150 ? Math.sin(s.t * 0.9) * 1.5 : 0;
  ctx.save();
  ctx.translate(bx + bored, by);
  ctx.scale(ap, ap);
  if (all || c.st === 'res') {
    ctx.globalCompositeOperation = 'lighter';
    const gu = bw * 0.5;
    ctx.globalAlpha = 0.6;
    stamp(ctx, glowSpr('255,214,90', (gu / 1.5) * sc), F_ITEM, gu / 1.5);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
  rr(ctx, -bw / 2, -bh / 2, bw, bh, bh * 0.42);
  ink(ctx, all || c.st === 'res' ? '#fff6c8' : '#ffffff', 2, all ? '#e0a000' : OUT);
  const tx = clamp(CUST_X[i] * w - bx, -bw / 2 + 10, bw / 2 - 10);
  ctx.beginPath();
  ctx.moveTo(tx - 6, bh / 2 - 1);
  ctx.lineTo(tx + 1, bh / 2 + 8);
  ctx.lineTo(tx + 7, bh / 2 - 1);
  ctx.fillStyle = all || c.st === 'res' ? '#fff6c8' : '#ffffff';
  ctx.fill();
  ctx.strokeStyle = all ? '#e0a000' : OUT;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(tx - 6, bh / 2);
  ctx.lineTo(tx + 1, bh / 2 + 8);
  ctx.lineTo(tx + 7, bh / 2);
  ctx.stroke();
  for (let k = 0; k < n; k++) {
    const q = c.ord[k], x = -bw / 2 + pad + ic / 2 + k * (ic + gap), r = IKD[q].r, u = (ic / 2 / (r * 1.15)) * r;
    const on = c.st === 'res' || (L ? L[k] : false);
    ctx.save();
    ctx.translate(x, 0);
    if (L && !on) ctx.globalAlpha = 0.5;
    if (on && L) ctx.scale(1.12, 1.12);
    stamp(ctx, itemSpr(q, 0, u * sc * (q === 'big' ? 0.7 : 1)), F_ITEM, u * (q === 'big' ? 0.7 : 1));
    ctx.globalAlpha = 1;
    if (on) {
      ell(ctx, ic * 0.32, ic * 0.3, ic * 0.17, ic * 0.17);
      ink(ctx, '#3cc85a', 1.4, '#1a6a2a');
      ctx.beginPath();
      ctx.moveTo(ic * 0.24, ic * 0.3);
      ctx.lineTo(ic * 0.3, ic * 0.37);
      ctx.lineTo(ic * 0.41, ic * 0.22);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
}

/** 그날 쓸 그림을 미리 굽기 줄에: 재료(공중·꿰임·불판·손님 손·말풍선 크기) · 손님 얼굴 여섯 · 손가락 */
function wantDay(s: S, w: number, sc: number) {
  wantDayN(s.day, w, sc);
  // 다음 날 것도 미리 (결과 화면을 보는 동안 구워 둔다)
  if (s.day + 1 < DAYS && (s.phase !== 'day' || s.dt > 60 * 20)) wantDayN(s.day + 1, w, sc);
}
function wantDayN(day: number, w: number, sc: number) {
  const tag = `d${day}:${w}:${sc}`;
  if (WK.has(tag)) return;
  WK.add(tag);
  const D = DAYDEF[day], kinds = new Set<IK>([...D.pool, ...D.haz]);
  if (D.egg) kinds.add('egg');
  const nx = DAYDEF[day + 1]?.add;
  for (const k of kinds) {
    const u = IKD[k].r * w * sc;
    want(`i${k}0:${q3(u)}`, () => itemSpr(k, 0, u));
    for (let f = 1; f >= 0.3; f -= 0.04) {
      for (const m of f > 0.56 ? [1, 2] : [2]) want(`i${k}${m}:${q3(u * f)}`, () => itemSpr(k, m, u * f));
    }
    for (const ic of [0.068, 0.06, 0.052]) want(`b${k}:${q3((ic / 2.3) * w * sc)}`, () => itemSpr(k, 0, (ic / 2.3) * w * sc));
  }
  for (const k of new Set<CK>([...D.cust, ...(D.bear ? ['bear' as CK] : [])])) for (let m = 0; m < 6; m++) want(`c${k}${m}:${w}:${sc}`, () => custSpr(k, m, 0.062 * w * sc * (k === 'bear' ? 1.16 : 1)));
  if (nx && nx in IKD) want(`n${nx}`, () => itemSpr(nx as IK, 0, IKD[nx as IK].r * w * sc * 0.9));
  // 그날 처음 뜨는 글자 (날 판 · 새것)
  const add = D.add;
  want(`t${day}:${sc}`, () => {
    DPR = sc;
    const g = GLY_CTX(sc);
    gtext(g, `${day + 1}일째`, 0, 0, 20, 900, '#5a2a0a');
    gtext(g, `${day + 1}일째`, 0, 0, 14, 900, '#fff3c8');
    if (add) gtext(g, `NEW ${addName(add)}`, 0, 0, 14, 900, '#e8473c');
    // 결과 판 글자
    gtext(g, `${day + 1}일째 장사 끝`, 0, 0, 15, 900, '#ffffff');
    gtext(g, '최고 기록!', 0, 0, 17, 900, '#7a3a00');
    gtext(g, 'NEW', 0, 0, 13, 900, '#e8473c');
    gtext(g, '톡 → 다음 날', 0, 0, 14, 800, '#8a4f2c');
    const nx2 = DAYDEF[day + 1]?.add;
    if (nx2) gtext(g, `내일 ${addName(nx2)}`, 0, 0, 19, 900, '#5a2a0a');
  });
  for (const c of '0123456789,') want(`r${c}${sc}`, () => ((DPR = sc), ntext(GLY_CTX(sc), c, 0, 0, 40, 900, '#5a2a0a', '#ffffff', 5)));
  for (const col of ['#5a2a0a', '#9a7a6a', '#8a6a5a']) for (const c of '장사끝손님한꼬치최고/0123456789, ') want(`q${c}${col}${sc}`, () => ((DPR = sc), ntext(GLY_CTX(sc), c, 0, 0, col === '#8a6a5a' ? 13 : 12, 800, col)));
  want(`hand:${w}:${sc}`, () => handSpr(0.06 * w * sc));
  want(`chip:${w}:${sc}`, () => custSpr('cat', 3, 0.016 * w * sc));
  // 곱하기 딱지 · 꿴 개수 글자
  const str = (t: string, z: number, col: string) => want(`p${t}${z}${col}${sc}`, () => ((DPR = sc), gtext(GLY_CTX(sc), t, 0, 0, z, 900, col)));
  for (const t of ['×2', '×1.5', '×½']) str(t, 15, '#5a2a0a');
  for (const c of '12345678') want(`k${c}${sc}`, () => ((DPR = sc), ntext(GLY_CTX(sc), c, 0, 0, 15, 900, '#ffffff')));
  for (const z of [28, 34, 40, 48])
    for (const col of z === 28 ? [WHITE, GOLD, PINK] : [WHITE, GOLD]) for (const c of '+0123456789,') want(`g${c}${z}${col}${sc}`, () => ((DPR = sc), ntext(GLY_CTX(sc), c, 0, 0, z, 900, col, POP_INK, 4)));
  idlePump();
}
function drawAll(ctx: C2, s: S, w: number, h: number) {
  const sc = (DPR = devScale(ctx)), X = (x: number) => x * w, V = viewOf(s);
  const key = `${Math.round(w)}x${Math.round(h)}@${sc}`;
  let bg = BG.get(key);
  if (!bg) {
    if (BG.size > 3) BG.clear();
    const vig = layer(w * sc * 0.5, h * sc * 0.5, (g) => {
      g.scale(sc * 0.5, sc * 0.5);
      g.fillStyle = rad(g, w / 2, h * 0.55, w * 0.35, h * 0.78, [0, 'rgba(20,10,40,0)'], [1, 'rgba(20,10,40,.85)']);
      g.fillRect(0, 0, w, h);
    });
    BG.set(key, (bg = { b: bakeBack(w, sc), f: bakeFront(w, h, sc), vig }));
  }
  wantDay(s, w, sc);
  const dn = clamp(s.t - V.lastT, 0, 8);
  V.lastT = s.t;
  fxEvents(s, V, w);
  tickAmbient(s, V, dn);
  const fx = juice(s);
  ctx.save();
  fx.begin(ctx);
  if (V.zoom && s.t - V.zoom.t < 16 && s.t >= V.zoom.t) {
    const f = 1 - (s.t - V.zoom.t) / 16, z = 1 + V.zoom.k * f * f;
    ctx.translate(V.zoom.x, V.zoom.y);
    ctx.scale(z, z);
    ctx.translate(-V.zoom.x, -V.zoom.y);
  }
  ctx.drawImage(bg.b, 0, 0, w, (COUNTER_Y + 0.03) * w);
  // 전구 (출렁 + 반짝)
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < BULBS.length; i++) {
    const b = BULBS[i], tw = 0.75 + 0.25 * Math.sin(s.t * 0.06 + i * 1.7), gu = X(0.045) * tw;
    ctx.globalAlpha = 0.55;
    ctx.save();
    ctx.translate(X(b.x), X(b.y + 0.012));
    stamp(ctx, glowSpr(b.col, (gu / 1.5) * sc), F_ITEM, gu / 1.5);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  for (let i = 0; i < BULBS.length; i++) {
    const b = BULBS[i], sw = Math.sin(s.t * 0.04 + i) * 0.003;
    line(ctx, X(b.x), X(b.y - 0.004), X(b.x + sw), X(b.y + 0.004), '#2a1a14', 1.4);
    ell(ctx, X(b.x + sw), X(b.y + 0.014), X(0.009), X(0.012));
    ctx.fillStyle = `rgb(${b.col})`;
    ctx.fill();
    ell(ctx, X(b.x + sw - 0.003), X(b.y + 0.01), X(0.003), X(0.004));
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.fill();
  }
  // 손님 (카운터 뒤)
  const live = s.stroke && s.stroke.on.length ? s.stroke.on.map((o) => o.k) : null;
  // 긋는 중에 어느 손님 주문이 다 차면 '띵!' (이제 떼도 된다)
  for (let i = 0; i < 3; i++) {
    const c = s.cust[i], full = !!live && !!c && openCust(c) && lit(live, c.ord).every(Boolean);
    if (full && c && !V.ready.has(c.id)) {
      V.ready.add(c.id);
      queue(V, 'ding', 1.6, 0.6);
      fx.ring(CUST_X[i] * w, BUB_Y * w, '#ffe14a', X(0.16), 5);
      fx.burst(CUST_X[i] * w, BUB_Y * w, '#ffe14a', 10, 4, 2.2);
    }
  }
  if (!live) V.ready.clear();
  for (let i = 0; i < 3; i++) {
    const c = s.cust[i];
    if (c) drawCust(ctx, s, i, c, w, sc, live);
  }
  ctx.drawImage(bg.f, 0, (COUNTER_Y - 0.11) * w, w, h - (COUNTER_Y - 0.11) * w);
  for (let i = 0; i < 3; i++) {
    const c = s.cust[i];
    if (c) drawBubble(ctx, s, i, c, w, sc, live);
  }
  // 숯불 일렁임
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 4; i++) {
    const gu = X(0.2) * (0.9 + 0.12 * Math.sin(s.t * 0.11 + i * 2.3));
    ctx.globalAlpha = 0.16 + 0.08 * Math.sin(s.t * 0.17 + i * 1.3);
    ctx.save();
    ctx.translate(X(0.16 + i * 0.23), X(1.37));
    stamp(ctx, glowSpr('255,120,40', (gu / 1.5) * sc), F_ITEM, gu / 1.5);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  for (const e of V.embers) {
    ell(ctx, X(e.x), X(e.y), 1.6, 1.6);
    ctx.fillStyle = `rgba(255,${150 + (e.life % 60)},60,${Math.min(1, e.life / 30)})`;
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  // 불판 위 꼬치 (지글) 먼저, 날아가는 꼬치는 나중에
  for (const d of s.done) if (d.t >= T_LAND && d.t < T_GIVE) drawDone(ctx, s, d, w, sc);
  // 공중 재료
  for (const it of s.items) {
    if (it.wait > 0) continue;
    const r = IKD[it.k].r, u = r * w;
    ctx.save();
    ctx.translate(X(it.x), X(it.y));
    if (it.nw || (it.wel && s.day === 0 && !s.firstStroke)) {
      const pul = 1 + 0.12 * Math.sin(s.t * 0.25 + it.id);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5;
      stamp(ctx, glowSpr('255,230,140', u * 1.1 * sc), F_ITEM, u * 1.1 * pul);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      if (it.nw) gtext(ctx, 'NEW', 0, -u * 1.55, 12, 900, '#ffe14a', '#5a2a0a', 3);
    }
    ctx.rotate(it.rot * 0.5);
    const sq = it.vy < -0.006 && it.hover <= 0 ? 1 + Math.min(0.15, -it.vy * 8) : 1;
    ctx.scale(1 / Math.sqrt(sq), sq);
    stamp(ctx, itemSpr(it.k, it.k === 'chili' ? 3 : it.k === 'burnt' ? 4 : 0, u * sc), F_ITEM, u);
    ctx.restore();
  }
  // 헛손질: 빈 꼬치가 빙글 날아간다
  if (s.miss && s.t - s.miss.t < 26) {
    const f = (s.t - s.miss.t) / 26, p = s.miss.pts, a = p[0], b = p[p.length - 1];
    const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2 + f * f * 0.3, L = Math.min(0.5, Math.hypot(b.x - a.x, b.y - a.y) + 0.08);
    ctx.save();
    ctx.globalAlpha = 1 - f;
    ctx.translate(X(cx), X(cy));
    ctx.rotate(Math.atan2(b.y - a.y, b.x - a.x) + f * 7);
    stickLine(ctx, -X(L / 2), X(L / 2), w);
    ctx.restore();
  }
  // 긋는 중인 꼬치
  const st = s.stroke;
  if (st) {
    const pts = [...st.pts, st.tip];
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(X(pts[0].x), X(pts[0].y));
      for (let i = 1; i < pts.length; i++) ctx.lineTo(X(pts[i].x), X(pts[i].y));
    };
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    path();
    ctx.strokeStyle = 'rgba(255,245,200,.28)';
    ctx.lineWidth = X(0.07);
    ctx.stroke();
    path();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = X(0.016) + 2.2;
    ctx.stroke();
    path();
    ctx.strokeStyle = '#f0c878';
    ctx.lineWidth = X(0.016);
    ctx.stroke();
    path();
    ctx.strokeStyle = 'rgba(255,252,230,.8)';
    ctx.lineWidth = X(0.005);
    ctx.stroke();
    const p0 = pts[Math.max(0, pts.length - 3)], tip = st.tip, ta = Math.atan2(tip.y - p0.y, tip.x - p0.x);
    ctx.save();
    ctx.translate(X(tip.x), X(tip.y));
    ctx.rotate(ta);
    stickLine(ctx, -2, 0, w);
    ctx.restore();
    ell(ctx, X(pts[0].x), X(pts[0].y), X(0.012), X(0.012));
    ctx.fillStyle = '#c89a52';
    ctx.fill();
    for (const o of st.on) {
      const age = s.t - o.at, f = easeOut(Math.min(1, age / 5)), r = IKD[o.k].r, u = r * w;
      const px = o.fx + (o.x - o.fx) * f, py = o.fy + (o.y - o.fy) * f, pop = Math.max(0, 1 - age / 9);
      ctx.save();
      ctx.translate(X(px), X(py));
      ctx.scale(1 + pop * 0.4, 1 + pop * 0.25);
      stamp(ctx, itemSpr(o.k, o.k === 'burnt' ? 4 : o.k === 'chili' ? 3 : 1, u * sc), F_ITEM, u);
      ctx.restore();
    }
    // 꼬치 끝에 꿴 개수만 작게 (3, 4, 5…)
    if (st.on.length) {
      const n = st.on.length, age = s.t - st.on[n - 1].at, bump = 1 + 0.5 * Math.max(0, 1 - age / 6);
      const bx = X(tip.x) + Math.cos(ta) * X(0.05) + Math.sin(ta) * X(0.045), by = X(tip.y) + Math.sin(ta) * X(0.05) - Math.abs(Math.cos(ta)) * X(0.05);
      ctx.save();
      ctx.translate(bx, by);
      ctx.scale(bump, bump);
      ell(ctx, 0, 0, 12, 12);
      ink(ctx, n >= 6 ? '#e8473c' : n >= 4 ? '#e08a10' : '#5a2a0a', 2, '#ffe9a0');
      ntext(ctx, String(n), 0, 0.5, 15, 900, '#ffffff');
      ctx.restore();
    }
  }
  for (const d of s.done) if (d.t < T_LAND || d.t >= T_GIVE) drawDone(ctx, s, d, w, sc);
  // 김·연기
  for (const p of V.puffs) {
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life / 30));
    ell(ctx, X(p.x), X(p.y), X(p.r), X(p.r));
    ctx.fillStyle = p.col;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // 긋는 동안 세상이 느려진다: 가장자리가 어둑
  const slow = clamp((1 - s.ws) / (1 - SLOW), 0, 1);
  if (slow > 0.02) {
    ctx.globalAlpha = slow * 0.62;
    ctx.drawImage(bg.vig, 0, 0, w, h);
    ctx.globalAlpha = 1;
  }
  // 손가락 그림 (첫 날 첫 획 전): 첫 물결을 쓱 긋는다
  if (s.phase === 'day' && s.day === 0 && !s.firstStroke && !s.stroke) drawHint(ctx, s, w, sc);
  if (s.phase === 'day' && s.day > 0 && s.dt < 110) drawDayBanner(ctx, s, w, sc);
  ctx.restore();
  drawPops(ctx, V, dn);
  drawHud(ctx, s, w, sc, V);
  if (s.phase !== 'day') drawResult(ctx, s, w, h, sc);
}
function drawHint(ctx: C2, s: S, w: number, sc: number) {
  const wel = s.items.filter((it) => it.wel && it.wait <= 0);
  const X = (x: number) => x * w;
  let x0 = 0.12, x1 = 0.88, y0 = 0.7, y1 = 0.7;
  if (wel.length >= 2) {
    wel.sort((a, b) => a.x - b.x);
    (x0 = wel[0].x - 0.07), (y0 = wel[0].y), (x1 = wel[wel.length - 1].x + 0.07), (y1 = wel[wel.length - 1].y);
  }
  const ph = (s.t % 84) / 84, f = easeOut(Math.min(1, ph / 0.6)), a = ph < 0.8 ? 1 : 1 - (ph - 0.8) / 0.2;
  const hx = x0 + (x1 - x0) * f, hy = y0 + (y1 - y0) * f + 0.012 * Math.sin(f * Math.PI);
  ctx.save();
  ctx.globalAlpha = a * 0.85;
  ctx.setLineDash([X(0.02), X(0.014)]);
  ctx.beginPath();
  ctx.moveTo(X(x0), X(y0));
  ctx.lineTo(X(hx), X(hy));
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = a;
  ctx.translate(X(hx), X(hy));
  ctx.rotate(-0.35);
  const u = X(0.06);
  stamp(ctx, handSpr(u * sc), F_HAND, u);
  ctx.restore();
  const py = X(1.12);
  rr(ctx, X(0.17), py - 15, X(0.66), 30, 15);
  ctx.fillStyle = 'rgba(58,30,18,.82)';
  ctx.fill();
  gtext(ctx, '쓱 그어서 줄줄이 꿰기!', X(0.5), py, 16, 800, '#fff3c8');
}
function drawDayBanner(ctx: C2, s: S, w: number, sc: number) {
  const X = (x: number) => x * w, f = s.dt / 110, a = f < 0.75 ? 1 : 1 - (f - 0.75) / 0.25, drop = easeBack(Math.min(1, s.dt / 16));
  const add = DAYDEF[s.day].add;
  ctx.save();
  ctx.globalAlpha = a;
  const y = X(0.55) * drop;
  rr(ctx, X(0.24), y - 26, X(0.52), 52, 14);
  ink(ctx, lin(ctx, 0, y - 26, 0, y + 26, [0, '#fff3d6'], [1, '#ffd99a']), 2.5);
  gtext(ctx, `${s.day + 1}일째`, X(0.5), y - (add ? 10 : 0), 20, 900, '#5a2a0a');
  if (add) gtext(ctx, `NEW ${addName(add)}`, X(0.5), y + 13, 14, 900, '#e8473c');
  ctx.restore();
  void sc;
}
const HUDB = new Map<string, HTMLCanvasElement>();
function drawHud(ctx: C2, s: S, w: number, sc: number, V: View) {
  const X = (x: number) => x * w, D = DAYDEF[s.day];
  V.disp += (s.dayScore - V.disp) * 0.2;
  if (Math.abs(s.dayScore - V.disp) < 1) V.disp = s.dayScore;
  // 판(점수·날 판자)은 구워 둔 한 장
  const hk = `hud:${w}:${sc}`;
  let hb = HUDB.get(hk);
  if (!hb) {
    if (HUDB.size > 4) HUDB.clear();
    hb = layer(w * sc, X(0.08) * sc, (g) => {
      g.scale(sc, sc);
      rr(g, X(0.015), X(0.012), X(0.36), X(0.058), X(0.02));
      ink(g, 'rgba(58,30,18,.9)', 2, '#ffcf6a');
      ell(g, X(0.05), X(0.041), X(0.019), X(0.019));
      ink(g, rad(g, X(0.044), X(0.035), 0, X(0.02), [0, '#fff3a0'], [1, '#f0a81a']), 1.5, '#8a5a0a');
      rr(g, X(0.625), X(0.012), X(0.36), X(0.058), X(0.02));
      ink(g, 'rgba(58,30,18,.9)', 2, '#ffcf6a');
    });
    HUDB.set(hk, hb);
  }
  ctx.drawImage(hb, 0, 0, w, X(0.08));
  ntext(ctx, fmt(V.disp), X(0.08), X(0.042), 21, 900, '#fff3c8', '', 0, 'left');
  // 시계
  const left = Math.max(0, DAY_T - s.dt), f = left / DAY_T, warn = left <= 600 && s.phase === 'day';
  const cx = X(0.5), cy = X(0.043), r = X(0.036) * (warn && left % 60 > 45 ? 1.08 : 1);
  ell(ctx, cx, cy, r + 3, r + 3);
  ink(ctx, 'rgba(58,30,18,.9)', 2, warn ? '#ff5a3a' : '#ffcf6a');
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + TAU * f);
  ctx.closePath();
  ctx.fillStyle = warn ? '#ff5a3a' : '#ffcf3a';
  ctx.fill();
  ell(ctx, cx, cy, r * 0.66, r * 0.66);
  ctx.fillStyle = '#3a1e10';
  ctx.fill();
  ntext(ctx, String(Math.ceil(left / 60)), cx, cy + 0.5, 14, 900, '#ffffff');
  // 날 (등불 일곱)
  gtext(ctx, `${s.day + 1}일째`, X(0.7), X(0.042), 14, 900, '#fff3c8');
  for (let i = 0; i < DAYS; i++) {
    const x = X(0.775 + i * 0.03), y = X(0.042), on = i < s.day || (i === s.day && s.phase !== 'day');
    ell(ctx, x, y, X(0.01), X(0.012));
    ctx.fillStyle = on ? '#ffcf3a' : i === s.day ? `rgba(255,140,80,${0.6 + 0.4 * Math.sin(s.t * 0.15)})` : 'rgba(255,255,255,.22)';
    ctx.fill();
  }
  // 오늘 목표 (숫자만): 손님 · 한 꼬치
  if (s.phase === 'day') {
    const y = X(0.092);
    for (const [k, x, cur, goal] of [[0, 0.03, s.served, D.s2], [1, 0.2, s.maxN, D.s3]] as [number, number, number, number][]) {
      const ok = cur >= goal;
      rr(ctx, X(x), y - 11, X(0.155), 22, 11);
      ink(ctx, ok ? 'rgba(60,170,80,.92)' : 'rgba(58,30,18,.78)', 1.5, ok ? '#c8ffb0' : 'rgba(255,207,106,.6)');
      if (k === 0) {
        ctx.save();
        ctx.translate(X(x + 0.025), y + 1);
        const u = X(0.016);
        stamp(ctx, custSpr('cat', 3, u * sc), F_CUST, u);
        ctx.restore();
      } else {
        line(ctx, X(x + 0.008), y + 5, X(x + 0.045), y - 5, '#f0c878', 2.5);
        ell(ctx, X(x + 0.02), y + 1.5, 3.2, 3.2);
        ctx.fillStyle = '#e8553e';
        ctx.fill();
        ell(ctx, X(x + 0.034), y - 2.5, 3.2, 3.2);
        ctx.fillStyle = '#fff3d6';
        ctx.fill();
      }
      ntext(ctx, `${Math.min(cur, 99)}/${goal}`, X(x + 0.1), y, 12, 800, '#ffffff');
    }
  }
}
function drawResult(ctx: C2, s: S, w: number, h: number, sc: number) {
  const X = (x: number) => x * w, pt = s.phase === 'end' ? 200 : s.pt, ap = easeBack(Math.min(1, pt / 14));
  ctx.save();
  ctx.globalAlpha = Math.min(1, pt / 10) * 0.55;
  ctx.fillStyle = '#1a0c28';
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 1;
  ctx.translate(w / 2, X(0.8));
  ctx.scale(ap, ap);
  const cw = X(0.84), ch = X(0.74);
  rr(ctx, -cw / 2, -ch / 2, cw, ch, 22);
  ink(ctx, lin(ctx, 0, -ch / 2, 0, ch / 2, [0, '#fff8e8'], [1, '#ffe6b8']), 4, '#8a4f2c');
  rr(ctx, -cw * 0.36, -ch / 2 - 14, cw * 0.72, 30, 10);
  ink(ctx, '#e8473c', 2.5, '#8a1a10');
  gtext(ctx, `${s.day + 1}일째 장사 끝`, 0, -ch / 2 + 1, 15, 900, '#ffffff');
  // 점수 (시원하게 올라감)
  const cu = Math.min(1, pt / 40), shown = Math.round(s.dayScore * easeOut(cu));
  ntext(ctx, fmt(shown), 0, -ch * 0.3, 40, 900, '#5a2a0a', '#ffffff', 5);
  if (s.record && pt > 40) {
    const bob = Math.sin(pt * 0.2) * 2;
    ctx.save();
    ctx.translate(0, -ch * 0.17 + bob);
    ctx.rotate(-0.04);
    rr(ctx, -X(0.17), -14, X(0.34), 28, 14);
    ink(ctx, lin(ctx, 0, -14, 0, 14, [0, '#fff27a'], [1, '#ffb81a']), 2.5, '#a86a00');
    gtext(ctx, '최고 기록!', 0, 0.5, 17, 900, '#7a3a00');
    ctx.restore();
  } else if (pt > 40) ntext(ctx, `최고 ${fmt(s.best)}`, 0, -ch * 0.17, 13, 800, '#8a6a5a');
  // 별 셋
  const D = DAYDEF[s.day], cap = ['장사 끝', `손님 ${Math.min(99, s.served)}/${D.s2}`, `한 꼬치 ${s.maxN}/${D.s3}`];
  for (let i = 0; i < 3; i++) {
    const t0 = 18 + i * 9, on = s.stars[i] && pt >= t0, x = (i - 1) * cw * 0.3, y = -ch * 0.01;
    const k = on ? easeBack(Math.min(1, (pt - t0) / 10)) : 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(k, k);
    star(ctx, 0, 0, X(0.06), 0.48);
    ink(ctx, on ? lin(ctx, 0, -X(0.06), 0, X(0.06), [0, '#fff27a'], [1, '#ffb81a']) : 'rgba(120,90,70,.25)', 3, on ? '#a86a00' : 'rgba(120,90,70,.5)');
    ctx.restore();
    ntext(ctx, cap[i], x, y + X(0.085), 12, 800, on ? '#5a2a0a' : '#9a7a6a');
  }
  // 새것 풀림 / 일주일 완주
  const add = DAYDEF[s.day + 1]?.add ?? null;
  if (pt > 46) {
    const k = easeBack(Math.min(1, (pt - 46) / 12)), y = ch * 0.27;
    ctx.save();
    ctx.translate(0, y);
    ctx.scale(k, k);
    rr(ctx, -cw * 0.4, -X(0.07), cw * 0.8, X(0.14), 16);
    ink(ctx, '#fff3c8', 2.5, '#e0a000');
    if (s.final) gtext(ctx, `일주일 완주! ${fmt(s.total)}`, 0, 0, 18, 900, '#5a2a0a');
    else if (add) {
      gtext(ctx, 'NEW', -cw * 0.28, -X(0.03), 13, 900, '#e8473c');
      ctx.save();
      ctx.translate(-cw * 0.28, X(0.015));
      if (add in IKD) {
        const u = X(IKD[add as IK].r * 0.9);
        stamp(ctx, itemSpr(add as IK, 0, u * sc), F_ITEM, u);
      } else {
        const u = X(0.024);
        ctx.translate(0, -u * 0.4);
        stamp(ctx, custSpr(add as CK, 3, u * sc), F_CUST, u);
      }
      ctx.restore();
      gtext(ctx, `내일 ${addName(add)}`, cw * 0.08, 0, 19, 900, '#5a2a0a');
    }
    ctx.restore();
  }
  if (pt >= RES_MIN && s.phase === 'result') {
    const a = 0.6 + 0.4 * Math.sin(pt * 0.15);
    ctx.globalAlpha = a;
    gtext(ctx, s.final ? '톡 → 끝' : '톡 → 다음 날', 0, ch / 2 - X(0.04), 14, 800, '#8a4f2c');
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
