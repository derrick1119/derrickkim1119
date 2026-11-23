// 2. 마을(따뜻한 오후): 컨셉의 마을 — 크림·파스텔 벽에 주황·갈색·파란 지붕, 굴뚝, 창, 두 톤 둥근 나무, 산울타리,
//    말뚝 울타리, 가로등, 찻길. 언덕을 따라 지붕이 층층이 올라가고, 언덕 위 시계탑 교회와 하늘색 물탱크가 마을의 얼굴이다.
//    값 구조: 앞 잔디는 짙게, 보도와 앞줄 집은 볕을 받아 밝게, 언덕 위 집과 먼 산은 따뜻한 안개 속으로.
import {
  THREE, P, G, bake, terrain, cloudLayer, cloudMat, roundTree, bush, house, picketFence, streetLamp,
  hedge, car, stripGround, speckle, grassStrokes, halfW, smooth, fbm, noise2, rgb, mixv, rng, TAU, roundBoxGeo, cylGeo,
  coneGeo, boxGeo, sphereGeo, torusGeo, latheGeo, LEAF, lanePlants, flowerGeo, tulipGeo,
} from './common.js';

const hill = (z) => (z > -8.5 ? 0 : 3.4 * (1 - Math.exp(-(-8.5 - z) / 11)));

function H(x, z) {
  if (z > -5.6) return 0;
  let h = hill(z) * (1 + 0.12 * Math.sin(x * 0.18 + 0.6));
  h += smooth(-8.5, -20, z) * (0.25 * Math.sin(x * 0.4 + z * 0.2) + 0.2 * (fbm(x * 0.15, z * 0.15) - 0.5));
  // 먼 산줄기
  h += smooth(-55, -95, z) * (5 + 3.5 * Math.sin(x * 0.045 + 1.2) + 2.2 * Math.sin(x * 0.11 - 0.4)) * (0.8 + 0.4 * fbm(x * 0.03, z * 0.03));
  return h;
}

const C_G1 = rgb('#6fb444');
const C_G2 = rgb('#9fd055');
const C_G3 = rgb('#cfe36a');
const C_PATH = rgb('#efd6a2');
const C_FAR = rgb('#86a8a0');

const pathX = (z) => 1.4 * Math.sin(z * 0.32) + 0.4;

function color(x, y, z, ny) {
  const n = fbm(x * 0.3, z * 0.3);
  let c = mixv(C_G1, C_G2, smooth(0.3, 0.7, n));
  c = mixv(c, C_G3, smooth(0.55, 0.9, noise2(x * 1.3, z * 1.3)) * 0.4);
  // 언덕길(지그재그)
  if (z < -8 && z > -40) c = mixv(c, C_PATH, smooth(0.5, 0.3, Math.abs(x - pathX(z))) * 0.9);
  // 먼 산은 푸르게
  c = mixv(c, C_FAR, smooth(-50, -100, z) * 0.65);
  if (ny < 0.8) c = mixv(c, rgb('#5f9e48'), 0.3);
  return c;
}

// 앞 잔디·보도·찻길 띠
function drawStreet(ctx, W, Hh, row) {
  const r = rng(5);
  const px = W / 8;
  const fill = (z0, z1, col) => {
    ctx.fillStyle = col;
    ctx.fillRect(0, row(z0), W, row(z1) - row(z0) + 1);
  };
  // 앞 잔디: 멀리서 가까이 갈수록 짙어진다 + 칠한 풀 결
  const gg = ctx.createLinearGradient(0, row(0.8), 0, row(9));
  gg.addColorStop(0, '#86c64c');
  gg.addColorStop(0.35, '#6aac42');
  gg.addColorStop(1, '#3f8a3c');
  ctx.fillStyle = gg;
  ctx.fillRect(0, 0, W, row(0.8));
  speckle(ctx, 0, 0, W, row(0.8), 700, ['#5f9e3c', '#9bd35a', '#4f8f3a', '#a7d862'], r, [1.5, 4]);
  grassStrokes(ctx, 0, 0, W, row(0.85), 1500, ['rgba(30,90,40,0.25)', 'rgba(210,250,140,0.22)', 'rgba(40,110,50,0.2)'], r, [4, 9]);
  // 잔디와 보도 사이 그늘 띠
  fill(0.86, 0.78, 'rgba(40,80,40,0.35)');
  // 보도(따뜻한 보도블록, 블록마다 밝기 조금씩)
  fill(0.8, -0.85, '#f3e2c4');
  const bw = px * 0.55;
  for (let x = 0, i = 0; x < W; x += bw, i++) {
    for (const [z0, z1] of [[0.8, -0.02], [-0.02, -0.85]]) {
      ctx.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '170,140,110'},${0.06 + r() * 0.1})`;
      ctx.fillRect(x + ((i + (z0 > 0 ? 0 : 1)) % 2) * bw * 0.5, row(z0), bw, row(z1) - row(z0));
    }
  }
  ctx.strokeStyle = 'rgba(150,120,95,0.45)';
  ctx.lineWidth = 2.5;
  for (let x = 0; x <= W; x += bw) {
    ctx.beginPath();
    ctx.moveTo(x, row(0.8));
    ctx.lineTo(x, row(-0.02));
    ctx.moveTo(x + bw * 0.5, row(-0.02));
    ctx.lineTo(x + bw * 0.5, row(-0.85));
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(0, row(-0.02));
  ctx.lineTo(W, row(-0.02));
  ctx.stroke();
  speckle(ctx, 0, row(0.8), W, row(-0.85) - row(0.8), 300, ['rgba(120,100,80,0.14)', 'rgba(255,255,255,0.45)'], r, [1, 3]);
  // 떨어진 잎 몇 장
  for (let i = 0; i < 26; i++) {
    ctx.fillStyle = ['#e8a23a', '#d9773a', '#9bc84a'][(r() * 3) | 0];
    ctx.beginPath();
    ctx.ellipse(r() * W, row(0.75) + r() * (row(-0.8) - row(0.75)), 4 + r() * 3, 2 + r() * 1.5, r() * TAU, 0, TAU);
    ctx.fill();
  }
  // 연석(윗면 밝게, 옆면 그늘)
  fill(-0.85, -1.0, '#fbf7f0');
  fill(-0.98, -1.1, '#a99fb4');
  // 찻길(남보라빛 아스팔트)
  const rg = ctx.createLinearGradient(0, row(-1.1), 0, row(-4.05));
  rg.addColorStop(0, '#5d6380');
  rg.addColorStop(1, '#666c8a');
  ctx.fillStyle = rg;
  ctx.fillRect(0, row(-1.1), W, row(-4.05) - row(-1.1));
  speckle(ctx, 0, row(-1.1), W, row(-4.05) - row(-1.1), 700, ['rgba(255,255,255,0.08)', 'rgba(20,20,40,0.14)'], r, [1, 3]);
  // 연석 그림자
  const sh = ctx.createLinearGradient(0, row(-1.1), 0, row(-1.45));
  sh.addColorStop(0, 'rgba(20,20,50,0.35)');
  sh.addColorStop(1, 'rgba(20,20,50,0)');
  ctx.fillStyle = sh;
  ctx.fillRect(0, row(-1.1), W, row(-1.45) - row(-1.1));
  ctx.fillStyle = '#f7f1e2';
  for (let x = 0; x < W; x += px * 2) ctx.fillRect(x + px * 0.3, row(-2.5), px * 1.1, row(-2.64) - row(-2.5));
  ctx.fillStyle = 'rgba(247,241,226,0.85)';
  ctx.fillRect(0, row(-1.24), W, 3);
  ctx.fillRect(0, row(-3.88), W, 3);
  // 건너편 연석·보도
  fill(-4.05, -4.22, '#fbf7f0');
  fill(-4.22, -5.7, '#ecdcc4');
  ctx.strokeStyle = 'rgba(150,120,95,0.35)';
  for (let x = 0; x <= W; x += bw) {
    ctx.beginPath();
    ctx.moveTo(x, row(-4.22));
    ctx.lineTo(x, row(-5.7));
    ctx.stroke();
  }
}

/** 언덕 위 물탱크(마을 표지): 하늘색 둥근 통, 빨간 하트, 다리 네 개. */
function waterTower(parent, x, y, z, s) {
  const g = G(parent, x, y, z, 0.25, s);
  const legTT = ['#5a4a7a', '#a8a0d0'];
  for (const [lx, lz] of [[-0.55, -0.55], [0.55, -0.55], [-0.55, 0.55], [0.55, 0.55]]) {
    g.add(P(cylGeo(0.06, 0.08, 2.4, 8), '', { pos: [lx * 0.85, 1.2, lz * 0.85], rot: [lz * 0.08, 0, -lx * 0.08], tt: legTT }));
  }
  for (const yy of [0.7, 1.5]) g.add(P(torusGeo(0.56, 0.035, 5, 20), '#7a6aa8', { pos: [0, yy, 0], rot: [Math.PI / 2, 0, 0] }));
  const tank = latheGeo([[0, 0], [0.55, 0.02], [0.82, 0.18], [0.9, 0.45], [0.9, 1.0], [0.84, 1.12], [0, 1.14]], 24, 'wtank');
  g.add(P(tank, '', { pos: [0, 2.35, 0], fin: 'soft', tt: ['#5f8fd0', '#bfe4ff'] }));
  g.add(P(torusGeo(0.91, 0.045, 6, 28), '#ffffff', { pos: [0, 2.8, 0], rot: [Math.PI / 2, 0, 0], fin: 'soft' }));
  const cap = latheGeo([[0, 0.5], [0.3, 0.42], [0.78, 0.12], [0.95, 0], [0, 0]], 24, 'wtcap');
  g.add(P(cap, '', { pos: [0, 3.45, 0], fin: 'soft', tt: ['#b8302a', '#f2584a'] }));
  g.add(P(sphereGeo(1, 10, 8), '#f2584a', { pos: [0, 4.0, 0], scale: 0.09, fin: 'soft' }));
  // 하트 무늬(정면)
  const heart = G(g, 0, 2.95, 0.88);
  heart.add(P(sphereGeo(1, 10, 8), '#ff5a7a', { pos: [-0.1, 0.06, 0], scale: [0.13, 0.13, 0.04], fin: 'soft', ao: false }));
  heart.add(P(sphereGeo(1, 10, 8), '#ff5a7a', { pos: [0.1, 0.06, 0], scale: [0.13, 0.13, 0.04], fin: 'soft', ao: false }));
  heart.add(P(coneGeo(0.2, 0.26, 12), '#ff5a7a', { pos: [0, -0.12, 0], rot: [Math.PI, 0, 0], scale: [1, 1, 0.2], fin: 'soft', ao: false }));
  // 사다리
  g.add(P(roundBoxGeo(0.04, 2.6, 0.04, 0.015, 1), '#7a6aa8', { pos: [0.2, 1.3, 0.62] }));
  g.add(P(roundBoxGeo(0.04, 2.6, 0.04, 0.015, 1), '#7a6aa8', { pos: [0.4, 1.3, 0.6] }));
  return g;
}

/** 시계탑 교회 */
function church(parent, x, y, z) {
  const ch = G(parent, x, y, z, -0.2, 1.3);
  const wallTT = ['#d6c4b8', '#fff6e8'];
  const roofTT = ['#6a3024', '#c0603e'];
  ch.add(P(roundBoxGeo(1.6, 1.3, 2.2, 0.05, 1), '', { pos: [0, 0.65, -0.4], fin: 'soft', tt: wallTT }));
  ch.add(P(roundBoxGeo(1.85, 0.12, 2.4, 0.04, 1), '', { pos: [-0.45, 1.55, -0.4], rot: [0, 0, 0.75], fin: 'soft', tt: roofTT }));
  ch.add(P(roundBoxGeo(1.85, 0.12, 2.4, 0.04, 1), '', { pos: [0.45, 1.55, -0.4], rot: [0, 0, -0.75], fin: 'soft', tt: roofTT }));
  ch.add(P(roundBoxGeo(0.95, 3.0, 0.95, 0.05, 1), '', { pos: [0, 1.5, 0.75], fin: 'soft', tt: wallTT }));
  ch.add(P(roundBoxGeo(1.08, 0.12, 1.08, 0.04, 1), '#c9b8a8', { pos: [0, 3.0, 0.75], fin: 'soft' }));
  ch.add(P(coneGeo(0.76, 1.5, 4), '', { pos: [0, 3.8, 0.75], rot: [0, Math.PI / 4, 0], fin: 'soft', tt: ['#2f4a98', '#6f94e4'] }));
  ch.add(P(sphereGeo(1, 8, 6), '#ffd23f', { pos: [0, 4.6, 0.75], scale: 0.08, fin: 'soft' }));
  // 시계(흰 판 + 금테 + 바늘)
  ch.add(P(cylGeo(0.3, 0.3, 0.06, 24), '#ffffff', { pos: [0, 2.45, 1.24], rot: [Math.PI / 2, 0, 0], fin: 'soft' }));
  ch.add(P(torusGeo(0.3, 0.04, 6, 24), '#e8b43a', { pos: [0, 2.45, 1.27], fin: 'soft' }));
  ch.add(P(boxGeo(0.035, 0.2, 0.02), '#2b3a78', { pos: [0, 2.53, 1.285] }));
  ch.add(P(boxGeo(0.16, 0.035, 0.02), '#2b3a78', { pos: [0.06, 2.45, 1.285] }));
  ch.add(P(roundBoxGeo(0.34, 0.6, 0.06, 0.06, 2), '#7fa6d8', { pos: [0, 1.65, 1.24], fin: 'gloss' }));
  ch.add(P(roundBoxGeo(0.44, 0.64, 0.06, 0.06, 2), '#8f5a3a', { pos: [0, 0.32, 1.24], fin: 'soft' }));
}

/** @param {{w:number,h:number}} size */
export function buildSuburb({ w }) {
  const r = rng(23);
  const root = new THREE.Group();
  const props = G(root);
  const hw0 = halfW(w, 0);

  const ground = terrain({ H, C: color, rows: 130, cols: 100, keep: (x, z) => z < -5.4 });
  const street = stripGround({ key: 'suburb2', zNear: 9, zFar: -5.7, period: 8, draw: drawStreet });

  const walls = ['#fbe6c4', '#ffd9b8', '#fff1dc', '#f6d3b4', '#e6dcf2', '#fcdcd0', '#e2ecd2'];
  const roofs = ['#e0773b', '#d0563a', '#4f6fc2', '#8f4a34', '#e8613c', '#5d6a96'];
  const sets = [LEAF.meadow, LEAF.fresh, LEAF.olive];

  // 앞줄 집들(크고 자세히)
  const hwF = halfW(w, -7.6) + 1.2;
  const front = [];
  for (let x = -hwF + r() * 0.4; x < hwF; x += 2.35 + r() * 0.5) front.push(x);
  front.forEach((x, i) => {
    const z = -7.4 - r() * 0.8;
    const two = r() < 0.65;
    const side = i % 2 === 1;
    house(props, x, 0, z, (r() - 0.5) * 0.25, 1, {
      side,
      w: side ? 1.25 : 1.5 + r() * 0.3,
      d: side ? 1.9 : 1.25,
      shutters: r() < 0.6 ? ['#5d8fd0', '#5aa36a', '#d0563a'][(r() * 3) | 0] : null,
      h: two ? 1.45 : 0.95,
      floors: two ? 2 : 1,
      wall: walls[(i * 3 + 1) % walls.length],
      roof: roofs[(i * 2 + (r() < 0.5 ? 1 : 0)) % roofs.length],
      detail: 2,
      pitch: 0.7 + r() * 0.2,
      chimneyX: r() < 0.5 ? -0.25 : 0.25,
      door: ['#8f5a3a', '#4f6fc2', '#d0563a', '#5aa36a'][i % 4],
    });
    // 앞마당: 울타리, 산울타리, 꽃밭, 우체통
    picketFence(props, x - 0.95, x + 0.95, -5.45, { h: 0.36 });
    if (r() < 0.6) hedge(props, x + 0.55, 0, -6.1, 0.6, 1, '#4f9e3e');
    bush(props, x - 0.5, 0, -6.05, 0.55, r, { flowers: 4, flowerColor: ['#ff8fb0', '#ffffff', '#ffd23f'][i % 3], leaf: LEAF.fresh, seg: 8 });
    const mb = G(props, x + 0.75, 0, -5.2, 0, 1);
    mb.add(P(cylGeo(0.035, 0.04, 0.44, 6), '#7a4b2a', { pos: [0, 0.22, 0] }));
    mb.add(P(roundBoxGeo(0.18, 0.15, 0.26, 0.06, 2), ['#4f6fc2', '#e2483c', '#5aa36a'][i % 3], { pos: [0, 0.5, 0], fin: 'soft' }));
    mb.add(P(roundBoxGeo(0.02, 0.1, 0.05, 0.01, 1), '#ffd23f', { pos: [0.1, 0.57, 0.06] }));
  });
  // 앞줄 사이 나무
  for (let i = 0; i < front.length - 1; i++) {
    const x = (front[i] + front[i + 1]) / 2;
    roundTree(props, x, 0, -8.6 - r(), 1.05 + r() * 0.3, r, { leaf: sets[i % 3], seg: 12 });
  }

  // 언덕 위 집들(층층이)
  const rows = [
    { z: -12.5, n: 6, s: 0.95, detail: 1 },
    { z: -17, n: 7, s: 0.95, detail: 1 },
    { z: -22.5, n: 8, s: 1.0, detail: 0 },
    { z: -29, n: 9, s: 1.05, detail: 0 },
    { z: -36, n: 10, s: 1.1, detail: 0 },
  ];
  const WT = { x: -halfW(w, -24) * 0.62, z: -24 };
  for (const row of rows) {
    const span = halfW(w, row.z) + 1.5;
    for (let i = 0; i < row.n; i++) {
      const x = -span + ((i + 0.3 + r() * 0.4) / row.n) * 2 * span;
      const z = row.z + (r() - 0.5) * 1.6;
      if (Math.abs(x - pathX(z)) < 0.9) continue; // 길
      if (Math.hypot(x - WT.x, z - WT.z) < 2.0) continue; // 물탱크
      const y = H(x, z);
      if (r() < 0.22) {
        roundTree(props, x, y, z, 0.9 + r() * 0.4, r, { leaf: sets[(r() * 3) | 0], seg: 8 });
        continue;
      }
      const side = r() < 0.5;
      house(props, x, y - 0.04, z, (r() - 0.5) * 0.5, row.s, {
        side,
        w: side ? 1.0 : 1.2 + r() * 0.5,
        d: side ? 1.5 + r() * 0.4 : 1.0,
        h: 0.8 + r() * 0.6,
        floors: r() < 0.5 ? 2 : 1,
        wall: walls[(r() * walls.length) | 0],
        roof: roofs[(r() * roofs.length) | 0],
        detail: row.detail,
        pitch: 0.65 + r() * 0.3,
        chimney: r() < 0.6,
      });
      if (r() < 0.6) roundTree(props, x + 0.9 + r() * 0.4, y, z - 0.7, 0.75 + r() * 0.3, r, { leaf: sets[(r() * 3) | 0], seg: 7 });
    }
  }
  // 마을의 얼굴: 시계탑 교회(오른쪽 언덕), 물탱크(왼쪽 언덕)
  church(props, 3.6, H(3.6, -31) - 0.05, -31);
  waterTower(props, WT.x, H(WT.x, WT.z) - 0.05, WT.z, 1.15);
  // 먼 언덕 숲
  for (let i = 0; i < 40; i++) {
    const z = -45 - r() * 40;
    const x = (r() * 2 - 1) * halfW(w, z) * 1.1;
    roundTree(props, x, H(x, z) - 0.1, z, 1.6 + r() * 1.2, r, { leaf: sets[(r() * 3) | 0], seg: 6, trunkH: 0.5 });
  }

  // 길 건너 가로등, 주차된 차
  for (let x = -hw0 * 1.7; x <= hw0 * 1.7; x += 3.2) streetLamp(props, x + 0.6, 0, -4.75, 1.0, { lit: false });
  car(props, -1.6, 0, -3.35, Math.PI, 1, '#ff8f6b');
  car(props, hw0 + 0.6, 0, -3.35, Math.PI, 1, '#7fb6e6');

  // 화면 양옆 큰 나무(액자)
  const edgeL = -halfW(w, -5.9) + 0.1;
  const edgeR = halfW(w, -6.2) - 0.1;
  roundTree(props, edgeL, 0, -5.9, 1.6, r, { leaf: LEAF.deep, seg: 16 });
  roundTree(props, edgeR, 0, -6.2, 1.7, r, { leaf: LEAF.deep, seg: 16 });
  bush(props, edgeL + 0.8, 0, -5.4, 1.0, r, { flowers: 5, flowerColor: '#ff8fb0' });
  bush(props, edgeR - 0.9, 0, -5.5, 1.1, r, { flowers: 5, flowerColor: '#ffffff' });

  // 앞 잔디 꽃·풀(인스턴스, 보도는 비운다)
  lanePlants(props, {
    w,
    seed: 24,
    avoid: (x, z) => z < 0.95,
    grass: ['#4f9e3a', '#62b443', '#3f8a3a'],
    flowers: [
      [flowerGeo('#ffffff', '#ffc83a'), ['#ffffff']],
      [tulipGeo('#ff6a8a'), ['#ffffff', '#ffd060', '#ff8060']],
      [flowerGeo('#b8a0ff', '#fff2a0'), ['#ffffff', '#d8e4ff']],
    ],
    clover: ['#4f9a40', '#5aa846'],
  });

  bake(props, { H });
  root.add(ground, street);

  // 구름(따뜻한 오후빛)
  const cm = cloudMat('#fffaf0', '#a9a2e0', { light: [-0.8, 0.6, 0.3], mid: '#f3e4e8' });
  const cmFar = cloudMat('#fff6ea', '#d9cde6', { fog: true, light: [-0.8, 0.6, 0.3] });
  const sky = G(root);
  const drift = cloudLayer(sky, 23, [
    { x: 26, y: 19, z: -115, w: 28, h: 13, n: 22, seg: 12, speed: 0.12, span: 75 },
    { x: -30, y: 30, z: -130, w: 20, h: 8, n: 18, seg: 12, speed: 0.1, span: 75 },
    { x: 8, y: 52, z: -160, w: 22, h: 7, n: 14, seg: 12, speed: 0.08, span: 85 },
  ], cm);
  const bank = cloudLayer(sky, 29, [
    { x: -50, y: 6, z: -250, w: 60, h: 13, n: 16, seg: 12, speed: 0.03, span: 120 },
    { x: 20, y: 5, z: -265, w: 60, h: 11, n: 16, seg: 12, speed: 0.03, span: 120 },
    { x: 90, y: 6, z: -270, w: 50, h: 12, n: 14, seg: 12, speed: 0.03, span: 120 },
  ], cmFar);

  const env = {
    sky: { top: '#3468d8', mid: '#74aaf0', horizon: '#ffe0bc', sunDir: [-0.85, 0.32, -1], sunColor: '#ffe0a8', sunStrength: 0.75 },
    fog: { color: '#f6e0c8', near: 28, far: 250 },
    sun: { color: '#ffe2b4', intensity: 2.4, dir: [-0.85, 0.85, 0.55] },
    hemi: { sky: '#bcd4ff', ground: '#a8b46a', intensity: 0.8 },
    exposure: 1.0,
    grade: { saturation: 1.13, contrast: 1.08, vignette: 0.2, bloom: 0.5 },
  };

  return {
    group: root,
    env,
    update(t) {
      drift(t);
      bank(t);
    },
  };
}
