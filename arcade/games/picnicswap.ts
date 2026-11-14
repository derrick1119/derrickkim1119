/**
 * 소풍 바구니 바꾸기 (26라운드: 검증된 캐주얼 뼈대 × 공장의 와우) — 3매치 × 가리키기(톡 두 번) × 콤보.
 * 기준 9(손이 하는 일은 하나): 음식을 톡 → 이웃 음식을 톡 → 자리가 바뀐다. 이어지지 않으면 '휙' 제자리로(바꾸기는 안 깎임).
 *   고른 음식은 살짝 들리고, 바꾸면 이어지는 이웃 쪽 틈에만 작은 반짝이가 핀다(어느 걸 바꿀지는 여전히 내 몫).
 *   끌기 없음. 키보드는 화살표 커서 + 스페이스.
 * 규칙(결정적): 같은 음식 셋 이상이 가로·세로로 이어지면 '냠!' 사라지고 위(바람이 불면 바람 쪽)에서 떨어져 채워진다. 또 이어지면 연쇄.
 *   넷 → 김밥(바꾸면 그 줄을 싹), 다섯·ㄱ자 → 수박 폭탄(바꾸면 3×3 쾅). 특별 음식끼리 바꾸면 더 크게.
 * 와우(개미 줄): 개미 떼가 돗자리 아래 가장자리로 줄지어 와서, 맨 아랫줄 음식을 하나 머리에 이고 한 수에 한 칸씩 기어오른다.
 *   꼭대기에 닿으면 바구니에서 음식 2개를 훔쳐 간다. 개미 옆에서 냠! 하면 깜짝 놀라 이고 있던 음식을 떨구고(내 것) 도망가고,
 *   개미 밑을 지우면 개미가 데굴데굴 굴러떨어져 멀어진다 — 아래를 지워 연쇄를 노릴지, 개미 옆을 지울지가 수다.
 * 판 8개: 목표(음식 모으기·김밥 말기·개미 쫓기·얼음 접시 깨기·수박 쾅)를 바꾸기 K번 안에.
 *   별 = ★ 목표 · ★ 바꾸기 R번 남기기 · ★ 판마다 도전(큰 연쇄·개미에게 안 뺏기기…). 실패(바꾸기를 다 씀) = 하트 -1, 새 돗자리로 그 판 다시.
 * 펼쳐짐: 1 딸기(바꾸기·연쇄) → 2 김밥 말기(넷 잇기) → 3 개미 줄(쫓기·굴리기) → 4 얼음 접시(아래쪽 노리기)
 *   → 5 수박 쾅(ㄱ자·다섯) → 6 소나기(구름 밑 세 줄은 젖어 못 바꿈, 구름이 흘러감 — 기다릴지) → 7 회오리 바람(떨어지는 방향이 바뀜) → 8 대잔치.
 * 웃음: 개미들은 음식을 머리에 이고 낑낑, 놀라면 "깜짝!" 음식을 떨구고 허둥지둥, 굴러떨어지면 어질어질. 개미굴의 대장 개미는 훔치면 우쭐,
 *   쫓기면 발을 동동. 바구니 옆 강아지는 연쇄에 꼬리를 흔들고 개미에게 '멍!'.
 * 쾌감(오너 2026-11-14 "쾌감·기믹 부족"): 연쇄 3단·특별 음식이 터지면 잠깐 멈칫(히트스톱, 길수록 길게) → 와르르. '연쇄 ×N · 냠 M개'가 한 자리에서
 *   커지고(5단 이상 무지개 '대박!'), 흔들림·파티클·번쩍이 연쇄만큼 세진다. 성공하면 남은 바꾸기가 하나씩 폭죽(+10).
 * 기믹: 판마다 'NEW 장치' 카드(장치를 크게 그리고 하는 일 한 줄), 판 첫머리에 장치 자리를 반짝(얼음 접시·젖은 세 줄 테두리), 바람이 바뀌면 큰 화살 돌풍.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.58;
const W = 7, H = 8, N = W * H;
/** 칸 크기 · 돗자리(판) 왼쪽 위 */
const CS = 0.12, GX = (1 - W * CS) / 2, GY = 0.318;
const EMPTY = -1, UNK = 9, KH = 10, KV = 11, MELON = 12, ANT = 20;
const SWAP_T = 8, BACK_T = 18, POP_T = 9, ANT_T = 14, SHUF_T = 34, SETTLE_OK = 40, SETTLE_FAIL = 38, RESULT_OK = 150, RESULT_FAIL = 140, NEWS_T = 200;
const GACC = 0.045, VMAX = 0.7;
const STAR_PTS = 100, WIN_PTS = 100;
export const FOOD_NAMES = ['딸기', '샌드위치', '주먹밥', '포도', '쿠키', '우유'];

const isFood = (v: number) => v >= 0 && v < 6;
const isSp = (v: number) => v >= KH && v <= MELON;
const movable = (v: number) => isFood(v) || isSp(v);
const rowOf = (i: number) => (i / W) | 0;
const colOf = (i: number) => i % W;
const adj = (a: number, b: number) => (Math.abs(a - b) === 1 && rowOf(a) === rowOf(b)) || Math.abs(a - b) === W;

// ───────────────────────────── 판(소풍 자리) ─────────────────────────────
type GoalK = 'food' | 'ice' | 'ant' | 'kim' | 'melon';
interface Goal { k: GoalK; f?: number; n: number }
interface S3 { k: 'wave' | 'nosteal' | 'kim' | 'melon' | 'usek'; n: number; label: string }
interface StageDef {
  key: string; name: string; emoji: string; news: string; tip: string;
  foods: number[]; K: number; R: number; goals: Goal[]; s3: S3;
  ants?: { first: number; every: number; total: number };
  ice?: (r: number, c: number) => number;
  rain?: boolean; wind?: number;
}

export const STAGES: StageDef[] = [
  {
    key: 'berry', name: '딸기 소풍', emoji: '🍓', news: '🍓 이웃한 음식 둘을 톡톡 → 셋이 이어지면 냠!', tip: '🍓 딸기를 이어요 — 아래쪽을 지우면 연쇄가 잘 나요',
    foods: [0, 1, 2, 3, 5], K: 16, R: 6, goals: [{ k: 'food', f: 0, n: 12 }], s3: { k: 'wave', n: 3, label: '연쇄 ×3' },
  },
  {
    key: 'roll', name: '김밥 말기', emoji: '🍙', news: '🍙 넷을 한 줄로 이으면 김밥을 말아요 — 바꾸면 한 줄이 싹!', tip: '🍙 셋 말고 넷 — 김밥 자리를 아껴요',
    foods: [2, 0, 1, 3, 5], K: 19, R: 10, goals: [{ k: 'kim', n: 2 }, { k: 'food', f: 2, n: 14 }], s3: { k: 'wave', n: 3, label: '연쇄 ×3' },
  },
  {
    key: 'ants', name: '개미 줄', emoji: '🐜', news: '🐜 개미 줄이 왔다! 꼭대기까지 오르면 바구니를 털어 가요', tip: '🐜 개미 옆을 냠! 하면 깜짝 — 밑을 지우면 데굴',
    foods: [4, 0, 1, 2, 3, 5], K: 21, R: 8, goals: [{ k: 'food', f: 4, n: 16 }, { k: 'ant', n: 3 }], s3: { k: 'nosteal', n: 0, label: '안 뺏기기' },
    ants: { first: 1, every: 3, total: 5 },
  },
  {
    key: 'ice', name: '얼음 접시', emoji: '🧊', news: '🧊 얼음 접시 위 음식을 냠! 하면 접시가 깨져요', tip: '🧊 접시는 아래에 — 김밥 한 줄이면 한 번에!',
    foods: [5, 0, 1, 2, 3, 4], K: 18, R: 10, goals: [{ k: 'ice', n: 0 }], s3: { k: 'usek', n: 1, label: '김밥으로 싹' },
    ice: (r, c) => (r >= H - 3 && r <= H - 2 && c >= 1 && c <= W - 2 ? 1 : 0),
  },
  {
    key: 'melon', name: '수박 쾅', emoji: '🍉', news: '🍉 다섯 줄·ㄱ자로 이으면 수박 폭탄 — 바꾸면 쾅!', tip: '🍉 ㄱ자·T자 자리를 찾아요 — 수박끼리 바꾸면 더 크게',
    foods: [3, 0, 1, 2, 4, 5], K: 22, R: 8, goals: [{ k: 'melon', n: 1 }, { k: 'food', f: 3, n: 12 }], s3: { k: 'wave', n: 4, label: '연쇄 ×4' },
  },
  {
    key: 'rain', name: '소나기', emoji: '🌧️', news: '🌧️ 비 구름 밑 세 줄은 젖어서 못 바꿔요 — 구름은 흘러가요', tip: '🌧️ 구름이 지나갈 때를 기다릴지, 지금 바꿀지',
    foods: [5, 0, 1, 2, 3, 4], K: 23, R: 8, goals: [{ k: 'food', f: 5, n: 14 }, { k: 'food', f: 0, n: 14 }], s3: { k: 'nosteal', n: 0, label: '안 뺏기기' },
    rain: true, ants: { first: 2, every: 4, total: 3 },
  },
  {
    key: 'wind', name: '회오리 바람', emoji: '🍃', news: '🍃 바람이 불면 음식이 바람 쪽으로 떨어져요', tip: '🍃 바람 쪽 끝을 지우면 줄줄이 미끄러져요',
    foods: [1, 0, 2, 3, 4, 5], K: 20, R: 10, goals: [{ k: 'ice', n: 0 }, { k: 'food', f: 1, n: 12 }], s3: { k: 'wave', n: 3, label: '연쇄 ×3' },
    wind: 3, ice: (r, c) => (Math.abs(r - 4) + Math.abs(c - 3) <= 1 || (r === 4 && Math.abs(c - 3) === 2) ? 1 : 0),
  },
  {
    key: 'feast', name: '대잔치', emoji: '🧺', news: '🧺 마지막 대잔치 — 개미·얼음·구름이 다 와요!', tip: '🧺 개미부터? 접시부터? 구름 피해서!',
    foods: [0, 1, 2, 3, 4, 5], K: 27, R: 10, goals: [{ k: 'food', f: 0, n: 14 }, { k: 'ant', n: 3 }, { k: 'ice', n: 0 }], s3: { k: 'nosteal', n: 0, label: '안 뺏기기' },
    rain: true, ants: { first: 1, every: 3, total: 5 }, ice: (r, c) => (r === H - 2 && c >= 1 && c <= W - 2 ? 1 : 0),
  },
];
export const STAGE_COUNT = STAGES.length;

// ───────────────────────────── 규칙(시뮬레이션) ─────────────────────────────
export interface Board { g: Int8Array; carry: Int8Array; ice: Int8Array }
const cloneB = (B: Board): Board => ({ g: B.g.slice(), carry: B.carry.slice(), ice: B.ice.slice() });
interface Group { cells: number[]; f: number; mh: number; mv: number; cross: number; mid: number }
interface Act { i: number; sp: number; sp2?: number; j?: number }
export interface Wave {
  cleared: number[]; kinds: number[]; foods: number[]; made: { i: number; sp: number }[]; blasts: Act[];
  scared: number[]; rescued: number[]; cracked: number[]; groups: Group[];
}

/** 같은 음식 셋 이상 가로·세로 줄 → 겹치는 줄끼리 한 묶음 (ㄱ자·T자) */
function findGroups(g: Int8Array): Group[] {
  const runs: { cells: number[]; h: boolean }[] = [];
  for (let r = 0; r < H; r++)
    for (let c = 0; c < W; ) {
      const v = g[r * W + c];
      let e = c + 1;
      if (isFood(v)) while (e < W && g[r * W + e] === v) e++;
      if (isFood(v) && e - c >= 3) runs.push({ cells: Array.from({ length: e - c }, (_, k) => r * W + c + k), h: true });
      c = e;
    }
  for (let c = 0; c < W; c++)
    for (let r = 0; r < H; ) {
      const v = g[r * W + c];
      let e = r + 1;
      if (isFood(v)) while (e < H && g[e * W + c] === v) e++;
      if (isFood(v) && e - r >= 3) runs.push({ cells: Array.from({ length: e - r }, (_, k) => (r + k) * W + c), h: false });
      r = e;
    }
  if (!runs.length) return [];
  const par = runs.map((_, k) => k);
  const find = (x: number): number => (par[x] === x ? x : (par[x] = find(par[x])));
  const own = new Int16Array(N).fill(-1);
  runs.forEach((run, k) => run.cells.forEach((i) => (own[i] >= 0 ? (par[find(k)] = find(own[i])) : (own[i] = k))));
  const by = new Map<number, Group & { hm: Set<number>; vm: Set<number>; long: number }>();
  runs.forEach((run, k) => {
    const root = find(k);
    let G = by.get(root);
    if (!G) by.set(root, (G = { cells: [], f: g[run.cells[0]], mh: 0, mv: 0, cross: -1, mid: -1, hm: new Set(), vm: new Set(), long: 0 }));
    for (const i of run.cells) {
      if (!G.cells.includes(i)) G.cells.push(i);
      (run.h ? G.hm : G.vm).add(i);
    }
    if (run.h) G.mh = Math.max(G.mh, run.cells.length);
    else G.mv = Math.max(G.mv, run.cells.length);
    if (run.cells.length > G.long) (G.long = run.cells.length), (G.mid = run.cells[run.cells.length >> 1]);
  });
  const out: Group[] = [];
  for (const G of by.values()) {
    for (const i of G.hm) if (G.vm.has(i)) G.cross = i;
    out.push({ cells: G.cells, f: G.f, mh: G.mh, mv: G.mv, cross: G.cross, mid: G.mid });
  }
  return out;
}
const spOf = (G: Group) => (G.mh >= 5 || G.mv >= 5 || (G.mh >= 3 && G.mv >= 3) ? MELON : G.mh === 4 ? KH : G.mv === 4 ? KV : -1);

function areaOf(sp: number, i: number): number[] {
  const r = rowOf(i), c = colOf(i), out: number[] = [];
  if (sp === KH) for (let k = 0; k < W; k++) out.push(r * W + k);
  else if (sp === KV) for (let k = 0; k < H; k++) out.push(k * W + c);
  else for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (r + dr >= 0 && r + dr < H && c + dc >= 0 && c + dc < W) out.push((r + dr) * W + c + dc);
  return out;
}
/** 특별 음식끼리 바꾸기: 김밥+김밥 = 십자, 김밥+수박 = 세 줄 십자, 수박+수박 = 5×5 */
function comboArea(a: number, b: number, i: number): number[] {
  const r = rowOf(i), c = colOf(i), out = new Set<number>();
  const m = (a === MELON ? 1 : 0) + (b === MELON ? 1 : 0);
  if (m === 2) {
    for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) if (r + dr >= 0 && r + dr < H && c + dc >= 0 && c + dc < W) out.add((r + dr) * W + c + dc);
  } else {
    const wd = m === 1 ? 1 : 0;
    for (let d = -wd; d <= wd; d++) {
      if (r + d >= 0 && r + d < H) for (let k = 0; k < W; k++) out.add((r + d) * W + k);
      if (c + d >= 0 && c + d < W) for (let k = 0; k < H; k++) out.add(k * W + c + d);
    }
  }
  return [...out];
}

/** 한 물결: 이어진 줄을 지우고(특별 음식 만들기), 터진 특별 음식은 이웃 특별 음식까지 연쇄, 옆 개미는 깜짝 도망, 얼음 접시는 금 */
export function resolveWave(B: Board, prefer: number[], forced: Act[]): Wave | null {
  const g = B.g, groups = findGroups(g);
  if (!groups.length && !forced.length) return null;
  const clr = new Uint8Array(N), foods = [0, 0, 0, 0, 0, 0], made: { i: number; sp: number }[] = [], blasts: Act[] = [];
  for (const G of groups) {
    for (const i of G.cells) clr[i] = 1;
    const sp = spOf(G);
    if (sp < 0) continue;
    let p = G.cells.find((i) => prefer.includes(i)) ?? -1;
    if (p < 0) p = G.cross >= 0 ? G.cross : G.mid;
    made.push({ i: p, sp });
  }
  const q = forced.slice(), done = new Uint8Array(N);
  for (const a of q) (done[a.i] = 1), a.j !== undefined && (done[a.j] = 1);
  while (q.length) {
    const a = q.shift()!;
    blasts.push(a);
    clr[a.i] = 1;
    if (a.j !== undefined) clr[a.j] = 1;
    for (const j of a.sp2 !== undefined ? comboArea(a.sp, a.sp2, a.i) : areaOf(a.sp, a.i)) {
      clr[j] = 1;
      if (isSp(g[j]) && !done[j]) (done[j] = 1), q.push({ i: j, sp: g[j] });
    }
  }
  const scared: number[] = [], rescued: number[] = [];
  for (let i = 0; i < N; i++) {
    if (g[i] !== ANT) continue;
    const c = colOf(i);
    // 옆(왼쪽·오른쪽)에서 냠! 하거나 폭발에 휘말리면 깜짝 도망 (밑이 비면 굴러떨어질 뿐)
    if (clr[i] || (c > 0 && clr[i - 1]) || (c < W - 1 && clr[i + 1])) scared.push(i), rescued.push(B.carry[i]);
  }
  const cleared: number[] = [], kinds: number[] = [], cracked: number[] = [];
  for (let i = 0; i < N; i++) {
    if (!clr[i] || g[i] === ANT || g[i] === EMPTY) continue;
    cleared.push(i);
    kinds.push(g[i]);
    if (isFood(g[i])) foods[g[i]]++;
  }
  for (const f of rescued) if (isFood(f)) foods[f]++;
  for (let i = 0; i < N; i++) if (clr[i] && B.ice[i] > 0) B.ice[i]--, cracked.push(i);
  for (const i of cleared) g[i] = EMPTY;
  for (const i of scared) (g[i] = EMPTY), (B.carry[i] = -1);
  for (const m of made) g[m.i] = m.sp;
  return { cleared, kinds, foods, made, blasts, scared, rescued, cracked, groups };
}

/** 떨어지는 방향(0 아래 · 1 왼쪽 · 2 오른쪽)별 줄: 바닥 쪽부터 */
const LINES: number[][][] = [
  Array.from({ length: W }, (_, c) => Array.from({ length: H }, (_, k) => (H - 1 - k) * W + c)),
  Array.from({ length: H }, (_, r) => Array.from({ length: W }, (_, k) => r * W + k)),
  Array.from({ length: H }, (_, r) => Array.from({ length: W }, (_, k) => r * W + W - 1 - k)),
];
/** 빈칸으로 떨어뜨리고 채우기. off에 칸마다 떨어질 거리(칸)를 적는다 */
function gravity(B: Board, dir: number, refill: () => number, off?: Float32Array) {
  for (const line of LINES[dir]) {
    let w = 0;
    for (let j = 0; j < line.length; j++) {
      const i = line[j], v = B.g[i];
      if (v === EMPTY) continue;
      if (j !== w) {
        const t = line[w];
        B.g[t] = v;
        B.carry[t] = B.carry[i];
        B.g[i] = EMPTY;
        B.carry[i] = -1;
        if (off) (off[t] = j - w), (off[i] = 0);
      }
      w++;
    }
    const gap = line.length - w;
    for (let j = w; j < line.length; j++) {
      const i = line[j];
      B.g[i] = refill();
      B.carry[i] = -1;
      if (off) off[i] = gap;
    }
  }
}

function inLine(g: Int8Array, i: number) {
  const v = g[i];
  if (!isFood(v)) return false;
  const r = rowOf(i), c = colOf(i);
  let n = 1;
  for (let k = c - 1; k >= 0 && g[r * W + k] === v; k--) n++;
  for (let k = c + 1; k < W && g[r * W + k] === v; k++) n++;
  if (n >= 3) return true;
  n = 1;
  for (let k = r - 1; k >= 0 && g[k * W + c] === v; k--) n++;
  for (let k = r + 1; k < H && g[k * W + c] === v; k++) n++;
  return n >= 3;
}
/** 바꾸면 이어지는가 (특별 음식은 바꾸기만 해도 터진다) */
export function swapOk(B: Board, a: number, b: number) {
  const g = B.g, va = g[a], vb = g[b];
  if (!movable(va) || !movable(vb)) return false;
  if (isSp(va) || isSp(vb)) return true;
  if (va === vb) return false;
  g[a] = vb;
  g[b] = va;
  const ok = inLine(g, a) || inLine(g, b);
  g[a] = va;
  g[b] = vb;
  return ok;
}
/** 바꿀 수 있는 짝 전부 (젖은 줄 wm 비트는 못 바꾼다) */
export function listMoves(B: Board, wm: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < N; i++) {
    if ((wm >> colOf(i)) & 1) continue;
    if (colOf(i) < W - 1 && !((wm >> (colOf(i) + 1)) & 1) && swapOk(B, i, i + 1)) out.push([i, i + 1]);
    if (rowOf(i) < H - 1 && swapOk(B, i, i + W)) out.push([i, i + W]);
  }
  return out;
}
function forcedOf(va: number, vb: number, a: number, b: number): Act[] {
  if (isSp(va) && isSp(vb)) return [{ i: b, sp: va, sp2: vb, j: a }];
  if (isSp(va)) return [{ i: b, sp: va }];
  if (isSp(vb)) return [{ i: a, sp: vb }];
  return [];
}

/** 봇·판 고르기용: 바꾸고 끝까지 연쇄 (새로 떨어질 음식은 모른다 = UNK) */
export interface Out { foods: number[]; scared: number; cracked: number; madeK: number; madeM: number; usedM: number; usedK: number; waves: number; cleared: number; low: number; B: Board }
export function simSwap(B0: Board, a: number, b: number, gdir: number, maxW = 14): Out {
  const B = cloneB(B0), g = B.g, va = g[a], vb = g[b];
  g[a] = vb;
  g[b] = va;
  const o: Out = { foods: [0, 0, 0, 0, 0, 0], scared: 0, cracked: 0, madeK: 0, madeM: 0, usedM: 0, usedK: 0, waves: 0, cleared: 0, low: 0, B };
  let forced = forcedOf(va, vb, a, b), prefer = [a, b];
  for (let w = 0; w < maxW; w++) {
    const out = resolveWave(B, prefer, forced);
    forced = [];
    prefer = [];
    if (!out) break;
    o.waves++;
    for (let f = 0; f < 6; f++) o.foods[f] += out.foods[f];
    o.scared += out.scared.length;
    o.cracked += out.cracked.length;
    for (const m of out.made) m.sp === MELON ? o.madeM++ : o.madeK++;
    for (const x of out.blasts) (x.sp === MELON ? o.usedM++ : o.usedK++), x.sp2 !== undefined && (x.sp2 === MELON ? o.usedM++ : o.usedK++);
    o.cleared += out.cleared.length;
    for (const i of out.cleared) o.low += rowOf(i) / (H - 1);
    gravity(B, gdir, () => UNK);
  }
  return o;
}

// ───────────────────────────── 상태 ─────────────────────────────
type Phase = 'idle' | 'swap' | 'back' | 'pop' | 'fall' | 'ant' | 'shuffle' | 'settle' | 'result';
interface Ev { t: number; kind: string; x: number; y: number; text?: string; col?: string; v?: number }
export interface PicState {
  rng: Rng; seed: number; t: number; stage: number; phase: Phase; pt: number;
  B: Board; foods: number[]; gdir: number; fdir: number;
  off: Float32Array; vel: Float32Array; land: Int32Array;
  sel: number; selT: number; down: boolean; ax: number; ay: number; idleT: number; taps: number; swaps: number; tried: number;
  sw: { a: number; b: number; back: boolean } | null; prefer: number[]; forced: Act[]; wave: number; turnStage: number; hold: number; chainN: number;
  moves: number; got: number[]; scared: number; stolen: number; madeK: number; madeM: number; usedM: number; usedK: number; maxWave: number; iceLeft: number; ice0: number;
  antNext: number; antLeft: number; antCol: number; turnN: number; needFall: boolean;
  cloud: number; cloudDir: number; windIn: number; windNext: number; windI: number;
  hint: [number, number] | null;
  hearts: number; stars: number; gotSt: number; pts: number; ok: boolean; why: string; won: boolean; dead: boolean; tries: number;
  seen: Set<string>; tips: Set<string>; events: Ev[]; news: { text: string; t: number } | null; newsQ: string[]; startT: number; clearT: number;
  pops: { i: number; v: number; c: number }[]; lines: { i: number; sp: number; sp2?: number; t0: number }[];
  antMv: { from: number; to: number }[]; antIn: number; shuf: Int16Array | null; tumble: { i: number; t0: number }[];
  fly: { f: number; x0: number; y0: number; t0: number; gi: number }[];
  runners: { x: number; y: number; vx: number; vy: number; t0: number; f: number }[];
  thieves: { x: number; y: number; t0: number }[];
  mood: string; moodT: number; dog: string; dogT: number; bump: number[];
}

const ev = (s: PicState, kind: string, x: number, y: number, text?: string, col?: string, v?: number) => s.events.push({ t: s.t, kind, x, y, text, col, v });
function see(s: PicState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  s.newsQ.push(text);
}
function tip(s: PicState, key: string, text: string) {
  if (s.tips.has(key) || s.newsQ.length) return;
  s.tips.add(key);
  s.newsQ.push(text);
}
const setMood = (s: PicState, m: string) => ((s.mood = m), (s.moodT = s.t));
const setDog = (s: PicState, m: string) => ((s.dog = m), (s.dogT = s.t));

export const cellX = (i: number) => GX + (colOf(i) + 0.5) * CS;
export const cellY = (i: number) => GY + (rowOf(i) + 0.5) * CS;
function cellAt(x: number, y: number) {
  const c = Math.floor((x - GX) / CS), r = Math.floor((y - GY) / CS);
  return c >= 0 && c < W && r >= 0 && r < H ? r * W + c : -1;
}
/** 젖은 줄(비 구름 밑 세 줄) 비트 */
export const wetM = (s: PicState) => (STAGES[s.stage].rain ? 7 << s.cloud : 0);
const isWet = (s: PicState, i: number) => ((wetM(s) >> colOf(i)) & 1) === 1;
/** 목표 칩 자리 (바구니 오른쪽) */
const chipX = (k: number) => 0.335 + k * 0.135;
const CHIP_Y = 0.232, BASKET_X = 0.135, BASKET_Y = 0.235;

const needOf = (s: PicState, G: Goal) => (G.k === 'ice' ? s.ice0 : G.n);
function progOf(s: PicState, G: Goal, k: number) {
  if (G.k === 'food') return s.got[k];
  if (G.k === 'ice') return s.ice0 - s.iceLeft;
  if (G.k === 'ant') return s.scared;
  if (G.k === 'kim') return s.madeK;
  return s.usedM;
}
const goalMet = (s: PicState) => STAGES[s.stage].goals.every((G, k) => progOf(s, G, k) >= needOf(s, G));
const countIce = (B: Board) => B.ice.reduce((a, v) => a + (v > 0 ? 1 : 0), 0);
function s3ok(s: PicState) {
  const x = STAGES[s.stage].s3;
  if (x.k === 'wave') return s.maxWave >= x.n;
  if (x.k === 'nosteal') return s.stolen === 0;
  if (x.k === 'kim') return s.madeK >= x.n;
  if (x.k === 'usek') return s.usedK >= x.n;
  return s.usedM >= x.n;
}
export const starsOf = (s: PicState) => 1 + (s.moves >= STAGES[s.stage].R ? 1 : 0) + (s3ok(s) ? 1 : 0);

// ───────────────────────────── 돗자리 깔기 ─────────────────────────────
function fillFoods(B: Board, foods: number[], r: Rng) {
  for (let i = 0; i < N; i++) {
    if (B.g[i] !== EMPTY) continue;
    const rr = rowOf(i), c = colOf(i);
    let v = 0;
    for (let k = 0; k < 30; k++) {
      v = foods[Math.floor(r() * foods.length)];
      const h = c >= 2 && B.g[i - 1] === v && B.g[i - 2] === v, vv = rr >= 2 && B.g[i - W] === v && B.g[i - 2 * W] === v;
      if (!h && !vv) break;
    }
    B.g[i] = v;
    B.carry[i] = -1;
  }
}
function genBoard(s: PicState, d: StageDef): Board {
  let best: Board | null = null, bv = -1e9, hint: [number, number] | null = null;
  const tries = s.stage === 0 ? 12 : 30;
  for (let k = 0; k < tries; k++) {
    const B: Board = { g: new Int8Array(N).fill(EMPTY), carry: new Int8Array(N).fill(-1), ice: new Int8Array(N) };
    fillFoods(B, d.foods, s.rng);
    if (d.ice) for (let i = 0; i < N; i++) B.ice[i] = d.ice(rowOf(i), colOf(i));
    const mv = listMoves(B, wetM(s));
    if (mv.length < 3) continue;
    if (s.stage > 0) return B;
    // 첫 판: 첫 톡에 큰 일이 나는 돗자리 (아래쪽 딸기 줄 → 와르르)
    for (const [a, b] of mv) {
      const o = simSwap(B, a, b, 0);
      const v = o.foods[0] * 3 + o.cleared * 2 + o.waves * 3 + o.low * 2 + (o.madeK + o.madeM) * 4;
      if (v > bv) (bv = v), (best = B), (hint = [a, b]);
    }
  }
  if (!best) {
    const B: Board = { g: new Int8Array(N).fill(EMPTY), carry: new Int8Array(N).fill(-1), ice: new Int8Array(N) };
    fillFoods(B, d.foods, s.rng);
    if (d.ice) for (let i = 0; i < N; i++) B.ice[i] = d.ice(rowOf(i), colOf(i));
    best = B;
  }
  s.hint = s.stage === 0 && s.tries === 0 ? hint : null;
  return best;
}

function newStage(s: PicState) {
  const d = STAGES[s.stage];
  s.foods = d.foods.slice();
  s.moves = d.K;
  s.got = d.goals.map(() => 0);
  s.scared = s.stolen = s.madeK = s.madeM = s.usedM = s.usedK = s.maxWave = 0;
  s.gdir = s.fdir = 0;
  s.antLeft = d.ants ? d.ants.total : 0;
  s.antNext = d.ants ? d.ants.first : 0;
  s.turnN = 0;
  s.antCol = 1 + Math.floor(s.rng() * (W - 2));
  s.cloud = d.rain ? Math.floor(s.rng() * (W - 2)) : 0;
  s.cloudDir = s.cloud >= W - 3 ? -1 : 1;
  s.windIn = d.wind ?? 0;
  s.windI = 0;
  s.windNext = 1;
  s.B = genBoard(s, d);
  s.ice0 = s.iceLeft = countIce(s.B);
  s.off.fill(0);
  s.vel.fill(0);
  s.land.fill(-99);
  s.sel = -1;
  s.sw = null;
  s.prefer = [];
  s.forced = [];
  s.pops = [];
  s.lines = [];
  s.antMv = [];
  s.antIn = -1;
  s.shuf = null;
  s.tumble = [];
  s.fly = [];
  s.phase = 'idle';
  s.pt = 0;
  s.startT = s.idleT = s.t;
  s.gotSt = 0;
  setMood(s, d.ants ? 'idle' : 'sleep');
  see(s, d.key, d.news);
  ev(s, 'stage', 0.5, 0.7, `${s.stage + 1}판 · ${d.name}`, '#fff6d6');
}

function finish(s: PicState) {
  s.phase = 'result';
  s.pt = 0;
  const d = STAGES[s.stage];
  if (s.ok) {
    const st = starsOf(s);
    s.gotSt = st;
    s.stars += st;
    s.pts += st * STAR_PTS + s.moves * 10 + Math.min(s.maxWave, 6) * 5;
    s.clearT = s.t;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    ev(s, 'clear', 0.5, 0.75, `${d.emoji} 소풍 성공! ${'★'.repeat(st)}${'☆'.repeat(3 - st)}`, '#fff1a8', st);
    setDog(s, 'wag');
    setMood(s, 'stomp');
  } else {
    s.hearts--;
    s.tries++;
    ev(s, 'fail', 0.5, 0.75, s.why, '#ffd0c8');
    setDog(s, 'sad');
    setMood(s, 'smug');
  }
}

// ── 한 수의 흐름: 바꾸기 → (냠 → 떨어짐)×연쇄 → 개미 한 칸 → (냠 → 떨어짐)× → 구름·바람 → 다음 수 ──
function trySwap(s: PicState, a: number, b: number) {
  const B = s.B, g = B.g;
  s.tried++;
  if (g[b] === ANT) return void (ev(s, 'poke', cellX(b), cellY(b), '개미는 못 바꿔요!', '#ffe0c8'), setMood(s, 'huh'));
  if (isWet(s, b)) return void ev(s, 'wet', cellX(b), cellY(b), '젖어서 꿈쩍 안 해요', '#cfe8ff');
  if (!swapOk(B, a, b)) {
    s.sw = { a, b, back: true };
    s.phase = 'back';
    s.pt = 0;
    ev(s, 'nope', (cellX(a) + cellX(b)) / 2, (cellY(a) + cellY(b)) / 2, '휙! 안 이어져요', '#fff3df', s.t + 8);
    tip(s, 'nope', '바꿔도 셋이 안 이어지면 휙 돌아와요 (바꾸기는 안 깎여요)');
    return;
  }
  const va = g[a], vb = g[b];
  g[a] = vb;
  g[b] = va;
  s.moves--;
  s.swaps++;
  s.hint = null;
  s.sw = { a, b, back: false };
  s.prefer = [a, b];
  s.forced = forcedOf(va, vb, a, b);
  if (isSp(va) && isSp(vb)) see(s, 'combo', '💥 특별 음식끼리 바꾸면 더 크게 터져요!');
  s.wave = 0;
  s.chainN = 0;
  s.turnStage = 0;
  s.phase = 'swap';
  s.pt = 0;
}

function startWave(s: PicState) {
  const B = s.B, d = STAGES[s.stage];
  const prevG = B.g.slice(), prevC = B.carry.slice();
  const out = resolveWave(B, s.prefer, s.forced);
  s.forced = [];
  s.prefer = [];
  if (!out) return endCascade(s);
  s.wave++;
  if (s.turnStage === 0 && s.wave > s.maxWave) s.maxWave = s.wave;
  d.goals.forEach((G, k) => G.k === 'food' && (s.got[k] += out.foods[G.f!]));
  s.scared += out.scared.length;
  for (const m of out.made) m.sp === MELON ? s.madeM++ : s.madeK++;
  for (const x of out.blasts) (x.sp === MELON ? s.usedM++ : s.usedK++), x.sp2 !== undefined && (x.sp2 === MELON ? s.usedM++ : s.usedK++);
  s.iceLeft = countIce(B);
  // 쾌감: 먹은 수를 쌓고, 큰 순간엔 잠깐 멈칫(히트스톱) — 연쇄가 길수록·폭탄일수록 길게
  s.chainN += out.foods.reduce((a, v) => a + v, 0);
  const combo = out.blasts.some((x) => x.sp2 !== undefined), melon = out.blasts.some((x) => x.sp === MELON);
  s.hold = combo ? 20 : melon ? 13 : out.blasts.length ? 9 : s.wave >= 3 ? 2 + 2 * Math.min(s.wave, 6) : 0;
  // ── 화면 연출 ──
  s.pops = out.cleared.map((i, k) => ({ i, v: out.kinds[k], c: prevC[i] }));
  const goalF = d.goals.map((G) => (G.k === 'food' ? G.f! : -1));
  for (const i of out.cleared) {
    const gi = goalF.indexOf(prevG[i]);
    if (gi >= 0 && s.fly.length < 40) s.fly.push({ f: prevG[i], x0: cellX(i), y0: cellY(i), t0: s.t + 4 + (s.fly.length % 6) * 2, gi });
  }
  for (const gr of out.groups) {
    let x = 0, y = 0;
    for (const i of gr.cells) (x += cellX(i)), (y += cellY(i));
    x /= gr.cells.length;
    y /= gr.cells.length;
    const n = gr.cells.length;
    ev(s, 'pop', x, y, `${n >= 5 ? '와앙!' : n === 4 ? '냠냠!' : '냠!'} +${n}`, '#ffffff', gr.f + 10 * s.wave);
  }
  if (s.wave >= 2) {
    ev(s, 'wave', 0.5, GY + CS * 3.6, `연쇄 ×${s.wave}!`, s.wave >= 3 ? '#ffd166' : '#c8f7c5', s.wave);
    see(s, 'cascade', '🌊 떨어진 음식이 또 이어지면 연쇄 냠!');
    if (s.wave >= 3) setDog(s, 'wag');
  }
  for (const m of out.made) {
    ev(s, 'made', cellX(m.i), cellY(m.i), m.sp === MELON ? '수박 폭탄!' : '김밥 말았다!', m.sp === MELON ? '#ff9db0' : '#d6f5c0', m.sp);
    if (m.sp === MELON) see(s, 'melon', '🍉 다섯 줄·ㄱ자로 이으면 수박 폭탄 — 바꾸면 3×3 쾅!');
    else see(s, 'kim', '🍙 넷을 이으면 김밥! 김밥을 바꾸면 한 줄이 싹');
  }
  for (const x of out.blasts) {
    s.lines.push({ i: x.i, sp: x.sp, sp2: x.sp2, t0: s.t });
    ev(s, 'blast', cellX(x.i), cellY(x.i), x.sp2 !== undefined ? '대폭발!!' : x.sp === MELON ? '쾅!' : '싹~!', '#fff1a8', x.sp2 !== undefined ? 3 : x.sp === MELON ? 2 : x.sp === KH ? 1 : 4);
  }
  for (let k = 0; k < out.scared.length; k++) {
    const i = out.scared[k], f = out.rescued[k];
    s.runners.push({ x: cellX(i), y: cellY(i), vx: (colOf(i) < W / 2 ? -1 : 1) * 0.004, vy: -0.006, t0: s.t, f });
    ev(s, 'scare', cellX(i), cellY(i), '깜짝!', '#ffe08a');
    if (isFood(f)) {
      const gi = goalF.indexOf(f);
      if (gi >= 0) s.fly.push({ f, x0: cellX(i), y0: cellY(i) - CS * 0.4, t0: s.t + 10, gi });
    }
    see(s, 'scare', '😱 개미 옆에서 냠! 하면 깜짝 놀라 음식을 떨구고 도망가요');
    setMood(s, 'panic');
    setDog(s, 'bark');
  }
  for (const i of out.cracked) ev(s, 'crack', cellX(i), cellY(i), undefined, undefined, B.ice[i]);
  if (out.cracked.length) see(s, 'icecrack', '🧊 쨍! 얼음 접시가 깨졌어요');
  s.phase = 'pop';
  s.pt = 0;
}

function afterPop(s: PicState) {
  const antsBefore: number[] = [];
  for (let i = 0; i < N; i++) if (s.B.g[i] === ANT) antsBefore.push(i);
  s.fdir = s.gdir;
  gravity(s.B, s.gdir, () => s.foods[Math.floor(s.rng() * s.foods.length)], s.off);
  s.vel.fill(0);
  s.pops = [];
  // 밑이 비어 굴러떨어진 개미
  for (let i = 0; i < N; i++)
    if (s.B.g[i] === ANT && s.off[i] > 0 && s.fdir === 0) {
      s.tumble.push({ i, t0: s.t });
      ev(s, 'tumble', cellX(i), cellY(i), '데굴데굴~', '#ffe0c8', s.t + 12);
      see(s, 'tumble', '🌀 개미 밑을 지우면 데굴데굴 굴러떨어져요');
    }
  void antsBefore;
  s.phase = 'fall';
  s.pt = 0;
}

function endCascade(s: PicState) {
  if (s.turnStage === 0 && s.wave >= 3) {
    ev(s, 'feast', 0.5, GY + CS * 4.2, `냠냠 ${s.chainN}개!`, '#ffd166', s.wave);
    setDog(s, 'wag');
  }
  if (goalMet(s)) {
    s.phase = 'settle';
    s.pt = 0;
    s.ok = true;
    return;
  }
  if (s.turnStage === 0) {
    s.turnStage = 1;
    if (antTurn(s)) {
      s.phase = 'ant';
      s.pt = 0;
      return;
    }
  }
  envTurn(s);
  if (s.moves <= 0) {
    s.phase = 'settle';
    s.pt = 0;
    s.ok = false;
    s.why = '바꾸기를 다 썼어요!';
    return;
  }
  if (!listMoves(s.B, wetM(s)).length) return shuffleBoard(s);
  s.phase = 'idle';
  s.idleT = s.t;
}

/** 개미 차례: 모두 한 칸 기어오르고(맨 윗줄이면 바구니 털기), 줄 맨 앞 개미가 들어온다 */
function antTurn(s: PicState): boolean {
  const d = STAGES[s.stage];
  if (!d.ants) return false;
  const B = s.B, g = B.g;
  s.turnN++;
  s.antMv = [];
  s.antIn = -1;
  let any = false, empt = false;
  for (let i = 0; i < N; i++) {
    if (g[i] !== ANT) continue;
    if (rowOf(i) === 0) {
      g[i] = EMPTY;
      B.carry[i] = -1;
      s.stolen++;
      empt = any = true;
      const k = d.goals.findIndex((G) => G.k === 'food');
      if (k >= 0) s.got[k] = Math.max(0, s.got[k] - 2);
      else s.moves = Math.max(0, s.moves - 1);
      s.thieves.push({ x: cellX(i), y: cellY(i), t0: s.t });
      ev(s, 'steal', cellX(i), GY - 0.01, '쏙! 바구니를 털었다', '#ffb4a8', s.t + 10);
      see(s, 'steal', '🧺 개미가 바구니에서 음식 2개를 훔쳐 갔어요!');
      setMood(s, 'smug');
      setDog(s, 'bark');
      continue;
    }
    const j = i - W;
    if (g[j] === ANT || g[j] === EMPTY) continue;
    [g[i], g[j]] = [g[j], g[i]];
    [B.carry[i], B.carry[j]] = [B.carry[j], B.carry[i]];
    s.antMv.push({ from: i, to: j });
    any = true;
  }
  const onBoard = g.reduce((a, v) => a + (v === ANT ? 1 : 0), 0);
  if (s.antLeft > 0 && s.turnN >= s.antNext && onBoard < 3) {
    let col = -1;
    for (let dd = 0; dd < W && col < 0; dd++)
      for (const c of [s.antCol - dd, s.antCol + dd]) if (c >= 0 && c < W && isFood(g[(H - 1) * W + c])) (col = c), (dd = W);
    if (col >= 0) {
      const i = (H - 1) * W + col;
      B.carry[i] = g[i];
      g[i] = ANT;
      s.antLeft--;
      s.antNext = s.turnN + d.ants.every;
      s.antCol = 1 + Math.floor(s.rng() * (W - 2));
      s.antIn = i;
      any = true;
      ev(s, 'antin', cellX(i), cellY(i), '영차!', '#ffe0c8', s.t + ANT_T);
      see(s, 'antin', '🐜 개미가 맨 아랫줄 음식을 머리에 이고 한 칸씩 올라와요');
      setMood(s, 'go');
    }
  }
  if (empt) s.needFall = true;
  return any;
}

function afterAnt(s: PicState) {
  s.antMv = [];
  s.antIn = -1;
  if (s.needFall) {
    s.needFall = false;
    s.prefer = [];
    return afterPop(s);
  }
  startWave(s);
}

function envTurn(s: PicState) {
  const d = STAGES[s.stage];
  if (d.rain) {
    s.cloud += s.cloudDir;
    if (s.cloud <= 0 || s.cloud >= W - 3) (s.cloud = Math.max(0, Math.min(W - 3, s.cloud))), (s.cloudDir *= -1);
    if (s.sel >= 0 && isWet(s, s.sel)) s.sel = -1;
  }
  if (d.wind) {
    s.windIn--;
    if (s.windIn <= 0) {
      s.gdir = s.windNext;
      s.windI++;
      s.windNext = [0, 2, 0, 1][s.windI % 4];
      s.windIn = d.wind;
      ev(s, 'wind', 0.5, GY + CS * 4, s.gdir === 0 ? '바람이 멎었다' : s.gdir === 1 ? '← 휘잉~' : '휘잉~ →', '#e8ffd8');
      if (s.gdir) see(s, 'windblow', '🍃 휘잉~ 이제 음식이 바람 쪽으로 떨어져요');
    }
  }
}

function shuffleBoard(s: PicState) {
  const B = s.B, cells: number[] = [];
  for (let i = 0; i < N; i++) if (isFood(B.g[i])) cells.push(i);
  const vals = cells.map((i) => B.g[i]), perm = cells.map((_, k) => k);
  for (let k = 0; k < 80; k++) {
    for (let a = perm.length - 1; a > 0; a--) {
      const b = Math.floor(s.rng() * (a + 1));
      [perm[a], perm[b]] = [perm[b], perm[a]];
    }
    cells.forEach((i, j) => (B.g[i] = vals[perm[j]]));
    if (!findGroups(B.g).length && listMoves(B, wetM(s)).length) break;
  }
  if (findGroups(B.g).length || !listMoves(B, wetM(s)).length) {
    for (const i of cells) B.g[i] = EMPTY;
    fillFoods(B, s.foods, s.rng);
  }
  s.shuf = new Int16Array(N).fill(-1);
  cells.forEach((i, j) => (s.shuf![i] = cells[perm[j]]));
  s.phase = 'shuffle';
  s.pt = 0;
  s.sel = -1;
  ev(s, 'shuffle', 0.5, GY + CS * 4, '돗자리 털기! 탈탈', '#fff3c4');
  see(s, 'shuffle', '🧺 바꿀 게 없으면 돗자리를 탈탈 털어요');
}

function handleTap(s: PicState, x: number, y: number) {
  const i = cellAt(x, y), B = s.B;
  s.taps++;
  if (i < 0) return void (s.sel = -1);
  const v = B.g[i];
  if (s.sel < 0 || !adj(i, s.sel)) {
    if (i === s.sel) return void (s.sel = -1);
    if (v === ANT) {
      s.sel = -1;
      ev(s, 'poke', cellX(i), cellY(i), '개미는 못 바꿔요!', '#ffe0c8');
      return void setMood(s, 'huh');
    }
    if (!movable(v)) return void (s.sel = -1);
    if (isWet(s, i)) {
      s.sel = -1;
      return void ev(s, 'wet', cellX(i), cellY(i), '젖어서 꿈쩍 안 해요', '#cfe8ff');
    }
    s.sel = i;
    s.selT = s.t;
    return;
  }
  const a = s.sel;
  s.sel = -1;
  trySwap(s, a, i);
}

function animate(s: PicState) {
  if (s.phase === 'fall') {
    let moving = false;
    for (let i = 0; i < N; i++) {
      if (s.off[i] <= 0) continue;
      s.vel[i] = Math.min(VMAX, s.vel[i] + GACC);
      s.off[i] -= s.vel[i];
      if (s.off[i] <= 0) (s.off[i] = 0), (s.vel[i] = 0), (s.land[i] = s.t);
      else moving = true;
    }
    if (!moving) startWave(s);
  }
  if (s.runners.length) {
    for (const r of s.runners) if (s.t - r.t0 > 8) (r.x += r.vx), (r.y += r.vy), (r.vx *= 1.06), (r.vy += 0.0009);
    s.runners = s.runners.filter((r) => s.t - r.t0 < 90);
  }
  if (s.thieves.length) s.thieves = s.thieves.filter((r) => s.t - r.t0 < 110);
  if (s.fly.length) s.fly = s.fly.filter((f) => s.t < f.t0 + 30);
  if (s.lines.length) s.lines = s.lines.filter((l) => s.t - l.t0 < 24);
  if (s.tumble.length) s.tumble = s.tumble.filter((l) => s.t - l.t0 < 50);
  for (const f of s.fly) if (s.t === f.t0 + 29) s.bump[f.gi] = s.t;
}

export const picnicswap: GameDef<PicState> = {
  id: 'picnicswap',
  name: '소풍 바구니 바꾸기',
  genes: ['match3', 'pointer', 'combo'],
  twist: '개미 떼가 줄지어 와서 음식을 머리에 이고 돗자리를 한 칸씩 기어올라 바구니를 노린다 — 개미 옆을 냠! 지우면 깜짝 놀라 음식을 떨구고 도망가고, 개미 밑을 지우면 데굴데굴 굴러떨어져서, 같은 3매치가 쫓을지·굴릴지·연쇄를 노릴지의 수가 된다',
  rules: ['이웃한 음식 둘을 톡톡 → 자리를 바꾼다.', '같은 음식 셋 이상이 이어지면 냠! 사라지고 위에서 떨어져 채워진다.'],
  controls: 'touch',
  hint: '음식을 톡 → 이웃 음식을 톡 / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '공원 소풍 돗자리 디오라마',
    mood: '햇살 드는 공원 잔디 위 빨간 체크 돗자리 — 나뭇잎 그림자가 일렁이고, 딸기·샌드위치·주먹밥·포도·쿠키·우유병이 통통 튀며 떨어진다. 가장자리 개미굴에서 개미 떼가 줄지어 와 음식을 머리에 이고 기어오르고, 바구니 옆 강아지가 구경한다.',
    palette: { bg: '#7cc95a', ink: '#2a2015', muted: '#6b5a44', accent: '#e8414f', hot: '#ff5a4f', soft: '#fff6e6' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'idle', pt: 0,
      foods: [], gdir: 0, fdir: 0, off: new Float32Array(N), vel: new Float32Array(N), land: new Int32Array(N).fill(-99),
      sel: -1, selT: 0, down: false, ax: 0, ay: 0, idleT: 0, taps: 0, swaps: 0, tried: 0,
      sw: null, prefer: [], forced: [], wave: 0, turnStage: 0, hold: 0, chainN: 0,
      moves: 0, got: [], scared: 0, stolen: 0, madeK: 0, madeM: 0, usedM: 0, usedK: 0, maxWave: 0, iceLeft: 0, ice0: 0,
      antNext: 0, antLeft: 0, antCol: 3, turnN: 0, needFall: false,
      cloud: 0, cloudDir: 1, windIn: 0, windNext: 1, windI: 0, hint: null,
      hearts: 3, stars: 0, gotSt: 0, pts: 0, ok: false, why: '', won: false, dead: false, tries: 0,
      seen: new Set<string>(), tips: new Set<string>(), events: [], news: null, newsQ: [], startT: 0, clearT: 0,
      pops: [], lines: [], antMv: [], antIn: -1, shuf: null, tumble: [], fly: [], runners: [], thieves: [],
      mood: 'sleep', moodT: 0, dog: 'idle', dogT: 0, bump: [-99, -99, -99],
    } as unknown as PicState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    const p = inp.pointer ?? null, tap = !!p && !s.down;
    if (p) (s.ax = p.x), (s.ay = p.y);
    s.down = !!p;
    s.t++;
    s.pt++;
    if (s.newsQ.length && (!s.news || s.t - s.news.t > NEWS_T)) s.news = { text: s.newsQ.shift()!, t: s.t };
    if (s.events.length > 60 || (s.events.length && s.t - s.events[0].t > 200)) s.events = s.events.filter((e) => s.t - e.t < 200);
    if (s.mood !== 'idle' && s.mood !== 'sleep' && s.t - s.moodT > (s.mood === 'smug' || s.mood === 'stomp' ? 160 : 70)) s.mood = STAGES[s.stage].ants ? 'idle' : 'sleep';
    if (s.dog !== 'idle' && s.t - s.dogT > 90) s.dog = 'idle';
    animate(s);
    switch (s.phase) {
      case 'result':
        if (s.pt >= (s.ok ? RESULT_OK : RESULT_FAIL)) {
          if (s.ok) {
            if (s.won) s.dead = true;
            else s.stage++, newStage(s);
          } else if (s.hearts <= 0) s.dead = true;
          else newStage(s);
        }
        return;
      case 'settle':
        if (s.pt >= (s.ok ? SETTLE_OK : SETTLE_FAIL)) finish(s);
        return;
      case 'swap':
        if (s.pt >= SWAP_T) (s.sw = null), startWave(s);
        return;
      case 'back':
        if (s.pt >= BACK_T) (s.sw = null), (s.phase = 'idle'), (s.idleT = s.t);
        return;
      case 'pop':
        if (s.pt >= POP_T + s.hold) afterPop(s);
        return;
      case 'ant':
        if (s.pt >= ANT_T) afterAnt(s);
        return;
      case 'shuffle':
        if (s.pt >= SHUF_T) (s.shuf = null), (s.phase = 'idle'), (s.idleT = s.t);
        return;
      case 'idle':
        if (tap) handleTap(s, p!.x, p!.y * A);
        return;
      default:
        return;
    }
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
/** 바꾸기 결과의 값: 목표에 보탬 · 개미 위협 · 특별 음식 · 아래쪽(연쇄). need = 목표마다 남은 양 */
function valueOf(s: PicState, need: number[], o: Out): number {
  const d = STAGES[s.stage];
  let v = 0, all = true;
  d.goals.forEach((G, k) => {
    let gain = 0, wt = 10;
    if (G.k === 'food') gain = o.foods[G.f!];
    else if (G.k === 'ice') (gain = o.cracked), (wt = 9);
    else if (G.k === 'ant') (gain = o.scared), (wt = 18);
    else if (G.k === 'kim') (gain = o.madeK), (wt = 34);
    else (gain = o.usedM), (wt = 34);
    v += Math.min(gain, need[k]) * wt + Math.max(0, gain - need[k]) * 0.4;
    if (gain < need[k]) all = false;
  });
  if (all) {
    // 별 셋을 노릴 수 있으면(바꾸기가 넉넉하면) 도전을 채우고 끝낸다 — 잘하는 사람이 하는 일
    const x = d.s3, slack = s.moves - 1 - d.R;
    const s3after = x.k === 'wave' ? Math.max(s.maxWave, o.waves) >= x.n : x.k === 'nosteal' ? s.stolen === 0 : x.k === 'usek' ? s.usedK + o.usedK >= x.n : x.k === 'melon' ? s.usedM + o.usedM >= x.n : s.madeK + o.madeK >= x.n;
    v += s3after || slack < 2 ? 5000 : 40;
  }
  if (d.s3.k === 'wave' && s.maxWave < d.s3.n && o.waves >= d.s3.n) v += 18;
  if (d.s3.k === 'usek' && s.usedK < d.s3.n) v += o.usedK * 22 + o.madeK * 8;
  if (d.s3.k === 'melon' && s.usedM < d.s3.n) v += o.usedM * 20 + o.madeM * 8;
  if (!d.goals.some((G) => G.k === 'ant')) v += o.scared * 14;
  if (!d.goals.some((G) => G.k === 'kim')) v += o.madeK * 6;
  v += o.madeM * (d.goals.some((G) => G.k === 'melon') ? 16 : 9);
  v += (o.waves - 1) * 2 + o.low * 0.35;
  for (let i = 0; i < N; i++) {
    if (o.B.g[i] !== ANT) continue;
    const r = rowOf(i);
    v -= r === 0 ? 26 : r === 1 ? 9 : r === 2 ? 3 : 0;
  }
  return v;
}
const gainOf = (G: Goal, o: Out) => (G.k === 'food' ? o.foods[G.f!] : G.k === 'ice' ? o.cracked : G.k === 'ant' ? o.scared : G.k === 'kim' ? o.madeK : o.usedM);
/** 잘하는 수: 모든 짝을 끝까지 시뮬레이션해 값을 매기고, 위 5개는 한 수 더 내다본다(새로 떨어질 음식은 모름) */
export function planSmart(s: PicState): [number, number] | null {
  const d = STAGES[s.stage], wm = wetM(s);
  const need = d.goals.map((G, k) => Math.max(0, needOf(s, G) - progOf(s, G, k)));
  const c1 = listMoves(s.B, wm).map(([a, b]) => {
    const o = simSwap(s.B, a, b, s.gdir);
    return { m: [a, b] as [number, number], o, v: valueOf(s, need, o) };
  });
  if (!c1.length) return null;
  c1.sort((x, y) => y.v - x.v);
  for (const c of c1.slice(0, 5)) {
    if (c.v >= 5000) continue;
    const need2 = d.goals.map((G, k) => Math.max(0, need[k] - gainOf(G, c.o)));
    let b2 = 0;
    for (const [a, b] of listMoves(c.o.B, wm)) b2 = Math.max(b2, valueOf(s, need2, simSwap(c.o.B, a, b, s.gdir)));
    c.v += 0.6 * b2;
  }
  let best = c1[0];
  for (const c of c1) if (c.v > best.v) best = c;
  return best.m;
}
/** 버릇: 왼쪽 위부터 훑어 가장 먼저 찾은 매치 (특별 음식은 매치가 없을 때만) */
export function planHabit(s: PicState): [number, number] | null {
  const mv = listMoves(s.B, wetM(s));
  const g = s.B.g;
  return mv.find(([a, b]) => !isSp(g[a]) && !isSp(g[b])) ?? mv[0] ?? null;
}

const NO: Input = { tap: false, dir: 0, pointer: null };
const press = (i: number): Input => ({ tap: false, dir: 0, pointer: { x: cellX(i), y: cellY(i) / A } });
function botAct(s: PicState, plan: (s: PicState) => [number, number] | null, memo: WeakMap<object, { key: string; m: [number, number] | null }>, think: number): Input {
  if (s.phase !== 'idle' || s.down || s.t - s.idleT < think || s.t - s.startT < 40) return NO;
  const key = `${s.stage}:${s.tries}:${s.swaps}:${s.tried}`;
  let m = memo.get(s);
  if (!m || m.key !== key) memo.set(s, (m = { key, m: plan(s) }));
  if (!m.m) return NO;
  const [a, b] = m.m;
  if (s.sel === a) return press(b);
  if (s.sel >= 0) return press(s.sel);
  return press(a);
}
const smartMemo = new WeakMap<object, { key: string; m: [number, number] | null }>();
const habitMemo = new WeakMap<object, { key: string; m: [number, number] | null }>();
/** 봇: 바꿀 수 있는 짝을 전부 끝까지 시뮬레이션(새로 떨어질 음식은 모름)해 목표·개미·특별 음식·연쇄를 따져 고른다 */
export const picnicswapSmart: Bot<PicState> = { name: '소풍 고수', act: (s) => botAct(s, planSmart, smartMemo, 30) };
/** 버릇 봇(측정용): 왼쪽 위부터 가장 먼저 찾은 매치 */
export const picnicswapHabit: Bot<PicState> = { name: '버릇: 먼저 보인 매치', act: (s) => botAct(s, planHabit, habitMemo, 30) };

const dumbAt = new WeakMap<object, { next: number; until: number; p: { x: number; y: number }; pend: number }>();
/** 봇: 아무 때나 아무 음식이나 톡, 그다음 아무 이웃이나 톡 (가끔은 눈에 띈 매치 아무거나) */
export const picnicswapRandom: Bot<PicState> = {
  name: '아무 데나 톡톡',
  act(s, rng) {
    let m = dumbAt.get(s);
    if (!m) dumbAt.set(s, (m = { next: 20 + Math.floor(rng() * 60), until: -1, p: { x: 0, y: 0 }, pend: -1 }));
    if (s.t < m.until) return { tap: false, dir: 0, pointer: m.p };
    if (s.t < m.next) return NO;
    m.next = s.t + 18 + Math.floor(rng() * 70);
    m.until = s.t + 2 + Math.floor(rng() * 4);
    let i: number;
    if (s.sel < 0) {
      const mv = s.phase === 'idle' && rng() < 0.6 ? listMoves(s.B, wetM(s)) : [];
      if (mv.length) {
        const pk = mv[Math.floor(rng() * mv.length)];
        i = pk[0];
        m.pend = pk[1];
      } else i = Math.floor(rng() * N);
    } else {
      if (m.pend >= 0 && adj(m.pend, s.sel) && rng() < 0.9) i = m.pend;
      else {
        const nb = [s.sel - 1, s.sel + 1, s.sel - W, s.sel + W].filter((j) => j >= 0 && j < N && adj(j, s.sel));
        i = rng() < 0.85 ? nb[Math.floor(rng() * nb.length)] : Math.floor(rng() * N);
      }
      m.pend = -1;
    }
    m.p = { x: cellX(i) + (rng() - 0.5) * CS * 0.5, y: (cellY(i) + (rng() - 0.5) * CS * 0.5) / A };
    return { tap: false, dir: 0, pointer: m.p };
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
const TAU = Math.PI * 2;
const hsh = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const ease = (q: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, q)), 2.2);
const FOOD_COL = ['#ff4d64', '#f2c46b', '#ffffff', '#a66be8', '#c98a45', '#8cc4ff'];
type XF = (v: number) => number;
const SEEDS = [[-0.42, -0.25], [0, -0.32], [0.42, -0.25], [-0.5, 0.1], [-0.18, 0.05], [0.18, 0.05], [0.5, 0.1], [-0.22, 0.42], [0.22, 0.42], [0, 0.68]];
const GRAPES = [[-0.4, -0.3], [0, -0.36], [0.4, -0.3], [-0.2, 0.06], [0.2, 0.06], [0, 0.44]];
const CHIPS = [[-0.32, -0.15], [0.25, -0.3], [0.3, 0.22], [-0.2, 0.32], [0.02, 0.02]];

/** 음식 하나 (r = 반지름 px) — 색과 모양이 다 달라 색약도 구별 */
function drawFood(ctx: CanvasRenderingContext2D, f: number, x: number, y: number, r: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const lw = Math.max(1, r * 0.08);
  if (f === 0) {
    // 딸기
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.15, r * 0.1, 0, r * 0.1, r * 1.05);
    g.addColorStop(0, '#ff9aa6');
    g.addColorStop(0.45, '#f0364d');
    g.addColorStop(1, '#b0122c');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, r * 0.95);
    ctx.bezierCurveTo(-r * 0.62, r * 0.72, -r * 1.0, r * 0.05, -r * 0.82, -r * 0.42);
    ctx.bezierCurveTo(-r * 0.62, -r * 0.8, -r * 0.18, -r * 0.72, 0, -r * 0.6);
    ctx.bezierCurveTo(r * 0.18, -r * 0.72, r * 0.62, -r * 0.8, r * 0.82, -r * 0.42);
    ctx.bezierCurveTo(r * 1.0, r * 0.05, r * 0.62, r * 0.72, 0, r * 0.95);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#7d0a1e';
    ctx.lineWidth = lw;
    ctx.stroke();
    ctx.fillStyle = '#ffe9a6';
    for (const [sx, sy] of SEEDS) (ctx.beginPath(), ctx.ellipse(sx * r, sy * r, r * 0.05, r * 0.08, sx * 0.4, 0, TAU), ctx.fill());
    ctx.fillStyle = '#3aa64a';
    for (let k = 0; k < 5; k++) {
      const a = Math.PI + (k / 4) * Math.PI;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * r * 0.3, -r * 0.6 - Math.sin(a) * r * 0.1, r * 0.28, r * 0.11, a, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#2b7a35';
    ctx.fillRect(-r * 0.06, -r * 0.98, r * 0.12, r * 0.34);
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.45, -r * 0.15, r * 0.11, r * 0.24, 0.4, 0, TAU);
    ctx.fill();
  } else if (f === 1) {
    // 샌드위치: 세모 단면에 빵·치즈·토마토·상추 층
    const tri = () => {
      ctx.beginPath();
      ctx.moveTo(-r * 0.98, r * 0.78);
      ctx.lineTo(r * 0.98, r * 0.78);
      ctx.lineTo(r * 0.05, -r * 0.92);
      ctx.closePath();
    };
    ctx.fillStyle = '#c98a3d';
    ctx.save();
    ctx.translate(r * 0.08, r * 0.1);
    tri();
    ctx.fill();
    ctx.restore();
    tri();
    ctx.fillStyle = '#fbe6b8';
    ctx.fill();
    ctx.save();
    tri();
    ctx.clip();
    const band = (y0: number, y1: number, c: string, wave = 0) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(-r, y0 * r);
      for (let k = 0; k <= 8; k++) ctx.lineTo(-r + (k / 8) * 2 * r, y0 * r + (wave ? Math.sin(k * 1.9) * wave * r : 0));
      ctx.lineTo(r, y1 * r);
      ctx.lineTo(-r, y1 * r);
      ctx.closePath();
      ctx.fill();
    };
    band(0.02, 0.2, '#ffd23a');
    band(0.18, 0.36, '#ef4b3c');
    band(0.34, 0.5, '#5cc25a', 0.05);
    band(0.5, 0.8, '#f8e2b0');
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.fillRect(-r, -r, r * 2, r * 0.25);
    ctx.restore();
    tri();
    ctx.strokeStyle = '#a5651f';
    ctx.lineWidth = lw * 1.4;
    ctx.stroke();
  } else if (f === 2) {
    // 주먹밥
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.92);
      ctx.quadraticCurveTo(r * 0.28, -r * 0.88, r * 0.62, -r * 0.2);
      ctx.quadraticCurveTo(r * 1.02, r * 0.55, r * 0.7, r * 0.82);
      ctx.quadraticCurveTo(0, r * 1.02, -r * 0.7, r * 0.82);
      ctx.quadraticCurveTo(-r * 1.02, r * 0.55, -r * 0.62, -r * 0.2);
      ctx.quadraticCurveTo(-r * 0.28, -r * 0.88, 0, -r * 0.92);
      ctx.closePath();
    };
    const g = ctx.createRadialGradient(-r * 0.25, -r * 0.3, r * 0.1, 0, r * 0.1, r * 1.1);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.7, '#f1f1ea');
    g.addColorStop(1, '#c9cbbf');
    path();
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = '#8f9286';
    ctx.lineWidth = lw;
    ctx.stroke();
    ctx.fillStyle = '#18241c';
    ctx.beginPath();
    ctx.roundRect(-r * 0.34, r * 0.18, r * 0.68, r * 0.74, r * 0.06);
    ctx.fill();
    ctx.fillStyle = 'rgba(120,170,130,.35)';
    ctx.fillRect(-r * 0.3, r * 0.24, r * 0.08, r * 0.6);
    ctx.fillStyle = '#e8e2c8';
    ctx.beginPath();
    ctx.ellipse(-r * 0.3, -r * 0.2, r * 0.05, r * 0.08, 0.6, 0, TAU);
    ctx.ellipse(r * 0.25, -r * 0.35, r * 0.05, r * 0.08, -0.5, 0, TAU);
    ctx.fill();
  } else if (f === 3) {
    // 포도
    ctx.strokeStyle = '#6b4a2a';
    ctx.lineWidth = lw * 1.4;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.6);
    ctx.quadraticCurveTo(r * 0.05, -r * 0.85, r * 0.2, -r * 0.98);
    ctx.stroke();
    ctx.fillStyle = '#56b04a';
    ctx.beginPath();
    ctx.ellipse(r * 0.38, -r * 0.82, r * 0.26, r * 0.13, -0.5, 0, TAU);
    ctx.fill();
    for (const [gx, gy] of GRAPES) {
      const g = ctx.createRadialGradient(gx * r - r * 0.1, gy * r - r * 0.1, r * 0.03, gx * r, gy * r, r * 0.32);
      g.addColorStop(0, '#d8a8ff');
      g.addColorStop(0.5, '#8d4fd6');
      g.addColorStop(1, '#4e2391');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(gx * r, gy * r, r * 0.3, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#3a1670';
      ctx.lineWidth = Math.max(0.8, lw * 0.7);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.6)';
      ctx.beginPath();
      ctx.arc(gx * r - r * 0.1, gy * r - r * 0.1, r * 0.07, 0, TAU);
      ctx.fill();
    }
  } else if (f === 4) {
    // 쿠키 (두께 + 초코칩)
    ctx.fillStyle = '#8f5622';
    ctx.beginPath();
    ctx.ellipse(r * 0.03, r * 0.14, r * 0.9, r * 0.82, 0, 0, TAU);
    ctx.fill();
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r * 0.95);
    g.addColorStop(0, '#f7cf8a');
    g.addColorStop(0.7, '#dc9a4f');
    g.addColorStop(1, '#b8732f');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.86, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#8a5320';
    ctx.lineWidth = lw;
    ctx.stroke();
    ctx.fillStyle = '#4a2814';
    for (const [cx, cy] of CHIPS) (ctx.beginPath(), ctx.ellipse(cx * r, cy * r, r * 0.13, r * 0.1, cx * 2, 0, TAU), ctx.fill());
    ctx.fillStyle = 'rgba(255,240,210,.5)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.35, -r * 0.42, r * 0.2, r * 0.08, -0.6, 0, TAU);
    ctx.fill();
  } else if (f === 5) {
    // 우유병
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(-r * 0.26, -r * 0.72);
      ctx.lineTo(-r * 0.26, -r * 0.5);
      ctx.quadraticCurveTo(-r * 0.56, -r * 0.36, -r * 0.56, -r * 0.08);
      ctx.lineTo(-r * 0.56, r * 0.78);
      ctx.quadraticCurveTo(-r * 0.56, r * 0.96, -r * 0.38, r * 0.96);
      ctx.lineTo(r * 0.38, r * 0.96);
      ctx.quadraticCurveTo(r * 0.56, r * 0.96, r * 0.56, r * 0.78);
      ctx.lineTo(r * 0.56, -r * 0.08);
      ctx.quadraticCurveTo(r * 0.56, -r * 0.36, r * 0.26, -r * 0.5);
      ctx.lineTo(r * 0.26, -r * 0.72);
      ctx.closePath();
    };
    const g = ctx.createLinearGradient(-r * 0.56, 0, r * 0.56, 0);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.6, '#f2f7fc');
    g.addColorStop(1, '#c4d7ea');
    path();
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = '#6f8fae';
    ctx.lineWidth = lw;
    ctx.stroke();
    ctx.fillStyle = '#2f6fd6';
    ctx.beginPath();
    ctx.roundRect(-r * 0.56, r * 0.06, r * 1.12, r * 0.44, r * 0.04);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-r * 0.1, r * 0.28, r * 0.14, r * 0.1, 0, 0, TAU);
    ctx.ellipse(r * 0.22, r * 0.22, r * 0.08, r * 0.07, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#1e5bc2';
    ctx.beginPath();
    ctx.roundRect(-r * 0.32, -r * 0.98, r * 0.64, r * 0.3, r * 0.08);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.fillRect(-r * 0.42, -r * 0.1, r * 0.1, r * 0.75);
  }
  ctx.restore();
}

/** 특별 음식: 김밥(가로·세로 줄 지우기) · 수박 폭탄 */
function drawSpecial(ctx: CanvasRenderingContext2D, sp: number, x: number, y: number, r: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  const pulse = 0.5 + 0.5 * Math.sin(t * 0.15);
  ctx.strokeStyle = `rgba(255,255,220,${0.35 + 0.35 * pulse})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, r * (1.02 + 0.06 * pulse), 0, TAU);
  ctx.stroke();
  if (sp === MELON) {
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r * 0.95);
    g.addColorStop(0, '#9be884');
    g.addColorStop(0.6, '#3f9e45');
    g.addColorStop(1, '#22672b');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, r * 0.05, r * 0.9, r * 0.84, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#17491d';
    ctx.lineWidth = Math.max(1.5, r * 0.12);
    for (let k = -2; k <= 2; k++) {
      ctx.beginPath();
      for (let j = 0; j <= 8; j++) {
        const yy = -r * 0.75 + (j / 8) * r * 1.6, xx = k * r * 0.34 * Math.cos((yy / r) * 0.9) + Math.sin(j * 1.7) * r * 0.05;
        if (j) ctx.lineTo(xx, yy);
        else ctx.moveTo(xx, yy);
      }
      ctx.stroke();
    }
    // 잘린 조각 (빨간 속 + 씨)
    ctx.fillStyle = '#ff4f6a';
    ctx.beginPath();
    ctx.moveTo(r * 0.05, -r * 0.05);
    ctx.arc(r * 0.05, -r * 0.05, r * 0.62, -1.2, -0.25);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#f6fbe8';
    ctx.lineWidth = Math.max(1.5, r * 0.09);
    ctx.beginPath();
    ctx.arc(r * 0.05, -r * 0.05, r * 0.62, -1.2, -0.25);
    ctx.stroke();
    ctx.fillStyle = '#1b1b1b';
    for (const [a, d] of [[-0.95, 0.4], [-0.6, 0.45], [-0.75, 0.25]]) (ctx.beginPath(), ctx.ellipse(r * 0.05 + Math.cos(a) * d * r, -r * 0.05 + Math.sin(a) * d * r, r * 0.04, r * 0.07, a, 0, TAU), ctx.fill());
    ctx.fillStyle = 'rgba(255,255,255,.45)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.42, -r * 0.35, r * 0.16, r * 0.1, -0.6, 0, TAU);
    ctx.fill();
  } else {
    if (sp === KV) ctx.rotate(Math.PI / 2);
    // 화살 (줄 방향)
    ctx.fillStyle = `rgba(255,255,255,${0.55 + 0.4 * pulse})`;
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sd * r * 1.08, 0);
      ctx.lineTo(sd * r * 0.86, -r * 0.2);
      ctx.lineTo(sd * r * 0.86, r * 0.2);
      ctx.closePath();
      ctx.fill();
    }
    const g = ctx.createLinearGradient(0, -r * 0.42, 0, r * 0.42);
    g.addColorStop(0, '#3d5446');
    g.addColorStop(0.4, '#1b2a20');
    g.addColorStop(1, '#0d1610');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(-r * 0.86, -r * 0.42, r * 1.5, r * 0.84, r * 0.4);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.fillRect(-r * 0.7, -r * 0.3, r * 1.2, r * 0.08);
    // 썬 단면
    ctx.fillStyle = '#0f1a12';
    ctx.beginPath();
    ctx.ellipse(r * 0.62, 0, r * 0.32, r * 0.44, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#fbfbf2';
    ctx.beginPath();
    ctx.ellipse(r * 0.63, 0, r * 0.26, r * 0.37, 0, 0, TAU);
    ctx.fill();
    for (const [c, dx, dy] of [['#ffd23a', 0.0, -0.17], ['#ff8a2b', -0.07, 0.08], ['#4fbf4a', 0.08, 0.1], ['#ff7aa8', 0.06, -0.03]] as const) {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.ellipse(r * (0.63 + dx), r * dy, r * 0.07, r * 0.09, 0, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** 개미: 음식을 머리에 이고 낑낑. face = go(힘줌) · panic(깜짝) · smug(우쭐) · dizzy(어질) · sleep · huh · stomp(발 동동) */
function drawAnt(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, t: number, o: { carry?: number; face: string; walk: number; rot?: number; flag?: boolean; cheeks?: boolean }) {
  ctx.save();
  ctx.translate(x, y);
  if (o.rot) ctx.rotate(o.rot);
  const lw = Math.max(1.2, u * 0.08);
  ctx.lineCap = 'round';
  // 다리 3쌍
  ctx.strokeStyle = '#2a170e';
  ctx.lineWidth = lw;
  for (const sd of [-1, 1])
    for (let k = 0; k < 3; k++) {
      const ph = Math.sin(o.walk + k * 2.1 + (sd > 0 ? Math.PI : 0)) * u * 0.1;
      ctx.beginPath();
      ctx.moveTo(sd * u * 0.12, u * 0.28 + k * u * 0.08);
      ctx.quadraticCurveTo(sd * u * 0.5, u * 0.2 + k * u * 0.14 + ph, sd * u * 0.58, u * 0.62 + k * u * 0.1 + ph);
      ctx.stroke();
    }
  // 배 · 가슴
  const g = ctx.createRadialGradient(-u * 0.12, u * 0.5, u * 0.05, 0, u * 0.6, u * 0.42);
  g.addColorStop(0, '#8a5a40');
  g.addColorStop(1, '#3a2016');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, u * 0.66, u * 0.34, u * 0.3, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#4a2a1c';
  ctx.beginPath();
  ctx.ellipse(0, u * 0.28, u * 0.17, u * 0.15, 0, 0, TAU);
  ctx.fill();
  // 팔: 음식을 이고 있으면 위로, 아니면 face에 따라
  const up = o.carry !== undefined && o.carry >= 0;
  ctx.strokeStyle = '#2a170e';
  ctx.lineWidth = lw * 1.1;
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sd * u * 0.14, u * 0.22);
    if (up) ctx.lineTo(sd * u * 0.34, -u * 0.5);
    else if (o.face === 'panic' || o.face === 'stomp') ctx.lineTo(sd * u * 0.48, -u * 0.3 + Math.sin(t * 0.6 + sd) * u * 0.08);
    else if (o.face === 'smug') ctx.lineTo(sd * u * 0.45, -u * 0.25);
    else ctx.lineTo(sd * u * 0.38, u * 0.42);
    ctx.stroke();
  }
  // 머리
  const hy = -u * 0.06;
  const hg = ctx.createRadialGradient(-u * 0.12, hy - u * 0.12, u * 0.04, 0, hy, u * 0.36);
  hg.addColorStop(0, '#8e5c42');
  hg.addColorStop(1, '#3d2318');
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.arc(0, hy, u * 0.34, 0, TAU);
  ctx.fill();
  // 더듬이
  ctx.strokeStyle = '#2a170e';
  ctx.lineWidth = lw * 0.9;
  for (const sd of [-1, 1]) {
    const wob = Math.sin(t * 0.2 + sd) * u * 0.05;
    ctx.beginPath();
    ctx.moveTo(sd * u * 0.12, hy - u * 0.3);
    ctx.quadraticCurveTo(sd * u * 0.2, hy - u * 0.6, sd * u * 0.36 + wob, hy - u * 0.56);
    ctx.stroke();
    ctx.fillStyle = '#2a170e';
    ctx.beginPath();
    ctx.arc(sd * u * 0.36 + wob, hy - u * 0.56, u * 0.05, 0, TAU);
    ctx.fill();
  }
  // 눈
  const ey = hy - u * 0.02;
  for (const sd of [-1, 1]) {
    const ex = sd * u * 0.14;
    if (o.face === 'smug' || o.face === 'sleep') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1.4, u * 0.07);
      ctx.beginPath();
      if (o.face === 'smug') ctx.arc(ex, ey + u * 0.03, u * 0.08, Math.PI * 1.15, Math.PI * 1.85);
      else (ctx.moveTo(ex - u * 0.08, ey), ctx.lineTo(ex + u * 0.08, ey));
      ctx.stroke();
      continue;
    }
    if (o.face === 'dizzy') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1.2, u * 0.05);
      ctx.beginPath();
      for (let a = 0; a < 9; a += 0.5) ctx.lineTo(ex + Math.cos(a + t * 0.3) * a * u * 0.011, ey + Math.sin(a + t * 0.3) * a * u * 0.011);
      ctx.stroke();
      continue;
    }
    const big = o.face === 'panic' || o.face === 'huh' ? 1.25 : 1;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(ex, ey, u * 0.11 * big, u * 0.13 * big, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#1a0f08';
    ctx.beginPath();
    ctx.arc(ex + (o.face === 'go' ? sd * -u * 0.02 : 0), ey - (o.face === 'go' ? u * 0.03 : 0), u * 0.055 * (o.face === 'panic' ? 0.7 : 1), 0, TAU);
    ctx.fill();
    if (o.face === 'go' || o.face === 'stomp') {
      // 힘준 눈썹
      ctx.strokeStyle = '#1a0f08';
      ctx.lineWidth = Math.max(1.2, u * 0.06);
      ctx.beginPath();
      ctx.moveTo(ex - sd * u * 0.12, ey - u * 0.18);
      ctx.lineTo(ex + sd * u * 0.06, ey - u * 0.12);
      ctx.stroke();
    }
  }
  // 입
  ctx.strokeStyle = '#f3d2b8';
  ctx.lineWidth = Math.max(1, u * 0.05);
  ctx.beginPath();
  if (o.face === 'panic' || o.face === 'huh') (ctx.fillStyle = '#2a0f08'), ctx.ellipse(0, hy + u * 0.17, u * 0.06, u * 0.08, 0, 0, TAU), ctx.fill();
  else if (o.face === 'smug') ctx.arc(0, hy + u * 0.1, u * 0.1, 0.2, Math.PI - 0.2);
  else if (o.face === 'go') (ctx.moveTo(-u * 0.07, hy + u * 0.18), ctx.lineTo(u * 0.07, hy + u * 0.16));
  else ctx.arc(0, hy + u * 0.12, u * 0.06, 0.3, Math.PI - 0.3);
  ctx.stroke();
  if (o.cheeks || o.face === 'smug') {
    ctx.fillStyle = 'rgba(255,120,120,.45)';
    for (const sd of [-1, 1]) (ctx.beginPath(), ctx.ellipse(sd * u * 0.22, hy + u * 0.1, u * 0.06, u * 0.04, 0, 0, TAU), ctx.fill());
  }
  // 땀방울
  if (o.face === 'panic' || o.face === 'go') {
    ctx.fillStyle = 'rgba(160,215,255,.95)';
    const sy = o.face === 'go' ? Math.sin(t * 0.1) * u * 0.05 : 0;
    ctx.beginPath();
    ctx.ellipse(u * 0.36, hy - u * 0.2 + sy, u * 0.05, u * 0.08, 0.3, 0, TAU);
    ctx.fill();
  }
  // 대장 깃발
  if (o.flag) {
    ctx.strokeStyle = '#6b4a2a';
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(u * 0.45, u * 0.5);
    ctx.lineTo(u * 0.45, -u * 0.95);
    ctx.stroke();
    ctx.fillStyle = '#e8414f';
    ctx.beginPath();
    ctx.moveTo(u * 0.45, -u * 0.95);
    ctx.quadraticCurveTo(u * 0.75, -u * 0.85 + Math.sin(t * 0.2) * u * 0.06, u * 0.95, -u * 0.82);
    ctx.lineTo(u * 0.45, -u * 0.6);
    ctx.closePath();
    ctx.fill();
  }
  // 이고 있는 음식
  if (up) {
    const wob = Math.sin(o.walk * 0.5) * 0.08;
    ctx.save();
    ctx.translate(0, -u * 0.72);
    ctx.rotate(wob);
    drawFood(ctx, o.carry!, 0, 0, u * 0.42);
    ctx.restore();
  }
  ctx.restore();
}

/** 강아지 구경꾼 */
function drawDog(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, s: PicState, t: number) {
  const m = s.dog, age = t - s.dogT;
  const hop = m === 'wag' ? Math.abs(Math.sin(age * 0.2)) * u * 0.25 : m === 'bark' ? Math.max(0, Math.sin(Math.min(1, age / 10) * Math.PI)) * u * 0.18 : 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,.22)';
  ctx.beginPath();
  ctx.ellipse(0, u * 0.05, u * 0.62, u * 0.12, 0, 0, TAU);
  ctx.fill();
  ctx.translate(0, -hop);
  // 꼬리
  const wag = Math.sin(t * (m === 'wag' ? 0.8 : 0.12)) * (m === 'sad' ? 0.1 : 0.5);
  ctx.strokeStyle = '#c9965a';
  ctx.lineWidth = Math.max(2, u * 0.14);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(u * 0.42, -u * 0.25);
  ctx.quadraticCurveTo(u * 0.7, -u * 0.5 - wag * u * 0.3, u * 0.62 + wag * u * 0.3, -u * 0.75);
  ctx.stroke();
  // 몸
  ctx.fillStyle = '#e9c48f';
  ctx.beginPath();
  ctx.ellipse(u * 0.1, -u * 0.22, u * 0.42, u * 0.26, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fff3dc';
  ctx.beginPath();
  ctx.ellipse(-u * 0.1, -u * 0.12, u * 0.2, u * 0.13, 0, 0, TAU);
  ctx.fill();
  // 다리
  ctx.fillStyle = '#e9c48f';
  for (const lx of [-0.18, 0.02, 0.28, 0.4]) (ctx.beginPath(), ctx.roundRect(lx * u, -u * 0.08, u * 0.1, u * 0.12, u * 0.04), ctx.fill());
  // 머리
  const hx = -u * 0.3, hy = -u * 0.55;
  ctx.fillStyle = '#e9c48f';
  ctx.beginPath();
  ctx.arc(hx, hy, u * 0.3, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#a8703c';
  const ear = m === 'sad' ? 0.5 : m === 'bark' || m === 'wow' ? -0.5 : 0;
  for (const sd of [-1, 1]) {
    ctx.save();
    ctx.translate(hx + sd * u * 0.24, hy - u * 0.16);
    ctx.rotate(sd * (0.4 + ear * 0.6));
    ctx.beginPath();
    ctx.ellipse(0, u * 0.12, u * 0.09, u * 0.2, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = '#fff3dc';
  ctx.beginPath();
  ctx.ellipse(hx - u * 0.04, hy + u * 0.12, u * 0.17, u * 0.12, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#2a1a10';
  ctx.beginPath();
  ctx.ellipse(hx - u * 0.06, hy + u * 0.06, u * 0.06, u * 0.045, 0, 0, TAU);
  ctx.fill();
  for (const sd of [-1, 1]) {
    const ex = hx + sd * u * 0.11 - u * 0.03, ey = hy - u * 0.06;
    if (m === 'wag') {
      ctx.strokeStyle = '#2a1a10';
      ctx.lineWidth = Math.max(1.4, u * 0.05);
      ctx.beginPath();
      ctx.arc(ex, ey + u * 0.02, u * 0.05, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#2a1a10';
      ctx.beginPath();
      ctx.arc(ex, ey, u * (m === 'bark' ? 0.055 : 0.045), 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex + u * 0.015, ey - u * 0.015, u * 0.015, 0, TAU);
      ctx.fill();
    }
  }
  if (m === 'bark' || m === 'wag') {
    ctx.fillStyle = '#e8606a';
    ctx.beginPath();
    ctx.ellipse(hx - u * 0.05, hy + u * 0.24, u * 0.06, u * 0.08, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawBasket(ctx: CanvasRenderingContext2D, s: PicState, X: XF, Y: XF, R: XF, t: number) {
  const x = X(BASKET_X), y = Y(BASKET_Y), bw = R(0.17), bh = R(0.085);
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.beginPath();
  ctx.ellipse(x + R(0.008), y + bh * 0.62, bw * 0.58, bh * 0.2, 0, 0, TAU);
  ctx.fill();
  // 손잡이
  ctx.strokeStyle = '#8a5428';
  ctx.lineWidth = R(0.014);
  ctx.beginPath();
  ctx.ellipse(x, y - bh * 0.35, bw * 0.38, bh * 0.85, 0, Math.PI, TAU);
  ctx.stroke();
  // 안에 담긴 음식 (모은 만큼 수북이)
  const d = STAGES[s.stage], fs = d.goals.map((G, k) => (G.k === 'food' ? [G.f!, s.got[k]] : null)).filter(Boolean) as number[][];
  let n = 0;
  for (const [f, got] of fs) for (let k = 0; k < Math.min(3, Math.ceil(got / 4)); k++, n++) drawFood(ctx, f, x + (hsh(n + 3) - 0.5) * bw * 0.7, y - bh * 0.45 - hsh(n + 9) * bh * 0.25, R(0.024));
  // 체크 천
  ctx.fillStyle = '#f2f2f2';
  ctx.beginPath();
  ctx.moveTo(x - bw * 0.5, y - bh * 0.4);
  ctx.lineTo(x - bw * 0.15, y - bh * 0.62);
  ctx.lineTo(x + bw * 0.05, y - bh * 0.38);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e8414f';
  for (let k = 0; k < 3; k++) ctx.fillRect(x - bw * 0.4 + k * bw * 0.12, y - bh * 0.5 + k * bh * 0.03, bw * 0.05, bh * 0.08);
  // 몸통 (짠 무늬)
  const g = ctx.createLinearGradient(0, y - bh * 0.4, 0, y + bh * 0.6);
  g.addColorStop(0, '#d9a060');
  g.addColorStop(1, '#94592b');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - bw * 0.5, y - bh * 0.4);
  ctx.lineTo(x + bw * 0.5, y - bh * 0.4);
  ctx.lineTo(x + bw * 0.42, y + bh * 0.55);
  ctx.lineTo(x - bw * 0.42, y + bh * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = 'rgba(90,50,20,.45)';
  ctx.lineWidth = 1;
  for (let k = -8; k < 12; k++) {
    ctx.beginPath();
    ctx.moveTo(x - bw * 0.6 + k * bw * 0.09, y - bh * 0.5);
    ctx.lineTo(x - bw * 0.6 + k * bw * 0.09 + bh, y + bh * 0.6);
    ctx.moveTo(x - bw * 0.6 + k * bw * 0.09 + bh, y - bh * 0.5);
    ctx.lineTo(x - bw * 0.6 + k * bw * 0.09, y + bh * 0.6);
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = '#7a4520';
  ctx.beginPath();
  ctx.roundRect(x - bw * 0.53, y - bh * 0.48, bw * 1.06, bh * 0.16, bh * 0.08);
  ctx.fill();
  // 도둑맞으면 흔들
  const shake = s.thieves.length ? Math.sin(t * 1.3) * 1.5 : 0;
  void shake;
  ctx.restore();
}

function drawScene(ctx: CanvasRenderingContext2D, s: PicState, X: XF, Y: XF, R: XF, w: number, h: number, t: number) {
  // 하늘
  const sky = ctx.createLinearGradient(0, 0, 0, Y(0.2));
  sky.addColorStop(0, '#8fd3ff');
  sky.addColorStop(1, '#dff4ff');
  ctx.fillStyle = sky;
  ctx.fillRect(-10, -10, w + 20, Y(0.2) + 10);
  // 해 · 구름
  const sun = ctx.createRadialGradient(X(0.12), Y(0.08), R(0.01), X(0.12), Y(0.08), R(0.25));
  sun.addColorStop(0, 'rgba(255,250,210,.95)');
  sun.addColorStop(0.25, 'rgba(255,240,170,.5)');
  sun.addColorStop(1, 'rgba(255,240,170,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, X(0.5), Y(0.3));
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  for (let k = 0; k < 3; k++) {
    const cx = X(((0.3 + k * 0.33 + t * 0.00012 * (k + 1)) % 1.3) - 0.15), cy = Y(0.095 + k * 0.012);
    for (const [dx, dy, rr] of [[-0.04, 0.005, 0.022], [0, -0.006, 0.03], [0.04, 0.004, 0.022]]) (ctx.beginPath(), ctx.arc(cx + R(dx), cy + R(dy), R(rr), 0, TAU), ctx.fill());
  }
  // 먼 언덕
  ctx.fillStyle = '#9ed27a';
  ctx.beginPath();
  ctx.moveTo(0, Y(0.17));
  for (let x = 0; x <= 1.01; x += 0.05) ctx.lineTo(X(x), Y(0.15 - 0.025 * Math.sin(x * 5 + 1)));
  ctx.lineTo(w, Y(0.2));
  ctx.lineTo(0, Y(0.2));
  ctx.closePath();
  ctx.fill();
  // 잔디
  const gr = ctx.createLinearGradient(0, Y(0.16), 0, h);
  gr.addColorStop(0, '#86cf5f');
  gr.addColorStop(0.5, '#6fbd4c');
  gr.addColorStop(1, '#4f9a37');
  ctx.fillStyle = gr;
  ctx.fillRect(-10, Y(0.165), w + 20, h);
  ctx.strokeStyle = 'rgba(40,100,30,.35)';
  ctx.lineWidth = 1.2;
  for (let k = 0; k < 90; k++) {
    const gx = hsh(k) * w, gy = Y(0.18) + hsh(k + 100) * (h - Y(0.18)), sw = Math.sin(t * 0.03 + k) * 1.5;
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx + sw + 1, gy - R(0.014));
    ctx.stroke();
  }
  // 나무 (왼쪽 위·오른쪽 위) + 줄기
  for (const [tx, ty, tr] of [[-0.02, 0.1, 0.12], [1.03, 0.12, 0.13]]) {
    ctx.fillStyle = '#7a5434';
    ctx.fillRect(X(tx) - R(0.018), Y(ty), R(0.036), R(0.1));
    for (const [dx, dy, rr, c] of [[0, 0, 1, '#3f8f3a'], [-0.5, 0.2, 0.7, '#4aa043'], [0.5, 0.25, 0.7, '#3a8535'], [0.1, -0.35, 0.65, '#55ad4c']] as const) {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(X(tx) + R(dx * tr) + Math.sin(t * 0.02 + dx) * 1.2, Y(ty) + R(dy * tr), R(rr * tr * 0.75), 0, TAU);
      ctx.fill();
    }
  }
  // 들꽃 (잔디 띠)
  for (let k = 0; k < 7; k++) {
    const fx0 = X(0.3 + k * 0.1 + hsh(k + 500) * 0.04), fy0 = Y(1.405 + hsh(k + 510) * 0.03);
    ctx.strokeStyle = '#3d8a2e';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(fx0, fy0 + R(0.012));
    ctx.lineTo(fx0, fy0);
    ctx.stroke();
    ctx.fillStyle = ['#ffffff', '#ffd23a', '#ff9ec0', '#b8a6ff'][k % 4];
    for (let j = 0; j < 5; j++) (ctx.beginPath(), ctx.arc(fx0 + Math.cos((j * TAU) / 5) * R(0.006), fy0 + Math.sin((j * TAU) / 5) * R(0.006), R(0.005), 0, TAU), ctx.fill());
    ctx.fillStyle = '#ffb02e';
    ctx.beginPath();
    ctx.arc(fx0, fy0, R(0.004), 0, TAU);
    ctx.fill();
  }
  // 나비 (장면 위를 팔랑)
  for (let k = 0; k < 2; k++) {
    const bx = X(0.5 + 0.42 * Math.sin(t * 0.004 + k * 2.5)), by = Y(0.15 + 0.03 * Math.sin(t * 0.011 + k) + k * 0.02), flap = Math.abs(Math.sin(t * 0.35 + k));
    ctx.fillStyle = k ? '#ffd23a' : '#ff9ec0';
    for (const sd of [-1, 1]) (ctx.beginPath(), ctx.ellipse(bx + sd * R(0.009) * flap, by, R(0.009) * flap + 1, R(0.012), sd * 0.4, 0, TAU), ctx.fill());
    ctx.fillStyle = '#4a3020';
    ctx.fillRect(bx - 1, by - R(0.008), 2, R(0.016));
  }
  drawBasket(ctx, s, X, Y, R, t);
  drawDog(ctx, X(0.915), Y(0.298), R(0.07), s, t);
  if ((s.dog === 'bark' || s.dog === 'wag') && t - s.dogT < 50) {
    ctx.font = `900 ${Math.max(13, R(0.04))}px system-ui, sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(40,60,20,.7)';
    const tx = s.dog === 'bark' ? '멍!' : '왈왈!';
    ctx.strokeText(tx, w - R(0.012), Y(0.215) - Math.sin(Math.min(1, (t - s.dogT) / 8) * Math.PI) * 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(tx, w - R(0.012), Y(0.215) - Math.sin(Math.min(1, (t - s.dogT) / 8) * Math.PI) * 3);
  }
}

/** 장면 앞쪽: 목표 칩 · 바꾸기 표지판 · 바람 깃발 (구름보다 위에) */
function drawSceneFront(ctx: CanvasRenderingContext2D, s: PicState, X: XF, Y: XF, R: XF, t: number) {
  // 목표 칩
  const d = STAGES[s.stage];
  d.goals.forEach((G, k) => {
    const cx = X(chipX(k)), cy = Y(CHIP_Y), need = needOf(s, G), left = Math.max(0, need - progOf(s, G, k));
    const bump = Math.max(0, 1 - (t - s.bump[k]) / 12), sc = 1 + bump * 0.25;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(sc, sc);
    ctx.fillStyle = 'rgba(0,0,0,.2)';
    ctx.beginPath();
    ctx.ellipse(R(0.004), R(0.032), R(0.04), R(0.012), 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = left === 0 ? '#d8f7c0' : '#fffaf0';
    ctx.beginPath();
    ctx.ellipse(0, 0, R(0.044), R(0.038), 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = left === 0 ? '#5cbf4a' : '#d9c7a6';
    ctx.lineWidth = 2;
    ctx.stroke();
    const ir = R(0.026);
    if (G.k === 'food') drawFood(ctx, G.f!, 0, 0, ir);
    else if (G.k === 'ice') drawIce(ctx, -ir, -ir, ir * 2, 1, t);
    else if (G.k === 'ant') drawAnt(ctx, 0, -ir * 0.1, ir * 0.95, t, { face: 'panic', walk: t * 0.3 });
    else drawSpecial(ctx, G.k === 'kim' ? KH : MELON, 0, 0, ir, t);
    ctx.restore();
    ctx.font = `900 ${Math.max(13, R(0.042))}px system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(30,50,20,.7)';
    const txt = left === 0 ? '✓' : String(left);
    ctx.strokeText(txt, cx + R(0.05), cy + R(0.004));
    ctx.fillStyle = left === 0 ? '#c8ffb0' : '#ffffff';
    ctx.fillText(txt, cx + R(0.05), cy + R(0.004));
  });
  // 바꾸기 표지판
  {
    const sx = X(0.765), sy = Y(0.21), sw = R(0.175), sh = R(0.112), low = s.moves <= 3 && s.phase !== 'result';
    const jig = low ? Math.sin(t * 0.5) * 1.5 : 0;
    ctx.fillStyle = '#7a5434';
    ctx.fillRect(sx - R(0.008), sy, R(0.016), R(0.085));
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.beginPath();
    ctx.ellipse(sx, sy + R(0.085), R(0.035), R(0.009), 0, 0, TAU);
    ctx.fill();
    ctx.save();
    ctx.translate(sx + jig, sy);
    ctx.fillStyle = '#8a5a30';
    ctx.beginPath();
    ctx.roundRect(-sw / 2 + 2, -sh / 2 + 3, sw, sh, R(0.012));
    ctx.fill();
    const wg = ctx.createLinearGradient(0, -sh / 2, 0, sh / 2);
    wg.addColorStop(0, '#f1c98c');
    wg.addColorStop(1, '#d39d5c');
    ctx.fillStyle = wg;
    ctx.beginPath();
    ctx.roundRect(-sw / 2, -sh / 2, sw, sh, R(0.012));
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,70,30,.35)';
    ctx.lineWidth = 1;
    for (let k = 1; k < 3; k++) (ctx.beginPath(), ctx.moveTo(-sw / 2 + 3, -sh / 2 + (sh * k) / 3), ctx.lineTo(sw / 2 - 3, -sh / 2 + (sh * k) / 3), ctx.stroke());
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#6b3f1a';
    ctx.font = `800 ${Math.max(12, R(0.034))}px system-ui, sans-serif`;
    ctx.fillText('남은 바꾸기', 0, -sh * 0.27);
    ctx.font = `900 ${Math.max(20, R(0.064))}px system-ui, sans-serif`;
    ctx.fillStyle = low ? '#d62f2f' : '#3a2410';
    ctx.fillText(String(s.moves), 0, sh * 0.16);
    ctx.restore();
  }
  // 바람 깃발
  if (d.wind) {
    const fx0 = X(0.635), fy0 = Y(0.15);
    ctx.strokeStyle = '#6b4a2a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fx0, fy0);
    ctx.lineTo(fx0, fy0 + R(0.12));
    ctx.stroke();
    const dir = s.gdir === 1 ? -1 : s.gdir === 2 ? 1 : 0;
    ctx.fillStyle = '#ff8a2b';
    ctx.beginPath();
    if (dir) {
      const fl = Math.sin(t * 0.4) * R(0.006);
      ctx.moveTo(fx0, fy0 + R(0.005));
      ctx.lineTo(fx0 + dir * R(0.08), fy0 + R(0.018) + fl);
      ctx.lineTo(fx0 + dir * R(0.08), fy0 + R(0.03) + fl);
      ctx.lineTo(fx0, fy0 + R(0.04));
    } else {
      ctx.moveTo(fx0, fy0 + R(0.005));
      ctx.lineTo(fx0 + R(0.02), fy0 + R(0.06));
      ctx.lineTo(fx0 + R(0.008), fy0 + R(0.065));
      ctx.lineTo(fx0, fy0 + R(0.04));
    }
    ctx.closePath();
    ctx.fill();
    ctx.font = `800 ${Math.max(12, R(0.034))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(30,50,20,.7)';
    const nx = s.windNext === 1 ? '←' : s.windNext === 2 ? '→' : '↓';
    const lab = `${s.windIn}수 뒤 ${nx}`;
    ctx.strokeText(lab, fx0, fy0 + R(0.138));
    ctx.fillStyle = '#fffbe0';
    ctx.fillText(lab, fx0, fy0 + R(0.138));
  }
}

/** 얼음 접시 (layer 2 = 두꺼운 서리) */
function drawIce(ctx: CanvasRenderingContext2D, x: number, y: number, sz: number, layer: number, t: number) {
  const g = ctx.createLinearGradient(x, y, x + sz, y + sz);
  g.addColorStop(0, layer > 1 ? 'rgba(235,250,255,.95)' : 'rgba(215,242,255,.85)');
  g.addColorStop(1, layer > 1 ? 'rgba(150,205,240,.95)' : 'rgba(140,200,240,.75)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(x + sz * 0.05, y + sz * 0.05, sz * 0.9, sz * 0.9, sz * 0.2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.95)';
  ctx.lineWidth = Math.max(1.5, sz * (layer > 1 ? 0.07 : 0.045));
  ctx.stroke();
  ctx.strokeStyle = 'rgba(90,160,210,.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(x + sz / 2, y + sz / 2, sz * 0.3, sz * 0.3, 0, 0, TAU);
  ctx.stroke();
  const sh = (Math.sin(t * 0.05 + x * 0.1) + 1) / 2;
  ctx.fillStyle = `rgba(255,255,255,${0.5 + 0.4 * sh})`;
  ctx.beginPath();
  ctx.ellipse(x + sz * 0.28, y + sz * 0.24, sz * 0.12, sz * 0.05, -0.6, 0, TAU);
  ctx.fill();
  if (layer > 1) {
    ctx.strokeStyle = 'rgba(255,255,255,.8)';
    ctx.lineWidth = 1;
    for (let k = 0; k < 3; k++) (ctx.beginPath(), ctx.moveTo(x + sz * (0.2 + k * 0.25), y + sz * 0.12), ctx.lineTo(x + sz * (0.12 + k * 0.25), y + sz * 0.3), ctx.stroke());
  }
}

/** 칸마다 화면 자리: 바꾸기·떨어짐·개미 걸음·돗자리 털기 */
function piecePos(s: PicState, i: number): { x: number; y: number; sx: number; sy: number; lift: number } {
  let x = cellX(i), y = cellY(i), sx = 1, sy = 1, lift = 0;
  if (s.sw && (s.phase === 'swap' || s.phase === 'back') && (i === s.sw.a || i === s.sw.b)) {
    const o = i === s.sw.a ? s.sw.b : s.sw.a;
    let q: number;
    if (!s.sw.back) q = 1 - ease(s.pt / SWAP_T);
    else {
      const u = s.pt / BACK_T;
      q = u < 0.45 ? ease(u / 0.45) * 0.85 : 0.85 * (1 - ease((u - 0.45) / 0.55));
    }
    x += (cellX(o) - x) * q;
    y += (cellY(o) - y) * q;
    lift = Math.sin(q * Math.PI) * 0.02 * (i === s.sw.a ? 1 : -0.3);
  }
  if (s.off[i] > 0) {
    const d = s.off[i] * CS;
    if (s.fdir === 0) y -= d;
    else if (s.fdir === 1) x += d;
    else x -= d;
    const st = Math.min(0.22, s.vel[i] * 0.5);
    if (s.fdir === 0) (sy = 1 + st), (sx = 1 - st * 0.5);
    else (sx = 1 + st), (sy = 1 - st * 0.5);
  } else {
    const age = s.t - s.land[i];
    if (age >= 0 && age < 18) {
      const k = Math.exp(-age / 4.5) * Math.cos(age * 0.6) * 0.26;
      if (s.fdir === 0) (sy = 1 - k), (sx = 1 + k * 0.7);
      else (sx = 1 - k), (sy = 1 + k * 0.7);
    }
  }
  if (s.phase === 'ant') {
    const q = 1 - ease(s.pt / ANT_T);
    for (const m of s.antMv) {
      if (i === m.to) (y += (cellY(m.from) - cellY(m.to)) * q), (lift = Math.sin((1 - q) * Math.PI) * 0.015);
      if (i === m.from) y += (cellY(m.to) - cellY(m.from)) * q;
    }
    if (i === s.antIn) (y += CS * 0.95 * q), (lift = Math.sin((1 - q) * Math.PI) * 0.03);
  }
  if (s.phase === 'shuffle' && s.shuf && s.shuf[i] >= 0) {
    const q = ease(s.pt / SHUF_T), o = s.shuf[i];
    x = cellX(o) + (x - cellX(o)) * q;
    y = cellY(o) + (y - cellY(o)) * q;
    lift = Math.sin(q * Math.PI) * 0.08;
  }
  return { x, y, sx, sy, lift };
}

function drawMat(ctx: CanvasRenderingContext2D, s: PicState, X: XF, Y: XF, R: XF, t: number) {
  const x0 = X(GX), y0 = Y(GY), bw = R(W * CS), bh = R(H * CS), pad = R(0.016);
  // 그림자 · 두께
  ctx.fillStyle = 'rgba(20,50,10,.35)';
  ctx.beginPath();
  ctx.roundRect(x0 - pad + R(0.012), y0 - pad + R(0.02), bw + pad * 2, bh + pad * 2, R(0.012));
  ctx.fill();
  ctx.fillStyle = '#a83a3a';
  ctx.beginPath();
  ctx.roundRect(x0 - pad, y0 - pad + R(0.01), bw + pad * 2, bh + pad * 2, R(0.012));
  ctx.fill();
  ctx.fillStyle = '#d65a5a';
  ctx.beginPath();
  ctx.roundRect(x0 - pad, y0 - pad, bw + pad * 2, bh + pad * 2, R(0.012));
  ctx.fill();
  // 술 (위·아래 가장자리)
  ctx.strokeStyle = '#fff1e4';
  ctx.lineWidth = 1.5;
  for (let k = 0; k <= 34; k++) {
    const fx = x0 - pad + ((bw + pad * 2) * k) / 34, sw = Math.sin(t * 0.05 + k) * 1.2;
    ctx.beginPath();
    ctx.moveTo(fx, y0 - pad);
    ctx.lineTo(fx + sw, y0 - pad - R(0.01));
    ctx.moveTo(fx, y0 + bh + pad + R(0.01));
    ctx.lineTo(fx + sw, y0 + bh + pad + R(0.02));
    ctx.stroke();
  }
  // 체크 무늬 칸
  const cs = R(CS), wm = wetM(s);
  for (let r = 0; r < H; r++)
    for (let c = 0; c < W; c++) {
      const k = (r % 2) + (c % 2);
      ctx.fillStyle = k === 2 ? '#f3a59b' : k === 1 ? '#fbd3c8' : '#fff6ee';
      ctx.fillRect(x0 + c * cs, y0 + r * cs, cs + 0.5, cs + 0.5);
      if ((wm >> c) & 1) {
        ctx.fillStyle = 'rgba(70,130,200,.28)';
        ctx.fillRect(x0 + c * cs, y0 + r * cs, cs + 0.5, cs + 0.5);
      }
    }
  // 천 결 + 햇빛
  ctx.strokeStyle = 'rgba(180,80,70,.12)';
  ctx.lineWidth = 1;
  for (let k = 0; k <= W; k++) (ctx.beginPath(), ctx.moveTo(x0 + k * cs, y0), ctx.lineTo(x0 + k * cs, y0 + bh), ctx.stroke());
  for (let k = 0; k <= H; k++) (ctx.beginPath(), ctx.moveTo(x0, y0 + k * cs), ctx.lineTo(x0 + bw, y0 + k * cs), ctx.stroke());
  const lg = ctx.createLinearGradient(x0, y0, x0 + bw, y0 + bh);
  lg.addColorStop(0, 'rgba(255,250,220,.22)');
  lg.addColorStop(1, 'rgba(120,40,20,.1)');
  ctx.fillStyle = lg;
  ctx.fillRect(x0, y0, bw, bh);
  // 얼음 접시
  for (let i = 0; i < N; i++) if (s.B.ice[i] > 0) drawIce(ctx, x0 + colOf(i) * cs, y0 + rowOf(i) * cs, cs, s.B.ice[i], t);
  // 판 시작: 새 장치가 놓인 자리를 반짝 (얼음 접시)
  const age = t - s.startT;
  if (age < 220 && STAGES[s.stage].ice) {
    ctx.strokeStyle = `rgba(255,255,255,${0.5 + 0.5 * Math.sin(age * 0.25)})`;
    ctx.lineWidth = 3;
    for (let i = 0; i < N; i++) if (s.B.ice[i] > 0) (ctx.beginPath(), ctx.roundRect(x0 + colOf(i) * cs + 2, y0 + rowOf(i) * cs + 2, cs - 4, cs - 4, cs * 0.22), ctx.stroke());
  }
}

function drawPieces(ctx: CanvasRenderingContext2D, s: PicState, X: XF, Y: XF, R: XF, t: number) {
  const B = s.B, r0 = R(CS * 0.4), wm = wetM(s);
  ctx.save();
  ctx.beginPath();
  ctx.rect(X(GX) - R(0.012), Y(GY) - R(0.012), R(W * CS + 0.024), R(H * CS + 0.024));
  ctx.clip();
  // 그림자 먼저
  ctx.fillStyle = 'rgba(80,20,10,.2)';
  for (let i = 0; i < N; i++) {
    const v = B.g[i];
    if (v === EMPTY) continue;
    const p = piecePos(s, i);
    ctx.beginPath();
    ctx.ellipse(X(p.x) + r0 * 0.15, Y(p.y) + r0 * 0.78, r0 * 0.72 * p.sx, r0 * 0.2, 0, 0, TAU);
    ctx.fill();
  }
  // 고른 음식에서 바꾸면 이어지는 쪽 (반짝)
  const hints: number[] = [];
  if (s.sel >= 0 && s.phase === 'idle')
    for (const j of [s.sel - 1, s.sel + 1, s.sel - W, s.sel + W]) if (j >= 0 && j < N && adj(j, s.sel) && !((wm >> colOf(j)) & 1) && swapOk(B, s.sel, j)) hints.push(j);
  for (let i = 0; i < N; i++) {
    const v = B.g[i];
    if (v === EMPTY) continue;
    const p = piecePos(s, i);
    let lift = p.lift, sc = 1;
    if (i === s.sel && s.phase === 'idle') (lift += 0.012 + Math.sin(t * 0.2) * 0.003), (sc = 1.12);
    const px = X(p.x), py = Y(p.y - lift);
    ctx.save();
    ctx.translate(px, py + r0 * 0.85);
    ctx.scale(p.sx * sc, p.sy * sc);
    ctx.translate(0, -r0 * 0.85);
    if (v === ANT) {
      const tb = s.tumble.find((q) => q.i === i);
      const face = tb && t - tb.t0 < 50 ? 'dizzy' : 'go';
      drawAnt(ctx, 0, r0 * 0.1, r0 * 1.2, t, { carry: B.carry[i], face, walk: t * 0.25 + i, rot: tb && t - tb.t0 < 20 ? (t - tb.t0) * 0.6 : 0 });
    } else if (isSp(v)) drawSpecial(ctx, v, 0, 0, r0, t);
    else if (isFood(v)) drawFood(ctx, v, 0, 0, r0);
    ctx.restore();
    if ((wm >> colOf(i)) & 1 && v !== ANT) {
      // 젖은 음식: 물방울
      ctx.fillStyle = 'rgba(200,230,255,.9)';
      for (let k = 0; k < 2; k++) {
        const dy = ((t * 0.5 + k * 13 + i * 7) % 26) / 26;
        ctx.beginPath();
        ctx.ellipse(px + (k ? r0 * 0.5 : -r0 * 0.45), py - r0 * 0.4 + dy * r0, r0 * 0.07, r0 * 0.11, 0, 0, TAU);
        ctx.fill();
      }
    }
    if (i === s.sel && s.phase === 'idle') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(px, py, r0 * 1.18 + Math.sin(t * 0.3) * 1.2, 0, TAU);
      ctx.stroke();
    }
  }
  for (const j of hints) {
    const mx = X((cellX(j) + cellX(s.sel)) / 2), my = Y((cellY(j) + cellY(s.sel)) / 2), a = 0.45 + 0.4 * Math.sin(t * 0.25 + j);
    ctx.fillStyle = `rgba(255,250,190,${a})`;
    const rr = r0 * 0.28;
    ctx.beginPath();
    ctx.moveTo(mx, my - rr);
    ctx.lineTo(mx + rr * 0.3, my - rr * 0.3);
    ctx.lineTo(mx + rr, my);
    ctx.lineTo(mx + rr * 0.3, my + rr * 0.3);
    ctx.lineTo(mx, my + rr);
    ctx.lineTo(mx - rr * 0.3, my + rr * 0.3);
    ctx.lineTo(mx - rr, my);
    ctx.lineTo(mx - rr * 0.3, my - rr * 0.3);
    ctx.closePath();
    ctx.fill();
  }
  // 개미 길: 기어오를 칸에 발자국, 바구니까지 남은 걸음
  if (s.phase !== 'result')
    for (let i = 0; i < N; i++) {
      if (B.g[i] !== ANT) continue;
      const steps = rowOf(i) + 1, hot = steps <= 2, cx = X(cellX(i));
      ctx.fillStyle = hot ? 'rgba(220,50,40,.55)' : 'rgba(90,50,30,.35)';
      for (let r = rowOf(i) - 1; r >= -0.3; r -= 0.5) {
        const fy = Y(GY + (r + 0.5) * CS), sd = Math.round(r * 2) % 2 ? 1 : -1;
        ctx.beginPath();
        ctx.ellipse(cx + sd * r0 * 0.22, fy, r0 * 0.08, r0 * 0.12, 0, 0, TAU);
        ctx.fill();
      }
      const p = piecePos(s, i), bx = X(p.x) + r0 * 0.85, by2 = Y(p.y) + r0 * 0.55;
      if (hot) {
        const a = 0.55 + 0.45 * Math.sin(t * 0.3);
        ctx.fillStyle = `rgba(232,65,58,${a})`;
        ctx.beginPath();
        ctx.moveTo(cx, Y(GY) - r0 * 0.55);
        ctx.lineTo(cx - r0 * 0.4, Y(GY) + r0 * 0.05);
        ctx.lineTo(cx + r0 * 0.4, Y(GY) + r0 * 0.05);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = hot ? '#e8413a' : '#fff6e6';
      ctx.beginPath();
      ctx.arc(bx, by2, Math.max(8, r0 * 0.42), 0, TAU);
      ctx.fill();
      ctx.strokeStyle = hot ? '#ffffff' : '#8a5a3a';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = hot ? '#ffffff' : '#5a3020';
      ctx.font = `900 ${Math.max(12, r0 * 0.62)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(steps), bx, by2 + 1);
    }
  // 냠! 사라지는 음식
  if (s.phase === 'pop') {
    const q = Math.max(0, s.pt - s.hold) / POP_T, frz = s.pt < s.hold;
    for (const pp of s.pops) {
      const sc = frz ? 1.22 + Math.sin(t * 1.7 + pp.i) * 0.05 : q < 0.35 ? 1.22 + q * 0.2 : 1.29 * (1 - (q - 0.35) / 0.65);
      if (sc <= 0.02) continue;
      ctx.save();
      ctx.translate(X(cellX(pp.i)) + (frz ? Math.sin(t * 2.3 + pp.i) * 1.5 : 0), Y(cellY(pp.i)));
      if (frz) {
        ctx.fillStyle = 'rgba(255,250,210,.55)';
        ctx.beginPath();
        ctx.arc(0, 0, r0 * 1.3, 0, TAU);
        ctx.fill();
      }
      ctx.rotate(q * 0.6 * (pp.i % 2 ? 1 : -1));
      ctx.scale(sc, sc);
      if (isSp(pp.v)) drawSpecial(ctx, pp.v, 0, 0, r0, t);
      else if (isFood(pp.v)) drawFood(ctx, pp.v, 0, 0, r0);
      ctx.restore();
    }
  }
  ctx.restore();
  // 김밥·수박이 쓸고 간 자리
  for (const l of s.lines) {
    const age = t - l.t0, a = Math.max(0, 1 - age / 22);
    const cx = X(cellX(l.i)), cy = Y(cellY(l.i));
    ctx.globalAlpha = a;
    const kinds = l.sp2 !== undefined ? [l.sp, l.sp2] : [l.sp];
    for (const k of kinds) {
      if (k === MELON) {
        ctx.fillStyle = 'rgba(255,120,140,.35)';
        ctx.beginPath();
        ctx.arc(cx, cy, R(CS) * (0.6 + age * 0.12) * (l.sp2 !== undefined ? 1.6 : 1), 0, TAU);
        ctx.fill();
      } else {
        const g = ctx.createLinearGradient(0, 0, 1, 1);
        void g;
        ctx.fillStyle = 'rgba(255,255,230,.85)';
        const th = R(CS) * 0.35 * (1 - age / 24) * (l.sp2 === MELON || l.sp === MELON ? 3 : 1);
        if (k === KH || l.sp2 !== undefined) ctx.fillRect(X(GX), cy - th / 2, R(W * CS), th);
        if (k === KV || l.sp2 !== undefined) ctx.fillRect(cx - th / 2, Y(GY), th, R(H * CS));
      }
    }
    ctx.globalAlpha = 1;
  }
}

/** 나뭇잎 그림자 (돗자리 위로 일렁) */
function drawLeafShade(ctx: CanvasRenderingContext2D, X: XF, Y: XF, R: XF, t: number) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(X(GX) - R(0.02), Y(GY) - R(0.02), R(W * CS + 0.04), R(H * CS + 0.04));
  ctx.clip();
  for (let k = 0; k < 6; k++) {
    const bx = 0.05 + hsh(k + 40) * 0.9 + Math.sin(t * 0.008 + k) * 0.03, by = GY + hsh(k + 50) * H * CS + Math.cos(t * 0.006 + k * 2) * 0.02, rr = R(0.09 + hsh(k + 60) * 0.06);
    const g = ctx.createRadialGradient(X(bx), Y(by), rr * 0.2, X(bx), Y(by), rr);
    g.addColorStop(0, 'rgba(30,70,20,.11)');
    g.addColorStop(1, 'rgba(30,70,20,0)');
    ctx.fillStyle = g;
    ctx.fillRect(X(bx) - rr, Y(by) - rr, rr * 2, rr * 2);
  }
  ctx.restore();
}

function drawWeather(ctx: CanvasRenderingContext2D, s: PicState, X: XF, Y: XF, R: XF, t: number) {
  const d = STAGES[s.stage], fx = juice(s);
  if (d.rain) {
    const tx = GX + (s.cloud + 1.5) * CS;
    fx.memo.cx = fx.memo.cx === undefined || fx.memo.cs !== s.startT ? tx : fx.memo.cx + (tx - fx.memo.cx) * 0.08;
    fx.memo.cs = s.startT;
    const cx = X(fx.memo.cx), cy = Y(GY - 0.028);
    // 빗줄기
    ctx.save();
    ctx.beginPath();
    ctx.rect(cx - R(CS * 1.5), cy, R(CS * 3), R(H * CS + 0.02));
    ctx.clip();
    ctx.strokeStyle = 'rgba(90,150,225,.8)';
    ctx.lineWidth = 1.6;
    for (let k = 0; k < 40; k++) {
      const rx = cx + (hsh(k) - 0.5) * R(CS * 3), ry = cy + ((hsh(k + 30) * R(H * CS) + t * R(0.012)) % R(H * CS + 0.02));
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - R(0.004), ry + R(0.03));
      ctx.stroke();
    }
    // 물웅덩이 동심원
    ctx.strokeStyle = 'rgba(255,255,255,.6)';
    ctx.lineWidth = 1.2;
    for (let k = 0; k < 5; k++) {
      const ph = ((t + k * 23) % 60) / 60, rx = cx + (hsh(k + 200 + Math.floor((t + k * 23) / 60)) - 0.5) * R(CS * 2.6), ry = Y(GY) + hsh(k + 300 + Math.floor((t + k * 23) / 60)) * R(H * CS);
      ctx.globalAlpha = 1 - ph;
      ctx.beginPath();
      ctx.ellipse(rx, ry, R(0.006) + ph * R(0.03), R(0.003) + ph * R(0.012), 0, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    // 젖은 세 줄 테두리 (못 바꾸는 곳)
    ctx.strokeStyle = `rgba(70,130,220,${0.6 + 0.3 * Math.sin(t * 0.15)})`;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(X(GX + s.cloud * CS) + 1, Y(GY) + 1, R(3 * CS) - 2, R(H * CS) - 2);
    ctx.setLineDash([]);
    // 구름
    ctx.fillStyle = 'rgba(60,70,90,.25)';
    ctx.beginPath();
    ctx.ellipse(cx + R(0.01), cy + R(0.05), R(0.15), R(0.022), 0, 0, TAU);
    ctx.fill();
    for (const [dx, dy, rr, c] of [[-0.09, 0.008, 0.03, '#9aa6b8'], [-0.04, -0.008, 0.04, '#b3bdcc'], [0.03, -0.012, 0.042, '#c4cdd9'], [0.088, 0.006, 0.03, '#aab5c6'], [0, 0.014, 0.034, '#a3aec0']] as const) {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(cx + R(dx), cy + R(dy), R(rr), 0, TAU);
      ctx.fill();
    }
    // 구름 얼굴 (뾰로통)
    ctx.fillStyle = '#4a5468';
    for (const sd of [-1, 1]) (ctx.beginPath(), ctx.arc(cx + sd * R(0.022), cy - R(0.012), R(0.006), 0, TAU), ctx.fill());
    ctx.strokeStyle = '#4a5468';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy + R(0.008), R(0.01), Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    // 다음에 갈 쪽
    const ax = cx + s.cloudDir * R(0.19);
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.beginPath();
    ctx.moveTo(ax + s.cloudDir * R(0.025), cy);
    ctx.lineTo(ax, cy - R(0.018));
    ctx.lineTo(ax, cy + R(0.018));
    ctx.closePath();
    ctx.fill();
  }
  if (d.wind) {
    // 바람이 바뀐 순간: 판을 가로지르는 큰 화살 + 나뭇잎 회오리
    const ga = t - (fx.memo.windT ?? -999);
    if (ga >= 0 && ga < 60) {
      const dir = s.gdir === 1 ? -1 : s.gdir === 2 ? 1 : 0, a = Math.min(1, (60 - ga) / 20) * 0.55, cx = X(0.5) + dir * (ga - 30) * 2, cy = Y(GY + H * CS * 0.5);
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.strokeStyle = `rgba(255,138,43,${a + 0.2})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      if (dir) {
        ctx.moveTo(cx + dir * R(0.22), cy);
        ctx.lineTo(cx + dir * R(0.06), cy - R(0.12));
        ctx.lineTo(cx + dir * R(0.06), cy - R(0.05));
        ctx.lineTo(cx - dir * R(0.22), cy - R(0.05));
        ctx.lineTo(cx - dir * R(0.22), cy + R(0.05));
        ctx.lineTo(cx + dir * R(0.06), cy + R(0.05));
        ctx.lineTo(cx + dir * R(0.06), cy + R(0.12));
      } else {
        ctx.moveTo(cx, cy + R(0.22));
        ctx.lineTo(cx - R(0.12), cy + R(0.06));
        ctx.lineTo(cx - R(0.05), cy + R(0.06));
        ctx.lineTo(cx - R(0.05), cy - R(0.2));
        ctx.lineTo(cx + R(0.05), cy - R(0.2));
        ctx.lineTo(cx + R(0.05), cy + R(0.06));
        ctx.lineTo(cx + R(0.12), cy + R(0.06));
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
  if (d.wind && s.gdir) {
    const dir = s.gdir === 1 ? -1 : 1;
    // 떨어지는 쪽 가장자리 화살촉
    ctx.fillStyle = `rgba(255,138,43,${0.55 + 0.35 * Math.sin(t * 0.2)})`;
    const ex = dir < 0 ? X(GX) - R(0.03) : X(GX + W * CS) + R(0.03);
    for (let r = 0; r < H; r++) {
      const ey = Y(GY + (r + 0.5) * CS);
      ctx.beginPath();
      ctx.moveTo(ex + dir * R(0.016), ey);
      ctx.lineTo(ex - dir * R(0.006), ey - R(0.016));
      ctx.lineTo(ex - dir * R(0.006), ey + R(0.016));
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,.5)';
    ctx.lineWidth = 2;
    for (let k = 0; k < 7; k++) {
      const yy = Y(GY + hsh(k + 80) * H * CS), span = R(W * CS + 0.1), off = ((t * 4 + hsh(k) * 500) % span) - R(0.05);
      const xx = dir > 0 ? X(GX) + off : X(GX + W * CS) - off;
      ctx.beginPath();
      ctx.moveTo(xx, yy);
      ctx.lineTo(xx - dir * R(0.07), yy + Math.sin(t * 0.1 + k) * 2);
      ctx.stroke();
      ctx.fillStyle = '#7cc04a';
      ctx.beginPath();
      ctx.ellipse(xx, yy, R(0.012), R(0.006), t * 0.2 + k, 0, TAU);
      ctx.fill();
    }
  }
}

/** 돗자리 아래 잔디: 개미굴 · 대장 개미 · 줄지어 오는 개미 */
function drawAnthill(ctx: CanvasRenderingContext2D, s: PicState, X: XF, Y: XF, R: XF, t: number) {
  const d = STAGES[s.stage], hx = X(0.075), hy = Y(1.428);
  ctx.fillStyle = 'rgba(0,0,0,.2)';
  ctx.beginPath();
  ctx.ellipse(hx, hy + R(0.012), R(0.075), R(0.015), 0, 0, TAU);
  ctx.fill();
  const mg = ctx.createRadialGradient(hx - R(0.02), hy - R(0.03), R(0.005), hx, hy, R(0.08));
  mg.addColorStop(0, '#c99a62');
  mg.addColorStop(1, '#8a5f32');
  ctx.fillStyle = mg;
  ctx.beginPath();
  ctx.ellipse(hx, hy, R(0.07), R(0.035), 0, Math.PI, TAU);
  ctx.fill();
  ctx.fillStyle = '#3a2412';
  ctx.beginPath();
  ctx.ellipse(hx, hy - R(0.022), R(0.016), R(0.008), 0, 0, TAU);
  ctx.fill();
  // 줄지어 오는 개미 (남은 수만큼, 맨 앞은 들어올 줄 아래)
  if (d.ants && s.antLeft > 0) {
    const ex = X(cellX((H - 1) * W + s.antCol)), ly = Y(1.392), left = s.turnN >= s.antNext - 1 ? 1 : s.antNext - s.turnN;
    const n = Math.min(6, s.antLeft);
    for (let k = n - 1; k >= 0; k--) {
      const tx = k === 0 ? ex : X(0.14) + (ex - X(0.14)) * (1 - k / (n + 0.5)) - R(0.02) * k;
      const bob = Math.sin(t * 0.3 + k) * 1.2;
      drawAnt(ctx, tx, ly + bob - (k === 0 ? R(0.004) : 0), R(k === 0 ? 0.034 : 0.026), t, { face: k === 0 ? 'go' : 'go', walk: t * 0.35 + k });
    }
    // 맨 앞 개미 말풍선: 몇 수 뒤에 올라오나
    const txt = left <= 1 ? '다음 수에 올라와요!' : `${left}수 뒤 🐜`;
    ctx.font = `800 ${Math.max(12, R(0.033))}px system-ui, sans-serif`;
    const tw = ctx.measureText(txt).width + 12, bx = Math.max(tw / 2 + 4, Math.min(X(1) - tw / 2 - 4, ex)), by = Y(1.335);
    ctx.fillStyle = left <= 1 ? 'rgba(255,230,200,.95)' : 'rgba(255,255,255,.9)';
    ctx.beginPath();
    ctx.roundRect(bx - tw / 2, by - R(0.018), tw, R(0.036), R(0.018));
    ctx.fill();
    ctx.fillStyle = left <= 1 ? '#b23a1a' : '#4a3020';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(txt, bx, by + 1);
  }
  // 대장 개미
  const face = s.mood === 'sleep' ? 'sleep' : s.mood === 'smug' ? 'smug' : s.mood === 'panic' || s.mood === 'stomp' ? 'stomp' : s.mood === 'huh' ? 'huh' : 'go';
  const jump = s.mood === 'stomp' || s.mood === 'panic' ? Math.abs(Math.sin((t - s.moodT) * 0.4)) * R(0.012) : s.mood === 'smug' ? Math.abs(Math.sin((t - s.moodT) * 0.15)) * R(0.008) : 0;
  drawAnt(ctx, hx + R(0.005), hy - R(0.065) - jump, R(0.055), t, { face, walk: s.mood === 'stomp' ? t * 0.8 : t * 0.05, flag: true, cheeks: true });
  // 대장 개미 한마디
  const age = t - s.moodT, line = ({ go: '영차! 돌격~', panic: '후퇴! 후퇴!', smug: s.phase === 'result' ? '우리가 이겼다~' : '히히 잘 먹을게~', stomp: '분하다~!', huh: '어딜 만져!' } as Record<string, string>)[s.mood];
  if (line && age < 80 && s.mood !== 'idle') {
    ctx.font = `800 ${Math.max(12, R(0.033))}px system-ui, sans-serif`;
    const tw = ctx.measureText(line).width + 14, bx = hx + R(0.07), by = hy - R(0.005);
    ctx.globalAlpha = Math.min(1, (80 - age) / 12);
    ctx.fillStyle = s.mood === 'smug' ? '#fff0c8' : s.mood === 'panic' || s.mood === 'stomp' ? '#ffe0d8' : '#ffffff';
    ctx.beginPath();
    ctx.roundRect(bx, by - R(0.019), tw, R(0.038), R(0.019));
    ctx.moveTo(bx + R(0.008), by);
    ctx.lineTo(bx - R(0.014), by + R(0.004));
    ctx.lineTo(bx + R(0.01), by + R(0.012));
    ctx.fill();
    ctx.fillStyle = '#4a2a1c';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(line, bx + 7, by + 1);
    ctx.globalAlpha = 1;
  }
  if (s.mood === 'sleep') {
    ctx.font = `800 ${Math.max(12, R(0.034))}px system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.textAlign = 'left';
    ctx.fillText('z', hx + R(0.06), hy - R(0.07) - (t % 60) * 0.08);
    ctx.fillText('Z', hx + R(0.085), hy - R(0.095) - (t % 60) * 0.08);
  }
}

const recentSay = new WeakMap<object, { x: number; y: number; t: number }[]>();
function drawAll(ctx: CanvasRenderingContext2D, s: PicState, w: number, h: number, th: Theme) {
  const fx = juice(s), t = s.t;
  const X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w;
  ctx.save();
  fx.begin(ctx);
  drawScene(ctx, s, X, Y, R, w, h, t);
  drawMat(ctx, s, X, Y, R, t);
  drawPieces(ctx, s, X, Y, R, t);
  drawLeafShade(ctx, X, Y, R, t);
  drawSceneFront(ctx, s, X, Y, R, t);
  drawWeather(ctx, s, X, Y, R, t);
  drawAnthill(ctx, s, X, Y, R, t);
  const r0 = R(CS * 0.4);
  // 깜짝 놀라 도망가는 개미 (음식은 떨궜다)
  for (const rn of s.runners) {
    const age = t - rn.t0;
    drawAnt(ctx, X(rn.x), Y(rn.y) - Math.abs(Math.sin(age * 0.5)) * R(0.01), r0 * 1.05, t, { face: 'panic', walk: t * 1.2, rot: age < 8 ? Math.sin(age * 0.8) * 0.3 : Math.sign(rn.vx) * 0.25 });
    if (age < 14 && isFood(rn.f)) drawFood(ctx, rn.f, X(rn.x), Y(rn.y) - R(0.05) - age * 1.2, r0 * 0.6);
  }
  // 바구니 털이 개미: 꼭대기에서 바구니로 → 음식 둘을 들고 왼쪽으로 줄행랑
  for (const th2 of s.thieves) {
    const age = t - th2.t0, d = STAGES[s.stage], f = d.goals.find((G) => G.k === 'food')?.f ?? 0;
    let x: number, y: number;
    if (age < 40) {
      const q = ease(age / 40);
      x = th2.x + (BASKET_X + 0.06 - th2.x) * q;
      y = th2.y + (BASKET_Y - th2.y) * q - Math.sin(q * Math.PI) * 0.05;
    } else (x = BASKET_X + 0.06 - (age - 40) * 0.006), (y = BASKET_Y + 0.02 + Math.abs(Math.sin(age * 0.4)) * -0.01);
    drawAnt(ctx, X(x), Y(y), r0 * 1.1, t, { face: 'smug', walk: t * 0.8, carry: age >= 40 ? f : -1 });
    if (age >= 40) drawFood(ctx, f, X(x) + r0 * 0.6, Y(y) - r0 * 0.9, r0 * 0.4);
  }
  // 바구니로 날아가는 음식
  for (const f of s.fly) {
    if (t < f.t0) continue;
    const q = ease((t - f.t0) / 29), tx = chipX(f.gi), ty = CHIP_Y;
    const x = f.x0 + (tx - f.x0) * q, y = f.y0 + (ty - f.y0) * q - Math.sin(q * Math.PI) * 0.08;
    drawFood(ctx, f.f, X(x), Y(y), r0 * (1 - q * 0.45));
  }
  // 첫 판 첫 수: 손가락
  if (s.hint && s.phase === 'idle' && t - s.startT > 20) {
    const [a, b] = s.hint, ph = (t % 80) / 80, q = ease(Math.min(1, ph * 1.6));
    const fxp = X(cellX(a) + (cellX(b) - cellX(a)) * (s.sel === a ? 1 : q * 0.35)), fyp = Y(cellY(a) + (cellY(b) - cellY(a)) * (s.sel === a ? 1 : q * 0.35));
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(X(cellX(s.sel === a ? b : a)), Y(cellY(s.sel === a ? b : a)), r0 * 1.2 + Math.sin(t * 0.2) * 2, 0, TAU);
    ctx.stroke();
    ctx.font = `${Math.max(22, R(0.075))}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('👆', fxp + R(0.02), fyp + R(0.06));
  }
  // 가장자리 어둡게
  const vg = ctx.createRadialGradient(w / 2, h * 0.5, R(0.5), w / 2, h * 0.5, R(1.1));
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(10,30,0,.25)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
  // ═════════ 사건 연출 ═════════
  const say = (x: number, y: number, text: string, col: string, size: number) => {
    let rec = recentSay.get(s);
    if (!rec) recentSay.set(s, (rec = []));
    const top = t - (fx.memo.waveT ?? -999) < 70 ? Y(GY + CS * 2.1) : Y(GY + 0.04);
    y = Math.max(top, Math.min(Y(GY + H * CS - 0.02), y));
    for (let k = 0; k < 6 && rec.some((q) => t - q.t < 40 && Math.abs(q.x - x) < w * 0.25 && Math.abs(q.y - y) < size + 4); k++) y += y - top > R(0.3) ? -(size + 5) : size + 5;
    rec.push({ x, y, t });
    if (rec.length > 14) rec.shift();
    ctx.font = `800 ${size}px system-ui, sans-serif`;
    const hw = ctx.measureText(text).width / 2 + 6;
    fx.pop(Math.max(hw, Math.min(w - hw, x)), y, text, col, size);
  };
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    const due = e.v !== undefined && ['nope', 'steal', 'antin', 'tumble'].includes(e.kind) ? e.v : e.t;
    if (due <= seenT || due > t) continue;
    const x = X(e.x), y = Y(e.y);
    if (e.kind === 'pop') {
      const f = (e.v ?? 0) % 10, wv = Math.floor((e.v ?? 0) / 10);
      fx.burst(x, y, FOOD_COL[f], 12 + wv * 6, 3 + wv * 0.6, 2.4 + wv * 0.2), fx.burst(x, y, '#ffffff', 4 + wv * 2, 2, 1.6), say(x, y - R(0.02), e.text!, wv >= 3 ? '#ffe9a0' : e.col!, 15 + Math.min(10, wv * 2)), fx.kick(1 + wv * 0.9);
    }
    if (e.kind === 'wave') {
      const n = e.v ?? 2;
      fx.ring(x, y, e.col!, R(0.25 + 0.06 * n), 4 + n), fx.kick(2 + n * 1.5), (fx.memo.waveT = t), (fx.memo.waveN = n);
      if (n >= 3) fx.blink('#fff3c0', Math.min(0.4, 0.08 + 0.05 * n));
      if (n >= 4) for (let k = 0; k < 4; k++) fx.burst(X(GX + 0.1 + k * 0.22), Y(GY + 0.1), ['#ff6f86', '#ffd166', '#7fd6ff', '#9be884'][k], 10 + n * 2, 4.5, 2.6);
    }
    if (e.kind === 'feast') {
      const n = e.v ?? 3;
      say(x, y, e.text!, e.col!, 22 + Math.min(10, (n - 3) * 3)), fx.ring(x, y, '#ffd166', R(0.45), 7), fx.burst(x, y, '#ffd166', 30 + n * 4, 6, 3), fx.burst(x, y, '#ff8fb1', 20, 5, 2.6), fx.kick(4 + n);
    }
    if (e.kind === 'made') fx.ring(x, y, '#fff6b0', R(0.1), 4), fx.burst(x, y, '#fff6b0', 18, 3.5, 2.4), say(x, y - R(0.05), e.text!, e.col!, 16);
    if (e.kind === 'blast') {
      const k = e.v ?? 1;
      fx.kick(k === 3 ? 14 : k === 2 ? 10 : 7), fx.blink(k === 2 ? '#ffd0d8' : '#fff8d8', k === 3 ? 0.5 : 0.3), fx.ring(x, y, '#ffe9a8', R(k === 3 ? 0.6 : k === 2 ? 0.4 : 0.3), 8), fx.ring(x, y, '#ffffff', R(k === 3 ? 0.35 : 0.2), 4);
      say(x, y - R(0.04), e.text!, e.col!, 20 + k * 3);
      if (k === 1 || k === 3) for (let c = 0; c < W; c++) fx.burst(X(GX + (c + 0.5) * CS), y, '#fff6c0', 6, 3, 2);
      if (k === 4 || k === 3) for (let r = 0; r < H; r++) fx.burst(x, Y(GY + (r + 0.5) * CS), '#fff6c0', 6, 3, 2);
      if (k >= 2) fx.burst(x, y, '#ff4f6a', 36, 6.5, 3.2), fx.burst(x, y, '#1b1b1b', 10, 4, 1.6), fx.burst(x, y, '#7fd66a', 16, 5, 2.6);
    }
    if (e.kind === 'scare') fx.burst(x, y, '#ffe08a', 12, 3, 2), say(x, y - R(0.05), e.text!, e.col!, 17);
    if (e.kind === 'tumble') say(x + R(0.04), y, e.text!, e.col!, 14);
    if (e.kind === 'steal') fx.kick(6), fx.blink('#ff8a7a', 0.18), say(X(0.45), Y(GY + 0.16), e.text!, e.col!, 17);
    if (e.kind === 'antin') fx.burst(x, y + R(0.04), '#c9a06a', 10, 2, 2), say(x, y - R(0.03), e.text!, e.col!, 14);
    if (e.kind === 'crack') fx.burst(x, y, '#d6f3ff', 12, 3, 2.2), fx.ring(x, y, '#e8f8ff', R(0.06), 3);
    if (e.kind === 'nope') say(x, y - R(0.03), e.text!, e.col!, 14);
    if (e.kind === 'wet' || e.kind === 'poke') say(x, y - R(0.05), e.text!, e.col!, 14), fx.kick(1.5);
    if (e.kind === 'shuffle') fx.kick(8), say(x, y, e.text!, e.col!, 20);
    if (e.kind === 'wind') say(x, y, e.text!, e.col!, 20), fx.kick(5), (fx.memo.windT = t);
    if (e.kind === 'stage') fx.blink('#fffbe8', 0.2);
    if (e.kind === 'clear') fx.burst(X(0.5), Y(0.75), '#ffe066', 46, 6, 3.2), fx.burst(X(0.5), Y(0.75), '#ff8fb1', 30, 5, 3), fx.ring(X(0.5), Y(0.75), '#ffe066', R(0.35), 6), fx.blink('#fff6c8', 0.25);
    if (e.kind === 'fail') fx.kick(9), fx.blink(th.hot, 0.22);
  }
  fx.memo.t = t;
  // 연쇄 ×N: 한 자리에서 통통 커지고, 먹은 수가 쌓인다 (길수록 크고 뜨겁게)
  {
    const age = t - (fx.memo.waveT ?? -999), n = fx.memo.waveN ?? 0;
    if (age >= 0 && age < 70 && n >= 2) {
      const sc = 1 + Math.max(0, 1 - age / 9) * (0.4 + 0.1 * n), a = Math.min(1, (70 - age) / 15);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(X(0.5), Y(GY + CS * 1.3));
      ctx.rotate(Math.sin(age * 0.3) * 0.03 * Math.min(n, 5));
      ctx.scale(sc, sc);
      ctx.font = `900 ${Math.max(20, R(0.068 + Math.min(5, n - 2) * 0.011))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 7;
      ctx.strokeStyle = 'rgba(110,30,20,.8)';
      const txt = `${n >= 5 ? '대박! ' : ''}연쇄 ×${n}!`;
      ctx.strokeText(txt, 0, 0);
      ctx.fillStyle = n >= 5 ? `hsl(${(t * 8) % 360},95%,72%)` : n >= 4 ? '#ffb347' : n === 3 ? '#ffe066' : '#e6ffd0';
      ctx.fillText(txt, 0, 0);
      ctx.font = `900 ${Math.max(14, R(0.045))}px system-ui, sans-serif`;
      ctx.lineWidth = 5;
      const sub = `냠 ${s.chainN}개`;
      ctx.strokeText(sub, 0, R(0.06));
      ctx.fillStyle = '#ffffff';
      ctx.fillText(sub, 0, R(0.06));
      ctx.restore();
    }
  }
  // 성공하면 남은 바꾸기가 하나씩 폭죽으로 (+10점씩)
  if (s.phase === 'result' && s.ok)
    for (let k = 0; k < Math.min(12, s.moves); k++) {
      const key = 'fw' + k;
      if (s.pt < 28 + k * 6 || (fx.memo[key] ?? -1) === s.clearT) continue;
      fx.memo[key] = s.clearT;
      const x = X(GX + (0.08 + hsh(k * 7 + s.stage) * 0.84) * W * CS), y = Y(GY + 0.06 + hsh(k * 11 + s.stage) * 0.36), c = ['#ff6f86', '#ffd166', '#7fd6ff', '#9be884', '#c9a0ff'][k % 5];
      fx.burst(x, y, c, 24, 4.5, 2.6), fx.burst(x, y, '#ffffff', 8, 2.5, 1.6), fx.ring(x, y, c, R(0.1), 3), fx.pop(x, y - R(0.03), '+10', '#fff6c0', 16), fx.kick(2);
    }
  ctx.restore();
  drawHud(ctx, s, w, h, Y, R);
}

/** 판마다 새 장치 카드: 제목 · 하는 일 · 새것인가 */
const CARD: Record<string, [string, string, boolean]> = {
  berry: ['딸기 소풍', '이웃 둘을 톡톡 → 셋 이으면 냠!', false],
  roll: ['김밥', '넷을 한 줄로 → 김밥! 바꾸면 한 줄이 싹', true],
  ants: ['개미 줄', '옆을 냠 → 깜짝 도망 · 밑을 지우면 데굴', true],
  ice: ['얼음 접시', '접시 위 음식을 냠! 해야 깨져요', true],
  melon: ['수박 폭탄', 'ㄱ·T자·다섯 → 수박! 바꾸면 3×3 쾅', true],
  rain: ['비 구름', '구름 밑 세 줄은 젖어서 못 바꿔요', true],
  wind: ['회오리 바람', '바람 쪽으로 떨어져요 · 3수마다 바뀜', true],
  feast: ['대잔치', '개미·얼음·구름이 한꺼번에!', false],
};
function drawDevice(ctx: CanvasRenderingContext2D, key: string, x: number, y: number, u: number, t: number) {
  if (key === 'berry') drawFood(ctx, 0, x, y, u);
  else if (key === 'roll') drawSpecial(ctx, KH, x, y, u, t);
  else if (key === 'ants') drawAnt(ctx, x, y + u * 0.15, u * 1.15, t, { carry: 4, face: 'go', walk: t * 0.3 });
  else if (key === 'ice') drawIce(ctx, x - u * 1.15, y - u * 1.15, u * 2.3, 2, t), drawFood(ctx, 5, x, y, u * 0.75);
  else if (key === 'melon') drawSpecial(ctx, MELON, x, y, u, t);
  else if (key === 'rain') {
    ctx.strokeStyle = '#5a96e0';
    ctx.lineWidth = 2;
    for (let k = 0; k < 5; k++) {
      const dx = (k - 2) * u * 0.38, dy = ((t * 1.5 + k * 9) % 20) / 20;
      ctx.beginPath();
      ctx.moveTo(x + dx, y + u * 0.2 + dy * u * 0.7);
      ctx.lineTo(x + dx - 2, y + u * 0.45 + dy * u * 0.7);
      ctx.stroke();
    }
    for (const [dx, dy, rr, c] of [[-0.55, 0, 0.42, '#9aa6b8'], [-0.1, -0.25, 0.55, '#c4cdd9'], [0.45, -0.05, 0.45, '#aab5c6']] as const) (ctx.fillStyle = c), ctx.beginPath(), ctx.arc(x + dx * u, y - u * 0.25 + dy * u, rr * u, 0, TAU), ctx.fill();
  } else if (key === 'wind') {
    ctx.strokeStyle = '#ff8a2b';
    ctx.lineWidth = Math.max(3, u * 0.22);
    ctx.lineCap = 'round';
    const sw = Math.sin(t * 0.15) * u * 0.15;
    ctx.beginPath();
    ctx.moveTo(x + u * 0.8 + sw, y);
    ctx.lineTo(x - u * 0.8 + sw, y);
    ctx.moveTo(x - u * 0.8 + sw, y);
    ctx.lineTo(x - u * 0.35 + sw, y - u * 0.45);
    ctx.moveTo(x - u * 0.8 + sw, y);
    ctx.lineTo(x - u * 0.35 + sw, y + u * 0.45);
    ctx.stroke();
    ctx.fillStyle = '#5cb84a';
    for (let k = 0; k < 3; k++) (ctx.beginPath(), ctx.ellipse(x + u * (0.6 - k * 0.5) + sw, y + u * (k % 2 ? 0.65 : -0.65), u * 0.18, u * 0.09, t * 0.2 + k, 0, TAU), ctx.fill());
  } else {
    drawIce(ctx, x - u * 1.1, y - u * 0.6, u * 1.3, 1, t);
    drawAnt(ctx, x + u * 0.35, y + u * 0.1, u * 0.95, t, { carry: 0, face: 'go', walk: t * 0.3 });
  }
}

function drawHud(ctx: CanvasRenderingContext2D, s: PicState, w: number, h: number, Y: XF, R: XF) {
  const t = s.t, d = STAGES[s.stage];
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  const hb = R(0.068);
  ctx.fillStyle = 'rgba(35,60,25,.86)';
  ctx.fillRect(0, 0, w, hb);
  font(0.04, 900);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${s.stage + 1}/${STAGES.length}판 · ${d.emoji} ${d.name}`, R(0.03), hb * 0.52);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffd166';
  const stt = `★ ${s.stars}`;
  ctx.fillText(stt, w - R(0.03), hb * 0.52);
  ctx.fillStyle = '#ff6b6b';
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - R(0.06) - ctx.measureText(stt).width, hb * 0.52);
  // 새것 알림
  if (s.news && t - s.news.t < NEWS_T + 20) {
    const age = t - s.news.t, a = Math.min(1, age / 10, (NEWS_T + 20 - age) / 20), drop = Math.max(0, 10 - age) * 2;
    ctx.globalAlpha = a;
    let fs = 0.037;
    font(fs, 900);
    const tx = s.news.text;
    while (ctx.measureText(tx).width > w - R(0.06) && fs > 0.03) font((fs -= 0.001), 900);
    const tw2 = Math.min(w - 6, ctx.measureText(tx).width + 20), by2 = Y(0.112) - drop;
    ctx.fillStyle = 'rgba(40,60,25,.92)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw2 / 2, by2 - R(0.026), tw2, R(0.052), R(0.026));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(tx, w / 2, by2 + 1);
    ctx.globalAlpha = 1;
  }
  // 판 시작: 새 장치 카드 (장치를 크게 그리고, 하는 일을 한 줄로) — 첫 바꾸기를 하면 접힌다
  {
    const age = t - s.startT, life = s.stage === 0 ? 70 : 150;
    if (age < life && s.moves === d.K && s.phase !== 'result') {
      const [title, how, isNew] = CARD[d.key];
      const a = Math.min(1, age / 8, (life - age) / 16), pop = 1 + Math.max(0, 8 - age) * 0.03;
      const cw = Math.min(w - 12, R(0.92)), ch = R(0.21), cy = Y(GY + CS * 2.2);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(w / 2, cy);
      ctx.scale(pop, pop);
      ctx.fillStyle = 'rgba(60,20,10,.35)';
      ctx.beginPath();
      ctx.roundRect(-cw / 2 + 3, -ch / 2 + 5, cw, ch, R(0.025));
      ctx.fill();
      ctx.fillStyle = '#fffaf0';
      ctx.beginPath();
      ctx.roundRect(-cw / 2, -ch / 2, cw, ch, R(0.025));
      ctx.fill();
      ctx.strokeStyle = isNew ? '#e8414f' : '#d9b07a';
      ctx.lineWidth = 3;
      ctx.stroke();
      // 장치 그림
      const ix = -cw / 2 + R(0.1), iy = 0, u = R(0.055);
      ctx.fillStyle = '#fde9d6';
      ctx.beginPath();
      ctx.arc(ix, iy, R(0.08), 0, TAU);
      ctx.fill();
      drawDevice(ctx, d.key, ix, iy, u, t);
      // 글
      const tx = -cw / 2 + R(0.2), maxW = cw - R(0.23);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      let x0 = tx;
      if (isNew) {
        font(0.032, 900);
        const nw = ctx.measureText('NEW').width + 12;
        ctx.fillStyle = '#e8414f';
        ctx.beginPath();
        ctx.roundRect(tx, -ch * 0.3 - R(0.02), nw, R(0.04), R(0.02));
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillText('NEW', tx + 6, -ch * 0.3 + 1);
        x0 = tx + nw + 6;
      }
      font(0.055, 900);
      ctx.fillStyle = '#5a2a1a';
      ctx.fillText(title, x0, -ch * 0.3);
      let fs = 0.04;
      font(fs, 800);
      while (ctx.measureText(how).width > maxW && fs > 0.031) font((fs -= 0.001), 800);
      ctx.fillStyle = '#3a2a20';
      ctx.fillText(how, tx, ch * 0.04);
      font(0.034, 800);
      ctx.fillStyle = '#9a6a4a';
      ctx.fillText(`${d.emoji} ${s.stage + 1}판 · 바꾸기 ${d.K}번 안에`, tx, ch * 0.32);
      ctx.restore();
    }
  }
  // 결과
  if (s.phase === 'result') {
    const age = s.pt, a = Math.min(1, age / 10);
    ctx.globalAlpha = a;
    ctx.fillStyle = s.ok ? 'rgba(60,40,20,.66)' : 'rgba(80,20,20,.66)';
    ctx.fillRect(0, Y(0.6), w, R(0.27));
    ctx.textAlign = 'center';
    font(s.ok ? 0.06 : 0.052, 900);
    ctx.fillStyle = s.ok ? '#fff1a8' : '#ffd0c8';
    ctx.fillText(s.ok ? (s.won ? '소풍 대성공! 🎉' : `${d.emoji} ${d.name} 성공!`) : s.why, w / 2, Y(0.66));
    if (s.ok) {
      for (let k = 0; k < 3; k++) {
        const ag = age - 14 - k * 10, got = k < s.gotSt;
        if (ag < 0) continue;
        const sc = got ? 1 + Math.max(0, 1 - ag / 8) * 0.8 : 1;
        font(0.08 * sc, 900);
        ctx.fillStyle = got ? '#ffd166' : 'rgba(255,255,255,.35)';
        ctx.fillText(got ? '★' : '☆', w / 2 + (k - 1) * R(0.1), Y(0.75));
        if (got && (juice(s).memo['star' + k] ?? -1) < s.clearT) (juice(s).memo['star' + k] = s.clearT), juice(s).burst(w / 2 + (k - 1) * R(0.1), Y(0.75), '#ffe066', 14, 3, 2.4);
      }
      font(0.036, 800);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`남은 바꾸기 ${s.moves}개 → 폭죽! · 최대 연쇄 ×${s.maxWave}${d.ants ? ` · 쫓은 개미 ${s.scared}` : ''}`, w / 2, Y(0.825));
    } else {
      font(0.042, 800);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(s.hearts > 0 ? '♥ -1 · 새 돗자리로 다시!' : '하트를 다 썼어요 — 소풍 끝', w / 2, Y(0.75));
    }
    ctx.globalAlpha = 1;
  }
  // ═════════ 아래 띠: 별 목표 · 안내 ═════════
  const by = Y(1.448);
  ctx.fillStyle = 'rgba(35,60,25,.86)';
  ctx.fillRect(0, by, w, h - by);
  {
    const y2 = Y(1.483), done = s.phase === 'result' && s.ok;
    const chips = [
      { txt: '목표', st: done ? true : null },
      { txt: `바꾸기 ${d.R}번 남기기`, st: s.moves < d.R ? false : done ? true : null },
      { txt: d.s3.label, st: d.s3.k === 'nosteal' ? (s.stolen > 0 ? false : done ? true : null) : s3ok(s) ? true : null },
    ];
    const gx0 = R(0.02), gw = (w - R(0.04)) / 3;
    chips.forEach(({ txt, st }, k) => {
      const gx = gx0 + k * gw;
      ctx.fillStyle = st === true ? 'rgba(255,209,102,.35)' : st === false ? 'rgba(0,0,0,.3)' : 'rgba(255,255,255,.12)';
      ctx.beginPath();
      ctx.roundRect(gx + 2, y2 - R(0.024), gw - 4, R(0.048), R(0.024));
      ctx.fill();
      ctx.textAlign = 'center';
      font(0.034, 800);
      ctx.fillStyle = st === false ? 'rgba(255,255,255,.45)' : '#fff6e0';
      const lab = `${st === true ? '★' : st === false ? '✗' : '☆'} ${txt}`;
      let fs = 0.034;
      while (ctx.measureText(lab).width > gw - 10 && fs > 0.03) font((fs -= 0.001), 800);
      ctx.fillText(lab, gx + gw / 2, y2 + 1);
    });
    let tp = '👆 음식을 톡 → 이웃 음식을 톡!';
    if (s.stage === 0 && s.swaps === 0) tp = '👆 음식을 톡 → 이웃을 톡 = 자리 바꾸기';
    else if (s.sel >= 0 && s.phase === 'idle') tp = '✨ 반짝이는 쪽 이웃을 톡하면 이어져요';
    else if (s.phase === 'result') tp = s.ok ? '다음 소풍 자리로!' : '같은 판을 새 돗자리로 다시';
    else if (s.moves <= 3) tp = `⚠ 바꾸기 ${s.moves}번 남았어요!`;
    else if (s.stage > 0 || s.swaps > 2) tp = d.tip;
    font(0.036, 800);
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,250,235,.95)';
    let fs = 0.036;
    while (ctx.measureText(tp).width > w - R(0.04) && fs > 0.031) font((fs -= 0.001), 800);
    ctx.fillText(tp, w / 2, Y(1.543));
  }
  ctx.textBaseline = 'alphabetic';
}
