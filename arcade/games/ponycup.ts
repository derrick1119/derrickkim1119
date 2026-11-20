/**
 * 꼬마 망아지 대회 키우기 (35라운드: 육성 시뮬 × 레이싱) — 톡 하나.
 * 판 하나 = 대회 하나. 대회 전까지 훈련 3~5번: 큰 훈련 카드 3~4장 중 하나를 톡 하면
 *   망아지가 그 훈련을 눈앞에서 하고 몸이 바뀐다(언덕 → 다리 근육 뿅, 달리기 → 갈기가 휘날림, 헤엄 → 가슴이 쫙, 장애물 → 이마 별이 반짝).
 *   지치면 혀를 빼물고 비틀 — 카드의 '실수할 확률'이 커지고, 실수하면 데굴데굴 넘어지며 능력이 조금만 오른다. 쉬기 = 지침 풀기.
 * 대회는 저절로 달린다: 동물 친구들(토끼·곰·수달·여우)과 함께, 길(평지·언덕·물웅덩이·진흙·장애물)마다 쓰이는 능력이 다르다.
 *   평지 = 빠르기 · 언덕·진흙 = 힘 · 물웅덩이 = 버티기 · 장애물 = 꾀. 지친 채로 달리면 느리고(진흙에선 두 배), 결승선 앞 코 차 승부는 슬로모션.
 * 다음 대회의 길 모양과 '지금 달리면 몇 등'이 늘 보이고, 시간 압박은 없다(아무것도 안 누르면 아무 일도 없다).
 * 목표 등수에 못 미치면 하트 -1, 그 대회만 다시(훈련부터, 몸은 그 대회 시작 때로). 하트 셋을 다 잃거나 6판을 마치면 끝.
 * 판 6개 · 판마다 새것: 1 첫 대회(평지·언덕·물) → 2 지침과 쉬기 → 3 친구와 훈련(같은 친구 두 번이면 두 배)
 *   → 4 비 오는 날(카드가 바뀜 · 진흙 길) → 5 장애물(꾀 카드 · 꾀가 모자라면 걸려 넘어짐) → 6 마지막 힘(꾀가 높으면 막판 질주).
 * 별(쉬운 말, 판마다 하나씩 늘어남): 3등 안에 들기 · 1등 하기 · 친구와 두 번 훈련하기 · 한 번도 안 넘어지기 · 장애물에 안 걸리기 · 지침 절반 아래로 달리기.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5;
// ───────────────────────────── 자리 (가로 폭 = 1, 세로 0~1.5) ─────────────────────────────
const HUD_H = 0.085;
/** 다음 대회 판 (길 띠) */
const PANEL_Y = 0.098, PANEL_H = 0.15;
/** 망아지 발 자리 */
const PONY_X = 0.5, PONY_Y = 0.8, PONY_R = 0.15;
/** 능력 띠 */
const STATS_Y = 0.935;
/** 카드 */
const CARD_Y = 1.215, CARD_H = 0.37;
const cardXs = (n: number) => (n <= 3 ? [0.17, 0.5, 0.83] : [0.125, 0.375, 0.625, 0.875]);
const cardW = (n: number) => (n <= 3 ? 0.3 : 0.235);

// ───────────────────────────── 능력 · 훈련 ─────────────────────────────
/** 능력: 0 빠르기 · 1 힘 · 2 버티기 · 3 꾀 */
const STAT_NAME = ['빠르기', '힘', '버티기', '꾀'];
const STAT_COL = ['#ffb81c', '#ff6a3a', '#3d9df5', '#a46bff'];
const STAT_DARK = ['#a86a00', '#b23a0e', '#1c5aa8', '#5a2ab0'];
type TK = 'run' | 'hill' | 'swim' | 'jump' | 'rest';
interface TD { name: string; stat: number; fat: number }
const TR: Record<TK, TD> = {
  run: { name: '달리기', stat: 0, fat: 20 },
  hill: { name: '언덕', stat: 1, fat: 22 },
  swim: { name: '헤엄', stat: 2, fat: 17 },
  jump: { name: '장애물', stat: 3, fat: 18 },
  rest: { name: '쉬기', stat: -1, fat: 0 },
};
const START_ST = [30, 30, 30, 30];
/** 실수하면 오르는 양의 비율 · 쉬기로 푸는 지침 · 비 오는 날 쉬기 · 대회 한 번 지침 */
const FAIL_FRAC = 0.3, REST = 45, REST_RAIN = 70, RACE_FAT = 12;
/** 비 오는 날: 바깥 훈련 실수 +25% · 헤엄 1.7배 */
const RAIN_FAIL = 0.25, RAIN_SWIM = 0.7, FRIEND_X = 1;
const failP = (fat: number) => Math.max(0, Math.min(0.75, (fat - 25) * 0.011));
/** 몸 단계: 능력 40·60·80·… 마다 한 단계 (몸이 눈에 띄게 바뀐다) */
const lvOf = (v: number) => Math.max(0, Math.min(6, Math.floor((v - 20) / 20)));
const BODY_WOW = ['갈기가 휘날려!', '다리 근육 뿅!', '가슴이 쫙!', '이마 별 반짝!'];
/** 받침 있으면 a, 없으면 b (이/가) */
const josa = (w: string, a: string, b: string) => ((w.charCodeAt(w.length - 1) - 0xac00) % 28 > 0 ? a : b);
const iga = (w: string) => w + josa(w, '이', '가');

// ───────────────────────────── 길 · 상대 ─────────────────────────────
type SegK = 'flat' | 'hill' | 'water' | 'mud' | 'hurdle';
const SEG: Record<SegK, { name: string; stat: number }> = {
  flat: { name: '평지', stat: 0 },
  hill: { name: '언덕', stat: 1 },
  water: { name: '물웅덩이', stat: 2 },
  mud: { name: '진흙', stat: 1 },
  hurdle: { name: '장애물', stat: 3 },
};
/** 길 한 칸 길이(세계 단위) · 기본 속도 */
const SEG_LEN = 100, BASE_V = 60, CRASH_V = 0.86;
type RK = 'rabbit' | 'bear' | 'otter' | 'fox';
type Who = 'pony' | RK;
const RV: Record<RK, { name: string; prof: number[]; best: number }> = {
  rabbit: { name: '토끼', prof: [1.4, 0.85, 0.9, 0.95], best: 0 },
  bear: { name: '곰', prof: [0.85, 1.45, 1.0, 0.8], best: 1 },
  otter: { name: '수달', prof: [0.9, 0.85, 1.45, 0.9], best: 2 },
  fox: { name: '여우', prof: [1.05, 0.9, 0.85, 1.35], best: 3 },
};
const RIVALS: RK[] = ['rabbit', 'bear', 'otter', 'fox'];
/** 경주 줄: 0(먼 쪽) ~ 4(가까운 쪽). 망아지는 3 */
const PONY_LANE = 3, RIVAL_LANES = [0, 1, 2, 4];

// ───────────────────────────── 판 ─────────────────────────────
type StarK = 'goal' | 'first' | 'nofall' | 'friend' | 'clean' | 'fresh';
interface StarDef { k: StarK; label: string }
const ST = (k: StarK, label: string): StarDef => ({ k, label });
type Spot = '' | 'rest' | 'friend' | 'rain' | 'hurdle' | 'spurt';
interface StageDef {
  name: string; news: string; hint: string; spot: Spot;
  course: [SegK, number][]; trains: number; goal: number; lv: number; bar: number;
  cards: TK[]; fatigue: boolean; friends: boolean; rain: number[]; spurt: boolean; stars: StarDef[];
}
export const STAGES: StageDef[] = [
  {
    name: '들판 꼬마 대회', news: '', hint: '길에 맞는 훈련을 골라요', spot: '',
    course: [['flat', 1.2], ['hill', 1], ['water', 0.9], ['flat', 0.6]], trains: 3, goal: 3, lv: 36, bar: 0,
    cards: ['run', 'hill', 'swim'], fatigue: false, friends: false, rain: [], spurt: false,
    stars: [ST('goal', '3등 안에 들기')],
  },
  {
    name: '언덕 넘기 대회', news: '지침 — 지치면 실수해요. 쉬기로 풀어요', hint: '지치면 넘어져요 — 쉬기!', spot: 'rest',
    course: [['hill', 1.2], ['flat', 0.8], ['hill', 1.0]], trains: 4, goal: 3, lv: 44, bar: 0,
    cards: ['run', 'hill', 'swim', 'rest'], fatigue: true, friends: false, rain: [], spurt: false,
    stars: [ST('goal', '3등 안에 들기'), ST('first', '1등 하기')],
  },
  {
    name: '친구 응원 대회', news: '친구와 훈련 — 같은 친구와 두 번이면 두 배!', hint: '같은 친구 카드를 또 고르면 두 배', spot: 'friend',
    course: [['flat', 0.8], ['water', 1.3], ['flat', 0.6], ['water', 0.7]], trains: 4, goal: 3, lv: 50, bar: 0,
    cards: ['run', 'hill', 'swim', 'rest'], fatigue: true, friends: true, rain: [], spurt: false,
    stars: [ST('goal', '3등 안에 들기'), ST('first', '1등 하기'), ST('friend', '친구와 두 번 훈련하기')],
  },
  {
    name: '비 온 뒤 진흙 대회', news: '비 오는 날 — 카드가 바뀌어요. 길은 진흙탕!', hint: '비 오면 헤엄 두 배 · 낮잠 푹', spot: 'rain',
    course: [['mud', 1.2], ['flat', 0.8], ['mud', 1.0]], trains: 4, goal: 2, lv: 64, bar: 0,
    cards: ['run', 'hill', 'swim', 'rest'], fatigue: true, friends: true, rain: [1, 2], spurt: false,
    stars: [ST('goal', '2등 안에 들기'), ST('first', '1등 하기'), ST('nofall', '한 번도 안 넘어지기')],
  },
  {
    name: '장애물 대회', news: '장애물 — 꾀가 모자라면 걸려 넘어져요', hint: '꾀를 길 띠의 숫자만큼!', spot: 'hurdle',
    course: [['hill', 0.9], ['hurdle', 1.0], ['water', 0.8], ['hurdle', 0.8]], trains: 4, goal: 2, lv: 69, bar: 45,
    cards: ['run', 'hill', 'swim', 'jump', 'rest'], fatigue: true, friends: true, rain: [2], spurt: false,
    stars: [ST('goal', '2등 안에 들기'), ST('first', '1등 하기'), ST('clean', '장애물에 안 걸리기')],
  },
  {
    name: '왕관 큰 대회', news: '마지막 힘 — 꾀가 높으면 막판 질주!', hint: '마지막 길에서 꾀만큼 빨라져요', spot: 'spurt',
    course: [['flat', 0.9], ['hill', 0.8], ['water', 0.8], ['hurdle', 0.8], ['flat', 1.0]], trains: 5, goal: 2, lv: 84, bar: 62,
    cards: ['run', 'hill', 'swim', 'jump', 'rest'], fatigue: true, friends: true, rain: [1, 3], spurt: true,
    stars: [ST('goal', '2등 안에 들기'), ST('first', '1등 하기'), ST('fresh', '지침 절반 아래로 달리기')],
  },
];
export const STAGE_COUNT = STAGES.length;
const CLEAR_PTS = 100, STAR_PTS = 60, WIN_PTS = 300, HEART_PTS = 100;
const mulOf = (k: number) => 1 + 0.5 * k;
/** 훈련 연출 길이 · 능력이 오르는 순간 · 대회 전 준비 · 결과 */
const ANIM_T = 104, APPLY_T = 60, PRE_T = 72, RACE_TICKS = 380, END_WAIT = 56, RESULT_OK = 175, RESULT_FAIL = 165, BANNER_T = 150;

// ───────────────────────────── 상태 ─────────────────────────────
interface Card { k: TK; gain: number; friend: number; bonus: boolean; rain: boolean; p: number; born: number }
interface Cur { k: TK; stat: number; gain: number; got: number; fail: boolean; friend: number; bonus: boolean; rain: boolean; t0: number; applied: boolean; lvUp: boolean; fat0: number; fat1: number; ci: number }
interface Runner { k: Who; lane: number; st: number[]; fat: number; ends: number[]; T: number; crash: boolean; place: number; done: boolean }
interface Race { rs: Runner[]; xs: number[]; D: number; rc: number; scale: number; slow: boolean; slowT: number; ended: number; photo: boolean; passed: boolean; seg: number; live: number; tmin: number; tcap: number }
interface Ev { t: number; kind: string; x: number; y: number; n?: number; text?: string }

export interface PonyState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'train' | 'anim' | 'pre' | 'race' | 'result'; pt: number;
  hearts: number; st: number[]; fat: number; snap: { st: number[]; fat: number }; rivals: number[][][];
  turn: number; cards: Card[]; cur: Cur | null; falls: number; friendN: number[]; friendBonus: number; trainsAll: number;
  race: Race | null; rank: number; ok: boolean; got: number; starOk: boolean[]; stars: number; pts: number;
  won: boolean; dead: boolean; again: boolean; tries: number; raceFat: number;
  down: boolean; firstTap: number; firstBig: number; wowN: number;
  seen: Set<string>; banner: { head: string; sub: string; t: number } | null; spot: { x: number; y: number; t: number; label: string; rx: number; ry: number } | null;
  events: Ev[]; bigText: string; bigT: number; bigY: number; lastRank: number;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const ev = (s: PonyState, kind: string, x: number, y: number, n?: number, text?: string) => s.events.push({ t: s.t, kind, x, y, n, text });
function see(s: PonyState, key: string) {
  if (!key || s.seen.has(key)) return false;
  s.seen.add(key);
  return true;
}
function wow(s: PonyState, text: string, x = 0.5, y = 0.45) {
  s.wowN++;
  if (s.firstBig < 0 && s.firstTap >= 0) s.firstBig = s.t;
  s.bigText = text;
  s.bigT = s.t;
  s.bigY = y;
  ev(s, 'big', x, y, 0, text);
}

// ───────────────────────────── 경주 (결정적) ─────────────────────────────
/** 길 한 칸에서의 속도 */
function segV(st: number[], fat: number, seg: SegK, last: boolean, d: StageDef): number {
  let v = BASE_V + st[SEG[seg].stat];
  v *= 1 - (seg === 'mud' ? 0.0045 : 0.0022) * fat;
  if (seg === 'hurdle' && st[3] < d.bar) v *= CRASH_V;
  if (last && d.spurt) v *= 1 + st[3] / 240;
  return v;
}
/** 각 칸 끝에 닿는 시각(누적). noise가 있으면 칸마다 곱한다 */
function raceEnds(st: number[], fat: number, d: StageDef, noise?: number[]): number[] {
  const out: number[] = [];
  let t = 0;
  d.course.forEach(([k, len], i) => {
    t += (len * SEG_LEN) / (segV(st, fat, k, i === d.course.length - 1, d) * (noise ? noise[i] : 1));
    out.push(t);
  });
  return out;
}
const raceT = (st: number[], fat: number, d: StageDef) => raceEnds(st, fat, d).at(-1)!;
/** 상대 넷의 평균 기록 (빠른 순) */
function rivalTimes(s: PonyState, stage: number): number[] {
  const d = STAGES[stage];
  return s.rivals[stage].map((st) => raceT(st, 0, d)).sort((a, b) => a - b);
}
/** 지금 달리면 몇 등 (평균) */
function forecast(s: PonyState): number {
  const T = raceT(s.st, s.fat, STAGES[s.stage]);
  return 1 + rivalTimes(s, s.stage).filter((x) => x < T).length;
}
function makeRace(s: PonyState): Race {
  const d = STAGES[s.stage], rs: Runner[] = [];
  const mk = (k: Who, lane: number, st: number[], fat: number): Runner => {
    const noise = d.course.map(() => 1 + (s.rng() - 0.5) * 0.06);
    const ends = raceEnds(st, fat, d, noise);
    return { k, lane, st: [...st], fat, ends, T: ends.at(-1)!, crash: d.bar > 0 && st[3] < d.bar, place: 0, done: false };
  };
  rs.push(mk('pony', PONY_LANE, s.st, s.fat));
  RIVALS.forEach((k, i) => rs.push(mk(k, RIVAL_LANES[i], s.rivals[s.stage][i], 0)));
  const order = rs.map((_, i) => i).sort((a, b) => rs[a].T - rs[b].T);
  order.forEach((i, p) => (rs[i].place = p + 1));
  const xs: number[] = [];
  let x = 0;
  for (const [, len] of d.course) xs.push((x += len * SEG_LEN));
  const tmin = Math.min(...rs.map((r) => r.T)), tmax = Math.max(...rs.map((r) => r.T));
  return { rs, xs, D: x, rc: 0, scale: tmin / RACE_TICKS, slow: false, slowT: 0, ended: -1, photo: false, passed: false, seg: 0, live: 0, tmin, tcap: Math.min(tmax, Math.max(rs[0].T, tmin * 1.22)) + tmin * 0.02 };
}
/** 경주 시각 rc에 그 선수가 간 거리 */
function posAt(r: Runner, rc: number, xs: number[]): number {
  let t0 = 0, x0 = 0;
  for (let i = 0; i < r.ends.length; i++) {
    const t1 = r.ends[i], x1 = xs[i];
    if (rc <= t1) return x0 + ((rc - t0) / (t1 - t0)) * (x1 - x0);
    t0 = t1;
    x0 = x1;
  }
  const n = xs.length, v = (xs[n - 1] - (n > 1 ? xs[n - 2] : 0)) / (r.ends[n - 1] - (n > 1 ? r.ends[n - 2] : 0));
  return xs[n - 1] + Math.min(60, (rc - r.T) * v * 0.6);
}
const segAt = (x: number, xs: number[]) => {
  for (let i = 0; i < xs.length; i++) if (x < xs[i]) return i;
  return xs.length - 1;
};
function livePlace(r: Race): number {
  const me = posAt(r.rs[0], r.rc, r.xs);
  let p = 1;
  for (let i = 1; i < r.rs.length; i++) {
    const o = r.rs[i];
    if (r.rc >= o.T && r.rc >= r.rs[0].T ? o.T < r.rs[0].T : posAt(o, r.rc, r.xs) > me) p++;
  }
  return p;
}

// ───────────────────────────── 카드 · 훈련 ─────────────────────────────
function cardP(s: PonyState, k: TK, rain: boolean): number {
  const d = STAGES[s.stage];
  if (k === 'rest' || !d.fatigue) return 0;
  let p = failP(s.fat);
  if (rain && k !== 'swim') p = Math.min(0.85, p + RAIN_FAIL);
  return p;
}
function deal(s: PonyState) {
  const d = STAGES[s.stage], rain = d.rain.includes(s.turn);
  let kinds: TK[] = [...d.cards];
  if (kinds.length > 4) {
    // 다섯 가지 중 넷: 쉬기·장애물은 늘 있고, 달리기·언덕·헤엄 중 하나가 빠진다
    const drop = (['run', 'hill', 'swim'] as TK[])[Math.floor(s.rng() * 3)];
    kinds = kinds.filter((k) => k !== drop);
  }
  s.cards = kinds.map((k) => {
    const base = k === 'rest' ? (rain ? REST_RAIN : REST) : s.stage === 0 ? 11 + Math.floor(s.rng() * 6) : 8 + Math.floor(s.rng() * 9);
    const friend = d.friends && k !== 'rest' ? Math.floor(s.rng() * 3) : -1;
    const bonus = friend >= 0 && s.friendN[friend] > 0;
    // 덤은 더한다(곱하지 않는다): 친구 두 번째 +100% · 비 오는 날 헤엄 +70%
    const gain = k === 'rest' ? base : Math.round(base * (1 + (bonus ? FRIEND_X : 0) + (rain && k === 'swim' ? RAIN_SWIM : 0)));
    return { k, gain, friend, bonus, rain, p: cardP(s, k, rain), born: s.t };
  });
  // 첫 판 첫 카드: 언덕이 반드시 크게 (첫 톡에 다리 근육 뿅)
  if (s.stage === 0 && s.turn === 0 && !s.again) for (const c of s.cards) if (c.k === 'hill') c.gain = Math.max(c.gain, 14);
}
function train(s: PonyState, i: number) {
  const c = s.cards[i];
  if (!c) return;
  const d = STAGES[s.stage];
  const fail = c.k !== 'rest' && c.p > 0 && s.rng() < c.p;
  const got = c.k === 'rest' ? c.gain : fail ? Math.max(1, Math.round(c.gain * FAIL_FRAC)) : c.gain;
  const fat1 = c.k === 'rest' ? Math.max(0, s.fat - c.gain) : d.fatigue ? Math.min(100, s.fat + TR[c.k].fat) : s.fat;
  s.cur = { k: c.k, stat: TR[c.k].stat, gain: c.gain, got, fail, friend: c.friend, bonus: c.bonus, rain: c.rain, t0: s.t, applied: false, lvUp: false, fat0: s.fat, fat1, ci: i };
  s.phase = 'anim';
  s.pt = 0;
  s.spot = null;
  s.trainsAll++;
  see(s, 'train');
  ev(s, 'pick', cardXs(s.cards.length)[i], CARD_Y, i);
}
function applyTrain(s: PonyState) {
  const c = s.cur!;
  c.applied = true;
  s.fat = c.fat1;
  if (c.k === 'rest') {
    ev(s, 'rest', PONY_X, PONY_Y - 0.12, c.fat0 - c.fat1);
    if (c.fat0 >= 50) wow(s, '푹 잤다! 쌩쌩!', 0.5, 0.42);
    return;
  }
  const lv0 = lvOf(s.st[c.stat]);
  s.st[c.stat] += c.got;
  const lv1 = lvOf(s.st[c.stat]);
  if (c.friend >= 0) s.friendN[c.friend]++;
  if (c.fail) {
    s.falls++;
    see(s, 'fall');
    ev(s, 'fall', PONY_X, PONY_Y - 0.1, c.got);
    return;
  }
  ev(s, 'gain', PONY_X, PONY_Y - 0.22, c.got, STAT_NAME[c.stat]);
  if (c.bonus) (s.friendBonus++, see(s, 'combo'), wow(s, '우정 콤보! 두 배!', 0.5, 0.42));
  else if (lv1 > lv0) (c.lvUp = true), see(s, 'body'), wow(s, BODY_WOW[c.stat], 0.5, 0.42);
}
function afterAnim(s: PonyState) {
  const d = STAGES[s.stage];
  s.cur = null;
  s.turn++;
  if (s.turn >= d.trains) {
    s.phase = 'pre';
    s.pt = 0;
    s.raceFat = s.fat;
    s.race = makeRace(s);
    see(s, 'race');
    for (const [k] of d.course) see(s, 'seg:' + k);
    ev(s, 'pre', 0.5, 0.5);
  } else {
    s.phase = 'train';
    s.pt = 0;
    deal(s);
    const f = forecast(s);
    if (f !== s.lastRank) ev(s, 'fore', 0.5, PANEL_Y, f, String(s.lastRank));
    s.lastRank = f;
  }
}

// ───────────────────────────── 판 시작 · 끝 ─────────────────────────────
function newStage(s: PonyState) {
  const d = STAGES[s.stage];
  s.phase = 'train';
  s.pt = 0;
  s.turn = 0;
  s.cur = null;
  s.falls = 0;
  s.friendN = [0, 0, 0];
  s.friendBonus = 0;
  s.race = null;
  s.starOk = d.stars.map(() => false);
  s.got = 0;
  deal(s);
  s.lastRank = forecast(s);
  if (!s.again) {
    s.banner = { head: `${s.stage + 1}판 · ${d.name}`, sub: d.news ? `NEW  ${d.news}` : d.hint, t: s.t };
    if (d.spot) see(s, d.spot);
    const n = s.cards.length, xs = cardXs(n);
    if (d.spot === 'rest') s.spot = { x: xs[n - 1], y: CARD_Y, t: s.t, label: '쉬기', rx: cardW(n) / 2 + 0.02, ry: CARD_H / 2 + 0.02 };
    else if (d.spot === 'friend') s.spot = { x: 0.5, y: CARD_Y - CARD_H / 2 + 0.03, t: s.t, label: '친구', rx: 0.48, ry: 0.05 };
    else if (d.spot === 'rain') s.spot = { x: 0.5, y: PANEL_Y + PANEL_H - 0.022, t: s.t, label: '비 오는 날', rx: 0.3, ry: 0.03 };
    else if (d.spot === 'hurdle') s.spot = { x: 0.5, y: PANEL_Y + 0.07, t: s.t, label: '장애물 길', rx: 0.47, ry: 0.045 };
    else if (d.spot === 'spurt') s.spot = { x: 0.82, y: PANEL_Y + 0.07, t: s.t, label: '마지막 힘', rx: 0.15, ry: 0.045 };
    else s.spot = null;
  } else s.banner = { head: `다시! ${s.stage + 1}판 · ${d.name}`, sub: '몸은 대회 전으로 — 훈련부터 다시', t: s.t };
}
function starMet(s: PonyState, q: StarDef): boolean {
  const d = STAGES[s.stage], r = s.race!;
  switch (q.k) {
    case 'goal': return s.rank <= d.goal;
    case 'first': return s.rank === 1;
    case 'nofall': return s.falls === 0;
    case 'friend': return s.friendBonus > 0;
    case 'clean': return !r.rs[0].crash;
    case 'fresh': return s.raceFat < 50;
  }
}
function endRace(s: PonyState) {
  const d = STAGES[s.stage], r = s.race!;
  s.phase = 'result';
  s.pt = 0;
  s.rank = r.rs[0].place;
  s.ok = s.rank <= d.goal;
  if (d.fatigue) s.fat = Math.min(100, s.fat + RACE_FAT);
  if (s.ok) {
    s.starOk = d.stars.map((q) => starMet(s, q));
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    s.pts += (CLEAR_PTS + s.got * STAR_PTS) * mulOf(s.stage);
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS + s.hearts * HEART_PTS);
    ev(s, 'clear', 0.5, 0.4, s.rank);
  } else {
    s.hearts--;
    s.tries++;
    ev(s, 'fail', 0.5, 0.6, s.rank);
  }
}
function raceTick(s: PonyState) {
  const r = s.race!, me = r.rs[0];
  if (r.ended >= 0) {
    if (s.t - r.ended >= END_WAIT) endRace(s);
    return;
  }
  const mx = posAt(me, r.rc, r.xs);
  // 결승선 앞 코 차 승부: 망아지 곁에 누가 붙어 있으면 슬로모션
  let slow = false;
  if (!me.done && mx > r.D * 0.88) for (let i = 1; i < r.rs.length; i++) {
    const o = r.rs[i];
    if (!o.done && Math.abs(posAt(o, r.rc, r.xs) - mx) < r.D * 0.03) slow = true;
  }
  if (slow && !r.slow) (see(s, 'slowmo'), ev(s, 'slow', 0.5, 0.5));
  r.slow = slow;
  if (slow) r.slowT++;
  const before = r.live || livePlace(r);
  r.rc += r.scale * (slow ? 0.26 : 1);
  const now = livePlace(r);
  const nx = posAt(me, r.rc, r.xs), sg = segAt(Math.min(nx, r.D - 0.01), r.xs);
  if (sg !== r.seg) (r.seg = sg), ev(s, 'seg', 0.5, 0.5, sg);
  if (!me.done && now < before) {
    ev(s, 'pass', 0.5, 0.5, now);
    if (sg === r.xs.length - 1 && !r.passed && nx > r.D * 0.8) (r.passed = true), wow(s, now === 1 ? '막판 역전!' : '앞질렀다!', 0.5, 0.36);
  } else if (!me.done && now > before) ev(s, 'passed', 0.5, 0.5, now);
  r.live = now;
  for (const o of r.rs) if (!o.done && r.rc >= o.T) (o.done = true), ev(s, 'finish', 0.5, 0.5, o.place, o.k);
  if (me.done && !r.photo && r.rc - me.T < r.scale * 2) {
    r.photo = true;
    const gap = Math.min(...r.rs.slice(1).map((o) => Math.abs(o.T - me.T)));
    if (gap < me.T * 0.006) (see(s, 'photo'), wow(s, me.place === 1 ? '코 차 우승!!' : '코 차!', 0.5, 0.36));
    else if (me.place === 1) wow(s, '우승!', 0.5, 0.36);
  }
  if (r.rc >= r.tcap) r.ended = s.t;
}

// ───────────────────────────── 톡 ─────────────────────────────
/** x: 0~1(가로), y: 가로 폭 단위 → 카드 번호 (-1 없음) */
function hitCard(s: PonyState, x: number, y: number): number {
  const n = s.cards.length, xs = cardXs(n), hw = cardW(n) / 2 + 0.008;
  if (Math.abs(y - CARD_Y) > CARD_H / 2 + 0.01) return -1;
  for (let i = 0; i < n; i++) if (Math.abs(x - xs[i]) <= hw) return i;
  return -1;
}

const game: GameDef<PonyState> & { wows(s: PonyState): number } = {
  id: 'ponycup',
  name: '🐴 꼬마 망아지 대회 키우기',
  genes: ['trainsim', 'racing'],
  twist: '훈련 카드를 톡 하면 망아지가 눈앞에서 언덕을 다다닥 오르고 다리 근육이 뿅 — 몸이 바뀐 그대로 대회 날 동물 친구들과 저절로 달리는데, 길마다 쓰이는 능력이 달라 결승선 앞 코 차 역전이 슬로모션으로 터진다',
  rules: [
    '훈련 카드를 톡: 달리기 = 빠르기, 언덕 = 힘, 헤엄 = 버티기, 장애물 = 꾀. 쉬기 = 지침 풀기.',
    '대회는 저절로 달려요. 평지는 빠르기, 언덕·진흙은 힘, 물은 버티기, 장애물은 꾀로.',
    '지치면 실수(넘어짐)해요. 목표 등수에 못 들면 하트 -1, 그 대회만 다시.',
  ],
  controls: 'touch',
  hint: '훈련 카드 톡 / 화살표로 고르고 스페이스(1·2·3 = 카드)',
  aspect: A,
  art: {
    concept: '햇살 가득한 작은 목장과 경주 트랙 — 3/4 시점 나무 울타리·풀밭·건초더미·구경하는 동물 친구들, 통통한 꼬마 망아지가 훈련할수록 몸이 바뀌는 동화책 육성 레이스',
    mood: '연둣빛 목장에 빨간 지붕 마구간과 풍차가 서 있고 울타리 위 병아리·양·오리가 응원한다. 카드를 톡 하면 언덕이 불쑥 솟고 망아지가 다다닥 올라 다리 근육이 뿅, 연못에선 첨벙첨벙, 지치면 혀를 빼물고 비틀비틀. 대회 날엔 토끼·곰·수달·여우와 깃발 펄럭이는 트랙을 달려 결승선 앞에서 슬로모션 코 차 승부.',
    palette: { bg: '#9fdc6a', ink: '#3a2a14', muted: '#7a6a4a', accent: '#ffcf3a', hot: '#ff5f3a', soft: '#fff6dc' },
  },
  guard: (s) => s.hearts,
  cleared: (s) => (s.phase === 'result' && s.ok ? { stage: s.stage, got: s.got, of: s.starOk.length } : null),
  reveals: (s) => s.seen.size,
  wows: (s) => s.wowN,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'train', pt: 0,
      hearts: 3, st: [...START_ST], fat: 0, snap: { st: [...START_ST], fat: 0 }, rivals: [],
      turn: 0, cards: [], cur: null, falls: 0, friendN: [0, 0, 0], friendBonus: 0, trainsAll: 0,
      race: null, rank: 0, ok: false, got: 0, starOk: [false], stars: 0, pts: 0,
      won: false, dead: false, again: false, tries: 0, raceFat: 0,
      down: false, firstTap: -1, firstBig: -1, wowN: 0,
      seen: new Set<string>(), banner: null, spot: null, events: [], bigText: '', bigT: -999, bigY: 0.45, lastRank: 5,
    } as unknown as PonyState;
    s.rivals = STAGES.map((d) => RIVALS.map((k) => {
      const j = 0.96 + s.rng() * 0.08;
      return RV[k].prof.map((p) => Math.round(p * d.lv * j));
    }));
    newStage(s);
    s.banner = null;
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    const p = inp.pointer ?? null;
    const fresh = !!p && !s.down;
    s.down = !!p;
    if (s.phase === 'train') {
      let ci = -1;
      if (inp.pick !== undefined && inp.pick >= 0 && inp.pick < s.cards.length) ci = inp.pick;
      else if (fresh) ci = hitCard(s, p!.x, p!.y * A);
      if (ci >= 0) {
        if (s.firstTap < 0) s.firstTap = s.t;
        train(s, ci);
      } else if (fresh) ev(s, 'miss', p!.x, p!.y * A);
      s.pt++;
    } else if (s.phase === 'anim') {
      s.pt++;
      if (!s.cur!.applied && s.pt >= APPLY_T) applyTrain(s);
      if (s.pt >= ANIM_T) afterAnim(s);
    } else if (s.phase === 'pre') {
      if (++s.pt >= PRE_T) (s.phase = 'race'), (s.pt = 0), ev(s, 'go', 0.5, 0.5);
    } else if (s.phase === 'race') {
      s.pt++;
      raceTick(s);
    } else {
      s.pt++;
      const T = s.ok ? RESULT_OK : RESULT_FAIL;
      if (s.pt >= T || (fresh && s.pt > 50)) {
        if (s.ok) {
          if (s.won) s.dead = true;
          else {
            s.again = false;
            s.stage++;
            s.snap = { st: [...s.st], fat: s.fat };
            newStage(s);
          }
        } else if (s.hearts <= 0) s.dead = true;
        else {
          s.again = true;
          s.st = [...s.snap.st];
          s.fat = s.snap.fat;
          newStage(s);
        }
      }
    }
    if (s.events.length > 60) s.events = s.events.filter((e) => s.t - e.t < 120);
    if (s.spot && s.t - s.spot.t > 220) s.spot = null;
  },
  over: (s) => s.dead,
  score: (s) => Math.round(s.pts),
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};
export const ponycup = game;

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
const tapCard = (s: PonyState, i: number): Input => ({ tap: false, dir: 0, pointer: { x: cardXs(s.cards.length)[i], y: CARD_Y / A } });
const sig = (x: number) => 1 / (1 + Math.exp(-1.7 * x));
/** 계획의 끝(대회 날) 값: 목표 등수·1등·덤 별 + 앞으로 쓸 몸(능력 합) − 남는 지침 */
function leafValue(s: PonyState, st: number[], fat: number, pNo: number, friend: boolean): number {
  const d = STAGES[s.stage], rt = rivalTimes(s, s.stage), T = raceT(st, fat, d), sd = 0.018;
  const mg = (rt[d.goal - 1] - T) / T, m1 = (rt[0] - T) / T;
  let v = 1000 * sig(mg / sd) + 650 * sig(m1 / sd);
  for (const q of d.stars) {
    if (q.k === 'nofall') v += 450 * pNo;
    else if (q.k === 'friend') v += friend ? 450 : 0;
    else if (q.k === 'clean') v += 450 * sig((st[3] - d.bar + 0.5) / 2);
    else if (q.k === 'fresh') v += 450 * sig((49.5 - fat) / 4);
  }
  const later = s.stage < STAGES.length - 1;
  if (later) v += 5 * (st[0] + st[1] + st[2] + st[3] * (s.stage >= 3 ? 1 : 0.6)) + 4 * Math.min(st[0], st[1], st[2]) - 4 * Math.min(100, fat + RACE_FAT);
  return v;
}
/** 앞으로 남은 훈련을 평균 카드로 다 해 보고 가장 좋은 값 */
function plan(s: PonyState, turn: number, st: number[], fat: number, pNo: number, friend: boolean): number {
  const d = STAGES[s.stage];
  if (turn >= d.trains) return leafValue(s, st, fat, pNo, friend);
  const rain = d.rain.includes(turn), mean = 12.5;
  let best = -1e9;
  for (const k of d.cards) {
    if (k === 'rest') {
      const f2 = Math.max(0, fat - (rain ? REST_RAIN : REST));
      best = Math.max(best, plan(s, turn + 1, st, f2, pNo, friend));
      continue;
    }
    const p = d.fatigue ? Math.min(0.85, failP(fat) + (rain && k !== 'swim' ? RAIN_FAIL : 0)) : 0;
    const g = mean * (1 + (rain && k === 'swim' ? RAIN_SWIM : 0)) * (1 - p * (1 - FAIL_FRAC)), si = TR[k].stat;
    const st2 = [...st];
    st2[si] += g;
    best = Math.max(best, plan(s, turn + 1, st2, d.fatigue ? Math.min(100, fat + TR[k].fat) : fat, pNo * (1 - p), friend));
  }
  return best;
}
function bestCard(s: PonyState): number {
  const d = STAGES[s.stage];
  let bi = 0, bv = -1e9;
  s.cards.forEach((c, i) => {
    let v: number;
    if (c.k === 'rest') v = plan(s, s.turn + 1, s.st, Math.max(0, s.fat - c.gain), 1, s.friendBonus > 0);
    else {
      const p = c.p, g = c.gain * (1 - p * (1 - FAIL_FRAC)), st2 = [...s.st];
      st2[TR[c.k].stat] += g;
      // 친구: 이번에 두 배면 별 확정 · 처음 만난 친구면 다음에 두 배 기회
      const fr = s.friendBonus > 0 || (c.bonus && p < 0.5);
      const seed = c.friend >= 0 && !c.bonus && s.friendN[c.friend] === 0 && s.turn < d.trains - 1 ? 60 : 0;
      v = plan(s, s.turn + 1, st2, d.fatigue ? Math.min(100, s.fat + TR[c.k].fat) : s.fat, 1 - p, fr) + seed;
    }
    if (v > bv) (bv = v), (bi = i);
  });
  return bi;
}
const tapMem = new WeakMap<object, number>();
/** 잘하는 봇: 다음 대회 길을 보고 남은 훈련을 다 해 본 뒤(경주 시뮬레이션) 가장 좋은 카드 */
export const ponycupSmart: Bot<PonyState> = {
  name: '길을 보고 대회를 미리 달려 보기',
  act(s) {
    if (s.phase !== 'train' || s.down) return NO;
    const last = tapMem.get(s) ?? -99;
    if (s.t - last < 6) return NO;
    tapMem.set(s, s.t);
    return tapCard(s, bestCard(s));
  },
};

const dumbMem = new WeakMap<object, { next: number; down: boolean; x: number; y: number }>();
/** 못하는 봇: 아무 때나 아무 데나 톡 */
export const ponycupRandom: Bot<PonyState> = {
  name: '아무 데나 톡',
  act(s, rng) {
    let m = dumbMem.get(s);
    if (!m) dumbMem.set(s, (m = { next: s.t + 10 + Math.floor(rng() * 40), down: false, x: 0.5, y: 0.5 }));
    if (s.t >= m.next) {
      m.down = !m.down;
      if (m.down) {
        m.next = s.t + 3 + Math.floor(rng() * 6);
        m.x = 0.03 + rng() * 0.94;
        m.y = 0.1 + rng() * 0.88;
      } else m.next = s.t + 12 + Math.floor(rng() * 50);
    }
    return m.down ? { tap: false, dir: 0, pointer: { x: m.x, y: m.y } } : NO;
  },
};

const habitMem = new WeakMap<object, number>();
function habitTap(s: PonyState, pick: () => number): Input {
  if (s.phase !== 'train' || s.down) return NO;
  const last = habitMem.get(s) ?? -99;
  if (s.t - last < 6) return NO;
  habitMem.set(s, s.t);
  return tapCard(s, pick());
}
/** 버릇 봇: 늘 숫자가 제일 큰 훈련 카드 (쉬기는 안 함) */
export const ponycupHabit: Bot<PonyState> = {
  name: '늘 숫자가 제일 큰 카드',
  act(s) {
    return habitTap(s, () => {
      let bi = 0, bg = -1;
      s.cards.forEach((c, i) => c.k !== 'rest' && c.gain > bg && ((bg = c.gain), (bi = i)));
      return bi;
    });
  },
};
/** 독립 버릇 봇: 늘 달리기만 (달리기 카드가 없으면 맨 앞 카드) */
export const ponycupHabit2: Bot<PonyState> = {
  name: '늘 달리기만',
  act(s) {
    return habitTap(s, () => Math.max(0, s.cards.findIndex((c) => c.k === 'run')));
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
function starPath(ctx: C2, x: number, y: number, r: number, inner = 0.45) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5, q = k % 2 ? r * inner : r;
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
function sparkle(ctx: C2, x: number, y: number, r: number, col: string) {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x + r * 0.15, y - r * 0.15, x + r, y);
  ctx.quadraticCurveTo(x + r * 0.15, y + r * 0.15, x, y + r);
  ctx.quadraticCurveTo(x - r * 0.15, y + r * 0.15, x - r, y);
  ctx.quadraticCurveTo(x - r * 0.15, y - r * 0.15, x, y - r);
  ctx.fill();
}
const ease = (u: number) => 1 - (1 - clamp(u, 0, 1)) ** 2;
const easeIO = (u: number) => {
  const v = clamp(u, 0, 1);
  return v < 0.5 ? 2 * v * v : 1 - (-2 * v + 2) ** 2 / 2;
};
/** 살짝 넘쳤다 돌아오는 (뿅) */
const pop = (u: number) => {
  const v = clamp(u, 0, 1), c = 1.9;
  return 1 + (c + 1) * (v - 1) ** 3 + c * (v - 1) ** 2;
};
const OUT = '#5a2e12';
const STAT_LIGHT = ['#fff3a8', '#ffd0b0', '#cfe9ff', '#e6d8ff'];

/** 능력 그림: 번개(빠르기) · 아령(힘) · 하트(버티기) · 반짝별(꾀) */
function statIcon(ctx: C2, i: number, x: number, y: number, r: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  if (i === 0) {
    ctx.moveTo(-r * 0.15, -r);
    ctx.lineTo(r * 0.62, -r);
    ctx.lineTo(r * 0.12, -r * 0.18);
    ctx.lineTo(r * 0.6, -r * 0.18);
    ctx.lineTo(-r * 0.42, r);
    ctx.lineTo(-r * 0.05, r * 0.05);
    ctx.lineTo(-r * 0.55, r * 0.05);
    ctx.closePath();
  } else if (i === 1) {
    ctx.roundRect(-r * 0.62, -r * 0.16, r * 1.24, r * 0.32, r * 0.1);
    ctx.roundRect(-r * 1.0, -r * 0.62, r * 0.4, r * 1.24, r * 0.14);
    ctx.roundRect(r * 0.6, -r * 0.62, r * 0.4, r * 1.24, r * 0.14);
  } else if (i === 2) {
    heartPath(ctx, 0, r * 0.08, r * 0.78);
  } else {
    ctx.moveTo(0, -r);
    ctx.quadraticCurveTo(r * 0.16, -r * 0.16, r, 0);
    ctx.quadraticCurveTo(r * 0.16, r * 0.16, 0, r);
    ctx.quadraticCurveTo(-r * 0.16, r * 0.16, -r, 0);
    ctx.quadraticCurveTo(-r * 0.16, -r * 0.16, 0, -r);
  }
  ctx.fillStyle = lin(ctx, 0, -r, 0, r, [0, STAT_LIGHT[i]], [0.5, STAT_COL[i]], [1, STAT_DARK[i]]);
  ctx.fill();
  ctx.strokeStyle = STAT_DARK[i];
  ctx.lineWidth = Math.max(1, r * 0.16);
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  ell(ctx, -r * 0.22, -r * 0.42, r * 0.16, r * 0.1, -0.5);
  ctx.fill();
  ctx.restore();
}
/** 땀방울 (지침) */
function dropIcon(ctx: C2, x: number, y: number, r: number, col = '#7ac8ff') {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.bezierCurveTo(x + r * 0.3, y - r * 0.4, x + r * 0.75, y, x + r * 0.7, y + r * 0.35);
  ctx.arc(x, y + r * 0.3, r * 0.7, 0.1, Math.PI - 0.1);
  ctx.bezierCurveTo(x - r * 0.75, y, x - r * 0.3, y - r * 0.4, x, y - r);
  ctx.fillStyle = col;
  ctx.fill();
  ctx.strokeStyle = '#2a6aa8';
  ctx.lineWidth = Math.max(1, r * 0.15);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.8)';
  ell(ctx, x - r * 0.25, y + r * 0.15, r * 0.14, r * 0.22, 0.3);
  ctx.fill();
}
/** 손가락 (안내) */
function drawHand(ctx: C2, x: number, y: number, k: number, press: number) {
  ctx.save();
  ctx.translate(x, y + press * k * 0.12);
  ctx.rotate(-0.3);
  ctx.fillStyle = 'rgba(60,30,10,.22)';
  ell(ctx, k * 0.2, k * 1.25, k * 0.4, k * 0.12);
  ctx.fill();
  ctx.fillStyle = '#fff6ec';
  ctx.strokeStyle = OUT;
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

// ── 망아지 ──
type Face = 'idle' | 'happy' | 'effort' | 'tired' | 'dizzy' | 'sleep' | 'sad' | 'proud' | 'wow';
type Pose = 'stand' | 'gallop' | 'swim' | 'jump' | 'lie' | 'tumble' | 'flex';
interface PL { pose: Pose; ph: number; tilt: number; rot: number; face: Face; wind: number; flash: number; flashStat: number; sink: number; st: number[]; fat: number; t: number; shadow?: boolean }
const P_BODY = '#f6b464', P_BODY2 = '#dc8840', P_BELLY = '#ffe6bc', P_MANE = '#8a3f20', P_MANE2 = '#c8703e', P_MUZ = '#ffe8cc';

function leg(ctx: C2, hx: number, hy: number, a1: number, a2: number, l1: number, l2: number, th: number, col: string, hoof: string) {
  const kx = hx + Math.sin(a1) * l1, ky = hy + Math.cos(a1) * l1;
  const fx = kx + Math.sin(a1 + a2) * l2, fy = ky + Math.cos(a1 + a2) * l2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = th * 1.18 + 2.2;
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  ctx.lineTo(kx, ky);
  ctx.stroke();
  ctx.lineWidth = th * 0.78 + 2.2;
  ctx.beginPath();
  ctx.moveTo(kx, ky);
  ctx.lineTo(fx, fy);
  ctx.stroke();
  ctx.strokeStyle = col;
  ctx.lineWidth = th * 1.18;
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  ctx.lineTo(kx, ky);
  ctx.stroke();
  ctx.lineWidth = th * 0.78;
  ctx.beginPath();
  ctx.moveTo(kx, ky);
  ctx.lineTo(fx, fy);
  ctx.stroke();
  // 발굽
  const ha = a1 + a2;
  ctx.save();
  ctx.translate(fx, fy);
  ctx.rotate(-ha);
  ctx.fillStyle = hoof;
  rr(ctx, -th * 0.55, -th * 0.12, th * 1.1, th * 0.55, th * 0.18);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.restore();
}
/** 망아지 한 마리 — x,y = 몸 아래 땅, k = 몸 반 길이(px). 능력 단계에 따라 갈기·다리 근육·가슴·이마 별이 바뀐다 */
function drawPony(ctx: C2, x: number, y: number, k: number, L: PL) {
  const lvS = lvOf(L.st[0]), lvP = lvOf(L.st[1]), lvE = lvOf(L.st[2]), lvW = lvOf(L.st[3]);
  const t = L.t, fat = L.fat;
  ctx.save();
  ctx.translate(x, y);
  if (L.shadow !== false && L.pose !== 'swim') {
    ctx.fillStyle = 'rgba(40,70,20,.28)';
    ell(ctx, 0, 0, k * (L.pose === 'lie' ? 1.25 : 1.1), k * 0.2);
    ctx.fill();
  }
  ctx.rotate(L.tilt);
  if (fat >= 75 && L.pose === 'stand') ctx.rotate(Math.sin(t * 0.13) * 0.05);
  const bob = L.pose === 'gallop' ? -Math.abs(Math.sin(L.ph * TAU)) * 0.12 : L.pose === 'stand' ? Math.sin(t * 0.06) * 0.015 : L.pose === 'flex' ? -Math.abs(Math.sin(t * 0.25)) * 0.08 : 0;
  const lieY = L.pose === 'lie' ? 0.55 : 0;
  ctx.translate(0, (bob + lieY) * k);
  if (L.rot) {
    ctx.translate(0, -1.05 * k);
    ctx.rotate(L.rot);
    ctx.translate(0, 1.05 * k);
  }
  const K = (v: number) => v * k;
  const by = -1.05, brx = 0.94 + 0.035 * lvE, bry = 0.5 + 0.04 * lvE;
  const fl = L.flash, fs = L.flashStat;
  const th = K(0.2 + 0.034 * lvP) * (fs === 1 ? 1 + 0.25 * fl : 1);
  // 다리 각도
  const legsA = (i: number): [number, number] => {
    const front = i < 2;
    if (L.pose === 'gallop' || L.pose === 'swim') {
      const a = (L.ph + [0, 0.12, 0.5, 0.62][i]) * TAU, sp = L.pose === 'swim' ? 0.7 : 1;
      return front ? [0.62 * Math.sin(a) * sp, -1.1 * Math.max(0, Math.sin(a + 1.0)) * sp] : [0.55 * Math.sin(a) * sp - 0.1, 0.9 * Math.max(0, Math.sin(a - 0.6)) * sp];
    }
    if (L.pose === 'jump') return front ? [0.95, -1.9] : [-0.85, 0.5];
    if (L.pose === 'lie') return front ? [1.45, -2.7] : [-1.35, 2.6];
    if (L.pose === 'tumble') {
      const a = t * 0.5 + i * 1.7;
      return [Math.sin(a) * 0.9, Math.cos(a * 1.3) * 0.7];
    }
    if (L.pose === 'flex') return front ? [0.18, -0.1] : [-0.3, 0.35];
    return front ? [0.04, 0] : [-0.2, 0.32];
  };
  const hips: [number, number][] = [[0.56, -0.95], [0.66, -0.98], [-0.6, -0.95], [-0.5, -0.98]];
  const l1 = K(0.5), l2 = K(0.47);
  const farCol = '#d88a48', hoof = '#6a4030';
  const lying = L.pose === 'lie';
  /** 누우면 다리를 몸 밑에 접는다 */
  const tuck = (lx: number, col: string) => {
    ctx.fillStyle = col;
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.8;
    ell(ctx, K(lx), K(-0.42), K(0.28), K(0.14));
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = hoof;
    ell(ctx, K(lx + 0.24), K(-0.4), K(0.08), K(0.1));
    ctx.fill();
  };
  // 먼 쪽 다리
  if (lying) (tuck(0.62, farCol), tuck(-0.42, farCol));
  else
    for (const i of [1, 3]) {
      const [a1, a2] = legsA(i);
      leg(ctx, K(hips[i][0]), K(hips[i][1]), a1, a2, l1, l2, th * 0.92, farCol, hoof);
    }
  // 꼬리
  const tl = 0.62 + 0.13 * lvS, wnd = clamp(L.wind, 0, 1), sw = Math.sin(t * 0.09) * 0.25 * (1 - wnd);
  ctx.save();
  ctx.translate(K(-0.9), K(by - 0.25));
  ctx.rotate(-0.4 - wnd * 0.9 + sw);
  ctx.fillStyle = lin(ctx, 0, 0, -K(tl), K(tl * 0.6), [0, P_MANE2], [1, P_MANE]);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -K(0.1));
  ctx.bezierCurveTo(-K(tl * 0.5), -K(0.25), -K(tl * 0.9), K(0.05), -K(tl * 1.05), K(tl * 0.75));
  ctx.bezierCurveTo(-K(tl * 0.75), K(tl * 0.45), -K(tl * 0.5), K(tl * 0.5), -K(tl * 0.35), K(tl * 0.85));
  ctx.bezierCurveTo(-K(tl * 0.3), K(0.25), -K(0.15), K(0.15), 0, K(0.12));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  // 몸통
  ctx.fillStyle = lin(ctx, 0, K(by - bry), 0, K(by + bry), [0, '#ffd08a'], [0.45, P_BODY], [1, P_BODY2]);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(2, K(0.045));
  ell(ctx, 0, K(by), K(brx), K(bry));
  ctx.fill();
  ctx.stroke();
  // 배 (버티기: 가슴이 쫙)
  ctx.fillStyle = P_BELLY;
  ell(ctx, K(0.15), K(by + bry * 0.45), K(brx * 0.62), K(bry * 0.42));
  ctx.fill();
  if (lvE >= 1 || (fs === 2 && fl > 0)) {
    ctx.fillStyle = `rgba(255,255,255,${0.25 + 0.08 * lvE + (fs === 2 ? fl * 0.5 : 0)})`;
    ell(ctx, K(0.62), K(by - 0.02), K(0.2 + 0.03 * lvE), K(0.3 + 0.03 * lvE), -0.3);
    ctx.fill();
  }
  // 엉덩이 근육 (힘)
  const mus = (mx: number, my: number, rx: number, ry: number) => {
    ctx.fillStyle = lin(ctx, K(mx), K(my - ry), K(mx), K(my + ry), [0, '#ffc47a'], [1, P_BODY2]);
    ell(ctx, K(mx), K(my), K(rx), K(ry));
    ctx.fill();
    ctx.strokeStyle = 'rgba(90,46,18,.55)';
    ctx.lineWidth = Math.max(1.4, K(0.03));
    ctx.beginPath();
    ctx.ellipse(K(mx), K(my), K(rx), K(ry), 0, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
    ctx.fillStyle = `rgba(255,255,230,${0.35 + 0.08 * lvP})`;
    ell(ctx, K(mx - rx * 0.25), K(my - ry * 0.4), K(rx * 0.35), K(ry * 0.22), -0.4);
    ctx.fill();
  };
  const mg = 1 + (fs === 1 ? 0.3 * fl : 0);
  mus(-0.58, by + 0.08, (0.27 + 0.05 * lvP) * mg, (0.3 + 0.05 * lvP) * mg);
  // 안장 천 (경주 띠)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(K(-0.42), K(by - bry * 0.92));
  ctx.quadraticCurveTo(K(-0.05), K(by - bry * 1.12), K(0.32), K(by - bry * 0.92));
  ctx.lineTo(K(0.36), K(by + 0.12));
  ctx.quadraticCurveTo(K(-0.05), K(by + 0.22), K(-0.46), K(by + 0.12));
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, K(by - 0.5), 0, K(by + 0.2), [0, '#ff6a6a'], [1, '#d02a3a']);
  ctx.fill();
  ctx.strokeStyle = '#7a1020';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = '#fff4d0';
  ctx.lineWidth = Math.max(1.5, K(0.04));
  ctx.beginPath();
  ctx.moveTo(K(0.3), K(by + 0.06));
  ctx.quadraticCurveTo(K(-0.05), K(by + 0.15), K(-0.4), K(by + 0.06));
  ctx.stroke();
  starPath(ctx, K(-0.05), K(by - 0.18), K(0.13));
  ctx.fillStyle = '#ffe14a';
  ctx.fill();
  ctx.strokeStyle = '#a86a00';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();
  // 가까운 다리
  if (lying) (tuck(0.45, P_BODY), tuck(-0.6, P_BODY));
  else
    for (const i of [2, 0]) {
      const [a1, a2] = legsA(i);
      leg(ctx, K(hips[i][0]), K(hips[i][1]), a1, a2, l1, l2, th, P_BODY, hoof);
    }
  mus(0.5, by + 0.06, (0.2 + 0.04 * lvP) * mg, (0.26 + 0.045 * lvP) * mg);
  // 목
  ctx.fillStyle = lin(ctx, K(0.5), K(-2), K(1), K(-1.2), [0, '#ffc87e'], [1, P_BODY]);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(2, K(0.045));
  ctx.beginPath();
  ctx.moveTo(K(0.38), K(by - bry * 0.7));
  ctx.quadraticCurveTo(K(0.62), K(-1.95), K(0.98), K(-2.32));
  ctx.lineTo(K(1.32), K(-1.98));
  ctx.quadraticCurveTo(K(1.0), K(-1.55), K(0.9), K(by - 0.05));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 갈기 (빠르기: 길어지고 휘날린다)
  const mn = 4 + Math.min(4, lvS), ml = 0.24 + 0.075 * lvS + (fs === 0 ? 0.15 * fl : 0);
  for (let j = mn - 1; j >= 0; j--) {
    const u = j / (mn - 1), rx0 = 1.0 - u * 0.62, ry0 = -2.36 + u * 0.82;
    const wv = Math.sin(t * (0.12 + wnd * 0.3) + j * 0.9) * (0.05 + wnd * 0.06);
    const ang = Math.PI * (0.62 + wnd * 0.3) + wv + u * 0.25;
    const len = K(ml * (1 - u * 0.25) * (1 + wnd * 0.35));
    const ex = K(rx0) + Math.cos(ang) * len, ey = K(ry0) + Math.sin(ang) * len * 0.7 + len * 0.35;
    ctx.fillStyle = j % 2 ? P_MANE : P_MANE2;
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(K(rx0 + 0.1), K(ry0 - 0.05));
    ctx.quadraticCurveTo(K(rx0) - len * 0.2, K(ry0) - len * 0.55, ex, ey);
    ctx.quadraticCurveTo(K(rx0) - len * 0.1, K(ry0) + len * 0.1, K(rx0 - 0.02), K(ry0 + 0.14));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // 머리
  const hx = 1.22, hy = -2.08;
  ctx.fillStyle = lin(ctx, K(hx), K(hy - 0.35), K(hx), K(hy + 0.35), [0, '#ffd08a'], [1, P_BODY]);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(2, K(0.045));
  ell(ctx, K(hx), K(hy), K(0.42), K(0.34), 0.3);
  ctx.fill();
  ctx.stroke();
  // 주둥이
  ctx.fillStyle = P_MUZ;
  ell(ctx, K(hx + 0.32), K(hy + 0.16), K(0.26), K(0.21), 0.2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#7a3a22';
  ell(ctx, K(hx + 0.44), K(hy + 0.1), K(0.035), K(0.05), 0.3);
  ctx.fill();
  // 볼터치
  ctx.fillStyle = 'rgba(255,110,120,.4)';
  ell(ctx, K(hx + 0.05), K(hy + 0.12), K(0.1), K(0.06));
  ctx.fill();
  // 입
  const face = L.face;
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1.5, K(0.035));
  const mx = K(hx + 0.3), my = K(hy + 0.28);
  if (face === 'tired' || face === 'dizzy') {
    ctx.fillStyle = '#ff7a9a';
    ctx.beginPath();
    ctx.moveTo(mx - K(0.06), my - K(0.02));
    ctx.quadraticCurveTo(mx + K(0.02), my + K(0.2 + Math.sin(t * 0.2) * 0.03), mx + K(0.1), my - K(0.01));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (face === 'happy' || face === 'proud' || face === 'wow') {
    ctx.fillStyle = '#a8303a';
    ctx.beginPath();
    if (face === 'wow') ell(ctx, mx + K(0.02), my, K(0.06), K(0.07));
    else {
      ctx.moveTo(mx - K(0.1), my - K(0.04));
      ctx.quadraticCurveTo(mx, my + K(0.12), mx + K(0.12), my - K(0.05));
      ctx.closePath();
    }
    ctx.fill();
    ctx.stroke();
  } else if (face === 'effort') {
    ctx.fillStyle = '#ffffff';
    rr(ctx, mx - K(0.08), my - K(0.04), K(0.17), K(0.07), K(0.02));
    ctx.fill();
    ctx.stroke();
  } else if (face === 'sad') {
    ctx.beginPath();
    ctx.moveTo(mx - K(0.08), my + K(0.03));
    ctx.quadraticCurveTo(mx, my - K(0.05), mx + K(0.08), my + K(0.03));
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(mx - K(0.08), my - K(0.02));
    ctx.quadraticCurveTo(mx, my + K(0.05), mx + K(0.08), my - K(0.03));
    ctx.stroke();
  }
  // 앞머리 · 귀
  ctx.fillStyle = P_BODY;
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(2, K(0.04));
  ctx.beginPath();
  ctx.moveTo(K(hx - 0.22), K(hy - 0.22));
  ctx.lineTo(K(hx - 0.3), K(hy - 0.62 - (face === 'sad' || face === 'tired' ? -0.12 : 0)));
  ctx.lineTo(K(hx - 0.02), K(hy - 0.3));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffa0a8';
  ctx.beginPath();
  ctx.moveTo(K(hx - 0.19), K(hy - 0.27));
  ctx.lineTo(K(hx - 0.25), K(hy - 0.5 - (face === 'sad' || face === 'tired' ? -0.1 : 0)));
  ctx.lineTo(K(hx - 0.08), K(hy - 0.3));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = P_MANE2;
  ctx.beginPath();
  ctx.moveTo(K(hx - 0.12), K(hy - 0.3));
  ctx.quadraticCurveTo(K(hx + 0.2), K(hy - 0.5), K(hx + 0.18), K(hy - 0.12));
  ctx.quadraticCurveTo(K(hx + 0.05), K(hy - 0.25), K(hx - 0.06), K(hy - 0.18));
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // 이마 별 (꾀)
  if (lvW >= 1 || (fs === 3 && fl > 0)) {
    const sr = K(0.06 + 0.022 * lvW) * (fs === 3 ? 1 + fl * 0.8 : 1);
    if (lvW >= 2) {
      ctx.fillStyle = radg(ctx, K(hx + 0.08), K(hy - 0.12), 0, sr * 2.4, [0, 'rgba(255,250,180,.75)'], [1, 'rgba(255,250,180,0)']);
      ell(ctx, K(hx + 0.08), K(hy - 0.12), sr * 2.4, sr * 2.4);
      ctx.fill();
    }
    starPath(ctx, K(hx + 0.08), K(hy - 0.12), sr);
    ctx.fillStyle = '#fff6a0';
    ctx.fill();
    ctx.strokeStyle = '#c08a10';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  // 눈
  const ex = K(hx + 0.06), ey = K(hy - 0.02);
  ctx.strokeStyle = '#2a1408';
  ctx.lineWidth = Math.max(1.8, K(0.045));
  if (face === 'happy' || face === 'proud' || face === 'sleep') {
    ctx.beginPath();
    if (face === 'sleep') ctx.arc(ex, ey - K(0.02), K(0.09), 0.2, Math.PI - 0.2);
    else ctx.arc(ex, ey + K(0.05), K(0.1), Math.PI + 0.3, -0.3);
    ctx.stroke();
  } else if (face === 'dizzy') {
    ctx.beginPath();
    for (let a = 0; a < 4.6 * Math.PI; a += 0.3) {
      const q = K(0.012) * a;
      const px = ex + Math.cos(a + t * 0.3) * q, py = ey + Math.sin(a + t * 0.3) * q;
      a ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.stroke();
  } else {
    const er = face === 'wow' ? 1.2 : 1;
    ctx.fillStyle = '#ffffff';
    ell(ctx, ex, ey, K(0.11) * er, K(0.13) * er);
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#2a1408';
    ell(ctx, ex + K(0.025), ey + K(0.01), K(0.07) * er, K(0.09) * er);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ell(ctx, ex + K(0.045), ey - K(0.035), K(0.028), K(0.03));
    ctx.fill();
    if (face === 'tired' || (fat >= 60 && face === 'idle')) {
      ctx.fillStyle = P_BODY;
      ctx.beginPath();
      ctx.ellipse(ex, ey, K(0.13), K(0.15), 0, Math.PI, TAU);
      ctx.fill();
      ctx.strokeStyle = '#2a1408';
      ctx.lineWidth = Math.max(1.6, K(0.04));
      ctx.beginPath();
      ctx.moveTo(ex - K(0.12), ey);
      ctx.lineTo(ex + K(0.12), ey + K(0.01));
      ctx.stroke();
    }
    if (face === 'effort') {
      ctx.strokeStyle = '#2a1408';
      ctx.lineWidth = Math.max(1.8, K(0.045));
      ctx.beginPath();
      ctx.moveTo(ex - K(0.12), ey - K(0.2));
      ctx.lineTo(ex + K(0.1), ey - K(0.13));
      ctx.stroke();
    }
    if (face === 'sad') {
      ctx.fillStyle = '#7ac8ff';
      ell(ctx, ex - K(0.02), ey + K(0.17), K(0.04), K(0.06));
      ctx.fill();
    }
  }
  // 땀 (지침)
  if (fat >= 40 && face !== 'sleep' && L.pose !== 'swim') {
    const n = fat >= 70 ? 3 : fat >= 55 ? 2 : 1;
    for (let j = 0; j < n; j++) {
      const ph = (t * 0.025 + j * 0.33) % 1;
      dropIcon(ctx, K(hx - 0.35 - j * 0.18), K(hy - 0.35 + ph * 0.5), K(0.07), 'rgba(140,210,255,.95)');
    }
  }
  ctx.restore();
}

// ── 경주 상대 (옆모습) ──
interface RSkin { body: string; dark: string; belly: string; inner: string; snout: string; bib: string; size: number }
const RSK: Record<RK, RSkin> = {
  rabbit: { body: '#f6f1ea', dark: '#d2c6b8', belly: '#ffffff', inner: '#ffb0c0', snout: '#ffffff', bib: '#3d9df5', size: 0.9 },
  bear: { body: '#b0703e', dark: '#7a4a28', belly: '#e6b88e', inner: '#7a4a28', snout: '#ecc89e', bib: '#43be3c', size: 1.16 },
  otter: { body: '#946042', dark: '#5e3c26', belly: '#f2dcbc', inner: '#5e3c26', snout: '#f6e4cc', bib: '#ffb81c', size: 0.95 },
  fox: { body: '#ff8c3c', dark: '#cc5c1c', belly: '#fff6ea', inner: '#3a2010', snout: '#fff6ea', bib: '#a46bff', size: 1.0 },
};
type RPose = 'run' | 'stand' | 'swim' | 'jump' | 'tumble' | 'happy' | 'sad';
function drawRunner(ctx: C2, kind: RK, x: number, y: number, k0: number, ph: number, pose: RPose, t: number, lane: number, tilt = 0) {
  const sk = RSK[kind], k = k0 * sk.size, K = (v: number) => v * k;
  ctx.save();
  ctx.translate(x, y);
  if (pose !== 'swim') {
    ctx.fillStyle = 'rgba(40,60,20,.25)';
    ell(ctx, 0, 0, K(0.95), K(0.17));
    ctx.fill();
  }
  ctx.rotate(tilt);
  const hop = kind === 'rabbit' && pose === 'run';
  const bob = pose === 'run' ? -Math.abs(Math.sin(ph * TAU)) * (hop ? 0.32 : 0.1) : pose === 'happy' ? -Math.abs(Math.sin(t * 0.25)) * 0.3 : 0;
  ctx.translate(0, K(bob));
  if (pose === 'tumble') {
    ctx.translate(0, -K(0.8));
    ctx.rotate(t * 0.35);
    ctx.translate(0, K(0.8));
  }
  const brx = kind === 'bear' ? 0.85 : kind === 'otter' ? 0.9 : 0.75, bry = kind === 'bear' ? 0.55 : kind === 'otter' ? 0.4 : 0.46, byy = -0.82;
  const legA = (i: number): number => {
    if (pose === 'run' || pose === 'swim') {
      if (hop) return (i < 2 ? 0.7 : -0.8) * Math.sin(ph * TAU);
      return 0.65 * Math.sin((ph + [0, 0.15, 0.5, 0.65][i]) * TAU);
    }
    if (pose === 'jump') return i < 2 ? 1.1 : -1.0;
    if (pose === 'tumble') return Math.sin(t * 0.6 + i * 1.5);
    return 0;
  };
  const hips: [number, number][] = [[0.45, -0.6], [0.55, -0.62], [-0.45, -0.6], [-0.35, -0.62]];
  const legL = K(kind === 'bear' ? 0.55 : 0.6);
  const drawLeg = (i: number, col: string) => {
    const a = legA(i), hx = K(hips[i][0]), hy = K(hips[i][1]);
    const fx = hx + Math.sin(a) * legL, fy = hy + Math.cos(a) * legL;
    ctx.lineCap = 'round';
    ctx.strokeStyle = OUT;
    ctx.lineWidth = K(0.24) + 2.2;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(fx, fy);
    ctx.stroke();
    ctx.strokeStyle = col;
    ctx.lineWidth = K(0.24);
    ctx.stroke();
    ctx.fillStyle = col;
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.5;
    ell(ctx, fx + K(0.06), fy - K(0.02), K(hop && i >= 2 ? 0.2 : 0.13), K(0.08));
    ctx.fill();
    ctx.stroke();
  };
  drawLeg(1, sk.dark);
  drawLeg(3, sk.dark);
  // 꼬리
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.8;
  if (kind === 'rabbit') {
    ctx.fillStyle = '#ffffff';
    ell(ctx, K(-0.78), K(byy - 0.1), K(0.2), K(0.2));
    ctx.fill();
    ctx.stroke();
  } else if (kind === 'bear') {
    ctx.fillStyle = sk.body;
    ell(ctx, K(-0.86), K(byy - 0.15), K(0.12), K(0.11));
    ctx.fill();
    ctx.stroke();
  } else if (kind === 'otter') {
    ctx.fillStyle = sk.dark;
    ctx.beginPath();
    const sw = Math.sin(t * 0.2 + lane) * 0.12;
    ctx.moveTo(K(-0.7), K(byy - 0.12));
    ctx.quadraticCurveTo(K(-1.3), K(byy + 0.05 + sw), K(-1.65), K(byy + 0.3 + sw));
    ctx.quadraticCurveTo(K(-1.25), K(byy + 0.22), K(-0.72), K(byy + 0.18));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    const sw = Math.sin(t * 0.15 + lane) * 0.15;
    ctx.fillStyle = sk.body;
    ctx.beginPath();
    ctx.moveTo(K(-0.65), K(byy - 0.15));
    ctx.bezierCurveTo(K(-1.1), K(byy - 0.65 + sw), K(-1.65), K(byy - 0.35 + sw), K(-1.55), K(byy + 0.05 + sw));
    ctx.bezierCurveTo(K(-1.25), K(byy + 0.25), K(-0.9), K(byy + 0.2), K(-0.68), K(byy + 0.12));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ell(ctx, K(-1.5), K(byy - 0.12 + sw), K(0.16), K(0.17));
    ctx.fill();
  }
  // 몸
  ctx.fillStyle = lin(ctx, 0, K(byy - bry), 0, K(byy + bry), [0, sk.body], [1, sk.dark]);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(2, K(0.05));
  ell(ctx, 0, K(byy), K(brx), K(bry));
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = sk.belly;
  ell(ctx, K(0.15), K(byy + bry * 0.4), K(brx * 0.6), K(bry * 0.45));
  ctx.fill();
  // 번호 띠
  ctx.fillStyle = '#ffffff';
  rr(ctx, K(-0.42), K(byy - bry * 0.75), K(0.62), K(bry * 1.05), K(0.08));
  ctx.fill();
  ctx.strokeStyle = sk.bib;
  ctx.lineWidth = Math.max(2, K(0.08));
  ctx.stroke();
  ctx.fillStyle = sk.bib;
  ctx.font = `900 ${Math.max(9, K(0.42))}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(lane + 1), K(-0.11), K(byy - bry * 0.22));
  drawLeg(2, sk.body);
  drawLeg(0, sk.body);
  // 머리
  const hx = 0.72, hy = -1.28, hr = kind === 'bear' ? 0.46 : 0.42;
  // 귀 (뒤)
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.8;
  if (kind === 'rabbit') {
    const flop = pose === 'run' ? Math.sin(ph * TAU) * 0.15 : 0;
    for (const [dx, a] of [[-0.12, -0.55 + flop], [0.1, -0.25 + flop]] as [number, number][]) {
      ctx.fillStyle = sk.body;
      ell(ctx, K(hx + dx) + Math.sin(a) * K(0.45), K(hy - 0.35) - Math.cos(a) * K(0.45), K(0.13), K(0.42), a);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = sk.inner;
      ell(ctx, K(hx + dx) + Math.sin(a) * K(0.45), K(hy - 0.35) - Math.cos(a) * K(0.45), K(0.06), K(0.3), a);
      ctx.fill();
    }
  } else if (kind === 'bear' || kind === 'otter') {
    const er = kind === 'bear' ? 0.15 : 0.09;
    for (const dx of [-0.22, 0.12]) {
      ctx.fillStyle = sk.body;
      ell(ctx, K(hx + dx), K(hy - hr * 0.85), K(er), K(er));
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = sk.inner;
      ell(ctx, K(hx + dx), K(hy - hr * 0.85), K(er * 0.5), K(er * 0.5));
      ctx.fill();
    }
  } else {
    for (const dx of [-0.25, 0.08]) {
      ctx.fillStyle = sk.body;
      ctx.beginPath();
      ctx.moveTo(K(hx + dx - 0.12), K(hy - hr * 0.6));
      ctx.lineTo(K(hx + dx - 0.02), K(hy - hr * 1.55));
      ctx.lineTo(K(hx + dx + 0.16), K(hy - hr * 0.62));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = sk.inner;
      ctx.beginPath();
      ctx.moveTo(K(hx + dx - 0.06), K(hy - hr * 0.7));
      ctx.lineTo(K(hx + dx - 0.01), K(hy - hr * 1.3));
      ctx.lineTo(K(hx + dx + 0.09), K(hy - hr * 0.7));
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.fillStyle = lin(ctx, 0, K(hy - hr), 0, K(hy + hr), [0, sk.body], [1, sk.dark]);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(2, K(0.05));
  ell(ctx, K(hx), K(hy), K(hr), K(hr * 0.92));
  ctx.fill();
  ctx.stroke();
  // 주둥이
  ctx.fillStyle = sk.snout;
  if (kind === 'fox') {
    ctx.beginPath();
    ctx.moveTo(K(hx + 0.1), K(hy - 0.08));
    ctx.quadraticCurveTo(K(hx + 0.55), K(hy - 0.02), K(hx + 0.7), K(hy + 0.12));
    ctx.quadraticCurveTo(K(hx + 0.45), K(hy + 0.32), K(hx + 0.05), K(hy + 0.28));
    ctx.closePath();
  } else ell(ctx, K(hx + 0.3), K(hy + 0.12), K(kind === 'otter' ? 0.24 : 0.2), K(0.16));
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#2a1408';
  ell(ctx, K(hx + (kind === 'fox' ? 0.68 : 0.47)), K(hy + (kind === 'fox' ? 0.1 : 0.06)), K(0.065), K(0.055));
  ctx.fill();
  if (kind === 'otter')
    for (const dy of [0.08, 0.16]) {
      ctx.strokeStyle = 'rgba(40,20,10,.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(K(hx + 0.4), K(hy + dy));
      ctx.lineTo(K(hx + 0.68), K(hy + dy - 0.04));
      ctx.stroke();
    }
  // 눈
  const ex = K(hx + 0.16), ey = K(hy - 0.08);
  ctx.strokeStyle = '#2a1408';
  ctx.fillStyle = '#2a1408';
  ctx.lineWidth = Math.max(1.6, K(0.05));
  if (pose === 'happy') {
    ctx.beginPath();
    ctx.arc(ex, ey + K(0.05), K(0.08), Math.PI + 0.3, -0.3);
    ctx.stroke();
  } else if (pose === 'tumble') {
    ctx.beginPath();
    ctx.moveTo(ex - K(0.07), ey - K(0.07));
    ctx.lineTo(ex + K(0.07), ey + K(0.07));
    ctx.moveTo(ex + K(0.07), ey - K(0.07));
    ctx.lineTo(ex - K(0.07), ey + K(0.07));
    ctx.stroke();
  } else {
    ell(ctx, ex, ey, K(0.065), K(0.085));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ell(ctx, ex + K(0.02), ey - K(0.03), K(0.022), K(0.025));
    ctx.fill();
    if (pose === 'run') {
      ctx.strokeStyle = '#2a1408';
      ctx.beginPath();
      ctx.moveTo(ex - K(0.1), ey - K(0.16));
      ctx.lineTo(ex + K(0.08), ey - K(0.12));
      ctx.stroke();
    }
    if (pose === 'sad') {
      ctx.fillStyle = '#7ac8ff';
      ell(ctx, ex, ey + K(0.14), K(0.035), K(0.05));
      ctx.fill();
    }
  }
  ctx.fillStyle = 'rgba(255,110,120,.35)';
  ell(ctx, K(hx + 0.05), K(hy + 0.15), K(0.09), K(0.05));
  ctx.fill();
  ctx.restore();
}

// ── 친구 · 구경꾼 (앞모습): 0 병아리 · 1 아기 양 · 2 다람쥐 · 3 오리 · 4 아기 돼지 ──
function drawCritter(ctx: C2, kind: number, x: number, y: number, r: number, t: number, mood: 'idle' | 'cheer' | 'laugh' | 'sad' | 'run', seed = 0) {
  const bounce = mood === 'cheer' ? Math.abs(Math.sin(t * 0.3 + seed)) * r * 0.6 : mood === 'run' ? Math.abs(Math.sin(t * 0.35 + seed)) * r * 0.35 : mood === 'laugh' ? Math.abs(Math.sin(t * 0.5 + seed)) * r * 0.15 : 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(40,60,20,.22)';
  ell(ctx, 0, 0, r * 0.75, r * 0.18);
  ctx.fill();
  ctx.translate(0, -bounce);
  if (mood === 'laugh') ctx.rotate(Math.sin(t * 0.5 + seed) * 0.12);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1.4, r * 0.08);
  const cy = -r * 0.95;
  // 팔·날개 (응원하면 번쩍)
  const up = mood === 'cheer' ? -1.9 + Math.sin(t * 0.6 + seed) * 0.4 : mood === 'laugh' ? -0.4 : 0.3;
  const armCol = kind === 0 ? '#ffc21a' : kind === 1 ? '#3a3440' : kind === 2 ? '#b8682a' : kind === 3 ? '#f4f4f4' : '#ff9ab0';
  for (const sd of [-1, 1]) {
    ctx.save();
    ctx.translate(sd * r * 0.75, cy + r * 0.15);
    ctx.rotate(sd * -up);
    ctx.fillStyle = armCol;
    ell(ctx, 0, r * 0.28, r * 0.17, r * 0.34);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  if (kind === 2) {
    // 다람쥐 꼬리
    ctx.fillStyle = '#c8783a';
    ctx.beginPath();
    ctx.moveTo(r * 0.4, cy + r * 0.6);
    ctx.bezierCurveTo(r * 1.5, cy + r * 0.4, r * 1.6, cy - r * 1.2, r * 0.8, cy - r * 1.3);
    ctx.bezierCurveTo(r * 1.2, cy - r * 0.5, r * 0.9, cy, r * 0.5, cy + r * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // 몸 · 머리
  if (kind === 1) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      ctx.moveTo(Math.cos(a) * r * 0.72 + r * 0.32, cy + Math.sin(a) * r * 0.7);
      ctx.arc(Math.cos(a) * r * 0.72, cy + Math.sin(a) * r * 0.7, r * 0.32, 0, TAU);
    }
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ell(ctx, 0, cy, r * 0.8, r * 0.78);
    ctx.fill();
    ctx.fillStyle = '#4a4450';
    ell(ctx, 0, cy + r * 0.08, r * 0.5, r * 0.55);
    ctx.fill();
    ctx.stroke();
    for (const sd of [-1, 1]) {
      ctx.fillStyle = '#4a4450';
      ell(ctx, sd * r * 0.58, cy - r * 0.05, r * 0.22, r * 0.11, sd * 0.4);
      ctx.fill();
    }
  } else {
    const body = kind === 0 ? '#ffd84a' : kind === 2 ? '#d8884a' : kind === 3 ? '#ffffff' : '#ffb0c4';
    ctx.fillStyle = radg(ctx, -r * 0.3, cy - r * 0.35, 0, r * 1.1, [0, '#ffffff'], [0.25, body], [1, body]);
    ell(ctx, 0, cy, r * 0.82, r * 0.82);
    ctx.fill();
    ctx.stroke();
    if (kind === 2 || kind === 4) {
      for (const sd of [-1, 1]) {
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.moveTo(sd * r * 0.25, cy - r * 0.7);
        ctx.lineTo(sd * r * 0.55, cy - r * (kind === 2 ? 1.2 : 0.95));
        ctx.lineTo(sd * r * 0.7, cy - r * 0.45);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      if (kind === 2) {
        ctx.fillStyle = '#ffe6c4';
        ell(ctx, 0, cy + r * 0.3, r * 0.45, r * 0.38);
        ctx.fill();
      }
    }
    if (kind === 0) {
      ctx.fillStyle = '#ffc21a';
      ctx.beginPath();
      ctx.moveTo(-r * 0.1, cy - r * 0.8);
      ctx.quadraticCurveTo(0, cy - r * 1.15, r * 0.15, cy - r * 0.78);
      ctx.fill();
    }
  }
  // 얼굴
  const fy = cy - r * 0.05;
  ctx.fillStyle = kind === 1 ? '#ffffff' : '#2a1408';
  ctx.strokeStyle = kind === 1 ? '#ffffff' : '#2a1408';
  ctx.lineWidth = Math.max(1.4, r * 0.1);
  for (const sd of [-1, 1]) {
    if (mood === 'cheer' || mood === 'laugh') {
      ctx.beginPath();
      ctx.arc(sd * r * 0.3, fy, r * 0.12, Math.PI + 0.4, -0.4);
      ctx.stroke();
    } else if (mood === 'sad') {
      ctx.beginPath();
      ctx.moveTo(sd * r * 0.4, fy - r * 0.08);
      ctx.lineTo(sd * r * 0.2, fy);
      ctx.stroke();
    } else {
      ell(ctx, sd * r * 0.3, fy, r * 0.1, r * 0.13);
      ctx.fill();
    }
  }
  if (kind === 0 || kind === 3) {
    ctx.fillStyle = '#ff9a1a';
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    const open = mood === 'cheer' || mood === 'laugh' ? r * 0.18 : 0;
    ctx.moveTo(-r * 0.2, fy + r * 0.22);
    ctx.lineTo(r * 0.2, fy + r * 0.22);
    ctx.lineTo(0, fy + r * 0.42 + open);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (kind === 4) {
    ctx.fillStyle = '#ff8aa4';
    ell(ctx, 0, fy + r * 0.3, r * 0.26, r * 0.18);
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = '#a8405a';
    for (const sd of [-1, 1]) {
      ell(ctx, sd * r * 0.09, fy + r * 0.3, r * 0.04, r * 0.06);
      ctx.fill();
    }
  } else {
    ctx.strokeStyle = kind === 1 ? '#ffffff' : '#2a1408';
    ctx.lineWidth = Math.max(1.2, r * 0.08);
    ctx.beginPath();
    if (mood === 'cheer' || mood === 'laugh') ctx.arc(0, fy + r * 0.22, r * 0.16, 0.2, Math.PI - 0.2);
    else ctx.arc(0, fy + r * 0.3, r * 0.1, Math.PI + 0.5, -0.5);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,110,130,.45)';
  for (const sd of [-1, 1]) {
    ell(ctx, sd * r * 0.52, fy + r * 0.2, r * 0.13, r * 0.08);
    ctx.fill();
  }
  ctx.restore();
}

// ── 배경 (크기별로 한 번 그려 둔다) ──
const BG = new Map<string, HTMLCanvasElement>();
function layer(w: number, h: number, sc: number, paint: (c: C2) => void) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w * sc));
  c.height = Math.max(1, Math.ceil(h * sc));
  const g = c.getContext('2d')!;
  g.scale(sc, sc);
  paint(g);
  return c;
}
function cloud(g: C2, cx: number, cy: number, cw: number, a = 0.95) {
  g.fillStyle = `rgba(255,255,255,${a})`;
  g.beginPath();
  for (const [dx, dy, q] of [[-0.5, 0.1, 0.4], [0, -0.15, 0.55], [0.5, 0.1, 0.42], [0.2, 0.15, 0.4], [-0.25, 0.18, 0.36]]) {
    g.moveTo(cx + dx * cw + q * cw, cy + dy * cw);
    g.arc(cx + dx * cw, cy + dy * cw, q * cw, 0, TAU);
  }
  g.fill();
  g.fillStyle = 'rgba(190,220,255,.35)';
  g.beginPath();
  g.ellipse(cx, cy + cw * 0.35, cw * 0.8, cw * 0.12, 0, 0, TAU);
  g.fill();
}
function tree(g: C2, tx: number, ty: number, tr: number, i: number) {
  g.fillStyle = 'rgba(40,80,20,.25)';
  g.beginPath();
  g.ellipse(tx, ty + tr * 0.05, tr * 0.9, tr * 0.22, 0, 0, TAU);
  g.fill();
  g.fillStyle = '#8a5a32';
  g.fillRect(tx - tr * 0.12, ty - tr * 0.55, tr * 0.24, tr * 0.6);
  g.fillStyle = i % 2 ? '#5cb048' : '#68bc4e';
  g.beginPath();
  g.arc(tx, ty - tr * 1.05, tr * 0.75, 0, TAU);
  g.arc(tx - tr * 0.55, ty - tr * 0.65, tr * 0.55, 0, TAU);
  g.arc(tx + tr * 0.55, ty - tr * 0.65, tr * 0.55, 0, TAU);
  g.fill();
  g.strokeStyle = 'rgba(40,90,30,.5)';
  g.lineWidth = 1.2;
  g.stroke();
  g.fillStyle = 'rgba(255,255,210,.35)';
  g.beginPath();
  g.arc(tx - tr * 0.25, ty - tr * 1.35, tr * 0.32, 0, TAU);
  g.fill();
}
/** 목장 배경 */
function getRanchBg(w: number, h: number, sc: number): HTMLCanvasElement {
  const key = `ranch${w}x${h}@${sc}`;
  const hit = BG.get(key);
  if (hit) return hit;
  const R = (v: number) => v * w;
  const c = layer(w, h, sc, (g) => {
    g.fillStyle = lin(g, 0, 0, 0, R(0.33), [0, '#5ec2ff'], [0.55, '#a8e4ff'], [1, '#fff3cc']);
    g.fillRect(0, 0, w, R(0.34));
    g.fillStyle = radg(g, R(0.88), R(0.12), 0, R(0.6), [0, 'rgba(255,250,210,.9)'], [0.3, 'rgba(255,245,200,.3)'], [1, 'rgba(255,245,200,0)']);
    g.fillRect(0, 0, w, R(0.4));
    for (let i = 0; i < 4; i++) cloud(g, R(0.08 + i * 0.28 + hsh(i) * 0.06), R(0.175 + hsh(i + 3) * 0.05), R(0.07 + hsh(i + 5) * 0.04), 0.85);
    // 먼 언덕
    for (const [yy, col, amp, ph] of [[0.272, '#a8de7c', 0.022, 1], [0.296, '#8cd062', 0.014, 4]] as [number, string, number, number][]) {
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(0, R(0.36));
      for (let x = 0; x <= 1.001; x += 0.02) g.lineTo(R(x), R(yy - amp * Math.sin(x * 7 + ph) - amp * 0.6 * Math.sin(x * 13 + ph * 2)));
      g.lineTo(w, R(0.36));
      g.closePath();
      g.fill();
    }
    // 풍차 (왼쪽 멀리)
    const wx = R(0.13), wy = R(0.29);
    g.fillStyle = lin(g, wx - R(0.03), 0, wx + R(0.03), 0, [0, '#f0e4d0'], [1, '#c8b49a']);
    g.beginPath();
    g.moveTo(wx - R(0.032), wy);
    g.lineTo(wx - R(0.018), wy - R(0.1));
    g.lineTo(wx + R(0.018), wy - R(0.1));
    g.lineTo(wx + R(0.032), wy);
    g.closePath();
    g.fill();
    g.strokeStyle = '#8a6a4a';
    g.lineWidth = 1.2;
    g.stroke();
    g.fillStyle = '#d0503a';
    g.beginPath();
    g.moveTo(wx - R(0.026), wy - R(0.1));
    g.lineTo(wx, wy - R(0.13));
    g.lineTo(wx + R(0.026), wy - R(0.1));
    g.closePath();
    g.fill();
    // 마구간 (오른쪽)
    const bx = R(0.8), byy = R(0.335), bw = R(0.2), bh = R(0.085);
    g.fillStyle = 'rgba(40,70,20,.25)';
    g.fillRect(bx - bw * 0.55, byy - R(0.004), bw * 1.15, R(0.012));
    g.fillStyle = lin(g, 0, byy - bh, 0, byy, [0, '#e85a4a'], [1, '#b8342a']);
    g.fillRect(bx - bw / 2, byy - bh, bw, bh);
    g.strokeStyle = '#6a1a12';
    g.lineWidth = 1.5;
    g.strokeRect(bx - bw / 2, byy - bh, bw, bh);
    g.fillStyle = '#ffffff';
    g.fillRect(bx - bw * 0.16, byy - bh * 0.62, bw * 0.32, bh * 0.62);
    g.strokeStyle = '#b8342a';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(bx - bw * 0.16, byy - bh * 0.62);
    g.lineTo(bx + bw * 0.16, byy);
    g.moveTo(bx + bw * 0.16, byy - bh * 0.62);
    g.lineTo(bx - bw * 0.16, byy);
    g.stroke();
    g.fillStyle = lin(g, 0, byy - bh - R(0.05), 0, byy - bh, [0, '#8a4a2a'], [1, '#5a2e18']);
    g.beginPath();
    g.moveTo(bx - bw * 0.58, byy - bh);
    g.lineTo(bx, byy - bh - R(0.055));
    g.lineTo(bx + bw * 0.58, byy - bh);
    g.closePath();
    g.fill();
    g.fillStyle = '#ffe9a8';
    g.beginPath();
    g.arc(bx, byy - bh - R(0.018), R(0.011), 0, TAU);
    g.fill();
    for (let i = 0; i < 6; i++) tree(g, R(0.25 + i * 0.09 + hsh(i + 20) * 0.03), R(0.3 + hsh(i + 21) * 0.008), R(0.022 + hsh(i + 22) * 0.012), i);
    // 목장 풀밭
    const gy0 = R(0.3), gy1 = R(1.0);
    g.fillStyle = lin(g, 0, gy0, 0, gy1, [0, '#a6e070'], [0.45, '#8fd65c'], [1, '#6cbc42']);
    g.fillRect(0, gy0, w, gy1 - gy0);
    for (let i = 0; i < 12; i++) {
      const u0 = i / 12, u1 = (i + 0.5) / 12, y0 = gy0 + (gy1 - gy0) * u0 ** 1.2, y1 = gy0 + (gy1 - gy0) * u1 ** 1.2;
      g.fillStyle = 'rgba(255,255,230,.08)';
      g.fillRect(0, y0, w, y1 - y0);
    }
    g.fillStyle = radg(g, R(0.5), R(0.7), 0, R(0.6), [0, 'rgba(255,255,210,.3)'], [1, 'rgba(255,255,210,0)']);
    g.fillRect(0, gy0, w, gy1 - gy0);
    // 훈련장 흙 둥근 자리
    g.fillStyle = 'rgba(200,150,90,.35)';
    g.beginPath();
    g.ellipse(R(0.5), R(PONY_Y + 0.005), R(0.44), R(0.085), 0, 0, TAU);
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,.4)';
    g.lineWidth = R(0.006);
    g.setLineDash([R(0.02), R(0.015)]);
    g.stroke();
    g.setLineDash([]);
    // 풀포기 · 꽃
    for (let i = 0; i < 80; i++) {
      const x = hsh(i + 40) * w, yu = hsh(i + 41), y = R(0.44) + (R(0.98) - R(0.44)) * yu;
      if (((x - R(0.5)) / R(0.46)) ** 2 + ((y - R(PONY_Y)) / R(0.1)) ** 2 < 1) continue;
      const s2 = R(0.007 + yu * 0.011);
      g.strokeStyle = 'rgba(60,140,40,.6)';
      g.lineWidth = Math.max(1, s2 * 0.35);
      g.beginPath();
      for (const d of [-1, 0, 1]) {
        g.moveTo(x + d * s2 * 0.4, y);
        g.lineTo(x + d * s2 * 0.9, y - s2 * (1.4 - Math.abs(d) * 0.4));
      }
      g.stroke();
      if (i % 4 === 0) {
        g.fillStyle = ['#ffffff', '#ffe14a', '#ff9ac0', '#bfa8ff'][i % 4 === 0 ? (i / 4) % 4 : 0];
        for (let q = 0; q < 5; q++) {
          const a = (q / 5) * TAU;
          g.beginPath();
          g.arc(x + Math.cos(a) * s2 * 0.5, y - s2 * 1.5 + Math.sin(a) * s2 * 0.5, s2 * 0.42, 0, TAU);
          g.fill();
        }
        g.fillStyle = '#ffb02a';
        g.beginPath();
        g.arc(x, y - s2 * 1.5, s2 * 0.32, 0, TAU);
        g.fill();
      }
    }
    // 건초더미 (왼쪽 앞)
    for (const [hx, hy, hr] of [[0.07, 0.6, 0.075], [0.94, 0.66, 0.06]]) {
      g.fillStyle = 'rgba(60,80,20,.28)';
      g.beginPath();
      g.ellipse(R(hx), R(hy), R(hr * 1.2), R(hr * 0.3), 0, 0, TAU);
      g.fill();
      g.fillStyle = lin(g, 0, R(hy - hr * 1.3), 0, R(hy), [0, '#ffe08a'], [1, '#d8a838']);
      g.beginPath();
      g.ellipse(R(hx), R(hy - hr * 0.55), R(hr), R(hr * 0.75), 0, 0, TAU);
      g.fill();
      g.strokeStyle = '#a87a1a';
      g.lineWidth = 1.5;
      g.stroke();
      g.strokeStyle = 'rgba(168,122,26,.6)';
      g.lineWidth = 1;
      for (let q = 0; q < 7; q++) {
        g.beginPath();
        g.moveTo(R(hx - hr * 0.8 + q * hr * 0.26), R(hy - hr * 0.2));
        g.lineTo(R(hx - hr * 0.7 + q * hr * 0.24), R(hy - hr * 1.0));
        g.stroke();
      }
    }
    // 뒤 울타리 (3/4 시점: 기둥 + 가로대 두 줄)
    const fy = R(0.43);
    for (let i = 0; i <= 10; i++) {
      const px = R(-0.02 + i * 0.104);
      g.fillStyle = 'rgba(60,40,20,.22)';
      g.fillRect(px - R(0.012), fy + R(0.003), R(0.03), R(0.012));
      g.fillStyle = lin(g, px - R(0.013), 0, px + R(0.013), 0, [0, '#f2f2ea'], [1, '#c8c8be']);
      rr(g, px - R(0.013), fy - R(0.075), R(0.026), R(0.078), R(0.007));
      g.fill();
      g.strokeStyle = '#7a7a6a';
      g.lineWidth = 1;
      g.stroke();
    }
    for (const ry of [-0.062, -0.032]) {
      g.fillStyle = lin(g, 0, fy + R(ry), 0, fy + R(ry + 0.014), [0, '#ffffff'], [1, '#d4d4ca']);
      g.fillRect(0, fy + R(ry), w, R(0.014));
      g.strokeStyle = '#8a8a7a';
      g.lineWidth = 1;
      g.strokeRect(-2, fy + R(ry), w + 4, R(0.014));
    }
    // 카드 자리: 나무 판
    const st = R(0.985);
    g.fillStyle = 'rgba(60,30,10,.28)';
    g.fillRect(0, st - R(0.012), w, R(0.014));
    g.fillStyle = lin(g, 0, st, 0, h, [0, '#eab474'], [0.08, '#d89656'], [1, '#b8723a']);
    rr(g, 0, st, w, h - st + 6, R(0.03));
    g.fill();
    g.strokeStyle = 'rgba(110,60,20,.3)';
    g.lineWidth = 1;
    for (let i = 1; i < 6; i++) {
      g.beginPath();
      g.moveTo(R(i / 6 + (hsh(i) - 0.5) * 0.02), st + R(0.03));
      g.lineTo(R(i / 6 + (hsh(i) - 0.5) * 0.02), h);
      g.stroke();
    }
    g.fillStyle = 'rgba(255,240,200,.55)';
    rr(g, R(0.02), st + R(0.006), w - R(0.04), R(0.008), R(0.004));
    g.fill();
  });
  BG.set(key, c);
  return c;
}
/** 경주장 배경 (하늘 · 관중석) */
function getRaceBg(w: number, h: number, sc: number): HTMLCanvasElement {
  const key = `race${w}x${h}@${sc}`;
  const hit = BG.get(key);
  if (hit) return hit;
  const R = (v: number) => v * w;
  const c = layer(w, h, sc, (g) => {
    g.fillStyle = lin(g, 0, 0, 0, R(0.5), [0, '#58bcff'], [0.6, '#a8e4ff'], [1, '#fff0c4']);
    g.fillRect(0, 0, w, R(0.52));
    g.fillStyle = radg(g, R(0.15), R(0.14), 0, R(0.5), [0, 'rgba(255,250,210,.9)'], [1, 'rgba(255,245,200,0)']);
    g.fillRect(0, 0, w, R(0.45));
    for (let i = 0; i < 3; i++) cloud(g, R(0.2 + i * 0.32), R(0.19 + hsh(i + 9) * 0.04), R(0.07), 0.8);
    g.fillStyle = '#9edc74';
    g.beginPath();
    g.moveTo(0, R(0.42));
    for (let x = 0; x <= 1.001; x += 0.02) g.lineTo(R(x), R(0.315 - 0.02 * Math.sin(x * 6 + 1)));
    g.lineTo(w, R(0.42));
    g.fill();
    // 관중석
    const sy0 = R(0.33), sy1 = R(0.47);
    g.fillStyle = lin(g, 0, sy0, 0, sy1, [0, '#e2e8f0'], [1, '#b8c2d0']);
    g.beginPath();
    g.moveTo(0, sy1);
    g.lineTo(0, sy0 + R(0.02));
    g.lineTo(w, sy0);
    g.lineTo(w, sy1);
    g.closePath();
    g.fill();
    for (let row = 0; row < 4; row++) {
      const yy = sy0 + R(0.03 + row * 0.03);
      g.fillStyle = 'rgba(90,100,120,.25)';
      g.fillRect(0, yy + R(0.012), w, R(0.004));
      for (let i = 0; i < 16; i++) {
        const x = R((i + (row % 2) * 0.5) / 15.5 - 0.02), hr = R(0.014 + row * 0.0015);
        const col = ['#ffd84a', '#f6f1ea', '#d8884a', '#ffb0c4', '#b0703e', '#ff8c3c', '#8ad0ff'][(i * 3 + row * 5) % 7];
        g.fillStyle = col;
        g.beginPath();
        g.arc(x, yy, hr, 0, TAU);
        g.fill();
        g.strokeStyle = 'rgba(90,46,18,.5)';
        g.lineWidth = 0.8;
        g.stroke();
        g.fillStyle = '#2a1408';
        g.beginPath();
        g.arc(x - hr * 0.35, yy - hr * 0.1, hr * 0.15, 0, TAU);
        g.arc(x + hr * 0.35, yy - hr * 0.1, hr * 0.15, 0, TAU);
        g.fill();
      }
    }
    // 지붕 + 줄무늬 차양
    g.fillStyle = '#ffffff';
    g.fillRect(0, sy0 - R(0.02), w, R(0.022));
    for (let i = 0; i < 14; i++) {
      g.fillStyle = i % 2 ? '#ff5a5a' : '#ffffff';
      g.beginPath();
      g.moveTo(R(i / 14), sy0 - R(0.02));
      g.lineTo(R((i + 1) / 14), sy0 - R(0.02));
      g.lineTo(R((i + 0.5) / 14), sy0 + R(0.012));
      g.closePath();
      g.fill();
    }
    g.fillStyle = 'rgba(255,255,255,.9)';
    g.fillRect(0, sy1 - R(0.006), w, R(0.008));
    // 안쪽 풀밭
    g.fillStyle = lin(g, 0, sy1, 0, R(0.56), [0, '#8fd65c'], [1, '#7ccc4c']);
    g.fillRect(0, sy1, w, R(0.56) - sy1);
    // 앞 풀밭
    g.fillStyle = lin(g, 0, R(1.13), 0, h, [0, '#86d256'], [1, '#62b83c']);
    g.fillRect(0, R(1.13), w, h - R(1.13));
    for (let i = 0; i < 40; i++) {
      const x = hsh(i + 70) * w, y = R(1.2) + hsh(i + 71) * (h - R(1.22)), s2 = R(0.012);
      g.strokeStyle = 'rgba(50,130,40,.6)';
      g.lineWidth = 1.2;
      g.beginPath();
      for (const d of [-1, 0, 1]) {
        g.moveTo(x + d * s2 * 0.4, y);
        g.lineTo(x + d * s2 * 0.9, y - s2 * (1.4 - Math.abs(d) * 0.4));
      }
      g.stroke();
    }
  });
  BG.set(key, c);
  return c;
}

// ── 길 띠 (다음 대회) ──
const SEG_COL: Record<SegK, [string, string]> = {
  flat: ['#b8e88a', '#7cc450'],
  hill: ['#8ad860', '#4a9a32'],
  water: ['#8ad4ff', '#3a9ae8'],
  mud: ['#c89a6a', '#8a5a32'],
  hurdle: ['#f2d8a8', '#c89a58'],
};
function segTile(ctx: C2, k: SegK, x0: number, y0: number, sw: number, sh: number, t: number) {
  const [c1, c2] = SEG_COL[k];
  ctx.save();
  rr(ctx, x0, y0, sw, sh, Math.min(sh * 0.25, 6));
  ctx.clip();
  ctx.fillStyle = lin(ctx, 0, y0, 0, y0 + sh, [0, c1], [1, c2]);
  ctx.fillRect(x0, y0, sw, sh);
  if (k === 'hill') {
    ctx.fillStyle = '#5aae3a';
    ctx.beginPath();
    ctx.moveTo(x0, y0 + sh);
    ctx.quadraticCurveTo(x0 + sw / 2, y0 - sh * 0.2, x0 + sw, y0 + sh);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,220,.35)';
    ctx.beginPath();
    ctx.moveTo(x0 + sw * 0.2, y0 + sh * 0.8);
    ctx.quadraticCurveTo(x0 + sw * 0.4, y0 + sh * 0.25, x0 + sw * 0.55, y0 + sh * 0.35);
    ctx.lineTo(x0 + sw * 0.35, y0 + sh * 0.85);
    ctx.fill();
  } else if (k === 'water') {
    ctx.strokeStyle = 'rgba(255,255,255,.7)';
    ctx.lineWidth = 1.5;
    for (let j = 0; j < 2; j++) {
      ctx.beginPath();
      for (let x = 0; x <= sw; x += 3) {
        const yy = y0 + sh * (0.4 + j * 0.3) + Math.sin(x * 0.25 + t * 0.08 + j) * sh * 0.06;
        x ? ctx.lineTo(x0 + x, yy) : ctx.moveTo(x0 + x, yy);
      }
      ctx.stroke();
    }
  } else if (k === 'mud') {
    ctx.fillStyle = 'rgba(90,50,20,.45)';
    for (let j = 0; j < 5; j++) {
      ell(ctx, x0 + sw * (0.12 + j * 0.2), y0 + sh * (0.45 + (j % 2) * 0.25), sh * 0.16, sh * 0.09);
      ctx.fill();
    }
  } else if (k === 'hurdle') {
    for (let j = 0; j < 3; j++) {
      const hx = x0 + sw * (0.2 + j * 0.3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(hx - sh * 0.18, y0 + sh * 0.35, sh * 0.36, sh * 0.12);
      ctx.fillStyle = '#ff5a5a';
      ctx.fillRect(hx - sh * 0.06, y0 + sh * 0.35, sh * 0.12, sh * 0.12);
      ctx.fillStyle = '#8a5a32';
      ctx.fillRect(hx - sh * 0.18, y0 + sh * 0.35, sh * 0.04, sh * 0.5);
      ctx.fillRect(hx + sh * 0.14, y0 + sh * 0.35, sh * 0.04, sh * 0.5);
    }
  } else {
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x0, y0 + sh * 0.62);
    ctx.lineTo(x0 + sw, y0 + sh * 0.62);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(70,40,15,.55)';
  ctx.lineWidth = 1.5;
  rr(ctx, x0, y0, sw, sh, Math.min(sh * 0.25, 6));
  ctx.stroke();
}
function finishFlag(ctx: C2, x: number, y: number, hh: number, t: number) {
  ctx.strokeStyle = '#6a4a2a';
  ctx.lineWidth = Math.max(2, hh * 0.08);
  ctx.beginPath();
  ctx.moveTo(x, y + hh * 0.5);
  ctx.lineTo(x, y - hh * 0.5);
  ctx.stroke();
  const fw = hh * 0.62, fh = hh * 0.45, n = 4;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < 3; j++) {
      const wv = Math.sin(t * 0.15 + i * 0.8) * hh * 0.04;
      ctx.fillStyle = (i + j) % 2 ? '#2a2a2a' : '#ffffff';
      ctx.fillRect(x + (i * fw) / n, y - hh * 0.5 + (j * fh) / 3 + wv, fw / n + 0.5, fh / 3 + 0.5);
    }
  ctx.strokeStyle = 'rgba(0,0,0,.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y - hh * 0.5, fw, fh);
}

// ── 연출 기억 (상태와 무관) ──
interface Vis { ev: number; cheer: number; laugh: number; sad: number; statT: number[]; foreT: number; foreFrom: string; passT: number; passTxt: string; confT: number }
const VIS = new WeakMap<object, Vis>();
const visOf = (s: PonyState): Vis => {
  let v = VIS.get(s);
  if (!v) VIS.set(s, (v = { ev: -1, cheer: -999, laugh: -999, sad: -999, statT: [-999, -999, -999, -999, -999], foreT: -999, foreFrom: '', passT: -999, passTxt: '', confT: -999 }));
  return v;
};
const isRaceView = (s: PonyState) => s.phase === 'pre' || s.phase === 'race' || s.phase === 'result';
/** 보이는 능력: 장애물 카드가 나오기 전엔 꾀를 숨긴다 */
const shownStats = (s: PonyState) => (STAGES[s.stage].cards.includes('jump') ? [0, 1, 2, 3] : [0, 1, 2]);

function drawAll(ctx: C2, s: PonyState, w: number, h: number, th: Theme) {
  void th;
  const fx = juice(s), vis = visOf(s), X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w;
  const t = s.t;
  const sc = typeof ctx.getTransform === 'function' ? ctx.getTransform().a || 1 : 1;
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  // ── 사건 → 연출 ──
  for (const e of s.events) {
    if (e.t <= vis.ev || t - e.t > 12) continue;
    const ex = X(e.x), ey = Y(e.y);
    switch (e.kind) {
      case 'gain': {
        const c = s.cur, si = c ? c.stat : 0;
        fx.pop(ex, ey - R(0.05), `+${e.n} ${e.text}`, STAT_LIGHT[si], Math.max(20, R(0.075)));
        fx.burst(ex, ey + R(0.06), STAT_COL[si], 26, 5, 3.4);
        fx.burst(ex, ey + R(0.06), '#ffffff', 12, 3.5, 2.4);
        fx.ring(ex, ey + R(0.1), STAT_COL[si], R(0.2), 5);
        fx.kick(5);
        vis.cheer = t;
        vis.statT[si] = t;
        break;
      }
      case 'fall':
        fx.pop(ex, ey - R(0.1), `꽈당! +${e.n}뿐`, '#ffffff', Math.max(18, R(0.065)));
        fx.burst(ex, ey + R(0.08), '#d8b080', 22, 4, 3.5);
        fx.kick(8);
        vis.laugh = t;
        if (s.cur) vis.statT[s.cur.stat] = t;
        break;
      case 'rest':
        fx.pop(ex, ey - R(0.1), `지침 -${e.n}`, '#bff0c0', Math.max(18, R(0.065)));
        for (let q = 0; q < 3; q++) fx.burst(ex + R((q - 1) * 0.12), ey, ['#ff9ac0', '#bff0c0', '#ffffff'][q], 10, 3, 2.6);
        vis.statT[4] = t;
        vis.cheer = t;
        break;
      case 'big':
        fx.kick(9);
        fx.blink('#fffbe0', 0.28);
        for (let q = 0; q < 6; q++) fx.burst(X(0.15 + q * 0.14), Y(e.y) + R((q % 2) * 0.04), ['#ffd23a', '#ff6a8a', '#5ad0ff', '#7ae06a', '#c08aff', '#ffffff'][q], 10, 4, 2.6);
        break;
      case 'fore':
        vis.foreT = t;
        vis.foreFrom = e.text ?? '';
        if ((e.n ?? 5) < Number(e.text)) fx.burst(X(0.83), Y(PANEL_Y + 0.025), '#ffd23a', 18, 3.5, 2.6);
        break;
      case 'pick':
        fx.burst(X(e.x), Y(e.y), '#ffffff', 16, 4, 2.6);
        fx.ring(X(e.x), Y(e.y), '#ffe14a', R(0.16), 4);
        break;
      case 'miss':
        fx.ring(ex, ey, 'rgba(255,255,255,.8)', R(0.05), 2);
        break;
      case 'go':
        fx.kick(6);
        fx.blink('#ffffff', 0.25);
        break;
      case 'pass':
        vis.passT = t;
        vis.passTxt = (e.n ?? 5) === 1 ? '1등으로!' : '앞질렀다!';
        fx.burst(X(0.4), Y(0.75), '#ffe14a', 14, 3.5, 2.4);
        break;
      case 'passed':
        vis.passT = t;
        vis.passTxt = '앗, 따라잡혔다!';
        break;
      case 'slow':
        fx.blink('#ffffff', 0.18);
        break;
      case 'finish':
        if ((e.n ?? 0) === 1 || e.text === 'pony') vis.confT = t;
        break;
      case 'clear':
        vis.cheer = t;
        for (let q = 0; q < 7; q++) fx.burst(X(0.1 + q * 0.135), Y(0.55 + (q % 2) * 0.12), ['#ff6a8a', '#ffd23a', '#5ad0ff', '#7ae06a', '#c08aff', '#ff9a3a', '#ffffff'][q], 16, 4.5, 3);
        break;
      case 'fail':
        vis.sad = t;
        fx.kick(5);
        break;
    }
  }
  vis.ev = Math.max(vis.ev, ...s.events.map((e) => e.t), vis.ev);
  const scl = Math.min(3, Math.max(1, Math.round(sc)));
  if (isRaceView(s) && s.race) drawRace(ctx, s, vis, fx, w, h, scl, font);
  else drawRanch(ctx, s, vis, fx, w, h, scl, font);
  drawPanel(ctx, s, vis, w, font);
  drawTop(ctx, s, w, font);
  drawOverlays(ctx, s, fx, w, h, font);
}

// ───────── 목장 (훈련) ─────────
const HILL_CX = 0.64, HILL_HW = 0.3, HILL_H = 0.24, HILL_BASE = PONY_Y + 0.03;
const hillY = (x: number, a: number) => {
  const q = (x - HILL_CX) / HILL_HW;
  return Math.abs(q) >= 1 ? PONY_Y : Math.min(PONY_Y, HILL_BASE - HILL_H * a * Math.cos((q * Math.PI) / 2) ** 2);
};
const HUR = [0.42, 0.66];
interface PPose { x: number; y: number; tilt: number; rot: number; pose: Pose; face: Face; wind: number; sink: number; ph: number; flash: number }
function ponyPose(s: PonyState): PPose {
  const t = s.t, fat = s.fat;
  const base: PPose = { x: PONY_X, y: PONY_Y, tilt: 0, rot: 0, pose: 'stand', face: fat >= 60 ? 'tired' : s.phase === 'train' && s.pt < 30 && s.turn > 0 ? 'happy' : 'idle', wind: 0, sink: 0, ph: 0, flash: 0 };
  const c = s.cur;
  if (!c || s.phase !== 'anim') return base;
  const u = s.pt, fl = c.applied && !c.fail ? Math.max(0, 1 - (u - APPLY_T) / 26) : 0;
  const home = (p: PPose, from: number): PPose => {
    if (u < 90) return p;
    const q = easeIO((u - 90) / 14);
    return { ...p, x: p.x + (PONY_X - p.x) * q, y: p.y + (PONY_Y - p.y) * q - Math.sin(q * Math.PI) * 0.06, rot: p.rot * (1 - q), tilt: p.tilt * (1 - q), sink: p.sink * (1 - q), pose: q > 0.2 ? 'gallop' : p.pose, ph: t * 0.1, face: q > 0.5 ? (c.fail ? 'sad' : 'happy') : p.face, wind: 0.4 };
    void from;
  };
  switch (c.k) {
    case 'run': {
      if (c.fail && u >= 40) {
        const q = ease((u - 40) / 24);
        const lying = u >= 64;
        return home({ x: 0.5 + q * 0.12, y: PONY_Y, tilt: 0, rot: lying ? Math.PI : q * Math.PI * 3, pose: 'tumble', face: 'dizzy', wind: 0, sink: 0, ph: 0, flash: 0 }, 0);
      }
      const slow = u > 84 ? 1 - (u - 84) / 20 : 1;
      return home({ x: 0.5, y: PONY_Y, tilt: 0, rot: 0, pose: slow > 0.2 ? 'gallop' : 'stand', face: u > APPLY_T ? 'happy' : 'effort', wind: slow, sink: 0, ph: t * 0.1, flash: fl }, 0);
    }
    case 'hill': {
      if (u < 8) return { ...base, face: 'effort' };
      if (c.fail && u >= 34) {
        const x0 = 0.24 + easeIO(26 / 48) * (HILL_CX - 0.24);
        const q = ease((u - 34) / 22), x = x0 + (0.32 - x0) * q;
        const lying = u >= 56;
        return home({ x, y: lying ? PONY_Y : hillY(x, 1), tilt: 0, rot: lying ? Math.PI : q * Math.PI * 2.5, pose: 'tumble', face: 'dizzy', wind: 0, sink: 0, ph: 0, flash: 0 }, 0);
      }
      if (u < 56) {
        const p = easeIO((u - 8) / 48), x = 0.24 + p * (HILL_CX - 0.24), dx = 0.01;
        const sl = (hillY(x + dx, 1) - hillY(x - dx, 1)) / (2 * dx);
        return { x, y: hillY(x, 1), tilt: Math.atan(sl) * 0.9, rot: 0, pose: 'gallop', face: 'effort', wind: 0.6, sink: 0, ph: t * 0.17, flash: 0 };
      }
      return home({ x: HILL_CX, y: hillY(HILL_CX, 1), tilt: 0, rot: 0, pose: u < 88 ? 'flex' : 'stand', face: 'proud', wind: 0.2, sink: 0, ph: 0, flash: fl }, 0);
    }
    case 'swim': {
      if (u < 8) return base;
      if (u < 20) {
        const q = (u - 8) / 12;
        return { x: 0.5 - 0.22 * q, y: PONY_Y, tilt: 0, rot: 0, pose: 'gallop', face: 'idle', wind: 0.2, sink: q * 0.6, ph: t * 0.08, flash: 0 };
      }
      if (c.fail && u >= 34) {
        const lying = u >= 52, q = ease((u - 34) / 18);
        return home({ x: 0.4, y: PONY_Y + Math.sin(t * 0.15) * 0.005, tilt: 0, rot: lying ? Math.PI : Math.sin(t * 0.5) * 0.6 * q + q * Math.PI * 0.5, pose: 'tumble', face: 'dizzy', wind: 0, sink: 0.45, ph: 0, flash: 0 }, 0);
      }
      if (u < 60) {
        const q = (u - 20) / 40;
        return { x: 0.28 + q * 0.44, y: PONY_Y + Math.sin(t * 0.2) * 0.004, tilt: Math.sin(t * 0.2) * 0.05, rot: 0, pose: 'swim', face: 'effort', wind: 0, sink: 0.6, ph: t * 0.12, flash: 0 };
      }
      const q = ease((u - 60) / 14);
      return home({ x: 0.72 + q * 0.06, y: PONY_Y - Math.sin(Math.min(1, (u - 60) / 14) * Math.PI) * 0.08, tilt: 0, rot: 0, pose: u < 74 ? 'jump' : 'flex', face: 'proud', wind: 0.3, sink: 0.6 * (1 - q), ph: 0, flash: fl }, 0);
    }
    case 'jump': {
      const hop = (u0: number, u1: number, x0: number, x1: number) => {
        const q = (u - u0) / (u1 - u0);
        return { x: x0 + (x1 - x0) * q, y: PONY_Y - Math.sin(q * Math.PI) * 0.13, jump: true };
      };
      let p: { x: number; y: number; jump: boolean };
      if (u < 16) p = { x: 0.16 + (u / 16) * 0.12, y: PONY_Y, jump: false };
      else if (u < 30) p = hop(16, 30, 0.28, 0.54);
      else if (u < 40) p = { x: 0.54 + ((u - 30) / 10) * 0.0, y: PONY_Y, jump: false };
      else if (c.fail) {
        const q = ease((u - 40) / 12), lying = u >= 52;
        return home({ x: 0.54 + q * 0.08, y: PONY_Y, tilt: 0, rot: lying ? Math.PI : q * Math.PI, pose: 'tumble', face: 'dizzy', wind: 0, sink: 0, ph: 0, flash: 0 }, 0);
      } else if (u < 54) p = hop(40, 54, 0.54, 0.82);
      else p = { x: 0.82, y: PONY_Y, jump: false };
      if (u >= 54) return home({ x: 0.82, y: PONY_Y, tilt: 0, rot: 0, pose: u < 88 ? 'flex' : 'stand', face: 'proud', wind: 0.2, sink: 0, ph: 0, flash: fl }, 0);
      return { x: p.x, y: p.y, tilt: p.jump ? -0.15 : 0, rot: 0, pose: p.jump ? 'jump' : 'gallop', face: 'effort', wind: 0.6, sink: 0, ph: t * 0.12, flash: 0 };
    }
    case 'rest': {
      if (u < 12 || u > 92) return { ...base, face: u > 92 ? 'happy' : base.face };
      return { ...base, pose: 'lie', face: 'sleep' };
    }
  }
}
function drawRanch(ctx: C2, s: PonyState, vis: Vis, fx: ReturnType<typeof juice>, w: number, h: number, scl: number, font: (sz: number, wgt?: number) => void) {
  const X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w, t = s.t;
  ctx.drawImage(getRanchBg(Math.round(w), Math.round(h), scl), 0, 0, w, h);
  ctx.save();
  fx.begin(ctx);
  // 구경꾼 (울타리 위)
  const cheer = t - vis.cheer < 70, laugh = t - vis.laugh < 90;
  const sp: [number, number][] = [[0.1, 0], [0.29, 3], [0.5, 1], [0.7, 4], [0.89, 2]];
  sp.forEach(([sx, kind], i) => {
    const mood = laugh ? 'laugh' : cheer ? 'cheer' : Math.sin(t * 0.03 + i * 2) > 0.92 ? 'cheer' : 'idle';
    drawCritter(ctx, kind, X(sx), Y(0.375), R(0.034), t, mood, i);
    if ((laugh || cheer) && i % 2 === 0 && Math.floor(t / 18) % 2 === 0) {
      font(0.036, 900);
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = OUT;
      ctx.fillStyle = laugh ? '#ffe14a' : '#ffffff';
      const txt = laugh ? 'ㅋㅋㅋ' : i === 2 ? '짝짝!' : '와!';
      ctx.strokeText(txt, X(sx) + R(0.05), Y(0.31));
      ctx.fillText(txt, X(sx) + R(0.05), Y(0.31));
    }
  });
  // 훈련 무대
  const c = s.phase === 'anim' ? s.cur : null, u = s.pt;
  const appear = c ? Math.min(pop(u / 14), u > 90 ? 1 - (u - 90) / 14 : 1) : 0;
  if (c && c.k === 'run') drawTrack(ctx, s, appear, w);
  if (c && c.k === 'hill') drawHill(ctx, appear, t, w);
  if (c && c.k === 'swim') drawPond(ctx, appear, t, w, true);
  if (c && c.k === 'rest') drawRestSet(ctx, appear, w);
  if (c && c.k === 'jump') for (let j = 0; j < 2; j++) drawHurdle(ctx, X(HUR[j]), Y(PONY_Y + 0.01), R(0.1) * appear, j === 1 && c.fail && u >= 44 ? Math.min(1, (u - 44) / 8) : 0);
  // 친구 (같이 훈련)
  const pp = ponyPose(s);
  const friend = c && c.friend >= 0 && c.k !== 'rest' ? c.friend : -1;
  if (friend >= 0) {
    const fxp = clamp(pp.x - 0.27, 0.08, 0.6), fyp = c!.k === 'hill' ? hillY(fxp, appear) - 0.02 : PONY_Y - 0.05;
    const mood = c!.applied ? (c!.fail ? 'laugh' : 'cheer') : 'run';
    drawCritter(ctx, friend, X(fxp), Y(fyp), R(0.045), t, mood, 7);
    if (c!.bonus && c!.applied && !c!.fail && u < 96) {
      for (let q = 0; q < 3; q++) {
        const hy = ((t * 0.8 + q * 20) % 60) / 60;
        heartPath(ctx, X((fxp + pp.x) / 2 + (q - 1) * 0.05), Y(PONY_Y - 0.2 - hy * 0.15), R(0.022));
        ctx.fillStyle = `rgba(255,90,130,${1 - hy})`;
        ctx.fill();
      }
    }
  }
  // 망아지
  const k = R(PONY_R * 0.86);
  const upside = (1 - Math.cos(pp.rot)) / 2;
  // 능력 오르는 순간: 큰 빛기둥 (망아지 뒤)
  if (c && c.applied && !c.fail && c.k !== 'rest' && u - APPLY_T < 26) {
    const q = (u - APPLY_T) / 26;
    ctx.fillStyle = lin(ctx, 0, Y(pp.y - 0.55), 0, Y(pp.y), [0, 'rgba(255,250,200,0)'], [0.6, `rgba(255,240,150,${0.55 * (1 - q)})`], [1, `rgba(255,255,255,${0.7 * (1 - q)})`]);
    ctx.fillRect(X(pp.x) - R(0.2 + q * 0.06), Y(pp.y - 0.55), R(0.4 + q * 0.12), R(0.55));
  }
  drawPony(ctx, X(pp.x), Y(pp.y) + upside * k * 0.5 + pp.sink * k * 1.05, k, { pose: pp.pose, ph: pp.ph, tilt: pp.tilt, rot: pp.rot, face: pp.face, wind: pp.wind, flash: pp.flash, flashStat: c ? c.stat : -1, sink: pp.sink, st: c && !c.applied ? statsBefore(s) : s.st, fat: shownFat(s), t, shadow: !(c && c.k === 'swim' && pp.sink > 0.1) });
  if (c && c.k === 'swim') {
    drawPond(ctx, appear, t, w, false, pp.sink > 0.05 ? X(pp.x) : -1);
    if (pp.sink > 0.3 && u % 6 === 0) fx.burst(X(pp.x + 0.12), Y(PONY_Y - 0.06), '#e0f6ff', 4, 2.5, 2.4);
  }
  if (c && c.k === 'run' && pp.pose === 'gallop' && u % 4 === 0) fx.burst(X(pp.x - 0.14), Y(PONY_Y - 0.01), '#e6c08a', 3, 2.2, 2.6);
  if (c && c.k === 'hill' && pp.pose === 'gallop' && u % 5 === 0) fx.burst(X(pp.x - 0.1), Y(pp.y - 0.01), '#d8b080', 3, 2, 2.2);
  // 어질어질 별 · 쿨쿨
  if (pp.face === 'dizzy') {
    for (let q = 0; q < 3; q++) {
      const a = t * 0.12 + (q * TAU) / 3;
      starPath(ctx, X(pp.x) + Math.cos(a) * R(0.08), Y(pp.y - 0.06) + Math.sin(a) * R(0.025) + upside * k * 0.5 - R(0.02), R(0.016));
      ctx.fillStyle = '#ffe14a';
      ctx.fill();
      ctx.strokeStyle = '#a86a00';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  if (pp.face === 'sleep') {
    font(0.045, 900);
    for (let q = 0; q < 3; q++) {
      const zz = ((t * 0.6 + q * 25) % 75) / 75;
      ctx.globalAlpha = 1 - zz;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#4a6aa8';
      ctx.lineWidth = 2.5;
      ctx.textAlign = 'center';
      ctx.strokeText('Z', X(pp.x + 0.12 + zz * 0.08), Y(pp.y - 0.25 - zz * 0.12));
      ctx.fillText('Z', X(pp.x + 0.12 + zz * 0.08), Y(pp.y - 0.25 - zz * 0.12));
    }
    ctx.globalAlpha = 1;
  }
  // 능력 오르는 순간: 큰 빛기둥
  if (c && c.applied && !c.fail && c.k !== 'rest' && u - APPLY_T < 24) {
    const q = (u - APPLY_T) / 24;
    for (let q2 = 0; q2 < 5; q2++) sparkle(ctx, X(pp.x + (hsh(q2 + u) - 0.5) * 0.3), Y(pp.y - 0.1 - hsh(q2 + 3) * 0.3), R(0.02) * (1 - q), '#fffbe0');
  }
  drawStats(ctx, s, vis, w, font);
  drawCards(ctx, s, fx, w, h, font);
  ctx.restore();
}
/** 훈련 전 몸 (오르기 직전까지는 예전 몸으로) */
function statsBefore(s: PonyState): number[] {
  const c = s.cur!;
  if (c.k === 'rest' || c.applied) return s.st;
  return s.st;
}
/** 보이는 지침: 쉬는 동안은 스르르 준다 */
function shownFat(s: PonyState): number {
  const c = s.cur;
  if (!c || s.phase !== 'anim') return s.fat;
  if (c.k === 'rest') return c.fat0 + (c.fat1 - c.fat0) * easeIO((s.pt - 20) / 40);
  return c.applied ? c.fat1 : c.fat0;
}
function drawTrack(ctx: C2, s: PonyState, a: number, w: number) {
  const R = (r: number) => r * w, t = s.t, y0 = R(PONY_Y - 0.06 * a), y1 = R(PONY_Y + 0.07 * a);
  ctx.fillStyle = lin(ctx, 0, y0, 0, y1, [0, '#f0c890'], [1, '#d09a5a']);
  ctx.fillRect(0, y0, w, y1 - y0);
  ctx.strokeStyle = 'rgba(255,255,255,.8)';
  ctx.lineWidth = Math.max(2, R(0.008));
  ctx.setLineDash([R(0.06), R(0.05)]);
  ctx.lineDashOffset = t * R(0.03);
  ctx.beginPath();
  ctx.moveTo(0, (y0 + y1) / 2);
  ctx.lineTo(w, (y0 + y1) / 2);
  ctx.stroke();
  ctx.setLineDash([]);
  // 바람줄
  ctx.strokeStyle = 'rgba(255,255,255,.7)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const yy = R(PONY_Y - 0.12 - (i % 3) * 0.08), xx = ((R(1.2) - ((t * R(0.03) + i * R(0.23)) % R(1.4))));
    ctx.beginPath();
    ctx.moveTo(xx, yy);
    ctx.lineTo(xx + R(0.12), yy);
    ctx.stroke();
  }
  // 앞쪽 지나가는 울타리 기둥 (속도감)
  for (let i = 0; i < 5; i++) {
    const xx = R(1.15) - ((t * R(0.045) + i * R(0.3)) % R(1.5));
    ctx.fillStyle = 'rgba(60,40,20,.25)';
    ell(ctx, xx, R(PONY_Y + 0.12), R(0.03), R(0.008));
    ctx.fill();
    ctx.fillStyle = lin(ctx, xx - R(0.014), 0, xx + R(0.014), 0, [0, '#ffffff'], [1, '#c8c8be']);
    rr(ctx, xx - R(0.014), R(PONY_Y + 0.04), R(0.028), R(0.08) * a, R(0.006));
    ctx.fill();
  }
}
function drawHill(ctx: C2, a: number, t: number, w: number) {
  const X = (x: number) => x * w, Y = (y: number) => y * w;
  ctx.fillStyle = 'rgba(40,70,20,.3)';
  ell(ctx, X(HILL_CX), Y(HILL_BASE), X(HILL_HW * 1.05), Y(0.03));
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(X(HILL_CX - HILL_HW), Y(HILL_BASE));
  for (let x = HILL_CX - HILL_HW; x <= HILL_CX + HILL_HW + 1e-6; x += 0.01) ctx.lineTo(X(x), Y(hillY(x, a) + 0.004));
  ctx.lineTo(X(HILL_CX + HILL_HW), Y(HILL_BASE));
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, Y(HILL_BASE - HILL_H * a), 0, Y(HILL_BASE), [0, '#8ee060'], [1, '#4a9e34']);
  ctx.fill();
  ctx.strokeStyle = '#2e6a20';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // 흙길 · 풀포기 · 깃발
  ctx.strokeStyle = 'rgba(200,150,90,.8)';
  ctx.lineWidth = Math.max(3, Y(0.016));
  ctx.beginPath();
  for (let x = HILL_CX - HILL_HW * 0.95; x <= HILL_CX + 0.02; x += 0.01) {
    const yy = Y(hillY(x, a) + 0.012);
    x === HILL_CX - HILL_HW * 0.95 ? ctx.moveTo(X(x), yy) : ctx.lineTo(X(x), yy);
  }
  ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const x = HILL_CX - HILL_HW * 0.7 + i * HILL_HW * 0.28, yy = Y(hillY(x, a) + 0.05 + (i % 2) * 0.03);
    ctx.strokeStyle = 'rgba(40,110,30,.7)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (const d of [-1, 0, 1]) {
      ctx.moveTo(X(x) + d * 3, yy);
      ctx.lineTo(X(x) + d * 6, yy - 7);
    }
    ctx.stroke();
  }
  if (a > 0.6) {
    const fx0 = X(HILL_CX + 0.07), fy0 = Y(hillY(HILL_CX + 0.07, a));
    ctx.strokeStyle = '#6a4a2a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fx0, fy0);
    ctx.lineTo(fx0, fy0 - Y(0.09));
    ctx.stroke();
    ctx.fillStyle = '#ff5a5a';
    ctx.beginPath();
    ctx.moveTo(fx0, fy0 - Y(0.09));
    ctx.quadraticCurveTo(fx0 + Y(0.03), fy0 - Y(0.085) + Math.sin(t * 0.15) * 2, fx0 + Y(0.06), fy0 - Y(0.075));
    ctx.lineTo(fx0, fy0 - Y(0.055));
    ctx.closePath();
    ctx.fill();
  }
}
/** 연못: back=true면 물(뒤), false면 망아지 앞에 덮는 물결 */
function drawPond(ctx: C2, a: number, t: number, w: number, back: boolean, px = -1) {
  const X = (x: number) => x * w, Y = (y: number) => y * w;
  const cx = X(0.5), cy = Y(PONY_Y + 0.01), rx = X(0.46) * a, ry = Y(0.1) * a;
  if (back) {
    ctx.fillStyle = 'rgba(120,100,70,.5)';
    ell(ctx, cx, cy + ry * 0.1, rx * 1.05, ry * 1.12);
    ctx.fill();
    ctx.fillStyle = lin(ctx, 0, cy - ry, 0, cy + ry, [0, '#5ec0f6'], [1, '#2a86d0']);
    ell(ctx, cx, cy, rx, ry);
    ctx.fill();
    for (let i = 0; i < 9; i++) {
      const a2 = (i / 9) * TAU;
      ctx.fillStyle = i % 2 ? '#b8b0a0' : '#d4ccbc';
      ell(ctx, cx + Math.cos(a2) * rx * 1.02, cy + Math.sin(a2) * ry * 1.05, Y(0.022) * a, Y(0.012) * a);
      ctx.fill();
    }
    return;
  }
  // 앞 물: 물에 잠긴 몸 위로 반투명 물 + 물결
  ctx.save();
  ell(ctx, cx, cy, rx, ry);
  ctx.clip();
  ctx.fillStyle = 'rgba(70,165,235,.86)';
  ctx.fillRect(cx - rx, cy - ry * 0.75, rx * 2, ry * 2);
  ctx.strokeStyle = 'rgba(255,255,255,.75)';
  ctx.lineWidth = 2;
  for (let j = 0; j < 3; j++) {
    ctx.beginPath();
    for (let x = -rx; x <= rx; x += 4) {
      const yy = cy - ry * 0.5 + j * ry * 0.45 + Math.sin(x * 0.08 + t * 0.12 + j) * 2;
      x === -rx ? ctx.moveTo(cx + x, yy) : ctx.lineTo(cx + x, yy);
    }
    ctx.stroke();
  }
  ctx.restore();
  if (px >= 0) {
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.lineWidth = 2.5;
    for (let j = 0; j < 2; j++) {
      const rr2 = Y(0.05 + ((t * 0.01 + j * 0.5) % 1) * 0.08);
      ctx.globalAlpha = 1 - ((t * 0.01 + j * 0.5) % 1);
      ell(ctx, px, cy - ry * 0.5, rr2, rr2 * 0.28);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}
function drawRestSet(ctx: C2, a: number, w: number) {
  const X = (x: number) => x * w, Y = (y: number) => y * w;
  // 큰 나무 그늘
  ctx.fillStyle = `rgba(40,80,30,${0.25 * a})`;
  ell(ctx, X(0.5), Y(PONY_Y + 0.005), X(0.36), Y(0.07));
  ctx.fill();
  const tx = X(0.22), ty = Y(PONY_Y - 0.02), tr = Y(0.12) * a;
  ctx.fillStyle = '#8a5a32';
  rr(ctx, tx - tr * 0.16, ty - tr * 1.4, tr * 0.32, tr * 1.45, tr * 0.08);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#5cb048';
  ctx.beginPath();
  ctx.arc(tx, ty - tr * 2.0, tr * 0.9, 0, TAU);
  ctx.arc(tx - tr * 0.7, ty - tr * 1.5, tr * 0.65, 0, TAU);
  ctx.arc(tx + tr * 0.75, ty - tr * 1.55, tr * 0.7, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#2e6a20';
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,210,.4)';
  ctx.beginPath();
  ctx.arc(tx - tr * 0.3, ty - tr * 2.35, tr * 0.35, 0, TAU);
  ctx.fill();
  // 건초 침대
  ctx.fillStyle = lin(ctx, 0, Y(PONY_Y - 0.04), 0, Y(PONY_Y + 0.03), [0, '#ffe08a'], [1, '#d8a838']);
  ell(ctx, X(0.5), Y(PONY_Y), X(0.24) * a, Y(0.045) * a);
  ctx.fill();
  ctx.strokeStyle = '#a87a1a';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}
function drawHurdle(ctx: C2, x: number, y: number, hh: number, fallen: number) {
  if (hh < 1) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(40,60,20,.25)';
  ell(ctx, 0, 0, hh * 0.55, hh * 0.1);
  ctx.fill();
  ctx.rotate(fallen * 1.35);
  for (const sd of [-1, 1]) {
    ctx.fillStyle = '#9a6a3a';
    rr(ctx, sd * hh * 0.4 - hh * 0.05, -hh, hh * 0.1, hh, hh * 0.03);
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  for (const by of [-0.85, -0.5]) {
    ctx.fillStyle = '#ffffff';
    rr(ctx, -hh * 0.48, hh * by, hh * 0.96, hh * 0.15, hh * 0.04);
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = '#ff4a4a';
    for (let j = 0; j < 3; j++) ctx.fillRect(-hh * 0.4 + j * hh * 0.32, hh * by + 1, hh * 0.14, hh * 0.15 - 2);
  }
  ctx.restore();
}
/** 능력 띠: 빠르기·힘·버티기(·꾀) + 지침 */
function drawStats(ctx: C2, s: PonyState, vis: Vis, w: number, font: (sz: number, wgt?: number) => void) {
  const R = (r: number) => r * w, t = s.t, d = STAGES[s.stage], list = shownStats(s);
  const items = list.length + (d.fatigue ? 1 : 0), iw = 0.94 / items, y = R(STATS_Y), hh = R(0.062);
  ctx.fillStyle = 'rgba(60,30,10,.25)';
  rr(ctx, R(0.03), y - hh / 2 + 3, R(0.94), hh, hh / 2);
  ctx.fill();
  ctx.fillStyle = lin(ctx, 0, y - hh / 2, 0, y + hh / 2, [0, '#fffaf0'], [1, '#ffe8c4']);
  rr(ctx, R(0.03), y - hh / 2, R(0.94), hh, hh / 2);
  ctx.fill();
  ctx.strokeStyle = '#a8703a';
  ctx.lineWidth = 2;
  ctx.stroke();
  const c = s.cur, shownSt = c && !c.applied ? s.st : s.st;
  list.forEach((si, j) => {
    const cx = R(0.03 + iw * (j + 0.5)), age = t - vis.statT[si], pp = age < 30 ? 1 + 0.5 * (1 - age / 30) : 1;
    statIcon(ctx, si, cx - R(0.045), y, R(0.017) * pp);
    font(0.04 * (age < 30 ? 1 + 0.25 * (1 - age / 30) : 1), 900);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = STAT_DARK[si];
    ctx.fillText(String(Math.round(shownSt[si])), cx - R(0.02), y + 1);
    if (j < items - 1) {
      ctx.fillStyle = 'rgba(160,110,60,.3)';
      ctx.fillRect(R(0.03 + iw * (j + 1)) - 0.5, y - hh * 0.3, 1, hh * 0.6);
    }
  });
  if (d.fatigue) {
    const fat = shownFat(s), j = list.length, x0 = R(0.03 + iw * j + 0.012), bw = R(iw - 0.03), age = t - vis.statT[4];
    dropIcon(ctx, x0 + R(0.016), y, R(0.016) * (age < 30 ? 1.4 : 1), fat >= 60 ? '#ff9a8a' : '#8ad0ff');
    const bx = x0 + R(0.036), bww = bw - R(0.036), bh = R(0.016), byy = y + R(0.011);
    ctx.fillStyle = 'rgba(110,60,20,.18)';
    rr(ctx, bx, byy - bh / 2, bww, bh, bh / 2);
    ctx.fill();
    ctx.fillStyle = fat >= 60 ? '#ff6a4a' : fat >= 35 ? '#ffb83a' : '#5ac85a';
    rr(ctx, bx, byy - bh / 2, bww * clamp(fat / 100, 0.04, 1), bh, bh / 2);
    ctx.fill();
    if (fat >= 60 && Math.floor(t / 15) % 2) {
      ctx.strokeStyle = '#ff4a3a';
      ctx.lineWidth = 2;
      rr(ctx, bx - 1, byy - bh / 2 - 1, bww + 2, bh + 2, bh / 2);
      ctx.stroke();
    }
    font(0.03, 900);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#5a3a1a';
    ctx.fillText(`지침 ${Math.round(fat)}`, bx + bww / 2, y - R(0.011), bww);
  }
}

// ───────── 카드 ─────────
const CARD_HEAD: Record<TK, [string, string]> = {
  run: ['#ffe27a', '#ffb81c'],
  hill: ['#ffb08a', '#ff6a3a'],
  swim: ['#a8dcff', '#3d9df5'],
  jump: ['#d8c4ff', '#a46bff'],
  rest: ['#c8f0b0', '#5ab84a'],
};
/** 카드 그림 (머리 칸) */
function cardArt(ctx: C2, k: TK, x: number, y: number, cw: number, ch: number, t: number, rain: boolean) {
  const [c1, c2] = CARD_HEAD[k];
  ctx.fillStyle = lin(ctx, 0, y, 0, y + ch, [0, c1], [1, c2]);
  ctx.fillRect(x, y, cw, ch);
  const cx = x + cw / 2, gy = y + ch * 0.82;
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  ell(ctx, cx, gy, cw * 0.42, ch * 0.1);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.6;
  if (k === 'hill') {
    ctx.fillStyle = lin(ctx, 0, y + ch * 0.25, 0, gy, [0, '#9ae870'], [1, '#4a9e34']);
    ctx.beginPath();
    ctx.moveTo(x + cw * 0.08, gy);
    ctx.quadraticCurveTo(cx, y + ch * 0.05, x + cw * 0.92, gy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ff5a5a';
    ctx.beginPath();
    ctx.moveTo(cx + cw * 0.02, y + ch * 0.18);
    ctx.lineTo(cx + cw * 0.18, y + ch * 0.24);
    ctx.lineTo(cx + cw * 0.02, y + ch * 0.3);
    ctx.fill();
    ctx.strokeStyle = '#6a4a2a';
    ctx.beginPath();
    ctx.moveTo(cx + cw * 0.02, y + ch * 0.18);
    ctx.lineTo(cx + cw * 0.02, y + ch * 0.44);
    ctx.stroke();
  } else if (k === 'run') {
    ctx.fillStyle = '#e8b878';
    ctx.fillRect(x, gy - ch * 0.12, cw, ch * 0.2);
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.lineWidth = 2;
    for (let j = 0; j < 3; j++) {
      const yy = y + ch * (0.22 + j * 0.15), xx = x + cw * (0.12 + ((t * 0.02 + j * 0.3) % 1) * 0.3);
      ctx.beginPath();
      ctx.moveTo(xx, yy);
      ctx.lineTo(xx + cw * 0.3, yy);
      ctx.stroke();
    }
    // 말굽
    ctx.save();
    ctx.translate(cx + cw * 0.12, y + ch * 0.45);
    ctx.rotate(-0.4);
    ctx.strokeStyle = '#7a7a8a';
    ctx.lineWidth = Math.max(4, cw * 0.09);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, ch * 0.2, Math.PI * 0.15, Math.PI * 0.85, true);
    ctx.stroke();
    ctx.strokeStyle = '#c8ccd8';
    ctx.lineWidth = Math.max(2, cw * 0.04);
    ctx.stroke();
    ctx.restore();
  } else if (k === 'swim') {
    ctx.fillStyle = '#3a9ae8';
    ctx.beginPath();
    ctx.moveTo(x, gy);
    for (let xx = 0; xx <= cw; xx += 3) ctx.lineTo(x + xx, y + ch * 0.55 + Math.sin(xx * 0.2 + t * 0.1) * ch * 0.05);
    ctx.lineTo(x + cw, y + ch);
    ctx.lineTo(x, y + ch);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    for (let j = 0; j < 4; j++) {
      ell(ctx, cx + (j - 1.5) * cw * 0.16, y + ch * (0.32 - (j % 2) * 0.08), ch * 0.05, ch * 0.07);
      ctx.fill();
    }
  } else if (k === 'jump') {
    drawHurdle(ctx, cx, gy, ch * 0.55, 0);
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(x + cw * 0.1, gy - ch * 0.05);
    ctx.quadraticCurveTo(cx, y - ch * 0.2, x + cw * 0.9, gy - ch * 0.05);
    ctx.stroke();
    ctx.setLineDash([]);
  } else {
    ctx.fillStyle = lin(ctx, 0, y + ch * 0.45, 0, gy, [0, '#ffe08a'], [1, '#d8a838']);
    ell(ctx, cx, gy - ch * 0.1, cw * 0.36, ch * 0.18);
    ctx.fill();
    ctx.stroke();
    font2(ctx, ch * 0.3);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#3a6a8a';
    ctx.lineWidth = 2.5;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeText('Zz', cx + cw * 0.15, y + ch * 0.3);
    ctx.fillText('Zz', cx + cw * 0.15, y + ch * 0.3);
  }
  if (rain) {
    ctx.fillStyle = 'rgba(70,90,130,.35)';
    ctx.fillRect(x, y, cw, ch);
    ctx.strokeStyle = 'rgba(210,235,255,.9)';
    ctx.lineWidth = 1.5;
    for (let j = 0; j < 8; j++) {
      const rx = x + ((j * 37 + t * 2) % cw), ry = y + ((j * 53 + t * 3.5) % ch);
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 3, ry + 7);
      ctx.stroke();
    }
    // 비구름
    ctx.fillStyle = '#e8eef8';
    ctx.strokeStyle = '#5a6a88';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    const qx = x + cw * 0.8, qy = y + ch * 0.2, qr = ch * 0.1;
    ctx.arc(qx - qr, qy, qr, 0, TAU);
    ctx.arc(qx, qy - qr * 0.5, qr * 1.2, 0, TAU);
    ctx.arc(qx + qr, qy, qr, 0, TAU);
    ctx.fill();
  }
}
const font2 = (ctx: C2, px: number, wgt = 900) => (ctx.font = `${wgt} ${Math.max(12, px)}px system-ui, sans-serif`);
function firstTip(s: PonyState): number {
  if (s.stage !== 0 || s.again || s.firstTap >= 0 || s.phase !== 'train') return -1;
  return s.cards.findIndex((c) => c.k === 'hill');
}
function drawCards(ctx: C2, s: PonyState, fx: ReturnType<typeof juice>, w: number, h: number, font: (sz: number, wgt?: number) => void) {
  const X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w, t = s.t, d = STAGES[s.stage];
  const n = s.cards.length, xs = cardXs(n), cw = R(cardW(n)), ch = R(CARD_H);
  const anim = s.phase === 'anim', u = s.pt;
  const tip = firstTip(s);
  // 훈련 중: 고른 카드 이름을 크게, 다른 카드는 아래로
  if (anim && s.cur) {
    const c = s.cur, si = c.stat;
    const a = Math.min(1, u / 8, (100 - u) / 10);
    if (a > 0) {
      ctx.save();
      ctx.globalAlpha = clamp(a, 0, 1);
      const cy = Y(CARD_Y - 0.02);
      font(0.07, 900);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#6a3a12';
      const title = c.k === 'rest' ? (c.rain ? '빗소리 들으며 낮잠…' : '쿨쿨 쉬는 중…') : c.fail ? '어이쿠!' : `${TR[c.k].name} ${c.k === 'hill' ? '다다닥!' : c.k === 'run' ? '다그닥!' : c.k === 'swim' ? '첨벙첨벙!' : '폴짝!'}`;
      ctx.strokeText(title, w / 2, cy, w * 0.9);
      ctx.fillStyle = '#fff6dc';
      ctx.fillText(title, w / 2, cy, w * 0.9);
      font(0.04, 800);
      ctx.fillStyle = '#5a3a1a';
      const sub = c.k === 'rest' ? `지침 -${c.gain}` : c.applied ? (c.fail ? `넘어져서 ${STAT_NAME[si]} +${c.got}뿐…` : `${STAT_NAME[si]} +${c.got}!${c.bonus ? ' 우정 두 배!' : ''}`) : `${iga(STAT_NAME[si])} 오르는 중…`;
      ctx.fillText(sub, w / 2, cy + R(0.075), w * 0.9);
      ctx.restore();
    }
    // 고른 카드가 망아지 쪽으로 날아간다
    if (u < 12) {
      const q = ease(u / 12), x0 = X(xs[c.ci]), y0 = Y(CARD_Y), x1 = X(0.5), y1 = Y(PONY_Y - 0.2);
      ctx.save();
      ctx.translate(x0 + (x1 - x0) * q, y0 + (y1 - y0) * q);
      ctx.scale(1 - q * 0.7, 1 - q * 0.7);
      ctx.rotate(q * 0.6);
      ctx.globalAlpha = 1 - q * 0.6;
      cardBody(ctx, s, s.cards[c.ci] ?? { k: c.k, gain: c.gain, friend: c.friend, bonus: c.bonus, rain: c.rain, p: 0, born: 0 }, cw, ch, t, false, font, w);
      ctx.restore();
    }
    return;
  }
  if (s.phase !== 'train') return;
  for (let i = 0; i < n; i++) {
    const c = s.cards[i], age = t - c.born;
    const inQ = ease((age - i * 3) / 12);
    const bobY = Math.sin(t * 0.07 + i * 1.3) * R(0.004);
    ctx.save();
    ctx.translate(X(xs[i]), Y(CARD_Y) + (1 - inQ) * R(0.3) + bobY);
    const hot = tip === i;
    if (hot) ctx.scale(1 + 0.04 * Math.sin(t * 0.18), 1 + 0.04 * Math.sin(t * 0.18));
    ctx.globalAlpha = clamp(inQ * 1.5, 0, 1);
    cardBody(ctx, s, c, cw, ch, t, hot, font, w);
    ctx.restore();
  }
  // 첫 안내: 손가락 + 한 줄
  if (tip >= 0) {
    const tx = X(xs[tip]), ty = Y(CARD_Y);
    const press = (Math.sin(t * 0.16) + 1) / 2;
    drawHand(ctx, tx + cw * 0.2, ty + ch * 0.12, R(0.1), press);
    const txt = '👆 훈련 카드를 톡!';
    font(0.05, 900);
    const tw = ctx.measureText(txt).width + R(0.06), by = Y(CARD_Y - CARD_H / 2 - 0.05);
    ctx.fillStyle = 'rgba(60,30,10,.3)';
    rr(ctx, w / 2 - tw / 2 + 2, by - R(0.032) + 3, tw, R(0.064), R(0.032));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    rr(ctx, w / 2 - tw / 2, by - R(0.032), tw, R(0.064), R(0.032));
    ctx.fill();
    ctx.strokeStyle = '#ff7a3a';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#d0501a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(txt, w / 2, by + 1);
  }
  void fx;
  void d;
  void h;
}
function cardBody(ctx: C2, s: PonyState, c: Card, cw: number, ch: number, t: number, hot: boolean, font: (sz: number, wgt?: number) => void, w: number) {
  const R = (r: number) => r * w, d = STAGES[s.stage];
  const si = TR[c.k].stat, border = c.k === 'rest' ? '#3a9a3a' : STAT_DARK[si];
  const x0 = -cw / 2, y0 = -ch / 2, rad = R(0.03);
  ctx.fillStyle = 'rgba(60,30,10,.3)';
  rr(ctx, x0 + 3, y0 + 6, cw, ch, rad);
  ctx.fill();
  ctx.fillStyle = c.bonus ? '#ff7aa0' : border;
  rr(ctx, x0, y0 + 4, cw, ch, rad);
  ctx.fill();
  ctx.fillStyle = lin(ctx, 0, y0, 0, y0 + ch, [0, '#fffdf6'], [1, '#fff0d4']);
  rr(ctx, x0, y0, cw, ch, rad);
  ctx.fill();
  ctx.strokeStyle = c.bonus ? '#ff4a80' : border;
  ctx.lineWidth = hot || c.bonus ? 3.5 : 2.5;
  ctx.stroke();
  // 그림
  const ah = ch * 0.36;
  ctx.save();
  rr(ctx, x0 + 3, y0 + 3, cw - 6, ah, rad * 0.8);
  ctx.clip();
  cardArt(ctx, c.k, x0 + 3, y0 + 3, cw - 6, ah, t, c.rain);
  ctx.restore();
  // 친구
  if (c.friend >= 0) {
    const fr = Math.min(cw * 0.15, R(0.035)), fxp = x0 + fr * 1.25 + 2, fyp = y0 + fr * 1.35 + 2;
    ctx.fillStyle = '#ffffff';
    ell(ctx, fxp, fyp - fr * 0.1, fr * 1.15, fr * 1.15);
    ctx.fill();
    ctx.strokeStyle = c.bonus ? '#ff4a80' : '#a8703a';
    ctx.lineWidth = 2;
    ctx.stroke();
    drawCritter(ctx, c.friend, fxp, fyp + fr * 0.75, fr * 0.85, t, c.bonus ? 'cheer' : 'idle', c.friend);
    if (c.bonus) {
      heartPath(ctx, fxp + fr * 1.05, fyp - fr * 0.9, fr * 0.55);
      ctx.fillStyle = '#ff4a80';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // 이름
  font(0.043, 900);
  ctx.fillStyle = '#4a2a10';
  ctx.fillText(c.k === 'rest' && c.rain ? '낮잠' : TR[c.k].name, 0, y0 + ch * 0.45, cw - 6);
  // 오르는 양
  const gy = y0 + ch * 0.62;
  if (c.k === 'rest') {
    dropIcon(ctx, -cw * 0.25, gy, R(0.02));
    font(0.052, 900);
    ctx.fillStyle = '#2a7a2a';
    ctx.fillText(`-${c.gain}`, cw * 0.1, gy + 1, cw * 0.6);
    font(0.03, 800);
    ctx.fillStyle = '#5a7a4a';
    ctx.fillText('지침 풀기', 0, y0 + ch * 0.77, cw - 6);
  } else {
    statIcon(ctx, si, -cw * 0.26, gy, R(0.021));
    font(0.058, 900);
    ctx.fillStyle = STAT_DARK[si];
    ctx.fillText(`+${c.gain}`, cw * 0.1, gy + 1, cw * 0.62);
    font(0.03, 800);
    ctx.fillStyle = '#6a4a2a';
    ctx.fillText(c.bonus ? '우정 두 배!' : c.rain && c.k === 'swim' ? '비 오면 쑥쑥' : STAT_NAME[si], 0, y0 + ch * 0.77, cw - 6);
  }
  // 실수할 확률
  if (d.fatigue && c.k !== 'rest') {
    const p = Math.round(c.p * 20) * 5, py = y0 + ch * 0.9, pw = cw * 0.84, ph = R(0.04);
    ctx.fillStyle = p === 0 ? '#d8f4c8' : p < 30 ? '#ffeaa0' : '#ffc0b0';
    rr(ctx, -pw / 2, py - ph / 2, pw, ph, ph / 2);
    ctx.fill();
    ctx.strokeStyle = p === 0 ? '#5aa84a' : p < 30 ? '#c89a20' : '#d04a3a';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    font(0.031, 900);
    ctx.fillStyle = p === 0 ? '#2a6a2a' : p < 30 ? '#7a5a00' : '#b02a1a';
    ctx.fillText(p === 0 ? '실수 없음' : `실수 ${p}%`, 0, py + 1, pw - 4);
  } else if (c.k === 'rest') {
    const py = y0 + ch * 0.9;
    font(0.028, 800);
    ctx.fillStyle = '#5a7a4a';
    ctx.fillText(c.rain ? '비 오면 푹!' : '쉬면 쌩쌩', 0, py, cw - 6);
  }
}

// ───────── 다음 대회 판 (길 띠) ─────────
function drawPanel(ctx: C2, s: PonyState, vis: Vis, w: number, font: (sz: number, wgt?: number) => void) {
  const R = (r: number) => r * w, t = s.t, d = STAGES[s.stage];
  const y0 = R(PANEL_Y), ph = R(PANEL_H), x0 = R(0.02), pw = R(0.96);
  ctx.fillStyle = 'rgba(60,30,10,.28)';
  rr(ctx, x0 + 2, y0 + 4, pw, ph, R(0.025));
  ctx.fill();
  ctx.fillStyle = lin(ctx, 0, y0, 0, y0 + ph, [0, '#fffaf0'], [1, '#ffeccc']);
  rr(ctx, x0, y0, pw, ph, R(0.025));
  ctx.fill();
  ctx.strokeStyle = '#a8703a';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  const race = isRaceView(s) && s.race ? s.race : null;
  // 1줄: 제목 · 훈련 칸 · 예상 등수
  font(0.036, 900);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#6a3a12';
  const r1 = y0 + R(0.024);
  ctx.fillText(race ? '경주 중!' : '다음 대회 길', x0 + R(0.025), r1);
  if (!race) {
    const lw = ctx.measureText('다음 대회 길').width;
    for (let j = 0; j < d.trains; j++) {
      const px = x0 + R(0.04) + lw + j * R(0.045), done = j < s.turn, cur = j === s.turn;
      const rainy = d.rain.includes(j);
      ctx.fillStyle = done ? '#ffb81c' : cur ? '#ffffff' : 'rgba(160,110,60,.2)';
      ell(ctx, px, r1, R(0.017), R(0.017));
      ctx.fill();
      ctx.strokeStyle = cur ? `rgba(255,120,40,${0.6 + 0.4 * Math.sin(t * 0.2)})` : '#a8703a';
      ctx.lineWidth = cur ? 2.5 : 1.4;
      ctx.stroke();
      if (rainy) {
        ctx.fillStyle = '#5a8ad0';
        dropIcon(ctx, px, r1 + R(0.002), R(0.009), '#8ac4ff');
      } else if (d.rain.length) {
        ctx.fillStyle = '#ffc21a';
        ell(ctx, px, r1, R(0.007), R(0.007));
        ctx.fill();
      }
    }
  }
  // 예상 등수 알약
  const rank = race ? (race.ended >= 0 || race.rs[0].done ? race.rs[0].place : livePlace(race)) : forecast(s);
  const medal = rank === 1 ? ['#ffe56a', '#e0a010'] : rank === 2 ? ['#f0f4fa', '#a8b4c8'] : rank === 3 ? ['#ffc89a', '#c8763a'] : ['#e8e0d8', '#a89888'];
  const ok = rank <= d.goal, fa = t - vis.foreT, fpop = !race && fa < 30 ? 1 + 0.35 * (1 - fa / 30) : 1;
  font(0.034 * fpop, 900);
  const lab = race ? `지금 ${rank}등` : `지금 달리면 ${rank}등`, lw2 = ctx.measureText(lab).width + R(0.07);
  const lx = x0 + pw - lw2 - R(0.012);
  ctx.fillStyle = ok ? lin(ctx, 0, r1 - R(0.02), 0, r1 + R(0.02), [0, medal[0]], [1, medal[1]]) : '#ffd8d0';
  rr(ctx, lx, r1 - R(0.02), lw2, R(0.04), R(0.02));
  ctx.fill();
  ctx.strokeStyle = ok ? '#8a5a20' : '#d04a3a';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = ok ? '#4a2a10' : '#b02a1a';
  ctx.textAlign = 'center';
  ctx.fillText(lab, lx + lw2 / 2 + R(0.01), r1 + 1);
  if (ok) {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#3a8a3a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lx + R(0.015), r1);
    ctx.lineTo(lx + R(0.025), r1 + R(0.01));
    ctx.lineTo(lx + R(0.042), r1 - R(0.01));
    ctx.stroke();
  }
  if (!race && fa < 50 && vis.foreFrom) {
    ctx.globalAlpha = Math.max(0, 1 - fa / 50);
    font(0.03, 900);
    ctx.fillStyle = Number(vis.foreFrom) > rank ? '#2a8a2a' : '#c03a2a';
    ctx.fillText(Number(vis.foreFrom) > rank ? `${vis.foreFrom}등 → ${rank}등!` : `${vis.foreFrom}등 → ${rank}등`, lx + lw2 / 2, r1 + R(0.035) + fa * 0.1);
    ctx.globalAlpha = 1;
  }
  // 2줄: 길 칸
  const sx0 = x0 + R(0.02), sx1 = x0 + pw - R(0.085), sy = y0 + R(0.05), sh = R(0.055);
  const tot = d.course.reduce((a, [, l]) => a + l, 0);
  let cx = sx0;
  d.course.forEach(([k, len], i) => {
    const sw = ((sx1 - sx0) * len) / tot - 2;
    segTile(ctx, k, cx, sy, sw, sh, t);
    const si = SEG[k].stat, mid = cx + sw / 2;
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    ell(ctx, mid, sy + sh / 2, R(0.021), R(0.021));
    ctx.fill();
    ctx.strokeStyle = STAT_DARK[si];
    ctx.lineWidth = 1.5;
    ctx.stroke();
    statIcon(ctx, si, mid, sy + sh / 2, R(0.014));
    // 지금 망아지가 달리는 칸
    if (race && race.seg === i && !race.rs[0].done) {
      ctx.strokeStyle = `rgba(255,90,40,${0.6 + 0.4 * Math.sin(t * 0.3)})`;
      ctx.lineWidth = 3;
      rr(ctx, cx - 1, sy - 1, sw + 2, sh + 2, 6);
      ctx.stroke();
    }
    // 3줄: 칸 이름 (쓰이는 능력 색)
    font(0.029, 900);
    ctx.fillStyle = STAT_DARK[si];
    ctx.textAlign = 'center';
    const nm = k === 'hurdle' && d.bar ? `장애물 꾀${d.bar}` : SEG[k].name;
    ctx.fillText(nm, mid, sy + sh + R(0.02), sw + 2);
    if (d.spurt && i === d.course.length - 1) {
      ctx.fillStyle = '#ff5a3a';
      ctx.beginPath();
      ctx.moveTo(cx + sw - R(0.035), sy + R(0.006));
      ctx.lineTo(cx + sw - R(0.005), sy + R(0.006));
      ctx.lineTo(cx + sw - R(0.02), sy + R(0.024));
      ctx.closePath();
      ctx.fill();
      font(0.026, 900);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#c03a1a';
      ctx.lineWidth = 2.5;
      ctx.strokeText('막판!', cx + sw * 0.75, sy + R(0.012));
      ctx.fillText('막판!', cx + sw * 0.75, sy + R(0.012));
    }
    cx += sw + 2;
  });
  finishFlag(ctx, sx1 + R(0.025), sy + sh / 2, sh * 1.05, t);
  // 경주 중: 선수 점
  if (race) {
    const D = race.D;
    for (let i = race.rs.length - 1; i >= 0; i--) {
      const ru = race.rs[i], px = sx0 + (sx1 - sx0) * clamp(posAt(ru, race.rc, race.xs) / D, 0, 1.02);
      const py = sy + sh * (0.15 + (ru.lane / 4) * 0.7), pr = R(i === 0 ? 0.019 : 0.013);
      ctx.fillStyle = i === 0 ? '#ff4a4a' : RSK[ru.k as RK].bib;
      ell(ctx, px, py, pr, pr);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = i === 0 ? 2.5 : 1.5;
      ctx.stroke();
      if (i === 0) {
        starPath(ctx, px, py, pr * 0.6);
        ctx.fillStyle = '#ffe14a';
        ctx.fill();
      }
    }
  }
}
/** 맨 위 띠: 판 · 이름 · 별 · 하트 */
function drawTop(ctx: C2, s: PonyState, w: number, font: (sz: number, wgt?: number) => void) {
  const R = (r: number) => r * w, d = STAGES[s.stage], hb = R(HUD_H);
  ctx.fillStyle = lin(ctx, 0, 0, 0, hb, [0, 'rgba(255,252,240,.97)'], [1, 'rgba(255,240,210,.95)']);
  ctx.fillRect(0, 0, w, hb);
  ctx.fillStyle = 'rgba(110,60,20,.3)';
  ctx.fillRect(0, hb - 1.5, w, 1.5);
  const cy = hb / 2, cx = R(0.055);
  ctx.fillStyle = lin(ctx, cx, cy - R(0.03), cx, cy + R(0.03), [0, '#ffe878'], [1, '#f2a91c']);
  ell(ctx, cx, cy, R(0.031), R(0.031));
  ctx.fill();
  ctx.strokeStyle = '#7a4a08';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#5b3512';
  font(0.036, 900);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(s.stage + 1), cx, cy + 1);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#4a2a10';
  font(0.042, 900);
  ctx.fillText(d.name, R(0.1), cy + 1, R(0.44));
  const nw = Math.min(R(0.44), ctx.measureText(d.name).width);
  font(0.032, 700);
  ctx.fillStyle = '#8a6a4a';
  ctx.fillText(` / ${STAGE_COUNT}`, R(0.1) + nw, cy + 2);
  ctx.textAlign = 'right';
  font(0.042, 900);
  const st = String(s.stars), sw = ctx.measureText(st).width;
  ctx.fillStyle = '#d88a08';
  ctx.fillText(st, w - R(0.03), cy + 1);
  starPath(ctx, w - R(0.03) - sw - R(0.026), cy, R(0.021));
  ctx.fillStyle = '#ffd23a';
  ctx.fill();
  ctx.strokeStyle = '#7a4a08';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  for (let j = 0; j < 3; j++) {
    const hx2 = w - R(0.03) - sw - R(0.085) - j * R(0.052);
    heartPath(ctx, hx2, cy, R(0.018));
    ctx.fillStyle = 2 - j < s.hearts ? lin(ctx, hx2, cy - R(0.02), hx2, cy + R(0.02), [0, '#ff8a95'], [1, '#e2334a']) : 'rgba(110,60,20,.15)';
    ctx.fill();
    ctx.strokeStyle = 2 - j < s.hearts ? '#8a1a2a' : 'rgba(110,60,20,.3)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
  // 별 줄 (판의 별 조건, 쉬운 말)
  const y = R(PANEL_Y + PANEL_H + 0.022), n = d.stars.length;
  font(0.031, 900);
  const labs = d.stars.map((q) => q.label), ws = labs.map((l) => ctx.measureText(l).width + R(0.05));
  const tot = ws.reduce((a, b) => a + b, 0) + (n - 1) * R(0.012), scale = Math.min(1, (w - R(0.04)) / tot);
  let x = w / 2 - (tot * scale) / 2;
  labs.forEach((l, j) => {
    const bw = ws[j] * scale, got = s.phase === 'result' && s.ok ? s.starOk[j] : false;
    ctx.fillStyle = got ? 'rgba(255,230,120,.95)' : 'rgba(255,252,240,.88)';
    rr(ctx, x, y - R(0.02), bw, R(0.04), R(0.02));
    ctx.fill();
    ctx.strokeStyle = got ? '#c88a10' : 'rgba(168,112,58,.7)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    starPath(ctx, x + R(0.022) * scale, y, R(0.013));
    ctx.fillStyle = got ? '#ffc21a' : '#ffe9a0';
    ctx.fill();
    ctx.strokeStyle = '#a86a00';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#5a3a1a';
    ctx.textAlign = 'left';
    ctx.fillText(l, x + R(0.04) * scale, y + 1, bw - R(0.045) * scale);
    x += bw + R(0.012) * scale;
  });
}

// ───────── 대회 (경주) ─────────
const LANE_Y = [0.615, 0.725, 0.835, 0.945, 1.055], LANE_SC = [0.84, 0.9, 0.96, 1.02, 1.08];
const TRACK_TOP = 0.56, TRACK_BOT = 1.1, VIEW = 210, HILL_PX = 0.1, SHEAR = 0.32;
/** 언덕 칸의 솟음 (가로 폭 단위) */
function bumpAt(r: Race, x: number, d: StageDef): number {
  const i = segAt(x, r.xs);
  if (x < 0 || x > r.D || d.course[i][0] !== 'hill') return 0;
  const a = i ? r.xs[i - 1] : 0, b = r.xs[i], q = (x - a) / (b - a);
  return HILL_PX * Math.sin(q * Math.PI) ** 1.5;
}
const hurdlesOf = (r: Race, d: StageDef) => {
  const out: number[] = [];
  d.course.forEach(([k], i) => {
    if (k !== 'hurdle') return;
    const a = i ? r.xs[i - 1] : 0, b = r.xs[i];
    for (const q of [0.22, 0.5, 0.78]) out.push(a + (b - a) * q);
  });
  return out;
};
function drawRace(ctx: C2, s: PonyState, vis: Vis, fx: ReturnType<typeof juice>, w: number, h: number, scl: number, font: (sz: number, wgt?: number) => void) {
  const r = s.race!, d = STAGES[s.stage], t = s.t, X = (x: number) => x * w, Y = (y: number) => y * w, R = (v: number) => v * w;
  ctx.drawImage(getRaceBg(Math.round(w), Math.round(h), scl), 0, 0, w, h);
  ctx.save();
  fx.begin(ctx);
  const me = r.rs[0], mx = posAt(me, r.rc, r.xs);
  let lead = 0;
  for (const o of r.rs) lead = Math.max(lead, posAt(o, r.rc, r.xs));
  let cam = Math.max(mx - VIEW * 0.48, lead - VIEW * 0.82);
  cam = Math.max(-VIEW * 0.36, Math.min(cam, r.D + 30 - VIEW * 0.62));
  const ppu = w / VIEW, ybot = Y(TRACK_BOT);
  /** 3/4 시점: 먼 줄일수록 오른쪽으로 비껴 보인다 */
  const SXY = (xw: number, yPx: number) => (xw - cam) * ppu + (ybot - yPx) * SHEAR;
  // 슬로모션: 망아지 둘레로 살짝 확대
  const zoom = r.slow ? Math.min(1.14, 1 + r.slowT * 0.006) : 1;
  if (zoom > 1) {
    const zy = Y(LANE_Y[PONY_LANE] - 0.08), zx = SXY(mx, zy);
    ctx.translate(zx, zy);
    ctx.scale(zoom, zoom);
    ctx.translate(-zx, -zy);
  }
  // 관중석 위 깃발 · 앞줄 응원
  for (let i = 0; i < 6; i++) {
    const fxp = X(0.08 + i * 0.17), fyp = Y(0.315);
    ctx.strokeStyle = '#6a4a2a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(fxp, fyp);
    ctx.lineTo(fxp, fyp - R(0.05));
    ctx.stroke();
    ctx.fillStyle = ['#ff5a5a', '#ffd23a', '#3d9df5', '#5ad04a', '#ff9ac0', '#a46bff'][i];
    ctx.beginPath();
    ctx.moveTo(fxp, fyp - R(0.05));
    ctx.quadraticCurveTo(fxp + R(0.02), fyp - R(0.045) + Math.sin(t * 0.15 + i) * 2, fxp + R(0.04), fyp - R(0.04));
    ctx.lineTo(fxp, fyp - R(0.028));
    ctx.fill();
  }
  const cheer = s.phase === 'race' || (s.phase === 'result' && s.ok);
  for (let i = 0; i < 7; i++) {
    const kx = X(0.07 + i * 0.143), hop = cheer ? Math.abs(Math.sin(t * 0.22 + i * 1.7)) * R(0.012) : 0;
    drawCritter(ctx, i % 5, kx, Y(0.478) - hop, R(0.022), t, cheer ? 'cheer' : 'idle', i);
  }
  // 트랙
  const x0w = cam - (Y(TRACK_BOT - TRACK_TOP) * SHEAR) / ppu - 12, x1w = cam + VIEW + 12, step = 3;
  const eY = (yy: number, xw: number) => Y(yy - bumpAt(r, xw, d));
  const P = (xw: number, yy: number): [number, number] => {
    const py = eY(yy, xw);
    return [SXY(xw, py), py];
  };
  const segIdx = (xw: number) => (xw < 0 || xw > r.D ? -1 : segAt(xw, r.xs));
  // 언덕 몸통: 트랙 앞쪽 아래로 보이는 둔덕
  ctx.fillStyle = lin(ctx, 0, Y(TRACK_BOT - HILL_PX), 0, Y(TRACK_BOT + 0.03), [0, '#6ab848'], [1, '#3e8a2a']);
  ctx.beginPath();
  ctx.moveTo(...P(x0w, TRACK_BOT + 0.03));
  for (let xw = x0w; xw <= x1w; xw += step) ctx.lineTo(...P(xw, TRACK_BOT));
  ctx.lineTo(...P(x1w, TRACK_BOT + 0.03));
  ctx.closePath();
  ctx.fill();
  // 언덕 뒤쪽 하늘선: 트랙 뒤 풀밭이 함께 솟는다
  ctx.fillStyle = '#86cc58';
  ctx.beginPath();
  ctx.moveTo(...P(x0w, TRACK_TOP));
  for (let xw = x0w; xw <= x1w; xw += step) {
    const [px, py] = P(xw, TRACK_TOP);
    ctx.lineTo(px, py - bumpAt(r, xw, d) * w * 0.6);
  }
  ctx.lineTo(...P(x1w, TRACK_TOP));
  ctx.closePath();
  ctx.fill();
  const colOf = (i: number): [string, string] => {
    if (i < 0) return ['#f0cc96', '#d4a466'];
    const k = d.course[i][0];
    return k === 'water' ? ['#72ccfa', '#2a8ad8'] : k === 'mud' ? ['#b07a4a', '#7a4e28'] : k === 'hill' ? ['#a6e070', '#62b040'] : ['#f2cc94', '#d8a060'];
  };
  const spans: [number, number, number][] = [];
  let a0 = x0w, cur = segIdx(x0w);
  for (let xw = x0w; xw <= x1w + step; xw += step) {
    const si = segIdx(xw);
    if (si !== cur || xw > x1w) {
      spans.push([a0, Math.min(xw, x1w), cur]);
      a0 = xw;
      cur = si;
    }
  }
  for (const [a, b, si] of spans) {
    const [c1, c2] = colOf(si);
    ctx.fillStyle = lin(ctx, 0, Y(TRACK_TOP), 0, Y(TRACK_BOT), [0, c1], [1, c2]);
    ctx.beginPath();
    ctx.moveTo(...P(a, TRACK_TOP));
    for (let xw = a; xw <= b; xw += step) ctx.lineTo(...P(xw, TRACK_TOP));
    ctx.lineTo(...P(b, TRACK_TOP));
    ctx.lineTo(...P(b, TRACK_BOT));
    for (let xw = b; xw >= a; xw -= step) ctx.lineTo(...P(xw, TRACK_BOT));
    ctx.closePath();
    ctx.fill();
    const k = si >= 0 ? d.course[si][0] : 'flat';
    if (k === 'water') {
      ctx.strokeStyle = 'rgba(255,255,255,.65)';
      ctx.lineWidth = 2;
      for (let j = 0; j < 6; j++) {
        ctx.beginPath();
        for (let xw = a; xw <= b; xw += step) {
          const [px, py] = P(xw, TRACK_TOP + 0.04 + j * 0.09);
          const yy = py + Math.sin(xw * 0.15 + t * 0.12 + j) * 2.5;
          xw === a ? ctx.moveTo(px, yy) : ctx.lineTo(px, yy);
        }
        ctx.stroke();
      }
    } else if (k === 'mud') {
      ctx.fillStyle = 'rgba(70,40,15,.4)';
      for (let xw = Math.ceil(a / 16) * 16; xw < b; xw += 16)
        for (let j = 0; j < 5; j++) {
          const [px, py] = P(xw + hsh(xw + j) * 10, TRACK_TOP + 0.05 + j * 0.105 + hsh(xw * 3 + j) * 0.03);
          ell(ctx, px, py, R(0.032), R(0.011));
          ctx.fill();
        }
    } else if (k === 'hill') {
      // 언덕: 오르막은 그늘, 내리막은 햇빛
      ctx.fillStyle = 'rgba(255,255,220,.18)';
      for (let xw = Math.ceil(a / 12) * 12; xw < b; xw += 12) {
        const [p1x, p1y] = P(xw, TRACK_TOP + 0.02), [p2x, p2y] = P(xw, TRACK_BOT - 0.02);
        ctx.fillRect(Math.min(p1x, p2x), p1y, 2, p2y - p1y);
      }
    }
  }
  // 바깥 테두리 (흰 울타리 선)
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  for (const yy of [TRACK_TOP, TRACK_BOT]) {
    ctx.beginPath();
    for (let xw = x0w; xw <= x1w; xw += step) xw === x0w ? ctx.moveTo(...P(xw, yy)) : ctx.lineTo(...P(xw, yy));
    ctx.stroke();
  }
  // 줄 경계
  ctx.strokeStyle = 'rgba(255,255,255,.75)';
  ctx.lineWidth = 1.8;
  for (let ln = 0; ln < 4; ln++) {
    const yy = (LANE_Y[ln] + LANE_Y[ln + 1]) / 2 + 0.012;
    ctx.beginPath();
    for (let xw = x0w; xw <= x1w; xw += step) xw === x0w ? ctx.moveTo(...P(xw, yy)) : ctx.lineTo(...P(xw, yy));
    ctx.stroke();
  }
  // 출발선 · 결승선 (비스듬히)
  for (const [xw, fin] of [[0, false], [r.D, true]] as [number, boolean][]) {
    const [tx, ty] = P(xw, TRACK_TOP), [bx, by] = P(xw, TRACK_BOT);
    if (Math.max(tx, bx) < -R(0.1) || Math.min(tx, bx) > w + R(0.1)) continue;
    const n = fin ? 14 : 1;
    for (let j = 0; j < n; j++) {
      const q0 = j / n, q1 = (j + 1) / n;
      const ax = tx + (bx - tx) * q0, ay = ty + (by - ty) * q0, cx2 = tx + (bx - tx) * q1, cy2 = ty + (by - ty) * q1;
      for (const [o, col] of fin ? ([[0, j % 2 ? '#2a2a2a' : '#ffffff'], [1, j % 2 ? '#ffffff' : '#2a2a2a']] as [number, string][]) : ([[0, 'rgba(255,255,255,.95)']] as [number, string][])) {
        ctx.fillStyle = col;
        ctx.beginPath();
        const ox = o * R(0.013) - R(0.0065) * (fin ? 1 : 0.5);
        ctx.moveTo(ax + ox, ay);
        ctx.lineTo(ax + ox + R(0.013), ay);
        ctx.lineTo(cx2 + ox + R(0.013), cy2);
        ctx.lineTo(cx2 + ox, cy2);
        ctx.closePath();
        ctx.fill();
      }
    }
  }
  // 결승 깃대 (뒤쪽) + 현수막
  {
    const [tx, ty] = P(r.D, TRACK_TOP);
    if (tx > -R(0.3) && tx < w + R(0.3)) {
      const top = ty - R(0.16);
      ctx.fillStyle = '#ffffff';
      rr(ctx, tx - R(0.01), top, R(0.02), ty - top, R(0.006));
      ctx.fill();
      ctx.strokeStyle = '#8a8a9a';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = lin(ctx, 0, top - R(0.03), 0, top + R(0.03), [0, '#ff6a5a'], [1, '#d0302a']);
      rr(ctx, tx - R(0.11), top - R(0.032), R(0.22), R(0.058), R(0.02));
      ctx.fill();
      ctx.strokeStyle = '#7a1010';
      ctx.lineWidth = 2;
      ctx.stroke();
      font(0.04, 900);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('결승', tx, top - R(0.003));
      finishFlag(ctx, tx + R(0.01), top + R(0.06), R(0.06), t);
    }
  }
  // 장애물 · 선수 (먼 줄부터)
  const hs = hurdlesOf(r, d);
  const order = r.rs.map((_, i) => i).sort((a, b) => r.rs[a].lane - r.rs[b].lane);
  for (const ln of [0, 1, 2, 3, 4]) {
    const ru0 = r.rs.find((q) => q.lane === ln)!;
    const rpos = posAt(ru0, r.rc, r.xs);
    for (const hx of hs) {
      const [sx, sy] = P(hx, LANE_Y[ln] + 0.008);
      if (sx < -30 || sx > w + 30) continue;
      const fallen = ru0.crash && rpos > hx + 4 ? 1 : 0;
      drawHurdle(ctx, sx, sy, R(0.052 * LANE_SC[ln]), fallen);
    }
    for (const i of order) {
      const ru = r.rs[i];
      if (ru.lane !== ln) continue;
      drawRacer(ctx, s, r, ru, i, SXY, hs, w, fx);
    }
  }
  // 앞 울타리 (흐름)
  for (let xw = Math.floor(cam / 30) * 30; xw < cam + VIEW + 30; xw += 30) {
    const sx = SXY(xw, Y(1.14));
    ctx.fillStyle = 'rgba(40,60,20,.25)';
    ell(ctx, sx, Y(1.162), R(0.02), R(0.006));
    ctx.fill();
    ctx.fillStyle = lin(ctx, sx - R(0.01), 0, sx + R(0.01), 0, [0, '#ffffff'], [1, '#c8c8be']);
    rr(ctx, sx - R(0.01), Y(1.112), R(0.02), R(0.052), R(0.005));
    ctx.fill();
  }
  ctx.fillStyle = lin(ctx, 0, Y(1.118), 0, Y(1.132), [0, '#ffffff'], [1, '#d0d0c4']);
  ctx.fillRect(0, Y(1.118), w, R(0.014));
  ctx.restore();
  // 슬로모션 테두리
  if (r.slow) {
    ctx.fillStyle = radg(ctx, w / 2, Y(0.85), R(0.3), R(0.95), [0, 'rgba(0,0,0,0)'], [1, 'rgba(30,10,40,.45)']);
    ctx.fillRect(0, Y(0.3), w, h - Y(0.3));
    font(0.075, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#4a1a5a';
    ctx.fillStyle = '#fff0a0';
    const sc2 = 1 + 0.06 * Math.sin(t * 0.3);
    ctx.save();
    ctx.translate(w / 2, Y(0.53));
    ctx.scale(sc2, sc2);
    ctx.strokeText('코 차 승부!', 0, 0);
    ctx.fillText('코 차 승부!', 0, 0);
    ctx.restore();
  }
  drawRaceInfo(ctx, s, vis, fx, w, h, font);
}
function drawRacer(ctx: C2, s: PonyState, r: Race, ru: Runner, i: number, SXY: (x: number, y: number) => number, hs: number[], w: number, fx: ReturnType<typeof juice>) {
  const d = STAGES[s.stage], t = s.t, R = (v: number) => v * w, Y = (y: number) => y * w;
  const px = posAt(ru, r.rc, r.xs);
  const sc = LANE_SC[ru.lane], si = segAt(Math.min(px, r.D - 0.01), r.xs), seg = px >= 0 && px <= r.D ? d.course[si][0] : 'flat';
  const racing = s.phase === 'race' && !ru.done;
  // 장애물 넘기 (꾀가 모자라면 걸려 넘어짐)
  let jy = 0, crashNow = false;
  for (const hx of hs) {
    const dd = px - (hx - 11);
    if (dd > 0 && dd < 22) {
      if (ru.crash && dd > 8 && dd < 20) crashNow = true;
      else if (!ru.crash) jy = Math.sin((dd / 22) * Math.PI) * 0.06 * sc;
    }
  }
  const bump = bumpAt(r, px, d), dxs = 3, slope = ((bumpAt(r, px + dxs, d) - bumpAt(r, px - dxs, d)) / (2 * dxs)) * VIEW;
  const tilt = -Math.atan(slope) * 0.8;
  const fy = Y(LANE_Y[ru.lane] - bump - jy), sx = SXY(px, Y(LANE_Y[ru.lane] - bump));
  if (sx < -R(0.25) || sx > w + R(0.25)) return;
  const inWater = seg === 'water' && px > 0 && px < r.D;
  const ph = px / 26 + i * 0.21;
  const finished = s.phase === 'result' || (r.ended >= 0 && ru.done);
  if (ru.k === 'pony') {
    const k = R(0.06 * sc);
    const face: Face = finished ? (ru.place <= d.goal ? 'happy' : 'sad') : crashNow ? 'dizzy' : r.slow ? 'effort' : ru.fat >= 60 ? 'tired' : seg === 'hill' || seg === 'mud' ? 'effort' : 'idle';
    const pose: Pose = s.phase === 'pre' ? 'stand' : finished && s.phase === 'result' ? (ru.place <= d.goal ? 'flex' : 'stand') : crashNow ? 'tumble' : jy > 0.005 ? 'jump' : inWater ? 'swim' : 'gallop';
    // 반짝 왕관 (1등으로 달리는 중)
    drawPony(ctx, sx, fy, k, { pose, ph, tilt, rot: crashNow ? Math.sin(t * 0.4) * 0.5 : 0, face, wind: racing ? 1 : 0.2, flash: 0, flashStat: -1, sink: inWater ? 0.5 : 0, st: ru.st, fat: ru.fat, t, shadow: !inWater });
    // 머리 위 표시
    ctx.fillStyle = '#ff4a4a';
    ctx.beginPath();
    ctx.moveTo(sx + k * 0.5, fy - k * 3.0);
    ctx.lineTo(sx + k * 0.8, fy - k * 3.0);
    ctx.lineTo(sx + k * 0.65, fy - k * 2.75);
    ctx.closePath();
    ctx.fill();
    font2(ctx, R(0.032));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#7a1010';
    ctx.fillStyle = '#ffffff';
    ctx.strokeText('나', sx + k * 0.65, fy - k * 3.25);
    ctx.fillText('나', sx + k * 0.65, fy - k * 3.25);
  } else {
    const pose: RPose = s.phase === 'pre' ? 'stand' : finished ? (ru.place === 1 ? 'happy' : 'stand') : crashNow ? 'tumble' : jy > 0.005 ? 'jump' : inWater ? 'swim' : 'run';
    drawRunner(ctx, ru.k as RK, sx, fy, R(0.058 * sc), ph, pose, t, ru.lane, tilt);
  }
  if (inWater) {
    const k = R(0.06 * sc), wy = fy - k * 0.62;
    const wave = (q: number) => wy + Math.sin(q * 3 + t * 0.25) * k * 0.08;
    ctx.fillStyle = lin(ctx, 0, wy, 0, fy + k * 0.2, [0, 'rgba(90,185,245,.92)'], [1, 'rgba(50,140,220,.0)']);
    ctx.beginPath();
    ctx.moveTo(sx - k * 1.7, wave(-1.7));
    for (let q = -1.7; q <= 1.9; q += 0.2) ctx.lineTo(sx + q * k, wave(q));
    ctx.lineTo(sx + k * 1.9, fy + k * 0.2);
    ctx.lineTo(sx - k * 1.7, fy + k * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let q = -1.5; q <= 1.7; q += 0.2) q === -1.5 ? ctx.moveTo(sx + q * k, wave(q)) : ctx.lineTo(sx + q * k, wave(q));
    ctx.stroke();
    if (racing && t % 6 === i % 6) fx.burst(sx + k * 1.2, wy, '#e0f6ff', 3, 2.4, 2);
  }
  if (racing && seg === 'mud' && t % 7 === i % 7) fx.burst(sx - R(0.05), fy - R(0.01), '#8a5a32', 3, 2.2, 2.4);
  if (racing && crashNow && t % 5 === 0) fx.burst(sx, fy - R(0.03), '#ffe14a', 3, 2.5, 2);
}
function drawRaceInfo(ctx: C2, s: PonyState, vis: Vis, fx: ReturnType<typeof juice>, w: number, h: number, font: (sz: number, wgt?: number) => void) {
  const r = s.race!, d = STAGES[s.stage], t = s.t, R = (v: number) => v * w, Y = (y: number) => y * w;
  const me = r.rs[0], place = me.done || r.ended >= 0 ? me.place : livePlace(r);
  // 아래: 지금 등수 · 지금 쓰는 능력
  const by = Y(1.3);
  if (s.phase === 'race' || s.phase === 'pre') {
    const pre = s.phase === 'pre';
    const medal = place === 1 ? ['#ffe56a', '#e0a010'] : place === 2 ? ['#f6f8fc', '#a8b4c8'] : place === 3 ? ['#ffc89a', '#c8763a'] : ['#ece4dc', '#a89888'];
    const pa = t - vis.passT, pp = pa < 20 ? 1 + 0.35 * (1 - pa / 20) : 1;
    ctx.save();
    ctx.translate(R(0.16), by);
    ctx.scale(pp, pp);
    if (pre) ctx.globalAlpha = 0;
    ctx.fillStyle = 'rgba(40,20,5,.3)';
    ell(ctx, 2, 4, R(0.11), R(0.11));
    ctx.fill();
    ctx.fillStyle = lin(ctx, 0, -R(0.11), 0, R(0.11), [0, medal[0]], [1, medal[1]]);
    ell(ctx, 0, 0, R(0.11), R(0.11));
    ctx.fill();
    ctx.strokeStyle = '#6a4a20';
    ctx.lineWidth = 3;
    ctx.stroke();
    font(0.085, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#4a2a10';
    ctx.fillText(`${place}등`, 0, R(0.005));
    ctx.restore();
    // 길 안내
    const si = r.seg, k = d.course[si][0], st = SEG[k].stat;
    const bx = R(0.32), bw = R(0.64), bh = R(0.15);
    ctx.fillStyle = 'rgba(40,20,5,.25)';
    rr(ctx, bx + 2, by - bh / 2 + 4, bw, bh, R(0.03));
    ctx.fill();
    ctx.fillStyle = 'rgba(255,252,240,.96)';
    rr(ctx, bx, by - bh / 2, bw, bh, R(0.03));
    ctx.fill();
    ctx.strokeStyle = STAT_DARK[st];
    ctx.lineWidth = 3;
    ctx.stroke();
    if (s.phase === 'pre') {
      font(0.06, 900);
      ctx.fillStyle = '#d0501a';
      ctx.textAlign = 'center';
      ctx.fillText(s.pt < PRE_T - 20 ? '준비…' : '땅!', bx + bw / 2, by, bw - 8);
    } else {
      const spurt = d.spurt && si === d.course.length - 1;
      statIcon(ctx, spurt ? 3 : st, bx + R(0.065), by, R(0.035));
      font(0.05, 900);
      ctx.textAlign = 'left';
      ctx.fillStyle = STAT_DARK[spurt ? 3 : st];
      ctx.fillText(spurt ? '막판 질주!' : `${SEG[k].name}!`, bx + R(0.12), by - R(0.028), bw - R(0.14));
      font(0.034, 800);
      ctx.fillStyle = '#5a3a1a';
      const tip = spurt ? '꾀만큼 빨라져요' : k === 'mud' ? '힘! 지치면 푹푹 빠져요' : k === 'hurdle' ? (me.crash ? `꾀가 ${d.bar}보다 모자라 쿵!` : '꾀로 폴짝폴짝') : `${iga(STAT_NAME[st])} 쓰여요`;
      ctx.fillText(tip, bx + R(0.12), by + R(0.03), bw - R(0.14));
    }
    if (pa < 50 && vis.passTxt) {
      ctx.globalAlpha = Math.max(0, 1 - pa / 50);
      font(0.05, 900);
      ctx.textAlign = 'center';
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#6a3a12';
      ctx.fillStyle = vis.passTxt.startsWith('앗') ? '#ffd0c0' : '#fff6a0';
      ctx.strokeText(vis.passTxt, w / 2, Y(1.43) - pa * 0.3);
      ctx.fillText(vis.passTxt, w / 2, Y(1.43) - pa * 0.3);
      ctx.globalAlpha = 1;
    }
  }
  // 1등 들어올 때 꽃가루
  if (t - vis.confT < 60 && (t - vis.confT) % 6 === 0) for (let q = 0; q < 3; q++) fx.burst(R(0.2 + q * 0.3), Y(0.4), ['#ff6a8a', '#ffd23a', '#5ad0ff'][q], 8, 4, 2.6);
  // 결과
  if (s.phase === 'result') drawResult(ctx, s, fx, w, font);
  void h;
}
function drawResult(ctx: C2, s: PonyState, fx: ReturnType<typeof juice>, w: number, font: (sz: number, wgt?: number) => void) {
  const d = STAGES[s.stage], R = (v: number) => v * w, Y = (y: number) => y * w, age = s.pt;
  const a = Math.min(1, age / 8), pp = pop(age / 14);
  const cy = Y(1.29), cw = R(0.92), ch = R(0.3);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(w / 2, cy);
  ctx.scale(pp, pp);
  ctx.fillStyle = 'rgba(60,30,10,.3)';
  rr(ctx, -cw / 2 + 3, -ch / 2 + 6, cw, ch, R(0.04));
  ctx.fill();
  ctx.fillStyle = lin(ctx, 0, -ch / 2, 0, ch / 2, [0, '#fffaf0'], [1, '#ffe8c0']);
  rr(ctx, -cw / 2, -ch / 2, cw, ch, R(0.04));
  ctx.fill();
  ctx.strokeStyle = '#8a5a20';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = s.ok ? '#ff6a3a' : '#7a8aa8';
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo((sd * cw) / 2, -ch * 0.3);
    ctx.lineTo(sd * (cw / 2 + R(0.035)), -ch * 0.36);
    ctx.lineTo(sd * (cw / 2 + R(0.02)), -ch * 0.15);
    ctx.lineTo(sd * (cw / 2 + R(0.035)), ch * 0.0);
    ctx.lineTo((sd * cw) / 2, -ch * 0.05);
    ctx.closePath();
    ctx.fill();
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  font(0.075, 900);
  ctx.fillStyle = s.ok ? (s.rank === 1 ? '#d08a00' : '#d0500a') : '#5a6a88';
  const head = s.ok ? (s.won ? `${s.rank}등! 모든 대회 끝!` : s.rank === 1 ? '1등! 우승!' : `${s.rank}등! 통과!`) : `${s.rank}등… 아쉬워요`;
  ctx.fillText(head, 0, -ch * 0.3, cw - R(0.08));
  if (s.ok) {
    const nS = s.starOk.length;
    for (let j = 0; j < nS; j++) {
      const ag = age - (16 + j * 14), sx = (j - (nS - 1) / 2) * R(0.1), sy = ch * 0.02;
      const popS = ag < 0 ? 0.8 : ag < 8 ? 1.9 - 0.9 * (ag / 8) : 1;
      starPath(ctx, sx, sy, R(0.04) * popS);
      ctx.fillStyle = ag >= 0 && s.starOk[j] ? '#ffc93a' : 'rgba(90,50,20,.15)';
      ctx.fill();
      ctx.strokeStyle = ag >= 0 && s.starOk[j] ? '#9a5a08' : 'rgba(90,50,20,.35)';
      ctx.lineWidth = 1.8;
      ctx.stroke();
      if (ag >= 0 && s.starOk[j] && (fx.memo['st' + j] ?? -1) < s.t - ag) (fx.memo['st' + j] = s.t - ag), fx.burst(w / 2 + sx, cy + sy, '#ffd23a', 16, 3, 2.4);
    }
    font(0.036, 800);
    ctx.fillStyle = '#6a4a2a';
    const miss = d.stars.find((_q, j) => !s.starOk[j]);
    ctx.fillText(miss ? `다음엔: ${miss.label}` : '별을 다 땄어요!', 0, ch * 0.3, cw - R(0.08));
  } else {
    font(0.04, 800);
    ctx.fillStyle = '#6a4a2a';
    ctx.fillText(`목표는 ${d.goal}등 안 — 하트 -1`, 0, -ch * 0.02, cw - R(0.08));
    ctx.fillStyle = '#d0402a';
    ctx.fillText(s.hearts > 0 ? '이 대회만 다시 (훈련부터)' : '하트가 없어요 — 끝', 0, ch * 0.25, cw - R(0.08));
  }
  ctx.restore();
}

// ───────── 판 띠 · 새것 · 큰 글자 ─────────
function drawOverlays(ctx: C2, s: PonyState, fx: ReturnType<typeof juice>, w: number, h: number, font: (sz: number, wgt?: number) => void) {
  const X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w, t = s.t;
  // 스포트라이트
  if (s.spot && s.phase === 'train' && t - s.spot.t < 220) {
    const sp = s.spot, a = Math.min(1, (220 - (t - sp.t)) / 30), pul = 1 + 0.04 * Math.sin(t * 0.2), prx = R(sp.rx) * pul, pry = R(sp.ry) * pul;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = '#ffd23a';
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 7]);
    ctx.lineDashOffset = -t * 0.8;
    rr(ctx, X(sp.x) - prx, Y(sp.y) - pry, prx * 2, pry * 2, Math.min(prx, pry) * 0.6);
    ctx.stroke();
    ctx.setLineDash([]);
    font(0.034, 900);
    const lab = `NEW  ${sp.label}`, tw = ctx.measureText(lab).width + R(0.04);
    const lx = clamp(X(sp.x), tw / 2 + 4, w - tw / 2 - 4), ly = Y(sp.y) - pry - R(0.005);
    ctx.fillStyle = '#ff5a3a';
    rr(ctx, lx - tw / 2, ly - R(0.022), tw, R(0.044), R(0.022));
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
  // 판 시작 띠
  if (s.banner && s.phase === 'train' && t - s.banner.t < BANNER_T) {
    const age = t - s.banner.t, a = Math.min(1, age / 8, (BANNER_T - age) / 25), pp = Math.min(1, 0.5 + age / 10);
    const head = s.banner.head, sub = s.banner.sub;
    ctx.save();
    ctx.globalAlpha = a;
    font(0.052, 900);
    const w1 = ctx.measureText(head).width;
    font(0.034, 800);
    const w2 = ctx.measureText(sub).width;
    const cw = Math.min(w - R(0.04), Math.max(w1, w2) + R(0.1)), ch = R(0.15) * pp;
    ctx.translate(w / 2, Y(0.55));
    ctx.fillStyle = 'rgba(60,30,10,.3)';
    rr(ctx, -cw / 2 + 3, -ch / 2 + 5, cw, ch, R(0.035));
    ctx.fill();
    ctx.fillStyle = lin(ctx, 0, -ch / 2, 0, ch / 2, [0, '#fffaf0'], [1, '#ffe8c0']);
    rr(ctx, -cw / 2, -ch / 2, cw, ch, R(0.035));
    ctx.fill();
    ctx.strokeStyle = '#8a5a20';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    font(0.052, 900);
    ctx.fillStyle = '#2a5a9a';
    ctx.fillText(head, 0, -R(0.028), w - R(0.1));
    font(0.034, 800);
    ctx.fillStyle = sub.startsWith('NEW') ? '#d0402a' : '#6a4a2a';
    ctx.fillText(sub, 0, R(0.035), w - R(0.1));
    ctx.restore();
  }
  // 큰 순간 글자
  const ba = t - s.bigT;
  if (ba < 70 && s.bigText) {
    const pp = ba < 10 ? 0.4 + 0.9 * pop(ba / 10) : 1, a = Math.min(1, (70 - ba) / 18);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(w / 2, Y(s.bigY) - ba * 0.25);
    ctx.rotate(-0.05);
    ctx.scale(pp, pp);
    font(0.085, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 8;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#7a2a10';
    ctx.strokeText(s.bigText, 0, 0, w * 0.95);
    ctx.fillStyle = lin(ctx, 0, -R(0.04), 0, R(0.04), [0, '#fff6a0'], [1, '#ffb81c']);
    ctx.fillText(s.bigText, 0, 0, w * 0.95);
    ctx.restore();
  }
  void fx;
  void h;
}

/** 시험·스크린샷용: k판(0부터)으로 바로 */
export function jumpTo(s: PonyState, k: number, st: number[] = [60, 60, 60, 50], fat = 20) {
  s.stage = k;
  s.st = [...st];
  s.fat = fat;
  s.snap = { st: [...st], fat };
  s.again = false;
  newStage(s);
}
