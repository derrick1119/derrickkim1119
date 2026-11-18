/**
 * 코인 폭포 슬롯 (30라운드: 카지노·주사위 디펜스) — 동전 밀기 × 슬롯 머신 × 가리키기(touch).
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5;
const TAU = Math.PI * 2;

// ───────────────────────────── 물리 (결정적, 위치 기반) ─────────────────────────────
/** 선반: 가로 x 0~1, 깊이 y 0(밀대 쪽 뒤) ~ D(앞 턱). 중심이 턱을 넘으면 떨어진다 */
const D = 1;
/** 밀대: 앞면이 P0 ~ P0+STROKE 사이를 PER틱마다 한 번 오간다 */
const P0 = 0.04, STROKE = 0.2, PER = 150;
/** 동전·왕동전 반지름과 무게 */
const RC = 0.062, RB = 0.085, MC = 1, MB = 2.6;
const COIN = 0, BIG = 1, DOLL = 2, TOWER = 3;
const ITER = 4, FLIGHT = 16, COOL = 40, TOPPLE = 0.035;
/** 옆으로 밀리는 정도(작을수록 앞으로만 밀린다 — 마찰 흉내) */
let LAT = 0.1;
export const setLat = (v: number) => (LAT = v);
let HEX = true;
let HLAT = 0.4, HM = 4;
export const setHeavy = (l: number, m: number) => ((HLAT = l), (HM = m));
export const setHex = (v: boolean) => (HEX = v);

export interface Body { id: number; k: number; x: number; y: number; r: number; m: number; sp: number; tg: number; hx: number; hy: number; ox: number; oy: number }
interface Drop { x: number; land: number; k: number; w: number }
export interface Rec { k: 'land' | 'front' | 'side' | 'topple'; x: number; y: number; b: number; sp: number; tg: number; w: number }
export interface Sim {
  t: number; ph: number; st: number; py: number; fever: number; walls: boolean;
  b: Body[]; drops: Drop[]; nid: number; act: number; minY: number;
  medals: number; side: number; win: number; decoy: number;
}
export interface Lay { side: boolean; h0: number; h1: number }

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
function mkBody(S: Sim, k: number, x: number, y: number, r: number, m: number, sp = 0, tg = 0): Body {
  return { id: S.nid++, k, x, y, r, m, sp, tg, hx: x, hy: y, ox: x, oy: y };
}
const pushY = (st: number, ph: number) => P0 + (st * (1 - Math.cos((TAU * ph) / PER))) / 2;

function wall(o: Body, py: number, open: boolean, L: Lay) {
  if (o.y - o.r < py) o.y = py + o.r;
  if (open && o.y > L.h0 && o.y < L.h1) return;
  if (o.x < o.r) o.x = o.r;
  else if (o.x > 1 - o.r) o.x = 1 - o.r;
}

/** 겹친 것끼리 밀어 떼기(무거울수록 덜 밀림, 밀대에 붙은 것은 안 밀림) — 마찰 대신 '밀어야만 움직인다' */
function solve(S: Sim, L: Lay, rec?: Rec[]) {
  const b = S.b, py = S.py, open = L.side && !S.walls;
  let n = b.length;
  for (let i = 0; i < n; i++) (b[i].ox = b[i].x), (b[i].oy = b[i].y);
  for (let i = 1; i < n; i++) {
    const o = b[i];
    let j = i - 1;
    while (j >= 0 && b[j].y > o.y) (b[j + 1] = b[j]), j--;
    b[j + 1] = o;
  }
  for (let it = 0; it < ITER; it++) {
    for (let i = 0; i < n; i++) wall(b[i], py, open, L);
    for (let i = 0; i < n; i++) {
      const a = b[i], lim = a.r + 0.11;
      for (let j = i + 1; j < n; j++) {
        const c = b[j], dy = c.y - a.y;
        if (dy > lim) break;
        const rr = a.r + c.r, dx = c.x - a.x;
        if (dx >= rr || dx <= -rr || dy <= -rr) continue;
        const d2 = dx * dx + dy * dy;
        if (d2 >= rr * rr) continue;
        const d = Math.sqrt(d2), nx = d > 1e-9 ? dx / d : 0, ny = d > 1e-9 ? dy / d : 1;
        let wa = a.y - a.r <= py + 1e-6 ? 0 : 1 / a.m, wc = c.y - c.r <= py + 1e-6 ? 0 : 1 / c.m;
        if (wa + wc === 0) (wa = 1), (wc = 1);
        // 마찰: 동전끼리는 옆으로 잘 안 미끄러지고 앞으로 밀린다(LAT). 무거운 인형 둘레는 미끄럽다(동전이 비켜 감)
        const lat = a.m >= 3.5 || c.m >= 3.5 ? HLAT : LAT;
        let mx = nx * lat, my = ny;
        const ml = Math.hypot(mx, my) || 1;
        (mx /= ml), (my /= ml);
        const k = (rr - d) / (mx * nx + my * ny) / (wa + wc);
        a.x -= mx * k * wa;
        a.y -= my * k * wa;
        c.x += mx * k * wc;
        c.y += my * k * wc;
      }
    }
  }
  let mv = 0, minY = 9;
  for (let i = n - 1; i >= 0; i--) {
    const o = b[i];
    wall(o, py, open, L);
    const front = o.y > D, side = o.x < 0 || o.x > 1;
    if (front || side) {
      b.splice(i, 1);
      n--;
      if (front) {
        if (o.k === DOLL) o.tg ? S.win === 0 && (S.win = 1) : S.decoy++;
        else S.medals += o.k === BIG ? 3 : o.k === TOWER ? 6 : 1;
      } else if (o.k === DOLL && o.tg) S.win === 0 && (S.win = -1);
      else S.side++;
      rec?.push({ k: front ? 'front' : 'side', x: o.x, y: o.y, b: o.k, sp: o.sp, tg: o.tg, w: 0 });
      continue;
    }
    if (o.k === TOWER && (o.x - o.hx) ** 2 + (o.y - o.hy) ** 2 > TOPPLE * TOPPLE) {
      // 동전 탑이 밀리면 와르르 — 밀린 쪽으로 동전 다섯이 쏟아진다
      const dx = o.x - o.hx, dy = o.y - o.hy, l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
      b.splice(i, 1);
      n--;
      for (let k = 0; k < 5; k++) b.push(mkBody(S, COIN, clamp(o.x + ux * k * 0.05 + (k % 2 ? 0.02 : -0.02), RC, 1 - RC), Math.min(D - 0.01, o.y + uy * k * 0.05), RC, MC));
      rec?.push({ k: 'topple', x: o.x, y: o.y, b: TOWER, sp: 0, tg: 0, w: 0 });
      mv = 1;
      continue;
    }
    const m = Math.abs(o.x - o.ox) + Math.abs(o.y - o.oy);
    if (m > mv) mv = m;
    if (o.y - o.r < minY) minY = o.y - o.r;
  }
  S.minY = minY;
  return mv;
}

/** 한 틱: 밀대 움직임 → 떨어진 동전 내려앉기 → 밀어 떼기 → 턱·옆 구멍으로 떨어짐 */
export function tick(S: Sim, L: Lay, rec?: Rec[]) {
  S.t++;
  const fast = S.fever > 0;
  if (fast) S.fever--;
  S.ph += fast ? 1.45 : 1;
  const tgt = fast ? STROKE * 1.55 : STROKE;
  if (S.st !== tgt) S.st += clamp(tgt - S.st, -0.002, 0.002);
  const prev = S.py;
  S.py = pushY(S.st, S.ph);
  let go = S.act > 0 || (S.py > prev + 1e-9 && S.py > S.minY - 0.002);
  for (let i = S.drops.length - 1; i >= 0; i--) {
    const d = S.drops[i];
    if (d.land > S.t) continue;
    S.drops.splice(i, 1);
    const big = d.k === BIG, r = big ? RB : RC, x = clamp(d.x, r, 1 - r), y = S.py + r + 0.001;
    S.b.push(mkBody(S, d.k, x, y, r, big ? MB : MC));
    rec?.push({ k: 'land', x, y, b: d.k, sp: 0, tg: 0, w: d.w });
    go = true;
  }
  if (!go) return;
  const mv = solve(S, L, rec);
  S.act = mv > 3e-5 ? 4 : S.act - 1;
}

export const cloneSim = (S: Sim): Sim => ({ ...S, b: S.b.map((o) => ({ ...o })), drops: S.drops.map((d) => ({ ...d })) });

// ───────────────────────────── 슬롯 ─────────────────────────────
/** 릴 그림: 동전(+2) · 왕동전(다음 동전이 크고 무거움) · 번개(밀대 힘내기) · 벽(옆 구멍 막기) · 무지개(무엇과도 짝) */
export const SYM = ['coin', 'big', 'fever', 'wall', 'wild', 'none'] as const;
export const SYM_EMO = ['🪙', '🥇', '⚡', '🧱', '🌈', '💨'];
const SYM_NAME = ['동전 2개 더', '다음은 왕동전', '밀대 힘내!', '옆 벽 세우기', '무지개', '꽝'];
/** 무지개(무엇과도 짝) · 꽝(짝이 돼도 아무것도 없음) */
const R_ = 4, N_ = 5;
const JACK_COINS = 11;
/** 잭팟 동전이 슬롯에서 선반까지 떨어지는 틱 */
const WFALL = 30;

/** 릴 셋의 판정 (게임과 봇이 같이 쓴다): 같은 그림 셋 = 잭팟, 둘 = 짝(그 그림 효과), 아니면 꽝. 무지개는 꽝이 아닌 무엇과도 같다 */
export function judge(sy: number[]): { kind: 'jack' | 'pair' | 'miss'; sym: number; i: number; j: number } {
  const non = sy.filter((x) => x !== R_);
  if (non.length === 0) return { kind: 'jack', sym: R_, i: 0, j: 1 };
  if (non[0] !== N_ && non.every((x) => x === non[0])) return { kind: 'jack', sym: non[0], i: 0, j: 1 };
  for (let i = 0; i < 3; i++)
    for (let j = i + 1; j < 3; j++) {
      const a = sy[i], b = sy[j];
      if (a === N_ || b === N_) continue;
      if (a === b || a === R_ || b === R_) return { kind: 'pair', sym: a === R_ ? b : a, i, j };
    }
  return { kind: 'miss', sym: -1, i: -1, j: -1 };
}

// ───────────────────────────── 판 ─────────────────────────────
interface StageDef {
  key: string; name: string; emoji: string; news: string; spot: string;
  /** 인형 종류 · 무거움 · 자리 [x, y] (x는 판마다 뒤집힐 수 있음) */
  sp: number; heavy?: boolean; light?: boolean; doll: number[];
  /** 덤 인형 [x, y, 종류] */
  decoy?: number[];
  towers?: number[][];
  /** 옆 구멍 y 구간 */
  side?: number[];
  fill: number; purse: number; keep: number; nstars: number;
  star3?: 'jackpot' | 'medal' | 'twin' | 'tower'; medal?: number;
  /** 한 릴에 든 그림 (SYM 번호). 비면 슬롯 없음 */
  reels: number[];
  pocket: number;
}
const C = 0, B = 1, F = 2, W = 3, R = 4, N = 5;
export const STAGES: StageDef[] = [
  { key: 'push', name: '동전 툭!', emoji: '🐥', news: '', spot: '', sp: 0, light: true, doll: [0.5, 0.93], fill: 0.95, purse: 12, keep: 0, nstars: 1, reels: [], pocket: 0 },
  { key: 'slot', name: '슬롯 구멍', emoji: '🐱', news: '🎰 움직이는 구멍에 쏙 → 슬롯이 돌아요', spot: '슬롯 구멍: 쏙 넣으면 릴이 돌아요', sp: 1, doll: [0.36, 0.9], fill: 0.93, purse: 10, keep: 3, nstars: 2, reels: [C, C, C, B, F, N, N, N], pocket: 230 },
  { key: 'bear', name: '무거운 곰', emoji: '🧸', news: '🧸 곰은 무거워요 — 왕동전이면 잘 밀려요', spot: '무거운 곰: 동전이 미끄러져요', sp: 2, heavy: true, doll: [0.62, 0.88], fill: 0.92, purse: 11, keep: 3, nstars: 3, star3: 'jackpot', reels: [C, C, B, B, F, N, N, N], pocket: 220 },
  { key: 'side', name: '옆 구멍', emoji: '🐰', news: '🕳️ 옆 구멍 — 인형이 빠지면 다시!', spot: '옆 구멍: 빠지면 손해', sp: 3, doll: [0.2, 0.86], side: [0.45, 1.1], fill: 0.9, purse: 9, keep: 3, nstars: 3, star3: 'medal', medal: 12, reels: [C, C, B, F, W, W, N, N], pocket: 210 },
  { key: 'tower', name: '동전 탑', emoji: '🐷', news: '🗼 동전 탑을 밀면 와르르 쏟아져요', spot: '동전 탑: 밀면 와르르!', sp: 4, doll: [0.72, 0.83], towers: [[0.38, 0.5], [0.7, 0.42]], fill: 0.88, purse: 9, keep: 4, nstars: 3, star3: 'tower', reels: [C, C, C, B, F, W, N, N], pocket: 200 },
  { key: 'twin', name: '두 인형', emoji: '🐶', news: '👑 왕관 인형을 떨어뜨려요 — 다른 인형은 덤', spot: '왕관 인형이 목표예요', sp: 5, doll: [0.3, 0.85], decoy: [0.7, 0.9, 8], fill: 0.9, purse: 9, keep: 3, nstars: 3, star3: 'twin', reels: [C, C, B, F, W, N, N, N], pocket: 200 },
  { key: 'wild', name: '무지개 그림', emoji: '🦊', news: '🌈 무지개는 어느 그림과도 짝이 돼요', spot: '무지개 그림 추가!', sp: 6, heavy: true, doll: [0.66, 0.86], fill: 0.9, purse: 9, keep: 3, nstars: 3, star3: 'jackpot', reels: [C, C, B, F, W, R, N, N], pocket: 190 },
  { key: 'all', name: '대잔치', emoji: '🐼', news: '🎉 마지막 판 — 곰·옆 구멍·탑·무지개 다 나와요!', spot: '', sp: 7, heavy: true, doll: [0.3, 0.85], side: [0.5, 1.1], towers: [[0.6, 0.48]], fill: 0.88, purse: 10, keep: 3, nstars: 3, star3: 'jackpot', reels: [C, C, B, B, F, W, R, N], pocket: 180 },
];
export const STAGE_COUNT = STAGES.length;

/** 인형 크기·무게 */
const dollR = (d: StageDef) => (d.heavy ? 0.095 : 0.084);
const dollM = (d: StageDef) => (d.heavy ? HM : d.light ? 1.2 : 2.4);

export function buildStage(seed: number, si: number): { S: Sim; L: Lay; flip: boolean } {
  const d = STAGES[si], r = mulberry32(((seed ^ Math.imul(si + 1, 0x9e3779b1)) >>> 0) + 17);
  const flip = r() < 0.5, fx = (x: number) => (flip ? 1 - x : x);
  const S: Sim = { t: 0, ph: 0, st: STROKE, py: P0, fever: 0, walls: false, b: [], drops: [], nid: 0, act: 4, minY: 0, medals: 0, side: 0, win: 0, decoy: 0 };
  const L: Lay = { side: !!d.side, h0: d.side?.[0] ?? 0, h1: d.side?.[1] ?? 0 };
  const j = (a: number) => (r() - 0.5) * 2 * a;
  const big: Body[] = [];
  big.push(mkBody(S, DOLL, fx(d.doll[0]) + j(0.03), d.doll[1] + j(0.03), dollR(d), dollM(d), d.sp, 1));
  if (d.decoy) big.push(mkBody(S, DOLL, fx(d.decoy[0]) + j(0.03), d.decoy[1] + j(0.03), 0.08, 2.2, d.decoy[2], 0));
  for (const t of d.towers ?? []) big.push(mkBody(S, TOWER, fx(t[0]) + j(0.02), t[1] + j(0.02), RC, 2));
  S.b.push(...big);
  const yMin = P0 + STROKE + RC + 0.006, dy = RC * (HEX ? 1.75 : 2.04), dx = RC * 2.06;
  for (let row = 0, y = D - 0.03; y >= yMin; row++, y -= dy)
    for (let x = RC + 0.004 + (row % 2 && HEX ? dx / 2 : 0); x <= 1 - RC; x += dx) {
      const px = x + j(0.006), py = y + j(0.006);
      if (big.some((o) => Math.hypot(o.x - px, o.y - py) < o.r + RC + 0.004)) continue;
      if (r() < d.fill) S.b.push(mkBody(S, COIN, px, py, RC, MC));
    }
  // 겹친 것 풀기(밀대는 뒤에) — 넘친 것은 조용히 치운다
  S.py = P0;
  for (let k = 0; k < 6; k++) solve(S, L);
  S.medals = 0;
  S.side = 0;
  S.win = 0;
  S.decoy = 0;
  S.act = 0;
  return { S, L, flip };
}

// ───────────────────────────── 게임 상태 ─────────────────────────────
interface Ev { t: number; kind: string; x: number; y: number; text?: string; col?: string; v?: number }
interface Slot { cur: number[]; res: number[]; held: boolean[]; spin: number; stop: number[]; q: number; reach: boolean; last: string; lastT: number; lastSym: number }
interface Faller { k: number; x: number; y: number; sp: number; tg: number; t0: number; side: number }
interface Stat { stage: number; ok: boolean; stars: number; starOk: boolean[]; used: number; slot: number; jacks: number; pairs: number; purse: number; medals: number; t: number }

export interface CoinState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'play' | 'win' | 'result'; pt: number;
  S: Sim; L: Lay; flip: boolean;
  purse: number; used: number; bigQ: number; chute: number; waitT: number;
  down: boolean; ax: number; firstDrop: boolean; slotUse: number; jacks: number; pairs: number;
  slot: Slot;
  hearts: number; stars: number; got: number; starOk: boolean[]; pts: number; ok: boolean; why: string; won: boolean; dead: boolean; tries: number; again: boolean;
  seen: Set<string>; tips: Set<string>; newsQ: string[]; news: { text: string; t: number } | null; events: Ev[];
  fallers: Faller[]; slow: number; edgeT: number; kid: { mode: string; until: number };
  log: Stat[]; inputs: number; sameRun: number; sameMax: number; lastX: number;
}

const ev = (s: CoinState, kind: string, x: number, y: number, text?: string, col?: string, v?: number) => s.events.push({ t: s.t, kind, x, y, text, col, v });
function tip(s: CoinState, key: string, text: string) {
  if (s.tips.has(key)) return;
  s.tips.add(key);
  s.newsQ.push(text);
}
function see(s: CoinState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  if (text) s.newsQ.push(text);
}
const RESULT_OK = 210, RESULT_FAIL = 180, NEWS_T = 170, CARD_T = 150, WIN_T = 80, WIN_PTS = 300;
const STAR_VAL = [100, 100, 150];

/** 슬롯 구멍: 떨어뜨리는 줄 위를 좌우로 오간다 */
const PW = 0.062;
export const pocketX = (s: CoinState) => {
  const per = STAGES[s.stage].pocket;
  return per ? 0.5 + 0.36 * Math.sin((TAU * s.t) / per) : -9;
};
export const inPocket = (s: CoinState, x: number) => STAGES[s.stage].pocket > 0 && Math.abs(x - pocketX(s)) < PW;

function newStage(s: CoinState) {
  const d = STAGES[s.stage], B = buildStage(s.seed, s.stage);
  s.S = B.S;
  s.L = B.L;
  s.flip = B.flip;
  s.phase = 'play';
  s.pt = 0;
  s.purse = d.purse;
  s.used = 0;
  s.bigQ = 0;
  s.chute = 0;
  s.waitT = 0;
  s.slotUse = 0;
  s.jacks = 0;
  s.pairs = 0;
  s.starOk = [false, false, false];
  s.slot = { cur: [0, 1, 2].map((k) => d.reels.length ? k % d.reels.length : 0), res: [0, 0, 0], held: [false, false, false], spin: 0, stop: [0, 0, 0], q: 0, reach: false, last: '', lastT: -999, lastSym: -1 };
  s.fallers = [];
  s.slow = 0;
  s.edgeT = 0;
  if (d.key) see(s, d.key, '');
}

/** 측정용: 바로 그 판부터 시작 (하트·별 그대로) */
export function jumpTo(s: CoinState, si: number) {
  s.stage = si;
  newStage(s);
}

function starsNow(s: CoinState): boolean[] {
  const d = STAGES[s.stage], S = s.S, ok = S.win === 1;
  const s3 = d.star3 === 'jackpot' ? s.jacks > 0 : d.star3 === 'medal' ? S.medals >= (d.medal ?? 99) : d.star3 === 'twin' ? S.decoy > 0 : d.star3 === 'tower' ? !S.b.some((o) => o.k === TOWER) : false;
  return [ok, ok && d.nstars >= 2 && s.purse >= d.keep, ok && d.nstars >= 3 && s3];
}

function finish(s: CoinState, ok: boolean, why: string) {
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  s.why = why;
  if (ok) {
    s.starOk = starsNow(s);
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    s.pts += s.starOk.reduce((a, g, k) => a + (g ? STAR_VAL[k] : 0), 0) + s.purse * 10;
    if (s.stage === STAGE_COUNT - 1) (s.won = true), (s.pts += WIN_PTS);
    s.kid = { mode: 'cheer', until: s.t + 180 };
  } else {
    s.hearts--;
    s.tries++;
    s.kid = { mode: 'sad', until: s.t + 180 };
  }
  s.log.push({ stage: s.stage, ok, stars: ok ? s.got : 0, starOk: s.starOk.slice(), used: s.used, slot: s.slotUse, jacks: s.jacks, pairs: s.pairs, purse: s.purse, medals: s.S.medals, t: s.t });
}

// ── 슬롯 돌리기 ──
/** 붙잡힌 짝이 있으면 그 그림 (없으면 -1) */
function heldSym(s: CoinState) {
  const d = STAGES[s.stage], sl = s.slot, hs = [0, 1, 2].filter((k) => sl.held[k]).map((k) => d.reels[sl.cur[k]]);
  if (hs.length < 2) return -1;
  return hs[0] === R_ ? hs[1] : hs[0];
}

function startSpin(s: CoinState) {
  const d = STAGES[s.stage], sl = s.slot, n = d.reels.length;
  for (let k = 0; k < 3; k++) sl.res[k] = sl.held[k] ? sl.cur[k] : Math.floor(s.rng() * n);
  const heldAny = sl.held.some(Boolean);
  // 앞 두 릴이 맞으면(또는 붙잡힌 짝이 있으면) 셋째 릴은 '리치' — 천천히 멈춘다
  const a = d.reels[sl.res[0]], b = d.reels[sl.res[1]];
  sl.reach = heldAny || (a !== N_ && b !== N_ && (a === b || a === R_ || b === R_));
  sl.stop = heldAny ? sl.held.map((h) => (h ? 0 : 96)) : [28, 46, sl.reach ? 104 : 64];
  sl.spin = 1;
  s.slotUse++;
  ev(s, 'spin', 0.5, 0, heldAny ? '남은 한 릴!' : '', '#fff1a8');
}

/** 잭팟: 동전 폭포 — 선반 전체에 동전이 쏟아지고 밀대가 힘을 낸다 (봇이 내다볼 때도 같은 것) */
function pour(S: Sim, r: Rng) {
  for (let k = 0; k < JACK_COINS; k++) S.drops.push({ x: 0.08 + 0.84 * ((k * 0.618 + r() * 0.2) % 1), land: S.t + WFALL + k * 4, k: COIN, w: 1 });
  S.fever = Math.max(S.fever, PER * 2);
}

function resolveSpin(s: CoinState) {
  const d = STAGES[s.stage], sl = s.slot, S = s.S;
  const sy = sl.res.map((i) => d.reels[i]);
  sl.cur = sl.res.slice();
  const wasHeld = sl.held.some(Boolean);
  const J = judge(sy);
  sl.held = [false, false, false];
  sl.lastT = s.t;
  if (J.kind === 'jack') {
    s.jacks++;
    sl.last = 'jackpot';
    pour(S, s.rng);
    if (J.sym === 1) s.bigQ += 2;
    if (J.sym === 0) s.purse += 2;
    if (J.sym === 3) S.walls = true;
    ev(s, 'jackpot', 0.5, 0, '잭팟!', '#ffe066', J.sym);
    see(s, 'jackpot', '💰 잭팟! 같은 그림 셋 = 동전 폭포');
    s.slow = Math.max(s.slow, 50);
    s.kid = { mode: 'cheer', until: s.t + 160 };
    return;
  }
  if (wasHeld || J.kind === 'miss') {
    sl.last = wasHeld ? 'miss2' : 'miss';
    ev(s, 'miss', 0.5, 0, wasHeld ? '아깝다!' : '꽝!', '#ffd0c8');
    return;
  }
  // 짝: 그 그림의 효과 + 짝은 붙잡혀 다음엔 남은 한 릴만 돈다
  const sym = J.sym;
  sl.held[J.i] = sl.held[J.j] = true;
  s.pairs++;
  sl.last = 'pair';
  sl.lastSym = sym;
  if (sym === 0) (s.purse += 2), see(s, 'p-coin', '🪙 동전 짝 = 동전 2개 더!');
  else if (sym === 1) (s.bigQ += 1), see(s, 'p-big', '🥇 왕동전 짝 = 다음 동전이 크고 무거워요');
  else if (sym === 2) (S.fever = Math.max(S.fever, PER * 2)), see(s, 'p-fever', '⚡ 번개 짝 = 밀대가 길고 빠르게 밀어요');
  else if (sym === 3) (S.walls = true), see(s, 'p-wall', '🧱 벽 짝 = 옆 구멍이 막혀요');
  ev(s, 'pair', 0.5, 0, `${SYM_EMO[sym]} 짝! ${SYM_NAME[sym]}`, '#bff3ff', sym);
  tip(s, 'reach', '🔒 짝은 붙잡혀요 — 다음 슬롯은 남은 한 릴만 돌아요');
}

function slotStep(s: CoinState) {
  const sl = s.slot;
  if (!sl.spin) {
    if (sl.q > 0 && s.t - sl.lastT > 24) (sl.q--, startSpin(s));
    return;
  }
  sl.spin++;
  for (let k = 0; k < 3; k++) if (sl.stop[k] && sl.spin === sl.stop[k]) (sl.cur[k] = sl.res[k]), ev(s, 'reel', k, 0);
  if (sl.spin >= Math.max(...sl.stop) + 2) {
    sl.spin = 0;
    resolveSpin(s);
  }
}

function release(s: CoinState) {
  if (s.phase !== 'play') return;
  if (s.purse <= 0) return void ev(s, 'nope', s.ax, 0.1, '동전을 다 썼어요', '#ffd6cc');
  if (s.chute > 0) return;
  const x = clamp(s.ax, RC, 1 - RC);
  s.purse--;
  s.used++;
  s.chute = COOL;
  s.firstDrop = true;
  s.inputs++;
  if (Math.abs(x - s.lastX) < 0.04) s.sameRun++;
  else s.sameRun = 1;
  s.sameMax = Math.max(s.sameMax, s.sameRun);
  s.lastX = x;
  see(s, 'drop', '');
  if (inPocket(s, x)) {
    // 슬롯 구멍에 쏙 — 선반에는 안 떨어진다
    s.slot.q++;
    ev(s, 'pocket', pocketX(s), 0, '쏙!', '#fff1a8');
    tip(s, 'slotin', '🎰 쏙! 슬롯이 돌아요 — 선반은 못 밀어요');
    return;
  }
  const k = s.bigQ > 0 ? BIG : COIN;
  if (k === BIG) s.bigQ--, see(s, 'big', '');
  s.S.drops.push({ x, land: s.S.t + FLIGHT, k, w: 0 });
  ev(s, 'drop', x, 0, '', '#ffffff', k);
}

function onRec(s: CoinState, rec: Rec[]) {
  let fronts = 0;
  for (const e of rec) {
    if (e.k === 'land') ev(s, e.w ? 'rain' : 'land', e.x, e.y, '', '', e.b);
    else if (e.k === 'front' || e.k === 'side') {
      s.fallers.push({ k: e.b, x: e.x, y: e.y, sp: e.sp, tg: e.tg, t0: s.t, side: e.k === 'side' ? (e.x < 0.5 ? -1 : 1) : 0 });
      if (e.k === 'front') {
        if (e.b === DOLL) {
          ev(s, 'doll', e.x, e.y, e.tg ? '야호~!' : '나도~!', '#ffe066');
          if (e.tg) (s.slow = Math.max(s.slow, 70)), (s.kid = { mode: 'cheer', until: s.t + 200 });
        } else fronts++;
        see(s, 'fall', '');
      } else {
        ev(s, 'sidefall', e.x, e.y, e.b === DOLL ? '으앗 옆으로!' : '퐁…', '#ffd0c8');
        tip(s, 'sidefall', '🕳️ 옆 구멍으로 빠진 동전은 못 받아요');
      }
    } else if (e.k === 'topple') {
      ev(s, 'topple', e.x, e.y, '와르르!', '#ffe9a8');
      see(s, 'toppled', '');
    }
  }
  if (fronts) ev(s, 'medal', 0.5, D, fronts >= 3 ? `와르르 ${fronts}개!` : '짤랑!', fronts >= 3 ? '#ffe066' : '#fff6d6', fronts);
  if (fronts >= 4) s.slow = Math.max(s.slow, 24);
}

function simStep(s: CoinState) {
  const rec: Rec[] = [];
  tick(s.S, s.L, rec);
  if (rec.length) onRec(s, rec);
  slotStep(s);
  if (s.chute > 0) s.chute--;
}

function cosmetic(s: CoinState) {
  s.fallers = s.fallers.filter((f) => s.t - f.t0 < 70);
  if (s.kid.mode !== 'idle' && s.t >= s.kid.until) s.kid.mode = 'idle';
  const tg = s.S.b.find((o) => o.tg === 1);
  if (tg && tg.y > D - tg.r * 0.8) {
    s.edgeT++;
    if (s.edgeT === 30) ev(s, 'edge', tg.x, tg.y, ['으아아 버둥버둥!', '떨어질 것 같아~', '흔들흔들!'][s.stage % 3], '#fff3c4');
    if (s.kid.mode === 'idle') s.kid = { mode: 'gasp', until: s.t + 30 };
  } else s.edgeT = 0;
}

export const coinfall: GameDef<CoinState> = {
  id: 'coinfall',
  name: '코인 폭포 슬롯',
  genes: ['coinpusher', 'slots', 'pointer'],
  twist: '동전을 어디에 떨굴지가 곧 슬롯을 돌릴지의 선택이다 — 움직이는 구멍에 쏙 넣으면 선반은 못 밀지만 릴이 돌고, 짝이 나면 그 짝이 붙잡혀 다음엔 남은 한 릴만 돌아서(확률이 눈에 보인다) 잭팟 동전 폭포를 노릴 때를 고른다',
  rules: ['위를 누르면 동전 떨어질 자리가 보이고, 떼면 툭! 밀대가 밀어 인형을 턱 아래로 떨어뜨려요.', '움직이는 슬롯 구멍에 넣으면 릴이 돌아요 — 같은 그림 셋이면 동전 폭포!'],
  controls: 'touch',
  hint: '위를 꾹 → 떨어질 자리 보기, 떼면 동전 툭! / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '오락실 동전 밀기 기계 — 동물 인형 뽑기 코너',
    mood: '네온이 반짝이는 장난감 오락실, 유리 상자 안 금빛 동전 선반 위에 동물 인형들이 아슬아슬. 위에는 작은 슬롯 릴 세 개가 반짝이고, 기계 앞 아기 동물 둘이 유리에 코를 박고 구경한다.',
    palette: { bg: '#2a1840', ink: '#fff8ee', muted: '#cbb8e6', accent: '#ffcf4a', hot: '#ff5a7a', soft: '#f6e6c8' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'play', pt: 0,
      purse: 0, used: 0, bigQ: 0, chute: 0, waitT: 0, down: false, ax: 0.5, firstDrop: false, slotUse: 0, jacks: 0, pairs: 0,
      hearts: 3, stars: 0, got: 0, starOk: [false, false, false], pts: 0, ok: false, why: '', won: false, dead: false, tries: 0, again: false,
      seen: new Set<string>(), tips: new Set<string>(), newsQ: [], news: null, events: [], fallers: [], slow: 0, edgeT: 0, kid: { mode: 'idle', until: 0 },
      log: [], inputs: 0, sameRun: 0, sameMax: 0, lastX: -1,
    } as unknown as CoinState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    const p = inp.pointer ?? null;
    if (p) (s.down = true), (s.ax = railX(p.x));
    else if (s.down) (s.down = false), release(s);
    s.t++;
    s.pt++;
    if (s.newsQ.length && (!s.news || s.t - s.news.t > NEWS_T)) s.news = { text: s.newsQ.shift()!, t: s.t };
    if (s.events.length > 80 || (s.events.length && s.t - s.events[0].t > 200)) s.events = s.events.filter((e) => s.t - e.t < 200);
    cosmetic(s);
    if (s.phase === 'result') {
      if (s.pt >= (s.ok ? RESULT_OK : RESULT_FAIL)) {
        if (s.ok) {
          if (s.won) s.dead = true;
          else (s.again = false), s.stage++, newStage(s);
        } else if (s.hearts <= 0) s.dead = true;
        else (s.again = true), newStage(s);
      }
      return;
    }
    if (s.slow > 0 && s.slow-- % 2 === 0) return;
    simStep(s);
    const S = s.S;
    if (s.phase === 'win') {
      if (s.pt >= WIN_T) finish(s, true, '');
      return;
    }
    if (S.win === 1) {
      s.phase = 'win';
      s.pt = 0;
      return;
    }
    if (S.win === -1) return finish(s, false, '인형이 옆 구멍으로 쏙!');
    const busy = S.drops.length > 0 || s.slot.spin > 0 || s.slot.q > 0;
    if (s.purse <= 0 && !busy) {
      s.waitT++;
      if (s.waitT > PER + 30) finish(s, false, '동전을 다 썼어요');
    } else s.waitT = 0;
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
const ready = (s: CoinState) => s.phase === 'play' && s.chute <= 0 && s.purse > 0 && !s.S.drops.some((d) => !d.w) && s.pt > 20;
/** 별 하나의 값 (인형이 턱까지 가는 길 전체 = 1000) */
const STAR_V = 280;
let SUPPORT = 6;
export const setSupport = (v: number) => (SUPPORT = v);
let DBG = false;
export const setDbg = (v: boolean) => (DBG = v);

/** 판의 값(잘하는 봇이 내다본 뒤): 목표 인형이 턱에 얼마나 가까운지 · 받은 동전 · 옆으로 잃은 것 · 남은 별 조건 */
function value(s: CoinState, S: Sim) {
  const d = STAGES[s.stage];
  if (S.win === -1) return -5000;
  let v = S.win === 1 ? 1040 : 0;
  const tg = S.b.find((o) => o.tg === 1);
  if (tg) {
    v += 1000 * tg.y;
    // 인형 바로 뒤에 모인 동전 = 다음 밀기에 인형을 밀어 줄 힘
    for (const o of S.b) if (o !== tg && o.y < tg.y && o.y > tg.y - 0.42 && Math.abs(o.x - tg.x) < tg.r + o.r * 0.5) v += SUPPORT * (o.k === BIG ? 2 : 1);
  }
  v += 3 * S.medals - 6 * S.side;
  if (d.star3 === 'medal') v += 22 * Math.min(S.medals, d.medal ?? 0);
  if (d.star3 === 'tower') v += S.b.reduce((a, o) => a - (o.k === TOWER ? STAR_V * 0.5 : 0), 0);
  if (d.star3 === 'twin') {
    // 왕관 인형이 먼저 떨어지면 판이 끝나므로 덤 인형은 그 전에
    const dc = S.b.find((o) => o.k === DOLL && !o.tg);
    if (S.decoy) v += STAR_V;
    else if (dc && S.win !== 1) v += STAR_V * 0.6 * clamp((dc.y - 0.75) / 0.25, 0, 1);
  }
  if (tg && s.L.side && !S.walls && tg.y > s.L.h0 - 0.1) v -= 1200 * Math.max(0, 0.17 - Math.min(tg.x, 1 - tg.x));
  return v;
}

/** 지금부터 H틱 돌려 본 값. prep으로 동전·폭포·밀대 힘내기 따위를 넣는다 */
let lastWin = 0;
function sim(s: CoinState, H: number, prep?: (S: Sim) => void) {
  const S = cloneSim(s.S);
  prep?.(S);
  for (let k = 0; k < H && S.win === 0; k++) tick(S, s.L);
  lastWin = S.win;
  return value(s, S);
}

const XS = [0.07, 0.19, 0.31, 0.43, 0.55, 0.67, 0.79, 0.93];
/** 슬롯을 한 번 돌렸을 때 얻는 것의 기댓값 — 릴에 든 그림 수(화면에 보이는 정보)로 셈 */
function slotEV(s: CoinState, gJack: number, gPair: number[], vc: number) {
  const R = STAGES[s.stage].reels, n = R.length, sl = s.slot;
  if (sl.held.some(Boolean)) {
    let p = 0;
    for (const f of R) {
      const sy = [0, 1, 2].map((k) => (sl.held[k] ? STAGES[s.stage].reels[sl.cur[k]] : f));
      if (judge(sy).kind === 'jack') p++;
    }
    return (p / n) * gJack;
  }
  let ev = 0;
  const P = 1 / (n * n * n);
  for (const a of R)
    for (const b of R)
      for (const c of R) {
        const J = judge([a, b, c]);
        if (J.kind === 'jack') ev += P * gJack;
        else if (J.kind === 'pair') {
          // 짝은 붙잡힌다 — 다음 한 번은 남은 한 릴만: 그때 잭팟이 날 확률만큼 덤
          let p2 = 0;
          for (const f of R) if (f === J.sym || f === R_) p2++;
          ev += P * (gPair[J.sym] + 0.8 * Math.max(0, (p2 / n) * gJack - vc));
        }
      }
  return ev;
}

interface Plan { x: number; slot: boolean; key: string; wait?: number }
const brain = new WeakMap<object, Plan>();
function plan(s: CoinState): Plan {
  const key = `${s.stage}:${s.tries}:${s.used}`;
  const d = STAGES[s.stage], S0 = s.S;
  const k = s.bigQ > 0 ? BIG : COIN;
  // 내다보는 길이: 폭포까지 다 내려앉은 뒤 밀대가 한 번 끝까지 밀 때까지
  const ph0 = S0.ph + FLIGHT + 60, H = FLIGHT + 60 + ((PER / 2 - (ph0 % PER) + PER) % PER) + 8;
  const tg = S0.b.find((o) => o.tg === 1);
  const xs = XS.slice();
  if (tg) xs.push(clamp(tg.x, RC, 1 - RC));
  const drop = (x: number, kk: number) => (S: Sim) => void S.drops.push({ x, land: S.t + FLIGHT, k: kk, w: 0 });
  const base = sim(s, H);
  // 가만 둬도 밀대가 떨어뜨릴 것 같으면 동전을 아낀다 (★ 동전 남기기)
  if (lastWin === 1) return { x: 0.5, slot: false, key, wait: s.t + 40 };
  let bx = 0.5, bv = -1e9;
  for (const x of xs) {
    const v = sim(s, H, drop(x, k));
    if (v > bv) (bv = v), (bx = x);
  }
  if (d.reels.length && bv < 2200 && s.bigQ === 0) {
    const vc = Math.max(5, bv - base);
    const r = mulberry32(s.t + 99);
    const gJack = sim(s, H, (S) => pour(S, r)) - base + (d.star3 === 'jackpot' && s.jacks === 0 ? STAR_V : 0);
    const has = (sym: number) => d.reels.includes(sym) || d.reels.includes(R_);
    const keepShort = d.keep && s.purse <= d.keep + 1 ? STAR_V * 0.35 : 0;
    const gPair = [
      2 * vc + keepShort,
      has(B) ? sim(s, H, drop(bx, BIG)) - bv : 0,
      has(F) ? sim(s, H, (S) => void (S.fever = PER * 2)) - base : 0,
      has(W) && s.L.side && !S0.walls ? sim(s, H, (S) => void (S.walls = true)) - base + 40 : 0,
      0,
      0,
    ];
    const evs = slotEV(s, gJack, gPair, vc);
    // 꼭 쓸 동전(인형까지 밀기) · 아낄 동전(★ 남기기)을 빼고 남는 동전으로만 슬롯을 노린다 (붙잡힌 짝이면 조금 더 과감히)
    const need = Math.ceil((1000 - Math.min(base, 1000)) / Math.max(vc, 14));
    const keep = s.purse >= d.keep ? d.keep : 0;
    const spare = s.purse - need - keep + (s.slot.held.some(Boolean) ? 1 : 0), stuck = s.purse < need;
    if (DBG) console.log(`st${s.stage} purse ${s.purse} need ${need} spare ${spare} base ${base.toFixed(0)} bv ${bv.toFixed(0)} vc ${vc.toFixed(0)} gJack ${gJack.toFixed(0)} gPair ${gPair.map((v) => v.toFixed(0)).join(",")} ev ${evs.toFixed(0)} held ${s.slot.held.some(Boolean)}`);
    if ((spare >= 1 || stuck) && base + evs > bv + 5) return { x: 0.5, slot: true, key };
  }
  return { x: bx, slot: false, key };
}

/** 손가락 자리(화면 x) ↔ 떨어뜨리는 줄 위 x */
const RAIL_Y = 0.06;
const at = (x: number): Input => ({ tap: false, dir: 0, pointer: { x: PX(x, RAIL_Y), y: 0.3 } });

/** 누른 채 기다리다 떼기: 슬롯을 노리면 구멍이 손가락 밑에 올 때, 선반을 노리면 구멍이 비켜 있을 때 */
function holdRelease(s: CoinState, x: number, slot: boolean): Input {
  if (!s.down) return at(x);
  const ok = slot ? inPocket(s, s.ax) && Math.abs(s.ax - pocketX(s)) < PW * 0.7 : !inPocket(s, s.ax) && !inPocket(s, s.ax + 0.02) && !inPocket(s, s.ax - 0.02);
  return ok ? NO : at(x);
}

/** 잘하는 봇: 떨굴 자리 후보마다 물리를 끝까지 내다보고(밀대 한 번), 슬롯은 릴 그림 수로 기댓값을 계산해 더 나은 쪽 */
export const coinfallSmart: Bot<CoinState> = {
  name: '동전 박사',
  act(s) {
    if (s.down) {
      const m = brain.get(s);
      if (!m) return NO;
      if (m.slot) return holdRelease(s, pocketX(s) + Math.sign(Math.cos((TAU * s.t) / STAGES[s.stage].pocket)) * 0.02, true);
      return holdRelease(s, m.x, false);
    }
    if (!ready(s)) return NO;
    const key = `${s.stage}:${s.tries}:${s.used}`;
    let m = brain.get(s);
    if (!m || m.key !== key || (m.wait && s.t >= m.wait)) brain.set(s, (m = plan(s)));
    if (m.wait) return NO;
    return m.slot ? at(pocketX(s)) : at(m.x);
  },
};

/** 버릇 봇 ①: 늘 가운데에 떨군다 (구멍이 지나가면 그냥 들어감) */
export const coinfallHabit: Bot<CoinState> = {
  name: '버릇: 늘 가운데',
  act(s) {
    if (s.down) return NO;
    return ready(s) ? at(0.5) : NO;
  },
};

/** 버릇 봇 ②(독립): 늘 목표 인형 바로 뒤에, 슬롯은 피한다 */
export const coinfallHabit2: Bot<CoinState> = {
  name: '버릇: 인형 바로 뒤',
  act(s) {
    const tg = s.S.b.find((o) => o.tg === 1);
    const x = tg ? clamp(tg.x, RC, 1 - RC) : 0.5;
    if (s.down) return holdRelease(s, x, false);
    return ready(s) ? at(x) : NO;
  },
};

const dumbMem = new WeakMap<object, { next: number; until: number; x: number }>();
/** 못하는 봇: 아무 때나 아무 데나 톡 */
export const coinfallRandom: Bot<CoinState> = {
  name: '아무 데나 툭',
  act(s, rng) {
    let m = dumbMem.get(s);
    if (!m) dumbMem.set(s, (m = { next: 20 + Math.floor(rng() * 60), until: -1, x: 0.5 }));
    if (s.t < m.until) return { tap: false, dir: 0, pointer: { x: m.x, y: 0.3 } };
    if (s.t < m.next) return NO;
    m.next = s.t + 30 + Math.floor(rng() * 110);
    m.until = s.t + 2 + Math.floor(rng() * 4);
    m.x = rng();
    return { tap: false, dir: 0, pointer: { x: m.x, y: 0.3 } };
  },
};

// ───────────────────────────── 화면 배치 ─────────────────────────────
/** 선반 평면(x 0~1, y −0.14~D) → 화면(가로 0~1, 세로 0~A). 뒤가 좁은 3/4 시점 */
const SY0 = 0.53, KY = 0.53, SB = 0.72, SF = 0.88, YB = -0.13;
const scl = (y: number) => SB + (SF - SB) * (y / D);
const PX = (x: number, y: number) => 0.5 + (x - 0.5) * scl(y);
const PY = (y: number) => SY0 + y * KY;
const railX = (sx: number) => clamp(0.5 + (sx - 0.5) / scl(RAIL_Y), 0, 1);
/** 떨어뜨리는 줄(화면 세로) · 밀대 높이 · 아래 띠 시작 */
const RAIL_SY = 0.398, ZP = 0.05, BAND = 1.245;

// ───────────────────────────── 그리기 ─────────────────────────────
const hsh = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
interface DollLook { body: string; dark: string; belly: string; ear: string; kind: string; name: string }
const DOLLS: DollLook[] = [
  { body: '#ffe066', dark: '#e0a800', belly: '#fff6c0', ear: '#ffb02e', kind: 'chick', name: '병아리' },
  { body: '#ffb066', dark: '#d9772a', belly: '#fff0dc', ear: '#ff9a4a', kind: 'cat', name: '고양이' },
  { body: '#b07a4a', dark: '#7a4f2a', belly: '#e9cfa8', ear: '#8a5a32', kind: 'bear', name: '곰' },
  { body: '#fbf3f6', dark: '#d9c4cf', belly: '#ffffff', ear: '#ffb3c8', kind: 'bunny', name: '토끼' },
  { body: '#ffb3c6', dark: '#e07a98', belly: '#ffd6e2', ear: '#ff8fae', kind: 'pig', name: '돼지' },
  { body: '#f0d3a0', dark: '#c79a5a', belly: '#fff3dc', ear: '#a8743a', kind: 'dog', name: '강아지' },
  { body: '#ff8a4a', dark: '#c95a22', belly: '#fff3e6', ear: '#e0602a', kind: 'fox', name: '여우' },
  { body: '#ffffff', dark: '#cfcfd8', belly: '#ffffff', ear: '#2a2a33', kind: 'panda', name: '판다' },
  { body: '#b9c2cf', dark: '#8a93a3', belly: '#e9edf3', ear: '#9aa3b3', kind: 'cat', name: '아기 고양이' },
];
const mem = new WeakMap<object, { y: Map<number, number>; mv: Map<number, number>; say: { x: number; y: number; t: number }[] }>();

function starPath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}
function emoji(ctx: CanvasRenderingContext2D, e: string, x: number, y: number, size: number) {
  ctx.fillStyle = '#ffffff';
  ctx.font = `${size}px system-ui, "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(e, x, y);
}

/** 릴 그림: 동전·왕동전은 직접 그리고 나머지는 이모지 */
function drawSym(ctx: CanvasRenderingContext2D, sym: number, x: number, y: number, size: number) {
  if (sym === 0) drawCoin(ctx, x, y + size * 0.16, size * 0.4, false, 0, 1);
  else if (sym === 1) drawCoin(ctx, x, y + size * 0.2, size * 0.46, true, 0, 1);
  else emoji(ctx, SYM_EMO[sym], x, y, size * (sym === 5 ? 0.8 : 0.9));
}

/** 동전 (위에서 비스듬히 본 원판 + 두께). big = 왕동전, ghost = 반투명 */
function drawCoin(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, big: boolean, t: number, seed: number, ghost = false) {
  const ry = rx * 0.56, th = rx * (big ? 0.42 : 0.3);
  ctx.save();
  if (ghost) ctx.globalAlpha = 0.55;
  if (!ghost) {
    ctx.fillStyle = 'rgba(40,10,40,.28)';
    ctx.beginPath();
    ctx.ellipse(x + rx * 0.12, y + ry * 0.25, rx * 1.02, ry * 0.95, 0, 0, TAU);
    ctx.fill();
  }
  // 옆면
  const sg = ctx.createLinearGradient(x - rx, 0, x + rx, 0);
  sg.addColorStop(0, big ? '#b8641a' : '#b98a1a');
  sg.addColorStop(0.5, big ? '#f0a23a' : '#f2c84a');
  sg.addColorStop(1, big ? '#a0520f' : '#a8780e');
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI);
  ctx.lineTo(x - rx, y - th);
  ctx.ellipse(x, y - th, rx, ry, 0, Math.PI, 0, true);
  ctx.closePath();
  ctx.fill();
  // 윗면
  const tg = ctx.createRadialGradient(x - rx * 0.35, y - th - ry * 0.4, rx * 0.1, x, y - th, rx * 1.1);
  tg.addColorStop(0, big ? '#ffe6b0' : '#fff6c4');
  tg.addColorStop(0.55, big ? '#ffb347' : '#ffd23f');
  tg.addColorStop(1, big ? '#d9781e' : '#d99e18');
  ctx.fillStyle = tg;
  ctx.beginPath();
  ctx.ellipse(x, y - th, rx, ry, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = big ? 'rgba(140,60,0,.55)' : 'rgba(150,100,0,.5)';
  ctx.lineWidth = Math.max(0.8, rx * 0.06);
  ctx.beginPath();
  ctx.ellipse(x, y - th, rx * 0.74, ry * 0.74, 0, 0, TAU);
  ctx.stroke();
  // 무늬: 동전은 별, 왕동전은 왕관
  ctx.fillStyle = big ? 'rgba(150,60,0,.55)' : 'rgba(170,110,0,.45)';
  if (big) {
    const cw = rx * 0.42, cy = y - th;
    ctx.beginPath();
    ctx.moveTo(x - cw, cy + ry * 0.3);
    ctx.lineTo(x - cw, cy - ry * 0.25);
    ctx.lineTo(x - cw * 0.5, cy + ry * 0.05);
    ctx.lineTo(x, cy - ry * 0.4);
    ctx.lineTo(x + cw * 0.5, cy + ry * 0.05);
    ctx.lineTo(x + cw, cy - ry * 0.25);
    ctx.lineTo(x + cw, cy + ry * 0.3);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.save();
    ctx.translate(x, y - th);
    ctx.scale(1, 0.56);
    starPath(ctx, 0, 0, rx * 0.36);
    ctx.fill();
    ctx.restore();
  }
  // 반짝
  if (!ghost && (t + seed * 37) % 160 < 8) {
    ctx.fillStyle = '#ffffff';
    starPath(ctx, x - rx * 0.4, y - th - ry * 0.35, rx * 0.28 * Math.sin((((t + seed * 37) % 160) / 8) * Math.PI));
    ctx.fill();
  }
  ctx.restore();
}

/** 동전 탑: 동전 여섯 겹 */
function drawTower(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, t: number, wob: number) {
  for (let k = 0; k < 6; k++) drawCoin(ctx, x + Math.sin(t * 0.2 + k) * wob * k * 0.6, y - k * rx * 0.33, rx, false, t, k + 50);
}

/** 동물 인형 (앉은 봉제 인형). mood: idle · edge(턱 끝 버둥) · push(밀리는 중) · fly(떨어지며 야호) */
function drawDoll(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, sp: number, mood: string, t: number, crown: boolean, tilt = 0) {
  const L = DOLLS[sp];
  ctx.save();
  ctx.translate(x, y);
  if (mood !== 'fly') {
    ctx.fillStyle = 'rgba(40,10,40,.32)';
    ctx.beginPath();
    ctx.ellipse(u * 0.1, 0, u * 0.95, u * 0.36, 0, 0, TAU);
    ctx.fill();
  }
  const wob = mood === 'edge' ? Math.sin(t * 0.5) * 0.12 : mood === 'push' ? Math.sin(t * 0.3) * 0.05 : 0;
  ctx.rotate(tilt + wob);
  // 발
  ctx.fillStyle = L.dark;
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(sd * u * 0.38, -u * 0.12, u * 0.26, u * 0.18, 0, 0, TAU);
    ctx.fill();
  }
  // 몸통
  const bg = ctx.createRadialGradient(-u * 0.25, -u * 0.85, u * 0.1, 0, -u * 0.55, u * 0.9);
  bg.addColorStop(0, L.belly);
  bg.addColorStop(0.5, L.body);
  bg.addColorStop(1, L.dark);
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.ellipse(0, -u * 0.55, u * 0.68, u * 0.58, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = L.belly;
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.ellipse(0, -u * 0.45, u * 0.38, u * 0.36, 0, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
  // 팔 (턱 끝이면 버둥버둥)
  const flap = mood === 'edge' ? Math.sin(t * 0.7) * 0.9 : mood === 'fly' ? -1.2 : mood === 'push' ? 0.3 : 0;
  ctx.fillStyle = L.body;
  for (const sd of [-1, 1]) {
    ctx.save();
    ctx.translate(sd * u * 0.58, -u * 0.72);
    ctx.rotate(sd * (0.5 + flap * (sd > 0 ? 1 : -0.8)));
    ctx.beginPath();
    ctx.ellipse(0, u * 0.22, u * 0.16, u * 0.3, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  // 머리
  const hx = 0, hy = -u * 1.38, hr = u * 0.6;
  // 귀
  ctx.fillStyle = L.ear;
  if (L.kind === 'bunny') {
    for (const sd of [-1, 1]) {
      ctx.save();
      ctx.translate(hx + sd * hr * 0.4, hy - hr * 0.7);
      ctx.rotate(sd * (0.2 + (mood === 'edge' ? Math.sin(t * 0.6) * 0.3 : 0)));
      ctx.fillStyle = L.body;
      ctx.beginPath();
      ctx.ellipse(0, -hr * 0.55, hr * 0.26, hr * 0.7, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = L.ear;
      ctx.beginPath();
      ctx.ellipse(0, -hr * 0.5, hr * 0.13, hr * 0.5, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  } else if (L.kind === 'cat' || L.kind === 'fox' || L.kind === 'pig') {
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(hx + sd * hr * 0.85, hy - hr * 0.25);
      ctx.lineTo(hx + sd * hr * (L.kind === 'pig' ? 0.6 : 0.62), hy - hr * (L.kind === 'pig' ? 0.95 : 1.15));
      ctx.lineTo(hx + sd * hr * 0.2, hy - hr * 0.75);
      ctx.closePath();
      ctx.fill();
    }
  } else if (L.kind === 'dog') {
    for (const sd of [-1, 1]) {
      ctx.save();
      ctx.translate(hx + sd * hr * 0.85, hy - hr * 0.2);
      ctx.rotate(sd * (0.35 + (mood === 'edge' ? Math.sin(t * 0.6) * 0.4 : 0)));
      ctx.beginPath();
      ctx.ellipse(0, hr * 0.35, hr * 0.26, hr * 0.55, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  } else if (L.kind === 'chick') {
    ctx.fillStyle = L.ear;
    for (let k = -1; k <= 1; k++) {
      ctx.beginPath();
      ctx.ellipse(hx + k * hr * 0.18, hy - hr * 1.0, hr * 0.1, hr * 0.26, k * 0.5, 0, TAU);
      ctx.fill();
    }
  } else {
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(hx + sd * hr * 0.72, hy - hr * 0.68, hr * 0.32, 0, TAU);
      ctx.fill();
    }
  }
  const hg = ctx.createRadialGradient(hx - hr * 0.35, hy - hr * 0.4, hr * 0.1, hx, hy, hr * 1.1);
  hg.addColorStop(0, L.belly);
  hg.addColorStop(0.55, L.body);
  hg.addColorStop(1, L.dark);
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.arc(hx, hy, hr, 0, TAU);
  ctx.fill();
  if (L.kind === 'panda') {
    ctx.fillStyle = '#2a2a33';
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(hx + sd * hr * 0.36, hy - hr * 0.02, hr * 0.24, hr * 0.3, sd * 0.5, 0, TAU);
      ctx.fill();
    }
  }
  if (L.kind === 'fox' || L.kind === 'bear' || L.kind === 'dog') {
    ctx.fillStyle = L.belly;
    ctx.beginPath();
    ctx.ellipse(hx, hy + hr * 0.38, hr * 0.42, hr * 0.3, 0, 0, TAU);
    ctx.fill();
  }
  // 볼
  ctx.fillStyle = 'rgba(255,110,130,.45)';
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(hx + sd * hr * 0.55, hy + hr * 0.25, hr * 0.17, hr * 0.1, 0, 0, TAU);
    ctx.fill();
  }
  // 눈
  const ex = hr * 0.33, ey = hy - hr * 0.05;
  ctx.fillStyle = '#1a1420';
  ctx.strokeStyle = '#1a1420';
  ctx.lineWidth = Math.max(1.2, hr * 0.1);
  ctx.lineCap = 'round';
  for (const sd of [-1, 1]) {
    const cx = hx + sd * ex;
    if (mood === 'edge') {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, ey, hr * 0.2, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#1a1420';
      ctx.beginPath();
      ctx.arc(cx + Math.sin(t * 0.4) * hr * 0.06, ey, hr * 0.08, 0, TAU);
      ctx.fill();
    } else if (mood === 'fly') {
      ctx.beginPath();
      ctx.arc(cx, ey + hr * 0.06, hr * 0.13, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else if (mood === 'push') {
      ctx.beginPath();
      ctx.moveTo(cx - hr * 0.12, ey - sd * hr * 0.04);
      ctx.lineTo(cx + hr * 0.12, ey + sd * hr * 0.04);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.ellipse(cx, ey, hr * 0.09, hr * 0.12, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx + hr * 0.03, ey - hr * 0.05, hr * 0.035, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#1a1420';
    }
  }
  // 코·부리·입
  const my = hy + hr * 0.36;
  if (L.kind === 'chick') {
    ctx.fillStyle = '#ff8a1e';
    ctx.beginPath();
    ctx.moveTo(hx - hr * 0.16, my - hr * 0.12);
    ctx.lineTo(hx + hr * 0.16, my - hr * 0.12);
    ctx.lineTo(hx, my + (mood === 'edge' || mood === 'fly' ? hr * 0.22 : hr * 0.08));
    ctx.closePath();
    ctx.fill();
  } else if (L.kind === 'pig') {
    ctx.fillStyle = '#ff8fae';
    ctx.beginPath();
    ctx.ellipse(hx, my - hr * 0.05, hr * 0.24, hr * 0.17, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#b8486a';
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(hx + sd * hr * 0.09, my - hr * 0.05, hr * 0.04, hr * 0.06, 0, 0, TAU);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = '#3a2228';
    ctx.beginPath();
    ctx.ellipse(hx, my - hr * 0.12, hr * 0.1, hr * 0.07, 0, 0, TAU);
    ctx.fill();
  }
  if (mood === 'edge' || mood === 'fly') {
    ctx.fillStyle = '#8a2a3a';
    ctx.beginPath();
    ctx.ellipse(hx, my + hr * 0.1, hr * 0.15, hr * (mood === 'fly' ? 0.16 : 0.12), 0, 0, TAU);
    ctx.fill();
  } else if (L.kind !== 'chick') {
    ctx.strokeStyle = '#3a2228';
    ctx.lineWidth = Math.max(1, hr * 0.06);
    ctx.beginPath();
    ctx.arc(hx - hr * 0.08, my - hr * 0.02, hr * 0.08, 0.2, Math.PI - 0.4);
    ctx.arc(hx + hr * 0.08, my - hr * 0.02, hr * 0.08, 0.4, Math.PI - 0.2);
    ctx.stroke();
  }
  // 땀방울 (버둥)
  if (mood === 'edge') {
    ctx.fillStyle = '#9fe3ff';
    ctx.beginPath();
    ctx.ellipse(hx + hr * 0.95, hy - hr * 0.3 + (t % 24) * hr * 0.03, hr * 0.1, hr * 0.16, 0, 0, TAU);
    ctx.fill();
  }
  if (crown) {
    const cw = hr * 0.5, cy = hy - hr * 0.95;
    ctx.fillStyle = '#ffd43b';
    ctx.strokeStyle = '#a86a00';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(hx - cw, cy + cw * 0.45);
    ctx.lineTo(hx - cw, cy - cw * 0.35);
    ctx.lineTo(hx - cw * 0.5, cy + cw * 0.05);
    ctx.lineTo(hx, cy - cw * 0.6);
    ctx.lineTo(hx + cw * 0.5, cy + cw * 0.05);
    ctx.lineTo(hx + cw, cy - cw * 0.35);
    ctx.lineTo(hx + cw, cy + cw * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

/** 구경꾼 아기 동물 (기계 앞 아래). kind 0 너구리 · 1 토끼. mode idle · gasp · cheer · sad */
function drawKid(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, kind: number, mode: string, t: number, look: number) {
  ctx.save();
  ctx.translate(x, y + (mode === 'cheer' ? -Math.abs(Math.sin(t * 0.25)) * u * 0.35 : 0));
  const body = kind ? '#f4eef6' : '#9a8f86', dark = kind ? '#d6c6dc' : '#6e645c', mask = kind ? '#ffd0dc' : '#3c3530';
  // 몸 (아래는 띠에 가림)
  ctx.fillStyle = kind ? '#7fc8ff' : '#ff8fb0';
  ctx.beginPath();
  ctx.ellipse(0, u * 1.0, u * 0.85, u * 0.7, 0, 0, TAU);
  ctx.fill();
  // 팔: 만세 / 유리에 손
  ctx.fillStyle = body;
  for (const sd of [-1, 1]) {
    ctx.save();
    ctx.translate(sd * u * 0.62, u * 0.5);
    ctx.rotate(mode === 'cheer' ? sd * (2.4 + Math.sin(t * 0.4) * 0.3) : mode === 'gasp' ? sd * 2.9 : sd * 0.3);
    ctx.beginPath();
    ctx.ellipse(0, -u * 0.3, u * 0.17, u * 0.38, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  // 귀
  ctx.fillStyle = dark;
  if (kind) {
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(sd * u * 0.3, -u * 0.95, u * 0.17, u * 0.5, sd * (mode === 'sad' ? 0.9 : 0.15), 0, TAU);
      ctx.fill();
    }
  } else {
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sd * u * 0.7, -u * 0.3);
      ctx.lineTo(sd * u * 0.55, -u * 0.95);
      ctx.lineTo(sd * u * 0.15, -u * 0.6);
      ctx.closePath();
      ctx.fill();
    }
  }
  const hg = ctx.createRadialGradient(-u * 0.2, -u * 0.35, u * 0.1, 0, 0, u * 0.85);
  hg.addColorStop(0, kind ? '#ffffff' : '#b9aea4');
  hg.addColorStop(1, body);
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.ellipse(0, -u * 0.1, u * 0.72, u * 0.62, 0, 0, TAU);
  ctx.fill();
  if (!kind) {
    ctx.fillStyle = mask;
    ctx.beginPath();
    ctx.ellipse(0, -u * 0.18, u * 0.62, u * 0.2, 0, 0, TAU);
    ctx.fill();
  }
  // 눈 (인형 쪽을 본다)
  for (const sd of [-1, 1]) {
    const cx = sd * u * 0.26 + look * u * 0.06, cy = -u * 0.18;
    if (mode === 'cheer') {
      ctx.strokeStyle = '#1a1420';
      ctx.lineWidth = Math.max(1.2, u * 0.08);
      ctx.beginPath();
      ctx.arc(cx, cy + u * 0.04, u * 0.1, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, cy, u * (mode === 'gasp' ? 0.15 : 0.12), 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#1a1420';
      ctx.beginPath();
      ctx.arc(cx + look * u * 0.04, cy - u * 0.02, u * 0.065, 0, TAU);
      ctx.fill();
    }
  }
  ctx.fillStyle = '#3a2228';
  ctx.beginPath();
  ctx.ellipse(0, u * 0.05, u * 0.08, u * 0.06, 0, 0, TAU);
  ctx.fill();
  if (mode === 'gasp' || mode === 'cheer') {
    ctx.fillStyle = '#8a2a3a';
    ctx.beginPath();
    ctx.ellipse(0, u * 0.22, u * 0.11, u * (mode === 'gasp' ? 0.13 : 0.09), 0, 0, TAU);
    ctx.fill();
  }
  if (mode === 'sad') {
    ctx.fillStyle = '#9fe3ff';
    ctx.beginPath();
    ctx.ellipse(u * 0.32, -u * 0.02 + (t % 30) * u * 0.012, u * 0.06, u * 0.1, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawAll(ctx: CanvasRenderingContext2D, s: CoinState, w: number, h: number, th: Theme) {
  const fx = juice(s), t = s.t, S = s.S, d = STAGES[s.stage];
  const X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w;
  const SX = (x: number, y: number) => X(PX(x, y)), SY = (y: number) => Y(PY(y));
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${R(sz)}px system-ui, sans-serif`);
  let M = mem.get(s);
  if (!M) mem.set(s, (M = { y: new Map(), mv: new Map(), say: [] }));
  const say = (x: number, y: number, text: string, col: string, size: number) => {
    for (let k = 0; k < 6 && M!.say.some((q) => t - q.t < 40 && Math.abs(q.x - x) < w * 0.3 && Math.abs(q.y - y) < size + 4); k++) y -= size + 4;
    M!.say.push({ x, y, t });
    if (M!.say.length > 14) M!.say.shift();
    fx.pop(Math.max(w * 0.16, Math.min(w * 0.84, x)), y, text, col, size);
  };
  const quad = (p: number[][]) => {
    ctx.beginPath();
    ctx.moveTo(p[0][0], p[0][1]);
    for (let k = 1; k < p.length; k++) ctx.lineTo(p[k][0], p[k][1]);
    ctx.closePath();
  };
  const tg = S.b.find((o) => o.tg === 1);

  ctx.save();
  fx.begin(ctx);
  // ═════════ 오락실 방 ═════════
  {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#1c0f33');
    g.addColorStop(0.6, '#2a1546');
    g.addColorStop(1, '#170a28');
    ctx.fillStyle = g;
    ctx.fillRect(-10, -10, w + 20, h + 20);
    // 네온 줄 · 반짝이 점
    for (let k = 0; k < 26; k++) {
      const x = hsh(k * 3.1) * w, y = hsh(k * 7.7) * Y(1.3), a = 0.25 + 0.35 * Math.abs(Math.sin(t * 0.03 + k));
      ctx.fillStyle = `rgba(${k % 3 ? '255,120,220' : '120,220,255'},${a * 0.5})`;
      ctx.beginPath();
      ctx.arc(x, y, 1.2 + (k % 3), 0, TAU);
      ctx.fill();
    }
  }
  // ═════════ 기계 몸통 ═════════
  const cabL = X(0.025), cabR = X(0.975), cabT = Y(0.088), cabB = Y(BAND + 0.02);
  {
    const g = ctx.createLinearGradient(cabL, 0, cabR, 0);
    g.addColorStop(0, '#7a2a7a');
    g.addColorStop(0.08, '#c2489e');
    g.addColorStop(0.5, '#e05aa8');
    g.addColorStop(0.92, '#c2489e');
    g.addColorStop(1, '#6a2068');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(cabL, cabT, cabR - cabL, cabB - cabT, R(0.04));
    ctx.fill();
    ctx.strokeStyle = '#ffd1f0';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  // ═════════ 슬롯 머신 (위) ═════════
  drawSlot(ctx, s, t, X, Y, R, font);
  // ═════════ 안쪽 벽 · 떨어뜨리는 줄 ═════════
  const back = [[SX(0, YB), SY(YB) - R(ZP)], [SX(1, YB), SY(YB) - R(ZP)]];
  {
    const top = Y(RAIL_SY - 0.035);
    const g = ctx.createLinearGradient(0, top, 0, back[0][1]);
    g.addColorStop(0, '#3a1850');
    g.addColorStop(1, '#5a2a70');
    ctx.fillStyle = g;
    quad([[X(0.06), top], [X(0.94), top], [back[1][0], back[1][1]], [back[0][0], back[0][1]]]);
    ctx.fill();
  }
  // ═════════ 선반 ═════════
  const corner = (x: number, y: number) => [SX(x, y), SY(y)];
  {
    // 바닥 (반짝이는 금속)
    const g = ctx.createLinearGradient(0, SY(YB), 0, SY(D));
    g.addColorStop(0, '#5c4a7a');
    g.addColorStop(1, '#8c78b0');
    ctx.fillStyle = g;
    quad([corner(0, YB), corner(1, YB), corner(1, D), corner(0, D)]);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.07)';
    ctx.lineWidth = 1;
    for (let k = 1; k < 8; k++) {
      ctx.beginPath();
      ctx.moveTo(SX(k / 8, YB), SY(YB));
      ctx.lineTo(SX(k / 8, D), SY(D));
      ctx.stroke();
    }
    // 빛 번짐
    const lg = ctx.createRadialGradient(X(0.5), SY(0.45), R(0.05), X(0.5), SY(0.45), R(0.5));
    lg.addColorStop(0, 'rgba(255,230,255,.22)');
    lg.addColorStop(1, 'rgba(255,230,255,0)');
    ctx.fillStyle = lg;
    quad([corner(0, YB), corner(1, YB), corner(1, D), corner(0, D)]);
    ctx.fill();
    // 옆 구멍
    if (s.L.side) {
      for (const sx of [0, 1]) {
        const o = sx ? 1 : -1;
        ctx.fillStyle = '#12061e';
        quad([[SX(sx, s.L.h0), SY(s.L.h0)], [SX(sx, Math.min(D, s.L.h1)), SY(Math.min(D, s.L.h1))], [SX(sx, Math.min(D, s.L.h1)) + o * R(0.03), SY(Math.min(D, s.L.h1)) + R(0.02)], [SX(sx, s.L.h0) + o * R(0.03), SY(s.L.h0) + R(0.02)]]);
        ctx.fill();
      }
    }
  }
  // 밀대 (뒤에서 앞뒤로)
  {
    const py = S.py;
    const top = [[SX(0, YB), SY(YB) - R(ZP)], [SX(1, YB), SY(YB) - R(ZP)], [SX(1, py), SY(py) - R(ZP)], [SX(0, py), SY(py) - R(ZP)]];
    const g = ctx.createLinearGradient(0, SY(YB), 0, SY(py));
    g.addColorStop(0, '#8a5ab0');
    g.addColorStop(1, '#c79ae0');
    ctx.fillStyle = g;
    quad(top);
    ctx.fill();
    // 위의 줄무늬
    ctx.strokeStyle = 'rgba(255,255,255,.18)';
    ctx.lineWidth = R(0.012);
    for (let k = 0; k < 9; k++) {
      const x = (k + 0.5) / 9;
      ctx.beginPath();
      ctx.moveTo(SX(x - 0.03, YB + 0.02), SY(YB + 0.02) - R(ZP));
      ctx.lineTo(SX(x + 0.03, py - 0.02), SY(py - 0.02) - R(ZP));
      ctx.stroke();
    }
    // 앞면
    const fg = ctx.createLinearGradient(0, SY(py) - R(ZP), 0, SY(py));
    fg.addColorStop(0, S.fever > 0 ? '#ffe066' : '#ff7ab8');
    fg.addColorStop(1, S.fever > 0 ? '#e0a000' : '#c2387e');
    ctx.fillStyle = fg;
    quad([[SX(0, py), SY(py) - R(ZP)], [SX(1, py), SY(py) - R(ZP)], [SX(1, py), SY(py)], [SX(0, py), SY(py)]]);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    font(0.034, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(S.fever > 0 ? '⚡ 힘내! ⚡' : '▶ 밀대 ◀', X(0.5), SY(py) - R(ZP * 0.5));
  }
  // 떨어뜨리는 줄 · 슬롯 구멍 (밀대 위 높이)
  {
    // 줄 (크롬 막대)
    const ry = Y(RAIL_SY), x0 = SX(0, RAIL_Y), x1 = SX(1, RAIL_Y);
    const rg = ctx.createLinearGradient(0, ry - R(0.012), 0, ry + R(0.012));
    rg.addColorStop(0, '#ffffff');
    rg.addColorStop(0.5, '#b9b3c9');
    rg.addColorStop(1, '#6e6688');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.roundRect(x0 - R(0.02), ry - R(0.01), x1 - x0 + R(0.04), R(0.02), R(0.01));
    ctx.fill();
    // 슬롯 구멍 (줄 위를 오가는 컵)
    if (d.pocket) {
      const px = SX(pocketX(s), RAIL_Y), pw = R(PW * scl(RAIL_Y)) * 1.15, hot = s.down && inPocket(s, clamp(s.ax, RC, 1 - RC));
      ctx.save();
      if (hot) (ctx.shadowColor = '#fff3a0'), (ctx.shadowBlur = R(0.05));
      const cg = ctx.createLinearGradient(px - pw, 0, px + pw, 0);
      cg.addColorStop(0, '#d63a6a');
      cg.addColorStop(0.5, hot ? '#ffd84a' : '#ff6fa0');
      cg.addColorStop(1, '#a8204e');
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.moveTo(px - pw * 1.15, ry - R(0.022));
      ctx.lineTo(px + pw * 1.15, ry - R(0.022));
      ctx.lineTo(px + pw * 0.75, ry + R(0.03));
      ctx.lineTo(px - pw * 0.75, ry + R(0.03));
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#2a0a1a';
      ctx.beginPath();
      ctx.ellipse(px, ry - R(0.022), pw * 1.1, R(0.009), 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#fff3c8';
      font(0.03, 900);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('슬롯', px, ry + R(0.006));
      for (let k = 0; k < 3; k++) {
        ctx.fillStyle = (t >> 3) % 3 === k ? '#fff6a0' : 'rgba(255,255,255,.35)';
        ctx.beginPath();
        ctx.arc(px + (k - 1) * pw * 0.55, ry + R(0.024), R(0.005), 0, TAU);
        ctx.fill();
      }
    }
  }
  // 옆 레일 (유리 벽)
  const rail = (sx: number, y0: number, y1: number, open: boolean) => {
    const o = sx ? 1 : -1;
    ctx.fillStyle = open ? 'rgba(255,90,90,.0)' : '#c9b8e8';
    quad([[SX(sx, y0), SY(y0)], [SX(sx, y1), SY(y1)], [SX(sx, y1) + o * R(0.018), SY(y1) - R(0.03)], [SX(sx, y0) + o * R(0.018), SY(y0) - R(0.03)]]);
    if (!open) ctx.fill();
  };
  for (const sx of [0, 1]) {
    if (s.L.side && !S.walls) {
      rail(sx, YB, s.L.h0, false);
      // 위험 줄무늬
      ctx.save();
      ctx.strokeStyle = '#ffd84a';
      ctx.lineWidth = R(0.01);
      ctx.setLineDash([R(0.015), R(0.012)]);
      ctx.beginPath();
      ctx.moveTo(SX(sx, s.L.h0), SY(s.L.h0));
      ctx.lineTo(SX(sx, D), SY(D));
      ctx.stroke();
      ctx.restore();
    } else {
      rail(sx, YB, D, false);
      if (s.L.side && S.walls) {
        // 슬롯이 세운 벽돌 벽
        for (let k = 0; k < 6; k++) {
          const y = s.L.h0 + ((D - s.L.h0) * (k + 0.5)) / 6;
          ctx.fillStyle = k % 2 ? '#d9653a' : '#ef7f4a';
          ctx.fillRect(SX(sx, y) - R(0.014), SY(y) - R(0.04), R(0.028), R(0.04));
        }
      }
    }
  }

  // ═════════ 선반 위의 것들 (뒤 → 앞) ═════════
  const objs = S.b.slice().sort((a, b) => a.y - b.y);
  // 떨어지는 중인 동전(공중) · 고스트를 같이 그리기 위해 먼저 동전들
  for (const o of objs) {
    const sx = SX(o.x, o.y), sy = SY(o.y), u = R(o.r * scl(o.y));
    const prevY = M.y.get(o.id) ?? o.y;
    M.y.set(o.id, o.y);
    if (o.y - prevY > 0.0004) M.mv.set(o.id, t);
    if (o.k === COIN || o.k === BIG) drawCoin(ctx, sx, sy, u, o.k === BIG, t, o.id);
    else if (o.k === TOWER) drawTower(ctx, sx, sy, u, t, t - (M.mv.get(o.id) ?? -99) < 10 ? R(0.004) : 0);
    else {
      const edge = o.y > D - o.r * 0.85;
      const mood = edge ? 'edge' : t - (M.mv.get(o.id) ?? -99) < 12 ? 'push' : 'idle';
      drawDoll(ctx, sx, sy, u * 1.05, o.sp, mood, t, o.tg === 1 && !!d.decoy, edge ? 0.12 : 0);
      if (o.tg && d.decoy === undefined && s.phase === 'play' && s.pt > CARD_T) {
        // 목표 표시 (머리 위 작은 화살표)
        ctx.fillStyle = 'rgba(255,240,160,.9)';
        const ay = sy - u * 2.85 - Math.abs(Math.sin(t * 0.1)) * R(0.008);
        ctx.beginPath();
        ctx.moveTo(sx - R(0.012), ay - R(0.014));
        ctx.lineTo(sx + R(0.012), ay - R(0.014));
        ctx.lineTo(sx, ay);
        ctx.closePath();
        ctx.fill();
      }
    }
  }
  // 앞 턱 (크롬)
  {
    const g = ctx.createLinearGradient(0, SY(D), 0, SY(D) + R(0.035));
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.4, '#c9c2dc');
    g.addColorStop(1, '#5a4a78');
    ctx.fillStyle = g;
    quad([corner(0, D), corner(1, D), [SX(1, D), SY(D) + R(0.035)], [SX(0, D), SY(D) + R(0.035)]]);
    ctx.fill();
  }
  // 받침 접시 (떨어진 동전이 쌓인다)
  const trayY = SY(D) + R(0.1);
  {
    const tl = SX(0, D) - R(0.01), tr = SX(1, D) + R(0.01);
    const g = ctx.createLinearGradient(0, trayY - R(0.06), 0, trayY + R(0.04));
    g.addColorStop(0, '#2a1440');
    g.addColorStop(1, '#4a2a68');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(tl, SY(D) + R(0.035));
    ctx.lineTo(tr, SY(D) + R(0.035));
    ctx.lineTo(tr - R(0.03), trayY + R(0.03));
    ctx.lineTo(tl + R(0.03), trayY + R(0.03));
    ctx.closePath();
    ctx.fill();
    // 쌓인 동전
    const n = Math.min(26, S.medals);
    for (let k = 0; k < n; k++) {
      const px = 0.5 + (hsh(k * 2.3) - 0.5) * 0.8 * Math.min(1, 0.4 + k / 26), py = trayY + R(0.012) - Math.floor(k / 9) * R(0.008) - hsh(k) * R(0.01);
      drawCoin(ctx, X(px), py, R(0.026), false, t, k + 99);
    }
    ctx.fillStyle = '#ffe9a8';
    font(0.032, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`받은 동전 ${S.medals}${d.star3 === 'medal' ? ` / ${d.medal}` : ''}`, X(0.5), trayY + R(0.052));
  }
  // 떨어지는 것들 (턱 아래로 · 옆 구멍으로)
  for (const f of s.fallers) {
    const age = t - f.t0, ph = Math.min(1, age / 26);
    let x: number, y: number;
    if (f.side) (x = SX(f.side > 0 ? 1 : 0, Math.min(D, f.y)) + f.side * R(0.02 + age * 0.002)), (y = SY(Math.min(D, f.y)) + age * age * R(0.0003));
    else (x = SX(clamp(f.x, 0, 1), D)), (y = SY(D) + ph * ph * (trayY - SY(D)) - Math.sin(ph * Math.PI) * R(0.02));
    const a = age < 40 ? 1 : Math.max(0, 1 - (age - 40) / 30);
    ctx.save();
    ctx.globalAlpha = f.side ? Math.max(0, 1 - age / 40) : a;
    const u = R(RC * SF);
    if (f.k === DOLL) drawDoll(ctx, x, y, R(0.084 * SF), f.sp, 'fly', t, false, Math.sin(age * 0.3) * 0.5);
    else if (f.k === TOWER) drawTower(ctx, x, y, u, t, R(0.004));
    else drawCoin(ctx, x, y, f.k === BIG ? R(RB * SF) : u, f.k === BIG, t, f.t0);
    ctx.restore();
  }
  // 공중의 동전 (줄에서 선반으로) — 플레이어 동전과 잭팟 폭포
  for (const dr of S.drops) {
    const big = dr.k === BIG, fl = dr.w ? WFALL : FLIGHT, pp = clamp(1 - (dr.land - S.t) / fl, 0, 1);
    if (dr.land - S.t > fl) continue;
    const ly = S.py + (big ? RB : RC), x1 = SX(dr.x, ly), x0 = dr.w ? X(0.5 + (dr.x - 0.5) * 0.4) : SX(dr.x, RAIL_Y), y0 = dr.w ? Y(0.2) : Y(RAIL_SY), y1 = SY(ly);
    const x = x0 + (x1 - x0) * pp, y = y0 + (y1 - y0) * pp * pp - (dr.w ? Math.sin(pp * Math.PI) * R(0.06) : 0);
    if (dr.w) {
      ctx.strokeStyle = 'rgba(255,230,120,.35)';
      ctx.lineWidth = R(0.012);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - (x1 - x0) * 0.08, y - R(0.05));
      ctx.stroke();
    }
    drawCoin(ctx, x, y, R((big ? RB : RC) * scl(ly)) * (0.8 + 0.2 * pp), big, t, dr.land);
  }
  // ═════════ 누르는 동안: 떨어질 자리 고스트 · 밀릴 길 ═════════
  if (s.down && s.phase === 'play') {
    const x = clamp(s.ax, RC, 1 - RC), slot = inPocket(s, x), big = s.bigQ > 0;
    const r = big ? RB : RC, ly = pushY(S.st, S.ph + FLIGHT) + r;
    const gx = SX(x, RAIL_Y), gy = Y(RAIL_SY) - R(0.035);
    // 손가락 위 동전
    drawCoin(ctx, gx, gy, R(r * scl(RAIL_Y)), big, t, 7, true);
    if (slot) {
      ctx.save();
      ctx.shadowColor = '#fff3a0';
      ctx.shadowBlur = R(0.04);
      ctx.fillStyle = '#ffe866';
      font(0.044, 900);
      ctx.textAlign = 'center';
      ctx.fillText('슬롯 쏙!', clamp(gx, R(0.12), w - R(0.12)), Y(RAIL_SY) + R(0.07));
      ctx.restore();
    } else {
      // 떨어질 자리
      ctx.setLineDash([R(0.008), R(0.008)]);
      ctx.strokeStyle = 'rgba(255,255,255,.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(SX(x, ly), SY(ly) - R(0.01));
      ctx.stroke();
      ctx.setLineDash([]);
      drawCoin(ctx, SX(x, ly), SY(ly), R(r * scl(ly)), big, t, 7, true);
      // 밀릴 길 (앞으로 띠)
      const hit = tg && Math.abs(tg.x - x) < tg.r + r * 0.8;
      ctx.fillStyle = hit ? 'rgba(120,255,160,.16)' : 'rgba(255,255,255,.09)';
      quad([[SX(x - r, ly), SY(ly)], [SX(x + r, ly), SY(ly)], [SX(x + r * 1.6, D), SY(D)], [SX(x - r * 1.6, D), SY(D)]]);
      ctx.fill();

    }

  }

  // ═════════ 구경꾼 ═════════
  {
    const mode = s.kid.mode, look = tg ? (tg.x - 0.5) * 2 : 0;
    drawKid(ctx, X(0.1), Y(BAND - 0.05), R(0.06), 0, mode, t, look);
    drawKid(ctx, X(0.9), Y(BAND - 0.05), R(0.06), 1, mode === 'idle' && s.edgeT > 0 ? 'gasp' : mode, t + 17, look);
  }

  // ═════════ 사건 연출 ═════════
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const ex = e.kind === 'drop' || e.kind === 'pocket' ? SX(e.x, RAIL_Y) : SX(clamp(e.x, 0, 1), clamp(e.y, YB, D)), ey = e.kind === 'drop' || e.kind === 'pocket' ? Y(RAIL_SY) : SY(clamp(e.y, YB, D));
    if (e.kind === 'land') fx.burst(ex, ey, '#fff3b0', 8, 2, 1.8), fx.kick(e.v === BIG ? 4 : 1.5), e.v === BIG && say(ex, ey - R(0.05), '쿵! 왕동전', '#ffcf8a', 15);
    if (e.kind === 'rain') fx.burst(ex, ey, '#ffe066', 6, 2.2, 1.8);
    if (e.kind === 'drop') fx.burst(ex, ey, '#ffffff', 5, 1.4, 1.4);
    if (e.kind === 'pocket') fx.burst(ex, ey, '#fff3a0', 18, 3, 2.2), fx.ring(ex, ey, '#ffe066', R(0.06), 3), say(ex, ey - R(0.05), e.text!, e.col!, 16);
    if (e.kind === 'medal') {
      const n = e.v ?? 1;
      fx.burst(X(0.5), SY(D) + R(0.03), '#ffe066', 6 + n * 4, 2.4 + n * 0.3, 2);
      if (n >= 3) fx.kick(2 + n), fx.ring(X(0.5), SY(D), '#ffe066', R(0.12 + n * 0.02), 4), say(X(0.5), SY(D) + R(0.02), e.text!, e.col!, 20);
      else if (t - (fx.memo.chime ?? -99) > 30) (fx.memo.chime = t), fx.pop(X(0.5), SY(D) + R(0.06), e.text!, e.col!, 13);
    }
    if (e.kind === 'doll') {
      fx.burst(ex, ey, '#ffe066', 40, 6, 3.2), fx.burst(ex, ey, '#ff9ec4', 30, 5, 3), fx.ring(ex, ey, '#ffffff', R(0.25), 6), fx.kick(10), fx.blink('#fff6c8', 0.35);
      say(ex, ey - R(0.12), e.text!, e.col!, 24);
    }
    if (e.kind === 'sidefall') fx.burst(ex, ey, '#c9b8e8', 10, 2.4, 2), say(ex, ey - R(0.05), e.text!, e.col!, 14);
    if (e.kind === 'topple') fx.burst(ex, ey - R(0.05), '#ffd23f', 26, 4, 2.6), fx.kick(6), say(ex, ey - R(0.1), e.text!, e.col!, 18);
    if (e.kind === 'edge') say(ex, ey - R(0.16), e.text!, e.col!, 14);
    if (e.kind === 'jackpot') {
      for (let k = 0; k < 5; k++) fx.burst(X(0.1 + k * 0.2), Y(0.22), k % 2 ? '#ffe066' : '#ff8fc8', 30, 6, 3.2);
      fx.ring(X(0.5), Y(0.2), '#ffe066', R(0.5), 8), fx.kick(14), fx.blink('#fff2a0', 0.5);
      fx.pop(X(0.5), Y(0.66), '잭팟! 동전 폭포!', '#ffe066', 34);
    }
    if (e.kind === 'pair') fx.burst(X(0.5), Y(0.2), '#bff3ff', 20, 4, 2.4), fx.ring(X(0.5), Y(0.2), '#bff3ff', R(0.25), 4), fx.kick(3);
    if (e.kind === 'reel') fx.burst(X(0.5 + ((e.x as number) - 1) * 0.2), Y(0.2), '#ffffff', 6, 1.6, 1.6), fx.kick(1);
    if (e.kind === 'nope') say(X(0.5), Y(RAIL_SY) - R(0.06), e.text!, e.col!, 14);
  }
  fx.memo.t = t;
  ctx.restore();

  drawHud(ctx, s, w, h, th, X, Y, R, font, SX, SY);
}

/** 슬롯 머신: 릴 셋 · 붙잡힌 짝 · 리치 · 릴에 든 그림 수 */
function drawSlot(ctx: CanvasRenderingContext2D, s: CoinState, t: number, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, font: (sz: number, w?: number) => void) {
  const d = STAGES[s.stage], sl = s.slot, x0 = X(0.07), x1 = X(0.93), y0 = Y(0.1), y1 = Y(0.355);
  // 몸체
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, '#ffcf4a');
  g.addColorStop(1, '#ff8a3a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(x0, y0, x1 - x0, y1 - y0, R(0.035));
  ctx.fill();
  // 전구
  const jackT = sl.last === 'jackpot' ? t - sl.lastT : 999;
  for (let k = 0; k < 22; k++) {
    const a = k / 22, bx = a < 0.5 ? x0 + R(0.016) + (x1 - x0 - R(0.032)) * (a * 2) : x1 - R(0.016) - (x1 - x0 - R(0.032)) * ((a - 0.5) * 2), by = a < 0.5 ? y0 + R(0.014) : y1 - R(0.014);
    const on = jackT < 120 ? (t >> 2) % 2 === k % 2 : (t >> 4) % 3 === k % 3;
    ctx.fillStyle = on ? '#fffbe0' : '#c25a1a';
    ctx.beginPath();
    ctx.arc(bx, by, R(0.008), 0, TAU);
    ctx.fill();
  }
  if (!d.reels.length) {
    // 1판: 아직 닫힌 슬롯 — 간판
    ctx.fillStyle = '#5a1a3a';
    ctx.beginPath();
    ctx.roundRect(X(0.12), Y(0.13), X(0.76), Y(0.16), R(0.03));
    ctx.fill();
    ctx.fillStyle = '#ffe066';
    font(0.07, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('코인 폭포', X(0.5), Y(0.19));
    ctx.fillStyle = '#ffd6ea';
    font(0.034, 800);
    ctx.fillText('슬롯은 다음 판에 열려요', X(0.5), Y(0.255));
    return;
  }
  // 릴 창
  const rw = R(0.2), rh = R(0.15), ry = Y(0.125), gap = R(0.03), rx0 = X(0.5) - rw * 1.5 - gap;
  for (let k = 0; k < 3; k++) {
    const rx = rx0 + k * (rw + gap), spinning = sl.spin > 0 && (sl.stop[k] === 0 ? false : sl.spin < sl.stop[k]);
    const held = sl.held[k];
    ctx.save();
    ctx.fillStyle = '#fffdf6';
    ctx.beginPath();
    ctx.roundRect(rx, ry, rw, rh, R(0.02));
    ctx.fill();
    ctx.clip();
    const sym = (i: number) => d.reels[((i % d.reels.length) + d.reels.length) % d.reels.length];
    if (spinning) {
      const sp = sl.spin * (sl.reach && k === 2 && sl.spin > 60 ? 0.35 : 0.9), off = (sp % 1) * rh, base = Math.floor(sp) + k * 3;
      ctx.globalAlpha = 0.8;
      for (let j = -1; j <= 1; j++) drawSym(ctx, sym(base - j), rx + rw / 2, ry + rh / 2 + j * rh + off, R(0.09));
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(255,255,255,.3)';
      ctx.fillRect(rx, ry, rw, rh);
    } else {
      const pop = sl.stop[k] && sl.spin === 0 && t - sl.lastT < 12 ? 1 + (12 - (t - sl.lastT)) * 0.02 : 1;
      drawSym(ctx, d.reels[sl.cur[k]], rx + rw / 2, ry + rh / 2, R(0.105) * pop);
    }
    // 유리 반사
    const gg = ctx.createLinearGradient(0, ry, 0, ry + rh);
    gg.addColorStop(0, 'rgba(0,0,0,.18)');
    gg.addColorStop(0.3, 'rgba(255,255,255,0)');
    gg.addColorStop(0.75, 'rgba(255,255,255,0)');
    gg.addColorStop(1, 'rgba(0,0,0,.18)');
    ctx.fillStyle = gg;
    ctx.fillRect(rx, ry, rw, rh);
    ctx.restore();
    ctx.strokeStyle = held ? '#3ce07a' : '#7a2a10';
    ctx.lineWidth = held ? 3 : 2;
    ctx.beginPath();
    ctx.roundRect(rx, ry, rw, rh, R(0.02));
    ctx.stroke();
    if (held) {
      ctx.fillStyle = '#1f9a4e';
      ctx.beginPath();
      ctx.roundRect(rx + rw / 2 - R(0.06), ry + rh - R(0.042), R(0.12), R(0.036), R(0.012));
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      font(0.032, 900);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🔒 붙잡음', rx + rw / 2, ry + rh - R(0.023));
    }
  }
  // 리치 / 대기 램프
  if (sl.spin > 0 && sl.reach && sl.spin > 40) {
    ctx.fillStyle = (t >> 3) % 2 ? '#ff3a6a' : '#ffffff';
    font(0.036, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('리치!', X(0.5), Y(0.112));
  }
  for (let k = 0; k < 3; k++) {
    ctx.fillStyle = k < sl.q ? '#fff36a' : 'rgba(90,20,10,.4)';
    ctx.beginPath();
    ctx.arc(X(0.115), Y(0.15) + k * R(0.035), R(0.011), 0, TAU);
    ctx.fill();
  }
  // 결과 띠 (잠깐) — 아니면 릴에 든 그림 수
  const age = t - sl.lastT;
  if (sl.last && age < 75 && !sl.spin) {
    const txt = sl.last === 'jackpot' ? '잭팟! 동전 폭포!' : sl.last === 'pair' ? `짝! ${SYM_NAME[sl.lastSym]}` : sl.last === 'miss2' ? '아깝다! 짝이 풀렸어요' : '꽝!';
    const col = sl.last === 'jackpot' ? ((t >> 2) % 2 ? '#ff3a6a' : '#7a1030') : sl.last === 'pair' ? '#0f6a3a' : '#7a2a10';
    const sc = 1 + Math.max(0, 8 - age) * 0.04;
    ctx.save();
    ctx.translate(X(0.5), Y(0.318));
    ctx.scale(sc, sc);
    ctx.fillStyle = sl.last === 'pair' ? 'rgba(200,255,220,.95)' : 'rgba(255,248,220,.95)';
    ctx.beginPath();
    ctx.roundRect(-R(0.36), -R(0.026), R(0.72), R(0.052), R(0.026));
    ctx.fill();
    if (sl.last === 'pair') drawSym(ctx, sl.lastSym, -R(0.3), 0, R(0.045));
    ctx.fillStyle = col;
    font(0.04, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(txt, sl.last === 'pair' ? R(0.03) : 0, 1, R(0.58));
    ctx.restore();
    return;
  }
  // 릴에 든 그림 수 (확률이 보이게)
  const cnt = new Map<number, number>();
  for (const x of d.reels) cnt.set(x, (cnt.get(x) ?? 0) + 1);
  const items = [...cnt.entries()];
  const hs = heldSym(s);
  font(0.034, 900);
  ctx.textBaseline = 'middle';
  const label = hs >= 0 ? `남은 릴 ${d.reels.length}칸:` : `한 릴 ${d.reels.length}칸:`;
  const lw = ctx.measureText(label).width, iw = R(0.093), tw = lw + R(0.012) + items.length * iw, ly = Y(0.318);
  let cx = X(0.5) - tw / 2;
  ctx.fillStyle = '#5a1a08';
  ctx.textAlign = 'left';
  ctx.fillText(label, cx, ly);
  cx += lw + R(0.012);
  for (const [sym, n] of items) {
    const good = hs >= 0 && (sym === hs || sym === R_);
    if (good) {
      ctx.fillStyle = 'rgba(40,200,100,.55)';
      ctx.beginPath();
      ctx.roundRect(cx - R(0.006), ly - R(0.022), iw - R(0.004), R(0.044), R(0.014));
      ctx.fill();
    }
    drawSym(ctx, sym, cx + R(0.021), ly, R(0.042));
    ctx.fillStyle = good ? '#ffffff' : '#5a1a08';
    font(0.036, 900);
    ctx.textAlign = 'left';
    ctx.fillText(`${n}`, cx + R(0.048), ly + 1);
    cx += iw;
  }
}

function drawHud(ctx: CanvasRenderingContext2D, s: CoinState, w: number, h: number, th: Theme, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, font: (sz: number, w?: number) => void, SX: (x: number, y: number) => number, SY: (y: number) => number) {
  const d = STAGES[s.stage], S = s.S, fx = juice(s), t = s.t;
  // ── 위 띠 ──
  const hb = R(0.082);
  ctx.fillStyle = 'rgba(28,12,48,.94)';
  ctx.fillRect(0, 0, w, hb);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  font(0.046, 900);
  const ttl = `${d.emoji} ${s.stage + 1}번째 판`, tw = ctx.measureText(ttl).width;
  ctx.fillText(ttl, R(0.03), hb * 0.52);
  font(0.036, 800);
  ctx.fillStyle = th.muted;
  ctx.fillText(` / ${STAGE_COUNT}`, R(0.03) + tw, hb * 0.56);
  ctx.textAlign = 'right';
  font(0.044, 900);
  ctx.fillStyle = '#ffd84a';
  const stt = `★ ${s.stars}`;
  ctx.fillText(stt, w - R(0.03), hb * 0.52);
  ctx.fillStyle = th.hot;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - R(0.06) - ctx.measureText(stt).width, hb * 0.52);

  // ── NEW 스포트라이트 (판의 새것) ──
  const cardUp = s.phase === 'play' && s.pt < CARD_T;
  if (cardUp && d.spot && !s.again) {
    let cx = -1, cy = -1;
    const big = S.b.find((o) => (d.key === 'tower' ? o.k === TOWER : o.tg === 1));
    if (d.key === 'slot') (cx = SX(pocketX(s), RAIL_Y)), (cy = Y(RAIL_SY));
    else if (d.key === 'wild') (cx = X(0.5)), (cy = Y(0.315));
    else if (d.key === 'side') (cx = SX(s.flip ? 1 : 0, (s.L.h0 + D) / 2)), (cy = SY((s.L.h0 + D) / 2));
    else if (big) (cx = SX(big.x, big.y)), (cy = SY(big.y) - R(0.05));
    if (cx >= 0) {
      const age = s.pt, a = Math.min(1, age / 12, (CARD_T - age) / 20), r = R(0.1 + Math.max(0, 0.08 - age * 0.004));
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(20,8,36,.55)';
      ctx.beginPath();
      ctx.rect(0, hb, w, Y(BAND) - hb);
      ctx.arc(cx, cy, r, 0, TAU, true);
      ctx.fill('evenodd');
      ctx.strokeStyle = '#fff1a8';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.lineDashOffset = -age;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      font(0.04, 900);
      const label = d.spot, lw = ctx.measureText(label).width + R(0.06), ly = cy + r + R(0.05) > Y(1.0) ? cy - r - R(0.05) : cy + r + R(0.05), lx = Math.max(lw / 2 + 6, Math.min(w - lw / 2 - 6, cx));
      ctx.fillStyle = 'rgba(70,20,90,.96)';
      ctx.beginPath();
      ctx.roundRect(lx - lw / 2, ly - R(0.032), lw, R(0.064), R(0.032));
      ctx.fill();
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff6e0';
      ctx.fillText(label, lx, ly + 1);
      font(0.034, 900);
      const nb = 'NEW!', nw = ctx.measureText(nb).width + R(0.03);
      ctx.fillStyle = '#ff5a6e';
      ctx.beginPath();
      ctx.roundRect(lx - lw / 2 - R(0.01), ly - R(0.062), nw, R(0.042), R(0.021));
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText(nb, lx - lw / 2 - R(0.01) + nw / 2, ly - R(0.04));
      ctx.restore();
    }
  }

  // ── 배우기 한 줄 (처음 한 번) ──
  if (!cardUp && s.news && t - s.news.t < NEWS_T && s.phase === 'play' && !s.down) {
    const age = t - s.news.t, a = Math.min(1, age / 10, (NEWS_T - age) / 20), drop = Math.max(0, 10 - age) * 2;
    ctx.globalAlpha = a;
    font(0.038, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const tx = s.news.text, tw2 = Math.min(w - R(0.04), ctx.measureText(tx).width + R(0.06)), by = Y(0.47) + drop;
    ctx.fillStyle = 'rgba(28,12,48,.94)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw2 / 2, by - R(0.032), tw2, R(0.064), R(0.032));
    ctx.fill();
    ctx.strokeStyle = th.accent;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(tx, w / 2, by + 1, w - R(0.08));
    ctx.globalAlpha = 1;
  }

  // ── 판 카드: 시작(별 조건을 말로) · 끝 ──
  {
    let a = 1, head = '', col = '#ffffff';
    const lines: { text: string; col: string; mark?: string }[] = [];
    if (s.phase === 'result') {
      if (s.ok) {
        head = s.won ? '인형 다 받았다!' : '인형 받았다!';
        col = '#ffe066';
        starLines(s).forEach((q, k) => lines.push({ text: q, col: s.starOk[k] ? '#fff6dc' : 'rgba(255,255,255,.5)', mark: s.starOk[k] ? '✓' : '✗' }));
      } else {
        head = s.why;
        col = '#ffb3a8';
        lines.push({ text: s.hearts > 0 ? '하트 -1 · 같은 판 다시!' : '끝 — 구경꾼들이 박수 쳐요!', col: '#fff0ea' });
        lines.push({ text: '인형 바로 뒤에 동전을 모아 봐요', col: 'rgba(255,255,255,.7)' });
      }
    } else if (cardUp) {
      a = Math.min(1, (CARD_T - s.pt) / 20);
      head = `${s.again ? '다시! ' : ''}${s.stage + 1}번째 판 · ${d.name}`;
      for (const q of starLines(s)) lines.push({ text: q, col: '#fff6dc', mark: '★' });
      if (d.nstars === 1) lines.push({ text: '별은 다음 판부터 하나씩 늘어요', col: 'rgba(255,255,255,.65)' });
    }
    if (head && a > 0) {
      const res = s.phase === 'result', sc = Math.min(1, 0.6 + s.pt / 12);
      const ch = R(0.075) + lines.length * R(0.046), cy = res ? Y(0.7) : Y(0.6);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(w / 2, cy);
      ctx.scale(sc, sc);
      ctx.fillStyle = 'rgba(28,12,48,.95)';
      ctx.beginPath();
      ctx.roundRect(-R(0.45), -ch / 2, R(0.9), ch, R(0.04));
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = col;
      font(0.05, 900);
      const hy = -ch / 2 + R(0.04);
      if (res && s.ok) {
        const hw = ctx.measureText(head).width, sw = R(0.055), n = d.nstars, x0 = -(hw + R(0.02) + sw * n) / 2;
        ctx.textAlign = 'left';
        ctx.fillText(head, x0, hy, R(0.86));
        for (let k = 0; k < n; k++) {
          const ag = s.pt - (10 + k * 13);
          if (ag < 0) continue;
          const got = s.starOk[k], pop = ag < 8 ? 1.9 - 0.9 * (ag / 8) : 1, sx = x0 + hw + R(0.02) + sw * (k + 0.5);
          ctx.save();
          ctx.translate(sx, hy);
          ctx.scale(pop, pop);
          starPath(ctx, 0, 0, R(0.024));
          ctx.fillStyle = got ? '#ffd43b' : 'rgba(255,255,255,.12)';
          ctx.fill();
          ctx.strokeStyle = got ? '#fff3b0' : 'rgba(255,255,255,.45)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();
          if (got && (fx.memo['star' + k] ?? -1) < t - ag) (fx.memo['star' + k] = t - ag), fx.burst(w / 2 + sx, cy + hy, '#ffe066', 16, 3, 2.4);
        }
        ctx.textAlign = 'center';
      } else ctx.fillText(head, 0, hy, R(0.84));
      font(0.037, 800);
      lines.forEach((q, k) => {
        const ly = hy + R(0.058) + k * R(0.046);
        ctx.fillStyle = q.mark === '✗' ? 'rgba(255,255,255,.4)' : '#ffd84a';
        if (q.mark) {
          font(0.036, 900);
          ctx.fillText(q.mark, -R(0.38), ly);
        }
        font(0.037, 800);
        ctx.fillStyle = q.col;
        ctx.textAlign = q.mark ? 'left' : 'center';
        ctx.fillText(q.text, q.mark ? -R(0.34) : 0, ly, R(0.76));
        ctx.textAlign = 'center';
      });
      ctx.restore();
    }
  }

  // ── 아래 띠: 동전 지갑 · 별 조건 · 안내 ──
  {
    const ty = BAND, g = ctx.createLinearGradient(0, Y(ty), 0, h);
    g.addColorStop(0, 'rgba(36,16,60,.97)');
    g.addColorStop(1, 'rgba(20,8,36,.99)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(0, Y(ty), w, h - Y(ty) + 4, [R(0.03), R(0.03), 0, 0]);
    ctx.fill();
    // 동전 지갑
    const r1 = Y(ty + 0.042);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffe9a8';
    font(0.04, 900);
    ctx.fillText('동전', X(0.03), r1);
    const n = s.purse, cap = 12, x0 = X(0.155), step = R(0.052);
    for (let k = 0; k < Math.min(n, cap); k++) drawCoin(ctx, x0 + k * step, r1 + R(0.01), R(0.022), k === 0 && s.bigQ > 0, t, k + 300);
    if (n > cap) {
      ctx.fillStyle = '#ffe9a8';
      font(0.034, 900);
      ctx.fillText(`+${n - cap}`, x0 + cap * step - R(0.02), r1);
    }
    if (d.keep) {
      // ★ 남기기 선
      const lx = x0 + d.keep * step - step / 2;
      ctx.strokeStyle = '#ffd84a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(lx, r1 - R(0.026));
      ctx.lineTo(lx, r1 + R(0.026));
      ctx.stroke();
      ctx.fillStyle = '#ffd84a';
      font(0.026, 900);
      ctx.textAlign = 'center';
      ctx.fillText('★', lx, r1 - R(0.036));
    }
    ctx.textAlign = 'right';
    font(0.036, 900);
    ctx.fillStyle = n > 0 ? '#ffe9a8' : '#ffb3a8';
    ctx.fillText(`${n}개`, X(0.975), r1);
    // 별 조건 (짧은 말)
    const sl = starLines(s), done = starsNow(s);
    const bad = [false, d.keep > 0 && s.purse < d.keep, d.star3 === 'twin' && false];
    font(0.033, 800);
    ctx.textAlign = 'left';
    let cx = X(0.03), r2 = Y(ty + 0.095);
    sl.forEach((q, k) => {
      const live = k === 0 ? false : k === 1 ? s.purse >= d.keep : d.star3 === 'jackpot' ? s.jacks > 0 : d.star3 === 'medal' ? S.medals >= (d.medal ?? 99) : d.star3 === 'twin' ? S.decoy > 0 : !S.b.some((o) => o.k === TOWER);
      const ok = (s.phase === 'result' && s.ok ? s.starOk[k] : done[k]) || (k > 0 && live && k !== 1);
      const tw2 = ctx.measureText(q).width + R(0.06);
      if (cx + tw2 > w - R(0.02)) (cx = X(0.03)), (r2 += R(0.056));
      ctx.fillStyle = ok ? 'rgba(255,216,74,.22)' : bad[k] ? 'rgba(0,0,0,.35)' : 'rgba(255,255,255,.07)';
      ctx.beginPath();
      ctx.roundRect(cx, r2 - R(0.025), tw2, R(0.05), R(0.025));
      ctx.fill();
      ctx.fillStyle = ok ? '#ffd84a' : bad[k] ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.55)';
      ctx.fillText('★', cx + R(0.012), r2 + 1);
      ctx.fillStyle = ok ? '#fff6dc' : bad[k] ? 'rgba(255,255,255,.4)' : '#efe6ff';
      ctx.fillText(q, cx + R(0.045), r2 + 1);
      cx += tw2 + R(0.012);
    });
    // 안내 한 줄
    let hint = '';
    const first = s.stage === 0 && !s.firstDrop && s.phase === 'play';
    if (first) hint = '👆 위를 꾹 누르면 동전 자리가 보여요 — 떼면 툭!';
    else if (s.down && s.phase === 'play') {
      const x = clamp(s.ax, RC, 1 - RC), tg = S.b.find((o) => o.tg === 1);
      hint = s.purse <= 0 ? '동전을 다 썼어요' : s.chute > 0 ? '동전 장전 중… 잠깐만요' : inPocket(s, x) ? '지금 떼면 슬롯 구멍에 쏙!' : tg && Math.abs(tg.x - x) < tg.r + RC * 0.8 ? `떼면 툭! ${DOLLS[tg.sp].name} 바로 뒤를 밀어요` : '떼면 툭! 밀대가 밀어 줘요';
    }
    else if (s.phase === 'result') hint = s.ok ? (s.won ? '모든 인형을 받았어요!' : `★ ${s.got}개! 다음 판엔 새것이 나와요`) : '같은 판을 다시 해요';
    else if (s.phase === 'win') hint = '야호~! 인형을 받았어요';
    else if (s.purse <= 0) hint = '밀대가 마지막으로 밀어요…';
    else if (s.slot.held.some(Boolean)) hint = '🔒 짝이 붙잡혔어요 — 구멍에 넣으면 남은 한 릴만 돌아요';
    else if (s.bigQ > 0) hint = '🥇 다음 동전은 크고 무거운 왕동전!';
    else hint = d.pocket ? '구멍이 손가락 밑에 올 때 떼면 슬롯, 비켜 있을 때 떼면 선반' : '인형 바로 뒤에 떨구면 인형이 밀려요';
    ctx.textAlign = 'center';
    ctx.fillStyle = first ? '#ffffff' : '#ffe9a8';
    font(first ? 0.04 : 0.034, 900);
    ctx.fillText(hint, w / 2, Math.max(Y(ty + 0.165), r2 + R(0.058)), w - R(0.05));
  }
}

/** 별 조건 (기호 없는 쉬운 말) */
function starLines(s: CoinState): string[] {
  const d = STAGES[s.stage], out = ['인형 떨어뜨리기'];
  if (d.nstars >= 2) out.push(`동전 ${d.keep}개 남기기`);
  if (d.nstars >= 3)
    out.push(d.star3 === 'jackpot' ? '잭팟 터뜨리기' : d.star3 === 'medal' ? `동전 ${d.medal}개 받기` : d.star3 === 'twin' ? '두 인형 다 떨어뜨리기' : '동전 탑 다 무너뜨리기');
  return out;
}
