/**
 * 고양이 카드 봉우리 (27라운드: 전략이 깊은 검증된 캐주얼 뼈대 × 공장의 와우) — 카드 봉우리 × 가리키기(톡) × 콤보.
 * 뼈대: 오래 검증된 '카드 봉우리 솔리테어'. 겹쳐 쌓인 카드 봉우리에서, 위에 덮인 것이 없는(드러난) 카드 중
 *   펼친 카드보다 숫자가 하나 크거나 작은 것을 걷어 펼친 자리에 올린다(K와 A는 이어짐). 걷을 게 없으면 더미에서 한 장 뒤집는다.
 * 조작(기준 9): 드러난 카드를 톡 → 맞으면 휙 날아가 펼친 자리에 올라간다. 더미를 톡 → 한 장 뒤집기. 맞지 않는 카드는 고양이가 갸웃(벌 없음).
 *   키보드는 화살표 커서 + 스페이스.
 * 우리 것: 고양이 등산객의 산악 마을 디오라마. 고양이가 걷힌 카드 자리를 밟고 한 칸씩 오르고, 봉우리 꼭대기 카드를 걷으면 깃발이 펄럭.
 * 와우(비틀기): 아껴 둔 더미는 판이 끝나면 한 장씩 하늘로 솟아 폭죽이 된다 — 더미를 아낄수록 불꽃놀이가 커진다.
 *   더미 맨 위 3장은 미리 보인다(언제 뒤집을지 고르는 근거).
 * 판 8개(마을마다 봉우리 모양이 다름): 목표 = 봉우리 카드를 다 걷기. 별 = ★ 성공 · ★ 더미 N장 남기기 · ★ 연속 ×K.
 *   실패 = 더미가 떨어졌는데 봉우리가 남음 → 하트 −1, 그 판을 처음부터(다시 할 때마다 📣 응원 카드 +3, ★ 더미 기준도 같이 오른다).
 *   1·2판은 연습 손잡이: 걷을 카드가 있으면 더미가 쉰다("걷을 카드가 있어요!").
 * 전략: 맞는 카드가 둘이면 어느 갈래(위로·아래로, 어느 봉우리)가 더 길게 이어지고 더 많이 여는지, 더미를 언제 뒤집을지(미리 보기 3장),
 *   🐾을 언제 쓸지, 🔑까지 어떤 길로 갈지, ⛄을 언제 굴릴지. 판은 '버릇(왼쪽부터) 봇이 ★3을 못 따는' 배치를 고르고,
 *   ★ 기준은 내다보는 봇이 실제로 해낸 만큼에서 조금 느슨하게 정한다.
 * 펼쳐짐(하는 일이 바뀐다): 1판 톡톡 걷기 → 2판 쌍둥이 봉우리(갈래 고르기·K↔A) → 3판 ☁️ 안개(🃏 뒤집힌 카드 — 어디를 열어 볼까)
 *   → 4판 🔒 자물쇠(🔑 열쇠 카드를 먼저 — 길 정하기) → 5판 🐾 발도장(막힌 연속을 한 번 이어 붙이기 — 언제 아낄까)
 *   → 6판 ⛄ 눈덩이(걷으면 굴러 양옆 카드까지 쓸어 감 — 한 번에 여럿) → 7판 🌸 꽃 무늬(같은 무늬 두 장 잇달아 → 더미 +1) → 8판 🏔️ 대정상(전부).
 * 웃음: 고양이 등산객이 카드 자리를 깡충깡충, 연속이 길면 힘줌·우쭐, 틀린 카드엔 고개를 갸웃 '?', 막히면 식은땀,
 *   실패하면 데굴데굴 굴러 내려와 어질어질. 바위 위 마멋은 연속에 벌떡, 절벽의 산양은 깃발에 '메에~'.
 */
import { mulberry32, shuffle, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5;
/** 더미 미리 보기 장 수 */
export const PV = 3;
/** 수: 0 이상 = 그 카드 걷기 */
export const FLIP = -1, PAW = -2;
export type Mv = number;
const WILD = 0;
const STAR_PTS = 100, WIN_PTS = 100, FIRE_PTS = 10, PEAK_PTS = 20, SWEEP_PTS = 5, BLOOM_PTS = 10;
const RESULT_OK = 170, RESULT_FAIL = 150, NEWS_T = 200;

// ───────────────────────────── 판 ─────────────────────────────
export interface StageDef {
  key: string; name: string; emoji: string; news: string; tip: string;
  /** 줄마다 카드 자리(반 장 단위 칸 0~16). 0줄이 맨 뒤(꼭대기) */
  rows: number[][];
  /** 더미 장 수 · 뒤집힌 줄(이 줄까지 뒤집힘, -1 없음) · 자물쇠 수 · 눈덩이 수 · 발도장 · 꽃 무늬 */
  stock: number; down: number; locks: number; snow: number; paw: number; flower: boolean;
  /** 연습 손잡이: 걷을 카드가 있으면 더미가 쉰다 (1·2판) */
  guard?: boolean;
}
export const STAGES: StageDef[] = [
  { key: 'hill', name: '첫 언덕', emoji: '🌄', news: '👆 펼친 카드보다 1 크거나 작은 카드를 톡!', tip: '걷을 게 없으면 왼쪽 더미를 톡', rows: [[8], [7, 9], [6, 8, 10], [5, 7, 9, 11]], stock: 18, down: -1, locks: 0, snow: 0, paw: 0, flower: false, guard: true },
  { key: 'twin', name: '쌍둥이 봉우리', emoji: '⛰️', news: '🔀 갈래 고르기 — 위로 갈까 아래로 갈까? 길게 이을수록 쑥쑥', tip: '두 장이 맞으면 — 더 길게 이어지는 쪽으로', rows: [[5, 11], [4, 6, 10, 12], [3, 5, 7, 9, 11, 13], [6, 10]], stock: 18, down: -1, locks: 0, snow: 0, paw: 0, flower: false, guard: true },
  { key: 'fog', name: '안개 봉우리', emoji: '☁️', news: '🃏 뒤집힌 카드 — 덮은 카드를 다 걷으면 짠! 보여요', tip: '🃏 어느 쪽을 먼저 열어 볼까요?', rows: [[4, 12], [3, 5, 11, 13], [2, 4, 6, 10, 12, 14], [1, 3, 5, 7, 9, 11, 13, 15]], stock: 20, down: 1, locks: 0, snow: 0, paw: 0, flower: false },
  { key: 'lock', name: '자물쇠 마을', emoji: '🔒', news: '🔒 자물쇠 카드는 🔑 열쇠 카드를 먼저 걷어야 열려요', tip: '🔑 열쇠 카드까지 가는 길을 먼저', rows: [[6, 8, 10], [5, 7, 9, 11], [4, 6, 8, 10, 12], [3, 5, 7, 9, 11, 13]], stock: 19, down: -1, locks: 3, snow: 0, paw: 0, flower: false },
  { key: 'paw', name: '발도장 계곡', emoji: '🐾', news: '🐾 발도장 — 막히면 톡! 아무 카드나 이어 걷기 (연속 유지)', tip: '🐾 발도장은 한 번 — 긴 연속을 이을 때 써요', rows: [[2, 14], [1, 3, 13, 15], [0, 2, 4, 8, 12, 14, 16], [1, 3, 5, 7, 9, 11, 13, 15]], stock: 18, down: -1, locks: 0, snow: 0, paw: 1, flower: false },
  { key: 'snow', name: '눈덩이 설산', emoji: '⛄', news: '⛄ 눈덩이 카드를 걷으면 데굴데굴 — 양옆 카드까지 쓸어 가요', tip: '⛄ 양옆에 남길 카드가 있나 보고 굴려요', rows: [[8], [7, 9], [6, 8, 10], [1, 5, 7, 9, 11, 15], [0, 2, 4, 6, 8, 10, 12, 14, 16]], stock: 18, down: -1, locks: 0, snow: 2, paw: 0, flower: false },
  { key: 'flower', name: '꽃 능선', emoji: '🌸', news: '🌸 같은 무늬 두 장을 잇달아 걷으면 꽃이 피어 더미 +1', tip: '🌸 같은 무늬로 이어지는 갈래를 골라요', rows: [[3, 8, 13], [2, 4, 7, 9, 12, 14], [1, 3, 5, 8, 11, 13, 15], [2, 4, 6, 10, 12, 14]], stock: 17, down: -1, locks: 0, snow: 0, paw: 0, flower: true },
  { key: 'summit', name: '대정상', emoji: '🏔️', news: '🏔️ 대정상 — 안개·자물쇠·발도장·눈덩이 다 나와요!', tip: '🔑 먼저 · 🐾 아껴서 · ⛄ 잘 굴려서', rows: [[8], [7, 9], [2, 6, 8, 10, 14], [1, 3, 5, 7, 9, 11, 13, 15], [0, 2, 4, 6, 8, 10, 12, 14, 16]], stock: 19, down: 1, locks: 2, snow: 1, paw: 1, flower: false },
];
export const STAGE_COUNT = STAGES.length;

/** 카드 = 무늬×13 + (수-1). 수는 1(A)~13(K) */
export const valOf = (id: number) => (id % 13) + 1;
export const suitOf = (id: number) => Math.floor(id / 13);

export interface Level {
  n: number; v: number[]; su: number[]; c: number[]; r: number[]; x: number[]; y: number[];
  /** 이 카드를 덮은 카드들 · 이 카드가 덮은 카드들 (비트) */
  cover: number[]; under: number[];
  down0: number; lock: number; key: number; snow: number; sweep: number[];
  /** 봉우리 꼭대기 카드들 (목록·비트) */
  peaks: number[]; peakM: number;
  w0: number; stock: number[]; S: number; paw: number; flower: boolean; guard: boolean;
  /** ★ 기준: 더미 N장 남기기 · 연속 ×K */
  N: number; K: number;
  /** 잘하는 봇의 길(측정·봇용) · 그 결과 · 버릇 봇 결과 */
  plan: Mv[]; best: { left: number; chain: number }; habit: { ok: boolean; stars: number; left: number; chain: number };
  /** 왼쪽부터 순서 (버릇 봇) */
  order: number[];
  rows: number;
}

export interface Sim {
  mask: number; up: number; si: number; bonus: number; wv: number; ws: number; wid: number;
  /** 다시 하기 응원 카드 수 (★ 더미 기준도 같은 만큼 올라간다) */
  help: number;
  chain: number; best: number; paw: number; ls: number; pts: number; moves: number; flips: number; clear: boolean; fail: boolean;
}
export type RE =
  | { k: 'take'; i: number; chain: number; pts: number }
  | { k: 'sweep'; i: number; from: number }
  | { k: 'flip'; id: number }
  | { k: 'paw' }
  | { k: 'reveal'; i: number }
  | { k: 'unlock' }
  | { k: 'peak'; i: number }
  | { k: 'bloom'; su: number }
  | { k: 'wrap' };

export function newSim(L: Level, help = 0): Sim {
  const h = Math.max(0, Math.min(help, L.stock.length - L.S));
  return { mask: L.n >= 31 ? -1 : (1 << L.n) - 1, up: ((1 << L.n) - 1) & ~L.down0, si: 0, bonus: h, help: h, wv: valOf(L.w0), ws: suitOf(L.w0), wid: L.w0, chain: 0, best: 0, paw: L.paw, ls: -1, pts: 0, moves: 0, flips: 0, clear: false, fail: false };
}
export const cloneSim = (S: Sim): Sim => ({ ...S });

export const match = (a: number, w: number) => w === WILD || Math.abs(a - w) === 1 || (a === 1 && w === 13) || (a === 13 && w === 1);
export const stockLeft = (L: Level, S: Sim) => Math.min(L.S + S.bonus, L.stock.length) - S.si;
const has = (m: number, i: number) => ((m >>> i) & 1) === 1;
const isFree = (L: Level, mask: number, i: number) => (L.cover[i] & mask) === 0;
const locked = (L: Level, mask: number, i: number) => has(L.lock, i) && L.key >= 0 && has(mask, L.key);
function popc(x: number) {
  x = x - ((x >>> 1) & 0x55555555);
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
  return (((x + (x >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
}

/** 지금 톡해서 걷을 수 있는 카드인가 */
export function canTake(L: Level, S: Sim, i: number) {
  return i >= 0 && i < L.n && has(S.mask, i) && isFree(L, S.mask, i) && !locked(L, S.mask, i) && match(L.v[i], S.wv);
}
export function anyTake(L: Level, S: Sim) {
  for (let i = 0; i < L.n; i++) if (canTake(L, S, i)) return true;
  return false;
}
/** ★ 더미 기준 (응원 카드를 받았으면 그만큼 더) */
export const needN = (L: Level, S: Sim) => L.N + S.help;
export const starsOf = (L: Level, S: Sim) => (S.clear ? 1 + (stockLeft(L, S) >= needN(L, S) ? 1 : 0) + (S.best >= L.K ? 1 : 0) : 0);

/** 한 수 (부를 쪽이 가능 여부 확인) */
export function apply(L: Level, S: Sim, m: Mv, rec?: RE[]) {
  S.moves++;
  if (m === FLIP) {
    const id = L.stock[S.si++];
    S.wv = valOf(id);
    S.ws = suitOf(id);
    S.wid = id;
    S.chain = 0;
    S.ls = -1;
    S.flips++;
    rec?.push({ k: 'flip', id });
  } else if (m === PAW) {
    S.paw--;
    S.wv = WILD;
    S.ws = -1;
    S.wid = -1;
    S.ls = -1;
    rec?.push({ k: 'paw' });
  } else {
    const i = m, keyIn = L.key >= 0 && has(S.mask, L.key), before = S.mask;
    if ((S.wv === 13 && L.v[i] === 1) || (S.wv === 1 && L.v[i] === 13)) rec?.push({ k: 'wrap' });
    S.mask &= ~(1 << i);
    S.chain++;
    S.best = Math.max(S.best, S.chain);
    const p = 2 * S.chain;
    S.pts += p;
    S.wv = L.v[i];
    S.ws = L.su[i];
    S.wid = L.su[i] * 13 + L.v[i] - 1;
    rec?.push({ k: 'take', i, chain: S.chain, pts: p });
    if (has(L.snow, i)) {
      const sw = L.sweep[i] & S.mask;
      S.mask &= ~sw;
      for (let j = 0; j < L.n; j++) if (has(sw, j)) (S.pts += SWEEP_PTS), rec?.push({ k: 'sweep', i: j, from: i });
    }
    if (L.flower) {
      if (S.ls === L.su[i]) {
        if (L.S + S.bonus < L.stock.length) S.bonus++;
        S.pts += BLOOM_PTS;
        S.ls = -1;
        rec?.push({ k: 'bloom', su: L.su[i] });
      } else S.ls = L.su[i];
    }
    if (keyIn && !has(S.mask, L.key)) rec?.push({ k: 'unlock' });
    for (const pk of L.peaks) if (has(before, pk) && !has(S.mask, pk)) (S.pts += PEAK_PTS), rec?.push({ k: 'peak', i: pk });
    // 덮개가 다 걷힌 뒤집힌 카드는 짠
    for (let j = 0; j < L.n; j++) if (has(S.mask, j) && !has(S.up, j) && isFree(L, S.mask, j)) (S.up |= 1 << j), rec?.push({ k: 'reveal', i: j });
  }
  S.clear = S.mask === 0;
  if (!S.clear && !anyTake(L, S) && stockLeft(L, S) <= 0 && S.paw <= 0) S.fail = true;
}

// ───────────────────────────── 잘하는 봇: 아는 것만으로 내다보기 ─────────────────────────────
/** 봇 가치: 카드 하나 · 연속 · 더미 한 장 · 발도장 · 쓸기 · 깃발 · 뒤집힌 카드 열기 · 성공 · 막힘 */
const R_CARD = 10, R_FLIP = 13, R_PAW = 9, R_SWEEP = 8, R_PEAK = 4, R_REVEAL = 3, R_CLEAR = 300;
let nodes = 0, budget = 0;
interface Plan { memo: Map<number, number>; mv: Map<number, number>; known: number; hz: number }
const keyOf = (mask: number, si: number, wv: number, chain: number, paw: number, ls: number, bonus: number) =>
  (((((mask * 64 + si) * 16 + wv) * 32 + Math.min(31, chain)) * 4 + paw) * 8 + ls + 1) * 32 + bonus;

/** 지평선 너머(모르는 카드를 뒤집은 뒤)의 판의 좋음: 드러난 카드가 많을수록 다음 카드가 맞을 확률이 크다 */
function horizon(L: Level, mask: number, paw: number) {
  let free = 0, vals = 0;
  for (let i = 0; i < L.n; i++) if (has(mask, i) && isFree(L, mask, i)) (free++, (vals |= 1 << L.v[i]));
  return 2 * free + 3 * popc(vals) + 6 * paw;
}

function dfs(L: Level, P: Plan, mask: number, si: number, wv: number, chain: number, paw: number, ls: number, bonus: number): number {
  if (mask === 0) return R_CLEAR;
  const key = keyOf(mask, si, wv, chain, paw, ls, bonus), hit = P.memo.get(key);
  if (hit !== undefined) return hit;
  if (++nodes > budget) return horizon(L, mask, paw);
  let best = -1e9, bm = -99, play = false;
  const keyIn = L.key >= 0 && has(mask, L.key);
  for (let i = 0; i < L.n; i++) {
    if (!has(mask, i) || (L.cover[i] & mask) !== 0 || !has(P.known, i)) continue;
    if (keyIn && has(L.lock, i)) continue;
    if (!match(L.v[i], wv)) continue;
    play = true;
    let m2 = mask & ~(1 << i), g = R_CARD + 2 * (chain + 1), ls2 = ls, b2 = bonus, cand = L.under[i];
    if (has(L.snow, i)) {
      const sw = L.sweep[i] & m2;
      m2 &= ~sw;
      g += popc(sw) * R_SWEEP;
      for (let j = 0; j < L.n; j++) if (has(sw, j)) cand |= L.under[j];
    }
    if (L.flower) {
      if (ls === L.su[i]) {
        if (L.S + bonus < L.stock.length) (b2 = bonus + 1), (g += R_FLIP);
        ls2 = -1;
      } else ls2 = L.su[i];
    }
    if (has(L.peakM, i)) g += R_PEAK;
    // 새로 드러나는 뒤집힌 카드 (값은 모른다)
    cand &= m2 & ~P.known;
    for (let j = 0; cand; j++, cand >>>= 1) if (cand & 1 && (L.cover[j] & m2) === 0) g += R_REVEAL;
    const v = g + dfs(L, P, m2, si, L.v[i], chain + 1, paw, ls2, b2);
    if (v > best) (best = v), (bm = i);
  }
  const left = Math.min(L.S + bonus, L.stock.length) - si;
  if (left > 0 && !(L.guard && play)) {
    let v: number;
    if (si < P.hz) v = -R_FLIP + dfs(L, P, mask, si + 1, valOf(L.stock[si]), 0, paw, -1, bonus);
    else v = -R_FLIP + horizon(L, mask, paw) - (play ? 6 : 0);
    if (v > best) (best = v), (bm = FLIP);
  }
  if (paw > 0 && !play) {
    const v = -R_PAW + dfs(L, P, mask, si, WILD, chain, paw - 1, -1, bonus);
    if (v > best) (best = v), (bm = PAW);
  }
  if (bm === -99) best = -200 - 10 * popc(mask);
  P.memo.set(key, best);
  P.mv.set(key, bm);
  return best;
}

/** 지금 아는 것(드러난 카드 + 더미 맨 위 3장)으로 가장 좋은 길 */
export function think(L: Level, S: Sim, B = 7000): Mv[] {
  const P: Plan = { memo: new Map(), mv: new Map(), known: S.up, hz: S.si + Math.min(PV, stockLeft(L, S)) };
  nodes = 0;
  budget = B;
  dfs(L, P, S.mask, S.si, S.wv, S.chain, S.paw, S.ls, S.bonus);
  // 길 다시 밟기
  const out: Mv[] = [], T = cloneSim(S);
  for (let k = 0; k < 80; k++) {
    const m = P.mv.get(keyOf(T.mask, T.si, T.wv, T.chain, T.paw, T.ls, T.bonus));
    if (m === undefined || m === -99) break;
    out.push(m);
    if (m === FLIP && T.si >= P.hz) break;
    const up0 = T.up;
    apply(L, T, m);
    if (T.clear || T.fail || T.up !== up0) break;
  }
  return out;
}

/** 잘하는 봇 한 판(순수 시뮬레이션): 새 정보(뒤집기·짠·꽃)가 생길 때마다 다시 생각 */
export function smartRun(L: Level) {
  const S = newSim(L), plan: Mv[] = [];
  let q: Mv[] = [];
  while (!S.clear && !S.fail && plan.length < 200) {
    if (!q.length) q = think(L, S);
    let m = q.shift();
    if (m === undefined || !legal(L, S, m)) (m = habitPick(L, S) ?? undefined), (q = []);
    if (m === undefined) break;
    const up0 = S.up, b0 = S.bonus;
    apply(L, S, m);
    plan.push(m);
    if (m === FLIP || S.up !== up0 || S.bonus !== b0) q = [];
  }
  return { S, plan };
}
export const canFlip = (L: Level, S: Sim) => stockLeft(L, S) > 0 && !(L.guard && anyTake(L, S));
export const legal = (L: Level, S: Sim, m: Mv) => (m === FLIP ? canFlip(L, S) : m === PAW ? S.paw > 0 : canTake(L, S, m));

/** 버릇 하나(측정용): '걷을 수 있는 카드 중 왼쪽부터', 없으면 발도장, 없으면 더미 */
export function habitPick(L: Level, S: Sim): Mv | null {
  for (const i of L.order) if (canTake(L, S, i)) return i;
  if (S.paw > 0) return PAW;
  if (stockLeft(L, S) > 0) return FLIP;
  return null;
}
export function runPolicy(L: Level, pick: (L: Level, S: Sim) => Mv | null) {
  const S = newSim(L);
  for (let g = 0; !S.clear && !S.fail && g < 200; g++) {
    const m = pick(L, S);
    if (m === null) break;
    apply(L, S, m);
  }
  return { ok: S.clear, stars: starsOf(L, S), left: stockLeft(L, S), chain: S.best };
}
/** 아무 데나 톡하는 사람이 이 판을 깰 확률: 드러난 카드·더미·발도장 중 무작위 (안 맞는 카드는 헛손질) */
export function randomPass(L: Level, r: Rng, n: number) {
  let ok = 0;
  for (let k = 0; k < n; k++) {
    const S = newSim(L);
    for (let g = 0; !S.clear && !S.fail && g < 600; g++) {
      const free: number[] = [];
      for (let i = 0; i < L.n; i++) if (has(S.mask, i) && isFree(L, S.mask, i)) free.push(i);
      const opts = free.length + 1 + (S.paw > 0 ? 1 : 0), q = Math.floor(r() * opts);
      if (q < free.length) {
        if (canTake(L, S, free[q])) apply(L, S, free[q]);
      } else if (q === free.length) {
        if (canFlip(L, S)) apply(L, S, FLIP);
      } else apply(L, S, PAW);
    }
    if (S.clear) ok++;
  }
  return ok / n;
}

// ───────────────────────────── 판 만들기 ─────────────────────────────
const HU = 0.052, RY = 0.079, ROW_BOT = 0.9;
function shapeOf(d: StageDef) {
  const c: number[] = [], r: number[] = [];
  d.rows.forEach((row, ri) => row.forEach((cc) => (c.push(cc), r.push(ri))));
  const n = c.length, cover = Array(n).fill(0), under = Array(n).fill(0);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) if (r[j] === r[i] + 1 && Math.abs(c[j] - c[i]) === 1) (cover[i] |= 1 << j), (under[j] |= 1 << i);
  const nr = d.rows.length;
  const x = c.map((cc) => 0.5 + (cc - 8) * HU), y = r.map((rr) => ROW_BOT - (nr - 1 - rr) * RY);
  // 꼭대기 = 아무것도 그 카드를 '아래에서 받치지' 않는 카드(덮은 것만 있는 맨 뒤 카드)
  const peaks = [...Array(n).keys()].filter((i) => under[i] === 0 && cover[i] !== 0 && !d.rows[r[i] - 1]?.some((cc) => Math.abs(cc - c[i]) === 1));
  const order = [...Array(n).keys()].sort((a, b) => x[a] - x[b] || r[b] - r[a]);
  return { n, c, r, x, y, cover, under, peaks, order, nr };
}

function makeLevel(d: StageDef, rr: Rng): Level | null {
  const sh = shapeOf(d), deck = shuffle([...Array(52).keys()], rr);
  const n = sh.n, ids = deck.slice(0, n), w0 = deck[n], stock = deck.slice(n + 1);
  let down0 = 0;
  for (let i = 0; i < n; i++) if (sh.r[i] <= d.down && sh.cover[i]) down0 |= 1 << i;
  // 자물쇠: 맨 뒤쪽 줄에서 · 열쇠: 그보다 앞쪽 줄, 처음엔 덮인 카드
  let lock = 0, key = -1;
  if (d.locks) {
    const back = shuffle([...Array(n).keys()].filter((i) => sh.r[i] <= 1), rr);
    for (let k = 0; k < d.locks && k < back.length; k++) lock |= 1 << back[k];
    const mid = [...Array(n).keys()].filter((i) => !has(lock, i) && sh.r[i] >= 1 && sh.r[i] <= sh.nr - 2 && sh.cover[i]);
    if (!mid.length) return null;
    key = mid[Math.floor(rr() * mid.length)];
    if (has(down0, key)) down0 &= ~(1 << key);
  }
  // 눈덩이: 양옆(같은 줄 바로 옆 자리)에 카드가 둘 다 있는 자리
  let snow = 0;
  const sweep = Array(n).fill(0);
  if (d.snow) {
    const cand = shuffle([...Array(n).keys()].filter((i) => !has(lock, i) && i !== key && [...Array(n).keys()].filter((j) => sh.r[j] === sh.r[i] && Math.abs(sh.c[j] - sh.c[i]) === 2).length === 2 && sh.r[i] >= sh.nr - 2), rr);
    for (let k = 0, got = 0; got < d.snow && k < cand.length; k++) {
      const i = cand[k];
      if ([...Array(n).keys()].some((j) => has(snow, j) && sh.r[j] === sh.r[i] && Math.abs(sh.c[j] - sh.c[i]) <= 4)) continue;
      snow |= 1 << i;
      got++;
    }
    for (let i = 0; i < n; i++) if (has(snow, i)) for (let j = 0; j < n; j++) if (sh.r[j] === sh.r[i] && Math.abs(sh.c[j] - sh.c[i]) === 2) sweep[i] |= 1 << j;
    if (!snow) return null;
  }
  return {
    n, v: ids.map(valOf), su: ids.map(suitOf), c: sh.c, r: sh.r, x: sh.x, y: sh.y, cover: sh.cover, under: sh.under,
    down0, lock, key, snow, sweep, peaks: sh.peaks, peakM: sh.peaks.reduce((m, i) => m | (1 << i), 0), w0, stock, S: Math.min(d.stock, stock.length), paw: d.paw, flower: d.flower, guard: !!d.guard,
    N: 0, K: 0, plan: [], best: { left: 0, chain: 0 }, habit: { ok: false, stars: 0, left: 0, chain: 0 }, order: sh.order, rows: sh.nr,
  };
}

/** 기준을 정한다: 잘하는 봇이 해낸 만큼에서 slack만큼 느슨하게 */
function setGoals(L: Level, left: number, chain: number, sN: number, sK: number) {
  L.N = Math.max(1, left - sN);
  L.K = Math.max(3, chain - sK);
}

const levelCache = new Map<string, Level>();
export function buildLevel(seed: number, stage: number): Level {
  const ck = `${seed}:${stage}`, hit = levelCache.get(ck);
  if (hit) return hit;
  const d = STAGES[stage], r = mulberry32((seed * 31 + stage * 7919 + 17) >>> 0);
  let pick: Level | null = null, bv = -1e9;
  const K = stage === 0 ? 10 : stage === 1 ? 6 : 6;
  for (let tries = 0, c = 0; c < K && tries < 40; tries++) {
    const L = makeLevel(d, r);
    if (!L) continue;
    // 첫 판: 첫 톡이 바로 되게 (펼친 카드에 맞는 드러난 카드가 있다)
    if (stage === 0 && !anyTake(L, newSim(L))) continue;
    const sm = smartRun(L);
    if (!sm.S.clear) continue;
    c++;
    const left = stockLeft(L, sm.S), chain = sm.S.best;
    L.plan = sm.plan;
    L.best = { left, chain };
    let v: number;
    const self3 = () => (left >= L.N && chain >= L.K ? 1 : 0);
    if (stage <= 1) {
      setGoals(L, left, chain, stage === 0 ? 3 : 2, stage === 0 ? 2 : 1);
      L.habit = runPolicy(L, habitPick);
      const rp = randomPass(L, r, 30);
      const run1 = sm.plan.indexOf(FLIP) < 0 ? sm.plan.length : sm.plan.indexOf(FLIP);
      v = (stage === 0 ? -Math.max(0, 0.97 - rp) * 10 + Math.min(run1, 5) * 0.3 : -Math.abs(rp - 0.8) * 3 + chain * 0.02) + self3() + (L.habit.ok ? (stage === 0 ? 3 : 0.6) : 0);
    } else {
      // 버릇대로 두면 ★3이 안 나오게, 기준은 그 안에서 가장 느슨하게
      let ok = false;
      for (const [sN, sK] of [[1, 1], [1, 0], [0, 1], [0, 0]]) {
        setGoals(L, left, chain, sN, sK);
        L.habit = runPolicy(L, habitPick);
        if (L.habit.stars < 3) {
          ok = true;
          break;
        }
      }
      v = (ok ? 2 : 0) + (L.habit.ok ? 0.8 : 0) + self3() - Math.abs(left - 6) * 0.15 + Math.min(chain, 10) * 0.03;
    }
    if (v > bv) (bv = v), (pick = L);
  }
  if (!pick) {
    // 거의 없지만: 아무 판이나 (봇 길로 기준)
    for (let k = 0; k < 60 && !pick; k++) {
      const L = makeLevel(d, r);
      if (!L) continue;
      const sm = smartRun(L);
      L.plan = sm.plan;
      setGoals(L, stockLeft(L, sm.S), sm.S.best, 0, 0);
      L.best = { left: stockLeft(L, sm.S), chain: sm.S.best };
      L.habit = runPolicy(L, habitPick);
      if (sm.S.clear || k > 50) pick = L;
    }
  }
  if (levelCache.size > 400) levelCache.clear();
  levelCache.set(ck, pick!);
  return pick!;
}

// ───────────────────────────── 상태 ─────────────────────────────
interface Ev { t: number; kind: string; x: number; y: number; text?: string; col?: string; v?: number; n?: number }
/** 날아가는 카드 하나 (그리기용): 어디서 · 언제 · 무엇 */
interface Fly { id: number; x0: number; y0: number; x1: number; y1: number; t0: number; dur: number; kind: 'take' | 'flip' | 'sweep' | 'fire'; spin: number }
export interface CardState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'play' | 'settle' | 'result'; pt: number;
  L: Level; S: Sim; down: boolean; ax: number; ay: number; lastTap: number; taps: number;
  hearts: number; stars: number; got: number; pts: number; ok: boolean; why: string; won: boolean; dead: boolean; tries: number;
  seen: Set<string>; tips: Set<string>; events: Ev[]; news: { text: string; t: number } | null; newsQ: string[]; startT: number; clearT: number;
  mood: string; moodT: number;
  /** 고양이 등산객: 지금 자리 · 뛰기 전 자리 · 뛴 때 */
  cx: number; cy: number; fx: number; fy: number; hopT: number; tilt: number;
  /** 펼친 카드 더미(그리기용, -1 = 발도장) · 날아가는 카드 · 카드마다 걷힌 때 · 짠 때 · 깃발 꽂은 때 */
  pile: { id: number; t: number }[]; flies: Fly[]; goneT: number[]; revT: number[]; flagT: number[]; unlockT: number; bloomT: number; pawT: number;
  /** 큰 순간 잠깐 멈춤 · 판 끝 폭죽 */
  stopUntil: number; fire: { t0: number; n: number } | null;
  marmotT: number; goatT: number; wrongT: number; wrongI: number;
  /** 이 판을 처음 하는가 (새 장치 스포트라이트는 처음에만) */
  retry: boolean;
  /** 같은 판 연속 실패 (응원 카드) */
  failStage: number; failN: number;
}

const ev = (s: CardState, kind: string, x: number, y: number, text?: string, col?: string, v?: number, n?: number) => s.events.push({ t: s.t, kind, x, y, text, col, v, n });
function tip(s: CardState, key: string, text: string) {
  if (s.tips.has(key) || s.newsQ.length) return;
  s.tips.add(key);
  s.newsQ.push(text);
}
function see(s: CardState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  s.newsQ.push(text);
}
const setMood = (s: CardState, m: string) => ((s.mood = m), (s.moodT = s.t));

// 화면 배치 (가로 0~1, 세로 0~A)
export const CW = 0.1, CH = 0.142;
const STX = 0.105, STY = 1.15, SW = 0.13, SH = 0.18;
const WX = 0.5, WY = 1.148, WW = 0.15, WH = 0.21;
const PX = 0.875, PY = 1.14, PR = 0.066;
const BASE_X = 0.08, BASE_Y = 1.0;
const PVX = (k: number) => 0.235 + k * 0.055, PVY = 1.18, PVW = 0.078, PVH = 0.11;

function newStage(s: CardState) {
  const d = STAGES[s.stage];
  s.L = buildLevel(s.seed, s.stage);
  // 같은 판을 다시 하면 응원 카드 +3 (최대 +6) — 깨기는 쉬워지고 ★ 기준도 같이 오른다
  const fails = s.stage === s.failStage ? s.failN : 0;
  s.S = newSim(s.L, Math.min(6, fails * 3));
  const n = s.L.n;
  if (s.S.help) ev(s, 'say', 0.5, 0.5, `📣 응원 카드 +${s.S.help}장!`, '#fff1c4');
  s.pile = [{ id: s.L.w0, t: -99 }];
  s.flies = [];
  s.goneT = Array(n).fill(-1);
  s.revT = Array(n).fill(-1);
  s.flagT = Array(n).fill(-1);
  s.unlockT = -1;
  s.bloomT = -99;
  s.pawT = -99;
  s.stopUntil = -1;
  s.fire = null;
  s.cx = s.fx = BASE_X;
  s.cy = s.fy = BASE_Y;
  s.hopT = -99;
  s.tilt = 0;
  s.wrongT = -99;
  s.wrongI = -1;
  s.retry = s.tips.has('try:' + s.stage);
  s.tips.add('try:' + s.stage);
  s.phase = 'play';
  s.pt = 0;
  s.startT = s.t;
  s.got = 0;
  setMood(s, 'idle');
  if (!s.seen.has(d.key)) {
    s.seen.add(d.key);
    s.newsQ.unshift(d.news);
    s.news = null;
  }
  ev(s, 'stage', 0.5, 0.6, `${s.stage + 1}판 · ${d.name}`, '#fff6d6');
}

function finish(s: CardState) {
  s.phase = 'result';
  s.pt = 0;
  const L = s.L, S = s.S;
  if (s.ok) {
    const st = starsOf(L, S);
    s.got = st;
    s.stars += st;
    s.pts += st * STAR_PTS;
    s.clearT = s.t;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    ev(s, 'clear', 0.5, 0.62, `${STAGES[s.stage].emoji} 정복! ${'★'.repeat(st)}${'☆'.repeat(3 - st)}`, '#fff1a8', st);
    setMood(s, 'proud');
  } else {
    s.hearts--;
    s.tries++;
    if (s.failStage === s.stage) s.failN++;
    else (s.failStage = s.stage), (s.failN = 1);
    ev(s, 'fail', 0.5, 0.62, s.why, '#ffd0c8');
    setMood(s, 'dizzy');
  }
}

/** 손가락 자리의 것: 카드 번호(맨 앞 것) · FLIP(더미) · PAW(발도장) · -9 없음 */
function pickAt(s: CardState, x: number, y: number): number {
  const L = s.L, S = s.S;
  for (let k = L.n - 1; k >= 0; k--) {
    const i = byFront(L)[k];
    if (!has(S.mask, i)) continue;
    if (Math.abs(x - L.x[i]) <= CW / 2 + 0.004 && Math.abs(y - L.y[i]) <= CH / 2 + 0.004) return i;
  }
  if (Math.abs(x - STX) <= SW / 2 + 0.03 && Math.abs(y - STY) <= SH / 2 + 0.03) return FLIP;
  if (x >= PVX(0) - 0.04 && x <= PVX(2) + 0.04 && Math.abs(y - PVY) < 0.07) return FLIP;
  if (L.paw > 0 && Math.hypot(x - PX, y - PY) < PR * 1.35) return PAW;
  return -9;
}
const frontCache = new WeakMap<Level, number[]>();
/** 그리는 순서(뒤 → 앞): 줄이 앞일수록 나중 */
function byFront(L: Level) {
  let o = frontCache.get(L);
  if (!o) frontCache.set(L, (o = [...Array(L.n).keys()].sort((a, b) => L.r[a] - L.r[b] || L.x[a] - L.x[b])));
  return o;
}

export const VAL = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
/** 받침 있는 수 (삼·육·칠·팔·십) — 조사 고르기 */
const bat = (v: number) => v === 3 || v === 6 || v === 7 || v === 8 || v === 10;
/** 펼친 카드 w에 걸을 수 있는 두 수 ('A나 3을' 꼴) */
const near = (w: number) => {
  if (w === WILD) return '아무 수나';
  const a = w === 1 ? 13 : w - 1, b = w === 13 ? 1 : w + 1;
  return `${VAL[a]}${bat(a) ? '이나' : '나'} ${VAL[b]}${bat(b) ? '을' : '를'}`;
};

function tapAt(s: CardState, x: number, y: number) {
  s.taps++;
  s.lastTap = s.t;
  const L = s.L, S = s.S, k = pickAt(s, x, y);
  if (k === -9) return;
  if (k === FLIP) {
    if (stockLeft(L, S) <= 0) return void (ev(s, 'nope', STX, STY - 0.13, '더미가 비었어요', '#ffd8cc'), setMood(s, 'huh'));
    if (!canFlip(L, S)) {
      ev(s, 'nope', STX + 0.05, STY - 0.13, '걷을 카드가 있어요!', '#fff1c4');
      tip(s, 'guard', '👀 반짝이는 카드부터 — 걷을 게 없을 때 더미를 톡');
      s.wrongT = s.t;
      s.wrongI = -1;
      return void setMood(s, 'huh');
    }
    return doMove(s, FLIP);
  }
  if (k === PAW) {
    if (S.paw <= 0) return void ev(s, 'nope', PX, PY - 0.11, '발도장을 다 썼어요', '#ffd8cc');
    return doMove(s, PAW);
  }
  if (canTake(L, S, k)) return doMove(s, k);
  // 못 걷는 카드: 고양이가 갸웃 (벌 없음)
  const a = S.wv === 1 ? 13 : S.wv - 1, b = S.wv === 13 ? 1 : S.wv + 1;
  const why = !isFree(L, S.mask, k) ? '덮여 있어요' : locked(L, S.mask, k) ? '🔒 열쇠 카드 먼저!' : S.wv === WILD ? '' : `${VAL[a]}${bat(a) ? '이나' : '나'} ${VAL[b]}만 돼요`;
  ev(s, 'nope', L.x[k], L.y[k] - CH * 0.62, why, '#ffe3d6');
  s.wrongT = s.t;
  s.wrongI = k;
  setMood(s, 'huh');
  if (locked(L, S.mask, k)) tip(s, 'lockTap', '🔑 열쇠 카드를 걷으면 자물쇠가 철컥 열려요');
  else if (isFree(L, S.mask, k)) tip(s, 'match', `펼친 카드보다 1 크거나 작은 수만 — K 다음은 A`);
}

function doMove(s: CardState, m: Mv) {
  const L = s.L, S = s.S, rec: RE[] = [], t = s.t;
  const prevW = s.pile[s.pile.length - 1].id;
  apply(L, S, m, rec);
  const big = (n: number) => n >= 5;
  for (const e of rec) {
    if (e.k === 'take') {
      const i = e.i;
      s.goneT[i] = t;
      s.flies.push({ id: L.su[i] * 13 + L.v[i] - 1, x0: L.x[i], y0: L.y[i], x1: WX, y1: WY, t0: t, dur: 14, kind: 'take', spin: (L.x[i] < WX ? 1 : -1) * 0.5 });
      s.pile.push({ id: L.su[i] * 13 + L.v[i] - 1, t: t + 14 });
      // 고양이가 그 자리로 깡충
      s.fx = s.cx;
      s.fy = s.cy;
      s.cx = L.x[i];
      s.cy = L.y[i] + CH * 0.42;
      s.hopT = t;
      ev(s, 'take', L.x[i], L.y[i], `+${e.pts}`, '#fff3b0', t, e.chain);
      if (e.chain >= 2) ev(s, 'chain', WX, WY - WH * 0.75, `연속 ×${e.chain}`, '#ffe066', t + 12, e.chain);
      if (e.chain >= 3) see(s, 'chain', '🔥 끊기지 않고 이으면 연속 — 점수가 쑥쑥');
      if (big(e.chain) && (e.chain === 5 || e.chain === 8 || e.chain === 12 || e.chain === 16)) {
        s.stopUntil = t + 14 + 4 * Math.min(4, e.chain - 5);
        ev(s, 'big', 0.5, 0.4, e.chain >= 12 ? `🔥 ${e.chain}연속!! 대박` : e.chain >= 8 ? `✨ ${e.chain}연속!` : '✨ 5연속!', '#ffe9a8', t + 2, e.chain);
        s.marmotT = t;
      }
      setMood(s, e.chain >= 5 ? 'proud' : e.chain >= 3 ? 'strain' : 'happy');
    } else if (e.k === 'sweep') {
      s.goneT[e.i] = t + 6;
      const dir = L.x[e.i] < L.x[e.from] ? -1 : 1;
      s.flies.push({ id: L.su[e.i] * 13 + L.v[e.i] - 1, x0: L.x[e.i], y0: L.y[e.i], x1: L.x[e.i] + dir * 0.5, y1: L.y[e.i] + 0.25, t0: t + 6, dur: 26, kind: 'sweep', spin: dir * 3 });
      ev(s, 'sweep', L.x[e.i], L.y[e.i], `+${SWEEP_PTS}`, '#e8f6ff', t + 6);
      see(s, 'sweep', '⛄ 데굴데굴! 눈덩이가 양옆 카드를 한꺼번에 쓸어 갔어요');
    } else if (e.k === 'flip') {
      s.flies.push({ id: e.id, x0: STX, y0: STY, x1: WX, y1: WY, t0: t, dur: 12, kind: 'flip', spin: 0 });
      s.pile.push({ id: e.id, t: t + 12 });
      ev(s, 'flip', STX, STY, '휙!', '#e8f0ff', t);
      setMood(s, 'idle');
      if (S.flips === 1) see(s, 'flipSeen', '🃏 더미 한 장 — 연속은 끊겨요. 아껴 쓰면 판 끝에 폭죽!');
      if (stockLeft(L, S) === 2) tip(s, 'low', '⚠ 더미가 얼마 안 남았어요');
    } else if (e.k === 'paw') {
      s.pile.push({ id: -1, t });
      s.pawT = t;
      ev(s, 'paw', WX, WY, '🐾 꾹!', '#ffe0f0', t);
      see(s, 'pawUse', '🐾 발도장 — 아무 수나 이어 걸을 수 있어요 (연속 그대로)');
      setMood(s, 'wow');
    } else if (e.k === 'reveal') {
      s.revT[e.i] = t + 8;
      ev(s, 'reveal', L.x[e.i], L.y[e.i], '짠!', '#fff6a8', t + 8);
      see(s, 'revealSeen', '🃏 덮개가 걷히니 뒤집힌 카드가 짠!');
    } else if (e.k === 'unlock') {
      s.unlockT = t + 8;
      ev(s, 'unlock', 0.5, 0.5, '🔑 철컥! 자물쇠가 열렸어요', '#fff1a8', t + 8);
      see(s, 'unlockSeen', '🔑 열쇠를 걷으니 자물쇠가 철컥!');
    } else if (e.k === 'peak') {
      s.flagT[e.i] = t + 10;
      ev(s, 'peak', L.x[e.i], L.y[e.i] - CH * 0.55, '야호! 🚩', '#fff6d0', t + 10);
      ev(s, 'num', L.x[e.i] + 0.1, L.y[e.i] - CH * 0.3, `+${PEAK_PTS}`, '#ffe066', t + 14);
      s.goatT = t + 14;
      see(s, 'peak', '🚩 봉우리 꼭대기 카드를 걷으면 깃발이 펄럭!');
    } else if (e.k === 'bloom') {
      s.bloomT = t + 8;
      ev(s, 'bloom', WX, WY - WH * 0.6, `🌸 ${SUIT_NAME[e.su]} 둘! 더미 +1`, '#ffd6ec', t + 8);
      see(s, 'bloomSeen', '🌸 같은 무늬 두 장 — 꽃이 피어 더미 +1');
    } else if (e.k === 'wrap') {
      const nw = ['wrap1', 'wrap2', 'wrap3'].find((k) => !s.tips.has(k));
      if (!nw) continue;
      s.tips.add(nw);
      ev(s, 'say', WX, WY - WH * 0.95, prevW >= 0 && valOf(prevW) === 13 ? 'K → A 이어짐!' : 'A → K 이어짐!', '#e6f0ff', t + 10);
      see(s, 'wrap', '🔁 K와 A는 이어져요');
    }
  }
  if (s.flies.length > 24) s.flies.splice(0, s.flies.length - 24);
  if (S.clear) {
    s.phase = 'settle';
    s.pt = 0;
    s.ok = true;
    const n = stockLeft(L, S);
    s.fire = { t0: t + 30, n };
    s.pts += n * FIRE_PTS;
    if (n > 0) see(s, 'fire', '🎆 남은 더미는 하늘로 — 펑펑 폭죽!');
    setMood(s, 'proud');
  } else if (S.fail) {
    s.phase = 'settle';
    s.pt = 0;
    s.ok = false;
    s.why = '더미가 떨어졌어요!';
    ev(s, 'jam', 0.5, 0.8, '으앗, 더미가 없다…', '#ffb4a8', t + 16);
  } else if (!anyTake(L, S) && S.paw > 0 && m !== PAW) {
    tip(s, 'pawHint', '🐾 막혔어요 — 발도장으로 이어 붙일까, 더미를 뒤집을까?');
  } else if (!anyTake(L, S)) setMood(s, stockLeft(L, S) <= 2 ? 'worry' : s.mood);
  s.pts = Math.max(s.pts, 0);
}
/** 점수 = 지난 판들 + 지금 판의 카드 점수(연속일수록 크게)·깃발·쓸기·꽃 (실패한 판의 점수는 버린다) */
const ptsNow = (s: CardState) => s.pts + (s.phase === 'result' && !s.ok ? 0 : s.S.pts);

function animate(s: CardState) {
  // 큰 순간 잠깐 멈춤: 날아가던 카드·뛰던 고양이가 그 자리에 멈춰 선다
  if (s.t < s.stopUntil) {
    for (const f of s.flies) if (s.t >= f.t0) f.t0++;
    if (s.t - s.hopT < 12) s.hopT++;
    for (const q of s.pile) if (q.t > s.t) q.t++;
  }
  if (s.pile.length > 40) s.pile.splice(0, s.pile.length - 40);
  if (s.flies.length && s.t - s.flies[0].t0 > 70) s.flies = s.flies.filter((f) => s.t - f.t0 <= 70);
}

export const cardpeaks: GameDef<CardState> = {
  id: 'cardpeaks',
  name: '고양이 카드 봉우리',
  genes: ['solitaire', 'pointer', 'combo'],
  twist: '아껴 둔 더미는 판이 끝나면 한 장씩 하늘로 솟아 폭죽이 된다 — 고양이 등산객은 걷힌 카드 자리를 밟고 올라 꼭대기 카드를 걷는 순간 깃발을 꽂는다',
  rules: ['펼친 카드보다 하나 크거나 작은 카드를 톡 → 걷어 올린다 (K와 A는 이어짐).', '걷을 게 없으면 더미를 톡 · 봉우리를 다 걷으면 성공.'],
  controls: 'touch',
  hint: '드러난 카드를 톡! 걷을 게 없으면 더미를 톡 / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '고양이 등산객의 산악 마을',
    mood: '아침 햇살이 비치는 눈 덮인 산맥, 카드로 쌓은 봉우리 아래 빨간 지붕 오두막 마을과 소나무 — 카드마다 두께와 그림자, 배낭 멘 고양이 등산객이 걷힌 카드 자리를 깡충깡충 오르고, 바위 위 마멋과 절벽의 산양이 구경한다.',
    palette: { bg: '#bfe3f7', ink: '#1d2a3a', muted: '#5f7489', accent: '#ff8a3d', hot: '#e84a5f', soft: '#f3f8fc' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'play', pt: 0,
      down: false, ax: 0, ay: 0, lastTap: -99, taps: 0,
      hearts: 3, stars: 0, got: 0, pts: 0, ok: false, why: '', won: false, dead: false, tries: 0,
      seen: new Set<string>(), tips: new Set<string>(), events: [], news: null, newsQ: [], startT: 0, clearT: 0,
      mood: 'idle', moodT: 0, cx: BASE_X, cy: BASE_Y, fx: BASE_X, fy: BASE_Y, hopT: -99, tilt: 0,
      pile: [], flies: [], goneT: [], revT: [], flagT: [], unlockT: -1, bloomT: -99, pawT: -99,
      stopUntil: -1, fire: null, marmotT: -99, goatT: -99, wrongT: -99, wrongI: -1, retry: false, failStage: -1, failN: 0,
    } as unknown as CardState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    const p = inp.pointer ?? null, press = !!p && !s.down;
    if (p) (s.ax = p.x), (s.ay = p.y);
    s.down = !!p;
    s.t++;
    s.pt++;
    if (s.newsQ.length && (!s.news || s.t - s.news.t > NEWS_T)) s.news = { text: s.newsQ.shift()!, t: s.t };
    if (s.events.length > 60 || (s.events.length && s.t - s.events[0].t > 220)) s.events = s.events.filter((e) => s.t - e.t < 220);
    animate(s);
    if (s.mood !== 'idle' && s.t - s.moodT > (s.mood === 'dizzy' || s.mood === 'proud' ? 110 : 60)) s.mood = s.phase === 'play' && !anyTake(s.L, s.S) && stockLeft(s.L, s.S) <= 2 ? 'worry' : 'idle';
    if (s.phase === 'result') {
      if (s.pt >= (s.ok ? RESULT_OK : RESULT_FAIL)) {
        if (s.ok) {
          s.pts += s.S.pts;
          if (s.won) s.dead = true;
          else s.stage++, newStage(s);
        } else if (s.hearts <= 0) s.dead = true;
        else newStage(s);
      }
      return;
    }
    if (s.phase === 'settle') {
      const wait = s.ok ? 40 + (s.fire ? Math.min(s.fire.n, 12) * 9 : 0) : 60;
      if (s.pt >= wait) finish(s);
      return;
    }
    if (press && s.t - s.startT >= 10) tapAt(s, s.ax, s.ay * A);
  },
  over: (s) => s.dead,
  score: (s) => ptsNow(s),
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
const brain = new WeakMap<object, { key: string; list: Mv[]; i: number; moves: number }>();
/** 다음 수: 판 처음이면 미리 구한 길(같은 판단 규칙으로 구한 것)을 따르고, 어긋나면 그 자리에서 다시 생각 */
export function planMove(s: CardState): Mv | null {
  const L = s.L, S = s.S, key = `${s.stage}:${s.tries}`;
  let b = brain.get(s);
  if (!b || b.key !== key) brain.set(s, (b = { key, list: S.moves === 0 && !S.help ? L.plan.slice() : [], i: 0, moves: S.moves }));
  if (b.moves !== S.moves || b.i >= b.list.length || !legal(L, S, b.list[b.i])) {
    const q = think(L, S);
    b.list = q.length ? q : [];
    b.i = 0;
    b.moves = S.moves;
  }
  const m = b.list[b.i];
  if (m === undefined || !legal(L, S, m)) return habitPick(L, S);
  return m;
}
const NO: Input = { tap: false, dir: 0, pointer: null };
function at(s: CardState, m: Mv): Input {
  const L = s.L;
  if (m === FLIP) return { tap: false, dir: 0, pointer: { x: STX, y: STY / A } };
  if (m === PAW) return { tap: false, dir: 0, pointer: { x: PX, y: PY / A } };
  // 덮인 줄은 위쪽만 보이니 카드 위쪽을 누른다 (드러난 카드는 가운데)
  return { tap: false, dir: 0, pointer: { x: L.x[m], y: (L.y[m] - CH * 0.3) / A } };
}
const ready = (s: CardState, gap: number) => s.phase === 'play' && !s.down && s.t - s.lastTap >= gap && s.t - s.startT >= 30;
/** 봇: 드러난 카드와 더미 맨 위 3장만 보고, 어느 갈래가 더 길게 이어지고 더미를 덜 쓰는지 내다본다 */
export const cardpeaksSmart: Bot<CardState> = {
  name: '등산 대장',
  act(s) {
    if (!ready(s, 15)) return NO;
    const m = planMove(s);
    if (m === null) return NO;
    brain.get(s)!.i++;
    brain.get(s)!.moves = s.S.moves + 1;
    return at(s, m);
  },
};
/** 버릇 봇(측정용): '걷을 수 있는 카드 중 왼쪽부터', 없으면 발도장, 없으면 더미 */
export const cardpeaksHabit: Bot<CardState> = {
  name: '버릇: 왼쪽부터',
  act(s) {
    if (!ready(s, 15)) return NO;
    const m = habitPick(s.L, s.S);
    return m === null ? NO : at(s, m);
  },
};
const dumbAt = new WeakMap<object, { next: number; until: number; p: { x: number; y: number } }>();
/** 봇: 아무 때나 아무 카드나·더미나 톡 (가끔 화면 아무 데나) */
export const cardpeaksRandom: Bot<CardState> = {
  name: '아무 데나 톡',
  act(s, rng) {
    let m = dumbAt.get(s);
    if (!m) dumbAt.set(s, (m = { next: 20 + Math.floor(rng() * 50), until: -1, p: { x: 0, y: 0 } }));
    if (s.t < m.until) return { tap: false, dir: 0, pointer: m.p };
    if (s.t < m.next) return NO;
    m.next = s.t + 24 + Math.floor(rng() * 70);
    m.until = s.t + 2 + Math.floor(rng() * 4);
    const L = s.L, S = s.S, list: Mv[] = [FLIP];
    for (let i = 0; i < L.n; i++) if (has(S.mask, i) && isFree(L, S.mask, i)) list.push(i);
    if (S.paw > 0) list.push(PAW);
    if (rng() < 0.15) m.p = { x: rng(), y: rng() };
    else {
      const q = at(s, list[Math.floor(rng() * list.length)]).pointer!;
      m.p = { x: q.x + (rng() - 0.5) * 0.02, y: q.y + (rng() - 0.5) * 0.02 };
    }
    return { tap: false, dir: 0, pointer: m.p };
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
const TAU = Math.PI * 2;
type F = (v: number) => number;
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
/** 무늬: 0 눈꽃 · 1 하트 · 2 소나무 · 3 해 */
export const SUIT = ['#2f7fd0', '#e0445a', '#2a9a55', '#ef8a12'];
const SUIT_INK = ['#1c5aa0', '#c0283f', '#17763d', '#c25f00'];
const SUIT_NAME = ['눈꽃', '하트', '소나무', '해'];
/** 마을마다 하늘: 위 · 가운데 · 지평선 */
const SKY: [string, string, string][] = [
  ['#6fbcef', '#b9e2f7', '#ffe7c8'],
  ['#58aeee', '#a6d9f6', '#e8f7ff'],
  ['#93a9c0', '#c4d2df', '#eef2f6'],
  ['#68aae6', '#b4daf2', '#ffdcae'],
  ['#4fb3c6', '#a1dcdc', '#eefae4'],
  ['#7aa3dc', '#c0d7f3', '#f5f9ff'],
  ['#ee8fae', '#f7c3bd', '#ffe6c4'],
  ['#2a3a72', '#6a5c9e', '#f6a56a'],
];

function suitIcon(ctx: CanvasRenderingContext2D, su: number, x: number, y: number, z: number, col?: string) {
  const c = col ?? SUIT[su];
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = c;
  ctx.strokeStyle = c;
  ctx.lineCap = 'round';
  if (su === 0) {
    ctx.lineWidth = Math.max(1.2, z * 0.13);
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI + Math.PI / 2, dx = Math.cos(a) * z * 0.48, dy = Math.sin(a) * z * 0.48;
      ctx.beginPath();
      ctx.moveTo(-dx, -dy);
      ctx.lineTo(dx, dy);
      ctx.stroke();
      for (const sg of [1, -1]) {
        const bx = dx * 0.62 * sg, by = dy * 0.62 * sg, pa = a + (sg > 0 ? 0 : Math.PI);
        ctx.beginPath();
        ctx.moveTo(bx + Math.cos(pa + 2.4) * z * 0.18, by + Math.sin(pa + 2.4) * z * 0.18);
        ctx.lineTo(bx, by);
        ctx.lineTo(bx + Math.cos(pa - 2.4) * z * 0.18, by + Math.sin(pa - 2.4) * z * 0.18);
        ctx.stroke();
      }
    }
  } else if (su === 1) {
    ctx.beginPath();
    ctx.moveTo(0, z * 0.42);
    ctx.bezierCurveTo(-z * 0.7, -z * 0.02, -z * 0.36, -z * 0.62, 0, -z * 0.22);
    ctx.bezierCurveTo(z * 0.36, -z * 0.62, z * 0.7, -z * 0.02, 0, z * 0.42);
    ctx.fill();
  } else if (su === 2) {
    for (let k = 0; k < 3; k++) {
      const yy = -z * 0.5 + k * z * 0.24, ww = z * (0.24 + k * 0.13);
      ctx.beginPath();
      ctx.moveTo(0, yy);
      ctx.lineTo(ww, yy + z * 0.34);
      ctx.lineTo(-ww, yy + z * 0.34);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#7a4a26';
    ctx.fillRect(-z * 0.07, z * 0.32, z * 0.14, z * 0.16);
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, z * 0.24, 0, TAU);
    ctx.fill();
    ctx.lineWidth = Math.max(1.2, z * 0.11);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * z * 0.34, Math.sin(a) * z * 0.34);
      ctx.lineTo(Math.cos(a) * z * 0.5, Math.sin(a) * z * 0.5);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function padlock(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, open: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = '#6b7280';
  ctx.lineWidth = z * 0.16;
  ctx.beginPath();
  ctx.arc(0, -z * 0.18 - open * z * 0.3, z * 0.26, Math.PI, 0);
  ctx.stroke();
  const g = ctx.createLinearGradient(0, -z * 0.2, 0, z * 0.4);
  g.addColorStop(0, '#ffd35a');
  g.addColorStop(1, '#d99a17');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(-z * 0.4, -z * 0.2, z * 0.8, z * 0.6, z * 0.12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,70,0,.55)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#7a4a00';
  ctx.beginPath();
  ctx.arc(0, z * 0.05, z * 0.08, 0, TAU);
  ctx.fill();
  ctx.fillRect(-z * 0.03, z * 0.05, z * 0.06, z * 0.17);
  ctx.restore();
}
function keyIcon(ctx: CanvasRenderingContext2D, x: number, y: number, z: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.6);
  ctx.strokeStyle = '#b07800';
  ctx.fillStyle = '#ffcf3f';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(-z * 0.28, 0, z * 0.22, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillRect(-z * 0.1, -z * 0.07, z * 0.6, z * 0.14);
  ctx.fillRect(z * 0.3, 0, z * 0.1, z * 0.2);
  ctx.fillRect(z * 0.12, 0, z * 0.08, z * 0.16);
  ctx.fillStyle = '#b07800';
  ctx.beginPath();
  ctx.arc(-z * 0.28, 0, z * 0.08, 0, TAU);
  ctx.fill();
  ctx.restore();
}

interface CO { down?: boolean; dim?: number; glow?: number; lock?: number; key?: boolean; snow?: boolean; rot?: number; alpha?: number; flipQ?: number; lift?: number }
/** 카드 한 장 (가운데 x,y · 크기 cw×ch px) — 그림자·두께·종이 결 */
function drawCard(ctx: CanvasRenderingContext2D, x: number, y: number, cw: number, ch: number, id: number, o: CO, t: number) {
  ctx.save();
  ctx.translate(x, y - (o.lift ?? 0));
  if (o.rot) ctx.rotate(o.rot);
  if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
  const fq = o.flipQ ?? 1;
  const sx = Math.max(0.04, Math.abs(Math.cos((1 - fq) * Math.PI)));
  const showBack = o.down || fq < 0.5;
  ctx.scale(sx, 1);
  const rr = cw * 0.14, th = Math.max(2, ch * 0.05);
  // 그림자 (오른쪽 아래로, 떠 있으면 멀리)
  const lf = o.lift ?? 0;
  ctx.fillStyle = `rgba(30,40,60,${0.26 - Math.min(0.12, lf * 0.006)})`;
  ctx.beginPath();
  ctx.roundRect(-cw / 2 + 2 + lf * 0.3, -ch / 2 + th + 2 + lf * 0.6, cw, ch, rr);
  ctx.fill();
  // 두께
  ctx.fillStyle = showBack ? '#1d3157' : '#cdbb98';
  ctx.beginPath();
  ctx.roundRect(-cw / 2, -ch / 2 + th, cw, ch, rr);
  ctx.fill();
  if (o.glow) {
    ctx.shadowColor = `rgba(255,214,90,${0.9 * o.glow})`;
    ctx.shadowBlur = 12;
  }
  if (showBack) {
    const g = ctx.createLinearGradient(0, -ch / 2, 0, ch / 2);
    g.addColorStop(0, '#3f6db0');
    g.addColorStop(1, '#2a4a85');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(-cw / 2, -ch / 2, cw, ch, rr);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,.75)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-cw / 2 + 3, -ch / 2 + 3, cw - 6, ch - 6, rr * 0.7);
    ctx.stroke();
    // 발바닥 무늬
    ctx.fillStyle = 'rgba(255,255,255,.28)';
    for (let k = 0; k < 4; k++) {
      const px = (k % 2 ? 0.18 : -0.18) * cw, py = (k < 2 ? -0.2 : 0.2) * ch;
      ctx.beginPath();
      ctx.ellipse(px, py + cw * 0.05, cw * 0.1, cw * 0.08, 0, 0, TAU);
      ctx.fill();
      for (let q = -1; q <= 1; q++) {
        ctx.beginPath();
        ctx.arc(px + q * cw * 0.08, py - cw * 0.07 - (q ? 0 : cw * 0.02), cw * 0.035, 0, TAU);
        ctx.fill();
      }
    }
  } else {
    const su = suitOf(id), v = valOf(id);
    const g = ctx.createLinearGradient(0, -ch / 2, 0, ch / 2);
    g.addColorStop(0, o.snow ? '#f4fbff' : '#fffdf5');
    g.addColorStop(1, o.snow ? '#d9ecfb' : '#f2e8d2');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(-cw / 2, -ch / 2, cw, ch, rr);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = o.snow ? '#9cc8ec' : '#d4c19a';
    ctx.lineWidth = 1;
    ctx.stroke();
    // 숫자 (왼쪽 위) · 작은 무늬 (오른쪽 위) · 큰 무늬 (가운데 아래)
    const vs = VAL[v], fs = Math.max(12, cw * (vs.length > 1 ? 0.4 : 0.46));
    ctx.font = `900 ${fs}px system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = SUIT_INK[su];
    ctx.fillText(vs, -cw / 2 + cw * 0.09, -ch / 2 + ch * 0.06);
    suitIcon(ctx, su, cw / 2 - cw * 0.2, -ch / 2 + ch * 0.17, cw * 0.27);
    suitIcon(ctx, su, 0, ch * 0.17, cw * 0.5);
    if (o.snow) {
      // 눈덩이 딱지
      const bx = cw * 0.3, by = ch * 0.3, br = cw * 0.2;
      ctx.fillStyle = 'rgba(40,80,120,.25)';
      ctx.beginPath();
      ctx.ellipse(bx + 1, by + br * 0.9, br, br * 0.35, 0, 0, TAU);
      ctx.fill();
      const sg = ctx.createRadialGradient(bx - br * 0.4, by - br * 0.4, 1, bx, by, br);
      sg.addColorStop(0, '#ffffff');
      sg.addColorStop(1, '#bcd9f2');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#8fb8de';
      ctx.stroke();
      for (let k = 0; k < 3; k++) {
        ctx.fillStyle = `rgba(255,255,255,${0.5 + 0.5 * Math.sin(t * 0.2 + k * 2)})`;
        ctx.fillRect(-cw * 0.3 + k * cw * 0.25, -ch * 0.02 + Math.sin(k * 3) * ch * 0.1, 2, 2);
      }
    }
    if (o.key) {
      ctx.fillStyle = '#fff2b8';
      ctx.beginPath();
      ctx.arc(cw * 0.25, ch * 0.3, cw * 0.2, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#e0a800';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      keyIcon(ctx, cw * 0.25, ch * 0.3, cw * 0.32);
    }
  }
  if (o.dim) {
    ctx.fillStyle = `rgba(40,55,80,${o.dim})`;
    ctx.beginPath();
    ctx.roundRect(-cw / 2, -ch / 2, cw, ch, rr);
    ctx.fill();
  }
  if (o.glow) {
    ctx.strokeStyle = `rgba(255,200,60,${0.55 + 0.45 * o.glow})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-cw / 2 - 1, -ch / 2 - 1, cw + 2, ch + 2, rr + 1);
    ctx.stroke();
  }
  if (o.lock !== undefined && o.lock < 1) {
    // 자물쇠: 사슬 두 줄 + 금빛 자물쇠 (열리면 위로 튀며 사라짐)
    const q = o.lock;
    ctx.globalAlpha *= 1 - q;
    ctx.strokeStyle = '#8a94a3';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 2]);
    ctx.beginPath();
    ctx.moveTo(-cw / 2, -ch * 0.35);
    ctx.lineTo(cw / 2, ch * 0.05);
    ctx.moveTo(cw / 2, -ch * 0.35);
    ctx.lineTo(-cw / 2, ch * 0.05);
    ctx.stroke();
    ctx.setLineDash([]);
    padlock(ctx, 0, -ch * 0.15 - q * ch * 0.4, cw * 0.42, q);
  }
  ctx.restore();
}

function drawSky(ctx: CanvasRenderingContext2D, s: CardState, w: number, h: number, X: F, Y: F, R: F, t: number) {
  const [a, b, c] = SKY[s.stage];
  const g = ctx.createLinearGradient(0, 0, 0, Y(1.0));
  g.addColorStop(0, a);
  g.addColorStop(0.55, b);
  g.addColorStop(1, c);
  ctx.fillStyle = g;
  ctx.fillRect(-10, -10, w + 20, h + 20);
  const night = s.stage === STAGES.length - 1;
  if (night) {
    for (let k = 0; k < 40; k++) {
      ctx.fillStyle = `rgba(255,255,230,${0.3 + 0.6 * Math.abs(Math.sin(t / 50 + k * 1.3))})`;
      ctx.fillRect(hsh(k) * w, hsh(k + 99) * Y(0.45), 1.6, 1.6);
    }
  }
  // 해 (대정상은 노을 진 달)
  const sx = X(0.8), sy = Y(night ? 0.2 : 0.17), sr = R(night ? 0.045 : 0.06);
  const sg = ctx.createRadialGradient(sx, sy, sr * 0.5, sx, sy, sr * 4);
  sg.addColorStop(0, night ? 'rgba(255,240,200,.55)' : 'rgba(255,250,215,.85)');
  sg.addColorStop(1, 'rgba(255,240,200,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(sx - sr * 4, sy - sr * 4, sr * 8, sr * 8);
  ctx.fillStyle = night ? '#fff1c4' : '#fff6d0';
  ctx.beginPath();
  ctx.arc(sx, sy, sr, 0, TAU);
  ctx.fill();
  // 구름
  for (let k = 0; k < 4; k++) {
    const cx = ((hsh(k + 3) * 1.4 + t * 0.00012 * (1 + k * 0.4)) % 1.4) - 0.2, cy = 0.16 + hsh(k + 11) * 0.22, cs = 0.06 + hsh(k + 5) * 0.05;
    ctx.fillStyle = night ? 'rgba(200,190,230,.35)' : s.stage === 2 ? 'rgba(255,255,255,.75)' : 'rgba(255,255,255,.82)';
    for (let q = 0; q < 4; q++) {
      ctx.beginPath();
      ctx.ellipse(X(cx + (q - 1.5) * cs * 0.6), Y(cy - (q % 2) * cs * 0.25), R(cs * 0.55), R(cs * 0.32), 0, 0, TAU);
      ctx.fill();
    }
  }
  // 먼 산맥 두 겹 (눈 덮인 능선)
  const far = (y0: number, amp: number, col: string, snowCol: string, seed: number) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(-5, Y(1.05));
    const pts: [number, number][] = [];
    for (let k = 0; k <= 10; k++) {
      const xx = k / 10, yy = y0 - amp * (0.4 + 0.6 * hsh(k * 3 + seed)) * (k % 2 ? 1 : 0.45);
      pts.push([xx, yy]);
      ctx.lineTo(X(xx), Y(yy));
    }
    ctx.lineTo(w + 5, Y(1.05));
    ctx.fill();
    ctx.fillStyle = snowCol;
    for (let k = 1; k < 10; k += 2) {
      const [px, py] = pts[k], [lx, ly] = pts[k - 1], [nx, ny] = pts[k + 1], q = 0.28;
      ctx.beginPath();
      ctx.moveTo(X(px), Y(py));
      ctx.lineTo(X(px + (nx - px) * q), Y(py + (ny - py) * q));
      ctx.lineTo(X(px + (nx - px) * q * 0.5), Y(py + (ny - py) * q * 0.75));
      ctx.lineTo(X(px), Y(py + (ny - py) * q * 0.6));
      ctx.lineTo(X(px + (lx - px) * q * 0.5), Y(py + (ly - py) * q * 0.8));
      ctx.lineTo(X(px + (lx - px) * q), Y(py + (ly - py) * q));
      ctx.closePath();
      ctx.fill();
    }
  };
  far(0.5, 0.16, mix(c, '#7f93b5', 0.55), mix(c, '#ffffff', 0.7), 1);
  far(0.6, 0.13, mix(c, '#6a83a8', 0.75), mix(c, '#ffffff', 0.55), 7);
  // 안개 마을: 흐르는 안개 띠
  if (s.stage === 2 || s.stage === STAGES.length - 1) {
    for (let k = 0; k < 3; k++) {
      const yy = Y(0.5 + k * 0.12), off = ((t * 0.15 * (k + 1)) % (w + 200)) - 100;
      const fg = ctx.createLinearGradient(0, yy - R(0.03), 0, yy + R(0.03));
      fg.addColorStop(0, 'rgba(255,255,255,0)');
      fg.addColorStop(0.5, `rgba(255,255,255,${s.stage === 2 ? 0.35 : 0.15})`);
      fg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = fg;
      ctx.fillRect(off - w, yy - R(0.03), w * 2.2, R(0.06));
    }
  }
  // 새 두세 마리
  ctx.strokeStyle = night ? 'rgba(230,220,255,.6)' : 'rgba(40,60,90,.55)';
  ctx.lineWidth = 1.5;
  for (let k = 0; k < 3; k++) {
    const bx = ((t * 0.0011 * (1 + k * 0.3) + hsh(k + 20)) % 1.2) - 0.1, by = 0.2 + k * 0.06 + Math.sin(t * 0.03 + k) * 0.01, fl = Math.sin(t * 0.25 + k * 2) * R(0.008);
    ctx.beginPath();
    ctx.moveTo(X(bx) - R(0.014), Y(by) - fl);
    ctx.quadraticCurveTo(X(bx) - R(0.005), Y(by) - R(0.006), X(bx), Y(by));
    ctx.quadraticCurveTo(X(bx) + R(0.005), Y(by) - R(0.006), X(bx) + R(0.014), Y(by) - fl);
    ctx.stroke();
  }
}

/** 카드 봉우리 뒤의 바위산 (꼭대기 카드 자리마다 봉우리) */
function drawMassif(ctx: CanvasRenderingContext2D, s: CardState, X: F, Y: F, R: F, t: number) {
  const L = s.L;
  let minX = 1, maxX = 0;
  for (let i = 0; i < L.n; i++) (minX = Math.min(minX, L.x[i])), (maxX = Math.max(maxX, L.x[i]));
  const tops = L.peaks.map((i) => ({ x: L.x[i], y: L.y[i] - CH * 0.5 - 0.06, i })).sort((a, b) => a.x - b.x);
  const base = 0.99, pts: [number, number][] = [[Math.max(-0.05, minX - 0.16), base]];
  tops.forEach((p, k) => {
    if (k > 0) {
      const q = tops[k - 1], vy = Math.min(base - 0.08, Math.max(p.y, q.y) + 0.05 + 0.35 * Math.abs(p.x - q.x));
      pts.push([(p.x + q.x) / 2, vy]);
    }
    pts.push([p.x, p.y]);
  });
  pts.push([Math.min(1.05, maxX + 0.16), base]);
  // 산 몸통 (빛 받는 왼쪽 면)
  const g = ctx.createLinearGradient(0, Y(Math.min(...tops.map((p) => p.y))), 0, Y(base));
  g.addColorStop(0, '#a3adbb');
  g.addColorStop(0.5, '#7d8a9b');
  g.addColorStop(1, '#5f8a5a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(X(pts[0][0]), Y(pts[0][1]));
  for (const [x, y] of pts) ctx.lineTo(X(x), Y(y));
  ctx.closePath();
  ctx.fill();
  // 그늘진 오른쪽 면
  ctx.fillStyle = 'rgba(40,50,75,.28)';
  for (let k = 0; k < pts.length - 1; k++) {
    const [x0, y0] = pts[k], [x1, y1] = pts[k + 1];
    if (y1 <= y0) continue;
    ctx.beginPath();
    ctx.moveTo(X(x0), Y(y0));
    ctx.lineTo(X(x1), Y(y1));
    ctx.lineTo(X(x1 - (x1 - x0) * 0.55), Y(base));
    ctx.lineTo(X(x0 + 0.02), Y(base));
    ctx.closePath();
    ctx.fill();
  }
  // 바위 결
  ctx.strokeStyle = 'rgba(50,60,80,.25)';
  ctx.lineWidth = 1;
  for (let k = 0; k < 14; k++) {
    const x = minX - 0.08 + hsh(k + 40) * (maxX - minX + 0.16), y = 0.62 + hsh(k + 70) * 0.32;
    ctx.beginPath();
    ctx.moveTo(X(x), Y(y));
    ctx.lineTo(X(x + 0.02), Y(y + 0.015));
    ctx.lineTo(X(x + 0.015), Y(y + 0.035));
    ctx.stroke();
  }
  // 눈 모자
  for (const p of tops) {
    ctx.fillStyle = '#f7fbff';
    ctx.beginPath();
    ctx.moveTo(X(p.x), Y(p.y));
    ctx.lineTo(X(p.x + 0.07), Y(p.y + 0.06));
    ctx.lineTo(X(p.x + 0.035), Y(p.y + 0.05));
    ctx.lineTo(X(p.x + 0.01), Y(p.y + 0.07));
    ctx.lineTo(X(p.x - 0.03), Y(p.y + 0.05));
    ctx.lineTo(X(p.x - 0.07), Y(p.y + 0.065));
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(150,175,210,.5)';
    ctx.beginPath();
    ctx.moveTo(X(p.x), Y(p.y));
    ctx.lineTo(X(p.x + 0.07), Y(p.y + 0.06));
    ctx.lineTo(X(p.x + 0.035), Y(p.y + 0.05));
    ctx.closePath();
    ctx.fill();
    // 깃발 (꼭대기 카드를 걷으면)
    const ft = s.flagT[p.i];
    if (ft >= 0 && t >= ft) drawFlag(ctx, X(p.x), Y(p.y + 0.01), R(0.07) * ease((t - ft) / 10), t, p.i);
  }
}

function drawFlag(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, t: number, k: number) {
  if (u < 1) return;
  ctx.strokeStyle = '#5a3a1e';
  ctx.lineWidth = Math.max(1.5, u * 0.05);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - u);
  ctx.stroke();
  ctx.fillStyle = '#e84a5f';
  ctx.beginPath();
  ctx.moveTo(x, y - u);
  for (let q = 0; q <= 6; q++) {
    const qq = q / 6;
    ctx.lineTo(x + qq * u * 0.75, y - u + Math.sin(t * 0.25 - qq * 3 + k) * u * 0.07 * qq);
  }
  for (let q = 6; q >= 0; q--) {
    const qq = q / 6;
    ctx.lineTo(x + qq * u * 0.75, y - u * 0.55 + Math.sin(t * 0.25 - qq * 3 + k) * u * 0.07 * qq - qq * u * 0.05);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fff6e0';
  ctx.beginPath();
  ctx.arc(x + u * 0.3, y - u * 0.78, u * 0.07, 0, TAU);
  ctx.fill();
  for (let q = -1; q <= 1; q++) {
    ctx.beginPath();
    ctx.arc(x + u * 0.3 + q * u * 0.06, y - u * 0.88, u * 0.028, 0, TAU);
    ctx.fill();
  }
}

/** 산 아래 마을 (오두막·소나무·굴뚝 연기) + 나무 갑판 */
function drawVillage(ctx: CanvasRenderingContext2D, s: CardState, w: number, X: F, Y: F, R: F, t: number) {
  // 풀밭
  const gg = ctx.createLinearGradient(0, Y(0.96), 0, Y(1.06));
  gg.addColorStop(0, '#8fcf6e');
  gg.addColorStop(1, '#5fa651');
  ctx.fillStyle = gg;
  ctx.beginPath();
  ctx.moveTo(0, Y(0.985));
  ctx.quadraticCurveTo(X(0.5), Y(0.955), w, Y(0.985));
  ctx.lineTo(w, Y(1.07));
  ctx.lineTo(0, Y(1.07));
  ctx.fill();
  const night = s.stage === STAGES.length - 1;
  const house = (x: number, y: number, sc: number, roof: string, k: number) => {
    const u = R(0.05) * sc;
    ctx.fillStyle = 'rgba(30,50,30,.3)';
    ctx.beginPath();
    ctx.ellipse(X(x) + u * 0.2, Y(y) + 2, u * 0.75, u * 0.15, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#f3e2c4';
    ctx.fillRect(X(x) - u * 0.5, Y(y) - u * 0.6, u, u * 0.6);
    ctx.fillStyle = '#d9c3a0';
    ctx.fillRect(X(x) + u * 0.5, Y(y) - u * 0.6, u * 0.3, u * 0.6);
    ctx.fillStyle = roof;
    ctx.beginPath();
    ctx.moveTo(X(x) - u * 0.65, Y(y) - u * 0.55);
    ctx.lineTo(X(x), Y(y) - u * 1.05);
    ctx.lineTo(X(x) + u * 0.65, Y(y) - u * 0.55);
    ctx.fill();
    ctx.fillStyle = shade(roof, -0.25);
    ctx.beginPath();
    ctx.moveTo(X(x), Y(y) - u * 1.05);
    ctx.lineTo(X(x) + u * 0.95, Y(y) - u * 0.85);
    ctx.lineTo(X(x) + u * 0.9, Y(y) - u * 0.5);
    ctx.lineTo(X(x) + u * 0.6, Y(y) - u * 0.55);
    ctx.fill();
    ctx.fillStyle = night ? '#ffd36a' : '#7fb3d8';
    ctx.fillRect(X(x) - u * 0.3, Y(y) - u * 0.42, u * 0.22, u * 0.2);
    ctx.fillStyle = '#7a4a26';
    ctx.fillRect(X(x) + u * 0.08, Y(y) - u * 0.36, u * 0.2, u * 0.36);
    // 굴뚝 연기
    ctx.fillStyle = '#8a6a50';
    ctx.fillRect(X(x) + u * 0.25, Y(y) - u * 1.0, u * 0.12, u * 0.25);
    for (let q = 0; q < 3; q++) {
      const ph = ((t * 0.01 + q / 3 + k * 0.17) % 1);
      ctx.fillStyle = `rgba(255,255,255,${0.55 * (1 - ph)})`;
      ctx.beginPath();
      ctx.arc(X(x) + u * 0.31 + Math.sin(ph * 5 + k) * u * 0.15, Y(y) - u * 1.05 - ph * u * 0.9, u * (0.08 + ph * 0.12), 0, TAU);
      ctx.fill();
    }
  };
  const pine = (x: number, y: number, sc: number) => {
    const u = R(0.045) * sc;
    ctx.fillStyle = 'rgba(30,50,30,.3)';
    ctx.beginPath();
    ctx.ellipse(X(x) + u * 0.15, Y(y) + 1, u * 0.35, u * 0.1, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#6b4626';
    ctx.fillRect(X(x) - u * 0.06, Y(y) - u * 0.2, u * 0.12, u * 0.2);
    for (let k = 0; k < 3; k++) {
      ctx.fillStyle = k % 2 ? '#2f7d4a' : '#3a9257';
      ctx.beginPath();
      ctx.moveTo(X(x), Y(y) - u * (1.15 - k * 0.25));
      ctx.lineTo(X(x) + u * (0.25 + k * 0.1), Y(y) - u * (0.55 - k * 0.2));
      ctx.lineTo(X(x) - u * (0.25 + k * 0.1), Y(y) - u * (0.55 - k * 0.2));
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.beginPath();
    ctx.moveTo(X(x), Y(y) - u * 1.15);
    ctx.lineTo(X(x) + u * 0.12, Y(y) - u * 0.92);
    ctx.lineTo(X(x) - u * 0.12, Y(y) - u * 0.92);
    ctx.fill();
  };
  pine(0.03, 1.03, 1);
  house(0.17, 1.03, 0.75, '#d8553f', 0);
  pine(0.3, 1.025, 0.8);
  house(0.71, 1.025, 0.7, '#3d6fb5', 1);
  pine(0.82, 1.03, 0.9);
  house(0.93, 1.03, 0.8, '#d8553f', 2);
  // 나무 갑판 (베이스캠프)
  const y0 = Y(1.04), y1 = Y(1.262), y2 = Y(1.285);
  const dg = ctx.createLinearGradient(0, y0, 0, y1);
  dg.addColorStop(0, '#c99b62');
  dg.addColorStop(1, '#a87a45');
  ctx.fillStyle = dg;
  ctx.beginPath();
  ctx.moveTo(X(0.02), y0);
  ctx.lineTo(X(0.98), y0);
  ctx.lineTo(w, y1);
  ctx.lineTo(0, y1);
  ctx.fill();
  ctx.strokeStyle = 'rgba(90,55,25,.35)';
  ctx.lineWidth = 1;
  for (let k = 1; k < 5; k++) {
    const yy = y0 + ((y1 - y0) * k) / 5;
    ctx.beginPath();
    ctx.moveTo(X(0.02) * (1 - k / 5), yy);
    ctx.lineTo(w - X(0.02) * (1 - k / 5), yy);
    ctx.stroke();
  }
  for (let k = 0; k < 9; k++) {
    const xx = X(0.06 + k * 0.11 + (k % 2) * 0.03);
    ctx.fillStyle = 'rgba(70,40,15,.45)';
    ctx.fillRect(xx, y0 + ((y1 - y0) * ((k % 5) + 0.5)) / 5 - 1, 2, 2);
  }
  ctx.fillStyle = '#7d5530';
  ctx.fillRect(0, y1, w, y2 - y1);
  ctx.fillStyle = 'rgba(255,230,190,.35)';
  ctx.fillRect(0, y1, w, 1.5);
}

/** 고양이 등산객 (x,y = 발 자리 px, u = 크기) */
function drawCat(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, s: CardState, t: number, face: number, roll: number) {
  const m = s.mood, age = t - s.moodT;
  const fur = '#f29a3a', fur2 = '#d9772a', belly = '#fff1dc';
  const proud = m === 'proud', dizzy = m === 'dizzy', worry = m === 'worry', huh = m === 'huh', strain = m === 'strain', happy = m === 'happy' || m === 'wow';
  ctx.fillStyle = 'rgba(30,40,50,.3)';
  ctx.beginPath();
  ctx.ellipse(x, y, u * 0.38, u * 0.08, 0, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(face, 1);
  const bounce = proud ? Math.abs(Math.sin(age * 0.2)) * u * 0.06 * Math.max(0, 1 - age / 80) : happy ? Math.abs(Math.sin(age * 0.3)) * u * 0.04 * Math.max(0, 1 - age / 30) : 0;
  ctx.translate(0, -bounce);
  if (roll) {
    ctx.translate(0, -u * 0.35);
    ctx.rotate(roll);
    ctx.translate(0, u * 0.35);
  }
  // 꼬리
  ctx.strokeStyle = fur2;
  ctx.lineCap = 'round';
  ctx.lineWidth = u * 0.11;
  ctx.beginPath();
  ctx.moveTo(-u * 0.2, -u * 0.15);
  const sw = Math.sin(t * 0.08) * u * 0.08;
  if (proud) ctx.quadraticCurveTo(-u * 0.5, -u * 0.3, -u * 0.42 + sw, -u * 0.85);
  else ctx.quadraticCurveTo(-u * 0.55, -u * 0.1, -u * 0.5 + sw, -u * 0.5);
  ctx.stroke();
  // 배낭
  ctx.fillStyle = '#3f8f5a';
  ctx.beginPath();
  ctx.roundRect(-u * 0.36, -u * 0.62, u * 0.26, u * 0.4, u * 0.08);
  ctx.fill();
  ctx.fillStyle = '#2f6f45';
  ctx.fillRect(-u * 0.36, -u * 0.46, u * 0.26, u * 0.05);
  ctx.fillStyle = '#e9d27a';
  ctx.beginPath();
  ctx.ellipse(-u * 0.23, -u * 0.66, u * 0.12, u * 0.05, 0, 0, TAU);
  ctx.fill();
  // 몸
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.ellipse(0, -u * 0.3, u * 0.24, u * 0.28, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = belly;
  ctx.beginPath();
  ctx.ellipse(u * 0.07, -u * 0.27, u * 0.12, u * 0.18, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = fur2;
  ctx.lineWidth = u * 0.04;
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    ctx.moveTo(-u * 0.2, -u * (0.42 - k * 0.1));
    ctx.lineTo(-u * 0.08, -u * (0.4 - k * 0.1));
    ctx.stroke();
  }
  // 발
  ctx.fillStyle = belly;
  const step = s.t - s.hopT < 12 ? 0 : Math.sin(t * 0.1) * u * 0.01;
  ctx.beginPath();
  ctx.ellipse(-u * 0.1, -u * 0.03 + step, u * 0.08, u * 0.05, 0, 0, TAU);
  ctx.ellipse(u * 0.12, -u * 0.03 - step, u * 0.08, u * 0.05, 0, 0, TAU);
  ctx.fill();
  // 지팡이 + 앞발
  const pole = proud ? -0.5 : strain ? 0.25 : 0.1;
  ctx.save();
  ctx.translate(u * 0.22, -u * 0.32);
  ctx.rotate(pole);
  ctx.strokeStyle = '#7a4a26';
  ctx.lineWidth = u * 0.05;
  ctx.beginPath();
  ctx.moveTo(0, -u * 0.1);
  ctx.lineTo(0, u * 0.36);
  ctx.stroke();
  if (proud) drawFlag(ctx, 0, -u * 0.05, u * 0.45, t, 9);
  ctx.restore();
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.ellipse(u * 0.22, -u * 0.33, u * 0.07, u * 0.06, 0, 0, TAU);
  ctx.fill();
  // 머리 (갸웃하면 기울어짐)
  const tilt = huh ? Math.sin(Math.min(age, 10) / 10 * Math.PI / 2) * 0.42 * Math.max(0, 1 - Math.max(0, age - 40) / 20) : dizzy ? Math.sin(t * 0.2) * 0.2 : proud ? -0.15 : 0;
  ctx.save();
  ctx.translate(u * 0.04, -u * 0.62);
  ctx.rotate(tilt);
  ctx.fillStyle = fur;
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sx * u * 0.1, -u * 0.17);
    ctx.lineTo(sx * u * 0.24, -u * 0.32);
    ctx.lineTo(sx * u * 0.25, -u * 0.08);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(0, -u * 0.05, u * 0.25, u * 0.21, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = belly;
  ctx.beginPath();
  ctx.ellipse(u * 0.04, u * 0.03, u * 0.14, u * 0.1, 0, 0, TAU);
  ctx.fill();
  // 털모자
  ctx.fillStyle = '#e84a5f';
  ctx.beginPath();
  ctx.ellipse(0, -u * 0.18, u * 0.22, u * 0.13, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-u * 0.23, -u * 0.2, u * 0.46, u * 0.06);
  ctx.beginPath();
  ctx.arc(0, -u * 0.33, u * 0.06, 0, TAU);
  ctx.fill();
  // 얼굴
  ctx.fillStyle = '#2a1a10';
  ctx.strokeStyle = '#2a1a10';
  ctx.lineWidth = Math.max(1.2, u * 0.035);
  const ex = [-u * 0.08, u * 0.12], ey = -u * 0.05;
  const blink = (t % 200) < 6;
  for (const xx of ex) {
    ctx.beginPath();
    if (dizzy) {
      for (let q = 0; q < 10; q++) {
        const a = q * 0.9 + t * 0.2, r = u * 0.006 * q;
        ctx.lineTo(xx + Math.cos(a) * r, ey + Math.sin(a) * r);
      }
      ctx.stroke();
    } else if (proud || happy) {
      ctx.arc(xx, ey + u * 0.02, u * 0.04, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else if (strain) {
      ctx.moveTo(xx - u * 0.04, ey - u * 0.03);
      ctx.lineTo(xx + u * 0.02, ey);
      ctx.lineTo(xx - u * 0.04, ey + u * 0.03);
      ctx.stroke();
    } else if (blink) {
      ctx.moveTo(xx - u * 0.035, ey);
      ctx.lineTo(xx + u * 0.035, ey);
      ctx.stroke();
    } else {
      ctx.ellipse(xx, ey, u * 0.035, u * (huh || worry ? 0.05 : 0.042), 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(xx + u * 0.012, ey - u * 0.015, u * 0.012, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#2a1a10';
    }
  }
  ctx.fillStyle = '#e8737f';
  ctx.beginPath();
  ctx.moveTo(u * 0.02, u * 0.01);
  ctx.lineTo(u * 0.06, u * 0.01);
  ctx.lineTo(u * 0.04, u * 0.035);
  ctx.fill();
  ctx.strokeStyle = '#2a1a10';
  ctx.lineWidth = Math.max(1, u * 0.025);
  ctx.beginPath();
  if (m === 'wow' || huh) ctx.ellipse(u * 0.04, u * 0.07, u * 0.025, u * 0.03, 0, 0, TAU);
  else if (worry) (ctx.moveTo(u * 0.0, u * 0.08), ctx.quadraticCurveTo(u * 0.04, u * 0.05, u * 0.08, u * 0.08));
  else (ctx.moveTo(u * 0.0, u * 0.05), ctx.quadraticCurveTo(u * 0.02, u * 0.08, u * 0.04, u * 0.05), ctx.quadraticCurveTo(u * 0.06, u * 0.08, u * 0.08, u * 0.05));
  ctx.stroke();
  ctx.strokeStyle = 'rgba(60,30,10,.5)';
  ctx.lineWidth = 1;
  for (const sg of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(u * 0.04 + sg * u * 0.12, u * 0.03);
    ctx.lineTo(u * 0.04 + sg * u * 0.28, u * 0.01);
    ctx.stroke();
  }
  if (worry || strain) {
    ctx.fillStyle = '#9fd8ff';
    ctx.beginPath();
    ctx.moveTo(-u * 0.2, -u * 0.12);
    ctx.quadraticCurveTo(-u * 0.25, -u * 0.04, -u * 0.2, -u * 0.02);
    ctx.quadraticCurveTo(-u * 0.15, -u * 0.04, -u * 0.2, -u * 0.12);
    ctx.fill();
  }
  ctx.restore();
  ctx.restore();
  // 말풍선·별 (뒤집지 않고)
  if (huh && age < 50) {
    ctx.font = `900 ${Math.max(14, u * 0.45)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.strokeText('?', x + face * u * 0.4, y - u * 1.05 - Math.sin(age * 0.2) * 2);
    ctx.fillStyle = '#3a5a8a';
    ctx.fillText('?', x + face * u * 0.4, y - u * 1.05 - Math.sin(age * 0.2) * 2);
  }
  if (dizzy) {
    for (let k = 0; k < 3; k++) {
      const a = t * 0.12 + (k * TAU) / 3;
      ctx.fillStyle = '#ffd84a';
      ctx.font = `${Math.max(12, u * 0.25)}px system-ui`;
      ctx.textAlign = 'center';
      ctx.fillText('★', x + Math.cos(a) * u * 0.3, y - u * 0.95 + Math.sin(a) * u * 0.08);
    }
  }
}

function drawMarmot(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, s: CardState, t: number) {
  const age = t - s.marmotT, up = age < 90 ? Math.min(1, age / 6) * Math.min(1, (90 - age) / 12) : 0.25 + 0.05 * Math.sin(t * 0.05);
  ctx.fillStyle = '#6b4a2e';
  ctx.beginPath();
  ctx.ellipse(x, y, u * 0.5, u * 0.16, 0, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - u, y - u * 2, u * 2, u * 2);
  ctx.clip();
  const by = y + u * 0.7 - up * u * 1.05;
  ctx.fillStyle = '#a8784a';
  ctx.beginPath();
  ctx.ellipse(x, by, u * 0.3, u * 0.5, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#e8cfa4';
  ctx.beginPath();
  ctx.ellipse(x, by + u * 0.12, u * 0.17, u * 0.3, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#a8784a';
  ctx.beginPath();
  ctx.arc(x, by - u * 0.48, u * 0.22, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#2a1a10';
  ctx.beginPath();
  ctx.arc(x - u * 0.08, by - u * 0.52, u * 0.035, 0, TAU);
  ctx.arc(x + u * 0.08, by - u * 0.52, u * 0.035, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x - u * 0.04, by - u * 0.4, u * 0.08, u * 0.06);
  if (age < 90 && up > 0.5) {
    ctx.strokeStyle = '#a8784a';
    ctx.lineWidth = u * 0.1;
    ctx.lineCap = 'round';
    const wv = Math.sin(t * 0.5) * 0.4;
    ctx.beginPath();
    ctx.moveTo(x - u * 0.22, by - u * 0.15);
    ctx.lineTo(x - u * 0.42, by - u * 0.55 + wv * u * 0.2);
    ctx.moveTo(x + u * 0.22, by - u * 0.15);
    ctx.lineTo(x + u * 0.42, by - u * 0.55 - wv * u * 0.2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawGoat(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, s: CardState, t: number) {
  const age = t - s.goatT, hop = age >= 0 && age < 30 ? Math.sin((age / 30) * Math.PI) * u * 0.35 : 0;
  ctx.fillStyle = '#7d8a9b';
  ctx.beginPath();
  ctx.moveTo(x - u * 0.9, y + u * 0.1);
  ctx.lineTo(x + u * 0.7, y + u * 0.1);
  ctx.lineTo(x + u * 0.4, y + u * 0.45);
  ctx.lineTo(x - u * 0.6, y + u * 0.5);
  ctx.fill();
  ctx.fillStyle = '#5f6b7b';
  ctx.fillRect(x - u * 0.9, y + u * 0.1, u * 1.6, u * 0.06);
  ctx.save();
  ctx.translate(x, y - hop);
  ctx.fillStyle = '#f4f1ea';
  ctx.beginPath();
  ctx.ellipse(0, -u * 0.35, u * 0.4, u * 0.22, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#d9d2c4';
  ctx.lineWidth = u * 0.09;
  for (const lx of [-0.25, -0.1, 0.12, 0.27]) {
    ctx.beginPath();
    ctx.moveTo(lx * u, -u * 0.2);
    ctx.lineTo(lx * u, u * 0.08);
    ctx.stroke();
  }
  ctx.fillStyle = '#f4f1ea';
  ctx.beginPath();
  ctx.ellipse(u * 0.4, -u * 0.58, u * 0.15, u * 0.13, -0.3, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#8a7a5a';
  ctx.lineWidth = u * 0.06;
  ctx.beginPath();
  ctx.moveTo(u * 0.38, -u * 0.7);
  ctx.quadraticCurveTo(u * 0.25, -u * 0.95, u * 0.15, -u * 0.8);
  ctx.stroke();
  ctx.fillStyle = '#2a1a10';
  ctx.beginPath();
  ctx.arc(u * 0.45, -u * 0.6, u * 0.03, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#e8e2d6';
  ctx.beginPath();
  ctx.moveTo(u * 0.48, -u * 0.48);
  ctx.lineTo(u * 0.52, -u * 0.32);
  ctx.lineTo(u * 0.42, -u * 0.46);
  ctx.fill();
  ctx.restore();
}

function drawPile(ctx: CanvasRenderingContext2D, s: CardState, X: F, Y: F, R: F, t: number, font: (sz: number, w?: number) => void) {
  const L = s.L, S = s.S;
  // ═════════ 더미 (뒷면이 쌓인 두께) ═════════
  // 판 끝 폭죽: 쏘아 올린 만큼 더미가 줄어든다
  const shot = s.fire ? Math.max(0, Math.min(s.fire.n, 12, Math.floor((t - s.fire.t0) / 9) + 1)) : 0;
  const left = stockLeft(L, S) - shot, sw = R(SW), shh = R(SH);
  const stuck = s.phase === 'play' && !anyTake(L, S);
  const layers = Math.min(6, Math.ceil(left / 3));
  for (let k = 0; k < layers; k++) drawCard(ctx, X(STX) - k * 1.2, Y(STY) - k * 2.2, sw, shh, 0, { down: true }, t);
  if (!left) {
    ctx.strokeStyle = 'rgba(90,55,25,.6)';
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(X(STX) - sw / 2, Y(STY) - shh / 2, sw, shh, sw * 0.14);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (stuck && left > 0) {
    const pul = 0.5 + 0.5 * Math.sin(t * 0.2);
    ctx.strokeStyle = `rgba(255,220,90,${0.5 + 0.5 * pul})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(X(STX) - sw / 2 - 4 - layers * 1.2, Y(STY) - shh / 2 - 4 - layers * 2.2, sw + 8, shh + 8, sw * 0.18);
    ctx.stroke();
  }
  // 남은 장 수 딱지
  const bx = X(STX + SW * 0.42), by = Y(STY - SH * 0.48) - layers * 2.2;
  ctx.fillStyle = left <= 2 ? '#e84a5f' : '#2a4a85';
  ctx.beginPath();
  ctx.arc(bx, by, R(0.03), 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();
  font(0.032, 900);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(String(left), bx, by + 1);
  if (left) {
    font(0.036, 900);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(20,35,70,.9)';
    ctx.strokeText('더미', X(STX) - (layers - 1) * 1.2, Y(STY + 0.045) - (layers - 1) * 2.2);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('더미', X(STX) - (layers - 1) * 1.2, Y(STY + 0.045) - (layers - 1) * 2.2);
  }
  // ═════════ 다음 3장 미리 보기 ═════════
  const nv = Math.min(PV, left);
  font(0.028, 900);
  ctx.fillStyle = '#5a3412';
  ctx.textAlign = 'left';
  if (nv) ctx.fillText('다음 ▸', X(PVX(0) - PVW / 2), Y(PVY - PVH / 2 - 0.022));
  for (let k = nv - 1; k >= 0; k--) {
    drawCard(ctx, X(PVX(k)), Y(PVY) + k * 1, R(PVW), R(PVH), L.stock[S.si + shot + k], { dim: k ? 0.1 * k : 0 }, t);
  }
  // ═════════ 펼친 카드 ═════════
  const shown = s.pile.filter((q) => q.t <= t);
  const top3 = shown.slice(-3);
  const ww = R(WW), wh = R(WH);
  font(0.028, 900);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#5a3412';
  ctx.fillText('◀ 펼친 카드', X(WX + WW / 2 + 0.015), Y(WY + 0.08));
  ctx.textAlign = 'center';
  top3.forEach((q, k) => {
    const last = k === top3.length - 1, off = (top3.length - 1 - k) * R(0.018);
    if (q.id < 0) {
      // 발도장 카드
      ctx.save();
      ctx.translate(X(WX) - off, Y(WY) - off * 0.4);
      ctx.fillStyle = 'rgba(30,40,60,.25)';
      ctx.beginPath();
      ctx.roundRect(-ww / 2 + 2, -wh / 2 + 5, ww, wh, ww * 0.14);
      ctx.fill();
      const g = ctx.createLinearGradient(0, -wh / 2, 0, wh / 2);
      g.addColorStop(0, '#ffe8f2');
      g.addColorStop(1, '#ffc9de');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(-ww / 2, -wh / 2, ww, wh, ww * 0.14);
      ctx.fill();
      ctx.strokeStyle = '#ff8fb8';
      ctx.lineWidth = 2;
      ctx.stroke();
      const pq = last ? ease((t - s.pawT) / 8) : 1;
      ctx.scale(0.6 + 0.4 * pq + (last ? Math.max(0, 1 - (t - s.pawT) / 6) * 0.6 : 0), 0.6 + 0.4 * pq);
      ctx.fillStyle = '#ff6fa5';
      ctx.beginPath();
      ctx.ellipse(0, wh * 0.08, ww * 0.2, ww * 0.16, 0, 0, TAU);
      ctx.fill();
      for (let q2 = 0; q2 < 4; q2++) {
        ctx.beginPath();
        ctx.ellipse((q2 - 1.5) * ww * 0.13, -wh * 0.1 - (q2 === 1 || q2 === 2 ? wh * 0.04 : 0), ww * 0.06, ww * 0.075, 0, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
      if (last) {
        font(0.03, 900);
        ctx.fillStyle = '#c2185b';
        ctx.fillText('아무 수!', X(WX), Y(WY + 0.09));
      }
    } else drawCard(ctx, X(WX) - off, Y(WY) - off * 0.4, ww, wh, q.id, { dim: last ? 0 : 0.08 }, t);
  });
  // 연속 표시
  if (S.chain >= 2 && s.phase !== 'result') {
    const c = S.chain, pop = Math.max(0, 1 - (t - s.hopT) / 10);
    font(0.036 + Math.min(0.02, c * 0.002) + pop * 0.012, 900);
    ctx.textAlign = 'left';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(90,40,10,.7)';
    const tx = `연속 ×${c}`;
    ctx.strokeText(tx, X(WX + WW / 2 + 0.015), Y(WY - 0.06));
    ctx.fillStyle = c >= 8 ? '#ff7ab0' : c >= 5 ? '#ffd84a' : '#fff4d0';
    ctx.fillText(tx, X(WX + WW / 2 + 0.015), Y(WY - 0.06));
  }
  // 꽃 무늬: 다음에 같은 무늬면 꽃
  if (L.flower && S.ls >= 0 && s.phase === 'play') {
    const bx2 = X(WX + WW / 2 + 0.02), by2 = Y(WY + 0.01);
    ctx.fillStyle = 'rgba(255,240,248,.95)';
    ctx.beginPath();
    ctx.roundRect(bx2 - R(0.005), by2 - R(0.03), R(0.13), R(0.06), R(0.03));
    ctx.fill();
    ctx.strokeStyle = '#ff8fb8';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    suitIcon(ctx, S.ls, bx2 + R(0.03), by2, R(0.035));
    font(0.028, 900);
    ctx.fillStyle = '#c2185b';
    ctx.textAlign = 'left';
    ctx.fillText('→🌸', bx2 + R(0.055), by2 + 1);
  }
  // ═════════ 발도장 단추 ═════════
  if (L.paw > 0) {
    const on = S.paw > 0, pul = on && stuck ? 0.5 + 0.5 * Math.sin(t * 0.22) : 0;
    const x = X(PX), y = Y(PY), r = R(PR);
    ctx.fillStyle = 'rgba(60,30,10,.35)';
    ctx.beginPath();
    ctx.ellipse(x + 2, y + r * 0.85, r * 0.95, r * 0.3, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = on ? '#b5703a' : '#8a7a6a';
    ctx.beginPath();
    ctx.arc(x, y + 4, r, 0, TAU);
    ctx.fill();
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.4, 2, x, y, r);
    g.addColorStop(0, on ? '#ffd9e8' : '#d8d0c8');
    g.addColorStop(1, on ? '#ff8fb8' : '#a89c90');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    if (pul) {
      ctx.strokeStyle = `rgba(255,230,120,${0.5 + 0.5 * pul})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, r + 4 + pul * 3, 0, TAU);
      ctx.stroke();
    }
    ctx.fillStyle = on ? '#c2185b' : '#6a5e54';
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.16, r * 0.3, r * 0.24, 0, 0, TAU);
    ctx.fill();
    for (let q = 0; q < 4; q++) {
      ctx.beginPath();
      ctx.ellipse(x + (q - 1.5) * r * 0.21, y - r * 0.2 - (q === 1 || q === 2 ? r * 0.08 : 0), r * 0.09, r * 0.11, 0, 0, TAU);
      ctx.fill();
    }
    font(0.028, 900);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#4a2a10';
    ctx.fillText(`발도장 ×${S.paw}`, x, y - r - R(0.022));
  }
}

const recentSay = new WeakMap<object, { x: number; y: number; t: number }[]>();
function drawAll(ctx: CanvasRenderingContext2D, s: CardState, w: number, h: number, th: Theme) {
  const fx = juice(s), t = s.t, L = s.L, S = s.S, d = STAGES[s.stage];
  const X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w;
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  ctx.save();
  fx.begin(ctx);
  // 큰 연속 순간: 화면이 펼친 카드 쪽으로 살짝 당겨진다
  if (t < s.stopUntil + 10) {
    const k = 1 + 0.03 * Math.min(1, (s.stopUntil + 10 - t) / 10);
    ctx.translate(X(0.5), Y(0.8));
    ctx.scale(k, k);
    ctx.translate(-X(0.5), -Y(0.8));
  }
  drawSky(ctx, s, w, h, X, Y, R, t);
  drawGoat(ctx, X(0.075), Y(0.6), R(0.075), s, t);
  drawMassif(ctx, s, X, Y, R, t);
  // ═════════ 카드 봉우리 ═════════
  const cw = R(CW), ch = R(CH), play = s.phase === 'play';
  const keyIn = L.key >= 0 && has(S.mask, L.key);
  for (const i of byFront(L)) {
    if (!has(S.mask, i)) continue;
    const free = isFree(L, S.mask, i), lk = has(L.lock, i);
    const down = !has(S.up, i), rq = s.revT[i] >= 0 ? cl01((t - s.revT[i]) / 10) : 1;
    const ok = play && free && !down && canTake(L, S, i);
    const wob = s.wrongI === i && t - s.wrongT < 20 ? Math.sin((t - s.wrongT) * 1.4) * 0.06 * (1 - (t - s.wrongT) / 20) : 0;
    drawCard(ctx, X(L.x[i]), Y(L.y[i]), cw, ch, L.su[i] * 13 + L.v[i] - 1, {
      down: down || (s.revT[i] >= 0 && t < s.revT[i]), flipQ: rq, dim: free ? 0 : 0.2, glow: ok ? 0.6 + 0.4 * Math.sin(t * 0.15 + i) : 0,
      lock: lk ? (keyIn ? 0 : s.unlockT >= 0 ? cl01((t - s.unlockT) / 14) : 1) : undefined, key: i === L.key, snow: has(L.snow, i), rot: wob,
    }, t);
  }
  drawVillage(ctx, s, w, X, Y, R, t);
  drawMarmot(ctx, X(0.6), Y(1.035), R(0.06), s, t);
  drawPile(ctx, s, X, Y, R, t, font);
  // ═════════ 고양이 등산객 ═════════
  {
    let cx = s.cx, cy = s.cy, roll = 0;
    const hq = cl01((t - s.hopT) / 12);
    if (hq < 1) (cx = s.fx + (s.cx - s.fx) * hq), (cy = s.fy + (s.cy - s.fy) * hq - Math.sin(hq * Math.PI) * 0.06);
    if (!s.ok && s.phase !== 'play') {
      // 실패: 데굴데굴 굴러 마을로
      const q = cl01(s.phase === 'result' ? 1 : s.pt / 50);
      cx = s.cx + (BASE_X + 0.05 - s.cx) * ease(q);
      cy = s.cy + (BASE_Y - s.cy) * q - Math.abs(Math.sin(q * Math.PI * 3)) * 0.03 * (1 - q);
      roll = q < 1 ? q * TAU * 2 : 0;
    }
    const face = s.cx < s.fx - 0.01 ? -1 : 1;
    drawCat(ctx, X(cx), Y(cy), R(0.1), s, t, face, roll);
  }
  // ═════════ 날아가는 카드 ═════════
  for (const f of s.flies) {
    const u = t - f.t0;
    if (u < 0) continue;
    const q = cl01(u / f.dur);
    if (f.kind === 'sweep') {
      if (q >= 1) continue;
      const x = f.x0 + (f.x1 - f.x0) * q, y = f.y0 + (f.y1 - f.y0) * q * q - Math.sin(q * Math.PI) * 0.08;
      drawCard(ctx, X(x), Y(y), cw, ch, f.id, { rot: f.spin * q * 2, alpha: 1 - q }, t);
      continue;
    }
    if (q >= 1) continue;
    const e = ease(q), x = f.x0 + (f.x1 - f.x0) * e, y = f.y0 + (f.y1 - f.y0) * e - Math.sin(q * Math.PI) * 0.09;
    const sc = f.kind === 'take' ? 1 + (0.16 / CW - 1) * e : (0.13 + 0.03 * e) / CW;
    drawCard(ctx, X(x), Y(y), cw * sc, ch * sc, f.id, { rot: f.spin * Math.sin(q * Math.PI), lift: Math.sin(q * Math.PI) * 10, flipQ: f.kind === 'flip' ? Math.min(1, q * 2.4) : 1 }, t);
  }
  // ═════════ 판 끝 폭죽 (남은 더미가 한 장씩 하늘로) ═════════
  if (s.fire) {
    const n = Math.min(12, s.fire.n);
    for (let k = 0; k < n; k++) {
      const t0 = s.fire.t0 + k * 9, u = t - t0;
      if (u < 0) continue;
      const tx = 0.15 + hsh(k + s.stage * 7) * 0.7, ty = 0.16 + hsh(k * 3 + 5) * 0.22;
      if (u < 24) {
        const q = ease(u / 24), x = STX + (tx - STX) * q, y = STY + (ty - STY) * q;
        ctx.strokeStyle = 'rgba(255,230,150,.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(X(x), Y(y));
        ctx.lineTo(X(x - (tx - STX) * 0.08), Y(y + 0.08));
        ctx.stroke();
        drawCard(ctx, X(x), Y(y), R(0.05), R(0.07), 0, { down: true, rot: u * 0.3 }, t);
      } else if ((fx.memo['fw' + k] ?? -1) !== t0) {
        fx.memo['fw' + k] = t0;
        const cols = ['#ff5a6e', '#ffd84a', '#5ad1ff', '#7dff8a', '#ff9af0', '#ffffff'];
        fx.burst(X(tx), Y(ty), cols[k % cols.length], 34, 4.6, 2.8);
        fx.burst(X(tx), Y(ty), cols[(k + 2) % cols.length], 16, 2.5, 2);
        fx.ring(X(tx), Y(ty), cols[k % cols.length], R(0.12), 3);
        fx.pop(X(tx), Y(ty) + R(0.05), `+${FIRE_PTS}`, '#fff6c0', 16);
        fx.kick(2.5);
      }
    }
  }
  // 가장자리 어둡게
  const vg = ctx.createRadialGradient(w / 2, h * 0.5, R(0.5), w / 2, h * 0.5, R(1.05));
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(10,20,40,.32)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
  // ═════════ 사건 연출 ═════════
  const say = (x: number, y: number, text: string, col: string, size: number) => {
    let rec = recentSay.get(s);
    if (!rec) recentSay.set(s, (rec = []));
    y = Math.max(Y(0.16), Math.min(Y(1.24), y));
    for (let k = 0; k < 6 && rec.some((q) => t - q.t < 56 && Math.abs(q.x - x) < w * 0.32 && Math.abs(q.y - y) < size + 5); k++) y -= size + 6;
    if (y < Y(0.15)) y += (size + 6) * 3;
    rec.push({ x, y, t });
    if (rec.length > 12) rec.shift();
    ctx.font = `800 ${size}px system-ui, sans-serif`;
    const hw = ctx.measureText(text).width / 2 + 6;
    fx.pop(Math.max(hw, Math.min(w - hw, x)), y, text, col, size);
  };
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    const due = e.v !== undefined && e.kind !== 'clear' ? e.v : e.t;
    if (due <= seenT || due > t) continue;
    const x = X(e.x), y = Y(e.y), n = e.n ?? 1;
    if (e.kind === 'take') {
      const c = Math.min(10, n);
      fx.burst(x, y, '#ffffff', 10 + 2 * c, 2.4 + c * 0.25, 2.2);
      fx.burst(x, y, SUIT[0], 4 + c, 2 + c * 0.3, 1.8);
      fx.ring(x, y, n >= 5 ? '#ffd84a' : '#ffffff', R(0.05 + 0.006 * c), 2 + c * 0.3);
      fx.kick(0.8 + c * 0.35);
      if (n >= 4) fx.pop(x, y - R(0.05), e.text!, n >= 8 ? '#ff9ad5' : n >= 5 ? '#ffe066' : '#fff6d0', 13 + Math.min(6, n - 3));
    }
    if (e.kind === 'chain') {
      const c = Math.min(10, n);
      fx.burst(x, y, c >= 8 ? '#ff9ad5' : '#ffd84a', 6 + c * 3, 2 + c * 0.4, 2.2);
      if (c >= 5) fx.blink('#fff3c0', 0.05 + 0.015 * c);
    }
    if (e.kind === 'big') {
      const c = Math.min(6, n - 4);
      fx.blink('#fff1a8', 0.22 + 0.04 * c);
      fx.kick(6 + c * 1.5);
      fx.ring(X(WX), Y(WY), '#ffd84a', R(0.3 + 0.04 * c), 6);
      for (const col of ['#ff5a6e', '#ffd84a', '#5ad1ff', '#7dff8a', '#ff9af0']) fx.burst(X(WX), Y(WY - 0.05), col, 10 + c * 2, 5 + c * 0.5, 2.6);
      say(x, y, e.text!, e.col!, 26 + c * 2);
    }
    if (e.kind === 'sweep') fx.burst(x, y, '#ffffff', 26, 4, 3.2), fx.burst(x, y, '#cfe8ff', 14, 3, 2.4), fx.ring(x, y, '#e8f6ff', R(0.1), 4), fx.kick(5), fx.pop(x, y - R(0.04), e.text!, e.col!, 16);
    if (e.kind === 'flip') fx.burst(x, y - R(0.05), '#e8f0ff', 10, 2.5, 2);
    if (e.kind === 'paw') fx.burst(x, y, '#ff8fb8', 26, 3.6, 2.8), fx.ring(x, y, '#ffc2dc', R(0.13), 5), fx.kick(4), say(x, y - R(0.15), e.text!, e.col!, 20);
    if (e.kind === 'reveal') fx.ring(x, y, '#fff6a8', R(0.07), 3), fx.burst(x, y, '#fff6a8', 14, 2.6, 2), fx.pop(x + R(0.05), y - R(0.04), e.text!, '#fff6d0', 15), fx.kick(1.5);
    if (e.kind === 'unlock') {
      for (let i = 0; i < L.n; i++) if (has(L.lock, i) && has(S.mask, i)) fx.burst(X(L.x[i]), Y(L.y[i] - 0.03), '#ffd35a', 18, 3.4, 2.4), fx.ring(X(L.x[i]), Y(L.y[i]), '#fff1a8', R(0.07), 3);
      fx.kick(4);
      say(x, y, e.text!, e.col!, 18);
    }
    if (e.kind === 'peak') {
      for (const col of ['#ff5a6e', '#ffd84a', '#5ad1ff', '#7dff8a']) fx.burst(x, y, col, 14, 4.6, 2.6);
      fx.ring(x, y, '#ffffff', R(0.14), 5);
      fx.kick(5);
      fx.blink('#fffbe0', 0.15);
      say(x, y - R(0.04), e.text!, e.col!, 20);
      say(X(0.13), Y(0.52), '메에~!', '#f4f1ea', 15);
    }
    if (e.kind === 'num') fx.pop(x, y, e.text!, e.col!, 18);
    if (e.kind === 'bloom') {
      for (let k = 0; k < 3; k++) fx.burst(x + (k - 1) * R(0.05), y, ['#ff9ac4', '#ffd6ec', '#ffffff'][k], 16, 3.6, 2.6);
      fx.ring(x, y, '#ffc2dc', R(0.12), 4);
      fx.kick(3);
      say(x, y - R(0.05), e.text!, e.col!, 17);
    }
    if (e.kind === 'nope') say(x, y, e.text!, e.col!, 14), fx.kick(1.2);
    if (e.kind === 'say') say(x, y, e.text!, e.col!, 14);
    if (e.kind === 'jam') fx.kick(9), fx.blink(th.hot, 0.25), fx.burst(X(0.5), Y(0.8), '#ffffff', 40, 5, 3.4), say(x, y, e.text!, e.col!, 20);
    if (e.kind === 'stage') fx.blink('#fff6d6', 0.18);
    if (e.kind === 'clear') {
      fx.burst(X(0.5), Y(0.55), '#ffe066', 46, 6, 3.2), fx.burst(X(0.5), Y(0.55), '#ff9ad5', 30, 5, 3), fx.ring(X(0.5), Y(0.55), '#ffe066', R(0.35), 6), fx.blink('#fff6c8', 0.3), fx.kick(6);
    }
    if (e.kind === 'fail') fx.kick(9), fx.blink(th.hot, 0.22);
  }
  fx.memo.t = t;
  ctx.restore();
  drawHud(ctx, s, d, w, X, Y, R, font);
}

function drawHud(ctx: CanvasRenderingContext2D, s: CardState, d: StageDef, w: number, X: F, Y: F, R: F, font: (sz: number, w?: number) => void) {
  const t = s.t, S = s.S, L = s.L;
  const hb = R(0.066);
  ctx.fillStyle = 'rgba(20,34,58,.88)';
  ctx.fillRect(0, 0, w, hb);
  font(0.04, 900);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f2f7ff';
  ctx.fillText(`${s.stage + 1}/${STAGES.length} ${d.emoji} ${d.name}`, R(0.03), hb * 0.52);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffd166';
  const stt = `★${s.stars}`;
  ctx.fillText(stt, w - R(0.03), hb * 0.52);
  const sw2 = ctx.measureText(stt).width;
  ctx.fillStyle = '#ff6b81';
  const hs = '♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts));
  ctx.fillText(hs, w - R(0.05) - sw2, hb * 0.52);
  // 점수 딱지
  font(0.03, 800);
  const sc = `${ptsNow(s)}점`;
  const scw = ctx.measureText(sc).width + R(0.04);
  ctx.fillStyle = 'rgba(20,34,58,.6)';
  ctx.beginPath();
  ctx.roundRect(w - scw - R(0.015), hb + R(0.008), scw, R(0.042), R(0.021));
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(sc, w - R(0.015) - scw / 2, hb + R(0.03));
  // 새것 알림
  if (s.news && t - s.news.t < NEWS_T + 20) {
    const age = t - s.news.t, a = Math.min(1, age / 10, (NEWS_T + 20 - age) / 20), drop = Math.max(0, 10 - age) * 2;
    ctx.globalAlpha = a;
    const tx = `✨ ${s.news.text}`;
    let fs = 0.036;
    font(fs, 900);
    while (ctx.measureText(tx).width > w - R(0.05) && fs > 0.03) font((fs -= 0.001), 900);
    const tw2 = Math.min(w - 8, ctx.measureText(tx).width + 22), by2 = Y(0.15) - drop;
    ctx.fillStyle = 'rgba(25,45,80,.92)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw2 / 2, by2 - R(0.027), tw2, R(0.054), R(0.027));
    ctx.fill();
    ctx.strokeStyle = 'rgba(160,200,255,.6)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#eef6ff';
    ctx.fillText(tx, w / 2, by2 + 1);
    ctx.globalAlpha = 1;
  }
  // 판 시작 큰 글씨
  {
    const age = t - s.startT;
    if (age < 90 && s.phase === 'play') {
      const a = Math.min(1, age / 8, (90 - age) / 18), sc2 = 1 + Math.max(0, 8 - age) * 0.04;
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(20,34,58,.55)';
      ctx.fillRect(0, Y(0.225), w, R(0.13));
      ctx.save();
      ctx.translate(w / 2, Y(0.282));
      ctx.scale(sc2, sc2);
      font(0.068, 900);
      ctx.textAlign = 'center';
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(20,34,58,.85)';
      const big = `${d.emoji} ${s.stage + 1}판 · ${d.name}`;
      ctx.strokeText(big, 0, 0);
      ctx.fillStyle = '#fff6d6';
      ctx.fillText(big, 0, 0);
      font(0.036, 800);
      const sub = `카드 ${L.n}장 봉우리를 다 걷어요`;
      ctx.strokeText(sub, 0, R(0.05));
      ctx.fillText(sub, 0, R(0.05));
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }
  drawSpot(ctx, s, w, X, Y, R, font);
  // 결과
  if (s.phase === 'result') {
    const age = s.pt, a = Math.min(1, age / 10);
    ctx.globalAlpha = a;
    ctx.fillStyle = s.ok ? 'rgba(25,45,85,.78)' : 'rgba(80,25,35,.75)';
    ctx.fillRect(0, Y(0.36), w, R(0.27));
    ctx.textAlign = 'center';
    font(s.ok ? 0.058 : 0.05, 900);
    ctx.fillStyle = s.ok ? '#fff1a8' : '#ffd0c8';
    ctx.fillText(s.ok ? (s.won ? '대정상 정복! 🎉' : `${d.emoji} ${d.name} 정복!`) : s.why, w / 2, Y(0.42));
    if (s.ok) {
      for (let k = 0; k < 3; k++) {
        const ag = age - 14 - k * 10, got = k < s.got;
        if (ag < 0) continue;
        const sc3 = got ? 1 + Math.max(0, 1 - ag / 8) * 0.8 : 1;
        font(0.08 * sc3, 900);
        ctx.fillStyle = got ? '#ffd166' : 'rgba(255,255,255,.35)';
        ctx.fillText(got ? '★' : '☆', w / 2 + (k - 1) * R(0.1), Y(0.51));
        if (got && (juice(s).memo['star' + k] ?? -1) < s.clearT) (juice(s).memo['star' + k] = s.clearT), juice(s).burst(w / 2 + (k - 1) * R(0.1), Y(0.51), '#ffe066', 14, 3, 2.4);
      }
      font(0.032, 800);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`더미 ${stockLeft(L, S)}장 남김 (★ ${needN(L, S)}장) · 최고 연속 ${S.best} (★ ×${L.K})`, w / 2, Y(0.585));
    } else {
      font(0.04, 800);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(s.hearts > 0 ? '♥ -1 · 이 판을 처음부터 다시' : '하트를 다 썼어요 — 끝', w / 2, Y(0.51));
      font(0.032, 800);
      ctx.fillText(s.hearts > 0 ? `다시 하면 📣 응원 카드 +${Math.min(6, (s.failStage === s.stage ? s.failN : 1) * 3)}장` : '이번엔 더 길게 이어지는 갈래를 골라 봐요', w / 2, Y(0.575));
    }
    ctx.globalAlpha = 1;
  }
  // ═════════ 아래 띠: 별 목표 · 안내 ═════════
  {
    const y0 = Y(1.285);
    ctx.fillStyle = 'rgba(20,34,58,.92)';
    ctx.fillRect(0, y0, w, Y(A) - y0);
    const y2 = Y(1.33), res = s.phase === 'result' && s.ok, left = stockLeft(L, S);
    const chips = [
      { txt: '정복', st: res ? true : null },
      { txt: `더미 ${needN(L, S)}장 남기기`, st: left < needN(L, S) ? false : res ? true : null },
      { txt: `연속 ×${L.K}`, st: S.best >= L.K ? true : null, sub: S.best >= L.K ? '' : `(${S.best})` },
    ];
    const gx0 = R(0.02), gw = (w - R(0.04)) / 3;
    chips.forEach((c, k) => {
      const gx = gx0 + k * gw;
      ctx.fillStyle = c.st === true ? 'rgba(255,209,102,.32)' : c.st === false ? 'rgba(0,0,0,.35)' : 'rgba(220,235,255,.12)';
      ctx.beginPath();
      ctx.roundRect(gx + 2, y2 - R(0.027), gw - 4, R(0.054), R(0.027));
      ctx.fill();
      font(0.031, 800);
      ctx.textAlign = 'center';
      const label = `${c.st === true ? '★' : c.st === false ? '✗' : '☆'} ${c.txt}${c.sub ?? ''}`;
      let fs = 0.031;
      while (ctx.measureText(label).width > gw - 8 && fs > 0.026) font((fs -= 0.001), 800);
      ctx.fillStyle = c.st === false ? 'rgba(255,255,255,.45)' : '#fff6e0';
      ctx.fillText(label, gx + gw / 2, y2 + 1);
    });
    const y3 = Y(1.41);
    let tp = '👆 펼친 카드보다 1 크거나 작은 카드를 톡!';
    const stuck = !anyTake(L, S);
    if (s.phase === 'result') tp = s.ok ? '다음 마을로 출발!' : '같은 판을 다시 — 이번엔 갈래를 골라서';
    else if (s.phase === 'settle') tp = s.ok ? '🎆 남은 더미가 폭죽으로!' : '';
    else if (stuck && S.paw > 0 && left > 0) tp = '막혔어요 — 🐾 발도장으로 이을까, 더미를 뒤집을까?';
    else if (stuck && S.paw > 0) tp = '🐾 발도장을 톡 — 아무 카드나 이어 걸어요';
    else if (stuck) tp = '걷을 게 없어요 — 왼쪽 더미를 톡!';
    else if (s.stage > 0 || S.moves > 2) tp = d.tip;
    ctx.textAlign = 'center';
    let fs = 0.034;
    font(fs, 800);
    while (ctx.measureText(tp).width > w - R(0.04) && fs > 0.028) font((fs -= 0.001), 800);
    ctx.fillStyle = 'rgba(230,240,255,.92)';
    ctx.fillText(tp, w / 2, y3);
    font(0.027, 700);
    ctx.fillStyle = 'rgba(200,215,240,.75)';
    ctx.fillText(`펼친 카드 ${S.wv === WILD ? '🐾' : VAL[S.wv]} → ${near(S.wv)} 걷을 수 있어요`, w / 2, Y(1.46));
  }
  // 첫 판: 손가락으로 첫 카드 가리키기
  if (s.stage === 0 && S.moves < 2 && s.phase === 'play' && t - s.startT > 40) {
    const m = L.plan[S.moves];
    if (m !== undefined && legal(L, S, m)) {
      const px = m === FLIP ? STX : m === PAW ? PX : L.x[m], py = m === FLIP ? STY : m === PAW ? PY : L.y[m];
      const bob = Math.sin(t * 0.15) * R(0.012);
      ctx.font = `${Math.max(20, R(0.075))}px system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('👆', X(px) + R(0.025), Y(py + 0.07) + bob);
      ctx.strokeStyle = 'rgba(255,255,255,.9)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(X(px), Y(py), R(CW * 0.7) + Math.sin(t * 0.15) * 2, R(CH * 0.62), 0, 0, TAU);
      ctx.stroke();
    }
  }
  ctx.textBaseline = 'alphabetic';
}

/** 새 장치 스포트라이트: 그 판을 처음 할 때, 판 소개 뒤 2초쯤 주변을 어둡게 하고 장치에 빛을 비춘다 */
function drawSpot(ctx: CanvasRenderingContext2D, s: CardState, w: number, X: F, Y: F, R: F, font: (sz: number, w?: number) => void) {
  if (s.retry || s.phase !== 'play') return;
  const age = s.t - s.startT;
  if (age < 88 || age > 225) return;
  const L = s.L, S = s.S, key = STAGES[s.stage].key;
  let x = -1, y = -1, rr = 0.1, label = '';
  const at = (i: number) => ((x = L.x[i]), (y = L.y[i]));
  if (key === 'twin') {
    const ok = [...Array(L.n).keys()].filter((i) => canTake(L, S, i));
    if (ok.length) at(ok[0]), (label = '🔀 맞는 카드가 둘이면 — 더 길게 이어지는 쪽!');
    else (x = WX), (y = WY), (rr = 0.14), (label = '🔀 위로 갈까 아래로 갈까 — 갈래를 골라요');
  } else if (key === 'fog') {
    const i = [...Array(L.n).keys()].find((j) => has(S.mask, j) && !has(S.up, j));
    if (i !== undefined) at(i), (label = '🃏 뒤집힌 카드 — 덮개를 다 걷으면 짠!');
  } else if (key === 'lock') {
    if (L.key >= 0) at(L.key), (label = '🔑 열쇠 카드를 걷으면 🔒 자물쇠가 다 열려요'), (rr = 0.1);
  } else if (key === 'paw') (x = PX), (y = PY), (rr = 0.11), (label = '🐾 막히면 톡 — 아무 수나 이어 걷기 (한 번)');
  else if (key === 'snow') {
    const i = [...Array(L.n).keys()].find((j) => has(L.snow, j));
    if (i !== undefined) at(i), (label = '⛄ 걷으면 굴러서 양옆 카드까지 쓸어 가요'), (rr = 0.14);
  } else if (key === 'flower') (x = WX), (y = WY), (rr = 0.15), (label = '🌸 같은 무늬 두 장을 잇달아 → 더미 +1');
  else if (key === 'summit') (x = 0.5), (y = 0.75), (rr = 0.2), (label = '🏔️ 안개·자물쇠·눈덩이·발도장 — 전부!');
  if (x < 0 || !label) return;
  const a = Math.min(1, (age - 88) / 10, (225 - age) / 18), cx = X(x), cy = Y(y), r = R(rr) * (1 + 0.05 * Math.sin(age * 0.2));
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(10,20,40,.55)';
  ctx.beginPath();
  ctx.rect(0, R(0.066), w, Y(1.285) - R(0.066));
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
  while (ctx.measureText(label).width > w - R(0.08) && fs > 0.028) font((fs -= 0.001), 900);
  const tw = ctx.measureText(label).width + R(0.05), ly = y > 0.8 ? cy - r - R(0.06) : cy + r + R(0.06), lx = Math.max(tw / 2 + 4, Math.min(w - tw / 2 - 4, cx));
  ctx.fillStyle = 'rgba(30,55,100,.96)';
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
  ctx.fillStyle = '#ff5a6e';
  ctx.beginPath();
  ctx.roundRect(lx - tw / 2 - R(0.01), ly - R(0.055), nw2, R(0.04), R(0.02));
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillText(nb, lx - tw / 2 - R(0.01) + nw2 / 2, ly - R(0.034));
  ctx.restore();
}
