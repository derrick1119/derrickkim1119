/**
 * 👻 몸 갈아타기 — 실시간 3D 룩 데브(M0′, 오너 11-21 "그래픽 컨셉이 전혀 AAA급이 아닌데.. 핵심 시스템만 살리라는거지").
 * 시뮬레이션(game.ts의 규칙·판·봇)은 그대로, 그림은 전부 새 WebGL2 렌더러(gl/)로 그린다. 렌더러는 시뮬 상태를 읽기만 한다.
 * 처음엔 봇이 플레이(구경), 화면을 톡하면 그때부터 내가 한다. 톡 → 카메라 광선 → 마당 평면 → 시뮬 좌표.
 * 쿼리: ?seed=N · ?stage=1~12 · ?t=틱(그 틱까지 봇으로 돌리고 멈춤 — 키 프레임) · ?q=렌더 배율
 */
import { Gfx, type Draw, type GMesh, type Light } from './gl/gfx.ts';
import { invert, mul, trs, type M4, type V3 } from './gl/m4.ts';
import { buildStage, ballMesh, ghostMesh, rigOf, ringMesh, type Rig } from './gl/world.ts';
import { bodyhop as g, bodyhopSmart, GEO, KD, popR, STAGES, __jump, type HopState } from './game.ts';
import { mulberry32 } from './rng.ts';
import { sfx } from './sfx.ts';
import type { Input } from './core.ts';

type Mon = HopState['mons'][number];
/** 👁 3D r1 [치명] '캐릭터가 25~40px': 그림만 시뮬 반지름의 VIS배(판정·시뮬은 그대로) */
const VIS = 1.4;
const Q = new URLSearchParams(location.search);
const { A, CX, CY, YS } = GEO;
const W = (x: number, y: number): [number, number] => [x - CX, (y - CY) / YS];
const cv = document.getElementById('gl') as HTMLCanvasElement, ov = document.getElementById('ov') as HTMLCanvasElement, o2 = ov.getContext('2d')!;
const hud = { stage: document.getElementById('hs')!, hearts: document.getElementById('hh')!, score: document.getElementById('hp')!, hint: document.getElementById('hint')! };

let gfx: Gfx;
try {
  gfx = new Gfx(cv);
} catch {
  document.getElementById('nogl')!.hidden = false;
  throw new Error('WebGL2 없음');
}
const t0 = performance.now();
// ── 굽기(로딩 때 한 번) ──
const stage = buildStage();
const up = (m: Parameters<Gfx['upload']>[0]) => gfx.upload(m);
const S = { ground: up(stage.ground), arena: up(stage.arena), props: up(stage.props), crowd: up(stage.crowd), foliage: up(stage.foliage), lamp: up(stage.lamp), clouds: up(stage.clouds) };
const GH = up(ghostMesh()), BALL = up(ballMesh()), RING = up(ringMesh());
const rigs = new Map<string, { foe: GMesh; me: GMesh; parts: { m: GMesh; at: V3 }[]; h: number }>();
function rig(k: string) {
  let r = rigs.get(k);
  if (!r) {
    const R: Rig = rigOf(k);
    r = { foe: up(R.foe), me: up(R.me), parts: R.parts.map((p) => ({ m: up(p.mesh), at: p.at })), h: R.h };
    rigs.set(k, r);
  }
  return r;
}
for (const k of ['bean', 'bear']) rig(k);
const bakeMs = performance.now() - t0;

// ── 빛(🖌️ ART v1 월드 1: 맑은 늦은 아침) ──
const L: Light = {
  sun: norm3([-0.62, 0.62, -0.1]), sunC: [2.1, 1.9, 1.6], sky: [0.34, 0.44, 0.66], gnd: [0.2, 0.22, 0.11], rim: [0.55, 0.62, 0.75],
  fog: [0.55, 0.72, 0.92], fogD: 0.35, fogS: 3.2, zen: [0.16, 0.42, 1.0], hor: [0.78, 0.9, 1.0],
  expo: 0.9, bloom: 0.22, sat: 1.18, con: 1.08, warm: 0.025, vig: 0.32,
};
function norm3(v: V3): V3 { const l = Math.hypot(...v); return [v[0] / l, v[1] / l, v[2] / l]; }

// ── 시뮬레이션 ──
const seed = Number(Q.get('seed') ?? (Date.now() % 100000) + 1);
let s: HopState = g.create(seed);
if (Q.get('stage')) __jump(s, Math.max(0, Math.min(STAGES.length - 1, Number(Q.get('stage')) - 1)));
let botRng = mulberry32(seed ^ 0x9e3779b9), manual = false, held: Input = { tap: false, dir: 0, pointer: null };
let ptr: { x: number; y: number } | null = null, latch: { x: number; y: number } | null = null, seenT = -1;
const FREEZE = Q.get('t') ? Number(Q.get('t')) : -1;
function tick() {
  let inp: Input;
  if (!manual) {
    if (s.t % 3 === 0) held = bodyhopSmart.act(s, botRng);
    inp = s.t % 3 === 0 ? held : { tap: false, dir: 0, pointer: held.pointer };
  } else inp = { tap: false, dir: 0, pointer: ptr ?? latch };
  latch = null;
  g.step(s, inp);
  if (g.over(s)) {
    s = g.create(seed + s.t);
    botRng = mulberry32(s.seed);
    seenT = -1;
  }
}
if (FREEZE > 0) {
  while (s.t < FREEZE - 30) tick();
  seenT = s.t;
  while (s.t < FREEZE) tick();
}

// ── 카메라 ──
const cam = { eye: [0, 1.6, 1.6] as V3, at: [0, 0, -0.1] as V3, fov: (38 * Math.PI) / 180 };
let shake = 0, zoom = 0;
function placeCam(t: number) {
  const asp = gfx.w / gfx.h, pitch = (Number(Q.get('pitch') ?? 57) * Math.PI) / 180;
  const hf = Math.atan(Math.tan(cam.fov / 2) * asp), d = 0.505 / Math.tan(hf) * (1 - zoom * 0.08);
  const at: V3 = [0, 0.02, -0.2 + 0.12 * Math.max(0, 0.75 - asp)];
  const sx = shake * shake * 0.012 * Math.sin(t * 0.9), sy = shake * shake * 0.01 * Math.sin(t * 1.3 + 1);
  cam.at = [at[0] + sx, at[1] + sy, at[2]];
  cam.eye = [at[0] + sx * 0.5, at[1] + Math.sin(pitch) * d, at[2] + Math.cos(pitch) * d];
}
function size() {
  const q = Number(Q.get('q') ?? 1), dpr = Math.min(2, window.devicePixelRatio || 1) * q, w = innerWidth, h = innerHeight;
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  ov.width = Math.round(w * Math.min(2, window.devicePixelRatio || 1)); ov.height = Math.round(h * Math.min(2, window.devicePixelRatio || 1));
  gfx.resize(cv.width, cv.height);
}
addEventListener('resize', size);
size();
function project(x: number, y: number, z: number): [number, number, number] {
  const { vp } = gfx.camera(cam), cx = vp[0] * x + vp[4] * y + vp[8] * z + vp[12], cy = vp[1] * x + vp[5] * y + vp[9] * z + vp[13], cw = vp[3] * x + vp[7] * y + vp[11] * z + vp[15];
  return [((cx / cw) * 0.5 + 0.5) * innerWidth, (0.5 - (cy / cw) * 0.5) * innerHeight, cw];
}
/** 화면 점 → 마당 평면(y = 0) → 시뮬 좌표 */
function unproject(px: number, py: number): { x: number; y: number } | null {
  const iv = invert(gfx.camera(cam).vp), nx = (px / innerWidth) * 2 - 1, ny = 1 - (py / innerHeight) * 2;
  const a = xf(iv, nx, ny, -1), b = xf(iv, nx, ny, 1), dy = b[1] - a[1];
  if (Math.abs(dy) < 1e-6) return null;
  const u = -a[1] / dy, X = a[0] + (b[0] - a[0]) * u, Z = a[2] + (b[2] - a[2]) * u;
  return { x: X + CX, y: (Z * YS + CY) / A };
}
function xf(m: M4, x: number, y: number, z: number): V3 {
  const w = m[3] * x + m[7] * y + m[11] * z + m[15];
  return [(m[0] * x + m[4] * y + m[8] * z + m[12]) / w, (m[1] * x + m[5] * y + m[9] * z + m[13]) / w, (m[2] * x + m[6] * y + m[10] * z + m[14]) / w];
}
cv.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  sfx.wake();
  if (!manual) {
    manual = true;
    hud.hint.hidden = true;
  }
  const p = s.phase === 'play' ? unproject(e.clientX, e.clientY) : { x: e.clientX / innerWidth, y: 0.86 };
  ptr = latch = p;
});
addEventListener('pointerup', () => (ptr = null));
addEventListener('pointercancel', () => (ptr = null));

// ── 빛 알갱이(파티클) ──
interface Pt { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; max: number; c: number[]; i: number; sz: number; grav: number; drag: number }
const pts: Pt[] = [], PB = new Float32Array(1700 * 8);
let glows = 0;
/** 이번 프레임만 쓰는 둥근 빛(가산, 블룸에 걸림) */
function glow(x: number, y: number, z: number, c: number[], size: number, a: number) {
  if (glows >= 100) return;
  PB.set([x, y, z, c[0], c[1], c[2], a, size], glows++ * 8);
}
function burst(x: number, y: number, z: number, n: number, c: number[], spd: number, sz: number, life: number, grav = 1.2, up = 0.6, inten = 1) {
  for (let k = 0; k < n && pts.length < 1600; k++) {
    const a = Math.random() * Math.PI * 2, e = Math.random() * up + (1 - up) * 0.2, v = spd * (0.4 + Math.random() * 0.8);
    pts.push({ x, y, z, vx: Math.cos(a) * v * (1 - e * 0.5), vy: v * e * 1.6, vz: Math.sin(a) * v * (1 - e * 0.5), life: 0, max: life * (0.6 + Math.random() * 0.6), c, i: inten, sz: sz * (0.6 + Math.random() * 0.8), grav, drag: 2.2 });
  }
}
/** 파편 덩어리: 몸 색 작은 공이 튀어 바닥에 통통 — 빛을 받는다 */
interface Chunk { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; c: number[]; sz: number; rot: number }
const chs: Chunk[] = [];
const KCH: Record<string, number[]> = { bean: [0.55, 0.85, 0.35], bear: [0.6, 0.4, 0.25], hedge: [0.7, 0.5, 0.35], frog: [0.4, 0.8, 0.45], goat: [0.95, 0.93, 0.88], boar: [0.5, 0.33, 0.22] };
function chunks(x: number, z: number, k: string, n: number, sp: number) {
  for (let i = 0; i < n && chs.length < 90; i++) {
    const a = Math.random() * Math.PI * 2, v = (0.3 + Math.random() * 0.6) * sp;
    chs.push({ x, y: 0.03, z, vx: Math.cos(a) * v, vy: (0.6 + Math.random() * 0.8) * sp, vz: Math.sin(a) * v, life: 0, c: KCH[k] ?? [0.8, 0.8, 0.8], sz: 0.006 + Math.random() * 0.008, rot: Math.random() * 6 });
  }
}
/** 먼지 뭉게: 빛을 받는 반투명 공이 부풀며 흩어짐(가산이 아니라 하얗게 타지 않는다) */
interface Puff { x: number; y: number; z: number; vx: number; vz: number; life: number; max: number; r: number; c: number[] }
const pfs: Puff[] = [];
function puffs(x: number, z: number, n: number, rad: number, c: number[]) {
  for (let i = 0; i < n && pfs.length < 60; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.6, v = rad * (1.2 + Math.random());
    pfs.push({ x: x + Math.cos(a) * rad * 0.3, y: 0.01, z: z + Math.sin(a) * rad * 0.3, vx: Math.cos(a) * v, vz: Math.sin(a) * v, life: 0, max: 0.55 + Math.random() * 0.35, r: 0.008 + Math.random() * 0.008, c });
  }
}
interface Fx { k: 'flash' | 'ring'; x: number; y: number; z: number; t: number; T: number; r: number; c: number[] }
const fxs: Fx[] = [];
const KCOL: Record<string, number[]> = { bean: [0.55, 1, 0.35], bear: [1, 0.75, 0.45], hedge: [1, 0.7, 0.3], frog: [1, 0.55, 0.7], goat: [0.85, 0.9, 1], boar: [1, 0.6, 0.25], mole: [1, 0.45, 0.2] };
const CYAN = [0.35, 0.95, 1.2], GOLD = [1.4, 1.0, 0.35];
const pops: { x: number; y: number; z: number; text: string; t: number; big: boolean }[] = [];

function onEvents() {
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const [X, Z] = W(e.x, e.y), kc = KCOL[e.text] ?? [1, 0.9, 0.7];
    switch (e.k) {
      case 'hop': sfx.play('whoosh', 1.35, 0.9); break;
      case 'in':
        fxs.push({ k: 'ring', x: X, y: 0.01, z: Z, t: 0, T: 0.45, r: 0.12, c: CYAN }, { k: 'flash', x: X, y: 0.05, z: Z, t: 0, T: 0.25, r: 0.07, c: CYAN });
        burst(X, 0.06, Z, 26, CYAN, 0.55, 0.018, 0.6, 0.6, 0.8, 1.4);
        sfx.play('boing', 1.1, 0.9); sfx.play('ding', 1.4, 0.4);
        break;
      case 'pop': {
        const r = e.x2 || 0.15;
        fxs.push({ k: 'flash', x: X, y: 0.06, z: Z, t: 0, T: 0.22, r: 0.05, c: [1.5, 0.8, 0.35] }, { k: 'ring', x: X, y: 0.008, z: Z, t: 0, T: 0.5, r, c: [1.1, 0.7, 0.3] }, { k: 'ring', x: X, y: 0.008, z: Z, t: -0.06, T: 0.55, r: r * 0.75, c: CYAN });
        burst(X, 0.05, Z, 30, kc, 1.1, 0.014, 0.6, 2.4, 0.7, 0.9);
        burst(X, 0.06, Z, 10, CYAN, 0.6, 0.012, 0.5, 1, 0.8, 1);
        chunks(X, Z, e.text, 14, 1);
        puffs(X, Z, 8, r * 0.55, [0.92, 0.84, 0.7]);
        shake = Math.min(1, shake + 0.35 + r * 2.5);
        zoom = Math.min(1, zoom + 0.5);
        sfx.play('pop', e.n ? 0.95 : 0.7, 1.2); sfx.play('thud', 1, 1);
        break;
      }
      case 'kill': {
        burst(X, 0.05, Z, 10, kc, 0.7, 0.012, 0.5, 2, 0.7, 0.8);
        burst(X, 0.06, Z, 5, GOLD, 0.4, 0.011, 0.45, 0.5, 0.9, 1);
        chunks(X, Z, e.text, 6, 0.6);
        fxs.push({ k: 'flash', x: X, y: 0.05, z: Z, t: 0, T: 0.14, r: 0.025, c: [1.0, 0.7, 0.35] });
        if (e.n > 1) pops.push({ x: X, y: 0.12, z: Z, text: String(e.n), t: performance.now(), big: e.n >= 5 });
        sfx.play('pop', 0.9 + Math.min(12, e.n) * 0.085, 0.8);
        shake = Math.min(1, shake + 0.06);
        break;
      }
      case 'slam': case 'boom': case 'thunder': {
        const r = e.x2 || 0.1;
        fxs.push({ k: 'ring', x: X, y: 0.008, z: Z, t: 0, T: 0.4, r, c: [1.2, 1.0, 0.75] });
        puffs(X, Z, 7, r * 0.8, [0.86, 0.74, 0.58]);
        shake = Math.min(1, shake + 0.3);
        sfx.play('thud', 0.8, 1);
        break;
      }
      case 'punch': case 'myhit': case 'ouch':
        burst(X, 0.06, Z, 6, [1.2, 1.1, 0.9], 0.5, 0.012, 0.25, 1, 0.6, 1.2);
        sfx.play('thud', 1.4, 0.4);
        break;
      case 'ko':
        puffs(X, Z, 8, 0.06, [0.85, 0.85, 0.9]);
        sfx.play('fail', 1, 0.6);
        break;
      case 'wave': {
        const [gx, gz] = W(GEO.GATE_X, GEO.GATE_Y);
        puffs(gx, gz + 0.04, 6, 0.08, [0.86, 0.76, 0.6]);
        sfx.play('thud', 0.7, 0.6);
        break;
      }
      case 'clear': sfx.play('clear', 1, 1); break;
      case 'ready': sfx.play('chime', 1.6, 0.25); break;
    }
  }
  seenT = s.t;
}

// ── 몸 그리기 상태(그리기 쪽에서만: 돌아보는 각) ──
const look = new Map<number, number>();
const ID = trs(0, 0, 0);
function monDraws(out: Draw[], m: Mon, t: number, now: number) {
  const R = rig(m.k), me = m.id === s.me, r = m.r * VIS, [X, Z] = W(m.x, m.y), sd = m.seed * 6.28;
  let ry = look.get(m.id) ?? 0;
  ry += ((m.face < 0 ? -0.6 : 0.6) - ry) * 0.12;
  look.set(m.id, ry);
  let sy = 1 + 0.035 * Math.sin(t * 0.09 + sd), lift = 0, rx = 0, rz = 0, punch = 0;
  if (t - m.walkT < 5) lift = Math.abs(Math.sin(t * 0.32 + sd)) * r * 0.28, (sy *= 1 - 0.06 * Math.cos(t * 0.64 + sd * 2));
  if (m.st === GEO.WIND) (sy = 0.84), (rx = -0.18), (rz = 0.04 * Math.sin(t * 1.7));
  if (m.st === GEO.DASH) (sy = 1.1), (rx = 0.25);
  if (m.air > 0) lift += Math.sin(Math.min(1, m.air / 14) * Math.PI) * r * 1.2;
  if (m.stun > 0) rz = 0.18 * Math.sin(t * 0.4);
  const atk = t - m.atkT;
  if (atk >= 0 && atk < 12) (punch = Math.sin((atk / 12) * Math.PI)), (sy *= 1 - punch * 0.12), (rx += punch * 0.15);
  const hurt = Math.max(0, 1 - (t - m.hurtT) / 7);
  if (hurt > 0) sy *= 1 - hurt * 0.15;
  const claim = m.st === GEO.CLAIM ? 0.6 + 0.4 * Math.sin(t * 0.8) : 0;
  const sx = 1 / Math.sqrt(sy), model = trs(X, lift, Z, ry, rx, rz, r * sx, r * sy, r * sx);
  const fres = me ? [0.05, 0.9, 1.25] : claim ? [claim * 0.2, claim * 0.9, claim * 1.2] : undefined;
  out.push({ m: me ? R.me : R.foe, model, fres, flash: hurt * 0.6 + (m.inv > 0 && me ? 0.0 : 0), emis: me ? [0.01, 0.05, 0.07] : undefined });
  for (const p of R.parts) {
    const side = Math.sign(p.at[0]), ext = punch * 0.5 * (side > 0 ? 1 : 0.6);
    const lx = p.at[0] * r * sx, ly = p.at[1] * r * sy + Math.sin(t * 0.09 + sd + side) * r * 0.04, lz = (p.at[2] + ext) * r;
    const c = Math.cos(ry), sn = Math.sin(ry);
    out.push({ m: p.m, model: trs(X + lx * c + lz * sn, lift + ly, Z - lx * sn + lz * c, ry + side * 0.3, punch * 0.5, 0, r), flash: hurt * 0.6, fres });
  }
  // 보호막(대장)
  if (m.shield > 0) out.push({ m: BALL, model: trs(X, r * 1.1, Z, 0, 0, 0, r * 1.6), pass: 2, emis: [0.5, 0.9, 1.2], alpha: 0.18 + 0.05 * Math.sin(now * 0.004), shadow: false, tint: [0, 0, 0] });
}
function ghostDraw(out: Draw[], t: number) {
  const gs = 0.034;
  let x = 0, y = 0, z = 0, sc = gs, gw = 1;
  const [hx, hz] = W(GEO.HOME_X, GEO.HOME_Y), home: V3 = [hx, 0.27, hz + 0.02];
  const b = s.me ? s.mons.find((m) => m.id === s.me && !m.dead) : null;
  if (s.fly) {
    const f = s.fly, to = s.mons.find((m) => m.id === f.to), u = Math.min(1, f.t / f.T), e = u * u * (3 - 2 * u);
    const from: V3 = s.home || f.x0 === GEO.HOME_X ? home : [W(f.x0, f.y0)[0], 0.12, W(f.x0, f.y0)[1]];
    const [tx, tz] = to ? W(to.x, to.y) : [from[0], from[2]], th = to ? to.r * VIS * (rig(to.k).h - 0.2) : 0.1;
    x = from[0] + (tx - from[0]) * e; z = from[2] + (tz - from[2]) * e;
    y = from[1] + (th - from[1]) * e + Math.sin(u * Math.PI) * 0.16;
    sc = gs * (1 + 0.25 * Math.sin(u * Math.PI));
    for (let k = 0; k < 3; k++) burst(x, y + 0.03, z, 1, CYAN, 0.05, 0.03, 0.35, 0, 0.3, 1.3);
  } else if (b) {
    const [bx, bz] = W(b.x, b.y);
    x = bx; z = bz; y = b.r * VIS * (rig(b.k).h - 0.35) + 0.01 + 0.008 * Math.sin(t * 0.1); sc = gs * 0.8; gw = 0.9;
  } else if (s.home || s.phase !== 'play') {
    [x, y, z] = home; y += 0.01 * Math.sin(t * 0.06);
  } else {
    const [gx, gz] = W(s.gx, s.gy);
    x = gx + 0.005 * Math.sin(t * 0.9); z = gz; y = 0.1 + 0.02 * Math.sin(t * 0.12);
  }
  out.push({ m: GH, model: trs(x, y, z, 0.3 * Math.sin(t * 0.03), 0, 0.08 * Math.sin(t * 0.07), sc), pass: 1, alpha: 0.9, fres: [0.25 * gw, 0.9 * gw, 1.3 * gw], emis: [0.12, 0.2, 0.24], shadow: false });
  // 유령 둘레 빛(가산)
  glow(x, y + sc, z, CYAN, sc * 7, 0.45 * gw);
  return [x, y, z] as V3;
}

// ── 그리기 루프 ──
let lastScore = 0, acc = 0, last = performance.now(), frames = 0, jsMs: number[] = [];
const [lx, lz] = W(GEO.HOME_X, GEO.HOME_Y);
function frame(now: number) {
  const j0 = performance.now();
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (FREEZE < 0) {
    acc += dt;
    while (acc >= 1 / 60) tick(), (acc -= 1 / 60);
  }
  onEvents();
  const t = s.t + (FREEZE < 0 ? acc * 60 : 0), sec = now / 1000;
  shake *= Math.pow(0.02, dt); zoom *= Math.pow(0.05, dt);
  placeCam(sec * 60);
  glows = 0;
  glow(lx, 0.17, lz + 0.03, [1.4, 0.7, 0.25], 0.05, 0.5);
  const list: Draw[] = [
    { m: S.ground, model: ID, shadow: false }, { m: S.arena, model: ID, shadow: false }, { m: S.props, model: ID }, { m: S.crowd, model: ID },
    { m: S.foliage, model: ID }, { m: S.clouds, model: trs((sec * 0.01) % 2, 0, 0), shadow: false, emis: [0.25, 0.27, 0.3] },
    { m: S.lamp, model: trs(lx, 0.17, lz + 0.03, 0, 0, 0, 0.016), emis: [0.9, 0.45, 0.12], tint: [1, 0.6, 0.3], shadow: false },
  ];
  for (const m of s.mons) if (!m.dead) monDraws(list, m, t, now);
  // 버린 몸·쓰러진 몸: 잠깐 부풀었다 사라짐
  for (const c of s.corpses) {
    const u = (s.t - c.t) / 10;
    if (u > 1) continue;
    const R = rig(c.k), [X, Z] = W(c.x, c.y), r = KD[c.k].r * VIS, sc = c.how === 3 ? r * (1 + u * 0.4) : r * (1 - u * 0.7);
    list.push({ m: R.foe, model: trs(X, 0, Z, 0, 0, 0, sc, sc * (c.how === 1 ? 1 - u * 0.6 : 1), sc), flash: 0.45 * (1 - u), fres: [1.2 * (1 - u), 0.6 * (1 - u), 0.2 * (1 - u)] });
  }
  const b = s.me ? s.mons.find((m) => m.id === s.me && !m.dead) : null;
  if (b && s.phase === 'play') {
    // 펑 범위 고리(바닥) — 안에 든 적이 많을수록 밝고 두근
    const [bx, bz] = W(b.x, b.y), pr = Math.max(b.r * VIS * 1.3, Math.min(popR(s, b.k), 0.49 - Math.hypot(bx, bz)));
    let inside = 0;
    for (const o of s.mons) if (!o.dead && o.id !== b.id && Math.hypot(o.x - b.x, (o.y - b.y) / YS) < pr) inside++;
    const beat = inside >= 5 ? 0.5 + 0.5 * Math.sin(sec * 9) : 0, ready = Math.min(1, s.charge);
    list.push({ m: RING, model: trs(bx, 0.006, bz, 0, 0, 0, pr * (1 + beat * 0.04), 0.2, pr * (1 + beat * 0.04)), pass: 2, tint: [0, 0, 0], emis: [0.02, 0.32 + inside * 0.06, 0.45 + inside * 0.07].map((v) => v * (0.45 + 0.55 * ready) * (1 + beat)), alpha: 0.8, shadow: false });
    list.push({ m: RING, model: trs(bx, 0.006, bz, sec, 0, 0, b.r * VIS * 1.2, 1.2, b.r * VIS * 1.2), pass: 2, tint: [0, 0, 0], emis: [0.1, 0.9, 1.2], alpha: 0.9, shadow: false });
  }
  ghostDraw(list, t);
  for (let i = fxs.length - 1; i >= 0; i--) {
    const f = fxs[i];
    f.t += dt;
    if (f.t > f.T) { fxs.splice(i, 1); continue; }
    if (f.t < 0) continue;
    const u = f.t / f.T, e = 1 - Math.pow(1 - u, 3);
    if (f.k === 'flash') glow(f.x, f.y, f.z, f.c, f.r * (1.2 + 2 * e), 1.1 * (1 - u) * (1 - u));
    else list.push({ m: RING, model: trs(f.x, f.y, f.z, 0, 0, 0, f.r * (0.2 + e), 1 + (1 - u) * 2, f.r * (0.2 + e)), pass: 2, tint: [0, 0, 0], emis: f.c.map((c) => c * 1.3 * (1 - u)), alpha: 1, shadow: false });
  }
  for (let i = pfs.length - 1; i >= 0; i--) {
    const p = pfs[i];
    p.life += dt;
    if (p.life > p.max) { pfs[i] = pfs[pfs.length - 1]; pfs.pop(); continue; }
    const u = p.life / p.max, e = 1 - Math.pow(1 - u, 2);
    const rr2 = p.r * (1 + 2.2 * e);
    list.push({ m: BALL, model: trs(p.x + p.vx * e * 0.35, p.y + rr2 * 0.6 + e * 0.03, p.z + p.vz * e * 0.35, 0, 0, 0, rr2), tint: p.c.map((v) => v * 0.82), pass: 1, alpha: 0.6 * (1 - u * u), shadow: false });
  }
  for (let i = chs.length - 1; i >= 0; i--) {
    const c = chs[i];
    c.life += dt;
    if (c.life > 1.1) { chs[i] = chs[chs.length - 1]; chs.pop(); continue; }
    c.vy -= 3 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt; c.rot += dt * 8;
    if (c.y < c.sz) (c.y = c.sz), (c.vy = Math.abs(c.vy) * 0.35), (c.vx *= 0.6), (c.vz *= 0.6);
    const k = Math.min(1, (1.1 - c.life) * 4);
    list.push({ m: BALL, model: trs(c.x, c.y, c.z, c.rot, c.rot * 0.7, 0, c.sz * k, c.sz * k * 0.75, c.sz * k), tint: c.c, shadow: false });
  }
  const sc = g.score(s);
  if (sc > lastScore && s.phase === 'play') {
    const b2 = s.me ? s.mons.find((m) => m.id === s.me) : null, [px, pz] = b2 ? W(b2.x, b2.y) : [0, 0];
    if (sc - lastScore >= 3) pops.push({ x: px, y: 0.16, z: pz, text: '+' + (sc - lastScore), t: now, big: sc - lastScore >= 20 });
  }
  lastScore = sc;
  let n = glows;
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    p.life += dt;
    if (p.life > p.max) { pts[i] = pts[pts.length - 1]; pts.pop(); continue; }
    p.vy -= p.grav * dt; const dr = Math.exp(-p.drag * dt); p.vx *= dr; p.vz *= dr; p.vy *= dr;
    p.x += p.vx * dt; p.y = Math.max(0.004, p.y + p.vy * dt); p.z += p.vz * dt;
    const a = (1 - p.life / p.max) * p.i, o = n * 8;
    PB[o] = p.x; PB[o + 1] = p.y; PB[o + 2] = p.z; PB[o + 3] = p.c[0]; PB[o + 4] = p.c[1]; PB[o + 5] = p.c[2]; PB[o + 6] = a; PB[o + 7] = p.sz;
    n++;
  }
  gfx.points(PB, n);
  L.fogS = Math.hypot(cam.eye[0] - cam.at[0], cam.eye[1] - cam.at[1], cam.eye[2] - cam.at[2]) + 0.9;
  gfx.frame(cam, L, list, sec, 0.85);
  drawOverlay(now);
  if (frames++ % 15 === 0) hudUpdate();
  jsMs.push(performance.now() - j0);
  if (jsMs.length > 600) jsMs.shift();
  if (FREEZE < 0 || frames < 3) requestAnimationFrame(frame);
  else if (frames === 3) document.body.dataset.ready = '1';
}

// ── 2D 겹: 숫자·큰 띠·내 몸 체력 ──
const FONT = 'ui-rounded, "SF Pro Rounded", "Arial Rounded MT Bold", "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';
function txt(text: string, x: number, y: number, px: number, fill: string, stroke = '#1d1430', lw = 0.22) {
  o2.font = `900 ${px}px ${FONT}`;
  o2.textAlign = 'center'; o2.textBaseline = 'middle'; o2.lineJoin = 'round';
  o2.lineWidth = px * lw; o2.strokeStyle = stroke; o2.strokeText(text, x, y);
  o2.fillStyle = fill; o2.fillText(text, x, y);
}
function drawOverlay(now: number) {
  const k = ov.width / innerWidth;
  o2.setTransform(k, 0, 0, k, 0, 0);
  o2.clearRect(0, 0, innerWidth, innerHeight);
  for (let i = pops.length - 1; i >= 0; i--) {
    const p = pops[i], u = (now - p.t) / 700;
    if (u > 1) { pops.splice(i, 1); continue; }
    const [sx, sy] = project(p.x, p.y + u * 0.06, p.z), pop = u < 0.15 ? 0.6 + (u / 0.15) * 0.6 : 1.2 - (u - 0.15) * 0.25;
    o2.globalAlpha = Math.min(1, (1 - u) * 2);
    txt(p.text, sx, sy, (p.big ? 32 : 22) * pop, p.big || p.text[0] === '+' ? '#ffd23f' : '#ffffff');
    o2.globalAlpha = 1;
  }
  const b = s.me ? s.mons.find((m) => m.id === s.me && !m.dead) : null;
  if (b && s.phase === 'play') {
    const [X, Z] = W(b.x, b.y), [sx, sy] = project(X, b.r * VIS * (rig(b.k).h + 0.9), Z), f = b.hp / b.max, w = 46;
    o2.fillStyle = 'rgba(20,14,40,.7)'; rr(sx - w / 2 - 2, sy - 5, w + 4, 10, 5); o2.fill();
    o2.fillStyle = f < 0.3 && Math.sin(now * 0.02) > 0 ? '#ff4b5c' : '#4fe6ff'; rr(sx - w / 2, sy - 3, w * f, 6, 3); o2.fill();
    o2.fillStyle = '#4fe6ff'; o2.beginPath(); o2.moveTo(sx - 6, sy - 9); o2.lineTo(sx + 6, sy - 9); o2.lineTo(sx, sy - 2 - 1); o2.closePath(); o2.strokeStyle = '#140c2a'; o2.lineWidth = 3; o2.stroke(); o2.fill();
  }
  const big = s.big && s.t - s.big.t < 80 ? s.big : s.banner && s.t - s.banner.t < 100 ? { text: s.banner.head, t: s.banner.t } : null;
  if (big) {
    const u = (s.t - big.t) / 80, sc = u < 0.12 ? 0.5 + (u / 0.12) * 0.7 : 1.2 - Math.min(0.2, (u - 0.12) * 0.5);
    o2.globalAlpha = Math.min(1, (1 - u) * 4);
    o2.font = `900 40px ${FONT}`;
    const fit = Math.min(44, (40 * innerWidth * 0.72) / o2.measureText(big.text).width);
    txt(big.text, innerWidth / 2, innerHeight * 0.3, fit * sc, '#fff4c4', '#2a1640', 0.26);
    o2.globalAlpha = 1;
  }
  if (s.phase === 'result' || s.phase === 'pick') {
    o2.fillStyle = 'rgba(16,10,40,.45)'; o2.fillRect(0, 0, innerWidth, innerHeight);
    txt(s.phase === 'pick' ? '둘 중 하나를 톡!' : '마당 비움!', innerWidth / 2, innerHeight * 0.4, 40, '#fff4c4', '#2a1640', 0.26);
    if (s.phase === 'result') txt('★'.repeat(s.got) + '☆'.repeat(3 - s.got), innerWidth / 2, innerHeight * 0.48, 44, '#ffd23f', '#5a3200', 0.2);
  }
}
function rr(x: number, y: number, w: number, h: number, r: number) {
  o2.beginPath(); o2.moveTo(x + r, y); o2.arcTo(x + w, y, x + w, y + h, r); o2.arcTo(x + w, y + h, x, y + h, r); o2.arcTo(x, y + h, x, y, r); o2.arcTo(x, y, x + w, y, r); o2.closePath();
}
function hudUpdate() {
  const st = STAGES[s.stage];
  hud.stage.textContent = `${Math.floor(s.stage / 4) + 1}-${(s.stage % 4) + 1}  ${st.name}`;
  hud.hearts.innerHTML = Array.from({ length: 3 }, (_, i) => `<i class="${i < s.hearts ? 'on' : ''}"></i>`).join('');
  hud.score.textContent = String(g.score(s));
}
(window as unknown as { __look: unknown }).__look = { bakeMs, get draws() { return gfx.draws; }, get js() { return jsMs; }, get hdr() { return gfx.hdr; }, get t() { return s.t; } };
hudUpdate();
requestAnimationFrame(frame);
