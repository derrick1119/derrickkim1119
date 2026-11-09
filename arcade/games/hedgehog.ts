/**
 * 데굴데굴 고슴도치 (20라운드) — 꾹 눌렀다 떼기 × 당구 × 도감 수집.
 * 기준 9(손이 하는 일은 하나): 꾹 누르면 고슴도치가 몸을 말아 팽이처럼 돌며 힘이 차고(그동안 화살표는 천천히 돈다),
 *   떼는 순간 화살표가 가리키는 쪽으로 데굴데굴. '언제 뗄지'가 방향, '얼마나 누를지'가 힘. 누르는 동안 굴러갈 길이 미리 보인다.
 * 와우(웃음): 지나간 사과·버섯이 가시에 콕콕 꽂혀 등이 흔들흔들 과일 탑이 된다. 멈추면 어질어질 별을 보고, 바구니에 닿으면 탑을 통째로 배달.
 * 고민: 섞어 배달할수록 ×종류 수 — 그런데 하나 꽂을 때마다 무거워져 덜 굴러가고, 탑이 높으면 세게 부딪힐 때 우르르 쏟아진다.
 *       화분을 깨면 할머니가 화내며 굴리기 하나를 빼앗는다.
 * 판 = 정원 하나. 굴리기 횟수 안에 배달 점수 목표(★)를 넘기면 별 1~3개, 못 넘기면 하트 -1 그 정원 다시. 8정원 완주가 끝.
 * 펼쳐짐: 사과·바구니·울타리 튕기기(1) → 버섯(×종류)·화분과 할머니(2) → 연못·연잎 딸기(3, 멈추면 풍덩) → 수박(4, 무겁고 값짐)·탑 우르르
 *        → 닭(5, 부딪히면 꼭대기 과일을 냠) → 두더지 굴(6, 들어가면 다른 굴로 뿅) → 통통 호박(7, 세게 튕겨 줌) → 밤 정원(8, 밤🌰 줍기).
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.18, TAU = Math.PI * 2;
/** 정원(놀이판) 크기 · 고슴도치·과일·화분·바구니·닭·두더지 굴·호박 반지름 (칸) */
const GW = 9, GD = 10.5, RB = 0.42, RF = 0.24, RP = 0.34, RK = 0.62, RC = 0.36, RH = 0.34, RU = 0.46;
const BX = GW / 2, BY = 0.78, SX = GW / 2, SY = GD - 1.3;
/** 꽉 누르기(틱) · 너무 오래 누르면 어지러워 저절로 퐁(기준 8) · 힘(칸/틱) · 구름 저항 */
const FULL = 78, OVER = 150, VMIN = 0.07, VMAX = 0.34, FR = 0.0042, DRAG = 0.996, STOP = 0.004, PDRAG = 0.95;
/** 화살표: 평소엔 3.3초에 한 바퀴, 누르는 동안엔 천천히 */
const SPIN = TAU / 200, SPINH = SPIN * 0.35;
const DIZZY = 24, CAP = 12, DROPV = 0.12, PAUSE = 100, STAGES = 8;
const APPLE = 0, SHROOM = 1, BERRY = 2, MELON = 3, CHEST = 4;
const FRUIT = ['🍎', '🍄', '🍓', '🍉', '🌰'];
const FCOL = ['#ff4d4d', '#e8d2b0', '#ff5a7a', '#5cc85a', '#a86a3a'];
const VAL = [10, 10, 15, 40, 30], WT = [0.1, 0.06, 0.04, 0.55, 0.12];
/** 첫 굴림: 사과 셋 쪽(위)을 가리키는 때가 '보통 사람이 누르고 떼는 때'와 맞게 */
const ANG0 = -Math.PI / 2 - (36 * SPIN + 54 * SPINH);

interface StageDef { name: string; rolls: number; fr: [number, number][]; pots: number; pond: number; chick: boolean; holes: boolean; pumps: number; pads: number; goal: [number, number, number] }
const ST: StageDef[] = [
  { name: '사과 마당', rolls: 6, fr: [[APPLE, 7]], pots: 0, pond: 0, chick: false, holes: false, pumps: 0, pads: 0, goal: [20, 40, 60] },
  { name: '버섯 화단', rolls: 5, fr: [[APPLE, 4], [SHROOM, 4]], pots: 3, pond: 0, chick: false, holes: false, pumps: 0, pads: 0, goal: [40, 100, 140] },
  { name: '연못 정원', rolls: 6, fr: [[APPLE, 3], [SHROOM, 2], [BERRY, 3]], pots: 2, pond: 1, chick: false, holes: false, pumps: 0, pads: 3, goal: [50, 120, 170] },
  { name: '수박 밭', rolls: 5, fr: [[MELON, 2], [APPLE, 3], [SHROOM, 2], [BERRY, 2]], pots: 3, pond: 0, chick: false, holes: false, pumps: 0, pads: 0, goal: [100, 220, 330] },
  { name: '꼬꼬 마당', rolls: 5, fr: [[APPLE, 3], [SHROOM, 3], [BERRY, 2], [MELON, 1]], pots: 2, pond: 0, chick: true, holes: false, pumps: 0, pads: 0, goal: [90, 180, 290] },
  { name: '두더지 굴', rolls: 5, fr: [[APPLE, 3], [SHROOM, 2], [BERRY, 2], [MELON, 1]], pots: 2, pond: 0.8, chick: false, holes: true, pumps: 0, pads: 1, goal: [80, 160, 240] },
  { name: '통통 호박밭', rolls: 5, fr: [[APPLE, 3], [SHROOM, 3], [BERRY, 2], [MELON, 1]], pots: 2, pond: 0, chick: true, holes: false, pumps: 2, pads: 0, goal: [90, 190, 290] },
  { name: '밤 정원', rolls: 6, fr: [[CHEST, 3], [APPLE, 2], [SHROOM, 2], [BERRY, 1], [MELON, 1]], pots: 2, pond: 0.75, chick: false, holes: true, pumps: 1, pads: 1, goal: [120, 280, 450] },
];
const SEE: Record<string, string> = {
  apple: '🍎 콕! 지나간 과일은 등 가시에 꽂혀요',
  basket: '🧺 바구니에 닿으면 과일 탑을 통째로 배달!',
  bank: '🪵 울타리에 닿으면 당구공처럼 튕겨요',
  heavy: '🐢 과일이 많을수록 무거워서 덜 굴러가요',
  shroom: '🍄 버섯 — 섞어서 배달하면 ×종류 수!',
  pot: '🪴 화분을 깨면 할머니가 굴리기 하나를 뺏어요',
  pond: '💧 연못 — 그 안에서 멈추면 풍덩! 과일이 둥둥',
  berry: '🍓 연잎 위 딸기 — 세게 굴러 건너며 콕!',
  melon: '🍉 수박 — 40점이지만 아주 무거워요',
  wobble: '🌀 탑이 높으면 세게 부딪힐 때 우르르!',
  chick: '🐔 닭 — 부딪히면 꼭대기 과일을 냠!',
  hole: '🕳️ 두더지 굴 — 들어가면 다른 굴에서 뿅!',
  pump: '🎃 통통 호박 — 맞으면 퉁~ 더 세게 튕겨요',
  night: '🌙 밤 정원 — 밤에 밤🌰 줍기 (30점)',
};

export interface Pond { x: number; y: number; rx: number; ry: number }
/** 정원 위의 것들 (봇이 흉내 낼 때 통째로 복사하므로 배열로) */
export interface Board {
  fx: number[]; fy: number[]; fk: number[]; fa: number[]; fpad: number[]; fb: number[];
  px: number[]; py: number[]; pa: number[];
  pond: Pond | null; holes: number[]; pumps: number[]; chick: boolean;
}
export interface Ball { x: number; y: number; vx: number; vy: number; tower: number[]; cool: number; hcool: number; roll: number; wob: number; full: number }
export interface RollOut { pts: number; pot: number; lost: number; got: number; drop: number; bounce: number; end: '' | 'stop' | 'deliver' | 'splash' }
interface Ev { t: number; kind: string; x: number; y: number; n?: number; text?: string; list?: number[] }
interface Note { t: number; text: string; color: string }
export interface HedgeState {
  rng: Rng; seed: number; t: number; sT: number; k: number; phase: 'aim' | 'roll' | 'dizzy' | 'pause'; pause: number;
  b: Ball; bd: Board; R: RollOut; ang: number; charge: number; lastCharge: number; aimT: number; rollT: number;
  left: number; rolls: number; pts: number; total: number; stars: number; hearts: number; done: number; lastStars: number;
  cleared: boolean; won: boolean; dead: boolean; basket: number[]; dex: number[]; angry: number; happy: number; maxTower: number;
  seen: Set<string>; events: Ev[]; notes: Note[];
}

const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);
const hsh = (k: number) => ((Math.imul(Math.floor(k) + 1, 2654435761) >>> 0) % 10007) / 10007;
const ev = (s: HedgeState, kind: string, x: number, y: number, n?: number, text?: string, list?: number[]) => s.events.push({ t: s.t, kind, x, y, n, text, list });
const note = (s: HedgeState, text: string, color = '#ffffff') => s.notes.push({ t: s.t, text, color });
function see(s: HedgeState, key: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  note(s, SEE[key], '#ffe08a');
}
export const massOf = (tw: number[]) => {
  let m = 1;
  for (const k of tw) m += WT[k];
  return m;
};
export const kindsOf = (tw: number[]) => new Set(tw).size;
/** 탑을 배달하면 받는 점수: 과일 값 합 × 종류 수 */
export const towerPts = (tw: number[]) => {
  let v = 0;
  for (const k of tw) v += VAL[k];
  return v * kindsOf(tw);
};
/** 닭은 8자 길을 걷는다 (판 시계로 정해짐 — 봇도 같은 함수로 앞을 본다) */
export const chickAt = (sT: number): [number, number] => {
  const a = (sT / 520) * TAU;
  return [GW / 2 + 2.9 * Math.sin(a), GD * 0.5 + 1.5 * Math.sin(2 * a)];
};
const inPond = (p: Pond | null, x: number, y: number) => !!p && ((x - p.x) / p.rx) ** 2 + ((y - p.y) / p.ry) ** 2 < 1;

/** 정원 하나 (같은 시드·같은 판이면 다시 해도 똑같다) */
export function makeBoard(seed: number, k: number): Board {
  const r = mulberry32((seed ^ 0x2c1b3c6d) + k * 7919), d = ST[k];
  const bd: Board = { fx: [], fy: [], fk: [], fa: [], fpad: [], fb: [], px: [], py: [], pa: [], pond: null, holes: [], pumps: [], chick: d.chick };
  const taken: [number, number, number][] = [[BX, BY, 1.7], [SX, SY, 1.5]];
  const free = (x: number, y: number, m: number) => taken.every(([a, b, q]) => Math.hypot(x - a, y - b) > q + m) && !inPond(bd.pond, x, y) && !(bd.pond && inPond({ ...bd.pond, rx: bd.pond.rx + m + 0.3, ry: bd.pond.ry + m + 0.3 }, x, y));
  const spot = (m: number, x0 = 0.8, x1 = GW - 0.8, y0 = 2, y1 = GD - 0.8, extra?: (x: number, y: number) => boolean): [number, number] => {
    for (let n = 0; n < 300; n++) {
      const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0);
      if (free(x, y, m) && (!extra || extra(x, y))) return [x, y];
    }
    return [x0 + r() * (x1 - x0), y0 + r() * (y1 - y0)];
  };
  const fruit = (kind: number, x: number, y: number, pad = 0) => {
    bd.fx.push(x), bd.fy.push(y), bd.fk.push(kind), bd.fa.push(1), bd.fpad.push(pad), bd.fb.push(-999);
    taken.push([x, y, 0.45]);
  };
  if (d.pond) {
    const p = { x: GW / 2 + (r() - 0.5) * 2.2, y: GD * 0.47 + (r() - 0.5) * 1.2, rx: 1.75 * d.pond, ry: 1.2 * d.pond };
    bd.pond = p;
    for (let i = 0; i < d.pads; i++) {
      const a = (i / Math.max(1, d.pads)) * TAU + r() * 0.8;
      bd.fx.push(p.x + Math.cos(a) * p.rx * 0.5), bd.fy.push(p.y + Math.sin(a) * p.ry * 0.45), bd.fk.push(BERRY), bd.fa.push(1), bd.fpad.push(1), bd.fb.push(-999);
    }
  }
  if (d.holes) {
    const a = spot(0.6, 0.9, 2.6, 4.5, GD - 1.4), b = spot(0.6, GW - 2.6, GW - 0.9, 2.2, GD * 0.55);
    bd.holes.push(a[0], a[1], b[0], b[1]);
    taken.push([a[0], a[1], 0.7], [b[0], b[1], 0.7]);
  }
  for (let i = 0; i < d.pumps; i++) {
    const [x, y] = spot(0.8, i % 2 ? GW - 2.4 : 1.0, i % 2 ? GW - 1.0 : 2.4, 2.4, GD - 2);
    bd.pumps.push(x, y);
    taken.push([x, y, 0.8]);
  }
  if (k === 0) {
    // 첫 굴림의 와우: 출발점 바로 위에 사과 셋 (위로만 굴러도 셋 다 꽂히고, 세게면 바구니까지)
    for (const [dx, dy] of [[0, -1.9], [-0.42, -3.0], [0.42, -3.0]]) fruit(APPLE, SX + dx, SY + dy);
  }
  const pool: number[] = [];
  for (const [kind, n] of d.fr) for (let i = 0; i < n - (k === 0 && kind === APPLE ? 3 : 0) - (kind === BERRY ? Math.min(n, d.pads) : 0); i++) pool.push(kind);
  for (const kind of pool) {
    const [x, y] = spot(0.35, 0.8, GW - 0.8, 2, GD - 0.8, k === 0 ? (xx) => Math.abs(xx - SX) > 1.3 : undefined);
    fruit(kind, x, y);
  }
  for (let i = 0; i < d.pots; i++) {
    const [x, y] = spot(0.5, 0.8, GW - 0.8, 1.6, GD - 1.2);
    bd.px.push(x), bd.py.push(y), bd.pa.push(1);
    taken.push([x, y, 0.5]);
  }
  return bd;
}

const newBall = (): Ball => ({ x: SX, y: SY, vx: 0, vy: 0, tower: [], cool: 0, hcool: 0, roll: 0, wob: 0, full: 0 });
const newOut = (): RollOut => ({ pts: 0, pot: 0, lost: 0, got: 0, drop: 0, bounce: 0, end: '' });
type Cb = (kind: string, x: number, y: number, n?: number, list?: number[]) => void;

export function launch(b: Ball, ang: number, charge: number) {
  const p = Math.min(1, charge / FULL), v = (VMIN + (VMAX - VMIN) * p) / massOf(b.tower);
  b.vx = Math.cos(ang) * v;
  b.vy = Math.sin(ang) * v;
  b.hcool = 12;
  b.cool = 0;
}

/** 세게 부딪히면 탑이 흔들려 꼭대기부터 우르르 — 옆으로 흩어져 다시 주울 수 있다 */
function knock(b: Ball, bd: Board, vn: number, nx: number, ny: number, sT: number, R: RollOut, cb?: Cb) {
  b.wob = Math.min(1, b.wob + vn * 5);
  R.bounce++;
  cb?.('bounce', b.x, b.y, vn);
  const n = b.tower.length;
  if (n < 3 || vn < DROPV) return;
  const k = Math.min(n, 1 + Math.floor((vn - DROPV) / 0.06) + (n >= 7 ? 1 : 0)), idx: number[] = [], base = Math.atan2(ny, nx);
  for (let j = 0; j < k; j++) {
    const kind = b.tower.pop()!, side = j % 2 ? 1 : -1;
    const a = base + side * (1.1 + hsh(sT * 7 + j * 13) * 0.6), d = 1 + 0.35 * j + hsh(sT + j * 31) * 0.4;
    const x = clamp(b.x + Math.cos(a) * d, 0.5, GW - 0.5), y = clamp(b.y + Math.sin(a) * d, 1.7, GD - 0.5);
    bd.fx.push(x), bd.fy.push(y), bd.fk.push(kind), bd.fa.push(1), bd.fpad.push(inPond(bd.pond, x, y) ? 1 : 0), bd.fb.push(sT);
    idx.push(bd.fx.length - 1);
  }
  R.drop += k;
  cb?.('drop', b.x, b.y, k, idx);
}
/** 둥근 것에 튕기기: e = 탄성, 반지름 합 rr. 부딪혔으면 법선 속도를 돌려준다 */
function bounceOff(b: Ball, ox: number, oy: number, rr: number, e: number): number {
  const dx = b.x - ox, dy = b.y - oy, d = Math.hypot(dx, dy) || 1e-6;
  if (d >= rr) return -1;
  const nx = dx / d, ny = dy / d, vn = b.vx * nx + b.vy * ny;
  b.x = ox + nx * rr;
  b.y = oy + ny * rr;
  if (vn >= 0) return 0;
  b.vx -= (1 + e) * vn * nx;
  b.vy -= (1 + e) * vn * ny;
  return -vn;
}

/**
 * 굴러가는 한 틱 — 게임과 봇(앞날 흉내)이 같은 함수를 쓴다. 끝났으면 true.
 */
export function tickRoll(b: Ball, bd: Board, sT: number, R: RollOut, cb?: Cb): boolean {
  let sp = Math.hypot(b.vx, b.vy);
  const wet = inPond(bd.pond, b.x, b.y);
  if (sp > 0) {
    const ns = Math.max(0, sp - FR) * DRAG * (wet ? PDRAG : 1);
    b.vx *= ns / sp;
    b.vy *= ns / sp;
    sp = ns;
  }
  b.x += b.vx;
  b.y += b.vy;
  b.roll += sp;
  b.wob *= 0.985;
  if (b.cool > 0) b.cool--;
  if (b.hcool > 0) b.hcool--;
  // 울타리 (당구대 쿠션)
  const e = 0.72;
  if (b.x < RB) (b.x = RB), b.vx < 0 && (knock(b, bd, -b.vx, 1, 0, sT, R, cb), (b.vx = -b.vx * e), (b.vy *= 0.95));
  else if (b.x > GW - RB) (b.x = GW - RB), b.vx > 0 && (knock(b, bd, b.vx, -1, 0, sT, R, cb), (b.vx = -b.vx * e), (b.vy *= 0.95));
  if (b.y < RB) (b.y = RB), b.vy < 0 && (knock(b, bd, -b.vy, 0, 1, sT, R, cb), (b.vy = -b.vy * e), (b.vx *= 0.95));
  else if (b.y > GD - RB) (b.y = GD - RB), b.vy > 0 && (knock(b, bd, b.vy, 0, -1, sT, R, cb), (b.vy = -b.vy * e), (b.vx *= 0.95));
  // 바구니: 탑이 있으면 배달, 없으면 통 튕김
  {
    const dx = b.x - BX, dy = b.y - BY;
    if (dx * dx + dy * dy < (RB + RK) ** 2) {
      if (b.tower.length) {
        const pts = towerPts(b.tower), list = b.tower.slice();
        R.pts += pts;
        b.tower.length = 0;
        bounceOff(b, BX, BY, RB + RK + 0.01, 0);
        b.vx = b.vy = 0;
        R.end = 'deliver';
        cb?.('deliver', b.x, b.y, pts, list);
        return true;
      }
      const vn = bounceOff(b, BX, BY, RB + RK, 0.55);
      if (vn > 0.02) cb?.('bump', b.x, b.y, vn);
    }
  }
  // 화분: 깨진다 (할머니!)
  for (let i = 0; i < bd.px.length; i++) {
    if (!bd.pa[i]) continue;
    const dx = b.x - bd.px[i], dy = b.y - bd.py[i];
    if (dx * dx + dy * dy >= (RB + RP) ** 2) continue;
    bd.pa[i] = 0;
    R.pot++;
    const vn = bounceOff(b, bd.px[i], bd.py[i], RB + RP, 0.3);
    b.vx *= 0.7;
    b.vy *= 0.7;
    cb?.('pot', bd.px[i], bd.py[i], i);
    if (vn > 0) knock(b, bd, vn, (b.x - bd.px[i]) / (RB + RP), (b.y - bd.py[i]) / (RB + RP), sT, R, cb);
  }
  // 통통 호박: 더 세게 튕겨 준다 (탑은 안 흔들림)
  for (let i = 0; i < bd.pumps.length; i += 2) {
    const ox = bd.pumps[i], oy = bd.pumps[i + 1], dx = b.x - ox, dy = b.y - oy, rr = RB + RU, d = Math.hypot(dx, dy);
    if (d >= rr) continue;
    const nx = dx / (d || 1e-6), ny = dy / (d || 1e-6), vn = b.vx * nx + b.vy * ny;
    b.x = ox + nx * rr;
    b.y = oy + ny * rr;
    if (vn < 0) {
      const out = Math.max(0.2, -vn * 1.3);
      b.vx += (out - vn) * nx;
      b.vy += (out - vn) * ny;
      cb?.('boing', ox, oy, i / 2);
    }
  }
  // 닭: 부딪히면 꼭대기 과일을 냠
  if (bd.chick && b.cool === 0) {
    const [cx, cy] = chickAt(sT);
    const vn = bounceOff(b, cx, cy, RB + RC, 0.5);
    if (vn >= 0) {
      b.cool = 40;
      const top = b.tower.pop();
      if (top !== undefined) R.lost++;
      cb?.('peck', cx, cy, top ?? -1);
    }
  }
  // 두더지 굴: 다른 굴로 뿅
  if (bd.holes.length && b.hcool === 0)
    for (let i = 0; i < 2; i++) {
      const hx = bd.holes[i * 2], hy = bd.holes[i * 2 + 1];
      if ((b.x - hx) ** 2 + (b.y - hy) ** 2 < RH * RH) {
        const ox = bd.holes[(1 - i) * 2], oy = bd.holes[(1 - i) * 2 + 1];
        cb?.('hole', hx, hy, i, [ox, oy]);
        b.x = ox + b.vx * 2;
        b.y = oy + b.vy * 2;
        b.hcool = 30;
        break;
      }
    }
  // 과일: 가시에 콕
  for (let i = 0; i < bd.fx.length; i++) {
    if (!bd.fa[i]) continue;
    const dx = b.x - bd.fx[i], dy = b.y - bd.fy[i];
    if (dx * dx + dy * dy >= (RB + RF - 0.04) ** 2) continue;
    if (b.tower.length >= CAP) {
      if (b.full === 0) cb?.('full', b.x, b.y);
      b.full = 30;
      continue;
    }
    const m0 = massOf(b.tower);
    bd.fa[i] = 0;
    b.tower.push(bd.fk[i]);
    const f = m0 / massOf(b.tower);
    b.vx *= f;
    b.vy *= f;
    b.wob = Math.min(1, b.wob + 0.25);
    R.got++;
    cb?.('pick', bd.fx[i], bd.fy[i], bd.fk[i]);
  }
  if (b.full > 0) b.full--;
  sp = Math.hypot(b.vx, b.vy);
  if (inPond(bd.pond, b.x, b.y) && sp < 0.03) {
    // 풍덩: 탑이 둥둥 떠내려가고, 고슴도치는 연못가로 헤엄쳐 나온다
    const p = bd.pond!, list = b.tower.slice(), a = Math.atan2((b.y - p.y) / p.ry, (b.x - p.x) / p.rx);
    R.lost += list.length;
    b.tower.length = 0;
    cb?.('splash', b.x, b.y, list.length, list);
    b.x = clamp(p.x + Math.cos(a) * (p.rx + RB + 0.1), RB, GW - RB);
    b.y = clamp(p.y + Math.sin(a) * (p.ry + RB + 0.1), RB, GD - RB);
    b.vx = b.vy = 0;
    R.end = 'splash';
    return true;
  }
  if (sp < STOP) {
    b.vx = b.vy = 0;
    R.end = 'stop';
    return true;
  }
  return false;
}

export interface Sim { b: Ball; bd: Board; R: RollOut; ticks: number }
const cloneBoard = (bd: Board): Board => ({ ...bd, fx: bd.fx.slice(), fy: bd.fy.slice(), fk: bd.fk.slice(), fa: bd.fa.slice(), fpad: bd.fpad.slice(), fb: bd.fb.slice(), pa: bd.pa.slice() });
/** 이렇게 떼면 어떻게 굴러갈까 (미리 보기·봇 공용). sTrel = 뗀 틱의 판 시계 */
export function simulate(b0: Ball, bd0: Board, ang: number, charge: number, sTrel: number, cb?: Cb, path?: number[]): Sim {
  const b: Ball = { ...b0, tower: b0.tower.slice() }, bd = cloneBoard(bd0), R = newOut();
  launch(b, ang, charge);
  let n = 0;
  while (n < 700) {
    n++;
    const end = tickRoll(b, bd, sTrel + n, R, cb);
    if (path && n % 2 === 0) path.push(b.x, b.y);
    if (end) break;
  }
  if (path) path.push(b.x, b.y);
  return { b, bd, R, ticks: n };
}

function startStage(s: HedgeState) {
  const d = ST[s.k];
  s.bd = makeBoard(s.seed, s.k);
  s.b = newBall();
  s.left = d.rolls;
  s.pts = 0;
  s.sT = 0;
  s.phase = 'aim';
  s.charge = 0;
  s.aimT = 0;
  s.basket = [];
  s.angry = -999;
  s.happy = -999;
  if (s.k === 0) s.ang = ANG0;
  ev(s, 'stage', 0, 0, 0, `${s.k + 1}번째 정원 · ${d.name}`);
  note(s, `🧺 ${d.name} — 굴리기 ${d.rolls}번에 ★ ${d.goal[0]}점`, '#ffffff');
  if (d.fr.some(([q]) => q === SHROOM)) see(s, 'shroom');
  if (d.pots) see(s, 'pot');
  if (d.pond) see(s, 'pond');
  if (d.pads) see(s, 'berry');
  if (d.fr.some(([q]) => q === MELON)) see(s, 'melon');
  if (d.chick) see(s, 'chick');
  if (d.holes) see(s, 'hole');
  if (d.pumps) see(s, 'pump');
  if (s.k === STAGES - 1) see(s, 'night');
}

function fire(s: HedgeState, auto: boolean) {
  let ang = s.ang;
  if (auto) ang += (s.rng() - 0.5) * 0.9;
  launch(s.b, ang, s.charge);
  s.phase = 'roll';
  s.left--;
  s.rolls++;
  s.rollT = 0;
  s.R = newOut();
  s.lastCharge = s.charge;
  ev(s, 'launch', s.b.x, s.b.y, Math.min(1, s.charge / FULL), auto ? '어지러워! 퐁~' : s.charge >= FULL ? '데구르르르!!' : s.charge > 45 ? '데굴데굴!' : s.charge > 20 ? '데굴~' : '또르르')
  s.charge = 0;
}

const boardEmpty = (s: HedgeState) => !s.bd.fa.some((a) => a) && s.b.tower.length === 0;

function endStage(s: HedgeState) {
  const d = ST[s.k], pass = s.pts >= d.goal[0];
  s.phase = 'pause';
  s.pause = PAUSE;
  if (pass) {
    const st = d.goal.filter((g) => s.pts >= g).length, sweep = boardEmpty(s) ? s.left * 10 : 0;
    if (sweep) (s.total += sweep), ev(s, 'bonus', BX, BY, sweep, `싹쓸이! 남은 굴리기 +${sweep}`);
    s.stars += st;
    s.lastStars = st;
    s.done++;
    s.cleared = true;
    ev(s, 'clear', 0, 0, st, `${d.name} 끝! ${'★'.repeat(st)}${'☆'.repeat(3 - st)}`);
    if (s.k === STAGES - 1) (s.pause = 170), note(s, `🏆 정원 8곳 완주! ★ ${s.stars}`, '#ffe08a');
  } else {
    s.hearts--;
    s.cleared = false;
    ev(s, 'fail', 0, 0, 0, s.hearts > 0 ? `★ ${d.goal[0]}점에 못 미쳤어요… ♥ -1 · 다시!` : `★ ${d.goal[0]}점에 못 미쳤어요… 끝!`);
    if (s.hearts <= 0) s.dead = true;
  }
}

export const hedgehog: GameDef<HedgeState> = {
  id: 'hedgehog',
  name: '데굴데굴 고슴도치',
  genes: ['hold', 'billiards', 'collect'],
  twist: '꾹 누르면 고슴도치가 몸을 말아 팽이처럼 돌고, 떼면 화살표 쪽으로 데굴데굴 — 지나간 과일이 가시에 콕콕 꽂혀 등에 흔들흔들 과일 탑이 쌓이는데, 꽂을수록 무거워져 덜 굴러간다',
  rules: [
    '꾹 누르면 몸을 말아 힘이 차고, 떼면 화살표 쪽으로 데굴데굴 (스페이스도 돼요).',
    '지나간 과일은 등에 콕! 바구니에 닿으면 배달 — 섞을수록 ×종류 수, 대신 무거워져요.',
    '굴리기 횟수 안에 ★ 점수를 넘기면 다음 정원. 화분을 깨면 할머니가 화내요!',
  ],
  controls: 'hold',
  hint: '꾹 누르면 몸을 말아 힘 모으기, 떼면 화살표 쪽으로 데굴 / 스페이스',
  aspect: A,
  art: {
    concept: '할머니네 뒷마당 정원 디오라마',
    mood: '나무 진열대 위 두께 있는 흙 덩어리에 올려진 할머니네 뒷마당. 하얀 울타리와 튤립 화단, 테라코타 화분, 연잎 띄운 연못, 흔들의자 할머니가 앉은 툇마루. 아침 햇살에서 노을, 반딧불 밤으로 흘러가며, 갈색 고슴도치가 등에 과일 탑을 흔들흔들 이고 데굴데굴 굴러다닌다.',
    palette: { bg: '#24331f', ink: '#fffaf0', muted: '#9aa88a', accent: '#ffb347', hot: '#ff5a5a', soft: '#ffe7b8' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, sT: 0, k: 0, phase: 'aim', pause: 0, R: newOut(), ang: ANG0, charge: 0, lastCharge: 0, aimT: 0, rollT: 0,
      left: 0, rolls: 0, pts: 0, total: 0, stars: 0, hearts: 3, done: 0, lastStars: 0, cleared: false, won: false, dead: false, basket: [], dex: [], angry: -999, happy: -999, maxTower: 0,
      seen: new Set<string>(), events: [], notes: [],
    } as unknown as HedgeState;
    startStage(s);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    if (s.events.length && s.t - s.events[0].t > 130) s.events = s.events.filter((e) => s.t - e.t <= 130);
    if (s.notes.length && s.t - s.notes[0].t > 220) s.notes = s.notes.filter((e) => s.t - e.t <= 220);
    if (s.dead) return;
    if (s.phase === 'pause') {
      if (--s.pause <= 0) {
        if (s.cleared && s.k === STAGES - 1) (s.won = true), (s.dead = true);
        else {
          if (s.cleared) s.k++;
          startStage(s);
        }
      }
      return;
    }
    s.sT++;
    const hold = !!inp.hold;
    if (s.phase === 'aim') {
      s.aimT++;
      if (hold) {
        s.charge++;
        s.ang += SPINH;
        if (s.charge >= OVER) fire(s, true);
      } else if (s.charge > 0) {
        if (s.charge >= 5) fire(s, false);
        else (s.charge = 0), ev(s, 'tap', s.b.x, s.b.y, 0, '꾹 눌러요!');
      } else s.ang += SPIN;
      return;
    }
    if (s.phase === 'roll') {
      s.rollT++;
      const b = s.b;
      const end = tickRoll(b, s.bd, s.sT, s.R, (kind, x, y, n, list) => {
        if (kind === 'pick') {
          ev(s, kind, x, y, n);
          see(s, 'apple');
          const kk = kindsOf(b.tower);
          if (kk >= 2 && b.tower.indexOf(n!) === b.tower.length - 1) ev(s, 'mix', x, y, kk, `${kk}종류! ×${kk}`);
          if (b.tower.length > s.maxTower) s.maxTower = b.tower.length;
          if (b.tower.length >= 4) see(s, 'heavy');
        } else if (kind === 'bounce') {
          if (n! > 0.05) ev(s, kind, x, y, n);
          see(s, 'bank');
        } else if (kind === 'drop') ev(s, kind, x, y, n, '우르르!', list), see(s, 'wobble');
        else if (kind === 'pot') {
          ev(s, kind, x, y, n, '와장창!');
          s.angry = s.t;
          if (s.left > 0) s.left--, ev(s, 'scold', x, y, 0, '굴리기 -1');
        } else if (kind === 'deliver') {
          s.pts += n!;
          s.total += n!;
          s.basket.push(...list!);
          s.happy = s.t;
          for (const q of new Set(list!))
            if (!s.dex.includes(q)) (s.dex.push(q), (s.total += 20), ev(s, 'dex', x, y, q, `도감 +${FRUIT[q]} 보너스 +20`));
          see(s, 'basket');
          ev(s, kind, x, y, n, `+${n}${kindsOf(list!) > 1 ? ` (×${kindsOf(list!)}종류)` : ''}`, list);
        } else if (kind === 'splash') ev(s, kind, x, y, n, n ? '풍덩! 과일이 둥둥~' : '풍덩!', list);
        else if (kind === 'peck') ev(s, kind, x, y, n, n! >= 0 ? '꼬꼬댁! 냠' : '꼬꼬댁!');
        else if (kind === 'hole') ev(s, kind, x, y, n, '쏙!', list);
        else if (kind === 'boing') ev(s, kind, x, y, n, '퉁~!');
        else if (kind === 'full') ev(s, kind, x, y, 0, '가시가 꽉 찼어요!');
        else ev(s, kind, x, y, n);
      });
      if (end || s.rollT > 900) {
        b.vx = b.vy = 0;
        s.phase = 'dizzy';
        s.pause = DIZZY;
        const R = s.R;
        ev(s, 'stop', b.x, b.y, R.got, R.end === 'deliver' ? '' : R.got ? `콕콕 ${R.got}개!` : '');
      }
      return;
    }
    if (s.phase === 'dizzy' && --s.pause <= 0) {
      if (s.left <= 0 || boardEmpty(s)) endStage(s);
      else (s.phase = 'aim'), (s.aimT = 0);
    }
  },
  over: (s) => s.dead,
  /** 배달 점수(도감 첫 배달 +20 포함) + 별 하나 25점 + 정원 하나 끝낼 때마다 40점 */
  score: (s) => s.total + s.stars * 25 + s.done * 40,
  draw(ctx, s, w, h, th: Theme) {
    drawGarden(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
const hex = (c: string) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
function mix(a: string, b: string, f: number) {
  const p = hex(a), q = hex(b), u = clamp(f, 0, 1);
  return `rgb(${Math.round(p[0] + (q[0] - p[0]) * u)},${Math.round(p[1] + (q[1] - p[1]) * u)},${Math.round(p[2] + (q[2] - p[2]) * u)})`;
}
const EMOJI = 'system-ui, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
function emo(ctx: CanvasRenderingContext2D, e: string, x: number, y: number, size: number, alpha = 1, rot = 0, flip = false) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#ffffff';
  ctx.font = `${size}px ${EMOJI}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (rot || flip) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    if (flip) ctx.scale(-1, 1);
    ctx.fillText(e, 0, 0);
    ctx.restore();
  } else ctx.fillText(e, x, y);
  ctx.globalAlpha = 1;
}
function bubble(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, size: number, w: number, color = '#3a2a2a') {
  ctx.font = `800 ${size}px system-ui, sans-serif`;
  const tw = ctx.measureText(text).width + size, bx = clamp(x, tw / 2 + 4, w - tw / 2 - 4);
  ctx.fillStyle = 'rgba(255,255,255,.94)';
  ctx.beginPath();
  ctx.roundRect(bx - tw / 2, y - size * 0.85, tw, size * 1.5, size * 0.6);
  ctx.moveTo(x - 4, y + size * 0.6);
  ctx.lineTo(x, y + size * 1.1);
  ctx.lineTo(x + 4, y + size * 0.6);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, bx, y - size * 0.1);
}
/** 판마다 하루가 흐른다: 아침 → 한낮 → 오후 → 노을 → 밤 */
const SKYT = ['#8fd4ff', '#6ec4fb', '#5ab6f3', '#6aa8e8', '#8a9ad8', '#c88a8e', '#7a5a9a', '#0e1534'];
const SKYB = ['#fff0d0', '#e0f4ff', '#d2efff', '#ffeabc', '#ffd6a0', '#ffae7a', '#f08a6a', '#2e2458'];
const DUSK = [0.06, 0, 0, 0.08, 0.2, 0.4, 0.65, 0.2];
type Face = 'calm' | 'strain' | 'wow' | 'dizzy' | 'smug' | 'scared' | 'sad';
interface Look { mode: 'stand' | 'ball' | 'spin'; fd: number; rot: number; face: Face; tower: number[]; lean: number; wob: number; t: number; p: number; night: number }

/** 고슴도치 (x,y = 발밑, u = 한 칸 px). 등에 꽂힌 과일 탑까지 */
function drawHog(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, o: Look) {
  const r = RB * u * 1.3, coat = mix('#7e5230', '#2a1c14', o.night * 0.5), tip = mix('#f0cc94', '#6a5a48', o.night * 0.5), skin = mix('#e9c79c', '#7a6a5a', o.night * 0.45);
  let tx = x, ty = y;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const eyes = (ex: number, ey: number, er: number, face: Face, both: boolean) => {
    const list = both ? [ex - er * 1.6, ex + er * 1.6] : [ex];
    for (const e of list) {
      ctx.strokeStyle = '#1a1008';
      ctx.fillStyle = '#1a1008';
      ctx.lineWidth = Math.max(1.2, er * 0.45);
      ctx.beginPath();
      if (face === 'dizzy') {
        for (let a = 0; a < 10; a += 0.45) ctx.lineTo(e + Math.cos(a + o.t * 0.35) * a * er * 0.12, ey + Math.sin(a + o.t * 0.35) * a * er * 0.12);
        ctx.stroke();
      } else if (face === 'strain') {
        const d = e < ex ? 1 : e > ex ? -1 : 1;
        ctx.moveTo(e - d * er, ey - er * 0.8);
        ctx.lineTo(e + d * er * 0.6, ey);
        ctx.lineTo(e - d * er, ey + er * 0.8);
        ctx.stroke();
      } else if (face === 'smug') {
        ctx.arc(e, ey + er * 0.4, er * 0.9, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();
      } else if (face === 'sad') {
        ctx.arc(e, ey - er * 0.5, er * 0.8, Math.PI * 0.2, Math.PI * 0.8);
        ctx.stroke();
      } else if (face === 'wow' || face === 'scared') {
        ctx.fillStyle = '#ffffff';
        ctx.arc(e, ey, er * 1.45, 0, TAU);
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = '#1a1008';
        ctx.beginPath();
        ctx.arc(e + er * 0.2, ey, er * (face === 'scared' ? 0.4 : 0.75), 0, TAU);
        ctx.fill();
      } else {
        ctx.arc(e, ey, er, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(e + er * 0.35, ey - er * 0.35, er * 0.35, 0, TAU);
        ctx.fill();
      }
    }
  };
  const spikes = (cx: number, cy: number, rr: number, a0: number, a1: number, n: number, sq = 1) => {
    ctx.fillStyle = coat;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n, am = a0 + ((a1 - a0) * (i + 0.5)) / n;
      ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * sq);
      if (i < n) ctx.lineTo(cx + Math.cos(am) * rr * 1.36, cy + Math.sin(am) * rr * 1.36 * sq);
    }
    ctx.lineTo(cx, cy);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = tip;
    ctx.lineWidth = Math.max(1, rr * 0.06);
    ctx.beginPath();
    for (let i = 0; i < n; i += 2) {
      const am = a0 + ((a1 - a0) * (i + 0.5)) / n;
      ctx.moveTo(cx + Math.cos(am) * rr * 1.0, cy + Math.sin(am) * rr * 1.0 * sq);
      ctx.lineTo(cx + Math.cos(am) * rr * 1.28, cy + Math.sin(am) * rr * 1.28 * sq);
    }
    ctx.stroke();
  };
  if (o.mode === 'stand') {
    const cx = x, cy = y - r * 0.82, rx = r * 1.2, ry = r * 0.8;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(o.fd, 1);
    // 발
    ctx.fillStyle = mix('#8a5a3a', '#3a2a20', o.night * 0.5);
    for (const fx0 of [-0.5, 0.5]) (ctx.beginPath(), ctx.ellipse(fx0 * rx, ry * 0.9, r * 0.2, r * 0.12, 0, 0, TAU), ctx.fill());
    // 몸(배)·가시 외투
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, TAU);
    ctx.fill();
    spikes(-r * 0.1, -r * 0.05, r * 1.02, -0.18 * Math.PI, -1.12 * Math.PI, 14, 0.85);
    // 주둥이
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.moveTo(rx * 0.55, -ry * 0.3);
    ctx.quadraticCurveTo(rx * 1.45, ry * 0.05, rx * 1.38, ry * 0.32);
    ctx.quadraticCurveTo(rx * 0.9, ry * 0.75, rx * 0.4, ry * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1a1008';
    ctx.beginPath();
    ctx.arc(rx * 1.38, ry * 0.24, r * 0.12, 0, TAU);
    ctx.fill();
    // 귀·볼
    ctx.fillStyle = mix('#c88a6a', '#5a4038', o.night * 0.5);
    ctx.beginPath();
    ctx.arc(rx * 0.32, -ry * 0.55, r * 0.13, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,120,140,.5)';
    ctx.beginPath();
    ctx.ellipse(rx * 0.78, ry * 0.36, r * 0.14, r * 0.08, 0, 0, TAU);
    ctx.fill();
    eyes(rx * 0.72, -ry * 0.06, r * 0.13, o.face, false);
    // 입
    ctx.strokeStyle = '#3a2010';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    if (o.face === 'scared' || o.face === 'sad') (ctx.moveTo(rx * 0.95, ry * 0.52), ctx.quadraticCurveTo(rx * 1.05, ry * 0.42, rx * 1.15, ry * 0.52));
    else (ctx.moveTo(rx * 0.95, ry * 0.45), ctx.quadraticCurveTo(rx * 1.05, ry * 0.58, rx * 1.18, ry * 0.46));
    ctx.stroke();
    ctx.restore();
    tx = cx - o.fd * rx * 0.25;
    ty = cy - ry * 1.05;
    if (o.face === 'scared') {
      ctx.fillStyle = '#8fd3ff';
      ctx.beginPath();
      ctx.arc(cx + o.fd * rx * 0.9, cy - ry * 0.9 + ((o.t % 30) / 30) * 6, 2.4, 0, TAU);
      ctx.fill();
    }
  } else {
    const cx = x, cy = y - r * 1.02, spin = o.mode === 'spin';
    ctx.save();
    ctx.translate(cx, cy);
    if (spin) ctx.scale(1 + o.p * 0.06, 1 - o.p * 0.08);
    ctx.fillStyle = mix('#5e3c22', '#1c120c', o.night * 0.5);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.98, 0, TAU);
    ctx.fill();
    spikes(0, 0, r * 0.92, o.rot, o.rot + TAU, 20);
    // 둥글게 만 몸 사이로 빼꼼 나온 얼굴
    let fx0 = 0, fy0 = r * 0.25, fw = 1;
    if (spin) (fx0 = Math.sin(o.rot) * r * 0.48), (fw = Math.max(0.15, Math.cos(o.rot)));
    else ctx.rotate(o.rot * 0.35);
    if (!spin || Math.cos(o.rot) > -0.1) {
      ctx.save();
      ctx.translate(fx0, fy0);
      ctx.scale(fw, 1);
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.55, r * 0.42, 0, 0, TAU);
      ctx.fill();
      eyes(0, -r * 0.06, r * 0.1, o.face, true);
      ctx.fillStyle = '#1a1008';
      ctx.beginPath();
      ctx.arc(0, r * 0.18, r * 0.09, 0, TAU);
      ctx.fill();
      if (o.face === 'wow') (ctx.fillStyle = '#5a1e1e'), ctx.beginPath(), ctx.ellipse(0, r * 0.3, r * 0.07, r * 0.06, 0, 0, TAU), ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    if (spin && o.p > 0.05) {
      // 팽이 바람: 하얀 휘익 줄
      ctx.strokeStyle = `rgba(255,255,255,${0.2 + o.p * 0.35})`;
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        const a = o.rot * 1.3 + (i * TAU) / 3;
        ctx.beginPath();
        ctx.ellipse(cx, cy + r * 0.3, r * (1.45 + i * 0.12), r * 0.5, 0, a, a + 1.1 + o.p);
        ctx.stroke();
      }
    }
    tx = cx;
    ty = cy - r * 1.12;
  }
  // 과일 탑: 가시에 꽂혀 흔들흔들
  const n = o.tower.length;
  if (n) {
    const gap = u * Math.min(0.44, 3.4 / n), fs = u * 0.6;
    const pos: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      const q = i + 1, sway = (o.lean * 0.1 + Math.sin(o.t / 6 + i * 0.8) * (0.012 + o.wob * 0.07)) * q * (1 + q * 0.06);
      pos.push([tx + sway * u, ty - (i + 0.5) * gap]);
    }
    ctx.strokeStyle = mix('#3a2412', '#1a120c', o.night * 0.5);
    ctx.lineWidth = Math.max(1.5, u * 0.07);
    ctx.beginPath();
    ctx.moveTo(tx, ty + gap * 0.6);
    for (const [px, py] of pos) ctx.lineTo(px, py);
    ctx.lineTo(pos[n - 1][0] + (pos[n - 1][0] - tx) * 0.08, pos[n - 1][1] - gap * 0.75);
    ctx.stroke();
    for (let i = 0; i < n; i++) emo(ctx, FRUIT[o.tower[i]], pos[i][0], pos[i][1], fs * (o.tower[i] === MELON ? 1.25 : 1), 1, (pos[i][0] - tx) / (u * 3) + Math.sin(i * 2.3) * 0.2);
  }
}

/** 할머니 (x,y = 흔들의자 발밑) */
function drawGrandma(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, mood: 'calm' | 'happy' | 'angry' | 'sleep', t: number, night: number) {
  const rock = mood === 'calm' || mood === 'sleep' ? Math.sin(t / 38) * 0.06 : 0, hop = mood === 'happy' ? Math.abs(Math.sin(t / 5)) * u * 0.12 : 0, shake = mood === 'angry' ? Math.sin(t * 0.9) * u * 0.04 : 0;
  ctx.save();
  ctx.translate(x + shake, y);
  ctx.rotate(rock);
  const wood = mix('#8a5432', '#3a2418', night * 0.5);
  // 흔들의자
  ctx.strokeStyle = wood;
  ctx.lineWidth = u * 0.08;
  ctx.beginPath();
  ctx.arc(0, -u * 1.6, u * 1.62, Math.PI * 0.38, Math.PI * 0.62);
  ctx.stroke();
  ctx.fillStyle = wood;
  ctx.fillRect(-u * 0.45, -u * 1.45, u * 0.08, u * 1.4);
  ctx.fillRect(u * 0.37, -u * 0.55, u * 0.08, u * 0.5);
  ctx.fillRect(-u * 0.45, -u * 0.58, u * 0.9, u * 0.1);
  for (let i = 0; i < 3; i++) ctx.fillRect(-u * 0.45 + i * u * 0.02, -u * 1.45 + i * u * 0.28, u * 0.1, u * 0.06);
  ctx.translate(0, -hop);
  // 몸 (분홍 가디건) · 무릎 담요
  const pink = mix('#ec8aa8', '#5a3a4a', night * 0.45);
  ctx.fillStyle = pink;
  ctx.beginPath();
  ctx.moveTo(-u * 0.36, -u * 0.55);
  ctx.quadraticCurveTo(-u * 0.42, -u * 1.25, -u * 0.05, -u * 1.25);
  ctx.quadraticCurveTo(u * 0.3, -u * 1.25, u * 0.28, -u * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = mix('#8a7ad8', '#3a3460', night * 0.45);
  ctx.beginPath();
  ctx.roundRect(-u * 0.3, -u * 0.72, u * 0.75, u * 0.3, u * 0.1);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  for (let i = 0; i < 3; i++) ctx.fillRect(-u * 0.22 + i * u * 0.22, -u * 0.7, u * 0.06, u * 0.26);
  // 머리
  const hx = -u * 0.04, hy = -u * 1.5, hr = u * 0.27;
  ctx.fillStyle = mood === 'angry' ? mix('#ff9a8a', '#5a3a34', night * 0.4) : mix('#f7d4b4', '#6a5a50', night * 0.4);
  ctx.beginPath();
  ctx.arc(hx, hy, hr, 0, TAU);
  ctx.fill();
  ctx.fillStyle = mix('#e4e2ea', '#6a6878', night * 0.4);
  ctx.beginPath();
  ctx.arc(hx, hy - hr * 0.25, hr * 1.02, Math.PI * 1.05, Math.PI * 1.95);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(hx, hy - hr * 1.2, hr * 0.42, 0, TAU);
  ctx.fill();
  // 안경·눈·입
  ctx.strokeStyle = '#4a3a3a';
  ctx.lineWidth = 1.1;
  for (const sx of [-1, 1]) (ctx.beginPath(), ctx.arc(hx + sx * hr * 0.42, hy + hr * 0.05, hr * 0.27, 0, TAU), ctx.stroke());
  ctx.lineWidth = 1.3;
  ctx.strokeStyle = '#2a1a1a';
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    if (mood === 'angry') (ctx.moveTo(hx + sx * hr * 0.62, hy - hr * 0.28), ctx.lineTo(hx + sx * hr * 0.2, hy - hr * 0.12));
    else if (mood === 'sleep') (ctx.moveTo(hx + sx * hr * 0.55, hy + hr * 0.05), ctx.lineTo(hx + sx * hr * 0.28, hy + hr * 0.05));
    else ctx.arc(hx + sx * hr * 0.42, hy + hr * 0.12, hr * 0.15, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  }
  ctx.beginPath();
  if (mood === 'angry') ctx.ellipse(hx, hy + hr * 0.58, hr * 0.18, hr * 0.13, 0, 0, TAU), ctx.stroke();
  else ctx.arc(hx, hy + hr * 0.4, hr * 0.22, 0.2, Math.PI - 0.2), ctx.stroke();
  ctx.fillStyle = 'rgba(255,110,120,.45)';
  for (const sx of [-1, 1]) (ctx.beginPath(), ctx.ellipse(hx + sx * hr * 0.62, hy + hr * 0.42, hr * 0.16, hr * 0.1, 0, 0, TAU), ctx.fill());
  // 팔: 뜨개질 · 만세 · 빗자루 휘두르기
  ctx.strokeStyle = pink;
  ctx.lineWidth = u * 0.13;
  ctx.beginPath();
  if (mood === 'happy') {
    const wv = Math.sin(t / 4) * 0.3;
    ctx.moveTo(-u * 0.3, -u * 1.1), ctx.lineTo(-u * 0.55, -u * 1.65 + wv * u * 0.2);
    ctx.moveTo(u * 0.22, -u * 1.1), ctx.lineTo(u * 0.48, -u * 1.65 - wv * u * 0.2);
    ctx.stroke();
  } else if (mood === 'angry') {
    const sw = Math.sin(t * 0.6) * 0.5;
    ctx.moveTo(u * 0.22, -u * 1.1), ctx.lineTo(u * 0.5, -u * 1.55);
    ctx.stroke();
    ctx.save();
    ctx.translate(u * 0.5, -u * 1.55);
    ctx.rotate(-0.4 + sw);
    ctx.fillStyle = mix('#a8743a', '#4a3420', night * 0.4);
    ctx.fillRect(-u * 0.03, -u * 0.9, u * 0.06, u * 1.1);
    ctx.fillStyle = mix('#e8c050', '#5a4a24', night * 0.4);
    ctx.beginPath();
    ctx.moveTo(-u * 0.05, -u * 0.9);
    ctx.lineTo(-u * 0.22, -u * 1.35);
    ctx.lineTo(u * 0.22, -u * 1.35);
    ctx.lineTo(u * 0.05, -u * 0.9);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = pink;
    ctx.beginPath();
    ctx.moveTo(-u * 0.3, -u * 1.1), ctx.lineTo(-u * 0.32, -u * 0.8);
    ctx.stroke();
  } else {
    ctx.moveTo(-u * 0.3, -u * 1.05), ctx.lineTo(-u * 0.05, -u * 0.85);
    ctx.moveTo(u * 0.22, -u * 1.05), ctx.lineTo(u * 0.02, -u * 0.85);
    ctx.stroke();
    if (mood === 'calm') {
      const k = Math.sin(t / 7) * u * 0.05;
      ctx.strokeStyle = '#c8c8d0';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(-u * 0.15 + k, -u * 1.0), ctx.lineTo(u * 0.12 + k, -u * 0.75);
      ctx.moveTo(u * 0.1 - k, -u * 1.0), ctx.lineTo(-u * 0.14 - k, -u * 0.75);
      ctx.stroke();
      ctx.fillStyle = '#e8484a';
      ctx.beginPath();
      ctx.arc(-u * 0.02, -u * 0.84, u * 0.09, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawGarden(ctx: CanvasRenderingContext2D, s: HedgeState, w: number, h: number, th: Theme) {
  const fx = juice(s), b = s.b, bd = s.bd, k = s.k, d = ST[k], R = (q: number) => q * w, F = (q: number) => Math.max(12, q * w);
  const S = w * 0.088, YS = 0.57, MG = 0.6, PB = -1.8;
  const top = R(0.13), bot = h - R(0.115);
  const faceH = S * 0.62, yFront = bot - S * 0.4 - faceH;
  const gy0 = yFront - (GD + MG) * S * YS;
  const dep = (y: number) => 0.87 + 0.13 * clamp((y - PB) / (GD + MG - PB), 0, 1);
  const P = (x: number, y: number, z = 0): [number, number] => {
    const q = dep(y);
    return [w / 2 + (x - GW / 2) * S * q, gy0 + y * S * YS - z * S * q];
  };
  const U = (y: number) => S * dep(y);
  const poly = (pts: [number, number][], fill: string | CanvasGradient) => {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  };
  const shadow = (x: number, y: number, rx: number, al = 0.28) => {
    const [px, py] = P(x + 0.08, y + 0.05);
    ctx.fillStyle = `rgba(30,40,10,${al})`;
    ctx.beginPath();
    ctx.ellipse(px, py, rx * U(y), rx * U(y) * YS * 0.85, 0, 0, TAU);
    ctx.fill();
  };
  const night = k === STAGES - 1 ? 1 : 0, dusk = DUSK[k], t = s.t;
  const recent = (kind: string, within: number) => {
    for (let i = s.events.length - 1; i >= 0; i--) if (s.events[i].kind === kind && t - s.events[i].t < within) return s.events[i];
    return null;
  };
  ctx.save();
  fx.begin(ctx);
  // ── 하늘 ──
  const yWall = P(0, PB, 0.4)[1];
  const sky = ctx.createLinearGradient(0, 0, 0, yWall);
  sky.addColorStop(0, SKYT[k]);
  sky.addColorStop(1, SKYB[k]);
  ctx.fillStyle = sky;
  ctx.fillRect(-12, -12, w + 24, yWall + 24);
  if (night) {
    for (let i = 0; i < 36; i++) {
      ctx.fillStyle = `rgba(255,255,230,${0.3 + 0.5 * Math.abs(Math.sin(t / 30 + i))})`;
      ctx.fillRect(hsh(i * 3) * w, top + hsh(i * 5 + 1) * (yWall - top), 1.6, 1.6);
    }
    ctx.fillStyle = '#fff4c8';
    ctx.shadowColor = '#fff4c8';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(w * 0.86, top + R(0.07), R(0.045), 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = SKYT[k];
    ctx.beginPath();
    ctx.arc(w * 0.86 + R(0.02), top + R(0.06), R(0.04), 0, TAU);
    ctx.fill();
  } else {
    const f = k / (STAGES - 2), sx = w * (0.1 + 0.8 * f), sy = top + R(0.05) + Math.abs(f - 0.45) * R(0.08);
    const sun = mix('#fff6c0', '#ff8a4a', f);
    const gl = ctx.createRadialGradient(sx, sy, 2, sx, sy, R(0.22));
    gl.addColorStop(0, sun);
    gl.addColorStop(0.2, sun);
    gl.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = gl;
    ctx.beginPath();
    ctx.arc(sx, sy, R(0.22), 0, TAU);
    ctx.fill();
  }
  for (let i = 0; i < 3; i++) {
    const cx = ((hsh(i + 11) * w + t * (0.07 + i * 0.03)) % (w + 120)) - 60, cy = top + R(0.03) + i * R(0.035);
    ctx.fillStyle = night ? 'rgba(120,120,170,.22)' : `rgba(255,255,255,${0.75 - dusk * 0.3})`;
    for (const [dx, dy, rr] of [[0, 0, 0.035], [0.035, -0.012, 0.028], [-0.034, -0.004, 0.026], [0.065, 0.004, 0.02]]) (ctx.beginPath(), ctx.arc(cx + R(dx), cy + R(dy), R(rr), 0, TAU), ctx.fill());
  }
  {
    const mg = ctx.createLinearGradient(0, yWall - 4, 0, yFront + faceH);
    mg.addColorStop(0, mix('#a8d88a', '#1a2a30', night * 0.75 + dusk * 0.35));
    mg.addColorStop(1, mix('#6aa85a', '#0e1a1e', night * 0.75 + dusk * 0.35));
    ctx.fillStyle = mg;
    ctx.fillRect(-12, yWall - 4, w + 24, yFront + faceH - yWall + 8);
  }
  // 먼 나무들 (집 양옆)
  for (let i = 0; i < 7; i++) {
    const tx0 = (i / 6) * w + (hsh(i) - 0.5) * R(0.06), ty0 = yWall - R(0.01), tr = R(0.06 + hsh(i + 7) * 0.035);
    ctx.fillStyle = mix(mix('#5aa84a', '#3a6a4a', i % 2 ? 0.3 : 0), '#1a2a30', night * 0.7 + dusk * 0.3);
    ctx.beginPath();
    ctx.arc(tx0, ty0 - tr * 0.6, tr, 0, TAU);
    ctx.arc(tx0 + tr * 0.6, ty0 - tr * 0.2, tr * 0.7, 0, TAU);
    ctx.fill();
  }
  // ── 받침대 (나무 진열대) · 흙 덩어리 그림자 ──
  const yTab = yFront + faceH;
  const tb = ctx.createLinearGradient(0, yTab, 0, h);
  tb.addColorStop(0, mix('#a8744a', '#3a2818', night * 0.6));
  tb.addColorStop(1, mix('#5a3820', '#1a120c', night * 0.6));
  ctx.fillStyle = tb;
  ctx.fillRect(-12, yTab - 2, w + 24, h - yTab + 14);
  ctx.strokeStyle = 'rgba(0,0,0,.14)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const gy = yTab + 6 + i * 7;
    ctx.beginPath();
    ctx.moveTo(0, gy);
    for (let px = 0; px <= w; px += 20) ctx.lineTo(px, gy + Math.sin(px / 37 + i * 2) * 1.2);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(20,10,0,.35)';
  ctx.beginPath();
  ctx.ellipse(w / 2 + 6, yTab + 4, (GW + 2 * MG) * S * 0.52, S * 0.35, 0, 0, TAU);
  ctx.fill();
  // ── 집 벽 · 창문 · 문 · 처마 ──
  const L = -MG, Rr = GW + MG;
  {
    const [wl, wb] = P(L, PB, 0.4), [wr] = P(Rr, PB, 0.4), wt = top + R(0.022);
    const wall = ctx.createLinearGradient(0, wt, 0, wb);
    wall.addColorStop(0, mix('#f4e2c0', '#3a3448', night * 0.6 + dusk * 0.2));
    wall.addColorStop(1, mix('#e8d0a4', '#2e2a3c', night * 0.6 + dusk * 0.2));
    ctx.fillStyle = wall;
    ctx.fillRect(wl, wt, wr - wl, wb - wt);
    ctx.strokeStyle = 'rgba(120,90,50,.18)';
    for (let y0 = wt + 6; y0 < wb; y0 += 6) (ctx.beginPath(), ctx.moveTo(wl, y0), ctx.lineTo(wr, y0), ctx.stroke());
    // 처마
    ctx.fillStyle = mix('#b8543a', '#4a2430', night * 0.5);
    ctx.fillRect(wl - 6, top - 2, wr - wl + 12, R(0.03));
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    ctx.fillRect(wl, top - 2 + R(0.03), wr - wl, 3);
    const lit = night > 0 || dusk > 0.35;
    // 창문 (왼쪽) + 꽃 상자
    const [w0x, w0y] = P(1.0, PB, 1.95), [w1x, w1y] = P(2.7, PB, 0.95);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(w0x - 3, w0y - 3, w1x - w0x + 6, w1y - w0y + 6);
    const glass = ctx.createLinearGradient(0, w0y, 0, w1y);
    glass.addColorStop(0, lit ? '#ffe08a' : '#a8d8f8');
    glass.addColorStop(1, lit ? '#ffb850' : '#6ab0e0');
    ctx.fillStyle = glass;
    if (lit) (ctx.shadowColor = '#ffc860'), (ctx.shadowBlur = 16);
    ctx.fillRect(w0x, w0y, w1x - w0x, w1y - w0y);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,140,160,.7)';
    ctx.fillRect(w0x, w0y, (w1x - w0x) * 0.22, w1y - w0y);
    ctx.fillRect(w1x - (w1x - w0x) * 0.22, w0y, (w1x - w0x) * 0.22, w1y - w0y);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect((w0x + w1x) / 2 - 1, w0y, 2, w1y - w0y);
    ctx.fillStyle = mix('#a8643a', '#3a2418', night * 0.5);
    ctx.fillRect(w0x - 4, w1y + 2, w1x - w0x + 8, R(0.018));
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = ['#ff5a6a', '#ffd23f', '#ff8ac8'][i % 3];
      ctx.beginPath();
      ctx.arc(w0x + (i + 0.5) * ((w1x - w0x) / 6), w1y + 1, R(0.009), 0, TAU);
      ctx.fill();
    }
    // 문 (가운데) + 등
    const [d0x, d0y] = P(GW / 2 - 0.55, PB, 2.0), [d1x, d1y] = P(GW / 2 + 0.55, PB, 0.4);
    ctx.fillStyle = mix('#4a8a5a', '#1e3a2a', night * 0.5);
    ctx.beginPath();
    ctx.roundRect(d0x, d0y, d1x - d0x, d1y - d0y, [6, 6, 0, 0]);
    ctx.fill();
    ctx.fillStyle = lit ? '#ffd88a' : 'rgba(200,230,255,.7)';
    ctx.fillRect(d0x + (d1x - d0x) * 0.25, d0y + (d1y - d0y) * 0.12, (d1x - d0x) * 0.5, (d1y - d0y) * 0.22);
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.arc(d1x - (d1x - d0x) * 0.18, d0y + (d1y - d0y) * 0.6, 1.8, 0, TAU);
    ctx.fill();
    const [lx, ly] = P(GW / 2 + 0.95, PB, 1.7);
    ctx.fillStyle = '#3a3030';
    ctx.fillRect(lx - 1, ly - 4, 2, 5);
    ctx.fillStyle = lit ? '#fff0a0' : '#f8f0d0';
    if (lit) (ctx.shadowColor = '#ffe080'), (ctx.shadowBlur = 20);
    ctx.beginPath();
    ctx.arc(lx, ly + 4, R(0.012), 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  // ── 툇마루 (뒤쪽 나무 마루, 앞면이 바구니 쪽 쿠션) ──
  {
    poly([P(L, PB, 0.4), P(Rr, PB, 0.4), P(Rr, 0, 0.4), P(L, 0, 0.4)], mix('#c8925a', '#4a3424', night * 0.55 + dusk * 0.15));
    ctx.strokeStyle = 'rgba(90,50,20,.3)';
    ctx.lineWidth = 1;
    for (let q = PB + 0.45; q < 0; q += 0.45) (ctx.beginPath(), ctx.moveTo(...P(L, q, 0.4)), ctx.lineTo(...P(Rr, q, 0.4)), ctx.stroke());
    poly([P(L, 0, 0.4), P(Rr, 0, 0.4), P(Rr, 0, 0), P(L, 0, 0)], mix('#9a6436', '#30200f', night * 0.55));
    // 계단 (가운데)
    poly([P(GW / 2 - 0.9, -0.05, 0.4), P(GW / 2 + 0.9, -0.05, 0.4), P(GW / 2 + 0.9, 0.22, 0.2), P(GW / 2 - 0.9, 0.22, 0.2)], mix('#d8a46a', '#504030', night * 0.55));
    poly([P(GW / 2 - 0.9, 0.22, 0.2), P(GW / 2 + 0.9, 0.22, 0.2), P(GW / 2 + 0.9, 0.22, 0), P(GW / 2 - 0.9, 0.22, 0)], mix('#9a6436', '#30200f', night * 0.55));
  }
  // 할머니 (마루 오른쪽 흔들의자)
  const mood: 'calm' | 'happy' | 'angry' | 'sleep' = t - s.angry < 130 ? 'angry' : t - s.happy < 100 || (s.phase === 'pause' && s.cleared) ? 'happy' : s.phase === 'aim' && s.aimT > 420 ? 'sleep' : 'calm';
  const [gmx, gmy] = P(GW / 2 + 2.6, -0.9, 0.4);
  drawGrandma(ctx, gmx, gmy, U(-0.9), mood, t, night);
  if (mood === 'sleep') {
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 ${F(0.034)}px system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText('z', gmx + U(0) * 0.35 + Math.sin(t / 20) * 2, gmy - U(0) * 1.9 - ((t / 2) % 12));
  }
  // ── 정원 윗면: 화단 띠 · 잔디 (깎은 줄무늬) ──
  poly([P(L, 0), P(Rr, 0), P(Rr, GD + MG), P(L, GD + MG)], mix('#7a5232', '#2a1c14', night * 0.6));
  for (let i = 0; i < GW; i++) {
    const lawn = mix(i % 2 ? '#8ccf5a' : '#7cc24e', '#24402a', night * 0.62 + dusk * 0.12);
    poly([P(i, 0), P(i + 1, 0), P(i + 1, GD), P(i, GD)], lawn);
  }
  {
    const lg = ctx.createLinearGradient(0, P(0, 0)[1], 0, P(0, GD)[1]);
    lg.addColorStop(0, 'rgba(255,255,220,.12)');
    lg.addColorStop(1, 'rgba(0,40,0,.08)');
    poly([P(0, 0), P(GW, 0), P(GW, GD), P(0, GD)], lg);
  }
  ctx.strokeStyle = mix('#4f8a32', '#15281a', night * 0.6);
  ctx.lineWidth = 1;
  for (let i = 0; i < 70; i++) {
    const gx = hsh(i * 13) * GW, gy = hsh(i * 17 + 5) * GD, [px, py] = P(gx, gy);
    ctx.beginPath();
    ctx.moveTo(px - 2, py);
    ctx.lineTo(px - 1, py - 3);
    ctx.moveTo(px + 1, py);
    ctx.lineTo(px + 2, py - 2.5);
    ctx.stroke();
    if (i % 9 === 0) (ctx.fillStyle = night ? '#6a6a50' : '#ffffff'), ctx.beginPath(), ctx.arc(px, py - 1, 1.6, 0, TAU), ctx.fill(), (ctx.fillStyle = '#ffd23f'), ctx.fillRect(px - 0.5, py - 1.5, 1, 1);
  }
  // 화단 꽃 (양옆·앞)
  const flower = (x: number, y: number, i: number) => {
    const [px, py] = P(x, y), u = U(y), sw = Math.sin(t / 25 + i) * 1.2;
    ctx.strokeStyle = mix('#3a8a2a', '#123018', night * 0.6);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + sw, py - u * 0.42);
    ctx.stroke();
    ctx.fillStyle = mix(['#ff4a6a', '#ffd23f', '#ff8ac8', '#ffffff', '#b07aff'][i % 5], '#3a3048', night * 0.5);
    ctx.beginPath();
    ctx.ellipse(px + sw, py - u * 0.48, u * 0.11, u * 0.13, 0, 0, TAU);
    ctx.fill();
  };
  // ── 연못 ──
  if (bd.pond) {
    const p = bd.pond, [cx, cy] = P(p.x, p.y), u = U(p.y), rx = p.rx * u, ry = p.ry * u * YS;
    ctx.fillStyle = mix('#8a8a80', '#3a3a40', night * 0.5);
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2, rx + u * 0.18, ry + u * 0.14, 0, 0, TAU);
    ctx.fill();
    const pg = ctx.createRadialGradient(cx - rx * 0.2, cy - ry * 0.2, 2, cx, cy, rx);
    pg.addColorStop(0, mix('#6ad0f0', '#1a3a60', night * 0.6));
    pg.addColorStop(1, mix('#2a86c0', '#0a1e3a', night * 0.6));
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU);
    ctx.fill();
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU, [sx2, sy2] = [cx + Math.cos(a) * (rx + u * 0.1), cy + Math.sin(a) * (ry + u * 0.07) + 1];
      ctx.fillStyle = mix(i % 2 ? '#b8b4a8' : '#9a968c', '#3a3a40', night * 0.5);
      ctx.beginPath();
      ctx.ellipse(sx2, sy2, u * 0.16, u * 0.1, a, 0, TAU);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,.45)';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 2; i++) {
      const ph = ((t + i * 45) % 90) / 90;
      ctx.globalAlpha = 1 - ph;
      ctx.beginPath();
      ctx.ellipse(cx + rx * 0.25 * (i ? -1 : 1), cy + ry * 0.1, rx * 0.4 * ph, ry * 0.4 * ph, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < bd.fx.length; i++) {
      if (!bd.fpad[i] || bd.fb[i] > -999) continue;
      const [lx, ly] = P(bd.fx[i], bd.fy[i]);
      ctx.fillStyle = mix('#4aa83a', '#183a20', night * 0.5);
      ctx.beginPath();
      ctx.ellipse(lx, ly + 2, u * 0.36, u * 0.36 * YS, 0, 0.3, TAU - 0.1);
      ctx.lineTo(lx, ly + 2);
      ctx.fill();
    }
  }
  if (bd.pond) {
    const p = bd.pond, a = -0.55, [qx, qy] = P(p.x + Math.cos(a) * (p.rx + 0.1), p.y + Math.sin(a) * (p.ry + 0.1)), u = U(p.y), sp2 = recent('splash', 60);
    const jump = sp2 ? Math.abs(Math.sin((t - sp2.t) / 6)) * u * 0.7 : (t % 260) < 20 ? Math.sin(((t % 260) / 20) * Math.PI) * u * 0.3 : 0;
    emo(ctx, '🐸', qx, qy - u * 0.25 - jump, u * 0.55);
    if (sp2) bubble(ctx, qx, qy - u * 0.95 - jump, '개굴?!', F(0.032), w);
  }
  // ── 두더지 굴 ──
  const holeEv = recent('hole', 50);
  for (let i = 0; i < bd.holes.length; i += 2) {
    const [hx, hy] = P(bd.holes[i], bd.holes[i + 1]), u = U(bd.holes[i + 1]);
    ctx.fillStyle = mix('#8a5a34', '#2a1a10', night * 0.6);
    ctx.beginPath();
    ctx.ellipse(hx, hy, u * 0.55, u * 0.32, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#1a0e06';
    ctx.beginPath();
    ctx.ellipse(hx, hy + 1, u * 0.32, u * 0.17, 0, 0, TAU);
    ctx.fill();
    const peek = holeEv ? 1 - (t - holeEv.t) / 50 : (t + i * 90) % 300 < 40 ? Math.sin((((t + i * 90) % 300) / 40) * Math.PI) * 0.6 : 0;
    if (peek > 0) {
      const my = hy - u * 0.25 * peek;
      ctx.fillStyle = mix('#6a5a5a', '#2a2424', night * 0.5);
      ctx.beginPath();
      ctx.arc(hx, my, u * 0.22, Math.PI, TAU);
      ctx.fill();
      ctx.fillStyle = '#ff9aaa';
      ctx.beginPath();
      ctx.arc(hx, my - u * 0.02, u * 0.06, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#000';
      for (const sx of [-1, 1]) (ctx.beginPath(), ctx.arc(hx + sx * u * 0.09, my - u * 0.1, 1.2, 0, TAU), ctx.fill());
    }
  }
  // ── 미리 보기 (누르는 중): 이대로 떼면 굴러갈 길 ──
  const pvF = new Set<number>(), pvP = new Set<number>();
  let pvDeliver = 0, pvSplash = false, pvPeck = false;
  if (s.phase === 'aim' && s.charge > 0) {
    const path: number[] = [];
    let bounces = 0, cut = -1;
    simulate(b, bd, s.ang, s.charge, s.sT + 1, (kind, _x, _y, n) => {
      if (cut >= 0) return;
      if (kind === 'pick') {
        for (let i = 0; i < bd.fx.length; i++) if (bd.fa[i] && Math.abs(bd.fx[i] - _x) < 1e-9 && Math.abs(bd.fy[i] - _y) < 1e-9) pvF.add(i);
      } else if (kind === 'pot') pvP.add(n!);
      else if (kind === 'deliver') pvDeliver = n!;
      else if (kind === 'splash') pvSplash = true;
      else if (kind === 'peck') pvPeck = true;
      else if (kind === 'bounce' && ++bounces >= 3) cut = path.length;
    }, path);
    const end = cut >= 0 ? cut : path.length;
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    for (let i = 0; i + 1 < end; i += 4) {
      const [px, py] = P(path[i], path[i + 1]), fade = 1 - i / Math.max(8, end);
      ctx.globalAlpha = 0.35 + 0.6 * fade;
      ctx.beginPath();
      ctx.arc(px, py, 1.6 + fade * 1.4, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (end >= 2) {
      const [ex, ey] = P(path[end - 2], path[end - 1]), u = U(path[end - 1]);
      ctx.strokeStyle = pvSplash ? '#6ad0ff' : '#ffffff';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.ellipse(ex, ey, u * RB, u * RB * YS, 0, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  // ── 울타리 (양옆 하얀 말뚝) ──
  const fence = (x: number) => {
    const white = mix('#ffffff', '#5a5a6a', night * 0.6 + dusk * 0.15);
    ctx.strokeStyle = mix('#d8d4c8', '#3a3a48', night * 0.6);
    ctx.lineWidth = 2;
    for (const z of [0.22, 0.48]) (ctx.beginPath(), ctx.moveTo(...P(x, 0, z)), ctx.lineTo(...P(x, GD, z)), ctx.stroke());
    for (let y = 0.15; y < GD; y += 0.55) {
      const [px, py] = P(x, y), u = U(y), pw = u * 0.075, ph = u * 0.62;
      ctx.fillStyle = 'rgba(0,0,0,.18)';
      ctx.fillRect(px - pw + (x > 1 ? -2 : 2), py - 1, pw * 2, 2);
      ctx.fillStyle = white;
      ctx.beginPath();
      ctx.moveTo(px - pw, py);
      ctx.lineTo(px - pw, py - ph);
      ctx.lineTo(px, py - ph - pw * 1.4);
      ctx.lineTo(px + pw, py - ph);
      ctx.lineTo(px + pw, py);
      ctx.fill();
    }
  };
  fence(-0.06);
  fence(GW + 0.06);
  for (let i = 0; i < 9; i++) flower(-MG * 0.5 + (i % 2) * 0.12, 0.6 + i * 1.15, i), flower(GW + MG * 0.5 - (i % 2) * 0.12, 1.1 + i * 1.12, i + 3);
  // 구경꾼: 울타리 위 고양이 · 새
  {
    const pot = recent('pot', 70), big = recent('bounce', 40), del = recent('deliver', 80);
    const [cx, cy] = P(-0.06, 1.0, 0.72), u = U(1);
    const jump = pot || (big && big.n! > 0.15) ? Math.abs(Math.sin((t - (pot ?? big)!.t) / 5)) * u * 0.6 : 0;
    emo(ctx, '🐈', cx, cy - u * 0.25 - jump, u * 0.62, 1, 0, true);
    if (pot && t - pot.t < 60) bubble(ctx, cx + u * 0.4, cy - u * 1.1 - jump, '냥?!', F(0.032), w);
    else if (del && t - del.t < 70) bubble(ctx, cx + u * 0.4, cy - u * 1.0, '냐아~', F(0.032), w);
    const [bx2, by2] = P(GW + 0.06, 3.2, 0.72), fly = pot ? (t - pot.t) * 1.8 : 0;
    emo(ctx, '🐦', bx2 + fly * 0.6, by2 - u * 0.2 - fly, u * 0.5, fly > 60 ? 0 : 1, 0, false);
    if (!night) {
      const ax = GW * 0.5 + Math.sin(t / 90) * 4.2, ay = 2 + Math.sin(t / 47) * 1.6, [px, py] = P(ax, ay, 1.6 + Math.sin(t / 9) * 0.2);
      emo(ctx, '🦋', px, py, u * 0.4, 0.95, Math.sin(t / 5) * 0.3);
    }
  }
  // ── 정원 위의 것들: 뒤에서 앞으로 ──
  const items: [number, () => void][] = [];
  const bob = (i: number) => Math.sin(t / 18 + i * 1.7) * 0.03;
  for (let i = 0; i < bd.fx.length; i++) {
    if (!bd.fa[i]) continue;
    const age = s.sT - bd.fb[i];
    if (age >= 0 && age < 22) continue; // 우르르 날아가는 중
    items.push([bd.fy[i], () => {
      const fy0 = bd.fy[i], u = U(fy0), big = bd.fk[i] === MELON ? 1.3 : 1;
      if (!bd.fpad[i]) shadow(bd.fx[i], fy0, 0.2 * big);
      const [px, py] = P(bd.fx[i], fy0, 0.24 * big + bob(i) + (bd.fpad[i] ? 0.02 : 0));
      if (pvF.has(i)) {
        ctx.strokeStyle = `rgba(255,236,120,${0.6 + 0.4 * Math.sin(t / 3)})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(px, py, u * 0.36 * big, 0, TAU);
        ctx.stroke();
      }
      emo(ctx, FRUIT[bd.fk[i]], px, py, u * 0.64 * big);
    }]);
  }
  for (let i = 0; i < bd.px.length; i++)
    items.push([bd.py[i], () => {
      const x = bd.px[i], y = bd.py[i], u = U(y), [px, py] = P(x, y), alive = bd.pa[i];
      shadow(x, y, 0.32);
      const terra = mix('#d0703a', '#4a2a1a', night * 0.5), terra2 = mix('#a8542a', '#3a2010', night * 0.5);
      if (alive) {
        const pw = u * 0.3, ph = u * 0.42;
        poly([[px - pw, py - ph], [px + pw, py - ph], [px + pw * 0.72, py], [px - pw * 0.72, py]], terra);
        poly([[px, py - ph], [px + pw, py - ph], [px + pw * 0.72, py], [px, py]], 'rgba(0,0,0,.12)');
        ctx.fillStyle = terra2;
        ctx.fillRect(px - pw * 1.08, py - ph - u * 0.1, pw * 2.16, u * 0.12);
        ctx.fillStyle = mix('#3e9a3a', '#123018', night * 0.5);
        for (const [lx, ly, lr] of [[-0.14, -0.62, 0.13], [0.15, -0.6, 0.12], [0, -0.75, 0.13]]) (ctx.beginPath(), ctx.ellipse(px + lx * u, py + ly * u, lr * u, lr * u * 0.7, lx * 3, 0, TAU), ctx.fill());
        const fc = mix(['#ff4a6a', '#ffd23f', '#b07aff'][i % 3], '#3a3048', night * 0.5);
        ctx.fillStyle = fc;
        for (let q = 0; q < 5; q++) (ctx.beginPath(), ctx.arc(px + Math.cos((q / 5) * TAU) * u * 0.09, py - u * 0.92 + Math.sin((q / 5) * TAU) * u * 0.07, u * 0.07, 0, TAU), ctx.fill());
        ctx.fillStyle = '#fff6a0';
        ctx.beginPath();
        ctx.arc(px, py - u * 0.92, u * 0.05, 0, TAU);
        ctx.fill();
        if (pvP.has(i)) {
          ctx.font = `900 ${u * 0.6}px system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.lineWidth = 3;
          ctx.strokeStyle = '#ffffff';
          ctx.strokeText('!', px, py - u * 1.25);
          ctx.fillStyle = '#e8202a';
          ctx.fillText('!', px, py - u * 1.25);
        }
      } else {
        // 깨진 화분: 조각과 흙, 쓰러진 꽃
        ctx.fillStyle = mix('#6a4a2a', '#2a1a10', night * 0.5);
        ctx.beginPath();
        ctx.ellipse(px, py - 1, u * 0.34, u * 0.14, 0, 0, TAU);
        ctx.fill();
        for (const [ox, oy, rr] of [[-0.3, 0.02, 0.6], [0.28, -0.04, -0.4], [0.05, 0.1, 1.2]]) {
          ctx.save();
          ctx.translate(px + ox * u, py + oy * u);
          ctx.rotate(rr);
          ctx.fillStyle = terra;
          ctx.fillRect(-u * 0.1, -u * 0.06, u * 0.2, u * 0.12);
          ctx.restore();
        }
        ctx.fillStyle = mix(['#ff4a6a', '#ffd23f', '#b07aff'][i % 3], '#3a3048', night * 0.5);
        ctx.beginPath();
        ctx.arc(px + u * 0.25, py - u * 0.08, u * 0.08, 0, TAU);
        ctx.fill();
      }
    }]);
  const boing = recent('boing', 24);
  for (let i = 0; i < bd.pumps.length; i += 2)
    items.push([bd.pumps[i + 1], () => {
      const x = bd.pumps[i], y = bd.pumps[i + 1], u = U(y), [px, py] = P(x, y);
      const sq = boing && boing.n === i / 2 ? Math.sin(((t - boing.t) / 24) * Math.PI * 3) * (1 - (t - boing.t) / 24) * 0.25 : 0;
      shadow(x, y, 0.45);
      const rw = u * 0.5 * (1 + sq), rh = u * 0.38 * (1 - sq);
      const og = ctx.createRadialGradient(px - rw * 0.3, py - rh * 1.3, 1, px, py - rh, rw * 1.2);
      og.addColorStop(0, mix('#ffb04a', '#5a3018', night * 0.4));
      og.addColorStop(1, mix('#e0661a', '#3a1a0a', night * 0.4));
      ctx.fillStyle = og;
      for (const ox of [-0.5, 0, 0.5]) (ctx.beginPath(), ctx.ellipse(px + ox * rw, py - rh, rw * 0.55, rh, 0, 0, TAU), ctx.fill());
      ctx.strokeStyle = 'rgba(120,40,0,.4)';
      ctx.lineWidth = 1;
      for (const ox of [-0.25, 0.25]) (ctx.beginPath(), ctx.ellipse(px + ox * rw, py - rh, rw * 0.2, rh * 0.95, 0, 0, TAU), ctx.stroke());
      ctx.fillStyle = mix('#4a7a2a', '#1a2a10', night * 0.5);
      ctx.fillRect(px - 1.5, py - rh * 2.25, 3, rh * 0.4);
      if (night) {
        // 밤엔 호박 등불
        ctx.fillStyle = '#ffd860';
        ctx.shadowColor = '#ffb030';
        ctx.shadowBlur = 12;
        for (const sx of [-1, 1]) (ctx.beginPath(), ctx.moveTo(px + sx * rw * 0.35, py - rh * 1.35), ctx.lineTo(px + sx * rw * 0.18, py - rh * 1.05), ctx.lineTo(px + sx * rw * 0.5, py - rh * 1.05), ctx.fill());
        ctx.shadowBlur = 0;
      }
    }]);
  if (bd.chick)
    items.push([chickAt(s.sT)[1], () => {
      const [cx, cy] = chickAt(s.sT), [nx2] = chickAt(s.sT + 4), u = U(cy), [px, py] = P(cx, cy), pk = recent('peck', 60);
      shadow(cx, cy, 0.3);
      const flap = pk ? Math.abs(Math.sin((t - pk.t) / 2.5)) * u * 0.3 : Math.abs(Math.sin(t / 7)) * u * 0.05;
      emo(ctx, '🐔', px, py - u * 0.4 - flap, u * 0.82, 1, pk ? Math.sin(t / 2) * 0.2 : 0, nx2 > cx);
      if (pk && pk.n! >= 0 && t - pk.t < 50) emo(ctx, FRUIT[pk.n!], px + (nx2 > cx ? 1 : -1) * u * 0.42, py - u * 0.48 - flap, u * 0.36);
    }]);
  // 바구니
  items.push([BY, () => {
    const u = U(BY), [px, py] = P(BX, BY), del = recent('deliver', 40), sq = del ? Math.sin(((t - del.t) / 40) * Math.PI * 4) * (1 - (t - del.t) / 40) * 0.12 : 0;
    shadow(BX, BY, 0.62, 0.32);
    const bw = u * 0.62 * (1 + sq), bh = u * 0.52 * (1 - sq);
    ctx.strokeStyle = mix('#8a5a2a', '#3a2814', night * 0.5);
    ctx.lineWidth = u * 0.08;
    ctx.beginPath();
    ctx.ellipse(px, py - bh, bw * 0.75, bh * 1.1, 0, Math.PI, TAU);
    ctx.stroke();
    // 담긴 과일
    const list = s.basket.slice(-10);
    for (let i = 0; i < list.length; i++) emo(ctx, FRUIT[list[i]], px + ((i % 5) - 2) * bw * 0.32, py - bh - u * 0.06 - Math.floor(i / 5) * u * 0.2, u * 0.38);
    const bg = ctx.createLinearGradient(px - bw, 0, px + bw, 0);
    bg.addColorStop(0, mix('#e0a85a', '#4a3420', night * 0.5));
    bg.addColorStop(1, mix('#a8702e', '#2a1c10', night * 0.5));
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(px - bw, py - bh);
    ctx.lineTo(px + bw, py - bh);
    ctx.lineTo(px + bw * 0.8, py);
    ctx.quadraticCurveTo(px, py + bh * 0.25, px - bw * 0.8, py);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(90,50,10,.45)';
    ctx.lineWidth = 1;
    for (let q = 1; q < 4; q++) (ctx.beginPath(), ctx.moveTo(px - bw * (1 - q * 0.05), py - bh + (bh * q) / 4), ctx.lineTo(px + bw * (1 - q * 0.05), py - bh + (bh * q) / 4), ctx.stroke());
    for (let q = -3; q <= 3; q++) (ctx.beginPath(), ctx.moveTo(px + (bw * q) / 3.6, py - bh), ctx.lineTo(px + (bw * q) / 4.4, py), ctx.stroke());
    ctx.fillStyle = mix('#f0c070', '#5a4428', night * 0.5);
    ctx.beginPath();
    ctx.ellipse(px, py - bh, bw, bh * 0.22, 0, 0, TAU);
    ctx.fill();
    if (pvDeliver) {
      ctx.strokeStyle = `rgba(255,236,120,${0.6 + 0.4 * Math.sin(t / 3)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(px, py - bh * 0.5, bw * 1.25, bh * 1.2, 0, 0, TAU);
      ctx.stroke();
    }
  }]);
  // 고슴도치
  const sp = Math.hypot(b.vx, b.vy);
  items.push([b.y, () => {
    const u = U(b.y), [px, py] = P(b.x, b.y), p = Math.min(1, s.charge / FULL);
    shadow(b.x, b.y, RB * 1.05, 0.32);
    if (s.phase === 'aim' && s.charge > 0) {
      // 힘 고리 (발밑 땅에)
      ctx.strokeStyle = 'rgba(0,0,0,.35)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(px, py, u * 0.8, u * 0.8 * YS, 0, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = mix('#ffe45a', '#ff3a1a', p);
      ctx.shadowColor = '#ff8a2a';
      ctx.shadowBlur = 6 + p * 10;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.ellipse(px, py, u * 0.8, u * 0.8 * YS, 0, -Math.PI / 2, -Math.PI / 2 + TAU * p);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    const lastStop = recent('stop', 200), lastDel = recent('deliver', 120), lastPot = recent('pot', 120), lastSplash = recent('splash', 120);
    const sinceStop = lastStop ? t - lastStop.t : 999;
    let face: Face = 'calm', mode: Look['mode'] = 'stand';
    if (s.phase === 'roll') (mode = 'ball'), (face = sp > 0.1 ? 'wow' : 'calm');
    else if (s.phase === 'aim' && s.charge > 0) (mode = 'spin'), (face = 'strain');
    else if (s.phase === 'pause') face = s.cleared ? 'smug' : 'sad';
    else if (lastPot && (!lastStop || lastPot.t >= lastStop.t - 200)) face = 'scared';
    else if (lastDel && sinceStop < 110) face = 'smug';
    else if (lastSplash && sinceStop < 110) face = 'sad';
    else if (s.rolls > 0 && sinceStop < 70) face = 'dizzy';
    const fd = s.phase === 'roll' ? (b.vx >= 0 ? 1 : -1) : Math.cos(s.ang) >= 0 ? 1 : -1;
    const rot = s.phase === 'roll' ? (b.roll / RB) * (b.vx >= 0 ? 1 : -1) : mode === 'spin' ? s.charge * 0.18 + s.charge * s.charge * 0.004 : 0;
    const lean = s.phase === 'roll' ? clamp(-b.vx * 9, -1.2, 1.2) : 0;
    const jiggle = mode === 'spin' ? (hsh(t) - 0.5) * p * 2.5 : 0, hop = s.phase === 'pause' && s.cleared ? Math.abs(Math.sin(t / 6)) * u * 0.25 : 0;
    drawHog(ctx, px + jiggle, py - hop, u, { mode, fd, rot, face, tower: b.tower, lean, wob: b.wob + (mode === 'spin' ? p * 0.5 : 0), t, p, night });
    if (face === 'dizzy' || (s.phase === 'pause' && !s.cleared)) {
      for (let i = 0; i < 3; i++) {
        const a = t / 7 + (i * TAU) / 3;
        ctx.fillStyle = '#ffd23f';
        ctx.font = `900 ${u * 0.36}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('★', px + Math.cos(a) * u * 0.55, py - u * 1.05 + Math.sin(a) * u * 0.16);
      }
    }
    if (s.phase === 'aim') {
      // 도는 화살표: 지금 떼면 이쪽으로 — 누르는 동안엔 노랗게 커지며 천천히 돈다
      const dx = Math.cos(s.ang), dy = Math.sin(s.ang), L0 = 0.62, L1 = 1.55 + p * 0.9, col = s.charge > 0 ? mix('#ffe45a', '#ff5a2a', p) : '#ffffff';
      ctx.lineCap = 'round';
      for (const [c, lw] of [['rgba(40,20,0,.55)', 6], [col, 3]] as [string, number][]) {
        ctx.strokeStyle = c;
        ctx.lineWidth = lw;
        ctx.setLineDash([5, 5]);
        ctx.lineDashOffset = -t * 0.7;
        ctx.beginPath();
        ctx.moveTo(...P(b.x + dx * L0, b.y + dy * L0, 0.05));
        ctx.lineTo(...P(b.x + dx * L1, b.y + dy * L1, 0.05));
        ctx.stroke();
      }
      ctx.setLineDash([]);
      const tipP = P(b.x + dx * (L1 + 0.55), b.y + dy * (L1 + 0.55), 0.05), l = P(b.x + dx * L1 - dy * 0.38, b.y + dy * L1 + dx * 0.38, 0.05), r = P(b.x + dx * L1 + dy * 0.38, b.y + dy * L1 - dx * 0.38, 0.05);
      ctx.shadowColor = s.charge > 0 ? '#ff8a2a' : 'rgba(255,255,255,.8)';
      ctx.shadowBlur = 10;
      poly([tipP, l, r], col);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(40,20,0,.8)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(...tipP);
      ctx.lineTo(...l);
      ctx.lineTo(...r);
      ctx.closePath();
      ctx.stroke();
    }
  }]);
  items.sort((a, c) => a[0] - c[0]);
  for (const [, f] of items) f();
  // ── 앞 생울타리 (낮은 회양목) ──
  for (let x = -MG + 0.1; x < GW + MG; x += 0.42) {
    const [px, py] = P(x, GD + 0.12), u = U(GD);
    ctx.fillStyle = mix(x % 0.84 < 0.42 ? '#3e8a32' : '#4a9a3a', '#14301a', night * 0.6);
    ctx.beginPath();
    ctx.arc(px, py - u * 0.16, u * 0.3, Math.PI, TAU);
    ctx.fill();
  }
  for (let i = 0; i < 12; i++) flower(-MG + 0.4 + i * ((GW + 2 * MG - 0.8) / 11), GD + MG * 0.75, i + 1);
  // ── 흙 덩어리 앞면 (잔디 입술 · 흙층 · 돌) ──
  {
    const [fl, fy] = P(L, GD + MG), [fr2] = P(Rr, GD + MG);
    const fg = ctx.createLinearGradient(0, fy, 0, fy + faceH);
    fg.addColorStop(0, mix('#9a6a40', '#2a1c12', night * 0.6));
    fg.addColorStop(0.3, mix('#7a4e30', '#22160e', night * 0.6));
    fg.addColorStop(1, mix('#4a2e1c', '#140c08', night * 0.6));
    ctx.fillStyle = fg;
    ctx.fillRect(fl, fy, fr2 - fl, faceH);
    ctx.fillStyle = mix('#5aa83a', '#183018', night * 0.6);
    ctx.fillRect(fl, fy - 1, fr2 - fl, 4);
    ctx.strokeStyle = 'rgba(30,15,5,.35)';
    ctx.lineWidth = 1.5;
    for (const q of [0.42, 0.72]) {
      ctx.beginPath();
      for (let px = fl; px <= fr2; px += 8) ctx.lineTo(px, fy + faceH * q + Math.sin(px / 13 + q * 9) * 1.6);
      ctx.stroke();
    }
    for (let i = 0; i < 14; i++) {
      const r1 = hsh(i * 7 + 3);
      ctx.fillStyle = r1 > 0.6 ? mix('#b8ab9a', '#3a3632', night * 0.6) : mix('#5e3e28', '#1a120c', night * 0.6);
      ctx.beginPath();
      ctx.ellipse(fl + (i + 0.5) * ((fr2 - fl) / 14), fy + faceH * (0.3 + r1 * 0.55), 2.5 + r1 * 3, 1.6 + r1 * 1.4, 0, 0, TAU);
      ctx.fill();
    }
    ctx.strokeStyle = mix('#6a4a2a', '#1a120c', night * 0.6);
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const rx0 = fl + hsh(i * 11) * (fr2 - fl);
      ctx.beginPath();
      ctx.moveTo(rx0, fy + 3);
      ctx.quadraticCurveTo(rx0 + 4, fy + faceH * 0.3, rx0 - 2, fy + faceH * 0.5);
      ctx.stroke();
    }
  }
  // ── 연출 (사건 → 파티클·글자·흔들림) ──
  const seenT = fx.memo.t ?? -1;
  /** 고슴도치 근처 글자는 겹치지 않게 옆·위로 쌓는다 */
  const say = (x: number, y: number, text: string, color: string, size: number) => {
    const slot = (fx.memo.pt ?? -99) > t - 26 ? ((fx.memo.ps ?? 0) + 1) % 4 : 0;
    fx.memo.pt = t;
    fx.memo.ps = slot;
    fx.pop(clamp(x, w * 0.2, w * 0.8), y - slot * size * 1.15, text, color, size);
  };
  for (const e of s.events) {
    const age = t - e.t;
    // 배달: 탑의 과일이 하나씩 퐁퐁 바구니로 날아간다
    if (e.kind === 'deliver' && age < 46) {
      const [sx, sy] = P(e.x, e.y), [ex, ey] = P(BX, BY, 0.6), u = U(e.y);
      for (let i = 0; i < e.list!.length; i++) {
        const q = clamp((age - i * 3) / 16, 0, 1);
        if (q <= 0 || q >= 1) continue;
        const ox = sx, oy = sy - u * (1 + i * 0.3);
        emo(ctx, FRUIT[e.list![i]], ox + (ex - ox) * q, oy + (ey - oy) * q - Math.sin(q * Math.PI) * u * 1.4, u * 0.5, 1, q * 6);
      }
    }
    // 풍덩: 과일이 둥둥 떠내려간다
    if (e.kind === 'splash' && age < 110 && bd.pond) {
      const p = bd.pond, u = U(p.y);
      for (let i = 0; i < e.list!.length; i++) {
        const a = i * 2.1 + 0.5, rr = 0.2 + age * 0.012, [px, py] = P(p.x + Math.cos(a) * p.rx * Math.min(0.9, rr), p.y + Math.sin(a) * p.ry * Math.min(0.9, rr), 0.05 + Math.sin(age / 8 + i) * 0.04);
        emo(ctx, FRUIT[e.list![i]], px, py, u * 0.45, Math.min(1, (110 - age) / 30), Math.sin(age / 10 + i) * 0.4);
      }
    }
    // 우르르: 탑 꼭대기에서 떨어진 과일이 포물선으로
    if (e.kind === 'drop' && age < 22) {
      const [sx, sy] = P(e.x, e.y), u = U(e.y);
      for (const i of e.list!) {
        if (i >= bd.fx.length) continue;
        const q = age / 22, [ex, ey] = P(bd.fx[i], bd.fy[i], 0.24);
        emo(ctx, FRUIT[bd.fk[i]], sx + (ex - sx) * q, sy - u * 1.6 + (ey - sy + u * 1.6) * q - Math.sin(q * Math.PI) * u * 1.2, u * 0.5, 1, q * 8);
      }
    }
    if (e.t <= seenT) continue;
    const u = U(e.y), [x, y] = P(e.x, e.y, 0.5);
    if (e.kind === 'launch') {
      fx.burst(x, y + u * 0.3, mix('#e8d8a0', '#ffffff', 0.3), 8 + Math.round(e.n! * 14), 1.5 + e.n! * 3, 2.5);
      fx.ring(x, y + u * 0.3, '#ffffff', u * (0.8 + e.n! * 0.8), 3);
      fx.kick(1 + e.n! * 5);
      if (e.n! > 0.55) say(x - Math.sign(b.vx || 1) * u * 1.3, y - u * 0.6, e.text!, '#ffffff', 14 + Math.round(e.n! * 4));
    }
    if (e.kind === 'pick') (say(x + u * 1.1, y - u * 0.4, `콕! +${FRUIT[e.n!]}`, '#fff2b0', 14), fx.burst(x, y, FCOL[e.n!], 10, 2.5, 2.2), fx.ring(x, y, '#fff2b0', u * 0.6, 2));
    if (e.kind === 'bounce') (fx.burst(x, y, mix('#ffffff', '#c8a070', 0.4), 4 + Math.round(e.n! * 40), 2 + e.n! * 10, 2), e.n! > 0.12 && (fx.kick(2 + e.n! * 20), fx.ring(x, y, '#ffffff', u * 0.9, 3), fx.pop(x, y - u * 0.8, '통!', '#ffffff', 15)));
    if (e.kind === 'bump') fx.burst(x, y, '#e0b070', 6, 2, 2);
    if (e.kind === 'drop') (say(x, y - u * 1.6, `우르르! -${e.n}`, '#ffb0a0', 17), fx.kick(5));
    if (e.kind === 'pot') (fx.burst(x, y, '#d0703a', 22, 4, 3), fx.burst(x, y, '#6a4a2a', 14, 3, 2.5), fx.burst(x, y - u * 0.4, '#ff6a8a', 8, 2.5, 2.5), fx.kick(10), fx.blink('#ff3030', 0.22), fx.pop(x, y - u * 0.9, e.text!, '#ff7070', 20));
    if (e.kind === 'scold') fx.pop(x, y + u * 0.2, e.text!, '#ffb0b0', 15);
    if (e.kind === 'deliver') {
      const [bx2, by2] = P(BX, BY, 0.8);
      fx.pop(bx2, by2 - U(BY) * 1.2, e.text!, '#ffe27a', 24);
      for (const [c, n] of [['#ffd23f', 26], ['#ff6b6b', 14], ['#7ed957', 14]] as [string, number][]) fx.burst(bx2, by2, c, n, 5, 3);
      fx.ring(bx2, by2, '#ffe27a', U(BY) * 2.2, 5);
      fx.blink('#fff6c8', 0.18);
      fx.kick(4);
    }
    if (e.kind === 'splash') (fx.burst(x, y, '#8fd8ff', 30, 4, 3), fx.ring(x, y + u * 0.4, '#cff0ff', u * 1.4, 4), fx.kick(6), fx.pop(x, y - u * 1.1, e.text!, '#9fe0ff', 18));
    if (e.kind === 'peck') (fx.burst(x, y, '#ffffff', 16, 3, 2.5), fx.burst(x, y, '#ff5a4a', 4, 2, 2), fx.pop(x, y - u * 1.1, e.text!, '#ffffff', 16), fx.kick(4));
    if (e.kind === 'hole') {
      const [x2, y2] = P(e.list![0], e.list![1], 0.3);
      fx.pop(x, y - u * 0.6, '쏙!', '#ffffff', 16);
      fx.pop(x2, y2 - u * 0.9, '뿅!', '#ffe08a', 19);
      fx.burst(x, y, '#8a5a34', 12, 2.5, 2.5);
      fx.burst(x2, y2, '#8a5a34', 16, 3.5, 2.5);
      fx.ring(x2, y2, '#ffe08a', u * 1.1, 3);
    }
    if (e.kind === 'boing') (fx.pop(x, y - u * 1.1, e.text!, '#ffb347', 18), fx.ring(x, y, '#ffb347', u * 1.4, 4), fx.burst(x, y, '#ff9a3a', 12, 3, 2.5), fx.kick(5));
    if (e.kind === 'mix') (say(x + u * 1.1, y - u * 1.0, e.text!, '#b8ff8a', 16), fx.ring(x, y, '#b8ff8a', u * 1.1, 3));
    if (e.kind === 'dex') fx.pop(w / 2, top + R(0.17), e.text!, '#b8ff8a', 16);
    if (e.kind === 'full') fx.pop(x, y - u * 1.6, e.text!, '#ffd0a0', 14);
    if (e.kind === 'stop' && e.text) say(x + u * 1.2, y - u * 0.9, e.text, '#fff6c8', 15);
    if (e.kind === 'stop' && !e.text && s.rolls === 1) say(x + u * 1.2, y - u * 0.9, '어질어질~', '#ffffff', 15);
    if (e.kind === 'tap') fx.pop(x, y - u * 1.2, e.text!, '#ffffff', 15);
    if (e.kind === 'stage') fx.pop(w / 2, h * 0.42, e.text!, '#ffffff', 22);
    if (e.kind === 'bonus') fx.pop(w / 2, h * 0.5, e.text!, '#b8ff8a', 17);
    if (e.kind === 'clear') {
      fx.pop(w / 2, h * 0.36, e.text!, '#ffd23f', 25);
      for (const [cx2, col] of [[0.2, '#ff6b6b'], [0.4, '#ffd23f'], [0.6, '#7ed957'], [0.8, '#6cc6ff']] as [number, string][]) fx.burst(w * cx2, h * 0.32, col, 22, 5.5, 3);
      fx.blink('#fff6c8', 0.25);
    }
    if (e.kind === 'fail') (fx.pop(w / 2, h * 0.38, e.text!, th.hot, 17), fx.kick(10), fx.blink('#3a1a2a', 0.3));
  }
  fx.memo.t = t;
  // 굴러가는 중: 먼지 · 연못 물보라
  if (s.phase === 'roll' && sp > 0.05 && t % 3 === 0) {
    const [px, py] = P(b.x, b.y);
    if (inPond(bd.pond, b.x, b.y)) fx.burst(px, py, '#bfe8ff', 4, 2.2, 2.2);
    else fx.burst(px - Math.sign(b.vx) * U(b.y) * 0.3, py, mix('#d8e8a0', '#c8a070', 0.5), 2, 1.2, 2);
  }
  if (s.phase === 'aim' && s.charge > 0 && t % 5 === 0) {
    const [px, py] = P(b.x, b.y);
    fx.burst(px, py, '#e8dca8', 2 + Math.round(s.charge / 30), 1.5 + s.charge / 50, 2);
    if (s.charge > FULL && t % 10 === 0) fx.pop(px, py - U(b.y) * 1.8, '어, 어지러워…', '#ffe0a0', 13);
  }
  // 할머니 말풍선
  if (mood === 'angry') bubble(ctx, gmx - U(0) * 0.2, gmy - U(-1) * 2.35, '이 녀석! 내 화분!!', F(0.034), w, '#c0202a');
  else if (t - s.happy < 90) bubble(ctx, gmx - U(0) * 0.2, gmy - U(-1) * 2.35, s.basket.length >= 6 ? '아이고 우리 도치 최고!' : '아이고 잘한다~', F(0.034), w);
  // ── 빛: 노을빛 · 밤 ──
  if (dusk > 0) (ctx.fillStyle = `rgba(255,120,60,${dusk * 0.14})`), ctx.fillRect(-12, -12, w + 24, h + 24);
  if (night) {
    ctx.fillStyle = 'rgba(10,14,48,.38)';
    ctx.fillRect(-12, -12, w + 24, h + 24);
    ctx.globalCompositeOperation = 'lighter';
    const glow = (gx: number, gy: number, r: number, a: number, c = '255,200,110') => {
      const lg = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
      lg.addColorStop(0, `rgba(${c},${a})`);
      lg.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = lg;
      ctx.fillRect(gx - r, gy - r, r * 2, r * 2);
    };
    const [px, py] = P(b.x, b.y, 0.4);
    glow(px, py, S * 1.6, 0.25);
    glow(...P(GW / 2 + 0.95, PB, 1.6), S * 2.4, 0.4);
    glow(...P(1.85, PB, 1.4), S * 2, 0.3);
    for (let i = 0; i < bd.pumps.length; i += 2) glow(...P(bd.pumps[i], bd.pumps[i + 1], 0.4), S * 1.3, 0.35);
    ctx.globalCompositeOperation = 'source-over';
    // 마루 위 줄 전구
    for (let q = 0; q <= 16; q++) {
      const x = L + 0.2 + q * ((Rr - L - 0.4) / 16), [lx, ly] = P(x, -0.1, 1.5 + Math.sin(q * 0.8) * 0.12);
      ctx.fillStyle = ['#ff6b6b', '#ffd23f', '#7ed957', '#6cc6ff'][q % 4];
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 9;
      ctx.beginPath();
      ctx.arc(lx, ly, 2.2, 0, TAU);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    for (let i = 0; i < 12; i++) {
      const a = Math.abs(Math.sin(t / 22 + i * 2.1)), [fx0, fy0] = P(hsh(i * 3) * GW + Math.sin(t / 40 + i) * 0.6, hsh(i * 5) * GD + Math.cos(t / 50 + i) * 0.5, 0.6 + 0.4 * Math.sin(t / 15 + i));
      ctx.fillStyle = `rgba(220,255,120,${a})`;
      ctx.shadowColor = '#d8ff70';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(fx0, fy0, 1.8, 0, TAU);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }
  // 누르는 중: 굴러갈 결과 예상
  if (s.phase === 'aim' && s.charge > 0 && (pvF.size || pvDeliver || pvP.size || pvSplash || pvPeck)) {
    const [px, py] = P(b.x, b.y), u = U(b.y), n = pvF.size;
    let fr = 0;
    for (const i of pvF) fr += VAL[bd.fk[i]];
    const parts: string[] = [];
    if (n) parts.push(`콕 ×${n}`);
    if (pvDeliver) parts.push(`배달 +${pvDeliver}`);
    if (pvP.size) parts.push('🪴 와장창!');
    if (pvSplash) parts.push('💧 풍덩!');
    if (pvPeck) parts.push('🐔 냠!');
    const msg = parts.join(' · ');
    const ty = py - u * (1.6 + Math.min(b.tower.length, 8) * 0.3) - R(0.03);
    ctx.font = `900 ${R(0.04)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = 'rgba(0,0,0,.6)';
    const mx = clamp(px, ctx.measureText(msg).width / 2 + 4, w - ctx.measureText(msg).width / 2 - 4);
    ctx.strokeText(msg, mx, Math.max(top + R(0.1), ty));
    ctx.fillStyle = pvP.size || pvSplash ? '#ffb0a0' : pvDeliver ? '#ffe27a' : '#ffffff';
    ctx.fillText(msg, mx, Math.max(top + R(0.1), ty));
    void fr;
  }
  ctx.restore();

  // ── HUD (위 띠) ──
  const hg = ctx.createLinearGradient(0, 0, 0, top);
  hg.addColorStop(0, 'rgba(36,40,24,.88)');
  hg.addColorStop(1, 'rgba(36,40,24,.7)');
  ctx.fillStyle = hg;
  ctx.fillRect(0, 0, w, top);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = th.ink;
  ctx.font = `900 ${R(0.042)}px system-ui, sans-serif`;
  ctx.fillText(`🦔 ${k + 1}/${STAGES} ${d.name}`, 8, top * 0.3);
  ctx.textAlign = 'right';
  ctx.fillStyle = th.hot;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - 8, top * 0.3);
  ctx.fillStyle = '#ffd23f';
  ctx.fillText(`★${s.stars}`, w - 8 - R(0.17), top * 0.3);
  // 굴리기 남은 수 (작은 공)
  ctx.textAlign = 'left';
  ctx.font = `800 ${F(0.034)}px system-ui, sans-serif`;
  ctx.fillStyle = th.soft;
  ctx.fillText('굴리기', 8, top * 0.74);
  const rx0 = 8 + ctx.measureText('굴리기 ').width;
  for (let i = 0; i < d.rolls; i++) {
    const on = i < s.left, cx = rx0 + i * R(0.042) + R(0.016), cy = top * 0.74;
    ctx.fillStyle = on ? '#a8743e' : 'rgba(255,255,255,.18)';
    ctx.beginPath();
    for (let q = 0; q < 16; q++) {
      const a = (q / 16) * TAU, rr = q % 2 ? R(0.012) : R(0.017);
      ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
    if (on) (ctx.fillStyle = '#f0d0a0'), ctx.beginPath(), ctx.arc(cx, cy + 1, R(0.006), 0, TAU), ctx.fill();
  }
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 ${F(0.036)}px system-ui, sans-serif`;
  ctx.fillText(`점수 ${hedgehog.score(s)}`, w - 8, top * 0.74);
  // 도감: 한 번이라도 배달한 과일
  for (let q = 0; q < FRUIT.length; q++) {
    const dx0 = w * 0.465 + q * w * 0.052, on = s.dex.includes(q);
    ctx.fillStyle = on ? 'rgba(184,255,138,.22)' : 'rgba(255,255,255,.08)';
    ctx.beginPath();
    ctx.arc(dx0, top * 0.74, w * 0.024, 0, TAU);
    ctx.fill();
    if (on) emo(ctx, FRUIT[q], dx0, top * 0.74 + 1, F(0.034));
    else (ctx.fillStyle = 'rgba(255,255,255,.4)'), (ctx.font = `800 ${F(0.03)}px system-ui, sans-serif`), (ctx.textAlign = 'center'), ctx.fillText('?', dx0, top * 0.74 + 1);
  }
  // ── 아래 띠: 등의 탑 · 별 막대 ──
  ctx.fillStyle = 'rgba(36,40,24,.82)';
  ctx.fillRect(0, bot, w, h - bot);
  const tw = b.tower, ty1 = bot + (h - bot) * 0.3;
  ctx.textAlign = 'left';
  ctx.font = `800 ${F(0.034)}px system-ui, sans-serif`;
  if (tw.length) {
    const cnt = new Map<number, number>();
    for (const q of tw) cnt.set(q, (cnt.get(q) ?? 0) + 1);
    const desc = [...cnt].map(([q, n]) => `${FRUIT[q]}${n}`).join(' ');
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`등 ${desc}`, 8, ty1);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffe27a';
    ctx.fillText(`🧺 배달하면 +${towerPts(tw)}${kindsOf(tw) > 1 ? ` (×${kindsOf(tw)})` : ''}`, w - 8, ty1);
  } else {
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.fillText(k === 0 ? '등이 비었어요 — 과일 쪽으로 데굴!' : '등이 비었어요 · 섞어 모을수록 ×종류', 8, ty1);
  }
  // 별 막대: 점수 · ★ ★★ ★★★ 눈금은 막대 위에
  ctx.font = `900 ${F(0.034)}px system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  const ptxt = `${s.pts}점`, bx0 = 10 + ctx.measureText(ptxt).width + 8, bx1 = w - 12, by = bot + (h - bot) * 0.74, mx = d.goal[2] * 1.08, at = (v: number) => bx0 + (bx1 - bx0) * clamp(v / mx, 0, 1);
  ctx.fillText(ptxt, 8, by + 1);
  ctx.fillStyle = 'rgba(255,255,255,.15)';
  ctx.beginPath();
  ctx.roundRect(bx0, by - 5, bx1 - bx0, 10, 5);
  ctx.fill();
  ctx.fillStyle = s.pts >= d.goal[0] ? '#7ee07a' : '#ffb347';
  ctx.beginPath();
  ctx.roundRect(bx0, by - 5, Math.max(10, at(s.pts) - bx0), 10, 5);
  ctx.fill();
  ctx.textAlign = 'center';
  ctx.font = `900 ${F(0.03)}px system-ui, sans-serif`;
  for (let i = 0; i < 3; i++) {
    const gx = at(d.goal[i]), lab = '★'.repeat(i + 1), lw = ctx.measureText(lab).width + 6;
    ctx.fillStyle = s.pts >= d.goal[i] ? '#ffd23f' : 'rgba(40,44,28,.95)';
    ctx.beginPath();
    ctx.roundRect(gx - lw / 2, by - R(0.022), lw, R(0.044), R(0.012));
    ctx.fill();
    ctx.fillStyle = s.pts >= d.goal[i] ? '#5a3a00' : '#ffd23f';
    ctx.fillText(lab, gx, by + 1);
  }
  // 새 소식 (하늘 자리)
  let ny = top + R(0.04);
  ctx.textAlign = 'center';
  for (const n of s.notes.slice(-2)) {
    const age = t - n.t, al = Math.min(1, (220 - age) / 30, age / 8);
    if (al <= 0) continue;
    ctx.globalAlpha = al;
    ctx.font = `800 ${F(0.035)}px system-ui, sans-serif`;
    const nw = Math.min(w - 8, ctx.measureText(n.text).width + 18);
    ctx.fillStyle = 'rgba(30,34,18,.72)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - nw / 2, ny - R(0.026), nw, R(0.052), R(0.026));
    ctx.fill();
    ctx.fillStyle = n.color;
    ctx.fillText(n.text, w / 2, ny + 1, w - 16);
    ny += R(0.06);
  }
  ctx.globalAlpha = 1;
  // 첫 안내
  const hint = (t1: string, t2: string, yy: number) => {
    ctx.font = `900 ${R(0.042)}px system-ui, sans-serif`;
    const bw = Math.min(w - 10, Math.max(ctx.measureText(t1).width, ctx.measureText(t2).width) + 22);
    ctx.fillStyle = 'rgba(30,34,18,.78)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - bw / 2, yy - R(0.045), bw, R(0.1), 12);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(t1, w / 2, yy - R(0.016), w - 20);
    ctx.font = `800 ${F(0.036)}px system-ui, sans-serif`;
    ctx.fillStyle = '#ffe7b8';
    ctx.fillText(t2, w / 2, yy + R(0.03), w - 20);
  };
  const hy = yFront + faceH * 0.4; // 안내는 흙 덩어리 앞면 위 — 판 위의 것을 가리지 않게
  if (k === 0 && s.rolls === 0 && s.phase === 'aim' && s.t > 12) hint('👆 꾹 누르면 몸을 말아 힘을 모아요', '화살표가 🍎 쪽일 때 떼면 데굴데굴!', hy);
  else if (k === 0 && s.done === 0 && s.basket.length === 0 && s.phase === 'aim' && s.b.tower.length) hint('🧺 등에 과일을 이고 바구니로!', '닿으면 탑을 통째로 배달해요', hy);
  if (s.phase === 'pause') {
    ctx.font = `800 ${F(0.038)}px system-ui, sans-serif`;
    const msg = s.cleared ? (k === STAGES - 1 ? '🏆 정원 8곳 완주! 고슴도치 전설' : `다음: ${k + 2}번째 정원 · ${ST[k + 1].name}`) : s.hearts > 0 ? `♥ ${s.hearts} — 같은 정원 다시!` : `🦔 하트를 다 썼어요 · ${s.done}곳 완주`;
    const bw = ctx.measureText(msg).width + 24;
    ctx.fillStyle = 'rgba(30,34,18,.75)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - bw / 2, h * 0.47, bw, R(0.075), 12);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(msg, w / 2, h * 0.47 + R(0.0375));
  }
}

// ───────────────────────────── 봇 ─────────────────────────────
const OFF: Input = { tap: false, dir: 0, hold: false };
const dumbPlans = new WeakMap<object, { id: number; press: number; H: number }>();
/** 못하는 봇: 아무 때나 누르고 아무만큼 누른다 */
export const hedgehogRandom: Bot<HedgeState> = {
  name: '아무렇게나',
  act(s, rng) {
    if (s.phase !== 'aim') return OFF;
    let m = dumbPlans.get(s);
    const id = s.rolls * 16 + s.k;
    if (!m || m.id !== id) dumbPlans.set(s, (m = { id, press: s.t + 10 + Math.floor(rng() * 200), H: 6 + Math.floor(rng() * 100) }));
    if (s.charge === 0) return { tap: false, dir: 0, hold: s.t >= m.press };
    return { tap: false, dir: 0, hold: s.charge < m.H };
  },
};

const reachCache = new Map<number, number>();
/** 무게 M일 때 꽉 눌러 굴리면 가는 거리 (빈 땅) */
function reachOf(M: number) {
  const key = Math.round(M * 100);
  let d = reachCache.get(key);
  if (d === undefined) {
    let v = VMAX / M;
    d = 0;
    while (v > STOP) (d += v), (v = Math.max(0, v - FR) * DRAG);
    reachCache.set(key, d);
  }
  return d;
}
function judge(s: HedgeState, sim: Sim, leftAfter: number): number {
  const { b, bd, R } = sim;
  let v = R.pts - R.pot * (30 + 6 * s.k);
  const tv = towerPts(b.tower);
  if (tv > 0 && leftAfter > 0) {
    const d = Math.hypot(b.x - BX, b.y - BY) - RK - RB, reach = reachOf(massOf(b.tower));
    const ok = d <= reach * 0.75 && !(bd.pond && bd.pond.y < b.y && Math.abs(b.x - bd.pond.x) < bd.pond.rx);
    // 못 닿는 자리면 바구니에 가까울수록 낫다 (무거운 탑을 들고 멀리 가 버리면 손해)
    v += tv * (ok ? 0.8 : (leftAfter >= 2 ? 0.55 : 0.12) * clamp((reach * 0.75) / Math.max(0.1, d), 0, 1));
  }
  if (leftAfter > 0) {
    // 다음 굴림을 위한 자리: 근처에 남은 과일이 많을수록
    let near = 0;
    for (let i = 0; i < bd.fx.length; i++) if (bd.fa[i]) near += VAL[bd.fk[i]] * Math.max(0, 1 - Math.hypot(bd.fx[i] - b.x, bd.fy[i] - b.y) / 4);
    v += near * 0.12;
  }
  return v;
}
const HOLDS = [12, 24, 36, 51, 66, 81];
const plans = new WeakMap<object, { id: number; press: number; H: number }>();
function plan(s: HedgeState) {
  const id = s.rolls * 16 + s.k, leftAfter = s.left - 1;
  let best = { id, press: s.t, H: 36, v: -1e9 }, a = s.ang;
  for (let W = 0; W <= 204; W++) {
    if (W % 6 === 0)
      for (const H of HOLDS) {
        let ang = a;
        for (let i = 0; i < H; i++) ang += SPINH;
        const sim = simulate(s.b, s.bd, ang, H, s.sT + W + H + 1);
        const v = judge(s, sim, leftAfter) - (W + H) * 0.05;
        if (v > best.v) best = { id, press: s.t + W, H, v };
      }
    a += SPIN;
  }
  return best;
}
/** 잘하는 봇: 화살표가 앞으로 가리킬 방향 × 누를 시간 6가지를 굴려 보고(같은 물리), 배달 점수·탑·자리를 따져 가장 좋은 것을 그대로 누르고 뗀다 */
export const hedgehogSmart: Bot<HedgeState> = {
  name: '고슴도치 장인',
  act(s) {
    if (s.phase !== 'aim') return OFF;
    let m = plans.get(s);
    const id = s.rolls * 16 + s.k;
    if (s.charge > 0) return { tap: false, dir: 0, hold: s.charge < (m?.H ?? 36) };
    if (!m || m.id !== id || m.press < s.t - 2) plans.set(s, (m = plan(s)));
    return { tap: false, dir: 0, hold: s.t >= m.press };
  },
};
