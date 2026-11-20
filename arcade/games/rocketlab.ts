/**
 * 꼬마 로켓 조립 발사 (35라운드: 또 다른 장르 — 톡 하나) — 조립해서 날리기 × 더 걸까 멈출까.
 * 조작은 톡뿐: 부품 카드 셋 중 하나를 톡 → 로켓에 '철컥' 붙어 눈앞에서 자란다. 언제든 큰 '발사!'를 톡 → 비행은 저절로 펼쳐진다.
 *   아무것도 안 누르면 발사대에서 기다릴 뿐 — 시간 압박 없음. 키보드: 화살표 커서 + 스페이스(또는 1·2·3 = 카드).
 * 비행(결정적 물리): 엔진이 연료를 태워 밀어 올리고, 연료를 다 쓴 단은 분리 단 위에서 '퉁' 떨어져 나간다.
 *   너무 무거우면 픽 쓰러져 데굴데굴, 너무 키가 크거나 한쪽만 무거우면 빙글빙글, 낙하산이 있으면 고양이 우주인이 둥실 내려와 손 흔들기.
 * 미리 보기: 로켓 옆 높이 자에 '지금 쏘면 여기까지' 선이 늘 보인다(같은 시뮬레이션, 바람은 빼고 — 바람이 흔들 수 있는 폭은 옅은 띠로).
 * 더 걸까 멈출까: 판마다 붙일 수 있는 부품 칸이 정해져 있고, 붙인 부품은 뗄 수 없다. 다음 카드는 모른다.
 * 판 7개 · 판마다 새것: 1 엔진·연료통 → 2 분리 단 → 3 새 떼(코 덮개) → 4 낙하산 → 5 바람 골짜기(날개) → 6 보조 로켓(짝으로) → 7 달 정거장(자석 짐 붙이기).
 */
import { hashString, mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5;
// ───────────────────────────── 자리 (가로 폭 = 1, 세로도 가로 폭 단위) ─────────────────────────────
const CARD_X = [0.175, 0.5, 0.825], CARD_Y = 1.13, CARD_W = 0.3, CARD_H = 0.22;
const BTN_Y = 1.318, BTN_H = 0.1, BTN_W = 0.6, BTN_X = 0.635;
const PANEL_Y = 1.0;
const PAD_X = 0.42, PAD_Y = 0.9;
const GAUGE_X = 0.885, GAUGE_TOP = 0.15, GAUGE_BOT = 0.89;

// ───────────────────────────── 부품 ─────────────────────────────
type PK = 'eng' | 'big' | 'tank' | 'sep' | 'nose' | 'chute' | 'wing' | 'boost' | 'mag';
interface PD {
  name: string; m: number; thr: number; burn: number; fuel: number;
  /** 몸통에 쌓이는 부품인가 (아니면 캡슐·옆에 붙는 장식) */
  stack: boolean; h: number; wd: number; tag: string; say: string;
  bars: [number, number, number];
}
const P: Record<PK, PD> = {
  eng: { name: '엔진', m: 1.4, thr: 80, burn: 1.0, fuel: 1.5, stack: true, h: 0.068, wd: 0.16, tag: '', say: '부릉!', bars: [1, 2, 1] },
  big: { name: '힘센 엔진', m: 2.4, thr: 150, burn: 2.2, fuel: 1.5, stack: true, h: 0.082, wd: 0.2, tag: '', say: '부르릉!!', bars: [3, 4, 1] },
  tank: { name: '연료통', m: 1.2, thr: 0, burn: 0, fuel: 6, stack: true, h: 0.085, wd: 0.16, tag: '', say: '꿀렁', bars: [2, 0, 3] },
  sep: { name: '분리 단', m: 0.25, thr: 0, burn: 0, fuel: 0, stack: true, h: 0.026, wd: 0.17, tag: '빈 통 퉁!', say: '딸깍', bars: [0, 0, 0] },
  nose: { name: '코 덮개', m: 0.35, thr: 0, burn: 0, fuel: 0, stack: false, h: 0, wd: 0, tag: '새 뚫기', say: '뾰족!', bars: [1, 0, 0] },
  chute: { name: '낙하산', m: 0.25, thr: 0, burn: 0, fuel: 0, stack: false, h: 0, wd: 0, tag: '둥실', say: '폭신', bars: [1, 0, 0] },
  wing: { name: '날개', m: 0.4, thr: 0, burn: 0, fuel: 0, stack: false, h: 0, wd: 0, tag: '바람 타기', say: '파닥', bars: [1, 0, 0] },
  boost: { name: '보조 로켓', m: 0.8, thr: 64, burn: 3.2, fuel: 4, stack: false, h: 0, wd: 0, tag: '짝으로', say: '슈욱!', bars: [2, 3, 1] },
  mag: { name: '자석 짐', m: 0.8, thr: 0, burn: 0, fuel: 0, stack: false, h: 0, wd: 0, tag: '정거장', say: '철컥', bars: [3, 0, 0] },
};
const BIRD_V = 14, BIRD_K = 0.022;
const CAP_M = 1.0, FUEL_M = 0.2, G = 10, CD = 0.0006, DT = 0.1, MPU = 10, MAX_STEPS = 1200;
/** 캡슐 크기 (가로 폭 단위) */
const CAP_H = 0.118, CAP_W = 0.17;

// ───────────────────────────── 판 ─────────────────────────────
type StarK = 'reach' | 'parts' | 'high' | 'chute' | 'drop' | 'dock' | 'nobird';
interface StarDef { k: StarK; n: number; label: string }
const ST = (k: StarK, n: number, label: string): StarDef => ({ k, n, label });
interface StageDef {
  name: string; place: string; news: string; hint: string; spot: '' | PK;
  /** 목표 높이 (m) · 부품 칸 · 카드 무게 · 바람 세기 · 새 떼 층 (m) */
  goal: number; slots: number; pool: [PK, number][]; wind: number; birds: [number, number] | null;
  first: PK[]; stars: StarDef[]; sky: number;
}
export const STAGES: StageDef[] = [
  {
    name: '구름 섬', place: '구름 섬', news: '', hint: '부품을 톡! 다 되면 발사!', spot: '',
    goal: 300, slots: 3, pool: [['eng', 3], ['big', 1.5], ['tank', 3]], wind: 0, birds: null,
    first: ['eng', 'big', 'eng'], stars: [ST('reach', 0, '구름 섬까지 날기')], sky: 0,
  },
  {
    name: '풍선 마을', place: '풍선 마을', news: '분리 단 — 다 쓴 아래 단을 퉁! 떼어 내요', hint: '엔진·연료 → 분리 단 → 엔진·연료', spot: 'sep',
    goal: 1500, slots: 5, pool: [['eng', 3], ['big', 2], ['tank', 3], ['sep', 2]], wind: 0, birds: null,
    first: ['eng', 'tank', 'sep'], stars: [ST('reach', 0, '풍선 마을까지 날기'), ST('drop', 0, '빈 단을 퉁! 떼어 내기')], sky: 1,
  },
  {
    name: '새 떼 위', place: '새 떼 위', news: '새 떼 — 코 덮개가 없으면 부딪혀 느려져요', hint: '코 덮개를 씌우면 새 떼를 뚫어요', spot: 'nose',
    goal: 2600, slots: 5, pool: [['eng', 3], ['big', 2], ['tank', 3], ['sep', 1.6], ['nose', 1.6]], wind: 0, birds: [800, 1600],
    first: ['big', 'tank', 'nose'], stars: [ST('reach', 0, '새 떼 위까지 날기'), ST('nobird', 0, '새와 안 부딪히기'), ST('high', 3600, '3600m 별 깃발 넘기')], sky: 2,
  },
  {
    name: '무지개 구름', place: '무지개 구름', news: '낙하산 — 고양이가 둥실 내려와요', hint: '낙하산 칸 하나를 남겨 둬요', spot: 'chute',
    goal: 3200, slots: 6, pool: [['eng', 3], ['big', 2], ['tank', 3], ['sep', 1.6], ['nose', 1.2], ['chute', 1.6]], wind: 0.8, birds: [900, 1700],
    first: ['eng', 'tank', 'chute'], stars: [ST('reach', 0, '무지개 구름까지 날기'), ST('chute', 0, '고양이를 낙하산으로 내리기'), ST('parts', 5, '부품 5개 안으로')], sky: 3,
  },
  {
    name: '바람 골짜기', place: '바람 섬', news: '날개 — 바람을 타고, 키 큰 로켓도 똑바로', hint: '바람이 세요 — 날개는 바람을 위로 타요', spot: 'wing',
    goal: 4000, slots: 7, pool: [['eng', 3], ['big', 2.2], ['tank', 3], ['sep', 1.6], ['nose', 1], ['chute', 1.2], ['wing', 1.8]], wind: 3.2, birds: [1000, 1800],
    first: ['big', 'tank', 'wing'], stars: [ST('reach', 0, '바람 섬까지 날기'), ST('chute', 0, '고양이를 낙하산으로 내리기'), ST('high', 5000, '5000m 별 깃발 넘기')], sky: 4,
  },
  {
    name: '오로라 하늘', place: '오로라', news: '보조 로켓 — 짧고 세요, 짝으로 붙여야 똑바로', hint: '하나만 붙이면 한쪽이 무거워 빙글빙글', spot: 'boost',
    goal: 4600, slots: 7, pool: [['eng', 2.6], ['big', 2.2], ['tank', 3], ['sep', 1.6], ['nose', 1], ['chute', 1], ['wing', 1.2], ['boost', 2.4]], wind: 2.2, birds: [1100, 1900],
    first: ['boost', 'tank', 'nose'], stars: [ST('reach', 0, '오로라까지 날기'), ST('parts', 6, '부품 6개 안으로'), ST('high', 5300, '5300m 별 깃발 넘기')], sky: 5,
  },
  {
    name: '달 정거장', place: '달 정거장', news: '자석 짐 — 정거장 높이에 딱 멈추면 철컥!', hint: '너무 높이 가면 정거장을 지나쳐요', spot: 'mag',
    goal: 2700, slots: 7, pool: [['eng', 2.6], ['big', 2.2], ['tank', 3], ['sep', 1.6], ['nose', 1], ['chute', 1.2], ['wing', 1], ['boost', 1.8], ['mag', 2.6]], wind: 0.6, birds: [1100, 1900],
    first: ['eng', 'tank', 'mag'], stars: [ST('reach', 0, '정거장 높이까지 날기'), ST('dock', 0, '자석 짐을 정거장에 붙이기'), ST('chute', 0, '고양이를 낙하산으로 내리기')], sky: 6,
  },
];
export const STAGE_COUNT = STAGES.length;
/** 정거장에 붙는 폭 (목표 위로 m) */
const DOCK_BAND = 800;
const CLEAR_PTS = 100, STAR_PTS = 100, WIN_PTS = 200, HEART_PTS = 100;
/** 비행 시간표 (틱): 점화 · 오름 · 꼭대기 · 내려옴 · 착지 */
const IGN = 42, ASC_MIN = 170, ASC_MAX = 310, HOLD = 40, DESC = 96, LAND = 44, TIP_T = 120;
const RESULT_OK = 170, RESULT_FAIL = 150, BANNER_T = 160, ATTACH_T = 12;

// ───────────────────────────── 비행 시뮬레이션 (미리 보기·봇·실제가 같은 것을 쓴다) ─────────────────────────────
interface FlyEv { step: number; k: 'drop' | 'boostOff' | 'burnout' | 'spin' | 'birds' | 'birdsOut' | 'gust' | 'pass' | 'dock'; n: number }
interface FlyRes {
  /** 꼭대기 높이 (m) */
  apex: number; tip: boolean; spin: boolean; steps: number; bonks: number; drops: number;
  alt: Float32Array | null; ev: FlyEv[];
}
interface Build { groups: { idx: number[]; thr: number; burn: number; fuel: number; dry: number }[]; acc: { nose: number; chute: number; wing: number; boost: number; mag: number }; stackN: number; wob: number; engines: number }
function build(parts: PK[]): Build {
  const groups: Build['groups'] = [{ idx: [], thr: 0, burn: 0, fuel: 0, dry: 0 }];
  const acc = { nose: 0, chute: 0, wing: 0, boost: 0, mag: 0 };
  let stackN = 0, engines = 0;
  parts.forEach((k, i) => {
    const d = P[k];
    if (!d.stack) {
      if (k === 'nose') acc.nose++;
      else if (k === 'chute') acc.chute++;
      else if (k === 'wing') acc.wing++;
      else if (k === 'boost') (acc.boost++), engines++;
      else if (k === 'mag') acc.mag++;
      return;
    }
    stackN++;
    const g = groups[groups.length - 1];
    g.idx.push(i);
    g.thr += d.thr;
    g.burn += d.burn;
    g.fuel += d.fuel;
    g.dry += d.m;
    if (d.thr > 0) engines++;
    if (k === 'sep') groups.push({ idx: [], thr: 0, burn: 0, fuel: 0, dry: 0 });
  });
  // 흔들림: 키가 크면(몸통 5칸 넘게) · 보조 로켓이 한쪽만이면 — 날개 하나가 2만큼 잡는다
  const wob = Math.max(0, stackN - 5) + (acc.boost % 2 ? 2 : 0) - acc.wing * 2;
  return { groups, acc, stackN, wob, engines };
}
const hasEngine = (parts: PK[]) => parts.some((k) => P[k].thr > 0);

/** 결정적 비행. wind ∈ [-1, 1] (미리 보기는 0). rec이면 높이 기록과 사건을 남긴다 */
function fly(parts: PK[], st: number, wind: number, rec: boolean, cap = Infinity): FlyRes {
  const d = STAGES[st], B = build(parts), gs = B.groups.map((g) => ({ ...g, gone: false }));
  const goal = d.goal / MPU, birds = d.birds ? [d.birds[0] / MPU, d.birds[1] / MPU] : null;
  const dock = parts.includes('mag');
  let bFuel = B.acc.boost ? P.boost.fuel * B.acc.boost : 0, bOn = B.acc.boost > 0;
  const accM = CAP_M + B.acc.nose * P.nose.m + B.acc.chute * P.chute.m + B.acc.wing * P.wing.m + B.acc.mag * P.mag.m;
  const ev: FlyEv[] = [];
  const alt: number[] = [];
  let h = 0, v = 0, spin = false, bonks = 0, drops = 0, inBirds = false, passed = false, gusted = false, burned = false, apex = 0, step = 0;
  const windA = d.wind * (B.acc.wing ? Math.abs(wind) * 1.15 + 0.35 : wind);
  const lowest = () => gs.findIndex((g) => !g.gone);
  // 엔진 없는 아래 단은 바로 떨어진다 (위에 분리 단이 있을 때)
  for (;;) {
    const a = lowest();
    if (a < 0 || a >= gs.length - 1 || gs[a].thr > 0) break;
    gs[a].gone = true;
    drops++;
    if (rec) ev.push({ step: 0, k: 'drop', n: a });
  }
  const mass = () => {
    let m = accM;
    for (const g of gs) if (!g.gone) m += g.dry + g.fuel * FUEL_M;
    if (bOn) m += B.acc.boost * P.boost.m + bFuel * FUEL_M;
    return m;
  };
  const thrustNow = () => {
    let T = 0;
    const a = lowest();
    if (a >= 0 && gs[a].fuel > 0 && gs[a].thr > 0) T += gs[a].thr;
    if (bOn && bFuel > 0) T += B.acc.boost * P.boost.thr;
    return T;
  };
  // 너무 무거우면 픽
  const T0 = thrustNow(), M0 = mass();
  if (T0 <= 0 || T0 / M0 < G * 1.04) return { apex: 0, tip: true, spin: false, steps: 0, bonks: 0, drops: 0, alt: rec ? new Float32Array([0]) : null, ev };
  for (step = 0; step < MAX_STEPS; step++) {
    const a = lowest();
    let T = 0;
    if (a >= 0 && gs[a].fuel > 0 && gs[a].thr > 0) {
      T += gs[a].thr;
      gs[a].fuel = Math.max(0, gs[a].fuel - gs[a].burn * DT);
    }
    if (bOn && bFuel > 0) {
      T += B.acc.boost * P.boost.thr;
      bFuel = Math.max(0, bFuel - P.boost.burn * B.acc.boost * DT);
    }
    if (bOn && bFuel <= 0) {
      bOn = false;
      if (rec) ev.push({ step, k: 'boostOff', n: B.acc.boost });
    }
    // 아래 단 연료가 다 떨어지면: 위에 분리 단이 있으면 퉁
    const a2 = lowest();
    if (a2 >= 0 && (gs[a2].fuel <= 0 || gs[a2].thr <= 0) && a2 < gs.length - 1) {
      gs[a2].gone = true;
      drops++;
      if (rec) ev.push({ step, k: 'drop', n: a2 });
      // 위 단에 엔진이 없으면 더 떨어뜨릴 것도 없이 그냥 난다
    }
    if (!spin && B.wob > 0 && step * DT >= 0.9 - 1e-9) {
      spin = true;
      if (rec) ev.push({ step, k: 'spin', n: B.wob });
    }
    if (spin) T *= 0.6;
    const M = mass();
    let drag = CD * v * Math.abs(v) * (B.acc.nose ? 0.7 : 1) * (spin ? 1.5 : 1);
    const inB = !!birds && h >= birds[0] && h <= birds[1];
    if (inB !== inBirds) {
      inBirds = inB;
      if (rec) ev.push({ step, k: inB ? 'birds' : 'birdsOut', n: B.acc.nose });
    }
    // 새 떼: 코 덮개가 없으면 부딪혀 속도가 깎인다
    if (inB && !B.acc.nose && v > BIRD_V) {
      v -= (v - BIRD_V) * BIRD_K * DT * 20;
      if (step % 3 === 0) bonks++;
    }
    let aw = 0;
    if (d.wind && h >= goal * 0.25 && h <= goal * 0.8) {
      aw = windA;
      if (!gusted && rec) ev.push({ step, k: 'gust', n: windA });
      gusted = true;
    }
    const acc = T / M - G - drag / M + aw;
    v += acc * DT;
    h += v * DT;
    if (h < 0) (h = 0), (v = Math.max(0, v));
    if (rec) alt.push(h * MPU);
    if (!passed && h >= goal) {
      passed = true;
      if (rec) ev.push({ step, k: 'pass', n: 0 });
    }
    const T1 = thrustNow();
    if (!burned && T1 <= 0) {
      burned = true;
      if (rec) ev.push({ step, k: 'burnout', n: 0 });
    }
    if (T1 <= 0 && v <= 0) break;
    apex = Math.max(apex, h);
    // 봇 어림: 연료가 다 떨어졌고 이미 셀 만한 높이를 넘었으면 그만 (미리 보기·실제 비행은 끝까지)
    if (T1 <= 0 && h * MPU >= cap) break;
  }
  apex = Math.max(apex, h);
  const res: FlyRes = { apex: apex * MPU, tip: false, spin, steps: step + 1, bonks, drops, alt: rec ? Float32Array.from(alt) : null, ev };
  if (dock && rec && docked(st, res.apex)) ev.push({ step, k: 'dock', n: 0 });
  return res;
}
const docked = (st: number, apex: number) => apex >= STAGES[st].goal && apex <= STAGES[st].goal + DOCK_BAND;

/** 미리 보기: 바람 0 · 바람이 흔들 수 있는 폭 (가장 나쁨 · 가장 좋음) */
interface Pred { apex: number; lo: number; hi: number; tip: boolean; spin: boolean; bonks: number; drops: number }
const predMem = new Map<string, Pred>();
const partsKey = (st: number, parts: PK[]) => `${st}|${parts.join(',')}`;
/** 같은 비행이 되는 조립은 같은 열쇠: 단(분리 단 사이) 안의 순서와 장식의 순서는 상관없다 */
function canonKey(st: number, parts: PK[]): string {
  const groups: PK[][] = [[]], acc: PK[] = [];
  for (const k of parts) {
    if (!P[k].stack) acc.push(k);
    else {
      groups[groups.length - 1].push(k);
      if (k === 'sep') groups.push([]);
    }
  }
  return `${st}|${groups.map((g) => g.sort().join('')).join('/')}|${acc.sort().join('')}`;
}
function predict(parts: PK[], st: number): Pred {
  const key = partsKey(st, parts);
  const m = predMem.get(key);
  if (m) return m;
  const r0 = fly(parts, st, 0, false);
  let lo = r0.apex, hi = r0.apex;
  if (STAGES[st].wind && !r0.tip) (lo = fly(parts, st, -1, false).apex), (hi = fly(parts, st, 1, false).apex);
  const p: Pred = { apex: r0.apex, lo: Math.min(lo, hi, r0.apex), hi: Math.max(lo, hi, r0.apex), tip: r0.tip, spin: r0.spin, bonks: r0.bonks, drops: r0.drops };
  if (predMem.size > 60000) predMem.clear();
  predMem.set(key, p);
  return p;
}

// ───────────────────────────── 상태 ─────────────────────────────
interface Card { k: PK; born: number; shake: number }
interface Ev { t: number; kind: string; x: number; y: number; n?: number; text?: string }
interface Flight { res: FlyRes; wind: number; asc: number; t: number; seen: number; landed: boolean; ok: boolean; dockOk: boolean }

export interface RocketState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'build' | 'fly' | 'result'; pt: number;
  hearts: number; stars: number; got: number; starOk: boolean[]; pts: number;
  parts: PK[]; hand: Card[]; attachT: number; lastPart: number;
  ok: boolean; why: string; won: boolean; dead: boolean; again: boolean; tries: number; launches: number;
  fl: Flight | null; best: number;
  down: boolean; firstTap: number; firstBig: number; wowN: number; firstEngine: boolean;
  seen: Set<string>; banner: { head: string; sub: string; t: number } | null; spot: { k: PK; t: number } | null;
  events: Ev[]; bigText: string; bigT: number;
}

const ev = (s: RocketState, kind: string, x: number, y: number, n?: number, text?: string) => s.events.push({ t: s.t, kind, x, y, n, text });
function see(s: RocketState, key: string) {
  if (!key || s.seen.has(key)) return false;
  s.seen.add(key);
  return true;
}
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function wow(s: RocketState, text: string) {
  s.wowN++;
  if (s.firstBig < 0 && s.firstTap >= 0) s.firstBig = s.t;
  s.bigText = text;
  s.bigT = s.t;
  ev(s, 'big', 0.5, 0.4, 0, text);
}

// ───────────────────────────── 카드 ─────────────────────────────
const POWER: PK[] = ['eng', 'big', 'boost'];
const ONCE: PK[] = ['nose', 'chute', 'mag'];
function drawFrom(rng: Rng, st: number, ok: (k: PK) => boolean): PK | null {
  const d = STAGES[st];
  let tot = 0;
  for (const [k, wt] of d.pool) if (ok(k)) tot += wt;
  if (tot <= 0) return null;
  let r = rng() * tot;
  for (const [k, wt] of d.pool) {
    if (!ok(k)) continue;
    r -= wt;
    if (r <= 0) return k;
  }
  return null;
}
/** 새 손패 셋: [힘 카드 · 연료통 · 특별 카드] — 특별 카드는 그 판에 나오는 장치(이미 붙인 하나뿐인 것은 빼고), 가끔 힘·연료 */
function deal(rng: Rng, st: number, parts: PK[]): PK[] {
  const power = drawFrom(rng, st, (k) => POWER.includes(k)) ?? 'eng';
  const special = (k: PK) => !POWER.includes(k) && k !== 'tank' && !(ONCE.includes(k) && parts.includes(k)) && !(k === 'wing' && parts.filter((q) => q === 'wing').length >= 2);
  const wild = (rng() < 0.62 ? drawFrom(rng, st, special) : null) ?? drawFrom(rng, st, (k) => k !== power) ?? 'tank';
  return [power, 'tank', wild];
}
function newHand(s: RocketState, first: boolean) {
  const d = STAGES[s.stage];
  const ks = first && !s.again ? [...d.first] : deal(s.rng, s.stage, s.parts);
  if (first && s.again && d.spot && !ks.includes(d.spot)) ks[POWER.includes(d.spot) ? 0 : 2] = d.spot;
  s.hand = ks.map((k, i) => ({ k, born: s.t + i * 4, shake: -999 }));
}
const slotsLeft = (s: { stage: number; parts: PK[] }) => STAGES[s.stage].slots - s.parts.length;
/** 그 카드를 지금 붙일 수 있나: 칸이 남았고, 마지막 칸이면 엔진이 이미 있거나 엔진 카드여야 */
function canAttach(s: { stage: number; parts: PK[] }, k: PK): '' | 'full' | 'engine' {
  const left = slotsLeft(s);
  if (left <= 0) return 'full';
  if (left === 1 && !hasEngine(s.parts) && !(P[k].thr > 0)) return 'engine';
  return '';
}

// ───────────────────────────── 판 흐름 ─────────────────────────────
function newStage(s: RocketState) {
  const d = STAGES[s.stage];
  s.phase = 'build';
  s.pt = 0;
  s.parts = [];
  s.fl = null;
  s.attachT = -999;
  s.lastPart = -1;
  s.firstEngine = false;
  newHand(s, true);
  s.starOk = d.stars.map(() => false);
  s.got = 0;
  if (!s.again) {
    s.banner = { head: `${s.stage + 1}판 · ${d.name}`, sub: d.news ? `NEW  ${d.news}` : `목표: ${d.place} ${d.goal}m`, t: s.t };
    if (d.spot) (s.spot = { k: d.spot, t: s.t }), see(s, d.spot);
    else s.spot = null;
    if (d.birds) see(s, 'birds');
    if (d.wind >= 2) see(s, 'wind');
  } else s.banner = { head: `다시! ${s.stage + 1}판 · ${d.name}`, sub: `목표 ${d.goal}m — 새 로켓으로`, t: s.t };
}
function starMet(s: RocketState, q: StarDef, r: FlyRes) {
  switch (q.k) {
    case 'reach': return r.apex >= STAGES[s.stage].goal;
    case 'parts': return s.parts.length <= q.n;
    case 'high': return r.apex >= q.n;
    case 'chute': return s.parts.includes('chute');
    case 'drop': return r.drops > 0;
    case 'dock': return s.parts.includes('mag') && docked(s.stage, r.apex);
    case 'nobird': return r.bonks === 0;
  }
}
/** 별 칸 옆 진행 (지금 쏘면) */
function starPreview(s: RocketState, q: StarDef, p: Pred): boolean {
  switch (q.k) {
    case 'reach': return p.apex >= STAGES[s.stage].goal;
    case 'parts': return s.parts.length <= q.n;
    case 'high': return p.apex >= q.n;
    case 'chute': return s.parts.includes('chute');
    case 'drop': return p.drops > 0;
    case 'dock': return s.parts.includes('mag') && docked(s.stage, p.apex);
    case 'nobird': return p.bonks === 0;
  }
}
function launch(s: RocketState) {
  if (!s.parts.length) return void ev(s, 'nolaunch', BTN_X, BTN_Y, 0, '부품을 먼저 붙여요');
  if (!hasEngine(s.parts)) return void ev(s, 'nolaunch', BTN_X, BTN_Y, 0, '엔진이 없어요!');
  const d = STAGES[s.stage];
  const wind = d.wind ? s.rng() * 2 - 1 : 0;
  const res = fly(s.parts, s.stage, wind, true);
  const asc = res.tip ? TIP_T : clamp(Math.round(res.steps * DT * 12.4), ASC_MIN, ASC_MAX);
  s.fl = { res, wind, asc, t: 0, seen: -1, landed: false, ok: !res.tip && res.apex >= d.goal, dockOk: false };
  s.phase = 'fly';
  s.pt = 0;
  s.launches++;
  s.banner = null;
  s.spot = null;
  see(s, 'launch');
  ev(s, 'ignite', PAD_X, PAD_Y);
}
function endFlight(s: RocketState) {
  const f = s.fl!, d = STAGES[s.stage];
  s.phase = 'result';
  s.pt = 0;
  s.ok = f.ok;
  s.best = Math.max(s.best, f.res.apex);
  if (s.ok) {
    s.starOk = d.stars.map((q) => starMet(s, q, f.res));
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    s.pts += (CLEAR_PTS + s.got * STAR_PTS) * (1 + s.stage * 0.5);
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS + s.hearts * HEART_PTS);
    ev(s, 'clear', 0.5, 0.4, s.got);
  } else {
    s.hearts--;
    s.tries++;
    s.why = f.res.tip ? '너무 무거워서 픽 쓰러졌어요' : `${Math.round(d.goal - f.res.apex)}m 모자랐어요`;
    ev(s, 'fail', 0.5, 0.5);
  }
}

// ───────────────────────────── 비행 진행 (틱) ─────────────────────────────
/** 비행 t틱 → 시뮬레이션 몇 번째 걸음까지 왔나 (오름 구간) */
const flStep = (f: Flight) => (f.res.tip ? 0 : clamp(((f.t - IGN) / f.asc) * f.res.steps, 0, f.res.steps - 1));
const flTotal = (f: Flight) => (f.res.tip ? IGN + TIP_T : IGN + f.asc + HOLD + DESC + LAND);
function altAt(f: Flight, step: number) {
  const a = f.res.alt!;
  if (a.length < 2) return 0;
  const i = Math.floor(step), u = step - i;
  return a[Math.min(a.length - 1, i)] * (1 - u) + a[Math.min(a.length - 1, i + 1)] * u;
}
function flyTick(s: RocketState) {
  const f = s.fl!, d = STAGES[s.stage];
  f.t++;
  if (f.t === IGN) {
    if (f.res.tip) {
      see(s, 'tip');
      ev(s, 'tip', PAD_X, PAD_Y);
      wow(s, '픽… 데굴데굴!');
    } else {
      ev(s, 'liftoff', PAD_X, PAD_Y);
      wow(s, '발사!');
    }
  }
  if (!f.res.tip && f.t > IGN && f.t <= IGN + f.asc) {
    const stp = flStep(f);
    for (const e of f.res.ev) {
      if (e.step <= f.seen || e.step > stp) continue;
      switch (e.k) {
        case 'drop':
          see(s, 'drop');
          ev(s, 'drop', 0.5, 0.6, e.n);
          wow(s, '퉁! 빈 단 분리');
          break;
        case 'boostOff':
          ev(s, 'boostOff', 0.5, 0.6, e.n);
          break;
        case 'spin':
          see(s, 'spin');
          ev(s, 'spin', 0.5, 0.5, e.n);
          wow(s, '빙글빙글~');
          break;
        case 'birds':
          ev(s, 'birds', 0.5, 0.3, e.n);
          break;
        case 'gust':
          ev(s, 'gust', 0.5, 0.4, e.n);
          break;
        case 'pass':
          ev(s, 'pass', 0.5, 0.3);
          wow(s, `${d.place} 도착!`);
          break;
        case 'dock':
          break;
        default:
          break;
      }
    }
    f.seen = stp;
    if (f.t === IGN + f.asc) {
      ev(s, 'apex', 0.5, 0.4);
      if (f.ok && s.parts.includes('mag') && docked(s.stage, f.res.apex)) {
        f.dockOk = true;
        see(s, 'dock');
        ev(s, 'dock', 0.5, 0.35);
        wow(s, '철컥! 정거장에 붙었다');
      }
    }
  }
  if (!f.res.tip && f.t === IGN + f.asc + HOLD) ev(s, s.parts.includes('chute') ? 'chute' : 'fall', 0.5, 0.4);
  if (!f.res.tip && f.t === IGN + f.asc + HOLD + DESC) ev(s, s.parts.includes('chute') ? 'softland' : 'splash', PAD_X, PAD_Y);
  if (f.t >= flTotal(f)) endFlight(s);
}

// ───────────────────────────── 톡 ─────────────────────────────
type Hit = { t: 'card'; i: number } | { t: 'launch' } | null;
function hitTest(_s: RocketState, x: number, y: number): Hit {
  for (let i = 0; i < 3; i++) if (Math.abs(x - CARD_X[i]) <= CARD_W / 2 + 0.012 && Math.abs(y - CARD_Y) <= CARD_H / 2 + 0.012) return { t: 'card', i };
  if (Math.abs(x - BTN_X) <= BTN_W / 2 + 0.01 && Math.abs(y - BTN_Y) <= BTN_H / 2 + 0.012) return { t: 'launch' };
  return null;
}
function attach(s: RocketState, i: number) {
  const c = s.hand[i];
  const why = canAttach(s, c.k);
  if (why) {
    c.shake = s.t;
    ev(s, 'nope', CARD_X[i], CARD_Y, 0, why === 'full' ? '칸이 다 찼어요 — 발사!' : '마지막 칸은 엔진!');
    return;
  }
  s.parts.push(c.k);
  s.attachT = s.t;
  s.lastPart = s.parts.length - 1;
  see(s, c.k);
  ev(s, 'attach', CARD_X[i], CARD_Y, i, c.k);
  if (P[c.k].thr > 0 && !s.firstEngine) {
    s.firstEngine = true;
    if (s.stage === 0 && !s.again) wow(s, '부릉! 엔진 철컥!');
  }
  // 새 손패 셋
  newHand(s, false);
}
function tap(s: RocketState, h: Hit) {
  if (!h) return;
  if (h.t === 'card') return attach(s, h.i);
  launch(s);
}

const game: GameDef<RocketState> & { wows(s: RocketState): number } = {
  id: 'rocketlab',
  name: '🚀 꼬마 로켓 조립 발사',
  genes: ['buildlaunch', 'pushluck'],
  twist: "발사하면 진짜 물리로 날아간다 — 연료를 다 쓴 단이 '퉁' 떨어져 나가며 구름·새 떼·오로라를 지나 우주로, 너무 무거우면 픽 쓰러져 데굴데굴, 한쪽만 무거우면 빙글빙글",
  rules: [
    '부품 카드를 톡 하면 로켓에 철컥! 다 되면 발사!를 톡 — 비행은 저절로 펼쳐져요.',
    "엔진은 힘, 연료통은 연료 — 무거우면 못 떠요. 옆의 '여기까지' 선이 지금 쏘면 갈 높이예요.",
    '목표 높이에 못 닿으면 하트 -1(그 판 다시). 붙일 수 있는 칸은 판마다 정해져 있어요.',
  ],
  controls: 'touch',
  hint: '카드 톡 = 붙이기 · 발사! 톡 / 화살표로 고르고 스페이스(1·2·3 = 카드)',
  aspect: A,
  art: {
    concept: '햇살 가득한 언덕 위 장난감 발사장 — 빨강·하양 발사탑, 구경 온 동물들, 손그림 그림책 같은 꼬마 로켓과 고양이 우주인',
    mood: '연둣빛 언덕 위 둥근 발사대에서 고양이 우주인이 캡슐 창으로 손을 흔든다. 부품을 붙일 때마다 철컥! 로켓이 자라고, 발사하면 하얀 연기 구름이 피어오르며 하늘색 → 남색 → 별빛 우주로. 빈 단은 퉁 떨어지고, 낙하산이 둥실 펴진다.',
    palette: { bg: '#8fd3ff', ink: '#2a2440', muted: '#6a7a9a', accent: '#ffcf3a', hot: '#ff5a3a', soft: '#fff6dc' },
  },
  guard: (s) => s.hearts,
  cleared: (s) => (s.phase === 'result' && s.ok ? { stage: s.stage, got: s.got, of: s.starOk.length } : null),
  reveals: (s) => s.seen.size,
  wows: (s) => s.wowN,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'build', pt: 0,
      hearts: 3, stars: 0, got: 0, starOk: [false], pts: 0,
      parts: [], hand: [], attachT: -999, lastPart: -1,
      ok: false, why: '', won: false, dead: false, again: false, tries: 0, launches: 0,
      fl: null, best: 0,
      down: false, firstTap: -1, firstBig: -1, wowN: 0, firstEngine: false,
      seen: new Set<string>(), banner: null, spot: null, events: [], bigText: '', bigT: -999,
    } as unknown as RocketState;
    newStage(s);
    s.banner = null;
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    const p = inp.pointer ?? null;
    const fresh = !!p && !s.down;
    s.down = !!p;
    if (s.phase === 'build') {
      let h: Hit = null, any = false;
      if (inp.pick !== undefined && inp.pick >= 0 && inp.pick < 3) (h = { t: 'card', i: inp.pick }), (any = true);
      else if (fresh) (h = hitTest(s, p!.x, p!.y * A)), (any = true);
      if (any && h) {
        if (s.firstTap < 0) s.firstTap = s.t;
        tap(s, h);
      }
      s.pt++;
    } else if (s.phase === 'fly') flyTick(s);
    else {
      s.pt++;
      const T = s.ok ? RESULT_OK : RESULT_FAIL;
      if (s.pt >= T || (fresh && s.pt > 50)) {
        if (s.ok) {
          if (s.won) s.dead = true;
          else (s.again = false), s.stage++, newStage(s);
        } else if (s.hearts <= 0) s.dead = true;
        else (s.again = true), newStage(s);
      }
    }
    if (s.events.length > 60) s.events = s.events.filter((e) => s.t - e.t < 120);
    if (s.spot && s.t - s.spot.t > 240) s.spot = null;
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};
export const rocketlab = game;

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
const at = (x: number, y: number): Input => ({ tap: false, dir: 0, pointer: { x, y: y / A } });
const tapCard = (i: number) => at(CARD_X[i], CARD_Y);
const tapLaunch = () => at(BTN_X, BTN_Y);

/** 지금 이대로 쏘면 얻는 값 (바람 다섯 갈래 평균): 깨면 1000 + 별, 못 깨면 하트 하나 값만큼 손해 */
const valMem = new Map<string, number>();
const WINDS = [-1, -0.33, 0.33, 1];
function launchValue(st: number, parts: PK[]): number {
  if (!hasEngine(parts)) return -5000;
  const key = canonKey(st, parts);
  const m = valMem.get(key);
  if (m !== undefined) return m;
  const d = STAGES[st];
  const ws = d.wind ? WINDS : [0];
  let cap = d.goal;
  for (const q of d.stars) if (q.k === 'high') cap = Math.max(cap, q.n);
  if (parts.includes('mag')) cap = d.goal + DOCK_BAND + 50;
  let sum = 0;
  for (const w of ws) {
    const r = fly(parts, st, w, false, cap + 10);
    if (r.tip || r.apex < d.goal) {
      sum += -900 + 300 * Math.min(1, r.apex / d.goal);
      continue;
    }
    let stars = 0;
    for (const q of d.stars) {
      const ok = q.k === 'reach' ? true : q.k === 'parts' ? parts.length <= q.n : q.k === 'high' ? r.apex >= q.n : q.k === 'chute' ? parts.includes('chute') : q.k === 'drop' ? r.drops > 0 : q.k === 'dock' ? parts.includes('mag') && docked(st, r.apex) : r.bonks === 0;
      if (ok) stars++;
    }
    sum += 1000 + stars * 320;
  }
  const v = sum / ws.length;
  if (valMem.size > 80000) valMem.clear();
  valMem.set(key, v);
  return v;
}
/** 끝자리 어림: 칸이 남았으면 '아무 카드나 하나 더 온다면' 가장 좋은 것의 값 (조금 깎아서) */
const hopeMem = new Map<string, number>();
function hope(st: number, parts: PK[]): number {
  const key = canonKey(st, parts);
  const m = hopeMem.get(key);
  if (m !== undefined) return m;
  const d = STAGES[st];
  let best = launchValue(st, parts);
  if (d.slots > parts.length)
    for (const [k] of d.pool) {
      if (d.slots - parts.length === 1 && !hasEngine(parts) && !(P[k].thr > 0)) continue;
      best = Math.max(best, launchValue(st, [...parts, k]) - 160);
    }
  if (hopeMem.size > 80000) hopeMem.clear();
  hopeMem.set(key, best);
  return best;
}
/** 앞을 내다보기: 카드 하나를 붙이면 새 손패 셋이 온다 — 나올 법한 손패 몇 개로 기대값 (같은 처지는 같은 답: 기억) */
const HANDS = 5;
const hvMem = new Map<string, number>();
function after(st: number, np: PK[], depth: number): number {
  const d = STAGES[st];
  if (depth <= 0 || d.slots <= np.length) return hope(st, np);
  const key = `${canonKey(st, np)}#${depth}`;
  const m = hvMem.get(key);
  if (m !== undefined) return m;
  const r = mulberry32(hashString(key));
  let v = 0;
  for (let j = 0; j < HANDS; j++) v += handValue(st, np, deal(r, st, np), depth - 1);
  v /= HANDS;
  if (hvMem.size > 80000) hvMem.clear();
  hvMem.set(key, v);
  return v;
}
function handValue(st: number, parts: PK[], hand: PK[], depth: number): number {
  let best = hasEngine(parts) ? launchValue(st, parts) : -1e9;
  const d = STAGES[st];
  if (d.slots <= parts.length) return best;
  const tried = new Set<PK>();
  for (const k of hand) {
    if (tried.has(k)) continue;
    tried.add(k);
    if (canAttach({ stage: st, parts }, k)) continue;
    const v = after(st, [...parts, k], depth);
    if (v > best) best = v;
  }
  return best;
}
interface Plan { act: number; v: number }
const planMem = new Map<string, Plan>();
function makePlan(s: RocketState): Plan {
  const key = `${canonKey(s.stage, s.parts)}|${s.parts.length}|${s.hand.map((c) => c.k).join(',')}`;
  const mem = planMem.get(key);
  if (mem) return mem;
  const d = STAGES[s.stage];
  let best: Plan = { act: -1, v: hasEngine(s.parts) ? launchValue(s.stage, s.parts) : -1e9 };
  for (let i = 0; i < 3; i++) {
    const k = s.hand[i].k;
    if (canAttach(s, k)) continue;
    const np = [...s.parts, k];
    const v = d.slots <= np.length ? launchValue(s.stage, np) : after(s.stage, np, d.slots - np.length >= 3 ? 3 : 2);
    if (v > best.v + 1) best = { act: i, v };
  }
  if (planMem.size > 40000) planMem.clear();
  planMem.set(key, best);
  return best;
}
const tapMem = new WeakMap<object, number>();
/** 잘하는 봇: 붙일 카드마다 다음 카드까지 비행을 시뮬레이션해 보고(바람 다섯 갈래) 가장 좋은 쪽 — 쏘는 게 낫다면 쏜다 */
export const rocketlabSmart: Bot<RocketState> = {
  name: '비행을 미리 날려 보고 고르기',
  act(s) {
    if (s.phase !== 'build' || s.down) return NO;
    if (s.t - s.attachT < ATTACH_T) return NO;
    const last = tapMem.get(s) ?? -99;
    if (s.t - last < 4) return NO;
    tapMem.set(s, s.t);
    const pl = makePlan(s);
    return pl.act >= 0 ? tapCard(pl.act) : tapLaunch();
  },
};

const dumbMem = new WeakMap<object, { next: number; down: boolean; x: number; y: number }>();
/** 못하는 봇: 아무 때나 아무 데나 톡 */
export const rocketlabRandom: Bot<RocketState> = {
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
function habitTap(s: RocketState, f: () => Input): Input {
  if (s.phase !== 'build' || s.down) return NO;
  if (s.t - s.attachT < ATTACH_T) return NO;
  const last = habitMem.get(s) ?? -99;
  if (s.t - last < 4) return NO;
  habitMem.set(s, s.t);
  return f();
}
/** 버릇 봇: 늘 힘이 가장 센 카드를 붙이고, 선이 목표에 닿거나 칸이 차면 쏜다 */
export const rocketlabHabit: Bot<RocketState> = {
  name: '늘 힘센 카드만',
  act(s) {
    return habitTap(s, () => {
      if (hasEngine(s.parts) && (slotsLeft(s) <= 0 || predict(s.parts, s.stage).apex >= STAGES[s.stage].goal)) return tapLaunch();
      let bi = -1, bv = -1;
      for (let i = 0; i < 3; i++) {
        const k = s.hand[i].k;
        if (canAttach(s, k)) continue;
        if (P[k].thr > bv) (bv = P[k].thr), (bi = i);
      }
      return bi >= 0 ? tapCard(bi) : tapLaunch();
    });
  },
};
/** 독립 버릇 봇: 선을 가장 많이 올리는 카드로 세 장 붙이면 바로 쏜다 */
export const rocketlabHabit2: Bot<RocketState> = {
  name: '세 장 붙이면 바로 발사',
  act(s) {
    return habitTap(s, () => {
      if (s.parts.length >= 3 || slotsLeft(s) <= 0) return tapLaunch();
      let bi = -1, bv = -1e9;
      for (let i = 0; i < 3; i++) {
        const k = s.hand[i].k;
        if (canAttach(s, k)) continue;
        const p = predict([...s.parts, k], s.stage);
        const v = p.tip ? -1 : p.apex;
        if (v > bv) (bv = v), (bi = i);
      }
      return bi >= 0 ? tapCard(bi) : tapLaunch();
    });
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
const ease = (u: number) => 1 - (1 - clamp(u, 0, 1)) ** 2;
const easeIO = (u: number) => {
  const v = clamp(u, 0, 1);
  return v < 0.5 ? 2 * v * v : 1 - (-2 * v + 2) ** 2 / 2;
};
const OUT = '#3b2a4e';
const fmt = (m: number) => Math.round(m).toLocaleString('en-US');
function txt(ctx: C2, s: string, x: number, y: number, fill: string, stroke = 'rgba(40,20,60,.75)', lw = 3, maxW?: number) {
  ctx.lineJoin = 'round';
  ctx.lineWidth = lw;
  ctx.strokeStyle = stroke;
  if (maxW) ctx.strokeText(s, x, y, maxW);
  else ctx.strokeText(s, x, y);
  ctx.fillStyle = fill;
  if (maxW) ctx.fillText(s, x, y, maxW);
  else ctx.fillText(s, x, y);
}
function mix(a: string, b: string, u: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const q = clamp(u, 0, 1);
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * q)).join(',')})`;
}

// ── 하늘 색: 판마다 목표 높이에서 그 판의 하늘 (구름 섬은 낮 → 달 정거장은 별빛 우주) ──
const SKY: [string, string][] = [
  ['#62c6ff', '#dff5ff'],
  ['#4fb4fa', '#bfe8ff'],
  ['#3c94ec', '#94d0ff'],
  ['#2c6ad0', '#6aa8f0'],
  ['#1f3f9e', '#4a74cc'],
  ['#141f62', '#2e3f8e'],
  ['#080c30', '#18215a'],
];
const lvl = (st: number, alt: number) => (STAGES[st].sky * Math.max(0, alt)) / STAGES[st].goal;
function skyAt(level: number): [string, string] {
  const q = clamp(level, 0, SKY.length - 1), i = Math.min(SKY.length - 2, Math.floor(q)), u = q - i;
  return [mix(SKY[i][0], SKY[i + 1][0], u), mix(SKY[i][1], SKY[i + 1][1], u)];
}
// ── 배경 그림 (크기마다 한 번) ──
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
/** 먼 산 (투명 위) */
function getHills(w: number, sc: number) {
  const key = `hills${w}@${sc}`;
  const hit = BG.get(key);
  if (hit) return hit;
  const R = (v: number) => v * w, H = R(1.05);
  const c = layer(w, H, sc, (g) => {
    for (const [yy, col, amp, ph, f] of [[0.66, '#b9dcf2', 0.05, 1, 5], [0.7, '#9fd29a', 0.035, 3, 7], [0.745, '#86c97a', 0.028, 6, 9]] as [number, string, number, number, number][]) {
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(0, H);
      for (let x = 0; x <= 1.001; x += 0.01) g.lineTo(R(x), R(yy - amp * Math.abs(Math.sin(x * f + ph)) - amp * 0.5 * Math.sin(x * f * 2.3 + ph)));
      g.lineTo(w, H);
      g.closePath();
      g.fill();
    }
    // 먼 나무
    for (let i = 0; i < 14; i++) {
      const tx = R(0.02 + i * 0.075 + hsh(i + 20) * 0.03), ty = R(0.755 + hsh(i + 21) * 0.02), tr = R(0.018 + hsh(i + 22) * 0.012);
      g.fillStyle = '#6a4a2a';
      g.fillRect(tx - tr * 0.12, ty - tr * 0.3, tr * 0.24, tr * 0.5);
      g.fillStyle = i % 3 ? '#4fa24a' : '#5cb450';
      ell(g, tx, ty - tr * 0.9, tr * 0.8, tr);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,.18)';
      ell(g, tx - tr * 0.3, ty - tr * 1.2, tr * 0.3, tr * 0.35);
      g.fill();
    }
  });
  BG.set(key, c);
  return c;
}
/** 발사장 땅 (언덕·발사대·발사탑 기둥·건초·관제실) — 투명 위 */
function getGround(w: number, sc: number) {
  const key = `ground${w}@${sc}`;
  const hit = BG.get(key);
  if (hit) return hit;
  const R = (v: number) => v * w, H = R(1.05);
  const c = layer(w, H, sc, (g) => {
    // 풀밭 언덕
    g.fillStyle = lin(g, 0, R(0.77), 0, R(1.02), [0, '#9de06a'], [0.45, '#7fd055'], [1, '#5fb540']);
    g.beginPath();
    g.moveTo(0, H);
    g.lineTo(0, R(0.8));
    g.bezierCurveTo(R(0.25), R(0.765), R(0.6), R(0.79), R(1), R(0.775));
    g.lineTo(w, H);
    g.closePath();
    g.fill();
    // 풀 줄무늬
    g.strokeStyle = 'rgba(255,255,255,.14)';
    g.lineWidth = R(0.02);
    for (let i = 0; i < 6; i++) {
      g.beginPath();
      g.moveTo(R(-0.1 + i * 0.22), H);
      g.quadraticCurveTo(R(0.05 + i * 0.2), R(0.88), R(0.15 + i * 0.18), R(0.79));
      g.stroke();
    }
    // 풀 송이·꽃
    for (let i = 0; i < 40; i++) {
      const x = R(hsh(i + 70)), y = R(0.8 + hsh(i + 71) * 0.2), k = R(0.008 + hsh(i + 72) * 0.006);
      g.strokeStyle = 'rgba(60,140,40,.6)';
      g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(x - k, y);
      g.lineTo(x - k * 0.3, y - k * 1.6);
      g.moveTo(x, y);
      g.lineTo(x + k * 0.2, y - k * 2);
      g.moveTo(x + k, y);
      g.lineTo(x + k * 0.6, y - k * 1.5);
      g.stroke();
      if (i % 4 === 0) {
        g.fillStyle = ['#fff', '#ffd84a', '#ff9ac0', '#c8a8ff'][i % 16 >> 2];
        for (let q = 0; q < 5; q++) {
          ell(g, x + Math.cos((q * TAU) / 5) * k * 0.6, y - k * 2 + Math.sin((q * TAU) / 5) * k * 0.6, k * 0.45, k * 0.45);
          g.fill();
        }
        g.fillStyle = '#ffb020';
        ell(g, x, y - k * 2, k * 0.35, k * 0.35);
        g.fill();
      }
    }
    // 흙길
    g.fillStyle = 'rgba(210,170,110,.55)';
    g.beginPath();
    g.moveTo(R(PAD_X - 0.08), R(PAD_Y + 0.03));
    g.quadraticCurveTo(R(PAD_X + 0.05), R(0.97), R(0.62), H);
    g.lineTo(R(0.82), H);
    g.quadraticCurveTo(R(PAD_X + 0.2), R(0.96), R(PAD_X + 0.12), R(PAD_Y + 0.03));
    g.closePath();
    g.fill();
    // 관제실 (오른쪽 뒤)
    const hx = R(0.68), hy = R(0.8);
    g.fillStyle = 'rgba(40,80,30,.25)';
    ell(g, hx + R(0.05), hy + R(0.005), R(0.08), R(0.014));
    g.fill();
    g.fillStyle = lin(g, hx, 0, hx + R(0.1), 0, [0, '#f2efe6'], [1, '#d8d2c4']);
    g.fillRect(hx, hy - R(0.06), R(0.1), R(0.06));
    g.fillStyle = '#c84a3a';
    g.beginPath();
    g.moveTo(hx - R(0.012), hy - R(0.058));
    g.lineTo(hx + R(0.05), hy - R(0.09));
    g.lineTo(hx + R(0.112), hy - R(0.058));
    g.closePath();
    g.fill();
    g.fillStyle = '#7ac8f0';
    g.fillRect(hx + R(0.015), hy - R(0.048), R(0.028), R(0.022));
    g.fillRect(hx + R(0.057), hy - R(0.048), R(0.028), R(0.022));
    g.strokeStyle = '#8a8070';
    g.lineWidth = 1;
    g.strokeRect(hx, hy - R(0.06), R(0.1), R(0.06));
    // 접시 안테나
    g.strokeStyle = '#8a8a98';
    g.lineWidth = R(0.005);
    g.beginPath();
    g.moveTo(hx + R(0.08), hy - R(0.075));
    g.lineTo(hx + R(0.085), hy - R(0.1));
    g.stroke();
    g.fillStyle = lin(g, 0, hy - R(0.13), 0, hy - R(0.095), [0, '#ffffff'], [1, '#b8bcc8']);
    ell(g, hx + R(0.088), hy - R(0.108), R(0.022), R(0.012), -0.5);
    g.fill();
    // 발사대 (둥근 판 + 두께 + 노랑·검정 띠)
    const px = R(PAD_X), py = R(PAD_Y), prx = R(0.2), pry = R(0.045), th = R(0.03);
    g.fillStyle = 'rgba(30,60,20,.3)';
    ell(g, px + R(0.01), py + th + R(0.012), prx * 1.06, pry * 1.15);
    g.fill();
    g.fillStyle = lin(g, px - prx, 0, px + prx, 0, [0, '#6e7488'], [0.4, '#a8aec0'], [1, '#5e6478']);
    g.beginPath();
    g.ellipse(px, py, prx, pry, 0, 0, Math.PI);
    g.lineTo(px - prx, py + th);
    g.ellipse(px, py + th, prx, pry, 0, Math.PI, 0, true);
    g.closePath();
    g.fill();
    // 띠
    g.save();
    g.beginPath();
    g.ellipse(px, py, prx, pry, 0, 0, Math.PI);
    g.lineTo(px - prx, py + th * 0.55);
    g.ellipse(px, py + th * 0.55, prx, pry, 0, Math.PI, 0, true);
    g.closePath();
    g.clip();
    for (let i = -12; i < 12; i++) {
      g.fillStyle = i % 2 ? '#2a2a34' : '#ffcc2a';
      g.beginPath();
      g.moveTo(px + i * R(0.022), py - pry);
      g.lineTo(px + (i + 1) * R(0.022), py - pry);
      g.lineTo(px + (i + 1) * R(0.022) - R(0.02), py + th + pry);
      g.lineTo(px + i * R(0.022) - R(0.02), py + th + pry);
      g.closePath();
      g.fill();
    }
    g.restore();
    g.fillStyle = lin(g, 0, py - pry, 0, py + pry, [0, '#e6e9f2'], [1, '#b4bacb']);
    ell(g, px, py, prx, pry);
    g.fill();
    g.strokeStyle = 'rgba(80,90,110,.5)';
    g.lineWidth = 1.5;
    ell(g, px, py, prx * 0.72, pry * 0.72);
    g.stroke();
    g.fillStyle = 'rgba(60,64,80,.55)';
    ell(g, px, py + R(0.004), R(0.075), R(0.016));
    g.fill();
    g.fillStyle = '#ffd84a';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      ell(g, px + Math.cos(a) * prx * 0.86, py + Math.sin(a) * pry * 0.86, R(0.006), R(0.003));
      g.fill();
    }
    // 나무 울타리 + 깃발 줄 (구경꾼 자리)
    for (const [x0, x1] of [[-0.02, 0.27], [0.76, 1.02]] as [number, number][]) {
      const fy = R(0.93);
      g.fillStyle = 'rgba(40,70,20,.22)';
      g.fillRect(R(x0), fy + R(0.012), R(x1 - x0), R(0.01));
      for (let x = x0; x <= x1; x += 0.045) {
        g.fillStyle = lin(g, R(x), 0, R(x + 0.016), 0, [0, '#c89058'], [1, '#9a6a3a']);
        g.fillRect(R(x), fy - R(0.05), R(0.016), R(0.062));
        g.beginPath();
        g.moveTo(R(x), fy - R(0.05));
        g.lineTo(R(x + 0.008), fy - R(0.06));
        g.lineTo(R(x + 0.016), fy - R(0.05));
        g.fill();
      }
      g.fillStyle = '#d8a46a';
      g.fillRect(R(x0), fy - R(0.038), R(x1 - x0), R(0.011));
      g.fillRect(R(x0), fy - R(0.014), R(x1 - x0), R(0.011));
      // 깃발 줄
      g.strokeStyle = 'rgba(90,60,30,.7)';
      g.lineWidth = 1;
      g.beginPath();
      for (let x = x0; x <= x1 + 0.001; x += 0.02) {
        const y = fy - R(0.075) + Math.sin(((x - x0) / (x1 - x0)) * Math.PI) * R(0.02);
        x === x0 ? g.moveTo(R(x), y) : g.lineTo(R(x), y);
      }
      g.stroke();
      const cols = ['#ff5a5a', '#ffd23a', '#3d9df5', '#5ad04a', '#ff9ac0'];
      let i = 0;
      for (let x = x0 + 0.02; x < x1 - 0.01; x += 0.04, i++) {
        const y = fy - R(0.075) + Math.sin(((x - x0) / (x1 - x0)) * Math.PI) * R(0.02);
        g.fillStyle = cols[i % 5];
        g.beginPath();
        g.moveTo(R(x - 0.014), y);
        g.lineTo(R(x + 0.014), y);
        g.lineTo(R(x), y + R(0.03));
        g.closePath();
        g.fill();
      }
    }
    // 건초 더미 (낙하산 없이 떨어지면 여기로)
    const bx = R(0.7), by = R(0.955);
    g.fillStyle = 'rgba(40,70,20,.3)';
    ell(g, bx, by + R(0.012), R(0.085), R(0.02));
    g.fill();
    g.fillStyle = lin(g, 0, by - R(0.07), 0, by + R(0.01), [0, '#ffe58a'], [1, '#d8a83a']);
    g.beginPath();
    g.moveTo(bx - R(0.08), by + R(0.008));
    g.bezierCurveTo(bx - R(0.085), by - R(0.06), bx - R(0.03), by - R(0.085), bx, by - R(0.08));
    g.bezierCurveTo(bx + R(0.04), by - R(0.085), bx + R(0.085), by - R(0.06), bx + R(0.08), by + R(0.008));
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(160,110,30,.7)';
    g.lineWidth = 1;
    for (let i = 0; i < 22; i++) {
      const sx = bx + R((hsh(i + 90) - 0.5) * 0.14), sy = by - R(hsh(i + 91) * 0.07);
      g.beginPath();
      g.moveTo(sx, sy);
      g.lineTo(sx + R((hsh(i + 92) - 0.5) * 0.03), sy - R(0.012));
      g.stroke();
    }
  });
  BG.set(key, c);
  return c;
}
/** 아래 판 (나무 책상) */
function getPanel(w: number, sc: number) {
  const key = `panel${w}@${sc}`;
  const hit = BG.get(key);
  if (hit) return hit;
  const R = (v: number) => v * w, H = R(0.5);
  const c = layer(w, H, sc, (g) => {
    g.fillStyle = lin(g, 0, 0, 0, H, [0, '#ffd99a'], [0.08, '#f4bf74'], [1, '#d99a52']);
    g.fillRect(0, 0, w, H);
    g.strokeStyle = 'rgba(150,90,30,.18)';
    g.lineWidth = 1.2;
    for (let i = 0; i < 14; i++) {
      const y = R(0.03 + i * 0.035 + hsh(i) * 0.01);
      g.beginPath();
      g.moveTo(0, y);
      for (let x = 0; x <= 1.001; x += 0.05) g.lineTo(R(x), y + Math.sin(x * 9 + i) * R(0.004));
      g.stroke();
    }
    g.fillStyle = 'rgba(120,60,10,.35)';
    g.fillRect(0, 0, w, R(0.012));
    g.fillStyle = 'rgba(255,255,255,.35)';
    g.fillRect(0, R(0.012), w, R(0.004));
    // 나사
    for (const x of [0.02, 0.98]) {
      for (const y of [0.04, 0.46]) {
        g.fillStyle = lin(g, 0, R(y) - 3, 0, R(y) + 3, [0, '#fff6dc'], [1, '#a8783a']);
        ell(g, R(x), R(y), R(0.009), R(0.009));
        g.fill();
      }
    }
  });
  BG.set(key, c);
  return c;
}

// ── 고양이 우주인 ──
type Mood = 'idle' | 'happy' | 'wow' | 'scared' | 'dizzy' | 'proud' | 'sad';
function drawCat(ctx: C2, x: number, y: number, r: number, mood: Mood, t: number, wave = 0) {
  ctx.save();
  ctx.translate(x, y);
  // 귀
  for (const sd of [-1, 1]) {
    ctx.fillStyle = '#ff9a3a';
    ctx.beginPath();
    ctx.moveTo(sd * r * 0.85, -r * 0.35);
    ctx.lineTo(sd * r * 0.78, -r * 1.12);
    ctx.lineTo(sd * r * 0.22, -r * 0.82);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = Math.max(1, r * 0.08);
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.fillStyle = '#ffc8c8';
    ctx.beginPath();
    ctx.moveTo(sd * r * 0.72, -r * 0.48);
    ctx.lineTo(sd * r * 0.7, -r * 0.95);
    ctx.lineTo(sd * r * 0.36, -r * 0.78);
    ctx.closePath();
    ctx.fill();
  }
  // 머리
  ctx.fillStyle = radg(ctx, -r * 0.25, -r * 0.35, 0, r * 1.3, [0, '#ffd08a'], [0.6, '#ffa548'], [1, '#f08a2a']);
  ell(ctx, 0, 0, r, r * 0.9);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1.2, r * 0.08);
  ctx.stroke();
  // 이마 줄무늬
  ctx.strokeStyle = '#d0661a';
  ctx.lineWidth = Math.max(1, r * 0.1);
  ctx.lineCap = 'round';
  for (const dx of [-0.25, 0, 0.25]) {
    ctx.beginPath();
    ctx.moveTo(dx * r, -r * 0.85);
    ctx.lineTo(dx * r * 0.8, -r * 0.55);
    ctx.stroke();
  }
  // 볼 (흰 주둥이)
  ctx.fillStyle = '#fff6ea';
  ell(ctx, -r * 0.24, r * 0.38, r * 0.33, r * 0.27);
  ctx.fill();
  ell(ctx, r * 0.24, r * 0.38, r * 0.33, r * 0.27);
  ctx.fill();
  // 볼터치
  ctx.fillStyle = 'rgba(255,110,120,.45)';
  ell(ctx, -r * 0.62, r * 0.25, r * 0.15, r * 0.1);
  ctx.fill();
  ell(ctx, r * 0.62, r * 0.25, r * 0.15, r * 0.1);
  ctx.fill();
  // 눈
  const blink = mood === 'idle' && Math.floor(t / 7) % 31 === 0;
  ctx.strokeStyle = '#2a1a2a';
  ctx.fillStyle = '#2a1a2a';
  ctx.lineWidth = Math.max(1.2, r * 0.1);
  for (const sd of [-1, 1]) {
    const ex = sd * r * 0.38, ey = -r * 0.1;
    if (mood === 'dizzy') {
      ctx.beginPath();
      for (let a = 0; a < 4 * Math.PI; a += 0.3) {
        const q = (a / (4 * Math.PI)) * r * 0.2;
        const px = ex + Math.cos(a + t * 0.3 * sd) * q, py = ey + Math.sin(a + t * 0.3 * sd) * q;
        a ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.stroke();
    } else if (mood === 'happy' || mood === 'proud' || blink) {
      ctx.beginPath();
      ctx.arc(ex, ey + r * 0.06, r * 0.16, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else if (mood === 'sad') {
      ctx.beginPath();
      ctx.moveTo(ex - r * 0.14, ey - r * 0.02);
      ctx.lineTo(ex + r * 0.14, ey + r * 0.04 * sd);
      ctx.stroke();
      ell(ctx, ex, ey + r * 0.08, r * 0.08, r * 0.1);
      ctx.fill();
    } else {
      const big = mood === 'wow' || mood === 'scared' ? 1.25 : 1;
      ell(ctx, ex, ey, r * 0.13 * big, r * 0.17 * big);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ell(ctx, ex - r * 0.04, ey - r * 0.06, r * 0.05 * big, r * 0.06 * big);
      ctx.fill();
      ctx.fillStyle = '#2a1a2a';
    }
  }
  if (mood === 'scared') {
    ctx.fillStyle = '#7ad0ff';
    ell(ctx, r * 0.78, -r * 0.42, r * 0.1, r * 0.16);
    ctx.fill();
  }
  // 코 · 입
  ctx.fillStyle = '#ff7a8a';
  ctx.beginPath();
  ctx.moveTo(-r * 0.09, r * 0.2);
  ctx.lineTo(r * 0.09, r * 0.2);
  ctx.lineTo(0, r * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#2a1a2a';
  ctx.lineWidth = Math.max(1, r * 0.07);
  if (mood === 'wow' || mood === 'scared') {
    ctx.fillStyle = '#7a2a3a';
    ell(ctx, 0, r * 0.5, r * 0.12, r * 0.15);
    ctx.fill();
  } else if (mood === 'sad') {
    ctx.beginPath();
    ctx.arc(0, r * 0.58, r * 0.14, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(-r * 0.2, r * 0.36);
    ctx.quadraticCurveTo(-r * 0.1, r * (mood === 'happy' || mood === 'proud' ? 0.52 : 0.45), 0, r * 0.32);
    ctx.quadraticCurveTo(r * 0.1, r * (mood === 'happy' || mood === 'proud' ? 0.52 : 0.45), r * 0.2, r * 0.36);
    ctx.stroke();
  }
  // 수염
  ctx.strokeStyle = 'rgba(60,40,40,.55)';
  ctx.lineWidth = 1;
  for (const sd of [-1, 1])
    for (const dy of [0.28, 0.4]) {
      ctx.beginPath();
      ctx.moveTo(sd * r * 0.5, r * dy);
      ctx.lineTo(sd * r * 1.02, r * (dy - 0.06 + (dy - 0.34) * 0.6));
      ctx.stroke();
    }
  // 손 흔들기
  if (wave > 0) {
    const a = Math.sin(t * 0.35) * 0.5;
    ctx.save();
    ctx.translate(r * 0.95, r * 0.55);
    ctx.rotate(-0.9 + a);
    ctx.fillStyle = '#ffb060';
    ell(ctx, 0, -r * 0.45 * wave, r * 0.2, r * 0.28);
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = Math.max(1, r * 0.07);
    ctx.stroke();
    ctx.fillStyle = '#ffc8c8';
    ell(ctx, 0, -r * 0.5 * wave, r * 0.08, r * 0.07);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

// ── 로켓 부품 ──
/** 원통 몸통: 아래 y(yb)에서 위로 h. 3/4 시점이라 윗면 타원이 보인다 */
function cyl(ctx: C2, cx: number, yb: number, wd: number, h: number, dark: string, mid: string, light: string, rim = true) {
  const x0 = cx - wd / 2, ry = wd * 0.13;
  ctx.fillStyle = lin(ctx, x0, 0, x0 + wd, 0, [0, dark], [0.28, light], [0.55, mid], [0.88, dark], [1, dark]);
  ctx.beginPath();
  ctx.moveTo(x0, yb - h);
  ctx.lineTo(x0, yb);
  ctx.ellipse(cx, yb, wd / 2, ry, 0, Math.PI, 0, true);
  ctx.lineTo(x0 + wd, yb - h);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  if (rim) {
    ctx.fillStyle = lin(ctx, x0, 0, x0 + wd, 0, [0, mid], [0.4, '#ffffff'], [1, mid]);
    ell(ctx, cx, yb - h, wd / 2, ry);
    ctx.fill();
    ctx.stroke();
  }
}
function band(ctx: C2, cx: number, y: number, wd: number, hh: number, col: string, dark: string) {
  const x0 = cx - wd / 2, ry = wd * 0.13;
  ctx.fillStyle = lin(ctx, x0, 0, x0 + wd, 0, [0, dark], [0.3, col], [0.85, dark]);
  ctx.beginPath();
  ctx.ellipse(cx, y - hh, wd / 2, ry, 0, Math.PI, 0, true);
  ctx.lineTo(x0 + wd, y);
  ctx.ellipse(cx, y, wd / 2, ry, 0, 0, Math.PI);
  ctx.closePath();
  ctx.fill();
}
function nozzle(ctx: C2, cx: number, yt: number, wt: number, wb: number, h: number) {
  ctx.fillStyle = lin(ctx, cx - wb / 2, 0, cx + wb / 2, 0, [0, '#2a2a36'], [0.35, '#8a8ea0'], [0.6, '#4a4e60'], [1, '#22222c']);
  ctx.beginPath();
  ctx.moveTo(cx - wt / 2, yt);
  ctx.quadraticCurveTo(cx - wt / 2, yt + h * 0.6, cx - wb / 2, yt + h);
  ctx.lineTo(cx + wb / 2, yt + h);
  ctx.quadraticCurveTo(cx + wt / 2, yt + h * 0.6, cx + wt / 2, yt);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = '#1a1420';
  ell(ctx, cx, yt + h, wb / 2, wb * 0.12);
  ctx.fill();
}
function flame(ctx: C2, cx: number, y: number, wd: number, len: number, t: number, seed: number) {
  if (len <= 0) return;
  const f = 0.85 + 0.15 * Math.sin(t * 1.7 + seed) + 0.08 * Math.sin(t * 3.1 + seed * 2);
  const L = len * f;
  const tongue = (ww: number, ll: number, fill: string | CanvasGradient) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(cx - ww / 2, y);
    ctx.bezierCurveTo(cx - ww * 0.75, y + ll * 0.35, cx - ww * 0.2, y + ll * 0.75, cx + Math.sin(t * 0.9 + seed) * ww * 0.15, y + ll);
    ctx.bezierCurveTo(cx + ww * 0.2, y + ll * 0.75, cx + ww * 0.75, y + ll * 0.35, cx + ww / 2, y);
    ctx.closePath();
    ctx.fill();
  };
  ctx.save();
  ctx.fillStyle = radg(ctx, cx, y + L * 0.3, 0, L * 0.9, [0, 'rgba(255,200,80,.45)'], [1, 'rgba(255,160,60,0)']);
  ell(ctx, cx, y + L * 0.35, wd * 1.4, L * 0.7);
  ctx.fill();
  tongue(wd * 1.05, L, lin(ctx, 0, y, 0, y + L, [0, '#ff9a2a'], [0.6, '#ff5a1a'], [1, 'rgba(255,60,20,0)']));
  tongue(wd * 0.72, L * 0.7, lin(ctx, 0, y, 0, y + L * 0.7, [0, '#fff27a'], [0.7, '#ffc23a'], [1, 'rgba(255,190,60,0)']));
  tongue(wd * 0.38, L * 0.38, lin(ctx, 0, y, 0, y + L * 0.38, [0, '#ffffff'], [1, 'rgba(255,255,220,0)']));
  ctx.restore();
}
/** 부품 하나 (아래 y = yb, 가로 폭 단위 k = 화면 폭) */
function drawPiece(ctx: C2, k: PK, cx: number, yb: number, sc: number, fuel: number, t: number) {
  const d = P[k], wd = d.wd * sc, h = d.h * sc;
  void t;
  if (k === 'eng') {
    nozzle(ctx, cx, yb - h * 0.08, wd * 0.42, wd * 0.62, h * 0.42);
    cyl(ctx, cx, yb - h * 0.1, wd, h * 0.9, '#5a6070', '#a8b0c2', '#eef2fa');
    band(ctx, cx, yb - h * 0.25, wd, h * 0.18, '#ff7a3a', '#c0441a');
    ctx.fillStyle = '#ffd84a';
    for (const dx of [-0.3, 0.3]) {
      ell(ctx, cx + dx * wd, yb - h * 0.62, wd * 0.035, wd * 0.035);
      ctx.fill();
    }
  } else if (k === 'big') {
    for (const dx of [-0.24, 0.24]) nozzle(ctx, cx + dx * wd, yb - h * 0.08, wd * 0.28, wd * 0.4, h * 0.44);
    cyl(ctx, cx, yb - h * 0.1, wd, h * 0.9, '#a01e24', '#e8403a', '#ff9a8a');
    band(ctx, cx, yb - h * 0.42, wd, h * 0.16, '#ffffff', '#c8ccd8');
    ctx.fillStyle = '#ffd84a';
    starPath(ctx, cx - wd * 0.08, yb - h * 0.72, wd * 0.07);
    ctx.fill();
  } else if (k === 'tank') {
    cyl(ctx, cx, yb, wd, h, '#9aa4bc', '#e6ebf5', '#ffffff');
    band(ctx, cx, yb - h * 0.12, wd, h * 0.14, '#3d8df5', '#1c5aa8');
    band(ctx, cx, yb - h * 0.74, wd, h * 0.1, '#3d8df5', '#1c5aa8');
    // 연료 창
    const fx = cx + wd * 0.1, fw = wd * 0.16, fy0 = yb - h * 0.7, fh = h * 0.42;
    ctx.fillStyle = '#2a3048';
    rr(ctx, fx - fw / 2, fy0, fw, fh, fw * 0.4);
    ctx.fill();
    const lv = clamp(fuel, 0, 1);
    ctx.fillStyle = lin(ctx, 0, fy0 + fh * (1 - lv), 0, fy0 + fh, [0, '#7af0ff'], [1, '#2a9af0']);
    rr(ctx, fx - fw / 2 + 1.5, fy0 + fh * (1 - lv) + 1.5, fw - 3, Math.max(0, fh * lv - 3), fw * 0.3);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.fillRect(fx - fw * 0.25, fy0 + 3, fw * 0.15, fh * 0.4);
  } else if (k === 'sep') {
    cyl(ctx, cx, yb, wd, h, '#2a2a34', '#555a6a', '#9aa0b4');
    ctx.save();
    ctx.beginPath();
    ctx.rect(cx - wd / 2, yb - h * 0.85, wd, h * 0.7);
    ctx.clip();
    for (let i = -6; i < 7; i++) {
      ctx.fillStyle = i % 2 ? '#2a2a34' : '#ffcc2a';
      ctx.beginPath();
      ctx.moveTo(cx + i * wd * 0.09, yb - h);
      ctx.lineTo(cx + (i + 1) * wd * 0.09, yb - h);
      ctx.lineTo(cx + (i + 1) * wd * 0.09 - wd * 0.06, yb);
      ctx.lineTo(cx + i * wd * 0.09 - wd * 0.06, yb);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}
/** 보조 로켓 (옆에 붙는 가는 로켓) */
function drawBooster(ctx: C2, cx: number, yb: number, sc: number, fl: number, t: number, seed: number) {
  const wd = 0.05 * sc, h = 0.15 * sc;
  if (fl > 0) flame(ctx, cx, yb + h * 0.05, wd * 0.7, h * 0.9 * fl, t, seed);
  nozzle(ctx, cx, yb - h * 0.04, wd * 0.6, wd * 0.85, h * 0.12);
  cyl(ctx, cx, yb - h * 0.05, wd, h * 0.72, '#8a90a4', '#e8ecf6', '#ffffff', false);
  ctx.fillStyle = lin(ctx, cx - wd / 2, 0, cx + wd / 2, 0, [0, '#a01e24'], [0.35, '#ff7a6a'], [1, '#a01e24']);
  ctx.beginPath();
  ctx.moveTo(cx - wd / 2, yb - h * 0.77);
  ctx.quadraticCurveTo(cx - wd / 2, yb - h, cx, yb - h * 1.05);
  ctx.quadraticCurveTo(cx + wd / 2, yb - h, cx + wd / 2, yb - h * 0.77);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  band(ctx, cx, yb - h * 0.25, wd, h * 0.08, '#ff5a3a', '#a01e24');
}
/** 캡슐 + 고양이 + 장식(코 덮개·낙하산 가방·날개·자석). yb = 캡슐 아래 */
interface CapLook { nose: boolean; chute: boolean; wings: number; mag: boolean; mood: Mood; wave: number; t: number; open?: boolean }
function drawCapsule(ctx: C2, cx: number, yb: number, sc: number, L: CapLook) {
  const wd = CAP_W * sc, h = CAP_H * sc, t = L.t;
  // 날개
  if (L.wings) {
    for (const sd of [-1, 1]) {
      ctx.fillStyle = lin(ctx, cx + sd * wd * 0.4, 0, cx + sd * wd * 0.95, 0, [0, '#ff5a4a'], [1, '#c02a2a']);
      ctx.beginPath();
      ctx.moveTo(cx + sd * wd * 0.42, yb - h * 0.55);
      ctx.quadraticCurveTo(cx + sd * wd * 0.9, yb - h * 0.35, cx + sd * wd * 1.0, yb + h * 0.05);
      ctx.lineTo(cx + sd * wd * 0.46, yb - h * 0.08);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      if (L.wings > 1) {
        ctx.fillStyle = '#ffd84a';
        ell(ctx, cx + sd * wd * 0.78, yb - h * 0.12, wd * 0.05, wd * 0.05);
        ctx.fill();
      }
    }
  }
  // 몸통 (방울 모양)
  ctx.fillStyle = lin(ctx, cx - wd / 2, 0, cx + wd / 2, 0, [0, '#b4bcd0'], [0.3, '#ffffff'], [0.6, '#eef1f8'], [1, '#9aa2b8']);
  ctx.beginPath();
  ctx.moveTo(cx - wd / 2, yb);
  ctx.lineTo(cx - wd * 0.46, yb - h * 0.45);
  ctx.bezierCurveTo(cx - wd * 0.42, yb - h * 0.95, cx - wd * 0.15, yb - h * 1.04, cx, yb - h * 1.04);
  ctx.bezierCurveTo(cx + wd * 0.15, yb - h * 1.04, cx + wd * 0.42, yb - h * 0.95, cx + wd * 0.46, yb - h * 0.45);
  ctx.lineTo(cx + wd / 2, yb);
  ctx.ellipse(cx, yb, wd / 2, wd * 0.13, 0, 0, Math.PI);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  band(ctx, cx, yb - h * 0.02, wd, h * 0.12, '#ff6a3a', '#b8401a');
  // 창 + 고양이
  const wy = yb - h * 0.52, wr = wd * 0.3;
  ctx.fillStyle = lin(ctx, 0, wy - wr, 0, wy + wr, [0, '#d8dce8'], [1, '#8a92a8']);
  ell(ctx, cx, wy, wr * 1.18, wr * 1.18);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.save();
  ell(ctx, cx, wy, wr, wr);
  ctx.clip();
  ctx.fillStyle = radg(ctx, cx, wy, 0, wr, [0, '#cfeeff'], [1, '#6ab0e8']);
  ctx.fillRect(cx - wr, wy - wr, wr * 2, wr * 2);
  drawCat(ctx, cx, wy + wr * 0.18, wr * 0.78, L.mood, t, 0);
  ctx.fillStyle = 'rgba(255,255,255,.45)';
  ell(ctx, cx - wr * 0.45, wy - wr * 0.5, wr * 0.35, wr * 0.18, -0.6);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = '#ffd84a';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    ell(ctx, cx + Math.cos(a) * wr * 1.09, wy + Math.sin(a) * wr * 1.09, 1, 1);
    ctx.stroke();
  }
  // 손 흔들기 (창 밖으로 손)
  if (L.wave > 0) {
    const a = Math.sin(t * 0.35) * 0.45;
    ctx.save();
    ctx.translate(cx + wr * 1.15, wy + wr * 0.2);
    ctx.rotate(-0.5 + a);
    ctx.fillStyle = '#ffb060';
    ell(ctx, wr * 0.15, -wr * 0.35, wr * 0.22, wr * 0.32);
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.fillStyle = '#ffc8c8';
    ell(ctx, wr * 0.15, -wr * 0.42, wr * 0.09, wr * 0.08);
    ctx.fill();
    ctx.restore();
  }
  // 코 덮개
  let top = yb - h * 1.04;
  if (L.nose) {
    const nh = 0.07 * sc, nw = wd * 0.62;
    ctx.fillStyle = lin(ctx, cx - nw / 2, 0, cx + nw / 2, 0, [0, '#a01e24'], [0.3, '#ff8a7a'], [0.6, '#e83a3a'], [1, '#8a1a20']);
    ctx.beginPath();
    ctx.moveTo(cx - nw / 2, top + h * 0.1);
    ctx.quadraticCurveTo(cx - nw * 0.4, top - nh * 0.6, cx, top - nh);
    ctx.quadraticCurveTo(cx + nw * 0.4, top - nh * 0.6, cx + nw / 2, top + h * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ell(ctx, cx - nw * 0.15, top - nh * 0.35, nw * 0.07, nh * 0.25, 0.3);
    ctx.fill();
    top -= nh;
  }
  // 낙하산 가방 (옆)
  if (L.chute && !L.open) {
    const bx = cx - wd * 0.5, by = yb - h * 0.62;
    ctx.fillStyle = lin(ctx, bx - wd * 0.12, 0, bx + wd * 0.06, 0, [0, '#c84a8a'], [0.5, '#ff7ab8'], [1, '#c84a8a']);
    rr(ctx, bx - wd * 0.14, by - h * 0.22, wd * 0.18, h * 0.42, wd * 0.06);
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.strokeStyle = '#ffd84a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(bx - wd * 0.14, by);
    ctx.lineTo(bx + wd * 0.04, by);
    ctx.stroke();
  }
  // 자석
  if (L.mag) {
    const my = top - 0.012 * sc, mw = 0.07 * sc;
    ctx.lineCap = 'butt';
    ctx.strokeStyle = OUT;
    ctx.lineWidth = mw * 0.42 + 3;
    ctx.beginPath();
    ctx.arc(cx, my - mw * 0.2, mw * 0.4, Math.PI, 0, true);
    ctx.stroke();
    ctx.strokeStyle = '#e83a3a';
    ctx.lineWidth = mw * 0.42;
    ctx.beginPath();
    ctx.arc(cx, my - mw * 0.2, mw * 0.4, Math.PI, 0, true);
    ctx.stroke();
    ctx.fillStyle = '#d8dce8';
    ctx.fillRect(cx - mw * 0.61, my - mw * 0.32, mw * 0.42, mw * 0.16);
    ctx.fillRect(cx + mw * 0.19, my - mw * 0.32, mw * 0.42, mw * 0.16);
    if (Math.floor(t / 8) % 3 === 0) {
      ctx.strokeStyle = '#ffe14a';
      ctx.lineWidth = 1.2;
      for (const sd of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + sd * mw * 0.4, my - mw * 0.45);
        ctx.lineTo(cx + sd * mw * 0.55, my - mw * 0.62);
        ctx.stroke();
      }
    }
  }
}
/** 펼친 낙하산 */
function drawCanopy(ctx: C2, cx: number, cy: number, r: number, t: number, open: number) {
  if (open <= 0) return;
  const rw = r * (0.3 + 0.7 * open), sway = Math.sin(t * 0.06) * 0.08;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(sway);
  ctx.strokeStyle = 'rgba(60,40,70,.7)';
  ctx.lineWidth = 1;
  for (const dx of [-1, -0.4, 0.4, 1]) {
    ctx.beginPath();
    ctx.moveTo(dx * rw * 0.95, -r * 1.25);
    ctx.lineTo(dx * r * 0.12, -r * 0.05);
    ctx.stroke();
  }
  const cols = ['#ff5a7a', '#ffffff', '#ffd23a', '#ffffff', '#5ab8ff', '#ffffff'];
  for (let i = 0; i < 6; i++) {
    const a0 = Math.PI + (i / 6) * Math.PI, a1 = Math.PI + ((i + 1) / 6) * Math.PI;
    ctx.fillStyle = cols[i];
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.25);
    ctx.ellipse(0, -r * 1.25, rw, rw * 0.75, 0, a0, a1);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(0, -r * 1.25, rw, rw * 0.75, 0, Math.PI, TAU);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.4)';
  ell(ctx, -rw * 0.4, -r * 1.25 - rw * 0.45, rw * 0.2, rw * 0.08, -0.4);
  ctx.fill();
  ctx.restore();
}

/** 로켓 몸통 차림: 떨어진 단은 빼고 (단 안에서는 엔진이 아래) */
interface Stack { pieces: { k: PK; g: number; y: number }[]; top: number; maxW: number; groups: number }
function stackOf(parts: PK[], dropped: number): Stack {
  const groups: PK[][] = [[]];
  for (const k of parts) {
    if (!P[k].stack) continue;
    if (k === 'sep') {
      groups[groups.length - 1].push(k);
      groups.push([]);
    } else groups[groups.length - 1].push(k);
  }
  const pieces: Stack['pieces'] = [];
  let y = 0, maxW = CAP_W;
  groups.forEach((g, gi) => {
    if (gi < dropped) return;
    const ord = [...g].sort((a, b) => (P[b].thr > 0 ? 1 : 0) - (P[a].thr > 0 ? 1 : 0) || (a === 'sep' ? 1 : 0) - (b === 'sep' ? 1 : 0));
    for (const k of ord) {
      pieces.push({ k, g: gi, y });
      y += P[k].h;
      maxW = Math.max(maxW, P[k].wd);
    }
  });
  return { pieces, top: y, maxW, groups: groups.length };
}
interface RocketLook {
  dropped: number; boosters: number; flame: number; boostFlame: number; fuel: (g: number) => number;
  mood: Mood; wave: number; t: number; open?: boolean;
}
/** 로켓 하나: 아래 가운데 (x, yb), sc = 화면 폭 (가로 폭 1 = sc px) */
function drawRocket(ctx: C2, parts: PK[], x: number, yb: number, sc: number, L: RocketLook) {
  const S = stackOf(parts, L.dropped);
  const vis = S.pieces, top = S.top;
  // 보조 로켓 (아래 단 옆)
  const bw = (S.pieces[0] ? P[S.pieces[0].k].wd : CAP_W) * sc;
  if (L.boosters > 0) {
    for (let i = 0; i < L.boosters; i++) {
      const sd = i % 2 ? 1 : -1, ring = Math.floor(i / 2);
      drawBooster(ctx, x + sd * (bw / 2 + 0.026 * sc + ring * 0.052 * sc), yb + 0.005 * sc, sc, L.boostFlame, L.t, i * 3);
    }
  }
  // 불꽃 (맨 아래 엔진)
  if (L.flame > 0 && vis.length) {
    const p0 = vis[0];
    if (P[p0.k].thr > 0) {
      const wd = P[p0.k].wd * sc;
      if (p0.k === 'big') for (const dx of [-0.24, 0.24]) flame(ctx, x + dx * wd, yb + 0.03 * sc, wd * 0.36, 0.17 * sc * L.flame, L.t, dx * 9);
      else flame(ctx, x, yb + 0.022 * sc, wd * 0.55, 0.16 * sc * L.flame, L.t, 1);
    }
  }
  for (const p of vis) drawPiece(ctx, p.k, x, yb - p.y * sc, sc, L.fuel(p.g), L.t);
  drawCapsule(ctx, x, yb - top * sc, sc, {
    nose: parts.includes('nose'), chute: parts.includes('chute'), wings: parts.filter((k) => k === 'wing').length, mag: parts.includes('mag'),
    mood: L.mood, wave: L.wave, t: L.t, open: L.open,
  });
}
const rocketScale = (hh: number) => Math.min(1.3, 0.7 / Math.max(0.3, hh));
const rocketHeight = (parts: PK[]) => stackOf(parts, 0).top + CAP_H + (parts.includes('nose') ? 0.07 : 0) + (parts.includes('mag') ? 0.04 : 0);

// ── 구경꾼 동물 ──
type Critter = 'bunny' | 'bear' | 'duck' | 'pig' | 'fox';
function drawCritter(ctx: C2, kind: Critter, x: number, y: number, r: number, t: number, cheer: boolean, sad: boolean, ph: number) {
  const hop = cheer ? Math.abs(Math.sin(t * 0.25 + ph)) * r * 0.7 : Math.max(0, Math.sin(t * 0.04 + ph * 2) - 0.9) * r * 2;
  const by = y - hop;
  const col = { bunny: '#fbf6f0', bear: '#b07a4a', duck: '#ffd84a', pig: '#ffb0c0', fox: '#ff8a3a' }[kind];
  const dark = { bunny: '#d8ccc0', bear: '#7a5030', duck: '#e0a820', pig: '#e07a90', fox: '#c85a1a' }[kind];
  ctx.fillStyle = 'rgba(30,60,20,.25)';
  ell(ctx, x, y + r * 0.95, r * 0.9, r * 0.22);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1.2, r * 0.1);
  // 몸
  ctx.fillStyle = col;
  ell(ctx, x, by + r * 0.45, r * 0.75, r * 0.6);
  ctx.fill();
  ctx.stroke();
  // 팔
  for (const sd of [-1, 1]) {
    ctx.save();
    ctx.translate(x + sd * r * 0.62, by + r * 0.3);
    ctx.rotate(sd * (cheer ? -2.5 + Math.sin(t * 0.5 + ph) * 0.4 : sad ? 0.2 : 0.5));
    ctx.fillStyle = col;
    ell(ctx, 0, r * 0.3, r * 0.18, r * 0.34);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  // 귀
  if (kind === 'bunny')
    for (const sd of [-1, 1]) {
      ctx.fillStyle = col;
      ell(ctx, x + sd * r * 0.28, by - r * 1.15, r * 0.17, r * 0.48, sd * 0.15);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffc0cc';
      ell(ctx, x + sd * r * 0.28, by - r * 1.12, r * 0.08, r * 0.33, sd * 0.15);
      ctx.fill();
    }
  else if (kind === 'bear' || kind === 'pig')
    for (const sd of [-1, 1]) {
      ctx.fillStyle = col;
      ell(ctx, x + sd * r * 0.45, by - r * 0.62, r * 0.2, r * 0.2);
      ctx.fill();
      ctx.stroke();
    }
  else if (kind === 'fox')
    for (const sd of [-1, 1]) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(x + sd * r * 0.2, by - r * 0.62);
      ctx.lineTo(x + sd * r * 0.52, by - r * 1.05);
      ctx.lineTo(x + sd * r * 0.62, by - r * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  // 머리
  ctx.fillStyle = col;
  ell(ctx, x, by - r * 0.25, r * 0.62, r * 0.55);
  ctx.fill();
  ctx.stroke();
  if (kind === 'fox' || kind === 'bunny') {
    ctx.fillStyle = '#ffffff';
    ell(ctx, x, by - r * 0.08, r * 0.35, r * 0.25);
    ctx.fill();
  }
  // 얼굴
  ctx.fillStyle = '#2a1a2a';
  for (const sd of [-1, 1]) {
    if (cheer) {
      ctx.strokeStyle = '#2a1a2a';
      ctx.lineWidth = Math.max(1, r * 0.09);
      ctx.beginPath();
      ctx.arc(x + sd * r * 0.22, by - r * 0.27, r * 0.09, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else {
      ell(ctx, x + sd * r * 0.22, by - r * 0.3, r * 0.07, r * 0.09);
      ctx.fill();
    }
  }
  if (kind === 'duck') {
    ctx.fillStyle = '#ff9a2a';
    ell(ctx, x, by - r * 0.1, r * 0.24, r * 0.1);
    ctx.fill();
  } else if (kind === 'pig') {
    ctx.fillStyle = dark;
    ell(ctx, x, by - r * 0.1, r * 0.18, r * 0.12);
    ctx.fill();
  } else {
    ctx.fillStyle = kind === 'bear' ? '#3a2010' : '#ff7a8a';
    ell(ctx, x, by - r * 0.15, r * 0.08, r * 0.06);
    ctx.fill();
  }
  ctx.strokeStyle = '#2a1a2a';
  ctx.lineWidth = Math.max(1, r * 0.08);
  ctx.beginPath();
  if (cheer) {
    ctx.fillStyle = '#c8304a';
    ell(ctx, x, by - r * 0.0, r * 0.12, r * 0.1);
    ctx.fill();
  } else if (sad) ctx.arc(x, by + r * 0.05, r * 0.1, Math.PI * 1.15, Math.PI * 1.85);
  else ctx.arc(x, by - r * 0.1, r * 0.1, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();
  void dark;
}
const CROWD: [Critter, number, number][] = [['bunny', 0.06, 0.95], ['bear', 0.17, 0.975], ['duck', 0.52, 0.985], ['pig', 0.8, 0.965], ['fox', 0.94, 0.982]];

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

// ── 구름 ──
function cloud(ctx: C2, x: number, y: number, s: number, a = 1, tint = '#ffffff') {
  ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(120,150,200,.25)';
  ell(ctx, x + s * 0.05, y + s * 0.28, s * 0.95, s * 0.18);
  ctx.fill();
  ctx.fillStyle = tint;
  ctx.beginPath();
  for (const [dx, dy, q] of [[-0.55, 0.08, 0.38], [-0.15, -0.18, 0.5], [0.35, -0.08, 0.44], [0.7, 0.12, 0.3], [0.1, 0.12, 0.42]]) {
    ctx.moveTo(x + dx * s + q * s, y + dy * s);
    ctx.arc(x + dx * s, y + dy * s, q * s, 0, TAU);
  }
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  ell(ctx, x - s * 0.2, y - s * 0.38, s * 0.22, s * 0.1);
  ctx.fill();
  ctx.globalAlpha = 1;
}
/** 새 한 마리 */
function bird(ctx: C2, x: number, y: number, r: number, t: number, ph: number, hit: boolean) {
  const fl = Math.sin(t * 0.4 + ph);
  ctx.save();
  ctx.translate(x, y);
  if (hit) ctx.rotate(t * 0.3 + ph);
  ctx.fillStyle = '#5a8af0';
  ell(ctx, 0, 0, r, r * 0.8);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ell(ctx, r * 0.15, r * 0.25, r * 0.55, r * 0.4);
  ctx.fill();
  ctx.fillStyle = '#3a6ad0';
  ctx.beginPath();
  ctx.moveTo(-r * 0.2, -r * 0.1);
  ctx.quadraticCurveTo(-r * 0.9, -r * (0.4 + fl * 0.8), -r * 1.3, -r * fl * 0.6);
  ctx.quadraticCurveTo(-r * 0.7, r * 0.1, -r * 0.2, r * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffb020';
  ctx.beginPath();
  ctx.moveTo(r * 0.85, -r * 0.1);
  ctx.lineTo(r * 1.35, r * 0.05);
  ctx.lineTo(r * 0.85, r * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#1a1020';
  if (hit) {
    ctx.strokeStyle = '#1a1020';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(r * 0.35, -r * 0.35);
    ctx.lineTo(r * 0.6, -r * 0.1);
    ctx.moveTo(r * 0.6, -r * 0.35);
    ctx.lineTo(r * 0.35, -r * 0.1);
    ctx.stroke();
  } else {
    ell(ctx, r * 0.5, -r * 0.2, r * 0.12, r * 0.14);
    ctx.fill();
  }
  ctx.restore();
}
/** 판의 목표 (높이 goal에 떠 있는 것) */
function drawGoalThing(ctx: C2, st: number, x: number, y: number, k: number, t: number, reached: boolean) {
  const d = STAGES[st];
  ctx.save();
  ctx.translate(x, y);
  const bob = Math.sin(t * 0.04) * k * 0.08;
  ctx.translate(0, bob);
  if (st === 5) {
    // 오로라 커튼 (화면을 가로지르는 빛 띠)
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
      const col = ['90,255,170', '120,220,255', '220,130,255', '140,255,200'][i];
      for (let q = -3.2; q <= 3.2; q += 0.08) {
        const yy = Math.sin(q * 1.3 + t * 0.025 + i * 1.7) * k * 0.35 - i * k * 0.5;
        const hh = k * (0.9 + 0.4 * Math.sin(q * 3 + i + t * 0.04));
        const g = ctx.createLinearGradient(0, yy - hh, 0, yy + k * 0.1);
        g.addColorStop(0, `rgba(${col},0)`);
        g.addColorStop(0.7, `rgba(${col},.22)`);
        g.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(q * k, yy - hh, k * 0.085, hh + k * 0.1);
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  } else if (st === 6) {
    // 달 정거장: 둥근 고리 + 태양판 + 도킹 팔
    ctx.fillStyle = 'rgba(200,220,255,.18)';
    ell(ctx, 0, 0, k * 1.1, k * 0.5);
    ctx.fill();
    for (const sd of [-1, 1]) {
      ctx.fillStyle = lin(ctx, 0, -k * 0.12, 0, k * 0.12, [0, '#3a6ad8'], [1, '#1a3a90']);
      ctx.fillRect(sd * k * 0.55 - k * 0.22, -k * 0.13, k * 0.44, k * 0.26);
      ctx.strokeStyle = '#9ac0ff';
      ctx.lineWidth = 1;
      for (let q = 1; q < 4; q++) {
        ctx.beginPath();
        ctx.moveTo(sd * k * 0.55 - k * 0.22 + q * k * 0.11, -k * 0.13);
        ctx.lineTo(sd * k * 0.55 - k * 0.22 + q * k * 0.11, k * 0.13);
        ctx.stroke();
      }
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 1.4;
      ctx.strokeRect(sd * k * 0.55 - k * 0.22, -k * 0.13, k * 0.44, k * 0.26);
    }
    ctx.fillStyle = lin(ctx, -k * 0.3, 0, k * 0.3, 0, [0, '#9aa2b8'], [0.4, '#ffffff'], [1, '#8a92a8']);
    ell(ctx, 0, 0, k * 0.3, k * 0.24);
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.fillStyle = reached ? '#7af07a' : '#ffd84a';
    ell(ctx, 0, 0, k * 0.08, k * 0.08);
    ctx.fill();
    ctx.fillStyle = '#e83a3a';
    ctx.fillRect(-k * 0.6, k * 0.18, k * 0.4, k * 0.06);
    ctx.fillStyle = '#ffffff';
    for (let q = 0; q < 4; q++) ctx.fillRect(-k * 0.58 + q * k * 0.1, k * 0.19, k * 0.04, k * 0.04);
  } else {
    // 떠 있는 구름 섬 (+ 판마다 다른 장식)
    cloud(ctx, 0, k * 0.12, k * 0.55, 1, '#ffffff');
    ctx.fillStyle = lin(ctx, 0, -k * 0.05, 0, k * 0.3, [0, '#8ed05a'], [1, '#5aa83a']);
    ctx.beginPath();
    ctx.ellipse(0, 0, k * 0.42, k * 0.1, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = lin(ctx, 0, 0, 0, k * 0.35, [0, '#c08a5a'], [1, '#7a4a2a']);
    ctx.beginPath();
    ctx.moveTo(-k * 0.4, k * 0.02);
    ctx.quadraticCurveTo(-k * 0.1, k * 0.4, 0, k * 0.42);
    ctx.quadraticCurveTo(k * 0.1, k * 0.4, k * 0.4, k * 0.02);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#9de06a';
    ell(ctx, 0, -k * 0.01, k * 0.42, k * 0.09);
    ctx.fill();
    if (st === 1) {
      // 풍선 마을: 열기구 둘
      for (const [dx, dy, c] of [[-0.6, -0.55, '#ff6a8a'], [0.62, -0.42, '#ffd23a']] as [number, number, string][]) {
        ctx.fillStyle = lin(ctx, dx * k - k * 0.16, 0, dx * k + k * 0.16, 0, [0, c], [0.4, '#ffffff'], [1, c]);
        ell(ctx, dx * k, dy * k, k * 0.16, k * 0.2);
        ctx.fill();
        ctx.strokeStyle = OUT;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.fillStyle = '#a0703a';
        ctx.fillRect(dx * k - k * 0.05, dy * k + k * 0.26, k * 0.1, k * 0.07);
        ctx.beginPath();
        ctx.moveTo(dx * k - k * 0.1, dy * k + k * 0.15);
        ctx.lineTo(dx * k - k * 0.05, dy * k + k * 0.26);
        ctx.moveTo(dx * k + k * 0.1, dy * k + k * 0.15);
        ctx.lineTo(dx * k + k * 0.05, dy * k + k * 0.26);
        ctx.stroke();
      }
    } else if (st === 3) {
      // 무지개
      const cols = ['#ff5a5a', '#ffa03a', '#ffe14a', '#5ad04a', '#3d9df5', '#9a6ae8'];
      cols.forEach((c, i) => {
        ctx.strokeStyle = c;
        ctx.lineWidth = k * 0.05;
        ctx.beginPath();
        ctx.arc(0, k * 0.05, k * (0.75 - i * 0.05), Math.PI * 1.08, Math.PI * 1.92);
        ctx.stroke();
      });
    } else if (st === 4) {
      // 바람개비
      ctx.fillStyle = '#f2efe6';
      ctx.fillRect(-k * 0.03, -k * 0.35, k * 0.06, k * 0.34);
      ctx.save();
      ctx.translate(0, -k * 0.36);
      ctx.rotate(t * 0.12);
      for (let q = 0; q < 4; q++) {
        ctx.rotate(TAU / 4);
        ctx.fillStyle = q % 2 ? '#ff6a5a' : '#ffffff';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(k * 0.22, -k * 0.05);
        ctx.lineTo(k * 0.2, k * 0.05);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = OUT;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.restore();
    } else {
      // 작은 집
      ctx.fillStyle = '#fff6e6';
      ctx.fillRect(-k * 0.12, -k * 0.16, k * 0.16, k * 0.14);
      ctx.fillStyle = '#ff6a5a';
      ctx.beginPath();
      ctx.moveTo(-k * 0.15, -k * 0.15);
      ctx.lineTo(-k * 0.04, -k * 0.26);
      ctx.lineTo(k * 0.07, -k * 0.15);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#7ac8f0';
      ctx.fillRect(-k * 0.08, -k * 0.12, k * 0.05, k * 0.05);
    }
    // 목표 깃발
    ctx.strokeStyle = '#6a4a2a';
    ctx.lineWidth = Math.max(1.5, k * 0.025);
    ctx.beginPath();
    ctx.moveTo(k * 0.22, -k * 0.02);
    ctx.lineTo(k * 0.22, -k * 0.4);
    ctx.stroke();
    ctx.fillStyle = reached ? '#ffd23a' : '#ff5a3a';
    ctx.beginPath();
    ctx.moveTo(k * 0.22, -k * 0.4);
    ctx.quadraticCurveTo(k * 0.34, -k * 0.38 + Math.sin(t * 0.15) * k * 0.02, k * 0.44, -k * 0.33);
    ctx.lineTo(k * 0.22, -k * 0.26);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  void d;
}

// ── 비행 화면 (카메라) ──
/** 화면 가로 폭 단위로 1m가 얼마나 되나 */
const KM = 0.74 / 700;
const ROCKET_SY = 0.78;
interface View { mode: 'build' | 'ign' | 'asc' | 'hold' | 'desc' | 'land' | 'tip' | 'result'; alt: number; cam: number; u: number; step: number }
function viewOf(s: RocketState): View {
  const f = s.fl;
  if (s.phase !== 'fly' || !f) return { mode: s.phase === 'result' ? 'result' : 'build', alt: 0, cam: 0, u: 0, step: 0 };
  if (f.t < IGN) return { mode: 'ign', alt: 0, cam: 0, u: f.t / IGN, step: 0 };
  if (f.res.tip) return { mode: 'tip', alt: 0, cam: 0, u: (f.t - IGN) / TIP_T, step: 0 };
  const lift = (PAD_Y - ROCKET_SY) / KM;
  if (f.t < IGN + f.asc) {
    const step = flStep(f), alt = altAt(f, step);
    return { mode: 'asc', alt, cam: Math.max(0, alt - lift), u: (f.t - IGN) / f.asc, step };
  }
  const apex = f.res.apex, last = f.res.steps - 1;
  if (f.t < IGN + f.asc + HOLD) return { mode: 'hold', alt: apex, cam: Math.max(0, apex - lift), u: (f.t - IGN - f.asc) / HOLD, step: last };
  if (f.t < IGN + f.asc + HOLD + DESC) {
    const u = (f.t - IGN - f.asc - HOLD) / DESC, alt = apex * (1 - easeIO(u));
    return { mode: 'desc', alt, cam: Math.max(0, alt - (PAD_Y - 0.5) / KM), u, step: last };
  }
  return { mode: 'land', alt: 0, cam: 0, u: (f.t - IGN - f.asc - HOLD - DESC) / LAND, step: last };
}
/** 비행 중 단마다 남은 연료 비율 (그림용) */
function fuelOf(f: Flight, step: number) {
  const drops = f.res.ev.filter((e) => e.k === 'drop').map((e) => e.step);
  const burn = f.res.ev.find((e) => e.k === 'burnout')?.step ?? f.res.steps;
  return (g: number) => {
    const s0 = g === 0 ? 0 : drops[g - 1] ?? burn, s1 = drops[g] ?? burn;
    if (step <= s0) return 1;
    return clamp(1 - (step - s0) / Math.max(1, s1 - s0), 0, 1);
  };
}
/** 비행 화면에서 한 틱에 오르는 높이 (m) */
const velTick = (f: Flight, step: number) => {
  const per = f.res.steps / f.asc;
  return altAt(f, Math.min(f.res.steps - 1, step + per)) - altAt(f, step);
};
/** 달 정거장 높이: 붙을 비행이면 꼭대기 바로 위로 (팔이 닿게) */
const stationAlt = (s: RocketState) => (s.fl && s.fl.res.ev.some((e) => e.k === 'dock') ? s.fl.res.apex + 150 : STAGES[s.stage].goal + DOCK_BAND * 0.5);
const evStep = (f: Flight, k: FlyEv['k']) => f.res.ev.find((e) => e.k === k)?.step ?? Infinity;

// ── 그림 기억 (화면 전용) ──
interface Puff { x: number; alt: number; r: number; vx: number; va: number; life: number; max: number; dark: number }
interface Debris { parts: PK[]; boost: number; x: number; alt: number; t0: number; vx: number; vr: number; v0: number }
interface Vis {
  ev: number; lastT: number; puffs: Puff[]; debris: Debris[]; ghost: { k: PK; i: number; t0: number } | null; attachDone: number;
  pred: Pred | null; predKey: string; shown: number; stackH: number; cheer: number; sad: number; wind: number; chuteT: number; bigDone: number; gmax: number;
}
const VIS = new WeakMap<object, Vis>();
const visOf = (s: RocketState): Vis => {
  let v = VIS.get(s);
  if (!v) VIS.set(s, (v = { ev: -1, lastT: -1, puffs: [], debris: [], ghost: null, attachDone: -999, pred: null, predKey: '', shown: 0, stackH: 0, cheer: -999, sad: -999, wind: -999, chuteT: -999, bigDone: -999, gmax: 0 }));
  return v;
};
const gaugeMax = (st: number) => {
  const d = STAGES[st];
  let m = d.goal;
  for (const q of d.stars) if (q.k === 'high') m = Math.max(m, q.n);
  if (d.spot === 'mag') m = d.goal + DOCK_BAND;
  return m * 1.28;
};
const KIND_COL: Record<PK, [string, string]> = {
  eng: ['#ff8a3a', '#c8501a'], big: ['#ff5a4a', '#b02a2a'], boost: ['#ff6a8a', '#b8305a'],
  tank: ['#3d9df5', '#1c5aa8'], sep: ['#8a8ea8', '#4a4e68'], nose: ['#9a6ae8', '#5a3aa8'], chute: ['#e85aa8', '#a02a70'], wing: ['#3ac0a0', '#1a8070'], mag: ['#e8a03a', '#a8601a'],
};

function drawAll(ctx: C2, s: RocketState, w: number, h: number, th: Theme) {
  void th;
  const fx = juice(s), vis = visOf(s), X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w;
  const t = s.t, f = s.fl, V = viewOf(s);
  const sc = typeof ctx.getTransform === 'function' ? ctx.getTransform().a || 1 : 1;
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  const build = s.phase === 'build';
  // 미리 보기 (같은 시뮬레이션) — 조립이 바뀔 때만
  const pk = partsKey(s.stage, s.parts);
  if (pk !== vis.predKey) {
    vis.predKey = pk;
    vis.pred = s.parts.length && hasEngine(s.parts) ? predict(s.parts, s.stage) : null;
    fx.memo.predT = t;
    fx.memo.predFrom = vis.shown;
  }
  const pred = vis.pred;
  const target = pred ? (pred.tip ? 0 : pred.apex) : 0;
  vis.shown += (target - vis.shown) * 0.16;
  const wantH = rocketHeight(s.parts);
  vis.stackH += (wantH - vis.stackH) * 0.25;
  const gy = (alt: number) => Y(PAD_Y - (alt - V.cam) * KM);
  const rocketX = X(PAD_X);

  // ── 사건 → 연출 ──
  for (const e of s.events) {
    if (e.t <= vis.ev || t - e.t > 20) continue;
    const ex = X(e.x), ey = Y(e.y);
    switch (e.kind) {
      case 'attach':
        vis.ghost = { k: e.text as PK, i: e.n ?? 1, t0: e.t };
        break;
      case 'nope':
      case 'nolaunch':
        fx.pop(ex, ey - R(0.09), e.text || '안 돼요', '#ffffff', Math.max(14, R(0.045)));
        break;
      case 'ignite':
        fx.kick(5);
        break;
      case 'liftoff':
        fx.kick(14);
        fx.blink('#fff2c0', 0.35);
        vis.cheer = t;
        break;
      case 'tip':
        fx.pop(rocketX, Y(PAD_Y - 0.3), '픽…', '#ffffff', Math.max(18, R(0.07)));
        vis.sad = t;
        break;
      case 'drop':
        fx.pop(rocketX + R(0.16), Y(ROCKET_SY - 0.02), '퉁!', '#ffe14a', Math.max(20, R(0.075)));
        fx.ring(rocketX, Y(ROCKET_SY), '#ffffff', R(0.2), 4);
        fx.kick(7);
        if (f) {
          const S = stackOf(s.parts, e.n ?? 0);
          vis.debris.push({ parts: S.pieces.filter((p) => p.g === (e.n ?? 0)).map((p) => p.k), boost: 0, x: PAD_X, alt: V.alt - 40, t0: t, vx: (hsh(t) - 0.5) * 0.004, vr: (hsh(t + 1) - 0.5) * 0.12, v0: velTick(f, V.step) });
        }
        break;
      case 'boostOff':
        fx.pop(rocketX - R(0.18), Y(ROCKET_SY), '슝—', '#ffffff', Math.max(16, R(0.05)));
        if (f) vis.debris.push({ parts: [], boost: e.n ?? 2, x: PAD_X, alt: V.alt, t0: t, vx: 0, vr: 0.05, v0: velTick(f, V.step) });
        break;
      case 'spin':
        fx.pop(rocketX, Y(ROCKET_SY - 0.35), '빙글빙글~', '#ffe0ff', Math.max(18, R(0.06)));
        break;
      case 'birds':
        if (e.n) fx.pop(rocketX + R(0.2), Y(0.3), '코 덮개로 슝!', '#ffffff', Math.max(15, R(0.05)));
        else fx.pop(rocketX + R(0.2), Y(0.3), '꽥꽥! 새 떼!', '#ffffff', Math.max(16, R(0.055)));
        break;
      case 'gust':
        vis.wind = t;
        fx.pop(X(0.7), Y(0.35), (e.n ?? 0) >= 0 ? '바람 휙! ↑' : '바람 휙! ↓', '#e0f6ff', Math.max(16, R(0.055)));
        break;
      case 'pass':
        fx.kick(10);
        fx.blink('#fff6c0', 0.4);
        for (let q = 0; q < 6; q++) fx.burst(X(0.15 + q * 0.14), Y(0.3 + (q % 2) * 0.12), ['#ff6a8a', '#ffd23a', '#5ad0ff', '#7ae06a', '#c08aff', '#ffffff'][q], 16, 4.5, 3);
        break;
      case 'apex':
        if (f) fx.pop(rocketX + R(0.2), Y(ROCKET_SY - 0.3), `최고 ${fmt(f.res.apex)}m`, '#ffffff', Math.max(16, R(0.055)));
        break;
      case 'dock':
        fx.ring(rocketX, Y(ROCKET_SY - 0.25), '#ffe14a', R(0.25), 5);
        fx.burst(rocketX, Y(ROCKET_SY - 0.25), '#ffe14a', 24, 5, 3);
        fx.kick(8);
        break;
      case 'chute':
        vis.chuteT = t;
        fx.pop(X(0.5), Y(0.32), '펑! 낙하산', '#ffffff', Math.max(16, R(0.055)));
        break;
      case 'fall':
        fx.pop(X(0.58), Y(0.38), '으아아~', '#ffffff', Math.max(16, R(0.055)));
        break;
      case 'softland':
        fx.burst(X(PAD_X + 0.1), Y(PAD_Y), '#e8dcc0', 14, 2.5, 3);
        fx.pop(X(PAD_X + 0.1), Y(PAD_Y - 0.18), '사뿐!', '#ffffff', Math.max(16, R(0.055)));
        vis.cheer = t;
        break;
      case 'splash':
        fx.burst(X(0.7), Y(0.92), '#ffe58a', 30, 5, 3);
        fx.kick(6);
        fx.pop(X(0.7), Y(0.8), '폭신!', '#ffffff', Math.max(18, R(0.06)));
        vis.cheer = t;
        break;
      case 'clear':
        vis.cheer = t;
        for (let q = 0; q < 5; q++) fx.burst(X(0.15 + q * 0.175), Y(0.3 + (q % 2) * 0.1), ['#ff6a8a', '#ffd23a', '#5ad0ff', '#7ae06a', '#c08aff'][q], 16, 4.5, 3);
        break;
      case 'fail':
        vis.sad = t;
        fx.kick(4);
        break;
      case 'big':
        fx.kick(8);
        break;
    }
  }
  vis.ev = Math.max(vis.ev, ...s.events.map((e) => e.t), vis.ev);
  // 붙이기 도착: 철컥!
  if (s.attachT !== vis.attachDone && t - s.attachT >= ATTACH_T - 2 && t - s.attachT < 30 && build && s.lastPart >= 0) {
    vis.attachDone = s.attachT;
    const k = s.parts[s.lastPart];
    const S = stackOf(s.parts, 0);
    const yb = Y(PAD_Y - 0.008);
    const pi = S.pieces.findIndex((p, j) => p.k === k && j === S.pieces.length - 1);
    const py = P[k].stack ? yb - R((pi >= 0 ? S.pieces[pi].y : S.top) + P[k].h / 2) : yb - R(S.top + CAP_H * 0.6);
    fx.burst(rocketX, py, '#ffe14a', 18, 4, 2.6);
    fx.ring(rocketX, py, '#ffffff', R(0.14), 3);
    fx.kick(P[k].thr > 0 ? 7 : 4);
    fx.pop(rocketX + R(0.16), py - R(0.02), P[k].thr > 0 ? P[k].say : '철컥!', '#ffffff', Math.max(16, R(0.055)));
    vis.cheer = t;
    const gain = (vis.pred ? (vis.pred.tip ? 0 : vis.pred.apex) : 0) - (fx.memo.predFrom ?? 0);
    if (Math.abs(gain) > 5) fx.pop(X(GAUGE_X - 0.12), Y(0.5), `${gain > 0 ? '+' : '−'}${fmt(Math.abs(gain))}m`, gain > 0 ? '#c8ffb0' : '#ffd0d0', Math.max(15, R(0.05)));
  }

  // ── 하늘 ──
  const camL = lvl(s.stage, V.cam + 250);
  const [skyT, skyB] = skyAt(camL);
  ctx.fillStyle = lin(ctx, 0, 0, 0, Y(PANEL_Y), [0, skyT], [1, skyB]);
  ctx.fillRect(0, 0, w, Y(PANEL_Y));
  ctx.save();
  fx.begin(ctx);
  // 별 (높이 올라갈수록)
  const starA = clamp((camL - 3) / 1.5, 0, 1);
  if (starA > 0) {
    for (let i = 0; i < 60; i++) {
      const sx = X(hsh(i + 300)), sy = ((hsh(i + 301) * Y(PANEL_Y) + V.cam * KM * w * 0.15) % Y(PANEL_Y));
      ctx.globalAlpha = starA * (0.4 + 0.6 * Math.abs(Math.sin(t * 0.05 + i)));
      ctx.fillStyle = '#ffffff';
      const r = i % 7 ? 1.1 : 2;
      ctx.fillRect(sx - r / 2, sy - r / 2, r, r);
    }
    ctx.globalAlpha = 1;
  }
  // 해
  const sunY = Y(0.17) + V.cam * KM * w * 0.05;
  if (sunY < Y(PANEL_Y) && camL < 4) {
    const sx = X(0.14), sr = R(0.045);
    ctx.save();
    ctx.translate(sx, sunY);
    ctx.rotate(t * 0.004);
    ctx.fillStyle = 'rgba(255,230,120,.5)';
    for (let i = 0; i < 12; i++) {
      ctx.rotate(TAU / 12);
      ctx.beginPath();
      ctx.moveTo(sr * 1.25, -sr * 0.16);
      ctx.lineTo(sr * 1.8, 0);
      ctx.lineTo(sr * 1.25, sr * 0.16);
      ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = radg(ctx, sx - sr * 0.3, sunY - sr * 0.3, 0, sr, [0, '#fffbd0'], [1, '#ffc93a']);
    ell(ctx, sx, sunY, sr, sr);
    ctx.fill();
    ctx.fillStyle = '#c8701a';
    for (const dx of [-0.3, 0.3]) {
      ell(ctx, sx + dx * sr, sunY - sr * 0.1, sr * 0.08, sr * 0.12);
      ctx.fill();
    }
    ctx.strokeStyle = '#c8701a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(sx, sunY + sr * 0.15, sr * 0.3, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }
  // 하늘 구름 (높이마다)
  for (let i = 0; i < 30; i++) {
    const alt = 260 + i * 270 + hsh(i + 40) * 140, cl = lvl(s.stage, alt), ca = clamp(4 - cl, 0, 1);
    if (ca <= 0) continue;
    const y = gy(alt), x = X(((hsh(i + 41) * 1.3 - 0.15 + t * 0.0002 * (1 + (i % 3))) % 1.3) - 0.15);
    if (y < -R(0.1) || y > Y(PANEL_Y) + R(0.1)) continue;
    cloud(ctx, x, y, R(0.07 + hsh(i + 42) * 0.06), 0.95 * ca);
  }
  // 달 (높은 하늘)
  const moonA = clamp((camL - 3.8) / 1.2, 0, 1);
  if (moonA > 0) {
    const mx = X(0.74), my = Y(0.22), mr = R(0.12);
    ctx.globalAlpha = moonA;
    ctx.fillStyle = radg(ctx, mx, my, mr * 0.8, mr * 1.8, [0, 'rgba(255,250,210,.35)'], [1, 'rgba(255,250,210,0)']);
    ell(ctx, mx, my, mr * 1.8, mr * 1.8);
    ctx.fill();
    ctx.fillStyle = radg(ctx, mx - mr * 0.3, my - mr * 0.3, 0, mr * 1.1, [0, '#fffbe6'], [1, '#e8d8a0']);
    ell(ctx, mx, my, mr, mr);
    ctx.fill();
    ctx.fillStyle = 'rgba(180,160,110,.45)';
    for (const [dx, dy, r] of [[-0.3, -0.2, 0.2], [0.35, 0.1, 0.16], [-0.05, 0.4, 0.12], [0.1, -0.45, 0.09]]) {
      ell(ctx, mx + dx * mr, my + dy * mr, r * mr, r * mr);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  // 먼 산 · 땅 (카메라 따라 내려감)
  const drop = V.cam * KM * w;
  if (drop < Y(PANEL_Y)) {
    ctx.drawImage(getHills(Math.round(w), Math.min(3, Math.max(1, Math.round(sc)))), 0, drop * 0.55, w, R(1.05));
    // 발사탑 (뒤쪽 기둥)
    drawTower(ctx, s, V, X, Y, R, drop, t);
    ctx.drawImage(getGround(Math.round(w), Math.min(3, Math.max(1, Math.round(sc)))), 0, drop, w, R(1.05));
  }
  // 목표·별 깃발·새 떼 (하늘 세계)
  drawSkyThings(ctx, s, V, gy, X, Y, R, font, t, fx);
  // 속도 줄 (빠르게 오를 때)
  if (f && V.mode === 'asc') {
    const v = velTick(f, V.step), k = clamp((v - 4) / 20, 0, 1);
    if (k > 0) {
      ctx.strokeStyle = `rgba(255,255,255,${0.45 * k})`;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      for (let i = 0; i < 12; i++) {
        const xx = X(0.04 + hsh(i + 500) * 0.8), len = R(0.06 + 0.14 * k);
        const yy = ((hsh(i + 501) * Y(PANEL_Y) + t * R(0.04) * (0.6 + hsh(i + 502))) % (Y(PANEL_Y) + len)) - len;
        if (Math.abs(xx - X(PAD_X)) < R(0.12)) continue;
        ctx.beginPath();
        ctx.moveTo(xx, yy);
        ctx.lineTo(xx, yy + len);
        ctx.stroke();
      }
    }
  }
  // 바람 줄
  if (t - vis.wind < 90 && f) {
    const a = 1 - (t - vis.wind) / 90, up = f.wind >= 0 || s.parts.includes('wing');
    ctx.strokeStyle = `rgba(255,255,255,${0.7 * a})`;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const yy = Y(0.15 + hsh(i + 200) * 0.7) + (up ? -1 : 1) * ((t * 6 + i * 40) % R(0.5)) * 0.3;
      const xx = X(-0.3 + ((t * 0.02 + hsh(i + 201)) % 1.6));
      ctx.beginPath();
      ctx.moveTo(xx, yy);
      ctx.quadraticCurveTo(xx + R(0.12), yy - R(0.02) * (up ? 1 : -1), xx + R(0.24), yy + R(0.01));
      ctx.stroke();
    }
  }

  // ── 연기 ──
  const spawn = t !== vis.lastT;
  vis.lastT = t;
  if (spawn && f && (V.mode === 'ign' || V.mode === 'asc' || V.mode === 'tip')) {
    const burning = V.mode === 'ign' || V.mode === 'tip' || V.step < evStep(f, 'burnout');
    if (burning) {
      const n = V.mode === 'ign' ? 3 : V.mode === 'tip' ? (V.u < 0.3 ? 2 : 0) : 2;
      for (let q = 0; q < n; q++) {
        const r1 = hsh(t * 3 + q), r2 = hsh(t * 3 + q + 0.5);
        const ground = V.alt < 60;
        vis.puffs.push({
          x: PAD_X + (r1 - 0.5) * 0.06, alt: V.alt - 25, r: 0.03 + r2 * 0.03,
          vx: ground ? (r1 < 0.5 ? -1 : 1) * (0.004 + r2 * 0.006) : (r1 - 0.5) * 0.002, va: ground ? 0.4 + r2 : -3 - r2 * 3, life: 0, max: ground ? 120 + r2 * 60 : 70 + r2 * 30, dark: r1 * 0.25,
        });
      }
    }
  }
  if (spawn) {
    for (const p of vis.puffs) (p.life++), (p.x += p.vx), (p.alt += p.va), (p.r += 0.0009), (p.vx *= 0.985);
    vis.puffs = vis.puffs.filter((p) => p.life < p.max);
    if (vis.puffs.length > 160) vis.puffs.splice(0, vis.puffs.length - 160);
  }
  for (const p of vis.puffs) {
    const y = gy(Math.max(0, p.alt)) - R(0.01);
    if (y > Y(PANEL_Y) + R(0.1) || y < -R(0.2)) continue;
    const a = (1 - p.life / p.max) * 0.85;
    ctx.globalAlpha = a;
    ctx.fillStyle = radg(ctx, X(p.x) - R(p.r) * 0.3, y - R(p.r) * 0.3, 0, R(p.r), [0, '#ffffff'], [0.7, mix('#f4f4f8', '#b8bcc8', p.dark)], [1, 'rgba(200,205,215,0)']);
    ell(ctx, X(p.x), y, R(p.r), R(p.r) * 0.85);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // ── 떨어진 단 ──
  for (const db of vis.debris) {
    const tt = t - db.t0;
    if (tt > 150) continue;
    const alt = db.alt + db.v0 * tt - 0.28 * tt * tt;
    const y = gy(alt), x = X(db.x + db.vx * tt);
    if (y > Y(PANEL_Y) + R(0.3)) continue;
    if (db.boost) {
      for (const sd of [-1, 1]) {
        ctx.save();
        ctx.translate(x + sd * R(0.13 + tt * 0.004), y - R(0.07));
        ctx.rotate(sd * (0.3 + tt * db.vr));
        drawBooster(ctx, 0, R(0.075), w, 0, t, sd);
        ctx.restore();
      }
      continue;
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(db.vr * tt);
    let yy = 0;
    const tot = db.parts.reduce((a, k) => a + P[k].h, 0);
    for (const k of db.parts) {
      drawPiece(ctx, k, 0, R(tot / 2) - R(yy), w, 0, t);
      yy += P[k].h;
    }
    ctx.restore();
  }
  vis.debris = vis.debris.filter((db) => t - db.t0 < 160);

  // ── 로켓 ──
  drawTheRocket(ctx, s, V, vis, X, Y, R, w, t);

  // 구경꾼 (땅 위)
  if (drop < R(0.2)) {
    const cheer = t - vis.cheer < 80, sad = t - vis.sad < 100;
    CROWD.forEach(([k, x, y], i) => drawCritter(ctx, k, X(x), Y(y) + drop, R(0.032), t, cheer, sad, i * 1.3));
    if (cheer && Math.floor(t / 18) % 2 === 0) {
      font(0.036, 900);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      txt(ctx, '와아!', X(0.2), Y(0.9) + drop, '#ffffff');
      txt(ctx, '짝짝!', X(0.9), Y(0.89) + drop, '#ffffff');
    }
  }
  // 높이 자
  drawGauge(ctx, s, V, vis, X, Y, R, font, t);
  // 큰 글자 (큰 순간)
  if (t - s.bigT < 70 && s.bigText) {
    const age = t - s.bigT, pop = age < 8 ? 0.6 + (age / 8) * 0.6 : age < 14 ? 1.2 - ((age - 8) / 6) * 0.2 : 1;
    ctx.save();
    ctx.globalAlpha = Math.min(1, (70 - age) / 15);
    ctx.translate(X(0.47), Y(0.27));
    ctx.scale(pop, pop);
    ctx.rotate(-0.05);
    font(0.085, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    txt(ctx, s.bigText, 0, 0, '#ffe14a', '#5a2a6a', 6, w * 0.9);
    ctx.restore();
  }
  ctx.restore();

  // ── 위 띠 · 아래 판 ──
  drawTop(ctx, s, R, font, w);
  ctx.drawImage(getPanel(Math.round(w), Math.min(3, Math.max(1, Math.round(sc)))), 0, Y(PANEL_Y), w, R(0.5));
  if (build) drawBuildPanel(ctx, s, vis, X, Y, R, font, w, t);
  else drawFlightPanel(ctx, s, V, vis, X, Y, R, font, w, t);
  drawBanner(ctx, s, X, Y, R, font, w, t, fx);
  void h;
}

function drawTower(ctx: C2, s: RocketState, V: View, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, drop: number, t: number) {
  const tx = X(0.17), base = Y(PAD_Y + 0.015) + drop, top = Y(0.3) + drop, tw = R(0.07);
  ctx.fillStyle = 'rgba(30,60,20,.25)';
  ell(ctx, tx, base + R(0.01), tw * 0.9, R(0.014));
  ctx.fill();
  // 격자 기둥
  ctx.lineWidth = Math.max(2, R(0.008));
  for (const sd of [-1, 1]) {
    ctx.strokeStyle = '#d8342a';
    ctx.beginPath();
    ctx.moveTo(tx + (sd * tw) / 2, base);
    ctx.lineTo(tx + (sd * tw) / 2.6, top);
    ctx.stroke();
  }
  ctx.lineWidth = Math.max(1.2, R(0.004));
  const n = 9;
  for (let i = 0; i < n; i++) {
    const y0 = base + ((top - base) * i) / n, y1 = base + ((top - base) * (i + 1)) / n;
    const w0 = tw / 2 - ((tw / 2 - tw / 2.6) * i) / n, w1 = tw / 2 - ((tw / 2 - tw / 2.6) * (i + 1)) / n;
    ctx.strokeStyle = i % 2 ? '#ffffff' : '#ff5a4a';
    ctx.beginPath();
    ctx.moveTo(tx - w0, y0);
    ctx.lineTo(tx + w1, y1);
    ctx.moveTo(tx + w0, y0);
    ctx.lineTo(tx - w1, y1);
    ctx.moveTo(tx - w1, y1);
    ctx.lineTo(tx + w1, y1);
    ctx.stroke();
  }
  // 꼭대기 불빛
  ctx.fillStyle = Math.floor(t / 30) % 2 ? '#ff3a3a' : '#ffb0a0';
  ell(ctx, tx, top - R(0.012), R(0.012), R(0.012));
  ctx.fill();
  // 팔 (로켓을 붙잡다가 발사하면 접힌다)
  const rh = rocketHeight(s.parts), scl = rocketScale(rh), armBack = V.mode === 'build' ? 0 : V.mode === 'ign' ? clamp(V.u * 1.5, 0, 1) : 1;
  const S = stackOf(s.parts, 0);
  for (const fy of [0.3, 0.72]) {
    if (rh * scl < 0.2 && fy > 0.5) continue;
    const ay = Y(PAD_Y - 0.01 - rh * scl * fy) + drop;
    if (ay < top) continue;
    const half = (rh * fy > S.top ? CAP_W * 0.48 : S.maxW / 2) * scl;
    const len = Math.max(R(0.02), (X(PAD_X) - tx - R(half) - R(0.004)) * (1 - armBack * 0.75));
    ctx.fillStyle = lin(ctx, 0, ay - R(0.01), 0, ay + R(0.01), [0, '#ff7a6a'], [1, '#b8302a']);
    ctx.fillRect(tx, ay - R(0.009), len, R(0.018));
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(tx, ay - R(0.009), len, R(0.018));
    ctx.fillStyle = '#ffffff';
    for (let q = R(0.012); q < len - R(0.01); q += R(0.03)) ctx.fillRect(tx + q, ay - R(0.004), R(0.012), R(0.008));
    ctx.fillStyle = '#5a5e70';
    ctx.fillRect(tx + len - R(0.008), ay - R(0.013), R(0.01), R(0.026));
  }
  void s;
}

function drawSkyThings(ctx: C2, s: RocketState, V: View, gy: (a: number) => number, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, font: (sz: number, wgt?: number) => void, t: number, fx: ReturnType<typeof juice>) {
  const d = STAGES[s.stage], f = s.fl;
  const flying = V.mode === 'asc' || V.mode === 'hold' || V.mode === 'desc';
  // 새 떼
  if (d.birds) {
    const nose = s.parts.includes('nose');
    for (let i = 0; i < 16; i++) {
      const alt = d.birds[0] + (d.birds[1] - d.birds[0]) * hsh(i + 120);
      const y = gy(alt);
      if (y < -R(0.05) || y > Y(PANEL_Y)) continue;
      let x = X(((hsh(i + 121) + t * 0.0007 * (i % 2 ? 1 : -1)) % 1 + 1) % 1), yy = y;
      const side = x < X(PAD_X) ? -1 : 1, dist = Math.abs(x - X(PAD_X));
      let hit = false;
      if (flying && V.alt > alt - 250 && dist < R(0.2)) {
        const past = Math.max(0, V.alt - alt + 250);
        if (nose) x += side * Math.min(R(0.16), R(past * KM * 0.6));
        else if (V.alt > alt - 60) {
          // 부딪혀 튕겨 나간다 (빙글빙글 · 엑스 눈)
          hit = true;
          const k = Math.min(1, (V.alt - alt + 60) / 500);
          x += side * R(0.25) * k;
          yy -= R(0.12) * k;
        }
      }
      bird(ctx, x, yy, R(0.024), t, i, hit);
      if (hit && Math.floor(t + i) % 17 === 0) fx.burst(x, yy, '#ffffff', 5, 2.2, 2);
    }
  }
  // 별 깃발 (높이 별)
  for (const q of d.stars) {
    if (q.k !== 'high') continue;
    const y = gy(q.n);
    if (y < -R(0.1) || y > Y(PANEL_Y)) continue;
    const x = X(0.16), bob = Math.sin(t * 0.06) * R(0.01);
    ctx.strokeStyle = 'rgba(255,255,255,.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + bob + R(0.035));
    ctx.lineTo(x, y + R(0.09));
    ctx.stroke();
    starPath(ctx, x, y + bob, R(0.038));
    ctx.fillStyle = (f?.res.apex ?? 0) >= q.n && flying ? '#ffe14a' : '#ffd23a';
    ctx.fill();
    ctx.strokeStyle = '#8a5a08';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    font(0.032, 900);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    txt(ctx, `${fmt(q.n)}m`, x + R(0.05), y + bob, '#fff6c0');
  }
  // 목표 줄 + 목표 그림
  const goalY = gy(d.goal);
  if (goalY > -R(0.2) && goalY < Y(PANEL_Y) + R(s.stage === 5 ? 0.6 : 0.1)) {
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.lineDashOffset = -t * 0.5;
    ctx.beginPath();
    ctx.moveTo(0, goalY);
    ctx.lineTo(X(GAUGE_X - 0.06), goalY);
    ctx.stroke();
    ctx.setLineDash([]);
    const reached = !!f && f.ok && (V.mode !== 'asc' || V.alt >= d.goal);
    if (d.spot === 'mag') {
      const sy = gy(stationAlt(s));
      ctx.fillStyle = 'rgba(255,230,120,.16)';
      ctx.fillRect(0, gy(d.goal + DOCK_BAND), X(GAUGE_X - 0.06), goalY - gy(d.goal + DOCK_BAND));
      drawGoalThing(ctx, s.stage, X(0.72), sy, R(0.2), t, reached && !!f?.dockOk);
    } else drawGoalThing(ctx, s.stage, X(0.66), goalY - R(0.04), R(0.17), t, reached);
    font(0.034, 900);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    txt(ctx, `${d.place} ${fmt(d.goal)}m`, X(0.03), goalY - R(0.008), '#ffffff');
  }
}

function drawTheRocket(ctx: C2, s: RocketState, V: View, vis: Vis, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, w: number, t: number) {
  const f = s.fl, parts = s.parts;
  const B = build(parts);
  if (V.mode === 'build') {
    // 발사대 위: 흔들림이 있으면 흔들흔들
    const age = t - s.attachT, sq = age < 16 ? 1 - Math.sin((age / 16) * Math.PI) * 0.08 : 1;
    const sway = B.wob > 0 ? Math.sin(t * 0.14) * 0.05 * Math.min(2, B.wob) : 0;
    const base = Y(PAD_Y - 0.008);
    const scale = rocketScale(vis.stackH);
    ctx.save();
    ctx.translate(X(PAD_X), base);
    ctx.rotate(sway);
    ctx.scale(scale, scale * sq);
    ctx.fillStyle = 'rgba(30,40,60,.25)';
    ell(ctx, 0, R(0.01), R(0.12), R(0.025));
    ctx.fill();
    const flying = age < ATTACH_T - 2 && s.lastPart >= 0;
    const shown = flying ? parts.slice(0, -1) : parts;
    const testFire = age < 34 && s.lastPart >= 0 && P[parts[s.lastPart]].thr > 0 && age > ATTACH_T - 2 ? 0.6 * (1 - (age - ATTACH_T) / 24) : 0;
    const mood: Mood = B.wob > 0 ? 'scared' : age < 30 ? 'wow' : s.parts.length ? 'happy' : 'idle';
    drawRocket(ctx, shown, 0, 0, w, { dropped: 0, boosters: shown.filter((k) => k === 'boost').length, flame: testFire, boostFlame: testFire * 0.6, fuel: () => 1, mood, wave: s.parts.length ? 0 : 1, t });
    ctx.restore();
    // 날아오는 부품
    const g = vis.ghost;
    if (g && t - g.t0 < ATTACH_T) {
      const u = ease((t - g.t0) / (ATTACH_T - 2));
      const S = stackOf(parts.slice(0, -1), 0);
      const ty = P[g.k].stack ? base - R(S.top) * scale : base - R(S.top + CAP_H * 0.6) * scale;
      const x = X(CARD_X[g.i]) + (X(PAD_X) - X(CARD_X[g.i])) * u, y = Y(CARD_Y) + (ty - Y(CARD_Y)) * u - Math.sin(u * Math.PI) * R(0.15);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((1 - u) * 0.6);
      cardArt(ctx, g.k, 0, 0, w * (0.7 + 0.3 * u), t);
      ctx.restore();
    }
    if (B.wob > 0 && Math.floor(t / 20) % 2 === 0) {
      ctx.font = `900 ${Math.max(13, R(0.04))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      txt(ctx, '흔들흔들!', X(PAD_X) + R(0.2), base - R(vis.stackH * scale * 0.6), '#ffe0ff');
    }
    // 고양이 말풍선
    const pr = vis.pred, d = STAGES[s.stage];
    const say = !parts.length ? (s.stage === 0 && !s.again ? '엔진 붙여 줘!' : '부품 붙여 줘!') : age < 40 && P[parts[parts.length - 1]].thr > 0 ? '부릉부릉!' : !pr ? '엔진이 있어야 날아…' : pr.tip ? '너무 무거워…' : B.wob > 0 ? '어지러워…' : pr.apex >= d.goal ? '이제 갈 수 있어!' : '조금만 더!';
    if (say && t - s.attachT > 14) {
      const capTop = base - R(vis.stackH * scale) - R(0.02);
      const bx = X(PAD_X) - R(0.17), by = Math.max(Y(0.17), capTop - R(0.02));
      ctx.font = `800 ${Math.max(12, R(0.034))}px system-ui, sans-serif`;
      const tw = ctx.measureText(say).width + R(0.04), th2 = R(0.05);
      const bl = clamp(bx - tw / 2, R(0.02), X(GAUGE_X) - R(0.05) - tw);
      ctx.fillStyle = 'rgba(40,30,70,.2)';
      rr(ctx, bl + 2, by - th2 + 3, tw, th2, th2 / 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      rr(ctx, bl, by - th2, tw, th2, th2 / 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(bl + tw * 0.7, by - 1);
      ctx.lineTo(bl + tw * 0.86, by + R(0.02));
      ctx.lineTo(bl + tw * 0.86 - R(0.025), by - 1);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 1.5;
      rr(ctx, bl, by - th2, tw, th2, th2 / 2);
      ctx.stroke();
      ctx.fillStyle = '#3a2a4e';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(say, bl + tw / 2, by - th2 / 2 + 1);
    }
    return;
  }
  if (V.mode === 'result') {
    // 착지한 캡슐 (낙하산이면 발사대 옆, 아니면 건초 더미)
    const chute = parts.includes('chute');
    const x = chute ? X(PAD_X + 0.04) : X(0.7), y = chute ? Y(PAD_Y - 0.01) : Y(0.915);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(chute ? 0 : 0.35);
    drawCapsule(ctx, 0, 0, w, { nose: false, chute: false, wings: 0, mag: false, mood: s.ok ? 'happy' : 'sad', wave: s.ok ? 1 : 0, t });
    ctx.restore();
    if (!chute) {
      ctx.fillStyle = '#ffe58a';
      for (let i = 0; i < 6; i++) {
        ctx.save();
        ctx.translate(X(0.62 + i * 0.03), Y(0.93 - (i % 2) * 0.01));
        ctx.rotate(i);
        ctx.fillRect(-R(0.015), -1, R(0.03), 2);
        ctx.restore();
      }
    }
    return;
  }
  if (!f) return;
  const step = V.step, fuel = fuelOf(f, step);
  const dropped = f.res.ev.filter((e) => e.k === 'drop' && e.step <= step).length;
  const boostOn = step < evStep(f, 'boostOff');
  const burning = step < evStep(f, 'burnout');
  const spin0 = evStep(f, 'spin');
  if (V.mode === 'ign' || V.mode === 'asc' || V.mode === 'tip') {
    const base = V.mode === 'tip' ? Y(PAD_Y - 0.008) : Y(PAD_Y - 0.008) - (V.alt - V.cam) * KM * w;
    const shake = V.mode === 'ign' ? Math.sin(t * 2.3) * R(0.004) * V.u : 0;
    const fu = V.mode === 'asc' ? clamp(V.u * 4, 0, 1) : 0;
    const scale = rocketScale(vis.stackH) * (1 - 0.22 * fu);
    ctx.save();
    ctx.translate(X(PAD_X) + shake, base);
    let mood: Mood = V.mode === 'ign' ? 'wow' : 'happy';
    if (V.mode === 'tip') {
      // 픽 쓰러져 데굴데굴
      const u = V.u, fall = clamp((u - 0.12) / 0.25, 0, 1), roll = clamp((u - 0.37) / 0.45, 0, 1);
      const shk = u < 0.12 ? Math.sin(t * 2.5) * 0.04 : 0;
      const half = (stackOf(parts, 0).maxW / 2) * w * rocketScale(vis.stackH);
      // 오른쪽 아래 모서리를 축으로 픽 → 땅에 누워 데굴데굴 (통통 튀며 굴러감)
      ctx.translate(half + R(0.2) * ease(roll), -Math.abs(Math.sin(roll * Math.PI * 3)) * R(0.03) * (1 - roll));
      ctx.rotate(shk + (Math.PI / 2) * (fall * fall) + Math.sin(roll * Math.PI * 6) * 0.06 * (1 - roll));
      ctx.translate(-half, 0);
      mood = fall > 0.5 ? 'dizzy' : 'scared';
    } else if (step >= spin0) ctx.rotate((step - spin0) * 0.5 + Math.sin(t * 0.2) * 0.1), (mood = 'dizzy');
    else if (V.mode === 'asc') ctx.rotate(Math.sin(t * 0.3) * 0.015);
    const dd = STAGES[s.stage];
    if (V.mode === 'asc' && dd.birds && !parts.includes('nose') && V.alt >= dd.birds[0] && V.alt <= dd.birds[1]) {
      ctx.translate(Math.sin(t * 1.9) * R(0.006), 0);
      if (t % 9 === 0) {
        const fx = juice(s), ny = base - R(vis.stackH * scale * 0.95);
        fx.burst(X(PAD_X), ny, '#ffffff', 8, 3, 2.4);
        fx.burst(X(PAD_X), ny, '#7aa8ff', 4, 2.5, 2);
        fx.pop(X(PAD_X) + R(t % 18 ? 0.12 : -0.12), ny, '꽥!', '#ffffff', Math.max(14, R(0.045)));
        fx.kick(2);
      }
    }
    ctx.scale(scale, scale);
    const fl = V.mode === 'ign' ? 0.5 + V.u * 0.6 : V.mode === 'tip' ? (V.u < 0.15 ? 0.7 : 0) : burning ? 1 : 0;
    drawRocket(ctx, parts, 0, 0, w, { dropped, boosters: boostOn ? B.acc.boost : 0, flame: fl, boostFlame: boostOn ? fl : 0, fuel, mood, wave: 0, t });
    ctx.restore();
    return;
  }
  // 꼭대기 · 내려옴 · 착지: 캡슐만
  const chute = parts.includes('chute');
  let x = X(PAD_X), y: number, rot = 0, mood: Mood = f.ok ? 'happy' : 'sad', wave = 0, open = 0;
  if (V.mode === 'hold') {
    const u = V.u, scale = rocketScale(vis.stackH) * 0.78, S = stackOf(parts, dropped);
    y = Y(ROCKET_SY) - R(S.top * scale) - R(0.04) * ease(u * 3);
    mood = f.ok ? 'proud' : 'wow';
    wave = f.ok ? 1 : 0;
    // 몸통은 '퐁' 떨어져 나간다
    if (u < 0.6) {
      ctx.save();
      ctx.globalAlpha = 1 - u / 0.6;
      ctx.translate(X(PAD_X), Y(ROCKET_SY) + R(0.45) * u * u);
      ctx.rotate(u * 0.8);
      ctx.scale(scale, scale);
      for (const p of S.pieces) drawPiece(ctx, p.k, 0, -p.y * w, w, 0, t);
      ctx.restore();
    }
    if (chute) open = clamp((u - 0.7) / 0.3, 0, 1);
    // 달 정거장 도킹 팔: 자석에 철컥
    if (f.dockOk) {
      const sy = Y(PAD_Y - (stationAlt(s) - V.cam) * KM), ax = X(0.72) - R(0.1), k = ease(u * 2.5);
      const tx = X(PAD_X) + R(0.02), ty = y - R(CAP_H) - R(0.05);
      ctx.strokeStyle = OUT;
      ctx.lineWidth = R(0.022);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(ax, sy);
      ctx.lineTo(ax + (tx - ax) * k, sy + (ty - sy) * k);
      ctx.stroke();
      ctx.strokeStyle = '#d8dce8';
      ctx.lineWidth = R(0.014);
      ctx.stroke();
      ctx.fillStyle = '#ffd84a';
      ell(ctx, ax + (tx - ax) * k, sy + (ty - sy) * k, R(0.014), R(0.014));
      ctx.fill();
    }
  } else if (V.mode === 'desc') {
    y = Y(0.5) - Math.max(0, (V.cam - Math.max(0, V.alt - (PAD_Y - 0.5) / KM)) * KM * w);
    if (V.alt < (PAD_Y - 0.5) / KM) y = Y(PAD_Y - 0.008) - V.alt * KM * w;
    if (chute) (open = 1), (x += Math.sin(t * 0.06) * R(0.02)), (wave = 1), (mood = 'happy');
    else (rot = t * 0.25), (mood = 'scared'), (x = X(PAD_X) + (X(0.7) - X(PAD_X)) * easeIO(V.u));
  } else {
    const u = V.u;
    if (chute) (x = X(PAD_X + 0.04)), (y = Y(PAD_Y - 0.01)), (open = 1 - u), (wave = 1);
    else (x = X(0.7)), (y = Y(0.915)), (rot = 0.35), (mood = f.ok ? 'dizzy' : 'sad');
  }
  if (open > 0) drawCanopy(ctx, x, y - R(CAP_H), R(0.11), t, open);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  drawCapsule(ctx, 0, 0, w, { nose: false, chute: chute && open <= 0, wings: 0, mag: parts.includes('mag') && V.mode === 'hold', mood, wave, t, open: open > 0 });
  ctx.restore();
}

function drawGauge(ctx: C2, s: RocketState, V: View, vis: Vis, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, font: (sz: number, wgt?: number) => void, t: number) {
  const d = STAGES[s.stage], gx = X(GAUGE_X), y0 = Y(GAUGE_BOT), y1 = Y(GAUGE_TOP), gw = R(0.05);
  const want = Math.max(gaugeMax(s.stage), V.mode === 'build' ? Math.max(vis.shown * 1.12, (vis.pred?.hi ?? 0) * 1.05) : (s.fl?.res.apex ?? 0) * 1.1);
  vis.gmax = vis.gmax ? vis.gmax + (want - vis.gmax) * 0.1 : want;
  const M = vis.gmax;
  const gyv = (m: number) => y0 - (y0 - y1) * clamp(m / M, 0, 1.02);
  // 자 몸통
  ctx.fillStyle = 'rgba(40,30,70,.28)';
  rr(ctx, gx - gw / 2 + 3, y1 - R(0.02) + 4, gw, y0 - y1 + R(0.04), gw / 2);
  ctx.fill();
  ctx.fillStyle = lin(ctx, gx - gw / 2, 0, gx + gw / 2, 0, [0, '#e8eef8'], [0.5, '#ffffff'], [1, '#c8d2e4']);
  rr(ctx, gx - gw / 2, y1 - R(0.02), gw, y0 - y1 + R(0.04), gw / 2);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // 하늘 색 띠
  ctx.save();
  rr(ctx, gx - gw / 2 + 3, y1 - R(0.02) + 3, gw - 6, y0 - y1 + R(0.04) - 6, gw / 2 - 3);
  ctx.clip();
  for (let i = 0; i < 20; i++) {
    const m0 = (M * i) / 20, m1 = (M * (i + 1)) / 20;
    ctx.fillStyle = skyAt(lvl(s.stage, m0))[0];
    ctx.fillRect(gx - gw / 2, gyv(m1), gw, gyv(m0) - gyv(m1) + 1);
  }
  // 새 떼 띠
  if (d.birds) {
    ctx.fillStyle = 'rgba(90,140,240,.55)';
    ctx.fillRect(gx - gw / 2, gyv(d.birds[1]), gw, gyv(d.birds[0]) - gyv(d.birds[1]));
  }
  // 정거장 띠
  if (d.spot === 'mag') {
    ctx.fillStyle = 'rgba(255,220,90,.75)';
    ctx.fillRect(gx - gw / 2, gyv(d.goal + DOCK_BAND), gw, gyv(d.goal) - gyv(d.goal + DOCK_BAND));
  }
  // 바람 폭 (미리 보기)
  const pred = vis.pred;
  if (pred && !pred.tip && pred.hi - pred.lo > 20 && V.mode === 'build') {
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.fillRect(gx - gw / 2, gyv(pred.hi), gw, gyv(pred.lo) - gyv(pred.hi));
  }
  ctx.restore();
  // 눈금
  ctx.strokeStyle = 'rgba(40,30,70,.45)';
  ctx.lineWidth = 1;
  const stepM = M > 5000 ? 1000 : M > 2000 ? 500 : 100;
  for (let m = stepM; m < M; m += stepM) {
    ctx.beginPath();
    ctx.moveTo(gx + gw / 2 - R(0.012), gyv(m));
    ctx.lineTo(gx + gw / 2, gyv(m));
    ctx.stroke();
  }
  if (d.birds) {
    const by = (gyv(d.birds[0]) + gyv(d.birds[1])) / 2;
    bird(ctx, gx, by, R(0.014), t, 1, false);
  }
  // 별 깃발
  for (const q of d.stars)
    if (q.k === 'high') {
      starPath(ctx, gx, gyv(q.n), R(0.018));
      ctx.fillStyle = '#ffd23a';
      ctx.fill();
      ctx.strokeStyle = '#8a5a08';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  // 목표 깃발
  const gY = gyv(d.goal);
  ctx.strokeStyle = '#6a4a2a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(gx - gw / 2 - R(0.005), gY);
  ctx.lineTo(gx + gw / 2 + R(0.005), gY);
  ctx.stroke();
  ctx.fillStyle = '#ff5a3a';
  ctx.beginPath();
  ctx.moveTo(gx + gw / 2, gY);
  ctx.lineTo(gx + gw / 2, gY - R(0.035));
  ctx.lineTo(gx + gw / 2 + R(0.035), gY - R(0.024));
  ctx.lineTo(gx + gw / 2, gY - R(0.013));
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // 지금 쏘면 여기까지 (만들 때) / 지금 높이 (날 때)
  if (V.mode === 'build') {
    const mv = vis.shown, py = gyv(mv), ok = !!pred && !pred.tip && pred.apex >= d.goal;
    if (!pred || Math.abs(py - gY) > R(0.05)) {
      font(0.028, 900);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      txt(ctx, `목표 ${fmt(d.goal)}m`, gx - gw / 2 - R(0.012), gY, '#ffffff', 'rgba(150,40,20,.8)', 3);
    }
    if (pred) {
      // 로켓에서 자까지 점선
      ctx.strokeStyle = ok ? 'rgba(80,220,90,.95)' : 'rgba(255,120,80,.95)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 5]);
      ctx.lineDashOffset = -t * 0.6;
      ctx.beginPath();
      ctx.moveTo(X(PAD_X + 0.12), py);
      ctx.lineTo(gx - gw / 2, py);
      ctx.stroke();
      ctx.setLineDash([]);
      // 화살 표시
      ctx.fillStyle = ok ? '#4ad05a' : '#ff6a3a';
      ctx.beginPath();
      ctx.moveTo(gx - gw / 2 - 2, py);
      ctx.lineTo(gx - gw / 2 - R(0.03), py - R(0.018));
      ctx.lineTo(gx - gw / 2 - R(0.03), py + R(0.018));
      ctx.closePath();
      ctx.fill();
      // 이름표
      font(0.032, 900);
      const lab = pred.tip ? '못 떠요!' : `여기까지 ${fmt(mv)}m${mv > M ? ' ↑' : ''}`;
      const tw = ctx.measureText(lab).width + R(0.03), lx = clamp(X(0.64), tw / 2 + 4, gx - gw / 2 - R(0.035) - tw / 2), ly = clamp(py - R(0.03), Y(0.12), Y(0.86));
      ctx.fillStyle = ok ? '#2a9a3a' : '#e0502a';
      rr(ctx, lx - tw / 2, ly - R(0.022), tw, R(0.044), R(0.022));
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(lab, lx, ly + 1);
    }
  } else if (s.fl && V.mode !== 'result') {
    const alt = V.mode === 'tip' ? 0 : V.alt, py = gyv(alt);
    ctx.save();
    ctx.translate(gx - gw / 2 - R(0.025), py);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(R(0.022), 0);
    ctx.lineTo(-R(0.01), -R(0.014));
    ctx.lineTo(-R(0.01), R(0.014));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#ff5a3a';
    ell(ctx, gx, py, R(0.012), R(0.012));
    ctx.fill();
  }
}

/** 카드 그림 (부품 미니어처) */
function cardArt(ctx: C2, k: PK, x: number, y: number, sc: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  const m = 0.55;
  if (P[k].stack) {
    const h = P[k].h * sc * m;
    ctx.scale(m, m);
    drawPiece(ctx, k, 0, (h / m) * 0.5 + (k === 'eng' || k === 'big' ? -0.012 * sc : 0), sc, 1, t);
  } else if (k === 'boost') {
    ctx.scale(0.62, 0.62);
    drawBooster(ctx, -0.035 * sc, 0.075 * sc, sc, 0, t, 0);
    drawBooster(ctx, 0.035 * sc, 0.075 * sc, sc, 0, t, 1);
  } else if (k === 'nose') {
    const nw = 0.09 * sc, nh = 0.085 * sc;
    ctx.fillStyle = lin(ctx, -nw / 2, 0, nw / 2, 0, [0, '#a01e24'], [0.3, '#ff8a7a'], [0.6, '#e83a3a'], [1, '#8a1a20']);
    ctx.beginPath();
    ctx.moveTo(-nw / 2, nh * 0.45);
    ctx.quadraticCurveTo(-nw * 0.4, -nh * 0.2, 0, -nh * 0.55);
    ctx.quadraticCurveTo(nw * 0.4, -nh * 0.2, nw / 2, nh * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else if (k === 'chute') {
    drawCanopy(ctx, 0, 0.06 * sc, 0.06 * sc, t, 1);
    ctx.fillStyle = '#ff7ab8';
    rr(ctx, -0.015 * sc, 0.035 * sc, 0.03 * sc, 0.025 * sc, 3);
    ctx.fill();
  } else if (k === 'wing') {
    for (const sd of [-1, 1]) {
      ctx.fillStyle = lin(ctx, 0, 0, sd * 0.06 * sc, 0, [0, '#ff5a4a'], [1, '#c02a2a']);
      ctx.beginPath();
      ctx.moveTo(sd * 0.006 * sc, -0.035 * sc);
      ctx.quadraticCurveTo(sd * 0.05 * sc, -0.015 * sc, sd * 0.065 * sc, 0.04 * sc);
      ctx.lineTo(sd * 0.01 * sc, 0.025 * sc);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
  } else if (k === 'mag') {
    const mw = 0.08 * sc;
    ctx.lineCap = 'butt';
    ctx.strokeStyle = OUT;
    ctx.lineWidth = mw * 0.42 + 3;
    ctx.beginPath();
    ctx.arc(0, 0, mw * 0.4, Math.PI, 0, true);
    ctx.stroke();
    ctx.strokeStyle = '#e83a3a';
    ctx.lineWidth = mw * 0.42;
    ctx.beginPath();
    ctx.arc(0, 0, mw * 0.4, Math.PI, 0, true);
    ctx.stroke();
    ctx.fillStyle = '#d8dce8';
    ctx.fillRect(-mw * 0.61, -mw * 0.12, mw * 0.42, mw * 0.16);
    ctx.fillRect(mw * 0.19, -mw * 0.12, mw * 0.42, mw * 0.16);
  }
  ctx.restore();
}
/** 무게·힘·연료 그림 막대 */
function barIcon(ctx: C2, kind: number, x: number, y: number, r: number) {
  if (kind === 0) {
    // 무게: 추
    ctx.fillStyle = '#5a5e70';
    ctx.beginPath();
    ctx.moveTo(x - r * 0.8, y + r * 0.8);
    ctx.lineTo(x - r * 0.55, y - r * 0.35);
    ctx.lineTo(x + r * 0.55, y - r * 0.35);
    ctx.lineTo(x + r * 0.8, y + r * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#5a5e70';
    ctx.lineWidth = Math.max(1.2, r * 0.25);
    ctx.beginPath();
    ctx.arc(x, y - r * 0.55, r * 0.3, Math.PI, 0);
    ctx.stroke();
  } else if (kind === 1) {
    ctx.fillStyle = '#ff6a2a';
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.bezierCurveTo(x + r * 0.25, y - r * 0.4, x + r * 0.85, y - r * 0.1, x + r * 0.6, y + r * 0.5);
    ctx.bezierCurveTo(x + r * 0.4, y + r * 0.95, x - r * 0.4, y + r * 0.95, x - r * 0.6, y + r * 0.5);
    ctx.bezierCurveTo(x - r * 0.75, y, x - r * 0.3, y - r * 0.3, x, y - r);
    ctx.fill();
    ctx.fillStyle = '#ffe14a';
    ell(ctx, x, y + r * 0.35, r * 0.3, r * 0.38);
    ctx.fill();
  } else {
    ctx.fillStyle = '#2a9af0';
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.bezierCurveTo(x + r * 0.3, y - r * 0.4, x + r * 0.75, y, x + r * 0.62, y + r * 0.45);
    ctx.arc(x, y + r * 0.3, r * 0.64, 0.25, Math.PI - 0.25);
    ctx.bezierCurveTo(x - r * 0.75, y, x - r * 0.3, y - r * 0.4, x, y - r);
    ctx.fill();
  }
}
function drawBuildPanel(ctx: C2, s: RocketState, vis: Vis, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, font: (sz: number, wgt?: number) => void, w: number, t: number) {
  const d = STAGES[s.stage], pred = vis.pred, eng = hasEngine(s.parts), left = slotsLeft(s);
  // 카드 셋
  for (let i = 0; i < 3; i++) {
    const c = s.hand[i];
    const cx = X(CARD_X[i]), cy = Y(CARD_Y), cw = R(CARD_W) - R(0.014), ch = R(CARD_H);
    const why = canAttach(s, c.k), can = !why;
    const age = t - c.born, flip = age < 0 ? 0 : age < 12 ? Math.abs(Math.sin((age / 12) * Math.PI * 0.5)) : 1;
    if (flip <= 0.02) continue;
    const shake = t - c.shake < 16 ? Math.sin((t - c.shake) * 1.6) * R(0.012) * (1 - (t - c.shake) / 16) : 0;
    const bob = can ? Math.sin(t * 0.09 + i * 1.7) * R(0.005) : 0;
    const isNew = !!s.spot && s.spot.k === c.k && t - s.spot.t < 240;
    const tip = firstTip(s) === i;
    const [col, dark] = KIND_COL[c.k];
    ctx.save();
    ctx.translate(cx + shake, cy + bob);
    ctx.scale(flip, flip);
    ctx.fillStyle = 'rgba(80,40,10,.35)';
    rr(ctx, -cw / 2 + 2, -ch / 2 + 5, cw, ch, R(0.025));
    ctx.fill();
    if (can && (isNew || tip)) {
      ctx.fillStyle = `rgba(255,230,90,${0.5 + 0.3 * Math.sin(t * 0.2)})`;
      rr(ctx, -cw / 2 - 5, -ch / 2 - 5, cw + 10, ch + 10, R(0.035));
      ctx.fill();
    }
    ctx.fillStyle = lin(ctx, 0, -ch / 2, 0, ch / 2, [0, '#fffdf6'], [1, '#f2e6cc']);
    rr(ctx, -cw / 2, -ch / 2, cw, ch, R(0.025));
    ctx.fill();
    ctx.save();
    rr(ctx, -cw / 2, -ch / 2, cw, ch, R(0.025));
    ctx.clip();
    ctx.fillStyle = lin(ctx, 0, -ch / 2, 0, -ch / 2 + R(0.05), [0, col], [1, dark]);
    ctx.fillRect(-cw / 2, -ch / 2, cw, R(0.05));
    ctx.fillStyle = radg(ctx, -cw * 0.18, -ch * 0.02, 0, cw * 0.45, [0, 'rgba(255,255,255,.95)'], [1, 'rgba(255,255,255,0)']);
    ctx.fillRect(-cw / 2, -ch / 2 + R(0.05), cw, ch);
    ctx.restore();
    ctx.strokeStyle = can ? '#8a5a20' : 'rgba(110,70,30,.45)';
    ctx.lineWidth = can ? 2.5 : 1.5;
    rr(ctx, -cw / 2, -ch / 2, cw, ch, R(0.025));
    ctx.stroke();
    // 이름
    font(0.034, 900);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(P[c.k].name, 0, -ch / 2 + R(0.026), cw - 6);
    // 그림
    cardArt(ctx, c.k, -cw * 0.2, -ch * 0.02, w * 0.95, t);
    // 막대 (무게·힘·연료)
    const bx = cw * 0.02, by0 = -ch / 2 + R(0.078), rowH = R(0.042);
    const vals = P[c.k].bars;
    for (let j = 0; j < 3; j++) {
      const yy = by0 + j * rowH;
      barIcon(ctx, j, bx, yy, R(0.014));
      for (let q = 0; q < 4; q++) {
        ctx.fillStyle = q < vals[j] ? (j === 0 ? '#6a6e84' : j === 1 ? '#ff6a1a' : '#2a8af0') : 'rgba(120,90,50,.16)';
        rr(ctx, bx + R(0.024) + q * R(0.02), yy - R(0.01), R(0.017), R(0.02), R(0.005));
        ctx.fill();
      }
    }
    // 특별 딱지
    const tag = P[c.k].tag;
    if (tag) {
      font(0.028, 900);
      const tw = ctx.measureText(tag).width + R(0.024);
      ctx.fillStyle = col;
      rr(ctx, -tw / 2, ch / 2 - R(0.042), tw, R(0.032), R(0.016));
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText(tag, 0, ch / 2 - R(0.025));
    }
    if (!can) {
      ctx.fillStyle = 'rgba(255,250,240,.6)';
      rr(ctx, -cw / 2, -ch / 2, cw, ch, R(0.025));
      ctx.fill();
    }
    if (isNew) {
      font(0.03, 900);
      ctx.fillStyle = '#ff3a5a';
      rr(ctx, cw / 2 - R(0.075), -ch / 2 - R(0.018), R(0.08), R(0.034), R(0.017));
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.fillText('NEW', cw / 2 - R(0.035), -ch / 2 - R(0.0));
    }
    ctx.restore();
  }
  // 부품 칸
  const bx0 = X(0.035), by0 = Y(BTN_Y - BTN_H / 2), bw = X(BTN_X - BTN_W / 2) - bx0 - R(0.02), bh = R(BTN_H);
  ctx.fillStyle = 'rgba(90,50,10,.25)';
  rr(ctx, bx0 + 2, by0 + 4, bw, bh, R(0.02));
  ctx.fill();
  ctx.fillStyle = lin(ctx, 0, by0, 0, by0 + bh, [0, '#5a4a7a'], [1, '#3a2e58']);
  rr(ctx, bx0, by0, bw, bh, R(0.02));
  ctx.fill();
  font(0.026, 800);
  ctx.fillStyle = '#e8e0ff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(`부품 칸 ${s.parts.length}/${d.slots}`, bx0 + bw / 2, by0 + R(0.008), bw - 4);
  const n = d.slots, per = Math.ceil(n / 2), cr = R(0.0125);
  for (let j = 0; j < n; j++) {
    const row = j < per ? 0 : 1, col = row ? j - per : j, cnt = row ? n - per : per;
    const cx = bx0 + bw / 2 + (col - (cnt - 1) / 2) * R(0.033), cy = by0 + R(0.048) + row * R(0.03);
    const used = j < s.parts.length;
    if (used) {
      const [c1, c2] = KIND_COL[s.parts[j]];
      ctx.fillStyle = radg(ctx, cx - cr * 0.3, cy - cr * 0.3, 0, cr, [0, c1], [1, c2]);
      ell(ctx, cx, cy, cr, cr);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    } else {
      ctx.strokeStyle = left === 1 && j === s.parts.length && Math.floor(t / 15) % 2 ? '#ffd84a' : 'rgba(230,220,255,.6)';
      ctx.setLineDash([3, 2]);
      ctx.lineWidth = 1.4;
      ell(ctx, cx, cy, cr, cr);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  // 발사 단추
  const ready = eng && !!pred && !pred.tip;
  const good = ready && pred!.apex >= d.goal;
  const bx = X(BTN_X), by = Y(BTN_Y), bwid = R(BTN_W), bht = R(BTN_H), press = firstTip(s) === 9;
  const pulse = good ? 1 + 0.03 * Math.sin(t * 0.2) : 1;
  ctx.save();
  ctx.translate(bx, by);
  ctx.scale(pulse, pulse);
  if (good || press) {
    ctx.fillStyle = `rgba(255,230,90,${0.45 + 0.3 * Math.sin(t * 0.2)})`;
    rr(ctx, -bwid / 2 - 6, -bht / 2 - 6, bwid + 12, bht + 12, R(0.05));
    ctx.fill();
  }
  ctx.fillStyle = eng ? '#8a1a1a' : '#6a6070';
  rr(ctx, -bwid / 2, -bht / 2 + R(0.012), bwid, bht, R(0.04));
  ctx.fill();
  ctx.fillStyle = eng ? lin(ctx, 0, -bht / 2, 0, bht / 2, [0, '#ff7a5a'], [0.5, '#f03a2a'], [1, '#c8201a']) : lin(ctx, 0, -bht / 2, 0, bht / 2, [0, '#c8c0d0'], [1, '#9a92a8']);
  rr(ctx, -bwid / 2, -bht / 2, bwid, bht - R(0.006), R(0.04));
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  rr(ctx, -bwid / 2 + R(0.02), -bht / 2 + R(0.008), bwid - R(0.04), bht * 0.32, R(0.02));
  ctx.fill();
  font(0.058, 900);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  txt(ctx, eng ? '발사!' : '엔진부터', R(0.03), -R(0.002), '#ffffff', eng ? '#7a1010' : '#4a4058', 4);
  // 작은 로켓 그림
  ctx.save();
  ctx.translate(-bwid / 2 + R(0.075), R(0.004));
  ctx.rotate(0.5);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(0, -R(0.035));
  ctx.quadraticCurveTo(R(0.015), -R(0.015), R(0.012), R(0.02));
  ctx.lineTo(-R(0.012), R(0.02));
  ctx.quadraticCurveTo(-R(0.015), -R(0.015), 0, -R(0.035));
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  if (eng) flame(ctx, 0, R(0.02), R(0.016), R(0.025), t, 3);
  ctx.restore();
  ctx.restore();
  // 별 줄 · 안내 줄
  drawStarsRow(ctx, s, vis, X, Y, R, font, w);
  hintLine(ctx, s, buildHint(s, vis), Y, R, font, w);
  // 처음 안내 손가락
  const tipI = firstTip(s);
  if (tipI >= 0) {
    const hx = tipI === 9 ? X(BTN_X + 0.12) : X(CARD_X[tipI] + 0.05), hy = tipI === 9 ? Y(BTN_Y) : Y(CARD_Y + 0.02);
    drawHand(ctx, hx, hy, R(0.085), Math.max(0, Math.sin(t * 0.15)));
  }
}
/** 1판 안내: 가리킬 카드(0~2) · 발사 단추(9) · 없음(-1) */
function firstTip(s: RocketState): number {
  if (s.stage !== 0 || s.again || s.launches > 0 || s.phase !== 'build') return -1;
  if (!s.parts.length) return s.hand.findIndex((c) => c.k === 'eng');
  return 9;
}
function buildHint(s: RocketState, vis: Vis): string {
  const d = STAGES[s.stage], pred = vis.pred;
  if (firstTip(s) >= 0 && !s.parts.length) return '👆 부품을 톡! 다 되면 발사!';
  if (!s.parts.length) return d.hint;
  if (!hasEngine(s.parts)) return slotsLeft(s) === 1 ? '마지막 칸은 엔진이어야 해요' : '엔진을 붙여야 날아요';
  if (!pred) return d.hint;
  if (pred.tip) return '너무 무거워요! 힘센 엔진을 붙이거나 그냥 쏴 보기';
  const B = build(s.parts);
  if (B.wob > 0) return B.acc.boost % 2 ? '한쪽만 무거워 빙글빙글 — 보조 로켓 짝이나 날개!' : '키가 커서 빙글빙글 — 날개를 달면 똑바로';
  if (d.spot === 'mag' && s.parts.includes('mag') && pred.apex > d.goal + DOCK_BAND) return `정거장을 지나쳐요 — ${fmt(d.goal + DOCK_BAND)}m 아래로`;
  if (pred.apex < d.goal) return `지금 쏘면 ${fmt(pred.apex)}m — ${fmt(d.goal - pred.apex)}m 더!`;
  if (pred.lo < d.goal) return '바람이 나쁘면 못 닿을 수도 — 더 붙일까, 쏠까?';
  if (slotsLeft(s) <= 0) return '칸이 다 찼어요 — 발사!';
  return `지금 쏘면 ${d.place} 도착! 더 붙일까, 쏠까?`;
}
function hintLine(ctx: C2, s: RocketState, text: string, Y: (y: number) => number, R: (r: number) => number, font: (sz: number, wgt?: number) => void, w: number) {
  font(0.034, 800);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#5a3210';
  ctx.fillText(text, w / 2, Y(1.468), w - R(0.06));
  void s;
}
function drawStarsRow(ctx: C2, s: RocketState, vis: Vis, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, font: (sz: number, wgt?: number) => void, w: number) {
  const d = STAGES[s.stage], pred = vis.pred;
  font(0.028, 800);
  const items = d.stars.map((q, j) => {
    const f = s.fl, passed = !!f && f.ok && (f.t > IGN + f.asc || flStep(f) >= evStep(f, 'pass'));
    const on = s.phase === 'result' ? s.ok && s.starOk[j] : s.phase === 'fly' ? passed && starMet(s, q, f!.res) : !!pred && !pred.tip && starPreview(s, q, pred);
    return { label: q.label, on, w: ctx.measureText(q.label).width + R(0.06) };
  });
  const gap = R(0.012), total = items.reduce((a, it) => a + it.w, 0) + gap * (items.length - 1);
  const k = Math.min(1, (w - R(0.03)) / total);
  let x = w / 2 - (total * k) / 2;
  const y = Y(1.412), hh = R(0.04);
  for (const it of items) {
    const ww = it.w * k;
    ctx.fillStyle = it.on ? '#fff3b0' : 'rgba(255,255,255,.55)';
    rr(ctx, x, y - hh / 2, ww, hh, hh / 2);
    ctx.fill();
    ctx.strokeStyle = it.on ? '#c88a10' : 'rgba(120,70,20,.35)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    starPath(ctx, x + R(0.022), y, R(0.014));
    ctx.fillStyle = it.on ? '#ffc21a' : 'rgba(255,255,255,.9)';
    ctx.fill();
    ctx.strokeStyle = it.on ? '#8a5a08' : 'rgba(120,70,20,.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = it.on ? '#6a3a08' : '#7a5a3a';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = `800 ${Math.max(12, R(0.028) * k)}px system-ui, sans-serif`;
    ctx.fillText(it.label, x + R(0.04), y + 1, ww - R(0.045));
    x += ww + gap * k;
  }
  void X;
}
function drawFlightPanel(ctx: C2, s: RocketState, V: View, vis: Vis, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, font: (sz: number, wgt?: number) => void, w: number, t: number) {
  const d = STAGES[s.stage], f = s.fl;
  // 고도계 화면
  const lx = X(0.05), ly = Y(1.03), lw = X(0.9), lh = R(0.15);
  ctx.fillStyle = 'rgba(90,50,10,.3)';
  rr(ctx, lx + 3, ly + 5, lw, lh, R(0.03));
  ctx.fill();
  ctx.fillStyle = lin(ctx, 0, ly, 0, ly + lh, [0, '#2a2e4a'], [1, '#1a1c34']);
  rr(ctx, lx, ly, lw, lh, R(0.03));
  ctx.fill();
  ctx.strokeStyle = '#8a6a3a';
  ctx.lineWidth = 3;
  ctx.stroke();
  const alt = s.phase === 'result' ? (f?.res.apex ?? 0) : V.mode === 'tip' || V.mode === 'ign' ? 0 : V.mode === 'desc' || V.mode === 'land' ? (f?.res.apex ?? 0) : V.alt;
  font(0.03, 800);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#8af0b0';
  ctx.fillText(s.phase === 'result' ? '최고 높이' : V.mode === 'desc' || V.mode === 'land' ? '최고 높이' : '높이', lx + R(0.03), ly + R(0.03));
  font(0.075, 900);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#b8ffd0';
  ctx.shadowColor = 'rgba(120,255,170,.7)';
  ctx.shadowBlur = 8;
  ctx.fillText(`${fmt(alt)} m`, lx + lw - R(0.03), ly + R(0.075));
  ctx.shadowBlur = 0;
  // 목표까지 막대
  const px0 = lx + R(0.03), px1 = lx + lw - R(0.03), py = ly + R(0.125), M = Math.max(d.goal * 1.15, alt * 1.02);
  ctx.fillStyle = 'rgba(255,255,255,.15)';
  rr(ctx, px0, py - R(0.008), px1 - px0, R(0.016), R(0.008));
  ctx.fill();
  ctx.fillStyle = alt >= d.goal ? '#7af07a' : '#ffb84a';
  rr(ctx, px0, py - R(0.008), (px1 - px0) * clamp(alt / M, 0, 1), R(0.016), R(0.008));
  ctx.fill();
  const gx = px0 + (px1 - px0) * (d.goal / M);
  ctx.fillStyle = '#ff5a3a';
  ctx.beginPath();
  ctx.moveTo(gx, py + R(0.012));
  ctx.lineTo(gx, py - R(0.03));
  ctx.lineTo(gx + R(0.025), py - R(0.022));
  ctx.lineTo(gx, py - R(0.014));
  ctx.fill();
  // 구경꾼 (관람석)
  const cheer = t - vis.cheer < 80 || (V.mode === 'asc' && V.alt >= d.goal), sad = t - vis.sad < 100 || (s.phase === 'result' && !s.ok);
  const crowd: Critter[] = ['bunny', 'bear', 'duck', 'pig', 'fox'];
  crowd.forEach((k, i) => drawCritter(ctx, k, X(0.12 + i * 0.19), Y(1.27), R(0.04), t, cheer, sad, i * 1.1));
  if (s.phase === 'result') {
    // 다음 단추
    const bx = X(0.5), by = Y(1.33), bw = R(0.5), bh = R(0.07);
    ctx.fillStyle = s.ok ? lin(ctx, 0, by - bh / 2, 0, by + bh / 2, [0, '#7ae07a'], [1, '#2a9a3a']) : lin(ctx, 0, by - bh / 2, 0, by + bh / 2, [0, '#ffb05a'], [1, '#e0702a']);
    rr(ctx, bx - bw / 2, by - bh / 2, bw, bh, bh / 2);
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 2;
    ctx.stroke();
    font(0.04, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    txt(ctx, s.ok ? (s.won ? '끝까지 날았다!' : '다음 판 ▶') : s.hearts > 0 ? '다시 조립 ▶' : '끝', bx, by + 1, '#ffffff', 'rgba(40,30,20,.5)', 3);
  } else if (cheer && Math.floor(t / 16) % 2 === 0) {
    font(0.034, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    txt(ctx, '와아아!', X(0.31), Y(1.2), '#ffffff');
    txt(ctx, '날아라!', X(0.69), Y(1.2), '#ffffff');
  }
  drawStarsRow(ctx, s, vis, X, Y, R, font, w);
  hintLine(ctx, s, s.phase === 'result' ? (s.won ? `모든 판 끝! 별 ${s.stars}개` : s.ok ? '톡 하면 다음 판' : s.hearts > 0 ? '톡 하면 다시 조립' : '하트가 없어요 — 끝') : V.mode === 'ign' ? '3, 2, 1… 점화!' : V.mode === 'tip' ? '너무 무거워서 못 떴어요…' : '비행은 저절로! 구경해요', Y, R, font, w);
}
function drawTop(ctx: C2, s: RocketState, R: (r: number) => number, font: (sz: number, wgt?: number) => void, w: number) {
  const d = STAGES[s.stage], hb = R(0.085);
  ctx.fillStyle = lin(ctx, 0, 0, 0, hb, [0, 'rgba(255,252,240,.96)'], [1, 'rgba(255,240,210,.93)']);
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
  ctx.fillText(d.name, R(0.1), cy + 1, R(0.36));
  const nw = Math.min(R(0.36), ctx.measureText(d.name).width);
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
}
function drawBanner(ctx: C2, s: RocketState, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, font: (sz: number, wgt?: number) => void, w: number, t: number, fx: ReturnType<typeof juice>) {
  const d = STAGES[s.stage];
  let head = '', sub = '', a = 0, age = 0, cy = Y(0.42);
  if (s.phase === 'result') {
    age = s.pt;
    a = Math.min(1, age / 8);
    cy = Y(s.ok ? 0.36 : 0.45);
    if (s.ok) head = s.won ? '달까지 다녀왔다!' : `${d.place} 도착!`;
    else (head = '으앗, 못 닿았다…'), (sub = s.hearts > 0 ? `${s.why} · 하트 -1 · 같은 판 다시` : '하트가 없어요 — 끝');
  } else if (s.banner && s.phase === 'build' && t - s.banner.t < BANNER_T) {
    age = t - s.banner.t;
    a = Math.min(1, age / 8, (BANNER_T - age) / 25);
    (head = s.banner.head), (sub = s.banner.sub);
  }
  if (!head || a <= 0) return;
  const pop = Math.min(1, 0.5 + age / 10);
  ctx.save();
  ctx.globalAlpha = a;
  font(0.052, 900);
  const w1 = ctx.measureText(head).width;
  font(0.032, 800);
  const w2 = sub ? ctx.measureText(sub).width : 0;
  const okRes = s.phase === 'result' && s.ok;
  const cw = Math.min(w - R(0.04), Math.max(w1, w2, okRes ? R(0.5) : 0) + R(0.1)), ch = (okRes ? R(0.17) : sub ? R(0.14) : R(0.09)) * pop;
  ctx.translate(w / 2, cy);
  ctx.fillStyle = 'rgba(40,30,70,.3)';
  rr(ctx, -cw / 2 + 3, -ch / 2 + 5, cw, ch, R(0.035));
  ctx.fill();
  ctx.fillStyle = lin(ctx, 0, -ch / 2, 0, ch / 2, [0, '#fffaf0'], [1, '#ffe8c0']);
  rr(ctx, -cw / 2, -ch / 2, cw, ch, R(0.035));
  ctx.fill();
  ctx.strokeStyle = '#8a5a20';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = s.phase === 'result' ? (s.ok ? '#ff6a3a' : '#7a8aa8') : '#3d9df5';
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo((sd * cw) / 2, -ch * 0.25);
    ctx.lineTo(sd * (cw / 2 + R(0.035)), -ch * 0.3);
    ctx.lineTo(sd * (cw / 2 + R(0.02)), 0);
    ctx.lineTo(sd * (cw / 2 + R(0.035)), ch * 0.3);
    ctx.lineTo((sd * cw) / 2, ch * 0.25);
    ctx.closePath();
    ctx.fill();
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  font(0.052, 900);
  ctx.fillStyle = s.phase === 'result' ? (s.ok ? '#d0500a' : '#5a6a88') : '#2a5a9a';
  if (okRes) {
    ctx.fillText(head, 0, -R(0.045), w - R(0.1));
    const nS = s.starOk.length;
    for (let j = 0; j < nS; j++) {
      const ag = s.pt - (16 + j * 14);
      const sx = (j - (nS - 1) / 2) * R(0.09), sy = R(0.03);
      const popS = ag < 0 ? 0.8 : ag < 8 ? 1.9 - 0.9 * (ag / 8) : 1;
      starPath(ctx, sx, sy, R(0.036) * popS);
      ctx.fillStyle = ag >= 0 && s.starOk[j] ? '#ffc93a' : 'rgba(90,50,20,.15)';
      ctx.fill();
      ctx.strokeStyle = ag >= 0 && s.starOk[j] ? '#9a5a08' : 'rgba(90,50,20,.35)';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      if (ag >= 0 && s.starOk[j] && (fx.memo['st' + j] ?? -1) < s.t - ag) (fx.memo['st' + j] = s.t - ag), fx.burst(w / 2 + sx, cy + sy, '#ffd23a', 16, 3, 2.4);
    }
  } else {
    ctx.fillText(head, 0, sub ? -R(0.026) : R(0.002), w - R(0.1));
    if (sub) {
      font(0.032, 800);
      ctx.fillStyle = sub.startsWith('NEW') ? '#d0402a' : '#6a4a2a';
      ctx.fillText(sub, 0, R(0.032), w - R(0.1));
    }
  }
  ctx.restore();
  void X;
}

/** 시험·스크린샷용: k판(0부터)으로 바로 */
export function jumpTo(s: RocketState, k: number, parts: PK[] = []) {
  s.stage = k;
  s.again = false;
  newStage(s);
  s.parts = parts.slice();
}
export { fly as rocketFly, predict as rocketPredict, P as ROCKET_PARTS };
