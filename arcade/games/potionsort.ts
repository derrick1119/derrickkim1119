/**
 * 마녀 고양이 물약 정렬 (26라운드: 검증된 요즘 캐주얼 뼈대 × 공장의 와우, '추상 퍼즐 대조군') — 부어 담기 정렬 × 가리키기(톡).
 * 뼈대: 요즘 잘 팔리는 '부어 담기 정렬' 퍼즐. 병마다 색 물약이 층층이 쌓여 있고, 맨 위 색만 같은 색 위나 빈 병에 부을 수 있다.
 * 조작(기준 9): 병을 톡(들어 올림 — 부을 수 있는 병들이 반짝) → 다른 병을 톡(병이 날아가 기울며 콸콸). 톡 두 번이 전부, 끌기 없음.
 *   같은 병을 다시 톡 = 내려놓기. 키보드는 화살표 커서 + 스페이스.
 * 규칙(결정적): 붓기 한 번에 맨 위 같은 색 덩어리를 들어갈 만큼 붓는다. 한 색을 한 병에 다 모으면 '펑' 코르크가 닫히며 완성(잠김).
 *   판마다 붓기 한도(🔮)가 있고, 한도를 다 쓰거나 더 부을 곳이 없으면 그 판 실패(하트 -1, 그 판을 처음부터).
 * 와우(비틀기): 💥 부글 물약만은 색을 안 가리고 아무 병에나 부을 수 있다 — 닿은 색 한 칸과 섞이는 순간 '퐁!' 연기로 둘 다 날아가
 *   막힌 병이 뚫린다(고양이 마녀는 연기를 뒤집어써 털이 부스스). 한 병이 한 색으로 가득 차면 '펑' 반짝 완성 + 꼬리를 바짝 세우고 우쭐.
 * 판 8개: 목표 = 모든 색 완성. 별 = ★ 완성 · ★ 붓기 P번 안에 · ★ 손님 주문(📜 그 색을 먼저 완성).
 * 펼쳐짐(하는 일이 바뀐다): 1판 톡톡 붓기·손님 주문 → 2판 💥 부글 물약(어디에 터뜨릴까) → 3판 ❓ 숨은 색(파 보며 계획)
 *   → 4판 🧊 얼음 병(옆 병을 펑 완성해야 녹는다 — 녹일 순서) → 5판 🫙 작은 병(3칸)·두 손님(순서대로)
 *   → 6판 🔥 가마솥(아무 색이나 한 칸 끓여 버리기, 2번 — 언제 아껴 쓸까) → 7판 🎀 리본 색(완성하면 새 빈 병이 쿵) → 8판 🌕 보름달(전부).
 * 웃음: 고양이 마녀가 완성마다 꼬리를 바짝·코를 치켜들고 우쭐, 퐁 연기엔 털이 부스스 '콜록', 붓기가 바닥나면 식은땀, 실패하면 어질어질.
 *   창가의 부엉이 손님은 주문한 물약이 먼저 나오면 날개를 퍼덕이며 '부엉!', 다른 색이 먼저 나오면 시무룩. 천장의 박쥐는 펑에 놀라 퍼덕.
 */
import { mulberry32, shuffle, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.45;
/** 💥 부글 물약 (정렬할 색이 아니다) */
export const FZ = 9;
/** 봇 모형에서 숨은 층(모르는 색)의 시작 번호 */
const UNK0 = 20;
/** 가마솥으로 붓기 */
export const CAUL = -2;
const STAR_PTS = 100, WIN_PTS = 100, LEFT_PTS = 3;
const POUR_T = 30, RESULT_OK = 170, RESULT_FAIL = 150, NEWS_T = 200;

// ───────────────────────────── 판 ─────────────────────────────
export interface StageDef {
  key: string; name: string; emoji: string; news: string; tip: string;
  /** 색 수 · 빈 병 · 작은 빈 병(3칸) · 부글 물약 칸 수 · 숨은 층(병마다 아래 몇 칸) · 얼음 병 · 가마솥 횟수 · 리본 색 · 주문 길이 */
  colors: number; empties: number; small: number; fizz: number; hidden: number; ice: number; burn: number; gift: boolean; orders: number;
  /** ★ 붓기 기준 = 풀이 + slack · 실패 한도 = 풀이 × failK + failA */
  slack: number; failK: number; failA: number;
}
export const STAGES: StageDef[] = [
  { key: 'basic', name: '첫 물약', emoji: '🌱', news: '🧪 병을 톡 → 다른 병을 톡하면 콸콸!', tip: '같은 색 위나 빈 병에만 부어져요', colors: 3, empties: 1, small: 0, fizz: 0, hidden: 0, ice: 0, burn: 0, gift: false, orders: 1, slack: 1, failK: 3, failA: 6 },
  { key: 'fizz', name: '부글 물약', emoji: '💥', news: '💥 부글 물약은 아무 색 위에나 — 퐁! 둘 다 날아가요', tip: '💥은 막힌 색 위에 터뜨려요', colors: 3, empties: 2, small: 0, fizz: 1, hidden: 0, ice: 0, burn: 0, gift: false, orders: 1, slack: 1, failK: 2.2, failA: 5 },
  { key: 'hidden', name: '숨은 색', emoji: '❓', news: '❓ 숨은 색 — 위가 비면 보여요', tip: '❓ 위를 비워야 무슨 색인지 보여요', colors: 4, empties: 2, small: 0, fizz: 0, hidden: 1, ice: 0, burn: 0, gift: false, orders: 1, slack: 2, failK: 1.6, failA: 6 },
  { key: 'ice', name: '얼음 병', emoji: '🧊', news: '🧊 얼음 병 — 바로 옆 병이 펑 완성되면 녹아요', tip: '🧊 옆 병부터 완성해서 녹여요', colors: 4, empties: 2, small: 0, fizz: 0, hidden: 0, ice: 1, burn: 0, gift: false, orders: 1, slack: 1, failK: 1.6, failA: 5 },
  { key: 'small', name: '작은 병', emoji: '🫙', news: '🫙 작은 병은 3칸뿐 · 손님이 둘 — 순서대로!', tip: '🫙 작은 병은 3칸 — 잠깐 맡기는 곳', colors: 5, empties: 1, small: 2, fizz: 0, hidden: 0, ice: 0, burn: 0, gift: false, orders: 2, slack: 1, failK: 1.6, failA: 5 },
  { key: 'caul', name: '가마솥', emoji: '🔥', news: '🔥 가마솥 — 아무 색이나 한 칸 끓여 버려요 (2번)', tip: '🔥 가마솥은 2번뿐 — 아껴서 막힌 곳에', colors: 5, empties: 1, small: 0, fizz: 0, hidden: 0, ice: 0, burn: 2, gift: false, orders: 1, slack: 1, failK: 1.6, failA: 5 },
  { key: 'gift', name: '리본 물약', emoji: '🎀', news: '🎀 리본 색을 완성하면 새 빈 병이 쿵!', tip: '🎀 리본 색부터 모으면 빈 병이 생겨요', colors: 5, empties: 1, small: 0, fizz: 0, hidden: 0, ice: 0, burn: 0, gift: true, orders: 1, slack: 1, failK: 1.6, failA: 5 },
  { key: 'moon', name: '보름달', emoji: '🌕', news: '🌕 보름달 밤 — 다 나와요!', tip: '💥 🧊 🔥 — 손님 둘, 순서대로!', colors: 4, empties: 2, small: 0, fizz: 1, hidden: 0, ice: 1, burn: 1, gift: false, orders: 2, slack: 1, failK: 1.6, failA: 6 },
];
export const STAGE_COUNT = STAGES.length;

export interface Level {
  n: number; cap: number[]; init: number[][]; hid0: number[]; ice0: number; live0: number;
  /** 선물 병 자리 · 리본 색 (-1 없음) */
  gslot: number; ribbon: number;
  /** 색별 칸 수 (FZ 포함, 길이 10) · 쓰는 색 · 주문 · 가마솥 횟수 */
  total: number[]; cols: number[]; order: number[]; burn: number;
  /** 바로 옆 병(같은 선반) 비트 */
  nb: number[];
  /** 병 바닥 가운데 (화면 좌표: 가로 0~1, 세로 0~A) */
  px: number[]; py: number[];
  par: number; P: number; limit: number; plan: Mv[];
  habit: { ok: boolean; stars: number; pours: number };
}
export interface Mv { s: number; d: number }

export interface Sim {
  b: number[][]; hid: number[]; ice: number; live: number; done: number;
  rem: number[]; oi: number; ook: boolean; burn: number; pours: number; fail: number; clear: boolean; got: number[];
}
export type RE =
  | { k: 'pour'; s: number; d: number; c: number; n: number }
  | { k: 'poof'; s: number; d: number; c: number }
  | { k: 'burn'; s: number; c: number }
  | { k: 'done'; i: number; c: number; ok: boolean }
  | { k: 'vanish'; c: number }
  | { k: 'melt'; i: number }
  | { k: 'gift'; i: number }
  | { k: 'reveal'; i: number; c: number };

export function newSim(L: Level): Sim {
  const rem = L.total.slice();
  return { b: L.init.map((x) => x.slice()), hid: L.hid0.slice(), ice: L.ice0, live: L.live0, done: 0, rem, oi: 0, ook: true, burn: L.burn, pours: 0, fail: 0, clear: false, got: [] };
}
export const cloneSim = (S: Sim): Sim => ({ ...S, b: S.b.map((x) => x.slice()), hid: S.hid.slice(), rem: S.rem.slice(), got: S.got.slice() });

const usable = (S: Sim, i: number) => ((S.live >> i) & 1) === 1 && !((S.done >> i) & 1) && !((S.ice >> i) & 1);
const topOf = (b: number[]) => b[b.length - 1];
function runLen(b: number[]) {
  const c = topOf(b);
  let k = 0;
  for (let j = b.length - 1; j >= 0 && b[j] === c; j--) k++;
  return k;
}

/** s 병의 맨 위를 d 병(또는 가마솥)에 부을 수 있나 */
export function canPour(L: Level, S: Sim, s: number, d: number): boolean {
  if (s < 0 || !usable(S, s)) return false;
  const src = S.b[s];
  if (!src.length) return false;
  const c = topOf(src);
  if (c >= UNK0) return false;
  if (d === CAUL) return S.burn > 0;
  if (d === s || d < 0 || !usable(S, d)) return false;
  const dst = S.b[d];
  if (!dst.length) return true;
  const e = topOf(dst);
  if (c === FZ && e !== FZ) return true; // 💥 아무 색 위에나 (가득 차 있어도 — 맨 위 한 칸과 함께 날아간다)
  return e === c && dst.length < L.cap[d];
}

function reveal(S: Sim, i: number, rec?: RE[]) {
  const len = S.b[i].length;
  if (S.hid[i] > 0 && S.hid[i] >= len) {
    S.hid[i] = Math.max(0, len - 1);
    if (len) rec?.push({ k: 'reveal', i, c: topOf(S.b[i]) });
  }
}

/** c 색이 한 병에 다 모였는지 보고 '펑' */
function settle(L: Level, S: Sim, c: number, rec?: RE[]) {
  if (c === FZ || c >= UNK0 || c < 0) return;
  if (S.rem[c] === 0) {
    if (!S.got.includes(c)) {
      S.got.push(c);
      if (S.oi < L.order.length) S.ook = false;
      rec?.push({ k: 'vanish', c });
    }
    return;
  }
  for (let i = 0; i < L.n; i++) {
    if (!((S.live >> i) & 1) || (S.done >> i) & 1) continue;
    const b = S.b[i];
    if (b.length !== S.rem[c] || b[0] !== c || !b.every((x) => x === c)) continue;
    S.done |= 1 << i;
    S.hid[i] = 0;
    S.got.push(c);
    let ok = false;
    if (S.oi < L.order.length) {
      if (L.order[S.oi] === c) (S.oi++, (ok = true));
      else S.ook = false;
    }
    rec?.push({ k: 'done', i, c, ok });
    const melt = S.ice & L.nb[i];
    if (melt) {
      S.ice &= ~melt;
      for (let j = 0; j < L.n; j++) if ((melt >> j) & 1) rec?.push({ k: 'melt', i: j });
    }
    if (c === L.ribbon && L.gslot >= 0 && !((S.live >> L.gslot) & 1)) {
      S.live |= 1 << L.gslot;
      rec?.push({ k: 'gift', i: L.gslot });
    }
    return;
  }
}

/** 붓기 한 번 (부를 쪽이 canPour 확인) */
export function pour(L: Level, S: Sim, s: number, d: number, rec?: RE[]) {
  S.pours++;
  const src = S.b[s], c = topOf(src);
  if (d === CAUL) {
    src.pop();
    S.rem[c]--;
    S.burn--;
    rec?.push({ k: 'burn', s, c });
    reveal(S, s, rec);
    settle(L, S, c, rec);
  } else {
    const dst = S.b[d], e = dst.length ? topOf(dst) : -1;
    if (c === FZ && e >= 0 && e !== FZ) {
      src.pop();
      dst.pop();
      S.rem[FZ]--;
      S.rem[e]--;
      rec?.push({ k: 'poof', s, d, c: e });
      reveal(S, s, rec);
      reveal(S, d, rec);
      settle(L, S, e, rec);
    } else {
      const n = Math.min(runLen(src), L.cap[d] - dst.length);
      for (let k = 0; k < n; k++) dst.push(src.pop()!);
      rec?.push({ k: 'pour', s, d, c, n });
      reveal(S, s, rec);
      settle(L, S, c, rec);
    }
  }
  // 위 칸이 빠져 드러난 병이 그 색 전부일 수도 (예: 퐁으로 마지막 방해 칸이 날아감)
  for (const x of L.cols) if (!S.got.includes(x)) settle(L, S, x, rec);
  S.clear = L.cols.every((x) => S.got.includes(x));
  if (S.clear) return;
  if (S.pours >= L.limit) S.fail = 1;
  else if (!anyMove(L, S)) S.fail = 2;
}

export function anyMove(L: Level, S: Sim) {
  for (let s = 0; s < L.n; s++) {
    if (!usable(S, s) || !S.b[s].length) continue;
    if (S.burn > 0) return true;
    for (let d = 0; d < L.n; d++) if (canPour(L, S, s, d)) return true;
  }
  return false;
}

export const starsOf = (L: Level, S: Sim) => (S.clear ? 1 + (S.pours <= L.P ? 1 : 0) + (S.ook ? 1 : 0) : 0);

/** 쓸모 있는 수만 (탐색용): 한 색뿐인 병을 빈 병으로 옮기기 · 같은 크기 빈 병 중복은 뺀다 */
export function movesOf(L: Level, S: Sim): Mv[] {
  const out: Mv[] = [];
  for (let s = 0; s < L.n; s++) {
    if (!usable(S, s)) continue;
    const src = S.b[s];
    if (!src.length) continue;
    const c = topOf(src);
    if (c >= UNK0) continue;
    const whole = runLen(src) === src.length && S.hid[s] === 0;
    let emptyCaps = 0;
    for (let d = 0; d < L.n; d++) {
      if (!canPour(L, S, s, d)) continue;
      const dst = S.b[d];
      if (!dst.length) {
        if (whole) continue;
        const bit = 1 << L.cap[d];
        if (emptyCaps & bit) continue;
        emptyCaps |= bit;
      }
      out.push({ s, d });
    }
    if (S.burn > 0 && c !== FZ) out.push({ s, d: CAUL });
  }
  return out;
}

/** 남은 일의 어림 (붓기 수의 아래쪽 어림): 색 덩어리 수 - 남은 색 수 + 색 밑에 깔린 💥 */
function heur(L: Level, S: Sim) {
  let runs = 0, cols = 0, buried = 0;
  for (let i = 0; i < L.n; i++) {
    if (!((S.live >> i) & 1) || (S.done >> i) & 1) continue;
    const b = S.b[i];
    let last = -1, seenColor = false;
    for (let j = b.length - 1; j >= 0; j--) {
      const x = b[j];
      if (x === FZ) {
        if (seenColor) buried++;
        continue;
      }
      seenColor = true;
      if (x !== last) runs++;
      last = x;
    }
    if ((S.ice >> i) & 1) runs++;
  }
  for (const c of L.cols) if (!S.got.includes(c)) cols++;
  return Math.max(0, runs - cols) + buried;
}
function keyOf(S: Sim) {
  let k = '';
  for (const b of S.b) k += String.fromCharCode(...b.map((x) => 97 + (x % 60))) + '|';
  return k + S.ice + ',' + S.live + ',' + S.burn + ',' + S.oi + ',' + S.done;
}

/** 묶음 힙 (f가 작은 것부터) */
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
/**
 * 가중 A* 풀이. strict = 주문 순서를 지키는 풀이만. stopAtReveal = 숨은 층이 드러나는 순간도 목표로 친다(보이는 것만 아는 봇).
 * 못 찾으면 null.
 */
export function solve(L: Level, S0: Sim, o: { strict: boolean; W: number; budget: number; stopAtReveal?: boolean }): Mv[] | null {
  const open = new Heap<Node>(), seen = new Map<string, number>();
  const root: Node = { S: S0, g: 0, mv: null, up: null };
  open.push(o.W * heur(L, S0), root);
  seen.set(keyOf(S0), 0);
  let n = 0, bestLeaf: Node | null = null, bestLeafV = 1e9, near: Node | null = null, nearV = 1e9;
  const hidSum = (S: Sim) => S.hid.reduce((a, x) => a + x, 0);
  const h0 = hidSum(S0), hr0 = heur(L, S0);
  while (open.size && n < o.budget) {
    const nd = open.pop()!;
    n++;
    const S = nd.S;
    if (S.clear) return path(nd);
    if (o.stopAtReveal && nd.up) {
      if (hidSum(S) < h0 || S.ice !== S0.ice || S.got.length > S0.got.length) {
        // 숨은 층이 드러나거나 얼음이 녹거나 한 색이 완성됐다 — 여기까지의 길을 후보로
        const v = nd.g + 1.2 * heur(L, S);
        if (v < bestLeafV) (bestLeafV = v), (bestLeaf = nd);
        if (n > o.budget / 4) break;
        continue;
      }
      // 그런 길이 없을 때를 위해: 어림이 가장 많이 줄어든 곳
      const v = heur(L, S) - hr0 + nd.g * 0.3;
      if (v < nearV) (nearV = v), (near = nd);
    }
    for (const m of movesOf(L, S)) {
      const S2 = cloneSim(S);
      pour(L, S2, m.s, m.d);
      if (S2.fail === 1) S2.fail = 0; // 탐색에선 한도 무시
      if (o.strict && !S2.ook) continue;
      if (S2.fail === 2) continue;
      const k = keyOf(S2), g = nd.g + 1, prev = seen.get(k);
      if (prev !== undefined && prev <= g) continue;
      seen.set(k, g);
      open.push(g + o.W * heur(L, S2), { S: S2, g, mv: m, up: nd });
    }
  }
  return bestLeaf ? path(bestLeaf) : near && nearV < 0 ? path(near) : null;
}
function path(nd: Node): Mv[] {
  const out: Mv[] = [];
  for (let x: Node | null = nd; x && x.mv; x = x.up) out.push(x.mv);
  return out.reverse();
}
/** 한도 안에서 풀이를 찾는다: 촘촘하게 먼저, 안 되면 느슨하게 */
export function bestPlan(L: Level, S: Sim, strict: boolean, big = false): Mv[] | null {
  const tries: [number, number][] = big ? [[1.2, 6000], [1.6, 8000], [2.5, 12000]] : [[1.4, 2500], [2.5, 5000]];
  for (const [W, budget] of tries) {
    const p = solve(L, cloneSim(S), { strict, W, budget });
    if (p) return p;
  }
  return null;
}

/** 버릇 하나(측정용): '부을 수 있는 첫 번째 수' — 왼쪽 병부터 보며 같은 색 위에 붓기, 없으면 빈 병에, 없으면 💥, 그래도 없으면 가마솥 */
export function habitPick(L: Level, S: Sim, last: Mv | null): Mv | null {
  const ok = (s: number, d: number) => canPour(L, S, s, d) && !(last && last.s === d && last.d === s);
  for (let s = 0; s < L.n; s++)
    for (let d = 0; d < L.n; d++) if (ok(s, d) && S.b[d].length && topOf(S.b[d]) === topOf(S.b[s])) return { s, d };
  for (let s = 0; s < L.n; s++) {
    if (!S.b[s].length || (runLen(S.b[s]) === S.b[s].length && S.hid[s] === 0)) continue;
    for (let d = 0; d < L.n; d++) if (ok(s, d) && !S.b[d].length) return { s, d };
  }
  for (let s = 0; s < L.n; s++) for (let d = 0; d < L.n; d++) if (ok(s, d)) return { s, d };
  for (let s = 0; s < L.n; s++) if (canPour(L, S, s, CAUL)) return { s, d: CAUL };
  return null;
}
function habitRun(L: Level) {
  const S = newSim(L);
  let last: Mv | null = null;
  while (!S.clear && !S.fail) {
    const m = habitPick(L, S, last);
    if (!m) break;
    pour(L, S, m.s, m.d);
    last = m;
  }
  return { ok: S.clear, stars: starsOf(L, S), pours: S.pours };
}
/** 아무 병이나 골라 붓는 사람이 이 판을 깰 확률 (부을 수 있는 수 중 무작위) */
function randomPass(L: Level, r: Rng, n: number) {
  let ok = 0;
  for (let k = 0; k < n; k++) {
    const S = newSim(L);
    while (!S.clear && !S.fail) {
      const list: Mv[] = [];
      for (let s = 0; s < L.n; s++) for (let d = 0; d < L.n; d++) if (canPour(L, S, s, d)) list.push({ s, d });
      if (S.burn > 0) for (let s = 0; s < L.n; s++) if (canPour(L, S, s, CAUL)) list.push({ s, d: CAUL });
      if (!list.length) break;
      const m = list[Math.floor(r() * list.length)];
      pour(L, S, m.s, m.d);
    }
    if (S.clear) ok++;
  }
  return ok / n;
}

// ───────────────────────────── 판 만들기 ─────────────────────────────
/** 병 자리: 5개 넘으면 선반 두 줄 */
function layout(n: number) {
  const rows = n <= 5 ? [n] : [Math.ceil(n / 2), Math.floor(n / 2)];
  const px: number[] = [], py: number[] = [], row: number[] = [];
  const ys = rows.length === 1 ? [0.9] : [0.69, 1.0];
  rows.forEach((cnt, r) => {
    const gap = Math.min(0.2, 0.86 / cnt);
    for (let k = 0; k < cnt; k++) px.push(0.5 + (k - (cnt - 1) / 2) * gap), py.push(ys[r]), row.push(r);
  });
  const nb = px.map((_, i) => px.reduce((m, _x, j) => (row[j] === row[i] && Math.abs(j - i) === 1 ? m | (1 << j) : m), 0));
  return { px, py, nb };
}

function makeLevel(d: StageDef, r: Rng, si: number): Level | null {
  const pal = shuffle([0, 1, 2, 3, 4, 5], r).slice(0, d.colors);
  const units: number[] = [];
  for (const c of pal) units.push(c, c, c, c);
  for (let k = 0; k < d.fizz; k++) units.push(FZ);
  shuffle(units, r);
  const nf = Math.ceil(units.length / 4), init: number[][] = [];
  for (let k = 0; k < nf; k++) init.push(units.slice(k * 4, k * 4 + 4));
  // 처음부터 한 색뿐인 병·같은 색 셋이 겹친 병은 다시
  if (init.some((b) => b.length > 1 && b.every((x) => x === b[0]))) return null;
  if (init.some((b) => b.length === 4 && b.filter((x) => x === b[3]).length >= 3 && b[2] === b[3] && b[1] === b[3])) return null;
  const cap = init.map(() => 4);
  for (let k = 0; k < d.empties; k++) init.push([]), cap.push(4);
  for (let k = 0; k < d.small; k++) init.push([]), cap.push(3);
  let gslot = -1;
  if (d.gift) (gslot = init.length), init.push([]), cap.push(4);
  const n = init.length, lay = layout(n);
  // 빈 병은 가운데 쪽에 섞어 둔다 (얼음 병 옆 자리가 생기게) — 자리만 섞고 선물 자리는 맨 끝
  const fixedN = gslot >= 0 ? n - 1 : n, perm = shuffle([...Array(fixedN).keys()], r);
  const I2 = perm.map((p) => init[p]), C2 = perm.map((p) => cap[p]);
  if (gslot >= 0) I2.push(init[gslot]), C2.push(cap[gslot]);
  const hid0 = I2.map((b) => (d.hidden ? Math.max(0, Math.min(d.hidden, b.length - 1)) : 0));
  let ice0 = 0;
  if (d.ice) {
    const cand = [...Array(fixedN).keys()].filter((i) => I2[i].length >= 3 && lay.nb[i] & ~(gslot >= 0 ? 1 << gslot : 0));
    shuffle(cand, r);
    for (let k = 0; k < d.ice && k < cand.length; k++) ice0 |= 1 << cand[k];
    if (!ice0) return null;
  }
  const total = Array(10).fill(0);
  for (const b of I2) for (const x of b) total[x]++;
  const ribbon = d.gift ? pal[Math.floor(r() * pal.length)] : -1;
  // 숨은 판의 주문은 처음부터 많이 보이는 색으로 (안 보이는 색을 '먼저' 달라고 하면 운이 된다)
  const hc = (c: number) => I2.reduce((a, b, i) => a + b.slice(0, hid0[i]).filter((x) => x === c).length, 0);
  let order = shuffle(pal.slice(), r);
  if (d.hidden) order.sort((x, y) => hc(x) - hc(y));
  order = order.slice(0, d.orders);
  if (d.gift && order[0] === ribbon) order[0] = pal.find((c) => c !== ribbon)!;
  const L: Level = {
    n, cap: C2, init: I2, hid0, ice0, live0: gslot >= 0 ? ((1 << n) - 1) & ~(1 << gslot) : (1 << n) - 1, gslot, ribbon, total, cols: pal, order, burn: d.burn,
    nb: lay.nb, px: lay.px, py: lay.py, par: 0, P: 0, limit: 999, plan: [], habit: { ok: false, stars: 0, pours: 0 },
  };
  void si;
  // 1) 주문 없이 풀리나 (안 풀리는 판은 싸게 버린다)
  const free = solve(L, newSim(L), { strict: false, W: 1.6, budget: 1500 }) ?? solve(L, newSim(L), { strict: false, W: 3, budget: 2000 });
  if (!free) return null;
  // 2) 무작위 주문으로 풀리나 — 안 되면 그 풀이가 완성한 순서를 주문으로
  let plan = solve(L, newSim(L), { strict: true, W: 1.3, budget: 2500 }) ?? solve(L, newSim(L), { strict: true, W: 2.2, budget: 2000 });
  if (!plan) {
    const S = newSim(L);
    for (const m of free) pour(L, S, m.s, m.d);
    L.order = S.got.slice(0, d.orders);
    plan = solve(L, newSim(L), { strict: true, W: 1.3, budget: 2500 }) ?? free;
  }
  L.plan = plan;
  L.par = plan.length;
  L.P = plan.length + d.slack;
  L.limit = Math.ceil(plan.length * d.failK) + d.failA;
  return L;
}

/** 1판: 첫 붓기에 바로 '펑' 완성이 보이게 (손으로 만든 판, 색만 섞는다) */
function firstLevel(d: StageDef, r: Rng): Level {
  const [a, b, c] = shuffle([0, 1, 2, 3, 4, 5], r).slice(0, 3);
  const init = [[a, a, a], [b, b, b, a], [c, c, b, c], [c], []];
  const cap = [4, 4, 4, 4, 4];
  const n = init.length, lay = layout(n);
  const total = Array(10).fill(0);
  for (const x of init) for (const y of x) total[y]++;
  const L: Level = {
    n, cap, init, hid0: init.map(() => 0), ice0: 0, live0: (1 << n) - 1, gslot: -1, ribbon: -1, total, cols: [a, b, c], order: [a], burn: 0,
    nb: lay.nb, px: lay.px, py: lay.py, par: 0, P: 0, limit: 0, plan: [], habit: { ok: false, stars: 0, pours: 0 },
  };
  const plan = bestPlan(L, newSim(L), true, true)!;
  L.plan = plan;
  L.par = plan.length;
  L.P = plan.length + d.slack;
  L.limit = Math.ceil(plan.length * d.failK) + d.failA;
  return L;
}

const levelCache = new Map<string, Level>();
export function buildLevel(seed: number, stage: number): Level {
  const ck = `${seed}:${stage}`, hit = levelCache.get(ck);
  if (hit) return hit;
  const d = STAGES[stage], r = mulberry32((seed * 31 + stage * 7919 + 17) >>> 0);
  let pick: Level | null = null, bv = -1e9;
  if (stage === 0) pick = firstLevel(d, r);
  else {
    const K = stage === 1 ? 6 : 8;
    for (let tries = 0, c = 0; c < K && tries < 60; tries++) {
      const L = makeLevel(d, r, stage);
      if (!L) continue;
      c++;
      L.habit = habitRun(L);
      let v: number;
      if (stage === 1) v = -Math.abs(randomPass(L, r, 24) - 0.7) + (L.habit.stars < 3 ? 0.05 : 0);
      else {
        // 버릇대로 두면 별 셋이 안 나오는 판 (무엇을 먼저 할지가 수가 되게), 풀이 길이는 알맞게
        v = (L.habit.stars < 3 ? 2 : 0) + (L.habit.ok ? 0.3 : 0) - Math.abs(L.par - (stage >= 4 ? 14 : 11)) * 0.08 + randomPass(L, r, 8) * 0.2;
      }
      if (v > bv) (bv = v), (pick = L);
      if (stage >= 2 && bv >= 2.2) break;
    }
  }
  if (!pick) pick = firstLevel(STAGES[0], r);
  if (!pick.habit.pours) pick.habit = habitRun(pick);
  if (levelCache.size > 400) levelCache.clear();
  levelCache.set(ck, pick);
  return pick;
}

// ───────────────────────────── 상태 ─────────────────────────────
interface Ev { t: number; kind: string; x: number; y: number; text?: string; col?: string; v?: number }
/** 붓기 연출 하나: 붓기 전 내용물(sb·db)과 숨은 층 수(sh)로 그린다 */
interface Anim { kind: 'pour' | 'poof' | 'burn'; s: number; d: number; c: number; n: number; t0: number; sb: number[]; db: number[]; sh: number; dh: number }
export interface PotionState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'play' | 'settle' | 'result'; pt: number;
  L: Level; S: Sim; sel: number; selT: number; lastMv: Mv | null;
  down: boolean; ax: number; ay: number; lastTap: number; taps: number; pending: { x: number; y: number } | null; anim: Anim | null;
  hearts: number; stars: number; got: number; pts: number; ok: boolean; why: string; won: boolean; dead: boolean; tries: number;
  seen: Set<string>; tips: Set<string>; events: Ev[]; news: { text: string; t: number } | null; newsQ: string[]; startT: number; clearT: number;
  mood: string; moodT: number; owl: string; owlT: number; batT: number;
  wob: number[]; wv: number[]; slosh: number[]; sv: number[]; corkT: number[]; meltT: number[]; giftT: number; caulT: number;
  /** 되돌리기(판마다 1번): 남은 수 · 바로 전 붓기 직전 상태 */
  undo: number; prev: Sim | null; undoT: number;
  /** 퐁 연기·가마솥 김 (그리기용) */
  smoke: { x: number; y: number; t0: number; col: string; big: number }[];
}

const ev = (s: PotionState, kind: string, x: number, y: number, text?: string, col?: string, v?: number) => s.events.push({ t: s.t, kind, x, y, text, col, v });
function tip(s: PotionState, key: string, text: string) {
  if (s.tips.has(key) || s.newsQ.length) return;
  s.tips.add(key);
  s.newsQ.push(text);
}
function see(s: PotionState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  s.newsQ.push(text);
}
const setMood = (s: PotionState, m: string) => ((s.mood = m), (s.moodT = s.t));
const setOwl = (s: PotionState, m: string) => ((s.owl = m), (s.owlT = s.t));

// 화면 배치 (가로 0~1, 세로 0~A)
const UH = 0.046, BW = 0.1, NECK = 0.036, LIFT = 0.045;
const CX = 0.5, CY = 1.16, CR = 0.115;
/** 되돌리기 단추 */
const UX = 0.875, UY = 1.155, UR = 0.058;
export const UNDO = 1;
const bottleTop = (L: Level, i: number) => L.py[i] - L.cap[i] * UH - NECK;

function newStage(s: PotionState) {
  const d = STAGES[s.stage];
  s.L = buildLevel(s.seed, s.stage);
  s.S = newSim(s.L);
  const n = s.L.n;
  s.sel = -1;
  s.lastMv = null;
  s.anim = null;
  s.pending = null;
  s.wob = Array(n).fill(0);
  s.wv = Array(n).fill(0);
  s.slosh = Array(n).fill(0);
  s.sv = Array(n).fill(0);
  s.corkT = Array(n).fill(-1);
  s.meltT = Array(n).fill(-1);
  s.giftT = -1;
  s.caulT = -99;
  s.undo = UNDO;
  s.prev = null;
  s.undoT = -99;
  s.smoke = [];
  s.phase = 'play';
  s.pt = 0;
  s.startT = s.t;
  s.got = 0;
  setMood(s, 'idle');
  setOwl(s, 'wait');
  see(s, d.key, d.news);
  if (s.stage === 0) see(s, 'order', '📜 부엉이 손님 주문 — 그 색을 먼저 완성하면 ★');
  ev(s, 'stage', 0.5, 0.6, `${s.stage + 1}판 · ${d.name}`, '#fff6d6');
}

function finish(s: PotionState) {
  s.phase = 'result';
  s.pt = 0;
  const L = s.L, S = s.S;
  if (s.ok) {
    const st = starsOf(L, S);
    s.got = st;
    s.stars += st;
    s.pts += st * STAR_PTS + Math.min(30, Math.max(0, L.limit - S.pours) * LEFT_PTS);
    s.clearT = s.t;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    ev(s, 'clear', 0.5, 0.62, `${STAGES[s.stage].emoji} 완성! ${'★'.repeat(st)}${'☆'.repeat(3 - st)}`, '#fff1a8', st);
    setMood(s, 'proud');
  } else {
    s.hearts--;
    s.tries++;
    ev(s, 'fail', 0.5, 0.62, s.why, '#ffd0c8');
    setMood(s, 'dizzy');
    setOwl(s, 'sad');
  }
}

/** 손가락 자리의 병 (가마솥은 CAUL, 없으면 -1) */
function pickBottle(s: PotionState, x: number, y: number) {
  const L = s.L, S = s.S;
  let best = -1, bd = 1e9;
  for (let i = 0; i < L.n; i++) {
    if (!((S.live >> i) & 1)) continue;
    const lift = i === s.sel ? LIFT : 0, top = bottleTop(L, i) - lift - 0.03, bot = L.py[i] + 0.035;
    if (Math.abs(x - L.px[i]) > 0.085 || y < top || y > bot) continue;
    const dd = Math.abs(x - L.px[i]) + Math.abs(y - (top + bot) / 2) * 0.3;
    if (dd < bd) (bd = dd), (best = i);
  }
  if (best < 0 && L.burn > 0 && Math.hypot(x - CX, (y - CY) * 1.3) < CR * 1.25) return CAUL;
  return best;
}

const COLN = ['빨강', '파랑', '노랑', '초록', '보라', '주황'];
function tapAt(s: PotionState, x: number, y: number) {
  s.taps++;
  s.lastTap = s.t;
  if (Math.hypot(x - UX, y - UY) < UR * 1.25) return undoPour(s);
  const L = s.L, S = s.S, k = pickBottle(s, x, y);
  if (k === -1) {
    if (s.sel >= 0) return void ((s.sel = -1), (s.selT = s.t));
    if (y > 0.4 && y < 1.3) ev(s, 'miss', x, y, '병을 톡!', '#fff3df');
    return;
  }
  if (s.sel < 0) {
    if (k === CAUL) return void ev(s, 'say', CX, CY - 0.14, '병을 먼저 톡!', '#ffe9c4');
    const why = (S.done >> k) & 1 ? '완성된 물약!' : (S.ice >> k) & 1 ? '🧊 꽁꽁 얼었어요' : !S.b[k].length ? '빈 병이에요' : '';
    if (why) {
      s.wv[k] += (S.done >> k) & 1 ? 0.05 : 0.09;
      ev(s, 'nope', L.px[k], bottleTop(L, k) - 0.02, why, (S.done >> k) & 1 ? '#fff1a8' : '#ffd8cc');
      if ((S.ice >> k) & 1) tip(s, 'iceTap', '🧊 얼음 병은 바로 옆 병이 펑 완성되면 녹아요');
      return;
    }
    s.sel = k;
    s.selT = s.t;
    s.sv[k] += 0.12;
    return;
  }
  if (k === s.sel) return void ((s.sel = -1), (s.selT = s.t), (s.sv[k] += 0.1));
  if (canPour(L, S, s.sel, k)) return doPour(s, s.sel, k);
  // 못 붓는 곳: 이유를 말하고, 그 병이 부을 수 있는 병이면 그걸로 바꿔 든다
  if (k === CAUL) return void ev(s, 'nope', CX, CY - 0.14, '🔥 가마솥 불이 꺼졌어요', '#ffd8cc');
  const top = S.b[s.sel][S.b[s.sel].length - 1], dst = S.b[k];
  const why = (S.done >> k) & 1 ? '완성된 물약!' : (S.ice >> k) & 1 ? '🧊 꽁꽁!' : dst.length >= L.cap[k] ? '꽉 찼어요' : `${COLN[top] ?? '이 색'}이 아니에요`;
  s.wv[k] += 0.08;
  ev(s, 'nope', L.px[k], bottleTop(L, k) - 0.02, why, '#ffd8cc');
  setMood(s, 'huh');
  if (dst.length && !((S.done >> k) & 1) && !((S.ice >> k) & 1)) {
    tip(s, 'match', '맨 위 색이 같은 병이나 빈 병에만 부어져요');
    s.sel = k;
    s.selT = s.t;
  } else s.sel = -1;
}

/** 되돌리기: 바로 전 붓기 하나를 없던 일로 (붓기 수도 돌아온다) */
function undoPour(s: PotionState) {
  if (!s.prev || s.undo <= 0) {
    ev(s, 'say', UX - 0.12, UY - 0.1, s.undo <= 0 ? '되돌리기를 다 썼어요' : '되돌릴 붓기가 없어요', '#ffe9c4');
    return;
  }
  const L = s.L;
  s.S = s.prev;
  s.prev = null;
  s.undo--;
  s.undoT = s.t;
  s.sel = -1;
  s.selT = s.t;
  s.lastMv = null;
  for (let i = 0; i < L.n; i++) {
    if (!((s.S.done >> i) & 1)) s.corkT[i] = -1;
    if ((s.S.ice >> i) & 1) s.meltT[i] = -1;
    s.sv[i] += 0.1;
  }
  if (L.gslot >= 0 && !((s.S.live >> L.gslot) & 1)) s.giftT = -1;
  if (s.owl === 'sad' && s.S.ook) setOwl(s, 'wait');
  ev(s, 'undo', UX, UY, '슝~ 되돌렸어요', '#e6dcff');
  setMood(s, 'wow');
}

function doPour(s: PotionState, a: number, b: number) {
  const L = s.L, S = s.S, rec: RE[] = [];
  s.prev = cloneSim(S);
  const sb = S.b[a].slice(), db = b >= 0 ? S.b[b].slice() : [], sh = S.hid[a], dh = b >= 0 ? S.hid[b] : 0, hid0 = S.hid.slice();
  pour(L, S, a, b, rec);
  s.lastMv = { s: a, d: b };
  s.sel = -1;
  s.selT = s.t;
  const t0 = s.t;
  const first = rec[0];
  const kind = first.k === 'poof' ? 'poof' : first.k === 'burn' ? 'burn' : 'pour';
  s.anim = { kind, s: a, d: b, c: first.k === 'pour' ? first.c : first.k === 'poof' ? FZ : first.k === 'burn' ? first.c : 0, n: first.k === 'pour' ? first.n : 1, t0, sb, db, sh, dh };
  const tx = b >= 0 ? L.px[b] : CX, ty = b >= 0 ? bottleTop(L, b) + NECK : CY - 0.05;
  for (const e of rec) {
    if (e.k === 'pour') {
      ev(s, 'glug', tx, ty, e.n >= 2 ? '콸콸!' : '쪼르르', '#e8f4ff', t0 + 14);
      ev(s, 'splash', tx, L.py[b] - (db.length + e.n) * UH, undefined, POT[e.c], t0 + 21);
    } else if (e.k === 'poof') {
      ev(s, 'poof', tx, L.py[b] - db.length * UH, '퐁!', '#f3e6ff', t0 + 19);
      s.smoke.push({ x: tx, y: L.py[b] - db.length * UH - 0.02, t0: t0 + 19, col: '#d9c8ff', big: 1 });
      s.smoke.push({ x: 0.16, y: 1.1, t0: t0 + 24, col: '#cfc2e8', big: 0.7 });
      see(s, 'poof', '💥 퐁! 부글 물약은 닿은 색 한 칸과 함께 날아가요');
      setMood(s, 'puff');
    } else if (e.k === 'burn') {
      ev(s, 'burn', CX, CY - 0.04, '부글부글~', '#d6ffd0', t0 + 19);
      s.caulT = t0 + 19;
      s.smoke.push({ x: CX, y: CY - 0.08, t0: t0 + 19, col: '#bff5c0', big: 1.1 });
      see(s, 'burnUse', '🔥 가마솥에 부은 한 칸은 부글부글 끓어 사라져요');
    } else if (e.k === 'done') {
      s.corkT[e.i] = t0 + 24;
      ev(s, 'done', L.px[e.i], L.py[e.i] - L.cap[e.i] * UH * 0.5, '펑!', POT[e.c], t0 + 24);
      see(s, 'done', '✨ 한 색을 한 병에 다 모으면 펑! 완성');
      if (L.order.length && S.got.length <= L.order.length) {
        if (e.ok) ev(s, 'order', 0.8, 0.22, '부엉! 주문 그거예요!', '#fff1a8', t0 + 34);
        else if (S.got.indexOf(e.c) === S.oi + (S.ook ? 0 : 0) && !S.ook && e.c !== L.order[S.oi]) ev(s, 'wrong', 0.8, 0.22, '부엉… 그게 아닌데', '#ffd8cc', t0 + 34);
      }
    } else if (e.k === 'melt') {
      s.meltT[e.i] = t0 + 34;
      ev(s, 'melt', L.px[e.i], L.py[e.i] - 0.1, '사르르~', '#d8f4ff', t0 + 34);
      see(s, 'melt', '🧊 펑! 옆 병의 얼음이 사르르 녹았어요');
    } else if (e.k === 'gift') {
      s.giftT = t0 + 40;
      ev(s, 'gift', L.px[e.i], L.py[e.i] - 0.12, '🎁 새 병이 쿵!', '#ffe0f0', t0 + 52);
      see(s, 'giftGot', '🎀 리본 색 완성 — 새 빈 병이 내려왔어요!');
    } else if (e.k === 'reveal') {
      ev(s, 'reveal', L.px[e.i], L.py[e.i] - (S.b[e.i].length - 0.5) * UH, '!', '#fff6a8', t0 + 22);
      see(s, 'revealSeen', '❓ 위가 비니까 숨은 색이 보여요!');
    } else if (e.k === 'vanish') {
      ev(s, 'say', 0.5, 0.6, `${COLN[e.c]} 물약이 다 날아갔어요!`, '#ffd8cc', t0 + 24);
    }
  }
  void hid0;
  if (rec.some((e) => e.k === 'done')) {
    setMood(s, 'proud');
    s.batT = t0 + 26;
    const okd = rec.find((e) => e.k === 'done' && e.ok);
    const bad = rec.some((e) => e.k === 'done' && !e.ok) && S.got.length <= L.order.length + 1 && !S.ook;
    if (okd) setOwl(s, 'happy');
    else if (bad && s.owl !== 'sad') setOwl(s, 'sad');
  } else if (kind === 'pour' && first.k === 'pour' && first.n >= 2) setMood(s, 'wow');
  if (S.clear) {
    s.phase = 'settle';
    s.pt = 0;
    s.ok = true;
  } else if (S.fail) {
    s.phase = 'settle';
    s.pt = 0;
    s.ok = false;
    s.why = S.fail === 1 ? '🔮 붓기를 다 썼어요!' : '더 부을 곳이 없어요!';
    ev(s, 'jam', 0.5, 0.62, S.fail === 1 ? '마력 바닥!' : '꽉 막혔다…', '#ffb4a8', t0 + 30);
  } else if (L.limit - S.pours <= 3) {
    setMood(s, 'worry');
    tip(s, 'low', '🔮 붓기가 얼마 안 남았어요 — 꼭 필요한 붓기만!');
  }
}

function animate(s: PotionState) {
  for (let i = 0; i < s.L.n; i++) {
    s.wv[i] += -0.2 * s.wob[i] - 0.16 * s.wv[i];
    s.wob[i] += s.wv[i];
    s.sv[i] += -0.12 * s.slosh[i] - 0.08 * s.sv[i];
    s.slosh[i] += s.sv[i];
  }
  const a = s.anim;
  if (a) {
    const u = s.t - a.t0;
    if (u === 14 && a.d >= 0) s.sv[a.d] += 0.18;
    if (u === 26) {
      s.sv[a.s] += 0.2;
      if (a.d >= 0) s.sv[a.d] += 0.1;
    }
    if (u >= POUR_T) s.anim = null;
  }
  if (s.smoke.length && s.t - s.smoke[0].t0 > 80) s.smoke = s.smoke.filter((m) => s.t - m.t0 <= 80);
}

export const potionsort: GameDef<PotionState> = {
  id: 'potionsort',
  name: '마녀 고양이 물약 정렬',
  genes: ['pourmix', 'pointer'],
  twist: '💥 부글 물약만은 색을 안 가리고 아무 병에나 부을 수 있다 — 닿은 색 한 칸과 섞이는 순간 퐁! 연기로 둘 다 날아가 막힌 병이 뚫린다(고양이 마녀는 털이 부스스)',
  rules: ['병을 톡, 다른 병을 톡 → 맨 위 물약을 붓는다 (같은 색 위나 빈 병에만).', '한 색을 한 병에 다 모으면 펑! 완성 — 붓기 한도 안에 모두 완성.'],
  controls: 'touch',
  hint: '병을 톡 → 다른 병을 톡하면 콸콸! / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '고양이 마녀의 물약 공방',
    mood: '촛불이 일렁이는 돌벽 공방, 나무 선반 위에 색색의 물약이 층층이 담긴 유리병 — 병 그림자와 유리 반짝임, 김이 오르는 가마솥 옆에서 마녀 모자를 쓴 검은 고양이가 국자를 젓고, 창가의 부엉이 손님과 천장의 박쥐가 구경한다.',
    palette: { bg: '#1e1530', ink: '#fff6ec', muted: '#c9b8de', accent: '#ffc65c', hot: '#ff5a6e', soft: '#efe2ff' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'play', pt: 0, sel: -1, selT: 0, lastMv: null,
      down: false, ax: 0, ay: 0, lastTap: -99, taps: 0, pending: null, anim: null,
      hearts: 3, stars: 0, got: 0, pts: 0, ok: false, why: '', won: false, dead: false, tries: 0,
      seen: new Set<string>(), tips: new Set<string>(), events: [], news: null, newsQ: [], startT: 0, clearT: 0,
      mood: 'idle', moodT: 0, owl: 'wait', owlT: 0, batT: -99,
      wob: [], wv: [], slosh: [], sv: [], corkT: [], meltT: [], giftT: -1, caulT: -99,
    } as unknown as PotionState;
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
    if (s.mood !== 'idle' && s.t - s.moodT > (s.mood === 'dizzy' || s.mood === 'proud' ? 110 : s.mood === 'puff' ? 90 : 60)) s.mood = s.phase === 'play' && s.L.limit - s.S.pours <= 3 ? 'worry' : 'idle';
    if (s.owl !== 'wait' && s.t - s.owlT > 120 && s.phase === 'play') s.owl = 'wait';
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
      if (!s.anim && s.pt >= (s.ok ? 50 : 44)) finish(s);
      return;
    }
    if (press) {
      if (s.anim || s.t - s.startT < 10) s.pending = { x: s.ax, y: s.ay * A };
      else tapAt(s, s.ax, s.ay * A);
    } else if (s.pending && !s.anim && s.t - s.startT >= 10) {
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
/** 봇이 아는 것만: 숨은 층은 '모르는 색'(서로 다 다름)으로 바꾼 모형 */
function viewOf(S: Sim): Sim {
  const V = cloneSim(S);
  let u = UNK0;
  V.rem = S.rem.concat(Array(64 - S.rem.length).fill(1));
  for (let i = 0; i < V.b.length; i++) for (let j = 0; j < S.hid[i] && j < V.b[i].length; j++) V.b[i][j] = u++;
  return V;
}
const hidSum = (S: Sim) => S.hid.reduce((a, x) => a + x, 0);
/**
 * 숨은 층 짐작: 색마다 몇 칸 남았는지는 누구나 셀 수 있다(남은 칸 - 보이는 칸 = 숨은 칸).
 * 숨은 자리에 모자란 색을 차례로 넣어 본 '짐작 판'을 만든다 — 끝까지 풀어 보고, 숨은 층이 드러나면 다시 짐작한다.
 */
function guessOf(L: Level, S: Sim): Sim {
  const V = cloneSim(S), miss = S.rem.slice();
  for (let i = 0; i < L.n; i++) for (let j = S.hid[i]; j < S.b[i].length; j++) miss[S.b[i][j]]--;
  const pool: number[] = [];
  for (let c = 0; c < miss.length; c++) for (let k = 0; k < miss[c]; k++) pool.push(c);
  // 위 칸과 같은 색이 남아 있으면 그걸 먼저 (사람도 '아마 같은 색이겠지' 한다)
  for (let i = 0; i < L.n; i++)
    for (let j = S.hid[i] - 1; j >= 0; j--) {
      const up = V.b[i][j + 1], q = pool.indexOf(up);
      V.b[i][j] = q >= 0 ? pool.splice(q, 1)[0] : pool.shift() ?? up;
    }
  V.hid = S.hid.map(() => 0);
  return V;
}
/** 지금 둘 수 (내다보기): 숨은 층이 없으면 끝까지 풀고, 있으면 짐작 판으로 끝까지 풀거나 다음 숨은 층이 드러날 때까지의 길 */
function thinkPlan(s: PotionState): Mv[] {
  const L = s.L, S = s.S;
  if (S.pours === 0 && !hidSum(S)) return L.plan.slice();
  if (hidSum(S)) {
    const G = guessOf(L, S);
    const g = bestPlan(L, G, S.ook) ?? (S.ook ? bestPlan(L, G, false) : null);
    if (g && g.length && canPour(L, S, g[0].s, g[0].d)) return g;
    const V = viewOf(S);
    const p = solve(L, V, { strict: S.ook, W: 1.5, budget: 1500, stopAtReveal: true }) ?? solve(L, V, { strict: false, W: 2.5, budget: 1500, stopAtReveal: true });
    if (p && p.length) return p;
  } else {
    const p = bestPlan(L, S, S.ook) ?? bestPlan(L, S, false);
    if (p && p.length) return p;
  }
  const m = habitPick(L, S, s.lastMv);
  return m ? [m] : [];
}
const brain = new WeakMap<object, { key: string; list: Mv[]; i: number; pours: number; hid: number }>();
export function planMove(s: PotionState): Mv | null {
  const S = s.S, key = `${s.stage}:${s.tries}`;
  let b = brain.get(s);
  const hs = hidSum(S);
  if (b && b.key === key && S.pours === b.pours + 1 && s.lastMv && b.list[b.i] && s.lastMv.s === b.list[b.i].s && s.lastMv.d === b.list[b.i].d) (b.i++, (b.pours = S.pours));
  if (!b || b.key !== key || b.pours !== S.pours || b.hid !== hs || b.i >= b.list.length) brain.set(s, (b = { key, list: thinkPlan(s), i: 0, pours: S.pours, hid: hs }));
  return b.list[b.i] ?? null;
}

const NO: Input = { tap: false, dir: 0, pointer: null };
/** 병 i(또는 가마솥)를 누르는 입력 */
function at(s: PotionState, i: number): Input {
  const L = s.L;
  if (i === CAUL) return { tap: false, dir: 0, pointer: { x: CX, y: CY / A } };
  const lift = i === s.sel ? LIFT : 0;
  return { tap: false, dir: 0, pointer: { x: L.px[i], y: (L.py[i] - L.cap[i] * UH * 0.5 - lift) / A } };
}
/** 들고 있는 병을 보고 다음 톡: 안 든 상태면 붓는 병, 그 병을 들었으면 받는 병, 딴 병을 들었으면 내려놓기 */
function tapFor(s: PotionState, m: Mv | null): Input {
  if (!m) return NO;
  if (s.sel < 0) return at(s, m.s);
  if (s.sel === m.s) return at(s, m.d);
  return at(s, s.sel);
}
const ready = (s: PotionState, gap: number) => s.phase === 'play' && !s.anim && !s.down && !s.pending && s.t - s.lastTap >= gap && s.t - s.startT >= 30;
/** 봇: 끝까지(숨은 층은 드러날 때까지) 내다보고 붓는 순서를 정한다. 사람처럼 한 번 붓고 조금 지켜본다 */
export const potionsortSmart: Bot<PotionState> = {
  name: '물약 장인',
  act(s) {
    if (!ready(s, 16)) return NO;
    return tapFor(s, planMove(s));
  },
};
/** 버릇 봇(측정용): '부을 수 있는 첫 번째 수' — 왼쪽 병부터 같은 색 위에, 없으면 빈 병에 */
export const potionsortHabit: Bot<PotionState> = {
  name: '버릇: 부을 수 있는 첫 수',
  act(s) {
    if (!ready(s, 16)) return NO;
    return tapFor(s, habitPick(s.L, s.S, s.lastMv));
  },
};
const dumbAt = new WeakMap<object, { next: number; until: number; p: { x: number; y: number } }>();
/** 봇: 아무 때나 아무 병이나 톡 (가끔 화면 아무 데나) */
export const potionsortRandom: Bot<PotionState> = {
  name: '아무 병이나 톡',
  act(s, rng) {
    let m = dumbAt.get(s);
    if (!m) dumbAt.set(s, (m = { next: 20 + Math.floor(rng() * 50), until: -1, p: { x: 0, y: 0 } }));
    if (s.t < m.until) return { tap: false, dir: 0, pointer: m.p };
    if (s.t < m.next) return NO;
    m.next = s.t + 24 + Math.floor(rng() * 70);
    m.until = s.t + 2 + Math.floor(rng() * 4);
    const L = s.L, list: number[] = [];
    for (let i = 0; i < L.n; i++) if ((s.S.live >> i) & 1) list.push(i);
    if (L.burn > 0) list.push(CAUL);
    if (rng() < 0.15 || !list.length) m.p = { x: rng(), y: rng() };
    else {
      const q = at(s, list[Math.floor(rng() * list.length)]).pointer!;
      m.p = { x: q.x + (rng() - 0.5) * 0.04, y: q.y + (rng() - 0.5) * 0.04 };
    }
    return { tap: false, dir: 0, pointer: m.p };
  },
};


// ───────────────────────────── 그리기 ─────────────────────────────
export const POT = ['#ff4d5e', '#3d8bff', '#ffd23f', '#35d07f', '#b06bff', '#ff9a3d', '#ffffff', '#ffffff', '#ffffff', '#ff7ad9'];
/** 색마다 무늬 (색을 못 가려도 읽히게) */
const SYM = ['♥', '◆', '★', '♣', '☾', '●'];
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
interface Seg { c: number; h: number; hid: boolean }
const segsOf = (b: number[], hid: number): Seg[] => b.map((c, j) => ({ c, h: 1, hid: j < hid }));
interface BO { rot: number; t: number; cork: number; ice: number; slosh: number; glow: string | null; shimmer: boolean; dim: boolean; key: number; gift: number }

function bottlePath(ctx: CanvasRenderingContext2D, bw: number, bh: number, nw: number, nh: number) {
  const rr = bw * 0.34, sh = bw * 0.42;
  ctx.beginPath();
  ctx.moveTo(-nw / 2, -bh - nh);
  ctx.lineTo(-nw / 2, -bh - sh * 0.35);
  ctx.quadraticCurveTo(-bw / 2, -bh - sh * 0.1, -bw / 2, -bh + sh * 0.45);
  ctx.lineTo(-bw / 2, -rr);
  ctx.quadraticCurveTo(-bw / 2, 0, -bw / 2 + rr, 0);
  ctx.lineTo(bw / 2 - rr, 0);
  ctx.quadraticCurveTo(bw / 2, 0, bw / 2, -rr);
  ctx.lineTo(bw / 2, -bh + sh * 0.45);
  ctx.quadraticCurveTo(bw / 2, -bh - sh * 0.1, nw / 2, -bh - sh * 0.35);
  ctx.lineTo(nw / 2, -bh - nh);
  ctx.closePath();
}

/** 유리병 하나 (x,y = 병 바닥 가운데 화면 px). 층은 아래부터, 마지막 층은 h<1이면 덜 찬 것 */
function drawBottle(ctx: CanvasRenderingContext2D, x: number, y: number, R: F, cap: number, segs: Seg[], o: BO) {
  const bw = R(BW), uh = R(UH), bh = cap * uh, nw = bw * 0.46, nh = R(NECK), t = o.t;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(o.rot);
  if (o.dim) ctx.globalAlpha = 0.72;
  if (o.glow) {
    const g = ctx.createRadialGradient(0, -bh * 0.5, bw * 0.2, 0, -bh * 0.5, bw * 1.5);
    g.addColorStop(0, o.glow + 'aa');
    g.addColorStop(1, o.glow + '00');
    ctx.fillStyle = g;
    ctx.fillRect(-bw * 1.6, -bh * 1.3 - nh, bw * 3.2, bh * 1.8 + nh);
  }
  // 유리 뒤쪽 (어두운 속)
  bottlePath(ctx, bw, bh, nw, nh);
  ctx.fillStyle = 'rgba(24,16,44,.42)';
  ctx.fill();
  // 물약
  ctx.save();
  bottlePath(ctx, bw, bh, nw, nh);
  ctx.clip();
  let yy = 0, topC = -1;
  const total = segs.reduce((a, g) => a + g.h, 0);
  for (let k = 0; k < segs.length; k++) {
    const g = segs[k];
    if (g.h <= 0.002) continue;
    const hh = g.h * uh, base = g.hid ? '#3a2d58' : POT[g.c] ?? '#888888';
    const gr = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0);
    gr.addColorStop(0, shade(base, -0.4));
    gr.addColorStop(0.28, shade(base, 0.22));
    gr.addColorStop(0.62, base);
    gr.addColorStop(1, shade(base, -0.5));
    ctx.fillStyle = gr;
    ctx.fillRect(-bw / 2 - 2, -yy - hh - 0.5, bw + 4, hh + 1);
    if (g.c === FZ && !g.hid) {
      // 부글 물약: 반짝이 별과 거품
      for (let q = 0; q < 4; q++) {
        const sx = (hsh(q + k * 7 + o.key * 13) - 0.5) * bw * 0.7, sy = -yy - hh * (0.2 + 0.6 * hsh(q * 3 + o.key)), tw = 0.5 + 0.5 * Math.sin(t * 0.25 + q * 2);
        ctx.fillStyle = `rgba(255,255,255,${0.35 + 0.6 * tw})`;
        const r = uh * 0.12 * (0.6 + tw);
        ctx.beginPath();
        ctx.moveTo(sx, sy - r * 2);
        ctx.lineTo(sx + r * 0.5, sy - r * 0.5);
        ctx.lineTo(sx + r * 2, sy);
        ctx.lineTo(sx + r * 0.5, sy + r * 0.5);
        ctx.lineTo(sx, sy + r * 2);
        ctx.lineTo(sx - r * 0.5, sy + r * 0.5);
        ctx.lineTo(sx - r * 2, sy);
        ctx.lineTo(sx - r * 0.5, sy - r * 0.5);
        ctx.fill();
      }
    }
    if (g.h > 0.55) {
      ctx.fillStyle = g.hid ? 'rgba(220,200,255,.85)' : g.c === FZ ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.62)';
      ctx.font = `900 ${Math.max(11, uh * 0.78)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(g.hid ? '?' : g.c === FZ ? '💥' : SYM[g.c] ?? '', 0, -yy - hh * 0.5 + 1);
    }
    // 층 사이 경계
    if (k > 0 && segs[k - 1].c !== g.c) {
      ctx.fillStyle = 'rgba(20,10,30,.28)';
      ctx.fillRect(-bw / 2, -yy - 0.8, bw, 1.6);
    }
    yy += hh;
    topC = g.hid ? -1 : g.c;
  }
  if (total > 0.05) {
    // 물약 윗면 (출렁)
    const base = topC >= 0 ? POT[topC] : '#3a2d58';
    ctx.fillStyle = shade(base, 0.32);
    ctx.beginPath();
    ctx.ellipse(0, -yy, bw * 0.5, Math.max(1.5, uh * 0.2), o.slosh * 0.35, 0, TAU);
    ctx.fill();
    // 거품
    if (!o.cork || o.cork < 0) {
      ctx.fillStyle = 'rgba(255,255,255,.4)';
      for (let q = 0; q < 3; q++) {
        const ph = (t * (0.012 + 0.004 * q) + hsh(q + o.key * 5)) % 1, by = -ph * yy, bx = (hsh(q * 9 + o.key) - 0.5) * bw * 0.6 + Math.sin(t * 0.1 + q) * 1.5;
        if (-by < yy - 2) (ctx.beginPath(), ctx.arc(bx, by, 1 + (q % 2), 0, TAU), ctx.fill());
      }
    }
  }
  ctx.restore();
  // 유리 앞면: 반짝임·테두리·입구
  ctx.fillStyle = 'rgba(255,255,255,.3)';
  ctx.beginPath();
  ctx.roundRect(-bw * 0.36, -bh * 0.92, bw * 0.12, bh * 0.74, bw * 0.06);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.beginPath();
  ctx.arc(bw * 0.24, -bh * 0.82, bw * 0.05, 0, TAU);
  ctx.fill();
  bottlePath(ctx, bw, bh, nw, nh);
  ctx.strokeStyle = o.shimmer ? `rgba(255,248,190,${0.7 + 0.3 * Math.sin(t * 0.3)})` : 'rgba(225,240,255,.78)';
  ctx.lineWidth = o.shimmer ? 2.6 : 1.6;
  ctx.stroke();
  ctx.fillStyle = 'rgba(235,245,255,.75)';
  ctx.beginPath();
  ctx.roundRect(-nw / 2 - 2, -bh - nh - 2, nw + 4, 4, 2);
  ctx.fill();
  // 코르크 (완성)
  if (o.cork >= 0) {
    const dy = (1 - ease(o.cork)) * -R(0.07), bounce = o.cork < 1 ? 0 : 0;
    ctx.fillStyle = '#b07a48';
    ctx.beginPath();
    ctx.roundRect(-nw * 0.5, -bh - nh - R(0.018) + dy + bounce, nw, R(0.026), 3);
    ctx.fill();
    ctx.fillStyle = '#8a5a32';
    ctx.fillRect(-nw * 0.5, -bh - nh - R(0.018) + dy + R(0.009), nw, 1.5);
    ctx.fillStyle = '#d23a4a';
    ctx.beginPath();
    ctx.arc(0, -bh - nh + R(0.004) + dy, nw * 0.32, 0, TAU);
    ctx.fill();
    if (o.cork >= 1)
      for (let q = 0; q < 3; q++) {
        const a = t * 0.05 + q * 2.1, rr2 = bw * (0.75 + 0.15 * Math.sin(t * 0.07 + q));
        const tw = 0.5 + 0.5 * Math.sin(t * 0.2 + q * 1.7);
        ctx.fillStyle = `rgba(255,250,200,${0.3 + 0.6 * tw})`;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * rr2, -bh * 0.55 + Math.sin(a) * bh * 0.5, 1.2 + tw * 1.4, 0, TAU);
        ctx.fill();
      }
  }
  // 얼음
  if (o.ice > 0.01) {
    ctx.globalAlpha = (o.dim ? 0.72 : 1) * o.ice;
    const ig = ctx.createLinearGradient(-bw, -bh - nh, bw, 0);
    ig.addColorStop(0, 'rgba(230,248,255,.88)');
    ig.addColorStop(0.5, 'rgba(170,220,255,.62)');
    ig.addColorStop(1, 'rgba(210,240,255,.85)');
    ctx.fillStyle = ig;
    ctx.beginPath();
    ctx.roundRect(-bw * 0.68, -bh - nh - R(0.02), bw * 1.36, bh + nh + R(0.03), bw * 0.3);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.75)';
    ctx.lineWidth = 1;
    for (let q = 0; q < 4; q++) {
      const sx = (hsh(q + o.key * 3) - 0.5) * bw, sy = -bh * (0.15 + 0.75 * hsh(q * 7 + o.key));
      ctx.beginPath();
      ctx.moveTo(sx - bw * 0.2, sy + bw * 0.12);
      ctx.lineTo(sx, sy);
      ctx.lineTo(sx + bw * 0.16, sy - bw * 0.2);
      ctx.stroke();
    }
    ctx.fillStyle = '#ffffff';
    ctx.font = `${Math.max(13, R(0.042))}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('❄️', 0, -bh * 0.5);
  }
  ctx.restore();
}

/** 선반 (yb = 병 바닥 높이 화면 px) */
function drawShelf(ctx: CanvasRenderingContext2D, X: F, R: F, yb: number) {
  const x0 = X(0.025), x1 = X(0.975), back = yb - R(0.016), front = yb + R(0.012), fb = front + R(0.024);
  // 받침쇠
  ctx.fillStyle = '#2b2233';
  for (const bx of [0.1, 0.9]) {
    ctx.beginPath();
    ctx.moveTo(X(bx) - R(0.012), fb);
    ctx.lineTo(X(bx) + R(0.012), fb);
    ctx.lineTo(X(bx) + R(0.004), fb + R(0.05));
    ctx.lineTo(X(bx) - R(0.004), fb + R(0.05));
    ctx.fill();
  }
  // 그림자
  const sg = ctx.createLinearGradient(0, fb, 0, fb + R(0.05));
  sg.addColorStop(0, 'rgba(0,0,0,.45)');
  sg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(x0, fb, x1 - x0, R(0.05));
  // 윗면 (3/4 시점)
  const tg = ctx.createLinearGradient(0, back, 0, front);
  tg.addColorStop(0, '#7a5236');
  tg.addColorStop(1, '#a87548');
  ctx.fillStyle = tg;
  ctx.beginPath();
  ctx.moveTo(x0 + R(0.02), back);
  ctx.lineTo(x1 - R(0.02), back);
  ctx.lineTo(x1, front);
  ctx.lineTo(x0, front);
  ctx.closePath();
  ctx.fill();
  // 앞면 + 나뭇결
  const fg = ctx.createLinearGradient(0, front, 0, fb);
  fg.addColorStop(0, '#8a5a36');
  fg.addColorStop(1, '#5e3b22');
  ctx.fillStyle = fg;
  ctx.fillRect(x0, front, x1 - x0, fb - front);
  ctx.strokeStyle = 'rgba(40,20,8,.35)';
  ctx.lineWidth = 1;
  for (let k = 0; k < 2; k++) {
    ctx.beginPath();
    for (let x = 0.025; x <= 0.975; x += 0.04) ctx.lineTo(X(x), front + (fb - front) * (0.35 + 0.3 * k) + Math.sin(x * 20 + k * 3) * 1.2);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,220,170,.35)';
  ctx.beginPath();
  ctx.moveTo(x0, front + 0.5);
  ctx.lineTo(x1, front + 0.5);
  ctx.stroke();
}

/** 붓는 중인 병의 자리·기울기·내용물, 받는 병의 내용물 */
function pourPose(s: PotionState, R: F) {
  const a = s.anim!, L = s.L, u = s.t - a.t0;
  const sx = L.px[a.s], sy = L.py[a.s] - LIFT;
  const tx = a.d >= 0 ? L.px[a.d] : CX, ty = a.d >= 0 ? bottleTop(L, a.d) - 0.012 : CY - 0.075;
  const side = tx >= sx ? 1 : -1, th = side * (a.d === CAUL ? 1.25 : 1.2);
  const H = L.cap[a.s] * UH + NECK;
  // 입구가 받는 병 입구 바로 위에 오게
  const mx = tx - side * 0.022, my = ty - 0.03;
  const bx = mx - Math.sin(th) * H, by = my + Math.cos(th) * H;
  const go = easeIO(u / 10), back = easeIO((u - 23) / 7);
  const k = u < 23 ? go : 1 - back;
  const rot = th * (u < 23 ? easeIO((u - 3) / 9) : 1 - back);
  const x = sx + (bx - sx) * k, y = sy + (by - sy) * k;
  const f = cl01((u - 12) / 10);
  void R;
  return { x, y, rot, f, u, mx, my, tx, ty, side };
}

const recentSay = new WeakMap<object, { x: number; y: number; t: number }[]>();
function drawAll(ctx: CanvasRenderingContext2D, s: PotionState, w: number, h: number, th: Theme) {
  const fx = juice(s), t = s.t, L = s.L, S = s.S, d = STAGES[s.stage];
  const X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w;
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  ctx.save();
  fx.begin(ctx);
  drawRoom(ctx, s, w, h, X, Y, R, t);
  // ═════════ 선반 ═════════
  const rows = [...new Set(L.py)];
  for (const yb of rows) drawShelf(ctx, X, R, Y(yb));
  // ═════════ 병 ═════════
  const a = s.anim, pose = a ? pourPose(s, R) : null;
  const sel = s.phase === 'play' ? s.sel : -1, selQ = sel >= 0 ? ease((t - s.selT) / 7) : 0;
  const legal = sel >= 0 ? (i: number) => canPour(L, S, sel, i) : () => false;
  for (let i = 0; i < L.n; i++) {
    const live = (S.live >> i) & 1;
    if (!live || (i === L.gslot && s.giftT >= 0 && t < s.giftT)) {
      if (i === L.gslot) drawGiftSlot(ctx, s, X(L.px[i]), Y(L.py[i]), R, t);
      continue;
    }
    if (a && i === a.s) continue;
    let yb = L.py[i], drop = 0;
    if (i === L.gslot && s.giftT >= 0 && t < s.giftT + 24) {
      const q = cl01((t - s.giftT) / 18);
      drop = -(1 - q * q) * 0.9;
      if (t >= s.giftT + 18) drop = -Math.sin(((t - s.giftT - 18) / 6) * Math.PI) * 0.025;
    }
    yb += drop;
    const lift = i === sel ? LIFT * selQ : 0;
    // 그림자
    ctx.fillStyle = `rgba(0,0,0,${0.38 - lift * 3})`;
    ctx.beginPath();
    ctx.ellipse(X(L.px[i]), Y(L.py[i]) + 1, R(BW * 0.55) * (1 - lift * 3), R(0.009), 0, 0, TAU);
    ctx.fill();
    let segs = segsOf(S.b[i], S.hid[i]);
    if (a && i === a.d && pose) {
      segs = segsOf(a.db, a.dh);
      if (a.kind === 'pour') segs.push({ c: a.c, h: a.n * pose.f, hid: false });
      else if (a.kind === 'poof' && segs.length) segs[segs.length - 1].h = 1 - cl01((pose.u - 19) / 5);
    }
    const done = (S.done >> i) & 1, ck = s.corkT[i];
    const cork = done && ck >= 0 ? (t < ck ? -1 : cl01((t - ck) / 8)) : done ? 1 : -1;
    const iced = (S.ice >> i) & 1 ? 1 : s.meltT[i] >= 0 && t < s.meltT[i] + 24 ? (t < s.meltT[i] ? 1 : 1 - (t - s.meltT[i]) / 24) : 0;
    const isLegal = legal(i);
    drawBottle(ctx, X(L.px[i]), Y(yb - lift), R, L.cap[i], segs, {
      rot: s.wob[i] * 0.6, t, cork, ice: iced, slosh: s.slosh[i], key: i, gift: 0,
      glow: i === sel ? '#fff3b0' : cork >= 0 ? POT[S.b[i][0]] ?? null : isLegal ? '#fff8d0' : null,
      shimmer: isLegal, dim: sel >= 0 && i !== sel && !isLegal && !done, 
    });
    if (isLegal) drawSparkles(ctx, X(L.px[i]), Y(bottleTop(L, i) - 0.01), R, t, i);
    if (L.cap[i] === 3 && !done) {
      ctx.fillStyle = 'rgba(255,240,220,.85)';
      font(0.03, 800);
      ctx.textAlign = 'center';
      ctx.fillText('3칸', X(L.px[i]), Y(L.py[i] + 0.033));
    }
  }
  // ═════════ 바닥·가마솥·고양이 ═════════
  drawFloor(ctx, X, Y, R, w, h);
  drawCauldron(ctx, s, X, Y, R, t, sel >= 0 && canPour(L, S, sel, CAUL));
  drawCat(ctx, X(0.205), Y(1.272), R(0.215), s, t);
  drawUndo(ctx, s, X, Y, R, t, font);
  // ═════════ 붓는 병 (맨 앞) ═════════
  if (a && pose) {
    const segs = segsOf(a.sb, a.sh);
    let left = a.n * pose.f;
    for (let j = segs.length - 1; j >= 0 && left > 0; j--) {
      const take = Math.min(segs[j].h, left);
      segs[j].h -= take;
      left -= take;
    }
    // 물줄기
    if (pose.u >= 12 && pose.u < 23) {
      const H = L.cap[a.s] * UH + NECK, mx = pose.x + Math.sin(pose.rot) * H, my = pose.y - Math.cos(pose.rot) * H;
      const endY = a.d >= 0 ? L.py[a.d] - (a.db.length + (a.kind === 'pour' ? a.n * pose.f : 0)) * UH : CY - 0.06;
      const col = POT[a.c] ?? '#ffffff', wob = Math.sin(t * 0.9) * R(0.004);
      const wd = R(a.kind === 'pour' ? 0.012 + 0.004 * Math.min(3, a.n) : 0.01) * Math.min(1, (23 - pose.u) / 3, (pose.u - 11) / 2);
      ctx.strokeStyle = col;
      ctx.lineCap = 'round';
      ctx.lineWidth = wd;
      ctx.beginPath();
      ctx.moveTo(X(mx), Y(my));
      ctx.quadraticCurveTo(X(mx + pose.side * 0.03) + wob, Y(my + 0.01), X(pose.tx) + wob, Y(endY));
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.45)';
      ctx.lineWidth = wd * 0.3;
      ctx.stroke();
      ctx.lineCap = 'butt';
      for (let q = 0; q < 3; q++) {
        const ph = (t * 0.2 + q / 3) % 1;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(X(pose.tx + (hsh(q + t) - 0.5) * 0.03), Y(endY - 0.01 - ph * 0.02), R(0.004), 0, TAU);
        ctx.fill();
      }
    }
    drawBottle(ctx, X(pose.x), Y(pose.y), R, L.cap[a.s], segs, { rot: pose.rot, t, cork: -1, ice: 0, slosh: s.slosh[a.s] + (pose.u < 23 ? Math.sin(t * 0.5) * 0.3 : 0), key: a.s, gift: 0, glow: null, shimmer: false, dim: false });
  }
  // ═════════ 연기 ═════════
  for (const m of s.smoke) {
    const u = t - m.t0;
    if (u < 0) continue;
    const q = u / 80;
    for (let k = 0; k < 7; k++) {
      const ang = (k / 7) * TAU + hsh(k + m.t0) * 0.8, dist = R(0.03 + 0.07 * ease(q * 2)) * m.big;
      ctx.fillStyle = m.col;
      ctx.globalAlpha = Math.max(0, 0.75 * (1 - q));
      ctx.beginPath();
      ctx.arc(X(m.x) + Math.cos(ang) * dist, Y(m.y) + Math.sin(ang) * dist * 0.7 - R(0.06) * q, R(0.025 + 0.025 * q) * m.big * (0.7 + 0.5 * hsh(k * 3 + m.t0)), 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  // 가장자리 어둡게
  const vg = ctx.createRadialGradient(w / 2, h * 0.5, R(0.42), w / 2, h * 0.5, R(1.02));
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(8,2,18,.45)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
  // ═════════ 사건 연출 ═════════
  const say = (x: number, y: number, text: string, col: string, size: number) => {
    let rec = recentSay.get(s);
    if (!rec) recentSay.set(s, (rec = []));
    y = Math.max(Y(0.16), Math.min(Y(1.24), y));
    for (let k = 0; k < 6 && rec.some((q) => t - q.t < 45 && Math.abs(q.x - x) < w * 0.32 && Math.abs(q.y - y) < size + 5); k++) y -= size + 6;
    rec.push({ x, y, t });
    if (rec.length > 12) rec.shift();
    ctx.font = `800 ${size}px system-ui, sans-serif`;
    const hw = ctx.measureText(text).width / 2 + 6;
    fx.pop(Math.max(hw, Math.min(w - hw, x)), y, text, col, size);
  };
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    const due = e.v !== undefined && !['clear'].includes(e.kind) ? e.v : e.t;
    if (due <= seenT || due > t) continue;
    const x = X(e.x), y = Y(e.y);
    if (e.kind === 'glug') say(x + R(0.06), y - R(0.03), e.text!, e.col!, 15), fx.kick(1.2);
    if (e.kind === 'splash') fx.burst(x, y, e.col!, 10, 2.2, 2), fx.ring(x, y, e.col!, R(0.05), 2);
    if (e.kind === 'poof') fx.burst(x, y, '#e6d8ff', 26, 3.4, 3.2), fx.burst(x, y, '#ff7ad9', 14, 4, 2), fx.ring(x, y, '#f0e0ff', R(0.12), 5), fx.kick(6), say(x, y - R(0.06), e.text!, e.col!, 24);
    if (e.kind === 'burn') fx.burst(x, y, '#8dff9a', 22, 3, 2.6), fx.ring(x, y, '#bfffc4', R(0.13), 4), fx.kick(3), say(x, y - R(0.1), e.text!, e.col!, 18);
    if (e.kind === 'done') {
      fx.burst(x, y, e.col!, 30, 4.2, 3), fx.burst(x, y, '#fff6c0', 16, 3, 2), fx.ring(x, y, e.col!, R(0.14), 5), fx.ring(x, y, '#fff6c0', R(0.2), 3), fx.kick(4);
      say(x, y - R(0.12), e.text!, '#fff6d0', 26);
    }
    if (e.kind === 'order') say(x, y + R(0.02), e.text!, e.col!, 15), fx.burst(x, y, '#ffe066', 14, 3, 2);
    if (e.kind === 'wrong') say(x, y + R(0.02), e.text!, e.col!, 14);
    if (e.kind === 'melt') fx.burst(x, y, '#d8f4ff', 22, 3.4, 2.4), fx.ring(x, y, '#e8fbff', R(0.1), 4), say(x, y - R(0.05), e.text!, e.col!, 16);
    if (e.kind === 'gift') fx.burst(x, y, '#ffc2e2', 22, 3.6, 2.6), fx.kick(5), say(x, y - R(0.05), e.text!, e.col!, 17);
    if (e.kind === 'reveal') fx.ring(x, y, '#fff6a8', R(0.06), 3), fx.burst(x, y, '#fff6a8', 8, 1.8, 1.6), fx.pop(x + R(0.05), y, e.text!, e.col!, 18);
    if (e.kind === 'nope') say(x, y - R(0.03), e.text!, e.col!, 14), fx.kick(1.5);
    if (e.kind === 'miss' || e.kind === 'say') say(x, y, e.text!, e.col!, 14);
    if (e.kind === 'undo') fx.ring(x, y, '#e6dcff', R(0.09), 4), fx.burst(x, y, '#e6dcff', 14, 3, 2), say(x - R(0.08), y - R(0.09), e.text!, e.col!, 15);
    if (e.kind === 'jam') fx.kick(8), fx.blink(th.hot, 0.25);
    if (e.kind === 'stage') fx.blink('#fff6d6', 0.18);
    if (e.kind === 'clear') fx.burst(X(0.5), Y(0.6), '#ffe066', 46, 6, 3.2), fx.burst(X(0.5), Y(0.6), '#ff9ad5', 30, 5, 3), fx.ring(X(0.5), Y(0.6), '#ffe066', R(0.35), 6), fx.blink('#fff6c8', 0.25);
    if (e.kind === 'fail') fx.kick(9), fx.blink(th.hot, 0.22);
  }
  fx.memo.t = t;
  if (s.batT >= 0 && (fx.memo.bat ?? -1) !== s.batT && t >= s.batT) (fx.memo.bat = s.batT), say(X(0.47), Y(0.19), '끼익!', '#e8dcff', 13);
  ctx.restore();
  drawHud(ctx, s, d, w, X, Y, R, font, th);
}

function drawSparkles(ctx: CanvasRenderingContext2D, x: number, y: number, R: F, t: number, k: number) {
  for (let q = 0; q < 3; q++) {
    const a = t * 0.08 + q * 2.1 + k, r = R(0.04);
    const tw = 0.5 + 0.5 * Math.sin(t * 0.3 + q * 2 + k);
    ctx.fillStyle = `rgba(255,248,190,${0.4 + 0.6 * tw})`;
    const sx = x + Math.cos(a) * r, sy = y - R(0.02) + Math.sin(a) * r * 0.5, z = R(0.006) * (0.6 + tw);
    ctx.beginPath();
    ctx.moveTo(sx, sy - z * 2);
    ctx.lineTo(sx + z * 0.6, sy);
    ctx.lineTo(sx, sy + z * 2);
    ctx.lineTo(sx - z * 0.6, sy);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(sx - z * 2, sy);
    ctx.lineTo(sx, sy + z * 0.6);
    ctx.lineTo(sx + z * 2, sy);
    ctx.lineTo(sx, sy - z * 0.6);
    ctx.fill();
  }
  // 아래로 붓는 화살표
  ctx.fillStyle = `rgba(255,248,190,${0.55 + 0.35 * Math.sin(t * 0.25)})`;
  const bob = Math.sin(t * 0.2 + k) * R(0.006);
  ctx.beginPath();
  ctx.moveTo(x - R(0.014), y - R(0.045) + bob);
  ctx.lineTo(x + R(0.014), y - R(0.045) + bob);
  ctx.lineTo(x, y - R(0.025) + bob);
  ctx.fill();
}

function drawGiftSlot(ctx: CanvasRenderingContext2D, s: PotionState, x: number, y: number, R: F, t: number) {
  const L = s.L, bw = R(BW), bh = 4 * R(UH), nh = R(NECK);
  ctx.save();
  ctx.translate(x, y);
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = 'rgba(255,200,230,.55)';
  ctx.lineWidth = 1.5;
  bottlePath(ctx, bw, bh, bw * 0.46, nh);
  ctx.stroke();
  ctx.setLineDash([]);
  // 리본
  const c = POT[L.ribbon] ?? '#ff8fc6', bob = Math.sin(t * 0.08) * R(0.004);
  ctx.fillStyle = c;
  ctx.strokeStyle = 'rgba(0,0,0,.35)';
  ctx.lineWidth = 1;
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, -bh * 0.55 + bob);
    ctx.quadraticCurveTo(sd * bw * 0.7, -bh * 0.85 + bob, sd * bw * 0.55, -bh * 0.4 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(0, -bh * 0.55 + bob, bw * 0.13, 0, TAU);
  ctx.fill();
  ctx.font = `900 ${Math.max(12, R(0.032))}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffe0f0';
  ctx.fillText('새 병', 0, -bh * 0.15);
  ctx.restore();
}

function drawRoom(ctx: CanvasRenderingContext2D, s: PotionState, w: number, h: number, X: F, Y: F, R: F, t: number) {
  // 돌벽
  const wall = ctx.createLinearGradient(0, 0, 0, h);
  wall.addColorStop(0, '#2a1f3f');
  wall.addColorStop(0.55, '#33264a');
  wall.addColorStop(1, '#1d1530');
  ctx.fillStyle = wall;
  ctx.fillRect(-10, -10, w + 20, h + 20);
  const bh = R(0.06), bwid = R(0.15);
  for (let r = 0; r * bh < Y(1.06); r++) {
    const off = (r % 2) * bwid * 0.5;
    for (let c = -1; c * bwid < w + bwid; c++) {
      const v = hsh(r * 31 + c * 7);
      ctx.fillStyle = `rgba(${90 + v * 30},${70 + v * 22},${120 + v * 30},${0.18 + v * 0.14})`;
      ctx.beginPath();
      ctx.roundRect(c * bwid + off + 1.5, r * bh + 1.5, bwid - 3, bh - 3, 4);
      ctx.fill();
    }
  }
  // 촛불 빛 번짐
  const glow = ctx.createRadialGradient(X(0.5), Y(0.62), R(0.05), X(0.5), Y(0.7), R(0.8));
  glow.addColorStop(0, 'rgba(255,190,120,.24)');
  glow.addColorStop(1, 'rgba(255,170,90,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  // 천장 들보 + 말린 풀
  ctx.fillStyle = '#3a2618';
  ctx.fillRect(0, Y(0.066), w, R(0.026));
  ctx.fillStyle = 'rgba(255,220,170,.18)';
  ctx.fillRect(0, Y(0.066), w, 1.5);
  for (const [hx, hc] of [[0.36, '#7fae5a'], [0.58, '#a68a4a'], [0.4, '#8bbf6a']] as [number, string][]) {
    const sw = Math.sin(t * 0.02 + hx * 9) * R(0.004);
    ctx.strokeStyle = '#5a4030';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(X(hx), Y(0.092));
    ctx.lineTo(X(hx) + sw, Y(0.115));
    ctx.stroke();
    ctx.strokeStyle = hc;
    ctx.lineWidth = 2;
    for (let k = -2; k <= 2; k++) {
      ctx.beginPath();
      ctx.moveTo(X(hx) + sw, Y(0.115));
      ctx.lineTo(X(hx) + sw * 2 + k * R(0.008), Y(0.16 + Math.abs(k) * -0.008));
      ctx.stroke();
    }
  }
  // 창문 (달밤)
  {
    const x0 = X(0.05), x1 = X(0.29), y0 = Y(0.115), y1 = Y(0.33), cx = (x0 + x1) / 2, rr = (x1 - x0) / 2;
    ctx.fillStyle = '#4a3322';
    ctx.beginPath();
    ctx.moveTo(x0 - 5, y1 + 5);
    ctx.lineTo(x0 - 5, y0 + rr);
    ctx.arc(cx, y0 + rr, rr + 5, Math.PI, 0);
    ctx.lineTo(x1 + 5, y1 + 5);
    ctx.fill();
    const sky = ctx.createLinearGradient(0, y0, 0, y1);
    sky.addColorStop(0, '#0d1236');
    sky.addColorStop(1, '#2b2b6a');
    ctx.fillStyle = sky;
    ctx.beginPath();
    ctx.moveTo(x0, y1);
    ctx.lineTo(x0, y0 + rr);
    ctx.arc(cx, y0 + rr, rr, Math.PI, 0);
    ctx.lineTo(x1, y1);
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.clip();
    for (let k = 0; k < 9; k++) {
      ctx.fillStyle = `rgba(255,255,230,${0.3 + 0.6 * Math.abs(Math.sin(t / 40 + k * 1.7))})`;
      ctx.fillRect(x0 + hsh(k + 40) * (x1 - x0), y0 + hsh(k + 60) * (y1 - y0) * 0.8, 1.6, 1.6);
    }
    const full = s.stage === STAGES.length - 1, mr = R(full ? 0.05 : 0.036), mx = cx + R(0.03), my = y0 + rr * 0.9;
    const mg = ctx.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 2.6);
    mg.addColorStop(0, 'rgba(255,240,180,.45)');
    mg.addColorStop(1, 'rgba(255,240,180,0)');
    ctx.fillStyle = mg;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, TAU);
    ctx.fill();
    if (!full) {
      ctx.fillStyle = '#16194a';
      ctx.beginPath();
      ctx.arc(mx + mr * 0.45, my - mr * 0.2, mr * 0.9, 0, TAU);
      ctx.fill();
    }
    // 지붕 실루엣
    ctx.fillStyle = '#0a0b22';
    ctx.beginPath();
    ctx.moveTo(x0, y1);
    ctx.lineTo(x0, y1 - R(0.04));
    ctx.lineTo(x0 + R(0.05), y1 - R(0.07));
    ctx.lineTo(x0 + R(0.1), y1 - R(0.04));
    ctx.lineTo(x0 + R(0.13), y1 - R(0.055));
    ctx.lineTo(x1, y1 - R(0.03));
    ctx.lineTo(x1, y1);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#4a3322';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, y0);
    ctx.lineTo(cx, y1);
    ctx.moveTo(x0, y0 + rr * 1.15);
    ctx.lineTo(x1, y0 + rr * 1.15);
    ctx.stroke();
    // 창턱 + 초
    ctx.fillStyle = '#6a4a30';
    ctx.fillRect(x0 - R(0.02), y1 + 2, x1 - x0 + R(0.04), R(0.016));
    drawCandle(ctx, x1 - R(0.02), y1 + 2, R, t, 1);
  }
  // 손님 창구 (부엉이)
  {
    const x0 = X(0.62), x1 = X(0.975), y0 = Y(0.15), y1 = Y(0.33);
    ctx.fillStyle = '#4a3322';
    ctx.beginPath();
    ctx.roundRect(x0 - 5, y0 - 5, x1 - x0 + 10, y1 - y0 + 10, 8);
    ctx.fill();
    const sky = ctx.createLinearGradient(0, y0, 0, y1);
    sky.addColorStop(0, '#141a42');
    sky.addColorStop(1, '#2c2a5e');
    ctx.fillStyle = sky;
    ctx.beginPath();
    ctx.roundRect(x0, y0, x1 - x0, y1 - y0, 5);
    ctx.fill();
    // 차양
    for (let k = 0; k < 7; k++) {
      ctx.fillStyle = k % 2 ? '#e8d6ff' : '#8a4fd0';
      ctx.beginPath();
      const sx = x0 - 5 + ((x1 - x0 + 10) / 7) * k, ww = (x1 - x0 + 10) / 7;
      ctx.moveTo(sx, y0 - R(0.03));
      ctx.lineTo(sx + ww, y0 - R(0.03));
      ctx.lineTo(sx + ww, y0 - R(0.005));
      ctx.arc(sx + ww / 2, y0 - R(0.005), ww / 2, 0, Math.PI);
      ctx.fill();
    }
    ctx.fillStyle = '#7a5236';
    ctx.fillRect(x0 - R(0.015), y1 - R(0.006), x1 - x0 + R(0.03), R(0.02));
    drawOwl(ctx, X(0.885), y1 - R(0.004), R(0.115), s, t);
    drawOrder(ctx, s, X, Y, R, t);
  }
  drawBat(ctx, X(0.47), Y(0.092), R(0.05), s, t);
}

function drawCandle(ctx: CanvasRenderingContext2D, x: number, y: number, R: F, t: number, k: number) {
  const fl = 1 + 0.12 * Math.sin(t * 0.3 + k) + 0.06 * Math.sin(t * 0.77 + k);
  const g = ctx.createRadialGradient(x, y - R(0.05), 1, x, y - R(0.05), R(0.12) * fl);
  g.addColorStop(0, 'rgba(255,200,120,.45)');
  g.addColorStop(1, 'rgba(255,170,90,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - R(0.13), y - R(0.18), R(0.26), R(0.26));
  ctx.fillStyle = '#f2e6cf';
  ctx.fillRect(x - R(0.008), y - R(0.035), R(0.016), R(0.035));
  ctx.fillStyle = '#ffcf6b';
  ctx.beginPath();
  ctx.ellipse(x, y - R(0.046), R(0.006) * fl, R(0.012) * fl, Math.sin(t * 0.2 + k) * 0.15, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fff6d8';
  ctx.beginPath();
  ctx.ellipse(x, y - R(0.043), R(0.003), R(0.006), 0, 0, TAU);
  ctx.fill();
}

function drawOrder(ctx: CanvasRenderingContext2D, s: PotionState, X: F, Y: F, R: F, t: number) {
  const L = s.L, S = s.S, n = L.order.length;
  if (!n) return;
  const bx = X(0.632), by = Y(0.163), bw = R(0.2), bh = R(0.118);
  const bob = s.owl === 'happy' ? Math.sin(t * 0.4) * 2 : 0;
  ctx.fillStyle = 'rgba(255,250,240,.96)';
  ctx.beginPath();
  ctx.roundRect(bx, by + bob, bw, bh, R(0.022));
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(bx + bw - R(0.01), by + bh * 0.35 + bob);
  ctx.lineTo(bx + bw + R(0.028), by + bh * 0.55 + bob);
  ctx.lineTo(bx + bw - R(0.01), by + bh * 0.68 + bob);
  ctx.fill();
  const gap = R(0.075), x0 = bx + bw / 2 - ((n - 1) * gap) / 2;
  for (let k = 0; k < n; k++) {
    const c = L.order[k], cx = x0 + k * gap, cy = by + R(0.042) + bob;
    // 작은 물약병
    ctx.fillStyle = POT[c];
    ctx.beginPath();
    ctx.arc(cx, cy + R(0.008), R(0.02), 0, TAU);
    ctx.fill();
    ctx.fillRect(cx - R(0.007), cy - R(0.024), R(0.014), R(0.018));
    ctx.fillStyle = '#b07a48';
    ctx.fillRect(cx - R(0.008), cy - R(0.032), R(0.016), R(0.01));
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.font = `900 ${Math.max(11, R(0.024))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(SYM[c], cx, cy + R(0.009));
    const done = S.oi > k, bad = !S.ook && S.oi <= k;
    if (done || bad) {
      ctx.font = `900 ${Math.max(13, R(0.036))}px system-ui, sans-serif`;
      ctx.fillStyle = done ? '#1f9a52' : '#e2574c';
      ctx.fillText(done ? '✓' : '✗', cx + R(0.026), cy - R(0.016));
    }
    if (k < n - 1) {
      ctx.fillStyle = '#7a5a8a';
      ctx.font = `900 ${Math.max(12, R(0.03))}px system-ui, sans-serif`;
      ctx.fillText('→', cx + gap / 2, cy + R(0.006));
    }
  }
  ctx.fillStyle = '#5a3a6a';
  ctx.font = `800 ${Math.max(12, R(0.03))}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(n === 1 ? '이거 먼저!' : '순서대로!', bx + bw / 2, by + bh * 0.8 + bob);
}

function drawOwl(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, s: PotionState, t: number) {
  const m = s.owl, age = t - s.owlT;
  const hop = m === 'happy' ? Math.abs(Math.sin(age * 0.25)) * u * 0.12 : 0, tilt = m === 'wait' ? Math.sin(t * 0.02) * 0.12 : m === 'sad' ? -0.18 : 0;
  ctx.save();
  ctx.translate(x, y - hop);
  ctx.rotate(tilt);
  // 날개
  const flap = m === 'happy' ? Math.sin(age * 0.6) * 0.8 : 0;
  for (const sd of [-1, 1]) {
    ctx.save();
    ctx.translate(sd * u * 0.3, -u * 0.5);
    ctx.rotate(sd * (0.15 + Math.max(0, flap) * 0.9) * (m === 'sad' ? -0.5 : 1));
    ctx.fillStyle = '#6b4c32';
    ctx.beginPath();
    ctx.ellipse(sd * u * 0.06, u * 0.12, u * 0.14, u * 0.3, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  // 몸
  ctx.fillStyle = '#8a6544';
  ctx.beginPath();
  ctx.ellipse(0, -u * 0.48, u * 0.36, u * 0.48, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#d9c09a';
  ctx.beginPath();
  ctx.ellipse(0, -u * 0.3, u * 0.22, u * 0.27, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,90,60,.6)';
  ctx.lineWidth = 1;
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    ctx.moveTo(-u * 0.08, -u * (0.38 - k * 0.1));
    ctx.lineTo(0, -u * (0.34 - k * 0.1));
    ctx.lineTo(u * 0.08, -u * (0.38 - k * 0.1));
    ctx.stroke();
  }
  // 귀깃
  ctx.fillStyle = '#6b4c32';
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sd * u * 0.12, -u * 0.86);
    ctx.lineTo(sd * u * 0.32, -u * 1.02);
    ctx.lineTo(sd * u * 0.3, -u * 0.74);
    ctx.fill();
  }
  // 눈
  const blink = m === 'wait' && t % 170 < 7;
  for (const sd of [-1, 1]) {
    const ex = sd * u * 0.15, ey = -u * 0.7;
    ctx.fillStyle = '#f2a83a';
    ctx.beginPath();
    ctx.arc(ex, ey, u * 0.14, 0, TAU);
    ctx.fill();
    if (m === 'happy') {
      ctx.strokeStyle = '#2a1a10';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ex, ey + u * 0.03, u * 0.07, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#fffaf0';
      ctx.beginPath();
      ctx.arc(ex, ey, u * 0.1, 0, TAU);
      ctx.fill();
      if (blink || m === 'sad') {
        ctx.fillStyle = '#8a6544';
        ctx.fillRect(ex - u * 0.11, ey - u * 0.11, u * 0.22, blink ? u * 0.2 : u * 0.1);
      }
      if (!blink) {
        ctx.fillStyle = '#1a1010';
        ctx.beginPath();
        ctx.arc(ex + u * 0.015, ey + u * 0.02, u * 0.05, 0, TAU);
        ctx.fill();
      }
    }
  }
  ctx.fillStyle = '#e8902a';
  ctx.beginPath();
  ctx.moveTo(-u * 0.05, -u * 0.6);
  ctx.lineTo(u * 0.05, -u * 0.6);
  ctx.lineTo(0, -u * 0.48);
  ctx.fill();
  if (m === 'sad') {
    ctx.fillStyle = '#9fd6ff';
    ctx.beginPath();
    ctx.ellipse(u * 0.2, -u * 0.55 + ((age * 0.6) % (u * 0.3)), u * 0.03, u * 0.05, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = '#e8902a';
  for (const sd of [-1, 1]) (ctx.beginPath(), ctx.ellipse(x + sd * u * 0.12, y - 1, u * 0.07, u * 0.035, 0, 0, TAU), ctx.fill());
}

function drawBat(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, s: PotionState, t: number) {
  const age = t - s.batT, flap = age >= 0 && age < 50;
  ctx.strokeStyle = '#1a1424';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + u * 0.2);
  ctx.stroke();
  ctx.save();
  ctx.translate(x, y + u * 0.2);
  ctx.rotate(Math.sin(t * 0.03) * 0.15 + (flap ? Math.sin(age * 0.5) * 0.3 : 0));
  ctx.fillStyle = '#2a2236';
  const sp = flap ? 0.6 + 0.4 * Math.sin(age * 0.9) : 0;
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, u * 0.15);
    ctx.quadraticCurveTo(sd * u * (0.3 + sp * 0.5), u * (0.1 - sp * 0.2), sd * u * (0.25 + sp * 0.65), u * (0.55 - sp * 0.3));
    ctx.quadraticCurveTo(sd * u * 0.18, u * 0.45, 0, u * 0.6);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(0, u * 0.38, u * 0.16, u * 0.26, 0, 0, TAU);
  ctx.fill();
  // 거꾸로 매달린 머리 (아래쪽)
  ctx.beginPath();
  ctx.arc(0, u * 0.66, u * 0.14, 0, TAU);
  ctx.fill();
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sd * u * 0.04, u * 0.76);
    ctx.lineTo(sd * u * 0.13, u * 0.9);
    ctx.lineTo(sd * u * 0.13, u * 0.72);
    ctx.fill();
  }
  ctx.fillStyle = flap ? '#ffe066' : '#ffd23f';
  for (const sd of [-1, 1]) (ctx.beginPath(), ctx.arc(sd * u * 0.055, u * 0.63, u * (flap ? 0.04 : 0.025), 0, TAU), ctx.fill());
  ctx.restore();
}

function drawFloor(ctx: CanvasRenderingContext2D, X: F, Y: F, R: F, w: number, h: number) {
  const y0 = Y(1.045);
  const fg = ctx.createLinearGradient(0, y0, 0, h);
  fg.addColorStop(0, '#4a3122');
  fg.addColorStop(1, '#2c1c13');
  ctx.fillStyle = fg;
  ctx.fillRect(0, y0, w, h - y0);
  ctx.strokeStyle = 'rgba(0,0,0,.3)';
  ctx.lineWidth = 1;
  for (let k = 1; k < 6; k++) {
    const yy = y0 + (h - y0) * (k / 6) * (k / 6);
    ctx.beginPath();
    ctx.moveTo(0, yy);
    ctx.lineTo(w, yy);
    ctx.stroke();
  }
  for (let k = 0; k < 9; k++) {
    ctx.beginPath();
    ctx.moveTo(X(0.5) + (k - 4) * R(0.09), y0);
    ctx.lineTo(X(0.5) + (k - 4) * R(0.2), h);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,200,140,.12)';
  ctx.fillRect(0, y0, w, 2);
}

function drawCauldron(ctx: CanvasRenderingContext2D, s: PotionState, X: F, Y: F, R: F, t: number, canTarget: boolean) {
  const cx = X(CX), cy = Y(CY), rx = R(0.125), ry = R(0.085), L = s.L;
  const boil = s.caulT >= 0 && t - s.caulT >= 0 && t - s.caulT < 50 ? 1 - (t - s.caulT) / 50 : 0;
  // 불빛
  const fl = 1 + 0.1 * Math.sin(t * 0.37) + 0.08 * Math.sin(t * 0.91);
  const lg = ctx.createRadialGradient(cx, cy + ry, R(0.02), cx, cy + ry, R(0.32) * fl);
  lg.addColorStop(0, 'rgba(255,150,60,.4)');
  lg.addColorStop(1, 'rgba(255,120,40,0)');
  ctx.fillStyle = lg;
  ctx.fillRect(cx - R(0.35), cy - R(0.25), R(0.7), R(0.5));
  // 장작 + 불
  ctx.fillStyle = '#5a3420';
  ctx.save();
  ctx.translate(cx, cy + ry * 1.05);
  for (const a of [-0.25, 0.25]) (ctx.save(), ctx.rotate(a), ctx.fillRect(-R(0.07), -R(0.008), R(0.14), R(0.016)), ctx.restore());
  ctx.restore();
  for (let k = 0; k < 5; k++) {
    const fx0 = cx + (k - 2) * R(0.022), hh = R(0.04 + 0.02 * Math.sin(t * 0.4 + k * 1.3)) * fl * (1 + boil * 0.6);
    ctx.fillStyle = k % 2 ? '#ffb43a' : '#ff6a2a';
    ctx.beginPath();
    ctx.moveTo(fx0 - R(0.014), cy + ry * 1.0);
    ctx.quadraticCurveTo(fx0 - R(0.01), cy + ry * 1.0 - hh * 0.6, fx0 + Math.sin(t * 0.3 + k) * R(0.005), cy + ry * 1.0 - hh);
    ctx.quadraticCurveTo(fx0 + R(0.01), cy + ry * 1.0 - hh * 0.6, fx0 + R(0.014), cy + ry * 1.0);
    ctx.fill();
  }
  // 다리
  ctx.fillStyle = '#16121c';
  for (const sd of [-0.7, 0.7]) (ctx.beginPath(), ctx.ellipse(cx + sd * rx, cy + ry * 0.85, R(0.014), R(0.022), sd * 0.3, 0, TAU), ctx.fill());
  // 솥 몸통
  const pg = ctx.createLinearGradient(cx - rx, 0, cx + rx, 0);
  pg.addColorStop(0, '#1a1622');
  pg.addColorStop(0.35, '#4a4458');
  pg.addColorStop(0.6, '#2a2433');
  pg.addColorStop(1, '#100c16');
  ctx.fillStyle = pg;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,170,90,.25)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + ry * 0.55, rx * 0.8, ry * 0.4, 0, 0, Math.PI);
  ctx.fill();
  // 테두리 + 물약
  const ry2 = R(0.026), rimY = cy - ry * 0.62;
  ctx.fillStyle = '#2d2838';
  ctx.beginPath();
  ctx.ellipse(cx, rimY, rx * 0.98, ry2 + 4, 0, 0, TAU);
  ctx.fill();
  const bg = ctx.createRadialGradient(cx, rimY, 2, cx, rimY, rx);
  bg.addColorStop(0, boil ? '#d8ffb0' : '#9dff8a');
  bg.addColorStop(1, '#2ea84a');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.ellipse(cx, rimY + 1, rx * 0.86, ry2, 0, 0, TAU);
  ctx.fill();
  for (let k = 0; k < 5; k++) {
    const ph = (t * (0.025 + boil * 0.05) + hsh(k + 3)) % 1, bx = cx + (hsh(k * 5) - 0.5) * rx * 1.4;
    ctx.strokeStyle = `rgba(220,255,210,${0.7 * (1 - ph)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(bx, rimY + 1 - ph * R(0.012), R(0.006) + ph * R(0.01) * (1 + boil), 0, TAU);
    ctx.stroke();
  }
  ctx.strokeStyle = canTarget ? `rgba(255,248,190,${0.7 + 0.3 * Math.sin(t * 0.3)})` : 'rgba(255,255,255,.18)';
  ctx.lineWidth = canTarget ? 3 : 1.5;
  ctx.beginPath();
  ctx.ellipse(cx, rimY, rx * 0.98, ry2 + 4, 0, 0, TAU);
  ctx.stroke();
  // 김
  for (let k = 0; k < 3; k++) {
    const ph = (t * 0.008 + k / 3) % 1;
    ctx.strokeStyle = `rgba(210,255,215,${0.32 * Math.sin(ph * Math.PI)})`;
    ctx.lineWidth = R(0.012) * (1 - ph * 0.5);
    ctx.beginPath();
    const sx = cx + (k - 1) * R(0.05);
    for (let q = 0; q <= 6; q++) ctx.lineTo(sx + Math.sin(q * 0.9 + t * 0.04 + k) * R(0.012), rimY - R(0.02) - ph * R(0.15) - q * R(0.012));
    ctx.stroke();
  }
  // 가마솥 쓸 수 있는 판: 남은 횟수
  if (L.burn > 0) {
    const n = s.S.burn;
    ctx.fillStyle = 'rgba(30,14,10,.75)';
    ctx.beginPath();
    ctx.roundRect(cx + rx * 0.55, cy - ry * 1.6, R(0.11), R(0.045), R(0.02));
    ctx.fill();
    ctx.font = `900 ${Math.max(12, R(0.032))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = n > 0 ? '#ffcf8a' : 'rgba(255,255,255,.45)';
    ctx.fillText(`🔥×${n}`, cx + rx * 0.55 + R(0.055), cy - ry * 1.6 + R(0.0235));
    if (canTarget) drawSparkles(ctx, cx, rimY - R(0.01), R, t, 9);
  }
}

function drawUndo(ctx: CanvasRenderingContext2D, s: PotionState, X: F, Y: F, R: F, t: number, font: (sz: number, w?: number) => void) {
  const on = s.undo > 0 && !!s.prev && s.phase === 'play';
  const x = X(UX), y = Y(UY), r = R(UR), spin = t - s.undoT < 20 ? (1 - (t - s.undoT) / 20) * -TAU : 0;
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.95, r * 0.9, r * 0.25, 0, 0, TAU);
  ctx.fill();
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 2, x, y, r);
  g.addColorStop(0, on ? '#cdb6ff' : '#6a5a80');
  g.addColorStop(1, on ? '#6a3fc0' : '#3a3048');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = on ? '#efe2ff' : 'rgba(255,255,255,.3)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spin);
  ctx.strokeStyle = on ? '#ffffff' : 'rgba(255,255,255,.4)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.45, -Math.PI * 0.9, Math.PI * 0.6);
  ctx.stroke();
  ctx.fillStyle = on ? '#ffffff' : 'rgba(255,255,255,.4)';
  ctx.beginPath();
  ctx.moveTo(-r * 0.62, -r * 0.2);
  ctx.lineTo(-r * 0.2, -r * 0.2);
  ctx.lineTo(-r * 0.45, r * 0.18);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  font(0.03, 800);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = on ? '#efe2ff' : 'rgba(255,255,255,.45)';
  ctx.fillText(`되돌리기 ${s.undo}`, x, y + r + R(0.028));
}

/** 고양이 마녀 (x,y = 앉은 자리 바닥, u = 크기) */
function drawCat(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, s: PotionState, t: number) {
  const m = s.mood, age = t - s.moodT;
  const fur = '#2a2533', fur2 = '#3d3650', rim = 'rgba(255,190,130,.55)';
  const puff = m === 'puff', proud = m === 'proud', dizzy = m === 'dizzy', worry = m === 'worry', wow = m === 'wow' || m === 'huh';
  const jump = puff ? Math.max(0, Math.sin(Math.min(age, 14) / 14 * Math.PI)) * u * 0.15 : proud ? Math.abs(Math.sin(age * 0.18)) * u * 0.04 * Math.max(0, 1 - age / 60) : 0;
  // 그림자
  ctx.fillStyle = 'rgba(0,0,0,.4)';
  ctx.beginPath();
  ctx.ellipse(x, y, u * 0.42, u * 0.07, 0, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.translate(x, y - jump);
  // 꼬리
  {
    const base = { x: -u * 0.22, y: -u * 0.12 };
    ctx.strokeStyle = fur;
    ctx.lineCap = 'round';
    ctx.lineWidth = u * (puff ? 0.17 : 0.09);
    ctx.beginPath();
    ctx.moveTo(base.x, base.y);
    if (proud) {
      const sw = Math.sin(t * 0.25) * u * 0.04;
      ctx.quadraticCurveTo(-u * 0.5, -u * 0.3, -u * 0.46 + sw, -u * 0.95);
      ctx.quadraticCurveTo(-u * 0.44 + sw, -u * 1.12, -u * 0.32 + sw, -u * 1.08);
    } else if (dizzy) ctx.quadraticCurveTo(-u * 0.55, -u * 0.02, -u * 0.72, -u * 0.04);
    else {
      const sw = Math.sin(t * 0.05) * u * 0.12;
      ctx.quadraticCurveTo(-u * 0.6, -u * 0.15, -u * 0.55 + sw, -u * (puff ? 0.85 : 0.55));
    }
    ctx.stroke();
    if (puff) {
      ctx.strokeStyle = fur2;
      ctx.lineWidth = 1.5;
      for (let k = 0; k < 9; k++) {
        const q = k / 9, px = base.x + (-u * 0.55 - base.x) * q, py = base.y + (-u * 0.85 - base.y) * q, a = k * 2.3;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + Math.cos(a) * u * 0.12, py + Math.sin(a) * u * 0.12);
        ctx.stroke();
      }
    }
    if (proud) {
      ctx.strokeStyle = rim;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-u * 0.47, -u * 0.5);
      ctx.lineTo(-u * 0.47, -u * 0.9);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }
  // 몸 (털이 서면 뾰족뾰족)
  const bodyPath = (sc: number) => {
    ctx.beginPath();
    if (puff) {
      for (let k = 0; k <= 28; k++) {
        const a = (k / 28) * TAU, rr = k % 2 ? 1 : 1.18;
        ctx.lineTo(Math.cos(a) * u * 0.3 * rr * sc, -u * 0.32 + Math.sin(a) * u * 0.33 * rr * sc);
      }
    } else ctx.ellipse(0, -u * 0.3, u * 0.29 * sc, u * 0.33 * sc, 0, 0, TAU);
  };
  bodyPath(1);
  ctx.fillStyle = fur;
  ctx.fill();
  ctx.strokeStyle = rim;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // 망토 끈 + 가슴 털
  ctx.fillStyle = '#4a3a6a';
  ctx.beginPath();
  ctx.moveTo(-u * 0.24, -u * 0.5);
  ctx.quadraticCurveTo(0, -u * 0.38, u * 0.24, -u * 0.5);
  ctx.lineTo(u * 0.27, -u * 0.08);
  ctx.quadraticCurveTo(0, u * 0.02, -u * 0.27, -u * 0.08);
  ctx.closePath();
  ctx.globalAlpha = 0.55;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#e9e2f2';
  ctx.beginPath();
  ctx.ellipse(u * 0.02, -u * 0.36, u * 0.1, u * 0.14, 0, 0, TAU);
  ctx.fill();
  // 앞발 + 국자 (가마솥을 휘휘)
  {
    const st = s.phase === 'play' && !dizzy ? Math.sin(t * 0.07) : 0;
    const hx = u * 0.3, hy = -u * 0.32 + st * u * 0.03;
    const ex = u * (1.05 + st * 0.08), ey = -u * 0.62 + Math.cos(t * 0.07) * u * 0.03;
    ctx.strokeStyle = '#8a5a32';
    ctx.lineWidth = u * 0.045;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.fillStyle = '#6a4a30';
    ctx.beginPath();
    ctx.ellipse(ex + u * 0.03, ey + u * 0.02, u * 0.06, u * 0.035, 0.4, 0, TAU);
    ctx.fill();
    ctx.fillStyle = fur;
    ctx.beginPath();
    ctx.ellipse(hx, hy, u * 0.08, u * 0.065, 0.3, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-u * 0.1, -u * 0.02, u * 0.09, u * 0.05, 0, 0, TAU);
    ctx.fill();
  }
  // 머리
  ctx.save();
  ctx.translate(u * 0.03, -u * 0.72);
  ctx.rotate(proud ? -0.18 : dizzy ? Math.sin(t * 0.15) * 0.2 : wow ? 0.05 : Math.sin(t * 0.03) * 0.04);
  const hr = u * 0.25;
  // 귀
  const earDown = worry || dizzy ? 0.35 : 0;
  for (const sd of [-1, 1]) {
    ctx.save();
    ctx.translate(sd * hr * 0.62, -hr * 0.55);
    ctx.rotate(sd * (0.25 + earDown));
    ctx.fillStyle = fur;
    ctx.beginPath();
    ctx.moveTo(-hr * 0.32, hr * 0.15);
    ctx.lineTo(0, -hr * 0.62);
    ctx.lineTo(hr * 0.32, hr * 0.15);
    ctx.fill();
    ctx.fillStyle = '#e88aa8';
    ctx.beginPath();
    ctx.moveTo(-hr * 0.16, hr * 0.08);
    ctx.lineTo(0, -hr * 0.38);
    ctx.lineTo(hr * 0.16, hr * 0.08);
    ctx.fill();
    ctx.restore();
  }
  ctx.beginPath();
  if (puff) for (let k = 0; k <= 22; k++) {
    const a = (k / 22) * TAU, rr = k % 2 ? 1 : 1.16;
    ctx.lineTo(Math.cos(a) * hr * rr, Math.sin(a) * hr * 0.92 * rr);
  }
  else ctx.ellipse(0, 0, hr, hr * 0.9, 0, 0, TAU);
  ctx.fillStyle = fur;
  ctx.fill();
  ctx.strokeStyle = rim;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // 눈
  const blink = m === 'idle' && t % 200 < 6;
  for (const sd of [-1, 1]) {
    const ex = sd * hr * 0.42, ey = -hr * 0.05;
    if (proud) {
      ctx.strokeStyle = '#d9f56a';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(ex, ey + hr * 0.08, hr * 0.17, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      continue;
    }
    if (dizzy) {
      ctx.strokeStyle = '#d9f56a';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (let q = 0; q < 16; q++) {
        const a = q * 0.75 + t * 0.2 * sd, rr = (q / 16) * hr * 0.2;
        ctx.lineTo(ex + Math.cos(a) * rr, ey + Math.sin(a) * rr);
      }
      ctx.stroke();
      continue;
    }
    if (blink) {
      ctx.strokeStyle = '#d9f56a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ex - hr * 0.15, ey);
      ctx.lineTo(ex + hr * 0.15, ey);
      ctx.stroke();
      continue;
    }
    const big = wow || puff ? 1.25 : 1;
    ctx.fillStyle = '#d9f56a';
    ctx.beginPath();
    ctx.ellipse(ex, ey, hr * 0.19 * big, hr * 0.22 * big, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#121016';
    ctx.beginPath();
    if (puff || worry) ctx.arc(ex, ey, hr * 0.05, 0, TAU);
    else if (wow) ctx.arc(ex, ey, hr * 0.12, 0, TAU);
    else ctx.ellipse(ex + Math.sin(t * 0.01) * hr * 0.03, ey, hr * 0.05, hr * 0.17, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex - hr * 0.06, ey - hr * 0.08, hr * 0.045, 0, TAU);
    ctx.fill();
  }
  // 코·입·수염
  ctx.fillStyle = '#ff9bb8';
  ctx.beginPath();
  ctx.moveTo(-hr * 0.08, hr * 0.2);
  ctx.lineTo(hr * 0.08, hr * 0.2);
  ctx.lineTo(0, hr * 0.3);
  ctx.fill();
  ctx.strokeStyle = '#e9e2f2';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  if (puff || wow) ctx.ellipse(0, hr * 0.45, hr * 0.09, hr * (puff ? 0.12 : 0.08), 0, 0, TAU);
  else if (worry || dizzy) (ctx.moveTo(-hr * 0.14, hr * 0.46), ctx.quadraticCurveTo(0, hr * 0.36, hr * 0.14, hr * 0.46));
  else (ctx.moveTo(-hr * 0.15, hr * 0.36), ctx.quadraticCurveTo(-hr * 0.07, hr * 0.46, 0, hr * 0.32), ctx.quadraticCurveTo(hr * 0.07, hr * 0.46, hr * 0.15, hr * 0.36));
  ctx.stroke();
  ctx.strokeStyle = 'rgba(233,226,242,.7)';
  ctx.lineWidth = 1;
  for (const sd of [-1, 1])
    for (let k = -1; k <= 1; k++) {
      ctx.beginPath();
      ctx.moveTo(sd * hr * 0.25, hr * 0.3 + k * hr * 0.06);
      ctx.lineTo(sd * hr * (0.95 + (puff ? 0.2 : 0)), hr * 0.24 + k * hr * (puff ? 0.22 : 0.12));
      ctx.stroke();
    }
  if (worry) {
    ctx.fillStyle = '#9fd6ff';
    ctx.beginPath();
    const dy = (age * 0.5) % (hr * 0.6);
    ctx.ellipse(hr * 0.78, -hr * 0.2 + dy, hr * 0.07, hr * 0.11, 0, 0, TAU);
    ctx.fill();
  }
  if (puff) {
    // 그을음
    ctx.fillStyle = 'rgba(160,150,180,.55)';
    for (let k = 0; k < 4; k++) (ctx.beginPath(), ctx.arc((hsh(k + 3) - 0.5) * hr * 1.2, (hsh(k + 9) - 0.5) * hr, hr * 0.12, 0, TAU), ctx.fill());
  }
  // 마녀 모자
  {
    const tip = proud ? -0.25 : puff ? 0.5 : dizzy ? 0.6 : 0.1, lift = puff ? hr * 0.5 * Math.max(0, 1 - age / 30) : 0;
    ctx.save();
    ctx.translate(0, -hr * 0.62 - lift);
    ctx.rotate(dizzy ? 0.35 : proud ? -0.12 : 0);
    ctx.fillStyle = '#5a2f9a';
    ctx.beginPath();
    ctx.ellipse(0, 0, hr * 1.25, hr * 0.26, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#6e3cba';
    ctx.beginPath();
    ctx.moveTo(-hr * 0.68, -hr * 0.04);
    ctx.quadraticCurveTo(-hr * 0.3, -hr * 1.2, hr * (0.25 + tip), -hr * 1.75);
    ctx.quadraticCurveTo(hr * 0.15, -hr * 1.05, hr * 0.68, -hr * 0.04);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(-hr * 0.62, -hr * 0.3, hr * 1.24, hr * 0.2);
    ctx.fillStyle = '#ffe680';
    ctx.font = `${Math.max(10, hr * 0.5)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', -hr * 0.05, -hr * 0.7);
    ctx.restore();
  }
  ctx.restore();
  // 어질어질 별
  if (dizzy) {
    ctx.fillStyle = '#ffe066';
    ctx.font = `${Math.max(12, u * 0.14)}px system-ui`;
    ctx.textAlign = 'center';
    for (let k = 0; k < 3; k++) {
      const a = t * 0.12 + (k * TAU) / 3;
      ctx.fillText('★', u * 0.03 + Math.cos(a) * u * 0.3, -u * 1.0 + Math.sin(a) * u * 0.08);
    }
  }
  if (proud && age < 70) {
    for (let k = 0; k < 4; k++) {
      const tw = 0.5 + 0.5 * Math.sin(t * 0.3 + k * 1.6);
      ctx.fillStyle = `rgba(255,240,170,${tw})`;
      ctx.beginPath();
      ctx.arc(-u * 0.4 + Math.cos(k * 1.7) * u * 0.18, -u * 0.95 + Math.sin(k * 2.3) * u * 0.18, 1.5 + tw * 2, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawHud(ctx: CanvasRenderingContext2D, s: PotionState, d: StageDef, w: number, X: F, Y: F, R: F, font: (sz: number, w?: number) => void, th: Theme) {
  const t = s.t, S = s.S, L = s.L;
  const hb = R(0.066);
  ctx.fillStyle = 'rgba(18,10,30,.88)';
  ctx.fillRect(0, 0, w, hb);
  font(0.04, 900);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f3e8ff';
  ctx.fillText(`${s.stage + 1}/${STAGES.length}판 · ${d.emoji} ${d.name}`, R(0.03), hb * 0.52);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffd166';
  const stt = `★ ${s.stars}`;
  ctx.fillText(stt, w - R(0.03), hb * 0.52);
  ctx.fillStyle = th.hot;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - R(0.06) - ctx.measureText(stt).width, hb * 0.52);
  // 붓기 막대 (🔮 마력)
  {
    const y = Y(0.385), x0 = X(0.12), x1 = X(0.6), bh = R(0.026), used = Math.min(S.pours, L.limit), q = used / L.limit, pq = L.P / L.limit;
    ctx.fillStyle = 'rgba(15,8,26,.7)';
    ctx.beginPath();
    ctx.roundRect(X(0.025), y - R(0.026), X(0.97) - X(0.025), R(0.052), R(0.026));
    ctx.fill();
    ctx.font = `${Math.max(15, R(0.046))}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('🔮', X(0.07), y + 1);
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    ctx.beginPath();
    ctx.roundRect(x0, y - bh / 2, x1 - x0, bh, bh / 2);
    ctx.fill();
    // 별 구간(초록) · 한도 구간
    ctx.fillStyle = 'rgba(120,230,150,.18)';
    ctx.beginPath();
    ctx.roundRect(x0, y - bh / 2, (x1 - x0) * pq, bh, bh / 2);
    ctx.fill();
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, '#9b7bff');
    g.addColorStop(pq, '#c58bff');
    g.addColorStop(Math.min(1, pq + 0.01), '#ff9a5a');
    g.addColorStop(1, '#ff5a6e');
    ctx.fillStyle = g;
    if (q > 0) (ctx.beginPath(), ctx.roundRect(x0, y - bh / 2, Math.max(bh, (x1 - x0) * q), bh, bh / 2), ctx.fill());
    const sx = x0 + (x1 - x0) * pq;
    ctx.fillStyle = S.pours <= L.P ? '#ffd166' : 'rgba(255,255,255,.35)';
    ctx.fillRect(sx - 1, y - bh * 0.85, 2, bh * 1.7);
    font(0.03, 900);
    ctx.fillText('★', sx, y - bh * 1.15);
    font(0.034, 900);
    ctx.textAlign = 'left';
    const left = L.limit - S.pours;
    ctx.fillStyle = left <= 3 ? '#ff9a8a' : '#efe2ff';
    ctx.fillText(`붓기 ${S.pours} / ${L.limit}`, X(0.63), y + 1);
  }
  // 새것 알림
  if (s.news && t - s.news.t < NEWS_T + 20) {
    const age = t - s.news.t, a = Math.min(1, age / 10, (NEWS_T + 20 - age) / 20), drop = Math.max(0, 10 - age) * 2;
    ctx.globalAlpha = a;
    const tx = `✨ ${s.news.text}`;
    let fs = 0.036;
    font(fs, 900);
    while (ctx.measureText(tx).width > w - R(0.05) && fs > 0.03) font((fs -= 0.001), 900);
    const tw2 = Math.min(w - 8, ctx.measureText(tx).width + 22), by2 = Y(0.108) - drop;
    ctx.fillStyle = 'rgba(40,18,60,.94)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw2 / 2, by2 - R(0.027), tw2, R(0.054), R(0.027));
    ctx.fill();
    ctx.strokeStyle = 'rgba(200,160,255,.6)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f6eaff';
    ctx.fillText(tx, w / 2, by2 + 1);
    ctx.globalAlpha = 1;
  }
  // 판 시작 큰 글씨
  {
    const age = t - s.startT;
    if (age < 90 && s.phase === 'play') {
      const a = Math.min(1, age / 8, (90 - age) / 18), sc = 1 + Math.max(0, 8 - age) * 0.04;
      ctx.globalAlpha = a;
      ctx.save();
      ctx.translate(w / 2, Y(0.47));
      ctx.scale(sc, sc);
      font(0.07, 900);
      ctx.textAlign = 'center';
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(25,10,40,.8)';
      const big = `${d.emoji} ${s.stage + 1}판 · ${d.name}`;
      ctx.strokeText(big, 0, 0);
      ctx.fillStyle = '#fff6d6';
      ctx.fillText(big, 0, 0);
      font(0.038, 800);
      const sub = `색 ${L.cols.length}가지를 한 병씩 모아요`;
      ctx.strokeText(sub, 0, R(0.06));
      ctx.fillText(sub, 0, R(0.06));
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }
  // 결과
  if (s.phase === 'result') {
    const age = s.pt, a = Math.min(1, age / 10);
    ctx.globalAlpha = a;
    ctx.fillStyle = s.ok ? 'rgba(40,20,70,.72)' : 'rgba(70,20,30,.72)';
    ctx.fillRect(0, Y(0.5), w, R(0.27));
    ctx.textAlign = 'center';
    font(s.ok ? 0.058 : 0.05, 900);
    ctx.fillStyle = s.ok ? '#fff1a8' : '#ffd0c8';
    ctx.fillText(s.ok ? (s.won ? '공방 대성공! 🎉' : `${d.emoji} ${d.name} 완성!`) : s.why, w / 2, Y(0.56));
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
      ctx.fillText(`붓기 ${S.pours}번 (★ ${L.P}번 안에) · 주문 ${S.ook ? '맞춤 ✓' : '못 맞춤'}`, w / 2, Y(0.725));
    } else {
      font(0.04, 800);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(s.hearts > 0 ? '♥ -1 · 이 판을 처음부터 다시' : '하트를 다 썼어요 — 끝', w / 2, Y(0.65));
    }
    ctx.globalAlpha = 1;
  }
  // ═════════ 아래 띠: 별 목표 · 안내 ═════════
  {
    const y0 = Y(1.285);
    const bg = ctx.createLinearGradient(0, y0, 0, Y(A));
    bg.addColorStop(0, 'rgba(18,10,30,.0)');
    bg.addColorStop(0.25, 'rgba(18,10,30,.82)');
    bg.addColorStop(1, 'rgba(18,10,30,.92)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, y0, w, Y(A) - y0);
    const y2 = Y(1.325), res = s.phase === 'result' && s.ok;
    const chips = [
      { txt: '완성', st: res ? true : null, dots: [] as number[] },
      { txt: `붓기 ${L.P}번 안에`, st: S.pours > L.P ? false : res ? true : null, dots: [] as number[] },
      { txt: L.order.length > 1 ? '📜 순서대로' : '📜 먼저', st: !S.ook ? false : S.oi >= L.order.length ? true : null, dots: L.order },
    ];
    const gx0 = R(0.02), gw = (w - R(0.04)) / 3;
    chips.forEach(({ txt, st, dots }, k) => {
      const gx = gx0 + k * gw;
      ctx.fillStyle = st === true ? 'rgba(255,209,102,.3)' : st === false ? 'rgba(0,0,0,.35)' : 'rgba(240,225,255,.12)';
      ctx.beginPath();
      ctx.roundRect(gx + 2, y2 - R(0.027), gw - 4, R(0.054), R(0.027));
      ctx.fill();
      font(0.032, 800);
      ctx.textAlign = 'center';
      const label = `${st === true ? '★' : st === false ? '✗' : '☆'} ${txt}`;
      const lw = ctx.measureText(label).width, dw = dots.length * R(0.03);
      const cx0 = gx + gw / 2 - dw / 2;
      ctx.fillStyle = st === false ? 'rgba(255,255,255,.45)' : '#fff6e0';
      ctx.fillText(label, cx0, y2 + 1);
      dots.forEach((c, j) => {
        const dx = cx0 + lw / 2 + R(0.017) + j * R(0.03);
        ctx.fillStyle = POT[c];
        ctx.beginPath();
        ctx.arc(dx, y2 + 1, R(0.012), 0, TAU);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.7)';
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    });
    const y3 = Y(1.405);
    let tp = '👆 병을 톡 → 다른 병을 톡하면 콸콸!';
    if (s.phase === 'result') tp = s.ok ? '다음 주문서가 와요!' : '같은 판을 다시 — 이번엔 붓는 순서를 골라서';
    else if (s.sel >= 0) tp = '반짝이는 병을 톡하면 콸콸! · 같은 병을 다시 톡하면 내려놓기';
    else if (L.limit - S.pours <= 3) tp = '⚠ 붓기가 얼마 안 남았어요 — 🔙 되돌리기도 있어요';
    else if (s.stage > 0 && S.pours > 0) tp = d.tip;
    else if (s.stage > 0) tp = d.tip;
    ctx.textAlign = 'center';
    font(0.034, 800);
    let fs = 0.034;
    while (ctx.measureText(tp).width > w - R(0.04) && fs > 0.03) font((fs -= 0.001), 800);
    ctx.fillStyle = 'rgba(240,228,255,.92)';
    ctx.fillText(tp, w / 2, y3);
  }
  // 첫 판: 손가락으로 붓는 순서 가리키기
  if (s.stage === 0 && S.pours === 0 && s.phase === 'play' && t - s.startT > 30 && !s.anim) {
    const m = L.plan[0];
    if (m) {
      const k = s.sel === m.s ? m.d : m.s;
      const bob = Math.sin(t * 0.15) * R(0.012), lift = k === s.sel ? LIFT : 0;
      const fx0 = X(L.px[k]), fy = Y(L.py[k] + 0.06 - lift) + bob;
      ctx.font = `${Math.max(18, R(0.075))}px system-ui`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('👆', fx0 + R(0.02), fy);
      ctx.strokeStyle = 'rgba(255,255,255,.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(X(L.px[k]), Y(L.py[k] - L.cap[k] * UH * 0.55 - lift), R(0.065) + Math.sin(t * 0.15) * 2, R(0.12), 0, 0, TAU);
      ctx.stroke();
    }
  }
  ctx.textBaseline = 'alphabetic';
}
