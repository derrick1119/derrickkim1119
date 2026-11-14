/**
 * 주사위 족보 장터 (27라운드: 오래 검증된 전략형 캐주얼 뼈대 × 공장의 와우) — 주사위 족보 × 가리키기(톡) × 턴제.
 * 뼈대: 오래된 '주사위 족보' 놀이. 주사위 다섯 개를 굴리고, 남길 주사위를 골라 두 번까지 다시 굴린 뒤, 족보 칸 하나에 점수를 적는다(칸마다 한 번).
 * 조작(기준 9): 나무 컵을 톡 = 데굴데굴 굴리기 · 주사위를 톡 = 받침에 올려 남기기/내리기 · 장부 칸을 톡 = 적기
 *   (칸을 누르고 있으면 그 칸에 적힐 점수와 '목표까지 얼마'가 말풍선으로 보이고, 떼면 쾅 도장). 키보드는 화살표 커서 + 스페이스.
 * 규칙(결정적, 주사위는 s.rng): 장터 하루 = 장부 칸 5~7개. 칸을 다 채우면 하루 끝. 합계가 목표를 넘으면 ★, 손님 주문 족보를 적으면 ★,
 *   대박 점수를 넘으면 ★. 목표를 못 넘으면 하트 -1, 그 날을 다시. 하트 셋을 다 잃거나 7일을 마치면 끝.
 * 와우(비틀기): 🟡 황금 주사위 — 황금 주사위가 낀 족보는 점수가 두 배. 어떤 족보를 노릴지가 '황금 주사위가 무슨 눈이냐'로 바뀐다.
 * 펼쳐짐(하는 일이 바뀐다): 1일 굴리기·남기기·적기 + 🐷 손님 주문 → 2일 🟡 황금 주사위(황금 눈 중심으로 모으기)
 *   → 3일 🎁 덤 보너스(4·5·6 칸 합이 넘으면 +30 — 여러 턴에 걸쳐 모으기) → 4일 🪨 무거운 주사위(다시 못 굴림 — 그 눈에 맞춰 노리기)
 *   → 5일 🌦️ 날씨 예보(턴마다 굴리기 2·3·4번 — 어려운 족보는 무지개 턴에) → 6일 🔄 뒤집개(주사위를 반대 눈으로, 하루 2번 — 언제 쓸까)
 *   → 7일 🎪 대축제(황금·날씨·뒤집개·보너스 + 손님 둘, 급한 손님은 ⏰ 3번째 적기까지).
 * 쾌감: 주사위가 멈추는 순간 족보가 맞으면 그 주사위들이 반짝 + 족보 이름이 튀어 오르고 손님이 환호. 큰 족보(네 쌍둥이·큰 줄)는
 *   화면 흔들림 + 잠깐 느려짐 + 큰 숫자, 다섯 쌍둥이는 장터 전체가 축제(폭죽·꽃가루·구경꾼 펄쩍). 족보를 이어 적으면 구경꾼이 하나씩 모여든다.
 * 웃음: 너구리 사장이 컵을 흔들 땐 볼이 빵빵(힘줌), 족보가 나오면 눈이 동그래지고, 대박이면 코를 치켜들고 우쭐,
 *   0점을 적으면 식은땀, 하루를 망치면 뒤로 데굴 넘어져 어질어질 별. 손님(돼지 상인·닭 할머니·곰 요리사…)은 주문이 오면 펄쩍.
 */
import { mulberry32, shuffle, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.45;
const STAR_PTS = 100, WIN_PTS = 100;
const ROLL_T = 30, WRITE_T = 26, RESULT_OK = 170, RESULT_FAIL = 150, NEWS_T = 200;

// ───────────────────────────── 족보 ─────────────────────────────
export type SlotT = 'n1' | 'n2' | 'n3' | 'n4' | 'n5' | 'n6' | 'three' | 'four' | 'full' | 'small' | 'large' | 'five' | 'chance';
export const SLOT_NAME: Record<SlotT, string> = {
  n1: '1 모으기', n2: '2 모으기', n3: '3 모으기', n4: '4 모으기', n5: '5 모으기', n6: '6 모으기',
  three: '세 쌍둥이', four: '네 쌍둥이', full: '셋+둘', small: '작은 줄', large: '큰 줄', five: '다섯 쌍둥이', chance: '아무거나',
};
export const SLOT_RULE: Record<SlotT, string> = {
  n1: '1 눈만 더해요', n2: '2 눈만 더해요', n3: '3 눈만 더해요', n4: '4 눈만 더해요', n5: '5 눈만 더해요', n6: '6 눈만 더해요',
  three: '같은 눈 셋 → 그 셋의 합', four: '같은 눈 넷 → 그 넷의 합', full: '같은 눈 셋 + 같은 눈 둘 → 25',
  small: '이어진 눈 넷 → 30', large: '이어진 눈 다섯 → 40', five: '다섯 개가 다 같은 눈 → 50', chance: '다섯 개 눈을 다 더해요',
};
const isNum = (t: SlotT) => t[0] === 'n';
const COMBO_RANK: Partial<Record<SlotT, number>> = { three: 1, small: 2, full: 3, four: 4, large: 5, five: 6 };

/** 족보 점수: cnt[1..6] = 눈별 개수, gold = 황금 주사위 눈(없으면 0). 황금 주사위가 족보에 끼면 ×2 */
export function scoreOf(t: SlotT, cnt: number[], gold: number): number {
  let v = 0, g = false;
  if (t === 'three' || t === 'four') {
    const need = t === 'three' ? 3 : 4;
    for (let f = 6; f >= 1; f--)
      if (cnt[f] >= need) {
        v = need * f;
        g = gold === f;
        break;
      }
  } else if (t === 'full') {
    let h3 = false, h2 = false, h5 = false;
    for (let f = 1; f <= 6; f++) (cnt[f] === 3 && (h3 = true)), (cnt[f] === 2 && (h2 = true)), (cnt[f] === 5 && (h5 = true));
    if ((h3 && h2) || h5) (v = 25), (g = gold > 0);
  } else if (t === 'small') {
    for (let a = 1; a <= 3; a++)
      if (cnt[a] && cnt[a + 1] && cnt[a + 2] && cnt[a + 3]) {
        v = 30;
        if (gold >= a && gold <= a + 3) g = true;
      }
  } else if (t === 'large') {
    if (cnt[2] && cnt[3] && cnt[4] && cnt[5] && (cnt[1] || cnt[6])) (v = 40), (g = gold > 0);
  } else if (t === 'five') {
    for (let f = 1; f <= 6; f++) if (cnt[f] === 5) (v = 50), (g = gold > 0);
  } else if (t === 'chance') {
    for (let f = 1; f <= 6; f++) v += f * cnt[f];
    g = gold > 0;
  } else {
    const k = +t[1];
    v = k * cnt[k];
    g = gold === k;
  }
  return g && v > 0 ? v * 2 : v;
}
export const cntOf = (d: number[]) => {
  const c = [0, 0, 0, 0, 0, 0, 0];
  for (const f of d) if (f) c[f]++;
  return c;
};
/** 그 칸에 적을 때 족보를 이루는 주사위 (반짝 표시용) */
export function partsOf(t: SlotT, d: number[]): boolean[] {
  const c = cntOf(d), out = d.map(() => false);
  const mark = (pred: (f: number) => boolean, max = 5) => {
    let n = 0;
    d.forEach((f, i) => {
      if (n < max && pred(f)) (out[i] = true), n++;
    });
  };
  if (scoreOf(t, c, 0) <= 0) return out;
  if (t === 'three' || t === 'four') {
    const need = t === 'three' ? 3 : 4;
    for (let f = 6; f >= 1; f--) if (c[f] >= need) return mark((x) => x === f, 5), out;
  } else if (t === 'small') {
    for (let a = 3; a >= 1; a--)
      if (c[a] && c[a + 1] && c[a + 2] && c[a + 3]) {
        const used = new Set<number>();
        d.forEach((f, i) => {
          if (f >= a && f <= a + 3 && !used.has(f)) used.add(f), (out[i] = true);
        });
        return out;
      }
  } else if (isNum(t)) mark((x) => x === +t[1]);
  else return d.map(() => true);
  return out;
}
/** 지금 주사위로 적을 수 있는 가장 큰 족보 (멈추는 순간 반짝용): 오늘 장부의 빈 칸 중에서만. 다섯 쌍둥이는 언제나 축제 */
export function bestCombo(d: number[], open?: SlotT[]): SlotT | null {
  const c = cntOf(d);
  if (scoreOf('five', c, 0) > 0) return 'five';
  const order: SlotT[] = ['large', 'four', 'full', 'small', 'three'];
  for (const t of order) if (scoreOf(t, c, 0) > 0 && (!open || open.includes(t))) return t;
  return null;
}

// ───────────────────────────── 장터 하루 ─────────────────────────────
export interface DayDef {
  key: string; name: string; emoji: string; news: string; tip: string;
  slots: SlotT[];
  /** 특수 주사위: 0 없음 · 1 🟡 황금(족보에 끼면 ×2) · 2 🪨 무거움(다시 못 굴림) */
  mode: Mode;
  weather: boolean; flips: number;
  bonus: { B: number; v: number } | null;
  /** 손님 주문 후보 · 주문 수 · 첫 주문의 마감(몇 번째 적기까지, 0 없음) */
  cand: SlotT[]; orders: number; dl: number;
  cust: number[];
  T1: number; T3: number;
}
export type Mode = 0 | 1 | 2;
export const DAYS: DayDef[] = [
  { key: 'basic', name: '첫 장날', emoji: '🌱', news: '🎲 컵을 톡 → 데굴데굴! 남길 주사위를 톡, 칸을 톡해 적어요', tip: '같은 눈을 남기고 다시 굴려요 (두 번까지)', slots: ['n5', 'n6', 'three', 'full', 'small', 'chance'], mode: 0, weather: false, flips: 0, bonus: null, cand: ['three'], orders: 1, dl: 0, cust: [0], T1: 15, T3: 108 },
  { key: 'gold', name: '황금 주사위', emoji: '🟡', news: '🟡 황금 주사위가 낀 족보는 점수가 두 배!', tip: '🟡 황금 주사위 눈에 맞춰 모아요', slots: ['n4', 'n5', 'n6', 'three', 'full', 'chance'], mode: 1, weather: false, flips: 0, bonus: null, cand: ['full', 'three'], orders: 1, dl: 0, cust: [1], T1: 54, T3: 165 },
  { key: 'bonus', name: '덤 보너스', emoji: '🎁', news: '🎁 4·5·6 칸 합이 36을 넘으면 덤 +30!', tip: '🎁 4·5·6은 셋씩 모으면 덤이 와요', slots: ['n4', 'n5', 'n6', 'three', 'small', 'chance'], mode: 0, weather: false, flips: 0, bonus: { B: 36, v: 30 }, cand: ['small', 'three'], orders: 1, dl: 0, cust: [2], T1: 58, T3: 130 },
  { key: 'heavy', name: '무거운 주사위', emoji: '🪨', news: '🪨 돌 주사위는 다시 못 굴려요 — 그 눈에 맞춰요', tip: '🪨 돌 주사위 눈으로 무엇을 노릴까?', slots: ['three', 'four', 'full', 'small', 'large', 'chance'], mode: 2, weather: false, flips: 0, bonus: null, cand: ['full', 'large', 'four'], orders: 1, dl: 0, cust: [3], T1: 45, T3: 105 },
  { key: 'weather', name: '날씨 예보', emoji: '🌦️', news: '🌦️ 날씨마다 굴리기 수가 달라요 — 🌈 4번 · ☀️ 3번 · 🌧️ 2번', tip: '🌈 무지개 턴에 어려운 족보를!', slots: ['n5', 'n6', 'three', 'full', 'large', 'chance'], mode: 0, weather: true, flips: 0, bonus: null, cand: ['large', 'full'], orders: 1, dl: 0, cust: [4], T1: 50, T3: 105 },
  { key: 'flip', name: '뒤집개', emoji: '🔄', news: '🔄 뒤집개를 톡 → 주사위를 톡: 반대 눈으로 (하루 2번)', tip: '🔄 1↔6 · 2↔5 · 3↔4 — 아껴 써요', slots: ['three', 'four', 'full', 'small', 'five', 'chance'], mode: 0, weather: false, flips: 2, bonus: null, cand: ['four', 'full', 'small'], orders: 1, dl: 0, cust: [5], T1: 55, T3: 110 },
  { key: 'fest', name: '대축제', emoji: '🎪', news: '🎪 대축제! 손님 둘 — 급한 손님은 ⏰ 3번째 적기까지', tip: '⏰ 급한 손님부터 · 🟡 황금 · 🌈 날씨 · 🔄 뒤집개', slots: ['n4', 'n5', 'n6', 'three', 'full', 'small', 'large', 'chance'], mode: 1, weather: true, flips: 2, bonus: { B: 36, v: 30 }, cand: ['full', 'small', 'three'], orders: 2, dl: 3, cust: [0, 1], T1: 120, T3: 330 },
];
export const DAY_COUNT = DAYS.length;

export interface Order { k: number; dl: number; who: number }
export interface DayInst {
  si: number; def: DayDef; slots: SlotT[]; orders: Order[]; weather: number[]; sp: number; mode: Mode;
}
export function makeDay(seed: number, si: number): DayInst {
  const d = DAYS[si], r = mulberry32((seed * 7919 + si * 104729 + 31) >>> 0);
  const n = d.slots.length;
  const cand = shuffle(d.cand.slice(), r).slice(0, d.orders);
  const orders = cand.map((t, j) => ({ k: d.slots.indexOf(t), dl: j === 0 ? d.dl : 0, who: d.cust[j % d.cust.length] }));
  let weather = Array(n).fill(3);
  if (d.weather) {
    const pool = [2, 4, 2, 4, 3, 3, 3, 3].slice(0, n);
    weather = shuffle(pool, r);
  }
  const sp = d.mode ? Math.floor(r() * 5) : -1;
  return { si, def: d, slots: d.slots, orders, weather, sp, mode: d.mode };
}

// ───────────────────────────── 하루 진행 (봇·화면 공용) ─────────────────────────────
export interface Play {
  D: DayInst; sc: number[]; writes: number; dice: number[]; held: boolean[]; rolls: number; rolled: boolean;
  flips: number; ord: number[]; total: number; numSum: number; bonus: boolean; over: boolean;
}
export function newPlay(D: DayInst): Play {
  const P: Play = { D, sc: D.slots.map(() => -1), writes: 0, dice: [0, 0, 0, 0, 0], held: [false, false, false, false, false], rolls: 3, rolled: false, flips: D.def.flips, ord: D.orders.map(() => 0), total: 0, numSum: 0, bonus: false, over: false };
  newTurn(P);
  return P;
}
function newTurn(P: Play) {
  P.dice = [0, 0, 0, 0, 0];
  P.held = [false, false, false, false, false];
  P.rolls = P.D.weather[P.writes] ?? 3;
  P.rolled = false;
}
const isHeavy = (P: Play, i: number) => P.D.mode === 2 && i === P.D.sp;
export const goldFace = (P: Play) => (P.D.mode === 1 ? P.dice[P.D.sp] : 0);
export const canRoll = (P: Play) => !P.over && P.rolls > 0 && (!P.rolled || P.dice.some((_, i) => !P.held[i] && !isHeavy(P, i)));
/** 굴리기: 굴러간 주사위 번호를 돌려준다 */
export function doRoll(P: Play, rng: Rng, rig?: number[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < 5; i++) {
    if (P.rolled && (P.held[i] || isHeavy(P, i))) continue;
    P.dice[i] = rig ? rig[i] : 1 + Math.floor(rng() * 6);
    out.push(i);
  }
  P.rolls--;
  P.rolled = true;
  return out;
}
export const canHold = (P: Play, i: number) => P.rolled && !P.over && !isHeavy(P, i);
export function flipDie(P: Play, i: number) {
  P.dice[i] = 7 - P.dice[i];
  P.flips--;
}
export const slotScore = (P: Play, k: number) => scoreOf(P.D.slots[k], cntOf(P.dice), goldFace(P));
export interface WriteRes { k: number; v: number; gold: boolean; hit: number[]; miss: number[]; bonus: boolean }
export function writeSlot(P: Play, k: number): WriteRes {
  const D = P.D, t = D.slots[k], c = cntOf(P.dice), v = scoreOf(t, c, goldFace(P));
  const gold = D.mode === 1 && v > 0 && v === 2 * scoreOf(t, c, 0);
  P.sc[k] = v;
  P.writes++;
  P.total += v;
  if (isNum(t)) P.numSum += v;
  const hit: number[] = [], miss: number[] = [];
  D.orders.forEach((o, j) => {
    if (P.ord[j]) return;
    if (o.k === k) {
      if (v > 0 && (!o.dl || P.writes <= o.dl)) (P.ord[j] = 1), hit.push(j);
      else (P.ord[j] = -1), miss.push(j);
    } else if (o.dl && P.writes >= o.dl) (P.ord[j] = -1), miss.push(j);
  });
  let bonus = false;
  if (D.def.bonus && !P.bonus && P.numSum >= D.def.bonus.B) (P.bonus = true), (P.total += D.def.bonus.v), (bonus = true);
  if (P.writes >= D.slots.length) P.over = true;
  else newTurn(P);
  return { k, v, gold, hit, miss, bonus };
}
export const ordersOk = (P: Play) => P.ord.every((x) => x === 1);
export const starsOf = (P: Play) => (P.total >= P.D.def.T1 ? 1 + (ordersOk(P) ? 1 : 0) + (P.total >= P.D.def.T3 ? 1 : 0) : 0);

// ───────────────────────────── 내다보기 (주사위 묶음 표) ─────────────────────────────
/** 눈별 개수 묶음(크기 0~5) 462개: 개수 · 크기 · 눈 하나 더한 묶음 · 부분 묶음 · 굴려서 나올 확률 */
const MSC: number[][] = [], MSN: number[] = [];
const MSID = new Map<number, number>();
const codeOf = (c: number[]) => c[1] + 6 * (c[2] + 6 * (c[3] + 6 * (c[4] + 6 * (c[5] + 6 * c[6]))));
{
  const c = [0, 0, 0, 0, 0, 0, 0];
  const rec = (f: number, left: number) => {
    if (f > 6) {
      MSID.set(codeOf(c), MSC.length);
      MSC.push(c.slice());
      MSN.push(5 - left);
      return;
    }
    for (let k = 0; k <= left; k++) (c[f] = k), rec(f + 1, left - k);
    c[f] = 0;
  };
  rec(1, 5);
}
const NM = MSC.length, NS = NM * 7;
const ADD = new Int32Array(NM * 7).fill(-1);
const BYN: number[][] = [[], [], [], [], [], []];
const SUBS: number[][] = [];
const PROB = new Float64Array(NM);
const FACT = [1, 1, 2, 6, 24, 120];
for (let id = 0; id < NM; id++) {
  const c = MSC[id];
  BYN[MSN[id]].push(id);
  if (MSN[id] < 5) for (let f = 1; f <= 6; f++) (c[f]++, (ADD[id * 7 + f] = MSID.get(codeOf(c))!), c[f]--);
  let p = FACT[MSN[id]];
  for (let f = 1; f <= 6; f++) p /= FACT[c[f]];
  PROB[id] = p / Math.pow(6, MSN[id]);
  const subs: number[] = [], k = [0, 0, 0, 0, 0, 0, 0];
  const rec = (f: number) => {
    if (f > 6) return void subs.push(MSID.get(codeOf(k))!);
    for (let j = 0; j <= c[f]; j++) (k[f] = j), rec(f + 1);
    k[f] = 0;
  };
  rec(1);
  SUBS.push(subs);
}
/** 남긴 묶음의 기대값 (한 개씩 더해 가며): prev = 다음 단계 상태값. 키 = 묶음*7 + 특수 주사위 눈(0~5, 6 = 없음/안 남김) */
function expectKeep(mode: Mode, prev: Float64Array): Float64Array {
  const nN = mode ? 4 : 5, E = new Float64Array(NS);
  for (let n = nN; n >= 0; n--)
    for (const id of BYN[n]) {
      const b = id * 7;
      const avg = (sp: number) => {
        let a = 0;
        for (let f = 1; f <= 6; f++) a += E[ADD[b + f] * 7 + sp];
        return a / 6;
      };
      if (mode === 0) E[b + 6] = n === nN ? prev[b + 6] : avg(6);
      else {
        for (let sp = 0; sp < 6; sp++) E[b + sp] = n === nN ? prev[b + sp] : avg(sp);
        if (mode === 1) {
          if (n === nN) {
            let a = 0;
            for (let sp = 0; sp < 6; sp++) a += E[b + sp];
            E[b + 6] = a / 6;
          } else E[b + 6] = avg(6);
        }
      }
    }
  return E;
}
/** 상태값: 가능한 '남기기' 중 가장 좋은 것 (argmax도 기록) */
function bestOf(mode: Mode, E: Float64Array, arg?: Int32Array): Float64Array {
  const nN = mode ? 4 : 5, V = new Float64Array(NS);
  for (const id of BYN[nN]) {
    const sps = mode === 0 ? [6] : [0, 1, 2, 3, 4, 5];
    for (const sp of sps) {
      let best = -1e18, bk = -1;
      for (const sub of SUBS[id]) {
        const v = E[sub * 7 + sp];
        if (v > best) (best = v), (bk = sub * 7 + sp);
        if (mode === 1) {
          const v2 = E[sub * 7 + 6];
          if (v2 > best) (best = v2), (bk = sub * 7 + 6);
        }
      }
      V[id * 7 + sp] = best;
      if (arg) arg[id * 7 + sp] = bk;
    }
  }
  return V;
}
/** 상태 키: 특수 주사위(황금/돌)는 따로, 나머지는 눈별 개수 */
function keyOf(P: Play, dice = P.dice): number {
  const c = [0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 5; i++) if (i !== P.D.sp || !P.D.mode) c[dice[i]]++;
  const id = MSID.get(codeOf(c))!;
  return id * 7 + (P.D.mode ? dice[P.D.sp] - 1 : 6);
}
/** 상태 키 → 주사위 눈별 개수(특수 주사위 포함) · 황금 눈 */
function stateCnt(mode: Mode, key: number): { c: number[]; g: number } {
  const id = Math.floor(key / 7), sp = key % 7, c = MSC[id].slice();
  if (mode && sp < 6) c[sp + 1]++;
  return { c, g: mode === 1 && sp < 6 ? sp + 1 : 0 };
}
const fullKeys = (mode: Mode) => {
  const out: number[] = [];
  for (const id of BYN[mode ? 4 : 5]) for (const sp of mode === 0 ? [6] : [0, 1, 2, 3, 4, 5]) out.push(id * 7 + sp);
  return out;
};
const FULLK: number[][] = [fullKeys(0), fullKeys(1), fullKeys(2)];
/** 첫 굴림(다섯 개 다)의 평균 */
function topAvg(mode: Mode, X: Float64Array) {
  let a = 0;
  for (const id of BYN[mode ? 4 : 5]) {
    if (mode === 0) a += PROB[id] * X[id * 7 + 6];
    else for (let sp = 0; sp < 6; sp++) a += (PROB[id] * X[id * 7 + sp]) / 6;
  }
  return a;
}

/** 칸 하나만 노리고 한 턴을 쓸 때: 평균 · 분산 · 족보 성공 확률 (특수 주사위 종류 · 굴리기 수별로 한 번만 계산) */
interface SlotStat { e: number; v: number; h: number }
const statCache = new Map<string, SlotStat>();
export function slotStat(t: SlotT, mode: Mode, rolls: number): SlotStat {
  const ck = `${t}:${mode}:${rolls}`, hit = statCache.get(ck);
  if (hit) return hit;
  const U = new Float64Array(NS), M = new Float64Array(NS), H = new Float64Array(NS);
  for (const key of FULLK[mode]) {
    const { c, g } = stateCnt(mode, key), x = scoreOf(t, c, g);
    U[key] = x;
    M[key] = x * x;
    H[key] = x > 0 ? 1 : 0;
  }
  let V: Float64Array = U, Mv: Float64Array = M, Hv: Float64Array = H;
  for (let r = 1; r < rolls; r++) {
    const arg = new Int32Array(NS);
    const E = expectKeep(mode, V);
    const EM = expectKeep(mode, Mv), EH = expectKeep(mode, Hv);
    V = bestOf(mode, E, arg);
    const M2 = new Float64Array(NS), H2 = new Float64Array(NS);
    for (const key of FULLK[mode]) (M2[key] = EM[arg[key]]), (H2[key] = EH[arg[key]]);
    Mv = M2;
    Hv = H2;
  }
  const e = topAvg(mode, V), m2 = topAvg(mode, Mv), h = topAvg(mode, Hv);
  const st = { e, v: Math.max(1, m2 - e * e), h };
  statCache.set(ck, st);
  return st;
}
function statAt(t: SlotT, mode: Mode, rolls: number): SlotStat {
  const lo = Math.max(2, Math.min(4, Math.floor(rolls))), hi = Math.min(4, lo + 1), q = Math.max(0, Math.min(1, rolls - lo));
  const a = slotStat(t, mode, lo);
  if (q <= 0 || hi === lo) return a;
  const b = slotStat(t, mode, hi);
  return { e: a.e + (b.e - a.e) * q, v: a.v + (b.v - a.v) * q, h: a.h + (b.h - a.h) * q };
}
const erf = (x: number) => {
  const s = x < 0 ? -1 : 1, ax = Math.abs(x), t = 1 / (1 + 0.3275911 * ax);
  return s * (1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-ax * ax));
};
const Phi = (z: number) => 0.5 * (1 + erf(z / Math.SQRT2));

/** 봇의 판단 손잡이 (측정하며 맞춤) */
export const KNOB = { alpha: 0.88, neff: 2, fail: 160, lam: 0.6, flipCost: 9 };

/**
 * 한 턴의 계획: 칸마다 '여기 적으면 하루가 어떻게 끝날까'(목표·대박을 넘을 확률, 주문, 덤 보너스)를 어림해 최종 주사위마다 값을 매기고,
 * 남길 주사위를 끝까지(남은 굴리기 수만큼) 내다본다.
 */
interface TurnPlan { key: string; U: Float64Array; arg: Int8Array; E: Float64Array[]; V: Float64Array[] }
function buildPlan(P: Play): TurnPlan {
  const D = P.D, def = D.def, mode = D.mode, open: number[] = [];
  for (let k = 0; k < D.slots.length; k++) if (P.sc[k] < 0) open.push(k);
  const nextW = P.writes + 1;
  const fut = D.weather.slice(nextW);
  const fr = fut.length ? fut.reduce((a, b) => a + b, 0) / fut.length : 3;
  const st = new Map<number, SlotStat>();
  for (const k of open) st.set(k, statAt(D.slots[k], mode, fr));
  // 칸 k에 적을 때 남는 칸들의 어림 (주사위와 무관한 부분)
  const pre = new Map<number, { er: number; vr: number; es: number; vs: number; nNum: number; po: (x: number) => number }>();
  for (const k of open) {
    let er = 0, vr = 0, es = 0, vs = 0, nNum = 0;
    for (const j of open) {
      if (j === k) continue;
      const s = st.get(j)!;
      er += KNOB.alpha * s.e;
      vr += s.v;
      if (isNum(D.slots[j])) (es += KNOB.alpha * s.e), (vs += s.v), nNum++;
    }
    const left = open.length - 1;
    const po = (x: number) => {
      let p = 1;
      D.orders.forEach((o, j) => {
        if (P.ord[j] === 1) return;
        if (P.ord[j] === -1) return void (p = 0);
        if (o.k === k) return void (p *= x > 0 && (!o.dl || nextW <= o.dl) ? 1 : 0);
        let n = o.dl ? o.dl - nextW : left;
        n = Math.min(n, left);
        if (n <= 0) return void (p = 0);
        const h = st.get(o.k)!.h;
        p *= 1 - Math.pow(1 - h, Math.min(n, KNOB.neff));
      });
      return p;
    };
    pre.set(k, { er, vr, es, vs, nNum, po });
  }
  const U = new Float64Array(NS).fill(-1e9), arg = new Int8Array(NS).fill(-1);
  const bz = def.bonus;
  for (const key of FULLK[mode]) {
    const { c, g } = stateCnt(mode, key);
    let best = -1e18, bk = -1;
    for (const k of open) {
      const t = D.slots[k], x = scoreOf(t, c, g), q = pre.get(k)!;
      let mean = P.total + x + q.er, vr = q.vr;
      if (bz && !P.bonus) {
        const ns = P.numSum + (isNum(t) ? x : 0);
        const pb = ns >= bz.B ? 1 : q.nNum ? Phi((ns + q.es - bz.B + 0.5) / Math.sqrt(q.vs + 1)) : 0;
        mean += bz.v * pb;
        vr += bz.v * bz.v * pb * (1 - pb);
      }
      const sd = Math.sqrt(vr) + 0.35;
      const p1 = Phi((mean - def.T1 + 0.5) / sd), p3 = Phi((mean - def.T3 + 0.5) / sd), po = q.po(x);
      const u = 100 * (p1 + p1 * po + p3) + KNOB.lam * p1 * mean - KNOB.fail * (1 - p1) + x * 0.01;
      if (u > best) (best = u), (bk = k);
    }
    U[key] = best;
    arg[key] = bk;
  }
  const E: Float64Array[] = [], V: Float64Array[] = [U];
  for (let r = 1; r < 4; r++) {
    E[r] = expectKeep(mode, V[r - 1]);
    V[r] = bestOf(mode, E[r]);
  }
  return { key: `${D.si}:${P.writes}`, U, arg, E, V };
}
const plans = new WeakMap<Play, TurnPlan>();
function planOf(P: Play) {
  let pl = plans.get(P);
  const key = `${P.D.si}:${P.writes}`;
  if (!pl || pl.key !== key) plans.set(P, (pl = buildPlan(P)));
  return pl;
}

export type Act = { k: 'roll' } | { k: 'hold'; i: number } | { k: 'flip'; i: number } | { k: 'write'; s: number } | { k: 'none' };
/** 남길 묶음(키) → 실제로 남길 주사위: 이미 받침에 있는 것부터 */
function heldFor(P: Play, keep: number): boolean[] {
  const id = Math.floor(keep / 7), sp = keep % 7, need = MSC[id].slice(), out = [false, false, false, false, false];
  const order = [0, 1, 2, 3, 4].sort((a, b) => (P.held[b] ? 1 : 0) - (P.held[a] ? 1 : 0) || a - b);
  for (const i of order) {
    if (P.D.mode && i === P.D.sp) continue;
    if (need[P.dice[i]] > 0) (need[P.dice[i]]--, (out[i] = true));
  }
  if (P.D.mode === 1) out[P.D.sp] = sp < 6;
  if (P.D.mode === 2) out[P.D.sp] = false;
  return out;
}
function flipWorth(P: Play, pl: TurnPlan): number {
  if (P.flips <= 0 || !P.rolled) return -1;
  const r = P.rolls, base = (r > 0 ? pl.V[r] : pl.U)[keyOf(P)];
  const left = P.D.slots.length - P.writes;
  const cost = KNOB.flipCost * Math.min(1, (left - 1) / (P.flips * 2.2));
  let best = -1, bi = -1;
  for (let i = 0; i < 5; i++) {
    const d2 = P.dice.slice();
    d2[i] = 7 - d2[i];
    const v = (r > 0 ? pl.V[r] : pl.U)[keyOf(P, d2)];
    if (v - base - cost > best) (best = v - base - cost), (bi = i);
  }
  return best > 0 ? bi : -1;
}
/** 잘하는 사람의 다음 손짓 */
export function smartAct(P: Play): Act {
  if (P.over) return { k: 'none' };
  if (!P.rolled) return { k: 'roll' };
  const pl = planOf(P);
  const fi = flipWorth(P, pl);
  if (fi >= 0) return { k: 'flip', i: fi };
  const key = keyOf(P), r = P.rolls;
  if (r <= 0 || !canRoll(P)) return { k: 'write', s: pl.arg[key] };
  const id = Math.floor(key / 7), sp = key % 7, E = pl.E[r];
  let best = -1e18, bk = -1;
  for (const sub of SUBS[id]) {
    const k1 = sub * 7 + sp;
    if (E[k1] > best) (best = E[k1]), (bk = k1);
    if (P.D.mode === 1) {
      const k2 = sub * 7 + 6;
      if (E[k2] > best) (best = E[k2]), (bk = k2);
    }
  }
  if (bk === key || best <= pl.U[key] + 1e-9) return { k: 'write', s: pl.arg[key] };
  const want = heldFor(P, bk);
  for (let i = 0; i < 5; i++) if (canHold(P, i) && want[i] !== P.held[i]) return { k: 'hold', i };
  return canRoll(P) ? { k: 'roll' } : { k: 'write', s: pl.arg[key] };
}
/** 버릇 하나(측정용): 가장 많은 같은 눈을 남기고 끝까지 굴린 뒤, 지금 점수가 가장 큰 칸에 적는다 */
export function habitAct(P: Play): Act {
  if (P.over) return { k: 'none' };
  if (!P.rolled) return { k: 'roll' };
  const c = cntOf(P.dice);
  let face = 6;
  for (let f = 6; f >= 1; f--) if (c[f] > c[face]) face = f;
  if (P.rolls > 0 && c[face] < 5) {
    for (let i = 0; i < 5; i++) if (canHold(P, i) && (P.dice[i] === face) !== P.held[i]) return { k: 'hold', i };
    if (canRoll(P)) return { k: 'roll' };
  }
  let best = -1, bk = -1;
  for (let k = 0; k < P.D.slots.length; k++) {
    if (P.sc[k] >= 0) continue;
    const v = slotScore(P, k);
    if (v > best) (best = v), (bk = k);
  }
  return { k: 'write', s: bk };
}

// ───────────────────────────── 손님 ─────────────────────────────
interface Cust { name: string; body: string; dark: string; cloth: string; ear: 'flop' | 'none' | 'round' | 'long' | 'side' | 'point'; snout: 'pig' | 'beak' | 'bear' | 'small' | 'goat' | 'fox'; hat: 'cap' | 'scarf' | 'chef' | 'none' | 'horn' | 'ribbon'; cry: string }
export const CUSTS: Cust[] = [
  { name: '돼지 상인', body: '#f7a8b6', dark: '#d97a90', cloth: '#5b8bd6', ear: 'flop', snout: 'pig', hat: 'cap', cry: '꿀꿀!' },
  { name: '닭 할머니', body: '#fffaf0', dark: '#e2d3bc', cloth: '#b56bd6', ear: 'none', snout: 'beak', hat: 'scarf', cry: '꼬꼬댁!' },
  { name: '곰 요리사', body: '#b07a4c', dark: '#7d5534', cloth: '#ffffff', ear: 'round', snout: 'bear', hat: 'chef', cry: '우와앙!' },
  { name: '토끼 꼬마', body: '#f5f1ec', dark: '#d8ccc0', cloth: '#ff9f43', ear: 'long', snout: 'small', hat: 'none', cry: '깡총!' },
  { name: '염소 할아버지', body: '#ebe4d6', dark: '#bdb09a', cloth: '#5f9e6e', ear: 'side', snout: 'goat', hat: 'horn', cry: '음메~!' },
  { name: '여우 아가씨', body: '#f2893a', dark: '#c4622a', cloth: '#e8506e', ear: 'point', snout: 'fox', hat: 'ribbon', cry: '캥캥!' },
];
const ORDER_SAY: Partial<Record<SlotT, string>> = { three: '같은 눈 셋!', four: '같은 눈 넷!', full: '셋+둘 한 바구니!', small: '줄줄이 넷!', large: '줄줄이 다섯!' };

// ───────────────────────────── 상태 ─────────────────────────────
interface Ev { t: number; kind: string; x: number; y: number; text?: string; col?: string; v?: number; n?: number }
type Target = { k: 'cup' } | { k: 'die'; i: number } | { k: 'slot'; i: number } | { k: 'flip' } | { k: 'none' };
export interface DiceState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'play' | 'roll' | 'write' | 'settle' | 'result'; pt: number;
  D: DayInst; P: Play;
  down: boolean; ax: number; ay: number; press: number; lastTap: number; taps: number; pending: Target | null;
  hearts: number; stars: number; got: number; pts: number; ok: boolean; why: string; won: boolean; dead: boolean; tries: number;
  seen: Set<string>; tips: Set<string>; events: Ev[]; news: { text: string; t: number } | null; newsQ: string[]; startT: number; clearT: number;
  mood: string; moodT: number; cmood: string[]; cmoodT: number[];
  /** 주사위 그림 자리: 쉬는 자리(쟁반) · 받침 이동 시각 · 굴림 시작 · 굴러간 주사위 · 뒤집기 시각 */
  rx: number[]; ry: number[]; rr: number[]; holdT: number[]; rollT0: number; rolled: number[]; fromX: number[]; fromY: number[]; flipT: number[];
  hit: number; armed: boolean; writeT0: number; wk: number; wv: number; wgold: boolean; wfromX: number; wfromY: number;
  combo: { c: SlotT; t0: number; parts: boolean[] } | null; streak: number; fest: number; zoom: number;
  stamp: number[]; retry: boolean; spotT: number; rig: boolean; lastRes: WriteRes | null;
  /** 적는 순간의 주사위 눈·기울기·족보 주사위 (컵으로 돌아가는 그림용) */
  wdice: number[]; wrot: number[]; wparts: boolean[];
}
const ev = (s: DiceState, kind: string, x: number, y: number, text?: string, col?: string, v?: number, n?: number) => s.events.push({ t: s.t, kind, x, y, text, col, v, n });
function tip(s: DiceState, key: string, text: string) {
  if (s.tips.has(key) || s.newsQ.length) return;
  s.tips.add(key);
  s.newsQ.push(text);
}
function see(s: DiceState, key: string, text?: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  if (text) s.newsQ.push(text);
}
const setMood = (s: DiceState, m: string) => ((s.mood = m), (s.moodT = s.t));
const setCust = (s: DiceState, j: number, m: string) => ((s.cmood[j] = m), (s.cmoodT[j] = s.t));

// 화면 배치 (가로 0~1, 세로 0~A)
const LX = [0.125, 0.3125, 0.5, 0.6875, 0.875], TRAY_Y = 0.815, HOLD_Y = 1.045, DS = 0.126;
const CUP_X = 0.225, CUP_Y = 1.24, FLIP_X = 0.895, FLIP_Y = 1.2;
const BAR_Y = 0.388, CARD_H = 0.1;
export function slotRects(n: number): { x: number; y: number; w: number; h: number }[] {
  const rows = n <= 4 ? [n] : n === 5 ? [3, 2] : n === 6 ? [3, 3] : [4, n - 4];
  const ys = rows.length === 1 ? [0.52] : [0.464, 0.576], gap = 0.016;
  const w = Math.min(0.3, (0.95 - (rows[0] - 1) * gap) / rows[0]), out: { x: number; y: number; w: number; h: number }[] = [];
  rows.forEach((c, r) => {
    const rowW = c * w + (c - 1) * gap;
    for (let k = 0; k < c; k++) out.push({ x: 0.5 - rowW / 2 + w / 2 + k * (w + gap), y: ys[r], w, h: CARD_H });
  });
  return out;
}
/** 주사위 i의 지금 자리 (받침에 올라갔으면 받침) */
function dieAt(s: DiceState, i: number) {
  const q = cl01((s.t - s.holdT[i]) / 7), e = easeIO(q), held = s.P.held[i];
  const k = held ? e : 1 - e;
  return { x: s.rx[i] + (LX[i] - s.rx[i]) * k, y: s.ry[i] + (HOLD_Y - s.ry[i]) * k, rot: s.rr[i] * (1 - k), lift: Math.sin(q * Math.PI) * 0.03 };
}

function newStage(s: DiceState) {
  const d = DAYS[s.stage];
  s.D = makeDay(s.seed, s.stage);
  s.P = newPlay(s.D);
  s.phase = 'play';
  s.pt = 0;
  s.startT = s.t;
  s.got = 0;
  s.press = -1;
  s.pending = null;
  s.armed = false;
  s.combo = null;
  s.streak = 0;
  s.fest = -999;
  s.zoom = -999;
  s.stamp = s.D.slots.map(() => -999);
  s.lastRes = null;
  s.cmood = s.D.orders.map(() => 'wait');
  s.cmoodT = s.D.orders.map(() => 0);
  resetDice(s);
  s.retry = s.tips.has('try:' + s.stage);
  s.tips.add('try:' + s.stage);
  s.spotT = s.retry ? -1 : ['bonus', 'weather', 'flip', 'fest'].includes(d.key) ? s.t + 92 : -2;
  setMood(s, 'idle');
  if (!s.seen.has(d.key)) {
    s.seen.add(d.key);
    s.newsQ.unshift(d.news);
    s.news = null;
  }
  if (s.stage === 0) see(s, 'order', `📜 ${CUSTS[0].name} 주문 — 그 족보를 적으면 ★`);
  ev(s, 'stage', 0.5, 0.6, `${s.stage + 1}일째 · ${d.name}`, '#fff6d6');
}
function resetDice(s: DiceState) {
  for (let i = 0; i < 5; i++) (s.rx[i] = CUP_X), (s.ry[i] = CUP_Y), (s.rr[i] = 0), (s.holdT[i] = -99), (s.flipT[i] = -99);
  s.rolled = [];
}

function finish(s: DiceState) {
  s.phase = 'result';
  s.pt = 0;
  const P = s.P, d = DAYS[s.stage];
  s.ok = P.total >= d.T1;
  if (s.ok) {
    const st = starsOf(P);
    s.got = st;
    s.stars += st;
    s.pts += st * STAR_PTS + P.total;
    s.clearT = s.t;
    if (s.stage === DAYS.length - 1) (s.won = true), (s.pts += WIN_PTS);
    ev(s, 'clear', 0.5, 0.62, `${d.emoji} 장사 성공! ${'★'.repeat(st)}${'☆'.repeat(3 - st)}`, '#fff1a8', st);
    setMood(s, st >= 3 ? 'proud' : 'wow');
    s.cmood = s.cmood.map(() => 'happy');
    s.cmoodT = s.cmoodT.map(() => s.t);
  } else {
    s.hearts--;
    s.tries++;
    s.why = `🪙 ${P.total} — 목표 ${d.T1}에 ${d.T1 - P.total} 모자라요`;
    ev(s, 'fail', 0.5, 0.62, s.why, '#ffd0c8');
    setMood(s, 'dizzy');
    s.cmood = s.cmood.map(() => 'sad');
    s.cmoodT = s.cmoodT.map(() => s.t);
  }
}

/** 손가락 자리의 물건 */
function hitTest(s: DiceState, x: number, y: number): Target {
  const P = s.P, n = P.D.slots.length, rects = slotRects(n);
  for (let k = 0; k < n; k++) {
    const r = rects[k];
    if (Math.abs(x - r.x) < r.w / 2 + 0.006 && Math.abs(y - r.y) < r.h / 2 + 0.006) return { k: 'slot', i: k };
  }
  if (P.rolled) {
    let best = -1, bd = 0.088;
    for (let i = 0; i < 5; i++) {
      const p = dieAt(s, i), dd = Math.max(Math.abs(x - p.x), Math.abs(y - p.y));
      if (dd < bd) (bd = dd), (best = i);
    }
    if (best >= 0) return { k: 'die', i: best };
  }
  if (P.D.def.flips && Math.hypot(x - FLIP_X, y - FLIP_Y) < 0.095) return { k: 'flip' };
  // 컵·너구리·'굴리기' 단추 모두 굴리기
  if (Math.hypot(x - CUP_X, (y - CUP_Y) * 0.9) < 0.12 || (x < 0.4 && y > 1.1 && y < 1.34) || (Math.abs(x - 0.6) < 0.19 && Math.abs(y - 1.15) < 0.04)) return { k: 'cup' };
  return { k: 'none' };
}

function press(s: DiceState, tg: Target) {
  const P = s.P;
  s.taps++;
  s.lastTap = s.t;
  if (tg.k === 'cup') {
    s.armed = false;
    if (canRoll(P)) return startRoll(s);
    if (P.rolls <= 0) return void (ev(s, 'say', CUP_X + 0.1, CUP_Y - 0.13, '굴리기를 다 썼어요 — 칸을 톡!', '#ffe9c4'), tip(s, 'noRoll', '굴리기를 다 쓰면 장부 칸 하나를 톡해 적어요'));
    return void ev(s, 'say', CUP_X + 0.1, CUP_Y - 0.13, '다 남겼어요 — 칸을 톡해 적어요', '#ffe9c4');
  }
  if (tg.k === 'flip') {
    if (P.flips <= 0) return void ev(s, 'nope', FLIP_X, FLIP_Y - 0.1, '뒤집개를 다 썼어요', '#ffd8cc');
    if (!P.rolled) return void ev(s, 'nope', FLIP_X - 0.05, FLIP_Y - 0.1, '먼저 컵을 톡!', '#ffd8cc');
    s.armed = !s.armed;
    if (s.armed) tip(s, 'armed', '🔄 뒤집을 주사위를 톡! (다시 톡하면 취소)');
    return;
  }
  if (tg.k === 'die') {
    if (!P.rolled) return;
    const i = tg.i, p = dieAt(s, i);
    if (s.armed && P.flips > 0) {
      s.armed = false;
      const f0 = P.dice[i];
      flipDie(P, i);
      s.flipT[i] = s.t;
      ev(s, 'flip', p.x, p.y, `${f0} → ${P.dice[i]}!`, '#e6f4ff');
      see(s, 'flipUse', '🔄 휙! 주사위가 반대 눈으로 뒤집혔어요');
      setMood(s, 'wow');
      return checkCombo(s, true);
    }
    if (!canHold(P, i)) {
      ev(s, 'nope', p.x, p.y - 0.08, '🪨 너무 무거워요!', '#e8e2da');
      tip(s, 'heavyTap', '🪨 돌 주사위는 남길 수도, 다시 굴릴 수도 없어요');
      return;
    }
    if (P.held[i]) {
      P.held[i] = false;
      s.holdT[i] = s.t;
      return;
    }
    // 같은 눈은 한 번에 척척 받침으로 (내릴 땐 하나씩)
    let n = 0;
    for (let j = 0; j < 5; j++)
      if (!P.held[j] && canHold(P, j) && P.dice[j] === P.dice[i]) (P.held[j] = true), (s.holdT[j] = s.t + (j === i ? 0 : 2 + 2 * n++));
    if (n >= 2) ev(s, 'group', p.x, p.y - 0.09, `척척${'척'.repeat(Math.min(2, n - 1))}!`, '#fff3d0', s.t, n + 1);
    see(s, 'hold', '✋ 같은 눈은 한 번에 받침으로! 받침의 주사위는 남고 나머지만 다시 굴러요');
    return;
  }
  if (tg.k === 'slot') {
    if (P.sc[tg.i] >= 0) {
      const r = slotRects(P.D.slots.length)[tg.i];
      return void ev(s, 'nope', r.x, r.y - 0.07, '이미 적었어요', '#ffe9c4');
    }
    if (!P.rolled) {
      const r = slotRects(P.D.slots.length)[tg.i];
      ev(s, 'nope', r.x, r.y - 0.07, '먼저 컵을 톡!', '#ffd8cc');
      return;
    }
    s.press = tg.i;
    return;
  }
  if (s.armed) s.armed = false;
}

function startRoll(s: DiceState) {
  const P = s.P;
  for (let i = 0; i < 5; i++) {
    const p = P.rolled ? dieAt(s, i) : { x: CUP_X, y: CUP_Y };
    s.fromX[i] = p.x;
    s.fromY[i] = p.y;
  }
  const first = !P.rolled;
  let rig: number[] | undefined;
  if (first && s.rig) {
    // 첫 판 첫 굴림: 세 쌍둥이가 바로 나와 손님이 펄쩍 (첫 손짓에 큰 일)
    s.rig = false;
    const f = 4 + Math.floor(s.rng() * 3), o = [1, 2, 3, 4, 5, 6].filter((x) => x !== f);
    const a = o[Math.floor(s.rng() * o.length)], b = o.filter((x) => x !== a)[Math.floor(s.rng() * 4)];
    rig = [f, a, f, b, f];
  }
  s.rolled = doRoll(P, s.rng, rig);
  for (const i of s.rolled) {
    s.rx[i] = LX[i] + (s.rng() - 0.5) * 0.05;
    s.ry[i] = TRAY_Y + (s.rng() - 0.5) * 0.07;
    s.rr[i] = (s.rng() - 0.5) * 0.7;
    s.holdT[i] = -99;
  }
  s.rollT0 = s.t;
  s.phase = 'roll';
  s.combo = null;
  s.hit = 0;
  setMood(s, 'shake');
  ev(s, 'rattle', CUP_X, CUP_Y - 0.12, '달그락달그락', '#fff3df');
  if (first) see(s, 'roll', undefined);
}

/** 주사위가 멈춘 순간: 족보가 맞으면 반짝 · 손님 환호 · 큰 족보는 잠깐 느려짐 */
function checkCombo(s: DiceState, quiet = false) {
  const P = s.P, c = bestCombo(P.dice, P.D.slots.filter((_, k) => P.sc[k] < 0));
  s.combo = null;
  if (!c) return;
  const parts = partsOf(c, P.dice);
  s.combo = { c, t0: s.t, parts };
  const r = COMBO_RANK[c] ?? 0;
  const xs = P.dice.map((_, i) => dieAt(s, i));
  const mx = xs.reduce((a, p) => a + p.x, 0) / 5, my = xs.reduce((a, p) => a + p.y, 0) / 5;
  ev(s, 'combo', mx, my - 0.1, `${SLOT_NAME[c]}${r >= 4 ? '!!' : '!'}`, r >= 5 ? '#ffe066' : '#fff6d0', s.t, r);
  see(s, 'combo:' + c, undefined);
  if (!quiet) setMood(s, r >= 4 ? 'proud' : 'wow');
  if (c === 'five') {
    s.fest = s.t;
    s.hit = 26;
    see(s, 'fest5', '🎉 다섯 쌍둥이 — 장터 전체가 축제!');
  } else if (r >= 4) (s.hit = 12), (s.zoom = s.t);
  // 손님 주문과 맞으면 펄쩍
  P.D.orders.forEach((o, j) => {
    if (P.ord[j] || P.sc[o.k] >= 0) return;
    if (slotScore(P, o.k) > 0) {
      setCust(s, j, 'happy');
      ev(s, 'cheer', custX(s, j), 0.2, `${CUSTS[o.who].cry} 바로 그거!`, '#fff1a8', s.t + 6);
    }
  });
  if (r >= 2) for (let j = 0; j < s.cmood.length; j++) if (s.cmood[j] === 'wait') setCust(s, j, 'wow');
}
const custX = (s: DiceState, j: number) => (s.D.orders.length > 1 ? (j ? 0.84 : 0.6) : 0.72);

function doWrite(s: DiceState, k: number) {
  const P = s.P, D = P.D, t = D.slots[k];
  const parts = partsOf(t, P.dice);
  let cx = 0, cy = 0, n = 0;
  for (let i = 0; i < 5; i++) {
    const p = dieAt(s, i);
    s.fromX[i] = p.x;
    s.fromY[i] = p.y;
    s.wrot[i] = p.rot;
    if (parts[i]) (cx += p.x), (cy += p.y), n++;
  }
  s.wdice = P.dice.slice();
  s.wparts = parts;
  s.wfromX = n ? cx / n : 0.5;
  s.wfromY = n ? cy / n : TRAY_Y;
  const res = writeSlot(P, k);
  s.lastRes = res;
  s.wk = k;
  s.wv = res.v;
  s.wgold = res.gold;
  s.writeT0 = s.t;
  s.phase = 'write';
  s.press = -1;
  s.pending = null;
  s.armed = false;
  s.combo = null;
  s.stamp[k] = s.t + 13;
  const r = slotRects(D.slots.length)[k];
  if (res.v > 0) {
    const big = res.v >= 40;
    ev(s, 'stamp', r.x, r.y, `+${res.v}`, res.gold ? '#ffe066' : '#fff6d0', s.t + 13, Math.min(4, (big ? 3 : res.v >= 20 ? 2 : 1) + (s.streak >= 2 ? 1 : 0)));
    if (res.gold) ev(s, 'gold2', r.x, r.y - 0.075, '🟡 ×2!', '#ffe066', s.t + 16), see(s, 'gold2', '🟡 황금 주사위가 낀 족보 — 점수 두 배!');
    const combo = !isNum(t) && t !== 'chance';
    s.streak = combo ? s.streak + 1 : s.streak;
    if (combo && s.streak >= 2) ev(s, 'streak', 0.5, 0.25, `구경꾼 ${s.streak}명 모였다!`, '#ffe9a8', s.t + 20, s.streak), see(s, 'crowd', '👀 족보를 이어 적으면 구경꾼이 모여들어요');
    setMood(s, res.v >= 30 ? 'proud' : 'idle');
  } else {
    ev(s, 'zero', r.x, r.y, '0… 칸을 버렸어요', '#d9d2c8', s.t + 13);
    see(s, 'zero', '✗ 족보가 안 맞으면 0점 — 버릴 칸을 잘 골라요');
    s.streak = 0;
    setMood(s, 'sweat');
  }
  for (const j of res.hit) {
    setCust(s, j, 'happy');
    ev(s, 'order', custX(s, j), 0.2, `${CUSTS[D.orders[j].who].cry} 고마워요! ★`, '#fff1a8', s.t + 18);
    see(s, 'orderOk', '📜 손님 주문을 적었어요 — ★!');
  }
  for (const j of res.miss) {
    setCust(s, j, 'sad');
    ev(s, 'wrong', custX(s, j), 0.2, D.orders[j].dl && P.sc[D.orders[j].k] < 0 ? '⏰ 늦었어요…' : '그게 아닌데…', '#ffd8cc', s.t + 18);
  }
  if (res.bonus) {
    ev(s, 'bonus', 0.5, BAR_Y, `🎁 덤 +${D.def.bonus!.v}!`, '#ffe066', s.t + 22);
    see(s, 'bonusGot', '🎁 4·5·6 합이 넘었다 — 덤 보너스!');
  }
  if (P.total >= D.def.T1 && P.total - res.v - (res.bonus ? D.def.bonus!.v : 0) < D.def.T1) ev(s, 'goal', 0.5, BAR_Y, '목표 달성! ★', '#c8ffb0', s.t + 24), see(s, 'goal');
  if (P.total >= D.def.T3 && P.total - res.v - (res.bonus ? D.def.bonus!.v : 0) < D.def.T3) ev(s, 'jackpot', 0.5, BAR_Y, '대박 점수! ★', '#ffe066', s.t + 26);
}

export const dicehand: GameDef<DiceState> = {
  id: 'dicehand',
  name: '주사위 족보 장터',
  genes: ['dicecombo', 'pointer', 'turnbased'],
  twist: '🟡 황금 주사위가 낀 족보는 점수가 두 배 — 같은 굴림이라도 황금 주사위가 무슨 눈이냐에 따라 노릴 족보가 바뀐다 (🪨 돌 주사위는 아예 다시 못 굴린다)',
  rules: ['컵을 톡 → 데굴데굴! 남길 주사위를 톡 해서 두 번까지 다시 굴린다.', '족보 칸 하나를 톡 → 점수를 적는다, 칸마다 한 번. 합계가 목표를 넘으면 장사 성공.'],
  controls: 'touch',
  hint: '컵을 톡 → 남길 주사위를 톡 → 칸을 톡해 적기 / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '동물 장터의 주사위 가게',
    mood: '줄무늬 차양 아래 나무 좌판, 초록 펠트 쟁반 위로 나무 컵에서 쏟아진 상아빛 주사위가 데굴데굴 — 깃발 줄이 펄럭이는 장터 골목에 돼지 상인·닭 할머니·곰 요리사가 주문서를 들고 오고, 앞치마 두른 너구리 사장이 컵을 흔든다. 오리 가족과 참새가 구경한다.',
    palette: { bg: '#2b1d14', ink: '#fff6e8', muted: '#d8c3a8', accent: '#ffc847', hot: '#ff5a4e', soft: '#fbe9cf' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'play', pt: 0,
      down: false, ax: 0, ay: 0, press: -1, lastTap: -99, taps: 0, pending: null,
      hearts: 3, stars: 0, got: 0, pts: 0, ok: false, why: '', won: false, dead: false, tries: 0,
      seen: new Set<string>(), tips: new Set<string>(), events: [], news: null, newsQ: [], startT: 0, clearT: 0,
      mood: 'idle', moodT: 0, cmood: [], cmoodT: [],
      rx: [0, 0, 0, 0, 0], ry: [0, 0, 0, 0, 0], rr: [0, 0, 0, 0, 0], holdT: [0, 0, 0, 0, 0], rollT0: -99, rolled: [], fromX: [0, 0, 0, 0, 0], fromY: [0, 0, 0, 0, 0], flipT: [0, 0, 0, 0, 0],
      hit: 0, armed: false, writeT0: -99, wk: -1, wv: 0, wgold: false, wfromX: 0, wfromY: 0,
      combo: null, streak: 0, fest: -999, zoom: -999, stamp: [], retry: false, spotT: -1, rig: true, lastRes: null,
      wdice: [0, 0, 0, 0, 0], wrot: [0, 0, 0, 0, 0], wparts: [false, false, false, false, false],
    } as unknown as DiceState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    const p = inp.pointer ?? null, pr = !!p && !s.down, release = !p && s.down;
    if (p) (s.ax = p.x), (s.ay = p.y);
    s.down = !!p;
    s.t++;
    s.pt++;
    if (s.newsQ.length && (!s.news || s.t - s.news.t > NEWS_T)) s.news = { text: s.newsQ.shift()!, t: s.t };
    if (s.events.length > 60 || (s.events.length && s.t - s.events[0].t > 220)) s.events = s.events.filter((e) => s.t - e.t < 220);
    const mt = s.mood === 'dizzy' ? 140 : s.mood === 'proud' ? 90 : s.mood === 'sweat' ? 70 : s.mood === 'shake' ? 26 : 60;
    if (s.mood !== 'idle' && s.t - s.moodT > mt) s.mood = 'idle';
    for (let j = 0; j < s.cmood.length; j++) if (s.cmood[j] !== 'wait' && s.t - s.cmoodT[j] > 110 && s.phase !== 'result') s.cmood[j] = s.P.ord[j] === 1 ? 'done' : s.P.ord[j] === -1 ? 'gone' : 'wait';
    if (s.phase === 'result') {
      if (s.pt >= (s.ok ? RESULT_OK : RESULT_FAIL)) {
        if (s.ok) {
          if (s.won) s.dead = true;
          else s.stage++, newStage(s);
        } else if (s.hearts <= 0) s.dead = true;
        else newStage(s);
      }
      return;
    }
    if (s.phase === 'settle') {
      if (s.pt >= 44) finish(s);
      return;
    }
    if (s.phase === 'roll') {
      const u = s.t - s.rollT0;
      if (u === ROLL_T) {
        checkCombo(s);
        if (s.rolled.length) ev(s, 'land', 0.5, TRAY_Y, undefined, undefined, s.t, s.rolled.length);
      }
      if (u >= ROLL_T + s.hit) s.phase = 'play';
    } else if (s.phase === 'write') {
      if (s.t - s.writeT0 >= WRITE_T) {
        resetDice(s);
        if (s.P.over) (s.phase = 'settle'), (s.pt = 0);
        else s.phase = 'play';
      }
    }
    if (pr) {
      const tg = hitTest(s, s.ax, s.ay * A);
      if (s.phase !== 'play' || s.t - s.startT < 12) {
        if (tg.k === 'die' || tg.k === 'cup' || tg.k === 'flip') s.pending = tg;
      } else press(s, tg);
    } else if (s.pending && s.phase === 'play' && s.t - s.startT >= 12) {
      const tg = s.pending;
      s.pending = null;
      press(s, tg);
    }
    if (release && s.press >= 0) {
      const k = s.press, tg = hitTest(s, s.ax, s.ay * A);
      s.press = -1;
      if (s.phase === 'play' && tg.k === 'slot' && tg.i === k && s.P.sc[k] < 0 && s.P.rolled) doWrite(s, k);
    }
    if (s.phase === 'play' && s.P.rolled && s.P.rolls <= 0) tip(s, 'lastRoll', '굴리기를 다 썼어요 — 장부 칸을 톡해 적어요');
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
const ptr = (x: number, y: number): Input => ({ tap: false, dir: 0, pointer: { x, y: y / A } });
/** 손짓 하나 → 누를 자리 */
function inputFor(s: DiceState, a: Act): Input {
  const P = s.P;
  if (a.k === 'roll') return ptr(CUP_X, CUP_Y - 0.02);
  if (a.k === 'hold') {
    const p = dieAt(s, a.i);
    return ptr(p.x, p.y);
  }
  if (a.k === 'flip') {
    if (!s.armed) return ptr(FLIP_X, FLIP_Y);
    const p = dieAt(s, a.i);
    return ptr(p.x, p.y);
  }
  if (a.k === 'write' && a.s >= 0) {
    const r = slotRects(P.D.slots.length)[a.s];
    return ptr(r.x, r.y);
  }
  return NO;
}
const ready = (s: DiceState, gap: number) => s.phase === 'play' && !s.down && !s.pending && s.t - s.lastTap >= gap && s.t - s.startT >= 40;
/** 봇: 칸마다 '하루가 어떻게 끝날까'를 어림하고, 남길 주사위를 남은 굴리기 끝까지 내다본다 */
export const dicehandSmart: Bot<DiceState> = {
  name: '장터 고수',
  act(s) {
    if (s.down) return NO;
    if (!ready(s, 9)) return NO;
    return inputFor(s, smartAct(s.P));
  },
};
/** 버릇 봇(측정용): 가장 많은 같은 눈을 남기고 끝까지 굴린 뒤, 지금 점수가 가장 큰 칸에 적기 */
export const dicehandHabit: Bot<DiceState> = {
  name: '버릇: 많은 눈 남기고 큰 점수 칸',
  act(s) {
    if (s.down) return NO;
    if (!ready(s, 9)) return NO;
    return inputFor(s, habitAct(s.P));
  },
};
const dumbAt = new WeakMap<object, { next: number; until: number; p: { x: number; y: number } }>();
/** 봇: 아무 때나 아무 데나 톡 (주사위·컵·칸 중 하나, 가끔 허공) */
export const dicehandRandom: Bot<DiceState> = {
  name: '아무 데나 톡',
  act(s, rng) {
    let m = dumbAt.get(s);
    if (!m) dumbAt.set(s, (m = { next: 20 + Math.floor(rng() * 50), until: -1, p: { x: 0, y: 0 } }));
    if (s.t < m.until) return { tap: false, dir: 0, pointer: m.p };
    if (s.t < m.next) return NO;
    m.next = s.t + 24 + Math.floor(rng() * 60);
    m.until = s.t + 2 + Math.floor(rng() * 4);
    const P = s.P, n = P.D.slots.length, rects = slotRects(n), list: { x: number; y: number }[] = [];
    for (let i = 0; i < 5; i++) {
      const q = dieAt(s, i);
      list.push({ x: q.x, y: q.y });
    }
    list.push({ x: CUP_X, y: CUP_Y });
    for (let k = 0; k < n; k++) if (P.sc[k] < 0) list.push({ x: rects[k].x, y: rects[k].y });
    if (P.D.def.flips) list.push({ x: FLIP_X, y: FLIP_Y });
    if (rng() < 0.12) m.p = { x: rng(), y: rng() };
    else {
      const q = list[Math.floor(rng() * list.length)];
      m.p = { x: q.x + (rng() - 0.5) * 0.04, y: (q.y + (rng() - 0.5) * 0.04) / A };
    }
    return { tap: false, dir: 0, pointer: m.p };
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
const TAU = Math.PI * 2;
const hsh = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const hex = (c: string) => [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16));
const mix = (a: string, b: string, t: number) => {
  const p = hex(a), q = hex(b);
  return '#' + p.map((v, i) => Math.round(v + (q[i] - v) * t).toString(16).padStart(2, '0')).join('');
};
const shade = (c: string, k: number) => (k >= 0 ? mix(c, '#ffffff', k) : mix(c, '#000000', -k));
const cl01 = (q: number) => Math.max(0, Math.min(1, q));
const ease = (q: number) => 1 - Math.pow(1 - cl01(q), 2.4);
const easeIO = (q: number) => {
  const x = cl01(q);
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
};
type F = (v: number) => number;
type FontF = (sz: number, w?: number) => void;
const WEATHER_ICON: Record<number, string> = { 2: '🌧️', 3: '☀️', 4: '🌈' };
const SKY: [string, string][] = [['#8fd6ff', '#fff3d6'], ['#7cc6ff', '#fff6dc'], ['#9fd0f0', '#ffeccc'], ['#b5c9d8', '#f4ead8'], ['#8fc8ee', '#f6f0dc'], ['#ffb98a', '#ffe9c8'], ['#3b2a6e', '#ff9e6e']];

function emoji(ctx: CanvasRenderingContext2D, e: string, x: number, y: number, size: number) {
  ctx.font = `${Math.max(12, size)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(e, x, y);
}
function outlined(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, fill: string, stroke = 'rgba(40,20,8,.75)', lw = 3) {
  ctx.lineWidth = lw;
  ctx.strokeStyle = stroke;
  ctx.lineJoin = 'round';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

/** 주사위 한 개 (x,y = 가운데 화면 px, sz = 한 변) — 윗면 + 앞 두께 + 바닥 그림자. 1·4 눈은 붉은 점 */
function drawDie(ctx: CanvasRenderingContext2D, x: number, y: number, sz: number, face: number, o: { rot: number; kind: number; glow?: string | null; z?: number; dim?: boolean; t: number; hl?: boolean }) {
  const z = o.z ?? 0, hz = sz * 0.5;
  // 그림자 (높이 뜰수록 작고 옅게)
  ctx.fillStyle = `rgba(20,30,10,${0.34 * (1 - Math.min(0.7, z / (sz * 2)))})`;
  ctx.beginPath();
  ctx.ellipse(x + sz * 0.06, y + hz * 0.9, hz * (1.05 - Math.min(0.4, z / (sz * 4))), hz * 0.34, 0, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.translate(x, y - z);
  ctx.rotate(o.rot);
  if (o.dim) ctx.globalAlpha = 0.55;
  if (o.glow) {
    const g = ctx.createRadialGradient(0, 0, hz * 0.4, 0, 0, hz * 1.9);
    g.addColorStop(0, o.glow + 'cc');
    g.addColorStop(1, o.glow + '00');
    ctx.fillStyle = g;
    ctx.fillRect(-hz * 2, -hz * 2, hz * 4, hz * 4);
  }
  const top = o.kind === 1 ? ['#fff2a8', '#ffd23a', '#d99a00'] : o.kind === 2 ? ['#d7d2ca', '#a8a199', '#6f6a63'] : ['#fffdf6', '#f6ecd8', '#d9c9a8'];
  const rr = sz * 0.2, th = sz * 0.13;
  // 앞 두께
  ctx.fillStyle = top[2];
  ctx.beginPath();
  ctx.roundRect(-hz, -hz + th, sz, sz, rr);
  ctx.fill();
  // 윗면
  const g2 = ctx.createLinearGradient(-hz, -hz, hz, hz);
  g2.addColorStop(0, top[0]);
  g2.addColorStop(0.55, top[1]);
  g2.addColorStop(1, shade(top[1], -0.12));
  ctx.fillStyle = g2;
  ctx.beginPath();
  ctx.roundRect(-hz, -hz, sz, sz, rr);
  ctx.fill();
  ctx.strokeStyle = o.hl ? '#ffffff' : 'rgba(90,60,30,.35)';
  ctx.lineWidth = o.hl ? 2.5 : 1;
  ctx.stroke();
  if (o.kind === 1) {
    // 황금 반짝 줄
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(-hz, -hz, sz, sz, rr);
    ctx.clip();
    const sx = ((o.t * 1.6) % (sz * 4)) - sz * 2;
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.beginPath();
    ctx.moveTo(sx - sz * 0.2, -hz);
    ctx.lineTo(sx + sz * 0.05, -hz);
    ctx.lineTo(sx - sz * 0.45, hz);
    ctx.lineTo(sx - sz * 0.7, hz);
    ctx.fill();
    ctx.restore();
  } else if (o.kind === 2) {
    // 돌: 금·얼룩
    ctx.strokeStyle = 'rgba(60,55,50,.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-hz * 0.8, -hz * 0.3);
    ctx.lineTo(-hz * 0.35, -hz * 0.1);
    ctx.lineTo(-hz * 0.45, hz * 0.35);
    ctx.moveTo(hz * 0.5, -hz * 0.85);
    ctx.lineTo(hz * 0.3, -hz * 0.5);
    ctx.stroke();
    for (let k = 0; k < 6; k++) {
      ctx.fillStyle = `rgba(80,74,68,${0.25 + 0.2 * hsh(k)})`;
      ctx.beginPath();
      ctx.arc((hsh(k * 3) - 0.5) * sz * 0.8, (hsh(k * 7) - 0.5) * sz * 0.8, sz * 0.035, 0, TAU);
      ctx.fill();
    }
  }
  // 윗면 반사광
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  ctx.beginPath();
  ctx.ellipse(-hz * 0.42, -hz * 0.55, hz * 0.32, hz * 0.14, -0.5, 0, TAU);
  ctx.fill();
  // 눈
  const P = PIPS[face] ?? [];
  const pr = sz * (face === 1 ? 0.12 : 0.085), red = face === 1 || face === 4;
  for (const [px, py] of P) {
    ctx.fillStyle = red ? (o.kind === 1 ? '#b3261e' : '#d8332a') : o.kind === 1 ? '#6b4300' : o.kind === 2 ? '#3a3632' : '#3b2a1e';
    ctx.beginPath();
    ctx.arc(px * sz * 0.29, py * sz * 0.29, pr, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.beginPath();
    ctx.arc(px * sz * 0.29 - pr * 0.3, py * sz * 0.29 - pr * 0.3, pr * 0.35, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}
const PIPS: Record<number, [number, number][]> = {
  1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
};
const dieKind = (s: DiceState, i: number) => (s.D.mode && i === s.D.sp ? s.D.mode : 0);

function drawAll(ctx: CanvasRenderingContext2D, s: DiceState, w: number, h: number, th: Theme) {
  const fx = juice(s), t = s.t, P = s.P, D = s.D, d = D.def;
  const X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w;
  const font: FontF = (sz, wgt = 800) => void (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  ctx.save();
  fx.begin(ctx);
  // 큰 족보: 쟁반 쪽으로 화면이 살짝 당겨진다
  const zq = s.fest > 0 && t - s.fest < 30 ? 1 - (t - s.fest) / 30 : s.zoom > 0 && t - s.zoom < 22 ? (1 - (t - s.zoom) / 22) * 0.6 : 0;
  if (zq > 0) {
    const k = 1 + 0.06 * zq;
    ctx.translate(X(0.5), Y(TRAY_Y));
    ctx.scale(k, k);
    ctx.translate(-X(0.5), -Y(TRAY_Y));
  }
  drawBackdrop(ctx, s, w, X, Y, R, t);
  drawCustomers(ctx, s, X, Y, R, t);
  drawCounter(ctx, w, X, Y, R);
  drawOrders(ctx, s, X, Y, R, t, font);
  drawBar(ctx, s, X, Y, R, t, font);
  drawSheet(ctx, s, X, Y, R, t, font);
  drawTray(ctx, X, Y, R, t);
  drawPlank(ctx, s, X, Y, R);
  // ═════════ 주사위 ═════════
  const pressT = s.press >= 0 && s.phase === 'play' ? D.slots[s.press] : null;
  const pparts = pressT ? partsOf(pressT, P.dice) : null;
  const ru = s.t - s.rollT0, wu = s.t - s.writeT0;
  const flying: (() => void)[] = [];
  if (P.rolled || s.phase === 'write') {
    for (let i = 0; i < 5; i++) {
      const kind = dieKind(s, i);
      const rolling = s.phase === 'roll' && s.rolled.includes(i) && ru < ROLL_T;
      let glow: string | null = null, dim = false;
      if (s.combo && s.combo.parts[i] && s.phase !== 'write' && !pparts) glow = s.combo.c === 'five' ? '#ff9ad5' : '#fff07a';
      if (pparts) pparts[i] ? (glow = '#9ff0ff') : (dim = true);
      if (s.phase === 'write') {
        // 적고 나면 주사위가 컵으로 쏙
        const k = easeIO((wu - 4) / 14);
        if (k >= 1) continue;
        const x = s.fromX[i] + (CUP_X - s.fromX[i]) * k, y = s.fromY[i] + (CUP_Y - 0.03 - s.fromY[i]) * k;
        flying.push(() => drawDie(ctx, X(x), Y(y), R(DS) * (1 - 0.35 * k), s.wdice[i] || 1, { rot: s.wrot[i] + k * 3, kind, t, z: Math.sin(k * Math.PI) * R(0.06), glow: wu < 6 && s.wparts[i] ? '#fff07a' : null }));
        continue;
      }
      if (rolling) {
        const fromCup = s.fromX[i] === CUP_X && s.fromY[i] === CUP_Y;
        if (ru < 8) {
          if (fromCup) continue;
          const k = easeIO(ru / 7);
          const x = s.fromX[i] + (CUP_X - s.fromX[i]) * k, y = s.fromY[i] + (CUP_Y - 0.03 - s.fromY[i]) * k;
          flying.push(() => drawDie(ctx, X(x), Y(y), R(DS) * (1 - 0.3 * k), 1 + Math.floor(hsh(t + i) * 6), { rot: k * 2, kind, t, z: Math.sin(k * Math.PI) * R(0.05) }));
          continue;
        }
        const v = (ru - 8) / (ROLL_T - 8), e = ease(v);
        const gx = CUP_X + (s.rx[i] - CUP_X) * e, gy = CUP_Y - 0.03 + (s.ry[i] - CUP_Y + 0.03) * e;
        const z = v < 0.62 ? Math.sin((v / 0.62) * Math.PI) * 0.17 : v < 0.84 ? Math.sin(((v - 0.62) / 0.22) * Math.PI) * 0.03 : 0;
        const face = v < 0.82 ? 1 + Math.floor(hsh(Math.floor(t / 2) * 13 + i * 7) * 6) : P.dice[i];
        const rot = s.rr[i] + (1 - v) * (1 - v) * 9 * (i % 2 ? 1 : -1);
        flying.push(() => drawDie(ctx, X(gx), Y(gy), R(DS) * (0.8 + 0.2 * Math.min(1, v * 2)), face, { rot, kind, t, z: R(z) }));
        continue;
      }
      const p = dieAt(s, i);
      const fl = t - s.flipT[i] < 12 ? (t - s.flipT[i]) / 12 : -1;
      const wig = s.armed ? Math.sin(t * 0.5 + i) * 0.06 : 0;
      const face = fl >= 0 && fl < 0.5 ? 7 - P.dice[i] : P.dice[i];
      drawDie(ctx, X(p.x), Y(p.y), R(DS), face, { rot: p.rot + wig + (fl >= 0 ? fl * TAU : 0), kind, glow, dim, t, z: R(p.lift + (fl >= 0 ? Math.sin(fl * Math.PI) * 0.06 : 0)), hl: P.held[i] });
      if (s.armed) {
        // 뒤집으면 무슨 눈이 되나
        font(0.032, 900);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(30,60,90,.85)';
        ctx.beginPath();
        ctx.roundRect(X(p.x) - R(0.032), Y(p.y - DS * 0.95) - R(0.02), R(0.064), R(0.04), R(0.02));
        ctx.fill();
        ctx.fillStyle = '#dff4ff';
        ctx.fillText(`↻${7 - P.dice[i]}`, X(p.x), Y(p.y - DS * 0.95));
      }
    }
  }
  drawRaccoon(ctx, s, X(0.15), Y(1.325), R(0.27), t);
  drawControls(ctx, s, X, Y, R, t, font);
  for (const f of flying) f();
  // ═════════ 축제 꽃가루 ═════════
  if (s.fest > 0 && t - s.fest < 170) {
    const u = t - s.fest;
    for (let k = 0; k < 46; k++) {
      const x = hsh(k * 3.1) * w + Math.sin(u * 0.05 + k) * R(0.03), y = -R(0.05) + ((u * (1.4 + hsh(k) * 1.6) + hsh(k * 7) * 80) % (h * 0.95));
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(u * 0.1 + k);
      ctx.fillStyle = ['#ff5a6e', '#ffd23f', '#4fc3ff', '#7ee07e', '#ff9ad5', '#b58bff'][k % 6];
      ctx.globalAlpha = Math.min(1, (170 - u) / 30);
      ctx.fillRect(-R(0.008), -R(0.004), R(0.016), R(0.008));
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
  // 가장자리 어둡게
  const vg = ctx.createRadialGradient(w / 2, h * 0.5, R(0.5), w / 2, h * 0.5, R(1.05));
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(30,14,4,.4)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
  drawEvents(ctx, s, w, X, Y, R, th);
  ctx.restore();
  drawHud(ctx, s, d, w, X, Y, R, font, th);
  drawPreview(ctx, s, w, X, Y, R, font);
  drawSpot(ctx, s, w, X, Y, R, font);
  drawGuide(ctx, s, X, Y, R, t, font);
  ctx.textBaseline = 'alphabetic';
}

/** 동물 하나 (손님·구경꾼 공용): x,y = 몸통 아래 가운데, u = 크기 */
function drawAnimal(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, c: Cust, mood: string, t: number, k: number, age = 99) {
  const happy = mood === 'happy', sad = mood === 'sad' || mood === 'gone', wow = mood === 'wow';
  const jump = happy ? Math.abs(Math.sin(age * 0.22)) * u * 0.16 * Math.max(0.3, 1 - age / 90) : 0;
  const bob = Math.sin(t * 0.07 + k) * u * 0.015, tilt = sad ? -0.12 : happy ? Math.sin(age * 0.2) * 0.06 : Math.sin(t * 0.03 + k) * 0.03;
  ctx.save();
  ctx.translate(x, y - jump + bob);
  // 몸통 (옷)
  const tg = ctx.createLinearGradient(-u * 0.4, 0, u * 0.4, 0);
  tg.addColorStop(0, shade(c.cloth, -0.25));
  tg.addColorStop(0.45, shade(c.cloth, 0.1));
  tg.addColorStop(1, shade(c.cloth, -0.35));
  ctx.fillStyle = tg;
  ctx.beginPath();
  ctx.moveTo(-u * 0.38, 0);
  ctx.quadraticCurveTo(-u * 0.4, -u * 0.5, 0, -u * 0.54);
  ctx.quadraticCurveTo(u * 0.4, -u * 0.5, u * 0.38, 0);
  ctx.closePath();
  ctx.fill();
  // 팔 (기뻐하면 번쩍)
  ctx.fillStyle = c.body;
  for (const sd of [-1, 1]) {
    ctx.save();
    ctx.translate(sd * u * 0.3, -u * 0.36);
    ctx.rotate(sd * (happy ? -2.2 + Math.sin(age * 0.4) * 0.3 : wow ? -1.2 : 0.25));
    ctx.beginPath();
    ctx.ellipse(0, u * 0.12, u * 0.07, u * 0.15, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  ctx.rotate(tilt);
  const hy = -u * 0.78, hr = u * 0.31;
  // 귀 (머리 뒤)
  const earFill = c.dark;
  ctx.fillStyle = earFill;
  if (c.ear === 'round') for (const sd of [-1, 1]) (ctx.beginPath(), ctx.arc(sd * hr * 0.72, hy - hr * 0.72, hr * 0.32, 0, TAU), ctx.fill());
  if (c.ear === 'long')
    for (const sd of [-1, 1]) {
      ctx.save();
      ctx.translate(sd * hr * 0.4, hy - hr * 0.9);
      ctx.rotate(sd * (0.15 + (sad ? 0.6 : 0) + Math.sin(t * 0.05 + k) * 0.05));
      ctx.fillStyle = c.body;
      ctx.beginPath();
      ctx.ellipse(0, -hr * 0.55, hr * 0.2, hr * 0.62, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#f7b9c4';
      ctx.beginPath();
      ctx.ellipse(0, -hr * 0.5, hr * 0.1, hr * 0.45, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  if (c.ear === 'point')
    for (const sd of [-1, 1]) {
      ctx.fillStyle = c.body;
      ctx.beginPath();
      ctx.moveTo(sd * hr * 0.25, hy - hr * 0.8);
      ctx.lineTo(sd * hr * 0.85, hy - hr * 1.35);
      ctx.lineTo(sd * hr * 0.95, hy - hr * 0.45);
      ctx.fill();
      ctx.fillStyle = '#3a2418';
      ctx.beginPath();
      ctx.moveTo(sd * hr * 0.7, hy - hr * 1.15);
      ctx.lineTo(sd * hr * 0.85, hy - hr * 1.35);
      ctx.lineTo(sd * hr * 0.9, hy - hr * 1.0);
      ctx.fill();
    }
  if (c.ear === 'side')
    for (const sd of [-1, 1]) {
      ctx.save();
      ctx.translate(sd * hr * 0.95, hy - hr * 0.15);
      ctx.rotate(sd * (0.4 + (sad ? 0.4 : 0)));
      ctx.beginPath();
      ctx.ellipse(0, 0, hr * 0.38, hr * 0.16, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  if (c.hat === 'horn') {
    ctx.strokeStyle = '#cdb68a';
    ctx.lineWidth = hr * 0.18;
    ctx.lineCap = 'round';
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sd * hr * 0.35, hy - hr * 0.8);
      ctx.quadraticCurveTo(sd * hr * 0.6, hy - hr * 1.5, sd * hr * 1.0, hy - hr * 1.2);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }
  // 머리
  const hg = ctx.createRadialGradient(-hr * 0.3, hy - hr * 0.35, hr * 0.15, 0, hy, hr * 1.1);
  hg.addColorStop(0, shade(c.body, 0.25));
  hg.addColorStop(1, shade(c.body, -0.12));
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.ellipse(0, hy, hr, hr * 0.94, 0, 0, TAU);
  ctx.fill();
  if (c.ear === 'flop')
    for (const sd of [-1, 1]) {
      ctx.fillStyle = c.dark;
      ctx.beginPath();
      ctx.moveTo(sd * hr * 0.3, hy - hr * 0.85);
      ctx.lineTo(sd * hr * 1.0, hy - hr * 0.75);
      ctx.lineTo(sd * hr * 0.75, hy - hr * (sad ? 0.05 : 0.3));
      ctx.fill();
    }
  if (c.ear === 'none') {
    // 닭 볏
    ctx.fillStyle = '#e8323a';
    for (let q = 0; q < 3; q++) (ctx.beginPath(), ctx.arc((q - 1) * hr * 0.28, hy - hr * 0.95 - (q === 1 ? hr * 0.1 : 0), hr * 0.2, 0, TAU), ctx.fill());
  }
  // 눈
  const ex = hr * 0.38, ey = hy - hr * 0.1;
  const blink = !happy && !wow && Math.floor(t + k * 37) % 170 < 6;
  ctx.strokeStyle = '#2a1a10';
  ctx.fillStyle = '#2a1a10';
  ctx.lineWidth = Math.max(1.5, hr * 0.1);
  ctx.lineCap = 'round';
  for (const sd of [-1, 1]) {
    const cx = sd * ex;
    if (happy) {
      ctx.beginPath();
      ctx.arc(cx, ey + hr * 0.05, hr * 0.13, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else if (sad) {
      ctx.beginPath();
      ctx.moveTo(cx - hr * 0.12, ey - sd * hr * 0.04);
      ctx.lineTo(cx + hr * 0.12, ey + sd * hr * 0.04);
      ctx.stroke();
    } else if (blink) {
      ctx.beginPath();
      ctx.moveTo(cx - hr * 0.1, ey);
      ctx.lineTo(cx + hr * 0.1, ey);
      ctx.stroke();
    } else {
      const er = wow ? hr * 0.16 : hr * 0.1;
      ctx.fillStyle = '#2a1a10';
      ctx.beginPath();
      ctx.arc(cx, ey, er, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx - er * 0.35, ey - er * 0.35, er * 0.38, 0, TAU);
      ctx.fill();
    }
  }
  ctx.lineCap = 'butt';
  // 볼
  ctx.fillStyle = 'rgba(255,120,130,.38)';
  for (const sd of [-1, 1]) (ctx.beginPath(), ctx.ellipse(sd * hr * 0.6, hy + hr * 0.25, hr * 0.16, hr * 0.1, 0, 0, TAU), ctx.fill());
  // 코·주둥이
  const my = hy + hr * 0.3;
  if (c.snout === 'pig') {
    ctx.fillStyle = shade(c.body, -0.1);
    ctx.beginPath();
    ctx.ellipse(0, my, hr * 0.3, hr * 0.21, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#9c4a5a';
    for (const sd of [-1, 1]) (ctx.beginPath(), ctx.ellipse(sd * hr * 0.1, my, hr * 0.05, hr * 0.08, 0, 0, TAU), ctx.fill());
  } else if (c.snout === 'beak') {
    ctx.fillStyle = '#ffa726';
    ctx.beginPath();
    ctx.moveTo(-hr * 0.16, my - hr * 0.1);
    ctx.lineTo(hr * 0.16, my - hr * 0.1);
    ctx.lineTo(0, my + (wow || happy ? hr * 0.28 : hr * 0.18));
    ctx.fill();
    ctx.fillStyle = '#e8323a';
    ctx.beginPath();
    ctx.ellipse(hr * 0.02, my + hr * 0.3, hr * 0.07, hr * 0.12, 0, 0, TAU);
    ctx.fill();
  } else {
    if (c.snout !== 'small') {
      ctx.fillStyle = c.snout === 'fox' ? '#fff6ee' : shade(c.body, 0.35);
      ctx.beginPath();
      ctx.ellipse(0, my + hr * 0.02, hr * 0.32, hr * 0.22, 0, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#2a1a10';
    ctx.beginPath();
    ctx.ellipse(0, my - hr * 0.06, hr * 0.1, hr * 0.07, 0, 0, TAU);
    ctx.fill();
    if (c.snout === 'goat') {
      ctx.fillStyle = '#f6f2ea';
      ctx.beginPath();
      ctx.moveTo(-hr * 0.15, my + hr * 0.18);
      ctx.lineTo(hr * 0.15, my + hr * 0.18);
      ctx.lineTo(0, my + hr * 0.6 + Math.sin(t * 0.1 + k) * hr * 0.04);
      ctx.fill();
    }
    if (c.snout === 'small') {
      ctx.strokeStyle = 'rgba(60,40,30,.5)';
      ctx.lineWidth = 1;
      for (const sd of [-1, 1]) for (const q of [-1, 1]) (ctx.beginPath(), ctx.moveTo(sd * hr * 0.12, my), ctx.lineTo(sd * hr * 0.5, my + q * hr * 0.08), ctx.stroke());
    }
  }
  // 입
  ctx.strokeStyle = '#5a2a1a';
  ctx.lineWidth = Math.max(1.2, hr * 0.07);
  if (c.snout !== 'beak') {
    ctx.beginPath();
    if (wow) (ctx.fillStyle = '#5a2a1a'), ctx.ellipse(0, my + hr * 0.2, hr * 0.07, hr * 0.09, 0, 0, TAU), ctx.fill();
    else if (sad) ctx.arc(0, my + hr * 0.3, hr * 0.1, Math.PI * 1.15, Math.PI * 1.85), ctx.stroke();
    else ctx.arc(0, my + (happy ? hr * 0.1 : hr * 0.12), happy ? hr * 0.13 : hr * 0.08, Math.PI * 0.15, Math.PI * 0.85), ctx.stroke();
  }
  // 모자·장식
  if (c.hat === 'cap') {
    ctx.fillStyle = '#3f6fc0';
    ctx.beginPath();
    ctx.ellipse(0, hy - hr * 0.62, hr * 0.78, hr * 0.42, 0, Math.PI, TAU);
    ctx.fill();
    ctx.fillStyle = '#2d5299';
    ctx.beginPath();
    ctx.ellipse(hr * 0.45, hy - hr * 0.62, hr * 0.55, hr * 0.12, 0.1, 0, TAU);
    ctx.fill();
  } else if (c.hat === 'chef') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-hr * 0.55, hy - hr * 1.05, hr * 1.1, hr * 0.35);
    for (let q = 0; q < 3; q++) (ctx.beginPath(), ctx.arc((q - 1) * hr * 0.38, hy - hr * 1.2, hr * 0.32, 0, TAU), ctx.fill());
    ctx.strokeStyle = 'rgba(0,0,0,.1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(-hr * 0.55, hy - hr * 1.05, hr * 1.1, hr * 0.35);
  } else if (c.hat === 'scarf') {
    ctx.fillStyle = '#9b59c6';
    ctx.beginPath();
    ctx.moveTo(-hr * 1.02, hy + hr * 0.05);
    ctx.quadraticCurveTo(-hr * 0.9, hy - hr * 1.05, 0, hy - hr * 1.0);
    ctx.quadraticCurveTo(hr * 0.9, hy - hr * 1.05, hr * 1.02, hy + hr * 0.05);
    ctx.quadraticCurveTo(hr * 0.75, hy - hr * 0.55, 0, hy - hr * 0.6);
    ctx.quadraticCurveTo(-hr * 0.75, hy - hr * 0.55, -hr * 1.02, hy + hr * 0.05);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    for (let q = 0; q < 4; q++) (ctx.beginPath(), ctx.arc((q - 1.5) * hr * 0.4, hy - hr * 0.82, hr * 0.05, 0, TAU), ctx.fill());
  } else if (c.hat === 'ribbon') {
    ctx.fillStyle = '#ff6b8a';
    ctx.beginPath();
    ctx.moveTo(hr * 0.35, hy - hr * 0.8);
    ctx.lineTo(hr * 0.05, hy - hr * 1.05);
    ctx.lineTo(hr * 0.1, hy - hr * 0.6);
    ctx.moveTo(hr * 0.35, hy - hr * 0.8);
    ctx.lineTo(hr * 0.7, hy - hr * 1.0);
    ctx.lineTo(hr * 0.62, hy - hr * 0.55);
    ctx.fill();
  }
  ctx.restore();
  if (happy && age < 80)
    for (let q = 0; q < 3; q++) {
      const a = (age + q * 25) % 60;
      ctx.globalAlpha = 1 - a / 60;
      emoji(ctx, '❤️', x + (q - 1) * u * 0.35, y - u * 1.25 - a * 0.6, u * 0.18);
      ctx.globalAlpha = 1;
    }
  if (sad && mood === 'sad') emoji(ctx, '💧', x + u * 0.32, y - u * 1.0, u * 0.14);
}

/** 오리 (구경꾼) */
function drawDuck(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, t: number, k: number, dir: number, jump: number) {
  const wad = Math.sin(t * 0.25 + k) * 0.12;
  ctx.fillStyle = 'rgba(40,30,10,.25)';
  ctx.beginPath();
  ctx.ellipse(x, y, u * 0.4, u * 0.08, 0, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.translate(x, y - jump);
  ctx.scale(dir, 1);
  ctx.rotate(wad);
  ctx.fillStyle = k % 3 ? '#ffe066' : '#fbfbf5';
  ctx.beginPath();
  ctx.ellipse(0, -u * 0.3, u * 0.38, u * 0.26, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(u * 0.28, -u * 0.62, u * 0.2, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ff9a2e';
  ctx.beginPath();
  ctx.ellipse(u * 0.5, -u * 0.6, u * 0.14, u * 0.06, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#2a1a10';
  ctx.beginPath();
  ctx.arc(u * 0.33, -u * 0.67, u * 0.04, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawBackdrop(ctx: CanvasRenderingContext2D, s: DiceState, w: number, X: F, Y: F, R: F, t: number) {
  const si = s.stage, P = s.P, D = s.D;
  const wx = D.def.weather ? D.weather[Math.min(P.writes, D.weather.length - 1)] : 3;
  let [c0, c1] = SKY[si];
  if (wx === 2) (c0 = '#8a9aa8'), (c1 = '#d6d6d0');
  const sky = ctx.createLinearGradient(0, Y(0.06), 0, Y(0.3));
  sky.addColorStop(0, c0);
  sky.addColorStop(1, c1);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, Y(0.36));
  // 해·달
  const night = si === DAYS.length - 1;
  ctx.fillStyle = night ? '#fff4c8' : wx === 2 ? 'rgba(255,255,255,.35)' : '#fff3a0';
  ctx.beginPath();
  ctx.arc(X(0.86), Y(0.165), R(0.045), 0, TAU);
  ctx.fill();
  if (!night && wx !== 2) {
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.arc(X(0.86), Y(0.165), R(0.07 + 0.006 * Math.sin(t * 0.05)), 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // 구름
  for (let k = 0; k < 3; k++) {
    const cx = ((t * 0.04 * (1 + k * 0.3) + k * 140) % (w + 120)) - 60, cy = Y(0.14 + k * 0.025);
    ctx.fillStyle = wx === 2 ? 'rgba(120,130,140,.75)' : 'rgba(255,255,255,.8)';
    for (let q = 0; q < 4; q++) (ctx.beginPath(), ctx.arc(cx + q * R(0.03), cy - (q % 2) * R(0.012), R(0.022 + (q % 2) * 0.008), 0, TAU), ctx.fill());
  }
  // 먼 언덕
  ctx.fillStyle = night ? '#3c3a6a' : '#9fcf8a';
  ctx.beginPath();
  ctx.moveTo(0, Y(0.27));
  for (let k = 0; k <= 10; k++) ctx.lineTo(X(k / 10), Y(0.235 - 0.02 * Math.sin(k * 1.3 + 1)));
  ctx.lineTo(w, Y(0.27));
  ctx.fill();
  // 먼 천막 줄
  for (let k = 0; k < 6; k++) {
    const x = X(0.06 + k * 0.18), y = Y(0.272), tw = R(0.12), thh = R(0.05);
    const col = ['#e85d5d', '#4f9de0', '#f2b33d', '#6cc070', '#c47ee0', '#ff8f5a'][k];
    ctx.fillStyle = shade(col, -0.25);
    ctx.fillRect(x - tw * 0.42, y - thh * 0.55, tw * 0.84, thh * 0.55);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x - tw / 2, y - thh * 0.5);
    ctx.lineTo(x, y - thh * 1.2);
    ctx.lineTo(x + tw / 2, y - thh * 0.5);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.45)';
    ctx.beginPath();
    ctx.moveTo(x - tw * 0.18, y - thh * 0.5);
    ctx.lineTo(x, y - thh * 1.2);
    ctx.lineTo(x + tw * 0.05, y - thh * 0.5);
    ctx.fill();
  }
  // 길바닥 (돌길)
  const gr = ctx.createLinearGradient(0, Y(0.27), 0, Y(0.345));
  gr.addColorStop(0, night ? '#6a5a70' : '#d9c3a0');
  gr.addColorStop(1, night ? '#4a3d52' : '#c2a47c');
  ctx.fillStyle = gr;
  ctx.fillRect(0, Y(0.27), w, Y(0.08));
  ctx.fillStyle = 'rgba(120,90,60,.18)';
  for (let k = 0; k < 22; k++) (ctx.beginPath(), ctx.ellipse(X(hsh(k) * 1.0), Y(0.285 + hsh(k * 5) * 0.05), R(0.02), R(0.006), 0, 0, TAU), ctx.fill());
  // 깃발 줄
  ctx.strokeStyle = 'rgba(90,60,30,.7)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let k = 0; k <= 20; k++) {
    const x = X(k / 20), y = Y(0.138 + 0.03 * Math.sin((k / 20) * Math.PI));
    k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.stroke();
  for (let k = 0; k < 11; k++) {
    const q = (k + 0.5) / 11, x = X(q), y = Y(0.138 + 0.03 * Math.sin(q * Math.PI)), sw = Math.sin(t * 0.08 + k) * R(0.006);
    ctx.fillStyle = ['#ff5a6e', '#ffd23f', '#4fc3ff', '#7ee07e'][k % 4];
    ctx.beginPath();
    ctx.moveTo(x - R(0.018), y);
    ctx.lineTo(x + R(0.018), y);
    ctx.lineTo(x + sw, y + R(0.035));
    ctx.fill();
  }
  // 구경꾼: 오리 가족이 지나간다 (축제면 펄쩍)
  const fj = s.fest > 0 && t - s.fest < 150 ? Math.abs(Math.sin((t - s.fest) * 0.25)) : 0;
  for (let k = 0; k < 3; k++) {
    const sp = 0.0006, x = (((t * sp + k * 0.05 + 0.3) % 1.3) - 0.15);
    drawDuck(ctx, X(x), Y(0.322), R(k ? 0.04 : 0.055), t, k, 1, R(0.03) * fj);
  }
  // 모여든 구경꾼 (족보를 이어 적을수록)
  const crowd = Math.min(5, s.streak);
  for (let k = 0; k < crowd; k++) {
    const c = CUSTS[(k * 2 + 3 + s.stage) % CUSTS.length], cx = X(0.07 + k * 0.085), cy = Y(0.345);
    const cheer = s.combo && t - s.combo.t0 < 60 ? 'happy' : fj > 0 ? 'happy' : 'wait';
    drawAnimal(ctx, cx, cy, R(0.085), c, cheer, t, k * 3, s.combo ? t - s.combo.t0 : t - s.fest);
  }
  // 날씨
  if (D.def.weather) {
    if (wx === 2) {
      ctx.strokeStyle = 'rgba(190,215,240,.7)';
      ctx.lineWidth = 1.2;
      for (let k = 0; k < 40; k++) {
        const x = (hsh(k) * w + t * 0.8) % w, y = ((hsh(k * 3) * Y(0.34) + t * 6) % Y(0.34)) + Y(0.02);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - R(0.006), y + R(0.025));
        ctx.stroke();
      }
    } else if (wx === 4) {
      const cols = ['#ff5a5a', '#ffa64d', '#ffe14d', '#6ddc6d', '#4fb3ff', '#9b7bff'];
      ctx.lineWidth = R(0.009);
      cols.forEach((col, k) => {
        ctx.strokeStyle = col;
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        ctx.arc(X(0.5), Y(0.34), R(0.42 - k * 0.009), Math.PI * 1.08, Math.PI * 1.92);
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
    }
  }
  // 좌판 기둥
  for (const px of [0.022, 0.978]) {
    const g = ctx.createLinearGradient(X(px) - R(0.016), 0, X(px) + R(0.016), 0);
    g.addColorStop(0, '#6b4424');
    g.addColorStop(0.5, '#a8743f');
    g.addColorStop(1, '#5a3a1e');
    ctx.fillStyle = g;
    ctx.fillRect(X(px) - R(0.016), Y(0.07), R(0.032), Y(0.29));
  }
  // 줄무늬 차양 (물결 끝)
  const ay0 = Y(0.066), ay1 = Y(0.112), nst = 9;
  for (let k = 0; k < nst; k++) {
    const x0 = (k / nst) * w, x1 = ((k + 1) / nst) * w;
    const g = ctx.createLinearGradient(0, ay0, 0, ay1);
    const col = k % 2 ? '#fff3dc' : '#e8493f';
    g.addColorStop(0, shade(col, -0.3));
    g.addColorStop(1, col);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x0, ay0);
    ctx.lineTo(x1, ay0);
    ctx.lineTo(x1, ay1);
    ctx.arc((x0 + x1) / 2, ay1, (x1 - x0) / 2, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
  }
  const sh = ctx.createLinearGradient(0, ay1, 0, ay1 + R(0.05));
  sh.addColorStop(0, 'rgba(60,30,10,.28)');
  sh.addColorStop(1, 'rgba(60,30,10,0)');
  ctx.fillStyle = sh;
  ctx.fillRect(0, ay1, w, R(0.05));
  // 종이 등
  for (const [lx, k] of [[0.12, 0], [0.5, 1], [0.88, 2]] as [number, number][]) {
    const sw = Math.sin(t * 0.04 + k) * 0.08 + (s.fest > 0 && t - s.fest < 90 ? Math.sin((t - s.fest) * 0.3) * 0.3 : 0);
    ctx.save();
    ctx.translate(X(lx), ay1 + R(0.01));
    ctx.rotate(sw);
    ctx.strokeStyle = '#5a3a1e';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, R(0.02));
    ctx.stroke();
    if (night || (s.fest > 0 && t - s.fest < 170)) {
      ctx.fillStyle = 'rgba(255,200,90,.3)';
      ctx.beginPath();
      ctx.arc(0, R(0.045), R(0.05), 0, TAU);
      ctx.fill();
    }
    const lg = ctx.createRadialGradient(-R(0.008), R(0.04), R(0.004), 0, R(0.045), R(0.03));
    lg.addColorStop(0, '#ffd27a');
    lg.addColorStop(1, '#e8582f');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.ellipse(0, R(0.045), R(0.022), R(0.027), 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#5a3a1e';
    ctx.fillRect(-R(0.012), R(0.016), R(0.024), R(0.005));
    ctx.fillRect(-R(0.012), R(0.07), R(0.024), R(0.005));
    ctx.restore();
  }
}

function drawCustomers(ctx: CanvasRenderingContext2D, s: DiceState, X: F, Y: F, R: F, t: number) {
  const D = s.D, n = D.orders.length;
  D.orders.forEach((o, j) => {
    const m = s.cmood[j] ?? 'wait', age = t - (s.cmoodT[j] ?? 0);
    const u = R(n > 1 ? 0.19 : 0.215);
    // 하루가 시작되면 손님이 걸어 들어온다
    const enter = cl01((t - s.startT - j * 12) / 36), x = custX(s, j) + (1 - easeIO(enter)) * 0.5;
    drawAnimal(ctx, X(x), Y(0.355), u, CUSTS[o.who], m === 'done' ? 'happy' : m, t, j * 5 + 1, m === 'done' ? 30 : age);
  });
}

function drawCounter(ctx: CanvasRenderingContext2D, w: number, X: F, Y: F, R: F) {
  // 좌판 윗면 + 앞판 (나뭇결)
  const top = ctx.createLinearGradient(0, Y(0.336), 0, Y(0.352));
  top.addColorStop(0, '#d9a066');
  top.addColorStop(1, '#b07a44');
  ctx.fillStyle = top;
  ctx.fillRect(0, Y(0.336), w, Y(0.016));
  const fr = ctx.createLinearGradient(0, Y(0.352), 0, Y(0.414));
  fr.addColorStop(0, '#7a4a26');
  fr.addColorStop(1, '#5a3418');
  ctx.fillStyle = fr;
  ctx.fillRect(0, Y(0.352), w, Y(0.062));
  ctx.strokeStyle = 'rgba(40,20,8,.25)';
  ctx.lineWidth = 1;
  for (let k = 0; k < 4; k++) {
    ctx.beginPath();
    ctx.moveTo(0, Y(0.36 + k * 0.014));
    for (let q = 0; q <= 8; q++) ctx.lineTo(X(q / 8), Y(0.36 + k * 0.014 + 0.002 * Math.sin(q * 1.7 + k)));
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,230,190,.35)';
  ctx.fillRect(0, Y(0.336), w, 1.5);
  void R;
}

/** 손님 주문 말풍선 (+ 족보 그림) */
function drawOrders(ctx: CanvasRenderingContext2D, s: DiceState, X: F, Y: F, R: F, t: number, font: FontF) {
  const D = s.D, P = s.P, n = D.orders.length;
  D.orders.forEach((o, j) => {
    const enter = cl01((t - s.startT - 30 - j * 12) / 14);
    if (enter <= 0) return;
    const st = P.ord[j], c = CUSTS[o.who], type = D.slots[o.k];
    const bx = X(0.035), bw = X(n > 1 ? 0.43 : 0.52), bh = R(n > 1 ? 0.078 : 0.09), by = Y(n > 1 ? 0.13 + j * 0.088 : 0.148);
    const sc = 0.6 + 0.4 * easeIO(enter) + (s.cmood[j] === 'happy' ? Math.sin((t - s.cmoodT[j]) * 0.3) * 0.03 * Math.max(0, 1 - (t - s.cmoodT[j]) / 40) : 0);
    ctx.save();
    ctx.translate(bx + bw / 2, by + bh / 2);
    ctx.scale(sc, sc);
    ctx.translate(-bx - bw / 2, -by - bh / 2);
    ctx.fillStyle = 'rgba(60,30,10,.25)';
    ctx.beginPath();
    ctx.roundRect(bx + 2, by + 3, bw, bh, R(0.022));
    ctx.fill();
    ctx.fillStyle = st === 1 ? '#eaffd8' : st === -1 ? '#e6e0d8' : '#fffaf0';
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, R(0.022));
    ctx.fill();
    // 꼬리: 손님 쪽으로
    const cx = X(custX(s, j)) - R(0.08);
    ctx.beginPath();
    ctx.moveTo(bx + bw - R(0.01), by + bh * 0.45);
    ctx.lineTo(Math.min(cx, bx + bw + R(0.06)), by + bh * 0.75);
    ctx.lineTo(bx + bw - R(0.01), by + bh * 0.78);
    ctx.fill();
    ctx.strokeStyle = st === 1 ? '#6cc070' : '#d9b88a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, R(0.022));
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    if (n === 1) {
      font(0.038, 900);
      ctx.fillStyle = st === -1 ? '#9a9088' : '#4a2a14';
      const line = st === 1 ? `${c.name}: 고마워요! ★` : st === -1 ? `${c.name}: 다음에 올게요…` : `📜 ${c.name}: ${ORDER_SAY[type] ?? SLOT_NAME[type]}`;
      let fs = 0.038;
      while (ctx.measureText(line).width > bw - R(0.07) && fs > 0.034) font((fs -= 0.001), 900);
      ctx.fillText(line, bx + R(0.016), by + bh * 0.3);
      // 족보 그림 (작은 주사위)
      const ex = EXAMPLE[type] ?? [];
      ex.forEach((f, q) => drawDie(ctx, bx + R(0.034) + q * R(0.04), by + bh * 0.72, R(0.03), f, { rot: 0, kind: 0, t }));
      font(0.032, 800);
      ctx.fillStyle = '#9a6a3a';
      ctx.fillText(`→ ${SLOT_NAME[type]} 칸`, bx + R(0.034) + ex.length * R(0.04), by + bh * 0.72);
    } else {
      font(0.034, 900);
      ctx.fillStyle = st === -1 ? '#9a9088' : '#4a2a14';
      const dl = o.dl && !st ? ` ⏰${Math.max(0, o.dl - P.writes)}번 안에` : '';
      ctx.fillText(`${st === 1 ? '✓' : st === -1 ? '✗' : '📜'} ${SLOT_NAME[type]}${dl}`, bx + R(0.016), by + bh * 0.33);
      const ex = EXAMPLE[type] ?? [];
      ex.forEach((f, q) => drawDie(ctx, bx + R(0.03) + q * R(0.036), by + bh * 0.72, R(0.027), f, { rot: 0, kind: 0, t }));
      font(0.028, 800);
      ctx.fillStyle = '#9a6a3a';
      ctx.fillText(c.name, bx + R(0.21), by + bh * 0.72);
    }
    if (st === 1) {
      font(0.06, 900);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffc847';
      ctx.fillText('★', bx + bw - R(0.04), by + bh * 0.5);
    }
    ctx.restore();
  });
}
const SLOT_HINT: Record<SlotT, string> = { n1: '1 눈의 합', n2: '2 눈의 합', n3: '3 눈의 합', n4: '4 눈의 합', n5: '5 눈의 합', n6: '6 눈의 합', three: '같은 눈 3', four: '같은 눈 4', full: '3 + 2 → 25', small: '4줄 → 30', large: '5줄 → 40', five: '같은 눈 5 → 50', chance: '눈 다 더하기' };
const EXAMPLE: Partial<Record<SlotT, number[]>> = { three: [5, 5, 5], four: [3, 3, 3, 3], full: [2, 2, 2, 6, 6], small: [1, 2, 3, 4], large: [2, 3, 4, 5, 6], five: [6, 6, 6, 6, 6] };

/** 좌판 앞판의 목표 막대: 🪙 합계 · 목표 · ★ 대박 (덤 보너스 날은 오른쪽에 4·5·6 합) */
function drawBar(ctx: CanvasRenderingContext2D, s: DiceState, X: F, Y: F, R: F, t: number, font: FontF) {
  const P = s.P, d = s.D.def, y = Y(BAR_Y);
  const x0 = X(0.2), x1 = X(d.bonus ? 0.74 : 0.95), bh = R(0.024), mx = d.T3 * 1.08;
  font(0.036, 900);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  emoji(ctx, '🪙', X(0.04), y, R(0.04));
  ctx.textAlign = 'left';
  font(0.04, 900);
  outlined(ctx, `${P.total}`, X(0.07), y + 1, '#ffe9a8');
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath();
  ctx.roundRect(x0, y - bh / 2, x1 - x0, bh, bh / 2);
  ctx.fill();
  const q = Math.min(1, P.total / mx), q1 = d.T1 / mx, q3 = d.T3 / mx;
  if (q > 0) {
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, '#ffcf4a');
    g.addColorStop(q1, '#9be35a');
    g.addColorStop(Math.min(1, q3), '#ffd84a');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(x0, y - bh / 2, Math.max(bh, (x1 - x0) * q), bh, bh / 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.fillRect(x0 + bh / 2, y - bh / 2 + 2, Math.max(0, (x1 - x0) * q - bh), 2);
  }
  for (const [qq, lab, v, col] of [[q1, '목표', d.T1, '#c8ffb0'], [q3, '★대박', d.T3, '#ffe066']] as [number, string, number, string][]) {
    const xx = x0 + (x1 - x0) * qq, okk = P.total >= v;
    ctx.fillStyle = okk ? col : 'rgba(255,255,255,.75)';
    ctx.fillRect(xx - 1.5, y - bh * 0.9, 3, bh * 1.8);
    font(0.03, 900);
    ctx.textAlign = 'center';
    outlined(ctx, `${okk ? '✓' : ''}${lab} ${v}`, Math.min(x1 - R(0.05), Math.max(x0 + R(0.05), xx)), y - bh * 0.5 - R(0.016), okk ? col : '#fff6e0', 'rgba(40,20,8,.85)', 2.5);
  }
  if (d.bonus) {
    const b = d.bonus, got = P.bonus;
    font(0.03, 900);
    ctx.textAlign = 'center';
    const tx = got ? `🎁 덤 +${b.v} ✓` : `🎁 ${P.numSum}/${b.B}`;
    const wv = Math.sin(t * 0.1) * (got ? 0 : 0.5);
    ctx.fillStyle = got ? 'rgba(255,214,90,.9)' : 'rgba(255,240,210,.18)';
    ctx.beginPath();
    ctx.roundRect(X(0.765), y - R(0.022), X(0.2), R(0.044), R(0.022));
    ctx.fill();
    ctx.fillStyle = got ? '#5a3010' : '#fff1d6';
    ctx.fillText(tx, X(0.865) + wv, y + 1);
  }
}

/** 장부: 나무판에 꽂은 종이 칸들 */
function drawSheet(ctx: CanvasRenderingContext2D, s: DiceState, X: F, Y: F, R: F, t: number, font: FontF) {
  const P = s.P, D = s.D, d = D.def, n = D.slots.length, rects = slotRects(n);
  // 판
  const g = ctx.createLinearGradient(0, Y(0.414), 0, Y(0.64));
  g.addColorStop(0, '#8a5a32');
  g.addColorStop(1, '#6e4524');
  ctx.fillStyle = g;
  ctx.fillRect(X(0), Y(0.414), X(1), Y(0.228));
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  ctx.fillRect(0, Y(0.414), X(1), R(0.008));
  ctx.strokeStyle = 'rgba(40,20,8,.2)';
  ctx.lineWidth = 1;
  for (let k = 0; k < 6; k++) (ctx.beginPath(), ctx.moveTo(0, Y(0.43 + k * 0.036)), ctx.lineTo(X(1), Y(0.432 + k * 0.036)), ctx.stroke());
  const gold = goldFace(P), cnt = cntOf(P.dice);
  for (let k = 0; k < n; k++) {
    const r = rects[k], type = D.slots[k], done = P.sc[k] >= 0, pressed = s.press === k && s.phase === 'play';
    const ordJ = D.orders.findIndex((o) => o.k === k), ost = ordJ >= 0 ? P.ord[ordJ] : 0;
    const pot = P.rolled && !done ? scoreOf(type, cnt, gold) : -1;
    const potGold = pot > 0 && D.mode === 1 && pot === 2 * scoreOf(type, cnt, 0);
    const st = s.stamp[k], stq = st > 0 && t >= st ? cl01((t - st) / 8) : st > 0 && t < st ? -1 : 1;
    const rot = (hsh(k + s.stage * 9) - 0.5) * 0.05, lift = pressed ? 0.008 : 0;
    const cx = X(r.x), cy = Y(r.y - lift), cw = R(r.w), ch = R(r.h);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    if (pressed) ctx.scale(1.05, 1.05);
    // 그림자
    ctx.fillStyle = 'rgba(30,14,4,.35)';
    ctx.beginPath();
    ctx.roundRect(-cw / 2 + 2, -ch / 2 + 4, cw, ch, R(0.014));
    ctx.fill();
    // 종이
    const pg = ctx.createLinearGradient(0, -ch / 2, 0, ch / 2);
    const base = done ? (P.sc[k] > 0 ? '#fff6df' : '#e9e2d6') : ordJ >= 0 && ost === 0 ? '#fff3d0' : '#fffaf0';
    pg.addColorStop(0, base);
    pg.addColorStop(1, shade(base, -0.08));
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.roundRect(-cw / 2, -ch / 2, cw, ch, R(0.014));
    ctx.fill();
    // 주문 칸 테두리 (주황 반짝)
    if (ordJ >= 0 && ost === 0) {
      ctx.strokeStyle = `rgba(255,140,40,${0.65 + 0.3 * Math.sin(t * 0.12)})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    } else if (pressed) {
      ctx.strokeStyle = '#6fe0ff';
      ctx.lineWidth = 3;
      ctx.stroke();
    } else if (pot > 0 && !done) {
      ctx.strokeStyle = 'rgba(110,190,80,.7)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    // 압정
    ctx.fillStyle = '#d8332a';
    ctx.beginPath();
    ctx.arc(0, -ch / 2 + R(0.008), R(0.007), 0, TAU);
    ctx.fill();
    // 이름
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    font(0.036, 900);
    let lab = SLOT_NAME[type];
    ctx.fillStyle = done ? '#8a7a68' : '#4a2a14';
    while (ctx.measureText(lab).width > cw - R(0.02) && lab.includes(' ')) lab = lab.replace(' ', '');
    ctx.fillText(lab, 0, -ch * 0.2);
    // 점수
    if (done && stq >= 0) {
      const v = P.sc[k], sc2 = 1 + (1 - stq) * 1.2;
      ctx.save();
      ctx.translate(0, ch * 0.2);
      ctx.scale(sc2, sc2);
      ctx.rotate(-0.12);
      if (v > 0) {
        ctx.strokeStyle = 'rgba(200,40,30,.75)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, R(0.045), R(0.025), 0, 0, TAU);
        ctx.stroke();
        font(0.05, 900);
        ctx.fillStyle = '#c8281e';
        ctx.fillText(`${v}`, 0, 1);
      } else {
        font(0.046, 900);
        ctx.fillStyle = '#9a8f82';
        ctx.fillText('✗ 0', 0, 1);
      }
      ctx.restore();
    } else if (!done) {
      if (pot >= 0) {
        font(0.044, 900);
        ctx.fillStyle = pot > 0 ? '#3f8f2a' : 'rgba(120,100,80,.45)';
        ctx.fillText(pot > 0 ? `+${pot}` : '0', 0, ch * 0.2);
      } else {
        font(0.03, 800);
        ctx.fillStyle = 'rgba(120,90,60,.55)';
        ctx.fillText(SLOT_HINT[type], 0, ch * 0.2);
      }
    }
    // 딱지들
    if (ordJ >= 0) {
      const c = CUSTS[D.orders[ordJ].who];
      ctx.fillStyle = ost === 1 ? '#ffc847' : ost === -1 ? '#b0a69a' : '#ff8a2a';
      ctx.beginPath();
      ctx.roundRect(cw / 2 - R(0.05), -ch / 2 - R(0.012), R(0.058), R(0.034), R(0.012));
      ctx.fill();
      font(0.026, 900);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(ost === 1 ? '★' : ost === -1 ? '✗' : '주문', cw / 2 - R(0.021), -ch / 2 + R(0.005));
      void c;
    }
    if (potGold) {
      font(0.028, 900);
      ctx.fillStyle = '#d99a00';
      ctx.beginPath();
      ctx.roundRect(-cw / 2 - R(0.008), -ch / 2 - R(0.012), R(0.05), R(0.032), R(0.012));
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText('×2', -cw / 2 + R(0.017), -ch / 2 + R(0.004));
    }
    if (d.bonus && isNum(type) && !done) {
      ctx.font = `${Math.max(12, R(0.03))}px system-ui`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText('🎁', cw / 2 - R(0.02), ch / 2 - R(0.018));
    }
    ctx.restore();
  }
}

function drawTray(ctx: CanvasRenderingContext2D, X: F, Y: F, R: F, t: number) {
  const x0 = X(0.015), x1 = X(0.985), y0 = Y(0.648), y1 = Y(0.99), rim = R(0.024);
  // 바깥 나무 테
  ctx.fillStyle = 'rgba(20,10,4,.4)';
  ctx.beginPath();
  ctx.roundRect(x0 + 2, y0 + 5, x1 - x0, y1 - y0, R(0.03));
  ctx.fill();
  const wg = ctx.createLinearGradient(0, y0, 0, y1);
  wg.addColorStop(0, '#c48a50');
  wg.addColorStop(1, '#8a5a30');
  ctx.fillStyle = wg;
  ctx.beginPath();
  ctx.roundRect(x0, y0, x1 - x0, y1 - y0, R(0.03));
  ctx.fill();
  // 펠트
  const fg = ctx.createRadialGradient(X(0.5), Y(0.8), R(0.05), X(0.5), Y(0.82), R(0.6));
  fg.addColorStop(0, '#3f9a5a');
  fg.addColorStop(1, '#1f6a38');
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.roundRect(x0 + rim, y0 + rim, x1 - x0 - rim * 2, y1 - y0 - rim * 1.6, R(0.018));
  ctx.fill();
  // 안쪽 그림자 (깊이)
  const ig = ctx.createLinearGradient(0, y0 + rim, 0, y0 + rim + R(0.05));
  ig.addColorStop(0, 'rgba(0,20,0,.45)');
  ig.addColorStop(1, 'rgba(0,20,0,0)');
  ctx.fillStyle = ig;
  ctx.fillRect(x0 + rim, y0 + rim, x1 - x0 - rim * 2, R(0.05));
  // 펠트 결
  ctx.fillStyle = 'rgba(255,255,255,.04)';
  for (let k = 0; k < 40; k++) ctx.fillRect(X(0.05 + hsh(k) * 0.9), Y(0.68 + hsh(k * 3) * 0.28), 2, 2);
  // 놋쇠 못
  for (const [px, py] of [[0.035, 0.665], [0.965, 0.665], [0.035, 0.972], [0.965, 0.972]]) {
    ctx.fillStyle = '#ffd77a';
    ctx.beginPath();
    ctx.arc(X(px), Y(py), R(0.007), 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,240,200,.35)';
  ctx.fillRect(x0 + R(0.03), y0 + 2, x1 - x0 - R(0.06), 2);
  void t;
}

function drawPlank(ctx: CanvasRenderingContext2D, s: DiceState, X: F, Y: F, R: F) {
  // 가게 바닥 (아래 전체)
  const fl = ctx.createLinearGradient(0, Y(0.99), 0, Y(A));
  fl.addColorStop(0, '#7a4f2c');
  fl.addColorStop(1, '#4a2e18');
  ctx.fillStyle = fl;
  ctx.fillRect(0, Y(0.99), X(1), Y(A - 0.99));
  ctx.strokeStyle = 'rgba(30,14,4,.3)';
  ctx.lineWidth = 1;
  for (let k = 0; k < 5; k++) (ctx.beginPath(), ctx.moveTo(0, Y(1.12 + k * 0.05)), ctx.lineTo(X(1), Y(1.12 + k * 0.05)), ctx.stroke());
  // 받침 선반
  const y0 = Y(1.0), y1 = Y(1.095);
  ctx.fillStyle = 'rgba(20,10,4,.35)';
  ctx.fillRect(X(0.03), y1, X(0.94), R(0.012));
  const pg = ctx.createLinearGradient(0, y0, 0, y1);
  pg.addColorStop(0, '#e0b07a');
  pg.addColorStop(0.35, '#c89058');
  pg.addColorStop(1, '#9a6a3a');
  ctx.fillStyle = pg;
  ctx.beginPath();
  ctx.roundRect(X(0.03), y0, X(0.94), y1 - y0, R(0.014));
  ctx.fill();
  for (let i = 0; i < 5; i++) {
    const heavy = s.D.mode === 2 && i === s.D.sp;
    ctx.fillStyle = heavy ? 'rgba(60,40,20,.25)' : 'rgba(110,30,30,.55)';
    ctx.beginPath();
    ctx.ellipse(X(LX[i]), Y(HOLD_Y + 0.03), R(0.06), R(0.018), 0, 0, TAU);
    ctx.fill();
  }
}

/** 너구리 사장 + 나무 컵 (x,y = 발 밑, u = 키) */
function drawRaccoon(ctx: CanvasRenderingContext2D, s: DiceState, x: number, y: number, u: number, t: number) {
  const m = s.mood, age = t - s.moodT, ru = t - s.rollT0;
  const dizzy = m === 'dizzy', proud = m === 'proud', wow = m === 'wow', sweat = m === 'sweat';
  const shaking = s.phase === 'roll' && ru < 9;
  const fall = dizzy ? Math.min(1, age / 14) : 0;
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath();
  ctx.ellipse(x, y, u * 0.42, u * 0.07, 0, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(fall * 1.15);
  const hop = proud ? Math.abs(Math.sin(age * 0.2)) * u * 0.06 * Math.max(0, 1 - age / 70) : 0;
  ctx.translate(0, -hop);
  const fur = '#8d8a90', dark = '#3b3640', light = '#f2efe8';
  // 꼬리 (줄무늬)
  ctx.save();
  ctx.translate(-u * 0.28, -u * 0.2);
  ctx.rotate(-0.6 + Math.sin(t * 0.06) * 0.15 + (proud ? -0.4 : 0));
  for (let k = 0; k < 5; k++) {
    ctx.fillStyle = k % 2 ? dark : fur;
    ctx.beginPath();
    ctx.ellipse(-u * 0.04 * k, -u * 0.06 * k, u * (0.1 - k * 0.006), u * 0.07, -0.6, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  // 몸 + 앞치마
  const bg = ctx.createRadialGradient(-u * 0.08, -u * 0.38, u * 0.05, 0, -u * 0.3, u * 0.4);
  bg.addColorStop(0, shade(fur, 0.2));
  bg.addColorStop(1, shade(fur, -0.2));
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.ellipse(0, -u * 0.28, u * 0.27, u * 0.3, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#3d8a5a';
  ctx.beginPath();
  ctx.moveTo(-u * 0.2, -u * 0.44);
  ctx.lineTo(u * 0.2, -u * 0.44);
  ctx.lineTo(u * 0.24, -u * 0.04);
  ctx.quadraticCurveTo(0, u * 0.03, -u * 0.24, -u * 0.04);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2f6e47';
  ctx.fillRect(-u * 0.09, -u * 0.22, u * 0.18, u * 0.09);
  ctx.fillStyle = '#ffd77a';
  ctx.font = `900 ${Math.max(12, u * 0.07)}px system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('너굴', 0, -u * 0.32);
  // 발
  ctx.fillStyle = dark;
  for (const sd of [-1, 1]) (ctx.beginPath(), ctx.ellipse(sd * u * 0.12, -u * 0.01, u * 0.08, u * 0.04, 0, 0, TAU), ctx.fill());
  // 머리
  const hy = -u * 0.72, hr = u * 0.25;
  const look = s.phase === 'roll' && ru >= 9 ? -0.15 : 0;
  ctx.save();
  ctx.translate(0, hy);
  ctx.rotate(look + (proud ? -0.18 : 0) + (sweat ? Math.sin(t * 0.3) * 0.04 : 0));
  for (const sd of [-1, 1]) {
    ctx.fillStyle = fur;
    ctx.beginPath();
    ctx.moveTo(sd * hr * 0.35, -hr * 0.75);
    ctx.lineTo(sd * hr * 0.85, -hr * 1.2);
    ctx.lineTo(sd * hr * 0.95, -hr * 0.45);
    ctx.fill();
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.moveTo(sd * hr * 0.55, -hr * 0.78);
    ctx.lineTo(sd * hr * 0.82, -hr * 1.05);
    ctx.lineTo(sd * hr * 0.86, -hr * 0.6);
    ctx.fill();
  }
  const hg = ctx.createRadialGradient(-hr * 0.3, -hr * 0.35, hr * 0.1, 0, 0, hr * 1.1);
  hg.addColorStop(0, shade(fur, 0.3));
  hg.addColorStop(1, shade(fur, -0.1));
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.ellipse(0, 0, hr * 1.05, hr * 0.92, 0, 0, TAU);
  ctx.fill();
  // 볼·주둥이 (흰)
  const puff = shaking ? 1.18 : 1;
  ctx.fillStyle = light;
  ctx.beginPath();
  ctx.ellipse(-hr * 0.42, hr * 0.32, hr * 0.38 * puff, hr * 0.3 * puff, 0.3, 0, TAU);
  ctx.ellipse(hr * 0.42, hr * 0.32, hr * 0.38 * puff, hr * 0.3 * puff, -0.3, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, -hr * 0.55, hr * 0.22, hr * 0.18, 0, 0, TAU);
  ctx.fill();
  // 눈 가면
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.ellipse(-hr * 0.42, -hr * 0.08, hr * 0.34, hr * 0.22, -0.25, 0, TAU);
  ctx.ellipse(hr * 0.42, -hr * 0.08, hr * 0.34, hr * 0.22, 0.25, 0, TAU);
  ctx.fill();
  // 눈
  ctx.strokeStyle = '#ffffff';
  ctx.fillStyle = '#ffffff';
  ctx.lineWidth = Math.max(2, hr * 0.09);
  ctx.lineCap = 'round';
  for (const sd of [-1, 1]) {
    const ex = sd * hr * 0.4, ey = -hr * 0.08;
    if (dizzy) {
      ctx.beginPath();
      for (let q = 0; q < 14; q++) {
        const a = q * 0.7 + t * 0.3, rr2 = hr * 0.015 * q;
        q ? ctx.lineTo(ex + Math.cos(a) * rr2, ey + Math.sin(a) * rr2) : ctx.moveTo(ex, ey);
      }
      ctx.stroke();
    } else if (shaking) {
      ctx.beginPath();
      ctx.moveTo(ex - sd * hr * 0.12, ey - hr * 0.08);
      ctx.lineTo(ex + sd * hr * 0.08, ey);
      ctx.lineTo(ex - sd * hr * 0.12, ey + hr * 0.08);
      ctx.stroke();
    } else if (proud) {
      ctx.beginPath();
      ctx.arc(ex, ey + hr * 0.05, hr * 0.12, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else {
      const er = wow ? hr * 0.15 : hr * 0.1, blink = !wow && Math.floor(t) % 180 < 6;
      if (blink) (ctx.beginPath(), ctx.moveTo(ex - er, ey), ctx.lineTo(ex + er, ey), ctx.stroke());
      else {
        ctx.beginPath();
        ctx.arc(ex, ey, er * 1.25, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#1a1418';
        ctx.beginPath();
        ctx.arc(ex + (s.phase === 'roll' ? 0 : sd * er * 0.15), ey + er * 0.1, er * 0.8, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ex - er * 0.25, ey - er * 0.3, er * 0.3, 0, TAU);
        ctx.fill();
      }
    }
  }
  ctx.lineCap = 'butt';
  // 코·입
  ctx.fillStyle = '#1a1418';
  ctx.beginPath();
  ctx.ellipse(0, hr * 0.2, hr * 0.12, hr * 0.08, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#3a2420';
  ctx.lineWidth = Math.max(1.5, hr * 0.06);
  ctx.beginPath();
  if (wow || dizzy) (ctx.fillStyle = '#7a2a2a'), ctx.ellipse(0, hr * 0.45, hr * 0.1, hr * (dizzy ? 0.07 : 0.12), 0, 0, TAU), ctx.fill();
  else if (sweat) (ctx.moveTo(-hr * 0.15, hr * 0.45), ctx.quadraticCurveTo(0, hr * 0.36, hr * 0.15, hr * 0.45), ctx.stroke());
  else if (shaking) (ctx.moveTo(-hr * 0.12, hr * 0.4), ctx.lineTo(hr * 0.12, hr * 0.4), ctx.stroke());
  else (ctx.arc(-hr * 0.08, hr * 0.32, hr * 0.08, 0.2, Math.PI - 0.2), ctx.arc(hr * 0.08, hr * 0.32, hr * 0.08, 0.2, Math.PI - 0.2), ctx.stroke());
  if (sweat) emoji(ctx, '💦', hr * 0.95, -hr * 0.6 + Math.sin(t * 0.2) * 2, hr * 0.5);
  ctx.restore();
  if (dizzy) for (let q = 0; q < 3; q++) emoji(ctx, '⭐', Math.cos(t * 0.12 + q * 2.1) * u * 0.25, hy - u * 0.32 + Math.sin(t * 0.12 + q * 2.1) * u * 0.06, u * 0.1);
  if (proud && age < 60) emoji(ctx, '✨', u * 0.32, hy - u * 0.2, u * 0.13);
  // 컵 (앞발로 들고)
  let cx = u * 0.27, cy = -u * 0.3, cr = 0;
  if (shaking) (cx += Math.sin(ru * 2.2) * u * 0.05), (cy += -u * 0.28 + Math.cos(ru * 2.8) * u * 0.05), (cr = Math.sin(ru * 2.5) * 0.4);
  else if (s.phase === 'roll' && ru < 16) (cy -= u * 0.15 * (1 - (ru - 9) / 7)), (cr = 1.1 * (1 - (ru - 9) / 7));
  if (dizzy) (cx = u * 0.5), (cy = -u * 0.1), (cr = 2.2);
  drawCup(ctx, s, cx, cy, u * 0.36, cr, t);
  ctx.fillStyle = fur;
  for (const sd of [-1, 1]) (ctx.beginPath(), ctx.ellipse(cx + sd * u * 0.11, cy + u * 0.03, u * 0.055, u * 0.045, 0, 0, TAU), ctx.fill());
  ctx.restore();
}
function drawCup(ctx: CanvasRenderingContext2D, s: DiceState, x: number, y: number, u: number, rot: number, t: number) {
  const P = s.P, inCup = !P.rolled && s.phase === 'play';
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const w0 = u * 0.62, w1 = u * 0.5, hh = u * 0.7;
  const g = ctx.createLinearGradient(-w0 / 2, 0, w0 / 2, 0);
  g.addColorStop(0, '#6a3e1e');
  g.addColorStop(0.35, '#c4844a');
  g.addColorStop(1, '#5a3418');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-w0 / 2, -hh / 2);
  ctx.lineTo(w0 / 2, -hh / 2);
  ctx.lineTo(w1 / 2, hh / 2);
  ctx.lineTo(-w1 / 2, hh / 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(40,20,8,.4)';
  for (const q of [-0.18, 0.22]) ctx.fillRect(-w0 / 2 + 2, q * hh - 1.5, w0 - 4, 3);
  // 입구
  ctx.fillStyle = '#2a1608';
  ctx.beginPath();
  ctx.ellipse(0, -hh / 2, w0 / 2, u * 0.08, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#e0a868';
  ctx.lineWidth = 2;
  ctx.stroke();
  if (inCup) {
    // 컵에 든 주사위가 살짝 보인다
    for (let k = 0; k < 3; k++) {
      ctx.fillStyle = k === 1 && s.D.mode === 1 ? '#ffd23a' : k === 2 && s.D.mode === 2 ? '#a8a199' : '#fff6e0';
      ctx.save();
      ctx.translate((k - 1) * u * 0.17, -hh / 2 - u * 0.02 + Math.sin(t * 0.1 + k) * 1);
      ctx.rotate(k * 0.5);
      ctx.fillRect(-u * 0.07, -u * 0.07, u * 0.14, u * 0.11);
      ctx.restore();
    }
  }
  ctx.restore();
}

/** 컵 옆 판: 남은 굴리기 · 날씨 예보 · 뒤집개 */
function drawControls(ctx: CanvasRenderingContext2D, s: DiceState, X: F, Y: F, R: F, t: number, font: FontF) {
  const P = s.P, D = s.D, d = D.def;
  const can = s.phase === 'play' && canRoll(P);
  // 굴리기 표
  const px = X(0.6), py = Y(1.15);
  ctx.fillStyle = 'rgba(30,14,4,.55)';
  ctx.beginPath();
  ctx.roundRect(px - R(0.19), py - R(0.034), R(0.38), R(0.068), R(0.034));
  ctx.fill();
  font(0.034, 900);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff1d6';
  ctx.fillText(!P.rolled ? '🎲 컵을 톡!' : P.rolls > 0 ? '🎲 다시 굴리기' : '✍️ 칸에 적기', px - R(0.175), py + 1);
  const tot = D.weather[Math.min(P.writes, D.weather.length - 1)] ?? 3;
  for (let k = 0; k < tot; k++) {
    const on = k < P.rolls;
    ctx.fillStyle = on ? (can ? '#ffd23f' : '#e8c060') : 'rgba(255,255,255,.18)';
    ctx.beginPath();
    ctx.arc(px + R(0.165) - (tot - 1 - k) * R(0.026), py, R(on ? 0.011 : 0.008), 0, TAU);
    ctx.fill();
  }
  // 칸 진행
  font(0.03, 800);
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,240,215,.8)';
  ctx.fillText(`적은 칸 ${P.writes}/${D.slots.length}`, px, Y(1.205));
  // 날씨 예보
  if (d.weather) {
    const n = D.weather.length, sp = R(Math.min(0.064, 0.44 / n)), x0 = px - ((n - 1) * sp) / 2 - R(n >= 8 ? 0.03 : 0), y = Y(1.262);
    for (let k = 0; k < n; k++) {
      const cur = k === P.writes, past = k < P.writes, xx = x0 + k * sp;
      ctx.globalAlpha = past ? 0.3 : 1;
      ctx.fillStyle = cur ? 'rgba(255,230,140,.4)' : 'rgba(30,14,4,.4)';
      ctx.beginPath();
      ctx.roundRect(xx - sp * 0.46, y - R(0.032), sp * 0.92, R(0.07), R(0.014));
      ctx.fill();
      if (cur) {
        ctx.strokeStyle = '#ffe066';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      emoji(ctx, WEATHER_ICON[D.weather[k]], xx, y - R(0.008), R(n >= 8 ? 0.03 : 0.034));
      font(0.026, 900);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff6e0';
      ctx.fillText(n >= 7 ? `${D.weather[k]}` : `${D.weather[k]}번`, xx, y + R(0.024));
      ctx.globalAlpha = 1;
    }
  }
  // 뒤집개
  if (d.flips) {
    const fx0 = X(FLIP_X), fy0 = Y(FLIP_Y), on = s.armed, left = P.flips;
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath();
    ctx.ellipse(fx0, fy0 + R(0.06), R(0.07), R(0.015), 0, 0, TAU);
    ctx.fill();
    const bg = ctx.createRadialGradient(fx0 - R(0.02), fy0 - R(0.02), R(0.01), fx0, fy0, R(0.07));
    bg.addColorStop(0, on ? '#bff0ff' : left ? '#ffe7b8' : '#9a8f82');
    bg.addColorStop(1, on ? '#4fb3ff' : left ? '#d99a50' : '#6a6058');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(fx0, fy0, R(0.062) * (on ? 1 + 0.05 * Math.sin(t * 0.3) : 1), 0, TAU);
    ctx.fill();
    ctx.save();
    ctx.translate(fx0, fy0);
    ctx.rotate(-0.6 + (on ? Math.sin(t * 0.25) * 0.3 : 0));
    ctx.fillStyle = '#7a4a26';
    ctx.fillRect(-R(0.006), R(0.0), R(0.012), R(0.045));
    ctx.fillStyle = '#c8c8d0';
    ctx.beginPath();
    ctx.roundRect(-R(0.022), -R(0.04), R(0.044), R(0.045), R(0.01));
    ctx.fill();
    ctx.restore();
    font(0.03, 900);
    ctx.textAlign = 'center';
    outlined(ctx, `🔄 ${left}`, fx0, fy0 + R(0.085), left ? '#fff1d6' : '#b0a69a');
  }
}

const recentSay = new WeakMap<object, { x: number; y: number; t: number }[]>();
function drawEvents(ctx: CanvasRenderingContext2D, s: DiceState, w: number, X: F, Y: F, R: F, th: Theme) {
  const fx = juice(s), t = s.t, P = s.P;
  const say = (x: number, y: number, text: string, col: string, size: number) => {
    let rec = recentSay.get(s);
    if (!rec) recentSay.set(s, (rec = []));
    y = Math.max(Y(0.17), Math.min(Y(1.3), y));
    for (let k = 0; k < 6 && rec.some((q) => t - q.t < 45 && Math.abs(q.x - x) < w * 0.32 && Math.abs(q.y - y) < size + 5); k++) y -= size + 6;
    if (y < Y(0.16)) y += (size + 6) * 3;
    rec.push({ x, y, t });
    if (rec.length > 12) rec.shift();
    ctx.font = `800 ${size}px system-ui, sans-serif`;
    const hw = ctx.measureText(text).width / 2 + 6;
    fx.pop(Math.max(hw, Math.min(w - hw, x)), y, text, col, size);
  };
  /** 자리를 정해 둔 글자 (밀려나지 않게) */
  const pin = (x: number, y: number, text: string, col: string, size: number) => {
    ctx.font = `800 ${size}px system-ui, sans-serif`;
    const hw = ctx.measureText(text).width / 2 + 6;
    fx.pop(Math.max(hw, Math.min(w - hw, x)), y, text, col, size);
  };
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    const due = e.v !== undefined && e.kind !== 'clear' ? e.v : e.t;
    if (due <= seenT || due > t) continue;
    const x = X(e.x), y = Y(e.y), n = e.n ?? 1;
    if (e.kind === 'rattle') say(x + R(0.08), y, e.text!, e.col!, 14), fx.kick(1.5);
    if (e.kind === 'land') {
      for (const i of s.rolled) fx.burst(X(s.rx[i]), Y(s.ry[i] + DS * 0.4), '#c9e8b8', 5, 1.8, 1.6);
      fx.kick(2 + n * 0.6);
    }
    if (e.kind === 'combo') {
      const c = Math.min(6, n);
      fx.ring(x, y + R(0.1), c >= 6 ? '#ff9ad5' : '#fff07a', R(0.12 + 0.05 * c), 3 + c);
      fx.burst(x, y + R(0.1), '#fff6a8', 14 + 8 * c, 3 + c * 0.6, 2.2);
      if (c >= 4) fx.kick(6 + c * 1.5), fx.blink('#fff6c8', 0.12 + 0.04 * c), fx.ring(x, y + R(0.1), '#ffffff', R(0.35), 6);
      if (c >= 6) {
        for (let k = 0; k < 6; k++) fx.burst(X(0.1 + k * 0.16), Y(0.2 + (k % 2) * 0.1), ['#ff5a6e', '#ffd23f', '#4fc3ff', '#7ee07e', '#ff9ad5', '#b58bff'][k], 22, 5, 3);
        fx.blink('#ffe9f6', 0.45);
        say(X(0.5), Y(0.93), '🎉 장터 축제!!', '#ffe066', 30);
      }
      say(x, Math.max(Y(0.7), y), e.text!, e.col!, 18 + 3 * c);
      if (c >= 4 && c < 6) say(X(0.5), Y(0.94), c >= 5 ? '와아아!! 큰 줄!' : '와아! 네 쌍둥이!', '#ffe9a8', 20);
    }
    if (e.kind === 'cheer' || e.kind === 'order') say(x, y, e.text!, e.col!, 15), fx.burst(x, y, '#ffe066', 12, 3, 2);
    if (e.kind === 'wrong') say(x, y, e.text!, e.col!, 14);
    if (e.kind === 'stamp') {
      fx.ring(x, y, e.col!, R(0.07 + 0.03 * n), 3 + n);
      fx.burst(x, y, '#ffd23f', 8 + 6 * n, 2.6 + n * 0.6, 2.2);
      fx.kick(2 + n * 1.5);
      pin(x, y - R(0.03), e.text!, e.col!, 18 + 4 * n);
      if (n >= 3) fx.blink('#fff1a8', 0.15);
      // 동전이 계산대(🪙)로 짤랑
      fx.burst(X(0.045), Y(BAR_Y), '#ffd23f', 6 + 4 * n, 2.2, 2.4);
      fx.ring(X(0.045), Y(BAR_Y), '#ffe066', R(0.05), 3);
    }
    if (e.kind === 'group') say(x, y, e.text!, e.col!, 15), fx.kick(1 + n * 0.4);
    if (e.kind === 'gold2') say(x, y, e.text!, e.col!, 18), fx.burst(x, y, '#ffd23a', 18, 3.5, 2.6);
    if (e.kind === 'zero') say(x, y - R(0.06), e.text!, e.col!, 14), fx.burst(x, y, '#cfc6ba', 10, 1.8, 2);
    if (e.kind === 'streak') say(x, y, e.text!, e.col!, 15 + Math.min(4, n));
    if (e.kind === 'bonus' || e.kind === 'jackpot') pin(x, Y(e.kind === 'bonus' ? 0.84 : 0.92), e.text!, e.col!, 22), fx.burst(x, y, e.col!, 26, 4, 2.6), fx.ring(x, y, e.col!, R(0.2), 5), fx.kick(5);
    if (e.kind === 'goal') pin(x, Y(0.92), e.text!, e.col!, 20), fx.burst(x, y, e.col!, 16, 3, 2.2);
    if (e.kind === 'flip') fx.ring(x, y, '#bff0ff', R(0.08), 4), fx.burst(x, y, '#dff4ff', 14, 3, 2), say(x, y - R(0.09), e.text!, e.col!, 16), fx.kick(2);
    if (e.kind === 'nope') say(x, y, e.text!, e.col!, 14), fx.kick(1.2);
    if (e.kind === 'say') say(x, y, e.text!, e.col!, 14);
    if (e.kind === 'stage') fx.blink('#fff6d6', 0.18);
    if (e.kind === 'clear') {
      fx.burst(X(0.5), Y(0.6), '#ffe066', 46, 6, 3.2), fx.burst(X(0.5), Y(0.6), '#ff9ad5', 30, 5, 3), fx.ring(X(0.5), Y(0.6), '#ffe066', R(0.35), 6), fx.blink('#fff6c8', 0.3), fx.kick(6);
    }
    if (e.kind === 'fail') fx.kick(9), fx.blink(th.hot, 0.22);
  }
  fx.memo.t = t;
  void P;
}

function drawHud(ctx: CanvasRenderingContext2D, s: DiceState, d: DayDef, w: number, X: F, Y: F, R: F, font: FontF, th: Theme) {
  const t = s.t, P = s.P, D = s.D;
  const hb = R(0.066);
  ctx.fillStyle = 'rgba(42,22,10,.92)';
  ctx.fillRect(0, 0, w, hb);
  font(0.04, 900);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff1d6';
  ctx.fillText(`${s.stage + 1}/${DAYS.length}일 · ${d.emoji} ${d.name}`, X(0.03), hb * 0.52);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffd166';
  const stt = `★ ${s.stars}`;
  ctx.fillText(stt, w - R(0.03), hb * 0.52);
  ctx.fillStyle = th.hot;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - R(0.06) - ctx.measureText(stt).width, hb * 0.52);
  // 새것 알림
  if (s.news && t - s.news.t < NEWS_T + 20) {
    const age = t - s.news.t, a = Math.min(1, age / 10, (NEWS_T + 20 - age) / 20), drop = Math.max(0, 10 - age) * 2;
    ctx.globalAlpha = a;
    const tx = `✨ ${s.news.text}`;
    let fs = 0.036;
    font(fs, 900);
    while (ctx.measureText(tx).width > w - R(0.05) && fs > 0.03) font((fs -= 0.001), 900);
    const tw2 = Math.min(w - 8, ctx.measureText(tx).width + 22), by2 = Y(0.098) - drop;
    ctx.fillStyle = 'rgba(60,28,10,.94)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw2 / 2, by2 - R(0.027), tw2, R(0.054), R(0.027));
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,200,120,.6)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff3e0';
    ctx.fillText(tx, w / 2, by2 + 1);
    ctx.globalAlpha = 1;
  }
  // 하루 시작 큰 글씨
  {
    const age = t - s.startT;
    if (age < 90 && s.phase === 'play' && !P.rolled) {
      const a = Math.min(1, age / 8, (90 - age) / 18), sc = 1 + Math.max(0, 8 - age) * 0.04;
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(40,16,4,.66)';
      ctx.fillRect(0, Y(0.5), w, R(0.14));
      ctx.save();
      ctx.translate(w / 2, Y(0.555));
      ctx.scale(sc, sc);
      font(0.068, 900);
      ctx.textAlign = 'center';
      outlined(ctx, `${d.emoji} ${s.stage + 1}일째 · ${d.name}`, 0, 0, '#fff6d6', 'rgba(40,16,4,.9)', 5);
      font(0.038, 800);
      const o = D.orders.map((q) => `${CUSTS[q.who].name}: ${SLOT_NAME[D.slots[q.k]]}`).join(' · ');
      outlined(ctx, `목표 🪙${d.T1} · ${o}`, 0, R(0.055), '#ffe9c4', 'rgba(40,16,4,.9)', 4);
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }
  // 결과
  if (s.phase === 'result') {
    const age = s.pt, a = Math.min(1, age / 10);
    ctx.globalAlpha = a;
    ctx.fillStyle = s.ok ? 'rgba(60,30,8,.8)' : 'rgba(70,20,16,.8)';
    ctx.fillRect(0, Y(0.5), w, R(0.3));
    ctx.textAlign = 'center';
    font(s.ok ? 0.058 : 0.044, 900);
    ctx.fillStyle = s.ok ? '#fff1a8' : '#ffd0c8';
    ctx.fillText(s.ok ? (s.won ? '장터 대성공! 🎉' : `${d.emoji} 장사 성공!`) : s.why, w / 2, Y(0.56));
    if (s.ok) {
      for (let k = 0; k < 3; k++) {
        const ag = age - 14 - k * 10, got = k < s.got;
        if (ag < 0) continue;
        const sc = got ? 1 + Math.max(0, 1 - ag / 8) * 0.8 : 1;
        font(0.08 * sc, 900);
        ctx.fillStyle = got ? '#ffd166' : 'rgba(255,255,255,.35)';
        ctx.fillText(got ? '★' : '☆', w / 2 + (k - 1) * R(0.1), Y(0.65));
        if (got && (juice(s).memo['star' + k] ?? -1) < s.clearT) (juice(s).memo['star' + k] = s.clearT), juice(s).burst(w / 2 + (k - 1) * R(0.1), Y(0.65), '#ffe066', 14, 3, 2.4);
      }
      font(0.034, 800);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`🪙 ${P.total} (목표 ${d.T1} · 대박 ${d.T3}) · 주문 ${ordersOk(P) ? '맞춤 ✓' : '못 맞춤'}`, w / 2, Y(0.73));
      font(0.03, 800);
      ctx.fillStyle = '#ffe9c4';
      ctx.fillText(P.total >= d.T3 ? '대박! 남길 주사위를 잘 골랐어요' : !ordersOk(P) ? '다음엔 주문 족보를 노려 봐요' : `대박까지 ${d.T3 - P.total} — 버릴 칸을 잘 골라요`, w / 2, Y(0.775));
    } else {
      font(0.04, 800);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(s.hearts > 0 ? '♥ -1 · 그 날을 다시' : '하트를 다 썼어요 — 끝', w / 2, Y(0.65));
      font(0.032, 800);
      ctx.fillStyle = '#ffe0d6';
      ctx.fillText('0점 칸은 아끼고, 큰 족보는 일찍 노려요', w / 2, Y(0.71));
    }
    ctx.globalAlpha = 1;
  }
  // ═════════ 아래 띠: 별 목표 · 안내 ═════════
  {
    const y0 = Y(1.335);
    ctx.fillStyle = 'rgba(36,18,6,.92)';
    ctx.fillRect(0, y0, w, Y(A) - y0);
    const y2 = Y(1.368), res = s.phase === 'result' && s.ok;
    const allOk = ordersOk(P), anyMiss = P.ord.some((x) => x === -1);
    const chips = [
      { txt: `목표 ${d.T1}`, st: P.total >= d.T1 ? true : null as boolean | null },
      { txt: `주문 ${D.orders.map((o) => SLOT_NAME[D.slots[o.k]]).join('·')}`, st: anyMiss ? false : allOk ? true : null },
      { txt: `대박 ${d.T3}`, st: P.total >= d.T3 ? true : P.over && !res ? false : null },
    ];
    const gx0 = R(0.02), gw = (w - R(0.04)) / 3;
    chips.forEach(({ txt, st }, k) => {
      const gx = gx0 + k * gw;
      ctx.fillStyle = st === true ? 'rgba(255,209,102,.32)' : st === false ? 'rgba(0,0,0,.35)' : 'rgba(255,235,210,.12)';
      ctx.beginPath();
      ctx.roundRect(gx + 2, y2 - R(0.026), gw - 4, R(0.052), R(0.026));
      ctx.fill();
      let fs = 0.031;
      font(fs, 800);
      const label = `${st === true ? '★' : st === false ? '✗' : '☆'} ${txt}`;
      while (ctx.measureText(label).width > gw - R(0.03) && fs > 0.028) font((fs -= 0.001), 800);
      ctx.textAlign = 'center';
      ctx.fillStyle = st === false ? 'rgba(255,255,255,.45)' : '#fff6e0';
      ctx.fillText(label, gx + gw / 2, y2 + 1);
    });
    const y3 = Y(1.418);
    let tp = '👆 컵을 톡 → 데굴데굴!';
    if (s.phase === 'result') tp = s.ok ? '다음 장날이 와요!' : '같은 날을 다시 — 이번엔 남길 주사위를 골라서';
    else if (s.armed) tp = '🔄 뒤집을 주사위를 톡! (뒤집개를 다시 톡하면 취소)';
    else if (s.press >= 0) tp = '떼면 쾅! 적혀요 · 칸 밖에서 떼면 취소';
    else if (P.rolled && P.rolls > 0) tp = '남길 주사위를 톡 → 받침에 · 컵을 톡하면 나머지만 다시';
    else if (P.rolled) tp = '장부 칸을 꾹 → 점수 보기 · 떼면 쾅!';
    else if (s.stage > 0) tp = d.tip;
    ctx.textAlign = 'center';
    let fs = 0.034;
    font(fs, 800);
    while (ctx.measureText(tp).width > w - R(0.04) && fs > 0.03) font((fs -= 0.001), 800);
    ctx.fillStyle = 'rgba(255,238,215,.92)';
    ctx.fillText(tp, w / 2, y3);
  }
}

/** 칸을 누르고 있는 동안: 그 칸에 적힐 점수와 하루가 어떻게 되는지 */
function drawPreview(ctx: CanvasRenderingContext2D, s: DiceState, w: number, X: F, Y: F, R: F, font: FontF) {
  if (s.press < 0 || s.phase !== 'play') return;
  const P = s.P, D = s.D, d = D.def, k = s.press, type = D.slots[k], r = slotRects(D.slots.length)[k];
  const v = slotScore(P, k), gold = D.mode === 1 && v > 0 && v === 2 * scoreOf(type, cntOf(P.dice), 0);
  const after = P.total + v + (d.bonus && !P.bonus && isNum(type) && P.numSum + v >= d.bonus.B ? d.bonus.v : 0);
  const oj = D.orders.findIndex((o) => o.k === k && !P.ord[D.orders.indexOf(o)]);
  const l1 = v > 0 ? `${SLOT_NAME[type]} +${v}${gold ? ' (🟡×2)' : ''}` : `${SLOT_NAME[type]} 0점 — 칸 버리기`;
  const l2 = oj >= 0 ? (v > 0 ? `📜 ${CUSTS[D.orders[oj].who].name} 주문 맞춤! ★` : '📜 주문 칸인데 0점이면 주문 실패!') : after >= d.T1 ? `🪙 ${P.total} → ${after} · 목표 ✓${after >= d.T3 ? ' · 대박 ✓' : ''}` : `🪙 ${P.total} → ${after} · 목표까지 ${d.T1 - after}`;
  const l3 = SLOT_RULE[type];
  font(0.04, 900);
  const bw = Math.min(w - R(0.04), Math.max(ctx.measureText(l1).width, (font(0.032, 800), ctx.measureText(l2).width), ctx.measureText(l3).width) + R(0.06));
  const bh = R(0.15), bx = Math.max(R(0.02), Math.min(w - R(0.02) - bw, X(r.x) - bw / 2)), by = Y(r.y - r.h / 2) - bh - R(0.012);
  ctx.fillStyle = 'rgba(20,10,4,.35)';
  ctx.beginPath();
  ctx.roundRect(bx + 2, by + 4, bw, bh, R(0.02));
  ctx.fill();
  ctx.fillStyle = v > 0 ? '#f2fff0' : '#fff0ec';
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, R(0.02));
  ctx.fill();
  ctx.strokeStyle = v > 0 ? '#6cc070' : '#e08060';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = v > 0 ? '#f2fff0' : '#fff0ec';
  ctx.beginPath();
  ctx.moveTo(X(r.x) - R(0.02), by + bh - 1);
  ctx.lineTo(X(r.x), by + bh + R(0.014));
  ctx.lineTo(X(r.x) + R(0.02), by + bh - 1);
  ctx.fill();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  font(0.04, 900);
  ctx.fillStyle = v > 0 ? '#2f7a1e' : '#b0442a';
  ctx.fillText(l1, bx + bw / 2, by + bh * 0.24);
  font(0.032, 800);
  ctx.fillStyle = '#4a2a14';
  ctx.fillText(l2, bx + bw / 2, by + bh * 0.53);
  font(0.03, 700);
  ctx.fillStyle = '#8a6a4a';
  ctx.fillText(l3, bx + bw / 2, by + bh * 0.8);
}

/** 새 장치 스포트라이트: 그 날을 처음 할 때 주변을 어둡게 하고 장치에 빛 */
function drawSpot(ctx: CanvasRenderingContext2D, s: DiceState, w: number, X: F, Y: F, R: F, font: FontF) {
  if (s.retry || s.phase === 'result') return;
  const d = DAYS[s.stage], P = s.P, D = s.D;
  if ((d.key === 'gold' || d.key === 'heavy') && s.spotT === -2 && P.rolled && s.phase === 'play') s.spotT = s.t;
  if (s.spotT < 0) return;
  // 큰 족보 축하가 끝난 뒤에 (그림에서만 쓰는 시계라 시뮬레이션과 무관)
  if (s.spotT > 0 && s.t - s.spotT < 10 && ((s.fest > 0 && s.t - s.fest < 100) || (s.zoom > 0 && s.t - s.zoom < 40))) s.spotT = s.t;
  const age = s.t - s.spotT;
  if (age < 0 || age > 140) return;
  let x = -1, y = -1, rr = 0.1, label = '';
  if (d.key === 'gold' || d.key === 'heavy') {
    if (!P.rolled || s.phase === 'write') return;
    const p = dieAt(s, D.sp);
    (x = p.x), (y = p.y), (label = d.key === 'gold' ? '🟡 황금 주사위 — 족보에 끼면 점수 ×2!' : '🪨 돌 주사위 — 다시 굴릴 수 없어요');
  } else if (d.key === 'bonus') {
    const rs = slotRects(D.slots.length);
    (x = (rs[0].x + rs[2].x) / 2), (y = rs[0].y), (rr = 0.3), (label = '🎁 4·5·6 칸 합이 36 넘으면 덤 +30');
  } else if (d.key === 'weather') (x = 0.6), (y = 1.262), (rr = 0.2), (label = '🌦️ 턴마다 굴리기 수 — 미리 보고 계획해요');
  else if (d.key === 'flip') (x = FLIP_X), (y = FLIP_Y), (rr = 0.09), (label = '🔄 뒤집개 → 주사위: 1↔6 · 2↔5 · 3↔4');
  else if (d.key === 'fest') (x = 0.25), (y = 0.21), (rr = 0.2), (label = '⏰ 급한 손님은 3번째 적기까지!');
  if (x < 0 || !label) return;
  const a = Math.min(1, age / 10, (140 - age) / 18), cx = X(x), cy = Y(y), r = R(rr) * (1 + 0.05 * Math.sin(age * 0.2));
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(20,8,2,.6)';
  ctx.beginPath();
  ctx.rect(0, R(0.066), w, Y(1.335) - R(0.066));
  ctx.arc(cx, cy, r, 0, TAU, true);
  ctx.fill('evenodd');
  ctx.strokeStyle = '#fff1a8';
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 6]);
  ctx.lineDashOffset = -age;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);
  font(0.034, 900);
  let fs = 0.034;
  while (ctx.measureText(label).width > w - R(0.08) && fs > 0.03) font((fs -= 0.001), 900);
  const tw = ctx.measureText(label).width + R(0.05), ly = y > 0.8 ? cy - r - R(0.06) : cy + r + R(0.06), lx = Math.max(tw / 2 + 4, Math.min(w - tw / 2 - 4, cx));
  ctx.fillStyle = 'rgba(80,36,10,.96)';
  ctx.beginPath();
  ctx.roundRect(lx - tw / 2, ly - R(0.03), tw, R(0.06), R(0.03));
  ctx.fill();
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff6e0';
  ctx.fillText(label, lx, ly + 1);
  font(0.03, 900);
  const nb = 'NEW!', nw2 = ctx.measureText(nb).width + R(0.03);
  ctx.fillStyle = '#ff5a4e';
  ctx.beginPath();
  ctx.roundRect(lx - tw / 2 - R(0.01), ly - R(0.055), nw2, R(0.04), R(0.02));
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillText(nb, lx - tw / 2 - R(0.01) + nw2 / 2, ly - R(0.034));
  ctx.restore();
}

/** 첫 날: 손가락이 다음 할 일을 가리킨다 */
function drawGuide(ctx: CanvasRenderingContext2D, s: DiceState, X: F, Y: F, R: F, t: number, font: FontF) {
  if (s.stage !== 0 || s.retry || s.phase !== 'play' || s.P.writes > 0 || s.press >= 0) return;
  const P = s.P, bob = Math.sin(t * 0.15) * R(0.012);
  let x = -1, y = -1, label = '';
  if (!P.rolled && t - s.startT > 40) (x = CUP_X + 0.05), (y = CUP_Y + 0.04), (label = '컵을 톡!');
  else if (P.rolled && s.P.rolls < 3) {
    const k = s.D.orders[0].k, r = slotRects(s.D.slots.length)[k];
    if (slotScore(P, k) > 0) (x = r.x + 0.03), (y = r.y + 0.05), (label = '꾹 눌렀다 떼면 쾅!');
  }
  if (x < 0) return;
  ctx.strokeStyle = 'rgba(255,255,255,.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(X(x - 0.03), Y(y - 0.05), R(0.06) + Math.sin(t * 0.15) * 2, 0, TAU);
  ctx.stroke();
  emoji(ctx, '👆', X(x), Y(y) + bob, R(0.075));
  font(0.034, 900);
  ctx.textAlign = 'center';
  const lw = ctx.measureText(label).width + R(0.04), lx = Math.max(lw / 2 + 4, Math.min(X(1) - lw / 2 - 4, X(x))), ly = Y(y + 0.065) + bob;
  ctx.fillStyle = 'rgba(40,16,4,.88)';
  ctx.beginPath();
  ctx.roundRect(lx - lw / 2, ly - R(0.024), lw, R(0.048), R(0.024));
  ctx.fill();
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#fff6e0';
  ctx.fillText(label, lx, ly + 1);
}
