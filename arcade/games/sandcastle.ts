/**
 * 밀물 모래성 (21라운드 '지어서 버티기' 변형) — 지어서 버티기 × 재난 예보 × 가리키기(톡).
 * 기준 9(손이 하는 일은 하나): 빈 모래를 톡 = 그 칸에 다음 조각(모래벽·돌·해자). 다 놓거나 '▶ 버티기'를 톡 치면 파도가 온다.
 * 와우: 하늘의 파도 예보판에 이번 밀물의 파도가 순서대로 뜬다(높이·방향) — 파도는 여러 번 오고, 부딪힌 모래벽은 매번 깎인다.
 *       깎인 자리로 다음 파도가 더 들어온다. 그래서 '어디를 두껍게' 쌓을지가 수가 된다.
 * 물(결정적 칸 규칙): 파도 높이 H = 바닷가 첫 줄에 서는 물의 높이. 한 칸 갈 때마다 1씩 낮아진다.
 *   모래벽(높이 3)·돌(높이 4)보다 낮은 물은 막히고, 높으면 넘는다(넘은 만큼만 이어 간다). 해자 안의 물은 앞(안쪽)으로 못 가고 옆으로 흐른다.
 *   부딪힌 모래벽은 1, 넘친 모래벽은 2 깎인다(돌·해자는 안 깎인다). 성에 닿은 물의 높이만큼 성이 무너진다.
 * 첫 3초: 1판은 모래벽 둘. 둘을 쌓자 첫 파도가 '철썩' 벽에 부서지고 꽃게 임금님이 집게를 번쩍.
 * 목표·보상: 판(밀물)마다 파도를 다 버티면 별 — ★ 성이 섰다 · ★ 성이 하나도 안 깎였다 · ★ 조개를 다 지켰다.
 *   성이 무너지면 하트 -1, 그 판을 처음부터 다시(같은 바닷가). 하트 셋을 다 잃거나 8판을 마치면 끝.
 * 펼쳐짐(하는 일이 바뀐다): 1판 모래벽·깎임 → 2판 돌(안 깎임)·조개(지키면 별) → 3판 옆 파도(옆을 막는다) → 4판 해자(물을 옆으로 돌림)
 *   → 5판 밀물(파도마다 바다가 한 줄씩 올라와 앞쪽 벽이 잠긴다 → 성 가까이 짓는다) → 6판 왕자님 성(둘을 나눠 지킨다)
 *   → 7판 폭풍(양옆에서) → 8판 대왕 밀물(전부).
 * 웃음(기준 10): 꽃게 임금님 표정(두리번·눈 휘둥그레·힘줌·우쭐 집게 번쩍·어질어질), 성이 깎이면 갈매기가 깃발을 낚아채 가고,
 *   물에 닿은 꽃게 백성은 조개껍데기 서핑으로 '야호~' 떠내려갔다 돌아오고, 성이 무너지면 임금님이 조개 서핑으로 바다로 퇴장.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.4;
export const COLS = 8, ROWS = 7, N = COLS * ROWS;
export const SAND = 0, WALL = 1, ROCK = 2, MOAT = 3, CASTLE = 4, SEA = 5;
/** 조각: 모래벽 · 돌 · 해자 */
export const PW = 0, PR = 1, PM = 2;
const WALL_H = 3, STACK = 2, MAX_H = 7, ROCK_H = 4, MOAT_D = 3;
/** 파도 연출(틱): 다가오기 · 한 칸 번질 때마다 · 다 번진 뒤 머무름 · 빠짐 */
const APPROACH = 34, STEP = 6, HOLD = 26, RECEDE = 44;
const RESULT = 150, AUTO = 22, PREVIEW = 120;

type From = 'F' | 'L' | 'R';
export interface Wave { h: number; from: From; rise: boolean }
interface StageDef { waves: string; pieces: string; shells: number; boulders: number; row: number; twin?: boolean }
/** 판(밀물) 8개. waves: F=바다 쪽(앞)에서, S=옆(판마다 왼쪽·오른쪽), L/R=왼쪽·오른쪽, 앞에 +면 그 파도 전에 바다가 한 줄 올라온다(밀물) */
const STAGES: StageDef[] = [
  { waves: 'F4 F5', pieces: 'WW', shells: 0, boulders: 0, row: 4 },
  { waves: 'F5 F6 F5', pieces: 'WRWW', shells: 1, boulders: 0, row: 4 },
  { waves: 'F5 S5 F6', pieces: 'WWRWW', shells: 1, boulders: 1, row: 4 },
  { waves: 'F6 F6 S5 F7', pieces: 'MWWMRW', shells: 2, boulders: 1, row: 5 },
  { waves: 'F4 F4 +F5 +F5', pieces: 'WWRMWW', shells: 1, boulders: 1, row: 5 },
  { waves: 'F6 S4 F6 F7', pieces: 'WRWMWWR', shells: 1, boulders: 2, row: 5, twin: true },
  { waves: 'F7 L5 R5 F8', pieces: 'RWWMWWRW', shells: 2, boulders: 1, row: 5 },
  { waves: 'F5 S4 +F6 S4 +F6', pieces: 'WRWMWWRWM', shells: 2, boulders: 2, row: 5, twin: true },
];
export const STAGE_COUNT = STAGES.length;
const PIECE_NAME = ['모래벽', '돌', '해자'];

export const NB: number[][] = [...Array(N).keys()].map((i) => {
  const r = Math.floor(i / COLS), c = i % COLS, out: number[] = [];
  if (r > 0) out.push(i - COLS);
  if (c > 0) out.push(i - 1);
  if (c < COLS - 1) out.push(i + 1);
  if (r < ROWS - 1) out.push(i + COLS);
  return out;
});
const rowOf = (i: number) => Math.floor(i / COLS), colOf = (i: number) => i % COLS;

export interface Board { K: Uint8Array; Hh: Int8Array; shell: Uint8Array; hp: number[]; sea: number }
export interface Flood { lvl: Int8Array; hit: Int8Array; over: Uint8Array }

const BK: number[][] = Array.from({ length: 16 }, () => []);
/**
 * 파도 하나가 어디까지 얼마나 높이 들어오나 (결정적, 봇이 내다볼 때도 같은 함수).
 * 높이 H의 물이 바닷가 첫 줄(옆 파도면 옆 첫 칸)에 선다. 파도가 오는 쪽으로 한 칸 갈 때마다 1, 옆으로 번질 땐 2씩 낮아진다.
 * 벽(모래벽·돌)은 자기 높이 이하의 물을 막고(hit 기록), 넘는 물은 넘은 만큼만 이어 간다.
 * 해자 안의 물은 앞으로는 깊이만큼 넘쳐야 가고, 옆으로는 1씩만 낮아지며 흐른다(물을 옆으로 돌린다).
 */
export function flood(K: Uint8Array, Hh: Int8Array, w: Wave, sea: number): Flood {
  const lvl = new Int8Array(N), hit = new Int8Array(N), over = new Uint8Array(N);
  for (const q of BK) q.length = 0;
  const enter = (b: number, inc: number) => {
    if (inc <= 0) return;
    const k = K[b];
    if (k === SEA) return;
    if (k === CASTLE) {
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
      const moat = K[b] === MOAT;
      for (const n of NB[b]) {
        const d = n - b, ahead = d === fwd, side = d !== fwd && d !== -fwd;
        enter(n, moat ? (ahead ? l - 1 - MOAT_D : side ? l - 1 : l - 2) : ahead ? l - 1 : l - 2);
      }
    }
  }
  return { lvl, hit, over };
}

/** 파도가 지나간 뒤: 모래벽이 깎이고(맞으면 1, 넘치면 2), 성이 무너지고, 젖은 조개는 떠내려간다 */
export function settle(B: Board, cas: Int8Array, f: Flood) {
  const dmg = B.hp.map(() => 0), crumble: number[] = [], gone: number[] = [], lost: number[] = [];
  for (let i = 0; i < N; i++) {
    if (B.K[i] === WALL && f.hit[i] > 0) {
      B.Hh[i] -= f.over[i] ? 2 : 1;
      crumble.push(i);
      if (B.Hh[i] <= 0) (B.K[i] = SAND), (B.Hh[i] = 0), gone.push(i);
    }
    if (cas[i] && f.hit[i] > dmg[cas[i] - 1]) dmg[cas[i] - 1] = f.hit[i];
    if (B.shell[i] && f.lvl[i] > 0) (B.shell[i] = 0), lost.push(i);
  }
  for (let k = 0; k < dmg.length; k++) B.hp[k] = Math.max(0, B.hp[k] - dmg[k]);
  return { dmg, crumble, gone, lost };
}

/** 밀물: 바닷가 첫 줄이 바다에 잠긴다 (그 줄의 조각·조개는 사라진다) */
export function tideUp(B: Board) {
  const lost: number[] = [];
  for (let c = 0; c < COLS; c++) {
    const i = B.sea * COLS + c;
    if (B.shell[i]) lost.push(i);
    B.K[i] = SEA;
    B.Hh[i] = 0;
    B.shell[i] = 0;
  }
  B.sea++;
  return lost;
}

interface Castle { cells: number[]; max: number; prince: boolean }
interface Ev { t: number; kind: string; x: number; y: number; text?: string; col?: string }
interface Crab { home: number; off: number }
export interface SandState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'build' | 'wave' | 'result'; pt: number;
  K: Uint8Array; Hh: Int8Array; shell: Uint8Array; nat: Uint8Array; cas: Int8Array; hp: number[]; castles: Castle[]; sea: number;
  waves: Wave[]; wi: number; wt: number; fl: Flood | null; arrive: Int16Array; impact: number; end: number; lastDmg: number[];
  pieces: number[]; pi: number; auto: number; wet: Float32Array; shells0: number;
  hearts: number; stars: number; got: number; pts: number; ok: boolean; dmgThis: number; lostThis: number; keep: number;
  down: boolean; taps: number; seen: Set<string>; events: Ev[]; news: { text: string; t: number } | null; dead: boolean; won: boolean;
  crabs: Crab[]; lastPlace: number; place: Int16Array; peak: Int8Array; stealT: number;
}

const ev = (s: SandState, kind: string, x: number, y: number, text?: string, col?: string) => s.events.push({ t: s.t, kind, x, y, text, col });
function see(s: SandState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  s.news = { text, t: s.t };
}

// ───────── 화면 배치 (가로 0~1, 세로 0~A) — 판은 3/4 시점 사다리꼴(뒤쪽 줄이 좁다) ─────────
const CW = 0.108, CH = 0.085, Y0 = 0.45, Y1 = Y0 + ROWS * CH, HZ = 0.016;
const scl = (r: number) => 0.87 + 0.13 * (r / ROWS);
/** 판 좌표(c: 0~COLS, r: 0~ROWS, z: 높이 단위) → 화면 좌표 */
const PX = (c: number, r: number) => 0.5 + (c - COLS / 2) * CW * scl(r);
const PY = (r: number, z = 0) => Y0 + r * CH - z * HZ;
const ccx = (i: number) => PX(colOf(i) + 0.5, rowOf(i) + 0.5), ccy = (i: number) => PY(rowOf(i) + 0.5);
/** 아래 쟁반: 조각 미리 보기 · '▶ 버티기' 단추 */
const TY = Y1 + 0.074, BTN = { x: 0.635, y: TY + 0.03, w: 0.33, h: 0.11 };

function cellAt(x: number, y: number): number {
  if (y < Y0 || y >= Y1) return -1;
  const r = Math.floor((y - Y0) / CH), c = Math.floor((x - 0.5) / (CW * scl(r + 0.5)) + COLS / 2);
  return c < 0 || c >= COLS ? -1 : r * COLS + c;
}

function boardOf(s: SandState): Board {
  return { K: s.K.slice(), Hh: s.Hh.slice(), shell: s.shell.slice(), hp: s.hp.slice(), sea: s.sea };
}

export function canPlace(K: Uint8Array, Hh: Int8Array, shell: Uint8Array, i: number, p: number) {
  if (shell[i]) return false;
  if (K[i] === SAND) return true;
  return p === PW && K[i] === WALL && Hh[i] < MAX_H;
}
function put(B: { K: Uint8Array; Hh: Int8Array }, i: number, p: number) {
  if (p === PW) B.K[i] === WALL ? (B.Hh[i] = Math.min(MAX_H, B.Hh[i] + STACK)) : ((B.K[i] = WALL), (B.Hh[i] = WALL_H));
  else if (p === PR) B.K[i] = ROCK;
  else B.K[i] = MOAT;
}

/** 판 구성: 같은 판은 다시 해도 같은 바닷가 (실패하면 '처음부터 다시 짓기') */
function newStage(s: SandState) {
  const d = STAGES[s.stage], r = mulberry32((s.seed * 31 + s.stage * 7919 + 17) >>> 0);
  s.K = new Uint8Array(N);
  s.Hh = new Int8Array(N);
  s.shell = new Uint8Array(N);
  s.nat = new Uint8Array(N);
  s.cas = new Int8Array(N);
  s.wet = new Float32Array(N);
  s.place = new Int16Array(N).fill(-999);
  s.peak = new Int8Array(N);
  s.stealT = -1;
  s.sea = 0;
  const c = /[SLR]/.test(d.waves) ? 3 : 2 + Math.floor(r() * 3), row = d.row;
  s.castles = [{ cells: [row * COLS + c, row * COLS + c + 1], max: 3, prince: false }];
  if (d.twin) {
    const pc = c <= 3 ? 6 : 1;
    s.castles.push({ cells: [(row - Math.floor(r() * 2)) * COLS + pc], max: 2, prince: true });
  }
  s.hp = s.castles.map((k) => k.max);
  s.castles.forEach((k, j) => k.cells.forEach((i) => ((s.K[i] = CASTLE), (s.cas[i] = j + 1))));
  const near = (i: number, dmax: number) => s.castles.some((k) => k.cells.some((j) => Math.abs(rowOf(i) - rowOf(j)) <= dmax && Math.abs(colOf(i) - colOf(j)) <= dmax));
  const free = (r0: number, r1: number, ok: (i: number) => boolean) => {
    for (let k = 0; k < 80; k++) {
      const i = (r0 + Math.floor(r() * (r1 - r0 + 1))) * COLS + Math.floor(r() * COLS);
      if (s.K[i] === SAND && !s.shell[i] && ok(i)) return i;
    }
    return -1;
  };
  for (let k = 0; k < d.boulders; k++) {
    const i = free(1, row - 1, (j) => !near(j, 1) && !NB[j].some((n) => s.K[n] === ROCK));
    if (i >= 0) (s.K[i] = ROCK), (s.nat[i] = 1);
  }
  for (let k = 0; k < d.shells; k++) {
    const i = free(Math.max(1, row - 3), Math.min(ROWS - 1, row + 1), (j) => near(j, 2) && !NB[j].some((n) => s.shell[n]));
    if (i >= 0) s.shell[i] = 1;
  }
  s.shells0 = s.shell.reduce((a, b) => a + b, 0);
  s.waves = d.waves.split(' ').map((x) => {
    const rise = x[0] === '+', y = rise ? x.slice(1) : x;
    return { h: Number(y.slice(1)), from: (y[0] === 'S' ? (r() < 0.5 ? 'L' : 'R') : y[0]) as From, rise };
  });
  const ps: number[] = [...d.pieces].map((ch) => (ch === 'W' ? PW : ch === 'R' ? PR : PM));
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
  s.phase = 'build';
  s.pt = 0;
  s.dmgThis = 0;
  s.lostThis = 0;
  s.lastDmg = s.hp.map(() => 0);
  // 꽃게 백성 둘 (성 옆 모래에서 논다 — 연출만)
  s.crabs = [];
  for (let k = 0; k < 2; k++) {
    const i = free(row - 1, Math.min(ROWS - 1, row + 1), (j) => near(j, 1) && !s.crabs.some((q) => q.home === j));
    if (i >= 0) s.crabs.push({ home: i, off: k * 37 });
  }
  // 새것 알림
  see(s, 'wall', '🧱 모래벽 — 파도를 막지만 맞을 때마다 깎여요');
  if (ps.includes(PR)) see(s, 'rock', '🪨 돌 — 더 높고 절대 안 깎여요 (대신 조금뿐)');
  if (s.shells0) see(s, 'shell', '🐚 조개 — 젖지 않게 지키면 별 하나 더');
  if (s.waves.some((w) => w.from !== 'F')) see(s, 'side', '↔️ 옆 파도 — 옆에서도 밀려와요');
  if (ps.includes(PM)) see(s, 'moat', '〰️ 해자 — 물이 안쪽으로 못 가고 옆으로 흘러요');
  if (s.waves.some((w) => w.rise)) see(s, 'tide', '🌙 밀물 — 파도마다 바다가 한 줄씩 올라와요');
  if (d.twin) see(s, 'prince', '👑 왕자님 성 — 두 성을 다 지켜요');
  if (s.waves.some((w) => w.from === 'L') && s.waves.some((w) => w.from === 'R')) see(s, 'storm', '⛈️ 폭풍 — 양쪽 옆에서 다 와요');
  ev(s, 'stage', 0.5, 0.36, `${s.stage + 1}번째 밀물 — 파도 ${s.waves.length}번!`);
}

function startWaves(s: SandState) {
  s.phase = 'wave';
  s.wi = 0;
  s.taps++;
  startWave(s);
}

function startWave(s: SandState) {
  const w = s.waves[s.wi];
  s.wt = 0;
  s.fl = flood(s.K, s.Hh, w, s.sea);
  s.arrive = new Int16Array(N).fill(-1);
  for (let i = 0; i < N; i++) {
    const v = Math.max(s.fl.lvl[i], s.fl.hit[i]);
    if (v > 0) s.arrive[i] = APPROACH + STEP * (w.h - v);
  }
  s.impact = APPROACH + STEP * w.h + 4;
  s.end = s.impact + HOLD + RECEDE;
  ev(s, 'incoming', 0.5, 0.33, w.from === 'F' ? `파도 ${s.wi + 1} — 높이 ${w.h}!` : `옆 파도 ${s.wi + 1} — 높이 ${w.h}!`, '#e3f6ff');
}

function waveStep(s: SandState) {
  s.wt++;
  const f = s.fl!;
  if (s.wt < s.impact) {
    for (let i = 0; i < N; i++) {
      if (s.arrive[i] !== s.wt) continue;
      const x = ccx(i), y = ccy(i);
      s.wet[i] = 1;
      if (s.cas[i]) ev(s, 'chit', x, y, '앗 차가!', '#ffb3a8');
      else if ((s.K[i] === WALL || s.K[i] === ROCK) && f.over[i]) ev(s, 'over', x, y, '넘쳤다!', '#bfe9ff');
      else if (s.K[i] === WALL || s.K[i] === ROCK) ev(s, 'splash', x, y, s.K[i] === ROCK ? '탁!' : '철썩!', '#ffffff');
      else if (s.K[i] === MOAT) ev(s, 'moat', x, y);
      if (s.shell[i] && f.lvl[i] > 0) ev(s, 'shellgo', x, y, '조개가 둥실~', '#ffd6e8');
    }
  }
  if (s.wt === s.impact) {
    const B: Board = { K: s.K, Hh: s.Hh, shell: s.shell, hp: s.hp, sea: s.sea };
    const r = settle(B, s.cas, f);
    s.lastDmg = r.dmg;
    for (const i of r.crumble) ev(s, r.gone.includes(i) ? 'gone' : 'crumble', ccx(i), ccy(i) - 0.02, r.gone.includes(i) ? '와르르' : '-' + (f.over[i] ? 2 : 1), '#f3d9a4');
    if (r.crumble.length) see(s, 'erode', '모래벽이 깎였어요 — 깎인 자리로 다음 파도가 더 들어와요');
    s.lostThis += r.lost.length;
    r.dmg.forEach((d, k) => {
      const c = s.castles[k], x = ccx(c.cells[0]) + (c.cells.length > 1 ? CW / 2 : 0), y = ccy(c.cells[0]) - (c.prince ? 0.17 : 0.24);
      if (d > 0 && !k && s.stealT < 0) s.stealT = s.t;
      if (d > 0) (s.dmgThis += d), ev(s, s.hp[k] <= 0 ? 'fall' : 'dmg', x, y, s.hp[k] <= 0 ? '와르르르!' : `성이 깎였다 -${d}`, '#ffb3a8');
      else if (!k) ev(s, 'safe', x, y, s.wi === 0 && s.stage === 0 ? '막았다! 에헴!' : '끄떡없다!', '#fff1a8');
    });
  }
  if (s.wt >= s.end) {
    s.wi++;
    s.fl = null;
    if (s.hp.some((h) => h <= 0)) return endStage(s, false);
    if (s.wi >= s.waves.length) return endStage(s, true);
    if (s.waves[s.wi].rise) {
      const lost = tideUp({ K: s.K, Hh: s.Hh, shell: s.shell, hp: s.hp, sea: s.sea });
      s.sea++;
      s.lostThis += lost.length;
      ev(s, 'tide', 0.5, PY(s.sea), '🌙 밀물! 바다가 한 줄 올라왔어요', '#cfe8ff');
    }
    startWave(s);
  }
}

function endStage(s: SandState, ok: boolean) {
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  if (ok) {
    const kept = s.shell.reduce((a, b) => a + b, 0), left = s.pieces.length - s.pi;
    const st = 1 + (s.dmgThis === 0 ? 1 : 0) + (kept === s.shells0 ? 1 : 0);
    s.got = st;
    s.stars += st;
    s.keep = left;
    s.pts += 20 + st * 10 + kept * 5 + left * 3;
    const last = s.stage === STAGES.length - 1;
    if (last) (s.won = true), (s.pts += 30);
    ev(s, 'clear', 0.5, 0.36, `${s.stage + 1}번째 밀물 막았다! ${'★'.repeat(st)}${'☆'.repeat(3 - st)}`);
  } else {
    s.hearts--;
    ev(s, 'fail', 0.5, 0.36, s.hearts > 0 ? '성이 무너졌어요… 하트 -1 · 다시 짓기' : '성이 무너졌어요… 끝');
  }
}

export const sandcastle: GameDef<SandState> = {
  id: 'sandcastle',
  name: '밀물 모래성',
  genes: ['fortify', 'forecast', 'pointer'],
  twist: '하늘의 파도 예보판에 파도 높이·방향·순서가 뜨고, 파도는 여러 번 온다 — 부딪힌 모래벽은 파도마다 깎여서 깎인 자리로 다음 파도가 더 들어오니, 어디를 두껍게 쌓을지가 수가 된다',
  rules: ['빈 모래를 톡 = 다음 조각(모래벽·돌·해자). 다 놓거나 ▶를 누르면 파도가 와요.', '파도는 높이만큼 들어와요. 벽보다 높으면 넘고, 부딪힌 모래벽은 깎여요(돌은 안 깎임).', '꽃게 임금님 성이 버티면 별! 성이 안 깎이고 조개까지 지키면 별 셋.'],
  controls: 'touch',
  hint: '모래를 톡 = 조각 놓기 · ▶ 버티기 / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '밀물 바닷가 모래성 디오라마',
    mood: '햇살 가득한 바닷가 모래 한 덩이 — 젖은 모래는 짙고, 파도 거품이 하얗게 부서진다. 조개가 반짝이고 갈매기가 기웃거리며, 꽃게 임금님이 모래성 꼭대기에서 집게를 흔든다. 판이 지날수록 해가 기울어 노을과 등불.',
    palette: { bg: '#1f4a5c', ink: '#fffaf0', muted: '#9fc3cc', accent: '#ffd166', hot: '#ff6b5a', soft: '#f3dca4' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'build', pt: 0,
      K: new Uint8Array(N), Hh: new Int8Array(N), shell: new Uint8Array(N), nat: new Uint8Array(N), cas: new Int8Array(N), hp: [], castles: [], sea: 0,
      waves: [], wi: 0, wt: 0, fl: null, arrive: new Int16Array(N), impact: 0, end: 0, lastDmg: [],
      pieces: [], pi: 0, auto: 0, wet: new Float32Array(N), shells0: 0,
      hearts: 3, stars: 0, got: 0, pts: 0, ok: false, dmgThis: 0, lostThis: 0, keep: 0,
      down: false, taps: 0, seen: new Set<string>(), events: [], news: null, dead: false, won: false, crabs: [], lastPlace: -999, place: new Int16Array(N), peak: new Int8Array(N), stealT: -1,
    } as SandState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    s.pt++;
    s.events = s.events.filter((e) => s.t - e.t < 110);
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
    // 짓기: 다 놓으면 잠깐 뒤 파도
    if (s.auto > 0 && --s.auto === 0) return startWaves(s);
    if (!press || !p || s.auto > 0) return;
    const x = p.x, y = p.y * A;
    if (x >= BTN.x && x <= BTN.x + BTN.w && y >= BTN.y && y <= BTN.y + BTN.h) return startWaves(s);
    const i = cellAt(x, y), pc = s.pieces[s.pi];
    if (i < 0 || pc === undefined) return;
    if (!canPlace(s.K, s.Hh, s.shell, i, pc)) return void ev(s, 'nope', ccx(i), ccy(i), s.shell[i] ? '조개 자리예요' : s.K[i] === CASTLE ? '임금님 성이에요!' : '여긴 안 돼요', '#ffd6cc');
    const stack = s.K[i] === WALL;
    put(s, i, pc);
    s.place[i] = s.t;
    if (pc === PW) s.peak[i] = Math.max(s.peak[i], s.Hh[i]);
    s.lastPlace = s.t;
    s.pi++;
    s.taps++;
    ev(s, 'place', ccx(i), ccy(i), stack ? '더 높게!' : PIECE_NAME[pc], pc === PR ? '#d9dde3' : pc === PM ? '#9fe3ff' : '#ffe9b8');
    if (stack) see(s, 'stack', '모래벽 위에 또 쌓으면 더 높아져요');
    if (s.pi >= s.pieces.length) s.auto = AUTO;
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
/** 잘하는 봇이 내다보는 값: 이 판을 끝까지 돌려 본 점수(실패면 음수) + 성 둘레에 차오른 물(같은 점수끼리 가르는 길잡이) */
function judge(s: SandState, B0: Board, leftover: number) {
  const B: Board = { K: B0.K.slice(), Hh: B0.Hh.slice(), shell: B0.shell.slice(), hp: B0.hp.slice(), sea: B0.sea };
  let press = 0, dmg = 0, fail = false, lived = 0;
  for (let k = s.wi; k < s.waves.length; k++, lived++) {
    if (k > s.wi && s.waves[k].rise) tideUp(B);
    const f = flood(B.K, B.Hh, s.waves[k], B.sea);
    for (let i = 0; i < N; i++) if (NEAR.get(s)![i]) press += f.lvl[i] + f.hit[i] * 2;
    const r = settle(B, s.cas, f);
    for (const d of r.dmg) dmg += d;
    if (B.hp.some((h) => h <= 0)) {
      fail = true;
      break;
    }
  }
  const kept = B.shell.reduce((a, b) => a + b, 0);
  const st = 1 + (dmg === 0 ? 1 : 0) + (kept === s.shells0 ? 1 : 0);
  const pts = fail ? -400 + lived * 40 + B.hp.reduce((a, b) => a + b, 0) * 10 : 20 + st * 10 + kept * 5 + leftover * 3;
  return { pts, press };
}
const NEAR = new WeakMap<object, Uint8Array>();
function nearMask(s: SandState) {
  const m = new Uint8Array(N);
  for (const c of s.castles) for (const j of c.cells) for (let i = 0; i < N; i++) if (Math.abs(rowOf(i) - rowOf(j)) <= 1 && Math.abs(colOf(i) - colOf(j)) <= 1) m[i] = 1;
  for (let i = 0; i < N; i++) if (s.shell[i]) for (const n of NB[i]) m[n] = 1;
  NEAR.set(s, m);
}

/** 앞으로 놓을 조각을 차례로: 지금 조각(+다음 조각까지 두 수 앞)을 판 끝까지 돌려 보고 가장 좋은 자리. 몇 개까지 놓을지도 점수로 고른다 */
function plan(s: SandState): number[] {
  nearMask(s);
  const B = boardOf(s), seq: number[] = [];
  const total = s.pieces.length;
  let bestPts = judge(s, B, total - s.pi).pts, bestLen = 0;
  const val = (j: { pts: number; press: number }) => j.pts * 50 - j.press;
  for (let k = s.pi; k < total; k++) {
    const pc = s.pieces[k], nx = s.pieces[k + 1], left = total - k - 1;
    const cands: { i: number; v: number }[] = [];
    for (let i = s.sea * COLS; i < N; i++) {
      if (!canPlace(B.K, B.Hh, B.shell, i, pc)) continue;
      const K2 = B.K.slice(), H2 = B.Hh.slice();
      put({ K: K2, Hh: H2 }, i, pc);
      cands.push({ i, v: val(judge(s, { ...B, K: K2, Hh: H2 }, left)) });
    }
    if (!cands.length) break;
    cands.sort((a, b) => b.v - a.v);
    let pick = cands[0];
    if (nx !== undefined) {
      let bv = -Infinity;
      for (const c of cands.slice(0, 5)) {
        const K2 = B.K.slice(), H2 = B.Hh.slice();
        put({ K: K2, Hh: H2 }, c.i, pc);
        let b2 = c.v;
        for (let i = s.sea * COLS; i < N; i++) {
          if (!canPlace(K2, H2, B.shell, i, nx)) continue;
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
  // 아무리 놓아도 무너지면 있는 조각은 다 놓는다 (조금이라도 오래 버티게)
  return bestPts < 0 ? seq : seq.slice(0, bestLen);
}

const brain = new WeakMap<object, { key: string; base: number; seq: number[] }>();
const NO: Input = { tap: false, dir: 0, pointer: null };
const tapCell = (i: number): Input => ({ tap: false, dir: 0, pointer: { x: ccx(i), y: ccy(i) / A } });
const tapBtn: Input = { tap: false, dir: 0, pointer: { x: BTN.x + BTN.w / 2, y: (BTN.y + BTN.h / 2) / A } };

/** 봇: 판을 끝까지 돌려 보며 자리를 고른다 — 어디를 두껍게, 언제 멈출지(남긴 조각도 점수) */
export const sandcastleSmart: Bot<SandState> = {
  name: '모래성 박사',
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
export const sandcastleRandom: Bot<SandState> = {
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
/** 꽃게 (앞에서 본 모습). claws: 0 내림 ~ 1 번쩍 */
function drawCrab(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, t: number, mood: Mood, claws: number, opt: { crown?: boolean; look?: number; tilt?: number; col?: string } = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(opt.tilt ?? 0);
  const col = opt.col ?? '#ff6b45';
  // 그림자
  ctx.fillStyle = 'rgba(60,30,10,.25)';
  ctx.beginPath();
  ctx.ellipse(0, z * 0.05, z * 1.25, z * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  // 다리 셋씩 (사각사각)
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
  // 집게 팔
  const up = claws;
  for (const sd of [-1, 1]) {
    const ax = sd * z * (0.9 + 0.25 * up), ay = -z * (0.75 + 1.0 * up) + Math.sin(t * 0.2 + sd) * z * 0.06 * (mood === 'happy' ? 3 : 1);
    ctx.strokeStyle = mix(col, '#9a2a12', 0.25);
    ctx.lineWidth = Math.max(1.5, z * 0.22);
    ctx.beginPath();
    ctx.moveTo(sd * z * 0.7, -z * 0.55);
    ctx.quadraticCurveTo(sd * z * 1.15, -z * (0.6 + 0.4 * up), ax, ay);
    ctx.stroke();
    // 집게 (두 갈래)
    const open = 0.35 + 0.25 * Math.abs(Math.sin(t * (mood === 'happy' || mood === 'proud' ? 0.4 : 0.08) + sd));
    ctx.fillStyle = mix(col, '#ffffff', 0.08);
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(sd * (0.4 - up * 0.5));
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
  // 볼
  ctx.fillStyle = 'rgba(255,170,190,.7)';
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(sd * z * 0.55, -z * 0.38, z * 0.16, z * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
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
  // 왕관
  if (opt.crown) {
    ctx.fillStyle = '#ffd43b';
    ctx.strokeStyle = '#b07d0a';
    ctx.lineWidth = Math.max(0.8, z * 0.06);
    const cy = -z * 1.02, cw = z * 0.5;
    ctx.beginPath();
    ctx.moveTo(-cw, cy);
    ctx.lineTo(-cw, cy - z * 0.32);
    ctx.lineTo(-cw * 0.5, cy - z * 0.14);
    ctx.lineTo(0, cy - z * 0.42);
    ctx.lineTo(cw * 0.5, cy - z * 0.14);
    ctx.lineTo(cw, cy - z * 0.32);
    ctx.lineTo(cw, cy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ff4d6d';
    ctx.beginPath();
    ctx.arc(0, cy - z * 0.12, z * 0.08, 0, Math.PI * 2);
    ctx.fill();
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
  // 반짝
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

/** 갈매기 (옆모습). fly: 날갯짓, flag: 깃발을 물고 있나 */
function drawGull(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, t: number, fly: boolean, dir: number, flag: boolean, open = false) {
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
  // 머리
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(z * 0.7, -z * 0.35, z * 0.33, 0, Math.PI * 2);
  ctx.fill();
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
  if (flag) {
    ctx.strokeStyle = '#7a5230';
    ctx.lineWidth = Math.max(1, z * 0.1);
    ctx.beginPath();
    ctx.moveTo(z * 1.2, -z * 0.3);
    ctx.lineTo(z * 1.6, -z * 1.3);
    ctx.stroke();
    ctx.fillStyle = '#ff4d4d';
    ctx.beginPath();
    ctx.moveTo(z * 1.6, -z * 1.3);
    ctx.lineTo(z * 2.3 + Math.sin(t * 0.4) * z * 0.15, -z * 1.1);
    ctx.lineTo(z * 1.5, -z * 0.85);
    ctx.fill();
  }
  ctx.restore();
}

function drawAll(ctx: CanvasRenderingContext2D, s: SandState, w: number, h: number, th: Theme) {
  const fx = juice(s), X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w, t = s.t;
  const pal = SKY[Math.min(SKY.length - 1, s.stage)], dusk = Math.max(0, (s.stage - 4) / 3);
  const wave = s.phase === 'wave' ? s.waves[s.wi] : null, wt = s.wt, fl = s.fl;
  // 짓는 동안: 예보판의 파도를 하나씩 돌아가며 '지금 판이면 물이 어디까지 오나' 미리 보여 준다 (밀물이면 올라온 바다까지)
  const pv = s.phase === 'build' && s.waves.length ? Math.floor(s.pt / PREVIEW) % s.waves.length : -1;
  let pre: Flood | null = null;
  if (pv >= 0) {
    const sea = s.sea + s.waves.slice(1, pv + 1).filter((q) => q.rise).length, K2 = s.K.slice();
    for (let i = 0; i < sea * COLS; i++) K2[i] = SEA;
    pre = flood(K2, s.Hh, s.waves[pv], sea);
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
    fx.pop(Math.max(w * 0.14, Math.min(w * 0.86, x)), y, text, col, size);
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
  // 구름
  for (let k = 0; k < 4; k++) {
    const cx0 = ((k * 0.33 + t * 0.00006 * (1 + (k % 2))) % 1.4) - 0.2, cy0 = 0.115 + (k % 3) * 0.045;
    ctx.fillStyle = dusk > 0.4 ? 'rgba(255,200,190,.75)' : 'rgba(255,255,255,.85)';
    for (const [dx, dy, rr] of [[0, 0, 0.04], [0.04, 0.008, 0.03], [-0.04, 0.01, 0.028], [0.015, -0.015, 0.03]])
      (ctx.beginPath(), ctx.arc(X(cx0 + dx), Y(cy0 + dy), R(rr), 0, Math.PI * 2), ctx.fill());
  }
  // 먼 섬과 등대, 돛단배
  ctx.fillStyle = mix('#5d8f8a', '#2c3550', dusk);
  ctx.beginPath();
  ctx.moveTo(X(0.02), Y(HOR));
  ctx.quadraticCurveTo(X(0.09), Y(HOR - 0.045), X(0.2), Y(HOR));
  ctx.fill();
  ctx.fillStyle = '#f4f1ea';
  ctx.fillRect(X(0.105), Y(HOR - 0.06), R(0.012), R(0.025));
  ctx.fillStyle = '#e04a3a';
  ctx.fillRect(X(0.105), Y(HOR - 0.05), R(0.012), R(0.006));
  if (dusk > 0.4) {
    ctx.save();
    ctx.shadowColor = '#fff3a0';
    ctx.shadowBlur = R(0.03);
    ctx.fillStyle = '#fff3a0';
    ctx.beginPath();
    ctx.arc(X(0.111), Y(HOR - 0.064), R(0.007), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  {
    const bx = X(0.6 + 0.3 * Math.sin(t * 0.0015)), by = Y(HOR - 0.004);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(bx, by - R(0.04));
    ctx.lineTo(bx + R(0.025), by - R(0.006));
    ctx.lineTo(bx, by - R(0.006));
    ctx.fill();
    ctx.fillStyle = '#b5523b';
    ctx.fillRect(bx - R(0.018), by - R(0.006), R(0.045), R(0.008));
  }
  // ── 바다 ──
  const sea = ctx.createLinearGradient(0, Y(HOR), 0, Y(Y1 + 0.06));
  sea.addColorStop(0, pal[2]);
  sea.addColorStop(0.55, pal[3]);
  sea.addColorStop(1, mix(pal[3], '#bff3ea', 0.35));
  ctx.fillStyle = sea;
  ctx.fillRect(-10, Y(HOR), w + 20, Y(Y1 + 0.06 - HOR));
  // 햇빛 반짝 길
  for (let k = 0; k < 18; k++) {
    const p = s.stage / (STAGE_COUNT - 1), yy = HOR + 0.008 + hsh(k) * 0.17, xx = 0.18 + 0.64 * p + (hsh(k + 9) - 0.5) * 0.12 * (1 + (yy - HOR) * 6);
    ctx.fillStyle = `rgba(255,250,220,${0.25 + 0.5 * Math.abs(Math.sin(t / 18 + k))})`;
    ctx.fillRect(X(xx), Y(yy), R(0.02 + hsh(k + 3) * 0.02), 1.5);
  }
  // 물결 줄 (바다에서 바닷가로 밀려온다)
  ctx.lineWidth = 1.4;
  for (let k = 0; k < 8; k++) {
    const p = (k / 8 + t * 0.0016) % 1, yy = HOR + 0.01 + p * p * (Y0 - HOR + 0.02);
    ctx.strokeStyle = `rgba(255,255,255,${0.12 + 0.3 * p})`;
    ctx.beginPath();
    for (let x = -0.02; x <= 1.03; x += 0.03) ctx.lineTo(X(x), Y(yy + 0.004 * Math.sin(x * 18 + k + t * 0.03)));
    ctx.stroke();
  }
  // ── 다가오는 파도 머리 (예보한 높이만큼 크다) ──
  if (wave && wt < APPROACH + 10) {
    const a = Math.min(1, wt / APPROACH), hc = R(0.03 + 0.011 * wave.h) * (0.45 + 0.55 * a);
    ctx.save();
    ctx.globalAlpha = wt > APPROACH ? Math.max(0, 1 - (wt - APPROACH) / 10) : 1;
    if (wave.from === 'F') {
      const yy = Y(HOR + 0.02 + (PY(s.sea) + 0.01 - HOR - 0.02) * Math.pow(a, 1.5));
      const lip = (x: number) => yy - hc * (0.9 + 0.1 * Math.sin(x * 0.05 + t * 0.15));
      const g = ctx.createLinearGradient(0, yy - hc, 0, yy);
      g.addColorStop(0, '#c8fbff');
      g.addColorStop(0.35, '#3cc0e0');
      g.addColorStop(1, '#15719f');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-10, yy + 2);
      for (let x = -10; x <= w + 10; x += 6) ctx.lineTo(x, lip(x));
      ctx.lineTo(w + 10, yy + 2);
      ctx.fill();
      // 말리는 안쪽 그늘
      ctx.strokeStyle = 'rgba(10,70,110,.35)';
      ctx.lineWidth = hc * 0.16;
      ctx.beginPath();
      for (let x = -10; x <= w + 10; x += 6) ctx.lineTo(x, lip(x) + hc * 0.32);
      ctx.stroke();
      // 거품 갈기 + 물보라
      ctx.fillStyle = '#ffffff';
      for (let x = -10; x <= w + 10; x += R(0.022)) {
        ctx.beginPath();
        ctx.arc(x, lip(x) + hc * 0.05, hc * (0.1 + 0.05 * Math.sin(x * 0.3 + t * 0.4)), 0, Math.PI * 2);
        ctx.fill();
      }
      for (let k = 0; k < 24; k++) {
        const x = hsh(k) * w, up = ((t * 0.05 + hsh(k + 3)) % 1) * hc * 0.8;
        ctx.globalAlpha *= 0.9;
        ctx.beginPath();
        ctx.arc(x, lip(x) - up, R(0.003 + hsh(k + 7) * 0.003), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = wt > APPROACH ? Math.max(0, 1 - (wt - APPROACH) / 10) : 1;
      ctx.fillStyle = 'rgba(255,255,255,.8)';
      ctx.fillRect(-10, yy - 2, w + 20, 3);
    } else {
      const Lw = wave.from === 'L', edge = Lw ? X(PX(0, ROWS / 2)) : X(PX(COLS, ROWS / 2)), from = Lw ? -R(0.05) : w + R(0.05), sd = Lw ? 1 : -1;
      const xx = from + (edge - from) * Math.pow(a, 1.4), y0 = Y(PY(s.sea)) - R(0.02), y1 = Y(Y1 + 0.05);
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
        ctx.arc(lip(y), y, hc * (0.16 + 0.06 * Math.sin(y * 0.3 + t * 0.4)), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
  // ── 디오라마 받침: 모래 단면 · 양옆 물 단면 · 나무 받침 ──
  const DEP = 0.052, fl0 = PX(0, ROWS), fr0 = PX(COLS, ROWS);
  {
    // 그림자
    ctx.fillStyle = 'rgba(10,30,40,.35)';
    ctx.beginPath();
    ctx.ellipse(X(0.5), Y(Y1 + DEP + 0.03), R(0.52), R(0.025), 0, 0, Math.PI * 2);
    ctx.fill();
    // 양옆 물 단면
    const wg = ctx.createLinearGradient(0, Y(Y1), 0, Y(Y1 + DEP));
    wg.addColorStop(0, 'rgba(90,200,220,.9)');
    wg.addColorStop(1, 'rgba(25,90,140,.95)');
    ctx.fillStyle = wg;
    ctx.fillRect(X(0.01), Y(Y1), X(fl0 - 0.01), Y(DEP));
    ctx.fillRect(X(fr0), Y(Y1), X(0.99 - fr0), Y(DEP));
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    for (let k = 0; k < 8; k++) {
      const bx = k < 4 ? 0.015 + hsh(k) * (fl0 - 0.03) : fr0 + 0.01 + hsh(k) * (0.97 - fr0), by = Y1 + DEP - ((t * 0.0006 + hsh(k + 5)) % 1) * DEP;
      ctx.beginPath();
      ctx.arc(X(bx), Y(by), R(0.004), 0, Math.PI * 2);
      ctx.fill();
    }
    // 모래 단면 층
    const bands: [number, number, string][] = [[0, 0.014, '#ecc98a'], [0.014, 0.026, '#d6a866'], [0.026, 0.04, '#b9874f'], [0.04, DEP, '#8d6640']];
    for (const [a, b, col] of bands) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(X(fl0), Y(Y1 + b));
      for (let x = fl0; x <= fr0 + 0.001; x += 0.02) ctx.lineTo(X(x), Y(Y1 + a + (a ? 0.003 * Math.sin(x * 31 + a * 100) : 0)));
      ctx.lineTo(X(fr0), Y(Y1 + b));
      ctx.fill();
    }
    for (let k = 0; k < 26; k++) {
      ctx.fillStyle = k % 3 ? 'rgba(255,240,210,.35)' : 'rgba(90,60,30,.45)';
      ctx.beginPath();
      ctx.arc(X(fl0 + hsh(k * 3) * (fr0 - fl0)), Y(Y1 + 0.006 + hsh(k * 3 + 1) * (DEP - 0.01)), R(0.0025 + hsh(k) * 0.003), 0, Math.PI * 2);
      ctx.fill();
    }
    // 나무 받침
    const bg = ctx.createLinearGradient(0, Y(Y1 + DEP), 0, Y(Y1 + DEP + 0.016));
    bg.addColorStop(0, '#a8743f');
    bg.addColorStop(1, '#6e4724');
    ctx.fillStyle = bg;
    ctx.fillRect(X(0.005), Y(Y1 + DEP), X(0.99), Y(0.016));
  }
  // ── 모래 윗면 (칸마다: 마른 모래 · 젖은 모래 · 잠긴 바다) ──
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const i = r * COLS + c;
      if (s.K[i] === SEA) {
        ctx.fillStyle = mix(pal[3], '#9fe8ee', 0.2 + 0.1 * Math.sin(t * 0.05 + c));
        quad(c - 0.02, r - 0.02, c + 1.02, r + 1.02);
        ctx.fill();
        continue;
      }
      const shore = Math.max(0, 1 - (r - s.sea) * 0.5) * 0.5, wv = Math.max(s.wet[i], shore);
      const base = mix('#fbe8bd', '#f3dba8', hsh(i * 7 + s.stage) * 0.5 + (r / ROWS) * 0.3);
      ctx.fillStyle = mix(base, '#d0a66c', wv);
      quad(c - 0.01, r - 0.01, c + 1.01, r + 1.01);
      ctx.fill();
      if (s.wet[i] > 0.5) {
        ctx.fillStyle = `rgba(255,255,255,${(s.wet[i] - 0.5) * 0.25})`;
        quad(c + 0.1, r + 0.15, c + 0.6, r + 0.35);
        ctx.fill();
      }
    }
  // 바람에 생긴 모래 물결 무늬
  ctx.strokeStyle = 'rgba(170,120,60,.16)';
  ctx.lineWidth = 1.2;
  for (let r = s.sea; r < ROWS; r++)
    for (const f of [0.3, 0.72]) {
      ctx.beginPath();
      for (let c = 0; c <= COLS; c += 0.2) ctx.lineTo(X(PX(c, r + f)), Y(PY(r + f) + 0.006 * Math.sin(c * 2.3 + r * 1.7 + f * 9)));
      ctx.stroke();
    }
  // 모래알·작은 장식 (불가사리·조약돌·미역)
  for (let k = 0; k < 90; k++) {
    const c = hsh(k * 3 + 1) * COLS, r = s.sea + hsh(k * 3 + 2) * (ROWS - s.sea);
    ctx.fillStyle = k % 4 ? 'rgba(255,255,255,.4)' : 'rgba(150,100,50,.3)';
    ctx.fillRect(X(PX(c, r)), Y(PY(r)), 1.5, 1.5);
  }
  for (let k = 0; k < 7; k++) {
    const i = Math.floor(hsh(k * 13 + s.stage * 7) * N);
    if (s.K[i] !== SAND || s.shell[i] || rowOf(i) < s.sea || s.crabs.some((q) => q.home === i)) continue;
    const x = X(PX(colOf(i) + 0.25 + hsh(k) * 0.5, rowOf(i) + 0.5)), y = Y(PY(rowOf(i) + 0.3 + hsh(k + 1) * 0.5)), z = R(0.011);
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
  for (let c = 0; c <= COLS; c++) (ctx.beginPath(), ctx.moveTo(X(PX(c, s.sea)), Y(PY(s.sea))), ctx.lineTo(X(PX(c, ROWS)), Y(PY(ROWS))), ctx.stroke());
  for (let r = s.sea; r <= ROWS; r++) (ctx.beginPath(), ctx.moveTo(X(PX(0, r)), Y(PY(r))), ctx.lineTo(X(PX(COLS, r)), Y(PY(r))), ctx.stroke());
  // 바닷가 첫 줄 거품
  ctx.strokeStyle = 'rgba(255,255,255,.85)';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  for (let c = 0; c <= COLS; c += 0.25) ctx.lineTo(X(PX(c, s.sea)), Y(PY(s.sea) + 0.004 + 0.004 * Math.sin(c * 5 + t * 0.06)));
  ctx.stroke();
  // ── 해자 (모래를 판 물길) ──
  for (let i = 0; i < N; i++) {
    if (s.K[i] !== MOAT) continue;
    const c = colOf(i), r = rowOf(i);
    ctx.fillStyle = '#9c7444';
    quad(c + 0.06, r + 0.12, c + 0.94, r + 0.9);
    ctx.fill();
    ctx.fillStyle = '#5fb6cf';
    quad(c + 0.12, r + 0.3, c + 0.88, r + 0.86);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.75)';
    ctx.lineWidth = 1.5;
    const ox = ((t * 0.02) % 0.3) - 0.15, ym = PY(r + 0.58);
    for (const sd of [-1, 1]) {
      const xm = PX(c + 0.5 + sd * (0.18 + (sd > 0 ? ox : -ox) * 0.5), r + 0.58);
      ctx.beginPath();
      ctx.moveTo(X(xm - sd * 0.012), Y(ym - 0.012));
      ctx.lineTo(X(xm), Y(ym));
      ctx.lineTo(X(xm - sd * 0.012), Y(ym + 0.012));
      ctx.stroke();
    }
  }
  // ── 물: 짓는 동안은 첫 파도 미리 보기, 파도 때는 진짜 물 ──
  if (pre) {
    const on = (i: number) => pre.lvl[i] > 0;
    ctx.fillStyle = `rgba(70,175,245,${0.24 + 0.06 * Math.sin(t * 0.08)})`;
    for (let i = 0; i < N; i++) if (on(i)) (quad(colOf(i), rowOf(i), colOf(i) + 1, rowOf(i) + 1), ctx.fill());
    // 물이 닿는 끝선 (점선)
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.lineWidth = 2;
    ctx.setLineDash([R(0.012), R(0.01)]);
    ctx.lineDashOffset = -t * 0.3;
    for (let i = 0; i < N; i++) {
      if (!on(i)) continue;
      const c = colOf(i), r = rowOf(i);
      if (r === ROWS - 1 || !on(i + COLS)) (ctx.beginPath(), ctx.moveTo(X(PX(c, r + 1)), Y(PY(r + 1))), ctx.lineTo(X(PX(c + 1, r + 1)), Y(PY(r + 1))), ctx.stroke());
      if (c > 0 && !on(i - 1)) (ctx.beginPath(), ctx.moveTo(X(PX(c, r)), Y(PY(r))), ctx.lineTo(X(PX(c, r + 1)), Y(PY(r + 1))), ctx.stroke());
      if (c < COLS - 1 && !on(i + 1)) (ctx.beginPath(), ctx.moveTo(X(PX(c + 1, r)), Y(PY(r))), ctx.lineTo(X(PX(c + 1, r + 1)), Y(PY(r + 1))), ctx.stroke());
    }
    ctx.setLineDash([]);
    // 칸마다 물 높이 (한 칸에 1씩 낮아지는 게 보이게)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${R(0.036)}px system-ui, sans-serif`;
    ctx.lineWidth = 3;
    for (let i = 0; i < N; i++) {
      if (!on(i) || s.K[i] !== SAND || s.shell[i]) continue;
      ctx.strokeStyle = 'rgba(20,90,140,.55)';
      ctx.strokeText(String(pre.lvl[i]), X(ccx(i)), Y(ccy(i)));
      ctx.fillStyle = 'rgba(255,255,255,.92)';
      ctx.fillText(String(pre.lvl[i]), X(ccx(i)), Y(ccy(i)));
    }
  }
  if (wave && fl) {
    for (let i = 0; i < N; i++) {
      if (!wetNow(i)) continue;
      const c = colOf(i), r = rowOf(i), age = wt - s.arrive[i], a = Math.min(1, age / 7) * fade;
      const dl = Math.min(1, (fl.lvl[i] - 1) / 5);
      ctx.globalAlpha = a * 0.88;
      ctx.fillStyle = mix('#8ef0f5', '#1f8fd0', dl);
      quad(c - 0.02, r - 0.02, c + 1.02, r + 1.02);
      ctx.fill();
      ctx.globalAlpha = a * 0.5;
      ctx.fillStyle = '#ffffff';
      const sp = (t * 0.7 + i * 37) % 60;
      if (sp < 8) (ctx.beginPath(), ctx.arc(X(PX(c + 0.3 + hsh(i) * 0.4, r + 0.5)), Y(PY(r + 0.25 + hsh(i + 1) * 0.5)), R(0.004) * (1 - Math.abs(sp - 4) / 4) + 0.5, 0, Math.PI * 2), ctx.fill());
      ctx.globalAlpha = 1;
      ctx.strokeStyle = `rgba(255,255,255,${0.45 * a})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      const yy = PY(r + 0.3 + ((t * 0.01 + c * 0.2) % 0.5));
      ctx.moveTo(X(PX(c + 0.15, r + 0.5)), Y(yy));
      ctx.quadraticCurveTo(X(PX(c + 0.5, r + 0.5)), Y(yy - 0.008), X(PX(c + 0.85, r + 0.5)), Y(yy));
      ctx.stroke();
      // 물 끝 거품
      const edge = NB[i].filter((n) => !wetNow(n) && s.K[n] !== SEA);
      if (edge.length) {
        ctx.fillStyle = `rgba(255,255,255,${0.85 * a})`;
        for (const n of edge) {
          const dc = colOf(n) - c, dr = rowOf(n) - r;
          for (let k = 0; k < 4; k++) {
            const u = (k + 0.5) / 4, fc = dc ? c + (dc > 0 ? 1 : 0) : c + u, frr = dr ? r + (dr > 0 ? 1 : 0) : r + u;
            ctx.beginPath();
            ctx.arc(X(PX(fc, frr)), Y(PY(frr)), R(0.006 + 0.004 * Math.sin(t * 0.2 + k + i)) * (age < 12 ? 1.6 : 1), 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
  }
  // ── 세워진 것들 (뒤 줄부터 앞 줄로) ──
  const kingMood = (): { mood: Mood; claws: number } => {
    if (s.phase === 'result') return s.ok ? { mood: 'happy', claws: 1 } : { mood: 'dizzy', claws: 0.6 };
    if (wave && fl) {
      const hitMe = s.castles[0].cells.some((i) => fl.hit[i] > 0);
      if (wt < s.impact - 4) return hitMe ? { mood: 'strain', claws: 0.8 } : wt < APPROACH ? { mood: 'wow', claws: 0.5 } : { mood: 'calm', claws: 0.3 };
      return s.lastDmg[0] > 0 ? { mood: 'dizzy', claws: 0.2 } : { mood: 'proud', claws: 1 };
    }
    if (s.pt > 900 && s.taps === 0) return { mood: 'sleep', claws: 0 };
    return { mood: t - s.lastPlace < 40 ? 'wow' : 'calm', claws: t - s.lastPlace < 40 ? 0.6 : 0.15 };
  };
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const i = r * COLS + c, k = s.K[i], age = t - s.place[i], drop = age < 10 ? Math.pow(1 - age / 10, 2) * 4 : 0;
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
        // 다진 모래 결
        ctx.strokeStyle = 'rgba(150,100,50,.3)';
        ctx.lineWidth = 1;
        for (let z = 1; z < hh; z++) (ctx.beginPath(), ctx.moveTo(X(PX(c + 0.07, r + 0.9)), Y(PY(r + 0.9, z))), ctx.lineTo(X(PX(c + 0.93, r + 0.9)), Y(PY(r + 0.9, z))), ctx.stroke());
        // 성가퀴(뾰족 톱니) — 깎이면 이가 빠진다
        const teeth = 3;
        for (let q = 0; q < teeth; q++) {
          if (q < lost) continue;
          const c0 = c + 0.12 + q * 0.29;
          box(c0, r + 0.6, c0 + 0.18, r + 0.86, hh + 0.7, mix('#fae3ae', '#d5ad70', wetk), mix('#e6bd7c', '#b08850', wetk), mix('#d4a464', '#9c7444', wetk));
        }
        if (lost > 0) {
          ctx.fillStyle = 'rgba(120,80,40,.35)';
          for (let q = 0; q < Math.min(4, lost + 1); q++) (ctx.beginPath(), ctx.arc(X(PX(c + 0.2 + q * 0.2, r + 0.9)), Y(PY(r + 0.9, hh * 0.5 + (q % 2))), R(0.005), 0, Math.PI * 2), ctx.fill());
        }
        if (hh >= 5) {
          ctx.fillStyle = '#ffffff';
          ctx.font = `800 ${R(0.036)}px system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.lineWidth = 3;
          ctx.strokeStyle = 'rgba(90,55,20,.7)';
          ctx.strokeText(String(hh), X(PX(c + 0.5, r + 0.5)), Y(PY(r + 0.5, hh + 1)));
          ctx.fillText(String(hh), X(PX(c + 0.5, r + 0.5)), Y(PY(r + 0.5, hh + 1)));
        }
        // 넘친 물이 벽 위로
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
      } else if (k === CASTLE && s.castles[s.cas[i] - 1].cells[0] === i) {
        const ci = s.cas[i] - 1, cs = s.castles[ci], wide = cs.cells.length, hp = s.hp[ci], fail = s.phase === 'result' && !s.ok;
        const hitc = wave && fl && cs.cells.some((j) => fl.hit[j] > 0 && wt >= s.arrive[j]) && wt < s.impact + HOLD;
        ctx.save();
        ctx.translate(hitc ? Math.sin(t * 1.3) * 1.5 : 0, 0);
        const wc = hitc ? 0.6 : Math.max(...cs.cells.map((j) => s.wet[j])) * 0.5;
        const sand = (a: string, b: string, k2 = 1) => mix(a, b, wc * k2);
        const baseZ = hp > 0 ? 3 : 1.4;
        box(c + 0.04, r + 0.1, c + wide - 0.04, r + 0.96, baseZ, sand('#fbe3ae', '#c99c5e', 0.6), sand('#e4b470', '#a87f4c'), sand('#c9965a', '#94693e'));
        // 앞 성가퀴
        if (hp > 0)
          for (let q = 0; q < wide * 3; q++) {
            const u0 = c + 0.08 + q * ((wide - 0.16) / (wide * 3)), u1 = u0 + ((wide - 0.16) / (wide * 3)) * 0.55;
            box(u0, r + 0.78, u1, r + 0.95, baseZ + 0.8, sand('#fde9b8', '#c99c5e', 0.6), sand('#e8ba78', '#a87f4c'), sand('#d0a062', '#94693e'));
          }
        // 문 (아치)
        {
          const dx = X(PX(c + wide / 2, r + 0.96)), dyb = Y(PY(r + 0.96)), dw = R(0.014 * wide + 0.006);
          ctx.fillStyle = '#6e4a28';
          ctx.beginPath();
          ctx.moveTo(dx - dw, dyb);
          ctx.lineTo(dx - dw, dyb - R(0.016));
          ctx.arc(dx, dyb - R(0.016), dw, Math.PI, 0);
          ctx.lineTo(dx + dw, dyb);
          ctx.fill();
        }
        // 탑 (양동이로 찍은 모양 — 위가 살짝 좁다). 체력만큼 서 있다
        const tower = (u: number, rv: number, rad: number, z1: number, alive: boolean) => {
          const z0 = baseZ, zt = alive ? z1 : z0 + 1.3, x = X(PX(c + u, r + rv)), yb = Y(PY(r + rv, z0)), yt = Y(PY(r + rv, zt)), rb = R(rad), rt = rb * 0.84;
          const g = ctx.createLinearGradient(x - rb, 0, x + rb, 0);
          g.addColorStop(0, sand('#fde7b4', '#c99c5e', 0.6));
          g.addColorStop(0.55, sand('#eabd7a', '#b08850'));
          g.addColorStop(1, sand('#c48f52', '#8f653b'));
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(x - rb, yb);
          ctx.lineTo(x - rt, yt);
          ctx.lineTo(x + rt, yt);
          ctx.lineTo(x + rb, yb);
          ctx.ellipse(x, yb, rb, rb * 0.33, 0, 0, Math.PI);
          ctx.fill();
          ctx.strokeStyle = 'rgba(140,90,40,.35)';
          ctx.lineWidth = 1;
          for (let q = 1; q < 4; q++) {
            const yy = yt + ((yb - yt) * q) / 4, rr = rt + ((rb - rt) * q) / 4;
            ctx.beginPath();
            ctx.ellipse(x, yy, rr, rr * 0.3, 0, 0.1, Math.PI - 0.1);
            ctx.stroke();
          }
          ctx.fillStyle = sand('#fff0c8', '#c99c5e', 0.5);
          ctx.beginPath();
          ctx.ellipse(x, yt, rt, rt * 0.33, 0, 0, Math.PI * 2);
          ctx.fill();
          if (alive) {
            ctx.fillStyle = '#5e3f22';
            ctx.beginPath();
            const wy = yt + (yb - yt) * 0.38, ww = rb * 0.26;
            ctx.moveTo(x - ww, wy + R(0.014));
            ctx.lineTo(x - ww, wy);
            ctx.arc(x, wy, ww, Math.PI, 0);
            ctx.lineTo(x + ww, wy + R(0.014));
            ctx.fill();
            ctx.fillStyle = sand('#f2cf8c', '#c09358');
            for (let q = 0; q < 4; q++) {
              const ax = x - rt + (q + 0.5) * ((rt * 2) / 4);
              ctx.fillRect(ax - rt * 0.17, yt - R(0.014), rt * 0.34, R(0.016));
            }
          } else {
            ctx.fillStyle = sand('#dcae6c', '#a87f4c');
            ctx.beginPath();
            ctx.moveTo(x - rt, yt + R(0.006));
            for (let q = 0; q <= 6; q++) ctx.lineTo(x - rt + (q / 6) * rt * 2, yt - (q % 2 ? R(0.01) : -R(0.002)));
            ctx.lineTo(x + rt, yt + R(0.008));
            ctx.fill();
            // 무너진 모래 더미
            ctx.fillStyle = sand('#e6b878', '#a87f4c');
            ctx.beginPath();
            ctx.ellipse(x + rb * 0.4, yb + R(0.006), rb * 0.9, rb * 0.35, 0, Math.PI, 0);
            ctx.fill();
          }
          return { x, yt, rt };
        };
        let top = { x: X(PX(c + wide / 2, r + 0.5)), yt: Y(PY(r + 0.5, baseZ)), rt: R(0.03) };
        if (wide > 1) {
          top = tower(wide / 2, 0.42, 0.048, 10, hp >= 1);
          tower(0.3, 0.6, 0.036, 6.8, hp >= 2);
          tower(wide - 0.3, 0.6, 0.036, 6.8, hp >= 3);
        } else top = tower(0.5, 0.5, 0.036, 7.5, hp >= cs.max);
        // 깃발 (깎이면 갈매기가 채 간다) — 임금님 뒤에
        const stolen = ci === 0 ? s.stealT >= 0 : hp < cs.max;
        if (hp > 0 && !stolen) {
          const fx0 = top.x + top.rt * 0.55, fy0 = top.yt - R(0.004);
          ctx.strokeStyle = '#7a5230';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(fx0, fy0);
          ctx.lineTo(fx0, fy0 - R(0.085));
          ctx.stroke();
          ctx.fillStyle = ci === 0 ? '#ff4d4d' : '#4dabf7';
          ctx.beginPath();
          ctx.moveTo(fx0, fy0 - R(0.085));
          ctx.quadraticCurveTo(fx0 + R(0.025), fy0 - R(0.085) + Math.sin(t * 0.25) * R(0.005), fx0 + R(0.05), fy0 - R(0.075) + Math.sin(t * 0.25 + 1) * R(0.006));
          ctx.lineTo(fx0, fy0 - R(0.058));
          ctx.fill();
        }
        // 임금님 (실패하면 조개 서핑으로 퇴장)
        const km = kingMood(), kz = R(ci === 0 ? 0.037 : 0.025);
        if (fail && hp <= 0) {
          const q = Math.min(1, s.pt / 110), sx0 = PX(c + wide / 2, r + 0.5), sx1 = c + wide / 2 < COLS / 2 ? 0.04 : 0.96, kx = X(sx0 + (sx1 - sx0) * q), ky = Y(PY(r + 0.5)) - Math.abs(Math.sin(q * 9)) * R(0.03) - q * R(0.05);
          drawShell(ctx, kx, ky + kz * 0.2, kz * 1.3, t, '#ffd1dc');
          drawCrab(ctx, kx, ky - kz * 0.1, kz, t, 'wow', 1, { crown: true, tilt: Math.sin(t * 0.2) * 0.35 });
          ctx.fillStyle = '#ffffff';
          ctx.font = `900 ${R(0.04)}px system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(ci === 0 ? '으아아~' : '형님~!', kx, ky - kz * 2.6);
        } else if (hp > 0) {
          const mood = ci === 0 ? km : fail ? { mood: 'dizzy' as Mood, claws: 0.3 } : km;
          const bob = mood.mood === 'happy' ? Math.abs(Math.sin(t * 0.25)) * R(0.012) : Math.sin(t * 0.05) * R(0.002);
          const kx = top.x, ky = top.yt + top.rt * 0.15 - bob;
          const look = s.lastPlace > 0 && t - s.lastPlace < 60 ? Math.sign(ccx(s.place.indexOf(s.lastPlace)) - PX(c + wide / 2, r)) : Math.sin(t * 0.02);
          drawCrab(ctx, kx, ky, kz, t, mood.mood, mood.claws, { crown: true, look });
          if (mood.mood === 'dizzy') {
            ctx.fillStyle = '#ffe066';
            ctx.font = `${R(0.03)}px system-ui, sans-serif`;
            ctx.textAlign = 'center';
            for (let q = 0; q < 3; q++) ctx.fillText('★', kx + Math.cos(t * 0.15 + q * 2.1) * kz * 1.2, ky - kz * 2 + Math.sin(t * 0.15 + q * 2.1) * kz * 0.35);
          }
          if (mood.mood === 'sleep') {
            ctx.fillStyle = '#ffffff';
            ctx.font = `800 ${R(0.036)}px system-ui, sans-serif`;
            ctx.fillText('z', kx + kz * 1.2 + ((t / 25) % 1) * kz, ky - kz * 2 - ((t / 25) % 1) * kz);
          }
        }
        ctx.restore();
      }
      // 조개
      if (s.shell[i]) drawShell(ctx, X(ccx(i)), Y(ccy(i) + 0.012), R(0.02), t);
    }
  // 떠내려가는 조개 (방금 젖은 것)
  if (wave && fl)
    for (const e of s.events)
      if (e.kind === 'shellgo' && t - e.t < 90) {
        const q = (t - e.t) / 90;
        drawShell(ctx, X(e.x + Math.sin(q * 8) * 0.02), Y(e.y - q * (e.y - Y0)), R(0.02), t);
      }
  // ── 꽃게 백성 (물이 닿으면 조개 서핑으로 '야호~') ──
  for (const cb of s.crabs) {
    const i = cb.home, hx = ccx(i), hy = ccy(i) + 0.015;
    let x = hx + Math.sin((t + cb.off) * 0.025) * CW * 0.28, y = hy, mood: Mood = 'calm', claws = 0.2, surf = 0;
    if (wave && fl && fl.lvl[i] > 0 && wt >= s.arrive[i]) {
      surf = Math.min(1, (wt - s.arrive[i]) / 50);
      const q = Math.min(1, (wt - s.arrive[i]) / (s.end - s.arrive[i]));
      x = hx + Math.sin(q * 7 + cb.off) * 0.05;
      y = hy - Math.sin(q * Math.PI) * 0.09;
      mood = 'happy';
      claws = 1;
    } else if (wave && wt < s.impact) (mood = 'wow'), (claws = 0.7);
    else if (s.phase === 'result') (mood = s.ok ? 'happy' : 'dizzy'), (claws = s.ok ? 1 : 0.3), (y -= s.ok ? Math.abs(Math.sin(t * 0.3 + cb.off)) * 0.012 : 0);
    if (surf > 0) drawShell(ctx, X(x), Y(y) + R(0.004), R(0.02), t, '#fff0b3');
    drawCrab(ctx, X(x), Y(y), R(0.021), t + cb.off, mood, claws, { col: '#ff8a5c', tilt: surf ? Math.sin(t * 0.3) * 0.3 : 0 });
    if (wave && wt < APPROACH && wt > 6) {
      ctx.fillStyle = '#ffffff';
      ctx.font = `900 ${R(0.036)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('!', X(x), Y(y) - R(0.05));
    }
  }
  // ── 갈매기: 말뚝 위에서 구경 → 성이 깎이면 깃발을 낚아챈다 ──
  {
    const px = X(0.955), py = Y(Y0 + 0.11);
    ctx.fillStyle = '#7b5232';
    ctx.fillRect(px - R(0.008), py, R(0.016), Y(0.07));
    ctx.fillStyle = '#9a6a42';
    ctx.beginPath();
    ctx.ellipse(px, py, R(0.008), R(0.003), 0, 0, Math.PI * 2);
    ctx.fill();
    const c0 = s.castles[0], fx0 = X(PX(colOf(c0.cells[0]) + c0.cells.length / 2, rowOf(c0.cells[0]) + 0.55)), fy0 = Y(PY(rowOf(c0.cells[0]) + 0.55, 8.2)) - R(0.04);
    const st = s.stealT >= 0 ? t - s.stealT : -1, gz = R(0.022);
    if (st >= 0 && st < 90) {
      let gx: number, gy: number;
      if (st < 30) (gx = px + (fx0 - px) * (st / 30)), (gy = py - R(0.02) + (fy0 - py) * (st / 30) - Math.sin((st / 30) * Math.PI) * R(0.08));
      else (gx = fx0 + (st - 30) * R(0.006)), (gy = fy0 - (st - 30) * R(0.004));
      drawGull(ctx, gx, gy, gz, t, true, st < 30 ? -1 : 1, st >= 30);
      if (st >= 30 && st < 70) {
        ctx.fillStyle = '#ffffff';
        ctx.font = `900 ${R(0.038)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('깃발 득템~', gx, gy - R(0.045));
      }
    } else {
      const squawk = s.events.some((e) => (e.kind === 'splash' || e.kind === 'safe') && t - e.t < 25);
      drawGull(ctx, px, py - gz * 0.85, gz, t, false, -1, st >= 90, squawk);
      if (squawk) {
        ctx.fillStyle = '#ffffff';
        ctx.font = `900 ${R(0.036)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('깍!', px - R(0.03), py - R(0.06));
      }
    }
  }
  // 첫 판 첫 손짓: 성 앞을 가리키는 손가락
  if (s.stage === 0 && s.phase === 'build' && s.pi === 0 && t > 15) {
    const tc = s.castles[0].cells[0] - COLS, bob = Math.abs(Math.sin(t * 0.12)) * R(0.02);
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    quad(colOf(tc), rowOf(tc), colOf(tc) + 1, rowOf(tc) + 1);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `${R(0.07)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('👆', X(ccx(tc)) + R(0.01), Y(ccy(tc)) + R(0.04) + bob);
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
    if (e.kind === 'moat') fx.burst(x, y, '#9fe3ff', 8, 2, 2), fx.ring(x, y, '#9fe3ff', R(0.05), 2);
    if (e.kind === 'chit') fx.burst(x, y - R(0.04), '#9fe3ff', 26, 4.5, 3), fx.kick(6), say(x, y - R(0.12), e.text!, e.col!, 16);
    if (e.kind === 'crumble') fx.burst(x, y, '#e2b878', 8, 2.2, 2.2), say(x, y - R(0.02), e.text!, '#ffe3b0', 12);
    if (e.kind === 'gone') fx.burst(x, y, '#d9ab6a', 26, 3.6, 3), fx.kick(4), say(x, y - R(0.02), e.text!, '#ffe3b0', 14);
    if (e.kind === 'safe') fx.burst(x, y - R(0.03), '#ffe066', 22, 4, 2.6), fx.ring(x, y - R(0.03), '#ffe066', R(0.1), 4), say(x, y - R(0.08), e.text!, e.col!, 17);
    if (e.kind === 'dmg') fx.burst(x, y, '#d9ab6a', 30, 4.6, 3), fx.kick(7), fx.blink('#ffd2b0', 0.15), say(x, y - R(0.07), e.text!, e.col!, 16);
    if (e.kind === 'fall') fx.burst(x, y, '#d9ab6a', 60, 6, 3.4), fx.kick(12), fx.blink(th.hot, 0.25), say(x, y - R(0.07), e.text!, e.col!, 20);
    if (e.kind === 'shellgo') say(x, y - R(0.04), e.text!, e.col!, 13);
    if (e.kind === 'tide') fx.blink('#bfe6ff', 0.2), fx.kick(3), say(w / 2, y - R(0.03), e.text!, e.col!, 15);
    if (e.kind === 'incoming') fx.kick(2), say(w / 2, Y(0.42), e.text!, e.col!, 18);
    if (e.kind === 'clear') fx.burst(w * 0.3, y, '#ffe066', 40, 6, 3.2), fx.burst(w * 0.7, y, '#ff8fb1', 40, 6, 3.2), fx.ring(w / 2, y, '#ffe066', R(0.4), 7), fx.blink('#fff6c8', 0.25);
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
  ctx.fillText(`🏖️ ${s.stage + 1}번째 밀물`, R(0.03), hb * 0.5);
  font(0.034, 800);
  ctx.fillStyle = th.muted;
  ctx.fillText(` / ${STAGE_COUNT}`, R(0.03) + ctx.measureText(`🏖️ ${s.stage + 1}번째 밀물`).width * (0.045 / 0.034) * 0.98, hb * 0.55);
  ctx.textAlign = 'right';
  font(0.042, 900);
  ctx.fillStyle = '#ffd166';
  const stt = `★ ${s.stars}`;
  ctx.fillText(stt, w - R(0.03), hb * 0.5);
  ctx.fillStyle = th.hot;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - R(0.05) - ctx.measureText(stt).width, hb * 0.5);
  // ── 파도 예보판 ──
  {
    const n = s.waves.length, py0 = 0.09, ph = 0.13, gap = 0.014, cw = Math.min(0.165, (0.9 - gap * (n - 1)) / n), x0 = 0.5 - (cw * n + gap * (n - 1)) / 2;
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
    ctx.fillText('🌊 파도 예보', X(0.045), Y(py0 + 0.02));
    ctx.textAlign = 'right';
    font(0.036, 700);
    ctx.fillStyle = '#4f7f90';
    ctx.fillText('높이 = 물이 들어오는 칸 수', X(0.955), Y(py0 + 0.02));
    for (let k = 0; k < n; k++) {
      const wv = s.waves[k], cx0 = x0 + k * (cw + gap), cy0 = py0 + 0.037, ch = 0.085;
      const cur = s.phase === 'wave' && k === s.wi, done = (s.phase === 'wave' && k < s.wi) || (s.phase === 'result');
      const next = k === pv;
      ctx.save();
      if (cur) {
        ctx.shadowColor = '#7fdcff';
        ctx.shadowBlur = R(0.03);
      }
      const g = ctx.createLinearGradient(0, Y(cy0), 0, Y(cy0 + ch));
      g.addColorStop(0, cur ? '#5fd0ff' : '#8fd8ef');
      g.addColorStop(1, cur ? '#1c8fc4' : '#3aa2c8');
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
      // 방향 화살표 + 높이
      const mx = X(cx0 + cw / 2), my = Y(cy0 + ch * 0.55);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = 'rgba(10,60,90,.55)';
      ctx.lineWidth = 3;
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
      const L = R(Math.min(0.05, cw * 0.36));
      if (wv.from === 'F') arrow(X(cx0 + cw * 0.25), my, 0, 1, L);
      else arrow(X(cx0 + cw * 0.25), my, wv.from === 'L' ? 1 : -1, 0, L);
      font(0.056, 900);
      ctx.textAlign = 'center';
      ctx.strokeText(String(wv.h), X(cx0 + cw * 0.66), my + R(0.002));
      ctx.fillStyle = '#ffffff';
      ctx.fillText(String(wv.h), X(cx0 + cw * 0.66), my + R(0.002));
      font(0.03, 800);
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      ctx.fillText(`${k + 1}`, X(cx0 + 0.016), Y(cy0 + 0.016));
      if (wv.rise) {
        ctx.fillStyle = '#ffffff';
        font(0.03, 800);
        ctx.fillText('🌙', X(cx0 + cw - 0.018), Y(cy0 + 0.018));
      }
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
  if (s.news && s.t - s.news.t < 220) {
    const age = s.t - s.news.t, a = Math.min(1, age / 10, (220 - age) / 20), drop = Math.max(0, 10 - age) * 2;
    ctx.globalAlpha = a;
    font(0.036, 900);
    ctx.textAlign = 'center';
    const tx = `✨ ${s.news.text}`, tw2 = Math.min(w - 12, ctx.measureText(tx).width + 22), by2 = Y(0.252) - drop;
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
  // 판 카드: 시작 · 막았다 · 무너졌다
  {
    let head = '', sub = '', col = '#ffffff', age = 0, a = 1;
    if (s.phase === 'result') {
      age = s.pt;
      if (s.ok) {
        head = s.won ? '바닷가를 다 지켰다! 🦀👑' : `막았다! ${'★'.repeat(s.got)}${'☆'.repeat(3 - s.got)}`;
        sub = `${s.dmgThis ? '성이 조금 깎임' : '성 무사 ✓'}${s.shells0 ? ` · 조개 ${s.shell.reduce((q, b) => q + b, 0)}/${s.shells0}` : ''}${s.keep ? ` · 남긴 조각 ${s.keep}` : ''}`;
        col = '#ffd166';
      } else (head = '와르르… 성이 무너졌어요'), (sub = s.hearts > 0 ? `하트 -1 · 같은 바닷가 처음부터 다시` : '끝 — 잘 버텼어요!'), (col = '#ffb3a8');
    } else if (s.phase === 'build' && s.pt < 140) {
      age = s.pt;
      a = Math.min(1, (140 - s.pt) / 20);
      head = `${s.stage + 1}번째 밀물`;
      sub = `파도 ${s.waves.length}번 · 조각 ${s.pieces.length}개${s.castles.length > 1 ? ' · 성 둘!' : ''}`;
    }
    if (head) {
      const sc = Math.min(1, 0.6 + age / 12), cyy = Y(0.37);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(w / 2, cyy);
      ctx.scale(sc, sc);
      ctx.fillStyle = 'rgba(16,52,66,.88)';
      ctx.beginPath();
      ctx.roundRect(-R(0.4), -R(0.06), R(0.8), R(0.12), R(0.04));
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = col;
      font(0.05, 900);
      ctx.fillText(head, 0, -R(0.02), R(0.76));
      ctx.fillStyle = '#fffaf0';
      font(0.036, 800);
      ctx.fillText(sub, 0, R(0.033), R(0.76));
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
        for (let q = 0; q < 3; q++) {
          ctx.fillStyle = '#e6bd7c';
          ctx.fillRect(mx - z + q * z * 0.75, my - z * 0.85, z * 0.5, z * 0.38);
        }
      } else if (pc === PR) {
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
      } else {
        ctx.fillStyle = '#9c7444';
        ctx.beginPath();
        ctx.roundRect(mx - z, my - z * 0.45, z * 2, z * 0.9, z * 0.3);
        ctx.fill();
        ctx.fillStyle = '#5fb6cf';
        ctx.beginPath();
        ctx.roundRect(mx - z * 0.85, my - z * 0.25, z * 1.7, z * 0.6, z * 0.25);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.6;
        for (const sd of [-1, 1]) (ctx.beginPath(), ctx.moveTo(mx + sd * z * 0.35, my - z * 0.12), ctx.lineTo(mx + sd * z * 0.6, my + z * 0.05), ctx.lineTo(mx + sd * z * 0.35, my + z * 0.22), ctx.stroke());
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
      if (s.pi < s.pieces.length) ctx.fillText('놓을 조각', X(0.035), Y(ty + 0.022)), ctx.fillText('다음', X(0.3), Y(ty + 0.022));
      if (s.pi < s.pieces.length) {
        tile(0.03, ty + 0.04, 0.24, 0.11, s.pieces[s.pi], true);
        tile(0.3, ty + 0.055, 0.14, 0.085, s.pieces[s.pi + 1], false);
        tile(0.46, ty + 0.055, 0.14, 0.085, s.pieces[s.pi + 2], false);
      } else {
        ctx.fillStyle = '#ffffff';
        font(0.044, 900);
        ctx.textAlign = 'left';
        ctx.fillText('다 놓았어요! 🌊', X(0.04), Y(ty + 0.095));
      }
      ctx.fillStyle = '#ffe9c4';
      font(0.036, 800);
      ctx.textAlign = 'left';
      const more = s.pieces.length - s.pi - 3;
      if (more > 0) ctx.fillText(`+${more}`, X(0.555), Y(ty + 0.022));
      // ▶ 버티기
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
      font(0.03, 800);
      ctx.fillText(`남기면 +3점씩`, X(BTN.x + BTN.w / 2), Y(BTN.y + BTN.h * 0.8));
    } else {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffe9c4';
      font(0.042, 900);
      const msg = s.phase === 'wave' ? `파도 ${s.wi + 1}/${s.waves.length} — 버텨라!` : s.ok ? '막았다! 꽃게들이 춤춰요' : '다시 지어 봐요';
      ctx.fillText(msg, X(0.04), Y(ty + 0.045));
      // 성 체력
      s.castles.forEach((cs, k) => {
        font(0.036, 800);
        ctx.fillStyle = '#ffe9c4';
        const lx = X(0.04 + k * 0.48), ly = Y(ty + 0.11);
        ctx.fillText(cs.prince ? '왕자님 성' : '임금님 성', lx, ly);
        const tw0 = ctx.measureText(cs.prince ? '왕자님 성' : '임금님 성').width;
        for (let q = 0; q < cs.max; q++) {
          ctx.fillStyle = q < s.hp[k] ? '#f7d58e' : 'rgba(255,255,255,.18)';
          ctx.beginPath();
          ctx.roundRect(lx + tw0 + R(0.015) + q * R(0.045), ly - R(0.018), R(0.035), R(0.036), R(0.006));
          ctx.fill();
        }
      });
    }
    // 안내 한 줄
    let hint = '';
    if (s.phase === 'build') {
      const pc = s.pieces[s.pi];
      if (s.stage === 0 && s.pi === 0) hint = '👆 모래를 톡! 성 앞에 모래벽을 쌓아요';
      else if (pc === PW) hint = '모래벽: 높이 3 · 맞으면 깎여요 (벽에 또 쌓으면 +2)';
      else if (pc === PR) hint = '돌: 높이 4 · 절대 안 깎여요';
      else if (pc === PM) hint = '해자: 물이 안쪽으로 못 가고 옆으로 흘러요';
      else hint = '파도가 곧 와요!';
    } else if (s.phase === 'wave' && wave) hint = `${wave.from === 'F' ? '바다' : wave.from === 'L' ? '왼쪽' : '오른쪽'}에서 높이 ${wave.h} — 한 칸에 1씩 낮아져요`;
    else if (s.phase === 'result') hint = s.ok ? `별 ${s.got}개! 다음 밀물은 더 세요` : '깎인 자리를 두껍게 쌓아 봐요';
    ctx.textAlign = 'center';
    ctx.fillStyle = s.stage === 0 && s.pi === 0 && s.phase === 'build' ? '#ffffff' : '#ffe9c4';
    font(s.stage === 0 && s.pi === 0 && s.phase === 'build' ? 0.044 : 0.038, 900);
    ctx.fillText(hint, w / 2, Y(ty + 0.19), w - R(0.06));
    ctx.fillStyle = 'rgba(255,233,196,.6)';
    font(0.034, 700);
    ctx.fillText(`점수 ${s.pts}`, w / 2, Y(ty + 0.24));
  }
}
