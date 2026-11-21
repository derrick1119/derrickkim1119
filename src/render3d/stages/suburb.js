// 2. 마을(따뜻한 오후): 컨셉의 마을 — 크림·파스텔 벽에 주황·갈색·파란 지붕, 굴뚝, 창, 둥근 나무, 산울타리,
//    말뚝 울타리, 가로등, 찻길. 언덕을 따라 지붕이 층층이 올라가고 뒤로 먼 산이 안개에 잠긴다.
import {
  THREE, P, G, bake, terrain, cloudLayer, cloudMat, roundTree, bush, flowers, tuft, house, picketFence, streetLamp,
  hedge, car, stripGround, speckle, halfW, smooth, fbm, noise2, rgb, mixv, rng, roundBoxGeo, cylGeo, coneGeo, boxGeo,
} from './common.js';
import {  } from '../kit.js';

const hill = (z) => (z > -8.5 ? 0 : 3.4 * (1 - Math.exp(-(-8.5 - z) / 11)));

function H(x, z) {
  if (z > -5.6) return 0;
  let h = hill(z) * (1 + 0.12 * Math.sin(x * 0.18 + 0.6));
  h += smooth(-8.5, -20, z) * (0.25 * Math.sin(x * 0.4 + z * 0.2) + 0.2 * (fbm(x * 0.15, z * 0.15) - 0.5));
  // 먼 산줄기
  h += smooth(-55, -95, z) * (5 + 3.5 * Math.sin(x * 0.045 + 1.2) + 2.2 * Math.sin(x * 0.11 - 0.4)) * (0.8 + 0.4 * fbm(x * 0.03, z * 0.03));
  return h;
}

const C_G1 = rgb('#7fbf45');
const C_G2 = rgb('#a5d257');
const C_G3 = rgb('#c7df6a');
const C_PATH = rgb('#e6cf9e');

function color(x, y, z, ny) {
  const n = fbm(x * 0.3, z * 0.3);
  let c = mixv(C_G1, C_G2, smooth(0.3, 0.7, n));
  c = mixv(c, C_G3, smooth(0.55, 0.9, noise2(x * 1.3, z * 1.3)) * 0.35);
  // 언덕길(지그재그)
  const px = 1.4 * Math.sin(z * 0.32) + 0.4;
  if (z < -8 && z > -40) c = mixv(c, C_PATH, smooth(0.5, 0.3, Math.abs(x - px)) * 0.9);
  // 먼 산은 푸르게
  c = mixv(c, rgb('#7fae7a'), smooth(-50, -100, z) * 0.6);
  if (ny < 0.8) c = mixv(c, rgb('#6aa548'), 0.3);
  return c;
}

// 보도·찻길 띠
function drawStreet(ctx, W, Hh, row) {
  const r = rng(5);
  const px = W / 8;
  const fill = (z0, z1, col) => {
    ctx.fillStyle = col;
    ctx.fillRect(0, row(z0), W, row(z1) - row(z0) + 1);
  };
  // 앞 풀밭
  const gg = ctx.createLinearGradient(0, row(9), 0, row(0.8));
  gg.addColorStop(0, '#79b844');
  gg.addColorStop(1, '#8fc94e');
  ctx.fillStyle = gg;
  ctx.fillRect(0, 0, W, row(0.8));
  speckle(ctx, 0, 0, W, row(0.8), 900, ['#6aa83e', '#9bd35a', '#86c24a', '#a7d862'], r, [1.5, 4]);
  // 보도(보도블록)
  fill(0.8, -0.85, '#f1e4cc');
  ctx.strokeStyle = 'rgba(150,130,110,0.35)';
  ctx.lineWidth = 2;
  for (let x = 0; x <= W; x += px * 0.55) {
    ctx.beginPath();
    ctx.moveTo(x, row(0.8));
    ctx.lineTo(x, row(-0.85));
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(0, row(-0.02));
  ctx.lineTo(W, row(-0.02));
  ctx.stroke();
  speckle(ctx, 0, row(0.8), W, row(-0.85) - row(0.8), 260, ['rgba(120,100,80,0.12)', 'rgba(255,255,255,0.4)'], r, [1, 3]);
  // 연석
  fill(-0.85, -1.05, '#f7f2ea');
  fill(-1.0, -1.08, '#b9b0a6');
  // 찻길
  const rg = ctx.createLinearGradient(0, row(-1.08), 0, row(-4.05));
  rg.addColorStop(0, '#6a6f84');
  rg.addColorStop(1, '#5d6378');
  ctx.fillStyle = rg;
  ctx.fillRect(0, row(-1.08), W, row(-4.05) - row(-1.08));
  speckle(ctx, 0, row(-1.08), W, row(-4.05) - row(-1.08), 700, ['rgba(255,255,255,0.08)', 'rgba(20,20,40,0.12)'], r, [1, 3]);
  ctx.fillStyle = '#f4efe2';
  for (let x = 0; x < W; x += px * 2) ctx.fillRect(x + px * 0.3, row(-2.5), px * 1.1, row(-2.62) - row(-2.5));
  ctx.fillStyle = 'rgba(244,239,226,0.85)';
  ctx.fillRect(0, row(-1.22), W, 3);
  ctx.fillRect(0, row(-3.9), W, 3);
  // 건너편 연석·보도
  fill(-4.05, -4.25, '#f7f2ea');
  fill(-4.25, -5.7, '#e6ddcd');
  ctx.strokeStyle = 'rgba(150,130,110,0.3)';
  for (let x = 0; x <= W; x += px * 0.55) {
    ctx.beginPath();
    ctx.moveTo(x, row(-4.25));
    ctx.lineTo(x, row(-5.7));
    ctx.stroke();
  }
}

/** @param {{w:number,h:number}} size */
export function buildSuburb({ w }) {
  const r = rng(23);
  const root = new THREE.Group();
  const props = G(root);
  const hw0 = halfW(w, 0);

  const ground = terrain({ H, C: color, rows: 140, cols: 104, keep: (x, z) => z < -5.4 });
  const street = stripGround({ key: 'suburb', zNear: 9, zFar: -5.7, period: 8, draw: drawStreet });

  const walls = ['#fbe6c4', '#ffd9b8', '#fff1dc', '#f6d3b4', '#e6dcf2', '#fcdcd0', '#e2ecd2'];
  const roofs = ['#e0773b', '#c95a3a', '#4f6fc2', '#8f4a34', '#d8613c', '#5d6a96'];
  const leafSets = [
    ['#3f8f3a', '#56a843', '#74c24c'],
    ['#4a9a3c', '#64b448', '#8ad058'],
    ['#3a8a44', '#4fa24c', '#6dbb52'],
  ];

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
      shutters: r() < 0.5 ? ['#5d8fd0', '#5aa36a', '#c95a3a'][(r() * 3) | 0] : null,
      h: two ? 1.45 : 0.95,
      floors: two ? 2 : 1,
      wall: walls[(i * 3 + 1) % walls.length],
      roof: roofs[(i * 2 + (r() < 0.5 ? 1 : 0)) % roofs.length],
      detail: 2,
      pitch: 0.7 + r() * 0.2,
      chimneyX: r() < 0.5 ? -0.25 : 0.25,
      door: ['#8f5a3a', '#4f6fc2', '#c95a3a', '#5aa36a'][i % 4],
    });
    // 앞마당: 울타리, 산울타리, 꽃밭, 우체통
    picketFence(props, x - 0.95, x + 0.95, -5.45, { h: 0.34 });
    if (r() < 0.6) hedge(props, x + 0.55, 0, -6.1, 0.6, 1, '#4f9e3e');
    flowers(props, x - 0.5, 0, -6.0, 1.5, r);
    flowers(props, x + 0.1, 0, -6.2, 1.3, r);
    const mb = G(props, x + 0.75, 0, -5.2, 0, 1);
    mb.add(P(cylGeo(0.03, 0.03, 0.42, 6), '#7a4b2a', { pos: [0, 0.21, 0] }));
    mb.add(P(roundBoxGeo(0.16, 0.13, 0.24, 0.05, 2), ['#4f6fc2', '#e2483c', '#5aa36a'][i % 3], { pos: [0, 0.46, 0], fin: 'soft' }));
  });
  // 앞줄 사이 나무
  for (let i = 0; i < front.length - 1; i++) {
    const x = (front[i] + front[i + 1]) / 2;
    roundTree(props, x, 0, -8.6 - r(), 1.05 + r() * 0.3, r, { leaf: leafSets[i % 3], seg: 12 });
  }

  // 언덕 위 집들(층층이)
  const rows = [
    { z: -12.5, n: 6, s: 0.95, detail: 1 },
    { z: -17, n: 7, s: 0.95, detail: 1 },
    { z: -22.5, n: 8, s: 1.0, detail: 0 },
    { z: -29, n: 9, s: 1.05, detail: 0 },
    { z: -36, n: 10, s: 1.1, detail: 0 },
  ];
  for (const row of rows) {
    const span = halfW(w, row.z) + 1.5;
    for (let i = 0; i < row.n; i++) {
      const x = -span + ((i + 0.3 + r() * 0.4) / row.n) * 2 * span;
      const z = row.z + (r() - 0.5) * 1.6;
      if (Math.abs(x - (1.4 * Math.sin(z * 0.32) + 0.4)) < 0.9) continue; // 길
      const y = H(x, z);
      if (r() < 0.22) {
        roundTree(props, x, y, z, 0.9 + r() * 0.4, r, { leaf: leafSets[(r() * 3) | 0], seg: 9 });
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
      if (r() < 0.6) roundTree(props, x + 0.9 + r() * 0.4, y, z - 0.7, 0.75 + r() * 0.3, r, { leaf: leafSets[(r() * 3) | 0], seg: 8 });
    }
  }
  // 교회(시계탑)
  {
    const x = 3.6;
    const z = -31;
    const y = H(x, z);
    const ch = G(props, x, y - 0.05, z, -0.2, 1.25);
    ch.add(P(roundBoxGeo(1.6, 1.3, 2.2, 0.04, 1), '#f6ead6', { pos: [0, 0.65, -0.4], fin: 'soft' }));
    ch.add(P(roundBoxGeo(1.85, 0.1, 2.4, 0.03, 1), '#8f4a34', { pos: [-0.45, 1.55, -0.4], rot: [0, 0, 0.75], fin: 'soft' }));
    ch.add(P(roundBoxGeo(1.85, 0.1, 2.4, 0.03, 1), '#8f4a34', { pos: [0.45, 1.55, -0.4], rot: [0, 0, -0.75], fin: 'soft' }));
    ch.add(P(roundBoxGeo(0.9, 3.0, 0.9, 0.04, 1), '#fbf2e2', { pos: [0, 1.5, 0.75], fin: 'soft' }));
    ch.add(P(coneGeo(0.72, 1.4, 4), '#4f6fc2', { pos: [0, 3.7, 0.75], rot: [0, Math.PI / 4, 0], fin: 'soft' }));
    ch.add(P(cylGeo(0.26, 0.26, 0.05, 20), '#ffffff', { pos: [0, 2.45, 1.21], rot: [Math.PI / 2, 0, 0], fin: 'soft' }));
    ch.add(P(boxGeo(0.03, 0.18, 0.02), '#2b3a78', { pos: [0, 2.5, 1.245] }));
    ch.add(P(boxGeo(0.14, 0.03, 0.02), '#2b3a78', { pos: [0.05, 2.45, 1.245] }));
    ch.add(P(roundBoxGeo(0.3, 0.55, 0.05, 0.05, 2), '#7fa6d8', { pos: [0, 1.65, 1.21], fin: 'gloss' }));
    ch.add(P(roundBoxGeo(0.4, 0.6, 0.05, 0.05, 2), '#8f5a3a', { pos: [0, 0.3, 1.21], fin: 'soft' }));
  }
  // 먼 언덕 숲
  for (let i = 0; i < 40; i++) {
    const z = -45 - r() * 40;
    const x = (r() * 2 - 1) * halfW(w, z) * 1.1;
    roundTree(props, x, H(x, z) - 0.1, z, 1.6 + r() * 1.2, r, { leaf: leafSets[(r() * 3) | 0], seg: 7, trunkH: 0.5 });
  }

  // 길 건너 가로등, 주차된 차
  const lamps = [];
  for (let x = -hw0 * 1.7; x <= hw0 * 1.7; x += 3.2) lamps.push(x + 0.6);
  for (const x of lamps) streetLamp(props, x, 0, -4.75, 1.0, { lit: false });
  car(props, -1.6, 0, -3.35, Math.PI, 1, '#ff8f6b');
  car(props, hw0 + 0.6, 0, -3.35, Math.PI, 1, '#7fb6e6');

  // 화면 양옆 큰 나무(액자)
  const edgeL = -halfW(w, -5.9) + 0.1;
  const edgeR = halfW(w, -6.2) - 0.1;
  roundTree(props, edgeL, 0, -5.9, 1.6, r, { leaf: leafSets[0], seg: 16 });
  roundTree(props, edgeR, 0, -6.2, 1.7, r, { leaf: leafSets[1], seg: 16 });
  bush(props, edgeL + 0.8, 0, -5.4, 1.0, r, { flowers: 5, flowerColor: '#ff8fb0' });
  bush(props, edgeR - 0.9, 0, -5.5, 1.1, r, { flowers: 5, flowerColor: '#ffffff' });

  // 앞 풀밭 꽃·풀(0.15 이하)
  for (let i = 0; i < 22; i++) {
    const x = (r() * 2 - 1) * (hw0 + 0.6);
    const z = 1.05 + r() * 2.2;
    if (r() < 0.55) flowers(props, x, 0, z, 0.9 + r() * 0.5, r, { n: 4 });
    else tuft(props, x, 0, z, 1.0, r, '#5f9e3c');
  }

  bake(props);
  root.add(ground, street);

  // 구름(따뜻한 오후빛)
  const cm = cloudMat('#fffaf0', '#a9a6e0', { light: [-0.8, 0.6, 0.3], mid: '#f1e4e6' });
  const cmFar = cloudMat('#fff6ea', '#d9cde6', { fog: true, light: [-0.8, 0.6, 0.3] });
  const sky = G(root);
  const drift = cloudLayer(sky, 23, [
    { x: 26, y: 19, z: -115, w: 28, h: 13, n: 24, seg: 14, speed: 0.12, span: 75 },
    { x: -30, y: 30, z: -130, w: 20, h: 8, n: 18, seg: 12, speed: 0.1, span: 75 },
    { x: 8, y: 52, z: -160, w: 22, h: 7, n: 14, seg: 12, speed: 0.08, span: 85 },
  ], cm);
  const bank = cloudLayer(sky, 29, [
    { x: -50, y: 6, z: -250, w: 60, h: 13, n: 16, seg: 12, speed: 0.03, span: 120 },
    { x: 20, y: 5, z: -265, w: 60, h: 11, n: 16, seg: 12, speed: 0.03, span: 120 },
    { x: 90, y: 6, z: -270, w: 50, h: 12, n: 14, seg: 12, speed: 0.03, span: 120 },
  ], cmFar);

  const env = {
    sky: { top: '#3a6fd4', mid: '#78acee', horizon: '#ffe2c0', sunDir: [-0.85, 0.32, -1], sunColor: '#ffe0a8', sunStrength: 0.75 },
    fog: { color: '#f6e2cc', near: 28, far: 260 },
    sun: { color: '#ffe3b8', intensity: 2.15, dir: [-0.85, 0.85, 0.55] },
    hemi: { sky: '#bcd6ff', ground: '#a8b86a', intensity: 0.85 },
    exposure: 1.0,
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
