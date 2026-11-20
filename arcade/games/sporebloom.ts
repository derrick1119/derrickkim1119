/**
 * 🍄 포자 숲 퍼뜨리기 (37라운드: 살아 움직이는 세계 — 톡) — 퍼뜨리기 × 땅따먹기.
 * 세상: 3/4 시점 작은 숲 바닥(흙·낙엽·통나무·돌·물웅덩이). 바람은 저절로 불고 천천히 돈다(풀잎·꽃가루가 바람결을 보여 줌).
 *   내 버섯은 저절로 자라 다 크면 통통 부풀어 반짝이고, 오래 둘수록 더 부푼다(최대 두 배 힘). 회색 곰팡이는 저절로 번진다.
 * 손짓 하나(톡): 다 자란 버섯을 톡 → 퐁! 포자 구름이 바람을 타고 흩날려, 내려앉은 흙·통나무마다 버섯이 쏙쏙 돋는다.
 *   덜 자란 버섯은 '아직이야!'(톡을 안 씀). 많이 부푼 버섯일수록 포자가 많고 멀리 간다.
 * 곰팡이와 맞닿은 곳: 서로 밀고 당기다 센 쪽(다 자라 부푼 버섯 / 오래된 곰팡이)이 '뿅' 밀어낸다. 포자가 곰팡이에 떨어지면 곰팡이가 약해진다.
 * 판(7): 해가 지기 전에 버섯 N송이. 못 채우면 하트 −1, 그 판 다시. 1판은 첫 톡부터 해가 움직인다(손 안 대면 아무것도 안 잃음).
 * 펼쳐짐(하는 일이 바뀐다): 1 바람(바람 위쪽 버섯을 톡) → 2 곰팡이(맞닿은 곳은 큰 버섯으로 버티기) → 3 비구름(비 맞은 곳이 쑥쑥 — 비 쪽으로 뿌리기)
 *   → 4 물·돌(작게 터뜨리면 물에 빠짐 — 크게 모아 건너뛰기, 물 위 통나무 징검다리) → 5 바람 바뀜 예보(바뀔 때까지 기다렸다 터뜨리기)
 *   → 6 큰 버섯(늦게 크지만 멀리 — 물 건너 섬) → 7 숲 잔치(양쪽 곰팡이·비·바람 바뀜).
 * 별(판마다 하나씩 늘어남): 버섯 N송이 피우기 / 곰팡이보다 많이(또는 섬에도 버섯) / N번만 터뜨리기.
 * 웃음: 버섯마다 얼굴(자랄 땐 쿨쿨, 다 크면 반짝 눈, 터질 땐 볼 빵빵), 곰팡이는 심술 눈썹, 밀려나면 어질어질 '뿅'. 달팽이·반딧불 구경꾼.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5;
// ───────────────────────────── 판 (칸 좌표 → 화면: 가로 폭 1 단위) ─────────────────────────────
const COLS = 7, ROWS = 9, NC = COLS * ROWS;
const BX = 0.035, CW = 0.93 / COLS, BY = 0.29, RH = 0.098, ZH = 0.085;
const SOIL = 0, LOG = 1, WATER = 2, STONE = 3;
const NONE = 0, MINE = 1, MOLD = 2;
/** 초당: 버섯이 다 자람(3.5초) · 다 큰 뒤 부풂(4.5초에 최대) · 큰 버섯 · 곰팡이 자람 */
const GROW = 1 / 4.5, SWELL = 1 / 4.5, GGROW = 1 / 6, GSWELL = 1 / 6, MOLD_GROW = 1 / 5;
const TAU = Math.PI * 2;
const fr = (q: number) => q - Math.floor(q);
const hsh = (k: number) => fr(Math.sin(k * 127.1 + 311.7) * 43758.5453);
const colOf = (i: number) => i % COLS, rowOf = (i: number) => (i / COLS) | 0;
const bx2x = (bx: number) => BX + bx * CW, by2y = (by: number) => BY + by * RH;
const cellX = (i: number) => bx2x(colOf(i) + 0.5), cellY = (i: number) => by2y(rowOf(i) + 0.5);
const KNUM = ['영', '한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉', '열'];

// ───────────────────────────── 판 정의 ─────────────────────────────
type Key = 'wind' | 'mold' | 'rain' | 'water' | 'shift' | 'giant' | 'fest';
type StarK = 'goal' | 'more' | 'par' | 'island';
interface StageDef {
  key: Key; name: string; news: string; hint: string; spot: string; map: string[];
  wind: number; sway: number; speed: number; goal: number; time: number; grace: number; spread: number; par: number; stars: StarK[];
  rain?: number; shift?: boolean;
}
const RT = 0, DN = Math.PI / 2, UP = -Math.PI / 2;
/** 지도: . 흙 · L 통나무 · W 물 위 통나무 · ~ 물 · o 돌 · M 다 큰 버섯 · m 어린 버섯 · X 곰팡이 · x 어린 곰팡이 · G 큰 버섯 · i 섬(흙) */
export const STAGES: StageDef[] = [
  {
    key: 'wind', name: '첫 바람', news: '', hint: '바람 위쪽 버섯을 톡! 포자가 바람을 타요', spot: '',
    map: ['.......', '..o....', '.....~~', 'm..LLL.', '.M.....', 'm...o..', '.......', '..LL...', '.....~.'],
    wind: RT, sway: 0.3, speed: 3.8, goal: 13, time: 45, grace: 99, spread: 99, par: 9, stars: ['goal'],
  },
  {
    key: 'mold', name: '회색 곰팡이', news: '곰팡이가 번져요 — 다 큰 버섯은 밀어내요', hint: '맞닿은 곳엔 큰 버섯을 남겨 둬요', spot: '곰팡이',
    map: ['.......', '....o..', '.M...X.', '..LL.Xx', '.......', '.o.....', '.m..~~.', '.M..L..', '.......'],
    wind: RT, sway: 0.45, speed: 3.8, goal: 24, time: 30, grace: 9, spread: 2.2, par: 9, stars: ['goal', 'more'],
  },
  {
    key: 'rain', name: '지나가는 비구름', news: '비 맞은 곳의 버섯은 쑥쑥 자라요', hint: '비구름 쪽으로 포자를 보내요', spot: '비구름',
    map: ['..M..M.', '.......', '.o..LL.', '......o', '.......', '~~.....', '...o...', 'xX.LL..', 'XXx....'],
    wind: DN, sway: 0.45, speed: 3.5, goal: 28, time: 30, grace: 5, spread: 1.8, par: 6, stars: ['goal', 'more', 'par'], rain: 4,
  },
  {
    key: 'water', name: '물웅덩이 건너기', news: '물·돌엔 못 자라요 — 크게 부풀려 건너요', hint: '작게 터뜨리면 물에 퐁당 — 통나무를 디뎌요', spot: '물 위 통나무',
    map: ['.....Xx', '.o.....', '.....o.', '.......', '~~~~~~~', '~~WWW~~', '....o..', '..M..M.', '...m...'],
    wind: UP, sway: 0.45, speed: 4, goal: 25, time: 28, grace: 5, spread: 1.8, par: 6, stars: ['goal', 'more', 'par'],
  },
  {
    key: 'shift', name: '바뀌는 바람', news: '바람이 곧 바뀌어요 — 화살표 예보를 봐요', hint: '좋은 바람이 올 때까지 아껴 둬요', spot: '바람 예보',
    map: ['.......', '.M..o..', '.......', '..LL...', '.....X.', 'o....x.', '.......', '..~~...', '.m.~.LL'],
    wind: RT, sway: 0.1, speed: 3.8, goal: 27, time: 30, grace: 5, spread: 2.0, par: 6, stars: ['goal', 'more', 'par'], shift: true,
  },
  {
    key: 'giant', name: '큰 버섯', news: '큰 버섯은 늦게 크지만 아주 멀리 터져요', hint: '물 건너 섬까지 — 큰 버섯을 아껴 둬요', spot: '큰 버섯',
    map: ['....~ii', '....~ii', '.o..~~i', '.....~~', '..LL...', '....o..', 'Xx.....', '.......', 'G..m...'],
    wind: -Math.PI / 4, sway: 0.45, speed: 3.7, goal: 31, time: 28, grace: 5, spread: 1.6, par: 5, stars: ['goal', 'island', 'par'],
  },
  {
    key: 'fest', name: '숲 잔치', news: '양쪽에서 곰팡이가 와요 — 비·바람도 함께', hint: '어느 쪽부터 막을지 골라요', spot: '',
    map: ['X.....x', 'x..o..X', '....~~.', '..LL~..', '.......', '...M...', '.o...LL', '~~..o..', 'G..m...'],
    wind: UP, sway: 0.3, speed: 3.7, goal: 30, time: 30, grace: 5, spread: 1.8, par: 6, stars: ['goal', 'more', 'par'], rain: 4, shift: true,
  },
];
export const STAGE_COUNT = STAGES.length;
const STAR_PTS = [0, 50, 200, 700];

// ───────────────────────────── 상태 ─────────────────────────────
interface Fly { x: number; y: number; z: number; vx: number; vy: number; vz: number; wx: number; wy: number }
interface Spore extends Fly { age: number; dur: number; land: number; lx: number; ly: number; b: number; hue: number }
interface Burst { id: number; cell: number; n: number; left: number; fresh: number; wowed: boolean; power: number; giant: boolean; sx: number; sy: number }
interface Ev { t: number; kind: string; x: number; y: number; text?: string; col?: string; v?: number; i?: number }
export interface SporeState {
  rng: Rng; seed: number; t: number; st: number; stage: number; phase: 'play' | 'result'; pt: number; def: StageDef; flip: boolean;
  type: Uint8Array; wet: Uint8Array; isl: Uint8Array; own: Uint8Array; lv: Float64Array; pw: Float64Array; cm: Float64Array; sp: Float64Array; sn: Float64Array;
  born: Int32Array; hue: Uint8Array; hit: Int32Array;
  giant: number; windA: number; shifts: { t: number; a: number }[]; rainPh: number;
  sunOn: boolean; sun: number; T: number; taps: number; mine: number; mold: number; islMine: number; islN: number;
  spores: Spore[]; bursts: Burst[]; burstId: number;
  hearts: number; stars: number; got: number; starOk: boolean[]; pts: number; ok: boolean; why: string; won: boolean; dead: boolean; tries: number; again: boolean;
  seen: Set<string>; events: Ev[]; banner: { head: string; sub: string; t: number } | null;
  spot: { x: number; y: number; rx: number; ry: number; label: string; t: number } | null;
  down: boolean; firstTap: number; wowN: number; poke: { i: number; t: number; text: string } | null; lastTap: number;
}
const ev = (s: SporeState, kind: string, x: number, y: number, text?: string, col?: string, v?: number) => s.events.push({ t: s.t, kind, x, y, text, col, v });
const see = (s: SporeState, key: string) => s.seen.add(key);

// ───────────────────────────── 바람 · 비 (판 시간의 순수 함수 — 봇이 앞을 내다본다) ─────────────────────────────
const angDiff = (a: number, b: number) => {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
};
export function windAt(s: SporeState, st: number): { a: number; v: number } {
  const d = s.def, sec = st / 60;
  let a = s.windA;
  for (const sh of s.shifts) {
    if (st < sh.t) break;
    const k = Math.min(1, (st - sh.t) / 50);
    a += angDiff(a, sh.a) * k * k * (3 - 2 * k);
  }
  a += d.sway * Math.sin(sec * 0.7 + (s.seed % 7));
  return { a, v: d.speed * (1 + 0.12 * Math.sin(sec * 1.13 + 1.7)) };
}
export const nextShift = (s: SporeState, st: number) => s.shifts.find((q) => q.t > st) ?? null;
export function rainAt(s: SporeState, st: number): { x: number; y: number } | null {
  if (s.def.rain === undefined) return null;
  let x = -2.5 + fr(((st / 60) * 0.55 + s.rainPh) / 13) * 13;
  if (s.flip) x = COLS - x;
  return { x, y: s.def.rain + 0.5 };
}
const inRain = (r: { x: number; y: number } | null, i: number) => !!r && ((colOf(i) + 0.5 - r.x) / 2.1) ** 2 + ((rowOf(i) + 0.5 - r.y) / 1.6) ** 2 <= 1;

// ───────────────────────────── 포자 (결정적 비행: 같은 힘·바람 → 같은 자리) ─────────────────────────────
interface Shot { dx: Float64Array; dy: Float64Array; dur: Int32Array; n: number }
const plumes = new Map<number, Shot>();
const qP = (p: number) => Math.round(Math.min(2, Math.max(1, p)) * 10);
const qA = (a: number) => ((Math.round(a / (Math.PI / 36)) % 72) + 72) % 72;
const qV = (v: number) => Math.max(1, Math.min(60, Math.round(v * 5)));
/** 포자 수: 막 다 큰 버섯은 한두 알, 빵빵하게 부푼 버섯은 열다섯 알 (아껴 둘수록 훨씬 크게) */
const sporeCount = (pq: number, giant: boolean) => (giant ? Math.round(10 + 22 * (pq / 10 - 1) ** 1.4) : Math.round(1 + 14 * (pq / 10 - 1) ** 1.6));
function initSpore(k: number, pq: number, aq: number, vq: number, giant: boolean): Fly {
  const p = pq / 10, a = aq * (Math.PI / 36), v = vq / 5;
  const ga = k * 2.39996323 + 0.7, hv = (0.5 + 1.1 * fr(k * 0.618034 + 0.31)) * (0.7 + 0.3 * p);
  const vz = (0.75 + 2.25 * fr(k * 0.381966 + 0.13)) * (0.6 + 0.4 * p) * (giant ? 1.5 : 1);
  const da = (fr(k * 0.754878 + 0.42) - 0.5) * 0.95, wv = v * (0.85 + 0.3 * fr(k * 0.56984 + 0.77)) * (giant ? 1.15 : 1);
  return { x: 0, y: 0, z: giant ? 0.9 : 0.35, vx: Math.cos(ga) * hv, vy: Math.sin(ga) * hv, vz, wx: Math.cos(a + da) * wv, wy: Math.sin(a + da) * wv };
}
function stepFly(o: Fly) {
  o.vx += (o.wx - o.vx) * 0.09;
  o.vy += (o.wy - o.vy) * 0.09;
  o.vz = Math.max(o.vz - 0.11, -2.4);
  o.x += o.vx / 60;
  o.y += o.vy / 60;
  o.z += o.vz / 60;
}
/** 힘·바람이 같으면 포자마다 내려앉는 자리(터진 칸 기준)와 걸리는 틱 — 실제 비행과 똑같은 계산 */
function plumeOf(pq: number, aq: number, vq: number, giant: boolean): Shot {
  const key = ((pq * 72 + aq) * 64 + vq) * 2 + (giant ? 1 : 0);
  let sh = plumes.get(key);
  if (sh) return sh;
  const n = sporeCount(pq, giant);
  sh = { dx: new Float64Array(n), dy: new Float64Array(n), dur: new Int32Array(n), n };
  for (let k = 0; k < n; k++) {
    const o = initSpore(k, pq, aq, vq, giant);
    let t = 0;
    while (o.z > 0 && t < 600) stepFly(o), t++;
    sh.dx[k] = o.x;
    sh.dy[k] = o.y;
    sh.dur[k] = t;
  }
  plumes.set(key, sh);
  return sh;
}

// ───────────────────────────── 판 만들기 ─────────────────────────────
function newStage(s: SporeState) {
  const d = STAGES[s.stage], sr = mulberry32(s.seed * 31 + s.stage * 7919 + 17);
  s.def = d;
  s.flip = s.stage > 0 && sr() < 0.5;
  s.type = new Uint8Array(NC);
  s.wet = new Uint8Array(NC);
  s.isl = new Uint8Array(NC);
  s.own = new Uint8Array(NC);
  s.lv = new Float64Array(NC);
  s.pw = new Float64Array(NC);
  s.cm = new Float64Array(NC);
  s.sp = new Float64Array(NC);
  s.sn = new Float64Array(NC);
  s.born = new Int32Array(NC).fill(-999);
  s.hue = new Uint8Array(NC);
  s.hit = new Int32Array(NC).fill(-999);
  s.giant = -1;
  s.islN = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const ch = d.map[r][s.flip ? COLS - 1 - c : c], i = r * COLS + c;
      s.hue[i] = Math.floor(hsh(i * 3.7 + s.seed * 0.013) * 5);
      if (ch === 'L') s.type[i] = LOG;
      if (ch === 'W') (s.type[i] = LOG), (s.wet[i] = 1);
      if (ch === '~') s.type[i] = WATER;
      if (ch === 'o') s.type[i] = STONE;
      if (ch === 'i') (s.isl[i] = 1), s.islN++;
      if (ch === 'M') (s.own[i] = MINE), (s.lv[i] = 1), (s.pw[i] = s.stage === 0 ? 2 : 1), (s.sn[i] = s.stage === 0 ? 4.9 : 0);
      if (ch === 'm') (s.own[i] = MINE), (s.lv[i] = 0.5), (s.pw[i] = 1);
      if (ch === 'G') (s.own[i] = MINE), (s.lv[i] = 0.75), (s.pw[i] = 1), (s.giant = i);
      if (ch === 'X') (s.own[i] = MOLD), (s.lv[i] = 1), (s.sp[i] = sr() * 0.6);
      if (ch === 'x') (s.own[i] = MOLD), (s.lv[i] = 0.5), (s.sp[i] = sr() * 0.4);
    }
  }
  s.windA = s.flip ? Math.PI - d.wind : d.wind;
  s.shifts = [];
  if (d.shift) {
    let a = s.windA;
    for (let k = 0; k < 6; k++) {
      const turn = [Math.PI / 2, -Math.PI / 2, Math.PI][Math.floor(sr() * 3)];
      a += turn;
      s.shifts.push({ t: Math.round((6.5 + k * 7) * 60), a });
    }
  }
  s.rainPh = 4;
  s.st = 0;
  s.sunOn = s.stage > 0;
  s.sun = 0;
  s.T = d.time * 60;
  s.taps = 0;
  s.spores = [];
  s.bursts = [];
  s.phase = 'play';
  s.pt = 0;
  s.got = 0;
  s.starOk = d.stars.map(() => false);
  s.poke = null;
  count(s);
  see(s, d.key);
  if (s.again) s.banner = { head: `다시! ${s.stage + 1}판 · ${d.name}`, sub: d.hint, t: s.t };
  else s.banner = s.stage === 0 ? null : { head: `${s.stage + 1}판 · ${d.name}`, sub: `NEW  ${d.news}`, t: s.t };
  s.spot = null;
  if (!s.again && d.spot) {
    if (d.key === 'mold') {
      const m = [...Array(NC).keys()].filter((i) => s.own[i] === MOLD);
      const mx = m.reduce((a, i) => a + cellX(i), 0) / m.length, my = m.reduce((a, i) => a + cellY(i), 0) / m.length;
      s.spot = { x: mx, y: my, rx: 0.13, ry: 0.11, label: d.spot, t: s.t };
    }
    if (d.key === 'rain') {
      const r = rainAt(s, 0)!;
      s.spot = { x: bx2x(r.x), y: by2y(r.y), rx: 0.2, ry: 0.15, label: d.spot, t: s.t };
    }
    if (d.key === 'water') {
      const m = [...Array(NC).keys()].filter((i) => s.wet[i]);
      s.spot = { x: m.reduce((a, i) => a + cellX(i), 0) / m.length, y: cellY(m[0]), rx: 0.2, ry: 0.07, label: d.spot, t: s.t };
    }
    if (d.key === 'shift') s.spot = { x: 0.105, y: 0.2, rx: 0.08, ry: 0.075, label: d.spot, t: s.t };
    if (d.key === 'giant' && s.giant >= 0) s.spot = { x: cellX(s.giant), y: cellY(s.giant) - 0.05, rx: 0.1, ry: 0.11, label: d.spot, t: s.t };
  }
  s.again = false;
}

function count(s: SporeState) {
  let m = 0, g = 0, il = 0;
  for (let i = 0; i < NC; i++) {
    if (s.own[i] === MINE) (m++, s.isl[i] && il++);
    else if (s.own[i] === MOLD) g++;
  }
  s.mine = m;
  s.mold = g;
  s.islMine = il;
}

const growable = (s: SporeState, i: number) => s.type[i] === SOIL || s.type[i] === LOG;
function nbrs(i: number, out: number[]) {
  out.length = 0;
  const c = colOf(i), r = rowOf(i);
  if (c > 0) out.push(i - 1);
  if (c < COLS - 1) out.push(i + 1);
  if (r > 0) out.push(i - COLS);
  if (r < ROWS - 1) out.push(i + COLS);
  return out;
}
const NB: number[] = [], NB2: number[] = [];
/** 버섯의 버티는 힘: 어린 것은 약하고, 다 커서 부풀수록 세다 (큰 버섯은 1.5배) */
export const shroomPow = (s: SporeState, i: number) => (s.lv[i] < 1 ? 0.25 + 0.6 * s.lv[i] : 1 + 0.6 * (s.pw[i] - 1)) * (i === s.giant ? 1.5 : 1);
const moldPow = (s: SporeState, i: number) => {
  let n = 0;
  for (const j of nbrs(i, NB2)) if (s.own[j] === MOLD) n++;
  return 0.3 + 0.75 * s.lv[i] + 0.08 * n;
};

function sprout(s: SporeState, i: number, hue: number, lv: number) {
  s.own[i] = MINE;
  s.lv[i] = lv;
  s.pw[i] = 1;
  s.sn[i] = 0;
  s.cm[i] = 0;
  s.born[i] = s.t;
  s.hue[i] = hsh(i * 1.3 + s.t * 0.01) < 0.7 ? hue : Math.floor(hsh(i + s.t) * 5);
}

/** 저절로: 버섯이 자라고 부풀고, 곰팡이가 자라고 번지고, 맞닿은 곳에서 밀고 당긴다 */
function world(s: SporeState) {
  const d = s.def, rain = rainAt(s, s.st), grace = s.st < d.grace * 60;
  for (let i = 0; i < NC; i++) {
    const o = s.own[i];
    if (o === MINE) {
      const f = (s.type[i] === LOG ? 1.6 : 1) * (inRain(rain, i) ? 2.6 : 1), g = i === s.giant;
      if (s.lv[i] < 1) {
        s.lv[i] += ((g ? GGROW : GROW) * f) / 60;
        if (s.lv[i] >= 1) (s.lv[i] = 1), (s.pw[i] = 1), ev(s, 'ripe', cellX(i), cellY(i) - 0.04, '', '', i);
      } else if (s.pw[i] < 2) s.pw[i] = Math.min(2, s.pw[i] + ((g ? GSWELL : SWELL) * f) / 60);
      else if ((s.sn[i] += 1 / 60) >= 6) (s.sn[i] = 0), ev(s, 'sneeze', cellX(i), cellY(i) - 0.06, '에취!', '#fff4d0', i), see(s, 'sneeze');
    } else if (o === MOLD) {
      s.lv[i] = Math.min(1, s.lv[i] + (MOLD_GROW * (inRain(rain, i) ? 0.5 : 1)) / 60);
      if (s.lv[i] >= 0.5 && (s.sp[i] += (grace ? 0.2 : 1) / (d.spread * 60)) >= 1) {
        s.sp[i] = s.rng() * 0.35;
        const opts = nbrs(i, NB).filter((j) => s.own[j] === NONE && growable(s, j));
        if (opts.length) {
          const j = opts[Math.floor(s.rng() * opts.length)];
          s.own[j] = MOLD;
          s.lv[j] = 0.15;
          s.sp[j] = s.rng() * 0.35;
          s.cm[j] = 0;
          s.born[j] = s.t;
          ev(s, 'mold', cellX(j), cellY(j));
        }
      }
    }
  }
  if (grace) return;
  // 맞닿은 곳: 곰팡이 칸마다 옆 버섯과 힘겨루기 (게이지가 끝까지 가면 진 쪽이 '뿅')
  for (let i = 0; i < NC; i++) {
    if (s.own[i] !== MOLD) continue;
    let best = -1, bs = 0, weak = -1, ws = 99, n = 0;
    for (const j of nbrs(i, NB)) {
      if (s.own[j] !== MINE) continue;
      const p = shroomPow(s, j);
      n++;
      if (p > bs) (bs = p), (best = j);
      if (p < ws) (ws = p), (weak = j);
    }
    if (!n) {
      s.cm[i] *= 0.98;
      continue;
    }
    s.cm[i] += ((bs + 0.15 * (n - 1) - moldPow(s, i)) * 0.9) / 60;
    if (s.cm[i] >= 1) {
      sprout(s, i, s.hue[best], 0.3);
      s.hit[i] = s.t;
      ev(s, 'push', cellX(i), cellY(i) - 0.03, '뿅!', '#fff6a8', i);
      see(s, 'push');
    } else if (s.cm[i] <= -1) {
      s.cm[i] = 0;
      s.own[weak] = MOLD;
      s.lv[weak] = 0.35;
      s.sp[weak] = 0;
      s.cm[weak] = 0;
      s.born[weak] = s.t;
      s.hit[weak] = s.t;
      ev(s, 'pushed', cellX(weak), cellY(weak) - 0.03, '앗!', '#d8dde2', weak);
    }
  }
}

function burst(s: SporeState, i: number) {
  const giant = i === s.giant, pq = qP(s.pw[i]), w = windAt(s, s.st), aq = qA(w.a), vq = qV(w.v);
  const sh = plumeOf(pq, aq, vq, giant), cx = colOf(i) + 0.5, cy = rowOf(i) + 0.5, id = ++s.burstId;
  for (let k = 0; k < sh.n; k++) {
    const o = initSpore(k, pq, aq, vq, giant), lx = cx + sh.dx[k], ly = cy + sh.dy[k];
    const tc = Math.floor(lx), tr = Math.floor(ly);
    o.x = cx;
    o.y = cy;
    s.spores.push({ ...o, age: 0, dur: sh.dur[k], land: tc < 0 || tr < 0 || tc >= COLS || tr >= ROWS ? -1 : tr * COLS + tc, lx, ly, b: id, hue: s.hue[i] });
  }
  s.bursts.push({ id, cell: i, n: sh.n, left: sh.n, fresh: 0, wowed: false, power: pq / 10, giant, sx: 0, sy: 0 });
  s.events.push({ t: s.t, kind: 'burst', x: cellX(i), y: cellY(i) - (giant ? 0.1 : 0.06), text: pq >= 18 ? '퐁!!' : pq >= 14 ? '퐁!' : '퐁', col: String(s.hue[i]), v: (pq / 10) * (giant ? 1.6 : 1), i });
  if (giant) see(s, 'bigboom');
  s.lv[i] = giant ? 0.1 : 0.15;
  s.pw[i] = 1;
  s.sn[i] = 0;
  s.taps++;
  s.lastTap = s.t;
  s.sunOn = true;
  if (s.firstTap < 0) s.firstTap = s.t;
  if (s.banner && s.t - s.banner.t < 120) s.banner.t = s.t - 120;
}

function land(s: SporeState, sp: Spore) {
  const b = s.bursts.find((q) => q.id === sp.b);
  if (b) b.left--;
  const i = sp.land, x = bx2x(sp.lx), y = by2y(sp.ly);
  if (i < 0) return;
  if (s.type[i] === WATER) return void ev(s, 'splash', x, y);
  if (s.type[i] === STONE) return void ev(s, 'tink', x, y - 0.02);
  if (s.own[i] === NONE) {
    sprout(s, i, sp.hue, inRain(rainAt(s, s.st), i) ? 0.35 : 0.12);
    ev(s, 'sprout', cellX(i), cellY(i), '', '', sp.hue);
    if (b) {
      b.fresh++;
      b.sx += cellX(i);
      b.sy += cellY(i);
      if (!b.wowed && b.fresh >= 4) (b.wowed = true), s.wowN++, ev(s, 'wow', cellX(i), cellY(i) - 0.05, '쏙쏙쏙!', '#fff27a', b.fresh);
    }
  } else if (s.own[i] === MINE) {
    if (s.lv[i] < 1) s.lv[i] = Math.min(1, s.lv[i] + 0.08);
  } else {
    s.lv[i] -= 0.45;
    s.hit[i] = s.t;
    if (s.lv[i] <= 0.02) {
      sprout(s, i, sp.hue, 0.2);
      ev(s, 'push', cellX(i), cellY(i) - 0.03, '뿅!', '#fff6a8', i);
      see(s, 'push');
      if (b) (b.fresh++, (b.sx += cellX(i)), (b.sy += cellY(i)));
    } else ev(s, 'hit', cellX(i), cellY(i) - 0.02);
  }
}

function flySpores(s: SporeState) {
  for (const sp of s.spores) {
    stepFly(sp);
    sp.age++;
    if (sp.age >= sp.dur) land(s, sp);
  }
  if (s.spores.length) s.spores = s.spores.filter((sp) => sp.age < sp.dur);
  for (const b of s.bursts) if (b.left <= 0 && b.fresh >= 3) ev(s, 'tally', b.sx / b.fresh, b.sy / b.fresh - 0.06, `+${b.fresh}송이`, '#ffffff', b.fresh);
  if (s.bursts.length) s.bursts = s.bursts.filter((b) => b.left > 0);
}

/** 손가락 자리에서 가장 가까운 다 큰 버섯 (넉넉하게: 한 칸 거리 안이면 그 버섯) */
function pickRipe(s: SporeState, x: number, y: number): number {
  let best = -1, bd = 1e9;
  for (let i = 0; i < NC; i++) {
    if (s.own[i] !== MINE || s.lv[i] < 1) continue;
    const g = i === s.giant, dd = Math.hypot(cellX(i) - x, cellY(i) - (g ? 0.06 : 0.03) - y) - (g ? 0.04 : 0);
    if (dd < bd) (bd = dd), (best = i);
  }
  return bd < 0.12 ? best : -1;
}
function tapAt(s: SporeState, x: number, y: number) {
  const i = pickRipe(s, x, y);
  if (i >= 0) return burst(s, i);
  let near = -1, nd = 0.075;
  for (let j = 0; j < NC; j++) {
    if (s.own[j] === NONE) continue;
    const dd = Math.hypot(cellX(j) - x, cellY(j) - 0.025 - y);
    if (dd < nd) (nd = dd), (near = j);
  }
  if (near >= 0 && s.own[near] === MINE) {
    s.poke = { i: near, t: s.t, text: '아직이야!' };
    ev(s, 'poke', cellX(near), cellY(near) - 0.07, '아직이야!', '#fff0f4', near);
    see(s, 'early');
  } else if (near >= 0) {
    s.poke = { i: near, t: s.t, text: '메롱' };
    ev(s, 'poke', cellX(near), cellY(near) - 0.06, '메롱~', '#e8ecf0', near);
  } else if (y > BY && y < by2y(ROWS)) ev(s, 'rustle', x, y);
}

function finish(s: SporeState, ok: boolean, why: string) {
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  s.why = why;
  const d = s.def;
  if (ok) {
    s.starOk = d.stars.map((k) => (k === 'goal' ? true : k === 'more' ? s.mine > s.mold : k === 'par' ? s.taps <= d.par : s.islMine > 0));
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    const left = Math.max(0, (s.T - s.sun) / 60);
    s.pts += Math.round((50 + STAR_PTS[s.got] + s.mine + 6 * left) * (1 + 0.2 * s.stage));
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += 200 + s.hearts * 80);
    ev(s, 'clear', 0.5, 0.55, '', '', s.got);
  } else {
    s.hearts--;
    s.tries++;
    ev(s, 'fail', 0.5, 0.55, why);
  }
}

export const sporebloom: GameDef<SporeState> & { wows(s: SporeState): number } = {
  id: 'sporebloom',
  name: '🍄 포자 숲 퍼뜨리기',
  genes: ['spread', 'territory'],
  twist: '다 자란 버섯을 톡 하면 포자 구름이 지금 부는 바람을 타고 흩날려 내려앉은 자리마다 버섯이 쏙쏙 돋는데 — 바람은 저절로 돌고 버섯은 아껴 둘수록 크게 터져서, 언제·어느 버섯을 터뜨리느냐가 숲의 모양과 곰팡이와의 밀고 당기기를 바꾼다',
  rules: ['반짝이는 다 큰 버섯을 톡 → 포자가 바람을 타고 날아가 버섯이 돋아요.', '오래 둔 버섯일수록 크게 터져요. 해 지기 전에 목표만큼!', '회색 곰팡이와 맞닿으면 더 큰 쪽이 밀어내요.'],
  controls: 'touch',
  hint: '다 큰 버섯을 톡! / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '햇살 숲 바닥 디오라마 — 바람에 포자를 날려 버섯 밭 넓히기',
    mood: '나무 기둥 사이로 햇살이 비스듬히 드는 숲 바닥 한 조각. 낙엽·이끼·통나무·돌·물웅덩이 위로 풀잎과 꽃가루가 바람결을 따라 살랑이고, 알록달록 버섯이 저절로 통통 부푼다. 톡 하면 퐁! 포자 구름이 바람을 타고 흩날려 내려앉은 자리마다 버섯이 쏙쏙. 심술 난 회색 곰팡이와 맞닿은 곳은 서로 밀고 당기다 뿅. 해가 기울면 반딧불이 켜지고, 달팽이가 느릿느릿 구경한다.',
    palette: { bg: '#cfeccf', ink: '#3a2614', muted: '#8a6a48', accent: '#ff7a4a', hot: '#ff4a6a', soft: '#fff4dc' },
  },
  reveals: (s) => s.seen.size,
  guard: (s) => s.mine,
  cleared: (s) => (s.phase === 'result' && s.ok ? { stage: s.stage, got: s.got, of: s.starOk.length } : null),
  wows: (s) => s.wowN,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, st: 0, stage: 0, phase: 'play', pt: 0,
      hearts: 3, stars: 0, got: 0, starOk: [], pts: 0, ok: false, why: '', won: false, dead: false, tries: 0, again: false,
      seen: new Set<string>(), events: [], banner: null, spot: null, spores: [], bursts: [], burstId: 0,
      down: false, firstTap: -1, wowN: 0, poke: null, lastTap: -99,
    } as unknown as SporeState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    const p = inp.pointer ?? null, press = !!p && !s.down;
    s.down = !!p;
    s.t++;
    if (s.events.length > 80 || (s.events.length && s.t - s.events[0].t > 200)) s.events = s.events.filter((e) => s.t - e.t < 200);
    if (s.poke && s.t - s.poke.t > 50) s.poke = null;
    if (s.spot && s.t - s.spot.t > 230) s.spot = null;
    if (s.phase === 'result') {
      s.pt++;
      flySpores(s);
      if (s.pt >= (s.ok ? 150 : 140) || (press && s.pt > 45)) {
        if (s.ok) {
          if (s.won) s.dead = true;
          else s.stage++, newStage(s);
        } else if (s.hearts <= 0) s.dead = true;
        else (s.again = true), newStage(s);
      }
      return;
    }
    s.st++;
    if (s.sunOn) s.sun++;
    if (press) tapAt(s, p!.x, p!.y * A);
    world(s);
    flySpores(s);
    count(s);
    if (s.mine >= s.def.goal) finish(s, true, '');
    else if (s.sunOn && s.sun >= s.T) finish(s, false, '해가 졌어요!');
    else if (s.mine === 0 && !s.spores.length) finish(s, false, '버섯이 다 밀려났어요!');
  },
  over: (s) => s.dead,
  score: (s) => Math.round(s.pts),
  draw(ctx, s, w, h, _th: Theme) {
    drawAll(ctx, s, w, h);
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
const tapCell = (s: SporeState, i: number): Input => ({ tap: false, dir: 0, pointer: { x: cellX(i), y: (cellY(i) - (i === s.giant ? 0.06 : 0.03)) / A } });
const canAct = (s: SporeState) => s.phase === 'play' && !s.down;
const ripeCells = (s: SporeState) => {
  const out: number[] = [];
  for (let i = 0; i < NC; i++) if (s.own[i] === MINE && s.lv[i] >= 1) out.push(i);
  return out;
};
const stamp = new Int32Array(NC);
let stampN = 0;
/** 이 버섯을 이 힘·바람에 터뜨리면 얼마나 새 땅을 얻나 (실제 비행과 같은 계산으로 내려앉는 칸을 센다) */
function shotValue(s: SporeState, i: number, pq: number, aq: number, vq: number, giant: boolean, taken: Uint8Array, islWant: boolean): number {
  const sh = plumeOf(pq, aq, vq, giant), cx = colOf(i) + 0.5, cy = rowOf(i) + 0.5;
  stampN++;
  let v = 0;
  for (let k = 0; k < sh.n; k++) {
    const tc = Math.floor(cx + sh.dx[k]), tr = Math.floor(cy + sh.dy[k]);
    if (tc < 0 || tr < 0 || tc >= COLS || tr >= ROWS) continue;
    const j = tr * COLS + tc;
    if (!growable(s, j)) continue;
    if (stamp[j] === stampN || taken[j]) {
      v += 0.04;
      continue;
    }
    stamp[j] = stampN;
    const o = s.own[j];
    if (o === NONE) {
      v += 1 + (s.type[j] === LOG ? 0.2 : 0) + (islWant && s.isl[j] ? 2.5 : 0);
      if (nbrs(j, NB2).some((q) => s.own[q] === MOLD)) v += 0.3;
    } else if (o === MOLD) v += s.lv[j] <= 0.45 ? 1.2 : 0.5;
    else if (s.lv[j] < 1) v += 0.05;
  }
  return v;
}
const DELAYS = [0, 20, 45, 75, 110, 150, 200, 260];
/** 잘하는 봇: 버섯마다 0~4.3초 뒤의 부풂·바람(예보 포함)을 미리 셈해, 지금 터뜨리는 게 가장 좋을 때만 톡 */
export function smartPick(s: SporeState): number {
  const d = s.def, st = s.st, taken = new Uint8Array(NC), rain = rainAt(s, st);
  let inAir = 0;
  for (const sp of s.spores) if (sp.land >= 0 && !taken[sp.land] && s.own[sp.land] === NONE && growable(s, sp.land)) (taken[sp.land] = 1), inAir++;
  const need = d.goal - s.mine - inAir;
  if (need <= 0) return -1;
  let front = 0;
  for (let i = 0; i < NC; i++) if (s.own[i] === MOLD) for (const j of nbrs(i, NB)) if (s.own[j] !== MOLD && growable(s, j)) front++;
  const tLeft = s.sunOn ? (s.T - s.sun) / 60 : 99, parLeft = d.stars.includes('par') ? d.par - s.taps : 99;
  const islWant = d.stars.includes('island') && s.islMine === 0;
  const lam = parLeft > 0 ? 0.3 + 0.02 * front + (tLeft < 9 ? 4 : 0) : 3;
  // 아껴야 할 땐 방금 터뜨린 포자가 다 내려앉는 걸 보고 다음 톡
  if (parLeft > 0 && parLeft < 99 && tLeft > 8 && s.spores.some((sp) => sp.age < sp.dur - 6)) return -1;
  let best = -1e9, pick = -1, bestD = 0, bestV = 0;
  for (let i = 0; i < NC; i++) {
    if (s.own[i] !== MINE) continue;
    const g = i === s.giant, f = (s.type[i] === LOG ? 1.6 : 1) * (inRain(rain, i) ? 2.6 : 1);
    const gr = (g ? GGROW : GROW) * f, sw = (g ? GSWELL : SWELL) * f, tr = s.lv[i] >= 1 ? 0 : (1 - s.lv[i]) / gr;
    if (tr > 4) continue;
    let pen = 0;
    for (const j of nbrs(i, NB)) if (s.own[j] === MOLD) pen += 0.9;
    for (const dd of DELAYS) {
      const sec = dd / 60;
      if (sec < tr) continue;
      const p = s.lv[i] >= 1 ? Math.min(2, s.pw[i] + sw * sec) : Math.min(2, 1 + sw * (sec - tr));
      const w = windAt(s, st + dd);
      const v = shotValue(s, i, qP(p), qA(w.a), qV(w.v), g, taken, islWant) - pen;
      const sc = v - lam * sec;
      if (sc > best) (best = sc), (pick = i), (bestD = dd), (bestV = v);
    }
  }
  if (pick < 0 || bestD > 0 || s.lv[pick] < 1) return -1;
  // 톡 수를 아껴야 하면(별: N번만) 남은 톡마다 몫을 채우는 큰 한 방만
  const tau = parLeft > 0 && parLeft < 99 ? Math.min(need, (need / parLeft) * 0.6) : Math.min(2.5, need);
  if (bestV < tau && tLeft > 7) return -1;
  return pick;
}
export const sporebloomSmart: Bot<SporeState> = {
  name: '바람 읽는 버섯지기',
  act(s) {
    if (!canAct(s)) return NO;
    const i = smartPick(s);
    return i >= 0 ? tapCell(s, i) : NO;
  },
};
/** 버릇 봇 1: 다 큰 버섯이 생기면 그중 가장 큰 것을 바로 톡 */
export const sporebloomHabit: Bot<SporeState> = {
  name: '버릇: 가장 큰 버섯 바로 톡',
  act(s) {
    if (!canAct(s)) return NO;
    let best = -1, bp = -1;
    for (const i of ripeCells(s)) {
      const p = s.pw[i] + (i === s.giant ? 1 : 0);
      if (p > bp) (bp = p), (best = i);
    }
    return best >= 0 ? tapCell(s, best) : NO;
  },
};
/** 버릇 봇 2: 다 큰 버섯이 생기면 곰팡이와 가장 가까운 것을 바로 톡 (곰팡이가 없으면 가운데와 가까운 것) */
export const sporebloomHabit2: Bot<SporeState> = {
  name: '버릇: 곰팡이 가까운 버섯 톡',
  act(s) {
    if (!canAct(s)) return NO;
    const molds: number[] = [];
    for (let i = 0; i < NC; i++) if (s.own[i] === MOLD) molds.push(i);
    let best = -1, bd = 1e9;
    for (const i of ripeCells(s)) {
      let dd = 1e9;
      if (molds.length) for (const j of molds) dd = Math.min(dd, Math.abs(colOf(i) - colOf(j)) + Math.abs(rowOf(i) - rowOf(j)));
      else dd = Math.abs(colOf(i) + 0.5 - COLS / 2) + Math.abs(rowOf(i) + 0.5 - ROWS / 2);
      if (dd < bd) (bd = dd), (best = i);
    }
    return best >= 0 ? tapCell(s, best) : NO;
  },
};
const dumbAt = new WeakMap<object, { next: number; until: number; p: { x: number; y: number } }>();
/** 못하는 봇: 아무 때나 반짝이는 버섯(가끔은 아무 버섯·아무 데나)을 톡 */
export const sporebloomRandom: Bot<SporeState> = {
  name: '아무 버섯이나 톡',
  act(s, rng) {
    let m = dumbAt.get(s);
    if (!m) dumbAt.set(s, (m = { next: 20 + Math.floor(rng() * 60), until: -1, p: { x: 0, y: 0 } }));
    if (s.t < m.until) return { tap: false, dir: 0, pointer: m.p };
    if (s.t < m.next) return NO;
    m.next = s.t + 40 + Math.floor(rng() * 140);
    m.until = s.t + 2 + Math.floor(rng() * 4);
    const ripe = ripeCells(s), u = rng();
    const mine: number[] = [];
    for (let i = 0; i < NC; i++) if (s.own[i] === MINE) mine.push(i);
    if (u < 0.7 && ripe.length) m.p = tapCell(s, ripe[Math.floor(rng() * ripe.length)]).pointer!;
    else if (u < 0.9 && mine.length) m.p = tapCell(s, mine[Math.floor(rng() * mine.length)]).pointer!;
    else m.p = { x: rng(), y: (BY + rng() * ROWS * RH) / A };
    return { tap: false, dir: 0, pointer: m.p };
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
type C2 = CanvasRenderingContext2D;
const clamp01 = (q: number) => Math.max(0, Math.min(1, q));
const ease = (q: number) => 1 - Math.pow(1 - clamp01(q), 2.2);
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
const hex = (c: string) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const mix = (a: string, b: string, k: number) => {
  const p = hex(a), q = hex(b);
  return `rgb(${p.map((v, j) => Math.round(v + (q[j] - v) * clamp01(k))).join(',')})`;
};
/** 버섯 갓 색: 빨강 · 주황 · 분홍 · 보라 · 노랑 [밝은 쪽, 몸, 그늘, 포자 빛] */
const CAP: [string, string, string, string][] = [
  ['#ff8a78', '#f2453a', '#b5221c', '#ffd0c8'],
  ['#ffc078', '#ff8c26', '#c45a0c', '#ffe2b8'],
  ['#ffb0d6', '#ff6aa8', '#c23a76', '#ffd8ec'],
  ['#c8b0ff', '#9a72f2', '#6a44b8', '#e6dcff'],
  ['#fff08a', '#ffc828', '#c48a08', '#fff4b8'],
];
const LITTER = ['#e9a23b', '#d8662c', '#b84a2a', '#c9a640', '#a8763a', '#8fae3e'];

/** 그림 전용 기억 (시뮬레이션과 무관): 꽃가루·바람결·포자 구름·날아가는 곰팡이 */
interface Mote { x: number; y: number; z: number; ph: number }
interface Puff { x: number; y: number; r: number; vx: number; vy: number; age: number; max: number; col: string }
interface Flyer { x: number; y: number; vx: number; vy: number; rot: number; age: number; kind: 'mold' | 'shroom'; hue: number }
interface Leaf { x: number; y: number; z: number; rot: number; spin: number; col: string }
interface Vis { lines: { x: number; y: number; t: number; pw: number }[]; motes: Mote[]; leaves: Leaf[]; streaks: { x: number; y: number; age: number; max: number; len: number }[]; puffs: Puff[]; flyers: Flyer[]; lastT: number; wowT: number; stage: number; burstAt: Map<number, { t: number; pw: number }> }
const visMap = new WeakMap<SporeState, Vis>();
function visOf(s: SporeState): Vis {
  let v = visMap.get(s);
  if (!v) {
    v = { lines: [], motes: [], leaves: [], streaks: [], puffs: [], flyers: [], lastT: -1, wowT: -999, stage: -1, burstAt: new Map() };
    for (let k = 0; k < 7; k++) v.leaves.push({ x: hsh(k + 400) * (COLS + 4) - 2, y: hsh(k + 420) * ROWS, z: 0.6 + hsh(k + 440) * 1.6, rot: hsh(k + 460) * TAU, spin: 0.04 + 0.06 * hsh(k + 480), col: LITTER[k % 5] });
    for (let k = 0; k < 30; k++) v.motes.push({ x: hsh(k + 1) * (COLS + 2) - 1, y: hsh(k + 50) * (ROWS + 1) - 1, z: 0.3 + hsh(k + 90) * 1.4, ph: hsh(k + 130) * TAU });
    visMap.set(s, v);
  }
  return v;
}

function drawAll(ctx: C2, s: SporeState, w: number, h: number) {
  const fx = juice(s), t = s.t, v = visOf(s);
  const X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w;
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  const dusk = s.sunOn ? clamp01(s.sun / s.T) : 0, wind = windAt(s, s.st), rain = rainAt(s, s.st);
  const wdx = Math.cos(wind.a), wdy = Math.sin(wind.a);
  // 그림 기억 갱신 (프레임마다 한 번)
  const dt = v.lastT < 0 ? 1 : Math.max(0, Math.min(4, t - v.lastT));
  v.lastT = t;
  ctx.save();
  fx.begin(ctx);
  drawBack(ctx, w, X, Y, R, dusk, wdx, t);
  drawGround(ctx, s, X, Y, R, t, rain);
  // ═════════ 판 위: 뒤 줄부터 (돌 · 통나무 · 곰팡이 · 버섯) ═════════
  drawGrassEdge(ctx, X, Y, R, t, wdx, BY - 0.004, 0.012, 1);
  for (let r = 0; r < ROWS; r++) {
    // 통나무는 줄 하나에 이어진 만큼 한 번에
    for (let c = 0; c < COLS; c++) {
      const i = r * COLS + c;
      if (s.type[i] === LOG && (c === 0 || s.type[i - 1] !== LOG)) {
        let e = c;
        while (e + 1 < COLS && s.type[r * COLS + e + 1] === LOG) e++;
        drawLog(ctx, X(bx2x(c) + 0.008), X(bx2x(e + 1) - 0.008), Y(by2y(r + 0.5) + 0.004), R(RH * 0.36), s.wet[i] > 0, t, i);
      }
    }
    for (let c = 0; c < COLS; c++) {
      const i = r * COLS + c, x = X(cellX(i)), y = Y(cellY(i) + (s.type[i] === LOG ? -0.016 : 0.006));
      if (s.type[i] === STONE) drawStone(ctx, x, Y(cellY(i) + 0.012), R(0.05));
      if (s.type[i] === SOIL && s.own[i] === NONE && !(s.born[i] > 0 && t - s.born[i] < 30)) drawPlant(ctx, x, Y(cellY(i) + 0.014), R(0.036), i, t, wdx);
      if (s.own[i] === MOLD) drawMold(ctx, s, i, x, y, R(0.062), t);
      else if (s.own[i] === MINE) drawCellShrooms(ctx, s, i, x, y, R(0.088), t, wdx, wdy);
      else if (s.born[i] > 0 && t - s.born[i] < 30) drawDeflate(ctx, x, y, R(0.088), (t - s.born[i]) / 30, s.hue[i]);
    }
  }
  drawGrassEdge(ctx, X, Y, R, t, wdx, by2y(ROWS) + 0.006, 0.016, 0.8);
  // ═════════ 공중: 포자 · 구름 · 밀려난 곰팡이 ═════════
  for (const sp of s.spores) {
    const gx = X(bx2x(sp.x)), gy = Y(by2y(sp.y)), sy = gy - R(sp.z * ZH), c = CAP[sp.hue];
    ctx.globalAlpha = clamp01(0.35 - sp.z * 0.12);
    ctx.fillStyle = '#2a1608';
    ell(ctx, gx, gy, R(0.007), R(0.0035));
    ctx.fill();
    ctx.globalAlpha = 1;
    const tx = gx - sp.vx * R(CW) * 0.11, ty = sy - sp.vy * R(RH) * 0.11 + sp.vz * R(ZH) * 0.11;
    ctx.strokeStyle = c[3];
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = R(0.009);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(gx, sy);
    ctx.stroke();
    ctx.globalAlpha = 1;
    const g = ctx.createRadialGradient(gx, sy, 0, gx, sy, R(0.026));
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.3, c[0]);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ell(ctx, gx, sy, R(0.026), R(0.026));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ell(ctx, gx, sy, R(0.0065), R(0.0065));
    ctx.fill();
  }
  // 포자 구름 (터진 순간 퐁! 부풀었다 흩어짐)
  // 구름 테두리 (한 덩어리로 보이게)
  for (const p of v.puffs) {
    const q = (p.age + dt) / p.max, rad = p.r * (0.5 + 0.9 * ease(q * 1.6));
    ctx.globalAlpha = clamp01(1 - q) * 0.5;
    ctx.fillStyle = 'rgba(120,60,60,.6)';
    ell(ctx, p.x, p.y + 1.5, rad + 2, rad * 0.85 + 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const p of v.puffs) {
    p.age += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.95;
    p.vy *= 0.95;
    const q = p.age / p.max, rad = p.r * (0.5 + 0.9 * ease(q * 1.6));
    ctx.globalAlpha = clamp01(1.15 - q);
    ctx.fillStyle = p.col;
    ell(ctx, p.x, p.y, rad, rad * 0.85);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ell(ctx, p.x - rad * 0.3, p.y - rad * 0.3, rad * 0.45, rad * 0.35);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  v.puffs = v.puffs.filter((p) => p.age < p.max);
  // 퐁! 만화 효과선
  for (const L of v.lines) {
    const q = (t - L.t) / 14;
    if (q < 0 || q > 1) continue;
    ctx.strokeStyle = `rgba(255,255,240,${(1 - q) * 0.9})`;
    ctx.lineWidth = R(0.007) * (1 - q * 0.5);
    ctx.lineCap = 'round';
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * TAU + hsh(L.t + k) * 0.3, r0 = R(0.05 + 0.1 * q) * L.pw * 0.6, r1 = r0 + R(0.04 + 0.03 * hsh(k + L.t)) * L.pw * 0.6;
      ctx.beginPath();
      ctx.moveTo(L.x + Math.cos(a) * r0, L.y + Math.sin(a) * r0 * 0.8);
      ctx.lineTo(L.x + Math.cos(a) * r1, L.y + Math.sin(a) * r1 * 0.8);
      ctx.stroke();
    }
  }
  v.lines = v.lines.filter((L) => t - L.t < 15);
  for (const f of v.flyers) {
    f.age += dt;
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    f.vy += 0.18 * dt;
    f.rot += 0.12 * dt;
    ctx.save();
    ctx.globalAlpha = clamp01(1 - f.age / 50);
    ctx.translate(f.x, f.y);
    ctx.rotate(f.rot);
    if (f.kind === 'mold') drawMoldBlob(ctx, 0, 0, R(0.03), t, 'dizzy', 1);
    else drawShroom(ctx, 0, 0, R(0.04), 1, 1, f.hue, t, 'cry', 0, 0, 0);
    ctx.restore();
  }
  v.flyers = v.flyers.filter((f) => f.age < 50);
  // ═════════ 비구름 ═════════
  if (rain) drawRain(ctx, X(bx2x(rain.x)), Y(by2y(rain.y)), R, t);
  // ═════════ 바람결: 꽃가루 · 바람 줄 ═════════
  const wv = wind.v / 60;
  for (const m of v.motes) {
    m.x += (wdx * wv * 0.85 + Math.sin(t * 0.05 + m.ph) * 0.004) * dt;
    m.y += (wdy * wv * 0.85 + Math.cos(t * 0.043 + m.ph) * 0.004) * dt;
    if (m.x > COLS + 1.2) m.x -= COLS + 2.4;
    if (m.x < -1.2) m.x += COLS + 2.4;
    if (m.y > ROWS + 1) m.y -= ROWS + 3;
    if (m.y < -2) m.y += ROWS + 3;
    const mx = X(bx2x(m.x)), my = Y(by2y(m.y)) - R(m.z * ZH);
    ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 0.1 + m.ph);
    ctx.strokeStyle = 'rgba(255,250,215,.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(mx - wdx * R(0.02), my - wdy * R(0.012));
    ctx.lineTo(mx, my);
    ctx.stroke();
    ctx.fillStyle = '#fff6c8';
    ell(ctx, mx, my, R(0.0045), R(0.0045));
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const lf of v.leaves) {
    lf.x += (wdx * wv * 0.7 + Math.sin(t * 0.03 + lf.rot) * 0.006) * dt;
    lf.y += (wdy * wv * 0.7 + Math.cos(t * 0.027 + lf.spin * 50) * 0.005) * dt;
    lf.rot += lf.spin * dt;
    if (lf.x > COLS + 2) lf.x -= COLS + 4;
    if (lf.x < -2) lf.x += COLS + 4;
    if (lf.y > ROWS + 1) lf.y -= ROWS + 3;
    if (lf.y < -2) lf.y += ROWS + 3;
    const lx = X(bx2x(lf.x)), ly = Y(by2y(lf.y)) - R(lf.z * ZH + Math.sin(t * 0.05 + lf.spin * 80) * 0.01);
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(lf.rot);
    ctx.scale(1, 0.4 + 0.6 * Math.abs(Math.sin(lf.rot * 1.3)));
    ctx.fillStyle = lf.col;
    ctx.beginPath();
    ctx.moveTo(-R(0.016), 0);
    ctx.quadraticCurveTo(0, -R(0.012), R(0.016), 0);
    ctx.quadraticCurveTo(0, R(0.012), -R(0.016), 0);
    ctx.fill();
    ctx.strokeStyle = 'rgba(90,40,10,.5)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-R(0.016), 0);
    ctx.lineTo(R(0.014), 0);
    ctx.stroke();
    ctx.restore();
  }
  if (t % 26 === 0 || (dt > 1 && v.streaks.length < 3)) v.streaks.push({ x: -1 + hsh(t * 0.37) * (COLS + 2), y: hsh(t * 0.71 + 3) * ROWS, age: 0, max: 70, len: 0.9 + hsh(t + 5) * 0.8 });
  for (const st of v.streaks) {
    st.age += dt;
    st.x += wdx * wv * 1.3 * dt;
    st.y += wdy * wv * 1.3 * dt;
    const q = st.age / st.max, a = Math.sin(q * Math.PI) * 0.55;
    const x0 = X(bx2x(st.x)), y0 = Y(by2y(st.y)) - R(0.05), L = R(CW * st.len);
    ctx.strokeStyle = `rgba(255,255,255,${a})`;
    ctx.lineWidth = R(0.005);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x0 - wdx * L, y0 - wdy * L * 0.7);
    ctx.quadraticCurveTo(x0 - wdx * L * 0.4 - wdy * R(0.012), y0 - wdy * L * 0.3 + wdx * R(0.012), x0, y0);
    ctx.stroke();
  }
  v.streaks = v.streaks.filter((q) => q.age < q.max);
  // ═════════ 반딧불 (해가 기울수록 밝게) ═════════
  for (let k = 0; k < 9; k++) {
    const fx0 = 0.08 + 0.84 * hsh(k + 300), fy0 = 0.22 + 0.85 * hsh(k + 330);
    const x = X(fx0 + 0.05 * Math.sin(t * 0.011 * (1 + k * 0.13) + k)), y = Y(fy0 + 0.035 * Math.sin(t * 0.017 * (1 + k * 0.1) + k * 2));
    const blink = 0.5 + 0.5 * Math.sin(t * 0.07 + k * 1.7), a = (0.18 + 0.75 * dusk) * blink;
    const g = ctx.createRadialGradient(x, y, 0, x, y, R(0.022));
    g.addColorStop(0, `rgba(240,255,150,${a})`);
    g.addColorStop(1, 'rgba(240,255,150,0)');
    ctx.fillStyle = g;
    ell(ctx, x, y, R(0.022), R(0.022));
    ctx.fill();
    ctx.fillStyle = `rgba(255,255,220,${Math.min(1, a * 1.4)})`;
    ell(ctx, x, y, R(0.004), R(0.004));
    ctx.fill();
  }
  // ═════════ 해 질 녘 빛 ═════════
  if (dusk > 0.45) {
    ctx.fillStyle = `rgba(255,120,60,${(dusk - 0.45) * 0.22})`;
    ctx.fillRect(-10, Y(0.085), w + 20, Y(by2y(ROWS) + 0.06 - 0.085));
  }
  // ═════════ 구경꾼 달팽이 ═════════
  drawSnail(ctx, X, Y, R, t, v);
  // ═════════ 새것 스포트라이트 ═════════
  if (s.spot && t - s.spot.t < 230) {
    const sp = s.spot, a = Math.min(1, (230 - (t - sp.t)) / 30), pul = 1 + 0.05 * Math.sin(t * 0.2), prx = R(sp.rx) * pul, pry = R(sp.ry) * pul;
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
    const lx = Math.max(tw / 2 + 4, Math.min(w - tw / 2 - 4, X(sp.x))), ly = Y(sp.y) + pry + R(0.03) > Y(1.12) ? Y(sp.y) - pry - R(0.03) : Y(sp.y) + pry + R(0.03);
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
  // ═════════ 첫 손길 안내: 손가락이 다 큰 버섯을 톡 ═════════
  const tip = s.stage === 0 && s.taps === 0 && s.tries === 0 && s.phase === 'play' ? ripeCells(s).reduce((b, i) => (b < 0 || s.pw[i] > s.pw[b] ? i : b), -1) : -1;
  if (tip >= 0) {
    // 미리 보기: 지금 톡 하면 포자가 내려앉을 자리
    const sh = plumeOf(qP(s.pw[tip]), qA(wind.a), qV(wind.v), false), cx = colOf(tip) + 0.5, cy = rowOf(tip) + 0.5;
    ctx.save();
    for (let k = 0; k < sh.n; k++) {
      const lx = X(bx2x(cx + sh.dx[k])), ly = Y(by2y(cy + sh.dy[k])), ph = (t * 0.02 + k * 0.13) % 1;
      ctx.globalAlpha = 0.45 + 0.45 * Math.sin(ph * TAU) ** 2;
      ctx.fillStyle = '#fff3a0';
      ell(ctx, lx, ly, R(0.014), R(0.008));
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,190,60,.9)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = '#fff6c0';
    ctx.setLineDash([4, 5]);
    ctx.lineDashOffset = -t * 0.6;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const ax = X(cellX(tip)), ay = Y(cellY(tip) - 0.06), bx = X(bx2x(cx + 3.2 * wdx)), by = Y(by2y(cy + 3.2 * wdy));
    ctx.moveTo(ax, ay);
    ctx.quadraticCurveTo((ax + bx) / 2, Math.min(ay, by) - R(0.09), bx, by);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    const x = X(cellX(tip)), y = Y(cellY(tip) - 0.045), press = (t % 70) / 70, dip = press < 0.25 ? Math.sin((press / 0.25) * Math.PI) : 0;
    if (press < 0.25 && press > 0.08) (ctx.strokeStyle = `rgba(255,255,255,${0.8 - press * 3})`), (ctx.lineWidth = 3), ell(ctx, x, y, R(0.03 + press * 0.2), R(0.02 + press * 0.12)), ctx.stroke();
    drawHand(ctx, x + R(0.06), y + R(0.11) + dip * R(0.025), R(0.08), dip);
    font(0.046, 900);
    const msg = '👆 다 자란 버섯을 톡!', tw = ctx.measureText(msg).width + R(0.07), bxm = Math.max(tw / 2 + 6, Math.min(w - tw / 2 - 6, x + R(0.12))), bym = y - R(0.14);
    ctx.fillStyle = 'rgba(80,40,10,.3)';
    rr(ctx, bxm - tw / 2 + 2, bym - R(0.035) + 3, tw, R(0.07), R(0.035));
    ctx.fill();
    ctx.fillStyle = '#fffaf0';
    rr(ctx, bxm - tw / 2, bym - R(0.035), tw, R(0.07), R(0.035));
    ctx.fill();
    ctx.strokeStyle = '#ff7a3a';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#5a2a08';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(msg, bxm, bym + 1);
  }
  // ═════════ 사건 → 연출 ═════════
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    if (e.t <= seenT || e.t > t) continue;
    const x = X(e.x), y = Y(e.y);
    if (e.kind === 'burst') {
      const pw = e.v ?? 1, big = pw >= 1.8;
      if (e.i !== undefined) v.burstAt.set(e.i, { t: e.t, pw: Math.min(2, pw) });
      const first = e.t === s.firstTap;
      if (pw >= 1.5 || first) v.lines.push({ x, y, t: e.t, pw: first ? 2.6 : pw });
      if (first) (fx.blink('#fffbe8', 0.3), fx.ring(x, y, '#ffe68a', R(0.32), 7));
      for (let k = 0; k < 6 + Math.round(pw * 6); k++) {
        const a = hsh(t + k * 7.3) * TAU, sp = R(0.003 + 0.006 * hsh(k + t)) * pw;
        v.puffs.push({ x: x + Math.cos(a) * R(0.012), y: y + Math.sin(a) * R(0.008), r: R(0.028 + 0.03 * pw * hsh(k * 3.1 + t)), vx: Math.cos(a) * sp + wdx * R(0.0025) * pw, vy: Math.sin(a) * sp * 0.7 - R(0.002) + wdy * R(0.0015), age: 0, max: 24 + 10 * pw, col: k % 3 ? CAP[e.col === undefined ? 0 : Number(e.col)][3] : '#ffffff' });
      }
      const cc = CAP[Number(e.col)];
      fx.ring(x, y, 'rgba(255,250,220,.95)', R(0.07 + 0.08 * pw), 3 + 2 * pw);
      fx.burst(x, y, '#fff2c8', Math.round(8 * pw), 2.4 + pw, 2);
      fx.burst(x, y, cc[0], Math.round(10 * pw), 3 + pw * 1.2, 2.6);
      fx.burst(x, y, cc[1], Math.round(6 * pw), 2.5 + pw, 2.2);
      fx.pop(x, y - R(0.05), e.text!, CAP[Number(e.col)][0], big ? 32 + (pw > 2 ? 8 : 0) : pw > 1.4 ? 22 : 16);
      fx.kick(big ? 5 + (pw > 2 ? 4 : 0) : 2);
      if (pw > 2.5) fx.blink('#fff6d0', 0.25);
    }
    if (e.kind === 'sprout') {
      const c = CAP[e.v ?? 0];
      fx.burst(x, y, '#7a4a28', 5, 1.8, 1.6);
      fx.burst(x, y - R(0.02), c[0], 5, 2, 2);
      fx.ring(x, y - R(0.015), 'rgba(255,255,240,.9)', R(0.04), 2.5);
      if (hsh(e.t * 0.3 + e.x * 50) < 0.35) fx.pop(x, y - R(0.05), '쏙', '#fff4e0', 13);
    }
    if (e.kind === 'wow') {
      v.wowT = t;
      fx.pop(Math.max(R(0.2), Math.min(w - R(0.2), x)), Math.max(Y(BY + 0.08), y - R(0.06)), e.text!, '#ffe04a', 32);
      fx.ring(x, y, '#fff27a', R(0.22), 6);
      fx.burst(x, y, '#9be26a', 22, 4.4, 2.6);
      fx.burst(x, y, '#ff8ab8', 14, 4, 2.4);
      fx.burst(x, y, '#ffd23a', 14, 4, 2.4);
      fx.blink('#fff8d8', 0.14);
      fx.kick(5);
    }
    if (e.kind === 'tally') fx.pop(Math.max(R(0.16), Math.min(w - R(0.16), x)), Math.max(Y(0.3), y), e.text!, '#ffffff', (e.v ?? 0) >= 8 ? 26 : 20);
    if (e.kind === 'push') {
      fx.pop(x, y - R(0.03), e.text!, e.col!, 20);
      fx.burst(x, y, '#c4c9ce', 12, 3, 2.2);
      fx.ring(x, y, 'rgba(255,255,255,.8)', R(0.06), 3);
      fx.kick(2.5);
      v.flyers.push({ x, y: y - R(0.02), vx: (hsh(e.t + e.x * 9) - 0.5) * R(0.008), vy: -R(0.012), rot: 0, age: 0, kind: 'mold', hue: 0 });
    }
    if (e.kind === 'pushed') {
      fx.pop(x, y - R(0.03), e.text!, e.col!, 16);
      fx.burst(x, y, '#9ea4aa', 8, 2.2, 1.8);
      v.flyers.push({ x, y: y - R(0.02), vx: (hsh(e.t + e.y * 9) - 0.5) * R(0.006), vy: -R(0.009), rot: 0, age: 0, kind: 'shroom', hue: s.hue[e.v ?? 0] });
    }
    if (e.kind === 'hit') fx.burst(x, y, '#d0d4d8', 5, 1.6, 1.6);
    if (e.kind === 'splash') (fx.ring(x, y, 'rgba(220,245,255,.9)', R(0.03), 2), fx.burst(x, y, '#bfeaff', 4, 1.4, 1.4));
    if (e.kind === 'tink') fx.burst(x, y, '#e8e4d8', 4, 1.6, 1.3);
    if (e.kind === 'poke') (fx.pop(x, y, e.text!, e.col!, 16), fx.kick(1.2));
    if (e.kind === 'rustle') fx.burst(x, y, '#d8a048', 5, 1.6, 1.8);
    if (e.kind === 'sneeze') {
      fx.pop(x + R(0.03), y - R(0.02), e.text!, e.col!, 13);
      for (let k = 0; k < 4; k++) v.puffs.push({ x: x + wdx * R(0.02), y: y - R(0.01), r: R(0.008), vx: wdx * R(0.004) + (hsh(k + t) - 0.5) * R(0.003), vy: wdy * R(0.002) - R(0.002), age: 0, max: 30, col: '#fff4d8' });
    }
    if (e.kind === 'ripe') fx.ring(x, y, 'rgba(255,240,150,.85)', R(0.045), 2);
    if (e.kind === 'mold') fx.burst(x, y, '#b8bdc2', 4, 1.2, 1.4);
    if (e.kind === 'clear') {
      fx.burst(X(0.5), Y(0.55), '#ffe066', 46, 6, 3.2);
      fx.burst(X(0.5), Y(0.55), '#ff8fb1', 26, 5, 3);
      fx.burst(X(0.5), Y(0.55), '#7ad65e', 26, 5, 3);
      fx.blink('#fff6c8', 0.22);
    }
    if (e.kind === 'fail') (fx.kick(8), fx.blink('#ff9a7a', 0.2));
  }
  fx.memo.t = t;
  ctx.restore();
  drawHud(ctx, s, w, h, X, Y, R, font, dusk, wind.a);
}

// ───────────── 배경: 하늘 · 해 · 나무 기둥 · 잎 지붕 ─────────────
function drawBack(ctx: C2, w: number, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, dusk: number, wdx: number, t: number) {
  const top = mix('#8fd3ff', '#ff9a8a', dusk * dusk), mid = mix('#d8f3ff', '#ffcf9a', dusk), low = mix('#eaf8d0', '#ffe2b0', dusk);
  ctx.fillStyle = lin(ctx, 0, 0, 0, Y(BY + 0.02), [[0, top], [0.55, mid], [1, low]]);
  ctx.fillRect(-12, -12, w + 24, Y(BY + 0.03) + 12);
  // 해 (판 시간만큼 하늘을 가로질러 나무 뒤로)
  const sx = X(0.2 + 0.68 * dusk), sy = Y(0.135 + 0.11 * dusk * dusk);
  const sg = ctx.createRadialGradient(sx, sy, R(0.01), sx, sy, R(0.25));
  sg.addColorStop(0, `rgba(255,250,210,${0.95})`);
  sg.addColorStop(0.3, dusk > 0.6 ? 'rgba(255,170,110,.45)' : 'rgba(255,240,170,.45)');
  sg.addColorStop(1, 'rgba(255,240,170,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(-12, 0, w + 24, Y(BY + 0.02));
  ctx.fillStyle = mix('#fff4b0', '#ff9a52', dusk);
  ell(ctx, sx, sy, R(0.04), R(0.04));
  ctx.fill();
  // 먼 숲 (흐린 나무 기둥 줄)
  for (let k = 0; k < 9; k++) {
    const x = X(-0.02 + k * 0.125 + 0.03 * hsh(k + 7)), tw = R(0.03 + 0.02 * hsh(k + 3));
    ctx.fillStyle = mix('#a7cfae', '#c49a9a', dusk);
    ctx.fillRect(x - tw / 2, Y(0.1), tw, Y(BY - 0.1));
  }
  ctx.fillStyle = lin(ctx, 0, Y(0.17), 0, Y(BY), [[0, mix('#9fd08c', '#d0a080', dusk)], [1, mix('#76b85c', '#a8805a', dusk)]]);
  ctx.beginPath();
  ctx.moveTo(-5, Y(0.24));
  for (let k = 0; k <= 12; k++) ctx.quadraticCurveTo(X(k / 12 - 0.04), Y(0.19 + 0.03 * hsh(k + 40)), X(k / 12 + 0.002), Y(0.22 + 0.02 * hsh(k + 60)));
  ctx.lineTo(w + 5, Y(BY + 0.02));
  ctx.lineTo(-5, Y(BY + 0.02));
  ctx.fill();
  // 큰 나무 기둥 (양옆) — 이끼 낀 껍질
  for (const [cx, tw] of [[0.02, 0.11], [0.93, 0.13], [0.58, 0.05]] as [number, number][]) {
    const x0 = X(cx - tw / 2), x1 = X(cx + tw / 2), y0 = Y(0.06), y1 = Y(BY + 0.01);
    ctx.fillStyle = lin(ctx, x0, 0, x1, 0, [[0, '#5a3a22'], [0.4, '#8a5e38'], [0.75, '#6e4628'], [1, '#4a2e18']]);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y0);
    ctx.lineTo(x1 + R(0.02), y1);
    ctx.quadraticCurveTo((x0 + x1) / 2, y1 - R(0.025), x0 - R(0.02), y1);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(40,20,8,.35)';
    ctx.lineWidth = 1.2;
    for (let k = 1; k < 5; k++) {
      const lx = x0 + ((x1 - x0) * k) / 5;
      ctx.beginPath();
      ctx.moveTo(lx, y0);
      ctx.quadraticCurveTo(lx + R(0.006) * Math.sin(k), (y0 + y1) / 2, lx + R(0.004), y1 - R(0.01));
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(120,180,70,.65)';
    ell(ctx, (x0 + x1) / 2, y1 - R(0.015), (x1 - x0) * 0.55, R(0.014));
    ctx.fill();
  }
  // 잎 지붕 (위 가장자리)
  const leafC = ['#3e8a3a', '#4fa046', '#5fb352', '#357a32'];
  for (let k = 0; k < 18; k++) {
    const x = X(-0.05 + k * 0.064), y = Y(0.085 + 0.02 * hsh(k + 11)) + Math.sin(t * 0.03 + k) * R(0.003), r0 = R(0.045 + 0.02 * hsh(k + 13));
    ctx.fillStyle = mix(leafC[k % 4], '#6a4a3a', dusk * 0.5);
    ell(ctx, x, y, r0, r0 * 0.7);
    ctx.fill();
  }
  // 햇살 줄기 (해 쪽에서 비스듬히)
  ctx.save();
  ctx.globalAlpha = 0.12 * (1 - dusk * 0.6);
  ctx.fillStyle = '#fffbe0';
  for (let k = 0; k < 4; k++) {
    const x = X(0.15 + k * 0.22 + 0.03 * Math.sin(t * 0.004 + k)), wd = R(0.05 + 0.03 * hsh(k + 77));
    ctx.beginPath();
    ctx.moveTo(x, Y(0.09));
    ctx.lineTo(x + wd, Y(0.09));
    ctx.lineTo(x + wd + R(0.25), Y(1.0));
    ctx.lineTo(x + R(0.18), Y(1.0));
    ctx.fill();
  }
  ctx.restore();
  // 고사리 덤불 (판 뒤)
  for (let k = 0; k < 11; k++) {
    const bx = X(0.01 + k * 0.1 + 0.02 * hsh(k + 21)), by = Y(BY - 0.006), sz = R(0.05 + 0.02 * hsh(k + 23)), lean = wdx * 0.18 + Math.sin(t * 0.04 + k) * 0.06;
    for (let f = -2; f <= 2; f++) {
      const a = -Math.PI / 2 + f * 0.42 + lean;
      ctx.strokeStyle = k % 2 ? '#4f9a3c' : '#62ad48';
      ctx.lineWidth = R(0.007);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + Math.cos(a) * sz * 0.6, by + Math.sin(a) * sz * 0.6, bx + Math.cos(a + 0.25) * sz, by + Math.sin(a + 0.25) * sz);
      ctx.stroke();
    }
  }
}

// ───────────── 숲 바닥 판 (디오라마 받침) ─────────────
function drawGround(ctx: C2, s: SporeState, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, t: number, rain: { x: number; y: number } | null) {
  const x0 = X(BX - 0.012), x1 = X(bx2x(COLS) + 0.012), y0 = Y(BY - 0.008), y1 = Y(by2y(ROWS) + 0.008);
  // 앞면 (잘라 낸 흙 단면)
  ctx.fillStyle = lin(ctx, 0, y1, 0, y1 + R(0.06), [[0, '#6a4226'], [0.35, '#8a5a32'], [0.6, '#a8703e'], [1, '#7a4a28']]);
  rr(ctx, x0, y1 - R(0.02), x1 - x0, R(0.08), R(0.02));
  ctx.fill();
  for (let k = 0; k < 14; k++) {
    ctx.fillStyle = k % 3 ? 'rgba(60,30,10,.35)' : 'rgba(255,230,190,.3)';
    ell(ctx, x0 + (x1 - x0) * hsh(k + 500), y1 + R(0.02 + 0.03 * hsh(k + 520)), R(0.006 + 0.005 * hsh(k)), R(0.004));
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(230,200,150,.5)';
  ctx.lineWidth = 1.2;
  for (let k = 0; k < 6; k++) {
    const rx = x0 + (x1 - x0) * hsh(k + 540);
    ctx.beginPath();
    ctx.moveTo(rx, y1 + R(0.005));
    ctx.quadraticCurveTo(rx + R(0.015), y1 + R(0.03), rx - R(0.005), y1 + R(0.05));
    ctx.stroke();
  }
  // 윗면 흙
  ctx.fillStyle = lin(ctx, 0, y0, 0, y1, [[0, '#a8794a'], [0.5, '#b88a56'], [1, '#c4955e']]);
  rr(ctx, x0, y0, x1 - x0, y1 - y0, R(0.02));
  ctx.fill();
  // 부드러운 이끼·햇빛 얼룩
  for (let k = 0; k < 16; k++) {
    const mx = X(BX + hsh(k + 900) * CW * COLS), my = Y(BY + hsh(k + 930) * RH * ROWS);
    ctx.fillStyle = k % 3 ? 'rgba(125,175,65,.28)' : 'rgba(255,236,180,.2)';
    ell(ctx, mx, my, R(0.06 + 0.04 * hsh(k + 960)), R(0.03 + 0.02 * hsh(k + 990)));
    ctx.fill();
  }
  // 칸마다 흙 결 · 낙엽 · 이끼 · 작은 돌
  for (let i = 0; i < NC; i++) {
    const cx = X(cellX(i)), cy = Y(cellY(i)), hw = R(CW / 2), hh = R(RH / 2);
    if (s.type[i] !== SOIL) continue;
    for (let k = 0; k < 2; k++) {
      const q = hsh(i * 11.3 + k * 3.1), lx = cx + (hsh(i * 7.1 + k) - 0.5) * hw * 1.8, ly = cy + (hsh(i * 5.3 + k * 2.2) - 0.5) * hh * 1.8;
      if (q < 0.3) {
        const a = hsh(i * 3 + k) * TAU;
        ctx.fillStyle = LITTER[Math.floor(hsh(i + k * 9) * LITTER.length)];
        ell(ctx, lx, ly, R(0.018), R(0.009), a);
        ctx.fill();
        ctx.strokeStyle = 'rgba(80,40,10,.35)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(lx - Math.cos(a) * R(0.016), ly - Math.sin(a) * R(0.016));
        ctx.lineTo(lx + Math.cos(a) * R(0.016), ly + Math.sin(a) * R(0.016));
        ctx.stroke();
      } else if (q < 0.55) {
        ctx.fillStyle = 'rgba(120,175,60,.55)';
        ell(ctx, lx, ly, R(0.022), R(0.01));
        ctx.fill();
      } else if (q < 0.78) {
        ctx.fillStyle = '#b8ad98';
        ell(ctx, lx, ly, R(0.005), R(0.0035));
        ctx.fill();
      } else if (q < 0.86) {
        ctx.strokeStyle = '#5e3a1e';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(lx - R(0.012), ly + R(0.003));
        ctx.lineTo(lx + R(0.012), ly - R(0.003));
        ctx.stroke();
      }
    }
  }
  // 섬 (물 건너 풀밭) — 작은 깃발
  let flag = -1;
  for (let i = 0; i < NC; i++) {
    if (!s.isl[i]) continue;
    if (flag < 0) flag = i;
    ctx.fillStyle = 'rgba(140,200,80,.45)';
    ell(ctx, X(cellX(i)), Y(cellY(i)), R(CW * 0.55), R(RH * 0.5));
    ctx.fill();
  }
  if (flag >= 0) {
    const fx0 = X(cellX(flag) + CW * 0.3), fy0 = Y(cellY(flag) - 0.01);
    ctx.strokeStyle = '#6a4a2a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fx0, fy0);
    ctx.lineTo(fx0, fy0 - R(0.06));
    ctx.stroke();
    ctx.fillStyle = s.islMine > 0 ? '#ff6aa8' : '#ffd23a';
    ctx.beginPath();
    ctx.moveTo(fx0, fy0 - R(0.06));
    ctx.lineTo(fx0 + R(0.035) + Math.sin(t * 0.15) * R(0.004), fy0 - R(0.048));
    ctx.lineTo(fx0, fy0 - R(0.036));
    ctx.fill();
  }
  // 물웅덩이 (옆 물 칸과 이어 그림)
  for (let i = 0; i < NC; i++) {
    if (s.type[i] !== WATER && !s.wet[i]) continue;
    const c = colOf(i), r = rowOf(i), wet = (j: number) => j >= 0 && j < NC && (s.type[j] === WATER || s.wet[j] > 0);
    const l = c > 0 && wet(i - 1), rt = c < COLS - 1 && wet(i + 1), up = r > 0 && wet(i - COLS), dn = r < ROWS - 1 && wet(i + COLS);
    const pad = R(0.008), xa = X(bx2x(c)) + (l ? 0 : pad), xb = X(bx2x(c + 1)) - (rt ? 0 : pad), ya = Y(by2y(r)) + (up ? 0 : pad), yb = Y(by2y(r + 1)) - (dn ? 0 : pad);
    ctx.fillStyle = 'rgba(40,25,10,.35)';
    rr(ctx, xa - 1, ya - 1, xb - xa + 2, yb - ya + 2, R(0.02));
    ctx.fill();
    ctx.fillStyle = lin(ctx, 0, ya, 0, yb, [[0, '#3d9cd0'], [1, '#62c4ea']]);
    ctx.beginPath();
    ctx.roundRect(xa, ya + 1.5, xb - xa, yb - ya - 1.5, [!l && !up ? R(0.02) : 0, !rt && !up ? R(0.02) : 0, !rt && !dn ? R(0.02) : 0, !l && !dn ? R(0.02) : 0]);
    ctx.fill();
    const ph = t * 0.03 + i;
    ctx.strokeStyle = 'rgba(220,250,255,.5)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse((xa + xb) / 2 + Math.sin(ph) * R(0.01), (ya + yb) / 2, R(0.018) + (ph % 2) * R(0.01), R(0.006), 0, 0, TAU);
    ctx.stroke();
    if (hsh(i * 2.9) < 0.3 && !s.wet[i]) {
      ctx.fillStyle = '#5cb04a';
      ctx.beginPath();
      ctx.ellipse((xa + xb) / 2 + R(0.015), (ya + yb) / 2 + R(0.008), R(0.016), R(0.009), 0, 0.3, TAU - 0.1);
      ctx.lineTo((xa + xb) / 2 + R(0.015), (ya + yb) / 2 + R(0.008));
      ctx.fill();
    }
  }
  // 비 맞은 땅 (젖어서 짙게)
  if (rain) {
    ctx.fillStyle = 'rgba(30,60,90,.16)';
    ell(ctx, X(bx2x(rain.x)), Y(by2y(rain.y)), R(CW * 2.1), R(RH * 1.6));
    ctx.fill();
  }
  // 내 땅: 균사(하얀 실) 자리 · 곰팡이 땅: 회색 솜털
  for (let i = 0; i < NC; i++) {
    const cx = X(cellX(i)), cy = Y(cellY(i) + 0.008);
    if (s.own[i] === MINE) {
      const c = CAP[s.hue[i]], k = clamp01((t - s.born[i]) / 20);
      ctx.globalAlpha = 0.7 * k;
      ctx.fillStyle = '#f6e6c4';
      ell(ctx, cx, cy, R(CW * 0.6) * k, R(RH * 0.56) * k);
      ctx.fill();
      ctx.fillStyle = c[3];
      ctx.globalAlpha = 0.65 * k;
      ell(ctx, cx, cy, R(CW * 0.4) * k, R(RH * 0.36) * k);
      ctx.fill();
      ctx.globalAlpha = 0.55 * k;
      ctx.strokeStyle = '#fffaf0';
      ctx.lineWidth = 1;
      for (const j of [i + 1, i + COLS]) {
        if ((j === i + 1 && colOf(i) === COLS - 1) || j >= NC || s.own[j] !== MINE) continue;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.quadraticCurveTo((cx + X(cellX(j))) / 2 + R(0.008), (cy + Y(cellY(j) + 0.008)) / 2 - R(0.006), X(cellX(j)), Y(cellY(j) + 0.008));
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else if (s.own[i] === MOLD) {
      const k = 0.4 + 0.6 * s.lv[i];
      ctx.fillStyle = 'rgba(150,156,162,.85)';
      for (let q = 0; q < 5; q++) {
        ell(ctx, cx + (hsh(i * 3 + q) - 0.5) * R(CW * 0.6), cy + (hsh(i * 5 + q) - 0.5) * R(RH * 0.5), R(0.022) * k, R(0.013) * k);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(205,210,214,.7)';
      ell(ctx, cx - R(0.008), cy - R(0.004), R(0.02) * k, R(0.009) * k);
      ctx.fill();
    }
  }
}

function drawGrassEdge(ctx: C2, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, t: number, wdx: number, y: number, step: number, hk: number) {
  for (let x = BX - 0.012; x < bx2x(COLS) + 0.012; x += step) {
    const k = hsh(x * 97 + y * 13), gh = R((0.018 + 0.022 * k) * hk), lean = wdx * 0.5 + Math.sin(t * 0.06 + x * 30) * 0.18 * (0.6 + 0.4 * Math.abs(wdx));
    ctx.strokeStyle = k < 0.5 ? '#5aa83e' : '#72bf4e';
    ctx.lineWidth = R(0.0055);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(X(x), Y(y));
    ctx.quadraticCurveTo(X(x) + lean * gh * 0.3, Y(y) - gh * 0.6, X(x) + lean * gh * 0.8, Y(y) - gh);
    ctx.stroke();
  }
}

/** 빈 흙의 작은 풀: 토끼풀 · 고사리 새순 · 들꽃 · 도토리 */
function drawPlant(ctx: C2, x: number, y: number, r: number, i: number, t: number, wdx: number) {
  const k = hsh(i * 6.7 + 1.3);
  if (k > 0.5) return;
  const ox = (hsh(i * 2.1) - 0.5) * r * 1.4, sway = Math.sin(t * 0.06 + i) * 0.1 + wdx * 0.15;
  x += ox;
  if (k < 0.18) {
    for (let q = 0; q < 3; q++) {
      const a = -Math.PI / 2 + (q - 1) * 1.2 + sway;
      ctx.fillStyle = q === 1 ? '#6cbf4a' : '#5aae3e';
      ell(ctx, x + Math.cos(a) * r * 0.32, y - r * 0.35 + Math.sin(a) * r * 0.25, r * 0.3, r * 0.22, a);
      ctx.fill();
    }
    ctx.strokeStyle = '#4a8a30';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - r * 0.3);
    ctx.stroke();
  } else if (k < 0.32) {
    ctx.strokeStyle = '#5aa83e';
    ctx.lineWidth = Math.max(1.2, r * 0.12);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + sway * r, y - r * 0.6, x + r * 0.25 + sway * r, y - r * 0.85);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + r * 0.12 + sway * r, y - r * 0.85, r * 0.16, 0, TAU * 0.8);
    ctx.stroke();
  } else if (k < 0.42) {
    ctx.strokeStyle = '#5aa83e';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + sway * r, y - r * 0.7);
    ctx.stroke();
    const col = ['#ffffff', '#ffe14d', '#ff9ac8', '#b8a0ff'][Math.floor(hsh(i) * 4)];
    for (let q = 0; q < 5; q++) {
      const a = (q / 5) * TAU + t * 0.01;
      ctx.fillStyle = col;
      ell(ctx, x + sway * r + Math.cos(a) * r * 0.16, y - r * 0.72 + Math.sin(a) * r * 0.16, r * 0.12, r * 0.12);
      ctx.fill();
    }
    ctx.fillStyle = '#ffb02a';
    ell(ctx, x + sway * r, y - r * 0.72, r * 0.08, r * 0.08);
    ctx.fill();
  } else {
    ctx.fillStyle = '#b07a3a';
    ell(ctx, x, y - r * 0.18, r * 0.2, r * 0.24);
    ctx.fill();
    ctx.fillStyle = '#7a4e22';
    ell(ctx, x, y - r * 0.36, r * 0.24, r * 0.12);
    ctx.fill();
  }
}

function drawStone(ctx: C2, x: number, y: number, r: number) {
  ctx.fillStyle = 'rgba(40,20,8,.3)';
  ell(ctx, x + r * 0.15, y + r * 0.35, r * 1.05, r * 0.42);
  ctx.fill();
  ctx.fillStyle = lin(ctx, x, y - r, x, y + r * 0.4, [[0, '#d6d4c8'], [0.6, '#a9a79c'], [1, '#7e7c72']]);
  ctx.beginPath();
  ctx.moveTo(x - r, y + r * 0.25);
  ctx.quadraticCurveTo(x - r * 1.05, y - r * 0.5, x - r * 0.2, y - r * 0.75);
  ctx.quadraticCurveTo(x + r * 0.9, y - r * 0.8, x + r * 1.0, y + r * 0.15);
  ctx.quadraticCurveTo(x, y + r * 0.5, x - r, y + r * 0.25);
  ctx.fill();
  ctx.fillStyle = '#7cb342';
  ell(ctx, x - r * 0.15, y - r * 0.62, r * 0.55, r * 0.2, -0.1);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.45)';
  ell(ctx, x - r * 0.45, y - r * 0.3, r * 0.18, r * 0.1, -0.5);
  ctx.fill();
}

function drawLog(ctx: C2, xa: number, xb: number, y: number, ry: number, wet: boolean, t: number, i: number) {
  if (wet) {
    ctx.strokeStyle = 'rgba(220,250,255,.55)';
    ctx.lineWidth = 1.5;
    ell(ctx, (xa + xb) / 2, y + ry * 0.9, (xb - xa) / 2 + ry * 0.6 + Math.sin(t * 0.05) * 2, ry * 0.45);
    ctx.stroke();
  } else {
    ctx.fillStyle = 'rgba(40,20,8,.3)';
    ell(ctx, (xa + xb) / 2, y + ry * 0.95, (xb - xa) / 2 + ry * 0.3, ry * 0.4);
    ctx.fill();
  }
  const bob = wet ? Math.sin(t * 0.05 + i) * 1.2 : 0;
  ctx.fillStyle = lin(ctx, 0, y - ry + bob, 0, y + ry + bob, [[0, '#b98352'], [0.45, '#8c5a32'], [1, '#5a361a']]);
  rr(ctx, xa, y - ry + bob, xb - xa, ry * 2, ry);
  ctx.fill();
  ctx.strokeStyle = 'rgba(50,25,8,.4)';
  ctx.lineWidth = 1.1;
  for (let k = 0; k < Math.floor((xb - xa) / (ry * 1.1)); k++) {
    const lx = xa + ry + k * ry * 1.1 + ry * 0.3 * hsh(i + k);
    if (lx > xb - ry * 1.2) break;
    ctx.beginPath();
    ctx.moveTo(lx, y - ry * 0.55 + bob);
    ctx.quadraticCurveTo(lx + ry * 0.3, y + bob, lx, y + ry * 0.6 + bob);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(130,190,80,.75)';
  for (let k = 0; k < 3; k++) (ell(ctx, xa + (xb - xa) * (0.2 + 0.3 * k) + ry * hsh(i * 3 + k), y - ry * 0.75 + bob, ry * 0.5, ry * 0.18), ctx.fill());
  // 잘린 끝 (나이테)
  ctx.fillStyle = '#e8c48a';
  ell(ctx, xb - ry * 0.25, y + bob, ry * 0.42, ry * 0.92);
  ctx.fill();
  ctx.strokeStyle = '#c4935a';
  ctx.lineWidth = 1;
  for (const q of [0.62, 0.32]) (ell(ctx, xb - ry * 0.25, y + bob, ry * 0.42 * q, ry * 0.92 * q), ctx.stroke());
}

type Face = 'sleep' | 'happy' | 'star' | 'puff' | 'wow' | 'cry' | 'grr' | 'dizzy' | 'sweat';
function drawFace(ctx: C2, x: number, y: number, u: number, f: Face, t: number) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#3a1a0c';
  ctx.fillStyle = '#2a1208';
  ctx.lineWidth = Math.max(1.2, u * 0.13);
  const ex = u * 0.42;
  if (f === 'sleep') for (const sd of [-1, 1]) (ctx.beginPath(), ctx.arc(x + sd * ex, y, u * 0.16, 0.15 * Math.PI, 0.85 * Math.PI), ctx.stroke());
  else if (f === 'happy' || f === 'puff') for (const sd of [-1, 1]) (ctx.beginPath(), ctx.arc(x + sd * ex, y + u * 0.08, u * 0.17, 1.15 * Math.PI, 1.85 * Math.PI), ctx.stroke());
  else if (f === 'dizzy') {
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      for (let k = 0; k < 12; k++) {
        const a = k * 0.62 + t * 0.3, r = (k / 12) * u * 0.22;
        ctx.lineTo(x + sd * ex + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      ctx.stroke();
    }
  } else if (f === 'grr') {
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + sd * ex * 1.45, y - u * 0.28);
      ctx.lineTo(x + sd * ex * 0.35, y - u * 0.12);
      ctx.stroke();
      ell(ctx, x + sd * ex * 0.85, y + u * 0.04, u * 0.1, u * 0.1);
      ctx.fill();
    }
  } else {
    const big = f === 'wow' || f === 'star' ? 0.24 : 0.2;
    for (const sd of [-1, 1]) {
      ctx.fillStyle = '#2a1208';
      ell(ctx, x + sd * ex, y, u * big * 0.8, u * big);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ell(ctx, x + sd * ex - u * 0.05, y - u * 0.07, u * 0.07, u * 0.07);
      ctx.fill();
      if (f === 'star') (ell(ctx, x + sd * ex + u * 0.05, y + u * 0.07, u * 0.035, u * 0.035), ctx.fill());
    }
  }
  ctx.fillStyle = 'rgba(255,110,120,.5)';
  for (const sd of [-1, 1]) (ell(ctx, x + sd * u * 0.78, y + u * 0.22, u * 0.15, u * 0.09), ctx.fill());
  ctx.strokeStyle = '#3a1a0c';
  ctx.lineWidth = Math.max(1.1, u * 0.11);
  if (f === 'wow' || f === 'cry') {
    ctx.fillStyle = '#7a2a1a';
    ell(ctx, x, y + u * 0.36, u * 0.11, u * (f === 'wow' ? 0.15 : 0.08));
    ctx.fill();
  } else if (f === 'puff') {
    ctx.fillStyle = '#7a2a1a';
    ell(ctx, x, y + u * 0.32, u * 0.07, u * 0.07);
    ctx.fill();
  } else if (f === 'grr' || f === 'sweat') {
    ctx.beginPath();
    ctx.moveTo(x - u * 0.22, y + u * 0.42);
    ctx.quadraticCurveTo(x, y + u * 0.26, x + u * 0.22, y + u * 0.42);
    ctx.stroke();
  } else if (f !== 'sleep' && f !== 'dizzy') {
    ctx.beginPath();
    ctx.arc(x, y + u * 0.2, u * 0.15, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }
  if (f === 'cry' || f === 'sweat') {
    ctx.fillStyle = '#8fd8ff';
    const dy = ((t * 0.04) % 1) * u * 0.4;
    ell(ctx, x + ex * 1.5, y - u * 0.1 + dy, u * 0.07, u * 0.11);
    ctx.fill();
  }
}

/** 버섯 하나 (x, y = 땅에 닿은 곳). u = 기본 크기. g = 반짝임(0~1), lean = 바람에 기울기 */
function drawShroom(ctx: C2, x: number, y: number, u: number, lv: number, pw: number, hue: number, t: number, face: Face | null, glow: number, lean: number, ph: number) {
  const c = CAP[hue], sc = 0.42 + 0.58 * ease(lv), sw = lv >= 1 ? 1 + 0.42 * (pw - 1) : 1;
  const pul = lv >= 1 ? 1 + (0.025 + 0.06 * (pw - 1)) * Math.sin(t * 0.22 + ph) : 1;
  const k = u * sc, sh = k * 0.62, stw = k * 0.46, capx = k * 0.66 * sw * pul, capy = k * 0.5 * sw * (2 - pul);
  if (glow > 0) {
    const gg = ctx.createRadialGradient(x, y - sh * 0.5, 0, x, y - sh * 0.5, capx * 2.1);
    gg.addColorStop(0, `rgba(255,245,170,${0.55 * glow})`);
    gg.addColorStop(1, 'rgba(255,245,170,0)');
    ctx.fillStyle = gg;
    ell(ctx, x, y - sh * 0.5, capx * 2.1, capx * 1.7);
    ctx.fill();
    ctx.strokeStyle = `rgba(255,230,120,${0.75 * glow})`;
    ctx.lineWidth = 2;
    ell(ctx, x, y + k * 0.05, capx * (1.05 + 0.08 * Math.sin(t * 0.15 + ph)), capx * 0.38);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(40,18,6,.32)';
  ell(ctx, x + k * 0.08, y + k * 0.04, capx * 0.85, k * 0.17);
  ctx.fill();
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(lean);
  // 줄기
  ctx.fillStyle = lin(ctx, -stw / 2, 0, stw / 2, 0, [[0, '#fff8ea'], [0.7, '#f4e2c4'], [1, '#dcc29c']]);
  ctx.beginPath();
  ctx.moveTo(-stw * 0.55, 0);
  ctx.quadraticCurveTo(-stw * 0.62, -sh * 0.5, -stw * 0.4, -sh);
  ctx.lineTo(stw * 0.4, -sh);
  ctx.quadraticCurveTo(stw * 0.62, -sh * 0.5, stw * 0.55, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(110,60,20,.45)';
  ctx.lineWidth = Math.max(1, k * 0.05);
  ctx.stroke();
  // 갓 아래 (주름)
  ctx.fillStyle = mix(c[2], '#f0d8b0', 0.45);
  ell(ctx, 0, -sh, capx * 0.92, capy * 0.3);
  ctx.fill();
  // 갓
  const cg = ctx.createRadialGradient(-capx * 0.35, -sh - capy * 0.75, capx * 0.1, 0, -sh - capy * 0.3, capx * 1.15);
  cg.addColorStop(0, c[0]);
  cg.addColorStop(0.55, c[1]);
  cg.addColorStop(1, c[2]);
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.moveTo(-capx, -sh);
  ctx.bezierCurveTo(-capx * 1.02, -sh - capy * 1.35, capx * 1.02, -sh - capy * 1.35, capx, -sh);
  ctx.quadraticCurveTo(0, -sh + capy * 0.28, -capx, -sh);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = mix(c[2], '#3a0a00', 0.35);
  ctx.lineWidth = Math.max(1, k * 0.055);
  ctx.stroke();
  // 점
  if (k > u * 0.45) {
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    for (const [dx, dy, r0] of [[-0.5, -0.72, 0.16], [0.42, -0.85, 0.13], [0.02, -1.0, 0.1], [0.68, -0.42, 0.09], [-0.78, -0.35, 0.08]] as [number, number, number][]) {
      ell(ctx, dx * capx, -sh + dy * capy, r0 * capx, r0 * capx * 0.75);
      ctx.fill();
    }
  }
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  ell(ctx, -capx * 0.4, -sh - capy * 0.78, capx * 0.22, capy * 0.12, -0.4);
  ctx.fill();
  // 얼굴 (갓 아래쪽 앞)
  if (face && k > u * 0.5) drawFace(ctx, 0, -sh - capy * 0.2, capx * 0.42, face, t + ph * 20);
  ctx.restore();
  // 반짝이
  if (glow > 0.3) {
    for (let q = 0; q < 3; q++) {
      const a = t * 0.05 + q * 2.1 + ph, rr0 = capx * (1.15 + 0.15 * Math.sin(t * 0.1 + q)), tw = (Math.sin(t * 0.19 + q * 1.7 + ph) + 1) / 2;
      sparkle(ctx, x + Math.cos(a) * rr0, y - sh - capy * 0.4 + Math.sin(a) * rr0 * 0.6, k * 0.16 * tw * glow, '#fffbe0');
    }
  }
}
function sparkle(ctx: C2, x: number, y: number, r: number, col: string) {
  if (r < 0.5) return;
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

/** 내 칸: 가운데 큰 버섯 + 둘레 작은 버섯들 (다 크면 반짝, 부풀수록 통통) */
function drawCellShrooms(ctx: C2, s: SporeState, i: number, x: number, y: number, u: number, t: number, wdx: number, wdy: number) {
  const age = t - s.born[i], pop = age < 18 ? 1 + 0.35 * Math.sin((age / 18) * Math.PI) - (age < 6 ? 0.6 * (1 - age / 6) : 0) : 1;
  const lv = s.lv[i], pw = s.pw[i], g = i === s.giant, ripe = lv >= 1, hue = s.hue[i];
  const lean = Math.sin(t * 0.05 + i) * 0.04 + wdx * 0.06;
  // 둘레 작은 버섯 (밭 느낌)
  if (lv > 0.45 && !g && hsh(i * 4.1) > 0.45) {
    const q = hsh(i * 7.7) < 0.5 ? 1 : -1;
    drawShroom(ctx, x + q * u * 0.5, y + u * 0.1, u * 0.36 * pop, Math.min(1, lv * 0.9), 1, (hue + 2) % 5, t, null, 0, lean * 1.5, i + 1);
  }
  const poke = s.poke && s.poke.i === i ? clamp01(1 - (t - s.poke.t) / 40) : 0;
  const sq = g ? 1.75 : 1;
  const face: Face = poke > 0 ? 'cry' : t - s.hit[i] < 30 ? 'sweat' : ripe ? (pw >= 1.95 ? 'puff' : pw > 1.5 ? 'star' : 'happy') : 'sleep';
  const glow = ripe ? 0.55 + 0.45 * (pw - 1) : 0;
  const wob = poke ? Math.sin(t * 0.9) * 0.18 * poke : 0;
  const ba = visOf(s).burstAt.get(i), bt = ba ? t - ba.t : 99;
  if (ba && bt < 16) {
    // 퐁! 하고 납작해졌다 쪼그라든다
    const q = bt / 16, sqz = q < 0.3 ? 1 - q * 1.6 : 0.52 + 0.3 * (q - 0.3);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1 + (1 - sqz) * 0.9, sqz);
    drawShroom(ctx, 0, 0, u * sq * (1 - 0.45 * q), 1, ba.pw, hue, t, 'puff', 0, 0, i * 0.7);
    ctx.restore();
    return;
  }
  drawShroom(ctx, x, y, u * sq * pop, Math.max(lv, 0.2), pw, hue, t, face, glow, lean + wob, i * 0.7);
  // 다 부푼 버섯은 바람 쪽으로 포자가 살살 샌다 (어디로 날아갈지 보여 줌)
  if (ripe && pw > 1.3) {
    for (let q = 0; q < 3; q++) {
      const ph = ((t * 0.012 + q / 3 + i * 0.13) % 1), d = ph * u * (2.2 + 1.6 * (pw - 1)) * (g ? 1.6 : 1);
      ctx.globalAlpha = (1 - ph) * 0.8 * (pw - 1);
      ctx.fillStyle = CAP[hue][3];
      ell(ctx, x + wdx * d, y - u * sq * 0.9 + wdy * d * 0.6 - Math.sin(ph * Math.PI) * u * 0.4, u * 0.07, u * 0.07);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
/** 포자를 쏟은 버섯이 쪼그라드는 모습 */
function drawDeflate(ctx: C2, x: number, y: number, u: number, q: number, hue: number) {
  ctx.globalAlpha = 1 - q;
  drawShroom(ctx, x, y, u * (1 - 0.6 * q), 1, 1, hue, 0, 'dizzy', 0, 0, 0);
  ctx.globalAlpha = 1;
}

/** 곰팡이 덩어리: 몽실몽실 회색 솜뭉치 + 심술 표정 */
function drawMoldBlob(ctx: C2, x: number, y: number, r: number, t: number, face: Face, k: number) {
  ctx.fillStyle = 'rgba(40,40,50,.25)';
  ell(ctx, x + r * 0.1, y + r * 0.12, r * 1.15, r * 0.38);
  ctx.fill();
  // 솜 덩이 (작은 공 여럿이 뭉친 모양)
  const bumps: [number, number, number][] = [[-0.62, -0.32, 0.5], [0.62, -0.3, 0.5], [-0.3, -0.78, 0.55], [0.32, -0.8, 0.55], [0, -0.55, 0.78], [-0.05, -1.05, 0.42]];
  ctx.fillStyle = '#868b92';
  for (const [bx, by, br] of bumps) (ell(ctx, x + bx * r, y + by * r + r * 0.06, br * r, br * r * 0.95), ctx.fill());
  for (const [bx, by, br] of bumps) {
    const wob = 1 + 0.05 * Math.sin(t * 0.07 + bx * 5);
    const g = ctx.createRadialGradient(x + bx * r - br * r * 0.35, y + by * r - br * r * 0.4, br * r * 0.1, x + bx * r, y + by * r, br * r * wob);
    g.addColorStop(0, '#eef0f2');
    g.addColorStop(0.7, '#b4b9bf');
    g.addColorStop(1, '#9ca1a8');
    ctx.fillStyle = g;
    ell(ctx, x + bx * r, y + by * r, br * r * wob, br * r * 0.92 * wob);
    ctx.fill();
  }
  // 포슬포슬 점
  ctx.fillStyle = 'rgba(110,115,122,.55)';
  for (let q = 0; q < 6; q++) (ell(ctx, x + (hsh(q * 3.3) - 0.5) * r * 1.4, y - r * (0.25 + 0.7 * hsh(q * 5.1)), r * 0.05, r * 0.05), ctx.fill());
  if (k > 0.5) drawFace(ctx, x, y - r * 0.5, r * 0.4, face, t);
}
function drawMold(ctx: C2, s: SporeState, i: number, x: number, y: number, u: number, t: number) {
  const lv = s.lv[i], age = t - s.born[i], grow = age < 20 ? age / 20 : 1;
  const cm = s.cm[i], hit = t - s.hit[i] < 24 ? 1 - (t - s.hit[i]) / 24 : 0;
  const wob = Math.sin(t * 0.5 + i) * (Math.abs(cm) * 0.06 + hit * 0.15);
  const r = u * (0.32 + 0.4 * lv) * grow;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(wob);
  const face: Face = hit > 0 ? 'dizzy' : cm > 0.35 ? 'sweat' : 'grr';
  drawMoldBlob(ctx, 0, 0, r, t + i * 7, face, lv * (hsh(i * 2.3) < 0.7 || cm !== 0 ? 1 : 0.3));
  ctx.restore();
}

function drawRain(ctx: C2, x: number, y: number, R: (r: number) => number, t: number) {
  const cy = y - R(0.2);
  ctx.strokeStyle = 'rgba(150,200,255,.75)';
  ctx.lineWidth = 1.4;
  for (let k = 0; k < 22; k++) {
    const dx = (hsh(k + 700) - 0.5) * R(CW * 3.4), ph = ((t * 0.045 + hsh(k + 720)) % 1);
    const yy = cy + R(0.02) + ph * R(0.2);
    if (((dx / R(CW * 2.1)) ** 2) > 1) continue;
    ctx.globalAlpha = 0.85 - ph * 0.4;
    ctx.beginPath();
    ctx.moveTo(x + dx, yy);
    ctx.lineTo(x + dx - R(0.006), yy + R(0.026));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for (const [dx, dy, r0, c] of [[-0.09, 0.012, 0.05, '#c9d6e4'], [0.08, 0.014, 0.05, '#c9d6e4'], [-0.04, -0.012, 0.06, '#e8f0f8'], [0.035, -0.02, 0.065, '#f4f8fc'], [0.1, 0, 0.04, '#dfe8f2'], [-0.12, 0.005, 0.035, '#dfe8f2']] as [number, number, number, string][]) {
    ctx.fillStyle = c;
    ell(ctx, x + R(dx), cy + R(dy), R(r0), R(r0 * 0.8));
    ctx.fill();
  }
  drawFace(ctx, x, cy - R(0.005), R(0.025), 'sleep', t);
}

function drawSnail(ctx: C2, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, t: number, v: Vis) {
  const span = 0.8, ph = (t * 0.00035) % (2 * span), dir = ph < span ? 1 : -1, px = 0.1 + (ph < span ? ph : 2 * span - ph);
  const x = X(px), y = Y(by2y(ROWS) + 0.035), u = R(0.03), wow = t - v.wowT < 70;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  ctx.fillStyle = 'rgba(40,20,8,.3)';
  ell(ctx, 0, u * 0.35, u * 1.5, u * 0.25);
  ctx.fill();
  // 몸
  ctx.fillStyle = '#f2d7a0';
  ctx.beginPath();
  ctx.moveTo(-u * 1.4, u * 0.3);
  ctx.quadraticCurveTo(u * 0.4, u * 0.42, u * 1.2, u * 0.25);
  ctx.quadraticCurveTo(u * 1.55, u * 0.1, u * 1.35, -u * 0.35);
  ctx.quadraticCurveTo(u * 1.0, -u * 0.5, u * 0.8, -u * 0.1);
  ctx.lineTo(-u * 1.2, u * 0.05);
  ctx.closePath();
  ctx.fill();
  // 더듬이 (놀라면 쭉)
  const st = wow ? 1.5 : 1;
  ctx.strokeStyle = '#d8b880';
  ctx.lineWidth = Math.max(1.2, u * 0.12);
  for (const q of [0, 1]) {
    const ex = u * (1.15 + q * 0.25), ey = -u * (0.95 + q * 0.1) * st;
    ctx.beginPath();
    ctx.moveTo(u * (1.05 + q * 0.12), -u * 0.3);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ell(ctx, ex, ey, u * 0.17, u * 0.17);
    ctx.fill();
    ctx.fillStyle = '#2a1208';
    ell(ctx, ex + u * 0.04, ey, u * 0.08, u * 0.08);
    ctx.fill();
  }
  // 껍데기
  ctx.fillStyle = lin(ctx, -u, -u, u, u, [[0, '#ffb070'], [1, '#c8642a']]);
  ell(ctx, -u * 0.25, -u * 0.35, u * 0.8, u * 0.72);
  ctx.fill();
  ctx.strokeStyle = '#8a3e14';
  ctx.lineWidth = Math.max(1.2, u * 0.1);
  ctx.beginPath();
  for (let q = 0; q < 22; q++) {
    const a = q * 0.5, r = u * 0.62 * (1 - q / 24);
    ctx.lineTo(-u * 0.25 + Math.cos(a) * r, -u * 0.35 + Math.sin(a) * r);
  }
  ctx.stroke();
  ctx.restore();
  if (wow) {
    const a = clamp01((70 - (t - v.wowT)) / 15);
    ctx.globalAlpha = a;
    ctx.fillStyle = '#fffaf0';
    rr(ctx, x - R(0.06), y - R(0.1), R(0.12), R(0.045), R(0.02));
    ctx.fill();
    ctx.fillStyle = '#5a2a08';
    ctx.font = `900 ${Math.max(12, R(0.032))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('우와!', x, y - R(0.077));
    ctx.globalAlpha = 1;
  }
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

function starPath(ctx: C2, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5, rr0 = k % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr0, y + Math.sin(a) * rr0);
  }
  ctx.closePath();
}
function drawHeart(ctx: C2, x: number, y: number, r: number, on: boolean) {
  ctx.fillStyle = on ? '#ff4a6a' : 'rgba(120,80,60,.25)';
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.9);
  ctx.bezierCurveTo(x - r * 1.4, y, x - r * 0.9, y - r * 1.1, x, y - r * 0.4);
  ctx.bezierCurveTo(x + r * 0.9, y - r * 1.1, x + r * 1.4, y, x, y + r * 0.9);
  ctx.fill();
  if (on) {
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ell(ctx, x - r * 0.45, y - r * 0.3, r * 0.22, r * 0.15, -0.5);
    ctx.fill();
  }
}
const starText = (s: SporeState, k: StarK) => {
  const d = s.def;
  return k === 'goal' ? `버섯 ${d.goal}송이 피우기` : k === 'more' ? '곰팡이보다 많이' : k === 'par' ? `${KNUM[d.par] ?? d.par} 번만 터뜨리기` : '물 건너 섬에도 버섯';
};

function drawHud(ctx: C2, s: SporeState, w: number, h: number, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, font: (sz: number, w?: number) => void, dusk: number, wa: number) {
  const d = s.def, t = s.t;
  // ── 위 띠: 판 · 별 · 하트
  ctx.fillStyle = 'rgba(255,250,236,.94)';
  rr(ctx, R(0.02), R(0.012), w - R(0.04), R(0.068), R(0.034));
  ctx.fill();
  ctx.strokeStyle = 'rgba(140,90,40,.5)';
  ctx.lineWidth = 2;
  ctx.stroke();
  font(0.04, 900);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#6a3a14';
  ctx.fillText(`${s.stage + 1}판 · ${d.name}`, R(0.05), R(0.047), w * 0.55);
  for (let k = 0; k < 3; k++) drawHeart(ctx, w - R(0.06) - k * R(0.052), R(0.047), R(0.018), k < s.hearts);
  ctx.fillStyle = '#ffc93a';
  starPath(ctx, w - R(0.25), R(0.046), R(0.021));
  ctx.fill();
  ctx.strokeStyle = '#9a5a08';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#6a3a14';
  ctx.fillText(`${s.stars}`, w - R(0.222), R(0.049));
  // ── 바람 나침반 (배경 왼쪽): 지금 바람 · 곧 바뀔 바람
  {
    const cx = X(0.105), cy = Y(0.2), r0 = R(0.052);
    ctx.fillStyle = 'rgba(255,250,236,.92)';
    ell(ctx, cx, cy, r0, r0);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,80,40,.55)';
    ctx.lineWidth = 2;
    ctx.stroke();
    const arrow = (a: number, col: string, len: number, wd: number) => {
      const dx = Math.cos(a), dy = Math.sin(a) * 0.8;
      const n = Math.hypot(dx, dy), ux = dx / n, uy = dy / n;
      ctx.strokeStyle = col;
      ctx.fillStyle = col;
      ctx.lineWidth = wd;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx - ux * len * 0.6, cy - uy * len * 0.6);
      ctx.lineTo(cx + ux * len * 0.45, cy + uy * len * 0.45);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + ux * len * 0.75, cy + uy * len * 0.75);
      ctx.lineTo(cx + ux * len * 0.3 - uy * len * 0.32, cy + uy * len * 0.3 + ux * len * 0.32);
      ctx.lineTo(cx + ux * len * 0.3 + uy * len * 0.32, cy + uy * len * 0.3 - ux * len * 0.32);
      ctx.closePath();
      ctx.fill();
    };
    const nx = nextShift(s, s.st), soon = nx && nx.t - s.st < 200 && s.phase === 'play';
    if (soon) {
      const q = (nx!.t - s.st) / 200;
      ctx.globalAlpha = 0.55 + 0.35 * Math.sin(t * 0.3);
      arrow(nx!.a, '#ff7a2a', r0 * 0.95, R(0.008));
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#ff7a2a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, r0 + 3, -Math.PI / 2, -Math.PI / 2 + TAU * q);
      ctx.stroke();
    }
    arrow(wa, '#3a7aa8', r0 * 0.95, R(0.011));
    font(0.03, 900);
    ctx.textAlign = 'center';
    ctx.fillStyle = soon ? '#ff5a1a' : '#4a6a7a';
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.lineWidth = 3;
    const lab = soon ? `곧 바뀜 ${Math.ceil((nx!.t - s.st) / 60)}` : '바람';
    ctx.strokeText(lab, cx, cy + r0 + R(0.02));
    ctx.fillText(lab, cx, cy + r0 + R(0.02));
  }
  // ── 아래 띠: 버섯 수 막대 · 해 · 별 조건
  const by = Y(by2y(ROWS) + 0.068);
  ctx.fillStyle = lin(ctx, 0, by, 0, h, [[0, '#8a5c36'], [1, '#6a4428']]);
  ctx.fillRect(0, by, w, h - by);
  // 나뭇결 판자
  ctx.strokeStyle = 'rgba(60,30,10,.22)';
  ctx.lineWidth = 1;
  for (let k = 0; k < 7; k++) {
    const ly = by + R(0.012) + k * R(0.04);
    ctx.beginPath();
    ctx.moveTo(0, ly);
    for (let x = 0; x <= w; x += R(0.1)) ctx.lineTo(x, ly + Math.sin(x * 0.03 + k * 1.7) * 1.5);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,240,210,.12)';
  ctx.fillRect(0, by, w, 2);
  ctx.fillStyle = 'rgba(40,20,5,.35)';
  ctx.fillRect(0, by + 2, w, 2);
  // 버섯 막대
  const bx0 = R(0.05), bx1 = w - R(0.05), bh = R(0.04), byy = by + R(0.03), tot = d.goal * 1.35;
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  rr(ctx, bx0, byy, bx1 - bx0, bh, bh / 2);
  ctx.fill();
  const fm = clamp01(s.mine / tot), fg = clamp01(s.mold / tot);
  if (fm > 0) {
    ctx.fillStyle = lin(ctx, bx0, 0, bx1, 0, [[0, '#ff6a5a'], [0.35, '#ff9a3a'], [0.7, '#ff7ab6'], [1, '#a47cff']]);
    rr(ctx, bx0, byy, (bx1 - bx0) * fm, bh, bh / 2);
    ctx.fill();
  }
  if (fg > 0) {
    ctx.fillStyle = '#a9aeb4';
    rr(ctx, bx1 - (bx1 - bx0) * fg, byy + bh * 0.25, (bx1 - bx0) * fg, bh * 0.5, bh / 4);
    ctx.fill();
  }
  const gx = bx0 + (bx1 - bx0) * (d.goal / tot);
  ctx.strokeStyle = '#fff6c8';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(gx, byy - R(0.012));
  ctx.lineTo(gx, byy + bh + R(0.006));
  ctx.stroke();
  ctx.fillStyle = '#ffd23a';
  ctx.beginPath();
  ctx.moveTo(gx, byy - R(0.012));
  ctx.lineTo(gx + R(0.03), byy - R(0.004));
  ctx.lineTo(gx, byy + R(0.004));
  ctx.fill();
  font(0.034, 900);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = 'rgba(60,30,10,.7)';
  ctx.lineWidth = 3;
  const lab = `🍄 ${s.mine} / ${d.goal}송이`;
  ctx.strokeText(lab, bx0 + R(0.012), byy + bh / 2 + 1);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(lab, bx0 + R(0.012), byy + bh / 2 + 1);
  if (s.mold > 0) {
    ctx.textAlign = 'right';
    ctx.font = `800 ${Math.max(12, R(0.03))}px system-ui, sans-serif`;
    ctx.strokeText(`곰팡이 ${s.mold}`, bx1 - R(0.012), byy + bh / 2 + 1);
    ctx.fillStyle = '#e8ecf0';
    ctx.fillText(`곰팡이 ${s.mold}`, bx1 - R(0.012), byy + bh / 2 + 1);
  }
  // 해 지기까지
  const sy = byy + bh + R(0.032), left = s.sunOn ? clamp01(1 - s.sun / s.T) : 1;
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  rr(ctx, bx0 + R(0.04), sy - R(0.009), bx1 - bx0 - R(0.08), R(0.018), R(0.009));
  ctx.fill();
  ctx.fillStyle = lin(ctx, bx0, 0, bx1, 0, [[0, '#ffd86a'], [0.7, '#ffb04a'], [1, '#ff7a4a']]);
  rr(ctx, bx0 + R(0.04), sy - R(0.009), (bx1 - bx0 - R(0.08)) * left, R(0.018), R(0.009));
  ctx.fill();
  ctx.fillStyle = mix('#ffe46a', '#ff8a4a', dusk);
  ell(ctx, bx0 + R(0.04) + (bx1 - bx0 - R(0.08)) * left, sy, R(0.016), R(0.016));
  ctx.fill();
  ctx.fillStyle = '#f4f0d8';
  ell(ctx, bx0 + R(0.012), sy, R(0.013), R(0.013));
  ctx.fill();
  ctx.fillStyle = '#5e3c22';
  ell(ctx, bx0 + R(0.018), sy - R(0.004), R(0.011), R(0.011));
  ctx.fill();
  if (!s.sunOn) {
    font(0.028, 800);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff2d0';
    ctx.fillText('첫 톡부터 해가 움직여요', w / 2, sy + R(0.026));
  }
  // 별 조건 (한 줄 말)
  const live = d.stars.map((k) => (k === 'goal' ? s.mine >= d.goal : k === 'more' ? s.mine > s.mold : k === 'par' ? s.taps <= d.par : s.islMine > 0));
  const res = s.phase === 'result' && s.ok ? s.starOk : live;
  font(0.034, 800);
  let cx = R(0.04), cy = sy + R(s.sunOn ? 0.05 : 0.07);
  d.stars.forEach((k, j) => {
    const txt = starText(s, k) + (k === 'par' ? ` (${s.taps})` : ''), tw = ctx.measureText(txt).width + R(0.075);
    if (cx + tw > w - R(0.02)) (cx = R(0.04)), (cy += R(0.054));
    const on = res[j], broken = k === 'par' && !on;
    ctx.fillStyle = on ? 'rgba(255,220,90,.25)' : 'rgba(0,0,0,.2)';
    rr(ctx, cx, cy - R(0.023), tw, R(0.046), R(0.023));
    ctx.fill();
    ctx.fillStyle = on ? '#ffc93a' : broken ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.45)';
    starPath(ctx, cx + R(0.03), cy, R(0.018));
    ctx.fill();
    ctx.fillStyle = on ? '#fff6d0' : broken ? 'rgba(255,240,220,.55)' : '#fff0dc';
    ctx.textAlign = 'left';
    ctx.fillText(txt, cx + R(0.056), cy + 1);
    cx += tw + R(0.018);
  });
  // ── 판 띠 (시작 · 결과)
  let head = '', sub = '', a = 0, age = 0;
  const mid = s.phase !== 'result' && s.spot && s.spot.y < 0.8 ? Y(0.98) : Y(0.62);
  if (s.phase === 'result') {
    age = s.pt;
    a = Math.min(1, age / 8);
    if (s.ok) head = s.won ? '숲이 온통 버섯 밭!' : '버섯 밭 완성!';
    else (head = s.why), (sub = s.hearts > 0 ? '하트 −1 · 같은 숲 다시' : '하트가 없어요');
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
    ctx.fillStyle = lin(ctx, 0, -ch / 2, 0, ch / 2, [[0, '#fffaf0'], [1, '#ffe8c8']]);
    rr(ctx, -cw / 2, -ch / 2, cw, ch, R(0.035));
    ctx.fill();
    ctx.strokeStyle = '#8a5a20';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    font(0.056, 900);
    ctx.fillStyle = s.phase === 'result' ? (s.ok ? '#d0500a' : '#6a5a88') : '#3a7a2a';
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
        font(0.034, 800);
        ctx.fillStyle = sub.startsWith('NEW') ? '#d0402a' : '#6a4a2a';
        ctx.fillText(sub, 0, R(0.036), w - R(0.08));
      }
    }
    ctx.restore();
  }
}

/** 시험용: 이 판부터 시작 */
export function sporebloomAt(seed: number, stage: number): SporeState {
  const s = sporebloom.create(seed);
  s.stage = stage;
  newStage(s);
  return s;
}
