/**
 * 아기 거북 해변 (22라운드 — 밀물 모래성과 같은 해변, 다른 놀이) — 지어서 버티기 × 재난 예보 × 가리키기(톡).
 * 기준 9(손이 하는 일은 하나): 빈 모래를 톡 = 그 칸에 다음 조각(모래벽·돌). 다 놓거나 '▶ 버티기'를 톡 치면 예보대로 파도가 오고 알이 깬다.
 * 와우: 파도를 다 막고 나면 모래 속 알이 톡톡 깨어 아기 거북들이 바다로 가야 한다 — 방금 쌓은 내 벽이 이번엔 아기 거북의 길을 막는다.
 *       그래서 '막을 곳'과 '열어 둘 곳'을 처음부터 같이 계획한다(부화 때 하는 일은 없다: 길은 짓기 때 남겨 둔다 — 사람이 읽기 쉬운 쪽).
 * 물(밀물 모래성과 같은 칸 규칙): 파도 높이 H = 바닷가 첫 줄에 서는 물의 높이. 앞으로 한 칸 갈 때 1, 옆으로 번질 때 2씩 낮아진다.
 *   모래벽(높이 3)·돌(높이 4)보다 낮은 물은 막히고, 높으면 넘는다(넘은 만큼만 이어 간다). 부딪힌 모래벽은 1, 넘친 모래벽은 2 깎인다.
 *   둥지에 닿은 물의 높이만큼 알이 떠내려간다. 게 구멍에 들어온 물은 땅속으로 빠진다(거기서 멈춘다).
 * 부화(결정적): 알이 깨면 아기 거북은 바다까지 가장 짧은 길로 간다(앞 → 왼 → 오른 → 뒤 순으로 고름). 벽·돌·바위·게 구멍은 못 지나간다.
 *   갈매기 그림자 안의 '그늘 없는 칸'(둘레 8칸에 벽·돌이 없는 칸)을 지나면 갈매기가 한 마리를 채 간다.
 * 첫 3초: 1판은 모래벽 둘·파도 하나. 둘을 쌓자 파도가 '철썩' 벽에 부서지고, 바로 알이 깨어 아기 거북이 뒤뚱뒤뚱 바다로 퐁당 — 엄마 거북은 눈물 글썽.
 * 목표·보상: 판마다 ★ 바다에 갔다 · ★ 알이 하나도 안 젖었다 · ★ 갈매기에 안 잡혔다.
 *   둥지의 알이 다 떠내려가거나, 길이 막히거나, 아기 거북이 한 마리도 바다에 못 가면 하트 -1, 그 판을 처음부터 다시(같은 해변). 하트 셋을 다 잃거나 8판을 마치면 끝.
 * 펼쳐짐(하는 일이 바뀐다): 1판 모래벽·알·길 → 2판 돌(안 깎이지만 길도 영영 막음)·바위 → 3판 갈매기(길 옆에 그늘을 만든다) → 4판 옆 파도·바위 틈 둥지(나갈 길이 하나)
 *   → 5판 게 구멍(물이 빠지지만 길이 돌아간다) → 6판 밀물(바다가 다가온다) → 7판 둥지 둘(먼저 깨는 둥지의 길은 파도 사이에 열려 있어야) → 8판 폭풍(전부).
 * 웃음(기준 10): 아기 거북이 물가에서 뒤집혀 버둥대다 파도에 다시 뒤집혀 퐁당, 엄마 거북 표정(두근·글썽·엉엉·감격의 눈물),
 *   꽃게 구경꾼 둘이 '가라~!' 응원하고 갈매기엔 '헉!', 알이 떠내려가면 꽃게가 조개 서핑으로 쫓아간다.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.42;
export const COLS = 8, ROWS = 7, N = COLS * ROWS;
/** 칸: 모래 · 모래벽 · 돌(놓은 것·바위) · 게 구멍 · 둥지 · 바다 · 빈 둥지(알이 깨고 남은 자리, 모래처럼 지나간다) */
export const SAND = 0, WALL = 1, ROCK = 2, HOLE = 3, NEST = 4, SEA = 5, PIT = 6;
/** 조각: 모래벽 · 돌 */
export const PW = 0, PR = 1;
const WALL_H = 3, STACK = 2, MAX_H = 7, ROCK_H = 4;
/** 파도 연출(틱): 다가오기 · 한 칸 번질 때마다 · 다 번진 뒤 머무름 · 빠짐 */
const APPROACH = 34, STEP = 6, HOLD = 26, RECEDE = 44;
const RESULT = 150, AUTO = 22, PREVIEW = 120;
/** 부화 연출(틱): 알이 흔들리다 깨기 · 아기 거북 사이 간격 · 한 칸 걷기 · 뒤집혀 버둥 · 끝나고 머무름 */
const CRACK = 40, STAG = 15, WALK = 11, FLIPT = 40, AFTER = 36, STUCK = 110;

type From = 'F' | 'L' | 'R';
/** 예보의 한 칸: 파도(높이·방향·밀물) 또는 부화(몇 번째 둥지) */
export interface Item { kind: 'wave' | 'hatch'; h: number; from: From; rise: boolean; nest: number }
interface StageDef { seq: string; pieces: string; eggs: number[]; rows: number[]; rocks: number; holes: number; gull: number; pocket?: boolean }
/**
 * 판 8개. seq: F=바다 쪽(앞)에서, S=옆(판마다 왼쪽·오른쪽), L/R=왼쪽·오른쪽, 앞에 +면 그 파도 전에 바다가 한 줄 올라온다(밀물), H=알이 깬다(둥지 차례로).
 * eggs·rows: 둥지마다 알 수·줄(0=바닷가), rocks: 바위, holes: 게 구멍, gull: 갈매기 수, pocket: 둥지 양옆·뒤가 바위(바위 틈 둥지)
 * 어려움의 눈금: d = 파도 높이 − 둥지 줄. d=1이면 벽 하나, d=2면 앞·양옆 셋, d=3이면 둥지를 다 둘러야 해서 길은 깎여 열리는 벽으로만 난다.
 */
const STAGES: StageDef[] = [
  { seq: 'F4 H', pieces: 'WW', eggs: [2], rows: [3], rocks: 0, holes: 0, gull: 0 },
  { seq: 'F5 F6 H', pieces: 'WRWW', eggs: [3], rows: [4], rocks: 1, holes: 0, gull: 0 },
  { seq: 'F5 F6 H', pieces: 'WWRWW', eggs: [3], rows: [4], rocks: 1, holes: 0, gull: 1 },
  { seq: 'F5 S5 F6 H', pieces: 'WWRWWW', eggs: [3], rows: [4], rocks: 0, holes: 0, gull: 1, pocket: true },
  { seq: 'F6 S5 F6 H', pieces: 'WWRWWW', eggs: [3], rows: [4], rocks: 1, holes: 2, gull: 1 },
  { seq: 'F5 +F5 +F6 H', pieces: 'WWRWWW', eggs: [3], rows: [5], rocks: 1, holes: 1, gull: 1 },
  { seq: 'F5 H S5 F6 H', pieces: 'WRWWWWW', eggs: [2, 3], rows: [3, 5], rocks: 1, holes: 1, gull: 1 },
  { seq: 'F6 L4 H R4 F6 H', pieces: 'WRWWRWWWW', eggs: [3, 3], rows: [4, 5], rocks: 1, holes: 1, gull: 2 },
];
export const STAGE_COUNT = STAGES.length;
const PIECE_NAME = ['모래벽', '돌'];

export const NB: number[][] = [...Array(N).keys()].map((i) => {
  const r = Math.floor(i / COLS), c = i % COLS, out: number[] = [];
  if (r > 0) out.push(i - COLS);
  if (c > 0) out.push(i - 1);
  if (c < COLS - 1) out.push(i + 1);
  if (r < ROWS - 1) out.push(i + COLS);
  return out;
});
/** 둘레 8칸 (그늘 판정) */
const NB8: number[][] = [...Array(N).keys()].map((i) => {
  const r = Math.floor(i / COLS), c = i % COLS, out: number[] = [];
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      const rr = r + dr, cc = c + dc;
      if ((dr || dc) && rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS) out.push(rr * COLS + cc);
    }
  return out;
});
const rowOf = (i: number) => Math.floor(i / COLS), colOf = (i: number) => i % COLS;

export interface Board { K: Uint8Array; Hh: Int8Array; eggs: number[]; sea: number }
export interface Flood { lvl: Int8Array; hit: Int8Array; over: Uint8Array }

const BK: number[][] = Array.from({ length: 16 }, () => []);
/**
 * 파도 하나가 어디까지 얼마나 높이 들어오나 (결정적, 미리 보기·봇·실제가 모두 같은 함수).
 * 높이 H의 물이 바닷가 첫 줄(옆 파도면 옆 첫 칸)에 선다. 파도가 오는 쪽으로 한 칸 갈 때마다 1, 옆으로 번질 땐 2씩 낮아진다.
 * 벽(모래벽·돌)은 자기 높이 이하의 물을 막고(hit 기록), 넘는 물은 넘은 만큼만 이어 간다. 둥지는 물을 받는다(hit). 게 구멍은 물을 삼킨다.
 */
export function flood(K: Uint8Array, Hh: Int8Array, w: Item, sea: number): Flood {
  const lvl = new Int8Array(N), hit = new Int8Array(N), over = new Uint8Array(N);
  for (const q of BK) q.length = 0;
  const enter = (b: number, inc: number) => {
    if (inc <= 0) return;
    const k = K[b];
    if (k === SEA) return;
    if (k === NEST) {
      if (inc > hit[b]) hit[b] = inc;
      return;
    }
    if (k === WALL || k === ROCK) {
      if (inc > hit[b]) hit[b] = inc;
      const hw = k === ROCK ? ROCK_H : Hh[b];
      if (inc <= hw) return;
      over[b] = 1;
      inc -= hw;
    }
    if (inc > lvl[b]) (lvl[b] = inc), BK[inc].push(b);
  };
  const h = Math.min(15, w.h);
  if (w.from === 'F') for (let c = 0; c < COLS; c++) enter(sea * COLS + c, h);
  else for (let r = sea; r < ROWS; r++) enter(r * COLS + (w.from === 'L' ? 0 : COLS - 1), h);
  for (let l = 15; l >= 1; l--) {
    const q = BK[l];
    for (let j = 0; j < q.length; j++) {
      const b = q[j];
      if (lvl[b] !== l || K[b] === HOLE) continue;
      for (const n of NB[b]) enter(n, l - 1);
    }
  }
  return { lvl, hit, over };
}

/** 파도가 지나간 뒤: 모래벽이 깎이고(맞으면 1, 넘치면 2), 둥지에 닿은 물 높이만큼 알이 떠내려간다 */
export function settle(B: Board, nests: number[], f: Flood) {
  const crumble: number[] = [], gone: number[] = [];
  for (let i = 0; i < N; i++)
    if (B.K[i] === WALL && f.hit[i] > 0) {
      B.Hh[i] -= f.over[i] ? 2 : 1;
      crumble.push(i);
      if (B.Hh[i] <= 0) (B.K[i] = SAND), (B.Hh[i] = 0), gone.push(i);
    }
  const lost = nests.map((c, j) => {
    const v = B.K[c] === NEST ? Math.min(B.eggs[j], f.hit[c]) : 0;
    B.eggs[j] -= v;
    return v;
  });
  return { crumble, gone, lost };
}

/** 밀물: 바닷가 첫 줄이 바다에 잠긴다 (그 줄의 조각은 사라진다) */
export function tideUp(B: Board) {
  for (let c = 0; c < COLS; c++) {
    const i = B.sea * COLS + c;
    B.K[i] = SEA;
    B.Hh[i] = 0;
  }
  B.sea++;
}

const walkable = (k: number) => k === SAND || k === PIT;
/** 아기 거북이 고르는 다음 칸 순서: 앞(바다 쪽) → 왼 → 오른 → 뒤 */
const ORDER: number[][] = [...Array(N).keys()].map((i) => {
  const r = rowOf(i), c = colOf(i), out: number[] = [];
  if (r > 0) out.push(i - COLS);
  if (c > 0) out.push(i - 1);
  if (c < COLS - 1) out.push(i + 1);
  if (r < ROWS - 1) out.push(i + COLS);
  return out;
});
const DIST = new Int16Array(N), QU = new Int16Array(N);
/** 둥지에서 바다까지 가장 짧은 길 [둥지, …, 바닷가 첫 줄 칸]. 없으면 null */
export function route(K: Uint8Array, sea: number, start: number): number[] | null {
  DIST.fill(-1);
  let qh = 0, qt = 0;
  for (let c = 0; c < COLS; c++) {
    const i = sea * COLS + c;
    if (walkable(K[i])) (DIST[i] = 0), (QU[qt++] = i);
  }
  while (qh < qt) {
    const b = QU[qh++];
    for (const n of NB[b]) if (DIST[n] < 0 && walkable(K[n])) (DIST[n] = DIST[b] + 1), (QU[qt++] = n);
  }
  if (rowOf(start) === sea) return [start];
  let best = -1;
  for (const n of ORDER[start]) if (DIST[n] >= 0 && (best < 0 || DIST[n] < DIST[best])) best = n;
  if (best < 0) return null;
  const path = [start, best];
  let cur = best;
  while (DIST[cur] > 0) {
    for (const n of ORDER[cur])
      if (DIST[n] === DIST[cur] - 1) {
        cur = n;
        break;
      }
    path.push(cur);
  }
  return path;
}

/** 벽·돌 그늘: 둘레 8칸에 모래벽이나 돌(바위)이 있으면 갈매기가 못 내려온다 */
export const shaded = (K: Uint8Array, i: number) => NB8[i].some((j) => K[j] === WALL || K[j] === ROCK);
/** 길에서 갈매기 그림자 안의 그늘 없는 첫 칸 (둥지 제외). 없으면 -1 */
export function exposedAt(K: Uint8Array, zone: Uint8Array, path: number[]) {
  for (let k = 1; k < path.length; k++) if (zone[path[k]] && !shaded(K, path[k])) return k;
  return -1;
}

export interface HatchResult { path: number[] | null; babies: number; caught: number; ca: number }
/** 부화: 길을 찾고, 갈매기가 몇 마리를 채 가나. 끝나면 둥지는 빈 자리(모래)가 된다 */
export function hatchOn(B: Board, nests: number[], j: number, zone: Uint8Array, gulls: number): HatchResult {
  const path = route(B.K, B.sea, nests[j]), babies = B.eggs[j];
  const ca = path && gulls ? exposedAt(B.K, zone, path) : -1;
  const caught = ca >= 0 ? Math.min(gulls, babies) : 0;
  B.K[nests[j]] = PIT;
  B.eggs[j] = 0;
  return { path, babies, caught, ca };
}

interface Ev { t: number; kind: string; x: number; y: number; text?: string; col?: string }
interface Crab { home: number; off: number }
interface Hatch extends HatchResult { j: number; ht: number; dur: number; L: number }
export interface TurtleState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'build' | 'wave' | 'hatch' | 'result'; pt: number;
  K: Uint8Array; Hh: Int8Array; nat: Uint8Array; zone: Uint8Array; gulls: number; nests: number[]; eggs: number[]; eggs0: number[]; sea: number;
  seq: Item[]; qi: number; wt: number; fl: Flood | null; arrive: Int16Array; impact: number; end: number; lastLost: number[];
  hatch: Hatch | null; hatched: boolean[];
  pieces: number[]; pi: number; auto: number; wet: Float32Array;
  hearts: number; stars: number; got: number; pts: number; ok: boolean; lostThis: number; caughtThis: number; savedThis: number; saved: number; keep: number; why: string;
  down: boolean; taps: number; seen: Set<string>; events: Ev[]; news: { text: string; t: number } | null; newsQ: string[]; dead: boolean; won: boolean;
  crabs: Crab[]; lastPlace: number; place: Int16Array; peak: Int8Array; pick: number; pickT: number; cryT: number; joyT: number;
}

const ev = (s: TurtleState, kind: string, x: number, y: number, text?: string, col?: string) => s.events.push({ t: s.t, kind, x, y, text, col });
/** 새것 알림 — 여러 개가 한꺼번에 나오면 차례로 보여 준다 */
function see(s: TurtleState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  s.newsQ.push(text);
}
const NEWS_T = 200;

// ───────── 화면 배치 (가로 0~1, 세로 0~A) — 바다 쪽에서 본 3/4 시점: 바다가 앞(아래), 모래언덕이 뒤(위). 뒤쪽 줄이 좁다 ─────────
const CW = 0.108, CH = 0.085, Y0 = 0.345, Y1 = Y0 + ROWS * CH, HZ = 0.016;
const scl = (r: number) => 0.87 + 0.13 * (r / ROWS);
const PX = (c: number, r: number) => 0.5 + (c - COLS / 2) * CW * scl(r);
const PY = (r: number, z = 0) => Y0 + r * CH - z * HZ;
const vrowOf = (i: number) => ROWS - 1 - rowOf(i);
const ccx = (i: number) => PX(colOf(i) + 0.5, vrowOf(i) + 0.5), ccy = (i: number) => PY(vrowOf(i) + 0.5);
/** 아래 쟁반: 조각 미리 보기 · '▶ 버티기' 단추. 위: 예보판 */
const TY = Y1 + 0.195, BTN = { x: 0.635, y: TY + 0.03, w: 0.33, h: 0.11 };
const FC = { y0: 0.09, h: 0.13 };
function cardBox(n: number, k: number) {
  const gap = 0.014, cw = Math.min(0.165, (0.9 - gap * (n - 1)) / n), x0 = 0.5 - (cw * n + gap * (n - 1)) / 2;
  return { x: x0 + k * (cw + gap), y: FC.y0 + 0.037, w: cw, h: 0.085 };
}

function cellAt(x: number, y: number): number {
  if (y < Y0 || y >= Y1) return -1;
  const vr = Math.floor((y - Y0) / CH), c = Math.floor((x - 0.5) / (CW * scl(vr + 0.5)) + COLS / 2);
  return c < 0 || c >= COLS ? -1 : (ROWS - 1 - vr) * COLS + c;
}

function boardOf(s: TurtleState): Board {
  return { K: s.K.slice(), Hh: s.Hh.slice(), eggs: s.eggs.slice(), sea: s.sea };
}

export function canPlace(K: Uint8Array, Hh: Int8Array, i: number, p: number) {
  if (K[i] === SAND) return true;
  return p === PW && K[i] === WALL && Hh[i] < MAX_H;
}
function put(B: { K: Uint8Array; Hh: Int8Array }, i: number, p: number) {
  if (p === PW) B.K[i] === WALL ? (B.Hh[i] = Math.min(MAX_H, B.Hh[i] + STACK)) : ((B.K[i] = WALL), (B.Hh[i] = WALL_H));
  else B.K[i] = ROCK;
}

/**
 * 지금 판으로 예보를 끝까지 돌려 본다 (미리 보기·봇·실제가 같은 함수를 쓴다).
 * 파도마다 그 파도를 맞기 직전의 판으로 물을 계산하고(앞 파도에 깎인 벽 그대로), 부화마다 그때의 길을 찾는다.
 */
export interface SimOut { floods: (Flood | null)[]; hh: (Int8Array | null)[]; eggsAt: number[][]; seas: number[]; hatches: (HatchResult | null)[]; lost: number[]; failAt: number; lived: number; caught: number; saved: number; press: number; eggsLeft: number }
export function simulate(s: TurtleState, B: Board, from = 0, stopOnFail = true): SimOut {
  const n = s.seq.length, out: SimOut = { floods: Array(n).fill(null), hh: Array(n).fill(null), eggsAt: Array(n).fill(null), seas: Array(n).fill(B.sea), hatches: Array(n).fill(null), lost: s.nests.map(() => 0), failAt: -1, lived: 0, caught: 0, saved: 0, press: 0, eggsLeft: 0 };
  const near = NEAR.get(s);
  for (let k = from; k < n; k++) {
    const it = s.seq[k];
    out.eggsAt[k] = B.eggs.slice();
    if (it.kind === 'wave') {
      if (it.rise) tideUp(B);
      out.seas[k] = B.sea;
      if (!stopOnFail) out.hh[k] = B.Hh.slice();
      const f = flood(B.K, B.Hh, it, B.sea);
      out.floods[k] = f;
      if (near) for (let i = 0; i < N; i++) if (near[i]) out.press += f.lvl[i] + f.hit[i] * 2;
      const r = settle(B, s.nests, f);
      r.lost.forEach((v, j) => (out.lost[j] += v));
      if (out.failAt < 0 && s.nests.some((c, j) => B.K[c] === NEST && B.eggs[j] <= 0)) {
        out.failAt = k;
        if (stopOnFail) break;
      }
    } else {
      out.seas[k] = B.sea;
      if (B.K[s.nests[it.nest]] !== NEST) continue;
      const h = hatchOn(B, s.nests, it.nest, s.zone, s.gulls);
      out.hatches[k] = h;
      if (h.path) {
        out.caught += h.caught;
        out.saved += h.babies - h.caught;
        if (h.ca >= 0) out.press += 6;
      }
      if (out.failAt < 0 && (!h.path || h.babies - h.caught <= 0)) {
        out.failAt = k;
        if (stopOnFail) break;
      }
    }
    out.lived++;
  }
  out.eggsLeft = B.eggs.reduce((a, b) => a + b, 0);
  return out;
}

/** 판 구성: 같은 판은 다시 해도 같은 해변 (실패하면 '처음부터 다시 짓기') */
function newStage(s: TurtleState) {
  const d = STAGES[s.stage], r = mulberry32((s.seed * 31 + s.stage * 7919 + 17) >>> 0);
  s.K = new Uint8Array(N);
  s.Hh = new Int8Array(N);
  s.nat = new Uint8Array(N);
  s.zone = new Uint8Array(N);
  s.wet = new Float32Array(N);
  s.place = new Int16Array(N).fill(-999);
  s.peak = new Int8Array(N);
  s.sea = 0;
  s.gulls = d.gull;
  const side = /[SLR]/.test(d.seq);
  // 둥지: 하나면 가운데쯤, 둘이면 양쪽에
  const row = Math.max(...d.rows);
  if (d.eggs.length === 1) s.nests = [d.rows[0] * COLS + (side ? 3 + Math.floor(r() * 2) : 2 + Math.floor(r() * 4))];
  else {
    const c0 = 1 + Math.floor(r() * 2), c1 = 5 + Math.floor(r() * 2), flip = r() < 0.5;
    s.nests = [d.rows[0] * COLS + (flip ? c1 : c0), d.rows[1] * COLS + (flip ? c0 : c1)];
  }
  s.eggs = d.eggs.slice();
  s.eggs0 = d.eggs.slice();
  s.hatched = d.eggs.map(() => false);
  for (const c of s.nests) s.K[c] = NEST;
  const near = (i: number, dmax: number) => s.nests.some((j) => Math.abs(rowOf(i) - rowOf(j)) <= dmax && Math.abs(colOf(i) - colOf(j)) <= dmax);
  const free = (r0: number, r1: number, ok: (i: number) => boolean) => {
    for (let k = 0; k < 80; k++) {
      const i = (r0 + Math.floor(r() * (r1 - r0 + 1))) * COLS + Math.floor(r() * COLS);
      if (s.K[i] === SAND && ok(i)) return i;
    }
    return -1;
  };
  // 바위 틈 둥지: 둥지 양옆과 뒤가 바위 — 나갈 길은 앞(바다 쪽)뿐
  if (d.pocket)
    for (const c of s.nests)
      for (const i of [c - 1, c + 1, c + COLS]) if (i >= 0 && i < N && s.K[i] === SAND) (s.K[i] = ROCK), (s.nat[i] = 1);
  for (let k = 0; k < d.rocks; k++) {
    const i = free(1, row - 1, (j) => !near(j, 1) && !NB8[j].some((n) => s.K[n] === ROCK));
    if (i >= 0) (s.K[i] = ROCK), (s.nat[i] = 1);
  }
  // 갈매기 그림자: 둥지와 바다 사이 가로 3 × 세로 2 (첫 둥지 쪽)
  if (d.gull) {
    const nc = colOf(s.nests[0]), zc = Math.max(1, Math.min(COLS - 2, nc + Math.floor(r() * 3) - 1)), zr = 1 + Math.floor(r() * Math.max(1, rowOf(s.nests[0]) - 2));
    for (let rr = zr; rr < zr + 2; rr++) for (let cc = zc - 1; cc <= zc + 1; cc++) if (s.K[rr * COLS + cc] !== NEST) s.zone[rr * COLS + cc] = 1;
  }
  for (let k = 0; k < d.holes; k++) {
    const i = free(1, row - 1, (j) => !near(j, 1) && !NB[j].some((n) => s.K[n] === HOLE || s.K[n] === ROCK));
    if (i >= 0) s.K[i] = HOLE;
  }
  let hi = 0;
  // 옆 파도: 둥지가 둘이면 먼저 깨는 둥지 쪽에서 (그 둥지는 이미 비었다), 하나면 무작위
  const sideDir: From = s.nests.length > 1 ? (colOf(s.nests[0]) < COLS / 2 ? 'L' : 'R') : r() < 0.5 ? 'L' : 'R';
  s.seq = d.seq.split(' ').map((x) => {
    if (x === 'H') return { kind: 'hatch', h: 0, from: 'F', rise: false, nest: hi++ } as Item;
    const rise = x[0] === '+', y = rise ? x.slice(1) : x;
    return { kind: 'wave', h: Number(y.slice(1)), from: (y[0] === 'S' ? sideDir : y[0]) as From, rise, nest: -1 } as Item;
  });
  const ps: number[] = [...d.pieces].map((ch) => (ch === 'W' ? PW : PR));
  for (let k = ps.length - 1; k > 1; k--) {
    const j = 1 + Math.floor(r() * k);
    [ps[k], ps[j]] = [ps[j], ps[k]];
  }
  s.pieces = ps;
  s.pi = 0;
  s.auto = 0;
  s.qi = 0;
  s.wt = 0;
  s.fl = null;
  s.hatch = null;
  s.phase = 'build';
  s.pt = 0;
  s.lostThis = 0;
  s.caughtThis = 0;
  s.savedThis = 0;
  s.lastLost = s.nests.map(() => 0);
  s.pick = -1;
  s.pickT = -999;
  s.why = '';
  // 꽃게 구경꾼 둘 (둥지 옆 모래에서 구경 — 연출만)
  s.crabs = [];
  for (let k = 0; k < 2; k++) {
    const i = free(Math.max(1, row - 2), Math.min(ROWS - 1, row + 1), (j) => near(j, 2) && !near(j, 0) && !s.crabs.some((q) => q.home === j) && !s.zone[j]);
    if (i >= 0) s.crabs.push({ home: i, off: k * 37 });
  }
  // 새것 알림
  see(s, 'nest', '🥚 알 둥지 — 파도를 다 막으면 알이 깨요');
  see(s, 'wall', '🧱 모래벽 — 파도를 막지만, 아기 거북 길도 막아요');
  if (ps.includes(PR)) see(s, 'rock', '🪨 돌 — 절대 안 깎여요 (대신 길도 영영 막혀요)');
  if (d.gull) see(s, 'gull', '🐦 갈매기 — 그림자 속 탁 트인 칸을 노려요 (벽·돌 옆 그늘은 안전)');
  if (d.pocket) see(s, 'pocket', '🪨 바위 틈 둥지 — 나갈 길은 앞쪽뿐이에요');
  if (s.seq.some((w) => w.kind === 'wave' && w.from !== 'F')) see(s, 'side', '↔️ 옆 파도 — 옆에서도 밀려와요');
  if (d.holes) see(s, 'hole', '🕳️ 게 구멍 — 물이 쏙 빠져요 (아기 거북은 돌아가요)');
  if (s.seq.some((w) => w.rise)) see(s, 'tide', '🌙 밀물 — 파도 전에 바다가 한 줄씩 올라와요');
  if (s.nests.length > 1) see(s, 'twin', '🥚🥚 둥지 둘 — 먼저 깨는 둥지는 파도 사이에 나가요');
  if (s.seq.some((w) => w.from === 'L') && s.seq.some((w) => w.from === 'R')) see(s, 'storm', '⛈️ 폭풍 — 양쪽 옆에서 다 와요');
  ev(s, 'stage', 0.5, Y1 + 0.06, `${s.stage + 1}번째 해변 — 파도 ${s.seq.filter((q) => q.kind === 'wave').length}번!`);
}

function nextItem(s: TurtleState) {
  if (s.qi >= s.seq.length) return endStage(s, true);
  const it = s.seq[s.qi];
  if (it.kind === 'wave') startWave(s);
  else if (s.K[s.nests[it.nest]] !== NEST) (s.qi++, nextItem(s));
  else startHatch(s);
}

function startRun(s: TurtleState) {
  s.qi = 0;
  s.taps++;
  nextItem(s);
}

function startWave(s: TurtleState) {
  const w = s.seq[s.qi];
  s.phase = 'wave';
  if (w.rise) {
    tideUp({ K: s.K, Hh: s.Hh, eggs: s.eggs, sea: s.sea });
    s.sea++;
    ev(s, 'tide', 0.5, PY(ROWS - s.sea), '🌙 밀물! 바다가 한 줄 올라왔어요', '#cfe8ff');
  }
  s.wt = 0;
  s.fl = flood(s.K, s.Hh, w, s.sea);
  s.arrive = new Int16Array(N).fill(-1);
  for (let i = 0; i < N; i++) {
    const v = Math.max(s.fl.lvl[i], s.fl.hit[i]);
    if (v > 0) s.arrive[i] = APPROACH + STEP * (w.h - v);
  }
  s.impact = APPROACH + STEP * w.h + 4;
  s.end = s.impact + HOLD + RECEDE;
  ev(s, 'incoming', 0.5, 0.33, w.from === 'F' ? `파도 — 높이 ${w.h}!` : `옆 파도 — 높이 ${w.h}!`, '#e3f6ff');
}

function waveStep(s: TurtleState) {
  s.wt++;
  const f = s.fl!;
  if (s.wt < s.impact) {
    for (let i = 0; i < N; i++) {
      if (s.arrive[i] !== s.wt) continue;
      const x = ccx(i), y = ccy(i);
      s.wet[i] = 1;
      if (s.K[i] === NEST) ev(s, 'chit', x, y, '알이 젖어요!', '#ffb3a8');
      else if ((s.K[i] === WALL || s.K[i] === ROCK) && f.over[i]) ev(s, 'over', x, y, '넘쳤다!', '#bfe9ff');
      else if (s.K[i] === WALL || s.K[i] === ROCK) ev(s, 'splash', x, y, s.K[i] === ROCK ? '탁!' : '철썩!', '#ffffff');
      else if (s.K[i] === HOLE) ev(s, 'gulp', x, y, '쏙~', '#bfe9ff');
    }
  }
  if (s.wt === s.impact) {
    const B: Board = { K: s.K, Hh: s.Hh, eggs: s.eggs, sea: s.sea };
    const r = settle(B, s.nests, f);
    s.lastLost = r.lost;
    for (const i of r.crumble) ev(s, r.gone.includes(i) ? 'gone' : 'crumble', ccx(i), ccy(i) - 0.02, r.gone.includes(i) ? '와르르' : '-' + (f.over[i] ? 2 : 1), '#f3d9a4');
    if (r.crumble.length) see(s, 'erode', '모래벽이 깎였어요 — 깎여 없어진 자리는 길이 돼요');
    r.lost.forEach((v, j) => {
      const c = s.nests[j];
      if (v > 0) (s.lostThis += v), (s.cryT = s.t), ev(s, s.eggs[j] <= 0 ? 'eggsgone' : 'eggloss', ccx(c), ccy(c) - 0.02, s.eggs[j] <= 0 ? '알이 다 떠내려가요!' : `알 ${v}개 둥실~`, '#ffd6e8');
      else if (s.K[c] === NEST && f.lvl.some((l, i) => l > 0 && Math.abs(rowOf(i) - rowOf(c)) + Math.abs(colOf(i) - colOf(c)) <= 2)) ev(s, 'safe', ccx(c), ccy(c) - 0.03, s.stage === 0 ? '막았다!' : '알 무사!', '#fff1a8');
    });
  }
  if (s.wt >= s.end) {
    s.fl = null;
    s.qi++;
    if (s.nests.some((c, j) => s.K[c] === NEST && s.eggs[j] <= 0)) return (s.why = 'egg'), endStage(s, false);
    nextItem(s);
  }
}

function startHatch(s: TurtleState) {
  const it = s.seq[s.qi], j = it.nest;
  s.phase = 'hatch';
  const B: Board = { K: s.K.slice(), Hh: s.Hh, eggs: s.eggs.slice(), sea: s.sea };
  const h = hatchOn(B, s.nests, j, s.zone, s.gulls);
  const L = h.path ? h.path.length - 1 : 0;
  let dur = CRACK + STUCK;
  if (h.path) {
    dur = 0;
    for (let b = 0; b < h.babies; b++) dur = Math.max(dur, babyEnd(h, L, b));
    dur += AFTER;
  }
  s.hatch = { ...h, j, ht: 0, dur, L };
  see(s, 'hatch', '🐣 알이 깨요 — 아기 거북은 바다까지 가장 짧은 길로 가요');
}

/** 아기 거북 b의 일정 (틱): 출발 · 바다 도착 · 끝 (뒤집힘 개그는 처음 무사한 아기 거북 하나만) */
const babyStart = (b: number) => CRACK + b * STAG;
const babySea = (L: number, b: number) => babyStart(b) + (L + 1) * WALK;
const flipper = (h: HatchResult) => (h.caught < h.babies ? h.caught : -1);
function babyEnd(h: HatchResult, L: number, b: number) {
  if (b < h.caught) return babyStart(b) + h.ca * WALK + 40;
  return babySea(L, b) + (b === flipper(h) ? FLIPT : 0) + 10;
}

function hatchStep(s: TurtleState) {
  const h = s.hatch!, c = s.nests[h.j];
  h.ht++;
  const ht = h.ht;
  if (ht === 2) ev(s, 'wobble', ccx(c), ccy(c) - 0.03, '톡… 톡…', '#fff6d6');
  if (ht === CRACK) ev(s, 'crack', ccx(c), ccy(c) - 0.02, h.path ? '쩍! 뽀록!' : '쩍!', '#fff1a8');
  if (!h.path) {
    if (ht === CRACK + 20) (s.cryT = s.t), ev(s, 'stuck', ccx(c), ccy(c) - 0.05, '길이 막혔어요!', '#ffb3a8');
  } else {
    const p = h.path, L = h.L, last = p[L];
    for (let b = 0; b < h.babies; b++) {
      if (b < h.caught) {
        if (ht === babyStart(b) + h.ca * WALK) {
          const at = p[h.ca];
          (s.cryT = s.t), ev(s, 'snatch', ccx(at), ccy(at) - 0.02, '갈매기가 채 갔다!', '#ffb3a8');
        }
        continue;
      }
      const sx = ccx(last), sy = PY(ROWS - s.sea + 0.35);
      if (b === flipper(h) && ht === babySea(L, b)) ev(s, 'flip', sx, sy, '뒤집혔다! 버둥버둥', '#fff6d6');
      if (ht === babySea(L, b) + (b === flipper(h) ? FLIPT : 0)) (s.joyT = s.t), ev(s, 'plop', sx, sy, '퐁당!', '#e3f6ff');
    }
  }
  if (ht >= h.dur) {
    s.hatch = null;
    s.hatched[h.j] = true;
    s.K[c] = PIT;
    s.eggs[h.j] = 0;
    s.caughtThis += h.path ? h.caught : 0;
    const got = h.path ? h.babies - h.caught : 0;
    s.savedThis += got;
    s.qi++;
    if (got <= 0) return (s.why = h.path ? 'gull' : 'stuck'), endStage(s, false);
    nextItem(s);
  }
}

function endStage(s: TurtleState, ok: boolean) {
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  s.fl = null;
  s.hatch = null;
  if (ok) {
    const left = s.pieces.length - s.pi;
    const st = 1 + (s.lostThis === 0 ? 1 : 0) + (s.caughtThis === 0 ? 1 : 0);
    s.got = st;
    s.stars += st;
    s.keep = left;
    s.saved += s.savedThis;
    s.pts += 20 + st * 10 + s.savedThis * 5 + left * 3;
    const last = s.stage === STAGES.length - 1;
    if (last) (s.won = true), (s.pts += 30);
    s.joyT = s.t;
    ev(s, 'clear', 0.5, Y1 + 0.06, `${s.stage + 1}번째 해변 성공! ${'★'.repeat(st)}${'☆'.repeat(3 - st)}`);
  } else {
    s.hearts--;
    s.cryT = s.t;
    ev(s, 'fail', 0.5, Y1 + 0.06, s.hearts > 0 ? '아기 거북이 바다에 못 갔어요… 하트 -1' : '끝');
  }
}

export const turtlebeach: GameDef<TurtleState> = {
  id: 'turtlebeach',
  name: '아기 거북 해변',
  genes: ['fortify', 'forecast', 'pointer'],
  twist: '파도를 다 막고 나면 모래 속 알이 톡톡 깨어 아기 거북들이 바다로 간다 — 방금 쌓은 내 벽이 이번엔 아기 거북의 길을 막으니, 막을 곳과 열어 둘 곳을 처음부터 같이 계획한다',
  rules: [
    '모래를 톡 = 조각 놓기. ▶를 누르면 예보한 파도가 와요 — 높이만큼 들어오고, 둥지에 닿은 물 높이만큼 알이 떠내려가요.',
    '파도가 끝나면 알이 깨요: 아기 거북은 바다까지 가장 짧은 길로 가요. 벽은 길도 막아요 — 길을 남겨 두세요!',
  ],
  controls: 'touch',
  hint: '모래를 톡 = 조각 놓기 · ▶ 버티기 / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '아기 거북이 바다로 가는 해변 디오라마',
    mood: '햇살 가득한 모래사장 한 덩이 — 모래 속 둥지의 알이 톡톡 깨고, 아기 거북들이 뒤뚱뒤뚱 바다로 간다. 엄마 거북은 모래언덕에서 눈물을 글썽이고, 꽃게 구경꾼이 응원하고, 갈매기 그림자가 맴돈다. 판이 지날수록 해가 기울어 노을과 별.',
    palette: { bg: '#1f4a5c', ink: '#fffaf0', muted: '#9fc3cc', accent: '#7ee0a8', hot: '#ff6b5a', soft: '#f3dca4' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'build', pt: 0,
      K: new Uint8Array(N), Hh: new Int8Array(N), nat: new Uint8Array(N), zone: new Uint8Array(N), gulls: 0, nests: [], eggs: [], eggs0: [], sea: 0,
      seq: [], qi: 0, wt: 0, fl: null, arrive: new Int16Array(N), impact: 0, end: 0, lastLost: [],
      hatch: null, hatched: [],
      pieces: [], pi: 0, auto: 0, wet: new Float32Array(N),
      hearts: 3, stars: 0, got: 0, pts: 0, ok: false, lostThis: 0, caughtThis: 0, savedThis: 0, saved: 0, keep: 0, why: '',
      down: false, taps: 0, seen: new Set<string>(), events: [], news: null, newsQ: [], dead: false, won: false,
      crabs: [], lastPlace: -999, place: new Int16Array(N), peak: new Int8Array(N), pick: -1, pickT: -999, cryT: -999, joyT: -999,
    } as TurtleState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    s.pt++;
    s.events = s.events.filter((e) => s.t - e.t < 110);
    if ((!s.news || s.t - s.news.t >= NEWS_T) && s.newsQ.length) s.news = { text: s.newsQ.shift()!, t: s.t };
    for (let i = 0; i < N; i++) if (s.wet[i] > 0 && s.phase !== 'wave') s.wet[i] = Math.max(0, s.wet[i] - 1 / 420);
    const p = inp.pointer ?? null, press = !!p && !s.down;
    s.down = !!p;
    if (s.phase === 'result') {
      if (s.pt >= RESULT) {
        if (s.ok) {
          if (s.won) s.dead = true;
          else s.stage++, newStage(s);
        } else if (s.hearts <= 0) s.dead = true;
        else newStage(s);
      }
      return;
    }
    if (s.phase === 'wave') return waveStep(s);
    if (s.phase === 'hatch') return hatchStep(s);
    // 짓기: 다 놓으면 잠깐 뒤 파도
    if (s.auto > 0 && --s.auto === 0) return startRun(s);
    if (!press || !p || s.auto > 0) return;
    const x = p.x, y = p.y * A;
    if (x >= BTN.x && x <= BTN.x + BTN.w && y >= BTN.y && y <= BTN.y + BTN.h) return startRun(s);
    // 예보 카드를 톡 = 그 파도(또는 부화)를 미리 보기
    for (let k = 0; k < s.seq.length; k++) {
      const b = cardBox(s.seq.length, k);
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return void ((s.pick = k), (s.pickT = s.t));
    }
    const i = cellAt(x, y), pc = s.pieces[s.pi];
    if (i < 0 || pc === undefined) return;
    if (!canPlace(s.K, s.Hh, i, pc))
      return void ev(s, 'nope', ccx(i), ccy(i), s.K[i] === NEST ? '알 둥지예요!' : s.K[i] === HOLE ? '게 구멍이에요' : s.K[i] === SEA ? '바다예요' : '여긴 안 돼요', '#ffd6cc');
    const stack = s.K[i] === WALL;
    put(s, i, pc);
    s.place[i] = s.t;
    if (pc === PW) s.peak[i] = Math.max(s.peak[i], s.Hh[i]);
    s.lastPlace = s.t;
    s.pi++;
    s.taps++;
    ev(s, 'place', ccx(i), ccy(i), stack ? '더 높게!' : PIECE_NAME[pc], pc === PR ? '#d9dde3' : '#ffe9b8');
    if (stack) see(s, 'stack', '모래벽 위에 또 쌓으면 더 높아져요 (+2)');
    if (s.pi >= s.pieces.length) s.auto = AUTO;
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
const NEAR = new WeakMap<object, Uint8Array>();
function nearMask(s: TurtleState) {
  const m = new Uint8Array(N);
  for (const j of s.nests) for (let i = 0; i < N; i++) if (Math.abs(rowOf(i) - rowOf(j)) <= 1 && Math.abs(colOf(i) - colOf(j)) <= 1) m[i] = 1;
  NEAR.set(s, m);
}
/** 잘하는 봇이 내다보는 값: 이 판을 끝까지 돌려 본 점수(실패면 음수) + 둥지 둘레에 차오른 물·갈매기 위험(같은 점수끼리 가르는 길잡이) */
function judge(s: TurtleState, B0: Board, leftover: number) {
  const B: Board = { K: B0.K.slice(), Hh: B0.Hh.slice(), eggs: B0.eggs.slice(), sea: B0.sea };
  const o = simulate(s, B, 0, true);
  const lost = o.lost.reduce((a, b) => a + b, 0);
  const st = 1 + (lost === 0 ? 1 : 0) + (o.caught === 0 ? 1 : 0);
  const pts = o.failAt >= 0 ? -400 + o.lived * 40 + o.eggsLeft * 10 + o.saved * 5 : 20 + st * 10 + o.saved * 5 + leftover * 3;
  return { pts, press: o.press };
}

/** 판(칸 종류·벽 높이)의 지문 — 빔 탐색에서 같은 판을 두 번 보지 않게 */
function hashOf(K: Uint8Array, Hh: Int8Array) {
  let h = 2166136261;
  for (let i = 0; i < N; i++) h = Math.imul(h ^ (K[i] * 16 + Hh[i]), 16777619);
  return h >>> 0;
}
const BEAM = 10;
/**
 * 앞으로 놓을 조각을 차례로: 판을 끝까지 돌려 보는 빔 탐색(폭 10). 조각 하나 놓을 때마다 모든 빈 칸을 시험하고 좋은 판 10개만 남긴다.
 * 몇 개까지 놓을지도 점수로 고른다(남긴 조각 +3). 아무리 놓아도 실패하면 가장 오래 버티는 판까지 다 놓는다.
 */
function plan(s: TurtleState): number[] {
  nearMask(s);
  const B0 = boardOf(s), total = s.pieces.length;
  type Node = { K: Uint8Array; Hh: Int8Array; seq: number[]; v: number; pts: number };
  const val = (j: { pts: number; press: number }) => j.pts * 50 - j.press;
  const j0 = judge(s, B0, total - s.pi);
  let beam: Node[] = [{ K: B0.K, Hh: B0.Hh, seq: [], v: val(j0), pts: j0.pts }];
  let best = beam[0];
  for (let k = s.pi; k < total; k++) {
    const pc = s.pieces[k], left = total - k - 1, next: Node[] = [], seen = new Set<number>();
    for (const nd of beam)
      for (let i = s.sea * COLS; i < N; i++) {
        if (!canPlace(nd.K, nd.Hh, i, pc)) continue;
        const K2 = nd.K.slice(), H2 = nd.Hh.slice();
        put({ K: K2, Hh: H2 }, i, pc);
        const hk = hashOf(K2, H2);
        if (seen.has(hk)) continue;
        seen.add(hk);
        const j = judge(s, { ...B0, K: K2, Hh: H2 }, left), n2 = { K: K2, Hh: H2, seq: [...nd.seq, i], v: val(j), pts: j.pts };
        next.push(n2);
        if (n2.pts > best.pts || (n2.pts === best.pts && n2.v > best.v)) best = n2;
      }
    if (!next.length) break;
    next.sort((a, b) => b.v - a.v);
    beam = next.slice(0, BEAM);
  }
  return best.pts < 0 ? beam[0].seq : best.seq;
}

const brain = new WeakMap<object, { key: string; base: number; seq: number[] }>();
const NO: Input = { tap: false, dir: 0, pointer: null };
const tapCell = (i: number): Input => ({ tap: false, dir: 0, pointer: { x: ccx(i), y: ccy(i) / A } });
const tapBtn: Input = { tap: false, dir: 0, pointer: { x: BTN.x + BTN.w / 2, y: (BTN.y + BTN.h / 2) / A } };

/** 봇: 판을 끝까지 돌려 보며 자리를 고른다 — 어디를 막고 어디를 열어 둘지, 언제 멈출지(남긴 조각도 점수) */
export const turtlebeachSmart: Bot<TurtleState> = {
  name: '거북 지킴이',
  act(s) {
    if (s.phase !== 'build' || s.down || s.auto > 0) return NO;
    const key = `${s.stage}:${s.hearts}`;
    let m = brain.get(s);
    if (!m || m.key !== key) brain.set(s, (m = { key, base: s.pi, seq: plan(s) }));
    const j = s.pi - m.base;
    return j < m.seq.length ? tapCell(m.seq[j]) : tapBtn;
  },
};

const dumbAt = new WeakMap<object, number>();
/** 봇: 아무 데나, 아무 때나 톡 (대개 모래 위, 가끔 화면 아무 데나 — ▶를 일찍 누르기도) */
export const turtlebeachRandom: Bot<TurtleState> = {
  name: '아무 데나 톡',
  act(s, rng) {
    const next = dumbAt.get(s) ?? 20 + Math.floor(rng() * 60);
    if (s.t < next) return NO;
    dumbAt.set(s, s.t + 30 + Math.floor(rng() * 110));
    if (rng() < 0.1) return { tap: false, dir: 0, pointer: { x: rng(), y: rng() } };
    return tapCell(Math.floor(rng() * N));
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
function drawAll(ctx: CanvasRenderingContext2D, s: TurtleState, w: number, h: number, th: Theme) {
  ctx.fillStyle = th.bg;
  ctx.fillRect(0, 0, w, h);
  void s;
}
