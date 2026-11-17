/**
 * 곰돌이 꿀 흐르기 (29라운드: 한눈에 아는 놀이 × 진짜 물리) — 흘려 채우기 × 굳는 꿀 × 가리키기(톡).
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5;
// ───────────────────────────── 꿀 물리 (고정 틱, 결정적) ─────────────────────────────
/** 꿀 방울 반지름 · 지름 */
const PR = 0.0165, PD = PR * 2;
/** 중력(틱²) · 공기 · 위치 맞춤 반복 · 끈적임(이웃과 속도 나눔) */
const G = 0.0008, AIR = 0.996, ITER = 3, VISC = 0.35;
/** 액체 압력(이중 밀도 완화): 서로 미는 반경 · 쉬는 밀도 · 굳기 · 가까이 굳기 */
/** 허공에서 가로 속도 유지 비율 · 닿아 있을 때 속도 유지 비율 */
const DRIP = 0.88, BULK = 0.982, VMAX = 0.02;
const HR = PD * 2, RHO0 = 1.3, KP = 0.012, KN = 0.8;
/** 이 속도보다 느리게 SET_T틱 고여 있으면 굳어 꿀사탕이 된다 */
const VS = 0.0004, SET_T = 50;
/** 바닥(여기 닿으면 흘린 꿀) · 나무 속 벽 */
const FLOOR = 1.235, XL = 0.03, XR = 0.97;
/** 재질: 나무껍질 · 꿀사탕 · 밀랍 · 단지 · 나뭇잎 · 뜨거운 돌 · 뚜껑 */
const BARK = 0, CANDY = 1, WAX = 2, GLASS = 3, LEAF = 4, HOT = 5, LID = 6;
/** 미끄러질 때 틱마다 깎이는 비율 · 쿨롱 마찰 계수(이 기울기보다 완만하면 멈춤) — 나무껍질은 끈적, 꿀사탕은 미끈 */
const FRIC = [0.035, 0.006, 0.02, 0.04, 0.02, 0.02, 0.01];
const MU = [0.34, 0, 0.1, 0.25, 0.08, 0, 0];
const SLEEP = 0, LIVE = 1, SET = 2, GONE = 3;
/** 뜨거운 돌에 이만큼 닿아 있으면 지글지글 타서 없어진다 */
const BURN_T = 26;
/** 벌: 덜 찬 단지에 이만큼 꿀이 안 들어오면 날아와 퍼 간다 */
const BEE_WAIT = 150, BEE_GAP = 110, BEE_TAKE = 2;

interface Seg { x1: number; y1: number; x2: number; y2: number; r: number; m: number }
type StarKind = 'fill' | 'nospill' | 'plugs' | 'nodrop' | 'bee' | 'noburn';
export interface StageDef {
  key: string; name: string; emoji: string; news: string; tip: string;
  stars: StarKind[]; plugs?: number;
  /** 나무 선반·뿌리: 꺾은선 [x,y, x,y, ...] */
  walls: number[][];
  /** 꿀방: [가운데 x, 바닥 y, 폭, 꿀 방울 수, 꿀 색(0 노랑·1 분홍)] — 높이는 꿀 양에 맞춤, 밀랍은 바닥 가운데 */
  rooms: number[][];
  /** 단지: [가운데 x, 안쪽 폭, 높이, 눈금(방울 수), 꽃 색(-1 아무거나), 그루터기 높이, 뚜껑 기울기(-1 왼쪽으로 · 0 둥근 · 1 오른쪽으로)] */
  jars: number[][];
  hot?: number[][];
  /** 나뭇잎 시소: [축 x, 축 y, 반 길이, 처음 기운 쪽(-1 왼쪽 아래 · 1 오른쪽 아래)] */
  leaf?: number[];
  bees?: boolean;
  /** 새것 스포트라이트 [x, y, 반지름] */
  spot?: number[];
}

interface Room { x: number; y: number; w: number; h: number; n: number; c: number; plug: number; px: number; py: number }
interface Jar { x: number; w: number; h: number; cap: number; c: number; x0: number; x1: number; top: number; bot: number; lid: number[]; tilt: number; base: number }
interface HotStone { x: number; y: number; r: number }
interface LeafDef { px: number; py: number; hl: number; bias: number }
export interface Level {
  def: StageDef; flip: boolean;
  segs: Seg[]; rooms: Room[]; jars: Jar[]; hot: HotStone[]; leaf: LeafDef | null;
  /** 칸마다 가까운 선분 목록 */
  grid: number[][];
  /** 처음 꿀 방울 자리 · 색 · 방 */
  px0: number[]; py0: number[]; pc: number[]; pr: number[];
}

const BMAX = 6;
const GC = 0.05, GW = Math.ceil(1 / GC), GHH = Math.ceil(A / GC);
const HC = PD * 2, HW = Math.ceil(1 / HC) + 1, HH = Math.ceil(A / HC) + 1;

function buildLevel(def: StageDef, flip: boolean): Level {
  const fx = (x: number) => (flip ? 1 - x : x);
  const segs: Seg[] = [];
  const add = (x1: number, y1: number, x2: number, y2: number, r: number, m: number) => (segs.push({ x1: fx(x1), y1, x2: fx(x2), y2, r, m }), segs.length - 1);
  // 나무 속 양쪽 벽
  add(XL, 0.05, XL, FLOOR + 0.1, 0.01, BARK);
  add(XR, 0.05, XR, FLOOR + 0.1, 0.01, BARK);
  for (const w of def.walls) for (let k = 0; k + 3 < w.length; k += 2) add(w[k], w[k + 1], w[k + 2], w[k + 3], 0.012, BARK);
  const rooms: Room[] = [], px0: number[] = [], py0: number[] = [], pc: number[] = [], pr: number[] = [];
  def.rooms.forEach(([x, b, w, n, c = 0], ri) => {
    // 방 높이는 꿀 방울 수에 맞춘다 (바닥 b 기준, 위로 벌집처럼 쌓는다)
    const cols = Math.floor((w - 0.02) / PD), dy = PD * 0.87;
    let rows = 0;
    for (let k = 0; k < n; rows++) k += cols - (rows % 2);
    const h = Math.max(0.07, rows * dy + 0.022), l = x - w / 2, r = x + w / 2, t = b - h, o = 0.042, v = 0.06;
    add(l, t, r, t, 0.008, WAX);
    add(l, t, l, b, 0.008, WAX);
    add(r, t, r, b, 0.008, WAX);
    add(l, b, x - o, b + v, 0.008, WAX);
    add(r, b, x + o, b + v, 0.008, WAX);
    const plug = add(x - o, b + v, x + o, b + v, 0.01, WAX);
    rooms.push({ x: fx(x), y: (t + b) / 2, w, h, n, c, plug, px: fx(x), py: b + v });
    let k = 0;
    for (let row = 0; k < n; row++) {
      const yy = b - PR - 0.008 - row * dy, off = row % 2 ? PD / 2 : 0, m = cols - (row % 2);
      for (let j = 0; j < m && k < n; j++, k++) {
        const xx = l + 0.01 + PR + off + j * PD;
        px0.push(fx(xx)), py0.push(yy), pc.push(c), pr.push(ri);
      }
    }
  });
  const jars: Jar[] = def.jars.map(([x, w, h, cap, c = -1, base = 0, tilt = 0]) => {
    const X = fx(x), x0 = X - w / 2, x1 = X + w / 2, bot = FLOOR - 0.012 - base, top = bot - h, tl = flip ? -tilt : tilt;
    const sw = (a: number, b: number, c2: number, d: number, m = GLASS, r = 0.009) => (segs.push({ x1: a, y1: b, x2: c2, y2: d, r, m }), segs.length - 1);
    sw(x0, top, x0, bot);
    sw(x1, top, x1, bot);
    sw(x0, bot, x1, bot);
    // 그루터기 받침 (단지가 높이 있으면)
    if (base > 0) sw(x0 - 0.012, bot + 0.012, x0 - 0.012, FLOOR + 0.05, BARK, 0.012), sw(x1 + 0.012, bot + 0.012, x1 + 0.012, FLOOR + 0.05, BARK, 0.012);
    // 뚜껑: 눈금까지 차면 탁 덮인다. 기울어진 뚜껑은 넘친 꿀을 한쪽으로 미끄러뜨린다
    const lid: number[] = [], ly = top - 0.006, lh = 0.035;
    if (tl === 0) lid.push(sw(x0 - 0.014, ly, X, ly - lh * 0.7, LID, 0.009), sw(X, ly - lh * 0.7, x1 + 0.014, ly, LID, 0.009));
    else if (tl > 0) lid.push(sw(x0 - 0.014, ly - lh, x1 + 0.016, ly + 0.004, LID, 0.009));
    else lid.push(sw(x0 - 0.016, ly + 0.004, x1 + 0.014, ly - lh, LID, 0.009));
    return { x: X, w, h, cap, c, x0, x1, top, bot, lid, tilt: tl, base };
  });
  const hot = (def.hot ?? []).map(([x, y, r]) => ({ x: fx(x), y, r }));
  for (const h of hot) segs.push({ x1: h.x - h.r * 0.6, y1: h.y, x2: h.x + h.r * 0.6, y2: h.y, r: h.r * 0.45, m: HOT });
  let leaf: LeafDef | null = null;
  if (def.leaf) {
    const [lx, ly, hl, bias] = def.leaf;
    leaf = { px: fx(lx), py: ly, hl, bias: flip ? -bias : bias };
  }
  const grid: number[][] = Array.from({ length: GW * GHH }, () => []);
  segs.forEach((s, k) => {
    const pad = s.r + PR + 0.004;
    const gx0 = Math.max(0, Math.floor((Math.min(s.x1, s.x2) - pad) / GC)), gx1 = Math.min(GW - 1, Math.floor((Math.max(s.x1, s.x2) + pad) / GC));
    const gy0 = Math.max(0, Math.floor((Math.min(s.y1, s.y2) - pad) / GC)), gy1 = Math.min(GHH - 1, Math.floor((Math.max(s.y1, s.y2) + pad) / GC));
    for (let gx = gx0; gx <= gx1; gx++) for (let gy = gy0; gy <= gy1; gy++) grid[gy * GW + gx].push(k);
  });
  return { def, flip, segs, rooms, jars, hot, leaf, grid, px0, py0, pc, pr };
}

export interface Sim {
  t: number; n: number;
  x: Float64Array; y: Float64Array; ox: Float64Array; oy: Float64Array; vx: Float64Array; vy: Float64Array;
  still: Int32Array; heat: Int32Array; st: Uint8Array; c: Uint8Array; room: Int8Array;
  /** 1 = 뚜껑에 닿음(넘친 꿀) · 2 = 나뭇잎에 붙은 꿀사탕 · 4 = 방을 나옴 */
  fl: Uint8Array; lx: Float64Array; ly: Float64Array;
  /** 굳은 꿀사탕끼리 이은 다리(매끈한 면): 방울마다 자기보다 번호 큰 이웃 최대 BMAX개 */
  bond: Int32Array; bn: Uint8Array;
  open: Uint8Array; segOn: Uint8Array;
  fill: Int32Array; full: Uint8Array; wrong: Uint8Array; lastIn: Int32Array; beeT: Int32Array;
  la: number; lav: number; flips: number;
  dropped: number; spilled: number; burned: number; stolen: number; opened: number; live: number; moved: number;
}

function newSim(L: Level): Sim {
  const n = L.px0.length, J = L.jars.length;
  const S: Sim = {
    t: 0, n,
    x: Float64Array.from(L.px0), y: Float64Array.from(L.py0), ox: Float64Array.from(L.px0), oy: Float64Array.from(L.py0), vx: new Float64Array(n), vy: new Float64Array(n),
    still: new Int32Array(n), heat: new Int32Array(n), st: new Uint8Array(n), c: Uint8Array.from(L.pc), room: Int8Array.from(L.pr),
    fl: new Uint8Array(n), lx: new Float64Array(n), ly: new Float64Array(n), bond: new Int32Array(n * BMAX), bn: new Uint8Array(n),
    open: new Uint8Array(L.rooms.length), segOn: new Uint8Array(L.segs.length).fill(1),
    fill: new Int32Array(J), full: new Uint8Array(J), wrong: new Uint8Array(J), lastIn: new Int32Array(J), beeT: new Int32Array(J).fill(-999),
    la: L.leaf ? Math.sign(L.leaf.bias) * LEAF_MAX : 0, lav: 0, flips: 0,
    dropped: 0, spilled: 0, burned: 0, stolen: 0, opened: 0, live: 0, moved: 0,
  };
  for (const j of L.jars) for (const k of j.lid) S.segOn[k] = 0;
  return S;
}
function cloneSim(S: Sim): Sim {
  return {
    ...S,
    x: S.x.slice(), y: S.y.slice(), ox: S.ox.slice(), oy: S.oy.slice(), vx: S.vx.slice(), vy: S.vy.slice(),
    still: S.still.slice(), heat: S.heat.slice(), st: S.st.slice(), c: S.c, room: S.room, fl: S.fl.slice(), lx: S.lx.slice(), ly: S.ly.slice(), bond: S.bond.slice(), bn: S.bn.slice(),
    open: S.open.slice(), segOn: S.segOn.slice(), fill: S.fill.slice(), full: S.full.slice(), wrong: S.wrong.slice(), lastIn: S.lastIn.slice(), beeT: S.beeT.slice(),
  };
}

// ── 나뭇잎 시소: 축 둘레로 돈다. 위에 얹힌 꿀(굳은 꿀사탕 포함)의 무게로 기울고, 양 끝은 말려 올라가 꿀을 조금 받는다
const LEAF_MAX = 0.42, LEAF_HOLD = 0.9;
/** 지금 계산 중인 판의 나뭇잎 선분(잎·왼쪽 말림·오른쪽 말림) — 판마다 각도가 달라 Level에 두지 않는다 */
const LSEG: Seg[] = [{ x1: 0, y1: 0, x2: 0, y2: 0, r: 0.011, m: LEAF }];
function leafSegs(lf: LeafDef, la: number): Seg[] {
  const c = Math.cos(la), s = Math.sin(la);
  const ax = lf.px - c * lf.hl, ay = lf.py - s * lf.hl, bx = lf.px + c * lf.hl, by = lf.py + s * lf.hl;
  Object.assign(LSEG[0], { x1: ax, y1: ay, x2: bx, y2: by });
  return LSEG;
}

// 접촉 기록 (틱마다 방울당 최대 3개)
const MAXC = 3;
let CN = new Uint8Array(0), CNX = new Float64Array(0), CNY = new Float64Array(0), CM = new Uint8Array(0);
let HEAD = new Int32Array(HW * HH), NEXT = new Int32Array(0), DVX = new Float64Array(0), DVY = new Float64Array(0);
function ensure(n: number) {
  if (NEXT.length >= n) return;
  NEXT = new Int32Array(n);
  CN = new Uint8Array(n);
  CNX = new Float64Array(n * MAXC);
  CNY = new Float64Array(n * MAXC);
  CM = new Uint8Array(n * MAXC);
  DVX = new Float64Array(n);
  DVY = new Float64Array(n);
}
function contact(i: number, nx: number, ny: number, m: number) {
  const k = CN[i];
  if (k < MAXC) (CNX[i * MAXC + k] = nx), (CNY[i * MAXC + k] = ny), (CM[i * MAXC + k] = m), (CN[i] = k + 1);
  else if (ny < CNY[i * MAXC]) (CNX[i * MAXC] = nx), (CNY[i * MAXC] = ny), (CM[i * MAXC] = m);
}

export type Hook = ((kind: string, x: number, y: number, a?: number) => void) | null;

/** 한 틱 */
function phys(L: Level, S: Sim, hook: Hook) {
  S.t++;
  const n = S.n, { x, y, ox, oy, vx, vy, st } = S;
  ensure(n);
  if (L.leaf) leafStep(L, S);
  let live = 0;
  for (let i = 0; i < n; i++) {
    if (st[i] !== LIVE) continue;
    live++;
    ox[i] = x[i];
    oy[i] = y[i];
    vy[i] += G;
    vx[i] *= AIR;
    vy[i] *= AIR;
    const sp = vx[i] * vx[i] + vy[i] * vy[i];
    if (sp > VMAX * VMAX) (vx[i] *= VMAX / Math.sqrt(sp)), (vy[i] *= VMAX / Math.sqrt(sp));
    x[i] += vx[i];
    y[i] += vy[i];
    CN[i] = 0;
  }
  S.live = live;
  if (live) {
    // 칸 나누기 (움직이는 꿀 + 굳은 꿀사탕)
    HEAD.fill(-1);
    for (let i = 0; i < n; i++) {
      if (st[i] !== LIVE && st[i] !== SET) continue;
      const h = cellOf(x[i], y[i]);
      NEXT[i] = HEAD[h];
      HEAD[h] = i;
    }
    relax(S);
    const segs = L.segs, on = S.segOn, lsegs = L.leaf ? leafSegs(L.leaf, S.la) : null;
    for (let it = 0; it < ITER; it++) {
      const last = it === ITER - 1;
      for (let i = 0; i < n; i++) {
        if (st[i] !== LIVE) continue;
        // 선분
        const gx = Math.min(GW - 1, Math.max(0, Math.floor(x[i] / GC))), gy = Math.min(GHH - 1, Math.max(0, Math.floor(y[i] / GC)));
        const cell = L.grid[gy * GW + gx];
        for (let q = 0; q < cell.length; q++) {
          const k = cell[q];
          if (on[k]) segHit(segs[k], i, S, last);
        }
        if (lsegs) segHit(lsegs[0], i, S, last);
        // 굳은 꿀사탕 (방울 + 매끈한 다리)
        const hx = Math.floor(x[i] / HC), hy = Math.floor(y[i] / HC);
        for (let ax = hx - 1; ax <= hx + 1; ax++) {
          if (ax < 0 || ax >= HW) continue;
          for (let ay = hy - 1; ay <= hy + 1; ay++) {
            if (ay < 0 || ay >= HH) continue;
            for (let j = HEAD[ay * HW + ax]; j >= 0; j = NEXT[j]) {
              if (st[j] !== SET) continue;
              for (let b = 0; b < S.bn[j]; b++) {
                const k = S.bond[j * BMAX + b];
                capHit(x[j], y[j], x[k], y[k], PR, CANDY, i, S, last);
              }
              const dx = x[i] - x[j], dy = y[i] - y[j], d2 = dx * dx + dy * dy;
              if (d2 >= PD * PD || d2 < 1e-14) continue;
              const d = Math.sqrt(d2), pen = PD - d, nx = dx / d, ny = dy / d;
              x[i] += nx * pen;
              y[i] += ny * pen;
              if (last) contact(i, nx, ny, CANDY);
            }
          }
        }
      }
    }
    // 속도 = 움직인 만큼, 닿은 면에서 미끄러짐/달라붙음
    for (let i = 0; i < n; i++) {
      if (st[i] !== LIVE) continue;
      let ux = x[i] - ox[i], uy = y[i] - oy[i], rough = false;
      for (let k = 0; k < CN[i]; k++) {
        const nx = CNX[i * MAXC + k], ny = CNY[i * MAXC + k], m = CM[i * MAXC + k];
        if (m !== CANDY && m !== LID) rough = true;
        let vn = ux * nx + uy * ny;
        if (vn < 0) (ux -= vn * nx), (uy -= vn * ny), (vn = 0);
        const tx = ux - vn * nx, ty = uy - vn * ny, tl = Math.hypot(tx, ty);
        // 쿨롱 마찰: 누르는 무게만큼 미끄러짐을 깎는다 (나무는 완만한 비탈에서 꿀을 멈춰 세우고, 꿀사탕은 거의 안 깎는다)
        const dec = MU[m] * G * Math.max(0, -ny);
        if (tl <= dec) (ux -= tx), (uy -= ty), (x[i] -= tx), (y[i] -= ty);
        else {
          const k = (dec / tl) + FRIC[m] * (1 - dec / tl);
          (ux -= tx * k), (uy -= ty * k);
        }
      }
      // 허공에 뜬 꿀은 실처럼 늘어지며 거의 곧게 떨어진다 (가로 속도를 빨리 잃는다)
      if (CN[i] === 0) ux *= DRIP;
      else if (rough) (ux *= BULK), (uy *= BULK);
      vx[i] = ux;
      vy[i] = uy;
    }
    // 끈적임: 이웃 방울과 속도를 나눈다 (꿀이 한 덩어리로 흐르게)
    const H2 = PD * 1.3;
    for (let i = 0; i < n; i++) {
      DVX[i] = 0;
      DVY[i] = 0;
      if (st[i] !== LIVE) continue;
      const hx = Math.floor(x[i] / HC), hy = Math.floor(y[i] / HC);
      let sx = 0, sy = 0, sw = 0;
      for (let ax = hx - 1; ax <= hx + 1; ax++) {
        if (ax < 0 || ax >= HW) continue;
        for (let ay = hy - 1; ay <= hy + 1; ay++) {
          if (ay < 0 || ay >= HH) continue;
          for (let j = HEAD[ay * HW + ax]; j >= 0; j = NEXT[j]) {
            if (j === i || st[j] !== LIVE) continue;
            const d = Math.hypot(x[i] - x[j], y[i] - y[j]);
            if (d >= H2) continue;
            const w = 1 - d / H2;
            sx += w * (vx[j] - vx[i]);
            sy += w * (vy[j] - vy[i]);
            sw += w;
          }
        }
      }
      if (sw > 0) (DVX[i] = (VISC * sx) / Math.max(1, sw)), (DVY[i] = (VISC * sy) / Math.max(1, sw));
    }
    let moved = 0;
    for (let i = 0; i < n; i++) {
      if (st[i] !== LIVE) continue;
      vx[i] += DVX[i];
      vy[i] += DVY[i];
      const sp2 = vx[i] * vx[i] + vy[i] * vy[i];
      if (sp2 > VS * VS * 4) moved++;
      // 단지에 쏙
      let gone = false;
      for (let j = 0; j < L.jars.length; j++) {
        const J = L.jars[j];
        if (x[i] > J.x0 + 0.004 && x[i] < J.x1 - 0.004 && y[i] > J.top + PR * 0.6 && y[i] < J.bot) {
          st[i] = GONE;
          gone = true;
          if (!S.full[j]) {
            S.fill[j]++;
            S.lastIn[j] = S.t;
            if (J.c >= 0 && S.c[i] !== J.c && !S.wrong[j]) (S.wrong[j] = 1), hook?.('wrong', J.x, J.top);
            hook?.('in', x[i], J.top, j);
            if (S.fill[j] >= J.cap) {
              S.full[j] = 1;
              for (const k of J.lid) S.segOn[k] = 1;
              hook?.('full', J.x, J.top, j);
            }
          }
          break;
        }
      }
      if (gone) continue;
      if (y[i] > FLOOR || x[i] < 0 || x[i] > 1 || y[i] < 0) {
        st[i] = GONE;
        S.dropped++;
        if (S.fl[i] & 1) S.spilled++;
        hook?.('drop', x[i], FLOOR, S.fl[i] & 1);
        continue;
      }
      // 뜨거운 돌: 지글지글, 안 굳는다
      if (S.heat[i] > 0) {
        if (S.heat[i] >= BURN_T) {
          st[i] = GONE;
          S.burned++;
          hook?.('burn', x[i], y[i]);
          continue;
        }
        S.still[i] = 0;
        continue;
      }
      // 벌집 방 안의 꿀은 따뜻해서 안 굳는다 (방을 나와야 굳기 시작)
      if (S.room[i] >= 0 && !(S.fl[i] & 4)) {
        const R = L.rooms[S.room[i]];
        if (y[i] > R.py + PR || y[i] < R.y - R.h / 2 - PR || Math.abs(x[i] - R.x) > R.w / 2 + PR) S.fl[i] |= 4;
        else continue;
      }
      if (sp2 < VS * VS) {
        if (++S.still[i] >= SET_T) {
          setP(S, i);
          hook?.('set', x[i], y[i]);
        }
      } else S.still[i] = Math.max(0, S.still[i] - 4);
    }
    S.moved = moved;
  }
  if (L.def.bees) beeStep(L, S, hook);
}

/** 액체처럼: 이웃이 많으면 밀어내고(압력), 너무 가까우면 세게 밀고, 겉은 살짝 당긴다(끈적한 덩어리) */
function relax(S: Sim) {
  const { x, y, st, n } = S;
  for (let i = 0; i < n; i++) {
    if (st[i] !== LIVE) continue;
    const hx = Math.floor(x[i] / HC), hy = Math.floor(y[i] / HC);
    let rho = 0, rhoN = 0;
    for (let ax = hx - 1; ax <= hx + 1; ax++) {
      if (ax < 0 || ax >= HW) continue;
      for (let ay = hy - 1; ay <= hy + 1; ay++) {
        if (ay < 0 || ay >= HH) continue;
        for (let j = HEAD[ay * HW + ax]; j >= 0; j = NEXT[j]) {
          if (j === i || st[j] !== LIVE) continue;
          const d = Math.hypot(x[i] - x[j], y[i] - y[j]);
          if (d >= HR) continue;
          const q = 1 - d / HR;
          rho += q * q;
          rhoN += q * q * q;
        }
      }
    }
    // 깊은 웅덩이(이웃이 빽빽)만 옆으로 밀어 평평해지고, 얇은 줄은 밀지 않는다 (나무에서 멈출 수 있게)
    const P = KP * Math.max(0, rho - RHO0);
    void rhoN;
    let dx = 0, dy = 0;
    for (let ax = hx - 1; ax <= hx + 1; ax++) {
      if (ax < 0 || ax >= HW) continue;
      for (let ay = hy - 1; ay <= hy + 1; ay++) {
        if (ay < 0 || ay >= HH) continue;
        for (let j = HEAD[ay * HW + ax]; j >= 0; j = NEXT[j]) {
          if (j === i || st[j] !== LIVE) continue;
          const rx = x[j] - x[i], ry = y[j] - y[i], d = Math.hypot(rx, ry);
          if (d >= HR || d < 1e-9) continue;
          const q = 1 - d / HR, D = Math.min(PR * 0.3, 0.5 * P * q + (d < PD ? (PD - d) * 0.5 * KN : 0)), ux = (rx / d) * D, uy = (ry / d) * D;
          x[j] += ux;
          y[j] += uy;
          dx -= ux;
          dy -= uy;
        }
      }
    }
    x[i] += dx;
    y[i] += dy;
  }
}

function cellOf(px: number, py: number) {
  const hx = Math.min(HW - 1, Math.max(0, Math.floor(px / HC))), hy = Math.min(HH - 1, Math.max(0, Math.floor(py / HC)));
  return hy * HW + hx;
}

function segHit(s: Seg, i: number, S: Sim, last: boolean) {
  capHit(s.x1, s.y1, s.x2, s.y2, s.r, s.m, i, S, last);
}
function capHit(x1: number, y1: number, x2: number, y2: number, r: number, mat: number, i: number, S: Sim, last: boolean) {
  const x = S.x, y = S.y;
  const abx = x2 - x1, aby = y2 - y1, l2 = abx * abx + aby * aby;
  let u = l2 > 0 ? ((x[i] - x1) * abx + (y[i] - y1) * aby) / l2 : 0;
  u = u < 0 ? 0 : u > 1 ? 1 : u;
  const qx = x1 + abx * u, qy = y1 + aby * u, dx = x[i] - qx, dy = y[i] - qy, d2 = dx * dx + dy * dy, m = PR + r;
  if (d2 >= m * m) return;
  const d = Math.sqrt(d2) || 1e-9, nx = d2 > 1e-14 ? dx / d : 0, ny = d2 > 1e-14 ? dy / d : -1, pen = m - d;
  x[i] += nx * pen;
  y[i] += ny * pen;
  if (!last) return;
  contact(i, nx, ny, mat);
  if (mat === HOT) S.heat[i]++;
  if (mat === LID) S.fl[i] |= 1;
}

/** 방울 i가 굳는다: 이웃 꿀사탕과 다리를 놓아 매끈한 면을 만든다 */
function setP(S: Sim, i: number) {
  S.st[i] = SET;
  S.vx[i] = 0;
  S.vy[i] = 0;
  const hx = Math.floor(S.x[i] / HC), hy = Math.floor(S.y[i] / HC);
  for (let ax = hx - 1; ax <= hx + 1; ax++) {
    if (ax < 0 || ax >= HW) continue;
    for (let ay = hy - 1; ay <= hy + 1; ay++) {
      if (ay < 0 || ay >= HH) continue;
      for (let j = HEAD[ay * HW + ax]; j >= 0; j = NEXT[j]) {
        if (j === i || S.st[j] !== SET) continue;
        if (Math.hypot(S.x[i] - S.x[j], S.y[i] - S.y[j]) > PD * 1.22) continue;
        const a = Math.min(i, j), b = Math.max(i, j);
        if (S.bn[a] < BMAX) S.bond[a * BMAX + S.bn[a]++] = b;
      }
    }
  }
}

/** 나뭇잎 시소: 경첩이 뻑뻑해서, 높은 쪽에 꿀 무게가 LEAF_HOLD보다 크게 실려야 그쪽으로 끼익 넘어간다 (안 그러면 그대로) */
function leafStep(L: Level, S: Sim) {
  const lf = L.leaf!;
  let tq = 0;
  const c = Math.cos(S.la), s = Math.sin(S.la);
  for (let i = 0; i < S.n; i++) {
    if (S.st[i] !== LIVE) continue;
    const dx = S.x[i] - lf.px, dy = S.y[i] - lf.py, u = dx * c + dy * s, v = -dx * s + dy * c;
    if (Math.abs(u) > lf.hl + 0.02 || v > 0.005 || v < -0.06) continue;
    tq += u;
  }
  // 무게가 기운 쪽과 반대로 충분히 실리면 넘어가기 시작
  if (S.lav === 0 && Math.abs(tq) > LEAF_HOLD && Math.sign(tq) !== Math.sign(S.la)) S.lav = Math.sign(tq) * 0.004;
  if (S.lav !== 0) {
    S.lav *= 1.12;
    S.la += S.lav;
    if (Math.abs(S.la) >= LEAF_MAX) (S.la = Math.sign(S.la) * LEAF_MAX), (S.lav = 0), (S.flips++);
  }
}

function beeStep(L: Level, S: Sim, hook: Hook) {
  for (let j = 0; j < L.jars.length; j++) {
    if (S.full[j] || S.fill[j] <= 0) continue;
    if (S.t - S.lastIn[j] < BEE_WAIT || S.t - S.beeT[j] < BEE_GAP) continue;
    const k = Math.min(BEE_TAKE, S.fill[j]);
    S.fill[j] -= k;
    S.stolen += k;
    S.beeT[j] = S.t;
    hook?.('bee', L.jars[j].x, L.jars[j].top, j);
  }
}

/** 밀랍 하나를 연다 */
function openRoom(L: Level, S: Sim, r: number) {
  if (S.open[r]) return false;
  S.open[r] = 1;
  S.opened++;
  S.segOn[L.rooms[r].plug] = 0;
  for (let i = 0; i < S.n; i++) if (S.room[i] === r && S.st[i] === SLEEP) S.st[i] = LIVE;
  S.live = 1;
  return true;
}

/** 0 진행 · 1 다 채움(잠잠해짐) · -1 맛이 섞임 · -2 꿀이 모자람 */
function verdict(L: Level, S: Sim): number {
  for (let j = 0; j < L.jars.length; j++) if (S.wrong[j]) return -1;
  const calm = S.live === 0 || S.moved === 0;
  const allFull = L.jars.every((_, j) => S.full[j] === 1);
  if (allFull) return calm && S.live === 0 ? 1 : 0;
  if (S.live > 0) return 0;
  // 잠잠할 때: 닫힌 방의 꿀로 채울 수 있나 (색마다)
  const need = [0, 0], any = [0];
  for (let j = 0; j < L.jars.length; j++) {
    const J = L.jars[j];
    if (S.full[j]) continue;
    const k = J.cap - S.fill[j];
    if (J.c >= 0) need[J.c] += k;
    else any[0] += k;
  }
  const have = [0, 0];
  for (let i = 0; i < S.n; i++) if (S.st[i] === SLEEP) have[S.c[i]]++;
  if (have[0] < need[0] || have[1] < need[1] || have[0] + have[1] < need[0] + need[1] + any[0]) return -2;
  return 0;
}

/** 잠잠해질 때까지 (최대 maxT틱) */
function settle(L: Level, S: Sim, maxT: number, hook: Hook = null) {
  for (let k = 0; k < maxT; k++) {
    phys(L, S, hook);
    if (S.live === 0) break;
  }
  return S;
}

export const _hb = { buildLevel, newSim, cloneSim, phys, openRoom, verdict, settle, PR, FLOOR, A, SLEEP, LIVE, SET, GONE };

// ───────────────────────────── 판 (8판, 판마다 새것 하나) ─────────────────────────────
const NUM = ['영', '한', '두', '세', '네', '다섯', '여섯'];
/** 별 조건: 기호 없는 쉬운 한 줄 말 (29라운드 오너: "조건을 못알아먹겠어. 알기 쉽게 표현해줘") */
export const STAR_TXT: Record<StarKind, (d: StageDef) => string> = {
  fill: () => '단지 모두 채우기',
  nospill: () => '넘치지 않게 채우기',
  plugs: (d) => `밀랍 ${NUM[d.plugs ?? 1]} 개만 열기`,
  nodrop: () => '바닥에 한 방울도 안 흘리기',
  bee: () => '벌에게 꿀 안 뺏기기',
  noburn: () => '뜨거운 돌에 꿀 안 태우기',
};

export const STAGES: StageDef[] = [
  {
    key: 'first', name: '첫 꿀', emoji: '🍯', news: '밀랍을 톡 → 꿀이 주르륵 단지로!', tip: '단지가 눈금까지 차면 뚜껑이 탁!', stars: ['fill'],
    walls: [[0.1, 0.42, 0.62, 0.72]],
    rooms: [[0.3, 0.32, 0.22, 14]],
    jars: [[0.7, 0.15, 0.16, 12]],
  },
  {
    key: 'bridge', name: '꿀사탕 다리', emoji: '🍬', news: '고인 꿀은 굳어 꿀사탕 다리가 돼요', tip: '작은 꿀로 홈을 메우면 다음 꿀이 건너가요', stars: ['fill', 'nospill'],
    walls: [[0.06, 0.36, 0.36, 0.55, 0.38, 0.65, 0.47, 0.65, 0.49, 0.625, 0.80, 0.82]],
    rooms: [[0.2, 0.28, 0.2, 12], [0.43, 0.38, 0.12, 6], [0.66, 0.49, 0.14, 9]],
    jars: [[0.86, 0.15, 0.16, 12]],
    spot: [0.43, 0.62, 0.1],
  },
  {
    key: 'leaftest', name: 'leaf', emoji: '🍃', news: '', tip: '', stars: ['fill'],
    walls: [],
    rooms: [[0.32, 0.3, 0.16, 8], [0.68, 0.3, 0.16, 8]],
    jars: [[0.16, 0.15, 0.16, 6], [0.84, 0.15, 0.16, 6]],
    leaf: [0.5, 0.62, 0.26, -0.03],
  },
];

// ───────────────────────────── 판 진행 ─────────────────────────────
const RESULT_OK = 200, RESULT_FAIL = 160, CARD_T = 170, NEWS_T = 170, SPOT_T = 170;
const STAR_PTS = 100, CLEAR_PTS = 30, WIN_PTS = 200;
/** 밀랍에 손가락이 닿는 반지름 */
const HIT = 0.085;

function starsOf(L: Level, S: Sim): boolean[] {
  const d = L.def, full = L.jars.every((_, j) => S.full[j] === 1) && !S.wrong.some((w) => w);
  return d.stars.map((k) =>
    !full ? false
    : k === 'fill' ? true
    : k === 'nospill' ? S.spilled === 0
    : k === 'plugs' ? S.opened <= (d.plugs ?? 9)
    : k === 'nodrop' ? S.dropped === 0
    : k === 'bee' ? S.stolen === 0
    : S.burned === 0,
  );
}

interface Ev { t: number; kind: string; x: number; y: number; text?: string; a?: number }
export interface HoneyState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'play' | 'result'; pt: number;
  L: Level; S: Sim; flips: boolean[];
  down: boolean; ax: number; ay: number; press: number; lastTap: number; firstTap: boolean; taps: number;
  hearts: number; stars: number; maxStars: number; got: number; starOk: boolean[]; pts: number;
  ok: boolean; why: string; won: boolean; dead: boolean; tries: number; again: boolean;
  seen: Set<string>; newsQ: string[]; news: { text: string; t: number } | null; events: Ev[];
  startT: number; spotT: number; mood: string; moodT: number; bearX: number; setN: number; inN: number[];
  bees: { j: number; t0: number }[];
}

const ev = (s: HoneyState, kind: string, x: number, y: number, text?: string, a?: number) => s.events.push({ t: s.t, kind, x, y, text, a });
function see(s: HoneyState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  s.newsQ.push(text);
}
const setMood = (s: HoneyState, m: string) => ((s.mood = m), (s.moodT = s.t));

function newStage(s: HoneyState) {
  const d = STAGES[s.stage];
  s.L = buildLevel(d, s.flips[s.stage]);
  s.S = newSim(s.L);
  s.phase = 'play';
  s.pt = 0;
  s.press = -1;
  s.startT = s.t;
  s.spotT = d.spot && !s.again ? s.t : -999;
  s.setN = 0;
  s.inN = s.L.jars.map(() => 0);
  s.bees = [];
  s.starOk = d.stars.map(() => false);
  s.got = 0;
  // 곰은 단지가 없는 쪽 바닥에 앉는다
  s.bearX = s.L.jars.some((J) => J.x0 < 0.3) ? 0.86 : 0.14;
  setMood(s, 'idle');
  // 판의 새것은 시작 카드에 바로 보인다
  s.seen.add(d.key);
  ev(s, 'stage', 0.5, 0.6, `${s.stage + 1}판 · ${d.name}`);
}

function hookFor(s: HoneyState): Hook {
  return (kind, x, y, a) => {
    if (kind === 'in') {
      s.inN[a!]++;
      if (s.inN[a!] % 3 === 1) ev(s, 'in', x, y, undefined, a);
      return;
    }
    if (kind === 'set') {
      if (s.setN++ % 4 === 0) ev(s, 'set', x, y);
      if (s.setN === 3) see(s, 'setfirst', '🍬 멈춘 꿀은 굳어서 꿀사탕 땅이 돼요');
      return;
    }
    if (kind === 'full') {
      ev(s, 'full', x, y, '가득! 탁!', a);
      setMood(s, 'yum');
      return;
    }
    if (kind === 'drop') {
      ev(s, a ? 'spill' : 'drop', x, y, a ? '넘쳤다!' : undefined);
      if (Math.abs(x - s.bearX) < 0.16) setMood(s, 'sticky');
      return;
    }
    if (kind === 'bee') {
      s.bees.push({ j: a!, t0: s.t });
      ev(s, 'bee', x, y, '벌이 꿀을 퍼 갔어요!', a);
      setMood(s, 'shock');
      see(s, 'beefirst', '🐝 덜 찬 단지는 벌이 퍼 가요 — 한 번에 채워요');
      return;
    }
    if (kind === 'burn') {
      ev(s, 'burn', x, y);
      return;
    }
    if (kind === 'wrong') ev(s, 'wrong', x, y, '맛이 섞였어요!', a);
  };
}

function endStage(s: HoneyState, ok: boolean, why: string) {
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  s.why = why;
  const d = STAGES[s.stage];
  if (ok) {
    s.starOk = starsOf(s.L, s.S);
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    s.pts += s.got * STAR_PTS + CLEAR_PTS;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    ev(s, 'clear', 0.5, 0.6, s.won ? '꿀단지 다 모았다!' : '다 채웠다!');
    setMood(s, 'gulp');
  } else {
    s.hearts--;
    s.tries++;
    ev(s, 'fail', 0.5, 0.6, why);
    setMood(s, 'dizzy');
  }
  void d;
}

/** 누른 자리에서 가장 가까운 닫힌 밀랍 */
function pickPlug(s: HoneyState, x: number, y: number) {
  let best = -1, bd = HIT;
  s.L.rooms.forEach((R, r) => {
    if (s.S.open[r]) return;
    const d = Math.hypot(R.px - x, R.py - 0.015 - y);
    if (d < bd) (bd = d), (best = r);
  });
  return best;
}

function tapRoom(s: HoneyState, r: number) {
  const R = s.L.rooms[r];
  if (!openRoom(s.L, s.S, r)) return;
  s.lastTap = s.t;
  s.taps++;
  s.firstTap = true;
  ev(s, 'open', R.px, R.py, s.S.opened === 1 ? '콸콸!' : '주르륵!', r);
  setMood(s, 'wow');
}

export const honeybear: GameDef<HoneyState> = {
  id: 'honeybear',
  name: '곰돌이 꿀 흐르기',
  genes: ['flowfill', 'honeyset', 'pointer'],
  twist: '끈적한 꿀은 한 자리에 고이면 굳어 단단한 꿀사탕 땅이 된다 — 먼저 흘린 꿀이 홈을 메워 다리가 되고, 뚜껑을 덮은 단지는 꿀을 옆으로 미끄러뜨려, 여는 순서가 꿀이 갈 길을 바꾼다',
  rules: ['밀랍을 톡 → 꿀이 흘러 단지로! 단지를 눈금까지 모두 채우면 끝.', '고인 꿀은 굳어 꿀사탕 땅이 돼요 — 다음 꿀은 그 위로 미끄러져요.'],
  controls: 'touch',
  hint: '밀랍을 톡! 누르고 있으면 꿀이 갈 길이 보여요 / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '나무 속 벌집 동굴 — 곰돌이의 꿀단지 모으기',
    mood: '오래된 참나무 속 단면, 위쪽 벌집 방들이 호박색으로 빛나고 나무결과 뿌리 사이로 끈적한 꿀이 반짝이며 흘러내린다. 바닥엔 유리 꿀단지가 줄지어 있고, 곰돌이가 침을 흘리며 기다린다.',
    palette: { bg: '#2a170c', ink: '#fff6e0', muted: '#d9b98a', accent: '#ffb627', hot: '#ff5a3c', soft: '#f6dfb0' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const rng = mulberry32(seed);
    const flips = STAGES.map(() => rng() < 0.5);
    const s = {
      rng, seed, t: 0, stage: 0, phase: 'play', pt: 0, flips,
      down: false, ax: 0, ay: 0, press: -1, lastTap: -99, firstTap: false, taps: 0,
      hearts: 3, stars: 0, maxStars: STAGES.reduce((a, d) => a + d.stars.length, 0), got: 0, starOk: [], pts: 0,
      ok: false, why: '', won: false, dead: false, tries: 0, again: false,
      seen: new Set<string>(), newsQ: [], news: null, events: [], startT: 0, spotT: -999, mood: 'idle', moodT: 0, bearX: 0.14, setN: 0, inN: [], bees: [],
    } as unknown as HoneyState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    const p = inp.pointer ?? null, release = !p && s.down;
    if (p) (s.ax = p.x), (s.ay = p.y * A);
    s.down = !!p;
    s.t++;
    s.pt++;
    if (s.newsQ.length && (!s.news || s.t - s.news.t > NEWS_T)) s.news = { text: s.newsQ.shift()!, t: s.t };
    if (s.events.length > 60 || (s.events.length && s.t - s.events[0].t > 150)) s.events = s.events.filter((e) => s.t - e.t < 150);
    if (s.mood !== 'idle' && s.t - s.moodT > (s.mood === 'gulp' || s.mood === 'dizzy' ? 400 : 90)) s.mood = 'idle';
    phys(s.L, s.S, hookFor(s));
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
    if (p) s.press = pickPlug(s, p.x, p.y * A);
    if (release) {
      const r = s.press;
      s.press = -1;
      if (r >= 0) tapRoom(s, r);
      else if (s.ay > 0.12 && s.ay < FLOOR) ev(s, 'miss', s.ax, s.ay, '밀랍을 톡!');
    }
    const v = verdict(s.L, s.S);
    if (v === 1) endStage(s, true, '');
    else if (v === -1) endStage(s, false, '맛이 섞였어요!');
    else if (v === -2) endStage(s, false, s.L.rooms.every((_, r) => s.S.open[r]) ? '꿀이 모자라요!' : '남은 꿀로는 모자라요!');
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
/** 잠잠해질 때까지 기다린 뒤 밀랍 r을 연 결과 */
function afterOpen(L: Level, S0: Sim, r: number) {
  const S = cloneSim(S0);
  openRoom(L, S, r);
  settle(L, S, 1100);
  return S;
}
interface Plan { v: number; seq: number[] }
/** 남은 밀랍을 여는 순서를 모두 내다보고(잠잠해질 때까지 시뮬레이션) 가장 좋은 순서 */
function search(L: Level, S: Sim, depth: number): Plan {
  const v0 = verdict(L, S);
  if (v0 === 1) {
    const st = starsOf(L, S);
    return { v: 100000 + st.filter(Boolean).length * 10000 - S.opened * 100 - S.spilled * 10 - S.dropped, seq: [] };
  }
  if (v0 < 0 || depth === 0) {
    let f = 0;
    L.jars.forEach((J, j) => (f += Math.min(J.cap, S.fill[j])));
    return { v: (v0 < 0 ? -100000 : -50000) + f * 100 - S.dropped, seq: [] };
  }
  let best: Plan = { v: -1e9, seq: [] };
  L.rooms.forEach((_, r) => {
    if (S.open[r]) return;
    const sub = search(L, afterOpen(L, S, r), depth - 1);
    if (sub.v > best.v) best = { v: sub.v, seq: [r, ...sub.seq] };
  });
  return best;
}
const planCache = new Map<string, Plan>();
function planFor(s: HoneyState): number {
  const L = s.L, S = s.S, done: number[] = [];
  L.rooms.forEach((_, r) => S.open[r] && done.push(r));
  const key = `${s.stage}:${L.flip}:${S.opened}:${[...S.fill].join(',')}:${[...S.open].join('')}`;
  let p = planCache.get(key);
  if (!p) {
    p = search(L, S, L.rooms.length - S.opened);
    if (planCache.size > 500) planCache.clear();
    planCache.set(key, p);
  }
  void done;
  return p.seq.length ? p.seq[0] : -1;
}

const NO: Input = { tap: false, dir: 0, pointer: null };
const at = (L: Level, r: number): Input => ({ tap: false, dir: 0, pointer: { x: L.rooms[r].px, y: (L.rooms[r].py - 0.015) / A } });
/** 사람처럼: 꿀이 다 멈추고 조금 지켜본 뒤에 다음 밀랍 */
const ready = (s: HoneyState) => s.phase === 'play' && !s.down && s.S.live === 0 && s.t - s.lastTap > 40 && s.t - s.startT > 50;
const brain = new WeakMap<object, { key: string; r: number }>();
/** 잘하는 봇: 남은 밀랍 여는 순서를 모두 시뮬레이션해 보고 별이 가장 많은 순서대로 연다 */
export const honeybearSmart: Bot<HoneyState> = {
  name: '꿀 박사',
  act(s) {
    if (!ready(s)) return NO;
    const key = `${s.stage}:${s.tries}:${s.S.opened}`;
    let m = brain.get(s);
    if (!m || m.key !== key) brain.set(s, (m = { key, r: planFor(s) }));
    return m.r >= 0 && !s.S.open[m.r] ? at(s.L, m.r) : NO;
  },
};
/** 버릇 봇(측정용): 아직 안 찬 단지에 가장 가까운(가로로) 밀랍부터 */
export function habitNear(L: Level, S: Sim) {
  let best = -1, bd = 9;
  L.rooms.forEach((R, r) => {
    if (S.open[r]) return;
    for (let j = 0; j < L.jars.length; j++) if (!S.full[j]) bd > Math.abs(R.px - L.jars[j].x) && ((bd = Math.abs(R.px - L.jars[j].x)), (best = r));
  });
  return best;
}
/** 독립 버릇 봇: 꿀이 가장 많은 방부터 */
export function habitBig(L: Level, S: Sim) {
  let best = -1, bn = -1;
  L.rooms.forEach((R, r) => !S.open[r] && R.n > bn && ((bn = R.n), (best = r)));
  return best;
}
export const honeybearHabit: Bot<HoneyState> = {
  name: '버릇: 단지 가까운 밀랍부터',
  act(s) {
    if (!ready(s)) return NO;
    const r = habitNear(s.L, s.S);
    return r >= 0 ? at(s.L, r) : NO;
  },
};
export const honeybearHabitBig: Bot<HoneyState> = {
  name: '버릇: 큰 꿀방부터',
  act(s) {
    if (!ready(s)) return NO;
    const r = habitBig(s.L, s.S);
    return r >= 0 ? at(s.L, r) : NO;
  },
};
const dumbMem = new WeakMap<object, { next: number; hold: number; p: { x: number; y: number } }>();
/** 못하는 봇: 아무 때나 아무 밀랍(가끔은 아무 데나) 톡 — 꿀이 멈추길 기다리지도 않는다 */
export const honeybearRandom: Bot<HoneyState> = {
  name: '아무 밀랍이나 톡',
  act(s, rng) {
    let m = dumbMem.get(s);
    if (!m) dumbMem.set(s, (m = { next: s.t + 40 + Math.floor(rng() * 80), hold: 0, p: { x: 0, y: 0 } }));
    if (m.hold > 0) return --m.hold > 0 ? { tap: false, dir: 0, pointer: m.p } : NO;
    if (s.t < m.next || s.phase !== 'play') return NO;
    m.next = s.t + 50 + Math.floor(rng() * 150);
    const closed = s.L.rooms.map((_, r) => r).filter((r) => !s.S.open[r]);
    if (rng() < 0.2 || !closed.length) m.p = { x: rng(), y: rng() };
    else {
      const R = s.L.rooms[closed[Math.floor(rng() * closed.length)]];
      m.p = { x: R.px + (rng() - 0.5) * 0.04, y: (R.py - 0.015 + (rng() - 0.5) * 0.04) / A };
    }
    m.hold = 2 + Math.floor(rng() * 4);
    return { tap: false, dir: 0, pointer: m.p };
  },
};

export const _game = { starsOf, search, afterOpen, habitNear, habitBig, STAR_TXT };

// ───────────────────────────── 그리기 ─────────────────────────────
function drawAll(ctx: CanvasRenderingContext2D, s: HoneyState, w: number, h: number, th: Theme) {
  const fx = juice(s), L = s.L, S = s.S;
  const X = (v: number) => v * w;
  ctx.save();
  fx.begin(ctx);
  ctx.fillStyle = th.bg;
  ctx.fillRect(0, 0, w, h);
  for (const g of L.segs) {
    ctx.strokeStyle = ['#8a5a32', '#e58a2a', '#ffe08a', '#bfe3ff', '#5cbf55', '#ff5a3c', '#f2f2f2'][g.m];
    ctx.lineWidth = Math.max(1, g.r * 2 * w);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(X(g.x1), X(g.y1));
    ctx.lineTo(X(g.x2), X(g.y2));
    ctx.stroke();
  }
  for (let i = 0; i < S.n; i++) {
    if (S.st[i] === GONE) continue;
    ctx.fillStyle = S.st[i] === SET ? '#d9661a' : S.c[i] ? '#ff7ab0' : '#ffcc33';
    ctx.beginPath();
    ctx.arc(X(S.x[i]), X(S.y[i]), PR * w, 0, 7);
    ctx.fill();
  }
  ctx.restore();
}
