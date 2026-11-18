/**
 * 높을까 낮을까 구름 사다리 (30라운드: 카지노 재료) — 높을까 낮을까 × 더 걸까 멈출까 × 가리키기(톡).
 * 뼈대(높을까 낮을까): 지금 카드가 보이고, 화면 위쪽(⬆ 높다)이나 아래쪽(⬇ 낮다)을 톡 → 다음 카드가 휙 뒤집힌다.
 *   같은 수는 둘 다 맞음. 이 판 카드 더미에 남은 숫자가 아래 띠에 다 보이고, 버튼마다 '맞는 카드 몇 장'이 적혀 있다(확률이 보인다).
 * 더 걸까 멈출까: 맞히면 토끼가 구름을 껑충 — 연속으로 맞힐수록 껑충이 커진다(1칸 → 2칸 → 3칸 → 5칸).
 *   틀리면 마지막으로 깃발을 꽂은 구름까지 '으아아' 미끄럼(쌓은 연속도 사라짐). 토끼를 톡 = 지금 구름에 깃발(대신 껑충이 1칸으로).
 * 와우: 연속이 쌓이면 한 번에 다섯 구름을 날아오르지만, 깃발 없이 높이 오를수록 미끄럼틀이 길어진다 — 깃발 꽂는 순간이 곧 '멈출까'.
 *   깃발을 꽂으면 다음 껑충 크기가 바뀌므로, 어디에 내릴지(바람·먹구름·망원경 구름)도 깃발로 고른다.
 * 판 8개: 목표 = 카드가 다 떨어지기 전에 ⭐ 별 구름까지. 별(쉬운 말) = 별 구름에 닿기 + 판마다 하나씩 늘어나는 조건.
 *   실패(카드가 다 떨어짐) = 하트 -1, 그 판 다시(카드를 새로 섞는다). 하트 셋을 다 잃거나 8판을 마치면 끝.
 * 펼쳐짐(하는 일이 바뀐다): 1 높다·낮다(틀려도 그 자리) → 2 🚩 깃발(미끄럼 시작: 언제 멈출까) → 3 💨 바람 구름(내리면 두 칸 밀림: 어디에 내릴까)
 *   → 4 🃏 조커(무조건 맞는 카드 한 장: 언제 아낄까) → 5 🌩️ 먹구름(깃발 못 꽂음: 깃발 자리를 미리) → 6 🌈 무지개 카드(맞히면 껑충 두 배: 언제 밀어붙일까)
 *   → 7 🔭 망원경 구름(올라서면 다음 카드가 보임: 거기에 내리기) → 8 ⭐ 별나라(전부).
 * 잘하는 봇: 판마다 (높이·깃발·연속·남은 카드·조커·별 조건)의 기댓값 표를 한 번 계산해 두고, 지금 남은 카드로 정확한 확률을 셈해 고른다.
 * 웃음: 토끼 표정(긴장·우쭐·놀람·어질), 미끄럼틀 '으아아', 구름 위 구경꾼 새들이 껑충엔 짹짹, 미끄럼엔 깔깔.
 * 진짜 돈 없음 — 게임 안 별만.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5;
/** 연속 k번째 맞힘(0부터)의 껑충 칸 수 — 4번째부터는 계속 5칸 */
export const JUMP = [1, 2, 3, 5];
const KMAX = JUMP.length - 1;
const STAR_PTS = 100, LEFT_PTS = 5, WIN_PTS = 200;
const RESULT_OK = 170, RESULT_FAIL = 150, NEWS_T = 210, INTRO = 40, THINK = 12;
/** 연출 길이(틱): 카드 뒤집기 · 껑충 · 미끄럼 · 깃발 */
const FLIP = 16, HOP = 26, SLIDE = 40, PLANT = 16, PUSH = 18;

// ───────────────────────────── 판 ─────────────────────────────
export type StarKind = 'noslide' | 'nowind' | 'big' | 'left';
export interface StarDef { k: StarKind; n?: number }
export interface StageDef {
  key: string; name: string; emoji: string; news: string; spot: string; tip: string;
  /** 별 구름 높이 */
  H: number;
  /** 카드 더미: '1'~'9' 보통 카드, 'a'~'i' 무지개 카드(1~9) */
  deck: string;
  /** 높이별 구름: '.' 보통 · 'w' 바람 · 's' 먹구름 · 'o' 망원경 (0 = 땅 구름, H = 별 구름) */
  clouds: string;
  slide: boolean;
  joker: number;
  /** 별 구름에 닿기 다음 별 조건(판마다 하나씩 늘어남) */
  stars: StarDef[];
}
export const STAGES: StageDef[] = [
  { key: 'base', name: '첫 사다리', emoji: '🐰', news: '👆 위를 톡 = 다음 카드가 더 높다, 아래를 톡 = 더 낮다', spot: '', tip: '맞힐수록 껑충이 커져요 — 1칸, 2칸, 3칸, 5칸!', H: 7, deck: '12345678924681357', clouds: '', slide: false, joker: 0, stars: [] },
  { key: 'flag', name: '깃발', emoji: '🚩', news: '🚩 이제 틀리면 깃발까지 미끄럼! 토끼를 톡 = 깃발', spot: '🚩 토끼를 톡 → 여기에 깃발! 틀려도 여기까지만', tip: '아슬아슬한 카드 앞에선 토끼를 톡 — 깃발!', H: 6, deck: '123456789135792', clouds: '', slide: true, joker: 0, stars: [{ k: 'noslide' }] },
  { key: 'wind', name: '바람 구름', emoji: '💨', news: '💨 바람 구름에 내리면 두 칸 아래로 밀려요', spot: '💨 여기 내리면 밀려요 — 깃발로 껑충 크기를 바꿔 넘어가요', tip: '맞히면 어디에 내리는지 보고 깃발을 꽂아요', H: 12, deck: '123456789123789546', clouds: '..w...w..w..', slide: true, joker: 0, stars: [{ k: 'nowind' }, { k: 'left', n: 4 }] },
  { key: 'joker', name: '조커', emoji: '🃏', news: '🃏 조커를 톡 → 다음 카드는 무조건 맞음! 한 장뿐', spot: '🃏 조커는 한 장 — 제일 아슬아슬할 때 톡', tip: '조커는 반반 카드에 아껴 둬요', H: 15, deck: '1234567894455566', clouds: '', slide: true, joker: 1, stars: [{ k: 'noslide' }, { k: 'left', n: 3 }] },
  { key: 'storm', name: '먹구름', emoji: '🌩️', news: '🌩️ 먹구름 위에선 깃발을 못 꽂아요', spot: '🌩️ 먹구름엔 깃발 못 꽂아요 — 들어가기 전에 꽂아요', tip: '먹구름 앞에서 미리 깃발!', H: 13, deck: '12345678911228995', clouds: '...ss...ss...', slide: true, joker: 0, stars: [{ k: 'noslide' }, { k: 'left', n: 4 }] },
  { key: 'rainbow', name: '무지개 카드', emoji: '🌈', news: '🌈 무지개 카드를 맞히면 그 껑충은 두 배!', spot: '🌈 무지개 카드 — 남았을 땐 밀어붙여요', tip: '무지개 카드가 남았으면 밀어붙여요', H: 15, deck: '12345678934567bdfh', clouds: '', slide: true, joker: 0, stars: [{ k: 'noslide' }, { k: 'left', n: 4 }] },
  { key: 'scope', name: '망원경 구름', emoji: '🔭', news: '🔭 망원경 구름에 서면 다음 카드가 보여요', spot: '🔭 여기 서면 다음 카드가 보여요 — 딱 맞춰 내려요', tip: '망원경 구름에 내리도록 깃발로 껑충을 맞춰요', H: 17, deck: '1234567892345678', clouds: '....o....o...o...', slide: true, joker: 0, stars: [{ k: 'noslide' }, { k: 'left', n: 3 }] },
  { key: 'all', name: '별나라', emoji: '⭐', news: '⭐ 바람·먹구름·망원경·무지개·조커 — 전부!', spot: '', tip: '무엇을 아끼고 어디서 멈출지 골라요', H: 19, deck: '1234567891357924ce', clouds: '..w.o..ss..w.o..s..', slide: true, joker: 1, stars: [{ k: 'noslide' }, { k: 'left', n: 2 }] },
];
export const STAGE_COUNT = STAGES.length;
export const starText = (d: StageDef, i: number) => {
  if (i === 0) return '별 구름에 닿기';
  const st = d.stars[i - 1];
  return st.k === 'noslide' ? '한 번도 안 미끄러지기' : st.k === 'nowind' ? '바람 구름 안 밟기' : st.k === 'big' ? '한 번에 다섯 칸 껑충' : `카드 ${st.n}장 남기기`;
};

// ───────────────────────────── 카드 ─────────────────────────────
/** 카드 = 숫자(1~9) + 무지개면 16 */
const RB = 16;
export const val = (c: number) => c & 15;
export const isRb = (c: number) => c >= RB;
const parseDeck = (s: string) => [...s].map((ch) => (ch >= 'a' ? ch.charCodeAt(0) - 96 + RB : Number(ch)));
const cloudAt = (d: StageDef, h: number) => d.clouds[h] ?? '.';

// ───────────────────────────── 시뮬레이션 ─────────────────────────────
export interface Sim {
  deck: number[]; cur: number; h: number; f: number; k: number; jok: number;
  slid: boolean; wind: boolean; big: boolean; guesses: number; done: 0 | 1 | -1;
}
export type Act = 'hi' | 'lo' | 'flag' | 'joker';
/** 한 수의 결과 (연출용) */
export interface Rec {
  act: Act; card: number; ok: boolean; h0: number; h1: number; h2: number; f: number; jump: number; mult: number;
  wind: boolean; slide: boolean; pair: boolean; k: number; done: 0 | 1 | -1;
}

function shuffled(cards: number[], r: Rng) {
  const a = cards.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function newSim(d: StageDef, r: Rng): Sim {
  const deck = shuffled(parseDeck(d.deck), r);
  // 첫 카드는 무지개가 아닌 것으로(무지개는 뒤집혀 나와야 의미가 있다)
  let i = deck.findIndex((c) => !isRb(c));
  if (i < 0) i = 0;
  const cur = deck.splice(i, 1)[0];
  return { deck, cur, h: 0, f: 0, k: 0, jok: d.joker, slid: false, wind: false, big: false, guesses: 0, done: 0 };
}
export const canFlag = (d: StageDef, S: Sim) => d.slide && S.h > S.f && cloudAt(d, S.h) !== 's';

/** 수 하나를 둔다. 'flag'는 카드를 쓰지 않는다 */
export function apply(d: StageDef, S: Sim, act: Act): Rec | null {
  if (S.done) return null;
  if (act === 'flag') {
    if (!canFlag(d, S)) return null;
    const rec: Rec = { act, card: S.cur, ok: true, h0: S.h, h1: S.h, h2: S.h, f: S.f, jump: 0, mult: 1, wind: false, slide: false, pair: false, k: S.k, done: 0 };
    S.f = S.h;
    S.k = 0;
    return rec;
  }
  if (act === 'joker' && S.jok <= 0) return null;
  if (!S.deck.length) return null;
  const x = S.deck.shift()!, c = S.cur, h0 = S.h, f0 = S.f;
  const ok = act === 'joker' || (act === 'hi' ? val(x) >= val(c) : val(x) <= val(c));
  if (act === 'joker') S.jok--;
  S.guesses++;
  const rec: Rec = { act, card: x, ok, h0, h1: h0, h2: h0, f: f0, jump: 0, mult: 1, wind: false, slide: false, pair: val(x) === val(c), k: 0, done: 0 };
  if (ok) {
    const mult = isRb(x) ? 2 : 1, jump = JUMP[Math.min(S.k, KMAX)] * mult;
    let h = Math.min(d.H, S.h + jump);
    rec.h1 = h;
    if (h < d.H && cloudAt(d, h) === 'w') (h = Math.max(S.f, h - 2)), (rec.wind = true), (S.wind = true);
    if (jump >= 5) S.big = true;
    S.k = Math.min(S.k + 1, KMAX);
    S.h = h;
    if (!d.slide) S.f = h;
    Object.assign(rec, { h2: h, jump, mult });
  } else {
    if (d.slide && S.h > S.f) (S.slid = true), (rec.slide = true);
    S.h = d.slide ? S.f : S.h;
    S.k = 0;
    rec.h1 = rec.h2 = S.h;
  }
  rec.k = S.k;
  S.cur = x;
  if (S.h >= d.H) S.done = 1;
  else if (!S.deck.length) S.done = -1;
  rec.done = S.done;
  return rec;
}
export function starsOf(d: StageDef, S: Sim): boolean[] {
  const out = [S.done === 1];
  for (const st of d.stars)
    out.push(S.done === 1 && (st.k === 'noslide' ? !S.slid : st.k === 'nowind' ? !S.wind : st.k === 'big' ? S.big : S.deck.length >= (st.n ?? 0)));
  return out;
}
/** 지금 남은 카드로 '높다'·'낮다'가 맞는 카드 수 */
export function counts(S: Sim) {
  let hi = 0, lo = 0, rhi = 0, rlo = 0;
  const v = val(S.cur);
  for (const x of S.deck) {
    if (val(x) >= v) (hi++, isRb(x) && rhi++);
    if (val(x) <= v) (lo++, isRb(x) && rlo++);
  }
  return { hi, lo, rhi, rlo, n: S.deck.length };
}

// ───────────────────────────── 기댓값 표 (잘하는 봇) ─────────────────────────────
/**
 * 판마다 한 번: V[n][j][b][k][h][f] = 남은 카드 n장·조커 j·별 진행 b·연속 k·높이 h·깃발 f에서 끝까지 잘 두면 얻는 값.
 * 다음 카드 확률은 그 판 처음 더미의 평균 모습(지금 카드가 무엇이냐에 따른 맞을 확률)으로 근사한다.
 * 실제로 둘 때는 지금 남은 카드로 정확한 확률을 셈하고, 그 뒤만 이 표로 본다.
 */
interface Table { d: StageDef; N: number; J: number; B: number; H: number; v: Float64Array; sit: { w: number; phi: number; plo: number; rhi: number; rlo: number }[]; rAll: number; bits: Record<StarKind, number> }
const tables = new Map<number, Table>();
const SUCCESS = 100, FAIL = -80;

function bitsOf(d: StageDef) {
  const bits = { noslide: 0, nowind: 0, big: 0, left: 0 } as Record<StarKind, number>;
  let nb = 0;
  for (const st of d.stars) if (st.k !== 'left') bits[st.k] = 1 << nb++;
  return { bits, B: 1 << nb };
}
const tix = (T: Table, n: number, j: number, b: number, k: number, h: number, f: number) => ((((n * (T.J + 1) + j) * T.B + b) * (KMAX + 1) + k) * T.H + h) * T.H + f;
/** 성공 값: 별 하나에 100, 남은 카드 조금 */
function reward(T: Table, n: number, b: number) {
  let v = SUCCESS + n * 2;
  for (const st of T.d.stars) {
    const ok = st.k === 'left' ? n >= (st.n ?? 0) : st.k === 'big' ? !!(b & T.bits.big) : !(b & T.bits[st.k]);
    if (ok) v += 100;
  }
  return v;
}
/** 맞혔을 때: (h,f,k)에서 mult배 껑충 → 다음 상태의 값 (n은 이미 하나 줄인 값) */
function vHit(T: Table, n: number, j: number, b: number, k: number, h: number, f: number, mult: number) {
  const d = T.d, jump = JUMP[k] * mult;
  let h2 = Math.min(T.H, h + jump), b2 = b;
  if (h2 < T.H && cloudAt(d, h2) === 'w') (h2 = Math.max(f, h2 - 2)), (b2 |= T.bits.nowind);
  if (jump >= 5) b2 |= T.bits.big;
  if (h2 >= T.H) return reward(T, n, b2);
  return T.v[tix(T, n, j, b2, Math.min(k + 1, KMAX), h2, d.slide ? f : h2)];
}
function vMiss(T: Table, n: number, j: number, b: number, h: number, f: number) {
  if (!T.d.slide) return T.v[tix(T, n, j, b, 0, h, h)];
  return T.v[tix(T, n, j, h > f ? b | T.bits.noslide : b, 0, f, f)];
}
function table(si: number): Table {
  const hit = tables.get(si);
  if (hit) return hit;
  const d = STAGES[si], cards = parseDeck(d.deck), N = cards.length - 1, J = d.joker, { bits, B } = bitsOf(d), H = d.H;
  // 지금 카드별 맞을 확률(처음 더미 기준)
  const sit: Table['sit'] = [];
  for (let i = 0; i < cards.length; i++) {
    const c = val(cards[i]);
    let phi = 0, plo = 0, rhi = 0, rlo = 0;
    for (let q = 0; q < cards.length; q++) {
      if (q === i) continue;
      const x = cards[q];
      if (val(x) >= c) (phi++, isRb(x) && rhi++);
      if (val(x) <= c) (plo++, isRb(x) && rlo++);
    }
    sit.push({ w: 1 / cards.length, phi: phi / N, plo: plo / N, rhi: rhi / N, rlo: rlo / N });
  }
  const rAll = cards.filter(isRb).length / N;
  const T: Table = { d, N, J, B, H, v: new Float64Array((N + 1) * (J + 1) * B * (KMAX + 1) * H * H), sit, rAll, bits };
  for (let n = 0; n <= N; n++)
    for (let j = 0; j <= J; j++)
      for (let b = 0; b < B; b++)
        for (let k = 0; k <= KMAX; k++)
          for (let h = 0; h < H; h++)
            for (let f = 0; f <= h; f++) {
              if (!d.slide && f !== h) continue;
              if (n === 0) {
                T.v[tix(T, n, j, b, k, h, f)] = FAIL;
                continue;
              }
              const scope = cloudAt(d, h) === 'o';
              // 그대로 / 깃발 꽂고 — 각각 맞힘(보통·두 배)·틀림 값
              const opts: [number, number, number, number][] = [];
              const push = (kk: number, ff: number, bb: number) => opts.push([vHit(T, n - 1, j, bb, kk, h, ff, 1), vHit(T, n - 1, j, bb, kk, h, ff, 2), vMiss(T, n - 1, j, bb, h, ff), j > 0 ? (1 - rAll) * vHit(T, n - 1, j - 1, bb, kk, h, ff, 1) + rAll * vHit(T, n - 1, j - 1, bb, kk, h, ff, 2) : -1e9]);
              push(k, f, b);
              if (d.slide && h > f && cloudAt(d, h) !== 's') push(0, h, b);
              let tot = 0;
              if (scope) {
                // 다음 카드가 보인다: 언제나 맞힘
                let best = -1e9;
                for (const o of opts) best = Math.max(best, (1 - rAll) * o[0] + rAll * o[1]);
                tot = best;
              } else
                for (const s of sit) {
                  let best = -1e9;
                  for (const o of opts) {
                    const hi = (s.phi - s.rhi) * o[0] + s.rhi * o[1] + (1 - s.phi) * o[2];
                    const lo = (s.plo - s.rlo) * o[0] + s.rlo * o[1] + (1 - s.plo) * o[2];
                    best = Math.max(best, hi, lo, o[3]);
                  }
                  tot += s.w * best;
                }
              T.v[tix(T, n, j, b, k, h, f)] = tot;
            }
  tables.set(si, T);
  return T;
}
function bitsNow(T: Table, S: Sim) {
  return (S.slid ? T.bits.noslide : 0) | (S.wind ? T.bits.nowind : 0) | (S.big ? T.bits.big : 0);
}
/** 지금 남은 카드로 정확히 셈한 각 수의 값 (깃발은 '깃발 꽂고 바로 다음 수'로 본다) */
export function evalActs(si: number, S: Sim, peek: number | null) {
  const T = table(si), d = T.d, n = S.deck.length, b = bitsNow(T, S), j = S.jok;
  if (!n) return { hi: -1e9, lo: -1e9, flag: -1e9, joker: -1e9 };
  const c = counts(S), rAll = S.deck.filter(isRb).length / n;
  const q = (k: number, f: number) => {
    const h1 = vHit(T, n - 1, j, b, k, S.h, f, 1), h2 = vHit(T, n - 1, j, b, k, S.h, f, 2), m = vMiss(T, n - 1, j, b, S.h, f);
    let hi: number, lo: number;
    if (peek !== null) {
      const okh = val(peek) >= val(S.cur), okl = val(peek) <= val(S.cur), hv = isRb(peek) ? h2 : h1;
      hi = okh ? hv : m;
      lo = okl ? hv : m;
    } else {
      hi = ((c.hi - c.rhi) * h1 + c.rhi * h2 + (n - c.hi) * m) / n;
      lo = ((c.lo - c.rlo) * h1 + c.rlo * h2 + (n - c.lo) * m) / n;
    }
    const jk = j > 0 ? (peek !== null ? vHit(T, n - 1, j - 1, b, k, S.h, f, isRb(peek) ? 2 : 1) : (1 - rAll) * vHit(T, n - 1, j - 1, b, k, S.h, f, 1) + rAll * vHit(T, n - 1, j - 1, b, k, S.h, f, 2)) : -1e9;
    return { hi, lo, joker: jk };
  };
  const now = q(Math.min(S.k, KMAX), d.slide ? S.f : S.h);
  const fl = canFlag(d, S) ? q(0, S.h) : null;
  return { hi: now.hi, lo: now.lo, joker: now.joker, flag: fl ? Math.max(fl.hi, fl.lo, fl.joker) : -1e9 };
}
export function planAct(si: number, S: Sim, peek: number | null): Act {
  const e = evalActs(si, S, peek);
  let best: Act = e.hi >= e.lo ? 'hi' : 'lo', bv = Math.max(e.hi, e.lo);
  if (e.joker > bv + 0.01) (best = 'joker'), (bv = e.joker);
  if (e.flag > bv + 0.01) best = 'flag';
  return best;
}

// ───────────────────────────── 게임 상태 ─────────────────────────────
interface Ev { t: number; kind: string; x: number; y: number; text?: string; col?: string; v?: number }
/** 지금 벌어지는 연출: 수 하나(카드 뒤집기 → 껑충/미끄럼 → 바람) */
interface Anim { rec: Rec; prev: number; t0: number; land: number; push: number; end: number }
export interface LadderState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'play' | 'anim' | 'result'; pt: number;
  S: Sim; down: boolean; ax: number; ay: number; zone: Zone | ''; taps: number; acts: number; lastAct: number;
  hearts: number; stars: number; got: number; starOk: boolean[]; pts: number; ok: boolean; won: boolean; dead: boolean; tries: number;
  seen: Set<string>; tips: Set<string>; events: Ev[]; news: { text: string; t: number } | null; newsQ: string[]; startT: number; clearT: number;
  anim: Anim | null; cam: number; mood: string; moodT: number; bestK: number; flagT: number; slides: number; idleT: number;
}
type Zone = 'hi' | 'lo' | 'flag' | 'joker' | 'none';

const ev = (s: LadderState, kind: string, x: number, y: number, text?: string, col?: string, v?: number) => s.events.push({ t: s.t, kind, x, y, text, col, v });
function tip(s: LadderState, key: string, text: string) {
  if (s.tips.has(key)) return;
  s.tips.add(key);
  s.newsQ.push(text);
}
function see(s: LadderState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  s.newsQ.push(text);
}
const setMood = (s: LadderState, m: string) => ((s.mood = m), (s.moodT = s.t));

// 화면 배치 (가로 0~1, 세로 0~A)
/** 토끼 발 높이 · 구름 사이 간격 · 토끼 x는 구름 따라 */
const FEET_Y = 0.87, CS = 0.128;
const CARD_X = 0.735, CARD_Y = 0.79, CARD_W = 0.25, CARD_H = 0.33;
/** 위(높다)·아래(낮다) 나누는 선 = 카드 가운데 */
const SPLIT = CARD_Y;
const PILE_X = 0.87, PILE_Y = 0.47;
const JOKER_X = 0.895, JOKER_Y = 1.06;
const HUD_H = 0.075, BAND = 1.255;
/** 새것 스포트라이트가 보이는 때(판 시작 뒤 틱) */
const SPOT0 = 24, SPOT1 = 170;
const HI_Y = 0.2, LO_Y = 1.185;
export const cloudX = (i: number) => (i % 2 ? 0.385 : 0.165) + 0.018 * Math.sin(i * 1.7);
const cloudY = (i: number, cam: number) => FEET_Y - (i - cam) * CS;

function newStage(s: LadderState) {
  const d = STAGES[s.stage];
  s.S = newSim(d, s.rng);
  s.phase = 'play';
  s.pt = 0;
  s.anim = null;
  s.cam = 0;
  s.startT = s.t;
  s.got = 0;
  s.starOk = [];
  s.bestK = 0;
  s.slides = 0;
  setMood(s, 'idle');
  see(s, d.key, d.news);
  ev(s, 'stage', 0.5, 0.6, `${d.emoji} ${s.stage + 1}판 · ${d.name}`, '#fff6d6');
}

function finish(s: LadderState) {
  s.phase = 'result';
  s.pt = 0;
  const d = STAGES[s.stage], S = s.S;
  s.ok = S.done === 1;
  if (s.ok) {
    s.starOk = starsOf(d, S);
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    s.pts += s.got * STAR_PTS + S.deck.length * LEFT_PTS;
    s.clearT = s.t;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    ev(s, 'clear', 0.5, 0.45, s.won ? '별나라 도착! 🎉' : '⭐ 별 구름 도착!', '#fff1a8', s.got);
    setMood(s, 'cheer');
  } else {
    s.hearts--;
    s.tries++;
    ev(s, 'fail', 0.5, 0.6, '카드가 다 떨어졌어요!', '#ffd0c8');
    setMood(s, 'dizzy');
  }
}

/** 손가락 자리 → 무엇을 눌렀나 (게임 좌표 y는 0~A) */
function zoneOf(s: LadderState, x: number, y: number): Zone {
  const d = STAGES[s.stage], S = s.S;
  if (y < HUD_H || y > BAND) return 'none';
  if (S.jok > 0 && Math.abs(x - JOKER_X) < 0.09 && Math.abs(y - JOKER_Y) < 0.105) return 'joker';
  const rx = cloudX(S.h), ry = FEET_Y - 0.075;
  if (Math.hypot(x - rx, y - ry) < 0.105) return d.slide ? 'flag' : 'none';
  return y < SPLIT ? 'hi' : 'lo';
}

function act(s: LadderState, a: Act) {
  const d = STAGES[s.stage], S = s.S, prev = S.cur;
  if (a === 'flag' && !canFlag(d, S)) {
    const why = S.h === S.f ? '여긴 벌써 깃발이 있어요' : '🌩️ 먹구름엔 깃발을 못 꽂아요!';
    ev(s, 'nope', cloudX(S.h), FEET_Y - 0.2, why, '#ffe0d6');
    setMood(s, 'huh');
    return;
  }
  const rec = apply(d, S, a);
  if (!rec) return;
  s.acts++;
  s.lastAct = s.t;
  const t0 = s.t;
  if (a === 'flag') {
    s.anim = { rec, prev, t0, land: t0, push: t0, end: t0 + PLANT };
    s.flagT = t0;
    ev(s, 'flag', cloudX(S.h), FEET_Y - 0.06, '🚩 깃발!', '#ffffff', t0 + 6);
    setMood(s, 'proud');
    s.phase = 'anim';
    return;
  }
  const hop = rec.ok ? HOP + Math.min(5, rec.h1 - rec.h0) * 3 : 12 + (rec.slide ? SLIDE : 0);
  const land = t0 + FLIP + hop, push = rec.wind ? land + PUSH : land;
  s.anim = { rec, prev, t0, land, push, end: push + 8 };
  s.phase = 'anim';
  const rv = t0 + FLIP;
  if (a === 'joker') ev(s, 'joker', CARD_X, CARD_Y, '🃏 조커! 무조건 맞음', '#f3d4ff', t0 + 2);
  if (rec.ok) {
    s.bestK = Math.max(s.bestK, rec.k);
    const big = rec.jump >= 5;
    ev(s, 'hit', CARD_X, CARD_Y - CARD_H / 2 - 0.03, rec.pair ? '짝꿍! 같은 수' : '맞았다!', rec.pair ? '#fff1a8' : '#c8ffd0', rv);
    ev(s, 'jump', cloudX(rec.h1), FEET_Y - (rec.h1 - rec.h0) * CS, rec.mult > 1 ? `🌈 ${rec.jump}칸 껑충!` : big ? `${rec.jump}칸 껑충!!` : `+${rec.jump}칸`, big ? '#ffd166' : '#ffffff', land - 4);
    if (rec.mult > 1) see(s, 'rb-hit', '🌈 무지개 카드! 껑충이 두 배');
    if (rec.wind) ev(s, 'wind', cloudX(rec.h1), FEET_Y - (rec.h1 - rec.h0) * CS, '💨 휘잉~ 밀려요!', '#d6ecff', land + 2);
    if (rec.done === 1) ev(s, 'star', cloudX(d.H), FEET_Y - (d.H - rec.h0) * CS, '', '#ffe066', push);
    setMood(s, big || rec.mult > 1 ? 'smug' : 'happy');
  } else {
    ev(s, 'miss', CARD_X, CARD_Y - CARD_H / 2 - 0.03, '앗! 틀렸다', '#ffb4a8', rv);
    if (rec.slide) {
      s.slides++;
      ev(s, 'slide', cloudX(rec.h0), FEET_Y - 0.12, '으아아아~', '#ffffff', rv + 10);
      tip(s, 'slide', '미끄럼은 깃발까지 — 높이 오르면 토끼를 톡!');
    }
    setMood(s, rec.slide ? 'slide' : 'oops');
  }
}

function animate(s: LadderState) {
  // 카메라: 토끼가 보이는 높이를 부드럽게 따라간다
  const target = rabH(s);
  s.cam += (target - s.cam) * 0.12;
  if (Math.abs(target - s.cam) < 0.002) s.cam = target;
}
/** 토끼가 지금 화면에서 몇 번째 구름 높이에 있나 (연출용, 소수) */
export function rabH(s: LadderState, t = s.t): number {
  const a = s.anim, S = s.S;
  if (!a || a.rec.act === 'flag') return S.h;
  const r = a.rec;
  if (t < a.t0 + FLIP) return r.h0;
  if (r.ok) {
    if (t < a.land) return r.h0 + (r.h1 - r.h0) * ease((t - a.t0 - FLIP) / (a.land - a.t0 - FLIP));
    if (t < a.push) return r.h1 + (r.h2 - r.h1) * ease((t - a.land) / (a.push - a.land));
    return r.h2;
  }
  if (!r.slide) return r.h0;
  const st = a.t0 + FLIP + 12;
  if (t < st) return r.h0;
  return r.h0 + (r.h2 - r.h0) * easeIn((t - st) / (a.land - st));
}
const ease = (q: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, q)), 2.2);
const easeIn = (q: number) => Math.pow(Math.max(0, Math.min(1, q)), 1.6);

export const cloudladder: GameDef<LadderState> = {
  id: 'cloudladder',
  name: '높을까 낮을까 구름 사다리',
  genes: ['highlow', 'pushluck', 'pointer'],
  twist: '맞힐수록 껑충이 1·2·3·5칸으로 커져 한 번에 구름 다섯 개를 날아오르지만, 깃발 없이 높이 갈수록 미끄럼틀이 길어진다 — 토끼를 톡 해 깃발을 꽂는 순간이 곧 "멈출까"이고, 깃발로 껑충 크기를 바꿔 바람·망원경 구름에 내릴 자리까지 고른다',
  rules: ['위를 톡 = 다음 카드가 더 높다, 아래를 톡 = 더 낮다 (같은 수도 맞음).', '맞힐수록 껑충이 커지고, 틀리면 깃발까지 미끄럼 — 토끼를 톡 = 깃발.', '카드가 떨어지기 전에 별 구름까지!'],
  controls: 'touch',
  hint: '위쪽 톡 = 높다 · 아래쪽 톡 = 낮다 · 토끼 톡 = 깃발 / 화살표 + 스페이스, 숫자 1 2 3',
  aspect: A,
  art: {
    concept: '토끼의 구름 사다리 카드 놀이',
    mood: '아침 햇살이 번지는 솜사탕 하늘 — 입체로 부푼 구름 계단을 토끼가 껑충 오르고, 크림색 카드가 휙 뒤집히며, 구름마다 앉은 참새 구경꾼들이 짹짹 응원한다.',
    palette: { bg: '#7fb6e8', ink: '#25324a', muted: '#6f86a8', accent: '#ffb347', hot: '#ff5f6d', soft: '#fff6e6' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'play', pt: 0,
      down: false, ax: 0, ay: 0, zone: '', taps: 0, acts: 0, lastAct: -99,
      hearts: 3, stars: 0, got: 0, starOk: [], pts: 0, ok: false, won: false, dead: false, tries: 0,
      seen: new Set<string>(), tips: new Set<string>(), events: [], news: null, newsQ: [], startT: 0, clearT: 0,
      anim: null, cam: 0, mood: 'idle', moodT: 0, bestK: 0, flagT: -99, slides: 0, idleT: 0,
    } as unknown as LadderState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    const p = inp.pointer ?? null, press = !!p && !s.down;
    if (p) (s.ax = p.x), (s.ay = p.y * A);
    s.down = !!p;
    s.t++;
    s.pt++;
    if (s.newsQ.length && (!s.news || s.t - s.news.t > NEWS_T)) s.news = { text: s.newsQ.shift()!, t: s.t };
    if (s.events.length > 40 || (s.events.length && s.t - s.events[0].t > 240)) s.events = s.events.filter((e) => s.t - e.t < 240);
    animate(s);
    if (s.mood !== 'idle' && s.t - s.moodT > (s.mood === 'dizzy' || s.mood === 'cheer' ? 400 : s.mood === 'slide' ? 90 : 60)) s.mood = 'idle';
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
    if (s.phase === 'anim') {
      if (s.anim && s.t >= s.anim.end) {
        s.anim = null;
        s.idleT = s.t;
        if (s.S.done) finish(s);
        else s.phase = 'play';
      }
      return;
    }
    // play
    s.zone = p ? zoneOf(s, s.ax, s.ay) : '';
    let z: Zone | null = null;
    if (inp.pick !== undefined) z = (['hi', 'lo', 'flag'] as Zone[])[inp.pick] ?? null;
    else if (press) z = zoneOf(s, s.ax, s.ay);
    if (!z || s.t - s.startT < 12) return;
    s.taps++;
    const d = STAGES[s.stage];
    if (z === 'none') {
      if (!d.slide && Math.hypot(s.ax - cloudX(s.S.h), s.ay - FEET_Y + 0.075) < 0.105) ev(s, 'tickle', cloudX(s.S.h), FEET_Y - 0.2, '히히 간지러워!', '#ffffff'), setMood(s, 'happy');
      return;
    }
    if (z === 'flag' && !d.slide) return;
    act(s, z);
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
/** 망원경 구름 위면 다음 카드가 보인다 */
export const peekOf = (s: LadderState) => (cloudAt(STAGES[s.stage], s.S.h) === 'o' && s.S.deck.length ? s.S.deck[0] : null);
const NO: Input = { tap: false, dir: 0, pointer: null };
const zonePt = (s: LadderState, z: Act): Input => {
  const S = s.S;
  const pt = z === 'hi' ? { x: 0.6, y: HI_Y } : z === 'lo' ? { x: 0.6, y: LO_Y } : z === 'flag' ? { x: cloudX(S.h), y: FEET_Y - 0.075 } : { x: JOKER_X, y: JOKER_Y };
  return { tap: false, dir: 0, pointer: { x: pt.x, y: pt.y / A } };
};
/** 사람처럼: 연출이 끝나고 조금 생각한 다음 톡 */
const ready = (s: LadderState) => s.phase === 'play' && !s.down && s.t - s.startT >= INTRO && s.t - s.idleT >= THINK && !s.anim;
/** 잘하는 봇: 기댓값 표 + 지금 남은 카드로 정확한 확률 → 높다·낮다·깃발·조커 중 가장 좋은 수 */
export const cloudladderSmart: Bot<LadderState> = {
  name: '확률 셈하는 토끼',
  act(s) {
    if (!ready(s)) return NO;
    return zonePt(s, planAct(s.stage, s.S, peekOf(s)));
  },
};
/** 버릇 봇: 지금 카드가 5 이하면 높다, 아니면 낮다(남은 카드 안 봄) · 두 번 맞히면 깃발 · 조커는 바로 */
export function habitAct(s: LadderState): Act {
  const d = STAGES[s.stage], S = s.S;
  if (S.jok > 0) return 'joker';
  if (S.k >= 2 && canFlag(d, S)) return 'flag';
  return val(S.cur) <= 5 ? 'hi' : 'lo';
}
export const cloudladderHabit: Bot<LadderState> = {
  name: '버릇: 5 이하면 높다',
  act(s) {
    if (!ready(s)) return NO;
    return zonePt(s, habitAct(s));
  },
};
/** 독립 버릇 봇: 남은 카드 많은 쪽을 고르지만, 깃발은 언제나 세 번 맞힌 뒤에 · 조커는 바로 */
export function habit2Act(s: LadderState): Act {
  const d = STAGES[s.stage], S = s.S;
  if (S.jok > 0) return 'joker';
  if (S.k >= 3 && canFlag(d, S)) return 'flag';
  const pk = peekOf(s);
  if (pk !== null) return val(pk) >= val(S.cur) ? 'hi' : 'lo';
  const c = counts(S);
  return c.hi >= c.lo ? 'hi' : 'lo';
}
export const cloudladderHabit2: Bot<LadderState> = {
  name: '버릇: 세 번 맞히면 꼭 깃발',
  act(s) {
    if (!ready(s)) return NO;
    return zonePt(s, habit2Act(s));
  },
};
const dumbAt = new WeakMap<object, { next: number; until: number; p: { x: number; y: number } }>();
/** 못하는 봇: 아무 때나 화면 아무 데나 톡 */
export const cloudladderRandom: Bot<LadderState> = {
  name: '아무 데나 톡',
  act(s, rng) {
    let m = dumbAt.get(s);
    if (!m) dumbAt.set(s, (m = { next: 20 + Math.floor(rng() * 60), until: -1, p: { x: 0, y: 0 } }));
    if (s.t < m.until) return { tap: false, dir: 0, pointer: m.p };
    if (s.t < m.next) return NO;
    m.next = s.t + 30 + Math.floor(rng() * 90);
    m.until = s.t + 2 + Math.floor(rng() * 4);
    m.p = { x: 0.05 + rng() * 0.9, y: (HUD_H + rng() * (BAND - HUD_H)) / A };
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
/** 숫자 잉크: 낮은 수는 시원한 파랑, 높은 수는 따뜻한 주황 */
const INK = ['', '#2f6fd6', '#3a7be0', '#4f7fd8', '#6a6fd0', '#8a5cc8', '#c2569a', '#df5a63', '#e86a3a', '#e2771c'];
const RAINBOW = ['#ff5f6d', '#ffa94d', '#ffd84d', '#6fd67a', '#4db8ff', '#9b7bff'];

interface CardOpt { flip?: number; glow?: number; dim?: number; peek?: boolean; tilt?: number; shadow?: number }
function drawCard(ctx: CanvasRenderingContext2D, x: number, y: number, cw: number, ch: number, c: number, o: CardOpt, t: number) {
  ctx.save();
  ctx.translate(x, y);
  if (o.tilt) ctx.rotate(o.tilt);
  const fq = o.flip ?? 1, sx = Math.max(0.04, Math.abs(Math.cos((1 - fq) * Math.PI))), back = fq < 0.5;
  const rr = cw * 0.13, th = Math.max(2, ch * 0.045);
  // 그림자
  ctx.fillStyle = `rgba(40,60,110,${o.shadow ?? 0.22})`;
  ctx.beginPath();
  ctx.ellipse(cw * 0.06, ch / 2 + th + ch * 0.05, cw * 0.5 * sx, ch * 0.07, 0, 0, TAU);
  ctx.fill();
  ctx.scale(sx, 1);
  // 두께
  ctx.fillStyle = back ? '#2c4f96' : '#d9c7a3';
  ctx.beginPath();
  ctx.roundRect(-cw / 2, -ch / 2 + th, cw, ch, rr);
  ctx.fill();
  if (o.glow) (ctx.shadowColor = `rgba(255,220,120,${o.glow})`), (ctx.shadowBlur = 16);
  if (back) {
    const g = ctx.createLinearGradient(0, -ch / 2, 0, ch / 2);
    g.addColorStop(0, '#5d8fe0');
    g.addColorStop(1, '#3b64b8');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(-cw / 2, -ch / 2, cw, ch, rr);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-cw / 2 + 3, -ch / 2 + 3, cw - 6, ch - 6, rr * 0.7);
    ctx.stroke();
    // 구름 무늬 + 별
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    for (const [dx, dy, r] of [[-0.14, 0.06, 0.13], [0.02, 0.0, 0.17], [0.17, 0.07, 0.12], [0, 0.1, 0.13]]) (ctx.beginPath(), ctx.arc(dx * cw, dy * ch, r * cw, 0, TAU), ctx.fill());
    ctx.fillStyle = '#ffd84d';
    star(ctx, 0, -ch * 0.22, cw * 0.12);
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    for (let k = 0; k < 6; k++) ctx.fillRect(-cw * 0.38 + hsh(k) * cw * 0.76, -ch * 0.42 + hsh(k + 9) * ch * 0.84, 1.6, 1.6);
  } else {
    const rb = isRb(c), v = val(c);
    const g = ctx.createLinearGradient(0, -ch / 2, 0, ch / 2);
    g.addColorStop(0, '#fffdf6');
    g.addColorStop(1, '#f4e9d4');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(-cw / 2, -ch / 2, cw, ch, rr);
    ctx.fill();
    ctx.shadowBlur = 0;
    if (rb) {
      // 무지개 테두리
      for (let k = 0; k < RAINBOW.length; k++) {
        ctx.strokeStyle = RAINBOW[(k + Math.floor(t / 8)) % RAINBOW.length];
        ctx.lineWidth = Math.max(1.2, cw * 0.022);
        ctx.beginPath();
        const ins = 2 + k * Math.max(1.2, cw * 0.02);
        ctx.roundRect(-cw / 2 + ins, -ch / 2 + ins, cw - ins * 2, ch - ins * 2, Math.max(2, rr - ins * 0.6));
        ctx.stroke();
      }
    } else {
      ctx.strokeStyle = '#d8c39b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(-cw / 2, -ch / 2, cw, ch, rr);
      ctx.stroke();
    }
    // 큰 숫자 + 모서리 숫자
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${Math.max(14, cw * 0.62)}px system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(0,0,0,.08)';
    ctx.fillText(String(v), cw * 0.03, ch * 0.06);
    ctx.fillStyle = INK[v];
    ctx.fillText(String(v), 0, ch * 0.04);
    if (cw > 40) {
      ctx.font = `900 ${Math.max(10, cw * 0.17)}px system-ui, sans-serif`;
      ctx.fillText(String(v), -cw / 2 + cw * 0.15, -ch / 2 + ch * 0.12);
      ctx.save();
      ctx.translate(cw / 2 - cw * 0.15, ch / 2 - ch * 0.12);
      ctx.rotate(Math.PI);
      ctx.fillText(String(v), 0, 0);
      ctx.restore();
      // 숫자만큼 작은 점(세기 쉬움)
      ctx.fillStyle = INK[v];
      ctx.globalAlpha *= 0.55;
      for (let k = 0; k < v; k++) {
        const px = (k % 5 - 2) * cw * 0.1, py = ch * 0.33 + Math.floor(k / 5) * ch * 0.07 - (v > 5 ? ch * 0.035 : 0);
        ctx.beginPath();
        ctx.arc(px, py, Math.max(1.2, cw * 0.025), 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha /= 0.55;
    }
    if (rb && cw > 40) {
      ctx.font = `${Math.max(11, cw * 0.18)}px system-ui`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText('🌈', cw / 2 - cw * 0.17, -ch / 2 + ch * 0.13);
    }
  }
  if (o.dim) {
    ctx.fillStyle = `rgba(60,80,120,${o.dim})`;
    ctx.beginPath();
    ctx.roundRect(-cw / 2, -ch / 2, cw, ch, rr);
    ctx.fill();
  }
  if (o.glow) {
    ctx.strokeStyle = `rgba(255,200,70,${0.5 + 0.5 * o.glow})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-cw / 2 - 1, -ch / 2 - 1, cw + 2, ch + 2, rr + 1);
    ctx.stroke();
  }
  ctx.restore();
}
function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

/** 부푼 구름 하나 (가운데 x, 윗면 y — 토끼가 서는 곳) */
function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, kind: string, t: number, k: number, glow = 0) {
  const bob = Math.sin(t * 0.03 + k * 1.7) * r * 0.025;
  y += bob;
  // 아래 그림자 (멀리 흐릿하게)
  ctx.fillStyle = 'rgba(70,90,160,.13)';
  ctx.beginPath();
  ctx.ellipse(x + r * 0.08, y + r * 0.55, r * 0.95, r * 0.13, 0, 0, TAU);
  ctx.fill();
  const top = kind === 's' ? '#8d93a8' : kind === 'w' ? '#e4f2ff' : kind === 'H' ? '#fff3c4' : kind === 'o' ? '#f4f0ff' : '#ffffff';
  const bot = kind === 's' ? '#555b72' : kind === 'w' ? '#9fc3e6' : kind === 'H' ? '#f0b94a' : kind === 'o' ? '#b9a8e8' : '#c9cff0';
  if (glow) (ctx.shadowColor = `rgba(255,236,150,${glow})`), (ctx.shadowBlur = r * 0.5);
  // 아랫면(두께)
  ctx.fillStyle = bot;
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.2, r * 0.98, r * 0.24, 0, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;
  // 봉긋한 윗면
  const g = ctx.createLinearGradient(0, y - r * 0.45, 0, y + r * 0.3);
  g.addColorStop(0, top);
  g.addColorStop(1, bot);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.08, r * 0.95, r * 0.22, 0, 0, TAU);
  for (const [dx, dy, rr] of [[-0.55, 0.0, 0.32], [-0.18, -0.12, 0.42], [0.25, -0.08, 0.38], [0.62, 0.04, 0.28]]) {
    ctx.moveTo(x + dx * r + rr * r, y + dy * r);
    ctx.arc(x + dx * r, y + dy * r, rr * r, 0, TAU);
  }
  ctx.fill();
  // 윗빛
  ctx.fillStyle = kind === 's' ? 'rgba(255,255,255,.18)' : 'rgba(255,255,255,.75)';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.25, y - r * 0.3, r * 0.22, r * 0.09, -0.2, 0, TAU);
  ctx.fill();
  if (kind === 'w') {
    // 바람 소용돌이
    ctx.strokeStyle = 'rgba(80,140,210,.75)';
    ctx.lineWidth = Math.max(1.5, r * 0.05);
    for (let q = 0; q < 2; q++) {
      const ph = t * 0.12 + q * 2;
      ctx.beginPath();
      ctx.arc(x + (q ? 0.35 : -0.3) * r, y - r * 0.05, r * 0.15, ph, ph + 4.2);
      ctx.stroke();
    }
    for (let q = 0; q < 3; q++) {
      const ox = ((t * 1.6 + q * 23) % 40) / 40;
      ctx.globalAlpha = 1 - ox;
      ctx.beginPath();
      ctx.moveTo(x - r * 1.1 + ox * r * 0.6, y - r * 0.3 + q * r * 0.18);
      ctx.lineTo(x - r * 0.75 + ox * r * 0.6, y - r * 0.3 + q * r * 0.18);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  if (kind === 's') {
    // 번개
    if (Math.floor(t / 7 + k) % 9 === 0) {
      ctx.fillStyle = '#ffe14d';
      ctx.beginPath();
      ctx.moveTo(x + r * 0.05, y + r * 0.25);
      ctx.lineTo(x - r * 0.12, y + r * 0.62);
      ctx.lineTo(x + r * 0.02, y + r * 0.58);
      ctx.lineTo(x - r * 0.08, y + r * 0.9);
      ctx.lineTo(x + r * 0.18, y + r * 0.48);
      ctx.lineTo(x + r * 0.04, y + r * 0.52);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(120,170,255,.55)';
    for (let q = 0; q < 4; q++) {
      const yy = ((t * 0.9 + q * 13 + k * 7) % 22) / 22;
      ctx.fillRect(x - r * 0.6 + q * r * 0.38, y + r * 0.35 + yy * r * 0.5, 1.5, r * 0.1);
    }
  }
}

/** 토끼 (발 x,y · 크기 u) */
function drawRabbit(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, mood: string, t: number, o: { sq?: number; air?: number; tilt?: number; ghost?: boolean; shadowY?: number }) {
  ctx.save();
  if (!o.ghost && o.shadowY !== undefined) {
    const far = Math.max(0, Math.min(1, (o.shadowY - y) / (u * 3)));
    ctx.fillStyle = `rgba(60,70,130,${0.22 * (1 - far * 0.7)})`;
    ctx.beginPath();
    ctx.ellipse(x, o.shadowY + u * 0.02, u * 0.42 * (1 - far * 0.4), u * 0.09, 0, 0, TAU);
    ctx.fill();
  }
  ctx.translate(x, y);
  if (o.tilt) ctx.rotate(o.tilt);
  const sq = o.sq ?? 0;
  ctx.scale(1 + sq * 0.18, 1 - sq * 0.18);
  if (o.ghost) ctx.globalAlpha = 0.35;
  const white = o.ghost ? '#ffffff' : '#fbfbff', shade = '#dcdcef';
  const sweat = mood === 'tense', down = mood === 'dizzy' || mood === 'oops';
  // 귀
  const earA = mood === 'slide' ? Math.sin(t * 0.8) * 0.5 : down ? 0.9 : mood === 'cheer' ? -0.1 + Math.sin(t * 0.3) * 0.1 : Math.sin(t * 0.05) * 0.05;
  for (const sd of [-1, 1]) {
    ctx.save();
    ctx.translate(sd * u * 0.14, -u * 1.25);
    ctx.rotate(sd * (0.18 + earA * (sd > 0 ? 1 : 0.6)));
    ctx.fillStyle = white;
    ctx.beginPath();
    ctx.ellipse(0, -u * 0.3, u * 0.12, u * 0.36, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = shade;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#ffb6c8';
    ctx.beginPath();
    ctx.ellipse(0, -u * 0.28, u * 0.055, u * 0.25, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  // 몸
  const bg = ctx.createRadialGradient(-u * 0.12, -u * 0.6, u * 0.05, 0, -u * 0.45, u * 0.55);
  bg.addColorStop(0, white);
  bg.addColorStop(1, shade);
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.ellipse(0, -u * 0.42, u * 0.4, u * 0.42, 0, 0, TAU);
  ctx.fill();
  // 발
  ctx.fillStyle = white;
  for (const sd of [-1, 1]) (ctx.beginPath(), ctx.ellipse(sd * u * 0.2, -u * 0.04, u * 0.16, u * 0.08, 0, 0, TAU), ctx.fill());
  // 팔
  const up = mood === 'cheer' || mood === 'smug' || (o.air ?? 0) > 0.3 || mood === 'slide';
  for (const sd of [-1, 1]) {
    ctx.save();
    ctx.translate(sd * u * 0.33, -u * 0.55);
    ctx.rotate(sd * (up ? -2.2 + Math.sin(t * 0.4) * 0.2 : 0.4));
    ctx.fillStyle = white;
    ctx.beginPath();
    ctx.ellipse(0, u * 0.12, u * 0.08, u * 0.16, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = shade;
    ctx.stroke();
    ctx.restore();
  }
  // 목도리
  ctx.fillStyle = '#ff6b6b';
  ctx.beginPath();
  ctx.ellipse(0, -u * 0.78, u * 0.3, u * 0.08, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  const flap = Math.sin(t * 0.25) * u * 0.06 + ((o.air ?? 0) > 0 ? u * 0.1 : 0);
  ctx.moveTo(u * 0.12, -u * 0.78);
  ctx.quadraticCurveTo(u * 0.35, -u * 0.7 + flap, u * 0.42, -u * 0.55 + flap);
  ctx.lineTo(u * 0.3, -u * 0.55 + flap);
  ctx.quadraticCurveTo(u * 0.22, -u * 0.68, u * 0.04, -u * 0.74);
  ctx.fill();
  // 머리
  const hg = ctx.createRadialGradient(-u * 0.12, -u * 1.1, u * 0.05, 0, -u * 1.0, u * 0.42);
  hg.addColorStop(0, white);
  hg.addColorStop(1, shade);
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.arc(0, -u * 1.02, u * 0.36, 0, TAU);
  ctx.fill();
  // 볼
  ctx.fillStyle = 'rgba(255,150,170,.55)';
  for (const sd of [-1, 1]) (ctx.beginPath(), ctx.ellipse(sd * u * 0.21, -u * 0.92, u * 0.07, u * 0.045, 0, 0, TAU), ctx.fill());
  // 눈
  const ey = -u * 1.06, ex = u * 0.13;
  ctx.strokeStyle = '#2b2b3a';
  ctx.fillStyle = '#2b2b3a';
  ctx.lineWidth = Math.max(1.4, u * 0.045);
  ctx.lineCap = 'round';
  const blink = mood === 'idle' && Math.floor(t / 4) % 45 === 0;
  for (const sd of [-1, 1]) {
    const cx = sd * ex;
    ctx.beginPath();
    if (mood === 'smug') (ctx.moveTo(cx - u * 0.06, ey + u * 0.01), ctx.lineTo(cx + u * 0.06, ey + u * 0.01), ctx.stroke(), ctx.beginPath(), ctx.arc(cx, ey + u * 0.01, u * 0.055, 0, Math.PI), ctx.fill());
    else if (mood === 'cheer' || mood === 'happy' || mood === 'proud') (ctx.arc(cx, ey + u * 0.03, u * 0.055, Math.PI * 1.1, Math.PI * 1.9), ctx.stroke());
    else if (mood === 'dizzy') {
      for (let a = 0; a < 9; a++) ctx.lineTo(cx + Math.cos(a + t * 0.3) * a * u * 0.008, ey + Math.sin(a + t * 0.3) * a * u * 0.008);
      ctx.stroke();
    } else if (mood === 'slide') (ctx.moveTo(cx - u * 0.05, ey - u * 0.04), ctx.lineTo(cx + u * 0.05 * sd, ey), ctx.lineTo(cx - u * 0.05, ey + u * 0.04), ctx.stroke());
    else if (blink) (ctx.moveTo(cx - u * 0.05, ey), ctx.lineTo(cx + u * 0.05, ey), ctx.stroke());
    else {
      const big = mood === 'oops' || mood === 'huh' ? 1.35 : sweat ? 0.85 : 1;
      ctx.fillStyle = '#ffffff';
      ctx.arc(cx, ey, u * 0.068 * big, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#2b2b3a';
      ctx.beginPath();
      ctx.arc(cx + (sweat ? Math.sin(t * 0.5) * u * 0.01 : 0), ey + u * 0.005, u * 0.05 * (mood === 'oops' ? 0.6 : 1) * big, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx + u * 0.018, ey - u * 0.02, u * 0.017, 0, TAU);
      ctx.fill();
    }
  }
  // 코·입
  ctx.fillStyle = '#ff8fa8';
  ctx.beginPath();
  ctx.ellipse(0, -u * 0.95, u * 0.035, u * 0.025, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#2b2b3a';
  ctx.lineWidth = Math.max(1.2, u * 0.03);
  ctx.beginPath();
  if (mood === 'oops' || mood === 'slide' || mood === 'huh') (ctx.fillStyle = '#7a2b3a'), ctx.ellipse(0, -u * 0.86, u * 0.05, u * (mood === 'slide' ? 0.07 : 0.05), 0, 0, TAU), ctx.fill();
  else if (mood === 'cheer' || mood === 'smug') (ctx.fillStyle = '#7a2b3a'), ctx.arc(0, -u * 0.9, u * 0.07, 0.1, Math.PI - 0.1), ctx.fill();
  else if (sweat) (ctx.moveTo(-u * 0.05, -u * 0.87), ctx.lineTo(-u * 0.02, -u * 0.89), ctx.lineTo(u * 0.02, -u * 0.86), ctx.lineTo(u * 0.05, -u * 0.88), ctx.stroke());
  else (ctx.moveTo(-u * 0.05, -u * 0.9), ctx.quadraticCurveTo(-u * 0.025, -u * 0.86, 0, -u * 0.9), ctx.quadraticCurveTo(u * 0.025, -u * 0.86, u * 0.05, -u * 0.9), ctx.stroke());
  // 식은땀
  if (sweat) {
    ctx.fillStyle = '#8fd0ff';
    const dy = (t * 0.6) % (u * 0.3);
    ctx.beginPath();
    ctx.ellipse(u * 0.33, -u * 1.15 + dy, u * 0.04, u * 0.06, 0, 0, TAU);
    ctx.fill();
  }
  if (mood === 'dizzy') {
    ctx.fillStyle = '#ffd84d';
    for (let k = 0; k < 3; k++) star(ctx, Math.cos(t * 0.15 + k * 2.1) * u * 0.42, -u * 1.5 + Math.sin(t * 0.15 + k * 2.1) * u * 0.1, u * 0.08);
  }
  ctx.restore();
}

/** 구경꾼 참새 */
function drawBird(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, col: string, t: number, k: number, hop: number, flip: boolean) {
  ctx.save();
  ctx.translate(x, y - Math.abs(Math.sin(hop * 0.5)) * u * 0.8 * (hop > 0 ? 1 : 0));
  if (flip) ctx.scale(-1, 1);
  ctx.fillStyle = 'rgba(60,70,130,.18)';
  ctx.beginPath();
  ctx.ellipse(0, u * 0.02, u * 0.4, u * 0.08, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.ellipse(0, -u * 0.45, u * 0.42, u * 0.38, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fff6e0';
  ctx.beginPath();
  ctx.ellipse(u * 0.12, -u * 0.35, u * 0.22, u * 0.22, 0, 0, TAU);
  ctx.fill();
  // 날개
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  ctx.beginPath();
  ctx.ellipse(-u * 0.12, -u * 0.45, u * 0.22, u * 0.14, -0.4 + (hop > 0 ? Math.sin(t * 0.9) * 0.6 : 0), 0, TAU);
  ctx.fill();
  // 꼬리
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(-u * 0.35, -u * 0.5);
  ctx.lineTo(-u * 0.62, -u * 0.72);
  ctx.lineTo(-u * 0.58, -u * 0.42);
  ctx.fill();
  // 부리·눈
  ctx.fillStyle = '#ffb02e';
  ctx.beginPath();
  ctx.moveTo(u * 0.38, -u * 0.55);
  ctx.lineTo(u * 0.56, -u * 0.5);
  ctx.lineTo(u * 0.38, -u * 0.45);
  ctx.fill();
  ctx.fillStyle = '#2b2b3a';
  ctx.beginPath();
  if (Math.floor(t / 5 + k * 3) % 37 === 0) ctx.fillRect(u * 0.14, -u * 0.6, u * 0.12, u * 0.03);
  else ctx.arc(u * 0.2, -u * 0.6, u * 0.055, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawFlag(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, t: number, rise: number) {
  const hgt = u * 1.1 * rise;
  ctx.strokeStyle = '#8a6a4a';
  ctx.lineWidth = Math.max(1.5, u * 0.06);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - hgt);
  ctx.stroke();
  if (rise < 0.3) return;
  ctx.fillStyle = '#ff4f5e';
  ctx.beginPath();
  ctx.moveTo(x, y - hgt);
  for (let k = 0; k <= 6; k++) ctx.lineTo(x + (k / 6) * u * 0.6, y - hgt + Math.sin(t * 0.2 + k * 0.9) * u * 0.05 + (k / 6) * u * 0.05);
  for (let k = 6; k >= 0; k--) ctx.lineTo(x + (k / 6) * u * 0.6, y - hgt + u * 0.38 + Math.sin(t * 0.2 + k * 0.9) * u * 0.05 - (k / 6) * u * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffd84d';
  ctx.beginPath();
  ctx.arc(x, y - hgt, u * 0.06, 0, TAU);
  ctx.fill();
}

/** 토끼가 지금 화면 어디에 (발 x·y, 공중 정도, 기울기, 찌그러짐) */
function rabPose(s: LadderState, Y: F, t = s.t) {
  const a = s.anim, hv = rabH(s, t), y = Y(cloudY(hv, s.cam));
  let x = cloudX(s.S.h), air = 0, tilt = 0, sq = 0;
  if (a && a.rec.act !== 'flag') {
    const r = a.rec;
    if (t < a.t0 + FLIP) {
      x = cloudX(r.h0);
      sq = r.ok ? 0 : 0;
    } else if (r.ok) {
      if (t < a.land) {
        const q = (t - a.t0 - FLIP) / (a.land - a.t0 - FLIP);
        x = cloudX(r.h0) + (cloudX(r.h1) - cloudX(r.h0)) * ease(q);
        air = Math.sin(Math.PI * Math.min(1, q));
        tilt = Math.sin(q * TAU) * 0.15;
        sq = q < 0.12 ? 0.6 * (1 - q / 0.12) : -0.3 * air;
      } else if (t < a.push) {
        const q = (t - a.land) / (a.push - a.land);
        x = cloudX(r.h1) + (cloudX(r.h2) - cloudX(r.h1)) * q + Math.sin(q * 20) * 0.01;
        tilt = Math.sin(q * 14) * 0.4;
        air = 0.3;
      } else {
        x = cloudX(r.h2);
        sq = Math.max(0, 1 - (t - a.push) / 8) * 0.5;
      }
    } else {
      const st = a.t0 + FLIP + 12;
      if (!r.slide || t < st) {
        x = cloudX(r.h0);
        tilt = t >= a.t0 + FLIP ? Math.sin((t - a.t0) * 0.9) * 0.15 : 0;
      } else {
        const q = Math.min(1, (t - st) / (a.land - st));
        x = slideX(r.h0, r.h2, easeIn(q));
        tilt = -0.9 + Math.sin(t * 0.7) * 0.15;
        air = 0.1;
      }
    }
  }
  return { x, y: y - air * 0, air, tilt, sq, hv };
}
/** 미끄럼틀 곡선: 위 구름 오른쪽에서 시작해 아래 구름으로 휘어 내려온다 */
const slideX = (h0: number, h2: number, q: number) => cloudX(h0) + (cloudX(h2) - cloudX(h0)) * q + Math.sin(Math.PI * q) * 0.16;

const recentSay = new WeakMap<object, { x: number; y: number; t: number }[]>();
function drawAll(ctx: CanvasRenderingContext2D, s: LadderState, w: number, h: number, th: Theme) {
  const fx = juice(s), t = s.t, S = s.S, d = STAGES[s.stage];
  const X: F = (x) => x * w, Y: F = (y) => y * w, R: F = (r) => r * w;
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  ctx.save();
  fx.begin(ctx);
  // ═════════ 하늘 ═════════
  const alt = Math.min(1, s.cam / Math.max(1, d.H));
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, mix('#86bdf2', '#5a78d6', alt));
  sky.addColorStop(0.55, mix('#b9defb', '#9cb8f0', alt));
  sky.addColorStop(1, mix('#ffe3c9', '#f7c9e0', alt));
  ctx.fillStyle = sky;
  ctx.fillRect(-10, -10, w + 20, h + 20);
  // 높이 오르면 낮별
  if (alt > 0.3) {
    ctx.fillStyle = '#ffffff';
    for (let k = 0; k < 26; k++) {
      ctx.globalAlpha = (alt - 0.3) * (0.4 + 0.5 * Math.abs(Math.sin(t / 40 + k)));
      ctx.fillRect(hsh(k + 40) * w, hsh(k + 80) * h * 0.55, 1.6, 1.6);
    }
    ctx.globalAlpha = 1;
  }
  // 해 + 빛 번짐
  {
    const sx = X(0.86), sy = Y(0.36 + alt * 0.1);
    const g = ctx.createRadialGradient(sx, sy, R(0.02), sx, sy, R(0.5));
    g.addColorStop(0, 'rgba(255,250,215,.95)');
    g.addColorStop(0.18, 'rgba(255,236,170,.55)');
    g.addColorStop(1, 'rgba(255,220,160,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,245,200,.25)';
    ctx.lineWidth = R(0.025);
    for (let k = 0; k < 7; k++) {
      const a = t * 0.002 + (k * TAU) / 7;
      ctx.beginPath();
      ctx.moveTo(sx + Math.cos(a) * R(0.09), sy + Math.sin(a) * R(0.09));
      ctx.lineTo(sx + Math.cos(a) * R(0.2), sy + Math.sin(a) * R(0.2));
      ctx.stroke();
    }
    ctx.fillStyle = '#fff4c2';
    ctx.beginPath();
    ctx.arc(sx, sy, R(0.065), 0, TAU);
    ctx.fill();
  }
  // 먼 구름 (천천히 흐르고, 오를수록 아래로 지나감)
  for (let k = 0; k < 9; k++) {
    const sp = 0.25 + (k % 3) * 0.12, yy = ((hsh(k + 1) * 1.7 + s.cam * CS * sp) % 1.7) - 0.15, xx = ((hsh(k + 20) + t * 0.00012 * (1 + (k % 3))) % 1.4) - 0.2;
    ctx.fillStyle = `rgba(255,255,255,${0.32 + 0.12 * (k % 3)})`;
    const rr = R(0.07 + 0.05 * (k % 3));
    ctx.beginPath();
    ctx.ellipse(X(xx), Y(yy), rr * 1.6, rr * 0.45, 0, 0, TAU);
    ctx.arc(X(xx) - rr * 0.5, Y(yy) - rr * 0.15, rr * 0.5, 0, TAU);
    ctx.arc(X(xx) + rr * 0.35, Y(yy) - rr * 0.25, rr * 0.6, 0, TAU);
    ctx.fill();
  }
  // 멀리 지나가는 열기구 구경꾼
  {
    const bx = X(((t * 0.0004 + 0.1) % 1.3) - 0.15), by = Y(0.36 + Math.sin(t * 0.01) * 0.02 + ((s.cam * CS * 0.2) % 0.9));
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#ff9a8b';
    ctx.beginPath();
    ctx.arc(bx, by, R(0.035), 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffd84d';
    ctx.fillRect(bx - R(0.006), by - R(0.035), R(0.012), R(0.07));
    ctx.strokeStyle = 'rgba(120,80,60,.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx - R(0.025), by + R(0.022));
    ctx.lineTo(bx - R(0.012), by + R(0.055));
    ctx.moveTo(bx + R(0.025), by + R(0.022));
    ctx.lineTo(bx + R(0.012), by + R(0.055));
    ctx.stroke();
    ctx.fillStyle = '#a5714a';
    ctx.fillRect(bx - R(0.014), by + R(0.052), R(0.028), R(0.016));
    ctx.globalAlpha = 1;
  }
  // ═════════ 구름 사다리 ═════════
  const lo = Math.max(0, Math.floor(s.cam - 4)), hi = Math.min(d.H, Math.ceil(s.cam + 8));
  const kindOf = (i: number) => (i === d.H ? 'H' : i === 0 ? 'G' : cloudAt(d, i));
  // 구름 사이 징검다리 솜뭉치
  for (let i = lo; i < hi; i++) {
    const x0 = cloudX(i), y0 = cloudY(i, s.cam), x1 = cloudX(i + 1), y1 = cloudY(i + 1, s.cam);
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    for (let q = 1; q < 4; q++) {
      const px = x0 + (x1 - x0) * (q / 4) + 0.06 * Math.sin(q * 1.3 + i), py = y0 + (y1 - y0) * (q / 4) + 0.012;
      ctx.beginPath();
      ctx.arc(X(px), Y(py), R(0.009), 0, TAU);
      ctx.fill();
    }
  }
  const play = s.phase === 'play';
  const J = JUMP[Math.min(S.k, KMAX)], tgt = Math.min(d.H, S.h + J);
  for (let i = hi; i >= lo; i--) {
    const kd = kindOf(i), x = X(cloudX(i)), y = Y(cloudY(i, s.cam));
    if (y < -R(0.2) || y > h + R(0.1)) continue;
    const r = R(kd === 'H' ? 0.15 : kd === 'G' ? 0.16 : 0.105);
    const glow = kd === 'H' ? 0.7 + 0.3 * Math.sin(t * 0.1) : play && i === tgt ? 0.6 : 0;
    if (kd === 'H') {
      // 별 구름 위 무지개
      ctx.lineWidth = R(0.012);
      for (let q = 0; q < RAINBOW.length; q++) {
        ctx.strokeStyle = RAINBOW[q];
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        ctx.arc(x, y + R(0.02), R(0.2) - q * R(0.012), Math.PI * 1.05, Math.PI * 1.95);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    drawCloud(ctx, x, y, r, kd === 'G' ? '.' : kd, t, i, glow);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    const ic = kd === 'w' ? '💨' : kd === 's' ? '🌩️' : kd === 'o' ? '🔭' : '';
    if (ic) (ctx.font = `${Math.max(13, R(0.05))}px system-ui`), ctx.fillText(ic, x + r * 0.78, y - r * 0.38 + Math.sin(t * 0.08 + i) * 2);
    if (kd === 'H') {
      ctx.font = `${Math.max(18, R(0.085))}px system-ui`;
      ctx.fillText('⭐', x, y - R(0.08) + Math.sin(t * 0.07) * 3);
    }
    if (kd === 'G') {
      font(0.03, 900);
      ctx.fillStyle = 'rgba(90,100,150,.7)';
      ctx.fillText('출발', x, y + R(0.035));
    }
    // 높이 눈금 (오른쪽 작은 숫자)
    if (i > 0 && i < d.H && i % 5 === 0) {
      font(0.026, 800);
      ctx.fillStyle = 'rgba(80,100,160,.6)';
      ctx.fillText(`${i}`, x - r * 1.1, y);
    }
  }
  // 깃발
  if (d.slide) {
    const fy = Y(cloudY(S.f, s.cam)), fxp = X(cloudX(S.f) - 0.06);
    if (fy < h + 20) {
      const plant = s.anim && s.anim.rec.act === 'flag' ? Math.min(1, (t - s.anim.t0) / 8) : 1;
      drawFlag(ctx, fxp, fy - R(0.01), R(0.075), t, plant);
    }
  }
  // ═════════ 미리 보기: 맞히면 여기로 / 틀리면 깃발까지 ═════════
  if (play && !S.done) {
    const pk = peekOf(s);
    const tx = X(cloudX(tgt)), ty = Y(cloudY(tgt, s.cam));
    if (ty > Y(HUD_H + 0.06)) {
      ctx.save();
      ctx.setLineDash([5, 5]);
      ctx.lineDashOffset = -t * 0.4;
      ctx.strokeStyle = 'rgba(255,190,60,.95)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(tx, ty + R(0.012), R(0.13), R(0.045), 0, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      if (tgt < d.H) drawRabbit(ctx, tx, ty, R(0.11), 'idle', t, { ghost: true });
      const wind = tgt < d.H && cloudAt(d, tgt) === 'w';
      const label = tgt >= d.H ? '⭐ 맞히면 도착!' : wind ? `💨 +${J}칸 → 밀려요` : `맞히면 +${J}칸`;
      font(0.034, 900);
      const lw = ctx.measureText(label).width + R(0.03), lx = Math.min(w - lw / 2 - 4, Math.max(lw / 2 + 4, tx + R(0.1)));
      ctx.fillStyle = wind ? 'rgba(60,110,190,.88)' : 'rgba(255,150,40,.92)';
      ctx.beginPath();
      ctx.roundRect(lx - lw / 2, ty - R(0.11), lw, R(0.045), R(0.022));
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, lx, ty - R(0.087));
    }
    // 틀리면 깃발까지
    if (d.slide && S.h > S.f && !pk) {
      const x0 = cloudX(S.h), y0 = cloudY(S.h, s.cam), y1 = Math.min(cloudY(S.f, s.cam), BAND - 0.02);
      ctx.save();
      ctx.setLineDash([3, 5]);
      ctx.strokeStyle = 'rgba(255,90,100,.75)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let q = 0; q <= 1.001; q += 0.1) {
        const yy = y0 + (y1 - y0) * q;
        ctx.lineTo(X(x0 + 0.13 + Math.sin(Math.PI * q) * 0.05), Y(yy));
      }
      ctx.stroke();
      ctx.restore();
      const u = S.h - S.f, my = Y((y0 + y1) / 2 + 0.02);
      font(0.03, 900);
      const tx2 = `틀리면 🚩까지 ${u}칸 ↓`, lw = ctx.measureText(tx2).width + R(0.025);
      const lx = X(x0 + 0.16) + lw / 2 - R(0.02);
      ctx.fillStyle = 'rgba(200,50,70,.85)';
      ctx.beginPath();
      ctx.roundRect(lx - lw / 2, my - R(0.02), lw, R(0.04), R(0.02));
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText(tx2, lx, my + 1);
    }
  }
  // ═════════ 미끄럼틀 ═════════
  const a = s.anim;
  if (a && a.rec.slide && t >= a.t0 + FLIP + 4) {
    const r = a.rec, fade = Math.min(1, (a.end + 30 - t) / 20);
    ctx.globalAlpha = Math.max(0, fade);
    const pts: [number, number][] = [];
    for (let q = 0; q <= 1.001; q += 0.05) pts.push([X(slideX(r.h0, r.h2, q)), Y(cloudY(r.h0 + (r.h2 - r.h0) * q, s.cam))]);
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(60,40,100,.25)';
    ctx.lineWidth = R(0.05);
    ctx.beginPath();
    pts.forEach(([px, py]) => ctx.lineTo(px + 3, py + 5));
    ctx.stroke();
    ctx.strokeStyle = '#ff8fb1';
    ctx.lineWidth = R(0.042);
    ctx.beginPath();
    pts.forEach(([px, py]) => ctx.lineTo(px, py));
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = R(0.014);
    ctx.setLineDash([R(0.03), R(0.03)]);
    ctx.lineDashOffset = t * 2;
    ctx.beginPath();
    pts.forEach(([px, py]) => ctx.lineTo(px, py));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineCap = 'butt';
    ctx.globalAlpha = 1;
  }
  // ═════════ 구경꾼 참새 ═════════
  const pose = rabPose(s, Y);
  const birdCols = ['#7ec8ff', '#ffd166', '#ff9fb8'];
  const recent = s.anim ? s.anim.rec : null;
  for (let b = 0; b < 3; b++) {
    const lv = 1 + b * 3 + (s.stage % 2);
    if (lv >= d.H || Math.abs(lv - pose.hv) < 0.6) continue;
    const bx = X(cloudX(lv) + (lv % 2 ? 0.07 : -0.07)), by = Y(cloudY(lv, s.cam)) - R(0.008);
    if (by < Y(HUD_H) || by > h) continue;
    let hop = 0;
    if (recent && recent.ok && s.anim && t > s.anim.t0 + FLIP && t < s.anim.end + 20) hop = t - s.anim.t0;
    if (recent && recent.slide && s.anim && t > s.anim.t0 + FLIP + 10) hop = (t - s.anim.t0) * 1.6;
    if (s.phase === 'result' && s.ok) hop = t - s.pt;
    drawBird(ctx, bx, by, R(0.05), birdCols[b], t, b, hop, X(cloudX(lv)) > X(pose.x) === (b % 2 === 0));
  }
  // ═════════ 토끼 ═════════
  {
    const shadowY = Y(cloudY(Math.round(pose.hv), s.cam));
    const arc = s.anim && s.anim.rec.ok && t >= s.anim.t0 + FLIP && t < s.anim.land ? Math.sin(Math.PI * ((t - s.anim.t0 - FLIP) / (s.anim.land - s.anim.t0 - FLIP))) * R(0.06 + 0.012 * s.anim.rec.jump) : 0;
    const risky = play && d.slide && S.h - S.f >= 3 && Math.max(counts(S).hi, counts(S).lo) / Math.max(1, S.deck.length) < 0.75;
    const mood = s.mood === 'idle' && risky ? 'tense' : s.mood;
    // 껑충 별가루 꼬리
    if (s.anim && s.anim.rec.ok && t >= s.anim.t0 + FLIP && t < s.anim.land) {
      const an = s.anim, jp = an.rec.jump;
      for (let q = 1; q <= 7; q++) {
        const tt = t - q * 2;
        if (tt < an.t0 + FLIP) break;
        const pp = rabPose(s, Y, tt), ar = Math.sin(Math.PI * ((tt - an.t0 - FLIP) / (an.land - an.t0 - FLIP))) * R(0.06 + 0.012 * jp);
        ctx.globalAlpha = (1 - q / 8) * 0.8;
        ctx.fillStyle = an.rec.mult > 1 ? RAINBOW[q % RAINBOW.length] : jp >= 5 ? '#ffd166' : '#fff6c0';
        star(ctx, X(pp.x) + Math.sin(q * 2.3) * R(0.02), pp.y - ar - R(0.07), R(0.012 + 0.003 * Math.min(5, jp)) * (1 - q / 10));
      }
      ctx.globalAlpha = 1;
    }
    drawRabbit(ctx, X(pose.x), pose.y - arc, R(0.14), mood, t, { sq: pose.sq, air: pose.air, tilt: pose.tilt, shadowY });
    // 다음 껑충 크기 배지
    if (S.k > 0 && !S.done && (play || (a && t > a.push))) {
      const hot = ['#ffffff', '#ffe066', '#ffb347', '#ff6b6b'][Math.min(3, S.k)];
      const sz = 0.042 + S.k * 0.008;
      font(sz, 900);
      ctx.textAlign = 'center';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(120,40,20,.55)';
      const bx = X(pose.x) + R(pose.x < 0.3 ? 0.13 : -0.13), by = pose.y - R(0.17) + Math.sin(t * 0.2) * 2;
      ctx.strokeText(`×${JUMP[S.k]}`, bx, by);
      ctx.fillStyle = hot;
      ctx.fillText(`×${JUMP[S.k]}`, bx, by);
      if (S.k >= 2) for (let q = 0; q < S.k; q++) (ctx.fillStyle = hot), ctx.fillRect(bx - R(0.04) + hsh(q + t) * R(0.08), by - R(0.04) + hsh(q * 3 + t) * R(0.06), 2, 2);
    }
  }
  // ═════════ 카드 탁자 ═════════
  drawTable(ctx, s, X, Y, R, font);
  // 누르는 쪽 빛
  if (s.down && play && (s.zone === 'hi' || s.zone === 'lo')) {
    const g = ctx.createLinearGradient(0, s.zone === 'hi' ? Y(HUD_H) : Y(BAND), 0, Y(SPLIT));
    g.addColorStop(0, s.zone === 'hi' ? 'rgba(255,170,60,.28)' : 'rgba(80,150,255,.28)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, s.zone === 'hi' ? Y(HUD_H) : Y(SPLIT), w, s.zone === 'hi' ? Y(SPLIT - HUD_H) : Y(BAND - SPLIT));
  }
  // 가장자리 어둡게
  const vg = ctx.createRadialGradient(w / 2, h * 0.5, R(0.5), w / 2, h * 0.5, R(1.1));
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(30,40,90,.25)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
  // ═════════ 사건 연출 ═════════
  const say = (x: number, y: number, text: string, col: string, size: number) => {
    let rec = recentSay.get(s);
    if (!rec) recentSay.set(s, (rec = []));
    y = Math.max(Y(HUD_H + 0.12), Math.min(Y(BAND - 0.04), y));
    for (let k = 0; k < 6 && rec.some((q) => t - q.t < 40 && Math.abs(q.x - x) < w * 0.3 && Math.abs(q.y - y) < size + 4); k++) y += size + 6;
    rec.push({ x, y, t });
    if (rec.length > 12) rec.shift();
    ctx.font = `800 ${size}px system-ui, sans-serif`;
    const hw = ctx.measureText(text).width / 2 + 6;
    fx.pop(Math.max(hw, Math.min(w - hw, x)), y, text, col, size);
  };
  const seenT = fx.memo.t ?? -1;
  const rx = X(pose.x), ry = pose.y - R(0.12);
  for (const e of s.events) {
    const due = e.v ?? e.t;
    if (due <= seenT || due > t) continue;
    const ex = X(e.x), ey = Y(e.y);
    if (e.kind === 'stage') fx.blink('#fff6d6', 0.2);
    if (e.kind === 'flag') fx.ring(rx, ry + R(0.08), '#ff6b6b', R(0.12), 4), fx.burst(rx - R(0.06), ry, '#ffd84d', 14, 2.6, 2), say(rx, ry - R(0.1), e.text!, e.col!, 17);
    if (e.kind === 'hit') fx.burst(ex, ey + R(0.05), '#c8ffd0', 16, 2.8, 2.2);
    if (e.kind === 'jump') {
      const r2 = s.anim?.rec ?? null, jp = r2 ? r2.jump : 1, big = jp >= 5;
      fx.burst(rx, ry + R(0.1), '#fff3a8', 10 + jp * 4, 2 + jp * 0.5, 2.2);
      fx.ring(rx, ry + R(0.11), big ? '#ffd166' : '#ffffff', R(0.08 + jp * 0.025), 3 + jp * 0.6);
      fx.kick(1.5 + jp * 1.1);
      if (big || (r2 && r2.mult > 1)) {
        fx.blink('#fff2b0', 0.3);
        for (let q = 0; q < RAINBOW.length; q++) fx.burst(rx, ry, RAINBOW[q], 8, 4.5, 2.6);
      }
      if (jp >= 2 && !big && !(r2 && r2.mult > 1)) say(rx + R(0.12), ry - R(0.04), e.text!, e.col!, 16 + Math.min(5, jp) * 3);
      // 가장 가까운 참새가 짹!
      if (jp >= 3) say(X(0.12), ry - R(0.2), '짹짹! 대박!', '#fff6e0', 13);
    }
    if (e.kind === 'wind') fx.burst(rx, ry, '#d6ecff', 18, 3.4, 2.4), fx.kick(3), say(rx + R(0.1), ry, e.text!, e.col!, 16);
    if (e.kind === 'miss') fx.kick(6), fx.blink(th.hot, 0.18), fx.burst(ex, ey + R(0.05), '#ffb4a8', 12, 2.6, 2);
    if (e.kind === 'slide') say(rx + R(0.15), ry, e.text!, e.col!, 20), say(X(0.2), Y(0.5), '깔깔깔', '#fff6e0', 13), fx.kick(3);
    if (e.kind === 'joker') fx.blink('#e6c4ff', 0.3), fx.burst(ex, ey, '#d9a8ff', 22, 3.6, 2.4);
    if (e.kind === 'star') {
      const sx = X(cloudX(d.H)), sy = Y(cloudY(d.H, s.cam)) - R(0.05);
      for (let q = 0; q < RAINBOW.length; q++) fx.burst(sx, sy, RAINBOW[q], 16, 6, 3.2), fx.ring(sx, sy, RAINBOW[q], R(0.12 + q * 0.05), 5);
      fx.kick(8);
      fx.blink('#fff6c8', 0.4);
    }
    if (e.kind === 'clear') fx.burst(X(0.5), Y(0.5), '#ffe066', 40, 6, 3.2), fx.burst(X(0.5), Y(0.5), '#ff8fb1', 30, 5, 3), fx.burst(X(0.5), Y(0.5), '#8fd0ff', 30, 5, 3);
    if (e.kind === 'fail') fx.kick(9), fx.blink(th.hot, 0.22);
    if (e.kind === 'nope' || e.kind === 'tickle') say(ex, ey, e.text!, e.col!, 15), fx.kick(1.5);
  }
  fx.memo.t = t;
  // 결과 화면이 뜨면 떠다니던 글자는 치운다
  if (s.phase === 'result' && fx.memo.res !== s.t - s.pt) (fx.memo.res = s.t - s.pt), (fx.popups = []);
  ctx.restore();
  drawHud(ctx, s, d, w, h, X, Y, R, font);
}

const hex = (c: string) => [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16));
const mix = (a: string, b: string, q: number) => {
  const A1 = hex(a), B1 = hex(b);
  return `rgb(${A1.map((v, i) => Math.round(v + (B1[i] - v) * q)).join(',')})`;
};

/** 카드 탁자: 더미 · 지금 카드 · 날아오는 카드 · 조커 · 높다/낮다 단추 */
function drawTable(ctx: CanvasRenderingContext2D, s: LadderState, X: F, Y: F, R: F, font: (sz: number, w?: number) => void) {
  const t = s.t, S = s.S, a = s.anim, play = s.phase === 'play';
  const flipping = a && a.rec.act !== 'flag' && t < a.t0 + FLIP;
  // 카드 받침 구름
  drawCloud(ctx, X(CARD_X), Y(CARD_Y + CARD_H / 2 + 0.005), R(0.15), '.', t, 99);
  // 더미
  const pk = play ? peekOf(s) : null;
  const n = S.deck.length + (flipping ? 1 : 0), layers = Math.min(6, n), pw = R(0.12), ph = R(0.16);
  for (let k = 0; k < layers; k++) {
    const top = k === layers - 1;
    if (top && flipping) continue;
    drawCard(ctx, X(PILE_X) - k * 1.2, Y(PILE_Y) - k * 2.2, pw, ph, top && pk !== null ? pk : 0, { flip: top && pk !== null ? 1 : 0, shadow: k ? 0.08 : 0.2, glow: top && pk !== null ? 0.6 + 0.3 * Math.sin(t * 0.2) : 0 }, t);
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  font(0.03, 900);
  const lab = pk !== null ? '🔭 다음 카드!' : n ? `남은 ${n}장` : '다 썼어요';
  const lw = ctx.measureText(lab).width + R(0.03);
  ctx.fillStyle = pk !== null ? 'rgba(120,80,200,.9)' : 'rgba(40,60,120,.75)';
  ctx.beginPath();
  ctx.roundRect(X(PILE_X) - lw / 2, Y(PILE_Y + 0.1), lw, R(0.04), R(0.02));
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillText(lab, X(PILE_X), Y(PILE_Y + 0.12) + 1);
  // 지금 카드 (뒤집히는 동안은 이전 카드 위로 새 카드가 날아온다)
  const cw = R(CARD_W), ch = R(CARD_H);
  if (flipping && a) {
    drawCard(ctx, X(CARD_X), Y(CARD_Y), cw, ch, a.prev, {}, t);
    const q = (t - a.t0) / FLIP, e = ease(q);
    const x = PILE_X + (CARD_X - PILE_X) * e, y = PILE_Y + (CARD_Y - PILE_Y) * e - Math.sin(Math.PI * q) * 0.06;
    const sc = 0.5 + 0.5 * e;
    drawCard(ctx, X(x), Y(y), cw * sc, ch * sc, a.rec.card, { flip: q, tilt: (1 - e) * 0.3, glow: a.rec.act === 'joker' ? 0.8 : 0 }, t);
  } else {
    const landQ = a && a.rec.act !== 'flag' ? Math.min(1, (t - a.t0 - FLIP) / 10) : 1;
    const bump = landQ < 1 ? Math.sin(Math.PI * landQ) * 0.06 : 0;
    const res = a && a.rec.act !== 'flag' && t < a.end + 10 ? (a.rec.ok ? 1 : -1) : 0;
    drawCard(ctx, X(CARD_X), Y(CARD_Y), cw * (1 + bump), ch * (1 + bump), S.cur, { glow: res > 0 ? 0.7 : 0, tilt: res < 0 ? Math.sin(t * 0.9) * 0.05 * Math.max(0, 1 - (t - (a?.t0 ?? 0) - FLIP) / 30) : 0 }, t);
    if (res < 0) {
      ctx.strokeStyle = 'rgba(255,80,90,.85)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(X(CARD_X) - cw / 2 - 3, Y(CARD_Y) - ch / 2 - 3, cw + 6, ch + 6, cw * 0.15);
      ctx.stroke();
    }
    // 도장: 맞았다! / 땡!
    if (res && a) {
      const age = t - a.t0 - FLIP, pop = age < 6 ? 1.6 - age * 0.1 : 1;
      const txt = a.rec.act === 'joker' ? '조커!' : res > 0 ? (a.rec.pair ? '짝꿍!' : '맞았다!') : '땡!';
      ctx.save();
      ctx.translate(X(CARD_X), Y(CARD_Y + CARD_H * 0.3));
      ctx.rotate(-0.18);
      ctx.scale(pop, pop);
      font(0.05, 900);
      const tw = ctx.measureText(txt).width + R(0.03);
      ctx.fillStyle = res > 0 ? 'rgba(40,170,90,.92)' : 'rgba(225,60,70,.92)';
      ctx.beginPath();
      ctx.roundRect(-tw / 2, -R(0.03), tw, R(0.06), R(0.012));
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(txt, 0, 1);
      ctx.restore();
    }
  }
  // 위·아래 화살표 (카드 위아래)
  if (play) {
    const bob = Math.sin(t * 0.12) * R(0.006);
    ctx.fillStyle = 'rgba(255,160,50,.9)';
    ctx.beginPath();
    ctx.moveTo(X(CARD_X), Y(CARD_Y - CARD_H / 2 - 0.055) - bob);
    ctx.lineTo(X(CARD_X - 0.04), Y(CARD_Y - CARD_H / 2 - 0.02) - bob);
    ctx.lineTo(X(CARD_X + 0.04), Y(CARD_Y - CARD_H / 2 - 0.02) - bob);
    ctx.fill();
    ctx.fillStyle = 'rgba(70,140,240,.9)';
    ctx.beginPath();
    ctx.moveTo(X(CARD_X), Y(CARD_Y + CARD_H / 2 + 0.085) + bob);
    ctx.lineTo(X(CARD_X - 0.04), Y(CARD_Y + CARD_H / 2 + 0.05) + bob);
    ctx.lineTo(X(CARD_X + 0.04), Y(CARD_Y + CARD_H / 2 + 0.05) + bob);
    ctx.fill();
  }
  // 조커
  const usingJ = a && a.rec.act === 'joker' && t < a.t0 + 10;
  if (S.jok > 0 || usingJ) {
    const q = usingJ && a ? (t - a.t0) / 10 : 0;
    const jx = X(JOKER_X + (CARD_X - JOKER_X) * q), jy = Y(JOKER_Y + (CARD_Y - JOKER_Y) * q);
    const jw = R(0.13), jh = R(0.175);
    ctx.save();
    ctx.translate(jx, jy);
    ctx.rotate(0.12 + Math.sin(t * 0.08) * 0.04);
    if (play) (ctx.shadowColor = 'rgba(210,140,255,.9)'), (ctx.shadowBlur = 10 + 6 * Math.sin(t * 0.15));
    const g = ctx.createLinearGradient(0, -jh / 2, 0, jh / 2);
    g.addColorStop(0, '#b77cff');
    g.addColorStop(1, '#7a45d6');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(-jw / 2, -jh / 2, jw, jh, jw * 0.14);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffe7a8';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = `${Math.max(16, jw * 0.5)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('🃏', 0, -jh * 0.08);
    font(0.028, 900);
    ctx.fillStyle = '#fff2c0';
    ctx.fillText('조커', 0, jh * 0.33);
    ctx.restore();
  }
  // 높다·낮다 단추 (맞는 카드 수가 보인다)
  const c = counts(S), showN = play || (a && a.rec.act !== 'flag' && t >= a.t0 + FLIP + 4);
  for (const side of ['hi', 'lo'] as const) {
    const cy = Y(side === 'hi' ? HI_Y : LO_Y), bw = R(0.74), bh = R(0.088), bx = X(0.5) - bw / 2;
    const k = side === 'hi' ? c.hi : c.lo, pressed = s.down && s.zone === side;
    const sure = pk !== null ? (side === 'hi' ? val(pk) >= val(S.cur) : val(pk) <= val(S.cur)) : null;
    ctx.globalAlpha = play ? 1 : 0.78;
    ctx.fillStyle = 'rgba(40,50,100,.22)';
    ctx.beginPath();
    ctx.roundRect(bx + 2, cy - bh / 2 + 4, bw, bh, bh / 2);
    ctx.fill();
    const g = ctx.createLinearGradient(0, cy - bh / 2, 0, cy + bh / 2);
    g.addColorStop(0, side === 'hi' ? '#ffb04a' : '#5aa2ff');
    g.addColorStop(1, side === 'hi' ? '#ee7414' : '#2c66d8');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(bx, cy - bh / 2 + (pressed ? 2 : 0), bw, bh, bh / 2);
    ctx.fill();
    // 비율 막대
    if (showN && c.n) {
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ctx.beginPath();
      ctx.roundRect(bx + bh * 0.4, cy + bh * 0.24, (bw - bh * 0.8) * (k / c.n), bh * 0.12, bh * 0.06);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineWidth = pressed ? 3 : 1.5;
    ctx.beginPath();
    ctx.roundRect(bx, cy - bh / 2 + (pressed ? 2 : 0), bw, bh, bh / 2);
    ctx.stroke();
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    font(0.05, 900);
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.strokeStyle = side === 'hi' ? 'rgba(130,50,0,.7)' : 'rgba(10,40,120,.7)';
    const lab = side === 'hi' ? '▲ 높다' : '▼ 낮다';
    ctx.strokeText(lab, bx + bh * 0.4, cy - R(0.004));
    ctx.fillText(lab, bx + bh * 0.4, cy - R(0.004));
    ctx.textAlign = 'right';
    font(0.04, 900);
    const txt = !showN ? '…' : sure !== null ? (sure ? '🔭 이쪽이 맞아요!' : '🔭 틀려요') : `${c.n}장 중 ${k}장 맞음`;
    ctx.strokeText(txt, bx + bw - bh * 0.4, cy - R(0.004));
    ctx.fillText(txt, bx + bw - bh * 0.4, cy - R(0.004));
    ctx.globalAlpha = 1;
  }
}

function drawHud(ctx: CanvasRenderingContext2D, s: LadderState, d: StageDef, w: number, h: number, X: F, Y: F, R: F, font: (sz: number, w?: number) => void) {
  const t = s.t, S = s.S, play = s.phase === 'play';
  const hb = R(HUD_H);
  ctx.fillStyle = 'rgba(30,40,90,.82)';
  ctx.fillRect(0, 0, w, hb);
  font(0.04, 900);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff6e0';
  ctx.fillText(`${s.stage + 1}/${STAGES.length}판 · ${d.emoji} ${d.name}`, R(0.03), hb * 0.52);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffd166';
  const stt = `★ ${s.stars}`;
  ctx.fillText(stt, w - R(0.03), hb * 0.52);
  ctx.fillStyle = '#ff6b7d';
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - R(0.06) - ctx.measureText(stt).width, hb * 0.52);
  // 둘째 줄: 남은 높이 · 남은 카드
  {
    const y = Y(HUD_H + 0.04);
    const chips = [`⭐까지 ${Math.max(0, d.H - S.h)}칸`, !d.slide ? `카드 ${S.deck.length}장` : S.h > S.f ? `🚩까지 ${S.h - S.f}칸 아래` : '🚩 깃발 위 · 안전'];
    font(0.033, 900);
    chips.forEach((tx, k) => {
      const tw = ctx.measureText(tx).width + R(0.04), x = k ? w - R(0.03) - tw : R(0.03);
      ctx.fillStyle = 'rgba(30,40,90,.55)';
      ctx.beginPath();
      ctx.roundRect(x, y - R(0.022), tw, R(0.044), R(0.022));
      ctx.fill();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(tx, x + tw / 2, y + 1);
    });
  }
  // 새것 알림
  if (s.news && t - s.news.t < NEWS_T + 20) {
    const age = t - s.news.t, al = Math.min(1, age / 10, (NEWS_T + 20 - age) / 20), drop = Math.max(0, 10 - age) * 2;
    ctx.globalAlpha = al;
    let fs = 0.036;
    font(fs, 900);
    const tx = `✨ ${s.news.text}`;
    while (ctx.measureText(tx).width > w - R(0.06) && fs > 0.028) font((fs -= 0.001), 900);
    const tw = Math.min(w - 8, ctx.measureText(tx).width + 22), by = Y(0.335) - drop;
    ctx.fillStyle = 'rgba(40,50,110,.9)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw / 2, by - R(0.027), tw, R(0.054), R(0.027));
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff6e0';
    ctx.fillText(tx, w / 2, by + 1);
    ctx.globalAlpha = 1;
  }
  // 판 시작 큰 글씨
  {
    const age = t - s.startT;
    if (age < 90 && s.phase !== 'result') {
      const al = Math.min(1, age / 8, (90 - age) / 20), sc = 1 + Math.max(0, 8 - age) * 0.04;
      ctx.globalAlpha = al;
      ctx.save();
      ctx.translate(w / 2, Y(0.5));
      ctx.scale(sc, sc);
      ctx.fillStyle = 'rgba(40,50,120,.55)';
      ctx.beginPath();
      ctx.roundRect(-w * 0.48, -R(0.06), w * 0.96, R(0.16), R(0.04));
      ctx.fill();
      font(0.07, 900);
      ctx.textAlign = 'center';
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(30,40,100,.7)';
      const big = `${d.emoji} ${s.stage + 1}판 · ${d.name}`;
      ctx.strokeText(big, 0, 0);
      ctx.fillStyle = '#fff6e0';
      ctx.fillText(big, 0, 0);
      font(0.04, 800);
      const sub = `⭐ 별 구름까지 ${d.H}칸 · 카드 ${d.deck.length}장`;
      ctx.strokeText(sub, 0, R(0.065));
      ctx.fillText(sub, 0, R(0.065));
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }
  drawSpot(ctx, s, d, w, X, Y, R, font);
  // 큰 껑충(다섯 칸·무지개 두 배): 화면 가운데 큰 글자
  {
    const a = s.anim;
    if (a && a.rec.ok && (a.rec.jump >= 5 || a.rec.mult > 1) && t >= a.land - 12 && t < a.end + 40) {
      const age = t - (a.land - 12), al = Math.min(1, age / 4, (a.end + 40 - t) / 14), sc = age < 8 ? 2.2 - age * 0.15 : 1 + Math.sin(age * 0.3) * 0.03;
      ctx.save();
      ctx.globalAlpha = al;
      ctx.translate(w / 2, Y(0.47));
      ctx.rotate(-0.06);
      ctx.scale(sc, sc);
      const txt = a.rec.mult > 1 ? `🌈 두 배! ${a.rec.jump}칸 껑충!` : `${a.rec.jump}칸 껑충!!`;
      font(0.085, 900);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 7;
      ctx.strokeStyle = 'rgba(140,60,0,.75)';
      ctx.strokeText(txt, 0, 0);
      const gg = ctx.createLinearGradient(0, -R(0.05), 0, R(0.05));
      gg.addColorStop(0, '#fff7c2');
      gg.addColorStop(1, '#ffb52e');
      ctx.fillStyle = gg;
      ctx.fillText(txt, 0, 0);
      ctx.restore();
    }
  }
  // 결과
  if (s.phase === 'result') {
    const age = s.pt, al = Math.min(1, age / 10);
    ctx.globalAlpha = al;
    ctx.fillStyle = s.ok ? 'rgba(40,50,110,.72)' : 'rgba(90,30,50,.72)';
    ctx.beginPath();
    ctx.roundRect(R(0.04), Y(0.4), w - R(0.08), R(0.36), R(0.04));
    ctx.fill();
    ctx.textAlign = 'center';
    font(s.ok ? 0.058 : 0.05, 900);
    ctx.fillStyle = s.ok ? '#fff1a8' : '#ffd0c8';
    ctx.fillText(s.ok ? (s.won ? '별나라 도착! 🎉' : '⭐ 별 구름 도착!') : '카드가 다 떨어졌어요!', w / 2, Y(0.46));
    if (s.ok) {
      const n = 1 + d.stars.length;
      for (let k = 0; k < n; k++) {
        const ag = age - 14 - k * 10, got = s.starOk[k];
        if (ag < 0) continue;
        const sc = got ? 1 + Math.max(0, 1 - ag / 8) * 0.8 : 1;
        font(0.075 * sc, 900);
        ctx.fillStyle = got ? '#ffd166' : 'rgba(255,255,255,.35)';
        ctx.fillText(got ? '★' : '☆', w / 2 + (k - (n - 1) / 2) * R(0.1), Y(0.54));
        if (got && (juice(s).memo['star' + k] ?? -1) < s.clearT) (juice(s).memo['star' + k] = s.clearT), juice(s).burst(w / 2 + (k - (n - 1) / 2) * R(0.1), Y(0.54), '#ffe066', 14, 3, 2.4);
      }
      font(0.034, 800);
      for (let k = 0; k < n; k++) {
        ctx.fillStyle = s.starOk[k] ? '#fff6e0' : 'rgba(255,255,255,.5)';
        ctx.fillText(`${s.starOk[k] ? '★' : '☆'} ${starText(d, k)}`, w / 2, Y(0.605 + k * 0.045));
      }
    } else {
      font(0.042, 800);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(s.hearts > 0 ? '♥ -1 · 카드를 새로 섞어 다시' : '하트를 다 썼어요 — 끝', w / 2, Y(0.55));
      font(0.034, 800);
      ctx.fillStyle = 'rgba(255,255,255,.8)';
      ctx.fillText('어려운 카드 앞에선 토끼를 톡 — 깃발!', w / 2, Y(0.62));
    }
    ctx.globalAlpha = 1;
  }
  // ═════════ 아래 띠: 남은 카드 · 별 조건 · 안내 ═════════
  const by0 = Y(BAND);
  const g = ctx.createLinearGradient(0, by0, 0, h);
  g.addColorStop(0, 'rgba(36,46,104,.92)');
  g.addColorStop(1, 'rgba(24,30,72,.97)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(0, by0, w, h - by0 + 4, [R(0.03), R(0.03), 0, 0]);
  ctx.fill();
  // 남은 카드 줄 (1~9)
  {
    const a = s.anim, flying = a && a.rec.act !== 'flag' && t < a.t0 + FLIP ? a.rec.card : -1;
    const cur = flying >= 0 && a ? val(a.prev) : val(S.cur);
    const cnt = Array(10).fill(0), rb = Array(10).fill(0);
    for (const x of S.deck) (cnt[val(x)]++, isRb(x) && rb[val(x)]++);
    if (flying >= 0) (cnt[val(flying)]++, isRb(flying) && rb[val(flying)]++);
    const mw = R(0.078), mh = R(0.068), y = by0 + R(0.088);
    for (let v = 1; v <= 9; v++) {
      const cx = X(0.06 + (v - 1) * 0.11), side = v > cur ? 'hi' : v < cur ? 'lo' : 'eq';
      ctx.fillStyle = side === 'hi' ? 'rgba(255,160,60,.22)' : side === 'lo' ? 'rgba(90,150,255,.22)' : 'rgba(255,220,90,.3)';
      ctx.beginPath();
      ctx.roundRect(cx - R(0.05), by0 + R(0.01), R(0.1), R(0.112), R(0.02));
      ctx.fill();
      const nn = cnt[v];
      if (!nn) {
        ctx.strokeStyle = 'rgba(255,255,255,.25)';
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(cx - mw / 2, y - mh / 2, mw, mh);
        ctx.setLineDash([]);
        font(0.032, 900);
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,255,255,.3)';
        ctx.fillText(String(v), cx, y + 1);
        continue;
      }
      for (let k = Math.min(3, nn) - 1; k >= 0; k--) {
        const isTopRb = k === 0 && rb[v] > 0;
        drawCard(ctx, cx + k * 1.5, y - k * R(0.012), mw, mh, v + (isTopRb ? RB : 0), { shadow: 0.1 }, t);
      }
      if (nn > 1) {
        font(0.028, 900);
        ctx.textAlign = 'center';
        const bx = cx + mw / 2 - 2, byy = y - mh / 2 - R(0.012) * Math.min(2, nn - 1);
        ctx.fillStyle = '#ff5f6d';
        ctx.beginPath();
        ctx.arc(bx, byy, R(0.019), 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillText(String(nn), bx, byy + 1);
      }
    }
  }
  // 별 조건 (쉬운 말)
  {
    const n = 1 + d.stars.length, cy = Y(BAND + 0.16);
    const live = (k: number): boolean | null => {
      if (s.phase === 'result' && s.ok) return s.starOk[k];
      if (k === 0) return null;
      const st = d.stars[k - 1];
      if (st.k === 'noslide' && S.slid) return false;
      if (st.k === 'nowind' && S.wind) return false;
      if (st.k === 'big' && S.big) return true;
      if (st.k === 'left' && S.deck.length < (st.n ?? 0)) return false;
      return null;
    };
    const items = [...Array(n).keys()].map((k) => ({ txt: starText(d, k), ok: live(k) }));
    let fs = 0.034;
    font(fs, 800);
    const pad = R(0.016), gap = R(0.01);
    const total = () => items.reduce((acc, c) => acc + ctx.measureText(`☆ ${c.txt}`).width + pad * 2, 0) + gap * (n - 1);
    while (total() > w - R(0.03) && fs > 0.026) font((fs -= 0.001), 800);
    let x = (w - total()) / 2;
    for (const c of items) {
      const tx = `${c.ok === true ? '★' : c.ok === false ? '✗' : '☆'} ${c.txt}`, cw2 = ctx.measureText(tx).width + pad * 2;
      ctx.fillStyle = c.ok === true ? 'rgba(255,210,70,.32)' : c.ok === false ? 'rgba(0,0,0,.35)' : 'rgba(255,255,255,.12)';
      ctx.beginPath();
      ctx.roundRect(x, cy - R(0.024), cw2, R(0.048), R(0.024));
      ctx.fill();
      ctx.textAlign = 'center';
      ctx.fillStyle = c.ok === false ? 'rgba(255,255,255,.45)' : '#fff6e0';
      ctx.fillText(tx, x + cw2 / 2, cy + 1);
      x += cw2 + gap;
    }
  }
  // 안내 한 줄
  {
    let line = d.tip;
    const u = S.h - S.f;
    if (s.stage === 0 && s.acts === 0) line = '👆 위를 톡 = 더 높다 · 아래를 톡 = 더 낮다';
    else if (s.phase === 'result') line = s.ok ? '다음 하늘로!' : '같은 판을 다시 — 이번엔 깃발을 꽂으며';
    else if (peekOf(s) !== null) line = '🔭 다음 카드가 보여요 — 맞는 쪽을 톡!';
    else if (d.slide && cloudAt(d, S.h) === 's' && S.h > S.f) line = '🌩️ 먹구름 위 — 여기선 깃발을 못 꽂아요';
    else if (d.slide && u >= 3) line = `깃발 없이 ${u}칸 — 틀리면 미끄럼! 토끼를 톡 = 깃발`;
    else if (S.jok > 0 && s.stage >= 3) line = '🃏 조커는 반반일 때 아껴 써요';
    ctx.textAlign = 'center';
    let fs = 0.035;
    font(fs, 800);
    while (ctx.measureText(line).width > w - R(0.05) && fs > 0.027) font((fs -= 0.001), 800);
    ctx.fillStyle = 'rgba(255,246,224,.92)';
    ctx.fillText(line, w / 2, Y(BAND + 0.215));
  }
  // 첫 판 첫 톡: 손가락
  if (s.stage === 0 && s.acts === 0 && play && t - s.startT > 50) {
    const c = counts(S), up = c.hi >= c.lo;
    const bob = Math.sin(t * 0.15) * R(0.015);
    ctx.font = `${Math.max(18, R(0.08))}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('👆', X(0.86), Y(up ? HI_Y + 0.07 : LO_Y + 0.07) + bob);
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(X(0.13) - 3, Y(up ? HI_Y : LO_Y) - R(0.044) - 3, R(0.74) + 6, R(0.088) + 6, R(0.05));
    ctx.stroke();
  }
  ctx.textBaseline = 'alphabetic';
}

/** 새것 스포트라이트 (판 시작 뒤 잠깐) */
function drawSpot(ctx: CanvasRenderingContext2D, s: LadderState, d: StageDef, w: number, X: F, Y: F, R: F, font: (sz: number, w?: number) => void) {
  if (s.tries || s.phase === 'result' || !d.spot) return;
  const age = s.t - s.startT;
  if (age < SPOT0 || age > SPOT1) return;
  let x = -1, y = -1, rr = 0.12;
  const S = s.S;
  if (d.key === 'flag') (x = rabPose(s, (v) => v).x), (y = FEET_Y - 0.08);
  else if (d.key === 'joker') (x = JOKER_X), (y = JOKER_Y), (rr = 0.11);
  else if (d.key === 'rainbow') (x = 0.5), (y = BAND + 0.07), (rr = 0.16);
  else {
    const want = d.key === 'wind' ? 'w' : d.key === 'storm' ? 's' : 'o';
    for (let i = S.h + 1; i < d.H; i++)
      if (cloudAt(d, i) === want && cloudY(i, s.cam) > HUD_H + 0.12) {
        (x = cloudX(i)), (y = cloudY(i, s.cam));
        break;
      }
  }
  if (x < 0) return;
  const al = Math.min(1, (age - SPOT0) / 10, (SPOT1 - age) / 18), cx = X(x), cy = Y(y), r = R(rr) * (1 + 0.05 * Math.sin(age * 0.2));
  ctx.save();
  ctx.globalAlpha = al;
  ctx.fillStyle = 'rgba(20,30,70,.55)';
  ctx.beginPath();
  ctx.rect(0, R(HUD_H), w, Y(BAND + 0.13) - R(HUD_H));
  if (d.key === 'rainbow') ctx.roundRect(cx - R(0.47), cy - R(0.06), R(0.94), R(0.12), R(0.03));
  else ctx.arc(cx, cy, r, 0, TAU, true);
  ctx.fill('evenodd');
  ctx.strokeStyle = '#fff1a8';
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 6]);
  ctx.lineDashOffset = -age;
  ctx.beginPath();
  if (d.key === 'rainbow') ctx.roundRect(cx - R(0.47), cy - R(0.06), R(0.94), R(0.12), R(0.03));
  else ctx.arc(cx, cy, r, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);
  const label = d.spot;
  let fs = 0.034;
  font(fs, 900);
  while (ctx.measureText(label).width > w - R(0.1) && fs > 0.027) font((fs -= 0.001), 900);
  const tw = ctx.measureText(label).width + R(0.05), ly = y > 0.9 ? cy - r - R(0.07) : cy + r + R(0.06), lx = Math.max(tw / 2 + 4, Math.min(w - tw / 2 - 4, cx));
  ctx.fillStyle = 'rgba(40,60,130,.96)';
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
  const nb = 'NEW!', nw = ctx.measureText(nb).width + R(0.03);
  ctx.fillStyle = '#ff5a6e';
  ctx.beginPath();
  ctx.roundRect(lx - tw / 2 - R(0.01), ly - R(0.055), nw, R(0.04), R(0.02));
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillText(nb, lx - tw / 2 - R(0.01) + nw / 2, ly - R(0.034));
  ctx.restore();
}
