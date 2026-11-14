/**
 * 장난감 더미 셋 맞추기 (26라운드: 검증된 요즘 캐주얼 뼈대 × 공장의 와우) — 셋 모아 지우기 × 가리키기(톡) × 도감 수집.
 * 기준 9(손이 하는 일은 하나): 장난감을 톡. 누르고 있는 동안 그걸 꺼내면 갈 기차 칸·굴러 내려올 장난감·새로 드러날 장난감이 보이고,
 *   떼면 장난감이 기차 칸으로 쏙 날아간다(장난감 밖에서 떼면 취소). 키보드는 화살표 커서 + 스페이스.
 * 규칙(결정적): 바구니 속 장난감은 줄마다 쌓여 있고, 맨 위에 드러난 것만 꺼낼 수 있다. 꺼낸 장난감은 장난감 기차(7칸)에 타고,
 *   같은 것끼리 붙어 앉는다. 같은 것 셋이 모이면 '뿅' 사라진다. 기차 7칸이 꽉 차면 실패.
 * 와우(와르르): 더미는 모래더미처럼 이웃 줄과 두 칸 넘게 차이 나면 버티지 못한다 — 꺼낸 자리로 옆 줄 꼭대기 장난감이
 *   데굴 굴러 내려와 자리를 잡고, 그 줄이 낮아지면 또 그 옆이 굴러 내려온다(연쇄). 높은 데서 빼면 바로 아래가 드러나고,
 *   낮은 데서 빼면 굴러온 장난감이 그 자리를 덮는 대신 저 위 꼭대기 아래가 드러난다 — 어디서 빼느냐가 수다.
 * 판(방) 8개: 목표 = 더미 다 치우기 또는 목표 장난감 N번 뿅. 별 = ★ 성공 · ★ 기차에 P칸 넘게 안 태우기 · ★ 연속 뿅 C번.
 *   실패(기차가 꽉 참 · 꺼낼 게 없음) = 하트 -1, 그 방을 처음부터. 하트 셋을 다 잃거나 8방을 마치면 끝.
 * 펼쳐짐(하는 일이 바뀐다): 1 아기방(톡·뿅·와르르) → 2 놀이방(목표 장난감: 곰 인형을 파내기) → 3 거실(🎁 깜짝 상자: 열면 양옆 꼭대기가
 *   기차로 퉁 — 언제 열지) → 4 다락방(🎀 리본 쌍둥이: 하나를 꺼내면 깊이 묻힌 짝이 쑥 뽑혀 그 위가 털썩) → 5 해적방(🔒 보물 상자: 🔑 셋을 모아야
 *   열림 — 열쇠부터) → 6 파티방(🎈 풍선 장난감: 위가 비면 저절로 둥실 기차에 탐 — 그 위를 언제 팔지) → 7 현관(🐶 뭉치의 장난: 5톡마다
 *   기차 맨 끝 장난감을 물고 더미로 — 끝 칸을 정리) → 8 꿈나라 방(전부).
 * 웃음: 기관사 강아지 뭉치가 와르르에 눈이 동그래지고, 뿅에 우쭐 혀를 내밀고, 기차가 차오르면 식은땀, 실패하면 어질어질 별.
 *   창가의 고양이는 와르르에 털을 세우고 폴짝 뛴다.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.45;
/** 기차 칸 수 · 손가락 닿는 반지름 · 장난감 크기 · 층 간격 */
const TRAY = 7, HIT = 0.078, U = 0.138, DY = 0.098;
const COOL = 10, RESULT_OK = 200, RESULT_FAIL = 160, NEWS_T = 200;
const STAR_PTS = 100, WIN_PTS = 100;

// ───────────────────────────── 장난감 ─────────────────────────────
const BEAR = 0, DUCK = 1, BALL = 2, CAR = 3, BLOCK = 4, ROBOT = 5, ROCKET = 6, DINO = 7, BUNNY = 8, DRUM = 9, KEY = 10, CROWN = 11, JACK = 12, CHEST = 13;
/** 기차에 타는 종류 수(뿅 세기용) */
const NK = 12;
export const KIND = [
  { name: '곰 인형', emo: '🧸' },
  { name: '오리', emo: '🦆' },
  { name: '비치볼', emo: '🏐' },
  { name: '자동차', emo: '🚗' },
  { name: '블록', emo: '🧱' },
  { name: '로봇', emo: '🤖' },
  { name: '로켓', emo: '🚀' },
  { name: '공룡', emo: '🦕' },
  { name: '토끼 인형', emo: '🐰' },
  { name: '북', emo: '🥁' },
  { name: '열쇠', emo: '🔑' },
  { name: '보물', emo: '👑' },
  { name: '깜짝 상자', emo: '🎁' },
  { name: '보물 상자', emo: '🧰' },
];

interface StageDef {
  key: string; name: string; emoji: string; news: string; tip: string;
  W: number; groups: number; kinds: number[]; goal: { kind: number; n: number } | null;
  jacks?: number; twins?: number; chest?: boolean; balloons?: number; dog?: number;
  P: number; C: number; room: number; fixed?: number[][];
}

export const STAGES: StageDef[] = [
  {
    key: 'nursery', name: '아기방', emoji: '🍼', news: '👆 위에 드러난 장난감을 톡 → 기차 칸으로!', tip: '⛰️ 낮은 데서 꺼내면 옆 더미가 와르르', W: 5, groups: 5, kinds: [BEAR, DUCK, BALL], goal: null, P: 4, C: 2, room: 0,
    fixed: [[BALL, BEAR], [BEAR, BALL, DUCK], [DUCK, BALL, DUCK, BEAR], [BEAR, DUCK, DUCK], [DUCK, BEAR, BEAR]],
  },
  { key: 'play', name: '놀이방', emoji: '🧸', news: '🎯 곰 인형 찾기 — 더미 깊이 묻혀 있어요', tip: '🎯 목표 장난감 위를 파내요', W: 6, groups: 7, kinds: [BEAR, DUCK, BALL, CAR], goal: { kind: BEAR, n: 2 }, P: 4, C: 2, room: 1 },
  { key: 'jack', name: '거실', emoji: '🎁', news: '🎁 깜짝 상자 — 톡 하면 양옆 꼭대기가 기차로 퉁!', tip: '🎁 양옆 꼭대기가 반가울 때 열어요', W: 6, groups: 8, kinds: [BEAR, DUCK, BALL, CAR, BLOCK, ROBOT], goal: null, jacks: 2, P: 4, C: 2, room: 2 },
  { key: 'twin', name: '다락방', emoji: '🎀', news: '🎀 리본 쌍둥이 — 하나를 꺼내면 짝이 쑥 뽑혀요', tip: '🎀 깊이 묻힌 짝을 리본으로 뽑아요', W: 7, groups: 9, kinds: [DINO, DUCK, BALL, CAR, BLOCK, ROBOT, ROCKET], goal: { kind: DINO, n: 2 }, twins: 3, P: 4, C: 2, room: 3 },
  { key: 'chest', name: '해적방', emoji: '🏴‍☠️', news: '🔒 보물 상자 — 🔑 열쇠 셋을 뿅 하면 열려요', tip: '🔑 열쇠 셋 먼저 — 열린 상자를 톡!', W: 7, groups: 8, kinds: [BEAR, DUCK, BALL, CAR, ROBOT, ROCKET, DRUM], goal: { kind: CROWN, n: 1 }, chest: true, P: 4, C: 2, room: 4 },
  { key: 'balloon', name: '파티방', emoji: '🎈', news: '🎈 풍선 장난감 — 위가 비면 둥실 기차로 날아와요', tip: '🎈 풍선 위를 파면 저절로 기차에 타요', W: 7, groups: 9, kinds: [BEAR, DUCK, BALL, CAR, BUNNY, ROCKET, DRUM], goal: null, balloons: 4, P: 4, C: 2, room: 5 },
  { key: 'dog', name: '현관', emoji: '🐶', news: '🐶 뭉치의 장난 — 5톡마다 기차 끝 장난감을 물고 더미로!', tip: '🐶 뭉치가 오기 전에 기차 끝을 정리해요', W: 7, groups: 9, kinds: [BUNNY, DUCK, BALL, CAR, BLOCK, ROBOT, DINO, DRUM], goal: { kind: BUNNY, n: 2 }, dog: 5, P: 4, C: 2, room: 6 },
  { key: 'dream', name: '꿈나라 방', emoji: '🌙', news: '🌙 마지막 방 — 상자·리본·풍선·열쇠·뭉치 다 나와요!', tip: '🌙 무엇부터 꺼낼지 미리 눌러 봐요', W: 7, groups: 8, kinds: [BEAR, DUCK, BALL, CAR, BLOCK, ROBOT, ROCKET, BUNNY], goal: null, jacks: 1, twins: 2, balloons: 2, chest: true, dog: 6, P: 5, C: 2, room: 7 },
];
export const STAGE_COUNT = STAGES.length;

// ───────────────────────────── 판 ─────────────────────────────
export interface Level { d: StageDef; W: number; N: number; kind: number[]; twin: number[]; bal: boolean[]; cols0: number[][]; jx: number[]; ja: number[] }

/** 모래더미 규칙: 이웃 줄보다 두 칸 넘게 높으면 꼭대기가 낮은 쪽으로 굴러 내려간다 (가장 큰 차이부터, 같으면 왼쪽부터) */
function slideStep(h: number[], heavy?: (c: number) => boolean): [number, number] | null {
  let bi = -1, bj = -1, bd = 1;
  for (let i = 0; i < h.length; i++)
    for (const j of [i - 1, i + 1])
      if (j >= 0 && j < h.length && h[j] - h[i] > bd && !heavy?.(j)) (bd = h[j] - h[i]), (bi = i), (bj = j);
  return bi < 0 ? null : [bj, bi];
}

function shuffle<T>(a: T[], r: Rng): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function genLevel(d: StageDef, r: Rng): Level {
  const W = d.W, kind: number[] = [];
  if (d.fixed) {
    const cols0 = d.fixed.map((c) => c.map((k) => (kind.push(k), kind.length - 1)));
    return { d, W, N: kind.length, kind, twin: kind.map(() => -1), bal: kind.map(() => false), cols0, jx: kind.map(() => r() - 0.5), ja: kind.map(() => r() - 0.5) };
  }
  // 종류: 목표 장난감은 정확히 n벌, 나머지는 돌아가며
  const others = d.kinds.filter((k) => k !== d.goal?.kind);
  const groups: number[] = [];
  if (d.goal && d.goal.kind < KEY) for (let k = 0; k < d.goal.n; k++) groups.push(d.goal.kind);
  for (let g = 0; groups.length < d.groups; g++) groups.push(g < others.length ? others[g] : others[Math.floor(r() * others.length)]);
  for (const k of groups) kind.push(k, k, k);
  if (d.chest) kind.push(KEY, KEY, KEY);
  for (let k = 0; k < (d.jacks ?? 0); k++) kind.push(JACK);
  if (d.chest) kind.push(CHEST);
  const N = kind.length;
  // 더미 모양: 가운데쯤에 하나씩 떨어뜨려 와르르 자리 잡게
  const h = new Array(W).fill(0);
  const mid = (W - 1) / 2 + (r() - 0.5) * W * 0.35;
  for (let k = 0; k < N; k++) {
    h[Math.max(0, Math.min(W - 1, Math.round(mid + (r() + r() - 1) * W * 0.42)))]++;
    for (let m = slideStep(h); m; m = slideStep(h)) h[m[0]]--, h[m[1]]++;
  }
  const cells: { c: number; l: number; dep: number }[] = [];
  for (let c = 0; c < W; c++) for (let l = 0; l < h[c]; l++) cells.push({ c, l, dep: h[c] - 1 - l });
  shuffle(cells, r);
  const at: ({ c: number; l: number; dep: number } | null)[] = kind.map(() => null);
  const used = new Set<number>();
  const take = (id: number, ok: (q: { c: number; l: number; dep: number }) => boolean) => {
    let j = cells.findIndex((q, i) => !used.has(i) && ok(q));
    if (j < 0) j = cells.findIndex((_, i) => !used.has(i));
    used.add(j);
    at[id] = cells[j];
  };
  const chestId = kind.indexOf(CHEST);
  if (chestId >= 0) take(chestId, (q) => q.dep >= 2 && q.l >= 1);
  const ch = chestId >= 0 ? at[chestId]! : null;
  kind.forEach((k, id) => k === KEY && take(id, (q) => q.dep >= 1 && !(ch && q.c === ch.c && q.l < ch.l)));
  kind.forEach((k, id) => k === d.goal?.kind && take(id, (q) => q.dep >= 2));
  kind.forEach((k, id) => k === JACK && take(id, (q) => q.dep <= 2 && q.dep >= 1));
  kind.forEach((_, id) => at[id] || take(id, () => true));
  const cols0: number[][] = Array.from({ length: W }, () => []);
  for (let c = 0; c < W; c++) for (let l = 0; l < h[c]; l++) cols0[c].push(kind.findIndex((_, id) => at[id]!.c === c && at[id]!.l === l));
  // 풍선: 묻힌(맨 위가 아닌) 보통 장난감에
  const bal = kind.map(() => false), twin = kind.map(() => -1);
  const plain = shuffle(kind.map((_, i) => i).filter((i) => kind[i] < KEY), r);
  let nb = d.balloons ?? 0;
  for (const i of plain) if (nb > 0 && at[i]!.dep >= 1 && at[i]!.dep <= 4) (bal[i] = true), nb--;
  // 리본 쌍둥이: 같은 종류, 다른 줄, 하나는 위쪽(깊이 0~1) 하나는 깊이 2 이상
  let nt = d.twins ?? 0;
  for (const i of plain) {
    if (nt <= 0) break;
    if (bal[i] || twin[i] >= 0 || at[i]!.dep > 1) continue;
    const j = plain.find((q) => q !== i && kind[q] === kind[i] && !bal[q] && twin[q] < 0 && at[q]!.c !== at[i]!.c && at[q]!.dep >= 2);
    if (j === undefined) continue;
    twin[i] = j;
    twin[j] = i;
    nt--;
  }
  return { d, W, N, kind, twin, bal, cols0, jx: kind.map(() => r() - 0.5), ja: kind.map(() => r() - 0.5) };
}

// ───────────────────────────── 규칙(시뮬레이션) ─────────────────────────────
export interface Sim { cols: number[][]; tray: number[]; mk: number[]; peak: number; combo: number; best: number; taps: number; fail: number; done: boolean; open: boolean; flown: number[]; dogC: number; left: number; pops: number }
type Why = 'tap' | 'jack' | 'twin' | 'balloon';
type RE =
  | { k: 'take'; id: number; why: Why; tray: number[] }
  | { k: 'pop'; ids: number[]; kind: number; tray: number[] }
  | { k: 'slide'; id: number; from: number; to: number; lvl: number }
  | { k: 'drop'; id: number; col: number; lvl: number }
  | { k: 'jack'; id: number; col: number }
  | { k: 'chest'; id: number; col: number }
  | { k: 'unlock' }
  | { k: 'dog'; id: number; col: number; lvl: number; tray: number[] };

export function newSim(L: Level): Sim {
  return { cols: L.cols0.map((c) => c.slice()), tray: [], mk: new Array(NK).fill(0), peak: 0, combo: 0, best: 0, taps: 0, fail: 0, done: false, open: !L.d.chest, flown: [], dogC: L.d.dog ?? 0, left: L.N, pops: 0 };
}
const cloneSim = (S: Sim): Sim => ({ ...S, cols: S.cols.map((c) => c.slice()), tray: S.tray.slice(), mk: S.mk.slice(), flown: S.flown.slice() });

function find(S: Sim, id: number): [number, number] {
  for (let c = 0; c < S.cols.length; c++) {
    const i = S.cols[c].indexOf(id);
    if (i >= 0) return [c, i];
  }
  return [-1, -1];
}
/** 0 꺼낼 수 있음 · 1 위에 다른 장난감 · 2 잠긴 상자 · 3 더미에 없음 */
export function canTake(L: Level, S: Sim, id: number) {
  const [c, i] = find(S, id);
  if (c < 0) return 3;
  if (i !== S.cols[c].length - 1) return 1;
  if (L.kind[id] === CHEST && !S.open) return 2;
  return 0;
}
export function movesOf(L: Level, S: Sim) {
  const out: number[] = [];
  for (const col of S.cols) {
    const t = col[col.length - 1];
    if (t !== undefined && !(L.kind[t] === CHEST && !S.open)) out.push(t);
  }
  return out;
}

function addTray(L: Level, S: Sim, id: number, why: Why, rec?: RE[]) {
  const k = L.kind[id];
  let at = S.tray.length;
  for (let i = S.tray.length - 1; i >= 0; i--)
    if (L.kind[S.tray[i]] === k) {
      at = i + 1;
      break;
    }
  S.tray.splice(at, 0, id);
  rec?.push({ k: 'take', id, why, tray: S.tray.slice() });
  const same = S.tray.filter((q) => L.kind[q] === k);
  if (same.length >= 3) {
    S.tray = S.tray.filter((q) => L.kind[q] !== k);
    S.mk[k]++;
    S.pops++;
    rec?.push({ k: 'pop', ids: same, kind: k, tray: S.tray.slice() });
    if (k === KEY && !S.open) (S.open = true), rec?.push({ k: 'unlock' });
  }
  if (S.tray.length > S.peak) S.peak = S.tray.length;
  if (S.tray.length >= TRAY) S.fail = 1;
}
/** 더미에서 빼낸다 — 중간에서 뽑히면 그 위가 한 칸씩 털썩 */
function pull(S: Sim, id: number, rec?: RE[]) {
  const [c, i] = find(S, id);
  S.cols[c].splice(i, 1);
  S.left--;
  if (rec) for (let j = i; j < S.cols[c].length; j++) rec.push({ k: 'drop', id: S.cols[c][j], col: c, lvl: j });
  return c;
}
function takeToy(L: Level, S: Sim, id: number, why: Why, rec?: RE[]) {
  pull(S, id, rec);
  addTray(L, S, id, why, rec);
  const p = L.twin[id];
  if (p >= 0 && !S.fail && find(S, p)[0] >= 0) {
    pull(S, p, rec);
    addTray(L, S, p, 'twin', rec);
  }
}
/** 와르르: 무거운 보물 상자는 안 구른다 */
function settle(L: Level, S: Sim, rec?: RE[]) {
  const h = S.cols.map((c) => c.length), heavy = (c: number) => L.kind[S.cols[c][S.cols[c].length - 1]] === CHEST;
  for (let m = slideStep(h, heavy); m; m = slideStep(h, heavy)) {
    const id = S.cols[m[0]].pop()!;
    S.cols[m[1]].push(id);
    h[m[0]]--;
    h[m[1]]++;
    rec?.push({ k: 'slide', id, from: m[0], to: m[1], lvl: h[m[1]] - 1 });
  }
}
/** 꼭대기로 드러난 풍선 장난감은 저절로 둥실 기차로 */
function floatUp(L: Level, S: Sim, rec?: RE[]) {
  for (let g = 0; g < 12 && !S.fail; g++) {
    let f = -1;
    for (const col of S.cols) {
      const t = col[col.length - 1];
      if (t !== undefined && L.bal[t] && !S.flown.includes(t)) {
        f = t;
        break;
      }
    }
    if (f < 0) return;
    S.flown.push(f);
    takeToy(L, S, f, 'balloon', rec);
    settle(L, S, rec);
  }
}

/** 장난감 id를 톡 (꺼낼 수 있는지는 부르는 쪽이 확인) */
export function apply(L: Level, S: Sim, id: number, rec?: RE[]) {
  S.taps++;
  const p0 = S.pops, k = L.kind[id];
  if (k === JACK) {
    const c = pull(S, id, rec);
    rec?.push({ k: 'jack', id, col: c });
    for (const nc of [c - 1, c + 1]) {
      if (S.fail || nc < 0 || nc >= S.cols.length) continue;
      const t = S.cols[nc][S.cols[nc].length - 1];
      if (t !== undefined && L.kind[t] < JACK) takeToy(L, S, t, 'jack', rec);
    }
  } else if (k === CHEST) {
    const c = pull(S, id, rec);
    rec?.push({ k: 'chest', id, col: c });
    S.mk[CROWN]++;
    S.pops++;
  } else takeToy(L, S, id, 'tap', rec);
  settle(L, S, rec);
  floatUp(L, S, rec);
  if (L.d.dog && !S.fail && --S.dogC <= 0) {
    S.dogC = L.d.dog;
    if (S.tray.length) {
      const q = S.tray.pop()!;
      let bc = 0;
      for (let c = 1; c < S.cols.length; c++) if (S.cols[c].length <= S.cols[bc].length) bc = c;
      S.cols[bc].push(q);
      S.left++;
      rec?.push({ k: 'dog', id: q, col: bc, lvl: S.cols[bc].length - 1, tray: S.tray.slice() });
    }
  }
  const np = S.pops - p0;
  S.combo = np ? S.combo + np : 0;
  if (S.combo > S.best) S.best = S.combo;
  if (S.fail) return;
  const g = L.d.goal;
  if (g ? S.mk[g.kind] >= g.n : S.left === 0 && S.tray.length === 0) S.done = true;
  else if (!movesOf(L, S).length) S.fail = 2;
}
export const starsOf = (d: StageDef, S: Sim) => 1 + (S.peak <= d.P ? 1 : 0) + (S.best >= d.C ? 1 : 0);

// ───────────────────────────── 봇의 머리(판 고르기에도 쓴다) ─────────────────────────────
/** 버릇 하나: 기차에 이미 있는 것과 같은 장난감부터(둘 있는 것 먼저), 없으면 맨 위(가장 높은 줄) */
export function habitPick(L: Level, S: Sim) {
  let best = -1, bv = -1e9;
  for (const id of movesOf(L, S)) {
    const n = S.tray.filter((q) => L.kind[q] === L.kind[id]).length;
    const [c, i] = find(S, id);
    const v = n * 100 + i - c * 0.01;
    if (v > bv) (bv = v), (best = id);
  }
  return best;
}
/** 종류마다 가장 얕게 묻힌 깊이(위에 얹힌 장난감 수) */
function depths(L: Level, S: Sim) {
  const dep = new Array(NK + 2).fill(99);
  for (const col of S.cols)
    for (let i = col.length - 1; i >= 0; i--) {
      const k = L.kind[col[i]], dd = col.length - 1 - i;
      if (dd < dep[k]) dep[k] = dd;
    }
  return dep;
}
function value(L: Level, S: Sim) {
  const d = L.d;
  if (S.fail) return -1e7 + (L.N - S.left) * 1000;
  let v = (L.N - S.left) * 40;
  if (S.done) v += 1e5 + (S.peak <= d.P ? 4000 : 0) + (S.best >= d.C ? 4000 : 0);
  const n = S.tray.length;
  v -= n * 30 + Math.max(0, n - 4) ** 2 * 70;
  if (S.peak > d.P) v -= 1200 + 100 * (S.peak - d.P);
  v += Math.min(S.best, d.C) * 160 + (S.best >= d.C ? 1200 : 0) + Math.min(S.combo, d.C) * 50;
  const dep = depths(L, S), cnt = new Array(NK).fill(0);
  for (const q of S.tray) cnt[L.kind[q]]++;
  let ready = 0;
  for (let k = 0; k < NK; k++)
    if (cnt[k]) {
      v -= Math.min(dep[k], 12) * (cnt[k] === 2 ? 16 : 9);
      if (cnt[k] === 2 && dep[k] === 0) ready++;
    }
  if (S.best < d.C) v += Math.min(ready, d.C) * 45;
  if (d.goal && !S.done) v += S.mk[d.goal.kind] * 700 - (d.goal.kind === CROWN ? (S.open ? 0 : 400 + dep[KEY] * 25) + dep[CHEST] * 20 : dep[d.goal.kind] * 25);
  if (d.chest && !S.open) v -= dep[KEY] * 15;
  return v;
}
function search(L: Level, S: Sim, depth: number): number {
  if (S.fail || S.done || depth === 0) return value(L, S);
  const mv = movesOf(L, S);
  let best = -1e9;
  for (const m of mv) {
    const S2 = cloneSim(S);
    apply(L, S2, m);
    const v = search(L, S2, depth - 1);
    if (v > best) best = v;
  }
  return mv.length ? best : value(L, S);
}
/** 몇 수 앞까지 시뮬레이션해 가장 좋은 장난감 */
export function bestMove(L: Level, S0: Sim, depth = 3): number {
  const mv = movesOf(L, S0);
  if (mv.length <= 1) return mv.length ? mv[0] : -1;
  let best = -1e9, pick = mv[0];
  for (const m of mv) {
    const S2 = cloneSim(S0);
    apply(L, S2, m);
    const v = search(L, S2, depth - 1);
    if (v > best) (best = v), (pick = m);
  }
  return pick;
}
export function playout(L: Level, pick: (S: Sim) => number) {
  const S = newSim(L);
  for (let g = 0; g < 200 && !S.fail && !S.done; g++) apply(L, S, pick(S));
  return S;
}
/** 아무 장난감이나 꺼내는 사람이 이 판을 깰 확률 */
function randomPass(L: Level, r: Rng, n: number) {
  let ok = 0;
  for (let k = 0; k < n; k++) {
    const S = playout(L, (S) => {
      const mv = movesOf(L, S);
      return mv[Math.floor(r() * mv.length)];
    });
    if (S.done) ok++;
  }
  return ok / n;
}
const levelCache = new Map<string, Level>();
export function buildLevel(seed: number, stage: number): Level {
  const ck = `${seed}:${stage}`, hit = levelCache.get(ck);
  if (hit) return hit;
  const d = STAGES[stage], r = mulberry32((seed * 31 + stage * 7919 + 17) >>> 0);
  let pick: Level | null = null, bv = -1e9;
  const K = d.fixed ? 1 : 10;
  for (let c = 0; c < K; c++) {
    const L = genLevel(d, r);
    let v = 0;
    if (stage === 1) v = -Math.abs(randomPass(L, r, 24) - 0.75);
    else if (stage >= 2) {
      // 버릇대로 두면 별 셋이 안 나오고, 내다보고 두면 별 셋이 나오는 판 (무엇을 먼저 꺼낼지가 수가 되게)
      const H = playout(L, (S) => habitPick(L, S));
      const M = playout(L, (S) => bestMove(L, S, 3));
      v = (H.done && starsOf(d, H) < 3 ? 2.2 : !H.done ? 2 : 0) + (M.done ? (starsOf(d, M) === 3 ? 1.5 : 0.4) : 0) + randomPass(L, r, 8) * 0.3;
    }
    if (v > bv) (bv = v), (pick = L);
    if (stage >= 2 && bv >= 3.7 + 0.3 * 0.25) break;
  }
  if (levelCache.size > 400) levelCache.clear();
  levelCache.set(ck, pick!);
  return pick!;
}

// ───────────────────────────── 상태 ─────────────────────────────
/** t = 생긴 틱(나이 재기), d = 화면 시계(vt)로 터질 때, n = 연속 몇 번째 */
interface Ev { t: number; d: number; kind: string; x: number; y: number; text?: string; col?: string; n?: number }
/** 장난감 하나의 화면 위치: (fx,fy)→(tx,ty)로 t0부터 dur 동안. where 0 더미 · 1 기차 · 2 사라짐. style 0 보통 · 1 풍선 · 2 뿅 · 3 깜짝 · 4 물려 감 */
interface Vis { x: number; y: number; a: number; s: number; fx: number; fy: number; fa: number; fs: number; tx: number; ty: number; ta: number; ts: number; t0: number; dur: number; hop: number; where: number; style: number; wob: number; wv: number; gx: number; gy: number; gw: number; la: number; ld: number }
interface Sch { at: number; id: number; x: number; y: number; a: number; s: number; dur: number; hop: number; where: number; style: number }
export interface ToyState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'play' | 'settle' | 'result'; pt: number;
  L: Level; S: Sim;
  down: boolean; ax: number; ay: number; press: number; cool: number; lastTap: number; taps: number;
  hearts: number; stars: number; got: number; pts: number; ok: boolean; why: string; won: boolean; dead: boolean; tries: number;
  seen: Set<string>; tips: Set<string>; events: Ev[]; news: { text: string; t: number } | null; newsQ: string[]; startT: number; clearT: number;
  vis: Vis[]; sch: Sch[]; busy: number; dogRun: { t0: number; id: number; x0: number; x1: number; y1: number } | null;
  mood: string; moodT: number; catT: number; puffT: number; lastX: number;
  /** 화면 시계: 보통은 틱마다 1, '와!' 하는 순간엔 0.3씩(잠깐 느려짐). 연출 예약은 모두 이 시계로 */
  vt: number; slow: number; slowQ: { at: number; n: number }[]; quakes: { at: number; x: number; p: number }[];
  banner: { text: string; sub: string; at: number; n: number; col: string } | null;
}

const ev = (s: ToyState, kind: string, x: number, y: number, text?: string, col?: string, due?: number, n?: number) => s.events.push({ t: s.t, d: due ?? s.vt, kind, x, y, text, col, n });
const slowAt = (s: ToyState, at: number, n: number) => s.slowQ.push({ at, n });
function tip(s: ToyState, key: string, text: string) {
  if (s.tips.has(key) || s.newsQ.length) return;
  s.tips.add(key);
  s.newsQ.push(text);
}
function see(s: ToyState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  s.newsQ.push(text);
}
const setMood = (s: ToyState, m: string) => ((s.mood = m), (s.moodT = s.t));

// 화면 배치 (가로 0~1, 세로 0~A)
const BASE = 0.94, CW = 0.122, TRAY_Y = 1.098, TRAY_S = 0.7, FLOOR_Y = 0.8;
const colX = (L: Level, c: number) => 0.5 + (c - (L.W - 1) / 2) * CW;
const lvlY = (l: number) => BASE - DY * (l + 0.72);
const restA = (L: Level, id: number) => L.ja[id] * 0.42;
function pilePos(L: Level, c: number, l: number, id: number): [number, number] {
  return [colX(L, c) + L.jx[id] * 0.018 + (l % 2 ? 0.009 : -0.009) * (c % 2 ? 1 : -1), lvlY(l) + Math.abs(L.jx[id]) * 0.006];
}
const slotXY = (k: number): [number, number] => [0.2165 + k * 0.113, TRAY_Y];
function posOf(L: Level, S: Sim, id: number): [number, number] {
  const [c, i] = find(S, id);
  return c < 0 ? [0.5, 0.5] : pilePos(L, c, i, id);
}

function sched(s: ToyState, q: Sch) {
  const v = s.vis[q.id];
  // 같은 장난감의 움직임은 예약한 순서대로 (나중 예약이 먼저 불리지 않게)
  q.at = Math.max(q.at, v.la);
  v.la = q.at;
  s.sch.push(q);
  v.gx = q.x;
  v.gy = q.y;
  v.gw = q.where;
  s.busy = Math.max(s.busy, q.at + q.dur);
}
function fire(s: ToyState, q: Sch) {
  const v = s.vis[q.id];
  v.fx = v.x;
  v.fy = v.y;
  v.fa = v.a;
  v.fs = v.s;
  v.tx = q.x;
  v.ty = q.y;
  v.ta = q.a;
  v.ts = q.s;
  v.t0 = s.vt;
  v.ld = 0;
  v.dur = q.dur;
  v.hop = q.hop;
  v.where = q.where;
  v.style = q.style;
}

function newStage(s: ToyState) {
  const d = STAGES[s.stage];
  s.L = buildLevel(s.seed, s.stage);
  s.S = newSim(s.L);
  const L = s.L;
  s.vis = L.kind.map(() => ({ x: 0, y: 0, a: 0, s: 1, fx: 0, fy: 0, fa: 0, fs: 1, tx: 0, ty: 0, ta: 0, ts: 1, t0: -99, dur: 1, hop: 0, where: 0, style: 0, wob: 0, wv: 0, gx: 0, gy: 0, gw: 0, la: 0, ld: 1 }));
  s.sch = [];
  s.slowQ = [];
  s.quakes = [];
  s.banner = null;
  s.busy = s.vt;
  // 바구니에 와르르 쏟아지며 시작
  L.cols0.forEach((col, c) =>
    col.forEach((id, l) => {
      const [x, y] = pilePos(L, c, l, id), v = s.vis[id];
      v.x = v.tx = x + (c - (L.W - 1) / 2) * 0.03;
      v.y = v.ty = -0.15 - l * 0.09 - c * 0.02;
      v.a = v.ta = restA(L, id) + (c % 2 ? 1.5 : -1.5);
      sched(s, { at: s.vt + 2 + l * 3 + ((c * 5) % 7), id, x, y, a: restA(L, id), s: 1, dur: 20, hop: 0, where: 0, style: 0 });
    }),
  );
  s.dogRun = null;
  s.phase = 'play';
  s.pt = 0;
  s.press = -1;
  s.cool = s.t + 30;
  s.startT = s.t;
  s.got = 0;
  setMood(s, 'idle');
  // 새 장치가 있는 판은 소개 카드가 알림을 대신한다
  if (CARDS[d.key]) s.seen.add(d.key);
  else see(s, d.key, d.news);
  ev(s, 'stage', 0.5, 0.6, `${s.stage + 1}판 · ${d.name}`, '#fff6d6');
}

function finish(s: ToyState) {
  s.phase = 'result';
  s.pt = 0;
  const d = STAGES[s.stage], S = s.S;
  if (s.ok) {
    const st = starsOf(d, S);
    s.got = st;
    s.stars += st;
    s.pts += st * STAR_PTS + Math.max(0, 6 - S.peak) * 8 + Math.min(S.best, 6) * 6;
    s.clearT = s.t;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    ev(s, 'clear', 0.5, 0.6, `${d.emoji} ${d.name} 정리 끝! ${'★'.repeat(st)}${'☆'.repeat(3 - st)}`, '#fff1a8');
    setMood(s, 'cheer');
  } else {
    s.hearts--;
    s.tries++;
    ev(s, 'fail', 0.5, 0.6, s.why, '#ffd0c8');
    setMood(s, 'dizzy');
  }
}

/** 손가락 자리에서 가장 가까운 장난감 (맨 위 장난감을 조금 더 잘 잡게) */
function pickToy(s: ToyState, x: number, y: number) {
  const L = s.L, S = s.S;
  let best = -1, bd = HIT;
  S.cols.forEach((col, c) =>
    col.forEach((id, l) => {
      const [px, py] = pilePos(L, c, l, id);
      const dd = Math.hypot(px - x, (py - y) * 1.1) - (l === col.length - 1 ? 0.012 : 0);
      if (dd < bd) (bd = dd), (best = id);
    }),
  );
  return best;
}

/** 규칙 결과를 화면 연출(날아가는 장난감·와르르·뿅)로 옮긴다 */
function playRec(s: ToyState, rec: RE[], combo0: number) {
  const L = s.L;
  let tc = s.vt, land = s.vt, slides = 0, pops = 0, lastSlide = 0;
  // 직전 기차 모습(뿅 할 장난감 자리 찾기용) = 기차로 가기로 한 장난감들을 왼쪽부터
  let tray = s.vis.map((_, i) => i).filter((i) => s.vis[i].gw === 1);
  tray.sort((a, b) => s.vis[a].gx - s.vis[b].gx);
  for (const e of rec) {
    if (e.k === 'take') {
      const slot = e.tray.indexOf(e.id), [x1, y1] = slotXY(slot), bal = e.why === 'balloon';
      const dur = bal ? 34 : e.why === 'twin' ? 22 : 18;
      const [x0, y0] = [s.vis[e.id].gx, s.vis[e.id].gy];
      sched(s, { at: tc, id: e.id, x: x1, y: y1, a: 0, s: TRAY_S, dur, hop: bal ? 0.02 : 0.13, where: 1, style: bal ? 1 : 0 });
      e.tray.forEach((q, j) => q !== e.id && sched(s, { at: tc + dur - 8, id: q, x: slotXY(j)[0], y: TRAY_Y, a: 0, s: TRAY_S, dur: 8, hop: 0.015, where: 1, style: 0 }));
      if (e.why === 'twin') ev(s, 'twin', x0, y0, '🎀 쑥!', '#ffc4dc', tc);
      if (bal) ev(s, 'float', x0, y0, '🎈 둥실~', '#ffe0f0', tc);
      if (e.why === 'jack') ev(s, 'bonk', x0, y0, undefined, undefined, tc);
      land = Math.max(land, tc + dur);
      tray = e.tray;
      tc += e.why === 'tap' ? 3 : 7;
      continue;
    }
    if (e.k === 'pop') {
      const tp = land + 2;
      let cx = 0;
      for (const q of e.ids) cx += slotXY(Math.max(0, tray.indexOf(q)))[0] / 3;
      // 셋이 한가운데로 모여 부풀었다가 뿅
      for (const q of e.ids) sched(s, { at: tp, id: q, x: cx, y: TRAY_Y - 0.09, a: 0, s: 1.4, dur: 12, hop: 0.03, where: 2, style: 2 });
      pops++;
      const n = combo0 + pops, g = STAGES[s.stage].goal;
      ev(s, 'pop', cx, TRAY_Y - 0.08, e.kind === KEY ? '🔑 뿅!' : n >= 3 ? '뿅뿅뿅!!' : n === 2 ? '뿅뿅!' : '뿅!', '#fff3a8', tp + 12, n);
      if (g && g.kind === e.kind) {
        const done = s.S.mk[e.kind] - rec.filter((z) => z.k === 'pop' && z.kind === e.kind).length + rec.filter((z) => z.k === 'pop' && z.kind === e.kind).indexOf(e) + 1;
        ev(s, 'goal', cx, TRAY_Y - 0.2, `🎯 ${KIND[e.kind].emo} ${done >= g.n ? '다 모았다!' : `${done}/${g.n}`}`, '#bff7c4', tp + 16);
      }
      if (n >= 2) {
        s.banner = { text: n >= 3 ? `${n}연속 뿅!!` : '2연속 뿅!', sub: n >= 3 ? '대박! 기차가 신났어요' : '연달아 뿅 — 콤보!', at: tp + 12, n, col: n >= 3 ? '#ff9fd0' : '#ffe066' };
        slowAt(s, tp + 10, Math.min(32, 16 + (n - 2) * 7));
      }
      e.tray.forEach((q, j) => sched(s, { at: tp + 14, id: q, x: slotXY(j)[0], y: TRAY_Y, a: 0, s: TRAY_S, dur: 10, hop: 0.02, where: 1, style: 0 }));
      land = tp + 24;
      tray = e.tray;
      continue;
    }
    if (e.k === 'slide') {
      const [x1, y1] = pilePos(L, e.to, e.lvl, e.id), at = tc + 7 + slides * 5;
      sched(s, { at, id: e.id, x: x1, y: y1, a: restA(L, e.id) + (e.to < e.from ? -TAU : TAU), s: 1, dur: 16, hop: 0.05, where: 0, style: 0 });
      slides++;
      ev(s, 'slide', x1, y1, undefined, '#ffe6b8', at + 16, slides);
      s.quakes.push({ at: at + 16, x: x1, p: Math.min(1, 0.4 + slides * 0.15) });
      lastSlide = at + 16;
      continue;
    }
    if (e.k === 'drop') {
      const [x1, y1] = pilePos(L, e.col, e.lvl, e.id);
      sched(s, { at: tc + 8, id: e.id, x: x1, y: y1, a: restA(L, e.id), s: 1, dur: 10, hop: 0, where: 0, style: 0 });
      ev(s, 'thud', x1, y1, undefined, undefined, tc + 18);
      continue;
    }
    if (e.k === 'jack') {
      const v = s.vis[e.id];
      sched(s, { at: tc, id: e.id, x: v.gx, y: v.gy - 0.05, a: 0, s: 1.25, dur: 26, hop: 0.05, where: 2, style: 3 });
      ev(s, 'jack', v.gx, v.gy, '띠요옹~ 퉁!', '#f3d2ff', tc + 4);
      slowAt(s, tc + 3, 14);
      tc += 9;
      continue;
    }
    if (e.k === 'chest') {
      const v = s.vis[e.id];
      sched(s, { at: tc, id: e.id, x: v.gx, y: v.gy - 0.03, a: 0, s: 1.3, dur: 30, hop: 0.03, where: 2, style: 3 });
      ev(s, 'chest', v.gx, v.gy, '👑 보물이다!', '#fff1a8', tc + 10);
      s.banner = { text: '👑 보물 상자 열림!', sub: '반짝반짝 왕관 셋!', at: tc + 10, n: 3, col: '#ffe066' };
      slowAt(s, tc + 8, 28);
      tc += 12;
      continue;
    }
    if (e.k === 'unlock') {
      ev(s, 'unlock', 0.5, 0.55, '🔓 철컥! 보물 상자가 열렸어요', '#fff1a8', land + 6);
      continue;
    }
    if (e.k === 'dog') {
      const at = Math.max(tc, land) + 12, from = tray.indexOf(e.id), [x1, y1] = pilePos(L, e.col, e.lvl, e.id);
      s.dogRun = { t0: at, id: e.id, x0: slotXY(Math.max(0, from))[0], x1, y1 };
      sched(s, { at: at + 16, id: e.id, x: x1, y: y1, a: restA(L, e.id), s: 1, dur: 44, hop: 0.22, where: 0, style: 4 });
      e.tray.forEach((q, j) => sched(s, { at: at + 22, id: q, x: slotXY(j)[0], y: TRAY_Y, a: 0, s: TRAY_S, dur: 10, hop: 0.015, where: 1, style: 0 }));
      ev(s, 'dog', slotXY(Math.max(0, from))[0], TRAY_Y - 0.08, '멍! 냠~', '#ffe9c4', at + 14);
      ev(s, 'dogdrop', x1, y1, '툭!', '#ffe9c4', at + 60);
      tray = e.tray;
      see(s, 'dogrun', '🐶 뭉치가 기차 끝 장난감을 물고 더미로 — 한 칸 비었어요!');
    }
  }
  // 놓친 자리 맞추기: 더미에 남은 장난감이 제자리로 가도록
  s.S.cols.forEach((col, c) =>
    col.forEach((id, l) => {
      const v = s.vis[id], [x, y] = pilePos(L, c, l, id);
      if (v.gw !== 0 || Math.abs(v.gx - x) > 1e-6 || Math.abs(v.gy - y) > 1e-6) sched(s, { at: tc + 8, id, x, y, a: restA(L, id), s: 1, dur: 12, hop: 0.01, where: 0, style: 0 });
    }),
  );
  if (slides >= 2) {
    const last = [...rec].reverse().find((e) => e.k === 'slide');
    if (last && last.k === 'slide') {
      const [x1, y1] = pilePos(L, last.to, last.lvl, last.id);
      ev(s, 'crash', x1, y1, slides >= 4 ? `와르르르 ×${slides}!` : slides === 3 ? '와르르르!' : '와르르!', '#ffe6b8', lastSlide, slides);
    }
    // 크게 무너지면 잠깐 느리게
    if (slides >= 3) slowAt(s, lastSlide - 10, 10 + slides * 3);
  }
  if (slides >= 1) {
    see(s, 'slide', '⛰️ 와르르 — 낮아진 자리로 옆 더미가 굴러 내려와요');
    s.catT = s.vt + 7;
  }
  if (rec.some((e) => e.k === 'pop')) see(s, 'pop', '🎉 같은 장난감 셋이 모이면 뿅!');
}

function tapToy(s: ToyState, id: number) {
  const L = s.L, S = s.S, why = canTake(L, S, id);
  const [px, py] = posOf(L, S, id);
  s.lastX = px;
  if (why === 1) {
    ev(s, 'blocked', px, py, '위에 장난감이 있어요!', '#ffd0c8');
    setMood(s, 'huh');
    tip(s, 'blocked', '맨 위에 드러난 장난감만 꺼낼 수 있어요');
    return;
  }
  if (why === 2) {
    ev(s, 'locked', px, py, '🔒 열쇠 셋을 먼저!', '#ffd0c8');
    setMood(s, 'huh');
    return;
  }
  if (why === 3) return;
  const rec: RE[] = [], free0 = new Set(movesOf(L, S));
  // 꺼내는 순간 둘레 장난감이 흔들
  S.cols.forEach((col) => col.forEach((q) => {
    const v = s.vis[q], dd = Math.hypot(v.x - px, v.y - py);
    if (q !== id && dd < 0.22) v.wv += (v.x < px ? -1 : 1) * 0.035 * (1 - dd / 0.22);
  }));
  const combo0 = S.combo;
  apply(L, S, id, rec);
  s.cool = s.t + COOL;
  s.lastTap = s.t;
  s.taps++;
  playRec(s, rec, combo0);
  // 새로 드러난 장난감은 반짝
  const late = Math.min(s.busy, s.vt + 40);
  for (const q of movesOf(L, S)) if (!free0.has(q) && !rec.some((e) => e.k === 'slide' && e.id === q) && !rec.some((e) => e.k === 'dog' && e.id === q)) {
    const [x, y] = posOf(L, S, q);
    ev(s, 'reveal', x, y, undefined, '#fff6a8', late);
  }
  const slides = rec.filter((e) => e.k === 'slide').length;
  if (S.fail) {
    s.phase = 'settle';
    s.pt = 0;
    s.ok = false;
    s.why = S.fail === 1 ? '기차가 꽉 찼어요!' : '꺼낼 장난감이 없어요!';
    ev(s, 'jam', 0.5, TRAY_Y, '꽉!', '#ffb4a8', Math.min(s.busy, s.vt + 30));
  } else if (S.done) {
    s.phase = 'settle';
    s.pt = 0;
    s.ok = true;
    slowAt(s, s.busy - 12, 24);
  }
  if (S.tray.length >= 5 && !S.fail) (setMood(s, 'worry'), tip(s, 'full', '⚠️ 기차가 거의 찼어요 — 셋이 되는 걸 골라요!'));
  else if (rec.some((e) => e.k === 'pop')) setMood(s, 'smug');
  else if (slides >= 2 || rec.some((e) => e.k === 'jack' || e.k === 'dog')) setMood(s, 'wow');
  if (rec.some((e) => e.k === 'pop')) s.puffT = s.busy - 10;
  const C = STAGES[s.stage].C;
  if (S.combo >= C && combo0 < C && s.banner) s.banner.sub = `★ 연속 뿅 ${C} 별 달성!`;
}

function animate(s: ToyState) {
  if (s.sch.length) {
    s.sch.sort((a, b) => a.at - b.at);
    while (s.sch.length && s.sch[0].at <= s.vt) fire(s, s.sch.shift()!);
  }
  // 와르르 착지: 근처 장난감이 함께 들썩
  for (let i = s.quakes.length - 1; i >= 0; i--) {
    const q = s.quakes[i];
    if (q.at > s.vt) continue;
    s.quakes.splice(i, 1);
    for (const v of s.vis) if (v.where === 0 && Math.abs(v.x - q.x) < 0.3) v.wv += (v.x < q.x ? -1 : 1) * 0.05 * q.p * (1 - Math.abs(v.x - q.x) / 0.3);
  }
  for (const v of s.vis) {
    const u = s.vt - v.t0;
    if (u < v.dur) {
      const q = v.style === 1 ? (1 - Math.cos((Math.PI * u) / v.dur)) / 2 : ease(u / v.dur);
      v.x = v.fx + (v.tx - v.fx) * q;
      v.y = v.fy + (v.ty - v.fy) * q - v.hop * Math.sin(Math.PI * q);
      v.a = v.fa + (v.ta - v.fa) * q;
      v.s = v.fs + (v.ts - v.fs) * q;
    } else {
      (v.x = v.tx), (v.y = v.ty), (v.a = v.ta), (v.s = v.ts);
      if (!v.ld && v.where === 0) v.wv += 0.08 * (v.fx < v.tx ? 1 : -1);
      v.ld = 1;
    }
    v.wv += -0.16 * v.wob - 0.1 * v.wv;
    v.wob += v.wv;
  }
}

export const toypile: GameDef<ToyState> = {
  id: 'toypile',
  name: '장난감 더미 셋 맞추기',
  genes: ['triple', 'pointer', 'collect'],
  twist: '꺼낸 자리로 옆 더미 꼭대기가 데굴데굴 굴러 내려와 자리를 다시 잡는다(와르르 연쇄) — 높은 데서 빼면 바로 아래가 드러나고, 낮은 데서 빼면 굴러온 장난감이 그 자리를 덮는 대신 저 위 꼭대기 밑이 드러나서, 어디서 빼느냐가 다음 수를 바꾼다',
  rules: ['위에 드러난 장난감을 톡 → 기차 칸으로 쏙 (빈자리로 옆 더미가 와르르).', '같은 장난감 셋이 모이면 뿅! 기차 7칸이 꽉 차면 실패.'],
  controls: 'touch',
  hint: '장난감을 톡! 누르고 있으면 와르르·드러날 것이 보여요 / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '장난감 바구니 방 디오라마',
    mood: '햇살 드는 아이 방 바닥의 등나무 바구니 — 곰 인형·고무 오리·로봇·비치볼·블록·자동차가 와르르 쌓여 있고, 그 앞 레일 위 장난감 기차 7칸에 기관사 강아지 뭉치가 타 있다. 방은 판마다 바뀌고(아기방·놀이방·거실·다락방·해적방·파티방·현관·꿈나라), 창가 고양이가 구경한다.',
    palette: { bg: '#2f2638', ink: '#fff8ec', muted: '#d8c3e0', accent: '#ffc65c', hot: '#ff5a6a', soft: '#f3e2f0' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'play', pt: 0,
      down: false, ax: 0, ay: 0, press: -1, cool: 0, lastTap: -99, taps: 0,
      hearts: 3, stars: 0, got: 0, pts: 0, ok: false, why: '', won: false, dead: false, tries: 0,
      seen: new Set<string>(), tips: new Set<string>(), events: [], news: null, newsQ: [], startT: 0, clearT: 0,
      vis: [], sch: [], busy: 0, dogRun: null, mood: 'idle', moodT: 0, catT: -99, puffT: -99, lastX: 0.5,
      vt: 0, slow: 0, slowQ: [], quakes: [], banner: null,
    } as unknown as ToyState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    const p = inp.pointer ?? null, release = !p && s.down;
    if (p) (s.ax = p.x), (s.ay = p.y);
    s.down = !!p;
    s.t++;
    s.pt++;
    if (s.newsQ.length && (!s.news || s.t - s.news.t > NEWS_T)) s.news = { text: s.newsQ.shift()!, t: s.t };
    if (s.events.length > 60 || (s.events.length && s.t - s.events[0].t > 240)) s.events = s.events.filter((e) => s.t - e.t < 240);
    for (let i = s.slowQ.length - 1; i >= 0; i--) if (s.slowQ[i].at <= s.vt) (s.slow = Math.max(s.slow, s.slowQ[i].n)), s.slowQ.splice(i, 1);
    s.vt += s.slow > 0 ? 0.3 : 1;
    if (s.slow > 0) s.slow--;
    animate(s);
    if (s.dogRun && s.vt > s.dogRun.t0 + 110) s.dogRun = null;
    if (s.mood !== 'idle' && s.t - s.moodT > (s.mood === 'dizzy' || s.mood === 'cheer' ? 400 : 80)) s.mood = s.S.tray.length >= 5 && s.phase === 'play' ? 'worry' : 'idle';
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
      if (s.vt >= s.busy + 14 && s.pt >= 30) finish(s);
      return;
    }
    if (p) s.press = pickToy(s, p.x, p.y * A);
    if (!release) return;
    const k = s.press;
    s.press = -1;
    if (k < 0) {
      const y = s.ay * A;
      if (y > 0.2 && y < 1.0) ev(s, 'miss', s.ax, y, '장난감을 톡!', '#fff3df');
      return;
    }
    if (s.t < s.cool) return;
    tapToy(s, k);
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
const at = (s: ToyState, id: number): Input => {
  const [x, y] = posOf(s.L, s.S, id);
  return { tap: false, dir: 0, pointer: { x, y: y / A } };
};
const ready = (s: ToyState) => s.phase === 'play' && !s.down && s.t >= s.cool && s.t - s.lastTap >= 26 && s.t - s.startT >= 40;
const brain = new WeakMap<object, { key: string; m: number }>();
export const planMove = (s: ToyState) => bestMove(s.L, s.S, 3);
/** 봇: 세 수 앞까지(와르르·풍선·뭉치까지) 시뮬레이션해 꺼낼 장난감을 고른다. 사람처럼 한 번 꺼내고 조금 지켜본다 */
export const toypileSmart: Bot<ToyState> = {
  name: '정리 대장',
  act(s) {
    if (!ready(s)) return NO;
    const key = `${s.stage}:${s.tries}:${s.S.taps}`;
    let m = brain.get(s);
    if (!m || m.key !== key) brain.set(s, (m = { key, m: planMove(s) }));
    return m.m >= 0 ? at(s, m.m) : NO;
  },
};
/** 버릇 봇(측정용): 기차에 이미 있는 것과 같은 장난감부터, 없으면 맨 위(가장 높은 줄) */
export const toypileHabit: Bot<ToyState> = {
  name: '버릇: 같은 것부터, 없으면 맨 위',
  act(s) {
    if (!ready(s)) return NO;
    const m = habitPick(s.L, s.S);
    return m >= 0 ? at(s, m) : NO;
  },
};

const dumbAt = new WeakMap<object, { next: number; until: number; p: { x: number; y: number } }>();
/** 봇: 아무 때나 보이는 장난감 아무거나 톡 (가끔 화면 아무 데나) */
export const toypileRandom: Bot<ToyState> = {
  name: '아무 장난감이나 톡',
  act(s, rng) {
    let m = dumbAt.get(s);
    if (!m) dumbAt.set(s, (m = { next: 20 + Math.floor(rng() * 60), until: -1, p: { x: 0, y: 0 } }));
    if (s.t < m.until) return { tap: false, dir: 0, pointer: m.p };
    if (s.t < m.next) return NO;
    m.next = s.t + 30 + Math.floor(rng() * 110);
    m.until = s.t + 2 + Math.floor(rng() * 4);
    const L = s.L, list: number[] = [];
    for (const col of s.S.cols) list.push(...col);
    if (rng() < 0.2 || !list.length) m.p = { x: rng(), y: rng() };
    else {
      const [x, y] = posOf(L, s.S, list[Math.floor(rng() * list.length)]);
      m.p = { x: x + (rng() - 0.5) * 0.02, y: (y + (rng() - 0.5) * 0.02) / A };
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
const ease = (q: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, q)), 2.2);

type Fn = (v: number) => number;

// ───────── 방 ─────────
interface Room { wall: string; wall2: string; pat: number; sky: [string, string]; floor: string; floor2: string; rug: string; rug2: string; flag: string[]; night?: boolean }
const ROOMS: Room[] = [
  { wall: '#d4f0e8', wall2: '#a8d9cc', pat: 0, sky: ['#8fd0ff', '#dff3ff'], floor: '#e6c49a', floor2: '#c99f72', rug: '#f6a5bf', rug2: '#ffd3e0', flag: ['#ffb3c7', '#bfe9f6', '#fff1a8'] },
  { wall: '#ffeaa6', wall2: '#f2c862', pat: 1, sky: ['#7cc8ff', '#d6f0ff'], floor: '#d7ad80', floor2: '#b88a5c', rug: '#6cc3e0', rug2: '#bfe9f6', flag: ['#ef4b4b', '#3b82f6', '#2fb86a'] },
  { wall: '#f4dcc6', wall2: '#ddb593', pat: 2, sky: ['#9ad4ff', '#fff0c8'], floor: '#b98559', floor2: '#946440', rug: '#c9574f', rug2: '#e9a090', flag: ['#ffd166', '#ef8354', '#7ec4cf'] },
  { wall: '#d9b88f', wall2: '#ad8357', pat: 3, sky: ['#ff9e6b', '#ffe0a8'], floor: '#9a6b44', floor2: '#7a5232', rug: '#6f9a55', rug2: '#a8cf8a', flag: ['#ffc4dc', '#fff1a8', '#c4b5ff'] },
  { wall: '#bfdcf2', wall2: '#86b0d8', pat: 4, sky: ['#5ab4ec', '#bfe8ff'], floor: '#a77c52', floor2: '#83603e', rug: '#2f6c9c', rug2: '#6ea7d6', flag: ['#2a2a2a', '#ef4b4b', '#f4f4f4'] },
  { wall: '#fbd0ea', wall2: '#eba0cf', pat: 5, sky: ['#86ccff', '#e6f6ff'], floor: '#d6ae86', floor2: '#b88d63', rug: '#ffcf3a', rug2: '#ffe999', flag: ['#ff5a8a', '#ffd23a', '#5ad1ff', '#7be07b'] },
  { wall: '#d3e6b8', wall2: '#a3c585', pat: 6, sky: ['#86ccff', '#eaffd8'], floor: '#b38a60', floor2: '#906a45', rug: '#e07a5f', rug2: '#f6b39f', flag: ['#ffffff', '#e07a5f', '#ffd166'] },
  { wall: '#3e4382', wall2: '#262a5c', pat: 7, sky: ['#141842', '#36407e'], floor: '#5c4c7c', floor2: '#3f3360', rug: '#8c74d6', rug2: '#b9a8f0', flag: ['#fff1a8', '#c4b5ff', '#ffc4dc'], night: true },
];

function star5(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot = 0) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = rot - Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

function drawRoom(ctx: CanvasRenderingContext2D, s: ToyState, X: Fn, Y: Fn, R: Fn, w: number, h: number) {
  const rm = ROOMS[STAGES[s.stage].room], t = s.t, fy = Y(FLOOR_Y);
  const g = ctx.createLinearGradient(0, 0, 0, fy);
  g.addColorStop(0, rm.wall);
  g.addColorStop(1, rm.wall2);
  ctx.fillStyle = g;
  ctx.fillRect(-10, -10, w + 20, fy + 10);
  // 벽지 무늬
  ctx.save();
  ctx.globalAlpha = rm.night ? 0.8 : 0.28;
  for (let k = 0; k < 26; k++) {
    const x = X(hsh(k + 11)), y = Y(0.07 + hsh(k + 51) * (FLOOR_Y - 0.1));
    if (rm.pat === 0) {
      ctx.fillStyle = '#ffffff';
      if (k > 10) continue;
      for (let j = 0; j < 3; j++) (ctx.beginPath(), ctx.arc(x + j * R(0.022), y - (j === 1 ? R(0.012) : 0), R(0.02), 0, TAU), ctx.fill());
    } else if (rm.pat === 1) {
      ctx.fillStyle = k % 2 ? '#ffffff' : '#ff9f43';
      star5(ctx, x, y, R(0.016), k);
      ctx.fill();
    } else if (rm.pat === 5) {
      ctx.fillStyle = rm.flag[k % rm.flag.length];
      ctx.beginPath();
      ctx.arc(x, y, R(0.012), 0, TAU);
      ctx.fill();
    } else if (rm.pat === 7) {
      ctx.fillStyle = '#fff6c8';
      ctx.globalAlpha = 0.35 + 0.5 * Math.abs(Math.sin(t / 40 + k));
      star5(ctx, x, y, R(0.008 + (k % 3) * 0.003), k);
      ctx.fill();
    }
  }
  ctx.strokeStyle = rm.pat === 4 ? '#ffffff' : 'rgba(0,0,0,.5)';
  ctx.lineWidth = 2;
  if (rm.pat === 2) for (let x = 0; x < 1; x += 0.07) (ctx.fillStyle = 'rgba(255,255,255,.55)'), ctx.fillRect(X(x), 0, R(0.03), fy);
  if (rm.pat === 3) {
    ctx.globalAlpha = 0.22;
    for (let y = 0.1; y < FLOOR_Y; y += 0.075) (ctx.beginPath(), ctx.moveTo(0, Y(y)), ctx.lineTo(w, Y(y)), ctx.stroke());
    ctx.lineWidth = R(0.03);
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = '#6b4526';
    ctx.beginPath();
    ctx.moveTo(0, Y(0.3));
    ctx.lineTo(X(0.35), Y(0.07));
    ctx.stroke();
  }
  if (rm.pat === 4) {
    ctx.globalAlpha = 0.4;
    for (let y = 0.12; y < FLOOR_Y; y += 0.09) {
      ctx.beginPath();
      for (let x = 0; x <= 1.01; x += 0.02) ctx.lineTo(X(x), Y(y + 0.008 * Math.sin(x * 25 + y * 9)));
      ctx.stroke();
    }
  }
  if (rm.pat === 6) {
    ctx.globalAlpha = 0.18;
    ctx.lineWidth = 1;
    for (let r = 0; r * 0.045 < FLOOR_Y; r++) {
      const y = Y(r * 0.045);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
      for (let x = (r % 2) * 0.05; x < 1; x += 0.1) (ctx.beginPath(), ctx.moveTo(X(x), y), ctx.lineTo(X(x), y + R(0.045)), ctx.stroke());
    }
  }
  ctx.restore();
  // 깃발 줄
  ctx.strokeStyle = 'rgba(80,60,40,.6)';
  ctx.lineWidth = 1.2;
  const gy = (x: number) => 0.13 + 0.05 * Math.sin(Math.PI * (x / 0.62));
  ctx.beginPath();
  for (let x = 0; x <= 0.62; x += 0.02) ctx.lineTo(X(x), Y(gy(x)));
  ctx.stroke();
  for (let k = 0; k < 7; k++) {
    const x = 0.04 + k * 0.085, y = gy(x), sw = Math.sin(t / 30 + k) * 0.004;
    ctx.fillStyle = rm.flag[k % rm.flag.length];
    ctx.beginPath();
    ctx.moveTo(X(x - 0.025), Y(y));
    ctx.lineTo(X(x + 0.025), Y(gy(x + 0.025)));
    ctx.lineTo(X(x + sw), Y(y + 0.05));
    ctx.closePath();
    ctx.fill();
  }
  // 창문
  const wx0 = 0.665, wy0 = 0.095, ww = 0.285, wh = 0.2;
  ctx.fillStyle = 'rgba(0,0,0,.15)';
  ctx.fillRect(X(wx0) + 3, Y(wy0) + 4, R(ww), R(wh));
  const sk = ctx.createLinearGradient(0, Y(wy0), 0, Y(wy0 + wh));
  sk.addColorStop(0, rm.sky[0]);
  sk.addColorStop(1, rm.sky[1]);
  ctx.fillStyle = sk;
  ctx.fillRect(X(wx0), Y(wy0), R(ww), R(wh));
  ctx.save();
  ctx.beginPath();
  ctx.rect(X(wx0), Y(wy0), R(ww), R(wh));
  ctx.clip();
  if (rm.night) {
    ctx.fillStyle = '#fff6c8';
    ctx.beginPath();
    ctx.arc(X(wx0 + 0.07), Y(wy0 + 0.06), R(0.032), 0, TAU);
    ctx.fill();
    ctx.fillStyle = rm.sky[0];
    ctx.beginPath();
    ctx.arc(X(wx0 + 0.085), Y(wy0 + 0.05), R(0.028), 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    for (let k = 0; k < 8; k++) ctx.fillRect(X(wx0 + hsh(k + 3) * ww), Y(wy0 + hsh(k + 7) * wh), 1.5, 1.5);
  } else {
    ctx.fillStyle = rm.pat === 3 ? '#ffcf6b' : '#fff3a0';
    ctx.beginPath();
    ctx.arc(X(wx0 + 0.21), Y(wy0 + 0.055), R(0.03), 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    const cx = wx0 - 0.08 + (((t * 0.0003) % (ww + 0.16)) + ww + 0.16) % (ww + 0.16);
    for (let j = 0; j < 3; j++) (ctx.beginPath(), ctx.arc(X(cx + j * 0.025), Y(wy0 + 0.1 - (j === 1 ? 0.012 : 0)), R(0.02), 0, TAU), ctx.fill());
    // 먼 언덕
    ctx.fillStyle = rm.pat === 4 ? '#3f8fd0' : '#8fd38a';
    ctx.beginPath();
    ctx.moveTo(X(wx0), Y(wy0 + wh));
    for (let x = 0; x <= ww + 0.01; x += 0.02) ctx.lineTo(X(wx0 + x), Y(wy0 + wh - 0.04 - 0.02 * Math.sin(x * 14)));
    ctx.lineTo(X(wx0 + ww), Y(wy0 + wh));
    ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = '#fffaf0';
  ctx.lineWidth = R(0.012);
  ctx.strokeRect(X(wx0), Y(wy0), R(ww), R(wh));
  ctx.lineWidth = R(0.007);
  ctx.beginPath();
  ctx.moveTo(X(wx0 + ww / 2), Y(wy0));
  ctx.lineTo(X(wx0 + ww / 2), Y(wy0 + wh));
  ctx.moveTo(X(wx0), Y(wy0 + wh * 0.48));
  ctx.lineTo(X(wx0 + ww), Y(wy0 + wh * 0.48));
  ctx.stroke();
  // 창턱 (3/4 윗면)
  ctx.fillStyle = '#f3e6d0';
  ctx.beginPath();
  ctx.moveTo(X(wx0 - 0.02), Y(wy0 + wh));
  ctx.lineTo(X(wx0 + ww + 0.02), Y(wy0 + wh));
  ctx.lineTo(X(wx0 + ww + 0.035), Y(wy0 + wh + 0.022));
  ctx.lineTo(X(wx0 - 0.035), Y(wy0 + wh + 0.022));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#cdb898';
  ctx.fillRect(X(wx0 - 0.035), Y(wy0 + wh + 0.022), R(ww + 0.07), R(0.012));
  // 창으로 드는 빛
  if (!rm.night) {
    const lg = ctx.createLinearGradient(X(0.8), Y(0.3), X(0.45), Y(1.0));
    lg.addColorStop(0, 'rgba(255,250,220,.22)');
    lg.addColorStop(1, 'rgba(255,250,220,0)');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.moveTo(X(wx0), Y(wy0 + wh));
    ctx.lineTo(X(wx0 + ww), Y(wy0 + wh));
    ctx.lineTo(X(0.75), Y(1.02));
    ctx.lineTo(X(0.2), Y(1.02));
    ctx.closePath();
    ctx.fill();
  }
  // 걸레받이 + 바닥
  const fg = ctx.createLinearGradient(0, fy, 0, h);
  fg.addColorStop(0, rm.floor2);
  fg.addColorStop(0.25, rm.floor);
  fg.addColorStop(1, mix(rm.floor2, '#000000', 0.15));
  ctx.fillStyle = fg;
  ctx.fillRect(-10, fy, w + 20, h - fy + 10);
  ctx.strokeStyle = 'rgba(60,30,10,.18)';
  ctx.lineWidth = 1;
  for (let k = 1; k < 9; k++) {
    const y = FLOOR_Y + 0.012 * k * k;
    if (y > A) break;
    ctx.beginPath();
    ctx.moveTo(0, Y(y));
    ctx.lineTo(w, Y(y));
    ctx.stroke();
  }
  ctx.fillStyle = mix(rm.wall2, '#000000', 0.3);
  ctx.fillRect(-10, fy - R(0.02), w + 20, R(0.02));
  ctx.fillStyle = 'rgba(255,255,255,.2)';
  ctx.fillRect(-10, fy - R(0.02), w + 20, R(0.004));
  // 깔개
  ctx.fillStyle = 'rgba(0,0,0,.12)';
  ctx.beginPath();
  ctx.ellipse(X(0.5), Y(BASE + 0.035), R(0.5), R(0.075), 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = rm.rug;
  ctx.beginPath();
  ctx.ellipse(X(0.5), Y(BASE + 0.025), R(0.48), R(0.07), 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = rm.rug2;
  ctx.lineWidth = R(0.008);
  ctx.setLineDash([R(0.015), R(0.012)]);
  ctx.beginPath();
  ctx.ellipse(X(0.5), Y(BASE + 0.025), R(0.43), R(0.055), 0, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);
}

// ───────── 바구니 ─────────
function drawBasket(ctx: CanvasRenderingContext2D, L: Level, X: Fn, Y: Fn, R: Fn, front: boolean) {
  const x0 = colX(L, 0) - CW * 0.75, x1 = colX(L, L.W - 1) + CW * 0.75;
  if (!front) {
    // 뒷벽 안쪽 (더미 뒤)
    const top = BASE - 0.26;
    const g = ctx.createLinearGradient(0, Y(top), 0, Y(BASE));
    g.addColorStop(0, '#b77f43');
    g.addColorStop(1, '#5e3a1c');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(X(x0 + 0.025), Y(top), R(x1 - x0 - 0.05), R(BASE - top + 0.01), R(0.03));
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = 'rgba(40,20,5,.35)';
    ctx.lineWidth = 1;
    for (let y = top + 0.02; y < BASE; y += 0.024) (ctx.beginPath(), ctx.moveTo(X(x0), Y(y)), ctx.lineTo(X(x1), Y(y)), ctx.stroke());
    for (let x = x0 + 0.04; x < x1; x += 0.05) (ctx.beginPath(), ctx.moveTo(X(x), Y(top)), ctx.lineTo(X(x), Y(BASE)), ctx.stroke());
    ctx.restore();
    ctx.fillStyle = '#d9a35f';
    ctx.beginPath();
    ctx.roundRect(X(x0 + 0.02), Y(top - 0.012), R(x1 - x0 - 0.04), R(0.024), R(0.012));
    ctx.fill();
    return;
  }
  const top = BASE - 0.022, bot = BASE + 0.064;
  ctx.fillStyle = 'rgba(40,20,5,.3)';
  ctx.beginPath();
  ctx.ellipse(X((x0 + x1) / 2), Y(bot + 0.004), R((x1 - x0) / 2 + 0.01), R(0.016), 0, 0, TAU);
  ctx.fill();
  const g = ctx.createLinearGradient(0, Y(top), 0, Y(bot));
  g.addColorStop(0, '#e2ad68');
  g.addColorStop(1, '#a8703a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(X(x0 - 0.012), Y(top));
  ctx.lineTo(X(x1 + 0.012), Y(top));
  ctx.lineTo(X(x1 - 0.004), Y(bot - 0.012));
  ctx.quadraticCurveTo(X(x1 - 0.008), Y(bot), X(x1 - 0.03), Y(bot));
  ctx.lineTo(X(x0 + 0.03), Y(bot));
  ctx.quadraticCurveTo(X(x0 + 0.008), Y(bot), X(x0 + 0.004), Y(bot - 0.012));
  ctx.closePath();
  ctx.fill();
  // 바구니 결 (엇갈려 짠 띠)
  ctx.save();
  ctx.clip();
  for (let r = 0; r < 5; r++) {
    const y = top + 0.008 + r * 0.021;
    for (let k = 0; k < 40; k++) {
      const x = x0 - 0.02 + k * 0.035 + (r % 2) * 0.0175;
      if (x > x1 + 0.02) break;
      ctx.fillStyle = (k + r) % 2 ? 'rgba(255,230,180,.35)' : 'rgba(90,50,15,.25)';
      ctx.beginPath();
      ctx.ellipse(X(x), Y(y + 0.01), R(0.016), R(0.008), 0, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
  // 테두리
  const rg = ctx.createLinearGradient(0, Y(top - 0.016), 0, Y(top + 0.016));
  rg.addColorStop(0, '#f6cf8e');
  rg.addColorStop(1, '#b77f43');
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.roundRect(X(x0 - 0.02), Y(top - 0.014), R(x1 - x0 + 0.04), R(0.028), R(0.014));
  ctx.fill();
  ctx.strokeStyle = 'rgba(90,50,15,.45)';
  ctx.lineWidth = 1;
  for (let x = x0 - 0.01; x < x1 + 0.02; x += 0.022) (ctx.beginPath(), ctx.moveTo(X(x), Y(top - 0.013)), ctx.lineTo(X(x + 0.012), Y(top + 0.013)), ctx.stroke());
}

// ───────── 장난감 ─────────
interface TO { bal?: boolean; twin?: boolean; open?: boolean; hot?: boolean; pop?: number }
/** 장난감 하나 (가운데 x,y · 지름쯤 u · 각 a · dim 0~1 어둡게) */
function drawToy(ctx: CanvasRenderingContext2D, k: number, x: number, y: number, u: number, a: number, dim: number, t: number, o: TO = {}) {
  const C = (c: string) => (dim > 0 ? mix(c, '#2c2236', dim) : c);
  const ol = (c: string) => C(mix(c, '#000000', 0.5));
  const lw = Math.max(1, u * 0.028);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  // 바닥 그림자(겹친 장난감 사이 깊이)
  ctx.fillStyle = `rgba(30,15,20,${0.22 + dim * 0.15})`;
  ctx.beginPath();
  ctx.ellipse(u * 0.05, u * 0.36, u * 0.36, u * 0.12, 0, 0, TAU);
  ctx.fill();
  const shade = (c: string, cx: number, cy: number, r: number) => {
    const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r * 1.1);
    g.addColorStop(0, C(mix(c, '#ffffff', 0.35)));
    g.addColorStop(0.55, C(c));
    g.addColorStop(1, C(mix(c, '#000000', 0.3)));
    return g;
  };
  const ell = (cx: number, cy: number, rx: number, ry: number, fill: string | CanvasGradient, stroke?: string, rot = 0) => {
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, rot, 0, TAU);
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) (ctx.strokeStyle = stroke), ctx.stroke();
  };
  const eye = (cx: number, cy: number, r: number) => {
    ell(cx, cy, r, r * 1.1, C('#2a1a20'));
    ell(cx - r * 0.3, cy - r * 0.35, r * 0.35, r * 0.35, C('#ffffff'));
  };
  if (k === BEAR) {
    const c = '#c98648';
    for (const sx of [-1, 1]) ell(sx * u * 0.16, u * 0.36, u * 0.11, u * 0.08, shade(c, sx * u * 0.16, u * 0.36, u * 0.11), ol(c));
    ell(0, u * 0.17, u * 0.29, u * 0.25, shade(c, 0, u * 0.17, u * 0.29), ol(c));
    for (const sx of [-1, 1]) ell(sx * u * 0.28, u * 0.12, u * 0.08, u * 0.12, shade(c, sx * u * 0.28, u * 0.1, u * 0.1), ol(c), sx * 0.4);
    ell(0, u * 0.21, u * 0.15, u * 0.13, C('#f2d1a6'));
    for (const sx of [-1, 1]) (ell(sx * u * 0.19, -u * 0.34, u * 0.09, u * 0.09, shade(c, sx * u * 0.19, -u * 0.34, u * 0.09), ol(c)), ell(sx * u * 0.19, -u * 0.34, u * 0.045, u * 0.045, C('#f0b49a')));
    ell(0, -u * 0.13, u * 0.25, u * 0.22, shade(c, 0, -u * 0.13, u * 0.25), ol(c));
    ell(0, -u * 0.06, u * 0.11, u * 0.08, C('#f6dcb6'));
    ell(0, -u * 0.09, u * 0.045, u * 0.03, C('#3a2216'));
    eye(-u * 0.09, -u * 0.17, u * 0.03);
    eye(u * 0.09, -u * 0.17, u * 0.03);
    ctx.fillStyle = C('#e2414f');
    ctx.beginPath();
    ctx.moveTo(0, u * 0.06);
    ctx.lineTo(-u * 0.12, u * 0.0);
    ctx.lineTo(-u * 0.12, u * 0.12);
    ctx.closePath();
    ctx.moveTo(0, u * 0.06);
    ctx.lineTo(u * 0.12, u * 0.0);
    ctx.lineTo(u * 0.12, u * 0.12);
    ctx.closePath();
    ctx.fill();
    ell(0, u * 0.06, u * 0.035, u * 0.035, C('#c22f3c'));
  } else if (k === DUCK) {
    const c = '#ffd23a';
    ctx.fillStyle = shade(c, u * 0.3, -u * 0.05, u * 0.12);
    ctx.beginPath();
    ctx.moveTo(u * 0.22, u * 0.0);
    ctx.lineTo(u * 0.44, -u * 0.12);
    ctx.lineTo(u * 0.36, u * 0.14);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = ol(c);
    ctx.stroke();
    ell(u * 0.04, u * 0.14, u * 0.36, u * 0.24, shade(c, u * 0.04, u * 0.14, u * 0.36), ol(c));
    ell(u * 0.1, u * 0.1, u * 0.16, u * 0.1, C('#f5b82a'), undefined, -0.3);
    ell(-u * 0.14, -u * 0.15, u * 0.21, u * 0.2, shade(c, -u * 0.14, -u * 0.15, u * 0.21), ol(c));
    ell(-u * 0.37, -u * 0.1, u * 0.12, u * 0.055, C('#ff8a2b'), ol('#ff8a2b'));
    eye(-u * 0.19, -u * 0.2, u * 0.035);
    ell(-u * 0.07, -u * 0.08, u * 0.04, u * 0.025, C('#ffa0a0'));
  } else if (k === BALL) {
    const r = u * 0.37, cols = ['#ef4b4b', '#ffffff', '#3b82f6', '#ffffff', '#ffd23a', '#ffffff'];
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.clip();
    for (let j = 0; j < 6; j++) {
      ctx.fillStyle = C(cols[j]);
      ctx.beginPath();
      ctx.moveTo(-r * 0.2, -r * 0.25);
      ctx.arc(-r * 0.2, -r * 0.25, r * 2, (j * TAU) / 6, ((j + 1) * TAU) / 6);
      ctx.closePath();
      ctx.fill();
    }
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.05);
    g.addColorStop(0, 'rgba(255,255,255,.35)');
    g.addColorStop(0.6, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(0,0,0,.3)');
    ctx.fillStyle = g;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.restore();
    ctx.strokeStyle = ol('#aa3030');
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.stroke();
    ell(-r * 0.2, -r * 0.25, r * 0.15, r * 0.15, C('#ffffff'), ol('#999999'));
  } else if (k === CAR) {
    const c = '#3b82f6';
    ctx.fillStyle = shade(c, 0, -u * 0.15, u * 0.25);
    ctx.beginPath();
    ctx.roundRect(-u * 0.24, -u * 0.3, u * 0.46, u * 0.27, u * 0.1);
    ctx.fill();
    ctx.strokeStyle = ol(c);
    ctx.stroke();
    ctx.fillStyle = C('#cfeaff');
    ctx.beginPath();
    ctx.roundRect(-u * 0.19, -u * 0.25, u * 0.17, u * 0.15, u * 0.04);
    ctx.roundRect(u * 0.02, -u * 0.25, u * 0.15, u * 0.15, u * 0.04);
    ctx.fill();
    ctx.fillStyle = shade(c, 0, u * 0.05, u * 0.4);
    ctx.beginPath();
    ctx.roundRect(-u * 0.43, -u * 0.07, u * 0.86, u * 0.27, u * 0.1);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = C('#fff3a0');
    ctx.beginPath();
    ctx.arc(-u * 0.38, u * 0.02, u * 0.04, 0, TAU);
    ctx.fill();
    ctx.fillStyle = C('#ef4b4b');
    ctx.fillRect(u * 0.36, -u * 0.01, u * 0.05, u * 0.06);
    for (const sx of [-1, 1]) (ell(sx * u * 0.24, u * 0.21, u * 0.11, u * 0.11, C('#2a2a35')), ell(sx * u * 0.24, u * 0.21, u * 0.05, u * 0.05, C('#c9ced6')));
  } else if (k === BLOCK) {
    const c = '#ff9f43';
    ctx.fillStyle = C(mix(c, '#000000', 0.3));
    ctx.beginPath();
    ctx.moveTo(u * 0.27, -u * 0.25);
    ctx.lineTo(u * 0.39, -u * 0.35);
    ctx.lineTo(u * 0.39, u * 0.24);
    ctx.lineTo(u * 0.27, u * 0.34);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = C(mix(c, '#ffffff', 0.35));
    ctx.beginPath();
    ctx.moveTo(-u * 0.31, -u * 0.25);
    ctx.lineTo(-u * 0.19, -u * 0.35);
    ctx.lineTo(u * 0.39, -u * 0.35);
    ctx.lineTo(u * 0.27, -u * 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = shade(c, -u * 0.02, u * 0.04, u * 0.35);
    ctx.fillRect(-u * 0.31, -u * 0.25, u * 0.58, u * 0.59);
    ctx.strokeRect(-u * 0.31, -u * 0.25, u * 0.58, u * 0.59);
    ctx.strokeStyle = C('#fff3d6');
    ctx.lineWidth = lw * 1.4;
    ctx.strokeRect(-u * 0.25, -u * 0.19, u * 0.46, u * 0.47);
    ctx.fillStyle = C('#3a6fd6');
    ctx.font = `900 ${u * 0.36}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('가', -u * 0.02, u * 0.06);
  } else if (k === ROBOT) {
    const c = '#a9bccd';
    ctx.strokeStyle = C('#5a6b7a');
    ctx.beginPath();
    ctx.moveTo(0, -u * 0.34);
    ctx.lineTo(0, -u * 0.44);
    ctx.stroke();
    ell(0, -u * 0.45, u * 0.05, u * 0.05, C('#ff5a5a'));
    for (const sx of [-1, 1]) {
      ctx.fillStyle = shade(c, sx * u * 0.33, u * 0.1, u * 0.08);
      ctx.beginPath();
      ctx.roundRect(sx > 0 ? u * 0.27 : -u * 0.37, -u * 0.0, u * 0.1, u * 0.24, u * 0.04);
      ctx.fill();
    }
    ctx.fillStyle = shade(c, 0, u * 0.14, u * 0.32);
    ctx.beginPath();
    ctx.roundRect(-u * 0.27, -u * 0.04, u * 0.54, u * 0.4, u * 0.07);
    ctx.fill();
    ctx.strokeStyle = ol(c);
    ctx.stroke();
    ['#ff5a5a', '#ffd23a', '#2fb86a'].forEach((cc, j) => ell(-u * 0.1 + j * u * 0.1, u * 0.12, u * 0.035, u * 0.035, C(cc)));
    ctx.fillStyle = shade(c, 0, -u * 0.2, u * 0.25);
    ctx.beginPath();
    ctx.roundRect(-u * 0.23, -u * 0.36, u * 0.46, u * 0.3, u * 0.07);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = C('#2a3644');
    ctx.beginPath();
    ctx.roundRect(-u * 0.17, -u * 0.3, u * 0.34, u * 0.17, u * 0.05);
    ctx.fill();
    for (const sx of [-1, 1]) ell(sx * u * 0.08, -u * 0.22, u * 0.04, u * 0.04, C('#6ef3ff'));
  } else if (k === ROCKET) {
    const c = '#f1f3f7';
    ctx.fillStyle = C('#ef4b4b');
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx * u * 0.12, u * 0.1);
      ctx.lineTo(sx * u * 0.3, u * 0.34);
      ctx.lineTo(sx * u * 0.1, u * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = ol('#ef4b4b');
      ctx.stroke();
    }
    ctx.fillStyle = C(Math.sin(t * 0.5) > 0 ? '#ffb02e' : '#ff7a2e');
    ctx.beginPath();
    ctx.moveTo(-u * 0.08, u * 0.32);
    ctx.quadraticCurveTo(0, u * 0.52, u * 0.08, u * 0.32);
    ctx.fill();
    ell(0, 0, u * 0.17, u * 0.38, shade(c, 0, 0, u * 0.25), ol('#9aa0aa'));
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 0, u * 0.17, u * 0.38, 0, 0, TAU);
    ctx.clip();
    ctx.fillStyle = C('#ef4b4b');
    ctx.fillRect(-u * 0.2, -u * 0.4, u * 0.4, u * 0.15);
    ctx.restore();
    ell(0, -u * 0.04, u * 0.085, u * 0.085, C('#5ab4ec'), C('#9aa0aa'));
    ell(-u * 0.025, -u * 0.07, u * 0.03, u * 0.025, C('#e6f6ff'));
  } else if (k === DINO) {
    const c = '#52b66c';
    ctx.fillStyle = shade(c, u * 0.3, u * 0.1, u * 0.12);
    ctx.beginPath();
    ctx.moveTo(u * 0.25, u * 0.05);
    ctx.quadraticCurveTo(u * 0.46, u * 0.0, u * 0.5, -u * 0.1);
    ctx.quadraticCurveTo(u * 0.42, u * 0.2, u * 0.2, u * 0.24);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = ol(c);
    ctx.stroke();
    for (const lx of [-0.16, -0.04, 0.1, 0.22]) {
      ctx.fillStyle = C(mix(c, '#000000', 0.15));
      ctx.beginPath();
      ctx.roundRect(u * lx - u * 0.045, u * 0.18, u * 0.09, u * 0.18, u * 0.03);
      ctx.fill();
    }
    ell(u * 0.04, u * 0.12, u * 0.28, u * 0.18, shade(c, u * 0.04, u * 0.12, u * 0.28), ol(c));
    ctx.strokeStyle = C(c);
    ctx.lineWidth = u * 0.13;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-u * 0.14, u * 0.06);
    ctx.quadraticCurveTo(-u * 0.24, -u * 0.08, -u * 0.2, -u * 0.26);
    ctx.stroke();
    ctx.lineWidth = lw;
    ell(-u * 0.25, -u * 0.3, u * 0.14, u * 0.09, shade(c, -u * 0.25, -u * 0.3, u * 0.14), ol(c), -0.2);
    eye(-u * 0.27, -u * 0.33, u * 0.025);
    for (const [sx, sy] of [[0.0, 0.05], [0.14, 0.08], [0.07, 0.17]]) ell(u * sx, u * sy, u * 0.04, u * 0.03, C('#8fe0a0'));
  } else if (k === BUNNY) {
    const c = '#ffb8cc';
    for (const sx of [-1, 1]) (ell(sx * u * 0.1, -u * 0.36, u * 0.07, u * 0.17, shade(c, sx * u * 0.1, -u * 0.36, u * 0.12), ol(c), sx * 0.15), ell(sx * u * 0.1, -u * 0.34, u * 0.035, u * 0.12, C('#ff8fae'), undefined, sx * 0.15));
    ell(0, u * 0.24, u * 0.25, u * 0.17, shade(c, 0, u * 0.24, u * 0.25), ol(c));
    ell(0, u * 0.28, u * 0.13, u * 0.1, C('#fff0f4'));
    ell(0, -u * 0.08, u * 0.23, u * 0.2, shade(c, 0, -u * 0.08, u * 0.23), ol(c));
    eye(-u * 0.09, -u * 0.1, u * 0.03);
    eye(u * 0.09, -u * 0.1, u * 0.03);
    ell(0, -u * 0.02, u * 0.03, u * 0.022, C('#e2414f'));
    for (const sx of [-1, 1]) ell(sx * u * 0.15, u * 0.0, u * 0.045, u * 0.028, C('#ff8fae'));
  } else if (k === DRUM) {
    const c = '#e2574c';
    ctx.fillStyle = shade(c, 0, u * 0.05, u * 0.35);
    ctx.fillRect(-u * 0.32, -u * 0.12, u * 0.64, u * 0.36);
    ell(0, u * 0.24, u * 0.32, u * 0.09, C(mix(c, '#000000', 0.25)), ol(c));
    ctx.strokeStyle = C('#ffffff');
    ctx.lineWidth = lw * 1.3;
    ctx.beginPath();
    for (let j = 0; j <= 6; j++) ctx.lineTo(-u * 0.3 + j * u * 0.1, j % 2 ? u * 0.17 : -u * 0.06);
    ctx.stroke();
    ctx.lineWidth = lw;
    ctx.fillStyle = C('#ffd23a');
    ctx.fillRect(-u * 0.33, -u * 0.14, u * 0.66, u * 0.04);
    ctx.fillRect(-u * 0.33, u * 0.18, u * 0.66, u * 0.04);
    ell(0, -u * 0.13, u * 0.32, u * 0.1, C('#fdf3dc'), ol('#c9b68a'));
    ctx.strokeStyle = C('#8a5a32');
    ctx.lineWidth = u * 0.045;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-u * 0.22, -u * 0.42);
    ctx.lineTo(u * 0.06, -u * 0.18);
    ctx.moveTo(u * 0.24, -u * 0.42);
    ctx.lineTo(-u * 0.04, -u * 0.18);
    ctx.stroke();
    ell(-u * 0.22, -u * 0.42, u * 0.04, u * 0.04, C('#f4e1c0'));
    ell(u * 0.24, -u * 0.42, u * 0.04, u * 0.04, C('#f4e1c0'));
  } else if (k === KEY || k === CROWN) {
    const c = '#ffcf3a';
    if (k === KEY) {
      ctx.strokeStyle = shade(c, -u * 0.18, 0, u * 0.18);
      ctx.lineWidth = u * 0.09;
      ctx.beginPath();
      ctx.arc(-u * 0.18, 0, u * 0.13, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = shade(c, u * 0.15, 0, u * 0.25);
      ctx.fillRect(-u * 0.06, -u * 0.045, u * 0.46, u * 0.09);
      ctx.fillRect(u * 0.22, u * 0.0, u * 0.06, u * 0.15);
      ctx.fillRect(u * 0.33, u * 0.0, u * 0.06, u * 0.11);
      ctx.strokeStyle = ol(c);
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.arc(-u * 0.18, 0, u * 0.18, 0, TAU);
      ctx.stroke();
    } else {
      ctx.fillStyle = shade(c, 0, 0, u * 0.35);
      ctx.beginPath();
      ctx.moveTo(-u * 0.34, u * 0.22);
      ctx.lineTo(-u * 0.38, -u * 0.2);
      ctx.lineTo(-u * 0.17, -u * 0.02);
      ctx.lineTo(0, -u * 0.3);
      ctx.lineTo(u * 0.17, -u * 0.02);
      ctx.lineTo(u * 0.38, -u * 0.2);
      ctx.lineTo(u * 0.34, u * 0.22);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = ol(c);
      ctx.stroke();
      ell(0, u * 0.08, u * 0.06, u * 0.06, C('#ef4b4b'));
      ell(-u * 0.2, u * 0.1, u * 0.045, u * 0.045, C('#3b82f6'));
      ell(u * 0.2, u * 0.1, u * 0.045, u * 0.045, C('#2fb86a'));
    }
  } else if (k === JACK) {
    const c = '#a45ee0';
    if (o.pop !== undefined) {
      // 튀어나온 광대
      const ext = Math.min(1, o.pop) * u * 0.55;
      ctx.strokeStyle = C('#c9ced6');
      ctx.lineWidth = lw * 1.4;
      ctx.beginPath();
      for (let j = 0; j <= 8; j++) ctx.lineTo((j % 2 ? 1 : -1) * u * 0.08, -u * 0.25 - (ext * j) / 8);
      ctx.stroke();
      ell(0, -u * 0.3 - ext, u * 0.16, u * 0.15, C('#fff1e0'), ol('#c9b6a0'));
      ell(0, -u * 0.28 - ext, u * 0.05, u * 0.05, C('#ef4b4b'));
      ctx.fillStyle = C('#ffd23a');
      ctx.beginPath();
      ctx.moveTo(-u * 0.14, -u * 0.38 - ext);
      ctx.lineTo(0, -u * 0.62 - ext);
      ctx.lineTo(u * 0.14, -u * 0.38 - ext);
      ctx.closePath();
      ctx.fill();
      eye(-u * 0.06, -u * 0.34 - ext, u * 0.02);
      eye(u * 0.06, -u * 0.34 - ext, u * 0.02);
    }
    ctx.fillStyle = C(mix(c, '#000000', 0.3));
    ctx.beginPath();
    ctx.moveTo(u * 0.28, -u * 0.22);
    ctx.lineTo(u * 0.38, -u * 0.3);
    ctx.lineTo(u * 0.38, u * 0.26);
    ctx.lineTo(u * 0.28, u * 0.34);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = shade(c, 0, u * 0.05, u * 0.35);
    ctx.fillRect(-u * 0.32, -u * 0.22, u * 0.6, u * 0.56);
    ctx.strokeStyle = ol(c);
    ctx.strokeRect(-u * 0.32, -u * 0.22, u * 0.6, u * 0.56);
    if (o.pop === undefined) {
      ctx.fillStyle = C(mix(c, '#ffffff', 0.35));
      ctx.beginPath();
      ctx.moveTo(-u * 0.32, -u * 0.22);
      ctx.lineTo(-u * 0.22, -u * 0.3);
      ctx.lineTo(u * 0.38, -u * 0.3);
      ctx.lineTo(u * 0.28, -u * 0.22);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = C('#ffd23a');
    ctx.fillRect(-u * 0.32, u * 0.0, u * 0.6, u * 0.06);
    ctx.font = `900 ${u * 0.3}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = C('#fff3a0');
    ctx.fillText('?', -u * 0.02, u * 0.18);
    // 손잡이
    ctx.strokeStyle = C('#c9ced6');
    ctx.lineWidth = u * 0.04;
    const ca = t * 0.08;
    ctx.beginPath();
    ctx.moveTo(u * 0.38, u * 0.04);
    ctx.lineTo(u * 0.46, u * 0.04);
    ctx.lineTo(u * 0.46 + Math.cos(ca) * u * 0.08, u * 0.04 + Math.sin(ca) * u * 0.08);
    ctx.stroke();
  } else if (k === CHEST) {
    const c = '#9a6236';
    if (o.open) {
      const gg = ctx.createRadialGradient(0, 0, u * 0.1, 0, 0, u * 0.65);
      gg.addColorStop(0, `rgba(255,230,120,${0.55 + 0.25 * Math.sin(t * 0.15)})`);
      gg.addColorStop(1, 'rgba(255,230,120,0)');
      ctx.fillStyle = gg;
      ctx.fillRect(-u * 0.7, -u * 0.7, u * 1.4, u * 1.4);
    }
    ctx.fillStyle = shade(c, 0, u * 0.12, u * 0.4);
    ctx.fillRect(-u * 0.38, -u * 0.04, u * 0.76, u * 0.36);
    ctx.strokeStyle = ol(c);
    ctx.strokeRect(-u * 0.38, -u * 0.04, u * 0.76, u * 0.36);
    const lidUp = o.pop !== undefined ? Math.min(1, o.pop) : 0;
    ctx.save();
    ctx.translate(0, -u * 0.04);
    ctx.rotate(-lidUp * 0.9);
    ctx.fillStyle = shade(mix(c, '#ffffff', 0.1), 0, -u * 0.12, u * 0.4);
    ctx.beginPath();
    ctx.moveTo(-u * 0.38, 0);
    ctx.quadraticCurveTo(-u * 0.38, -u * 0.26, 0, -u * 0.26);
    ctx.quadraticCurveTo(u * 0.38, -u * 0.26, u * 0.38, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = C('#e8b93a');
    for (const bx of [-0.26, 0.2]) ctx.fillRect(u * bx, -u * 0.27, u * 0.07, u * 0.59);
    if (!o.open) {
      ctx.fillStyle = C('#ffcf3a');
      ctx.strokeStyle = C('#7a5a10');
      ctx.beginPath();
      ctx.roundRect(-u * 0.09, -u * 0.06, u * 0.18, u * 0.16, u * 0.03);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -u * 0.07, u * 0.06, Math.PI, 0);
      ctx.stroke();
      ell(0, u * 0.02, u * 0.025, u * 0.025, C('#5a4008'));
    } else ell(0, u * 0.03, u * 0.06, u * 0.06, C('#fff3a0'), ol('#e8b93a'));
  }
  if (o.twin) {
    // 리본 매듭
    ctx.fillStyle = C('#ff5fa2');
    ctx.strokeStyle = C('#b0306a');
    ctx.lineWidth = 1;
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(-u * 0.3, -u * 0.3);
      ctx.lineTo(-u * 0.3 + sx * u * 0.14, -u * 0.38);
      ctx.lineTo(-u * 0.3 + sx * u * 0.14, -u * 0.22);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ell(-u * 0.3, -u * 0.3, u * 0.04, u * 0.04, C('#ff8fc0'));
  }
  if (o.hot) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, u * 0.55 + Math.sin(t * 0.4) * 1.5, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}
function drawBalloon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, col: string, t: number, sx: number, sy: number) {
  ctx.strokeStyle = 'rgba(255,255,255,.8)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.quadraticCurveTo((sx + x) / 2 + Math.sin(t * 0.1) * 3, (sy + y) / 2, x, y + r);
  ctx.stroke();
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.1);
  g.addColorStop(0, mix(col, '#ffffff', 0.55));
  g.addColorStop(0.6, col);
  g.addColorStop(1, mix(col, '#000000', 0.3));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.85, r, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = mix(col, '#000000', 0.25);
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.95);
  ctx.lineTo(x - r * 0.15, y + r * 1.15);
  ctx.lineTo(x + r * 0.15, y + r * 1.15);
  ctx.fill();
}

// ───────── 기차(받침) ─────────
const WAG = ['#ff8fa3', '#7ec4ff', '#ffd166', '#8fe0a0', '#c4a8ff', '#ffb36b', '#7fe0d6'];
const WW = 0.104;
function drawRails(ctx: CanvasRenderingContext2D, X: Fn, Y: Fn, R: Fn, w: number) {
  const ry = TRAY_Y + 0.078;
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  ctx.fillRect(0, Y(ry - 0.006), w, R(0.026));
  ctx.fillStyle = '#8a5a32';
  for (let x = 0.0; x < 1.02; x += 0.034) ctx.fillRect(X(x), Y(ry - 0.004), R(0.016), R(0.02));
  ctx.fillStyle = '#c9ced6';
  ctx.fillRect(0, Y(ry - 0.002), w, R(0.006));
  ctx.fillRect(0, Y(ry + 0.01), w, R(0.006));
}
function wheel(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number, col = '#3a3a48') {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#c9ced6';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.45, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#c9ced6';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + Math.cos(rot) * r * 0.8, y + Math.sin(rot) * r * 0.8);
  ctx.lineTo(x - Math.cos(rot) * r * 0.8, y - Math.sin(rot) * r * 0.8);
  ctx.stroke();
}
/** 칸 뒤쪽(안쪽 그늘)과 바퀴 — 장난감은 이 위에, 앞판은 그 위에 */
function drawWagonsBack(ctx: CanvasRenderingContext2D, s: ToyState, X: Fn, Y: Fn, R: Fn) {
  const t = s.t, n = s.S.tray.length, warn = n >= 5 && s.phase === 'play';
  for (let k = 0; k < TRAY; k++) {
    const [cx] = slotXY(k), jig = warn && k >= n ? Math.sin(t * 0.5 + k) * 0.8 : 0;
    ctx.fillStyle = '#3a3a48';
    ctx.fillRect(X(cx + WW / 2 - 0.004), Y(TRAY_Y + 0.04), R(0.016), R(0.008));
    for (const sx of [-1, 1]) wheel(ctx, X(cx + sx * WW * 0.28), Y(TRAY_Y + 0.062), R(0.017), t * 0.02 + k);
    ctx.fillStyle = mix(WAG[k], '#000000', 0.55);
    ctx.beginPath();
    ctx.roundRect(X(cx - WW / 2 + 0.006) + jig, Y(TRAY_Y - 0.018), R(WW - 0.012), R(0.04), R(0.008));
    ctx.fill();
  }
}
function drawWagonsFront(ctx: CanvasRenderingContext2D, s: ToyState, X: Fn, Y: Fn, R: Fn, font: (sz: number, w?: number) => void) {
  const t = s.t, n = s.S.tray.length, play = s.phase === 'play', warn = n >= 5 && play;
  for (let k = 0; k < TRAY; k++) {
    const [cx] = slotXY(k), jig = warn && k >= n ? Math.sin(t * 0.5 + k) * 0.8 : 0;
    const danger = (warn && k >= n) || (s.phase !== 'play' && !s.ok && s.S.fail === 1);
    const c = danger && Math.sin(t * 0.3) > 0 ? '#ff6a6a' : WAG[k];
    const x0 = X(cx - WW / 2) + jig, y0 = Y(TRAY_Y + 0.008), bw = R(WW), bh = R(0.046);
    const g = ctx.createLinearGradient(0, y0, 0, y0 + bh);
    g.addColorStop(0, mix(c, '#ffffff', 0.2));
    g.addColorStop(1, mix(c, '#000000', 0.25));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(x0, y0, bw, bh, R(0.008));
    ctx.fill();
    ctx.strokeStyle = mix(c, '#000000', 0.45);
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.45)';
    ctx.fillRect(x0 + 2, y0 + 1.5, bw - 4, R(0.006));
    ctx.strokeStyle = 'rgba(0,0,0,.15)';
    ctx.lineWidth = 1;
    for (let j = 1; j < 3; j++) (ctx.beginPath(), ctx.moveTo(x0 + (bw * j) / 3, y0 + 3), ctx.lineTo(x0 + (bw * j) / 3, y0 + bh - 2), ctx.stroke());
    if (warn && k === TRAY - 1 && n === TRAY - 1) {
      font(0.04, 900);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('!', X(cx), y0 + bh * 0.62);
    }
  }
}
function drawEngine(ctx: CanvasRenderingContext2D, s: ToyState, X: Fn, Y: Fn, R: Fn) {
  const t = s.t, bob = Math.sin(t * 0.12) * 0.6;
  for (const wx of [0.045, 0.1]) wheel(ctx, X(wx), Y(TRAY_Y + 0.058), R(0.022), t * 0.02, '#2a2a35');
  // 보일러
  const g = ctx.createLinearGradient(0, Y(TRAY_Y - 0.01), 0, Y(TRAY_Y + 0.05));
  g.addColorStop(0, '#ff7a6a');
  g.addColorStop(1, '#b8322a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(X(0.018), Y(TRAY_Y - 0.008) + bob, R(0.1), R(0.056), R(0.026));
  ctx.fill();
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(X(0.035), Y(TRAY_Y - 0.008) + bob, R(0.008), R(0.056));
  ctx.fillRect(X(0.08), Y(TRAY_Y - 0.008) + bob, R(0.008), R(0.056));
  ctx.fillStyle = '#3a3a48';
  ctx.beginPath();
  ctx.arc(X(0.02), Y(TRAY_Y + 0.02) + bob, R(0.016), 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fff3a0';
  ctx.beginPath();
  ctx.arc(X(0.02), Y(TRAY_Y + 0.02) + bob, R(0.008), 0, TAU);
  ctx.fill();
  // 굴뚝 + 연기
  ctx.fillStyle = '#3a3a48';
  ctx.fillRect(X(0.04), Y(TRAY_Y - 0.048) + bob, R(0.022), R(0.042));
  ctx.fillRect(X(0.034), Y(TRAY_Y - 0.054) + bob, R(0.034), R(0.012));
  const pu = s.vt - s.puffT;
  for (let k = 0; k < 4; k++) {
    const age = pu >= 0 && pu < 60 ? pu - k * 6 : (t + k * 30) % 120;
    if (age < 0) continue;
    const big = pu >= 0 && pu < 60;
    const a = Math.max(0, 1 - age / (big ? 50 : 110));
    ctx.fillStyle = `rgba(255,255,255,${(big ? 0.85 : 0.35) * a})`;
    ctx.beginPath();
    ctx.arc(X(0.051 + age * 0.0006 + k * 0.004), Y(TRAY_Y - 0.065 - age * (big ? 0.0018 : 0.0008)), R((big ? 0.014 : 0.009) + age * 0.0003), 0, TAU);
    ctx.fill();
  }
  // 기관실
  ctx.fillStyle = '#2f6fd6';
  ctx.beginPath();
  ctx.roundRect(X(0.098), Y(TRAY_Y - 0.026) + bob, R(0.058), R(0.074), R(0.01));
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.3)';
  ctx.fillRect(X(0.1), Y(TRAY_Y - 0.024) + bob, R(0.054), R(0.006));
  // 기관사 뭉치
  const away = s.dogRun && s.vt >= s.dogRun.t0 && s.vt < s.dogRun.t0 + 100;
  if (!away) drawPup(ctx, X(0.127), Y(TRAY_Y - 0.05) + bob, R(0.058), s, t);
  ctx.fillStyle = '#244f9e';
  ctx.beginPath();
  ctx.roundRect(X(0.094), Y(TRAY_Y - 0.004) + bob, R(0.066), R(0.016), R(0.006));
  ctx.fill();
  if (!away) {
    ctx.fillStyle = '#f2e6d6';
    for (const sx of [-1, 1]) (ctx.beginPath(), ctx.ellipse(X(0.127 + sx * 0.018), Y(TRAY_Y - 0.004) + bob, R(0.012), R(0.008), 0, 0, TAU), ctx.fill());
  }
}

// ───────── 뭉치(주인공) ─────────
function drawPup(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, s: ToyState, t: number, force?: string) {
  const mood = force ?? s.mood, age = force ? t : t - s.moodT;
  let jump = 0, tilt = 0;
  if (mood === 'wow') jump = Math.max(0, Math.sin(Math.min(1, age / 14) * Math.PI)) * r * 0.35;
  if (mood === 'cheer') jump = Math.abs(Math.sin(age * 0.18)) * r * 0.4;
  if (mood === 'dizzy') tilt = Math.sin(age * 0.12) * 0.3;
  if (mood === 'smug') tilt = -0.12;
  if (mood === 'huh') tilt = 0.25;
  ctx.save();
  ctx.translate(x, y - jump);
  ctx.rotate(tilt);
  const fur = '#f6ead8', patch = '#b8763e', ear = '#8a5226';
  // 귀
  const up = mood === 'wow' || mood === 'cheer' ? -0.9 : 0;
  for (const sx of [-1, 1]) {
    ctx.save();
    ctx.translate(sx * r * 0.62, -r * 0.35);
    ctx.rotate(sx * (0.35 + up * 0.6) + Math.sin(t * 0.1 + sx) * 0.05);
    ctx.fillStyle = ear;
    ctx.beginPath();
    ctx.ellipse(0, r * 0.35 + up * r * 0.4, r * 0.24, r * 0.48, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  // 머리
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.2, 0, 0, r * 1.1);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, fur);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.78, r * 0.7, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#a07a5a';
  ctx.lineWidth = Math.max(1, r * 0.05);
  ctx.stroke();
  ctx.fillStyle = patch;
  ctx.beginPath();
  ctx.ellipse(r * 0.32, -r * 0.12, r * 0.28, r * 0.26, 0.3, 0, TAU);
  ctx.fill();
  // 기관사 모자
  ctx.fillStyle = '#3b6fd6';
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.6, r * 0.62, r * 0.28, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(-r * 0.66, -r * 0.62, r * 1.32, r * 0.14);
  ctx.fillStyle = '#ffffff';
  for (let k = -2; k <= 2; k++) ctx.fillRect(k * r * 0.22 - r * 0.04, -r * 0.82, r * 0.08, r * 0.2);
  ctx.fillStyle = '#244f9e';
  ctx.fillRect(-r * 0.7, -r * 0.5, r * 0.8, r * 0.08);
  // 눈
  const ey = -r * 0.08;
  ctx.fillStyle = '#2a1a10';
  ctx.strokeStyle = '#2a1a10';
  ctx.lineWidth = Math.max(1.5, r * 0.08);
  ctx.lineCap = 'round';
  for (const sx of [-1, 1]) {
    const ex = sx * r * 0.3;
    if (mood === 'smug' || mood === 'cheer') (ctx.beginPath(), ctx.arc(ex, ey + r * 0.05, r * 0.11, Math.PI * 1.15, Math.PI * 1.85), ctx.stroke());
    else if (mood === 'dizzy') {
      ctx.beginPath();
      for (let a = 0; a < 9; a += 0.5) ctx.lineTo(ex + Math.cos(a + age * 0.2) * a * r * 0.016, ey + Math.sin(a + age * 0.2) * a * r * 0.016);
      ctx.stroke();
    } else if (mood === 'wow' || mood === 'huh') {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex, ey, r * 0.16, 0, TAU);
      ctx.fill();
      ctx.lineWidth = Math.max(1, r * 0.04);
      ctx.stroke();
      ctx.fillStyle = '#2a1a10';
      ctx.beginPath();
      ctx.arc(ex, ey + r * 0.02, r * 0.08, 0, TAU);
      ctx.fill();
      ctx.lineWidth = Math.max(1.5, r * 0.08);
    } else {
      const bl = t % 200 < 7 ? 0.2 : 1;
      ctx.beginPath();
      ctx.ellipse(ex, ey, r * 0.08, r * 0.1 * bl, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex - r * 0.03, ey - r * 0.04, r * 0.03, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#2a1a10';
    }
    if (mood === 'worry') (ctx.beginPath(), ctx.moveTo(ex - sx * r * 0.14, ey - r * 0.24), ctx.lineTo(ex + sx * r * 0.08, ey - r * 0.17), ctx.stroke());
  }
  // 코·입
  ctx.fillStyle = '#2a1a10';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.16, r * 0.12, r * 0.08, 0, 0, TAU);
  ctx.fill();
  ctx.lineWidth = Math.max(1, r * 0.05);
  ctx.beginPath();
  ctx.moveTo(-r * 0.14, r * 0.3);
  ctx.quadraticCurveTo(-r * 0.07, r * 0.38, 0, r * 0.26);
  ctx.quadraticCurveTo(r * 0.07, r * 0.38, r * 0.14, r * 0.3);
  ctx.stroke();
  if (mood === 'smug' || mood === 'cheer' || (mood === 'idle' && t % 300 < 90)) {
    ctx.fillStyle = '#ff7a8a';
    ctx.beginPath();
    ctx.ellipse(r * 0.04, r * 0.42, r * 0.09, r * 0.13, 0.1, 0, TAU);
    ctx.fill();
  }
  if (mood === 'wow') {
    ctx.fillStyle = '#5a2a1a';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.4, r * 0.1, r * 0.12, 0, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,130,140,.5)';
  for (const sx of [-1, 1]) (ctx.beginPath(), ctx.ellipse(sx * r * 0.5, r * 0.15, r * 0.12, r * 0.07, 0, 0, TAU), ctx.fill());
  if (mood === 'worry') {
    ctx.fillStyle = '#7ec8ff';
    ctx.beginPath();
    ctx.ellipse(-r * 0.72, -r * 0.1 + (age % 40) * r * 0.01, r * 0.08, r * 0.13, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  if (mood === 'dizzy')
    for (let k = 0; k < 3; k++) {
      const a = age * 0.1 + (k * TAU) / 3;
      ctx.fillStyle = '#ffd23a';
      star5(ctx, x + Math.cos(a) * r * 0.9, y - r * 0.9 + Math.sin(a) * r * 0.25, r * 0.16, a);
      ctx.fill();
    }
  if (mood === 'huh') {
    ctx.font = `900 ${Math.max(12, r * 0.6)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('?', x + r * 0.9, y - r * 0.7);
  }
}
/** 장난감을 물고 달리는 뭉치 (온몸) */
function drawPupRun(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, dir: number, t: number, s: ToyState) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  const leg = Math.sin(t * 0.6);
  ctx.fillStyle = 'rgba(0,0,0,.2)';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.95, r * 0.9, r * 0.15, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#e8dcc8';
  ctx.lineWidth = r * 0.22;
  ctx.lineCap = 'round';
  for (const [lx, ph] of [[-0.45, 1], [0.45, -1]] as [number, number][]) (ctx.beginPath(), ctx.moveTo(r * lx, r * 0.3), ctx.lineTo(r * lx + leg * ph * r * 0.3, r * 0.85), ctx.stroke());
  ctx.strokeStyle = '#b8763e';
  ctx.lineWidth = r * 0.14;
  ctx.beginPath();
  ctx.moveTo(-r * 0.75, 0);
  ctx.quadraticCurveTo(-r * 1.1, -r * 0.3 + leg * r * 0.2, -r * 1.05, -r * 0.6);
  ctx.stroke();
  ctx.fillStyle = '#f6ead8';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.2, r * 0.8, r * 0.42, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#b8763e';
  ctx.beginPath();
  ctx.ellipse(-r * 0.2, r * 0.05, r * 0.3, r * 0.22, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.translate(x + dir * r * 0.7, y - r * 0.35);
  drawPup(ctx, 0, 0, r * 0.75, s, t, 'smug');
  ctx.restore();
}

// ───────── 구경꾼 고양이 ─────────
function drawCat(ctx: CanvasRenderingContext2D, s: ToyState, X: Fn, Y: Fn, R: Fn, t: number) {
  const age = s.vt - s.catT, jump = age >= 0 && age < 30 ? Math.sin((age / 30) * Math.PI) * R(0.05) : 0, startle = age >= 0 && age < 60;
  const x = X(0.885), y = Y(0.293) - jump, r = R(0.04);
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  ctx.beginPath();
  ctx.ellipse(x, Y(0.296), r * 0.9, r * 0.18, 0, 0, TAU);
  ctx.fill();
  // 꼬리
  ctx.strokeStyle = '#7d7f8c';
  ctx.lineWidth = startle ? r * 0.36 : r * 0.22;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + r * 0.6, y - r * 0.1);
  const sw = Math.sin(t * 0.05) * r * 0.5;
  ctx.quadraticCurveTo(x + r * 1.3, y - r * 0.2, x + r * 1.1 + sw, startle ? y - r * 1.4 : y - r * 1.0);
  ctx.stroke();
  // 몸
  ctx.fillStyle = '#9a9caa';
  ctx.beginPath();
  ctx.ellipse(x, y - r * 0.4, r * 0.7, r * 0.6, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#e8e8ee';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.1, y - r * 0.3, r * 0.32, r * 0.4, 0, 0, TAU);
  ctx.fill();
  // 머리
  const hx = x - r * 0.25, hy = y - r * 1.15;
  ctx.fillStyle = '#9a9caa';
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(hx + sx * r * 0.45, hy - r * 0.15);
    ctx.lineTo(hx + sx * r * 0.42, hy - r * (startle ? 0.85 : 0.7));
    ctx.lineTo(hx + sx * r * 0.12, hy - r * 0.38);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(hx, hy, r * 0.52, r * 0.45, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#6a6c78';
  ctx.lineWidth = 1;
  for (let k = -1; k <= 1; k++) (ctx.beginPath(), ctx.moveTo(hx + k * r * 0.15, hy - r * 0.42), ctx.lineTo(hx + k * r * 0.12, hy - r * 0.25), ctx.stroke());
  const look = Math.max(-1, Math.min(1, (X(s.lastX) - hx) / R(0.4))) * r * 0.07;
  for (const sx of [-1, 1]) {
    const ex = hx + sx * r * 0.2 + look;
    if (startle) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex, hy - r * 0.02, r * 0.14, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.arc(ex, hy - r * 0.02, r * 0.06, 0, TAU);
      ctx.fill();
    } else {
      ctx.fillStyle = '#c8e86a';
      ctx.beginPath();
      ctx.ellipse(ex, hy - r * 0.02, r * 0.1, r * 0.08, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#222';
      ctx.fillRect(ex - r * 0.02, hy - r * 0.09, r * 0.04, r * 0.14);
    }
  }
  ctx.fillStyle = '#ff9fb0';
  ctx.beginPath();
  ctx.arc(hx, hy + r * 0.12, r * 0.05, 0, TAU);
  ctx.fill();
  if (startle && age < 40) {
    ctx.font = `900 ${Math.max(12, R(0.04))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = 'rgba(0,0,0,.5)';
    ctx.lineWidth = 3;
    ctx.strokeText('냥?!', hx - r * 1.2, hy - r * 0.6);
    ctx.fillText('냥?!', hx - r * 1.2, hy - r * 0.6);
  }
}

// ───────── 미리 보기: 지금 이 장난감을 꺼내면? ─────────
interface Preview { st: number; takes: { id: number; slot: number; why: Why }[]; pops: number; fail: boolean; slides: { id: number; x0: number; y0: number; x1: number; y1: number }[]; reveal: number[]; above: number[] }
const pvCache = new WeakMap<object, { key: string; p: Preview }>();
function preview(s: ToyState, id: number): Preview {
  const key = `${id}:${s.S.taps}:${s.stage}:${s.tries}`, c = pvCache.get(s);
  if (c && c.key === key) return c.p;
  const L = s.L, S = cloneSim(s.S), st = canTake(L, S, id);
  const p: Preview = { st, takes: [], pops: 0, fail: false, slides: [], reveal: [], above: [] };
  if (st === 1) {
    const [cc, i] = find(S, id);
    p.above = S.cols[cc].slice(i + 1);
  } else if (st === 0) {
    const free0 = new Set(movesOf(L, S)), pos0 = new Map<number, [number, number]>();
    S.cols.forEach((col, cc) => col.forEach((q, l) => pos0.set(q, pilePos(L, cc, l, q))));
    const rec: RE[] = [];
    apply(L, S, id, rec);
    for (const e of rec) {
      if (e.k === 'take') p.takes.push({ id: e.id, slot: e.tray.indexOf(e.id), why: e.why });
      if (e.k === 'pop') p.pops++;
      if (e.k === 'slide') {
        const a = pos0.get(e.id)!, b = pilePos(L, e.to, e.lvl, e.id);
        p.slides.push({ id: e.id, x0: a[0], y0: a[1], x1: b[0], y1: b[1] });
        pos0.set(e.id, b);
      }
    }
    p.fail = S.fail === 1;
    p.reveal = movesOf(L, S).filter((q) => !free0.has(q) && !p.slides.some((z) => z.id === q));
  }
  pvCache.set(s, { key, p });
  return p;
}
function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: number, col = '#fff6a8') {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(t * 0.05);
  ctx.fillStyle = col;
  ctx.beginPath();
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4, rr = k % 2 ? r * 0.25 : r;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
function arrow(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, lift: number, col: string, lw: number) {
  const mx = (x0 + x1) / 2, my = Math.min(y0, y1) - lift;
  ctx.strokeStyle = 'rgba(40,20,30,.55)';
  ctx.lineWidth = lw + 2.5;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(mx, my, x1, y1);
  ctx.stroke();
  ctx.strokeStyle = col;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(mx, my, x1, y1);
  ctx.stroke();
  const a = Math.atan2(y1 - my, x1 - mx), hl = lw * 3.2;
  ctx.setLineDash([]);
  ctx.strokeStyle = 'rgba(40,20,30,.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - Math.cos(a - 0.45) * hl, y1 - Math.sin(a - 0.45) * hl);
  ctx.lineTo(x1 - Math.cos(a + 0.45) * hl, y1 - Math.sin(a + 0.45) * hl);
  ctx.closePath();
  ctx.stroke();
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - Math.cos(a - 0.45) * hl, y1 - Math.sin(a - 0.45) * hl);
  ctx.lineTo(x1 - Math.cos(a + 0.45) * hl, y1 - Math.sin(a + 0.45) * hl);
  ctx.closePath();
  ctx.fill();
}
const outline = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, col: string) => {
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(40,20,30,.75)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = col;
  ctx.fillText(text, x, y);
};

// ───────── 한 장면 ─────────
const recentSay = new WeakMap<object, { x: number; y: number; t: number }[]>();
const BAL = ['#ff5a8a', '#5ad1ff', '#ffd23a', '#7be07b', '#c4a8ff'];
function drawAll(ctx: CanvasRenderingContext2D, s: ToyState, w: number, h: number, th: Theme) {
  const fx = juice(s), t = s.t, vt = s.vt, L = s.L, S = s.S, d = STAGES[s.stage];
  const X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w;
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  ctx.save();
  fx.begin(ctx);
  // 잠깐 느려지는 순간: 살짝 당겨 보기
  if (s.slow > 0) {
    const z = 1 + 0.045 * Math.min(1, s.slow / 6);
    ctx.translate(w / 2, h * 0.62);
    ctx.scale(z, z);
    ctx.translate(-w / 2, -h * 0.62);
  }
  drawRoom(ctx, s, X, Y, R, w, h);
  drawCat(ctx, s, X, Y, R, t);
  drawBasket(ctx, L, X, Y, R, false);
  // ═════════ 더미 ═════════
  const free = new Set(movesOf(L, S)), inPile = new Set<number>();
  S.cols.forEach((col) => col.forEach((q) => inPile.add(q)));
  const pressK = s.down && s.phase === 'play' ? s.press : -1, pre = pressK >= 0 ? preview(s, pressK) : null;
  const moving = (v: Vis) => vt < v.t0 + v.dur;
  const pile: number[] = [], tray: number[] = [], fly: number[] = [];
  s.vis.forEach((v, id) => {
    if (v.where === 2 && !moving(v)) return;
    if (v.where === 0 && !(v.style === 4 && moving(v))) pile.push(id);
    else if (v.where === 1 && !moving(v)) tray.push(id);
    else fly.push(id);
  });
  pile.sort((a, b) => s.vis[b].y - s.vis[a].y);
  const toyU = R(U);
  for (const id of pile) {
    const v = s.vis[id], k = L.kind[id], f = free.has(id) && s.phase === 'play';
    const bob = f ? Math.sin(t * 0.09 + id) * 0.8 : 0;
    // 장치 장난감은 묻혀 있어도 빛이 새어 나와 눈에 띈다
    const gc = gimCol(L, S, id, inPile);
    if (gc) {
      const pr = toyU * (0.72 + 0.06 * Math.sin(t * 0.12 + id)), hg = ctx.createRadialGradient(X(v.x), Y(v.y), pr * 0.2, X(v.x), Y(v.y), pr);
      hg.addColorStop(0, gc + 'cc');
      hg.addColorStop(1, gc + '00');
      ctx.fillStyle = hg;
      ctx.beginPath();
      ctx.arc(X(v.x), Y(v.y), pr, 0, TAU);
      ctx.fill();
    }
    const jig = k === JACK && t % 110 < 24 ? Math.sin(t * 0.9) * 0.14 : 0;
    drawToy(ctx, k, X(v.x), Y(v.y) + bob, toyU * v.s, v.a + v.wob + jig, f || s.phase !== 'play' ? 0 : 0.36, t, { twin: L.twin[id] >= 0 && inPile.has(L.twin[id]), open: S.open, hot: id === pressK });
  }
  // 리본 쌍둥이 끈 (굵은 분홍 리본, 살랑)
  ctx.lineCap = 'round';
  for (let id = 0; id < L.N; id++) {
    const p = L.twin[id];
    if (p < id || !inPile.has(id) || !inPile.has(p)) continue;
    const a = s.vis[id], b = s.vis[p], top = Math.min(a.y, b.y) - 0.13 + Math.sin(t * 0.07 + id) * 0.012;
    for (const [col, lw] of [['rgba(120,20,60,.45)', 0.017], ['#ff5fa2', 0.012], ['rgba(255,255,255,.55)', 0.003]] as [string, number][]) {
      ctx.strokeStyle = col;
      ctx.lineWidth = R(lw);
      ctx.beginPath();
      ctx.moveTo(X(a.x - 0.035), Y(a.y - 0.035));
      ctx.bezierCurveTo(X(a.x), Y(top), X(b.x), Y(top), X(b.x - 0.035), Y(b.y - 0.035));
      ctx.stroke();
    }
  }
  // 풍선 매단 장난감 (묻혀 있어도 풍선이 삐죽)
  for (let id = 0; id < L.N; id++)
    if (L.bal[id] && inPile.has(id) && !S.flown.includes(id)) {
      const v = s.vis[id], sw = Math.sin(t * 0.06 + id) * 0.006;
      drawBalloon(ctx, X(v.x + 0.045 + sw), Y(v.y - 0.088 + Math.sin(t * 0.08 + id) * 0.006), R(0.033), BAL[id % BAL.length], t + id * 9, X(v.x + 0.02), Y(v.y - 0.02));
    }
  drawBasket(ctx, L, X, Y, R, true);
  // ═════════ 장치 꼬리표 · 새 장치 스포트라이트 ═════════
  {
    const intro = s.phase === 'play' && t - s.startT < 320 && S.taps < 3 && CARDS[d.key] ? d.key : '';
    let tags = 0;
    for (const id of pile) {
      const v = s.vis[id], k = L.kind[id];
      if (k === CHEST && inPile.has(id)) {
        const kt = S.open ? '✨ 톡! 열기' : `🔒 🔑 ${S.tray.filter((q) => L.kind[q] === KEY).length}/3`;
        font(0.032, 900);
        ctx.textAlign = 'center';
        const tw = ctx.measureText(kt).width + R(0.03);
        ctx.fillStyle = S.open ? `rgba(200,140,10,${0.85 + 0.15 * Math.sin(t * 0.3)})` : 'rgba(70,45,10,.85)';
        ctx.beginPath();
        ctx.roundRect(X(v.x) - tw / 2, Y(v.y - 0.115) - R(0.022), tw, R(0.044), R(0.022));
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillText(kt, X(v.x), Y(v.y - 0.115) + 1);
      }
      if (!intro || tags >= 4 || !isNewGim(d.key, L, S, id, inPile)) continue;
      tags++;
      const b = Math.abs(Math.sin(t * 0.12 + id)) * R(0.015), age = t - s.startT;
      ctx.strokeStyle = `rgba(255,255,255,${0.9 - ((age % 40) / 40) * 0.9})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(X(v.x), Y(v.y), toyU * (0.5 + ((age % 40) / 40) * 0.35), 0, TAU);
      ctx.stroke();
      font(0.03, 900);
      ctx.textAlign = 'center';
      const tw = ctx.measureText('NEW!').width + R(0.025);
      ctx.fillStyle = '#ff3d7f';
      ctx.beginPath();
      ctx.roundRect(X(v.x) - tw / 2, Y(v.y - 0.1) - b - R(0.02), tw, R(0.04), R(0.02));
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText('NEW!', X(v.x), Y(v.y - 0.1) - b + 1);
    }
  }
  // ═════════ 미리 보기 (더미 쪽) ═════════
  if (pre && pressK >= 0) {
    if (pre.st === 1 || pre.st === 2) {
      const v = s.vis[pressK];
      font(0.036, 900);
      ctx.textAlign = 'center';
      outline(ctx, pre.st === 1 ? `위에 ${pre.above.length}개 먼저!` : '🔒 열쇠 셋 먼저!', X(Math.max(0.17, Math.min(0.83, v.x))), Y(v.y + 0.09), '#ffd0c8');
    }
    if (pre.st === 1)
      for (const q of pre.above) {
        const v = s.vis[q];
        ctx.strokeStyle = `rgba(255,80,90,${0.65 + 0.3 * Math.sin(t * 0.3)})`;
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.arc(X(v.x), Y(v.y), toyU * 0.52, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    ctx.setLineDash([R(0.012), R(0.008)]);
    for (const z of pre.slides) arrow(ctx, X(z.x0), Y(z.y0), X(z.x1), Y(z.y1), 0.035 * w, '#ffb347', 3.5);
    ctx.setLineDash([]);
    if (pre.slides.length) {
      font(0.038, 900);
      ctx.textAlign = 'center';
      const z = pre.slides[0];
      outline(ctx, '와르르~', X((z.x0 + z.x1) / 2), Y(Math.min(z.y0, z.y1) - 0.06), '#ffd08a');
    }
    for (const q of pre.reveal) {
      const v = s.vis[q];
      ctx.strokeStyle = '#fff6a8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(X(v.x), Y(v.y), toyU * 0.5 + Math.sin(t * 0.3) * 2, 0, TAU);
      ctx.stroke();
      sparkle(ctx, X(v.x + 0.04), Y(v.y - 0.04), R(0.025), t);
    }
  }
  // ═════════ 기차 ═════════
  drawRails(ctx, X, Y, R, w);
  drawWagonsBack(ctx, s, X, Y, R);
  for (const id of tray) {
    const v = s.vis[id];
    drawToy(ctx, L.kind[id], X(v.x), Y(v.y), toyU * v.s, v.a + v.wob * 0.5, 0, t, {});
  }
  drawWagonsFront(ctx, s, X, Y, R, font);
  drawEngine(ctx, s, X, Y, R);
  // 뭉치가 노리는 장난감: 기차 맨 끝에 빨간 고리 + 생각 풍선
  if (d.dog && s.phase === 'play' && S.dogC <= 2 && S.tray.length && !(s.dogRun && vt < s.dogRun.t0 + 100)) {
    const q = S.tray[S.tray.length - 1], v = s.vis[q], hot = S.dogC <= 1;
    if (v.where === 1 && !moving(v)) {
      ctx.strokeStyle = hot ? `rgba(255,80,60,${0.7 + 0.3 * Math.sin(t * 0.4)})` : 'rgba(255,200,120,.8)';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(X(v.x), Y(v.y), toyU * 0.48, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      const bx = 0.22, by = TRAY_Y - 0.15 + Math.sin(t * 0.1) * 0.004;
      ctx.fillStyle = 'rgba(255,255,255,.95)';
      for (const [cx2, cy2, rr] of [[0.15, TRAY_Y - 0.085, 0.008], [0.17, TRAY_Y - 0.105, 0.012]] as [number, number, number][]) (ctx.beginPath(), ctx.arc(X(cx2), Y(cy2), R(rr), 0, TAU), ctx.fill());
      ctx.beginPath();
      ctx.roundRect(X(bx - 0.06), Y(by - 0.04), R(0.24), R(0.07), R(0.03));
      ctx.fill();
      drawToy(ctx, L.kind[q], X(bx - 0.02), Y(by - 0.005), toyU * 0.5, 0, 0, t, {});
      font(0.03, 900);
      ctx.textAlign = 'left';
      ctx.fillStyle = hot ? '#d03a20' : '#7a4a20';
      ctx.fillText(hot ? '이거 물래!' : '이거 탐나…', X(bx + 0.015), Y(by + 0.005));
    }
  }
  // ═════════ 날아가는 장난감 ═════════
  for (const id of fly) {
    const v = s.vis[id], k = L.kind[id], q = Math.min(1, (vt - v.t0) / v.dur);
    if (v.style === 1) drawBalloon(ctx, X(v.x + 0.01), Y(v.y - 0.1), R(0.034), BAL[id % BAL.length], t, X(v.x), Y(v.y - 0.04));
    if (v.style === 2) {
      ctx.globalAlpha = q < 0.6 ? 1 : Math.max(0, 1 - (q - 0.6) / 0.4);
      drawToy(ctx, k, X(v.x), Y(v.y), toyU * v.s, Math.sin(q * 20) * 0.2, 0, t, {});
      ctx.globalAlpha = 1;
      continue;
    }
    if (v.style === 3) {
      ctx.globalAlpha = q < 0.75 ? 1 : Math.max(0, 1 - (q - 0.75) / 0.25);
      drawToy(ctx, k, X(v.x), Y(v.y), toyU * v.s, 0, 0, t, { pop: q * 1.6, open: true });
      if (k === CHEST) for (let j = 0; j < 3; j++) drawToy(ctx, CROWN, X(v.x + (j - 1) * 0.06 * q), Y(v.y - 0.04 - q * 0.14 - (j === 1 ? 0.03 * q : 0)), toyU * 0.7, 0, 0, t, {});
      ctx.globalAlpha = 1;
      continue;
    }
    drawToy(ctx, k, X(v.x), Y(v.y), toyU * v.s, v.a + v.wob, 0, t, {});
  }
  // 뭉치의 장난: 기차 끝에서 물고 더미로
  if (s.dogRun && vt >= s.dogRun.t0) {
    const dr = s.dogRun, u = vt - dr.t0;
    let px: number, py: number, dir: number;
    if (u < 16) (px = 0.127 + (dr.x0 - 0.127) * ease(u / 16)), (py = TRAY_Y - 0.05 - Math.sin((u / 16) * Math.PI) * 0.05), (dir = 1);
    else if (u < 60) {
      const v = s.vis[dr.id];
      (px = v.x - 0.02 * Math.sign(dr.x1 - dr.x0)), (py = v.y + 0.03), (dir = dr.x1 < dr.x0 ? -1 : 1);
    } else {
      const q = Math.min(1, (u - 60) / 30);
      (px = dr.x1 + (0.127 - dr.x1) * ease(q)), (py = dr.y1 + 0.03 + (TRAY_Y - 0.05 - dr.y1 - 0.03) * ease(q) - Math.sin(q * Math.PI) * 0.08), (dir = dr.x1 > 0.127 ? -1 : 1);
    }
    if (u < 100) drawPupRun(ctx, X(px), Y(py), R(0.056), dir, t, s);
  }
  // ═════════ 미리 보기 (기차 쪽) ═════════
  if (pre && pressK >= 0 && pre.st === 0) {
    ctx.setLineDash([R(0.012), R(0.01)]);
    pre.takes.forEach((z, j) => {
      const v = s.vis[z.id], [sx, sy] = slotXY(Math.min(TRAY - 1, z.slot));
      const col = z.why === 'twin' ? 'rgba(255,120,180,.95)' : z.why === 'balloon' ? 'rgba(130,210,255,.95)' : z.why === 'jack' ? 'rgba(210,160,255,.95)' : 'rgba(255,255,255,.9)';
      arrow(ctx, X(v.x), Y(v.y), X(sx), Y(sy - 0.02), 0.06 * w + j * 4, col, 2.5);
      ctx.globalAlpha = 0.5;
      drawToy(ctx, L.kind[z.id], X(sx), Y(sy), toyU * TRAY_S, 0, 0, t, {});
      ctx.globalAlpha = 1;
    });
    ctx.setLineDash([]);
    const last = pre.takes[pre.takes.length - 1];
    if (last) {
      const [sx] = slotXY(Math.min(TRAY - 1, last.slot));
      font(0.045, 900);
      ctx.textAlign = 'center';
      if (pre.fail) {
        ctx.fillStyle = `rgba(255,60,60,${0.25 + 0.15 * Math.sin(t * 0.4)})`;
        ctx.fillRect(X(0.16), Y(TRAY_Y - 0.03), R(0.8), R(0.09));
        outline(ctx, '꽉! 실패해요', X(0.56), Y(TRAY_Y - 0.045), '#ffb4b4');
      } else if (pre.pops) outline(ctx, pre.pops > 1 ? `뿅 ×${pre.pops}!` : '뿅!', X(Math.max(0.24, sx - 0.06)), Y(TRAY_Y - 0.06) + Math.sin(t * 0.3) * 2, '#fff1a8');
    }
  }
  // 가장자리 어둡게
  const vg = ctx.createRadialGradient(w / 2, h * 0.45, R(0.45), w / 2, h * 0.5, R(1.05));
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(20,5,20,.32)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
  // ═════════ 사건 연출 ═════════
  const say = (x: number, y: number, text: string, col: string, size: number) => {
    let rec = recentSay.get(s);
    if (!rec) recentSay.set(s, (rec = []));
    y = Math.max(Y(0.22), Math.min(Y(1.0), y));
    for (let k = 0; k < 6 && rec.some((q) => t - q.t < 45 && Math.abs(q.x - x) < w * 0.32 && Math.abs(q.y - y) < size + 5); k++) y -= size + 6;
    rec.push({ x, y, t });
    if (rec.length > 12) rec.shift();
    ctx.font = `800 ${size}px system-ui, sans-serif`;
    const hw = ctx.measureText(text).width / 2 + 6;
    fx.pop(Math.max(hw, Math.min(w - hw, x)), y, text, col, size);
  };
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    const due = e.d;
    if (due <= seenT || due > vt) continue;
    const x = X(e.x), y = Y(e.y);
    if (e.kind === 'reveal') fx.ring(x, y, '#fff6a8', R(0.07), 3), fx.burst(x, y, '#fff6a8', 6, 1.6, 1.5);
    if (e.kind === 'slide') {
      const n = e.n ?? 1;
      fx.burst(x, y + R(0.04), '#f3dcb0', 8 + n * 3, 2 + n * 0.4, 2.2), fx.burst(x, y + R(0.05), '#ffffff', 4, 1.5, 3), fx.kick(1.6 + n * 0.9);
    }
    if (e.kind === 'crash') {
      const n = e.n ?? 2;
      if (vt - (fx.memo.crashT ?? -99) > 50) fx.memo.crashN = 0;
      fx.ring(x, y, '#ffe6b8', R(0.12 + n * 0.03), 3 + n), fx.burst(x, y, '#f3dcb0', 18 + n * 6, 3 + n * 0.6, 2.6), fx.kick(4 + n * 1.5);
      if (n >= 3) fx.blink('#fff3dc', 0.12 + n * 0.03);
      // 글씨는 잦으면 겹치니 조금 쉬었다가 (흔들림·고리는 매번)
      if (vt - (fx.memo.crashT ?? -99) > 50 || n > (fx.memo.crashN ?? 0)) (fx.memo.crashT = vt), (fx.memo.crashN = n), say(x, y - R(0.08), e.text!, e.col!, Math.min(34, 20 + n * 3));
    }
    if (e.kind === 'thud') fx.burst(x, y + R(0.03), '#f3dcb0', 6, 1.8, 1.8), fx.kick(1.5);
    if (e.kind === 'pop') {
      const n = Math.min(4, e.n ?? 1);
      fx.burst(x, y, '#ffe066', 26 + n * 16, 4 + n * 1.2, 2.6 + n * 0.3), fx.burst(x, y, '#ff9fd0', 14 + n * 8, 3.4 + n, 2.2), fx.ring(x, y, '#ffffff', R(0.13 + n * 0.05), 4 + n), fx.kick(3 + n * 2.5);
      if (n >= 2) {
        for (const c of ['#7ec4ff', '#8fe0a0', '#c4a8ff']) fx.burst(x, y, c, 10 * n, 5 + n, 2.4);
        fx.ring(x, y, '#ffe066', R(0.3 + n * 0.06), 6), fx.blink('#fff6c8', 0.12 + n * 0.07);
      }
      if (n < 2) say(x, y - R(0.06), e.text!, e.col!, 24);
    }
    if (e.kind === 'goal') say(x, y, e.text!, e.col!, 18), fx.ring(x, y, '#bff7c4', R(0.08), 3);
    if (e.kind === 'twin') fx.ring(x, y, '#ff8fc0', R(0.14), 5), fx.burst(x, y, '#ff8fc0', 22, 3.6, 2.4), say(x, y - R(0.06), e.text!, e.col!, 22), fx.kick(5);
    if (e.kind === 'float') fx.burst(x, y, '#bfe9ff', 20, 2.6, 2.4), fx.ring(x, y, '#bfe9ff', R(0.12), 4), say(x, y - R(0.07), e.text!, e.col!, 21), fx.kick(2);
    if (e.kind === 'bonk') fx.burst(x, y, '#e8c8ff', 8, 2.4, 2);
    if (e.kind === 'jack') fx.ring(x, y, '#e0b0ff', R(0.22), 7), fx.burst(x, y, '#d090ff', 34, 5, 2.8), fx.burst(x, y, '#ffd23a', 16, 4, 2.4), fx.kick(8), fx.blink('#f3d2ff', 0.18), say(x, y - R(0.12), e.text!, e.col!, 24);
    if (e.kind === 'chest') fx.ring(x, y, '#ffe066', R(0.3), 8), fx.burst(x, y, '#ffe066', 60, 6, 3.2), fx.burst(x, y, '#ffffff', 24, 4, 2.4), fx.blink('#fff6c8', 0.4), fx.kick(9), say(x, y - R(0.12), e.text!, e.col!, 26);
    if (e.kind === 'unlock') fx.blink('#fff1a8', 0.25), say(w / 2, Y(0.5), e.text!, e.col!, 17);
    if (e.kind === 'dog') fx.burst(x, y, '#ffe9c4', 18, 3, 2.4), fx.ring(x, y, '#ffe9c4', R(0.1), 4), say(x, y - R(0.05), e.text!, e.col!, 22), fx.kick(4);
    if (e.kind === 'dogdrop') fx.burst(x, y, '#f3dcb0', 10, 2.5, 2), fx.kick(3), say(x, y - R(0.06), e.text!, e.col!, 16);
    if (e.kind === 'jam') fx.kick(9), fx.blink(th.hot, 0.25), fx.ring(X(0.56), Y(TRAY_Y), '#ff6a5a', R(0.35), 6);
    if (e.kind === 'streak') say(X(0.56), Y(TRAY_Y - 0.13), e.text!, e.col!, 18), fx.blink('#ffe066', 0.15);
    if (e.kind === 'blocked' || e.kind === 'locked') say(x, y - R(0.07), e.text!, e.col!, 15), fx.kick(2);
    if (e.kind === 'miss') say(x, y, e.text!, e.col!, 14);
    if (e.kind === 'stage') fx.blink('#fff6d6', 0.18);
    if (e.kind === 'clear') fx.burst(X(0.5), Y(0.55), '#ffe066', 46, 6, 3.2), fx.burst(X(0.5), Y(0.55), '#ff8fb1', 30, 5, 3), fx.ring(X(0.5), Y(0.55), '#ffe066', R(0.35), 6), fx.blink('#fff6c8', 0.25);
    if (e.kind === 'fail') fx.kick(9), fx.blink(th.hot, 0.22);
  }
  fx.memo.t = vt;
  ctx.restore();
  drawHud(ctx, s, d, w, X, Y, R, font, th);
}

function drawHud(ctx: CanvasRenderingContext2D, s: ToyState, d: StageDef, w: number, X: Fn, Y: Fn, R: Fn, font: (sz: number, w?: number) => void, th: Theme) {
  const t = s.t, S = s.S, L = s.L;
  const hb = R(0.068);
  ctx.fillStyle = 'rgba(40,22,40,.84)';
  ctx.fillRect(0, 0, w, hb);
  font(0.04, 900);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff1f6';
  ctx.fillText(`${s.stage + 1}/${STAGES.length}판 · ${d.emoji} ${d.name}`, R(0.03), hb * 0.52);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffd166';
  const stt = `★ ${s.stars}`;
  ctx.fillText(stt, w - R(0.03), hb * 0.52);
  ctx.fillStyle = th.hot;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - R(0.06) - ctx.measureText(stt).width, hb * 0.52);
  // 목표 칩 · 열쇠 칩 · 뭉치 칩 (창문 왼쪽 한 줄)
  {
    const g = d.goal, chips: [string, string, string][] = [];
    chips.push([g ? (g.kind === CROWN ? `🎯 👑 보물 ${S.mk[CROWN]}/1` : `🎯 ${KIND[g.kind].emo} ${S.mk[g.kind]}/${g.n}번 뿅`) : `🧺 남은 ${S.left + S.tray.length}개`, 'rgba(40,22,40,.72)', '#ffffff']);
    if (d.chest && !S.open) chips.push([`🔑 ${S.tray.filter((q) => L.kind[q] === KEY).length}/3`, 'rgba(90,60,10,.78)', '#ffe9a0']);
    if (d.dog && s.phase === 'play') chips.push([S.dogC <= 1 ? '🐶 다음 톡에 멍!' : `🐶 ${S.dogC}톡 뒤 멍`, S.dogC <= 1 ? `rgba(200,80,40,${0.78 + 0.2 * Math.sin(t * 0.3)})` : 'rgba(40,22,40,.72)', '#ffffff']);
    font(0.034, 900);
    ctx.textAlign = 'left';
    let x = R(0.02);
    for (const [txt, bg, fg] of chips) {
      const tw = ctx.measureText(txt).width + R(0.04);
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.roundRect(x, Y(0.083), tw, R(0.046), R(0.023));
      ctx.fill();
      ctx.fillStyle = fg;
      ctx.fillText(txt, x + R(0.02), Y(0.107));
      x += tw + R(0.012);
    }
  }
  // 새것 알림
  if (s.news && t - s.news.t < NEWS_T + 20) {
    const age = t - s.news.t, a = Math.min(1, age / 10, (NEWS_T + 20 - age) / 20), drop = Math.max(0, 10 - age) * 2;
    ctx.globalAlpha = a;
    font(0.036, 900);
    ctx.textAlign = 'center';
    const tx = `✨ ${s.news.text}`;
    let fs = 0.036;
    while (ctx.measureText(tx).width > w - R(0.05) && fs > 0.031) font((fs -= 0.001), 900);
    const tw2 = Math.min(w - 8, ctx.measureText(tx).width + 22), by2 = Y(0.172) - drop;
    ctx.fillStyle = 'rgba(60,24,60,.92)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw2 / 2, by2 - R(0.027), tw2, R(0.054), R(0.027));
    ctx.fill();
    ctx.fillStyle = '#fff1f6';
    ctx.fillText(tx, w / 2, by2 + 1);
    ctx.globalAlpha = 1;
  }
  drawBanner(ctx, s, w, Y, R, font);
  // 판 시작 큰 글씨 (새 장치가 있는 판은 소개 카드로)
  if (!drawCard(ctx, s, d, w, X, Y, R, font)) {
    const age = t - s.startT;
    if (age < 100 && s.phase === 'play') {
      const a = Math.min(1, age / 8, (100 - age) / 20), sc = 1 + Math.max(0, 8 - age) * 0.04;
      ctx.globalAlpha = a;
      ctx.save();
      ctx.translate(w / 2, Y(0.34));
      ctx.scale(sc, sc);
      font(0.075, 900);
      ctx.textAlign = 'center';
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(50,20,40,.8)';
      const big = `${d.emoji} ${s.stage + 1}판 · ${d.name}`;
      ctx.strokeText(big, 0, 0);
      ctx.fillStyle = '#fff6d6';
      ctx.fillText(big, 0, 0);
      font(0.042, 800);
      const g = d.goal, sub = g ? (g.kind === CROWN ? '🔑 셋을 모아 보물 상자를 열어요' : `${KIND[g.kind].emo} ${KIND[g.kind].name} ${g.n * 3}개를 뿅!`) : `장난감 ${L.N}개를 다 치워요`;
      ctx.strokeText(sub, 0, R(0.065));
      ctx.fillText(sub, 0, R(0.065));
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }
  // 결과
  if (s.phase === 'result') {
    const age = s.pt, a = Math.min(1, age / 10);
    ctx.globalAlpha = a;
    ctx.fillStyle = s.ok ? 'rgba(40,40,30,.66)' : 'rgba(70,20,30,.66)';
    ctx.fillRect(0, Y(0.42), w, R(0.27));
    ctx.textAlign = 'center';
    font(s.ok ? 0.06 : 0.052, 900);
    ctx.fillStyle = s.ok ? '#fff1a8' : '#ffd0c8';
    ctx.fillText(s.ok ? (s.won ? '방 정리 끝! 🎉' : `${d.emoji} ${d.name} 정리 끝!`) : s.why, w / 2, Y(0.48));
    if (s.ok) {
      for (let k = 0; k < 3; k++) {
        const ag = age - 14 - k * 10, got = k < s.got;
        if (ag < 0) continue;
        const sc = got ? 1 + Math.max(0, 1 - ag / 8) * 0.8 : 1;
        font(0.08 * sc, 900);
        ctx.fillStyle = got ? '#ffd166' : 'rgba(255,255,255,.35)';
        ctx.fillText(got ? '★' : '☆', w / 2 + (k - 1) * R(0.1), Y(0.57));
        if (got && (juice(s).memo['star' + k] ?? -1) < s.clearT) (juice(s).memo['star' + k] = s.clearT), juice(s).burst(w / 2 + (k - 1) * R(0.1), Y(0.57), '#ffe066', 14, 3, 2.4);
      }
      font(0.036, 800);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`기차 최대 ${S.peak}칸 · 연속 뿅 ${S.best}번`, w / 2, Y(0.645));
    } else {
      font(0.042, 800);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(s.hearts > 0 ? '♥ -1 · 이 방을 처음부터 다시' : '하트를 다 썼어요 — 끝', w / 2, Y(0.57));
    }
    ctx.globalAlpha = 1;
  }
  // ═════════ 아래 띠: 별 목표 · 안내 ═════════
  {
    ctx.fillStyle = 'rgba(40,22,40,.55)';
    ctx.fillRect(0, Y(1.215), w, Y(A) - Y(1.215));
    const y2 = Y(1.262), chips = [
      { txt: d.goal ? '목표' : '다 치우기', st: s.phase === 'result' && s.ok ? true : null },
      { txt: `기차 ${d.P}칸까지`, st: S.peak > d.P ? false : s.phase === 'result' && s.ok ? true : null },
      { txt: `연속 뿅 ${d.C}`, st: S.best >= d.C ? true : null },
    ];
    const gx0 = R(0.02), gw = (w - R(0.04)) / 3;
    chips.forEach(({ txt, st }, k) => {
      const gx = gx0 + k * gw;
      ctx.fillStyle = st === true ? 'rgba(255,209,102,.34)' : st === false ? 'rgba(0,0,0,.35)' : 'rgba(255,240,250,.14)';
      ctx.beginPath();
      ctx.roundRect(gx + 2, y2 - R(0.027), gw - 4, R(0.054), R(0.027));
      ctx.fill();
      ctx.textAlign = 'center';
      font(0.036, 800);
      ctx.fillStyle = st === false ? 'rgba(255,255,255,.45)' : '#fff6f0';
      ctx.fillText(`${st === true ? '★' : st === false ? '✗' : '☆'} ${txt}`, gx + gw / 2, y2 + 1);
    });
    // 지금 기차 칸 · 연속 뿅
    font(0.033, 800);
    ctx.textAlign = 'left';
    ctx.fillStyle = S.tray.length > d.P ? '#ffb4b4' : '#e8dcf0';
    ctx.fillText(`🚂 지금 ${S.tray.length}칸 (최대 ${S.peak})`, R(0.04), Y(1.33));
    if (S.combo > 0 && s.phase === 'play') {
      ctx.textAlign = 'right';
      ctx.fillStyle = S.combo >= d.C ? '#ffd166' : '#c8f7c5';
      ctx.fillText(`연속 뿅 ${S.combo}`, w - R(0.04), Y(1.33));
    }
    const y3 = Y(1.397);
    let tp = '👆 장난감을 톡! 누르고 있으면 미리 보여요';
    if (s.stage === 0 && s.taps === 0) tp = '👆 위에 드러난 장난감을 톡 — 기차로 쏙!';
    else if (s.stage === 0 && S.pops === 0) tp = '👆 같은 장난감 셋을 모으면 뿅!';
    else if (s.down && s.press >= 0) tp = '떼면 쏙! · 장난감 밖에서 떼면 취소';
    else if (s.phase === 'result') tp = s.ok ? (s.won ? '🎉 여덟 방을 다 정리했어요!' : '다음 방으로 가요!') : '같은 방을 다시 — 이번엔 눌러 보고 톡';
    else if (S.tray.length >= TRAY - 2) tp = '⚠️ 기차가 거의 찼어요 — 셋이 되는 걸 골라요!';
    else if (d.chest && !S.open) tp = '🔒 보물 상자는 🔑 열쇠 셋을 뿅 해야 열려요';
    else if (s.stage > 0 || s.taps > 3) tp = d.tip;
    ctx.textAlign = 'center';
    font(0.036, 800);
    let fs = 0.036;
    while (ctx.measureText(tp).width > w - R(0.04) && fs > 0.032) font((fs -= 0.001), 800);
    ctx.fillStyle = '#fff0fa';
    ctx.fillText(tp, w / 2, y3);
  }
  // 첫 판: 손가락으로 추천 장난감
  if (s.stage === 0 && S.pops === 0 && s.phase === 'play' && t - s.startT > 50 && !s.down && t >= s.cool) {
    const k = s.taps === 0 ? S.cols[0][S.cols[0].length - 1] : habitPick(L, S);
    if (k !== undefined && k >= 0) {
      const [x, y] = posOf(L, S, k), bob = Math.sin(t * 0.15) * R(0.012);
      ctx.font = `${Math.max(16, R(0.07))}px system-ui`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('👆', X(x) + R(0.02), Y(y) + R(0.085) + bob);
      ctx.strokeStyle = 'rgba(255,255,255,.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(X(x), Y(y), R(U * 0.55) + Math.sin(t * 0.15) * 2, 0, TAU);
      ctx.stroke();
    }
  }
  ctx.textBaseline = 'alphabetic';
}

// ───────── 장치 눈에 띄게 ─────────
/** 장치 장난감의 빛깔 (없으면 '') */
function gimCol(L: Level, S: Sim, id: number, inPile: Set<number>) {
  const k = L.kind[id];
  if (k === JACK) return '#c58cff';
  if (k === CHEST) return '#ffd84d';
  if (k === KEY) return '#fff0a0';
  if (L.twin[id] >= 0 && inPile.has(L.twin[id])) return '#ff6fb0';
  if (L.bal[id] && !S.flown.includes(id)) return '#7fd4ff';
  return '';
}
function isNewGim(key: string, L: Level, S: Sim, id: number, inPile: Set<number>) {
  const k = L.kind[id];
  if (key === 'play') return k === L.d.goal?.kind;
  if (key === 'jack') return k === JACK;
  if (key === 'twin') return L.twin[id] >= 0 && inPile.has(L.twin[id]);
  if (key === 'chest') return k === CHEST || k === KEY;
  if (key === 'balloon') return L.bal[id] && !S.flown.includes(id);
  if (key === 'dream') return !!gimCol(L, S, id, inPile);
  return false;
}
/** 새 장치 소개 카드: 무엇이 바뀌고, 그래서 무엇을 해야 하나 */
const CARDS: Record<string, { title: string; l1: string; l2: string }> = {
  play: { title: '🎯 목표 장난감', l1: '곰 인형 6개를 뿅 하면 끝 — 나머진 남아도 돼요', l2: '→ 곰 위부터 파내요' },
  jack: { title: '🎁 깜짝 상자', l1: '톡 하면 광대가 양옆 꼭대기를 기차로 퉁! 퉁!', l2: '→ 기차 2칸 비우고, 반가운 게 옆일 때 열기' },
  twin: { title: '🎀 리본 쌍둥이', l1: '하나를 꺼내면 묻힌 짝이 쑥! 같이 기차로', l2: '→ 깊이 묻힌 공룡을 리본으로 뽑아요' },
  chest: { title: '🔒 보물 상자', l1: '🔑 셋을 뿅 해야 열려요 · 무거워서 안 굴러요', l2: '→ 열쇠부터 파내고 상자를 톡!' },
  balloon: { title: '🎈 풍선 장난감', l1: '위가 비면 저절로 둥실 — 기차에 타 버려요', l2: '→ 풍선 위는 기차가 반길 때 치워요' },
  dog: { title: '🐶 뭉치의 장난', l1: '5톡마다 기차 맨 끝 장난감을 물고 더미로!', l2: '→ 맨 끝엔 필요 없는 걸 두세요' },
  dream: { title: '🌙 전부 다 나와요', l1: '상자·리본·열쇠·풍선·뭉치가 한 방에!', l2: '→ 눌러 보고 순서를 정해요' },
};
function drawCard(ctx: CanvasRenderingContext2D, s: ToyState, d: StageDef, w: number, X: Fn, Y: Fn, R: Fn, font: (sz: number, w?: number) => void) {
  const c = CARDS[d.key], age = s.t - s.startT, t = s.t;
  // 첫 톡을 하면 곧 사라진다
  const gone = s.S.taps > 0 ? s.t - s.lastTap : -99;
  if (!c || age > 230 || s.phase !== 'play' || gone > 14) return false;
  const a = Math.min(1, age / 10, (230 - age) / 25, gone >= 0 ? 1 - gone / 14 : 1), sc = 1 + Math.max(0, 10 - age) * 0.03;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(w / 2, Y(0.33));
  ctx.scale(sc, sc);
  ctx.translate(-w / 2, -Y(0.33));
  const x0 = R(0.04), y0 = Y(0.205), cw = w - R(0.08), ch = R(0.25);
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.beginPath();
  ctx.roundRect(x0 + 3, y0 + 5, cw, ch, R(0.03));
  ctx.fill();
  const g = ctx.createLinearGradient(0, y0, 0, y0 + ch);
  g.addColorStop(0, '#5a2a6a');
  g.addColorStop(1, '#3a1a48');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(x0, y0, cw, ch, R(0.03));
  ctx.fill();
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // NEW 리본
  ctx.fillStyle = '#ff3d7f';
  ctx.beginPath();
  ctx.roundRect(x0 + cw - R(0.2), y0 - R(0.02), R(0.18), R(0.045), R(0.02));
  ctx.fill();
  font(0.032, 900);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('새 장치!', x0 + cw - R(0.11), y0 + R(0.003));
  // 아이콘
  const ix = X(0.15), iy = Y(0.3), u = R(0.15), bob = Math.sin(t * 0.15) * 3;
  const glow = ctx.createRadialGradient(ix, iy, 2, ix, iy, u * 0.8);
  glow.addColorStop(0, 'rgba(255,230,140,.55)');
  glow.addColorStop(1, 'rgba(255,230,140,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(ix, iy, u * 0.8, 0, TAU);
  ctx.fill();
  if (d.key === 'dog') drawPup(ctx, ix, iy + bob, u * 0.4, s, t, 'smug');
  else if (d.key === 'twin') (drawToy(ctx, DINO, ix - u * 0.25, iy + bob, u * 0.62, -0.2, 0, t, { twin: true }), drawToy(ctx, DINO, ix + u * 0.25, iy - bob, u * 0.62, 0.2, 0, t, { twin: true }));
  else if (d.key === 'balloon') (drawBalloon(ctx, ix + u * 0.2, iy - u * 0.3 + bob, u * 0.22, '#ff5a8a', t, ix, iy - u * 0.1), drawToy(ctx, BALL, ix, iy + u * 0.1, u * 0.7, 0, 0, t, {}));
  else drawToy(ctx, d.key === 'play' ? BEAR : d.key === 'jack' ? JACK : CHEST, ix, iy + bob, u * 0.8, Math.sin(t * 0.1) * 0.1, 0, t, d.key === 'jack' ? { pop: 0.6 + 0.4 * Math.abs(Math.sin(t * 0.08)) } : { open: d.key === 'dream' });
  // 글
  ctx.textAlign = 'left';
  font(0.034, 800);
  ctx.fillStyle = '#e8d6f0';
  ctx.fillText(`${s.stage + 1}판 · ${d.emoji} ${d.name}`, X(0.27), Y(0.24));
  font(0.056, 900);
  ctx.fillStyle = '#ffe066';
  ctx.fillText(c.title, X(0.27), Y(0.292));
  const fit = (txt: string, x: number, y: number, col: string, wgt: number) => {
    let fs = 0.036;
    font(fs, wgt);
    while (ctx.measureText(txt).width > w - x - R(0.06) && fs > 0.031) font((fs -= 0.001), wgt);
    ctx.fillStyle = col;
    ctx.fillText(txt, x, y);
  };
  fit(c.l1, X(0.08), Y(0.37), '#ffffff', 800);
  fit(c.l2, X(0.08), Y(0.42), '#9ff0b0', 900);
  ctx.restore();
  ctx.textBaseline = 'middle';
  return true;
}
/** 연속 뿅·보물 같은 큰 순간의 커다란 글씨 */
function drawBanner(ctx: CanvasRenderingContext2D, s: ToyState, w: number, Y: Fn, R: Fn, font: (sz: number, w?: number) => void) {
  const b = s.banner;
  if (!b) return;
  const age = s.vt - b.at;
  if (age < 0 || age > 80) return;
  const a = Math.min(1, (80 - age) / 16), sc = 1 + Math.max(0, 1 - age / 7) * 0.9, cy = Y(0.6);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(w / 2, cy);
  if (b.n >= 3) {
    ctx.save();
    ctx.rotate(age * 0.02);
    for (let k = 0; k < 12; k++) {
      ctx.rotate(TAU / 12);
      ctx.fillStyle = k % 2 ? 'rgba(255,230,120,.22)' : 'rgba(255,160,210,.18)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(R(0.6), -R(0.06));
      ctx.lineTo(R(0.6), R(0.06));
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.rotate(Math.sin(age * 0.3) * 0.04 * Math.max(0, 1 - age / 30));
  ctx.scale(sc, sc);
  font(Math.min(0.11, 0.075 + b.n * 0.01), 900);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 7;
  ctx.strokeStyle = 'rgba(60,20,50,.85)';
  ctx.strokeText(b.text, 0, 0);
  ctx.fillStyle = b.col;
  ctx.fillText(b.text, 0, 0);
  font(0.04, 900);
  ctx.lineWidth = 4;
  ctx.strokeText(b.sub, 0, R(0.075));
  ctx.fillStyle = '#ffffff';
  ctx.fillText(b.sub, 0, R(0.075));
  ctx.restore();
}
