/**
 * 🔮 구슬 더미 이어 긋기 (36라운드: 직접 만지는 물리 장난감 — 한 번 긋기) — 같은 색 이어 긋기 × 연쇄 폭발.
 * 손짓은 하나: 유리병 속에 **물리로 쌓인 동그란 구슬 더미**(크기 조금씩 다름) 위를 손가락으로 쓱 지나가면,
 *   지나간 같은 색 구슬이 맞닿은 것끼리 줄로 이어진다(허용 폭 넉넉히 · 처음 두 개까지는 손가락이 간 구슬로 새로 시작 ·
 *   되돌아가면 마지막 하나가 풀림). 떼면 이어진 구슬이 팡팡팡 차례로 터지고, 둘레가 출렁 튀며 빈자리로 더미가 와르르 내려앉는다.
 *   터진 만큼 위 대롱에서 새 구슬이 통통 떨어진다(다음 여섯 개가 대롱에 보인다). 2개 이하는 안 터지고 횟수도 안 든다.
 * 와우: 8개 이상 이으면 끝 구슬이 폭죽 구슬이 된다 — 폭죽을 이어 터뜨리면 둘레가 펑, 둘레의 폭죽도 연달아 펑(연쇄).
 * 판 7개 · 판마다 새것(하는 일이 바뀐다): 1 첫 구슬병(이어 긋기) → 2 폭죽(길게 이어 끝자리 고르기)
 *   → 3 얼음(못 이음, 옆이 터지면 녹음 — 얼음 옆을 지나가게) → 4 별 그물(무거운 별 구슬 밑을 파서 병 바닥까지)
 *   → 5 쇠구슬(못 이음, 끼여 있다가 받치던 구슬이 터지면 쿵 떨어져 밑 구슬 둘까지 깬다 — 쇠구슬 밑을 노리기)
 *   → 6 무지개(아무 색과 이어지는 다리 — 떨어진 같은 색을 잇기) → 7 마지막 병(모두 다).
 * 긋기 횟수 한정, 시간 제한 없음. 횟수 안에 목표를 채우면 판 성공(별 = 쉬운 한 줄 말, 판마다 하나씩 늘어 3개까지),
 *   못 채우면 하트 -1, 같은 병 다시. 하트 셋을 다 잃거나 7판을 마치면 끝. 아무것도 안 하면 아무 일도 없다(더미는 잠든다).
 * 고민: 지금 길게 이을까, 무너진 뒤 생길 더 긴 이음을 기다릴까 · 이음의 끝(폭죽 자리)을 어디에 둘까 · 무엇 옆/밑을 지나갈까
 *   · 목표를 끝내기 전에 별 조건(다른 색·적게 터뜨리기)을 먼저 채울까.
 * 결정적 물리: 고정 간격(1/60) 위치 기반 원 쌓기(격자로 이웃 찾기, 닿은 구슬은 구름 마찰), 안정되면 잠든다.
 *   잘하는 봇은 후보 이음마다 같은 tickWorld로 무너짐을 굴려 보고(1수) 무너진 뒤 맞닿은 덩어리로 다음 수를 어림(2수)한다.
 * 구경꾼: 병 옆 줄무늬 고양이가 손가락을 눈으로 따라가고 발을 병에 대고, 팡팡 터지면 눈이 동그래지고,
 *   폭죽엔 털이 쭈뼛, 별이 쏙 들어가면 손을 흔들고, 실패엔 어질어질.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5;
// ───────────────────────────── 병 (가로 폭 = 1, 세로 0~A, 아래로 +) ─────────────────────────────
const XL = 0.105, XR = 0.755, XC = (XL + XR) / 2;
const RIM_Y = 0.44, WALL_TOP = 0.12, SLANT_Y = 1.15, HOLE_Y = 1.235, HOLE_W = 0.145;
const SPAWN_Y = 0.3;
/** 구슬 종류 */
const K_N = 0, K_FIRE = 1, K_ICE = 2, K_IRON = 3, K_STAR = 4, K_RAIN = 5;
const CAP = 360;
// 물리 (틱 단위)
/** CDAMP: 다른 구슬·벽에 닿아 있는 구슬은 틱마다 속도가 조금 준다(구름 마찰) — 와르르 내려앉은 뒤 금방 멈춘다 */
const G = 0.0006, DAMP = 0.992, CDAMP = 0.86, ITERS = 3, SLEEP_V = 0.0007, CALM_N = 6;
/** 맞닿음 허용 폭 · 손가락이 구슬에 닿는 여유 */
const TOL = 0.02, HIT_PAD = 0.008;
/** 별 구슬은 무거운 금 — 더미가 움직이는 동안 더 세게 가라앉는다 */
const STAR_G = 2.4;
const POP_KICK = 0.0042;
const POP_GAP = 4, FIRE_N = 8, FR = 0.165, V_SMASH = 0.002, IRON_HITS = 2, DROP = 0.02, REFILL_DELAY = 12, REFILL_GAP = 3;
const SLOT_ORDER = [2, 4, 0, 5, 1, 3];
const slotX = (k: number) => XL + 0.06 + (k * (XR - XL - 0.12)) / 5;

interface Seg { ax: number; ay: number; ux: number; uy: number; nx: number; ny: number; len: number; hole: boolean }
/** hole = 바닥 (별 그물: 별 구슬은 바닥 어디서든 쏙 빠진다) */
function mkSeg(ax: number, ay: number, bx: number, by: number, hole = false): Seg {
  const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
  return { ax, ay, ux, uy, nx: uy, ny: -ux, len, hole };
}
const P3 = [XC - HOLE_W / 2, HOLE_Y], P4 = [XC + HOLE_W / 2, HOLE_Y];
const SEGS: Seg[] = [
  mkSeg(XL, WALL_TOP, XL, SLANT_Y),
  mkSeg(XL, SLANT_Y, XL + 0.05, SLANT_Y + 0.035, true),
  mkSeg(XL + 0.05, SLANT_Y + 0.035, P3[0], P3[1], true),
  mkSeg(P3[0], P3[1], P4[0], P4[1], true),
  mkSeg(P4[0], P4[1], XR - 0.05, SLANT_Y + 0.035, true),
  mkSeg(XR - 0.05, SLANT_Y + 0.035, XR, SLANT_Y, true),
  mkSeg(XR, SLANT_Y, XR, WALL_TOP),
];

// ───────────────────────────── 세계 (물리) ─────────────────────────────
interface WEv { k: string; x: number; y: number; c: number; kind: number; r: number; n: number; uid: number }
export interface World {
  n: number; x: Float64Array; y: Float64Array; px: Float64Array; py: Float64Array; vy0: Float64Array;
  r: Float64Array; w: Float64Array; col: Int8Array; kind: Int8Array; alive: Uint8Array; uid: Int32Array;
  popAt: Int32Array; fresh: Uint8Array; born: Int32Array; blast: Uint8Array; seq: Int16Array; hit: Int32Array; hitV: Float32Array; ihit: Int8Array; ry: Float64Array; stat: Uint8Array; ical: Int8Array; drop: Uint8Array; lose: Uint8Array;
  t: number; calm: number; asleep: boolean; nextUid: number;
  queue: Int8Array; qi: number; refill: number; refillT: number; spawnK: number; noRefill: boolean;
  cnt: Int32Array; total: number; melted: number; smashed: number; fires: number; delivered: number; strokes: number; maxChain: number;
  ev: WEv[] | null;
  demo?: number[];
}
function newWorld(): World {
  return {
    n: 0, x: new Float64Array(CAP), y: new Float64Array(CAP), px: new Float64Array(CAP), py: new Float64Array(CAP), vy0: new Float64Array(CAP),
    r: new Float64Array(CAP), w: new Float64Array(CAP), col: new Int8Array(CAP), kind: new Int8Array(CAP), alive: new Uint8Array(CAP), uid: new Int32Array(CAP),
    popAt: new Int32Array(CAP), fresh: new Uint8Array(CAP), born: new Int32Array(CAP), blast: new Uint8Array(CAP), seq: new Int16Array(CAP), hit: new Int32Array(CAP), hitV: new Float32Array(CAP), ihit: new Int8Array(CAP), ry: new Float64Array(CAP), stat: new Uint8Array(CAP), ical: new Int8Array(CAP), drop: new Uint8Array(CAP), lose: new Uint8Array(CAP),
    t: 0, calm: 0, asleep: false, nextUid: 1,
    queue: new Int8Array(0), qi: 0, refill: 0, refillT: 0, spawnK: 0, noRefill: false,
    cnt: new Int32Array(5), total: 0, melted: 0, smashed: 0, fires: 0, delivered: 0, strokes: 0, maxChain: 0,
    ev: null,
  };
}
function cloneWorld(W: World): World {
  return {
    ...W,
    x: W.x.slice(), y: W.y.slice(), px: W.px.slice(), py: W.py.slice(), vy0: W.vy0.slice(), r: W.r.slice(), w: W.w.slice(),
    col: W.col.slice(), kind: W.kind.slice(), alive: W.alive.slice(), uid: W.uid.slice(), popAt: W.popAt.slice(), fresh: W.fresh.slice(),
    born: W.born.slice(), blast: W.blast.slice(), seq: W.seq.slice(), hit: W.hit.slice(), hitV: W.hitV.slice(), ihit: W.ihit.slice(), ry: W.ry.slice(), stat: W.stat.slice(), ical: W.ical.slice(), drop: W.drop.slice(), lose: W.lose.slice(), cnt: W.cnt.slice(), ev: null,
  };
}
function addBead(W: World, x: number, y: number, r: number, kind: number, col: number): number {
  if (W.n >= CAP) compact(W);
  const i = W.n++;
  W.x[i] = W.px[i] = x;
  W.y[i] = W.py[i] = y;
  W.vy0[i] = 0;
  W.r[i] = r;
  W.kind[i] = kind;
  W.col[i] = col;
  W.w[i] = kind === K_IRON ? 0.22 : kind === K_STAR ? 0.35 : 1;
  W.alive[i] = 1;
  W.uid[i] = W.nextUid++;
  W.popAt[i] = -1;
  W.fresh[i] = 0;
  W.born[i] = W.t;
  W.blast[i] = 0;
  W.seq[i] = 0;
  W.hit[i] = -999;
  W.hitV[i] = 0;
  W.ihit[i] = 0;
  W.ry[i] = y;
  W.stat[i] = 0;
  W.ical[i] = 0;
  W.drop[i] = 0;
  W.lose[i] = 0;
  return i;
}
/** 죽은 구슬을 빼고 앞으로 당긴다 (이음이 없을 때만 — 번호가 바뀐다) */
function compact(W: World) {
  let j = 0;
  const arrs = [W.x, W.y, W.px, W.py, W.vy0, W.r, W.w, W.col, W.kind, W.alive, W.uid, W.popAt, W.fresh, W.born, W.blast, W.seq, W.hit, W.hitV, W.ihit, W.ry, W.stat, W.ical, W.drop, W.lose];
  for (let i = 0; i < W.n; i++) {
    if (!W.alive[i]) continue;
    if (i !== j) for (const a of arrs) a[j] = a[i];
    j++;
  }
  W.n = j;
}
const linkable = (W: World, i: number) => W.alive[i] === 1 && W.popAt[i] < 0 && (W.kind[i] === K_N || W.kind[i] === K_FIRE || W.kind[i] === K_RAIN);
const smashable = (k: number) => k !== K_IRON && k !== K_STAR;
function touching(W: World, i: number, j: number) {
  const dx = W.x[j] - W.x[i], dy = W.y[j] - W.y[i], rr = W.r[i] + W.r[j] + TOL;
  return dx * dx + dy * dy <= rr * rr;
}
function push(W: World, k: string, i: number, n = 0) {
  W.ev?.push({ k, x: W.x[i], y: W.y[i], c: W.col[i], kind: W.kind[i], r: W.r[i], n, uid: W.uid[i] });
}

function popBead(W: World, i: number, how: string) {
  const k = W.kind[i], c = W.col[i];
  W.alive[i] = 0;
  W.popAt[i] = -1;
  W.asleep = false;
  W.calm = 0;
  if (c >= 0) W.cnt[c]++;
  W.total++;
  if (k === K_ICE) W.melted++;
  W.refill++;
  W.refillT = W.t + REFILL_DELAY;
  push(W, W.blast[i] ? 'bpop' : how, i, W.seq[i]);
  for (let j = 0; j < W.n; j++) {
    if (!W.alive[j]) continue;
    const dx = W.x[j] - W.x[i], dy = W.y[j] - W.y[i], d = Math.hypot(dx, dy) || 1e-6;
    // 팡! 둘레 구슬이 살짝 튀며 출렁 (쇠구슬·끼인 것은 그대로)
    if (d < W.r[i] + W.r[j] + 0.03 && !W.stat[j] && W.kind[j] !== K_IRON) kick(W, j, dx / d, dy / d - 0.5, POP_KICK);
    // 받치던 구슬이 터지면 그 쇠구슬은 헐거워진다
    if (W.kind[j] === K_IRON && W.stat[j] && dy < 0 && -dy / d > 0.35 && d < W.r[i] + W.r[j] + 0.03) W.lose[j] = 1;
    if (W.kind[j] !== K_ICE || W.popAt[j] >= 0 || !touching(W, i, j)) continue;
    W.kind[j] = K_N;
    W.melted++;
    push(W, 'melt', j);
  }
  if (k === K_FIRE) explode(W, i);
}
function kick(W: World, j: number, nx: number, ny: number, m: number) {
  W.px[j] -= nx * m;
  W.py[j] -= ny * m;
}
function explode(W: World, i: number) {
  W.fires++;
  push(W, 'blast', i);
  const x = W.x[i], y = W.y[i];
  for (let j = 0; j < W.n; j++) {
    if (!W.alive[j] || j === i) continue;
    const dx = W.x[j] - x, dy = W.y[j] - y, d = Math.hypot(dx, dy) || 1e-6, nx = dx / d, ny = dy / d;
    if (d <= FR + W.r[j] * 0.4) {
      if (!smashable(W.kind[j])) kick(W, j, nx, ny, 0.012);
      else if (W.popAt[j] < 0) (W.popAt[j] = W.t + 1 + Math.floor((d / FR) * 5)), (W.blast[j] = 1);
    } else if (d < FR * 2.1) kick(W, j, nx, ny, 0.008 * (1 - d / (FR * 2.1)) * (W.kind[j] === K_IRON ? 0.4 : 1));
  }
}

// 격자 (이웃 찾기) — 시뮬레이션마다 다시 쓰는 공용 칸
const CS = 0.108, GX0 = XL - 0.06, GC = Math.ceil((XR - XL + 0.12) / CS), GR = Math.ceil(A / CS);
const head = new Int32Array(GC * GR), nxt = new Int32Array(CAP), touch = new Uint8Array(CAP);
function buildGrid(W: World) {
  head.fill(-1);
  for (let i = W.n - 1; i >= 0; i--) {
    if (!W.alive[i]) continue;
    const cx = Math.min(GC - 1, Math.max(0, Math.floor((W.x[i] - GX0) / CS))), cy = Math.min(GR - 1, Math.max(0, Math.floor(W.y[i] / CS)));
    const c = cy * GC + cx;
    nxt[i] = head[c];
    head[c] = i;
  }
}
function solve(W: World, i: number, j: number, smash: boolean) {
  const al = W.alive;
  if (!al[i] || !al[j]) return;
  const x = W.x, y = W.y;
  const dx = x[j] - x[i], dy = y[j] - y[i], rr = W.r[i] + W.r[j];
  if (dx > rr || dx < -rr || dy > rr || dy < -rr) return;
  const d2 = dx * dx + dy * dy;
  if (d2 >= rr * rr) return;
  const d = Math.sqrt(d2) || 1e-6, nx = dx / d, ny = dy / d;
  if (smash) {
    const ki = W.kind[i], kj = W.kind[j];
    if (ki === K_IRON && !W.stat[i] && smashable(kj) && ny > 0.35 && W.ihit[i] < IRON_HITS && y[i] > W.ry[i] + DROP) {
      const ap = (x[i] - W.px[i] - (x[j] - W.px[j])) * nx + (y[i] - W.py[i] - (y[j] - W.py[j])) * ny;
      if (ap > V_SMASH) return smashBead(W, i, j);
    } else if (kj === K_IRON && !W.stat[j] && smashable(ki) && -ny > 0.35 && W.ihit[j] < IRON_HITS && y[j] > W.ry[j] + DROP) {
      const ap = (x[j] - W.px[j] - (x[i] - W.px[i])) * -nx + (y[j] - W.py[j] - (y[i] - W.py[i])) * -ny;
      if (ap > V_SMASH) return smashBead(W, j, i);
    }
  }
  touch[i] = touch[j] = 1;
  const pen = rr - d, wi = W.w[i], wj = W.w[j], ws = wi + wj;
  if (ws <= 0) return;
  const a = (pen * wi) / ws, b = (pen * wj) / ws;
  x[i] -= nx * a;
  y[i] -= ny * a;
  x[j] += nx * b;
  y[j] += ny * b;
}
function smashBead(W: World, a: number, b: number) {
  W.smashed++;
  W.ihit[a]++;
  W.drop[a] = 1;
  popBead(W, b, 'smash');
  push(W, 'thud', a, W.smashed);
  W.px[a] = W.x[a] - (W.x[a] - W.px[a]) * 0.7;
  W.py[a] = W.y[a] - (W.y[a] - W.py[a]) * 0.7;
}
const NB = [1, 0, -1, -1, 0, -1, 1, -1];
function pairs(W: World, smash: boolean) {
  for (let cy = GR - 1; cy >= 0; cy--)
    for (let cx = 0; cx < GC; cx++)
      for (let i = head[cy * GC + cx]; i >= 0; i = nxt[i]) {
        for (let j = nxt[i]; j >= 0; j = nxt[j]) solve(W, i, j, smash);
        for (let q = 0; q < 8; q += 2) {
          const ox = cx + NB[q], oy = cy + NB[q + 1];
          if (ox < 0 || ox >= GC || oy < 0) continue;
          for (let j = head[oy * GC + ox]; j >= 0; j = nxt[j]) solve(W, i, j, smash);
        }
      }
}
function walls(W: World) {
  const x = W.x, y = W.y;
  for (let i = 0; i < W.n; i++) {
    if (!W.alive[i] || W.stat[i]) continue;
    let xi = x[i], yi = y[i];
    const ri = W.r[i];
    if (xi - ri > XL + 1e-4 && xi + ri < XR - 1e-4 && yi + ri < SLANT_Y) continue;
    const star = W.kind[i] === K_STAR;
    for (const s of SEGS) {
      if (s.hole && star) continue;
      const rx = xi - s.ax, ry = yi - s.ay, al = rx * s.ux + ry * s.uy;
      if (al < -ri * 0.35 || al > s.len + ri * 0.35) continue;
      const sd = rx * s.nx + ry * s.ny;
      if (sd < ri && sd > -ri * 1.5) (xi += s.nx * (ri - sd)), (yi += s.ny * (ri - sd)), (touch[i] = 1);
    }
    x[i] = xi;
    y[i] = yi;
  }
}
function physics(W: World) {
  const n = W.n, x = W.x, y = W.y, px = W.px, py = W.py, al = W.alive;
  for (let i = 0; i < n; i++) {
    if (!al[i] || W.stat[i]) continue;
    const vx = (x[i] - px[i]) * DAMP, vy = (y[i] - py[i]) * DAMP;
    W.vy0[i] = vy;
    px[i] = x[i];
    py[i] = y[i];
    x[i] += vx;
    y[i] += vy + (W.kind[i] === K_STAR ? G * STAR_G : G);
  }
  buildGrid(W);
  touch.fill(0, 0, n);
  for (let it = 0; it < ITERS; it++) {
    pairs(W, it === 0);
    walls(W);
  }
  let mv = 0;
  for (let i = 0; i < n; i++) {
    if (!al[i]) continue;
    if (touch[i] && W.kind[i] !== K_IRON) (px[i] = x[i] - (x[i] - px[i]) * CDAMP), (py[i] = y[i] - (y[i] - py[i]) * CDAMP);
    const dx = x[i] - px[i], dy = y[i] - py[i], v = Math.abs(dx) + Math.abs(dy);
    if (v > mv) mv = v;
    const v0 = W.vy0[i];
    if (W.kind[i] === K_IRON) ironRest(W, i, v);
    if (v0 > 0.0045 && dy < v0 * 0.4) {
      W.hit[i] = W.t;
      W.hitV[i] = v0;
      if (W.fresh[i]) (W.fresh[i] = 0), push(W, 'tong', i, Math.round(v0 * 1000));
      else if (W.kind[i] === K_IRON && v0 > 0.007) push(W, 'clunk', i);
    }
    if (W.kind[i] === K_STAR && y[i] + W.r[i] > floorY(x[i]) + 0.012) {
      al[i] = 0;
      W.delivered++;
      W.refill++;
      W.refillT = W.t + REFILL_DELAY;
      W.asleep = false;
      push(W, 'deliver', i, W.delivered);
    } else if (y[i] > A + 0.2 || x[i] < XL - 0.2 || x[i] > XR + 0.2) al[i] = 0;
  }
  if (mv < SLEEP_V) W.calm++;
  else W.calm = 0;
  if (W.calm >= CALM_N) {
    W.asleep = true;
    for (let i = 0; i < n; i++) (px[i] = x[i]), (py[i] = y[i]);
  }
}
/** 쇠구슬: 밑에서 받치는 구슬이 있는 동안은 끼여서 꼼짝 안 하고, 받침이 다 없어지면 쿵 떨어진다 (떨어지며 3개까지 깸) */
function ironRest(W: World, i: number, v: number) {
  if (W.stat[i]) {
    if (supported(W, i, W.lose[i] ? 0.012 : 0.06)) return;
    W.stat[i] = 0;
    W.w[i] = 0.22;
    W.ry[i] = W.y[i];
    W.ihit[i] = 0;
    W.ical[i] = 0;
    push(W, 'drop', i);
    return;
  }
  if (v < 0.0008 && touch[i] && supported(W, i, 0.012)) {
    if (++W.ical[i] >= 4) (W.stat[i] = 1), (W.w[i] = 0), (W.ihit[i] = 0), (W.lose[i] = 0), (W.px[i] = W.x[i]), (W.py[i] = W.y[i]);
  } else W.ical[i] = 0;
}
function supported(W: World, i: number, tol: number): boolean {
  const xi = W.x[i], yi = W.y[i], ri = W.r[i];
  if (yi + ri > floorY(xi) - 0.008) return true;
  for (let j = 0; j < W.n; j++) {
    if (j === i || !W.alive[j] || W.kind[j] === K_STAR) continue;
    const dx = W.x[j] - xi, dy = W.y[j] - yi, rr = ri + W.r[j] + tol;
    if (dy <= 0 || dx * dx + dy * dy > rr * rr) continue;
    if (dy / Math.sqrt(dx * dx + dy * dy) > 0.35) return true;
  }
  return false;
}
function spawn(W: World) {
  const q = W.qi, v = W.queue[q % W.queue.length], sl = SLOT_ORDER[W.spawnK % 6];
  W.qi++;
  W.spawnK++;
  W.refill--;
  W.refillT = W.t + REFILL_GAP;
  const i = addBead(W, slotX(sl) + (hsh(q * 3.1) - 0.5) * 0.008, SPAWN_Y, rOfQ(q), v === 9 ? K_RAIN : K_N, v === 9 ? -1 : v);
  W.py[i] = SPAWN_Y - 0.004;
  W.fresh[i] = 1;
  W.asleep = false;
  W.calm = 0;
}
/** 그 자리의 병 바닥 높이 */
function floorY(x: number) {
  const ax = Math.abs(x - XC), h = HOLE_W / 2, sx = XC - XL - 0.05;
  if (ax <= h) return HOLE_Y;
  if (ax <= sx) return HOLE_Y - ((ax - h) / (sx - h)) * (HOLE_Y - SLANT_Y - 0.035);
  return SLANT_Y + 0.035 - ((ax - sx) / 0.05) * 0.035;
}
const rOfQ = (q: number) => 0.041 + hsh(q * 7.7 + 1.3) * 0.011;
function pendingPop(W: World) {
  for (let i = 0; i < W.n; i++) if (W.alive[i] && W.popAt[i] >= 0) return true;
  return false;
}
const worldDone = (W: World) => W.asleep && !(W.refill > 0 && !W.noRefill) && !pendingPop(W);
function tickWorld(W: World) {
  W.t++;
  for (let i = 0; i < W.n; i++) if (W.alive[i] && W.popAt[i] >= 0 && W.popAt[i] <= W.t) popBead(W, i, 'pop');
  if (W.refill > 0 && !W.noRefill && W.t >= W.refillT) spawn(W);
  if (!W.asleep) physics(W);
}

// ───────────────────────────── 잇기 규칙 ─────────────────────────────
/** 이음의 색: 무지개가 아닌 첫 구슬의 색 (-1 = 아직 무지개뿐) */
function chainState(W: World, ch: number[]): { cc: number } {
  for (const b of ch) if (W.kind[b] !== K_RAIN) return { cc: W.col[b] };
  return { cc: -1 };
}
function canAdd(W: World, ch: number[], b: number): boolean {
  if (!linkable(W, b) || ch.includes(b)) return false;
  if (!ch.length) return true;
  if (!touching(W, ch[ch.length - 1], b)) return false;
  if (W.kind[b] === K_RAIN) return true;
  const { cc } = chainState(W, ch);
  return cc < 0 || W.col[b] === cc;
}
/** 떼는 순간: 이음을 팡팡팡 차례로 터뜨리도록 예약 (게임·봇 시뮬레이션 공용) */
function applyStroke(W: World, ch: number[], fire: boolean): number {
  const L = ch.length;
  W.strokes++;
  W.maxChain = Math.max(W.maxChain, L);
  let fz = -1;
  if (fire && L >= FIRE_N) for (let k = L - 1; k >= 0 && fz < 0; k--) if (W.kind[ch[k]] === K_N) fz = ch[k];
  const t0 = W.t + 1;
  ch.forEach((b, k) => {
    if (b === fz) return;
    W.popAt[b] = t0 + k * POP_GAP;
    W.seq[b] = k + 1;
  });
  if (fz >= 0) {
    W.kind[fz] = K_FIRE;
    push(W, 'fuse', fz, L);
  }
  W.asleep = false;
  W.calm = 0;
  return fz;
}

// ───────────────────────────── 판 ─────────────────────────────
type GK = 'goal' | 'color' | 'any' | 'ice' | 'star' | 'smash' | 'fire' | 'chain' | 'within' | 'irons' | 'fewer';
interface StarDef { k: GK; n: number; c?: number; label: string }
type Spot = '' | 'fire' | 'ice' | 'star' | 'iron' | 'rain';
interface StageDef {
  key: string; name: string; news: string; hint: string; spot: Spot;
  n: number; colors: number; bias: number; maxGroup: number; strokes: number; fire: boolean;
  ice: number; iron: number; star: number; rain: number; rainQ: number; preFire: number;
  goal: StarDef; stars: StarDef[];
}
export const CNAME = ['빨간', '파란', '노란', '초록', '보라'];
const S = (k: GK, n: number, label: string, c?: number): StarDef => ({ k, n, label, c });
const GOAL = S('goal', 0, '');
export const STAGES: StageDef[] = [
  {
    key: 'connect', name: '첫 구슬병', news: '', hint: '같은 색 구슬을 쓱 이어 긋고 떼요', spot: '',
    n: 44, colors: 3, bias: 0.6, maxGroup: 7, strokes: 10, fire: false, ice: 0, iron: 0, star: 0, rain: 0, rainQ: 0, preFire: 0,
    goal: S('color', 7, '빨간 구슬 7개', 0), stars: [GOAL],
  },
  {
    key: 'fire', name: '폭죽 구슬', news: '8개 이상 이으면 끝 구슬이 폭죽! 폭죽을 이으면 펑', hint: '길게 이어 폭죽을 만들고, 폭죽을 이어 펑!', spot: 'fire',
    n: 46, colors: 4, bias: 0, maxGroup: 5, strokes: 7, fire: true, ice: 0, iron: 0, star: 0, rain: 0, rainQ: 0, preFire: 1,
    goal: S('any', 22, '구슬 22개'), stars: [GOAL, S('chain', 8, '한 번에 8개 잇기')],
  },
  {
    key: 'ice', name: '얼음 구슬', news: '얼음 구슬은 못 이어요 — 옆 구슬이 터지면 녹아요', hint: '얼음 옆을 지나가게 이어요', spot: 'ice',
    n: 46, colors: 4, bias: 0, maxGroup: 5, strokes: 7, fire: true, ice: 11, iron: 0, star: 0, rain: 0, rainQ: 0, preFire: 0,
    goal: S('ice', 9, '얼음 9개 녹이기'), stars: [GOAL, S('within', 5, '다섯 번 안에'), S('color', 8, '파란 구슬 8개', 1)],
  },
  {
    key: 'star', name: '별 그물', news: '별 구슬이 병 바닥에 닿으면 별 그물로 쏙!', hint: '별 구슬 밑을 터뜨려 바닥까지 내려요', spot: 'star',
    n: 46, colors: 4, bias: 0, maxGroup: 5, strokes: 7, fire: true, ice: 0, iron: 0, star: 2, rain: 0, rainQ: 0, preFire: 0,
    goal: S('star', 2, '별 구슬 2개 내리기'), stars: [GOAL, S('within', 4, '네 번 안에'), S('chain', 7, '한 번에 7개 잇기')],
  },
  {
    key: 'iron', name: '쇠구슬', news: '무거운 쇠구슬 — 못 이어요. 밑이 비면 쿵! 떨어져 깨요', hint: '쇠구슬 밑을 비워 쿵!', spot: 'iron',
    n: 46, colors: 4, bias: 0, maxGroup: 5, strokes: 6, fire: true, ice: 0, iron: 2, star: 0, rain: 0, rainQ: 0, preFire: 0,
    goal: S('smash', 6, '쇠구슬로 6개 깨기'), stars: [GOAL, S('within', 4, '네 번 안에'), S('fewer', 24, '구슬 24개 안 넘게')],
  },
  {
    key: 'rain', name: '무지개 구슬', news: '무지개 구슬은 아무 색과도 이어져요 — 떨어진 덩어리를 잇는 다리', hint: '무지개로 떨어진 같은 색을 이어요', spot: 'rain',
    n: 47, colors: 5, bias: 0, maxGroup: 4, strokes: 7, fire: true, ice: 0, iron: 0, star: 0, rain: 4, rainQ: 0.07, preFire: 0,
    goal: S('color', 7, '초록 구슬 7개', 3), stars: [GOAL, S('chain', 8, '한 번에 8개 잇기'), S('fewer', 26, '구슬 26개 안 넘게')],
  },
  {
    key: 'all', name: '마지막 병', news: '얼음·쇠구슬·무지개 — 모두 다 나와요', hint: '별 구슬 둘을 바닥 별 그물까지!', spot: '',
    n: 47, colors: 5, bias: 0, maxGroup: 4, strokes: 8, fire: true, ice: 4, iron: 2, star: 2, rain: 2, rainQ: 0.05, preFire: 0,
    goal: S('star', 2, '별 구슬 2개 내리기'), stars: [GOAL, S('smash', 2, '쇠구슬로 2개 깨기'), S('fewer', 22, '구슬 22개 안 넘게')],
  },
];
for (const d of STAGES) d.stars[0] = { ...GOAL, label: d.goal.label };
export const STAGE_COUNT = STAGES.length;
const CLEAR_PTS = 300, STAR_PTS = 200, LEFT_PTS = 40, BEAD_PTS = 4, WIN_PTS = 500, HEART_PTS = 200;

function metric(W: World, q: StarDef): number {
  switch (q.k) {
    case 'color': return W.cnt[q.c ?? 0];
    case 'any': return W.total;
    case 'ice': return W.melted;
    case 'star': return W.delivered;
    case 'smash': return W.smashed;
    case 'fire': return W.fires;
    case 'chain': return W.maxChain;
    case 'within': return W.strokes;
    case 'fewer': return W.total;
    case 'irons': {
      let k = 0;
      for (let i = 0; i < W.n; i++) if (W.alive[i] && W.kind[i] === K_IRON && W.drop[i]) k++;
      return k;
    }
    default: return 0;
  }
}
const goalMet = (W: World, d: StageDef) => metric(W, d.goal) >= d.goal.n;
function starMet(W: World, q: StarDef, d: StageDef): boolean {
  if (q.k === 'goal') return goalMet(W, d);
  if (q.k === 'within') return goalMet(W, d) && W.strokes <= q.n;
  if (q.k === 'fewer') return goalMet(W, d) && W.total <= q.n;
  return metric(W, q) >= q.n;
}

/** 이웃 목록 (맞닿은 것끼리, 종류 상관없이) */
function contacts(W: World): number[][] {
  const out: number[][] = [];
  for (let i = 0; i < W.n; i++) out.push([]);
  for (let i = 0; i < W.n; i++) {
    if (!W.alive[i]) continue;
    for (let j = i + 1; j < W.n; j++) if (W.alive[j] && touching(W, i, j)) out[i].push(j), out[j].push(i);
  }
  return out;
}
/** 같은 색(보통·폭죽) 덩어리 */
function colorComps(W: World, adj: number[][]): Int32Array {
  const comp = new Int32Array(W.n).fill(-1);
  let id = 0;
  for (let i = 0; i < W.n; i++) {
    if (comp[i] >= 0 || !W.alive[i] || W.col[i] < 0 || !(W.kind[i] === K_N || W.kind[i] === K_FIRE)) continue;
    const st = [i];
    comp[i] = id;
    while (st.length) {
      const a = st.pop()!;
      for (const b of adj[a]) if (comp[b] < 0 && W.alive[b] && (W.kind[b] === K_N || W.kind[b] === K_FIRE) && W.col[b] === W.col[i]) (comp[b] = id), st.push(b);
    }
    id++;
  }
  return comp;
}

function buildStage(seed: number, k: number): World {
  const d = STAGES[k], rng = mulberry32(seed), W = newWorld();
  let placed = 0;
  for (let row = 0; placed < d.n; row++) {
    const y = HOLE_Y - 0.07 - row * 0.082, off = row % 2 ? 0.046 : 0;
    for (let x = XL + 0.05 + off; x < XR - 0.045 && placed < d.n; x += 0.093) {
      addBead(W, x + (rng() - 0.5) * 0.012, y + (rng() - 0.5) * 0.012, 0.041 + rng() * 0.011, K_N, -1);
      placed++;
    }
  }
  for (let t = 0; t < 500 && !W.asleep; t++) tickWorld(W);
  W.asleep = false;
  for (let t = 0; t < 200 && !W.asleep; t++) tickWorld(W);
  const n = W.n, ys = [...Array(n).keys()].sort((a, b) => W.y[a] - W.y[b] || a - b);
  const top = W.y[ys[0]];
  const taken = new Uint8Array(n);
  const pick = (cnt: number, ok: (i: number) => boolean, put: (i: number) => void) => {
    for (let a = 0, left = cnt; a < 600 && left > 0; a++) {
      const i = Math.floor(rng() * n);
      if (taken[i] || !ok(i)) continue;
      taken[i] = 1;
      put(i);
      left--;
    }
  };
  const depth = (i: number) => (W.y[i] - top) / Math.max(0.1, HOLE_Y - top);
  // 별: 위쪽 가운데 (밑을 파야 내려간다)
  pick(d.star, (i) => depth(i) > 0.35 && depth(i) < 0.6 && Math.abs(W.x[i] - XC) < 0.2 && W.r[i] < 0.0495 && ![...Array(n).keys()].some((j) => taken[j] && W.kind[j] === K_STAR && Math.abs(W.x[j] - W.x[i]) < 0.12), (i) => ((W.kind[i] = K_STAR), (W.col[i] = -1), (W.w[i] = 0.35)));
  // 쇠구슬: 위쪽 절반, 벽에서 조금 떨어져
  pick(d.iron, (i) => depth(i) > 0.05 && depth(i) < 0.4 && W.x[i] > XL + 0.04 && W.x[i] < XR - 0.04 && Math.abs(W.x[i] - XC) > 0.17 && ![...Array(n).keys()].some((j) => taken[j] && W.kind[j] === K_IRON && Math.abs(W.x[j] - W.x[i]) < 0.2), (i) => ((W.kind[i] = K_IRON), (W.col[i] = -1), (W.w[i] = 0), (W.stat[i] = 1)));
  pick(d.rain, (i) => depth(i) > 0.1 && depth(i) < 0.8, (i) => ((W.kind[i] = K_RAIN), (W.col[i] = -1)));
  pick(d.ice, (i) => depth(i) > 0.12 && depth(i) < 0.85, (i) => (W.kind[i] = K_ICE));
  pick(d.preFire, (i) => depth(i) < 0.3 && Math.abs(W.x[i] - XC) < 0.15, (i) => (W.kind[i] = K_FIRE));
  // 색: 맞닿은 이웃으로 덩어리를 키워 칠한다 (처음 덩어리는 maxGroup 이하 — 긴 이음은 무너져야 생긴다)
  const adj = contacts(W);
  const bc = d.goal.k === 'color' ? (d.goal.c ?? 0) : 0;
  const wts = [...Array(d.colors).keys()].map((c) => (d.bias && c === bc ? d.bias : (1 - d.bias) / (d.colors - (d.bias ? 1 : 0))));
  const pickCol = () => {
    let u = rng() * wts.reduce((a, b) => a + b, 0);
    for (let c = 0; c < wts.length; c++) if ((u -= wts[c]) <= 0) return c;
    return wts.length - 1;
  };
  const colorable = (i: number) => W.kind[i] === K_N || W.kind[i] === K_FIRE || W.kind[i] === K_ICE;
  const order = [...Array(n).keys()];
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  for (const i0 of order) {
    if (!colorable(i0) || W.col[i0] >= 0) continue;
    const c = pickCol(), m = 1 + Math.floor(rng() * d.maxGroup);
    const q = [i0];
    W.col[i0] = c;
    for (let h = 0, got = 1; h < q.length && got < m; h++)
      for (const b of adj[q[h]]) if (got < m && colorable(b) && W.col[b] < 0 && rng() < 0.75) (W.col[b] = c), q.push(b), got++;
  }
  for (let pass = 0; pass < 40; pass++) {
    const comp = colorComps(W, adj), size = new Map<number, number[]>();
    for (let i = 0; i < n; i++) if (comp[i] >= 0) size.set(comp[i], [...(size.get(comp[i]) ?? []), i]);
    let bad = false;
    for (const mem of size.values()) {
      if (mem.length <= d.maxGroup) continue;
      bad = true;
      const i = mem[Math.floor(rng() * mem.length)];
      W.col[i] = (W.col[i] + 1 + Math.floor(rng() * (d.colors - 1))) % d.colors;
    }
    if (!bad) break;
  }
  if (k === 0) demoPath(W, adj, rng);
  // 떨어질 구슬 줄: 같은 색이 1~3개씩 이어 오게
  const qn = 400, Q = new Int8Array(qn);
  for (let i = 0; i < qn; ) {
    if (d.rainQ && rng() < d.rainQ) {
      Q[i++] = 9;
      continue;
    }
    const c = pickCol(), m = 1 + Math.floor(rng() * 3);
    for (let j = 0; j < m && i < qn; j++) Q[i++] = c;
  }
  W.queue = Q;
  W.qi = Math.floor(rng() * 50);
  W.t = 0;
  for (let i = 0; i < n; i++) (W.born[i] = -999), (W.hit[i] = -999);
  return W;
}
/** 첫 판: 맨 위 근처에 빨간 구슬 다섯이 맞닿아 줄지어 있다 (손가락 시범이 이걸 잇는다) */
function demoPath(W: World, adj: number[][], rng: Rng) {
  const n = W.n, top = Math.min(...[...Array(n).keys()].map((i) => W.y[i]));
  // 위에서 두세 줄 아래 가로 줄 — 터지면 위 구슬이 와르르 내려앉는 자리
  const band = (i: number) => W.y[i] > top + 0.12 && W.y[i] < top + 0.27;
  const cand = [...Array(n).keys()].filter((i) => band(i) && W.x[i] < XC - 0.1).sort((a, b) => W.x[a] - W.x[b]);
  let best: number[] = [];
  for (const s0 of cand) {
    const path = [s0], y0 = W.y[s0];
    while (path.length < 5) {
      const last = path[path.length - 1];
      let nb = -1, sc = -1e9;
      for (const b of adj[last]) {
        if (path.includes(b) || W.kind[b] !== K_N || !band(b)) continue;
        const v = (W.x[b] - W.x[last]) * 4 - Math.abs(W.y[b] - y0) * 5;
        if (v > sc) (sc = v), (nb = b);
      }
      if (nb < 0 || W.x[nb] < W.x[last] - 0.01) break;
      path.push(nb);
    }
    if (path.length > best.length) best = path;
    if (best.length >= 5) break;
  }
  for (const b of best) W.col[b] = 0;
  for (const b of best) for (const nb of adj[b]) if (!best.includes(nb) && W.col[nb] === 0) W.col[nb] = 1 + Math.floor(rng() * 2);
  W.demo = best.map((b) => W.uid[b]);
}
// ───────────────────────────── 상태 ─────────────────────────────
type Phase = 'play' | 'resolve' | 'clear' | 'fail';
type Face = 'idle' | 'watch' | 'wow' | 'happy' | 'dizzy' | 'scared';
interface Ev { t: number; k: string; x: number; y: number; c: number; kind: number; r: number; n: number; uid: number; text?: string }
export interface BeadState {
  rng: Rng; seed: number; t: number; stage: number; seeds: number[]; W: World;
  phase: Phase; pt: number; playT: number; chain: number[]; down: boolean; stroking: boolean; ax: number; ay: number; lx: number; ly: number;
  left: number; hearts: number; stars: number; got: number; starOk: boolean[]; pts: number; won: boolean; dead: boolean; again: boolean; tries: number; fizzles: number;
  wowN: number; firstTap: number; slow: number; strokeL: number; strokeFire: number; strokeSmash: number; strokeMelt: number; lastTotal: number;
  face: Face; faceT: number; say: string; sayT: number;
  seen: Set<string>; tips: Set<string>; banner: { head: string; sub: string; t: number } | null; spot: { k: Spot; t: number } | null;
  events: Ev[]; bigText: string; bigT: number; demo: number[]; linkT: number; warnT: number; warn: string;
}
const ev = (s: BeadState, k: string, x: number, y: number, extra: Partial<Ev> = {}) => s.events.push({ t: s.t, k, x, y, c: -1, kind: 0, r: 0.045, n: 0, uid: 0, ...extra });
function see(s: BeadState, key: string) {
  if (!key || s.seen.has(key)) return false;
  s.seen.add(key);
  return true;
}
function wow(s: BeadState, text: string) {
  s.wowN++;
  s.bigText = text;
  s.bigT = s.t;
}
function setFace(s: BeadState, f: Face, say = '') {
  s.face = f;
  s.faceT = s.t;
  if (say) (s.say = say), (s.sayT = s.t);
}
const SPOT_AT = 140, CLEAR_T = 190, FAIL_T = 160, BANNER_T = 150;

function newStage(s: BeadState) {
  const d = STAGES[s.stage];
  s.W = buildStage(s.seeds[s.stage], s.stage);
  s.W.ev = [];
  s.phase = 'play';
  s.pt = 0;
  s.playT = s.t;
  s.chain = [];
  s.stroking = false;
  s.left = d.strokes;
  s.starOk = d.stars.map(() => false);
  s.got = 0;
  s.lastTotal = 0;
  s.demo = s.stage === 0 && !s.again ? (s.W.demo ?? []) : [];
  setFace(s, 'idle');
  if (s.stage === 0) see(s, 'connect');
  if (!s.again) {
    s.banner = { head: `${s.stage + 1}판 · ${d.name}`, sub: d.news ? `NEW  ${d.news}` : d.hint, t: s.t };
    if (d.spot) {
      s.spot = { k: d.spot, t: s.t };
      see(s, d.spot);
    } else s.spot = null;
    if (d.key === 'all') see(s, 'all');
  } else s.banner = { head: `다시! ${s.stage + 1}판 · ${d.name}`, sub: '같은 병이에요 — 이번엔 다른 데부터', t: s.t };
}

/** 손가락 자리에서 가장 가까운 구슬 (구슬 반지름 + 여유 안) */
function beadAt(W: World, x: number, y: number): number {
  let best = -1, bd = 1e9;
  for (let i = 0; i < W.n; i++) {
    if (!W.alive[i] || W.popAt[i] >= 0) continue;
    const dx = W.x[i] - x, dy = W.y[i] - y, d2 = dx * dx + dy * dy, lim = W.r[i] + HIT_PAD;
    if (d2 < lim * lim && d2 < bd) (bd = d2), (best = i);
  }
  return best;
}
function touchAt(s: BeadState, x: number, y: number) {
  const W = s.W, b = beadAt(W, x, y);
  if (b < 0) return;
  const ch = s.chain;
  if (ch.length && ch[ch.length - 1] === b) return;
  if (ch.length >= 2 && ch[ch.length - 2] === b) {
    ch.pop();
    s.linkT = s.t;
    ev(s, 'unlink', W.x[b], W.y[b], { c: W.col[b] });
    return;
  }
  if (ch.includes(b)) return;
  if (!linkable(W, b)) {
    if (s.t - s.warnT > 50 && (!ch.length || touching(W, ch[ch.length - 1], b))) {
      const k = W.kind[b];
      s.warn = k === K_ICE ? '얼음은 못 이어요 — 옆을 터뜨려요' : k === K_IRON ? '쇠구슬은 못 이어요' : k === K_STAR ? '별 구슬은 바닥 구멍으로!' : '';
      if (s.warn) (s.warnT = s.t), ev(s, 'warn', W.x[b], W.y[b], { text: s.warn, kind: k });
    }
    return;
  }
  if (!canAdd(W, ch, b)) {
    // 아직 둘 이하면 손가락이 간 구슬에서 새로 시작 (첫 구슬 색에 묶이지 않게 — 넉넉히)
    if (ch.length > 2) return;
    ch.length = 0;
    ch.push(b);
    s.linkT = s.t;
    ev(s, 'link', W.x[b], W.y[b], { c: W.col[b], kind: W.kind[b], n: 1, r: W.r[b], uid: W.uid[b] });
    return;
  }
  ch.push(b);
  s.linkT = s.t;
  ev(s, 'link', W.x[b], W.y[b], { c: W.col[b], kind: W.kind[b], n: ch.length, r: W.r[b], uid: W.uid[b] });
  if (ch.length >= 2) setFace(s, 'watch');
  if (STAGES[s.stage].fire && ch.length === FIRE_N) ev(s, 'fireReady', W.x[b], W.y[b], { n: ch.length });
}
function sweep(s: BeadState, ax: number, ay: number, bx: number, by: number) {
  const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 0.012));
  for (let k = 1; k <= n; k++) touchAt(s, ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n);
}
function endStroke(s: BeadState) {
  const W = s.W, ch = s.chain, d = STAGES[s.stage];
  s.chain = [];
  if (ch.length >= 3) {
    s.left--;
    s.strokeL = ch.length;
    s.strokeFire = W.fires;
    s.strokeSmash = W.smashed;
    s.strokeMelt = W.melted;
    applyStroke(W, ch, d.fire);
    s.phase = 'resolve';
    s.pt = 0;
    s.demo = [];
    const L = ch.length;
    ev(s, 'release', W.x[ch[L - 1]], W.y[ch[L - 1]], { n: L, c: chainState(W, ch).cc });
    wow(s, L >= 10 ? `팡팡팡팡! ${L}개!!` : L >= 7 ? `팡팡팡! ${L}개!` : L >= 4 ? `팡팡팡! ${L}개` : '팡팡팡!');
    if (L >= 8) s.slow = 18;
    setFace(s, L >= 6 ? 'wow' : 'watch', L >= 8 ? '우와앙!' : L >= 5 ? '냐앗!' : '');
  } else if (ch.length) {
    s.fizzles++;
    ev(s, 'fizzle', W.x[ch[ch.length - 1]], W.y[ch[ch.length - 1]], { n: ch.length, text: '3개부터 터져요!' });
  }
}
function drainWorld(s: BeadState) {
  const W = s.W;
  if (!W.ev || !W.ev.length) return;
  for (const e of W.ev) {
    s.events.push({ t: s.t, ...e });
    if (e.k === 'blast') {
      if (W.fires - s.strokeFire === 1) wow(s, '펑!! 폭죽!');
      else if (W.fires - s.strokeFire === 2) wow(s, '펑펑!! 연쇄 폭죽!');
      s.slow = Math.max(s.slow, 22);
      setFace(s, 'scared', '꺄웅!');
      see(s, 'fire');
    } else if (e.k === 'thud' && W.smashed - s.strokeSmash === 2) {
      wow(s, '쿵쿵! 와장창!');
      setFace(s, 'wow', '쿵!');
    } else if (e.k === 'deliver') {
      wow(s, '쏙! 별 구슬!');
      setFace(s, 'happy', '별이다!');
      s.slow = Math.max(s.slow, 16);
    } else if (e.k === 'melt' && W.melted - s.strokeMelt === 3) wow(s, '쨍쨍쨍! 얼음이 녹아요');
    else if (e.k === 'fuse') setFace(s, 'wow', '폭죽이다!');
  }
  W.ev.length = 0;
}
function afterResolve(s: BeadState) {
  const W = s.W, d = STAGES[s.stage];
  s.pts += (W.total - s.lastTotal) * BEAD_PTS;
  s.lastTotal = W.total;
  if (goalMet(W, d)) {
    s.phase = 'clear';
    s.pt = 0;
    s.starOk = d.stars.map((q) => starMet(W, q, d));
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    s.pts += Math.round((CLEAR_PTS + s.got * STAR_PTS + s.left * LEFT_PTS) * (1 + s.stage * 0.35));
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS + s.hearts * HEART_PTS);
    wow(s, s.won ? '모든 병 성공!' : '판 성공!');
    setFace(s, 'happy', '냐아~!');
    ev(s, 'clear', XC, 0.8);
    return;
  }
  if (s.left <= 0) {
    s.phase = 'fail';
    s.pt = 0;
    s.hearts--;
    s.tries++;
    setFace(s, 'dizzy', '냐…');
    ev(s, 'fail', XC, 0.8);
    return;
  }
  s.phase = 'play';
  s.pt = 0;
  s.playT = s.t;
  compact(W);
  if (s.face !== 'happy') setFace(s, 'idle');
}

const game: GameDef<BeadState> & { wows(s: BeadState): number } = {
  id: 'beadlink',
  name: '🔮 구슬 더미 이어 긋기',
  genes: ['connect', 'chain'],
  twist: '격자가 아니라 물리로 쌓인 구슬 더미 — 이어서 터뜨리면 더미가 와르르 내려앉아 새로 맞닿은 구슬끼리 더 긴 이음이 생기고, 8개 이상 이은 끝자리에 폭죽 구슬이 생겨 둘레를 날린다(폭죽끼리 연쇄). 어디를 터뜨려 무엇을 맞닿게 할지, 이음을 어디서 끝낼지가 수다',
  rules: [
    '같은 색 구슬을 쓱 이어 긋고 떼면 팡팡팡! 맞닿은 구슬끼리, 3개부터 터져요.',
    '터지면 더미가 와르르 내려앉고 새 구슬이 떨어져요. 8개 이상 이으면 폭죽 구슬!',
    '긋기 횟수 안에 목표를 채우면 성공, 못 채우면 하트 -1.',
  ],
  controls: 'touch',
  hint: '같은 색 구슬 위를 쓱 이어 긋고 떼기 / 스페이스를 누른 채 화살표',
  aspect: A,
  art: {
    concept: '햇살 드는 창가의 유리 구슬병 — 병 속에 와르르 쌓인 반질반질 유리구슬, 옆에서 구경하는 줄무늬 고양이',
    mood: '따뜻한 오후 햇살이 창으로 들어와 나무 탁자 위 유리병을 비춘다. 병 속 크고 작은 유리구슬(빨강·파랑·노랑·초록·보라)이 반짝이고, 구슬 빛이 탁자에 알록달록 번진다. 손가락으로 이으면 구슬이 빛나며 줄이 생기고, 떼면 팡팡팡 터져 더미가 와르르 내려앉는다. 병 옆 고양이가 눈으로 손가락을 따라가다 폭죽에 털이 쭈뼛 선다.',
    palette: { bg: '#ffe9c8', ink: '#4a2a14', muted: '#9a7a5a', accent: '#ff8a3a', hot: '#ff4d5e', soft: '#fff6e8' },
  },
  guard: (s) => s.left,
  cleared: (s) => (s.phase === 'clear' ? { stage: s.stage, got: s.got, of: s.starOk.length } : null),
  reveals: (s) => s.seen.size,
  wows: (s) => s.wowN,
  create(seed) {
    const rng = mulberry32(seed);
    const s = {
      rng, seed, t: 0, stage: 0, seeds: STAGES.map(() => Math.floor(rng() * 1e9)),
      phase: 'play', pt: 0, playT: 0, chain: [], down: false, stroking: false, ax: 0.5, ay: 0.8, lx: 0, ly: 0,
      left: 0, hearts: 3, stars: 0, got: 0, starOk: [false], pts: 0, won: false, dead: false, again: false, tries: 0, fizzles: 0,
      wowN: 0, firstTap: -1, slow: 0, strokeL: 0, strokeFire: 0, strokeSmash: 0, strokeMelt: 0, lastTotal: 0,
      face: 'idle', faceT: 0, say: '', sayT: -999,
      seen: new Set<string>(), tips: new Set<string>(), banner: null, spot: null, events: [], bigText: '', bigT: -999, demo: [], linkT: -999, warnT: -999, warn: '',
    } as unknown as BeadState;
    newStage(s);
    s.banner = null;
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    const p = inp.pointer ?? null, fresh = !!p && !s.down, release = !p && s.down;
    s.down = !!p;
    if (p) (s.ax = p.x), (s.ay = p.y * A);
    if (s.phase === 'play') {
      // 새로 눌렀거나, 더미가 멈추기 전에 미리 눌러 둔 손가락이면 여기서부터 한 획
      if (fresh || (p && !s.stroking)) {
        s.stroking = true;
        s.lx = s.ax;
        s.ly = s.ay;
        if (s.firstTap < 0) s.firstTap = s.t;
        touchAt(s, s.ax, s.ay);
      } else if (p && s.stroking) {
        sweep(s, s.lx, s.ly, s.ax, s.ay);
        s.lx = s.ax;
        s.ly = s.ay;
      }
      if (release && s.stroking) (s.stroking = false), endStroke(s);
    } else if (s.phase === 'resolve') {
      if (release) s.stroking = false;
      let skip = false;
      if (s.slow > 0) (skip = s.slow % 2 === 1), s.slow--;
      if (!skip) {
        tickWorld(s.W);
        drainWorld(s);
        s.pt++;
      }
      if (worldDone(s.W) || s.pt > 900) afterResolve(s);
    } else {
      if (release) s.stroking = false;
      s.pt++;
      const T = s.phase === 'clear' ? CLEAR_T : FAIL_T;
      if (s.pt >= T || (fresh && s.pt > 70)) {
        if (s.phase === 'clear') {
          if (s.won) s.dead = true;
          else (s.again = false), s.stage++, newStage(s);
        } else if (s.hearts <= 0) s.dead = true;
        else (s.again = true), newStage(s);
      }
    }
    if (s.events.length > 120) s.events = s.events.filter((e) => s.t - e.t < 60);
    if (s.spot && s.t - s.spot.t > SPOT_AT + 260) s.spot = null;
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};
export const beadlink = game;

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
const at = (W: World, i: number): Input => ({ tap: false, dir: 0, pointer: { x: W.x[i], y: W.y[i] / A } });
/** 한 구슬에서 시작해 가장 길게 이어지는 길 (탐색 예산 안에서) */
function longestFrom(W: World, adj: number[][], start: number, budget: number): number[] {
  const path = [start];
  let best = [start], left = budget;
  const rec = () => {
    if (path.length > best.length) best = path.slice();
    if (--left <= 0) return;
    const last = path[path.length - 1];
    for (const b of adj[last]) {
      if (!canAdd(W, path, b)) continue;
      path.push(b);
      rec();
      path.pop();
      if (left <= 0) return;
    }
  };
  if (linkable(W, start)) rec();
  return best;
}
function linkAdj(W: World): number[][] {
  const adj: number[][] = [];
  for (let i = 0; i < W.n; i++) adj.push([]);
  for (let i = 0; i < W.n; i++) {
    if (!linkable(W, i)) continue;
    for (let j = i + 1; j < W.n; j++) if (linkable(W, j) && touching(W, i, j)) adj[i].push(j), adj[j].push(i);
  }
  return adj;
}
/** 지금 그을 수 있는 이음 후보들 (시작마다 가장 긴 길 + 그 앞부분) */
function candidates(W: World, budget = 60): number[][] {
  const adj = linkAdj(W), out: number[][] = [], keys = new Set<string>();
  const add = (p: number[]) => {
    if (p.length < 3) return;
    const k = p.slice().sort((a, b) => a - b).join(',') + '|' + p[p.length - 1];
    if (!keys.has(k)) keys.add(k), out.push(p);
  };
  for (let i = 0; i < W.n; i++) {
    if (!linkable(W, i) || !adj[i].length) continue;
    const p = longestFrom(W, adj, i, budget);
    add(p);
    if (p.length > 3) add(p.slice(0, 3));
    if (p.length >= 6) add(p.slice(0, Math.ceil(p.length / 2)));
    if (p.length > FIRE_N) add(p.slice(0, FIRE_N));
  }
  return out;
}
/** 목표 종류마다 잘 그은 한 획이 채우는 양 (끝내기까지 몇 획 남았나 어림) */
const PER: Partial<Record<GK, number>> = { color: 3.5, any: 6, ice: 2.2, star: 0.6, smash: 1.8, fire: 0.5 };
/** 판의 값: 끝냈으면 별 수, 아직이면 '몇 획 안에 끝낼 수 있나'로 어림한 별 수 + 다음 수의 가능성(무너진 뒤 맞닿은 것) */
function value(W: World, d: StageDef, left: number): number {
  const g = d.goal, have = metric(W, g), extra = d.stars.slice(1);
  if (have >= g.n) {
    let got = 1;
    for (const q of extra) if (starMet(W, q, d)) got++;
    return 100000 + got * 7000 + left * 250;
  }
  if (left <= 0) return -60000 + (have / g.n) * 20000;
  const unit = 40000 / g.n, need = g.n - have;
  // 가능성
  const adj = contacts(W), comp = colorComps(W, adj), sz = new Map<number, number>();
  for (let i = 0; i < W.n; i++) if (comp[i] >= 0) sz.set(comp[i], (sz.get(comp[i]) ?? 0) + 1);
  const big = (i: number) => (comp[i] >= 0 ? (sz.get(comp[i]) ?? 0) : W.kind[i] === K_RAIN && W.alive[i] ? 3 : 0);
  let best = 0, fires = 0, rains = 0;
  for (const z of sz.values()) best = Math.max(best, z);
  for (let i = 0; i < W.n; i++) if (W.alive[i]) (fires += +(W.kind[i] === K_FIRE)), (rains += +(W.kind[i] === K_RAIN));
  let pot = Math.min(best, 12) * 120 + fires * (g.k === 'any' ? unit * 2.5 : 600);
  const colorPot = (c: number) => {
    let m = 0;
    for (let i = 0; i < W.n; i++) if (W.alive[i] && W.col[i] === c && comp[i] >= 0 && (sz.get(comp[i]) ?? 0) >= 3) m++;
    return m;
  };
  if (g.k === 'color') pot += Math.min(colorPot(g.c ?? 0), need) * unit * 0.35;
  else if (g.k === 'any') {
    for (const z of sz.values()) if (z >= 3) pot += Math.min(z, 10) * unit * 0.12;
  } else if (g.k === 'ice') {
    for (let i = 0; i < W.n; i++) {
      if (!W.alive[i] || W.kind[i] !== K_ICE) continue;
      let q = 0;
      for (const b of adj[i]) q = Math.max(q, big(b));
      pot += q >= 3 ? unit * 0.45 : q >= 2 ? unit * 0.15 : 0;
    }
  } else if (g.k === 'star') {
    for (let i = 0; i < W.n; i++) {
      if (!W.alive[i] || W.kind[i] !== K_STAR) continue;
      pot -= ((HOLE_Y - W.y[i]) / 0.5) * unit * 0.8 + Math.abs(W.x[i] - XC) * unit * 0.5;
      for (const b of adj[i]) if (W.y[b] > W.y[i] && big(b) >= 3) pot += unit * 0.05;
    }
  } else if (g.k === 'smash') {
    for (let i = 0; i < W.n; i++) {
      if (!W.alive[i] || W.kind[i] !== K_IRON) continue;
      for (const b of adj[i]) if (W.y[b] > W.y[i] + 0.03 && big(b) >= 3) pot += unit * 0.3;
      pot += ((HOLE_Y - W.y[i]) / 0.5) * unit * 0.3;
    }
  }
  // 끝내기까지 몇 획 · 그동안 딸 별 어림
  const est = Math.max(1, Math.ceil(need / (PER[g.k] ?? 3))), margin = left - est;
  const p = margin >= 3 ? 0.985 : margin >= 2 ? 0.97 : margin >= 1 ? 0.9 : margin >= 0 ? 0.65 : 0.3;
  let stars = 1;
  for (const q of extra) {
    const m = metric(W, q);
    if (q.k === 'within') stars += W.strokes + est <= q.n ? (margin >= 1 ? 0.8 : 0.5) : 0;
    else if (q.k === 'fewer') stars += W.total + est * 4 <= q.n ? 0.7 : W.total + est * 2 <= q.n ? 0.3 : 0;
    else if (m >= q.n) stars += 1;
    else if (q.k === 'chain') stars += best + rains >= q.n ? 0.6 : 0.1 + (0.4 * best) / q.n;
    else if (q.k === 'fire') stars += fires ? 0.6 : 0.15;
    else if (q.k === 'color') stars += Math.min(0.85, (0.6 * (m + colorPot(q.c ?? 0))) / q.n);
    else stars += (0.7 * m) / q.n;
  }
  return p * (100000 + stars * 7000) - (1 - p) * 60000 + have * unit * 0.1 + pot * 0.25;
}
/** 같은 물리로 이음 하나를 끝까지 굴려 본다 (새 구슬 떨어짐은 빼고 — 가볍게) */
function simStroke(W0: World, ch: number[], d: StageDef): World {
  const W = cloneWorld(W0);
  W.noRefill = true;
  applyStroke(W, ch, d.fire);
  // 마지막 팡 뒤 55틱(무너짐의 큰 움직임)까지만 — 나머지 느린 미끄러짐은 판단에 거의 안 쓰인다
  const end = W.t + ch.length * POP_GAP + 55;
  for (let k = 0; k < 360 && !worldDone(W) && (W.t < end || pendingPop(W)); k++) tickWorld(W);
  return W;
}
function quick(W: World, p: number[], d: StageDef): number {
  const g = d.goal;
  let v = p.length * 10;
  if (d.fire && p.length >= FIRE_N) v += 60;
  for (const b of p) {
    if (W.kind[b] === K_FIRE) v += 70;
    if (g.k === 'color' && W.col[b] === g.c) v += 25;
    if (g.k === 'ice' || g.k === 'star' || g.k === 'smash')
      for (let j = 0; j < W.n; j++) {
        if (!W.alive[j]) continue;
        const k = W.kind[j];
        if (g.k === 'ice' && k === K_ICE && touching(W, b, j)) v += 30;
        if ((g.k === 'star' && k === K_STAR) || (g.k === 'smash' && k === K_IRON)) {
          const dx = W.x[b] - W.x[j], dy = W.y[b] - W.y[j];
          if (dy > 0 && Math.abs(dx) < 0.11) v += 40 - dy * 100;
        }
      }
  }
  return v;
}
export function plan(s: BeadState, wide = 6): number[] {
  const W = s.W, d = STAGES[s.stage];
  const cs = candidates(W);
  if (!cs.length) return [];
  const ranked = cs.map((p) => ({ p, q: quick(W, p, d) })).sort((a, b) => b.q - a.q).slice(0, wide);
  let best = ranked[0].p, bv = -Infinity;
  for (const { p, q } of ranked) {
    const v = value(simStroke(W, p, d), d, s.left - 1) + q * 0.01;
    if (v > bv) (bv = v), (best = p);
  }
  return best;
}
interface Drive { key: string; path: number[]; k: number }
const driveMem = new WeakMap<object, Drive>();
function drive(s: BeadState, pick: (s: BeadState) => number[]): Input {
  if (s.phase !== 'play') return NO;
  const key = `${s.stage}:${s.tries}:${s.W.strokes}:${s.fizzles}`;
  let m = driveMem.get(s);
  if (!m || m.key !== key) {
    if (s.down || s.t - s.playT < 10) return NO;
    driveMem.set(s, (m = { key, path: pick(s), k: 0 }));
  }
  if (!m.path.length) return NO;
  if (m.k < m.path.length) return at(s.W, m.path[m.k++]);
  if (m.k === m.path.length) return m.k++, at(s.W, m.path[m.path.length - 1]);
  return NO;
}
/** 잘하는 봇: 후보 이음마다 같은 물리로 무너짐을 굴려 보고(1수), 무너진 뒤 맞닿은 덩어리로 다음 수를 어림(2수) */
export const beadlinkSmart: Bot<BeadState> = {
  name: '무너짐을 굴려 보고 긋기',
  act: (s) => drive(s, (st) => plan(st)),
};
/** 버릇 봇: 늘 지금 가장 긴 이음 */
export const beadlinkHabit: Bot<BeadState> = {
  name: '늘 가장 긴 이음',
  act: (s) =>
    drive(s, (st) => {
      let best: number[] = [];
      for (const p of candidates(st.W)) if (p.length > best.length) best = p;
      return best;
    }),
};
/** 독립 버릇 봇: 늘 맨 아래 구슬부터 (이을 수 있는 가장 낮은 구슬에서 가장 길게) */
export const beadlinkHabit2: Bot<BeadState> = {
  name: '늘 맨 아래 구슬부터',
  act: (s) =>
    drive(s, (st) => {
      const W = st.W, adj = linkAdj(W);
      const order = [...Array(W.n).keys()].filter((i) => linkable(W, i)).sort((a, b) => W.y[b] - W.y[a] || a - b);
      for (const i of order) {
        const p = longestFrom(W, adj, i, 60);
        if (p.length >= 3) return p;
      }
      return [];
    }),
};
const dumbMem = new WeakMap<object, { next: number; on: boolean; t0: number; end: number; x0: number; y0: number; dx: number; dy: number }>();
/** 못하는 봇: 아무 데서나 아무 쪽으로 쓱 (아무 길이) */
export const beadlinkRandom: Bot<BeadState> = {
  name: '아무 데나 쓱',
  act(s, rng) {
    let m = dumbMem.get(s);
    if (!m) dumbMem.set(s, (m = { next: s.t + 15 + Math.floor(rng() * 40), on: false, t0: 0, end: 0, x0: 0, y0: 0, dx: 0, dy: 0 }));
    if (m.on) {
      if (s.t >= m.end) {
        m.on = false;
        m.next = s.t + 15 + Math.floor(rng() * 70);
        return NO;
      }
      const u = (s.t - m.t0) / Math.max(1, m.end - m.t0);
      return { tap: false, dir: 0, pointer: { x: m.x0 + m.dx * u, y: (m.y0 + m.dy * u) / A } };
    }
    if (s.t < m.next) return NO;
    const W = s.W;
    let top = HOLE_Y;
    for (let i = 0; i < W.n; i++) if (W.alive[i]) top = Math.min(top, W.y[i]);
    const a = rng() * Math.PI * 2, len = 0.1 + rng() * 0.4;
    m.on = true;
    m.t0 = s.t;
    m.end = s.t + 6 + Math.floor(rng() * 26);
    m.x0 = XL + 0.03 + rng() * (XR - XL - 0.06);
    m.y0 = top + rng() * (HOLE_Y - top);
    m.dx = Math.cos(a) * len;
    m.dy = Math.sin(a) * len;
    return { tap: false, dir: 0, pointer: { x: m.x0, y: m.y0 / A } };
  },
};

/** 시험·스크린샷용: k판(0부터)으로 바로 */
export function jumpTo(s: BeadState, k: number) {
  s.stage = k;
  s.again = false;
  newStage(s);
}

// ───────────────────────────── 그리기 ─────────────────────────────
type C2 = CanvasRenderingContext2D;
const TAU = Math.PI * 2;
function hsh(k: number) {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const ease = (u: number) => 1 - (1 - clamp(u, 0, 1)) ** 2;
function ell(ctx: C2, x: number, y: number, rx: number, ry: number, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
}
function lin(ctx: C2, x0: number, y0: number, x1: number, y1: number, ...st: [number, string][]) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of st) g.addColorStop(o, c);
  return g;
}
function radg(ctx: C2, x: number, y: number, r0: number, x1: number, y1: number, r1: number, ...st: [number, string][]) {
  const g = ctx.createRadialGradient(x, y, Math.max(0, r0), x1, y1, Math.max(0.1, r1));
  for (const [o, c] of st) g.addColorStop(o, c);
  return g;
}
function rr(ctx: C2, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function starPath(ctx: C2, x: number, y: number, r: number, inner = 0.45, rot = 0) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + rot + (k * Math.PI) / 5, q = k % 2 ? r * inner : r;
    k ? ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q) : ctx.moveTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
  }
  ctx.closePath();
}
function heartPath(ctx: C2, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.9);
  ctx.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.7, y - r * 1.3, x, y - r * 0.45);
  ctx.bezierCurveTo(x + r * 0.7, y - r * 1.3, x + r * 1.6, y - r * 0.2, x, y + r * 0.9);
  ctx.closePath();
}
function glint(ctx: C2, x: number, y: number, r: number, a: number) {
  if (a <= 0.02) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, a);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
  ctx.restore();
}
interface Mat { base: string; light: string; dark: string; line: string; glow: string }
export const PAL: Mat[] = [
  { base: '#ff4f63', light: '#ffc2c9', dark: '#c41f3a', line: '#7e0f22', glow: '#ff8a98' },
  { base: '#3f8dff', light: '#c4ddff', dark: '#1b55c9', line: '#0d317a', glow: '#8ab9ff' },
  { base: '#ffc933', light: '#fff3b8', dark: '#de9306', line: '#7d5200', glow: '#ffe07a' },
  { base: '#35c873', light: '#c6f6d8', dark: '#169449', line: '#0a5229', glow: '#84e6ac' },
  { base: '#ad66ff', light: '#e9d2ff', dark: '#7433d6', line: '#3f1585', glow: '#cfa3ff' },
];
const RAINBOW = ['#ff4f63', '#ff9a3a', '#ffc933', '#35c873', '#3f8dff', '#ad66ff'];
/** 화면 전용 기억 (시뮬레이션과 무관) */
interface Vis { ev: number; prevN: number }
const VISM = new WeakMap<object, Vis>();
const visOf = (s: BeadState): Vis => {
  let v = VISM.get(s);
  if (!v) VISM.set(s, (v = { ev: -1, prevN: 0 }));
  return v;
};

function drawAll(ctx: C2, s: BeadState, w: number, h: number, th: Theme) {
  void th;
  const fx = juice(s), vis = visOf(s), R = (v: number) => v * w, t = s.t;
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  // ── 사건 → 연출 ──
  for (const e of s.events) {
    if (e.t <= vis.ev) continue;
    const x = R(e.x), y = R(e.y), r = R(e.r || 0.045);
    switch (e.k) {
      case 'link':
        fx.ring(x, y, '#ffffff', r * 1.5, 3);
        fx.burst(x, y, '#ffffff', 3, 1.6, 1.6);
        if (e.n >= 3) fx.burst(x, y, PAL[e.c]?.glow ?? '#ffffff', 4, 2, 2);
        break;
      case 'unlink':
        fx.ring(x, y, 'rgba(255,255,255,.6)', r * 1.1, 2);
        break;
      case 'fireReady':
        fx.pop(x, y - r * 1.6, '폭죽 준비!', '#ffe27a', Math.max(14, R(0.045)));
        fx.burst(x, y, '#ffd23a', 10, 3, 2.2);
        break;
      case 'release':
        fx.kick(2 + Math.min(4, e.n * 0.3));
        break;
      case 'pop':
      case 'bpop': {
        const m = PAL[e.c] ?? null, k = e.n;
        if (e.kind === K_RAIN) for (const c of RAINBOW) fx.burst(x, y, c, 3, 3.6, 2.6);
        else if (e.kind === K_ICE) (fx.burst(x, y, '#e8f8ff', 10, 3.6, 2.8), fx.burst(x, y, m?.base ?? '#fff', 6, 3, 2.6));
        else (fx.burst(x, y, m?.base ?? '#fff', 14, 4.6, 4.2), fx.burst(x, y, m?.light ?? '#fff', 6, 3, 3), fx.burst(x, y, m?.dark ?? '#fff', 4, 3.6, 3.4));
        fx.burst(x, y, '#ffffff', 6, 5.2, 1.8);
        fx.ring(x, y, m?.glow ?? '#ffffff', r * (1.8 + Math.min(1.2, k * 0.1)), 4);
        if (e.k === 'pop') fx.pop(x, y - r * 0.5, k >= 6 ? '팡!!' : '팡!', '#ffffff', Math.max(14, R(0.04 + Math.min(0.03, k * 0.004))));
        fx.kick(e.k === 'bpop' ? 3 : 1.6 + Math.min(6, k * 0.55));
        break;
      }
      case 'smash':
        fx.burst(x, y, PAL[e.c]?.base ?? '#dfe8f0', 14, 4.6, 3.2);
        fx.burst(x, y, '#eef4ff', 8, 3.4, 2);
        fx.pop(x + R(0.03), y, '와장창!', '#ffffff', Math.max(14, R(0.042)));
        fx.kick(9);
        break;
      case 'thud':
        fx.ring(x, y + r * 0.8, '#cfd6de', r * 2.6, 5);
        fx.pop(x - R(0.04), y - r * 1.2, '쿵!', '#e9eef4', Math.max(16, R(0.06)));
        fx.burst(x, y + r, 'rgba(210,200,190,.9)', 8, 2.4, 3);
        break;
      case 'drop':
        fx.pop(x, y - r * 1.4, '덜컹', '#e9eef4', Math.max(13, R(0.038)));
        break;
      case 'clunk':
        fx.kick(3);
        break;
      case 'melt':
        fx.burst(x, y, '#dff6ff', 10, 3.2, 2.4);
        fx.burst(x, y, '#9fdcff', 6, 2.4, 2);
        fx.ring(x, y, '#bfefff', r * 2, 3);
        fx.pop(x, y - r, '쨍!', '#e8fbff', Math.max(14, R(0.042)));
        break;
      case 'blast':
        fx.ring(x, y, '#fff3a0', R(FR * 1.4), 9);
        fx.ring(x, y, '#ff8a3a', R(FR * 2.1), 6);
        for (const c of RAINBOW) fx.burst(x, y, c, 8, 7.5, 3.2);
        fx.burst(x, y, '#ffffff', 16, 9, 2.2);
        fx.blink('#fff3c8', 0.45);
        fx.kick(15);
        fx.pop(x, y - R(0.05), '펑!!', '#fff1a0', Math.max(24, R(0.1)));
        break;
      case 'fuse':
        fx.burst(x, y, '#ffd23a', 18, 4, 2.6);
        fx.ring(x, y, '#ffe27a', r * 2.6, 5);
        fx.pop(x, y - r * 1.5, '폭죽 구슬!', '#ffe27a', Math.max(16, R(0.05)));
        break;
      case 'deliver':
        fx.burst(x, R(1.25), '#ffd23a', 26, 5.5, 3.2);
        fx.burst(R(XC), R(1.31), '#ffd23a', 14, 4, 2.6);
        fx.burst(x, R(1.25), '#ffffff', 12, 4, 2);
        fx.ring(x, R(1.24), '#fff0a0', R(0.2), 7);
        fx.blink('#fff4c0', 0.35);
        fx.kick(8);
        fx.pop(x, R(1.16), '쏙!', '#fff1a0', Math.max(20, R(0.075)));
        break;
      case 'tong':
        fx.burst(x, y + r * 0.9, 'rgba(255,255,255,.9)', 3, 1.4, 1.6);
        if (e.uid % 3 === 0 && e.n >= 8) fx.pop(x, y - r * 1.1, '통', '#ffffff', 13);
        break;
      case 'clear':
        for (const c of RAINBOW) fx.burst(R(XC), R(0.7), c, 9, 7, 3.4);
        fx.blink('#fff6d0', 0.4);
        fx.kick(8);
        break;
      case 'fail':
        fx.kick(6);
        break;
      case 'fizzle':
        fx.pop(clamp(x, R(0.2), R(0.66)), y - R(0.05), e.text ?? '', '#fff3e0', Math.max(14, R(0.042)));
        break;
      case 'warn':
        fx.pop(clamp(x, R(0.25), R(0.62)), y - R(0.11), e.text ?? '', '#e8f6ff', Math.max(13, R(0.036)));
        break;
    }
  }
  vis.ev = t;

  ctx.save();
  fx.begin(ctx);
  drawRoom(ctx, s, w, h);
  drawTable(ctx, s, w);
  drawStand(ctx, s, w);
  drawJarBack(ctx, s, w);
  drawTube(ctx, s, w, font);
  drawGhosts(ctx, s, w);
  drawBeads(ctx, s, w);
  drawChain(ctx, s, w, font);
  drawJarFront(ctx, s, w);
  drawCat(ctx, s, w);
  drawSpot(ctx, s, w, font);
  drawDemo(ctx, s, w, font);
  drawSay(ctx, s, w, font);
  drawBig(ctx, s, w, font);
  ctx.restore();
  drawTop(ctx, s, w, font);
  drawGoal(ctx, s, w, font);
  drawBottom(ctx, s, w, h, font);
  drawBanner(ctx, s, w, font, fx);
}

// ── 방: 따뜻한 벽 · 창 · 햇살 ──
function drawRoom(ctx: C2, s: BeadState, w: number, h: number) {
  const R = (v: number) => v * w, t = s.t;
  ctx.fillStyle = lin(ctx, 0, R(0.16), 0, R(1.32), [0, '#fff3dc'], [1, '#ffdcb0']);
  ctx.fillRect(0, 0, w, h);
  // 벽지 줄무늬 · 작은 꽃점
  ctx.fillStyle = 'rgba(255,255,255,.28)';
  for (let x = 0; x < 1; x += 0.11) ctx.fillRect(R(x), R(0.16), R(0.045), R(1.16));
  ctx.fillStyle = 'rgba(232,150,110,.18)';
  for (let k = 0; k < 40; k++) {
    const x = (k % 8) * 0.13 + ((k >> 3) % 2) * 0.065 + 0.03, y = 0.2 + Math.floor(k / 8) * 0.22;
    ell(ctx, R(x), R(y), R(0.008), R(0.008));
    ctx.fill();
  }
  // 창 (왼쪽 위)
  const wx = R(0.02), wy = R(0.2), ww = R(0.5), wh = R(0.36);
  ctx.fillStyle = 'rgba(150,90,50,.18)';
  rr(ctx, wx + R(0.012), wy + R(0.014), ww, wh, R(0.02));
  ctx.fill();
  ctx.fillStyle = '#fffaf0';
  rr(ctx, wx, wy, ww, wh, R(0.02));
  ctx.fill();
  const gx = wx + R(0.022), gy = wy + R(0.022), gw = ww - R(0.044), gh = wh - R(0.044);
  ctx.save();
  rr(ctx, gx, gy, gw, gh, R(0.01));
  ctx.clip();
  ctx.fillStyle = lin(ctx, 0, gy, 0, gy + gh, [0, '#8fd3ff'], [0.7, '#cdeeff'], [1, '#eaf8ff']);
  ctx.fillRect(gx, gy, gw, gh);
  ctx.fillStyle = radg(ctx, gx + R(0.08), gy + R(0.07), 0, gx + R(0.08), gy + R(0.07), R(0.2), [0, 'rgba(255,255,230,1)'], [0.25, 'rgba(255,248,200,.8)'], [1, 'rgba(255,248,200,0)']);
  ctx.fillRect(gx, gy, gw, gh);
  // 구름
  const cx = gx + ((t * 0.12 + R(0.25)) % (gw + R(0.3))) - R(0.15);
  ctx.fillStyle = 'rgba(255,255,255,.95)';
  for (const [dx, dy, rr0] of [[0, 0, 0.04], [0.04, -0.015, 0.035], [0.075, 0.004, 0.03], [-0.035, 0.008, 0.027]]) (ell(ctx, cx + R(dx), gy + R(0.16) + R(dy), R(rr0), R(rr0 * 0.75)), ctx.fill());
  // 먼 언덕 · 나무
  ctx.fillStyle = '#9fdc86';
  ctx.beginPath();
  ctx.moveTo(gx, gy + gh);
  ctx.quadraticCurveTo(gx + gw * 0.3, gy + gh - R(0.1), gx + gw * 0.6, gy + gh - R(0.05));
  ctx.quadraticCurveTo(gx + gw * 0.85, gy + gh - R(0.02), gx + gw, gy + gh - R(0.07));
  ctx.lineTo(gx + gw, gy + gh);
  ctx.fill();
  ctx.fillStyle = '#7cc66a';
  ell(ctx, gx + gw * 0.78, gy + gh - R(0.085), R(0.035), R(0.045));
  ctx.fill();
  ctx.restore();
  // 창살
  ctx.fillStyle = '#fffaf0';
  ctx.fillRect(gx + gw / 2 - R(0.008), gy, R(0.016), gh);
  ctx.fillRect(gx, gy + gh * 0.48, gw, R(0.014));
  ctx.strokeStyle = 'rgba(160,110,70,.35)';
  ctx.lineWidth = 1.5;
  rr(ctx, wx, wy, ww, wh, R(0.02));
  ctx.stroke();
  // 창턱
  ctx.fillStyle = '#f6e6cf';
  rr(ctx, wx - R(0.015), wy + wh - R(0.008), ww + R(0.03), R(0.03), R(0.01));
  ctx.fill();
  // 오른쪽 벽 선반의 작은 화분
  const sx = R(0.84), sy = R(0.62);
  ctx.fillStyle = 'rgba(140,80,40,.18)';
  ctx.fillRect(sx - R(0.09), sy + R(0.012), R(0.2), R(0.012));
  ctx.fillStyle = '#c98a55';
  rr(ctx, sx - R(0.1), sy - R(0.006), R(0.22), R(0.02), R(0.006));
  ctx.fill();
  ctx.fillStyle = '#e8805a';
  ctx.beginPath();
  ctx.moveTo(sx - R(0.035), sy - R(0.006));
  ctx.lineTo(sx + R(0.035), sy - R(0.006));
  ctx.lineTo(sx + R(0.028), sy - R(0.06));
  ctx.lineTo(sx - R(0.028), sy - R(0.06));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f39a72';
  ctx.fillRect(sx - R(0.032), sy - R(0.066), R(0.064), R(0.012));
  ctx.fillStyle = '#4fb96a';
  for (let k = 0; k < 5; k++) {
    const a = -Math.PI / 2 + (k - 2) * 0.45 + Math.sin(t * 0.02 + k) * 0.05;
    ell(ctx, sx + Math.cos(a) * R(0.04), sy - R(0.07) + Math.sin(a) * R(0.04), R(0.022), R(0.01), a);
    ctx.fill();
  }
  // 커튼 (왼쪽 끝) · 물고기 그림 액자 (오른쪽 벽)
  const sway = Math.sin(t * 0.03) * R(0.004);
  ctx.fillStyle = lin(ctx, 0, 0, R(0.09), 0, [0, '#ff9a8a'], [0.5, '#ffb9a8'], [1, '#f08a7a']);
  ctx.beginPath();
  ctx.moveTo(0, R(0.17));
  ctx.lineTo(R(0.085), R(0.17));
  ctx.quadraticCurveTo(R(0.06) + sway, R(0.4), R(0.035) + sway, R(0.6));
  ctx.quadraticCurveTo(R(0.06) + sway, R(0.66), R(0.03), R(0.7));
  ctx.lineTo(0, R(0.7));
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(190,80,70,.35)';
  ctx.lineWidth = 1.5;
  for (const k of [0.02, 0.045]) {
    ctx.beginPath();
    ctx.moveTo(R(k), R(0.18));
    ctx.quadraticCurveTo(R(k * 0.8) + sway, R(0.45), R(k * 0.6), R(0.68));
    ctx.stroke();
  }
  ctx.fillStyle = '#e9b04a';
  ell(ctx, R(0.045) + sway, R(0.6), R(0.022), R(0.014));
  ctx.fill();
  ctx.fillStyle = '#c98a55';
  rr(ctx, 0, R(0.162), R(0.11), R(0.014), R(0.007));
  ctx.fill();
  const fx0 = R(0.83), fy0 = R(0.36), fw = R(0.15), fh = R(0.12);
  ctx.fillStyle = 'rgba(140,80,40,.2)';
  rr(ctx, fx0 + R(0.008), fy0 + R(0.01), fw, fh, R(0.01));
  ctx.fill();
  ctx.fillStyle = '#d9a066';
  rr(ctx, fx0, fy0, fw, fh, R(0.01));
  ctx.fill();
  ctx.fillStyle = '#e8f6ff';
  rr(ctx, fx0 + R(0.012), fy0 + R(0.012), fw - R(0.024), fh - R(0.024), R(0.006));
  ctx.fill();
  const fcx = fx0 + fw / 2, fcy = fy0 + fh / 2, wig = Math.sin(t * 0.08) * 0.15;
  ctx.fillStyle = '#5ab0f0';
  ell(ctx, fcx - R(0.005), fcy, R(0.04), R(0.024));
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(fcx + R(0.03), fcy);
  ctx.lineTo(fcx + R(0.058), fcy - R(0.02) + wig * R(0.02));
  ctx.lineTo(fcx + R(0.058), fcy + R(0.02) + wig * R(0.02));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ell(ctx, fcx - R(0.028), fcy - R(0.006), R(0.008), R(0.008));
  ctx.fill();
  ctx.fillStyle = '#1a2a3a';
  ell(ctx, fcx - R(0.029), fcy - R(0.006), R(0.004), R(0.004));
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,200,255,.8)';
  ctx.lineWidth = 1.2;
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    ctx.arc(fcx - R(0.06), fcy - R(0.025) - k * R(0.016), R(0.005 + k * 0.002), 0, TAU);
    ctx.stroke();
  }
  // 햇살 (창에서 탁자 쪽으로)
  ctx.save();
  ctx.globalAlpha = 0.16 + 0.03 * Math.sin(t * 0.02);
  ctx.fillStyle = lin(ctx, R(0.1), R(0.3), R(0.7), R(1.3), [0, 'rgba(255,250,220,1)'], [1, 'rgba(255,250,220,0)']);
  ctx.beginPath();
  ctx.moveTo(R(0.06), R(0.25));
  ctx.lineTo(R(0.46), R(0.25));
  ctx.lineTo(R(1.0), R(1.3));
  ctx.lineTo(R(0.42), R(1.3));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

const TABLE_Y = 1.312;
function drawTable(ctx: C2, s: BeadState, w: number) {
  const R = (v: number) => v * w, W = s.W;
  ctx.fillStyle = lin(ctx, 0, R(TABLE_Y), 0, R(1.372), [0, '#f0b77c'], [1, '#d99559']);
  ctx.fillRect(0, R(TABLE_Y), w, R(1.372 - TABLE_Y));
  ctx.strokeStyle = 'rgba(150,80,30,.18)';
  ctx.lineWidth = 1;
  for (let k = 0; k < 5; k++) {
    const y = R(TABLE_Y + 0.01 + k * 0.012);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(R(0.3), y + R(0.004) * Math.sin(k), R(0.6), y - R(0.004), w, y + R(0.002) * k);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,240,210,.6)';
  ctx.fillRect(0, R(TABLE_Y), w, 1.5);
  ctx.fillStyle = lin(ctx, 0, R(1.372), 0, R(1.39), [0, '#b36e3a'], [1, '#8a4f26']);
  ctx.fillRect(0, R(1.372), w, R(0.018));
  // 병 그림자 · 구슬 빛 번짐
  ctx.fillStyle = 'rgba(120,60,20,.22)';
  ell(ctx, R(XC + 0.06), R(1.335), R(0.42), R(0.03));
  ctx.fill();
  const tally = [0, 0, 0, 0, 0];
  for (let i = 0; i < W.n; i++) if (W.alive[i] && W.col[i] >= 0 && W.y[i] > 0.9) tally[W.col[i]] += W.x[i] < XC ? 1 : 1.05;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let c = 0; c < 5; c++) {
    if (!tally[c]) continue;
    const a = Math.min(0.22, tally[c] * 0.02);
    ctx.fillStyle = radg(ctx, R(XC + 0.12 + (c - 2) * 0.09), R(1.34), 0, R(XC + 0.12 + (c - 2) * 0.09), R(1.34), R(0.1), [0, PAL[c].glow], [1, 'rgba(0,0,0,0)']);
    ctx.globalAlpha = a;
    ell(ctx, R(XC + 0.12 + (c - 2) * 0.09), R(1.34), R(0.1), R(0.025));
    ctx.fill();
  }
  ctx.restore();
  // 탁자에 굴러 나온 구슬 몇 개 (장식)
  const loose: [number, number, number][] = [[0.79, 1.338, 2], [0.045, 1.342, 4], [0.825, 1.352, 1]];
  for (const [lx, ly, c] of loose) {
    ctx.fillStyle = 'rgba(110,50,15,.25)';
    ell(ctx, R(lx + 0.006), R(ly + 0.014), R(0.02), R(0.006));
    ctx.fill();
    drawGlassBead(ctx, R(lx), R(ly), R(0.018), c, lx * 100, s.t, 1);
  }
}
/** 병 받침 (다리 둘) · 별 구멍 아래 접시 */
function drawStand(ctx: C2, s: BeadState, w: number) {
  const R = (v: number) => v * w, d = STAGES[s.stage], W = s.W;
  const x0 = R(XL - 0.035), x1 = R(XR + 0.035), y0 = R(1.268), y1 = R(1.29);
  ctx.fillStyle = '#b8743f';
  for (const lx of [XL + 0.02, XR - 0.06]) (rr(ctx, R(lx), y1 - 2, R(0.04), R(TABLE_Y + 0.02) - y1, R(0.008)), ctx.fill());
  ctx.fillStyle = lin(ctx, 0, y0, 0, y1, [0, '#e2a066'], [1, '#b8743f']);
  rr(ctx, x0, y0, x1 - x0, y1 - y0, R(0.01));
  ctx.fill();
  ctx.fillStyle = 'rgba(255,230,190,.5)';
  ctx.fillRect(x0 + 3, y0 + 1, x1 - x0 - 6, 1.5);
  if (!d.star) return;
  // 접시
  const cx = R(XC), cy = R(TABLE_Y + 0.012);
  ctx.fillStyle = 'rgba(90,40,10,.25)';
  ell(ctx, cx, cy + R(0.008), R(0.1), R(0.016));
  ctx.fill();
  ctx.fillStyle = lin(ctx, 0, cy - R(0.02), 0, cy + R(0.01), [0, '#ffffff'], [1, '#d7e6f2']);
  ctx.beginPath();
  ctx.ellipse(cx, cy - R(0.012), R(0.095), R(0.018), 0, 0, Math.PI);
  ctx.lineTo(cx - R(0.07), cy + R(0.004));
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#5a8ac0';
  ctx.lineWidth = 2;
  ell(ctx, cx, cy - R(0.012), R(0.095), R(0.018));
  ctx.stroke();
  // 받은 별 구슬
  for (let k = 0; k < W.delivered; k++) drawStarBead(ctx, cx + R((k - (W.delivered - 1) / 2) * 0.06), cy - R(0.02), R(0.026), s.t, k);
}

// ── 유리병 ──
function jarPath(ctx: C2, w: number, grow: number, top: number) {
  const R = (v: number) => v * w, g = grow;
  ctx.beginPath();
  ctx.moveTo(R(XL - g), R(top));
  ctx.lineTo(R(XL - g), R(SLANT_Y - 0.01));
  ctx.quadraticCurveTo(R(XL - g), R(SLANT_Y + 0.05 + g), R(XL + 0.07), R(SLANT_Y + 0.045 + g));
  ctx.lineTo(R(P3[0]), R(HOLE_Y + g));
  ctx.lineTo(R(P4[0]), R(HOLE_Y + g));
  ctx.lineTo(R(XR - 0.07), R(SLANT_Y + 0.045 + g));
  ctx.quadraticCurveTo(R(XR + g), R(SLANT_Y + 0.05 + g), R(XR + g), R(SLANT_Y - 0.01));
  ctx.lineTo(R(XR + g), R(top));
}
function drawJarBack(ctx: C2, s: BeadState, w: number) {
  const R = (v: number) => v * w, d = STAGES[s.stage];
  // 유리 두께(바깥) 그림자 + 안쪽 뒷벽
  jarPath(ctx, w, 0.024, RIM_Y);
  ctx.closePath();
  ctx.fillStyle = 'rgba(190,225,240,.35)';
  ctx.fill();
  jarPath(ctx, w, 0, RIM_Y);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, R(XL), 0, R(XR), 0, [0, 'rgba(200,236,255,.55)'], [0.5, 'rgba(235,250,255,.35)'], [1, 'rgba(190,226,248,.55)']);
  ctx.fill();
  // 뒤 테두리 (병 입구 뒤쪽 반)
  ctx.strokeStyle = 'rgba(120,170,200,.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(R(XC), R(RIM_Y), R((XR - XL) / 2 + 0.024), R(0.032), 0, Math.PI, TAU);
  ctx.stroke();
  // 바닥: 별 그물 (별 구슬만 쏙 빠진다)
  if (d.star) {
    ctx.strokeStyle = `rgba(255,200,60,${0.55 + 0.25 * Math.sin(s.t * 0.12)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = XL + 0.01; x <= XR - 0.01; x += 0.01) {
      const y = R(floorY(x) + 0.004);
      x === XL + 0.01 ? ctx.moveTo(R(x), y) : ctx.lineTo(R(x), y);
    }
    ctx.stroke();
    for (let x = XL + 0.045; x < XR - 0.03; x += 0.068) {
      const cx = R(x), cy = R(floorY(x) + 0.008);
      ctx.fillStyle = '#7a4a10';
      starPath(ctx, cx, cy, R(0.02), 0.5);
      ctx.fill();
      ctx.fillStyle = '#2a1a08';
      starPath(ctx, cx, cy, R(0.014), 0.5);
      ctx.fill();
      ctx.strokeStyle = '#ffd24a';
      ctx.lineWidth = 1.5;
      starPath(ctx, cx, cy, R(0.021), 0.5);
      ctx.stroke();
    }
  }
}
function drawJarFront(ctx: C2, s: BeadState, w: number) {
  const R = (v: number) => v * w, t = s.t;
  // 유리 테두리
  ctx.lineJoin = 'round';
  jarPath(ctx, w, 0.024, RIM_Y);
  ctx.strokeStyle = 'rgba(100,150,180,.55)';
  ctx.lineWidth = 2.2;
  ctx.stroke();
  jarPath(ctx, w, 0.004, RIM_Y);
  ctx.strokeStyle = 'rgba(255,255,255,.75)';
  ctx.lineWidth = 2;
  ctx.stroke();
  // 바닥 유리 두께
  ctx.fillStyle = 'rgba(200,235,250,.35)';
  ctx.beginPath();
  ctx.moveTo(R(XL + 0.07), R(SLANT_Y + 0.045));
  ctx.lineTo(R(P3[0]), R(HOLE_Y));
  ctx.lineTo(R(P4[0]), R(HOLE_Y));
  ctx.lineTo(R(XR - 0.07), R(SLANT_Y + 0.045));
  ctx.lineTo(R(XR - 0.07), R(SLANT_Y + 0.07));
  ctx.lineTo(R(P4[0]), R(HOLE_Y + 0.024));
  ctx.lineTo(R(P3[0]), R(HOLE_Y + 0.024));
  ctx.lineTo(R(XL + 0.07), R(SLANT_Y + 0.07));
  ctx.closePath();
  ctx.fill();
  // 세로 반사광
  ctx.fillStyle = lin(ctx, R(XL), 0, R(XL + 0.07), 0, [0, 'rgba(255,255,255,0)'], [0.4, 'rgba(255,255,255,.42)'], [1, 'rgba(255,255,255,0)']);
  ctx.fillRect(R(XL + 0.006), R(RIM_Y + 0.04), R(0.06), R(SLANT_Y - RIM_Y - 0.06));
  ctx.fillStyle = 'rgba(255,255,255,.3)';
  ctx.fillRect(R(XL + 0.085), R(RIM_Y + 0.07), R(0.012), R(0.32));
  ctx.fillStyle = lin(ctx, R(XR - 0.05), 0, R(XR), 0, [0, 'rgba(255,255,255,0)'], [1, 'rgba(255,255,255,.35)']);
  ctx.fillRect(R(XR - 0.05), R(RIM_Y + 0.05), R(0.046), R(SLANT_Y - RIM_Y - 0.1));
  // 반짝 지나가는 빛
  const sweep = ((t * 0.004) % 1.6) - 0.3;
  if (sweep > 0 && sweep < 1) glint(ctx, R(XL + 0.03), R(RIM_Y + 0.08 + sweep * 0.6), R(0.022), Math.sin(sweep * Math.PI));
  // 입구 앞 테두리 (두께)
  const rx = R((XR - XL) / 2 + 0.024), ry = R(0.032), cx = R(XC), cy = R(RIM_Y);
  ctx.strokeStyle = 'rgba(255,255,255,.9)';
  ctx.lineWidth = R(0.012);
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(110,160,190,.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(cx, cy + R(0.006), rx, ry, 0, 0.05, Math.PI - 0.05);
  ctx.stroke();
}
/** 위 대롱: 다음 구슬 여섯이 보이고, 터진 만큼 여기서 통통 떨어진다 */
function drawTube(ctx: C2, s: BeadState, w: number, font: (sz: number, wgt?: number) => void) {
  const R = (v: number) => v * w, W = s.W, y = R(0.235), x0 = R(XL - 0.03), x1 = R(XR + 0.03), hh = R(0.03);
  // 걸이
  ctx.strokeStyle = '#b8865a';
  ctx.lineWidth = 2;
  for (const x of [x0 + R(0.04), x1 - R(0.04)]) {
    ctx.beginPath();
    ctx.moveTo(x, R(0.17));
    ctx.lineTo(x, y - hh);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(215,240,255,.55)';
  rr(ctx, x0, y - hh, x1 - x0, hh * 2, hh);
  ctx.fill();
  for (let j = 0; j < 6; j++) {
    const sl = SLOT_ORDER[(W.spawnK + j) % 6], v = W.queue[(W.qi + j) % W.queue.length];
    // 구멍(주둥이)
    const sx = R(slotX(sl));
    ctx.fillStyle = 'rgba(160,200,225,.7)';
    rr(ctx, sx - R(0.018), y + hh - 2, R(0.036), R(0.014), R(0.005));
    ctx.fill();
    const rr0 = R(0.024) * (j === 0 ? 1.1 + 0.06 * Math.sin(s.t * 0.25) : 1);
    if (v === 9) drawRainBead(ctx, sx, y, rr0, s.t);
    else drawGlassBead(ctx, sx, y, rr0, v, 1000 + j, s.t, 1);
  }
  ctx.strokeStyle = 'rgba(255,255,255,.9)';
  ctx.lineWidth = 2;
  rr(ctx, x0, y - hh, x1 - x0, hh * 2, hh);
  ctx.stroke();
  // 나무 마개
  for (const [cx0, sd] of [[x0, 1], [x1, -1]] as const) {
    ctx.fillStyle = lin(ctx, 0, y - hh, 0, y + hh, [0, '#e6a868'], [1, '#b8743f']);
    rr(ctx, cx0 - (sd > 0 ? R(0.012) : R(0.018)), y - hh - R(0.004), R(0.03), hh * 2 + R(0.008), R(0.01));
    ctx.fill();
    ctx.strokeStyle = 'rgba(110,60,20,.5)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  rr(ctx, x0 + hh * 0.6, y - hh * 0.75, x1 - x0 - hh * 1.2, hh * 0.35, hh * 0.2);
  ctx.fill();
  font(0.034, 900);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(110,60,20,.75)';
  ctx.fillText('다음', x0 + R(0.05), R(0.185));
}

// ── 구슬 ──
function drawGlassBead(ctx: C2, x: number, y: number, r: number, c: number, seed: number, t: number, glow: number) {
  const m = PAL[c] ?? PAL[0];
  ctx.fillStyle = radg(ctx, x - r * 0.35, y - r * 0.42, r * 0.08, x, y, r * 1.08, [0, m.light], [0.42, m.base], [1, m.dark]);
  ell(ctx, x, y, r, r);
  ctx.fill();
  // 구슬 속 무늬 (고양이 눈)
  ctx.save();
  ell(ctx, x, y, r * 0.96, r * 0.96);
  ctx.clip();
  const a = hsh(seed * 1.7) * TAU;
  ctx.strokeStyle = m.light;
  ctx.globalAlpha = 0.42;
  ctx.lineWidth = r * 0.22;
  ctx.beginPath();
  ctx.ellipse(x + Math.cos(a) * r * 0.1, y + Math.sin(a) * r * 0.1, r * 0.62, r * 0.22, a, 0.2, Math.PI - 0.2);
  ctx.stroke();
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = m.glow;
  ctx.lineWidth = r * 0.12;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.8, 0.25 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = m.line;
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = Math.max(1, r * 0.06);
  ell(ctx, x, y, r, r);
  ctx.stroke();
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = '#ffffff';
  ell(ctx, x - r * 0.36, y - r * 0.42, r * 0.27, r * 0.15, -0.65);
  ctx.fill();
  ctx.globalAlpha = 0.7;
  ell(ctx, x + r * 0.3, y + r * 0.42, r * 0.09, r * 0.06, -0.6);
  ctx.fill();
  ctx.globalAlpha = 1;
  if (glow > 1.001) glint(ctx, x - r * 0.3, y - r * 0.38, r * 0.5 * (glow - 1) * 4, 0.9);
  void t;
}
function drawRainBead(ctx: C2, x: number, y: number, r: number, t: number) {
  ctx.save();
  ell(ctx, x, y, r, r);
  ctx.clip();
  const n = RAINBOW.length, rot = t * 0.02;
  for (let k = 0; k < n; k++) {
    ctx.fillStyle = RAINBOW[k];
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, r * 1.1, rot + (k * TAU) / n, rot + ((k + 1) * TAU) / n + 0.02);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = radg(ctx, x - r * 0.3, y - r * 0.35, 0, x, y, r, [0, 'rgba(255,255,255,.75)'], [0.55, 'rgba(255,255,255,.15)'], [1, 'rgba(60,20,80,.3)']);
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(1.5, r * 0.1);
  ell(ctx, x, y, r, r);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ell(ctx, x - r * 0.36, y - r * 0.42, r * 0.26, r * 0.14, -0.65);
  ctx.fill();
}
function drawStarBead(ctx: C2, x: number, y: number, r: number, t: number, seed: number) {
  ctx.fillStyle = radg(ctx, x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r * 1.05, [0, '#fffbd0'], [0.45, '#ffd23a'], [1, '#d88a06']);
  ell(ctx, x, y, r, r);
  ctx.fill();
  ctx.strokeStyle = '#8a5a04';
  ctx.lineWidth = Math.max(1.2, r * 0.08);
  ctx.stroke();
  ctx.fillStyle = '#fffbe6';
  starPath(ctx, x, y + r * 0.04, r * 0.62, 0.45, Math.sin(t * 0.05 + seed) * 0.15);
  ctx.fill();
  ctx.strokeStyle = '#e0a010';
  ctx.lineWidth = Math.max(1, r * 0.06);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ell(ctx, x - r * 0.38, y - r * 0.45, r * 0.22, r * 0.12, -0.65);
  ctx.fill();
  glint(ctx, x + r * 0.55, y - r * 0.6, r * 0.45, 0.5 + 0.5 * Math.sin(t * 0.13 + seed * 2));
}
function drawIronBead(ctx: C2, x: number, y: number, r: number, falling: boolean) {
  ctx.fillStyle = radg(ctx, x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r * 1.05, [0, '#ffffff'], [0.3, '#c9d2db'], [0.75, '#7f8a95'], [1, '#4c555e']);
  ell(ctx, x, y, r, r);
  ctx.fill();
  ctx.strokeStyle = '#2f353b';
  ctx.lineWidth = Math.max(1.4, r * 0.09);
  ctx.stroke();
  // 둘레 홈 · 무게 표시
  ctx.strokeStyle = 'rgba(40,46,52,.45)';
  ctx.lineWidth = Math.max(1, r * 0.07);
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.1, r * 0.92, r * 0.32, 0, 0.1, Math.PI - 0.1);
  ctx.stroke();
  ctx.fillStyle = 'rgba(40,46,52,.55)';
  ctx.font = `900 ${Math.max(9, r * 0.7)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('쿵', x, y - r * 0.05);
  ctx.fillStyle = '#ffffff';
  ell(ctx, x - r * 0.38, y - r * 0.45, r * 0.24, r * 0.12, -0.65);
  ctx.fill();
  if (falling) {
    ctx.strokeStyle = 'rgba(255,255,255,.7)';
    ctx.lineWidth = 2;
    for (const dx of [-0.5, 0, 0.5]) {
      ctx.beginPath();
      ctx.moveTo(x + dx * r, y - r * 1.2);
      ctx.lineTo(x + dx * r, y - r * 2);
      ctx.stroke();
    }
  }
}
function drawIceBead(ctx: C2, x: number, y: number, r: number, c: number, seed: number) {
  const m = PAL[c] ?? PAL[1];
  ctx.fillStyle = radg(ctx, x, y, 0, x, y, r * 0.6, [0, m.light], [1, m.base]);
  ell(ctx, x, y, r * 0.58, r * 0.58);
  ctx.fill();
  ctx.fillStyle = radg(ctx, x - r * 0.3, y - r * 0.35, r * 0.05, x, y, r, [0, 'rgba(255,255,255,.95)'], [0.55, 'rgba(225,246,255,.62)'], [1, 'rgba(160,215,245,.85)']);
  ell(ctx, x, y, r, r);
  ctx.fill();
  ctx.strokeStyle = '#7cc4ea';
  ctx.lineWidth = Math.max(1.4, r * 0.09);
  ctx.stroke();
  // 얼음 금
  ctx.strokeStyle = 'rgba(255,255,255,.95)';
  ctx.lineWidth = Math.max(1, r * 0.06);
  const a = hsh(seed) * TAU;
  ctx.beginPath();
  ctx.moveTo(x + Math.cos(a) * r * 0.85, y + Math.sin(a) * r * 0.85);
  ctx.lineTo(x + Math.cos(a + 0.5) * r * 0.25, y + Math.sin(a + 0.5) * r * 0.25);
  ctx.lineTo(x + Math.cos(a + 2.4) * r * 0.7, y + Math.sin(a + 2.4) * r * 0.7);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ell(ctx, x - r * 0.4, y - r * 0.45, r * 0.25, r * 0.13, -0.65);
  ctx.fill();
}
function drawFireBead(ctx: C2, x: number, y: number, r: number, c: number, seed: number, t: number) {
  const pulse = 0.5 + 0.5 * Math.sin(t * 0.25 + seed);
  ctx.fillStyle = radg(ctx, x, y, r * 0.6, x, y, r * 1.7, [0, `rgba(255,200,80,${0.35 + 0.25 * pulse})`], [1, 'rgba(255,160,40,0)']);
  ell(ctx, x, y, r * 1.7, r * 1.7);
  ctx.fill();
  drawGlassBead(ctx, x, y, r, c, seed, t, 1);
  // 폭죽 띠
  ctx.save();
  ell(ctx, x, y, r * 0.97, r * 0.97);
  ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,.85)';
  ctx.lineWidth = r * 0.16;
  for (const k of [-0.45, 0.1, 0.65]) {
    ctx.beginPath();
    ctx.moveTo(x - r, y + k * r - r * 0.5);
    ctx.lineTo(x + r, y + k * r + r * 0.2);
    ctx.stroke();
  }
  ctx.restore();
  // 심지 · 불꽃
  ctx.strokeStyle = '#6a4a2a';
  ctx.lineWidth = Math.max(1.5, r * 0.12);
  ctx.beginPath();
  ctx.moveTo(x + r * 0.2, y - r * 0.92);
  ctx.quadraticCurveTo(x + r * 0.5, y - r * 1.3, x + r * 0.35, y - r * 1.5);
  ctx.stroke();
  const fx0 = x + r * 0.35, fy0 = y - r * 1.55;
  ctx.fillStyle = '#ffe27a';
  starPath(ctx, fx0, fy0, r * (0.32 + 0.15 * pulse), 0.4, t * 0.3);
  ctx.fill();
  ctx.fillStyle = '#ff7a2a';
  ell(ctx, fx0, fy0, r * 0.12, r * 0.12);
  ctx.fill();
}
/** 방금 터진 구슬: 0.12초 동안 부풀며 하얗게 사라진다 */
function drawGhosts(ctx: C2, s: BeadState, w: number) {
  const R = (v: number) => v * w;
  for (const e of s.events) {
    if (e.k !== 'pop' && e.k !== 'bpop' && e.k !== 'smash') continue;
    const age = s.t - e.t;
    if (age > 8 || age < 0) continue;
    const u = age / 8, r = R(e.r) * (1 + u * 0.45);
    ctx.globalAlpha = 1 - u;
    ctx.fillStyle = e.c >= 0 ? PAL[e.c].glow : '#ffffff';
    ell(ctx, R(e.x), R(e.y), r, r);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ell(ctx, R(e.x), R(e.y), r * 0.7, r * 0.7);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}
function beadVisual(s: BeadState, i: number): { x: number; y: number; sx: number; sy: number } {
  const W = s.W, t = s.t;
  let x = W.x[i], y = W.y[i], sx = 1, sy = 1;
  // 판이 열릴 때 더미가 반짝이며 출렁
  const age = t - s.playT;
  if (s.phase === 'play' && W.strokes === 0 && age < 100) y += Math.sin(age * 0.22 - W.x[i] * 9) * 0.006 * (1 - age / 100);
  // 숨쉬기 (아주 살짝)
  const br = 1 + 0.012 * Math.sin(t * 0.06 + W.uid[i] * 1.3);
  sx *= br;
  sy *= br;
  // 통 떨어져 눌림
  const ha = t - W.hit[i] - 0;
  if (ha >= 0 && ha < 9 && W.hit[i] > -999) {
    const k = clamp(W.hitV[i] / 0.012, 0, 1) * 0.22 * Math.sin((ha / 9) * Math.PI);
    sx *= 1 + k;
    sy *= 1 - k;
    y += W.r[i] * k;
  }
  void W;
  return { x, y, sx, sy };
}
function drawBeads(ctx: C2, s: BeadState, w: number) {
  const W = s.W, R = (v: number) => v * w, t = s.t;
  const inCh = new Set(s.chain);
  // 접촉 그림자 (더미가 입체로)
  ctx.fillStyle = 'rgba(70,40,30,.16)';
  for (let i = 0; i < W.n; i++) {
    if (!W.alive[i]) continue;
    const v = beadVisual(s, i);
    ell(ctx, R(v.x + W.r[i] * 0.14), R(v.y + W.r[i] * 0.2), R(W.r[i]), R(W.r[i]));
    ctx.fill();
  }
  // 와르르 떨어지는 구슬 꼬리
  for (let i = 0; i < W.n; i++) {
    if (!W.alive[i] || W.asleep) continue;
    const vy = W.y[i] - W.py[i], vx = W.x[i] - W.px[i];
    if (vy < 0.0022) continue;
    const m = PAL[W.col[i]], k = Math.min(1, (vy - 0.0022) / 0.007);
    for (let q = 1; q <= 3; q++) {
      ctx.globalAlpha = 0.22 * k * (1 - q / 4);
      ctx.fillStyle = m ? m.glow : W.kind[i] === K_IRON ? '#c9d2db' : '#fff3b0';
      ell(ctx, R(W.x[i] - vx * q * 3), R(W.y[i] - vy * q * 3), R(W.r[i]) * (1 - q * 0.12), R(W.r[i]) * (1 - q * 0.12));
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  for (let i = 0; i < W.n; i++) {
    if (!W.alive[i]) continue;
    const v = beadVisual(s, i), x = R(v.x), y = R(v.y);
    let r = R(W.r[i]);
    const k = W.kind[i], waiting = W.popAt[i] >= 0;
    const linked = inCh.has(i);
    if (linked || waiting) {
      const lk = s.chain.indexOf(i), born = linked ? s.t - s.linkT : 99;
      r *= 1.1 + (lk === s.chain.length - 1 && born < 8 ? 0.12 * (1 - born / 8) : 0) + 0.025 * Math.sin(t * 0.4 + i);
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      ell(ctx, x, y, r * 1.22, r * 1.22);
      ctx.fill();
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(v.sx, v.sy);
    if (k === K_STAR) drawStarBead(ctx, 0, 0, r, t, W.uid[i]);
    else if (k === K_IRON) drawIronBead(ctx, 0, 0, r, !W.stat[i] && W.y[i] - W.py[i] > 0.004);
    else if (k === K_ICE) drawIceBead(ctx, 0, 0, r, W.col[i], W.uid[i]);
    else if (k === K_RAIN) drawRainBead(ctx, 0, 0, r, t);
    else if (k === K_FIRE) drawFireBead(ctx, 0, 0, r, W.col[i], W.uid[i], t);
    else {
      // 햇살이 쓸고 지나가는 반짝
      const sh = Math.pow(Math.max(0, Math.sin(t * 0.025 - W.x[i] * 5 - W.y[i] * 3)), 14);
      drawGlassBead(ctx, 0, 0, r, W.col[i], W.uid[i], t, 1 + sh * 0.25);
    }
    ctx.restore();
  }
}
/** 이음: 굵은 빛 줄 + 손가락까지 · 손가락 옆 개수 방울 · 녹을 얼음/폭죽 미리 보기 */
function drawChain(ctx: C2, s: BeadState, w: number, font: (sz: number, wgt?: number) => void) {
  const W = s.W, R = (v: number) => v * w, t = s.t, d = STAGES[s.stage];
  let pts: number[] = [];
  let live = false;
  if (s.phase === 'play' && s.chain.length) (pts = s.chain.slice()), (live = s.stroking);
  else if (s.phase === 'resolve') {
    for (let i = 0; i < W.n; i++) if (W.alive[i] && W.popAt[i] >= 0 && W.seq[i] > 0 && !W.blast[i]) pts.push(i);
    pts.sort((a, b) => W.seq[a] - W.seq[b]);
  }
  if (!pts.length) return;
  const cc = chainState(W, pts).cc, m = PAL[cc] ?? PAL[0];
  const xy = pts.map((i) => [R(W.x[i]), R(W.y[i])]);
  if (live) xy.push([R(s.ax), R(s.ay)]);
  const stroke = (col: string, lw: number, dy = 0) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    xy.forEach(([x, y], k) => (k ? ctx.lineTo(x, y + dy) : ctx.moveTo(x, y + dy)));
    ctx.stroke();
  };
  if (xy.length >= 2) {
    stroke('rgba(60,30,20,.25)', R(0.034), R(0.006));
    stroke(m.line, R(0.032));
    stroke(m.base, R(0.022));
    stroke('rgba(255,255,255,.7)', R(0.007), -R(0.004));
    // 흐르는 빛 점
    ctx.fillStyle = '#ffffff';
    for (let k = 0; k + 1 < xy.length; k++) {
      const u = (t * 0.08 + k * 0.37) % 1, [x0, y0] = xy[k], [x1, y1] = xy[k + 1];
      ell(ctx, x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, R(0.007), R(0.007));
      ctx.fill();
    }
  }
  if (s.phase !== 'play') return;
  const L = s.chain.length;
  // 녹을 얼음 · 떨어질 쇠구슬 미리 보기
  for (let j = 0; j < W.n; j++) {
    if (!W.alive[j] || (W.kind[j] !== K_ICE && W.kind[j] !== K_IRON)) continue;
    let near = false;
    for (const b of s.chain) if (touching(W, b, j) && (W.kind[j] === K_ICE || W.y[b] > W.y[j])) near = true;
    if (!near || L < 3) continue;
    ctx.strokeStyle = W.kind[j] === K_ICE ? `rgba(130,220,255,${0.6 + 0.4 * Math.sin(t * 0.3)})` : `rgba(255,170,80,${0.6 + 0.4 * Math.sin(t * 0.3)})`;
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 4]);
    ell(ctx, R(W.x[j]), R(W.y[j]), R(W.r[j] + 0.012), R(W.r[j] + 0.012));
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // 폭죽이 될 끝 구슬
  if (d.fire && L >= FIRE_N) {
    const b = s.chain[L - 1];
    glint(ctx, R(W.x[b]), R(W.y[b] - W.r[b] * 1.4), R(0.03), 0.6 + 0.4 * Math.sin(t * 0.4));
    ctx.strokeStyle = `rgba(255,210,60,${0.7 + 0.3 * Math.sin(t * 0.4)})`;
    ctx.lineWidth = 3;
    ell(ctx, R(W.x[b]), R(W.y[b]), R(W.r[b] + 0.02), R(W.r[b] + 0.02));
    ctx.stroke();
  }
  // 개수 방울 (손가락 위)
  if (!live) return;
  const bx = clamp(R(s.ax) + R(0.07), R(0.06), w - R(0.06)), by = clamp(R(s.ay) - R(0.08), R(0.2), R(1.3));
  const ok = L >= 3, fireOk = d.fire && L >= FIRE_N, rb = R(0.042) * (1 + (t - s.linkT < 6 ? 0.25 * (1 - (t - s.linkT) / 6) : 0));
  ctx.fillStyle = 'rgba(60,30,20,.3)';
  ell(ctx, bx + 2, by + 3, rb, rb);
  ctx.fill();
  ctx.fillStyle = fireOk ? lin(ctx, bx, by - rb, bx, by + rb, [0, '#fff3a0'], [1, '#ffb020']) : ok ? m.base : '#fff8ee';
  ell(ctx, bx, by, rb, rb);
  ctx.fill();
  ctx.strokeStyle = fireOk ? '#a8600a' : ok ? m.line : '#b89a7a';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  font(0.05, 900);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = fireOk ? '#7a3a00' : ok ? '#ffffff' : '#9a7a5a';
  ctx.fillText(String(L), bx, by + 1);
  if (fireOk || (d.fire && L >= 5)) {
    font(0.034, 900);
    ctx.fillStyle = fireOk ? '#ffe27a' : 'rgba(255,255,255,.9)';
    ctx.strokeStyle = 'rgba(90,40,10,.6)';
    ctx.lineWidth = 3;
    const tx = fireOk ? '폭죽!' : `${FIRE_N - L}개 더 → 폭죽`;
    ctx.strokeText(tx, bx, by - rb - R(0.022));
    ctx.fillText(tx, bx, by - rb - R(0.022));
  }
}

// ── 고양이 (구경꾼) ──
function drawCat(ctx: C2, s: BeadState, w: number) {
  const R = (v: number) => v * w, t = s.t, u = R(0.1), age = t - s.faceT;
  const face = s.face === 'idle' || age < (s.face === 'happy' || s.face === 'dizzy' ? 300 : 90) ? s.face : 'idle';
  const bx = R(0.885), by = R(TABLE_Y + 0.02);
  const jump = face === 'scared' && age < 30 ? Math.sin((age / 30) * Math.PI) * u * 0.5 : face === 'happy' && age < 120 ? Math.abs(Math.sin(age * 0.18)) * u * 0.18 : 0;
  // 눈이 볼 곳: 손가락 · 이음 끝 · 병 가운데
  let lx = R(XC), ly = R(0.85);
  if (s.down) (lx = R(s.ax)), (ly = R(s.ay));
  else if (s.chain.length) (lx = R(s.W.x[s.chain[s.chain.length - 1]])), (ly = R(s.W.y[s.chain[s.chain.length - 1]]));
  ctx.save();
  ctx.translate(bx, by - jump);
  // 그림자
  ctx.fillStyle = 'rgba(110,50,15,.25)';
  ell(ctx, 0, jump + u * 0.05, u * 0.95, u * 0.16);
  ctx.fill();
  const O = '#ffab52', O2 = '#ec8a34', CREAM = '#fff1dc', LINE = '#8a4a1a';
  // 꼬리 (살랑)
  const puff = face === 'scared' && age < 60 ? 1.8 : 1;
  const sw = Math.sin(t * 0.06) * 0.35 + (face === 'happy' ? Math.sin(t * 0.3) * 0.4 : 0);
  ctx.strokeStyle = LINE;
  ctx.lineCap = 'round';
  ctx.lineWidth = u * 0.3 * puff + 3;
  const tail = () => {
    ctx.beginPath();
    ctx.moveTo(u * 0.55, -u * 0.25);
    ctx.bezierCurveTo(u * 1.1, -u * 0.3, u * (0.9 + sw * 0.3), -u * 1.2, u * (0.55 + sw * 0.5), -u * 1.55);
    ctx.stroke();
  };
  tail();
  ctx.strokeStyle = O;
  ctx.lineWidth = u * 0.3 * puff;
  tail();
  // 몸통
  ctx.fillStyle = O;
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-u * 0.75, 0);
  ctx.bezierCurveTo(-u * 0.85, -u * 0.9, -u * 0.55, -u * 1.55, -u * 0.05, -u * 1.55);
  ctx.bezierCurveTo(u * 0.55, -u * 1.55, u * 0.8, -u * 0.8, u * 0.72, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 줄무늬
  ctx.strokeStyle = O2;
  ctx.lineWidth = u * 0.1;
  for (const k of [0, 1, 2]) {
    ctx.beginPath();
    ctx.moveTo(u * (0.25 + k * 0.12), -u * (1.25 - k * 0.32));
    ctx.quadraticCurveTo(u * (0.55 + k * 0.05), -u * (1.1 - k * 0.32), u * (0.66 + k * 0.03), -u * (0.95 - k * 0.32));
    ctx.stroke();
  }
  // 배
  ctx.fillStyle = CREAM;
  ell(ctx, -u * 0.25, -u * 0.62, u * 0.38, u * 0.55, 0.1);
  ctx.fill();
  // 앞발 (watch: 한쪽 발을 병에 대고)
  const paw = face === 'watch' || face === 'wow' ? 1 : 0, happyPaw = face === 'happy' ? Math.sin(t * 0.25) : 0;
  ctx.fillStyle = CREAM;
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  ell(ctx, -u * 0.05, -u * 0.08, u * 0.22, u * 0.13);
  ctx.fill();
  ctx.stroke();
  if (paw) {
    ctx.save();
    ctx.translate(-u * 0.5, -u * 0.55);
    ctx.rotate(-1.1);
    ctx.fillStyle = O;
    rr(ctx, -u * 0.12, -u * 0.62, u * 0.24, u * 0.66, u * 0.12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = CREAM;
    ell(ctx, 0, -u * 0.6, u * 0.15, u * 0.12);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  } else if (face === 'happy') {
    ctx.save();
    ctx.translate(-u * 0.45, -u * 0.7);
    ctx.rotate(-2.2 + happyPaw * 0.4);
    ctx.fillStyle = O;
    rr(ctx, -u * 0.11, -u * 0.6, u * 0.22, u * 0.62, u * 0.11);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  } else {
    ell(ctx, -u * 0.48, -u * 0.08, u * 0.2, u * 0.12);
    ctx.fillStyle = CREAM;
    ctx.fill();
    ctx.stroke();
  }
  // 머리
  const hx = -u * 0.25 + (face === 'watch' ? -u * 0.06 : 0), hy = -u * 2.0;
  const tilt = face === 'dizzy' ? Math.sin(t * 0.15) * 0.2 : face === 'watch' ? -0.08 : Math.sin(t * 0.02) * 0.04;
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(tilt);
  const ear = (sd: number) => {
    const up = face === 'wow' || face === 'scared' ? -u * 0.12 : 0;
    ctx.fillStyle = O;
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(sd * u * 0.62, -u * 0.25);
    ctx.lineTo(sd * u * 0.55, -u * 0.95 + up);
    ctx.lineTo(sd * u * 0.12, -u * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffb3b8';
    ctx.beginPath();
    ctx.moveTo(sd * u * 0.52, -u * 0.38);
    ctx.lineTo(sd * u * 0.5, -u * 0.8 + up * 0.8);
    ctx.lineTo(sd * u * 0.24, -u * 0.58);
    ctx.closePath();
    ctx.fill();
  };
  ear(-1);
  ear(1);
  ctx.fillStyle = O;
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2.4;
  ell(ctx, 0, 0, u * 0.72, u * 0.62);
  ctx.fill();
  ctx.stroke();
  if (face === 'scared' && age < 60) {
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 2;
    for (let k = 0; k < 9; k++) {
      const a = -Math.PI * 0.95 + k * 0.22;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * u * 0.72, Math.sin(a) * u * 0.62);
      ctx.lineTo(Math.cos(a) * u * 0.9, Math.sin(a) * u * 0.8);
      ctx.stroke();
    }
  }
  // 이마 줄무늬
  ctx.strokeStyle = O2;
  ctx.lineWidth = u * 0.08;
  for (const k of [-1, 0, 1]) {
    ctx.beginPath();
    ctx.moveTo(k * u * 0.15, -u * 0.58);
    ctx.lineTo(k * u * 0.12, -u * 0.36);
    ctx.stroke();
  }
  // 주둥이
  ctx.fillStyle = CREAM;
  ell(ctx, -u * 0.12, u * 0.2, u * 0.4, u * 0.26);
  ctx.fill();
  // 볼터치
  ctx.fillStyle = 'rgba(255,120,120,.35)';
  ell(ctx, -u * 0.5, u * 0.1, u * 0.12, u * 0.07);
  ctx.fill();
  ell(ctx, u * 0.38, u * 0.1, u * 0.12, u * 0.07);
  ctx.fill();
  // 눈
  const ex = [-u * 0.36, u * 0.16], ey = -u * 0.08;
  const blink = face === 'idle' && t % 220 < 7;
  const big = face === 'wow' || face === 'scared' || face === 'watch';
  const look = Math.atan2(ly - (by + hy), lx - (bx + hx));
  for (const x of ex) {
    if (face === 'happy') {
      ctx.strokeStyle = '#3a2010';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(x, ey + u * 0.05, u * 0.12, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      continue;
    }
    if (face === 'dizzy') {
      ctx.strokeStyle = '#3a2010';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let a = 0; a < 10; a += 0.4) {
        const q = u * 0.015 * a;
        a ? ctx.lineTo(x + Math.cos(a + t * 0.2) * q, ey + Math.sin(a + t * 0.2) * q) : ctx.moveTo(x, ey);
      }
      ctx.stroke();
      continue;
    }
    if (blink) {
      ctx.strokeStyle = '#3a2010';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(x - u * 0.1, ey);
      ctx.lineTo(x + u * 0.1, ey);
      ctx.stroke();
      continue;
    }
    const er = u * (big ? 0.17 : 0.14);
    ctx.fillStyle = '#ffffff';
    ell(ctx, x, ey, er, er * 1.12);
    ctx.fill();
    ctx.strokeStyle = '#3a2010';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    const pr = er * (face === 'wow' ? 0.72 : 0.62);
    const px = x + Math.cos(look) * er * 0.35, py = ey + Math.sin(look) * er * 0.35;
    ctx.fillStyle = '#5ab04a';
    ell(ctx, px, py, pr, pr * 1.1);
    ctx.fill();
    ctx.fillStyle = '#1a1208';
    ell(ctx, px, py, pr * (face === 'wow' || face === 'scared' ? 0.75 : 0.42), pr * 0.95);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ell(ctx, px - pr * 0.35, py - pr * 0.4, pr * 0.3, pr * 0.3);
    ctx.fill();
    if (face === 'wow') glint(ctx, px + pr * 0.4, py + pr * 0.3, pr * 0.4, 0.9);
  }
  // 코 · 입
  ctx.fillStyle = '#ff8a9a';
  ctx.beginPath();
  ctx.moveTo(-u * 0.17, u * 0.1);
  ctx.lineTo(-u * 0.05, u * 0.1);
  ctx.lineTo(-u * 0.11, u * 0.17);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#3a2010';
  ctx.lineWidth = 1.8;
  if (face === 'wow' || face === 'scared') {
    ctx.fillStyle = '#7a2a2a';
    ell(ctx, -u * 0.11, u * 0.3, u * 0.08, u * 0.1);
    ctx.fill();
  } else if (face === 'happy') {
    ctx.fillStyle = '#c84a5a';
    ctx.beginPath();
    ctx.arc(-u * 0.11, u * 0.22, u * 0.11, 0, Math.PI);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(-u * 0.11, u * 0.17);
    ctx.quadraticCurveTo(-u * 0.17, u * 0.27, -u * 0.24, u * 0.22);
    ctx.moveTo(-u * 0.11, u * 0.17);
    ctx.quadraticCurveTo(-u * 0.05, u * 0.27, u * 0.02, u * 0.22);
    ctx.stroke();
  }
  // 수염
  ctx.strokeStyle = 'rgba(90,50,20,.7)';
  ctx.lineWidth = 1.2;
  for (const sd of [-1, 1])
    for (const k of [-1, 0, 1]) {
      ctx.beginPath();
      ctx.moveTo(-u * 0.11 + sd * u * 0.25, u * 0.2 + k * u * 0.05);
      ctx.lineTo(-u * 0.11 + sd * u * 0.62, u * 0.15 + k * u * 0.11);
      ctx.stroke();
    }
  ctx.restore();
  // 어질어질 별
  if (face === 'dizzy')
    for (let k = 0; k < 3; k++) {
      const a = t * 0.08 + (k * TAU) / 3;
      ctx.fillStyle = '#ffd23a';
      starPath(ctx, hx + Math.cos(a) * u * 0.6, hy - u * 0.75 + Math.sin(a) * u * 0.18, u * 0.12);
      ctx.fill();
    }
  ctx.restore();
}
function drawSay(ctx: C2, s: BeadState, w: number, font: (sz: number, wgt?: number) => void) {
  const age = s.t - s.sayT;
  if (age > 70 || !s.say) return;
  const R = (v: number) => v * w, x = R(0.86), y = R(1.0) - Math.min(1, age / 6) * R(0.02);
  ctx.save();
  ctx.globalAlpha = Math.min(1, (70 - age) / 12);
  font(0.04, 900);
  const tw = ctx.measureText(s.say).width + R(0.04);
  const bx = clamp(x, tw / 2 + 4, w - tw / 2 - 4);
  ctx.fillStyle = '#ffffff';
  rr(ctx, bx - tw / 2, y - R(0.03), tw, R(0.06), R(0.03));
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(bx - R(0.02), y + R(0.026));
  ctx.lineTo(bx - R(0.035), y + R(0.055));
  ctx.lineTo(bx + R(0.005), y + R(0.026));
  ctx.fill();
  ctx.strokeStyle = '#d8884a';
  ctx.lineWidth = 2;
  rr(ctx, bx - tw / 2, y - R(0.03), tw, R(0.06), R(0.03));
  ctx.stroke();
  ctx.fillStyle = '#6a3410';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(s.say, bx, y + 1);
  ctx.restore();
}
function drawBig(ctx: C2, s: BeadState, w: number, font: (sz: number, wgt?: number) => void) {
  const age = s.t - s.bigT;
  if (age > 70 || !s.bigText) return;
  const R = (v: number) => v * w;
  const pop = age < 8 ? 0.4 + 1.0 * ease(age / 8) + 0.25 * Math.sin((age / 8) * Math.PI) : 1;
  ctx.save();
  ctx.globalAlpha = Math.min(1, (70 - age) / 14);
  ctx.translate(R(XC), R(0.355));
  ctx.rotate(-0.04);
  ctx.scale(pop, pop);
  font(0.068, 900);
  const tw = ctx.measureText(s.bigText).width;
  ctx.fillStyle = 'rgba(120,40,0,.3)';
  rr(ctx, -tw / 2 - R(0.045) + 3, -R(0.05) + 4, tw + R(0.09), R(0.1), R(0.05));
  ctx.fill();
  ctx.fillStyle = lin(ctx, 0, -R(0.05), 0, R(0.05), [0, '#ffe45a'], [1, '#ff7a2a']);
  rr(ctx, -tw / 2 - R(0.045), -R(0.05), tw + R(0.09), R(0.1), R(0.05));
  ctx.fill();
  ctx.strokeStyle = '#8a3a08';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#8a3a08';
  ctx.strokeText(s.bigText, 0, R(0.004));
  ctx.fillStyle = '#ffffff';
  ctx.fillText(s.bigText, 0, R(0.004));
  ctx.restore();
}

/** 새것 스포트라이트: 판의 새 구슬 하나에 점선 고리 + NEW 딱지 */
const SPOT_NAME: Record<string, string> = { fire: '폭죽 구슬', ice: '얼음 구슬', star: '별 구슬', iron: '쇠구슬', rain: '무지개 구슬' };
function drawSpot(ctx: C2, s: BeadState, w: number, font: (sz: number, wgt?: number) => void) {
  const sp = s.spot;
  if (!sp || s.t - sp.t < SPOT_AT || s.t - sp.t > SPOT_AT + 240) return;
  const W = s.W, R = (v: number) => v * w;
  const want = sp.k === 'fire' ? K_FIRE : sp.k === 'ice' ? K_ICE : sp.k === 'star' ? K_STAR : sp.k === 'iron' ? K_IRON : K_RAIN;
  let best = -1, bd = 1e9;
  for (let i = 0; i < W.n; i++) {
    if (!W.alive[i] || W.kind[i] !== want) continue;
    const dd = W.y[i] + Math.abs(W.x[i] - XC) * 0.5;
    if (dd < bd) (bd = dd), (best = i);
  }
  if (best < 0) return;
  const x = R(W.x[best]), y = R(W.y[best]), age = s.t - sp.t - SPOT_AT, a = Math.min(1, age / 10, (240 - age) / 30), pul = 1 + 0.08 * Math.sin(s.t * 0.2);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.strokeStyle = '#ff5a3a';
  ctx.lineWidth = 4;
  ctx.setLineDash([8, 5]);
  ctx.lineDashOffset = -s.t * 0.8;
  ell(ctx, x, y, R(W.r[best] + 0.03) * pul, R(W.r[best] + 0.03) * pul);
  ctx.stroke();
  ctx.setLineDash([]);
  const lab = `NEW  ${SPOT_NAME[sp.k]}`;
  font(0.038, 900);
  const tw = ctx.measureText(lab).width + R(0.04), lx = clamp(x, tw / 2 + 4, R(0.78) - tw / 2), ly = y - R(W.r[best] + 0.075);
  ctx.fillStyle = '#ff5a3a';
  rr(ctx, lx - tw / 2, ly - R(0.025), tw, R(0.05), R(0.025));
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
/** 첫 판 첫 긋기 전: 손가락 그림이 빨간 구슬 다섯을 쓱 잇는 시범 + 한 줄 */
function drawDemo(ctx: C2, s: BeadState, w: number, font: (sz: number, wgt?: number) => void) {
  if (s.phase !== 'play' || !s.demo.length || s.chain.length) return;
  const W = s.W, R = (v: number) => v * w;
  const idx = s.demo.map((u) => {
    for (let i = 0; i < W.n; i++) if (W.uid[i] === u && W.alive[i]) return i;
    return -1;
  });
  if (idx.some((i) => i < 0)) return;
  const P = idx.map((i) => [R(W.x[i]), R(W.y[i])]);
  const cyc = 150, a = (s.t - s.playT) % cyc;
  const seg = clamp((a - 18) / 64, 0, 1) * (P.length - 1);
  const k = Math.min(P.length - 2, Math.floor(seg)), f = seg - k;
  let hx = P[k][0] + (P[k + 1][0] - P[k][0]) * f, hy = P[k][1] + (P[k + 1][1] - P[k][1]) * f;
  if (a < 18) (hx = P[0][0]), (hy = P[0][1]);
  const reached = a < 18 ? 1 : Math.floor(seg) + 1;
  const up = a > 96;
  // 지나간 구슬 빛 + 줄
  if (!up) {
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineWidth = R(0.026);
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let q = 0; q < reached; q++) q ? ctx.lineTo(P[q][0], P[q][1]) : ctx.moveTo(P[q][0], P[q][1]);
    ctx.lineTo(hx, hy);
    ctx.stroke();
    ctx.strokeStyle = PAL[0].base;
    ctx.lineWidth = R(0.014);
    ctx.stroke();
    for (let q = 0; q < reached; q++) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ell(ctx, P[q][0], P[q][1], R(W.r[idx[q]]) * 1.15, R(W.r[idx[q]]) * 1.15);
      ctx.stroke();
    }
  } else if (a < 112) {
    for (const [x, y] of P) {
      ctx.fillStyle = `rgba(255,255,255,${1 - (a - 96) / 16})`;
      ell(ctx, x, y, R(0.05), R(0.05));
      ctx.fill();
    }
  }
  const press = a < 10 ? a / 10 : up ? 0 : 1;
  if (a < 120) drawHand(ctx, hx + R(0.02), hy + R(0.035) - (up ? R(0.03) * Math.min(1, (a - 96) / 10) : 0), R(0.07), press);
  // 한 줄
  font(0.046, 900);
  const msg = '👆 같은 색을 쓱 이어요!';
  const tw = ctx.measureText(msg).width + R(0.06), bx = R(XC), by = R(0.36);
  ctx.fillStyle = 'rgba(120,50,10,.3)';
  rr(ctx, bx - tw / 2 + 2, by - R(0.034) + 3, tw, R(0.068), R(0.034));
  ctx.fill();
  ctx.fillStyle = '#fffaf0';
  rr(ctx, bx - tw / 2, by - R(0.034), tw, R(0.068), R(0.034));
  ctx.fill();
  ctx.strokeStyle = '#ff7a3a';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#6a2a08';
  ctx.fillText(msg, bx, by + 1);
}
function drawHand(ctx: C2, x: number, y: number, k: number, press: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.35);
  ctx.scale(1 - press * 0.1, 1 - press * 0.1);
  ctx.fillStyle = 'rgba(40,20,5,.3)';
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

// ── HUD ──
function goalIcon(ctx: C2, q: StarDef, x: number, y: number, r: number, t: number) {
  if (q.k === 'color') drawGlassBead(ctx, x, y, r, q.c ?? 0, 7, t, 1);
  else if (q.k === 'ice') drawIceBead(ctx, x, y, r, 1, 3);
  else if (q.k === 'star') drawStarBead(ctx, x, y, r, t, 1);
  else if (q.k === 'smash') drawIronBead(ctx, x, y, r, false);
  else if (q.k === 'fire') drawFireBead(ctx, x, y, r * 0.8, 0, 2, t);
  else {
    drawGlassBead(ctx, x - r * 0.45, y + r * 0.15, r * 0.7, 0, 1, t, 1);
    drawGlassBead(ctx, x + r * 0.45, y + r * 0.15, r * 0.7, 1, 2, t, 1);
    drawGlassBead(ctx, x, y - r * 0.4, r * 0.7, 2, 3, t, 1);
  }
}
function drawTop(ctx: C2, s: BeadState, w: number, font: (sz: number, wgt?: number) => void) {
  const d = STAGES[s.stage], R = (q: number) => q * w, hb = R(0.088);
  ctx.fillStyle = lin(ctx, 0, 0, 0, hb, [0, '#fffaf0'], [1, '#ffe7c2']);
  ctx.fillRect(0, 0, w, hb);
  ctx.fillStyle = 'rgba(110,60,20,.3)';
  ctx.fillRect(0, hb - 1.5, w, 1.5);
  const cy = hb / 2, bx = R(0.055);
  ctx.fillStyle = lin(ctx, bx, cy - R(0.03), bx, cy + R(0.03), [0, '#c79bff'], [1, '#7a3ad6']);
  ell(ctx, bx, cy, R(0.031), R(0.031));
  ctx.fill();
  ctx.strokeStyle = '#3f1585';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  font(0.036, 900);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(s.stage + 1), bx, cy + 1);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#4a2a10';
  font(0.042, 900);
  ctx.fillText(d.name, R(0.1), cy + 1, R(0.36));
  const nw = Math.min(R(0.36), ctx.measureText(d.name).width);
  font(0.034, 700);
  ctx.fillStyle = '#8a6a4a';
  ctx.fillText(` / ${STAGE_COUNT}`, R(0.1) + nw, cy + 2);
  ctx.textAlign = 'right';
  font(0.042, 900);
  const st = String(s.stars), sw = ctx.measureText(st).width;
  ctx.fillStyle = '#d88a08';
  ctx.fillText(st, w - R(0.03), cy + 1);
  starPath(ctx, w - R(0.03) - sw - R(0.026), cy, R(0.021));
  ctx.fillStyle = '#ffd23a';
  ctx.fill();
  ctx.strokeStyle = '#7a4a08';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  for (let j = 0; j < 3; j++) {
    const hx = w - R(0.03) - sw - R(0.085) - j * R(0.052);
    heartPath(ctx, hx, cy, R(0.018));
    ctx.fillStyle = 2 - j < s.hearts ? lin(ctx, hx, cy - R(0.02), hx, cy + R(0.02), [0, '#ff8a95'], [1, '#e2334a']) : 'rgba(110,60,20,.15)';
    ctx.fill();
    ctx.strokeStyle = 2 - j < s.hearts ? '#8a1a2a' : 'rgba(110,60,20,.3)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
}
function drawGoal(ctx: C2, s: BeadState, w: number, font: (sz: number, wgt?: number) => void) {
  const d = STAGES[s.stage], W = s.W, R = (q: number) => q * w, y0 = R(0.088), y1 = R(0.165), cy = (y0 + y1) / 2, g = d.goal;
  ctx.fillStyle = lin(ctx, 0, y0, 0, y1, [0, '#fff3df'], [1, '#ffe2b8']);
  ctx.fillRect(0, y0, w, y1 - y0);
  ctx.fillStyle = 'rgba(150,80,30,.25)';
  ctx.fillRect(0, y1 - 1, w, 1);
  goalIcon(ctx, g, R(0.055), cy, R(0.024), s.t);
  const have = Math.min(metric(W, g), g.n), done = have >= g.n;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  font(0.04, 900);
  ctx.fillStyle = '#5a2a0a';
  const lab = g.k === 'color' ? `${CNAME[g.c ?? 0]} 구슬` : g.k === 'any' ? '터뜨린 구슬' : g.k === 'ice' ? '녹인 얼음' : g.k === 'star' ? '내린 별 구슬' : g.k === 'smash' ? '쇠구슬로 깬 구슬' : g.label;
  ctx.fillText(lab, R(0.095), cy - R(0.012), R(0.3));
  // 진척 막대
  const bx = R(0.095), bw = R(0.36), by = cy + R(0.016);
  ctx.fillStyle = 'rgba(150,80,30,.18)';
  rr(ctx, bx, by - R(0.008), bw, R(0.016), R(0.008));
  ctx.fill();
  ctx.fillStyle = done ? '#35c873' : g.k === 'color' ? PAL[g.c ?? 0].base : '#ff9a3a';
  rr(ctx, bx, by - R(0.008), Math.max(R(0.016), (bw * have) / g.n), R(0.016), R(0.008));
  ctx.fill();
  font(0.05, 900);
  ctx.textAlign = 'left';
  ctx.fillStyle = done ? '#169449' : '#7a3a08';
  ctx.fillText(`${have}/${g.n}`, R(0.47), cy + 1);
  // 남은 긋기
  const lx = w - R(0.025);
  ctx.textAlign = 'right';
  font(0.032, 800);
  ctx.fillStyle = '#8a5a30';
  ctx.fillText('남은 긋기', lx - R(0.075), cy - R(0.013));
  const pipW = R(0.017), n = d.strokes, x0 = lx - R(0.075) - n * pipW;
  for (let k = 0; k < n; k++) {
    ctx.fillStyle = k < s.left ? '#ff8a3a' : 'rgba(150,80,30,.2)';
    ell(ctx, x0 + (k + 0.5) * pipW, cy + R(0.017), R(0.006), R(0.006));
    ctx.fill();
  }
  const low = s.left <= 1 && s.phase === 'play';
  ctx.fillStyle = low ? (s.t % 30 < 15 ? '#ff4d5e' : '#ff8a3a') : '#ff8a3a';
  ell(ctx, lx - R(0.034), cy, R(0.031), R(0.031));
  ctx.fill();
  ctx.strokeStyle = '#9a4a10';
  ctx.lineWidth = 2;
  ctx.stroke();
  font(0.044, 900);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(String(s.left), lx - R(0.034), cy + 1);
}
function drawBottom(ctx: C2, s: BeadState, w: number, h: number, font: (sz: number, wgt?: number) => void) {
  const d = STAGES[s.stage], W = s.W, R = (q: number) => q * w, y0 = R(1.39);
  ctx.fillStyle = lin(ctx, 0, y0, 0, h, [0, '#8a4f26'], [1, '#6a3a1a']);
  ctx.fillRect(0, y0, w, h - y0);
  const n = d.stars.length, cy = y0 + R(0.034), pad = R(0.06), avail = w - R(0.03) - n * 4;
  const prog = (q: StarDef) => (q.k === 'goal' || q.k === 'within' ? '' : q.k === 'fewer' ? ` (${W.total})` : ` ${Math.min(metric(W, q), q.n)}/${q.n}`);
  const labs = d.stars.map((q) => q.label + (q.k === 'goal' ? '' : prog(q)));
  let fs = 0.036;
  font(fs, 800);
  let tws = labs.map((l) => ctx.measureText(l).width + pad);
  while (fs > 0.0355 && tws.reduce((a, b) => a + b, 0) > avail) {
    fs -= 0.001;
    font(fs, 800);
    tws = labs.map((l) => ctx.measureText(l).width + pad);
  }
  const sum = tws.reduce((a, b) => a + b, 0), k0 = Math.min(1.2, avail / sum);
  let x = R(0.015) + Math.max(0, (avail - sum * k0) / 2);
  for (let k = 0; k < n; k++) {
    const q = d.stars[k], cw = tws[k] * k0 + 4;
    const met = s.phase === 'clear' ? s.starOk[k] : q.k === 'within' || q.k === 'fewer' ? false : starMet(W, q, d);
    const lost = (q.k === 'within' && W.strokes > q.n) || (q.k === 'fewer' && W.total > q.n);
    ctx.fillStyle = met ? '#ffe9a0' : lost ? 'rgba(0,0,0,.2)' : 'rgba(255,240,220,.16)';
    rr(ctx, x + 2, cy - R(0.025), cw - 4, R(0.05), R(0.025));
    ctx.fill();
    starPath(ctx, x + R(0.028), cy, R(0.015));
    ctx.fillStyle = met ? '#ffb81a' : 'rgba(255,240,220,.6)';
    ctx.fill();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = met ? '#6a3a08' : lost ? 'rgba(255,240,220,.45)' : '#fff2dc';
    ctx.fillText(labs[k], x + R(0.05), cy + 1, cw - R(0.056));
    x += cw;
  }
  font(0.035, 700);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffe6c4';
  const tip = s.phase === 'clear' ? '판 성공! 다음 병으로' : s.phase === 'fail' ? '같은 병을 다시 — 이번엔 다른 데부터' : s.left === 1 ? '마지막 긋기예요 — 크게 이어요' : d.hint;
  ctx.fillText(tip, w / 2, y0 + R(0.083), w - R(0.04));
}
function drawBanner(ctx: C2, s: BeadState, w: number, font: (sz: number, wgt?: number) => void, fx: ReturnType<typeof juice>) {
  const R = (q: number) => q * w, t = s.t;
  let head = '', sub = '', a = 0, age = 0, cy = R(0.78);
  if (s.phase === 'clear') {
    age = s.pt;
    a = Math.min(1, Math.max(0, (age - 24) / 8));
    cy = R(0.72);
    head = s.won ? '모든 병 성공!' : `${s.stage + 1}판 성공!`;
  } else if (s.phase === 'fail') {
    age = s.pt;
    a = Math.min(1, age / 8);
    cy = R(0.72);
    head = '긋기를 다 썼어요…';
    sub = s.hearts > 0 ? '하트 -1 · 같은 병 다시' : '하트가 없어요 — 끝';
  } else if (s.banner && t - s.banner.t < BANNER_T) {
    age = t - s.banner.t;
    a = Math.min(1, age / 8, (BANNER_T - age) / 25);
    head = s.banner.head;
    sub = s.banner.sub;
  }
  if (!head || a <= 0) return;
  const pop = Math.min(1, 0.5 + age / 10), okRes = s.phase === 'clear';
  ctx.save();
  ctx.globalAlpha = a;
  font(0.054, 900);
  const w1 = ctx.measureText(head).width;
  font(0.036, 800);
  const w2 = sub ? ctx.measureText(sub).width : 0;
  const stat = okRes ? `터뜨린 구슬 ${s.W.total}개 · 남은 긋기 ${s.left}` : '';
  font(0.034, 800);
  const w3 = stat ? ctx.measureText(stat).width : 0;
  const cw = Math.min(w - R(0.04), Math.max(w1, w2, w3, okRes ? R(0.52) : 0) + R(0.1)), ch = (okRes ? R(0.21) : sub ? R(0.15) : R(0.09)) * pop;
  ctx.translate(R(0.5), cy);
  ctx.fillStyle = 'rgba(80,30,10,.3)';
  rr(ctx, -cw / 2 + 3, -ch / 2 + 5, cw, ch, R(0.035));
  ctx.fill();
  ctx.fillStyle = lin(ctx, 0, -ch / 2, 0, ch / 2, [0, '#fffaf0'], [1, '#ffe6c0']);
  rr(ctx, -cw / 2, -ch / 2, cw, ch, R(0.035));
  ctx.fill();
  ctx.strokeStyle = '#a0602a';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = s.phase === 'clear' ? '#ff6a3a' : s.phase === 'fail' ? '#7a8aa8' : '#ad66ff';
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo((sd * cw) / 2, -ch * 0.25);
    ctx.lineTo(sd * (cw / 2 + R(0.035)), -ch * 0.3);
    ctx.lineTo(sd * (cw / 2 + R(0.02)), 0);
    ctx.lineTo(sd * (cw / 2 + R(0.035)), ch * 0.3);
    ctx.lineTo((sd * cw) / 2, ch * 0.25);
    ctx.closePath();
    ctx.fill();
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  font(0.054, 900);
  ctx.fillStyle = s.phase === 'clear' ? '#d0500a' : s.phase === 'fail' ? '#5a6a88' : '#5a2a9a';
  if (okRes) {
    ctx.fillText(head, 0, -R(0.058), w - R(0.1));
    const nS = s.starOk.length;
    for (let j = 0; j < nS; j++) {
      const ag = s.pt - (36 + j * 14), sx = (j - (nS - 1) / 2) * R(0.095);
      const popS = ag < 0 ? 0.8 : ag < 8 ? 1.9 - 0.9 * (ag / 8) : 1;
      starPath(ctx, sx, R(0.012), R(0.038) * popS);
      ctx.fillStyle = ag >= 0 && s.starOk[j] ? '#ffc93a' : 'rgba(90,50,20,.15)';
      ctx.fill();
      ctx.strokeStyle = ag >= 0 && s.starOk[j] ? '#9a5a08' : 'rgba(90,50,20,.35)';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      if (ag >= 0 && s.starOk[j] && (fx.memo['st' + j] ?? -1) < s.t - ag) (fx.memo['st' + j] = s.t - ag), fx.burst(R(0.5) + sx, cy + R(0.012), '#ffd23a', 16, 3, 2.4);
    }
    font(0.034, 800);
    ctx.fillStyle = '#8a5a20';
    ctx.fillText(stat, 0, R(0.068), cw - R(0.06));
  } else {
    ctx.fillText(head, 0, sub ? -R(0.03) : R(0.002), w - R(0.1));
    if (sub) {
      font(0.035, 800);
      ctx.fillStyle = sub.startsWith('NEW') ? '#d0402a' : '#6a4a2a';
      ctx.fillText(sub, 0, R(0.036), w - R(0.08));
    }
  }
  ctx.restore();
}
/** 시험용: 물리 한 틱 */
export const _sim = { tickWorld, worldDone, cloneWorld, candidates };
