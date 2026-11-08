/**
 * 개미 단면 정원 (19라운드 메뉴 6번) — 땅따먹기 × 농사·수확 × 가리키기(탭 한 번).
 * 기준 9(조작 최소): 손이 하는 일은 '흙 한 곳 톡'뿐. 톡 친 곳까지 개미 떼가 가장 덜 힘든 길로 굴을 판다.
 * 와우: 유리 단면 속 흙을 톡 치면 개미 줄이 사사삭 내려가 굴을 파고, 굴이 설탕·씨앗에 닿는 순간 방이 생긴다 —
 *       씨앗 방 위 정원에선 싹이 돋아 꽃이 피고, 개미가 계속 늘어 굴 파는 속도도 빨라진다.
 * 첫 3초: 입구 바로 아래 설탕 방울. 첫 탭에 개미 넷이 줄지어 내려가 두 칸을 파고 '설탕 창고! +3'.
 * 목표·보상: 하루(판)마다 해 지기 전 개미 N마리 — 빨리 채울수록 별. 못 채우면 하트 -1, 그 날만 다시. 6일(한 계절)이면 끝.
 * 하는 일이 바뀐다: 2일 비(빗물은 가장 깊은 굴부터 → 빈 굴을 더 깊게 파 물받이를 만든다)
 *                  → 3일 두더지(정해진 줄을 지나가며 굴·방을 무너뜨림 → 그 줄엔 방을 두지 않고, 끊긴 길은 다시 판다)
 *                  → 4일 버섯 농장(물에 잠기면 오히려 쑥쑥 → 이번엔 버섯을 가장 깊이)
 *                  → 5일 '?' 흙덩이(옆까지 파야 속이 보임: 꿀 아니면 물주머니 → 옆을 먼저 파서 엿본다).
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.42;
export const COLS = 9, ROWS = 8, N = COLS * ROWS;
const X0 = 0.08, X1 = 0.9, CW = (X1 - X0) / COLS, Y0 = 0.45, CH = 0.088, Y1 = Y0 + ROWS * CH;
/** 3/4 시점: 상자 뒤쪽 모서리가 오른쪽 위로 비켜 보인다 */
const DX = 0.042, DY = -0.05, GT = Y0 - 0.075;
/** 입구 (맨 윗줄 가운데) */
export const ENT = 4;
export const SOIL = 0, CLAY = 1, ROCK = 2, LOOSE = 3, DUG = 4;
const COST = [1, 2.2, Infinity, 0.35, 0];
const SPROUT = 100, SEED_P = 210, FUNG_P = 270, FUNG_WET = 70, WET = 420;
const RAIN_P = 640, RAIN_FIRST = 480, RAIN_WARN = 170, MOLE_P = 600, MOLE_FIRST = 430, MOLE_WARN = 130, MOLE_SPEED = 1 / 7;

type Room = '' | 'sugar' | 'seed' | 'fungus' | 'honey';
type Res = '' | 'sugar' | 'seed' | 'fungus' | 'mystery' | 'honey' | 'pocket';
interface Day { T: number; goal: number; sugar: number; seed: number; fungus: number; mystery: number; rock: number; clay: number; rain: number; mole: boolean }
const DAYS: Day[] = [
  { T: 40, goal: 12, sugar: 4, seed: 2, fungus: 0, mystery: 0, rock: 3, clay: 0, rain: 0, mole: false },
  { T: 42, goal: 16, sugar: 3, seed: 3, fungus: 0, mystery: 0, rock: 4, clay: 1, rain: 4, mole: false },
  { T: 44, goal: 20, sugar: 3, seed: 3, fungus: 0, mystery: 0, rock: 4, clay: 1, rain: 4, mole: true },
  { T: 46, goal: 24, sugar: 3, seed: 2, fungus: 2, mystery: 0, rock: 5, clay: 2, rain: 5, mole: true },
  { T: 46, goal: 28, sugar: 2, seed: 2, fungus: 2, mystery: 3, rock: 5, clay: 2, rain: 5, mole: true },
  { T: 48, goal: 32, sugar: 3, seed: 2, fungus: 2, mystery: 3, rock: 6, clay: 2, rain: 6, mole: true },
];
interface Mole { row: number; at: number; pos: number; dir: 1 | -1; last: number }
interface Ev { t: number; kind: string; x: number; y: number; text?: string; col?: string }
export interface AntState {
  rng: Rng; t: number; day: number; dt: number; T: number; goal: number;
  kind: number[]; res: Res[]; hidden: Res[]; room: Room[]; prog: number[]; wet: number[]; grow: number[]; tmr: number[]; conn: boolean[];
  ants: number; target: number; chain: number[]; down: boolean; taps: number; first: number;
  rainAt: number; rainV: number; raining: number; mole: Mole | null;
  hearts: number; stars: number; pts: number; pause: number; cleared: boolean; won: boolean;
  seen: Set<string>; events: Ev[]; dead: boolean;
}

const NB: number[][] = [...Array(N).keys()].map((i) => {
  const r = Math.floor(i / COLS), c = i % COLS, out: number[] = [];
  if (r > 0) out.push(i - COLS);
  if (c > 0) out.push(i - 1);
  if (c < COLS - 1) out.push(i + 1);
  if (r < ROWS - 1) out.push(i + COLS);
  return out;
});
const rowOf = (i: number) => Math.floor(i / COLS), colOf = (i: number) => i % COLS;
const cx = (c: number) => X0 + (c + 0.5) * CW, cy = (r: number) => Y0 + (r + 0.5) * CH;
const rate = (ants: number) => (0.75 + 0.065 * Math.min(ants, 30)) / 60;
const sugarAmt = (r: number) => 3 + Math.floor(r / 3);

const ev = (s: AntState, kind: string, x: number, y: number, text?: string, col?: string) => s.events.push({ t: s.t, kind, x, y, text, col });
function see(s: AntState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  ev(s, 'new', 0.5, Y0 + 0.36, text);
}

/** 입구에서 각 칸까지 '파야 할 흙의 양'이 가장 적은 길 (봇이 내다볼 때도 같은 함수) */
export function dijkstra(kind: number[]): { d: Float64Array; prev: Int16Array } {
  const d = new Float64Array(N).fill(Infinity), prev = new Int16Array(N).fill(-1), done = new Uint8Array(N);
  d[ENT] = 0;
  for (;;) {
    let u = -1, best = Infinity;
    for (let i = 0; i < N; i++) if (!done[i] && d[i] < best) (best = d[i]), (u = i);
    if (u < 0) break;
    done[u] = 1;
    for (const v of NB[u]) {
      const w = COST[kind[v]];
      if (w === Infinity) continue;
      const nd = best + w + 0.002;
      if (nd < d[v]) (d[v] = nd), (prev[v] = u);
    }
  }
  return { d, prev };
}
const chainTo = (prev: Int16Array, i: number) => {
  const out: number[] = [];
  for (let k = i; k >= 0; k = prev[k]) out.push(k);
  return out.reverse();
};
/** 입구와 이어진 굴 (넓이 우선 순서) */
function reach(kind: number[]): number[] {
  const order = [ENT], on = new Uint8Array(N);
  on[ENT] = 1;
  for (let k = 0; k < order.length; k++) for (const v of NB[order[k]]) if (!on[v] && kind[v] === DUG) (on[v] = 1), order.push(v);
  return order;
}
/** 빗물 V칸이 찰 자리: 입구와 이어진 굴 중 가장 깊은 줄부터 (이미 찬 칸은 건너뜀) */
export function floodCells(kind: number[], wet: ArrayLike<number>, V: number): number[] {
  const order = reach(kind).map((i, k) => [i, k]);
  order.sort((a, b) => rowOf(b[0]) - rowOf(a[0]) || a[1] - b[1]);
  const out: number[] = [];
  for (const [i] of order) {
    if (out.length >= V) break;
    if (!wet[i]) out.push(i);
  }
  return out;
}

function connect(s: AntState) {
  s.conn = Array(N).fill(false);
  for (const i of reach(s.kind)) s.conn[i] = true;
  // 옆까지 판 '?' 흙덩이는 속이 보인다
  for (let i = 0; i < N; i++)
    if (s.res[i] === 'mystery' && NB[i].some((v) => s.conn[v])) {
      s.res[i] = s.hidden[i];
      ev(s, 'peek', cx(colOf(i)), cy(rowOf(i)), s.res[i] === 'honey' ? '꿀이다!' : '물주머니…', s.res[i] === 'honey' ? '#ffc94d' : '#7cc7ff');
    }
}

function gain(s: AntState, n: number) {
  s.ants += n;
}

function flood(s: AntState, V: number) {
  for (const i of floodCells(s.kind, s.wet, V)) {
    s.wet[i] = WET;
    const rm = s.room[i], x = cx(colOf(i)), y = cy(rowOf(i));
    if (!rm) continue;
    if (rm === 'fungus') ev(s, 'wetfungus', x, y, '버섯 쑥쑥!', '#b8f28a');
    else (s.ants = Math.max(1, s.ants - 2)), ev(s, 'drown', x, y, '물에 잠겼다! -2🐜', '#7cc7ff');
  }
}

function makeRoom(s: AntState, i: number, res: Res) {
  const r = rowOf(i), x = cx(colOf(i)), y = cy(r);
  if (res === 'sugar') {
    const a = sugarAmt(r);
    s.room[i] = 'sugar';
    gain(s, a);
    ev(s, 'room', x, y, `설탕 창고! +${a}🐜`, '#fff1c4');
    see(s, 'sugar', '설탕에 닿으면 창고 — 개미가 한꺼번에 늘어요');
  } else if (res === 'seed') {
    s.room[i] = 'seed';
    s.grow[i] = 0;
    s.tmr[i] = 0;
    ev(s, 'room', x, y, '씨앗 방! 위에 싹이 터요', '#9be15d');
    see(s, 'seed', '씨앗 방 — 위 정원에 싹이 트고 개미가 계속 늘어요');
  } else if (res === 'fungus') {
    s.room[i] = 'fungus';
    s.tmr[i] = 0;
    ev(s, 'room', x, y, '버섯 농장!', '#f3e3c3');
  } else if (res === 'honey') {
    s.room[i] = 'honey';
    gain(s, 7);
    ev(s, 'room', x, y, '꿀 창고! +7🐜', '#ffc94d');
  } else if (res === 'pocket') {
    ev(s, 'pocket', x, y, '물주머니가 터졌다!', '#7cc7ff');
    flood(s, 4);
  }
}

function dig(s: AntState, i: number) {
  const before = s.conn.filter((on, k) => on && s.room[k]).length;
  s.kind[i] = DUG;
  s.prog[i] = 0;
  connect(s);
  ev(s, 'dig', cx(colOf(i)), cy(rowOf(i)));
  const res = s.res[i] === 'mystery' ? s.hidden[i] : s.res[i];
  s.res[i] = '';
  if (res) makeRoom(s, i, res);
  else if (s.conn.filter((on, k) => on && s.room[k]).length > before) ev(s, 'room', cx(colOf(i)), cy(rowOf(i)), '다시 이어졌다!', '#ffe066');
}

function setTarget(s: AntState, i: number) {
  const { d, prev } = dijkstra(s.kind);
  if (d[i] === Infinity) return void ev(s, 'rock', cx(colOf(i)), cy(rowOf(i)), '돌에 막혔어요', '#d0d4dc');
  s.target = i;
  s.chain = chainTo(prev, i);
  if (s.taps++ === 0) s.first = s.dt;
  ev(s, 'go', cx(colOf(i)), cy(rowOf(i)), s.taps === 1 ? '사사삭!' : undefined, '#ffe066');
}

function tapAt(s: AntState, x: number, y: number) {
  if (x < X0 - 0.03 || x > X1 + 0.03 || y < Y0 - 0.03 || y > Y1 + 0.03) return;
  const c = Math.max(0, Math.min(COLS - 1, Math.floor((x - X0) / CW))), r = Math.max(0, Math.min(ROWS - 1, Math.floor((y - Y0) / CH))), i = r * COLS + c;
  if (s.kind[i] === ROCK) return void ev(s, 'rock', cx(c), cy(r), '돌은 못 파요', '#d0d4dc');
  if (s.kind[i] === DUG && s.conn[i]) return void ev(s, 'here', cx(c), cy(r));
  setTarget(s, i);
}

function moleStep(s: AntState) {
  const m = s.mole;
  if (!m) return;
  if (s.dt === m.at - MOLE_WARN) {
    ev(s, 'molewarn', m.dir > 0 ? X0 : X1, cy(m.row), '두더지가 와요!', '#ffb08a');
    see(s, 'mole', '두더지 — 지나가는 줄의 굴과 방이 무너져요');
  }
  if (s.dt < m.at) return;
  m.pos += m.dir * MOLE_SPEED;
  const c = Math.round(m.pos);
  if (c >= 0 && c < COLS && c !== m.last) {
    m.last = c;
    const i = m.row * COLS + c;
    if (s.kind[i] === DUG) {
      s.kind[i] = LOOSE;
      s.wet[i] = 0;
      if (s.room[i]) (s.room[i] = ''), (s.ants = Math.max(1, s.ants - 2)), ev(s, 'molehit', cx(c), cy(m.row), '와르르! -2🐜', '#ffb08a');
      else ev(s, 'loose', cx(c), cy(m.row));
      connect(s);
      if (s.target >= 0) s.chain = chainTo(dijkstra(s.kind).prev, s.target);
    }
  }
  if ((m.dir > 0 && m.pos > COLS + 0.6) || (m.dir < 0 && m.pos < -1.6)) {
    m.at += MOLE_P;
    m.dir = m.dir > 0 ? -1 : 1;
    m.pos = m.dir > 0 ? -1.5 : COLS + 0.5;
    m.last = -1;
  }
}

function newDay(s: AntState) {
  const d = DAYS[s.day], r = s.rng;
  s.T = d.T;
  s.goal = d.goal;
  s.dt = 0;
  s.cleared = false;
  s.kind = Array(N).fill(SOIL);
  s.res = Array(N).fill('');
  s.hidden = Array(N).fill('');
  s.room = Array(N).fill('');
  s.prog = Array(N).fill(0);
  s.wet = Array(N).fill(0);
  s.grow = Array(N).fill(0);
  s.tmr = Array(N).fill(0);
  s.kind[ENT] = DUG;
  s.ants = 4;
  s.target = -1;
  s.chain = [];
  s.raining = 0;
  s.rainV = d.rain;
  s.rainAt = RAIN_FIRST;
  const mrow = d.mole ? 2 + Math.floor(r() * 4) : -1;
  s.mole = d.mole ? { row: mrow, at: MOLE_FIRST, pos: -1.5, dir: 1, last: -1 } : null;
  for (let b = 0; b < d.clay; b++) {
    const row = 2 + Math.floor(r() * 5);
    for (let c = 0; c < COLS; c++) if (r() < 0.75) s.kind[row * COLS + c] = CLAY;
  }
  const free = (r0: number, r1: number) => {
    for (let k = 0; k < 60; k++) {
      const i = (r0 + Math.floor(r() * (r1 - r0 + 1))) * COLS + Math.floor(r() * COLS);
      if (i === ENT || i === ENT + COLS || s.kind[i] === ROCK || s.res[i] || NB[i].some((v) => s.res[v])) continue;
      return i;
    }
    return -1;
  };
  for (let k = 0; k < d.rock; k++) {
    const i = free(1, ROWS - 1);
    if (i >= 0) s.kind[i] = ROCK;
  }
  // 첫 날: 입구 바로 아래 설탕 방울 (첫 탭 3초 안에 방)
  if (s.day === 0) (s.res[ENT + 2 * COLS] = 'sugar'), (s.kind[ENT + 2 * COLS] = SOIL);
  const put = (res: Res, n: number, r0: number, r1: number) => {
    for (let k = 0; k < n; k++) {
      const i = free(r0, r1);
      if (i < 0) continue;
      if (s.kind[i] === CLAY && res !== 'fungus') s.kind[i] = SOIL;
      if (res === 'mystery') (s.res[i] = 'mystery'), (s.hidden[i] = r() < 0.55 ? 'honey' : 'pocket');
      else s.res[i] = res;
    }
  };
  put('sugar', d.sugar - (s.day === 0 ? 1 : 0), s.day === 0 ? 1 : 2, s.day === 0 ? 5 : ROWS - 1);
  put('seed', d.seed, 1, s.day === 0 ? 4 : 6);
  put('fungus', d.fungus, 4, ROWS - 1);
  put('mystery', d.mystery, 2, ROWS - 1);
  // 두더지 줄엔 큼직한 설탕 미끼 하나
  if (mrow >= 0) {
    const i = mrow * COLS + (r() < 0.5 ? 1 + Math.floor(r() * 2) : COLS - 2 - Math.floor(r() * 2));
    if (!s.res[i] && s.kind[i] !== ROCK) s.res[i] = 'sugar';
  }
  // 돌에 갇힌 것은 치운다
  const { d: dist } = dijkstra(s.kind);
  for (let i = 0; i < N; i++) if (s.res[i] && dist[i] === Infinity) s.res[i] = '';
  connect(s);
  if (d.fungus) see(s, 'fungus', '버섯 — 물에 잠기면 오히려 쑥쑥 자라요');
  if (d.mystery) see(s, 'mystery', '? 흙덩이 — 바로 옆까지 파야 속이 보여요');
  ev(s, 'stage', 0.5, Y0 + 0.2, `${s.day + 1}일째 — 해 지기 전 개미 ${s.goal}마리`);
}

export const antfarm: GameDef<AntState> = {
  id: 'antfarm',
  name: '개미 단면 정원',
  genes: ['territory', 'farm', 'pointer'],
  twist: '유리 단면 속 흙을 톡 치면 개미 떼가 그쪽으로 굴을 파 내려가 닿는 것마다 방(설탕 창고·씨앗 방·버섯 농장)이 생긴다 — 그런데 빗물은 가장 깊은 굴부터 채워서, 어디를 얼마나 깊이 팔지가 곧 수가 된다',
  rules: ['흙을 톡 치면 개미들이 그쪽으로 굴을 파요. 설탕·씨앗에 닿으면 방이 생겨 개미가 늘어요.', '해 지기 전에 개미 수를 채우면 하루 통과 — 빨리 채울수록 별!', '빗물은 가장 깊은 굴부터 차고, 두더지는 지나가는 줄의 방을 무너뜨려요.'],
  controls: 'touch',
  hint: '흙을 톡 = 그쪽으로 굴 파기 / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '유리 단면 개미 정원',
    mood: '나무틀 유리 상자 속에 켜켜이 쌓인 흙층, 수십 마리 개미가 줄지어 설탕과 씨앗을 나르고, 위쪽 정원엔 새싹이 꽃으로 자란다. 해가 기울면 굴 속 방마다 따뜻한 불빛이 켜진다.',
    palette: { bg: '#2b1d14', ink: '#fff8ec', muted: '#9c8065', accent: '#9be15d', hot: '#ff6b5a', soft: '#5a3d29' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = {
      rng: mulberry32(seed), t: 0, day: 0, dt: 0, T: 40, goal: 12, kind: [], res: [], hidden: [], room: [], prog: [], wet: [], grow: [], tmr: [], conn: [],
      ants: 4, target: -1, chain: [], down: false, taps: 0, first: -1, rainAt: 0, rainV: 0, raining: 0, mole: null,
      hearts: 3, stars: 0, pts: 0, pause: 0, cleared: false, won: false, seen: new Set<string>(), events: [], dead: false,
    } as AntState;
    newDay(s);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    s.events = s.events.filter((e) => s.t - e.t < 100);
    const p = inp.pointer ?? null, press = !!p && !s.down;
    s.down = !!p;
    if (s.pause > 0) {
      if (--s.pause === 0) {
        if (s.won) s.dead = true;
        else if (s.cleared) s.day++, newDay(s);
        else newDay(s);
      }
      return;
    }
    s.dt++;
    if (press && p) tapAt(s, p.x, p.y * A);
    // 굴 파기: 입구에서 목표까지 이어진 길에서 아직 안 판 첫 칸을 판다 (개미가 많을수록 빠르다)
    if (s.target >= 0) {
      const h = s.chain.find((i) => s.kind[i] !== DUG);
      if (h === undefined) s.target = -1;
      else {
        s.prog[h] += rate(s.ants);
        if (s.dt % 12 === 0) ev(s, 'crumb', cx(colOf(h)), cy(rowOf(h)));
        if (s.prog[h] >= COST[s.kind[h]]) {
          dig(s, h);
          if (h === s.target) s.target = -1;
        }
      }
    }
    // 비: 미리 구름이 끼고, 빗물은 가장 깊은 굴부터 채운다
    if (s.rainV) {
      if (s.dt === s.rainAt - RAIN_WARN) ev(s, 'rainwarn', 0.5, Y0 - 0.2, '☁️ 곧 비가 와요!', '#cfe8ff'), see(s, 'rain', '비 — 빗물은 가장 깊은 굴부터 채워요');
      if (s.dt === s.rainAt) (s.raining = 110), flood(s, s.rainV), (s.rainAt += RAIN_P), ev(s, 'rain', 0.5, Y0 - 0.1);
    }
    if (s.raining > 0) s.raining--;
    moleStep(s);
    // 방이 개미를 낳는다 (입구와 이어져 있어야)
    for (let i = 0; i < N; i++) {
      const rm = s.room[i];
      if (s.wet[i] > 0) s.wet[i]--;
      if (!rm || !s.conn[i]) continue;
      if (rm === 'seed') {
        if (s.wet[i]) continue;
        if (s.grow[i] < SPROUT) {
          if (++s.grow[i] === SPROUT) ev(s, 'sprout', cx(colOf(i)) + DX * 0.5, Y0 + DY * 0.5, '싹!', '#9be15d');
          continue;
        }
        if (++s.tmr[i] >= SEED_P) (s.tmr[i] = 0), gain(s, 1), ev(s, 'born', cx(colOf(i)), cy(rowOf(i)), '+1', '#c9f59a');
      } else if (rm === 'fungus') {
        s.tmr[i] += s.wet[i] ? FUNG_P / FUNG_WET : 1;
        if (s.tmr[i] >= FUNG_P) (s.tmr[i] -= FUNG_P), gain(s, 1), ev(s, 'born', cx(colOf(i)), cy(rowOf(i)), '+1', '#f3e3c3');
      }
    }
    if (s.ants >= s.goal) {
      const left = 1 - s.dt / (s.T * 60), st = left >= 0.4 ? 3 : left >= 0.15 ? 2 : 1, last = s.day === DAYS.length - 1;
      s.stars += st;
      s.pts += s.goal + st * 10 + 10;
      s.cleared = true;
      ev(s, 'clear', 0.5, Y0 + 0.28, `${s.day + 1}일째 성공! ${'★'.repeat(st)}${'☆'.repeat(3 - st)}`);
      if (last) (s.won = true), (s.pts += 40), ev(s, 'season', 0.5, Y0 + 0.4, '한 계절 개미 마을 완성!');
      s.pause = last ? 150 : 110;
    } else if (s.dt >= s.T * 60) {
      s.hearts--;
      ev(s, 'fail', 0.5, Y0 + 0.3, s.hearts > 0 ? '해가 졌어요… 하트 -1 · 그 날 다시' : '해가 졌어요… 끝');
      if (s.hearts <= 0) s.dead = true;
      else s.pause = 110;
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
const hex = (c: string) => [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16));
const mix = (a: string, b: string, t: number) => {
  const p = hex(a), q = hex(b);
  return `rgb(${p.map((v, k) => Math.round(v + (q[k] - v) * Math.max(0, Math.min(1, t)))).join(',')})`;
};
const ROOM_COL: Record<string, string> = { sugar: '#fff1c4', seed: '#9be15d', fungus: '#f3e3c3', honey: '#ffc94d' };
const FLOWER = ['#ff8fb1', '#ffd43b', '#ff7b54', '#c58cff', '#7cc7ff'];

function drawAnt(ctx: CanvasRenderingContext2D, x: number, y: number, ang: number, z: number, t: number, carry?: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.strokeStyle = '#1b0e07';
  ctx.lineWidth = Math.max(0.6, z * 0.22);
  const wig = Math.sin(t * 0.7 + x * 3) * z * 0.35;
  ctx.beginPath();
  for (const k of [-1, 0, 1]) {
    const lx = k * z * 0.45, sw = k === 0 ? -wig : wig;
    ctx.moveTo(lx, 0);
    ctx.lineTo(lx + sw, z * 0.95);
    ctx.moveTo(lx, 0);
    ctx.lineTo(lx - sw, -z * 0.95);
  }
  ctx.stroke();
  ctx.fillStyle = '#2b150a';
  ctx.beginPath();
  ctx.ellipse(-z * 0.95, 0, z * 0.62, z * 0.46, 0, 0, Math.PI * 2);
  ctx.ellipse(0, 0, z * 0.38, z * 0.28, 0, 0, Math.PI * 2);
  ctx.ellipse(z * 0.68, 0, z * 0.36, z * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,220,180,.35)';
  ctx.beginPath();
  ctx.arc(-z * 1.05, -z * 0.18, z * 0.2, 0, Math.PI * 2);
  ctx.fill();
  if (carry) {
    ctx.fillStyle = carry;
    ctx.beginPath();
    ctx.arc(z * 1.3, 0, z * 0.48, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawMole(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, dir: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  const g = ctx.createRadialGradient(-z * 0.2, -z * 0.3, z * 0.1, 0, 0, z * 1.1);
  g.addColorStop(0, '#6b5a5a');
  g.addColorStop(1, '#2c2222');
  ctx.fillStyle = g;
  ctx.shadowColor = 'rgba(0,0,0,.5)';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.ellipse(0, 0, z * 1.15, z * 0.78, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  // 분홍 삽 손
  ctx.fillStyle = '#ffb3bf';
  for (const sy of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(z * 0.55, sy * z * 0.62, z * 0.32, z * 0.2, sy * (0.6 + 0.3 * Math.sin(t * 0.5)), 0, Math.PI * 2);
    ctx.fill();
  }
  // 코
  ctx.beginPath();
  ctx.ellipse(z * 1.2, 0, z * 0.28, z * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff7f93';
  ctx.beginPath();
  ctx.arc(z * 1.36, 0, z * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0e0808';
  ctx.beginPath();
  ctx.arc(z * 0.72, -z * 0.28, z * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawAll(ctx: CanvasRenderingContext2D, s: AntState, w: number, h: number, th: Theme) {
  const fx = juice(s), X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w;
  const t = s.t, p = Math.min(1, s.dt / (s.T * 60)), rainy = s.rainV > 0 && s.dt >= s.rainAt - RAIN_WARN ? Math.min(1, (s.dt - (s.rainAt - RAIN_WARN)) / 60) : s.raining > 0 ? Math.min(1, s.raining / 40) : 0;
  const CX = (c: number) => X(cx(c)), CY = (r: number) => Y(cy(r));
  ctx.save();
  fx.begin(ctx);
  // ── 하늘: 아침 → 한낮 → 노을, 비구름이 끼면 잿빛 ──
  const top = p < 0.6 ? mix('#78c4f0', '#5aaee8', p / 0.6) : mix('#5aaee8', '#5b5a9e', (p - 0.6) / 0.4);
  const bot = p < 0.6 ? mix('#d9f2ff', '#fff3cf', p / 0.6) : mix('#fff3cf', '#ff9a66', (p - 0.6) / 0.4);
  const sky = ctx.createLinearGradient(0, 0, 0, Y(Y0 + 0.05));
  sky.addColorStop(0, top);
  sky.addColorStop(1, bot);
  ctx.fillStyle = sky;
  ctx.fillRect(-10, -10, w + 20, h + 20);
  if (rainy > 0) (ctx.fillStyle = `rgba(80,95,115,${0.45 * rainy})`), ctx.fillRect(-10, -10, w + 20, Y(Y0 + 0.1));
  // 해
  {
    const sx = X(0.06 + 0.88 * p), sy = Y(0.33 - 0.2 * Math.sin(p * Math.PI));
    ctx.fillStyle = p > 0.75 ? '#ffb070' : '#fff2a8';
    ctx.shadowColor = p > 0.75 ? '#ff7a3d' : '#ffe066';
    ctx.shadowBlur = R(0.08);
    ctx.globalAlpha = 1 - rainy * 0.6;
    ctx.beginPath();
    ctx.arc(sx, sy, R(0.035), 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }
  // 먼 언덕 두 겹
  for (const [yy, col, amp, k] of [[0.4, '#8fc7a0', 0.025, 1], [0.43, '#6fae6a', 0.02, 2]] as [number, string, number, number][]) {
    ctx.fillStyle = mix(col, '#5d4a7a', p > 0.6 ? (p - 0.6) * 1.2 : 0);
    ctx.beginPath();
    ctx.moveTo(0, Y(yy + 0.1));
    for (let x = 0; x <= 1.0001; x += 0.05) ctx.lineTo(X(x), Y(yy - amp * (1 + Math.sin(x * 7 * k + k)) ));
    ctx.lineTo(w, Y(yy + 0.1));
    ctx.fill();
  }
  // 땅(잔디 마당)
  const gr = ctx.createLinearGradient(0, Y(0.44), 0, h);
  gr.addColorStop(0, '#7dbb5b');
  gr.addColorStop(1, '#4f8a3a');
  ctx.fillStyle = gr;
  ctx.fillRect(-10, Y(0.44), w + 20, h);
  ctx.strokeStyle = 'rgba(40,90,30,.45)';
  ctx.lineWidth = 1.2;
  for (let k = 0; k < 70; k++) {
    const gx = hsh(k) * w, gy = Y(0.46) + hsh(k + 99) * (h - Y(0.46));
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx + Math.sin(t / 40 + k) * 1.5, gy - 5 - hsh(k + 7) * 4);
    ctx.stroke();
  }
  // 상자 그림자
  {
    const sg = ctx.createRadialGradient(X(0.52), Y(Y1 + 0.06), 0, X(0.52), Y(Y1 + 0.06), R(0.55));
    sg.addColorStop(0, 'rgba(20,30,10,.5)');
    sg.addColorStop(1, 'rgba(20,30,10,0)');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.ellipse(X(0.52), Y(Y1 + 0.06), R(0.55), R(0.06), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // ── 상자 뒷유리·윗면(정원 흙) ──
  ctx.fillStyle = 'rgba(210,235,255,.18)';
  ctx.beginPath();
  ctx.moveTo(X(X0 + DX), Y(GT + DY));
  ctx.lineTo(X(X1 + DX), Y(GT + DY));
  ctx.lineTo(X(X1 + DX), Y(Y0 + DY));
  ctx.lineTo(X(X0 + DX), Y(Y0 + DY));
  ctx.fill();
  const topG = ctx.createLinearGradient(0, Y(Y0 + DY), 0, Y(Y0));
  topG.addColorStop(0, '#6aa84f');
  topG.addColorStop(1, '#8fcf62');
  ctx.fillStyle = topG;
  ctx.beginPath();
  ctx.moveTo(X(X0), Y(Y0));
  ctx.lineTo(X(X1), Y(Y0));
  ctx.lineTo(X(X1 + DX), Y(Y0 + DY));
  ctx.lineTo(X(X0 + DX), Y(Y0 + DY));
  ctx.fill();
  // 오른쪽 옆면 (흙 단면이 비스듬히)
  const bands = [0, 2.2, 4.6, 6.6, ROWS], bandCol = ['#5a3a22', '#7b5131', '#9b6d43', '#6b3d2b'];
  for (let b = 0; b < 4; b++) {
    const ya = Y0 + bands[b] * CH, yb = Y0 + bands[b + 1] * CH;
    ctx.fillStyle = mix(bandCol[b], '#000000', 0.38);
    ctx.beginPath();
    ctx.moveTo(X(X1), Y(ya));
    ctx.lineTo(X(X1 + DX), Y(ya + DY));
    ctx.lineTo(X(X1 + DX), Y(yb + DY));
    ctx.lineTo(X(X1), Y(yb));
    ctx.fill();
  }
  // ── 앞 단면 흙 ──
  ctx.save();
  ctx.beginPath();
  ctx.rect(X(X0), Y(Y0), X(X1 - X0), Y(Y1 - Y0));
  ctx.clip();
  for (let b = 0; b < 4; b++) {
    ctx.fillStyle = bandCol[b];
    ctx.beginPath();
    ctx.moveTo(X(X0), Y(Y1 + 0.02));
    for (let x = X0; x <= X1 + 0.001; x += 0.02) ctx.lineTo(X(x), Y(Y0 + bands[b] * CH + (b ? 0.008 * Math.sin(x * 23 + b * 2) : -0.01)));
    ctx.lineTo(X(X1), Y(Y1 + 0.02));
    ctx.fill();
  }
  const shade = ctx.createLinearGradient(0, Y(Y0), 0, Y(Y1));
  shade.addColorStop(0, 'rgba(0,0,0,0)');
  shade.addColorStop(1, 'rgba(0,0,0,.28)');
  ctx.fillStyle = shade;
  ctx.fillRect(X(X0), Y(Y0), X(X1 - X0), Y(Y1 - Y0));
  // 흙 알갱이·자갈
  for (let k = 0; k < 160; k++) {
    const gx = X(X0 + hsh(k * 3) * (X1 - X0)), gy = Y(Y0 + hsh(k * 3 + 1) * (Y1 - Y0));
    ctx.fillStyle = k % 3 ? 'rgba(255,230,190,.13)' : 'rgba(0,0,0,.18)';
    ctx.fillRect(gx, gy, 1.6, 1.6);
  }
  for (let k = 0; k < 16; k++) {
    const gx = X(X0 + hsh(k * 5 + 400) * (X1 - X0)), gy = Y(Y0 + 0.05 + hsh(k * 5 + 401) * (Y1 - Y0 - 0.05)), pr = R(0.006 + hsh(k + 500) * 0.008);
    ctx.fillStyle = '#8a8178';
    ctx.beginPath();
    ctx.ellipse(gx, gy, pr * 1.3, pr, hsh(k) * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.beginPath();
    ctx.arc(gx - pr * 0.4, gy - pr * 0.35, pr * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }
  // 장식 뿌리 + 씨앗 방 위 식물의 뿌리
  ctx.strokeStyle = 'rgba(214,170,120,.55)';
  ctx.lineWidth = 1.4;
  for (const [rx, len] of [[0.17, 0.12], [0.73, 0.09], [0.84, 0.15]]) {
    ctx.beginPath();
    ctx.moveTo(X(rx), Y(Y0));
    ctx.bezierCurveTo(X(rx - 0.02), Y(Y0 + len * 0.4), X(rx + 0.03), Y(Y0 + len * 0.7), X(rx + 0.005), Y(Y0 + len));
    ctx.stroke();
  }
  for (let i = 0; i < N; i++)
    if (s.room[i] === 'seed' && s.grow[i] > 20) {
      const c = colOf(i), r = rowOf(i), g = Math.min(1, s.grow[i] / SPROUT);
      ctx.strokeStyle = 'rgba(235,215,160,.75)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(CX(c) + R(0.012), Y(Y0));
      ctx.quadraticCurveTo(CX(c) + R(0.03), Y(Y0 + (cy(r) - Y0) * 0.5), CX(c) + R(0.006), Y(Y0 + (cy(r) - CH * 0.35 - Y0) * g));
      ctx.stroke();
    }
  // 두더지 길 (그 줄이 위험하다는 표시)
  if (s.mole) {
    const m = s.mole, warn = s.dt >= m.at - MOLE_WARN;
    ctx.fillStyle = warn ? `rgba(255,120,80,${0.18 + 0.12 * Math.sin(t / 4)})` : 'rgba(30,15,10,.22)';
    ctx.fillRect(X(X0), Y(Y0 + m.row * CH + CH * 0.12), X(X1 - X0), Y(CH * 0.76));
    ctx.fillStyle = 'rgba(255,220,200,.35)';
    for (let c = 0; c < COLS; c++) {
      ctx.beginPath();
      ctx.arc(CX(c) + R(0.02) * ((c % 2) * 2 - 1), CY(m.row) + R(0.028), R(0.006), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // 진흙·돌
  for (let i = 0; i < N; i++) {
    const c = colOf(i), r = rowOf(i), x = CX(c), y = CY(r);
    if (s.kind[i] === CLAY) {
      ctx.fillStyle = 'rgba(150,70,45,.55)';
      ctx.beginPath();
      ctx.roundRect(x - R(CW * 0.5), y - R(CH * 0.42), R(CW), R(CH * 0.84), R(0.02));
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,190,150,.18)';
      ctx.lineWidth = 1;
      for (let k = -1; k <= 1; k++) (ctx.beginPath(), ctx.moveTo(x - R(CW * 0.4), y + k * R(0.02)), ctx.quadraticCurveTo(x, y + k * R(0.02) - R(0.008), x + R(CW * 0.4), y + k * R(0.02)), ctx.stroke());
    }
    if (s.kind[i] === ROCK) {
      ctx.fillStyle = '#7d7a76';
      ctx.shadowColor = 'rgba(0,0,0,.45)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 2;
      ctx.beginPath();
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2, rr = R(0.042) * (0.82 + 0.3 * hsh(i * 9 + k));
        ctx.lineTo(x + Math.cos(a) * rr * 1.08, y + Math.sin(a) * rr * 0.92);
      }
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.fillStyle = 'rgba(255,255,255,.28)';
      ctx.beginPath();
      ctx.ellipse(x - R(0.012), y - R(0.014), R(0.016), R(0.009), -0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // ── 굴 ──
  const dug = (i: number) => s.kind[i] === DUG;
  const tw = R(Math.min(CW, CH) * 0.5);
  ctx.lineCap = 'round';
  for (const [col, wd, oy] of [['#c79a6a', tw * 1.32, 1.5], ['#1f1109', tw, 0]] as [string, number, number][]) {
    ctx.strokeStyle = col;
    ctx.fillStyle = col;
    ctx.lineWidth = wd;
    for (let i = 0; i < N; i++) {
      if (!dug(i)) continue;
      const x = CX(colOf(i)), y = CY(rowOf(i)) + oy;
      ctx.beginPath();
      ctx.arc(x, y, wd / 2, 0, Math.PI * 2);
      ctx.fill();
      for (const v of NB[i]) {
        if (v < i || !dug(v)) continue;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(CX(colOf(v)), CY(rowOf(v)) + oy);
        ctx.stroke();
      }
      if (i === ENT) (ctx.beginPath(), ctx.moveTo(x, y), ctx.lineTo(x, Y(Y0) - 2), ctx.stroke());
    }
  }
  // 방 (타원 공간 + 안의 것)
  for (let i = 0; i < N; i++) {
    const rm = s.room[i];
    if (!rm) continue;
    const x = CX(colOf(i)), y = CY(rowOf(i)), on = s.conn[i];
    ctx.fillStyle = '#c79a6a';
    ctx.beginPath();
    ctx.ellipse(x, y + 1.5, R(CW * 0.5), R(CH * 0.42), 0, 0, Math.PI * 2);
    ctx.fill();
    const rg = ctx.createRadialGradient(x, y - R(0.01), 0, x, y, R(CW * 0.48));
    rg.addColorStop(0, on ? '#4a2c17' : '#2a1a10');
    rg.addColorStop(1, '#1a0d06');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.ellipse(x, y, R(CW * 0.46), R(CH * 0.38), 0, 0, Math.PI * 2);
    ctx.fill();
    if (rm === 'sugar') {
      for (let k = 0; k < 5; k++) {
        const bx = x + (k - 2) * R(0.011), by = y + R(0.012) - (k % 2) * R(0.011), z = R(0.0105);
        ctx.fillStyle = '#fffaf0';
        ctx.fillRect(bx - z / 2, by - z / 2, z, z);
        ctx.fillStyle = 'rgba(180,160,120,.6)';
        ctx.fillRect(bx - z / 2, by + z * 0.2, z, z * 0.3);
      }
    } else if (rm === 'seed') {
      ctx.fillStyle = '#b9824a';
      ctx.beginPath();
      ctx.ellipse(x, y + R(0.01), R(0.016), R(0.011), 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#9be15d';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y + R(0.004));
      ctx.quadraticCurveTo(x + R(0.01), y - R(0.015), x, y - R(0.028));
      ctx.stroke();
    } else if (rm === 'fungus') {
      for (let k = 0; k < 4; k++) {
        const bx = x + (k - 1.5) * R(0.014), by = y + R(0.014), z = R(0.008 + 0.004 * ((k + 1) % 2)) * (s.wet[i] ? 1.3 : 1);
        ctx.fillStyle = '#efe2c8';
        ctx.fillRect(bx - 1, by - z, 2, z);
        ctx.fillStyle = s.wet[i] ? '#fff6e0' : '#e8d3a8';
        ctx.beginPath();
        ctx.ellipse(bx, by - z, z, z * 0.7, 0, Math.PI, 0);
        ctx.fill();
      }
    } else if (rm === 'honey') {
      ctx.fillStyle = '#ffb22e';
      ctx.shadowColor = '#ffb22e';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.ellipse(x, y + R(0.012), R(CW * 0.32), R(0.013), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
  // 무너진 굴 (흙 부스러기)
  for (let i = 0; i < N; i++)
    if (s.kind[i] === LOOSE) {
      const x = CX(colOf(i)), y = CY(rowOf(i));
      ctx.fillStyle = 'rgba(60,35,20,.65)';
      ctx.beginPath();
      ctx.ellipse(x, y, R(CW * 0.42), R(CH * 0.3), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#a67a52';
      for (let k = 0; k < 7; k++) ctx.fillRect(x + (hsh(i * 7 + k) - 0.5) * R(CW * 0.7), y + (hsh(i * 7 + k + 3) - 0.5) * R(CH * 0.5), 2.5, 2.5);
    }
  // 빗물 (굴 안에 고인 물)
  for (let i = 0; i < N; i++) {
    if (!s.wet[i] || s.kind[i] !== DUG) continue;
    const lv = Math.min(1, (WET - s.wet[i]) / 30, s.wet[i] / 60), x = CX(colOf(i)), y = CY(rowOf(i)), hh = R(CH * 0.42) * lv;
    ctx.fillStyle = 'rgba(70,150,230,.72)';
    ctx.beginPath();
    ctx.roundRect(x - R(CW * 0.5), y + R(CH * 0.21) - hh, R(CW), hh, R(0.01));
    ctx.fill();
    ctx.fillStyle = 'rgba(220,245,255,.7)';
    ctx.fillRect(x - R(CW * 0.42), y + R(CH * 0.21) - hh, R(CW * 0.84) * (0.6 + 0.4 * Math.sin(t / 8 + i)), 1.5);
  }
  // 묻힌 것들 (설탕 방울·씨앗·버섯·? 흙덩이)
  for (let i = 0; i < N; i++) {
    const rs = s.res[i];
    if (!rs) continue;
    const x = CX(colOf(i)), y = CY(rowOf(i)), bob = Math.sin(t / 20 + i) * 1.2;
    ctx.fillStyle = 'rgba(30,15,8,.35)';
    ctx.beginPath();
    ctx.ellipse(x, y + R(0.004), R(CW * 0.36), R(CH * 0.3), 0, 0, Math.PI * 2);
    ctx.fill();
    if (rs === 'sugar') {
      const big = sugarAmt(rowOf(i)), z = R(0.014 + 0.003 * (big - 3));
      ctx.fillStyle = '#fff6dc';
      ctx.shadowColor = '#fff1b0';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(x, y - z * 1.5 + bob);
      ctx.bezierCurveTo(x + z * 1.2, y - z * 0.2 + bob, x + z, y + z + bob, x, y + z + bob);
      ctx.bezierCurveTo(x - z, y + z + bob, x - z * 1.2, y - z * 0.2 + bob, x, y - z * 1.5 + bob);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x - z * 0.35, y - z * 0.1 + bob, z * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffe9a8';
      ctx.font = `900 ${R(0.022)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`+${big}`, x + R(0.026), y - R(0.022));
    } else if (rs === 'mystery') {
      ctx.fillStyle = '#6e4a2c';
      ctx.beginPath();
      ctx.ellipse(x, y, R(0.026), R(0.021), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffe9c4';
      ctx.font = `900 ${R(0.03)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', x, y + 1);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.font = `${R(0.042)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(rs === 'seed' ? '🌰' : rs === 'fungus' ? '🍄' : rs === 'honey' ? '🍯' : '💧', x, y + bob);
    }
  }
  // 목표 칸과 팔 길 (점선)
  if (s.target >= 0) {
    const todo = s.chain.filter((i) => s.kind[i] !== DUG);
    ctx.fillStyle = 'rgba(255,224,102,.75)';
    for (const i of todo) (ctx.beginPath(), ctx.arc(CX(colOf(i)), CY(rowOf(i)), R(0.006), 0, Math.PI * 2), ctx.fill());
    const x = CX(colOf(s.target)), y = CY(rowOf(s.target));
    ctx.strokeStyle = '#ffe066';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.lineDashOffset = -t / 2;
    ctx.beginPath();
    ctx.arc(x, y, R(0.034) + Math.sin(t / 6) * 1.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    const hd = todo[0];
    if (hd !== undefined) {
      const k = Math.min(1, s.prog[hd] / COST[s.kind[hd]]);
      ctx.strokeStyle = '#fff8ec';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(CX(colOf(hd)), CY(rowOf(hd)), R(0.024), -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2);
      ctx.stroke();
    }
  }
  // ── 개미들: 입구에서 각 방·파는 곳까지 줄지어 왕복 (돌아올 땐 짐을 든다) ──
  {
    const prev = new Int16Array(N).fill(-1), on = new Uint8Array(N), q = [ENT];
    on[ENT] = 1;
    for (let k = 0; k < q.length; k++) for (const v of NB[q[k]]) if (!on[v] && dug(v)) (on[v] = 1), (prev[v] = q[k]), q.push(v);
    const pt = (i: number): [number, number] => [CX(colOf(i)), CY(rowOf(i))];
    const route = (i: number) => {
      const out: [number, number][] = [];
      for (let k = i; k >= 0; k = prev[k]) out.push(pt(k));
      out.push([CX(colOf(ENT)), Y(Y0) - 2]);
      return out.reverse();
    };
    const routes: { pts: [number, number][]; carry: string; dig: boolean }[] = [];
    const hd = s.target >= 0 ? s.chain.find((i) => s.kind[i] !== DUG) : undefined;
    if (hd !== undefined) {
      const back = NB[hd].find((v) => on[v]);
      if (back !== undefined) {
        const r0 = route(back), [hx, hy] = pt(hd), [bx, by] = pt(back), f = 0.25 + 0.45 * Math.min(1, s.prog[hd] / COST[s.kind[hd]]);
        r0.push([bx + (hx - bx) * f, by + (hy - by) * f]);
        routes.push({ pts: r0, carry: '#a67a52', dig: true });
      }
    }
    for (let i = 0; i < N; i++) if (s.room[i] && on[i]) routes.push({ pts: route(i), carry: ROOM_COL[s.room[i]], dig: false });
    const n = Math.min(Math.floor(s.ants), 48), nd = routes[0]?.dig ? Math.max(2, Math.round(n * 0.45)) : 0;
    const per = new Map<number, number>();
    const z = R(0.0085);
    for (let a = 0; a < n; a++) {
      let ri = -1;
      if (a < nd) ri = 0;
      else if (routes.length > (nd ? 1 : 0)) ri = (nd ? 1 : 0) + ((a - nd) % (routes.length - (nd ? 1 : 0)));
      if (ri < 0) {
        // 할 일 없는 개미: 입구 둘레를 서성인다
        const ang = t / 30 + a * 2.1, x = CX(colOf(ENT)) + Math.cos(ang) * R(0.02), y = CY(0) + Math.sin(ang * 1.3) * R(0.012);
        drawAnt(ctx, x, y, ang + Math.PI / 2, z, t + a * 5);
        continue;
      }
      const rt = routes[ri], k = per.get(ri) ?? 0;
      per.set(ri, k + 1);
      const cnt = ri === 0 && nd ? nd : Math.ceil((n - nd) / Math.max(1, routes.length - (nd ? 1 : 0)));
      let L = 0;
      const seg: number[] = [];
      for (let j = 1; j < rt.pts.length; j++) seg.push(Math.hypot(rt.pts[j][0] - rt.pts[j - 1][0], rt.pts[j][1] - rt.pts[j - 1][1])), (L += seg[j - 1]);
      if (L < 1) continue;
      const u = (t * R(0.0028) + (k / cnt + hsh(a) * 0.08) * 2 * L) % (2 * L), back = u > L;
      let dd = back ? 2 * L - u : u, j = 0;
      while (j < seg.length - 1 && dd > seg[j]) (dd -= seg[j]), j++;
      const [ax, ay] = rt.pts[j], [bx, by] = rt.pts[j + 1], f = seg[j] ? Math.min(1, dd / seg[j]) : 0;
      const ang = Math.atan2(by - ay, bx - ax) + (back ? Math.PI : 0), side = (back ? 1 : -1) * R(0.007);
      drawAnt(ctx, ax + (bx - ax) * f - Math.sin(ang) * side, ay + (by - ay) * f + Math.cos(ang) * side, ang, z, t + a * 7, back ? rt.carry : undefined);
    }
  }
  // 두더지
  if (s.mole) {
    const m = s.mole;
    if (s.dt >= m.at && m.pos > -1.4 && m.pos < COLS + 0.4) {
      const mx = X(X0 + (m.pos + 0.5) * CW), my = CY(m.row);
      ctx.fillStyle = 'rgba(166,122,82,.7)';
      for (let k = 0; k < 6; k++) ctx.fillRect(mx - m.dir * R(0.03 + k * 0.012) + Math.sin(t + k) * 3, my + (hsh(k + t) - 0.5) * R(0.05), 3, 3);
      drawMole(ctx, mx, my, R(0.032), m.dir, t);
    } else if (s.dt >= m.at - MOLE_WARN) {
      // 옆 유리에 코끝이 비친다
      const ex = m.dir > 0 ? X(X0) + R(0.012) : X(X1) - R(0.012);
      drawMole(ctx, ex - m.dir * R(0.03) + Math.sin(t / 3) * 2 * m.dir, CY(m.row), R(0.026), m.dir, t);
    }
  }
  ctx.restore(); // 흙 clip 끝
  // ── 윗면 정원: 개미 언덕·풀·씨앗 방에서 자란 꽃 ──
  {
    const ex = CX(colOf(ENT)) + R(DX * 0.45), ey = Y(Y0 + DY * 0.45);
    for (let k = 0; k < 22; k++) {
      const gx = X(X0 + 0.01 + hsh(k + 77) * (X1 - X0 - 0.02)), f = hsh(k + 33), gy = Y(Y0 + DY * f) - 1;
      ctx.strokeStyle = k % 2 ? '#4f8f37' : '#6fb04b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(gx + R(DX * f), gy);
      ctx.lineTo(gx + R(DX * f) + Math.sin(t / 35 + k) * 2, gy - R(0.012 + 0.01 * hsh(k)));
      ctx.stroke();
    }
    const mound = ctx.createRadialGradient(ex, ey - R(0.012), 0, ex, ey, R(0.05));
    mound.addColorStop(0, '#b5875a');
    mound.addColorStop(1, '#7b5534');
    ctx.fillStyle = mound;
    ctx.beginPath();
    ctx.ellipse(ex, ey, R(0.05), R(0.022), 0, Math.PI, 0);
    ctx.ellipse(ex, ey, R(0.05), R(0.008), 0, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = '#1f1109';
    ctx.beginPath();
    ctx.ellipse(ex, ey - R(0.008), R(0.012), R(0.006), 0, 0, Math.PI * 2);
    ctx.fill();
    // 꽃: 씨앗 방이 있는 열 위
    const plants: [number, number][] = [];
    for (let i = 0; i < N; i++) {
      if (s.room[i] !== 'seed') continue;
      const c = colOf(i), g = Math.min(1, s.grow[i] / SPROUT), bx = CX(c) + R(DX * 0.5), by = Y(Y0 + DY * 0.5), hgt = R(0.02 + 0.11 * g + 0.02 * Math.min(1, s.tmr[i] / SEED_P));
      const sway = Math.sin(t / 30 + c) * R(0.006) * g, tx = bx + sway, ty = by - hgt;
      plants.push([bx, by]);
      ctx.strokeStyle = '#3f8f2f';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx - R(0.01), by - hgt * 0.5, tx, ty);
      ctx.stroke();
      ctx.fillStyle = '#63b84a';
      for (let k = 1; k <= 2; k++) {
        if (g < k * 0.35) continue;
        const ly = by - hgt * (0.3 * k);
        ctx.beginPath();
        ctx.ellipse(bx + R(0.014) * (k % 2 ? 1 : -1), ly, R(0.014), R(0.006), (k % 2 ? -0.5 : 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
      if (g >= 1) {
        const pc = FLOWER[c % FLOWER.length], pr = R(0.012);
        ctx.fillStyle = pc;
        ctx.shadowColor = pc;
        ctx.shadowBlur = 6;
        for (let k = 0; k < 5; k++) (ctx.beginPath(), ctx.arc(tx + Math.cos(k * 1.26 + t / 90) * pr, ty + Math.sin(k * 1.26 + t / 90) * pr, pr * 0.75, 0, Math.PI * 2), ctx.fill());
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffe066';
        ctx.beginPath();
        ctx.arc(tx, ty, pr * 0.6, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#8ee06a';
        ctx.beginPath();
        ctx.ellipse(tx, ty, R(0.008), R(0.005), -0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // 정원 개미: 언덕 ↔ 꽃, 잎을 물고 돌아온다
    plants.forEach(([bx, by], pi) => {
      for (let k = 0; k < 2; k++) {
        const u = ((t * 0.006 + k * 0.5 + pi * 0.3) % 1) * 2, back = u > 1, f = back ? 2 - u : u;
        const x = ex + (bx - ex) * f, y = ey + (by - ey) * f, ang = Math.atan2(by - ey, bx - ex) + (back ? Math.PI : 0);
        drawAnt(ctx, x, y - 1, ang, R(0.0075), t + k * 9, back ? '#6fcf4f' : undefined);
      }
    });
  }
  // ── 유리·나무틀 ──
  {
    // 흙 위로 솟은 앞유리
    ctx.fillStyle = 'rgba(210,235,255,.12)';
    ctx.fillRect(X(X0), Y(GT), X(X1 - X0), Y(Y0 - GT));
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(X(X0), Y(GT));
    ctx.lineTo(X(X1), Y(GT));
    ctx.lineTo(X(X1 + DX), Y(GT + DY));
    ctx.lineTo(X(X0 + DX), Y(GT + DY));
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(X(X1 + DX), Y(GT + DY));
    ctx.lineTo(X(X1 + DX), Y(Y1 + DY));
    ctx.stroke();
    // 유리 반사 줄
    ctx.save();
    ctx.beginPath();
    ctx.rect(X(X0), Y(GT), X(X1 - X0), Y(Y1 - GT));
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,.09)';
    for (const [a, b] of [[0.12, 0.09], [0.3, 0.035], [0.62, 0.06]]) {
      ctx.beginPath();
      ctx.moveTo(X(a), Y(GT));
      ctx.lineTo(X(a + b), Y(GT));
      ctx.lineTo(X(a + b - 0.32), Y(Y1));
      ctx.lineTo(X(a - 0.32), Y(Y1));
      ctx.fill();
    }
    ctx.restore();
    // 나무 기둥 둘
    for (const px of [X0 - 0.024, X1]) {
      const wg = ctx.createLinearGradient(X(px), 0, X(px + 0.024), 0);
      wg.addColorStop(0, '#c48a4d');
      wg.addColorStop(0.5, '#a36a35');
      wg.addColorStop(1, '#7c4f26');
      ctx.fillStyle = wg;
      ctx.fillRect(X(px), Y(GT - 0.012), R(0.024), Y(Y1 - GT + 0.02));
      ctx.fillStyle = 'rgba(60,30,10,.3)';
      for (let k = 0; k < 5; k++) ctx.fillRect(X(px) + R(0.006 + 0.003 * (k % 3)), Y(GT + 0.1 + k * 0.14), 1, Y(0.05));
      ctx.fillStyle = '#d9b48a';
      ctx.beginPath();
      ctx.arc(X(px + 0.012), Y(GT + 0.004), R(0.005), 0, Math.PI * 2);
      ctx.arc(X(px + 0.012), Y(Y1 - 0.01), R(0.005), 0, Math.PI * 2);
      ctx.fill();
    }
    // 받침대 (윗면 + 앞면 + 옆면)
    const bx0 = X0 - 0.04, bx1 = X1 + 0.03, by0 = Y1 + 0.006, bh = 0.045;
    ctx.fillStyle = '#c99357';
    ctx.beginPath();
    ctx.moveTo(X(bx0), Y(by0));
    ctx.lineTo(X(bx1), Y(by0));
    ctx.lineTo(X(bx1 + DX), Y(by0 + DY * 0.6));
    ctx.lineTo(X(bx0 + DX), Y(by0 + DY * 0.6));
    ctx.fill();
    const fg = ctx.createLinearGradient(0, Y(by0), 0, Y(by0 + bh));
    fg.addColorStop(0, '#a5672f');
    fg.addColorStop(1, '#6e4120');
    ctx.fillStyle = fg;
    ctx.fillRect(X(bx0), Y(by0), X(bx1 - bx0), Y(bh));
    ctx.fillStyle = '#5a3418';
    ctx.beginPath();
    ctx.moveTo(X(bx1), Y(by0));
    ctx.lineTo(X(bx1 + DX), Y(by0 + DY * 0.6));
    ctx.lineTo(X(bx1 + DX), Y(by0 + bh + DY * 0.6));
    ctx.lineTo(X(bx1), Y(by0 + bh));
    ctx.fill();
    ctx.fillStyle = 'rgba(255,230,190,.25)';
    ctx.fillRect(X(bx0), Y(by0), X(bx1 - bx0), 1.5);
    // 이름표
    ctx.fillStyle = '#f3e2c0';
    ctx.beginPath();
    ctx.roundRect(X(0.38), Y(by0 + 0.01), X(0.24), Y(0.026), 3);
    ctx.fill();
    ctx.fillStyle = '#6e4120';
    ctx.font = `800 ${R(0.019)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`개미 마을 · ${s.day + 1}일째`, X(0.5), Y(by0 + 0.023));
  }
  // ── 비구름·빗줄기 ──
  if (rainy > 0) {
    ctx.globalAlpha = rainy;
    for (let k = 0; k < 4; k++) {
      const ccx = X(0.2 + k * 0.22 + Math.sin(t / 90 + k) * 0.02), ccy = Y(0.17 + (k % 2) * 0.03);
      ctx.fillStyle = s.raining ? '#7d8a99' : '#a9b6c4';
      ctx.beginPath();
      ctx.arc(ccx, ccy, R(0.05), 0, Math.PI * 2);
      ctx.arc(ccx + R(0.05), ccy + R(0.01), R(0.04), 0, Math.PI * 2);
      ctx.arc(ccx - R(0.05), ccy + R(0.012), R(0.035), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (s.raining > 0) {
      ctx.strokeStyle = 'rgba(190,225,255,.7)';
      ctx.lineWidth = 1.3;
      for (let k = 0; k < 60; k++) {
        const rx = hsh(k) * w, ry = Y(0.2) + ((hsh(k + 50) * Y(0.4) + t * 9) % Y(0.4));
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 2, ry + 8);
        ctx.stroke();
      }
    }
  }
  // 노을빛 + 방마다 켜지는 불빛
  if (p > 0.55) {
    ctx.fillStyle = `rgba(255,110,60,${(p - 0.55) * 0.3})`;
    ctx.fillRect(-10, -10, w + 20, h + 20);
  }
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < N; i++) {
    if (!s.room[i] || !s.conn[i]) continue;
    const x = CX(colOf(i)), y = CY(rowOf(i)), a = 0.18 + 0.35 * Math.max(0, p - 0.4) + 0.05 * Math.sin(t / 15 + i);
    const lg = ctx.createRadialGradient(x, y, 0, x, y, R(0.07));
    lg.addColorStop(0, `rgba(255,190,90,${a})`);
    lg.addColorStop(1, 'rgba(255,190,90,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(x - R(0.07), y - R(0.07), R(0.14), R(0.14));
  }
  ctx.globalCompositeOperation = 'source-over';
  // 첫 탭 안내: 입구 아래 설탕 방울이 빛난다
  if (s.day === 0 && s.taps === 0) {
    const gi = ENT + 2 * COLS;
    ctx.strokeStyle = '#ffe066';
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t / 6);
    ctx.beginPath();
    ctx.arc(CX(colOf(gi)), CY(rowOf(gi)), R(0.045) + Math.sin(t / 6) * 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  // ── 사건 → 손맛 ──
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const x = X(e.x), y = Y(e.y);
    if (e.kind === 'go') fx.ring(x, y, '#ffe066', R(0.06), 3), fx.kick(1.5), e.text && fx.pop(CX(colOf(ENT)), Y(Y0) - R(0.03), e.text, '#ffe066', 18);
    if (e.kind === 'dig') fx.burst(x, y, '#b98a5c', 10, 2.2, 2.2), fx.kick(1.5);
    if (e.kind === 'crumb') fx.burst(x, y, '#a67a52', 3, 1.4, 1.6);
    if (e.kind === 'room') fx.burst(x, y, e.col!, 34, 4.5, 3), fx.ring(x, y, e.col!, R(0.12), 5), fx.kick(5), fx.blink(e.col!, 0.12), fx.pop(x, y - R(0.05), e.text!, '#ffffff', 17);
    if (e.kind === 'born') fx.pop(x + R(0.02), y - R(0.03), e.text!, e.col!, 12), fx.burst(x, y, e.col!, 4, 1.5, 1.6);
    if (e.kind === 'sprout') fx.burst(x, y, '#9be15d', 16, 3, 2.4), fx.ring(x, y, '#9be15d', R(0.05), 3), fx.pop(x, y - R(0.05), e.text!, '#e9ffd6', 14);
    if (e.kind === 'peek') fx.ring(x, y, e.col!, R(0.06), 3), fx.pop(x, y - R(0.04), e.text!, e.col!, 14);
    if (e.kind === 'rainwarn') fx.pop(w / 2, y, e.text!, e.col!, 17);
    if (e.kind === 'rain') fx.blink('#9cc8ff', 0.15), fx.kick(2);
    if (e.kind === 'drown') fx.burst(x, y, '#7cc7ff', 18, 3, 2.5), fx.pop(x, y - R(0.04), e.text!, e.col!, 14), fx.kick(4);
    if (e.kind === 'wetfungus') fx.burst(x, y, '#b8f28a', 16, 3, 2.4), fx.pop(x, y - R(0.04), e.text!, e.col!, 14);
    if (e.kind === 'pocket') fx.burst(x, y, '#7cc7ff', 30, 4.5, 3), fx.ring(x, y, '#7cc7ff', R(0.12), 5), fx.kick(7), fx.pop(x, y - R(0.05), e.text!, e.col!, 15);
    if (e.kind === 'molewarn') fx.pop(x + (x < w / 2 ? R(0.12) : -R(0.12)), y - R(0.035), e.text!, e.col!, 15), fx.kick(3);
    if (e.kind === 'molehit') fx.burst(x, y, '#a67a52', 26, 4, 3), fx.kick(8), fx.pop(x, y - R(0.04), e.text!, e.col!, 15), fx.blink('#ffb08a', 0.12);
    if (e.kind === 'loose') fx.burst(x, y, '#a67a52', 12, 3, 2.5), fx.kick(3);
    if (e.kind === 'rock') fx.pop(x, y - R(0.04), e.text!, e.col!, 13), fx.kick(2);
    if (e.kind === 'here') fx.ring(x, y, '#ffffff', R(0.04), 2);
    if (e.kind === 'clear') fx.burst(w / 2, y, '#ffe066', 60, 6, 3.2), fx.burst(w / 2, y, '#9be15d', 30, 5, 3), fx.ring(w / 2, y, '#ffe066', R(0.45), 8), fx.blink('#fff6c8', 0.3), fx.pop(w / 2, y, e.text!, '#ffffff', 24);
    if (e.kind === 'season') fx.pop(w / 2, y, e.text!, '#ffe066', 20), fx.burst(w / 2, y, '#ff8fb1', 50, 7, 3);
    if (e.kind === 'fail') fx.kick(8), fx.blink(th.hot, 0.25), fx.pop(w / 2, y, e.text!, th.hot, 19);
    if (e.kind === 'stage') fx.pop(w / 2, y, e.text!, '#ffffff', 19);
    if (e.kind === 'new') fx.pop(w / 2, y, e.text!, th.accent, 14);
  }
  fx.memo.t = s.t;
  ctx.restore();
  // ── HUD ──
  const hb = R(0.085);
  ctx.fillStyle = 'rgba(43,29,20,.78)';
  ctx.fillRect(0, 0, w, hb);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = th.ink;
  ctx.font = `900 ${R(0.043)}px system-ui, sans-serif`;
  ctx.fillText(`${s.day + 1}일째 · 🐜 ${Math.floor(s.ants)}/${s.goal}`, 10, hb * 0.42);
  ctx.fillStyle = '#ffe066';
  ctx.font = `800 ${R(0.032)}px system-ui, sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillText(`★ ${s.stars}`, w - 10, hb * 0.42);
  ctx.fillStyle = th.hot;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)), w - 10 - ctx.measureText(`★ ${s.stars}`).width - 10, hb * 0.42);
  // 개미 수 막대
  ctx.fillStyle = 'rgba(255,255,255,.15)';
  ctx.fillRect(10, hb * 0.8, w - 20, 4);
  ctx.fillStyle = th.accent;
  ctx.fillRect(10, hb * 0.8, (w - 20) * Math.min(1, s.ants / s.goal), 4);
  // 아래 띠: 해 시계 + 다음 일
  const fb = R(0.075);
  ctx.fillStyle = 'rgba(43,29,20,.78)';
  ctx.fillRect(0, h - fb, w, fb);
  const bx = 12, bw = R(0.3), by = h - fb / 2;
  ctx.fillStyle = 'rgba(255,255,255,.15)';
  ctx.fillRect(bx, by - 2, bw, 4);
  ctx.fillStyle = p > 0.6 ? '#ff9a66' : '#ffe066';
  ctx.fillRect(bx, by - 2, bw * (1 - p), 4);
  ctx.font = `${R(0.032)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('☀️', bx + bw * (1 - p), by);
  let msg = '';
  if (s.rainV && s.dt >= s.rainAt - RAIN_WARN) msg = '☔ 비! 가장 깊은 굴부터 차요';
  else if (s.mole && s.dt >= s.mole.at - MOLE_WARN && s.dt < s.mole.at + 80) msg = `🐾 두더지가 ${s.mole.row + 1}번째 줄로!`;
  else if (s.target >= 0) msg = '개미들이 굴을 파는 중…';
  else if (s.pause === 0) msg = '👆 다음에 팔 곳을 톡!';
  ctx.textAlign = 'left';
  ctx.fillStyle = th.ink;
  ctx.font = `800 ${R(0.032)}px system-ui, sans-serif`;
  ctx.fillText(msg, bx + bw + 14, by);
  if (s.day === 0 && s.taps === 0 && s.t > 20) {
    ctx.textAlign = 'center';
    ctx.font = `900 ${R(0.045)}px system-ui, sans-serif`;
    const tx = '👆 흙을 톡! 개미가 그쪽으로 굴을 파요', tw2 = ctx.measureText(tx).width;
    ctx.fillStyle = 'rgba(43,29,20,.7)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw2 / 2 - 10, Y(0.21) - R(0.035), tw2 + 20, R(0.07), R(0.03));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(tx, w / 2, Y(0.21));
  }
}

// ───────────────────────────── 봇 ─────────────────────────────
const dumbAt = new WeakMap<object, number>();
/** 봇: 아무 데나, 아무 때나 톡 */
export const antfarmRandom: Bot<AntState> = {
  name: '아무 데나 톡',
  act(s, rng) {
    const next = dumbAt.get(s) ?? 30 + Math.floor(rng() * 90);
    if (s.t < next) return { tap: false, dir: 0, pointer: null };
    dumbAt.set(s, s.t + 40 + Math.floor(rng() * 140));
    return { tap: false, dir: 0, pointer: { x: rng(), y: rng() } };
  },
};

/** 남은 비 횟수 (τ 이후) */
function rainsAfter(s: AntState, tau: number) {
  if (!s.rainV) return 0;
  let n = 0;
  for (let at = s.rainAt; at <= s.T * 60; at += RAIN_P) if (at >= tau) n++;
  return n;
}
/** 비 한 번에 잃는 것 (잠기는 방들). 버섯은 오히려 이득 */
function rainLoss(kind: number[], room: Room[], V: number) {
  let v = 0;
  for (const i of floodCells(kind, ZERO, V)) v += room[i] === 'fungus' ? -3.5 : room[i] === 'seed' ? 4 : room[i] ? 2 : 0;
  return v;
}
const ZERO = new Uint8Array(N);

interface Cand { i: number; v: number; ticks: number; kind: number[]; room: Room[]; ants: number }
/** 지금 판(kind·room)에서 갈 만한 곳들의 값어치 — 얻는 개미 + 비 피해가 줄어드는 만큼, 걸리는 시간으로 나눠 비교 */
function candidates(s: AntState, kind: number[], room: Room[], ants: number, now: number): Cand[] {
  const left = s.T * 60 - now, { d, prev } = dijkstra(kind), rt = rate(ants), out: Cand[] = [];
  const conn = new Uint8Array(N);
  for (const i of reach(kind)) conn[i] = 1;
  const rains = s.rainV ? rainsAfter(s, now) : 0, base = rains ? rainLoss(kind, room, s.rainV) : 0;
  const m = s.mole;
  for (let i = 0; i < N; i++) {
    if (kind[i] === ROCK || d[i] === Infinity || conn[i]) continue;
    const r0 = s.res[i] && kind[i] !== DUG ? (s.res[i] === 'mystery' ? 'mystery' : s.res[i]) : '';
    const reconnect = kind[i] === DUG && !!room[i];
    if (!r0 && !reconnect && !rains) continue;
    const ch = chainTo(prev, i);
    let work = 0;
    for (const k of ch) work += COST[kind[k]];
    const ticks = work / rt + 4, arrive = now + ticks, rem = left - ticks;
    if (rem <= 0) continue;
    const k2 = kind.slice(), rm2 = room.slice();
    for (const k of ch) if (k2[k] !== DUG) k2[k] = DUG;
    let g = 0, newRoom: Room = '';
    if (r0 === 'sugar') (g = sugarAmt(rowOf(i)) * 1.15), (newRoom = 'sugar');
    else if (r0 === 'honey') (g = 7 * 1.15), (newRoom = 'honey');
    else if (r0 === 'mystery') g = 2.2;
    else if (r0 === 'pocket') g = -3;
    else if (r0 === 'seed') (g = Math.max(0, (rem - SPROUT) / SEED_P) * 0.9), (newRoom = 'seed');
    else if (r0 === 'fungus') (g = Math.max(0, rem / FUNG_P) * 0.9), (newRoom = 'fungus');
    if (reconnect) {
      // 끊긴 방들을 다시 잇기
      const c2 = new Uint8Array(N);
      for (const k of reach(k2)) c2[k] = 1;
      for (let k = 0; k < N; k++) if (room[k] && c2[k] && !conn[k]) g += room[k] === 'seed' ? rem / SEED_P : room[k] === 'fungus' ? rem / FUNG_P : 0.3;
    }
    if (newRoom) rm2[i] = newRoom;
    // 두더지 줄에 만든 방은 다음에 지나갈 때 무너진다
    if (m && rowOf(i) === m.row && newRoom) {
      let nx = m.at;
      while (nx < arrive) nx += MOLE_P;
      const life = nx - arrive;
      if (newRoom === 'seed') g = Math.max(0, (Math.min(rem, life) - SPROUT) / SEED_P) - 2;
      else if (newRoom === 'fungus') g = Math.min(rem, life) / FUNG_P - 2;
      else if (life < rem) g -= 2;
    }
    if (ants + (newRoom === 'sugar' || newRoom === 'honey' ? g / 1.15 : 0) >= s.goal) g += 40;
    let v = g;
    if (rains) {
      const after = rainsAfter(s, arrive);
      v += (base - rainLoss(k2, rm2, s.rainV)) * after;
    }
    if (v <= 0.05) continue;
    out.push({ i, v, ticks, kind: k2, room: rm2, ants: ants + (newRoom === 'sugar' || newRoom === 'honey' ? Math.round(g / 1.15) : 0) });
  }
  return out;
}

/** 두 수 앞까지: 갈 곳 하나를 판 뒤의 판에서 다음 갈 곳까지 더해 시간당 이득이 가장 큰 곳 */
function choose(s: AntState): { best: number; score: Map<number, number> } {
  const now = s.dt, first = candidates(s, s.kind, s.room, s.ants, now), score = new Map<number, number>();
  for (const c of first) score.set(c.i, c.v / (c.ticks + 25));
  const top = [...first].sort((a, b) => b.v / (b.ticks + 25) - a.v / (a.ticks + 25)).slice(0, 5);
  let best = -1, bv = 0;
  for (const c of top) {
    const nxt = candidates(s, c.kind, c.room, c.ants, now + c.ticks);
    let v2 = 0, t2 = 0, b2 = 0;
    for (const n of nxt) {
      const sc = n.v / (n.ticks + 25);
      if (sc > b2) (b2 = sc), (v2 = n.v), (t2 = n.ticks);
    }
    const total = (c.v + v2 * 0.9) / (c.ticks + t2 + 40);
    score.set(c.i, total);
    if (total > bv) (bv = total), (best = c.i);
  }
  return { best, score };
}

const brain = new WeakMap<object, { at: number; day: number; t: number }>();
/** 봇: 두 수 앞까지 내다보며 시간당 개미가 가장 많이 느는 곳을 판다 — 비가 오기 전엔 빈 굴을 더 깊게 파 물받이를 만들고, 두더지 줄엔 방을 두지 않는다 */
export const antfarmSmart: Bot<AntState> = {
  name: '개미 박사',
  act(s) {
    const no = { tap: false, dir: 0 as const, pointer: null };
    if (s.pause > 0 || s.down) return no;
    const m = brain.get(s) ?? { at: -999, day: -1, t: -1 };
    brain.set(s, m);
    const fresh = m.day !== s.day || m.t > s.dt;
    if (!fresh && s.target >= 0 && s.dt - m.at < 90) return no;
    if (!fresh && s.target < 0 && s.dt - m.at < 6) return no;
    m.at = s.dt;
    m.day = s.day;
    m.t = s.dt;
    const { best, score } = choose(s);
    if (best < 0 || best === s.target) return no;
    if (s.target >= 0 && (score.get(best) ?? 0) < 1.25 * (score.get(s.target) ?? 0)) return no;
    return { tap: false, dir: 0, pointer: { x: cx(colOf(best)), y: cy(rowOf(best)) / A } };
  },
};
