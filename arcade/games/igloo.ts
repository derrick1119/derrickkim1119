/**
 * 눈보라 이글루 (22라운드, 밀물 모래성의 결 — '같은 놀이, 다른 세계') — 지어서 버티기 × 재난 예보 × 가리키기(톡).
 * 기준 9(손이 하는 일은 하나): 눈밭을 톡 = 그 칸에 다음 조각(눈벽·눈사람). 다 놓거나 '▶ 버티기'를 톡 치면 눈보라가 온다.
 * 놀이 뼈대는 밀물 모래성과 같다: 예보판 → 톡으로 벽 쌓기 → 돌풍이 여러 번 오고 벽이 깎임 → 칸마다 숫자 미리 보기.
 * 와우(비틀기): 한 번 맞은 눈벽은 밤(판 중간의 쉬는 틈)이 지나면 꽁꽁 얼어 **얼음벽(다시는 안 깎임)** 이 된다.
 *   그래서 밤 전의 약한 돌풍에 일부러 살짝 맞혀 굳히는 수가 생긴다. 미리 보기에 '❄ 얼 벽'이 표시된다.
 * 바람(결정적 칸 규칙): 돌풍 세기 H = 바람 쪽 첫 줄에 부는 세기. 앞으로 한 칸 갈 때마다 1, 옆으로 번질 땐 2씩 약해진다.
 *   벽 높이 이하의 바람은 막히고(벽 뒤는 바람 그늘), 세면 넘는다(넘은 만큼만 이어 간다).
 *   맞은 눈벽은 1, 넘친 눈벽은 2 깎인다(얼음벽은 안 깎인다). 이글루에 닿은 세기만큼 이글루가 깎인다.
 * 첫 3초: 1판은 눈벽 둘. 둘을 쌓자 첫 돌풍이 '휘잉!' 벽에 막혀 눈가루가 펑. 이글루 안 펭귄 가족이 빼꼼, 아기 펭귄이 데굴데굴 굴러 나왔다 엄마에게 끌려 들어간다.
 * 목표·보상: 판(눈보라)마다 끝까지 버티면 별 — ★ 이글루 무사 · ★ 하나도 안 깎임 · ★ 물고기 창고를 지켰다.
 *   이글루가 다 깎이면 하트 -1, 그 판을 처음부터 다시(같은 눈밭). 하트 셋을 다 잃거나 8판을 마치면 끝.
 * 펼쳐짐(하는 일이 바뀐다): 1판 눈벽·깎임 → 2판 밤에 얼기·물고기 창고 → 3판 옆 돌풍 → 4판 눈사람(높지만 맞으면 머리가 굴러가 눈벽이 됨)
 *   → 5판 고드름(표시한 칸에 떨어져 눈벽을 부숨, 빈 눈밭엔 얼음 기둥) → 6판 회오리(판 한가운데서 사방으로 분다 → 안쪽을 막는다)
 *   → 7판 눈덩이(줄을 따라 굴러와 눈벽을 부숨, 얼음벽엔 부서짐) → 8판 아기 이글루 + 오로라 밤(밤이 두 번).
 * 웃음(기준 10): 지붕 위 아빠 펭귄 표정(두리번·눈 휘둥그레·버팀·우쭐 날개 번쩍·어질어질), 바람에 펭귄이 배로 미끄러져 썰매처럼 '슝~',
 *   얼음 조각 위 물개가 박수 짝짝, 눈벽이 깎이면 구경하던 눈사람 머리가 데굴데굴, 이글루가 무너지면 아빠 펭귄이 배 썰매로 퇴장.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.42;
export const COLS = 8, ROWS = 7, N = COLS * ROWS;
/** 칸 종류: 눈밭 · 눈벽 · 얼음벽 · 눈사람 · 이글루 */
export const SNOW = 0, WALL = 1, ICE = 2, MAN = 3, IGLOO = 4;
/** 조각: 눈벽 · 눈사람 */
export const PW = 0, PS = 1;
const WALL_H = 3, STACK = 2, MAX_H = 7, MAN_H = 6, SPIKE_H = 2, BERG_H = 4;
/** 돌풍 연출(틱): 다가오기 · 한 칸 번질 때마다 · 다 번진 뒤 머무름 · 잦아듦 */
const APPROACH = 34, STEP = 6, HOLD = 26, RECEDE = 44;
/** 밤 · 고드름 · 눈덩이 연출(틱) */
const NIGHT = 130, FREEZE_AT = 64, ICICLE = 84, ICICLE_HIT = 40, ROLL = 7;
const RESULT = 150, AUTO = 22, PREVIEW = 120;

type From = 'F' | 'L' | 'R' | 'C';
/** 예보판의 한 칸: 돌풍(gust) · 밤(night) · 고드름(icicle) · 눈덩이(ball) */
export interface Step { k: 'gust' | 'night' | 'icicle' | 'ball'; h: number; from: From; col: number; aurora: boolean }
interface StageDef { steps: string; pieces: string; fish: number; bergs: number; row: number; icicles?: number; twin?: boolean }
/**
 * 판(눈보라) 8개. F=바람 쪽(앞)에서, S=옆(판마다 왼쪽·오른쪽), L/R, C=회오리(판 위 한 점에서 사방으로), N=밤, A=오로라 밤, I=고드름, B=눈덩이.
 */
const STAGES: StageDef[] = [
  { steps: 'F4 F5', pieces: 'WW', fish: 0, bergs: 0, row: 4 },
  { steps: 'F4 N F6 F6', pieces: 'WWWW', fish: 1, bergs: 0, row: 4 },
  { steps: 'F4 S4 N F6 S5', pieces: 'WWWWW', fish: 1, bergs: 1, row: 4 },
  { steps: 'F4 N F7 F7', pieces: 'SWWWW', fish: 1, bergs: 1, row: 4 },
  { steps: 'F5 I N F6 F7', pieces: 'WWSWW', fish: 1, bergs: 1, row: 4, icicles: 2 },
  { steps: 'F4 N C5 F7', pieces: 'WWSWWW', fish: 1, bergs: 1, row: 4 },
  { steps: 'F5 B N F6 B F7', pieces: 'WWSWWW', fish: 2, bergs: 1, row: 4 },
  { steps: 'F5 S4 N F6 B A F7 F7', pieces: 'WWSWWWSW', fish: 1, bergs: 2, row: 4, twin: true },
];
export const STAGE_COUNT = STAGES.length;
const PIECE_NAME = ['눈벽', '눈사람'];

export const NB: number[][] = [...Array(N).keys()].map((i) => {
  const r = Math.floor(i / COLS), c = i % COLS, out: number[] = [];
  if (r > 0) out.push(i - COLS);
  if (c > 0) out.push(i - 1);
  if (c < COLS - 1) out.push(i + 1);
  if (r < ROWS - 1) out.push(i + COLS);
  return out;
});
const rowOf = (i: number) => Math.floor(i / COLS), colOf = (i: number) => i % COLS;

export interface Board { K: Uint8Array; Hh: Int8Array; mk: Uint8Array; fish: Uint8Array; hp: number[] }
export interface Wind { lvl: Int8Array; hit: Int8Array; over: Uint8Array }

const BK: number[][] = Array.from({ length: 16 }, () => []);
/**
 * 돌풍 하나가 어디까지 얼마나 세게 들어오나 (결정적, 봇이 내다볼 때도 같은 함수).
 * 세기 H의 바람이 바람 쪽 첫 줄(옆 돌풍이면 옆 첫 칸, 회오리면 그 한 칸)에 분다. 오는 쪽으로 한 칸 갈 때마다 1, 옆으로 번질 땐 2씩 약해진다(회오리는 사방 1씩).
 * 벽(눈벽·얼음벽·눈사람)은 자기 높이 이하의 바람을 막고(hit 기록), 센 바람은 넘은 만큼만 이어 간다.
 */
export function blow(K: Uint8Array, Hh: Int8Array, st: Step, wc: number): Wind {
  const lvl = new Int8Array(N), hit = new Int8Array(N), over = new Uint8Array(N);
  for (const q of BK) q.length = 0;
  const enter = (b: number, inc: number) => {
    if (inc <= 0) return;
    const k = K[b];
    if (k === IGLOO) {
      if (inc > hit[b]) hit[b] = inc;
      return;
    }
    if (k !== SNOW) {
      if (inc > hit[b]) hit[b] = inc;
      if (inc <= Hh[b]) return;
      over[b] = 1;
      inc -= Hh[b];
    }
    if (inc > lvl[b]) (lvl[b] = inc), BK[inc].push(b);
  };
  const h = Math.min(15, st.h), fwd = st.from === 'F' ? COLS : st.from === 'L' ? 1 : st.from === 'R' ? -1 : 0;
  if (st.from === 'F') for (let c = 0; c < COLS; c++) enter(c, h);
  else if (st.from === 'C') enter(wc, h);
  else for (let r = 0; r < ROWS; r++) enter(r * COLS + (st.from === 'L' ? 0 : COLS - 1), h);
  for (let l = 15; l >= 1; l--) {
    const q = BK[l];
    for (let j = 0; j < q.length; j++) {
      const b = q[j];
      if (lvl[b] !== l) continue;
      for (const n of NB[b]) enter(n, fwd === 0 || n - b === fwd ? l - 1 : l - 2);
    }
  }
  return { lvl, hit, over };
}

/** 돌풍이 지나간 뒤: 눈벽이 깎이고(맞으면 1, 넘치면 2 — 살아남으면 '맞은 벽' 표시), 눈사람은 머리가 굴러가 눈벽이 되고, 이글루가 깎이고, 바람 맞은 물고기 창고는 날아간다 */
export function settle(B: Board, ig: Int8Array, f: Wind) {
  const dmg = B.hp.map(() => 0), crumble: number[] = [], gone: number[] = [], heads: number[] = [], lost: number[] = [];
  for (let i = 0; i < N; i++) {
    if (f.hit[i] > 0) {
      if (B.K[i] === WALL) {
        B.Hh[i] -= f.over[i] ? 2 : 1;
        crumble.push(i);
        if (B.Hh[i] <= 0) (B.K[i] = SNOW), (B.Hh[i] = 0), (B.mk[i] = 0), gone.push(i);
        else B.mk[i] = 1;
      } else if (B.K[i] === MAN) {
        B.K[i] = WALL;
        B.Hh[i] = f.over[i] ? WALL_H - 1 : WALL_H;
        B.mk[i] = 1;
        heads.push(i);
      }
    }
    if (ig[i] && f.hit[i] > dmg[ig[i] - 1]) dmg[ig[i] - 1] = f.hit[i];
    if (B.fish[i] && f.lvl[i] > 0) (B.fish[i] = 0), lost.push(i);
  }
  for (let k = 0; k < dmg.length; k++) B.hp[k] = Math.max(0, B.hp[k] - dmg[k]);
  return { dmg, crumble, gone, heads, lost };
}

/** 밤: 한 번 맞은 눈벽이 얼음벽이 된다 (높이는 그대로, 다시는 안 깎인다) */
export function freeze(B: Board) {
  const out: number[] = [];
  for (let i = 0; i < N; i++) if (B.K[i] === WALL && B.mk[i]) (B.K[i] = ICE), (B.mk[i] = 0), out.push(i);
  return out;
}

/** 고드름: 표시한 칸에 떨어진다 — 눈벽·눈사람은 부서지고, 빈 눈밭엔 얼음 기둥(높이 2)으로 꽂힌다. 얼음벽은 끄떡없다 */
export function icicles(B: Board, ic: number[]) {
  const crush: number[] = [], spike: number[] = [], clink: number[] = [];
  for (const i of ic) {
    if (B.K[i] === WALL || B.K[i] === MAN) (B.K[i] = SNOW), (B.Hh[i] = 0), (B.mk[i] = 0), crush.push(i);
    else if (B.K[i] === SNOW) (B.K[i] = ICE), (B.Hh[i] = SPIKE_H), spike.push(i);
    else clink.push(i);
  }
  return { crush, spike, clink };
}

/** 눈덩이가 굴러가는 길: 바람 쪽 첫 줄에서 그 세로줄을 따라 처음 부딪히는 것까지 */
export function rollPath(K: Uint8Array, col: number): number[] {
  const out: number[] = [];
  for (let r = 0; r < ROWS; r++) {
    const i = r * COLS + col;
    out.push(i);
    if (K[i] !== SNOW) break;
  }
  return out;
}
/** 눈덩이: 눈벽은 2 깎고(맞은 벽 표시), 눈사람은 머리를 날리고, 얼음벽엔 부서지고, 이글루는 1 깎는다 */
export function roll(B: Board, ig: Int8Array, col: number) {
  const path = rollPath(B.K, col), stop = path[path.length - 1], k = B.K[stop], dmg = B.hp.map(() => 0);
  let what: 'none' | 'wall' | 'gone' | 'man' | 'ice' | 'igloo' = 'none';
  if (k === WALL) {
    B.Hh[stop] -= 2;
    if (B.Hh[stop] <= 0) (B.K[stop] = SNOW), (B.Hh[stop] = 0), (B.mk[stop] = 0), (what = 'gone');
    else (B.mk[stop] = 1), (what = 'wall');
  } else if (k === MAN) (B.K[stop] = WALL), (B.Hh[stop] = WALL_H), (B.mk[stop] = 1), (what = 'man');
  else if (k === ICE) what = 'ice';
  else if (k === IGLOO) (dmg[ig[stop] - 1] = 1), (B.hp[ig[stop] - 1] = Math.max(0, B.hp[ig[stop] - 1] - 1)), (what = 'igloo');
  return { path, stop, what, dmg };
}

/** 한 단계를 판에 적용 (봇·미리 보기·실제가 모두 이 함수를 쓴다 → 미리 보기와 결과가 정확히 같다) */
function apply(B: Board, ig: Int8Array, st: Step, wc: number, ic: number[]): { dmg: number[]; wind?: Wind; frozen?: number[] } {
  if (st.k === 'gust') {
    const f = blow(B.K, B.Hh, st, wc);
    return { dmg: settle(B, ig, f).dmg, wind: f };
  }
  if (st.k === 'night') return { dmg: B.hp.map(() => 0), frozen: freeze(B) };
  if (st.k === 'icicle') return (icicles(B, ic), { dmg: B.hp.map(() => 0) });
  return { dmg: roll(B, ig, st.col).dmg };
}

interface Igl { cells: number[]; max: number; baby: boolean }
interface Ev { t: number; kind: string; x: number; y: number; text?: string; col?: string }
interface Peng { home: number; off: number }
export interface IglooState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'build' | 'storm' | 'result'; pt: number;
  K: Uint8Array; Hh: Int8Array; mk: Uint8Array; fish: Uint8Array; nat: Uint8Array; ig: Int8Array; hp: number[]; igloos: Igl[]; wc: number; ic: number[];
  steps: Step[]; si: number; wt: number; wind: Wind | null; arrive: Int16Array; impact: number; end: number; lastDmg: number[]; path: number[];
  pieces: number[]; pi: number; auto: number; frost: Int16Array; gust: Float32Array; fish0: number; fell: boolean;
  hearts: number; stars: number; got: number; pts: number; ok: boolean; dmgThis: number; keep: number;
  down: boolean; taps: number; seen: Set<string>; events: Ev[]; news: { text: string; t: number } | null; dead: boolean; won: boolean;
  pengs: Peng[]; lastPlace: number; place: Int16Array; peak: Int8Array; pin: number; nights: number;
}

const ev = (s: IglooState, kind: string, x: number, y: number, text?: string, col?: string) => s.events.push({ t: s.t, kind, x, y, text, col });
function see(s: IglooState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  s.news = { text, t: s.t };
}

// ───────── 화면 배치 (가로 0~1, 세로 0~A) — 바람 쪽(얼음 바다)에서 본 3/4 시점: 바람이 앞(아래)에서 불어오고, 눈 덮인 산이 뒤(위). 뒤쪽 줄이 좁다 ─────────
// 화면 줄(vr) = ROWS-1-줄(r): 바람 쪽 첫 줄(r=0)이 맨 앞. 그래서 이글루 앞에 쌓은 벽이 이글루에 가려지지 않는다
const CW = 0.108, CH = 0.085, Y0 = 0.345, Y1 = Y0 + ROWS * CH, HZ = 0.016;
const scl = (r: number) => 0.87 + 0.13 * (r / ROWS);
/** 판 좌표(c: 0~COLS, r: 0~ROWS, z: 높이 단위) → 화면 좌표 */
const PX = (c: number, r: number) => 0.5 + (c - COLS / 2) * CW * scl(r);
const PY = (r: number, z = 0) => Y0 + r * CH - z * HZ;
const vrowOf = (i: number) => ROWS - 1 - rowOf(i);
const ccx = (i: number) => PX(colOf(i) + 0.5, vrowOf(i) + 0.5), ccy = (i: number) => PY(vrowOf(i) + 0.5);
/** 아래 쟁반: 조각 미리 보기 · '▶ 버티기' 단추 */
const TY = Y1 + 0.195, BTN = { x: 0.635, y: TY + 0.03, w: 0.33, h: 0.11 };
/** 예보판 칸 자리 (톡 하면 그 단계를 미리 본다) */
const FC = { y0: 0.088, h: 0.146, cy: 0.138, ch: 0.085, gap: 0.012 };
function cardBox(k: number, n: number) {
  const cw = Math.min(0.15, (0.92 - FC.gap * (n - 1)) / n), x0 = 0.5 - (cw * n + FC.gap * (n - 1)) / 2;
  return { x: x0 + k * (cw + FC.gap), y: FC.cy, w: cw, h: FC.ch };
}

function cellAt(x: number, y: number): number {
  if (y < Y0 || y >= Y1) return -1;
  const vr = Math.floor((y - Y0) / CH), c = Math.floor((x - 0.5) / (CW * scl(vr + 0.5)) + COLS / 2);
  return c < 0 || c >= COLS ? -1 : (ROWS - 1 - vr) * COLS + c;
}

const boardOf = (s: IglooState): Board => ({ K: s.K.slice(), Hh: s.Hh.slice(), mk: s.mk.slice(), fish: s.fish.slice(), hp: s.hp.slice() });

export function canPlace(K: Uint8Array, Hh: Int8Array, fish: Uint8Array, wc: number, i: number, p: number) {
  if (fish[i] || i === wc) return false;
  if (K[i] === SNOW) return true;
  return p === PW && K[i] === WALL && Hh[i] < MAX_H;
}
function put(B: { K: Uint8Array; Hh: Int8Array; mk: Uint8Array }, i: number, p: number) {
  if (p === PW) B.K[i] === WALL ? (B.Hh[i] = Math.min(MAX_H, B.Hh[i] + STACK)) : ((B.K[i] = WALL), (B.Hh[i] = WALL_H), (B.mk[i] = 0));
  else (B.K[i] = MAN), (B.Hh[i] = MAN_H), (B.mk[i] = 0);
}

/** 판 구성: 같은 판은 다시 해도 같은 눈밭 (실패하면 '처음부터 다시 짓기') */
function newStage(s: IglooState) {
  const d = STAGES[s.stage], r = mulberry32((s.seed * 31 + s.stage * 7919 + 17) >>> 0);
  s.K = new Uint8Array(N);
  s.Hh = new Int8Array(N);
  s.mk = new Uint8Array(N);
  s.fish = new Uint8Array(N);
  s.nat = new Uint8Array(N);
  s.ig = new Int8Array(N);
  s.frost = new Int16Array(N).fill(-999);
  s.gust = new Float32Array(N);
  s.place = new Int16Array(N).fill(-999);
  s.peak = new Int8Array(N);
  s.fell = false;
  s.pin = -1;
  s.nights = 0;
  const side = /[SLR]/.test(d.steps), c = side ? 3 : 2 + Math.floor(r() * 3), row = d.row;
  s.igloos = [{ cells: [row * COLS + c, row * COLS + c + 1], max: 3, baby: false }];
  if (d.twin) {
    // 아기 이글루: 큰 이글루 뒤쪽 옆 (가장자리 한 칸 안쪽)
    const pc = c <= 3 ? Math.min(COLS - 2, c + 3) : Math.max(1, c - 2);
    s.igloos.push({ cells: [(row + 1) * COLS + pc], max: 2, baby: true });
  }
  s.hp = s.igloos.map((k) => k.max);
  s.igloos.forEach((k, j) => k.cells.forEach((i) => ((s.K[i] = IGLOO), (s.ig[i] = j + 1))));
  const near = (i: number, dmax: number) => s.igloos.some((k) => k.cells.some((j) => Math.abs(rowOf(i) - rowOf(j)) <= dmax && Math.abs(colOf(i) - colOf(j)) <= dmax));
  const free = (r0: number, r1: number, ok: (i: number) => boolean) => {
    for (let k = 0; k < 120; k++) {
      const i = (r0 + Math.floor(r() * (r1 - r0 + 1))) * COLS + Math.floor(r() * COLS);
      if (s.K[i] === SNOW && !s.fish[i] && i !== s.wc && ok(i)) return i;
    }
    return -1;
  };
  s.wc = -1;
  // 회오리 자리: 이글루 옆이나 뒤, 두세 칸 떨어진 눈밭 (안쪽을 막아야 한다)
  if (/C/.test(d.steps)) s.wc = free(Math.max(1, row - 1), ROWS - 1, (j) => !near(j, 1) && near(j, 3));
  // 눈덩이는 이글루 줄을 노린다
  const ballCols = [c, c + 1];
  for (let k = 0; k < d.bergs; k++) {
    const i = free(1, row - 1, (j) => !near(j, 1) && !NB[j].some((n) => s.K[n] === ICE));
    if (i >= 0) (s.K[i] = ICE), (s.Hh[i] = BERG_H), (s.nat[i] = 1);
  }
  for (let k = 0; k < d.fish; k++) {
    const i = free(Math.max(1, row - 3), Math.min(ROWS - 1, row + 1), (j) => near(j, 2) && !ballCols.includes(colOf(j)) && !NB[j].some((n) => s.fish[n] || s.ig[n]));
    if (i >= 0) s.fish[i] = 1;
  }
  s.fish0 = s.fish.reduce((a, b) => a + b, 0);
  s.ic = [];
  for (let k = 0; k < (d.icicles ?? 0); k++) {
    const i = free(Math.max(1, row - 2), row - 1, (j) => near(j, 1) && !s.ic.includes(j));
    if (i >= 0) s.ic.push(i);
  }
  let bi = 0;
  s.steps = d.steps.split(' ').map((x) => {
    if (x === 'N' || x === 'A') return { k: 'night', h: 0, from: 'F', col: 0, aurora: x === 'A' } as Step;
    if (x === 'I') return { k: 'icicle', h: 0, from: 'F', col: 0, aurora: false } as Step;
    if (x === 'B') return { k: 'ball', h: 0, from: 'F', col: ballCols[bi++ % 2], aurora: false } as Step;
    return { k: 'gust', h: Number(x.slice(1)), from: (x[0] === 'S' ? (r() < 0.5 ? 'L' : 'R') : x[0]) as From, col: 0, aurora: false } as Step;
  });
  const ps: number[] = [...d.pieces].map((ch) => (ch === 'S' ? PS : PW));
  for (let k = ps.length - 1; k > 1; k--) {
    const j = 1 + Math.floor(r() * k);
    [ps[k], ps[j]] = [ps[j], ps[k]];
  }
  s.pieces = ps;
  s.pi = 0;
  s.auto = 0;
  s.si = 0;
  s.wt = 0;
  s.wind = null;
  s.path = [];
  s.phase = 'build';
  s.pt = 0;
  s.dmgThis = 0;
  s.lastDmg = s.hp.map(() => 0);
  // 펭귄 식구 둘 (이글루 옆 눈밭에서 논다 — 연출만)
  s.pengs = [];
  for (let k = 0; k < 2; k++) {
    const i = free(row - 1, row, (j) => near(j, 1) && !s.ic.includes(j) && !s.pengs.some((q) => q.home === j));
    if (i >= 0) s.pengs.push({ home: i, off: k * 37 });
  }
  // 새것 알림
  see(s, 'wall', '🧱 눈벽 — 바람을 막지만 맞을 때마다 깎여요');
  if (s.steps.some((q) => q.k === 'night')) see(s, 'night', '🌙 밤 — 한 번 맞은 눈벽은 밤새 얼어 얼음벽이 돼요 (안 깎임!)');
  if (s.fish0) see(s, 'fish', '🐟 물고기 창고 — 바람이 안 닿게 지키면 별 하나 더');
  if (s.steps.some((q) => q.k === 'gust' && (q.from === 'L' || q.from === 'R'))) see(s, 'side', '↔️ 옆 돌풍 — 옆에서도 불어와요');
  if (ps.includes(PS)) see(s, 'man', '⛄ 눈사람 — 높이 6! 대신 한 번 맞으면 머리가 굴러가 눈벽이 돼요');
  if (s.ic.length) see(s, 'icicle', '🧊 고드름 — 표시한 칸에 떨어져 눈벽을 부숴요 (얼음벽은 끄떡없음)');
  if (s.wc >= 0) see(s, 'whirl', '🌀 회오리 — 눈밭 한가운데서 사방으로 불어요');
  if (s.steps.some((q) => q.k === 'ball')) see(s, 'ball', '⚪ 눈덩이 — 줄을 따라 굴러와 눈벽을 부숴요 (얼음벽엔 와장창)');
  if (d.twin) see(s, 'baby', '🐣 아기 이글루 — 두 이글루를 다 지켜요');
  if (s.steps.some((q) => q.aurora)) see(s, 'aurora', '🌌 오로라 밤 — 밤이 두 번! 두 번 얼릴 수 있어요');
  ev(s, 'stage', 0.5, Y1 + 0.06, `${s.stage + 1}번째 눈보라 — 돌풍 ${s.steps.filter((q) => q.k === 'gust').length}번!`);
}

function startStorm(s: IglooState) {
  s.phase = 'storm';
  s.si = 0;
  s.taps++;
  s.pin = -1;
  startStep(s);
}

function startStep(s: IglooState) {
  const st = s.steps[s.si];
  s.wt = 0;
  s.wind = null;
  s.path = [];
  s.arrive = new Int16Array(N).fill(-1);
  if (st.k === 'gust') {
    s.wind = blow(s.K, s.Hh, st, s.wc);
    for (let i = 0; i < N; i++) {
      const v = Math.max(s.wind.lvl[i], s.wind.hit[i]);
      if (v > 0) s.arrive[i] = APPROACH + STEP * (st.h - v);
    }
    s.impact = APPROACH + STEP * st.h + 4;
    s.end = s.impact + HOLD + RECEDE;
    const where = st.from === 'F' ? '' : st.from === 'C' ? '회오리 ' : '옆 ';
    ev(s, 'incoming', 0.5, 0.33, `${where}돌풍 — 세기 ${st.h}!`, '#e3f6ff');
  } else if (st.k === 'night') {
    s.impact = FREEZE_AT;
    s.end = NIGHT;
    s.nights++;
    ev(s, 'night', 0.5, 0.33, st.aurora ? '🌌 오로라 밤…' : '🌙 밤이 왔어요…', '#d8e6ff');
  } else if (st.k === 'icicle') {
    s.impact = ICICLE_HIT;
    s.end = ICICLE;
    ev(s, 'incoming', 0.5, 0.33, '🧊 고드름이 떨어져요!', '#e3f6ff');
  } else {
    s.path = rollPath(s.K, st.col);
    s.path.forEach((i, k) => (s.arrive[i] = 14 + ROLL * k));
    s.impact = 14 + ROLL * (s.path.length - 1) + 2;
    s.end = s.impact + 44;
    ev(s, 'incoming', 0.5, 0.33, '⚪ 눈덩이가 굴러와요!', '#e3f6ff');
  }
}

function stormStep(s: IglooState) {
  s.wt++;
  const st = s.steps[s.si], B: Board = { K: s.K, Hh: s.Hh, mk: s.mk, fish: s.fish, hp: s.hp };
  if (st.k === 'gust') {
    const f = s.wind!;
    if (s.wt < s.impact)
      for (let i = 0; i < N; i++) {
        if (s.arrive[i] !== s.wt) continue;
        const x = ccx(i), y = ccy(i);
        s.gust[i] = 1;
        if (s.ig[i]) {
          const first = !s.igloos[s.ig[i] - 1].cells.some((j) => j !== i && s.arrive[j] >= 0 && (s.arrive[j] < s.wt || (s.arrive[j] === s.wt && j < i)));
          if (first) ev(s, 'chit', x, y, '으앗 추워!', '#ffb3c8');
        } else if (s.K[i] !== SNOW && f.over[i]) ev(s, 'over', x, y, '넘었다!', '#bfe9ff');
        else if (s.K[i] !== SNOW) ev(s, 'splash', x, y, s.K[i] === ICE ? '쨍!' : s.K[i] === MAN ? '퍽!' : '휘잉!', '#ffffff');
        if (s.fish[i] && f.lvl[i] > 0) ev(s, 'fishgo', x, y, '물고기가 날아가요~', '#ffd6e8');
      }
    if (s.wt === s.impact) {
      const r = settle(B, s.ig, f);
      s.lastDmg = r.dmg;
      for (const i of r.crumble) ev(s, r.gone.includes(i) ? 'gone' : 'crumble', ccx(i), ccy(i) - 0.02, r.gone.includes(i) ? '와르르' : '-' + (f.over[i] ? 2 : 1), '#e8f4ff');
      for (const i of r.heads) ev(s, 'head', ccx(i), ccy(i) - 0.04, '머리가 데굴~', '#ffe3b0');
      if (r.crumble.length) see(s, 'erode', '눈벽이 깎였어요 — 깎인 자리로 다음 돌풍이 더 들어와요');
      afterHit(s, r.dmg);
    }
  } else if (st.k === 'night') {
    if (s.wt === s.impact) {
      const fr = freeze(B);
      for (const i of fr) (s.frost[i] = s.t), ev(s, 'freeze', ccx(i), ccy(i) - 0.03, '쩡! 얼었다', '#bff4ff');
      if (fr.length) see(s, 'froze', '❄️ 맞은 눈벽이 얼음벽이 됐어요 — 이제 안 깎여요');
      else ev(s, 'nofreeze', 0.5, 0.6, '얼 벽이 없었어요…', '#d8e6ff');
    }
  } else if (st.k === 'icicle') {
    if (s.wt === s.impact) {
      const r = icicles(B, s.ic);
      for (const i of r.crush) ev(s, 'crush', ccx(i), ccy(i), '와장창!', '#ffd0d0');
      for (const i of r.spike) (s.frost[i] = s.t), ev(s, 'spike', ccx(i), ccy(i), '얼음 기둥!', '#bff4ff');
      for (const i of r.clink) ev(s, 'splash', ccx(i), ccy(i), '쨍!', '#ffffff');
      s.fell = true;
    }
  } else {
    if (s.wt === s.impact) {
      const r = roll(B, s.ig, st.col), x = ccx(r.stop), y = ccy(r.stop);
      if (r.what === 'wall') ev(s, 'crumble', x, y - 0.02, '-2', '#e8f4ff');
      if (r.what === 'gone') ev(s, 'gone', x, y - 0.02, '와르르', '#e8f4ff');
      if (r.what === 'man') ev(s, 'head', x, y - 0.04, '머리가 데굴~', '#ffe3b0');
      if (r.what === 'ice') ev(s, 'splash', x, y, '와장창!', '#ffffff');
      if (r.what === 'none') ev(s, 'splash', x, y, '데굴데굴~', '#ffffff');
      afterHit(s, r.dmg);
    }
  }
  if (s.wt >= s.end) {
    s.si++;
    s.wind = null;
    if (s.hp.some((h) => h <= 0)) return endStage(s, false);
    if (s.si >= s.steps.length) return endStage(s, true);
    startStep(s);
  }
}

function afterHit(s: IglooState, dmg: number[]) {
  s.lastDmg = dmg;
  dmg.forEach((d, k) => {
    const c = s.igloos[k], x = ccx(c.cells[0]) + (c.cells.length > 1 ? CW / 2 : 0), y = ccy(c.cells[0]) - 0.03;
    if (d > 0) (s.dmgThis += d), ev(s, s.hp[k] <= 0 ? 'fall' : 'dmg', x, y, s.hp[k] <= 0 ? '와르르르!' : `이글루가 깎였다 -${d}`, '#ffb3c8');
    else if (!k) ev(s, 'safe', x, y, s.si === 0 && s.stage === 0 ? '막았다! 에헴!' : '끄떡없다!', '#fff1a8');
  });
}

function endStage(s: IglooState, ok: boolean) {
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  if (ok) {
    const kept = s.fish.reduce((a, b) => a + b, 0), left = s.pieces.length - s.pi;
    const st = 1 + (s.dmgThis === 0 ? 1 : 0) + (kept === s.fish0 ? 1 : 0);
    s.got = st;
    s.stars += st;
    s.keep = left;
    s.pts += 20 + st * 10 + kept * 5 + left * 3;
    const last = s.stage === STAGES.length - 1;
    if (last) (s.won = true), (s.pts += 30);
    ev(s, 'clear', 0.5, Y1 + 0.06, `${s.stage + 1}번째 눈보라 버텼다! ${'★'.repeat(st)}${'☆'.repeat(3 - st)}`);
  } else {
    s.hearts--;
    ev(s, 'fail', 0.5, Y1 + 0.06, s.hearts > 0 ? '이글루가 무너졌어요… 하트 -1 · 다시 짓기' : '이글루가 무너졌어요… 끝');
  }
}

export const igloo: GameDef<IglooState> = {
  id: 'igloo',
  name: '눈보라 이글루',
  genes: ['fortify', 'forecast', 'pointer'],
  twist: '돌풍은 여러 번 와서 눈벽을 깎는데, 한 번 맞은 눈벽은 밤이 지나면 꽁꽁 얼어 다시는 안 깎이는 얼음벽이 된다 — 그래서 밤 전에 일부러 살짝 맞혀 굳히는 수가 생긴다',
  rules: ['눈밭을 톡 = 눈벽 쌓기. ▶를 누르면 예보한 돌풍이 차례로 와요 — 펭귄 이글루를 지키면 별!', '돌풍은 한 칸에 1씩 약해지고 벽보다 세면 넘어요. 맞은 눈벽은 깎이지만, 🌙밤이 지나면 얼음벽이 돼요(안 깎임).'],
  controls: 'touch',
  hint: '눈밭을 톡 = 눈벽 쌓기 · ▶ 버티기 / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '눈보라 빙원 이글루 디오라마',
    mood: '눈 덮인 얼음 땅 한 덩이 — 옆면은 푸른 얼음층, 뒤로는 눈 덮인 산과 전나무. 돌풍이 눈가루를 흩날리고, 펭귄 가족이 이글루에서 빼꼼 내다보며, 얼음 조각 위 물개가 박수를 친다. 밤이면 오로라가 춤추고 이글루 창에 불빛이 번진다.',
    palette: { bg: '#1c2f4f', ink: '#f4fbff', muted: '#a8c4dc', accent: '#8fe3ff', hot: '#ff6b8a', soft: '#e6f2fb' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'build', pt: 0,
      K: new Uint8Array(N), Hh: new Int8Array(N), mk: new Uint8Array(N), fish: new Uint8Array(N), nat: new Uint8Array(N), ig: new Int8Array(N), hp: [], igloos: [], wc: -1, ic: [],
      steps: [], si: 0, wt: 0, wind: null, arrive: new Int16Array(N), impact: 0, end: 0, lastDmg: [], path: [],
      pieces: [], pi: 0, auto: 0, frost: new Int16Array(N), gust: new Float32Array(N), fish0: 0, fell: false,
      hearts: 3, stars: 0, got: 0, pts: 0, ok: false, dmgThis: 0, keep: 0,
      down: false, taps: 0, seen: new Set<string>(), events: [], news: null, dead: false, won: false, pengs: [], lastPlace: -999, place: new Int16Array(N), peak: new Int8Array(N), pin: -1, nights: 0,
    } as IglooState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    s.pt++;
    s.events = s.events.filter((e) => s.t - e.t < 110);
    for (let i = 0; i < N; i++) if (s.gust[i] > 0 && s.phase !== 'storm') s.gust[i] = Math.max(0, s.gust[i] - 1 / 300);
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
    if (s.phase === 'storm') return stormStep(s);
    // 짓기: 다 놓으면 잠깐 뒤 눈보라
    if (s.auto > 0 && --s.auto === 0) return startStorm(s);
    if (!press || !p || s.auto > 0) return;
    const x = p.x, y = p.y * A;
    if (x >= BTN.x && x <= BTN.x + BTN.w && y >= BTN.y && y <= BTN.y + BTN.h) return startStorm(s);
    // 예보 카드를 톡 = 그 단계 미리 보기 고정 (다시 톡 = 돌아가며 보기)
    if (y >= FC.cy && y <= FC.cy + FC.ch)
      for (let k = 0; k < s.steps.length; k++) {
        const b = cardBox(k, s.steps.length);
        if (x >= b.x && x <= b.x + b.w) return void (s.pin = s.pin === k ? -1 : k);
      }
    const i = cellAt(x, y), pc = s.pieces[s.pi];
    if (i < 0 || pc === undefined) return;
    if (!canPlace(s.K, s.Hh, s.fish, s.wc, i, pc))
      return void ev(s, 'nope', ccx(i), ccy(i), s.fish[i] ? '물고기 창고예요' : i === s.wc ? '회오리 자리예요' : s.K[i] === IGLOO ? '펭귄네 집이에요!' : s.K[i] === ICE ? '얼음엔 못 쌓아요' : '여긴 안 돼요', '#ffd6cc');
    const stack = s.K[i] === WALL;
    put(s, i, pc);
    s.place[i] = s.t;
    if (pc === PW) s.peak[i] = Math.max(s.peak[i], s.Hh[i]);
    s.lastPlace = s.t;
    s.pi++;
    s.taps++;
    ev(s, 'place', ccx(i), ccy(i), stack ? '더 높게!' : PIECE_NAME[pc], pc === PS ? '#ffe9b8' : '#e8f6ff');
    if (stack) see(s, 'stack', '눈벽 위에 또 쌓으면 더 높아져요');
    if (s.pi >= s.pieces.length) s.auto = AUTO;
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
/** 잘하는 봇이 내다보는 값: 이 판을 끝까지 돌려 본 점수(실패면 음수) + 이글루 둘레에 분 바람(같은 점수끼리 가르는 길잡이) */
function judge(s: IglooState, B0: Board, leftover: number) {
  const B: Board = { K: B0.K.slice(), Hh: B0.Hh.slice(), mk: B0.mk.slice(), fish: B0.fish.slice(), hp: B0.hp.slice() };
  let press = 0, dmg = 0, fail = false, lived = 0;
  const near = NEAR.get(s)!;
  for (let k = s.si; k < s.steps.length; k++, lived++) {
    const r = apply(B, s.ig, s.steps[k], s.wc, s.ic);
    if (r.wind) for (let i = 0; i < N; i++) if (near[i]) press += r.wind.lvl[i] + r.wind.hit[i] * 2;
    for (const d of r.dmg) dmg += d;
    if (B.hp.some((h) => h <= 0)) {
      fail = true;
      break;
    }
  }
  const kept = B.fish.reduce((a, b) => a + b, 0);
  const st = 1 + (dmg === 0 ? 1 : 0) + (kept === s.fish0 ? 1 : 0);
  const pts = fail ? -400 + lived * 40 + B.hp.reduce((a, b) => a + b, 0) * 10 : 20 + st * 10 + kept * 5 + leftover * 3;
  return { pts, press };
}
const NEAR = new WeakMap<object, Uint8Array>();
function nearMask(s: IglooState) {
  const m = new Uint8Array(N);
  for (const c of s.igloos) for (const j of c.cells) for (let i = 0; i < N; i++) if (Math.abs(rowOf(i) - rowOf(j)) <= 1 && Math.abs(colOf(i) - colOf(j)) <= 1) m[i] = 1;
  for (let i = 0; i < N; i++) if (s.fish[i]) for (const n of NB[i]) m[n] = 1;
  NEAR.set(s, m);
}

/** 앞으로 놓을 조각을 차례로: 지금 조각(+다음 조각까지 두 수 앞)을 판 끝까지(밤·고드름·눈덩이까지) 돌려 보고 가장 좋은 자리. 몇 개까지 놓을지도 점수로 고른다 */
function plan(s: IglooState): number[] {
  nearMask(s);
  const B = boardOf(s), seq: number[] = [];
  const total = s.pieces.length;
  let bestPts = judge(s, B, total - s.pi).pts, bestLen = 0;
  const val = (j: { pts: number; press: number }) => j.pts * 50 - j.press;
  const tryPut = (B1: Board, i: number, pc: number): Board => {
    const B2 = { ...B1, K: B1.K.slice(), Hh: B1.Hh.slice(), mk: B1.mk.slice() };
    put(B2, i, pc);
    return B2;
  };
  for (let k = s.pi; k < total; k++) {
    const pc = s.pieces[k], nx = s.pieces[k + 1], left = total - k - 1;
    const cands: { i: number; v: number }[] = [];
    for (let i = 0; i < N; i++) {
      if (!canPlace(B.K, B.Hh, B.fish, s.wc, i, pc)) continue;
      cands.push({ i, v: val(judge(s, tryPut(B, i, pc), left)) });
    }
    if (!cands.length) break;
    cands.sort((a, b) => b.v - a.v);
    let pick = cands[0];
    if (nx !== undefined) {
      let bv = -Infinity;
      for (const c of cands.slice(0, 5)) {
        const B2 = tryPut(B, c.i, pc);
        let b2 = c.v;
        for (let i = 0; i < N; i++) {
          if (!canPlace(B2.K, B2.Hh, B2.fish, s.wc, i, nx)) continue;
          b2 = Math.max(b2, val(judge(s, tryPut(B2, i, nx), left - 1)));
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

/** 봇: 판을 끝까지 돌려 보며 자리를 고른다 — 어디를 두껍게, 무엇을 밤 전에 맞혀 얼릴지, 언제 멈출지(남긴 조각도 점수) */
export const iglooSmart: Bot<IglooState> = {
  name: '이글루 박사',
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
/** 봇: 아무 데나, 아무 때나 톡 (대개 눈밭 위, 가끔 화면 아무 데나 — ▶를 일찍 누르기도) */
export const iglooRandom: Bot<IglooState> = {
  name: '아무 데나 톡',
  act(s, rng) {
    const next = dumbAt.get(s) ?? 20 + Math.floor(rng() * 60);
    if (s.t < next) return NO;
    dumbAt.set(s, s.t + 30 + Math.floor(rng() * 110));
    if (rng() < 0.1) return { tap: false, dir: 0, pointer: { x: rng(), y: rng() } };
    return tapCell(Math.floor(rng() * N));
  },
};


// ───────────────────────────── 미리 보기 (짓는 동안) ─────────────────────────────
interface Fore { before: Board; dmg: number[]; wind?: Wind; frozen?: number[]; crush?: number[]; path?: number[]; what?: string }
/** 예보한 단계를 지금 판에서 차례로 돌려 본다 — 실제 버티기와 같은 함수(apply와 같은 순서)라서 결과가 정확히 같다 */
function foresee(s: IglooState): Fore[] {
  const B = boardOf(s), out: Fore[] = [];
  for (const st of s.steps) {
    const before: Board = { K: B.K.slice(), Hh: B.Hh.slice(), mk: B.mk.slice(), fish: B.fish.slice(), hp: B.hp.slice() };
    const zero = B.hp.map(() => 0);
    if (st.k === 'gust') {
      const f = blow(B.K, B.Hh, st, s.wc);
      out.push({ before, dmg: settle(B, s.ig, f).dmg, wind: f });
    } else if (st.k === 'night') out.push({ before, dmg: zero, frozen: freeze(B) });
    else if (st.k === 'icicle') out.push({ before, dmg: zero, crush: icicles(B, s.ic).crush });
    else {
      const r = roll(B, s.ig, st.col);
      out.push({ before, dmg: r.dmg, path: r.path, what: r.what });
    }
  }
  return out;
}

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
const HOR = 0.27;
/** 판마다 하루가 저문다: 아침 → 한낮 → 오후 → 분홍 노을 → 해 질 녘 → 어스름 → 밤 → 오로라 밤 (하늘 위·아래) */
const SKY: [string, string][] = [
  ['#86c9f2', '#eaf7ff'],
  ['#78bff0', '#e4f4ff'],
  ['#6ab3ea', '#e6f0ff'],
  ['#6ea4dc', '#f6e9ff'],
  ['#7690d0', '#ffd7e4'],
  ['#55669f', '#f2b6c8'],
  ['#2c3874', '#8b7fc2'],
  ['#131b47', '#3a4a8c'],
];
const BASE_DARK = [0, 0, 0, 0.05, 0.12, 0.25, 0.45, 0.6];
const recentSay = new WeakMap<object, { x: number; y: number; t: number }[]>();

type Mood = 'calm' | 'wow' | 'proud' | 'strain' | 'dizzy' | 'happy' | 'sleep';
/** 펭귄 (앞에서 본 모습). flap: 0 날개 내림 ~ 1 번쩍. tilt로 눕히면 배 썰매 */
function drawPeng(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, t: number, mood: Mood, flap: number, opt: { scarf?: string; tilt?: number; baby?: boolean; look?: number } = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(40,70,120,.22)';
  ctx.beginPath();
  ctx.ellipse(0, z * 0.04, z * 0.8, z * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(opt.tilt ?? 0);
  const dark = opt.baby ? '#8a94a3' : '#22304a', belly = opt.baby ? '#f1f4f8' : '#ffffff';
  // 발
  ctx.fillStyle = '#ffa02e';
  for (const sd of [-1, 1]) (ctx.beginPath(), ctx.ellipse(sd * z * 0.26, -z * 0.03, z * 0.22, z * 0.09, sd * 0.2, 0, Math.PI * 2), ctx.fill());
  // 날개 (몸 뒤)
  for (const sd of [-1, 1]) {
    ctx.save();
    ctx.translate(sd * z * 0.5, -z * 1.0);
    ctx.rotate(sd * (0.2 + flap * 1.9) + Math.sin(t * (mood === 'happy' ? 0.5 : 0.1) + sd) * 0.08);
    ctx.fillStyle = mix(dark, '#000000', 0.15);
    ctx.beginPath();
    ctx.ellipse(0, z * 0.36, z * 0.15, z * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // 몸통
  const g = ctx.createLinearGradient(-z * 0.6, 0, z * 0.6, 0);
  g.addColorStop(0, mix(dark, '#ffffff', 0.12));
  g.addColorStop(1, mix(dark, '#000000', 0.25));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, -z * 0.85, z * 0.6, z * 0.86, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = belly;
  ctx.beginPath();
  ctx.ellipse(0, -z * 0.62, z * 0.43, z * 0.58, 0, 0, Math.PI * 2);
  ctx.fill();
  if (opt.baby) {
    // 아기: 솜털 얼굴
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(0, -z * 1.3, z * 0.38, z * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = '#ffffff';
    for (const sd of [-1, 1]) (ctx.beginPath(), ctx.ellipse(sd * z * 0.2, -z * 1.33, z * 0.17, z * 0.2, 0, 0, Math.PI * 2), ctx.fill());
  }
  // 눈
  const look = (opt.look ?? 0) * z * 0.05;
  for (const sd of [-1, 1]) {
    const ex = sd * z * 0.2, ey = -z * 1.34, er = z * (mood === 'wow' ? 0.15 : 0.11);
    ctx.strokeStyle = '#141a2a';
    ctx.fillStyle = '#141a2a';
    ctx.lineWidth = Math.max(1, z * 0.08);
    if (mood === 'proud' || mood === 'happy') {
      ctx.beginPath();
      ctx.arc(ex, ey + er * 0.4, er * 0.8, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else if (mood === 'strain') {
      ctx.beginPath();
      ctx.moveTo(ex - sd * er * 0.7, ey - er * 0.6);
      ctx.lineTo(ex + sd * er * 0.5, ey);
      ctx.lineTo(ex - sd * er * 0.7, ey + er * 0.6);
      ctx.stroke();
    } else if (mood === 'dizzy') {
      ctx.beginPath();
      for (let a = 0; a < 12; a++) {
        const an = a * 0.9 + t * 0.3 * sd, rr = er * 0.09 * a;
        ctx.lineTo(ex + Math.cos(an) * rr, ey + Math.sin(an) * rr);
      }
      ctx.stroke();
    } else if (mood === 'sleep') {
      ctx.beginPath();
      ctx.moveTo(ex - er * 0.8, ey);
      ctx.lineTo(ex + er * 0.8, ey);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(ex + look, ey, er, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex + look - er * 0.3, ey - er * 0.3, er * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // 볼
  ctx.fillStyle = 'rgba(255,150,180,.75)';
  for (const sd of [-1, 1]) (ctx.beginPath(), ctx.ellipse(sd * z * 0.33, -z * 1.15, z * 0.1, z * 0.06, 0, 0, Math.PI * 2), ctx.fill());
  // 부리
  ctx.fillStyle = '#ff9a1f';
  ctx.beginPath();
  const open = mood === 'wow' || mood === 'happy' || mood === 'strain' ? z * 0.08 : 0;
  ctx.moveTo(-z * 0.12, -z * 1.2);
  ctx.lineTo(z * 0.12, -z * 1.2);
  ctx.lineTo(0, -z * 1.03 - open * 0.3);
  ctx.fill();
  if (open) {
    ctx.fillStyle = '#e0701a';
    ctx.beginPath();
    ctx.moveTo(-z * 0.09, -z * 1.16 + open);
    ctx.lineTo(z * 0.09, -z * 1.16 + open);
    ctx.lineTo(0, -z * 1.02 + open);
    ctx.fill();
  }
  // 목도리
  if (opt.scarf) {
    ctx.fillStyle = opt.scarf;
    ctx.beginPath();
    ctx.roundRect(-z * 0.5, -z * 1.04, z * 1.0, z * 0.17, z * 0.08);
    ctx.fill();
    ctx.beginPath();
    const fl = Math.sin(t * 0.3) * z * 0.12;
    ctx.moveTo(z * 0.25, -z * 0.95);
    ctx.lineTo(z * 0.55 + fl, -z * 0.7);
    ctx.lineTo(z * 0.38 + fl, -z * 0.62);
    ctx.lineTo(z * 0.12, -z * 0.92);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    for (let k = 0; k < 3; k++) ctx.fillRect(-z * 0.35 + k * z * 0.3, -z * 1.02, z * 0.08, z * 0.13);
  }
  ctx.restore();
}

/** 물개 (옆모습, 얼음 조각 위에 엎드려 구경) */
function drawSeal(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, t: number, mood: 'calm' | 'clap' | 'laugh' | 'wow') {
  ctx.save();
  ctx.translate(x, y);
  const bob = mood === 'clap' || mood === 'laugh' ? Math.abs(Math.sin(t * 0.3)) * z * 0.12 : Math.sin(t * 0.05) * z * 0.03;
  // 몸
  const g = ctx.createLinearGradient(0, -z * 1.2, 0, 0);
  g.addColorStop(0, '#b9c4cf');
  g.addColorStop(1, '#6f7c8a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-z * 1.5, -z * 0.15);
  ctx.quadraticCurveTo(-z * 1.0, -z * 0.75, z * 0.2, -z * 0.85 - bob);
  ctx.quadraticCurveTo(z * 0.85, -z * 0.7 - bob, z * 0.8, -z * 0.05);
  ctx.quadraticCurveTo(0, z * 0.1, -z * 1.5, -z * 0.15);
  ctx.fill();
  // 꼬리 지느러미
  ctx.fillStyle = '#6f7c8a';
  ctx.beginPath();
  ctx.moveTo(-z * 1.4, -z * 0.18);
  ctx.lineTo(-z * 1.95, -z * 0.45 + Math.sin(t * 0.1) * z * 0.05);
  ctx.lineTo(-z * 1.85, z * 0.02);
  ctx.fill();
  // 점무늬
  ctx.fillStyle = 'rgba(70,80,95,.35)';
  for (let k = 0; k < 5; k++) (ctx.beginPath(), ctx.arc(-z * 1.0 + k * z * 0.32, -z * 0.45 + (k % 2) * z * 0.15, z * 0.06, 0, Math.PI * 2), ctx.fill());
  // 머리
  const hx = z * 0.55, hy = -z * 1.15 - bob;
  ctx.fillStyle = '#aab6c2';
  ctx.beginPath();
  ctx.ellipse(hx, hy, z * 0.48, z * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c9d2db';
  ctx.beginPath();
  ctx.ellipse(hx + z * 0.28, hy + z * 0.12, z * 0.24, z * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  // 눈 (큰 까만 눈)
  ctx.fillStyle = '#10141c';
  for (const dx of [0.02, 0.32]) {
    ctx.beginPath();
    if (mood === 'laugh') (ctx.lineWidth = Math.max(1, z * 0.08), (ctx.strokeStyle = '#10141c'), ctx.arc(hx + dx * z, hy - z * 0.05, z * 0.09, Math.PI * 1.1, Math.PI * 1.9), ctx.stroke());
    else (ctx.arc(hx + dx * z, hy - z * 0.08, z * (mood === 'wow' ? 0.12 : 0.1), 0, Math.PI * 2), ctx.fill());
  }
  ctx.fillStyle = '#ffffff';
  if (mood !== 'laugh') for (const dx of [0.0, 0.3]) (ctx.beginPath(), ctx.arc(hx + dx * z, hy - z * 0.12, z * 0.035, 0, Math.PI * 2), ctx.fill());
  // 코 · 입 · 수염
  ctx.fillStyle = '#2a2f38';
  ctx.beginPath();
  ctx.ellipse(hx + z * 0.42, hy + z * 0.06, z * 0.07, z * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
  if (mood === 'laugh' || mood === 'clap' || mood === 'wow') {
    ctx.fillStyle = '#7a2a3a';
    ctx.beginPath();
    ctx.ellipse(hx + z * 0.3, hy + z * 0.24, z * 0.1, z * (mood === 'wow' ? 0.09 : 0.06), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(40,45,55,.7)';
  ctx.lineWidth = 0.8;
  for (const k of [-1, 0, 1]) (ctx.beginPath(), ctx.moveTo(hx + z * 0.42, hy + z * 0.1), ctx.lineTo(hx + z * 0.85, hy + z * (0.05 + k * 0.1)), ctx.stroke());
  // 앞 지느러미 (박수!)
  const clap = mood === 'clap' ? Math.abs(Math.sin(t * 0.55)) : 0.15;
  ctx.fillStyle = '#7d8a98';
  for (const sd of [-1, 1]) {
    ctx.save();
    ctx.translate(z * 0.25, -z * 0.55 - bob * 0.5);
    ctx.rotate(-0.9 - sd * (0.35 * clap) + (mood === 'clap' ? -0.5 : 0.4));
    ctx.beginPath();
    ctx.ellipse(0, -z * 0.28, z * 0.11, z * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

/** 눈사람. head=false면 머리가 굴러간 뒤 */
function drawSnowman(ctx: CanvasRenderingContext2D, x: number, yb: number, z: number, t: number, head: boolean, mood: 'calm' | 'wow' | 'happy' = 'calm') {
  ctx.save();
  ctx.translate(x, yb);
  ctx.fillStyle = 'rgba(50,80,130,.25)';
  ctx.beginPath();
  ctx.ellipse(0, 0, z * 1.15, z * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  const ball = (cy: number, r: number) => {
    const g = ctx.createRadialGradient(-r * 0.35, cy - r * 0.35, r * 0.1, 0, cy, r * 1.05);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.7, '#eef5fb');
    g.addColorStop(1, '#bcd2e6');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, cy, r, 0, Math.PI * 2);
    ctx.fill();
  };
  ball(-z * 0.9, z);
  // 팔 (나뭇가지)
  ctx.strokeStyle = '#6b4a2e';
  ctx.lineWidth = Math.max(1.2, z * 0.1);
  ctx.lineCap = 'round';
  for (const sd of [-1, 1]) {
    const wv = Math.sin(t * 0.1 + sd) * z * 0.1 * (mood === 'happy' ? 3 : 1);
    ctx.beginPath();
    ctx.moveTo(sd * z * 0.6, -z * 2.05);
    ctx.lineTo(sd * z * 1.35, -z * 2.5 - wv);
    ctx.moveTo(sd * z * 1.1, -z * 2.35 - wv * 0.7);
    ctx.lineTo(sd * z * 1.25, -z * 2.75 - wv);
    ctx.stroke();
  }
  ball(-z * 2.15, z * 0.72);
  ctx.fillStyle = '#2a2a33';
  for (let k = 0; k < 3; k++) (ctx.beginPath(), ctx.arc(0, -z * (1.6 + k * 0.4), z * 0.08, 0, Math.PI * 2), ctx.fill());
  if (head) {
    // 목도리
    ctx.fillStyle = '#e8485a';
    ctx.beginPath();
    ctx.roundRect(-z * 0.62, -z * 2.88, z * 1.24, z * 0.22, z * 0.1);
    ctx.fill();
    ctx.fillRect(z * 0.2, -z * 2.75, z * 0.2, z * 0.5);
    ball(-z * 3.3, z * 0.52);
    // 눈·코·입
    ctx.fillStyle = '#1f1f28';
    for (const sd of [-1, 1]) (ctx.beginPath(), ctx.arc(sd * z * 0.18, -z * 3.42, z * (mood === 'wow' ? 0.09 : 0.065), 0, Math.PI * 2), ctx.fill());
    ctx.fillStyle = '#ff8a2a';
    ctx.beginPath();
    ctx.moveTo(-z * 0.03, -z * 3.32);
    ctx.lineTo(z * 0.45, -z * 3.25);
    ctx.lineTo(-z * 0.03, -z * 3.2);
    ctx.fill();
    ctx.fillStyle = '#1f1f28';
    for (let k = 0; k < 4; k++) (ctx.beginPath(), ctx.arc(-z * 0.18 + k * z * 0.12, -z * 3.08 + (mood === 'wow' ? 0 : Math.sin(((k + 0.5) / 4) * Math.PI) * z * 0.05), z * 0.035, 0, Math.PI * 2), ctx.fill());
    // 양동이 모자
    ctx.fillStyle = '#4a6fa5';
    ctx.beginPath();
    ctx.moveTo(-z * 0.38, -z * 3.7);
    ctx.lineTo(-z * 0.28, -z * 4.05);
    ctx.lineTo(z * 0.28, -z * 4.05);
    ctx.lineTo(z * 0.38, -z * 3.7);
    ctx.fill();
  } else {
    // 머리 빠진 자리: 눈가루
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    for (let k = 0; k < 4; k++) (ctx.beginPath(), ctx.arc(-z * 0.3 + k * z * 0.2, -z * 2.85 - (k % 2) * z * 0.1, z * 0.08, 0, Math.PI * 2), ctx.fill());
  }
  ctx.restore();
}

/** 눈사람 머리 하나 (굴러가는) */
function drawHead(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, rot: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(50,80,130,.22)';
  ctx.beginPath();
  ctx.ellipse(0, z * 0.9, z * 0.9, z * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(rot);
  ctx.fillStyle = '#f6fbff';
  ctx.beginPath();
  ctx.arc(0, 0, z, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#bcd2e6';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#1f1f28';
  for (const sd of [-1, 1]) (ctx.beginPath(), ctx.arc(sd * z * 0.32, -z * 0.2, z * 0.13, 0, Math.PI * 2), ctx.fill());
  ctx.fillStyle = '#ff8a2a';
  ctx.beginPath();
  ctx.moveTo(0, z * 0.05);
  ctx.lineTo(z * 0.85, z * 0.15);
  ctx.lineTo(0, z * 0.3);
  ctx.fill();
  ctx.restore();
}

/** 물고기 창고 (나무 상자 + 삐져나온 물고기 꼬리 + 눈 모자) */
function drawCrate(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(50,80,130,.25)';
  ctx.beginPath();
  ctx.ellipse(0, z * 0.1, z * 1.15, z * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  // 물고기 꼬리 (상자 위로)
  const fishCol = ['#ff9f43', '#74c0fc', '#ffd43b'];
  for (let k = 0; k < 3; k++) {
    const fx = (k - 1) * z * 0.5, wig = Math.sin(t * 0.15 + k) * z * 0.06;
    ctx.fillStyle = fishCol[k];
    ctx.beginPath();
    ctx.ellipse(fx, -z * 1.05, z * 0.16, z * 0.32, (k - 1) * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(fx + (k - 1) * z * 0.12, -z * 1.3);
    ctx.lineTo(fx - z * 0.2 + wig, -z * 1.6);
    ctx.lineTo(fx + z * 0.2 + wig, -z * 1.6);
    ctx.fill();
  }
  // 상자
  ctx.fillStyle = '#b07a45';
  ctx.fillRect(-z * 0.9, -z * 0.95, z * 1.8, z * 0.95);
  ctx.fillStyle = '#c8925a';
  ctx.fillRect(-z * 0.9, -z * 1.1, z * 1.8, z * 0.2);
  ctx.strokeStyle = '#7a5230';
  ctx.lineWidth = Math.max(1, z * 0.08);
  for (const yy of [-0.62, -0.3]) (ctx.beginPath(), ctx.moveTo(-z * 0.9, yy * z), ctx.lineTo(z * 0.9, yy * z), ctx.stroke());
  ctx.strokeRect(-z * 0.9, -z * 1.1, z * 1.8, z * 1.1);
  // 눈 모자
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(-z * 0.35, -z * 1.1, z * 0.55, z * 0.13, 0, Math.PI, 0);
  ctx.ellipse(z * 0.45, -z * 1.1, z * 0.42, z * 0.1, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = `${z * 0.8}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🐟', 0, -z * 0.48);
  ctx.restore();
}

function drawAll(ctx: CanvasRenderingContext2D, s: IglooState, w: number, h: number, th: Theme) {
  const fx = juice(s), X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w, t = s.t;
  const st = s.phase === 'storm' ? s.steps[s.si] : null, wt = s.wt;
  const gust = st && st.k === 'gust' ? st : null, fl = gust ? s.wind : null;
  // 밤 기운: 판이 저물수록 + 밤 단계 동안 확 어두워진다
  const nightAmt = st && st.k === 'night' ? Math.min(1, wt / 28, (s.end - wt) / 28) : 0;
  const dark = Math.min(1, Math.max(BASE_DARK[Math.min(7, s.stage)], nightAmt));
  const aur = Math.max(0, (dark - 0.3) / 0.7) * (st?.aurora || s.stage >= 6 || nightAmt > 0 ? 1 : 0.4);
  // 짓는 동안: 예보판의 단계를 하나씩 돌아가며(또는 톡 해서 고른 것) 실제와 같은 결과를 미리 보여 준다
  const fore = s.phase === 'build' ? foresee(s) : null;
  const acts = s.steps.map((q, k) => (q.k === 'night' ? -1 : k)).filter((k) => k >= 0);
  const pv = !fore ? -1 : s.pin >= 0 ? s.pin : acts[Math.floor(s.pt / PREVIEW) % acts.length];
  const pre = fore && pv >= 0 ? fore[pv] : null, pst = pv >= 0 ? s.steps[pv] : null;
  // 밤에 얼 벽 (지금 판에서 돌려 본 결과)
  const willFreeze = new Uint8Array(N);
  if (fore) for (const f of fore) for (const i of f.frozen ?? []) willFreeze[i] = 1;
  if (s.phase === 'storm' && s.steps.slice(s.si).some((q) => q.k === 'night')) for (let i = 0; i < N; i++) if (s.K[i] === WALL && s.mk[i]) willFreeze[i] = 1;
  const fade = gust ? (wt < s.impact + HOLD ? 1 : Math.max(0, 1 - (wt - s.impact - HOLD) / RECEDE)) : 0;
  const windNow = (i: number) => !!(gust && fl && s.arrive[i] >= 0 && fl.lvl[i] > 0 && wt >= s.arrive[i] && fade > 0);
  const poly = (pts: number[]) => {
    ctx.beginPath();
    ctx.moveTo(X(pts[0]), Y(pts[1]));
    for (let k = 2; k < pts.length; k += 2) ctx.lineTo(X(pts[k]), Y(pts[k + 1]));
    ctx.closePath();
  };
  const quad = (c0: number, r0: number, c1: number, r1: number, z = 0) => poly([PX(c0, r0), PY(r0, z), PX(c1, r0), PY(r0, z), PX(c1, r1), PY(r1, z), PX(c0, r1), PY(r1, z)]);
  /** 칸 위 상자: 옆면 → 앞면 → 윗면 */
  const box = (c0: number, r0: number, c1: number, r1: number, z: number, top: string | CanvasGradient, front: string | CanvasGradient, side: string) => {
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
    for (let k = 0; k < 6 && rec.some((q) => s.t - q.t < 40 && Math.abs(q.x - x) < w * 0.16 && Math.abs(q.y - y) < size + 4); k++) y -= size + 5;
    y = Math.max(Y(0.31), y);
    rec.push({ x, y, t: s.t });
    if (rec.length > 12) rec.shift();
    fx.pop(Math.max(w * 0.14, Math.min(w * 0.86, x)), y, text, col, size);
  };
  const label = (text: string, x: number, y: number, size: number, col = '#ffffff', stroke = 'rgba(20,40,80,.7)') => {
    ctx.font = `900 ${R(size)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.strokeStyle = stroke;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = col;
    ctx.fillText(text, x, y);
  };
  /** 바람이 부는 방향 (화면 단위 벡터) */
  const windDir = (q: Step | null, i: number): [number, number] => {
    if (!q || q.from === 'F') return [0, -1];
    if (q.from === 'L') return [1, 0];
    if (q.from === 'R') return [-1, 0];
    const dc = colOf(i) - colOf(s.wc), dr = rowOf(i) - rowOf(s.wc), L = Math.hypot(dc, dr) || 1;
    return [dc / L, -dr / L];
  };
  const glows: { x: number; y: number; r: number; col: string }[] = [];

  ctx.save();
  fx.begin(ctx);
  // ── 하늘 ──
  const sk = SKY[Math.min(SKY.length - 1, s.stage)];
  const sky = ctx.createLinearGradient(0, 0, 0, Y(HOR + 0.06));
  sky.addColorStop(0, mix(sk[0], '#070d2c', nightAmt * 0.85));
  sky.addColorStop(1, mix(sk[1], '#26306c', nightAmt * 0.85));
  ctx.fillStyle = sky;
  ctx.fillRect(-10, -10, w + 20, Y(HOR + 0.06) + 12);
  if (dark > 0.2)
    for (let k = 0; k < 40; k++) {
      ctx.fillStyle = `rgba(255,255,255,${(dark - 0.2) * (0.5 + 0.5 * Math.abs(Math.sin(t / 30 + k)))})`;
      const sz = k % 7 ? 1.4 : 2.2;
      ctx.fillRect(hsh(k) * w, Y(0.2 + hsh(k + 40) * 0.07), sz, sz);
    }
  // 오로라 (밤·후반 판)
  if (aur > 0.02) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const cols = ['#3dffa8', '#47d6ff', '#b48cff'];
    for (let k = 0; k < 3; k++) {
      const yb = 0.2 + k * 0.022, top = (x: number) => yb + 0.018 * Math.sin(x * 4.2 + t * 0.012 + k * 2.1) + 0.008 * Math.sin(x * 11 + t * 0.02 + k);
      const g = ctx.createLinearGradient(0, Y(yb - 0.03), 0, Y(yb + 0.08));
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.35, cols[k]);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = aur * (0.55 - k * 0.1) * (0.8 + 0.2 * Math.sin(t * 0.03 + k));
      ctx.fillStyle = g;
      ctx.beginPath();
      for (let x = -0.05; x <= 1.06; x += 0.03) ctx.lineTo(X(x), Y(top(x)));
      for (let x = 1.06; x >= -0.05; x -= 0.03) ctx.lineTo(X(x), Y(top(x) + 0.05 + 0.02 * Math.sin(x * 7 + t * 0.015 + k)));
      ctx.fill();
      // 커튼 줄
      ctx.strokeStyle = cols[k];
      ctx.lineWidth = 1.2;
      for (let q = 0; q < 26; q++) {
        const x = (q / 26 + k * 0.013) % 1, y0 = top(x);
        ctx.globalAlpha = aur * 0.18 * Math.abs(Math.sin(t * 0.02 + q * 1.3 + k));
        ctx.beginPath();
        ctx.moveTo(X(x), Y(y0));
        ctx.lineTo(X(x), Y(y0 + 0.045));
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  // 해 · 달
  {
    const p = s.stage / (STAGE_COUNT - 1), mx = X(0.16 + 0.55 * p), my = Y(0.238 + 0.02 * p);
    ctx.save();
    if (dark < 0.45 && nightAmt < 0.5) {
      ctx.shadowColor = dark > 0.1 ? '#ff9d7a' : '#fff4c0';
      ctx.shadowBlur = R(0.09);
      ctx.fillStyle = dark > 0.1 ? '#ffc2a0' : '#fff8d8';
      ctx.beginPath();
      ctx.arc(mx, my, R(0.032), 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.shadowColor = '#dfe8ff';
      ctx.shadowBlur = R(0.06);
      ctx.fillStyle = '#f2f5ff';
      ctx.beginPath();
      ctx.arc(X(0.62), Y(0.238), R(0.026), 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = mix(sk[1], '#26306c', nightAmt * 0.85);
      ctx.beginPath();
      ctx.arc(X(0.633), Y(0.232), R(0.022), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  // ── 뒤쪽 눈 덮인 산 · 전나무 · 얼음낚시 오두막 (판 뒤) ──
  {
    for (const [base, col, amp, seed] of [[0.285, '#c3d3ea', 0.05, 3], [0.302, '#a6bedc', 0.032, 11]] as [number, string, number, number][]) {
      const pts: [number, number][] = [];
      for (let k = 0; k <= 9; k++) pts.push([-0.05 + k * 0.125, base - amp * (0.4 + 0.6 * hsh(k + seed)) * (k % 2 ? 1 : 0.55)]);
      ctx.fillStyle = mix(col, '#2a3566', dark * 0.6);
      ctx.beginPath();
      ctx.moveTo(-10, Y(Y0));
      for (const [x, y] of pts) ctx.lineTo(X(x), Y(y));
      ctx.lineTo(w + 10, Y(Y0));
      ctx.fill();
      // 봉우리 눈
      ctx.fillStyle = mix('#ffffff', '#9aa8d0', dark * 0.5);
      for (let k = 1; k < pts.length; k += 2) {
        const [x, y] = pts[k], [x0, y0] = pts[k - 1], [x1, y1] = pts[k + 1] ?? pts[k];
        const f = 0.32;
        ctx.beginPath();
        ctx.moveTo(X(x), Y(y));
        ctx.lineTo(X(x + (x1 - x) * f), Y(y + (y1 - y) * f));
        ctx.lineTo(X(x + (x1 - x) * f * 0.5), Y(y + (y1 - y) * f * 0.75));
        ctx.lineTo(X(x), Y(y + (Math.max(y0, y1) - y) * f * 0.6));
        ctx.lineTo(X(x + (x0 - x) * f * 0.5), Y(y + (y0 - y) * f * 0.75));
        ctx.lineTo(X(x + (x0 - x) * f), Y(y + (y0 - y) * f));
        ctx.fill();
      }
    }
    // 판 뒤 눈 언덕
    const dg = ctx.createLinearGradient(0, Y(0.29), 0, Y(Y0 + 0.02));
    dg.addColorStop(0, mix('#f4f9ff', '#5d6aa0', dark * 0.7));
    dg.addColorStop(1, mix('#dde9f6', '#46528a', dark * 0.7));
    ctx.fillStyle = dg;
    ctx.beginPath();
    ctx.moveTo(-10, Y(Y0 + 0.03));
    for (let x = -0.02; x <= 1.03; x += 0.04) ctx.lineTo(X(x), Y(0.302 - 0.014 * Math.sin(x * 4 + 2.2) - 0.006 * Math.sin(x * 11)));
    ctx.lineTo(w + 10, Y(Y0 + 0.03));
    ctx.fill();
    // 전나무 (눈 얹힌)
    const tree = (px0: number, py0: number, sz: number) => {
      const bx = X(px0), by = Y(py0), th2 = R(0.09 * sz);
      ctx.fillStyle = 'rgba(40,60,100,.18)';
      ctx.beginPath();
      ctx.ellipse(bx, by, R(0.03 * sz), R(0.006 * sz), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5b3d26';
      ctx.fillRect(bx - R(0.004 * sz), by - R(0.014 * sz), R(0.008 * sz), R(0.014 * sz));
      for (let q = 0; q < 3; q++) {
        const ty = by - R(0.012 * sz) - q * th2 * 0.27, tw = R((0.034 - q * 0.008) * sz);
        ctx.fillStyle = mix('#2f6b55', '#1d2d48', dark * 0.7);
        ctx.beginPath();
        ctx.moveTo(bx - tw, ty);
        ctx.lineTo(bx, ty - th2 * 0.42);
        ctx.lineTo(bx + tw, ty);
        ctx.fill();
        ctx.fillStyle = mix('#ffffff', '#a8b4d8', dark * 0.5);
        ctx.beginPath();
        ctx.moveTo(bx - tw * 0.55, ty - th2 * 0.17);
        ctx.lineTo(bx, ty - th2 * 0.42);
        ctx.lineTo(bx + tw * 0.55, ty - th2 * 0.17);
        ctx.quadraticCurveTo(bx, ty - th2 * 0.1, bx - tw * 0.55, ty - th2 * 0.17);
        ctx.fill();
      }
    };
    for (const [x0, y0, sz] of [[0.04, 0.325, 1.1], [0.11, 0.315, 0.8], [0.9, 0.32, 1.0], [0.965, 0.33, 1.2], [0.3, 0.3, 0.55], [0.62, 0.298, 0.5]] as [number, number, number][]) tree(x0, y0, sz);
    // 얼음낚시 오두막 (밤엔 창에 불, 굴뚝 연기)
    {
      const hx = X(0.79), hy = Y(0.312);
      ctx.fillStyle = mix('#b5523b', '#4a2a3a', dark * 0.6);
      ctx.fillRect(hx - R(0.032), hy - R(0.028), R(0.064), R(0.028));
      ctx.fillStyle = mix('#ffffff', '#b0bce0', dark * 0.5);
      ctx.beginPath();
      ctx.moveTo(hx - R(0.042), hy - R(0.026));
      ctx.lineTo(hx, hy - R(0.054));
      ctx.lineTo(hx + R(0.042), hy - R(0.026));
      ctx.fill();
      ctx.fillStyle = '#6b4a3a';
      ctx.fillRect(hx + R(0.015), hy - R(0.056), R(0.008), R(0.016));
      ctx.fillStyle = dark > 0.2 ? '#ffd27a' : '#5a6f8a';
      ctx.fillRect(hx - R(0.012), hy - R(0.02), R(0.016), R(0.012));
      if (dark > 0.2) glows.push({ x: hx - R(0.004), y: hy - R(0.014), r: R(0.035), col: '#ffcf6a' });
      for (let q = 0; q < 4; q++) {
        const a = ((t * 0.01 + q / 4) % 1);
        ctx.fillStyle = `rgba(235,240,250,${0.45 * (1 - a)})`;
        ctx.beginPath();
        ctx.arc(hx + R(0.019) + a * R(0.03) + Math.sin(t * 0.05 + q) * R(0.004), hy - R(0.06) - a * R(0.05), R(0.006 + a * 0.01), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  // ── 얼음 바다 (판 앞과 양옆) · 떠다니는 얼음 조각 ──
  const SF = Y1 + 0.12;
  {
    const sea = ctx.createLinearGradient(0, Y(Y0), 0, Y(SF));
    sea.addColorStop(0, mix('#4f8fb8', '#1a2d5a', dark * 0.6));
    sea.addColorStop(1, mix('#1f4f7e', '#0e1838', dark * 0.6));
    ctx.fillStyle = sea;
    ctx.fillRect(-10, Y(Y0 + 0.005), w + 20, Y(SF - Y0) + 2);
    const deep = ctx.createLinearGradient(0, Y(SF), 0, h);
    deep.addColorStop(0, mix('#1f4f7e', '#0e1838', dark * 0.6));
    deep.addColorStop(1, mix('#12304f', '#080f26', dark * 0.6));
    ctx.fillStyle = deep;
    ctx.fillRect(-10, Y(SF), w + 20, h - Y(SF) + 10);
    ctx.lineWidth = 1.3;
    for (let k = 0; k < 7; k++) {
      const p = (k / 7 + t * 0.0012) % 1, yy = Y0 + 0.02 + p * (SF - Y0 - 0.02);
      ctx.strokeStyle = `rgba(200,235,255,${0.1 + 0.18 * p})`;
      ctx.beginPath();
      for (let x = -0.02; x <= 1.03; x += 0.03) ctx.lineTo(X(x), Y(yy + 0.003 * Math.sin(x * 16 + k + t * 0.03)));
      ctx.stroke();
    }
    // 얼음 조각들
    for (let k = 0; k < 6; k++) {
      const fx0 = ((hsh(k + 2) + t * 0.00012 * (k % 2 ? 1 : -1)) % 1 + 1) % 1, fy0 = Y1 + 0.03 + hsh(k + 9) * 0.075, fw = 0.03 + hsh(k) * 0.04;
      if (fx0 > 0.12 && fx0 < 0.88 && fy0 < Y1 + 0.06) continue;
      ctx.fillStyle = mix('#cfe9f7', '#5a6f9c', dark * 0.5);
      ctx.beginPath();
      ctx.ellipse(X(fx0), Y(fy0) + R(0.004), R(fw), R(fw * 0.3), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = mix('#ffffff', '#a9b6dc', dark * 0.5);
      ctx.beginPath();
      ctx.ellipse(X(fx0), Y(fy0), R(fw * 0.95), R(fw * 0.26), 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // ── 디오라마 땅덩어리: 눈 덮인 빙판, 옆면은 얼음층 ──
  const T = 0.068;
  {
    // 물에 드리운 그림자
    ctx.fillStyle = 'rgba(5,20,45,.35)';
    ctx.beginPath();
    ctx.ellipse(X(0.5), Y(Y1 + T + 0.01), R(0.48), R(0.018), 0, 0, Math.PI * 2);
    ctx.fill();
    const strata = (pts: number[], deep: boolean) => {
      const g = ctx.createLinearGradient(0, Y(Y1 - (deep ? 0 : 0.3)), 0, Y(Y1 + T));
      g.addColorStop(0, mix('#d9f3ff', '#5b6ea8', dark * 0.5));
      g.addColorStop(0.3, mix('#9fdcf2', '#3e5590', dark * 0.5));
      g.addColorStop(0.7, mix('#5fb4dc', '#2b3f78', dark * 0.5));
      g.addColorStop(1, mix('#2f7fb5', '#1a2858', dark * 0.5));
      ctx.fillStyle = g;
      poly(pts);
      ctx.fill();
    };
    // 양옆 (경사진 가장자리 아래로 얼음)
    const SL = 0.02;
    strata([PX(0, 0), PY(0), PX(0, ROWS), PY(ROWS), PX(0, ROWS) - SL, PY(ROWS) + T, PX(0, 0) - SL, PY(0) + T * 0.5], false);
    strata([PX(COLS, 0), PY(0), PX(COLS, ROWS), PY(ROWS), PX(COLS, ROWS) + SL, PY(ROWS) + T, PX(COLS, 0) + SL, PY(0) + T * 0.5], false);
    // 옆면 그늘 (빛은 왼쪽 위에서)
    ctx.fillStyle = 'rgba(10,40,90,.18)';
    poly([PX(COLS, 0), PY(0), PX(COLS, ROWS), PY(ROWS), PX(COLS, ROWS) + SL, PY(ROWS) + T, PX(COLS, 0) + SL, PY(0) + T * 0.5]);
    ctx.fill();
    // 앞면
    strata([PX(0, ROWS), PY(ROWS), PX(COLS, ROWS), PY(ROWS), PX(COLS, ROWS) + SL, PY(ROWS) + T, PX(0, ROWS) - SL, PY(ROWS) + T], true);
    const x0 = PX(0, ROWS) - SL * 0.5, x1 = PX(COLS, ROWS) + SL * 0.5;
    // 얼음층 줄 · 금 · 갇힌 공기방울 · 얼어붙은 물고기
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.lineWidth = 1;
    for (const f of [0.38, 0.62, 0.84]) {
      ctx.beginPath();
      for (let x = x0; x <= x1 + 0.001; x += 0.02) ctx.lineTo(X(x), Y(Y1 + T * f + 0.003 * Math.sin(x * 23 + f * 9)));
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,.45)';
    for (let k = 0; k < 5; k++) {
      const cx0 = x0 + 0.05 + hsh(k + 3) * (x1 - x0 - 0.1);
      ctx.beginPath();
      ctx.moveTo(X(cx0), Y(Y1 + T * 0.3));
      ctx.lineTo(X(cx0 + 0.01), Y(Y1 + T * 0.55));
      ctx.lineTo(X(cx0 - 0.004), Y(Y1 + T * 0.8));
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    for (let k = 0; k < 14; k++) (ctx.beginPath(), ctx.arc(X(x0 + 0.02 + hsh(k + 20) * (x1 - x0 - 0.04)), Y(Y1 + T * (0.35 + hsh(k + 31) * 0.55)), R(0.0025 + hsh(k) * 0.002), 0, Math.PI * 2), ctx.fill());
    ctx.fillStyle = 'rgba(255,170,90,.45)';
    {
      const fx2 = X(x0 + (x1 - x0) * 0.72), fy2 = Y(Y1 + T * 0.68);
      ctx.beginPath();
      ctx.ellipse(fx2, fy2, R(0.013), R(0.006), 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(fx2 - R(0.012), fy2);
      ctx.lineTo(fx2 - R(0.022), fy2 - R(0.006));
      ctx.lineTo(fx2 - R(0.022), fy2 + R(0.006));
      ctx.fill();
    }
    // 위 눈 덮개 (가장자리로 흘러내린 눈)
    ctx.fillStyle = mix('#ffffff', '#a8b4dc', dark * 0.45);
    ctx.beginPath();
    ctx.moveTo(X(x0), Y(Y1));
    for (let x = x0; x <= x1 + 0.001; x += 0.015) ctx.lineTo(X(x), Y(Y1 + 0.009 + 0.006 * Math.abs(Math.sin(x * 31)) + (hsh(Math.floor(x * 67)) > 0.82 ? 0.01 : 0)));
    ctx.lineTo(X(x1), Y(Y1));
    ctx.fill();
    // 물에 닿는 거품
    ctx.strokeStyle = 'rgba(230,248,255,.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = x0 - 0.02; x <= x1 + 0.02; x += 0.02) ctx.lineTo(X(x), Y(Y1 + T + 0.003 * Math.sin(x * 20 + t * 0.06)));
    ctx.stroke();
    // 양옆 가장자리 눈 덮개 (울퉁불퉁 흘러내린 눈)
    ctx.fillStyle = mix('#ffffff', '#a8b4dc', dark * 0.45);
    for (const sd of [0, 1])
      for (let k = 0; k <= 14; k++) {
        const vr = (k / 14) * ROWS, ex = PX(sd * COLS, vr) + (sd ? 0.004 : -0.004), ey = PY(vr) + 0.006;
        ctx.beginPath();
        ctx.ellipse(X(ex), Y(ey), R(0.012 + 0.005 * hsh(k + sd * 20)), R(0.009 + 0.006 * hsh(k + 7 + sd * 20)), 0, 0, Math.PI * 2);
        ctx.fill();
      }
  }
  // ── 눈밭 칸 ──
  for (let vr = 0; vr < ROWS; vr++)
    for (let c = 0; c < COLS; c++) {
      const i = (ROWS - 1 - vr) * COLS + c;
      const edgeK = (c === 0 || c === COLS - 1 ? 0.25 : 0) + (vr === 0 ? 0.2 : 0);
      const base = mix('#f2f7fc', '#d3e2f1', hsh(i * 7 + s.stage) * 0.35 + (1 - vr / ROWS) * 0.3 + edgeK);
      ctx.fillStyle = mix(base, '#c4d9ee', s.gust[i] * 0.5);
      quad(c - 0.01, vr - 0.01, c + 1.01, vr + 1.01);
      ctx.fill();
    }
  // 바람 자국 (눈 물결)
  ctx.strokeStyle = 'rgba(110,150,205,.16)';
  ctx.lineWidth = 1.2;
  for (let vr = 0; vr < ROWS; vr++)
    for (const f of [0.32, 0.74]) {
      ctx.beginPath();
      for (let c = 0; c <= COLS; c += 0.2) ctx.lineTo(X(PX(c, vr + f)), Y(PY(vr + f) + 0.005 * Math.sin(c * 2.1 + vr * 1.9 + f * 7)));
      ctx.stroke();
    }
  // 반짝이 · 펭귄 발자국
  for (let k = 0; k < 60; k++) {
    const c = hsh(k * 3 + 1) * COLS, vr = hsh(k * 3 + 2) * ROWS, tw = Math.abs(Math.sin(t * 0.06 + k * 1.7));
    ctx.fillStyle = k % 3 ? `rgba(255,255,255,${0.5 + 0.5 * tw})` : `rgba(150,215,255,${0.3 + 0.5 * tw})`;
    const sx = X(PX(c, vr)), sy = Y(PY(vr)), sr = tw > 0.85 ? 2.2 : 1.2;
    ctx.fillRect(sx - sr / 2, sy - sr / 2, sr, sr);
  }
  for (let k = 0; k < 6; k++) {
    const i = Math.floor(hsh(k * 13 + s.stage * 7) * N);
    if (s.K[i] !== SNOW || s.fish[i] || i === s.wc) continue;
    ctx.fillStyle = 'rgba(120,150,195,.3)';
    for (let q = 0; q < 3; q++) {
      const fx2 = X(PX(colOf(i) + 0.25 + q * 0.22, vrowOf(i) + 0.3 + (q % 2) * 0.3)), fy2 = Y(PY(vrowOf(i) + 0.3 + (q % 2) * 0.3 + q * 0.08));
      for (const d of [-1, 0, 1]) (ctx.beginPath(), ctx.moveTo(fx2, fy2), ctx.lineTo(fx2 + d * R(0.006), fy2 - R(0.008)), ctx.lineWidth = 1.1, (ctx.strokeStyle = 'rgba(120,150,195,.35)'), ctx.stroke());
    }
  }
  // 칸 줄 (톡 칠 자리가 보이게)
  ctx.strokeStyle = 'rgba(100,140,200,.2)';
  ctx.lineWidth = 1;
  for (let c = 0; c <= COLS; c++) (ctx.beginPath(), ctx.moveTo(X(PX(c, 0)), Y(PY(0))), ctx.lineTo(X(PX(c, ROWS)), Y(PY(ROWS))), ctx.stroke());
  for (let vr = 0; vr <= ROWS; vr++) (ctx.beginPath(), ctx.moveTo(X(PX(0, vr)), Y(PY(vr))), ctx.lineTo(X(PX(COLS, vr)), Y(PY(vr))), ctx.stroke());
  // ── 표시: 회오리 자리 · 고드름 떨어질 칸 ──
  if (s.wc >= 0) {
    const cx2 = X(ccx(s.wc)), cy2 = Y(ccy(s.wc)), rr = R(CW * 0.38);
    ctx.save();
    ctx.translate(cx2, cy2);
    ctx.scale(1, 0.55);
    ctx.strokeStyle = 'rgba(120,90,200,.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let a = 0; a < 18; a++) {
      const an = a * 0.6 - t * 0.12, r2 = rr * (a / 18);
      ctx.lineTo(Math.cos(an) * r2, Math.sin(an) * r2);
    }
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#ffffff';
    ctx.font = `${R(0.036)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (!(gust && gust.from === 'C')) ctx.fillText('🌀', cx2, cy2 - R(0.012));
  }
  // ── 미리 보기: 바람이 들어오는 칸 (짓는 동안) ──
  const pw = pre?.wind;
  if (pw) {
    const on = (i: number) => pw.lvl[i] > 0;
    ctx.fillStyle = `rgba(80,150,235,${0.26 + 0.06 * Math.sin(t * 0.08)})`;
    for (let i = 0; i < N; i++) if (on(i)) (quad(colOf(i), vrowOf(i), colOf(i) + 1, vrowOf(i) + 1), ctx.fill());
    // 바람 화살 (방향)
    ctx.strokeStyle = 'rgba(70,130,210,.45)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < N; i++) {
      if (!on(i)) continue;
      const [dx, dy] = windDir(pst, i), ph = ((t * 0.02 + hsh(i)) % 1) - 0.5, cx2 = X(ccx(i)) + dx * ph * R(CW * 0.7), cy2 = Y(ccy(i)) + dy * ph * R(CH * 0.7);
      ctx.beginPath();
      ctx.moveTo(cx2 - dx * R(0.018), cy2 - dy * R(0.018));
      ctx.lineTo(cx2 + dx * R(0.018), cy2 + dy * R(0.018));
      ctx.stroke();
    }
    // 바람이 닿는 끝선 (점선)
    ctx.strokeStyle = 'rgba(255,255,255,.95)';
    ctx.lineWidth = 2;
    ctx.setLineDash([R(0.012), R(0.01)]);
    ctx.lineDashOffset = -t * 0.3;
    const edge = (x0: number, y0: number, x1: number, y1: number) => (ctx.beginPath(), ctx.moveTo(X(PX(x0, y0)), Y(PY(y0))), ctx.lineTo(X(PX(x1, y1)), Y(PY(y1))), ctx.stroke());
    for (let i = 0; i < N; i++) {
      if (!on(i)) continue;
      const c = colOf(i), vr = vrowOf(i), r = rowOf(i);
      if (r < ROWS - 1 && !on(i + COLS)) edge(c, vr, c + 1, vr);
      if (r > 0 && !on(i - COLS)) edge(c, vr + 1, c + 1, vr + 1);
      if (c > 0 && !on(i - 1)) edge(c, vr, c, vr + 1);
      if (c < COLS - 1 && !on(i + 1)) edge(c + 1, vr, c + 1, vr + 1);
    }
    ctx.setLineDash([]);
  }
  // 미리 보기: 눈덩이 길
  if (pre?.path && pst) {
    const p = pre.path;
    ctx.fillStyle = `rgba(255,255,255,${0.35 + 0.1 * Math.sin(t * 0.1)})`;
    for (const i of p) (quad(colOf(i) + 0.2, vrowOf(i), colOf(i) + 0.8, vrowOf(i) + 1), ctx.fill());
    ctx.strokeStyle = 'rgba(70,120,190,.7)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([R(0.012), R(0.01)]);
    ctx.lineDashOffset = -t * 0.4;
    ctx.beginPath();
    ctx.moveTo(X(ccx(p[0])), Y(PY(ROWS)));
    ctx.lineTo(X(ccx(p[p.length - 1])), Y(ccy(p[p.length - 1])));
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // ── 돌풍: 바람이 지나는 칸 ──
  if (gust && fl) {
    for (let i = 0; i < N; i++) {
      if (!windNow(i)) continue;
      const c = colOf(i), vr = vrowOf(i), age = wt - s.arrive[i], a = Math.min(1, age / 7) * fade;
      const dl = Math.min(1, (fl.lvl[i] - 1) / 5);
      ctx.globalAlpha = a * (0.4 + 0.3 * dl);
      ctx.fillStyle = mix('#9fd0ff', '#3f86d8', dl);
      quad(c - 0.02, vr - 0.02, c + 1.02, vr + 1.02);
      ctx.fill();
      ctx.globalAlpha = 1;
      // 바람 줄 (세기만큼 길다)
      const [dx, dy] = windDir(gust, i);
      ctx.strokeStyle = `rgba(255,255,255,${0.85 * a})`;
      ctx.lineWidth = 1.6;
      for (let q = 0; q < 2; q++) {
        const ph = ((t * 0.05 + hsh(i * 3 + q)) % 1) - 0.5, ox = (q - 0.5) * 0.4, len = R(0.008 + 0.004 * fl.lvl[i]);
        const cx2 = X(ccx(i)) + dx * ph * R(CW) + dy * ox * R(CW * 0.6), cy2 = Y(ccy(i)) + dy * ph * R(CH) - dx * ox * R(CH * 0.6);
        ctx.beginPath();
        ctx.moveTo(cx2 - dx * len, cy2 - dy * len);
        ctx.quadraticCurveTo(cx2, cy2 + R(0.004), cx2 + dx * len, cy2 + dy * len);
        ctx.stroke();
      }
    }
  }
  // ── 세워진 것들 (뒤 줄부터 앞 줄로) ──
  const dadMood = (): { mood: Mood; flap: number } => {
    if (s.phase === 'result') return s.ok ? { mood: 'happy', flap: 1 } : { mood: 'dizzy', flap: 0.6 };
    if (st && st.k === 'night') return { mood: 'sleep', flap: 0 };
    if (st && (fl || st.k === 'ball' || st.k === 'icicle')) {
      const hitMe = fl ? s.igloos[0].cells.some((i) => fl.hit[i] > 0) : false;
      if (wt < s.impact - 4) return hitMe ? { mood: 'strain', flap: 0.8 } : wt < APPROACH ? { mood: 'wow', flap: 0.5 } : { mood: 'calm', flap: 0.3 };
      return s.lastDmg[0] > 0 ? { mood: 'dizzy', flap: 0.2 } : { mood: 'proud', flap: 1 };
    }
    if (s.pt > 900 && s.taps === 0) return { mood: 'sleep', flap: 0 };
    return { mood: t - s.lastPlace < 40 ? 'wow' : 'calm', flap: t - s.lastPlace < 40 ? 0.6 : 0.1 };
  };
  const nightSt = st && st.k === 'night' ? st : null;
  let sliding = false;
  // ── 펭귄 식구 (바람이 닿으면 배로 미끄러져 썰매처럼 '슝~') ──
  const pengAt = (pg: Peng) => {
    let i = pg.home;
    if (s.K[i] !== SNOW || s.fish[i]) {
      let bd = 99;
      for (let j = 0; j < N; j++) {
        const d = Math.abs(rowOf(j) - rowOf(pg.home)) + Math.abs(colOf(j) - colOf(pg.home));
        if (s.K[j] === SNOW && !s.fish[j] && j !== s.wc && d < bd) (bd = d), (i = j);
      }
    }
    return i;
  };
  const drawPg = (pg: Peng) => {
    const i = pengAt(pg);
    const hx = ccx(i), hy = ccy(i) + 0.02;
    let x = hx + Math.sin((t + pg.off) * 0.02) * CW * 0.25, y = hy, mood: Mood = 'calm', flap = 0.1, tilt = 0;
    if (fl && fl.lvl[i] > 0 && wt >= s.arrive[i]) {
      const q = Math.min(1, (wt - s.arrive[i]) / (s.end - s.arrive[i])), [dx, dy] = windDir(gust, i), go = Math.sin(q * Math.PI);
      x = hx + dx * go * 0.22;
      y = hy + dy * go * 0.16;
      mood = 'happy';
      flap = 0;
      tilt = dx !== 0 ? Math.sign(dx) * Math.PI * 0.5 : Math.PI * 0.5;
      sliding = true;
    } else if (gust && wt < s.impact) (mood = 'wow'), (flap = 0.7);
    else if (s.phase === 'result') (mood = s.ok ? 'happy' : 'dizzy'), (flap = s.ok ? 1 : 0.3), (y -= s.ok ? Math.abs(Math.sin(t * 0.3 + pg.off)) * 0.012 : 0);
    else if (nightSt) mood = 'sleep';
    if (tilt) {
      ctx.strokeStyle = 'rgba(255,255,255,.8)';
      ctx.lineWidth = 1.5;
      const [dx, dy] = windDir(gust, i);
      for (let q = 0; q < 3; q++) (ctx.beginPath(), ctx.moveTo(X(x) - dx * R(0.03 + q * 0.012), Y(y) - dy * R(0.03) - R(0.01) + q * R(0.008)), ctx.lineTo(X(x) - dx * R(0.06 + q * 0.012), Y(y) - dy * R(0.06) - R(0.01) + q * R(0.008)), ctx.stroke());
    }
    drawPeng(ctx, X(x), Y(y), R(0.03), t + pg.off, mood, flap, { tilt, scarf: pg.off ? '#5fb3ff' : '#ffd43b' });
    if (tilt && wt - s.arrive[i] < 60) label('슝~', X(x), Y(y) - R(0.05), 0.036);
    if (gust && wt < APPROACH && wt > 6) label('!', X(x), Y(y) - R(0.06), 0.036);
    };
  for (let vr = 0; vr < ROWS; vr++)
    for (let c = 0; c < COLS; c++) {
      const i = (ROWS - 1 - vr) * COLS + c, k = s.K[i], age = t - s.place[i], drop = age < 10 ? Math.pow(1 - age / 10, 2) * 4 : 0;
      if (k === WALL) {
        const hh = s.Hh[i], lost = Math.max(0, s.peak[i] - hh), hit = fl && fl.hit[i] > 0 && wt >= s.arrive[i];
        ctx.save();
        ctx.translate(0, -Y(drop * HZ));
        // 밤: 맞은 벽에 서리가 낀다
        const fr = nightSt && s.mk[i] ? Math.min(1, wt / s.impact) : 0;
        const tint = (a: string) => mix(a, '#9fe6ff', fr * 0.8 + (hit ? 0.15 : 0));
        ctx.fillStyle = 'rgba(50,90,150,.28)';
        quad(c + 0.02, vr + 0.5, c + 1.08, vr + 1.0);
        ctx.fill();
        box(c + 0.07, vr + 0.12, c + 0.93, vr + 0.9, hh, tint('#ffffff'), tint('#c9dcef'), tint('#9fbbd8'));
        ctx.strokeStyle = 'rgba(80,120,180,.75)';
        ctx.lineWidth = 1.2;
        quad(c + 0.07, vr + 0.12, c + 0.93, vr + 0.9, hh);
        ctx.stroke();
        poly([PX(c + 0.07, vr + 0.9), PY(vr + 0.9), PX(c + 0.93, vr + 0.9), PY(vr + 0.9), PX(c + 0.93, vr + 0.9), PY(vr + 0.9, hh), PX(c + 0.07, vr + 0.9), PY(vr + 0.9, hh)]);
        ctx.stroke();
        // 눈 벽돌 줄눈
        ctx.strokeStyle = 'rgba(100,140,195,.55)';
        for (let z = 1; z < hh; z++) {
          ctx.beginPath();
          ctx.moveTo(X(PX(c + 0.07, vr + 0.9)), Y(PY(vr + 0.9, z)));
          ctx.lineTo(X(PX(c + 0.93, vr + 0.9)), Y(PY(vr + 0.9, z)));
          ctx.stroke();
        }
        for (let z = 0; z < hh; z++) {
          const u = z % 2 ? 0.5 : 0.3;
          for (const uu of z % 2 ? [u] : [u, u + 0.4]) (ctx.beginPath(), ctx.moveTo(X(PX(c + uu, vr + 0.9)), Y(PY(vr + 0.9, z))), ctx.lineTo(X(PX(c + uu, vr + 0.9)), Y(PY(vr + 0.9, z + 1))), ctx.stroke());
        }
        // 위 눈뭉치 (깎이면 하나씩 빠진다)
        for (let q = 0; q < 3; q++) {
          if (q < lost) continue;
          const bx = X(PX(c + 0.22 + q * 0.28, vr + 0.62)), by = Y(PY(vr + 0.62, hh));
          ctx.fillStyle = tint('#ffffff');
          ctx.beginPath();
          ctx.ellipse(bx, by, R(0.013), R(0.009), 0, Math.PI, 0);
          ctx.fill();
        }
        if (hh >= 5) label(String(hh), X(PX(c + 0.5, vr + 0.5)), Y(PY(vr + 0.5, hh + 1)), 0.036, '#ffffff', 'rgba(40,80,140,.75)');
        // 넘친 바람이 벽 위로
        if (fl && fl.over[i] && wt >= s.arrive[i] && fade > 0) {
          ctx.fillStyle = `rgba(235,248,255,${0.75 * fade})`;
          quad(c + 0.05, vr + 0.1, c + 0.95, vr + 0.92, hh + 0.3);
          ctx.fill();
        }
        ctx.restore();
      } else if (k === ICE && s.nat[i]) {
        // 얼음 바위 (빙산 조각)
        const x = X(ccx(i)), yb = Y(PY(vr + 0.82)), rw = R(CW * scl(vr) * 0.44), rh = Y(BERG_H * HZ + 0.012);
        ctx.fillStyle = 'rgba(40,80,140,.25)';
        ctx.beginPath();
        ctx.ellipse(x, yb, rw * 1.05, rw * 0.32, 0, 0, Math.PI * 2);
        ctx.fill();
        const g = ctx.createLinearGradient(x - rw, 0, x + rw, 0);
        g.addColorStop(0, '#e9fbff');
        g.addColorStop(0.5, '#a5e2f4');
        g.addColorStop(1, '#5aaed2');
        ctx.fillStyle = g;
        ctx.beginPath();
        for (let q = 0; q <= 8; q++) {
          const a = Math.PI + (q / 8) * Math.PI, rr = 0.8 + 0.35 * hsh(i * 11 + q);
          ctx.lineTo(x + Math.cos(a) * rw * rr, yb + Math.sin(a) * rh * rr * (q % 2 ? 1.1 : 0.85));
        }
        ctx.lineTo(x + rw, yb);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.7)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x - rw * 0.4, yb - rh * 0.2);
        ctx.lineTo(x - rw * 0.15, yb - rh * 0.75);
        ctx.moveTo(x + rw * 0.1, yb - rh * 0.1);
        ctx.lineTo(x + rw * 0.3, yb - rh * 0.6);
        ctx.stroke();
      } else if (k === ICE) {
        // 얼음벽: 투명한 하늘빛, 반짝
        const hh = s.Hh[i], fresh = t - s.frost[i] < 60;
        const fg = ctx.createLinearGradient(0, Y(PY(vr + 0.9, hh)), 0, Y(PY(vr + 0.9)));
        fg.addColorStop(0, '#b4f0ff');
        fg.addColorStop(1, '#3aa6d8');
        ctx.fillStyle = 'rgba(40,110,170,.3)';
        quad(c + 0.02, vr + 0.5, c + 1.08, vr + 1.0);
        ctx.fill();
        ctx.save();
        if (fresh) (ctx.shadowColor = '#bff4ff'), (ctx.shadowBlur = R(0.03) * (1 - (t - s.frost[i]) / 60));
        box(c + 0.07, vr + 0.12, c + 0.93, vr + 0.9, hh, '#dcfaff', fg, '#2b8cc0');
        ctx.restore();
        ctx.strokeStyle = 'rgba(255,255,255,.85)';
        ctx.lineWidth = 1.2;
        quad(c + 0.07, vr + 0.12, c + 0.93, vr + 0.9, hh);
        ctx.stroke();
        // 빛 줄 (사선)
        ctx.strokeStyle = 'rgba(255,255,255,.6)';
        ctx.lineWidth = 1.5;
        for (const u of [0.25, 0.42]) {
          ctx.beginPath();
          ctx.moveTo(X(PX(c + u, vr + 0.9)), Y(PY(vr + 0.9, 0.3)));
          ctx.lineTo(X(PX(c + u + 0.18, vr + 0.9)), Y(PY(vr + 0.9, hh - 0.2)));
          ctx.stroke();
        }
        // 고드름 끝 (윗면 앞 가장자리)
        ctx.fillStyle = '#e6fbff';
        for (let q = 0; q < 4; q++) {
          const bx = X(PX(c + 0.15 + q * 0.22, vr + 0.9)), by = Y(PY(vr + 0.9, hh));
          ctx.beginPath();
          ctx.moveTo(bx - R(0.005), by);
          ctx.lineTo(bx + R(0.005), by);
          ctx.lineTo(bx, by + R(0.01 + (q % 2) * 0.006));
          ctx.fill();
        }
        if (hh >= 5) label(String(hh), X(PX(c + 0.5, vr + 0.5)), Y(PY(vr + 0.5, hh + 1)), 0.036, '#ffffff', 'rgba(20,90,140,.75)');
        const tw = Math.abs(Math.sin(t * 0.07 + i));
        if (tw > 0.8) {
          ctx.fillStyle = '#ffffff';
          const sx = X(PX(c + 0.75, vr + 0.5)), sy = Y(PY(vr + 0.5, hh)) - R(0.004), sr = R(0.009) * (tw - 0.8) * 5;
          ctx.beginPath();
          ctx.moveTo(sx, sy - sr);
          ctx.lineTo(sx + sr * 0.25, sy);
          ctx.lineTo(sx, sy + sr);
          ctx.lineTo(sx - sr * 0.25, sy);
          ctx.moveTo(sx - sr, sy);
          ctx.lineTo(sx, sy + sr * 0.25);
          ctx.lineTo(sx + sr, sy);
          ctx.lineTo(sx, sy - sr * 0.25);
          ctx.fill();
        }
      } else if (k === MAN) {
        const look = gust && wt < s.impact ? 'wow' : 'calm';
        ctx.save();
        ctx.translate(0, -Y(drop * HZ));
        drawSnowman(ctx, X(ccx(i)), Y(PY(vr + 0.78)), R(CW * 0.27), t + i * 13, true, look);
        ctx.restore();
      } else if (k === IGLOO && s.igloos[s.ig[i] - 1].cells[0] === i) {
        const gi = s.ig[i] - 1, ic2 = s.igloos[gi], wide = ic2.cells.length, hp = s.hp[gi], fail = s.phase === 'result' && !s.ok;
        const hitc = fl && ic2.cells.some((j) => fl.hit[j] > 0 && wt >= s.arrive[j]) && wt < s.impact + HOLD;
        const cx2 = X(PX(c + wide / 2, vr + 0.55)), by = Y(PY(vr + 0.86)), rx = R(CW * scl(vr) * (wide > 1 ? 0.95 : 0.5)), ry = rx * (wide > 1 ? 0.92 : 0.95);
        ctx.save();
        ctx.translate(hitc ? Math.sin(t * 1.3) * 1.5 : 0, 0);
        ctx.fillStyle = 'rgba(40,80,140,.25)';
        ctx.beginPath();
        ctx.ellipse(cx2, by, rx * 1.08, rx * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();
        const crushed = hp <= 0, ryy = crushed ? ry * 0.35 : ry;
        const dg = ctx.createRadialGradient(cx2 - rx * 0.35, by - ryy * 0.75, rx * 0.1, cx2, by - ryy * 0.3, rx * 1.1);
        dg.addColorStop(0, '#ffffff');
        dg.addColorStop(0.55, hitc ? '#d4e9ff' : '#e8f2fc');
        dg.addColorStop(1, '#8fb0d2');
        ctx.fillStyle = dg;
        ctx.beginPath();
        ctx.moveTo(cx2 - rx, by);
        ctx.ellipse(cx2, by, rx, ryy, 0, Math.PI, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(80,120,180,.8)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        if (!crushed) {
          // 눈 벽돌 줄눈
          ctx.strokeStyle = 'rgba(95,135,190,.6)';
          ctx.lineWidth = 1;
          const rows = 4;
          for (let q = 1; q < rows; q++) {
            const yy = by - ryy * (q / rows), hw = rx * Math.sqrt(1 - (q / rows) ** 2);
            ctx.beginPath();
            ctx.ellipse(cx2, yy, hw, hw * 0.16, 0, 0.05, Math.PI - 0.05);
            ctx.stroke();
          }
          for (let q = 0; q < rows; q++) {
            const y0 = by - ryy * (q / rows), y1 = by - ryy * ((q + 1) / rows), hw = rx * Math.sqrt(1 - ((q + 0.5) / rows) ** 2);
            for (let u = -2; u <= 2; u++) {
              const xx = cx2 + hw * (u / 2.6 + (q % 2 ? 0.18 : 0)) * 0.95;
              if (Math.abs(xx - cx2) > hw * 0.92) continue;
              ctx.beginPath();
              ctx.moveTo(xx, y0 + R(0.002));
              ctx.lineTo(xx, y1 + R(0.004));
              ctx.stroke();
            }
          }
          // 깎인 자리 (구멍·금)
          for (let q = 0; q < ic2.max - hp; q++) {
            const hx = cx2 + rx * (q === 0 ? 0.15 : -0.35), hy = by - ryy * (q === 0 ? 0.8 : 0.55);
            ctx.fillStyle = '#5a7aa8';
            ctx.beginPath();
            ctx.ellipse(hx, hy, rx * 0.17, ryy * 0.12, 0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(70,100,150,.7)';
            ctx.beginPath();
            ctx.moveTo(hx + rx * 0.15, hy);
            ctx.lineTo(hx + rx * 0.3, hy + ryy * 0.15);
            ctx.lineTo(hx + rx * 0.25, hy + ryy * 0.3);
            ctx.stroke();
          }
          // 얼음 창 (밤엔 불빛)
          const wx = cx2 + rx * 0.5, wy = by - ryy * 0.5, wr = rx * (wide > 1 ? 0.13 : 0.18), lit = dark > 0.15 || nightSt;
          ctx.fillStyle = lit ? '#ffd88a' : '#a8e4f7';
          ctx.beginPath();
          ctx.ellipse(wx, wy, wr, wr * 1.1, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = lit ? '#e8a84a' : '#ffffff';
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(wx - wr, wy);
          ctx.lineTo(wx + wr, wy);
          ctx.moveTo(wx, wy - wr * 1.1);
          ctx.lineTo(wx, wy + wr * 1.1);
          ctx.stroke();
          if (lit) glows.push({ x: wx, y: wy, r: R(0.05), col: '#ffc861' });
          // 입구 굴 (앞) + 빼꼼 내다보는 식구
          const ex = cx2 - rx * (wide > 1 ? 0.1 : 0), eb = by + R(0.006), erx = rx * (wide > 1 ? 0.36 : 0.5), ery = erx * 0.85;
          ctx.fillStyle = '#f4f9ff';
          ctx.beginPath();
          ctx.moveTo(ex - erx, eb);
          ctx.ellipse(ex, eb, erx, ery, 0, Math.PI, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(120,160,210,.5)';
          ctx.stroke();
          ctx.fillStyle = lit ? '#6a4a3a' : '#2a3f66';
          ctx.beginPath();
          ctx.moveTo(ex - erx * 0.62, eb);
          ctx.ellipse(ex, eb, erx * 0.62, ery * 0.72, 0, Math.PI, Math.PI * 2);
          ctx.fill();
          if (lit) glows.push({ x: ex, y: eb - ery * 0.3, r: R(0.035), col: '#ffb24d' });
          // 식구 얼굴 (안 맞을 땐 빼꼼, 돌풍이 오면 쏙)
          const hide = gust && wt > APPROACH - 10 && wt < s.impact + 10;
          if (!hide && gi === 0) {
            const pk = Math.min(1, Math.max(0, (s.pt - 8) / 20)), bob = Math.sin(t * 0.08) * R(0.002);
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(ex - erx * 0.62, eb);
            ctx.ellipse(ex, eb, erx * 0.62, ery * 0.72, 0, Math.PI, Math.PI * 2);
            ctx.clip();
            const fz = erx * 0.42;
            drawPeng(ctx, ex - erx * 0.22, eb + fz * 1.65 - pk * fz * 0.6 + bob, fz, t, s.phase === 'result' && s.ok ? 'happy' : 'calm', 0.2, { look: Math.sin(t * 0.03) });
            drawPeng(ctx, ex + erx * 0.25, eb + fz * 1.3 - pk * fz * 0.45 - bob, fz * 0.7, t + 20, 'wow', 0.3, { baby: true, look: -1 });
            ctx.restore();
          }
          // 아기 펭귄이 데굴데굴 굴러 나왔다 엄마에게 끌려 들어간다 (판 시작마다)
          if (gi === 0 && s.phase !== 'result') {
            const p = s.pt, z = R(0.026);
            if (p > 30 && p < 190) {
              const out = p < 80 ? (p - 30) / 50 : p < 135 ? 1 : Math.max(0, 1 - (p - 135) / 50);
              const bx = ex + R(0.075) * out, byy = eb + R(0.055) * out;
              if (p < 80) drawPeng(ctx, bx, byy, z, t, 'dizzy', 0, { baby: true, tilt: (p - 30) * 0.35 });
              else drawPeng(ctx, bx, byy, z, t, p < 135 ? 'dizzy' : 'wow', 0.6, { baby: true });
              if (p < 95) label('데굴데굴~', bx, byy - R(0.05), 0.036);
              if (p >= 95) {
                const m = p < 125 ? (p - 95) / 30 : 1, mx = ex + (bx - ex + R(0.028)) * m, my = eb + (byy - eb) * m;
                drawPeng(ctx, mx, my, R(0.032), t, p < 135 ? 'strain' : 'calm', 0.7, { scarf: '#ff8fb1' });
                if (p > 118 && p < 170) label('이 녀석!', mx + R(0.02), my - R(0.07), 0.036, '#ffd6e8');
              }
            }
          }
        } else {
          // 무너진 눈 벽돌 더미 + 어질어질한 식구
          for (let q = 0; q < 7; q++) {
            const bx = cx2 + (hsh(q + gi * 9) - 0.5) * rx * 2.1, byy = by - R(0.004) - hsh(q + 3) * ryy * 1.4, bw = rx * (0.22 + hsh(q + 5) * 0.1);
            ctx.save();
            ctx.translate(bx, byy);
            ctx.rotate((hsh(q + 7) - 0.5) * 1.4);
            ctx.fillStyle = '#f6faff';
            ctx.fillRect(-bw / 2, -bw * 0.35, bw, bw * 0.7);
            ctx.strokeStyle = 'rgba(95,135,190,.8)';
            ctx.lineWidth = 1;
            ctx.strokeRect(-bw / 2, -bw * 0.35, bw, bw * 0.7);
            ctx.restore();
          }
          if (gi === 0) {
            const zf = R(0.026);
            drawPeng(ctx, cx2 - rx * 0.25, by - ryy * 0.6, zf, t, 'dizzy', 0.4, { scarf: '#ff8fb1', tilt: Math.sin(t * 0.08) * 0.2 });
            drawPeng(ctx, cx2 + rx * 0.2, by - ryy * 0.4, zf * 0.75, t + 9, 'dizzy', 0.6, { baby: true, tilt: -Math.sin(t * 0.08) * 0.25 });
            ctx.fillStyle = '#ffe066';
            ctx.font = `${R(0.026)}px system-ui, sans-serif`;
            ctx.textAlign = 'center';
            for (let q = 0; q < 3; q++) ctx.fillText('★', cx2 + Math.cos(t * 0.15 + q * 2.1) * rx * 0.5, by - ryy * 0.6 - zf * 2 + Math.sin(t * 0.15 + q * 2.1) * zf * 0.3);
          }
        }
        // 지붕 위 아빠 펭귄 (큰 이글루) / 아기 이글루 위 아기
        const top = { x: cx2, y: by - ryy + R(0.004) };
        if (gi === 0) {
          const dm = dadMood(), z = R(0.046);
          if (fail && hp <= 0) {
            // 배 썰매로 퇴장 '으아아~'
            const q = Math.min(1, s.pt / 110), kx = top.x + q * R(0.35) * (cx2 < w / 2 ? -1 : 1), ky = top.y + (Y(SF - 0.03) - top.y) * q;
            drawPeng(ctx, kx, ky, z, t, 'wow', 0, { scarf: '#e8485a', tilt: (cx2 < w / 2 ? -1 : 1) * Math.PI * 0.5 });
            label('으아아~', Math.max(R(0.1), Math.min(w - R(0.1), kx)), ky - z * 1.9, 0.04);
          } else if (!crushed) {
            const bob = dm.mood === 'happy' ? Math.abs(Math.sin(t * 0.25)) * R(0.012) : Math.sin(t * 0.05) * R(0.002);
            const look = s.lastPlace > 0 && t - s.lastPlace < 60 ? Math.sign(X(ccx(s.place.indexOf(s.lastPlace))) - top.x) : Math.sin(t * 0.02);
            drawPeng(ctx, top.x, top.y - bob, z, t, dm.mood, dm.flap, { scarf: '#e8485a', look, tilt: dm.mood === 'strain' ? Math.sin(t * 0.6) * 0.06 : 0 });
            if (dm.mood === 'dizzy') {
              ctx.fillStyle = '#ffe066';
              ctx.font = `${R(0.03)}px system-ui, sans-serif`;
              ctx.textAlign = 'center';
              for (let q = 0; q < 3; q++) ctx.fillText('★', top.x + Math.cos(t * 0.15 + q * 2.1) * z * 0.9, top.y - z * 2 + Math.sin(t * 0.15 + q * 2.1) * z * 0.3);
            }
            if (dm.mood === 'sleep') label('z', top.x + z * 0.9 + ((t / 25) % 1) * z, top.y - z * 1.9 - ((t / 25) % 1) * z, 0.036);
          }
        } else if (!crushed) drawPeng(ctx, top.x, top.y, R(0.022), t, fail ? 'dizzy' : s.phase === 'result' ? 'happy' : 'calm', s.phase === 'result' ? 1 : 0.2, { baby: true });
        ctx.restore();
      }
      if (s.fish[i]) drawCrate(ctx, X(ccx(i)), Y(ccy(i) + 0.022), R(0.02), t + i * 7);
      if (c === COLS - 1) for (const pg of s.pengs) if (vrowOf(pengAt(pg)) === vr) drawPg(pg);
    }
  // ── 고드름 떨어질 칸 (벽 위에도 보이게 위에 그린다) ──
  if (!s.fell && !(st && st.k === 'icicle' && wt >= s.impact))
    for (const i of s.ic) {
      const cx2 = X(ccx(i)), cy2 = Y(ccy(i)), pul = 0.6 + 0.4 * Math.sin(t * 0.15);
      ctx.save();
      ctx.translate(cx2, cy2);
      ctx.scale(1, 0.55);
      ctx.strokeStyle = `rgba(230,70,110,${0.7 * pul})`;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([R(0.01), R(0.007)]);
      ctx.beginPath();
      ctx.arc(0, 0, R(CW * 0.36), 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      // 매달린 고드름 표시 (떨어질 자리)
      const bob = Math.sin(t * 0.1 + i) * R(0.004);
      ctx.fillStyle = 'rgba(255,255,255,.95)';
      ctx.strokeStyle = 'rgba(40,110,170,.9)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(cx2 - R(0.012), cy2 - R(0.075) + bob);
      ctx.lineTo(cx2 + R(0.012), cy2 - R(0.075) + bob);
      ctx.lineTo(cx2, cy2 - R(0.025) + bob);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = `rgba(230,70,110,${0.5 + 0.3 * pul})`;
      ctx.beginPath();
      ctx.moveTo(cx2 - R(0.008), cy2 - R(0.008));
      ctx.lineTo(cx2 + R(0.008), cy2 + R(0.008));
      ctx.moveTo(cx2 + R(0.008), cy2 - R(0.008));
      ctx.lineTo(cx2 - R(0.008), cy2 + R(0.008));
      ctx.strokeStyle = `rgba(230,70,110,${0.6 + 0.3 * pul})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  // ── 미리 보기 표: 벽에 부딪히는 바람 세기(넘치면 빨강), 이글루 경고, 밤에 얼 벽 ❄ ──
  const badge = (x: number, y: number, text: string, bg: string, r = 0.022) => {
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(x, y, R(r), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${R(0.036)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y + 0.5, R(r * 2.6));
  };
  if (pre && pst) {
    if (pw) {
      // 칸마다 바람 세기 (한 칸에 1씩 약해지는 게 보이게)
      for (let i = 0; i < N; i++) {
        if (!(pw.lvl[i] > 0) || s.K[i] !== SNOW || s.fish[i]) continue;
        label(String(pw.lvl[i]), X(ccx(i)), Y(ccy(i)), 0.036, 'rgba(255,255,255,.95)', 'rgba(30,80,160,.6)');
      }
      for (let i = 0; i < N; i++) {
        if (!pw.hit[i] || s.K[i] === IGLOO || s.K[i] === SNOW) continue;
        const k = s.K[i], hz = k === ICE && s.nat[i] ? BERG_H + 0.8 : k === MAN ? MAN_H + 1.6 : s.Hh[i] + 1.4;
        badge(X(ccx(i)), Y(PY(vrowOf(i) + 0.55, hz)), String(pw.hit[i]), pw.over[i] ? '#ff4a6a' : '#2f8fe0');
      }
      for (let i = 0; i < N; i++) if (s.fish[i] && pw.lvl[i] > 0) label('날아가요!', X(ccx(i)), Y(ccy(i)) - R(0.045), 0.036, '#ffd6e8', 'rgba(120,30,60,.7)');
    }
    if (pst.k === 'icicle')
      for (const i of s.ic) {
        const hit = s.K[i] === WALL || s.K[i] === MAN;
        label(hit ? '🧊 부서져요!' : s.K[i] === ICE ? '🧊 버텨요' : '🧊 얼음 기둥', X(ccx(i)), Y(ccy(i)) - R(hit ? 0.07 : 0.03), 0.036, hit ? '#ffd0d8' : '#dff6ff', hit ? 'rgba(140,20,50,.75)' : 'rgba(20,70,130,.7)');
      }
    if (pre.path) {
      const sp = pre.path[pre.path.length - 1], k = pre.before.K[sp];
      const txt = k === WALL ? (pre.before.Hh[sp] <= 2 ? '와르르' : '-2') : k === MAN ? '머리!' : k === ICE ? '쨍!' : k === IGLOO ? '-1' : '';
      if (txt) badge(X(ccx(sp)), Y(ccy(sp)) - R(0.05), txt, k === ICE ? '#2f8fe0' : '#ff4a6a', txt.length > 2 ? 0.032 : 0.022);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(X(ccx(pre.path[0])), Y(PY(ROWS)) + R(0.012), R(0.016), 0, Math.PI * 2);
      ctx.fill();
    }
    s.igloos.forEach((ic2, k) => {
      const hv = pre.dmg[k];
      if (!hv) return;
      const bx = X(ccx(ic2.cells[0]) + (ic2.cells.length > 1 ? CW / 2 : 0)), by = Y(ccy(ic2.cells[0])) + R(0.015), pul = 0.6 + 0.4 * Math.sin(t * 0.2);
      ctx.fillStyle = `rgba(235,60,95,${0.85 * pul})`;
      ctx.beginPath();
      ctx.roundRect(bx - R(0.13), by - R(0.024), R(0.26), R(0.048), R(0.024));
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = `900 ${R(0.036)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`바람이 닿아요 -${hv}`, bx, by + 0.5);
    });
  }
  // 밤에 얼 벽 ❄ (짓는 동안은 미리 돌려 본 결과, 버티는 동안은 맞은 벽)
  for (let i = 0; i < N; i++) {
    if (!willFreeze[i] || s.K[i] !== WALL) continue;
    const bx = X(PX(colOf(i) + 0.5, vrowOf(i) + 0.9)), by = Y(PY(vrowOf(i) + 0.9, s.Hh[i] * 0.5)), pul = 1 + 0.1 * Math.sin(t * 0.15 + i);
    ctx.save();
    ctx.translate(bx, by);
    ctx.scale(pul, pul);
    ctx.fillStyle = '#56c8f5';
    ctx.beginPath();
    ctx.arc(0, 0, R(0.022), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${R(0.036)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('❄', 0, R(0.002));
    ctx.restore();
  }
  // ── 굴러가는 눈사람 머리 (눈사람이 맞으면) ──
  for (const e of s.events)
    if (e.kind === 'head' && t - e.t < 90) {
      const q = (t - e.t) / 90, d = gust ? windDir(gust, cellAt(e.x, e.y + 0.04)) : [0, -1];
      drawHead(ctx, X(e.x + d[0] * q * 0.25 + q * 0.05), Y(e.y - 0.02 + d[1] * q * 0.12) + Math.abs(Math.sin(q * 12)) * -R(0.012), R(0.016), q * 14);
    }
  // ── 구경하는 눈사람 (판 뒤 언덕): 눈벽이 깎이면 머리가 데굴데굴 ──
  {
    const lastC = s.events.filter((e) => e.kind === 'crumble' || e.kind === 'gone').reduce((a, e) => Math.max(a, e.t), -999), q = t - lastC;
    const bx = X(0.885), by = Y(0.338);
    drawSnowman(ctx, bx, by, R(0.014), t, q > 110, gust ? 'wow' : s.phase === 'result' && s.ok ? 'happy' : 'calm');
    if (q <= 110) {
      const p = q / 110, hx2 = bx - p * R(0.16), hy2 = by - R(0.045) + Math.min(1, p * 3) * R(0.04) - Math.abs(Math.sin(p * 10)) * R(0.012) * (1 - p);
      drawHead(ctx, hx2, hy2, R(0.008), -p * 12);
      if (q < 50) label('데굴데굴~', hx2, hy2 - R(0.03), 0.036);
    }
  }
  // ── 고드름 떨어지기 ──
  if (st && st.k === 'icicle' && wt < s.impact)
    for (const i of s.ic) {
      const q = Math.pow(wt / s.impact, 2), x = X(ccx(i)), y1 = Y(ccy(i)) - R(0.01), y0 = Y(0.24), yy = y0 + (y1 - y0) * q;
      ctx.fillStyle = `rgba(40,80,140,${0.15 + 0.25 * q})`;
      ctx.beginPath();
      ctx.ellipse(x, Y(ccy(i)), R(0.02) * (0.5 + q), R(0.007) * (0.5 + q), 0, 0, Math.PI * 2);
      ctx.fill();
      const g = ctx.createLinearGradient(x - R(0.012), 0, x + R(0.012), 0);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(1, '#7fd0f0');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - R(0.012), yy - R(0.07));
      ctx.lineTo(x + R(0.012), yy - R(0.07));
      ctx.lineTo(x, yy);
      ctx.fill();
    }
  // ── 눈덩이 굴러가기 ──
  if (st && st.k === 'ball' && wt < s.impact + 6) {
    const p = s.path, f = Math.max(0, (wt - 14) / ROLL), k0 = Math.min(p.length - 1, Math.floor(f)), k1 = Math.min(p.length - 1, k0 + 1), u = Math.min(1, f - k0);
    const x0 = wt < 14 ? ccx(p[0]) : ccx(p[k0]) + (ccx(p[k1]) - ccx(p[k0])) * u;
    const y0 = wt < 14 ? PY(ROWS) + 0.04 * (1 - wt / 14) : ccy(p[k0]) + (ccy(p[k1]) - ccy(p[k0])) * u;
    const rr = R(0.028 + 0.004 * Math.min(1, f / 4));
    ctx.fillStyle = 'rgba(40,80,140,.25)';
    ctx.beginPath();
    ctx.ellipse(X(x0), Y(y0) + rr * 0.2, rr * 1.1, rr * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    const g = ctx.createRadialGradient(X(x0) - rr * 0.3, Y(y0) - rr * 1.3, rr * 0.1, X(x0), Y(y0) - rr, rr);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(1, '#b9d2ea');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(X(x0), Y(y0) - rr, rr, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,160,210,.6)';
    ctx.lineWidth = 1.2;
    for (let q = 0; q < 3; q++) (ctx.beginPath(), ctx.arc(X(x0), Y(y0) - rr, rr * 0.8, wt * 0.3 + q * 2.1, wt * 0.3 + q * 2.1 + 0.8), ctx.stroke());
  }
  // ── 다가오는 돌풍 머리 (예보한 세기만큼 크다) ──
  if (gust && wt < APPROACH + 10) {
    const a = Math.min(1, wt / APPROACH), hc = R(0.035 + 0.011 * gust.h) * (0.45 + 0.55 * a), al = wt > APPROACH ? Math.max(0, 1 - (wt - APPROACH) / 10) : 1;
    ctx.save();
    ctx.globalAlpha = al;
    if (gust.from === 'F') {
      const yy = Y(SF + 0.03 - (SF + 0.03 - PY(ROWS) - 0.005) * Math.pow(a, 1.3));
      const g = ctx.createLinearGradient(0, yy - hc, 0, yy + hc);
      g.addColorStop(0, 'rgba(255,255,255,.95)');
      g.addColorStop(0.5, 'rgba(225,240,255,.8)');
      g.addColorStop(1, 'rgba(180,215,245,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-10, yy + hc);
      for (let x = -10; x <= w + 10; x += R(0.03)) ctx.lineTo(x, yy - hc * (0.75 + 0.25 * Math.sin(x * 0.07 + t * 0.2)));
      ctx.lineTo(w + 10, yy + hc);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      for (let x = -10; x <= w + 10; x += R(0.035)) (ctx.beginPath(), ctx.arc(x, yy - hc * (0.7 + 0.2 * Math.sin(x * 0.07 + t * 0.2)), hc * (0.18 + 0.06 * Math.sin(x * 0.3 + t * 0.3)), 0, Math.PI * 2), ctx.fill());
      ctx.strokeStyle = 'rgba(255,255,255,.9)';
      ctx.lineWidth = 2;
      for (let k = 0; k < 9; k++) {
        const x = hsh(k + 5) * w, up = ((t * 0.04 + hsh(k)) % 1) * hc * 1.6;
        ctx.beginPath();
        ctx.arc(x, yy - up, R(0.012), Math.PI * 0.9, Math.PI * 1.9);
        ctx.stroke();
      }
    } else if (gust.from === 'C') {
      // 회오리 깔때기
      const cx2 = X(ccx(s.wc)), cy2 = Y(ccy(s.wc)), H = hc * 3 * a;
      for (let q = 0; q < 8; q++) {
        const yy = cy2 - (q / 8) * H, rr = R(0.012) + (q / 8) * hc * 1.1;
        ctx.strokeStyle = `rgba(235,245,255,${0.9 - q * 0.06})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(cx2 + Math.sin(t * 0.3 + q) * R(0.006) * q, yy, rr, rr * 0.3, 0, t * 0.4 + q, t * 0.4 + q + Math.PI * 1.5);
        ctx.stroke();
      }
    } else {
      const Lw = gust.from === 'L', edgeX = Lw ? X(PX(0, ROWS / 2)) : X(PX(COLS, ROWS / 2)), from = Lw ? -R(0.06) : w + R(0.06), sd = Lw ? 1 : -1;
      const xx = from + (edgeX - from) * Math.pow(a, 1.3), y0 = Y(Y0) - R(0.01), y1 = Y(PY(ROWS)) + R(0.02);
      const g = ctx.createLinearGradient(xx - sd * hc * 1.6, 0, xx, 0);
      g.addColorStop(0, 'rgba(180,215,245,0)');
      g.addColorStop(1, 'rgba(255,255,255,.92)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(xx - sd * hc * 1.6, y0);
      for (let y = y0; y <= y1; y += 6) ctx.lineTo(xx + sd * hc * (0.15 + 0.1 * Math.sin(y * 0.06 + t * 0.2)), y);
      ctx.lineTo(xx - sd * hc * 1.6, y1);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      for (let y = y0; y <= y1; y += R(0.03)) (ctx.beginPath(), ctx.arc(xx + sd * hc * 0.12, y, hc * (0.16 + 0.06 * Math.sin(y * 0.3 + t * 0.4)), 0, Math.PI * 2), ctx.fill());
    }
    ctx.restore();
  }
  // 눈보라 날림 (늘 조금, 돌풍 때 세게)
  {
    const storm = gust ? fade : 0, [dx, dy] = gust && gust.from !== 'C' ? windDir(gust, 0) : [0.3, 1];
    ctx.fillStyle = '#ffffff';
    for (let k = 0; k < 46; k++) {
      const sp = 0.0006 + storm * 0.006, ph = (t * sp * (0.6 + hsh(k) * 0.8) + hsh(k + 9)) % 1;
      let x = hsh(k * 3), y = 0.08 + hsh(k * 3 + 1) * (A - 0.4);
      if (storm > 0.05) (x = (((x + dx * ph * 1.5) % 1) + 1) % 1), (y = 0.08 + ((((y - 0.08) / (A - 0.4) + dy * ph * 1.5) % 1) + 1) % 1 * (A - 0.4));
      else (y = 0.08 + ((y - 0.08 + ph * (A - 0.4)) % (A - 0.4))), (x += Math.sin(t * 0.02 + k) * 0.01);
      ctx.globalAlpha = (0.35 + 0.4 * hsh(k + 2)) * (storm > 0.05 ? 0.8 : 1);
      ctx.beginPath();
      if (storm > 0.05) ctx.ellipse(X(x), Y(y), 1.2 + R(0.009) * storm, 1.1, Math.atan2(dy, dx), 0, Math.PI * 2);
      else ctx.arc(X(x), Y(y), 1 + hsh(k + 4) * 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  // ── 물개 구경꾼 (앞바다 얼음 조각 위) ──
  {
    const fx0 = X(0.1), fy0 = Y(Y1 + 0.09), z = R(0.036);
    ctx.fillStyle = 'rgba(10,30,60,.3)';
    ctx.beginPath();
    ctx.ellipse(fx0, fy0 + R(0.014), R(0.095), R(0.02), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = mix('#a9d3ea', '#4a5a8a', dark * 0.5);
    ctx.beginPath();
    ctx.ellipse(fx0, fy0 + R(0.007), R(0.09), R(0.022), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = mix('#ffffff', '#a9b6dc', dark * 0.5);
    ctx.beginPath();
    ctx.ellipse(fx0, fy0, R(0.088), R(0.019), 0, 0, Math.PI * 2);
    ctx.fill();
    const clapE = s.events.some((e) => (e.kind === 'safe' || e.kind === 'clear') && t - e.t < 70) || (s.phase === 'result' && s.ok);
    const mood = sliding ? 'laugh' : clapE ? 'clap' : gust && wt < s.impact ? 'wow' : 'calm';
    drawSeal(ctx, fx0 + R(0.008), fy0, z, t, mood);
    if (mood === 'clap' && t % 40 < 26) label('짝짝짝!', fx0 + R(0.035), fy0 - z * 2.3, 0.036, '#fff4b0');
    if (mood === 'laugh') label('어우어우!', fx0 + R(0.04), fy0 - z * 2.3, 0.036, '#ffffff');
  }
  // ── 밤: 세상이 어두워지고, 창·등불은 번진다 ──
  if (dark > 0.02) {
    ctx.fillStyle = `rgba(8,16,52,${0.5 * dark})`;
    ctx.fillRect(-10, Y(HOR + 0.02), w + 20, Y(A) + 10);
  }
  if (glows.length && dark > 0.12) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const gl of glows) {
      ctx.shadowColor = gl.col;
      ctx.shadowBlur = gl.r * (0.8 + 0.2 * Math.sin(t * 0.1 + gl.x));
      ctx.fillStyle = gl.col;
      ctx.globalAlpha = Math.min(1, dark * 1.4) * 0.55;
      ctx.beginPath();
      ctx.arc(gl.x, gl.y, gl.r * 0.18, 0, Math.PI * 2);
      ctx.fill();
      const rg = ctx.createRadialGradient(gl.x, gl.y, 0, gl.x, gl.y, gl.r);
      rg.addColorStop(0, gl.col);
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg;
      ctx.globalAlpha = Math.min(1, dark * 1.4) * 0.35;
      ctx.beginPath();
      ctx.arc(gl.x, gl.y, gl.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  // 밤에 서리 반짝이 (맞은 벽이 얼어 가는 중)
  if (nightSt && wt < s.impact)
    for (let i = 0; i < N; i++) {
      if (s.K[i] !== WALL || !s.mk[i]) continue;
      for (let q = 0; q < 3; q++) {
        const a = ((wt * 0.05 + q / 3 + hsh(i)) % 1), x = X(ccx(i)) + Math.cos(q * 2.1 + wt * 0.1) * R(0.03) * (1 - a), y = Y(PY(vrowOf(i) + 0.5, s.Hh[i])) + Math.sin(q * 2.1 + wt * 0.1) * R(0.02) * (1 - a);
        ctx.fillStyle = `rgba(190,245,255,${a})`;
        ctx.beginPath();
        ctx.arc(x, y, R(0.004), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  // 첫 판 첫 손짓: 이글루 앞을 가리키는 손가락
  if (s.stage === 0 && s.phase === 'build' && s.pi === 0 && t > 15) {
    const tc = s.igloos[0].cells[0] - COLS, bob = Math.abs(Math.sin(t * 0.12)) * R(0.02);
    ctx.fillStyle = `rgba(120,200,255,${0.35 + 0.2 * Math.sin(t * 0.12)})`;
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
    if (e.kind === 'place') fx.burst(x, y, '#ffffff', 12, 2.4, 2.4), fx.ring(x, y, e.col!, R(0.06), 3), fx.kick(2), say(x, y - R(0.05), e.text!, e.col!, 13);
    if (e.kind === 'nope') say(x, y - R(0.04), e.text!, e.col!, 13), fx.kick(1.5);
    if (e.kind === 'splash') fx.burst(x, y - R(0.03), '#ffffff', 22, 3.8, 2.8), fx.burst(x, y - R(0.03), '#cfeaff', 10, 3, 2.2), fx.ring(x, y, '#ffffff', R(0.07), 3), fx.kick(3), say(x, y - R(0.07), e.text!, '#ffffff', 16);
    if (e.kind === 'over') fx.burst(x, y - R(0.03), '#e8f6ff', 24, 4.2, 2.6), fx.kick(4), say(x, y - R(0.07), e.text!, e.col!, 15);
    if (e.kind === 'chit') fx.burst(x, y - R(0.04), '#ffffff', 28, 4.5, 3), fx.kick(6), say(x, y - R(0.07), e.text!, e.col!, 16);
    if (e.kind === 'crumble') fx.burst(x, y, '#ffffff', 10, 2.2, 2.2), say(x, y - R(0.02), e.text!, '#e8f4ff', 12);
    if (e.kind === 'gone') fx.burst(x, y, '#ffffff', 28, 3.6, 3), fx.kick(4), say(x, y - R(0.02), e.text!, '#e8f4ff', 14);
    if (e.kind === 'head') fx.burst(x, y, '#ffffff', 16, 3, 2.4), fx.kick(3), say(x, y - R(0.04), e.text!, e.col!, 14);
    if (e.kind === 'safe') fx.burst(x, y - R(0.05), '#ffe066', 22, 4, 2.6), fx.ring(x, y - R(0.05), '#ffe066', R(0.1), 4), say(x, y - R(0.1), e.text!, e.col!, 17);
    if (e.kind === 'dmg') fx.burst(x, y, '#ffffff', 30, 4.6, 3), fx.kick(7), fx.blink('#dff2ff', 0.18), say(x, y - R(0.08), e.text!, e.col!, 16);
    if (e.kind === 'fall') fx.burst(x, y, '#ffffff', 60, 6, 3.4), fx.kick(12), fx.blink(th.hot, 0.25), say(x, y - R(0.08), e.text!, e.col!, 20);
    if (e.kind === 'fishgo') fx.burst(x, y, '#ffb347', 8, 3, 2.4), say(x, y - R(0.05), e.text!, e.col!, 13);
    if (e.kind === 'freeze') fx.burst(x, y, '#bff4ff', 16, 3, 2.4), fx.ring(x, y, '#9fe8ff', R(0.06), 3), fx.kick(2), say(x, y - R(0.04), e.text!, e.col!, 14);
    if (e.kind === 'nofreeze') say(w / 2, y, e.text!, e.col!, 14);
    if (e.kind === 'crush') fx.burst(x, y, '#dff6ff', 26, 4, 2.8), fx.kick(6), say(x, y - R(0.05), e.text!, e.col!, 16);
    if (e.kind === 'spike') fx.burst(x, y, '#bff4ff', 18, 3.4, 2.6), fx.ring(x, y, '#bff4ff', R(0.05), 3), fx.kick(4), say(x, y - R(0.05), e.text!, e.col!, 14);
    if (e.kind === 'night') fx.blink('#0a1440', 0.25), say(w / 2, Y(0.4), e.text!, e.col!, 17);
    if (e.kind === 'incoming') fx.kick(2), say(w / 2, Y(SF - 0.03), e.text!, e.col!, 18);
    if (e.kind === 'clear') fx.burst(w * 0.3, Y(0.45), '#bff4ff', 30, 6, 3), fx.burst(w * 0.3, y, '#ffe066', 40, 6, 3.2), fx.burst(w * 0.7, y, '#ff8fb1', 40, 6, 3.2), fx.ring(w / 2, y, '#ffe066', R(0.4), 7), fx.blink('#ffffff', 0.25);
    if (e.kind === 'fail') fx.kick(8), fx.blink(th.hot, 0.2);
  }
  fx.memo.t = s.t;
  ctx.restore();

  // ═════════════ HUD ═════════════
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${R(sz)}px system-ui, sans-serif`);
  const hb = R(0.082);
  ctx.fillStyle = 'rgba(18,34,70,.85)';
  ctx.fillRect(0, 0, w, hb);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = th.ink;
  font(0.045, 900);
  const ttl = `⛄ ${s.stage + 1}번째 눈보라`, tw1 = ctx.measureText(ttl).width;
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
  // ── 눈보라 예보판 ──
  {
    const n = s.steps.length;
    ctx.fillStyle = 'rgba(244,250,255,.92)';
    ctx.beginPath();
    ctx.roundRect(X(0.025), Y(FC.y0), R(0.95), R(FC.h), R(0.02));
    ctx.fill();
    ctx.strokeStyle = 'rgba(40,90,160,.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.fillStyle = '#1d4a82';
    font(0.036, 900);
    ctx.fillText('🌨️ 눈보라 예보', X(0.045), Y(FC.y0 + 0.02));
    ctx.textAlign = 'right';
    font(0.036, 700);
    ctx.fillStyle = '#4f72a0';
    ctx.fillText(s.phase === 'build' ? '카드 톡 = 미리 보기' : '세기 = 바람이 들어오는 칸 수', X(0.955), Y(FC.y0 + 0.02));
    for (let k = 0; k < n; k++) {
      const q = s.steps[k], b = cardBox(k, n), cur = s.phase === 'storm' && k === s.si, done = (s.phase === 'storm' && k < s.si) || s.phase === 'result', next = k === pv;
      ctx.save();
      if (cur) (ctx.shadowColor = '#9fe3ff'), (ctx.shadowBlur = R(0.03));
      const g = ctx.createLinearGradient(0, Y(b.y), 0, Y(b.y + b.h));
      const [c0, c1] = q.k === 'night' ? (q.aurora ? ['#5a4fb0', '#1f6a7a'] : ['#3a4a8c', '#18234f']) : q.k === 'icicle' ? ['#bfeaff', '#5fb0dc'] : q.k === 'ball' ? ['#9db8d8', '#4f6f9a'] : q.from === 'C' ? ['#b9a8f0', '#6c58c0'] : cur ? ['#7fd0ff', '#2a7fc4'] : ['#a9daf5', '#4a92c8'];
      g.addColorStop(0, c0);
      g.addColorStop(1, c1);
      ctx.fillStyle = g;
      ctx.globalAlpha = done ? 0.45 : 1;
      ctx.beginPath();
      ctx.roundRect(X(b.x), Y(b.y), R(b.w), R(b.h), R(0.014));
      ctx.fill();
      ctx.restore();
      if (cur || next) {
        ctx.strokeStyle = cur ? '#ffffff' : '#ffd166';
        ctx.lineWidth = cur ? 2.5 : 3;
        ctx.beginPath();
        ctx.roundRect(X(b.x), Y(b.y), R(b.w), R(b.h), R(0.014));
        ctx.stroke();
      }
      if (next) {
        ctx.fillStyle = '#ffd166';
        ctx.beginPath();
        ctx.moveTo(X(b.x + b.w / 2 - 0.015), Y(b.y + b.h));
        ctx.lineTo(X(b.x + b.w / 2 + 0.015), Y(b.y + b.h));
        ctx.lineTo(X(b.x + b.w / 2), Y(b.y + b.h + 0.014));
        ctx.fill();
      }
      ctx.globalAlpha = done ? 0.5 : 1;
      const mx = X(b.x + b.w / 2), my = Y(b.y + b.h * 0.55);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = 'rgba(10,40,90,.55)';
      ctx.lineWidth = 3;
      if (q.k === 'gust') {
        const L = R(Math.min(0.045, b.w * 0.34)), ax = X(b.x + b.w * 0.27);
        ctx.save();
        ctx.translate(ax, my);
        if (q.from === 'C') {
          ctx.strokeStyle = '#fff6c4';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          for (let a = 0; a < 14; a++) ctx.lineTo(Math.cos(a * 0.7) * L * 0.04 * a, Math.sin(a * 0.7) * L * 0.04 * a);
          ctx.stroke();
        } else {
          ctx.rotate(q.from === 'F' ? -Math.PI / 2 : q.from === 'L' ? 0 : Math.PI);
          ctx.fillStyle = '#fff6c4';
          ctx.beginPath();
          ctx.moveTo(-L * 0.5, -L * 0.13);
          ctx.lineTo(L * 0.1, -L * 0.13);
          ctx.lineTo(L * 0.1, -L * 0.32);
          ctx.lineTo(L * 0.5, 0);
          ctx.lineTo(L * 0.1, L * 0.32);
          ctx.lineTo(L * 0.1, L * 0.13);
          ctx.lineTo(-L * 0.5, L * 0.13);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
        font(0.054, 900);
        ctx.strokeText(String(q.h), X(b.x + b.w * 0.66), my);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(String(q.h), X(b.x + b.w * 0.66), my);
      } else {
        ctx.fillStyle = '#ffffff';
        font(0.042, 900);
        ctx.fillText(q.k === 'night' ? (q.aurora ? '🌌' : '🌙') : q.k === 'icicle' ? '🧊' : '⚪', mx, Y(b.y + 0.038));
        font(0.036, 900);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(q.k === 'night' ? (q.aurora ? '오로라' : '밤') : q.k === 'icicle' ? `×${s.ic.length}` : '굴러요', mx, Y(b.y + b.h - 0.017), R(b.w - 0.012));
      }
      font(0.036, 900);
      ctx.fillStyle = 'rgba(255,255,255,.95)';
      ctx.fillText(`${k + 1}`, X(b.x + 0.016), Y(b.y + 0.017));
      // 카드 위 결과 미리 보기: 이글루가 깎이면 빨간 점, 밤엔 얼 벽 수
      if (fore) {
        const f = fore[k], d = f.dmg.reduce((a2, b2) => a2 + b2, 0);
        if (d > 0) {
          ctx.fillStyle = '#ff3d6a';
          ctx.beginPath();
          ctx.arc(X(b.x + b.w - 0.012), Y(b.y + 0.012), R(0.022), 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ctx.fillStyle = '#ffffff';
          font(0.036, 900);
          ctx.fillText(`-${d}`, X(b.x + b.w - 0.012), Y(b.y + 0.013), R(0.04));
        } else if (f.frozen && f.frozen.length) {
          ctx.fillStyle = '#7fd8ff';
          ctx.beginPath();
          ctx.beginPath();
          ctx.roundRect(X(b.x + b.w - 0.05), Y(b.y - 0.008), R(0.058), R(0.04), R(0.02));
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ctx.fillStyle = '#0d3a66';
          font(0.036, 900);
          ctx.fillText(`❄${f.frozen.length}`, X(b.x + b.w - 0.021), Y(b.y + 0.013), R(0.052));
        }
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
    const tx = `✨ ${s.news.text}`, tw2 = Math.min(w - 12, ctx.measureText(tx).width + 22), by2 = Y(0.262) - drop;
    ctx.fillStyle = 'rgba(18,34,70,.9)';
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
  // 판 카드: 시작 · 버텼다 · 무너졌다
  {
    let head = '', sub = '', col = '#ffffff', age = 0, a = 1;
    if (s.phase === 'result') {
      age = s.pt;
      if (s.ok) {
        head = s.won ? '눈보라를 다 버텼다! 🐧🏠' : `버텼다! ${'★'.repeat(s.got)}${'☆'.repeat(3 - s.got)}`;
        sub = `${s.dmgThis ? '이글루가 조금 깎임' : '이글루 무사 ✓'}${s.fish0 ? ` · 물고기 ${s.fish.reduce((q, b) => q + b, 0)}/${s.fish0}` : ''}${s.keep ? ` · 남긴 조각 ${s.keep}` : ''}`;
        col = '#ffd166';
      } else (head = '와르르… 이글루가 무너졌어요'), (sub = s.hearts > 0 ? '하트 -1 · 같은 눈밭 처음부터 다시' : '끝 — 잘 버텼어요!'), (col = '#ffb3c8');
    } else if (s.phase === 'build' && s.pt < 140) {
      age = s.pt;
      a = Math.min(1, (140 - s.pt) / 20);
      head = `${s.stage + 1}번째 눈보라`;
      sub = `돌풍 ${s.steps.filter((q) => q.k === 'gust').length}번${s.nights ? '' : s.steps.some((q) => q.k === 'night') ? ' · 🌙 밤' : ''} · 조각 ${s.pieces.length}개${s.igloos.length > 1 ? ' · 이글루 둘!' : ''}`;
    }
    if (head) {
      const sc = Math.min(1, 0.6 + age / 12), cyy = Y(Y1 + 0.062);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(w / 2, cyy);
      ctx.scale(sc, sc);
      ctx.fillStyle = 'rgba(18,34,70,.9)';
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
      ctx.fillStyle = '#f4fbff';
      font(0.036, 800);
      ctx.fillText(sub, 0, R(0.033), R(0.76));
      ctx.restore();
    }
  }
  // ═════════════ 아래 쟁반 (얼음 썰매판) ═════════════
  {
    const ty = TY, tb = h / w - 0.008;
    const wg = ctx.createLinearGradient(0, Y(ty), 0, Y(tb));
    wg.addColorStop(0, '#2c4a78');
    wg.addColorStop(1, '#1a2c50');
    ctx.fillStyle = wg;
    ctx.beginPath();
    ctx.roundRect(X(0.01), Y(ty), X(0.98), Y(tb - ty), R(0.025));
    ctx.fill();
    ctx.strokeStyle = 'rgba(190,230,255,.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // 위 가장자리 눈
    ctx.fillStyle = '#f4faff';
    ctx.beginPath();
    ctx.moveTo(X(0.03), Y(ty));
    for (let x = 0.03; x <= 0.97; x += 0.03) ctx.lineTo(X(x), Y(ty + 0.006 + 0.005 * Math.abs(Math.sin(x * 37))));
    ctx.lineTo(X(0.97), Y(ty));
    ctx.fill();
    const tile = (x: number, y: number, ww: number, hh: number, pc: number | undefined, big: boolean) => {
      ctx.fillStyle = big ? '#e9f5ff' : 'rgba(233,245,255,.7)';
      ctx.beginPath();
      ctx.roundRect(X(x), Y(y), R(ww), R(hh), R(0.016));
      ctx.fill();
      if (big) {
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
      if (pc === undefined) {
        ctx.fillStyle = 'rgba(40,70,120,.6)';
        font(0.036, 800);
        ctx.textAlign = 'center';
        ctx.fillText('없음', X(x + ww / 2), Y(y + hh / 2));
        return;
      }
      const mx = X(x + ww / 2), my = Y(y + hh * (big ? 0.45 : 0.5)), z = R(big ? 0.05 : 0.036);
      if (pc === PW) {
        ctx.fillStyle = '#c9dcee';
        ctx.fillRect(mx - z, my - z * 0.1, z * 2, z * 0.7);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(mx - z, my - z * 0.5, z * 2, z * 0.42);
        ctx.strokeStyle = '#9fbad6';
        ctx.lineWidth = 1;
        ctx.strokeRect(mx - z, my - z * 0.1, z * 2, z * 0.7);
        ctx.beginPath();
        ctx.moveTo(mx - z * 0.3, my - z * 0.1);
        ctx.lineTo(mx - z * 0.3, my + z * 0.6);
        ctx.moveTo(mx + z * 0.4, my - z * 0.1);
        ctx.lineTo(mx + z * 0.4, my + z * 0.6);
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        for (let q = 0; q < 3; q++) (ctx.beginPath(), ctx.ellipse(mx - z * 0.65 + q * z * 0.65, my - z * 0.5, z * 0.25, z * 0.17, 0, Math.PI, 0), ctx.fill());
      } else drawSnowman(ctx, mx, my + z * 0.75, z * 0.36, t, true);
      if (big) {
        ctx.fillStyle = '#1d3a66';
        font(0.038, 900);
        ctx.textAlign = 'center';
        ctx.fillText(PIECE_NAME[pc], mx, Y(y + hh * 0.86));
      }
    };
    ctx.textBaseline = 'middle';
    if (s.phase === 'build') {
      ctx.fillStyle = '#d6ecff';
      font(0.036, 800);
      ctx.textAlign = 'left';
      if (s.pi < s.pieces.length) ctx.fillText('놓을 조각', X(0.035), Y(ty + 0.026)), ctx.fillText('다음', X(0.3), Y(ty + 0.026));
      if (s.pi < s.pieces.length) {
        tile(0.03, ty + 0.05, 0.24, 0.105, s.pieces[s.pi], true);
        tile(0.3, ty + 0.063, 0.14, 0.08, s.pieces[s.pi + 1], false);
        tile(0.46, ty + 0.063, 0.14, 0.08, s.pieces[s.pi + 2], false);
      } else {
        ctx.fillStyle = '#ffffff';
        font(0.044, 900);
        ctx.textAlign = 'left';
        ctx.fillText('다 놓았어요! 🌨️', X(0.04), Y(ty + 0.095));
      }
      ctx.fillStyle = '#d6ecff';
      font(0.036, 800);
      ctx.textAlign = 'left';
      const more = s.pieces.length - s.pi - 3;
      if (more > 0) ctx.fillText(`+${more}`, X(0.555), Y(ty + 0.026));
      // ▶ 버티기
      const pulse = s.pi >= s.pieces.length ? 1 : 0.5 + 0.5 * Math.sin(t * 0.1);
      const bg = ctx.createLinearGradient(0, Y(BTN.y), 0, Y(BTN.y + BTN.h));
      bg.addColorStop(0, '#9fe8ff');
      bg.addColorStop(1, '#3d9fe0');
      ctx.save();
      ctx.shadowColor = '#9fe8ff';
      ctx.shadowBlur = R(0.025) * pulse;
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.roundRect(X(BTN.x), Y(BTN.y), R(BTN.w), R(BTN.h), R(0.03));
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#0d2a52';
      font(0.05, 900);
      ctx.textAlign = 'center';
      ctx.fillText('▶ 버티기', X(BTN.x + BTN.w / 2), Y(BTN.y + BTN.h * 0.42));
      font(0.036, 800);
      ctx.fillText('남기면 +3점씩', X(BTN.x + BTN.w / 2), Y(BTN.y + BTN.h * 0.8));
    } else {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#d6ecff';
      font(0.042, 900);
      const gN = s.steps.slice(0, s.si + 1).filter((q) => q.k === 'gust').length, gT = s.steps.filter((q) => q.k === 'gust').length;
      const msg = s.phase === 'storm' ? (st?.k === 'night' ? '🌙 쉿, 밤이에요…' : `돌풍 ${gN}/${gT} — 버텨라!`) : s.ok ? '버텼다! 펭귄들이 춤춰요' : '다시 지어 봐요';
      ctx.fillText(msg, X(0.04), Y(ty + 0.05));
      s.igloos.forEach((ic2, k) => {
        font(0.036, 800);
        ctx.fillStyle = '#d6ecff';
        const lx = X(0.04 + k * 0.48), ly = Y(ty + 0.115), nm = ic2.baby ? '아기 이글루' : '이글루';
        ctx.fillText(nm, lx, ly);
        const tw0 = ctx.measureText(nm).width;
        for (let q = 0; q < ic2.max; q++) {
          ctx.fillStyle = q < s.hp[k] ? '#eaf6ff' : 'rgba(255,255,255,.18)';
          ctx.beginPath();
          ctx.roundRect(lx + tw0 + R(0.015) + q * R(0.045), ly - R(0.018), R(0.035), R(0.036), R(0.006));
          ctx.fill();
        }
      });
    }
    // 안내 한 줄
    let hint = '';
    const hasNight = s.steps.some((q) => q.k === 'night');
    if (s.phase === 'build') {
      const pc = s.pieces[s.pi];
      if (s.stage === 0 && s.pi === 0) hint = '👆 눈밭을 톡! 이글루 앞(바람 쪽)에 눈벽을 쌓아요';
      else if (pc === PW) hint = hasNight ? '눈벽: 밤 전에 살짝 맞으면 ❄얼음벽이 돼요' : '눈벽: 높이 3 · 맞으면 깎여요 (벽에 또 쌓으면 +2)';
      else if (pc === PS) hint = '눈사람: 높이 6 · 맞으면 머리가 굴러가 눈벽(3)이 돼요';
      else hint = '눈보라가 곧 와요!';
    } else if (s.phase === 'storm' && st) {
      if (st.k === 'gust') hint = `${st.from === 'F' ? '바다' : st.from === 'L' ? '왼쪽' : st.from === 'R' ? '오른쪽' : '회오리'}에서 세기 ${st.h} — 한 칸에 1씩 약해져요`;
      else if (st.k === 'night') hint = '맞은 눈벽이 꽁꽁 얼어요 — 이제 안 깎여요';
      else if (st.k === 'icicle') hint = '고드름! 눈벽은 부서지고 얼음은 버텨요';
      else hint = '눈덩이! 얼음벽에 부딪히면 와장창';
    } else if (s.phase === 'result') hint = s.ok ? `별 ${s.got}개! 다음 눈보라는 더 세요` : '깎인 자리를 두껍게, 밤 전에 얼려 봐요';
    ctx.textAlign = 'center';
    ctx.fillStyle = s.stage === 0 && s.pi === 0 && s.phase === 'build' ? '#ffffff' : '#d6ecff';
    font(s.stage === 0 && s.pi === 0 && s.phase === 'build' ? 0.044 : 0.038, 900);
    ctx.fillText(hint, w / 2, Y(ty + 0.19), w - R(0.06));
    ctx.fillStyle = 'rgba(214,236,255,.65)';
    font(0.036, 700);
    ctx.fillText(`점수 ${s.pts}`, w / 2, Y(ty + 0.24));
  }
}
