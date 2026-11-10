/**
 * 꽃게 갯벌 수로 (22라운드 '밀물 모래성의 결') — 지어서 버티기 × 재난 예보 × 가리키기(톡).
 * 같은 해변, 다른 놀이: 밀물 모래성은 물을 '막았다'. 여기선 물을 **들인다**.
 * 기준 9(손이 하는 일은 하나): 갯벌을 톡 = 그 칸에 다음 조각(파기·모래벽). 다 놓거나 '▶ 버티기'를 톡 치면 파도가 온다.
 * 와우: 파도가 물고기·조개·불가사리(큰 파도엔 문어)를 싣고 온다. 갯벌을 파 두면 물이 그리로 흘러 들어가고, 물이 빠지면 보물이 웅덩이에 남는다.
 *       그런데 같은 파도가 꽃게 집으로도 온다 — 막을 물과 들일 물을 한 파도에서 나눈다.
 * 물(결정적 칸 규칙, 밀물 모래성과 같은 결): 파도 높이 H = 바닷가 첫 줄에 서는 물의 높이. 앞으로 한 칸에 1, 옆으로는 2씩 낮아진다.
 *   판 칸(수로·웅덩이)에 들어갈 땐 안 낮아진다(물길). 모래벽(높이 3)은 제 높이까지 막고, 부딪히면 1·넘치면 2 깎인다.
 * 보물: 파도에 실린 보물은 제 줄(앞 파도면 세로줄, 옆 파도면 가로줄)을 따라 물이 닿는 데까지 밀려오다가 지나는 첫 웅덩이에 퐁당 남는다.
 *   웅덩이를 못 만나면 바다로 돌아간다. 문어는 물이 3 이상 깊은 웅덩이에만 남는다.
 * 첫 3초: 1판은 조각 하나(파기). 손가락이 가리키는 칸을 톡 파면 바로 첫 파도가 들어와 물고기 두 마리가 웅덩이에 퐁당, 꽃게 아이들이 '와아!'.
 * 목표·보상: 판(물때)마다 파도를 다 버티면 별 — ★ 꽃게 집 무사 · ★ 보물 목표 수 · ★ 문어(없는 판은 보물 전부).
 *   꽃게 집에 물이 닿으면 하트 -1, 그 판을 처음부터 다시(같은 갯벌). 하트 셋을 다 잃거나 8판을 마치면 끝. 점수 = 모은 보물 + 별.
 * 펼쳐짐(하는 일이 바뀐다): 1판 파기(웅덩이) → 2판 모래벽·깎임(집이 바다 가까이) → 3판 큰 파도의 문어(깊은 웅덩이 = 수로로 물을 끌어온다)
 *   → 4판 옆 파도·불가사리(보물이 옆줄로 온다) → 5판 바위·해초(물이 더 낮아짐, 파면 없어짐) → 6판 밀물(바닷가 웅덩이가 잠긴다 → 안쪽에 판다)
 *   → 7판 이웃집(두 집을 지킨다) → 8판 대왕 물때(전부).
 * 웃음(기준 10): 웅덩이에 남은 물고기가 파닥파닥 튀고, 꽃게 아이들이 줄 서서 보물을 나르고, 갈매기가 보물을 훔치려다 집게에 코를 물린다.
 *   집에 물이 들면 엄마 꽃게가 빨래를 이고 허둥지둥 도망친다.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.42;
export const COLS = 8, ROWS = 7, N = COLS * ROWS;
export const SAND = 0, WALL = 1, ROCK = 2, DUG = 3, HOUSE = 4, SEA = 5, WEED = 6;
/** 조각: 파기 · 모래벽 */
export const PD = 0, PW = 1;
/** 보물: 물고기 · 조개 · 불가사리 · 문어 */
export const FISH = 0, SHELL = 1, STAR = 2, OCTO = 3;
const LOOT_PTS = [5, 5, 5, 20];
const LOOT_NAME = ['물고기', '조개', '불가사리', '문어'];
const WALL_H = 3, STACK = 2, MAX_H = 7, ROCK_H = 4, DEEP = 3;
/** 파도 연출(틱): 다가오기 · 한 칸 번질 때마다 · 다 번진 뒤 머무름 · 빠짐 · 꽃게 아이들이 보물 나르기 */
const APPROACH = 34, STEP = 6, HOLD = 30, RECEDE = 44, CARRY = 60;
const RESULT = 160, AUTO = 22, PREVIEW = 130;

type From = 'F' | 'L' | 'R';
export interface Item { k: number; lane: number }
export interface Wave { h: number; from: From; rise: boolean; cargo: Item[] }
interface StageDef { waves: string; pieces: string; row: number; rocks?: number; weeds?: number; twin?: boolean; goal?: number }
/**
 * 판(물때) 8개. waves: F=바다 쪽(앞)에서, S=옆(왼쪽·오른쪽), 숫자=높이, ':' 뒤=싣고 오는 보물(f 물고기·s 조개·t 불가사리·o 문어),
 * 앞에 +면 그 파도 전에 바다가 한 줄 올라온다(밀물). pieces: D=파기, W=모래벽. row=꽃게 집 줄(바다에서 몇 번째).
 */
const STAGES: StageDef[] = [
  { waves: 'F3:ff', pieces: 'D', row: 5 },
  { waves: 'F4:fs F4:ff', pieces: 'DWDD', row: 4 },
  { waves: 'F4:fs F6:of F4:sf', pieces: 'DWDWD', row: 4 },
  { waves: 'F5:ft S4:fs F5:sf', pieces: 'WDWDDW', row: 4 },
  { waves: 'F5:ff F5:st F6:of', pieces: 'DWDWDW', row: 4, rocks: 2, weeds: 4 },
  { waves: 'F4:ff +F4:fs +F5:of', pieces: 'DWDDWD', row: 5, weeds: 2 },
  { waves: 'F5:fs S3:ft F6:of', pieces: 'WDWDWDWD', row: 5, twin: true, rocks: 1 },
  { waves: 'F5:ff S3:st +F5:of S3:fs F5:sf', pieces: 'WDWDWDWDW', row: 5, twin: true, rocks: 1, weeds: 3 },
];
export const STAGE_COUNT = STAGES.length;
const PIECE_NAME = ['파기', '모래벽'];

export const NB: number[][] = [...Array(N).keys()].map((i) => {
  const r = Math.floor(i / COLS), c = i % COLS, out: number[] = [];
  if (r > 0) out.push(i - COLS);
  if (c > 0) out.push(i - 1);
  if (c < COLS - 1) out.push(i + 1);
  if (r < ROWS - 1) out.push(i + COLS);
  return out;
});
const rowOf = (i: number) => Math.floor(i / COLS), colOf = (i: number) => i % COLS;

export interface Board { K: Uint8Array; Hh: Int8Array; sea: number }
export interface Flood { lvl: Int8Array; hit: Int8Array; over: Uint8Array }

const BK: number[][] = Array.from({ length: 16 }, () => []);
/**
 * 파도 하나가 어디까지 얼마나 높이 들어오나 (결정적, 봇이 내다볼 때도 같은 함수).
 * 높이 H의 물이 바닷가 첫 줄(옆 파도면 옆 첫 칸)에 선다. 파도가 오는 쪽으로 한 칸 갈 때마다 1, 옆·뒤로는 2씩 낮아진다.
 * 판 칸(수로·웅덩이)에 들어갈 땐 안 낮아지고, 해초 칸에선 1 더 낮아진다.
 * 벽(모래벽·바위)은 자기 높이 이하의 물을 막고(hit 기록), 넘는 물은 넘은 만큼만 이어 간다. 꽃게 집에 닿은 물은 hit에 남는다.
 */
export function flood(K: Uint8Array, Hh: Int8Array, w: Wave, sea: number): Flood {
  const lvl = new Int8Array(N), hit = new Int8Array(N), over = new Uint8Array(N);
  for (const q of BK) q.length = 0;
  const enter = (b: number, inc: number) => {
    if (inc <= 0) return;
    const k = K[b];
    if (k === SEA) return;
    if (k === HOUSE) {
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
  const h = Math.min(15, w.h), fwd = w.from === 'F' ? COLS : w.from === 'L' ? 1 : -1;
  if (w.from === 'F') for (let c = 0; c < COLS; c++) enter(sea * COLS + c, h);
  else for (let r = sea; r < ROWS; r++) enter(r * COLS + (w.from === 'L' ? 0 : COLS - 1), h);
  for (let l = 15; l >= 1; l--) {
    const q = BK[l];
    for (let j = 0; j < q.length; j++) {
      const b = q[j];
      if (lvl[b] !== l) continue;
      for (const n of NB[b]) {
        const k = K[n], cost = k === DUG ? 0 : (n - b === fwd ? 1 : 2) + (k === WEED ? 1 : 0);
        enter(n, l - cost);
      }
    }
  }
  return { lvl, hit, over };
}

/** 보물이 가는 길: 제 줄을 따라 물이 닿는 데까지 밀려오다 첫 웅덩이에 남는다(문어는 깊이 3 이상). 칸 목록과 남은 칸(-1이면 바다로) */
export function land(K: Uint8Array, f: Flood, w: Wave, sea: number): { path: number[]; at: number }[] {
  const step = w.from === 'F' ? COLS : w.from === 'L' ? 1 : -1;
  return w.cargo.map((it) => {
    let i = w.from === 'F' ? sea * COLS + it.lane : it.lane * COLS + (w.from === 'L' ? 0 : COLS - 1);
    const path: number[] = [];
    let at = -1;
    for (let k = 0; k < Math.max(ROWS, COLS); k++) {
      if (i < 0 || i >= N || (w.from !== 'F' && rowOf(i) !== it.lane)) break;
      const kk = K[i];
      if (f.lvl[i] <= 0 || !(kk === SAND || kk === DUG || kk === WEED)) break;
      path.push(i);
      if (kk === DUG && (it.k !== OCTO || f.lvl[i] >= DEEP)) {
        at = i;
        break;
      }
      i += step;
    }
    return { path, at };
  });
}

/** 파도가 지나간 뒤: 모래벽이 깎이고(맞으면 1, 넘치면 2), 젖은 꽃게 집을 알려 준다 */
export function settle(B: Board, f: Flood) {
  const crumble: number[] = [], gone: number[] = [], wetH: number[] = [];
  for (let i = 0; i < N; i++) {
    if (B.K[i] === WALL && f.hit[i] > 0) {
      B.Hh[i] -= f.over[i] ? 2 : 1;
      crumble.push(i);
      if (B.Hh[i] <= 0) (B.K[i] = SAND), (B.Hh[i] = 0), gone.push(i);
    }
    if (B.K[i] === HOUSE && f.hit[i] > 0) wetH.push(i);
  }
  return { crumble, gone, wetH };
}

/** 밀물: 바닷가 첫 줄이 바다에 잠긴다 (그 줄의 조각·웅덩이는 사라진다) */
export function tideUp(B: Board) {
  for (let c = 0; c < COLS; c++) {
    const i = B.sea * COLS + c;
    B.K[i] = SEA;
    B.Hh[i] = 0;
  }
  B.sea++;
}

interface House { cell: number; mom: boolean }
interface Ev { t: number; kind: string; x: number; y: number; text?: string; col?: string; i?: number }
interface Kid { home: number; off: number }
/** 웅덩이에 남은 보물 (꽃게 아이들이 나를 때까지) */
interface Got { k: number; cell: number; t: number; carrier: number }
export interface PoolState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'build' | 'wave' | 'result'; pt: number;
  K: Uint8Array; Hh: Int8Array; nat: Uint8Array; houses: House[]; sea: number;
  waves: Wave[]; wi: number; wt: number; fl: Flood | null; lands: { path: number[]; at: number }[]; arrive: Int16Array; impact: number; end: number;
  pieces: number[]; pi: number; auto: number; wet: Float32Array; puddle: Float32Array; goal: number;
  hearts: number; stars: number; got: number; pts: number; ok: boolean; keep: number; wetHouse: number;
  bag: number[]; lootPts: number; octoAny: boolean; octoGot: boolean; regTotal: number; held: Got[];
  down: boolean; taps: number; seen: Set<string>; newsQ: { text: string; t: number }[]; events: Ev[]; dead: boolean; won: boolean;
  kids: Kid[]; lastPlace: number; place: Int16Array; peak: Int8Array; pin: number; gullT: number; gullCell: number; momT: number;
}

const ev = (s: PoolState, kind: string, x: number, y: number, text?: string, col?: string, i?: number) => s.events.push({ t: s.t, kind, x, y, text, col, i });
function see(s: PoolState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  const last = s.newsQ.length ? s.newsQ[s.newsQ.length - 1].t : -999;
  s.newsQ.push({ text, t: Math.max(s.t, last + NEWS) });
  if (s.newsQ.length > 6) s.newsQ.shift();
}
const NEWS = 170;

// ───────── 화면 배치 (가로 0~1, 세로 0~A) — 바다 쪽에서 본 3/4 시점: 바다가 앞(아래), 모래언덕이 뒤(위). 뒤쪽 줄이 좁다 ─────────
const CW = 0.108, CH = 0.085, Y0 = 0.36, Y1 = Y0 + ROWS * CH, HZ = 0.016;
const scl = (r: number) => 0.87 + 0.13 * (r / ROWS);
const PX = (c: number, r: number) => 0.5 + (c - COLS / 2) * CW * scl(r);
const PY = (r: number, z = 0) => Y0 + r * CH - z * HZ;
const vrowOf = (i: number) => ROWS - 1 - rowOf(i);
const ccx = (i: number) => PX(colOf(i) + 0.5, vrowOf(i) + 0.5), ccy = (i: number) => PY(vrowOf(i) + 0.5);
/** 아래 쟁반: 조각 미리 보기 · '▶ 버티기' 단추 */
const TY = Y1 + 0.19, BTN = { x: 0.635, y: TY + 0.03, w: 0.33, h: 0.11 };
/** 위 예보판 */
const FP = { y: 0.09, h: 0.16 };
const cardGeo = (n: number) => {
  const gap = 0.014, cw = Math.min(0.17, (0.9 - gap * (n - 1)) / n), x0 = 0.5 - (cw * n + gap * (n - 1)) / 2;
  return { gap, cw, x0, cy0: FP.y + 0.036, ch: 0.114 };
};

function cellAt(x: number, y: number): number {
  if (y < Y0 || y >= Y1) return -1;
  const vr = Math.floor((y - Y0) / CH), c = Math.floor((x - 0.5) / (CW * scl(vr + 0.5)) + COLS / 2);
  return c < 0 || c >= COLS ? -1 : (ROWS - 1 - vr) * COLS + c;
}

function boardOf(s: PoolState): Board {
  return { K: s.K.slice(), Hh: s.Hh.slice(), sea: s.sea };
}

export function canPlace(K: Uint8Array, Hh: Int8Array, i: number, p: number) {
  if (K[i] === SAND || K[i] === WEED) return true;
  return p === PW && K[i] === WALL && Hh[i] < MAX_H;
}
function put(B: { K: Uint8Array; Hh: Int8Array }, i: number, p: number) {
  if (p === PW) B.K[i] === WALL ? (B.Hh[i] = Math.min(MAX_H, B.Hh[i] + STACK)) : ((B.K[i] = WALL), (B.Hh[i] = WALL_H));
  else (B.K[i] = DUG), (B.Hh[i] = 0);
}

/** 판 구성: 같은 판은 다시 해도 같은 갯벌 (실패하면 '처음부터 다시 짓기') */
export function newStage(s: PoolState) {
  const d = STAGES[s.stage], r = mulberry32((s.seed * 31 + s.stage * 7919 + 17) >>> 0);
  s.K = new Uint8Array(N);
  s.Hh = new Int8Array(N);
  s.nat = new Uint8Array(N);
  s.wet = new Float32Array(N);
  s.puddle = new Float32Array(N);
  s.place = new Int16Array(N).fill(-999);
  s.peak = new Int8Array(N);
  s.sea = 0;
  const hc = 2 + Math.floor(r() * 4), row = d.row;
  s.houses = [{ cell: row * COLS + hc, mom: true }];
  if (d.twin) s.houses.push({ cell: row * COLS + (hc <= 3 ? hc + 3 : hc - 3), mom: false });
  for (const hs of s.houses) s.K[hs.cell] = HOUSE;
  const near = (i: number, dmax: number) => s.houses.some((h) => Math.abs(rowOf(i) - rowOf(h.cell)) <= dmax && Math.abs(colOf(i) - colOf(h.cell)) <= dmax);
  const free = (r0: number, r1: number, ok: (i: number) => boolean) => {
    for (let k = 0; k < 80; k++) {
      const i = (r0 + Math.floor(r() * (r1 - r0 + 1))) * COLS + Math.floor(r() * COLS);
      if (s.K[i] === SAND && ok(i)) return i;
    }
    return -1;
  };
  for (let k = 0; k < (d.rocks ?? 0); k++) {
    const i = free(1, row - 1, (j) => !near(j, 1) && !NB[j].some((n) => s.K[n] === ROCK));
    if (i >= 0) (s.K[i] = ROCK), (s.nat[i] = 1);
  }
  for (let k = 0; k < (d.weeds ?? 0); k++) {
    const i = free(0, row, (j) => !near(j, 0));
    if (i >= 0) (s.K[i] = WEED), (s.nat[i] = 1);
  }
  // 파도와 실린 보물(보물마다 줄). 줄은 꽃게 집 근처로 — 들일 물과 막을 물이 같은 곳에서 만난다
  let seaAt = 0;
  s.waves = d.waves.split(' ').map((x, wi) => {
    const rise = x[0] === '+', y = rise ? x.slice(1) : x, [hd, cg] = y.split(':');
    if (rise) seaAt++;
    const from = (hd[0] === 'S' ? (r() < 0.5 ? 'L' : 'R') : hd[0]) as From;
    const cargo: Item[] = [];
    let prev = -1;
    for (const ch of cg ?? '') {
      const k = ch === 'f' ? FISH : ch === 's' ? SHELL : ch === 't' ? STAR : OCTO;
      const hs = s.houses[Math.floor(r() * s.houses.length)].cell;
      let lane: number;
      if (s.stage === 0) lane = prev >= 0 ? prev : hc + (r() < 0.5 ? -2 : 2);
      else if (prev >= 0 && r() < 0.35) lane = prev;
      else if (from === 'F') lane = Math.max(0, Math.min(COLS - 1, colOf(hs) - 2 + Math.floor(r() * 5)));
      else lane = Math.max(seaAt, Math.min(ROWS - 1, rowOf(hs) - 2 + Math.floor(r() * 4)));
      cargo.push({ k, lane });
      prev = lane;
    }
    void wi;
    return { h: Number(hd.slice(1)), from, rise, cargo };
  });
  const ps: number[] = [...d.pieces].map((ch) => (ch === 'D' ? PD : PW));
  for (let k = ps.length - 1; k > 1; k--) {
    const j = 1 + Math.floor(r() * k);
    [ps[k], ps[j]] = [ps[j], ps[k]];
  }
  s.pieces = ps;
  s.pi = 0;
  s.auto = 0;
  s.wi = 0;
  s.wt = 0;
  s.fl = null;
  s.lands = [];
  s.phase = 'build';
  s.pt = 0;
  s.wetHouse = -1;
  s.bag = [0, 0, 0, 0];
  s.lootPts = 0;
  s.octoGot = false;
  s.held = [];
  s.pin = -1;
  s.gullT = -1;
  s.gullCell = -1;
  s.momT = -1;
  const all = s.waves.flatMap((w) => w.cargo);
  s.octoAny = all.some((it) => it.k === OCTO);
  s.regTotal = all.filter((it) => it.k !== OCTO).length;
  s.goal = d.goal ?? Math.max(1, Math.ceil(s.regTotal * 0.6));
  // 꽃게 아이들 셋 (집 옆 갯벌에서 논다 — 연출만)
  s.kids = [];
  for (let k = 0; k < 3; k++) {
    const i = free(Math.max(0, row - 1), Math.min(ROWS - 1, row + 1), (j) => near(j, 1) && !s.kids.some((q) => q.home === j));
    s.kids.push({ home: i >= 0 ? i : s.houses[0].cell, off: k * 37 });
  }
  // 새것 알림
  see(s, 'dig', '🕳️ 파기 — 판 칸에선 물이 안 낮아지고 고여요');
  see(s, 'loot', '🐟 파도가 보물을 싣고 와요 — 제 줄을 따라 첫 웅덩이에 퐁당');
  if (ps.includes(PW)) see(s, 'wall', '🧱 모래벽 — 제 높이까지 물을 막지만 맞으면 깎여요');
  if (s.octoAny) see(s, 'octo', '🐙 큰 파도엔 문어! 물 3 이상 깊은 웅덩이에만 남아요');
  if (s.waves.some((w) => w.from !== 'F')) see(s, 'side', '↔️ 옆 파도 — 보물이 옆줄을 따라 와요');
  if (all.some((it) => it.k === STAR)) see(s, 'star', '⭐ 불가사리도 와요');
  if (d.rocks) see(s, 'rock', '🪨 바위 — 물 4까지 막아요 (못 파요)');
  if (d.weeds) see(s, 'weed', '🌿 해초 — 물이 1 더 낮아져요 (파면 없어져요)');
  if (s.waves.some((w) => w.rise)) see(s, 'tide', '🌙 밀물 — 파도마다 바다가 한 줄씩 올라와요');
  if (d.twin) see(s, 'twin', '🏠 이웃집 — 두 집 다 젖으면 안 돼요');
  ev(s, 'stage', 0.5, Y1 + 0.06, `${s.stage + 1}번째 물때 — 파도 ${s.waves.length}번!`);
}

function startWaves(s: PoolState) {
  s.phase = 'wave';
  s.wi = 0;
  s.taps++;
  s.pin = -1;
  startWave(s);
}

function startWave(s: PoolState) {
  const w = s.waves[s.wi];
  s.wt = 0;
  s.fl = flood(s.K, s.Hh, w, s.sea);
  s.lands = land(s.K, s.fl, w, s.sea);
  s.arrive = new Int16Array(N).fill(-1);
  for (let i = 0; i < N; i++) {
    const v = Math.max(s.fl.lvl[i], s.fl.hit[i]);
    if (v > 0) s.arrive[i] = APPROACH + STEP * Math.max(0, w.h - v);
  }
  s.impact = APPROACH + STEP * w.h + 4;
  s.end = s.impact + HOLD + RECEDE + CARRY;
  ev(s, 'incoming', 0.5, 0.33, `${w.from === 'F' ? '파도' : '옆 파도'} ${s.wi + 1} — 높이 ${w.h}!${w.cargo.some((it) => it.k === OCTO) ? ' 문어다!' : ''}`, '#e3f6ff');
}

function waveStep(s: PoolState) {
  s.wt++;
  const f = s.fl!, w = s.waves[s.wi];
  if (s.wt < s.impact) {
    for (let i = 0; i < N; i++) {
      if (s.arrive[i] !== s.wt) continue;
      const x = ccx(i), y = ccy(i);
      s.wet[i] = 1;
      if (s.K[i] === HOUSE) ev(s, 'chit', x, y, '앗 차가!', '#ffb3a8', i);
      else if ((s.K[i] === WALL || s.K[i] === ROCK) && f.over[i]) ev(s, 'over', x, y, '넘쳤다!', '#bfe9ff', i);
      else if (s.K[i] === WALL || s.K[i] === ROCK) ev(s, 'splash', x, y, s.K[i] === ROCK ? '탁!' : '철썩!', '#ffffff', i);
      else if (s.K[i] === DUG) {
        s.puddle[i] = 1;
        ev(s, 'fill', x, y, undefined, undefined, i);
      }
    }
  }
  if (s.wt === s.impact) {
    const B: Board = { K: s.K, Hh: s.Hh, sea: s.sea };
    const r = settle(B, f);
    for (const i of r.crumble) ev(s, r.gone.includes(i) ? 'gone' : 'crumble', ccx(i), ccy(i) - 0.02, r.gone.includes(i) ? '와르르' : '-' + (f.over[i] ? 2 : 1), '#f3d9a4');
    if (r.crumble.length) see(s, 'erode', '모래벽이 깎였어요 — 다음 파도는 더 넘어와요');
    if (r.wetH.length) {
      s.wetHouse = s.houses.findIndex((h) => r.wetH.includes(h.cell));
      if (s.momT < 0) s.momT = s.t;
      for (const i of r.wetH) ev(s, 'flooded', ccx(i), ccy(i) - 0.03, '집에 물이 들었어요!', '#ffb3a8', i);
    } else
      for (const hs of s.houses)
        if (NB[hs.cell].some((n) => f.lvl[n] > 0 || f.hit[n] > 0)) ev(s, 'safe', ccx(hs.cell), ccy(hs.cell) - 0.04, '휴~ 뽀송뽀송!', '#fff1a8', hs.cell);
    // 보물이 웅덩이에 퐁당
    let caught = 0;
    s.lands.forEach((L, j) => {
      const it = w.cargo[j];
      if (L.at >= 0) {
        caught++;
        s.bag[it.k]++;
        s.lootPts += LOOT_PTS[it.k];
        if (it.k === OCTO) s.octoGot = true;
        s.held.push({ k: it.k, cell: L.at, t: s.t, carrier: s.held.length % Math.max(1, s.kids.length) });
        ev(s, 'catch', ccx(L.at), ccy(L.at), it.k === OCTO ? '문어다!' : '퐁당!', it.k === OCTO ? '#ffc6f0' : '#ffffff', L.at);
        if (s.gullT < 0 && s.stage > 0) (s.gullT = s.t + 2), (s.gullCell = L.at);
      } else {
        const e = L.path.length ? L.path[L.path.length - 1] : -1;
        ev(s, 'lost', e >= 0 ? ccx(e) : 0.5, e >= 0 ? ccy(e) : Y1, `${LOOT_NAME[it.k]} 바다로~`, '#cfe8ff', e);
      }
    });
    if (caught && s.kids.length) ev(s, 'yay', ccx(s.kids[0].home), ccy(s.kids[0].home) - 0.04, '와아!', '#fff1a8');
    if (s.K.some((k, i) => k === DUG && NB[i].some((n) => s.K[n] === DUG) && f.lvl[i] > 0)) see(s, 'channel', '〰️ 수로 — 판 칸을 이으면 물이 안 낮아지고 멀리 가요');
  }
  if (s.wt >= s.end) {
    s.held = [];
    s.wi++;
    s.fl = null;
    s.lands = [];
    if (s.wetHouse >= 0) return endStage(s, false);
    if (s.wi >= s.waves.length) return endStage(s, true);
    if (s.waves[s.wi].rise) {
      tideUp({ K: s.K, Hh: s.Hh, sea: s.sea });
      s.sea++;
      ev(s, 'tide', 0.5, PY(ROWS - s.sea), '🌙 밀물! 바다가 한 줄 올라왔어요', '#cfe8ff');
    }
    startWave(s);
  }
}

function starsOf(s: { bag: number[]; goal: number; octoAny: boolean; octoGot: boolean; regTotal: number }) {
  const reg = s.bag[FISH] + s.bag[SHELL] + s.bag[STAR];
  return 1 + (reg >= s.goal ? 1 : 0) + (s.octoAny ? (s.octoGot ? 1 : 0) : reg >= s.regTotal ? 1 : 0);
}

function endStage(s: PoolState, ok: boolean) {
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  if (ok) {
    const left = s.pieces.length - s.pi, st = starsOf(s);
    s.got = st;
    s.stars += st;
    s.keep = left;
    s.pts += 20 + st * 10 + s.lootPts + left * 3;
    const last = s.stage === STAGES.length - 1;
    if (last) (s.won = true), (s.pts += 30);
    ev(s, 'clear', 0.5, Y1 + 0.06, `${s.stage + 1}번째 물때 성공! ${'★'.repeat(st)}${'☆'.repeat(3 - st)}`);
  } else {
    s.hearts--;
    ev(s, 'fail', 0.5, Y1 + 0.06, s.hearts > 0 ? '집이 젖었어요… 하트 -1 · 다시 짓기' : '집이 젖었어요… 끝');
  }
}

export const crabpools: GameDef<PoolState> = {
  id: 'crabpools',
  name: '꽃게 갯벌 수로',
  genes: ['fortify', 'forecast', 'pointer'],
  twist: '파도가 물고기·조개·문어를 싣고 온다 — 갯벌을 파 두면 물이 그리로 흘러들어 물이 빠진 뒤 보물이 웅덩이에 남는데, 같은 파도가 꽃게 집으로도 오니 막을 물과 들일 물을 한 파도에서 나눠야 한다',
  rules: [
    '갯벌을 톡 = 파기·모래벽. 파도가 싣고 온 보물은 제 줄을 따라 와 첫 웅덩이에 남아요 — 꽃게 집은 젖으면 안 돼요!',
    '물은 앞으로 1·옆으로 2씩 낮아지고 판 칸에선 안 낮아져요. 모래벽은 제 높이까지 막고, 맞으면 깎여요.',
  ],
  controls: 'touch',
  hint: '갯벌을 톡 = 파기·모래벽 놓기 · ▶ 버티기 / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '꽃게 가족의 갯벌 수로 디오라마',
    mood: '물이 빠진 반짝이는 갯벌 — 젖은 모래에 하늘이 비치고, 파 놓은 웅덩이마다 물고기가 파닥인다. 꽃게 엄마는 빨래를 널고 아이들은 줄지어 보물을 나르며, 갈매기가 호시탐탐. 물때가 지날수록 해가 기울어 노을과 등불.',
    palette: { bg: '#1f4a5c', ink: '#fffaf0', muted: '#9fc3cc', accent: '#ffd166', hot: '#ff6b5a', soft: '#e7d3a4' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'build', pt: 0,
      K: new Uint8Array(N), Hh: new Int8Array(N), nat: new Uint8Array(N), houses: [], sea: 0,
      waves: [], wi: 0, wt: 0, fl: null, lands: [], arrive: new Int16Array(N), impact: 0, end: 0,
      pieces: [], pi: 0, auto: 0, wet: new Float32Array(N), puddle: new Float32Array(N), goal: 1,
      hearts: 3, stars: 0, got: 0, pts: 0, ok: false, keep: 0, wetHouse: -1,
      bag: [0, 0, 0, 0], lootPts: 0, octoAny: false, octoGot: false, regTotal: 0, held: [],
      down: false, taps: 0, seen: new Set<string>(), newsQ: [], events: [], dead: false, won: false,
      kids: [], lastPlace: -999, place: new Int16Array(N), peak: new Int8Array(N), pin: -1, gullT: -1, gullCell: -1, momT: -1,
    } as PoolState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    s.pt++;
    s.events = s.events.filter((e) => s.t - e.t < 110);
    for (let i = 0; i < N; i++) {
      if (s.wet[i] > 0 && s.phase !== 'wave') s.wet[i] = Math.max(0, s.wet[i] - 1 / 420);
      if (s.puddle[i] > 0 && s.phase !== 'wave') s.puddle[i] = Math.max(0, s.puddle[i] - 1 / 900);
      if (s.K[i] !== DUG) s.puddle[i] = 0;
    }
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
    // 짓기: 다 놓으면 잠깐 뒤 파도
    if (s.auto > 0 && --s.auto === 0) return startWaves(s);
    if (!press || !p || s.auto > 0) return;
    const x = p.x, y = p.y * A;
    if (x >= BTN.x && x <= BTN.x + BTN.w && y >= BTN.y && y <= BTN.y + BTN.h) return startWaves(s);
    // 예보 카드를 톡 = 그 파도 미리 보기 고정 (한 번 더 톡 = 풀기)
    {
      const g = cardGeo(s.waves.length);
      if (y >= g.cy0 && y <= g.cy0 + g.ch)
        for (let k = 0; k < s.waves.length; k++) {
          const cx0 = g.x0 + k * (g.cw + g.gap);
          if (x >= cx0 && x <= cx0 + g.cw) return void (s.pin = s.pin === k ? -1 : k);
        }
    }
    const i = cellAt(x, y), pc = s.pieces[s.pi];
    if (i < 0 || pc === undefined) return;
    if (!canPlace(s.K, s.Hh, i, pc)) return void ev(s, 'nope', ccx(i), ccy(i), s.K[i] === HOUSE ? '꽃게 집이에요!' : s.K[i] === DUG ? '벌써 팠어요' : s.K[i] === ROCK ? '바위는 못 파요' : '여긴 안 돼요', '#ffd6cc');
    const stack = s.K[i] === WALL, weed = s.K[i] === WEED;
    put(s, i, pc);
    s.place[i] = s.t;
    if (pc === PW) s.peak[i] = Math.max(s.peak[i], s.Hh[i]);
    s.lastPlace = s.t;
    s.pi++;
    s.taps++;
    ev(s, pc === PD ? 'dig' : 'place', ccx(i), ccy(i), stack ? '더 높게!' : weed && pc === PD ? '해초 쏙!' : pc === PD ? '푹푹!' : PIECE_NAME[pc], pc === PD ? '#bfe9ff' : '#ffe9b8', i);
    if (stack) see(s, 'stack', '모래벽 위에 또 쌓으면 +2 높아져요');
    if (s.pi >= s.pieces.length) s.auto = AUTO;
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
/** 잘하는 봇이 내다보는 값: 이 판을 끝까지 돌려 본 점수(실패면 음수) + 집 둘레에 차오른 물(같은 점수끼리 가르는 길잡이) */
function judge(s: PoolState, B0: Board, leftover: number) {
  const B: Board = { K: B0.K.slice(), Hh: B0.Hh.slice(), sea: B0.sea };
  const st = { bag: [0, 0, 0, 0], goal: s.goal, octoAny: s.octoAny, octoGot: false, regTotal: s.regTotal };
  let press = 0, fail = false, lived = 0, loot = 0;
  const near = NEAR.get(s)!;
  for (let k = 0; k < s.waves.length; k++, lived++) {
    const w = s.waves[k];
    if (k > 0 && w.rise) tideUp(B);
    const f = flood(B.K, B.Hh, w, B.sea);
    for (let i = 0; i < N; i++) if (near[i]) press += f.lvl[i] + f.hit[i] * 2;
    const L = land(B.K, f, w, B.sea);
    L.forEach((x, j) => {
      if (x.at < 0) return;
      const kk = w.cargo[j].k;
      st.bag[kk]++;
      loot += LOOT_PTS[kk];
      if (kk === OCTO) st.octoGot = true;
    });
    if (settle(B, f).wetH.length) {
      fail = true;
      break;
    }
  }
  const pts = fail ? -400 + lived * 40 + loot : 20 + starsOf(st) * 10 + loot + leftover * 3;
  return { pts, press };
}
const NEAR = new WeakMap<object, Uint8Array>();
function nearMask(s: PoolState) {
  const m = new Uint8Array(N);
  for (const h of s.houses) for (let i = 0; i < N; i++) if (Math.abs(rowOf(i) - rowOf(h.cell)) <= 1 && Math.abs(colOf(i) - colOf(h.cell)) <= 1) m[i] = 1;
  NEAR.set(s, m);
}

/** 앞으로 놓을 조각을 차례로: 지금 조각(+다음 조각까지 두 수 앞)을 판 끝까지 돌려 보고 가장 좋은 자리. 몇 개까지 놓을지도 점수로 고른다 */
function plan(s: PoolState): number[] {
  nearMask(s);
  const B = boardOf(s), seq: number[] = [];
  const total = s.pieces.length;
  let bestPts = judge(s, B, total - s.pi).pts, bestLen = 0;
  const val = (j: { pts: number; press: number }) => j.pts * 50 - j.press;
  for (let k = s.pi; k < total; k++) {
    const pc = s.pieces[k], nx = s.pieces[k + 1], left = total - k - 1;
    const cands: { i: number; v: number }[] = [];
    for (let i = s.sea * COLS; i < N; i++) {
      if (!canPlace(B.K, B.Hh, i, pc)) continue;
      const K2 = B.K.slice(), H2 = B.Hh.slice();
      put({ K: K2, Hh: H2 }, i, pc);
      cands.push({ i, v: val(judge(s, { ...B, K: K2, Hh: H2 }, left)) });
    }
    if (!cands.length) break;
    cands.sort((a, b) => b.v - a.v);
    let pick = cands[0];
    if (nx !== undefined) {
      let bv = -Infinity;
      for (const c of cands.slice(0, 6)) {
        const K2 = B.K.slice(), H2 = B.Hh.slice();
        put({ K: K2, Hh: H2 }, c.i, pc);
        let b2 = c.v;
        for (let i = s.sea * COLS; i < N; i++) {
          if (!canPlace(K2, H2, i, nx)) continue;
          const K3 = K2.slice(), H3 = H2.slice();
          put({ K: K3, Hh: H3 }, i, nx);
          b2 = Math.max(b2, val(judge(s, { ...B, K: K3, Hh: H3 }, left - 1)));
        }
        if (b2 > bv) (bv = b2), (pick = c);
      }
    }
    put(B, pick.i, pc);
    seq.push(pick.i);
    const pts = judge(s, B, left).pts;
    if (pts > bestPts) (bestPts = pts), (bestLen = seq.length);
  }
  // 아무리 놓아도 젖으면 있는 조각은 다 놓는다 (조금이라도 오래 버티게)
  return bestPts < 0 ? seq : seq.slice(0, bestLen);
}

const brain = new WeakMap<object, { key: string; base: number; seq: number[] }>();
const NO: Input = { tap: false, dir: 0, pointer: null };
const tapCell = (i: number): Input => ({ tap: false, dir: 0, pointer: { x: ccx(i), y: ccy(i) / A } });
const tapBtn: Input = { tap: false, dir: 0, pointer: { x: BTN.x + BTN.w / 2, y: (BTN.y + BTN.h / 2) / A } };

/** 봇: 판을 끝까지 돌려 보며 자리를 고른다 — 어디를 파고 어디를 막을지, 언제 멈출지(남긴 조각도 점수) */
export const crabpoolsSmart: Bot<PoolState> = {
  name: '갯벌 박사',
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
/** 봇: 아무 데나, 아무 때나 톡 (대개 갯벌 위, 가끔 화면 아무 데나 — ▶를 일찍 누르기도) */
export const crabpoolsRandom: Bot<PoolState> = {
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
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
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
/** 꽃게 (앞에서 본 모습). claws: 0 내림 ~ 1 번쩍 */
function drawCrab(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, t: number, mood: Mood, claws: number, opt: { scarf?: boolean; hat?: boolean; look?: number; tilt?: number; col?: string; run?: boolean } = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(opt.tilt ?? 0);
  const col = opt.col ?? '#ff6b45';
  ctx.fillStyle = 'rgba(60,30,10,.25)';
  ctx.beginPath();
  ctx.ellipse(0, z * 0.05, z * 1.25, z * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  // 다리 셋씩 (사각사각, 뛰면 빨리)
  ctx.strokeStyle = mix(col, '#7a1f0c', 0.35);
  ctx.lineWidth = Math.max(1.2, z * 0.16);
  ctx.lineCap = 'round';
  for (const sd of [-1, 1])
    for (let k = 0; k < 3; k++) {
      const sw = Math.sin(t * (opt.run ? 1.4 : 0.35) + k * 1.7 + sd) * z * (opt.run ? 0.25 : 0.12);
      ctx.beginPath();
      ctx.moveTo(sd * z * (0.55 + k * 0.12), -z * 0.35 + k * z * 0.1);
      ctx.lineTo(sd * z * (1.05 + k * 0.08), -z * 0.42 + k * z * 0.12 + sw);
      ctx.lineTo(sd * z * (1.2 + k * 0.1), z * 0.02 + sw * 0.5);
      ctx.stroke();
    }
  // 집게 팔
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
    ctx.fillStyle = 'rgba(255,240,220,.35)';
    ctx.beginPath();
    ctx.ellipse(-sd * z * 0.1, -z * 0.3, z * 0.1, z * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = mix(col, '#5a1206', 0.5);
    ctx.lineWidth = Math.max(1, z * 0.09);
    ctx.beginPath();
    ctx.moveTo(0, -z * 0.18);
    ctx.lineTo(sd * z * 0.18 * open, -z * 0.62);
    ctx.stroke();
    ctx.restore();
  }
  // 몸통
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
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(sd * z * 0.55, -z * 0.38, z * 0.16, z * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // 앞치마 (엄마)
  if (opt.scarf) {
    ctx.fillStyle = '#fff4e0';
    ctx.beginPath();
    ctx.moveTo(-z * 0.45, -z * 0.42);
    ctx.lineTo(z * 0.45, -z * 0.42);
    ctx.lineTo(z * 0.35, -z * 0.02);
    ctx.lineTo(-z * 0.35, -z * 0.02);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ff8fab';
    for (let q = 0; q < 3; q++) (ctx.beginPath(), ctx.arc(-z * 0.2 + q * z * 0.2, -z * 0.22, z * 0.05, 0, Math.PI * 2), ctx.fill());
  }
  // 눈자루 + 눈
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
    if (mood === 'proud' || mood === 'happy') {
      ctx.beginPath();
      ctx.arc(ex, ey + er * 0.25, er * 0.55, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else if (mood === 'strain') {
      ctx.beginPath();
      ctx.moveTo(ex - sd * er * 0.5, ey - er * 0.45);
      ctx.lineTo(ex + sd * er * 0.35, ey);
      ctx.lineTo(ex - sd * er * 0.5, ey + er * 0.45);
      ctx.stroke();
    } else if (mood === 'dizzy') {
      ctx.beginPath();
      for (let a = 0; a < 12; a++) {
        const an = a * 0.9 + t * 0.3 * sd, rr = er * 0.08 * a;
        ctx.lineTo(ex + Math.cos(an) * rr, ey + Math.sin(an) * rr);
      }
      ctx.stroke();
    } else if (mood === 'sleep') {
      ctx.beginPath();
      ctx.moveTo(ex - er * 0.55, ey);
      ctx.lineTo(ex + er * 0.55, ey);
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
  // 입
  ctx.strokeStyle = '#4a1206';
  ctx.fillStyle = '#4a1206';
  ctx.lineWidth = Math.max(1, z * 0.1);
  ctx.beginPath();
  if (mood === 'wow') (ctx.ellipse(0, -z * 0.38, z * 0.13, z * 0.17, 0, 0, Math.PI * 2), ctx.fill());
  else if (mood === 'strain' || mood === 'dizzy') {
    ctx.moveTo(-z * 0.22, -z * 0.36);
    for (let k = 1; k <= 4; k++) ctx.lineTo(-z * 0.22 + k * z * 0.11, -z * 0.36 + (k % 2 ? -1 : 1) * z * 0.05);
    ctx.stroke();
  } else (ctx.arc(0, -z * 0.45, z * (mood === 'proud' || mood === 'happy' ? 0.24 : 0.16), 0.15 * Math.PI, 0.85 * Math.PI), ctx.stroke());
  // 머릿수건 (엄마) · 밀짚모자 (이웃 할아버지)
  if (opt.scarf) {
    ctx.fillStyle = '#ff6b8a';
    ctx.beginPath();
    ctx.ellipse(0, -z * 1.0, z * 0.62, z * 0.22, 0, Math.PI, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(z * 0.5, -z * 1.0);
    ctx.lineTo(z * 0.95, -z * 1.18 + Math.sin(t * 0.3) * z * 0.08);
    ctx.lineTo(z * 0.85, -z * 0.92);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    for (let q = 0; q < 3; q++) (ctx.beginPath(), ctx.arc(-z * 0.3 + q * z * 0.3, -z * 1.08, z * 0.05, 0, Math.PI * 2), ctx.fill());
  }
  if (opt.hat) {
    ctx.fillStyle = '#e9c46a';
    ctx.beginPath();
    ctx.ellipse(0, -z * 1.02, z * 0.85, z * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d4a84a';
    ctx.beginPath();
    ctx.ellipse(0, -z * 1.1, z * 0.45, z * 0.28, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#e76f51';
    ctx.fillRect(-z * 0.45, -z * 1.14, z * 0.9, z * 0.08);
  }
  ctx.restore();
}

/** 가리비 조개 */
function drawShell(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, t: number, col = '#ffb3c7') {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(80,40,10,.22)';
  ctx.beginPath();
  ctx.ellipse(0, z * 0.15, z * 1.05, z * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
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
  const tw = 0.5 + 0.5 * Math.sin(t * 0.12 + x);
  ctx.fillStyle = `rgba(255,255,255,${0.5 + 0.5 * tw})`;
  ctx.beginPath();
  const sx = z * 0.45, sy = -z * 0.75, sr = z * (0.18 + 0.15 * tw);
  ctx.moveTo(sx, sy - sr);
  ctx.lineTo(sx + sr * 0.3, sy);
  ctx.lineTo(sx, sy + sr);
  ctx.lineTo(sx - sr * 0.3, sy);
  ctx.fill();
  ctx.restore();
}

/** 물고기 (옆모습). rot: 파닥 기울기 */
function drawFish(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, t: number, rot = 0, col = '#ff9f43') {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const g = ctx.createLinearGradient(0, -z * 0.6, 0, z * 0.6);
  g.addColorStop(0, mix(col, '#ffffff', 0.3));
  g.addColorStop(1, mix(col, '#7a3200', 0.3));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, z, z * 0.58, 0, 0, Math.PI * 2);
  ctx.fill();
  const wag = Math.sin(t * 0.6) * z * 0.15;
  ctx.beginPath();
  ctx.moveTo(-z * 0.8, 0);
  ctx.lineTo(-z * 1.5, -z * 0.6 + wag);
  ctx.lineTo(-z * 1.35, wag * 0.3);
  ctx.lineTo(-z * 1.5, z * 0.6 + wag);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.beginPath();
  ctx.ellipse(z * 0.05, -z * 0.25, z * 0.45, z * 0.12, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = mix(col, '#7a3200', 0.45);
  ctx.lineWidth = Math.max(0.8, z * 0.1);
  ctx.beginPath();
  ctx.arc(-z * 0.2, 0, z * 0.45, -0.9, 0.9);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(z * 0.52, -z * 0.12, z * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1b1b1b';
  ctx.beginPath();
  ctx.arc(z * 0.56, -z * 0.12, z * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** 불가사리 */
function drawStarfish(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, t: number, rot = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot + Math.sin(t * 0.05) * 0.1);
  ctx.fillStyle = '#ff7f50';
  ctx.beginPath();
  for (let q = 0; q < 10; q++) {
    const an = (q / 10) * Math.PI * 2 - Math.PI / 2, rr = q % 2 ? z * 0.45 : z * 1.1;
    ctx.lineTo(Math.cos(an) * rr, Math.sin(an) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,230,190,.85)';
  for (let q = 0; q < 5; q++) {
    const an = (q / 5) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.arc(Math.cos(an) * z * 0.55, Math.sin(an) * z * 0.55, z * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#5a1e06';
  for (const sd of [-1, 1]) (ctx.beginPath(), ctx.arc(sd * z * 0.16, -z * 0.08, z * 0.08, 0, Math.PI * 2), ctx.fill());
  ctx.restore();
}

/** 문어 (큰 파도에만) */
function drawOcto(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, t: number, rot = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.strokeStyle = '#d6559a';
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1.5, z * 0.28);
  for (let q = 0; q < 5; q++) {
    const bx = -z * 0.6 + q * z * 0.3, wv = Math.sin(t * 0.25 + q * 1.3) * z * 0.25;
    ctx.beginPath();
    ctx.moveTo(bx, z * 0.1);
    ctx.quadraticCurveTo(bx + wv, z * 0.55, bx + (q - 2) * z * 0.22 - wv, z * 0.85);
    ctx.stroke();
  }
  const g = ctx.createRadialGradient(-z * 0.25, -z * 0.55, z * 0.1, 0, -z * 0.3, z * 1.0);
  g.addColorStop(0, '#ffc2e2');
  g.addColorStop(1, '#e0609f');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, -z * 0.35, z * 0.78, z * 0.72, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  for (const sd of [-1, 1]) (ctx.beginPath(), ctx.arc(sd * z * 0.28, -z * 0.3, z * 0.2, 0, Math.PI * 2), ctx.fill());
  ctx.fillStyle = '#2a0e1e';
  for (const sd of [-1, 1]) (ctx.beginPath(), ctx.arc(sd * z * 0.28, -z * 0.27, z * 0.1, 0, Math.PI * 2), ctx.fill());
  ctx.fillStyle = 'rgba(255,140,170,.8)';
  for (const sd of [-1, 1]) (ctx.beginPath(), ctx.ellipse(sd * z * 0.5, -z * 0.08, z * 0.12, z * 0.07, 0, 0, Math.PI * 2), ctx.fill());
  ctx.strokeStyle = '#7a1e4a';
  ctx.lineWidth = Math.max(0.8, z * 0.08);
  ctx.beginPath();
  ctx.arc(0, -z * 0.08, z * 0.12, 0.1 * Math.PI, 0.9 * Math.PI);
  ctx.stroke();
  ctx.restore();
}

function drawLoot(ctx: CanvasRenderingContext2D, k: number, x: number, y: number, z: number, t: number, rot = 0) {
  if (k === FISH) drawFish(ctx, x, y, z, t, rot);
  else if (k === SHELL) drawShell(ctx, x, y + z * 0.4, z * 0.95, t);
  else if (k === STAR) drawStarfish(ctx, x, y, z * 0.95, t, rot);
  else drawOcto(ctx, x, y + z * 0.2, z * 1.05, t, rot * 0.3);
}

/** 갈매기 (옆모습). fly: 날갯짓, nose: 집게에 물린 빨간 코 */
function drawGull(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, t: number, fly: boolean, dir: number, open = false, nose = false) {
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
  ctx.fillStyle = '#1b1b1b';
  if (nose) {
    ctx.strokeStyle = '#1b1b1b';
    ctx.lineWidth = Math.max(1, z * 0.07);
    ctx.beginPath();
    ctx.moveTo(z * 0.72, -z * 0.5);
    ctx.lineTo(z * 0.88, -z * 0.36);
    ctx.moveTo(z * 0.88, -z * 0.5);
    ctx.lineTo(z * 0.72, -z * 0.36);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(z * 0.8, -z * 0.42, z * 0.07, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = nose ? '#ff3b3b' : '#f4a340';
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
  if (nose) {
    ctx.fillStyle = 'rgba(255,90,90,.6)';
    ctx.beginPath();
    ctx.arc(z * 1.25, -z * 0.32, z * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** 미리 보기: k번째 파도 전까지의 깎임·밀물을 그대로 돌린 판에서 k번째 파도 (버티기에서 실제로 일어나는 일과 똑같다) */
function previewOf(s: PoolState, k: number) {
  const B = boardOf(s);
  for (let j = 0; j < k; j++) {
    if (j > 0 && s.waves[j].rise) tideUp(B);
    settle(B, flood(B.K, B.Hh, s.waves[j], B.sea));
  }
  if (k > 0 && s.waves[k].rise) tideUp(B);
  const f = flood(B.K, B.Hh, s.waves[k], B.sea);
  return { B, f, L: land(B.K, f, s.waves[k], B.sea) };
}
const PRE = new WeakMap<object, { key: string; v: ReturnType<typeof previewOf> }>();
function previewCached(s: PoolState, k: number) {
  const key = `${s.stage}:${s.hearts}:${s.pi}:${k}`;
  const c = PRE.get(s);
  if (c && c.key === key) return c.v;
  const v = previewOf(s, k);
  PRE.set(s, { key, v });
  return v;
}

function drawAll(ctx: CanvasRenderingContext2D, s: PoolState, w: number, h: number, th: Theme) {
  const fx = juice(s), X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w, t = s.t;
  const pal = SKY[Math.min(SKY.length - 1, s.stage)], dusk = Math.max(0, (s.stage - 4) / 3);
  const wave = s.phase === 'wave' ? s.waves[s.wi] : null, wt = s.wt, fl = s.fl;
  const pv = s.phase === 'build' && s.waves.length ? (s.pin >= 0 ? s.pin : Math.floor(s.pt / PREVIEW) % s.waves.length) : -1;
  const pre = pv >= 0 ? previewCached(s, pv) : null;
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
    y = Math.max(y, Y(FP.y + FP.h + 0.07));
    rec.push({ x, y, t: s.t });
    if (rec.length > 12) rec.shift();
    fx.pop(Math.max(w * 0.14, Math.min(w * 0.86, x)), y, text, col, size);
  };
  const label = (text: string, x: number, y: number, size: number, col = '#ffffff', stroke = 'rgba(20,60,80,.65)') => {
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
    for (const [dx, dy, rr] of [[0, 0, 0.04], [0.04, 0.008, 0.03], [-0.04, 0.01, 0.028], [0.015, -0.015, 0.03]])
      (ctx.beginPath(), ctx.arc(X(cx0 + dx), Y(cy0 + dy), R(rr), 0, Math.PI * 2), ctx.fill());
  }
  // ── 뒤쪽 모래언덕 · 야자수 · 어촌 오두막 ──
  {
    const dg = ctx.createLinearGradient(0, Y(0.25), 0, Y(Y0 + 0.02));
    dg.addColorStop(0, mix('#e8cf98', '#8a6a6a', dusk * 0.8));
    dg.addColorStop(1, mix('#f3dca8', '#a07f70', dusk * 0.6));
    ctx.fillStyle = mix('#a9c98a', '#4c5a5a', dusk);
    ctx.beginPath();
    ctx.moveTo(-10, Y(0.31));
    for (let x = -0.02; x <= 1.03; x += 0.04) ctx.lineTo(X(x), Y(0.272 - 0.022 * Math.sin(x * 5 + 1) - 0.01 * Math.sin(x * 13)));
    ctx.lineTo(w + 10, Y(0.31));
    ctx.fill();
    ctx.fillStyle = dg;
    ctx.beginPath();
    ctx.moveTo(-10, Y(Y0 + 0.03));
    for (let x = -0.02; x <= 1.03; x += 0.04) ctx.lineTo(X(x), Y(0.3 - 0.018 * Math.sin(x * 4 + 2.2) - 0.008 * Math.sin(x * 11)));
    ctx.lineTo(w + 10, Y(Y0 + 0.03));
    ctx.fill();
    ctx.strokeStyle = mix('#6f9a4a', '#3e4a40', dusk);
    ctx.lineWidth = 1.3;
    for (let k = 0; k < 40; k++) {
      const gx = X(hsh(k * 5) * 1.0), gy = Y(0.31 + hsh(k * 5 + 1) * 0.03);
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.quadraticCurveTo(gx + R(0.004), gy - R(0.012), gx + R(0.006) + Math.sin(t * 0.03 + k) * R(0.003), gy - R(0.02 + hsh(k) * 0.01));
      ctx.stroke();
    }
    for (const [px0, sz, lean] of [[0.07, 1, 0.25], [0.93, 0.85, -0.3]] as [number, number, number][]) {
      const bx = X(px0), by = Y(0.345), th2 = R(0.13 * sz);
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
    }
    // 어촌 오두막 (저녁엔 등불) + 말리는 그물
    {
      const hx = X(0.8), hy = Y(0.32);
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
      const nx = X(0.2), ny = Y(0.31);
      ctx.strokeStyle = mix('#7a5230', '#3e3030', dusk);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(nx - R(0.05), ny);
      ctx.lineTo(nx - R(0.05), ny - R(0.04));
      ctx.moveTo(nx + R(0.05), ny);
      ctx.lineTo(nx + R(0.05), ny - R(0.04));
      ctx.stroke();
      ctx.strokeStyle = mix('#5d8aa8', '#3a4a5a', dusk);
      ctx.lineWidth = 0.8;
      for (let q = 0; q < 6; q++) {
        ctx.beginPath();
        ctx.moveTo(nx - R(0.05) + q * R(0.02), ny - R(0.04));
        ctx.quadraticCurveTo(nx - R(0.04) + q * R(0.02), ny - R(0.02), nx - R(0.05) + q * R(0.02), ny - R(0.005));
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(nx - R(0.05), ny - R(0.04));
      ctx.quadraticCurveTo(nx, ny - R(0.03), nx + R(0.05), ny - R(0.04));
      ctx.stroke();
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
    const jt = t % 260;
    if (jt < 40) {
      const fx1 = X(0.15 + 0.7 * hsh(Math.floor(t / 260))), fy1 = Y(Y1 + 0.08) - Math.sin((jt / 40) * Math.PI) * R(0.05);
      drawFish(ctx, fx1 + (jt - 20) * R(0.001), fy1, R(0.011), t, (jt - 20) * 0.05, '#ffb347');
    }
  }
  // ── 디오라마 앞 단면: 바닷물 · 갯벌 바닥 · 물고기, 나무 받침 ──
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
    ctx.fillStyle = '#b79a6c';
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
    for (let k = 0; k < 3; k++) {
      const fx2 = X(((t * 0.0012 * (k % 2 ? 1 : -1) + hsh(k * 7)) % 1 + 1) % 1), fy2 = Y(SF + 0.012 + k * 0.009);
      ctx.save();
      ctx.translate(fx2, fy2);
      ctx.scale(k % 2 ? -1 : 1, 1);
      drawFish(ctx, 0, 0, R(0.008), t + k * 10, 0, ['#ffd43b', '#ff8fab', '#74c0fc'][k]);
      ctx.restore();
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
  // ── 갯벌 판 (뒤 = 언덕 쪽 마른 모래, 앞 = 바다 쪽 젖은 갯벌). 앞 가장자리는 물에 잠겨 비스듬하다 ──
  {
    ctx.fillStyle = '#a88b5e';
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
      const mud = clamp01(1 - (rowOf(i) - s.sea) / 4), wv = Math.max(s.wet[i] * 0.8, mud * 0.55);
      const base = mix('#f8e4b6', '#f0d8a4', hsh(i * 7 + s.stage) * 0.5 + (vr / ROWS) * 0.3);
      ctx.fillStyle = mix(base, '#c6a676', wv);
      quad(c - 0.01, vr - 0.01, c + 1.01, vr + 1.01);
      ctx.fill();
      // 젖은 갯벌엔 하늘이 비친다
      if (wv > 0.25) {
        ctx.fillStyle = `rgba(225,248,255,${(wv - 0.25) * 0.5})`;
        quad(c + 0.12 + hsh(i) * 0.2, vr + 0.2, c + 0.55 + hsh(i) * 0.2, vr + 0.42);
        ctx.fill();
      }
    }
  // 바람·물결 무늬
  ctx.strokeStyle = 'rgba(140,100,50,.16)';
  ctx.lineWidth = 1.2;
  for (let vr = 0; vr < vSea; vr++)
    for (const f of [0.3, 0.72]) {
      ctx.beginPath();
      for (let c = 0; c <= COLS; c += 0.2) ctx.lineTo(X(PX(c, vr + f)), Y(PY(vr + f) + 0.006 * Math.sin(c * 2.3 + vr * 1.7 + f * 9)));
      ctx.stroke();
    }
  // 모래알 · 갯벌 게 구멍
  for (let k = 0; k < 90; k++) {
    const c = hsh(k * 3 + 1) * COLS, vr = hsh(k * 3 + 2) * vSea;
    ctx.fillStyle = k % 4 ? 'rgba(255,255,255,.4)' : 'rgba(150,100,50,.3)';
    ctx.fillRect(X(PX(c, vr)), Y(PY(vr)), 1.5, 1.5);
  }
  for (let k = 0; k < 14; k++) {
    const i = Math.floor(hsh(k * 13 + s.stage * 7) * N);
    if (s.K[i] !== SAND) continue;
    const vr = vrowOf(i), x = X(PX(colOf(i) + 0.2 + hsh(k) * 0.6, vr + 0.5)), y = Y(PY(vr + 0.25 + hsh(k + 1) * 0.55));
    ctx.fillStyle = 'rgba(90,60,30,.55)';
    ctx.beginPath();
    ctx.ellipse(x, y, R(0.006), R(0.0035), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(180,140,90,.5)';
    ctx.beginPath();
    ctx.ellipse(x + R(0.004), y + R(0.003), R(0.004), R(0.002), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // 꽃게 발자국 (집에서 바다 쪽으로 사각사각)
  {
    const h0 = s.houses[0].cell;
    ctx.fillStyle = 'rgba(120,85,45,.28)';
    for (let k = 0; k < 10; k++) {
      const vr = vrowOf(h0) + 0.9 + k * 0.32, c = colOf(h0) + 0.5 + Math.sin(k * 0.9 + s.stage) * 0.6;
      if (vr >= vSea) break;
      for (const sd of [-1, 1]) (ctx.beginPath(), ctx.ellipse(X(PX(c + sd * 0.12, vr)), Y(PY(vr)), R(0.0032), R(0.002), sd * 0.6, 0, Math.PI * 2), ctx.fill());
    }
  }
  // 칸 줄 (톡 칠 자리가 보이게)
  ctx.strokeStyle = 'rgba(120,85,40,.17)';
  ctx.lineWidth = 1;
  for (let c = 0; c <= COLS; c++) (ctx.beginPath(), ctx.moveTo(X(PX(c, 0)), Y(PY(0))), ctx.lineTo(X(PX(c, vSea)), Y(PY(vSea))), ctx.stroke());
  for (let vr = 0; vr <= vSea; vr++) (ctx.beginPath(), ctx.moveTo(X(PX(0, vr)), Y(PY(vr))), ctx.lineTo(X(PX(COLS, vr)), Y(PY(vr))), ctx.stroke());
  ctx.strokeStyle = 'rgba(255,255,255,.9)';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  for (let c = -0.1; c <= COLS + 0.1; c += 0.25) ctx.lineTo(X(PX(c, vSea)), Y(PY(vSea) + 0.006 + 0.004 * Math.sin(c * 5 + t * 0.06)));
  ctx.stroke();
  // ── 판 칸 (웅덩이·수로): 안쪽 벽이 보이는 구덩이, 물이 고이면 반짝 ──
  for (let i = 0; i < N; i++) {
    if (s.K[i] !== DUG) continue;
    const c = colOf(i), vr = vrowOf(i), age = t - s.place[i], pop = age < 12 ? 1 - age / 12 : 0;
    // 파낸 모래 더미 (뒤·옆 가장자리)
    for (let q = 0; q < 9; q++) {
      const side = q < 5, u = side ? 0.1 + q * 0.2 : 0.25 + ((q - 5) % 2) * 0.4, cc = side ? c + u : q < 7 ? c + 0.03 : c + 0.97, vv = side ? vr + 0.06 : vr + u;
      if (!side && NB[i].some((n) => s.K[n] === DUG && colOf(n) === (q < 7 ? c - 1 : c + 1))) continue;
      if (side && NB[i].some((n) => s.K[n] === DUG && vrowOf(n) === vr - 1)) continue;
      const bx = X(PX(cc, vv)), by = Y(PY(vv)), rr = R(0.011 + 0.004 * hsh(i * 9 + q));
      ctx.fillStyle = '#d9b77f';
      ctx.beginPath();
      ctx.ellipse(bx, by, rr * 1.3, rr * 0.8, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,245,215,.55)';
      ctx.beginPath();
      ctx.ellipse(bx - rr * 0.3, by - rr * 0.4, rr * 0.5, rr * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#8c6c42';
    quad(c + 0.05, vr + 0.07, c + 0.95, vr + 0.93);
    ctx.fill();
    ctx.fillStyle = '#6b5032';
    quad(c + 0.1, vr + 0.3, c + 0.9, vr + 0.88);
    ctx.fill();
    ctx.fillStyle = '#a9875a';
    quad(c + 0.1, vr + 0.12, c + 0.9, vr + 0.3);
    ctx.fill();
    // 수로: 이웃한 판 칸과 이어진 물길
    for (const n of NB[i]) {
      if (s.K[n] !== DUG) continue;
      const dc = colOf(n) - c, dv = vrowOf(n) - vr;
      ctx.fillStyle = '#6b5032';
      if (dc) quad(c + (dc > 0 ? 0.88 : -0.02), vr + 0.32, c + (dc > 0 ? 1.02 : 0.12), vr + 0.86);
      else quad(c + 0.12, vr + (dv > 0 ? 0.86 : -0.02), c + 0.88, vr + (dv > 0 ? 1.02 : 0.32));
      ctx.fill();
    }
    const wl = Math.max(s.puddle[i], wetNow(i) ? fade : 0);
    if (wl > 0.02) {
      ctx.fillStyle = `rgba(70,175,225,${0.35 + 0.55 * wl})`;
      quad(c + 0.12, vr + 0.32, c + 0.88, vr + 0.86);
      ctx.fill();
      for (const n of NB[i]) {
        if (s.K[n] !== DUG) continue;
        const dc = colOf(n) - c, dv = vrowOf(n) - vr;
        if (dc) quad(c + (dc > 0 ? 0.86 : -0.02), vr + 0.34, c + (dc > 0 ? 1.02 : 0.14), vr + 0.84);
        else quad(c + 0.14, vr + (dv > 0 ? 0.84 : -0.02), c + 0.86, vr + (dv > 0 ? 1.02 : 0.34));
        ctx.fill();
      }
      ctx.strokeStyle = `rgba(255,255,255,${0.5 * wl})`;
      ctx.lineWidth = 1.2;
      const rp = ((t * 0.02 + hsh(i)) % 1);
      ctx.beginPath();
      ctx.ellipse(X(ccx(i)), Y(PY(vr + 0.6)), R(CW * 0.3 * rp), R(CW * 0.1 * rp), 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = `rgba(230,250,255,${0.45 * wl})`;
      quad(c + 0.2, vr + 0.38, c + 0.5, vr + 0.46);
      ctx.fill();
    }
    if (pop > 0) {
      ctx.fillStyle = `rgba(255,255,255,${pop * 0.6})`;
      quad(c + 0.05, vr + 0.07, c + 0.95, vr + 0.93);
      ctx.fill();
    }
  }
  // ── 해초 (물이 느려지는 칸) ──
  for (let i = 0; i < N; i++) {
    if (s.K[i] !== WEED) continue;
    const c = colOf(i), vr = vrowOf(i);
    ctx.fillStyle = 'rgba(60,110,60,.28)';
    quad(c + 0.08, vr + 0.15, c + 0.92, vr + 0.9);
    ctx.fill();
    ctx.lineCap = 'round';
    for (let q = 0; q < 7; q++) {
      const bx = X(PX(c + 0.15 + q * 0.12, vr + 0.5)), by = Y(PY(vr + 0.55 + (q % 3) * 0.12)), sw = Math.sin(t * 0.05 + q + i) * R(0.006);
      ctx.strokeStyle = q % 2 ? '#3f8f4f' : '#5fae5a';
      ctx.lineWidth = R(0.007);
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.bezierCurveTo(bx + sw, by - R(0.012), bx - sw, by - R(0.022), bx + sw * 1.5, by - R(0.032));
      ctx.stroke();
    }
  }
  // ── 물: 짓는 동안은 예보한 파도를 하나씩 미리 보기, 파도 때는 진짜 물 ──
  if (pre) {
    const on = (i: number) => pre.f.lvl[i] > 0;
    if (pre.B.sea > s.sea) {
      ctx.fillStyle = `rgba(40,150,215,${0.5 + 0.08 * Math.sin(t * 0.1)})`;
      quad(0, ROWS - pre.B.sea, COLS, vSea);
      ctx.fill();
      label('🌙 밀물: 여기까지 바다', X(0.5), Y(PY(ROWS - (s.sea + pre.B.sea) / 2)), 0.036);
    }
    ctx.fillStyle = `rgba(70,175,245,${0.24 + 0.06 * Math.sin(t * 0.08)})`;
    for (let i = 0; i < N; i++) if (on(i)) (quad(colOf(i), vrowOf(i), colOf(i) + 1, vrowOf(i) + 1), ctx.fill());
    ctx.strokeStyle = 'rgba(255,255,255,.95)';
    ctx.lineWidth = 2;
    ctx.setLineDash([R(0.012), R(0.01)]);
    ctx.lineDashOffset = -t * 0.3;
    for (let i = 0; i < N; i++) {
      if (!on(i)) continue;
      const c = colOf(i), vr = vrowOf(i), r = rowOf(i);
      const edge = (x0: number, y0: number, x1: number, y1: number) => (ctx.beginPath(), ctx.moveTo(X(PX(x0, y0)), Y(PY(y0))), ctx.lineTo(X(PX(x1, y1)), Y(PY(y1))), ctx.stroke());
      if (r === ROWS - 1 || !on(i + COLS)) edge(c, vr, c + 1, vr);
      if (r > pre.B.sea && !on(i - COLS)) edge(c, vr + 1, c + 1, vr + 1);
      if (c > 0 && !on(i - 1)) edge(c, vr, c, vr + 1);
      if (c < COLS - 1 && !on(i + 1)) edge(c + 1, vr, c + 1, vr + 1);
    }
    ctx.setLineDash([]);
    // 칸마다 물 높이 (한 칸에 1씩 낮아지는 게 보이게). 웅덩이는 파란 동그라미 = 깊이
    for (let i = 0; i < N; i++) {
      if (!on(i) || (pre.B.K[i] !== SAND && pre.B.K[i] !== WEED && pre.B.K[i] !== DUG)) continue;
      const v = String(pre.f.lvl[i]);
      if (pre.B.K[i] === DUG) {
        const bx = X(ccx(i)), by = Y(ccy(i)) + R(0.008);
        ctx.fillStyle = pre.f.lvl[i] >= DEEP ? '#1c6fd1' : '#3a9be0';
        ctx.beginPath();
        ctx.arc(bx, by, R(0.022), 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        label(v, bx, by + 0.5, 0.036, '#ffffff', 'rgba(0,0,0,0)');
      } else label(v, X(ccx(i)), Y(ccy(i)), 0.036, 'rgba(255,255,255,.95)', 'rgba(20,90,140,.55)');
    }
  }
  if (wave && fl) {
    for (let i = 0; i < N; i++) {
      if (!wetNow(i)) continue;
      const c = colOf(i), vr = vrowOf(i), age = wt - s.arrive[i], a = Math.min(1, age / 7) * fade;
      const dl = Math.min(1, (fl.lvl[i] - 1) / 5);
      ctx.globalAlpha = a * (s.K[i] === DUG ? 0.55 : 0.85);
      ctx.fillStyle = mix('#8ef0f5', '#1f8fd0', dl);
      quad(c - 0.02, vr - 0.02, c + 1.02, vr + 1.02);
      ctx.fill();
      ctx.globalAlpha = a * 0.5;
      ctx.fillStyle = '#ffffff';
      const sp = (t * 0.7 + i * 37) % 60;
      if (sp < 8) (ctx.beginPath(), ctx.arc(X(PX(c + 0.3 + hsh(i) * 0.4, vr + 0.5)), Y(PY(vr + 0.25 + hsh(i + 1) * 0.5)), R(0.004) * (1 - Math.abs(sp - 4) / 4) + 0.5, 0, Math.PI * 2), ctx.fill());
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
  // ── 보물이 어디 있나 (파도 때): 물을 타고 제 줄을 따라 오다 → 웅덩이에 퐁당(파닥파닥) / 바다로 쓸려 감 ──
  const CS = s.impact + HOLD * 0.6, span = Math.max(30, s.end - CS - 24);
  /** 꽃게 아이 k가 보물을 나르는 진행 (0 집 → 0.45 웅덩이 → 1 집) */
  const carryQ = (k: number) => clamp01((wt - CS - k * 10) / span);
  const kidPos = (k: number) => {
    const cb = s.kids[k];
    let i = cb.home;
    if (s.K[i] !== SAND && s.K[i] !== WEED) {
      let bd = 99;
      for (let j = 0; j < N; j++) {
        const d = Math.abs(rowOf(j) - rowOf(cb.home)) + Math.abs(colOf(j) - colOf(cb.home));
        if ((s.K[j] === SAND || s.K[j] === WEED) && d < bd) (bd = d), (i = j);
      }
    }
    return i;
  };
  const lootAt: { k: number; x: number; y: number; rot: number; z: number; a: number; row: number }[] = [];
  const kidCarry = new Map<number, { cell: number; items: number[] }>();
  if (wave) {
    s.held.forEach((g) => {
      const m = kidCarry.get(g.carrier) ?? { cell: g.cell, items: [] };
      m.items.push(g.k);
      kidCarry.set(g.carrier, m);
    });
    s.lands.forEach((L, j) => {
      const it = wave.cargo[j];
      if (wt < APPROACH || !L.path.length) return;
      if (wt < s.impact || (L.at < 0 && wt < s.impact + HOLD)) {
        // 물과 함께 줄을 따라 온다
        let m = 0;
        while (m + 1 < L.path.length && s.arrive[L.path[m + 1]] >= 0 && s.arrive[L.path[m + 1]] <= wt) m++;
        const i0 = L.path[m], nx = L.path[Math.min(L.path.length - 1, m + 1)], u = nx !== i0 && s.arrive[nx] > s.arrive[i0] ? clamp01((wt - s.arrive[i0]) / (s.arrive[nx] - s.arrive[i0])) * 0.5 : 0;
        const li = wave.cargo.filter((q, jj) => jj < j && q.lane === it.lane).length, off = (li - 0.5 * wave.cargo.filter((q) => q.lane === it.lane).length + 0.5) * 0.036;
        const x = ccx(i0) + (ccx(nx) - ccx(i0)) * u + (wave.from === 'F' ? off : 0), y = ccy(i0) + (ccy(nx) - ccy(i0)) * u + (wave.from === 'F' ? 0 : off * 0.8);
        lootAt.push({ k: it.k, x, y: y - 0.014 - Math.abs(Math.sin(t * 0.15 + j)) * 0.008, rot: Math.sin(t * 0.1 + j) * 0.3, z: 0.027, a: 1, row: rowOf(i0) });
      } else if (L.at < 0) {
        // 웅덩이를 못 만나 바다로
        const q = clamp01((wt - s.impact - HOLD) / RECEDE), e = L.path[L.path.length - 1];
        const x = ccx(e), y = ccy(e) + (PY(vSea + 0.6) - ccy(e)) * q;
        if (q < 1) lootAt.push({ k: it.k, x: x + Math.sin(q * 9) * 0.01, y, rot: q * 6, z: 0.022, a: 1 - q * 0.7, row: rowOf(e) });
      }
    });
    // 웅덩이에 남은 보물: 아이가 집어 갈 때까지 파닥파닥
    const per = new Map<number, number>();
    s.held.forEach((g) => {
      const q = carryQ(g.carrier);
      if (q >= 0.45) return;
      const n = per.get(g.cell) ?? 0;
      per.set(g.cell, n + 1);
      const flop = Math.max(0, Math.sin(t * 0.22 + n * 2 + g.cell)), leap = t - g.t < 26 ? Math.sin(((t - g.t) / 26) * Math.PI) * 0.055 : 0;
      lootAt.push({ k: g.k, x: ccx(g.cell) + (n - 0.5) * 0.034, y: ccy(g.cell) + 0.008 - flop * 0.026 - leap, rot: g.k === FISH ? Math.sin(t * 0.5 + n) * 0.9 * flop : 0, z: 0.027, a: 1, row: rowOf(g.cell) });
    });
  }
  // ── 세워진 것들 (뒤 줄부터 앞 줄로) ──
  const momPos = (hs: House) => {
    const hx = ccx(hs.cell) - CW * 0.5, hy = ccy(hs.cell) + 0.034;
    if (s.momT < 0 || s.houses[s.wetHouse] !== hs) return { x: hx, y: hy, run: false };
    const q = (t - s.momT) * 0.045;
    return { x: hx + Math.sin(q) * 0.2, y: hy + 0.02 + Math.abs(Math.sin(q * 2.3)) * -0.012, run: true };
  };
  for (let r = 0; r < ROWS; r++)
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
        // 조개 박힌 모래벽 (깎이면 조개가 빠진다)
        for (let q = 0; q < 3; q++) {
          if (q < lost) continue;
          drawShell(ctx, X(PX(c + 0.22 + q * 0.28, r + 0.9)), Y(PY(r + 0.9, hh * 0.55)), R(0.008), t, ['#ffd1dc', '#fff0b3', '#cfe8ff'][q]);
        }
        if (lost > 0) {
          ctx.fillStyle = 'rgba(120,80,40,.35)';
          for (let q = 0; q < Math.min(4, lost + 1); q++) (ctx.beginPath(), ctx.arc(X(PX(c + 0.2 + q * 0.2, r + 0.9)), Y(PY(r + 0.9, hh * 0.5 + (q % 2))), R(0.005), 0, Math.PI * 2), ctx.fill());
        }
        label(String(hh), X(PX(c + 0.5, r + 0.5)), Y(PY(r + 0.5, hh + 0.2)), 0.036, '#ffffff', 'rgba(90,55,20,.75)');
        if (wave && fl && fl.over[i] && wt >= s.arrive[i] && fade > 0) {
          ctx.fillStyle = `rgba(150,225,250,${0.7 * fade})`;
          quad(c + 0.05, r + 0.1, c + 0.95, r + 0.92, hh + 0.3);
          ctx.fill();
        }
        ctx.restore();
      } else if (k === ROCK) {
        const x = X(ccx(i)), yb = Y(PY(r + 0.82)), rw = R(CW * scl(r) * 0.44), rh = Y(ROCK_H * HZ + 0.012);
        ctx.fillStyle = 'rgba(60,40,20,.3)';
        ctx.beginPath();
        ctx.ellipse(x, yb, rw * 1.05, rw * 0.32, 0, 0, Math.PI * 2);
        ctx.fill();
        const g = ctx.createLinearGradient(0, yb - rh, 0, yb);
        g.addColorStop(0, '#a3a59a');
        g.addColorStop(1, '#5d6157');
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
        ctx.fillStyle = '#4f4a44';
        for (let q = 0; q < 5; q++) (ctx.beginPath(), ctx.ellipse(x - rw * 0.55 + q * rw * 0.27, yb - rh * (0.12 + 0.12 * (q % 2)), R(0.006), R(0.004), 0.4, 0, Math.PI * 2), ctx.fill());
      } else if (k === HOUSE) {
        const hi = s.houses.findIndex((hs) => hs.cell === i), hs = s.houses[hi], flooded = s.wetHouse === hi && (s.phase === 'result' || (wave && wt >= s.impact));
        const hitNow = wave && fl && fl.hit[i] > 0 && wt >= s.arrive[i];
        const x = X(ccx(i)), yb = Y(PY(r + 0.8)), hw = R(CW * scl(r) * 0.5), hh2 = R(0.09);
        const wetc = flooded || hitNow ? 0.65 : s.wet[i] * 0.5;
        ctx.save();
        if (hitNow && wt < s.impact + HOLD) ctx.translate(Math.sin(t * 1.3) * 1.5, 0);
        if (flooded) {
          ctx.fillStyle = 'rgba(70,170,225,.7)';
          ctx.beginPath();
          ctx.ellipse(x, yb + R(0.004), hw * 1.6, hw * 0.5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,.7)';
          ctx.lineWidth = 1.2;
          for (let q = 0; q < 2; q++) {
            const rp = ((t * 0.015 + q * 0.5) % 1);
            ctx.beginPath();
            ctx.ellipse(x, yb + R(0.004), hw * (0.9 + rp * 0.7), hw * (0.28 + rp * 0.22), 0, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
        ctx.fillStyle = 'rgba(60,35,15,.3)';
        ctx.beginPath();
        ctx.ellipse(x, yb + R(0.004), hw * 1.15, hw * 0.34, 0, 0, Math.PI * 2);
        ctx.fill();
        // 모래 돔 집
        const g = ctx.createLinearGradient(x - hw, 0, x + hw, 0);
        g.addColorStop(0, mix('#fde7b4', '#a8875a', wetc));
        g.addColorStop(0.6, mix('#eabd7a', '#8f6a42', wetc));
        g.addColorStop(1, mix('#c48f52', '#6e4f30', wetc));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x - hw, yb);
        ctx.bezierCurveTo(x - hw, yb - hh2 * 1.1, x + hw, yb - hh2 * 1.1, x + hw, yb);
        ctx.ellipse(x, yb, hw, hw * 0.3, 0, 0, Math.PI);
        ctx.fill();
        ctx.strokeStyle = 'rgba(140,90,40,.35)';
        ctx.lineWidth = 1;
        for (let q = 1; q < 3; q++) {
          ctx.beginPath();
          ctx.ellipse(x, yb - hh2 * 0.28 * q, hw * (1 - 0.18 * q), hw * 0.2, 0, 0.15, Math.PI - 0.15);
          ctx.stroke();
        }
        // 조개 지붕
        drawShell(ctx, x, yb - hh2 * 0.78, hw * 0.55, t, hi === 0 ? '#ff9fb8' : '#9fd3ff');
        // 둥근 문 + 등불
        ctx.fillStyle = '#5e3f22';
        ctx.beginPath();
        ctx.ellipse(x - hw * 0.15, yb - hh2 * 0.18, hw * 0.24, hh2 * 0.28, 0, Math.PI, 0);
        ctx.lineTo(x + hw * 0.09, yb + hw * 0.05);
        ctx.lineTo(x - hw * 0.39, yb + hw * 0.05);
        ctx.fill();
        ctx.save();
        if (dusk > 0.2) (ctx.shadowColor = '#ffcf5a'), (ctx.shadowBlur = R(0.04) * dusk);
        ctx.fillStyle = dusk > 0.2 ? '#ffd66b' : '#9fd3ff';
        ctx.beginPath();
        ctx.arc(x + hw * 0.45, yb - hh2 * 0.42, hw * 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        // 빨랫줄 (엄마 꽃게네): 두 막대 + 작은 옷가지 — 물이 들면 엄마가 걷어 간다
        if (hs.mom && !flooded) {
          const lx0 = x + hw * 0.9, lx1 = x + hw * 1.85, ly = yb - hh2 * 0.7;
          ctx.strokeStyle = '#7a5230';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(lx0, yb);
          ctx.lineTo(lx0, ly);
          ctx.moveTo(lx1, yb + R(0.004));
          ctx.lineTo(lx1, ly);
          ctx.stroke();
          ctx.strokeStyle = 'rgba(255,255,255,.8)';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(lx0, ly);
          ctx.quadraticCurveTo((lx0 + lx1) / 2, ly + R(0.006), lx1, ly);
          ctx.stroke();
          ['#74c0fc', '#ffd43b', '#ff8fab'].forEach((cc, q) => {
            const ox = lx0 + (lx1 - lx0) * (0.22 + q * 0.28), sw = Math.sin(t * 0.12 + q) * R(0.003);
            ctx.fillStyle = cc;
            ctx.fillRect(ox - R(0.007) + sw, ly + R(0.002), R(0.014), R(0.016 + (q % 2) * 0.005));
          });
        }
        ctx.restore();
        // 집 앞 보물 더미 (이번 물때에 아이들이 날라 온 것)
        if (hi === 0) {
          const pile: number[] = [];
          const carried = wave ? s.held.filter((g) => carryQ(g.carrier) >= 1).length : s.held.length;
          let inBag = s.bag.reduce((a2, b2) => a2 + b2, 0) - (wave ? s.held.length - carried : 0);
          for (let kk = 3; kk >= 0 && inBag > 0; kk--) for (let q = 0; q < s.bag[kk] && inBag > 0; q++, inBag--) pile.push(kk);
          pile.slice(0, 8).forEach((kk, q) => {
            const px2 = x + hw * 0.55 + (q % 4) * hw * 0.32, py2 = yb + R(0.016) - Math.floor(q / 4) * R(0.014);
            drawLoot(ctx, kk, px2, py2, R(0.013), t, kk === FISH ? Math.sin(t * 0.3 + q) * 0.3 : 0);
          });
        }
        // 집 주인: 엄마 꽃게(앞치마·머릿수건) / 이웃 할아버지(밀짚모자) — 물이 들면 빨래를 이고 허둥지둥
        const mp = momPos(hs), mz = R(0.03);
        let mood: Mood = 'calm', claws = 0.2;
        if (mp.run) (mood = 'wow'), (claws = 1);
        else if (s.phase === 'result') (mood = s.ok ? 'happy' : 'dizzy'), (claws = s.ok ? 1 : 0.3);
        else if (wave && wt < s.impact) (mood = fl && fl.hit[i] > 0 ? 'strain' : 'wow'), (claws = 0.7);
        else if (wave) (mood = 'proud'), (claws = 0.8);
        else if (s.pt > 900 && s.taps === 0) (mood = 'sleep'), (claws = 0);
        else if (t - s.lastPlace < 40) (mood = 'wow'), (claws = 0.5);
        const mx = X(mp.x), my = Y(mp.y);
        drawCrab(ctx, mx, my, mz, t + hi * 30, mood, claws, { scarf: hs.mom, hat: !hs.mom, col: hs.mom ? '#ff6b45' : '#e8553a', run: mp.run, tilt: mp.run ? Math.sin(t * 0.5) * 0.15 : 0 });
        if (mp.run) {
          // 머리에 인 빨래 바구니
          ctx.fillStyle = '#c98d55';
          ctx.beginPath();
          ctx.roundRect(mx - mz * 1.1, my - mz * 2.8, mz * 2.2, mz * 0.7, mz * 0.18);
          ctx.fill();
          ['#74c0fc', '#ffd43b', '#ff8fab'].forEach((cc, q) => {
            ctx.fillStyle = cc;
            ctx.fillRect(mx - mz * 0.95 + q * mz * 0.65, my - mz * 3.25 + Math.sin(t * 0.6 + q) * mz * 0.12, mz * 0.55, mz * 0.55);
          });
          ctx.fillStyle = '#9fe3ff';
          for (const sd of [-1, 1]) (ctx.beginPath(), ctx.ellipse(mx + sd * mz * 1.3, my - mz * 1.8 + ((t * 0.08) % 1) * mz, mz * 0.12, mz * 0.2, 0, 0, Math.PI * 2), ctx.fill());
          label(hs.mom ? '어머머머!' : '아이고 내 집!', mx, my - mz * 4.2, 0.04, '#ffe3e0', 'rgba(90,20,10,.75)');
        }
        if (mood === 'sleep') label('z', mx + mz * 1.2 + ((t / 25) % 1) * mz, my - mz * 2 - ((t / 25) % 1) * mz, 0.036);
      }
      // 이 칸 줄의 보물 (뒤 줄부터)
      if (c === COLS - 1)
        for (const L of lootAt)
          if (L.row === ROWS - 1 - r) {
            ctx.globalAlpha = L.a;
            ctx.fillStyle = '#ffffff';
            drawLoot(ctx, L.k, X(L.x), Y(L.y), R(L.z), t, L.rot);
            ctx.globalAlpha = 1;
          }
    }
  // ── 꽃게 아이들 (물이 오면 조개 서핑 '야호~', 보물이 남으면 줄 서서 나른다) ──
  const gt = s.gullT >= 0 ? t - s.gullT : -1;
  s.kids.forEach((cb, k) => {
    const home = kidPos(k), hx = ccx(home), hy = ccy(home) + 0.015;
    let x = hx + Math.sin((t + cb.off) * 0.025) * CW * 0.25, y = hy, mood: Mood = 'calm', claws = 0.2, surf = 0, carry: number[] = [];
    const job = wave ? kidCarry.get(k) : undefined;
    if (job && carryQ(k) > 0 && carryQ(k) < 1) {
      const q = carryQ(k), px = ccx(job.cell), py = ccy(job.cell) + 0.012, u = q < 0.45 ? q / 0.45 : q < 0.55 ? 1 : 1 - (q - 0.55) / 0.45;
      x = hx + (px - hx) * u;
      y = hy + (py - hy) * u - Math.abs(Math.sin(t * 0.4 + k)) * 0.006;
      mood = q >= 0.45 ? 'happy' : 'wow';
      claws = q >= 0.45 ? 1 : 0.6;
      if (q >= 0.45) carry = job.items;
    } else if (wave && fl && fl.lvl[home] > 0 && wt >= s.arrive[home] && wt < s.impact + HOLD + RECEDE) {
      surf = Math.min(1, (wt - s.arrive[home]) / 50);
      const q = Math.min(1, (wt - s.arrive[home]) / (s.impact + HOLD + RECEDE - s.arrive[home]));
      x = hx + Math.sin(q * 7 + cb.off) * 0.04;
      y = hy + Math.sin(q * Math.PI) * 0.05;
      mood = 'happy';
      claws = 1;
    } else if (wave && wt < s.impact) (mood = 'wow'), (claws = 0.7);
    else if (s.phase === 'result') (mood = s.ok ? 'happy' : 'dizzy'), (claws = s.ok ? 1 : 0.3), (y -= s.ok ? Math.abs(Math.sin(t * 0.3 + cb.off)) * 0.012 : 0);
    // 갈매기 코 물기: 막내가 웅덩이로 달려간다
    if (k === s.kids.length - 1 && gt >= 14 && gt < 64 && s.gullCell >= 0) {
      const u = gt < 30 ? (gt - 14) / 16 : gt < 52 ? 1 : 1 - (gt - 52) / 12;
      x = hx + (ccx(s.gullCell) + 0.02 - hx) * u;
      y = hy + (ccy(s.gullCell) + 0.01 - hy) * u;
      mood = gt >= 36 && gt < 52 ? 'strain' : 'wow';
      claws = gt >= 34 && gt < 52 ? 1 : 0.6;
    }
    const z = R(0.02);
    if (surf > 0) drawShell(ctx, X(x), Y(y) + R(0.004), R(0.02), t, '#fff0b3');
    drawCrab(ctx, X(x), Y(y), z, t + cb.off, mood, claws, { col: '#ff8a5c', tilt: surf ? Math.sin(t * 0.3) * 0.3 : 0, run: !!carry.length || (job !== undefined && carryQ(k) > 0 && carryQ(k) < 1) });
    carry.forEach((kk, q) => drawLoot(ctx, kk, X(x) + (q - (carry.length - 1) / 2) * z * 1.2, Y(y) - z * 2.3 - q * z * 0.3, z * 0.8, t, 0));
    if (surf > 0 && wt - s.arrive[home] < 60) label('야호~', X(x), Y(y) - R(0.05), 0.036);
    if (wave && wt < APPROACH && wt > 6) label('!', X(x), Y(y) - R(0.05), 0.036);
  });
  // ── 갈매기: 말뚝 위에서 구경 → 웅덩이 보물을 노리다 집게에 코를 물린다 ──
  {
    const px = X(0.955), py = Y(Y1 + 0.035), gz = R(0.032);
    ctx.fillStyle = '#7b5232';
    ctx.fillRect(px - R(0.008), py, R(0.016), Y(0.06));
    ctx.fillStyle = '#9a6a42';
    ctx.beginPath();
    ctx.ellipse(px, py, R(0.008), R(0.003), 0, 0, Math.PI * 2);
    ctx.fill();
    const bitten = gt >= 42;
    if (gt >= 0 && gt < 100 && s.gullCell >= 0) {
      const tx = X(ccx(s.gullCell)) + R(0.045), ty = Y(ccy(s.gullCell)) - R(0.045);
      let gx: number, gy: number;
      if (gt < 30) (gx = px + (tx - px) * (gt / 30)), (gy = py - R(0.02) + (ty - py) * (gt / 30) - Math.sin((gt / 30) * Math.PI) * R(0.1));
      else if (gt < 42) (gx = tx + Math.sin(gt) * R(0.003)), (gy = ty + Math.sin(gt * 0.4) * R(0.005));
      else (gx = tx - (gt - 42) * R(0.006)), (gy = ty - (gt - 42) * R(0.007) + Math.sin(gt * 0.9) * R(0.006));
      drawGull(ctx, gx, gy, gz, t, true, gt < 42 ? -1 : 1, gt >= 30 && gt < 42, bitten);
      if (gt >= 30 && gt < 42) label('내 거야~', gx, gy - R(0.05), 0.036);
      if (bitten && gt < 80) label('꽥!!', gx, gy - R(0.05), 0.04, '#ffe0e0', 'rgba(120,20,20,.7)');
    } else {
      const squawk = s.events.some((e) => (e.kind === 'splash' || e.kind === 'catch') && t - e.t < 25);
      drawGull(ctx, px, py - gz * 0.85, gz, t, false, -1, squawk, bitten);
      if (squawk) label('깍!', px - R(0.03), py - R(0.06), 0.036);
    }
  }
  // 미리 보기 표: 벽에 부딪히는 물 높이(넘치면 빨강), 집에 물이 닿으면 경고, 보물이 갈 길과 남을 웅덩이
  if (pre) {
    for (let i = 0; i < N; i++) {
      if (!pre.f.hit[i] || pre.B.K[i] === HOUSE) continue;
      const kk = pre.B.K[i], hz = kk === ROCK ? ROCK_H + 0.8 : Math.max(0, s.Hh[i]) + 2.7, bx = X(ccx(i)), by = Y(PY(vrowOf(i) + 0.55, hz)), over = pre.f.over[i] > 0;
      ctx.fillStyle = over ? '#ff5a4a' : '#2f9be0';
      ctx.beginPath();
      ctx.arc(bx, by, R(0.022), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      label(String(pre.f.hit[i]), bx, by + 0.5, 0.036, '#ffffff', 'rgba(0,0,0,0)');
    }
    // 보물 길: 바다에서 제 줄을 따라 점선 → 웅덩이면 ✓, 아니면 '바다로'
    const wv = s.waves[pv], step = wv.from === 'F' ? COLS : wv.from === 'L' ? 1 : -1;
    const lanes = new Map<number, number[]>();
    pre.L.forEach((L, j) => {
      const key = wv.cargo[j].lane * 100 + (L.at >= 0 ? L.at : 99);
      lanes.set(key, [...(lanes.get(key) ?? []), j]);
    });
    lanes.forEach((js) => {
      const L = pre.L[js[0]], lane = wv.cargo[js[0]].lane;
      const start = wv.from === 'F' ? pre.B.sea * COLS + lane : lane * COLS + (wv.from === 'L' ? 0 : COLS - 1);
      const sx = wv.from === 'F' ? ccx(start) : ccx(start) - (step > 0 ? CW * 0.8 : -CW * 0.8), sy = wv.from === 'F' ? ccy(start) + CH * 0.8 : ccy(start);
      const end = L.at >= 0 ? L.at : L.path.length ? L.path[L.path.length - 1] : -1;
      const ex = end >= 0 ? ccx(end) : sx, ey = end >= 0 ? ccy(end) : sy;
      ctx.strokeStyle = L.at >= 0 ? 'rgba(255,236,140,.95)' : 'rgba(255,255,255,.6)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([R(0.008), R(0.008)]);
      ctx.lineDashOffset = -t * 0.4;
      ctx.beginPath();
      ctx.moveTo(X(sx), Y(sy));
      ctx.lineTo(X(ex), Y(ey));
      ctx.stroke();
      ctx.setLineDash([]);
      // 바다 위 보물 (출발점)
      js.forEach((j, q) => {
        const bx = X(sx) + (q - (js.length - 1) / 2) * R(0.05), by = Y(sy) + Math.sin(t * 0.1 + j) * R(0.004);
        ctx.fillStyle = 'rgba(255,255,255,.55)';
        ctx.beginPath();
        ctx.arc(bx, by, R(0.026), 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        drawLoot(ctx, wv.cargo[j].k, bx, by, R(0.019), t, Math.sin(t * 0.08 + j) * 0.2);
      });
      if (L.at >= 0) {
        js.forEach((j, q) => drawLoot(ctx, wv.cargo[j].k, X(ex) + (q - (js.length - 1) / 2) * R(0.04), Y(ey) - R(0.012), R(0.021), t, Math.sin(t * 0.3 + q) * 0.3));
        ctx.fillStyle = '#3ddc84';
        ctx.beginPath();
        ctx.arc(X(ex) + R(0.035), Y(ey) - R(0.05), R(0.016), 0, Math.PI * 2);
        ctx.fill();
        label('✓', X(ex) + R(0.035), Y(ey) - R(0.05) + 0.5, 0.03, '#ffffff', 'rgba(0,0,0,0)');
      } else if (end >= 0) {
        const octoMiss = js.some((j) => wv.cargo[j].k === OCTO) && L.path.some((i) => pre.B.K[i] === DUG);
        label(octoMiss ? '얕아요↩' : '바다로↩', X(ex), Y(ey) - R(0.03), 0.036, '#e0f4ff', 'rgba(20,60,90,.8)');
      }
    });
  }
  if (pre)
    for (const hs of s.houses) {
      const hv = pre.f.hit[hs.cell];
      if (!hv) continue;
      const bx = X(ccx(hs.cell)), by = Y(ccy(hs.cell)) - R(0.125), pul = 0.6 + 0.4 * Math.sin(t * 0.2);
      ctx.fillStyle = `rgba(255,70,60,${0.85 * pul + 0.1})`;
      ctx.beginPath();
      ctx.roundRect(bx - R(0.1), by - R(0.022), R(0.2), R(0.044), R(0.022));
      ctx.fill();
      label('물이 닿아요!', bx, by + 0.5, 0.036, '#ffffff', 'rgba(0,0,0,0)');
    }
  // ── 다가오는 파도 머리 (예보한 높이만큼 크다) — 보물을 싣고 온다 ──
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
      for (let x = -10; x <= w + 10; x += R(0.022)) {
        ctx.beginPath();
        ctx.arc(x, lip(x) + hc * 0.06, hc * (0.12 + 0.05 * Math.sin(x * 0.3 + t * 0.4)), 0, Math.PI * 2);
        ctx.fill();
      }
      for (let k = 0; k < 24; k++) {
        const x = hsh(k) * w, up = ((t * 0.05 + hsh(k + 3)) % 1) * hc * 0.9;
        ctx.globalAlpha = al * 0.85;
        ctx.beginPath();
        ctx.arc(x, lip(x) - up, R(0.003 + hsh(k + 7) * 0.003), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = al;
      wave.cargo.forEach((it, j) => {
        const x = X(PX(it.lane + 0.5, vSea)) + (wave.cargo.filter((q, jj) => jj < j && q.lane === it.lane).length) * R(0.04);
        ctx.fillStyle = '#ffffff';
        drawLoot(ctx, it.k, x, lip(x) - R(0.014) + Math.sin(t * 0.3 + j) * R(0.006), R(it.k === OCTO ? 0.034 : 0.028), t, Math.sin(t * 0.2 + j) * 0.4);
      });
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
      for (let y = y0; y <= y1; y += R(0.022)) {
        ctx.beginPath();
        ctx.arc(lip(y), y, hc * (0.14 + 0.06 * Math.sin(y * 0.3 + t * 0.4)), 0, Math.PI * 2);
        ctx.fill();
      }
      wave.cargo.forEach((it, j) => {
        const y = Y(PY(ROWS - 1 - it.lane + 0.5)) + Math.sin(t * 0.3 + j) * R(0.006);
        ctx.fillStyle = '#ffffff';
        drawLoot(ctx, it.k, lip(y) - sd * R(0.015), y, R(it.k === OCTO ? 0.03 : 0.024), t, Math.sin(t * 0.2 + j) * 0.4);
      });
    }
    ctx.restore();
  }
  // 첫 판 첫 손짓: 물고기가 오는 줄의 칸을 가리키는 손가락
  if (s.stage === 0 && s.phase === 'build' && s.pi === 0 && t > 10) {
    const tc = (s.sea + 1) * COLS + s.waves[0].cargo[0].lane, bob = Math.abs(Math.sin(t * 0.12)) * R(0.02);
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
    if (e.kind === 'dig') fx.burst(x, y, '#b08850', 18, 3, 2.6), fx.burst(x, y, '#e8c486', 8, 2, 2), fx.ring(x, y, '#ffffff', R(0.06), 3), fx.kick(2.5), say(x, y - R(0.05), e.text!, e.col!, 14);
    if (e.kind === 'nope') say(x, y - R(0.04), e.text!, e.col!, 13), fx.kick(1.5);
    if (e.kind === 'splash') fx.burst(x, y - R(0.02), '#ffffff', 18, 3.6, 2.6), fx.burst(x, y - R(0.02), '#8fdcff', 10, 3, 2.2), fx.ring(x, y, '#ffffff', R(0.07), 3), fx.kick(3), say(x, y - R(0.06), e.text!, '#ffffff', 16);
    if (e.kind === 'over') fx.burst(x, y - R(0.02), '#9fe3ff', 22, 4, 2.6), fx.kick(4), say(x, y - R(0.06), e.text!, e.col!, 15);
    if (e.kind === 'fill') fx.burst(x, y, '#9fe3ff', 10, 2.4, 2.2), fx.ring(x, y, '#bff0ff', R(0.05), 2);
    if (e.kind === 'chit') fx.burst(x, y - R(0.04), '#9fe3ff', 26, 4.5, 3), fx.kick(6), say(x, y - R(0.12), e.text!, e.col!, 16);
    if (e.kind === 'crumble') fx.burst(x, y, '#e2b878', 8, 2.2, 2.2), say(x, y - R(0.02), e.text!, '#ffe3b0', 12);
    if (e.kind === 'gone') fx.burst(x, y, '#d9ab6a', 26, 3.6, 3), fx.kick(4), say(x, y - R(0.02), e.text!, '#ffe3b0', 14);
    if (e.kind === 'safe') fx.burst(x, y - R(0.03), '#ffe066', 16, 3.4, 2.4), say(x, y - R(0.09), e.text!, e.col!, 15);
    if (e.kind === 'catch') fx.burst(x, y - R(0.03), '#ffffff', 16, 4.6, 2.4), fx.burst(x, y, '#ffffff', 22, 3.8, 2.6), fx.burst(x, y, '#9fe3ff', 14, 3, 2.2), fx.ring(x, y, '#ffe066', R(0.08), 4), fx.kick(3), say(x, y - R(0.07), e.text!, e.col!, 17);
    if (e.kind === 'lost') say(x, y - R(0.04), e.text!, e.col!, 13);
    if (e.kind === 'yay') say(x, y - R(0.06), e.text!, e.col!, 17), fx.burst(x, y, '#ffe066', 20, 3.4, 2.4);
    if (e.kind === 'flooded') fx.burst(x, y, '#9fe3ff', 50, 5.5, 3.2), fx.kick(10), fx.blink('#bfe6ff', 0.25), say(x, y - R(0.09), e.text!, e.col!, 18);
    if (e.kind === 'tide') fx.blink('#bfe6ff', 0.2), fx.kick(3), say(w / 2, y - R(0.03), e.text!, e.col!, 15);
    if (e.kind === 'incoming') fx.kick(2), say(w / 2, Y(SF - 0.075), e.text!, e.col!, 17);
    if (e.kind === 'clear') fx.burst(w * 0.3, Y(0.45), '#9fe3ff', 30, 6, 3), fx.burst(w * 0.3, y, '#ffe066', 40, 6, 3.2), fx.burst(w * 0.7, y, '#ff8fb1', 40, 6, 3.2), fx.ring(w / 2, y, '#ffe066', R(0.4), 7), fx.blink('#fff6c8', 0.25);
    if (e.kind === 'fail') fx.kick(8), fx.blink(th.hot, 0.2);
  }
  // 아이가 집에 보물을 들여놓을 때 · 갈매기가 코를 물릴 때 (그리기만 하는 순간 연출)
  if (wave)
    s.held.forEach((g, j) => {
      const key = `d${s.stage}:${s.wi}:${j}:${s.hearts}`;
      if (carryQ(g.carrier) >= 1 && !fx.memo[key]) {
        fx.memo[key] = 1;
        const hx = X(ccx(s.houses[0].cell)), hy = Y(ccy(s.houses[0].cell));
        fx.burst(hx, hy - R(0.03), '#ffe066', 10, 2.6, 2.2);
        say(hx, hy - R(0.08), `+${LOOT_PTS[g.k]}`, '#fff1a8', 15);
      }
    });
  if (gt >= 42 && !fx.memo[`g${s.stage}:${s.hearts}:${s.gullT}`]) {
    fx.memo[`g${s.stage}:${s.hearts}:${s.gullT}`] = 1;
    const x = X(ccx(s.gullCell)) + R(0.04), y = Y(ccy(s.gullCell)) - R(0.04);
    fx.burst(x, y, '#ffffff', 24, 4, 2.6);
    fx.ring(x, y, '#ff6b6b', R(0.06), 3);
    fx.kick(4);
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
  const ttl = `🦀 ${s.stage + 1}번째 물때`, tw1 = ctx.measureText(ttl).width;
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
  // ── 파도 예보판: 방향·높이 + 싣고 오는 보물 ──
  {
    const n = s.waves.length, g = cardGeo(n);
    ctx.fillStyle = 'rgba(255,250,238,.92)';
    ctx.beginPath();
    ctx.roundRect(X(0.025), Y(FP.y), R(0.95), R(FP.h), R(0.02));
    ctx.fill();
    ctx.strokeStyle = 'rgba(30,90,120,.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.fillStyle = '#1d5a72';
    font(0.036, 900);
    ctx.fillText('🌊 파도 예보', X(0.045), Y(FP.y + 0.019));
    ctx.textAlign = 'right';
    font(0.036, 700);
    ctx.fillStyle = '#4f7f90';
    ctx.fillText(s.phase === 'build' ? '카드 톡 = 그 파도 미리 보기' : '높이 · 싣고 오는 보물', X(0.955), Y(FP.y + 0.019));
    for (let k = 0; k < n; k++) {
      const wv = s.waves[k], cx0 = g.x0 + k * (g.cw + g.gap), cy0 = g.cy0, ch = g.ch, cw = g.cw;
      const cur = s.phase === 'wave' && k === s.wi, done = (s.phase === 'wave' && k < s.wi) || s.phase === 'result';
      const next = k === pv, pinned = k === s.pin && s.phase === 'build';
      ctx.save();
      if (cur) (ctx.shadowColor = '#7fdcff'), (ctx.shadowBlur = R(0.03));
      const gg = ctx.createLinearGradient(0, Y(cy0), 0, Y(cy0 + ch));
      gg.addColorStop(0, cur ? '#5fd0ff' : '#8fd8ef');
      gg.addColorStop(1, cur ? '#1c8fc4' : '#3aa2c8');
      ctx.fillStyle = gg;
      ctx.globalAlpha = done ? 0.45 : 1;
      ctx.beginPath();
      ctx.roundRect(X(cx0), Y(cy0), R(cw), R(ch), R(0.014));
      ctx.fill();
      ctx.restore();
      if (cur || next) {
        ctx.strokeStyle = cur ? '#ffffff' : '#ffd166';
        ctx.lineWidth = cur ? 2.5 : pinned ? 4 : 3;
        ctx.beginPath();
        ctx.roundRect(X(cx0), Y(cy0), R(cw), R(ch), R(0.014));
        ctx.stroke();
      }
      if (next) {
        ctx.fillStyle = '#ffd166';
        ctx.beginPath();
        ctx.moveTo(X(cx0 + cw / 2 - 0.015), Y(cy0 + ch));
        ctx.lineTo(X(cx0 + cw / 2 + 0.015), Y(cy0 + ch));
        ctx.lineTo(X(cx0 + cw / 2), Y(cy0 + ch + 0.012));
        ctx.fill();
      }
      ctx.globalAlpha = done ? 0.5 : 1;
      // 방향 화살표 + 높이 (윗줄)
      const my = Y(cy0 + ch * 0.32);
      const arrow = (ax: number, ay: number, dx: number, dy: number, L: number) => {
        ctx.save();
        ctx.translate(ax, ay);
        ctx.rotate(Math.atan2(dy, dx));
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
      };
      const L = R(Math.min(0.045, cw * 0.32));
      if (wv.from === 'F') arrow(X(cx0 + cw * 0.3), my, 0, -1, L);
      else arrow(X(cx0 + cw * 0.3), my, wv.from === 'L' ? 1 : -1, 0, L);
      font(0.05, 900);
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(10,60,90,.55)';
      ctx.strokeText(String(wv.h), X(cx0 + cw * 0.66), my + R(0.002));
      ctx.fillStyle = '#ffffff';
      ctx.fillText(String(wv.h), X(cx0 + cw * 0.66), my + R(0.002));
      if (wv.rise) {
        ctx.fillStyle = '#ffffff';
        font(0.03, 800);
        ctx.fillText('🌙', X(cx0 + cw - 0.016), Y(cy0 + 0.017));
      }
      // 싣고 오는 보물 (아랫줄)
      const iy = Y(cy0 + ch * 0.76), isz = R(Math.min(0.021, cw / (wv.cargo.length * 2.7)));
      ctx.fillStyle = 'rgba(255,255,255,.28)';
      ctx.beginPath();
      ctx.roundRect(X(cx0 + 0.006), iy - R(0.024), R(cw - 0.012), R(0.048), R(0.012));
      ctx.fill();
      wv.cargo.forEach((it, q) => {
        ctx.fillStyle = '#ffffff';
        drawLoot(ctx, it.k, X(cx0 + cw / 2) + (q - (wv.cargo.length - 1) / 2) * isz * 2.6, iy, isz, t, 0);
      });
      if (done) {
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#ffffff';
        font(0.05, 900);
        ctx.fillText('✓', X(cx0 + cw / 2), Y(cy0 + ch / 2));
      }
      ctx.globalAlpha = 1;
    }
  }
  // 새것 알림 (차례로 한 줄씩)
  {
    const nw = s.newsQ.find((q) => s.t >= q.t && s.t - q.t < NEWS);
    if (nw) {
      const age = s.t - nw.t, a = Math.min(1, age / 10, (NEWS - age) / 20), drop = Math.max(0, 10 - age) * 2;
      ctx.globalAlpha = a;
      font(0.036, 900);
      ctx.textAlign = 'center';
      const tx = `✨ ${nw.text}`, tw2 = Math.min(w - 12, ctx.measureText(tx).width + 22), by2 = Y(0.283) - drop;
      ctx.fillStyle = 'rgba(16,52,66,.88)';
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
  }
  // 판 카드: 시작 · 성공 · 젖었다
  const regNow = s.bag[FISH] + s.bag[SHELL] + s.bag[STAR];
  {
    let head = '', sub = '', col = '#ffffff', age = 0, a = 1;
    if (s.phase === 'result') {
      age = s.pt;
      if (s.ok) {
        head = s.won ? '갯벌을 다 지켰다! 🦀🐟' : `보물 ${regNow + (s.octoGot ? 1 : 0)}개! ${'★'.repeat(s.got)}${'☆'.repeat(3 - s.got)}`;
        sub = `집 뽀송 ✓ · 목표 ${Math.min(regNow, s.goal)}/${s.goal}${s.octoAny ? ` · 문어 ${s.octoGot ? '✓' : '✗'}` : ''}${s.keep ? ` · 남긴 조각 ${s.keep}` : ''}`;
        col = '#ffd166';
      } else (head = '첨벙… 꽃게 집이 젖었어요'), (sub = s.hearts > 0 ? `하트 -1 · 같은 갯벌 처음부터 다시` : '끝 — 잘했어요!'), (col = '#ffb3a8');
    } else if (s.phase === 'build' && s.pt < 110 && (s.stage > 0 || s.hearts < 3)) {
      age = s.pt;
      a = Math.min(1, (110 - s.pt) / 20);
      head = `${s.stage + 1}번째 물때`;
      sub = `파도 ${s.waves.length}번 · 보물 ${s.regTotal + (s.octoAny ? 1 : 0)}개 오는 중 · 목표 ${s.goal}개`;
    }
    if (head) {
      const sc = Math.min(1, 0.6 + age / 12), cyy = Y(Y1 + 0.062);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(w / 2, cyy);
      ctx.scale(sc, sc);
      ctx.fillStyle = 'rgba(16,52,66,.88)';
      ctx.beginPath();
      ctx.roundRect(-R(0.42), -R(0.06), R(0.84), R(0.12), R(0.04));
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = col;
      font(0.05, 900);
      ctx.fillText(head, 0, -R(0.02), R(0.8));
      ctx.fillStyle = '#fffaf0';
      font(0.036, 800);
      ctx.fillText(sub, 0, R(0.033), R(0.8));
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
      const mx = X(x + ww / 2), my = Y(y + hh * (big ? 0.42 : 0.5)), z = R(big ? 0.05 : 0.032);
      if (pc === PW) {
        ctx.fillStyle = '#d9ad66';
        ctx.fillRect(mx - z, my - z * 0.1, z * 2, z * 0.7);
        ctx.fillStyle = '#f7dc9f';
        ctx.fillRect(mx - z, my - z * 0.5, z * 2, z * 0.42);
        for (let q = 0; q < 3; q++) drawShell(ctx, mx - z * 0.66 + q * z * 0.66, my + z * 0.3, z * 0.16, t, ['#ffd1dc', '#fff0b3', '#cfe8ff'][q]);
      } else {
        // 구덩이 + 삽
        ctx.fillStyle = '#8c6c42';
        ctx.beginPath();
        ctx.ellipse(mx - z * 0.2, my + z * 0.2, z * 0.9, z * 0.38, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#4fb3d9';
        ctx.beginPath();
        ctx.ellipse(mx - z * 0.2, my + z * 0.26, z * 0.72, z * 0.26, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.save();
        ctx.translate(mx + z * 0.55, my - z * 0.2);
        ctx.rotate(0.5);
        ctx.fillStyle = '#ffd43b';
        ctx.fillRect(-z * 0.06, -z * 0.8, z * 0.12, z * 0.75);
        ctx.fillStyle = '#ff6b6b';
        ctx.beginPath();
        ctx.moveTo(-z * 0.25, -z * 0.05);
        ctx.lineTo(z * 0.25, -z * 0.05);
        ctx.lineTo(z * 0.18, z * 0.35);
        ctx.lineTo(0, z * 0.45);
        ctx.lineTo(-z * 0.18, z * 0.35);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
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
      const msg = s.phase === 'wave' ? `파도 ${s.wi + 1}/${s.waves.length} — 보물이 온다!` : s.ok ? '성공! 꽃게들이 춤춰요' : '다시 지어 봐요';
      ctx.fillText(msg, X(0.04), Y(ty + 0.045));
      // 이번 물때에 모은 보물
      font(0.036, 800);
      ctx.fillText('모은 보물', X(0.04), Y(ty + 0.11));
      const tw0 = ctx.measureText('모은 보물').width;
      let bx = X(0.04) + tw0 + R(0.03);
      for (let k = 0; k < 4; k++) {
        if (!s.bag[k]) continue;
        ctx.fillStyle = '#ffffff';
        drawLoot(ctx, k, bx, Y(ty + 0.11), R(0.016), t, 0);
        ctx.fillStyle = '#ffe9c4';
        font(0.036, 900);
        ctx.textAlign = 'left';
        ctx.fillText(`×${s.bag[k]}`, bx + R(0.024), Y(ty + 0.11));
        bx += R(0.1);
      }
      if (!s.bag.some((v) => v > 0)) (ctx.fillStyle = 'rgba(255,233,196,.6)'), ctx.fillText('아직 없음', bx, Y(ty + 0.11));
    }
    let hint = '';
    if (s.phase === 'build') {
      const pc = s.pieces[s.pi];
      if (s.stage === 0 && s.pi === 0) hint = '👆 반짝이는 칸을 톡! 물고기가 오는 줄에 웅덩이를 파요';
      else if (pc === PD) hint = '파기: 판 칸은 물이 안 낮아지고 고여요 · 보물이 퐁당';
      else if (pc === PW) hint = '모래벽: 높이 3까지 막아요 · 맞으면 깎여요 (또 쌓으면 +2)';
      else hint = '파도가 곧 와요!';
    } else if (s.phase === 'wave' && wave) hint = `${wave.from === 'F' ? '바다' : wave.from === 'L' ? '왼쪽' : '오른쪽'}에서 높이 ${wave.h} — 앞으로 1·옆으로 2씩 낮아져요`;
    else if (s.phase === 'result') hint = s.ok ? `별 ${s.got}개! 다음 물때는 파도가 더 세요` : '집 앞을 막고, 물길은 집 반대쪽으로';
    ctx.textAlign = 'center';
    const first = s.stage === 0 && s.pi === 0 && s.phase === 'build';
    ctx.fillStyle = first ? '#ffffff' : '#ffe9c4';
    font(first ? 0.042 : 0.038, 900);
    ctx.fillText(hint, w / 2, Y(ty + 0.19), w - R(0.06));
    ctx.fillStyle = 'rgba(255,233,196,.65)';
    font(0.036, 700);
    ctx.fillText(`점수 ${s.pts}`, w / 2, Y(ty + 0.24));
  }
}
