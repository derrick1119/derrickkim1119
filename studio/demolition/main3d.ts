/**
 * 3D 실험 빌드 (C003) → web/public/studio/demolition/3d.html. 오너 주소(index.html)는 3D 게이트(C005)까지 2D 그대로.
 * 이번 범위: 정사영 4시점 · ⟲⟳(56px)·Q/E · 보이는 면만 누르기(자석) · 꾹 = 겨눔 + 땅의 발자국 칸·네모·추(📐 §10.4-2) · 떼면 폭약(돌은 한 번에 2개)
 *   · 다 붙이면 결과(쾅 애니메이션·유령은 C004).
 * 키보드: ← → 로 붙일 블록 고르기, 스페이스 누르는 동안 겨눔 → 떼면 붙이기, Q/E 돌리기, R 다시.
 */
import { GAS, METAL, STONE, capOf3, feetKey3, holdTags, lostFeet, verdict3, layoutOf3, simulate3, support3, type Footing, type Layout3, type Outcome3 } from './sim3d.ts';
import { STAGES3 } from './stages3d.ts';
import { aimAt, drawOrder, faces, fitCams, proj, yawOf, type Cam, type Cube } from './view3d.ts';

const ASPECT = 1.2, ROT_T = 0.3;
const PAINT = [['#e7b36a', '#f4cf95', '#b98545'], ['#f29bb2', '#ffc4d3', '#c66d86'], ['#ffd36b', '#ffe7a6', '#d1a23c'], ['#86bde8', '#b9dcf6', '#5b8fbd'], ['#9ad68f', '#c4ecbb', '#6aa660'], ['#f08a5d', '#ffb08c', '#bd5f37']];
const MAT: Record<number, string[]> = { [STONE]: ['#aaa6b9', '#cdc9da', '#7c788c'], [GAS]: ['#e8453a', '#ff7a6b', '#a92a22'], [METAL]: ['#7f8896', '#a9b2bf', '#5a626e'] };
const INK = '#3a2a3f';

const root = document.getElementById('game')!;
const canvas = document.createElement('canvas');
canvas.className = 'g-canvas';
canvas.tabIndex = 0;
canvas.setAttribute('aria-label', '비버 철거반 3D 실험 화면. 블록을 꾹 누르면 받침이 보이고, 떼면 폭약. 돌리기는 아래 버튼이나 Q·E.');
const rotL = document.createElement('button'), rotR = document.createElement('button');
rotL.className = 'rot l';
rotR.className = 'rot r';
rotL.textContent = '⟲';
rotR.textContent = '⟳';
rotL.setAttribute('aria-label', '왼쪽으로 돌리기 (Q)');
rotR.setAttribute('aria-label', '오른쪽으로 돌리기 (E)');
root.append(canvas, rotL, rotR);
const hud = document.getElementById('hud')!, msg = document.getElementById('msg')!, again = document.getElementById('again') as HTMLButtonElement, retry = document.getElementById('retry') as HTMLButtonElement;
let ctx = canvas.getContext('2d')!;
/** 손가락 자리(캔버스 css px) — 확대 말풍선용 */
let touch: [number, number] | null = null, inMagnifier = false, noText = false;

let stageIx = 0;
let L: Layout3 = layoutOf3(STAGES3[stageIx]), ch = new Int8Array(L.blocks.length), left = L.charges;
let view = 0, yaw = yawOf(0), rotFrom = yaw, rotTo = yaw, rotT = 1;
let aim = -1, holding = false, out: Outcome3 | null = null;
/** 쾅 연출 시계(틱, 60/초): 음수 = 3·2·1 셈, 0부터 = 시뮬이 기록한 움직임을 재생. 결과 글은 다 끝난 뒤 */
let bt = 0, shake = 0;
const COUNT = 3 * 30;
const played = () => !!out && bt >= out.end;
let W = 390, H = 468, cams: Cam[] = [];
let kbList: number[] = [], kbAt = 0;

/** 블록 i의 시각 t(틱) 자리 — 가운데 좌표. 넘어짐은 받침 모서리를 축으로 돌고(축에 맞춘 상자로 그림), 떨어짐·흘러내림은 직선 */
function poseAt(o: Outcome3, i: number, t: number): [number, number, number] {
  const b = L.blocks[i], segs = o.segs![i];
  let p: [number, number, number] = [b.x + 0.5, b.y + 0.5, b.z + 0.5];
  for (const g of segs) {
    if (t < g.t0) break;
    const k = Math.min(1, (t - g.t0) / Math.max(1, g.t1 - g.t0)), e = k * k * (3 - 2 * k);
    if (g.k === 1) {
      const u0 = (g.axis === 0 ? g.a[0] : g.a[2]) + 0.5 - g.pv, y0 = g.a[1] + 0.5 - g.py, th = (Math.PI / 2) * (k * k);
      const [ru, ry] = g.dir > 0 ? [u0 * Math.cos(th) + y0 * Math.sin(th), -u0 * Math.sin(th) + y0 * Math.cos(th)] : [u0 * Math.cos(th) - y0 * Math.sin(th), u0 * Math.sin(th) + y0 * Math.cos(th)];
      const u = g.pv + ru, y = Math.max(0.5, g.py + ry + g.lift * k);
      p = g.axis === 0 ? [u, y, g.a[2] + 0.5] : [g.a[0] + 0.5, y, u];
    } else p = [g.a[0] + 0.5 + (g.b[0] - g.a[0]) * e, g.a[1] + 0.5 + (g.b[1] - g.a[1]) * e, g.a[2] + 0.5 + (g.b[2] - g.a[2]) * e];
  }
  return p;
}
const cubes = (): (Cube & { i: number })[] => {
  // 셈(3·2·1) 동안은 아무것도 안 사라진다 — 쾅(0틱)부터 재생 (🧪 C004 ②)
  if (!out || bt < 0) return L.blocks.map((b, i) => ({ x: b.x, y: b.y, z: b.z, i }));
  const t = bt, r: (Cube & { i: number })[] = [];
  L.blocks.forEach((_, i) => {
    if (out!.die[i] >= 0 && t >= out!.die[i]) return;
    const [x, y, z] = poseAt(out!, i, t);
    r.push({ x: x - 0.5, y: y - 0.5, z: z - 0.5, i });
  });
  return r;
};
/** 지금 카메라: 줌·중심은 도착할 시점의 것, 회전각만 트윈 */
const cam = (): Cam => ({ ...cams[view], yaw });
const canAttach = (i: number) => !out && capOf3(L.blocks[i]) > 0 && ch[i] === 0 && capOf3(L.blocks[i]) <= left;
/** 겨눌 수 있는 블록: 붙일 수 있거나, 이미 붙여서 다시 톡 하면 뗄 수 있는 것(🧪 C002·C003: 죽은 첫 톡을 되돌릴 길) */
const canAim = (i: number) => !out && (ch[i] > 0 || canAttach(i));
let pvKey = '', pvOut: Outcome3 | null = null;
/** 미리 보기 결과(같은 폭약이면 다시 계산하지 않는다) */
function preview(c2: Int8Array) {
  const k = `${stageIx}|${c2.join('')}`; // 판 번호도 열쇠에(🧪 C007 ⑤: 블록 수가 같은 판끼리 섞이지 않게)
  if (k !== pvKey) (pvKey = k), (pvOut = simulate3(L, c2));
  return pvOut!;
}

function size() {
  W = Math.min(root.clientWidth, 440);
  H = Math.round(W * ASPECT);
  // 성능(🧪 C004: DPR 3에서 쾅 p95 50ms): 캔버스 배율은 2까지만
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cams = fitCams(L.lot, L.blocks, W, H, 12);
}

function poly(pts: [number, number][], fill?: string, stroke?: string, lw = 1, dash?: number[]) {
  ctx.beginPath();
  pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  if (fill) (ctx.fillStyle = fill), ctx.fill();
  if (stroke) {
    ctx.setLineDash(dash ?? []);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
    ctx.setLineDash([]);
  }
}
const ground = (c: Cam, x0: number, z0: number, x1: number, z1: number, y = 0): [number, number][] =>
  [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([x, z]) => proj(c, x, y, z).slice(0, 2) as [number, number]);

function drawFooting(c: Cam, f: Footing, strong: boolean) {
  const a = strong ? 0.85 : 0.4;
  ctx.globalAlpha = a;
  for (const [x, , z] of f.feet) poly(ground(c, x + 0.08, z + 0.08, x + 0.92, z + 0.92, 0.01), '#ffe14d', strong ? INK : '#d99a12', strong ? 2.5 : 1.5);
  if (f.rect) poly(ground(c, f.rect.x0, f.rect.z0, f.rect.x1, f.rect.z1, 0.02), undefined, INK, 2, [6, 4]);
  // 추: 무게중심에서 땅까지 실 + 점 (네모 안이면 초록 '버팀', 밖이면 빨강)
  const col = f.act === 'stand' ? '#23785a' : '#c7362e';
  const top = proj(c, f.cx, f.cy, f.cz), bot = proj(c, f.cx, 0, f.cz);
  ctx.strokeStyle = col;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(top[0], top[1]);
  ctx.lineTo(bot[0], bot[1]);
  ctx.stroke();
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.arc(bot[0], bot[1], strong ? 6 : 4, 0, Math.PI * 2);
  ctx.fill();
  if (strong && f.act === 'tip' && f.rect) {
    // 넘어질 방향: 네모 가장자리에서 바깥으로 굵은 화살표
    const mx = (f.rect.x0 + f.rect.x1) / 2, mz = (f.rect.z0 + f.rect.z1) / 2;
    const ex = f.axis === 0 ? (f.dir > 0 ? f.rect.x1 : f.rect.x0) : mx, ez = f.axis === 1 ? (f.dir > 0 ? f.rect.z1 : f.rect.z0) : mz;
    const tx = ex + (f.axis === 0 ? f.dir * 2.2 : 0), tz = ez + (f.axis === 1 ? f.dir * 2.2 : 0);
    const p0 = proj(c, ex, 0.05, ez), p1 = proj(c, tx, 0.05, tz);
    ctx.strokeStyle = '#c7362e';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(p0[0], p0[1]);
    ctx.lineTo(p1[0], p1[1]);
    ctx.stroke();
    const ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
    poly([[p1[0] + Math.cos(ang) * 10, p1[1] + Math.sin(ang) * 10], [p1[0] + Math.cos(ang + 2.4) * 10, p1[1] + Math.sin(ang + 2.4) * 10], [p1[0] + Math.cos(ang - 2.4) * 10, p1[1] + Math.sin(ang - 2.4) * 10]], '#c7362e');
  }
  ctx.globalAlpha = 1;
}

/** 땅 칸 (x, z)에 굵은 빨간 ✕ (흰 밑줄로 어느 땅색에서도 보이게) */
function crossAt(c: Cam, x: number, z: number, a = 1) {
  const q = ground(c, x + 0.18, z + 0.18, x + 0.82, z + 0.82, 0.03);
  ctx.globalAlpha = a;
  for (const [col, lw] of [['#ffffff', 8], ['#c7362e', 4.5]] as const) {
    ctx.strokeStyle = col;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(q[0][0], q[0][1]);
    ctx.lineTo(q[2][0], q[2][1]);
    ctx.moveTo(q[1][0], q[1][1]);
    ctx.lineTo(q[3][0], q[3][1]);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
/**
 * 결과 유령(📐 §10.4-3 · 🧪 C004 ③): 이대로 쾅 하면 남을 블록을 그 자리에 선 상자로(높이가 보이게, 목표선보다 높으면 빨강),
 * 울타리 밖에 떨어지면 💥(실패), 꽃밭에 떨어지면 🥀(별만 잃음) — 기호를 나눈다
 */
function drawLanding(c: Cam, o: Outcome3) {
  const marks = new Map<string, string>();
  for (let i = 0; i < L.blocks.length; i++) {
    if (o.die[i] >= 0) continue;
    const b = L.blocks[i], x = o.fx[i], y = o.fy[i], z = o.fz[i];
    if (x === b.x && z === b.z && y === b.y) continue;
    const high = y + 1 > L.goal;
    for (const fc of faces(c, { x, y, z })) poly(fc.pts, high ? 'rgba(255,97,80,.25)' : 'rgba(255,255,255,.35)', high ? '#c7362e' : '#ffffff', 2, [5, 3]);
    const outside = x < L.lot.x0 || x > L.lot.x1 || z < L.lot.z0 || z > L.lot.z1, flower = L.flowers.some(([fx, fz]) => fx === x && fz === z);
    if (outside) marks.set(`${x},${z}`, '💥');
    else if (flower && !marks.has(`${x},${z}`)) marks.set(`${x},${z}`, '🥀');
  }
  // 높이 실패(🧪 C006: 빨간 상자가 한 번도 안 떴다 — 높이 실패는 '서 있는 채 남는 건물' 때문): 무언가 움직이는데
  // 목표선보다 높게 그대로 남는 블록에도 빨간 테를 두른다 → '꿈쩍 안 함'과 그림으로 갈린다
  if (!o.ok && !o.hits.some((x) => x > 0))
    for (let i = 0; i < L.blocks.length; i++) {
      const b = L.blocks[i];
      if (o.die[i] >= 0 || o.fy[i] + 1 <= L.goal || o.fx[i] !== b.x || o.fz[i] !== b.z || o.fy[i] !== b.y) continue;
      for (const fc of faces(c, b)) poly(fc.pts, 'rgba(255,97,80,.18)', '#c7362e', 3, [6, 3]);
    }
  ctx.font = `${Math.round(Math.max(20, c.s * 0.55))}px system-ui,sans-serif`;
  ctx.textAlign = 'center';
  for (const [k, m] of marks) {
    const [x, z] = k.split(',').map(Number), p = proj(c, x + 0.5, 0.3, z + 0.5);
    ctx.fillText(m, p[0], p[1]);
  }
}
/** 목표 높이 리본(📐 §10.4-4): 울타리 네 모서리를 잇는 파란 점선을 목표 높이에 — 남는 것이 다 이 아래면 성공 */
function goalLine(c: Cam, strong: boolean) {
  const { x0, x1, z0, z1 } = L.lot, y = L.goal;
  const q = [[x0, z0], [x1 + 1, z0], [x1 + 1, z1 + 1], [x0, z1 + 1]].map(([x, z]) => proj(c, x, y, z).slice(0, 2) as [number, number]);
  ctx.globalAlpha = strong ? 0.9 : 0.5;
  poly(q, undefined, '#1f6fb2', 2.5, [8, 5]);
  const left = q.reduce((a, p) => (p[0] < a[0] ? p : a), q[0]);
  ctx.font = '800 15px system-ui,sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#1f6fb2';
  ctx.fillText(`목표 ${y}칸`, left[0] + 4, left[1] - 6);
  ctx.globalAlpha = 1;
}
/** 쾅 파편(🧪 C004 ②: 섬광 + 파편 ≥ 8). 화면 연출만 — 시뮬과 상관없고, 씨앗이 정해져 있어 매번 같다 */
interface Bit { x: number; y: number; vx: number; vy: number; life: number; col: string; r: number }
let bits: Bit[] = [], flash = 0, bitsMax = 0;
function spawnDebris() {
  if (!out) return;
  const c = cam();
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  flash = 1;
  bits = [];
  L.blocks.forEach((b, i) => {
    if (out!.die[i] !== 0) return; // 폭약을 붙인 블록(0틱에 터짐)마다
    const p = proj(c, b.x + 0.5, b.y + 0.5, b.z + 0.5);
    for (let k = 0; k < 14; k++) {
      const a = rnd() * Math.PI * 2, sp = 2 + rnd() * 5;
      bits.push({ x: p[0], y: p[1], vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 3, life: 30 + rnd() * 20, col: ['#ffe14d', '#ff9f1c', '#ff6150', '#e7b36a'][k % 4], r: 2 + rnd() * 3 });
    }
  });
  bitsMax = Math.max(bitsMax, bits.length);
}
function drawDebris(dt: number) {
  for (const p of bits) {
    p.x += p.vx * dt * 60;
    p.y += p.vy * dt * 60;
    p.vy += 0.35 * dt * 60;
    p.life -= dt * 60;
    if (p.life <= 0) continue;
    ctx.globalAlpha = Math.min(1, p.life / 20);
    ctx.fillStyle = p.col;
    ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
  }
  ctx.globalAlpha = 1;
  bits = bits.filter((p) => p.life > 0);
  if (flash > 0) {
    ctx.fillStyle = `rgba(255,255,240,${(0.55 * flash).toFixed(3)})`;
    ctx.fillRect(0, 0, W, H);
    flash = Math.max(0, flash - dt * 6);
  }
}
const verdict = (o: Outcome3) => verdict3(L, o);
/** 말풍선 글자표 */
function tag(x: number, y: number, text: string, bg: string, fg: string) {
  if (noText) return; // 판독 시험: 글자 없이 그림만
  ctx.font = '800 16px system-ui,sans-serif';
  const w = Math.min(W - 8, ctx.measureText(text).width + 18);
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - 26, w, 24, 12);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y - 9);
}

/** 하늘·땅·꽃밭·이웃집은 시점이 같으면 그대로라 한 번 그려 두고 붙인다 (🧪 C004 ④ 성능) */
let bgKey = '', bgc: HTMLCanvasElement | null = null;
function background(c: Cam) {
  const key = `${c.yaw.toFixed(5)}|${canvas.width}|${canvas.height}|${stageIx}`;
  if (key !== bgKey || !bgc) {
    bgKey = key;
    bgc ??= document.createElement('canvas');
    if (bgc.width !== canvas.width || bgc.height !== canvas.height) (bgc.width = canvas.width), (bgc.height = canvas.height);
    const keep = ctx;
    ctx = bgc.getContext('2d')!;
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#b9a6d9');
    g.addColorStop(0.55, '#f4a38c');
    g.addColorStop(1, '#ffd9a0');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // 땅: 현장 둘레 한 칸까지 흙, 울타리 안은 코르크, 빨간 선
    const { x0, x1, z0, z1 } = L.lot;
    poly(ground(c, Math.max(0, x0 - 1), Math.max(0, z0 - 1), Math.min(L.W, x1 + 2), Math.min(L.D, z1 + 2)), '#c98a55');
    poly(ground(c, x0, z0, x1 + 1, z1 + 1), '#e3b67f', '#c7362e', 3);
    for (const [fx, fz] of L.flowers) {
      poly(ground(c, fx + 0.05, fz + 0.05, fx + 0.95, fz + 0.95, 0.005), '#9ad68f');
      const p = proj(c, fx + 0.5, 0.02, fz + 0.5);
      ctx.fillStyle = (fx + fz) & 1 ? '#ff8fb0' : '#ffe070';
      ctx.beginPath();
      ctx.arc(p[0], p[1], c.s * 0.16, 0, Math.PI * 2);
      ctx.fill();
    }
    // 울타리 밖은 어느 면이든 이웃집이다(빨간 선 밖에 닿으면 실패) — 글자 대신 작은 집 아이콘을 울타리에서 한 칸 반 떨어진 땅에(땅이므로 블록보다 먼저 그린다, 🧪 C004)
    const mx = (x0 + x1 + 1) / 2, mz = (z0 + z1 + 1) / 2;
    const signs: [number, number][] = [[x0 - 1.4, mz], [x1 + 2.4, mz], [mx, z0 - 1.4], [mx, z1 + 2.4]];
    ctx.font = `${Math.round(Math.max(18, c.s * 0.55))}px system-ui,sans-serif`;
    ctx.textAlign = 'center';
    for (const [sx, sz] of signs) {
      const p = proj(c, sx, 0, sz);
      ctx.fillText('🏠', p[0], p[1]);
    }
    ctx = keep;
  }
  ctx.drawImage(bgc, 0, 0, W, H);
}

/**
 * 겨눔 확대 말풍선(GDD §8-3 · 📋 C004 조기 경보): 꾹 누르는 동안 손가락 위쪽에 손가락 밑을 2배로 — 손가락에 가린 블록이 보여서
 * 틀렸으면 한 번 고쳐 밀 수 있다. funqa F11은 '말풍선을 보고 한 번만 고쳐 누름'으로 잰다.
 */
const MAG_R = 54;
/** 말풍선 자리: 손가락 위가 기본 — 위쪽 결과 꼬리표(y 14~38)를 가릴 만큼 높으면 손가락 아래로 (🧪 C007 ④) */
function magPos(): { cx: number; cy: number; above: boolean } | null {
  if (!touch || !holding || out || rotT < 1) return null;
  const [x, y] = touch, R = MAG_R, above = y - R - 46 - R >= 44;
  return { cx: Math.min(W - R - 4, Math.max(R + 4, x)), cy: above ? y - R - 46 : y + R + 46, above };
}
function magnifier() {
  const m = magPos();
  if (!m || !touch) return;
  const [x, y] = touch, R = MAG_R, k = 2, { cx, cy } = m;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = '#fff6e8';
  ctx.fill();
  ctx.clip();
  // 캔버스를 자기 자신에서 복사하면 GPU 되읽기가 느리다(🧪 C006: DPR 3·CPU ×4에서 꾹 30fps) → 같은 장면을 2배로 다시 그린다
  ctx.translate(cx, cy);
  ctx.scale(k, k);
  ctx.translate(-x, -y);
  inMagnifier = true;
  draw();
  inMagnifier = false;
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#c7362e';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 8, cy);
  ctx.lineTo(cx + 8, cy);
  ctx.moveTo(cx, cy - 8);
  ctx.lineTo(cx, cy + 8);
  ctx.stroke();
}

/**
 * 블록 꼬리표('떼기' · '변화 없음') — 말풍선이 손가락 위에 뜨면 블록 바로 위 꼬리표를 덮으므로(🧪 C007 ④) 말풍선 위에 붙인다.
 * 말풍선이 손가락 아래로 가면 블록 위 그대로. 규칙은 sim3d holdTags(테스트가 지킨다).
 */
function blockTag() {
  if (out || aim < 0 || !holding || rotT < 1) return;
  const h = holdInfo(aim), t = holdTags(capOf3(L.blocks[aim]), ch[aim], left, !!h.quiet).block;
  if (!t) return;
  const m = magPos(), b = L.blocks[aim], p = proj(cam(), b.x + 0.5, b.y + 1.15, b.z + 0.5);
  const [x, y] = m?.above ? [m.cx, m.cy - MAG_R - 4] : [p[0], p[1]];
  tag(x, y, t, t === '떼기' ? '#3a2a3f' : '#7a5a6e', '#fff6e8');
}

/**
 * 꾹 미리 보기 계산 묶음 — 붙인 폭약·겨눈 블록이 바뀔 때만 다시 계산한다(🧪 C006: 매 프레임 시뮬을 돌려 말풍선 꾹 p95 33~50ms였다).
 * '변화 없음' 판단은 sim3d isQuiet와 같은 식(테스트가 isQuiet를 지킨다).
 */
type Hold = { now: Footing[]; nxt?: Footing[]; pv?: Outcome3; lost?: [number, number][]; quiet?: boolean };
let hKey = '';
/** 겨눔마다 결과를 모아 둔다(🧪 C007 ②: 손가락을 오가면 매번 다시 계산하던 것) — 판·폭약이 바뀌면 비운다 */
const hMemo = new Map<string, Hold>();
let hBase = '';
function holdInfo(a: number): Hold {
  const base = `${stageIx}|${ch.join('')}`, key = `${base}|${a}`;
  hKey = key;
  if (base !== hBase) (hBase = base), hMemo.clear();
  const got = hMemo.get(key);
  if (got) return got;
  const now = a < 0 ? support3(L, ch) : holdInfo(-1).now;
  let h: Hold = { now };
  if (a >= 0) {
    const c2 = ch.slice();
    c2[a] = ch[a] ? 0 : capOf3(L.blocks[a]);
    const nxt = support3(L, c2), pv = preview(c2), lost = lostFeet(now, nxt);
    h = { now, nxt, pv, lost, quiet: !pv.moved && !lost.length && feetKey3(now) === feetKey3(nxt) };
  }
  hMemo.set(key, h);
  hKey = key;
  return h;
}

/**
 * 꾹 미리 보기 겹그림(목표선 · 결과 유령 · 발자국 · 빠진 받침 ✕ · 꼬리표) — 겨눔·폭약·시점이 바뀔 때만 한 장 그려 두고 붙인다
 * (🧪 C006: 매 프레임 그리면 DPR 3·CPU ×4에서 꾹 p95 33ms). ✕는 깜빡이지 않고 알파 1.
 */
let ovKey = '', ovc: HTMLCanvasElement | null = null;
function holdOverlay(c: Cam, h: ReturnType<typeof holdInfo>) {
  const key = `${hKey}|${c.yaw.toFixed(5)}|${canvas.width}|${left}`;
  if (key !== ovKey || !ovc) {
    ovKey = key;
    ovc ??= document.createElement('canvas');
    // 크기가 같으면 다시 잡지 않는다(🧪 C007 ②: 겨눔이 바뀔 때마다 780×936 캔버스를 새로 할당해 30fps로 떨어졌다)
    if (ovc.width !== canvas.width || ovc.height !== canvas.height) (ovc.width = canvas.width), (ovc.height = canvas.height);
    const keep = ctx;
    ctx = ovc.getContext('2d')!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ovc.width, ovc.height);
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
    const nxt = h.nxt!, pv = h.pv!;
    goalLine(c, true);
    if (pv.moved) drawLanding(c, pv);
    for (const f of nxt) drawFooting(c, f, true);
    // 빠진 받침: 덩어리마다 '지금 딛고 있는 발' 중 이 블록까지 터지면 그 덩어리가 잃는 발 → 빨간 ✕
    // 윗다리·마루 귀를 끊어 다리 한 토막이 떨어져 나가도 덩어리 기준으로 발을 잃으니 ✕가 뜬다 (🧪 C004 ③ · F4b)
    for (const [x, z] of h.lost!) crossAt(c, x, z, 1);
    // 마지막 폭약을 겨누면 결과 꼬리표 — 2D 판정 말풍선과 같은 정보 (🧪 C005: '꿈쩍처럼 보이는 실패'를 없앤다, F4b ⓑ)
    if (holdTags(capOf3(L.blocks[aim]), ch[aim], left, !!h.quiet).result) {
      const v = verdict(pv);
      tag(W / 2, 40, `이대로 쾅 → ${v.text}`, v.ok ? '#23785a' : '#c7362e', '#ffffff');
    }
    ctx = keep;
  }
  ctx.drawImage(ovc, 0, 0, W, H);
}

function draw() {
  const c = cam();
  if (inMagnifier) {
    // 말풍선 안: 땅 한 장 + 블록 + 노란 테만(가볍게)
    ctx.fillStyle = '#f4c7a0';
    ctx.fillRect(-W, -H, 3 * W, 3 * H);
    const { x0, x1, z0, z1 } = L.lot;
    poly(ground(c, x0, z0, x1 + 1, z1 + 1), '#e3b67f', '#c7362e', 2);
  } else background(c);
  // 블록 (먼 것부터)
  const cb = cubes();
  for (const k of drawOrder(c, cb)) {
    if (inMagnifier && touch) {
      // 말풍선 안에는 손가락 둘레 블록만 (반지름 54px ÷ 2배 = 27px 안이 보인다)
      const q = proj(c, cb[k].x + 0.5, cb[k].y + 0.5, cb[k].z + 0.5);
      if (Math.abs(q[0] - touch[0]) > 27 + c.s || Math.abs(q[1] - touch[1]) > 27 + c.s) continue;
    }
    const b = L.blocks[cb[k].i], col = MAT[b.m] ?? PAINT[b.paint % PAINT.length];
    for (const fc of faces(c, cb[k])) poly(fc.pts, fc.f === 'top' ? col[1] : fc.f === 'zm' || fc.f === 'zp' ? col[0] : col[2], INK, 1.2);
    if (!out && cb[k].i === aim && holding) for (const fc of faces(c, cb[k])) poly(fc.pts, undefined, '#ffc93c', 3.5);
  }
  if (inMagnifier) return;
  // 쾅: 터진 블록 자리에 먼지 뭉게 (터진 뒤 24틱)
  if (out && bt >= 0)
    for (let i = 0; i < L.blocks.length; i++) {
      const d = out.die[i];
      if (d < 0 || bt < d || bt > d + 24) continue;
      const [x, y, z] = out.dust[i] ? poseAt(out, i, d) : [L.blocks[i].x + 0.5, L.blocks[i].y + 0.5, L.blocks[i].z + 0.5];
      const p = proj(c, x, y, z), k = (bt - d) / 24;
      ctx.globalAlpha = 0.75 * (1 - k);
      ctx.fillStyle = out.dust[i] ? '#d9c6de' : '#f3e3cf';
      ctx.beginPath();
      ctx.arc(p[0], p[1], c.s * (0.35 + 0.6 * k), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  if (out && bt < 0) {
    // 3·2·1 (비버 반장은 귀를 막는다 — M3)
    const n = Math.ceil(-bt / 30);
    ctx.font = '900 64px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 6;
    ctx.strokeStyle = INK;
    ctx.strokeText(String(n), W / 2, H * 0.3);
    ctx.fillStyle = '#ffc93c';
    ctx.fillText(String(n), W / 2, H * 0.3);
  } else if (out && bt < 40) {
    ctx.font = '900 72px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 7;
    ctx.strokeStyle = INK;
    ctx.globalAlpha = Math.min(1, (40 - bt) / 15);
    ctx.strokeText('쾅!', W / 2, H * 0.3);
    ctx.fillStyle = '#ff6150';
    ctx.fillText('쾅!', W / 2, H * 0.3);
    ctx.globalAlpha = 1;
  }
  // 발자국·추: 다리 밑이라 블록에 가리므로 블록 위에 엑스레이로 겹친다 — 지금 붙인 폭약 기준(흐리게) + 겨눈 블록까지 붙였을 때(진하게)
  const busy = rotT < 1;
  if (!out) {
    const h = holdInfo(aim >= 0 && holding && !busy ? aim : -1), now = h.now;
    if (aim >= 0 && holding && !busy) holdOverlay(c, h);
    else {
      for (const f of now) drawFooting(c, f, false);
      goalLine(c, false);
    }
  }
  // 이웃집 팻말: 울타리가 판 끝보다 안쪽인 면 — 블록에 가리지 않게 블록 뒤에 그린다(🧪 C003 ①)
  // 붙인 폭약: 가려져도 보이게(엑스레이)
  if (!out || bt < 0)
    for (let i = 0; i < ch.length; i++) {
      if (!ch[i]) continue;
      const b = L.blocks[i], p = proj(c, b.x + 0.5, b.y + 0.5, b.z + 0.5), r = c.s * 0.22;
      ctx.fillStyle = '#c7362e';
      ctx.fillRect(p[0] - r, p[1] - r * 0.7, r * 2, r * 1.4);
      ctx.strokeStyle = '#ffe14d';
      ctx.lineWidth = 2;
      ctx.strokeRect(p[0] - r, p[1] - r * 0.7, r * 2, r * 1.4);
      ctx.fillStyle = '#fff';
      ctx.font = `900 ${Math.round(r * 1.1)}px system-ui,sans-serif`;
      ctx.fillText(ch[i] > 1 ? `×${ch[i]}` : '🧨', p[0], p[1] + r * 0.4);
    }
  // 키보드 겨눔 표시
  if (!out && aim >= 0 && !holding) for (const fc of faces(c, L.blocks[aim])) poly(fc.pts, undefined, '#ffffff', 2, [4, 3]);
}

function hudText() {
  const d = STAGES3[stageIx];
  hud.textContent = `🏗️ ${stageIx + 1}. ${d.title} · 🧨 ${left}개 남음`;
  if (out && played()) {
    const why = verdict(out).text;
    msg.textContent = why;
    again.hidden = false;
    again.textContent = out.ok ? (stageIx + 1 < STAGES3.length ? '다음 판 ▶' : '처음부터') : '다시';
    // 별이 모자라면 같은 판 '다시'도 (🧪 C004 ⑤)
    retry.hidden = !(out.ok && out.stars < 3);
    if (out.ok && out.stars < 3) msg.textContent += !out.star[1] ? ' — 꽃밭을 덮었어요' : ' — 더 낮게 무너뜨리면 ★';
  } else {
    msg.textContent = out ? '3·2·1…' : [d.news, d.hint].filter(Boolean).join(' · ');
    again.hidden = true;
    retry.hidden = true;
  }
}

function attach(i: number) {
  if (i >= 0 && ch[i] > 0 && !out) {
    // 다시 톡 = 떼기
    left += ch[i];
    ch[i] = 0;
    return hudText();
  }
  if (i < 0 || !canAttach(i)) return;
  const k = capOf3(L.blocks[i]);
  ch[i] = k;
  left -= k;
  if (left <= 0) (out = simulate3(L, ch, true)), (bt = -COUNT);
  hudText();
}
function reset() {
  L = layoutOf3(STAGES3[stageIx]);
  cams = fitCams(L.lot, L.blocks, W, H, 12);
  ch = new Int8Array(L.blocks.length);
  left = L.charges;
  out = null;
  aim = -1;
  bt = 0;
  hudText();
}
function rotate(d: number) {
  if (rotT < 1) return;
  view = (view + d + 4) % 4;
  rotFrom = yaw;
  rotTo = rotFrom + d * (Math.PI / 2);
  rotT = 0;
  aim = holding ? -1 : aim;
}

let last = performance.now(), lastSig = '';
function loop(now: number) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (rotT < 1) {
    rotT = Math.min(1, rotT + dt / ROT_T);
    const e = rotT < 0.5 ? 2 * rotT * rotT : 1 - (-2 * rotT + 2) ** 2 / 2;
    yaw = rotFrom + (rotTo - rotFrom) * e;
    if (rotT >= 1) yaw = yawOf(view);
  }
  if (out && !played()) {
    const was = bt;
    bt += dt * 60;
    if (was < 0 && bt >= 0) (shake = 1), spawnDebris();
    if (played()) hudText();
  }
  shake = Math.max(0, shake - dt * 2.5);
  // 그림이 바뀔 것이 하나도 없으면 다시 그리지 않는다(🧪 C007 ②: 가만히 꾹에서도 캔버스 전체를 매 프레임 다시 칠해 30fps 경계였다)
  const sig = `${yaw}|${stageIx}|${ch.join('')}|${left}|${aim}|${holding}|${touch}|${out ? 1 : 0}|${bt}|${shake}|${bits.length}|${flash}|${canvas.width}x${canvas.height}|${noText}|${ovKey}|${bgKey}`;
  if (sig === lastSig) return void requestAnimationFrame(loop);
  lastSig = sig;
  const sx = shake ? (Math.sin(now / 23) * 10 * shake) : 0;
  ctx.save();
  ctx.translate(sx, 0);
  draw();
  drawDebris(dt);
  ctx.restore();
  magnifier();
  blockTag();
  requestAnimationFrame(loop);
}

const toXY = (e: PointerEvent) => {
  const r = canvas.getBoundingClientRect();
  return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H] as const;
};
canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (out || rotT < 1) return;
  holding = true;
  const [x, y] = toXY(e);
  touch = [x, y];
  aim = aimAt(cam(), L.blocks, canAim, x, y);
});
canvas.addEventListener('pointermove', (e) => {
  if (!holding || !e.buttons || rotT < 1) return;
  const [x, y] = toXY(e);
  touch = [x, y];
  aim = aimAt(cam(), L.blocks, canAim, x, y);
});
// 시스템이 손가락을 가져가면(스크롤·알림 등) 붙이지 않고 겨눔만 지운다 (🧪 C003 ⑦)
window.addEventListener('pointercancel', () => {
  holding = false;
  touch = null;
  aim = -1;
});
window.addEventListener('pointerup', () => {
  if (!holding) return;
  holding = false;
  touch = null;
  attach(aim);
  aim = -1;
});
rotL.addEventListener('click', () => rotate(-1));
rotR.addEventListener('click', () => rotate(1));
retry.addEventListener('click', reset);
again.addEventListener('click', () => {
  // 성공하면 다음 판, 실패하면 그 판만 다시 (하트 없음)
  if (out?.ok) stageIx = (stageIx + 1) % STAGES3.length;
  reset();
});
canvas.addEventListener('keydown', (e) => {
  if ([' ', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
  if (e.key === 'q' || e.key === 'Q') return rotate(-1);
  if (e.key === 'e' || e.key === 'E') return rotate(1);
  if (e.key === 'r' || e.key === 'R') return reset();
  if (out) return;
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    const c = cam();
    kbList = L.blocks.map((_, i) => i).filter((i) => canAim(i) && aimAt(c, L.blocks, (j) => j === i, ...centerOf(c, i)) === i).sort((a, b) => centerOf(c, a)[0] - centerOf(c, b)[0]);
    if (!kbList.length) return;
    kbAt = aim < 0 ? 0 : (Math.max(0, kbList.indexOf(aim)) + (e.key === 'ArrowRight' ? 1 : kbList.length - 1)) % kbList.length;
    aim = kbList[kbAt];
  }
  if (e.key === ' ' && aim >= 0 && !e.repeat) holding = true;
});
canvas.addEventListener('keyup', (e) => {
  if (e.key === ' ' && holding) {
    holding = false;
    const a = aim;
    attach(a);
    aim = -1;
  }
});
function centerOf(c: Cam, i: number): [number, number] {
  const b = L.blocks[i], p = proj(c, b.x + 0.5, b.y + 0.5, b.z + 0.5);
  return [p[0], p[1]];
}

/** shots·E2E용: 블록 가운데의 화면 좌표(현재 시점) · 상태 */
(window as unknown as { __d3: object }).__d3 = {
  screenOf: (x: number, y: number, z: number) => {
    const i = L.blocks.findIndex((b) => b.x === x && b.y === y && b.z === z), r = canvas.getBoundingClientRect(), p = centerOf(cam(), i);
    return [r.left + (p[0] / W) * r.width, r.top + (p[1] / H) * r.height];
  },
  /** 판독 시험용(🧪 C005): 판 k에서 폭약 pre를 붙여 둔 채 블록 aim을 꾹 누른 장면(말풍선 없이) */
  preview: (k: number, pre: number[][], a: number[]) => {
    stageIx = k;
    reset();
    for (const [x, y, z] of pre) {
      const i = L.blocks.findIndex((b) => b.x === x && b.y === y && b.z === z);
      ch[i] = capOf3(L.blocks[i]);
      left -= ch[i];
    }
    aim = L.blocks.findIndex((b) => b.x === a[0] && b.y === a[1] && b.z === a[2]);
    holding = true;
    touch = null;
    hudText();
  },
  /** 판독 시험용: 글자표(꼬리표·'변화 없음'·'떼기')를 끈다 */
  setNoText: (v: boolean) => void ((noText = v), (ovKey = '')),
  /** 판독 시험용: 시점을 바로 바꾼다(회전 애니메이션 없이) */
  setView: (v: number) => {
    view = ((v % 4) + 4) % 4;
    yaw = yawOf(view);
    rotT = 1;
  },
  state: () => ({ bitsMax, left, view, done: played(), playing: !!out && !played(), ok: out?.ok ?? null, stars: out?.stars ?? 0, cellPx: cams[0].s }),
};
size();
hudText();
new ResizeObserver(size).observe(root);
requestAnimationFrame(loop);
