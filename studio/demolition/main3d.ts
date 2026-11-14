/**
 * 3D 실험 빌드 (C003) → web/public/studio/demolition/3d.html. 오너 주소(index.html)는 3D 게이트(C005)까지 2D 그대로.
 * 이번 범위: 정사영 4시점 · ⟲⟳(56px)·Q/E · 보이는 면만 누르기(자석) · 꾹 = 겨눔 + 땅의 발자국 칸·네모·추(📐 §10.4-2) · 떼면 폭약(돌은 한 번에 2개)
 *   · 다 붙이면 결과(쾅 애니메이션·유령은 C004).
 * 키보드: ← → 로 붙일 블록 고르기, 스페이스 누르는 동안 겨눔 → 떼면 붙이기, Q/E 돌리기, R 다시.
 */
import { GAS, METAL, STONE, capOf3, layoutOf3, simulate3, support3, type Footing, type Layout3, type Outcome3 } from './sim3d.ts';
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
const hud = document.getElementById('hud')!, msg = document.getElementById('msg')!, again = document.getElementById('again') as HTMLButtonElement;
const ctx = canvas.getContext('2d')!;

const stageIx = 0;
let L: Layout3 = layoutOf3(STAGES3[stageIx]), ch = new Int8Array(L.blocks.length), left = L.charges;
let view = 0, yaw = yawOf(0), rotFrom = yaw, rotTo = yaw, rotT = 1;
let aim = -1, holding = false, out: Outcome3 | null = null;
let W = 390, H = 468, cams: Cam[] = [];
let kbList: number[] = [], kbAt = 0;

const cubes = (): Cube[] => (out ? L.blocks.map((b, i) => ({ x: out!.fx[i], y: out!.fy[i], z: out!.fz[i], m: b.m })).filter((_, i) => out!.die[i] < 0) : L.blocks);
/** 지금 카메라: 줌·중심은 도착할 시점의 것, 회전각만 트윈 */
const cam = (): Cam => ({ ...cams[view], yaw });
const canAttach = (i: number) => !out && capOf3(L.blocks[i]) > 0 && ch[i] === 0 && capOf3(L.blocks[i]) <= left;

function size() {
  W = Math.min(root.clientWidth, 440);
  H = Math.round(W * ASPECT);
  const dpr = window.devicePixelRatio || 1;
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
  for (const [x, , z] of f.feet) poly(ground(c, x + 0.08, z + 0.08, x + 0.92, z + 0.92, 0.01), '#ffe14d', '#d99a12', 1.5);
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

function draw() {
  const c = cam();
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
  // 블록 (먼 것부터)
  const cb = cubes() as (Cube & { m?: number })[], ids = out ? L.blocks.map((_, i) => i).filter((i) => out!.die[i] < 0) : L.blocks.map((_, i) => i);
  for (const k of drawOrder(c, cb)) {
    const b = L.blocks[ids[k]], col = MAT[b.m] ?? PAINT[b.paint % PAINT.length];
    for (const fc of faces(c, cb[k])) poly(fc.pts, fc.f === 'top' ? col[1] : fc.f === 'zm' || fc.f === 'zp' ? col[0] : col[2], INK, 1.2);
    if (!out && ids[k] === aim && holding) for (const fc of faces(c, cb[k])) poly(fc.pts, undefined, '#ffc93c', 3.5);
  }
  // 발자국·추: 다리 밑이라 블록에 가리므로 블록 위에 엑스레이로 겹친다 — 지금 붙인 폭약 기준(흐리게) + 겨눈 블록까지 붙였을 때(진하게)
  const busy = rotT < 1;
  if (!out) {
    const now = support3(L, ch);
    if (aim >= 0 && holding && !busy) {
      const c2 = ch.slice();
      c2[aim] = capOf3(L.blocks[aim]);
      for (const f of support3(L, c2)) drawFooting(c, f, true);
    } else for (const f of now) drawFooting(c, f, false);
  }
  // 이웃집 팻말: 울타리가 판 끝보다 안쪽인 면 — 블록에 가리지 않게 블록 뒤에 그린다(🧪 C003 ①)
  const signs: [boolean, number, number][] = [[x0 > 0, x0 - 0.5, (z0 + z1 + 1) / 2], [x1 < L.W - 1, x1 + 1.5, (z0 + z1 + 1) / 2], [z0 > 0, (x0 + x1 + 1) / 2, z0 - 0.5], [z1 < L.D - 1, (x0 + x1 + 1) / 2, z1 + 1.5]];
  ctx.font = `800 ${Math.round(Math.max(14, c.s * 0.45))}px system-ui,sans-serif`;
  ctx.textAlign = 'center';
  for (const [on, sx, sz] of signs) {
    if (!on) continue;
    const p = proj(c, sx, 0, sz);
    ctx.fillStyle = '#c7362e';
    ctx.fillText('🏠 이웃집', p[0], p[1]);
  }
  // 붙인 폭약: 가려져도 보이게(엑스레이)
  if (!out)
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
  hud.textContent = `🏗️ ${d.title} · 🧨 ${left}개 남음`;
  if (out) {
    const why = out.ok ? `철거 성공! ${'★'.repeat(out.stars)}${'☆'.repeat(3 - out.stars)}` : out.hits.some((h) => h) ? '이웃집을 쳤어요!' : !out.moved ? '꿈쩍도 안 했어요' : `아직 높아요 (${out.height}칸 > ${L.goal}칸)`;
    msg.textContent = why;
    again.hidden = false;
  } else {
    msg.textContent = d.news;
    again.hidden = true;
  }
}

function attach(i: number) {
  if (i < 0 || !canAttach(i)) return;
  const k = capOf3(L.blocks[i]);
  ch[i] = k;
  left -= k;
  if (left <= 0) out = simulate3(L, ch, true);
  hudText();
}
function reset() {
  L = layoutOf3(STAGES3[stageIx]);
  ch = new Int8Array(L.blocks.length);
  left = L.charges;
  out = null;
  aim = -1;
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

let last = performance.now();
function loop(now: number) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (rotT < 1) {
    rotT = Math.min(1, rotT + dt / ROT_T);
    const e = rotT < 0.5 ? 2 * rotT * rotT : 1 - (-2 * rotT + 2) ** 2 / 2;
    yaw = rotFrom + (rotTo - rotFrom) * e;
    if (rotT >= 1) yaw = yawOf(view);
  }
  draw();
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
  aim = aimAt(cam(), L.blocks, canAttach, x, y);
});
canvas.addEventListener('pointermove', (e) => {
  if (!holding || !e.buttons || rotT < 1) return;
  const [x, y] = toXY(e);
  aim = aimAt(cam(), L.blocks, canAttach, x, y);
});
// 시스템이 손가락을 가져가면(스크롤·알림 등) 붙이지 않고 겨눔만 지운다 (🧪 C003 ⑦)
window.addEventListener('pointercancel', () => {
  holding = false;
  aim = -1;
});
window.addEventListener('pointerup', () => {
  if (!holding) return;
  holding = false;
  attach(aim);
  aim = -1;
});
rotL.addEventListener('click', () => rotate(-1));
rotR.addEventListener('click', () => rotate(1));
again.addEventListener('click', reset);
canvas.addEventListener('keydown', (e) => {
  if ([' ', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
  if (e.key === 'q' || e.key === 'Q') return rotate(-1);
  if (e.key === 'e' || e.key === 'E') return rotate(1);
  if (e.key === 'r' || e.key === 'R') return reset();
  if (out) return;
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    const c = cam();
    kbList = L.blocks.map((_, i) => i).filter((i) => canAttach(i) && aimAt(c, L.blocks, (j) => j === i, ...centerOf(c, i)) === i).sort((a, b) => centerOf(c, a)[0] - centerOf(c, b)[0]);
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
  state: () => ({ left, view, done: !!out, ok: out?.ok ?? null, stars: out?.stars ?? 0, cellPx: cams[0].s }),
};
size();
hudText();
new ResizeObserver(size).observe(root);
requestAnimationFrame(loop);
