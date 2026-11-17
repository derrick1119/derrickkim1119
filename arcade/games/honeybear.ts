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
    if (tl === 0) lid.push(sw(x0 - 0.016, ly + 0.004, X, ly - lh * 1.2, LID, 0.009), sw(X, ly - lh * 1.2, x1 + 0.016, ly + 0.004, LID, 0.009));
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
  /** 1 뚜껑에 닿음 · 4 방을 나옴 · 8 단지에 들어감 · 16 뚜껑 위에서 굳음 · 32 바닥에 떨어짐 */
  fl: Uint8Array; lx: Float64Array; ly: Float64Array;
  /** 굳은 꿀사탕끼리 이은 다리(매끈한 면): 방울마다 자기보다 번호 큰 이웃 최대 BMAX개 */
  bond: Int32Array; bn: Uint8Array;
  open: Uint8Array; segOn: Uint8Array;
  fill: Int32Array; full: Uint8Array; wrong: Uint8Array; lastIn: Int32Array; beeT: Int32Array;
  la: number; lav: number; flips: number;
  dropped: number; burned: number; stolen: number; opened: number; live: number; moved: number;
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
    dropped: 0, burned: 0, stolen: 0, opened: 0, live: 0, moved: 0,
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
          S.fl[i] |= 8;
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
        S.fl[i] |= 32;
        S.dropped++;
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
          for (let k = 0; k < CN[i]; k++) if (CM[i * MAXC + k] === LID) S.fl[i] |= 16;
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

/** 넘친 꿀: 닫힌 뚜껑에 닿았다가 바닥에 떨어졌거나 뚜껑 위에서 굳은 꿀 (뚜껑을 타고 다른 단지로 가면 괜찮다) */
export function spillOf(S: Sim) {
  let k = 0;
  for (let i = 0; i < S.n; i++) if (S.fl[i] & 1 && S.fl[i] & 48) k++;
  return k;
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
    rooms: [[0.2, 0.28, 0.2, 15], [0.43, 0.38, 0.12, 6], [0.66, 0.49, 0.14, 8]],
    jars: [[0.86, 0.15, 0.16, 12]],
    spot: [0.43, 0.62, 0.1],
  },
  {
    key: 'dome', name: '뚜껑 미끄럼', emoji: '🫙', news: '꽉 찬 단지 뚜껑에 떨어진 꿀은 미끄러져요', tip: '뚜껑 오른쪽에 떨어진 꿀은 옆 단지로 굴러가요', stars: ['fill', 'nospill', 'plugs'], plugs: 2,
    walls: [[0.06, 0.40, 0.44, 0.62], [0.94, 0.40, 0.565, 0.62], [0.585, 0.9, 0.77, 1.0]],
    rooms: [[0.22, 0.33, 0.16, 7], [0.76, 0.33, 0.18, 10], [0.88, 0.62, 0.13, 12]],
    jars: [[0.5, 0.13, 0.13, 7, -1, 0.24, 0], [0.82, 0.15, 0.16, 10]],
    spot: [0.5, 0.86, 0.1],
  },
  {
    key: 'leaf', name: '나뭇잎 시소', emoji: '🍃', news: '나뭇잎은 꿀이 많이 실린 쪽으로 기울어요', tip: '꿀이 적으면 나뭇잎을 못 넘겨요 — 기운 쪽으로 미끄러져요', stars: ['fill', 'nospill', 'plugs'], plugs: 2,
    walls: [],
    rooms: [[0.2, 0.36, 0.14, 8], [0.42, 0.3, 0.12, 6], [0.68, 0.32, 0.17, 11]],
    jars: [[0.24, 0.15, 0.16, 6], [0.76, 0.15, 0.16, 11]],
    leaf: [0.5, 0.64, 0.25, -1],
    spot: [0.5, 0.64, 0.17],
  },
  {
    key: 'bees', name: '꿀벌 손님', emoji: '🐝', news: '덜 찬 단지는 벌이 와서 퍼 가요', tip: '홈을 먼저 메우고, 단지는 한 번에 채워요', stars: ['fill', 'bee', 'plugs'], plugs: 2,
    walls: [[0.06, 0.36, 0.36, 0.55, 0.38, 0.65, 0.47, 0.65, 0.49, 0.625, 0.80, 0.82]],
    rooms: [[0.2, 0.28, 0.2, 15], [0.43, 0.38, 0.12, 6], [0.84, 0.4, 0.14, 6]],
    jars: [[0.86, 0.15, 0.16, 12]],
    bees: true,
    spot: [0.5, 0.15, 0.12],
  },
  {
    key: 'color', name: '꽃꿀 두 가지', emoji: '🌸', news: '꽃마다 꿀 맛이 달라요 — 같은 꽃 단지에만!', tip: '노란 단지를 먼저 채우면 분홍 꿀이 뚜껑을 타고 넘어가요', stars: ['fill', 'nospill', 'plugs'], plugs: 2,
    walls: [[0.06, 0.38, 0.40, 0.60], [0.94, 0.40, 0.62, 0.58, 0.47, 0.66], [0.56, 0.92, 0.74, 1.01]],
    rooms: [[0.2, 0.3, 0.17, 8, 0], [0.74, 0.3, 0.17, 11, 1], [0.53, 0.3, 0.12, 6, 0]],
    jars: [[0.44, 0.14, 0.14, 8, 0, 0.22, 1], [0.84, 0.15, 0.16, 10, 1]],
    spot: [0.44, 0.92, 0.11],
  },
  {
    key: 'hot', name: '뜨거운 돌', emoji: '🔥', news: '뜨거운 돌에 닿은 꿀은 안 굳고 지글지글 타요', tip: '큰 꿀로 나뭇잎을 먼저 넘기면 작은 꿀도 따라가요', stars: ['fill', 'noburn', 'nospill'],
    walls: [[0.04, 0.80, 0.16, 0.86, 0.17, 0.92, 0.27, 0.92, 0.28, 0.86, 0.32, 0.84], [0.68, 0.78, 0.85, 0.88]],
    rooms: [[0.42, 0.32, 0.12, 6], [0.66, 0.3, 0.16, 10], [0.89, 0.44, 0.12, 13]],
    jars: [[0.87, 0.15, 0.16, 16]],
    leaf: [0.5, 0.62, 0.25, -1],
    hot: [[0.22, 0.9, 0.04]],
    spot: [0.22, 0.88, 0.09],
  },
  {
    key: 'all', name: '곰돌이 잔치', emoji: '🎉', news: '마지막 판 — 다리·뚜껑·벌 모두 나와요!', tip: '다리를 먼저, 단지는 한 번에, 뚜껑을 이용해요', stars: ['fill', 'bee', 'nospill'],
    walls: [[0.06, 0.36, 0.36, 0.55, 0.38, 0.65, 0.47, 0.65, 0.49, 0.625, 0.62, 0.70]],
    rooms: [[0.2, 0.28, 0.2, 12], [0.43, 0.38, 0.12, 6], [0.8, 0.3, 0.16, 10], [0.62, 0.44, 0.12, 6]],
    jars: [[0.66, 0.13, 0.13, 7, -1, 0.2, 1], [0.86, 0.15, 0.16, 10]],
    bees: true,
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
    : k === 'nospill' ? spillOf(S) === 0
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
  // 곰은 단지 사이 가장 넓은 빈 바닥에 앉는다
  const xs = [0.03, ...s.L.jars.flatMap((J) => [J.x0 - 0.03, J.x1 + 0.03]).sort((a, b) => a - b), 0.97];
  let gap = -1;
  for (let k = 0; k + 1 < xs.length; k += 2) if (xs[k + 1] - xs[k] > gap) (gap = xs[k + 1] - xs[k]), (s.bearX = (xs[k] + xs[k + 1]) / 2);
  s.bearX = Math.max(0.13, Math.min(0.87, s.bearX));
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
    s.pts += s.got * s.got * STAR_PTS + CLEAR_PTS;
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
    return { v: 100000 + st.filter(Boolean).length * 10000 - S.opened * 100 - spillOf(S) * 10 - S.dropped, seq: [] };
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
const ready = (s: HoneyState) => s.phase === 'play' && !s.down && s.S.live === 0 && s.t - s.lastTap > 40 && s.t - s.startT > 90;
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

// ───────────────────────────── 미리 보기 (누르는 동안) ─────────────────────────────
interface Preview { trails: number[][]; candy: number[]; jars: number[]; full: number[]; spill: number; drop: number; dropX: number; burn: number; la: number; v: number; key: string }
const pvCache = new WeakMap<object, Preview>();
/** 지금 이 밀랍을 열면? — 실제와 똑같은 시뮬레이션을 잠잠해질 때까지 돌려 본다 */
function preview(s: HoneyState, r: number): Preview {
  const S0 = s.S, key = `${s.stage}:${s.tries}:${r}:${S0.opened}:${S0.live ? Math.floor(s.t / 15) : 0}`, c = pvCache.get(s);
  if (c && c.key === key) return c;
  const L = s.L, S = cloneSim(S0), was = S0.st.slice(), f0 = S0.fill.slice(), sp0 = spillOf(S0), dr0 = S0.dropped, bu0 = S0.burned;
  openRoom(L, S, r);
  const watch: number[] = [];
  for (let i = 0; i < S.n; i++) if (S.room[i] === r && was[i] === SLEEP) watch.push(i);
  const pick = watch.filter((_, k) => k % 3 === 0 || k === watch.length - 1);
  const trails = pick.map((i) => [S.x[i], S.y[i]]);
  let dropX = 0, dn = 0;
  const hook: Hook = (kind, x) => kind === 'drop' && ((dropX += x), dn++);
  for (let k = 0; k < 1000; k++) {
    phys(L, S, hook);
    if (k % 5 === 4) pick.forEach((i, q) => S.st[i] === LIVE && trails[q].push(S.x[i], S.y[i]));
    if (S.live === 0) break;
  }
  pick.forEach((i, q) => S.st[i] !== GONE && trails[q].push(S.x[i], S.y[i]));
  const candy: number[] = [];
  for (let i = 0; i < S.n; i++) if (S.st[i] === SET && was[i] !== SET) candy.push(S.x[i], S.y[i]);
  const p: Preview = {
    trails, candy, jars: L.jars.map((_, j) => S.fill[j] - f0[j]), full: L.jars.map((_, j) => S.full[j] - S0.full[j]),
    spill: spillOf(S) - sp0, drop: Math.max(0, S.dropped - dr0 - (spillOf(S) - sp0)), dropX: dn ? dropX / dn : 0.5, burn: S.burned - bu0, la: S.la, v: verdict(L, S), key,
  };
  pvCache.set(s, p);
  return p;
}

// ───────────────────────────── 그리기 ─────────────────────────────
const TAU = Math.PI * 2;
const hsh = (k: number) => {
  const v = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
const HONEY = ['#ffc21a', '#ff8fbf'], HONEY_D = ['#d98300', '#d6407e'], HONEY_L = ['#fff2a6', '#ffd6ea'];
const CANDY_C = ['#e7861c', '#e0568f'], CANDY_D = ['#a24e0c', '#9c2c5c'];
const FLOWER = ['🌼', '🌸'];
const recentSay = new WeakMap<object, { x: number; y: number; t: number }[]>();

type Fn = (v: number) => number;
function drawAll(ctx: CanvasRenderingContext2D, s: HoneyState, w: number, h: number, th: Theme) {
  const fx = juice(s), L = s.L, S = s.S, d = STAGES[s.stage], t = s.t;
  const X: Fn = (v) => v * w, Y: Fn = (v) => v * w, R: Fn = (v) => v * w;
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  ctx.save();
  fx.begin(ctx);
  drawCave(ctx, s, w, h, X, Y, R);
  // ═════ 미리 보기 계산 ═════
  const pressR = s.down && s.phase === 'play' && s.press >= 0 && !S.open[s.press] ? s.press : -1;
  const pv = pressR >= 0 ? preview(s, pressR) : null;
  // ═════ 꿀방 ═════
  L.rooms.forEach((Rm, r) => drawRoom(ctx, s, Rm, r, X, Y, R, font, r === pressR));
  // ═════ 선반·뿌리 ═════
  drawLedges(ctx, L, S, X, Y, R, t);
  // ═════ 뜨거운 돌 ═════
  for (const hs of L.hot) drawHot(ctx, hs, X, Y, R, t);
  // ═════ 나뭇잎 ═════
  if (L.leaf) drawLeaf(ctx, L.leaf, S.la, X, Y, R, 1);
  // ═════ 단지 (뒤쪽: 유리 뒤판) ═════
  L.jars.forEach((J, j) => drawJar(ctx, s, J, j, X, Y, R, font));
  // ═════ 꿀 ═════
  drawHoney(ctx, S, X, Y, R, t);
  // ═════ 곰 ═════
  drawBear(ctx, s, X(s.bearX), Y(FLOOR + 0.02), R(0.2), t);
  // ═════ 벌 ═════
  if (d.bees) drawBees(ctx, s, X, Y, R, t);
  // ═════ 미리 보기 ═════
  if (pv && pressR >= 0) drawPreview(ctx, s, pv, X, Y, R, font);
  // 가장자리 어둡게
  const vg = ctx.createRadialGradient(w / 2, h * 0.48, R(0.4), w / 2, h * 0.48, R(1.0));
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(15,6,0,.42)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
  // ═════ 사건 연출 ═════
  const say = (x: number, y: number, text: string, col: string, size: number) => {
    let rec = recentSay.get(s);
    if (!rec) recentSay.set(s, (rec = []));
    y = Math.max(Y(0.16), Math.min(Y(1.2), y));
    for (let k = 0; k < 6 && rec.some((q) => t - q.t < 40 && Math.abs(q.x - x) < w * 0.3 && Math.abs(q.y - y) < size + 4); k++) y -= size + 5;
    rec.push({ x, y, t });
    if (rec.length > 12) rec.shift();
    ctx.font = `800 ${size}px system-ui, sans-serif`;
    const hw = ctx.measureText(text).width / 2 + 6;
    fx.pop(Math.max(hw, Math.min(w - hw, x)), y, text, col, size);
  };
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const x = X(e.x), y = Y(e.y);
    if (e.kind === 'open') {
      fx.burst(x, y, '#ffe9a8', 16, 3, 2.4), fx.burst(x, y, '#ffc21a', 14, 2.6, 2.6), fx.ring(x, y, '#fff1b8', R(0.12), 4), fx.kick(S.opened === 1 ? 5 : 3);
      say(x, y + R(0.06), e.text!, '#fff1a8', 20);
    }
    if (e.kind === 'in') fx.burst(x, y, '#ffd34a', 4, 1.4, 1.6);
    if (e.kind === 'full') fx.burst(x, y, '#ffe066', 26, 4, 2.8), fx.ring(x, y, '#ffe066', R(0.16), 5), fx.kick(4), say(x, y - R(0.06), e.text!, '#fff1a8', 18);
    if (e.kind === 'set') fx.burst(x, y, '#ffb347', 5, 1.2, 1.4), (fx.memo.setT ?? -99) < t - 50 && ((fx.memo.setT = t), say(x, y - R(0.05), '굳었다!', '#ffd9a0', 14));
    if (e.kind === 'spill') fx.burst(x, y, '#ffc21a', 8, 2, 2), (fx.memo.spT ?? -99) < t - 40 && ((fx.memo.spT = t), say(x, y - R(0.08), e.text!, '#ffb3a8', 15));
    if (e.kind === 'drop') fx.burst(x, y, '#ffc21a', 6, 1.8, 1.8);
    if (e.kind === 'bee') fx.ring(x, y, '#ffe066', R(0.1), 3), fx.kick(2), say(x, y - R(0.09), e.text!, '#ffd0a8', 15);
    if (e.kind === 'burn') fx.burst(x, y, '#ff7a3c', 6, 1.6, 1.8), fx.burst(x, y - R(0.02), 'rgba(220,220,220,.8)', 3, 1, 2.4), (fx.memo.buT ?? -99) < t - 50 && ((fx.memo.buT = t), say(x, y - R(0.06), '지글지글!', '#ffb08a', 15));
    if (e.kind === 'wrong') fx.kick(8), fx.blink(th.hot, 0.25), say(x, y - R(0.08), e.text!, '#ffb3a8', 18);
    if (e.kind === 'miss') say(x, y, e.text!, '#fff1d6', 14);
    if (e.kind === 'stage') fx.blink('#fff3d6', 0.15);
    if (e.kind === 'clear') fx.burst(X(0.5), Y(0.62), '#ffe066', 44, 6, 3.2), fx.burst(X(0.5), Y(0.62), '#ff9fc4', 26, 5, 3), fx.ring(X(0.5), Y(0.62), '#ffe066', R(0.36), 6), fx.blink('#fff6c8', 0.22), fx.kick(4);
    if (e.kind === 'fail') fx.kick(9), fx.blink(th.hot, 0.22);
  }
  fx.memo.t = t;
  ctx.restore();
  drawHud(ctx, s, d, w, h, X, Y, R, font, th, pv);
}

function drawCave(ctx: CanvasRenderingContext2D, s: HoneyState, w: number, h: number, X: Fn, Y: Fn, R: Fn) {
  const t = s.t;
  // 나무 속 벽: 따뜻한 갈색, 위쪽 벌집 빛
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#3b2210');
  g.addColorStop(0.45, '#4a2c15');
  g.addColorStop(1, '#2a170b');
  ctx.fillStyle = g;
  ctx.fillRect(-10, -10, w + 20, h + 20);
  // 나무결 (세로로 일렁이는 결)
  ctx.lineWidth = 1.2;
  for (let k = 0; k < 16; k++) {
    const x0 = 0.04 + (k / 15) * 0.92;
    ctx.strokeStyle = `rgba(${k % 2 ? '120,72,34' : '30,14,4'},${0.18 + 0.1 * hsh(k)})`;
    ctx.beginPath();
    for (let y = 0.08; y <= 1.27; y += 0.04) ctx.lineTo(X(x0 + 0.012 * Math.sin(y * 7 + k * 1.3) + 0.006 * Math.sin(y * 19 + k)), Y(y));
    ctx.stroke();
  }
  // 옹이
  for (const [kx, ky, kr] of [[0.82, 0.52, 0.035], [0.2, 0.86, 0.028], [0.62, 0.98, 0.022]]) {
    for (let q = 3; q > 0; q--) {
      ctx.strokeStyle = `rgba(25,10,2,${0.16 + q * 0.05})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(X(kx), Y(ky), R(kr * (q / 3) * 1.4), R(kr * (q / 3) * 2), 0, 0, TAU);
      ctx.stroke();
    }
  }
  // 위쪽 벌집 무늬 (희미한 육각)
  ctx.strokeStyle = 'rgba(255,190,90,.07)';
  ctx.lineWidth = 1;
  const hr = 0.032;
  for (let row = 0; row < 9; row++)
    for (let col = 0; col < 13; col++) {
      const cx = col * hr * 1.73 + (row % 2) * hr * 0.865, cy = 0.1 + row * hr * 1.5;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) ctx.lineTo(X(cx + Math.cos((k / 6) * TAU + Math.PI / 6) * hr), Y(cy + Math.sin((k / 6) * TAU + Math.PI / 6) * hr));
      ctx.closePath();
      ctx.stroke();
    }
  // 벌집 빛 번짐
  const glow = ctx.createRadialGradient(X(0.5), Y(0.22), R(0.05), X(0.5), Y(0.4), R(0.85));
  glow.addColorStop(0, 'rgba(255,190,80,.32)');
  glow.addColorStop(0.55, 'rgba(255,160,60,.08)');
  glow.addColorStop(1, 'rgba(255,150,50,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  // 나무껍질 벽 (양옆, 두께)
  for (const side of [0, 1]) {
    const x0 = side ? X(0.97) - 2 : -2, ww = X(0.03) + 4;
    const bg = ctx.createLinearGradient(side ? x0 : x0 + ww, 0, side ? x0 + ww : x0, 0);
    bg.addColorStop(0, '#5a3418');
    bg.addColorStop(1, '#2b1607');
    ctx.fillStyle = bg;
    ctx.fillRect(x0, 0, ww, h);
    ctx.strokeStyle = 'rgba(0,0,0,.35)';
    for (let k = 0; k < 14; k++) {
      ctx.beginPath();
      const yy = Y(0.05 + k * 0.09 + hsh(k + side * 20) * 0.03);
      ctx.moveTo(x0 + 2, yy);
      ctx.lineTo(x0 + ww - 2, yy + R(0.02));
      ctx.stroke();
    }
  }
  // 바닥: 흙과 뿌리
  const fy = Y(FLOOR);
  const gg = ctx.createLinearGradient(0, fy, 0, h);
  gg.addColorStop(0, '#4b2e17');
  gg.addColorStop(0.3, '#2c1a0c');
  gg.addColorStop(1, '#1b0f06');
  ctx.fillStyle = gg;
  ctx.fillRect(0, fy, w, h - fy);
  ctx.fillStyle = 'rgba(255,220,160,.12)';
  ctx.fillRect(0, fy, w, 2);
  ctx.strokeStyle = 'rgba(120,80,40,.55)';
  ctx.lineWidth = 3;
  for (let k = 0; k < 5; k++) {
    ctx.beginPath();
    const x0 = 0.1 + k * 0.2;
    ctx.moveTo(X(x0), fy + 2);
    ctx.quadraticCurveTo(X(x0 + 0.05), Y(FLOOR + 0.02 + hsh(k) * 0.02), X(x0 + 0.1), fy + 3);
    ctx.stroke();
  }
  // 흘린 꿀 웅덩이 (바닥)
  // 떠다니는 꽃가루
  for (let k = 0; k < 22; k++) {
    const px = 0.06 + hsh(k + 40) * 0.88, py = 0.12 + ((hsh(k + 50) * 1.1 + t * 0.0003 * (1 + (k % 3))) % 1.1);
    ctx.fillStyle = `rgba(255,220,140,${0.15 + 0.25 * Math.abs(Math.sin(t / 50 + k))})`;
    ctx.beginPath();
    ctx.arc(X(px + 0.01 * Math.sin(t / 80 + k)), Y(py), R(0.003 + 0.002 * (k % 2)), 0, TAU);
    ctx.fill();
  }
}

function drawLedges(ctx: CanvasRenderingContext2D, L: Level, S: Sim, X: Fn, Y: Fn, R: Fn, t: number) {
  void t;
  const segs = L.segs.filter((g, k) => g.m === BARK && S.segOn[k] && g.x1 > 0.035 && g.x1 < 0.965 && g.y2 < FLOOR);
  // 두께 (아래로 내린 어두운 면) → 몸통 → 윗면 빛
  for (const pass of [0, 1, 2, 3]) {
    for (const g of segs) {
      ctx.lineCap = 'round';
      const dy = pass === 0 ? R(0.012) : 0;
      ctx.strokeStyle = pass === 0 ? 'rgba(0,0,0,.35)' : pass === 1 ? '#5b3519' : pass === 2 ? '#7d4c26' : 'rgba(255,214,150,.45)';
      ctx.lineWidth = pass === 0 ? R(g.r * 2.6) : pass === 1 ? R(g.r * 2.6) : pass === 2 ? R(g.r * 1.7) : 1.6;
      ctx.beginPath();
      if (pass === 3) {
        const nx = g.y2 - g.y1, ny = -(g.x2 - g.x1), nl = Math.hypot(nx, ny) || 1, o = g.r * 1.05;
        const sx = (nx / nl) * o * (ny < 0 ? 1 : -1), sy = (ny / nl) * o * (ny < 0 ? 1 : -1);
        ctx.moveTo(X(g.x1 + sx), Y(g.y1 + sy));
        ctx.lineTo(X(g.x2 + sx), Y(g.y2 + sy));
      } else {
        ctx.moveTo(X(g.x1), Y(g.y1) + dy);
        ctx.lineTo(X(g.x2), Y(g.y2) + dy);
      }
      ctx.stroke();
    }
  }
  // 이끼 몇 줌
  segs.forEach((g, k) => {
    if (k % 2) return;
    const u = 0.3 + hsh(k) * 0.4, mx = g.x1 + (g.x2 - g.x1) * u, my = g.y1 + (g.y2 - g.y1) * u - g.r;
    ctx.fillStyle = '#5f8f3a';
    for (let q = 0; q < 3; q++) (ctx.beginPath(), ctx.arc(X(mx + (q - 1) * 0.008), Y(my - 0.003 * (q % 2)), R(0.006), 0, TAU), ctx.fill());
  });
}

function drawRoom(ctx: CanvasRenderingContext2D, s: HoneyState, Rm: Room, r: number, X: Fn, Y: Fn, R: Fn, font: (sz: number, wgt?: number) => void, hot: boolean) {
  const S = s.S, open = !!S.open[r], t = s.t;
  const l = Rm.x - Rm.w / 2, top = Rm.y - Rm.h / 2, b = Rm.y + Rm.h / 2;
  // 그림자
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.beginPath();
  ctx.roundRect(X(l) + R(0.008), Y(top) + R(0.01), R(Rm.w), R(Rm.h + 0.06), R(0.02));
  ctx.fill();
  // 방 안 (벌집 칸)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(X(l), Y(top));
  ctx.lineTo(X(l + Rm.w), Y(top));
  ctx.lineTo(X(l + Rm.w), Y(b));
  ctx.lineTo(X(Rm.x + 0.042), Y(Rm.py));
  ctx.lineTo(X(Rm.x - 0.042), Y(Rm.py));
  ctx.lineTo(X(l), Y(b));
  ctx.closePath();
  const ig = ctx.createLinearGradient(0, Y(top), 0, Y(Rm.py));
  ig.addColorStop(0, '#6b3d12');
  ig.addColorStop(1, '#4a280a');
  ctx.fillStyle = ig;
  ctx.fill();
  ctx.clip();
  ctx.strokeStyle = 'rgba(255,214,120,.22)';
  ctx.lineWidth = 1;
  const hr = 0.018;
  for (let row = 0; row < 12; row++)
    for (let col = 0; col < 10; col++) {
      const cx = l + col * hr * 1.73 + (row % 2) * hr * 0.865, cy = top + row * hr * 1.5;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) ctx.lineTo(X(cx + Math.cos((k / 6) * TAU + Math.PI / 6) * hr), Y(cy + Math.sin((k / 6) * TAU + Math.PI / 6) * hr));
      ctx.closePath();
      ctx.stroke();
    }
  ctx.restore();
  // 밀랍 벽 (두께)
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const [col, lw] of [['#a8701e', 0.021], ['#f4c95a', 0.015], ['#fff0b0', 0.005]] as const) {
    ctx.strokeStyle = col;
    ctx.lineWidth = R(lw);
    ctx.beginPath();
    ctx.moveTo(X(Rm.x - 0.042), Y(Rm.py));
    ctx.lineTo(X(l), Y(b));
    ctx.lineTo(X(l), Y(top));
    ctx.lineTo(X(l + Rm.w), Y(top));
    ctx.lineTo(X(l + Rm.w), Y(b));
    ctx.lineTo(X(Rm.x + 0.042), Y(Rm.py));
    ctx.stroke();
  }
  // 밀랍 마개
  if (!open) {
    const px = X(Rm.px), py = Y(Rm.py), pr = R(0.05);
    const pulse = s.stage === 0 && !s.firstTap ? 1 + 0.08 * Math.sin(t * 0.18) : 1;
    if (hot || (s.stage === 0 && !s.firstTap)) {
      ctx.strokeStyle = hot ? '#ffffff' : `rgba(255,240,180,${0.5 + 0.4 * Math.sin(t * 0.18)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(px, py - R(0.008), pr * 1.25 * pulse, 0, TAU);
      ctx.stroke();
    }
    ctx.save();
    ctx.translate(px, py - R(0.008));
    ctx.scale(pulse, pulse);
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath();
    for (let k = 0; k < 6; k++) ctx.lineTo(Math.cos((k / 6) * TAU) * pr + R(0.004), Math.sin((k / 6) * TAU) * pr * 0.78 + R(0.008));
    ctx.fill();
    const wg = ctx.createLinearGradient(0, -pr, 0, pr);
    wg.addColorStop(0, '#fff3c0');
    wg.addColorStop(0.5, '#ffd76a');
    wg.addColorStop(1, '#c98e22');
    ctx.fillStyle = wg;
    ctx.beginPath();
    for (let k = 0; k < 6; k++) ctx.lineTo(Math.cos((k / 6) * TAU) * pr, Math.sin((k / 6) * TAU) * pr * 0.78);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#8a5a12';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.beginPath();
    ctx.ellipse(-pr * 0.3, -pr * 0.35, pr * 0.32, pr * 0.14, -0.3, 0, TAU);
    ctx.fill();
    // 꿀 양 (방울 수)
    ctx.fillStyle = '#5a3208';
    font(0.036, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(Rm.n), 0, R(0.004));
    ctx.restore();
    if (Rm.c === 1) {
      ctx.font = `${Math.max(12, R(0.04))}px system-ui, sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(FLOWER[1], X(l + Rm.w) - R(0.008), Y(top) + R(0.012));
    }
  } else {
    // 열린 자리: 부스러진 밀랍
    ctx.fillStyle = '#e8b64a';
    for (let k = 0; k < 4; k++) (ctx.beginPath(), ctx.arc(X(Rm.px + (k - 1.5) * 0.024), Y(Rm.py + 0.006 + (k % 2) * 0.004), R(0.006), 0, TAU), ctx.fill());
  }
}

function drawHoney(ctx: CanvasRenderingContext2D, S: Sim, X: Fn, Y: Fn, R: Fn, t: number) {
  const n = S.n, { x, y, st, c } = S;
  // ① 굳은 꿀사탕: 다리(선) + 알갱이, 호박색 유리처럼
  ctx.lineCap = 'round';
  for (const pass of [0, 1]) {
    for (let i = 0; i < n; i++) {
      if (st[i] !== SET) continue;
      ctx.strokeStyle = pass ? CANDY_C[c[i]] : CANDY_D[c[i]];
      ctx.lineWidth = R(PR * (pass ? 1.85 : 2.3));
      for (let b = 0; b < S.bn[i]; b++) {
        const k = S.bond[i * BMAX + b];
        ctx.beginPath();
        ctx.moveTo(X(x[i]), Y(y[i]));
        ctx.lineTo(X(x[k]), Y(y[k]));
        ctx.stroke();
      }
      ctx.fillStyle = pass ? CANDY_C[c[i]] : CANDY_D[c[i]];
      ctx.beginPath();
      ctx.arc(X(x[i]), Y(y[i]), R(PR * (pass ? 0.95 : 1.15)), 0, TAU);
      ctx.fill();
    }
  }
  for (let i = 0; i < n; i++) {
    if (st[i] !== SET) continue;
    ctx.fillStyle = 'rgba(255,240,200,.55)';
    ctx.beginPath();
    ctx.ellipse(X(x[i] - PR * 0.3), Y(y[i] - PR * 0.35), R(PR * 0.35), R(PR * 0.18), -0.5, 0, TAU);
    ctx.fill();
    if ((i * 7 + Math.floor(t / 12)) % 23 === 0) {
      // 반짝
      const sx = X(x[i] + PR * 0.3), sy = Y(y[i] - PR * 0.4), q = R(0.01);
      ctx.strokeStyle = '#fffbe0';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(sx - q, sy);
      ctx.lineTo(sx + q, sy);
      ctx.moveTo(sx, sy - q);
      ctx.lineTo(sx, sy + q);
      ctx.stroke();
    }
  }
  // ② 흐르는 꿀 + 방 안의 꿀: 가까운 방울끼리 이어 한 덩어리처럼
  const live: number[] = [];
  for (let i = 0; i < n; i++) if (st[i] === LIVE || st[i] === SLEEP) live.push(i);
  for (const pass of [0, 1]) {
    ctx.lineCap = 'round';
    for (let a = 0; a < live.length; a++) {
      const i = live[a];
      for (let b2 = a + 1; b2 < live.length; b2++) {
        const j = live[b2], dd = Math.hypot(x[i] - x[j], y[i] - y[j]);
        if (dd > PD * 1.55) continue;
        ctx.strokeStyle = pass ? HONEY[c[i]] : HONEY_D[c[i]];
        ctx.lineWidth = R(PR * (pass ? 1.7 : 2.15) * (1 - Math.max(0, dd - PD) / PD * 0.6));
        ctx.beginPath();
        ctx.moveTo(X(x[i]), Y(y[i]));
        ctx.lineTo(X(x[j]), Y(y[j]));
        ctx.stroke();
      }
    }
    for (const i of live) {
      ctx.fillStyle = pass ? HONEY[c[i]] : HONEY_D[c[i]];
      ctx.beginPath();
      ctx.arc(X(x[i]), Y(y[i]), R(PR * (pass ? 1.0 : 1.18)), 0, TAU);
      ctx.fill();
    }
  }
  for (const i of live) {
    // 떨어지는 꿀은 실처럼 늘어진다
    if (st[i] === LIVE && S.vy[i] > 0.004) {
      ctx.strokeStyle = HONEY[c[i]];
      ctx.lineWidth = R(PR * 0.7);
      ctx.beginPath();
      ctx.moveTo(X(x[i]), Y(y[i]));
      ctx.lineTo(X(x[i] - S.vx[i] * 3), Y(y[i] - Math.min(0.05, S.vy[i] * 4)));
      ctx.stroke();
    }
    ctx.fillStyle = HONEY_L[c[i]];
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.ellipse(X(x[i] - PR * 0.32), Y(y[i] - PR * 0.38), R(PR * 0.32), R(PR * 0.18), -0.5, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawJar(ctx: CanvasRenderingContext2D, s: HoneyState, J: Jar, j: number, X: Fn, Y: Fn, R: Fn, font: (sz: number, wgt?: number) => void) {
  const S = s.S, t = s.t, x0 = X(J.x0 - 0.012), x1 = X(J.x1 + 0.012), top = Y(J.top - 0.008), bot = Y(J.bot + 0.012), cx = X(J.x);
  // 그루터기
  if (J.base > 0) {
    const sx0 = X(J.x0 - 0.024), sx1 = X(J.x1 + 0.024), sy = Y(J.bot + 0.012);
    const sg = ctx.createLinearGradient(sx0, 0, sx1, 0);
    sg.addColorStop(0, '#5a3418');
    sg.addColorStop(0.5, '#8a5a32');
    sg.addColorStop(1, '#4a2a12');
    ctx.fillStyle = sg;
    ctx.fillRect(sx0, sy, sx1 - sx0, Y(FLOOR + 0.02) - sy);
    ctx.fillStyle = '#b98a58';
    ctx.beginPath();
    ctx.ellipse((sx0 + sx1) / 2, sy, (sx1 - sx0) / 2, R(0.014), 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(90,50,20,.6)';
    ctx.lineWidth = 1;
    for (let q = 1; q < 3; q++) (ctx.beginPath(), ctx.ellipse((sx0 + sx1) / 2, sy, ((sx1 - sx0) / 2) * (q / 3), R(0.014) * (q / 3), 0, 0, TAU), ctx.stroke());
  }
  // 바닥 그림자
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath();
  ctx.ellipse(cx + R(0.01), bot + R(0.004), (x1 - x0) * 0.58, R(0.014), 0, 0, TAU);
  ctx.fill();
  // 유리 몸통
  const jw = x1 - x0, jh = bot - top, rr = R(0.03);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x0, top + R(0.01), jw, jh - R(0.01), [R(0.012), R(0.012), rr, rr]);
  ctx.fillStyle = 'rgba(200,235,255,.16)';
  ctx.fill();
  ctx.clip();
  // 꿀 (눈금까지 = 가득)
  const lineY = top + jh * 0.16, lvl = Math.min(1, S.fill[j] / J.cap), hy = bot - (bot - lineY) * lvl;
  if (S.fill[j] > 0) {
    const hg = ctx.createLinearGradient(x0, 0, x1, 0);
    const col = J.c === 1 ? 1 : 0;
    hg.addColorStop(0, HONEY_D[col]);
    hg.addColorStop(0.35, HONEY[col]);
    hg.addColorStop(1, HONEY_D[col]);
    ctx.fillStyle = hg;
    const wob = S.full[j] ? 0 : Math.sin(t * 0.2) * R(0.003);
    ctx.beginPath();
    ctx.moveTo(x0, bot);
    ctx.lineTo(x0, hy + wob);
    ctx.quadraticCurveTo(cx, hy - wob * 2, x1, hy + wob);
    ctx.lineTo(x1, bot);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,250,210,.45)';
    ctx.fillRect(x0, hy + wob, jw, R(0.006));
  }
  // 유리 반사
  ctx.fillStyle = 'rgba(255,255,255,.22)';
  ctx.fillRect(x0 + jw * 0.12, top + R(0.02), jw * 0.08, jh * 0.75);
  ctx.restore();
  ctx.strokeStyle = 'rgba(220,245,255,.8)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x0, top + R(0.01), jw, jh - R(0.01), [R(0.012), R(0.012), rr, rr]);
  ctx.stroke();
  // 입구 테
  ctx.fillStyle = 'rgba(220,245,255,.9)';
  ctx.beginPath();
  ctx.roundRect(x0 - R(0.006), top, jw + R(0.012), R(0.014), R(0.006));
  ctx.fill();
  // 눈금선
  if (!S.full[j]) {
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x0 + 2, lineY);
    ctx.lineTo(x1 - 2, lineY);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // 이름표 (꽃 · 남은 양)
  const ly = top + jh * 0.55, lw = jw * 0.72;
  ctx.fillStyle = J.c === 1 ? '#ffe3ef' : '#fff6dc';
  ctx.strokeStyle = 'rgba(120,70,20,.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(cx - lw / 2, ly - R(0.026), lw, R(0.052), R(0.01));
  ctx.fill();
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const left = Math.max(0, J.cap - S.fill[j]);
  if (J.c >= 0) {
    ctx.font = `${Math.max(12, R(0.034))}px system-ui, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(FLOWER[J.c], cx - lw * 0.24, ly + 1);
  }
  ctx.fillStyle = S.full[j] ? '#2f8a3a' : '#6a3a0c';
  font(0.034, 900);
  ctx.fillText(S.full[j] ? '✓' : String(left), cx + (J.c >= 0 ? lw * 0.16 : 0), ly + 1);
  // 뚜껑 (가득 차면 탁)
  const fullT = fullAt(s, j);
  if (S.full[j]) {
    const u = Math.min(1, (t - fullT) / 10), drop = (1 - u) * R(0.08), bounce = t - fullT < 18 ? Math.sin(((t - fullT) / 18) * Math.PI) * R(0.008) : 0;
    ctx.save();
    ctx.translate(cx, top - R(0.008) - drop - bounce);
    ctx.rotate(J.tilt * 0.22);
    const lw2 = jw + R(0.03);
    ctx.fillStyle = '#7a4a22';
    ctx.beginPath();
    if (J.tilt === 0) {
      ctx.moveTo(-lw2 / 2, R(0.004));
      ctx.quadraticCurveTo(0, -R(0.05), lw2 / 2, R(0.004));
      ctx.closePath();
    } else ctx.roundRect(-lw2 / 2, -R(0.012), lw2, R(0.018), R(0.006));
    ctx.fill();
    ctx.fillStyle = '#a8703c';
    ctx.beginPath();
    ctx.arc(0, J.tilt === 0 ? -R(0.026) : -R(0.016), R(0.01), 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}
/** 단지가 가득 찬 때 (연출용: 마지막 'full' 사건) */
function fullAt(s: HoneyState, j: number) {
  for (let k = s.events.length - 1; k >= 0; k--) if (s.events[k].kind === 'full' && s.events[k].a === j) return s.events[k].t;
  return -999;
}

function drawLeaf(ctx: CanvasRenderingContext2D, lf: LeafDef, la: number, X: Fn, Y: Fn, R: Fn, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(X(lf.px), Y(lf.py));
  ctx.rotate(la);
  const hl = R(lf.hl + 0.01), th2 = R(0.03);
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.beginPath();
  ctx.ellipse(R(0.006), R(0.014), hl, th2 * 0.6, 0, 0, TAU);
  ctx.fill();
  const lg = ctx.createLinearGradient(0, -th2, 0, th2);
  lg.addColorStop(0, '#9be36a');
  lg.addColorStop(1, '#3f8f2f');
  ctx.fillStyle = lg;
  ctx.beginPath();
  ctx.moveTo(-hl, 0);
  ctx.quadraticCurveTo(0, -th2 * 1.2, hl, 0);
  ctx.quadraticCurveTo(0, th2 * 1.1, -hl, 0);
  ctx.fill();
  ctx.strokeStyle = 'rgba(30,80,20,.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-hl, 0);
  ctx.lineTo(hl, 0);
  for (let k = -3; k <= 3; k++) {
    if (!k) continue;
    ctx.moveTo((k / 4) * hl, 0);
    ctx.lineTo((k / 4) * hl + Math.sign(k) * R(0.02), -th2 * 0.5);
    ctx.moveTo((k / 4) * hl, 0);
    ctx.lineTo((k / 4) * hl + Math.sign(k) * R(0.02), th2 * 0.45);
  }
  ctx.stroke();
  ctx.restore();
  // 축 (나무 못)
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#5a3418';
  ctx.beginPath();
  ctx.arc(X(lf.px), Y(lf.py), R(0.016), 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#c9965e';
  ctx.beginPath();
  ctx.arc(X(lf.px) - 1, Y(lf.py) - 1, R(0.009), 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawHot(ctx: CanvasRenderingContext2D, hs: HotStone, X: Fn, Y: Fn, R: Fn, t: number) {
  const cx = X(hs.x), cy = Y(hs.y), r = R(hs.r);
  const gl = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 2.4);
  gl.addColorStop(0, `rgba(255,120,40,${0.45 + 0.15 * Math.sin(t * 0.15)})`);
  gl.addColorStop(1, 'rgba(255,80,20,0)');
  ctx.fillStyle = gl;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 2.4, 0, TAU);
  ctx.fill();
  const sg = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  sg.addColorStop(0, '#ffb070');
  sg.addColorStop(0.5, '#e0502a');
  sg.addColorStop(1, '#7a1e0a');
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.ellipse(cx, cy, r, r * 0.62, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#ffdd88';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.5, cy - r * 0.1);
  ctx.lineTo(cx - r * 0.1, cy + r * 0.15);
  ctx.lineTo(cx + r * 0.35, cy - r * 0.05);
  ctx.stroke();
  // 아지랑이
  ctx.strokeStyle = 'rgba(255,200,150,.35)';
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    const bx = cx + (k - 1) * r * 0.5;
    for (let q = 0; q < 6; q++) ctx.lineTo(bx + Math.sin(t * 0.1 + q + k) * R(0.006), cy - r * 0.7 - q * R(0.012));
    ctx.stroke();
  }
}

function drawBees(ctx: CanvasRenderingContext2D, s: HoneyState, X: Fn, Y: Fn, R: Fn, t: number) {
  const L = s.L;
  for (let b = 0; b < 2; b++) {
    // 평소엔 위쪽에서 빙빙, 퍼 가러 갈 땐 단지로
    let bx = 0.5 + 0.32 * Math.sin(t * 0.011 + b * 3), by = 0.14 + 0.03 * Math.sin(t * 0.03 + b), mood = 0;
    const job = [...s.bees].reverse().find((_, k) => k % 2 === b % 2 || s.bees.length === 1);
    if (job && t - job.t0 < 120) {
      const J = L.jars[job.j], u = (t - job.t0) / 120, k = u < 0.5 ? u * 2 : 2 - u * 2;
      bx = bx + (J.x + (b ? 0.03 : -0.03) - bx) * Math.min(1, k * 1.6);
      by = by + (J.top - 0.05 - by) * Math.min(1, k * 1.6);
      mood = 1;
    }
    for (let j = 0; j < L.jars.length; j++) if (!s.S.full[j] && s.S.fill[j] > 0 && t - s.S.lastIn[j] > BEE_WAIT - 60) mood = Math.max(mood, 0.5);
    drawBee(ctx, X(bx), Y(by + 0.006 * Math.sin(t * 0.4 + b)), R(0.03), t, mood, b ? -1 : 1);
  }
}
function drawBee(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, t: number, mood: number, face: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(face, 1);
  // 날개
  ctx.fillStyle = 'rgba(230,245,255,.75)';
  const fl = Math.sin(t * 1.2) * 0.4;
  ctx.beginPath();
  ctx.ellipse(-u * 0.2, -u * 0.75, u * 0.45, u * 0.28, -0.5 + fl, 0, TAU);
  ctx.ellipse(u * 0.25, -u * 0.8, u * 0.45, u * 0.28, 0.5 - fl, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ffcf33';
  ctx.beginPath();
  ctx.ellipse(0, 0, u * 0.85, u * 0.62, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#2b1a0a';
  ctx.fillRect(-u * 0.35, -u * 0.6, u * 0.18, u * 1.2);
  ctx.fillRect(u * 0.05, -u * 0.62, u * 0.18, u * 1.24);
  ctx.beginPath();
  ctx.moveTo(-u * 0.85, 0);
  ctx.lineTo(-u * 1.15, u * 0.08);
  ctx.lineTo(-u * 0.82, u * 0.16);
  ctx.fill();
  // 얼굴: 놀라면 눈이 동그래진다
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(u * 0.52, -u * 0.12, u * (0.2 + mood * 0.08), 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#1a0f06';
  ctx.beginPath();
  ctx.arc(u * 0.56, -u * 0.12, u * 0.1, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  if (mood > 0.7) ctx.ellipse(u * 0.62, u * 0.25, u * 0.1, u * 0.13, 0, 0, TAU);
  else ctx.arc(u * 0.6, u * 0.2, u * 0.1, 0.2, Math.PI - 0.2);
  ctx.fill();
  if (mood > 0.7) {
    // 꿀 국자
    ctx.strokeStyle = '#8a5a32';
    ctx.lineWidth = u * 0.12;
    ctx.beginPath();
    ctx.moveTo(u * 0.3, u * 0.5);
    ctx.lineTo(u * 0.6, u * 1.0);
    ctx.stroke();
    ctx.fillStyle = '#ffc21a';
    ctx.beginPath();
    ctx.arc(u * 0.65, u * 1.08, u * 0.18, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/** 곰돌이: 무표정 · 우와(꿀이 흐름) · 냠(단지 가득) · 끈적(발에 꿀) · 화들짝(벌) · 꿀꺽(판 끝) · 어질어질(실패) */
function drawBear(ctx: CanvasRenderingContext2D, s: HoneyState, x: number, y: number, u: number, t: number) {
  const m = s.mood, mt = t - s.moodT, face = s.bearX < 0.5 ? 1 : -1;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(face, 1);
  const wig = m === 'sticky' ? Math.sin(mt * 0.6) * 0.08 : m === 'shock' ? Math.sin(mt * 1.1) * 0.05 * Math.max(0, 1 - mt / 40) : 0;
  const hop = m === 'gulp' ? -Math.abs(Math.sin(mt * 0.12)) * u * 0.06 : m === 'wow' ? -Math.max(0, Math.sin(mt * 0.25)) * u * 0.03 * Math.max(0, 1 - mt / 60) : 0;
  ctx.translate(0, hop);
  ctx.rotate(wig);
  // 그림자
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath();
  ctx.ellipse(0, -u * 0.02 - hop, u * 0.48, u * 0.08, 0, 0, TAU);
  ctx.fill();
  const fur = '#8b5a2b', furD = '#5e3a17', furL = '#c08a52';
  // 몸
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.ellipse(0, -u * 0.32, u * 0.42, u * 0.36, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = furL;
  ctx.beginPath();
  ctx.ellipse(u * 0.04, -u * 0.27, u * 0.25, u * 0.24, 0, 0, TAU);
  ctx.fill();
  // 발 (끈적이면 꿀이 묻어 늘어진다)
  for (const sx of [-0.25, 0.22]) {
    ctx.fillStyle = furD;
    ctx.beginPath();
    ctx.ellipse(u * sx, -u * 0.04, u * 0.13, u * 0.08, 0, 0, TAU);
    ctx.fill();
    if (m === 'sticky') {
      ctx.strokeStyle = '#ffc21a';
      ctx.lineWidth = u * 0.05;
      ctx.beginPath();
      ctx.moveTo(u * sx, -u * 0.02);
      ctx.lineTo(u * sx + Math.sin(mt * 0.5 + sx * 9) * u * 0.04, u * 0.04 + Math.abs(Math.sin(mt * 0.3)) * u * 0.03);
      ctx.stroke();
    }
  }
  // 머리
  const hx = u * 0.06, hy = -u * 0.78;
  for (const ex of [-0.24, 0.26]) {
    ctx.fillStyle = fur;
    ctx.beginPath();
    ctx.arc(hx + u * ex, hy - u * 0.24, u * 0.11, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#e8a87c';
    ctx.beginPath();
    ctx.arc(hx + u * ex, hy - u * 0.24, u * 0.055, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.ellipse(hx, hy, u * 0.33, u * 0.29, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = furL;
  ctx.beginPath();
  ctx.ellipse(hx + u * 0.08, hy + u * 0.09, u * 0.16, u * 0.12, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#2a160a';
  ctx.beginPath();
  ctx.ellipse(hx + u * 0.1, hy + u * 0.03, u * 0.06, u * 0.04, 0, 0, TAU);
  ctx.fill();
  // 눈
  const eyeY = hy - u * 0.06, big = m === 'wow' || m === 'shock' || m === 'sticky';
  for (const ex of [-0.07, 0.2]) {
    if (m === 'dizzy') {
      ctx.strokeStyle = '#2a160a';
      ctx.lineWidth = u * 0.03;
      ctx.beginPath();
      for (let k = 0; k < 10; k++) ctx.lineTo(hx + u * ex + Math.cos(k + mt * 0.2) * u * 0.008 * k, eyeY + Math.sin(k + mt * 0.2) * u * 0.008 * k);
      ctx.stroke();
    } else if (m === 'yum' || m === 'gulp') {
      ctx.strokeStyle = '#2a160a';
      ctx.lineWidth = u * 0.03;
      ctx.beginPath();
      ctx.arc(hx + u * ex, eyeY + u * 0.02, u * 0.045, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(hx + u * ex, eyeY, u * (big ? 0.07 : 0.05), 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#1a0d05';
      ctx.beginPath();
      ctx.arc(hx + u * ex + u * 0.012, eyeY + u * 0.005, u * (big ? 0.035 : 0.03), 0, TAU);
      ctx.fill();
    }
  }
  // 입
  ctx.fillStyle = '#5a1a10';
  ctx.strokeStyle = '#2a160a';
  ctx.lineWidth = u * 0.025;
  ctx.beginPath();
  if (m === 'wow' || m === 'shock') ctx.ellipse(hx + u * 0.1, hy + u * 0.17, u * 0.05, u * 0.065, 0, 0, TAU), ctx.fill();
  else if (m === 'yum') {
    ctx.arc(hx + u * 0.1, hy + u * 0.14, u * 0.06, 0.2, Math.PI - 0.2);
    ctx.stroke();
    ctx.fillStyle = '#ff7a8a';
    ctx.beginPath();
    ctx.ellipse(hx + u * 0.15 + Math.sin(mt * 0.4) * u * 0.02, hy + u * 0.19, u * 0.035, u * 0.025, 0, 0, TAU);
    ctx.fill();
  } else if (m === 'dizzy') ctx.moveTo(hx, hy + u * 0.17), ctx.lineTo(hx + u * 0.18, hy + u * 0.15), ctx.stroke();
  else ctx.arc(hx + u * 0.1, hy + u * 0.13, u * 0.045, 0.3, Math.PI - 0.3), ctx.stroke();
  // 팔 + 꿀단지 (꿀꺽: 단지를 들어 올려 마신다)
  ctx.fillStyle = fur;
  if (m === 'gulp') {
    const lift = Math.min(1, mt / 30);
    ctx.save();
    ctx.translate(hx + u * 0.22, hy + u * 0.1 - lift * u * 0.05);
    ctx.rotate(-0.9 * lift);
    ctx.fillStyle = 'rgba(220,245,255,.8)';
    ctx.beginPath();
    ctx.roundRect(-u * 0.1, -u * 0.14, u * 0.2, u * 0.26, u * 0.05);
    ctx.fill();
    ctx.fillStyle = '#ffc21a';
    ctx.fillRect(-u * 0.085, -u * 0.02 - Math.max(0, mt - 30) * 0.002 * u, u * 0.17, u * 0.12);
    ctx.restore();
    ctx.fillStyle = fur;
    ctx.beginPath();
    ctx.ellipse(hx + u * 0.26, hy + u * 0.22, u * 0.1, u * 0.07, -0.8, 0, TAU);
    ctx.fill();
  } else {
    const wave = m === 'sticky' ? Math.sin(mt * 0.7) * 0.5 : m === 'wow' ? -0.6 : 0;
    ctx.save();
    ctx.translate(u * 0.3, -u * 0.48);
    ctx.rotate(0.5 + wave);
    ctx.beginPath();
    ctx.ellipse(u * 0.08, 0, u * 0.15, u * 0.075, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    // 숟가락
    ctx.strokeStyle = '#d9b07a';
    ctx.lineWidth = u * 0.03;
    ctx.beginPath();
    ctx.moveTo(u * 0.38, -u * 0.38 + wave * u * 0.1);
    ctx.lineTo(u * 0.48, -u * 0.62 + wave * u * 0.1);
    ctx.stroke();
    ctx.fillStyle = '#d9b07a';
    ctx.beginPath();
    ctx.ellipse(u * 0.5, -u * 0.67 + wave * u * 0.1, u * 0.04, u * 0.055, 0.3, 0, TAU);
    ctx.fill();
  }
  // 침
  if (m === 'wow' || m === 'idle') {
    const dr = ((t * 0.5) % 40) / 40;
    ctx.fillStyle = 'rgba(200,235,255,.7)';
    ctx.beginPath();
    ctx.ellipse(hx + u * 0.02, hy + u * 0.18 + dr * u * 0.08, u * 0.012, u * 0.02 + dr * u * 0.01, 0, 0, TAU);
    ctx.fill();
  }
  // 어질어질 별
  if (m === 'dizzy')
    for (let k = 0; k < 3; k++) {
      const a = mt * 0.12 + (k * TAU) / 3;
      ctx.fillStyle = '#ffe066';
      ctx.font = `${Math.max(12, u * 0.14)}px system-ui, sans-serif`;
      ctx.fillText('★', hx + Math.cos(a) * u * 0.3, hy - u * 0.38 + Math.sin(a) * u * 0.08);
    }
  ctx.restore();
}

function drawPreview(ctx: CanvasRenderingContext2D, s: HoneyState, pv: Preview, X: Fn, Y: Fn, R: Fn, font: (sz: number, wgt?: number) => void) {
  const L = s.L, t = s.t;
  // 꿀이 갈 길 (점선)
  ctx.lineCap = 'round';
  ctx.setLineDash([R(0.012), R(0.012)]);
  ctx.lineDashOffset = -t * 0.6;
  for (const tr of pv.trails) {
    if (tr.length < 4) continue;
    ctx.strokeStyle = 'rgba(255,240,180,.85)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let k = 0; k < tr.length; k += 2) ctx.lineTo(X(tr[k]), Y(tr[k + 1]));
    ctx.stroke();
  }
  ctx.setLineDash([]);
  // 굳을 자리 (반투명 꿀사탕 + 테두리)
  let cx = 0, cy = 0;
  const nc = pv.candy.length / 2;
  for (let k = 0; k < pv.candy.length; k += 2) {
    cx += pv.candy[k];
    cy += pv.candy[k + 1];
    ctx.fillStyle = 'rgba(231,134,28,.45)';
    ctx.strokeStyle = 'rgba(255,214,150,.95)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(X(pv.candy[k]), Y(pv.candy[k + 1]), R(PR), 0, TAU);
    ctx.fill();
    ctx.stroke();
  }
  const tag = (x: number, y: number, text: string, bg: string, fg = '#3a1e05') => {
    font(0.036, 900);
    const tw = ctx.measureText(text).width + 12;
    x = Math.max(tw / 2 + 2, Math.min(X(1) - tw / 2 - 2, x));
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(x - tw / 2, y - R(0.022), tw, R(0.044), R(0.022));
    ctx.fill();
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y + 1);
  };
  if (nc) tag(X(cx / nc), Y(cy / nc) - R(0.05), `🍬 ${nc}방울 굳어요`, 'rgba(255,214,150,.95)');
  // 단지마다: 얼마나 들어가나
  L.jars.forEach((J, j) => {
    const k = pv.jars[j];
    if (!k && !pv.full[j]) return;
    const left = J.cap - s.S.fill[j];
    tag(X(J.x), Y(J.top) - R(0.07), pv.full[j] ? '가득! 탁!' : `+${k} (${left - k} 남음)`, pv.full[j] ? 'rgba(190,255,170,.95)' : 'rgba(255,246,200,.95)');
  });
  if (pv.spill > 0) tag(X(0.5), Y(1.17), `넘쳐요 ${pv.spill}방울`, 'rgba(255,170,150,.95)');
  if (pv.drop > 0) tag(X(pv.dropX), Y(1.12), `바닥에 ${pv.drop}방울`, 'rgba(255,170,150,.95)');
  if (pv.burn > 0) tag(X(0.5), Y(0.9), `🔥 ${pv.burn}방울 타요`, 'rgba(255,170,150,.95)');
  if (pv.v === -1) tag(X(0.5), Y(0.75), '맛이 섞여요!', 'rgba(255,150,140,.98)');
  if (pv.v === 1) tag(X(0.5), Y(0.7), '다 찬다! ✨', 'rgba(190,255,170,.98)');
  if (L.leaf && Math.abs(pv.la - s.S.la) > 0.1) drawLeaf(ctx, L.leaf, pv.la, X, Y, R, 0.4);
}

function drawHud(ctx: CanvasRenderingContext2D, s: HoneyState, d: StageDef, w: number, h: number, X: Fn, Y: Fn, R: Fn, font: (sz: number, wgt?: number) => void, th: Theme, pv: Preview | null) {
  const fx = juice(s), t = s.t;
  void X;
  // ═════ 위 띠 ═════
  const hb = Y(0.095);
  const tg = ctx.createLinearGradient(0, 0, 0, hb);
  tg.addColorStop(0, 'rgba(40,20,6,.96)');
  tg.addColorStop(1, 'rgba(60,32,10,.9)');
  ctx.fillStyle = tg;
  ctx.fillRect(0, 0, w, hb);
  ctx.fillStyle = 'rgba(255,190,90,.35)';
  ctx.fillRect(0, hb - 1.5, w, 1.5);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  font(0.044, 900);
  const ttl = `${d.emoji} ${s.stage + 1}판 ${d.name}`;
  ctx.fillText(ttl, R(0.03), hb * 0.52, w * 0.56);
  ctx.textAlign = 'right';
  font(0.042, 900);
  ctx.fillStyle = '#ffd84a';
  const stt = `★ ${s.stars}`;
  ctx.fillText(stt, w - R(0.03), hb * 0.52);
  const sw2 = ctx.measureText(stt).width;
  ctx.fillStyle = th.hot;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - R(0.06) - sw2, hb * 0.52);
  // 새것 알림 띠
  if (s.news && t - s.news.t < NEWS_T && !(s.phase === 'play' && t - s.startT < CARD_T)) {
    const age = t - s.news.t, a = Math.min(1, age / 10, (NEWS_T - age) / 20);
    ctx.globalAlpha = a;
    font(0.036, 900);
    ctx.textAlign = 'center';
    const tx = s.news.text, tw = Math.min(w - 10, ctx.measureText(tx).width + 24), by = Y(0.125);
    ctx.fillStyle = 'rgba(50,24,6,.92)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw / 2, by - R(0.024), tw, R(0.048), R(0.024));
    ctx.fill();
    ctx.strokeStyle = th.accent;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(tx, w / 2, by + 1, w - 24);
    ctx.globalAlpha = 1;
  }
  // ═════ 아래 띠: 별 조건 (쉬운 말) + 안내 ═════
  const by0 = Y(1.262);
  const bg = ctx.createLinearGradient(0, by0, 0, h);
  bg.addColorStop(0, 'rgba(48,24,8,.96)');
  bg.addColorStop(1, 'rgba(28,14,4,.98)');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(0, by0, w, h - by0 + 4, [R(0.03), R(0.03), 0, 0]);
  ctx.fill();
  const S = s.S, live = s.phase === 'result' && s.ok ? s.starOk : starsLive(s);
  const lineH = R(0.05);
  d.stars.forEach((k, i) => {
    const y = by0 + R(0.034) + i * lineH, ok = live[i] === true, bad = live[i] === false && starBroken(s, k);
    ctx.textAlign = 'left';
    font(0.04, 900);
    ctx.fillStyle = ok ? '#ffd84a' : bad ? 'rgba(255,255,255,.3)' : 'rgba(255,240,200,.75)';
    ctx.fillText(ok ? '★' : '☆', R(0.04), y);
    font(0.036, 800);
    ctx.fillStyle = ok ? '#fff3c8' : bad ? 'rgba(255,255,255,.4)' : '#fff6e6';
    ctx.fillText(STAR_TXT[k](d), R(0.1), y, w * 0.6);
    // 진행 상황 (오른쪽, 쉬운 말)
    let st = '';
    if (k === 'fill') st = `단지 ${L_full(s)}/${s.L.jars.length}`;
    if (k === 'plugs') st = `${S.opened}개 열었어요`;
    if (k === 'nospill') st = spillOf(S) ? '넘쳤어요' : '아직 안 넘침';
    if (k === 'nodrop') st = S.dropped ? `${S.dropped}방울 흘림` : '깨끗해요';
    if (k === 'bee') st = S.stolen ? '벌이 퍼 갔어요' : '아직 무사';
    if (k === 'noburn') st = S.burned ? `${S.burned}방울 탔어요` : '아직 무사';
    ctx.textAlign = 'right';
    font(0.034, 800);
    ctx.fillStyle = bad ? '#ffb3a8' : 'rgba(255,230,190,.8)';
    ctx.fillText(st, w - R(0.035), y);
  });
  // 안내 한 줄
  let hint = d.tip;
  const first = s.stage === 0 && !s.firstTap && s.phase === 'play';
  if (first) hint = '👆 밀랍을 톡! 꿀이 주르륵 흘러요';
  else if (pv) hint = pv.v === 1 ? '떼면 열려요 — 이걸로 다 채워요!' : '떼면 열려요 · 점선 = 꿀이 갈 길';
  else if (s.phase === 'result') hint = s.ok ? (s.won ? '꿀단지를 다 모았어요! 곰돌이 배부름' : '다음 판엔 새것이 나와요') : '누르고 있으면 꿀이 갈 길이 보여요';
  else if (S.live > 0) hint = '꿀이 흐르는 중… 멈춘 꿀은 굳어요';
  ctx.textAlign = 'center';
  ctx.fillStyle = first ? '#ffffff' : '#ffe9a8';
  font(first ? 0.04 : 0.036, 900);
  ctx.fillText(hint, w / 2, h - R(0.03), w - R(0.05));
  // ═════ 시작 카드 + 새것 스포트라이트 ═════
  const cardOn = s.phase === 'play' && t - s.startT < CARD_T && !(s.firstTap && s.lastTap > s.startT);
  if (cardOn) {
    const age = t - s.startT, a = Math.min(1, age / 8, (CARD_T - age) / 20);
    if (d.spot && t - s.spotT < SPOT_T) {
      // 새것만 밝게
      ctx.save();
      ctx.globalAlpha = a * 0.6;
      ctx.fillStyle = '#0c0502';
      ctx.beginPath();
      ctx.rect(0, Y(0.095), w, by0 - Y(0.095));
      ctx.arc(X(d.spot[0] * (s.L.flip ? -1 : 1) + (s.L.flip ? 1 : 0)), Y(d.spot[1]), R(d.spot[2]) * (1 + 0.05 * Math.sin(t * 0.2)), 0, TAU, true);
      ctx.fill('evenodd');
      ctx.restore();
      const sx = X(s.L.flip ? 1 - d.spot[0] : d.spot[0]), sy = Y(d.spot[1]);
      ctx.globalAlpha = a;
      ctx.strokeStyle = '#ffe066';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sx, sy, R(d.spot[2]) * (1 + 0.05 * Math.sin(t * 0.2)), 0, TAU);
      ctx.stroke();
      font(0.04, 900);
      ctx.fillStyle = '#ff5a8a';
      const nw = 'NEW!', nwW = ctx.measureText(nw).width + 12, ny = sy - R(d.spot[2]) - R(0.03);
      ctx.beginPath();
      ctx.roundRect(sx - nwW / 2, ny - R(0.024), nwW, R(0.048), R(0.024));
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(nw, sx, ny + 1);
      ctx.globalAlpha = 1;
    }
    const sc = Math.min(1, 0.7 + age / 14), lines = d.stars.length, ch = 0.12 + lines * 0.05 + (d.news ? 0.05 : 0);
    const cyy = Y(d.spot && d.spot[1] < 0.66 ? 0.95 : 0.5) - R(ch / 2);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(w / 2, cyy);
    ctx.scale(sc, sc);
    ctx.fillStyle = 'rgba(52,26,8,.95)';
    ctx.beginPath();
    ctx.roundRect(-R(0.43), 0, R(0.86), R(ch), R(0.04));
    ctx.fill();
    ctx.strokeStyle = '#ffc94a';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd84a';
    font(0.05, 900);
    ctx.fillText(s.again ? `다시! ${s.stage + 1}판 · ${d.name}` : `${s.stage + 1}판 · ${d.name}`, 0, R(0.045), R(0.8));
    let yy = 0.1;
    if (d.news) {
      font(0.037, 900);
      ctx.fillStyle = '#ffe9f0';
      ctx.fillText((s.stage && !s.again ? 'NEW ' : '') + d.news, 0, R(yy), R(0.82));
      yy += 0.05;
    }
    font(0.037, 800);
    d.stars.forEach((k) => {
      ctx.fillStyle = '#fff6dc';
      ctx.fillText(`★ ${STAR_TXT[k](d)}`, 0, R(yy), R(0.8));
      yy += 0.05;
    });
    ctx.restore();
  }
  // ═════ 결과 카드 ═════
  if (s.phase === 'result') {
    const age = s.pt, a = Math.min(1, age / 8);
    const lines = s.ok ? d.stars.length : 1, ch = 0.12 + lines * 0.05;
    const cyy = Y(0.45);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(w / 2, cyy);
    ctx.scale(Math.min(1, 0.7 + age / 12), Math.min(1, 0.7 + age / 12));
    ctx.fillStyle = 'rgba(52,26,8,.95)';
    ctx.beginPath();
    ctx.roundRect(-R(0.43), 0, R(0.86), R(ch), R(0.04));
    ctx.fill();
    ctx.strokeStyle = s.ok ? '#ffd84a' : '#ff9a8a';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.textAlign = 'center';
    font(0.05, 900);
    if (s.ok) {
      const head = s.won ? '꿀단지 다 모았다!' : '다 채웠다!', hw = ctx.measureText(head).width, sw = R(0.055), x0 = -(hw + R(0.02) + sw * d.stars.length) / 2;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffd84a';
      ctx.fillText(head, x0, R(0.045));
      d.stars.forEach((_, k) => {
        const ag = age - (10 + k * 14);
        if (ag < 0) return;
        const got = s.starOk[k], pop = ag < 8 ? 1.9 - 0.9 * (ag / 8) : 1, sx = x0 + hw + R(0.02) + sw * (k + 0.5);
        ctx.save();
        ctx.translate(sx, R(0.045));
        ctx.scale(pop, pop);
        font(0.05, 900);
        ctx.textAlign = 'center';
        ctx.fillStyle = got ? '#ffd43b' : 'rgba(255,255,255,.25)';
        ctx.fillText(got ? '★' : '☆', 0, 0);
        ctx.restore();
        if (got && (fx.memo['star' + k] ?? -1) < s.t - ag) (fx.memo['star' + k] = s.t - ag), fx.burst(w / 2 + sx, cyy + R(0.045), '#ffe066', 16, 3, 2.4);
      });
      ctx.textAlign = 'center';
      font(0.036, 800);
      d.stars.forEach((k, i) => {
        const got = s.starOk[i];
        ctx.fillStyle = got ? '#fff3c8' : 'rgba(255,220,200,.7)';
        ctx.fillText(`${got ? '★' : '☆'} ${got ? STAR_DONE[k](s) : STAR_MISS[k](s)}`, 0, R(0.1 + i * 0.05), R(0.8));
      });
    } else {
      ctx.fillStyle = '#ffb3a8';
      ctx.fillText(`앗! ${s.why}`, 0, R(0.045), R(0.8));
      font(0.037, 800);
      ctx.fillStyle = '#fff6e6';
      ctx.fillText(s.hearts > 0 ? '하트 하나 잃었어요 · 이 판을 다시 해요' : '하트를 다 썼어요 — 곰돌이가 고마워해요!', 0, R(0.1), R(0.82));
    }
    ctx.restore();
  }
}
const L_full = (s: HoneyState) => s.L.jars.filter((_, j) => s.S.full[j]).length;
/** 지금까지 지켜지고 있는 별 (판이 끝나기 전 미리 보기용) */
function starsLive(s: HoneyState): (boolean | null)[] {
  const d = STAGES[s.stage];
  return d.stars.map((k) => (k === 'fill' ? (L_full(s) === s.L.jars.length ? true : null) : starBroken(s, k) ? false : null));
}
function starBroken(s: HoneyState, k: StarKind) {
  const S = s.S, d = STAGES[s.stage];
  return k === 'nospill' ? spillOf(S) > 0 : k === 'plugs' ? S.opened > (d.plugs ?? 9) : k === 'nodrop' ? S.dropped > 0 : k === 'bee' ? S.stolen > 0 : k === 'noburn' ? S.burned > 0 : false;
}
const STAR_DONE: Record<StarKind, (s: HoneyState) => string> = {
  fill: () => '단지를 모두 채웠어요!',
  nospill: () => '한 방울도 안 넘쳤어요!',
  plugs: (s) => `밀랍 ${NUM[s.S.opened]} 개로 해냈어요!`,
  nodrop: () => '바닥이 반짝반짝해요!',
  bee: () => '벌이 빈손으로 갔어요!',
  noburn: () => '하나도 안 탔어요!',
};
const STAR_MISS: Record<StarKind, (s: HoneyState) => string> = {
  fill: () => '단지가 덜 찼어요',
  nospill: (s) => `${spillOf(s.S)}방울 넘쳤어요`,
  plugs: (s) => `밀랍을 ${NUM[Math.min(6, s.S.opened)]} 개 열었어요`,
  nodrop: (s) => `바닥에 ${s.S.dropped}방울 흘렸어요`,
  bee: (s) => `벌이 ${s.S.stolen}방울 퍼 갔어요`,
  noburn: (s) => `${s.S.burned}방울 탔어요`,
};
