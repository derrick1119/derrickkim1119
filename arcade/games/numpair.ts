/**
 * 너구리 숫자 짝 지우기 (27라운드: 오래 검증된 전략형 캐주얼 뼈대 × 공장의 와우) — 숫자 짝 지우기 × 가리키기(톡) × 콤보.
 * 뼈대: 요즘 잘 팔리는 '숫자 짝 지우기' 퍼즐. 1~9가 줄줄이 적힌 판에서 같은 수이거나 합이 10인 두 수를 지운다.
 *   두 수는 가로·세로·대각선으로 사이에 남은 수 없이 이어져 있거나, 줄 끝과 다음 줄 처음으로 이어져 있어야 한다.
 *   한 줄이 다 비면 그 줄이 쏙 빠지고 아래가 올라온다. 막히면 남은 수를 판 끝에 다시 붙인다(횟수 제한).
 * 조작(기준 9): 주판알을 톡(들어 올림 — 짝이 될 수 있는 알들이 반짝) → 다른 알을 톡(딸깍! 둘 다 튕겨 나감). 톡 두 번이 전부.
 *   같은 알을 다시 톡 = 내려놓기. 아래 ➕ 나무패를 톡 = 다시 붙이기. 키보드는 화살표 커서 + 스페이스.
 * 와우(비틀기): 주판알이 빠진 자리 양옆(줄 따라)의 두 알이 '딸깍' 맞닿는데, 둘이 짝이면 저절로 또 딸깍 — 연쇄!
 *   한 번 톡톡으로 한 줄이 통째로 날아가기도 한다(같은 판도 어느 짝부터 지우느냐로 연쇄가 갈린다).
 * 판 8개: 목표(판 비우기 / 숫자 N개 지우기 / 줄 N개 빼기) · 별 = ★ 목표 · ★ 톡톡(직접 지운 짝) P번 안에 · ★ 다시 붙이기 R번 이하.
 *   더 지울 짝도, 다시 붙이기도 없으면 실패(하트 -1, 그 판 다시).
 * 펼쳐짐(하는 일이 바뀐다): 1판 톡톡·딸깍 연쇄·줄 쏙 → 2판 ➕ 다시 붙이기(언제 쓸까) → 3판 🔒 잠긴 알(옆을 먼저 지워 풀기)
 *   → 4판 🦊 여우 손님 주문(판을 다 비우지 말고 그 숫자만 파내기) → 5판 🌟 황금 알(지우면 판 위 같은 수가 모두 딸깍 — 언제 터뜨릴까)
 *   → 6판 🎯 줄 빼기(줄 N개만 쏙 — 어느 줄을 노릴까) → 7판 🕯️ 촛불(짝 4번마다 다시 붙이기가 하나씩 녹는다) → 8판 🏮 장날(전부).
 * 웃음: 너구리 주인이 딸깍마다 주판을 튕기고, 연쇄엔 안경이 번쩍·꼬리가 부풀고, 막히면 식은땀, 실패하면 주판알을 쏟고 데굴데굴.
 *   창가의 다람쥐·토끼 손님이 연쇄에 박수, 선반 위 고양이는 쏙 소리에 깜짝 놀라 꼬리가 펑.
 */
import { mulberry32, shuffle, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.36;
/** 판의 칸 수 (가로) */
export const COLS = 6;
/** 칸 값: 0 = 빈칸, 1~9 = 숫자 (| LOCK 잠김, | GOLD 황금) */
export const LOCK = 16, GOLD = 32;
const VM = 15;
const STAR_PTS = 100, WIN_PTS = 100;
const RESULT_OK = 170, RESULT_FAIL = 150, NEWS_T = 200;
/** 연쇄 한 단계 연출 간격 · 줄 쏙 연출 길이 */
const STEP_T = 9, SHIFT_T = 14;

// ───────────────────────────── 판 ─────────────────────────────
export type Goal = 'clear' | 'count' | 'rows';
export interface StageDef {
  key: string; name: string; emoji: string; news: string; tip: string;
  goal: Goal;
  /** 처음 알 수 · 다시 붙이기 · 잠긴 알 · 황금 알 · (숫자/줄) 목표 수 · 촛불(짝 K번마다 다시 붙이기 -1) */
  n: number; re: number; locks: number; golds: number; need: number; decay: number;
  /** 판 만들기: 짝을 짝 안에 넣을 확률 · 흩뜨릴 알 수 · ★ 톡톡 = 풀이 + slack · 풀이 길이 목표 */
  nest: number; noise: number; slack: number; parT: number;
}
export const STAGES: StageDef[] = [
  { key: 'basic', name: '첫 주판', emoji: '🌱', news: '🧮 알을 톡 → 반짝이는 짝을 톡하면 딸깍!', tip: '같은 수나 합이 10, 사이가 비어 있으면 짝', goal: 'clear', n: 18, re: 3, locks: 0, golds: 0, need: 0, decay: 0, nest: 0.7, noise: 0, slack: 1, parT: 4 },
  { key: 'readd', name: '다시 붙이기', emoji: '➕', news: '➕ 막히면 다시 붙이기 — 남은 수가 판 끝에 또 붙어요', tip: '➕ 남은 수가 적을 때 붙이면 좋아요', goal: 'clear', n: 18, re: 3, locks: 0, golds: 0, need: 0, decay: 0, nest: 0.55, noise: 2, slack: 1, parT: 7 },
  { key: 'lock', name: '잠긴 알', emoji: '🔒', news: '🔒 잠긴 알 — 바로 옆 알을 지우면 툭 풀려요', tip: '🔒 옆 알부터 지워서 풀어요', goal: 'clear', n: 24, re: 2, locks: 3, golds: 0, need: 0, decay: 0, nest: 0.6, noise: 1, slack: 2, parT: 8 },
  { key: 'order', name: '여우 손님', emoji: '🦊', news: '🦊 여우 손님 주문 — 그 숫자만 N개 지우면 성공!', tip: '🦊 주문한 숫자로 가는 길만 열어요', goal: 'count', n: 30, re: 2, locks: 0, golds: 0, need: 8, decay: 0, nest: 0.6, noise: 1, slack: 2, parT: 6 },
  { key: 'gold', name: '황금 알', emoji: '🌟', news: '🌟 황금 알을 지우면 판 위의 같은 수가 모두 딸깍!', tip: '🌟 황금 알은 언제 터뜨릴지 골라요', goal: 'clear', n: 24, re: 2, locks: 0, golds: 2, need: 0, decay: 0, nest: 0.5, noise: 2, slack: 2, parT: 7 },
  { key: 'rows', name: '줄 빼기', emoji: '🎯', news: '🎯 줄 N개만 쏙 빼면 성공 — 어느 줄을 노릴까?', tip: '🎯 거의 빈 줄부터 노려요', goal: 'rows', n: 36, re: 2, locks: 0, golds: 0, need: 3, decay: 0, nest: 0.6, noise: 2, slack: 2, parT: 7 },
  { key: 'candle', name: '촛불', emoji: '🕯️', news: '🕯️ 짝 4번마다 다시 붙이기가 하나씩 녹아요!', tip: '🕯️ 다시 붙이기가 녹기 전에 길을 열어요', goal: 'clear', n: 24, re: 3, locks: 0, golds: 0, need: 0, decay: 4, nest: 0.5, noise: 2, slack: 2, parT: 8 },
  { key: 'fair', name: '장날', emoji: '🏮', news: '🏮 장날 — 다 나와요!', tip: '🔒 🌟 — 연쇄로 톡톡을 아껴요', goal: 'clear', n: 30, re: 2, locks: 2, golds: 1, need: 0, decay: 0, nest: 0.6, noise: 2, slack: 2, parT: 8 },
];
export const STAGE_COUNT = STAGES.length;

export interface Mv { a: number; b: number }
/** 다시 붙이기 수 */
export const READD: Mv = { a: -1, b: -1 };
export interface Level {
  stage: number; init: number[]; re0: number; goal: Goal; target: number; need: number; decay: number;
  par: number; P: number; R: number; plan: Mv[]; chainMax: number;
  habit: { ok: boolean; stars: number; moves: number; used: number };
  /** 눈앞에서 제일 많이 지우는 버릇(한 수 앞만 보는 욕심쟁이)의 결과 */
  greedy: { ok: boolean; stars: number; moves: number; used: number };
  rnd: number;
}
export interface Sim {
  c: number[]; re: number; used: number; moves: number; rows: number; got: number; dc: number;
  combo: number; chainBest: number; ok: boolean; fail: boolean;
}
export type RE =
  | { k: 'pop'; p: number; v: number; st: number; how: 'pair' | 'chain' | 'gold'; gold: boolean; row: number; col: number }
  | { k: 'unlock'; p: number; st: number; row: number; col: number }
  | { k: 'rows'; gone: number[]; map: number[]; st: number }
  | { k: 'readd'; from: number[]; start: number }
  | { k: 'decay' };

export function newSim(L: Level): Sim {
  return { c: L.init.slice(), re: L.re0, used: 0, moves: 0, rows: 0, got: 0, dc: 0, combo: 0, chainBest: 0, ok: false, fail: false };
}
export const cloneSim = (S: Sim): Sim => ({ ...S, c: S.c.slice() });

export const vOf = (x: number) => x & VM;
const isFree = (x: number) => x !== 0 && !(x & LOCK);
export const matchV = (a: number, b: number) => a === b || a + b === 10;
const pairOK = (x: number, y: number) => isFree(x) && isFree(y) && matchV(x & VM, y & VM);

/** i에서 읽는 순서 뒤쪽 네 방향(줄 따라·아래·오른쪽 아래·왼쪽 아래)으로 처음 만나는 알 */
function fwd(c: number[], i: number, out: number[]) {
  const n = c.length, col = i % COLS;
  out.length = 0;
  for (let j = i + 1; j < n; j++) if (c[j]) { out.push(j); break; }
  for (let j = i + COLS; j < n; j += COLS) if (c[j]) { if (out[0] !== j) out.push(j); break; }
  for (let k = 1, j = i + COLS + 1; j < n && col + k < COLS; k++, j += COLS + 1) if (c[j]) { out.push(j); break; }
  for (let k = 1, j = i + COLS - 1; j < n && col - k >= 0; k++, j += COLS - 1) if (c[j]) { out.push(j); break; }
}
const tmpF: number[] = [];
/** 지금 지울 수 있는 짝 전부 (a < b) */
export function pairsOf(c: number[]): Mv[] {
  const out: Mv[] = [];
  for (let i = 0; i < c.length; i++) {
    if (!isFree(c[i])) continue;
    fwd(c, i, tmpF);
    for (const j of tmpF) if (pairOK(c[i], c[j])) out.push({ a: i, b: j });
  }
  return out;
}
export function hasPair(c: number[]) {
  for (let i = 0; i < c.length; i++) {
    if (!isFree(c[i])) continue;
    fwd(c, i, tmpF);
    for (const j of tmpF) if (pairOK(c[i], c[j])) return true;
  }
  return false;
}
/** a·b가 짝으로 이어져 있나 (순서 무관) */
export function canPair(c: number[], a: number, b: number) {
  if (a === b || a < 0 || b < 0 || a >= c.length || b >= c.length) return false;
  const i = Math.min(a, b), j = Math.max(a, b);
  if (!pairOK(c[i], c[j])) return false;
  fwd(c, i, tmpF);
  return tmpF.includes(j);
}
/** 어떻게 이어졌나 (새것 알림용) */
export function linkKind(c: number[], a: number, b: number): 'side' | 'gap' | 'wrap' | 'vert' | 'diag' {
  const i = Math.min(a, b), j = Math.max(a, b);
  let lin = true;
  for (let k = i + 1; k < j; k++) if (c[k]) { lin = false; break; }
  const ri = (i / COLS) | 0, rj = (j / COLS) | 0;
  if (lin && ri === rj) return j - i === 1 ? 'side' : 'gap';
  if ((j - i) % COLS === 0) return 'vert';
  if (lin) return 'wrap';
  return 'diag';
}

const goalMet = (L: Level, S: Sim) => (L.goal === 'clear' ? S.c.length === 0 : L.goal === 'count' ? S.got >= L.need : S.rows >= L.need);
function check(L: Level, S: Sim) {
  S.ok = goalMet(L, S);
  S.fail = !S.ok && S.re <= 0 && !hasPair(S.c);
}

/**
 * 짝 하나 지우기 (부를 쪽이 canPair 확인). 지운 자리 양옆(줄 따라)이 맞닿아 짝이면 저절로 딸깍(연쇄),
 * 황금 알이 지워지면 판 위의 같은 수가 모두 딸깍, 잠긴 알은 바로 옆이 지워지면 풀린다. 빈 줄은 쏙 빠진다.
 */
const Q: number[] = [], QS: number[] = [], QG: number[] = [];
let maxSt = 0;
function clr(L: Level, S: Sim, p: number, st: number, how: 'pair' | 'chain' | 'gold', rec?: RE[]) {
  const c = S.c, x = c[p];
  c[p] = 0;
  if (L.goal === 'count' && (x & VM) === L.target) S.got++;
  rec?.push({ k: 'pop', p, v: x & VM, st, how, gold: !!(x & GOLD), row: (p / COLS) | 0, col: p % COLS });
  Q.push(p), QS.push(st), QG.push(x & GOLD ? x & VM : 0);
  if (st > maxSt) maxSt = st;
  const col = p % COLS;
  for (let k = 0; k < 4; k++) {
    const nb = k === 0 ? (col > 0 ? p - 1 : -1) : k === 1 ? (col < COLS - 1 ? p + 1 : -1) : k === 2 ? p - COLS : p + COLS;
    if (nb >= 0 && nb < c.length && c[nb] & LOCK) {
      c[nb] &= ~LOCK;
      rec?.push({ k: 'unlock', p: nb, st, row: (nb / COLS) | 0, col: nb % COLS });
    }
  }
}
export function play(L: Level, S: Sim, a: number, b: number, rec?: RE[]) {
  S.moves++;
  const c = S.c;
  let chain = 0;
  Q.length = QS.length = QG.length = 0;
  maxSt = 0;
  clr(L, S, a, 0, 'pair', rec);
  clr(L, S, b, 0, 'pair', rec);
  for (let h = 0; h < Q.length; h++) {
    const p = Q[h], st = QS[h], gv = QG[h];
    if (gv) for (let j = 0; j < c.length; j++) if (isFree(c[j]) && (c[j] & VM) === gv) clr(L, S, j, st + 1, 'gold', rec);
    let l = p - 1, r = p + 1;
    while (l >= 0 && !c[l]) l--;
    while (r < c.length && !c[r]) r++;
    if (l >= 0 && r < c.length && pairOK(c[l], c[r])) {
      chain++;
      clr(L, S, l, st + 1, 'chain', rec);
      clr(L, S, r, st + 1, 'chain', rec);
    }
  }
  // 빈 줄 쏙
  const nr = Math.ceil(c.length / COLS), gone: number[] = [];
  for (let r = nr - 1; r >= 0; r--) {
    let empty = true;
    for (let k = r * COLS; k < Math.min(c.length, (r + 1) * COLS); k++) if (c[k]) { empty = false; break; }
    if (empty) (c.splice(r * COLS, COLS), gone.push(r));
  }
  while (c.length && !c[c.length - 1]) c.pop();
  if (gone.length) {
    S.rows += gone.length;
    if (rec) {
      const map: number[] = [];
      for (let r = 0; r < nr; r++) if (!gone.includes(r)) map.push(r);
      rec.push({ k: 'rows', gone: gone.slice().reverse(), map, st: maxSt + 1 });
    }
  }
  S.combo = chain > 0 || gone.length ? S.combo + 1 : 0;
  if (chain > S.chainBest) S.chainBest = chain;
  if (L.decay) {
    S.dc++;
    if (S.dc >= L.decay) {
      S.dc = 0;
      if (S.re > 0) (S.re--, rec?.push({ k: 'decay' }));
    }
  }
  check(L, S);
  return chain;
}

/** 다시 붙이기: 남은 수를 차례대로 판 끝에 또 붙인다 (잠김·황금은 안 따라온다) */
export function readd(L: Level, S: Sim, rec?: RE[]) {
  const from: number[] = [], add: number[] = [];
  for (let i = 0; i < S.c.length; i++) if (S.c[i]) (from.push(i), add.push(S.c[i] & VM));
  const start = S.c.length;
  for (const x of add) S.c.push(x);
  S.re--;
  S.used++;
  rec?.push({ k: 'readd', from, start });
  check(L, S);
}
export function act(L: Level, S: Sim, m: Mv, rec?: RE[]) {
  if (m.a < 0) readd(L, S, rec);
  else play(L, S, m.a, m.b, rec);
}

export const starsOf = (L: Level, S: Sim) => (S.ok ? 1 + (S.moves <= L.P ? 1 : 0) + (S.used <= L.R ? 1 : 0) : 0);
const live = (c: number[]) => {
  let n = 0;
  for (const x of c) if (x) n++;
  return n;
};

// ───────────────────────────── 풀이 (가중 A*) ─────────────────────────────
/** 남은 일의 어림 (직접 지울 짝 수 쪽으로) */
function heur(L: Level, S: Sim) {
  if (L.goal === 'clear') return live(S.c) / 2;
  if (L.goal === 'count') {
    let rest = 0;
    for (const x of S.c) if ((x & VM) === L.target) rest++;
    return Math.max(0, L.need - S.got) / 2 + Math.max(0, L.need - S.got - rest) * 2;
  }
  const nr = Math.ceil(S.c.length / COLS), cnt: number[] = [];
  for (let r = 0; r < nr; r++) {
    let k = 0;
    for (let j = r * COLS; j < Math.min(S.c.length, (r + 1) * COLS); j++) if (S.c[j]) k++;
    cnt.push(k);
  }
  cnt.sort((x, y) => x - y);
  let h = 0;
  for (let k = 0; k < L.need - S.rows && k < cnt.length; k++) h += cnt[k];
  return h / 2;
}
function keyOf(S: Sim) {
  return String.fromCharCode.apply(null, S.c) + '|' + S.re + ',' + S.dc + ',' + S.got + ',' + S.rows;
}
class Heap<T> {
  a: { f: number; v: T }[] = [];
  push(f: number, v: T) {
    const a = this.a;
    a.push({ f, v });
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p].f <= a[i].f) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop(): T | undefined {
    const a = this.a;
    if (!a.length) return undefined;
    const top = a[0], last = a.pop()!;
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && a[l].f < a[m].f) m = l;
        if (r < a.length && a[r].f < a[m].f) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top.v;
  }
  get size() {
    return this.a.length;
  }
}
interface Node { S: Sim; g: number; mv: Mv | null; up: Node | null }
/** 다시 붙이기 한 번의 값(짝 몇 번어치로 칠까) */
const RW = 3;
export function solve(L: Level, S0: Sim, W: number, budget: number): Mv[] | null {
  if (S0.ok) return [];
  const open = new Heap<Node>(), seen = new Map<string, number>();
  open.push(W * heur(L, S0), { S: S0, g: 0, mv: null, up: null });
  seen.set(keyOf(S0), 0);
  let n = 0;
  while (open.size && n < budget) {
    const nd = open.pop()!;
    n++;
    const S = nd.S;
    if (S.ok) return path(nd);
    const ms = pairsOf(S.c);
    if (S.re > 0 && !ms.length) ms.push(READD);
    for (const m of ms) {
      const S2 = cloneSim(S);
      act(L, S2, m);
      if (S2.fail) continue;
      const g = nd.g + (m.a < 0 ? RW : 1), k = keyOf(S2), prev = seen.get(k);
      if (prev !== undefined && prev <= g) continue;
      seen.set(k, g);
      open.push(g + W * heur(L, S2), { S: S2, g, mv: m, up: nd });
    }
  }
  return null;
}
function path(nd: Node): Mv[] {
  const out: Mv[] = [];
  for (let x: Node | null = nd; x && x.mv; x = x.up) out.push(x.mv);
  return out.reverse();
}
const costOf = (p: Mv[]) => p.reduce((a, m) => a + (m.a < 0 ? RW : 1), 0);
/** 촘촘하게 먼저, 안 되면 느슨하게 */
export function bestPlan(L: Level, S: Sim, big = false): Mv[] | null {
  const tries: [number, number][] = big ? [[0.8, 3000], [1.2, 3000], [2, 4000]] : [[1, 1200], [1.6, 1500], [2.5, 2000]];
  let best: Mv[] | null = null, bc = 1e9;
  for (const [W, budget] of tries) {
    const p = solve(L, cloneSim(S), W, budget);
    if (!p) continue;
    const cost = costOf(p);
    if (cost < bc) (bc = cost), (best = p);
    if (!big) break;
  }
  return best;
}

/** 버릇 하나(측정용): '처음 찾은 짝부터' — 읽는 순서로 훑다가 처음 보이는 짝을 지운다, 없으면 다시 붙이기 */
export function habitPick(S: Sim): Mv | null {
  const c = S.c;
  for (let i = 0; i < c.length; i++) {
    if (!isFree(c[i])) continue;
    fwd(c, i, tmpF);
    for (const j of tmpF) if (pairOK(c[i], c[j])) return { a: i, b: j };
  }
  return S.re > 0 ? READD : null;
}
function habitRun(L: Level) {
  const S = newSim(L);
  for (let g = 0; g < 200 && !S.ok && !S.fail; g++) {
    const m = habitPick(S);
    if (!m) break;
    act(L, S, m);
  }
  return { ok: S.ok, stars: starsOf(L, S), moves: S.moves, used: S.used };
}
/** 두 번째 버릇(측정·판 고르기용): '지금 제일 많이 지우기' — 한 수 앞만 보고 연쇄·쏙이 가장 큰 짝 */
export function greedyPick(L: Level, S: Sim): Mv | null {
  const ms = pairsOf(S.c);
  if (!ms.length) return S.re > 0 ? READD : null;
  let best = ms[0], bv = -1;
  const n0 = live(S.c);
  for (const m of ms) {
    const S2 = cloneSim(S);
    play(L, S2, m.a, m.b);
    const v = (S2.ok ? 1000 : 0) + (n0 - live(S2.c)) + (S2.rows - S.rows) * 3 + (S2.got - S.got) * 4;
    if (v > bv) (bv = v), (best = m);
  }
  return best;
}
function greedyRun(L: Level) {
  const S = newSim(L), plan: Mv[] = [];
  for (let g = 0; g < 200 && !S.ok && !S.fail; g++) {
    const m = greedyPick(L, S);
    if (!m) break;
    plan.push(m);
    act(L, S, m);
  }
  return { ok: S.ok, stars: starsOf(L, S), moves: S.moves, used: S.used, plan };
}
/** 아무 짝이나 지우는 사람이 이 판을 깰 확률 (막히면 다시 붙이기) */
function randomPass(L: Level, r: Rng, n: number) {
  let ok = 0;
  for (let k = 0; k < n; k++) {
    const S = newSim(L);
    for (let g = 0; g < 200 && !S.ok && !S.fail; g++) {
      const ms = pairsOf(S.c);
      if (!ms.length) {
        if (S.re > 0) readd(L, S);
        else break;
      } else {
        const m = ms[Math.floor(r() * ms.length)];
        play(L, S, m.a, m.b);
      }
    }
    if (S.ok) ok++;
  }
  return ok / n;
}

// ───────────────────────────── 판 만들기 ─────────────────────────────
/** 짝을 하나씩 끼워 넣어 만든다: 끼울 때마다 두 알은 맞닿아 있으니, 끼운 순서의 거꾸로 지우면 언제나 풀린다 */
function genSeq(d: StageDef, r: Rng, target: number): number[] {
  const seq: number[] = [];
  while (seq.length < d.n) {
    let a = 1 + Math.floor(r() * 9);
    if (target && r() < 0.22) a = target;
    let b = a === 5 || r() < 0.38 ? a : 10 - a;
    if (target && a === target && r() < 0.5) b = a;
    let k = Math.floor(r() * (seq.length + 1));
    if (seq.length && r() < d.nest) {
      const cand: number[] = [];
      for (let i = 1; i < seq.length; i++) if (matchV(seq[i - 1], seq[i])) cand.push(i);
      if (cand.length) k = cand[Math.floor(r() * cand.length)];
    }
    seq.splice(k, 0, ...(r() < 0.5 ? [a, b] : [b, a]));
  }
  for (let k = 0; k < d.noise; k++) seq[Math.floor(r() * seq.length)] = 1 + Math.floor(r() * 9);
  return seq;
}

function makeLevel(d: StageDef, r: Rng, si: number): Level | null {
  let target = 0;
  if (d.goal === 'count') target = [3, 4, 6, 7, 8, 2][Math.floor(r() * 6)];
  const init = genSeq(d, r, target);
  // 처음부터 한 줄이 통째로 쉽게 빠지는 판은 줄 빼기 판엔 안 쓴다
  const n = init.length;
  // 잠긴 알: 위아래 양옆이 다 있는 자리, 서로 붙지 않게
  if (d.locks) {
    const cand = shuffle([...Array(n).keys()].filter((i) => i % COLS > 0 && i % COLS < COLS - 1 && i >= COLS && i + COLS < n), r);
    let k = 0;
    for (const i of cand) {
      if (k >= d.locks) break;
      if ([i - 1, i + 1, i - COLS, i + COLS].some((j) => init[j] & LOCK)) continue;
      init[i] |= LOCK;
      k++;
    }
    if (k < d.locks) return null;
  }
  if (d.golds) {
    const cand = shuffle([...Array(n).keys()].filter((i) => !(init[i] & LOCK)), r);
    const used = new Set<number>();
    let k = 0;
    for (const i of cand) {
      if (k >= d.golds) break;
      if (used.has(init[i] & VM)) continue;
      used.add(init[i] & VM);
      init[i] |= GOLD;
      k++;
    }
  }
  let need = d.need;
  if (d.goal === 'count') {
    // 주문은 그 숫자 '전부' — 마지막 몇 알은 깊이 묻혀 있어 길을 열 순서가 수가 된다
    const have = init.filter((x) => (x & VM) === target).length;
    if (have < d.need - 1 || have > d.need + 2) return null;
    need = have;
  }
  const L: Level = {
    stage: si, init, re0: d.re, goal: d.goal, target, need, decay: d.decay, par: 0, P: 0, R: 0, plan: [], chainMax: 0,
    habit: { ok: false, stars: 0, moves: 0, used: 0 }, greedy: { ok: false, stars: 0, moves: 0, used: 0 }, rnd: 0,
  };
  // 처음부터 목표가 된 판(줄 빼기)·짝이 하나도 없는 판은 버린다
  const S0 = newSim(L);
  check(L, S0);
  if (S0.ok || !hasPair(S0.c)) return null;
  // 싸게 풀리는지 먼저 (안 풀리는 판은 싸게 버린다), 그다음 촘촘하게 다듬기
  let plan = solve(L, cloneSim(S0), 2, 900);
  if (!plan) return null;
  for (const [W, budget] of [[0.8, 2500], [1.2, 1500]] as [number, number][]) {
    const p = solve(L, cloneSim(S0), W, budget);
    if (p && costOf(p) < costOf(plan)) plan = p;
  }
  setPlan(L, plan, d);
  return L;
}
function replay(L: Level, plan: Mv[]) {
  const S = newSim(L);
  for (const m of plan) act(L, S, m);
  return S;
}
function setPlan(L: Level, plan: Mv[], d: StageDef) {
  const S = newSim(L);
  let cm = 0;
  for (const m of plan) cm = Math.max(cm, m.a < 0 ? (readd(L, S), 0) : play(L, S, m.a, m.b));
  L.plan = plan;
  L.par = S.moves;
  L.P = S.moves + d.slack;
  L.R = S.used;
  L.chainMax = cm;
}

/** 1판: 첫 톡톡에 한 줄이 연쇄로 통째로 날아가게 (손으로 만든 판, 숫자만 섞는다) */
function firstLevel(d: StageDef, r: Rng): Level {
  // 윗줄: a b [x x'] b' a' — 가운데 짝을 지우면 바깥으로 딸깍딸깍 (한 줄 쏙)
  const pick = () => {
    const a = 1 + Math.floor(r() * 9);
    return [a, a === 5 || r() < 0.4 ? a : 10 - a];
  };
  const nest = (k: number) => {
    const out: number[] = [];
    for (let i = 0; i < k; i++) {
      const [a, b] = pick();
      out.splice(i, 0, a, b);
    }
    return out;
  };
  // 여러 판을 만들어 보고 아무렇게나 해도 잘 깨지는 판을 고른다 (첫 판은 거의 못 진다)
  let best: Level | null = null, bv = -1;
  for (let tries = 0, got = 0; tries < 60 && got < 4; tries++) {
    const top = nest(3);
    // 아랫줄들: 짝 둘씩 겹친 덩어리 셋 (조금은 골라야)
    const bot = [...nest(2), ...nest(2), ...nest(2)];
    const init = [...top, ...bot];
    const L: Level = {
      stage: 0, init, re0: d.re, goal: 'clear', target: 0, need: 0, decay: 0, par: 0, P: 0, R: 0, plan: [], chainMax: 0,
      habit: { ok: false, stars: 0, moves: 0, used: 0 }, greedy: { ok: false, stars: 0, moves: 0, used: 0 }, rnd: 0,
    };
    // 첫 수(윗줄 가운데 짝)가 정말 한 줄을 통째로 지우나
    const S = newSim(L);
    if (!canPair(S.c, 2, 3)) continue;
    play(L, S, 2, 3);
    if (S.rows < 1) continue;
    const rest = bestPlan(L, S, true);
    if (!rest) continue;
    setPlan(L, [{ a: 2, b: 3 }, ...rest], d);
    if (L.R > 0) continue;
    got++;
    L.rnd = randomPass(L, r, 24);
    if (L.rnd > bv) (bv = L.rnd), (best = L);
  }
  if (best) return best;
  const init = [2, 7, 5, 5, 3, 8, 1, 9, 6, 4, 9, 1, 3, 3, 7, 7, 8, 2];
  const L: Level = {
    stage: 0, init, re0: d.re, goal: 'clear', target: 0, need: 0, decay: 0, par: 0, P: 0, R: 0, plan: [], chainMax: 0,
    habit: { ok: false, stars: 0, moves: 0, used: 0 }, greedy: { ok: false, stars: 0, moves: 0, used: 0 }, rnd: 0,
  };
  setPlan(L, bestPlan(L, newSim(L), true) ?? [], d);
  return L;
}

const levelCache = new Map<string, Level>();
export function buildLevel(seed: number, stage: number): Level {
  const ck = `${seed}:${stage}`, hit = levelCache.get(ck);
  if (hit) return hit;
  const d = STAGES[stage], r = mulberry32((seed * 31 + stage * 7919 + 17) >>> 0);
  let pick: Level | null = null, bv = -1e9;
  if (stage === 0) {
    pick = firstLevel(d, r);
    pick.habit = habitRun(pick);
  } else {
    const K = stage === 1 ? 5 : 8;
    for (let tries = 0, c = 0; c < K && tries < 50; tries++) {
      const L = makeLevel(d, r, stage);
      if (!L) continue;
      c++;
      // 욕심쟁이가 풀이보다 싸게 풀면 그게 풀이 (별 기준은 언제나 아는 가장 좋은 풀이로)
      const gr = greedyRun(L);
      if (gr.ok && gr.used <= L.R && gr.moves < L.par) setPlan(L, gr.plan, d);
      L.habit = habitRun(L);
      L.greedy = { ok: gr.ok, stars: starsOf(L, replay(L, gr.plan)), moves: gr.moves, used: gr.used };
      let v: number;
      if (stage === 1) {
        L.rnd = randomPass(L, r, 16);
        v = -Math.abs(L.rnd - 0.75) + (L.R === 1 ? 0.3 : 0) - Math.abs(L.par - d.parT) * 0.03;
      } else {
        // 버릇대로 두면 별 셋이 안 나오는 판 (처음 찾은 짝부터 · 눈앞에서 제일 많이 지우기 둘 다)
        // — 무엇을 먼저 할지가 수가 되게, 풀이 길이는 알맞게, 연쇄가 큰 판
        L.rnd = randomPass(L, r, 6);
        v = (L.habit.stars < 3 ? 1 : 0) + (L.greedy.stars < 3 ? 1.5 : 0) + (L.habit.ok ? 0.2 : 0) - Math.abs(L.par - d.parT) * 0.08 + L.rnd * 0.2 + Math.min(4, L.chainMax) * 0.06;
      }
      if (v > bv) (bv = v), (pick = L);
      if (stage >= 2 && bv >= 2.95) break;
    }
  }
  if (!pick) {
    pick = firstLevel(STAGES[0], r);
    pick.habit = habitRun(pick);
  }
  if (levelCache.size > 400) levelCache.clear();
  levelCache.set(ck, pick);
  return pick;
}

// ───────────────────────────── 화면 배치 (가로 0~1, 세로 0~A) ─────────────────────────────
export const PX = 0.15;
const TOP = 0.432, BOT = 0.957, PY0 = 0.105;
export const colX = (col: number) => 0.5 + (col - (COLS - 1) / 2) * PX;
const pitchOf = (rows: number) => (rows <= 6 ? PY0 : (BOT - TOP) / (rows - 1));
export const rowY = (r: number, rows: number) => TOP + r * pitchOf(rows);
const rowsOf = (n: number) => Math.max(1, Math.ceil(n / COLS));
/** ➕ 다시 붙이기 나무패 */
export const RBX = 0.5, RBY = 1.073, RBW = 0.46, RBH = 0.078;

// ───────────────────────────── 상태 ─────────────────────────────
interface Ev { t: number; kind: string; x: number; y: number; text?: string; col?: string; v?: number; n?: number }
/** 튕겨 나가는 알 (그리기용): 지워진 순간의 화면 자리 */
interface Fly { x: number; y: number; v: number; t0: number; gold: boolean; dir: number; how: string; spin: number; n: number }
/** 다시 붙이기로 날아오는 알 */
interface Add { fx: number; fy: number; idx: number; t0: number }
export interface PairState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'play' | 'settle' | 'result'; pt: number;
  L: Level; S: Sim; sel: number; selT: number; lastMv: Mv | null; acts: number;
  down: boolean; ax: number; ay: number; lastTap: number; taps: number; pending: { x: number; y: number } | null;
  busyUntil: number;
  hearts: number; stars: number; got: number; pts: number; ok: boolean; why: string; won: boolean; dead: boolean; tries: number;
  seen: Set<string>; tips: Set<string>; events: Ev[]; news: { text: string; t: number } | null; newsQ: string[]; startT: number; clearT: number;
  mood: string; moodT: number; guest: string; guestT: number; catT: number; flickT: number;
  /** 연출: 튕겨 나간 알 · 줄 쏙 (옛 줄 → 새 줄) · 다시 붙이기로 날아오는 알 · 잠금 풀림 · 빛줄기 */
  fly: Fly[]; shift: { t0: number; map: number[]; rows0: number } | null; gone: { y: number; t0: number; n: number }[]; adds: Add[];
  unl: { x: number; y: number; t0: number }[]; rays: { x: number; y: number; t0: number; n: number; col: string }[];
  /** 판을 비운 순간 주판알 폭죽 */
  confetti: { x: number; y: number; vx: number; vy: number; v: number; t0: number }[];
  chainShow: number; stopUntil: number; comboShow: number; comboT: number;
  /** 이 판을 처음 하는가 (새 장치 스포트라이트는 처음에만) */
  retry: boolean;
}

const ev = (s: PairState, kind: string, x: number, y: number, text?: string, col?: string, v?: number, n?: number) => s.events.push({ t: s.t, kind, x, y, text, col, v, n });
function tip(s: PairState, key: string, text: string) {
  if (s.tips.has(key) || s.newsQ.length) return;
  s.tips.add(key);
  s.newsQ.push(text);
}
function see(s: PairState, key: string, text: string, at?: { x: number; y: number; t: number }) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  // 작은 새것(짝이 이어지는 방향들)은 그 자리에 말풍선으로, 큰 새것은 아래 알림 쪽지로
  if (at) ev(s, 'learn', at.x, at.y, text, '#fff3c4', at.t);
  else s.newsQ.push(text);
}
const setMood = (s: PairState, m: string) => ((s.mood = m), (s.moodT = s.t));
const setGuest = (s: PairState, m: string) => ((s.guest = m), (s.guestT = s.t));

function newStage(s: PairState) {
  const d = STAGES[s.stage];
  s.L = buildLevel(s.seed, s.stage);
  s.S = newSim(s.L);
  s.sel = -1;
  s.lastMv = null;
  s.acts = 0;
  s.pending = null;
  s.busyUntil = s.t;
  s.fly = [];
  s.shift = null;
  s.gone = [];
  s.adds = [];
  s.unl = [];
  s.rays = [];
  s.confetti = [];
  s.chainShow = 0;
  s.stopUntil = -1;
  s.comboShow = 0;
  s.comboT = -99;
  s.retry = s.tips.has('try:' + s.stage);
  s.tips.add('try:' + s.stage);
  s.phase = 'play';
  s.pt = 0;
  s.startT = s.t;
  s.got = 0;
  setMood(s, 'idle');
  setGuest(s, 'wait');
  if (!s.seen.has(d.key)) {
    s.seen.add(d.key);
    s.newsQ.unshift(d.news);
    s.news = null;
  }
  ev(s, 'stage', 0.5, 0.6, `${s.stage + 1}판 · ${d.name}`, '#fff6d6');
}

function finish(s: PairState) {
  s.phase = 'result';
  s.pt = 0;
  const L = s.L, S = s.S;
  if (s.ok) {
    const st = starsOf(L, S);
    s.got = st;
    s.stars += st;
    s.pts += st * STAR_PTS + S.re * 15;
    s.clearT = s.t;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    ev(s, 'clear', 0.5, 0.62, `${STAGES[s.stage].emoji} 성공! ${'★'.repeat(st)}${'☆'.repeat(3 - st)}`, '#fff1a8', st);
    // 주판알 폭죽 (그리기 전용, 결정적인 hsh로만 흩뿌린다)
    for (let k = 0; k < 26; k++) s.confetti.push({ x: 0.1 + 0.8 * hsh(k * 3 + s.stage), y: 1.0, vx: (hsh(k * 7 + 1) - 0.5) * 0.008, vy: -0.014 - 0.012 * hsh(k * 5 + 2), v: 1 + (k % 9), t0: s.t + (k % 5) * 3 });
    setMood(s, 'proud');
    setGuest(s, 'clap');
  } else {
    s.hearts--;
    s.tries++;
    ev(s, 'fail', 0.5, 0.62, s.why, '#ffd0c8');
    ev(s, 'say', 0.8, 0.13, '데굴데굴~ 주판알이!', '#ffe0c8', s.t + 8);
    ev(s, 'say', 0.2, 0.2, 'ㅋㅋㅋ', '#fff3d6', s.t + 18);
    setMood(s, 'dizzy');
    setGuest(s, 'laugh');
  }
}

/** 손가락 자리의 알 (➕ 나무패는 -2, 없으면 -1) */
function pickCell(s: PairState, x: number, y: number) {
  if (Math.abs(x - RBX) < RBW / 2 + 0.02 && Math.abs(y - RBY) < RBH / 2 + 0.02) return -2;
  const c = s.S.c, rows = rowsOf(c.length), py = pitchOf(rows);
  const r = Math.round((y - TOP) / py), col = Math.round((x - colX(0)) / PX);
  if (r < 0 || r >= rows || col < 0 || col >= COLS) return -1;
  if (Math.abs(y - rowY(r, rows)) > py * 0.62 || Math.abs(x - colX(col)) > PX * 0.62) return -1;
  const i = r * COLS + col;
  return i < c.length && c[i] ? i : -1;
}

function tapAt(s: PairState, x: number, y: number) {
  s.taps++;
  s.lastTap = s.t;
  const S = s.S, k = pickCell(s, x, y);
  if (k === -2) return doReadd(s);
  if (k === -1) {
    if (s.sel >= 0) return void ((s.sel = -1), (s.selT = s.t));
    if (y > TOP - 0.05 && y < BOT + 0.05) ev(s, 'miss', x, y, '알을 톡!', '#fff3df');
    return;
  }
  const cx = colX(k % COLS), cy = rowY((k / COLS) | 0, rowsOf(S.c.length));
  if (S.c[k] & LOCK) {
    ev(s, 'nope', cx, cy - 0.05, '🔒 옆 알을 지우면 풀려요', '#ffd8cc');
    tip(s, 'lockTap', '🔒 잠긴 알은 바로 옆(위·아래·양옆) 알이 지워지면 풀려요');
    if (s.sel >= 0) (s.sel = -1), (s.selT = s.t);
    return;
  }
  if (s.sel < 0) return void ((s.sel = k), (s.selT = s.t));
  if (k === s.sel) return void ((s.sel = -1), (s.selT = s.t));
  if (canPair(S.c, s.sel, k)) return doPair(s, s.sel, k);
  // 짝이 아니면 이유를 말하고 그 알을 대신 든다
  const a = vOf(S.c[s.sel]), b = vOf(S.c[k]);
  ev(s, 'nope', cx, cy - 0.05, matchV(a, b) ? '사이가 막혔어요' : `${a}와 ${b}는 짝이 아니에요`, '#ffd8cc');
  if (matchV(a, b)) tip(s, 'blocked', '짝은 사이가 비어 이어져 있어야 해요 (가로·세로·대각선·줄 끝→다음 줄)');
  else tip(s, 'match', '같은 수나 더해서 10이 되는 수끼리 짝이에요');
  setMood(s, 'huh');
  s.sel = k;
  s.selT = s.t;
}

/** 줄 r의 옛 화면 자리 → 새 자리 (줄 쏙 연출) */
function dispRow(s: PairState, r: number, rows: number) {
  const sh = s.shift;
  if (!sh) return rowY(r, rows);
  const u = (s.t - sh.t0) / SHIFT_T, to = rowY(r, rows), from = rowY(sh.map[r] ?? r, sh.rows0);
  if (u <= 0) return from;
  if (u >= 1) return to;
  const e = 1 - Math.pow(1 - u, 3);
  return from + (to - from) * e;
}

/** 연쇄 k단계가 터지는 때: 연쇄가 길수록 한 박자씩 느려진다 (큰 순간엔 슬로) */
export const stepT = (k: number) => k * STEP_T + ((k * (k - 1)) / 2) * 3;

function doPair(s: PairState, a: number, b: number) {
  const L = s.L, S = s.S, rec: RE[] = [];
  const rows0 = rowsOf(S.c.length), kind = linkKind(S.c, a, b);
  const chain = play(L, S, a, b, rec);
  s.acts++;
  s.lastMv = { a, b };
  s.sel = -1;
  s.selT = s.t;
  const t0 = s.t;
  let maxSt = 0, popped = 0, golds = 0, side = 1, lastChainSt = -1, goldShown = false;
  const ax = colX(a % COLS), ay = rowY((a / COLS) | 0, rows0), bx = colX(b % COLS), by = rowY((b / COLS) | 0, rows0);
  for (const e of rec) {
    if (e.k === 'pop') {
      const x = colX(e.col), y = rowY(e.row, rows0), tt = t0 + stepT(e.st);
      // 맞닿는 쪽: 짝은 서로를 향해, 연쇄 두 알은 빈 자리 쪽으로 (앞 알은 오른쪽, 뒤 알은 왼쪽)
      let dir = 0;
      if (e.how === 'pair') dir = e.p === a ? Math.sign(bx - ax) || 1 : Math.sign(ax - bx) || -1;
      else if (e.how === 'chain') (dir = side), (side = -side);
      s.fly.push({ x, y, v: e.v, t0: tt, gold: e.gold, dir, how: e.how, spin: (popped % 2 ? 1 : -1) * (0.12 + 0.05 * e.st), n: e.st });
      popped++;
      if (e.gold) golds++;
      maxSt = Math.max(maxSt, e.st);
      if (e.how === 'chain' && e.st !== lastChainSt) {
        lastChainSt = e.st;
        s.pts += 10 * e.st;
        ev(s, 'chain', x, y, e.st >= 2 ? `딸깍 ×${e.st + 1}!` : '딸깍딸깍!', '#fff1b8', tt, e.st);
        s.rays.push({ x, y, t0: tt, n: e.st, col: BEAD[e.v] });
      }
      if (e.how === 'gold' && !goldShown) (goldShown = true), ev(s, 'goldAll', x, y, `🌟 ${e.v} 모두 딸깍!`, '#ffe27a', tt, e.st);
    } else if (e.k === 'unlock') {
      const x = colX(e.col), y = rowY(e.row, rows0), tt = t0 + stepT(e.st) + 4;
      s.unl.push({ x, y, t0: tt });
      ev(s, 'unlock', x, y, '툭!', '#fff0c8', tt);
      see(s, 'unlock', '🔒 옆 알이 빠지니 잠금이 툭 풀렸어요!');
    } else if (e.k === 'rows') {
      const tt = t0 + stepT(e.st) + 2;
      for (const r of e.gone) s.gone.push({ y: rowY(r, rows0), t0: tt, n: e.gone.length });
      s.shift = { t0: tt + 6, map: e.map, rows0 };
      const n = e.gone.length;
      s.pts += 20 * n * n;
      ev(s, 'rows', 0.5, rowY(e.gone[0], rows0), n >= 3 ? '쏙쏙쏙!!' : n === 2 ? '쏙쏙!' : '쏙!', '#d8fff0', tt, n);
      see(s, 'row', '✨ 한 줄이 다 비면 쏙! 아래 줄이 올라와요');
      if (n >= 2) see(s, 'rows2', '🎉 한 번에 두 줄이 쏙쏙!');
      s.catT = tt;
    } else if (e.k === 'decay') {
      ev(s, 'decay', RBX - 0.16, RBY - 0.05, '🕯️ ➕ 하나가 녹았어요', '#ffd8b0', t0 + 6);
      see(s, 'decayed', '🕯️ 짝 4번마다 ➕ 하나가 녹아요 — 톡톡을 아껴요!');
    }
  }
  s.pts += 10;
  s.chainShow = chain;
  if (chain >= 3) s.stopUntil = t0 + stepT(maxSt) + 10;
  const hasRows = rec.some((e) => e.k === 'rows');
  s.busyUntil = t0 + stepT(maxSt) + (hasRows ? SHIFT_T + 10 : 6);
  s.flickT = t0;
  ev(s, 'pair', (ax + bx) / 2, (ay + by) / 2, '딸깍!', '#fff6e0', t0, 0);
  see(s, 'pair', '🧮 딸깍! 같은 수나 합이 10인 짝을 지웠어요');
  const here = { x: (ax + bx) / 2, y: Math.max(0.42, Math.min(ay, by) - 0.03), t: t0 + 14 };
  if (kind === 'gap') see(s, 'gap', '↔ 빈칸은 건너뛰어 이어져요', here);
  if (kind === 'wrap') see(s, 'wrap', '↩ 줄 끝 → 다음 줄 처음도 이어져요', here);
  if (kind === 'vert') see(s, 'vert', '↕ 세로로도 짝!', here);
  if (kind === 'diag') see(s, 'diag', '↗ 대각선으로도 짝!', here);
  if (chain >= 1) see(s, 'chain', '🔗 빈 자리 양옆이 맞닿아 짝이면 저절로 딸깍 — 연쇄!');
  if (chain >= 3) see(s, 'chain3', '🔥 딸깍 연쇄 ×4 — 톡톡 한 번에 여덟 알!');
  if (golds) see(s, 'goldPop', '🌟 황금 알이 터지면 같은 수가 모두 날아가요');
  if (S.combo >= 2) {
    s.comboShow = S.combo;
    s.comboT = t0 + stepT(maxSt);
    s.pts += 5 * S.combo;
    ev(s, 'combo', 0.86, RBY - 0.055, `콤보 ×${S.combo}`, '#ffb3e6', t0 + stepT(maxSt) + 6, S.combo);
    if (S.combo >= 3) see(s, 'combo', '🔥 연쇄나 쏙이 이어지면 콤보 — 점수가 커져요');
  }
  if (L.goal === 'count' && rec.some((e) => e.k === 'pop' && e.v === L.target)) setGuest(s, 'happy');
  if (chain >= 2 || popped >= 6) (setMood(s, 'wow'), setGuest(s, 'clap'));
  else setMood(s, 'flick');
  if (S.ok) (s.phase = 'settle'), (s.pt = 0), (s.ok = true);
  else if (S.fail) fail(s, '짝도, 다시 붙이기도 없어요!');
  else if (!hasPair(S.c)) {
    setMood(s, 'sweat');
    tip(s, 'stuck', '막혔어요 — 아래 ➕ 다시 붙이기를 톡!');
  }
}

function fail(s: PairState, why: string) {
  s.phase = 'settle';
  s.pt = 0;
  s.ok = false;
  s.why = why;
  ev(s, 'jam', 0.5, 0.62, '꽉 막혔다…', '#ffb4a8', s.t + 20);
}

function doReadd(s: PairState) {
  const L = s.L, S = s.S;
  if (S.re <= 0) {
    ev(s, 'nope', RBX, RBY - 0.06, '다시 붙이기를 다 썼어요', '#ffd8cc');
    return;
  }
  if (hasPair(S.c)) {
    ev(s, 'nope', RBX, RBY - 0.06, '아직 지울 짝이 있어요!', '#ffe9c4');
    tip(s, 'readdEarly', '➕ 다시 붙이기는 막혔을 때만 — 지울 짝이 하나도 없을 때');
    s.sel = -1;
    return;
  }
  const rec: RE[] = [], rows0 = rowsOf(S.c.length);
  readd(L, S, rec);
  s.acts++;
  s.lastMv = READD;
  s.sel = -1;
  s.selT = s.t;
  const e = rec[0];
  if (e && e.k === 'readd') {
    const rows1 = rowsOf(S.c.length);
    e.from.forEach((p, k) => s.adds.push({ fx: colX(p % COLS), fy: rowY((p / COLS) | 0, rows0), idx: e.start + k, t0: s.t + Math.min(30, k * 2) }));
    // 판이 길어져 줄 간격이 바뀌면 옛 줄들도 미끄러지게
    if (rows1 !== rows0) s.shift = { t0: s.t, map: [...Array(rows1).keys()], rows0 };
    s.busyUntil = s.t + Math.min(30, e.from.length * 2) + 20;
    ev(s, 'readd', RBX, RBY - 0.07, `주르륵! +${e.from.length}`, '#e8fff0', s.t, e.from.length);
  }
  see(s, 'readdUse', '➕ 남은 수가 판 끝에 차례대로 또 붙었어요');
  setMood(s, 'wow');
  if (S.fail) fail(s, '짝도, 다시 붙이기도 없어요!');
}

function animate(s: PairState) {
  const t = s.t;
  if (s.fly.length && t - s.fly[0].t0 > 60) s.fly = s.fly.filter((f) => t - f.t0 <= 60);
  if (s.gone.length && t - s.gone[0].t0 > 30) s.gone = s.gone.filter((g) => t - g.t0 <= 30);
  if (s.adds.length && t - s.adds[s.adds.length - 1].t0 > 24) s.adds = [];
  if (s.unl.length && t - s.unl[0].t0 > 40) s.unl = s.unl.filter((u) => t - u.t0 <= 40);
  if (s.rays.length && t - s.rays[0].t0 > 50) s.rays = s.rays.filter((m) => t - m.t0 <= 50);
  if (s.shift && t > s.shift.t0 + SHIFT_T) s.shift = null;
  if (s.confetti.length && t - s.confetti[0].t0 > 90) s.confetti = [];
}

export const numpair: GameDef<PairState> = {
  id: 'numpair',
  name: '너구리 숫자 짝 지우기',
  genes: ['numberpair', 'pointer', 'combo'],
  twist: '주판알이 빠진 자리 양옆(줄 따라)의 두 알이 딸깍 맞닿는데, 둘이 짝이면 저절로 또 딸깍 — 톡톡 한 번에 연쇄로 한 줄이 통째로 날아간다',
  rules: ['같은 수나 합이 10인 두 수를 톡톡 — 사이가 비어 이어져 있어야 해요.', '줄이 다 비면 쏙! 판을 다 비우면 성공 (막히면 ➕ 남은 수를 다시 붙이기).'],
  controls: 'touch',
  hint: '알을 톡 → 반짝이는 짝을 톡하면 딸깍! / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '너구리 주인의 주판 가게',
    mood: '등불이 일렁이는 오래된 나무 가게, 붉은 옻칠 주판 틀에 숫자가 적힌 나무 주판알이 줄줄이 꿰어 있다 — 알마다 그림자와 윤기, 계산대 너머 동그란 안경을 쓴 너구리 주인이 작은 주판을 튕기고, 창가의 다람쥐·토끼 손님과 선반 위 고양이가 구경한다.',
    palette: { bg: '#2a1a12', ink: '#fff4e2', muted: '#d6bfa0', accent: '#ffc65c', hot: '#ff5a4e', soft: '#ffe9c8' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'play', pt: 0, sel: -1, selT: 0, lastMv: null, acts: 0,
      down: false, ax: 0, ay: 0, lastTap: -99, taps: 0, pending: null, busyUntil: 0,
      hearts: 3, stars: 0, got: 0, pts: 0, ok: false, why: '', won: false, dead: false, tries: 0,
      seen: new Set<string>(), tips: new Set<string>(), events: [], news: null, newsQ: [], startT: 0, clearT: 0,
      mood: 'idle', moodT: 0, guest: 'wait', guestT: 0, catT: -99, flickT: -99,
      fly: [], shift: null, gone: [], adds: [], unl: [], rays: [], confetti: [], chainShow: 0, stopUntil: -1, comboShow: 0, comboT: -99, retry: false,
    } as unknown as PairState;
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
    if (s.events.length > 80 || (s.events.length && s.t - s.events[0].t > 240)) s.events = s.events.filter((e) => s.t - e.t < 240);
    animate(s);
    if (s.mood !== 'idle' && s.t - s.moodT > (s.mood === 'dizzy' || s.mood === 'proud' ? 110 : s.mood === 'wow' ? 70 : 40)) s.mood = s.phase === 'play' && !hasPair(s.S.c) ? 'sweat' : 'idle';
    if (s.guest !== 'wait' && s.t - s.guestT > 100 && s.phase === 'play') s.guest = 'wait';
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
      if (s.t >= s.busyUntil && s.pt >= (s.ok ? 40 : 44)) finish(s);
      return;
    }
    const busy = s.t < s.busyUntil || s.t - s.startT < 10;
    if (press) {
      if (busy) s.pending = { x: s.ax, y: s.ay * A };
      else tapAt(s, s.ax, s.ay * A);
    } else if (s.pending && !busy) {
      const q = s.pending;
      s.pending = null;
      tapAt(s, q.x, q.y);
    }
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
const brain = new WeakMap<object, { key: string; list: Mv[]; i: number; acts: number }>();
/** 지금 둘 수: 판을 만들 때 찾아 둔 풀이를 따라가고, 어긋나면 지금 자리에서 다시 푼다 */
export function planMove(s: PairState): Mv | null {
  const key = `${s.stage}:${s.tries}`;
  let b = brain.get(s);
  if (b && b.key === key && s.acts === b.acts + 1 && s.lastMv && b.list[b.i] && s.lastMv.a === b.list[b.i].a && s.lastMv.b === b.list[b.i].b) (b.i++, (b.acts = s.acts));
  if (!b || b.key !== key || b.acts !== s.acts || b.i > b.list.length) {
    const list = s.acts === 0 ? s.L.plan.slice() : bestPlan(s.L, s.S) ?? [];
    brain.set(s, (b = { key, list, i: 0, acts: s.acts }));
  }
  let m: Mv | null = b.list[b.i] ?? null;
  if (m && m.a >= 0 && !canPair(s.S.c, m.a, m.b)) m = null;
  if (!m) m = habitPick(s.S);
  return m;
}

const NO: Input = { tap: false, dir: 0, pointer: null };
/** 알 i(또는 ➕ 나무패)를 누르는 입력 */
function at(s: PairState, i: number): Input {
  if (i < 0) return { tap: false, dir: 0, pointer: { x: RBX, y: RBY / A } };
  const rows = rowsOf(s.S.c.length);
  return { tap: false, dir: 0, pointer: { x: colX(i % COLS), y: rowY((i / COLS) | 0, rows) / A } };
}
/** 들고 있는 알을 보고 다음 톡: 안 든 상태면 첫 알, 그 알을 들었으면 짝, 딴 알을 들었으면 내려놓기 */
function tapFor(s: PairState, m: Mv | null): Input {
  if (!m) return NO;
  if (m.a < 0) return at(s, -1);
  if (s.sel < 0) return at(s, m.a);
  if (s.sel === m.a) return at(s, m.b);
  if (s.sel === m.b) return at(s, m.a);
  return at(s, s.sel);
}
const ready = (s: PairState, gap: number) => s.phase === 'play' && s.t >= s.busyUntil && !s.down && !s.pending && s.t - s.lastTap >= gap && s.t - s.startT >= 30;
/** 봇: 끝까지 내다본 풀이(연쇄를 노리고 다시 붙이기를 아끼는 순서)를 따라 톡톡 */
export const numpairSmart: Bot<PairState> = {
  name: '주판 장인',
  act(s) {
    if (!ready(s, 14)) return NO;
    return tapFor(s, planMove(s));
  },
};
/** 버릇 봇(측정용): '처음 찾은 짝부터' — 읽는 순서로 처음 보이는 짝, 없으면 다시 붙이기 */
export const numpairHabit: Bot<PairState> = {
  name: '버릇: 처음 찾은 짝부터',
  act(s) {
    if (!ready(s, 14)) return NO;
    return tapFor(s, habitPick(s.S));
  },
};
const dumbAt = new WeakMap<object, { next: number; until: number; p: { x: number; y: number } }>();
/** 봇: 아무 때나 아무 알이나 톡 (가끔 ➕나 화면 아무 데나) */
export const numpairRandom: Bot<PairState> = {
  name: '아무 알이나 톡',
  act(s, rng) {
    let m = dumbAt.get(s);
    if (!m) dumbAt.set(s, (m = { next: 20 + Math.floor(rng() * 50), until: -1, p: { x: 0, y: 0 } }));
    if (s.t < m.until) return { tap: false, dir: 0, pointer: m.p };
    if (s.t < m.next) return NO;
    m.next = s.t + 24 + Math.floor(rng() * 70);
    m.until = s.t + 2 + Math.floor(rng() * 4);
    const c = s.S.c, list: number[] = [];
    for (let i = 0; i < c.length; i++) if (c[i]) list.push(i);
    list.push(-1);
    if (rng() < 0.12 || !list.length) m.p = { x: rng(), y: rng() };
    else {
      const q = at(s, list[Math.floor(rng() * list.length)]).pointer!;
      m.p = { x: q.x + (rng() - 0.5) * 0.03, y: q.y + (rng() - 0.5) * 0.02 };
    }
    return { tap: false, dir: 0, pointer: m.p };
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
/** 숫자마다 알 색: 짝(합 10)끼리 같은 계열 — 작은 수는 연하게, 큰 수는 진하게 (1·9 빨강 · 2·8 주황 · 3·7 초록 · 4·6 파랑 · 5 보라) */
export const BEAD = ['#888888', '#ff8f80', '#ffc463', '#a6dd6a', '#7cc8ff', '#b98cff', '#3a6ed8', '#2f9446', '#d8692a', '#c42f3a'];
const TAU = Math.PI * 2;
/** 숫자 읽기 받침에 맞춘 을/를 (일·삼·육·칠·팔 → 을) */
const josa = (n: number) => ([1, 3, 6, 7, 8].includes(n) ? '을' : '를');
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
type F = (v: number) => number;
/** 알 너비 (가로 0~1 단위) */
const BWU = 0.125;

function beadPath(ctx: CanvasRenderingContext2D, bw: number, bh: number) {
  ctx.beginPath();
  ctx.moveTo(-bw / 2, 0);
  ctx.bezierCurveTo(-bw * 0.47, -bh * 0.24, -bw * 0.26, -bh / 2, 0, -bh / 2);
  ctx.bezierCurveTo(bw * 0.26, -bh / 2, bw * 0.47, -bh * 0.24, bw / 2, 0);
  ctx.bezierCurveTo(bw * 0.47, bh * 0.24, bw * 0.26, bh / 2, 0, bh / 2);
  ctx.bezierCurveTo(-bw * 0.26, bh / 2, -bw * 0.47, bh * 0.24, -bw / 2, 0);
  ctx.closePath();
}

interface BO { t: number; key: number; lift?: number; glow?: string | null; lock?: boolean; gold?: boolean; dim?: boolean; alpha?: number; rot?: number; scale?: number; shadow?: boolean; ring?: boolean }
/** 나무 주판알 하나 (x,y = 가운데 화면 px, u = 알 너비 px): 윗면·아랫면 두께, 막대 구멍, 윤기, 숫자 */
function drawBead(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, v: number, o: BO) {
  const bw = u * (o.scale ?? 1), bh = bw * 0.74, lift = o.lift ?? 0, t = o.t;
  ctx.save();
  ctx.translate(x, y);
  if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
  if (o.shadow !== false) {
    ctx.fillStyle = `rgba(10,4,0,${0.42 - Math.min(0.25, lift * 0.02)})`;
    ctx.beginPath();
    ctx.ellipse(bw * 0.08 + lift * 0.2, bh * 0.46, bw * (0.46 - lift * 0.004), bh * 0.17, 0, 0, TAU);
    ctx.fill();
  }
  ctx.translate(0, -lift);
  ctx.rotate(o.rot ?? 0);
  if (o.glow) {
    const g = ctx.createRadialGradient(0, 0, bw * 0.2, 0, 0, bw * 0.95);
    g.addColorStop(0, o.glow + 'cc');
    g.addColorStop(1, o.glow + '00');
    ctx.fillStyle = g;
    ctx.fillRect(-bw, -bw, bw * 2, bw * 2);
  }
  const base = BEAD[v] ?? '#999999';
  // 아랫면 (두께)
  beadPath(ctx, bw, bh);
  ctx.fillStyle = shade(base, -0.5);
  ctx.fill();
  // 윗면
  ctx.save();
  ctx.translate(0, -bh * 0.08);
  beadPath(ctx, bw * 0.99, bh * 0.9);
  const g = ctx.createLinearGradient(0, -bh * 0.5, 0, bh * 0.4);
  g.addColorStop(0, shade(base, 0.42));
  g.addColorStop(0.42, base);
  g.addColorStop(1, shade(base, -0.22));
  ctx.fillStyle = g;
  ctx.fill();
  // 나뭇결
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = 'rgba(60,25,0,.13)';
  ctx.lineWidth = 1;
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    ctx.ellipse(-bw * 0.1 + hsh(o.key + k) * bw * 0.2, bh * 0.1, bw * (0.22 + k * 0.12), bh * (0.16 + k * 0.1), 0, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
  }
  ctx.restore();
  ctx.restore();
  // 막대 구멍 띠 (양 끝 뾰족한 곳)
  ctx.fillStyle = shade(base, -0.6);
  for (const sd of [-1, 1]) (ctx.beginPath(), ctx.ellipse(sd * bw * 0.47, bh * 0.02, bw * 0.035, bh * 0.1, 0, 0, TAU), ctx.fill());
  // 윤기
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  ctx.beginPath();
  ctx.ellipse(-bw * 0.17, -bh * 0.3, bw * 0.17, bh * 0.07, -0.25, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  ctx.beginPath();
  ctx.arc(bw * 0.2, -bh * 0.3, bw * 0.03, 0, TAU);
  ctx.fill();
  if (o.gold) {
    // 황금 알: 금테 두른 알 + 반짝이 별이 돈다 (색은 숫자 계열 그대로)
    const gg = ctx.createLinearGradient(-bw / 2, -bh / 2, bw / 2, bh / 2);
    gg.addColorStop(0, '#fff6b0');
    gg.addColorStop(0.35, '#ffcf3a');
    gg.addColorStop(0.6, '#b07a10');
    gg.addColorStop(1, '#ffe27a');
    ctx.strokeStyle = gg;
    ctx.lineWidth = Math.max(3, bw * 0.09);
    beadPath(ctx, bw * 0.96, bh * 0.96);
    ctx.stroke();
    for (let q = 0; q < 3; q++) {
      const a = t * 0.06 + (q * TAU) / 3, rr = bw * 0.56, tw = 0.5 + 0.5 * Math.sin(t * 0.2 + q * 2);
      star4(ctx, Math.cos(a) * rr, Math.sin(a) * rr * 0.62, bw * (0.05 + 0.05 * tw), `rgba(255,246,170,${0.55 + 0.45 * tw})`);
    }
  }
  // 숫자
  const fs = Math.max(13, bw * 0.5);
  ctx.font = `900 ${fs}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2.5, fs * 0.17);
  ctx.strokeStyle = shade(base, -0.62);
  ctx.strokeText(String(v), 0, -bh * 0.06);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(String(v), 0, -bh * 0.06);
  if (o.ring) {
    ctx.strokeStyle = `rgba(255,246,190,${0.75 + 0.25 * Math.sin(t * 0.3 + o.key)})`;
    ctx.lineWidth = 2.5;
    beadPath(ctx, bw * 1.12, bh * 1.14);
    ctx.stroke();
  }
  if (o.lock) {
    // 새끼줄로 꽁꽁 + 자물쇠
    ctx.save();
    beadPath(ctx, bw * 1.02, bh * 1.02);
    ctx.clip();
    ctx.fillStyle = 'rgba(40,20,0,.35)';
    ctx.fillRect(-bw, -bh, bw * 2, bh * 2);
    for (const sd of [-1, 1]) {
      ctx.save();
      ctx.rotate(sd * 0.55);
      ctx.fillStyle = '#c9a25a';
      ctx.fillRect(-bw, -bh * 0.1, bw * 2, bh * 0.2);
      ctx.strokeStyle = '#8a6430';
      ctx.lineWidth = 1.2;
      for (let k = -6; k <= 6; k++) {
        ctx.beginPath();
        ctx.moveTo(k * bw * 0.09, -bh * 0.1);
        ctx.lineTo(k * bw * 0.09 + bw * 0.06, bh * 0.1);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
    ctx.fillStyle = '#ffffff';
    ctx.font = `${Math.max(12, bw * 0.36)}px system-ui`;
    ctx.fillText('🔒', bw * 0.38, -bh * 0.42);
  }
  if (o.dim) {
    ctx.fillStyle = 'rgba(30,15,5,.38)';
    beadPath(ctx, bw * 1.02, bh * 1.02);
    ctx.fill();
  }
  ctx.restore();
}

function star4(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, col: string) {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x, y - z * 2);
  ctx.lineTo(x + z * 0.5, y - z * 0.5);
  ctx.lineTo(x + z * 2, y);
  ctx.lineTo(x + z * 0.5, y + z * 0.5);
  ctx.lineTo(x, y + z * 2);
  ctx.lineTo(x - z * 0.5, y + z * 0.5);
  ctx.lineTo(x - z * 2, y);
  ctx.lineTo(x - z * 0.5, y - z * 0.5);
  ctx.fill();
}

/** 지금 고른 알과 짝이 되는 알들 */
function partnersOf(c: number[], i: number): number[] {
  const out: number[] = [], tmp: number[] = [];
  if (i < 0 || !isFree(c[i])) return out;
  fwd(c, i, tmp);
  for (const j of tmp) if (pairOK(c[i], c[j])) out.push(j);
  for (let j = 0; j < i; j++) {
    if (!isFree(c[j]) || !matchV(c[j] & VM, c[i] & VM)) continue;
    fwd(c, j, tmp);
    if (tmp.includes(i)) out.push(j);
  }
  return out;
}

const recentSay = new WeakMap<object, { x: number; y: number; t: number }[]>();
function drawAll(ctx: CanvasRenderingContext2D, s: PairState, w: number, h: number, th: Theme) {
  const fx = juice(s), t = s.t, L = s.L, S = s.S, d = STAGES[s.stage];
  const X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w;
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  ctx.save();
  fx.begin(ctx);
  // 큰 연쇄 순간 화면이 그 알 쪽으로 살짝 당겨진다 (연쇄가 길수록 크게)
  const pr = s.rays.length ? s.rays[s.rays.length - 1] : null;
  if (pr && t >= pr.t0 && t - pr.t0 < 16 && pr.n >= 1) {
    const k = 1 + 0.02 * Math.min(4, pr.n + 0.5) * (1 - (t - pr.t0) / 16);
    ctx.translate(X(pr.x), Y(pr.y));
    ctx.scale(k, k);
    ctx.translate(-X(pr.x), -Y(pr.y));
  }
  drawShop(ctx, s, w, X, Y, R, t);
  drawFrame(ctx, s, X, Y, R, t);
  drawBoard(ctx, s, X, Y, R, t);
  drawReaddTag(ctx, s, X, Y, R, t, font);
  // 주판알 폭죽
  for (const q of s.confetti) {
    const u = t - q.t0;
    if (u < 0) continue;
    const x = q.x + q.vx * u, y = q.y + q.vy * u + 0.00045 * u * u;
    drawBead(ctx, X(x), Y(y), R(BWU * 0.6), q.v, { t, key: q.v, rot: u * 0.15 * (q.vx > 0 ? 1 : -1), alpha: cl01((90 - u) / 20), shadow: false });
  }
  // 가장자리 어둡게
  const vg = ctx.createRadialGradient(w / 2, h * 0.5, R(0.45), w / 2, h * 0.5, R(1.05));
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(20,6,0,.42)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
  // ═════════ 사건 연출 ═════════
  const say = (x: number, y: number, text: string, col: string, size: number) => {
    let rec = recentSay.get(s);
    if (!rec) recentSay.set(s, (rec = []));
    y = Math.max(Y(0.16), Math.min(Y(1.24), y));
    for (let k = 0; k < 6 && rec.some((q) => t - q.t < 40 && Math.abs(q.x - x) < w * 0.3 && Math.abs(q.y - y) < size + 5); k++) y -= size + 6;
    if (y < Y(0.15)) y += (size + 6) * 3;
    rec.push({ x, y, t });
    if (rec.length > 12) rec.shift();
    ctx.font = `800 ${size}px system-ui, sans-serif`;
    const hw = ctx.measureText(text).width / 2 + 6;
    fx.pop(Math.max(hw, Math.min(w - hw, x)), y, text, col, size);
  };
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    const due = e.v !== undefined ? e.v : e.t;
    if (due <= seenT || due > t) continue;
    const x = X(e.x), y = Y(e.y), n = e.n ?? 1;
    if (e.kind === 'pair') {
      say(x, y - R(0.06), e.text!, e.col!, 17);
      fx.kick(2);
    }
    if (e.kind === 'chain') {
      const c = Math.min(5, n);
      fx.burst(x, y, '#fff3c0', 16 + 8 * c, 3 + c * 0.6, 2.2), fx.ring(x, y, '#fff3c0', R(0.08 + 0.03 * c), 3 + c);
      fx.kick(2 + 1.6 * c);
      if (c >= 2) fx.blink('#fff1b8', 0.08 + 0.04 * c);
      say(x, y - R(0.07), e.text!, c >= 3 ? '#ffb3e6' : e.col!, 18 + 3 * c);
      if (c >= 3) say(X(0.5), Y(0.5), c >= 4 ? '🔥 대박 연쇄!!' : '✨ 딸깍 연쇄!', '#ffe9a8', 24);
    }
    if (e.kind === 'goldAll') fx.ring(x, y, '#ffe27a', R(0.3), 7), fx.burst(x, y, '#ffd23f', 40, 5, 3), fx.blink('#fff1a8', 0.3), fx.kick(6), say(x, y - R(0.08), e.text!, e.col!, 20);
    if (e.kind === 'rows') {
      const c = Math.min(4, n);
      for (let k = 0; k < 8; k++) fx.burst(X(colX(k)), y, k % 2 ? '#d8fff0' : '#fff6d0', 6 + 2 * c, 2.5 + c * 0.5, 2);
      fx.kick(4 + 3 * c);
      fx.blink('#e8fff4', 0.14 + 0.08 * c);
      say(X(0.5), y - R(0.02), e.text!, e.col!, 26 + 5 * c);
      if (c >= 2) for (const col of BEAD.slice(1)) fx.burst(X(0.5), y, col, 6, 6, 2.6);
    }
    if (e.kind === 'unlock') fx.burst(x, y, '#d9b26a', 16, 3, 2), fx.ring(x, y, '#ffe9b0', R(0.07), 3), fx.kick(2), say(x + R(0.04), y - R(0.05), e.text!, e.col!, 16);
    if (e.kind === 'readd') fx.ring(x, y, '#c8ffd8', R(0.18), 5), fx.burst(x, y, '#c8ffd8', 20, 3.5, 2.4), fx.kick(3), say(x, y - R(0.03), e.text!, e.col!, 18);
    if (e.kind === 'decay') fx.burst(x, y, '#cfc2b0', 14, 1.6, 3), say(x, y, e.text!, e.col!, 14);
    if (e.kind === 'combo') fx.burst(x, y, '#ffb3e6', 12 + 4 * Math.min(5, n), 3, 2), say(x, y, e.text!, e.col!, 16 + 2 * Math.min(4, n));
    if (e.kind === 'nope') say(x, y, e.text!, e.col!, 14), fx.kick(1.2);
    if (e.kind === 'miss' || e.kind === 'say') say(x, y, e.text!, e.col!, 14);
    if (e.kind === 'learn') say(x, y, e.text!, e.col!, 15), fx.ring(x, y + R(0.03), '#fff3c4', R(0.06), 2);
    if (e.kind === 'jam') fx.kick(8), fx.blink(th.hot, 0.25), say(x, y, e.text!, e.col!, 20);
    if (e.kind === 'stage') fx.blink('#fff6d6', 0.18);
    if (e.kind === 'clear') {
      fx.burst(X(0.5), Y(0.62), '#ffe066', 46, 6, 3.2), fx.burst(X(0.5), Y(0.62), '#ff9ad5', 30, 5, 3), fx.ring(X(0.5), Y(0.62), '#ffe066', R(0.35), 6), fx.blink('#fff6c8', 0.3), fx.kick(6);
      for (let k = 1; k <= 9; k++) fx.burst(X(0.1 + 0.1 * (k - 1)), Y(0.78 + 0.1 * hsh(k)), BEAD[k], 10, 4, 2.4);
    }
    if (e.kind === 'fail') fx.kick(9), fx.blink(th.hot, 0.22);
  }
  // 튕겨 나간 알이 터지는 순간 (알마다 나무 부스러기)
  for (const f of s.fly) {
    if (f.t0 !== t) continue;
    const col = f.gold ? '#ffd23f' : BEAD[f.v];
    fx.burst(X(f.x), Y(f.y), col, 8 + 3 * Math.min(4, f.n), 2.4 + f.n * 0.4, 2.2);
    fx.burst(X(f.x), Y(f.y), '#e8c890', 4, 2, 1.4);
    fx.ring(X(f.x), Y(f.y), col, R(0.045 + 0.01 * Math.min(4, f.n)), 2.5);
  }
  fx.memo.t = t;
  if (s.catT >= 0 && (fx.memo.cat ?? -1) !== s.catT && t >= s.catT) (fx.memo.cat = s.catT), say(X(0.54), Y(0.13), '냐앗!', '#ffe0f0', 13);
  ctx.restore();
  drawHud(ctx, s, d, w, X, Y, R, font, th);
  void L;
  void S;
}

// ═════════ 가게 (벽·창·손님·등불·선반·고양이·계산대·너구리) ═════════
function drawShop(ctx: CanvasRenderingContext2D, s: PairState, w: number, X: F, Y: F, R: F, t: number) {
  const hb = Y(0.375);
  // 나무 판벽
  const wall = ctx.createLinearGradient(0, 0, 0, hb);
  wall.addColorStop(0, '#4a2e1c');
  wall.addColorStop(1, '#6a4329');
  ctx.fillStyle = wall;
  ctx.fillRect(-10, -10, w + 20, hb + 10);
  for (let k = 0; k < 9; k++) {
    const x = X(k / 8);
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    ctx.fillRect(x - 1, 0, 2, hb);
    ctx.fillStyle = 'rgba(255,220,170,.06)';
    ctx.fillRect(x + 1, 0, X(1 / 8) - 3, hb);
  }
  // 등불 빛 번짐
  const glow = ctx.createRadialGradient(X(0.48), Y(0.18), R(0.02), X(0.48), Y(0.2), R(0.55));
  const combo = s.S.combo;
  glow.addColorStop(0, `rgba(255,${combo >= 3 ? 150 : 190},110,${0.32 + Math.min(3, combo) * 0.06})`);
  glow.addColorStop(1, 'rgba(255,170,90,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, hb);
  // 들보 + 포렴
  ctx.fillStyle = '#2e1b10';
  ctx.fillRect(0, Y(0.066), w, R(0.024));
  ctx.fillStyle = 'rgba(255,220,170,.2)';
  ctx.fillRect(0, Y(0.066), w, 1.5);
  // ── 창 (저녁 골목) + 손님 ──
  {
    const x0 = X(0.03), x1 = X(0.335), y0 = Y(0.112), y1 = Y(0.3);
    ctx.fillStyle = '#2a170c';
    ctx.fillRect(x0 - 5, y0 - 5, x1 - x0 + 10, y1 - y0 + 10);
    const sky = ctx.createLinearGradient(0, y0, 0, y1);
    sky.addColorStop(0, '#3b2b6a');
    sky.addColorStop(0.6, '#c8587a');
    sky.addColorStop(1, '#ffae6a');
    ctx.fillStyle = sky;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, y0, x1 - x0, y1 - y0);
    ctx.clip();
    // 건너편 지붕들 + 불 켜진 창
    ctx.fillStyle = '#2a1d3a';
    ctx.beginPath();
    ctx.moveTo(x0, y1);
    for (let k = 0; k <= 6; k++) ctx.lineTo(x0 + ((x1 - x0) * k) / 6, y1 - R(0.07 + 0.03 * hsh(k + 4)) - (k % 2) * R(0.015));
    ctx.lineTo(x1, y1);
    ctx.fill();
    for (let k = 0; k < 5; k++) {
      ctx.fillStyle = `rgba(255,210,120,${0.5 + 0.4 * Math.sin(t / 60 + k * 1.3)})`;
      ctx.fillRect(x0 + (x1 - x0) * (0.08 + 0.19 * k), y1 - R(0.045), R(0.018), R(0.014));
    }
    for (let k = 0; k < 6; k++) {
      ctx.fillStyle = `rgba(255,255,230,${0.3 + 0.5 * Math.abs(Math.sin(t / 45 + k * 1.7))})`;
      ctx.fillRect(x0 + hsh(k + 40) * (x1 - x0), y0 + hsh(k + 60) * (y1 - y0) * 0.35, 1.6, 1.6);
    }
    drawGuests(ctx, s, X, Y, R, t, y1);
    ctx.restore();
    // 창살
    ctx.strokeStyle = '#2a170c';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo((x0 + x1) / 2, y0);
    ctx.lineTo((x0 + x1) / 2, y0 + (y1 - y0) * 0.45);
    ctx.moveTo(x0, y0 + (y1 - y0) * 0.45);
    ctx.lineTo(x1, y0 + (y1 - y0) * 0.45);
    ctx.stroke();
    // 창턱
    ctx.fillStyle = '#7a4c2c';
    ctx.fillRect(x0 - R(0.015), y1 - 1, x1 - x0 + R(0.03), R(0.016));
    // 포렴 (창 위)
    for (let k = 0; k < 3; k++) {
      const nx = x0 - 4 + ((x1 - x0 + 8) / 3) * k, nw = (x1 - x0 + 8) / 3 - 3, sw = Math.sin(t * 0.03 + k) * 1.2;
      ctx.fillStyle = '#2f3e7a';
      ctx.beginPath();
      ctx.moveTo(nx, Y(0.09));
      ctx.lineTo(nx + nw, Y(0.09));
      ctx.lineTo(nx + nw + sw, Y(0.14));
      ctx.lineTo(nx + sw, Y(0.14));
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.beginPath();
      ctx.arc(nx + nw / 2 + sw * 0.6, Y(0.117), R(0.012), 0, TAU);
      ctx.fill();
    }
  }
  // ── 선반 (오른쪽 위) + 항아리 + 장부 + 고양이 ──
  {
    const sy = Y(0.2), sx0 = X(0.43), sx1 = X(0.655);
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.fillRect(sx0, sy + R(0.016), sx1 - sx0, R(0.02));
    ctx.fillStyle = '#8a5a34';
    ctx.fillRect(sx0, sy, sx1 - sx0, R(0.016));
    ctx.fillStyle = '#b07a48';
    ctx.fillRect(sx0, sy, sx1 - sx0, 2);
    for (const bx of [sx0 + R(0.02), sx1 - R(0.02)]) (ctx.fillStyle = '#5a3a20'), ctx.fillRect(bx - 2, sy + R(0.016), 4, R(0.03));
    // 항아리
    for (const [jx, jc, jr] of [[0.465, '#5f7fa8', 0.026], [0.62, '#c86a3a', 0.02]] as [number, string, number][]) {
      const g = ctx.createRadialGradient(X(jx) - R(jr * 0.4), sy - R(jr * 1.2), 1, X(jx), sy - R(jr), R(jr * 1.3));
      g.addColorStop(0, shade(jc, 0.4));
      g.addColorStop(1, shade(jc, -0.3));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(X(jx), sy - R(jr), R(jr), R(jr * 1.05), 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = shade(jc, -0.4);
      ctx.fillRect(X(jx) - R(jr * 0.45), sy - R(jr * 2.25), R(jr * 0.9), R(jr * 0.35));
    }
    // 장부 더미
    for (let k = 0; k < 3; k++) {
      ctx.fillStyle = ['#a8323a', '#2f5a8a', '#d8b060'][k];
      ctx.fillRect(X(0.6) - R(0.035) + k * 1.5, sy - R(0.013) * (k + 1) - R(0.04), R(0.07), R(0.012));
    }
    drawCat(ctx, X(0.54), sy, R(0.075), s, t);
  }
  // ── 등불 ──
  drawLantern(ctx, X(0.385), Y(0.09), R(0.062), t, s.S.combo);
  // ── 계산대 + 너구리 ──
  drawRaccoon(ctx, X(0.82), Y(0.322), R(0.235), s, t);
  {
    const y0 = Y(0.31), y1 = Y(0.336), y2 = hb;
    const tg = ctx.createLinearGradient(0, y0, 0, y1);
    tg.addColorStop(0, '#c08a56');
    tg.addColorStop(1, '#9a6a3e');
    ctx.fillStyle = tg;
    ctx.beginPath();
    ctx.moveTo(X(0.0), y1);
    ctx.lineTo(X(0.02), y0);
    ctx.lineTo(X(0.98), y0);
    ctx.lineTo(X(1), y1);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,235,200,.35)';
    ctx.fillRect(X(0.02), y0, X(0.96), 1.5);
    const fg = ctx.createLinearGradient(0, y1, 0, y2);
    fg.addColorStop(0, '#7a4a2a');
    fg.addColorStop(1, '#4a2a16');
    ctx.fillStyle = fg;
    ctx.fillRect(0, y1, w, y2 - y1);
    drawMiniAbacus(ctx, s, X(0.655), Y(0.312), R(0.1), t);
  }
}

function drawLantern(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, t: number, combo: number) {
  const sw = Math.sin(t * 0.025) * 0.06;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(sw);
  ctx.strokeStyle = '#1a0e06';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, u * 0.35);
  ctx.stroke();
  const cy = u * 0.95, hot = combo >= 3;
  const g = ctx.createRadialGradient(0, cy, 2, 0, cy, u * 1.6);
  g.addColorStop(0, hot ? 'rgba(255,120,80,.55)' : 'rgba(255,190,110,.45)');
  g.addColorStop(1, 'rgba(255,160,80,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-u * 1.6, cy - u * 1.6, u * 3.2, u * 3.2);
  const lg = ctx.createRadialGradient(-u * 0.15, cy - u * 0.2, 2, 0, cy, u * 0.6);
  lg.addColorStop(0, hot ? '#ffd0a0' : '#ffe0a0');
  lg.addColorStop(0.5, hot ? '#ff5a3a' : '#e8483a');
  lg.addColorStop(1, '#9a1f1a');
  ctx.fillStyle = lg;
  ctx.beginPath();
  ctx.ellipse(0, cy, u * 0.42, u * 0.55, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(80,10,5,.45)';
  ctx.lineWidth = 1;
  for (let k = -2; k <= 2; k++) {
    ctx.beginPath();
    ctx.ellipse(0, cy + k * u * 0.18, u * 0.42 * Math.sqrt(1 - Math.pow((k * 0.18) / 0.55, 2)), u * 0.04, 0, 0, TAU);
    ctx.stroke();
  }
  ctx.fillStyle = '#1a0e06';
  ctx.fillRect(-u * 0.2, cy - u * 0.62, u * 0.4, u * 0.1);
  ctx.fillRect(-u * 0.2, cy + u * 0.52, u * 0.4, u * 0.1);
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${Math.max(12, u * 0.38)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(60,5,0,.75)';
  ctx.fillText('셈', 0, cy + 1);
  // 술
  ctx.strokeStyle = '#ffcf5a';
  ctx.lineWidth = 1.5;
  for (let k = -1; k <= 1; k++) {
    ctx.beginPath();
    ctx.moveTo(k * 2, cy + u * 0.62);
    ctx.lineTo(k * 3 + Math.sin(t * 0.05 + k) * 1.5, cy + u * 0.85);
    ctx.stroke();
  }
  ctx.restore();
}

/** 창가 손님: 다람쥐·토끼 (여우 손님 판엔 여우가 주문 쪽지를 든다) */
function drawGuests(ctx: CanvasRenderingContext2D, s: PairState, X: F, Y: F, R: F, t: number, sill: number) {
  const m = s.guest, age = t - s.guestT, L = s.L;
  const hop = (k: number) => (m === 'clap' || m === 'happy' ? Math.abs(Math.sin(age * 0.25 + k)) * R(0.02) : m === 'laugh' ? Math.abs(Math.sin(age * 0.5 + k)) * R(0.008) : Math.sin(t * 0.04 + k) * R(0.003));
  const order = L.goal === 'count';
  // 다람쥐
  {
    const x = X(0.095), y = sill - hop(0) + R(0.012), u = R(0.068);
    ctx.fillStyle = '#b8642a';
    ctx.beginPath();
    ctx.ellipse(x - u * 0.55, y - u * 0.9, u * 0.35, u * 0.75, -0.5 + Math.sin(t * 0.05) * 0.1, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#d07a36';
    ctx.beginPath();
    ctx.ellipse(x, y - u * 0.35, u * 0.42, u * 0.42, 0, 0, TAU);
    ctx.fill();
    for (const sd of [-1, 1]) (ctx.beginPath(), ctx.moveTo(x + sd * u * 0.18, y - u * 0.66), ctx.lineTo(x + sd * u * 0.32, y - u * 0.95), ctx.lineTo(x + sd * u * 0.36, y - u * 0.6), ctx.fill());
    ctx.fillStyle = '#f2d3a8';
    ctx.beginPath();
    ctx.ellipse(x, y - u * 0.22, u * 0.24, u * 0.18, 0, 0, TAU);
    ctx.fill();
    face(ctx, x, y - u * 0.4, u, m, t, age);
    paws(ctx, x, y, u, '#d07a36', m, age);
  }
  // 토끼 또는 여우
  {
    const x = X(0.255), y = sill - hop(1.5) + R(0.012), u = R(0.075);
    if (order) {
      ctx.fillStyle = '#e8742a';
      for (const sd of [-1, 1]) (ctx.beginPath(), ctx.moveTo(x + sd * u * 0.12, y - u * 0.7), ctx.lineTo(x + sd * u * 0.42, y - u * 1.12), ctx.lineTo(x + sd * u * 0.44, y - u * 0.55), ctx.fill());
      ctx.beginPath();
      ctx.ellipse(x, y - u * 0.38, u * 0.44, u * 0.4, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#fff4e6';
      ctx.beginPath();
      ctx.moveTo(x - u * 0.4, y - u * 0.35);
      ctx.quadraticCurveTo(x, y + u * 0.05, x + u * 0.4, y - u * 0.35);
      ctx.quadraticCurveTo(x, y - u * 0.2, x - u * 0.4, y - u * 0.35);
      ctx.fill();
      face(ctx, x, y - u * 0.44, u, m, t, age);
      paws(ctx, x, y, u, '#e8742a', m, age);
    } else {
      ctx.fillStyle = '#efe6dc';
      for (const sd of [-1, 1]) {
        ctx.save();
        ctx.translate(x + sd * u * 0.16, y - u * 0.7);
        ctx.rotate(sd * (0.15 + (m === 'laugh' ? 0.4 : 0) + Math.sin(t * 0.05 + sd) * 0.06));
        ctx.beginPath();
        ctx.ellipse(0, -u * 0.38, u * 0.12, u * 0.42, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#f5b8c8';
        ctx.beginPath();
        ctx.ellipse(0, -u * 0.38, u * 0.05, u * 0.3, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#efe6dc';
        ctx.restore();
      }
      ctx.beginPath();
      ctx.ellipse(x, y - u * 0.38, u * 0.42, u * 0.4, 0, 0, TAU);
      ctx.fill();
      face(ctx, x, y - u * 0.42, u, m, t, age);
      paws(ctx, x, y, u, '#efe6dc', m, age);
    }
  }
  void Y;
}
function face(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, m: string, t: number, age: number) {
  const blink = m === 'wait' && t % 160 < 6;
  ctx.fillStyle = '#1a1010';
  for (const sd of [-1, 1]) {
    if (m === 'clap' || m === 'happy' || m === 'laugh') {
      ctx.strokeStyle = '#1a1010';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(x + sd * u * 0.16, y + u * 0.02, u * 0.07, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else if (blink) ctx.fillRect(x + sd * u * 0.16 - u * 0.06, y, u * 0.12, 1.5);
    else (ctx.beginPath(), ctx.arc(x + sd * u * 0.16, y, u * 0.055, 0, TAU), ctx.fill());
  }
  ctx.fillStyle = '#3a1a10';
  ctx.beginPath();
  ctx.arc(x, y + u * 0.12, u * 0.04, 0, TAU);
  ctx.fill();
  if (m === 'laugh' || m === 'clap') {
    ctx.fillStyle = '#7a1f20';
    ctx.beginPath();
    ctx.ellipse(x, y + u * 0.22, u * 0.08, u * (0.05 + 0.03 * Math.abs(Math.sin(age * 0.5))), 0, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,120,120,.35)';
  for (const sd of [-1, 1]) (ctx.beginPath(), ctx.arc(x + sd * u * 0.26, y + u * 0.12, u * 0.06, 0, TAU), ctx.fill());
}
function paws(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, col: string, m: string, age: number) {
  ctx.fillStyle = col;
  for (const sd of [-1, 1]) {
    const up = m === 'clap' ? Math.abs(Math.sin(age * 0.5)) * u * 0.25 : 0, inn = m === 'clap' ? Math.abs(Math.sin(age * 0.5)) * u * 0.12 : 0;
    ctx.beginPath();
    ctx.ellipse(x + sd * (u * 0.28 - inn), y - up, u * 0.1, u * 0.07, 0, 0, TAU);
    ctx.fill();
  }
}

function drawCat(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, s: PairState, t: number) {
  const age = t - s.catT, jump = age >= 0 && age < 40;
  const jy = jump ? Math.sin(Math.min(1, age / 20) * Math.PI) * u * 0.5 : 0;
  ctx.save();
  ctx.translate(x, y - jy);
  // 꼬리
  ctx.strokeStyle = '#5a5662';
  ctx.lineCap = 'round';
  ctx.lineWidth = u * (jump ? 0.22 : 0.12);
  ctx.beginPath();
  ctx.moveTo(u * 0.4, -u * 0.12);
  if (jump) ctx.quadraticCurveTo(u * 0.75, -u * 0.4, u * 0.6, -u * 0.9);
  else ctx.quadraticCurveTo(u * 0.8, -u * 0.05, u * 0.75 + Math.sin(t * 0.06) * u * 0.12, u * 0.06);
  ctx.stroke();
  ctx.lineCap = 'butt';
  // 몸 (식빵)
  ctx.fillStyle = '#6e6a78';
  ctx.beginPath();
  ctx.ellipse(0, -u * 0.22, u * 0.48, u * (jump ? 0.3 : 0.22), 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-u * 0.38, -u * 0.32, u * 0.22, 0, TAU);
  ctx.fill();
  for (const sd of [-1, 1]) (ctx.beginPath(), ctx.moveTo(-u * 0.38 + sd * u * 0.2, -u * 0.38), ctx.lineTo(-u * 0.38 + sd * u * 0.13, -u * 0.62), ctx.lineTo(-u * 0.38 + sd * u * 0.04, -u * 0.46), ctx.fill());
  ctx.strokeStyle = '#1a1010';
  ctx.lineWidth = 1.3;
  if (jump) {
    ctx.fillStyle = '#ffe27a';
    for (const sd of [-1, 1]) (ctx.beginPath(), ctx.arc(-u * 0.38 + sd * u * 0.08, -u * 0.34, u * 0.05, 0, TAU), ctx.fill());
  } else
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(-u * 0.38 + sd * u * 0.08, -u * 0.33, u * 0.04, 0, Math.PI);
      ctx.stroke();
    }
  if (!jump && t % 240 < 120) {
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.font = `800 ${Math.max(12, u * 0.3)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillText('z', -u * 0.6, -u * (0.7 + 0.2 * ((t % 120) / 120)));
  }
  ctx.restore();
}

/** 계산대 위 작은 주판: 딸깍마다 알이 튕긴다 */
function drawMiniAbacus(ctx: CanvasRenderingContext2D, s: PairState, x: number, y: number, u: number, t: number) {
  const age = t - s.flickT;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.beginPath();
  ctx.ellipse(0, u * 0.02, u * 0.6, u * 0.08, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#8a2a20';
  ctx.fillRect(-u * 0.55, -u * 0.38, u * 1.1, u * 0.07);
  ctx.fillRect(-u * 0.55, -u * 0.04, u * 1.1, u * 0.07);
  ctx.fillRect(-u * 0.55, -u * 0.38, u * 0.06, u * 0.41);
  ctx.fillRect(u * 0.49, -u * 0.38, u * 0.06, u * 0.41);
  for (let r = 0; r < 3; r++) {
    const ry = -u * (0.28 - r * 0.09);
    ctx.strokeStyle = '#d8b46a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-u * 0.49, ry);
    ctx.lineTo(u * 0.49, ry);
    ctx.stroke();
    for (let k = 0; k < 4; k++) {
      const flick = r === 1 && k === 0 && age >= 0 && age < 16 ? Math.sin((age / 16) * Math.PI) * u * 0.45 : 0;
      const bx = -u * 0.4 + k * u * 0.13 + (r === 1 && k === 0 ? flick : 0) + (r === 2 && k >= 2 ? u * 0.3 : 0);
      ctx.fillStyle = k % 2 ? '#c98a4a' : '#a86a32';
      ctx.beginPath();
      ctx.ellipse(bx, ry, u * 0.06, u * 0.04, 0, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** 너구리 주인 (x,y = 계산대 윗면 가운데, u = 키) */
function drawRaccoon(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, s: PairState, t: number) {
  const m = s.mood, age = t - s.moodT;
  const wow = m === 'wow', proud = m === 'proud', dizzy = m === 'dizzy', sweat = m === 'sweat', huh = m === 'huh', flick = m === 'flick';
  const fur = '#8a7868', fur2 = '#5e5048', dark = '#2e2622', cream = '#efe4d2';
  const bob = proud ? Math.abs(Math.sin(age * 0.16)) * u * 0.03 : wow ? Math.max(0, Math.sin(Math.min(age, 12) / 12 * Math.PI)) * u * 0.06 : Math.sin(t * 0.05) * u * 0.006;
  // 실패: 뒤로 데굴 넘어가 버둥 (넘어가는 동안 통통 튄다)
  const fall = dizzy ? Math.min(1, age / 16) : 0;
  const tilt = dizzy ? -0.9 * fall + Math.sin(age * 0.35) * 0.08 * fall : huh ? 0.12 : proud ? -0.05 : 0;
  ctx.save();
  ctx.translate(x - fall * u * 0.08, y - bob + fall * u * 0.08 - (dizzy && age < 16 ? Math.sin((age / 16) * Math.PI) * u * 0.15 : 0));
  ctx.rotate(tilt);
  // 줄무늬 꼬리 (뒤)
  {
    const puff = wow ? 1.35 : 1, sw = Math.sin(t * 0.06) * 0.25;
    for (let k = 7; k >= 0; k--) {
      const q = k / 7, ang = -0.4 - q * 1.4 + sw * q;
      const tx = u * 0.22 + Math.cos(ang) * u * 0.5 * q * 1.1, ty = -u * 0.1 + Math.sin(ang) * u * 0.55 * q;
      ctx.fillStyle = k % 2 ? dark : '#a8968a';
      ctx.beginPath();
      ctx.ellipse(tx, ty, u * 0.11 * puff * (1 - q * 0.25), u * 0.1 * puff, ang, 0, TAU);
      ctx.fill();
    }
  }
  // 몸 + 조끼
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.ellipse(0, -u * 0.28, u * 0.3, u * 0.32, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = cream;
  ctx.beginPath();
  ctx.ellipse(0, -u * 0.22, u * 0.17, u * 0.22, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#2f3e7a';
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sd * u * 0.12, -u * 0.52);
    ctx.quadraticCurveTo(sd * u * 0.32, -u * 0.4, sd * u * 0.27, -u * 0.02);
    ctx.lineTo(sd * u * 0.16, -u * 0.02);
    ctx.quadraticCurveTo(sd * u * 0.2, -u * 0.3, sd * u * 0.12, -u * 0.52);
    ctx.fill();
  }
  ctx.fillStyle = '#ffd25a';
  ctx.beginPath();
  ctx.arc(u * 0.17, -u * 0.22, u * 0.018, 0, TAU);
  ctx.fill();
  // 팔: 왼팔은 계산대에, 오른팔은 주판을 튕긴다
  {
    const fa = t - s.flickT, fl = fa >= 0 && fa < 16 ? Math.sin((fa / 16) * Math.PI) : 0;
    ctx.strokeStyle = fur2;
    ctx.lineCap = 'round';
    ctx.lineWidth = u * 0.09;
    ctx.beginPath();
    ctx.moveTo(u * 0.22, -u * 0.36);
    ctx.quadraticCurveTo(u * 0.32, -u * 0.12, u * 0.24, -u * 0.02);
    ctx.stroke();
    const hx = proud ? -u * 0.34 : -u * 0.3 - fl * u * 0.25, hy = proud ? -u * 0.62 - Math.abs(Math.sin(age * 0.2)) * u * 0.04 : -u * 0.03 - fl * u * 0.12;
    ctx.beginPath();
    ctx.moveTo(-u * 0.22, -u * 0.36);
    ctx.quadraticCurveTo(-u * 0.36, -u * 0.18, hx, hy);
    ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.ellipse(u * 0.24, -u * 0.015, u * 0.06, u * 0.04, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(hx, hy, u * 0.06, u * 0.045, -0.3, 0, TAU);
    ctx.fill();
    if (proud) {
      // 주판알 하나를 번쩍 들고 우쭐
      drawBead(ctx, hx, hy - u * 0.13, u * 0.24, 7, { t, key: 3, shadow: false, rot: Math.sin(age * 0.2) * 0.2, glow: '#fff3b0' });
    }
  }
  // 머리
  ctx.save();
  ctx.translate(0, -u * 0.72);
  ctx.rotate(huh ? 0.18 : dizzy ? Math.sin(age * 0.15) * 0.2 : Math.sin(t * 0.03) * 0.04);
  const hr = u * 0.24;
  // 귀
  for (const sd of [-1, 1]) {
    ctx.fillStyle = fur2;
    ctx.beginPath();
    ctx.ellipse(sd * hr * 0.7, -hr * 0.78, hr * 0.28, hr * 0.32, sd * 0.3, 0, TAU);
    ctx.fill();
    ctx.fillStyle = cream;
    ctx.beginPath();
    ctx.ellipse(sd * hr * 0.7, -hr * 0.74, hr * 0.14, hr * 0.18, sd * 0.3, 0, TAU);
    ctx.fill();
  }
  // 얼굴 (볼털)
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.moveTo(-hr * 1.15, hr * 0.25);
  ctx.quadraticCurveTo(-hr * 1.05, -hr * 0.95, 0, -hr * 0.95);
  ctx.quadraticCurveTo(hr * 1.05, -hr * 0.95, hr * 1.15, hr * 0.25);
  ctx.lineTo(hr * 0.7, hr * 0.42);
  ctx.quadraticCurveTo(0, hr * 0.85, -hr * 0.7, hr * 0.42);
  ctx.closePath();
  ctx.fill();
  // 이마·주둥이 흰 털
  ctx.fillStyle = cream;
  ctx.beginPath();
  ctx.ellipse(0, -hr * 0.55, hr * 0.32, hr * 0.2, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, hr * 0.3, hr * 0.46, hr * 0.34, 0, 0, TAU);
  ctx.fill();
  // 도둑 가면 (눈 둘레 검은 띠)
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(-hr * 1.02, -hr * 0.12);
  ctx.quadraticCurveTo(-hr * 0.6, -hr * 0.42, -hr * 0.1, -hr * 0.18);
  ctx.quadraticCurveTo(0, -hr * 0.1, hr * 0.1, -hr * 0.18);
  ctx.quadraticCurveTo(hr * 0.6, -hr * 0.42, hr * 1.02, -hr * 0.12);
  ctx.quadraticCurveTo(hr * 0.75, hr * 0.28, hr * 0.22, hr * 0.12);
  ctx.quadraticCurveTo(0, hr * 0.06, -hr * 0.22, hr * 0.12);
  ctx.quadraticCurveTo(-hr * 0.75, hr * 0.28, -hr * 1.02, -hr * 0.12);
  ctx.fill();
  // 눈
  const blink = m === 'idle' && t % 190 < 7;
  for (const sd of [-1, 1]) {
    const ex = sd * hr * 0.45, ey = -hr * 0.06;
    if (proud || blink) {
      ctx.strokeStyle = '#fff6e8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (proud) ctx.arc(ex, ey + hr * 0.06, hr * 0.12, Math.PI * 1.15, Math.PI * 1.85);
      else (ctx.moveTo(ex - hr * 0.12, ey), ctx.lineTo(ex + hr * 0.12, ey));
      ctx.stroke();
    } else if (dizzy) {
      ctx.strokeStyle = '#fff6e8';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let k = 0; k < 14; k++) {
        const a = k * 0.8 + age * 0.3, rr = hr * 0.015 * k;
        ctx.lineTo(ex + Math.cos(a) * rr, ey + Math.sin(a) * rr);
      }
      ctx.stroke();
    } else {
      const er = hr * (wow ? 0.2 : 0.15);
      ctx.fillStyle = '#fffaf0';
      ctx.beginPath();
      ctx.arc(ex, ey, er, 0, TAU);
      ctx.fill();
      const look = flick ? -0.5 : sweat ? 0.3 : 0;
      ctx.fillStyle = '#1a1010';
      ctx.beginPath();
      ctx.arc(ex + er * 0.3 * look + (sweat ? Math.sin(t * 0.3) * er * 0.2 : 0), ey + er * 0.15, er * (wow ? 0.45 : 0.55), 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex - er * 0.25, ey - er * 0.2, er * 0.18, 0, TAU);
      ctx.fill();
    }
  }
  // 동그란 안경 (번쩍)
  ctx.strokeStyle = '#d8a83a';
  ctx.lineWidth = 2;
  for (const sd of [-1, 1]) (ctx.beginPath(), ctx.arc(sd * hr * 0.45, -hr * 0.06, hr * 0.27, 0, TAU), ctx.stroke());
  ctx.beginPath();
  ctx.moveTo(-hr * 0.18, -hr * 0.1);
  ctx.quadraticCurveTo(0, -hr * 0.2, hr * 0.18, -hr * 0.1);
  ctx.stroke();
  if (wow || proud) {
    const gl = 0.5 + 0.5 * Math.sin(age * 0.4);
    ctx.fillStyle = `rgba(255,255,255,${0.5 + 0.4 * gl})`;
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sd * hr * 0.45 - hr * 0.2, -hr * 0.1);
      ctx.lineTo(sd * hr * 0.45 - hr * 0.05, -hr * 0.3);
      ctx.lineTo(sd * hr * 0.45 + hr * 0.02, -hr * 0.24);
      ctx.lineTo(sd * hr * 0.45 - hr * 0.13, -hr * 0.04);
      ctx.fill();
    }
  }
  // 코·입
  ctx.fillStyle = '#1a1010';
  ctx.beginPath();
  ctx.ellipse(0, hr * 0.2, hr * 0.12, hr * 0.08, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#1a1010';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  if (wow) (ctx.fillStyle = '#7a1f20'), ctx.ellipse(0, hr * 0.42, hr * 0.1, hr * 0.12, 0, 0, TAU), ctx.fill();
  else if (sweat) {
    ctx.moveTo(-hr * 0.18, hr * 0.42);
    for (let k = 0; k <= 4; k++) ctx.lineTo(-hr * 0.18 + k * hr * 0.09, hr * 0.42 + (k % 2 ? -1 : 1) * hr * 0.04);
    ctx.stroke();
  } else if (dizzy) (ctx.moveTo(-hr * 0.15, hr * 0.44), ctx.quadraticCurveTo(0, hr * 0.34, hr * 0.15, hr * 0.44), ctx.stroke());
  else {
    ctx.moveTo(-hr * 0.2, hr * 0.33);
    ctx.quadraticCurveTo(-hr * 0.1, hr * (proud ? 0.55 : 0.44), 0, hr * 0.3);
    ctx.quadraticCurveTo(hr * 0.1, hr * (proud ? 0.55 : 0.44), hr * 0.2, hr * 0.33);
    ctx.stroke();
    if (flick) (ctx.fillStyle = '#ff8a9a'), ctx.beginPath(), ctx.ellipse(hr * 0.1, hr * 0.44, hr * 0.06, hr * 0.07, 0, 0, TAU), ctx.fill();
  }
  if (sweat) {
    ctx.fillStyle = '#9fd6ff';
    ctx.beginPath();
    const dy = (age * 0.5) % (hr * 0.6);
    ctx.ellipse(hr * 0.95, -hr * 0.4 + dy, hr * 0.07, hr * 0.11, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  ctx.restore();
  // 어질어질 별 / 쏟아진 주판알
  if (dizzy) {
    ctx.fillStyle = '#ffe066';
    ctx.font = `${Math.max(12, u * 0.12)}px system-ui`;
    ctx.textAlign = 'center';
    for (let k = 0; k < 3; k++) {
      const a = t * 0.12 + (k * TAU) / 3;
      ctx.fillText('★', x - u * 0.15 + Math.cos(a) * u * 0.28, y - u * 1.0 + Math.sin(a) * u * 0.07);
    }
    for (let k = 0; k < 7; k++) {
      const q = cl01(age / 40), bx = x - u * 0.55 - k * u * 0.14 * q * (1 + 0.3 * hsh(k)), by = y - u * 0.02 - Math.abs(Math.sin(age * 0.3 + k)) * u * 0.12 * (1 - q);
      drawBead(ctx, bx, by, u * 0.13, 1 + ((k * 3) % 9), { t, key: k, shadow: false, rot: -age * 0.15 * (1 - q * 0.7) });
    }
    // 버둥대는 발
    for (const sd of [-1, 1]) {
      const kick = Math.sin(age * 0.6 + sd) * u * 0.05;
      ctx.fillStyle = '#2e2622';
      ctx.beginPath();
      ctx.ellipse(x + u * 0.18 + sd * u * 0.09, y - u * 0.12 + kick, u * 0.055, u * 0.075, 0.4, 0, TAU);
      ctx.fill();
    }
  }
  if (huh && age < 40) {
    ctx.fillStyle = '#fff3d6';
    ctx.font = `900 ${Math.max(14, u * 0.16)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillText('?', x + u * 0.32, y - u * 1.0);
  }
}

// ═════════ 주판 틀 ═════════
function drawFrame(ctx: CanvasRenderingContext2D, s: PairState, X: F, Y: F, R: F, t: number) {
  const x0 = X(0.022), x1 = X(0.978), y0 = Y(0.372), y1 = Y(1.018), post = R(0.022);
  // 바닥(계산대 앞) + 틀 그림자
  const fl = ctx.createLinearGradient(0, y1, 0, Y(1.3));
  fl.addColorStop(0, '#3a2214');
  fl.addColorStop(1, '#22130a');
  ctx.fillStyle = fl;
  ctx.fillRect(0, y0, X(1), Y(A) - y0);
  ctx.fillStyle = 'rgba(0,0,0,.4)';
  ctx.beginPath();
  ctx.ellipse(X(0.5), y1 + R(0.012), X(0.5), R(0.025), 0, 0, TAU);
  ctx.fill();
  // 안쪽 뒤판 (어두운 나무)
  const bg = ctx.createLinearGradient(0, y0, 0, y1);
  bg.addColorStop(0, '#2a170c');
  bg.addColorStop(1, '#3a2213');
  ctx.fillStyle = bg;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  ctx.strokeStyle = 'rgba(255,200,140,.05)';
  ctx.lineWidth = 1;
  for (let k = 0; k < 12; k++) {
    ctx.beginPath();
    for (let yy = 0; yy <= 1; yy += 0.1) ctx.lineTo(x0 + (x1 - x0) * (k / 12) + Math.sin(yy * 9 + k) * 3, y0 + (y1 - y0) * yy);
    ctx.stroke();
  }
  // 등불 빛이 뒤판에 번짐
  const lg = ctx.createRadialGradient(X(0.5), y0, R(0.05), X(0.5), y0 + R(0.2), R(0.7));
  lg.addColorStop(0, 'rgba(255,180,110,.16)');
  lg.addColorStop(1, 'rgba(255,180,110,0)');
  ctx.fillStyle = lg;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  // 막대 (지금 있는 줄은 밝게, 빈 자리 줄은 흐리게)
  const c = s.S.c, rows = rowsOf(c.length), cap = Math.max(6, rows);
  for (let r = 0; r < cap; r++) {
    const has = r < rows, yy = Y(has ? dispRow(s, r, rows) : rowY(r, Math.max(6, rows)));
    if (yy > y1 - post) continue;
    ctx.globalAlpha = has ? 1 : 0.3;
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.fillRect(x0 + post, yy + 2, x1 - x0 - post * 2, 2);
    const rg = ctx.createLinearGradient(0, yy - 2, 0, yy + 2);
    rg.addColorStop(0, '#f2d08a');
    rg.addColorStop(1, '#9a7230');
    ctx.fillStyle = rg;
    ctx.fillRect(x0 + post, yy - 1.5, x1 - x0 - post * 2, 3);
    if (has) {
      // 빈칸 자리 표시 (판 안의 빈칸은 구멍, 판 끝 너머는 없음)
      for (let k = 0; k < COLS; k++) {
        const i = r * COLS + k;
        if (i >= c.length || c[i]) continue;
        ctx.fillStyle = 'rgba(0,0,0,.4)';
        ctx.beginPath();
        ctx.ellipse(X(colX(k)), yy, R(0.012), R(0.007), 0, 0, TAU);
        ctx.fill();
      }
      // 줄 끝 → 다음 줄 처음 (↩ 표시)
      if (r < rows - 1) {
        ctx.strokeStyle = 'rgba(242,208,138,.45)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x1 - post * 0.5, yy + R(0.025), R(0.02), -Math.PI / 2, Math.PI / 2);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }
  // 쏙 빠지는 줄: 막대가 번쩍하고 오른쪽으로 쏙
  for (const g of s.gone) {
    const u = t - g.t0;
    if (u < 0 || u > 30) continue;
    const yy = Y(g.y), q = u / 30;
    ctx.globalAlpha = 1 - q;
    ctx.fillStyle = '#fffbe8';
    ctx.fillRect(x0 + post + (x1 - x0) * ease(q) * 0.9, yy - 2.5, (x1 - x0 - post * 2) * (1 - q), 5);
    const sg = ctx.createLinearGradient(0, yy - R(0.04), 0, yy + R(0.04));
    sg.addColorStop(0, 'rgba(220,255,240,0)');
    sg.addColorStop(0.5, `rgba(220,255,240,${0.55 * (1 - q)})`);
    sg.addColorStop(1, 'rgba(220,255,240,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(x0, yy - R(0.04), x1 - x0, R(0.08));
    for (let k = 0; k < 4; k++) {
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      ctx.fillRect(x1 - R(0.1) * k - R(0.3) * q, yy - R(0.02) + k * R(0.013), R(0.12), 1.5);
    }
    ctx.globalAlpha = 1;
  }
  // 빛줄기 (연쇄 자리)
  for (const r of s.rays) {
    const u = t - r.t0;
    if (u < 0 || u > 50) continue;
    const q = u / 50, len = R(0.12 + 0.04 * Math.min(4, r.n)) * ease(u / 10), nray = 10 + 2 * Math.min(4, r.n);
    ctx.save();
    ctx.translate(X(r.x), Y(r.y));
    ctx.rotate(u * 0.03);
    ctx.globalAlpha = 0.5 * (1 - q);
    for (let k = 0; k < nray; k++) {
      const a0 = (k / nray) * TAU;
      ctx.fillStyle = k % 2 ? r.col : '#fff6c8';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a0 - 0.09) * len, Math.sin(a0 - 0.09) * len);
      ctx.lineTo(Math.cos(a0 + 0.09) * len, Math.sin(a0 + 0.09) * len);
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }
  // 붉은 옻칠 틀 (위 들보는 윗면이 보이게)
  const lac = (xa: number, ya: number, ww: number, hh: number, vert: boolean) => {
    const g = vert ? ctx.createLinearGradient(xa, 0, xa + ww, 0) : ctx.createLinearGradient(0, ya, 0, ya + hh);
    g.addColorStop(0, '#d84a36');
    g.addColorStop(0.45, '#a82a20');
    g.addColorStop(1, '#6a1410');
    ctx.fillStyle = g;
    ctx.fillRect(xa, ya, ww, hh);
  };
  lac(x0, y0, post, y1 - y0, true);
  lac(x1 - post, y0, post, y1 - y0, true);
  ctx.fillStyle = '#e8735a';
  ctx.beginPath();
  ctx.moveTo(x0 - R(0.008), y0 - R(0.012));
  ctx.lineTo(x1 + R(0.008), y0 - R(0.012));
  ctx.lineTo(x1, y0);
  ctx.lineTo(x0, y0);
  ctx.fill();
  lac(x0, y0, x1 - x0, post, false);
  lac(x0, y1 - post, x1 - x0, post, false);
  ctx.fillStyle = 'rgba(255,220,190,.35)';
  ctx.fillRect(x0, y0, x1 - x0, 1.5);
  ctx.fillRect(x0, y1 - post, x1 - x0, 1.2);
  // 놋쇠 모서리
  for (const [cx, cy] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]] as [number, number][]) {
    ctx.fillStyle = '#e8c070';
    ctx.beginPath();
    ctx.arc(cx + (cx < X(0.5) ? post / 2 : -post / 2), cy + (cy < Y(0.7) ? post / 2 : -post / 2), post * 0.42, 0, TAU);
    ctx.fill();
  }
}

// ═════════ 판 위의 알 ═════════
function drawBoard(ctx: CanvasRenderingContext2D, s: PairState, X: F, Y: F, R: F, t: number) {
  const S = s.S, L = s.L, c = S.c, rows = rowsOf(c.length), u = R(BWU) * Math.min(1, pitchOf(rows) / PY0 + 0.12);
  const play = s.phase === 'play';
  const sel = play && s.sel >= 0 && s.sel < c.length && c[s.sel] ? s.sel : -1, selQ = sel >= 0 ? ease((t - s.selT) / 6) : 0;
  const parts = sel >= 0 ? partnersOf(c, sel) : [];
  const stuck = play && t >= s.busyUntil && c.length > 0 && !hasPair(c);
  const addAt = new Map<number, Add>();
  for (const a of s.adds) addAt.set(a.idx, a);
  // 고른 알 → 짝 후보로 점선
  if (sel >= 0) {
    const sx = X(colX(sel % COLS)), sy = Y(dispRow(s, (sel / COLS) | 0, rows));
    ctx.strokeStyle = `rgba(255,240,170,${0.55 + 0.25 * Math.sin(t * 0.25)})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.lineDashOffset = -t * 0.5;
    for (const j of parts) {
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(X(colX(j % COLS)), Y(dispRow(s, (j / COLS) | 0, rows)));
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }
  for (let i = 0; i < c.length; i++) {
    if (!c[i]) continue;
    const col = i % COLS, r = (i / COLS) | 0;
    let x = X(colX(col)), y = Y(dispRow(s, r, rows));
    const ad = addAt.get(i);
    if (ad) {
      const q = (t - ad.t0) / 16;
      if (q < 0) continue;
      if (q < 1) {
        const e = ease(q);
        x = X(ad.fx) + (x - X(ad.fx)) * e;
        y = Y(ad.fy) + (y - Y(ad.fy)) * e - Math.sin(q * Math.PI) * R(0.08);
      }
    }
    const isSel = i === sel, isPart = parts.includes(i);
    const lock = !!(c[i] & LOCK), gold = !!(c[i] & GOLD);
    drawBead(ctx, x, y, u, c[i] & VM, {
      t, key: i, lift: isSel ? R(0.016) * selQ + Math.sin(t * 0.2) * 1.2 : 0, scale: isSel ? 1 + 0.1 * selQ : isPart ? 1.04 + 0.03 * Math.sin(t * 0.3 + i) : 1,
      glow: isSel ? '#fff3b0' : isPart ? '#fff8d0' : gold ? '#ffd23f' : null, ring: isPart, lock, gold, dim: sel >= 0 && !isSel && !isPart,
    });
    if (gold && !lock) {
      ctx.fillStyle = '#ffffff';
      ctx.font = `${Math.max(12, u * 0.3)}px system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🌟', x - u * 0.42, y - u * 0.36 + Math.sin(t * 0.12 + i) * 1.5);
    }
    if (isPart) star4(ctx, x + u * 0.42, y - u * 0.42, R(0.006) * (1 + 0.5 * Math.sin(t * 0.3 + i)), 'rgba(255,248,190,.9)');
  }
  // 잠금 풀림: 끊어진 새끼줄 조각이 튄다
  for (const q of s.unl) {
    const a = t - q.t0;
    if (a < 0 || a > 40) continue;
    for (let k = 0; k < 4; k++) {
      const dx = (k - 1.5) * R(0.02) * (1 + a * 0.08), dy = -R(0.003) * a + R(0.0004) * a * a;
      ctx.save();
      ctx.translate(X(q.x) + dx, Y(q.y) + dy);
      ctx.rotate(a * 0.2 * (k % 2 ? 1 : -1));
      ctx.globalAlpha = cl01((40 - a) / 15);
      ctx.fillStyle = '#c9a25a';
      ctx.fillRect(-R(0.015), -R(0.004), R(0.03), R(0.008));
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
  // 튕겨 나가는 알: 터지기 전엔 그 자리(맞닿으며 딸깍), 터지면 빙글 날아간다
  for (const f of s.fly) {
    const a = t - f.t0;
    if (a > 28) continue;
    if (a < 0) {
      const nudge = cl01(1 - -a / 6) * f.dir * R(0.012);
      drawBead(ctx, X(f.x) + nudge, Y(f.y), u, f.v, { t, key: f.v, gold: f.gold, glow: a > -5 ? '#fff6c0' : null });
      continue;
    }
    const side = f.dir || (f.spin > 0 ? 1 : -1), up = 0.014 + 0.002 * Math.min(4, f.n);
    const x = X(f.x) + side * R(0.006) * a * (f.how === 'pair' ? -1 : 1), y = Y(f.y) - R(up) * a + R(0.0009) * a * a;
    drawBead(ctx, x, y, u, f.v, { t, key: f.v, gold: f.gold, rot: f.spin * a, scale: a < 4 ? 1 + 0.06 * a : Math.max(0.45, 1.24 - (a - 4) * 0.03), alpha: cl01((28 - a) / 10), shadow: false });
  }
  // 막혔을 때: 판 위에 살짝 안내
  if (stuck && S.re > 0) {
    ctx.fillStyle = `rgba(30,12,2,${0.25 + 0.1 * Math.sin(t * 0.15)})`;
    ctx.fillRect(X(0.04), Y(0.39), X(0.92), R(0.05));
    ctx.font = `900 ${Math.max(13, R(0.04))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffe9c4';
    ctx.fillText('지울 짝이 없어요 → 아래 ➕ 톡!', X(0.5), Y(0.415));
  }
  void L;
}

// ═════════ ➕ 다시 붙이기 나무패 · 촛불 · 콤보 ═════════
function drawReaddTag(ctx: CanvasRenderingContext2D, s: PairState, X: F, Y: F, R: F, t: number, font: (sz: number, w?: number) => void) {
  const S = s.S, L = s.L, stuck = s.phase === 'play' && t >= s.busyUntil && S.c.length > 0 && !hasPair(S.c) && S.re > 0;
  const on = S.re > 0, pulse = stuck ? 1 + 0.06 * Math.sin(t * 0.3) : 1;
  const cx = X(RBX), cy = Y(RBY), bw = R(RBW) * pulse, bh = R(RBH) * pulse;
  ctx.fillStyle = 'rgba(0,0,0,.4)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + bh * 0.62, bw * 0.48, bh * 0.2, 0, 0, TAU);
  ctx.fill();
  if (stuck) {
    const g = ctx.createRadialGradient(cx, cy, bh * 0.3, cx, cy, bw * 0.75);
    g.addColorStop(0, 'rgba(180,255,200,.45)');
    g.addColorStop(1, 'rgba(180,255,200,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - bw, cy - bw * 0.5, bw * 2, bw);
  }
  // 두께
  ctx.fillStyle = on ? '#6a3e1e' : '#3a2a20';
  ctx.beginPath();
  ctx.roundRect(cx - bw / 2, cy - bh / 2 + 4, bw, bh, bh * 0.35);
  ctx.fill();
  const g = ctx.createLinearGradient(0, cy - bh / 2, 0, cy + bh / 2);
  g.addColorStop(0, on ? (stuck ? '#d8f8c8' : '#e8c08a') : '#6a5a4a');
  g.addColorStop(1, on ? (stuck ? '#8ac878' : '#b07a48') : '#4a3a2e');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(cx - bw / 2, cy - bh / 2, bw, bh, bh * 0.35);
  ctx.fill();
  ctx.strokeStyle = on ? 'rgba(255,240,210,.7)' : 'rgba(255,255,255,.2)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // 끈 구멍
  ctx.fillStyle = 'rgba(40,20,5,.6)';
  ctx.beginPath();
  ctx.arc(cx - bw / 2 + bh * 0.4, cy, bh * 0.1, 0, TAU);
  ctx.fill();
  font(0.042, 900);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = on ? '#3a1c08' : 'rgba(255,255,255,.4)';
  ctx.fillText(`➕ 다시 붙이기 ×${S.re}`, cx + R(0.012), cy + 1);
  // 촛불 판: 녹기까지 남은 짝
  if (L.decay) {
    const left = L.decay - S.dc, x = cx - bw / 2 - R(0.07), y = cy + R(0.02);
    const fl = 1 + 0.12 * Math.sin(t * 0.3) + 0.06 * Math.sin(t * 0.77);
    const gg = ctx.createRadialGradient(x, y - R(0.06), 1, x, y - R(0.06), R(0.09) * fl);
    gg.addColorStop(0, 'rgba(255,200,120,.5)');
    gg.addColorStop(1, 'rgba(255,170,90,0)');
    ctx.fillStyle = gg;
    ctx.fillRect(x - R(0.1), y - R(0.16), R(0.2), R(0.2));
    const ch = R(0.012 + 0.011 * left);
    ctx.fillStyle = '#f2e6cf';
    ctx.fillRect(x - R(0.012), y - ch, R(0.024), ch);
    ctx.fillStyle = '#ffcf6b';
    ctx.beginPath();
    ctx.ellipse(x, y - ch - R(0.014), R(0.008) * fl, R(0.016) * fl, Math.sin(t * 0.2) * 0.15, 0, TAU);
    ctx.fill();
    font(0.032, 900);
    ctx.fillStyle = '#ffe2b8';
    ctx.fillText(`${left}`, x + R(0.035), y - R(0.01));
  }
  // 콤보 불꽃
  if (S.combo >= 2 && s.phase === 'play') {
    const x = cx + bw / 2 + R(0.085), y = cy, k = Math.min(5, S.combo);
    const fl = 1 + 0.1 * Math.sin(t * 0.4);
    ctx.fillStyle = '#ffffff';
    ctx.font = `${Math.max(16, R(0.05 + 0.006 * k) * fl)}px system-ui`;
    ctx.fillText('🔥', x - R(0.03), y);
    font(0.04, 900);
    ctx.fillStyle = '#ffb3e6';
    ctx.fillText(`×${S.combo}`, x + R(0.03), y + 1);
  }
}

function drawHud(ctx: CanvasRenderingContext2D, s: PairState, d: StageDef, w: number, X: F, Y: F, R: F, font: (sz: number, w?: number) => void, th: Theme) {
  const t = s.t, S = s.S, L = s.L;
  const hb = R(0.066);
  ctx.fillStyle = 'rgba(24,12,4,.9)';
  ctx.fillRect(0, 0, w, hb);
  font(0.04, 900);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffeedd';
  ctx.fillText(`${s.stage + 1}/${STAGES.length}판 · ${d.emoji} ${d.name}`, R(0.03), hb * 0.52);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffd166';
  const stt = `★ ${s.stars}`;
  ctx.fillText(stt, w - R(0.03), hb * 0.52);
  ctx.fillStyle = th.hot;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - R(0.06) - ctx.measureText(stt).width, hb * 0.52);
  // 여우 손님 주문 쪽지: 주문한 알 × 개수 + 지운 만큼 채워지는 점
  if (L.goal === 'count') {
    const bx = X(0.04), by = Y(0.112), bw2 = R(0.27), bh2 = R(0.105), bob = s.guest === 'happy' ? Math.sin(t * 0.4) * 2 : 0;
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath();
    ctx.roundRect(bx + 2, by + 3 + bob, bw2, bh2, R(0.025));
    ctx.fill();
    ctx.fillStyle = 'rgba(255,250,240,.98)';
    ctx.beginPath();
    ctx.roundRect(bx, by + bob, bw2, bh2, R(0.025));
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(bx + bw2 - R(0.06), by + bh2 - 1 + bob);
    ctx.lineTo(bx + bw2 - R(0.01), by + bh2 + R(0.035) + bob);
    ctx.lineTo(bx + bw2 - R(0.025), by + bh2 - 1 + bob);
    ctx.fill();
    drawBead(ctx, bx + R(0.055), by + R(0.04) + bob, R(0.075), L.target, { t, key: 1, shadow: false });
    font(0.044, 900);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#5a2a10';
    ctx.fillText(`× ${L.need}개!`, bx + R(0.105), by + R(0.042) + bob);
    const n = L.need, dw = Math.min(R(0.022), (bw2 - R(0.03)) / n), d0 = bx + bw2 / 2 - (dw * (n - 1)) / 2;
    for (let k = 0; k < n; k++) {
      const on = k < S.got;
      ctx.fillStyle = on ? BEAD[L.target] : 'rgba(120,80,50,.25)';
      ctx.beginPath();
      ctx.arc(d0 + k * dw, by + R(0.083) + bob, dw * 0.38, 0, TAU);
      ctx.fill();
    }
  }
  // 판 시작 큰 글씨
  {
    const age = t - s.startT;
    if (age < 80 && s.phase === 'play') {
      const a = Math.min(1, age / 8, (80 - age) / 16), sc = 1 + Math.max(0, 8 - age) * 0.04;
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(30,12,2,.62)';
      ctx.fillRect(0, Y(0.14), w, R(0.14));
      ctx.save();
      ctx.translate(w / 2, Y(0.195));
      ctx.scale(sc, sc);
      font(0.068, 900);
      ctx.textAlign = 'center';
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(30,12,2,.85)';
      const big = `${d.emoji} ${s.stage + 1}판 · ${d.name}`;
      ctx.strokeText(big, 0, 0);
      ctx.fillStyle = '#fff1d6';
      ctx.fillText(big, 0, 0);
      font(0.038, 800);
      const sub = L.goal === 'count' ? `${L.target}${josa(L.target)} ${L.need}개 다 지워요` : L.goal === 'rows' ? `줄 ${L.need}개를 쏙 빼요` : '판을 다 비워요';
      ctx.strokeText(sub, 0, R(0.052));
      ctx.fillText(sub, 0, R(0.052));
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }
  drawSpot(ctx, s, w, X, Y, R, font);
  // 결과
  if (s.phase === 'result') {
    const age = s.pt, a = Math.min(1, age / 10);
    ctx.globalAlpha = a;
    ctx.fillStyle = s.ok ? 'rgba(50,24,6,.78)' : 'rgba(70,16,12,.78)';
    ctx.fillRect(0, Y(0.56), w, R(0.27));
    ctx.textAlign = 'center';
    font(s.ok ? 0.056 : 0.048, 900);
    ctx.fillStyle = s.ok ? '#fff1a8' : '#ffd0c8';
    ctx.fillText(s.ok ? (s.won ? '장사 대성공! 🎉' : `${d.emoji} ${d.name} 성공!`) : s.why, w / 2, Y(0.62));
    if (s.ok) {
      for (let k = 0; k < 3; k++) {
        const ag = age - 14 - k * 10, got = k < s.got;
        if (ag < 0) continue;
        const sc = got ? 1 + Math.max(0, 1 - ag / 8) * 0.8 : 1;
        font(0.08 * sc, 900);
        ctx.fillStyle = got ? '#ffd166' : 'rgba(255,255,255,.35)';
        ctx.fillText(got ? '★' : '☆', w / 2 + (k - 1) * R(0.1), Y(0.71));
        if (got && (juice(s).memo['star' + k] ?? -1) < s.clearT) (juice(s).memo['star' + k] = s.clearT), juice(s).burst(w / 2 + (k - 1) * R(0.1), Y(0.71), '#ffe066', 14, 3, 2.4);
      }
      font(0.034, 800);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`톡톡 ${S.moves}번 (★ ${L.P}번 안에) · ➕ ${S.used}번 (★ ${L.R}번까지)`, w / 2, Y(0.785));
    } else {
      font(0.04, 800);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(s.hearts > 0 ? '♥ -1 · 이 판을 처음부터 다시' : '하트를 다 썼어요 — 끝', w / 2, Y(0.72));
    }
    ctx.globalAlpha = 1;
  }
  // ═════════ 아래 띠: 별 목표 · 안내 ═════════
  {
    const y0 = Y(1.125);
    const bg = ctx.createLinearGradient(0, y0, 0, Y(A));
    bg.addColorStop(0, 'rgba(24,12,4,0)');
    bg.addColorStop(0.2, 'rgba(24,12,4,.85)');
    bg.addColorStop(1, 'rgba(24,12,4,.95)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, y0, w, Y(A) - y0);
    const y2 = Y(1.172), res = s.phase === 'result' && s.ok;
    let n = 0;
    for (const x of S.c) if (x) n++;
    const goalTxt = L.goal === 'count' ? `🦊 ${L.target} ${Math.min(S.got, L.need)}/${L.need}` : L.goal === 'rows' ? `🎯 줄 ${Math.min(S.rows, L.need)}/${L.need}` : `비우기 · 남은 ${n}`;
    const chips = [
      { txt: goalTxt, st: res ? true : null },
      { txt: `톡톡 ${S.moves}/${L.P}`, st: S.moves > L.P ? false : res ? true : null },
      { txt: L.R ? `➕ ${L.R}번까지` : '➕ 안 쓰기', st: S.used > L.R ? false : res ? true : null },
    ];
    const gx0 = R(0.02), gw = (w - R(0.04)) / 3;
    chips.forEach(({ txt, st }, k) => {
      const gx = gx0 + k * gw;
      ctx.fillStyle = st === true ? 'rgba(255,209,102,.3)' : st === false ? 'rgba(0,0,0,.35)' : 'rgba(255,235,210,.12)';
      ctx.beginPath();
      ctx.roundRect(gx + 2, y2 - R(0.027), gw - 4, R(0.054), R(0.027));
      ctx.fill();
      ctx.textAlign = 'center';
      const label = `${st === true ? '★' : st === false ? '✗' : '☆'} ${txt}`;
      let fs = 0.033;
      font(fs, 800);
      while (ctx.measureText(label).width > gw - R(0.03) && fs > 0.0355 * 0 + 0.03) font((fs -= 0.001), 800);
      ctx.fillStyle = st === false ? 'rgba(255,255,255,.45)' : '#fff6e0';
      ctx.fillText(label, gx + gw / 2, y2 + 1);
    });
    const y3 = Y(1.243);
    let tp = '👆 알을 톡 → 반짝이는 짝을 톡하면 딸깍!';
    if (s.phase === 'result') tp = s.ok ? '다음 손님이 와요!' : '같은 판을 다시 — 이번엔 어느 짝부터 지울지 골라서';
    else if (s.sel >= 0) tp = '반짝이는 짝을 톡! · 같은 알을 다시 톡하면 내려놓기';
    else if (s.phase === 'play' && t >= s.busyUntil && S.c.length && !hasPair(S.c) && S.re > 0) tp = '막혔어요 — ➕ 다시 붙이기를 톡!';
    else if (s.stage > 0 || S.moves > 0) tp = S.moves === 0 && s.stage === 0 ? tp : d.tip;
    ctx.textAlign = 'center';
    const newsOn = s.news && t - s.news.t < NEWS_T + 20;
    if (newsOn && s.news) {
      // 새것 알림: 안내 줄 자리에 빛나는 쪽지로 (판·가게를 가리지 않게)
      const age = t - s.news.t, a = Math.min(1, age / 8, (NEWS_T + 20 - age) / 20), pop = 1 + Math.max(0, 8 - age) * 0.03;
      const tx = `✨ ${s.news.text}`;
      let fs = 0.036;
      font(fs, 900);
      while (ctx.measureText(tx).width > w - R(0.06) && fs > 0.03) font((fs -= 0.001), 900);
      const tw2 = Math.min(w - 6, ctx.measureText(tx).width + 22);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(w / 2, y3);
      ctx.scale(pop, pop);
      ctx.fillStyle = 'rgba(255,214,120,.96)';
      ctx.beginPath();
      ctx.roundRect(-tw2 / 2, -R(0.028), tw2, R(0.056), R(0.028));
      ctx.fill();
      ctx.strokeStyle = '#fff6d0';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#3a1c06';
      ctx.fillText(tx, 0, 1);
      ctx.restore();
    } else {
      let fs = 0.034;
      font(fs, 800);
      while (ctx.measureText(tp).width > w - R(0.04) && fs > 0.03) font((fs -= 0.001), 800);
      ctx.fillStyle = 'rgba(255,236,214,.92)';
      ctx.fillText(tp, w / 2, y3);
    }
    font(0.03, 700);
    ctx.fillStyle = 'rgba(255,220,180,.6)';
    ctx.fillText('같은 색 계열(연한·진한)끼리 짝 · 1+9 2+8 3+7 4+6 5+5', w / 2, Y(1.3));
  }
  // 첫 판: 손가락으로 첫 짝 가리키기
  if (s.stage === 0 && S.moves === 0 && s.phase === 'play' && t - s.startT > 30) {
    const m = L.plan[0];
    if (m && m.a >= 0) {
      const k = s.sel === m.a ? m.b : m.a, rows = rowsOf(S.c.length);
      const bob = Math.sin(t * 0.15) * R(0.012);
      const fx0 = X(colX(k % COLS)), fy = Y(rowY((k / COLS) | 0, rows) + 0.065) + bob;
      ctx.font = `${Math.max(20, R(0.075))}px system-ui`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('👆', fx0 + R(0.015), fy);
      ctx.strokeStyle = 'rgba(255,255,255,.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(fx0, Y(rowY((k / COLS) | 0, rows)), R(0.06) + Math.sin(t * 0.15) * 2, R(0.05), 0, 0, TAU);
      ctx.stroke();
    }
  }
  ctx.textBaseline = 'alphabetic';
}

/** 새 장치 스포트라이트: 그 판을 처음 할 때, 판 소개 뒤 2초쯤 주변을 어둡게 하고 장치에 빛을 비춘다 */
function drawSpot(ctx: CanvasRenderingContext2D, s: PairState, w: number, X: F, Y: F, R: F, font: (sz: number, w?: number) => void) {
  if (s.retry || s.phase !== 'play') return;
  const age = s.t - s.startT;
  if (age < 88 || age > 225) return;
  const L = s.L, S = s.S, key = STAGES[s.stage].key, rows = rowsOf(S.c.length);
  let x = -1, y = -1, rr = 0.09, label = '';
  const at = (i: number) => ((x = colX(i % COLS)), (y = rowY((i / COLS) | 0, rows)));
  if (key === 'readd') (x = RBX), (y = RBY), (rr = 0.2), (label = '➕ 막히면 톡 — 남은 수가 판 끝에 또 붙어요');
  else if (key === 'lock') {
    const i = S.c.findIndex((v) => v & LOCK);
    if (i >= 0) at(i), (label = '🔒 잠긴 알 — 바로 옆 알을 지우면 툭 풀려요');
  } else if (key === 'order') (x = 0.18), (y = 0.18), (rr = 0.16), (label = `🦊 주문: ${L.target}${josa(L.target)} ${L.need}개 다 — 판은 안 비워도 돼요`);
  else if (key === 'gold') {
    const i = S.c.findIndex((v) => v & GOLD);
    if (i >= 0) at(i), (label = '🌟 황금 알 — 지우면 같은 수가 모두 딸깍!');
  } else if (key === 'rows') (x = 0.17), (y = 1.172), (rr = 0.13), (label = `🎯 줄 ${L.need}개만 쏙 빼면 성공!`);
  else if (key === 'candle') (x = RBX - RBW / 2 - 0.07), (y = RBY - 0.02), (rr = 0.09), (label = '🕯️ 짝 4번마다 ➕ 하나가 녹아요');
  if (x < 0 || !label) return;
  const a = Math.min(1, (age - 88) / 10, (225 - age) / 18), cx = X(x), cy = Y(y), r = R(rr) * (1 + 0.05 * Math.sin(age * 0.2));
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(20,8,0,.62)';
  ctx.beginPath();
  ctx.rect(0, R(0.066), w, Y(A) - R(0.066));
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
  ctx.fillStyle = 'rgba(70,30,8,.96)';
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
