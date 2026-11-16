/**
 * 도르래 저울 승강기 (28라운드: 처음 보는 규칙) — 도르래 저울 × 가리키기(톡) × 턴제화.
 * 기준 9(손이 하는 일은 하나): 동물을 톡. 누르고 있는 동안 옮겼을 때 두 바구니가 설 층과 내릴 동물(연쇄 포함)이 흐리게 보이고,
 *   떼면 동물이 폴짝 건너뛰어 반대 바구니로 옮겨 탄다(동물 밖에서 떼면 취소). 키보드는 화살표 커서 + 스페이스.
 * 규칙(결정적): 7층 아파트 양옆의 두 바구니는 지붕 도르래로 이어져 있다. 왼쪽이 오른쪽보다 d만큼 무거우면
 *   왼쪽 바구니는 가운데(4층)에서 d층 아래, 오른쪽은 d층 위에 선다(1층·7층에서 멈춤). 높이는 무게 차이만으로 정해진다.
 *   바구니가 선 층이 어떤 동물이 원하는 층이면 그 동물이 폴짝 내린다 → 무게가 빠져 저울이 또 움직인다(연쇄).
 * 와우: 첫 톡 — 코끼리가 반대 바구니로 건너뛰면 그쪽이 1층에 쿵! 코끼리·고양이 셋이 우르르 내리고, 반대쪽 생쥐는 7층으로 휘익.
 *   내릴 때마다 무게가 빠져 저울이 또 움직이고 다음 동물이 내린다(연쇄가 길수록 글자·흔들림이 커지고 잠깐 느려짐).
 * 판(이사 날) 8개: 목표 = 동물을 모두 원하는 층에. 별 = ★ 다 내림 · ★ 옮기기 N번 안에 · ★ 최소 옮기기(P번).
 *   실패 = 옮기기를 다 씀 · 남은 옮기기로는 다 못 내림 → 하트 -1, 그 판을 처음부터. 하트 셋을 다 잃거나 8판을 마치면 끝.
 * 펼쳐짐(하는 일이 바뀐다): 1판 코끼리와 생쥐(정해 둔 배우는 판, 톡·저울) → 2판 연쇄(내리면 또 움직임 — 순서 계획) → 3판 손님(층에서 기다리다
 *   바구니가 서면 올라탐 — 데리러 가기) → 4판 짐 상자(무게만, 안 내림 — 평형추로 쓰기) → 5판 겁쟁이 토끼(빈 바구니엔 혼자 안 탐 —
 *   친구 먼저 보내기) → 6판 풍선 병아리(무게가 마이너스 — 바구니를 들어 올림) → 7판 잠꾸러기 코알라(1층에 쿵 떨어져야 깸 —
 *   일부러 쿵) → 8판 전부.
 * 웃음: 지붕의 관리인 펭귄은 바구니가 휘익 날면 눈이 동그래지고, 연쇄면 우쭐, 꼼짝 못 하면 어질어질 별.
 *   바구니가 1층에 쿵 떨어지면 탄 동물들 털이 쭈뼛, 꼭대기로 휘익 올라가면 귀가 펄럭. 내린 동물은 창문에서 손을 흔든다.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5;
/** 층: 0(1층) ~ TOP(7층). 두 바구니 높이의 합은 늘 TOP(도르래 줄 길이) */
const TOP = 6, MID = 3;
/** 화면: 층 k의 바닥 선 y = GY - k*FH */
const GY = 1.17, FH = 0.13;
const BX = [0.175, 0.825], BW = 0.31, HIT = 0.062;
const PUL_Y = 0.15, PUL_R = 0.045, B0 = 0.355, B1 = 0.645;
/** 연출 시간(틱): 건너뛰기 · 내리기 · 층당 이동 · 최소 이동 */
const LEAP = 20, HOP = 26, PER_FLOOR = 6, MIN_MOVE = 10;
const RESULT_OK = 200, RESULT_FAIL = 170, NEWS_T = 200, SPOT_T = 150;
/** 별 점수는 뒤 판일수록 크다 (뒤 판이 어렵다) */
const STAR_PTS = 100, STAR_UP = 30, LEFT_PTS = 10, WIN_PTS = 200;

// ───────────────────────────── 동물 ─────────────────────────────
type Kind = 'ani' | 'box' | 'coward' | 'balloon' | 'sleepy';
interface Sp { e: string; name: string; w: number; kind: Kind }
const SP: Record<string, Sp> = {
  m: { e: '🐭', name: '생쥐', w: 1, kind: 'ani' },
  c: { e: '🐱', name: '고양이', w: 2, kind: 'ani' },
  d: { e: '🐶', name: '강아지', w: 3, kind: 'ani' },
  p: { e: '🐷', name: '돼지', w: 4, kind: 'ani' },
  b: { e: '🐻', name: '곰', w: 5, kind: 'ani' },
  E: { e: '🐘', name: '코끼리', w: 6, kind: 'ani' },
  X: { e: '📦', name: '짐 상자', w: 2, kind: 'box' },
  r: { e: '🐰', name: '겁쟁이 토끼', w: 2, kind: 'coward' },
  k: { e: '🐥', name: '풍선 병아리', w: -2, kind: 'balloon' },
  z: { e: '🐨', name: '잠꾸러기 코알라', w: 3, kind: 'sleepy' },
};

interface StageDef {
  key: string; name: string; emoji: string; news: string; tip: string;
  /** 탈 동물 (글자 = SP). 맨 뒤 guests개는 층에서 기다리는 손님 */
  rosters: string[]; guests: number;
  par: [number, number]; slack: number; s2: number;
  /** 아무렇게나 해도 통과할 확률 하한 (0 = 안 봄) · 첫 수에 내려야 할 수 · 연쇄 필요 */
  luck: number; wow: number; chain: boolean;
  /** NEW 스포트라이트를 비출 동물 종류 */
  spot?: Kind | 'guest';
  /** 배우는 판: 정해 둔 판 (글자·원하는 층·처음 바구니) */
  fixed?: { ros: string; f: number[]; at: number[] };
}
export const STAGES: StageDef[] = [
  { key: 'basic', name: '코끼리와 생쥐', emoji: '🐘', news: '⚖️ 무거운 쪽이 내려가요 — 동물을 톡!', tip: '⚖️ 무게 차이만큼 가운데(4층)에서 내려가요', rosters: ['Emmcc'], guests: 0, par: [1, 3], slack: 4, s2: 2, luck: 0.92, wow: 3, chain: false, fixed: { ros: 'Emmcc', f: [0, 2, 1, 0, 0], at: [0, 0, 1, 1, 1] } },
  { key: 'chain', name: '연쇄 이사', emoji: '⛓️', news: '⛓️ 연쇄 이사 — 누구를 먼저 내릴지 순서를 짜요', tip: '⛓️ 누가 먼저 내리면 저울이 또 움직여요', rosters: ['pmmc', 'Emcd', 'bmcd', 'Emmd', 'pmmc', 'bmcd'], guests: 0, par: [2, 4], slack: 4, s2: 2, luck: 0.55, wow: 2, chain: true },
  { key: 'guest', name: '기다리는 손님', emoji: '🙋', news: '🙋 손님 — 바구니가 그 층에 서면 올라타요', tip: '🙋 손님 층에 바구니를 세워 태워요', rosters: ['Emcdmc', 'Emmdmd', 'bmcdmc'], guests: 2, par: [3, 6], slack: 4, s2: 1, luck: 0, wow: 2, chain: true, spot: 'guest' },
  { key: 'box', name: '짐 상자', emoji: '📦', news: '📦 짐 상자 — 무게만 있고 안 내려요', tip: '📦 짐 상자로 저울을 맞춰요', rosters: ['EmcdXm', 'EmmdXc', 'bmcdXm'], guests: 1, par: [3, 6], slack: 4, s2: 1, luck: 0, wow: 2, chain: true, spot: 'box' },
  { key: 'coward', name: '겁쟁이 토끼', emoji: '🐰', news: '🐰 겁쟁이 — 빈 바구니엔 혼자 안 타요', tip: '🐰 토끼는 친구가 탄 바구니로만', rosters: ['Emcdrm', 'Emdrrc', 'bmcdrm'], guests: 1, par: [3, 6], slack: 4, s2: 1, luck: 0, wow: 2, chain: true, spot: 'coward' },
  { key: 'balloon', name: '풍선 병아리', emoji: '🎈', news: '🎈 풍선 병아리 — 무게가 거꾸로, 바구니를 들어 올려요', tip: '🎈 병아리가 탄 쪽은 가벼워져요', rosters: ['Emcdkm', 'Emdkcm', 'bmcdkc'], guests: 1, par: [3, 6], slack: 4, s2: 1, luck: 0, wow: 2, chain: true, spot: 'balloon' },
  { key: 'sleepy', name: '잠꾸러기', emoji: '😴', news: '😴 잠꾸러기 — 1층에 쿵 떨어져야 깨서 내려요', tip: '😴 코알라는 쿵! 해야 깨요', rosters: ['Emcdzm', 'Emdzcm', 'bmczdm'], guests: 1, par: [3, 6], slack: 4, s2: 1, luck: 0, wow: 2, chain: true, spot: 'sleepy' },
  { key: 'all', name: '대이사', emoji: '🏢', news: '🏢 마지막 이사 날 — 다 나와요!', tip: '🙋 📦 🐰 🎈 😴 — 순서를 짜요', rosters: ['EmdzkXrc', 'EmczrkXm', 'bmdzrXkc'], guests: 1, par: [4, 7], slack: 4, s2: 1, luck: 0, wow: 2, chain: true },
];
export const STAGE_COUNT = STAGES.length;

// ───────────────────────────── 저울 시뮬레이션 ─────────────────────────────
/** 손님: at = 3(기다림), g층 gs쪽 문 앞. 내린 동물: at = 2. 바구니: 0 왼쪽, 1 오른쪽 */
export interface Pas { sp: string; e: string; name: string; w: number; f: number; kind: Kind; g: number; gs: number; slot: number; nf: number }
export interface Level { P: Pas[]; n: number; at0: number[]; par: number; sol: number[]; limit: number; s2: number; luck: number; habit: number; greedy: number; careful: number; wow: number; dist: Map<number, number> }
export interface Sim { at: number[]; awake: number; moves: number; offs: number; bestOff: number; bestChain: number }
export interface Stop { hL: number; slam: number; off: number[]; board: number[]; wake: number[] }

const clampF = (x: number) => Math.max(0, Math.min(TOP, x));
/** 왼쪽 바구니가 서는 층: 가운데에서 (왼쪽 무게 − 오른쪽 무게)만큼 아래 */
export function hOf(L: Level, at: number[]) {
  let d = 0;
  for (let i = 0; i < L.n; i++) {
    const a = at[i];
    if (a === 0) d += L.P[i].w;
    else if (a === 1) d -= L.P[i].w;
  }
  return clampF(MID - d);
}
const weightOf = (L: Level, at: number[], side: number) => at.reduce((a, b, i) => a + (b === side ? L.P[i].w : 0), 0);
export const newSim = (L: Level): Sim => ({ at: L.at0.slice(), awake: 0, moves: 0, offs: 0, bestOff: 0, bestChain: 0 });
const cloneSim = (S: Sim): Sim => ({ ...S, at: S.at.slice() });
export const doneSim = (L: Level, S: Sim) => S.at.every((a, i) => a === 2 || L.P[i].kind === 'box');

/** 저울이 멈출 때까지: 서면 내리고(·타고) → 무게가 바뀌어 또 움직이고 … */
function settle(L: Level, S: Sim, prev: number, rec?: Stop[]) {
  let offs = 0, chain = 0;
  for (let guard = 0; guard < 40; guard++) {
    const hL = hOf(L, S.at), hR = TOP - hL;
    const slam = (hL === 0 && prev > 0 ? 1 : 0) | (hR === 0 && TOP - prev > 0 ? 2 : 0);
    const wake: number[] = [], off: number[] = [], board: number[] = [];
    if (slam)
      for (let i = 0; i < L.n; i++) {
        const a = S.at[i];
        if (L.P[i].kind === 'sleepy' && a < 2 && (slam >> a) & 1 && !((S.awake >> i) & 1)) (S.awake |= 1 << i), wake.push(i);
      }
    for (let i = 0; i < L.n; i++) {
      const a = S.at[i], p = L.P[i];
      if (a < 2 && p.kind !== 'box' && (a === 0 ? hL : hR) === p.f && (p.kind !== 'sleepy' || (S.awake >> i) & 1)) off.push(i);
      else if (a === 3 && (p.gs === 0 ? hL : hR) === p.g) board.push(i);
    }
    rec?.push({ hL, slam, off, board, wake });
    if (!off.length && !board.length) break;
    for (const i of off) S.at[i] = 2;
    for (const i of board) S.at[i] = L.P[i].gs;
    offs += off.length;
    if (off.length) chain++;
    prev = hL;
  }
  S.offs += offs;
  S.bestOff = Math.max(S.bestOff, offs);
  S.bestChain = Math.max(S.bestChain, chain);
  return { offs, chain };
}
/** 옮길 수 있나: 바구니에 탄 동물만. 겁쟁이는 빈 바구니로는 안 간다 */
export function canMove(L: Level, S: Sim, i: number) {
  const a = S.at[i];
  if (a > 1) return false;
  if (L.P[i].kind === 'coward') {
    for (let j = 0; j < L.n; j++) if (j !== i && S.at[j] === 1 - a) return true;
    return false;
  }
  return true;
}
export function moveSim(L: Level, S: Sim, i: number, rec?: Stop[]) {
  const p0 = hOf(L, S.at);
  S.at[i] ^= 1;
  S.moves++;
  return settle(L, S, p0, rec);
}
function keyOf(L: Level, S: Sim) {
  let k = 0;
  for (let i = L.n - 1; i >= 0; i--) k = k * 4 + S.at[i];
  return k + S.awake * Math.pow(4, L.n);
}
/** 판의 모든 상태를 한 번 훑어 상태마다 '다 내리기까지 남은 최소 옮기기'를 적어 둔다 (상태가 수백 개뿐이라 정확히) */
function buildDist(L: Level, cap = 20000): Map<number, number> | null {
  const S0 = newSim(L), keys = [keyOf(L, S0)], sims = [S0], idx = new Map<number, number>([[keys[0], 0]]), nx: number[][] = [], goals: number[] = [];
  for (let h = 0; h < sims.length; h++) {
    const S = sims[h], out: number[] = [];
    nx.push(out);
    if (doneSim(L, S)) {
      goals.push(h);
      continue;
    }
    for (let i = 0; i < L.n; i++) {
      if (!canMove(L, S, i)) continue;
      const S2 = cloneSim(S);
      moveSim(L, S2, i);
      const k = keyOf(L, S2);
      let j = idx.get(k);
      if (j === undefined) {
        if (sims.length >= cap) return null;
        (j = sims.length), idx.set(k, j), keys.push(k), sims.push(S2);
      }
      out.push(j);
    }
  }
  const rev: number[][] = sims.map(() => []);
  nx.forEach((out, a) => out.forEach((b) => rev[b].push(a)));
  const dd = new Array<number>(sims.length).fill(-1), q = goals.slice();
  for (const g of goals) dd[g] = 0;
  for (let h = 0; h < q.length; h++) for (const a of rev[q[h]]) if (dd[a] < 0) (dd[a] = dd[q[h]] + 1), q.push(a);
  const dist = new Map<number, number>();
  dd.forEach((v, j) => v >= 0 && dist.set(keys[j], v));
  return dist;
}
/** 지금부터 다 내리려면 최소 몇 번 (못 내리면 Infinity = 막다른 길) */
export const distOf = (L: Level, S: Sim) => (doneSim(L, S) ? 0 : L.dist.get(keyOf(L, S)) ?? Infinity);
/** 가장 적게 옮기는 길의 다음 동물 (없으면 -1) */
export function bestMove(L: Level, S: Sim) {
  const d0 = distOf(L, S);
  if (!isFinite(d0) || d0 === 0) return -1;
  for (let i = 0; i < L.n; i++) {
    if (!canMove(L, S, i)) continue;
    const S2 = cloneSim(S);
    moveSim(L, S2, i);
    if (distOf(L, S2) === d0 - 1) return i;
  }
  return -1;
}
/** 아무렇게나(옮길 수 있는 동물 중 아무나) 두면 limit번 안에 다 내릴 확률 — 정확히(DP) */
function luckOf(L: Level, limit: number) {
  const memo = new Map<number, number>();
  const P = (S: Sim, k: number): number => {
    if (doneSim(L, S)) return 1;
    if (k <= 0) return 0;
    const key = keyOf(L, S) * 16 + k, hit = memo.get(key);
    if (hit !== undefined) return hit;
    let sum = 0, n = 0;
    for (let i = 0; i < L.n; i++) {
      if (!canMove(L, S, i)) continue;
      const S2 = cloneSim(S);
      moveSim(L, S2, i);
      sum += P(S2, k - 1);
      n++;
    }
    const v = n ? sum / n : 0;
    memo.set(key, v);
    return v;
  };
  return P(newSim(L), limit);
}
/** 버릇 하나(측정용): 지금 선 층이 원하는 층에 가장 가까운 동물부터 옮긴다 */
export function habitPick(L: Level, S: Sim) {
  const hL = hOf(L, S.at);
  let b = -1, bd = 99;
  for (let i = 0; i < L.n; i++) {
    if (!canMove(L, S, i) || L.P[i].kind === 'box') continue;
    const d = Math.abs((S.at[i] === 0 ? hL : TOP - hL) - L.P[i].f);
    if (d < bd) (bd = d), (b = i);
  }
  return b >= 0 ? b : L.P.findIndex((_, i) => canMove(L, S, i));
}
/** 버릇 둘(측정용): 지금 당장 가장 많이 내리는 동물 (같으면 위 버릇) */
export function greedyPick(L: Level, S: Sim) {
  const hL = hOf(L, S.at);
  let b = -1, bv = -1e9;
  for (let i = 0; i < L.n; i++) {
    if (!canMove(L, S, i)) continue;
    const S2 = cloneSim(S), r = moveSim(L, S2, i);
    const v = r.offs * 10 - (L.P[i].kind === 'box' ? 5 : Math.abs((S.at[i] === 0 ? hL : TOP - hL) - L.P[i].f) * 0.1);
    if (v > bv) (bv = v), (b = i);
  }
  return b;
}
/** 미리 보기를 보는 사람(측정용): 막다른 길(⚠)은 피하고, 당장 많이 내리는 동물 */
export function carefulPick(L: Level, S: Sim) {
  const hL = hOf(L, S.at);
  let b = -1, bv = -1e9;
  for (let i = 0; i < L.n; i++) {
    if (!canMove(L, S, i)) continue;
    const S2 = cloneSim(S), r = moveSim(L, S2, i);
    if (!isFinite(distOf(L, S2))) continue;
    const v = r.offs * 10 - (L.P[i].kind === 'box' ? 0.5 : Math.abs((S.at[i] === 0 ? hL : TOP - hL) - L.P[i].f) * 0.1);
    if (v > bv) (bv = v), (b = i);
  }
  return b >= 0 ? b : greedyPick(L, S);
}
function runPolicy(L: Level, pick: (L: Level, S: Sim) => number) {
  const S = newSim(L);
  while (!doneSim(L, S) && S.moves < L.limit) {
    const i = pick(L, S);
    if (i < 0) break;
    moveSim(L, S, i);
  }
  return doneSim(L, S) ? S.moves : 99;
}
export const starsFor = (L: Level, moves: number) => 1 + (moves <= L.s2 ? 1 : 0) + (moves <= L.par ? 1 : 0);

// ───────────────────────────── 판 만들기 ─────────────────────────────
function tryBuild(d: StageDef, r: Rng, mirror = false): Level | null {
  const fx = d.fixed, ros = fx ? fx.ros : d.rosters[Math.floor(r() * d.rosters.length)];
  const n = ros.length;
  const P: Pas[] = [...ros].map((ch, i) => {
    const sp = SP[ch];
    return { sp: ch, e: sp.e, name: sp.name, w: sp.w, kind: sp.kind, f: fx ? fx.f[i] : sp.kind === 'box' ? -1 : Math.floor(r() * (TOP + 1)), g: -1, gs: 0, slot: 0, nf: 1 };
  });
  const at0 = fx ? fx.at.map((a) => (mirror ? 1 - a : a)) : P.map(() => (r() < 0.5 ? 0 : 1));
  for (let k = 0; k < d.guests; k++) {
    const i = n - 1 - k;
    P[i].g = Math.floor(r() * (TOP + 1));
    P[i].gs = r() < 0.5 ? 0 : 1;
    if (P[i].g === P[i].f) return null;
    at0[i] = 3;
  }
  for (const p of P) if (p.kind === 'sleepy' && p.f === 0) return null;
  // 바구니 하나에 7마리 넘게는 안 태운다
  if (at0.filter((a) => a === 0).length > 6 || at0.filter((a) => a === 1).length > 6) return null;
  const L: Level = { P, n, at0, par: 0, sol: [], limit: 0, s2: 0, luck: 1, habit: 0, greedy: 0, careful: 0, wow: 0, dist: new Map() };
  // 처음엔 아무도 내리거나 타지 않는 자리여야
  const S = newSim(L), r0 = settle(L, S, hOf(L, S.at));
  if (r0.offs || S.at.some((a, i) => a !== at0[i])) return null;
  const dist = buildDist(L);
  if (!dist) return null;
  L.dist = dist;
  const par = distOf(L, newSim(L));
  if (!isFinite(par) || par < d.par[0] || par > d.par[1]) return null;
  const S1 = newSim(L);
  for (let k = 0; k < par; k++) {
    const m = bestMove(L, S1);
    L.sol.push(m);
    moveSim(L, S1, m);
  }
  L.par = par;
  L.limit = L.par + d.slack;
  L.s2 = L.par + d.s2;
  // 방 자리: 같은 층에 내릴 동물끼리 나란히
  for (let f = 0; f <= TOP; f++) {
    const at = P.filter((p) => p.f === f);
    at.forEach((p, k) => ((p.slot = k), (p.nf = at.length)));
  }
  return L;
}
function solStats(L: Level) {
  const S = newSim(L);
  let first = 0, best = 0, chain = 0;
  L.sol.forEach((i, k) => {
    const r = moveSim(L, S, i);
    if (k === 0) first = r.offs;
    best = Math.max(best, r.offs);
    chain = Math.max(chain, r.chain);
  });
  return { first, best, chain };
}

const levelCache = new Map<string, Level>();
/** 시드·판마다 하나 (같은 시드면 같은 판). 3판부터는 후보 중 '버릇대로 두면 최소 옮기기를 놓치는' 판을 고른다 */
export function buildLevel(seed: number, si: number): Level {
  const ck = `${seed}:${si}`, hit = levelCache.get(ck);
  if (hit) return hit;
  const d = STAGES[si], r = mulberry32((seed * 31 + si * 7919 + 17) >>> 0);
  let pick: Level | null = null, pickScore = -1e9;
  const want = d.fixed ? 1 : si <= 1 ? 2 : 4;
  for (let tries = 0, good = 0; tries < 2500 && good < want; tries++) {
    const L = tryBuild(d, r, seed % 2 === 1);
    if (!L) continue;
    const st = solStats(L);
    if (si === 0 && st.first < d.wow) continue;
    if (d.chain && st.chain < 2 && tries < 1500) continue;
    if (d.luck > 0) {
      L.luck = luckOf(L, L.limit);
      if (L.luck < d.luck && tries < 2000) continue;
    }
    good++;
    L.habit = runPolicy(L, habitPick);
    L.greedy = runPolicy(L, greedyPick);
    L.careful = runPolicy(L, carefulPick);
    L.wow = st.best;
    let sc = st.best * 4 + st.chain * 3 + L.luck * 50;
    // 3판부터: 버릇으로는 최소 옮기기를 못 하고, 미리 보기를 보며 조심하면 끝까지는 가는 판
    if (si >= 2) sc += (L.habit > L.par ? 40 : 0) + (L.greedy > L.par ? 30 : 0) + (L.habit > L.s2 ? 10 : 0) + (L.careful < 99 ? 35 : 0) + L.par * 2;
    if (sc > pickScore) (pick = L), (pickScore = sc);
  }
  if (!pick) {
    // 안전판: 조건을 풀고 아무 풀리는 판
    const loose = { ...d, par: [1, 8] as [number, number] };
    for (let tries = 0; !pick && tries < 5000; tries++) pick = tryBuild(loose, r);
    if (pick) (pick.habit = runPolicy(pick, habitPick)), (pick.greedy = runPolicy(pick, greedyPick)), (pick.careful = runPolicy(pick, carefulPick)), (pick.wow = solStats(pick).best);
  }
  levelCache.set(ck, pick!);
  return pick!;
}
export const internals = { buildDist, luckOf, runPolicy, solStats, tryBuild, settle, hOf, weightOf };

// ───────────────────────────── 상태 ─────────────────────────────
interface Ev { t: number; kind: string; x: number; y: number; text?: string; col?: string; v?: number }
/** 동물 한 마리가 화면에서 무엇을 하나 (연출용 — 시뮬레이션과 함께 결정적으로 기록) */
interface VP {
  st: 'in' | 'leap' | 'hop' | 'room' | 'wait' | 'board';
  side: number; t0: number; dur: number;
  x: number; y: number; fx: number; fy: number; tx: number; ty: number; ox: number; oy: number;
  fur: number; whee: number; wake: number; nope: number; land: number; wave: number;
}
interface TL { t: number; kind: 'leap' | 'land' | 'move' | 'arrive' | 'stop' | 'end'; i?: number; from?: number; to?: number; dur?: number; k?: number }
export interface LiftState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'play' | 'anim' | 'settle' | 'result'; pt: number;
  L: Level; S: Sim;
  down: boolean; ax: number; ay: number; press: number; lastTap: number; taps: number;
  hearts: number; stars: number; got: number; pts: number; ok: boolean; why: string; won: boolean; dead: boolean; tries: number;
  seen: Set<string>; tips: Set<string>; events: Ev[]; news: { text: string; t: number } | null; newsQ: string[]; startT: number; clearT: number;
  vp: VP[]; vb: number[][]; mv: { from: number; to: number; t0: number; dur: number }; tl: TL[]; rec: Stop[]; chainN: number; moveOffs: number; animOffs: number;
  mood: string; moodT: number; spot: number; birdT: number;
}

const ev = (s: LiftState, kind: string, x: number, y: number, text?: string, col?: string, v?: number) => s.events.push({ t: s.t, kind, x, y, text, col, v });
function tip(s: LiftState, key: string, text: string) {
  if (s.tips.has(key) || s.newsQ.length) return;
  s.tips.add(key);
  s.newsQ.push(text);
}
function see(s: LiftState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  s.newsQ.push(text);
}
const setMood = (s: LiftState, m: string) => ((s.mood = m), (s.moodT = s.t));

// 화면 자리 (가로 0~1, 세로 0~A)
const floorY = (f: number) => GY - f * FH;
const easeIO = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
/** 지금 화면에서 왼쪽 바구니가 있는 층(소수) — 도착하면 줄이 늘었다 줄며 출렁 */
function hvOf(s: LiftState, t = s.t) {
  const m = s.mv, u = m.dur ? (t - m.t0) / m.dur : 1;
  if (u < 1) return m.from + (m.to - m.from) * easeIO(Math.max(0, u));
  const tau = t - (m.t0 + m.dur);
  return m.to + (m.to - m.from) * 0.07 * Math.sin(tau * 0.5) * Math.exp(-tau / 8);
}
const basketY = (s: LiftState, side: number) => {
  const hv = hvOf(s);
  return floorY(side === 0 ? hv : TOP - hv);
};
const sizeOf = (p: Pas) => (p.kind === 'box' ? 0.086 : 0.076 + 0.0058 * Math.abs(p.w));
/** 바구니 안 자리: 앞줄 3 · 뒷줄 3 · 맨 뒷줄 (바구니 바닥 기준, 동물 발 자리) */
function slotOff(k: number, c: number): [number, number] {
  const row = Math.floor(k / 3), inRow = Math.min(3, c - row * 3), col = k % 3;
  return [(col - (inRow - 1) / 2) * 0.093 + (row % 2 ? 0.046 : 0), -0.026 - row * 0.054];
}
const roomXY = (p: Pas): [number, number] => [0.5 + (p.slot - (p.nf - 1) / 2) * 0.06, floorY(p.f) - 0.012];
const waitXY = (p: Pas): [number, number] => [p.gs === 0 ? B0 + 0.038 : B1 - 0.038, floorY(p.g) - 0.012];

function newStage(s: LiftState) {
  const d = STAGES[s.stage];
  s.L = buildLevel(s.seed, s.stage);
  s.S = newSim(s.L);
  const L = s.L, h0 = hOf(L, s.S.at);
  s.mv = { from: h0, to: h0, t0: s.t - 99, dur: 0 };
  s.vb = [[], []];
  s.vp = L.P.map((p, i) => {
    const a = L.at0[i];
    const v: VP = { st: a === 3 ? 'wait' : 'in', side: a === 3 ? p.gs : a, t0: 0, dur: 0, x: 0, y: 0, fx: 0, fy: 0, tx: 0, ty: 0, ox: 0, oy: 0, fur: -99, whee: -99, wake: -99, nope: -99, land: -99, wave: 0 };
    if (a < 2) s.vb[a].push(i);
    return v;
  });
  for (const side of [0, 1]) s.vb[side].forEach((i, k) => ([s.vp[i].ox, s.vp[i].oy] = slotOff(k, s.vb[side].length)));
  placeAll(s);
  s.tl = [];
  s.rec = [];
  s.phase = 'play';
  s.pt = 0;
  s.press = -1;
  s.startT = s.t;
  s.got = 0;
  s.chainN = 0;
  s.moveOffs = 0;
  s.animOffs = 0;
  s.spot = d.spot ? L.P.findIndex((p, i) => (d.spot === 'guest' ? L.at0[i] === 3 : p.kind === d.spot)) : -1;
  setMood(s, 'idle');
  see(s, d.key, d.news);
  ev(s, 'stage', 0.5, 0.7, `${s.stage + 1}판 · ${d.name}`, '#fff6d6');
}

function finish(s: LiftState) {
  s.phase = 'result';
  s.pt = 0;
  const L = s.L, S = s.S, d = STAGES[s.stage];
  if (s.ok) {
    const st = starsFor(L, S.moves);
    s.got = st;
    s.stars += st;
    s.pts += st * (STAR_PTS + STAR_UP * s.stage) + Math.max(0, L.limit - S.moves) * LEFT_PTS + Math.min(S.bestOff, 8) * 5;
    s.clearT = s.t;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    ev(s, 'clear', 0.5, 0.7, `${d.emoji} 이사 끝! ${'★'.repeat(st)}${'☆'.repeat(3 - st)}`, '#fff1a8', st);
    setMood(s, 'cheer');
    for (const v of s.vp) v.wave = s.t;
  } else {
    s.hearts--;
    s.tries++;
    ev(s, 'fail', 0.5, 0.7, s.why, '#ffd0c8');
    setMood(s, 'dizzy');
  }
}

/** 손가락 자리에서 가장 가까운 동물 (바구니에 탄 동물, 그다음 기다리는 손님) */
function pickPas(s: LiftState, x: number, y: number) {
  let best = -1, bd = 1e9;
  s.vp.forEach((v, i) => {
    if (v.st !== 'in' && v.st !== 'wait') return;
    const sz = sizeOf(s.L.P[i]), r = Math.max(HIT, sz * 0.62), dd = Math.hypot(v.x - x, v.y - sz * 0.5 - y) + (v.st === 'wait' ? 0.01 : 0);
    if (dd < r && dd < bd) (bd = dd), (best = i);
  });
  return best;
}

/** 톡: 반대 바구니로 건너뛰고 → 저울이 움직이고 → 서는 층마다 내리고(타고) … 를 시간표로 */
function tapPas(s: LiftState, i: number) {
  const L = s.L, S = s.S, p = L.P[i];
  if (S.at[i] === 3) {
    ev(s, 'wait', s.vp[i].x, s.vp[i].y - 0.08, `${floorLabel(p.g)}에 바구니를 세워요`, '#fff3df');
    tip(s, 'waitTap', '🙋 손님은 바구니가 그 층에 서면 저절로 타요');
    return;
  }
  if (!canMove(L, S, i)) {
    s.vp[i].nope = s.t;
    ev(s, 'nope', s.vp[i].x, s.vp[i].y - 0.1, '혼자는 무서워요!', '#ffd0c8');
    setMood(s, 'huh');
    tip(s, 'coward', '🐰 겁쟁이는 친구가 탄 바구니로만 건너가요');
    return;
  }
  const from = S.at[i], h0 = hOf(L, S.at), rec: Stop[] = [];
  const r = moveSim(L, S, i, rec);
  s.rec = rec;
  s.moveOffs = r.offs;
  s.animOffs = 0;
  s.chainN = 0;
  s.taps++;
  s.lastTap = s.t;
  s.phase = 'anim';
  s.press = -1;
  const tl: TL[] = [];
  let t = s.t + 1, h = h0;
  tl.push({ t, kind: 'leap', i, from, to: 1 - from });
  t += LEAP;
  tl.push({ t, kind: 'land', i, to: 1 - from });
  let offSoFar = 0;
  rec.forEach((st, k) => {
    const dist = Math.abs(st.hL - h), slow = r.offs >= 3 && offSoFar >= 1 ? 1.5 : 1;
    if (dist) {
      const dur = Math.round(Math.max(MIN_MOVE, dist * PER_FLOOR) * slow);
      tl.push({ t, kind: 'move', from: h, to: st.hL, dur });
      t += dur;
      tl.push({ t, kind: 'arrive', k, from: h, to: st.hL });
    }
    if (st.off.length || st.board.length || st.wake.length) {
      tl.push({ t: t + 4, kind: 'stop', k });
      t += 4 + Math.round(HOP * slow);
    }
    offSoFar += st.off.length;
    h = st.hL;
  });
  tl.push({ t: t + 8, kind: 'end' });
  s.tl = tl;
  ev(s, 'leap', s.vp[i].x, s.vp[i].y - 0.06, '휙!', '#ffffff');
}
const floorLabel = (f: number) => `${f + 1}층`;

function runTimeline(s: LiftState) {
  const L = s.L;
  while (s.tl.length && s.tl[0].t <= s.t) {
    const e = s.tl.shift()!;
    if (e.kind === 'leap') {
      const v = s.vp[e.i!], to = e.to!;
      s.vb[e.from!] = s.vb[e.from!].filter((j) => j !== e.i);
      const [ox, oy] = slotOff(s.vb[to].length, s.vb[to].length + 1);
      Object.assign(v, { st: 'leap', t0: s.t, dur: LEAP, fx: v.x, fy: v.y, tx: BX[to] + ox, ty: basketY(s, to) + oy });
    } else if (e.kind === 'land') {
      const v = s.vp[e.i!], to = e.to!;
      s.vb[to].push(e.i!);
      Object.assign(v, { st: 'in', side: to, ox: v.x - BX[to], oy: v.y - basketY(s, to), land: s.t });
      ev(s, 'land', v.x, v.y, undefined, '#fff3c4');
    } else if (e.kind === 'move') {
      s.mv = { from: e.from!, to: e.to!, t0: s.t, dur: e.dur! };
      if (Math.abs(e.to! - e.from!) >= 3) setMood(s, 'wow'), (s.birdT = s.t);
    } else if (e.kind === 'arrive') {
      const st = s.rec[e.k!], dist = Math.abs(e.to! - e.from!);
      for (const side of [0, 1]) {
        const h = side === 0 ? st.hL : TOP - st.hL, h0 = side === 0 ? e.from! : TOP - e.from!;
        if ((st.slam >> side) & 1) {
          for (const j of s.vb[side]) s.vp[j].fur = s.t;
          ev(s, 'slam', BX[side], floorY(0), dist >= 4 ? '쿵!!' : '쿵!', '#ffe0b0', dist);
          see(s, 'slam', '💥 1층에 쿵! 떨어지면 털이 쭈뼛');
        } else if (h === TOP && h0 <= TOP - 3) {
          for (const j of s.vb[side]) s.vp[j].whee = s.t;
          ev(s, 'zoom', BX[side], floorY(TOP) - 0.12, '휘이익!', '#d6f0ff', dist);
        } else if (dist >= 1) ev(s, 'thud', BX[side], floorY(h), undefined, '#ffffff', dist);
      }
    } else if (e.kind === 'stop') {
      const st = s.rec[e.k!];
      for (const j of st.wake) {
        s.vp[j].wake = s.t;
        ev(s, 'wake', s.vp[j].x, s.vp[j].y - 0.1, '번쩍! 깼다', '#fff1a8');
      }
      if (st.off.length) {
        s.chainN++;
        s.animOffs += st.off.length;
        for (const j of st.off) {
          const v = s.vp[j], side = v.side;
          s.vb[side] = s.vb[side].filter((q) => q !== j);
          const [rx, ry] = roomXY(L.P[j]);
          Object.assign(v, { st: 'hop', t0: s.t, dur: HOP, fx: v.x, fy: v.y, tx: rx, ty: ry });
        }
        const p0 = s.vp[st.off[0]], n = s.animOffs;
        ev(s, 'off', p0.x, p0.y - 0.08, s.chainN >= 2 ? `연쇄 ×${s.chainN}!` : st.off.length >= 2 ? `우르르 ${st.off.length}마리!` : '폴짝!', s.chainN >= 2 ? '#ffd166' : '#c8f7c5', n);
        if (s.chainN >= 2) see(s, 'chain1', '⛓️ 연쇄! 내리면 가벼워져서 저울이 또 움직여요'), setMood(s, 'smug');
      }
      for (const j of st.board) {
        const v = s.vp[j], side = L.P[j].gs;
        const [ox, oy] = slotOff(s.vb[side].length, s.vb[side].length + 1);
        s.vb[side].push(j);
        Object.assign(v, { st: 'board', side, t0: s.t, dur: HOP, fx: v.x, fy: v.y, tx: BX[side] + ox, ty: basketY(s, side) + oy });
        ev(s, 'board', v.x, v.y - 0.08, '탑승!', '#d6f0ff');
      }
    } else if (e.kind === 'end') afterMove(s);
  }
}

function afterMove(s: LiftState) {
  const L = s.L, S = s.S;
  if (s.moveOffs >= 3) ev(s, 'big', 0.5, 0.62, `${s.moveOffs}마리 한 번에!`, '#ffe066', s.moveOffs), setMood(s, 'smug');
  if (doneSim(L, S)) return void ((s.phase = 'settle'), (s.pt = 0), (s.ok = true));
  const left = L.limit - S.moves;
  const need = distOf(L, S);
  if (left <= 0 || need > left) {
    s.phase = 'settle';
    s.pt = 0;
    s.ok = false;
    s.why = left <= 0 ? '옮기기를 다 썼어요!' : isFinite(need) ? `남은 ${left}번으로는 다 못 내려요` : '꼼짝 못 해요 — 막다른 길!';
    ev(s, 'jam', 0.5, 0.6, left <= 0 ? '끝!' : '막혔다…', '#ffb4a8');
    return;
  }
  s.phase = 'play';
  if (left === 1) tip(s, 'last', '⚠ 마지막 한 번 — 누르고 있으면 결과가 보여요');
  if (s.moveOffs === 0 && S.moves >= 2) tip(s, 'preview', '👆 꾹 누르고 있으면 설 층과 내릴 동물이 보여요');
}

/** 바구니 안 자리·날아가는 동물 자리를 매 틱 맞춘다 */
function placeAll(s: LiftState) {
  const L = s.L;
  for (const side of [0, 1]) {
    const by = basketY(s, side), list = s.vb[side];
    list.forEach((i, k) => {
      const v = s.vp[i];
      if (v.st !== 'in') return;
      const [ox, oy] = slotOff(k, list.length);
      v.ox += (ox - v.ox) * 0.25;
      v.oy += (oy - v.oy) * 0.25;
      v.x = BX[side] + v.ox;
      v.y = by + v.oy;
    });
  }
  s.vp.forEach((v, i) => {
    const p = L.P[i];
    if (v.st === 'leap' || v.st === 'hop' || v.st === 'board') {
      const u = Math.min(1, (s.t - v.t0) / v.dur), arc = v.st === 'leap' ? 0.16 : 0.07;
      v.x = v.fx + (v.tx - v.fx) * u;
      v.y = v.fy + (v.ty - v.fy) * u - Math.sin(Math.PI * u) * arc;
      if (u >= 1) {
        if (v.st === 'hop') (v.st = 'room'), (v.land = s.t), ev(s, 'home', v.x, v.y - 0.03, undefined, FC[p.f]);
        else if (v.st === 'board') Object.assign(v, { st: 'in', ox: v.x - BX[v.side], oy: v.y - basketY(s, v.side), land: s.t });
      }
    } else if (v.st === 'room') [v.x, v.y] = roomXY(p);
    else if (v.st === 'wait') [v.x, v.y] = waitXY(p);
  });
}

export const pulleylift: GameDef<LiftState> = {
  id: 'pulleylift',
  name: '도르래 저울 승강기',
  genes: ['pulley', 'pointer', 'turnbased'],
  twist: '두 바구니의 높이는 무게 차이만으로 정해진다 — 동물 하나를 반대 바구니로 옮기면 저울이 휙 움직이고, 원하는 층에 선 동물이 내리면 무게가 빠져 저울이 또 움직여서 내림이 연쇄로 이어진다',
  rules: ['동물을 톡 → 반대 바구니로 옮겨 타요. 무거운 쪽이 무게 차이만큼 내려가요.', '바구니가 원하는 층에 서면 그 동물이 내려요 — 모두 내리면 성공!'],
  controls: 'touch',
  hint: '동물을 톡! 누르고 있으면 어디에 설지 보여요 / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '펭귄 관리인의 도르래 아파트',
    mood: '노을 진 하늘 아래 7층 벽돌 아파트 — 지붕 도르래에 매달린 두 등나무 바구니, 불 켜진 창문마다 이사 온 동물이 손을 흔들고, 지붕 위 펭귄 관리인과 비둘기가 저울이 출렁일 때마다 놀란다.',
    palette: { bg: '#24304a', ink: '#fff8ee', muted: '#c9d2e6', accent: '#ffc65c', hot: '#ff5a4f', soft: '#f3e6d2' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'play', pt: 0,
      down: false, ax: 0, ay: 0, press: -1, lastTap: -99, taps: 0,
      hearts: 3, stars: 0, got: 0, pts: 0, ok: false, why: '', won: false, dead: false, tries: 0,
      seen: new Set<string>(), tips: new Set<string>(), events: [], news: null, newsQ: [], startT: 0, clearT: 0,
      vp: [], vb: [[], []], mv: { from: 3, to: 3, t0: -99, dur: 0 }, tl: [], rec: [], chainN: 0, moveOffs: 0, animOffs: 0,
      mood: 'idle', moodT: 0, spot: -1, birdT: -999,
    } as unknown as LiftState;
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
    if (s.events.length > 60 || (s.events.length && s.t - s.events[0].t > 200)) s.events = s.events.filter((e) => s.t - e.t < 200);
    runTimeline(s);
    placeAll(s);
    if (s.mood !== 'idle' && s.t - s.moodT > (s.mood === 'dizzy' || s.mood === 'cheer' ? 400 : 80)) s.mood = 'idle';
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
      if (s.pt >= (s.ok ? 40 : 46)) finish(s);
      return;
    }
    if (s.phase !== 'play') return void (s.press = -1);
    if (p) s.press = pickPas(s, p.x, p.y * A);
    if (!release) return;
    const k = s.press;
    s.press = -1;
    if (k < 0) {
      const y = s.ay * A;
      if (y > 0.1 && y < GY + 0.05) ev(s, 'miss', s.ax, y, '동물을 톡!', '#fff3df');
      return;
    }
    tapPas(s, k);
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
const at = (s: LiftState, i: number): Input => {
  const v = s.vp[i], sz = sizeOf(s.L.P[i]);
  return { tap: false, dir: 0, pointer: { x: v.x, y: (v.y - sz * 0.5) / A } };
};
const ready = (s: LiftState) => s.phase === 'play' && !s.down && s.t - s.lastTap > 30 && s.t - s.startT > 60;
const brain = new WeakMap<object, { key: string; m: number }>();
/** 봇: 너비 우선 탐색으로 가장 적게 옮기는 길을 찾아 그 첫 동물을 옮긴다 (판이 작아 정확하다) */
export const pulleyliftSmart: Bot<LiftState> = {
  name: '이사 반장',
  act(s) {
    if (!ready(s)) return NO;
    const key = `${s.stage}:${s.tries}:${s.S.at.join('')}:${s.S.awake}`;
    let m = brain.get(s);
    if (!m || m.key !== key) {
      const b = bestMove(s.L, s.S);
      brain.set(s, (m = { key, m: b >= 0 ? b : habitPick(s.L, s.S) }));
    }
    return m.m >= 0 ? at(s, m.m) : NO;
  },
};
/** 버릇 봇(측정용): 지금 선 층이 원하는 층에 가장 가까운 동물부터 */
export const pulleyliftHabit: Bot<LiftState> = {
  name: '버릇: 가까운 동물부터',
  act(s) {
    if (!ready(s)) return NO;
    const m = habitPick(s.L, s.S);
    return m >= 0 ? at(s, m) : NO;
  },
};
/** 버릇 봇 둘(측정용): 지금 당장 가장 많이 내리는 동물 */
export const pulleyliftGreedy: Bot<LiftState> = {
  name: '버릇: 당장 많이 내리기',
  act(s) {
    if (!ready(s)) return NO;
    const m = greedyPick(s.L, s.S);
    return m >= 0 ? at(s, m) : NO;
  },
};
const dumbAt = new WeakMap<object, { next: number; until: number; p: { x: number; y: number } }>();
/** 봇: 아무 때나 바구니의 아무 동물이나 톡 (가끔 화면 아무 데나) */
export const pulleyliftRandom: Bot<LiftState> = {
  name: '아무 동물이나 톡',
  act(s, rng) {
    let m = dumbAt.get(s);
    if (!m) dumbAt.set(s, (m = { next: 20 + Math.floor(rng() * 60), until: -1, p: { x: 0, y: 0 } }));
    if (s.t < m.until) return { tap: false, dir: 0, pointer: m.p };
    if (s.t < m.next) return NO;
    m.next = s.t + 30 + Math.floor(rng() * 110);
    m.until = s.t + 2 + Math.floor(rng() * 4);
    const list = s.vp.map((v, i) => (v.st === 'in' ? i : -1)).filter((i) => i >= 0);
    if (rng() < 0.2 || !list.length) m.p = { x: rng(), y: rng() };
    else {
      const i = list[Math.floor(rng() * list.length)], v = s.vp[i], sz = sizeOf(s.L.P[i]);
      m.p = { x: v.x + (rng() - 0.5) * 0.03, y: (v.y - sz * 0.5 + (rng() - 0.5) * 0.03) / A };
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
/** 층마다 색 (1층 빨강 → 7층 보라): 동물 머리표·층 표지판·창틀이 같은 색 */
const FC = ['#e85d5d', '#f08a32', '#e3b520', '#3fb36a', '#3a95dc', '#6a67e6', '#bf58dc'];
type XF = (v: number) => number;

/** 미리 보기: 지금 이 동물을 옮기면? */
interface Preview { kind: 'ok' | 'nope' | 'wait'; rec: Stop[]; S: Sim; offs: number; chain: number; dead: boolean; done: boolean; step: Map<number, number>; boards: Set<number>; wakes: Set<number> }
const pvCache = new WeakMap<object, { key: string; p: Preview }>();
function preview(s: LiftState, i: number): Preview {
  const key = `${i}:${s.S.at.join('')}:${s.S.awake}:${s.stage}:${s.tries}`, c = pvCache.get(s);
  if (c && c.key === key) return c.p;
  const L = s.L, S = cloneSim(s.S), rec: Stop[] = [], step = new Map<number, number>(), boards = new Set<number>(), wakes = new Set<number>();
  let p: Preview;
  if (S.at[i] === 3) p = { kind: 'wait', rec, S, offs: 0, chain: 0, dead: false, done: false, step, boards, wakes };
  else if (!canMove(L, S, i)) p = { kind: 'nope', rec, S, offs: 0, chain: 0, dead: false, done: false, step, boards, wakes };
  else {
    const r = moveSim(L, S, i, rec);
    let k = 0;
    for (const st of rec) {
      if (st.off.length) k++;
      for (const j of st.off) step.set(j, k);
      for (const j of st.board) boards.add(j);
      for (const j of st.wake) wakes.add(j);
    }
    const done = doneSim(L, S);
    p = { kind: 'ok', rec, S, offs: r.offs, chain: r.chain, dead: !done && !isFinite(distOf(L, S)), done, step, boards, wakes };
  }
  pvCache.set(s, { key, p });
  return p;
}

const recentSay = new WeakMap<object, { x: number; y: number; t: number }[]>();
function drawAll(ctx: CanvasRenderingContext2D, s: LiftState, w: number, h: number, th: Theme) {
  const fx = juice(s), t = s.t, L = s.L, d = STAGES[s.stage];
  const X: XF = (x) => x * w, Y: XF = (y) => y * w, R: XF = (r) => r * w;
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  ctx.save();
  fx.begin(ctx);
  drawSky(ctx, s, w, h, X, Y, R);
  drawStreet(ctx, s, w, X, Y, R);
  drawShafts(ctx, X, Y, R);
  drawBuilding(ctx, s, X, Y, R, font);
  drawRoof(ctx, s, X, Y, R);
  const pressK = s.down && s.phase === 'play' ? s.press : -1, pre = pressK >= 0 ? preview(s, pressK) : null;
  // 바구니 둘 (동물 포함)
  for (const side of [0, 1]) drawBasket(ctx, s, side, X, Y, R, font, pressK);
  drawCrowd(ctx, s, X, Y, R);
  // 날아가는 동물 (건너뛰기·내리기·타기)
  s.vp.forEach((v, i) => {
    if (v.st === 'leap' || v.st === 'hop' || v.st === 'board') {
      const u = Math.min(1, (t - v.t0) / v.dur);
      ctx.strokeStyle = `rgba(255,255,255,${0.35 * (1 - u)})`;
      ctx.lineWidth = R(0.01);
      ctx.beginPath();
      ctx.moveTo(X(v.fx), Y(v.fy - sizeOf(L.P[i]) * 0.4));
      ctx.lineTo(X(v.x), Y(v.y - sizeOf(L.P[i]) * 0.4));
      ctx.stroke();
      drawPas(ctx, s, i, v.x, v.y, 1 + 0.12 * Math.sin(Math.PI * u), X, Y, R, false, (v.st === 'leap' ? (v.tx > v.fx ? 1 : -1) : 0) * u * TAU);
    }
  });
  if (pre && pressK >= 0) drawPreview(ctx, s, pressK, pre, X, Y, R, font);
  drawPenguin(ctx, X(0.5), Y(floorY(TOP) - FH - 0.012), R(0.105), s.mood, t);
  drawBirds(ctx, s, X, Y, R);
  // NEW 스포트라이트
  drawSpot(ctx, s, w, h, X, Y, R, font);
  // 가장자리 어둡게
  const vg = ctx.createRadialGradient(w / 2, h * 0.5, R(0.5), w / 2, h * 0.5, R(1.05));
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(10,8,25,.32)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
  // ═════════ 사건 연출 ═════════
  const say = (x: number, y: number, text: string, col: string, size: number) => {
    let rec = recentSay.get(s);
    if (!rec) recentSay.set(s, (rec = []));
    y = Math.max(Y(0.12), Math.min(Y(GY), y));
    for (let k = 0; k < 6 && rec.some((q) => t - q.t < 40 && Math.abs(q.x - x) < w * 0.3 && Math.abs(q.y - y) < size + 4); k++) y -= size + 5;
    rec.push({ x, y, t });
    if (rec.length > 12) rec.shift();
    ctx.font = `800 ${size}px system-ui, sans-serif`;
    const hw = ctx.measureText(text).width / 2 + 6;
    fx.pop(Math.max(hw, Math.min(w - hw, x)), y, text, col, size);
  };
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    if (e.t <= seenT || e.t > t) continue;
    const x = X(e.x), y = Y(e.y), v = e.v ?? 0;
    if (e.kind === 'leap') fx.burst(x, y + R(0.04), '#ffffff', 6, 1.6, 1.6), say(x, y, e.text!, e.col!, 13);
    if (e.kind === 'land') fx.burst(x, y, '#ffe9b8', 5, 1.4, 1.4);
    if (e.kind === 'home') fx.burst(x, y, e.col!, 10, 2.2, 2), fx.ring(x, y, e.col!, R(0.05), 3);
    if (e.kind === 'slam') {
      fx.kick(3 + v * 1.4), fx.burst(x, Y(GY), '#d9b58c', 10 + v * 4, 2 + v * 0.5, 2.4), fx.ring(x, Y(GY), '#ffe0b0', R(0.1 + v * 0.025), 4);
      say(x, Y(GY - 0.2), e.text!, e.col!, 15 + v * 2);
    }
    if (e.kind === 'zoom') fx.ring(x, y + R(0.08), '#d6f0ff', R(0.12), 3), fx.burst(x, y + R(0.1), '#d6f0ff', 10, 2.4, 1.6), say(x, y + R(0.03), e.text!, e.col!, 14 + v), fx.kick(1.5);
    if (e.kind === 'thud') fx.kick(Math.min(3, v * 0.6));
    if (e.kind === 'off') {
      const big = s.chainN >= 2 || v >= 3;
      fx.burst(x, y + R(0.05), '#fff1a8', 12 + v * 3, 2.6 + v * 0.3, 2.2);
      if (big) fx.ring(x, y + R(0.05), '#ffd166', R(0.08 + v * 0.02), 4), fx.kick(2 + v);
      say(x, y, e.text!, e.col!, Math.min(26, 14 + (v - 1) * 3));
    }
    if (e.kind === 'board') fx.burst(x, y + R(0.05), '#d6f0ff', 8, 2, 1.8), say(x, y, e.text!, e.col!, 14);
    if (e.kind === 'wake') fx.burst(x, y, '#fff1a8', 14, 2.6, 2), fx.ring(x, y, '#fff1a8', R(0.07), 3), say(x, y, e.text!, e.col!, 15);
    if (e.kind === 'nope') say(x, y, e.text!, e.col!, 14), fx.kick(2);
    if (e.kind === 'wait' || e.kind === 'miss') say(x, y, e.text!, e.col!, 13);
    if (e.kind === 'big') fx.blink('#fff6c8', 0.28), fx.ring(X(0.5), Y(0.62), '#ffe066', R(0.35), 6), say(X(0.5), Y(0.6), e.text!, e.col!, Math.min(30, 18 + v * 2)), fx.kick(4 + v);
    if (e.kind === 'stage') fx.blink('#fff6d6', 0.16);
    if (e.kind === 'jam') fx.kick(7), fx.blink(th.hot, 0.2);
    if (e.kind === 'clear') {
      for (let k = 0; k < 7; k++) fx.burst(X(B0 + (B1 - B0) * hsh(k + t)), Y(floorY(k) - 0.06), FC[k], 12, 3.4, 2.6);
      fx.burst(X(0.5), Y(0.62), '#ffe066', 36, 6, 3), fx.ring(X(0.5), Y(0.62), '#ffe066', R(0.4), 6), fx.blink('#fff6c8', 0.22);
    }
    if (e.kind === 'fail') fx.kick(9), fx.blink(th.hot, 0.22);
  }
  fx.memo.t = t;
  ctx.restore();
  drawHud(ctx, s, d, w, X, Y, R, font, pre, pressK);
}

function drawSky(ctx: CanvasRenderingContext2D, s: LiftState, w: number, h: number, X: XF, Y: XF, R: XF) {
  const t = s.t;
  const sky = ctx.createLinearGradient(0, 0, 0, Y(GY));
  sky.addColorStop(0, '#34457e');
  sky.addColorStop(0.45, '#7a6aa8');
  sky.addColorStop(0.8, '#f2a07a');
  sky.addColorStop(1, '#ffd29a');
  ctx.fillStyle = sky;
  ctx.fillRect(-10, -10, w + 20, h + 20);
  // 해
  const sun = ctx.createRadialGradient(X(0.78), Y(0.98), R(0.02), X(0.78), Y(0.98), R(0.42));
  sun.addColorStop(0, 'rgba(255,240,190,.95)');
  sun.addColorStop(0.18, 'rgba(255,210,150,.55)');
  sun.addColorStop(1, 'rgba(255,170,120,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, w, Y(GY));
  // 별 (위쪽 하늘)
  for (let k = 0; k < 22; k++) {
    ctx.fillStyle = `rgba(255,255,255,${0.25 + 0.35 * Math.abs(Math.sin(t / 50 + k))})`;
    ctx.fillRect(X(hsh(k) * 1), Y(0.08 + hsh(k + 40) * 0.35), 1.6, 1.6);
  }
  // 구름
  for (let k = 0; k < 4; k++) {
    const cx = ((hsh(k + 7) + t * 0.00012 * (1 + k * 0.3)) % 1.3) - 0.15, cy = 0.33 + k * 0.15;
    ctx.fillStyle = `rgba(255,230,220,${0.22 + 0.06 * k})`;
    for (let j = 0; j < 4; j++) (ctx.beginPath(), ctx.ellipse(X(cx + j * 0.045), Y(cy - (j % 2) * 0.012), R(0.05), R(0.022), 0, 0, TAU), ctx.fill());
  }
  // 먼 도시 두 겹
  for (const [lay, col, hb] of [[0, '#5d5a8e', 0.36], [1, '#463f70', 0.24]] as [number, string, number][]) {
    ctx.fillStyle = col;
    let x = -0.02;
    for (let k = 0; x < 1.05; k++) {
      const bw = 0.06 + hsh(k * 3 + lay * 50) * 0.07, bh = hb * (0.45 + hsh(k * 5 + lay * 70));
      ctx.fillRect(X(x), Y(GY - bh), R(bw), R(bh));
      // 불 켜진 창
      ctx.fillStyle = 'rgba(255,214,140,.55)';
      for (let wy = GY - bh + 0.02; wy < GY - 0.02; wy += 0.035)
        for (let wx = x + 0.012; wx < x + bw - 0.01; wx += 0.022) if (hsh(wx * 91 + wy * 37 + lay) > 0.62) ctx.fillRect(X(wx), Y(wy), R(0.008), R(0.012));
      ctx.fillStyle = col;
      x += bw + 0.004;
    }
  }
}

function drawStreet(ctx: CanvasRenderingContext2D, s: LiftState, w: number, X: XF, Y: XF, R: XF) {
  // 보도
  ctx.fillStyle = '#b9b2a6';
  ctx.fillRect(0, Y(GY), w, R(0.035));
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  ctx.fillRect(0, Y(GY), w, R(0.004));
  ctx.strokeStyle = 'rgba(0,0,0,.12)';
  ctx.lineWidth = 1;
  for (let x = 0; x < 1; x += 0.06) (ctx.beginPath(), ctx.moveTo(X(x), Y(GY)), ctx.lineTo(X(x - 0.01), Y(GY + 0.035)), ctx.stroke());
  // 길
  ctx.fillStyle = '#4a4757';
  ctx.fillRect(0, Y(GY + 0.035), w, R(0.07));
  ctx.fillStyle = 'rgba(255,230,150,.6)';
  for (let x = 0.02; x < 1; x += 0.12) ctx.fillRect(X(x), Y(GY + 0.068), R(0.05), R(0.006));
  // 바구니 그림자 (가까울수록 진하고 작게)
  for (const side of [0, 1]) {
    const hv = hvOf(s), hh = Math.max(0, side === 0 ? hv : TOP - hv), q = hh / TOP;
    ctx.fillStyle = `rgba(20,10,30,${0.42 - 0.3 * q})`;
    ctx.beginPath();
    ctx.ellipse(X(BX[side]), Y(GY + 0.016), R(BW * (0.32 + 0.22 * q)), R(0.012 + 0.006 * q), 0, 0, TAU);
    ctx.fill();
  }
}

/** 길가 구경꾼: 쿵 하면 펄쩍, 이사가 끝나면 콩콩 */
function drawCrowd(ctx: CanvasRenderingContext2D, s: LiftState, X: XF, Y: XF, R: XF) {
  const t = s.t, slamT = s.events.filter((e) => e.kind === 'slam').at(-1)?.t ?? -999, jumpAge = t - slamT;
  const cheer = s.phase === 'result' && s.ok;
  for (const [k, x, e, say] of [[0, 0.45, '🐈', '냐앗!'], [1, 0.555, '🦆', '꽥!']] as [number, number, string, string][]) {
    const jy = jumpAge < 26 ? Math.sin((jumpAge / 26) * Math.PI) * (0.045 + k * 0.01) : cheer ? Math.abs(Math.sin(t * 0.2 + k)) * 0.02 : 0;
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath();
    ctx.ellipse(X(x), Y(GY + 0.1), R(0.026), R(0.006), 0, 0, TAU);
    ctx.fill();
    ctx.font = `${Math.max(14, R(0.058))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ffffff';
    ctx.save();
    ctx.translate(X(x), Y(GY + 0.1 - jy));
    if (jumpAge < 26) ctx.scale(1.1, 1.1);
    ctx.fillText(e, 0, 0);
    ctx.restore();
    if (jumpAge < 34 && (k === 0 || jumpAge > 6)) {
      ctx.font = `900 ${Math.max(12, R(0.034))}px system-ui, sans-serif`;
      ctx.fillStyle = '#fff1a8';
      ctx.fillText(say, X(x + (k ? 0.035 : -0.035)), Y(GY + 0.04 - jy));
    }
  }
}

function drawShafts(ctx: CanvasRenderingContext2D, X: XF, Y: XF, R: XF) {
  for (const side of [0, 1]) {
    const cx = BX[side];
    for (const dx of [-BW / 2 - 0.008, BW / 2 + 0.008]) {
      const x = X(cx + dx);
      ctx.fillStyle = 'rgba(30,25,50,.35)';
      ctx.fillRect(x - R(0.004) + 2, Y(PUL_Y), R(0.008), Y(GY) - Y(PUL_Y));
      const g = ctx.createLinearGradient(x - R(0.005), 0, x + R(0.005), 0);
      g.addColorStop(0, '#6e6a86');
      g.addColorStop(0.5, '#b9b6cc');
      g.addColorStop(1, '#5c5874');
      ctx.fillStyle = g;
      ctx.fillRect(x - R(0.005), Y(PUL_Y), R(0.01), Y(GY) - Y(PUL_Y));
    }
    // 층 눈금 + 가운데(4층) 줄
    for (let f = 0; f <= TOP; f++) {
      const y = Y(floorY(f));
      ctx.strokeStyle = f === MID ? 'rgba(255,255,255,.45)' : 'rgba(255,255,255,.16)';
      ctx.lineWidth = f === MID ? 1.5 : 1;
      ctx.setLineDash(f === MID ? [5, 5] : [2, 6]);
      ctx.beginPath();
      ctx.moveTo(X(cx - BW / 2), y);
      ctx.lineTo(X(cx + BW / 2), y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }
}

function drawBuilding(ctx: CanvasRenderingContext2D, s: LiftState, X: XF, Y: XF, R: XF, font: (sz: number, w?: number) => void) {
  const L = s.L, top = floorY(TOP) - FH, dx = 0.026, dy = -0.018;
  // 옆면 (3/4 시점)
  ctx.fillStyle = '#8c4b3c';
  ctx.beginPath();
  ctx.moveTo(X(B1), Y(top));
  ctx.lineTo(X(B1 + dx), Y(top + dy));
  ctx.lineTo(X(B1 + dx), Y(GY + dy));
  ctx.lineTo(X(B1), Y(GY));
  ctx.closePath();
  ctx.fill();
  // 앞면 벽돌
  const wall = ctx.createLinearGradient(X(B0), 0, X(B1), 0);
  wall.addColorStop(0, '#c9694f');
  wall.addColorStop(0.5, '#d97c5e');
  wall.addColorStop(1, '#b85d46');
  ctx.fillStyle = wall;
  ctx.fillRect(X(B0), Y(top), X(B1) - X(B0), Y(GY) - Y(top));
  ctx.strokeStyle = 'rgba(90,30,20,.18)';
  ctx.lineWidth = 1;
  for (let y = top + 0.012; y < GY; y += 0.016) {
    ctx.beginPath();
    ctx.moveTo(X(B0), Y(y));
    ctx.lineTo(X(B1), Y(y));
    ctx.stroke();
  }
  // 층마다: 방(창) · 옆문 · 층 표지판 · 바닥판
  for (let f = 0; f <= TOP; f++) {
    const fy = floorY(f), y0 = fy - FH + 0.016, y1 = fy - 0.004, wx0 = B0 + 0.026, wx1 = B1 - 0.026;
    // 방 안 (따뜻한 불빛)
    const room = ctx.createLinearGradient(0, Y(y0), 0, Y(y1));
    room.addColorStop(0, '#ffe9b8');
    room.addColorStop(1, '#f4b96f');
    ctx.fillStyle = room;
    ctx.fillRect(X(wx0), Y(y0), X(wx1) - X(wx0), Y(y1) - Y(y0));
    // 벽지 줄무늬 + 천장 등
    ctx.fillStyle = 'rgba(200,120,60,.12)';
    for (let x = wx0 + 0.012; x < wx1; x += 0.03) ctx.fillRect(X(x), Y(y0), R(0.008), Y(y1) - Y(y0));
    const lamp = ctx.createRadialGradient(X(0.5), Y(y0), 1, X(0.5), Y(y0), R(0.09));
    lamp.addColorStop(0, 'rgba(255,255,230,.8)');
    lamp.addColorStop(1, 'rgba(255,255,230,0)');
    ctx.fillStyle = lamp;
    ctx.fillRect(X(wx0), Y(y0), X(wx1) - X(wx0), Y(y1) - Y(y0));
    // 옆문 (바구니가 서는 쪽)
    for (const side of [0, 1]) {
      const dxs = side === 0 ? B0 + 0.003 : B1 - 0.023;
      ctx.fillStyle = '#5a2f25';
      ctx.fillRect(X(dxs), Y(fy - 0.088), R(0.02), R(0.084));
      ctx.fillStyle = FC[f];
      ctx.fillRect(X(dxs), Y(fy - 0.092), R(0.02), R(0.006));
    }
  }
  // 손님(기다림)·이사 온 동물·아직 비어 있는 자리(그림자)
  L.P.forEach((p, i) => {
    if (p.kind === 'box' || p.f < 0) return;
    const v = s.vp[i];
    if (v.st === 'room') return;
    const [rx, ry] = roomXY(p);
    ctx.globalAlpha = 0.3;
    ctx.font = `${Math.max(12, R(0.05))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(p.e, X(rx), Y(ry - 0.004));
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(120,60,20,.35)';
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(X(rx), Y(ry + 0.004), R(0.024), R(0.006), 0, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
  });
  s.vp.forEach((v, i) => {
    if (v.st === 'room') drawPas(ctx, s, i, v.x, v.y, 0.78, X, Y, R, true, 0);
    else if (v.st === 'wait') drawPas(ctx, s, i, v.x, v.y, 0.9, X, Y, R, false, 0);
  });
  for (let f = 0; f <= TOP; f++) {
    const fy = floorY(f), wx0 = B0 + 0.026, wx1 = B1 - 0.026, y0 = fy - FH + 0.016, y1 = fy - 0.004;
    // 유리 반사
    ctx.fillStyle = 'rgba(255,255,255,.1)';
    ctx.beginPath();
    ctx.moveTo(X(wx0 + 0.03), Y(y0));
    ctx.lineTo(X(wx0 + 0.07), Y(y0));
    ctx.lineTo(X(wx0 + 0.02), Y(y1));
    ctx.lineTo(X(wx0 - 0.0), Y(y1));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = FC[f];
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = 2;
    ctx.strokeRect(X(wx0), Y(y0), X(wx1) - X(wx0), Y(y1) - Y(y0));
    ctx.globalAlpha = 1;
    // 바닥판 (두께)
    ctx.fillStyle = '#e8ddd0';
    ctx.fillRect(X(B0 - 0.006), Y(fy - 0.004), X(B1 + 0.006) - X(B0 - 0.006), R(0.012));
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    ctx.fillRect(X(B0 - 0.006), Y(fy + 0.006), X(B1 + 0.006) - X(B0 - 0.006), R(0.003));
    ctx.fillStyle = '#c9bba9';
    ctx.beginPath();
    ctx.moveTo(X(B1 + 0.006), Y(fy - 0.004));
    ctx.lineTo(X(B1 + 0.006 + 0.026), Y(fy - 0.004 - 0.018));
    ctx.lineTo(X(B1 + 0.006 + 0.026), Y(fy + 0.008 - 0.018));
    ctx.lineTo(X(B1 + 0.006), Y(fy + 0.008));
    ctx.closePath();
    ctx.fill();
    // 층 표지판 (가운데 위)
    const tx = X(0.5), ty = Y(y0 + 0.004);
    ctx.fillStyle = FC[f];
    ctx.beginPath();
    ctx.roundRect(tx - R(0.034), ty - R(0.001), R(0.068), R(0.032), R(0.01));
    ctx.fill();
    font(0.034, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${f + 1}층`, tx, ty + R(0.016));
    ctx.textBaseline = 'alphabetic';
  }
}

function drawRoof(ctx: CanvasRenderingContext2D, s: LiftState, X: XF, Y: XF, R: XF) {
  const top = floorY(TOP) - FH, dx = 0.026, dy = -0.018, hv = hvOf(s);
  // 옥상 바닥 (윗면)
  ctx.fillStyle = '#9d8f88';
  ctx.beginPath();
  ctx.moveTo(X(B0), Y(top));
  ctx.lineTo(X(B0 + dx), Y(top + dy));
  ctx.lineTo(X(B1 + dx), Y(top + dy));
  ctx.lineTo(X(B1), Y(top));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e8ddd0';
  ctx.fillRect(X(B0 - 0.008), Y(top - 0.008), X(B1 + 0.008) - X(B0 - 0.008), R(0.012));
  // 도르래 받침대: 옥상 기둥 두 개 + 위 들보
  const beamY = PUL_Y - PUL_R - 0.03;
  ctx.fillStyle = '#4b4766';
  for (const x of [B0 + 0.02, B1 - 0.02]) ctx.fillRect(X(x) - R(0.008), Y(beamY), R(0.016), Y(top) - Y(beamY));
  ctx.strokeStyle = '#4b4766';
  ctx.lineWidth = R(0.006);
  for (const [x0, x1] of [[B0 + 0.02, BX[0] + PUL_R], [B1 - 0.02, BX[1] - PUL_R]]) {
    ctx.beginPath();
    ctx.moveTo(X(x0), Y(top - 0.03));
    ctx.lineTo(X(x1), Y(beamY + 0.012));
    ctx.stroke();
  }
  const bg = ctx.createLinearGradient(0, Y(beamY - 0.012), 0, Y(beamY + 0.016));
  bg.addColorStop(0, '#8a86a6');
  bg.addColorStop(1, '#3b3756');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(X(BX[0] - 0.02), Y(beamY - 0.012), X(BX[1] + 0.02) - X(BX[0] - 0.02), R(0.026), R(0.006));
  ctx.fill();
  // 줄 (도르래 위로 건너감)
  ctx.strokeStyle = '#d9c7a0';
  ctx.lineWidth = R(0.0065);
  ctx.beginPath();
  ctx.moveTo(X(BX[0] + PUL_R), Y(PUL_Y - PUL_R));
  ctx.lineTo(X(BX[1] - PUL_R), Y(PUL_Y - PUL_R));
  ctx.stroke();
  // 도르래 바퀴 (저울이 움직이면 돈다)
  for (const side of [0, 1]) {
    const cx = BX[side] + (side === 0 ? PUL_R : -PUL_R), cy = PUL_Y, a = hv * 1.6 * (side === 0 ? 1 : -1);
    ctx.fillStyle = '#4b4766';
    ctx.fillRect(X(cx) - R(0.005), Y(beamY), R(0.01), Y(cy) - Y(beamY));
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath();
    ctx.arc(X(cx) + 2, Y(cy) + 2, R(PUL_R), 0, TAU);
    ctx.fill();
    const wg = ctx.createRadialGradient(X(cx - 0.012), Y(cy - 0.012), 1, X(cx), Y(cy), R(PUL_R));
    wg.addColorStop(0, '#f1c45a');
    wg.addColorStop(1, '#b8812a');
    ctx.fillStyle = wg;
    ctx.beginPath();
    ctx.arc(X(cx), Y(cy), R(PUL_R), 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#7c561c';
    ctx.lineWidth = 2;
    for (let k = 0; k < 4; k++) {
      const q = a + (k * Math.PI) / 4;
      ctx.beginPath();
      ctx.moveTo(X(cx) - Math.cos(q) * R(PUL_R * 0.8), Y(cy) - Math.sin(q) * R(PUL_R * 0.8));
      ctx.lineTo(X(cx) + Math.cos(q) * R(PUL_R * 0.8), Y(cy) + Math.sin(q) * R(PUL_R * 0.8));
      ctx.stroke();
    }
    ctx.fillStyle = '#5b3f15';
    ctx.beginPath();
    ctx.arc(X(cx), Y(cy), R(0.01), 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#d9c7a0';
    ctx.lineWidth = R(0.0065);
    ctx.beginPath();
    ctx.arc(X(cx), Y(cy), R(PUL_R), side === 0 ? Math.PI : -Math.PI / 2, side === 0 ? -Math.PI / 2 : 0);
    ctx.stroke();
  }
  // 옥상 화분·물탱크
  ctx.font = `${Math.max(12, R(0.045))}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('🪴', X(B0 + 0.05), Y(top - 0.004));
  ctx.fillText('🪴', X(B1 - 0.04), Y(top - 0.004));
}

function drawBasket(ctx: CanvasRenderingContext2D, s: LiftState, side: number, X: XF, Y: XF, R: XF, font: (sz: number, w?: number) => void, pressK: number) {
  const L = s.L, by = basketY(s, side), cx = BX[side], hw = BW / 2, rimY = by - 0.045, ringY = by - 0.16;
  // 줄
  ctx.strokeStyle = '#d9c7a0';
  ctx.lineWidth = R(0.0065);
  ctx.beginPath();
  ctx.moveTo(X(cx), Y(PUL_Y));
  ctx.lineTo(X(cx), Y(ringY));
  ctx.stroke();
  ctx.strokeStyle = 'rgba(217,199,160,.85)';
  ctx.lineWidth = R(0.004);
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(X(cx), Y(ringY));
    ctx.lineTo(X(cx + sx * hw * 0.92), Y(rimY));
    ctx.stroke();
  }
  ctx.strokeStyle = '#8f8a9e';
  ctx.lineWidth = R(0.006);
  ctx.beginPath();
  ctx.arc(X(cx), Y(ringY), R(0.012), 0, TAU);
  ctx.stroke();
  // 안쪽 (뒤 테)
  ctx.fillStyle = '#6b3f1f';
  ctx.beginPath();
  ctx.ellipse(X(cx), Y(rimY), R(hw), R(0.02), 0, Math.PI, TAU);
  ctx.fill();
  // 동물 (뒷줄부터)
  const list = s.vb[side].filter((i) => s.vp[i].st === 'in');
  const order = list.map((i) => i).sort((a, b) => s.vp[a].oy - s.vp[b].oy);
  for (const i of order) {
    const v = s.vp[i];
    drawPas(ctx, s, i, v.x, v.y, i === pressK ? 1.12 : 1, X, Y, R, false, 0);
  }
  // 앞면 (등나무)
  const g = ctx.createLinearGradient(0, Y(rimY), 0, Y(by + 0.014));
  g.addColorStop(0, '#d79a57');
  g.addColorStop(1, '#94592a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(X(cx - hw), Y(rimY));
  ctx.lineTo(X(cx + hw), Y(rimY));
  ctx.lineTo(X(cx + hw * 0.9), Y(by + 0.014));
  ctx.lineTo(X(cx - hw * 0.9), Y(by + 0.014));
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = 'rgba(90,50,20,.35)';
  ctx.lineWidth = 1;
  for (let y = rimY + 0.012; y < by + 0.014; y += 0.012) {
    ctx.beginPath();
    for (let x = cx - hw; x <= cx + hw + 0.01; x += 0.02) ctx.lineTo(X(x), Y(y + (Math.round((x - cx) / 0.02) % 2 ? 0.003 : -0.003)));
    ctx.stroke();
  }
  for (let x = cx - hw + 0.02; x < cx + hw; x += 0.04) (ctx.beginPath(), ctx.moveTo(X(x), Y(rimY)), ctx.lineTo(X(x), Y(by + 0.014)), ctx.stroke());
  ctx.restore();
  // 앞 테 (두께)
  ctx.strokeStyle = '#f0c27a';
  ctx.lineWidth = R(0.009);
  ctx.beginPath();
  ctx.ellipse(X(cx), Y(rimY), R(hw), R(0.02), 0, 0, Math.PI);
  ctx.stroke();
  // 층 표시 + 무게 합
  const hNow = side === 0 ? hOf(L, s.S.at) : TOP - hOf(L, s.S.at);
  const shown = s.phase === 'anim' ? Math.round(side === 0 ? hvOf(s) : TOP - hvOf(s)) : hNow;
  const fl = Math.max(0, Math.min(TOP, shown));
  ctx.fillStyle = FC[fl];
  ctx.beginPath();
  ctx.roundRect(X(cx - hw + 0.02), Y(by - 0.026), R(0.075), R(0.034), R(0.012));
  ctx.fill();
  font(0.032, 900);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${fl + 1}층`, X(cx - hw + 0.0575), Y(by - 0.009));
  const wsum = s.vb[side].reduce((a, i) => a + (s.vp[i].st === 'in' ? L.P[i].w : 0), 0);
  ctx.fillStyle = 'rgba(40,20,10,.72)';
  ctx.beginPath();
  ctx.roundRect(X(cx + hw - 0.1), Y(by - 0.026), R(0.08), R(0.034), R(0.012));
  ctx.fill();
  ctx.fillStyle = '#fff1d6';
  ctx.fillText(`⚖${wsum}`, X(cx + hw - 0.06), Y(by - 0.009));
  ctx.textBaseline = 'alphabetic';
}

/** 동물 하나 (발 자리 x,y). 머리표(원하는 층) · 무게 · 반응(털 쭈뼛·귀 펄럭·잠·겁) */
function drawPas(ctx: CanvasRenderingContext2D, s: LiftState, i: number, x: number, y: number, scale: number, X: XF, Y: XF, R: XF, room: boolean, spin: number) {
  const p = s.L.P[i], v = s.vp[i], t = s.t, sz = sizeOf(p) * scale;
  const asleep = p.kind === 'sleepy' && v.wake < 0;
  let ox = 0, sy = 1;
  if (t - v.nope < 24) ox = Math.sin(t * 1.6) * 0.007;
  if (t - v.land < 10) sy = 1 - 0.18 * Math.sin(((t - v.land) / 10) * Math.PI);
  const furOn = t - v.fur < 55, wheeOn = t - v.whee < 45;
  const px = X(x + ox), py = Y(y);
  // 풍선 (무게가 거꾸로)
  if (p.kind === 'balloon') {
    for (const [bx, bc] of [[-0.022, '#ff6b8a'], [0.02, '#ffd34d'], [0, '#6bc6ff']] as [number, string][]) {
      const bxx = px + R(bx) + Math.sin(t * 0.05 + bx * 99) * 2, byy = py - R(sz + 0.06 + (bx === 0 ? 0.018 : 0));
      ctx.strokeStyle = 'rgba(255,255,255,.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px, py - R(sz * 0.7));
      ctx.lineTo(bxx, byy + R(0.022));
      ctx.stroke();
      ctx.fillStyle = bc;
      ctx.beginPath();
      ctx.ellipse(bxx, byy, R(0.019), R(0.024), 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      ctx.beginPath();
      ctx.arc(bxx - R(0.006), byy - R(0.008), R(0.005), 0, TAU);
      ctx.fill();
    }
  }
  // 털 쭈뼛 (바구니가 1층에 쿵)
  if (furOn) {
    const q = 1 - (t - v.fur) / 55;
    ctx.strokeStyle = `rgba(255,255,255,${0.9 * q})`;
    ctx.lineWidth = 2;
    for (let k = 0; k < 9; k++) {
      const a = -Math.PI + (k / 8) * Math.PI, r0 = R(sz * 0.52), r1 = R(sz * (0.7 + 0.12 * (k % 2)));
      ctx.beginPath();
      ctx.moveTo(px + Math.cos(a) * r0, py - R(sz * 0.5) + Math.sin(a) * r0);
      ctx.lineTo(px + Math.cos(a) * r1, py - R(sz * 0.5) + Math.sin(a) * r1);
      ctx.stroke();
    }
  }
  // 휘익 (꼭대기로)
  if (wheeOn) {
    ctx.strokeStyle = `rgba(214,240,255,${0.8 * (1 - (t - v.whee) / 45)})`;
    ctx.lineWidth = 2;
    for (let k = -1; k <= 1; k++) (ctx.beginPath(), ctx.moveTo(px + R(k * 0.018), py + R(0.01)), ctx.lineTo(px + R(k * 0.018), py + R(0.05)), ctx.stroke());
  }
  // 그림자 (방·문 앞)
  if (room || v.st === 'wait') {
    ctx.fillStyle = 'rgba(80,40,10,.25)';
    ctx.beginPath();
    ctx.ellipse(px, py + R(0.004), R(sz * 0.36), R(0.006), 0, 0, TAU);
    ctx.fill();
  }
  // 몸 (이모지)
  const wave = room && s.phase === 'result' && s.ok ? Math.abs(Math.sin((t - v.wave) * 0.18 + i)) * 0.012 : 0;
  ctx.save();
  ctx.translate(px, py - R(sz * 0.5) - R(wave) - (wheeOn ? Math.sin(t * 0.8) * 1.5 : 0));
  if (spin) ctx.rotate(Math.sin(spin) * 0.35);
  if (asleep) ctx.rotate(0.22);
  ctx.scale(furOn ? 1.08 : 1, sy * (furOn ? 1.08 : 1));
  ctx.font = `${Math.max(12, R(sz))}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(p.e, 0, 0);
  ctx.restore();
  ctx.textBaseline = 'alphabetic';
  if (room) return;
  // 잠 💤 · 겁 💦 · 놀람 ‼
  ctx.fillStyle = '#ffffff';
  if (asleep) {
    ctx.font = `${Math.max(12, R(0.034))}px system-ui, sans-serif`;
    ctx.fillText('💤', px + R(sz * 0.45), py - R(sz * 0.95) - Math.sin(t * 0.08) * 2);
  }
  if (t - v.nope < 40) (ctx.font = `${Math.max(12, R(0.034))}px system-ui, sans-serif`), ctx.fillText('💦', px + R(sz * 0.42), py - R(sz * 0.8));
  if (s.phase === 'result' && !s.ok && v.st === 'in') {
    ctx.font = `${Math.max(12, R(0.028))}px system-ui, sans-serif`;
    for (let k = 0; k < 2; k++) {
      const a = t * 0.15 + k * Math.PI + i;
      ctx.fillText('💫', px + Math.cos(a) * R(sz * 0.4), py - R(sz * 1.02) + Math.sin(a) * R(0.01));
    }
  }
  if (furOn) {
    ctx.font = `900 ${Math.max(12, R(0.036))}px system-ui, sans-serif`;
    ctx.fillStyle = '#fff1a8';
    ctx.fillText('‼', px, py - R(sz * 1.08));
  }
  // 머리표: 원하는 층 (층 색, 머리 위) · 무게 (오른쪽)
  if (p.kind !== 'box') {
    const tx = px, ty = py - R(sz + 0.016);
    ctx.fillStyle = FC[p.f];
    ctx.beginPath();
    ctx.moveTo(tx - R(0.008), ty + R(0.014));
    ctx.lineTo(tx + R(0.008), ty + R(0.014));
    ctx.lineTo(tx, ty + R(0.026));
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(tx, ty, R(0.02), 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.font = `900 ${Math.max(12, R(0.03))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${p.f + 1}`, tx, ty + 0.5);
  }
  const wx = px + R(sz * 0.46), wy = py - R(sz * 0.36);
  ctx.fillStyle = p.w < 0 ? '#2f7fbf' : 'rgba(35,25,45,.88)';
  ctx.beginPath();
  ctx.roundRect(wx - R(0.019), wy - R(0.014), R(0.038), R(0.028), R(0.008));
  ctx.fill();
  ctx.font = `900 ${Math.max(12, R(0.026))}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${p.w}`, wx, wy + 0.5);
  ctx.textBaseline = 'alphabetic';
  // 손님: 손 들고 기다림
  if (v.st === 'wait') {
    const bob = Math.sin(t * 0.12 + i) * 1.5;
    ctx.font = `${Math.max(12, R(0.034))}px system-ui, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText('🙋', px + (p.gs === 0 ? -R(0.034) : R(0.034)), py - R(sz * 0.75) + bob);
  }
}

function drawPreview(ctx: CanvasRenderingContext2D, s: LiftState, i: number, pre: Preview, X: XF, Y: XF, R: XF, font: (sz: number, w?: number) => void) {
  const L = s.L, t = s.t, v = s.vp[i];
  if (pre.kind !== 'ok') return;
  const to = 1 - s.S.at[i], pulse = 0.6 + 0.4 * Math.sin(t * 0.25);
  // 설 자리: 처음 설 층은 점선 바구니, 연쇄로 또 서는 층은 ②③ 눈금
  for (const side of [0, 1]) {
    const cx = BX[side], y0 = basketY(s, side), stops: number[] = [];
    for (const st of pre.rec) {
      const f = side === 0 ? st.hL : TOP - st.hL;
      if (stops.at(-1) !== f) stops.push(f);
    }
    const f1 = stops[0], y1 = floorY(f1);
    if (Math.abs(y1 - y0) > 0.02) {
      ctx.strokeStyle = `rgba(255,255,255,${0.85 * pulse})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.roundRect(X(cx - BW / 2), Y(y1 - 0.05), R(BW), R(0.064), R(0.01));
      ctx.stroke();
      ctx.setLineDash([]);
    }
    const ax = X(cx + (side === 0 ? -BW / 2 + 0.012 : BW / 2 - 0.012));
    let yPrev = y0;
    stops.forEach((f, k) => {
      const yy = floorY(f);
      if (Math.abs(yy - yPrev) > 0.01) {
        const dir = yy > yPrev ? 1 : -1;
        ctx.strokeStyle = k ? 'rgba(255,209,102,.85)' : 'rgba(255,241,168,.95)';
        ctx.lineWidth = k ? 2 : 3;
        ctx.beginPath();
        ctx.moveTo(ax + (k % 2 ? 5 : 0), Y(yPrev - 0.02));
        ctx.lineTo(ax + (k % 2 ? 5 : 0), Y(yy - 0.02));
        ctx.stroke();
        ctx.fillStyle = ctx.strokeStyle;
        ctx.beginPath();
        ctx.moveTo(ax + (k % 2 ? 5 : 0) - 6, Y(yy - 0.02) - dir * 8);
        ctx.lineTo(ax + (k % 2 ? 5 : 0) + 6, Y(yy - 0.02) - dir * 8);
        ctx.lineTo(ax + (k % 2 ? 5 : 0), Y(yy - 0.02));
        ctx.closePath();
        ctx.fill();
      }
      yPrev = yy;
    });
    font(0.032, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lab = stops.length > 1 ? `→ ${stops.map((f) => f + 1).join('→')}층` : `→ ${f1 + 1}층`;
    const lw = ctx.measureText(lab).width + 14, lx = Math.max(lw / 2 + 2, Math.min(X(1) - lw / 2 - 2, X(cx))), ly = Y(y1 + 0.032);
    ctx.fillStyle = FC[f1];
    ctx.beginPath();
    ctx.roundRect(lx - lw / 2, ly - R(0.018), lw, R(0.036), R(0.018));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(lab, lx, ly + 0.5);
  }
  // 건너뛸 길
  const [ox, oy] = slotOff(s.vb[to].length, s.vb[to].length + 1), tx = BX[to] + ox, ty = basketY(s, to) + oy;
  ctx.strokeStyle = 'rgba(255,255,255,.8)';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 5]);
  ctx.beginPath();
  for (let k = 0; k <= 16; k++) {
    const u = k / 16;
    ctx.lineTo(X(v.x + (tx - v.x) * u), Y(v.y - 0.04 + (ty - v.y) * u - Math.sin(Math.PI * u) * 0.16));
  }
  ctx.stroke();
  ctx.setLineDash([]);
  // 내릴 동물: 순서 번호 + 갈 방
  s.vp.forEach((q, j) => {
    const k = pre.step.get(j), b = pre.boards.has(j), wk = pre.wakes.has(j);
    if (!k && !b && !wk) return;
    const sz = sizeOf(L.P[j]), cx2 = X(q.x), cy2 = Y(q.y - sz * 0.5);
    ctx.strokeStyle = k ? `rgba(255,224,102,${pulse})` : 'rgba(150,220,255,.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx2, cy2, R(sz * 0.62), 0, TAU);
    ctx.stroke();
    font(0.03, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lab = k ? `폴짝${'①②③④⑤⑥'[k - 1] ?? k}` : b ? '탑승' : '깸!';
    const lw = ctx.measureText(lab).width + 10, ly = cy2 - R(sz * 0.5 + 0.075);
    ctx.fillStyle = k ? 'rgba(120,80,0,.92)' : 'rgba(20,60,100,.92)';
    ctx.beginPath();
    ctx.roundRect(cx2 - lw / 2, ly - R(0.016), lw, R(0.032), R(0.016));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(lab, cx2, ly + 0.5);
    if (k) {
      const [rx, ry] = roomXY(L.P[j]);
      ctx.strokeStyle = `rgba(255,224,102,${0.8 * pulse})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(X(rx), Y(ry - 0.025), R(0.03), 0, TAU);
      ctx.stroke();
    }
  });
  ctx.textBaseline = 'alphabetic';
}

function drawSpot(ctx: CanvasRenderingContext2D, s: LiftState, w: number, h: number, X: XF, Y: XF, R: XF, font: (sz: number, w?: number) => void) {
  if (s.spot < 0) return;
  const age = s.t - s.startT - 95;
  // 이 판에서 한 번 옮기고 0.5초 지나면 걷힌다
  if (age < 0 || age > SPOT_T || (s.lastTap > s.startT && s.t - s.lastTap > 30)) return;
  const v = s.vp[s.spot], p = s.L.P[s.spot], sz = sizeOf(p), a = Math.min(1, age / 12, (SPOT_T - age) / 20);
  const cx = X(v.x), cy = Y(v.y - sz * 0.5), r = R(0.085) + Math.sin(s.t * 0.15) * 2;
  ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(10,8,30,.6)';
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.arc(cx, cy, r, 0, TAU, true);
  ctx.fill('evenodd');
  ctx.strokeStyle = '#ffe066';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.stroke();
  const label = STAGES[s.stage].news;
  font(0.036, 900);
  const tw = Math.min(w - 12, ctx.measureText(label).width + 20), ly = cy + (cy > h * 0.55 ? -r - R(0.06) : r + R(0.06)), lx = Math.max(tw / 2 + 6, Math.min(w - tw / 2 - 6, cx));
  ctx.fillStyle = '#ffe066';
  ctx.beginPath();
  ctx.roundRect(lx - R(0.045), ly - R(0.058), R(0.09), R(0.03), R(0.015));
  ctx.fill();
  ctx.fillStyle = '#3a2a00';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  font(0.026, 900);
  ctx.fillText('NEW', lx, ly - R(0.043));
  font(0.034, 900);
  ctx.fillStyle = 'rgba(30,20,50,.92)';
  ctx.beginPath();
  ctx.roundRect(lx - tw / 2, ly - R(0.022), tw, R(0.044), R(0.022));
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillText(label, lx, ly + 1);
  ctx.textBaseline = 'alphabetic';
  ctx.globalAlpha = 1;
}

function drawPenguin(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, mood: string, t: number) {
  const wob = mood === 'wow' ? Math.sin(t * 0.6) * 1.5 : mood === 'cheer' ? -Math.abs(Math.sin(t * 0.25)) * r * 0.15 : 0;
  ctx.save();
  ctx.translate(x, y + wob);
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.38, r * 0.08, 0, 0, TAU);
  ctx.fill();
  // 발
  ctx.fillStyle = '#ff9f2b';
  for (const sx of [-1, 1]) (ctx.beginPath(), ctx.ellipse(sx * r * 0.16, -r * 0.03, r * 0.12, r * 0.05, 0, 0, TAU), ctx.fill());
  // 몸
  ctx.fillStyle = '#23253a';
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.45, r * 0.36, r * 0.45, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#f6f3ea';
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.38, r * 0.25, r * 0.33, 0, 0, TAU);
  ctx.fill();
  // 날개
  const up = mood === 'cheer' || mood === 'wow' ? 1 : 0;
  ctx.fillStyle = '#23253a';
  for (const sx of [-1, 1]) {
    ctx.save();
    ctx.translate(sx * r * 0.33, -r * 0.5);
    ctx.rotate(sx * (up ? -1.9 + Math.sin(t * 0.5) * 0.3 : 0.25));
    ctx.beginPath();
    ctx.ellipse(0, r * 0.18, r * 0.08, r * 0.22, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  // 모자
  ctx.fillStyle = '#d6453b';
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.86, r * 0.27, r * 0.12, 0, Math.PI, TAU);
  ctx.fill();
  ctx.fillRect(-r * 0.02, -r * 0.9, r * 0.36, r * 0.05);
  // 눈
  const ey = -r * 0.66;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(1.5, r * 0.04);
  if (mood === 'wow' || mood === 'huh') {
    for (const sx of [-1, 1]) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(sx * r * 0.11, ey, r * (mood === 'wow' ? 0.085 : 0.06), 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(sx * r * 0.11, ey + r * 0.01, r * 0.035, 0, TAU);
      ctx.fill();
    }
  } else if (mood === 'dizzy') {
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      for (let k = 0; k < 14; k++) {
        const a = k * 0.6 + t * 0.2, rr = (k / 14) * r * 0.07;
        ctx.lineTo(sx * r * 0.11 + Math.cos(a) * rr, ey + Math.sin(a) * rr);
      }
      ctx.stroke();
    }
    ctx.font = `${Math.max(12, r * 0.3)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    for (let k = 0; k < 3; k++) {
      const a = t * 0.12 + (k * TAU) / 3;
      ctx.fillText('⭐', Math.cos(a) * r * 0.38, -r * 1.02 + Math.sin(a) * r * 0.1);
    }
  } else if (mood === 'smug' || mood === 'cheer') {
    for (const sx of [-1, 1]) (ctx.beginPath(), ctx.arc(sx * r * 0.11, ey + r * 0.03, r * 0.05, Math.PI * 1.1, Math.PI * 1.9), ctx.stroke());
  } else {
    for (const sx of [-1, 1]) (ctx.beginPath(), ctx.arc(sx * r * 0.11, ey, r * 0.035, 0, TAU), ctx.fill());
  }
  // 부리
  ctx.fillStyle = '#ffae3b';
  ctx.beginPath();
  if (mood === 'wow') ctx.ellipse(0, -r * 0.55, r * 0.06, r * 0.07, 0, 0, TAU);
  else (ctx.moveTo(-r * 0.07, -r * 0.58), ctx.lineTo(r * 0.07, -r * 0.58), ctx.lineTo(0, -r * (mood === 'smug' || mood === 'cheer' ? 0.47 : 0.5)), ctx.closePath());
  ctx.fill();
  if (mood === 'huh') {
    ctx.font = `900 ${Math.max(12, r * 0.32)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff1a8';
    ctx.fillText('?', r * 0.42, -r * 0.9);
  }
  if (mood === 'wow') {
    ctx.font = `900 ${Math.max(12, r * 0.32)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff1a8';
    ctx.fillText('!', r * 0.44, -r * 0.92);
  }
  ctx.restore();
}

function drawBirds(ctx: CanvasRenderingContext2D, s: LiftState, X: XF, Y: XF, R: XF) {
  const t = s.t, age = t - s.birdT, beamY = PUL_Y - PUL_R - 0.03 - 0.012;
  for (const [k, bx] of [[0, 0.3], [1, 0.66]] as [number, number][]) {
    const fly = age < 90 ? Math.sin(Math.min(1, age / 90) * Math.PI) : 0, flap = age < 90;
    const x = X(bx + fly * 0.06 * (k ? 1 : -1)), y = Y(beamY - fly * 0.09);
    ctx.fillStyle = '#8d93a8';
    ctx.beginPath();
    ctx.ellipse(x, y - R(0.012), R(0.018), R(0.012), 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + R(0.014) * (k ? -1 : 1), y - R(0.024), R(0.008), 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffb347';
    ctx.beginPath();
    ctx.moveTo(x + R(0.021) * (k ? -1 : 1), y - R(0.026));
    ctx.lineTo(x + R(0.03) * (k ? -1 : 1), y - R(0.023));
    ctx.lineTo(x + R(0.021) * (k ? -1 : 1), y - R(0.02));
    ctx.fill();
    if (flap) {
      const wa = Math.sin(t * 0.9) * 0.9;
      ctx.strokeStyle = '#6f7590';
      ctx.lineWidth = 2.5;
      for (const sx of [-1, 1]) (ctx.beginPath(), ctx.moveTo(x, y - R(0.014)), ctx.lineTo(x + sx * R(0.026), y - R(0.014) - R(0.02) * wa), ctx.stroke());
    }
  }
}

function drawHud(ctx: CanvasRenderingContext2D, s: LiftState, d: StageDef, w: number, X: XF, Y: XF, R: XF, font: (sz: number, w?: number) => void, pre: Preview | null, pressK: number) {
  const t = s.t, L = s.L, S = s.S;
  const hb = R(0.068);
  ctx.fillStyle = 'rgba(20,18,40,.85)';
  ctx.fillRect(0, 0, w, hb);
  font(0.04, 900);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff1d6';
  ctx.fillText(`${s.stage + 1}/${STAGES.length}판 · ${d.emoji} ${d.name}`, R(0.03), hb * 0.52);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffd166';
  const stt = `★ ${s.stars}`;
  ctx.fillText(stt, w - R(0.03), hb * 0.52);
  ctx.fillStyle = '#ff6b5f';
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - R(0.06) - ctx.measureText(stt).width, hb * 0.52);
  // 새것 알림
  if (s.news && t - s.news.t < NEWS_T + 20) {
    const age = t - s.news.t, a = Math.min(1, age / 10, (NEWS_T + 20 - age) / 20), drop = Math.max(0, 10 - age) * 2;
    ctx.globalAlpha = a;
    font(0.036, 900);
    ctx.textAlign = 'center';
    const tx = `✨ ${s.news.text}`;
    let fs = 0.036;
    while (ctx.measureText(tx).width > w - R(0.05) && fs > 0.03) font((fs -= 0.001), 900);
    const tw2 = Math.min(w - 8, ctx.measureText(tx).width + 22), by2 = Y(0.105) - drop;
    ctx.fillStyle = 'rgba(30,24,60,.92)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw2 / 2, by2 - R(0.027), tw2, R(0.054), R(0.027));
    ctx.fill();
    ctx.fillStyle = '#fff1d6';
    ctx.fillText(tx, w / 2, by2 + 1);
    ctx.globalAlpha = 1;
  }
  // 판 시작 큰 글씨
  {
    const age = t - s.startT;
    if (age < 95 && s.phase === 'play' && s.taps >= 0) {
      const a = Math.min(1, age / 8, (95 - age) / 20), sc = 1 + Math.max(0, 8 - age) * 0.04;
      ctx.globalAlpha = a;
      ctx.save();
      ctx.translate(w / 2, Y(0.6));
      ctx.scale(sc, sc);
      ctx.fillStyle = 'rgba(30,20,50,.6)';
      ctx.beginPath();
      ctx.roundRect(-w * 0.46, -R(0.06), w * 0.92, R(0.15), R(0.03));
      ctx.fill();
      font(0.068, 900);
      ctx.textAlign = 'center';
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(40,20,5,.75)';
      const big = `${d.emoji} ${s.stage + 1}판 · ${d.name}`;
      ctx.strokeText(big, 0, 0);
      ctx.fillStyle = '#fff6d6';
      ctx.fillText(big, 0, 0);
      font(0.038, 800);
      const n = L.P.filter((p) => p.kind !== 'box').length, sub = `동물 ${n}마리를 원하는 층에 · 최소 ${L.par}번`;
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
    ctx.fillStyle = s.ok ? 'rgba(30,50,40,.7)' : 'rgba(70,20,30,.7)';
    ctx.fillRect(0, Y(0.52), w, R(0.27));
    ctx.textAlign = 'center';
    font(s.ok ? 0.058 : 0.048, 900);
    ctx.fillStyle = s.ok ? '#fff1a8' : '#ffd0c8';
    ctx.fillText(s.ok ? (s.won ? '아파트 이사 끝! 🎉' : `${d.emoji} 이사 끝!`) : s.why, w / 2, Y(0.58));
    if (s.ok) {
      for (let k = 0; k < 3; k++) {
        const ag = age - 14 - k * 10, got = k < s.got;
        if (ag < 0) continue;
        const sc = got ? 1 + Math.max(0, 1 - ag / 8) * 0.8 : 1;
        font(0.08 * sc, 900);
        ctx.fillStyle = got ? '#ffd166' : 'rgba(255,255,255,.35)';
        ctx.fillText(got ? '★' : '☆', w / 2 + (k - 1) * R(0.1), Y(0.67));
        if (got && (juice(s).memo['star' + k] ?? -1) < s.clearT) (juice(s).memo['star' + k] = s.clearT), juice(s).burst(w / 2 + (k - 1) * R(0.1), Y(0.67), '#ffe066', 14, 3, 2.4);
      }
      font(0.036, 800);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`옮기기 ${S.moves}번 (최소 ${L.par}번) · 한 번에 최대 ${S.bestOff}마리`, w / 2, Y(0.74));
    } else {
      font(0.04, 800);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(s.hearts > 0 ? '♥ -1 · 이 이사를 처음부터 다시' : '하트를 다 썼어요 — 끝', w / 2, Y(0.67));
      font(0.034, 800);
      ctx.fillText('꾹 누르면 어디 설지 미리 보여요', w / 2, Y(0.73));
    }
    ctx.globalAlpha = 1;
  }
  // ═════════ 아래 띠: 옮기기 · 별 목표 · 안내 ═════════
  ctx.fillStyle = 'rgba(20,18,40,.78)';
  ctx.fillRect(0, Y(GY + 0.105), w, Y(A) - Y(GY + 0.105));
  {
    const y1 = Y(1.315), left = L.limit - S.moves;
    font(0.036, 900);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff1d6';
    ctx.fillText('옮기기', R(0.03), y1);
    const px0 = R(0.17), gap = Math.min(R(0.06), (w - px0 - R(0.2)) / L.limit);
    for (let k = 0; k < L.limit; k++) {
      const used = k < S.moves, cx = px0 + k * gap + gap / 2;
      ctx.fillStyle = used ? 'rgba(255,255,255,.18)' : k < L.par ? '#ffd166' : k < L.s2 ? '#c8f7c5' : '#ff9d8a';
      ctx.beginPath();
      ctx.arc(cx, y1, R(0.016), 0, TAU);
      ctx.fill();
    }
    ctx.textAlign = 'right';
    ctx.fillStyle = left <= 1 ? '#ff9d8a' : '#ffffff';
    ctx.fillText(`남은 ${left}`, w - R(0.03), y1);
    const y2 = Y(1.37), chips = [
      { txt: '모두 내리기', st: s.phase === 'result' && s.ok ? true : null },
      { txt: `${L.s2}번 안에`, st: S.moves > L.s2 ? false : s.phase === 'result' && s.ok ? true : null },
      { txt: `최소 ${L.par}번`, st: S.moves > L.par ? false : s.phase === 'result' && s.ok ? true : null },
    ];
    const gw = (w - R(0.04)) / 3;
    chips.forEach(({ txt, st }, k) => {
      const gx = R(0.02) + k * gw;
      ctx.fillStyle = st === true ? 'rgba(255,209,102,.32)' : st === false ? 'rgba(0,0,0,.3)' : 'rgba(255,240,210,.12)';
      ctx.beginPath();
      ctx.roundRect(gx + 2, y2 - R(0.025), gw - 4, R(0.05), R(0.025));
      ctx.fill();
      ctx.textAlign = 'center';
      font(0.034, 800);
      ctx.fillStyle = st === false ? 'rgba(255,255,255,.45)' : '#fff6e0';
      ctx.fillText(`${st === true ? '★' : st === false ? '✗' : '☆'} ${txt}`, gx + gw / 2, y2 + 1);
    });
    // 안내 · 미리 보기 요약
    const y3 = Y(1.43);
    let tipT = '👆 동물을 톡! 꾹 누르면 어디에 설지 보여요', col = 'rgba(255,240,214,.92)';
    if (pre && pressK >= 0) {
      const p = L.P[pressK];
      if (pre.kind === 'nope') (tipT = `🐰 빈 바구니엔 혼자 안 가요 — 친구 먼저!`), (col = '#ffd0c8');
      else if (pre.kind === 'wait') tipT = `🙋 ${floorLabel(p.g)}에 바구니를 세우면 타요`;
      else if (pre.done) (tipT = `🎉 떼면 모두 내려요! (${pre.offs}마리)`), (col = '#fff1a8');
      else if (pre.dead) (tipT = '⚠ 이러면 막다른 길 — 다 못 내려요'), (col = '#ff9d8a');
      else if (pre.offs) (tipT = `떼면 ${pre.offs}마리 내림${pre.chain >= 2 ? ` · 연쇄 ${pre.chain}` : ''} · 밖에서 떼면 취소`), (col = '#c8f7c5');
      else tipT = '떼면 옮겨 타요 (아무도 안 내림) · 밖에서 떼면 취소';
    } else if (s.stage === 0 && s.taps === 0) tipT = '👆 코끼리를 톡 — 반대 바구니로 폴짝!';
    else if (s.phase === 'result') tipT = s.ok ? '다음 이사가 와요!' : '같은 이사를 다시 — 이번엔 꾹 눌러 미리 보고';
    else if (s.phase === 'play' && L.limit - S.moves === 1) (tipT = '⚠ 마지막 한 번 — 꾹 눌러 미리 보고 톡'), (col = '#ffd0c8');
    else if (s.stage > 0) tipT = d.tip;
    ctx.textAlign = 'center';
    font(0.036, 800);
    let fs = 0.036;
    while (ctx.measureText(tipT).width > w - R(0.04) && fs > 0.031) font((fs -= 0.001), 800);
    ctx.fillStyle = col;
    ctx.fillText(tipT, w / 2, y3);
  }
  // 첫 판: 손가락으로 추천 동물 가리키기
  if (s.stage === 0 && s.taps === 0 && s.phase === 'play' && t - s.startT > 30 && !s.down) {
    const k = L.sol[0], v = s.vp[k];
    if (v && v.st === 'in') {
      const sz = sizeOf(L.P[k]), bob = Math.sin(t * 0.15) * R(0.012);
      ctx.font = `${Math.max(16, R(0.07))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('👆', X(v.x) + R(0.02), Y(v.y) + R(0.075) + bob);
      ctx.strokeStyle = 'rgba(255,255,255,.85)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(X(v.x), Y(v.y - sz * 0.5), R(sz * 0.7) + Math.sin(t * 0.15) * 2, 0, TAU);
      ctx.stroke();
    }
  }
  ctx.textBaseline = 'alphabetic';
}
