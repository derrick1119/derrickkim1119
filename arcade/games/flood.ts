/**
 * 홍수 버티기 (21라운드, 오너 아이디어 #2) — 지어서 버티기 × 재난 예보 × 가리키기(톡).
 * 오너: "홍수 버티기 게임. 물이 몇리터 어디서 몰려오는지 노출되고 우리는 보호해야하는 뭔가를 감싸서 홍수를 버티는거지."
 * 구조: 예보(몇 L가 어디서 언제) → 짓기(다음 조각을 칸에 톡) → 버티기(물이 진짜로 흘러 차오른다, 십 초쯤).
 * 물은 칸마다 리터로 담기는 결정적 부피 시뮬레이션: 낮은 곳으로 흐르고 퍼지고, 수면보다 낮은 둑은 넘고, 대각선 틈으로도 샌다.
 * 와우: 강에서 물 1200L가 왼쪽 위에서 몰려온다는 예보 — 모래주머니로 잠자는 고양이 집을 감싸면 물이 콸콸 둘러 흘러가고 고양이는 계속 쿨쿨.
 * 웃음: 물이 닿으면 고양이가 지붕 위로 펄쩍(털이 쭈뼛, "냐아앙!!"), 오리 가족은 둥지째 둥실둥실 떠내려가며 신나고,
 *       부엉이 사서는 젖은 책을 들고 허둥지둥. 지켜내면 고양이가 기지개 "냐~ 잘 잤다", 개구리 구경꾼은 물만 오면 신난다.
 * 펼쳐짐(판마다 하는 일이 바뀐다): 1 막기(모래주머니) → 2 물이 많아 낮은 둑을 넘는다(겹쳐 쌓기·돌담) → 3 도랑(물 100L를 담는 구덩이·물길)
 *   → 4 두 곳에서 동시에 + 오리 둥지 → 5 비(감싼 안쪽에도 내린다 → 배수구로 빼기) → 6 밀물(강물이 거꾸로 밀려왔다 빠진다)
 *   → 7 시간차 물결 + 작은 도서관 → 8 대홍수(다 같이).
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

export const COLS = 9, ROWS = 9, NN = COLS * ROWS;
const A = 1.42;
/** 칸 하나에 물 '한 칸 높이' = 100L */
export const VL = 100;
/** 물은 3틱(1/20초)마다 한 걸음 */
const SIMT = 6, SPS = 60 / SIMT;
const KO = 0.12, KD = 0.06;
/** 강으로 빠지는 물길(배수로): 걸음마다 물의 30%, 최대 14L(=1초 280L) */
const OUTK = 0.3, OUTMAX = 28;
/** 배수구: 걸음마다 2L = 1초에 40L */
const DRAIN = 4;
const SOAK = 0.04, WETMIN = 1;
/** 지킬 것의 칸에 물이 이만큼 차면 잠긴다 */
export const FLOOD = 20;
const SAND_H = 1, STONE_H = 2.5, DITCH_D = 1, MAXSTACK = 3;
export const NONE = 0, SAND = 1, STONE = 2, DITCH = 3, PIPE = 4;
const PIECE_OF: Record<string, number> = { S: SAND, W: STONE, D: DITCH, P: PIPE };
export const PNAME = ['', '모래주머니', '돌담', '도랑', '배수구'];
const PDESC = ['', '낮은 둑 · 같은 칸에 또 톡 = 한 단 더', '높은 둑 (모래주머니 2.5단)', '땅을 파서 물 100L를 담아요', '1초에 물 40L를 꿀꺽'];
export const CAT = 1, DUCK = 2, BOOK = 3;

// ── 판의 배치 (너비 단위, y는 0~A) ──
const X0 = 0.095, CW = 0.09, Y0 = 0.335, CH = 0.08, HZ = 0.024;
const TRAY = 1.13, BTN = { x: 0.66, y: 1.155, w: 0.3, h: 0.105 }, UNDO = { x: 0.52, y: 1.155, w: 0.12, h: 0.105 };
export const rowOf = (i: number) => (i / COLS) | 0, colOf = (i: number) => i % COLS;

/** 물이 오가는 짝: 옆(오른쪽·아래)과 대각선 둘 */
const PA: number[] = [], PB: number[] = [], PK: number[] = [], PC1: number[] = [], PC2: number[] = [];
for (let r = 0; r < ROWS; r++)
  for (let c = 0; c < COLS; c++) {
    const i = r * COLS + c;
    const add = (j: number, k: number, c1 = -1, c2 = -1) => (PA.push(i), PB.push(j), PK.push(k), PC1.push(c1), PC2.push(c2));
    if (c < COLS - 1) add(i + 1, KO);
    if (r < ROWS - 1) add(i + COLS, KO);
    if (r < ROWS - 1 && c < COLS - 1) add(i + COLS + 1, KD, i + 1, i + COLS);
    if (r < ROWS - 1 && c > 0) add(i + COLS - 1, KD, i - 1, i + COLS);
  }
const NP = PA.length;
const NB8: number[][] = [...Array(NN).keys()].map((i) => {
  const r = rowOf(i), c = colOf(i), o: number[] = [];
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const R = r + dr, C = c + dc;
      if (R >= 0 && R < ROWS && C >= 0 && C < COLS) o.push(R * COLS + C);
    }
  return o;
});
/** 칸마다 그 칸이 낀 짝들 (짝 번호, 상대 칸) */
const PAIRS_OF: [number, number][][] = [...Array(NN)].map(() => []);
for (let p = 0; p < NP; p++) PAIRS_OF[PA[p]].push([p, PB[p]]), PAIRS_OF[PB[p]].push([p, PA[p]]);

// ───────────────────────────── 판 ─────────────────────────────
type Side = 'L' | 'R' | 'T' | 'B';
interface WaveDef { kind: 'pour' | 'rain' | 'tide'; L: number; at: number; dur: number; cells?: [number, number][]; side?: Side }
interface StageDef {
  name: string;
  goal: string;
  /** 높이 (반 칸 단위 숫자 0~9) */
  h: string[];
  /** H 고양이 집 · N 오리 둥지 · B 도서관 · G 텃밭(보너스) · T 나무 · R 바위 · F 꽃 */
  o: string[];
  waves: WaveDef[];
  outlets: [number, number, Side][];
  queue: string;
  sky: number;
  news?: [string, string][];
}
export interface Wave { kind: 'pour' | 'rain' | 'tide'; L: number; at: number; dur: number; cells: number[]; side: Side }
export interface Stage {
  idx: number; name: string; goal: string; h: Float32Array; prot: Uint8Array; bonus: Uint8Array; deco: Uint8Array;
  outlet: Uint8Array; outlets: { i: number; side: Side }[]; waves: Wave[]; queue: number[]; end: number; sky: number;
  rain: number[]; protCells: number[]; bonusCells: number[]; entry: Uint8Array;
}

export const STAGES: StageDef[] = [
  {
    name: '잠자는 고양이 집', goal: '🐱 고양이 집을 지켜요', sky: 0,
    h: ['999999999', '777777899', '776666899', '875555789', '875444789', '874443789', '763322678', '652222567', '541111456'],
    o: ['T..T...T.', '.........', '.......F.', 'T.......T', '.........', '.....H...', '.......G.', 'T.......T', '.........'],
    waves: [{ kind: 'pour', L: 1200, at: 0.6, dur: 4.5, cells: [[1, 0], [2, 0]], side: 'L' }],
    outlets: [[8, 3, 'B'], [8, 4, 'B']],
    queue: 'SSSS',
    news: [['sandbag', '🧱 모래주머니 — 물보다 높으면 막고, 낮으면 넘쳐요']],
  },
  {
    name: '물이 많은 날', goal: '🐱 차오르는 웅덩이 구석의 집', sky: 1,
    h: ['888668888', '887557888', '886446888', '863222228', '852222228', '852222228', '852222228', '863333338', '888717888'],
    o: ['T.......T', '.........', '.F.....T.', '.......H.', '.........', '.........', '.G.......', '.........', 'T.......T'],
    waves: [{ kind: 'pour', L: 1400, at: 0.6, dur: 3, cells: [[0, 3], [0, 4]], side: 'T' }, { kind: 'pour', L: 1000, at: 5, dur: 2.5, cells: [[0, 3], [0, 4]], side: 'T' }],
    outlets: [[8, 4, 'B']],
    queue: 'SSWSSS',
    news: [['many', '📈 물이 많으면 더 높이 차요 — 겹쳐 쌓거나 돌담!']],
  },
  {
    name: '막힌 웅덩이', goal: '🐱 물길을 파서 배수로로', sky: 2,
    h: ['777777777', '666666667', '655555567', '655555567', '655555563', '655555567', '655555567', '666666667', '777777777'],
    o: ['T.......T', '.........', '.........', '.........', '.........', '.....H...', '..G......', '.........', '..T...T..'],
    waves: [{ kind: 'pour', L: 1200, at: 0.6, dur: 3, cells: [[1, 0], [2, 0]], side: 'L' }],
    outlets: [[4, 8, 'R']],
    queue: 'DDSSSD',
    news: [['ditchnews', '⛏️ 도랑 — 땅을 파면 물 100L가 담기고, 이으면 물길이 돼요']],
  },
  {
    name: '양쪽에서 동시에', goal: '🐱 고양이 집 + 🦆 오리 둥지', sky: 3,
    h: ['888888888', '777777777', '666666666', '555555555', '555545555', '444444444', '333333333', '333222333', '332212233'],
    o: ['T.......T', '.........', '.........', '.........', '..H...N..', '....G....', '.........', '.........', 'T.......T'],
    waves: [{ kind: 'pour', L: 900, at: 0.6, dur: 3, cells: [[1, 0], [2, 0]], side: 'L' }, { kind: 'pour', L: 900, at: 0.6, dur: 3, cells: [[1, 8], [2, 8]], side: 'R' }],
    outlets: [[8, 3, 'B'], [8, 5, 'B']],
    queue: 'SSSSSSS',
    news: [['twin', '↔️ 두 곳에서 동시에 — 조각을 나눠 써요'], ['duck', '🦆 오리 둥지 — 물이 닿으면 둥지째 둥실']],
  },
  {
    name: '소나기', goal: '🐱 우묵한 곳의 집 — 빗물 빼기', sky: 4,
    h: ['777777777', '766666667', '765555567', '765444567', '765454567', '765444567', '765555567', '766666667', '777777776'],
    o: ['T.......T', '.........', '.........', '.........', '....H....', '.........', '.........', '..G......', 'T........'],
    waves: [{ kind: 'rain', L: 1600, at: 0.6, dur: 5 }, { kind: 'pour', L: 500, at: 2, dur: 2, cells: [[0, 3], [0, 4]], side: 'T' }],
    outlets: [[8, 8, 'B']],
    queue: 'PPSSP',
    news: [['pipenews', '🕳️ 배수구 — 1초에 물 40L를 꿀꺽']],
  },
  {
    name: '밀물', goal: '🐱 강물이 거꾸로 밀려와요', sky: 5,
    h: ['888888888', '777777777', '666666666', '555555555', '444444444', '333333333', '322233333', '322333333', '221112333'],
    o: ['T...T...T', '.........', '.........', '.........', '.........', '.........', '.........', '...H.....', '.......G.'],
    waves: [{ kind: 'pour', L: 600, at: 0.6, dur: 2, cells: [[0, 4], [0, 5]], side: 'T' }, { kind: 'tide', L: 1500, at: 3, dur: 4 }],
    outlets: [[8, 2, 'B'], [8, 3, 'B']],
    queue: 'WSSSWS',
  },
  {
    name: '시간차 물결', goal: '🐱 고양이 집 + 📚 꼬마 도서관', sky: 6,
    h: ['888888888', '777777777', '777666777', '666555666', '555544555', '444444444', '433333333', '333333322', '333332211'],
    o: ['T.......T', '.........', '.........', '.........', '...B.....', '.........', '..H......', '......G..', '.........'],
    waves: [{ kind: 'pour', L: 1000, at: 0.6, dur: 2.5, cells: [[1, 0], [2, 0]], side: 'L' }, { kind: 'pour', L: 1100, at: 5, dur: 2.5, cells: [[0, 6], [0, 7]], side: 'T' }],
    outlets: [[8, 7, 'B'], [8, 8, 'B']],
    queue: 'SSSDSSWSP',
  },
  {
    name: '대홍수', goal: '🐱🦆📚 모두 지켜요', sky: 7,
    h: ['888888888', '777777777', '766666667', '665555566', '555444555', '544444445', '443333344', '333222333', '332111233'],
    o: ['T.......T', '.........', '....B....', '.........', '.........', '.H.....N.', '.........', '....G....', '.........'],
    waves: [{ kind: 'pour', L: 1000, at: 0.6, dur: 2.5, cells: [[1, 0], [2, 0]], side: 'L' }, { kind: 'pour', L: 1000, at: 4, dur: 2.5, cells: [[1, 8], [2, 8]], side: 'R' }, { kind: 'rain', L: 700, at: 2, dur: 5 }, { kind: 'tide', L: 900, at: 7, dur: 3 }],
    outlets: [[8, 4, 'B'], [8, 5, 'B']],
    queue: 'SSSSWSSPDWS',
  },
];

const DIR_NAME: Record<Side, string> = { L: '왼쪽', R: '오른쪽', T: '위', B: '아래' };
const ARROW: Record<Side, string> = { L: '➡', R: '⬅', T: '⬇', B: '⬆' };
/** 들어오는 곳 이름: "왼쪽 위" 같은 */
export function entryName(w: Wave) {
  if (w.kind === 'rain') return '하늘 전체';
  const i = w.cells[0], r = rowOf(i), c = colOf(i);
  if (w.side === 'L' || w.side === 'R') return `${DIR_NAME[w.side]} ${r <= 2 ? '위' : r >= 6 ? '아래' : '가운데'}`;
  return `${DIR_NAME[w.side]} ${c <= 2 ? '왼쪽' : c >= 6 ? '오른쪽' : '가운데'}`;
}

export function buildStage(idx: number, mirror: boolean, rng: Rng): Stage {
  const d = STAGES[idx], mc = (c: number) => (mirror ? COLS - 1 - c : c), ms = (sd: Side): Side => (mirror && sd === 'L' ? 'R' : mirror && sd === 'R' ? 'L' : sd);
  const h = new Float32Array(NN), prot = new Uint8Array(NN), bonus = new Uint8Array(NN), deco = new Uint8Array(NN), outlet = new Uint8Array(NN), entry = new Uint8Array(NN);
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const i = r * COLS + mc(c), ch = d.o[r][c];
      h[i] = Number(d.h[r][c]) / 2;
      if (ch === 'H') prot[i] = CAT;
      else if (ch === 'N') prot[i] = DUCK;
      else if (ch === 'B') prot[i] = BOOK;
      else if (ch === 'G') bonus[i] = 1;
      else if (ch === 'T') deco[i] = 1;
      else if (ch === 'R') deco[i] = 2;
      else if (ch === 'F') deco[i] = 3;
    }
  const outlets = d.outlets.map(([r, c, sd]) => ({ i: r * COLS + mc(c), side: ms(sd) }));
  for (const o of outlets) outlet[o.i] = 1;
  // 물의 양은 판마다 조금씩 (50L 단위) — 같은 판을 다시 할 땐 그대로
  const waves: Wave[] = d.waves.map((w) => {
    const L = Math.round((w.L * (0.92 + rng() * 0.16)) / 50) * 50;
    const cells = w.kind === 'tide' ? outlets.map((o) => o.i) : (w.cells ?? []).map(([r, c]) => r * COLS + mc(c));
    for (const k of w.kind === 'pour' ? cells : []) entry[k] = 1;
    return { kind: w.kind, L, at: Math.round(w.at * SPS), dur: Math.round(w.dur * SPS), cells, side: w.kind === 'tide' ? outlets[0].side : ms(w.side ?? 'T') };
  });
  const protCells: number[] = [], bonusCells: number[] = [], rain: number[] = [];
  for (let i = 0; i < NN; i++) {
    if (prot[i]) protCells.push(i);
    if (bonus[i]) bonusCells.push(i);
    if (!prot[i]) rain.push(i);
  }
  const end = Math.max(...waves.map((w) => w.at + w.dur)) + Math.round(3.5 * SPS);
  return { idx, name: d.name, goal: d.goal, h, prot, bonus, deco, outlet, outlets, waves, queue: [...d.queue].map((ch) => PIECE_OF[ch]), end, sky: d.sky, rain, protCells, bonusCells, entry };
}

// ───────────────────────────── 물 ─────────────────────────────
export interface Sim {
  g: Float32Array; wall: Float32Array; piece: Uint8Array; stack: Uint8Array;
  w: Float64Array; prev: Float64Array; q: Float64Array; cum: Float64Array; n: number; out: number; sunk: number;
}
export const newSim = (st: Stage): Sim => ({
  g: Float32Array.from(st.h), wall: new Float32Array(NN), piece: new Uint8Array(NN), stack: new Uint8Array(NN),
  w: new Float64Array(NN), prev: new Float64Array(NN), q: new Float64Array(NP), cum: new Float64Array(NP), n: 0, out: 0, sunk: 0,
});
const SURF = new Float64Array(NN), OUT = new Float64Array(NN), SCALE = new Float64Array(NN), QA = new Float64Array(NP);

/** 이 걸음에 밀물이 들어오는 중인가 */
const tideOn = (st: Stage, n: number) => st.waves.some((w) => w.kind === 'tide' && n >= w.at && n < w.at + w.dur);

/** 물 한 걸음 (게임과 봇이 같은 함수) */
export function simStep(st: Stage, m: Sim) {
  const w = m.w, n = m.n;
  m.prev.set(w);
  for (const wv of st.waves) {
    if (n < wv.at || n >= wv.at + wv.dur) continue;
    const per = wv.L / wv.dur, cells = wv.kind === 'rain' ? st.rain : wv.cells;
    for (const k of cells) w[k] += per / cells.length;
  }
  for (let i = 0; i < NN; i++) (SURF[i] = m.g[i] + m.wall[i] + w[i] / VL), (OUT[i] = 0);
  for (let p = 0; p < NP; p++) {
    const q = PK[p] * (SURF[PA[p]] - SURF[PB[p]]) * VL;
    QA[p] = q;
    if (q > 0) OUT[PA[p]] += q;
    else OUT[PB[p]] -= q;
  }
  for (let i = 0; i < NN; i++) {
    const av = w[i] - WETMIN;
    SCALE[i] = OUT[i] > av ? (av > 0 ? av / OUT[i] : 0) : 1;
  }
  for (let p = 0; p < NP; p++) {
    let q = QA[p];
    q *= q > 0 ? SCALE[PA[p]] : SCALE[PB[p]];
    w[PA[p]] -= q;
    w[PB[p]] += q;
    m.q[p] = q;
    m.cum[p] += q;
  }
  const tide = tideOn(st, n);
  for (const o of st.outlets) {
    if (tide) continue;
    const d = Math.min(w[o.i] * OUTK, OUTMAX);
    w[o.i] -= d;
    m.out += d;
  }
  for (let i = 0; i < NN; i++) {
    if (m.piece[i] === PIPE) {
      const d = Math.min(w[i], DRAIN);
      w[i] -= d;
      m.sunk += d;
    }
    if (w[i] > 0) w[i] = Math.max(0, w[i] - SOAK);
  }
  m.n++;
}

/** 놓을 수 있는가: 지킬 것·텃밭·물 들어오는 곳·나무·바위는 안 되고, 모래주머니 위엔 모래주머니만 (3단까지) */
export function canPlace(st: Stage, m: Sim, i: number, p: number) {
  if (st.prot[i] || st.bonus[i] || st.entry[i] || st.deco[i] === 1 || st.deco[i] === 2) return false;
  if (!m.piece[i]) return true;
  return m.piece[i] === SAND && p === SAND && m.stack[i] < MAXSTACK;
}
export function place(m: Sim, i: number, p: number) {
  if (p === SAND) (m.piece[i] = SAND), m.stack[i]++, (m.wall[i] = SAND_H * m.stack[i]);
  else if (p === STONE) (m.piece[i] = STONE), (m.wall[i] = STONE_H);
  else if (p === DITCH) (m.piece[i] = DITCH), (m.g[i] -= DITCH_D);
  else if (p === PIPE) m.piece[i] = PIPE;
}
function unplace(st: Stage, m: Sim, i: number) {
  const p = m.piece[i];
  if (p === SAND) {
    m.stack[i]--;
    m.wall[i] = SAND_H * m.stack[i];
    if (!m.stack[i]) m.piece[i] = NONE;
  } else {
    if (p === DITCH) m.g[i] = st.h[i];
    m.piece[i] = NONE;
    m.wall[i] = 0;
  }
}

export interface SimRes { fail: boolean; failAt: number; peak: number; bonusPeak: number; inflow: Float64Array; cum: Float64Array }
/** 봇이 내다보기: 이 배치로 물을 끝까지 흘려 본다 */
export function runPlan(st: Stage, cells: number[]): SimRes {
  const m = newSim(st);
  for (let k = 0; k < cells.length; k++) place(m, cells[k], st.queue[k]);
  let peak = 0, bonusPeak = 0, fail = false;
  while (m.n < st.end) {
    simStep(st, m);
    for (const i of st.protCells) peak = Math.max(peak, m.w[i]);
    for (const i of st.bonusCells) bonusPeak = Math.max(bonusPeak, m.w[i]);
    if (peak >= FLOOD) {
      fail = true;
      break;
    }
  }
  return { fail, failAt: m.n, peak, bonusPeak, inflow: inflowTo(st, m), cum: m.cum };
}
/** 칸마다 '지킬 것(무게 1)·텃밭(무게 0.3)으로 흘러 들어간 물' — 어디로 새는지 */
function inflowTo(st: Stage, m: Sim): Float64Array {
  const out = new Float64Array(NN);
  for (let p = 0; p < NP; p++) {
    const a = PA[p], b = PB[p], q = m.cum[p];
    const wa = st.prot[a] ? 1 : st.bonus[a] ? 0.3 : 0, wb = st.prot[b] ? 1 : st.bonus[b] ? 0.3 : 0;
    if (wb && !wa && q > 0) out[a] += q * wb;
    if (wa && !wb && q < 0) out[b] -= q * wa;
  }
  return out;
}

// ───────────────────────────── 게임 ─────────────────────────────
type Phase = 'build' | 'watch' | 'result';
interface Ev { t: number; kind: string; i: number; text?: string; col?: string; j?: number }
export interface FloodState {
  rng: Rng; t: number; mirror: boolean[]; stage: number; st: Stage; sim: Sim;
  phase: Phase; pt: number; qi: number; placed: number[]; down: boolean; taps: number; autoAt: number;
  ok: boolean; failCell: number; got: number; peak: number; bonusPeak: number; tries: number;
  hearts: number; stars: number; pts: number; cleared: number; won: boolean; dead: boolean;
  over: Set<number>; leaks: Set<number>; near: Uint8Array; hint: number[];
  seen: Set<string>; events: Ev[]; news: { text: string; t: number } | null;
}
const ev = (s: FloodState, kind: string, i: number, text?: string, col?: string, j?: number) => s.events.push({ t: s.t, kind, i, text, col, j });
function see(s: FloodState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  s.news = { text, t: s.t };
}

function startStage(s: FloodState, retry: boolean) {
  if (!retry || !s.st || s.st.idx !== s.stage) s.st = buildStage(s.stage, s.mirror[s.stage], s.rng);
  s.sim = newSim(s.st);
  s.phase = 'build';
  s.pt = 0;
  s.qi = 0;
  s.placed = [];
  s.autoAt = -1;
  s.ok = false;
  s.failCell = -1;
  s.got = 0;
  s.peak = 0;
  s.bonusPeak = 0;
  s.over = new Set();
  s.leaks = new Set();
  s.near = new Uint8Array(NN);
  if (!retry) s.tries = 0;
  s.hint = s.stage === 0 ? plan(s.st) : [];
  for (const [k, text] of STAGES[s.stage].news ?? []) see(s, k, text);
  ev(s, 'stage', -1, retry ? `다시! ${s.st.name}` : `${s.stage + 1}판 · ${s.st.name}`);
}

function startWatch(s: FloodState) {
  if (s.phase !== 'build') return;
  s.phase = 'watch';
  s.pt = 0;
  ev(s, 'go', -1, '버티기!');
}

/** 칸 고르기: 앞줄부터, 높이만큼 올라간 윗면을 누른 칸 */
export function pick(s: FloodState, x: number, y: number): number {
  const m = s.sim;
  for (let r = ROWS - 1; r >= 0; r--)
    for (let c = 0; c < COLS; c++) {
      const i = r * COLS + c, z = m.g[i] + m.wall[i], x0 = X0 + c * CW, y0 = Y0 + r * CH - z * HZ;
      if (x >= x0 && x < x0 + CW && y >= y0 && y < y0 + CH) return i;
    }
  return -1;
}
/** 칸 윗면 가운데 (봇·그리기 공용) */
export const cellPt = (s: FloodState, i: number) => ({ x: X0 + (colOf(i) + 0.5) * CW, y: Y0 + (rowOf(i) + 0.5) * CH - (s.sim.g[i] + s.sim.wall[i]) * HZ });
const inRect = (x: number, y: number, b: { x: number; y: number; w: number; h: number }) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;

function tapAt(s: FloodState, x: number, y: number) {
  if (s.phase !== 'build') return;
  if (inRect(x, y, BTN)) return startWatch(s);
  if (inRect(x, y, UNDO)) {
    const i = s.placed.pop();
    if (i === undefined) return;
    unplace(s.st, s.sim, i);
    s.qi--;
    s.autoAt = -1;
    ev(s, 'undo', i, '되돌렸어요');
    return;
  }
  const i = pick(s, x, y);
  if (i < 0 || s.qi >= s.st.queue.length) return;
  const p = s.st.queue[s.qi];
  if (!canPlace(s.st, s.sim, i, p)) return void ev(s, 'nope', i, s.st.prot[i] || s.st.bonus[i] ? '여긴 지킬 곳!' : s.st.entry[i] ? '물 들어오는 곳' : '여긴 못 놔요');
  const stacked = s.sim.piece[i] === SAND && p === SAND;
  place(s.sim, i, p);
  s.placed.push(i);
  s.qi++;
  s.taps++;
  ev(s, 'place', i, stacked ? `${s.sim.stack[i]}단!` : undefined, undefined, p);
  if (stacked) see(s, 'stack', '⬆️ 같은 칸에 또 톡 — 모래주머니를 겹쳐 쌓아 더 높게');
  if (p === STONE) see(s, 'stone', '🪨 돌담 — 모래주머니 2.5단 높이');
  if (p === DITCH) see(s, 'ditch', '⛏️ 도랑 — 땅을 파서 물 100L를 담아요');
  if (p === PIPE) see(s, 'pipe', '🕳️ 배수구 — 1초에 물 40L를 꿀꺽');
  if (s.qi >= s.st.queue.length) s.autoAt = s.t + 40;
}

function watchStep(s: FloodState) {
  const st = s.st, m = s.sim;
  for (const wv of st.waves)
    if (m.n === wv.at) {
      if (wv.kind === 'rain') ev(s, 'rain', -1, `☔ 비 ${wv.L}L!`, '#cfe8ff'), see(s, 'rain', '☔ 비 — 감싼 안쪽에도 내려요 (지킬 것 지붕 위는 빼고)');
      else if (wv.kind === 'tide') ev(s, 'tide', wv.cells[0], `🌊 강물이 거꾸로! ${wv.L}L`, '#9fe3ff'), see(s, 'tide', '🌊 밀물 — 강물이 배수로로 밀려왔다가 다시 빠져요');
      else ev(s, 'pour', wv.cells[0], `콸콸! ${wv.L}L`, '#bfefff');
    }
  simStep(st, m);
  // 사건: 둑을 넘친 곳, 대각선 틈으로 새는 곳, 배수구 꿀꺽
  for (let p = 0; p < NP; p++) {
    const q = m.q[p];
    if (Math.abs(q) < 0.6) continue;
    const to = q > 0 ? PB[p] : PA[p];
    if (m.wall[to] > 0 && m.w[to] > 6 && !s.over.has(to)) {
      s.over.add(to);
      ev(s, 'over', to, m.piece[to] === STONE ? '돌담도 넘었다!' : '둑을 넘었다!', '#ffe08a');
      see(s, 'over', '🌊 물이 둑보다 높으면 넘어와요 — 물이 많으면 더 높게!');
    }
    if (PC1[p] >= 0 && m.wall[PC1[p]] > 0 && m.wall[PC2[p]] > 0 && Math.abs(q) > 0.8 && !s.leaks.has(p)) {
      s.leaks.add(p);
      ev(s, 'leak', to, '대각선 틈으로 샌다!', '#9fe3ff');
      see(s, 'diag', '↘️ 물은 대각선 틈으로도 새요 — 모서리끼리만 닿으면 안 돼요');
    }
  }
  if (m.n % 10 === 0) for (let i = 0; i < NN; i++) if (m.piece[i] === PIPE && m.prev[i] > 3) ev(s, 'gulp', i, '꿀꺽', '#bfefff');
  for (const i of st.protCells) {
    s.peak = Math.max(s.peak, m.w[i]);
    if (!s.near[i] && NB8[i].some((k) => m.w[k] > 8)) (s.near[i] = 1), ev(s, 'near', i);
  }
  for (const i of st.bonusCells) s.bonusPeak = Math.max(s.bonusPeak, m.w[i]);
  const bad = st.protCells.find((i) => m.w[i] >= FLOOD);
  if (bad !== undefined) {
    s.phase = 'result';
    s.pt = 0;
    s.ok = false;
    s.failCell = bad;
    s.hearts--;
    s.tries++;
    const k = st.prot[bad];
    ev(s, 'flood', bad, k === CAT ? '냐아앙!!' : k === DUCK ? '꽥? 둥실~' : '부엉!? 책이!', '#ffb3a8');
    return;
  }
  if (m.n >= st.end) {
    s.phase = 'result';
    s.pt = 0;
    s.ok = true;
    const bonusOk = !st.bonusCells.length || s.bonusPeak < FLOOD, left = st.queue.length - s.qi;
    s.got = 1 + (bonusOk ? 1 : 0) + (left >= 1 ? 1 : 0);
    s.stars += s.got;
    s.cleared++;
    s.pts += 10 + s.got * 10;
    const last = s.stage === STAGES.length - 1;
    if (last) (s.won = true), (s.pts += 30);
    ev(s, 'clear', -1, `${s.stage + 1}판 버텼다! ${'★'.repeat(s.got)}${'☆'.repeat(3 - s.got)}`);
  }
}

export const flood: GameDef<FloodState> = {
  id: 'flood',
  name: '홍수 버티기',
  genes: ['fortify', 'forecast', 'pointer'],
  twist: '예보가 "물 1200L가 왼쪽 위에서" 하고 알려 주면, 모래주머니를 톡톡 놓아 잠자는 고양이 집을 감싼다 — 그리고 진짜로 리터만큼의 물이 낮은 곳으로 흘러 차오르며, 둑보다 높으면 넘고 대각선 틈으로 샌다',
  rules: [
    '예보를 보고 칸을 톡 = 다음 조각(모래주머니·돌담·도랑·배수구)을 놓아요.',
    '물은 낮은 곳으로 흐르고, 둑보다 높으면 넘고, 대각선 틈으로도 새요.',
    '지킬 것에 물이 안 닿으면 통과 — 텃밭도 지키고 조각을 남기면 별이 더!',
  ],
  controls: 'touch',
  origin: '오너 아이디어 — "홍수 버티기: 물이 몇 리터 어디서 몰려오는지 보고, 보호할 것을 감싸서 버틴다" (2026-11-09)',
  hint: '칸을 톡 = 다음 조각 놓기 · ▶ 버티기 / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '나무 탁자 위 계단식 마을 디오라마의 홍수',
    mood: '두툼한 흙층 위 계단 논밭 같은 작은 마을. 빨간 지붕 집 앞에 고양이가 웅크려 자고, 오리 둥지와 꼬마 도서관이 있다. 예보판이 리터를 알려 주면 모래주머니와 돌담을 쌓고, 파란 물이 콸콸 들어와 낮은 곳을 따라 흐르다 둑을 넘고, 가장자리 배수로로 폭포처럼 떨어진다.',
    palette: { bg: '#1d3347', ink: '#f6fbff', muted: '#8aa3b6', accent: '#4cc3ff', hot: '#ff6b5a', soft: '#2c4a63' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const rng = mulberry32(seed);
    const s = {
      rng, t: 0, mirror: STAGES.map(() => rng() < 0.5), stage: 0, st: null as unknown as Stage, sim: null as unknown as Sim,
      phase: 'build', pt: 0, qi: 0, placed: [], down: false, taps: 0, autoAt: -1, ok: false, failCell: -1, got: 0, peak: 0, bonusPeak: 0, tries: 0,
      hearts: 3, stars: 0, pts: 0, cleared: 0, won: false, dead: false, over: new Set(), leaks: new Set(), near: new Uint8Array(NN), hint: [],
      seen: new Set<string>(), events: [], news: null,
    } as FloodState;
    s.mirror[0] = false;
    see(s, 'flow', '💧 물은 낮은 곳으로 흘러요');
    startStage(s, false);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    if (s.events.length && s.t - s.events[0].t > 120) s.events = s.events.filter((e) => s.t - e.t <= 120);
    const p = inp.pointer ?? null, press = !!p && !s.down;
    s.down = !!p;
    if (s.dead) return;
    s.pt++;
    if (s.phase === 'build') {
      if (press && p) tapAt(s, p.x, p.y * A);
      if (s.autoAt >= 0 && s.t >= s.autoAt) startWatch(s);
    } else if (s.phase === 'watch') {
      if (s.pt % SIMT === 0) watchStep(s);
    } else if (s.pt >= (s.ok ? 130 : 150)) {
      if (s.ok) {
        if (s.won) s.dead = true;
        else s.stage++, startStage(s, false);
      } else if (s.hearts <= 0) s.dead = true;
      else startStage(s, true);
    }
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
const hsh = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const rgbOf = (c: string) => (c[0] === '#' ? [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16)) : c.slice(4, -1).split(',').map(Number));
function mix(a: string, b: string, t: number) {
  const p = rgbOf(a), q = rgbOf(b), u = Math.max(0, Math.min(1, t));
  return `rgb(${p.map((v, k) => Math.round(v + (q[k] - v) * u)).join(',')})`;
}
/** 판마다 하늘: 아침 · 한낮 · 구름 · 오후 · 비 · 노을 · 저녁 · 폭풍 밤 */
const SKIES: [string, string, number][] = [
  ['#8fd3ff', '#fff1d6', 0], ['#5fb8f5', '#d8f1ff', 0], ['#8fb3cc', '#e4eef2', 0.1], ['#6fa8e0', '#ffe3b8', 0.05],
  ['#6f8494', '#c3cfd6', 0.25], ['#ff9f7a', '#ffd6a0', 0.2], ['#4d5a99', '#f0a080', 0.45], ['#2b3358', '#5f6f8f', 0.7],
];
const GRASS_LO = '#5fa548', GRASS_HI = '#c3dc78';
const SOIL = ['#8a5a36', '#74482a', '#5e3a22', '#4a2d1a'];

function fitText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, col: string, maxW: number, weight = 800, align: CanvasTextAlign = 'center') {
  ctx.font = `${weight} ${size}px system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  const k = Math.min(1, maxW / Math.max(1, ctx.measureText(text).width));
  if (k < 1) ctx.font = `${weight} ${Math.max(11, size * k)}px system-ui, sans-serif`;
  ctx.fillStyle = col;
  ctx.fillText(text, x, y, maxW);
}

function drawAll(ctx: CanvasRenderingContext2D, s: FloodState, w: number, h: number, th: Theme) {
  const fx = juice(s), M = fx.memo, st = s.st, m = s.sim, t = s.t;
  const R = (v: number) => v * w;
  const frac = s.phase === 'watch' ? (s.pt % SIMT) / SIMT : 1;
  const W = new Float64Array(NN);
  for (let i = 0; i < NN; i++) W[i] = s.phase === 'watch' ? m.prev[i] + (m.w[i] - m.prev[i]) * frac : m.w[i];
  const cw = R(CW), chh = R(CH), hz = R(HZ);
  const cx0 = (c: number) => R(X0 + c * CW), ty = (r: number, z: number) => R(Y0 + r * CH) - z * hz;
  const base = (i: number) => m.g[i] + m.wall[i];
  const surf = (i: number) => base(i) + (W[i] > 1.5 ? W[i] / VL : 0);
  const ZB = -1.7, boardL = cx0(0), boardR = cx0(COLS);
  const [skyT, skyB, dark] = SKIES[st.sky];
  const raining = st.waves.some((wv) => wv.kind === 'rain' && s.phase === 'watch' && m.n >= wv.at - 15 && m.n < wv.at + wv.dur + 5);
  const night = dark;
  ctx.save();
  fx.begin(ctx);
  // ── 하늘 · 먼 언덕 ──
  const sg = ctx.createLinearGradient(0, 0, 0, R(0.42));
  sg.addColorStop(0, raining ? mix(skyT, '#5d6b78', 0.6) : skyT);
  sg.addColorStop(1, raining ? mix(skyB, '#8a98a3', 0.6) : skyB);
  ctx.fillStyle = sg;
  ctx.fillRect(-12, -12, w + 24, R(0.45) + 12);
  if (night > 0.3)
    for (let k = 0; k < 30; k++) {
      ctx.globalAlpha = (night - 0.3) * (0.5 + 0.5 * Math.abs(Math.sin(t / 40 + k)));
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(hsh(k) * w, R(0.09) + hsh(k + 40) * R(0.16), 1.5, 1.5);
    }
  ctx.globalAlpha = 1;
  {
    const sx = R(0.18 + 0.64 * (st.sky / 7)), sy = R(0.14 + 0.05 * Math.abs(st.sky - 3.5) / 3.5);
    const col = night > 0.4 ? '#f2f0d8' : st.sky >= 5 ? '#ffb070' : '#fff3b0';
    const gl = ctx.createRadialGradient(sx, sy, 0, sx, sy, R(0.09));
    gl.addColorStop(0, col);
    gl.addColorStop(0.3, col);
    gl.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.globalAlpha = raining ? 0.25 : 0.9;
    ctx.fillStyle = gl;
    ctx.beginPath();
    ctx.arc(sx, sy, R(0.09), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  for (let k = 0; k < 4; k++) {
    const cx = ((hsh(k + 3) * w + t * (0.1 + k * 0.04)) % (w + 140)) - 70, cy = R(0.11 + hsh(k + 9) * 0.1);
    ctx.fillStyle = raining ? 'rgba(90,100,112,.85)' : `rgba(255,255,255,${0.75 - night * 0.5})`;
    for (let p = 0; p < 4; p++) {
      ctx.beginPath();
      ctx.ellipse(cx + p * R(0.035) - R(0.05), cy - (p % 2) * R(0.012), R(0.045), R(0.022), 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (const [yy, col, amp, f] of [[0.27, '#8cc49a', 0.03, 5], [0.3, '#6faa7c', 0.025, 8]] as [number, string, number, number][]) {
    ctx.fillStyle = mix(col, '#2d3a5a', night);
    ctx.beginPath();
    ctx.moveTo(-10, R(0.45));
    for (let x = 0; x <= 1.0001; x += 0.04) ctx.lineTo(R(x), R(yy - amp * (1 + Math.sin(x * f + yy * 20))));
    ctx.lineTo(w + 10, R(0.45));
    ctx.fill();
  }
  // ── 나무 탁자 ──
  const yTab = R(0.31);
  const tg = ctx.createLinearGradient(0, yTab, 0, h);
  tg.addColorStop(0, mix('#c99a66', '#3a2a20', night * 0.8));
  tg.addColorStop(1, mix('#8a5a34', '#1e140e', night * 0.8));
  ctx.fillStyle = tg;
  ctx.fillRect(-12, yTab, w + 24, h - yTab + 12);
  ctx.strokeStyle = 'rgba(60,35,15,.25)';
  ctx.lineWidth = 1;
  for (let k = 1; k < 8; k++) {
    const y = yTab + (h - yTab) * (k / 8) ** 1.3;
    ctx.beginPath();
    ctx.moveTo(-12, y);
    ctx.lineTo(w + 12, y);
    ctx.stroke();
  }
  // 디오라마 그림자
  {
    const g2 = ctx.createRadialGradient(w / 2, ty(ROWS, ZB) + R(0.01), 0, w / 2, ty(ROWS, ZB) + R(0.01), R(0.55));
    g2.addColorStop(0, 'rgba(30,15,5,.5)');
    g2.addColorStop(1, 'rgba(30,15,5,0)');
    ctx.fillStyle = g2;
    ctx.beginPath();
    ctx.ellipse(w / 2 + R(0.02), ty(ROWS, ZB) + R(0.01), R(0.52), R(0.06), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // 배수로 아래 탁자 웅덩이 (물이 빠지면 커진다)
  M.pond = (M.pond ?? 0) + ((s.phase === 'build' ? 0 : Math.min(1, m.out / 900)) - (M.pond ?? 0)) * 0.05;
  for (const o of st.outlets) {
    const c = colOf(o.i), r = rowOf(o.i);
    const px = o.side === 'B' ? cx0(c) + cw / 2 : o.side === 'L' ? boardL - R(0.04) : boardR + R(0.04);
    const py = o.side === 'B' ? ty(ROWS, ZB) + R(0.02) : ty(r + 1, ZB) + R(0.01);
    ctx.fillStyle = 'rgba(70,150,210,.55)';
    ctx.beginPath();
    ctx.ellipse(px, py, R(0.035 + 0.04 * M.pond), R(0.012 + 0.012 * M.pond), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // ── 땅 덩어리 옆면(앞 흙층) ──
  for (let c = 0; c < COLS; c++) {
    const i = (ROWS - 1) * COLS + c, x = cx0(c), yT = ty(ROWS, m.g[i]), yB = ty(ROWS, ZB);
    const bands = [m.g[i], m.g[i] - 0.5, -0.4, -1.1, ZB];
    for (let b = 0; b < 4; b++) {
      const a = ty(ROWS, Math.max(bands[b + 1], ZB)), top = b === 0 ? yT : ty(ROWS, bands[b]);
      if (top >= a) continue;
      ctx.fillStyle = mix(b === 0 ? '#6c9a42' : SOIL[b], '#000000', night * 0.5);
      ctx.fillRect(x, top, cw + 0.6, a - top + 0.6);
    }
    void yB;
  }
  // 옆면 흙 알갱이
  for (let k = 0; k < 40; k++) {
    ctx.fillStyle = k % 3 ? 'rgba(255,220,180,.12)' : 'rgba(0,0,0,.18)';
    ctx.fillRect(boardL + hsh(k) * (boardR - boardL), ty(ROWS, -0.4) + hsh(k + 5) * (ty(ROWS, ZB) - ty(ROWS, -0.4)), 2, 2);
  }
  // 왼쪽·오른쪽 옆면 (살짝 보이는 두께)
  for (const sideX of [boardL, boardR]) {
    ctx.fillStyle = mix('#4a2d1a', '#000000', 0.2 + night * 0.4);
    const dx = sideX === boardL ? -R(0.012) : R(0.012);
    ctx.beginPath();
    ctx.moveTo(sideX, ty(0, 1.5));
    ctx.lineTo(sideX + dx, ty(0, 1.5) + R(0.012));
    ctx.lineTo(sideX + dx, ty(ROWS, ZB) - R(0.005));
    ctx.lineTo(sideX, ty(ROWS, ZB));
    ctx.fill();
  }
  // ── 칸들: 뒤에서 앞으로 ──
  const flowX = new Float64Array(NN), flowY = new Float64Array(NN);
  if (s.phase === 'watch')
    for (let p = 0; p < NP; p++) {
      const q = m.q[p], a = PA[p], b = PB[p], dx = colOf(b) - colOf(a), dy = rowOf(b) - rowOf(a);
      flowX[a] += q * dx;
      flowY[a] += q * dy;
      flowX[b] += q * dx;
      flowY[b] += q * dy;
    }
  const lights: [number, number, number][] = [];
  const hint = s.stage === 0 && s.phase === 'build' ? s.hint.slice(s.qi) : [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const i = r * COLS + c, g = m.g[i], x = cx0(c), y = ty(r, g), hi = Math.max(0, Math.min(1, (st.h[i] - 0) / 4.5));
      // 윗면 (높을수록 밝은 풀) + 체크무늬 결
      let top = mix(GRASS_LO, GRASS_HI, hi);
      if ((r + c) % 2) top = mix(top, '#3c7a32', 0.08);
      if (m.piece[i] === DITCH) top = '#6b4528';
      if (st.bonus[i]) top = '#7a5232';
      ctx.fillStyle = mix(top, '#1a2238', night * 0.55);
      ctx.fillRect(x, y, cw + 0.6, chh + 0.6);
      // 뒤 칸이 더 높으면 그늘, 등고선
      const back = r > 0 ? m.g[i - COLS] : -9;
      if (back > g) {
        const gg = ctx.createLinearGradient(0, y, 0, y + chh * 0.45);
        gg.addColorStop(0, 'rgba(10,30,10,.35)');
        gg.addColorStop(1, 'rgba(10,30,10,0)');
        ctx.fillStyle = gg;
        ctx.fillRect(x, y, cw, chh * 0.45);
      }
      if (c > 0 && m.g[i - 1] !== g) {
        ctx.fillStyle = m.g[i - 1] > g ? 'rgba(10,30,10,.22)' : 'rgba(255,255,220,.18)';
        ctx.fillRect(x, y, 2, chh);
      }
      if (m.piece[i] === DITCH) {
        ctx.fillStyle = 'rgba(30,15,5,.35)';
        ctx.fillRect(x, y, 3, chh);
        ctx.fillRect(x + cw - 3, y, 3, chh);
        ctx.strokeStyle = 'rgba(160,110,70,.6)';
        ctx.lineWidth = 1;
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          ctx.moveTo(x + 4, y + chh * (0.3 + k * 0.22));
          ctx.lineTo(x + cw - 4, y + chh * (0.3 + k * 0.22) + 1);
          ctx.stroke();
        }
      } else if (!st.bonus[i]) {
        ctx.strokeStyle = mix('#3f7a2e', '#101828', night * 0.5);
        ctx.lineWidth = 1;
        for (let k = 0; k < 3; k++) {
          const gx = x + hsh(i * 7 + k) * (cw - 4) + 2, gy = y + hsh(i * 11 + k) * (chh - 6) + 5;
          ctx.beginPath();
          ctx.moveTo(gx, gy);
          ctx.lineTo(gx - 1 + Math.sin(t / 50 + i) * 0.8, gy - 4);
          ctx.moveTo(gx + 2, gy);
          ctx.lineTo(gx + 2.5, gy - 3.5);
          ctx.stroke();
        }
      }
      // 앞면 (앞 칸이 더 낮으면 흙 계단이 보인다)
      if (r < ROWS - 1) {
        const f = m.g[i + COLS];
        if (f < g) {
          const y1 = ty(r + 1, g), y2 = ty(r + 1, f);
          ctx.fillStyle = mix('#8a6a3c', '#000000', 0.15 + night * 0.5);
          ctx.fillRect(x, y1, cw + 0.6, y2 - y1 + 0.6);
          ctx.fillStyle = mix('#6c9a42', '#000000', night * 0.5);
          ctx.fillRect(x, y1, cw + 0.6, Math.min(2.5, y2 - y1));
        }
      }
      // 배수로 표시: 가장자리 돌 홈
      if (st.outlet[i]) {
        ctx.fillStyle = mix('#9aa3a8', '#111111', night * 0.5);
        const o = st.outlets.find((q) => q.i === i)!;
        if (o.side === 'B') ctx.fillRect(x + cw * 0.18, y + chh * 0.55, cw * 0.64, chh * 0.45);
        else ctx.fillRect(o.side === 'L' ? x : x + cw * 0.55, y + chh * 0.2, cw * 0.45, chh * 0.6);
        ctx.fillStyle = 'rgba(40,60,80,.55)';
        if (o.side === 'B') ctx.fillRect(x + cw * 0.28, y + chh * 0.62, cw * 0.44, chh * 0.38);
        else ctx.fillRect(o.side === 'L' ? x : x + cw * 0.62, y + chh * 0.3, cw * 0.38, chh * 0.4);
      }
      // 텃밭: 당근 줄
      if (st.bonus[i]) {
        const wet = s.bonusPeak >= FLOOD;
        for (let k = 0; k < 6; k++) {
          const gx = x + cw * (0.2 + (k % 3) * 0.3), gy = y + chh * (0.35 + Math.floor(k / 3) * 0.38);
          ctx.fillStyle = '#5a3820';
          ctx.fillRect(gx - cw * 0.12, gy + 1, cw * 0.24, 2);
          ctx.fillStyle = wet ? '#9ab070' : '#58c24a';
          ctx.beginPath();
          ctx.moveTo(gx, gy - chh * 0.28 + (wet ? 3 : 0));
          ctx.lineTo(gx - 3, gy);
          ctx.lineTo(gx + 3, gy);
          ctx.fill();
          ctx.fillStyle = '#ff8a2a';
          ctx.fillRect(gx - 1.5, gy - 1, 3, 3);
        }
      }
      // 꾸밈: 꽃·바위·나무
      if (st.deco[i] === 3)
        for (let k = 0; k < 5; k++) {
          ctx.fillStyle = ['#ff8fb1', '#ffd43b', '#ffffff', '#c58cff', '#ff7b54'][k];
          ctx.beginPath();
          ctx.arc(x + cw * (0.2 + hsh(i + k) * 0.6), y + chh * (0.25 + hsh(i * 3 + k) * 0.55), 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      if (st.deco[i] === 2) {
        ctx.fillStyle = mix('#8d8a84', '#000000', night * 0.4);
        ctx.beginPath();
        ctx.ellipse(x + cw / 2, y + chh * 0.55, cw * 0.36, chh * 0.34, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.3)';
        ctx.beginPath();
        ctx.ellipse(x + cw * 0.4, y + chh * 0.42, cw * 0.14, chh * 0.1, -0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      // 조각
      drawPiece(ctx, m.piece[i], m.stack[i], x, y, cw, chh, hz, t, i, night, m.prev[i] > 3 && s.phase === 'watch');
      // 처음 판: 놓을 자리 미리 보기 (점선 모래주머니)
      const hk = hint.indexOf(i);
      if (hk >= 0 && hint.slice(0, hk).every((q) => q !== i)) {
        const pul = 0.5 + 0.5 * Math.sin(t / 7 + hk);
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = `rgba(255,248,200,${0.55 + 0.4 * pul})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 3, y - hz + 3, cw - 6, chh - 6);
        ctx.setLineDash([]);
        if (hk === 0) fitText(ctx, '여기!', x + cw / 2, y - hz - R(0.02) - pul * 3, R(0.036), '#fff8d0', R(0.2), 900);
      }
      // 지킬 것
      if (st.prot[i]) drawKeeper(ctx, s, i, x + cw / 2, ty(r, g) + chh * 0.72, cw, t, W, lights, night);
      if (st.deco[i] === 1) drawTree(ctx, x + cw / 2, y + chh * 0.62, cw, t, i, night);
      // 물 (칸마다 수면 높이로 · 앞으로 낮아지면 물 벽이 보인다). 아주 얕으면 젖은 땅만
      const wv = W[i];
      if (wv > 1.5 && wv < 7) {
        ctx.fillStyle = `rgba(40,70,110,${0.1 + wv * 0.025})`;
        ctx.fillRect(x, ty(r, base(i)), cw + 0.6, chh + 0.6);
      } else if (wv >= 7) {
        const zs = surf(i), d = Math.min(1, wv / 110), yS = ty(r, zs);
        ctx.fillStyle = mix(mix('#62cdf4', '#1c64c0', d), '#0a1830', night * 0.5);
        ctx.globalAlpha = 0.72 + 0.2 * d;
        ctx.fillRect(x - 0.5, yS, cw + 1.2, chh + 1.2);
        ctx.globalAlpha = 1;
        // 뒤가 마른 칸이면 물가 반짝 줄
        if (r === 0 || W[i - COLS] < 7) (ctx.fillStyle = 'rgba(230,250,255,.7)'), ctx.fillRect(x, yS, cw + 0.6, 1.5);
        const fz = r < ROWS - 1 ? (W[i + COLS] >= 7 ? surf(i + COLS) : base(i + COLS)) : -9;
        if (fz < zs - 0.02) {
          const y1 = ty(r + 1, zs), y2 = r < ROWS - 1 ? ty(r + 1, Math.max(fz, Math.min(base(i), fz))) : ty(r + 1, base(i));
          const gW = ctx.createLinearGradient(0, y1, 0, y2);
          gW.addColorStop(0, mix('#3a9be0', '#0a1830', night * 0.5));
          gW.addColorStop(1, mix('#1b5aa8', '#0a1830', night * 0.5));
          ctx.fillStyle = gW;
          ctx.globalAlpha = 0.85;
          ctx.fillRect(x - 0.5, y1, cw + 1.2, Math.max(0, y2 - y1) + 0.6);
          ctx.globalAlpha = 1;
          ctx.fillStyle = 'rgba(230,250,255,.8)';
          ctx.fillRect(x - 0.5, y1, cw + 1.2, 1.4);
          // 폭포처럼 떨어지는 하얀 줄
          if (y2 - y1 > 4) {
            ctx.fillStyle = 'rgba(255,255,255,.6)';
            for (let k = 0; k < 3; k++) ctx.fillRect(x + cw * (0.2 + 0.3 * k), y1 + ((t * 0.6 + k * 5) % Math.max(1, y2 - y1)), 1.5, 3);
          }
        }
        // 물결: 흐르는 쪽으로 움직이는 하얀 줄
        const fl = Math.hypot(flowX[i], flowY[i]);
        ctx.strokeStyle = `rgba(255,255,255,${Math.min(0.85, 0.3 + fl * 0.1)})`;
        ctx.lineWidth = 1.6;
        ctx.lineCap = 'round';
        const ux = fl > 0.3 ? flowX[i] / fl : 1, uy = fl > 0.3 ? flowY[i] / fl : 0, n = fl > 3 ? 3 : 2;
        for (let k = 0; k < n; k++) {
          const ph = ((t * (0.01 + Math.min(0.04, fl * 0.005)) + hsh(i * 5 + k)) % 1) - 0.5, off = (k - (n - 1) / 2) * 0.3;
          const px = x + cw * (0.5 + ux * ph * 0.8 - uy * off), py = yS + chh * (0.5 + uy * ph * 0.8 + ux * off);
          const len = fl > 0.3 ? 0.2 : 0.1;
          ctx.beginPath();
          ctx.moveTo(px - ux * cw * len, py - uy * chh * len);
          ctx.lineTo(px + ux * cw * len, py + uy * chh * len);
          ctx.stroke();
        }
        // 마른 이웃과 닿는 물가엔 거품
        if (fl > 2)
          for (const k of [i - COLS, i + COLS, i - 1, i + 1]) {
            if (k < 0 || k >= NN || Math.abs(colOf(k) - c) > 1 || W[k] >= 7) continue;
            if (base(k) <= zs) continue;
            ctx.fillStyle = 'rgba(255,255,255,.75)';
            const ex = colOf(k) > c ? x + cw - 2 : colOf(k) < c ? x + 1 : x + cw / 2, ey = rowOf(k) < r ? yS + 1 : rowOf(k) > r ? yS + chh - 2 : yS + chh / 2;
            for (let b2 = 0; b2 < 3; b2++) {
              ctx.beginPath();
              ctx.arc(ex + (rowOf(k) !== r ? (b2 - 1) * cw * 0.3 : 0), ey + (colOf(k) !== c ? (b2 - 1) * chh * 0.3 : 0), 1.5 + Math.abs(Math.sin(t / 6 + b2 + i)) * 1.5, 0, Math.PI * 2);
              ctx.fill();
            }
          }
      }
    }
  }
  // ── 들어오는 물 · 배수로 폭포 ──
  for (const wv of st.waves) {
    if (wv.kind === 'rain') continue;
    const active = s.phase === 'watch' && m.n >= wv.at && m.n < wv.at + wv.dur;
    for (const i of wv.cells) {
      const r = rowOf(i), c = colOf(i), z = surf(i);
      if (wv.kind === 'tide') {
        if (active) {
          const o = st.outlets.find((q) => q.i === i)!, x = o.side === 'B' ? cx0(c) + cw / 2 : o.side === 'L' ? boardL : boardR;
          const y0 = o.side === 'B' ? ty(ROWS, z) : ty(r + 0.5, z), y1 = ty(ROWS, ZB);
          ctx.fillStyle = 'rgba(80,170,230,.8)';
          ctx.fillRect(x - cw * 0.3, y0, cw * 0.6, y1 - y0);
          for (let k = 0; k < 4; k++) {
            const ph = ((t * 0.05 + k / 4) % 1);
            fitText(ctx, '⬆', x, y1 - ph * (y1 - y0), R(0.04), 'rgba(255,255,255,.8)', R(0.1), 900);
          }
        }
        continue;
      }
      const sd = wv.side, ex = sd === 'L' ? boardL : sd === 'R' ? boardR : cx0(c) + cw / 2, ey = sd === 'T' ? ty(0, m.g[i]) : ty(r, m.g[i]) + chh * 0.5;
      // 하수관 같은 둥근 관 입구
      const px = sd === 'L' ? ex - R(0.035) : sd === 'R' ? ex + R(0.035) : ex, py = sd === 'T' ? ey - R(0.03) : ey;
      ctx.fillStyle = mix('#9aa5ab', '#000000', night * 0.5);
      ctx.beginPath();
      ctx.ellipse(px, py, R(0.034), R(0.03), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2c3a44';
      ctx.beginPath();
      ctx.ellipse(px, py, R(0.024), R(0.021), 0, 0, Math.PI * 2);
      ctx.fill();
      if (active) {
        const n = 7;
        for (let k = 0; k < n; k++) {
          const ph = (t * 0.06 + k / n) % 1, tx = sd === 'L' ? px + ph * cw * 1.3 : sd === 'R' ? px - ph * cw * 1.3 : px + Math.sin(k * 2.3) * cw * 0.3, tyy = sd === 'T' ? py + ph * chh * 1.3 : py + Math.sin(k * 2.3) * chh * 0.25;
          ctx.fillStyle = `rgba(200,240,255,${0.9 - ph * 0.6})`;
          ctx.beginPath();
          ctx.arc(tx, tyy, R(0.012) * (1 - ph * 0.5), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = 'rgba(80,170,230,.85)';
        ctx.beginPath();
        ctx.ellipse(px, py, R(0.022), R(0.019), 0, 0, Math.PI * 2);
        ctx.fill();
      }
      void z;
    }
  }
  for (const o of st.outlets) {
    const i = o.i, wv = W[i];
    if (wv < 3 || tideOn(st, m.n)) continue;
    const r = rowOf(i), c = colOf(i), zs = surf(i), amt = Math.min(1, wv / 60);
    let x0: number, y0: number;
    if (o.side === 'B') (x0 = cx0(c) + cw * 0.3), (y0 = ty(ROWS, zs));
    else (x0 = o.side === 'L' ? boardL - R(0.012) : boardR - cw * 0.0), (y0 = ty(r + 0.6, zs));
    const y1 = o.side === 'B' ? ty(ROWS, ZB) + R(0.02) : ty(r + 1, ZB) + R(0.01), fw = o.side === 'B' ? cw * 0.4 : R(0.014);
    const gW = ctx.createLinearGradient(0, y0, 0, y1);
    gW.addColorStop(0, `rgba(120,200,255,${0.6 + 0.3 * amt})`);
    gW.addColorStop(1, `rgba(200,240,255,${0.4 + 0.3 * amt})`);
    ctx.fillStyle = gW;
    ctx.fillRect(x0, y0, fw * (0.6 + 0.4 * amt), y1 - y0);
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    for (let k = 0; k < 3; k++) {
      const ph = (t * 0.04 + k / 3) % 1;
      ctx.fillRect(x0 + fw * 0.2 * k, y0 + ph * (y1 - y0), 1.5, 5);
    }
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.arc(x0 + fw * 0.4 + Math.sin(t / 5 + k * 2) * fw * 0.6, y1 - 2 - Math.abs(Math.sin(t / 7 + k)) * 4, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // 구경꾼 개구리: 첫 배수로 옆 탁자 위 (물이 빠지면 신나서 폴짝)
  {
    const o = st.outlets[0], c = colOf(o.i), r = rowOf(o.i);
    const fxp = o.side === 'B' ? cx0(c) + cw * (c > 4 ? -0.4 : 1.4) : o.side === 'L' ? boardL - R(0.07) : boardR + R(0.07);
    const fyp = o.side === 'B' ? ty(ROWS, ZB) + R(0.035) : ty(r + 1, ZB) + R(0.04);
    const happy = s.phase === 'watch' && W[o.i] > 3, jump = happy ? Math.abs(Math.sin(t / 8)) * R(0.02) : 0;
    drawFrog(ctx, fxp, fyp - jump, R(0.05), t, happy);
    if (happy && t % 120 < 50) fitText(ctx, '개굴!', fxp, fyp - jump - R(0.06), R(0.036), '#eaffd0', R(0.2), 900);
  }
  // ── 비 ──
  if (raining) {
    ctx.strokeStyle = 'rgba(210,230,255,.55)';
    ctx.lineWidth = 1.1;
    for (let k = 0; k < 70; k++) {
      const x = hsh(k * 3) * w, y = ((hsh(k * 7) * h * 1.2 + t * (7 + (k % 3))) % (h * 1.1)) - h * 0.05;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 2, y + 9);
      ctx.stroke();
    }
  }
  // 밤엔 창문 불빛이 번진다
  for (const [lx, ly, a] of lights) {
    ctx.save();
    ctx.globalAlpha = a;
    const lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, R(0.09));
    lg.addColorStop(0, 'rgba(255,210,120,.55)');
    lg.addColorStop(1, 'rgba(255,210,120,0)');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.arc(lx, ly, R(0.09), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // ── 예보 화살표 (짓는 동안 · 버티는 동안 기다리는 물결) ──
  const pending = st.waves.map((wv, k) => ({ wv, k })).filter(({ wv }) => s.phase === 'build' || (s.phase === 'watch' && m.n < wv.at + wv.dur));
  for (const { wv, k } of pending) {
    const bob = Math.sin(t / 10 + k) * 3, label = `${'①②③④'[k]} ${wv.L}L`;
    if (wv.kind === 'rain') {
      fitText(ctx, `☔ ${label}`, w / 2 + (k % 2 ? R(0.22) : -R(0.22)), ty(0, 3.6) + bob, R(0.04), '#ffffff', R(0.4), 900);
      continue;
    }
    const i = wv.cells[0], j = wv.cells[wv.cells.length - 1], r = (rowOf(i) + rowOf(j)) / 2, c = (colOf(i) + colOf(j)) / 2, sd = wv.side;
    let ax: number, ay: number, ang: number;
    if (wv.kind === 'tide') {
      const o = st.outlets[0];
      ax = o.side === 'B' ? cx0(colOf(o.i)) + cw / 2 : o.side === 'L' ? boardL - R(0.05) : boardR + R(0.05);
      ay = o.side === 'B' ? ty(ROWS, ZB) + R(0.05) : ty(rowOf(o.i) + 0.5, 0);
      ang = o.side === 'B' ? -Math.PI / 2 : o.side === 'L' ? 0 : Math.PI;
    } else {
      ax = sd === 'L' ? boardL - R(0.06) : sd === 'R' ? boardR + R(0.06) : cx0(c) + cw / 2;
      ay = sd === 'T' ? ty(0, m.g[i]) - R(0.075) : ty(r, m.g[i]) + chh * 0.5;
      ang = sd === 'L' ? 0 : sd === 'R' ? Math.PI : Math.PI / 2;
    }
    const wait = s.phase === 'watch' ? Math.max(0, (wv.at - m.n) / SPS) : 0;
    ctx.save();
    ctx.translate(ax + Math.cos(ang) * bob, ay + Math.sin(ang) * bob);
    ctx.rotate(ang);
    ctx.shadowColor = 'rgba(0,40,80,.5)';
    ctx.shadowBlur = 6;
    ctx.fillStyle = wv.kind === 'tide' ? '#7fe0ff' : '#4cc3ff';
    ctx.beginPath();
    ctx.moveTo(R(0.035), 0);
    ctx.lineTo(0, -R(0.026));
    ctx.lineTo(0, -R(0.011));
    ctx.lineTo(-R(0.03), -R(0.011));
    ctx.lineTo(-R(0.03), R(0.011));
    ctx.lineTo(0, R(0.011));
    ctx.lineTo(0, R(0.026));
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
    // 리터 꼬리표
    const lx = sd === 'T' || wv.kind === 'tide' ? ax : ax + (sd === 'L' ? R(0.005) : -R(0.005)), ly = sd === 'T' ? ay - R(0.04) : wv.kind === 'tide' ? ay + R(0.035) : ay - R(0.045);
    const tx = wait > 0.05 ? `${label} · ${wait.toFixed(0)}초` : label;
    ctx.font = `900 ${R(0.036)}px system-ui, sans-serif`;
    const tw2 = ctx.measureText(tx).width + R(0.03), bx = Math.max(4, Math.min(w - tw2 - 4, lx - tw2 / 2));
    ctx.fillStyle = 'rgba(12,40,70,.85)';
    ctx.beginPath();
    ctx.roundRect(bx, ly - R(0.024), tw2, R(0.048), R(0.02));
    ctx.fill();
    fitText(ctx, tx, bx + tw2 / 2, ly, R(0.036), '#e8f8ff', tw2, 900);
  }
  // ── 사건 연출 ──
  const seenT = M.t ?? -1;
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const pt = e.i >= 0 ? { x: cx0(colOf(e.i)) + cw / 2, y: ty(rowOf(e.i), base(e.i)) + chh / 2 } : { x: w / 2, y: R(0.6) };
    if (e.kind === 'place') {
      const col = e.j === STONE ? '#c9c4bc' : e.j === DITCH ? '#8a5a36' : e.j === PIPE ? '#9fb4c0' : '#e0c08a';
      fx.burst(pt.x, pt.y, col, 14, 2.6, 2.4);
      fx.ring(pt.x, pt.y, '#fff3c4', R(0.07), 3);
      fx.kick(e.j === STONE ? 4 : 2.5);
      if (e.text) fx.pop(pt.x, pt.y - R(0.04), e.text, '#fff3c4', R(0.042));
      else if (s.taps === 1) fx.pop(pt.x, pt.y - R(0.04), '쿵!', '#fff3c4', R(0.05));
    }
    if (e.kind === 'nope') fx.pop(pt.x, pt.y - R(0.03), e.text!, '#ffd0c8', R(0.038)), fx.kick(1.5);
    if (e.kind === 'undo') fx.ring(pt.x, pt.y, '#ffffff', R(0.05), 2);
    if (e.kind === 'go') fx.blink('#bfe9ff', 0.15);
    if (e.kind === 'pour') fx.burst(pt.x, pt.y, '#bfefff', 30, 4, 3), fx.ring(pt.x, pt.y, '#8fdcff', R(0.12), 5), fx.kick(5), fx.pop(pt.x, pt.y - R(0.05), e.text!, '#e8fbff', R(0.05));
    if (e.kind === 'tide') fx.kick(6), fx.blink('#9fe3ff', 0.18), fx.pop(w / 2, R(0.62), e.text!, '#e8fbff', R(0.048));
    if (e.kind === 'rain') fx.blink('#cfe8ff', 0.2), fx.pop(w / 2, R(0.5), e.text!, '#e8fbff', R(0.05));
    if (e.kind === 'over') fx.burst(pt.x, pt.y - hz, '#dff6ff', 16, 3, 2.4), fx.pop(pt.x, pt.y - R(0.05), e.text!, e.col!, R(0.04)), fx.kick(2.5);
    if (e.kind === 'leak') fx.ring(pt.x, pt.y, '#9fe3ff', R(0.05), 3), fx.pop(pt.x, pt.y - R(0.05), e.text!, e.col!, R(0.038));
    if (e.kind === 'gulp') fx.pop(pt.x, pt.y - R(0.03), e.text!, e.col!, R(0.036)), fx.ring(pt.x, pt.y, '#bfefff', R(0.04), 2);
    if (e.kind === 'near') fx.pop(pt.x, pt.y - R(0.11), '!', '#ffe066', R(0.06));
    if (e.kind === 'flood') fx.burst(pt.x, pt.y, '#bfefff', 40, 5, 3), fx.ring(pt.x, pt.y, '#ff9a8a', R(0.14), 6), fx.kick(9), fx.blink(th.hot, 0.22), fx.pop(pt.x, pt.y - R(0.16), e.text!, '#ffffff', R(0.06));
    if (e.kind === 'clear') {
      fx.burst(w / 2, R(0.62), '#ffe066', 60, 6, 3.2);
      fx.burst(w / 2, R(0.62), '#9fe3ff', 30, 5, 3);
      fx.ring(w / 2, R(0.62), '#ffe066', R(0.45), 8);
      fx.blink('#fff6c8', 0.25);
      for (const k of st.protCells) {
        const q = { x: cx0(colOf(k)) + cw / 2, y: ty(rowOf(k), base(k)) };
        fx.pop(q.x, q.y - R(0.12), st.prot[k] === CAT ? '냐~ 잘 잤다' : st.prot[k] === DUCK ? '꽥꽥♪' : '부엉~ 고마워', '#fff8d0', R(0.04));
      }
    }
  }
  M.t = s.t;
  ctx.restore();
  drawHud(ctx, s, w, h, th);
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, cw: number, t: number, i: number, night: number) {
  ctx.fillStyle = 'rgba(0,0,0,.22)';
  ctx.beginPath();
  ctx.ellipse(x + cw * 0.08, y + cw * 0.02, cw * 0.32, cw * 0.11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#6b4423';
  ctx.fillRect(x - cw * 0.05, y - cw * 0.32, cw * 0.1, cw * 0.34);
  const sway = Math.sin(t / 45 + i) * cw * 0.02;
  for (const [dx, dy, rr, col] of [[-0.14, -0.42, 0.24, '#2f8a3e'], [0.14, -0.45, 0.22, '#2a7d38'], [0, -0.62, 0.26, '#3fa24c']] as [number, number, number, string][]) {
    ctx.fillStyle = mix(col, '#0e1a26', night * 0.5);
    ctx.beginPath();
    ctx.arc(x + dx * cw + sway, y + dy * cw, rr * cw, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,.18)';
  ctx.beginPath();
  ctx.arc(x - cw * 0.06 + sway, y - cw * 0.7, cw * 0.09, 0, Math.PI * 2);
  ctx.fill();
}

function drawFrog(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, t: number, happy: boolean) {
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.beginPath();
  ctx.ellipse(x, y + z * 0.32, z * 0.5, z * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5cbf4a';
  ctx.beginPath();
  ctx.ellipse(x, y, z * 0.48, z * 0.34, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const sx of [-1, 1]) {
    ctx.fillStyle = '#5cbf4a';
    ctx.beginPath();
    ctx.arc(x + sx * z * 0.24, y - z * 0.3, z * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + sx * z * 0.24, y - z * 0.31, z * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111111';
    ctx.beginPath();
    ctx.arc(x + sx * z * 0.24, y - z * 0.3, z * 0.05, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#9be38a';
  ctx.beginPath();
  ctx.ellipse(x, y + z * 0.08, z * 0.28, z * 0.17, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2a5a20';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  if (happy) ctx.arc(x, y - z * 0.1, z * 0.16, 0.2, Math.PI - 0.2);
  else (ctx.moveTo(x - z * 0.12, y - z * 0.04), ctx.lineTo(x + z * 0.12, y - z * 0.04));
  ctx.stroke();
  void t;
}

/** 조각 그리기 (판 위 · 쟁반 아이콘 공용) */
function drawPiece(ctx: CanvasRenderingContext2D, p: number, stack: number, x: number, y: number, cw: number, chh: number, hz: number, t: number, i: number, night: number, busy: boolean) {
  if (p === SAND) {
    for (let k = 0; k < stack; k++) {
      const yt = y - (k + 1) * hz * SAND_H;
      // 앞면(자루 옆구리)
      ctx.fillStyle = mix('#a8834f', '#000000', night * 0.45);
      ctx.beginPath();
      ctx.roundRect(x + 1, yt + chh * 0.25, cw - 2, chh * 0.75 + hz * SAND_H, 4);
      ctx.fill();
      for (let a = 0; a < 2; a++)
        for (let b = 0; b < 2; b++) {
          const sx = x + 2 + a * (cw - 4) / 2, sy = yt + 1 + b * chh * 0.45, sw = (cw - 4) / 2 - 1, sh = chh * 0.5;
          ctx.fillStyle = mix((a + b + k) % 2 ? '#dcb67c' : '#e6c48c', '#1a1a2a', night * 0.5);
          ctx.beginPath();
          ctx.roundRect(sx, sy, sw, sh, 4);
          ctx.fill();
          ctx.strokeStyle = 'rgba(120,85,40,.6)';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.fillStyle = 'rgba(120,85,40,.75)';
          ctx.fillRect(sx + sw * 0.15, sy + sh * 0.45, 2, 2);
        }
    }
  } else if (p === STONE) {
    const yt = y - STONE_H * hz;
    ctx.fillStyle = mix('#7d7a76', '#000000', night * 0.45);
    ctx.fillRect(x + 0.5, yt + chh, cw, STONE_H * hz);
    ctx.strokeStyle = 'rgba(40,40,40,.45)';
    ctx.lineWidth = 1;
    for (let k = 1; k < 3; k++) {
      ctx.beginPath();
      ctx.moveTo(x, yt + chh + (k * STONE_H * hz) / 3);
      ctx.lineTo(x + cw, yt + chh + (k * STONE_H * hz) / 3);
      ctx.stroke();
    }
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      const ox = (k % 2) * cw * 0.25;
      ctx.moveTo(x + cw * 0.5 + ox - cw * 0.12, yt + chh + (k * STONE_H * hz) / 3);
      ctx.lineTo(x + cw * 0.5 + ox - cw * 0.12, yt + chh + ((k + 1) * STONE_H * hz) / 3);
      ctx.stroke();
    }
    ctx.fillStyle = mix('#b8b4ad', '#111111', night * 0.45);
    ctx.fillRect(x + 0.5, yt, cw, chh);
    ctx.fillStyle = 'rgba(255,255,255,.22)';
    for (let k = 0; k < 4; k++) ctx.fillRect(x + 3 + (k % 2) * cw * 0.48, yt + 3 + Math.floor(k / 2) * chh * 0.48, cw * 0.42, chh * 0.38);
  } else if (p === PIPE) {
    const cx = x + cw / 2, cy = y + chh / 2;
    ctx.fillStyle = '#5d6a72';
    ctx.beginPath();
    ctx.ellipse(cx, cy, cw * 0.38, chh * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1b2530';
    ctx.beginPath();
    ctx.ellipse(cx, cy, cw * 0.3, chh * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#a7b6bf';
    ctx.lineWidth = 1.6;
    for (let k = -2; k <= 2; k++) {
      ctx.beginPath();
      ctx.moveTo(cx + k * cw * 0.11, cy - chh * 0.24);
      ctx.lineTo(cx + k * cw * 0.11, cy + chh * 0.24);
      ctx.stroke();
    }
    if (busy) {
      ctx.strokeStyle = 'rgba(200,240,255,.8)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(cx, cy, cw * 0.2, t / 4 + i, t / 4 + i + 4);
      ctx.stroke();
    }
  }
}

/** 지킬 것: 고양이 집 · 오리 둥지 · 꼬마 도서관 (물이 가까우면 깨고, 닿으면 웃기게 난리) */
function drawKeeper(ctx: CanvasRenderingContext2D, s: FloodState, i: number, x: number, y: number, cw: number, t: number, W: Float64Array, lights: [number, number, number][], night: number) {
  const k = s.st.prot[i], wet = s.phase === 'result' && !s.ok && s.failCell === i, alert = s.near[i] && s.phase !== 'build', saved = s.phase === 'result' && s.ok;
  const age = s.pt, z = cw;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.beginPath();
  ctx.ellipse(x + z * 0.08, y + z * 0.05, z * 0.52, z * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  if (k === CAT) {
    // 집
    const bw = z * 0.86, bh = z * 0.6, bx = x - bw / 2, by = y - bh;
    ctx.fillStyle = mix('#f3e3c3', '#2a2a3a', night * 0.45);
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = mix('#d8c49c', '#20202a', night * 0.45);
    ctx.fillRect(bx + bw * 0.78, by, bw * 0.22, bh);
    ctx.fillStyle = mix('#e8553f', '#3a1a20', night * 0.4);
    ctx.beginPath();
    ctx.moveTo(bx - z * 0.1, by + 2);
    ctx.lineTo(x, by - z * 0.42);
    ctx.lineTo(bx + bw + z * 0.1, by + 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.2)';
    ctx.beginPath();
    ctx.moveTo(bx - z * 0.05, by);
    ctx.lineTo(x, by - z * 0.38);
    ctx.lineTo(x - z * 0.05, by - z * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#7a4a2a';
    ctx.beginPath();
    ctx.roundRect(x - z * 0.13, by + bh * 0.35, z * 0.26, bh * 0.65, [z * 0.13, z * 0.13, 0, 0]);
    ctx.fill();
    const lit = night > 0.25;
    ctx.fillStyle = lit ? '#ffd27a' : '#9fd4f0';
    ctx.fillRect(bx + bw * 0.08, by + bh * 0.22, z * 0.16, z * 0.14);
    if (lit) lights.push([bx + bw * 0.16, by + bh * 0.3, night]);
    // 고양이 (문 앞에서 웅크려 쿨쿨 → 물이 오면 번쩍 → 잠기면 지붕 위로 펄쩍)
    let cx = x + z * 0.3, cy = y + z * 0.02, pose = 'sleep';
    if (wet) {
      const up = Math.min(1, age / 10);
      cx = x + Math.sin(age / 3) * z * 0.05;
      cy = y - (z * 0.95) * up - Math.abs(Math.sin(age / 4)) * z * 0.06;
      pose = 'puff';
    } else if (saved) pose = age % 80 < 50 ? 'stretch' : 'sit';
    else if (alert) pose = 'alert';
    drawCat(ctx, cx, cy, z * 0.8, t, pose);
  } else if (k === DUCK) {
    const bob = wet ? Math.sin(age / 6) * z * 0.06 - Math.min(z * 0.25, age * 0.6) : 0, sway = wet ? Math.sin(age / 9) * z * 0.15 : 0;
    ctx.translate(sway, bob);
    ctx.fillStyle = '#c89b4c';
    ctx.beginPath();
    ctx.ellipse(x, y - z * 0.08, z * 0.44, z * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8a6428';
    ctx.lineWidth = 1;
    for (let q = 0; q < 6; q++) {
      ctx.beginPath();
      ctx.arc(x, y - z * 0.08, z * (0.3 + q * 0.025), Math.PI * (0.1 + q * 0.1), Math.PI * (0.6 + q * 0.1));
      ctx.stroke();
    }
    for (let e = 0; e < 3; e++) {
      ctx.fillStyle = '#fffaf0';
      ctx.beginPath();
      ctx.ellipse(x - z * 0.2 + e * z * 0.13, y - z * 0.16 + (e % 2) * 2, z * 0.07, z * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // 엄마 오리
    const dx = x + z * 0.12, dy = y - z * 0.3, quack = alert && t % 60 < 20;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(dx, dy, z * 0.26, z * 0.17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(dx + z * 0.18, dy - z * 0.17, z * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff9f1c';
    ctx.beginPath();
    ctx.moveTo(dx + z * 0.28, dy - z * (quack ? 0.2 : 0.17));
    ctx.lineTo(dx + z * 0.4, dy - z * 0.16);
    ctx.lineTo(dx + z * 0.28, dy - z * (quack ? 0.1 : 0.13));
    ctx.fill();
    ctx.fillStyle = '#111111';
    ctx.beginPath();
    ctx.arc(dx + z * 0.21, dy - z * 0.2, alert || wet ? z * 0.035 : z * 0.02, 0, Math.PI * 2);
    ctx.fill();
    if (wet && age % 50 < 30) fitText(ctx, '♪', dx - z * 0.3, dy - z * 0.35, z * 0.4, '#ffffff', z, 900);
  } else {
    // 꼬마 도서관 + 안경 부엉이
    const bw = z * 0.84, bh = z * 0.62, bx = x - bw / 2, by = y - bh;
    ctx.fillStyle = mix('#5b7bb8', '#1a2238', night * 0.4);
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = mix('#3e5c96', '#141a2a', night * 0.4);
    ctx.beginPath();
    ctx.moveTo(bx - z * 0.06, by + 2);
    ctx.lineTo(bx + bw / 2, by - z * 0.26);
    ctx.lineTo(bx + bw + z * 0.06, by + 2);
    ctx.fill();
    ctx.fillStyle = '#f6efdd';
    ctx.fillRect(bx + bw * 0.1, by + bh * 0.18, bw * 0.8, bh * 0.62);
    const bk = ['#e8553f', '#ffd43b', '#4cc3ff', '#7ad36a', '#c58cff', '#ff8fb1'];
    for (let q = 0; q < 6; q++) {
      const float = wet ? Math.sin(age / 7 + q) * z * 0.05 - Math.min(z * 0.3, age * 0.5) * ((q % 3) / 3) : 0;
      ctx.fillStyle = bk[q];
      ctx.fillRect(bx + bw * (0.14 + (q % 3) * 0.24), by + bh * (0.22 + Math.floor(q / 3) * 0.3) + float, bw * 0.08 + (q % 2), bh * 0.24);
    }
    if (night > 0.25) lights.push([x, by + bh * 0.5, night]);
    const ox = x + z * 0.34, oy = y - z * 0.18 - (wet ? Math.min(z * 0.7, age * 1.2) + Math.abs(Math.sin(age / 3)) * z * 0.08 : alert ? Math.abs(Math.sin(t / 5)) * z * 0.05 : 0);
    ctx.fillStyle = '#9a7048';
    ctx.beginPath();
    ctx.ellipse(ox, oy, z * 0.17, z * 0.21, 0, 0, Math.PI * 2);
    ctx.fill();
    if (wet || alert)
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(ox + sx * z * 0.2, oy - z * 0.02, z * 0.1, z * 0.05, sx * (0.5 + Math.sin(t / 2) * 0.6), 0, Math.PI * 2);
        ctx.fill();
      }
    ctx.fillStyle = '#f0dcc0';
    ctx.beginPath();
    ctx.ellipse(ox, oy + z * 0.04, z * 0.1, z * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    for (const sx of [-1, 1]) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ox + sx * z * 0.07, oy - z * 0.07, z * (wet ? 0.07 : 0.055), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#111111';
      ctx.beginPath();
      ctx.arc(ox + sx * z * 0.07, oy - z * 0.07, z * (wet ? 0.035 : alert ? 0.025 : 0.012), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ffb02e';
    ctx.beginPath();
    ctx.moveTo(ox - z * 0.03, oy - z * 0.02);
    ctx.lineTo(ox + z * 0.03, oy - z * 0.02);
    ctx.lineTo(ox, oy + z * 0.04);
    ctx.fill();
  }
  // 쿨쿨 (아직 아무 일 없을 때)
  if (!alert && !wet && !saved) {
    const ph = (t % 90) / 90;
    ctx.globalAlpha = 1 - ph;
    fitText(ctx, k === CAT ? 'z' : k === DUCK ? 'z' : 'z', x + z * (0.4 + ph * 0.2), y - z * (0.5 + ph * 0.4), z * (0.3 + ph * 0.15), '#ffffff', z, 900);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  void W;
}

function drawCat(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, t: number, pose: string) {
  const orange = '#f59f3a', dark = '#c4701e';
  ctx.save();
  ctx.translate(x, y);
  if (pose === 'sleep') {
    // 웅크린 식빵 + 꼬리 감기
    ctx.fillStyle = orange;
    ctx.beginPath();
    ctx.ellipse(0, -z * 0.18, z * 0.42, z * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = orange;
    ctx.lineWidth = z * 0.12;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(-z * 0.05, -z * 0.12, z * 0.38, 0.3, 1.9);
    ctx.stroke();
    ctx.fillStyle = dark;
    for (let k = 0; k < 3; k++) ctx.fillRect(-z * 0.2 + k * z * 0.14, -z * 0.42, z * 0.05, z * 0.12);
    const br = 1 + Math.sin(t / 25) * 0.04;
    ctx.fillStyle = orange;
    ctx.beginPath();
    ctx.arc(z * 0.3, -z * 0.24, z * 0.2 * br, 0, Math.PI * 2);
    ctx.fill();
    for (const sx of [0.18, 0.4]) {
      ctx.beginPath();
      ctx.moveTo(z * sx - z * 0.07, -z * 0.36);
      ctx.lineTo(z * sx, -z * 0.5);
      ctx.lineTo(z * sx + z * 0.07, -z * 0.36);
      ctx.fill();
    }
    ctx.strokeStyle = '#4a2a10';
    ctx.lineWidth = 1.3;
    for (const sx of [0.24, 0.38]) {
      ctx.beginPath();
      ctx.arc(z * sx, -z * 0.25, z * 0.04, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }
    ctx.fillStyle = '#ff9fae';
    ctx.beginPath();
    ctx.arc(z * 0.31, -z * 0.19, z * 0.025, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const puff = pose === 'puff', st = pose === 'stretch';
    // 몸
    ctx.fillStyle = orange;
    ctx.beginPath();
    ctx.ellipse(0, -z * 0.25, z * (st ? 0.42 : 0.28) * (puff ? 1.2 : 1), z * (st ? 0.18 : 0.26) * (puff ? 1.2 : 1), 0, 0, Math.PI * 2);
    ctx.fill();
    if (puff) {
      ctx.strokeStyle = orange;
      ctx.lineWidth = 2;
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * z * 0.3, -z * 0.25 + Math.sin(a) * z * 0.28);
        ctx.lineTo(Math.cos(a) * z * 0.42, -z * 0.25 + Math.sin(a) * z * 0.4);
        ctx.stroke();
      }
    }
    // 꼬리 (쭈뼛 · 살랑)
    ctx.strokeStyle = orange;
    ctx.lineWidth = z * (puff ? 0.16 : 0.1);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-z * 0.22, -z * 0.25);
    if (puff) ctx.lineTo(-z * 0.34, -z * 0.75);
    else ctx.quadraticCurveTo(-z * 0.5, -z * 0.3, -z * 0.42, -z * (0.55 + 0.1 * Math.sin(t / 8)));
    ctx.stroke();
    // 머리
    const hx = st ? z * 0.42 : z * 0.05, hy = st ? -z * 0.3 : -z * 0.6;
    ctx.fillStyle = orange;
    ctx.beginPath();
    ctx.arc(hx, hy, z * 0.22, 0, Math.PI * 2);
    ctx.fill();
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(hx + sx * z * 0.08, hy - z * 0.15);
      ctx.lineTo(hx + sx * z * (puff ? 0.22 : 0.17), hy - z * (puff ? 0.38 : 0.33));
      ctx.lineTo(hx + sx * z * 0.2, hy - z * 0.08);
      ctx.fill();
    }
    // 눈: 번쩍(놀람) · 동그랗게(쭈뼛) · 실눈(기지개)
    for (const sx of [-1, 1]) {
      if (st) {
        ctx.strokeStyle = '#4a2a10';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.arc(hx + sx * z * 0.08, hy - z * 0.02, z * 0.04, Math.PI + 0.3, -0.3);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(hx + sx * z * 0.08, hy - z * 0.02, z * (puff ? 0.08 : 0.06), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.arc(hx + sx * z * 0.08, hy - z * 0.02, z * (puff ? 0.025 : 0.035), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = '#ff9fae';
    ctx.beginPath();
    ctx.arc(hx, hy + z * 0.05, z * 0.025, 0, Math.PI * 2);
    ctx.fill();
    if (puff || st) {
      ctx.fillStyle = '#5a1a1a';
      ctx.beginPath();
      ctx.ellipse(hx, hy + z * 0.12, z * 0.05, z * (puff ? 0.06 : 0.04), 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (puff)
      for (let k = 0; k < 3; k++) {
        ctx.fillStyle = 'rgba(150,215,255,.9)';
        ctx.beginPath();
        ctx.arc(-z * 0.3 + k * z * 0.3, -z * 0.05 + ((t / 3 + k * 7) % 14), z * 0.04, 0, Math.PI * 2);
        ctx.fill();
      }
  }
  ctx.restore();
}

function pieceIcon(ctx: CanvasRenderingContext2D, p: number, x: number, y: number, size: number, t: number) {
  const cw = size, chh = size * 0.8, hz = size * 0.22;
  ctx.fillStyle = p === DITCH ? '#6b4528' : '#7fbf5a';
  ctx.fillRect(x - cw / 2, y - chh / 2 + hz * 0.5, cw, chh);
  if (p === DITCH) {
    ctx.fillStyle = 'rgba(30,15,5,.4)';
    ctx.fillRect(x - cw / 2, y - chh / 2 + hz * 0.5, cw, chh * 0.25);
  }
  drawPiece(ctx, p, 1, x - cw / 2, y - chh / 2 + hz * 0.5, cw, chh, hz, t, 0, 0, p === PIPE);
}

function drawHud(ctx: CanvasRenderingContext2D, s: FloodState, w: number, h: number, th: Theme) {
  const R = (v: number) => v * w, st = s.st, m = s.sim, t = s.t;
  // 위 띠: 판 · 별 · 하트
  const hb = R(0.085);
  ctx.fillStyle = 'rgba(16,36,56,.82)';
  ctx.fillRect(0, 0, w, hb);
  fitText(ctx, `🌊 ${s.stage + 1}/${STAGES.length}판`, R(0.03), hb / 2, R(0.042), th.ink, R(0.3), 900, 'left');
  fitText(ctx, st.goal, w / 2 - R(0.02), hb / 2, R(0.038), '#cfeeff', R(0.38), 800);
  ctx.font = `900 ${R(0.04)}px system-ui, sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffe066';
  ctx.fillText(`★${s.stars}`, w - R(0.03), hb / 2);
  const sw = ctx.measureText(`★${s.stars}`).width;
  ctx.fillStyle = th.hot;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - R(0.05) - sw, hb / 2);
  // 예보판
  const fy = R(0.095), fh = R(0.13);
  ctx.fillStyle = 'rgba(12,32,52,.84)';
  ctx.beginPath();
  ctx.roundRect(R(0.03), fy, w - R(0.06), fh, R(0.025));
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,200,255,.5)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  const head = s.phase === 'build' ? '📢 홍수 예보' : s.phase === 'watch' ? '🌊 버티는 중' : s.ok ? '🎉 버텼다!' : '💦 잠겼다…';
  fitText(ctx, head, R(0.06), fy + R(0.028), R(0.038), '#ffe08a', R(0.3), 900, 'left');
  const total = st.waves.reduce((a, wv) => a + wv.L, 0);
  fitText(ctx, `모두 ${total}L`, w - R(0.06), fy + R(0.028), R(0.036), '#bfe6ff', R(0.3), 800, 'right');
  const lines = st.waves.slice(0, 3);
  lines.forEach((wv, k) => {
    const y = fy + R(0.064) + k * R(0.034) * (lines.length > 2 ? 0.95 : 1.1);
    const when = wv.at / SPS < 1 ? '바로' : `${Math.round(wv.at / SPS)}초 뒤`;
    const what = wv.kind === 'rain' ? `☔ 비 ${wv.L}L · 판 전체에` : wv.kind === 'tide' ? `🌊 밀물 ${wv.L}L ${ARROW[wv.side]} 배수로에서 → 다시 빠짐` : `💧 ${wv.L}L ${ARROW[wv.side]} ${entryName(wv)}에서`;
    let state = when, col = '#e8f6ff';
    if (s.phase !== 'build') {
      if (m.n >= wv.at + wv.dur) (state = '✓ 지나감'), (col = '#9fb8c8');
      else if (m.n >= wv.at) (state = '지금!'), (col = '#7fe0ff');
      else state = `${Math.ceil((wv.at - m.n) / SPS)}초 뒤`;
    }
    fitText(ctx, `${'①②③'[k]} ${what}`, R(0.06), y, R(0.037), col, R(0.68), 800, 'left');
    fitText(ctx, state, w - R(0.06), y, R(0.036), col, R(0.2), 900, 'right');
  });
  // 아래 쟁반: 짓는 동안 = 다음 조각 · 줄 · ↶ · ▶ 버티기 / 버티는 동안 = 지킬 것 물 게이지
  const ty0 = R(TRAY);
  ctx.fillStyle = 'rgba(16,36,56,.88)';
  ctx.fillRect(0, ty0, w, h - ty0);
  ctx.fillStyle = 'rgba(120,200,255,.35)';
  ctx.fillRect(0, ty0, w, 1.5);
  if (s.phase === 'build') {
    const nx = s.qi < st.queue.length ? st.queue[s.qi] : 0;
    ctx.fillStyle = 'rgba(255,255,255,.08)';
    ctx.beginPath();
    ctx.roundRect(R(0.03), ty0 + R(0.02), R(0.18), R(0.12), R(0.02));
    ctx.fill();
    if (nx) {
      ctx.save();
      ctx.shadowColor = '#ffe066';
      ctx.shadowBlur = 8 + 4 * Math.sin(t / 8);
      pieceIcon(ctx, nx, R(0.12), ty0 + R(0.085), R(0.1), t);
      ctx.restore();
    } else fitText(ctx, '다 놓음', R(0.12), ty0 + R(0.085), R(0.036), '#cfeeff', R(0.16), 800);
    fitText(ctx, '다음', R(0.12), ty0 + R(0.033), R(0.034), '#ffe08a', R(0.16), 900);
    for (let k = 1; k <= 4 && s.qi + k < st.queue.length; k++) pieceIcon(ctx, st.queue[s.qi + k], R(0.205 + k * 0.068), ty0 + R(0.09), R(0.052), t);
    const left = st.queue.length - s.qi;
    if (left > 5) fitText(ctx, `+${left - 5}`, R(0.505), ty0 + R(0.09), R(0.036), '#cfeeff', R(0.05), 800);
    const u = UNDO;
    ctx.fillStyle = s.placed.length ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.05)';
    ctx.beginPath();
    ctx.roundRect(R(u.x), R(u.y), R(u.w), R(u.h), R(0.02));
    ctx.fill();
    fitText(ctx, '↶', R(u.x + u.w / 2), R(u.y + u.h / 2), R(0.06), s.placed.length ? '#ffffff' : 'rgba(255,255,255,.35)', R(u.w), 900);
    const b = BTN, pul = 1 + 0.03 * Math.sin(t / 6);
    ctx.save();
    ctx.translate(R(b.x + b.w / 2), R(b.y + b.h / 2));
    ctx.scale(pul, pul);
    ctx.fillStyle = s.qi > 0 ? '#2f9e44' : '#3c6a50';
    ctx.shadowColor = 'rgba(0,0,0,.4)';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.roundRect(-R(b.w / 2), -R(b.h / 2), R(b.w), R(b.h), R(0.025));
    ctx.fill();
    ctx.shadowBlur = 0;
    fitText(ctx, '▶ 버티기', 0, 0, R(0.046), '#ffffff', R(b.w - 0.02), 900);
    ctx.restore();
    const desc = nx ? `${PNAME[nx]} — ${PDESC[nx]}` : '▶ 버티기를 누르면 물이 와요';
    fitText(ctx, desc, w / 2, ty0 + R(0.185), R(0.038), '#dff2ff', w - R(0.06), 800);
  } else {
    // 지킬 것마다 물 게이지: 🐱 ▓▓░░ 3/20L
    const ps = st.protCells, gw = (w - R(0.06)) / ps.length;
    ps.forEach((i, k) => {
      const v = Math.min(FLOOD, m.w[i]), emo = st.prot[i] === CAT ? '🐱' : st.prot[i] === DUCK ? '🦆' : '📚', gx = R(0.03) + gw * k, gy = ty0 + R(0.06);
      ctx.fillStyle = '#ffffff';
      fitText(ctx, emo, gx + R(0.035), gy, R(0.05), '#ffffff', R(0.07), 400);
      const bx = gx + R(0.075), bw = gw - R(0.095);
      ctx.fillStyle = 'rgba(255,255,255,.15)';
      ctx.beginPath();
      ctx.roundRect(bx, gy - R(0.018), bw, R(0.036), R(0.018));
      ctx.fill();
      ctx.fillStyle = v >= FLOOD ? th.hot : v > 8 ? '#ffb84d' : '#5fd3ff';
      ctx.beginPath();
      ctx.roundRect(bx, gy - R(0.018), Math.max(R(0.036), (bw * v) / FLOOD), R(0.036), R(0.018));
      ctx.fill();
      fitText(ctx, `${Math.round(v)}/${FLOOD}L`, bx + bw / 2, gy, R(0.036), '#ffffff', bw, 900);
    });
    const left = st.queue.length - s.qi, inL = Math.round(st.waves.reduce((a, wv) => a + (wv.L * Math.max(0, Math.min(wv.dur, m.n - wv.at))) / wv.dur, 0));
    const msg = s.phase === 'watch' ? `들어온 물 ${inL}L · 빠진 물 ${Math.round(m.out + m.sunk)}L${left ? ` · 조각 ${left}개 남김` : ''}` : s.ok ? `${'★'.repeat(s.got)}${'☆'.repeat(3 - s.got)}  지킴 ✓${st.bonusCells.length ? (s.bonusPeak < FLOOD ? ' · 텃밭 ✓' : ' · 텃밭 ✗') : ' · 보너스 ✓'}${left ? ' · 조각 남김 ✓' : ' · 조각 남김 ✗'}` : s.hearts > 0 ? '하트 -1 · 같은 판을 다시 지어요' : '하트가 없어요 — 끝';
    fitText(ctx, msg, w / 2, ty0 + R(0.135), R(0.04), s.phase === 'result' && !s.ok ? '#ffc0b8' : '#e8f6ff', w - R(0.06), 900);
  }
  // 판 카드: 시작 · 성공 · 실패
  {
    let head = '', sub = '', col = '#ffffff', age = 0;
    if (s.phase === 'result') {
      age = s.pt;
      if (s.ok) (head = s.won ? '대홍수까지 다 버텼다!' : `${s.stage + 1}판 버텼다!`), (sub = `${'★'.repeat(s.got)}${'☆'.repeat(3 - s.got)}`), (col = '#ffe066');
      else {
        const k = st.prot[s.failCell];
        head = k === CAT ? '냐아앙!! 집이 젖었어요' : k === DUCK ? '오리 둥지가 둥실~' : '도서관 책이 젖었어요';
        sub = s.hearts > 0 ? `하트 -1 · 다시 지어요` : '끝 — 다음엔 더 높게!';
        col = '#ffb3a8';
      }
    } else if (s.phase === 'build' && s.pt < 100) (head = `${s.stage + 1}판 · ${st.name}`), (sub = st.goal), (age = s.pt);
    if (head) {
      const sc = Math.min(1, 0.6 + age / 12), a = s.phase === 'result' ? 1 : Math.min(1, (100 - s.pt) / 20);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(w / 2, R(0.58));
      ctx.scale(sc, sc);
      ctx.fillStyle = 'rgba(12,30,48,.88)';
      ctx.beginPath();
      ctx.roundRect(-R(0.4), -R(0.075), R(0.8), R(0.15), R(0.04));
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.stroke();
      fitText(ctx, head, 0, -R(0.025), R(0.052), col, R(0.74), 900);
      fitText(ctx, sub, 0, R(0.035), R(0.04), '#f0f8ff', R(0.74), 800);
      ctx.restore();
    }
  }
  // 새것 알림
  if (s.news && s.t - s.news.t < 210) {
    const age = s.t - s.news.t, a = Math.min(1, age / 10, (210 - age) / 20);
    ctx.globalAlpha = a;
    ctx.font = `900 ${R(0.036)}px system-ui, sans-serif`;
    const tx = `✨ ${s.news.text}`, tw2 = Math.min(w - 12, ctx.measureText(tx).width + 24), by = R(1.375);
    ctx.fillStyle = 'rgba(12,32,52,.9)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw2 / 2, by - R(0.026), tw2, R(0.052), R(0.026));
    ctx.fill();
    ctx.strokeStyle = th.accent;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    fitText(ctx, tx, w / 2, by, R(0.036), '#ffffff', w - 30, 900);
    ctx.globalAlpha = 1;
  }
  // 처음 안내
  if (s.stage === 0 && s.taps === 0 && s.phase === 'build' && s.pt > 60) {
    const tx = '👆 점선 칸을 톡! 모래주머니로 물길을 막아요';
    ctx.font = `900 ${R(0.04)}px system-ui, sans-serif`;
    const tw2 = Math.min(w - 12, ctx.measureText(tx).width + 20);
    ctx.fillStyle = 'rgba(12,32,52,.85)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw2 / 2, R(0.27) - R(0.03), tw2, R(0.06), R(0.03));
    ctx.fill();
    fitText(ctx, tx, w / 2, R(0.27), R(0.04), '#ffffff', w - 30, 900);
  }
}

// ───────────────────────────── 봇 ─────────────────────────────
const dumbAt = new WeakMap<object, number>();
/** 못하는 봇: 아무 데나, 아무 때나 톡 */
export const floodRandom: Bot<FloodState> = {
  name: '아무 데나 톡',
  act(s, rng) {
    const next = dumbAt.get(s) ?? 20 + Math.floor(rng() * 60);
    if (s.t < next) return { tap: false, dir: 0, pointer: null };
    dumbAt.set(s, s.t + 20 + Math.floor(rng() * 80));
    return { tap: false, dir: 0, pointer: { x: rng(), y: rng() } };
  },
};

/** 다음 조각을 놓을 후보 칸: 지킬 것으로 물이 새어 든 이웃 칸부터 (넘친 둑이면 겹쳐 쌓거나, 그 둑으로 물을 보낸 바깥 칸).
 *  도랑은 배수로 옆·이미 판 도랑 옆도 (물길 잇기), 어디에도 쓸모없으면 멀찍이 버릴 칸 하나 */
function candidates(st: Stage, m: Sim, res: SimRes, p: number): number[] {
  const out: number[] = [];
  const add = (i: number) => i >= 0 && !out.includes(i) && out.push(i);
  const leak = [...Array(NN).keys()].filter((i) => res.inflow[i] > 0.5).sort((a, b) => res.inflow[b] - res.inflow[a]);
  for (const i of leak.slice(0, 6)) {
    if (canPlace(st, m, i, p)) add(i);
    else {
      let best = -1, bv = 0.5;
      for (const [pp, j] of PAIRS_OF[i]) {
        const into = PB[pp] === i ? res.cum[pp] : -res.cum[pp];
        if (into > bv && !st.prot[j] && canPlace(st, m, j, p)) (bv = into), (best = j);
      }
      add(best);
    }
    if (out.length >= 3) break;
  }
  if (p === DITCH)
    for (let i = 0; i < NN; i++)
      if (canPlace(st, m, i, p) && NB8[i].some((k) => st.outlet[k] || m.piece[k] === DITCH) && !NB8[i].some((k) => st.prot[k]) && out.length < 6) add(i);
  if (!out.length) add(dumpCell(st, m, p));
  return out;
}
/** 물길에서 가장 먼 높은 칸 (쓸모없는 조각을 버릴 곳) */
function dumpCell(st: Stage, m: Sim, p: number) {
  let best = -1, bv = -1e9;
  for (let i = 0; i < NN; i++) {
    if (!canPlace(st, m, i, p) || st.outlet[i]) continue;
    let d = 99;
    for (const k of st.protCells) d = Math.min(d, Math.max(Math.abs(rowOf(k) - rowOf(i)), Math.abs(colOf(k) - colOf(i))));
    const v = d * 2 + st.h[i] - rowOf(i) * 0.01;
    if (v > bv) (bv = v), (best = i);
  }
  return best;
}

interface Node { cells: number[]; res: SimRes; v: number }
function value(st: Stage, cells: number[], r: SimRes) {
  if (r.fail) return -10000 + r.failAt * 3 - r.peak;
  const left = st.queue.length - cells.length;
  return 1000 + (st.bonusCells.length === 0 || r.bonusPeak < FLOOD ? 300 : 0) + (left >= 1 ? 200 : 0) - r.peak * 2 - r.bonusPeak * 0.2;
}
/** 잘하는 봇의 계획: 물을 실제로 흘려 보며 새는 곳을 막아 나간다 (빔 3) */
export function plan(st: Stage): number[] {
  const root: Node = { cells: [], res: runPlan(st, []), v: 0 };
  root.v = value(st, [], root.res);
  let beam = [root], best = root;
  for (let k = 0; k < st.queue.length; k++) {
    const next: Node[] = [];
    for (const b of beam) {
      if (!b.res.fail && (st.bonusCells.length === 0 || b.res.bonusPeak < FLOOD)) continue;
      const m = newSim(st);
      for (let j = 0; j < b.cells.length; j++) place(m, b.cells[j], st.queue[j]);
      for (const c of candidates(st, m, b.res, st.queue[k])) {
        const cells = [...b.cells, c], res = runPlan(st, cells), n = { cells, res, v: value(st, cells, res) };
        next.push(n);
        if (n.v > best.v) best = n;
      }
    }
    if (!next.length) break;
    beam = next.sort((a, b) => b.v - a.v).slice(0, 3);
  }
  return best.cells;
}

const plans = new WeakMap<object, { key: string; cells: number[]; k: number }>();
/** 잘하는 봇: 판마다 물을 미리 흘려 보고 정한 칸에 차례로 톡, 남길 조각이 있으면 ▶ 버티기 */
export const floodSmart: Bot<FloodState> = {
  name: '물길 박사',
  act(s) {
    const no = { tap: false, dir: 0 as const, pointer: null };
    if (s.phase !== 'build' || s.down || s.autoAt >= 0) return no;
    const key = `${s.stage}:${s.tries}:${s.hearts}`;
    let pl = plans.get(s);
    if (!pl || pl.key !== key) plans.set(s, (pl = { key, cells: plan(s.st), k: 0 }));
    if (s.qi < pl.cells.length) {
      const pt = cellPt(s, pl.cells[s.qi]);
      return { tap: false, dir: 0, pointer: { x: pt.x, y: pt.y / A } };
    }
    return { tap: false, dir: 0, pointer: { x: BTN.x + BTN.w / 2, y: (BTN.y + BTN.h / 2) / A } };
  },
};
