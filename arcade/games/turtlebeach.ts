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
const hsh = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const hex = (c: string) => [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16));
const mix = (a: string, b: string, t: number) => {
  const p = hex(a), q = hex(b), k = Math.max(0, Math.min(1, t));
  return '#' + p.map((v, j) => Math.round(v + (q[j] - v) * k).toString(16).padStart(2, '0')).join('');
};
const HOR = 0.275;
/** 판마다 하루가 흐른다: 아침 → 한낮 → 노을 → 저녁 (하늘 위·아래, 먼 바다, 얕은 바다) */
const SKY: [string, string, string, string][] = [
  ['#7cc8f2', '#e9f8ff', '#2a8fc0', '#62d6d6'],
  ['#66bdf0', '#e2f5ff', '#2588bd', '#5ad2d4'],
  ['#55b1ec', '#dcf1ff', '#2280b8', '#55cdd2'],
  ['#4fa7e5', '#eaf3ff', '#227ab2', '#52c6cf'],
  ['#5b9edb', '#fff0d2', '#2a72a8', '#5cc1c8'],
  ['#5b84c6', '#ffd6a6', '#2f6698', '#6ab6bf'],
  ['#4b5aa4', '#ffb07c', '#334f86', '#7aa7b6'],
  ['#2e346e', '#ff9068', '#2b3a6c', '#6f8fa8'],
];
const recentSay = new WeakMap<object, { x: number; y: number; t: number }[]>();

type Mood = 'calm' | 'wow' | 'proud' | 'strain' | 'dizzy' | 'happy' | 'sleep';
/** 꽃게 구경꾼 (앞에서 본 모습). claws: 0 내림 ~ 1 번쩍 */
function drawCrab(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, t: number, mood: Mood, claws: number, opt: { look?: number; tilt?: number; col?: string } = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(opt.tilt ?? 0);
  const col = opt.col ?? '#ff6b45';
  ctx.fillStyle = 'rgba(60,30,10,.25)';
  ctx.beginPath();
  ctx.ellipse(0, z * 0.05, z * 1.25, z * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = mix(col, '#7a1f0c', 0.35);
  ctx.lineWidth = Math.max(1.2, z * 0.16);
  ctx.lineCap = 'round';
  for (const sd of [-1, 1])
    for (let k = 0; k < 3; k++) {
      const sw = Math.sin(t * 0.35 + k * 1.7 + sd) * z * 0.12;
      ctx.beginPath();
      ctx.moveTo(sd * z * (0.55 + k * 0.12), -z * 0.35 + k * z * 0.1);
      ctx.lineTo(sd * z * (1.05 + k * 0.08), -z * 0.42 + k * z * 0.12 + sw);
      ctx.lineTo(sd * z * (1.2 + k * 0.1), z * 0.02 + sw * 0.5);
      ctx.stroke();
    }
  for (const sd of [-1, 1]) {
    const ax = sd * z * (0.9 + 0.25 * claws), ay = -z * (0.75 + 1.0 * claws) + Math.sin(t * 0.2 + sd) * z * 0.06 * (mood === 'happy' ? 3 : 1);
    ctx.strokeStyle = mix(col, '#9a2a12', 0.25);
    ctx.lineWidth = Math.max(1.5, z * 0.22);
    ctx.beginPath();
    ctx.moveTo(sd * z * 0.7, -z * 0.55);
    ctx.quadraticCurveTo(sd * z * 1.15, -z * (0.6 + 0.4 * claws), ax, ay);
    ctx.stroke();
    const open = 0.35 + 0.25 * Math.abs(Math.sin(t * (mood === 'happy' || mood === 'proud' ? 0.4 : 0.08) + sd));
    ctx.fillStyle = mix(col, '#ffffff', 0.08);
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(sd * (0.4 - claws * 0.5));
    ctx.beginPath();
    ctx.ellipse(0, -z * 0.18, z * 0.36, z * 0.44, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = mix(col, '#5a1206', 0.5);
    ctx.lineWidth = Math.max(1, z * 0.09);
    ctx.beginPath();
    ctx.moveTo(0, -z * 0.18);
    ctx.lineTo(sd * z * 0.18 * open, -z * 0.62);
    ctx.stroke();
    ctx.restore();
  }
  const g = ctx.createLinearGradient(0, -z * 1.2, 0, z * 0.1);
  g.addColorStop(0, mix(col, '#ffd0b0', 0.25));
  g.addColorStop(1, mix(col, '#8a1e0a', 0.35));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, -z * 0.5, z * 0.95, z * 0.62, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.28)';
  ctx.beginPath();
  ctx.ellipse(-z * 0.3, -z * 0.78, z * 0.32, z * 0.14, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,170,190,.7)';
  for (const sd of [-1, 1]) (ctx.beginPath(), ctx.ellipse(sd * z * 0.55, -z * 0.38, z * 0.16, z * 0.1, 0, 0, Math.PI * 2), ctx.fill());
  const look = (opt.look ?? 0) * z * 0.08;
  for (const sd of [-1, 1]) {
    const ex = sd * z * 0.32, ey = -z * 1.38;
    ctx.strokeStyle = mix(col, '#7a1f0c', 0.3);
    ctx.lineWidth = Math.max(1.2, z * 0.14);
    ctx.beginPath();
    ctx.moveTo(sd * z * 0.25, -z * 0.95);
    ctx.lineTo(ex, ey + z * 0.15);
    ctx.stroke();
    const er = z * (mood === 'wow' ? 0.36 : 0.27);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex, ey, er, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2a0e06';
    ctx.fillStyle = '#2a0e06';
    ctx.lineWidth = Math.max(1, z * 0.1);
    if (mood === 'proud' || mood === 'happy') (ctx.beginPath(), ctx.arc(ex, ey + er * 0.25, er * 0.55, Math.PI * 1.1, Math.PI * 1.9), ctx.stroke());
    else if (mood === 'dizzy') {
      ctx.beginPath();
      for (let a = 0; a < 12; a++) {
        const an = a * 0.9 + t * 0.3 * sd, rr = er * 0.08 * a;
        ctx.lineTo(ex + Math.cos(an) * rr, ey + Math.sin(an) * rr);
      }
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(ex + look, ey + er * 0.1, er * (mood === 'wow' ? 0.32 : 0.5), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex + look - er * 0.15, ey - er * 0.15, er * 0.15, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.strokeStyle = '#4a1206';
  ctx.fillStyle = '#4a1206';
  ctx.lineWidth = Math.max(1, z * 0.1);
  ctx.beginPath();
  if (mood === 'wow') (ctx.ellipse(0, -z * 0.38, z * 0.13, z * 0.17, 0, 0, Math.PI * 2), ctx.fill());
  else ctx.arc(0, -z * 0.45, z * (mood === 'proud' || mood === 'happy' ? 0.24 : 0.16), 0.15 * Math.PI, 0.85 * Math.PI), ctx.stroke();
  ctx.restore();
}

/** 가리비 조개 (꽃게 서핑 보드) */
function drawShell(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, col = '#ffb3c7') {
  ctx.save();
  ctx.translate(x, y);
  const g = ctx.createRadialGradient(0, 0, z * 0.1, 0, -z * 0.2, z * 1.1);
  g.addColorStop(0, '#fff6f0');
  g.addColorStop(1, col);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-z * 0.25, z * 0.1);
  for (let k = 0; k <= 6; k++) {
    const a = Math.PI * (1.05 + (k / 6) * 0.9);
    ctx.quadraticCurveTo(Math.cos(a - 0.075 * Math.PI) * z * 1.15, Math.sin(a - 0.075 * Math.PI) * z * 1.15 - z * 0.05, Math.cos(a) * z, Math.sin(a) * z - z * 0.05);
  }
  ctx.lineTo(z * 0.25, z * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(190,90,120,.55)';
  ctx.lineWidth = Math.max(0.7, z * 0.08);
  for (let k = 1; k < 6; k++) {
    const a = Math.PI * (1.05 + (k / 6) * 0.9);
    ctx.beginPath();
    ctx.moveTo(0, z * 0.05);
    ctx.lineTo(Math.cos(a) * z * 0.95, Math.sin(a) * z * 0.95 - z * 0.05);
    ctx.stroke();
  }
  ctx.restore();
}

/** 갈매기 (옆모습). fly: 날갯짓, carry: 아기 거북을 물고 있나 */
function drawGull(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, t: number, fly: boolean, dir: number, open = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  if (!fly) {
    ctx.strokeStyle = '#f4a340';
    ctx.lineWidth = Math.max(1, z * 0.12);
    ctx.beginPath();
    ctx.moveTo(-z * 0.15, z * 0.3);
    ctx.lineTo(-z * 0.2, z * 0.85);
    ctx.moveTo(z * 0.15, z * 0.3);
    ctx.lineTo(z * 0.12, z * 0.85);
    ctx.stroke();
  }
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(0, 0, z * 0.8, z * 0.42, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c7d0da';
  ctx.beginPath();
  if (fly) {
    const fl = Math.sin(t * 0.5) * z * 0.9;
    ctx.moveTo(-z * 0.3, -z * 0.1);
    ctx.quadraticCurveTo(-z * 0.1, -z * 0.6 - fl, z * 0.3, -z * 1.2 - fl);
    ctx.quadraticCurveTo(z * 0.25, -z * 0.4, z * 0.35, -z * 0.05);
  } else ctx.ellipse(-z * 0.15, -z * 0.05, z * 0.55, z * 0.25, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5b6470';
  ctx.beginPath();
  ctx.moveTo(-z * 0.75, -z * 0.05);
  ctx.lineTo(-z * 1.15, -z * 0.15);
  ctx.lineTo(-z * 0.8, z * 0.15);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(z * 0.7, -z * 0.35, z * 0.33, 0, Math.PI * 2);
  ctx.fill();
  // 눈썹 (얄밉게)
  ctx.strokeStyle = '#1b1b1b';
  ctx.lineWidth = Math.max(1, z * 0.07);
  ctx.beginPath();
  ctx.moveTo(z * 0.62, -z * 0.55);
  ctx.lineTo(z * 0.92, -z * 0.5);
  ctx.stroke();
  ctx.fillStyle = '#1b1b1b';
  ctx.beginPath();
  ctx.arc(z * 0.8, -z * 0.42, z * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f4a340';
  ctx.beginPath();
  ctx.moveTo(z * 0.95, -z * 0.38);
  ctx.lineTo(z * 1.4, open ? -z * 0.42 : -z * 0.3);
  ctx.lineTo(z * 0.95, -z * 0.24);
  ctx.fill();
  if (open) {
    ctx.beginPath();
    ctx.moveTo(z * 0.95, -z * 0.26);
    ctx.lineTo(z * 1.3, -z * 0.14);
    ctx.lineTo(z * 0.95, -z * 0.2);
    ctx.fill();
  }
  ctx.restore();
}

type TMood = 'calm' | 'wow' | 'happy' | 'tears' | 'cry' | 'strain' | 'sleep' | 'dizzy';
/**
 * 거북 (앞에서 본 3/4 모습 — 머리가 화면 앞, 바다 쪽). x,y = 땅에 닿는 점, z = 등딱지 반지름.
 * flip: 뒤집혀 배를 보이고 버둥 · walk: 걸음 위상 · dir: 옆으로 갈 때 머리 방향(-1~1) · wave: 앞발 흔들기(엄마)
 */
function drawTurtle(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, t: number, mood: TMood, o: { flip?: boolean; walk?: number; dir?: number; wave?: number; mama?: boolean } = {}) {
  ctx.save();
  ctx.translate(x, y);
  const dir = o.dir ?? 0, wk = o.walk ?? 0;
  ctx.fillStyle = 'rgba(40,30,10,.28)';
  ctx.beginPath();
  ctx.ellipse(0, 0, z * 1.25, z * 0.36, 0, 0, Math.PI * 2);
  ctx.fill();
  const skin = o.mama ? '#7fbf8a' : '#8fd6a0', skinD = o.mama ? '#4f8f62' : '#5aa874';
  const flipper = (fx: number, fy: number, rx: number, ry: number, rot: number) => {
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(rot);
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = skinD;
    ctx.beginPath();
    ctx.ellipse(rx * 0.3, ry * 0.2, rx * 0.35, ry * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  if (o.flip) {
    // 뒤집힌 거북: 배딱지가 위, 네 발이 허공에서 버둥버둥
    for (const sd of [-1, 1])
      for (const fr of [0, 1]) {
        const sw = Math.sin(t * 0.9 + sd * 2 + fr * 1.3) * 0.6;
        flipper(sd * z * (0.8 + fr * 0.1), -z * (fr ? 0.35 : 0.95), z * 0.45, z * 0.2, sd * (-0.9 + sw) + (fr ? 0.6 * sd : 0));
      }
    const g = ctx.createLinearGradient(0, -z * 1.2, 0, 0);
    g.addColorStop(0, '#5d8f4a');
    g.addColorStop(1, '#2f5a2c');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, -z * 0.45, z, z * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f6e3a4';
    ctx.beginPath();
    ctx.ellipse(0, -z * 0.62, z * 0.78, z * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(160,120,50,.6)';
    ctx.lineWidth = Math.max(0.8, z * 0.06);
    ctx.beginPath();
    ctx.moveTo(0, -z * 1.05);
    ctx.lineTo(0, -z * 0.2);
    ctx.moveTo(-z * 0.65, -z * 0.62);
    ctx.lineTo(z * 0.65, -z * 0.62);
    ctx.stroke();
    // 머리 (거꾸로, 아래쪽에서 버둥)
    const hx = Math.sin(t * 0.7) * z * 0.15, hy = -z * 0.02;
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(hx, hy, z * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1d2a1a';
    ctx.lineWidth = Math.max(1, z * 0.09);
    for (const sd of [-1, 1]) {
      const ex = hx + sd * z * 0.16, ey = hy + z * 0.05;
      ctx.beginPath();
      for (let a = 0; a < 9; a++) {
        const an = a * 0.9 + t * 0.4 * sd, rr = z * 0.012 * a;
        ctx.lineTo(ex + Math.cos(an) * rr, ey + Math.sin(an) * rr);
      }
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.ellipse(hx, hy - z * 0.17, z * 0.08, z * 0.06, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#7a2a1a';
    ctx.fill();
    ctx.restore();
    return;
  }
  // 뒷발 · 앞발 (걷기: 번갈아 노 젓기, 엄마: 앞발 흔들기)
  for (const sd of [-1, 1]) {
    const ph = Math.sin(wk * Math.PI * 2 + (sd > 0 ? Math.PI : 0));
    flipper(sd * z * 0.78, -z * 0.15 + ph * z * 0.05, z * 0.32, z * 0.18, sd * (0.5 + ph * 0.25));
  }
  // 등딱지 (돔)
  const sy = -z * 0.62;
  const g = ctx.createRadialGradient(-z * 0.3, sy - z * 0.35, z * 0.1, 0, sy, z * 1.1);
  g.addColorStop(0, o.mama ? '#9cc77a' : '#b6e08a');
  g.addColorStop(0.6, o.mama ? '#5e8f45' : '#6fae52');
  g.addColorStop(1, o.mama ? '#3a5f2d' : '#447a35');
  ctx.fillStyle = o.mama ? '#2f4f26' : '#3b6a2e';
  ctx.beginPath();
  ctx.ellipse(0, sy + z * 0.12, z * 1.02, z * 0.62, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, sy, z, z * 0.68, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = o.mama ? '#24401c' : '#2c5222';
  ctx.lineWidth = Math.max(1, z * 0.07);
  ctx.stroke();
  // 육각 무늬
  ctx.strokeStyle = o.mama ? 'rgba(40,70,30,.55)' : 'rgba(50,90,40,.5)';
  ctx.lineWidth = Math.max(0.8, z * 0.06);
  const hexAt = (hx: number, hy: number, r: number) => {
    ctx.beginPath();
    for (let q = 0; q < 6; q++) ctx.lineTo(hx + Math.cos((q / 6) * Math.PI * 2) * r, hy + Math.sin((q / 6) * Math.PI * 2) * r * 0.7);
    ctx.closePath();
    ctx.stroke();
  };
  hexAt(0, sy - z * 0.08, z * 0.32);
  for (const sd of [-1, 1]) hexAt(sd * z * 0.55, sy + z * 0.02, z * 0.24);
  ctx.fillStyle = 'rgba(255,255,255,.3)';
  ctx.beginPath();
  ctx.ellipse(-z * 0.35, sy - z * 0.38, z * 0.25, z * 0.1, -0.4, 0, Math.PI * 2);
  ctx.fill();
  // 앞발
  for (const sd of [-1, 1]) {
    const ph = Math.sin(wk * Math.PI * 2 + (sd > 0 ? 0 : Math.PI));
    const wv = o.wave && sd > 0 ? Math.sin(t * 0.35) * 0.6 - 0.9 : 0;
    flipper(sd * z * (0.95 + (wv ? 0.15 : 0)), -z * (0.42 + (wv ? 0.45 : 0)) + ph * z * 0.06, z * 0.5, z * 0.2, sd * (0.35 + ph * 0.3) + wv * sd);
  }
  // 머리 (앞으로 쏙)
  const hx = dir * z * 0.35, hy = -z * 0.25, hr = z * (o.mama ? 0.52 : 0.48);
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(hx, hy, hr, hr * 0.92, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.25)';
  ctx.beginPath();
  ctx.ellipse(hx - hr * 0.3, hy - hr * 0.45, hr * 0.35, hr * 0.18, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // 볼
  ctx.fillStyle = 'rgba(255,150,160,.55)';
  for (const sd of [-1, 1]) (ctx.beginPath(), ctx.ellipse(hx + sd * hr * 0.58, hy + hr * 0.25, hr * 0.2, hr * 0.12, 0, 0, Math.PI * 2), ctx.fill());
  // 눈
  const er = hr * (mood === 'wow' ? 0.3 : 0.24);
  for (const sd of [-1, 1]) {
    const ex = hx + sd * hr * 0.38 + dir * hr * 0.1, ey = hy - hr * 0.12;
    ctx.strokeStyle = '#1d2a1a';
    ctx.fillStyle = '#1d2a1a';
    ctx.lineWidth = Math.max(1, hr * 0.1);
    if (mood === 'happy' || mood === 'tears') {
      ctx.beginPath();
      ctx.arc(ex, ey + er * 0.3, er * 0.8, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    } else if (mood === 'cry') {
      ctx.beginPath();
      ctx.arc(ex, ey - er * 0.2, er * 0.8, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    } else if (mood === 'strain') {
      ctx.beginPath();
      ctx.moveTo(ex - sd * er * 0.7, ey - er * 0.6);
      ctx.lineTo(ex + sd * er * 0.5, ey);
      ctx.lineTo(ex - sd * er * 0.7, ey + er * 0.6);
      ctx.stroke();
    } else if (mood === 'sleep') {
      ctx.beginPath();
      ctx.moveTo(ex - er * 0.7, ey);
      ctx.lineTo(ex + er * 0.7, ey);
      ctx.stroke();
    } else if (mood === 'dizzy') {
      ctx.beginPath();
      for (let a = 0; a < 10; a++) {
        const an = a * 0.9 + t * 0.3 * sd, rr = er * 0.1 * a;
        ctx.lineTo(ex + Math.cos(an) * rr, ey + Math.sin(an) * rr);
      }
      ctx.stroke();
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex, ey, er, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1d2a1a';
      ctx.beginPath();
      ctx.arc(ex + dir * er * 0.3, ey + er * 0.1, er * (mood === 'wow' ? 0.45 : 0.62), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex + dir * er * 0.3 - er * 0.2, ey - er * 0.2, er * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // 눈물: 글썽(반짝 맺힘) · 엉엉(줄줄)
  if (mood === 'tears' || mood === 'cry') {
    for (const sd of [-1, 1]) {
      const ex = hx + sd * hr * 0.55, ey = hy + hr * 0.05;
      if (mood === 'tears') {
        const tw = 0.6 + 0.4 * Math.sin(t * 0.25 + sd);
        ctx.fillStyle = `rgba(150,220,255,${0.9 * tw})`;
        ctx.beginPath();
        ctx.ellipse(ex, ey, hr * 0.11, hr * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ex - hr * 0.03, ey - hr * 0.05, hr * 0.04, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(140,210,255,.9)';
        for (let q = 0; q < 3; q++) {
          const p = ((t * 0.05 + q / 3 + (sd > 0 ? 0.5 : 0)) % 1), dx = sd * hr * (0.1 + p * 0.5), dy = p * hr * 1.2;
          ctx.beginPath();
          ctx.ellipse(ex + dx, ey + dy, hr * 0.08, hr * 0.12, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
  // 입
  ctx.strokeStyle = '#1d2a1a';
  ctx.fillStyle = '#5a2016';
  ctx.lineWidth = Math.max(1, hr * 0.09);
  const my = hy + hr * 0.35, mx = hx + dir * hr * 0.12;
  ctx.beginPath();
  if (mood === 'wow') (ctx.ellipse(mx, my, hr * 0.12, hr * 0.16, 0, 0, Math.PI * 2), ctx.fill());
  else if (mood === 'cry') (ctx.ellipse(mx, my + hr * 0.04, hr * 0.2, hr * 0.15, 0, 0, Math.PI * 2), ctx.fill());
  else if (mood === 'strain') {
    ctx.moveTo(mx - hr * 0.2, my);
    for (let k = 1; k <= 4; k++) ctx.lineTo(mx - hr * 0.2 + k * hr * 0.1, my + (k % 2 ? -1 : 1) * hr * 0.05);
    ctx.stroke();
  } else (ctx.arc(mx, my - hr * 0.08, hr * (mood === 'happy' || mood === 'tears' ? 0.22 : 0.14), 0.15 * Math.PI, 0.85 * Math.PI), ctx.stroke());
  ctx.restore();
}

/** 거북 알 하나 (점박이). crack: 0 멀쩡 ~ 1 깨짐 */
function drawEgg(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, crack: number, wob: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(wob);
  const g = ctx.createRadialGradient(-z * 0.3, -z * 1.1, z * 0.1, 0, -z * 0.7, z * 1.1);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, '#e8dcc0');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, -z * 0.75, z * 0.68, z * 0.85, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(190,170,130,.5)';
  for (const [dx, dy, r] of [[-0.25, -1.0, 0.09], [0.2, -0.6, 0.07], [0.1, -1.2, 0.06], [-0.15, -0.45, 0.06]]) (ctx.beginPath(), ctx.arc(dx * z, dy * z, r * z, 0, Math.PI * 2), ctx.fill());
  if (crack > 0) {
    ctx.strokeStyle = '#7a6040';
    ctx.lineWidth = Math.max(1, z * 0.1);
    ctx.beginPath();
    const n = Math.ceil(crack * 5);
    ctx.moveTo(-z * 0.6, -z * 0.85);
    for (let k = 1; k <= n; k++) ctx.lineTo(-z * 0.6 + k * z * 0.24, -z * (0.85 + (k % 2 ? 0.16 : -0.06)));
    ctx.stroke();
  }
  ctx.restore();
}

/** 짓는 동안의 미리 보기: 지금 판으로 예보를 끝까지 돌린 결과 (판이 바뀔 때만 다시 계산) */
const PREV = new WeakMap<object, { key: string; sim: SimOut }>();
function previewOf(s: TurtleState): SimOut {
  const key = `${s.stage}:${s.sea}:${s.pi}:${hashOf(s.K, s.Hh)}`;
  const m = PREV.get(s);
  if (m && m.key === key) return m.sim;
  const sim = simulate(s, boardOf(s), 0, false);
  PREV.set(s, { key, sim });
  return sim;
}

/** 부화 중 아기 거북 b가 어디서 무엇을 하나 (그리기 전용, 시뮬레이션 틱으로 결정) */
function babyAt(s: TurtleState, h: Hatch, b: number) {
  const p = h.path!, L = h.L, ht = h.ht, u = (ht - babyStart(b)) / WALK;
  const seaY = PY(ROWS - s.sea + 0.35);
  const at = (k: number) => {
    if (k <= 0) return { x: ccx(p[0]), y: ccy(p[0]) + 0.012, dx: 0 };
    if (k >= L) {
      const q = Math.min(1, k - L), y0 = ccy(p[L]);
      return { x: ccx(p[L]), y: y0 + (seaY - y0) * q, dx: 0 };
    }
    const a = p[Math.floor(k)], c = p[Math.floor(k) + 1], f = k - Math.floor(k);
    return { x: ccx(a) + (ccx(c) - ccx(a)) * f, y: ccy(a) + (ccy(c) - ccy(a)) * f, dx: Math.sign(ccx(c) - ccx(a)) };
  };
  if (u < 0) return { st: 'egg' as const, x: 0, y: 0, dx: 0, u, k: 0 };
  if (b < h.caught) {
    if (u < h.ca) return { st: 'walk' as const, ...at(u), u, k: 0 };
    const q = (u - h.ca) * WALK, c = at(h.ca);
    return { st: 'caught' as const, x: c.x + q * 0.004, y: c.y - Math.min(q, 12) * 0.003 - Math.max(0, q - 12) * 0.006, dx: 0, u, k: q };
  }
  if (u < L + 1) return { st: 'walk' as const, ...at(u), u, k: 0 };
  const ts = ht - babySea(L, b), fl = b === flipper(h) ? FLIPT : 0;
  if (ts < fl) return { st: 'flip' as const, x: ccx(p[L]), y: seaY, dx: 0, u, k: ts };
  return { st: 'swim' as const, x: ccx(p[L]) + Math.sin((ts - fl) * 0.15) * 0.008, y: seaY + (ts - fl) * 0.0012, dx: 0, u, k: ts - fl };
}

function drawAll(ctx: CanvasRenderingContext2D, s: TurtleState, w: number, h: number, th: Theme) {
  const fx = juice(s), X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w, t = s.t;
  const pal = SKY[Math.min(SKY.length - 1, s.stage)], dusk = Math.max(0, (s.stage - 4) / 3);
  const wave = s.phase === 'wave' ? s.seq[s.qi] : null, wt = s.wt, fl = s.fl, hat = s.phase === 'hatch' ? s.hatch : null;
  // 짓는 동안: 예보판을 하나씩 돌아가며(또는 톡 한 카드) '지금 판이면 물이 어디까지 오나'를 미리 보여 준다 — 앞 파도에 깎인 벽까지 셈해서
  let sim: SimOut | null = null, pv = -1, pre: Flood | null = null, preSea = s.sea, preHh: Int8Array | null = null;
  if (s.phase === 'build') {
    sim = previewOf(s);
    const wv = s.seq.map((q, k) => (q.kind === 'wave' ? k : -1)).filter((k) => k >= 0);
    pv = s.pick >= 0 && t - s.pickT < 420 ? s.pick : wv[Math.floor(s.pt / PREVIEW) % wv.length];
    if (s.seq[pv].kind === 'wave') (pre = sim.floods[pv]), (preSea = sim.seas[pv]), (preHh = sim.hh[pv]);
  }
  const fade = wave ? (wt < s.impact + HOLD ? 1 : Math.max(0, 1 - (wt - s.impact - HOLD) / RECEDE)) : 0;
  const wetNow = (i: number) => !!(wave && fl && s.arrive[i] >= 0 && fl.lvl[i] > 0 && wt >= s.arrive[i] && fade > 0);
  const poly = (pts: number[]) => {
    ctx.beginPath();
    ctx.moveTo(X(pts[0]), Y(pts[1]));
    for (let k = 2; k < pts.length; k += 2) ctx.lineTo(X(pts[k]), Y(pts[k + 1]));
    ctx.closePath();
  };
  const quad = (c0: number, r0: number, c1: number, r1: number, z = 0) => poly([PX(c0, r0), PY(r0, z), PX(c1, r0), PY(r0, z), PX(c1, r1), PY(r1, z), PX(c0, r1), PY(r1, z)]);
  /** 칸 위 상자: 옆면 → 앞면 → 윗면 */
  const box = (c0: number, r0: number, c1: number, r1: number, z: number, top: string, front: string, side: string) => {
    ctx.fillStyle = side;
    poly([PX(c0, r0), PY(r0), PX(c0, r1), PY(r1), PX(c0, r1), PY(r1, z), PX(c0, r0), PY(r0, z)]);
    ctx.fill();
    poly([PX(c1, r0), PY(r0), PX(c1, r1), PY(r1), PX(c1, r1), PY(r1, z), PX(c1, r0), PY(r0, z)]);
    ctx.fill();
    ctx.fillStyle = front;
    poly([PX(c0, r1), PY(r1), PX(c1, r1), PY(r1), PX(c1, r1), PY(r1, z), PX(c0, r1), PY(r1, z)]);
    ctx.fill();
    ctx.fillStyle = top;
    quad(c0, r0, c1, r1, z);
    ctx.fill();
  };
  const say = (x: number, y: number, text: string, col: string, size: number) => {
    let rec = recentSay.get(s);
    if (!rec) recentSay.set(s, (rec = []));
    for (let k = 0; k < 6 && rec.some((q) => s.t - q.t < 40 && Math.abs(q.x - x) < w * 0.3 && Math.abs(q.y - y) < size + 4); k++) y -= size + 5;
    rec.push({ x, y, t: s.t });
    if (rec.length > 12) rec.shift();
    fx.pop(Math.max(w * 0.16, Math.min(w * 0.84, x)), y, text, col, size);
  };
  const label = (text: string, x: number, y: number, size: number, col = '#ffffff', stroke = 'rgba(20,50,60,.75)') => {
    ctx.font = `900 ${R(size)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.strokeStyle = stroke;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = col;
    ctx.fillText(text, x, y);
  };

  ctx.save();
  fx.begin(ctx);
  // ── 하늘 ──
  const sky = ctx.createLinearGradient(0, 0, 0, Y(HOR));
  sky.addColorStop(0, pal[0]);
  sky.addColorStop(1, pal[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(-10, -10, w + 20, Y(HOR) + 12);
  if (dusk > 0.3)
    for (let k = 0; k < 26; k++) {
      ctx.fillStyle = `rgba(255,255,255,${(dusk - 0.3) * (0.4 + 0.5 * Math.abs(Math.sin(t / 40 + k)))})`;
      ctx.fillRect(hsh(k) * w, Y(0.09 + hsh(k + 40) * 0.12), 1.6, 1.6);
    }
  {
    const p = s.stage / (STAGE_COUNT - 1), sx = X(0.18 + 0.64 * p), sy = Y(0.13 + 0.13 * p * p);
    ctx.save();
    ctx.shadowColor = dusk > 0.5 ? '#ff7a4a' : '#fff2a8';
    ctx.shadowBlur = R(0.1);
    ctx.fillStyle = dusk > 0.5 ? '#ffb27a' : '#fff6c4';
    ctx.beginPath();
    ctx.arc(sx, sy, R(0.042), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  for (let k = 0; k < 4; k++) {
    const cx0 = ((k * 0.33 + t * 0.00006 * (1 + (k % 2))) % 1.4) - 0.2, cy0 = 0.115 + (k % 3) * 0.045;
    ctx.fillStyle = dusk > 0.4 ? 'rgba(255,200,190,.75)' : 'rgba(255,255,255,.85)';
    for (const [dx, dy, rr] of [[0, 0, 0.04], [0.04, 0.008, 0.03], [-0.04, 0.01, 0.028], [0.015, -0.015, 0.03]]) (ctx.beginPath(), ctx.arc(X(cx0 + dx), Y(cy0 + dy), R(rr), 0, Math.PI * 2), ctx.fill());
  }
  // ── 뒤쪽 모래언덕 · 야자수 · 오두막 ──
  {
    const dg = ctx.createLinearGradient(0, Y(0.25), 0, Y(Y0 + 0.02));
    dg.addColorStop(0, mix('#e8cf98', '#8a6a6a', dusk * 0.8));
    dg.addColorStop(1, mix('#f3dca8', '#a07f70', dusk * 0.6));
    ctx.fillStyle = mix('#a9c98a', '#4c5a5a', dusk);
    ctx.beginPath();
    ctx.moveTo(-10, Y(0.3));
    for (let x = -0.02; x <= 1.03; x += 0.04) ctx.lineTo(X(x), Y(0.262 - 0.022 * Math.sin(x * 5 + 1) - 0.01 * Math.sin(x * 13)));
    ctx.lineTo(w + 10, Y(0.3));
    ctx.fill();
    ctx.fillStyle = dg;
    ctx.beginPath();
    ctx.moveTo(-10, Y(Y0 + 0.03));
    for (let x = -0.02; x <= 1.03; x += 0.04) ctx.lineTo(X(x), Y(0.29 - 0.018 * Math.sin(x * 4 + 2.2) - 0.008 * Math.sin(x * 11)));
    ctx.lineTo(w + 10, Y(Y0 + 0.03));
    ctx.fill();
    ctx.strokeStyle = mix('#6f9a4a', '#3e4a40', dusk);
    ctx.lineWidth = 1.3;
    for (let k = 0; k < 40; k++) {
      const gx = X(hsh(k * 5) * 1.0), gy = Y(0.3 + hsh(k * 5 + 1) * 0.03);
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.quadraticCurveTo(gx + R(0.004), gy - R(0.012), gx + R(0.006) + Math.sin(t * 0.03 + k) * R(0.003), gy - R(0.02 + hsh(k) * 0.01));
      ctx.stroke();
    }
    for (const [px0, sz, lean] of [[0.07, 1, 0.25], [0.93, 0.85, -0.3]] as [number, number, number][]) {
      const bx = X(px0), by = Y(0.335), th2 = R(0.13 * sz);
      ctx.strokeStyle = mix('#8a6238', '#3e3030', dusk);
      ctx.lineWidth = R(0.012 * sz);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + lean * th2 * 0.2, by - th2 * 0.6, bx + lean * th2 * 0.5, by - th2);
      ctx.stroke();
      const tx = bx + lean * th2 * 0.5, ty2 = by - th2;
      ctx.fillStyle = mix('#3f9a4a', '#2a4038', dusk);
      for (let q = 0; q < 6; q++) {
        const an = -Math.PI / 2 + (q - 2.5) * 0.55 + Math.sin(t * 0.03 + q) * 0.05;
        ctx.save();
        ctx.translate(tx, ty2);
        ctx.rotate(an + Math.PI / 2);
        ctx.beginPath();
        ctx.ellipse(0, -R(0.035 * sz), R(0.011 * sz), R(0.04 * sz), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = '#7a4f2a';
      for (let q = 0; q < 3; q++) (ctx.beginPath(), ctx.arc(tx + (q - 1) * R(0.008), ty2 + R(0.008), R(0.006 * sz), 0, Math.PI * 2), ctx.fill());
    }
    // 거북 보호 팻말 + 오두막 (저녁엔 등불)
    {
      const hx = X(0.82), hy = Y(0.31);
      ctx.fillStyle = mix('#c98d55', '#5a4038', dusk);
      ctx.fillRect(hx - R(0.035), hy - R(0.03), R(0.07), R(0.03));
      ctx.fillStyle = mix('#e0b26a', '#6a5040', dusk);
      ctx.beginPath();
      ctx.moveTo(hx - R(0.045), hy - R(0.03));
      ctx.lineTo(hx, hy - R(0.058));
      ctx.lineTo(hx + R(0.045), hy - R(0.03));
      ctx.fill();
      ctx.fillStyle = dusk > 0.4 ? '#ffd27a' : '#6b4a2a';
      if (dusk > 0.4) (ctx.save(), (ctx.shadowColor = '#ffcf6a'), (ctx.shadowBlur = R(0.04)));
      ctx.fillRect(hx - R(0.01), hy - R(0.022), R(0.02), R(0.014));
      if (dusk > 0.4) ctx.restore();
      const ux = X(0.16), uy = Y(0.318);
      ctx.fillStyle = '#8a6238';
      ctx.fillRect(ux - R(0.003), uy - R(0.04), R(0.006), R(0.04));
      ctx.fillStyle = mix('#fff4dc', '#b8a48c', dusk);
      ctx.beginPath();
      ctx.roundRect(ux - R(0.035), uy - R(0.062), R(0.07), R(0.03), R(0.005));
      ctx.fill();
      ctx.fillStyle = '#2f7a4a';
      ctx.font = `800 ${R(0.022)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('거북 길', ux, uy - R(0.047));
    }
  }
  // ── 바다 (판 앞과 양옆) ──
  const SF = Y1 + 0.12, vSea = ROWS - s.sea;
  {
    const sea = ctx.createLinearGradient(0, Y(Y0), 0, Y(SF));
    sea.addColorStop(0, mix(pal[3], '#c8f6ee', 0.25));
    sea.addColorStop(0.6, pal[3]);
    sea.addColorStop(1, pal[2]);
    ctx.fillStyle = sea;
    ctx.fillRect(-10, Y(Y0 + 0.005), w + 20, Y(SF - Y0));
    ctx.strokeStyle = 'rgba(255,255,255,.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = -0.02; x <= 1.03; x += 0.02) ctx.lineTo(X(x), Y(Y0 + 0.012 + 0.003 * Math.sin(x * 20 + t * 0.05)));
    ctx.stroke();
    ctx.lineWidth = 1.4;
    for (let k = 0; k < 6; k++) {
      const p = (k / 6 + t * 0.0018) % 1, yy = SF - 0.008 - p * (SF - Y1 - 0.01);
      ctx.strokeStyle = `rgba(255,255,255,${0.15 + 0.3 * p})`;
      ctx.beginPath();
      for (let x = -0.02; x <= 1.03; x += 0.03) ctx.lineTo(X(x), Y(yy + 0.003 * Math.sin(x * 18 + k + t * 0.03)));
      ctx.stroke();
    }
    for (let k = 0; k < 14; k++) {
      ctx.fillStyle = `rgba(255,255,250,${0.3 + 0.5 * Math.abs(Math.sin(t / 18 + k))})`;
      ctx.fillRect(X(hsh(k + 30)), Y(Y1 + 0.015 + hsh(k + 9) * 0.095), R(0.015 + hsh(k + 3) * 0.02), 1.5);
    }
  }
  // ── 디오라마 앞 단면: 바닷물 · 모래 바닥 · 바다로 간 아기 거북들이 헤엄친다 ──
  const DEP = 0.05;
  {
    ctx.fillStyle = 'rgba(10,30,40,.35)';
    ctx.beginPath();
    ctx.ellipse(X(0.5), Y(SF + DEP + 0.028), R(0.52), R(0.022), 0, 0, Math.PI * 2);
    ctx.fill();
    const wg = ctx.createLinearGradient(0, Y(SF), 0, Y(SF + DEP));
    wg.addColorStop(0, 'rgba(70,190,215,.95)');
    wg.addColorStop(1, 'rgba(20,80,130,.98)');
    ctx.fillStyle = wg;
    ctx.fillRect(X(0.005), Y(SF), X(0.99), Y(DEP));
    ctx.fillStyle = '#d9b47a';
    ctx.beginPath();
    ctx.moveTo(X(0.005), Y(SF + DEP));
    for (let x = 0.005; x <= 0.996; x += 0.02) ctx.lineTo(X(x), Y(SF + DEP - 0.014 - 0.004 * Math.sin(x * 17)));
    ctx.lineTo(X(0.995), Y(SF + DEP));
    ctx.fill();
    ctx.strokeStyle = '#4f9a5a';
    ctx.lineWidth = 2;
    for (let k = 0; k < 7; k++) {
      const sx2 = X(0.04 + k * 0.15 + hsh(k) * 0.05), sy2 = Y(SF + DEP - 0.012);
      ctx.beginPath();
      ctx.moveTo(sx2, sy2);
      ctx.quadraticCurveTo(sx2 + Math.sin(t * 0.04 + k) * R(0.008), sy2 - R(0.015), sx2 + Math.sin(t * 0.04 + k + 1) * R(0.006), sy2 - R(0.028));
      ctx.stroke();
    }
    // 바다로 간 아기 거북 (지금까지 보낸 수만큼, 최대 12) — 단면 물속을 헤엄친다
    const swim = Math.min(12, s.saved + (s.phase === 'result' && s.ok ? 0 : s.savedThis));
    for (let k = 0; k < swim; k++) {
      const dir = k % 2 ? -1 : 1, px = (((t * 0.0011 * dir * (0.7 + hsh(k) * 0.6) + hsh(k * 7)) % 1) + 1) % 1, py = SF + 0.013 + (k % 3) * 0.011;
      ctx.save();
      ctx.translate(X(0.03 + px * 0.94), Y(py));
      ctx.scale(dir, 1);
      ctx.fillStyle = '#8fd6a0';
      ctx.beginPath();
      ctx.ellipse(R(0.011), 0, R(0.005), R(0.004), 0, 0, Math.PI * 2);
      ctx.fill();
      const fl2 = Math.sin(t * 0.3 + k) * 0.6;
      ctx.beginPath();
      ctx.ellipse(R(0.003), R(0.004), R(0.006), R(0.002), 0.5 + fl2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5e9a48';
      ctx.beginPath();
      ctx.ellipse(0, 0, R(0.009), R(0.006), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    for (let k = 0; k < 2; k++) {
      const fx2 = X(((t * 0.0012 * (k % 2 ? 1 : -1) + hsh(k * 7 + 3)) % 1 + 1) % 1), fy2 = Y(SF + 0.03 + k * 0.009);
      ctx.fillStyle = ['#ffd43b', '#ff8fab'][k];
      ctx.beginPath();
      ctx.ellipse(fx2, fy2, R(0.008), R(0.0045), 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    for (let k = 0; k < 8; k++) {
      const by = SF + DEP - ((t * 0.0007 + hsh(k + 5)) % 1) * DEP;
      ctx.beginPath();
      ctx.arc(X(0.03 + hsh(k) * 0.94), Y(by), R(0.0035), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.fillRect(X(0.005), Y(SF), X(0.99), 1.5);
    const bg = ctx.createLinearGradient(0, Y(SF + DEP), 0, Y(SF + DEP + 0.015));
    bg.addColorStop(0, '#a8743f');
    bg.addColorStop(1, '#6e4724');
    ctx.fillStyle = bg;
    ctx.fillRect(X(0.0), Y(SF + DEP), X(1), Y(0.015));
  }
  // ── 모래 판 (뒤 = 언덕 쪽, 앞 = 바다 쪽) ──
  {
    ctx.fillStyle = '#c99f66';
    poly([PX(0, vSea), PY(vSea), PX(COLS, vSea), PY(vSea), PX(COLS, vSea) + 0.012, PY(vSea) + 0.02, PX(0, vSea) - 0.012, PY(vSea) + 0.02]);
    ctx.fill();
    ctx.fillStyle = 'rgba(120,220,235,.55)';
    poly([PX(0, vSea) - 0.012, PY(vSea) + 0.012, PX(COLS, vSea) + 0.012, PY(vSea) + 0.012, PX(COLS, vSea) + 0.02, PY(vSea) + 0.026, PX(0, vSea) - 0.02, PY(vSea) + 0.026]);
    ctx.fill();
  }
  for (let vr = 0; vr < ROWS; vr++)
    for (let c = 0; c < COLS; c++) {
      const i = (ROWS - 1 - vr) * COLS + c;
      if (s.K[i] === SEA) {
        ctx.fillStyle = mix(pal[3], '#9fe8ee', 0.25 + 0.1 * Math.sin(t * 0.05 + c));
        quad(c - 0.02, vr - 0.02, c + 1.02, vr + 1.02);
        ctx.fill();
        continue;
      }
      const near = rowOf(i) - s.sea, shore = Math.max(0, 1 - near * 0.5) * 0.5, wv = Math.max(s.wet[i], shore);
      const base = mix('#fbe8bd', '#f3dba8', hsh(i * 7 + s.stage) * 0.5 + (vr / ROWS) * 0.3);
      ctx.fillStyle = mix(base, '#d0a66c', wv);
      quad(c - 0.01, vr - 0.01, c + 1.01, vr + 1.01);
      ctx.fill();
    }
  ctx.strokeStyle = 'rgba(170,120,60,.16)';
  ctx.lineWidth = 1.2;
  for (let vr = 0; vr < vSea; vr++)
    for (const f of [0.3, 0.72]) {
      ctx.beginPath();
      for (let c = 0; c <= COLS; c += 0.2) ctx.lineTo(X(PX(c, vr + f)), Y(PY(vr + f) + 0.006 * Math.sin(c * 2.3 + vr * 1.7 + f * 9)));
      ctx.stroke();
    }
  for (let k = 0; k < 90; k++) {
    const c = hsh(k * 3 + 1) * COLS, vr = hsh(k * 3 + 2) * vSea;
    ctx.fillStyle = k % 4 ? 'rgba(255,255,255,.4)' : 'rgba(150,100,50,.3)';
    ctx.fillRect(X(PX(c, vr)), Y(PY(vr)), 1.5, 1.5);
  }
  // 아기 거북 발자국 (지나간 길) — 부화 중·결과 때
  for (let k = 0; k < 6; k++) {
    const i = Math.floor(hsh(k * 13 + s.stage * 7) * N);
    if (s.K[i] !== SAND || s.crabs.some((q) => q.home === i)) continue;
    const vr = vrowOf(i), x = X(PX(colOf(i) + 0.25 + hsh(k) * 0.5, vr + 0.5)), y = Y(PY(vr + 0.3 + hsh(k + 1) * 0.5)), z = R(0.011);
    if (k % 3 === 0) {
      ctx.fillStyle = '#ff9f6b';
      ctx.beginPath();
      for (let q = 0; q < 10; q++) {
        const an = (q / 10) * Math.PI * 2 - Math.PI / 2, rr = q % 2 ? z * 0.42 : z;
        ctx.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr * 0.6);
      }
      ctx.fill();
    } else if (k % 3 === 1) {
      ctx.fillStyle = '#b8b2a6';
      ctx.beginPath();
      ctx.ellipse(x, y, z * 0.7, z * 0.42, 0.4, 0, Math.PI * 2);
      ctx.ellipse(x + z * 0.9, y + z * 0.2, z * 0.45, z * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = '#5f9a52';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x - z, y);
      ctx.bezierCurveTo(x - z * 0.3, y - z * 0.8, x + z * 0.3, y + z * 0.6, x + z, y - z * 0.3);
      ctx.stroke();
    }
  }
  // 칸 줄 (톡 칠 자리가 보이게)
  ctx.strokeStyle = 'rgba(140,95,45,.16)';
  ctx.lineWidth = 1;
  for (let c = 0; c <= COLS; c++) (ctx.beginPath(), ctx.moveTo(X(PX(c, 0)), Y(PY(0))), ctx.lineTo(X(PX(c, vSea)), Y(PY(vSea))), ctx.stroke());
  for (let vr = 0; vr <= vSea; vr++) (ctx.beginPath(), ctx.moveTo(X(PX(0, vr)), Y(PY(vr))), ctx.lineTo(X(PX(COLS, vr)), Y(PY(vr))), ctx.stroke());
  ctx.strokeStyle = 'rgba(255,255,255,.9)';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  for (let c = -0.1; c <= COLS + 0.1; c += 0.25) ctx.lineTo(X(PX(c, vSea)), Y(PY(vSea) + 0.006 + 0.004 * Math.sin(c * 5 + t * 0.06)));
  ctx.stroke();
  // ── 게 구멍 (물이 쏙 빠진다, 꽃게 눈이 빼꼼) ──
  for (let i = 0; i < N; i++) {
    if (s.K[i] !== HOLE) continue;
    const x = X(ccx(i)), y = Y(ccy(i)), rw = R(CW * scl(vrowOf(i)) * 0.36);
    ctx.fillStyle = '#e9cf98';
    ctx.beginPath();
    ctx.ellipse(x, y, rw * 1.25, rw * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    const hg = ctx.createRadialGradient(x, y + rw * 0.1, 1, x, y, rw);
    hg.addColorStop(0, '#2a1a0c');
    hg.addColorStop(1, '#7a5530');
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.ellipse(x, y + rw * 0.05, rw * 0.85, rw * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    const peek = Math.sin(t * 0.03 + i) > 0.2;
    if (peek) {
      for (const sd of [-1, 1]) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x + sd * rw * 0.22, y - rw * 0.08, rw * 0.13, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1a0e06';
        ctx.beginPath();
        ctx.arc(x + sd * rw * 0.22 + Math.sin(t * 0.05) * rw * 0.03, y - rw * 0.06, rw * 0.07, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (wave && fl && fl.lvl[i] > 0 && wt >= s.arrive[i] && fade > 0) {
      ctx.strokeStyle = `rgba(200,240,255,${0.8 * fade})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let a = 0; a < 14; a++) {
        const an = a * 0.7 + t * 0.25, rr = rw * (0.75 - a * 0.045);
        ctx.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr * 0.45);
      }
      ctx.stroke();
    }
  }
  // ── 갈매기 사냥터 (그림자 원) — 그늘 없는 칸은 붉게, 그늘(벽·돌 옆)은 푸르게 ──
  let zx = 0, zy = 0, zn = 0;
  for (let i = 0; i < N; i++) if (s.zone[i]) (zx += ccx(i)), (zy += ccy(i)), zn++;
  if (zn) {
    zx /= zn;
    zy /= zn;
    for (let i = 0; i < N; i++) {
      if (!s.zone[i] || s.K[i] === SEA) continue;
      const c = colOf(i), vr = vrowOf(i), sh = shaded(s.K, i);
      ctx.fillStyle = sh ? 'rgba(40,80,140,.16)' : `rgba(255,80,60,${0.13 + 0.05 * Math.sin(t * 0.08)})`;
      quad(c + 0.04, vr + 0.04, c + 0.96, vr + 0.96);
      ctx.fill();
    }
    ctx.save();
    ctx.setLineDash([R(0.012), R(0.01)]);
    ctx.lineDashOffset = t * 0.2;
    ctx.strokeStyle = 'rgba(200,60,50,.55)';
    ctx.lineWidth = 2;
    let c0 = COLS, c1 = 0, v0 = ROWS, v1 = 0;
    for (let i = 0; i < N; i++) if (s.zone[i]) (c0 = Math.min(c0, colOf(i))), (c1 = Math.max(c1, colOf(i) + 1)), (v0 = Math.min(v0, vrowOf(i))), (v1 = Math.max(v1, vrowOf(i) + 1));
    quad(c0 + 0.02, v0 + 0.02, c1 - 0.02, v1 - 0.02);
    ctx.stroke();
    ctx.restore();
  }
  // ── 물: 짓는 동안은 예보한 파도를 하나씩 미리 보기, 파도 때는 진짜 물 ──
  if (pre) {
    const on = (i: number) => pre.lvl[i] > 0;
    if (preSea > s.sea) {
      ctx.fillStyle = `rgba(40,150,215,${0.5 + 0.08 * Math.sin(t * 0.1)})`;
      quad(0, ROWS - preSea, COLS, vSea);
      ctx.fill();
      label('🌙 밀물: 여기까지 바다', X(0.5), Y(PY(ROWS - (s.sea + preSea) / 2)), 0.036);
    }
    for (let i = 0; i < N; i++)
      if (on(i)) {
        ctx.fillStyle = `rgba(${mix('#7fd0ff', '#1f6fc0', (pre.lvl[i] - 1) / 6).slice(1).match(/../g)!.map((v) => parseInt(v, 16)).join(',')},${0.3 + 0.05 * Math.sin(t * 0.08)})`;
        quad(colOf(i), vrowOf(i), colOf(i) + 1, vrowOf(i) + 1);
        ctx.fill();
      }
    ctx.strokeStyle = 'rgba(255,255,255,.95)';
    ctx.lineWidth = 2;
    ctx.setLineDash([R(0.012), R(0.01)]);
    ctx.lineDashOffset = -t * 0.3;
    for (let i = 0; i < N; i++) {
      if (!on(i)) continue;
      const c = colOf(i), vr = vrowOf(i), r = rowOf(i);
      const edge = (x0: number, y0: number, x1: number, y1: number) => (ctx.beginPath(), ctx.moveTo(X(PX(x0, y0)), Y(PY(y0))), ctx.lineTo(X(PX(x1, y1)), Y(PY(y1))), ctx.stroke());
      if (r === ROWS - 1 || !on(i + COLS)) edge(c, vr, c + 1, vr);
      if (r > preSea && !on(i - COLS)) edge(c, vr + 1, c + 1, vr + 1);
      if (c > 0 && !on(i - 1)) edge(c, vr, c, vr + 1);
      if (c < COLS - 1 && !on(i + 1)) edge(c + 1, vr, c + 1, vr + 1);
    }
    ctx.setLineDash([]);
    // 칸마다 물 높이 — 둥지 둘레·아기 거북 길은 또렷하게, 먼 칸은 흐리게
    const pathSet = new Set<number>();
    sim?.hatches.forEach((q) => q?.path?.forEach((i) => pathSet.add(i)));
    for (let i = 0; i < N; i++) {
      if (!on(i) || (s.K[i] !== SAND && s.K[i] !== PIT)) continue;
      const close = pathSet.has(i) || s.nests.some((c) => s.K[c] === NEST && Math.abs(rowOf(c) - rowOf(i)) <= 1 && Math.abs(colOf(c) - colOf(i)) <= 1);
      ctx.globalAlpha = close ? 1 : 0.42;
      label(String(pre.lvl[i]), X(ccx(i)), Y(ccy(i)), close ? 0.04 : 0.036, '#ffffff', 'rgba(20,90,140,.6)');
      ctx.globalAlpha = 1;
    }
  }
  if (wave && fl) {
    for (let i = 0; i < N; i++) {
      if (!wetNow(i)) continue;
      const c = colOf(i), vr = vrowOf(i), age = wt - s.arrive[i], a = Math.min(1, age / 7) * fade;
      const dl = Math.min(1, (fl.lvl[i] - 1) / 5);
      ctx.globalAlpha = a * 0.88;
      ctx.fillStyle = mix('#8ef0f5', '#1f8fd0', dl);
      quad(c - 0.02, vr - 0.02, c + 1.02, vr + 1.02);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = `rgba(255,255,255,${0.45 * a})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      const yy = PY(vr + 0.3 + ((t * 0.01 + c * 0.2) % 0.5));
      ctx.moveTo(X(PX(c + 0.15, vr + 0.5)), Y(yy));
      ctx.quadraticCurveTo(X(PX(c + 0.5, vr + 0.5)), Y(yy - 0.008), X(PX(c + 0.85, vr + 0.5)), Y(yy));
      ctx.stroke();
      const edge = NB[i].filter((n) => !wetNow(n) && s.K[n] !== SEA);
      if (edge.length) {
        ctx.fillStyle = `rgba(255,255,255,${0.85 * a})`;
        for (const n of edge) {
          const dc = colOf(n) - c, dv = vrowOf(n) - vr;
          for (let k = 0; k < 4; k++) {
            const u = (k + 0.5) / 4, fc = dc ? c + (dc > 0 ? 1 : 0) : c + u, fv = dv ? vr + (dv > 0 ? 1 : 0) : vr + u;
            ctx.beginPath();
            ctx.arc(X(PX(fc, fv)), Y(PY(fv)), R(0.006 + 0.004 * Math.sin(t * 0.2 + k + i)) * (age < 12 ? 1.6 : 1), 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
  }
  // ── 아기 거북 길 미리 보기: 둥지에서 바다까지 점선 + 걸어가는 유령 거북. 갈매기가 노리는 칸엔 🐦 ──
  if (sim) {
    s.seq.forEach((it, k) => {
      if (it.kind !== 'hatch') return;
      const hr = sim!.hatches[k], nc = s.nests[it.nest], focus = pv === k;
      if (!hr) return;
      if (!hr.path) {
        const x = X(ccx(nc)), y = Y(ccy(nc)) - R(0.075), pul = 0.75 + 0.25 * Math.sin(t * 0.2);
        ctx.fillStyle = `rgba(230,60,50,${0.9 * pul})`;
        ctx.beginPath();
        ctx.roundRect(x - R(0.13), y - R(0.024), R(0.26), R(0.048), R(0.024));
        ctx.fill();
        label('🚫 길이 막혔어요', x, y + 0.5, 0.034, '#ffffff', 'rgba(120,20,10,.6)');
        return;
      }
      const p = hr.path, seaY = PY(ROWS - sim!.seas[k] + 0.35);
      const pts = p.map((i) => [X(ccx(i)), Y(ccy(i))]);
      pts.push([X(ccx(p[p.length - 1])), Y(seaY)]);
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(15,60,35,.6)';
      ctx.lineWidth = focus ? 11 : 9;
      ctx.beginPath();
      pts.forEach(([x, y], q) => (q ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
      ctx.strokeStyle = focus ? '#e6fff0' : '#8ff5b5';
      ctx.lineWidth = focus ? 5.5 : 4.5;
      ctx.setLineDash([R(0.02), R(0.014)]);
      ctx.lineDashOffset = -t * 0.5;
      ctx.beginPath();
      pts.forEach(([x, y], q) => (q ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
      ctx.restore();
      // 걸어가는 유령 거북 (어디로 갈지 한눈에)
      const L = pts.length - 1, u = ((t * 0.04) % (L + 1.2));
      if (u < L) {
        const a = pts[Math.floor(u)], b = pts[Math.floor(u) + 1], f = u - Math.floor(u);
        ctx.globalAlpha = 0.75;
        drawTurtle(ctx, a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f + R(0.014), R(0.024), t, 'happy', { walk: u, dir: Math.sign(b[0] - a[0]) * 0.8 });
        ctx.globalAlpha = 1;
      }
      // 갈매기가 노리는 첫 칸
      if (hr.ca >= 0) {
        const at = p[hr.ca], x = X(ccx(at)), y = Y(ccy(at)), pul = 0.6 + 0.4 * Math.sin(t * 0.25);
        ctx.strokeStyle = `rgba(255,70,60,${pul})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, R(0.032), 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = `${R(0.04)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🐦', x, y - R(0.002));
      }
      // 바다 도착 표시
      const [ex, ey] = pts[pts.length - 1];
      ctx.fillStyle = '#ffffff';
      ctx.font = `${R(0.034)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🌊', ex, ey + R(0.012));
    });
  }
  // 부화 중: 지나온 길에 작은 발자국
  if (hat && hat.path)
    for (let q = 1; q <= hat.L; q++) {
      if (hat.ht < babyStart(0) + q * WALK) break;
      const i = hat.path[q], x = X(ccx(i)), y = Y(ccy(i));
      ctx.fillStyle = 'rgba(120,80,40,.35)';
      for (const sd of [-1, 1]) for (const fb of [-1, 1]) (ctx.beginPath(), ctx.ellipse(x + sd * R(0.012), y + fb * R(0.006), R(0.004), R(0.0025), 0, 0, Math.PI * 2), ctx.fill());
    }
  // ── 엄마 거북: 모래언덕 위에서 둥지를 지켜본다 (표정이 판의 상황을 말해 준다) ──
  const mamaMood = (): TMood => {
    if (s.phase === 'result') return s.ok ? 'tears' : 'cry';
    if (t - s.cryT < 70) return 'cry';
    if (hat) return hat.ht < CRACK ? 'wow' : t - s.joyT < 90 ? 'tears' : 'happy';
    if (wave && fl) {
      const hitMe = s.nests.some((c) => s.K[c] === NEST && fl.hit[c] > 0);
      if (wt < s.impact - 4) return hitMe ? 'strain' : 'wow';
      return 'happy';
    }
    if (s.pt > 900 && s.taps === 0) return 'sleep';
    return t - s.lastPlace < 40 ? 'wow' : 'calm';
  };
  // ── 세워진 것들 (뒤 줄부터 앞 줄로) + 그 줄을 걷는 아기 거북 ──
  const babies: { x: number; y: number; st: string; dx: number; u: number; k: number; b: number }[] = [];
  if (hat && hat.path) for (let b = 0; b < hat.babies; b++) babies.push({ ...babyAt(s, hat, b), b });
  const drawBaby = (q: (typeof babies)[number]) => {
    const z = R(0.031), x = X(q.x), y = Y(q.y);
    if (q.st === 'walk') {
      const wob = Math.sin(q.u * Math.PI * 2) * 0.12;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(wob);
      drawTurtle(ctx, 0, 0, z, t + q.b * 9, q.b === 0 && hat && t - s.cryT < 40 ? 'wow' : 'happy', { walk: q.u * 2, dir: q.dx * 0.8 });
      ctx.restore();
    } else if (q.st === 'flip') {
      drawTurtle(ctx, x, y - Math.abs(Math.sin(q.k * 0.4)) * R(0.006), z, t, 'dizzy', { flip: true });
      if (q.k > FLIPT - 12) {
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        for (let a = 0; a < 6; a++) (ctx.beginPath(), ctx.arc(x - R(0.05) + a * R(0.02), y - R(0.006) - Math.sin(a + t * 0.3) * R(0.006), R(0.008), 0, Math.PI * 2), ctx.fill());
      }
      if (q.k % 30 < 20) label('버둥버둥', x, y - R(0.07), 0.036, '#fff6d6');
    } else if (q.st === 'swim') {
      ctx.globalAlpha = Math.max(0, 1 - q.k / 40);
      drawTurtle(ctx, x, y, z * 0.9, t + q.b * 5, 'happy', { walk: t * 0.05 });
      ctx.globalAlpha = 1;
    }
  };
  const babyRow = (q: (typeof babies)[number]) => (q.y - Y0) / CH;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const i = (ROWS - 1 - r) * COLS + c, k = s.K[i], age = t - s.place[i], drop = age < 10 ? Math.pow(1 - age / 10, 2) * 4 : 0;
      if (k === WALL) {
        const hh = s.Hh[i], lost = Math.max(0, s.peak[i] - hh), hit = wave && fl && fl.hit[i] > 0 && wt >= s.arrive[i];
        ctx.save();
        ctx.translate(0, -Y(drop * HZ));
        const wetk = Math.max(s.wet[i] * 0.6, hit ? 0.7 : 0);
        box(c + 0.07, r + 0.12, c + 0.93, r + 0.9, hh, mix('#fde7b4', '#d5ad70', wetk), mix('#e2b06a', '#b08850', wetk), mix('#c9965a', '#9c7444', wetk));
        ctx.strokeStyle = 'rgba(160,105,50,.55)';
        ctx.lineWidth = 1;
        quad(c + 0.07, r + 0.12, c + 0.93, r + 0.9, hh);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(150,100,50,.3)';
        for (let z = 1; z < hh; z++) (ctx.beginPath(), ctx.moveTo(X(PX(c + 0.07, r + 0.9)), Y(PY(r + 0.9, z))), ctx.lineTo(X(PX(c + 0.93, r + 0.9)), Y(PY(r + 0.9, z))), ctx.stroke());
        for (let q = 0; q < 3; q++) {
          if (q < lost) continue;
          const c0 = c + 0.12 + q * 0.29;
          box(c0, r + 0.6, c0 + 0.18, r + 0.86, hh + 0.7, mix('#fae3ae', '#d5ad70', wetk), mix('#e6bd7c', '#b08850', wetk), mix('#d4a464', '#9c7444', wetk));
        }
        if (lost > 0) {
          ctx.fillStyle = 'rgba(120,80,40,.35)';
          for (let q = 0; q < Math.min(4, lost + 1); q++) (ctx.beginPath(), ctx.arc(X(PX(c + 0.2 + q * 0.2, r + 0.9)), Y(PY(r + 0.9, hh * 0.5 + (q % 2))), R(0.005), 0, Math.PI * 2), ctx.fill());
        }
        if (hh >= 5) label(String(hh), X(PX(c + 0.5, r + 0.5)), Y(PY(r + 0.5, hh + 1)), 0.036, '#ffffff', 'rgba(90,55,20,.7)');
        if (wave && fl && fl.over[i] && wt >= s.arrive[i] && fade > 0) {
          ctx.fillStyle = `rgba(150,225,250,${0.7 * fade})`;
          quad(c + 0.05, r + 0.1, c + 0.95, r + 0.92, hh + 0.3);
          ctx.fill();
        }
        ctx.restore();
      } else if (k === ROCK) {
        ctx.save();
        ctx.translate(0, -Y(drop * HZ));
        const x = X(ccx(i)), yb = Y(PY(r + 0.82)), rw = R(CW * scl(r) * 0.44), rh = Y(ROCK_H * HZ + 0.012);
        ctx.fillStyle = 'rgba(60,40,20,.3)';
        ctx.beginPath();
        ctx.ellipse(x, yb, rw * 1.05, rw * 0.32, 0, 0, Math.PI * 2);
        ctx.fill();
        const g = ctx.createLinearGradient(0, yb - rh, 0, yb);
        g.addColorStop(0, s.nat[i] ? '#a3a59a' : '#b9bec6');
        g.addColorStop(1, s.nat[i] ? '#5d6157' : '#6c727c');
        ctx.fillStyle = g;
        ctx.beginPath();
        for (let q = 0; q <= 10; q++) {
          const a = Math.PI + (q / 10) * Math.PI, rr = 0.85 + 0.25 * hsh(i * 11 + q);
          ctx.lineTo(x + Math.cos(a) * rw * rr, yb + Math.sin(a) * rh * rr);
        }
        ctx.lineTo(x + rw, yb);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.35)';
        ctx.beginPath();
        ctx.ellipse(x - rw * 0.3, yb - rh * 0.7, rw * 0.28, rh * 0.14, -0.3, 0, Math.PI * 2);
        ctx.fill();
        if (s.nat[i]) {
          ctx.fillStyle = '#6fa04a';
          for (let q = 0; q < 4; q++) (ctx.beginPath(), ctx.arc(x - rw * 0.5 + q * rw * 0.33, yb - rh * (0.15 + 0.1 * (q % 2)), R(0.006), 0, Math.PI * 2), ctx.fill());
        }
        ctx.restore();
      } else if (s.nests.includes(i)) {
        // 둥지: 모래 둔덕 속 알들. 부화 땐 흔들리다 쩍 — 아기 거북이 하나씩 나온다
        const j = s.nests.indexOf(i), x = X(ccx(i)), y = Y(ccy(i)) + R(0.006), rw = R(CW * scl(r) * 0.5);
        const hitN = wave && fl && fl.hit[i] > 0 && wt >= s.arrive[i] && wt < s.impact + HOLD;
        ctx.save();
        ctx.translate(hitN ? Math.sin(t * 1.3) * 1.5 : 0, 0);
        ctx.fillStyle = 'rgba(80,50,20,.25)';
        ctx.beginPath();
        ctx.ellipse(x, y + rw * 0.18, rw * 1.15, rw * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = mix('#f0d29a', '#c99c5e', s.wet[i] * 0.6);
        ctx.beginPath();
        ctx.ellipse(x, y, rw * 1.05, rw * 0.52, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = mix('#c99a5c', '#9c7444', s.wet[i] * 0.6);
        ctx.beginPath();
        ctx.ellipse(x, y + rw * 0.02, rw * 0.78, rw * 0.36, 0, 0, Math.PI * 2);
        ctx.fill();
        // 남은 알 (부화 중이면 아직 안 나온 알만)
        let n = s.K[i] === NEST ? s.eggs[j] : 0, crack = 0, wob = 0;
        if (hat && hat.j === j) {
          const out = hat.path ? babies.filter((q) => q.st !== 'egg').length : 0;
          n = hat.babies - out;
          crack = Math.min(1, hat.ht / CRACK);
          wob = hat.ht < CRACK ? Math.sin(hat.ht * 0.9) * 0.25 * crack : 0;
          if (!hat.path && hat.ht >= CRACK) {
            // 길이 막힘: 아기 거북들이 둥지 안에서 맴돈다
            for (let b = 0; b < hat.babies; b++) {
              const an = t * 0.08 + (b * Math.PI * 2) / hat.babies;
              drawTurtle(ctx, x + Math.cos(an) * rw * 0.45, y + Math.sin(an) * rw * 0.2, R(0.022), t + b * 7, 'cry', { walk: t * 0.05, dir: -Math.sin(an) });
            }
            n = 0;
          }
        }
        const spots = [[0, 0.1], [-0.42, 0], [0.42, 0]];
        for (let q = 0; q < n; q++) drawEgg(ctx, x + spots[q % 3][0] * rw, y + spots[q % 3][1] * rw + rw * 0.3, R(0.029), crack, wob * (q % 2 ? -1 : 1));
        if (s.K[i] === PIT && !(hat && hat.j === j)) {
          ctx.fillStyle = '#f4ecd8';
          for (let q = 0; q < 4; q++) {
            ctx.beginPath();
            const sx = x + (q - 1.5) * rw * 0.3, sy = y + (q % 2) * rw * 0.12;
            ctx.moveTo(sx - R(0.008), sy);
            ctx.lineTo(sx, sy - R(0.01));
            ctx.lineTo(sx + R(0.008), sy);
            ctx.closePath();
            ctx.fill();
          }
        }
        // 둥지 번호 (둘일 때) · 몇 번째 파도 뒤 부화
        if (s.nests.length > 1 && s.K[i] === NEST) label(`${j + 1}`, x + rw * 0.95, y - rw * 0.55, 0.036, '#fff1a8');
        ctx.restore();
      }
    }
    for (const q of babies) if (q.st !== 'egg' && q.st !== 'caught' && babyRow(q) >= r - 0.5 && babyRow(q) < r + 0.5) drawBaby(q);
  }
  for (const q of babies) if ((q.st === 'flip' || q.st === 'swim') && babyRow(q) >= ROWS - 0.5) drawBaby(q);
  // ── 엄마 거북: 바다 앞에서 아기들을 기다린다 (표정이 판의 상황을 말해 준다) ──
  {
    const mood = mamaMood(), mx = 0.1, bob = Math.sin(t * 0.06) * R(0.004) + (mood === 'tears' || mood === 'happy' ? -Math.abs(Math.sin(t * 0.15)) * R(0.008) : 0);
    const my = Y(Y1 + 0.08) + bob, mz = R(0.052);
    drawTurtle(ctx, X(mx), my, mz, t, mood, { mama: true, wave: mood === 'tears' || mood === 'happy' ? 1 : 0 });
    // 물결이 엄마 몸을 반쯤 감싼다
    ctx.strokeStyle = 'rgba(255,255,255,.75)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let q = -1.4; q <= 1.4; q += 0.2) ctx.lineTo(X(mx) + q * mz, my + Math.sin(q * 3 + t * 0.12) * R(0.003));
    ctx.stroke();
    const say2 = mood === 'sleep' ? 'z' : mood === 'cry' && t % 60 < 45 ? '엉엉' : mood === 'tears' && (s.phase === 'result' || t - s.joyT < 70) ? '흑, 우리 아가…' : mood === 'strain' ? '안 돼~!' : '';
    if (say2) label(say2, X(mx + 0.02) + (say2.length > 3 ? R(0.1) : 0), my - mz * 1.75, 0.036, mood === 'cry' ? '#cfefff' : '#e9fff1');
  }
  // 떠내려가는 알 (방금 젖은 것)
  for (const e of s.events)
    if ((e.kind === 'eggloss' || e.kind === 'eggsgone') && t - e.t < 100) {
      const q = (t - e.t) / 100;
      for (let k = 0; k < (e.kind === 'eggsgone' ? 3 : 1); k++) drawEgg(ctx, X(e.x + Math.sin(q * 8 + k) * 0.03 + (k - 1) * 0.03), Y(e.y + q * (SF - 0.03 - e.y)), R(0.018), 0, Math.sin(t * 0.3 + k) * 0.5);
    }
  // 미리 보기 표: 벽에 부딪히는 물 높이(넘치면 빨강, 앞 파도에 깎인 벽은 '깎여 n'), 둥지에 물이 닿으면 경고
  if (pre && sim) {
    for (let i = 0; i < N; i++) {
      if (!pre.hit[i] || s.K[i] === NEST) continue;
      const hNow = preHh ? preHh[i] : s.Hh[i], hz = s.K[i] === ROCK ? ROCK_H + 0.8 : s.Hh[i] + 1.4, bx = X(ccx(i)), by = Y(PY(vrowOf(i) + 0.55, hz)), over = pre.over[i] > 0;
      ctx.fillStyle = over ? '#ff5a4a' : '#2f9be0';
      ctx.beginPath();
      ctx.arc(bx, by, R(0.022), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      label(String(pre.hit[i]), bx, by + 0.5, 0.036, '#ffffff', 'rgba(0,0,0,0)');
      if (s.K[i] === WALL && hNow < s.Hh[i]) {
        ctx.fillStyle = 'rgba(90,55,20,.85)';
        ctx.beginPath();
        ctx.roundRect(bx - R(0.05), by + R(0.022), R(0.1), R(0.036), R(0.012));
        ctx.fill();
        label(hNow > 0 ? `깎여 ${hNow}` : '깎여 0', bx, by + R(0.04), 0.03, '#ffe3b0', 'rgba(0,0,0,0)');
      }
    }
    s.nests.forEach((c, j) => {
      const v = Math.min(pre!.hit[c], sim!.eggsAt[pv]?.[j] ?? 0);
      if (!v || s.K[c] !== NEST) return;
      const bx = X(ccx(c)), by = Y(ccy(c)) - R(0.062), pul = 0.6 + 0.4 * Math.sin(t * 0.2);
      ctx.fillStyle = `rgba(255,70,60,${0.85 * pul})`;
      ctx.beginPath();
      ctx.roundRect(bx - R(0.085), by - R(0.022), R(0.17), R(0.044), R(0.022));
      ctx.fill();
      label(`알 -${v}`, bx, by + 0.5, 0.036, '#ffffff', 'rgba(0,0,0,0)');
    });
  }
  // ── 꽃게 구경꾼 둘: 파도엔 '!', 아기 거북엔 '가라~!', 갈매기엔 '헉!', 퐁당엔 '와아~' ──
  const busy = new Set<number>(hat?.path ?? []);
  sim?.hatches.forEach((q) => q?.path?.forEach((i) => busy.add(i)));
  s.crabs.forEach((cb, ci) => {
    let i = cb.home;
    if (s.K[i] !== SAND || busy.has(i)) {
      let bd = 99;
      for (let j = 0; j < N; j++) {
        const d = Math.abs(rowOf(j) - rowOf(cb.home)) + Math.abs(colOf(j) - colOf(cb.home)) + (s.crabs.some((o) => o !== cb && o.home === j) ? 9 : 0);
        if (s.K[j] === SAND && !busy.has(j) && d < bd) (bd = d), (i = j);
      }
    }
    const hx = ccx(i), hy = ccy(i) + 0.015;
    let x = hx + Math.sin((t + cb.off) * 0.025) * CW * 0.28, y = hy, mood: Mood = 'calm', claws = 0.2, surf = 0, txt = '';
    const look = babies.length ? Math.sign(babies[0].x - hx) : Math.sin(t * 0.02 + ci);
    if (wave && fl && fl.lvl[i] > 0 && wt >= s.arrive[i]) {
      surf = Math.min(1, (wt - s.arrive[i]) / 50);
      const q = Math.min(1, (wt - s.arrive[i]) / (s.end - s.arrive[i]));
      x = hx + Math.sin(q * 7 + cb.off) * 0.05;
      y = hy + Math.sin(q * Math.PI) * 0.08;
      (mood = 'happy'), (claws = 1);
      if (wt - s.arrive[i] < 60) txt = '야호~';
    } else if (wave && wt < s.impact) {
      (mood = 'wow'), (claws = 0.7);
      if (wt < APPROACH && wt > 6) txt = '!';
    } else if (hat) {
      if (t - s.cryT < 50) (mood = 'wow'), (claws = 0.9), (txt = '헉!');
      else if (t - s.joyT < 40) (mood = 'happy'), (claws = 1), (txt = '와아~'), (y -= Math.abs(Math.sin(t * 0.3 + cb.off)) * 0.012);
      else if (hat.ht >= CRACK) (mood = 'happy'), (claws = 0.6 + 0.4 * Math.abs(Math.sin(t * 0.2 + ci))), (txt = hat.ht < CRACK + 50 && ci === 0 ? '가라~!' : hat.ht < CRACK + 50 && ci === 1 ? '힘내~!' : '');
      else (mood = 'wow'), (claws = 0.5);
    } else if (s.phase === 'result') (mood = s.ok ? 'happy' : 'dizzy'), (claws = s.ok ? 1 : 0.3), (y -= s.ok ? Math.abs(Math.sin(t * 0.3 + cb.off)) * 0.012 : 0);
    if (surf > 0) drawShell(ctx, X(x), Y(y) + R(0.004), R(0.02), '#fff0b3');
    drawCrab(ctx, X(x), Y(y), R(0.021), t + cb.off, mood, claws, { col: '#ff8a5c', tilt: surf ? Math.sin(t * 0.3) * 0.3 : 0, look });
    if (txt) label(txt, X(x), Y(y) - R(0.055), 0.036);
  });
  // ── 갈매기: 사냥터 위를 맴돌다 그늘 없는 칸의 아기 거북을 낚아챈다 (없는 판엔 말뚝 위에서 구경) ──
  {
    const gz = R(0.034);
    if (zn) {
      const cx = zx + Math.cos(t * 0.035) * 0.07, cy = zy - 0.15 + Math.sin(t * 0.07) * 0.012;
      ctx.fillStyle = 'rgba(30,20,10,.18)';
      ctx.beginPath();
      ctx.ellipse(X(cx), Y(zy), R(0.03), R(0.01), 0, 0, Math.PI * 2);
      ctx.fill();
      let gx = X(cx), gy = Y(cy), dirG = -Math.sin(t * 0.035) > 0 ? 1 : -1, carry: (typeof babies)[number] | null = null, swoop = false;
      if (hat && hat.path && hat.caught > 0) {
        const q = babies[0], ct = babyStart(0) + hat.ca * WALK, ht = hat.ht;
        if (ht >= ct - 24 && ht < ct) {
          const f = (ht - (ct - 24)) / 24, at = hat.path[hat.ca];
          (gx = X(cx + (ccx(at) - cx) * f)), (gy = Y(cy + (ccy(at) - 0.03 - cy) * f * f)), (swoop = true), (dirG = ccx(at) > cx ? 1 : -1);
        } else if (q && q.st === 'caught') (carry = q), (gx = X(q.x)), (gy = Y(q.y) - R(0.04)), (dirG = 1);
      }
      if (carry) drawTurtle(ctx, X(carry.x), Y(carry.y) + R(0.012), R(0.026), t, 'cry', { flip: true });
      drawGull(ctx, gx, gy, gz, t, true, dirG, swoop || !!carry);
      if (carry && carry.k < 50) label('득템~', gx, gy - R(0.05), 0.038);
      else if (swoop) label('끼룩!', gx, gy - R(0.05), 0.036);
    } else {
      const px = X(0.955), py = Y(Y1 + 0.035);
      ctx.fillStyle = '#7b5232';
      ctx.fillRect(px - R(0.008), py, R(0.016), Y(0.06));
      const squawk = s.events.some((e) => (e.kind === 'splash' || e.kind === 'plop') && t - e.t < 25);
      drawGull(ctx, px, py - gz * 0.85, gz, t, false, -1, squawk);
      if (squawk) label('깍!', px - R(0.03), py - R(0.06), 0.036);
    }
  }
  // ── 다가오는 파도 머리 (예보한 높이만큼 크다) ──
  if (wave && wt < APPROACH + 10) {
    const a = Math.min(1, wt / APPROACH), hc = R(0.04 + 0.012 * wave.h) * (0.45 + 0.55 * a);
    ctx.save();
    const al = wt > APPROACH ? Math.max(0, 1 - (wt - APPROACH) / 10) : 1;
    ctx.globalAlpha = al;
    if (wave.from === 'F') {
      const yy = Y(SF + 0.02 - (SF + 0.02 - PY(vSea) - 0.005) * Math.pow(a, 1.4));
      const lip = (x: number) => yy - hc * (0.9 + 0.1 * Math.sin(x * 0.05 + t * 0.15));
      const g = ctx.createLinearGradient(0, yy - hc, 0, yy + hc * 0.9);
      g.addColorStop(0, '#e6fdff');
      g.addColorStop(0.18, '#7fe0f2');
      g.addColorStop(0.55, '#2aa6d2');
      g.addColorStop(1, 'rgba(20,110,160,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-10, yy + hc * 0.9);
      for (let x = -10; x <= w + 10; x += 6) ctx.lineTo(x, lip(x));
      ctx.lineTo(w + 10, yy + hc * 0.9);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      for (let x = -10; x <= w + 10; x += R(0.022)) (ctx.beginPath(), ctx.arc(x, lip(x) + hc * 0.06, hc * (0.12 + 0.05 * Math.sin(x * 0.3 + t * 0.4)), 0, Math.PI * 2), ctx.fill());
    } else {
      const Lw = wave.from === 'L', edge = Lw ? X(PX(0, ROWS / 2)) : X(PX(COLS, ROWS / 2)), from = Lw ? -R(0.05) : w + R(0.05), sd = Lw ? 1 : -1;
      const xx = from + (edge - from) * Math.pow(a, 1.4), y0 = Y(Y0) - R(0.01), y1 = Y(PY(vSea)) + R(0.02);
      const lip = (y: number) => xx + sd * hc * (0.15 + 0.1 * Math.sin(y * 0.05 + t * 0.15));
      const g = ctx.createLinearGradient(xx - sd * hc * 1.5, 0, xx, 0);
      g.addColorStop(0, 'rgba(21,113,159,0)');
      g.addColorStop(0.5, '#1f8fc0');
      g.addColorStop(1, '#a9f2ff');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(xx - sd * hc * 1.5, y0);
      for (let y = y0; y <= y1; y += 6) ctx.lineTo(lip(y), y);
      ctx.lineTo(xx - sd * hc * 1.5, y1);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      for (let y = y0; y <= y1; y += R(0.022)) (ctx.beginPath(), ctx.arc(lip(y), y, hc * (0.14 + 0.06 * Math.sin(y * 0.3 + t * 0.4)), 0, Math.PI * 2), ctx.fill());
    }
    ctx.restore();
  }
  // 첫 판 첫 손짓: 알 앞(바다 쪽)을 가리키는 손가락
  if (s.stage === 0 && s.phase === 'build' && s.pi === 0 && t > 15) {
    const tc = s.nests[0] - COLS, bob = Math.abs(Math.sin(t * 0.12)) * R(0.02);
    ctx.fillStyle = `rgba(255,255,255,${0.35 + 0.2 * Math.sin(t * 0.12)})`;
    quad(colOf(tc), vrowOf(tc), colOf(tc) + 1, vrowOf(tc) + 1);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `${R(0.07)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('👆', X(ccx(tc)) + R(0.012), Y(ccy(tc)) + R(0.06) + bob);
  }
  // ── 사건 연출 ──
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const x = X(e.x), y = Y(e.y);
    if (e.kind === 'place') fx.burst(x, y, '#e8c486', 12, 2.4, 2.4), fx.ring(x, y, e.col!, R(0.06), 3), fx.kick(2), say(x, y - R(0.05), e.text!, e.col!, 13);
    if (e.kind === 'nope') say(x, y - R(0.04), e.text!, e.col!, 13), fx.kick(1.5);
    if (e.kind === 'splash') fx.burst(x, y - R(0.02), '#ffffff', 18, 3.6, 2.6), fx.burst(x, y - R(0.02), '#8fdcff', 10, 3, 2.2), fx.ring(x, y, '#ffffff', R(0.07), 3), fx.kick(3), say(x, y - R(0.06), e.text!, '#ffffff', 16);
    if (e.kind === 'over') fx.burst(x, y - R(0.02), '#9fe3ff', 22, 4, 2.6), fx.kick(4), say(x, y - R(0.06), e.text!, e.col!, 15);
    if (e.kind === 'gulp') fx.burst(x, y, '#9fe3ff', 8, 2, 2), fx.ring(x, y, '#9fe3ff', R(0.05), 2), say(x, y - R(0.03), e.text!, e.col!, 13);
    if (e.kind === 'chit') fx.burst(x, y - R(0.03), '#9fe3ff', 26, 4.5, 3), fx.kick(6), say(x, y - R(0.1), e.text!, e.col!, 16);
    if (e.kind === 'crumble') fx.burst(x, y, '#e2b878', 8, 2.2, 2.2), say(x, y - R(0.02), e.text!, '#ffe3b0', 12);
    if (e.kind === 'gone') fx.burst(x, y, '#d9ab6a', 26, 3.6, 3), fx.kick(4), say(x, y - R(0.02), e.text!, '#ffe3b0', 14);
    if (e.kind === 'safe') fx.burst(x, y - R(0.03), '#ffe066', 22, 4, 2.6), fx.ring(x, y - R(0.03), '#ffe066', R(0.1), 4), say(x, y - R(0.08), e.text!, e.col!, 17);
    if (e.kind === 'eggloss') fx.burst(x, y, '#ffffff', 20, 3.5, 2.6), fx.kick(5), fx.blink('#cfe8ff', 0.12), say(x, y - R(0.07), e.text!, e.col!, 16);
    if (e.kind === 'eggsgone') fx.burst(x, y, '#ffffff', 40, 5, 3), fx.kick(10), fx.blink(th.hot, 0.2), say(x, y - R(0.07), e.text!, e.col!, 18);
    if (e.kind === 'tide') fx.blink('#bfe6ff', 0.2), fx.kick(3), say(w / 2, y - R(0.03), e.text!, e.col!, 15);
    if (e.kind === 'incoming') fx.kick(2), say(w / 2, Y(SF - 0.03), e.text!, e.col!, 18);
    if (e.kind === 'wobble') say(x, y - R(0.05), e.text!, e.col!, 15);
    if (e.kind === 'crack') fx.burst(x, y, '#fff6e0', 30, 4, 2.6), fx.ring(x, y, '#fff1a8', R(0.09), 4), fx.kick(4), say(x, y - R(0.06), e.text!, e.col!, 18);
    if (e.kind === 'stuck') fx.kick(6), fx.blink(th.hot, 0.15), say(x, y - R(0.05), e.text!, e.col!, 17);
    if (e.kind === 'snatch') fx.burst(x, y - R(0.03), '#ffffff', 24, 4, 2.4), fx.kick(7), fx.blink('#ffd2c8', 0.15), say(x, y - R(0.09), e.text!, e.col!, 16);
    if (e.kind === 'flip') fx.burst(x, y, '#e3f6ff', 14, 3, 2.2), say(x, y - R(0.1), e.text!, e.col!, 15);
    if (e.kind === 'plop') fx.burst(x, y, '#e3f6ff', 26, 4.2, 2.8), fx.burst(x, y, '#7ee0a8', 10, 3, 2), fx.ring(x, y, '#ffffff', R(0.07), 4), fx.kick(3), say(x, y - R(0.07), e.text!, e.col!, 18);
    if (e.kind === 'clear') fx.burst(w * 0.3, Y(0.45), '#9fe3ff', 30, 6, 3), fx.burst(w * 0.3, y, '#ffe066', 40, 6, 3.2), fx.burst(w * 0.7, y, '#7ee0a8', 40, 6, 3.2), fx.ring(w / 2, y, '#ffe066', R(0.4), 7), fx.blink('#fff6c8', 0.25);
    if (e.kind === 'fail') fx.kick(8), fx.blink(th.hot, 0.2);
  }
  fx.memo.t = s.t;
  ctx.restore();

  // ═════════════ HUD ═════════════
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${R(sz)}px system-ui, sans-serif`);
  const hb = R(0.082);
  ctx.fillStyle = 'rgba(16,52,66,.82)';
  ctx.fillRect(0, 0, w, hb);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = th.ink;
  font(0.045, 900);
  const ttl = `🐢 ${s.stage + 1}번째 해변`, tw1 = ctx.measureText(ttl).width;
  ctx.fillText(ttl, R(0.03), hb * 0.5);
  font(0.036, 800);
  ctx.fillStyle = th.muted;
  ctx.fillText(` / ${STAGE_COUNT}`, R(0.03) + tw1, hb * 0.55);
  ctx.textAlign = 'right';
  font(0.042, 900);
  ctx.fillStyle = '#ffd166';
  const stt = `★ ${s.stars}`;
  ctx.fillText(stt, w - R(0.03), hb * 0.5);
  ctx.fillStyle = th.hot;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - R(0.05) - ctx.measureText(stt).width, hb * 0.5);
  // ── 예보판: 파도(방향·높이)와 부화(🥚)가 차례로 ──
  {
    const n = s.seq.length, py0 = FC.y0, ph = FC.h;
    ctx.fillStyle = 'rgba(255,250,238,.9)';
    ctx.beginPath();
    ctx.roundRect(X(0.025), Y(py0), R(0.95), R(ph), R(0.02));
    ctx.fill();
    ctx.strokeStyle = 'rgba(30,90,120,.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.fillStyle = '#1d5a72';
    font(0.036, 900);
    ctx.fillText('🌊 예보', X(0.045), Y(py0 + 0.02));
    ctx.textAlign = 'right';
    font(0.036, 700);
    ctx.fillStyle = '#4f7f90';
    ctx.fillText(s.phase === 'build' ? '카드를 톡 = 미리 보기 · 한 칸에 1씩 낮아짐' : '높이 = 물이 들어오는 칸 수', X(0.955), Y(py0 + 0.02));
    const curK = s.phase === 'wave' || s.phase === 'hatch' ? s.qi : -1;
    for (let k = 0; k < n; k++) {
      const it = s.seq[k], b = cardBox(n, k), cx0 = b.x, cy0 = b.y, cw = b.w, ch = b.h;
      const cur = k === curK, done = (curK >= 0 && k < curK) || s.phase === 'result', next = k === pv, egg = it.kind === 'hatch';
      ctx.save();
      if (cur) (ctx.shadowColor = egg ? '#b6f5c8' : '#7fdcff'), (ctx.shadowBlur = R(0.03));
      const g = ctx.createLinearGradient(0, Y(cy0), 0, Y(cy0 + ch));
      if (egg) g.addColorStop(0, cur ? '#d6ffe2' : '#fff4d8'), g.addColorStop(1, cur ? '#5fcf8a' : '#e9c98a');
      else g.addColorStop(0, cur ? '#5fd0ff' : '#8fd8ef'), g.addColorStop(1, cur ? '#1c8fc4' : '#3aa2c8');
      ctx.fillStyle = g;
      ctx.globalAlpha = done ? 0.45 : 1;
      ctx.beginPath();
      ctx.roundRect(X(cx0), Y(cy0), R(cw), R(ch), R(0.014));
      ctx.fill();
      ctx.restore();
      if (cur || next) {
        ctx.strokeStyle = cur ? '#ffffff' : '#ffd166';
        ctx.lineWidth = cur ? 2.5 : 3;
        ctx.beginPath();
        ctx.roundRect(X(cx0), Y(cy0), R(cw), R(ch), R(0.014));
        ctx.stroke();
      }
      if (next) {
        ctx.fillStyle = '#ffd166';
        ctx.beginPath();
        ctx.moveTo(X(cx0 + cw / 2 - 0.015), Y(cy0 + ch));
        ctx.lineTo(X(cx0 + cw / 2 + 0.015), Y(cy0 + ch));
        ctx.lineTo(X(cx0 + cw / 2), Y(cy0 + ch + 0.014));
        ctx.fill();
      }
      ctx.globalAlpha = done ? 0.5 : 1;
      const mx = X(cx0 + cw / 2), my = Y(cy0 + ch * 0.55);
      if (egg) {
        // 부화 카드: 금 간 알 + 고개 내민 아기 거북 (둥지가 둘이면 번호), 갈매기가 있으면 🐦
        drawEgg(ctx, X(cx0 + cw * 0.36), my + R(0.024), R(0.022), 1, -0.15);
        ctx.fillStyle = '#8fd6a0';
        ctx.beginPath();
        ctx.arc(X(cx0 + cw * 0.36), my - R(0.024), R(0.011), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1d2a1a';
        for (const sd of [-1, 1]) (ctx.beginPath(), ctx.arc(X(cx0 + cw * 0.36) + sd * R(0.004), my - R(0.026), R(0.0018), 0, Math.PI * 2), ctx.fill());
        ctx.fillStyle = '#4a3a10';
        font(0.032, 900);
        ctx.textAlign = 'center';
        ctx.fillText(s.nests.length > 1 ? `부화${it.nest + 1}` : '부화', X(cx0 + cw * 0.7), my + R(0.012), R(cw * 0.6));
        if (s.gulls) {
          ctx.fillStyle = '#ffffff';
          font(0.03, 800);
          ctx.fillText('🐦', X(cx0 + cw - 0.018), Y(cy0 + 0.018));
        }
      } else {
        ctx.save();
        ctx.translate(X(cx0 + cw * 0.25), my);
        ctx.rotate(it.from === 'F' ? -Math.PI / 2 : it.from === 'L' ? 0 : Math.PI);
        const L = R(Math.min(0.05, cw * 0.36));
        ctx.beginPath();
        ctx.moveTo(-L * 0.5, -L * 0.13);
        ctx.lineTo(L * 0.1, -L * 0.13);
        ctx.lineTo(L * 0.1, -L * 0.32);
        ctx.lineTo(L * 0.5, 0);
        ctx.lineTo(L * 0.1, L * 0.32);
        ctx.lineTo(L * 0.1, L * 0.13);
        ctx.lineTo(-L * 0.5, L * 0.13);
        ctx.closePath();
        ctx.fillStyle = '#fff6c4';
        ctx.fill();
        ctx.restore();
        font(0.056, 900);
        ctx.textAlign = 'center';
        ctx.strokeStyle = 'rgba(10,60,90,.55)';
        ctx.lineWidth = 3;
        ctx.strokeText(String(it.h), X(cx0 + cw * 0.66), my + R(0.002));
        ctx.fillStyle = '#ffffff';
        ctx.fillText(String(it.h), X(cx0 + cw * 0.66), my + R(0.002));
        if (it.rise) {
          ctx.fillStyle = '#ffffff';
          font(0.03, 800);
          ctx.fillText('🌙', X(cx0 + cw - 0.018), Y(cy0 + 0.018));
        }
      }
      font(0.034, 900);
      ctx.textAlign = 'center';
      ctx.fillStyle = egg ? 'rgba(90,60,10,.85)' : 'rgba(255,255,255,.95)';
      ctx.fillText(`${k + 1}`, X(cx0 + 0.016), Y(cy0 + 0.019));
      if (done) {
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#ffffff';
        font(0.05, 900);
        ctx.fillText('✓', mx, my);
      }
      ctx.globalAlpha = 1;
    }
  }
  // 새것 알림
  if (s.news && s.t - s.news.t < NEWS_T) {
    const age = s.t - s.news.t, a = Math.min(1, age / 10, (NEWS_T - age) / 20), drop = Math.max(0, 10 - age) * 2;
    ctx.globalAlpha = a;
    font(0.036, 900);
    ctx.textAlign = 'center';
    const tx = `✨ ${s.news.text}`, tw2 = Math.min(w - 12, ctx.measureText(tx).width + 22), by2 = Y(0.252) - drop;
    ctx.fillStyle = 'rgba(16,52,66,.9)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw2 / 2, by2 - R(0.026), tw2, R(0.052), R(0.026));
    ctx.fill();
    ctx.strokeStyle = th.accent;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(tx, w / 2, by2, w - 26);
    ctx.globalAlpha = 1;
  }
  // 판 카드: 시작 · 성공 · 실패
  {
    let head = '', sub = '', col = '#ffffff', age = 0, a = 1;
    if (s.phase === 'result') {
      age = s.pt;
      if (s.ok) {
        head = s.won ? '해변을 다 지켰다! 🐢🌊' : `바다로 퐁당! ${'★'.repeat(s.got)}${'☆'.repeat(3 - s.got)}`;
        sub = `아기 거북 ${s.savedThis}마리 바다로${s.lostThis ? ` · 알 ${s.lostThis}개 떠내려감` : ' · 알 무사 ✓'}${s.caughtThis ? ` · 갈매기 ${s.caughtThis}` : ''}${s.keep ? ` · 남긴 조각 ${s.keep}` : ''}`;
        col = '#ffd166';
      } else {
        head = s.why === 'stuck' ? '길이 막혔어요… 🚫' : s.why === 'gull' ? '갈매기가 다 채 갔어요…' : '알이 다 떠내려갔어요…';
        sub = s.hearts > 0 ? '하트 -1 · 같은 해변 처음부터 다시' : '끝 — 잘 지켰어요!';
        col = '#ffb3a8';
      }
    } else if (s.phase === 'build' && s.pt < 140) {
      age = s.pt;
      a = Math.min(1, (140 - s.pt) / 20);
      head = `${s.stage + 1}번째 해변`;
      sub = `파도 ${s.seq.filter((q) => q.kind === 'wave').length}번 · 알 ${s.eggs.reduce((p, q) => p + q, 0)}개 · 조각 ${s.pieces.length}개${s.nests.length > 1 ? ' · 둥지 둘!' : ''}`;
    }
    if (head) {
      const sc = Math.min(1, 0.6 + age / 12), cyy = Y(Y1 + 0.062), cxx = X(0.56);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(cxx, cyy);
      ctx.scale(sc, sc);
      ctx.fillStyle = 'rgba(16,52,66,.9)';
      ctx.beginPath();
      ctx.roundRect(-R(0.36), -R(0.06), R(0.72), R(0.12), R(0.04));
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = col;
      font(0.05, 900);
      ctx.fillText(head, 0, -R(0.02), R(0.68));
      ctx.fillStyle = '#fffaf0';
      font(0.036, 800);
      ctx.fillText(sub, 0, R(0.033), R(0.68));
      ctx.restore();
    }
  }
  // ═════════════ 아래 쟁반 ═════════════
  {
    const ty = TY, tb = h / w - 0.008;
    const wg = ctx.createLinearGradient(0, Y(ty), 0, Y(tb));
    wg.addColorStop(0, '#5a3b22');
    wg.addColorStop(1, '#3d2615');
    ctx.fillStyle = wg;
    ctx.beginPath();
    ctx.roundRect(X(0.01), Y(ty), X(0.98), Y(tb - ty), R(0.025));
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,220,170,.25)';
    ctx.lineWidth = 1;
    for (let k = 1; k < 4; k++) (ctx.beginPath(), ctx.moveTo(X(0.03), Y(ty + k * 0.075)), ctx.lineTo(X(0.97), Y(ty + k * 0.075 + 0.004)), ctx.stroke());
    const tile = (x: number, y: number, ww: number, hh: number, pc: number | undefined, big: boolean) => {
      ctx.fillStyle = big ? '#f7e7c4' : 'rgba(247,231,196,.75)';
      ctx.beginPath();
      ctx.roundRect(X(x), Y(y), R(ww), R(hh), R(0.016));
      ctx.fill();
      if (big) {
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
      if (pc === undefined) {
        ctx.fillStyle = 'rgba(90,60,30,.6)';
        font(0.036, 800);
        ctx.textAlign = 'center';
        ctx.fillText('없음', X(x + ww / 2), Y(y + hh / 2));
        return;
      }
      const mx = X(x + ww / 2), my = Y(y + hh * (big ? 0.45 : 0.5)), z = R(big ? 0.05 : 0.032);
      if (pc === PW) {
        ctx.fillStyle = '#d9ad66';
        ctx.fillRect(mx - z, my - z * 0.1, z * 2, z * 0.7);
        ctx.fillStyle = '#f7dc9f';
        ctx.fillRect(mx - z, my - z * 0.5, z * 2, z * 0.42);
        ctx.fillStyle = '#e6bd7c';
        for (let q = 0; q < 3; q++) ctx.fillRect(mx - z + q * z * 0.75, my - z * 0.85, z * 0.5, z * 0.38);
      } else {
        const g = ctx.createLinearGradient(0, my - z, 0, my + z * 0.6);
        g.addColorStop(0, '#c4c9d1');
        g.addColorStop(1, '#6c727c');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(mx, my + z * 0.05, z * 0.95, z * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.4)';
        ctx.beginPath();
        ctx.ellipse(mx - z * 0.3, my - z * 0.3, z * 0.3, z * 0.14, -0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      if (big) {
        ctx.fillStyle = '#5a3b22';
        font(0.038, 900);
        ctx.textAlign = 'center';
        ctx.fillText(PIECE_NAME[pc], mx, Y(y + hh * 0.86));
      }
    };
    ctx.textBaseline = 'middle';
    if (s.phase === 'build') {
      ctx.fillStyle = '#ffe9c4';
      font(0.036, 800);
      ctx.textAlign = 'left';
      if (s.pi < s.pieces.length) {
        ctx.fillText('놓을 조각', X(0.035), Y(ty + 0.022));
        ctx.fillText('다음', X(0.3), Y(ty + 0.022));
        tile(0.03, ty + 0.04, 0.24, 0.11, s.pieces[s.pi], true);
        tile(0.3, ty + 0.055, 0.14, 0.085, s.pieces[s.pi + 1], false);
        tile(0.46, ty + 0.055, 0.14, 0.085, s.pieces[s.pi + 2], false);
      } else {
        ctx.fillStyle = '#ffffff';
        font(0.044, 900);
        ctx.fillText('다 놓았어요! 🌊', X(0.04), Y(ty + 0.095));
      }
      ctx.fillStyle = '#ffe9c4';
      font(0.036, 800);
      ctx.textAlign = 'left';
      const more = s.pieces.length - s.pi - 3;
      if (more > 0) ctx.fillText(`+${more}`, X(0.555), Y(ty + 0.022));
      const pulse = s.pi >= s.pieces.length ? 1 : 0.5 + 0.5 * Math.sin(t * 0.1);
      const bg = ctx.createLinearGradient(0, Y(BTN.y), 0, Y(BTN.y + BTN.h));
      bg.addColorStop(0, '#ffcf5a');
      bg.addColorStop(1, '#f08c2e');
      ctx.save();
      ctx.shadowColor = '#ffcf5a';
      ctx.shadowBlur = R(0.02) * pulse;
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.roundRect(X(BTN.x), Y(BTN.y), R(BTN.w), R(BTN.h), R(0.03));
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#4a2a0c';
      font(0.05, 900);
      ctx.textAlign = 'center';
      ctx.fillText('▶ 버티기', X(BTN.x + BTN.w / 2), Y(BTN.y + BTN.h * 0.42));
      font(0.036, 800);
      ctx.fillText('남기면 +3점씩', X(BTN.x + BTN.w / 2), Y(BTN.y + BTN.h * 0.8));
    } else {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffe9c4';
      font(0.042, 900);
      const msg = s.phase === 'wave' ? `${s.qi + 1}/${s.seq.length} 파도 — 버텨라!` : s.phase === 'hatch' ? `${s.qi + 1}/${s.seq.length} 부화 — 바다로 가자!` : s.ok ? '바다로 퐁당! 꽃게들이 춤춰요' : '다시 지어 봐요';
      ctx.fillText(msg, X(0.04), Y(ty + 0.045));
      // 둥지마다 남은 알
      s.nests.forEach((c, j) => {
        font(0.036, 800);
        ctx.fillStyle = '#ffe9c4';
        const lx = X(0.04 + j * 0.48), ly = Y(ty + 0.11), nm = s.nests.length > 1 ? `둥지${j + 1}` : '둥지', tw0 = ctx.measureText(nm).width;
        ctx.fillText(nm, lx, ly);
        const left = s.K[c] === NEST ? s.eggs[j] : 0;
        for (let q = 0; q < s.eggs0[j]; q++) {
          const ex = lx + tw0 + R(0.03) + q * R(0.04);
          ctx.fillStyle = q < left ? '#fff6e6' : s.hatched[j] && q < s.eggs0[j] ? 'rgba(126,224,168,.9)' : 'rgba(255,255,255,.18)';
          ctx.beginPath();
          ctx.ellipse(ex, ly, R(0.012), R(0.016), 0, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }
    let hint = '';
    if (s.phase === 'build') {
      const pc = s.pieces[s.pi];
      if (s.stage === 0 && s.pi === 0) hint = '👆 모래를 톡! 알 앞(바다 쪽)에 모래벽을 쌓아요';
      else if (sim && sim.hatches.some((q) => q && !q.path)) hint = '🚫 아기 거북 길이 막혀요 — 바다로 갈 틈을 남겨요';
      else if (pc === PW) hint = '모래벽: 높이 3 · 맞으면 깎여요 (벽에 또 쌓으면 +2)';
      else if (pc === PR) hint = '돌: 높이 4 · 안 깎여요 — 대신 길도 영영 막아요';
      else hint = '파도가 곧 와요!';
    } else if (s.phase === 'wave' && wave) hint = `${wave.from === 'F' ? '바다' : wave.from === 'L' ? '왼쪽' : '오른쪽'}에서 높이 ${wave.h} — 한 칸에 1씩 낮아져요`;
    else if (s.phase === 'hatch') hint = hat && !hat.path ? '벽이 길을 다 막았어요!' : '초록 점선 = 아기 거북 길 · 벽·돌 옆은 그늘이라 안전';
    else if (s.phase === 'result') hint = s.ok ? `별 ${s.got}개! 다음 해변은 더 세요` : s.why === 'stuck' ? '벽에 틈을 남기거나, 깎여 열리게 해 봐요' : s.why === 'gull' ? '길 옆에 벽을 세워 그늘을 만들어요' : '둥지 둘레를 벽으로 막아 봐요';
    ctx.textAlign = 'center';
    const first = s.stage === 0 && s.pi === 0 && s.phase === 'build';
    ctx.fillStyle = first ? '#ffffff' : '#ffe9c4';
    font(first ? 0.044 : 0.038, 900);
    ctx.fillText(hint, w / 2, Y(ty + 0.19), w - R(0.06));
    ctx.fillStyle = 'rgba(255,233,196,.65)';
    font(0.036, 700);
    ctx.fillText(`점수 ${s.pts} · 바다로 간 아기 거북 ${s.saved}`, w / 2, Y(ty + 0.24));
  }
}
