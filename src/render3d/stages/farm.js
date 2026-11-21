// 1. 시골 농장(한낮): 컨셉 그대로 — 바다와 등대 절벽, 빨간 헛간, 풍차, 연못과 선창, 울타리, 건초, 둥근 나무, 먼 마을.
import {
  THREE, P, G, bake, terrain, cloudLayer, cloudMat, roundTree, bush, flowers, tuft, rock, fence, hayBale, house,
  groundBlob, waterMat, vcolMat, mesa, halfW, smooth, clamp, fbm, noise2, rgb, mixv, rng, TAU,
  sphereGeo, boxGeo, roundBoxGeo, cylGeo, coneGeo, torusGeo, latheGeo, extrudeGeo, glowPoints,
} from './common.js';
import { bakeStatic, glowSprite } from '../kit.js';

const SEA_Y = -0.55;

// 등대 곶(따로 만든 절벽 덩어리). 각도 t: 0 = +x, π/2 = 먼 쪽(−z), 3π/2 = 카메라 쪽.
const CAPE = { cx: -11.2, cz: -45, top: 3.9 };
const capeR = (t) => 6.2 + 2.2 * Math.exp(-((((t - 5.75 + Math.PI) % TAU) - Math.PI) ** 2) / 0.25) + 0.6 * Math.sin(2 * t + 1);

// 바닷가: 가운데 해안선은 z ≈ −25, 오른쪽 뭍은 멀수록 오른쪽으로 물러난다.
const coastZ = (x) => -24.5 - 1.4 * Math.sin(x * 0.27 + 0.7);
const rightX = (z) => 2.2 + 0.2 * (-24 - z);

// 땅 높이(바다 무시)
function landH(x, z) {
  if (z > -5.5) return 0;
  const rise = smooth(-5.5, -14, z);
  let h = rise * (0.3 + 0.16 * Math.sin(x * 0.55 + 0.4) + 0.12 * Math.sin(x * 0.23 - z * 0.21 + 1.1) + 0.1 * Math.sin(z * 0.37 + x * 0.1));
  // 왼쪽 앞 언덕(살짝)
  h += 0.7 * Math.exp(-((x + 6.5) ** 2) / 10 - ((z + 15) ** 2) / 30);
  // 오른쪽 마을 언덕: 뒤로 갈수록 높아진다
  h += smooth(1.5, 8, x) * smooth(-14, -40, z) * (2.4 + 0.5 * Math.sin(z * 0.17 + 0.5) + 0.4 * Math.sin(x * 0.31));
  // 풍차 언덕
  h += 1.0 * Math.exp(-((x - 5.4) ** 2) / 8 - ((z + 19) ** 2) / 14);
  h += 0.2 * (fbm(x * 0.2, z * 0.2) - 0.5) * rise;
  return h;
}

function landMask(x, z) {
  const cz = coastZ(x);
  let m = smooth(cz - 1.6, cz + 1.4, z);
  const xr = rightX(z);
  m = Math.max(m, smooth(xr - 1.2, xr + 1.2, x) * smooth(-110, -100, z));
  return m;
}

// 수평선 섬
function islands(x, z) {
  return (
    4.6 * Math.exp(-((x + 40) ** 2) / 260 - ((z + 205) ** 2) / 200) +
    2.6 * Math.exp(-((x - 26) ** 2) / 420 - ((z + 235) ** 2) / 300) +
    1.3 * Math.exp(-((x + 3) ** 2) / 50 - ((z + 170) ** 2) / 70)
  );
}

function H(x, z) {
  const m = landMask(x, z);
  const land = landH(x, z);
  let h = m > 0.995 ? land : SEA_Y - 2.0 + (land + 2.0 - SEA_Y + 0.3) * m;
  // 연못 웅덩이
  const pd = ((x + 1.55) / 1.75) ** 2 + ((z + 5.6) / 1.45) ** 2;
  if (pd < 1.3) h -= 0.22 * smooth(1.3, 0.75, pd);
  const isl = islands(x, z);
  if (isl > 0.05) h = Math.max(h, SEA_Y - 0.6 + isl);
  return h;
}

// 길(꼭짓점 색에 칠한다)
const pathZ = (x) => -0.12 + 0.1 * Math.sin(x * 0.7 + 0.3);
const branchX = (z) => 1.0 + 1.35 * smooth(-0.5, -11, z) + 0.35 * Math.sin(z * 0.45);
function dirt(x, z) {
  const n = noise2(x * 2.2, z * 2.2) * 0.14;
  let a = smooth(0.66, 0.44, Math.abs(z - pathZ(x)) + n);
  if (z < -0.3 && z > -11.6) a = Math.max(a, smooth(0.44, 0.27, Math.abs(x - branchX(z)) + n * 0.8) * smooth(-11.8, -11.2, z));
  return a;
}

const C_GRASS = rgb('#8fcf4c');
const C_GRASS_LIT = rgb('#b4dc5a');
const C_GRASS_DEEP = rgb('#5fae44');
const C_DIRT = rgb('#e2c690');
const C_DIRT_EDGE = rgb('#c9a46c');
const C_SAND = rgb('#f2dca4');
const C_ROCK = rgb('#c48d5f');
const C_ROCK_D = rgb('#9c6849');
const C_SEABED = rgb('#3f86c8');

function color(x, y, z, ny) {
  if (y < SEA_Y - 0.05) return C_SEABED;
  const n = fbm(x * 0.35 + 3, z * 0.35, 3);
  const n2 = noise2(x * 1.7, z * 1.7);
  let c = mixv(C_GRASS_DEEP, C_GRASS, smooth(0.25, 0.7, n));
  c = mixv(c, C_GRASS_LIT, smooth(0.5, 0.9, n2) * 0.45 + smooth(1.0, 3.5, y) * 0.35);
  // 바닷가 모래
  if (y < SEA_Y + 0.35) c = mixv(c, C_SAND, smooth(SEA_Y + 0.35, SEA_Y + 0.12, y));
  // 절벽(가파른 곳)
  if (ny < 0.72) {
    const band = 0.5 + 0.5 * Math.sin(y * 4.2 + x * 0.3);
    const rockC = mixv(C_ROCK, C_ROCK_D, band * 0.6 + (1 - ny) * 0.3);
    c = mixv(c, rockC, smooth(0.72, 0.5, ny));
  }
  // 흙길
  if (z > -12.5 && Math.abs(x) < 9) {
    const a = dirt(x, z);
    if (a > 0) c = mixv(c, mixv(C_DIRT_EDGE, C_DIRT, smooth(0.2, 0.8, a)), a);
  }
  return c;
}

const capeIn = (x, z) => {
  const t = (Math.atan2(-(z - CAPE.cz), x - CAPE.cx) + TAU) % TAU;
  return Math.hypot(x - CAPE.cx, z - CAPE.cz) / capeR(t);
};

// 바다 색: 얕은 곳은 옥빛, 물가엔 거품
function seaColor(x, y, z) {
  const ground = H(x, z);
  let depth = SEA_Y - ground;
  const ci = capeIn(x, z);
  depth = Math.min(depth, (ci - 1) * 9);
  let c = mixv(rgb('#5fc8dc'), rgb('#2f74cc'), smooth(0.1, 1.8, depth));
  c = mixv(c, rgb('#3b80d6'), smooth(-60, -160, z) * 0.5);
  if (depth < 0.14) c = mixv(c, rgb('#f2faff'), smooth(0.14, 0.0, depth));
  return c;
}

// ───────── 소품 ─────────

function barn(parent, x, y, z, ry, s) {
  const g = G(parent, x, y, z, ry, s);
  const red = '#d6473a';
  const white = '#fbf4e6';
  const roof = '#5d6a96';
  const W = 2.0;
  const Hh = 1.2;
  const D = 1.6;
  g.add(P(roundBoxGeo(W, Hh, D, 0.04, 2), red, { pos: [0, Hh / 2, 0], fin: 'soft' }));
  // 맞배(겹지붕) 박공
  const gp = [[-W / 2, 0], [W / 2, 0], [W * 0.38, 0.48], [0, 0.82], [-W * 0.38, 0.48]];
  g.add(P(extrudeGeo('barngable', gp, D * 0.98), red, { pos: [0, Hh, 0], fin: 'soft' }));
  // 지붕판 4장
  const over = 0.1;
  const segs = [
    [[W / 2 + over, -0.06], [W * 0.38, 0.48]],
    [[W * 0.38, 0.48], [0, 0.82]],
  ];
  for (const sg of [1, -1]) {
    for (const [[ax, ay], [bx, by]] of segs) {
      const len = Math.hypot(bx - ax, by - ay) + 0.06;
      const ang = Math.atan2(by - ay, bx - ax);
      const cx = (ax + bx) / 2;
      const cy = (ay + by) / 2;
      const nx = -Math.sin(ang) * 0.05;
      const nyy = Math.cos(ang) * 0.05;
      g.add(P(roundBoxGeo(len, 0.09, D + 0.24, 0.03, 2), roof, { pos: [sg * (cx - nx), Hh + cy + Math.abs(nyy), 0], rot: [0, 0, sg * ang], fin: 'soft' }));
    }
  }
  g.add(P(cylGeo(0.055, 0.055, D + 0.26, 8), '#46527d', { pos: [0, Hh + 0.88, 0], rot: [Math.PI / 2, 0, 0], fin: 'soft' }));
  // 흰 테두리: 모서리 기둥, 처마 띠
  const post = roundBoxGeo(0.08, Hh, 0.08, 0.02, 2);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(P(post, white, { pos: [sx * (W / 2 + 0.005), Hh / 2, sz * (D / 2 + 0.005)], fin: 'soft' }));
  g.add(P(roundBoxGeo(W + 0.04, 0.07, 0.06, 0.02, 2), white, { pos: [0, Hh - 0.03, D / 2 + 0.02], fin: 'soft', cast: false }));
  // 큰 문(흰 X)
  const fz = D / 2 + 0.02;
  g.add(P(roundBoxGeo(0.86, 0.86, 0.04, 0.02, 2), '#b8382e', { pos: [0, 0.43, fz], fin: 'soft', cast: false }));
  const bar = roundBoxGeo(0.07, 0.86, 0.05, 0.02, 2);
  g.add(P(bar, white, { pos: [-0.43, 0.43, fz + 0.01], fin: 'soft', cast: false }));
  g.add(P(bar, white, { pos: [0.43, 0.43, fz + 0.01], fin: 'soft', cast: false }));
  g.add(P(roundBoxGeo(0.92, 0.07, 0.05, 0.02, 2), white, { pos: [0, 0.86, fz + 0.01], fin: 'soft', cast: false }));
  const diag = roundBoxGeo(0.07, 1.16, 0.05, 0.02, 2);
  g.add(P(diag, white, { pos: [0, 0.43, fz + 0.015], rot: [0, 0, Math.PI / 4], fin: 'soft', cast: false }));
  g.add(P(diag, white, { pos: [0, 0.43, fz + 0.015], rot: [0, 0, -Math.PI / 4], fin: 'soft', cast: false }));
  // 다락문과 창
  g.add(P(roundBoxGeo(0.4, 0.36, 0.04, 0.02, 2), white, { pos: [0, Hh + 0.32, fz - 0.01], fin: 'soft', cast: false }));
  g.add(P(roundBoxGeo(0.3, 0.27, 0.05, 0.02, 2), '#7a2c26', { pos: [0, Hh + 0.32, fz], fin: 'soft', cast: false }));
  for (const sx of [-0.72, 0.72]) {
    g.add(P(roundBoxGeo(0.3, 0.3, 0.04, 0.02, 2), white, { pos: [sx, 0.78, fz - 0.005], fin: 'soft', cast: false }));
    g.add(P(roundBoxGeo(0.22, 0.22, 0.05, 0.02, 2), '#9fd3ff', { pos: [sx, 0.78, fz + 0.005], fin: 'gloss', cast: false }));
  }
  // 옆 헛간(오른쪽 낮은 지붕)
  const sx = W / 2 + 0.42;
  g.add(P(roundBoxGeo(0.84, 0.8, 1.2, 0.04, 2), red, { pos: [sx, 0.4, 0.1], fin: 'soft' }));
  g.add(P(roundBoxGeo(1.02, 0.08, 1.4, 0.03, 2), roof, { pos: [sx + 0.02, 0.9, 0.1], rot: [0, 0, -0.32], fin: 'soft' }));
  g.add(P(roundBoxGeo(0.3, 0.5, 0.04, 0.02, 2), '#7a2c26', { pos: [sx, 0.25, 0.71], fin: 'soft', cast: false }));
  // 사일로
  const sl = G(g, -W / 2 - 0.5, 0, -0.25);
  sl.add(P(cylGeo(0.4, 0.42, 2.0, 20), '#e9e2d6', { pos: [0, 1.0, 0], fin: 'soft' }));
  for (const yy of [0.5, 1.0, 1.5]) sl.add(P(torusGeo(0.41, 0.02, 4, 24), '#b9b2a8', { pos: [0, yy, 0], rot: [Math.PI / 2, 0, 0], fin: 'soft', cast: false }));
  sl.add(P(sphereGeo(1, 20, 10), '#5d6a96', { pos: [0, 2.0, 0], scale: [0.42, 0.32, 0.42], fin: 'soft' }));
  return g;
}

function lighthouse(parent, x, y, z, s) {
  const g = G(parent, x, y, z, 0, s);
  g.add(P(cylGeo(0.5, 0.56, 0.24, 20), '#c9c3d8', { pos: [0, 0.12, 0] }));
  const segs = 5;
  const H0 = 0.24;
  const tot = 2.2;
  for (let i = 0; i < segs; i++) {
    const r0 = 0.4 - (i / segs) * 0.13;
    const r1 = 0.4 - ((i + 1) / segs) * 0.13;
    const hh = tot / segs;
    g.add(P(cylGeo(r1, r0, hh, 20), i % 2 ? '#e2483c' : '#fbf6ec', { pos: [0, H0 + hh * (i + 0.5), 0], fin: 'soft' }));
  }
  const top = H0 + tot;
  g.add(P(cylGeo(0.4, 0.34, 0.08, 20), '#3c4569', { pos: [0, top + 0.04, 0], fin: 'soft' }));
  g.add(P(torusGeo(0.37, 0.018, 4, 24), '#3c4569', { pos: [0, top + 0.22, 0], rot: [Math.PI / 2, 0, 0], fin: 'soft' }));
  g.add(P(cylGeo(0.21, 0.21, 0.34, 16), '#fff3b0', { pos: [0, top + 0.25, 0], fin: 'glow' }));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    g.add(P(boxGeo(0.03, 0.34, 0.03), '#3c4569', { pos: [Math.cos(a) * 0.215, top + 0.25, Math.sin(a) * 0.215] }));
  }
  g.add(P(sphereGeo(1, 18, 10), '#e2483c', { pos: [0, top + 0.42, 0], scale: [0.27, 0.22, 0.27], fin: 'soft' }));
  g.add(P(sphereGeo(0.06, 8, 6), '#3c4569', { pos: [0, top + 0.66, 0] }));
  // 등대지기 집
  house(g, 0.95, 0, 0.15, -0.3, 0.62, { w: 1.1, d: 0.9, h: 0.7, wall: '#fbf6ec', roof: '#e2483c', detail: 1, chimney: true });
  return { g, lampY: y + (top + 0.25) * s };
}

function windmill(parent, x, y, z, ry, s) {
  const g = G(parent, x, y, z, ry, s);
  g.add(P(cylGeo(0.72, 0.78, 0.3, 20), '#c9c3d8', { pos: [0, 0.15, 0] }));
  const tower = latheGeo([[0.66, 0], [0.62, 0.6], [0.54, 1.4], [0.45, 2.2], [0.42, 2.4], [0, 2.4]], 24, 'milltower');
  g.add(P(tower, '#f6ead2', { pos: [0, 0.28, 0], fin: 'soft' }));
  g.add(P(torusGeo(0.5, 0.05, 6, 24), '#8f5a3a', { pos: [0, 1.25, 0], rot: [Math.PI / 2, 0, 0], fin: 'soft' }));
  g.add(P(sphereGeo(1, 20, 12), '#8f4a34', { pos: [0, 2.68, 0], scale: [0.55, 0.42, 0.62], fin: 'soft' }));
  g.add(P(roundBoxGeo(0.3, 0.46, 0.05, 0.03, 2), '#8f5a3a', { pos: [0, 0.5, 0.64], rot: [-0.05, 0, 0], fin: 'soft' }));
  for (const yy of [1.1, 1.8]) {
    g.add(P(roundBoxGeo(0.2, 0.24, 0.05, 0.02, 2), '#ffffff', { pos: [0, yy, 0.6 - yy * 0.06], rot: [-0.08, 0, 0], fin: 'soft' }));
    g.add(P(roundBoxGeo(0.14, 0.18, 0.05, 0.02, 2), '#7fb6e6', { pos: [0, yy, 0.61 - yy * 0.06], rot: [-0.08, 0, 0], fin: 'gloss' }));
  }
  // 날개(돈다): 허브 묶음은 굽지 않고, 날개만 따로 한 덩이로 합친다
  const hub = G(g, 0, 2.66, 0.62);
  hub.userData.dynamic = true;
  const sails = G(hub);
  sails.add(P(cylGeo(0.12, 0.12, 0.2, 14), '#6b4128', { rot: [Math.PI / 2, 0, 0], fin: 'soft' }));
  for (let i = 0; i < 4; i++) {
    const arm = G(sails, 0, 0, 0.06);
    arm.rotation.z = (i / 4) * TAU + 0.3;
    arm.add(P(roundBoxGeo(0.07, 1.75, 0.05, 0.02, 2), '#7a4b2a', { pos: [0, 0.9, 0], fin: 'soft' }));
    arm.add(P(roundBoxGeo(0.4, 1.25, 0.025, 0.012, 2), '#fff4dc', { pos: [0.22, 1.05, -0.01], fin: 'soft' }));
    for (let k = 0; k < 5; k++) arm.add(P(boxGeo(0.42, 0.025, 0.035), '#a8784e', { pos: [0.22, 0.5 + k * 0.27, 0.01] }));
    arm.add(P(boxGeo(0.025, 1.25, 0.035), '#a8784e', { pos: [0.42, 1.05, 0.01] }));
  }
  return { g, sails };
}

function boat(parent, x, y, z, s) {
  const g = G(parent, x, y, z, 0.25, s);
  g.add(P(roundBoxGeo(1.4, 0.34, 0.56, 0.12, 3), '#fbf6ec', { pos: [0, 0.12, 0], fin: 'soft' }));
  g.add(P(roundBoxGeo(1.34, 0.14, 0.5, 0.06, 2), '#e2483c', { pos: [0, -0.02, 0], fin: 'soft' }));
  g.add(P(roundBoxGeo(0.55, 0.34, 0.42, 0.06, 2), '#ffffff', { pos: [-0.15, 0.44, 0], fin: 'soft' }));
  g.add(P(roundBoxGeo(0.4, 0.1, 0.44, 0.03, 2), '#4f6fc2', { pos: [-0.15, 0.48, 0], fin: 'gloss' }));
  g.add(P(roundBoxGeo(0.6, 0.06, 0.46, 0.03, 2), '#3c4569', { pos: [-0.15, 0.63, 0], fin: 'soft' }));
  g.add(P(cylGeo(0.025, 0.025, 0.9, 6), '#3c4569', { pos: [0.3, 0.7, 0] }));
  bakeStatic(g);
  g.userData.dynamic = true;
  return g;
}

function pond(parent, cx, cz, rx, rz, r) {
  const g = G(parent);
  const water = new THREE.Mesh(new THREE.CircleGeometry(1, 48), waterMat('#3d8fe0', { rough: 0.1, env: 1.3 }));
  water.rotation.x = -Math.PI / 2;
  water.scale.set(rx, rz, 1);
  water.position.set(cx, -0.035, cz);
  water.userData.ownGeometry = true;
  water.userData.noCast = true;
  g.add(water);
  // 물가 돌
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * TAU + r() * 0.15;
    if (a > 0.3 && a < 1.2) continue; // 선창 자리
    const x = cx + Math.cos(a) * rx * 1.02;
    const z = cz + Math.sin(a) * rz * 1.02;
    g.add(P(sphereGeo(1, 9, 6), r() < 0.5 ? '#c9c3d8' : '#b5aec6', { pos: [x, -0.02, z], scale: [0.14 + r() * 0.08, 0.08 + r() * 0.04, 0.12 + r() * 0.06] }));
  }
  // 연잎
  for (const [px, pz, k] of [[-0.7, -0.4, 1], [-0.45, -0.7, 0.8], [0.65, -0.5, 0.9], [0.2, -0.9, 0.7]]) {
    g.add(P(cylGeo(0.14 * k, 0.14 * k, 0.02, 12), '#5fb046', { pos: [cx + px * rx * 0.8, -0.02, cz + pz * rz * 0.8] }));
    if (k > 0.85) g.add(P(sphereGeo(1, 8, 6), '#ff9cc0', { pos: [cx + px * rx * 0.8 + 0.04, 0.02, cz + pz * rz * 0.8], scale: [0.05, 0.04, 0.05] }));
  }
  // 나무 선창(물가에서 연못 쪽으로)
  const dock = G(g, cx + rx * 0.62, 0, cz + rz * 0.55, -0.75);
  for (let i = 0; i < 7; i++) dock.add(P(roundBoxGeo(0.62, 0.05, 0.17, 0.015, 2), i % 2 ? '#c08a56' : '#b37a45', { pos: [0, 0.07, -i * 0.185], fin: 'soft' }));
  for (const [px, pz] of [[-0.28, 0], [0.28, 0], [-0.28, -1.1], [0.28, -1.1]]) dock.add(P(cylGeo(0.045, 0.045, 0.3, 8), '#7a4b2a', { pos: [px, -0.02, pz] }));
  dock.add(P(cylGeo(0.12, 0.1, 0.2, 12), '#7fa6c8', { pos: [0.15, 0.19, -0.9], fin: 'soft' }));
  dock.add(P(cylGeo(0.012, 0.012, 1.0, 5), '#5a3a22', { pos: [-0.15, 0.4, -1.0], rot: [-0.9, 0, 0.3] }));
  // 오리 두 마리
  for (const [px, pz, ry] of [[-0.35, -0.15, 0.6], [-0.05, 0.25, -0.4]]) {
    const d = G(g, cx + px * rx, -0.03, cz + pz * rz, ry, 1);
    d.add(P(sphereGeo(1, 12, 8), '#ffffff', { pos: [0, 0.07, 0], scale: [0.13, 0.08, 0.09] }));
    d.add(P(sphereGeo(1, 12, 8), '#ffffff', { pos: [0.09, 0.16, 0], scale: 0.06 }));
    d.add(P(coneGeo(0.025, 0.06, 6), '#ff9a3c', { pos: [0.16, 0.155, 0], rot: [0, 0, -Math.PI / 2] }));
    d.add(P(sphereGeo(1, 6, 4), '#ffffff', { pos: [-0.12, 0.11, 0], scale: [0.05, 0.03, 0.05] }));
  }
  return g;
}

// ───────── 무대 ─────────

/** @param {{w:number,h:number}} size */
export function buildFarm({ w }) {
  const r = rng(11);
  const root = new THREE.Group();
  const props = G(root);
  const hw0 = halfW(w, 0);

  // 지형·바다·곶
  const ground = terrain({ H, C: color, rows: 150, cols: 112, keep: (x, z, y) => y > SEA_Y - 0.9 });
  const sea = terrain({ H: () => SEA_Y, C: seaColor, zNear: -18, zFar: -760, rows: 64, cols: 64, wide: 1.6, rough: 0.24, matKey: 'sea' });
  sea.material.envMapIntensity = 1.25;
  const cape = mesa({ cx: CAPE.cx, cz: CAPE.cz, R: capeR, top: CAPE.top, bottom: SEA_Y - 0.6, rings: 8, seg: 64, dome: 0.45, seed: 3 });

  const leafSets = [
    ['#3f8f3a', '#56a843', '#72c24c'],
    ['#4a9a3c', '#62b347', '#86cf56'],
    ['#367f3a', '#4c9a40', '#66b54a'],
  ];
  const tree = (x, z, s, k = (r() * 3) | 0, seg = 12, yy = null) => {
    const y = yy ?? H(x, z);
    roundTree(props, x, y, z, s, r, { leaf: leafSets[k], seg });
    if (z < -9) groundBlob(props, x + 0.15 * s, y, z + 0.1 * s, 0.75 * s, 0.6 * s, 0.3);
  };

  // 등대 곶 위: 등대, 등대지기 집, 나무
  const lhX = CAPE.cx + 4.4;
  const lhZ = CAPE.cz + 1.2;
  const lh = lighthouse(props, lhX, cape.topY(lhX, lhZ) - 0.05, lhZ, 1.3);
  for (const [dx, dz, s] of [[-3.5, 2.4, 1.1], [-1.6, 4.1, 0.85], [-5.2, -0.5, 1.2], [-2.6, -2.8, 1.0], [0.6, 3.6, 0.7], [-4.8, 3.4, 0.9]]) {
    const x = CAPE.cx + dx;
    const z = CAPE.cz + dz;
    tree(x, z, s, (r() * 3) | 0, 10, cape.topY(x, z) - 0.05);
  }
  for (const [dx, dz] of [[1.8, 3.8], [-0.4, 5.0], [2.9, 3.0]]) bush(props, CAPE.cx + dx, cape.topY(CAPE.cx + dx, CAPE.cz + dz), CAPE.cz + dz, 1.0, r, { seg: 8, flowers: 4 });
  // 절벽 밑 바위
  for (let i = 0; i < 9; i++) {
    const t = 4.6 + r() * 2.2;
    const rr = capeR(t) * (1.02 + r() * 0.05);
    rock(props, CAPE.cx + Math.cos(t) * rr, SEA_Y - 0.1, CAPE.cz - Math.sin(t) * rr, 1.4 + r() * 1.4, r, '#a99fb8');
  }

  // 오른쪽 언덕 마을과 풍차
  const walls = ['#fbeed2', '#ffe2c8', '#fff7ea', '#f4dcc0', '#e9e4f2'];
  const roofs = ['#e0773b', '#c95a3a', '#4f6fc2', '#8f4a34', '#d8613c'];
  const mX = 6.6;
  const mZ = -33;
  const mill = windmill(props, mX, H(mX, mZ) - 0.05, mZ, -0.32, 1.25);
  const spots = [];
  for (let i = 0; i < 40; i++) {
    const z = -25 - r() * 26;
    const x = rightX(z) + 1.4 + r() * (7 + (-24 - z) * 0.25);
    if (Math.hypot(x - mX, z - mZ) < 2.4) continue;
    if (spots.some(([sx, sz]) => Math.hypot(sx - x, sz - z) < 1.7)) continue;
    spots.push([x, z]);
  }
  spots.sort((a, b) => a[1] - b[1]);
  for (const [x, z] of spots) {
    const y = H(x, z);
    if (y < SEA_Y + 0.3) continue;
    if (r() < 0.25) {
      tree(x, z, 0.9 + r() * 0.4, (r() * 3) | 0, 8);
      continue;
    }
    house(props, x, y - 0.05, z, 0.25 - r() * 0.6, 0.95 + r() * 0.35, { w: 1.0 + r() * 0.5, d: 0.9, h: 0.65 + r() * 0.5, wall: walls[(r() * 5) | 0], roof: roofs[(r() * 5) | 0], detail: z > -32 ? 1 : 0, chimney: r() < 0.5 });
  }
  // 교회 탑
  {
    const x = 11.5;
    const z = -46;
    const y = H(x, z);
    const ch = G(props, x, y, z, -0.3, 1.3);
    ch.add(P(roundBoxGeo(0.8, 2.4, 0.8, 0.04, 1), '#f4e6d0', { pos: [0, 1.2, 0], fin: 'soft' }));
    ch.add(P(coneGeo(0.62, 1.1, 4), '#4f6fc2', { pos: [0, 2.95, 0], rot: [0, Math.PI / 4, 0], fin: 'soft' }));
    ch.add(P(cylGeo(0.16, 0.16, 0.04, 14), '#ffffff', { pos: [0, 1.95, 0.41], rot: [Math.PI / 2, 0, 0] }));
    ch.add(P(roundBoxGeo(0.26, 0.4, 0.05, 0.02, 1), '#7fa6d8', { pos: [0, 1.35, 0.41], fin: 'gloss' }));
  }
  for (const [x, z, s] of [[5.6, -19, 0.9], [7.4, -21.5, 1.0], [9.4, -25, 1.1]]) tree(x, z, s);

  // 바닷가 덤불·나무(가운데는 낮게 두어 바다가 보이게)
  for (let i = 0; i < 12; i++) {
    const x = -6 + i * 0.85 + r() * 0.4;
    const z = coastZ(x) + 1.8 + r() * 1.2;
    if (H(x, z) < SEA_Y + 0.3) continue;
    if (x < -3.5 || x > 2.5) tree(x, z, 0.6 + r() * 0.3, (r() * 3) | 0, 9);
    else bush(props, x, H(x, z), z, 1.2 + r() * 0.5, r, { seg: 8 });
  }

  // 가운데 헛간
  const bX = 2.5;
  const bZ = -12.8;
  barn(props, bX, H(bX, bZ) - 0.04, bZ, -0.22, 0.95);
  for (const [x, z, s] of [[5.2, -11.6, 1.0], [-4.3, -11.5, 1.15], [-6.0, -15.5, 1.3], [-5.0, -19.5, 1.0], [-7.4, -20.5, 1.1]]) tree(x, z, s);
  hayBale(props, bX - 1.35, H(bX - 1.35, bZ + 1.4), bZ + 1.4, 0.8, 0.4);
  hayBale(props, bX - 0.75, H(bX - 0.75, bZ + 1.7), bZ + 1.7, 0.8, -0.3);
  fence(props, [[bX - 2.8, bZ + 2.7], [bX + 1.6, bZ + 2.8], [bX + 3.4, bZ + 1.6]], { y: H });
  // 채소밭
  {
    const fx = -1.6;
    const fz = -15.5;
    for (let row = 0; row < 5; row++) {
      for (let k = 0; k < 9; k++) {
        const x = fx - 1.6 + k * 0.4 + row * 0.08;
        const z = fz + row * 0.55;
        const y = H(x, z);
        props.add(P(sphereGeo(1, 7, 5), row % 2 ? '#5fb046' : '#79c650', { pos: [x, y + 0.08, z], scale: [0.17, 0.13, 0.17] }));
      }
    }
  }

  // 가까운 들판: 연못, 울타리, 건초
  const pX = -1.55;
  const pZ = -5.6;
  pond(props, pX, pZ, 1.6, 1.25, r);
  fence(props, [[pX - 2.6, pZ - 1.6], [pX - 0.5, pZ - 1.9], [pX + 1.6, pZ - 1.6]], { y: H });
  fence(props, [[0.9, -2.7], [2.6, -2.75], [4.4, -2.6], [hw0 * 2.2, -2.8]], { y: H });
  hayBale(props, 2.0, 0, -3.8, 0.95, 0.5);
  hayBale(props, 3.6, 0, -4.6, 1.05, -0.2);
  hayBale(props, 2.9, 0, -4.1, 0.75, 1.2);

  // 화면 양옆 큰 나무(액자)
  const edgeL = -halfW(w, -3.2) - 0.1;
  const edgeR = halfW(w, -4.2) + 0.1;
  roundTree(props, edgeL, 0, -3.2, 1.55, r, { leaf: leafSets[0], seg: 16 });
  roundTree(props, edgeR + 0.3, 0, -4.2, 1.6, r, { leaf: leafSets[1], seg: 16 });
  roundTree(props, edgeL + 1.3, 0, -7.2, 1.2, r, { leaf: leafSets[2], seg: 14 });
  roundTree(props, edgeR - 0.6, 0, -8.5, 1.3, r, { leaf: leafSets[0], seg: 14 });
  for (const [x, z, s] of [[edgeL + 0.9, -2.1, 1.1], [edgeR - 0.7, -2.2, 1.2], [edgeL + 2.4, -4.4, 0.8], [edgeR - 1.7, -5.8, 0.9], [-4.4, -8.6, 1], [0.3, -7.8, 0.8], [-2.6, -10.5, 0.9], [0.2, -11, 0.8]]) bush(props, x, H(x, z), z, s, r, { flowers: r() < 0.6 ? 5 : 0, flowerColor: ['#ffffff', '#ff8fb0', '#ffd23f'][(r() * 3) | 0] });

  // 길가 꽃·풀(통로 안에서는 0.1 이하, 앞은 0.15 이하)
  for (let i = 0; i < 22; i++) {
    const x = (r() * 2 - 1) * (hw0 + 2.5);
    const z = -1.2 - r() * 5;
    if (dirt(x, z) > 0.1) continue;
    if (((x - pX) / 1.9) ** 2 + ((z - pZ) / 1.5) ** 2 < 1) continue;
    flowers(props, x, H(x, z), z, 1.1 + r() * 0.6, r);
  }
  for (let i = 0; i < 26; i++) {
    const x = (r() * 2 - 1) * (hw0 + 0.6);
    const z = 0.95 + r() * 2.4;
    if (r() < 0.5) flowers(props, x, 0, z, 0.9 + r() * 0.5, r, { n: 4 });
    else tuft(props, x, 0, z, 1.0, r, '#5aa83f');
  }
  for (let i = 0; i < 16; i++) {
    const x = (r() * 2 - 1) * (hw0 + 0.4);
    const z = (r() * 2 - 1) * 0.85;
    if (dirt(x, z) > 0.3) continue;
    tuft(props, x, 0, z, 0.7, r, '#5aa83f');
  }
  for (const [x, z, s] of [[-2.8, -2.4, 0.8], [3.2, -1.9, 0.6], [-0.6, -9.5, 0.9]]) rock(props, x, H(x, z), z, s, r);

  // 움직이는 것: 풍차 날개, 배
  const sails = mill.sails;
  const boatG = boat(root, 0.5, SEA_Y, -64, 1.7);
  bake(props);
  bakeStatic(sails);
  root.add(ground, sea, cape.mesh);

  // 등대 불빛
  const beacon = glowSprite('#fff2b0', 1.8, 0.5);
  beacon.position.set(lhX, lh.lampY, lhZ + 0.3);
  root.add(beacon);

  // 구름: 양옆 큰 뭉게구름 + 수평선 구름 띠
  const cm = cloudMat('#ffffff', '#9eaae6');
  const cmFar = cloudMat('#f8fbff', '#c2cdf0', { fog: true });
  const sky = G(root);
  const drift = cloudLayer(sky, 5, [
    { x: -27, y: 15, z: -112, w: 28, h: 14, n: 24, seg: 14, speed: 0.16, span: 75 },
    { x: 25, y: 22, z: -122, w: 24, h: 11, n: 22, seg: 14, speed: 0.14, span: 75 },
    { x: -12, y: 47, z: -150, w: 24, h: 8, n: 16, speed: 0.12, span: 85, seg: 12 },
    { x: 58, y: 40, z: -170, w: 30, h: 10, n: 16, speed: 0.1, span: 95, seg: 12 },
  ], cm);
  const bank = cloudLayer(sky, 9, [
    { x: -40, y: 1, z: -250, w: 60, h: 14, n: 16, seg: 12, speed: 0.04, span: 120 },
    { x: 28, y: 0, z: -260, w: 56, h: 11, n: 14, seg: 12, speed: 0.04, span: 120 },
    { x: 92, y: 1, z: -270, w: 50, h: 13, n: 14, seg: 12, speed: 0.04, span: 120 },
  ], cmFar);

  const env = {
    sky: { top: '#2a5ed6', mid: '#5797ee', horizon: '#c8e6ff', sunDir: [-0.55, 0.6, -1], sunColor: '#fff4d6', sunStrength: 0.55 },
    fog: { color: '#c3e1ff', near: 26, far: 270 },
    sun: { color: '#fff0d4', intensity: 2.2, dir: [-0.6, 1, 0.7] },
    hemi: { sky: '#b6d8ff', ground: '#93be66', intensity: 0.9 },
    exposure: 1.0,
  };

  return {
    group: root,
    env,
    update(t) {
      sails.rotation.z = -t * 0.9;
      boatG.position.y = SEA_Y + Math.sin(t * 1.3) * 0.05;
      boatG.rotation.z = Math.sin(t * 1.1) * 0.04;
      boatG.position.x = 0.5 + Math.sin(t * 0.05) * 3;
      drift(t);
      bank(t);
      beacon.material.opacity = 0.4 + 0.12 * Math.sin(t * 2.2);
    },
  };
}
