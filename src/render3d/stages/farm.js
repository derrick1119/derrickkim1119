// 1. 시골 농장(한낮): 컨셉 그대로 — 바다와 등대 절벽, 빨간 헛간, 풍차, 연못과 선창, 굵은 울타리, 건초, 두 톤 나무, 먼 마을.
//    값 구조: 앞(통로 앞 풀밭·양옆 큰 나무)은 짙고 진하게, 가운데 들판은 볕이 들어 밝게, 먼 바다·마을은 푸른 안개 속으로.
import {
  THREE, P, G, bake, bakeV, terrain, cloudLayer, cloudMat, roundTree, bush, rock, mushroom, fence, hayBale, house,
  groundBlob, waterMat, mesa, halfW, smooth, fbm, noise2, rgb, mixv, rng, TAU, sphereGeo, roundBoxGeo, cylGeo,
  coneGeo, torusGeo, latheGeo, extrudeGeo, LEAF, lanePlants, flowerGeo, tulipGeo, groundDecal, grassStrokes,
  speckle, glowS, sharedMat, inkLine, birdFlock,
} from './common.js';

const SEA_Y = -0.55;

// 등대 곶(따로 만든 절벽 덩어리). 각도 t: 0 = +x, π/2 = 먼 쪽(−z), 3π/2 = 카메라 쪽.
const CAPE = { cx: -11.2, cz: -45, top: 3.9 };
const capeR = (t) => 6.2 + 2.2 * Math.exp(-((((t - 5.75 + Math.PI) % TAU) - Math.PI) ** 2) / 0.25) + 0.6 * Math.sin(2 * t + 1);

// 바닷가: 가운데 해안선은 z ≈ −25, 오른쪽 뭍은 멀수록 오른쪽으로 물러난다.
const coastZ = (x) => -24.5 - 1.4 * Math.sin(x * 0.27 + 0.7);
const rightX = (z) => 2.2 + 0.2 * (-24 - z);

// 연못
const POND = { x: -1.55, z: -5.6, rx: 1.6, rz: 1.25 };
const inPond = (x, z, k = 1) => ((x - POND.x) / (POND.rx * k)) ** 2 + ((z - POND.z) / (POND.rz * k)) ** 2 < 1;

// 땅 높이(바다 무시)
function landH(x, z) {
  if (z > -5.5) return 0;
  const rise = smooth(-5.5, -14, z);
  let h = rise * (0.3 + 0.16 * Math.sin(x * 0.55 + 0.4) + 0.12 * Math.sin(x * 0.23 - z * 0.21 + 1.1) + 0.1 * Math.sin(z * 0.37 + x * 0.1));
  h += 0.7 * Math.exp(-((x + 6.5) ** 2) / 10 - ((z + 15) ** 2) / 30);
  h += smooth(1.5, 8, x) * smooth(-14, -40, z) * (2.4 + 0.5 * Math.sin(z * 0.17 + 0.5) + 0.4 * Math.sin(x * 0.31));
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
  const pd = ((x - POND.x) / 1.75) ** 2 + ((z - POND.z) / 1.45) ** 2;
  if (pd < 1.3) h -= 0.22 * smooth(1.3, 0.75, pd);
  const isl = islands(x, z);
  if (isl > 0.05) h = Math.max(h, SEA_Y - 0.6 + isl);
  return h;
}

// 길: 통로를 따라 가는 흙길 + 헛간으로 갈라지는 길
const pathZ = (x) => -0.1 + 0.12 * Math.sin(x * 0.7 + 0.3);
const PATH_W = 0.5;
const branchX = (z) => 1.0 + 1.35 * smooth(-0.5, -11, z) + 0.35 * Math.sin(z * 0.45);
function dirt(x, z) {
  const n = noise2(x * 2.2, z * 2.2) * 0.14;
  let a = smooth(0.66, 0.44, Math.abs(z - pathZ(x)) + n);
  if (z < -0.3 && z > -11.6) a = Math.max(a, smooth(0.44, 0.27, Math.abs(x - branchX(z)) + n * 0.8) * smooth(-11.8, -11.2, z));
  return a;
}

const C_DEEP = rgb('#3f9440');
const C_GRASS = rgb('#7fca48');
const C_LIT = rgb('#c2e35c');
const C_FRONT = rgb('#2f7a3a');
const C_DIRT = rgb('#ecd096');
const C_DIRT_EDGE = rgb('#c79a62');
const C_SAND = rgb('#f6e2a8');
const C_ROCK = rgb('#d39a64');
const C_ROCK_D = rgb('#a06a4a');
const C_SEABED = rgb('#3f86c8');

function color(x, y, z, ny) {
  if (y < SEA_Y - 0.05) return C_SEABED;
  // 칠한 풀밭: 큰 얼룩(짙은 풀 ↔ 볕 든 연두) + 잔 얼룩
  const n = fbm(x * 0.28 + 3, z * 0.28, 3);
  const n2 = noise2(x * 1.3 + 5, z * 1.6);
  let c = mixv(C_DEEP, C_GRASS, smooth(0.25, 0.62, n));
  c = mixv(c, C_LIT, smooth(0.55, 0.85, n2) * 0.22 + smooth(1.0, 3.5, y) * 0.3);
  // 가운데 들판(헛간 앞)은 볕이 가득
  c = mixv(c, C_LIT, Math.exp(-((x - 0.5) ** 2) / 30 - ((z + 9) ** 2) / 14) * 0.35);
  // 앞 풀밭은 짙고 차갑게(액자) — 통로 뒤 가장자리도 살짝
  c = mixv(c, C_FRONT, smooth(1.0, 6.5, z) * 0.55 + smooth(0.55, 1, Math.abs(x) / halfW(390, z)) * smooth(-7, -1, z) * 0.18);
  if (y < SEA_Y + 0.35) c = mixv(c, C_SAND, smooth(SEA_Y + 0.35, SEA_Y + 0.12, y));
  if (ny < 0.72) {
    const band = 0.5 + 0.5 * Math.sin(y * 4.2 + x * 0.3);
    c = mixv(c, mixv(C_ROCK, C_ROCK_D, band * 0.6 + (1 - ny) * 0.3), smooth(0.72, 0.5, ny));
  }
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
  depth = Math.min(depth, (capeIn(x, z) - 1) * 9);
  let c = mixv(rgb('#5fd6e0'), rgb('#2a6fd0'), smooth(0.1, 1.8, depth));
  c = mixv(c, rgb('#3b82da'), smooth(-60, -160, z) * 0.5);
  if (depth < 0.14) c = mixv(c, rgb('#f2faff'), smooth(0.14, 0.0, depth));
  return c;
}

// 통로 앞뒤 잔무늬(흙길과 그 가장자리, 바퀴 자국, 풀 결)
function drawDecal(ctx, W, Hh, X, Z, r) {
  const u = W / 13.2;
  // 풀 결
  grassStrokes(ctx, 0, 0, W, Hh, 700, ['rgba(30,100,45,0.14)', 'rgba(225,255,150,0.14)'], r, [4, 9]);
  // 길 모양(위·아래 가장자리 점)
  const top = [];
  const bot = [];
  for (let x = -6.6; x <= 6.61; x += 0.1) {
    const wob = 0.05 * Math.sin(x * 3.1) + 0.03 * Math.sin(x * 7.3 + 1);
    top.push([X(x), Z(pathZ(x) - PATH_W - wob)]);
    bot.push([X(x), Z(pathZ(x) + PATH_W + wob * 0.7)]);
  }
  const br = [];
  const bl = [];
  for (let z = -0.2; z >= -7.01; z -= 0.1) {
    const hw = 0.33 + 0.03 * Math.sin(z * 4);
    br.push([X(branchX(z) + hw), Z(z)]);
    bl.push([X(branchX(z) - hw), Z(z)]);
  }
  const pathShape = () => {
    ctx.beginPath();
    top.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    for (let i = bot.length - 1; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]);
    ctx.closePath();
    ctx.moveTo(bl[0][0], bl[0][1]);
    bl.forEach(([x, y]) => ctx.lineTo(x, y));
    for (let i = br.length - 1; i >= 0; i--) ctx.lineTo(br[i][0], br[i][1]);
    ctx.closePath();
  };
  // 풀 언저리 그늘(길이 살짝 패인 느낌)
  ctx.save();
  ctx.lineJoin = 'round';
  pathShape();
  ctx.strokeStyle = 'rgba(30,80,40,0.45)';
  ctx.lineWidth = u * 0.16;
  ctx.stroke();
  ctx.fillStyle = '#c99a60';
  ctx.fill();
  ctx.clip();
  // 길 안: 가장자리 짙은 흙 → 가운데 밝은 흙
  ctx.strokeStyle = '#e8c98e';
  ctx.lineWidth = u * 0.55;
  ctx.beginPath();
  for (let x = -6.6; x <= 6.61; x += 0.1) (x === -6.6 ? ctx.moveTo : ctx.lineTo).call(ctx, X(x), Z(pathZ(x)));
  ctx.stroke();
  ctx.beginPath();
  for (let z = -0.4; z >= -7; z -= 0.1) (z === -0.4 ? ctx.moveTo : ctx.lineTo).call(ctx, X(branchX(z)), Z(z));
  ctx.lineWidth = u * 0.32;
  ctx.stroke();
  speckle(ctx, 0, 0, W, Hh, 260, ['rgba(150,100,60,0.18)', 'rgba(255,245,220,0.3)'], r, [1.5, 3.5]);
  ctx.restore();
  // 연못 자리는 비우고, 멀리 갈수록 흐려진다
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.ellipse(X(POND.x), Z(POND.z), POND.rx * 1.12 * u, POND.rz * 1.12 * u, 0, 0, TAU);
  ctx.fill();
  const fade = ctx.createLinearGradient(0, Z(-4.2), 0, Z(-7));
  fade.addColorStop(0, 'rgba(0,0,0,0)');
  fade.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.fillStyle = fade;
  ctx.fillRect(0, Z(-4.2), W, Hh - Z(-4.2));
  ctx.globalCompositeOperation = 'source-over';
}

// ───────── 소품 ─────────

function barn(parent, x, y, z, ry, s) {
  const g = G(parent, x, y, z, ry, s);
  const red = '#dc4636';
  const redTT = ['#a8243a', '#ff5e48'];
  const white = '#fff8ea';
  const roofTT = ['#2c3678', '#7486d8'];
  const W = 2.0;
  const Hh = 1.2;
  const D = 1.6;
  g.add(P(roundBoxGeo(W, Hh, D, 0.06, 2), '', { pos: [0, Hh / 2, 0], fin: 'soft', tt: redTT }));
  g.add(P(roundBoxGeo(W + 0.1, 0.16, D + 0.1, 0.05, 2), '#b3aac4', { pos: [0, 0.08, 0], fin: 'soft' }));
  const gp = [[-W / 2, 0], [W / 2, 0], [W * 0.38, 0.48], [0, 0.82], [-W * 0.38, 0.48]];
  g.add(P(extrudeGeo('barngable', gp, D * 0.98), red, { pos: [0, Hh, 0], fin: 'soft' }));
  // 지붕판 4장(두툼하게)
  const over = 0.12;
  const segs = [
    [[W / 2 + over, -0.08], [W * 0.38, 0.48]],
    [[W * 0.38, 0.48], [0, 0.82]],
  ];
  for (const sg of [1, -1]) {
    for (const [[ax, ay], [bx, by]] of segs) {
      const len = Math.hypot(bx - ax, by - ay) + 0.08;
      const ang = Math.atan2(by - ay, bx - ax);
      const cx = (ax + bx) / 2;
      const cy = (ay + by) / 2;
      const nx = -Math.sin(ang) * 0.06;
      const nyy = Math.cos(ang) * 0.06;
      g.add(P(roundBoxGeo(len, 0.13, D + 0.3, 0.05, 2), '', { pos: [sg * (cx - nx), Hh + cy + Math.abs(nyy), 0], rot: [0, 0, sg * ang], fin: 'soft', tt: roofTT }));
    }
  }
  g.add(P(cylGeo(0.08, 0.08, D + 0.34, 10), '#3a4577', { pos: [0, Hh + 0.9, 0], rot: [Math.PI / 2, 0, 0], fin: 'soft' }));
  // 흰 테두리: 모서리 기둥, 처마 띠, 박공 테두리
  const post = roundBoxGeo(0.11, Hh, 0.11, 0.03, 2);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(P(post, white, { pos: [sx * (W / 2 + 0.01), Hh / 2, sz * (D / 2 + 0.01)], fin: 'soft' }));
  g.add(P(roundBoxGeo(W + 0.06, 0.09, 0.08, 0.03, 2), white, { pos: [0, Hh - 0.03, D / 2 + 0.03], fin: 'soft', cast: false }));
  // 큰 문(흰 X)
  const fz = D / 2 + 0.03;
  g.add(P(roundBoxGeo(0.9, 0.9, 0.05, 0.03, 2), '#a8302a', { pos: [0, 0.45, fz], fin: 'soft', cast: false }));
  const bar = roundBoxGeo(0.09, 0.9, 0.06, 0.03, 2);
  g.add(P(bar, white, { pos: [-0.45, 0.45, fz + 0.01], fin: 'soft', cast: false }));
  g.add(P(bar, white, { pos: [0.45, 0.45, fz + 0.01], fin: 'soft', cast: false }));
  g.add(P(roundBoxGeo(0.98, 0.09, 0.06, 0.03, 2), white, { pos: [0, 0.9, fz + 0.01], fin: 'soft', cast: false }));
  const diag = roundBoxGeo(0.08, 1.2, 0.06, 0.03, 2);
  g.add(P(diag, white, { pos: [0, 0.45, fz + 0.02], rot: [0, 0, Math.PI / 4], fin: 'soft', cast: false }));
  g.add(P(diag, white, { pos: [0, 0.45, fz + 0.02], rot: [0, 0, -Math.PI / 4], fin: 'soft', cast: false }));
  // 다락문과 창
  g.add(P(roundBoxGeo(0.44, 0.4, 0.05, 0.03, 2), white, { pos: [0, Hh + 0.33, fz - 0.01], fin: 'soft', cast: false }));
  g.add(P(roundBoxGeo(0.32, 0.29, 0.06, 0.03, 2), '#6a2422', { pos: [0, Hh + 0.33, fz], fin: 'soft', cast: false }));
  for (const sx of [-0.73, 0.73]) {
    g.add(P(roundBoxGeo(0.32, 0.32, 0.05, 0.03, 2), white, { pos: [sx, 0.8, fz - 0.005], fin: 'soft', cast: false }));
    g.add(P(roundBoxGeo(0.23, 0.23, 0.06, 0.03, 2), '#8fd0ff', { pos: [sx, 0.8, fz + 0.005], fin: 'gloss', cast: false }));
  }
  // 옆 헛간(오른쪽 낮은 지붕)
  const sx = W / 2 + 0.44;
  g.add(P(roundBoxGeo(0.86, 0.82, 1.2, 0.05, 2), '', { pos: [sx, 0.41, 0.1], fin: 'soft', tt: redTT }));
  g.add(P(roundBoxGeo(1.06, 0.11, 1.42, 0.04, 2), '', { pos: [sx + 0.02, 0.92, 0.1], rot: [0, 0, -0.32], fin: 'soft', tt: roofTT }));
  g.add(P(roundBoxGeo(0.32, 0.52, 0.05, 0.03, 2), '#6a2422', { pos: [sx, 0.26, 0.72], fin: 'soft', cast: false }));
  // 사일로(두 톤 + 테)
  const sl = G(g, -W / 2 - 0.52, 0, -0.25);
  sl.add(P(cylGeo(0.42, 0.44, 2.0, 20), '', { pos: [0, 1.0, 0], fin: 'soft', tt: ['#b9b2c8', '#fbf6ee'] }));
  for (const yy of [0.7, 1.4]) sl.add(P(torusGeo(0.43, 0.03, 5, 24), '#9a92b0', { pos: [0, yy, 0], rot: [Math.PI / 2, 0, 0], fin: 'soft', cast: false }));
  sl.add(P(sphereGeo(1, 20, 10), '', { pos: [0, 2.0, 0], scale: [0.45, 0.36, 0.45], fin: 'soft', tt: roofTT }));
  inkLine(g, 0.04);
  return g;
}

function lighthouse(parent, x, y, z, s) {
  const g = G(parent, x, y, z, 0, s);
  // 받침 바위 단 + 통통한 탑(아래가 넓은 매끈한 윤곽, 빨강·크림 띠 세 줄)
  g.add(P(cylGeo(0.62, 0.7, 0.3, 24), '', { pos: [0, 0.15, 0], fin: 'soft', tt: ['#9a8fb4', '#efe8f6'] }));
  const H0 = 0.28;
  const tot = 2.1;
  const prof = (k) => 0.5 - 0.15 * k - 0.04 * k * k;
  const bands = 4;
  for (let i = 0; i < bands; i++) {
    const k0 = i / bands;
    const k1 = (i + 1) / bands;
    const geo = latheGeo([[prof(k0), 0], [prof((k0 * 2 + k1) / 3), tot / bands / 3], [prof((k0 + k1 * 2) / 3), (2 * tot) / bands / 3], [prof(k1), tot / bands]], 28, `lh2band${i}`);
    const c = i % 2 ? ['#b8263a', '#ff6a5a'] : ['#c8c0e0', '#fffaf0'];
    g.add(P(geo, '', { pos: [0, H0 + (tot * i) / bands, 0], fin: 'soft', tt: c }));
  }
  const top = H0 + tot;
  // 발코니(두툼한 남색 원반 + 금빛 난간)
  g.add(P(cylGeo(0.5, 0.36, 0.14, 28), '', { pos: [0, top + 0.05, 0], fin: 'soft', tt: ['#1f2a5e', '#4a5aa8'] }));
  g.add(P(torusGeo(0.46, 0.035, 8, 32), '#ffc444', { pos: [0, top + 0.26, 0], rot: [Math.PI / 2, 0, 0], fin: 'gloss' }));
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU;
    g.add(P(cylGeo(0.018, 0.018, 0.2, 6), '#ffc444', { pos: [Math.cos(a) * 0.46, top + 0.17, Math.sin(a) * 0.46], fin: 'gloss', cast: false }));
  }
  // 등실: 빛나는 유리통 + 남색 기둥
  g.add(P(cylGeo(0.25, 0.25, 0.4, 20), '#fff3b8', { pos: [0, top + 0.32, 0], fin: 'glow' }));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    g.add(P(roundBoxGeo(0.05, 0.42, 0.05, 0.02, 1), '#2a3570', { pos: [Math.cos(a) * 0.255, top + 0.32, Math.sin(a) * 0.255], fin: 'soft' }));
  }
  // 빨간 둥근 지붕 + 금빛 꼭지
  const cap = latheGeo([[0.38, 0], [0.37, 0.06], [0.3, 0.2], [0.16, 0.32], [0.0, 0.36]], 24, 'lhcap2');
  g.add(P(cap, '', { pos: [0, top + 0.52, 0], fin: 'soft', tt: ['#a01e34', '#ff6a5a'] }));
  g.add(P(sphereGeo(1, 12, 8), '#ffc444', { pos: [0, top + 0.92, 0], scale: 0.075, fin: 'gloss' }));
  // 등대지기 집(작게)
  house(g, 0.95, 0, 0.2, -0.3, 0.6, { w: 1.1, d: 0.9, h: 0.7, wall: '#fbf6ec', roof: '#e2483c', detail: 1, chimney: true });
  inkLine(g, 0.05);
  return { g, lampY: y + (top + 0.32) * s };
}

function windmill(parent, x, y, z, ry, s) {
  const g = G(parent, x, y, z, ry, s);
  g.add(P(cylGeo(0.76, 0.84, 0.3, 24), '', { pos: [0, 0.15, 0], fin: 'soft', tt: ['#9a8fb4', '#efe8f6'] }));
  const tower = latheGeo([[0.7, 0], [0.68, 0.3], [0.6, 1.2], [0.5, 2.1], [0.48, 2.35], [0, 2.35]], 28, 'milltower2');
  g.add(P(tower, '', { pos: [0, 0.3, 0], fin: 'soft', tt: ['#d4bfa6', '#fff8ea'] }));
  g.add(P(torusGeo(0.56, 0.08, 8, 28), '', { pos: [0, 1.3, 0], rot: [Math.PI / 2, 0, 0], fin: 'soft', tt: ['#6a3a22', '#c07a48'] }));
  // 둥근 빨간 모자
  g.add(P(sphereGeo(1, 24, 14), '', { pos: [0, 2.68, 0], scale: [0.62, 0.5, 0.68], fin: 'soft', tt: ['#a01e34', '#ff6a5a'] }));
  g.add(P(sphereGeo(1, 10, 8), '#ffc444', { pos: [0, 3.2, 0], scale: 0.08, fin: 'gloss' }));
  // 문과 둥근 창
  g.add(P(roundBoxGeo(0.34, 0.5, 0.08, 0.06, 2), '#7a4a2e', { pos: [0, 0.55, 0.66], rot: [-0.05, 0, 0], fin: 'soft' }));
  g.add(P(cylGeo(0.13, 0.13, 0.06, 18), '#fff8ea', { pos: [0, 1.75, 0.555], rot: [Math.PI / 2 - 0.1, 0, 0], fin: 'soft', cast: false }));
  g.add(P(cylGeo(0.09, 0.09, 0.07, 18), '#7fc8f4', { pos: [0, 1.75, 0.565], rot: [Math.PI / 2 - 0.1, 0, 0], fin: 'gloss', cast: false }));
  inkLine(g, 0.05);
  // 날개(돈다): 통통한 크림색 노 네 장에 빨간 끝동 — 살대 격자 대신 굵직한 장난감 날개
  const hub = G(g, 0, 2.66, 0.66);
  hub.userData.dynamic = true;
  const sails = G(hub);
  sails.add(P(cylGeo(0.16, 0.16, 0.22, 16), '', { rot: [Math.PI / 2, 0, 0], fin: 'soft', tt: ['#6a3a22', '#b8743e'] }));
  sails.add(P(sphereGeo(1, 12, 8), '#ffc444', { pos: [0, 0, 0.12], scale: [0.09, 0.09, 0.06], fin: 'gloss' }));
  for (let i = 0; i < 4; i++) {
    const arm = G(sails, 0, 0, 0.06);
    arm.rotation.z = (i / 4) * TAU + 0.3;
    arm.add(P(roundBoxGeo(0.1, 1.75, 0.07, 0.035, 2), '', { pos: [0, 0.9, 0], fin: 'soft', tt: ['#5a321e', '#a8703e'] }));
    arm.add(P(roundBoxGeo(0.46, 1.1, 0.06, 0.06, 3), '', { pos: [0.22, 1.08, -0.01], fin: 'soft', tt: ['#e8d8c0', '#fffaf0'] }));
    arm.add(P(roundBoxGeo(0.46, 0.24, 0.065, 0.06, 3), '', { pos: [0.22, 1.66, -0.008], fin: 'soft', tt: ['#b8263a', '#ff6a5a'] }));
  }
  inkLine(sails, 0.04);
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
  bakeV(g, { ao: 0 });
  g.userData.dynamic = true;
  return g;
}

function pond(parent, r) {
  const { x: cx, z: cz, rx, rz } = POND;
  const g = G(parent);
  // 물: 가장자리 옅은 옥빛 띠 + 가운데 짙은 파랑(그린 듯한 깊이)
  const disc = sharedMat('farm:pondGeo', () => {
    const geo = new THREE.CircleGeometry(1, 48);
    geo.rotateX(-Math.PI / 2);
    geo.userData.shared = true;
    return geo;
  });
  for (const [k, y, col, rough] of [[1, -0.04, '#74d8e6', 0.2], [0.8, -0.034, '#3a8ee6', 0.08], [0.5, -0.03, '#2f74d6', 0.06]]) {
    const water = new THREE.Mesh(disc, waterMat(col, { rough, env: 1.3 }));
    water.scale.set(rx * k, 1, rz * k);
    water.position.set(cx + (1 - k) * 0.15, y, cz - (1 - k) * 0.1);
    water.userData.noCast = true;
    water.receiveShadow = true;
    g.add(water);
  }
  // 물가 돌(굵직하게)
  // 물가: 매끈한 흙 둑 + 큼직한 돌 몇 개(자갈 고리 대신)
  g.add(P(torusGeo(1, 0.09, 8, 40), '', { pos: [cx, -0.05, cz], rot: [Math.PI / 2, 0, 0], scale: [rx * 1.02, rz * 1.02, 1], tt: ['#7a9a4a', '#b8d878'], cast: false }));
  for (const [a, k] of [[2.2, 0.55], [2.75, 0.4], [3.9, 0.5], [4.6, 0.36], [5.6, 0.48]]) {
    rock(g, cx + Math.cos(a) * rx * 1.04, -0.06, cz + Math.sin(a) * rz * 1.04, k, r, '#c9c3d8');
  }
  // 연잎과 연꽃
  for (const [px, pz, k] of [[-0.7, -0.4, 1], [-0.45, -0.7, 0.8], [0.65, -0.5, 0.9], [0.2, -0.9, 0.7], [-0.1, 0.5, 0.8]]) {
    const lx = cx + px * rx * 0.8;
    const lz = cz + pz * rz * 0.8;
    g.add(P(cylGeo(0.17 * k, 0.17 * k, 0.025, 14), '', { pos: [lx, -0.02, lz], tt: ['#3f8f3a', '#8fd456'] }));
    if (k > 0.85) {
      g.add(P(sphereGeo(1, 8, 6), '#ff8fb8', { pos: [lx + 0.04, 0.03, lz], scale: [0.07, 0.06, 0.07], ao: false }));
      g.add(P(sphereGeo(1, 6, 4), '#ffe17a', { pos: [lx + 0.04, 0.07, lz + 0.01], scale: 0.025, ao: false }));
    }
  }
  // 나무 선창
  const dock = G(g, cx + rx * 0.62, 0, cz + rz * 0.55, -0.75);
  for (let i = 0; i < 7; i++) dock.add(P(roundBoxGeo(0.66, 0.07, 0.17, 0.025, 2), '', { pos: [0, 0.08, -i * 0.19], fin: 'soft', tt: i % 2 ? ['#9a6a40', '#e0b07a'] : ['#8a5c38', '#d6a46e'] }));
  for (const [px, pz] of [[-0.3, 0], [0.3, 0], [-0.3, -1.12], [0.3, -1.12]]) dock.add(P(cylGeo(0.06, 0.06, 0.34, 8), '#6b4128', { pos: [px, -0.02, pz] }));
  dock.add(P(cylGeo(0.12, 0.1, 0.2, 12), '#6f9ed0', { pos: [0.15, 0.21, -0.9], fin: 'soft' }));
  dock.add(P(cylGeo(0.014, 0.014, 1.0, 5), '#5a3a22', { pos: [-0.15, 0.42, -1.0], rot: [-0.9, 0, 0.3] }));
  // 오리 두 마리
  for (const [px, pz, ry] of [[-0.35, -0.15, 0.6], [-0.05, 0.25, -0.4]]) {
    const d = G(g, cx + px * rx, -0.03, cz + pz * rz, ry, 1.15);
    d.add(P(sphereGeo(1, 12, 8), '', { pos: [0, 0.07, 0], scale: [0.13, 0.08, 0.09], tt: ['#c8d0ee', '#ffffff'], ao: false }));
    d.add(P(sphereGeo(1, 12, 8), '#ffffff', { pos: [0.09, 0.16, 0], scale: 0.06, ao: false }));
    d.add(P(coneGeo(0.028, 0.07, 6), '#ff9a3c', { pos: [0.16, 0.155, 0], rot: [0, 0, -Math.PI / 2] }));
    d.add(P(sphereGeo(1, 6, 4), '#1f2350', { pos: [0.13, 0.175, 0.035], scale: 0.012 }));
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

  // 지형·바다·곶·잔무늬
  const ground = terrain({ H, C: color, rows: 140, cols: 104, keep: (x, z, y) => y > SEA_Y - 0.9 });
  const sea = terrain({ H: () => SEA_Y, C: seaColor, zNear: -18, zFar: -760, rows: 56, cols: 56, wide: 1.6, rough: 0.24, matKey: 'sea' });
  sea.material.envMapIntensity = 1.25;
  const cape = mesa({ cx: CAPE.cx, cz: CAPE.cz, R: capeR, top: CAPE.top, bottom: SEA_Y - 0.6, rings: 6, seg: 60, dome: 0.5, seed: 3, rock: ['#ffd2a0', '#e09a70', '#a8645c'], grass: ['#7cc045', '#b2dc5a'], lump: 0.06 });
  const decal = groundDecal({ key: 'farm', draw: drawDecal, H: (x, z) => (z < -5.4 ? Math.max(0, H(x, z)) : 0) });

  const sets = [LEAF.meadow, LEAF.fresh, LEAF.deep];
  const tree = (x, z, s, k = (r() * 3) | 0, seg = 12, yy = null) => {
    const y = yy ?? H(x, z);
    roundTree(props, x, y, z, s, r, { leaf: sets[k], seg });
    if (z < -9) groundBlob(props, x + 0.15 * s, y, z + 0.1 * s, 0.75 * s, 0.6 * s, 0.3);
  };

  // 등대 곶 위: 등대, 등대지기 집, 나무
  const lhX = CAPE.cx + 4.4;
  const lhZ = CAPE.cz + 1.2;
  const lh = lighthouse(props, lhX, cape.topY(lhX, lhZ) - 0.05, lhZ, 1.4);
  for (const [dx, dz, s] of [[-3.5, 2.4, 1.1], [-1.6, 4.1, 0.85], [-5.2, -0.5, 1.2], [-2.6, -2.8, 1.0], [0.6, 3.6, 0.7], [-4.8, 3.4, 0.9]]) {
    const x = CAPE.cx + dx;
    const z = CAPE.cz + dz;
    tree(x, z, s, (r() * 3) | 0, 8, cape.topY(x, z) - 0.05);
  }
  for (const [dx, dz] of [[1.8, 3.8], [-0.4, 5.0], [2.9, 3.0]]) bush(props, CAPE.cx + dx, cape.topY(CAPE.cx + dx, CAPE.cz + dz), CAPE.cz + dz, 1.0, r, { seg: 8, flowers: 3 });
  for (let i = 0; i < 4; i++) {
    const t = 4.6 + r() * 2.2;
    const rr = capeR(t) * (1.02 + r() * 0.05);
    rock(props, CAPE.cx + Math.cos(t) * rr, SEA_Y - 0.1, CAPE.cz - Math.sin(t) * rr, 1.4 + r() * 1.4, r, '#b0a6c2');
  }

  // 오른쪽 언덕 마을과 풍차
  const walls = ['#fbeed2', '#ffe2c8', '#fff7ea', '#f4dcc0', '#e9e4f2'];
  const roofs = ['#e0773b', '#d0543a', '#4f6fc2', '#8f4a34', '#e8613c'];
  const mX = 6.6;
  const mZ = -33;
  const mill = windmill(props, mX, H(mX, mZ) - 0.05, mZ, -0.32, 1.3);
  const spots = [];
  for (let i = 0; i < 26; i++) {
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
      tree(x, z, 0.9 + r() * 0.4, (r() * 3) | 0, 7);
      continue;
    }
    house(props, x, y - 0.05, z, 0.25 - r() * 0.6, 0.95 + r() * 0.35, { w: 1.0 + r() * 0.5, d: 0.9, h: 0.65 + r() * 0.5, wall: walls[(r() * 5) | 0], roof: roofs[(r() * 5) | 0], detail: z > -32 ? 1 : 0, chimney: r() < 0.5 });
  }
  // 교회 탑
  {
    const x = 11.5;
    const z = -46;
    const ch = G(props, x, H(x, z), z, -0.3, 1.3);
    ch.add(P(roundBoxGeo(0.8, 2.4, 0.8, 0.05, 1), '', { pos: [0, 1.2, 0], fin: 'soft', tt: ['#c8b8c8', '#fff4e4'] }));
    ch.add(P(coneGeo(0.62, 1.1, 4), '', { pos: [0, 2.95, 0], rot: [0, Math.PI / 4, 0], fin: 'soft', tt: ['#34509a', '#6f90e0'] }));
    ch.add(P(cylGeo(0.16, 0.16, 0.04, 14), '#ffffff', { pos: [0, 1.95, 0.41], rot: [Math.PI / 2, 0, 0] }));
    ch.add(P(roundBoxGeo(0.26, 0.4, 0.05, 0.02, 1), '#7fa6d8', { pos: [0, 1.35, 0.41], fin: 'gloss' }));
  }
  for (const [x, z, s] of [[5.6, -19, 0.9], [7.4, -21.5, 1.0], [9.4, -25, 1.1]]) tree(x, z, s);

  // 바닷가 덤불·나무(가운데는 낮게 두어 바다가 보이게)
  for (let i = 0; i < 12; i++) {
    const x = -6 + i * 0.85 + r() * 0.4;
    const z = coastZ(x) + 1.8 + r() * 1.2;
    if (H(x, z) < SEA_Y + 0.3) continue;
    if (x < -3.5 || x > 2.5) tree(x, z, 0.6 + r() * 0.3, (r() * 3) | 0, 8);
    else bush(props, x, H(x, z), z, 1.2 + r() * 0.5, r, { seg: 8 });
  }

  // 가운데 헛간(주인공 건물)
  const bX = 2.5;
  const bZ = -12.8;
  barn(props, bX, H(bX, bZ) - 0.04, bZ, -0.22, 1.0);
  for (const [x, z, s] of [[5.2, -11.6, 1.0], [-4.3, -11.5, 1.15], [-6.0, -15.5, 1.3], [-5.0, -19.5, 1.0], [-7.4, -20.5, 1.1]]) tree(x, z, s);
  hayBale(props, bX - 1.35, H(bX - 1.35, bZ + 1.4), bZ + 1.4, 0.85, 0.4);
  hayBale(props, bX - 0.75, H(bX - 0.75, bZ + 1.75), bZ + 1.75, 0.85, -0.3);
  fence(props, [[bX - 2.8, bZ + 2.7], [bX + 1.6, bZ + 2.8], [bX + 3.4, bZ + 1.6]], { y: H });
  // 채소밭(이랑 + 둥근 양배추)
  {
    const fx = -1.6;
    const fz = -15.5;
    for (let row = 0; row < 5; row++) {
      const z = fz + row * 0.55;
      props.add(P(roundBoxGeo(3.8, 0.1, 0.36, 0.05, 2), '#a8774c', { pos: [fx + 0.1, H(fx, z) + 0.02, z], fin: 'matte' }));
      for (let k = 0; k < 9; k++) {
        const x = fx - 1.6 + k * 0.4 + row * 0.08;
        const y = H(x, z);
        props.add(P(sphereGeo(1, 8, 6), '', { pos: [x, y + 0.13, z], scale: [0.18, 0.14, 0.18], tt: row % 2 ? ['#3f9a3e', '#9ad85a'] : ['#4fa24a', '#c4e86a'] }));
      }
    }
  }

  // 가까운 들판: 연못, 울타리, 건초, 버섯
  pond(props, r);
  fence(props, [[0.9, -2.7], [2.6, -2.75], [4.4, -2.6], [hw0 * 2.2, -2.8]], { y: H });
  hayBale(props, 2.0, 0, -3.8, 1.0, 0.5);
  hayBale(props, 3.6, 0, -4.6, 1.1, -0.2);
  for (const [x, z, s] of [[-3.3, -2.3, 1.25], [3.2, -1.7, 1.0]]) mushroom(props, x, H(x, z), z, s, r);

  // 화면 양옆 큰 나무(액자, 짙은 잎)
  const edgeL = -halfW(w, -3.2) - 0.1;
  const edgeR = halfW(w, -4.2) + 0.1;
  roundTree(props, edgeL, 0, -3.2, 1.6, r, { leaf: LEAF.deep, seg: 16, ink: 0.03 });
  roundTree(props, edgeR + 0.3, 0, -4.2, 1.65, r, { leaf: LEAF.deep, seg: 16, ink: 0.03 });
  roundTree(props, edgeL + 1.3, 0, -7.2, 1.2, r, { leaf: LEAF.meadow, seg: 14, ink: 0.03 });
  roundTree(props, edgeR - 0.6, 0, -8.5, 1.3, r, { leaf: LEAF.fresh, seg: 14, ink: 0.03 });
  for (const [x, z, s] of [[edgeL + 0.9, -2.1, 1.3], [edgeR - 0.7, -2.2, 1.35], [edgeR - 1.7, -5.8, 1.0], [-4.4, -8.6, 1.1], [0.2, -11, 0.9]]) {
    bush(props, x, H(x, z), z, s, r, { flowers: r() < 0.6 ? 5 : 0, flowerColor: ['#ffffff', '#ff8fb0', '#ffd23f'][(r() * 3) | 0], leaf: z > -5 ? LEAF.deep : LEAF.fresh });
  }
  for (const [x, z, s] of [[-2.7, -2.6, 1.0], [-0.6, -9.5, 0.9]]) rock(props, x, H(x, z), z, s, r);

  // 통로 둘레 풀·꽃·조약돌(인스턴스)
  const avoidPath = (x, z) => inPond(x, z, 1.2) || (z < -0.2 && Math.abs(x - branchX(z)) < 0.45) || (Math.abs(z - pathZ(x)) < PATH_W - 0.05 && Math.abs(z) < 0.95) || (x > 1.4 && x < 4.4 && z < -3.2 && z > -5.2);
  lanePlants(props, {
    w,
    seed: 12,
    H: (x, z) => Math.max(0, H(x, z)),
    avoid: avoidPath,
    back: [-6.5, -0.95],
    grass: ['#4f9e3a', '#62b443', '#3f8a3a', '#79c24a'],
    flowers: [
      [flowerGeo('#ffffff', '#ffc83a'), ['#ffffff', '#fff6ea']],
      [flowerGeo('#ff8fbf', '#ffe066'), ['#ffffff', '#ffe6f0']],
      [tulipGeo('#ff5a5a'), ['#ffffff', '#ffd060', '#ff9ad0']],
    ],
    pebble: ['#d4cce2', '#b9b0cc'],
    clover: ['#3f8a3e', '#4c9a44'],
  });

  // 갈매기 몇 마리(한 덩이로 합쳐 천천히 맴돈다)
  const gulls = birdFlock(root);

  // 움직이는 것: 풍차 날개, 배
  const sails = mill.sails;
  const boatG = boat(root, 0.5, SEA_Y, -64, 1.7);
  bake(props, { H });
  bakeV(sails, { ao: 0 });
  root.add(ground, sea, cape.mesh, decal);

  // 등대 불빛(블룸)
  const beacon = glowS('farm:beacon', '#fff2b0', 2.4, 0.6, 2.2);
  beacon.position.set(lhX, lh.lampY, lhZ + 0.4);
  root.add(beacon);

  // 구름: 양옆 큰 뭉게구름 + 수평선 구름 띠
  const cm = cloudMat('#ffffff', '#8c98e4', { mid: '#dde2fb' });
  const cmFar = cloudMat('#f8fbff', '#c2cdf0', { fog: true });
  const sky = G(root);
  const drift = cloudLayer(sky, 5, [
    { x: -27, y: 15, z: -112, w: 28, h: 14, n: 22, seg: 12, speed: 0.16, span: 75 },
    { x: 25, y: 22, z: -122, w: 24, h: 11, n: 20, seg: 12, speed: 0.14, span: 75 },
    { x: -12, y: 47, z: -150, w: 24, h: 8, n: 16, speed: 0.12, span: 85, seg: 12 },
    { x: 58, y: 40, z: -170, w: 30, h: 10, n: 16, speed: 0.1, span: 95, seg: 12 },
  ], cm);
  const bank = cloudLayer(sky, 9, [
    { x: -40, y: 1, z: -250, w: 60, h: 14, n: 16, seg: 12, speed: 0.04, span: 120 },
    { x: 28, y: 0, z: -260, w: 56, h: 11, n: 14, seg: 12, speed: 0.04, span: 120 },
    { x: 92, y: 1, z: -270, w: 50, h: 13, n: 14, seg: 12, speed: 0.04, span: 120 },
  ], cmFar);

  const env = {
    sky: { top: '#1d58dc', mid: '#4d97f4', horizon: '#c4e8ff', sunDir: [-0.55, 0.6, -1], sunColor: '#fff4d6', sunStrength: 0.55 },
    fog: { color: '#bfe0ff', near: 28, far: 260 },
    sun: { color: '#fff0d0', intensity: 2.45, dir: [-0.6, 1, 0.7] },
    hemi: { sky: '#b4d6ff', ground: '#86b860', intensity: 0.82 },
    exposure: 1.0,
    grade: { saturation: 1.14, contrast: 1.08, vignette: 0.2, bloom: 0.55 },
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
      beacon.material.opacity = 0.5 + 0.15 * Math.sin(t * 2.2);
      gulls.position.set(-4.5 + Math.sin(t * 0.12) * 3, 7.8 + Math.sin(t * 0.7) * 0.25, -38 + Math.cos(t * 0.12) * 2);
      gulls.rotation.y = Math.cos(t * 0.12) * 0.5;
    },
  };
}
