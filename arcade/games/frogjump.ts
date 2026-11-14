/**
 * 연잎 개구리 뛰어넘기 (27라운드: 전략이 깊은 검증된 캐주얼 뼈대 × 공장의 와우) — 뛰어넘어 잡기 × 가리키기(톡).
 * 뼈대: 오래 검증된 '뛰어넘어 잡기' 퍼즐. 말이 바로 옆 말을 뛰어넘어 그 너머 빈자리에 앉으면 넘긴 말이 빠진다.
 *   더 뛸 수 없으면 끝 — 남은 말이 적을수록 좋고, 하나만 남기면 완벽.
 * 우리 것: 연못 디오라마. 연잎마다 개구리, 뛰어넘긴 개구리는 '풍덩' 물에 빠져 어질어질 헤엄쳐 둑으로 나가 구경꾼이 된다.
 * 조작(기준 9): 개구리를 톡(갈 수 있는 연잎이 반짝 — 갈 곳이 하나면 바로 폴짝) → 연잎을 톡 → 폴짝. 톡 두 번이 전부, 끌기 없음.
 *   방금 뛴 개구리가 또 뛸 수 있으면 그대로 들려 있어서 연잎만 톡 하면 이어서 폴짝(연속 점프).
 * 판 8개: 통과 = 남은 개구리 N마리 이하. 별 = ★ 통과 · ★ 한 마리만 · ★ 👑 왕관 연잎에서 끝내기.
 *   못 넘으면 하트 -1, 그 판 처음부터. 판마다 되돌리기 2번(더 뛸 수 없을 때도 물릴 수 있다 — 측정: 통과는 돕고 ★3은 안 늘린다).
 * 펼쳐짐(하는 일이 바뀐다): 1판 톡톡 폴짝·풍덩·👑 → 2판 🔁 연속 점프(한 마리로 쓸어 담기) → 3판 💪 큰 두꺼비(두 번 넘어야 풍덩 — 다리로 두 번 쓴다)
 *   → 4판 🍂 시든 연잎(개구리가 떠나면 꼬르륵 — 밟는 순서) → 5판 🌿 청개구리(대각선도 — 아껴 둘 말) → 6판 🦟 소금쟁이(한 번 뛸 때마다 한 칸씩 — 언제 앉을까)
 *   → 7판 🌸 통통 연꽃(앉으면 같은 쪽으로 한 번 더 — 저절로 이어지는 연쇄를 노리거나 피하기) → 8판 🌕 보름달(전부).
 * 웃음: 뛰어넘길 개구리는 '헉!' 눈이 튀어나오고, 풍덩 빠진 개구리는 어질어질 헤엄쳐 둑에 앉아 구경꾼이 된다(연속 점프엔 박수, 실패엔 깔깔).
 *   두꺼비는 한 번 넘기면 납작 '꾸엑!', 한 마리만 남으면 왕관이 씌워지고 연꽃이 활짝.
 */
import { mulberry32, shuffle, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.45;
/** 방향: 위·오른쪽·아래·왼쪽, 대각선 넷 (청개구리만) */
const DC = [0, 1, 0, -1, 1, 1, -1, -1], DR = [-1, 0, 1, 0, -1, 1, 1, -1], OPP = [2, 3, 0, 1, 6, 7, 4, 5];
/** 별 점수: ★ 통과 50 · ★★ 한 마리 +100 · ★★★ 👑 +150 (어려운 별일수록 크게) */
const STAR_PTS = [0, 50, 150, 300], WIN_PTS = 100, PLOP_PTS = 5, SPARE_PTS = 10;
/** 폴짝 한 번 틱 수 · 넘긴 개구리가 물에 닿는 틱 (뛰기 시작부터) */
const HOP_T = 24, PLOP_T = 18, RESULT_OK = 170, RESULT_FAIL = 150, NEWS_T = 200, STUCK_T = 240;
/** 판마다 되돌리기 수. 측정(보통 사람 봇, 못 넘을 때만 물림): 0번 별 합 8.4 → 1번 9.1 → 2번 9.5, ★3 비율은 그대로 → 2번 */
export let UNDO = 2;
export const setUndo = (n: number) => void (UNDO = n);

// ───────────────────────────── 연못 ─────────────────────────────
export interface Pond { cols: number; rows: number; n: number; pc: number[]; pr: number[]; mid: number[]; land: number[] }
export function pondOf(rows: string[]): Pond {
  const R = rows.length, C = rows[0].length, cell: number[] = [], pc: number[] = [], pr: number[] = [];
  for (let r = 0; r < R; r++)
    for (let c = 0; c < C; c++) {
      if (rows[r][c] === 'o') cell.push(pc.length), pc.push(c), pr.push(r);
      else cell.push(-1);
    }
  const n = pc.length, mid = Array(n * 8).fill(-1), land = Array(n * 8).fill(-1);
  const at = (c: number, r: number) => (c < 0 || r < 0 || c >= C || r >= R ? -1 : cell[r * C + c]);
  for (let i = 0; i < n; i++)
    for (let d = 0; d < 8; d++) {
      const m = at(pc[i] + DC[d], pr[i] + DR[d]), l = at(pc[i] + 2 * DC[d], pr[i] + 2 * DR[d]);
      if (m >= 0 && l >= 0) (mid[i * 8 + d] = m), (land[i * 8 + d] = l);
    }
  return { cols: C, rows: R, n, pc, pr, mid, land };
}
/** 모양을 뒤집고 돌린다 (세로 화면이라 가로가 더 길면 다시 세운다) */
function transform(rows: string[], r: Rng): string[] {
  let g = rows.map((x) => x.split(''));
  if (r() < 0.5) g = g[0].map((_, c) => g.map((row) => row[c]));
  if (g[0].length > g.length) g = g[0].map((_, c) => g.map((row) => row[c]));
  if (r() < 0.5) g = g.map((row) => row.reverse());
  if (r() < 0.5) g.reverse();
  return g.map((row) => row.join(''));
}

// ───────────────────────────── 판 ─────────────────────────────
export interface StageDef {
  key: string; name: string; emoji: string; news: string; tip: string;
  shapes: string[][];
  /** 개구리 수(두꺼비 빼고) · 큰 두꺼비 · 청개구리 · 시든 연잎 수 · 통통 연꽃 수 · 소금쟁이 */
  frogs: number; toad: boolean; tree: boolean; wither: number; spring: number; strider: boolean;
  /** 판 만들 때 같은 개구리가 이어 뛰는 길을 고를 확률 · 곧게 이어 뛸 확률 */
  chainP: number; straightP: number;
  /** 아무렇게나 해도 통과할 확률 목표 (통과선 N을 이걸로 정한다) · 통과선 최대 */
  passP: number; maxGoal: number;
}
export const STAGES: StageDef[] = [
  { key: 'basic', name: '첫 연못', emoji: '🌱', news: '🐸 개구리를 톡 → 빈 연잎을 톡하면 폴짝! 넘긴 개구리는 풍덩', tip: '옆 개구리를 뛰어넘어 빈 연잎으로 — 넘긴 개구리는 풍덩',
    shapes: [['ooo', 'ooo', 'ooo', '.o.'], ['.o.', 'ooo', 'ooo', 'ooo', '.o.'], ['ooo.', 'oooo', '.ooo'], ['.oo.', 'oooo', 'oooo', '.oo.']], frogs: 6, toad: false, tree: false, wither: 0, spring: 0, strider: false, chainP: 0.5, straightP: 0, passP: 0.93, maxGoal: 3 },
  { key: 'chain', name: '연달아 폴짝', emoji: '🔁', news: '🔁 방금 뛴 개구리가 또 뛸 수 있으면 연잎만 톡 — 연속 점프!', tip: '한 마리로 쭉 이어 뛰면 연속 점프 — 점수가 커져요',
    shapes: [['oooo', 'oooo', 'oooo', 'oooo'], ['.ooo.', 'ooooo', 'ooooo', '.ooo.'], ['oooo', 'oooo', 'oooo']], frogs: 8, toad: false, tree: false, wither: 0, spring: 0, strider: false, chainP: 0.85, straightP: 0.3, passP: 0.6, maxGoal: 3 },
  { key: 'toad', name: '큰 두꺼비', emoji: '💪', news: '💪 큰 두꺼비 — 두 번 넘어야 풍덩! (두꺼비는 못 뛰어요)', tip: '💪 두꺼비는 두 번 넘어야 빠져요 — 다리로 두 번 써요',
    shapes: [['.ooo.', 'ooooo', 'ooooo', 'ooooo', '.ooo.'], ['oooo', 'oooo', 'oooo', 'oooo', 'oooo'], ['.ooo.', 'ooooo', 'ooooo', '.ooo.']], frogs: 9, toad: true, tree: false, wither: 0, spring: 0, strider: false, chainP: 0.6, straightP: 0, passP: 0.35, maxGoal: 3 },
  { key: 'wither', name: '시든 연잎', emoji: '🍂', news: '🍂 시든 연잎 — 개구리가 떠나면 꼬르륵 가라앉아요', tip: '🍂 시든 연잎은 한 번 떠나면 끝 — 밟는 순서를 아껴요',
    shapes: [['..o..', '.ooo.', 'ooooo', 'ooooo', '.ooo.', '..o..'], ['.oo.', 'oooo', 'oooo', 'oooo', 'oooo', '.oo.'], ['.ooo.', 'ooooo', 'ooooo', 'ooooo', '.ooo.']], frogs: 10, toad: false, tree: false, wither: 3, spring: 0, strider: false, chainP: 0.6, straightP: 0, passP: 0.3, maxGoal: 3 },
  { key: 'tree', name: '청개구리', emoji: '🌿', news: '🌿 청개구리는 대각선으로도 뛰어요!', tip: '🌿 청개구리만 대각선으로 — 귀퉁이는 청개구리 몫',
    shapes: [['o.o.o', '.ooo.', 'ooooo', 'ooooo', '.ooo.', 'o.o.o'], ['oo.oo', 'ooooo', '.ooo.', 'ooooo', 'oo.oo'], ['.ooo.', 'ooooo', 'oo.oo', 'ooooo', '.ooo.']], frogs: 10, toad: false, tree: true, wither: 0, spring: 0, strider: false, chainP: 0.6, straightP: 0, passP: 0.3, maxGoal: 3 },
  { key: 'strider', name: '소금쟁이', emoji: '🦟', news: '🦟 소금쟁이 — 한 번 뛸 때마다 한 칸씩, 거기엔 못 앉아요', tip: '🦟 소금쟁이 자리는 막혀요 — 언제 비는지 보고 뛰어요',
    shapes: [['ooooo', 'oo.oo', 'ooooo', 'ooooo', 'ooooo'], ['.ooo.', 'oo.oo', 'ooooo', 'ooooo', '.ooo.'], ['oooo', 'oooo', 'oooo', 'oooo', 'oooo']], frogs: 10, toad: false, tree: false, wither: 1, spring: 0, strider: true, chainP: 0.6, straightP: 0, passP: 0.25, maxGoal: 3 },
  { key: 'spring', name: '통통 연꽃', emoji: '🌸', news: '🌸 통통 연꽃 — 앉으면 같은 쪽으로 한 번 더 폴짝!', tip: '🌸 연꽃에 앉으면 저절로 한 번 더 — 노리거나 피하거나',
    shapes: [['ooooo', 'ooooo', 'ooooo', 'ooooo'], ['.ooo.', 'ooooo', 'ooooo', 'ooooo', '.ooo.'], ['oooo', 'oooo', 'oooo', 'oooo', 'oooo']], frogs: 11, toad: false, tree: false, wither: 0, spring: 2, strider: false, chainP: 0.8, straightP: 0.7, passP: 0.25, maxGoal: 3 },
  { key: 'moon', name: '보름달 연못', emoji: '🌕', news: '🌕 보름달 연못 — 다 나와요!', tip: '💪 🍂 🌿 🦟 — 마지막 한 마리를 👑 연잎으로!',
    shapes: [['..oo..', '.oooo.', 'oooooo', 'oooooo', '.oooo.', '..oo..'], ['.ooo.', 'ooooo', 'ooooo', 'ooooo', 'ooooo', '.ooo.']], frogs: 11, toad: true, tree: true, wither: 2, spring: 0, strider: true, chainP: 0.6, straightP: 0, passP: 0.25, maxGoal: 3 },
];
export const STAGE_COUNT = STAGES.length;

export interface Mv { a: number; d: number }
export interface Level {
  P: Pond; fr0: number; toad0: number; tree0: number; wither: number; spring: number; route: number[]; crown: number;
  /** 통과선: 남은 개구리(두꺼비 포함) 이 수 이하 */
  goal: number;
  /** 만들 때 확인한 풀이 (한 마리가 👑에서 끝난다) */
  plan: Mv[];
  habit: { left: number; stars: number }; rnd: number[];
}
export interface Sim {
  /** 개구리 비트 · 두꺼비 자리(-1 없음)·체력 · 청개구리 자리 · 가라앉은 연잎 비트 · 소금쟁이 길 위치 */
  fr: number; toad: number; thp: number; tree: number; sunk: number; sk: number;
  moves: number; last: number; chain: number; maxChain: number;
}
export type RE =
  | { k: 'hop'; a: number; b: number; c: number; d: number; tree: boolean; victim: 'frog' | 'tree' | 'toad' | 'squash'; bounce: boolean; chain: number }
  | { k: 'sink'; i: number; hop: number }
  | { k: 'strider'; from: number; to: number }
  | { k: 'stay'; at: number };

const pop = (x: number) => {
  let c = 0;
  for (; x; c++) x &= x - 1;
  return c;
};
export const newSim = (L: Level): Sim => ({ fr: L.fr0, toad: L.toad0, thp: L.toad0 >= 0 ? 2 : 0, tree: L.tree0, sunk: 0, sk: 0, moves: 0, last: -1, chain: 0, maxChain: 0 });
export const cloneSim = (S: Sim): Sim => ({ ...S });
export const isFrog = (S: Sim, i: number) => ((S.fr >> i) & 1) === 1;
const occ = (S: Sim, i: number) => isFrog(S, i) || S.toad === i;
export const striderAt = (L: Level, S: Sim) => (L.route.length ? L.route[S.sk] : -1);
export const leftOf = (S: Sim) => pop(S.fr) + (S.toad >= 0 ? 1 : 0);

export function canJump(L: Level, S: Sim, a: number, d: number): boolean {
  if (!isFrog(S, a) || (d >= 4 && a !== S.tree)) return false;
  const m = L.P.mid[a * 8 + d], c = L.P.land[a * 8 + d];
  if (m < 0 || !occ(S, m)) return false;
  return !occ(S, c) && !((S.sunk >> c) & 1) && c !== striderAt(L, S);
}
/** 폴짝 한 번 (통통 연꽃이면 저절로 더 뛴다, 소금쟁이는 끝나고 한 칸) — 부를 쪽이 canJump 확인 */
export function jump(L: Level, S: Sim, a: number, d: number, rec?: RE[]) {
  let hop = 0, bounce = false;
  for (;;) {
    const m = L.P.mid[a * 8 + d], c = L.P.land[a * 8 + d], wasTree = a === S.tree;
    S.fr = (S.fr & ~(1 << a)) | (1 << c);
    if (wasTree) S.tree = c;
    let victim: 'frog' | 'tree' | 'toad' | 'squash';
    if (S.toad === m) {
      S.thp--;
      if (S.thp <= 0) (S.toad = -1), (victim = 'toad');
      else victim = 'squash';
    } else {
      S.fr &= ~(1 << m);
      victim = m === S.tree ? 'tree' : 'frog';
      if (m === S.tree) S.tree = -1;
    }
    S.chain = S.last === a ? S.chain + 1 : 1;
    S.last = c;
    S.maxChain = Math.max(S.maxChain, S.chain);
    rec?.push({ k: 'hop', a, b: m, c, d, tree: wasTree, victim, bounce, chain: S.chain });
    if ((L.wither >> a) & 1) (S.sunk |= 1 << a), rec?.push({ k: 'sink', i: a, hop });
    if (victim !== 'squash' && (L.wither >> m) & 1) (S.sunk |= 1 << m), rec?.push({ k: 'sink', i: m, hop });
    hop++;
    if ((L.spring >> c) & 1 && canJump(L, S, c, d)) {
      a = c;
      bounce = true;
      continue;
    }
    break;
  }
  S.moves++;
  if (L.route.length) {
    const nx = (S.sk + 1) % L.route.length, p = L.route[nx];
    if (!occ(S, p) && !((S.sunk >> p) & 1)) rec?.push({ k: 'strider', from: L.route[S.sk], to: p }), (S.sk = nx);
    else rec?.push({ k: 'stay', at: L.route[S.sk] });
  }
}
export function movesOf(L: Level, S: Sim): Mv[] {
  const out: Mv[] = [];
  for (let a = 0; a < L.P.n; a++) {
    if (!isFrog(S, a)) continue;
    const nd = a === S.tree ? 8 : 4;
    for (let d = 0; d < nd; d++) if (canJump(L, S, a, d)) out.push({ a, d });
  }
  return out;
}
export function anyMove(L: Level, S: Sim) {
  for (let a = 0; a < L.P.n; a++) {
    if (!isFrog(S, a)) continue;
    const nd = a === S.tree ? 8 : 4;
    for (let d = 0; d < nd; d++) if (canJump(L, S, a, d)) return true;
  }
  return false;
}
/** 끝난 판의 순위 (작을수록 좋다): 👑에서 한 마리 2 · 한 마리 3 · n마리 2n+1 */
const fkey = (L: Level, S: Sim) => {
  const n = leftOf(S);
  return n === 1 ? (isFrog(S, L.crown) ? 2 : 3) : n * 2 + 1;
};
export const starsOf = (L: Level, S: Sim) => {
  const n = leftOf(S);
  return n > L.goal ? 0 : 1 + (n === 1 ? 1 : 0) + (n === 1 && isFrog(S, L.crown) ? 1 : 0);
};

// ───────────────────────────── 풀이 (깊이 우선 + 메모) ─────────────────────────────
const keyOf = (S: Sim) => S.fr + ',' + S.toad + ',' + S.thp + ',' + S.tree + ',' + S.sunk + ',' + S.sk;
const memoOf = new WeakMap<Level, Map<string, number>>();
/** 이 상태에서 끝까지 가장 잘 두면 받는 순위 (fkey) */
export function value(L: Level, S: Sim): number {
  let memo = memoOf.get(L);
  if (!memo) memoOf.set(L, (memo = new Map()));
  return V(L, S, memo);
}
function V(L: Level, S: Sim, memo: Map<string, number>): number {
  const k = keyOf(S), hit = memo.get(k);
  if (hit !== undefined) return hit;
  const ms = movesOf(L, S);
  let best = 99;
  if (!ms.length) best = fkey(L, S);
  else
    for (const m of ms) {
      const S2 = cloneSim(S);
      jump(L, S2, m.a, m.d);
      const v = V(L, S2, memo);
      if (v < best) best = v;
      if (best <= 2) break;
    }
  memo.set(k, best);
  return best;
}
/** 잘하는 수: 끝까지 내다보고 가장 좋은 결과로 가는 수 (같으면 방금 뛴 개구리로 이어 뛰기 — 연속 점프) */
export function smartPick(L: Level, S: Sim): Mv | null {
  const ms = movesOf(L, S);
  if (!ms.length) return null;
  ms.sort((x, y) => (y.a === S.last ? 1 : 0) - (x.a === S.last ? 1 : 0));
  let best: Mv | null = null, bv = 99;
  for (const m of ms) {
    const S2 = cloneSim(S);
    jump(L, S2, m.a, m.d);
    const v = value(L, S2);
    if (v < bv) (bv = v), (best = m);
    if (bv <= 2) break;
  }
  return best;
}
/** 버릇 하나(측정용): '뛸 수 있는 첫 개구리' — 위 줄 왼쪽부터 보며 처음 뛸 수 있는 개구리를, 처음 되는 쪽으로 */
export function habitPick(L: Level, S: Sim): Mv | null {
  for (let a = 0; a < L.P.n; a++) {
    if (!isFrog(S, a)) continue;
    const nd = a === S.tree ? 8 : 4;
    for (let d = 0; d < nd; d++) if (canJump(L, S, a, d)) return { a, d };
  }
  return null;
}
function habitRun(L: Level) {
  const S = newSim(L);
  for (let m = habitPick(L, S); m; m = habitPick(L, S)) jump(L, S, m.a, m.d);
  return { left: leftOf(S), stars: starsOf(L, S) };
}
/** 아무 개구리나 골라 아무 데나 뛰는 사람 (개구리 먼저 고르고, 그 개구리가 갈 곳 중 하나) */
function randomRun(L: Level, r: Rng) {
  const S = newSim(L);
  for (;;) {
    const ms = movesOf(L, S);
    if (!ms.length) return S;
    const fs = [...new Set(ms.map((m) => m.a))], a = fs[Math.floor(r() * fs.length)], mine = ms.filter((m) => m.a === a);
    const m = mine[Math.floor(r() * mine.length)];
    jump(L, S, m.a, m.d);
  }
}

// ───────────────────────────── 판 만들기 ─────────────────────────────
/** 거꾸로 만들기: 👑 연잎의 개구리 한 마리에서 시작해 '뛰기를 거꾸로' 되풀이한다 → 반드시 👑에서 한 마리로 풀리는 판 */
export function revGen(P: Pond, d: StageDef, r: Rng, crown: number): { fr: number; toad: number; tree: number; plan: Mv[] } | null {
  const steps = d.frogs - 1 + (d.toad ? 2 : 0);
  for (let attempt = 0; attempt < 40; attempt++) {
    let fr = 1 << crown, toad = -1, thp = 0, tree = d.tree ? (r() < 0.55 ? crown : -2) : -1, last = crown, lastD = -1, toadK = -1, diag = 0, ok = true;
    const toadAt = d.toad ? Math.floor(r() * Math.max(1, steps - 3)) : -1;
    const rev: Mv[] = [];
    for (let k = 0; k < steps; k++) {
      const needB = d.toad && thp === 0 && k >= toadAt, wantC = d.toad && thp === 1 && k > toadK;
      const cands: { c: number; a: number; b: number; dd: number; op: number }[] = [];
      for (let c = 0; c < P.n; c++) {
        if (!((fr >> c) & 1)) continue;
        const nd = c === tree ? 8 : 4;
        for (let dd = 0; dd < nd; dd++) {
          const od = OPP[dd], b = P.mid[c * 8 + od], a = P.land[c * 8 + od];
          if (b < 0 || (fr >> a) & 1 || a === toad) continue;
          if (b === toad) {
            if (wantC) cands.push({ c, a, b, dd, op: 2 });
            continue;
          }
          if ((fr >> b) & 1) continue;
          cands.push({ c, a, b, dd, op: needB ? 1 : 0 });
        }
      }
      let pool = cands.filter((x) => x.op === 2);
      if (!(pool.length && (r() < 0.55 || k === steps - 1))) {
        if (wantC && k === steps - 1) {
          ok = false;
          break;
        }
        pool = cands.filter((x) => x.op !== 2);
      }
      if (!pool.length) {
        ok = false;
        break;
      }
      const ch = pool.filter((x) => x.c === last);
      if (ch.length && r() < d.chainP) {
        pool = ch;
        const st = pool.filter((x) => x.dd === lastD);
        if (st.length && r() < d.straightP) pool = st;
      }
      if (d.tree) {
        const dg = pool.filter((x) => x.dd >= 4);
        if (dg.length && r() < 0.6) pool = dg;
      }
      const m = pool[Math.floor(r() * pool.length)];
      fr = (fr & ~(1 << m.c)) | (1 << m.a);
      if (m.c === tree) tree = m.a;
      if (m.op === 1) (toad = m.b), (thp = 1), (toadK = k);
      else if (m.op === 2) thp = 2;
      else {
        fr |= 1 << m.b;
        if (tree === -2 && r() < 0.3) tree = m.b;
      }
      if (m.dd >= 4) diag++;
      last = m.a;
      lastD = m.dd;
      rev.push({ a: m.a, d: m.dd });
    }
    if (!ok || (d.toad && thp !== 2) || (d.tree && (tree < 0 || diag < 2))) continue;
    return { fr, toad, tree, plan: rev.reverse() };
  }
  return null;
}

/** 풀이를 실제 규칙대로 둬 본다 (연꽃으로 저절로 뛴 것은 풀이의 다음 수와 같아야 한다). 성공하면 사람이 누를 수만 남긴 풀이 */
export function playPlan(L: Level, plan: Mv[]): { S: Sim; moves: Mv[] } | null {
  const S = newSim(L), moves: Mv[] = [];
  let i = 0;
  while (i < plan.length) {
    const m = plan[i];
    if (!canJump(L, S, m.a, m.d)) return null;
    const rec: RE[] = [];
    jump(L, S, m.a, m.d, rec);
    moves.push(m);
    const hops = rec.filter((e) => e.k === 'hop') as Extract<RE, { k: 'hop' }>[];
    for (let h = 1; h < hops.length; h++) {
      const nx = plan[i + h];
      if (!nx || nx.a !== hops[h].a || nx.d !== hops[h].d) return null;
    }
    i += hops.length;
  }
  if (anyMove(L, S) || fkey(L, S) !== 2) return null;
  return { S, moves };
}

export function makeLevel(d: StageDef, r: Rng): Level | null {
  const P = pondOf(transform(d.shapes[Math.floor(r() * d.shapes.length)], r));
  // 👑은 가장자리 한 줄 안쪽을 더 자주 (가운데 끝내기가 이 장르의 멋)
  const inner = [...Array(P.n).keys()].filter((i) => {
    let k = 0;
    for (let q = 0; q < 4; q++) if (P.mid[i * 8 + q] >= 0 || P.mid[i * 8 + OPP[q]] >= 0) k++;
    return k >= 3;
  });
  const all = shuffle([...Array(P.n).keys()], r), crowns = r() < 0.75 ? [...all.filter((i) => inner.includes(i)), ...all.filter((i) => !inner.includes(i))] : all;
  let g: ReturnType<typeof revGen> = null, crown = 0;
  for (const c of crowns.slice(0, 5)) if ((g = revGen(P, d, r, (crown = c)))) break;
  if (!g) return null;
  const L: Level = { P, fr0: g.fr, toad0: g.toad, tree0: g.tree, wither: 0, spring: 0, route: [], crown, goal: 3, plan: g.plan, habit: { left: 0, stars: 0 }, rnd: [] };
  let base = playPlan(L, L.plan);
  if (!base) return null;
  // 🍂 시든 연잎: 풀이에서 '한 번 떠난 뒤 다시 앉지 않는' 연잎 중에서 (일찍 떠나는 곳일수록)
  if (d.wither) {
    const S = newSim(L), vac = Array(P.n).fill(-1), bad = Array(P.n).fill(false);
    L.plan.forEach((m, t) => {
      const b = P.mid[m.a * 8 + m.d], c = P.land[m.a * 8 + m.d];
      if (vac[m.a] < 0) vac[m.a] = t;
      if (S.toad !== b || S.thp <= 1) if (vac[b] < 0) vac[b] = t;
      if (vac[c] >= 0) bad[c] = true;
      jump(L, S, m.a, m.d);
    });
    const ok = [...Array(P.n).keys()].filter((i) => vac[i] >= 0 && !bad[i] && i !== L.crown);
    shuffle(ok, r).sort((x, y) => vac[x] - vac[y] + (r() - 0.5) * 6);
    for (const i of ok.slice(0, d.wither)) L.wither |= 1 << i;
    if (pop(L.wither) < d.wither) return null;
  }
  // 🌸 통통 연꽃: 풀이에서 같은 개구리가 같은 쪽으로 곧게 이어 뛰는 자리
  if (d.spring) {
    const cand: number[] = [];
    for (let i = 0; i + 1 < L.plan.length; i++) {
      const m = L.plan[i], n2 = L.plan[i + 1], c = P.land[m.a * 8 + m.d];
      if (n2.a === c && n2.d === m.d && c !== L.crown) cand.push(c);
    }
    for (const c of shuffle([...new Set(cand)], r)) {
      if (pop(L.spring) >= d.spring) break;
      L.spring |= 1 << c;
      if (!playPlan(L, L.plan)) L.spring &= ~(1 << c);
    }
    if (!L.spring) return null;
  }
  // 🦟 소금쟁이: 두 칸(왔다 갔다) 또는 세 칸 줄 — 풀이가 앉는 연잎을 지나가는 길을 고른다 (언제 앉느냐가 수가 되게)
  if (d.strider) {
    const lands = Array(P.n).fill(0);
    for (const m of L.plan) lands[P.land[m.a * 8 + m.d]]++;
    const routes: number[][] = [];
    for (let p = 0; p < P.n; p++)
      for (let q = 0; q < 4; q++) {
        const m1 = P.mid[p * 8 + q], m2 = P.land[p * 8 + q];
        if (m1 >= 0) routes.push([p, m1]);
        if (m2 >= 0) routes.push([p, m1, m2, m1]);
      }
    let bestR: number[] | null = null, bv = -1;
    for (const rt of shuffle(routes, r)) {
      if (occ({ fr: L.fr0, toad: L.toad0 } as Sim, rt[0]) || (L.wither >> rt[0]) & 1 || rt.some((x) => (L.wither >> x) & 1)) continue;
      L.route = rt;
      if (!playPlan(L, L.plan)) continue;
      const v = rt.reduce((a, x) => a + lands[x], 0) + r() * 0.5 + (rt.length > 2 ? 0.5 : 0);
      if (v > bv) (bv = v), (bestR = rt);
    }
    if (!bestR || bv < 2) return null;
    L.route = bestR;
  }
  base = playPlan(L, L.plan);
  if (!base) return null;
  L.plan = base.moves;
  return L;
}

function rate(L: Level, d: StageDef, si: number, r: Rng) {
  L.habit = habitRun(L);
  const n = 40;
  L.rnd = [];
  for (let k = 0; k < n; k++) L.rnd.push(fkey(L, randomRun(L, r)));
  L.rnd.sort((x, y) => x - y);
  // 통과선: 아무렇게나 해도 passP 만큼은 넘는 가장 작은 수 (1판은 넉넉히)
  let goal = 1;
  while (goal < d.maxGoal + (si === 0 ? 1 : 0) && L.rnd.filter((x) => x <= goal * 2 + 1).length / n < d.passP) goal++;
  L.goal = goal;
}
/** 아무렇게나 할 때: 통과율 · ★3(👑에서 한 마리) 비율 */
const passOf = (L: Level) => L.rnd.filter((x) => x <= L.goal * 2 + 1).length / L.rnd.length;
const luck3 = (L: Level) => L.rnd.filter((x) => x === 2).length / L.rnd.length;

const levelCache = new Map<string, Level>();
export function buildLevel(seed: number, stage: number): Level {
  const ck = `${seed}:${stage}`, hit = levelCache.get(ck);
  if (hit) return hit;
  const d = STAGES[stage], r = mulberry32((seed * 31 + stage * 7919 + 17) >>> 0);
  let pick: Level | null = null, bv = -1e9;
  const K = stage === 1 ? 4 : stage === 0 ? 14 : 8;
  for (let tries = 0, c = 0; c < K && tries < 80; tries++) {
    const L = makeLevel(d, r);
    if (!L) continue;
    c++;
    rate(L, d, stage, r);
    let v: number;
    if (stage === 0) {
      // 첫 판: 첫 톡에 바로 폴짝(그 개구리는 갈 곳이 하나) · 아무렇게나 해도 거의 통과
      const S = newSim(L), m0 = L.plan[0], one = movesOf(L, S).filter((m) => m.a === m0.a).length === 1;
      v = (one ? 0.5 : 0) + Math.min(0.95, passOf(L)) * 3 - (L.goal >= 4 ? 0.3 : 0) - luck3(L) * 4;
    } else if (stage === 1) v = -Math.abs(passOf(L) - 0.65) + (L.habit.stars < 3 ? 0.1 : 0);
    else {
      // 버릇대로 두면 별 셋이 안 나오고(한 마리도 잘 안 남고), 아무렇게나 하면 잘 안 넘는 판
      v = (L.habit.stars < 3 ? 2 : 0) + (L.habit.left > 1 ? 0.4 : 0) - Math.abs(passOf(L) - d.passP) - luck3(L) * 4;
    }
    if (v > bv) (bv = v), (pick = L);
  }
  if (!pick) {
    // 거의 일어나지 않지만: 첫 판 모양으로 대신
    for (let k = 0; !pick && k < 200; k++) pick = makeLevel(STAGES[0], r);
    rate(pick!, STAGES[0], 0, r);
  }
  if (levelCache.size > 400) levelCache.clear();
  levelCache.set(ck, pick!);
  return pick!;
}

// ───────────────────────────── 상태 ─────────────────────────────
interface Ev { t: number; kind: string; x: number; y: number; text?: string; col?: string; v?: number; n?: number }
/** 폴짝 연출: 뛴 순서(hops) · 시작 틱 · 소금쟁이 이동 */
interface Hop { a: number; b: number; c: number; d: number; victim: 'frog' | 'tree' | 'toad' | 'squash'; tree: boolean; chain: number; bounce: boolean }
interface Anim { hops: Hop[]; t0: number; st: { from: number; to: number } | null; sinks: { i: number; hop: number }[]; prev: Sim }
/** 둑의 구경꾼 (풍덩 빠진 개구리): 헤엄쳐 가는 중이면 t0부터 SWIM_T 동안 */
interface Fan { x: number; y: number; fx: number; fy: number; t0: number; kind: 'frog' | 'tree' | 'toad'; mv: number; stage: number; slot: number; tint: number }
export interface FrogState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'play' | 'settle' | 'stuck' | 'result'; pt: number;
  L: Level; S: Sim; sel: number; selT: number;
  down: boolean; ax: number; ay: number; lastTap: number; taps: number; pending: { x: number; y: number } | null; anim: Anim | null;
  hearts: number; stars: number; got: number; pts: number; ok: boolean; why: string; won: boolean; dead: boolean; tries: number;
  seen: Set<string>; tips: Set<string>; events: Ev[]; news: { text: string; t: number } | null; newsQ: string[]; startT: number; clearT: number;
  /** 되돌리기: 남은 수 · 지난 상태들 */
  undo: number; hist: Sim[]; ptsHist: number[]; undoT: number; offer: boolean;
  fans: Fan[];
  /** 개구리별 표정 시각 (연잎 번호 → 틱): 놀람·힘줌·우쭐 */
  gasp: number[]; proudT: number; proudAt: number; proudK: number; shrug: number[]; sinkT: number[];
  /** 구경꾼 반응: 'cheer'(연속·통과) · 'laugh'(실패) · 'gasp'(두꺼비 풍덩) */
  crowd: string; crowdT: number;
  /** 큰 순간 잠깐 멈춤 · 이 판에서 풍덩 수 */
  stopUntil: number; plops: number; bestChain: number;
  retry: boolean;
  /** 새 장치 스포트라이트 시작 틱 (1판은 첫 폴짝이 끝난 뒤 — 첫 톡의 풍덩을 가리지 않게) */
  spotT: number;
}

const ev = (s: FrogState, kind: string, x: number, y: number, text?: string, col?: string, v?: number, n?: number) => s.events.push({ t: s.t, kind, x, y, text, col, v, n });
function tip(s: FrogState, key: string, text: string) {
  if (s.tips.has(key) || s.newsQ.length) return;
  s.tips.add(key);
  s.newsQ.push(text);
}
function see(s: FrogState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  s.newsQ.push(text);
}

// 화면 배치 (가로 0~1, 세로 0~A)
const BX0 = 0.07, BX1 = 0.93, BY0 = 0.3, BY1 = 1.16, RY = 0.78;
/** 되돌리기 단추 */
const UX = 0.88, UY = 1.225, UR = 0.052;
/** 연못 격자 → 화면: 칸 크기와 연잎 가운데 */
export function geo(L: Level) {
  const P = L.P, cw = Math.min(0.2, (BX1 - BX0) / P.cols, (BY1 - BY0) / (P.rows * RY)), ch = cw * RY;
  const ox = 0.5 - (P.cols * cw) / 2 + cw / 2, oy = (BY0 + BY1) / 2 - (P.rows * ch) / 2 + ch / 2;
  return { cw, ch, x: (i: number) => ox + P.pc[i] * cw, y: (i: number) => oy + P.pr[i] * ch };
}
const geoCache = new WeakMap<Level, ReturnType<typeof geo>>();
export const G = (L: Level) => {
  let g = geoCache.get(L);
  if (!g) geoCache.set(L, (g = geo(L)));
  return g;
};

function newStage(s: FrogState) {
  const d = STAGES[s.stage];
  s.L = buildLevel(s.seed, s.stage);
  s.S = newSim(s.L);
  const n = s.L.P.n;
  s.sel = -1;
  s.anim = null;
  s.pending = null;
  s.undo = UNDO;
  s.hist = [];
  s.ptsHist = [];
  s.undoT = -99;
  s.offer = false;
  s.gasp = Array(n).fill(-99);
  s.shrug = Array(n).fill(-99);
  s.sinkT = Array(n).fill(-1);
  s.proudT = -99;
  s.proudAt = -1;
  s.stopUntil = -1;
  s.plops = 0;
  s.bestChain = 0;
  s.retry = s.tips.has('try:' + s.stage);
  s.spotT = s.stage === 0 ? -1 : s.t + 88;
  s.tips.add('try:' + s.stage);
  s.phase = 'play';
  s.pt = 0;
  s.startT = s.t;
  s.got = 0;
  // 구경꾼은 판이 바뀌어도 둑에 남는다 (많으면 오래된 것부터 돌아간다)
  if (!s.seen.has(d.key)) {
    s.seen.add(d.key);
    s.newsQ.unshift(d.news);
    s.news = null;
  }
  if (s.stage === 0) see(s, 'crown', '👑 마지막 한 마리가 왕관 연잎에서 끝나면 ★★★');
  ev(s, 'stage', 0.5, 0.6, `${s.stage + 1}판 · ${d.name}`, '#fff6d6');
}

function finish(s: FrogState) {
  s.phase = 'result';
  s.pt = 0;
  const L = s.L, S = s.S, n = leftOf(S);
  s.ok = n <= L.goal;
  if (s.ok) {
    const st = starsOf(L, S);
    s.got = st;
    s.stars += st;
    s.pts += STAR_PTS[st] + (L.goal - n) * SPARE_PTS;
    s.clearT = s.t;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    ev(s, 'clear', 0.5, 0.62, `${STAGES[s.stage].emoji} 통과! ${'★'.repeat(st)}${'☆'.repeat(3 - st)}`, '#fff1a8', st);
    s.crowd = 'cheer';
    s.crowdT = s.t;
    if (n === 1) see(s, 'one', st === 3 ? '👑 왕관 연잎에서 한 마리 — 연꽃이 활짝!' : '🐸 한 마리만 남겼다 — 왕관을 써요!');
  } else {
    s.hearts--;
    s.tries++;
    s.why = `${n}마리 남았어요 (${L.goal}마리 이하면 통과)`;
    s.crowd = 'laugh';
    s.crowdT = s.t;
    ev(s, 'fail', 0.5, 0.62, s.why, '#ffd0c8');
  }
}

/** 손가락 자리의 연잎 (없으면 -1) */
function pickPad(s: FrogState, x: number, y: number) {
  const L = s.L, g = G(L);
  let best = -1, bd = 1e9;
  for (let i = 0; i < L.P.n; i++) {
    if ((s.S.sunk >> i) & 1 && !isFrog(s.S, i)) continue;
    const dx = (x - g.x(i)) / g.cw, dy = (y - g.y(i) + (isFrog(s.S, i) ? g.ch * 0.18 : 0)) / g.ch;
    const dd = dx * dx + dy * dy;
    if (dd < 0.36 && dd < bd) (bd = dd), (best = i);
  }
  return best;
}
const landOf = (L: Level, m: Mv) => L.P.land[m.a * 8 + m.d];
export const targetsOf = (L: Level, S: Sim, a: number) => movesOf(L, S).filter((m) => m.a === a);
const undoHit = (x: number, y: number) => Math.hypot(x - UX, y - UY) < UR * 1.35;

function tapAt(s: FrogState, x: number, y: number) {
  s.taps++;
  s.lastTap = s.t;
  if (undoHit(x, y)) return undoMove(s);
  const L = s.L, S = s.S, g = G(L), k = pickPad(s, x, y);
  if (k < 0) {
    if (s.sel >= 0) return void ((s.sel = -1), (s.selT = s.t));
    if (y > BY0 - 0.05 && y < BY1 + 0.05) ev(s, 'miss', x, y, '개구리를 톡!', '#effff0');
    return;
  }
  if (s.sel >= 0) {
    if (k === s.sel) return void ((s.sel = -1), (s.selT = s.t));
    const m = targetsOf(L, S, s.sel).find((q) => landOf(L, q) === k);
    if (m) return doMove(s, m);
    if (isFrog(S, k)) return pickFrog(s, k);
    ev(s, 'nope', g.x(k), g.y(k) - 0.05, k === striderAt(L, S) ? '🦟 소금쟁이 자리예요' : S.toad === k ? '두꺼비는 못 뛰어요' : '거긴 못 가요', '#ffe0d8');
    tip(s, 'rule', '바로 옆 개구리를 넘어 그 너머 빈 연잎으로만 뛰어요');
    return;
  }
  if (isFrog(S, k)) return pickFrog(s, k);
  if (S.toad === k) {
    s.shrug[k] = s.t;
    ev(s, 'nope', g.x(k), g.y(k) - 0.07, '끄응… 두꺼비는 무거워 못 뛰어요', '#ffe9c4');
    return;
  }
  ev(s, 'miss', g.x(k), g.y(k) - 0.04, k === striderAt(L, S) ? '🦟 소금쟁이!' : '개구리를 먼저 톡!', '#effff0');
}
function pickFrog(s: FrogState, k: number) {
  const L = s.L, S = s.S, g = G(L), ms = targetsOf(L, S, k);
  if (!ms.length) {
    s.shrug[k] = s.t;
    s.sel = -1;
    ev(s, 'nope', g.x(k), g.y(k) - 0.07, '갈 곳이 없어요', '#ffe0d8');
    tip(s, 'rule', '바로 옆 개구리를 넘어 그 너머 빈 연잎으로만 뛰어요');
    return;
  }
  if (ms.length === 1) return doMove(s, ms[0]);
  s.sel = k;
  s.selT = s.t;
  tip(s, 'pick', '반짝이는 연잎을 톡하면 폴짝!');
}

function undoMove(s: FrogState) {
  if (!s.hist.length || s.undo <= 0 || s.anim) {
    ev(s, 'say', UX - 0.12, UY - 0.08, s.undo <= 0 ? '되돌리기를 다 썼어요' : '되돌릴 폴짝이 없어요', '#ffe9c4');
    return;
  }
  const mv = s.S.moves;
  s.S = s.hist.pop()!;
  s.pts = s.ptsHist.pop() ?? s.pts;
  s.undo--;
  s.undoT = s.t;
  s.sel = -1;
  s.selT = s.t;
  s.offer = false;
  if (s.phase === 'stuck' || s.phase === 'settle') (s.phase = 'play'), (s.pt = 0);
  // 그 폴짝에 빠진 개구리들이 연잎으로 돌아온다
  s.fans = s.fans.filter((f) => !(f.stage === s.stage && f.mv === mv));
  for (let i = 0; i < s.L.P.n; i++) if (!((s.S.sunk >> i) & 1)) s.sinkT[i] = -1;
  ev(s, 'undo', UX, UY, '슝~ 되돌렸어요', '#e6fff0');
}

/** 구경꾼 자리 12곳: 위 둑(팻말 양옆)과 아래 둑에 번갈아 */
const FAN_X = [[0.06, 0.94, 0.17, 0.83, 0.28, 0.72], [0.08, 0.2, 0.32, 0.44, 0.56, 0.68]];
function fanSpot(k: number) {
  const top = k % 2 === 0, j = Math.floor(k / 2) % 6;
  return { x: FAN_X[top ? 0 : 1][j], y: top ? 0.262 : 1.238 + (j % 2 ? 0.008 : 0) };
}
function addFan(s: FrogState, x: number, y: number, t0: number, kind: Fan['kind'], mv: number) {
  const used = new Set(s.fans.map((f) => f.slot));
  let slot = [...Array(12).keys()].find((k) => !used.has(k));
  if (slot === undefined) slot = s.fans.shift()!.slot;
  const sp = fanSpot(slot);
  s.fans.push({ x, y, fx: sp.x, fy: sp.y, t0, kind, mv, stage: s.stage, slot, tint: (s.plops * 37 + s.stage * 11) % 5 });
}

function doMove(s: FrogState, m: Mv) {
  const L = s.L, S = s.S, g = G(L), rec: RE[] = [];
  const prev = cloneSim(S);
  s.hist.push(prev);
  s.ptsHist.push(s.pts);
  jump(L, S, m.a, m.d, rec);
  const t0 = s.t, hops: Hop[] = [], sinks: { i: number; hop: number }[] = [];
  let st: Anim['st'] = null;
  for (const e of rec) {
    if (e.k === 'hop') hops.push({ a: e.a, b: e.b, c: e.c, d: e.d, victim: e.victim, tree: e.tree, chain: e.chain, bounce: e.bounce });
    else if (e.k === 'sink') sinks.push({ i: e.i, hop: e.hop });
    else if (e.k === 'strider') st = { from: e.from, to: e.to };
  }
  s.anim = { hops, t0, st, sinks, prev };
  s.sel = -1;
  hops.forEach((h, j) => {
    const th = t0 + j * HOP_T, mx = g.x(h.b), my = g.y(h.b);
    s.gasp[h.b] = th;
    if (h.victim === 'squash') {
      ev(s, 'squash', mx, my - 0.05, '꾸엑!', '#ffe2b0', th + 12, 1);
      see(s, 'squash', '💪 납작! 한 번 더 넘으면 두꺼비도 풍덩');
    } else {
      s.plops++;
      const n = Math.min(6, h.chain);
      s.pts += PLOP_PTS * h.chain;
      ev(s, 'plop', mx + (h.b % 2 ? 1 : -1) * 0.04, my + 0.01, h.victim === 'toad' ? '쿠웅 풍덩!!' : '풍덩!', h.victim === 'toad' ? '#ffe2b0' : '#e0f6ff', th + PLOP_T, Math.min(8, s.plops));
      if (h.chain >= 2) ev(s, 'chain', g.x(h.c), g.y(h.c) - 0.1, `연속 ${h.chain}!`, '#fff1a8', th + 20, n);
      ev(s, 'num', mx, my - 0.06, `+${PLOP_PTS * h.chain}`, '#ffe066', th + PLOP_T + 3, n);
      addFan(s, mx + (h.b % 2 ? 1 : -1) * 0.04, my + 0.01, th + PLOP_T + 2, h.victim === 'toad' ? 'toad' : h.victim === 'tree' ? 'tree' : 'frog', S.moves);
      see(s, 'plop', '💦 풍덩! 넘긴 개구리는 헤엄쳐 둑으로 — 구경꾼이 돼요');
      if (h.victim === 'toad') see(s, 'toadOut', '💪 두꺼비까지 풍덩! 구경꾼 중 제일 커요');
    }
    if (h.chain >= 2) {
      see(s, 'chainSeen', '🔁 연속 점프! 같은 개구리가 이어 뛸수록 점수가 커져요');
      s.bestChain = Math.max(s.bestChain, h.chain);
    }
    if (h.chain >= 3 || h.bounce) s.stopUntil = Math.max(s.stopUntil, th + HOP_T - 2);
    if (h.d >= 4) see(s, 'diag', '🌿 청개구리 대각선 폴짝!');
    if (h.bounce) {
      ev(s, 'bounce', g.x(h.a), g.y(h.a) - 0.05, '통~!', '#ffd6ec', th, 1);
      see(s, 'bounce', '🌸 통! 연꽃에 앉으면 같은 쪽으로 한 번 더');
    }
  });
  for (const k of sinks) {
    const th = t0 + k.hop * HOP_T + 16;
    s.sinkT[k.i] = th;
    ev(s, 'sink', g.x(k.i), g.y(k.i), '꼬르륵…', '#e8d6a8', th + 6);
    see(s, 'sink', '🍂 시든 연잎이 꼬르륵 가라앉았어요');
  }
  const endT = t0 + hops.length * HOP_T;
  if (st) see(s, 'striderMove', '🦟 소금쟁이가 쓱 — 한 번 뛸 때마다 한 칸');
  const last = hops[hops.length - 1];
  s.proudAt = last.c;
  s.proudT = endT;
  s.proudK = hops.length > 1 || last.chain >= 2 ? Math.max(2, last.chain) : 1;
  if (last.chain >= 2 || hops.length > 1) (s.crowd = 'cheer'), (s.crowdT = endT - HOP_T / 2);
  if (hops.some((x) => x.victim === 'toad')) (s.crowd = 'wow'), (s.crowdT = t0 + 14);
  // 방금 뛴 개구리가 또 뛸 수 있으면 그대로 들고 있는다 (연잎만 톡하면 연속 점프)
  if (anyMove(L, S)) {
    if (targetsOf(L, S, last.c).length) (s.sel = last.c), (s.selT = endT);
    if (leftOf(S) <= 3 && leftOf(S) > 1) tip(s, 'endgame', '👑 마지막 한 마리가 왕관 연잎에 앉게 거꾸로 생각해 봐요');
    return;
  }
  // 더 뛸 수 없다: 끝 (별 셋이 아니고 되돌리기가 남았으면 한 번 물릴 기회)
  s.phase = 'settle';
  s.pt = 0;
  s.offer = starsOf(L, S) < 3 && s.undo > 0;
  ev(s, 'end', 0.5, 0.62, leftOf(S) === 1 ? '한 마리!' : '더 뛸 수 없어요', '#fff6d6', endT + 6);
}

function animate(s: FrogState) {
  const a = s.anim;
  if (a && s.t < s.stopUntil && (s.t - a.t0) % HOP_T > HOP_T - 4) a.t0++; // 연속·통통 순간 착지 직전에 잠깐 멈춤
  if (a && s.t - a.t0 >= a.hops.length * HOP_T + (a.st ? 14 : 6)) s.anim = null;
}

export const frogjump: GameDef<FrogState> = {
  id: 'frogjump',
  name: '연잎 개구리 뛰어넘기',
  genes: ['pegjump', 'pointer', 'turnbased'],
  twist: '뛰어넘긴 개구리는 풍덩 빠져 헤엄쳐 둑으로 나가 구경꾼이 되고, 한 마리로 쭉 이어 뛰는 연속 점프마다 둑의 구경꾼이 들썩인다 — 마지막 한 마리가 👑 연잎에 앉으면 연꽃이 활짝',
  rules: ['개구리를 톡, 빈 연잎을 톡 → 옆 개구리를 뛰어넘고, 넘긴 개구리는 풍덩.', '더 뛸 수 없으면 끝 — 남은 개구리가 적을수록 별 (👑 연잎에서 한 마리면 ★★★).'],
  controls: 'touch',
  hint: '개구리를 톡 → 반짝이는 연잎을 톡하면 폴짝! / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '여름 연못 개구리 디오라마',
    mood: '해 질 녘 초록 연못, 물결에 흔들리는 연잎 위의 통통한 개구리들 — 연잎 그림자와 물 반짝임, 갈대와 부들이 선 둑에는 풍덩 빠졌던 개구리들이 수건을 두르고 앉아 구경하고, 잠자리가 날아다닌다.',
    palette: { bg: '#123a3a', ink: '#f4fff2', muted: '#a8d4c4', accent: '#ffd166', hot: '#ff6b6b', soft: '#e3f7e8' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'play', pt: 0, sel: -1, selT: 0,
      down: false, ax: 0, ay: 0, lastTap: -99, taps: 0, pending: null, anim: null,
      hearts: 3, stars: 0, got: 0, pts: 0, ok: false, why: '', won: false, dead: false, tries: 0,
      seen: new Set<string>(), tips: new Set<string>(), events: [], news: null, newsQ: [], startT: 0, clearT: 0,
      undo: UNDO, hist: [], ptsHist: [], undoT: -99, offer: false, fans: [], gasp: [], proudT: -99, proudAt: -1, proudK: 1, shrug: [], sinkT: [], crowd: 'idle', crowdT: -99,
      stopUntil: -1, plops: 0, bestChain: 0, retry: false, spotT: -1,
    } as unknown as FrogState;
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
    if (s.events.length > 60 || (s.events.length && s.t - s.events[0].t > 240)) s.events = s.events.filter((e) => s.t - e.t < 240);
    animate(s);
    if (s.spotT < 0 && s.S.moves >= 1 && !s.anim) s.spotT = s.t + 20;
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
      if (!s.anim && s.pt >= 30) {
        if (s.offer) (s.phase = 'stuck'), (s.pt = 0);
        else finish(s);
      }
      return;
    }
    if (s.phase === 'stuck') {
      // 더 뛸 수 없을 때: 🔙 되돌리기를 톡하면 한 수 물리고, 다른 곳을 톡하거나 기다리면 끝
      if (press) {
        if (undoHit(s.ax, s.ay * A)) undoMove(s);
        else finish(s);
      } else if (s.pt >= STUCK_T) finish(s);
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
const NO: Input = { tap: false, dir: 0, pointer: null };
/** 연잎 i를 누르는 입력 */
function at(s: FrogState, i: number): Input {
  const g = G(s.L);
  return { tap: false, dir: 0, pointer: { x: g.x(i), y: (g.y(i) - (isFrog(s.S, i) ? g.ch * 0.1 : 0)) / A } };
}
/** 할 수 m을 누르는 다음 톡: 그 개구리를 안 들었으면 개구리, 들었으면 갈 연잎 */
function tapFor(s: FrogState, m: Mv | null): Input {
  if (!m) return NO;
  if (s.sel !== m.a) return at(s, m.a);
  return at(s, landOf(s.L, m));
}
const ready = (s: FrogState, gap: number) => !s.anim && !s.down && !s.pending && s.t - s.lastTap >= gap && s.t - s.startT >= 30;
/** 끝내기(더 뛸 수 없을 때): 되돌리기 아닌 곳을 톡 */
const endTap: Input = { tap: false, dir: 0, pointer: { x: 0.5, y: 0.7 / A } };
const plans = new WeakMap<object, { key: string; mv: Mv | null }>();
/** 봇: 끝까지 내다보고(깊이 우선 탐색 + 메모) 👑에서 한 마리로 끝나는 길을 고른다. 같은 결과면 방금 뛴 개구리로 이어 뛴다 */
export const frogjumpSmart: Bot<FrogState> = {
  name: '개구리 장인',
  act(s) {
    if (s.phase === 'stuck') return ready(s, 20) ? endTap : NO;
    if (s.phase !== 'play' || !ready(s, 16)) return NO;
    const key = `${s.stage}:${s.tries}:${s.S.moves}:${keyOf(s.S)}`;
    let p = plans.get(s);
    if (!p || p.key !== key) plans.set(s, (p = { key, mv: smartPick(s.L, s.S) }));
    return tapFor(s, p.mv);
  },
};
/** 버릇 봇(측정용): '뛸 수 있는 첫 개구리' — 위 줄 왼쪽부터 처음 뛸 수 있는 개구리를 처음 되는 쪽으로 */
export const frogjumpHabit: Bot<FrogState> = {
  name: '버릇: 뛸 수 있는 첫 개구리',
  act(s) {
    if (s.phase === 'stuck') return ready(s, 20) ? endTap : NO;
    if (s.phase !== 'play' || !ready(s, 16)) return NO;
    return tapFor(s, habitPick(s.L, s.S));
  },
};
const dumbAt = new WeakMap<object, { next: number; until: number; p: { x: number; y: number } }>();
/** 봇: 아무 때나 아무 연잎이나 톡 (가끔 화면 아무 데나) */
export const frogjumpRandom: Bot<FrogState> = {
  name: '아무 연잎이나 톡',
  act(s, rng) {
    let m = dumbAt.get(s);
    if (!m) dumbAt.set(s, (m = { next: 20 + Math.floor(rng() * 50), until: -1, p: { x: 0, y: 0 } }));
    if (s.t < m.until) return { tap: false, dir: 0, pointer: m.p };
    if (s.t < m.next) return NO;
    m.next = s.t + 24 + Math.floor(rng() * 70);
    m.until = s.t + 2 + Math.floor(rng() * 4);
    const L = s.L, list: number[] = [];
    for (let i = 0; i < L.P.n; i++) if (!((s.S.sunk >> i) & 1)) list.push(i);
    if (rng() < 0.12 || !list.length) m.p = { x: rng(), y: rng() };
    else {
      const q = at(s, list[Math.floor(rng() * list.length)]).pointer!;
      m.p = { x: q.x + (rng() - 0.5) * 0.03, y: q.y + (rng() - 0.5) * 0.03 };
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
type F = (v: number) => number;

/** 판마다 하루가 흐른다: 아침 → 한낮 → 해 질 녘 → 보름달 밤 */
interface Tod { sky0: string; sky1: string; far: string; grass0: string; grass1: string; mud: string; water0: string; water1: string; glint: string; night: number; sun: string }
const TODS: Tod[] = [
  { sky0: '#a9e6d6', sky1: '#e6f8d2', far: '#5aa874', grass0: '#86d466', grass1: '#4e9c43', mud: '#77573a', water0: '#43aea2', water1: '#1e6c76', glint: '#e8fff8', night: 0, sun: '#fff6c2' },
  { sky0: '#8fd8ee', sky1: '#ddf4ff', far: '#4c9a6a', grass0: '#8ed85c', grass1: '#48973b', mud: '#7a5636', water0: '#39aaa9', water1: '#1a6480', glint: '#f2ffff', night: 0, sun: '#ffffff' },
  { sky0: '#ffa877', sky1: '#ffdca6', far: '#7d6646', grass0: '#a2c152', grass1: '#5f8a3a', mud: '#6e4a30', water0: '#3f8f95', water1: '#22526b', glint: '#ffe2b4', night: 0.3, sun: '#ffd27a' },
  { sky0: '#18264c', sky1: '#30407a', far: '#1b3636', grass0: '#3f7a4a', grass1: '#23503a', mud: '#3a2c26', water0: '#21506a', water1: '#0e2a40', glint: '#d2e8ff', night: 1, sun: '#fff8d8' },
];
const todOf = (stage: number) => TODS[stage <= 1 ? 0 : stage <= 4 ? 1 : stage <= 6 ? 2 : 3];

/** 연출 중인 판의 모습: 폴짝 도중이면 지난 상태에서 뛴 만큼만 반영 (날고 있는 개구리는 따로) */
interface Disp { D: Sim; fly: { h: Hop; q: number } | null; st: number; stFrom: number; stQ: number }
function hit(D: Sim, h: Hop) {
  if (h.victim === 'squash') D.thp = 1;
  else if (h.victim === 'toad') D.toad = -1;
  else {
    D.fr &= ~(1 << h.b);
    if (D.tree === h.b) D.tree = -1;
  }
}
function display(s: FrogState): Disp {
  const a = s.anim, L = s.L;
  if (!a) return { D: s.S, fly: null, st: striderAt(L, s.S), stFrom: -1, stQ: 1 };
  const u = s.t - a.t0, total = a.hops.length * HOP_T, D = cloneSim(a.prev);
  let fly: Disp['fly'] = null;
  for (let k = 0; k < a.hops.length; k++) {
    const h = a.hops[k], q = (u - k * HOP_T) / HOP_T;
    if (q < 0) break;
    if (q < 1) {
      D.fr &= ~(1 << h.a);
      if (D.tree === h.a) D.tree = -1;
      if (q >= 0.5) hit(D, h);
      fly = { h, q };
      break;
    }
    D.fr = (D.fr & ~(1 << h.a)) | (1 << h.c);
    if (h.tree) D.tree = h.c;
    hit(D, h);
  }
  const stQ = a.st ? cl01((u - total) / 12) : 1;
  return { D, fly, st: a.st ? (stQ >= 1 ? a.st.to : a.st.from) : striderAt(L, s.S), stFrom: a.st ? a.st.from : -1, stQ };
}

const recentSay = new WeakMap<object, { x: number; y: number; t: number }[]>();
function drawAll(ctx: CanvasRenderingContext2D, s: FrogState, w: number, h: number, th: Theme) {
  const fx = juice(s), t = s.t, L = s.L, S = s.S, d = STAGES[s.stage], g = G(L), tod = todOf(s.stage);
  const X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w;
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  const dp = display(s), D = dp.D;
  ctx.save();
  fx.begin(ctx);
  // 연속 점프·통통 착지 순간 화면이 그쪽으로 살짝 당겨진다
  if (dp.fly && (dp.fly.h.chain >= 3 || dp.fly.h.bounce) && dp.fly.q > 0.55) {
    const k = 1 + 0.03 * Math.min(4, dp.fly.h.chain) * Math.sin(cl01((dp.fly.q - 0.55) / 0.45) * Math.PI);
    const cx = X(g.x(dp.fly.h.c)), cy = Y(g.y(dp.fly.h.c));
    ctx.translate(cx, cy);
    ctx.scale(k, k);
    ctx.translate(-cx, -cy);
  }
  drawScene(ctx, s, w, h, X, Y, R, t, tod);
  drawFans(ctx, s, X, Y, R, t, true);
  // ═════════ 연잎 ═════════
  const play = s.phase === 'play' && !s.anim;
  const sel = play ? s.sel : -1, tg = sel >= 0 ? targetsOf(L, S, sel) : [];
  const tgPad = new Set(tg.map((m) => landOf(L, m))), worry = new Set(tg.map((m) => L.P.mid[m.a * 8 + m.d]));
  const rx = R(g.cw * 0.45), ry = R(g.ch * 0.49);
  for (let i = 0; i < L.P.n; i++) {
    const sk = s.sinkT[i], sunk = (S.sunk >> i) & 1;
    const sinkQ = sunk ? (sk >= 0 ? (t < sk ? 0 : cl01((t - sk) / 30)) : 1) : 0;
    const x = X(g.x(i)), y = Y(g.y(i)) + Math.sin(t * 0.04 + i * 1.7) * 0.8;
    if (sinkQ >= 1) {
      // 가라앉은 자리: 물결만
      ctx.strokeStyle = `rgba(255,255,255,${0.12 + 0.06 * Math.sin(t * 0.06 + i)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(x, y, rx * (0.5 + 0.1 * Math.sin(t * 0.05 + i)), ry * 0.45, 0, 0, TAU);
      ctx.stroke();
      continue;
    }
    const kind = (L.wither >> i) & 1 ? 1 : (L.spring >> i) & 1 ? 2 : 0;
    drawPad(ctx, x, y + sinkQ * ry * 0.6, rx, ry, { kind, crown: i === L.crown, notch: hsh(i * 3 + 1) * TAU, t, key: i, sink: sinkQ, target: tgPad.has(i), night: tod.night });
  }
  // 소금쟁이 길
  if (L.route.length) drawRoute(ctx, s, dp, X, Y, R, t);
  // ═════════ 헤엄치는 구경꾼 (물 위) ═════════
  drawSwimmers(ctx, s, X, Y, R, t);
  // ═════════ 개구리·두꺼비 (뒤 줄부터) ═════════
  const u = R(g.cw * 0.72);
  const order = [...Array(L.P.n).keys()].filter((i) => isFrog(D, i) || D.toad === i).sort((p, q) => g.y(p) - g.y(q));
  const fl = dp.fly, flyX = fl ? g.x(fl.h.a) + (g.x(fl.h.c) - g.x(fl.h.a)) * fl.q : 0, flyY = fl ? g.y(fl.h.a) + (g.y(fl.h.c) - g.y(fl.h.a)) * fl.q : 0;
  const lookAt = fl ? { x: flyX, y: flyY } : sel >= 0 ? { x: g.x(sel), y: g.y(sel) } : null;
  const one = leftOf(S) === 1 && (s.phase === 'result' || s.phase === 'settle') && !s.anim;
  const drawOne = (i: number) => {
    const isToad = D.toad === i, kind = isToad ? 2 : i === D.tree ? 1 : 0;
    let face = 'idle';
    if (i === sel) face = 'ready';
    else if (worry.has(i)) face = 'worry';
    if (t - s.gasp[i] >= 0 && t - s.gasp[i] < 12) face = 'gasp';
    if (i === s.proudAt && t - s.proudT >= 0 && t - s.proudT < (i === sel ? 22 : 60)) face = s.proudK >= 2 ? 'proud' : 'happy';
    if (t - s.shrug[i] < 40) face = 'shrug';
    if (s.phase === 'result' && !s.ok) face = 'sad';
    if (one) face = 'proud';
    if (isToad && D.thp === 1 && face === 'idle') face = 'dizzy';
    const lx = lookAt ? cl01((lookAt.x - g.x(i)) * 6 + 0.5) * 2 - 1 : Math.sin(t * 0.013 + i) * 0.5, ly = lookAt ? cl01((lookAt.y - g.y(i)) * 6 + 0.5) * 2 - 1 : 0;
    const lift = i === sel ? R(0.008) * (1 + Math.sin(t * 0.25)) : 0;
    const bob = Math.sin(t * 0.04 + i * 1.7) * 0.8;
    const ph = (t + i * 53) % 320, puff = face === 'idle' && !isToad && ph < 44 ? Math.sin((ph / 44) * Math.PI) : 0;
    const crownQ = one && !isToad ? ease((s.pt - 6) / 16) : 0;
    if (i === sel) {
      const gx = X(g.x(i)), gy = Y(g.y(i)) + bob;
      const sg = ctx.createRadialGradient(gx, gy, 2, gx, gy, u * 0.9);
      sg.addColorStop(0, 'rgba(255,236,140,.75)');
      sg.addColorStop(1, 'rgba(255,236,140,0)');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.ellipse(gx, gy, u * 0.9, u * 0.45, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = `rgba(255,220,90,${0.8 + 0.2 * Math.sin(t * 0.3)})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(gx, gy, u * 0.62, u * 0.24, 0, 0, TAU);
      ctx.stroke();
    }
    drawFrog(ctx, X(g.x(i)), Y(g.y(i)) + bob - lift, isToad ? u * 1.22 : u, { kind, face, t, lx, ly, hp: isToad ? D.thp : 0, crown: crownQ, key: i, rot: 0, puff });
    if (puff > 0.6 && ph > 18 && ph < 26) {
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      font(0.03, 800);
      ctx.textAlign = 'center';
      ctx.fillText('개굴', X(g.x(i)) + u * 0.62, Y(g.y(i)) - u * 0.9);
    }
    if (isToad) drawHp(ctx, X(g.x(i)), Y(g.y(i)) - u * 1.22 * 1.05, R, D.thp, t);
    if (i === D.tree && !isToad) drawTreeBadge(ctx, X(g.x(i)), Y(g.y(i)), u, t, i === sel);
  };
  for (const i of order) drawOne(i);
  // 소금쟁이 (연잎 위에 버티고 서 있다)
  if (L.route.length) {
    const from = dp.stFrom >= 0 && dp.stQ < 1 ? dp.stFrom : dp.st, to = dp.st;
    const q = dp.stFrom >= 0 && dp.stQ < 1 ? ease(dp.stQ) : 1, tx = dp.stFrom >= 0 && dp.stQ < 1 && s.anim?.st ? s.anim.st.to : to;
    const sx = g.x(from) + (g.x(tx) - g.x(from)) * q, sy = g.y(from) + (g.y(tx) - g.y(from)) * q;
    drawStrider(ctx, X(sx), Y(sy), R(g.cw), t, q < 1);
  }
  // ═════════ 날아가는 개구리 (맨 앞) ═════════
  if (fl) {
    const hh = R(g.cw * (0.5 + 0.12 * Math.min(3, fl.h.chain))) * Math.sin(fl.q * Math.PI), sx = X(flyX), sy = Y(flyY);
    ctx.fillStyle = `rgba(0,30,30,${0.3 - 0.15 * Math.sin(fl.q * Math.PI)})`;
    ctx.beginPath();
    ctx.ellipse(sx, sy + 2, u * 0.45 * (1 - 0.3 * Math.sin(fl.q * Math.PI)), u * 0.14, 0, 0, TAU);
    ctx.fill();
    const dir = Math.sign(g.x(fl.h.c) - g.x(fl.h.a));
    drawFrog(ctx, sx, sy - hh, u, { kind: fl.h.tree ? 1 : 0, face: 'fly', t, lx: dir, ly: Math.sign(g.y(fl.h.c) - g.y(fl.h.a)), hp: 0, crown: 0, key: fl.h.a, rot: dir * 0.25 * (fl.q - 0.5) * 2, puff: 0 });
    // 연속 점프 꼬리별
    if (fl.h.chain >= 2) for (let k = 1; k <= 4; k++) {
      const qq = Math.max(0, fl.q - k * 0.06), px = g.x(fl.h.a) + (g.x(fl.h.c) - g.x(fl.h.a)) * qq, py = g.y(fl.h.a) + (g.y(fl.h.c) - g.y(fl.h.a)) * qq;
      ctx.fillStyle = `rgba(255,236,140,${0.5 - k * 0.1})`;
      ctx.beginPath();
      ctx.arc(X(px), Y(py) - R(g.cw * (0.5 + 0.12 * Math.min(3, fl.h.chain))) * Math.sin(qq * Math.PI) - u * 0.3, u * (0.12 - k * 0.02), 0, TAU);
      ctx.fill();
    }
  }
  // 넘겨진 개구리: '헉!' 하고 연잎에서 미끄러져 데굴 물속으로 → 풍덩 물기둥
  if (fl && fl.h.victim !== 'squash' && fl.q >= 0.5) {
    const q = (fl.q - 0.5) / 0.5, side = fl.h.b % 2 ? 1 : -1, big = fl.h.victim === 'toad' ? 1.22 : 1;
    const bx = X(g.x(fl.h.b)), by = Y(g.y(fl.h.b)), x = bx + side * R(g.cw * 0.4) * ease(q), wl = by + R(g.ch * 0.36);
    const y = by - u * 0.45 * Math.sin(Math.min(1, q * 1.6) * Math.PI) + u * 1.1 * q * q;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - u * 2, y - u * 3, u * 4, wl - (y - u * 3));
    ctx.clip();
    drawFrog(ctx, x, y, u * big, { kind: fl.h.victim === 'toad' ? 2 : fl.h.victim === 'tree' ? 1 : 0, face: 'gasp', t, lx: 0, ly: -1, hp: 1, crown: 0, key: fl.h.b, rot: side * q * 2.4, puff: 0 });
    ctx.restore();
  }
  if (s.anim)
    s.anim.hops.forEach((hp, k) => {
      if (hp.victim === 'squash') return;
      const q = (t - (s.anim!.t0 + k * HOP_T + PLOP_T)) / 18;
      if (q < 0 || q > 1) return;
      const side = hp.b % 2 ? 1 : -1;
      drawSplash(ctx, X(g.x(hp.b) + side * g.cw * 0.4), Y(g.y(hp.b) + g.ch * 0.36), u * (hp.victim === 'toad' ? 1.6 : 1) * (1 + 0.08 * Math.min(6, hp.chain)), q);
    });
  // 고른 개구리 → 갈 연잎: 점선 포물선
  if (sel >= 0) for (const m of tg) drawArc(ctx, X(g.x(m.a)), Y(g.y(m.a)) - u * 0.4, X(g.x(landOf(L, m))), Y(g.y(landOf(L, m))), R(g.cw * 0.45), t);
  // 한 마리 남기면 연꽃이 활짝
  if (one && s.phase === 'result') drawBloom(ctx, s, X, Y, R, g, t);
  drawFans(ctx, s, X, Y, R, t, false);
  drawUndo(ctx, s, X, Y, R, t, font);
  // 가장자리 어둡게 (밤엔 더)
  const vg = ctx.createRadialGradient(w / 2, h * 0.48, R(0.45), w / 2, h * 0.48, R(1.05));
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, `rgba(4,20,24,${0.3 + 0.25 * tod.night})`);
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
  // ═════════ 사건 연출 ═════════
  const say = (x: number, y: number, text: string, col: string, size: number) => {
    let rec = recentSay.get(s);
    if (!rec) recentSay.set(s, (rec = []));
    y = Math.max(Y(0.31), Math.min(Y(1.2), y));
    for (let k = 0; k < 6 && rec.some((q) => t - q.t < 45 && Math.abs(q.x - x) < w * 0.3 && Math.abs(q.y - y) < size + 5); k++) y -= size + 6;
    if (y < Y(0.3)) y += (size + 6) * 3;
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
    if (e.kind === 'plop') {
      // 풍덩이 늘수록(이 판에서 n번째) 물보라·흔들림이 커진다
      const big = e.text!.startsWith('쿠웅') ? 2.2 : 1, k = Math.min(8, n);
      fx.burst(x, y, '#e8fbff', Math.round((14 + 3 * k) * big), (2.6 + 0.25 * k) * big, 2.2 + 0.15 * k);
      fx.burst(x, y, tod.water0, Math.round((8 + 2 * k) * big), 2.2 * big, 2.4);
      fx.ring(x, y, '#ffffff', R(0.06 + 0.008 * k) * big, 3 + k * 0.3);
      fx.ring(x, y, tod.glint, R(0.1 + 0.01 * k) * big, 2);
      fx.kick((2 + 0.5 * k) * big);
      say(x, y - R(0.05), e.text!, e.col!, Math.round((16 + Math.min(6, k)) * (big > 1 ? 1.3 : 1)));
    }
    if (e.kind === 'squash') fx.burst(x, y, '#ffe066', 16, 3, 2.2), fx.ring(x, y, '#ffe2b0', R(0.08), 4), fx.kick(4), say(x, y - R(0.03), e.text!, e.col!, 20);
    if (e.kind === 'chain') {
      const c = Math.min(6, n);
      fx.burst(x, y, '#fff1a8', 14 + 6 * c, 3 + c * 0.5, 2.6), fx.ring(x, y, '#fff1a8', R(0.1 + 0.03 * c), 3 + c);
      if (c >= 3) fx.blink('#fff6c8', 0.1 + 0.04 * c), fx.burst(x, y, '#ff9ad5', 10 + 4 * c, 4.5, 2.4);
      fx.kick(2 + c);
      say(x, y - R(0.04), c >= 4 ? `🔥 ${e.text}` : e.text!, c >= 3 ? '#ffe28a' : e.col!, 20 + 3 * c);
    }
    if (e.kind === 'num') fx.pop(Math.min(X(0.94), x + R(0.08)), Math.max(Y(0.32), y + R(0.03)), e.text!, n >= 3 ? '#ffb3e6' : e.col!, 15 + 2 * Math.min(5, n));
    if (e.kind === 'sink') fx.burst(x, y, '#c8a86a', 14, 2.2, 2.2), fx.burst(x, y, '#e8fbff', 10, 1.6, 1.6), fx.ring(x, y, '#e8d6a8', R(0.07), 3), say(x, y - R(0.03), e.text!, e.col!, 15);
    if (e.kind === 'bounce') fx.ring(x, y, '#ffb8de', R(0.09), 5), fx.burst(x, y, '#ff9ad5', 16, 3.4, 2.4), fx.kick(3), say(x, y - R(0.06), e.text!, e.col!, 20);
    if (e.kind === 'nope') say(x, y, e.text!, e.col!, 14), fx.kick(1.2);
    if (e.kind === 'miss' || e.kind === 'say') say(x, y, e.text!, e.col!, 14);
    if (e.kind === 'undo') fx.ring(x, y, '#e6fff0', R(0.09), 4), fx.burst(x, y, '#c8ffd8', 14, 3, 2), say(x - R(0.1), y - R(0.09), e.text!, e.col!, 15);
    if (e.kind === 'end') say(x, y, e.text!, e.col!, 20);
    if (e.kind === 'stage') fx.blink('#fff6d6', 0.18);
    if (e.kind === 'clear') {
      fx.burst(X(0.5), Y(0.62), '#ffe066', 40, 6, 3), fx.burst(X(0.5), Y(0.62), '#ff9ad5', 26, 5, 3), fx.ring(X(0.5), Y(0.62), '#ffe066', R(0.35), 6), fx.blink('#fff6c8', 0.28), fx.kick(6);
      if (leftOf(S) === 1) for (let i = 0; i < L.P.n; i++) if (isFrog(S, i)) fx.burst(X(g.x(i)), Y(g.y(i)) - u, '#ffd166', 30, 5, 3), fx.ring(X(g.x(i)), Y(g.y(i)), '#ffd6ec', R(0.2), 5);
    }
    if (e.kind === 'fail') fx.kick(8), fx.blink(th.hot, 0.2);
  }
  fx.memo.t = t;
  ctx.restore();
  drawHud(ctx, s, d, w, X, Y, R, font, th);
}

// ───────── 배경: 하늘·둑·물 ─────────
function drawScene(ctx: CanvasRenderingContext2D, s: FrogState, w: number, h: number, X: F, Y: F, R: F, t: number, tod: Tod) {
  const top = Y(0.066);
  // 하늘
  let gr = ctx.createLinearGradient(0, top, 0, Y(0.16));
  gr.addColorStop(0, tod.sky0);
  gr.addColorStop(1, tod.sky1);
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, w, Y(0.17));
  if (tod.night >= 1) {
    for (let k = 0; k < 18; k++) {
      ctx.fillStyle = `rgba(255,255,240,${0.3 + 0.5 * Math.abs(Math.sin(t * 0.03 + k * 2.3))})`;
      ctx.fillRect(X(hsh(k * 5) ), top + Y(0.08) * hsh(k * 7 + 1), 1.6, 1.6);
    }
    const mg = ctx.createRadialGradient(X(0.78), Y(0.105), 2, X(0.78), Y(0.105), R(0.09));
    mg.addColorStop(0, 'rgba(255,250,220,.55)');
    mg.addColorStop(1, 'rgba(255,250,220,0)');
    ctx.fillStyle = mg;
    ctx.fillRect(X(0.6), top, X(0.36), Y(0.1));
    ctx.fillStyle = tod.sun;
    ctx.beginPath();
    ctx.arc(X(0.78), Y(0.105), R(0.03), 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(200,190,150,.35)';
    ctx.beginPath();
    ctx.arc(X(0.771), Y(0.099), R(0.007), 0, TAU);
    ctx.arc(X(0.79), Y(0.113), R(0.005), 0, TAU);
    ctx.fill();
  } else {
    const sx = tod.night > 0 ? 0.24 : 0.2, sy = tod.night > 0 ? 0.13 : 0.1;
    const sg = ctx.createRadialGradient(X(sx), Y(sy), 2, X(sx), Y(sy), R(0.12));
    sg.addColorStop(0, tod.sun + 'ee');
    sg.addColorStop(1, tod.sun + '00');
    ctx.fillStyle = sg;
    ctx.fillRect(0, top, X(0.5), Y(0.1));
    ctx.fillStyle = tod.sun;
    ctx.beginPath();
    ctx.arc(X(sx), Y(sy), R(0.028), 0, TAU);
    ctx.fill();
  }
  // 먼 숲 (언덕 실루엣 두 겹)
  for (let layer = 0; layer < 2; layer++) {
    ctx.fillStyle = layer ? shade(tod.far, -0.15) : shade(tod.far, 0.12);
    ctx.beginPath();
    ctx.moveTo(0, Y(0.17));
    for (let k = 0; k <= 24; k++) {
      const x = k / 24, yy = 0.135 + layer * 0.012 - 0.02 * Math.abs(Math.sin(x * 9 + layer * 2)) - 0.012 * hsh(k + layer * 30);
      ctx.lineTo(X(x), Y(yy));
    }
    ctx.lineTo(w, Y(0.17));
    ctx.fill();
  }
  // 위 둑 (잔디 윗면 + 물가 앞면 두께)
  const edge = (x: number) => 0.282 + 0.012 * Math.sin(x * 7.3) + 0.006 * Math.sin(x * 19 + 1);
  gr = ctx.createLinearGradient(0, Y(0.15), 0, Y(0.29));
  gr.addColorStop(0, tod.grass1);
  gr.addColorStop(1, tod.grass0);
  ctx.fillStyle = gr;
  ctx.beginPath();
  ctx.moveTo(0, Y(0.155));
  ctx.lineTo(w, Y(0.155));
  for (let k = 24; k >= 0; k--) ctx.lineTo(X(k / 24), Y(edge(k / 24)));
  ctx.fill();
  // 물
  const wy0 = 0.27, wy1 = 1.2;
  gr = ctx.createLinearGradient(0, Y(wy0), 0, Y(wy1));
  gr.addColorStop(0, shade(tod.water0, 0.12));
  gr.addColorStop(0.35, tod.water0);
  gr.addColorStop(1, tod.water1);
  ctx.fillStyle = gr;
  ctx.fillRect(0, Y(wy0), w, Y(wy1 - wy0) + 2);
  // 하늘 비침 (먼 물가)
  const rg = ctx.createLinearGradient(0, Y(0.28), 0, Y(0.42));
  rg.addColorStop(0, tod.sky1 + '55');
  rg.addColorStop(1, tod.sky1 + '00');
  ctx.fillStyle = rg;
  ctx.fillRect(0, Y(0.28), w, Y(0.14));
  // 해·달 비친 길
  {
    const sx = tod.night >= 1 ? 0.78 : tod.night > 0 ? 0.24 : 0.2;
    for (let k = 0; k < 14; k++) {
      const yy = 0.3 + k * 0.06, wob = Math.sin(t * 0.05 + k * 1.3) * 0.02;
      ctx.fillStyle = `rgba(255,250,220,${(0.2 - k * 0.012) * (tod.night >= 1 ? 1.4 : 1)})`;
      ctx.fillRect(X(sx - 0.04 + wob), Y(yy), R(0.08 - k * 0.003), 1.5);
    }
  }
  // 잔물결
  ctx.strokeStyle = tod.glint;
  ctx.lineWidth = 1;
  for (let k = 0; k < 26; k++) {
    const yy = 0.3 + hsh(k * 3 + 2) * 0.88, xx = ((hsh(k * 11) + t * 0.0004 * (1 + (k % 3))) % 1.2) - 0.1, ln = 0.03 + 0.03 * hsh(k * 5);
    ctx.globalAlpha = 0.12 + 0.1 * Math.sin(t * 0.04 + k);
    ctx.beginPath();
    ctx.moveTo(X(xx), Y(yy));
    ctx.quadraticCurveTo(X(xx + ln / 2), Y(yy) - 2, X(xx + ln), Y(yy));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // 물고기 그림자가 가끔 지나간다
  {
    const ph = (t % 900) / 900, fx0 = -0.1 + ph * 1.3, fy = 0.75 + 0.25 * Math.sin(Math.floor(t / 900) * 2.1);
    ctx.fillStyle = 'rgba(0,25,30,.18)';
    ctx.beginPath();
    ctx.ellipse(X(fx0), Y(fy), R(0.035), R(0.01), 0, 0, TAU);
    ctx.moveTo(X(fx0 - 0.03), Y(fy));
    ctx.lineTo(X(fx0 - 0.05), Y(fy) - R(0.012));
    ctx.lineTo(X(fx0 - 0.05), Y(fy) + R(0.012));
    ctx.fill();
  }
  // 위 둑 물가 앞면 (두께) + 물가 거품
  ctx.fillStyle = tod.mud;
  ctx.beginPath();
  for (let k = 0; k <= 24; k++) ctx.lineTo(X(k / 24), Y(edge(k / 24)));
  for (let k = 24; k >= 0; k--) ctx.lineTo(X(k / 24), Y(edge(k / 24) + 0.014));
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.45)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let k = 0; k <= 24; k++) ctx.lineTo(X(k / 24), Y(edge(k / 24) + 0.016) + Math.sin(t * 0.06 + k) * 0.8);
  ctx.stroke();
  // 위 둑 잔디 결·꽃
  for (let k = 0; k < 30; k++) {
    const x = hsh(k * 13 + 4), y = 0.165 + hsh(k * 17 + 2) * 0.1;
    ctx.strokeStyle = shade(tod.grass0, k % 2 ? 0.15 : -0.2);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(X(x), Y(y));
    ctx.lineTo(X(x) + Math.sin(t * 0.03 + k) * 1.2 - 1.5, Y(y) - R(0.014));
    ctx.moveTo(X(x) + 2, Y(y));
    ctx.lineTo(X(x) + 2 + Math.sin(t * 0.03 + k) * 1.2 + 1, Y(y) - R(0.011));
    ctx.stroke();
    if (k % 6 === 0) {
      ctx.fillStyle = ['#ffd6ec', '#fff3a8', '#ffffff'][k % 3];
      ctx.beginPath();
      ctx.arc(X(x) + 4, Y(y) - R(0.006), R(0.006), 0, TAU);
      ctx.fill();
    }
  }
  // 아래 둑 (잔디 윗면 + 앞면 흙 두께)
  const be = (x: number) => 1.198 + 0.01 * Math.sin(x * 6.1 + 2) + 0.005 * Math.sin(x * 17);
  ctx.fillStyle = 'rgba(255,255,255,.4)';
  ctx.beginPath();
  for (let k = 0; k <= 24; k++) ctx.lineTo(X(k / 24), Y(be(k / 24) - 0.004) + Math.sin(t * 0.06 + k * 1.3) * 0.8);
  ctx.lineTo(w, Y(1.3));
  ctx.lineTo(0, Y(1.3));
  ctx.fill();
  gr = ctx.createLinearGradient(0, Y(1.19), 0, Y(1.3));
  gr.addColorStop(0, tod.grass0);
  gr.addColorStop(1, tod.grass1);
  ctx.fillStyle = gr;
  ctx.beginPath();
  for (let k = 0; k <= 24; k++) ctx.lineTo(X(k / 24), Y(be(k / 24)));
  ctx.lineTo(w, Y(1.3));
  ctx.lineTo(0, Y(1.3));
  ctx.fill();
  for (let k = 0; k < 22; k++) {
    const x = hsh(k * 7 + 9), y = 1.215 + hsh(k * 19) * 0.06;
    ctx.strokeStyle = shade(tod.grass0, k % 2 ? 0.18 : -0.18);
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(X(x), Y(y));
    ctx.lineTo(X(x) - 2 + Math.sin(t * 0.03 + k) * 1.5, Y(y) - R(0.018));
    ctx.stroke();
  }
  // 부들·갈대 (양쪽 귀퉁이에서 바람에 흔들)
  for (const [bx, by, n, sc] of [[0.02, 0.29, 4, 1], [0.97, 0.3, 3, 0.9], [0.99, 1.21, 3, 1.1], [0.0, 1.22, 2, 0.9]] as [number, number, number, number][]) {
    for (let k = 0; k < n; k++) {
      const x = X(bx + (k - n / 2) * 0.018), y = Y(by), hgt = R((0.12 + 0.03 * hsh(k + bx * 10)) * sc), sw = Math.sin(t * 0.025 + k + bx * 5) * R(0.008);
      ctx.strokeStyle = shade(tod.grass1, -0.1);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + sw * 0.5, y - hgt * 0.5, x + sw, y - hgt);
      ctx.stroke();
      if (k % 2 === 0) {
        ctx.fillStyle = tod.night >= 1 ? '#4a3020' : '#7a4a2a';
        ctx.beginPath();
        ctx.roundRect(x + sw - R(0.007), y - hgt - R(0.01), R(0.014), R(0.04), R(0.007));
        ctx.fill();
      } else {
        ctx.strokeStyle = tod.grass0;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x - R(0.02), y - hgt * 0.5, x - R(0.03) + sw, y - hgt * 0.75);
        ctx.stroke();
      }
    }
  }
  // 잠자리 두 마리 (밤엔 반딧불)
  if (tod.night >= 1) {
    for (let k = 0; k < 9; k++) {
      const x = 0.1 + 0.8 * hsh(k * 3) + Math.sin(t * 0.01 + k) * 0.05, y = 0.35 + 0.8 * hsh(k * 9 + 1) + Math.cos(t * 0.013 + k * 2) * 0.03;
      const a = 0.5 + 0.5 * Math.sin(t * 0.08 + k * 1.7);
      const fg = ctx.createRadialGradient(X(x), Y(y), 0, X(x), Y(y), R(0.02));
      fg.addColorStop(0, `rgba(255,250,150,${0.8 * a})`);
      fg.addColorStop(1, 'rgba(255,250,150,0)');
      ctx.fillStyle = fg;
      ctx.fillRect(X(x) - R(0.02), Y(y) - R(0.02), R(0.04), R(0.04));
    }
  } else {
    for (let k = 0; k < 2; k++) {
      const x = 0.5 + 0.42 * Math.sin(t * 0.007 + k * 3), y = 0.2 + 0.05 * Math.sin(t * 0.011 + k) + k * 0.9 + 0.03 * Math.sin(t * 0.05 + k);
      drawDragonfly(ctx, X(x), Y(y), R(0.03), t + k * 40, k);
    }
  }
  void s;
  void h;
}

function drawDragonfly(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, t: number, k: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 0.02 + k) * 0.3);
  const f = 0.6 + 0.4 * Math.abs(Math.sin(t * 0.9));
  ctx.fillStyle = 'rgba(230,250,255,.55)';
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(sx * u * 0.38, -u * 0.08, u * 0.38, u * 0.1 * f, sx * 0.25, 0, TAU);
    ctx.ellipse(sx * u * 0.34, u * 0.08, u * 0.32, u * 0.09 * f, -sx * 0.25, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = k ? '#ff7a5a' : '#4ab8ff';
  ctx.beginPath();
  ctx.roundRect(-u * 0.06, -u * 0.18, u * 0.12, u * 0.8, u * 0.06);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, -u * 0.2, u * 0.1, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// ───────── 연잎 ─────────
interface PO { kind: number; crown: boolean; notch: number; t: number; key: number; sink: number; target: boolean; night: number }
const PAD = [['#5fc04a', '#3a8a33', '#2a6626'], ['#c9b55a', '#97803a', '#6e5a28'], ['#78c95a', '#4a963c', '#336a2a']];
function drawPad(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, o: PO) {
  const [c0, c1, c2] = PAD[o.kind], t = o.t;
  ctx.save();
  if (o.sink > 0) ctx.globalAlpha = 1 - o.sink * 0.9;
  // 물 그림자
  ctx.fillStyle = 'rgba(0,30,35,.32)';
  ctx.beginPath();
  ctx.ellipse(x + rx * 0.08, y + ry * 0.38, rx * 1.02, ry * 0.9, 0, 0, TAU);
  ctx.fill();
  // 노리는 연잎: 빛 기둥
  if (o.target) {
    const a = 0.55 + 0.35 * Math.sin(t * 0.25);
    const gg = ctx.createRadialGradient(x, y, rx * 0.2, x, y, rx * 1.6);
    gg.addColorStop(0, `rgba(255,250,190,${a})`);
    gg.addColorStop(1, 'rgba(255,250,190,0)');
    ctx.fillStyle = gg;
    ctx.fillRect(x - rx * 1.6, y - ry * 2.2, rx * 3.2, ry * 3.6);
  }
  if (o.crown) {
    const gg = ctx.createRadialGradient(x, y, rx * 0.4, x, y, rx * 1.5);
    gg.addColorStop(0, `rgba(255,215,90,${0.35 + 0.15 * Math.sin(t * 0.08)})`);
    gg.addColorStop(1, 'rgba(255,215,90,0)');
    ctx.fillStyle = gg;
    ctx.fillRect(x - rx * 1.5, y - ry * 1.5, rx * 3, ry * 3);
  }
  // 두께 (옆면)
  const tilt = o.sink * 0.5;
  ctx.translate(x, y);
  ctx.rotate(tilt * (o.key % 2 ? 1 : -1));
  ctx.fillStyle = c2;
  ctx.beginPath();
  ctx.ellipse(0, ry * 0.16, rx, ry, 0, 0, TAU);
  ctx.fill();
  // 윗면 (V자 홈이 있는 둥근 잎)
  const a0 = o.notch + 0.2, a1 = o.notch - 0.2 + TAU;
  const gr = ctx.createRadialGradient(-rx * 0.25, -ry * 0.35, rx * 0.1, 0, 0, rx * 1.05);
  gr.addColorStop(0, shade(c0, 0.22));
  gr.addColorStop(0.6, c0);
  gr.addColorStop(1, c1);
  ctx.fillStyle = gr;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.ellipse(0, 0, rx, ry, 0, a0, a1);
  ctx.closePath();
  ctx.fill();
  // 잎맥
  ctx.strokeStyle = shade(c1, -0.1) + '99';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let k = 0; k < 7; k++) {
    const an = a0 + ((a1 - a0) * (k + 0.5)) / 7;
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(an) * rx * 0.86, Math.sin(an) * ry * 0.86);
  }
  ctx.stroke();
  // 테두리 빛
  ctx.strokeStyle = 'rgba(255,255,255,.35)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx * 0.97, ry * 0.95, 0, Math.PI * 1.05, Math.PI * 1.6);
  ctx.stroke();
  // 물방울 하나
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  ctx.beginPath();
  ctx.ellipse(rx * 0.35, -ry * 0.25, rx * 0.06, ry * 0.07, 0, 0, TAU);
  ctx.fill();
  if (o.kind === 1) {
    // 시든 연잎: 갈라진 금·구멍·말린 가장자리
    ctx.strokeStyle = '#5a4520';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-rx * 0.5, -ry * 0.1);
    ctx.lineTo(-rx * 0.15, ry * 0.05);
    ctx.lineTo(rx * 0.05, -ry * 0.25);
    ctx.lineTo(rx * 0.45, -ry * 0.05);
    ctx.moveTo(-rx * 0.15, ry * 0.05);
    ctx.lineTo(-rx * 0.05, ry * 0.5);
    ctx.stroke();
    ctx.fillStyle = 'rgba(40,60,50,.6)';
    ctx.beginPath();
    ctx.ellipse(rx * 0.5, ry * 0.35, rx * 0.08, ry * 0.07, 0, 0, TAU);
    ctx.ellipse(-rx * 0.55, ry * 0.3, rx * 0.05, ry * 0.05, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#8a6a30';
    ctx.font = `${Math.max(12, rx * 0.42)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('🍂', -rx * 0.62, -ry * 0.55);
  }
  if (o.kind === 2) {
    // 통통 연꽃: 분홍 꽃잎 고리 + 가운데 용수철
    for (let k = 0; k < 8; k++) {
      const an = (k / 8) * TAU + Math.sin(t * 0.05) * 0.05;
      ctx.fillStyle = k % 2 ? '#ff9ad5' : '#ffc4e6';
      ctx.beginPath();
      ctx.ellipse(Math.cos(an) * rx * 0.7, Math.sin(an) * ry * 0.7, rx * 0.22, ry * 0.15, an, 0, TAU);
      ctx.fill();
    }
    ctx.strokeStyle = '#ff5fae';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const sq = 1 + 0.15 * Math.sin(t * 0.2);
    for (let k = 0; k <= 12; k++) {
      const yy = -k * ry * 0.06 * sq, xx = Math.sin(k * 1.6) * rx * 0.16;
      if (k) ctx.lineTo(xx, yy);
      else ctx.moveTo(xx, yy);
    }
    ctx.stroke();
  }
  if (o.crown) {
    ctx.strokeStyle = `rgba(255,214,90,${0.75 + 0.25 * Math.sin(t * 0.1)})`;
    ctx.lineWidth = 2.4;
    ctx.setLineDash([4, 3]);
    ctx.lineDashOffset = -t * 0.3;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx * 0.8, ry * 0.75, 0, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = `${Math.max(13, rx * 0.55)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('👑', rx * 0.62, -ry * 0.62 + Math.sin(t * 0.08) * 1.5);
  }
  if (o.target) {
    ctx.strokeStyle = `rgba(255,252,210,${0.8 + 0.2 * Math.sin(t * 0.3)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx * (0.9 + 0.06 * Math.sin(t * 0.25)), ry * (0.9 + 0.06 * Math.sin(t * 0.25)), 0, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
  // 가라앉는 중: 거품
  if (o.sink > 0 && o.sink < 1) {
    for (let k = 0; k < 5; k++) {
      const ph = (o.sink * 2 + k * 0.2) % 1;
      ctx.fillStyle = `rgba(255,255,255,${0.7 * (1 - ph)})`;
      ctx.beginPath();
      ctx.arc(x + (hsh(k + o.key) - 0.5) * rx, y - ph * ry * 1.6, 1.5 + (k % 2), 0, TAU);
      ctx.fill();
    }
  }
}

/** 풍덩 물기둥: 하얀 왕관 모양으로 솟았다 흩어진다 */
function drawSplash(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, q: number) {
  const up = Math.sin(Math.min(1, q * 1.3) * Math.PI), a = 1 - q * 0.8;
  ctx.fillStyle = `rgba(235,252,255,${0.85 * a})`;
  for (let k = 0; k < 7; k++) {
    const an = (k / 6) * Math.PI, sx = Math.cos(an) * u * 0.45, hh = u * (0.5 + 0.35 * hsh(k * 3)) * up;
    ctx.beginPath();
    ctx.moveTo(x + sx - u * 0.07, y);
    ctx.quadraticCurveTo(x + sx * 1.25, y - hh * 0.6, x + sx * 1.35, y - hh);
    ctx.quadraticCurveTo(x + sx * 1.1, y - hh * 0.5, x + sx + u * 0.07, y);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + sx * 1.4, y - hh - u * 0.08 * (1 - q), u * 0.05, 0, TAU);
    ctx.fill();
  }
  ctx.strokeStyle = `rgba(255,255,255,${0.7 * a})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y, u * (0.4 + 0.5 * q), u * (0.12 + 0.15 * q), 0, 0, TAU);
  ctx.stroke();
}

/** 고른 개구리가 뛸 길: 점선 포물선과 화살촉 */
function drawArc(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, hh: number, t: number) {
  const mx = (x0 + x1) / 2, my = Math.min(y0, y1) - hh;
  ctx.strokeStyle = 'rgba(255,250,200,.85)';
  ctx.lineWidth = 2.2;
  ctx.setLineDash([5, 5]);
  ctx.lineDashOffset = -t * 0.6;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(mx, my, x1, y1 - 4);
  ctx.stroke();
  ctx.setLineDash([]);
  const an = Math.atan2(y1 - 4 - my, x1 - mx);
  ctx.fillStyle = 'rgba(255,250,200,.95)';
  ctx.beginPath();
  ctx.moveTo(x1, y1 - 2);
  ctx.lineTo(x1 - Math.cos(an - 0.45) * 9, y1 - 4 - Math.sin(an - 0.45) * 9);
  ctx.lineTo(x1 - Math.cos(an + 0.45) * 9, y1 - 4 - Math.sin(an + 0.45) * 9);
  ctx.fill();
}

// ───────── 개구리 ─────────
interface FO { kind: number; face: string; t: number; lx: number; ly: number; hp: number; crown: number; key: number; rot: number; puff: number; towel?: number; small?: boolean }
/** 몸·짙은 색·배 */
const FCOL = [['#6fcf4f', '#3d9634', '#e4f8c0'], ['#a6ec4e', '#4fae2c', '#f4ffd8'], ['#b08454', '#6e4a2a', '#ead6ae']];
const TINT = ['#6fcf4f', '#5cc46a', '#86d24a', '#4fc08a', '#79c95c'];
/** 개구리 하나 (x,y = 발 가운데, u = 몸 폭) */
function drawFrog(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, o: FO) {
  const [cb0, cd, cbe] = FCOL[o.kind], cb = o.kind === 0 && o.towel !== undefined ? TINT[o.towel % 5] : cb0, t = o.t, f = o.face;
  ctx.save();
  ctx.translate(x, y);
  // 그림자
  if (f !== 'fly') {
    ctx.fillStyle = 'rgba(0,20,10,.3)';
    ctx.beginPath();
    ctx.ellipse(0, 0, u * 0.5, u * 0.13, 0, 0, TAU);
    ctx.fill();
  }
  let sx = 1, sy = 1;
  if (f === 'ready') (sx = 1.08), (sy = 0.86 + 0.04 * Math.sin(t * 0.3));
  if (f === 'fly') (sx = 0.92), (sy = 1.1);
  if (f === 'gasp') (sx = 0.94), (sy = 1.1);
  if (f === 'laugh') ctx.rotate(Math.sin(t * 0.6) * 0.08);
  if (f === 'shrug') ctx.rotate(Math.sin(t * 0.45) * 0.14);
  if (o.kind === 2 && o.hp === 1) (sy *= 0.74), (sx *= 1.12);
  ctx.rotate(o.rot);
  ctx.scale(sx, sy);
  // 뒷다리
  ctx.fillStyle = cd;
  if (f === 'fly') {
    for (const k of [-1, 1]) {
      ctx.save();
      ctx.translate(k * u * 0.22, -u * 0.18);
      ctx.rotate(k * 0.5);
      ctx.beginPath();
      ctx.ellipse(0, u * 0.22, u * 0.09, u * 0.3, 0, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, u * 0.52, u * 0.13, u * 0.06, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  } else {
    for (const k of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(k * u * 0.38, -u * 0.15, u * 0.2, u * 0.15, k * 0.3, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(k * u * 0.5, -u * 0.02, u * 0.14, u * 0.055, 0, 0, TAU);
      ctx.fill();
    }
  }
  // 몸통
  const gr = ctx.createRadialGradient(-u * 0.15, -u * 0.55, u * 0.05, 0, -u * 0.36, u * 0.6);
  gr.addColorStop(0, shade(cb, 0.3));
  gr.addColorStop(0.55, cb);
  gr.addColorStop(1, shade(cb, -0.28));
  ctx.fillStyle = gr;
  ctx.beginPath();
  ctx.ellipse(0, -u * 0.36, u * 0.48, u * 0.36, 0, 0, TAU);
  ctx.fill();
  // 배
  ctx.fillStyle = cbe;
  ctx.beginPath();
  ctx.ellipse(0, -u * 0.22, u * 0.29, u * 0.16, 0, 0, TAU);
  ctx.fill();
  // 무늬: 청개구리 옆줄 · 두꺼비 혹 · 개구리 점
  if (o.kind === 1) {
    ctx.strokeStyle = '#2f7a1c';
    ctx.lineWidth = Math.max(1.2, u * 0.035);
    for (const k of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(k * u * 0.2, -u * 0.62);
      ctx.quadraticCurveTo(k * u * 0.46, -u * 0.45, k * u * 0.42, -u * 0.2);
      ctx.stroke();
    }
  } else if (o.kind === 2) {
    ctx.fillStyle = shade(cb, -0.22);
    for (let k = 0; k < 9; k++) {
      ctx.beginPath();
      ctx.arc((hsh(k * 3) - 0.5) * u * 0.8, -u * (0.4 + hsh(k * 5) * 0.25), u * (0.035 + 0.02 * hsh(k)), 0, TAU);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = shade(cb, -0.18);
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.arc((hsh(k * 7 + o.key) - 0.5) * u * 0.6, -u * (0.48 + hsh(k * 11 + o.key) * 0.12), u * 0.04, 0, TAU);
      ctx.fill();
    }
  }
  // 앞발
  ctx.fillStyle = cd;
  const armUp = f === 'cheer' || f === 'happy' || f === 'proud';
  for (const k of [-1, 1]) {
    ctx.beginPath();
    if (armUp && f === 'cheer') ctx.ellipse(k * u * 0.42, -u * 0.62 - Math.abs(Math.sin(t * 0.4)) * u * 0.08, u * 0.06, u * 0.14, k * -0.5, 0, TAU);
    else ctx.ellipse(k * u * 0.17, -u * 0.05, u * 0.09, u * 0.05, 0, 0, TAU);
    ctx.fill();
  }
  // 목 주머니 (개굴)
  if (o.puff > 0) {
    ctx.fillStyle = `rgba(255,248,225,${0.85})`;
    ctx.beginPath();
    ctx.ellipse(0, -u * 0.3, u * 0.2 * (0.5 + o.puff), u * 0.13 * (0.4 + o.puff), 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(160,150,120,.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  // 수건 (풍덩 했던 구경꾼)
  if (o.towel !== undefined) {
    ctx.fillStyle = ['#ffffff', '#ffd6e0', '#d6ecff', '#fff3b8', '#e0ffd6'][o.towel % 5];
    ctx.beginPath();
    ctx.moveTo(-u * 0.46, -u * 0.38);
    ctx.quadraticCurveTo(0, -u * 0.62, u * 0.46, -u * 0.38);
    ctx.lineTo(u * 0.4, -u * 0.12);
    ctx.quadraticCurveTo(u * 0.2, -u * 0.2, u * 0.14, -u * 0.36);
    ctx.lineTo(-u * 0.14, -u * 0.36);
    ctx.quadraticCurveTo(-u * 0.2, -u * 0.2, -u * 0.4, -u * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,90,110,.6)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-u * 0.36, -u * 0.3);
    ctx.quadraticCurveTo(0, -u * 0.5, u * 0.36, -u * 0.3);
    ctx.stroke();
  }
  // 눈 (머리 위로 볼록)
  const ey = -u * 0.66, ex = u * 0.21, er = u * 0.15 * (f === 'gasp' ? 1.3 : f === 'fly' ? 1.08 : 1);
  ctx.fillStyle = cb;
  for (const k of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(k * ex, ey + er * 0.15, er * 1.2, 0, TAU);
    ctx.fill();
  }
  const blink = f === 'idle' && (t + o.key * 37) % 190 < 7;
  for (const k of [-1, 1]) {
    const cx = k * ex, cy = ey;
    if (f === 'proud' || f === 'happy' || f === 'laugh' || f === 'cheer') {
      ctx.strokeStyle = '#1d2a12';
      ctx.lineWidth = Math.max(1.6, u * 0.05);
      ctx.beginPath();
      ctx.arc(cx, cy + er * 0.3, er * 0.6, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      continue;
    }
    ctx.fillStyle = o.kind === 1 ? '#ffb347' : o.kind === 2 ? '#f4d27a' : '#fbfff4';
    ctx.beginPath();
    ctx.arc(cx, cy, er, 0, TAU);
    ctx.fill();
    if (blink || f === 'sad') {
      ctx.fillStyle = cb;
      ctx.beginPath();
      ctx.arc(cx, cy, er * 1.02, Math.PI, f === 'sad' ? Math.PI * 2.0 : Math.PI * 2.0);
      ctx.fill();
      if (blink) {
        ctx.beginPath();
        ctx.arc(cx, cy, er * 1.02, 0, Math.PI);
        ctx.fill();
      }
      if (f === 'sad') {
        ctx.fillStyle = '#1d2a12';
        ctx.beginPath();
        ctx.arc(cx, cy + er * 0.35, er * 0.35, 0, TAU);
        ctx.fill();
      }
      continue;
    }
    if (f === 'dizzy') {
      ctx.strokeStyle = '#1d2a12';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let q = 0; q < 14; q++) {
        const an = q * 0.9 + t * 0.2 * k, rr = (q / 14) * er * 0.85;
        if (q) ctx.lineTo(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr);
        else ctx.moveTo(cx, cy);
      }
      ctx.stroke();
      continue;
    }
    const pr = f === 'gasp' ? er * 0.22 : er * 0.48, mx = er * 0.4;
    ctx.fillStyle = '#141c10';
    ctx.beginPath();
    if (o.kind === 1) ctx.ellipse(cx + o.lx * mx, cy + o.ly * mx * 0.6, pr * 0.42, pr, 0, 0, TAU);
    else ctx.ellipse(cx + o.lx * mx, cy + o.ly * mx * 0.6, pr, pr * (o.kind === 2 ? 0.55 : 0.85), 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx + o.lx * mx - pr * 0.3, cy + o.ly * mx * 0.6 - pr * 0.35, Math.max(1, pr * 0.32), 0, TAU);
    ctx.fill();
    if (f === 'ready') {
      // 힘줌: 눈꺼풀을 내리고 눈썹을 세운다
      ctx.fillStyle = cb;
      ctx.beginPath();
      ctx.moveTo(cx - er * 1.1, cy - er * 1.1);
      ctx.lineTo(cx + er * 1.1, cy - er * 1.1);
      ctx.lineTo(cx + er * 1.1, cy - er * (k > 0 ? 0.1 : 0.45));
      ctx.lineTo(cx - er * 1.1, cy - er * (k > 0 ? 0.45 : 0.1));
      ctx.fill();
    }
  }
  // 입
  const my = -u * 0.44;
  ctx.strokeStyle = '#1d3a12';
  ctx.lineWidth = Math.max(1.4, u * 0.035);
  ctx.beginPath();
  if (f === 'gasp') {
    ctx.fillStyle = '#5a1a1a';
    ctx.ellipse(0, my + u * 0.02, u * 0.07, u * 0.08, 0, 0, TAU);
    ctx.fill();
  } else if (f === 'fly' || f === 'laugh' || f === 'cheer' || f === 'proud') {
    ctx.fillStyle = '#7a2230';
    ctx.moveTo(-u * 0.2, my - u * 0.02);
    ctx.quadraticCurveTo(0, my + u * 0.2, u * 0.2, my - u * 0.02);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ff8fa0';
    ctx.beginPath();
    ctx.ellipse(0, my + u * 0.07, u * 0.07, u * 0.035, 0, 0, TAU);
    ctx.fill();
  } else if (f === 'ready') {
    ctx.moveTo(-u * 0.14, my);
    ctx.lineTo(u * 0.14, my);
    ctx.stroke();
  } else if (f === 'worry' || f === 'sad' || f === 'shrug') {
    ctx.moveTo(-u * 0.14, my + u * 0.03);
    ctx.quadraticCurveTo(0, my - u * 0.05, u * 0.14, my + u * 0.03);
    ctx.stroke();
  } else {
    ctx.moveTo(-u * 0.25, my - u * 0.03);
    ctx.quadraticCurveTo(0, my + u * 0.08, u * 0.25, my - u * 0.03);
    ctx.stroke();
  }
  // 볼
  if (f === 'proud' || f === 'happy' || f === 'cheer' || f === 'laugh' || f === 'ready') {
    ctx.fillStyle = 'rgba(255,120,140,.45)';
    for (const k of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(k * u * 0.3, my - u * 0.02, u * 0.07, u * 0.04, 0, 0, TAU);
      ctx.fill();
    }
  }
  // 식은땀 (넘겨질 개구리)
  if (f === 'worry' || f === 'gasp') {
    const dy = f === 'gasp' ? 0 : ((t * 0.03) % 1) * u * 0.12;
    ctx.fillStyle = '#bfe8ff';
    ctx.beginPath();
    ctx.moveTo(u * 0.44, -u * 0.8 + dy);
    ctx.quadraticCurveTo(u * 0.52, -u * 0.66 + dy, u * 0.44, -u * 0.62 + dy);
    ctx.quadraticCurveTo(u * 0.36, -u * 0.66 + dy, u * 0.44, -u * 0.8 + dy);
    ctx.fill();
  }
  // 청개구리 잎 모자
  if (o.kind === 1) {
    ctx.fillStyle = '#2fa84a';
    ctx.beginPath();
    ctx.ellipse(u * 0.02, ey - er * 1.25, u * 0.16, u * 0.06, -0.4, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#1e7a32';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-u * 0.1, ey - er * 1.1);
    ctx.lineTo(u * 0.14, ey - er * 1.4);
    ctx.stroke();
  }
  // 두꺼비 납작: 반창고·어질어질 별
  if (o.kind === 2 && o.hp === 1) {
    ctx.fillStyle = '#ffe2b8';
    ctx.save();
    ctx.translate(-u * 0.25, -u * 0.55);
    ctx.rotate(-0.5);
    ctx.fillRect(-u * 0.12, -u * 0.035, u * 0.24, u * 0.07);
    ctx.rotate(1.1);
    ctx.fillRect(-u * 0.12, -u * 0.035, u * 0.24, u * 0.07);
    ctx.restore();
  }
  ctx.restore();
  if (o.kind === 2 && o.hp === 1) {
    ctx.font = `${Math.max(12, u * 0.2)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    for (let k = 0; k < 3; k++) {
      const an = t * 0.08 + (k * TAU) / 3;
      ctx.fillText('⭐', x + Math.cos(an) * u * 0.4, y - u * 0.62 + Math.sin(an) * u * 0.1);
    }
  }
  // 왕관 (한 마리만 남은 개구리)
  if (o.crown > 0) {
    const cy = y - u * 0.98 - (1 - o.crown) * u * 1.4, cw = u * 0.5;
    ctx.save();
    ctx.globalAlpha = Math.min(1, o.crown * 2);
    ctx.fillStyle = '#ffcc33';
    ctx.strokeStyle = '#b8860b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - cw / 2, cy + cw * 0.3);
    ctx.lineTo(x - cw / 2, cy - cw * 0.15);
    ctx.lineTo(x - cw / 4, cy + cw * 0.08);
    ctx.lineTo(x, cy - cw * 0.3);
    ctx.lineTo(x + cw / 4, cy + cw * 0.08);
    ctx.lineTo(x + cw / 2, cy - cw * 0.15);
    ctx.lineTo(x + cw / 2, cy + cw * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ff5a8a';
    ctx.beginPath();
    ctx.arc(x, cy + cw * 0.12, cw * 0.08, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

/** 두꺼비 체력: 넘어야 할 횟수 (♥♥ → ♥♡) */
function drawHp(ctx: CanvasRenderingContext2D, x: number, y: number, R: F, hp: number, t: number) {
  ctx.fillStyle = 'rgba(40,20,10,.7)';
  ctx.beginPath();
  ctx.roundRect(x - R(0.04), y - R(0.018), R(0.08), R(0.032), R(0.016));
  ctx.fill();
  ctx.font = `900 ${Math.max(12, R(0.03))}px system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let k = 0; k < 2; k++) {
    ctx.fillStyle = k < hp ? '#ff6b6b' : 'rgba(255,255,255,.35)';
    ctx.fillText(k < hp ? '♥' : '♡', x + (k - 0.5) * R(0.03), y + Math.sin(t * 0.1 + k) * 0.6);
  }
}
/** 청개구리 표시: 대각선 네 쪽 작은 화살 */
function drawTreeBadge(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, t: number, sel: boolean) {
  ctx.strokeStyle = sel ? 'rgba(220,255,160,.95)' : `rgba(200,255,140,${0.45 + 0.2 * Math.sin(t * 0.1)})`;
  ctx.lineWidth = 2;
  for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const ax = x + dx * u * 0.62, ay = y - u * 0.2 + dy * u * 0.32;
    ctx.beginPath();
    ctx.moveTo(ax - dx * u * 0.12, ay - dy * u * 0.07);
    ctx.lineTo(ax, ay);
    ctx.lineTo(ax - dx * u * 0.1, ay);
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax, ay - dy * u * 0.07);
    ctx.stroke();
  }
}

/** 소금쟁이: 긴 다리로 연잎 위에 버티고 선 방해꾼 */
function drawStrider(ctx: CanvasRenderingContext2D, x: number, y: number, cw: number, t: number, moving: boolean) {
  const u = cw * 0.5;
  ctx.save();
  ctx.translate(x, y - u * 0.15);
  // 다리가 닿은 물결
  ctx.strokeStyle = 'rgba(255,255,255,.5)';
  ctx.lineWidth = 1;
  for (const [lx, ly] of [[-0.9, -0.3], [0.9, -0.3], [-1, 0.25], [1, 0.25], [-0.6, 0.6], [0.6, 0.6]]) {
    ctx.beginPath();
    ctx.ellipse(lx * u, ly * u * 0.6 + u * 0.15, u * 0.12 * (1 + 0.2 * Math.sin(t * 0.2 + lx)), u * 0.05, 0, 0, TAU);
    ctx.stroke();
  }
  ctx.strokeStyle = '#2a2a3a';
  ctx.lineWidth = 1.6;
  const sw = moving ? Math.sin(t * 0.8) * 0.15 : 0;
  for (const [lx, ly] of [[-0.9, -0.3], [0.9, -0.3], [-1, 0.25], [1, 0.25], [-0.6, 0.6], [0.6, 0.6]]) {
    ctx.beginPath();
    ctx.moveTo(lx * u * 0.15, 0);
    ctx.quadraticCurveTo(lx * u * 0.55, -u * 0.35, lx * u * (1 + sw), ly * u * 0.6 + u * 0.15);
    ctx.stroke();
  }
  ctx.fillStyle = '#3a3448';
  ctx.beginPath();
  ctx.ellipse(0, -u * 0.05, u * 0.16, u * 0.42, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#5a5070';
  ctx.beginPath();
  ctx.ellipse(-u * 0.04, -u * 0.15, u * 0.06, u * 0.25, 0, 0, TAU);
  ctx.fill();
  // 얼굴 (뾰로통)
  ctx.fillStyle = '#ffffff';
  for (const k of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(k * u * 0.09, -u * 0.42, u * 0.08, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = '#111111';
  for (const k of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(k * u * 0.09 + Math.sin(t * 0.03) * u * 0.02, -u * 0.42, u * 0.04, 0, TAU);
    ctx.fill();
  }
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-u * 0.15, -u * 0.55);
  ctx.lineTo(-u * 0.03, -u * 0.5);
  ctx.moveTo(u * 0.15, -u * 0.55);
  ctx.lineTo(u * 0.03, -u * 0.5);
  ctx.stroke();
  ctx.restore();
  // 막힘 표시
  ctx.font = `900 ${Math.max(12, cw * 0.22)}px system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('⛔', x + u * 0.75, y - u * 0.75);
}
/** 소금쟁이가 다니는 길: 점선, 다음 자리에 흐린 그림자와 화살 */
function drawRoute(ctx: CanvasRenderingContext2D, s: FrogState, dp: Disp, X: F, Y: F, R: F, t: number) {
  const L = s.L, g = G(L), rt = L.route;
  ctx.strokeStyle = 'rgba(220,230,255,.55)';
  ctx.lineWidth = 2;
  ctx.setLineDash([3, 5]);
  ctx.lineDashOffset = -t * 0.3;
  ctx.beginPath();
  const uniq = [...new Set(rt)];
  uniq.forEach((p, k) => (k ? ctx.lineTo(X(g.x(p)), Y(g.y(p)) + R(0.01)) : ctx.moveTo(X(g.x(p)), Y(g.y(p)) + R(0.01))));
  if (uniq.length === rt.length && rt.length > 2) ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);
  for (const p of uniq) {
    ctx.fillStyle = 'rgba(220,230,255,.5)';
    ctx.beginPath();
    ctx.arc(X(g.x(p)), Y(g.y(p)) + R(0.01), R(0.007), 0, TAU);
    ctx.fill();
  }
  if (s.anim) return;
  // 다음에 갈 자리
  const S = s.S, nx = rt[(S.sk + 1) % rt.length];
  if (nx === dp.st || isFrog(S, nx) || S.toad === nx) return;
  const x = X(g.x(nx)), y = Y(g.y(nx));
  ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t * 0.15);
  ctx.font = `900 ${Math.max(12, R(0.034))}px system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#e8eeff';
  ctx.fillText('다음 🦟', x, y + R(0.045));
  ctx.globalAlpha = 1;
}

// ───────── 구경꾼 ─────────
const SWIM_T = 70;
function drawSwimmers(ctx: CanvasRenderingContext2D, s: FrogState, X: F, Y: F, R: F, t: number) {
  const u = R(G(s.L).cw * 0.62);
  for (const f of s.fans) {
    const q = (t - f.t0) / SWIM_T;
    if (q < 0 || q >= 1) continue;
    const e = q < 0.15 ? 0 : (q - 0.15) / 0.85, x = X(f.x + (f.fx - f.x) * e), y = Y(f.y + (f.fy - f.y) * e);
    const sc = f.kind === 'toad' ? 1.2 : 1;
    // 물살 V
    const ang = Math.atan2(f.fy - f.y, f.fx - f.x);
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x - Math.cos(ang - 0.5) * u * 0.9, y - Math.sin(ang - 0.5) * u * 0.5);
    ctx.lineTo(x, y);
    ctx.lineTo(x - Math.cos(ang + 0.5) * u * 0.9, y - Math.sin(ang + 0.5) * u * 0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x, y, u * 0.45 * sc, u * 0.12 * sc, 0, 0, TAU);
    ctx.stroke();
    // 머리만 동동 (처음엔 어질어질)
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - u, y - u * 2, u * 2, u * 2);
    ctx.clip();
    drawFrog(ctx, x, y + u * 0.42 * sc + Math.sin(t * 0.3) * 1.5, u * sc, { kind: f.kind === 'toad' ? 2 : f.kind === 'tree' ? 1 : 0, face: q < 0.45 ? 'dizzy' : 'idle', t, lx: Math.cos(ang), ly: Math.sin(ang), hp: 2, crown: 0, key: f.slot, rot: 0, puff: 0 });
    ctx.restore();
  }
}
function drawFans(ctx: CanvasRenderingContext2D, s: FrogState, X: F, Y: F, R: F, t: number, top: boolean) {
  const u = R(0.075);
  const list = s.fans.filter((f) => t - f.t0 >= SWIM_T && (f.fy < 0.6) === top).sort((a, b) => a.fy - b.fy);
  const age = t - s.crowdT, crowd = age >= 0 && age < 70 ? s.crowd : 'idle';
  for (const f of list) {
    const fresh = t - f.t0 - SWIM_T;
    let face = fresh < 40 ? 'dizzy' : crowd === 'cheer' ? 'cheer' : crowd === 'laugh' ? 'laugh' : crowd === 'wow' ? 'gasp' : 'idle';
    if (s.phase === 'stuck' && fresh >= 40) face = 'worry';
    const hop = face === 'cheer' ? Math.abs(Math.sin((t + f.slot * 7) * 0.25)) * u * 0.35 : 0;
    const sc = f.kind === 'toad' ? 1.25 : 1;
    // 물방울 뚝뚝 (막 올라온 구경꾼)
    if (fresh < 60) {
      ctx.fillStyle = 'rgba(190,235,255,.8)';
      const dq = (fresh % 20) / 20;
      ctx.beginPath();
      ctx.arc(X(f.fx) + u * 0.3, Y(f.fy) - u * 0.4 + dq * u * 0.4, 1.5, 0, TAU);
      ctx.fill();
    }
    const lk = s.sel >= 0 ? cl01((G(s.L).x(s.sel) - f.fx) * 4 + 0.5) * 2 - 1 : Math.sin(t * 0.01 + f.slot);
    drawFrog(ctx, X(f.fx), Y(f.fy) - hop, u * sc, { kind: f.kind === 'toad' ? 2 : f.kind === 'tree' ? 1 : 0, face, t: t + f.slot * 13, lx: lk, ly: top ? 0.6 : -0.6, hp: 2, crown: 0, key: f.slot + 40, rot: 0, puff: 0, towel: f.tint });
  }
  // 구경꾼의 한마디
  if (list.length && age >= 0 && age < 50 && (crowd === 'cheer' || crowd === 'laugh' || crowd === 'wow')) {
    const f = list[(Math.floor(s.crowdT / 7) + (top ? 0 : 1)) % list.length];
    if (f && age > 4 && age < 46) {
      const txt = crowd === 'cheer' ? ['개굴개굴!', '우와~', '짝짝짝!'][s.crowdT % 3] : crowd === 'laugh' ? '깔깔깔' : '헉, 두꺼비가!';
      ctx.font = `800 ${Math.max(12, R(0.032))}px system-ui`;
      const tw = ctx.measureText(txt).width + 10, bx = Math.max(tw / 2 + 2, Math.min(X(1) - tw / 2 - 2, X(f.fx))), by = Y(f.fy) - u * 1.35;
      ctx.fillStyle = 'rgba(255,255,255,.92)';
      ctx.beginPath();
      ctx.roundRect(bx - tw / 2, by - R(0.02), tw, R(0.04), R(0.02));
      ctx.fill();
      ctx.fillStyle = '#2a4a2a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(txt, bx, by + 1);
    }
  }
}

/** 한 마리만 남기면 연꽃이 활짝 */
function drawBloom(ctx: CanvasRenderingContext2D, s: FrogState, X: F, Y: F, R: F, g: ReturnType<typeof geo>, t: number) {
  const L = s.L, three = s.got === 3;
  const spots: [number, number][] = [];
  for (let i = 0; i < L.P.n; i++) if (!isFrog(s.S, i) && !((s.S.sunk >> i) & 1)) spots.push([g.x(i), g.y(i)]);
  const n = Math.min(spots.length, three ? 10 : 6);
  for (let k = 0; k < n; k++) {
    const [x, y] = spots[Math.floor(hsh(k * 7 + s.stage) * spots.length)], q = ease((s.pt - 10 - k * 6) / 22);
    if (q <= 0) continue;
    const r = R(g.cw * 0.3) * q;
    ctx.save();
    ctx.translate(X(x), Y(y) - r * 0.2);
    for (let p = 0; p < 8; p++) {
      const an = (p / 8) * TAU + k;
      ctx.fillStyle = p % 2 ? '#ff9ad5' : '#ffd0ea';
      ctx.beginPath();
      ctx.ellipse(Math.cos(an) * r * 0.5, Math.sin(an) * r * 0.28 - r * 0.15, r * 0.42, r * 0.2, an, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#ffe066';
    ctx.beginPath();
    ctx.arc(0, -r * 0.2, r * 0.18, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  void t;
}

// ───────── 되돌리기 단추 (연잎 모양) ─────────
function drawUndo(ctx: CanvasRenderingContext2D, s: FrogState, X: F, Y: F, R: F, t: number, font: (sz: number, w?: number) => void) {
  const x = X(UX), y = Y(UY), r = R(UR), can = s.undo > 0 && s.hist.length > 0 && (s.phase === 'play' || s.phase === 'stuck');
  const pulse = s.phase === 'stuck' && can ? 1 + 0.08 * Math.sin(t * 0.3) : 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.25, r * 1.02, r * 0.7, 0, 0, TAU);
  ctx.fill();
  const gr = ctx.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.1, 0, 0, r);
  gr.addColorStop(0, can ? '#c8f5a8' : '#9aa89a');
  gr.addColorStop(1, can ? '#4f9e3c' : '#5d6a5d');
  ctx.fillStyle = gr;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, r, -Math.PI / 2 + 0.25, -Math.PI / 2 - 0.25 + TAU);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.9)';
  ctx.lineWidth = Math.max(2.5, r * 0.13);
  ctx.beginPath();
  ctx.arc(0, r * 0.06, r * 0.42, Math.PI * 1.1, Math.PI * 2.55);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.95)';
  ctx.beginPath();
  ctx.moveTo(-r * 0.62, -r * 0.2);
  ctx.lineTo(-r * 0.2, -r * 0.2);
  ctx.lineTo(-r * 0.45, r * 0.18);
  ctx.fill();
  ctx.restore();
  // 남은 횟수 딱지
  ctx.fillStyle = can ? '#ffd166' : '#888888';
  ctx.beginPath();
  ctx.arc(x + r * 0.78, y - r * 0.7, R(0.02), 0, TAU);
  ctx.fill();
  font(0.026, 900);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#3a2a00';
  ctx.fillText(String(s.undo), x + r * 0.78, y - r * 0.7 + 1);
}

// ───────── 화면 띠: 위(판·하트·별) · 팻말 · 알림 · 결과 · 아래(별 목표·안내) ─────────
function drawHud(ctx: CanvasRenderingContext2D, s: FrogState, d: StageDef, w: number, X: F, Y: F, R: F, font: (sz: number, w?: number) => void, th: Theme) {
  const t = s.t, S = s.S, L = s.L, n = leftOf(S);
  const hb = R(0.066);
  ctx.fillStyle = 'rgba(10,40,36,.9)';
  ctx.fillRect(0, 0, w, hb);
  font(0.04, 900);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#eafff0';
  ctx.fillText(`${s.stage + 1}/${STAGES.length}판 · ${d.emoji} ${d.name}`, R(0.03), hb * 0.52);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffd166';
  const stt = `★ ${s.stars}`;
  ctx.fillText(stt, w - R(0.03), hb * 0.52);
  ctx.fillStyle = th.hot;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - R(0.06) - ctx.measureText(stt).width, hb * 0.52);
  // 나무 팻말: 남은 개구리 · 통과선
  {
    const cx = X(0.5), y0 = Y(0.15), bw = R(0.34), bh = R(0.072);
    ctx.fillStyle = '#5a3a1e';
    ctx.fillRect(cx - bw * 0.36, y0 + bh - 2, R(0.014), R(0.05));
    ctx.fillRect(cx + bw * 0.36 - R(0.014), y0 + bh - 2, R(0.014), R(0.05));
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.beginPath();
    ctx.ellipse(cx, y0 + bh + R(0.05), bw * 0.45, R(0.008), 0, 0, TAU);
    ctx.fill();
    const wg = ctx.createLinearGradient(0, y0, 0, y0 + bh);
    wg.addColorStop(0, '#c99a5e');
    wg.addColorStop(1, '#9a6c38');
    ctx.fillStyle = wg;
    ctx.beginPath();
    ctx.roundRect(cx - bw / 2, y0, bw, bh, R(0.012));
    ctx.fill();
    ctx.strokeStyle = '#6e4622';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(110,70,34,.35)';
    ctx.lineWidth = 1;
    for (let k = 1; k < 3; k++) {
      ctx.beginPath();
      ctx.moveTo(cx - bw / 2 + 4, y0 + (bh * k) / 3);
      ctx.lineTo(cx + bw / 2 - 4, y0 + (bh * k) / 3 + Math.sin(k) * 2);
      ctx.stroke();
    }
    const okNow = n <= L.goal;
    font(0.043, 900);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`🐸 ${n}마리`, cx, y0 + bh * 0.36);
    font(0.03, 900);
    ctx.fillStyle = okNow ? '#eaffc8' : '#ffe6c8';
    ctx.fillText(`${okNow ? '✓ ' : ''}${L.goal}마리 이하면 통과`, cx, y0 + bh * 0.77);
  }
  // 새것 알림
  if (s.news && t - s.news.t < NEWS_T + 20) {
    const age = t - s.news.t, a = Math.min(1, age / 10, (NEWS_T + 20 - age) / 20), drop = Math.max(0, 10 - age) * 2;
    ctx.globalAlpha = a;
    const tx = `✨ ${s.news.text}`;
    let fs = 0.036;
    font(fs, 900);
    while (ctx.measureText(tx).width > w - R(0.05) && fs > 0.03) font((fs -= 0.001), 900);
    const tw2 = Math.min(w - 8, ctx.measureText(tx).width + 22), by2 = Y(0.105) - drop;
    ctx.fillStyle = 'rgba(14,52,46,.95)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw2 / 2, by2 - R(0.027), tw2, R(0.054), R(0.027));
    ctx.fill();
    ctx.strokeStyle = 'rgba(170,255,200,.6)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#effff2';
    ctx.fillText(tx, w / 2, by2 + 1);
    ctx.globalAlpha = 1;
  }
  // 판 시작 큰 글씨
  {
    const age = t - s.startT;
    if (age < 90 && s.phase === 'play') {
      // 둑 위 팻말 자리를 잠깐 덮는다 (연못 가운데는 첫 톡을 위해 비워 둔다)
      const a = Math.min(1, age / 8, (90 - age) / 18), sc = 1 + Math.max(0, 8 - age) * 0.04;
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(8,40,36,.8)';
      ctx.fillRect(0, Y(0.138), w, R(0.13));
      ctx.save();
      ctx.translate(w / 2, Y(0.195));
      ctx.scale(sc, sc);
      font(0.07, 900);
      ctx.textAlign = 'center';
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(8,40,36,.8)';
      const big = `${d.emoji} ${s.stage + 1}판 · ${d.name}`;
      ctx.strokeText(big, 0, 0);
      ctx.fillStyle = '#fff6d6';
      ctx.fillText(big, 0, 0);
      font(0.038, 800);
      const sub = `개구리 ${leftOf(newSim(L))}마리 → ${L.goal}마리 이하로!`;
      ctx.strokeText(sub, 0, R(0.052));
      ctx.fillText(sub, 0, R(0.052));
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }
  drawSpot(ctx, s, w, X, Y, R, font);
  // 더 뛸 수 없을 때: 되돌리기 한 번의 기회
  if (s.phase === 'stuck') {
    const a = Math.min(1, s.pt / 8), left = 1 - s.pt / STUCK_T;
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(10,40,40,.82)';
    ctx.beginPath();
    ctx.roundRect(X(0.06), Y(0.53), X(0.88), R(0.17), R(0.03));
    ctx.fill();
    ctx.textAlign = 'center';
    font(0.048, 900);
    ctx.fillStyle = '#fff1c8';
    ctx.fillText(`더 뛸 수 없어요 — ${n}마리`, w / 2, Y(0.575));
    font(0.033, 800);
    ctx.fillStyle = '#effff2';
    ctx.fillText('🔙 되돌리기를 톡하면 한 수 물려요', w / 2, Y(0.623));
    ctx.fillStyle = 'rgba(239,255,242,.75)';
    ctx.fillText('다른 곳을 톡하면 이대로 끝', w / 2, Y(0.662));
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.fillRect(X(0.12), Y(0.685), X(0.76), R(0.008));
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(X(0.12), Y(0.685), X(0.76) * left, R(0.008));
    ctx.globalAlpha = 1;
    // 단추를 가리키는 손가락
    ctx.font = `${Math.max(18, R(0.06))}px system-ui`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText('👇', X(UX), Y(UY - 0.085) + Math.sin(t * 0.2) * 3);
  }
  // 결과
  if (s.phase === 'result') {
    const age = s.pt, a = Math.min(1, age / 10);
    // 남은 개구리(왕관)를 가리지 않게: 개구리들이 위쪽이면 판을 아래에
    const g = G(L), ys = [...Array(L.P.n).keys()].filter((i) => isFrog(S, i) || S.toad === i).map((i) => g.y(i));
    const my = ys.length ? ys.reduce((p, q) => p + q, 0) / ys.length : 0.7, o = my < 0.74 ? 0.36 : -0.12;
    ctx.globalAlpha = a;
    ctx.fillStyle = s.ok ? 'rgba(14,56,44,.74)' : 'rgba(70,24,30,.74)';
    ctx.fillRect(0, Y(0.5 + o), w, R(0.27));
    ctx.textAlign = 'center';
    font(s.ok ? 0.056 : 0.046, 900);
    ctx.fillStyle = s.ok ? '#fff1a8' : '#ffd0c8';
    const head = s.ok ? (s.won ? '연못 대잔치! 🎉' : n === 1 ? (s.got === 3 ? '👑 왕관 연잎에서 한 마리!' : '🐸 한 마리만 남겼다!') : `${d.emoji} ${d.name} 통과!`) : s.why;
    ctx.fillText(head, w / 2, Y(0.56 + o));
    if (s.ok) {
      for (let k = 0; k < 3; k++) {
        const ag = age - 14 - k * 10, got = k < s.got;
        if (ag < 0) continue;
        const sc = got ? 1 + Math.max(0, 1 - ag / 8) * 0.8 : 1;
        font(0.08 * sc, 900);
        ctx.fillStyle = got ? '#ffd166' : 'rgba(255,255,255,.35)';
        ctx.fillText(got ? '★' : '☆', w / 2 + (k - 1) * R(0.1), Y(0.65 + o));
        if (got && (juice(s).memo['star' + k] ?? -1) < s.clearT) (juice(s).memo['star' + k] = s.clearT), juice(s).burst(w / 2 + (k - 1) * R(0.1), Y(0.65 + o), '#ffe066', 14, 3, 2.4);
      }
      font(0.032, 800);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`남은 ${n}마리 (${L.goal}마리 이하) · 👑 ${n === 1 && isFrog(S, L.crown) ? '✓' : '✗'}${s.bestChain >= 2 ? ` · 최고 연속 ${s.bestChain}` : ''}`, w / 2, Y(0.725 + o));
    } else {
      font(0.04, 800);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(s.hearts > 0 ? '♥ -1 · 이 연못을 처음부터 다시' : '하트를 다 썼어요 — 끝', w / 2, Y(0.65 + o));
      font(0.032, 800);
      ctx.fillStyle = '#ffe6dc';
      ctx.fillText('외톨이 개구리가 생기지 않게 모아 가며 뛰어요', w / 2, Y(0.71 + o));
    }
    ctx.globalAlpha = 1;
  }
  // ═════════ 아래 띠: 별 목표 · 안내 ═════════
  {
    const y0 = Y(1.285);
    const bg = ctx.createLinearGradient(0, y0, 0, Y(A));
    bg.addColorStop(0, 'rgba(8,36,32,.0)');
    bg.addColorStop(0.25, 'rgba(8,36,32,.84)');
    bg.addColorStop(1, 'rgba(8,36,32,.94)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, y0, w, Y(A) - y0);
    const y2 = Y(1.325), res = s.phase === 'result' && s.ok, end = s.phase === 'result' || s.phase === 'stuck' || s.phase === 'settle';
    const onCrown = n === 1 && isFrog(S, L.crown);
    const chips = [
      { txt: `${L.goal}마리 이하`, st: res ? true : end && n > L.goal ? false : n <= L.goal ? true : null },
      { txt: '한 마리만', st: n === 1 ? true : end ? false : null },
      { txt: '👑에서 끝', st: onCrown ? true : end ? false : null },
    ];
    const gx0 = R(0.02), gw = (w - R(0.04)) / 3;
    chips.forEach(({ txt, st }, k) => {
      const gx = gx0 + k * gw;
      ctx.fillStyle = st === true ? 'rgba(255,209,102,.3)' : st === false ? 'rgba(0,0,0,.35)' : 'rgba(220,255,230,.12)';
      ctx.beginPath();
      ctx.roundRect(gx + 2, y2 - R(0.027), gw - 4, R(0.054), R(0.027));
      ctx.fill();
      font(0.032, 800);
      ctx.textAlign = 'center';
      ctx.fillStyle = st === false ? 'rgba(255,255,255,.45)' : '#f2fff0';
      ctx.fillText(`${st === true ? '★' : st === false ? '✗' : '☆'} ${txt}`, gx + gw / 2, y2 + 1);
    });
    const y3 = Y(1.405);
    let tp = '👆 개구리를 톡 → 반짝이는 연잎을 톡하면 폴짝!';
    if (s.phase === 'result') tp = s.ok ? '다음 연못으로 가요!' : '같은 연못을 다시 — 이번엔 뛰는 순서를 골라서';
    else if (s.phase === 'stuck') tp = '🔙 되돌리기 = 한 수 물리기 · 다른 곳 톡 = 끝';
    else if (s.sel >= 0 && s.sel === S.last) tp = '🔁 이어 뛰기! 반짝이는 연잎만 톡 · 다른 개구리를 톡해도 돼요';
    else if (s.sel >= 0) tp = '반짝이는 연잎을 톡하면 폴짝! · 같은 개구리를 다시 톡하면 내려놓기';
    else if (s.stage > 0) tp = d.tip;
    ctx.textAlign = 'center';
    let fs = 0.034;
    font(fs, 800);
    while (ctx.measureText(tp).width > w - R(0.04) && fs > 0.03) font((fs -= 0.001), 800);
    ctx.fillStyle = 'rgba(232,255,236,.92)';
    ctx.fillText(tp, w / 2, y3);
  }
  // 첫 판: 손가락으로 첫 수 가리키기
  if (s.stage === 0 && S.moves === 0 && s.phase === 'play' && t - s.startT > 30 && !s.anim && s.tries === 0) {
    const m = L.plan[0], g = G(L);
    if (m) {
      const k = s.sel === m.a ? landOf(L, m) : m.a, bob = Math.sin(t * 0.15) * R(0.012);
      ctx.font = `${Math.max(18, R(0.075))}px system-ui`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('👆', X(g.x(k)) + R(0.03), Y(g.y(k) + 0.075) + bob);
      ctx.strokeStyle = 'rgba(255,255,255,.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(X(g.x(k)), Y(g.y(k)) - R(0.025), R(g.cw * 0.5) + Math.sin(t * 0.15) * 2, R(g.ch * 0.6), 0, 0, TAU);
      ctx.stroke();
    }
  }
  ctx.textBaseline = 'alphabetic';
}

/** 새 장치 스포트라이트: 그 판을 처음 할 때, 판 소개 뒤 2초쯤 주변을 어둡게 하고 장치에 빛을 비춘다 */
function drawSpot(ctx: CanvasRenderingContext2D, s: FrogState, w: number, X: F, Y: F, R: F, font: (sz: number, w?: number) => void) {
  if (s.retry || s.phase !== 'play' || s.spotT < 0) return;
  const age = s.t - s.spotT + 88;
  if (age < 88 || age > 225) return;
  const L = s.L, S = s.S, g = G(L), key = STAGES[s.stage].key;
  let at = -1, rr = 0.12, label = '';
  const first = (mask: number) => [...Array(L.P.n).keys()].find((i) => (mask >> i) & 1) ?? -1;
  if (key === 'basic') (at = L.crown), (label = '👑 왕관 연잎 — 마지막 한 마리가 여기서 끝나면 ★3');
  else if (key === 'chain') (at = S.last >= 0 ? S.last : L.plan[0]?.a ?? -1), (label = '🔁 방금 뛴 개구리는 들린 채 — 연잎만 톡하면 또 폴짝');
  else if (key === 'toad') (at = S.toad), (label = '💪 큰 두꺼비 — 두 번 넘어야 풍덩 (♥♥)'), (rr = 0.14);
  else if (key === 'wither') (at = first(L.wither & ~S.sunk)), (label = '🍂 시든 연잎 — 개구리가 떠나면 꼬르륵');
  else if (key === 'tree') (at = S.tree), (label = '🌿 청개구리 — 대각선으로도 뛰어요');
  else if (key === 'strider') (at = striderAt(L, S)), (label = '🦟 소금쟁이 — 한 번 뛸 때마다 한 칸 · 거긴 못 앉아요');
  else if (key === 'spring') (at = first(L.spring)), (label = '🌸 통통 연꽃 — 앉으면 같은 쪽으로 한 번 더!');
  if (at < 0 || !label) return;
  const x = g.x(at), y = g.y(at) - g.ch * 0.25;
  const a = Math.min(1, (age - 88) / 10, (225 - age) / 18), cx = X(x), cy = Y(y), r = R(Math.max(rr, g.cw * 0.62)) * (1 + 0.05 * Math.sin(age * 0.2));
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(4,22,24,.62)';
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
  while (ctx.measureText(label).width > w - R(0.08) && fs > 0.03) font((fs -= 0.001), 900);
  const tw = ctx.measureText(label).width + R(0.05), ly = y > 0.75 ? cy - r - R(0.06) : cy + r + R(0.06), lx = Math.max(tw / 2 + 4, Math.min(w - tw / 2 - 4, cx));
  ctx.fillStyle = 'rgba(16,70,56,.97)';
  ctx.beginPath();
  ctx.roundRect(lx - tw / 2, ly - R(0.03), tw, R(0.06), R(0.03));
  ctx.fill();
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f4fff0';
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
