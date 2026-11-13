/**
 * 펭귄 거품 쏘기 (25라운드: 검증된 요즘 캐주얼 뼈대 × 공장의 와우) — 버블 슈터 × 가리키기 × 연쇄.
 * 기준 9(손이 하는 일은 하나): 화면을 누르고 있으면 먹보 펭귄의 거품 대롱에서 그쪽으로 조준선(벽 튕김 포함)과 붙을 자리가 보이고,
 *   떼면 발사. 발사대 아래에서 떼면 취소. 키보드는 화살표로 커서 + 스페이스(누르는 동안 조준, 떼면 발사).
 * 규칙(결정적, 2줄): 거품은 곧게 날아가 옆벽에 거울처럼 튕기고, 천장이나 다른 거품에 닿으면 가장 가까운 육각 칸에 붙는다.
 *   같은 색이 3개 이상 이어지면 펑. 그 뒤 천장과 이어진 길이 끊긴 거품은 모두 우수수 떨어진다.
 * 와우(비틀기): 얼린 물고기 간식(생선·새우·오징어)이 든 얼음 거품은 색이 없어서 절대 안 터진다 — 매달린 줄기를 끊어 덩어리째
 *   떨어뜨려야 얼음이 '쨍' 깨지며 간식이 파닥파닥 튀어 먹보 펭귄 뒤 양동이로 철퍼덕. 한 발에 k마리면 점수가 k²배, 펭귄은 침을 흘리며 감동.
 * 첫 3초: 1판 첫 거품은 간식 셋을 감싼 껍질과 같은 색 — 하얀 고리 쪽으로 쏘면 껍질 열 개가 펑, 매달린 일곱 개가 우수수, 간식 셋이 양동이로.
 * 판 8개: 목표 = 얼린 간식 N마리 모두 받기(거품 K발 안에). 별 = ★ 다 받음 · ★ P발 안에 · ★ 한 발에 M개 이상 우수수.
 *   실패 = 거품을 다 씀 / 거품이 아래 얼음 선을 넘음 → 하트 -1, 그 판 다시. 하트 셋을 다 잃거나 8판을 마치면 끝.
 * 펼쳐짐(하는 일이 바뀐다): 1판 껍질 터뜨려 떨구기 → 2판 돌 거품(안 터지고 곧게 쏘면 막힘 — 옆으로 돌아 껍질을 노린다) → 3판 얼음 천장(4발마다
 *   한 줄씩 내려옴 — 아껴 쏘기) → 4판 얼음 거품(두 번 맞혀야 와장창 — 같은 자리를 두 번) → 5판 무지개 거품(2·6·10번째 발, 아무 색 — 어디에 아껴 둘지)
 *   → 6판 폭탄 거품(맞히면 쾅 둘레가 통째로, 간식은 양동이로 날아감 — 폭탄을 노린다) → 7판 눈보라 바람(조준선이 휜다, 3발마다 방향이 바뀜 — 휘는 만큼 비켜 겨누기)
 *   → 8판 도둑 갈매기(오가며 거품을 가로챈다 — 비켜 쏘거나 미끼로 한 발 주고 기절한 틈에).
 * 3판부터의 지도는 무작위 지도 수백 장을 봇으로 재서 골랐다: 내다보는 봇은 ★3이 잘 나오고, '같은 색이 가장 많이 붙는 자리에 바로 쏘기'
 *   버릇 봇은 ★3이 절반을 못 넘는 지도(★ 문턱 P·M도 그 측정으로 정함). 판마다 시드로 색을 섞고 좌우를 뒤집는다.
 * 웃음: 먹보 펭귄은 겨눌 때 볼을 빵빵하게 힘주고, 많이 떨어지면 눈이 휘둥그레, 간식을 받으면 우쭐, 한 발에 여럿이면 눈을 반짝이며
 *   침을 질질 흘리고 감동, 받을수록 배가 빵빵해진다. 실패하면 벌러덩 뒤집혀 버둥. 얼린 간식은 얼음 속에서 눈만 끔뻑,
 *   구경꾼 물범은 큰 낙하에 박수치며 군침, 갈매기는 거품을 삼키다 '끄억'.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.56;
/** 판: 옆벽 안쪽 WL~WR, 한 줄에 COLS칸(홀수 줄은 반 칸 밀리고 한 칸 적다) */
const COLS = 8, ROWS = 15, NC = ROWS * COLS;
const WL = 0.06, WR = 0.94, D = (WR - WL) / COLS, R = D / 2, ROWH = (D * Math.sqrt(3)) / 2;
/** 얼음 천장의 처음 높이 · 이 선을 넘으면 실패 · 발사대 */
const CEIL0 = 0.13, DEADY = 1.1, LX = 0.5, LY = 1.215;
/** 얼음 바닥(발 높이) · 간식 양동이 자리 · 아래 띠 시작 · 먹보 펭귄 자리 */
const FLOOR = 1.322, BUCKX = 0.165, BAND = 1.355, EATX = 0.352;
/** 날아가는 속도(틱당) · 한 틱을 SUB번 나눠 부딪힘을 본다 · 거품끼리 부딪히는 거리(지름보다 조금 작게 — 틈을 빠져나갈 수 있다) */
const V = 0.026, SUB = 3, SS = V / SUB, CR = D * 0.8;
/** 가장 눕힌 발사 각도(라디안) */
const MINA = 0.17;
/** 폭탄이 날리는 거리 */
const BLAST = D * 1.8;
/** 갈매기: 나는 높이 · 몸 반지름 · 왕복 주기(틱) · 기절 시간 */
const SKY = 0.97, SKR = 0.06, SKP = 420, SKSTUN = 360;
const COOL = 16, RESULT = 170, RESULT_OK = 230, NEWS_T = 180, CARD_T = 150;
const STAR_PTS = 500, LEFT_PTS = 60, WIN_PTS = 1000;

const EMPTY = -1, SNACK = 10, STONE = 11, ICE = 12, ICE2 = 13, BOMB = 14, WILD = 15;
const isCol = (v: number) => v >= 0 && v < 6;
const hsh = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

interface StageDef {
  key: string;
  title: string;
  news: string;
  hint: string;
  /** 육각 판(짝수 줄 8칸·홀수 줄 7칸). a~e = 판의 색, ? = 아무 색, P = 얼린 간식, S = 돌, I = 얼음, B = 폭탄, . = 빈칸 */
  map: string[];
  shots: number;
  par: number;
  big: number;
  /** 처음 두 발의 색(글자) */
  first?: string;
  /** 이 발마다 얼음 천장이 한 줄 내려온다 */
  drop?: number;
  /** 무지개 거품이 나오는 발 번호(0부터) */
  wild?: number[];
  /** 바람 세기(발 3개마다 방향이 바뀐다) */
  wind?: number;
  skua?: boolean;
}

/** 판 8개. 판마다 시드로 색을 섞고 좌우를 뒤집는다(같은 판은 다시 해도 같은 배치) */
export const STAGES: StageDef[] = [
  {
    key: '', title: '첫 간식', news: '', hint: '같은 색 껍질을 터뜨리면 매달린 게 통째로 우수수!',
    map: ['bb.aa.bb', 'b.aPa.b', 'b.aPPa.b', '.baaab.', '..b..b..'],
    shots: 15, par: 1, big: 7, first: 'ab',
  },
  {
    key: 'stone', title: '돌 거품', news: '🪨 돌 거품은 안 터져요 — 옆이나 벽으로 돌아 노려요', hint: '돌은 안 터져요 — 옆으로 돌아 껍질을 노려요',
    map: ['bb.aa.bb', 'b.aPa.b', 'b.aPPa.b', '.baSab.', '...SS...'],
    shots: 18, par: 3, big: 8,
  },
  {
    key: 'ceil', title: '내려오는 천장', news: '⬇️ 얼음 천장 — 4발마다 한 줄씩 내려와요!', hint: '4발마다 천장이 내려와요 — 아껴 쏘기',
    map: ['ccbbabbc', 'cc.a.bb', 'cPdaP..d', '.caadc.', '...P.d..', '..a....'],
    shots: 14, par: 9, big: 6, drop: 4,
  },
  {
    key: 'ice', title: '얼음 거품', news: '🧊 얼음 거품 — 두 번 맞혀야(옆에서 펑 해도) 와장창', hint: '얼음 거품은 두 번 맞혀야 깨져요',
    map: ['aadddddd', 'ccIdd.c', 'cPbIddb.', 'IcddbI.', '..dd.dPb', '.bP....'],
    shots: 14, par: 10, big: 9, drop: 6,
  },
  {
    key: 'wild', title: '무지개 거품', news: '🌈 무지개 거품 — 아무 색이나 붙어 터져요. 어디에 쓸까?', hint: '무지개는 아무 색 — 아껴 뒀다 줄기에!',
    map: ['ddbadccc', 'dbd.d.b', 'bbba.dbb', 'PcPbc.b', 'b.abP..P', 'ab....b'],
    shots: 14, par: 10, big: 5, wild: [1, 5, 9],
  },
  {
    key: 'bomb', title: '폭탄 거품', news: '💣 폭탄 거품 — 맞히면 쾅! 둘레가 통째로', hint: '폭탄을 맞히면 둘레가 날아가요 (간식은 양동이로 쏙)',
    map: ['dbbadddd', 'ddbbbdb', '..BPccP.', '.B...cb', 'dP....P.', '.d.....'],
    shots: 14, par: 5, big: 5, drop: 6,
  },
  {
    key: 'wind', title: '눈보라', news: '🌬️ 눈보라 — 조준선이 바람에 휘어요 (3발마다 방향이 바뀌어요)', hint: '바람 쪽으로 휘는 만큼 비켜 겨눠요',
    map: ['aacbcccc', 'aacaddd', '.Pacdddb', 'acc..da', 'aa.P...a', 'bc.c.aP'],
    shots: 14, par: 9, big: 6, wind: 2.4e-5,
  },
  {
    key: 'skua', title: '도둑 갈매기', news: '🐦 도둑 갈매기 — 맞으면 거품을 꿀꺽! (삼키면 잠깐 기절)', hint: '갈매기를 비켜 쏘거나, 한 발 주고 기절한 틈에',
    map: ['bbbbaaaa', 'bbaddbI', 'bbP.dc.I', 'PIb.P.d', '.a..dBPd'],
    shots: 14, par: 7, big: 5, drop: 6, skua: true,
  },
];
export const STAGE_COUNT = STAGES.length;

// ───────── 육각 칸 ─────────
const rowOf = (i: number) => (i / COLS) | 0;
const colOf = (i: number) => i % COLS;
const okCell = (r: number, c: number) => r >= 0 && r < ROWS && c >= 0 && c < (r & 1 ? COLS - 1 : COLS);
const CX: number[] = [], RY: number[] = [], NB: number[][] = [], BL: number[][] = [];
for (let i = 0; i < NC; i++) {
  const r = rowOf(i), c = colOf(i);
  CX.push(WL + R + c * D + (r & 1 ? R : 0));
  RY.push(R + r * ROWH);
}
for (let i = 0; i < NC; i++) {
  const r = rowOf(i), c = colOf(i), nb: number[] = [];
  if (okCell(r, c)) {
    const d = r & 1 ? [[0, -1], [0, 1], [-1, 0], [-1, 1], [1, 0], [1, 1]] : [[0, -1], [0, 1], [-1, -1], [-1, 0], [1, -1], [1, 0]];
    for (const [dr, dc] of d) if (okCell(r + dr, c + dc)) nb.push((r + dr) * COLS + c + dc);
  }
  NB.push(nb);
  const bl: number[] = [];
  for (let j = 0; j < NC; j++) if (j !== i && okCell(rowOf(j), colOf(j)) && Math.hypot(CX[j] - CX[i], RY[j] - RY[i]) <= BLAST) bl.push(j);
  BL.push(bl);
}
const VALID: number[] = [];
for (let i = 0; i < NC; i++) if (okCell(rowOf(i), colOf(i))) VALID.push(i);

// ───────── 날아가는 길 ─────────
interface Skua { ph: number; stun: number }
interface Env { wind: number; sk: Skua | null; t0: number }
interface Tr {
  /** 조준선용 꺾인 점들(시작 · 튕긴 자리 · 끝) */
  pts: number[];
  /** 틱마다 위치 (날아가는 연출) */
  path: number[];
  cell: number;
  hit: number;
  eaten: boolean;
  bounces: number;
}
const skX = (sk: Skua, t: number) => 0.5 + 0.34 * Math.sin((t / SKP) * Math.PI * 2 + sk.ph);
const skOn = (sk: Skua, t: number) => t >= sk.stun;

function lowest(g: Int8Array) {
  for (let i = NC - 1; i >= 0; i--) if (g[i] >= 0) return i;
  return -1;
}

function trace(g: Int8Array, ceil: number, ang: number, env: Env, wantPath: boolean): Tr {
  let x = LX, y = LY, ux = Math.cos(ang) * SS;
  const uy = -Math.sin(ang) * SS, pts = [x, y], path: number[] = [];
  const lo = lowest(g), lowY = lo < 0 ? ceil : ceil + RY[lo];
  let bounces = 0;
  for (let n = 1; n < 4000; n++) {
    ux += env.wind;
    x += ux;
    y += uy;
    if (x < WL + R) (x = 2 * (WL + R) - x), (ux = -ux), bounces++, pts.push(WL + R, y);
    else if (x > WR - R) (x = 2 * (WR - R) - x), (ux = -ux), bounces++, pts.push(WR - R, y);
    if (wantPath && n % SUB === 0) path.push(x, y);
    if (env.sk && Math.abs(y - SKY) < SKR + R) {
      const tt = env.t0 + n / SUB;
      if (skOn(env.sk, tt) && (x - skX(env.sk, tt)) ** 2 + (y - SKY) ** 2 < (SKR + R * 0.8) ** 2) {
        pts.push(x, y);
        if (wantPath) path.push(x, y);
        return { pts, path, cell: -1, hit: -1, eaten: true, bounces };
      }
    }
    if (y - R <= ceil) {
      let best = -1, bd = 9;
      for (const i of VALID) {
        if (g[i] >= 0 || rowOf(i) > 1) continue;
        if (rowOf(i) === 1 && !NB[i].some((j) => g[j] >= 0)) continue;
        const d = (CX[i] - x) ** 2 + (ceil + RY[i] - y) ** 2;
        if (d < bd) (bd = d), (best = i);
      }
      return done(pts, path, best, -1, bounces, ceil, wantPath);
    }
    if (y - lowY > CR) continue;
    const rf = Math.floor((y - ceil - R) / ROWH);
    let hit = -1, hd = CR * CR;
    for (let r = Math.max(0, rf - 1); r <= Math.min(ROWS - 1, rf + 2); r++) {
      const off = r & 1 ? R : 0, c0 = Math.max(0, Math.ceil((x - CR - WL - R - off) / D)), c1 = Math.min(r & 1 ? COLS - 2 : COLS - 1, Math.floor((x + CR - WL - R - off) / D));
      for (let c = c0; c <= c1; c++) {
        const i = r * COLS + c;
        if (g[i] < 0) continue;
        const d = (CX[i] - x) ** 2 + (ceil + RY[i] - y) ** 2;
        if (d < hd) (hd = d), (hit = i);
      }
    }
    if (hit >= 0) {
      let best = -1, bd = 9;
      for (const j of NB[hit]) {
        if (g[j] >= 0) continue;
        const d = (CX[j] - x) ** 2 + (ceil + RY[j] - y) ** 2;
        if (d < bd) (bd = d), (best = j);
      }
      if (best < 0)
        for (const j of VALID) {
          if (g[j] >= 0) continue;
          const d = (CX[j] - x) ** 2 + (ceil + RY[j] - y) ** 2;
          if (d < bd) (bd = d), (best = j);
        }
      return done(pts, path, best, hit, bounces, ceil, wantPath);
    }
  }
  return done(pts, path, -1, -1, bounces, ceil, wantPath);
}
function done(pts: number[], path: number[], cell: number, hit: number, bounces: number, ceil: number, wantPath: boolean): Tr {
  if (cell >= 0) {
    pts.push(CX[cell], ceil + RY[cell]);
    if (wantPath) path.push(CX[cell], ceil + RY[cell]);
  }
  return { pts, path, cell, hit, eaten: false, bounces };
}

// ───────── 붙고 · 터지고 · 떨어지고 ─────────
interface Res {
  popped: number;
  dropped: number;
  snacks: number;
  blasted: number;
  /** 연출용 [칸, 값] 목록 */
  pop: number[];
  drop: number[];
  boom: number[];
  free: number[];
  crack: number[];
  shatter: number[];
}
const newRes = (): Res => ({ popped: 0, dropped: 0, snacks: 0, blasted: 0, pop: [], drop: [], boom: [], free: [], crack: [], shatter: [] });

const mark = new Int32Array(NC);
let markGen = 1;
const stack = new Int32Array(NC * 2);

/** 같은 색(무지개 포함) 덩어리 */
function group(g: Int8Array, start: number, col: number, out: number[]) {
  const gen = ++markGen;
  let sp = 0;
  stack[sp++] = start;
  mark[start] = gen;
  while (sp) {
    const i = stack[--sp];
    out.push(i);
    for (const j of NB[i]) {
      if (mark[j] === gen) continue;
      const v = g[j];
      if (v === col || v === WILD) (mark[j] = gen), (stack[sp++] = j);
    }
  }
  return out;
}

/** 거품 v가 칸 cell에 붙는다(hit = 부딪힌 거품). g를 바꾸고 결과를 돌려준다 */
function resolve(g: Int8Array, cell: number, v: number, hit: number, det: boolean): Res {
  const res = newRes();
  g[cell] = v;
  const pop = new Set<number>(), ice = new Set<number>(), booms: number[] = [];
  if (hit >= 0 && (g[hit] === ICE || g[hit] === ICE2)) ice.add(hit);
  if (hit >= 0 && g[hit] === BOMB) booms.push(hit);
  if (isCol(v)) {
    const gr = group(g, cell, v, []);
    if (gr.length >= 3) for (const i of gr) pop.add(i);
  } else if (v === WILD) {
    const cols = new Set<number>();
    for (const j of NB[cell]) if (isCol(g[j])) cols.add(g[j]);
    for (const c of cols) {
      const gr = group(g, cell, c, []);
      if (gr.length >= 3) for (const i of gr) pop.add(i);
    }
  }
  for (const i of pop)
    for (const j of NB[i]) {
      if (pop.has(j)) continue;
      if (g[j] === ICE || g[j] === ICE2) ice.add(j);
      if (g[j] === BOMB && !booms.includes(j)) booms.push(j);
    }
  for (const i of pop) {
    if (det) res.pop.push(i, g[i]);
    g[i] = EMPTY;
    res.popped++;
  }
  for (const i of ice) {
    if (g[i] === ICE) {
      g[i] = ICE2;
      if (det) res.crack.push(i);
    } else if (g[i] === ICE2) {
      g[i] = EMPTY;
      res.popped++;
      if (det) res.shatter.push(i);
    }
  }
  // 폭탄: 둘레를 날린다(간식은 풀려나 양동이로, 옆 폭탄은 이어서 쾅)
  for (let k = 0; k < booms.length; k++) {
    const b = booms[k];
    if (g[b] !== BOMB) continue;
    g[b] = EMPTY;
    if (det) res.boom.push(b);
    for (const j of BL[b]) {
      const w = g[j];
      if (w < 0) continue;
      if (w === BOMB) {
        booms.push(j);
        continue;
      }
      if (w === SNACK) (res.snacks++, det && res.free.push(j, w));
      else det && res.pop.push(j, w);
      g[j] = EMPTY;
      res.blasted++;
    }
  }
  // 천장과 이어진 것만 남는다
  const gen = ++markGen;
  let sp = 0;
  for (let c = 0; c < COLS; c++) if (g[c] >= 0) (mark[c] = gen), (stack[sp++] = c);
  while (sp) {
    const i = stack[--sp];
    for (const j of NB[i]) if (g[j] >= 0 && mark[j] !== gen) (mark[j] = gen), (stack[sp++] = j);
  }
  for (const i of VALID) {
    if (g[i] < 0 || mark[i] === gen) continue;
    if (g[i] === SNACK) res.snacks++;
    if (det) res.drop.push(i, g[i]);
    g[i] = EMPTY;
    res.dropped++;
  }
  return res;
}

const snackLeft = (g: Int8Array) => {
  let n = 0;
  for (const i of VALID) if (g[i] === SNACK) n++;
  return n;
};
/** 아래 얼음 선을 넘었나 */
const overLine = (g: Int8Array, ceil: number) => {
  const lo = lowest(g);
  return lo >= 0 && ceil + RY[lo] + R > DEADY + 1e-6;
};

// ───────── 상태 ─────────
interface Ev { t: number; kind: string; x: number; y: number; text?: string; col?: string; v?: number; n?: number }
interface Fly { tr: Tr; v: number; k: number; n: number }
interface Fall { x: number; y: number; vx: number; vy: number; v: number; rot: number; t0: number; sd: number }
/** 얼음이 깨져 양동이로 튀어 가는 간식 (연출) */
interface Flop { x: number; y: number; x0: number; y0: number; tx: number; ty: number; t0: number; dur: number; st: number; ph: number; kind: number }
interface Lay { g: Int8Array; flip: boolean; pal: number[] }

export interface BubState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'play' | 'result'; pt: number;
  lays: Lay[];
  g: Int8Array; ceil: number; cur: number; nxt: number; shotNo: number; shots: number; used: number;
  snackTotal: number; caught: number; bestDrop: number; wind: number; sk: Skua | null;
  fly: Fly | null; cool: number;
  hearts: number; stars: number; got: number; starOk: boolean[]; pts: number; ok: boolean; why: string; won: boolean; dead: boolean; again: boolean; tries: number;
  down: boolean; aim: { x: number; y: number } | null; firstShot: boolean;
  seen: Set<string>; newsQ: string[]; news: { text: string; t: number } | null; events: Ev[];
  falls: Fall[]; flops: Flop[]; flopN: number; caughtAll: number;
  /** 양동이에 들어간 간식 수(연출 — 배가 빵빵해진다) */
  bucket: number;
  face: number; faceT: number; big: { pts: number; n: number; k: number; t: number } | null;
  /** 이번 판에 새것을 몇 번 썼나 (측정용) */
  use: Record<string, number>;
  /** 점수가 어디서 왔나 (측정용) */
  tally: Record<string, number>;
}

const ev = (s: BubState, kind: string, x: number, y: number, text?: string, col?: string, v?: number, n?: number) => s.events.push({ t: s.t, kind, x, y, text, col, v, n });
function see(s: BubState, key: string, text: string) {
  if (!key || s.seen.has(key)) return;
  s.seen.add(key);
  s.newsQ.push(text);
}

function buildLay(d: StageDef, rng: Rng): Lay {
  const flip = rng() < 0.5, pal = [0, 1, 2, 3, 4, 5];
  for (let k = pal.length - 1; k > 0; k--) {
    const j = Math.floor(rng() * (k + 1));
    [pal[k], pal[j]] = [pal[j], pal[k]];
  }
  const letters = 'abcde', used = new Set<number>();
  for (const row of d.map) for (const ch of row) if (letters.includes(ch)) used.add(letters.indexOf(ch));
  const n = Math.max(1, used.size);
  const g = new Int8Array(NC).fill(EMPTY);
  d.map.forEach((row, r) => {
    const w = r & 1 ? COLS - 1 : COLS;
    for (let c = 0; c < w && c < row.length; c++) {
      const ch = row[c], cc = flip ? w - 1 - c : c, i = r * COLS + cc;
      if (letters.includes(ch)) g[i] = pal[letters.indexOf(ch)];
      else if (ch === '?') g[i] = pal[Math.floor(rng() * n)];
      else if (ch === 'P') g[i] = SNACK;
      else if (ch === 'S') g[i] = STONE;
      else if (ch === 'I') g[i] = ICE;
      else if (ch === 'B') g[i] = BOMB;
    }
  });
  return { g, flip, pal };
}

/** 다음 거품: 판에 남은 색 중에서(없으면 판의 색 중에서) */
function roll(s: BubState, shotIdx: number): number {
  const d = STAGES[s.stage];
  if (d.wild?.includes(shotIdx)) return WILD;
  const cols: number[] = [];
  for (const i of VALID) if (isCol(s.g[i]) && !cols.includes(s.g[i])) cols.push(s.g[i]);
  if (!cols.length) {
    const pal = s.lays[s.stage].pal;
    for (let k = 0; k < 3; k++) cols.push(pal[k]);
  }
  cols.sort((a, b) => a - b);
  return cols[Math.floor(s.rng() * cols.length)];
}
function hasCol(g: Int8Array, v: number) {
  if (!isCol(v)) return true;
  for (const i of VALID) if (g[i] === v) return true;
  return false;
}

function newStage(s: BubState) {
  const d = STAGES[s.stage], lay = s.lays[s.stage];
  s.g = lay.g.slice() as Int8Array;
  s.ceil = CEIL0;
  s.shots = d.shots;
  s.used = 0;
  s.shotNo = 0;
  s.snackTotal = snackLeft(s.g);
  s.caught = 0;
  s.bestDrop = 0;
  s.wind = d.wind ?? 0;
  s.sk = d.skua ? { ph: s.rng() * Math.PI * 2, stun: 0 } : null;
  s.fly = null;
  s.cool = 0;
  s.phase = 'play';
  s.pt = 0;
  s.starOk = [false, false, false];
  s.use = {};
  if (d.first && !s.again) {
    const pal = lay.pal;
    s.cur = pal['abcde'.indexOf(d.first[0])];
    s.nxt = pal['abcde'.indexOf(d.first[1])];
  } else {
    s.cur = roll(s, 0);
    s.nxt = roll(s, 1);
  }
  if (d.key) s.seen.add(d.key);
}

const envOf = (s: BubState, dt = 0): Env => ({ wind: s.wind, sk: s.sk, t0: s.t + dt });
const aimAngle = (ax: number, ay: number) => Math.max(MINA, Math.min(Math.PI - MINA, Math.atan2(LY - ay, ax - LX)));
const canAim = (ay: number) => ay < LY - 0.05;

function release(s: BubState, ax: number, ay: number) {
  if (s.phase !== 'play' || s.fly || s.cool > 0 || s.shots <= 0) return;
  if (!canAim(ay)) return void ev(s, 'cancel', LX, LY - 0.08, '취소');
  const tr = trace(s.g, s.ceil, aimAngle(ax, ay), envOf(s), true);
  s.fly = { tr, v: s.cur, k: 0, n: Math.max(1, tr.path.length / 2) };
  s.shots--;
  s.used++;
  s.shotNo++;
  s.cur = s.nxt;
  s.nxt = roll(s, s.shotNo + 1);
  s.firstShot = true;
  s.face = 1;
  s.faceT = 24;
  ev(s, 'fire', LX, LY);
}

function land(s: BubState) {
  const f = s.fly!, d = STAGES[s.stage];
  s.fly = null;
  s.cool = COOL;
  const use = (k: string) => (s.use[k] = (s.use[k] ?? 0) + 1);
  if (f.tr.bounces) see(s, 'bank', '↩️ 벽에 튕겨 뒤쪽을 노릴 수 있어요'), use('bank');
  if (f.v === WILD) use('wild');
  if (f.tr.eaten) use('eat');
  if (f.tr.eaten) {
    s.sk!.stun = s.t + SKSTUN;
    const ex = f.tr.pts[f.tr.pts.length - 2];
    ev(s, 'eat', ex, SKY, '꿀꺽…끄억!', '#ffe0b0');
    see(s, 'skua', '🐦 도둑 갈매기 — 맞으면 거품을 삼키고 잠깐 기절해요');
  } else if (f.tr.cell >= 0) {
    const cell = f.tr.cell, hv = f.tr.hit >= 0 ? s.g[f.tr.hit] : EMPTY;
    const res = resolve(s.g, cell, f.v, f.tr.hit, true);
    ev(s, 'land', CX[cell], s.ceil + RY[cell], undefined, undefined, f.v);
    if (hv === ICE || hv === ICE2) see(s, 'ice', '🧊 얼음 거품 — 두 번 맞히면(옆에서 펑 해도) 와장창');
    if (res.crack.length || res.shatter.length) use('ice');
    if (res.boom.length) use('bomb');
    if (res.snacks && res.dropped) use('dropsave');
    let gain = 0;
    const tal = (k: string, v: number) => ((s.tally[k] = (s.tally[k] ?? 0) + v), (gain += v));
    if (res.popped) {
      tal('pop', res.popped * 10);
      for (let k = 0; k < res.pop.length; k += 2) ev(s, 'pop', CX[res.pop[k]], s.ceil + RY[res.pop[k]], undefined, undefined, res.pop[k + 1]);
      if (res.pop.length) {
        const m = res.pop.length / 2;
        ev(s, 'popsay', CX[res.pop[0]], s.ceil + RY[res.pop[0]], m >= 5 ? `펑펑펑! ×${m}` : '펑!', '#ffffff');
      }
      see(s, 'pop', '🫧 같은 색 3개가 붙으면 펑!');
    }
    for (const i of res.crack) ev(s, 'crack', CX[i], s.ceil + RY[i], '쩍!', '#dff6ff');
    for (const i of res.shatter) ev(s, 'shatter', CX[i], s.ceil + RY[i], '와장창!', '#dff6ff');
    for (const b of res.boom) ev(s, 'boom', CX[b], s.ceil + RY[b], '쾅!', '#ffd08a'), see(s, 'bomb', '💣 폭탄 거품 — 맞히면 쾅! 둘레가 통째로 날아가요');
    for (let k = 0; k < res.free.length; k += 2) addFlop(s, CX[res.free[k]], s.ceil + RY[res.free[k]], res.free[k] % 3);
    if (res.dropped) {
      for (let k = 0; k < res.drop.length; k += 2) {
        const i = res.drop[k], v = res.drop[k + 1];
        s.falls.push({ x: CX[i], y: s.ceil + RY[i], vx: (hsh(i + s.t) - 0.5) * 0.004, vy: -0.004 - hsh(i * 7 + s.t) * 0.004, v, rot: hsh(i) * 6, t0: s.t, sd: i });
      }
      tal('drop', (10 * res.dropped * (res.dropped + 1)) / 2);
      see(s, 'drop', '⬇️ 천장과 이어진 데가 없어지면 우수수 떨어져요');
    }
    if (res.snacks) {
      tal('snack', 100 * res.snacks * res.snacks);
      see(s, 'snack', '🐟 얼린 간식은 떨궈야 양동이로 쏙 — 한 발에 여럿이면 제곱!');
    }
    s.caught += res.snacks;
    s.caughtAll += res.snacks;
    s.bestDrop = Math.max(s.bestDrop, res.dropped);
    s.pts += gain;
    if (res.dropped >= 5 || res.snacks >= 2) s.big = { pts: gain, n: res.dropped, k: res.snacks, t: s.t };
    if (res.dropped || res.snacks) (s.face = res.snacks >= 2 ? 6 : res.snacks ? 3 : 2), (s.faceT = res.snacks >= 2 ? 130 : 70);
    if (res.snacks >= 2) ev(s, 'drool', EATX, LY - 0.09, ['츄릅… 감동이야ㅠㅠ', '침 질질~ 냠냠 예약!', '이게 다 내 거?!'][s.used % 3], '#fff1f5');
    if (res.dropped >= d.big) ev(s, 'bigstar', 0.5, 0.6, `한 발에 ${res.dropped}개 우수수! ★`, '#ffe066');
  }
  // 얼음 천장
  if (d.drop && s.used % d.drop === 0 && snackLeft(s.g) > 0) {
    s.ceil += ROWH;
    ev(s, 'ceil', 0.5, s.ceil, '쿵! 얼음 천장이 내려와요', '#dff6ff');
  }
  if (d.wind && s.used % 3 === 0) {
    s.wind = -s.wind;
    ev(s, 'windflip', 0.5, 0.5, s.wind > 0 ? '바람이 오른쪽으로 →' : '← 바람이 왼쪽으로', '#e8f6ff');
  }
  if (!hasCol(s.g, s.cur)) s.cur = roll(s, -1);
  if (!hasCol(s.g, s.nxt)) s.nxt = roll(s, -1);
  if (snackLeft(s.g) === 0) return endStage(s, true, '');
  if (overLine(s.g, s.ceil)) return endStage(s, false, '거품이 얼음 선을 넘었어요');
  if (s.shots <= 0) return endStage(s, false, '거품을 다 썼어요');
}

function addFlop(s: BubState, x: number, y: number, kind: number) {
  const k = s.flopN++, tx = BUCKX + (hsh(k * 1.7) - 0.5) * 0.05, ty = FLOOR - 0.06;
  s.flops.push({ x, y, x0: x, y0: y, tx, ty, t0: s.t, dur: Math.round(34 + Math.hypot(tx - x, ty - y) * 34), st: 0, ph: hsh(k + 7) * 6, kind });
}

function endStage(s: BubState, ok: boolean, why: string) {
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  s.why = why;
  const d = STAGES[s.stage];
  if (ok) {
    s.starOk = [true, s.used <= d.par, s.bestDrop >= d.big];
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    s.pts += s.got * STAR_PTS + s.shots * LEFT_PTS;
    s.tally.star = (s.tally.star ?? 0) + s.got * STAR_PTS;
    s.tally.left = (s.tally.left ?? 0) + s.shots * LEFT_PTS;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    ev(s, 'clear', 0.5, 0.6, s.won ? '양동이 가득! 🐟' : '다 받았다!');
    s.face = 3;
    s.faceT = 200;
  } else {
    s.hearts--;
    s.tries++;
    s.face = 4;
    s.faceT = 160;
    ev(s, 'fail', 0.5, 0.6, why);
  }
}

/** 연출: 떨어지는 거품 · 양동이로 튀는 간식 · 먹보 표정 (시뮬레이션 결과와 무관 — 난수 대신 해시를 쓴다) */
function cosmetic(s: BubState) {
  for (const f of s.falls) {
    f.vy += 0.0011;
    f.x += f.vx;
    f.y += f.vy;
    f.rot += f.vx * 20;
    if (f.x < WL + R * 0.6 || f.x > WR - R * 0.6) f.vx = -f.vx;
    if (f.v === SNACK && s.t - f.t0 > 12 && f.vy > 0) {
      // 간식 얼음은 떨어지다 '쨍' 깨지고, 간식이 파닥파닥 양동이로
      addFlop(s, f.x, f.y, f.sd % 3);
      ev(s, 'thaw', f.x, f.y, ['쨍!', '파닥!', '풀려났다!', '퐁!'][(s.t + Math.round(f.x * 10)) % 4], '#e6f8ff');
      f.v = -9;
    }
  }
  s.falls = s.falls.filter((f) => {
    if (f.v === -9) return false;
    if (f.y > FLOOR - 0.02) {
      ev(s, 'splat', f.x, FLOOR - 0.02, undefined, undefined, f.v);
      return false;
    }
    return true;
  });
  for (const c of s.flops) {
    if (c.st !== 0) continue;
    const p = Math.min(1, (s.t - c.t0) / c.dur);
    c.x = c.x0 + (c.tx - c.x0) * p;
    c.y = c.y0 + (c.ty - c.y0) * p - 0.16 * 4 * p * (1 - p);
    if (p >= 1) (c.st = 1), s.bucket++, ev(s, 'plop', c.tx, c.ty, ['철퍼덕!', '쏙!', '냠 예약!', '풍덩!'][s.bucket % 4], '#fff6d6');
  }
  s.flops = s.flops.filter((c) => c.st === 0);
  if (s.faceT > 0 && --s.faceT === 0) s.face = 0;
}

export const bubbleshot: GameDef<BubState> = {
  id: 'bubbleshot',
  name: '펭귄 거품 쏘기',
  genes: ['bubble', 'pointer', 'chain'],
  twist: '얼린 물고기 간식이 든 얼음 거품은 색이 없어 절대 안 터진다 — 매달린 줄기를 끊어 덩어리째 떨어뜨려야 간식이 파닥파닥 튀어 먹보 펭귄의 양동이로 철퍼덕, 한 발에 여럿 받을수록 점수가 제곱으로 커지고 펭귄은 침을 흘리며 감동한다',
  rules: [
    '누르고 있으면 조준선이 보이고, 떼면 거품이 날아가요 (벽에 튕겨요).',
    '같은 색 3개가 붙으면 펑! 매달린 데가 없어진 거품은 우수수 — 얼린 간식을 떨어뜨려 양동이로 받아요.',
  ],
  controls: 'touch',
  hint: '누르면 조준선, 떼면 발사! / 화살표로 겨누고 스페이스',
  aspect: A,
  art: {
    concept: '남극 얼음 동굴 디오라마 — 먹보 펭귄의 얼린 간식 사냥',
    mood: '푸르게 빛나는 얼음 동굴, 천장에 고드름이 반짝이고 갈라진 틈으로 오로라가 일렁인다. 얼음 바닥에 선 먹보 펭귄이 거품 대롱으로 색 거품을 쏘고, 천장에 얼어붙은 생선·새우·오징어 간식이 우수수 떨어져 파닥파닥 양동이로 들어간다. 받을수록 펭귄 배가 빵빵해지고, 구석의 물범이 군침을 흘리며 박수를 친다.',
    palette: { bg: '#0d2a44', ink: '#f4fbff', muted: '#9cc3dc', accent: '#7fe0ff', hot: '#ff6b7a', soft: '#cfefff' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const rng = mulberry32(seed);
    const lays = STAGES.map((d) => buildLay(d, rng));
    const s = {
      rng, seed, t: 0, stage: 0, phase: 'play', pt: 0, lays,
      g: new Int8Array(NC), ceil: CEIL0, cur: 0, nxt: 0, shotNo: 0, shots: 0, used: 0,
      snackTotal: 0, caught: 0, bestDrop: 0, wind: 0, sk: null, fly: null, cool: 0,
      hearts: 3, stars: 0, got: 0, starOk: [false, false, false], pts: 0, ok: false, why: '', won: false, dead: false, again: false, tries: 0,
      down: false, aim: null, firstShot: false, seen: new Set<string>(), newsQ: [], news: null, events: [],
      falls: [], flops: [], flopN: 0, caughtAll: 0, bucket: 0, face: 0, faceT: 0, big: null, use: {}, tally: {},
    } as BubState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    s.pt++;
    s.events = s.events.filter((e) => s.t - e.t < 120);
    const p = inp.pointer ?? null;
    if (p) (s.down = true), (s.aim = { x: p.x, y: p.y * A });
    else if (s.down) {
      s.down = false;
      const a = s.aim;
      s.aim = null;
      if (a) release(s, a.x, a.y);
    }
    if (s.fly) {
      s.fly.k++;
      if (s.fly.k >= s.fly.n && s.phase === 'play') land(s);
    } else if (s.cool > 0) s.cool--;
    cosmetic(s);
    if (!s.news || s.t - s.news.t > NEWS_T) s.news = s.newsQ.length ? { text: s.newsQ.shift()!, t: s.t } : s.news;
    if (s.phase === 'result' && s.pt >= (s.ok ? RESULT_OK : RESULT)) {
      if (s.ok) {
        if (s.won) s.dead = true;
        else (s.again = false), s.stage++, newStage(s);
      } else if (s.hearts <= 0) s.dead = true;
      else (s.again = true), newStage(s);
    }
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
const NANG = 64;
const ANGS = Array.from({ length: NANG }, (_, k) => MINA + ((Math.PI - 2 * MINA) * k) / (NANG - 1));
const ANGS2 = Array.from({ length: 36 }, (_, k) => MINA + ((Math.PI - 2 * MINA) * k) / 35);
interface Opt { ang: number; tr: Tr; key: string }
/** 각도를 훑어 서로 다른 '붙는 자리'만 남긴다(같은 자리로 가는 각도들 중 가운데) */
function options(g: Int8Array, ceil: number, env: Env, angs: number[]): Opt[] {
  const by = new Map<string, { angs: number[]; tr: Tr }>();
  for (const a of angs) {
    const tr = trace(g, ceil, a, env, false);
    const key = tr.eaten ? 'eat' : `${tr.cell}:${tr.hit}`;
    const e = by.get(key);
    if (e) e.angs.push(a);
    else by.set(key, { angs: [a], tr });
  }
  return [...by.entries()].map(([key, e]) => ({ key, tr: e.tr, ang: e.angs[(e.angs.length - 1) >> 1] }));
}

/** 판의 모양 값: 간식이 매달린 덩어리의 천장 닻이 적을수록, 거품이 적을수록, 아래 선에서 멀수록 좋다 */
function shape(g: Int8Array, ceil: number) {
  if (overLine(g, ceil)) return -1e6;
  let v = 0, occ = 0;
  for (const i of VALID) if (g[i] >= 0) occ++;
  v -= occ * 4;
  // 간식에서 출발해 닿는 천장 닻 수
  const gen = ++markGen;
  let sp = 0, anchors = 0, peng = 0;
  for (const i of VALID) if (g[i] === SNACK && mark[i] !== gen) (mark[i] = gen), (stack[sp++] = i), peng++;
  while (sp) {
    const i = stack[--sp];
    if (i < COLS) anchors++;
    for (const j of NB[i]) if (g[j] >= 0 && mark[j] !== gen) (mark[j] = gen), (stack[sp++] = j);
  }
  if (!peng) return 30000;
  v -= anchors * 70 + peng * 400;
  const lo = lowest(g), room = (DEADY - (ceil + RY[lo] + R)) / ROWH;
  if (room < 2.5) v -= 900 / (room + 0.4);
  return v;
}
function gain(res: Res, st: { big: number; bestDrop: number }) {
  return res.snacks * 1000 + res.snacks * res.snacks * 150 + res.popped * 6 + res.dropped * 15 + res.blasted * 6 + (res.dropped >= st.big && st.bestDrop < st.big ? 2500 : 0);
}

function plan(s: BubState, dt: number): number {
  const d = STAGES[s.stage], st = { big: d.big, bestDrop: s.bestDrop };
  const env = envOf(s, dt), opts = options(s.g, s.ceil, env, ANGS);
  const willDrop = (n: number) => !!d.drop && (s.used + n) % d.drop === 0;
  const scored = opts.map((o) => {
    const g = s.g.slice() as Int8Array;
    let v = 0;
    if (o.tr.eaten) v = -400;
    else if (o.tr.cell >= 0) v = gain(resolve(g, o.tr.cell, s.cur, o.tr.hit, false), st);
    const ceil = s.ceil + (willDrop(1) ? ROWH : 0);
    const left = snackLeft(g);
    const sh = left ? shape(g, ceil) : 30000 + (s.used + 1 <= d.par ? 4000 : 0);
    return { o, g, ceil, v, sh, total: v + sh };
  });
  scored.sort((a, b) => b.total - a.total);
  let best = scored[0], bv = best.total;
  if (s.shots >= 2 && snackLeft(best.g) > 0) {
    for (const c of scored.slice(0, 6)) {
      if (!snackLeft(c.g) || c.sh < -1e5) continue;
      const st2 = { big: d.big, bestDrop: Math.max(s.bestDrop, 0) };
      const nv = s.nxt;
      for (const o2 of options(c.g, c.ceil, { ...env, t0: env.t0 + 60 }, ANGS2)) {
        const g2 = c.g.slice() as Int8Array;
        let v2 = 0;
        if (o2.tr.eaten) v2 = -400;
        else if (o2.tr.cell >= 0) v2 = gain(resolve(g2, o2.tr.cell, nv, o2.tr.hit, false), st2);
        const ceil2 = c.ceil + (willDrop(2) ? ROWH : 0);
        const sh2 = snackLeft(g2) ? shape(g2, ceil2) : 30000 + (s.used + 2 <= d.par ? 4000 : 0) - 500;
        const tot = c.v + 0.95 * v2 + sh2;
        if (tot > bv) (bv = tot), (best = c);
      }
    }
  }
  return best.o.ang;
}

/** 버릇 봇: 같은 색이 가장 많이 붙는 자리에 바로 쏜다(떨어질 것·간식은 안 본다) */
function habitPlan(s: BubState, dt: number): number {
  const opts = options(s.g, s.ceil, envOf(s, dt), ANGS);
  let best = opts[0], bv = -1;
  for (const o of opts) {
    if (o.tr.eaten || o.tr.cell < 0) continue;
    const g = s.g.slice() as Int8Array;
    g[o.tr.cell] = s.cur;
    let n = 0;
    if (isCol(s.cur)) n = group(g, o.tr.cell, s.cur, []).length;
    else for (const j of NB[o.tr.cell]) if (isCol(g[j])) n = Math.max(n, group(g, o.tr.cell, g[j], []).length);
    if (n > bv) (bv = n), (best = o);
  }
  return best.ang;
}

const HOLD = 12;
const NO: Input = { tap: false, dir: 0, pointer: null };
const ptAt = (ang: number): Input => ({ tap: false, dir: 0, pointer: { x: LX + Math.cos(ang) * 0.4, y: (LY - Math.sin(ang) * 0.4) / A } });
const mind = new WeakMap<object, { key: string; ang: number; at: number }>();
function shooter(name: string, pick: (s: BubState, dt: number) => number): Bot<BubState> {
  return {
    name,
    act(s) {
      if (s.phase !== 'play' || s.fly || s.cool > 0 || s.shots <= 0) return NO;
      const key = `${s.stage}:${s.tries}:${s.used}`;
      let m = mind.get(s);
      if (!m || m.key !== key) mind.set(s, (m = { key, ang: pick(s, HOLD), at: s.t + HOLD }));
      if (s.t >= m.at && s.down) return NO;
      return ptAt(m.ang);
    },
  };
}

/** 봇: 쏠 수 있는 자리를 모두 내다보고(지금 거품 + 다음 거품 두 발 앞까지) 간식을 가장 많이·빨리 떨어뜨리는 자리 */
export const bubbleshotSmart: Bot<BubState> = shooter('간식 사냥꾼', plan);
/** 버릇 봇(측정용): 같은 색이 가장 많이 붙는 자리에 바로 */
export const bubbleshotHabit: Bot<BubState> = shooter('같은 색 많은 데', habitPlan);

const dumbMem = new WeakMap<object, { next: number; hold: number; x: number; y: number }>();
/** 봇: 아무 데나 누르고 아무 때나 뗀다 */
export const bubbleshotRandom: Bot<BubState> = {
  name: '아무 데나 퐁',
  act(s, rng) {
    let m = dumbMem.get(s);
    if (!m) dumbMem.set(s, (m = { next: s.t + 20 + Math.floor(rng() * 60), hold: 0, x: 0, y: 0 }));
    if (m.hold > 0) {
      m.hold--;
      return m.hold > 0 ? { tap: false, dir: 0, pointer: { x: m.x, y: m.y } } : NO;
    }
    if (s.t < m.next) return NO;
    m.next = s.t + 25 + Math.floor(rng() * 90);
    m.x = rng();
    m.y = rng();
    m.hold = 2 + Math.floor(rng() * 6);
    return { tap: false, dir: 0, pointer: { x: m.x, y: m.y } };
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
/** 거품 색: [밝은 곳, 바탕, 그늘] — 색약도 구분하게 무늬를 하나씩 넣는다 */
const BCOL = [
  ['#ffc2cc', '#ff4d6d', '#b31f3d'],
  ['#fff3b0', '#ffc531', '#c27f00'],
  ['#c4e8ff', '#359cff', '#1650b8'],
  ['#c4f7d6', '#2fcf74', '#127a40'],
  ['#ead6ff', '#a565ff', '#6328bd'],
  ['#ffd8bd', '#ff8833', '#bd4a12'],
];
const COLHEX = ['#ff4d6d', '#ffc531', '#359cff', '#2fcf74', '#a565ff', '#ff8833'];
const recentSay = new WeakMap<object, { x: number; y: number; t: number }[]>();
const PREV = new WeakMap<object, { key: string; tr: Tr; res: Res | null; g: Int8Array }>();

function starPath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}
function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0.1, r), 0, Math.PI * 2);
}

/** 색 거품 속 무늬 (하트 · 별 · 물방울 · 잎 · 달 · 마름모) */
function glyph(ctx: CanvasRenderingContext2D, v: number, x: number, y: number, r: number) {
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  ctx.beginPath();
  if (v === 0) {
    ctx.moveTo(x, y + r * 0.75);
    ctx.bezierCurveTo(x - r * 1.2, y - r * 0.1, x - r * 0.55, y - r * 1.0, x, y - r * 0.35);
    ctx.bezierCurveTo(x + r * 0.55, y - r * 1.0, x + r * 1.2, y - r * 0.1, x, y + r * 0.75);
  } else if (v === 1) starPath(ctx, x, y, r * 0.95);
  else if (v === 2) {
    ctx.moveTo(x, y - r);
    ctx.bezierCurveTo(x + r * 0.9, y + r * 0.1, x + r * 0.6, y + r * 0.8, x, y + r * 0.8);
    ctx.bezierCurveTo(x - r * 0.6, y + r * 0.8, x - r * 0.9, y + r * 0.1, x, y - r);
  } else if (v === 3) {
    ctx.ellipse(x, y, r * 0.5, r * 0.9, 0.7, 0, Math.PI * 2);
  } else if (v === 4) {
    ctx.arc(x, y, r * 0.8, 0.6, Math.PI * 2 - 0.6);
    ctx.arc(x + r * 0.45, y - r * 0.05, r * 0.6, Math.PI * 2 - 0.9, 0.9, true);
  } else {
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r * 0.75, y);
    ctx.lineTo(x, y + r);
    ctx.lineTo(x - r * 0.75, y);
  }
  ctx.closePath();
  ctx.fill();
}

/** 얼린 간식: kind 0 생선 · 1 새우 · 2 오징어. frozen이면 얼음 속에서 눈만 끔뻑, 아니면 파닥파닥 (u = 몸 반 길이) */
function drawSnack(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, kind: number, t: number, sd: number, frozen: boolean) {
  const wig = frozen ? 0 : Math.sin(t * 0.9 + sd) * 0.35;
  const blink = frozen && (t + sd * 53) % 190 < 8;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(frozen ? -0.25 + 0.5 * hsh(sd) : wig);
  const eye = (ex: number, ey: number, er: number) => {
    ctx.fillStyle = '#ffffff';
    circle(ctx, ex, ey, er);
    ctx.fill();
    ctx.fillStyle = '#141a22';
    if (blink) ctx.fillRect(ex - er, ey - er * 0.15, er * 2, er * 0.3);
    else (circle(ctx, ex + er * 0.2, ey, er * 0.55), ctx.fill());
  };
  if (kind === 0) {
    // 생선 (주황 고등어빛 · 꼬리 파닥)
    ctx.fillStyle = '#ff8f5e';
    ctx.beginPath();
    ctx.moveTo(-u * 0.75, 0);
    ctx.lineTo(-u * 1.2, -u * 0.45 + wig * u * 0.3);
    ctx.lineTo(-u * 1.15, u * 0.45 + wig * u * 0.3);
    ctx.closePath();
    ctx.fill();
    const g = ctx.createLinearGradient(0, -u * 0.5, 0, u * 0.5);
    g.addColorStop(0, '#ffb48a');
    g.addColorStop(0.55, '#ff7a4a');
    g.addColorStop(1, '#ffe2c8');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, u * 0.9, u * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(160,60,30,.45)';
    ctx.lineWidth = Math.max(1, u * 0.06);
    for (const k of [-0.25, 0.05]) {
      ctx.beginPath();
      ctx.arc(u * k, 0, u * 0.32, -0.9, 0.9);
      ctx.stroke();
    }
    eye(u * 0.5, -u * 0.12, u * 0.15);
    ctx.strokeStyle = '#a8402a';
    ctx.beginPath();
    ctx.arc(u * 0.82, u * 0.12, u * 0.08, 0.3, Math.PI - 0.3);
    ctx.stroke();
  } else if (kind === 1) {
    // 새우 (동그랗게 말린 몸 · 마디 · 꼬리 부채)
    ctx.strokeStyle = '#ff6f4f';
    ctx.lineCap = 'round';
    ctx.lineWidth = u * 0.55;
    ctx.beginPath();
    ctx.arc(0, 0, u * 0.55, -Math.PI * 0.9, Math.PI * 0.45);
    ctx.stroke();
    ctx.strokeStyle = '#ffd2b8';
    ctx.lineWidth = Math.max(1, u * 0.07);
    for (let k = 0; k < 4; k++) {
      const a = -Math.PI * 0.7 + k * 0.5;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * u * 0.32, Math.sin(a) * u * 0.32);
      ctx.lineTo(Math.cos(a) * u * 0.8, Math.sin(a) * u * 0.8);
      ctx.stroke();
    }
    ctx.fillStyle = '#ff8a5c';
    const tx0 = Math.cos(Math.PI * 0.45) * u * 0.55, ty0 = Math.sin(Math.PI * 0.45) * u * 0.55;
    ctx.beginPath();
    ctx.moveTo(tx0, ty0);
    ctx.lineTo(tx0 - u * 0.45, ty0 + u * 0.25 + wig * u * 0.2);
    ctx.lineTo(tx0 - u * 0.1, ty0 + u * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ff6f4f';
    ctx.lineWidth = Math.max(1, u * 0.05);
    ctx.beginPath();
    ctx.moveTo(-u * 0.5, -u * 0.35);
    ctx.quadraticCurveTo(-u * 0.9, -u * 1.0, -u * 0.2 + wig * u, -u * 1.15);
    ctx.stroke();
    eye(-u * 0.3, -u * 0.5, u * 0.13);
  } else {
    // 오징어 (보라빛 몸통 · 지느러미 · 다리 꼬물)
    ctx.fillStyle = '#c98bff';
    ctx.beginPath();
    ctx.moveTo(0, -u * 1.0);
    ctx.lineTo(-u * 0.55, -u * 0.6);
    ctx.lineTo(u * 0.55, -u * 0.6);
    ctx.closePath();
    ctx.fill();
    const g = ctx.createLinearGradient(-u * 0.4, 0, u * 0.4, 0);
    g.addColorStop(0, '#e7c7ff');
    g.addColorStop(1, '#a86ef0');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, -u * 0.2, u * 0.38, u * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#b57bf5';
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1.2, u * 0.12);
    for (let k = 0; k < 5; k++) {
      const x0 = (k - 2) * u * 0.15;
      ctx.beginPath();
      ctx.moveTo(x0, u * 0.3);
      ctx.quadraticCurveTo(x0 + Math.sin(t * 0.4 + k) * u * (frozen ? 0.05 : 0.25), u * 0.7, x0 * 1.3, u * 1.0);
      ctx.stroke();
    }
    eye(-u * 0.15, u * 0.05, u * 0.12);
    eye(u * 0.15, u * 0.05, u * 0.12);
  }
  ctx.restore();
}

/** 거품 한 알. v = 색 0~5 · 얼린 간식 · 돌 · 얼음 · 폭탄 · 무지개 */
function drawBubble(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, v: number, t: number, sd: number) {
  if (isCol(v)) {
    const c = BCOL[v], g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.42, r * 0.08, x, y, r);
    g.addColorStop(0, c[0]);
    g.addColorStop(0.55, c[1]);
    g.addColorStop(1, c[2]);
    ctx.fillStyle = g;
    circle(ctx, x, y, r);
    ctx.fill();
    glyph(ctx, v, x + r * 0.04, y + r * 0.08, r * 0.4);
  } else if (v === SNACK) {
    // 색 없는 얼음 거품 속에 얼린 간식
    const bg = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.05, x, y, r);
    bg.addColorStop(0, '#f4fcff');
    bg.addColorStop(0.7, '#cdeefc');
    bg.addColorStop(1, '#8cc9ea');
    ctx.fillStyle = bg;
    circle(ctx, x, y, r);
    ctx.fill();
    drawSnack(ctx, x, y + r * 0.05, r * 0.52, sd % 3, t, sd, true);
    const g = ctx.createRadialGradient(x, y, r * 0.35, x, y, r);
    g.addColorStop(0, 'rgba(225,246,255,.18)');
    g.addColorStop(1, 'rgba(225,246,255,.7)');
    ctx.fillStyle = g;
    circle(ctx, x, y, r);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.75)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + r * 0.2, y - r * 0.75);
    ctx.lineTo(x + r * 0.45, y - r * 0.35);
    ctx.lineTo(x + r * 0.7, y - r * 0.4);
    ctx.moveTo(x - r * 0.7, y + r * 0.3);
    ctx.lineTo(x - r * 0.4, y + r * 0.5);
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1.4, r * 0.08);
    circle(ctx, x, y, r * 0.95);
    ctx.stroke();
    // 반짝 눈송이
    const tw = 0.5 + 0.5 * Math.sin(t * 0.12 + sd);
    ctx.fillStyle = `rgba(255,255,255,${0.5 + 0.5 * tw})`;
    starPath(ctx, x + r * 0.55, y + r * 0.5, r * 0.16 * (0.6 + 0.4 * tw));
    ctx.fill();
  } else if (v === STONE) {
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.4, r * 0.1, x, y, r);
    g.addColorStop(0, '#a3afbd');
    g.addColorStop(0.6, '#5f6b7a');
    g.addColorStop(1, '#343c48');
    ctx.fillStyle = g;
    ctx.beginPath();
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2, rr = r * (0.9 + 0.1 * hsh(k + sd * 9));
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(20,25,35,.5)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.3, y + r * 0.1);
    ctx.lineTo(x, y + r * 0.25);
    ctx.lineTo(x + r * 0.15, y + r * 0.55);
    ctx.stroke();
    // 눈 모자
    ctx.fillStyle = '#f4fbff';
    ctx.beginPath();
    ctx.ellipse(x - r * 0.05, y - r * 0.62, r * 0.62, r * 0.3, -0.1, Math.PI, Math.PI * 2);
    ctx.quadraticCurveTo(x + r * 0.3, y - r * 0.45, x - r * 0.67, y - r * 0.6);
    ctx.fill();
  } else if (v === ICE || v === ICE2) {
    const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
    g.addColorStop(0, 'rgba(240,252,255,.95)');
    g.addColorStop(0.5, 'rgba(150,215,245,.85)');
    g.addColorStop(1, 'rgba(70,150,210,.9)');
    ctx.fillStyle = g;
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
      ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.beginPath();
    ctx.moveTo(x - r * 0.5, y - r * 0.2);
    ctx.lineTo(x, y - r * 0.55);
    ctx.lineTo(x + r * 0.45, y - r * 0.25);
    ctx.moveTo(x, y - r * 0.55);
    ctx.lineTo(x, y + r * 0.6);
    ctx.stroke();
    if (v === ICE2) {
      ctx.strokeStyle = '#0d3a5c';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x - r * 0.7, y - r * 0.1);
      ctx.lineTo(x - r * 0.2, y + r * 0.05);
      ctx.lineTo(x - r * 0.05, y - r * 0.4);
      ctx.lineTo(x + r * 0.35, y + r * 0.2);
      ctx.lineTo(x + r * 0.7, y + r * 0.05);
      ctx.moveTo(x - r * 0.2, y + r * 0.05);
      ctx.lineTo(x - r * 0.1, y + r * 0.6);
      ctx.stroke();
    }
  } else if (v === BOMB) {
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
    g.addColorStop(0, '#6b7a99');
    g.addColorStop(0.6, '#2a3247');
    g.addColorStop(1, '#10141f');
    ctx.fillStyle = g;
    circle(ctx, x, y + r * 0.08, r * 0.88);
    ctx.fill();
    ctx.fillStyle = '#8b97ad';
    ctx.fillRect(x - r * 0.2, y - r * 0.92, r * 0.4, r * 0.2);
    ctx.strokeStyle = '#c9a36a';
    ctx.lineWidth = Math.max(1.2, r * 0.09);
    ctx.beginPath();
    ctx.moveTo(x, y - r * 0.9);
    ctx.quadraticCurveTo(x + r * 0.3, y - r * 1.25, x + r * 0.55, y - r * 1.05);
    ctx.stroke();
    const sp = 0.6 + 0.4 * Math.sin(t * 0.5 + sd);
    ctx.fillStyle = '#fff3a0';
    starPath(ctx, x + r * 0.58, y - r * 1.08, r * 0.28 * sp);
    ctx.fill();
    ctx.fillStyle = '#ff7a3a';
    circle(ctx, x + r * 0.58, y - r * 1.08, r * 0.1);
    ctx.fill();
    // 화난 눈썹 얼굴
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1, r * 0.08);
    ctx.beginPath();
    ctx.moveTo(x - r * 0.42, y - r * 0.12);
    ctx.lineTo(x - r * 0.15, y - r * 0.02);
    ctx.moveTo(x + r * 0.42, y - r * 0.12);
    ctx.lineTo(x + r * 0.15, y - r * 0.02);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    circle(ctx, x - r * 0.25, y + r * 0.15, r * 0.08);
    circle(ctx, x + r * 0.25, y + r * 0.15, r * 0.08);
    ctx.fill();
  } else if (v === WILD) {
    const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
    for (let k = 0; k <= 6; k++) g.addColorStop(k / 6, `hsl(${(k * 60 + t * 3) % 360}, 95%, 62%)`);
    ctx.fillStyle = g;
    circle(ctx, x, y, r);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    starPath(ctx, x, y + r * 0.05, r * 0.45);
    ctx.fill();
  }
  if (v !== SNACK && v !== ICE && v !== ICE2) {
    // 테두리 빛(얼음 반사) · 반짝
    ctx.strokeStyle = 'rgba(205,240,255,.5)';
    ctx.lineWidth = Math.max(1, r * 0.09);
    ctx.beginPath();
    ctx.arc(x, y, r * 0.84, Math.PI * 0.12, Math.PI * 0.62);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,.88)';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.38, y - r * 0.44, r * 0.24, r * 0.13, -0.65, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  circle(ctx, x - r * 0.07, y - r * 0.64, r * 0.065);
  ctx.fill();
}

/** 먹보 펭귄 (오른쪽을 비스듬히 보며 거품 대롱을 문다). mood 0 평소 · 1 후!(불었다) · 2 깜짝 · 3 우쭐 · 4 벌러덩 · 5 겨누는 중(볼 빵빵)
 *  · 6 감동(눈 반짝 · 침 질질). puff = 볼이 부푼 정도(0~1), look = 눈이 보는 방향(라디안, 위 = π/2), full = 배 부른 정도(0~1) */
function drawEater(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, mood: number, t: number, puff: number, look: number, pipe: boolean, full: number) {
  ctx.fillStyle = 'rgba(10,40,70,.3)';
  ctx.beginPath();
  ctx.ellipse(x, y, u * 0.8, u * 0.17, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(x, y);
  if (mood === 4) (ctx.rotate(-1.45), ctx.translate(u * 0.6, -u * 0.3));
  else if (mood === 3) ctx.rotate(-0.08);
  const chest = (mood === 3 || mood === 6 ? 1.1 : 1) * (1 + 0.32 * full);
  // 발
  ctx.fillStyle = '#ff9a2e';
  for (const s2 of [-1, 1]) {
    ctx.save();
    ctx.translate(s2 * u * 0.27 + u * 0.08, -u * 0.04);
    if (mood === 4) ctx.rotate(Math.sin(t * 0.6 + s2) * 0.8);
    ctx.beginPath();
    ctx.ellipse(u * 0.06, 0, u * 0.25, u * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // 뒤쪽 날개 (왼쪽)
  ctx.fillStyle = '#121925';
  ctx.save();
  ctx.translate(-u * 0.52, -u * 0.95);
  ctx.rotate(mood === 4 ? Math.sin(t * 0.7) * 1.2 : mood === 3 ? 0.9 : mood === 2 ? 1.6 : 0.3 + 0.06 * Math.sin(t * 0.06));
  ctx.beginPath();
  ctx.ellipse(0, u * 0.42, u * 0.14, u * 0.46, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // 몸
  const bg = ctx.createLinearGradient(-u * 0.65, 0, u * 0.65, 0);
  bg.addColorStop(0, '#0f141d');
  bg.addColorStop(0.45, '#1f2838');
  bg.addColorStop(1, '#3a4862');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.ellipse(0, -u * 0.78, u * 0.64 * chest, u * 0.8, 0, 0, Math.PI * 2);
  ctx.fill();
  // 배 (오른쪽으로 치우침 = 오른쪽을 본다)
  const wg = ctx.createRadialGradient(u * 0.05, -u * 0.85, u * 0.1, u * 0.12, -u * 0.6, u * 0.62);
  wg.addColorStop(0, '#ffffff');
  wg.addColorStop(1, '#d5e2ee');
  ctx.fillStyle = wg;
  ctx.beginPath();
  ctx.ellipse(u * 0.14, -u * 0.6, u * 0.42 * chest, u * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // 목의 노란 털
  const yg = ctx.createLinearGradient(0, -u * 1.34, 0, -u * 0.98);
  yg.addColorStop(0, '#ffb43a');
  yg.addColorStop(1, 'rgba(255,230,140,0)');
  ctx.fillStyle = yg;
  ctx.beginPath();
  ctx.ellipse(u * 0.12, -u * 1.14, u * 0.4, u * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  // 머리
  const hx = u * 0.1, hy = -u * 1.45;
  ctx.fillStyle = '#141a24';
  circle(ctx, hx, hy, u * 0.44);
  ctx.fill();
  ctx.fillStyle = '#ffc94a';
  ctx.beginPath();
  ctx.ellipse(hx - u * 0.3, hy + u * 0.16, u * 0.1, u * 0.18, 0.4, 0, Math.PI * 2);
  ctx.fill();
  // 볼 (빵빵)
  if (puff > 0.05) {
    ctx.fillStyle = '#26303f';
    circle(ctx, hx + u * 0.3, hy + u * 0.14, u * (0.12 + 0.17 * puff));
    ctx.fill();
    ctx.fillStyle = `rgba(255,120,150,${0.35 + 0.4 * puff})`;
    circle(ctx, hx + u * 0.3, hy + u * 0.14, u * (0.06 + 0.1 * puff));
    ctx.fill();
  }
  // 눈 (겨눌 땐 조준 방향을 본다)
  const lx = Math.cos(look) * u * 0.04, ly = -Math.sin(look) * u * 0.04;
  for (const ex of [hx - u * 0.02, hx + u * 0.24]) {
    const ey = hy - u * 0.08;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1.4, u * 0.07);
    if (mood === 3) {
      ctx.beginPath();
      ctx.arc(ex, ey + u * 0.04, u * 0.08, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    } else if (mood === 6) {
      // 감동: 반짝반짝 큰 눈 + 눈물 그렁
      circle(ctx, ex, ey, u * 0.13);
      ctx.fill();
      ctx.fillStyle = '#10141c';
      circle(ctx, ex + u * 0.01, ey + u * 0.01, u * 0.085);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      starPath(ctx, ex - u * 0.025, ey - u * 0.03, u * 0.05 * (1 + 0.3 * Math.sin(t * 0.4)));
      ctx.fill();
      circle(ctx, ex + u * 0.04, ey + u * 0.04, u * 0.02);
      ctx.fill();
      ctx.fillStyle = 'rgba(150,215,255,.85)';
      ctx.beginPath();
      ctx.ellipse(ex - u * 0.05, ey + u * 0.16 + ((t * 0.6) % 8) * u * 0.01, u * 0.03, u * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (mood === 1) {
      ctx.beginPath();
      ctx.moveTo(ex - u * 0.08, ey - u * 0.04);
      ctx.lineTo(ex + u * 0.06, ey);
      ctx.lineTo(ex - u * 0.08, ey + u * 0.04);
      ctx.stroke();
    } else if (mood === 4) {
      ctx.beginPath();
      for (let k = 0; k < 12; k++) {
        const a = k * 0.7 + t * 0.3, rr = (k / 12) * u * 0.1;
        ctx.lineTo(ex + Math.cos(a) * rr, ey + Math.sin(a) * rr);
      }
      ctx.stroke();
    } else {
      const big = mood === 2 ? 1.45 : 1;
      circle(ctx, ex, ey, u * 0.1 * big);
      ctx.fill();
      ctx.fillStyle = '#10141c';
      circle(ctx, ex + lx, ey + ly, u * 0.05 * (mood === 2 ? 0.75 : 1));
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      circle(ctx, ex + lx + u * 0.02, ey + ly - u * 0.02, u * 0.017);
      ctx.fill();
      if (mood === 5) {
        // 힘줘서 내려온 눈썹
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1.2, u * 0.05);
        ctx.beginPath();
        ctx.moveTo(ex - u * 0.1, ey - u * 0.16);
        ctx.lineTo(ex + u * 0.09, ey - u * 0.11);
        ctx.stroke();
      }
    }
  }
  // 부리 (오른쪽으로) — 깜짝이면 쩍
  const bx = hx + u * 0.36, by = hy + u * 0.05;
  ctx.fillStyle = '#ff8a3c';
  ctx.beginPath();
  if (mood === 2 || mood === 4) {
    ctx.moveTo(bx - u * 0.06, by - u * 0.08);
    ctx.lineTo(bx + u * 0.34, by - u * 0.12);
    ctx.lineTo(bx - u * 0.02, by + u * 0.0);
    ctx.moveTo(bx - u * 0.06, by + u * 0.05);
    ctx.lineTo(bx + u * 0.28, by + u * 0.16);
    ctx.lineTo(bx - u * 0.02, by + u * 0.1);
  } else {
    ctx.moveTo(bx - u * 0.06, by - u * 0.07);
    ctx.lineTo(bx + u * 0.34, by + u * 0.02);
    ctx.lineTo(bx - u * 0.06, by + u * 0.08);
  }
  ctx.fill();
  if (mood === 3 || mood === 6) {
    ctx.fillStyle = 'rgba(255,120,150,.6)';
    ctx.beginPath();
    ctx.ellipse(hx + u * 0.28, hy + u * 0.14, u * 0.08, u * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (mood === 6) {
    // 침 질질 (늘어났다 똑)
    const dl = ((t * 0.7) % 30) / 30;
    ctx.fillStyle = 'rgba(190,235,255,.95)';
    ctx.beginPath();
    ctx.moveTo(bx + u * 0.08, by + u * 0.06);
    ctx.quadraticCurveTo(bx + u * 0.06, by + u * (0.1 + 0.35 * dl), bx + u * 0.1, by + u * (0.12 + 0.38 * dl));
    ctx.quadraticCurveTo(bx + u * 0.14, by + u * (0.1 + 0.3 * dl), bx + u * 0.13, by + u * 0.06);
    ctx.fill();
    circle(ctx, bx + u * 0.1, by + u * (0.14 + 0.4 * dl), u * 0.045);
    ctx.fill();
  }
  // 앞쪽 날개 (오른쪽) — 대롱을 받쳐 든다
  ctx.fillStyle = '#1c2433';
  ctx.save();
  ctx.translate(u * 0.5, -u * 0.95);
  ctx.rotate(mood === 4 ? Math.sin(t * 0.7 + 2) * 1.2 : pipe ? -1.25 : mood === 3 ? -0.9 : mood === 2 ? -1.6 : -0.25);
  ctx.beginPath();
  ctx.ellipse(0, u * 0.42, u * 0.14, u * 0.46, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.restore();
  if (mood === 4)
    for (let k = 0; k < 3; k++) {
      const a = t * 0.12 + (k * Math.PI * 2) / 3;
      ctx.fillStyle = '#fff27a';
      starPath(ctx, x - u * 1.0 + Math.cos(a) * u * 0.5, y - u * 0.75 + Math.sin(a) * u * 0.15, u * 0.15);
      ctx.fill();
    }
}

/** 간식 양동이: 받은 만큼 생선 꼬리·새우·오징어 다리가 삐죽, 막 들어오면 물이 철퍼덕 */
function drawBucket(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, n: number, t: number, plopAge: number) {
  const top = y - u * 1.25, wob = plopAge < 20 ? Math.sin(plopAge * 0.9) * (1 - plopAge / 20) * u * 0.08 : 0;
  ctx.fillStyle = 'rgba(10,40,70,.3)';
  ctx.beginPath();
  ctx.ellipse(x, y, u * 1.05, u * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  // 안쪽(뒤 테두리) · 물
  ctx.fillStyle = '#3b2a1e';
  ctx.beginPath();
  ctx.ellipse(x, top, u * 0.95, u * 0.26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4aa8d8';
  ctx.beginPath();
  ctx.ellipse(x, top + u * 0.05 + wob, u * 0.82, u * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  // 받은 간식이 삐죽
  const m = Math.min(9, n);
  for (let k = 0; k < m; k++) {
    const px = x + (((k * 0.37 + 0.13) % 1) - 0.5) * u * 1.4, py = top - u * (0.05 + 0.12 * (k % 3)) + wob;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-0.9 + ((k * 0.61) % 1) * 1.8 + Math.sin(t * 0.08 + k) * 0.08);
    drawSnack(ctx, 0, -u * 0.15, u * 0.42, k % 3, t, k * 13, true);
    ctx.restore();
  }
  // 앞면 (나무통 + 쇠테)
  const g = ctx.createLinearGradient(x - u, 0, x + u, 0);
  g.addColorStop(0, '#8a5a32');
  g.addColorStop(0.45, '#c98d55');
  g.addColorStop(1, '#6e4426');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - u * 0.95, top);
  ctx.ellipse(x, top, u * 0.95, u * 0.26, 0, Math.PI, 0, true);
  ctx.lineTo(x + u * 0.78, y - u * 0.05);
  ctx.ellipse(x, y - u * 0.05, u * 0.78, u * 0.2, 0, 0, Math.PI);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(60,35,20,.45)';
  ctx.lineWidth = 1;
  for (const k of [-0.5, 0, 0.5]) {
    ctx.beginPath();
    ctx.moveTo(x + k * u * 0.95, top + u * 0.25);
    ctx.lineTo(x + k * u * 0.78, y + u * 0.12);
    ctx.stroke();
  }
  ctx.strokeStyle = '#b8c4cc';
  ctx.lineWidth = Math.max(1.5, u * 0.1);
  for (const f of [0.3, 0.75]) {
    const yy = top + (y - top) * f, ww = u * (0.95 - 0.17 * f);
    ctx.beginPath();
    ctx.ellipse(x, yy, ww, u * 0.23, 0, 0.05, Math.PI - 0.05);
    ctx.stroke();
  }
  ctx.strokeStyle = '#e8d2b0';
  ctx.lineWidth = Math.max(1.2, u * 0.07);
  ctx.beginPath();
  ctx.ellipse(x, top, u * 0.95, u * 0.26, 0, 0, Math.PI);
  ctx.stroke();
  // 손잡이
  ctx.strokeStyle = '#9aa6ae';
  ctx.lineWidth = Math.max(1.2, u * 0.06);
  ctx.beginPath();
  ctx.arc(x, top, u * 0.95, Math.PI * 1.08, Math.PI * 1.92);
  ctx.stroke();
  if (plopAge < 16) {
    ctx.fillStyle = 'rgba(200,240,255,.9)';
    for (let k = 0; k < 5; k++) {
      const a = Math.PI * (1.15 + k * 0.17), rr = u * (0.5 + plopAge * 0.05);
      circle(ctx, x + Math.cos(a) * rr, top + Math.sin(a) * rr * 0.9, u * 0.08 * (1 - plopAge / 16) + 0.5);
      ctx.fill();
    }
  }
}

/** 구경꾼 물범: 큰 낙하에 박수 */
function drawSeal(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, clap: number, t: number) {
  ctx.fillStyle = 'rgba(10,40,70,.28)';
  ctx.beginPath();
  ctx.ellipse(x, y, u * 1.0, u * 0.17, 0, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createLinearGradient(0, y - u, 0, y);
  g.addColorStop(0, '#d9e2ea');
  g.addColorStop(1, '#93a3b3');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - u * 1.0, y - u * 0.05);
  ctx.quadraticCurveTo(x - u * 0.9, y - u * 0.55, x - u * 0.2, y - u * 0.62);
  ctx.quadraticCurveTo(x + u * 0.1, y - u * 1.25, x + u * 0.45, y - u * 1.0);
  ctx.quadraticCurveTo(x + u * 0.75, y - u * 0.6, x + u * 0.55, y - u * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(120,135,150,.5)';
  for (let k = 0; k < 5; k++) {
    ctx.beginPath();
    ctx.arc(x - u * (0.7 - k * 0.25), y - u * (0.25 + 0.1 * (k % 2)), u * 0.05, 0, Math.PI * 2);
    ctx.fill();
  }
  // 얼굴
  const hx = x + u * 0.2, hy = y - u * 0.92;
  ctx.fillStyle = '#141a22';
  for (const s2 of [-1, 1]) {
    circle(ctx, hx + s2 * u * 0.14, hy, u * (clap > 0 ? 0.06 : 0.08));
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  for (const s2 of [-1, 1]) {
    circle(ctx, hx + s2 * u * 0.14 + u * 0.02, hy - u * 0.03, u * 0.025);
    ctx.fill();
  }
  ctx.fillStyle = '#3a3030';
  ctx.beginPath();
  ctx.ellipse(hx, hy + u * 0.14, u * 0.07, u * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(40,40,40,.5)';
  ctx.lineWidth = 1;
  for (const s2 of [-1, 1])
    for (const dy of [0.12, 0.2]) {
      ctx.beginPath();
      ctx.moveTo(hx + s2 * u * 0.08, hy + u * dy);
      ctx.lineTo(hx + s2 * u * 0.4, hy + u * (dy - 0.03));
      ctx.stroke();
    }
  if (clap > 0) {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(hx, hy + u * 0.22, u * 0.1, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }
  // 앞지느러미 (박수)
  const op = clap > 0 ? Math.abs(Math.sin(t * 0.55)) : 0.1;
  ctx.fillStyle = '#8796a6';
  for (const s2 of [-1, 1]) {
    ctx.save();
    ctx.translate(x + u * 0.2 + s2 * u * 0.05, y - u * 0.5);
    ctx.rotate(s2 * (0.25 + op * 0.7) - 0.2);
    ctx.beginPath();
    ctx.ellipse(0, -u * 0.2, u * 0.09, u * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/** 도둑 갈매기. st 0 날기 · 1 기절(바닥에서 어질어질) · 2 삼키는 중 */
function drawSkua(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, face: number, st: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  if (st === 1) ctx.rotate(Math.PI * 0.92);
  ctx.scale(face, 1);
  const fl = st === 1 ? 0.2 : Math.sin(t * 0.35) * 0.8;
  ctx.fillStyle = '#7a5a3e';
  for (const s2 of [-1, 1]) {
    ctx.save();
    ctx.rotate(s2 * 0.15);
    ctx.beginPath();
    ctx.moveTo(-u * 0.1, -u * 0.1);
    ctx.quadraticCurveTo(-u * 0.7, -u * (0.9 * fl + 0.2) * s2 * -1 - u * 0.2, -u * 1.5, -u * 0.9 * fl);
    ctx.quadraticCurveTo(-u * 0.8, u * 0.1, -u * 0.1, u * 0.15);
    ctx.fill();
    ctx.restore();
  }
  const g = ctx.createLinearGradient(0, -u * 0.5, 0, u * 0.5);
  g.addColorStop(0, '#a07a55');
  g.addColorStop(1, '#5e4430');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, u * 0.75, u * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f4ead8';
  for (const s2 of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(-u * 0.9, s2 * 0, u * 0.12, u * 0.06, 0, 0, Math.PI * 2);
  }
  ctx.fill();
  // 머리 · 갈고리 부리
  ctx.fillStyle = '#8a6646';
  circle(ctx, u * 0.65, -u * 0.22, u * 0.32);
  ctx.fill();
  ctx.fillStyle = '#2a2420';
  ctx.beginPath();
  ctx.moveTo(u * 0.88, -u * 0.28);
  ctx.quadraticCurveTo(u * 1.3, -u * 0.25, u * 1.22, -u * 0.05);
  ctx.lineTo(u * 0.9, -u * 0.12);
  ctx.fill();
  if (st === 2) {
    ctx.fillStyle = '#ff9db0';
    circle(ctx, u * 1.0, -u * 0.08, u * 0.12);
    ctx.fill();
  }
  // 눈 (기절이면 X)
  ctx.strokeStyle = '#1a1410';
  ctx.lineWidth = Math.max(1.2, u * 0.07);
  if (st === 1) {
    ctx.beginPath();
    ctx.moveTo(u * 0.62, -u * 0.36);
    ctx.lineTo(u * 0.78, -u * 0.22);
    ctx.moveTo(u * 0.78, -u * 0.36);
    ctx.lineTo(u * 0.62, -u * 0.22);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#ffffff';
    circle(ctx, u * 0.72, -u * 0.3, u * 0.1);
    ctx.fill();
    ctx.fillStyle = '#1a1410';
    circle(ctx, u * 0.75, -u * 0.29, u * 0.05);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(u * 0.58, -u * 0.45);
    ctx.lineTo(u * 0.86, -u * 0.38);
    ctx.stroke();
  }
  ctx.restore();
  if (st === 1)
    for (let k = 0; k < 3; k++) {
      const a = t * 0.12 + (k * Math.PI * 2) / 3;
      ctx.fillStyle = '#fff27a';
      starPath(ctx, x + Math.cos(a) * u * 0.6, y - u * 0.75 + Math.sin(a) * u * 0.15, u * 0.15);
      ctx.fill();
    }
}

function drawAll(ctx: CanvasRenderingContext2D, s: BubState, w: number, h: number, th: Theme) {
  const fx = juice(s), X = (x: number) => x * w, Y = (y: number) => y * w, Rr = (r: number) => r * w, t = s.t;
  const d = STAGES[s.stage], ceil = s.ceil;
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Rr(sz)}px system-ui, sans-serif`);
  const say = (x: number, y: number, text: string, col: string, size: number) => {
    let rec = recentSay.get(s);
    if (!rec) recentSay.set(s, (rec = []));
    for (let k = 0; k < 6 && rec.some((q) => s.t - q.t < 40 && Math.abs(q.x - x) < w * 0.25 && Math.abs(q.y - y) < size + 4); k++) y -= size + 4;
    rec.push({ x, y, t: s.t });
    if (rec.length > 14) rec.shift();
    fx.pop(Math.max(w * 0.14, Math.min(w * 0.86, x)), y, text, col, size);
  };
  const ready = s.phase === 'play' && !s.fly && s.cool <= 0 && s.shots > 0;

  ctx.save();
  fx.begin(ctx);
  // ── 얼음 동굴 뒷벽 ──
  {
    const bg = ctx.createRadialGradient(w * 0.5, Y(0.62), Rr(0.05), w * 0.5, Y(0.62), Rr(0.95));
    bg.addColorStop(0, '#4a9ccc');
    bg.addColorStop(0.55, '#1f5f92');
    bg.addColorStop(1, '#0c2a4a');
    ctx.fillStyle = bg;
    ctx.fillRect(-10, -10, w + 20, h + 20);
    // 얼음 너머 오로라
    for (let k = 0; k < 3; k++) {
      ctx.strokeStyle = k === 1 ? 'rgba(190,120,255,.13)' : 'rgba(110,255,190,.14)';
      ctx.lineWidth = Rr(0.06 + k * 0.02);
      ctx.beginPath();
      for (let x = -0.05; x <= 1.05; x += 0.05) {
        const y = 0.3 + k * 0.08 + 0.05 * Math.sin(x * 5 + t * 0.012 + k * 2) + 0.02 * Math.sin(x * 13 - t * 0.02);
        if (x < -0.04) ctx.moveTo(X(x), Y(y));
        else ctx.lineTo(X(x), Y(y));
      }
      ctx.stroke();
    }
    // 얼음 결정 면
    for (let k = 0; k < 22; k++) {
      const cx = X(WL + hsh(k) * (WR - WL)), cy = Y(0.15 + hsh(k + 40) * 1.05), rr = Rr(0.05 + hsh(k + 80) * 0.07);
      ctx.fillStyle = `rgba(200,240,255,${0.04 + 0.05 * hsh(k + 5)})`;
      ctx.beginPath();
      for (let q = 0; q < 5; q++) {
        const a = (q / 5) * Math.PI * 2 + hsh(k * 3 + q);
        ctx.lineTo(cx + Math.cos(a) * rr * (0.6 + 0.5 * hsh(k + q * 7)), cy + Math.sin(a) * rr * (0.6 + 0.5 * hsh(k + q * 11)));
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(220,248,255,.1)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    // 얼음 속에 갇힌 물고기 (구경거리)
    for (const [fx0, fy0, fs, fd] of [[0.22, 0.78, 1, 1], [0.76, 0.62, 0.8, -1], [0.5, 0.97, 0.9, 1], [0.84, 0.88, 0.7, -1]] as number[][]) {
      const cx = X(fx0), cy = Y(fy0 + 0.006 * Math.sin(t * 0.02 + fx0 * 9)), u = Rr(0.03 * fs);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(fd, 1);
      ctx.fillStyle = 'rgba(160,215,240,.35)';
      ctx.beginPath();
      ctx.ellipse(0, 0, u * 1.2, u * 0.55, 0, 0, Math.PI * 2);
      ctx.moveTo(-u * 1.0, 0);
      ctx.lineTo(-u * 1.8, -u * 0.55);
      ctx.lineTo(-u * 1.8, u * 0.55);
      ctx.fill();
      ctx.fillStyle = 'rgba(20,50,80,.45)';
      circle(ctx, u * 0.65, -u * 0.12, u * 0.12);
      ctx.fill();
      ctx.strokeStyle = 'rgba(230,250,255,.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, u * 1.9, -0.6, 0.2);
      ctx.stroke();
      ctx.restore();
    }
    // 위에서 비스듬히 드는 빛줄기
    for (let k = 0; k < 3; k++) {
      const x0 = 0.18 + k * 0.27, a = 0.05 + 0.03 * Math.sin(t * 0.015 + k * 2);
      const lg = ctx.createLinearGradient(0, Y(0.1), 0, Y(1.2));
      lg.addColorStop(0, `rgba(230,250,255,${a})`);
      lg.addColorStop(1, 'rgba(230,250,255,0)');
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.moveTo(X(x0), Y(0.1));
      ctx.lineTo(X(x0 + 0.07), Y(0.1));
      ctx.lineTo(X(x0 + 0.2), Y(1.2));
      ctx.lineTo(X(x0 + 0.04), Y(1.2));
      ctx.closePath();
      ctx.fill();
    }
    // 반짝이는 얼음 가루
    for (let k = 0; k < 40; k++) {
      const x = X(hsh(k * 13) * 1), y = Y(((hsh(k * 17) * 1.3 + t * 0.0004 * (1 + (k % 3))) % 1.3) + 0.05);
      ctx.fillStyle = `rgba(255,255,255,${0.15 + 0.45 * Math.abs(Math.sin(t * 0.04 + k))})`;
      ctx.fillRect(x, y, k % 5 ? 1.5 : 2.5, k % 5 ? 1.5 : 2.5);
    }
  }
  // ── 얼음 바닥 (3/4 시점 선반) ──
  {
    const top = Y(1.255), front = Y(BAND);
    const g = ctx.createLinearGradient(0, top, 0, front);
    g.addColorStop(0, '#bfe6fa');
    g.addColorStop(1, '#f2fbff');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(X(WL), top);
    ctx.lineTo(X(WR), top);
    ctx.lineTo(w + 4, front);
    ctx.lineTo(-4, front);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,190,230,.45)';
    ctx.lineWidth = 1;
    for (let k = 1; k < 4; k++) {
      const yy = top + (front - top) * (k / 4) ** 1.4;
      ctx.beginPath();
      ctx.moveTo(X(WL * (1 - (k / 4) ** 1.4)), yy);
      ctx.lineTo(w - X(WL * (1 - (k / 4) ** 1.4)), yy);
      ctx.stroke();
    }
    // 눈 더미
    ctx.fillStyle = '#ffffff';
    for (const [sx, sr] of [[0.03, 0.05], [0.97, 0.06], [0.58, 0.025]] as [number, number][]) {
      ctx.beginPath();
      ctx.ellipse(X(sx), Y(1.33), Rr(sr * 1.4), Rr(sr * 0.6), 0, Math.PI, Math.PI * 2);
      ctx.fill();
    }
  }
  // ── 옆 얼음벽 (안쪽으로 비스듬히 — 방 안을 들여다보는 느낌) ──
  for (const side of [-1, 1]) {
    const ox = side < 0 ? 0 : w, ix = side < 0 ? X(WL) : X(WR);
    const g = ctx.createLinearGradient(ox, 0, ix, 0);
    g.addColorStop(0, '#e9f8ff');
    g.addColorStop(0.55, '#9fd3f0');
    g.addColorStop(1, '#5a9fcc');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(ox - side * 4, Y(0.06));
    ctx.lineTo(ix, Y(0.1));
    ctx.lineTo(ix, Y(1.255));
    ctx.lineTo(ox - side * 4, Y(BAND));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ix, Y(0.1));
    ctx.lineTo(ix, Y(1.255));
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.lineWidth = 1;
    for (let k = 0; k < 7; k++) {
      const yy = 0.2 + k * 0.16 + hsh(k + side * 9) * 0.05;
      ctx.beginPath();
      ctx.moveTo(ox, Y(yy));
      ctx.lineTo(ix, Y(yy + 0.03));
      ctx.stroke();
    }
  }
  // 거품 그림자 (뒷벽에 비친다 — 거품이 벽 앞에 떠 있는 깊이)
  ctx.fillStyle = 'rgba(5,25,50,.28)';
  for (const i of VALID) {
    if (s.g[i] < 0) continue;
    ctx.beginPath();
    ctx.ellipse(X(CX[i] + 0.014), Y(ceil + RY[i] + 0.02), Rr(R * 0.92), Rr(R * 0.85), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // ── 얼음 천장 (내려오는 판은 두꺼워진다) ──
  {
    const bot = Y(ceil);
    const g = ctx.createLinearGradient(0, 0, 0, bot);
    g.addColorStop(0, '#7fbfe4');
    g.addColorStop(0.7, '#d4f1ff');
    g.addColorStop(1, '#f4fcff');
    ctx.fillStyle = g;
    ctx.fillRect(X(WL) - 2, 0, X(WR - WL) + 4, bot);
    ctx.strokeStyle = 'rgba(90,160,210,.5)';
    ctx.lineWidth = 1;
    for (let k = 1; k * ROWH < ceil - CEIL0 + 0.001; k++) {
      ctx.beginPath();
      ctx.moveTo(X(WL), bot - Rr(k * ROWH));
      ctx.lineTo(X(WR), bot - Rr(k * ROWH) + 2);
      ctx.stroke();
    }
    // 고드름
    for (let k = 0; k < 16; k++) {
      const x0 = WL + 0.01 + k * 0.055 + hsh(k) * 0.02, len = 0.015 + hsh(k + 9) * 0.03;
      const ig = ctx.createLinearGradient(0, bot, 0, bot + Rr(len));
      ig.addColorStop(0, '#f4fcff');
      ig.addColorStop(1, 'rgba(200,240,255,.3)');
      ctx.fillStyle = ig;
      ctx.beginPath();
      ctx.moveTo(X(x0) - Rr(0.009), bot - 1);
      ctx.lineTo(X(x0) + Rr(0.009), bot - 1);
      ctx.lineTo(X(x0), bot + Rr(len));
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.fillRect(X(WL), bot - 2, X(WR - WL), 2);
    if (d.drop) {
      // 내려오기까지 남은 발 (천장 얼음판에 새겨진 숫자)
      const left = d.drop - (s.used % d.drop), lab = `⬇ ${left}발 뒤 쿵`;
      font(0.036, 900);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const tw = ctx.measureText(lab).width + Rr(0.03), by = bot - Rr(0.026);
      ctx.fillStyle = left <= 1 ? `rgba(255,90,110,${0.75 + 0.25 * Math.sin(t * 0.3)})` : 'rgba(20,70,110,.75)';
      ctx.beginPath();
      ctx.roundRect(w / 2 - tw / 2, by - Rr(0.021), tw, Rr(0.042), Rr(0.021));
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText(lab, w / 2, by);
    }
  }
  // ── 아래 얼음 선 ──
  {
    const lo = lowest(s.g), room = lo < 0 ? 9 : (DEADY - (ceil + RY[lo] + R)) / ROWH, warn = room < 1.2;
    ctx.strokeStyle = warn ? `rgba(255,90,110,${0.6 + 0.4 * Math.sin(t * 0.3)})` : 'rgba(220,245,255,.55)';
    ctx.lineWidth = warn ? 3 : 2;
    ctx.setLineDash([Rr(0.02), Rr(0.014)]);
    ctx.beginPath();
    ctx.moveTo(X(WL), Y(DEADY));
    ctx.lineTo(X(WR), Y(DEADY));
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // ── 판의 거품 ──
  // 막 붙은 거품 둘레는 출렁
  let hitE: Ev | null = null;
  for (const e of s.events) if (e.kind === 'land' && t - e.t < 14) hitE = e;
  for (const i of VALID) {
    const v = s.g[i];
    if (v < 0) continue;
    let ox = 0, oy = 0;
    if (hitE) {
      const dx = CX[i] - hitE.x, dy = ceil + RY[i] - hitE.y, dd = Math.hypot(dx, dy);
      if (dd > 1e-6 && dd < D * 2.2) {
        const k = Math.sin((t - hitE.t) * 0.9) * (1 - (t - hitE.t) / 14) * Rr(0.008) * (1 - dd / (D * 2.2));
        (ox = (dx / dd) * k), (oy = (dy / dd) * k);
      }
    }
    drawBubble(ctx, X(CX[i]) + ox, Y(ceil + RY[i]) + oy, Rr(R * 0.97), v, t, i);
  }
  // 1판 첫 발 전: 여기를 겨눠요
  if (s.stage === 0 && !s.firstShot && s.phase === 'play') {
    let lo = -1;
    for (const i of VALID) if (s.g[i] === s.cur) lo = i;
    if (lo >= 0) {
      const pulse = (t % 50) / 50;
      ctx.strokeStyle = `rgba(255,255,255,${1 - pulse})`;
      ctx.lineWidth = 3;
      circle(ctx, X(CX[lo]), Y(ceil + RY[lo] + ROWH), Rr(R * (0.6 + pulse * 0.8)));
      ctx.stroke();
    }
  }

  // ── 조준선 (누르고 있는 동안) ──
  let pv: { tr: Tr; res: Res | null; g: Int8Array } | null = null;
  if (s.down && s.aim && ready && canAim(s.aim.y)) {
    const ang = aimAngle(s.aim.x, s.aim.y), key = `${s.t}:${ang.toFixed(4)}`;
    const c = PREV.get(s);
    if (c && c.key === key) pv = c;
    else {
      const tr = trace(s.g, s.ceil, ang, envOf(s), false), g = s.g.slice() as Int8Array;
      const res = tr.cell >= 0 ? resolve(g, tr.cell, s.cur, tr.hit, true) : null;
      pv = { tr, res, g };
      PREV.set(s, { key, ...pv });
    }
  }
  if (pv) {
    const P = pv.tr.pts;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.lineWidth = Rr(0.011);
    ctx.lineCap = 'round';
    ctx.setLineDash([0.1, Rr(0.03)]);
    ctx.lineDashOffset = -t * 0.8;
    ctx.beginPath();
    ctx.moveTo(X(P[0]), Y(P[1]));
    if (s.wind) {
      // 바람이 있으면 실제로 휘는 길을 따라 그린다
      const tr2 = trace(s.g, s.ceil, aimAngle(s.aim!.x, s.aim!.y), envOf(s), true);
      for (let k = 0; k < tr2.path.length; k += 4) ctx.lineTo(X(tr2.path[k]), Y(tr2.path[k + 1]));
    } else for (let k = 2; k < P.length; k += 2) ctx.lineTo(X(P[k]), Y(P[k + 1]));
    ctx.stroke();
    ctx.restore();
    // 벽에 튕기는 자리
    for (let k = 2; k < P.length - 2; k += 2) {
      ctx.fillStyle = '#ffffff';
      starPath(ctx, X(P[k]), Y(P[k + 1]), Rr(0.016));
      ctx.fill();
    }
    if (pv.tr.eaten) {
      const ex = X(P[P.length - 2]), ey = Y(P[P.length - 1]);
      ctx.strokeStyle = '#ff5a6a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(ex - 8, ey - 8);
      ctx.lineTo(ex + 8, ey + 8);
      ctx.moveTo(ex + 8, ey - 8);
      ctx.lineTo(ex - 8, ey + 8);
      ctx.stroke();
    } else if (pv.tr.cell >= 0) {
      const cx = X(CX[pv.tr.cell]), cy = Y(ceil + RY[pv.tr.cell]);
      // 터질 것: 하얀 고리 · 떨어질 것: 아래 화살표
      const res = pv.res;
      if (res) {
        const pul = 0.5 + 0.5 * Math.sin(t * 0.3);
        for (let k = 0; k < res.pop.length; k += 2) {
          const i = res.pop[k];
          ctx.strokeStyle = `rgba(255,255,255,${0.6 + 0.4 * pul})`;
          ctx.lineWidth = 2.5;
          circle(ctx, X(CX[i]), Y(ceil + RY[i]), Rr(R * (0.95 + 0.1 * pul)));
          ctx.stroke();
        }
        for (let k = 0; k < res.drop.length; k += 2) {
          const i = res.drop[k], px = X(CX[i]), py = Y(ceil + RY[i]);
          ctx.fillStyle = res.drop[k + 1] === SNACK ? 'rgba(255,230,120,.5)' : 'rgba(10,30,60,.35)';
          circle(ctx, px, py, Rr(R * 0.97));
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          const ay = py + Rr(R * 0.15) + Math.sin(t * 0.25) * 2;
          ctx.moveTo(px - Rr(0.016), ay - Rr(0.01));
          ctx.lineTo(px + Rr(0.016), ay - Rr(0.01));
          ctx.lineTo(px, ay + Rr(0.014));
          ctx.fill();
        }
      }
      ctx.globalAlpha = 0.6;
      drawBubble(ctx, cx, cy, Rr(R * 0.97), s.cur, t, 99);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      circle(ctx, cx, cy, Rr(R));
      ctx.stroke();
      ctx.setLineDash([]);
      if (res && (res.popped || res.dropped || res.snacks)) {
        const lab = `${res.popped ? `펑 ${res.popped}` : ''}${res.dropped ? ` 우수수 ${res.dropped}` : ''}${res.snacks ? ` 🐟${res.snacks}` : ''}`.trim();
        font(0.036, 900);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const tw = ctx.measureText(lab).width + Rr(0.03), lx = Math.max(tw / 2 + 4, Math.min(w - tw / 2 - 4, cx)), ly = cy + Rr(R + 0.035);
        ctx.fillStyle = res.snacks ? 'rgba(255,200,60,.95)' : 'rgba(10,40,70,.85)';
        ctx.beginPath();
        ctx.roundRect(lx - tw / 2, ly - Rr(0.024), tw, Rr(0.048), Rr(0.024));
        ctx.fill();
        ctx.fillStyle = res.snacks ? '#3a2400' : '#ffffff';
        ctx.fillText(lab, lx, ly);
      }
    }
  }

  // ── 바람 (눈발이 옆으로) ──
  if (s.wind) {
    const dir = s.wind > 0 ? 1 : -1;
    ctx.strokeStyle = 'rgba(255,255,255,.5)';
    ctx.lineWidth = 1.5;
    for (let k = 0; k < 26; k++) {
      const yy = 0.15 + hsh(k * 7) * 1.05, sp = 0.004 + hsh(k) * 0.004, xx = ((hsh(k * 3) + dir * t * sp) % 1 + 1) % 1;
      ctx.beginPath();
      ctx.moveTo(X(xx), Y(yy));
      ctx.lineTo(X(xx - dir * 0.04), Y(yy + 0.004));
      ctx.stroke();
    }
    // 바람 깃발
    const fx0 = X(WL + 0.02), fy0 = Y(1.04);
    ctx.strokeStyle = '#d9e6ee';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fx0, fy0);
    ctx.lineTo(fx0, fy0 + Rr(0.09));
    ctx.stroke();
    ctx.fillStyle = '#ff6b7a';
    ctx.beginPath();
    ctx.moveTo(fx0, fy0);
    ctx.quadraticCurveTo(fx0 + dir * Rr(0.04), fy0 + Rr(0.01 + 0.006 * Math.sin(t * 0.4)), fx0 + dir * Rr(0.07), fy0 + Rr(0.015));
    ctx.lineTo(fx0, fy0 + Rr(0.035));
    ctx.fill();
  }

  // ── 바닥의 친구들: 간식 양동이 · 먹보 펭귄 · 다음 거품 · 물범 ──
  {
    let pl = -999;
    for (const e of s.events) if (e.kind === 'plop') pl = e.t;
    drawBucket(ctx, X(BUCKX), Y(FLOOR + 0.006), Rr(0.062), s.bucket, t, t - pl);
  }
  // 물범 구경꾼
  {
    const bigAge = s.big ? t - s.big.t : 999, clap = bigAge < 110 || s.face === 6 || (s.phase === 'result' && s.ok) ? 1 : 0;
    drawSeal(ctx, X(0.86), Y(FLOOR + 0.008), Rr(0.06), clap, t);
  }
  // 다음 거품 (눈 그릇에)
  {
    const nx = X(0.645), ny = Y(1.29);
    ctx.fillStyle = '#e8f6ff';
    ctx.beginPath();
    ctx.ellipse(nx, ny + Rr(0.03), Rr(0.05), Rr(0.018), 0, 0, Math.PI * 2);
    ctx.fill();
    drawBubble(ctx, nx, ny, Rr(R * 0.68), s.nxt, t, 77);
    font(0.036, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = 'rgba(10,40,70,.6)';
    ctx.lineWidth = 3;
    ctx.strokeText('다음', nx, ny - Rr(0.058));
    ctx.fillText('다음', nx, ny - Rr(0.058));
  }
  // 먹보 펭귄 + 거품 대롱 + 대롱 끝의 거품
  {
    const aimA = s.down && s.aim && canAim(s.aim.y) ? aimAngle(s.aim.x, s.aim.y) : Math.PI / 2;
    const blew = s.face === 1 && s.faceT > 8;
    const mood = s.face === 4 ? 4 : s.face === 6 ? 6 : s.face === 2 ? 2 : s.face === 3 ? 3 : blew ? 1 : s.down && ready ? 5 : 0;
    const holdT = (fx.memo.hold = s.down && ready ? (fx.memo.hold ?? 0) + 1 : 0);
    const puff = mood === 5 ? Math.min(1, holdT / 25) : mood === 1 ? 0.3 : 0;
    const u = Rr(0.08), dx = X(EATX), dy = Y(FLOOR + 0.012), pipe = mood !== 4 && s.phase === 'play';
    if (pipe) {
      // 대롱: 부리 끝에서 거품 아래 고리까지
      const px0 = dx + u * 0.75, py0 = dy - u * 1.4, px1 = X(LX) - Rr(R * 0.55), py1 = Y(LY) + Rr(R * 0.75);
      const pg = ctx.createLinearGradient(0, py0 - 3, 0, py0 + 3);
      pg.addColorStop(0, '#ffe7a0');
      pg.addColorStop(1, '#c98a2a');
      ctx.strokeStyle = pg;
      ctx.lineWidth = Rr(0.013);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(px0, py0);
      ctx.quadraticCurveTo(px1 - Rr(0.01), py0 + Rr(0.01), px1, py1);
      ctx.stroke();
      ctx.strokeStyle = '#ffd36a';
      ctx.lineWidth = Rr(0.008);
      ctx.beginPath();
      ctx.ellipse(X(LX), Y(LY) + Rr(R * 0.92), Rr(R * 0.62), Rr(R * 0.2), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    drawEater(ctx, dx, dy, u, mood, t, puff, aimA, pipe, Math.min(1, s.bucket / 24));
    if (s.phase === 'play' && !(s.fly && s.fly.k < 5)) {
      const grow = s.fly ? 1 : Math.min(1, 0.4 + (COOL - s.cool) / COOL), bob = Math.sin(t * 0.08) * Rr(0.003);
      drawBubble(ctx, X(LX), Y(LY) + bob, Rr(R * 0.97 * (s.cool > 0 ? grow : 1)), s.cur, t, 55);
    }
  }
  // 갈매기
  if (s.sk) {
    const stun = t < s.sk.stun, gx = stun ? skX(s.sk, s.sk.stun - SKSTUN) : skX(s.sk, t);
    if (stun) {
      // 바닥에 떨어져 어질어질
      const age = t - (s.sk.stun - SKSTUN), fall = Math.min(1, age / 30);
      drawSkua(ctx, X(gx), Y(SKY + (FLOOR - 0.03 - SKY) * fall * fall), Rr(0.065), 1, 1, t);
    } else {
      const face = Math.cos((t / SKP) * Math.PI * 2 + s.sk.ph) > 0 ? 1 : -1;
      drawSkua(ctx, X(gx), Y(SKY + 0.01 * Math.sin(t * 0.1)), Rr(0.065), face, 0, t);
    }
  }
  // 날아가는 거품 (꼬리 빛)
  if (s.fly) {
    const P = s.fly.tr.path, k = Math.min(s.fly.k, s.fly.n - 1);
    for (let q = 1; q <= 4; q++) {
      const j = Math.max(0, k - q * 2);
      ctx.globalAlpha = 0.18 * (5 - q) / 4;
      ctx.fillStyle = isCol(s.fly.v) ? COLHEX[s.fly.v] : '#ffffff';
      circle(ctx, X(P[j * 2]), Y(P[j * 2 + 1]), Rr(R * (0.9 - q * 0.12)));
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (P.length) drawBubble(ctx, X(P[k * 2]), Y(P[k * 2 + 1]), Rr(R * 0.97), s.fly.v, t, 5);
  }
  // 떨어지는 거품
  for (const f of s.falls) {
    ctx.save();
    ctx.translate(X(f.x), Y(f.y));
    ctx.rotate(f.rot * 0.2);
    drawBubble(ctx, 0, 0, Rr(R * 0.97), f.v, t, f.sd);
    ctx.restore();
  }
  // 양동이로 파닥파닥 튀어 가는 간식
  for (const c of s.flops) {
    const x = X(c.x), y = Y(c.y), u = Rr(0.03);
    ctx.fillStyle = 'rgba(200,240,255,.55)';
    for (let q = 1; q <= 3; q++) {
      const p = Math.max(0, (t - c.t0 - q * 3) / c.dur), px = c.x0 + (c.tx - c.x0) * p, py = c.y0 + (c.ty - c.y0) * p - 0.16 * 4 * p * (1 - p);
      circle(ctx, X(px), Y(py), Rr(0.006) * (4 - q) * 0.5);
      ctx.fill();
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((t - c.t0) * 0.25 + c.ph);
    drawSnack(ctx, 0, 0, u, c.kind, t, c.ph * 10, false);
    ctx.restore();
  }

  // ── 사건 연출 ──
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const x = X(e.x), y = Y(e.y), col = e.v !== undefined && isCol(e.v) ? COLHEX[e.v] : '#dff6ff';
    if (e.kind === 'fire') fx.burst(X(LX), Y(LY), '#ffffff', 10, 2.4, 2), fx.kick(1.5), say(X(EATX + 0.06), Y(LY - 0.06), ['후!', '푸우~', '얍!'][s.shotNo % 3], '#ffffff', 14);
    if (e.kind === 'land') fx.ring(x, y, '#ffffff', Rr(0.06), 2);
    if (e.kind === 'pop') fx.burst(x, y, col, 12, 3.2, 2.6), fx.burst(x, y, '#ffffff', 5, 2, 1.8), fx.ring(x, y, col, Rr(0.05), 3), fx.kick(2.5);
    if (e.kind === 'popsay') say(x, y - Rr(0.05), e.text!, e.col ?? '#ffffff', 17);
    if (e.kind === 'crack') fx.burst(x, y, '#dff6ff', 10, 2.4, 2), say(x, y - Rr(0.05), e.text!, '#dff6ff', 15), fx.kick(2);
    if (e.kind === 'shatter') fx.burst(x, y, '#ffffff', 22, 4, 2.6), fx.burst(x, y, '#9fdcff', 16, 3, 2.2), fx.ring(x, y, '#dff6ff', Rr(0.07), 4), say(x, y - Rr(0.06), e.text!, '#dff6ff', 17), fx.kick(5);
    if (e.kind === 'boom') fx.burst(x, y, '#ffb347', 40, 6, 3.4), fx.burst(x, y, '#ffffff', 24, 5, 2.8), fx.ring(x, y, '#ffd08a', Rr(0.22), 7), fx.kick(12), fx.blink('#fff1c8', 0.35), say(x, y - Rr(0.07), e.text!, '#ffd08a', 24);
    if (e.kind === 'ceil') fx.kick(9), fx.burst(w * 0.3, Y(e.y), '#ffffff', 16, 3, 2.2), fx.burst(w * 0.7, Y(e.y), '#ffffff', 16, 3, 2.2), say(w / 2, Y(e.y + 0.06), e.text!, '#dff6ff', 16);
    if (e.kind === 'eat') fx.burst(x, y, '#c49a6c', 18, 3.4, 2.4), fx.kick(4), say(x, y - Rr(0.07), e.text!, '#ffe0b0', 17);
    if (e.kind === 'thaw') fx.burst(x, y, '#e6f8ff', 16, 3.2, 2.4), fx.ring(x, y, '#ffffff', Rr(0.05), 3), say(x, y - Rr(0.05), e.text!, '#e6f8ff', 14);
    if (e.kind === 'plop') fx.burst(x, y, '#9fdcff', 12, 2.6, 2.2), fx.burst(x, y, '#ffffff', 6, 2, 1.8), say(x, y - Rr(0.07), e.text!, '#fff6d6', 14);
    if (e.kind === 'drool') fx.burst(x, y, '#ff9ec4', 12, 2.4, 2.2), say(x, y - Rr(0.04), e.text!, '#fff1f5', 15);
    if (e.kind === 'splat') fx.burst(x, y, col, 8, 2.4, 2);
    if (e.kind === 'bigstar') say(w / 2, Y(0.98), e.text!, '#ffe066', 16);
    if (e.kind === 'cancel') say(x, y, e.text!, '#dff6ff', 13);
    if (e.kind === 'windflip') say(w / 2, Y(0.5), e.text!, '#e8f6ff', 16);
    if (e.kind === 'clear') fx.burst(w * 0.25, Y(0.6), '#ffe066', 40, 6, 3.2), fx.burst(w * 0.75, Y(0.6), '#ff9ec4', 40, 6, 3.2), fx.burst(w * 0.5, Y(0.75), '#ffffff', 40, 6, 3), fx.ring(w / 2, Y(0.65), '#ffe066', Rr(0.45), 7), fx.blink('#fff6c8', 0.22);
    if (e.kind === 'fail') fx.kick(8), fx.blink(th.hot, 0.18);
  }
  fx.memo.t = s.t;
  // 큰 낙하: 숫자가 커진다
  if (s.big && t - s.big.t < 110) {
    const age = t - s.big.t, k = Math.min(1, age / 40), val = Math.round(s.big.pts * (1 - (1 - k) ** 3));
    const sc = age < 40 ? 0.7 + 0.6 * k : 1.3 - 0.3 * Math.min(1, (age - 40) / 20), a = Math.min(1, (110 - age) / 20);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(w / 2, Y(0.6));
    ctx.scale(sc, sc);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    font(0.1, 900);
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(10,30,60,.75)';
    ctx.strokeText(`+${val}`, 0, 0);
    ctx.fillStyle = '#ffe066';
    ctx.fillText(`+${val}`, 0, 0);
    font(0.042, 900);
    const sub = `${s.big.n ? `우수수 ×${s.big.n}` : ''}${s.big.k ? `  🐟×${s.big.k}${s.big.k > 1 ? ` (점수 ×${s.big.k * s.big.k}!)` : ''}` : ''}`.trim();
    ctx.lineWidth = 4;
    ctx.strokeText(sub, 0, Rr(0.07));
    ctx.fillStyle = '#ffffff';
    ctx.fillText(sub, 0, Rr(0.07));
    ctx.restore();
  }
  ctx.restore();

  // ═════════════ HUD (위 띠) ═════════════
  const hb = Rr(0.08);
  ctx.fillStyle = 'rgba(8,30,52,.9)';
  ctx.fillRect(0, 0, w, hb);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  font(0.044, 900);
  const ttl = `🐧 ${s.stage + 1}판 ${d.title}`, tw1 = ctx.measureText(ttl).width;
  ctx.fillText(ttl, Rr(0.03), hb * 0.52);
  font(0.036, 800);
  ctx.fillStyle = th.muted;
  ctx.fillText(` /${STAGE_COUNT}`, Rr(0.03) + tw1, hb * 0.56);
  ctx.textAlign = 'right';
  font(0.042, 900);
  ctx.fillStyle = '#ffd84a';
  const stt = `★${s.stars}`;
  ctx.fillText(stt, w - Rr(0.03), hb * 0.52);
  ctx.fillStyle = th.hot;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - Rr(0.05) - ctx.measureText(stt).width, hb * 0.52);
  // 새것 알림
  if (s.news && s.t - s.news.t < NEWS_T) {
    const age = s.t - s.news.t, a = Math.min(1, age / 10, (NEWS_T - age) / 20), drop = Math.max(0, 10 - age) * 2;
    ctx.globalAlpha = a;
    font(0.036, 900);
    ctx.textAlign = 'center';
    const tx = s.news.text, tw2 = Math.min(w - 10, ctx.measureText(tx).width + 24), by2 = Y(1.045) + drop;
    ctx.fillStyle = 'rgba(8,30,52,.92)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw2 / 2, by2 - Rr(0.026), tw2, Rr(0.052), Rr(0.026));
    ctx.fill();
    ctx.strokeStyle = th.accent;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(tx, w / 2, by2, w - 24);
    ctx.globalAlpha = 1;
  }
  // 판 카드: 시작 · 결과
  {
    let head = '', sub = '', nw = '', col = '#ffffff', age = 0, a = 1;
    if (s.phase === 'result' && s.pt >= (s.ok ? 60 : 20)) {
      age = s.pt - (s.ok ? 60 : 20);
      if (s.ok) (head = s.won ? `양동이 가득! 🐟${s.caughtAll}` : '다 받았다!'), (sub = `${s.used}발${s.used <= d.par ? ' ✓' : ` (≤${d.par} ✗)`} · 한 발 최고 ${s.bestDrop}개${s.bestDrop >= d.big ? ' ✓' : ` (≥${d.big} ✗)`}`), (col = '#ffd84a');
      else (head = `끼잉… ${s.why}`), (sub = s.hearts > 0 ? '하트 -1 · 같은 판 다시' : `끝 — 간식 ${s.caughtAll}마리 냠냠!`), (col = '#ffb3a8');
    } else if (s.phase === 'play' && s.pt < CARD_T) {
      age = s.pt;
      a = Math.min(1, (CARD_T - s.pt) / 20) * (s.down ? 0.25 : 1);
      head = s.again ? `다시! ${s.stage + 1}판 ${d.title}` : `${s.stage + 1}판 · ${d.title}`;
      sub = `얼린 간식 ${s.snackTotal}마리 받기 · 거품 ${d.shots}발`;
      nw = d.news;
    }
    if (head) {
      const sc = Math.min(1, 0.6 + age / 12), cyy = Y(s.phase === 'result' ? 0.86 : 0.8), ch = nw ? 0.158 : 0.11;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(w / 2, cyy);
      ctx.scale(sc, sc);
      ctx.fillStyle = 'rgba(8,30,52,.92)';
      ctx.beginPath();
      ctx.roundRect(-Rr(0.45), -Rr(0.055), Rr(0.9), Rr(ch), Rr(0.04));
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = col;
      font(0.048, 900);
      if (s.phase === 'result' && s.ok) {
        const hw = ctx.measureText(head).width, sw = Rr(0.056), x0 = -(hw + Rr(0.02) + sw * 3) / 2;
        ctx.textAlign = 'left';
        ctx.fillText(head, x0, -Rr(0.018));
        for (let k = 0; k < 3; k++) {
          const ag = age - (10 + k * 13);
          if (ag < 0) continue;
          const got = s.starOk[k], pop = ag < 8 ? 1.9 - 0.9 * (ag / 8) : 1, sx = x0 + hw + Rr(0.02) + sw * (k + 0.5);
          ctx.save();
          ctx.translate(sx, -Rr(0.018));
          ctx.scale(pop, pop);
          starPath(ctx, 0, 0, Rr(0.024));
          ctx.fillStyle = got ? '#ffd43b' : 'rgba(255,255,255,.12)';
          ctx.fill();
          ctx.strokeStyle = got ? '#fff3b0' : 'rgba(255,255,255,.45)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();
          if (got && (fx.memo['star' + k] ?? -1) < s.t - ag) (fx.memo['star' + k] = s.t - ag), fx.burst(w / 2 + sx, cyy - Rr(0.018), '#ffe066', 16, 3, 2.4);
        }
        ctx.textAlign = 'center';
      } else ctx.fillText(head, 0, -Rr(0.018), Rr(0.84));
      ctx.fillStyle = '#f4fbff';
      font(0.036, 800);
      ctx.fillText(sub, 0, Rr(0.03), Rr(0.84));
      if (nw) {
        ctx.fillStyle = '#ffe9a8';
        font(0.036, 900);
        ctx.fillText(nw, 0, Rr(0.077), Rr(0.86));
      }
      ctx.restore();
    }
  }
  // ═════════════ 아래 띠 ═════════════
  {
    const ty = BAND, tb = h / w;
    const g = ctx.createLinearGradient(0, Y(ty), 0, Y(tb));
    g.addColorStop(0, 'rgba(12,44,72,.96)');
    g.addColorStop(1, 'rgba(6,24,42,.98)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(0, Y(ty), w, Y(tb - ty) + 4, [Rr(0.03), Rr(0.03), 0, 0]);
    ctx.fill();
    // 남은 거품 (★ 선까지 쓰면 별)
    const r1 = Y(ty + 0.038);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e6f8ff';
    font(0.036, 900);
    ctx.fillText('거품', X(0.03), r1);
    const dx0 = X(0.135), dstep = Math.min(Rr(0.042), (X(0.8) - dx0) / Math.max(1, d.shots));
    for (let k = 0; k < d.shots; k++) {
      const cx = dx0 + k * dstep + (k >= d.par ? Rr(0.014) : 0), used = k < s.used;
      if (used) {
        ctx.strokeStyle = 'rgba(255,255,255,.28)';
        ctx.lineWidth = 1.2;
        circle(ctx, cx, r1, Rr(0.014));
        ctx.stroke();
      } else {
        const bg2 = ctx.createRadialGradient(cx - Rr(0.005), r1 - Rr(0.006), 1, cx, r1, Rr(0.016));
        bg2.addColorStop(0, '#ffffff');
        bg2.addColorStop(1, k < d.par ? '#7fe0ff' : '#4a8fbf');
        ctx.fillStyle = bg2;
        circle(ctx, cx, r1, Rr(0.015));
        ctx.fill();
      }
    }
    const lx = dx0 + d.par * dstep - dstep / 2 + Rr(0.007);
    ctx.strokeStyle = '#ffd84a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lx, r1 - Rr(0.022));
    ctx.lineTo(lx, r1 + Rr(0.022));
    ctx.stroke();
    ctx.textAlign = 'right';
    font(0.036, 800);
    ctx.fillStyle = s.shots > 0 ? '#bfeaf2' : '#ffb3a8';
    ctx.fillText(`${s.shots}발`, X(0.97), r1);
    // 별 목표 셋
    const okk = s.phase === 'result' && s.ok ? s.starOk : [s.caught >= s.snackTotal, s.used <= d.par, s.bestDrop >= d.big];
    const bad = [s.phase === 'result' && !s.ok, s.used > d.par, false];
    const labels = [`🐟 ${s.caught}/${s.snackTotal}`, `${d.par}발 안에`, `한 발 ${d.big}개 우수수`];
    const r2 = Y(ty + 0.103), cws = [0.22, 0.26, 0.42];
    let cx1 = X(0.03);
    for (let k = 0; k < 3; k++) {
      const cw2 = Rr(cws[k]);
      ctx.fillStyle = okk[k] ? 'rgba(255,216,74,.25)' : bad[k] ? 'rgba(0,0,0,.35)' : 'rgba(255,255,255,.08)';
      ctx.beginPath();
      ctx.roundRect(cx1, r2 - Rr(0.026), cw2, Rr(0.052), Rr(0.026));
      ctx.fill();
      ctx.strokeStyle = okk[k] ? '#ffd84a' : bad[k] ? 'rgba(255,255,255,.15)' : 'rgba(255,255,255,.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = okk[k] ? '#ffd84a' : bad[k] ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.6)';
      font(0.038, 900);
      ctx.textAlign = 'center';
      ctx.fillText(bad[k] ? '✗' : '★', cx1 + Rr(0.028), r2 + Rr(0.002));
      ctx.fillStyle = okk[k] ? '#fff6dc' : bad[k] ? 'rgba(255,255,255,.4)' : '#e6f8ff';
      font(0.036, 800);
      ctx.textAlign = 'left';
      ctx.fillText(labels[k], cx1 + Rr(0.052), r2 + Rr(0.002), cw2 - Rr(0.06));
      cx1 += cw2 + Rr(0.012);
    }
    // 안내 한 줄
    let hint = d.hint;
    const first = s.stage === 0 && !s.firstShot && s.phase === 'play';
    if (first) hint = '👆 하얀 고리 쪽을 누른 채 겨누고 → 떼면 발사!';
    else if (s.down && s.phase === 'play') hint = !s.aim || !canAim(s.aim.y) ? '여기서 떼면 취소' : ready ? '떼면 발사! 하얀 고리 = 펑, 어두운 칸 = 우수수' : '거품 채우는 중…';
    else if (s.phase === 'result') hint = s.ok ? (s.won ? '양동이 가득! 배가 빵빵해요' : `★ ${s.got}개! 다음 판엔 새것이 나와요`) : '누르고 있으면 붙을 자리가 보여요';
    ctx.textAlign = 'center';
    ctx.fillStyle = first ? '#ffffff' : '#ffe9a8';
    font(first ? 0.04 : 0.036, 900);
    ctx.fillText(hint, w / 2, Y(ty + 0.168), w - Rr(0.05));
  }
}

// 측정 도구용 (판 지도 찾기·판별 측정 스크립트가 쓴다 — 게임 동작과 무관)
export const _dev = { newStage, STAGES, trace, resolve, buildLay, snackLeft, CX, RY, COLS, ROWS, NC, VALID, CEIL0, LX, LY, ROWH, D, R, SNACK, STONE, ICE, BOMB, WILD, EMPTY, envOf };
