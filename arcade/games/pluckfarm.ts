/**
 * 🥕 쑥쑥 뿌리 뽑기 텃밭 (36라운드: 직접 만지는 물리 장난감 — 톡) — 쑥 뽑기 × 연쇄.
 * 손짓 하나: 땅 위로 나온 잎을 톡. 그 채소가 '쑥!' 용수철처럼 늘어났다 튀어 오르고, 땅속 단면에 보이는 뿌리 이음을 따라
 *   옆 채소들이 줄줄이 딸려 나온다. 딸려 나오는 거리 = 톡 한 채소의 잎 수(뿌리를 따라 잎 수만큼 멀리). 힘이 다한 뿌리는 '뚝!' 끊긴다.
 * 판(8): 목표 채소를 바구니에. 톡 수 한정, 시간 제한 없음. 꽃·새싹을 같이 뽑으면 별이 깎인다(직접 톡 하면 간지럼만 탄다).
 *   별(판마다 하나씩 늘어남): 목표 거두기 / 꽃(새싹)은 그대로 / N번 안에. 톡을 다 쓰고도 못 채우면 하트 -1, 그 판 다시.
 * 펼쳐짐(하는 일이 바뀐다): 1 뿌리 이음 → 2 꽃(잎 수를 세어 꽃 앞에서 멈추게) → 3 돌(돌에 걸린 뿌리는 끊김 — 돌을 벽으로)
 *   → 4 새싹(톡마다 자람 — 다 자랄 때까지 그 둘레는 아껴 두기) → 5 큰 무(직접은 안 뽑힘 — 잎 많은 이웃이 끌어내야)
 *   → 6 두더지(톡마다 한 칸씩 굴을 파며 뿌리를 갉음 — 기다렸다 쓰기) → 7 물 준 칸(물 먹은 흙은 힘이 안 듦 — 더 멀리) → 8 잔치(전부).
 * 웃음: 채소마다 얼굴(땅속에선 쿨쿨, 뽑히면 눈이 동그래, 바구니에선 헤헤), 울타리의 토끼가 줄줄이에 폴짝, 꽃이 뽑히면 놀라 두 손으로 볼.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5;
// ───────────────────────────── 화면 배치 (가로 0~1, 세로 0~A) ─────────────────────────────
/** 잘린 단면의 윗선(땅) · 밭 좌우 · 뒤 풀밭(채소가 떨어져 구르는 줄) · 바구니 · 단면 바닥 */
const SURF = 0.6, BX0 = 0.035, BX1 = 0.965, GRASS = 0.5, BASK_X = 0.865, BASK_Y = 0.468, SEC_BOT = 1.25;
const hsh = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const slotX = (n: number, i: number) => BX0 + 0.02 + ((i + 0.5) * (BX1 - BX0 - 0.04)) / n;
const slotW = (n: number) => (BX1 - BX0 - 0.04) / n;

// ───────────────────────────── 판 정의 ─────────────────────────────
export type Kind = 'carrot' | 'radish' | 'flower' | 'sprout' | 'big';
export interface Plant { k: Kind; leaf: number; grow: number; wet: boolean }
export interface Link { a: number; b: number; stone: boolean }
export interface Level {
  n: number; p: (Plant | null)[]; links: Link[]; goal: number; goalBig: number; limit: number; par: number;
  mole: { g: number; dir: number } | null; stars: StarK[];
}
type StarK = 'goal' | 'clean' | 'par';
type Spot = 'chain' | 'flower' | 'stone' | 'sprout' | 'big' | 'mole' | 'wet' | 'all';
interface StageDef { key: Spot; name: string; news: string; hint: string; spot: string; n: number; slack: number; minPar: number; maxPar: number; rp: number; stars: StarK[] }

export const STAGES: StageDef[] = [
  { key: 'chain', name: '첫 뽑기', news: '', hint: '잎을 톡! 뿌리로 이어진 채소가 줄줄이', spot: '', n: 6, slack: 3, minPar: 1, maxPar: 2, rp: 1, stars: ['goal'] },
  { key: 'flower', name: '꽃밭 옆', news: '꽃은 뽑으면 안 돼요 — 잎 수만큼만 딸려 나와요', hint: '잎 수를 세어 꽃 앞에서 멈추게', spot: '꽃', n: 7, slack: 2, minPar: 2, maxPar: 3, rp: 1, stars: ['goal', 'clean'] },
  { key: 'stone', name: '돌밭', news: '돌에 걸린 뿌리는 뚝 끊겨요 — 돌 너머는 안 와요', hint: '돌 너머로는 안 딸려 와요 — 어디서 끊길지 세어 봐요', spot: '돌', n: 7, slack: 1, minPar: 2, maxPar: 4, rp: 0.4, stars: ['goal', 'clean', 'par'] },
  { key: 'sprout', name: '새싹 이랑', news: '새싹은 톡 할 때마다 자라요 — 다 크면 당근!', hint: '새싹 둘레는 다 자랄 때까지 아껴 둬요', spot: '새싹', n: 7, slack: 1, minPar: 2, maxPar: 4, rp: 0.35, stars: ['goal', 'clean', 'par'] },
  { key: 'big', name: '큰 무', news: '큰 무는 톡으로 안 뽑혀요 — 옆에서 딸려 나와야 해요', hint: '큰 무는 힘이 둘 들어요 — 잎 많은 이웃을 남겨 둬요', spot: '큰 무', n: 7, slack: 1, minPar: 2, maxPar: 4, rp: 0.35, stars: ['goal', 'clean', 'par'] },
  { key: 'mole', name: '두더지 굴', news: '두더지가 톡마다 한 칸씩 파며 뿌리를 갉아요', hint: '화살표 칸의 뿌리는 다음 톡 뒤에 끊겨요', spot: '두더지', n: 7, slack: 1, minPar: 2, maxPar: 4, rp: 0.3, stars: ['goal', 'clean', 'par'] },
  { key: 'wet', name: '물 준 칸', news: '물 먹은 흙은 술술 — 힘 안 들이고 딸려 나와요', hint: '물 칸은 잎 수를 안 써요 — 더 멀리 가요', spot: '물 준 칸', n: 7, slack: 1, minPar: 2, maxPar: 4, rp: 0.4, stars: ['goal', 'clean', 'par'] },
  { key: 'all', name: '수확 잔치', news: '마지막 밭 — 돌·새싹·큰 무·물이 다 있어요', hint: '어디부터 톡 할지 끝까지 세어 봐요', spot: '', n: 7, slack: 1, minPar: 2, maxPar: 4, rp: 0.3, stars: ['goal', 'clean', 'par'] },
];
export const STAGE_COUNT = STAGES.length;
const LW = [6, 3, 1];
const STAR_PTS = [0, 100, 220, 400], CLEAR_PTS = 50, TAP_PTS = 15, WIN_PTS = 150;

// ───────────────────────────── 시뮬레이션 (규칙) ─────────────────────────────
export interface Sim { gone: number; alive: number; taps: number; carrot: number; radish: number; big: number; bad: number; moleG: number; moleDir: number; best: number; last: number }
export const newSim = (L: Level): Sim => {
  const S: Sim = { gone: 0, alive: (1 << L.links.length) - 1, taps: 0, carrot: 0, radish: 0, big: 0, bad: 0, moleG: L.mole?.g ?? -1, moleDir: L.mole?.dir ?? 0, best: 0, last: 0 };
  if (L.mole) moleCut(L, S);
  return S;
};
const cloneSim = (S: Sim): Sim => ({ ...S });
/** 지금 종류: 다 자란 새싹은 당근 */
export const kindNow = (L: Level, S: Sim, i: number): Kind | null => {
  const p = L.p[i];
  if (!p || (S.gone >> i) & 1) return null;
  return p.k === 'sprout' && S.taps >= p.grow ? 'carrot' : p.k;
};
const leafNow = (L: Level, S: Sim, i: number) => {
  const p = L.p[i]!;
  return p.k === 'sprout' ? (S.taps >= p.grow ? p.leaf : 0) : p.leaf;
};
const weightOf = (L: Level, S: Sim, i: number) => (L.p[i]!.wet ? 0 : kindNow(L, S, i) === 'big' ? 2 : 1);
export const tappable = (L: Level, S: Sim, i: number) => {
  const k = kindNow(L, S, i);
  return k === 'carrot' || k === 'radish';
};
/** 두더지가 지금 칸(틈 g: g-1과 g 사이)을 지나는 뿌리를 갉는다 */
function moleCut(L: Level, S: Sim, rec?: number[]) {
  const g = S.moleG;
  L.links.forEach((e, j) => {
    if (!((S.alive >> j) & 1)) return;
    if (Math.min(e.a, e.b) < g && Math.max(e.a, e.b) >= g) {
      S.alive &= ~(1 << j);
      rec?.push(j);
    }
  });
}
export const moleNext = (L: Level, g: number, dir: number): [number, number] => {
  let ng = g + dir, nd = dir;
  if (ng < 1 || ng > L.n - 1) (nd = -dir), (ng = g + nd);
  return [ng, nd];
};

/** 뽑기 결과: 뽑힌 순서(누가 누구를 어느 뿌리로) · 끊긴 뿌리 · 두더지가 갉은 뿌리 */
export interface Pull { order: { i: number; from: number; link: number; rem: number; step: number }[]; snaps: { link: number; at: number; stone: boolean }[]; mole: number[]; grew: number[] }
/** 잎을 톡: 톡 한 채소의 잎 수만큼, 뿌리를 따라 이웃이 줄줄이 딸려 나온다 (무게: 보통 1 · 큰 무 2 · 물 준 칸 0) */
export function pull(L: Level, S: Sim, v: number, rec?: Pull): number {
  const n = L.n, rem = new Array(n).fill(-1), from = new Array(n).fill(-1), via = new Array(n).fill(-1), step = new Array(n).fill(0), done = new Array(n).fill(false);
  rem[v] = leafNow(L, S, v);
  const order: number[] = [];
  for (;;) {
    let x = -1;
    for (let i = 0; i < n; i++) if (!done[i] && rem[i] >= 0 && (x < 0 || rem[i] > rem[x])) x = i;
    if (x < 0) break;
    done[x] = true;
    order.push(x);
    L.links.forEach((e, j) => {
      if (!((S.alive >> j) & 1) || e.stone) return;
      const u = e.a === x ? e.b : e.b === x ? e.a : -1;
      if (u < 0 || done[u] || (S.gone >> u) & 1 || !L.p[u]) return;
      const r = rem[x] - weightOf(L, S, u);
      if (r >= 0 && r > rem[u]) (rem[u] = r), (from[u] = x), (via[u] = j), (step[u] = step[x] + 1);
    });
  }
  let P = 0;
  for (const i of order) P |= 1 << i;
  const snaps: Pull['snaps'] = [];
  L.links.forEach((e, j) => {
    if (!((S.alive >> j) & 1)) return;
    const ia = (P >> e.a) & 1, ib = (P >> e.b) & 1;
    if (!ia && !ib) return;
    S.alive &= ~(1 << j);
    if (ia && ib && !e.stone) return;
    if (ia !== ib || e.stone) snaps.push({ link: j, at: ia ? e.a : e.b, stone: e.stone });
  });
  for (const i of order) {
    const k = kindNow(L, S, i)!;
    if (k === 'carrot') S.carrot++;
    else if (k === 'radish') S.radish++;
    else if (k === 'big') S.big++;
    else S.bad++;
  }
  S.gone |= P;
  S.taps++;
  S.last = order.length;
  S.best = Math.max(S.best, order.length);
  const grew: number[] = [];
  for (let i = 0; i < n; i++) {
    const p = L.p[i];
    if (p && p.k === 'sprout' && !((S.gone >> i) & 1) && p.grow === S.taps) grew.push(i);
  }
  const mole: number[] = [];
  if (L.mole) {
    [S.moleG, S.moleDir] = moleNext(L, S.moleG, S.moleDir);
    moleCut(L, S, mole);
  }
  if (rec) {
    rec.order = order.map((i) => ({ i, from: from[i], link: via[i], rem: rem[i], step: step[i] }));
    rec.snaps = snaps;
    rec.mole = mole;
    rec.grew = grew;
  }
  return order.length;
}
export const won = (L: Level, S: Sim) => S.carrot >= L.goal && S.big >= L.goalBig;
/** 남은 것으로 목표를 채울 수 있나 (닿는지는 안 본다) */
function possible(L: Level, S: Sim) {
  let c = S.carrot, b = S.big;
  for (let i = 0; i < L.n; i++) {
    const p = L.p[i];
    if (!p || (S.gone >> i) & 1) continue;
    if (p.k === 'carrot' || p.k === 'sprout') c++;
    if (p.k === 'big') b++;
  }
  return c >= L.goal && b >= L.goalBig;
}
const anyTap = (L: Level, S: Sim) => L.p.some((_, i) => tappable(L, S, i));
/** 0 = 진행 중, 1 = 깸, -1 = 실패 */
export function status(L: Level, S: Sim): number {
  if (won(L, S)) return 1;
  if (S.taps >= L.limit || !possible(L, S) || !anyTap(L, S)) return -1;
  return 0;
}
export function starsOf(L: Level, S: Sim): boolean[] {
  return L.stars.map((k) => (k === 'goal' ? won(L, S) : k === 'clean' ? S.bad === 0 : S.taps <= L.par));
}

// ───────────────────────────── 판 만들기 ─────────────────────────────
function shuffle<T>(a: T[], r: Rng): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const pickW = (r: Rng, w: number[]) => {
  let t = r() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < w.length; i++) if ((t -= w[i]) < 0) return i;
  return w.length - 1;
};

/** 모든 수를 끝까지 (판 고르기·봇): 깨끗하게 깬 가장 적은 톡 · 깬 가장 적은 톡 */
function search(L: Level, S: Sim, memo: Map<string, number>, objective: (S: Sim, st: number) => number): number {
  const st = status(L, S);
  if (st !== 0) return objective(S, st);
  const key = `${S.gone},${S.alive},${S.taps}`;
  const m = memo.get(key);
  if (m !== undefined) return m;
  let best = -1e18;
  for (let i = 0; i < L.n; i++) {
    if (!tappable(L, S, i)) continue;
    const S2 = cloneSim(S);
    pull(L, S2, i);
    const v = search(L, S2, memo, objective);
    if (v > best) best = v;
  }
  memo.set(key, best);
  return best;
}
/** 판 값(봇·판 고르기 공용): 별 > 남은 톡 > 거둔 것 */
const valueOf = (L: Level) => (S: Sim, st: number) =>
  st > 0 ? 1e6 + (S.bad === 0 ? 3e5 : 0) - S.bad * 2e4 + (S.taps <= L.par ? 1e5 : 0) + (L.limit - S.taps) * 2000 + S.carrot * 30 + S.big * 60 + S.radish * 10 : -1e6 + S.carrot * 1000 + S.big * 1500 - S.bad * 300;

function minClean(L: Level, maxTaps: number): number {
  // 깨끗하게(꽃·새싹 없이) 깨는 가장 적은 톡 수 (없으면 99)
  const lim = L.limit;
  L.limit = maxTaps;
  let best = 99;
  const rec = (S: Sim) => {
    const st = status(L, S);
    if (st > 0) {
      if (S.bad === 0) best = Math.min(best, S.taps);
      return;
    }
    if (st < 0 || S.taps + 1 >= best) return;
    for (let i = 0; i < L.n; i++) {
      if (!tappable(L, S, i)) continue;
      const S2 = cloneSim(S);
      pull(L, S2, i);
      if (S2.bad) continue;
      rec(S2);
    }
  };
  rec(newSim(L));
  L.limit = lim;
  return best;
}
/** 별 셋 풀이 중에 '줄줄이'가 있는가: 한 번은 셋 이상 딸려 나오고, 하나만 뽑히는 톡은 많아야 한 번 */
function richAtPar(L: Level, par: number): boolean {
  const lim = L.limit;
  L.limit = par;
  let ok = false;
  const rec = (S: Sim, ones: number, mx: number) => {
    if (ok) return;
    const st = status(L, S);
    if (st > 0) {
      if (S.bad === 0 && ones <= 1 && mx >= 3) ok = true;
      return;
    }
    if (st < 0) return;
    for (let i = 0; i < L.n && !ok; i++) {
      if (!tappable(L, S, i)) continue;
      const S2 = cloneSim(S);
      const got = pull(L, S2, i);
      if (S2.bad || (got < 2 && ones >= 1)) continue;
      rec(S2, ones + (got < 2 ? 1 : 0), Math.max(mx, got));
    }
  };
  rec(newSim(L), 0, 0);
  L.limit = lim;
  return ok;
}
/** 버릇 봇이 고르는 칸 (판 고르기·봇 공용) */
export function habitBig(L: Level, S: Sim): number {
  let b = -1;
  for (let i = 0; i < L.n; i++) if (tappable(L, S, i) && (b < 0 || leafNow(L, S, i) > leafNow(L, S, b))) b = i;
  return b;
}
export function habitLeft(L: Level, S: Sim): number {
  for (let i = 0; i < L.n; i++) if (tappable(L, S, i)) return i;
  return -1;
}
function playHabit(L: Level, pick: (L: Level, S: Sim) => number): Sim {
  const S = newSim(L);
  while (status(L, S) === 0) {
    const i = pick(L, S);
    if (i < 0) break;
    pull(L, S, i);
  }
  return S;
}
const allStars = (L: Level, S: Sim) => starsOf(L, S).every(Boolean);
/** 아무 잎이나 톡 하는 사람이 깨는 비율 (판 고르기용) */
function randPass(L: Level, r: Rng, k: number) {
  let ok = 0;
  for (let j = 0; j < k; j++) {
    const S = playHabit(L, (L2, S2) => {
      const c: number[] = [];
      for (let i = 0; i < L2.n; i++) if (tappable(L2, S2, i)) c.push(i);
      return c.length ? c[Math.floor(r() * c.length)] : -1;
    });
    if (status(L, S) > 0) ok++;
  }
  return ok / k;
}

function rawLevel(d: StageDef, r: Rng, si: number): Level {
  const n = d.n, key = d.key;
  const kinds: Kind[] = [];
  const nFlower = key === 'chain' ? 0 : key === 'flower' || key === 'sprout' || key === 'big' ? 1 + (r() < 0.35 ? 1 : 0) : 1 + (r() < 0.6 ? 1 : 0);
  const nSprout = key === 'sprout' ? 1 + (r() < 0.5 ? 1 : 0) : key === 'all' ? 1 : 0;
  const nBig = key === 'big' || key === 'all' ? 1 : 0;
  for (let k = 0; k < nFlower; k++) kinds.push('flower');
  for (let k = 0; k < nSprout; k++) kinds.push('sprout');
  for (let k = 0; k < nBig; k++) kinds.push('big');
  const rest = n - kinds.length, nRad = key === 'chain' ? 2 : Math.max(1, Math.round(rest * (0.25 + r() * 0.2)));
  for (let k = 0; k < nRad; k++) kinds.push('radish');
  while (kinds.length < n) kinds.push('carrot');
  shuffle(kinds, r);
  if (key === 'chain') {
    // 첫 판: 가운데 큰 당근, 양옆 무 — 첫 톡에 줄줄이
    const c = 2 + Math.floor(r() * 2);
    kinds.splice(0, kinds.length, ...Array(n).fill('carrot'));
    kinds[c - 1] = 'radish';
    kinds[c + 1] = 'radish';
  }
  const p: Plant[] = kinds.map((k) => ({
    k,
    leaf: k === 'big' ? 3 : k === 'flower' ? 1 : k === 'sprout' ? 1 + Math.floor(r() * 2) : key === 'chain' ? 2 : 1 + pickW(r, LW),
    grow: k === 'sprout' ? 1 + Math.floor(r() * 2) : 0,
    wet: false,
  }));
  if (key === 'chain') {
    const c = kinds.findIndex((k, i) => k === 'carrot' && kinds[i + 1] === 'radish' && i > 0 && kinds[i - 1] === 'radish');
    if (c >= 0) p[c].leaf = 3;
  }
  if (key === 'wet' || key === 'all') {
    const len = key === 'wet' ? 3 : 2, s0 = Math.floor(r() * (n - len + 1));
    for (let i = s0; i < s0 + len; i++) if (p[i].k !== 'flower') p[i].wet = true;
  }
  const links: Link[] = [];
  const adj = key === 'wet' ? 0.78 : key === 'all' ? 0.82 : 0.86;
  for (let i = 0; i + 1 < n; i++) if (key === 'chain' ? i !== 4 - (si & 1) : r() < adj) links.push({ a: i, b: i + 1, stone: false });
  if (key !== 'chain') for (let i = 0; i + 2 < n; i++) if (r() < (key === 'wet' ? 0.22 : 0.16)) links.push({ a: i, b: i + 2, stone: false });
  // 물 칸과 꽃은 뿌리로 바로 잇지 않는다 (물 칸은 힘이 안 들어 꽃까지 늘 딸려 오므로)
  for (let j = links.length - 1; j >= 0; j--) {
    const e = links[j];
    if ((p[e.a].wet && p[e.b].k === 'flower') || (p[e.b].wet && p[e.a].k === 'flower')) links.splice(j, 1);
  }
  // 꽃은 대개 한쪽 뿌리만 (줄 끝에 핀 꽃) — 피해 갈 길이 있게
  for (let i = 0; i < n; i++) {
    if (p[i].k !== 'flower') continue;
    const mine = links.filter((e) => e.a === i || e.b === i);
    if (mine.length >= 2 && r() < 0.7) links.splice(links.indexOf(mine[Math.floor(r() * mine.length)]), 1);
  }
  if (key === 'stone' || key === 'all') {
    const k = key === 'stone' ? 1 + (r() < 0.6 ? 1 : 0) : 1;
    const adj = shuffle(links.filter((e) => Math.abs(e.a - e.b) === 1), r);
    for (let j = 0; j < k && j < adj.length; j++) adj[j].stone = true;
  }
  links.sort((x, y) => Math.abs(x.a - x.b) - Math.abs(y.a - y.b) || x.a - y.a);
  const mole = key === 'mole' ? { g: 1 + Math.floor(r() * (n - 1)), dir: r() < 0.5 ? -1 : 1 } : null;
  return { n, p, links, goal: 0, goalBig: 0, limit: 0, par: 0, mole, stars: d.stars };
}

const levelCache = new Map<string, Level>();
export function buildLevel(seed: number, si: number): Level {
  const ck = `${seed}:${si}`;
  const c = levelCache.get(ck);
  if (c) return c;
  const d = STAGES[si], r = mulberry32((seed * 2654435761 + si * 40503 + 17) >>> 0);
  let pickL: Level | null = null, fallback: Level | null = null;
  for (let tries = 0; tries < 4000 && !pickL; tries++) {
    const L = rawLevel(d, r, si);
    // 목표: 밭의 당근을 다 (새싹은 다 자란 뒤 당근으로) — 큰 무가 있으면 큰 무도
    L.goal = L.p.filter((q) => q?.k === 'carrot' || q?.k === 'sprout').length;
    L.goalBig = L.p.filter((q) => q?.k === 'big').length;
    if (L.goal < 2) continue;
    const par = minClean(L, d.maxPar);
    if (par > d.maxPar || par < d.minPar) continue;
    L.par = par;
    L.limit = par + d.slack;
    fallback ??= L;
    if (si >= 1 && !richAtPar(L, par)) continue;
    if (si >= 2) {
      // 버릇(잎 큰 것부터)이 별 셋을 따는 판은 버린다 (기준 13) — 왼쪽부터 버릇(Habit2)은 거르지 않는다(독립 측정)
      if (allStars(L, playHabit(L, habitBig))) continue;
      if (d.key === 'mole') {
        // 두더지가 판을 바꾸는 판만: 두더지가 없을 때와 가장 적은 톡 수가 달라야
        const noMole = { ...L, mole: null };
        if (minClean(noMole, d.maxPar) === par) continue;
      }
      // 아무렇게나 톡 해도 깨지는 판은 버린다 — 어디를 먼저 톡 할지가 판을 가른다
      if (randPass(L, r, 16) > d.rp) continue;
    } else if (si === 1 && randPass(L, r, 16) < 0.7) continue;
    pickL = L;
  }
  const L = pickL ?? fallback ?? (() => {
    const q = rawLevel(STAGES[0], r, 0);
    q.goal = 2;
    q.par = 2;
    q.limit = 4;
    q.stars = d.stars;
    return q;
  })();
  levelCache.set(ck, L);
  return L;
}

// ───────────────────────────── 상태 ─────────────────────────────
interface Ev { t: number; kind: string; x: number; y: number; text?: string; col?: string; v?: number }
/** 뽑힌 채소 몸: 땅속(wait) → 쑥(air) → 풀밭에 통(roll) → 바구니로 폴짝(hop) → 쏙(in) · 꽃·새싹은 풀밭에 누움(lie) */
interface Body {
  i: number; k: Kind; leaf: number; x: number; y: number; vx: number; vy: number; a: number; va: number; sq: number; sv: number;
  mode: 'wait' | 'air' | 'roll' | 'hop' | 'in' | 'lie'; popT: number; rem: number; step: number; bad: boolean; bounce: number; slot: number; t: number; wet: boolean;
}
/** 뿌리 하나(용수철 사슬): 양끝이 채소에 붙어 늘어나고, 힘이 다하면 뚝 끊겨 튕겨 나간다 */
interface Rope { link: number; a: number; b: number; kind: 'pull' | 'snap'; stone: boolean; nx: number[]; ny: number[]; px: number[]; py: number[]; rest: number; broke: number; cut: number; t0: number }
interface Chunk { x: number; y: number; vx: number; vy: number; life: number; r: number; c: number }
export interface FarmState {
  rng: Rng; vr: Rng; seed: number; t: number; ph: number; stage: number; phase: 'play' | 'settle' | 'result'; pt: number;
  L: Level; S: Sim; down: boolean; ax: number; ay: number; lastTap: number; startT: number; busy: number;
  hearts: number; stars: number; got: number; starOk: boolean[]; pts: number; ok: boolean; why: string; won: boolean; dead: boolean; tries: number; again: boolean;
  seen: Set<string>; events: Ev[]; banner: { head: string; sub: string; t: number } | null; spot: { x: number; y: number; rx: number; ry: number; label: string; t: number; i: number } | null;
  bodies: Body[]; ropes: Rope[]; chunks: Chunk[]; holes: { i: number; t: number }[]; inBasket: number;
  wowN: number; slow: number; mood: string; moodT: number; firstTap: number; poke: { i: number; t: number; text: string } | null;
  moleX: number; moleT: number; grownT: number[]; wowAt: number; wowText: string; wowX: number; wowBig: number;
}
const ev = (s: FarmState, kind: string, x: number, y: number, text?: string, col?: string, v?: number) => s.events.push({ t: s.t, kind, x, y, text, col, v });
const see = (s: FarmState, key: string) => s.seen.add(key);
const setMood = (s: FarmState, m: string) => ((s.mood = m), (s.moodT = s.t));

function newStage(s: FarmState) {
  const d = STAGES[s.stage];
  s.L = buildLevel(s.seed, s.stage);
  s.S = newSim(s.L);
  s.phase = 'play';
  s.pt = 0;
  s.startT = s.t;
  s.busy = s.t + 20;
  s.bodies = [];
  s.ropes = [];
  s.holes = [];
  s.inBasket = 0;
  s.got = 0;
  s.starOk = d.stars.map(() => false);
  s.poke = null;
  s.moleX = s.L.mole ? gapX(s.L, s.S.moleG) : 0;
  s.moleT = -99;
  s.grownT = s.L.p.map(() => -99);
  s.wowAt = -1;
  s.chunks = [];
  see(s, d.key);
  if (s.again) s.banner = { head: `다시! ${s.stage + 1}판 · ${d.name}`, sub: d.hint, t: s.t };
  else s.banner = s.stage === 0 ? null : { head: `${s.stage + 1}판 · ${d.name}`, sub: d.news ? `NEW  ${d.news}` : d.hint, t: s.t };
  s.spot = null;
  if (!s.again && s.stage > 0) {
    const L = s.L, find = (f: (q: Plant) => boolean) => L.p.findIndex((q) => !!q && f(q));
    let i = -1;
    if (d.key === 'flower') i = find((q) => q.k === 'flower');
    if (d.key === 'sprout') i = find((q) => q.k === 'sprout');
    if (d.key === 'big') i = find((q) => q.k === 'big');
    if (i >= 0) s.spot = { x: slotX(L.n, i), y: SURF + 0.02, rx: 0.085, ry: 0.2, label: d.spot, t: s.t, i };
    if (d.key === 'stone') {
      const e = L.links.find((q) => q.stone);
      if (e) s.spot = { x: (slotX(L.n, e.a) + slotX(L.n, e.b)) / 2, y: linkDip(L, e), rx: 0.09, ry: 0.06, label: d.spot, t: s.t, i: -1 };
    }
    if (d.key === 'mole' && L.mole) s.spot = { x: gapX(L, s.S.moleG), y: MOLE_Y, rx: 0.1, ry: 0.07, label: d.spot, t: s.t, i: -1 };
    if (d.key === 'wet') {
      const w = L.p.map((q, k) => (q?.wet ? k : -1)).filter((k) => k >= 0);
      if (w.length) s.spot = { x: (slotX(L.n, w[0]) + slotX(L.n, w[w.length - 1])) / 2, y: SURF + 0.07, rx: (slotW(L.n) * w.length) / 2 + 0.02, ry: 0.11, label: d.spot, t: s.t, i: -1 };
    }
  }
  s.again = false;
}

function finish(s: FarmState) {
  s.phase = 'result';
  s.pt = 0;
  const L = s.L, S = s.S;
  if (s.ok) {
    s.starOk = starsOf(L, S);
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    // 별이 많을수록, 뒤 판일수록 크게 (별 하나 100 · 둘 220 · 셋 400)
    s.pts += Math.round((CLEAR_PTS + STAR_PTS[s.got] + (L.limit - S.taps) * TAP_PTS + S.carrot * 4 + S.big * 20 + S.radish * 2) * (1 + 0.15 * s.stage));
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS + s.hearts * 50);
    ev(s, 'clear', 0.5, 0.35, '', '', s.got);
    setMood(s, 'cheer');
  } else {
    s.hearts--;
    s.tries++;
    s.pts += S.carrot * 4;
    ev(s, 'fail', 0.5, 0.35, s.why);
    setMood(s, 'dizzy');
  }
}

/** 손가락 자리에서 가장 가까운 칸 (잎·몸통 어디를 눌러도 그 채소) */
function pickSlot(s: FarmState, x: number, y: number): number {
  const L = s.L;
  if (y < SURF - 0.27 || y > SEC_BOT) return -2;
  let best = -1, bd = slotW(L.n) * 0.62;
  for (let i = 0; i < L.n; i++) {
    if (!L.p[i] || (s.S.gone >> i) & 1) continue;
    const dd = Math.abs(slotX(L.n, i) - x);
    if (dd < bd) (bd = dd), (best = i);
  }
  return best;
}

// 뿌리·몸 위치 (단면 안)
const MOLE_Y = 1.03;
const gapX = (L: Level, g: number) => (slotX(L.n, g - 1) + slotX(L.n, g)) / 2;
export const bodyH = (k: Kind) => (k === 'carrot' ? 0.27 : k === 'radish' ? 0.2 : k === 'big' ? 0.33 : k === 'flower' ? 0.13 : 0.09);
const tipY = (k: Kind) => SURF + bodyH(k);
/** 뿌리 이음이 가장 깊이 처지는 높이 */
function linkDip(L: Level, e: Link) {
  const span = Math.abs(e.a - e.b), ka = L.p[e.a]!.k, kb = L.p[e.b]!.k;
  const deep = Math.max(tipY(ka), tipY(kb));
  return span === 1 ? deep + 0.045 + (e.a % 2) * 0.015 : Math.max(deep, tipY(L.p[(e.a + e.b) >> 1]?.k ?? 'carrot')) + 0.1 + (e.a % 2) * 0.02;
}

function tapAt(s: FarmState, x: number, y: number) {
  const L = s.L, S = s.S, i = pickSlot(s, x, y);
  if (i === -2) return;
  if (i < 0) {
    if (y > SURF - 0.2 && y < SEC_BOT) ev(s, 'miss', x, Math.min(y, SURF - 0.05), '잎을 톡!', '#fff6df');
    return;
  }
  const k = kindNow(L, S, i)!;
  if (!tappable(L, S, i)) {
    s.poke = { i, t: s.t, text: k === 'big' ? '끄응!' : k === 'flower' ? '간지러워!' : '아직 덜 컸어요!' };
    ev(s, 'poke', slotX(L.n, i), SURF - 0.12, s.poke.text, k === 'big' ? '#ffe2a8' : '#ffd6ec', i);
    if (k === 'big') s.seen.add('bigtap');
    setMood(s, k === 'big' ? 'laugh' : 'huh');
    return;
  }
  if (s.firstTap < 0) s.firstTap = s.t;
  if (s.banner && s.t - s.banner.t < 145) s.banner.t = s.t - 145;
  const rec = {} as Pull;
  pull(L, S, i, rec);
  s.lastTap = s.t;
  startPull(s, rec);
  const st = status(L, S);
  if (st !== 0) {
    s.phase = 'settle';
    s.pt = 0;
    s.ok = st > 0;
    s.why = s.ok ? '' : !possible(L, S) ? '당근이 모자라요!' : S.taps >= L.limit ? '톡을 다 썼어요!' : '더 뽑을 잎이 없어요!';
  }
}

// ───────────────────────────── 물리 (결정적, 고정 간격) ─────────────────────────────
const G = 0.0016, POP_GAP = 9, ROPE_N = 9, LAND = GRASS - 0.028;
/** 몸에 붙은 뿌리 자리 (몸 가운데 기준, 머리가 위) */
const rootLocal = (k: Kind, side: number): [number, number] => {
  const hh = bodyH(k) / 2;
  return k === 'carrot' ? [side * 0.022, 0.17 - hh] : k === 'radish' ? [side * 0.04, 0.11 - hh] : k === 'big' ? [side * 0.062, 0.2 - hh] : k === 'flower' ? [side * 0.005, 0.1 - hh] : [side * 0.016, 0.06 - hh];
};
/** 지금 보이는 종류 (자라는 연출이 끝나야 당근) */
export function visKind(s: FarmState, i: number): Kind {
  const p = s.L.p[i]!;
  if (p.k !== 'sprout') return p.k;
  return s.S.taps >= p.grow && s.t >= s.grownT[i] ? 'carrot' : 'sprout';
}
const bodyOf = (s: FarmState, i: number) => {
  for (let k = s.bodies.length - 1; k >= 0; k--) if (s.bodies[k].i === i) return s.bodies[k];
  return undefined;
};
function anchorOf(s: FarmState, i: number, other: number): [number, number] {
  const L = s.L, side = slotX(L.n, other) > slotX(L.n, i) ? 1 : -1, b = bodyOf(s, i);
  if (!b) {
    const k = visKind(s, i), [lx, ly] = rootLocal(k, side);
    return [slotX(L.n, i) + lx, SURF + bodyH(k) / 2 + ly];
  }
  const [lx, ly] = rootLocal(b.k, side), c = Math.cos(b.a), sn = Math.sin(b.a), sy = 1 + b.sq, sx = 1 / (1 + b.sq * 0.4);
  return [b.x + lx * sx * c - ly * sy * sn, b.y + lx * sx * sn + ly * sy * c];
}
function makeRope(s: FarmState, link: number, kind: Rope['kind']): Rope {
  const L = s.L, e = L.links[link];
  const [ax, ay] = anchorOf(s, e.a, e.b), [bx, by] = anchorOf(s, e.b, e.a), dip = linkDip(L, e);
  const nx: number[] = [], ny: number[] = [];
  for (let k = 0; k < ROPE_N; k++) {
    const [x, y] = curveAt(ax, ay, bx, by, dip, k / (ROPE_N - 1));
    nx.push(x), ny.push(y);
  }
  let len = 0;
  for (let k = 1; k < ROPE_N; k++) len += Math.hypot(nx[k] - nx[k - 1], ny[k] - ny[k - 1]);
  return { link, a: e.a, b: e.b, kind, stone: e.stone, nx, ny, px: nx.slice(), py: ny.slice(), rest: len / (ROPE_N - 1), broke: -1, cut: -1, t0: s.t };
}
/** 뿌리 곡선: 양끝에서 깊이 dip까지 처진 2차 곡선 */
function curveAt(ax: number, ay: number, bx: number, by: number, dip: number, q: number): [number, number] {
  const cx = (ax + bx) / 2, cy = 2 * dip - (ay + by) / 2;
  return [(1 - q) * (1 - q) * ax + 2 * q * (1 - q) * cx + q * q * bx, (1 - q) * (1 - q) * ay + 2 * q * (1 - q) * cy + q * q * by];
}
function startPull(s: FarmState, rec: Pull) {
  const L = s.L, n = rec.order.length;
  const base = s.ph + 2;
  rec.order.forEach((o, j) => {
    const p = L.p[o.i]!, k = p.k === 'sprout' && s.S.taps - 1 >= p.grow ? 'carrot' : p.k;
    const bad = k === 'flower' || k === 'sprout';
    s.bodies.push({
      i: o.i, k, leaf: p.k === 'sprout' ? (s.S.taps - 1 >= p.grow ? p.leaf : 0) : p.leaf, x: slotX(L.n, o.i), y: SURF + bodyH(k) / 2, vx: 0, vy: 0, a: 0, va: 0, sq: 0, sv: 0,
      mode: 'wait', popT: base + o.step * POP_GAP + (j > 0 && rec.order[j - 1].step === o.step ? 2 : 0), rem: o.rem, step: o.step, bad, bounce: 0, slot: -1, t: s.t, wet: p.wet,
    });
    if (o.link >= 0) s.ropes.push(makeRope(s, o.link, 'pull'));
  });
  for (const sn of rec.snaps) s.ropes.push(makeRope(s, sn.link, 'snap'));
  const maxStep = Math.max(...rec.order.map((o) => o.step));
  s.busy = s.t + maxStep * POP_GAP + 26;
  if (n >= 3) {
    const o3 = rec.order[2];
    s.wowAt = base + o3.step * POP_GAP + 4;
    s.wowText = n >= 5 ? `줄줄이 ×${n}!!` : `줄줄이 ×${n}!`;
    s.wowX = slotX(L.n, o3.i);
    s.wowBig = n;
    s.seen.add('chain3');
  }
  for (const j of rec.mole) s.ropes.push({ ...makeRope(s, j, 'snap'), cut: s.t + maxStep * POP_GAP + 30 });
  if (rec.mole.length || L.mole) s.moleT = s.t + maxStep * POP_GAP + 22;
  for (const i of rec.grew) s.grownT[i] = s.t + maxStep * POP_GAP + 30;
  // 새싹이 자라고 두더지가 갉는 것까지 보고 나서 다음 톡
  if (rec.grew.length) s.busy = Math.max(s.busy, s.t + maxStep * POP_GAP + 44);
  if (rec.mole.length) s.busy = Math.max(s.busy, s.t + maxStep * POP_GAP + 36);
  if (s.bodies.slice(-n).some((b) => b.bad)) setMood(s, 'gasp');
  else if (n >= 3) setMood(s, 'wow');
  else setMood(s, 'happy');
}

function physics(s: FarmState) {
  const dt = s.slow > 0 ? 0.35 : 1;
  if (s.slow > 0) s.slow--;
  s.ph += dt;
  const L = s.L;
  if (s.wowAt >= 0 && s.ph >= s.wowAt) {
    // 큰 순간: 줄줄이 셋 이상 — 잠깐 느려지며 큰 글자
    s.wowAt = -1;
    s.wowN++;
    s.slow = s.wowBig >= 4 ? 26 : 12;
    ev(s, 'wow', s.wowX, SURF - 0.3, s.wowText, '#fff27a', s.wowBig);
  }
  for (const b of s.bodies) {
    if (b.mode === 'wait') {
      // 뿌리가 당기는 동안 살짝 들리며 늘어난다 (기대감)
      const q = Math.max(0, Math.min(1, 1 - (b.popT - s.ph) / 9));
      b.y = SURF + bodyH(b.k) / 2 - 0.022 * q;
      b.sq = 0.18 * q;
      b.a = Math.sin(s.t * 0.9 + b.i) * 0.05 * q;
      if (s.ph >= b.popT) {
        // 쑥! 용수철처럼 늘어나며 튀어 오른다
        b.mode = 'air';
        const up = 0.03 + Math.min(3, b.rem) * 0.0017 + (b.wet ? 0.004 : 0) + (b.step === 0 ? 0.004 : 0) + (b.k === 'big' ? 0.002 : 0);
        b.vy = -up;
        const fly = (2 * up) / G + 6, tx = b.bad ? 0.2 + 0.1 * hsh(b.i + 7) : 0.5 + 0.28 * hsh(b.i * 3 + s.S.taps);
        b.vx = (tx - b.x) / fly;
        b.va = (b.vx >= 0 ? 1 : -1) * (0.018 + 0.01 * (b.i % 3));
        b.t = s.t;
        b.sq = 0.6;
        b.sv = 0.02;
        s.holes.push({ i: b.i, t: s.t });
        const n = b.step === 0 ? 30 : 16;
        for (let k = 0; k < n; k++) {
          const a = -Math.PI / 2 + (s.vr() - 0.5) * 2.6, v = 0.006 + s.vr() * (b.step === 0 ? 0.02 : 0.014);
          s.chunks.push({ x: b.x + (s.vr() - 0.5) * 0.06, y: SURF - 0.004, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 50 + s.vr() * 50, r: 0.004 + s.vr() * 0.009, c: Math.floor(s.vr() * 3) });
        }
        ev(s, 'pop', b.x, SURF - 0.05, b.step === 0 ? '쑥!' : b.k === 'big' ? '쑤욱!' : '뽁!', b.bad ? '#ffc8dc' : '#ffffff', b.step);
        if (b.bad) ev(s, 'bad', b.x, SURF - 0.2, b.k === 'flower' ? '꽃이 뽑혔어요!' : '새싹이 뽑혔어요!', '#ffb8c8');
      }
      continue;
    }
    // 용수철 늘어남 → 탁 (눌림·튐)
    b.sv += (-0.2 * b.sq - 0.14 * b.sv) * dt;
    b.sq += b.sv * dt;
    if (b.mode === 'air') {
      b.vy += G * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.a += b.va * dt;
      b.va *= Math.pow(0.985, dt);
      if (b.x < 0.06) (b.x = 0.06), (b.vx = Math.abs(b.vx) * 0.5);
      if (b.x > 0.95) (b.x = 0.95), (b.vx = -Math.abs(b.vx) * 0.5);
      if (b.vy > 0 && b.y >= LAND) {
        b.y = LAND;
        b.bounce++;
        b.vy = -b.vy * (b.bounce === 1 ? 0.42 : 0.22);
        b.va *= 0.5;
        b.sq = -0.3;
        b.sv = 0;
        if (b.bounce === 1) ev(s, 'land', b.x, GRASS - 0.005, '', b.bad ? '#e8a8c0' : '#cfe8a0');
        if (Math.abs(b.vy) < 0.007 || b.bounce >= 2) (b.mode = b.bad ? 'lie' : 'roll'), (b.vy = 0);
      }
    } else if (b.mode === 'roll') {
      // 바구니 쪽으로 데굴데굴
      const goal = BASK_X - 0.085, dir = goal > b.x ? 1 : -1;
      b.vx += dir * 0.0007 * dt;
      b.vx *= Math.pow(0.965, dt);
      b.x += b.vx * dt;
      // 데굴데굴: 옆으로 누워 들썩이며 미끄러진다 (잎이 땅속으로 휘돌지 않게)
      const want = Math.cos(b.a) > 0 ? (Math.sin(b.a) >= 0 ? Math.PI / 2 : -Math.PI / 2) : Math.sin(b.a) >= 0 ? Math.PI / 2 : -Math.PI / 2;
      b.a += (want + Math.sin(s.t * 0.45 + b.i) * 0.22 - b.a) * 0.15 * dt;
      b.y = LAND - Math.abs(Math.sin(s.t * 0.3 + b.i)) * 0.012;
      if ((dir > 0 && b.x >= goal) || (dir < 0 && b.x <= goal)) {
        b.mode = 'hop';
        b.vy = -0.02;
        b.vx = (BASK_X - b.x) / 22;
        b.t = s.t;
        b.sq = 0.3;
      }
    } else if (b.mode === 'hop') {
      b.vy += G * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.a += 0.15 * dt;
      if (b.vy > 0 && b.y >= BASK_Y - 0.03) {
        b.mode = 'in';
        b.slot = s.inBasket++;
        b.t = s.t;
        ev(s, 'in', BASK_X, BASK_Y - 0.04, b.k === 'big' ? '큰 무 쏙!' : '쏙!', '#fff6c0', b.slot);
      }
    } else if (b.mode === 'lie') {
      b.vx *= Math.pow(0.9, dt);
      b.x += b.vx * dt;
      const want = b.x < 0.5 ? Math.PI / 2 : -Math.PI / 2;
      b.a += (want - b.a) * 0.08 * dt;
      b.y = LAND + 0.008;
    }
  }
  // 뿌리(용수철 사슬) — 양끝은 채소에 붙고 가운데는 늘어난다
  for (const r of s.ropes) {
    const [ax, ay] = anchorOf(s, r.a, r.b), [bx, by] = anchorOf(s, r.b, r.a);
    const ba = bodyOf(s, r.a), bb = bodyOf(s, r.b);
    const fa = !!ba && ba.mode !== 'wait', fb = !!bb && bb.mode !== 'wait';
    if (r.broke < 0) {
      let len = 0;
      for (let k = 1; k < ROPE_N; k++) len += Math.hypot(r.nx[k] - r.nx[k - 1], r.ny[k] - r.ny[k - 1]);
      const st = len / (r.rest * (ROPE_N - 1));
      // 힘이 다한 뿌리는 늘어나다 뚝 · 돌에 걸린 뿌리는 금방 뚝 · 두더지는 정해진 때에 냠
      if (r.kind === 'snap' && ((r.cut < 0 && (st > (r.stone ? 1.3 : 1.9) || ((fa || fb) && s.t - r.t0 > 60))) || (r.cut >= 0 && s.t >= r.cut))) {
        r.broke = s.t;
        const m = ROPE_N >> 1;
        ev(s, r.cut >= 0 ? 'nom' : 'snap', r.nx[m], r.ny[m], r.cut >= 0 ? '냠!' : r.stone ? '돌에 걸려 뚝!' : '뚝!', r.stone ? '#efe6d6' : '#ffe9b0', r.stone ? 1 : 0);
      }
      if (r.kind === 'pull' && fa && fb && s.t - Math.max(ba!.t, bb!.t) > 26) r.broke = s.t;
    }
    const m = ROPE_N >> 1;
    for (let k = 0; k < ROPE_N; k++) {
      const vx = (r.nx[k] - r.px[k]) * 0.9, vy = (r.ny[k] - r.py[k]) * 0.9;
      r.px[k] = r.nx[k];
      r.py[k] = r.ny[k];
      r.nx[k] += vx * dt;
      r.ny[k] += (vy + (r.broke >= 0 ? 0.0009 : 0.0002)) * dt;
    }
    for (let it = 0; it < 4; it++) {
      for (let k = 1; k < ROPE_N; k++) {
        if (r.broke >= 0 && k === m) continue;
        const dx = r.nx[k] - r.nx[k - 1], dy = r.ny[k] - r.ny[k - 1], dd = Math.hypot(dx, dy) || 1e-6;
        const want = r.rest * (r.broke >= 0 ? 0.75 : 1);
        if (dd <= want && r.broke < 0) continue;
        const f = ((dd - want) / dd) * (r.broke >= 0 ? 0.5 : 0.2);
        r.nx[k] -= dx * f * 0.5;
        r.ny[k] -= dy * f * 0.5;
        r.nx[k - 1] += dx * f * 0.5;
        r.ny[k - 1] += dy * f * 0.5;
      }
      r.nx[0] = ax;
      r.ny[0] = ay;
      r.nx[ROPE_N - 1] = bx;
      r.ny[ROPE_N - 1] = by;
      // 아직 땅에 박힌 쪽 절반은 흙이 붙잡는다
      if (r.broke < 0) {
        const e = L.links[r.link], dip = linkDip(L, e);
        for (let k = 1; k < ROPE_N - 1; k++) {
          if (k < m ? fa : fb) continue;
          const [hx, hy] = curveAt(ax, ay, bx, by, dip, k / (ROPE_N - 1));
          r.nx[k] += (hx - r.nx[k]) * 0.1;
          r.ny[k] += (hy - r.ny[k]) * 0.1;
        }
      }
    }
  }
  if (s.ropes.length) s.ropes = s.ropes.filter((r) => r.broke < 0 || s.t - r.broke < 32);
  // 흙 파편: 튀어 올랐다 밭 위에 톡톡
  for (const c of s.chunks) {
    c.vy += G * 0.85 * dt;
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    c.life -= dt;
    if (c.vy > 0 && c.y > SURF - 0.008 && c.y < SURF + 0.03 && c.x > BX0 && c.x < BX1) (c.y = SURF - 0.008), (c.vy *= -0.3), (c.vx *= 0.55);
    else if (c.vy > 0 && c.y > LAND + 0.02 && c.y < LAND + 0.04 && (c.x < BX0 || c.x > BX1)) (c.vy *= -0.3), (c.vx *= 0.55);
  }
  if (s.chunks.length) s.chunks = s.chunks.filter((c) => c.life > 0);
  if (s.chunks.length > 260) s.chunks.splice(0, s.chunks.length - 260);
  // 두더지는 다음 굴로 꾸물꾸물
  if (L.mole && s.t >= s.moleT) s.moleX += (gapX(L, s.S.moleG) - s.moleX) * 0.07;
}
/** 꼭대기를 지나 풀밭으로 내려오는 몸은 밭 뒤에 그린다 */
const backLayer = (b: Body) => b.mode === 'roll' || b.mode === 'lie' || b.mode === 'hop' || (b.mode === 'air' && b.vy > 0 && b.y < SURF - 0.05);
const settled = (s: FarmState) => s.bodies.every((b) => b.mode === 'in' || b.mode === 'lie');

export const pluckfarm: GameDef<FarmState> & { wows(s: FarmState): number } = {
  id: 'pluckfarm',
  name: '🥕 쑥쑥 뿌리 뽑기 텃밭',
  genes: ['pluck', 'chain'],
  twist: '잎 하나를 톡 하면 땅속 뿌리 이음을 따라 옆 채소들이 줄줄이 딸려 나오는데, 딸려 나오는 거리가 그 채소의 잎 수라서 — 어디를 톡 하느냐로 꽃 바로 앞에서 뿌리가 뚝 끊기게 만든다',
  rules: ['잎을 톡 → 쑥! 뿌리로 이어진 채소가 잎 수만큼 줄줄이 딸려 나와요.', '목표 채소를 바구니에 — 꽃·새싹은 뽑지 말고, 톡 수는 정해져 있어요.'],
  controls: 'touch',
  hint: '잎을 톡! / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '햇살 텃밭의 땅속 단면 — 뿌리로 이어진 채소 뽑기',
    mood: '울타리 너머 언덕과 구름, 밭고랑에 살랑이는 당근·무 잎. 앞쪽 흙은 잘라 낸 단면이라 땅속에서 쿨쿨 자는 채소와 서로 엉킨 뿌리가 보인다. 톡 하면 쑥 늘어났다 튀어 오르며 흙이 튀고, 뿌리에 매달린 이웃이 줄줄이 따라 나와 풀밭을 데굴데굴 굴러 바구니로 쏙. 울타리 옆 토끼가 폴짝 박수.',
    palette: { bg: '#bfe6ff', ink: '#3a2614', muted: '#8a6a48', accent: '#ff9a2e', hot: '#ff5a5a', soft: '#fff4dc' },
  },
  reveals: (s) => s.seen.size,
  guard: (s) => {
    const L = s.L, S = s.S;
    let n = 0;
    for (let i = 0; i < L.n; i++) {
      const k = kindNow(L, S, i);
      if (k === 'flower' || k === 'sprout') n++;
    }
    return n;
  },
  cleared: (s) => (s.phase === 'result' && s.ok ? { stage: s.stage, got: s.got, of: s.starOk.length } : null),
  wows: (s) => s.wowN,
  create(seed) {
    const s = {
      rng: mulberry32(seed), vr: mulberry32(seed ^ 0x5bd1e995), seed, t: 0, ph: 0, stage: 0, phase: 'play', pt: 0,
      down: false, ax: 0.5, ay: 0.5, lastTap: -99, startT: 0, busy: 0,
      hearts: 3, stars: 0, got: 0, starOk: [], pts: 0, ok: false, why: '', won: false, dead: false, tries: 0, again: false,
      seen: new Set<string>(), events: [], banner: null, spot: null,
      bodies: [], ropes: [], chunks: [], holes: [], inBasket: 0,
      wowN: 0, slow: 0, mood: 'idle', moodT: 0, firstTap: -1, poke: null, moleX: 0, moleT: -99, grownT: [], wowAt: -1, wowText: '', wowX: 0.5, wowBig: 0,
    } as unknown as FarmState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    const p = inp.pointer ?? null, press = !!p && !s.down;
    if (p) (s.ax = p.x), (s.ay = p.y);
    s.down = !!p;
    s.t++;
    s.pt++;
    physics(s);
    for (let i = 0, said = 0; i < s.L.n; i++) if (s.grownT[i] === s.t) ev(s, 'grow', slotX(s.L.n, i), SURF - 0.08, said++ ? '' : '쑥쑥! 당근이 됐어요', '#d8ffb0');
    if (s.L.mole && s.moleT === s.t) ev(s, 'mole', gapX(s.L, s.S.moleG), MOLE_Y, '두더지 꾸물꾸물', '#ffe2c0');
    if (s.events.length > 60 || (s.events.length && s.t - s.events[0].t > 260)) s.events = s.events.filter((e) => s.t - e.t < 260);
    if (s.mood !== 'idle' && s.t - s.moodT > (s.mood === 'dizzy' || s.mood === 'cheer' ? 300 : 80)) s.mood = 'idle';
    if (s.spot && (s.t - s.spot.t > 220 || (s.spot.i >= 0 && (s.S.gone >> s.spot.i) & 1) || (s.spot.i < 0 && s.S.taps > 0 && s.t - s.lastTap > 40))) s.spot = null;
    if (s.phase === 'result') {
      if (s.pt >= (s.ok ? 170 : 150) || (press && s.pt > 50)) {
        if (s.ok) {
          if (s.won) s.dead = true;
          else s.stage++, newStage(s);
        } else if (s.hearts <= 0) s.dead = true;
        else (s.again = true), newStage(s);
      }
      return;
    }
    if (s.phase === 'settle') {
      if ((settled(s) && s.pt > 30) || s.pt > 220) finish(s);
      return;
    }
    if (press && s.t >= s.busy && !s.bodies.some((b) => b.mode === 'wait')) tapAt(s, p!.x, p!.y * A);
  },
  over: (s) => s.dead,
  score: (s) => Math.round(s.pts),
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
const atSlot = (L: Level, i: number): Input => ({ tap: false, dir: 0, pointer: { x: slotX(L.n, i), y: (SURF - 0.1) / A } });
const ready = (s: FarmState) => s.phase === 'play' && !s.down && s.t >= s.busy && !s.bodies.some((b) => b.mode === 'wait') && s.t - s.startT >= 40 && s.t - s.lastTap >= 30;
const plan = new Map<string, number>();
/** 끝까지 모든 순서를 셈해 가장 좋은 톡 (판마다 같은 상태는 기억) */
export function bestTap(L: Level, S: Sim, seedKey: string): number {
  const key = `${seedKey}:${S.gone}:${S.alive}:${S.taps}`;
  const c = plan.get(key);
  if (c !== undefined) return c;
  const memo = new Map<string, number>(), val = valueOf(L);
  let best = -1e18, pick = -1;
  for (let i = 0; i < L.n; i++) {
    if (!tappable(L, S, i)) continue;
    const S2 = cloneSim(S);
    pull(L, S2, i);
    const v = search(L, S2, memo, val);
    if (v > best) (best = v), (pick = i);
  }
  plan.set(key, pick);
  return pick;
}
export const pluckfarmSmart: Bot<FarmState> = {
  name: '텃밭 농부',
  act(s) {
    if (!ready(s)) return NO;
    const i = bestTap(s.L, s.S, `${s.seed}:${s.stage}`);
    return i >= 0 ? atSlot(s.L, i) : NO;
  },
};
/** 버릇 봇 1: 늘 잎이 가장 큰 채소를 톡 (같으면 왼쪽) */
export const pluckfarmHabit: Bot<FarmState> = {
  name: '버릇: 가장 큰 잎',
  act(s) {
    if (!ready(s)) return NO;
    const i = habitBig(s.L, s.S);
    return i >= 0 ? atSlot(s.L, i) : NO;
  },
};
/** 버릇 봇 2: 늘 왼쪽부터 차례로 톡 */
export const pluckfarmHabit2: Bot<FarmState> = {
  name: '버릇: 왼쪽부터',
  act(s) {
    if (!ready(s)) return NO;
    const i = habitLeft(s.L, s.S);
    return i >= 0 ? atSlot(s.L, i) : NO;
  },
};
const dumbAt = new WeakMap<object, { next: number; until: number; p: { x: number; y: number } }>();
/** 못하는 봇: 아무 때나 아무 잎(가끔은 화면 아무 데나) 톡 */
export const pluckfarmRandom: Bot<FarmState> = {
  name: '아무 잎이나 톡',
  act(s, rng) {
    let m = dumbAt.get(s);
    if (!m) dumbAt.set(s, (m = { next: 20 + Math.floor(rng() * 60), until: -1, p: { x: 0, y: 0 } }));
    if (s.t < m.until) return { tap: false, dir: 0, pointer: m.p };
    if (s.t < m.next) return NO;
    m.next = s.t + 30 + Math.floor(rng() * 110);
    m.until = s.t + 2 + Math.floor(rng() * 4);
    const L = s.L, list: number[] = [];
    for (let i = 0; i < L.n; i++) if (L.p[i] && !((s.S.gone >> i) & 1)) list.push(i);
    if (rng() < 0.2 || !list.length) m.p = { x: rng(), y: rng() };
    else {
      const i = list[Math.floor(rng() * list.length)];
      m.p = { x: slotX(L.n, i) + (rng() - 0.5) * 0.04, y: (SURF - 0.12 + rng() * 0.3) / A };
    }
    return { tap: false, dir: 0, pointer: m.p };
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
type C2 = CanvasRenderingContext2D;
const TAU = Math.PI * 2;
const clamp01 = (q: number) => Math.max(0, Math.min(1, q));
const ease = (q: number) => 1 - Math.pow(1 - clamp01(q), 2.4);
function ell(ctx: C2, x: number, y: number, rx: number, ry: number, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
}
function rr(ctx: C2, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2)));
}
function lin(ctx: C2, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}
const FLOWER = [['#ff7eb6', '#ffe14d'], ['#ffd23a', '#ff8a3a'], ['#b48cff', '#ffe066'], ['#ff6a6a', '#fff0a0']];
const NUM = ['', '한', '두', '세', '네', '다섯', '여섯'];
type Face = 'sleep' | 'wow' | 'happy' | 'cry' | 'strain' | 'giggle' | 'dizzy' | 'peek';

/** 얼굴: 땅속엔 쿨쿨, 뽑히면 눈이 동그래, 바구니에선 헤헤 */
function drawFace(ctx: C2, x: number, y: number, u: number, f: Face, t: number) {
  const ex = u * 0.42, ey = 0;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#4a2414';
  ctx.fillStyle = '#3a1a0c';
  ctx.lineWidth = Math.max(1.2, u * 0.16);
  if (f === 'sleep') {
    for (const sd of [-1, 1]) (ctx.beginPath(), ctx.arc(x + sd * ex, y + ey, u * 0.2, 0.15 * Math.PI, 0.85 * Math.PI), ctx.stroke());
  } else if (f === 'happy' || f === 'giggle') {
    for (const sd of [-1, 1]) (ctx.beginPath(), ctx.arc(x + sd * ex, y + ey + u * 0.08, u * 0.2, 1.15 * Math.PI, 1.85 * Math.PI), ctx.stroke());
  } else if (f === 'dizzy') {
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      for (let k = 0; k < 14; k++) {
        const a = k * 0.6 + t * 0.3, r = (k / 14) * u * 0.24;
        ctx.lineTo(x + sd * ex + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      ctx.stroke();
    }
  } else if (f === 'strain') {
    for (const sd of [-1, 1]) (ctx.beginPath(), ctx.moveTo(x + sd * ex - u * 0.18, y - sd * 0), ctx.lineTo(x + sd * ex + u * 0.18 * sd, y + u * 0.1), ctx.lineTo(x + sd * ex - u * 0.18, y + u * 0.18), ctx.stroke());
  } else {
    const big = f === 'wow' ? 0.27 : 0.22;
    for (const sd of [-1, 1]) {
      ctx.fillStyle = '#ffffff';
      ell(ctx, x + sd * ex, y + ey, u * big, u * big * 1.15);
      ctx.fill();
      ctx.fillStyle = '#2a140a';
      ell(ctx, x + sd * ex + u * 0.03, y + ey + u * 0.03, u * big * 0.55, u * big * 0.65);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ell(ctx, x + sd * ex - u * 0.04, y + ey - u * 0.06, u * 0.06, u * 0.06);
      ctx.fill();
    }
  }
  // 볼
  ctx.fillStyle = 'rgba(255,120,120,.45)';
  for (const sd of [-1, 1]) (ell(ctx, x + sd * u * 0.72, y + u * 0.3, u * 0.17, u * 0.11), ctx.fill());
  // 입
  ctx.strokeStyle = '#4a2414';
  ctx.lineWidth = Math.max(1.1, u * 0.13);
  if (f === 'wow' || f === 'cry') {
    ctx.fillStyle = '#7a2a1a';
    ell(ctx, x, y + u * 0.48, u * 0.14, u * (f === 'wow' ? 0.19 : 0.12));
    ctx.fill();
  } else if (f === 'happy' || f === 'giggle' || f === 'peek') {
    ctx.beginPath();
    ctx.arc(x, y + u * 0.3, u * 0.2, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  } else if (f === 'strain') {
    ctx.beginPath();
    ctx.moveTo(x - u * 0.2, y + u * 0.45);
    for (let k = 1; k <= 4; k++) ctx.lineTo(x - u * 0.2 + k * u * 0.1, y + u * (k % 2 ? 0.38 : 0.47));
    ctx.stroke();
  } else if (f === 'sleep') {
    ctx.beginPath();
    ctx.arc(x, y + u * 0.42, u * 0.08, 0, TAU);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(x - u * 0.12, y + u * 0.42);
    ctx.lineTo(x + u * 0.12, y + u * 0.42);
    ctx.stroke();
  }
  if (f === 'cry') {
    ctx.fillStyle = '#7fd0ff';
    for (const sd of [-1, 1]) {
      const dy = ((t * 0.04 + (sd > 0 ? 0.5 : 0)) % 1) * u * 0.6;
      ell(ctx, x + sd * ex, y + u * 0.25 + dy, u * 0.07, u * 0.1);
      ctx.fill();
    }
  }
  if (f === 'strain') {
    ctx.fillStyle = '#9fd8ff';
    ell(ctx, x + u * 0.95, y - u * 0.25 + Math.sin(t * 0.3) * u * 0.05, u * 0.09, u * 0.14);
    ctx.fill();
  }
}

/** 몸통 (가운데 원점, 머리가 위 -h/2) */
function bodyPath(ctx: C2, k: Kind, R: (r: number) => number) {
  const h = R(bodyH(k)), hh = h / 2;
  ctx.beginPath();
  if (k === 'carrot') {
    const hw = R(0.053);
    ctx.moveTo(-hw, -hh + R(0.014));
    ctx.bezierCurveTo(-hw, -hh - R(0.008), hw, -hh - R(0.008), hw, -hh + R(0.014));
    ctx.bezierCurveTo(hw * 1.04, -hh + h * 0.36, hw * 0.32, -hh + h * 0.82, 0, hh);
    ctx.bezierCurveTo(-hw * 0.32, -hh + h * 0.82, -hw * 1.04, -hh + h * 0.36, -hw, -hh + R(0.014));
  } else if (k === 'radish' || k === 'big') {
    const hw = R(k === 'big' ? 0.078 : 0.054);
    ctx.moveTo(-hw * 0.85, -hh + R(0.012));
    ctx.bezierCurveTo(-hw * 0.6, -hh - R(0.01), hw * 0.6, -hh - R(0.01), hw * 0.85, -hh + R(0.012));
    ctx.bezierCurveTo(hw * 1.18, -hh + h * 0.45, hw * 0.7, -hh + h * 0.86, 0, hh);
    ctx.bezierCurveTo(-hw * 0.7, -hh + h * 0.86, -hw * 1.18, -hh + h * 0.45, -hw * 0.85, -hh + R(0.012));
  } else if (k === 'sprout') {
    ctx.ellipse(0, R(0.008), R(0.028), R(0.033), 0, 0, TAU);
  } else {
    // 꽃: 가는 뿌리
    ctx.ellipse(0, -hh + R(0.02), R(0.012), R(0.02), 0, 0, TAU);
  }
}
function drawBody(ctx: C2, k: Kind, R: (r: number) => number, face: Face, t: number, wet: boolean) {
  const h = R(bodyH(k)), hh = h / 2;
  if (k === 'flower') {
    // 가는 뿌리와 잔뿌리
    ctx.strokeStyle = '#7a4a22';
    ctx.lineWidth = Math.max(2, R(0.01));
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -hh);
    ctx.bezierCurveTo(R(0.01), -hh + h * 0.4, -R(0.012), -hh + h * 0.7, 0, hh);
    ctx.stroke();
    ctx.strokeStyle = '#e8c48e';
    ctx.lineWidth = Math.max(1.2, R(0.005));
    ctx.stroke();
    for (let q = 0.3; q < 0.95; q += 0.22) {
      ctx.beginPath();
      ctx.moveTo(0, -hh + h * q);
      ctx.lineTo((q * 10) % 2 > 1 ? R(0.018) : -R(0.018), -hh + h * q + R(0.012));
      ctx.stroke();
    }
    ctx.fillStyle = '#c99a62';
    bodyPath(ctx, k, R);
    ctx.fill();
    return;
  }
  // 그림자 테
  ctx.save();
  bodyPath(ctx, k, R);
  if (k === 'carrot') ctx.fillStyle = lin(ctx, -R(0.045), 0, R(0.045), 0, [[0, '#ffb04a'], [0.45, '#ff8c1f'], [1, '#e2650e']]);
  else if (k === 'sprout') ctx.fillStyle = lin(ctx, -R(0.02), 0, R(0.02), 0, [[0, '#f6e6b8'], [1, '#d9b878']]);
  else ctx.fillStyle = lin(ctx, 0, -hh, 0, hh, [[0, '#bfe6a0'], [0.22, '#f4fbe8'], [0.5, '#ffffff'], [1, '#efe6e0']]);
  ctx.fill();
  ctx.clip();
  // 결: 당근 가로 주름 · 무 잔줄
  ctx.strokeStyle = k === 'carrot' ? 'rgba(170,70,10,.45)' : 'rgba(160,140,120,.35)';
  ctx.lineWidth = Math.max(1, R(0.004));
  for (let q = 0.2; q < 1; q += k === 'carrot' ? 0.13 : 0.18) {
    const y = -hh + h * q, wq = R(k === 'big' ? 0.05 : 0.03) * (1 - q * 0.6);
    ctx.beginPath();
    ctx.moveTo(-wq * (0.2 + (q * 7) % 0.5), y);
    ctx.quadraticCurveTo(0, y + R(0.004), wq * (0.3 + (q * 5) % 0.5), y - R(0.002));
    ctx.stroke();
  }
  // 빛
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  ell(ctx, -R(k === 'big' ? 0.03 : 0.018), -hh + h * 0.32, R(k === 'big' ? 0.012 : 0.008), h * 0.22);
  ctx.fill();
  if (wet) {
    ctx.fillStyle = 'rgba(120,190,255,.25)';
    ctx.fillRect(-R(0.08), -hh, R(0.16), h);
  }
  ctx.restore();
  ctx.strokeStyle = k === 'carrot' ? '#b4500c' : k === 'sprout' ? '#a88050' : '#b8a898';
  ctx.lineWidth = Math.max(1.4, R(0.005));
  bodyPath(ctx, k, R);
  ctx.stroke();
  // 꼬리 뿌리
  if (k !== 'sprout') {
    ctx.strokeStyle = k === 'carrot' ? '#d06a1a' : '#d8ccc0';
    ctx.lineWidth = Math.max(1, R(0.004));
    ctx.beginPath();
    ctx.moveTo(0, hh - R(0.004));
    ctx.quadraticCurveTo(R(0.006), hh + R(0.014), -R(0.002), hh + R(0.026));
    ctx.stroke();
  } else {
    ctx.strokeStyle = '#c8a068';
    ctx.lineWidth = Math.max(1, R(0.004));
    ctx.beginPath();
    ctx.moveTo(0, R(0.03));
    ctx.quadraticCurveTo(-R(0.008), R(0.045), R(0.004), R(0.058));
    ctx.stroke();
  }
  const fu = R(k === 'big' ? 0.038 : k === 'sprout' ? 0.02 : 0.03);
  drawFace(ctx, 0, k === 'sprout' ? R(0.004) : -hh + h * (k === 'carrot' ? 0.26 : 0.36), fu, face, t);
}

/** 잎: 머리(0, -h/2)에서 위로. 잎 수 = 뿌리를 따라 딸려 나오는 거리 */
function drawLeaves(ctx: C2, k: Kind, leaf: number, R: (r: number) => number, sway: number, glow: number, t: number, flowerCol: number) {
  const top = -R(bodyH(k)) / 2;
  ctx.save();
  ctx.translate(0, top + R(0.004));
  if (k === 'flower') {
    const [pc, cc] = FLOWER[flowerCol % FLOWER.length];
    ctx.rotate(sway * 0.6);
    ctx.strokeStyle = '#3f9a3a';
    ctx.lineWidth = Math.max(2, R(0.009));
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(R(0.012), -R(0.06), 0, -R(0.115));
    ctx.stroke();
    for (const sd of [-1, 1]) {
      ctx.fillStyle = '#5cc04e';
      ell(ctx, sd * R(0.022), -R(0.04) - (sd > 0 ? R(0.02) : 0), R(0.022), R(0.009), sd * 0.5);
      ctx.fill();
    }
    ctx.translate(0, -R(0.125));
    ctx.rotate(Math.sin(t * 0.05) * 0.08);
    for (let p = 0; p < 6; p++) {
      const a = (p / 6) * TAU;
      ctx.fillStyle = pc;
      ell(ctx, Math.cos(a) * R(0.026), Math.sin(a) * R(0.026), R(0.022), R(0.015), a);
      ctx.fill();
      ctx.strokeStyle = 'rgba(160,40,90,.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.fillStyle = cc;
    ell(ctx, 0, 0, R(0.021), R(0.021));
    ctx.fill();
    drawFace(ctx, 0, -R(0.004), R(0.011), glow > 0.5 ? 'giggle' : 'happy', t);
    ctx.restore();
    return;
  }
  if (k === 'sprout') {
    ctx.rotate(sway * 0.5);
    ctx.strokeStyle = '#4aa83e';
    ctx.lineWidth = Math.max(2, R(0.007));
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -R(0.035));
    ctx.stroke();
    for (const sd of [-1, 1]) {
      ctx.fillStyle = '#7ad65e';
      ell(ctx, sd * R(0.017), -R(0.04), R(0.018), R(0.011), sd * -0.4);
      ctx.fill();
      ctx.strokeStyle = '#3f8f36';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
    return;
  }
  const n = Math.max(1, leaf), fan = n === 1 ? [0] : n === 2 ? [-0.32, 0.32] : [-0.52, 0, 0.52];
  const len = R(k === 'big' ? 0.19 : k === 'radish' ? 0.15 : 0.17);
  if (glow > 0) {
    ctx.fillStyle = `rgba(255,250,170,${0.35 * glow})`;
    ell(ctx, 0, -len * 0.55, len * 0.75, len * 0.7);
    ctx.fill();
  }
  fan.forEach((a0, j) => {
    ctx.save();
    ctx.rotate(a0 + sway * (1 + j * 0.15));
    if (k === 'carrot') {
      // 깃털 같은 당근 잎: 줄기 + 작은 잎 쌍
      ctx.strokeStyle = '#2f8a36';
      ctx.lineWidth = Math.max(2, R(0.008));
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(R(0.006), -len * 0.5, 0, -len);
      ctx.stroke();
      for (let q = 0.3; q <= 1.001; q += 0.175) {
        const y = -len * q, sz = R(0.031) * (1.15 - q * 0.45);
        for (const sd of [-1, 1]) {
          ctx.fillStyle = j % 2 ? '#4cc055' : '#43b34c';
          ell(ctx, sd * sz * 0.85, y + sz * 0.25, sz, sz * 0.48, sd * -0.6);
          ctx.fill();
          ctx.strokeStyle = '#2a7a30';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
      ctx.fillStyle = '#5ad064';
      ell(ctx, 0, -len - R(0.008), R(0.014), R(0.02));
      ctx.fill();
      ctx.strokeStyle = '#2a7a30';
      ctx.stroke();
    } else {
      // 무 잎: 넓고 물결진 잎
      const wd = R(k === 'big' ? 0.042 : 0.033);
      ctx.fillStyle = lin(ctx, -wd, 0, wd, 0, [[0, '#3a9a3e'], [0.5, '#56bd4f'], [1, '#3a9a3e']]);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-wd * 1.4, -len * 0.3, -wd * 1.2, -len * 0.85, 0, -len);
      ctx.bezierCurveTo(wd * 1.2, -len * 0.85, wd * 1.4, -len * 0.3, 0, 0);
      ctx.fill();
      ctx.strokeStyle = '#2a7a30';
      ctx.lineWidth = Math.max(1, R(0.004));
      ctx.stroke();
      ctx.strokeStyle = 'rgba(220,255,200,.6)';
      ctx.lineWidth = Math.max(1, R(0.003));
      ctx.beginPath();
      ctx.moveTo(0, -R(0.005));
      ctx.lineTo(0, -len * 0.92);
      for (let q = 0.3; q < 0.9; q += 0.2) (ctx.moveTo(0, -len * q), ctx.lineTo(-wd * 0.6, -len * (q + 0.1)), ctx.moveTo(0, -len * q), ctx.lineTo(wd * 0.6, -len * (q + 0.1)));
      ctx.stroke();
    }
    ctx.restore();
  });
  ctx.restore();
}

/** 채소 하나 통째로: 가운데(x,y)·기울기·늘어남 */
function drawPlant(ctx: C2, R: (r: number) => number, x: number, y: number, k: Kind, leaf: number, a: number, sq: number, face: Face, t: number, o: { sway?: number; glow?: number; wet?: boolean; col?: number; leaves?: boolean; body?: boolean; scale?: number }) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  const sc = o.scale ?? 1;
  ctx.scale(sc / (1 + sq * 0.4), sc * (1 + sq));
  if (o.leaves !== false) drawLeaves(ctx, k, leaf, R, o.sway ?? 0, o.glow ?? 0, t, o.col ?? 0);
  if (o.body !== false) drawBody(ctx, k, R, face, t, !!o.wet);
  ctx.restore();
}

function drawCloud(ctx: C2, x: number, y: number, r: number) {
  ctx.fillStyle = 'rgba(150,190,225,.35)';
  ell(ctx, x + r * 0.1, y + r * 0.42, r * 1.55, r * 0.32);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  for (const [dx, dy, q] of [[-0.85, 0.12, 0.5], [-0.3, -0.22, 0.72], [0.42, -0.1, 0.62], [0.98, 0.16, 0.42], [0.05, 0.22, 0.6]]) (ell(ctx, x + dx * r, y + dy * r, q * r, q * r * 0.88), ctx.fill());
}
function drawBunny(ctx: C2, x: number, y: number, u: number, mood: string, t: number, mt: number) {
  // u = 키(px). 발이 (x,y)
  const age = t - mt;
  let hop = 0, tilt = 0;
  if (mood === 'wow' || mood === 'cheer') hop = Math.abs(Math.sin(age * 0.18)) * u * (mood === 'cheer' ? 0.22 : 0.16) * (mood === 'wow' ? Math.max(0, 1 - age / 70) : 1);
  if (mood === 'huh') tilt = 0.18;
  if (mood === 'dizzy') tilt = Math.sin(t * 0.12) * 0.15;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(40,70,20,.25)';
  ell(ctx, 0, 0, u * 0.32 * (1 - hop / u), u * 0.07);
  ctx.fill();
  ctx.translate(0, -hop);
  ctx.rotate(tilt);
  const W = '#fffaf2', OL = '#b8957a', PINK = '#ffb6c6';
  ctx.lineWidth = Math.max(1.5, u * 0.022);
  ctx.strokeStyle = OL;
  // 꼬리
  ctx.fillStyle = W;
  ell(ctx, -u * 0.25, -u * 0.18, u * 0.09, u * 0.08);
  ctx.fill();
  ctx.stroke();
  // 몸
  ctx.fillStyle = lin(ctx, 0, -u * 0.5, 0, 0, [[0, '#ffffff'], [1, '#f3e6da']]);
  ell(ctx, 0, -u * 0.22, u * 0.25, u * 0.22);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff3ea';
  ell(ctx, u * 0.03, -u * 0.17, u * 0.14, u * 0.13);
  ctx.fill();
  // 발
  for (const sd of [-1, 1]) {
    ctx.fillStyle = W;
    ell(ctx, sd * u * 0.13, -u * 0.03, u * 0.1, u * 0.05);
    ctx.fill();
    ctx.stroke();
  }
  // 귀
  const earSw = Math.sin(t * 0.05) * 0.06 + (mood === 'wow' || mood === 'cheer' ? -0.15 : mood === 'gasp' ? 0.2 : 0);
  for (const sd of [-1, 1]) {
    ctx.save();
    ctx.translate(sd * u * 0.08, -u * 0.62);
    ctx.rotate(sd * (0.16 + earSw) + (sd > 0 && mood === 'idle' ? Math.sin(t * 0.21) * 0.06 : 0));
    ctx.fillStyle = W;
    ell(ctx, 0, -u * 0.2, u * 0.065, u * 0.21);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = PINK;
    ell(ctx, 0, -u * 0.19, u * 0.032, u * 0.15);
    ctx.fill();
    ctx.restore();
  }
  // 머리
  ctx.fillStyle = lin(ctx, 0, -u * 0.75, 0, -u * 0.35, [[0, '#ffffff'], [1, '#f5ebe0']]);
  ell(ctx, 0, -u * 0.53, u * 0.2, u * 0.18);
  ctx.fill();
  ctx.stroke();
  // 눈
  const ey = -u * 0.56;
  if (mood === 'cheer' || mood === 'laugh' || mood === 'happy') {
    ctx.strokeStyle = '#3a2418';
    ctx.lineWidth = Math.max(1.5, u * 0.022);
    for (const sd of [-1, 1]) (ctx.beginPath(), ctx.arc(sd * u * 0.08, ey + u * 0.01, u * 0.035, 1.1 * Math.PI, 1.9 * Math.PI), ctx.stroke());
  } else if (mood === 'dizzy') {
    ctx.strokeStyle = '#3a2418';
    ctx.lineWidth = Math.max(1.2, u * 0.016);
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      for (let k = 0; k < 12; k++) {
        const a = k * 0.7 + t * 0.25, r = (k / 12) * u * 0.04;
        ctx.lineTo(sd * u * 0.08 + Math.cos(a) * r, ey + Math.sin(a) * r);
      }
      ctx.stroke();
    }
  } else {
    const big = mood === 'wow' || mood === 'gasp' ? 1.35 : 1;
    const blink = mood === 'idle' && t % 190 < 7;
    for (const sd of [-1, 1]) {
      ctx.fillStyle = '#2a1810';
      if (blink) ctx.fillRect(sd * u * 0.08 - u * 0.03, ey, u * 0.06, u * 0.01);
      else {
        ell(ctx, sd * u * 0.08, ey, u * 0.03 * big, u * 0.04 * big);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ell(ctx, sd * u * 0.08 - u * 0.01, ey - u * 0.015, u * 0.012 * big, u * 0.012 * big);
        ctx.fill();
      }
    }
  }
  ctx.fillStyle = 'rgba(255,130,150,.45)';
  for (const sd of [-1, 1]) (ell(ctx, sd * u * 0.13, -u * 0.48, u * 0.04, u * 0.025), ctx.fill());
  // 코·입
  ctx.fillStyle = '#ff8aa0';
  ell(ctx, 0, -u * 0.5, u * 0.022, u * 0.016);
  ctx.fill();
  ctx.strokeStyle = '#7a4a3a';
  ctx.lineWidth = Math.max(1, u * 0.014);
  if (mood === 'gasp' || mood === 'wow') {
    ctx.fillStyle = '#a03a3a';
    ell(ctx, 0, -u * 0.44, u * 0.025, u * 0.03);
    ctx.fill();
  } else {
    const chew = mood === 'idle' ? Math.sin(t * 0.35) * u * 0.006 : 0;
    ctx.beginPath();
    ctx.moveTo(-u * 0.03, -u * 0.46 + chew);
    ctx.quadraticCurveTo(0, -u * 0.43, 0, -u * 0.48);
    ctx.quadraticCurveTo(0, -u * 0.43, u * 0.03, -u * 0.46 + chew);
    ctx.stroke();
  }
  // 앞발 (놀라면 볼에, 기쁘면 위로, 평소엔 당근)
  for (const sd of [-1, 1]) {
    ctx.fillStyle = W;
    ctx.strokeStyle = OL;
    ctx.lineWidth = Math.max(1.5, u * 0.02);
    let px = sd * u * 0.13, py = -u * 0.3;
    if (mood === 'gasp') (px = sd * u * 0.17), (py = -u * 0.47);
    else if (mood === 'wow' || mood === 'cheer') (px = sd * u * (0.25 + 0.03 * Math.sin(age * 0.4))), (py = -u * 0.55);
    else if (mood === 'idle') (px = sd * u * 0.06), (py = -u * 0.36);
    ell(ctx, px, py, u * 0.05, u * 0.045);
    ctx.fill();
    ctx.stroke();
  }
  if (mood === 'idle' || mood === 'happy') {
    // 오물오물 먹는 작은 당근
    ctx.save();
    ctx.translate(0, -u * 0.38);
    ctx.rotate(0.7);
    ctx.fillStyle = '#ff8c1f';
    ctx.beginPath();
    ctx.moveTo(-u * 0.025, -u * 0.04);
    ctx.lineTo(u * 0.025, -u * 0.04);
    ctx.lineTo(0, u * 0.08);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#4cb050';
    ell(ctx, 0, -u * 0.06, u * 0.02, u * 0.03);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  if (mood === 'dizzy') {
    for (let k = 0; k < 3; k++) {
      const a = t * 0.08 + (k * TAU) / 3;
      ctx.fillStyle = '#ffd23a';
      starPath(ctx, x + Math.cos(a) * u * 0.25, y - u * 0.82 + Math.sin(a) * u * 0.06, u * 0.05);
      ctx.fill();
    }
  }
  if (mood === 'huh') {
    ctx.font = `900 ${Math.max(14, u * 0.22)}px system-ui, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#5a3a1a';
    ctx.lineWidth = 3;
    ctx.textAlign = 'center';
    ctx.strokeText('?', x + u * 0.28, y - u * 0.8);
    ctx.fillText('?', x + u * 0.28, y - u * 0.8);
  }
}
function starPath(ctx: C2, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5, q = k % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
  }
  ctx.closePath();
}
function drawHeart(ctx: C2, x: number, y: number, r: number, on: boolean) {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.9);
  ctx.bezierCurveTo(x - r * 1.4, y - r * 0.1, x - r * 0.7, y - r * 1.1, x, y - r * 0.35);
  ctx.bezierCurveTo(x + r * 0.7, y - r * 1.1, x + r * 1.4, y - r * 0.1, x, y + r * 0.9);
  ctx.fillStyle = on ? '#ff4d6a' : 'rgba(120,80,60,.25)';
  ctx.fill();
  ctx.strokeStyle = on ? '#a8203a' : 'rgba(120,80,60,.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  if (on) {
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ell(ctx, x - r * 0.4, y - r * 0.3, r * 0.22, r * 0.15, -0.6);
    ctx.fill();
  }
}
function drawMole(ctx: C2, x: number, y: number, u: number, t: number, chew: boolean) {
  ctx.save();
  ctx.translate(x, y);
  const bob = Math.sin(t * 0.12) * u * 0.03;
  ctx.translate(0, bob);
  ctx.lineWidth = Math.max(1.5, u * 0.04);
  ctx.strokeStyle = '#3a2c2a';
  ctx.fillStyle = lin(ctx, 0, -u * 0.5, 0, u * 0.5, [[0, '#7a6660'], [1, '#544440']]);
  ell(ctx, 0, 0, u * 0.6, u * 0.45);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#9a847c';
  ell(ctx, 0, u * 0.12, u * 0.36, u * 0.26);
  ctx.fill();
  // 손 (분홍 삽 손)
  for (const sd of [-1, 1]) {
    ctx.save();
    ctx.translate(sd * u * 0.5, u * 0.15);
    ctx.rotate(sd * (0.5 + (chew ? Math.sin(t * 0.6) * 0.4 : 0)));
    ctx.fillStyle = '#ffb2a6';
    ell(ctx, 0, 0, u * 0.2, u * 0.13);
    ctx.fill();
    ctx.strokeStyle = '#c0706a';
    ctx.lineWidth = Math.max(1, u * 0.03);
    ctx.stroke();
    for (let k = -1; k <= 1; k++) (ctx.beginPath(), ctx.moveTo(u * 0.12 * sd, k * u * 0.06), ctx.lineTo(u * 0.22 * sd, k * u * 0.08), ctx.stroke());
    ctx.restore();
  }
  // 눈 (실눈) · 코
  ctx.strokeStyle = '#1a1010';
  ctx.lineWidth = Math.max(1.4, u * 0.05);
  for (const sd of [-1, 1]) (ctx.beginPath(), ctx.moveTo(sd * u * 0.2 - u * 0.07, -u * 0.12), ctx.lineTo(sd * u * 0.2 + u * 0.07, -u * 0.1), ctx.stroke());
  ctx.fillStyle = '#ff7aa0';
  ell(ctx, 0, -u * 0.02, u * 0.12, u * 0.09);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.6)';
  ell(ctx, -u * 0.04, -u * 0.05, u * 0.04, u * 0.025);
  ctx.fill();
  if (chew) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-u * 0.06, u * 0.07, u * 0.05, u * 0.07);
    ctx.fillRect(u * 0.01, u * 0.07, u * 0.05, u * 0.07);
  }
  // 광부 모자
  ctx.fillStyle = '#ffcf3a';
  ctx.beginPath();
  ctx.ellipse(0, -u * 0.32, u * 0.34, u * 0.2, 0, Math.PI, TAU);
  ctx.fill();
  ctx.strokeStyle = '#b8860b';
  ctx.lineWidth = Math.max(1, u * 0.03);
  ctx.stroke();
  ctx.fillRect(-u * 0.4, -u * 0.34, u * 0.8, u * 0.06);
  ctx.fillStyle = '#fff6c0';
  ell(ctx, 0, -u * 0.43, u * 0.07, u * 0.07);
  ctx.fill();
  ctx.restore();
}
/** 물뿌리개 (물 준 판의 장식) */
function drawCan(ctx: C2, x: number, y: number, u: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(40,70,20,.25)';
  ell(ctx, 0, 0, u * 0.7, u * 0.12);
  ctx.fill();
  ctx.strokeStyle = '#2a6aa8';
  ctx.lineWidth = Math.max(1.5, u * 0.05);
  ctx.fillStyle = lin(ctx, -u * 0.5, 0, u * 0.5, 0, [[0, '#6ab8ff'], [1, '#3a8ae0']]);
  rr(ctx, -u * 0.4, -u * 0.62, u * 0.8, u * 0.62, u * 0.12);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(u * 0.35, -u * 0.25);
  ctx.lineTo(u * 0.85, -u * 0.72);
  ctx.lineWidth = Math.max(3, u * 0.12);
  ctx.strokeStyle = '#3a8ae0';
  ctx.stroke();
  ctx.fillStyle = '#2a6aa8';
  ell(ctx, u * 0.88, -u * 0.75, u * 0.1, u * 0.07, -0.8);
  ctx.fill();
  ctx.strokeStyle = '#2a6aa8';
  ctx.lineWidth = Math.max(2, u * 0.07);
  ctx.beginPath();
  ctx.arc(-u * 0.05, -u * 0.62, u * 0.25, Math.PI, TAU);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.45)';
  rr(ctx, -u * 0.3, -u * 0.55, u * 0.1, u * 0.45, u * 0.05);
  ctx.fill();
  ctx.fillStyle = '#9fd8ff';
  for (let k = 0; k < 3; k++) {
    const q = (t * 0.02 + k / 3) % 1;
    ell(ctx, u * (0.95 + q * 0.2), -u * (0.7 - q * 0.6), u * 0.035, u * 0.05);
    ctx.fill();
  }
  ctx.restore();
}
function drawStone(ctx: C2, x: number, y: number, r: number, wob: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(wob);
  ctx.fillStyle = 'rgba(30,15,5,.3)';
  ell(ctx, r * 0.1, r * 0.55, r * 1.1, r * 0.35);
  ctx.fill();
  ctx.fillStyle = lin(ctx, 0, -r, 0, r, [[0, '#c8c4bc'], [1, '#8a847c']]);
  ctx.beginPath();
  ctx.moveTo(-r * 1.1, r * 0.2);
  ctx.bezierCurveTo(-r * 1.2, -r * 0.6, -r * 0.3, -r * 0.95, r * 0.3, -r * 0.8);
  ctx.bezierCurveTo(r * 1.1, -r * 0.6, r * 1.25, r * 0.1, r * 0.9, r * 0.5);
  ctx.bezierCurveTo(r * 0.4, r * 0.75, -r * 0.8, r * 0.7, -r * 1.1, r * 0.2);
  ctx.fill();
  ctx.strokeStyle = '#5e5850';
  ctx.lineWidth = Math.max(1.2, r * 0.12);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  ell(ctx, -r * 0.35, -r * 0.4, r * 0.3, r * 0.14, -0.3);
  ctx.fill();
  ctx.restore();
}

/** 뿌리 한 가닥 (점 목록) — 굵은 갈색 테 + 밝은 속 + 잔뿌리 */
function strokeRoot(ctx: C2, pts: [number, number][], wd: number, hot = 0) {
  if (pts.length < 2) return;
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let k = 1; k < pts.length - 1; k++) ctx.quadraticCurveTo(pts[k][0], pts[k][1], (pts[k][0] + pts[k + 1][0]) / 2, (pts[k][1] + pts[k + 1][1]) / 2);
    ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
  };
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  path();
  ctx.strokeStyle = '#6a3e1c';
  ctx.lineWidth = wd + 3;
  ctx.stroke();
  path();
  ctx.strokeStyle = hot > 0 ? `rgb(255,${Math.round(214 - 60 * hot)},${Math.round(150 - 80 * hot)})` : '#efcd96';
  ctx.lineWidth = wd;
  ctx.stroke();
  path();
  ctx.strokeStyle = 'rgba(255,248,225,.7)';
  ctx.lineWidth = Math.max(1, wd * 0.3);
  ctx.stroke();
  // 잔뿌리
  ctx.strokeStyle = '#c89a62';
  ctx.lineWidth = 1;
  for (let k = 1; k < pts.length - 1; k += 2) {
    const dx = pts[k + 1][0] - pts[k - 1][0], dy = pts[k + 1][1] - pts[k - 1][1], d = Math.hypot(dx, dy) || 1;
    const nx = -dy / d, ny = dx / d, sd = k % 4 === 1 ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(pts[k][0], pts[k][1]);
    ctx.lineTo(pts[k][0] + nx * sd * wd * 1.4 + dx * 0.1, pts[k][1] + ny * sd * wd * 1.4 + dy * 0.1);
    ctx.stroke();
  }
}

function drawAll(ctx: C2, s: FarmState, w: number, h: number, _th: Theme) {
  const fx = juice(s), t = s.t, L = s.L, S = s.S, d = STAGES[s.stage];
  const X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w;
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  ctx.save();
  fx.begin(ctx);
  // ═════════ 하늘 · 해 · 구름 ═════════
  ctx.fillStyle = lin(ctx, 0, 0, 0, Y(0.56), [[0, '#6cc0f5'], [0.5, '#b8e4ff'], [1, '#fff0cc']]);
  ctx.fillRect(-12, -12, w + 24, Y(0.58) + 12);
  {
    const sx = X(0.18), sy = Y(0.2);
    const sg = ctx.createRadialGradient(sx, sy, R(0.02), sx, sy, R(0.32));
    sg.addColorStop(0, 'rgba(255,248,205,.95)');
    sg.addColorStop(0.25, 'rgba(255,238,170,.5)');
    sg.addColorStop(1, 'rgba(255,238,170,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, w, Y(0.56));
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(t * 0.002);
    ctx.fillStyle = 'rgba(255,240,170,.28)';
    for (let k = 0; k < 10; k++) {
      ctx.rotate(TAU / 10);
      ctx.beginPath();
      ctx.moveTo(R(0.055), -R(0.012));
      ctx.lineTo(R(0.13), 0);
      ctx.lineTo(R(0.055), R(0.012));
      ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = '#fff4b8';
    ell(ctx, sx, sy, R(0.048), R(0.048));
    ctx.fill();
  }
  for (let k = 0; k < 4; k++) {
    const cx = ((hsh(k + 1) * 1.3 + t * 0.00011 * (1 + k * 0.35)) % 1.4) - 0.2, cy = 0.15 + 0.06 * hsh(k + 9) + (k % 2) * 0.05;
    drawCloud(ctx, X(cx), Y(cy), R(0.05 + 0.03 * hsh(k + 3)));
  }
  // ═════════ 먼 언덕 ═════════
  ctx.fillStyle = lin(ctx, 0, Y(0.3), 0, Y(0.5), [[0, '#b6e38c'], [1, '#93cf6c']]);
  ctx.beginPath();
  ctx.moveTo(-5, Y(0.44));
  ctx.quadraticCurveTo(X(0.14), Y(0.31), X(0.36), Y(0.39));
  ctx.quadraticCurveTo(X(0.56), Y(0.29), X(0.78), Y(0.37));
  ctx.quadraticCurveTo(X(0.92), Y(0.32), w + 5, Y(0.36));
  ctx.lineTo(w + 5, Y(0.52));
  ctx.lineTo(-5, Y(0.52));
  ctx.fill();
  for (let k = 0; k < 6; k++) {
    const tx = 0.08 + k * 0.17 + 0.04 * hsh(k + 20), ty = 0.37 + 0.03 * hsh(k + 30) - (k === 3 ? 0.04 : 0);
    ctx.fillStyle = '#7a5a3a';
    ctx.fillRect(X(tx) - R(0.004), Y(ty), R(0.008), R(0.025));
    ctx.fillStyle = k % 2 ? '#6bbf55' : '#5cb04c';
    ell(ctx, X(tx), Y(ty), R(0.022), R(0.026));
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.25)';
    ell(ctx, X(tx) - R(0.007), Y(ty) - R(0.01), R(0.008), R(0.008));
    ctx.fill();
  }
  ctx.fillStyle = '#83c75c';
  ctx.beginPath();
  ctx.moveTo(-5, Y(0.45));
  ctx.quadraticCurveTo(X(0.3), Y(0.4), X(0.6), Y(0.445));
  ctx.quadraticCurveTo(X(0.85), Y(0.475), w + 5, Y(0.425));
  ctx.lineTo(w + 5, Y(0.56));
  ctx.lineTo(-5, Y(0.56));
  ctx.fill();
  // ═════════ 울타리 ═════════
  {
    const top = 0.39, bot = 0.485;
    for (const ry of [0.415, 0.455]) {
      ctx.fillStyle = '#c98f55';
      rr(ctx, -2, Y(ry) - R(0.009), w + 4, R(0.018), R(0.004));
      ctx.fill();
      ctx.fillStyle = 'rgba(90,50,20,.18)';
      ctx.fillRect(-2, Y(ry) + R(0.005), w + 4, R(0.004));
    }
    for (let x = 0.02; x < 1.02; x += 0.072) {
      const px = X(x), pw = R(0.034), ty = Y(top + 0.008 * hsh(x * 50));
      ctx.fillStyle = 'rgba(60,40,20,.15)';
      ctx.fillRect(px - pw / 2 + R(0.008), ty + R(0.02), pw, Y(bot) - ty - R(0.02));
      ctx.fillStyle = lin(ctx, px - pw / 2, 0, px + pw / 2, 0, [[0, '#ecbc80'], [1, '#c98f55']]);
      ctx.beginPath();
      ctx.moveTo(px - pw / 2, Y(bot));
      ctx.lineTo(px - pw / 2, ty + R(0.013));
      ctx.lineTo(px, ty - R(0.004));
      ctx.lineTo(px + pw / 2, ty + R(0.013));
      ctx.lineTo(px + pw / 2, Y(bot));
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#9a6434';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(150,90,40,.35)';
      ctx.beginPath();
      ctx.moveTo(px - pw * 0.15, ty + R(0.03));
      ctx.lineTo(px - pw * 0.1, Y(bot) - R(0.01));
      ctx.stroke();
    }
  }
  if (L.p.some((q) => q?.wet)) drawCan(ctx, X(0.36), Y(0.4), R(0.065), t);
  // ═════════ 풀밭 (채소가 굴러가는 길) ═════════
  ctx.fillStyle = lin(ctx, 0, Y(0.47), 0, Y(0.56), [[0, '#a4dd64'], [1, '#86c84e']]);
  ctx.beginPath();
  ctx.moveTo(-5, Y(0.478));
  ctx.quadraticCurveTo(X(0.5), Y(0.468), w + 5, Y(0.478));
  ctx.lineTo(w + 5, Y(0.56));
  ctx.lineTo(-5, Y(0.56));
  ctx.fill();
  ctx.strokeStyle = '#6aae3e';
  ctx.lineWidth = 1.3;
  for (let k = 0; k < 26; k++) {
    const gx = X(hsh(k + 40)), gy = Y(0.49 + 0.035 * hsh(k + 41));
    ctx.beginPath();
    ctx.moveTo(gx - R(0.006), gy);
    ctx.lineTo(gx - R(0.009), gy - R(0.012));
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx + R(0.002), gy - R(0.016));
    ctx.moveTo(gx + R(0.006), gy);
    ctx.lineTo(gx + R(0.01), gy - R(0.011));
    ctx.stroke();
  }
  for (let k = 0; k < 7; k++) {
    ctx.fillStyle = k % 2 ? '#ffffff' : '#ffe066';
    ell(ctx, X(0.05 + hsh(k + 60) * 0.9), Y(0.495 + 0.03 * hsh(k + 61)), R(0.006), R(0.006));
    ctx.fill();
  }
  // ═════════ 토끼 (구경꾼) ═════════
  drawBunny(ctx, X(0.105), Y(0.512), R(0.19), s.mood, t, s.moodT);
  // 풀밭에 누운 꽃·새싹, 구르는 채소
  // 내려오는 채소는 밭 뒤 풀밭으로 (밭 윗면·잎이 앞을 가린다)
  for (const b of s.bodies) {
    if (!backLayer(b)) continue;
    drawPlant(ctx, R, X(b.x), Y(b.y), b.k, b.leaf, b.a, b.sq, b.mode === 'lie' ? 'cry' : b.mode === 'roll' ? 'dizzy' : b.bad ? 'cry' : 'wow', t, { col: b.i, sway: b.mode === 'air' ? Math.sin(t * 0.3 + b.i) * 0.15 : 0, wet: b.wet });
  }
  // ═════════ 바구니 ═════════
  drawBasket(ctx, s, X, Y, R, font, t);
  // ═════════ 밭 윗면 (3/4 시점) ═════════
  {
    ctx.fillStyle = '#7a4a28';
    rr(ctx, X(BX0) - R(0.01), Y(0.526), X(BX1 - BX0) + R(0.02), R(0.022), R(0.006));
    ctx.fill();
    ctx.fillStyle = lin(ctx, 0, Y(0.53), 0, Y(SURF), [[0, '#8f5c34'], [0.6, '#a5703f'], [1, '#b98250']]);
    ctx.beginPath();
    ctx.moveTo(X(BX0), Y(0.54));
    ctx.lineTo(X(BX1), Y(0.54));
    ctx.lineTo(X(BX1) + R(0.012), Y(SURF));
    ctx.lineTo(X(BX0) - R(0.012), Y(SURF));
    ctx.closePath();
    ctx.fill();
    // 이랑 줄무늬
    ctx.strokeStyle = 'rgba(90,50,20,.28)';
    ctx.lineWidth = 1.5;
    for (const yy of [0.552, 0.566, 0.58]) {
      ctx.beginPath();
      for (let x = BX0; x <= BX1 + 0.001; x += 0.04) ctx.lineTo(X(x), Y(yy + 0.003 * Math.sin(x * 23 + yy * 90)));
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(60,30,10,.35)';
    for (let k = 0; k < 34; k++) (ell(ctx, X(BX0 + hsh(k + 80) * (BX1 - BX0)), Y(0.545 + hsh(k + 81) * 0.05), R(0.004), R(0.0025)), ctx.fill());
  }
  // 물 준 칸: 젖은 흙 웅덩이
  for (let i = 0; i < L.n; i++) {
    if (!L.p[i]?.wet) continue;
    const x = X(slotX(L.n, i)), ww = R(slotW(L.n) * 0.52);
    ctx.fillStyle = 'rgba(70,50,60,.45)';
    ell(ctx, x, Y(SURF - 0.022), ww, R(0.02));
    ctx.fill();
    ctx.fillStyle = 'rgba(140,200,255,.55)';
    ell(ctx, x + R(0.01), Y(SURF - 0.024), ww * 0.62, R(0.011));
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ell(ctx, x - ww * 0.2, Y(SURF - 0.027), ww * 0.18, R(0.004));
    ctx.fill();
  }
  // ═════════ 땅속 단면 ═════════
  drawSection(ctx, s, X, Y, R, font, t);
  // ═════════ 뿌리 이음 ═════════
  drawLinks(ctx, s, X, Y, R, t);
  // ═════════ 땅속 채소와 잎 ═════════
  const tip = firstTip(s);
  for (let i = 0; i < L.n; i++) {
    const p = L.p[i];
    if (!p) continue;
    const b = bodyOf(s, i);
    if (b && b.mode !== 'wait') continue;
    const k = b ? b.k : visKind(s, i);
    const poked = s.poke && s.poke.i === i && t - s.poke.t < 40 ? 1 - (t - s.poke.t) / 40 : 0;
    const sway = Math.sin(t * 0.045 + i * 1.7) * 0.07 + Math.sin(t * 0.017 + i * 0.6) * 0.04 + (poked ? Math.sin(t * 0.9) * 0.25 * poked : 0);
    const grew = s.grownT[i] > 0 && t >= s.grownT[i] && t - s.grownT[i] < 24 ? 1 + 0.3 * Math.sin(((t - s.grownT[i]) / 24) * Math.PI) : 1;
    let face: Face = 'sleep';
    if (b) face = 'wow';
    else if (poked) face = k === 'big' ? 'strain' : k === 'flower' ? 'giggle' : 'wow';
    else if (s.bodies.some((q) => q.mode === 'wait')) face = 'peek';
    const x = b ? b.x : slotX(L.n, i) + (poked && k === 'big' ? Math.sin(t * 1.1) * R(0.004) / w : 0), y = b ? b.y : SURF + bodyH(k) / 2;
    const leaf = k === 'carrot' && p.k === 'sprout' ? p.leaf : p.leaf;
    const glow = tip === i ? 0.6 + 0.4 * Math.sin(t * 0.15) : poked && k === 'flower' ? 1 : 0;
    drawPlant(ctx, R, X(x), Y(y), k, leaf, b ? b.a : 0, b ? b.sq : 0, face, t, { sway, glow, wet: p.wet, col: i, scale: grew });
    // 큰 무: 무게 표시 · 새싹: 자랄 때까지 남은 톡
    if (k === 'big' && !b && !p.wet) {
      font(0.032, 900);
      const tx = X(x), ty = Y(SURF + 0.2), lab = '무게 2', tw = ctx.measureText(lab).width + R(0.024);
      ctx.fillStyle = 'rgba(90,50,20,.85)';
      rr(ctx, tx - tw / 2, ty - R(0.019), tw, R(0.038), R(0.019));
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(lab, tx, ty + 1);
    }
    if (k === 'sprout' && !b && p.grow > S.taps) {
      // 자랄 때까지 남은 톡: 동그란 시계 배지
      const left = p.grow - S.taps, tx = X(x), ty = Y(SURF - 0.09) + Math.sin(t * 0.08 + i) * 1.5, rr0 = R(0.03);
      ctx.fillStyle = 'rgba(40,90,20,.3)';
      ell(ctx, tx + 1.5, ty + 2, rr0, rr0);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ell(ctx, tx, ty, rr0, rr0);
      ctx.fill();
      ctx.strokeStyle = '#5aa83e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(tx, ty, rr0 - 2, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - left / Math.max(1, p.grow)) + 0.001);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(90,168,62,.3)';
      ctx.beginPath();
      ctx.arc(tx, ty, rr0 - 2, 0, TAU);
      ctx.stroke();
      font(0.036, 900);
      ctx.fillStyle = '#2f6a1e';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${left}`, tx, ty + 1);
      font(0.03, 900);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = 'rgba(30,70,10,.8)';
      ctx.lineWidth = 3;
      ctx.strokeText('톡 뒤', tx, ty + rr0 + R(0.016));
      ctx.fillText('톡 뒤', tx, ty + rr0 + R(0.016));
    }
  }
  // 날아가며 늘어나는 뿌리 (몸보다 뒤)
  drawRopes(ctx, s, X, Y, R);
  // ═════════ 테두리 (유리 단면 틀) ═════════
  {
    ctx.fillStyle = 'rgba(255,255,255,.07)';
    ctx.beginPath();
    ctx.moveTo(X(0.12), Y(SURF));
    ctx.lineTo(X(0.22), Y(SURF));
    ctx.lineTo(X(0.06), Y(SEC_BOT));
    ctx.lineTo(X(-0.04), Y(SEC_BOT));
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(X(0.27), Y(SURF));
    ctx.lineTo(X(0.3), Y(SURF));
    ctx.lineTo(X(0.14), Y(SEC_BOT));
    ctx.lineTo(X(0.11), Y(SEC_BOT));
    ctx.fill();
    for (const [x0, x1] of [[-0.01, BX0 + 0.004], [BX1 - 0.004, 1.01]]) {
      ctx.fillStyle = lin(ctx, X(x0), 0, X(x1), 0, [[0, '#a8743e'], [0.5, '#c8925a'], [1, '#94602e']]);
      ctx.fillRect(X(x0), Y(0.52), X(x1 - x0), Y(SEC_BOT + 0.012 - 0.52));
      ctx.strokeStyle = 'rgba(80,40,10,.45)';
      ctx.lineWidth = 1;
      ctx.strokeRect(X(x0), Y(0.52), X(x1 - x0), Y(SEC_BOT + 0.012 - 0.52));
    }
    ctx.fillStyle = '#94602e';
    ctx.fillRect(0, Y(SEC_BOT), w, R(0.014));
  }
  // ═════════ 날아오르는 채소 ═════════
  for (const b of s.bodies) {
    if (b.mode !== 'air' || backLayer(b)) continue;
    // 쑥! 솟구치는 줄 (막 뽑힌 순간)
    const age = t - b.t;
    if (b.mode === 'air' && age < 16 && b.vy < 0) {
      ctx.strokeStyle = `rgba(255,255,255,${0.8 * (1 - age / 16)})`;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      for (let k = -1; k <= 1; k++) {
        const sx = X(b.x) + k * R(0.03), sy = Y(b.y) + R(0.1) + Math.abs(k) * R(0.02);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - X(b.vx) * 3, sy + R(0.07 + 0.03 * (1 - Math.abs(k))));
        ctx.stroke();
      }
    }
    drawPlant(ctx, R, X(b.x), Y(b.y), b.k, b.leaf, b.a, b.sq, b.bad ? 'cry' : 'wow', t, { col: b.i, sway: Math.sin(t * 0.3 + b.i) * 0.15, wet: b.wet });
  }
  // 흙 파편
  const CH = ['#6a4022', '#8a5630', '#a8703e'];
  for (const c of s.chunks) {
    ctx.globalAlpha = Math.min(1, c.life / 18);
    ctx.fillStyle = CH[c.c];
    ell(ctx, X(c.x), Y(c.y), R(c.r), R(c.r * 0.8), c.x * 40);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // ═════════ 새것 스포트라이트 ═════════
  if (s.spot && t - s.spot.t < 220) {
    const sp = s.spot, a = Math.min(1, (220 - (t - sp.t)) / 30), pul = 1 + 0.05 * Math.sin(t * 0.2), prx = R(sp.rx) * pul, pry = R(sp.ry) * pul;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = '#ffe14a';
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 7]);
    ctx.lineDashOffset = -t * 0.8;
    ell(ctx, X(sp.x), Y(sp.y), prx, pry);
    ctx.stroke();
    ctx.setLineDash([]);
    font(0.036, 900);
    const lab = `NEW  ${sp.label}`, tw = ctx.measureText(lab).width + R(0.04);
    const lx = Math.max(tw / 2 + 4, Math.min(w - tw / 2 - 4, X(sp.x))), ly = Y(sp.y) + pry + R(0.03);
    ctx.fillStyle = '#ff5a3a';
    rr(ctx, lx - tw / 2, ly - R(0.023), tw, R(0.046), R(0.023));
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
  // ═════════ 첫 손길 안내: 손가락이 큰 당근 잎을 톡 ═════════
  if (tip >= 0) {
    const x = X(slotX(L.n, tip)), y = Y(SURF - 0.075), press = (t % 70) / 70, dip = press < 0.25 ? Math.sin((press / 0.25) * Math.PI) : 0;
    if (press < 0.25 && press > 0.08) (ctx.strokeStyle = `rgba(255,255,255,${0.8 - press * 3})`), (ctx.lineWidth = 3), ell(ctx, x, y, R(0.03 + press * 0.2), R(0.02 + press * 0.12)), ctx.stroke();
    drawHand(ctx, x + R(0.035), y + R(0.06) + dip * R(0.025), R(0.085), dip);
    font(0.046, 900);
    const msg = '👆 잎을 톡! 쑥 뽑아요', tw = ctx.measureText(msg).width + R(0.07), by = Y(0.31);
    ctx.fillStyle = 'rgba(80,40,10,.3)';
    rr(ctx, w / 2 - tw / 2 + 2, by - R(0.035) + 3, tw, R(0.07), R(0.035));
    ctx.fill();
    ctx.fillStyle = '#fffaf0';
    rr(ctx, w / 2 - tw / 2, by - R(0.035), tw, R(0.07), R(0.035));
    ctx.fill();
    ctx.strokeStyle = '#ff8a2a';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#5a2a08';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(msg, w / 2, by + 1);
  }
  // ═════════ 사건 → 연출 ═════════
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    if (e.t <= seenT || e.t > t) continue;
    const x = X(e.x), y = Y(e.y);
    if (e.kind === 'pop') {
      const big = e.v === 0;
      fx.burst(x, y, '#7a4a28', big ? 22 : 12, big ? 4.2 : 3, big ? 3 : 2.2);
      fx.burst(x, y, '#fff2c8', big ? 10 : 5, big ? 3.2 : 2.2, 1.6);
      fx.ring(x, y, 'rgba(255,240,200,.9)', R(big ? 0.14 : 0.08), big ? 5 : 3);
      fx.pop(x, y - R(0.03), e.text!, e.col!, big ? 34 : 20);
      fx.kick(big ? 7 : 3);
    }
    if (e.kind === 'wow') {
      const n = e.v ?? 3;
      fx.pop(Math.max(R(0.2), Math.min(w - R(0.2), x)), Y(0.24), e.text!, e.col!, n >= 5 ? 34 : 28);
      fx.ring(x, Y(SURF - 0.1), '#fff27a', R(0.3 + n * 0.03), 6);
      fx.burst(x, Y(SURF - 0.12), '#7ad65e', 18 + n * 3, 5, 2.6);
      fx.burst(x, Y(SURF - 0.12), '#ff9a2e', 12 + n * 2, 4.4, 2.4);
      fx.blink('#fff6c8', 0.16 + n * 0.02);
      fx.kick(4 + n);
    }
    if (e.kind === 'snap') (fx.pop(x, y - R(0.02), e.text!, e.col!, e.v ? 15 : 17), fx.burst(x, y, '#f0cf98', 8, 2.6, 1.6), fx.kick(1.6));
    if (e.kind === 'nom') (fx.pop(x, y - R(0.03), e.text!, e.col!, 18), fx.burst(x, y, '#c89a62', 10, 2.4, 1.8), fx.kick(1.5));
    if (e.kind === 'bad') (fx.pop(Math.max(R(0.2), Math.min(w - R(0.2), x)), y, e.text!, e.col!, 17), fx.kick(4));
    if (e.kind === 'land') fx.burst(x, y, e.col!, 8, 2, 1.8);
    if (e.kind === 'in') (fx.burst(x, y, '#ffe066', 12, 2.6, 2), fx.ring(x, y, '#fff6a0', R(0.06), 3), fx.pop(x, y - R(0.02) - (e.v ?? 0) * 2, e.text!, e.col!, 15));
    if (e.kind === 'poke') (fx.pop(x, y, e.text!, e.col!, 17), fx.kick(2), fx.burst(x, Y(SURF), '#7a4a28', 5, 1.6, 1.6));
    if (e.kind === 'miss') fx.pop(x, y, e.text!, e.col!, 14);
    if (e.kind === 'grow') (fx.burst(x, y, '#7ad65e', 16, 3, 2.2), fx.ring(x, y, '#c8ff9a', R(0.08), 4), e.text && fx.pop(Math.max(R(0.25), Math.min(w - R(0.25), x)), y - R(0.05), e.text, e.col!, 17));
    if (e.kind === 'mole') (fx.burst(x, y, '#8a5a30', 10, 2.2, 2), fx.pop(x, y - R(0.06), e.text!, e.col!, 14));
    if (e.kind === 'clear') {
      fx.burst(X(0.5), Y(0.3), '#ffe066', 46, 6, 3.2);
      fx.burst(X(0.5), Y(0.3), '#ff8fb1', 26, 5, 3);
      fx.burst(X(0.5), Y(0.3), '#7ad65e', 26, 5, 3);
      fx.blink('#fff6c8', 0.22);
    }
    if (e.kind === 'fail') (fx.kick(9), fx.blink('#ff8a7a', 0.22));
    if (e.kind === 'stage') fx.blink('#fff6d6', 0.16);
  }
  fx.memo.t = t;
  ctx.restore();
  drawHud(ctx, s, d, w, h, X, Y, R, font);
}

function drawHand(ctx: C2, x: number, y: number, k: number, press: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.35);
  ctx.scale(1 - press * 0.08, 1 - press * 0.08);
  ctx.fillStyle = 'rgba(40,20,5,.28)';
  ell(ctx, k * 0.1, k * 1.25, k * 0.5, k * 0.16);
  ctx.fill();
  ctx.fillStyle = '#fff3e6';
  ctx.strokeStyle = '#7a4a2a';
  ctx.lineWidth = Math.max(1.5, k * 0.07);
  rr(ctx, -k * 0.16, -k * 0.95, k * 0.32, k * 0.95, k * 0.16);
  ctx.fill();
  ctx.stroke();
  rr(ctx, -k * 0.45, -k * 0.15, k * 0.95, k * 0.95, k * 0.3);
  ctx.fill();
  ctx.stroke();
  for (let q = 0; q < 2; q++) {
    rr(ctx, k * (0.12 + q * 0.2) - k * 0.1, -k * 0.35, k * 0.22, k * 0.4, k * 0.1);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

/** 첫 판 첫 톡 전: 손가락이 가리킬 채소 (잎이 가장 큰 당근) */
function firstTip(s: FarmState): number {
  if (s.stage !== 0 || s.S.taps > 0 || s.tries > 0 || s.phase !== 'play') return -1;
  return habitBig(s.L, s.S);
}

function drawSection(ctx: C2, s: FarmState, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, _font: (sz: number, w?: number) => void, t: number) {
  const L = s.L, x0 = X(BX0) - R(0.012), x1 = X(BX1) + R(0.012), w = x1 - x0;
  const layers: [number, string, string][] = [[SURF, '#6a4124', '#76492a'], [0.75, '#7a4f2f', '#845736'], [0.94, '#8e5f3e', '#986845'], [1.13, '#a3734d', '#ab7b54']];
  layers.forEach(([y0, c0, c1], j) => {
    ctx.fillStyle = lin(ctx, 0, Y(y0), 0, Y(SEC_BOT), [[0, c0], [1, c1]]);
    ctx.beginPath();
    ctx.moveTo(x0, Y(y0));
    for (let x = BX0 - 0.012; x <= BX1 + 0.013; x += 0.03) ctx.lineTo(X(x), Y(y0 + (j ? 0.012 * Math.sin(x * 11 + j * 2) + 0.006 * Math.sin(x * 29 + j) : 0)));
    ctx.lineTo(x1, Y(SEC_BOT));
    ctx.lineTo(x0, Y(SEC_BOT));
    ctx.closePath();
    ctx.fill();
  });
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, Y(SURF), w, Y(SEC_BOT - SURF));
  ctx.clip();
  // 물 먹은 흙
  for (let i = 0; i < L.n; i++) {
    if (!L.p[i]?.wet) continue;
    const cx = X(slotX(L.n, i)), hw = R(slotW(L.n) * 0.55);
    ctx.fillStyle = lin(ctx, 0, Y(SURF), 0, Y(1.0), [[0, 'rgba(60,110,190,.55)'], [0.6, 'rgba(60,110,190,.22)'], [1, 'rgba(60,110,190,0)']]);
    ctx.beginPath();
    ctx.moveTo(cx - hw, Y(SURF));
    ctx.quadraticCurveTo(cx - hw * 1.1, Y(0.85), cx, Y(1.0));
    ctx.quadraticCurveTo(cx + hw * 1.1, Y(0.85), cx + hw, Y(SURF));
    ctx.fill();
    ctx.fillStyle = 'rgba(160,215,255,.8)';
    for (let k = 0; k < 4; k++) {
      const q = ((t * 0.006 + hsh(i * 9 + k)) % 1), dx = (hsh(i * 7 + k) - 0.5) * hw * 1.2;
      ell(ctx, cx + dx, Y(SURF + 0.02 + q * 0.3), R(0.005), R(0.008));
      ctx.fill();
    }
  }
  // 자갈 · 흙 알갱이
  for (let k = 0; k < 46; k++) {
    const px = BX0 + hsh(k + 100) * (BX1 - BX0), py = SURF + 0.03 + hsh(k + 101) * (SEC_BOT - SURF - 0.05), r = 0.004 + 0.008 * hsh(k + 102);
    ctx.fillStyle = k % 3 ? 'rgba(40,20,8,.28)' : 'rgba(220,180,140,.35)';
    ell(ctx, X(px), Y(py), R(r), R(r * 0.7), k);
    ctx.fill();
  }
  for (let k = 0; k < 9; k++) {
    const px = BX0 + 0.04 + hsh(k + 200) * (BX1 - BX0 - 0.08), py = 0.9 + hsh(k + 201) * 0.35, r = 0.011 + 0.008 * hsh(k + 202);
    ctx.fillStyle = '#b8a48c';
    ell(ctx, X(px), Y(py), R(r), R(r * 0.7), k);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ell(ctx, X(px) - R(r * 0.3), Y(py) - R(r * 0.25), R(r * 0.35), R(r * 0.2));
    ctx.fill();
  }
  // 개미굴: 방 둘과 굽은 길, 줄지어 가는 개미
  {
    const A0: [number, number] = [0.7, 1.2], B0: [number, number] = [0.87, 1.16], C0: [number, number] = [0.785, 1.24];
    const path = (q: number): [number, number] => [(1 - q) * (1 - q) * A0[0] + 2 * q * (1 - q) * C0[0] + q * q * B0[0], (1 - q) * (1 - q) * A0[1] + 2 * q * (1 - q) * C0[1] + q * q * B0[1]];
    ctx.strokeStyle = 'rgba(45,22,8,.5)';
    ctx.lineWidth = R(0.016);
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let q = 0; q <= 1.001; q += 0.1) ctx.lineTo(X(path(q)[0]), Y(path(q)[1]));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(X(B0[0]), Y(B0[1]));
    ctx.quadraticCurveTo(X(B0[0] + 0.04), Y(B0[1] - 0.05), X(B0[0] + 0.02), Y(B0[1] - 0.1));
    ctx.stroke();
    ctx.fillStyle = 'rgba(45,22,8,.6)';
    ell(ctx, X(A0[0]), Y(A0[1]), R(0.045), R(0.024));
    ctx.fill();
    ell(ctx, X(B0[0]), Y(B0[1]), R(0.038), R(0.02));
    ctx.fill();
    ctx.fillStyle = 'rgba(255,236,200,.75)';
    for (let k = 0; k < 3; k++) (ell(ctx, X(A0[0] - 0.02 + k * 0.016), Y(A0[1] + 0.006), R(0.008), R(0.006)), ctx.fill());
    for (let k = 0; k < 4; k++) {
      const q = (t * 0.0025 + k * 0.25) % 1, [px, py] = path(q), [qx, qy] = path(Math.min(1, q + 0.02)), an = Math.atan2(qy - py, qx - px);
      ctx.save();
      ctx.translate(X(px), Y(py) - R(0.004));
      ctx.rotate(an);
      ctx.fillStyle = '#2a120a';
      for (let j = 0; j < 3; j++) (ell(ctx, -j * R(0.006), 0, R(0.0036), R(0.003)), ctx.fill());
      ctx.restore();
    }
  }
  // 묻힌 도토리
  {
    const ox = X(0.24), oy = Y(1.16);
    ctx.save();
    ctx.translate(ox, oy);
    ctx.rotate(0.5);
    ctx.fillStyle = '#b8743a';
    ell(ctx, 0, R(0.008), R(0.014), R(0.018));
    ctx.fill();
    ctx.fillStyle = '#7a4a22';
    ell(ctx, 0, -R(0.006), R(0.016), R(0.009));
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ell(ctx, -R(0.005), R(0.006), R(0.004), R(0.007));
    ctx.fill();
    ctx.restore();
  }
  // 지렁이
  {
    const wx = 0.15 + 0.7 * ((t * 0.0006 + 0.3) % 1), wy = 1.2;
    ctx.strokeStyle = '#ff9aa8';
    ctx.lineWidth = Math.max(3, R(0.012));
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let k = 0; k < 8; k++) ctx.lineTo(X(wx - k * 0.008), Y(wy + Math.sin(t * 0.15 - k * 0.8) * 0.006));
    ctx.stroke();
    ctx.fillStyle = '#3a1a10';
    ell(ctx, X(wx + 0.002), Y(wy - 0.002), 1.3, 1.3);
    ctx.fill();
  }
  // 뽑힌 자리: 채소 모양 굴
  for (const ho of s.holes) {
    const p = L.p[ho.i];
    if (!p) continue;
    const b = bodyOf(s, ho.i), k = b ? b.k : p.k, age = t - ho.t, a = 0.7 - 0.52 * clamp01(age / 150);
    ctx.save();
    ctx.translate(X(slotX(L.n, ho.i)), Y(SURF + bodyH(k) / 2));
    ctx.globalAlpha = a;
    ctx.fillStyle = '#4a2a14';
    bodyPath(ctx, k, R);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }
  ctx.restore();
  // 잘린 단면의 밝은 윗선
  ctx.fillStyle = '#c48a54';
  ctx.fillRect(x0, Y(SURF) - 1, w, 2.5);
  // 뽑힌 자리 윗면: 구덩이 + 흙더미
  for (const ho of s.holes) {
    const x = X(slotX(L.n, ho.i)), age = t - ho.t, q = ease(age / 12);
    ctx.fillStyle = '#3e2412';
    ell(ctx, x, Y(SURF - 0.016), R(0.035) * q, R(0.012) * q);
    ctx.fill();
    ctx.fillStyle = '#9a6438';
    for (const sd of [-1, 1]) (ell(ctx, x + sd * R(0.042), Y(SURF - 0.022), R(0.02) * q, R(0.01) * q), ctx.fill());
  }
  // 두더지 굴과 두더지
  if (L.mole) {
    const my = Y(MOLE_Y);
    ctx.fillStyle = 'rgba(40,20,10,.35)';
    rr(ctx, X(BX0) + R(0.01), my - R(0.03), X(BX1 - BX0) - R(0.02), R(0.06), R(0.03));
    ctx.fill();
    const [ng] = moleNext(L, s.S.moleG, s.S.moleDir), nx = X(gapX(L, ng)), cur = X(s.moleX);
    // 다음 칸 화살표
    if (s.phase === 'play') {
      ctx.strokeStyle = `rgba(255,90,70,${0.7 + 0.3 * Math.sin(t * 0.2)})`;
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 5]);
      ctx.lineDashOffset = -t * 0.5;
      ctx.beginPath();
      ctx.moveTo(cur + (nx > cur ? R(0.06) : -R(0.06)), my);
      ctx.lineTo(nx, my);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#ff5a46';
      const dir = nx > cur ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(nx + dir * R(0.026), my);
      ctx.lineTo(nx - dir * R(0.006), my - R(0.024));
      ctx.lineTo(nx - dir * R(0.006), my + R(0.024));
      ctx.fill();
      _font(0.03, 900);
      const lab = '다음 톡 뒤 냠', tw = ctx.measureText(lab).width + R(0.024), lx = Math.max(X(BX0) + tw / 2, Math.min(X(BX1) - tw / 2, nx));
      ctx.fillStyle = 'rgba(255,90,70,.92)';
      rr(ctx, lx - tw / 2, my + R(0.045), tw, R(0.036), R(0.018));
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(lab, lx, my + R(0.063));
    }
    drawMole(ctx, cur, my, R(0.085), t, t - s.moleT < 40 && t > s.moleT);
  }
}

/** 정지한 뿌리 이음 (늘어나는 중인 것은 drawRopes가 그린다) */
function drawLinks(ctx: C2, s: FarmState, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, t: number) {
  const L = s.L, S = s.S, active = new Set(s.ropes.map((r) => r.link));
  const next = L.mole && s.phase === 'play' ? moleNext(L, S.moleG, S.moleDir)[0] : -1;
  L.links.forEach((e, j) => {
    const ga = (S.gone >> e.a) & 1, gb = (S.gone >> e.b) & 1, alive = (S.alive >> j) & 1;
    const [ax, ay] = anchorOf(s, e.a, e.b), [bx, by] = anchorOf(s, e.b, e.a), dip = linkDip(L, e);
    const seg = (q0: number, q1: number) => {
      const pts: [number, number][] = [];
      for (let k = 0; k <= 10; k++) {
        const [x, y] = curveAt(ax, ay, bx, by, dip, q0 + ((q1 - q0) * k) / 10);
        pts.push([X(x), Y(y)]);
      }
      return pts;
    };
    const wd = R(Math.abs(e.a - e.b) === 1 ? 0.011 : 0.009);
    if (!active.has(j)) {
      if (alive) {
        const cutNext = next >= 0 && Math.min(e.a, e.b) < next && Math.max(e.a, e.b) >= next;
        strokeRoot(ctx, seg(0, 1), wd, cutNext ? 0.5 + 0.5 * Math.sin(t * 0.25) : 0);
        if (cutNext) {
          const [mx, my] = curveAt(ax, ay, bx, by, dip, (gapX(L, next) - ax) / (bx - ax || 1));
          ctx.strokeStyle = '#ff4a3a';
          ctx.lineWidth = 3;
          for (const sd of [-1, 1]) (ctx.beginPath(), ctx.moveTo(X(mx) - R(0.012), Y(my) - sd * R(0.012)), ctx.lineTo(X(mx) + R(0.012), Y(my) + sd * R(0.012)), ctx.stroke());
        }
      } else if (!ga && !gb) {
        // 끊긴 이음: 두 토막
        const cq = L.mole ? clamp01((gapX(L, Math.max(1, Math.min(L.n - 1, Math.round((e.a + e.b + 1) / 2)))) - ax) / (bx - ax || 1)) : 0.5;
        strokeRoot(ctx, seg(0, Math.max(0.1, cq - 0.08)), wd);
        strokeRoot(ctx, seg(Math.min(0.9, cq + 0.08), 1), wd);
      } else if (!ga || !gb) {
        // 한쪽이 뽑혀 나간 토막
        strokeRoot(ctx, ga ? seg(0.72, 1) : seg(0, 0.28), wd * 0.9);
      }
    }
    if (e.stone) {
      const [sx, sy] = curveAt(...anchorOf(s, e.a, e.b), ...anchorOf(s, e.b, e.a), dip, 0.5);
      const wob = s.events.some((q) => q.kind === 'snap' && q.v === 1 && t - q.t < 20 && Math.abs(q.x - sx) < 0.08) ? Math.sin(t * 1.2) * 0.15 : 0;
      drawStone(ctx, X(sx), Y(sy + 0.004), R(0.038), wob);
    }
  });
}
function drawRopes(ctx: C2, s: FarmState, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number) {
  for (const r of s.ropes) {
    let len = 0;
    for (let k = 1; k < ROPE_N; k++) len += Math.hypot(r.nx[k] - r.nx[k - 1], r.ny[k] - r.ny[k - 1]);
    const st = len / (r.rest * (ROPE_N - 1)), wd = R(0.011) * Math.max(0.4, Math.min(1, 1 / Math.sqrt(st)));
    const hot = r.kind === 'snap' && r.broke < 0 ? clamp01((st - 1) / 0.8) : 0;
    const m = ROPE_N >> 1, pts = r.nx.map((x, k) => [X(x), Y(r.ny[k])] as [number, number]);
    if (r.broke >= 0) {
      ctx.globalAlpha = clamp01(1 - (s.t - r.broke) / 32);
      strokeRoot(ctx, pts.slice(0, m), wd);
      strokeRoot(ctx, pts.slice(m), wd);
      ctx.globalAlpha = 1;
    } else strokeRoot(ctx, pts, wd, hot);
  }
}

function drawBasket(ctx: C2, s: FarmState, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, font: (sz: number, w?: number) => void, t: number) {
  const cx = X(BASK_X), top = Y(BASK_Y - 0.03), bot = Y(GRASS + 0.03), hw = R(0.1), bw = R(0.075);
  ctx.fillStyle = 'rgba(40,70,20,.3)';
  ell(ctx, cx, bot, hw * 1.05, R(0.016));
  ctx.fill();
  // 안쪽(뒤)
  ctx.fillStyle = '#7a4a22';
  ell(ctx, cx, top, hw, R(0.022));
  ctx.fill();
  // 바구니 속 채소
  const inB = s.bodies.filter((b) => b.mode === 'in');
  inB.forEach((b) => {
    const j = b.slot, col = j % 5, row = Math.floor(j / 5), age = t - b.t, pop = age < 10 ? 1 + 0.25 * Math.sin((age / 10) * Math.PI) : 1;
    const x = cx + (col - 2) * R(0.03) + (row % 2) * R(0.015), y = top - R(0.012) - row * R(0.016);
    drawPlant(ctx, R, x, y, b.k, b.leaf, (col - 2) * 0.35 + 0.1, 0, 'happy', t, { scale: 0.62 * pop, col: b.i, sway: Math.sin(t * 0.05 + j) * 0.05 });
  });
  // 앞면 (엮은 무늬)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx - hw, top);
  ctx.lineTo(cx + hw, top);
  ctx.lineTo(cx + bw, bot);
  ctx.quadraticCurveTo(cx, bot + R(0.012), cx - bw, bot);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, top, 0, bot, [[0, '#e0a95e'], [1, '#b87a3a']]);
  ctx.fill();
  ctx.clip();
  ctx.strokeStyle = 'rgba(120,70,25,.55)';
  ctx.lineWidth = 1.4;
  for (let k = 0; k < 4; k++) {
    const yy = top + ((bot - top) * (k + 0.5)) / 4;
    ctx.beginPath();
    ctx.moveTo(cx - hw, yy);
    ctx.lineTo(cx + hw, yy);
    ctx.stroke();
  }
  for (let k = -5; k <= 5; k++) {
    ctx.beginPath();
    ctx.moveTo(cx + k * R(0.02), top);
    ctx.lineTo(cx + k * R(0.015), bot);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = '#8a5424';
  ctx.lineWidth = Math.max(3, R(0.012));
  ell(ctx, cx, top, hw, R(0.022));
  ctx.stroke();
  ctx.strokeStyle = '#f0c27a';
  ctx.lineWidth = Math.max(1, R(0.004));
  ctx.stroke();
  // 손잡이
  ctx.strokeStyle = '#a8682e';
  ctx.lineWidth = Math.max(3, R(0.011));
  ctx.beginPath();
  ctx.ellipse(cx, top, hw * 0.85, R(0.075), 0, Math.PI * 1.05, Math.PI * 1.95);
  ctx.stroke();
  // 거둔 수 팻말
  const L = s.L, shown = inB.filter((b) => b.k === 'carrot').length, bigShown = inB.filter((b) => b.k === 'big').length;
  font(0.036, 900);
  const lab = `당근 ${Math.min(shown, L.goal)}/${L.goal}${L.goalBig ? `  큰 무 ${bigShown}/${L.goalBig}` : ''}`, tw = ctx.measureText(lab).width + R(0.03);
  const lx = Math.min(X(0.985) - tw / 2, cx), ly = Y(0.36);
  ctx.fillStyle = shown >= L.goal && bigShown >= L.goalBig ? '#3aa84a' : '#fffaf0';
  rr(ctx, lx - tw / 2, ly - R(0.022), tw, R(0.044), R(0.012));
  ctx.fill();
  ctx.strokeStyle = '#8a5424';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = shown >= L.goal && bigShown >= L.goalBig ? '#ffffff' : '#6a3a14';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(lab, lx, ly + 1);
}

const starText = (s: FarmState, k: StarK) => {
  const L = s.L, hasSprout = L.p.some((q) => q?.k === 'sprout');
  if (k === 'goal') return `당근 ${L.goal}개${L.goalBig ? '·큰 무' : ''} 다 거두기`;
  if (k === 'clean') return hasSprout ? '꽃·새싹은 그대로' : '꽃은 그대로';
  return `${NUM[L.par] ?? L.par} 번 안에`;
};
function drawHud(ctx: C2, s: FarmState, d: StageDef, w: number, h: number, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, font: (sz: number, w?: number) => void) {
  const L = s.L, S = s.S, t = s.t;
  // ── 위 띠: 판 · 별 · 하트
  ctx.fillStyle = 'rgba(255,250,236,.92)';
  rr(ctx, R(0.02), R(0.015), w - R(0.04), R(0.07), R(0.035));
  ctx.fill();
  ctx.strokeStyle = 'rgba(140,90,40,.5)';
  ctx.lineWidth = 2;
  ctx.stroke();
  font(0.042, 900);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#6a3a14';
  ctx.fillText(`${s.stage + 1}판 · ${d.name}`, R(0.05), R(0.051));
  for (let k = 0; k < 3; k++) drawHeart(ctx, w - R(0.06) - k * R(0.055), R(0.05), R(0.019), k < s.hearts);
  ctx.fillStyle = '#ffc93a';
  starPath(ctx, w - R(0.27), R(0.05), R(0.022));
  ctx.fill();
  ctx.strokeStyle = '#9a5a08';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#6a3a14';
  ctx.textAlign = 'left';
  ctx.fillText(`${s.stars}`, w - R(0.24), R(0.052));
  // ── 아래 띠: 톡 남은 수 · 별 조건
  const by = Y(SEC_BOT + 0.014);
  ctx.fillStyle = lin(ctx, 0, by, 0, h, [[0, '#8a5a32'], [1, '#6e4424']]);
  ctx.fillRect(0, by, w, h - by);
  ctx.fillStyle = 'rgba(255,255,255,.08)';
  for (let k = 0; k < 3; k++) ctx.fillRect(0, by + R(0.07) * k + R(0.002), w, 1.5);
  const left = L.limit - S.taps;
  font(0.04, 900);
  ctx.fillStyle = '#fff4dc';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const ry = by + R(0.04);
  ctx.fillText('남은 톡', R(0.04), ry);
  const tw0 = ctx.measureText('남은 톡').width;
  for (let k = 0; k < L.limit; k++) {
    const cx = R(0.06) + tw0 + k * R(0.052), on = k < left;
    ctx.fillStyle = on ? '#7ad65e' : 'rgba(255,255,255,.18)';
    ell(ctx, cx, ry, R(0.019), R(0.019));
    ctx.fill();
    ctx.strokeStyle = on ? '#2f7a2a' : 'rgba(255,255,255,.3)';
    ctx.lineWidth = 2;
    ctx.stroke();
    if (on) {
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ell(ctx, cx - R(0.006), ry - R(0.007), R(0.006), R(0.004));
      ctx.fill();
    }
  }
  // 별 조건 (한 줄 말) — 지금 지켜지고 있으면 노랗게
  const stars = L.stars, live = stars.map((k) => (k === 'goal' ? won(L, S) : k === 'clean' ? S.bad === 0 : S.taps <= L.par));
  const res = s.phase === 'result' && s.ok ? s.starOk : live;
  font(0.036, 800);
  let cx = R(0.04), cy = by + R(0.105);
  stars.forEach((k, j) => {
    const txt = starText(s, k), tw = ctx.measureText(txt).width + R(0.075);
    if (cx + tw > w - R(0.02)) (cx = R(0.04)), (cy += R(0.058));
    const on = res[j], broken = !on && k !== 'goal';
    ctx.fillStyle = on ? 'rgba(255,220,90,.25)' : 'rgba(0,0,0,.18)';
    rr(ctx, cx, cy - R(0.024), tw, R(0.048), R(0.024));
    ctx.fill();
    ctx.fillStyle = on ? '#ffc93a' : broken ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.45)';
    starPath(ctx, cx + R(0.03), cy, R(0.019));
    ctx.fill();
    ctx.fillStyle = on ? '#fff6d0' : broken ? 'rgba(255,240,220,.55)' : '#fff0dc';
    ctx.textAlign = 'left';
    ctx.fillText(txt, cx + R(0.058), cy + 1);
    if (broken && s.phase !== 'result') {
      ctx.strokeStyle = 'rgba(255,170,150,.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx + R(0.055), cy + 1);
      ctx.lineTo(cx + tw - R(0.015), cy + 1);
      ctx.stroke();
    }
    cx += tw + R(0.02);
  });
  // ── 판 띠 (시작 · 결과)
  let head = '', sub = '', a = 0, age = 0, mid = Y(0.25);
  if (s.phase === 'result') {
    age = s.pt;
    a = Math.min(1, age / 8);
    if (s.ok) head = s.won ? '텃밭을 다 거뒀다!' : '다 거뒀다!';
    else (head = '으앗!'), (sub = s.hearts > 0 ? `${s.why} · 하트 -1 · 같은 밭 다시` : `${s.why} · 하트가 없어요`);
  } else if (s.banner && t - s.banner.t < 170) {
    age = t - s.banner.t;
    a = Math.min(1, age / 8, (170 - age) / 25);
    (head = s.banner.head), (sub = s.banner.sub);
  }
  if (head && a > 0) {
    const pop = Math.min(1, 0.55 + age / 10);
    ctx.save();
    ctx.globalAlpha = a;
    font(0.056, 900);
    const w1 = ctx.measureText(head).width;
    font(0.036, 800);
    const w2 = sub ? ctx.measureText(sub).width : 0;
    const okRes = s.phase === 'result' && s.ok;
    const cw = Math.min(w - R(0.04), Math.max(w1, w2, okRes ? R(0.5) : 0) + R(0.1)), ch = (okRes ? R(0.22) : sub ? R(0.15) : R(0.09)) * pop;
    ctx.translate(w / 2, mid);
    ctx.fillStyle = 'rgba(60,30,10,.3)';
    rr(ctx, -cw / 2 + 3, -ch / 2 + 5, cw, ch, R(0.035));
    ctx.fill();
    ctx.fillStyle = lin(ctx, 0, -ch / 2, 0, ch / 2, [[0, '#fffaf0'], [1, '#ffe8c0']]);
    rr(ctx, -cw / 2, -ch / 2, cw, ch, R(0.035));
    ctx.fill();
    ctx.strokeStyle = '#8a5a20';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = s.phase === 'result' ? (s.ok ? '#ff7a2a' : '#7a8aa8') : '#5ab04a';
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
    font(0.056, 900);
    ctx.fillStyle = s.phase === 'result' ? (s.ok ? '#d0500a' : '#5a6a88') : '#3a7a2a';
    if (okRes) {
      ctx.fillText(head, 0, -R(0.06), w - R(0.1));
      const nS = s.starOk.length;
      for (let j = 0; j < nS; j++) {
        const ag = s.pt - (16 + j * 14), sx = (j - (nS - 1) / 2) * R(0.1), popS = ag < 0 ? 0.8 : ag < 8 ? 1.9 - 0.9 * (ag / 8) : 1;
        starPath(ctx, sx, R(0.025), R(0.04) * popS);
        ctx.fillStyle = ag >= 0 && s.starOk[j] ? '#ffc93a' : 'rgba(90,50,20,.15)';
        ctx.fill();
        ctx.strokeStyle = ag >= 0 && s.starOk[j] ? '#9a5a08' : 'rgba(90,50,20,.35)';
        ctx.lineWidth = 1.6;
        ctx.stroke();
        const fx = juice(s);
        if (ag >= 0 && s.starOk[j] && (fx.memo['st' + j] ?? -1) < s.t - ag) (fx.memo['st' + j] = s.t - ag), fx.burst(w / 2 + sx, mid + R(0.025), '#ffd23a', 16, 3, 2.4);
      }
    } else {
      ctx.fillText(head, 0, sub ? -R(0.028) : R(0.002), w - R(0.1));
      if (sub) {
        font(0.036, 800);
        ctx.fillStyle = sub.startsWith('NEW') ? '#d0402a' : '#6a4a2a';
        ctx.fillText(sub, 0, R(0.038), w - R(0.08));
      }
    }
    ctx.restore();
  }
  void X;
}
