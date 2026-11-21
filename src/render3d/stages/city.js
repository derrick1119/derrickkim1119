// 4. 도시(노을 진 시내): 창문 격자가 있는 빌딩 블록(몇 집은 불이 켜짐), 옥상 소품(물탱크·실외기·안테나), 광고판,
//    가로등이 켜진 거리, 그리고 탐조등 원뿔로 거리를 훑으며 맴도는 경찰 헬기.
import {
  THREE, P, G, bake, terrain, cloudLayer, cloudMat, roundTree, bush, flowers, streetLamp, car, stripGround, speckle,
  halfW, smooth, fbm, rgb, mixv, rng, TAU, cachedTex, glowPoints, mix,
  sphereGeo, boxGeo, roundBoxGeo, cylGeo, coneGeo, capsuleGeo, torusGeo, latheGeo, mat,
} from './common.js';
import { bakeStatic, glowSprite, glowTexture } from '../kit.js';

// ───────── 창문 무늬 ─────────

const CELLS = 8;
function windowTextures() {
  const r = rng(41);
  const lit = [];
  for (let i = 0; i < CELLS * CELLS; i++) lit.push(r() < 0.28 ? 1 + ((r() * 3) | 0) : 0);
  const S = 64;
  const map = cachedTex('cityWin', S * CELLS, S * CELLS, (ctx) => {
    for (let j = 0; j < CELLS; j++) {
      for (let i = 0; i < CELLS; i++) {
        const x = i * S;
        const y = j * S;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, y, S, S);
        // 층 띠
        ctx.fillStyle = '#e8e2ee';
        ctx.fillRect(x, y + S - 8, S, 8);
        const L = lit[j * CELLS + i];
        const gx = x + 15;
        const gy = y + 12;
        const gw = S - 30;
        const gh = S - 28;
        if (L) {
          const g = ctx.createLinearGradient(0, gy, 0, gy + gh);
          g.addColorStop(0, ['#ffe7a8', '#ffd58a', '#ffc6a0'][L - 1]);
          g.addColorStop(1, ['#ffc867', '#ffb45a', '#ff9f80'][L - 1]);
          ctx.fillStyle = g;
        } else {
          const g = ctx.createLinearGradient(gx, gy, gx + gw, gy + gh);
          g.addColorStop(0, '#6f7fc0');
          g.addColorStop(0.55, '#3d4a8c');
          g.addColorStop(1, '#2c3670');
          ctx.fillStyle = g;
        }
        ctx.fillRect(gx, gy, gw, gh);
        if (!L) {
          ctx.fillStyle = 'rgba(255,255,255,0.28)';
          ctx.beginPath();
          ctx.moveTo(gx + 4, gy + gh - 6);
          ctx.lineTo(gx + gw * 0.55, gy + 3);
          ctx.lineTo(gx + gw * 0.75, gy + 3);
          ctx.lineTo(gx + 10, gy + gh - 4);
          ctx.fill();
        }
        ctx.fillStyle = 'rgba(40,40,80,0.35)';
        ctx.fillRect(gx + gw / 2 - 1, gy, 2, gh);
      }
    }
  });
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  const emi = cachedTex('cityWinE', S * CELLS, S * CELLS, (ctx) => {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, S * CELLS, S * CELLS);
    for (let j = 0; j < CELLS; j++) {
      for (let i = 0; i < CELLS; i++) {
        const L = lit[j * CELLS + i];
        if (!L) continue;
        ctx.fillStyle = ['#ffd27a', '#ffb860', '#ff9a7a'][L - 1];
        ctx.fillRect(i * S + 15, j * S + 12, S - 30, S - 28);
      }
    }
  });
  emi.wrapS = emi.wrapT = THREE.RepeatWrapping;
  return { map, emi };
}

const towerMats = new Map();
function towerMat(tint) {
  let m = towerMats.get(tint);
  if (!m) {
    const { map, emi } = windowTextures();
    m = new THREE.MeshStandardMaterial({ color: tint, map, emissiveMap: emi, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.95, roughness: 0.7, envMapIntensity: 0.7 });
    towerMats.set(tint, m);
  }
  return m;
}

/** 창문 격자가 맞게 UV 를 늘린 상자. 위·아래 면은 벽색 칸 하나. */
function towerGeo(w, h, d, colW, floorH, ou, ov) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const faceSize = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    const [fw, fh] = faceSize[f];
    for (let k = 0; k < 4; k++) {
      const i = f * 4 + k;
      if (f === 2 || f === 3) {
        uv.setXY(i, 0.02 + ou / CELLS, 0.97);
        continue;
      }
      uv.setXY(i, (uv.getX(i) * Math.max(1, Math.round(fw / colW)) + ou) / CELLS, (uv.getY(i) * Math.max(1, Math.round(fh / floorH)) + ov) / CELLS);
    }
  }
  return g;
}

function tower(parent, x, z, w, h, d, tint, r, { colW = 0.56, floorH = 0.6, ry = 0 } = {}) {
  const m = new THREE.Mesh(towerGeo(w, h, d, colW, floorH, (r() * CELLS) | 0, (r() * CELLS) | 0), towerMat(tint));
  m.position.set(x, h / 2, z);
  m.rotation.y = ry;
  m.userData.ownGeometry = true;
  parent.add(m);
  return m;
}

// ───────── 소품 ─────────

function waterTank(parent, x, y, z, s) {
  const g = G(parent, x, y, z, 0, s);
  for (const [lx, lz] of [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]]) g.add(P(cylGeo(0.03, 0.03, 0.5, 5), '#5a3a2a', { pos: [lx, 0.25, lz] }));
  g.add(P(cylGeo(0.38, 0.38, 0.6, 14), '#a8744a', { pos: [0, 0.8, 0] }));
  for (const yy of [0.62, 0.95]) g.add(P(torusGeo(0.385, 0.018, 4, 18), '#5a3a2a', { pos: [0, yy, 0], rot: [Math.PI / 2, 0, 0] }));
  g.add(P(coneGeo(0.42, 0.3, 14), '#6b4a3a', { pos: [0, 1.25, 0] }));
  return g;
}

function billboard(parent, x, y, z, ry, s, tex) {
  const g = G(parent, x, y, z, ry, s);
  for (const lx of [-0.7, 0.7]) g.add(P(boxGeo(0.06, 0.6, 0.06), '#3c4569', { pos: [lx, 0.3, 0] }));
  g.add(P(roundBoxGeo(2.1, 1.1, 0.1, 0.03, 1), '#3c4569', { pos: [0, 1.1, -0.03], fin: 'soft' }));
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.96, 0.96), mat('#ffffff', { map: tex, rough: 0.6, emissive: '#000000' }));
  panel.material = billMat(tex);
  panel.position.set(0, 1.1, 0.03);
  panel.userData.ownGeometry = true;
  g.add(panel);
  for (const lx of [-0.6, 0, 0.6]) g.add(P(boxGeo(0.12, 0.05, 0.14), '#3c4569', { pos: [lx, 0.52, 0.12] }));
  return g;
}
const billMats = new Map();
function billMat(tex) {
  let m = billMats.get(tex.uuid);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.55, roughness: 0.6 });
    billMats.set(tex.uuid, m);
  }
  return m;
}

function adTexture() {
  return cachedTex('cityAd', 512, 256, (ctx, W, Hh) => {
    const g = ctx.createLinearGradient(0, 0, W, Hh);
    g.addColorStop(0, '#ff6fa8');
    g.addColorStop(1, '#ffb347');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, Hh);
    // 큰 빙수 그릇과 별
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(140, 150, 78, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#7fe0ff';
    ctx.beginPath();
    ctx.ellipse(140, 92, 70, 52, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ff4f7a';
    ctx.beginPath();
    ctx.arc(140, 50, 16, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(62, 150, 156, 18);
    ctx.font = 'bold 64px system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('SNOW', 260, 118);
    ctx.fillText('ICE!', 270, 190);
    ctx.fillStyle = '#fff59a';
    for (const [sx, sy, sr] of [[470, 40, 14], [240, 40, 9], [480, 210, 10]]) {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU - Math.PI / 2;
        const rr = i % 2 ? sr * 0.45 : sr;
        ctx.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr);
      }
      ctx.fill();
    }
  });
}

function shop(parent, x, z, w, floors, wall, awning, r, lamps) {
  const g = G(parent, x, 0, z, 0, 1);
  const h = 0.62 + floors * 0.6;
  g.add(P(roundBoxGeo(w, h, 1.4, 0.03, 1), wall, { pos: [0, h / 2, 0], fin: 'soft' }));
  g.add(P(boxGeo(w + 0.12, 0.14, 1.52), mix(wall, '#3c4569', 0.35), { pos: [0, h + 0.07, 0], fin: 'soft' }));
  // 1층 진열창(불 켜짐)
  g.add(P(boxGeo(w * 0.8, 0.42, 0.04), '#ffd98a', { pos: [0, 0.3, 0.71], fin: 'glow', cast: false }));
  g.add(P(boxGeo(w * 0.84, 0.05, 0.06), '#3c4569', { pos: [0, 0.53, 0.72], cast: false }));
  // 줄무늬 차양
  const n = Math.max(3, Math.round(w / 0.22));
  for (let i = 0; i < n; i++) {
    g.add(P(boxGeo(w / n + 0.002, 0.04, 0.42), i % 2 ? '#ffffff' : awning, { pos: [-w / 2 + (w / n) * (i + 0.5), 0.66, 0.86], rot: [0.5, 0, 0], fin: 'soft' }));
  }
  // 위층 창
  const cols = Math.max(2, Math.round(w / 0.42));
  for (let f = 0; f < floors; f++) {
    for (let c = 0; c < cols; c++) {
      const on = r() < 0.4;
      const wx = -w / 2 + (w / cols) * (c + 0.5);
      const wy = 0.95 + f * 0.6;
      g.add(P(boxGeo(0.26, 0.32, 0.03), '#f4ece0', { pos: [wx, wy, 0.705], fin: 'soft', cast: false }));
      g.add(P(boxGeo(0.2, 0.26, 0.04), on ? '#ffd98a' : '#4a5aa0', { pos: [wx, wy, 0.715], fin: on ? 'glow' : 'gloss', cast: false }));
    }
  }
  // 간판(빛)
  g.add(P(roundBoxGeo(w * 0.5, 0.16, 0.06, 0.03, 1), ['#ff6fa8', '#5ff0ff', '#ffd23f', '#9fff8a'][(r() * 4) | 0], { pos: [0, 0.8, 0.75], fin: 'glow', cast: false }));
  // 옥상 실외기
  if (r() < 0.7) g.add(P(boxGeo(0.4, 0.26, 0.36), '#c9c3d8', { pos: [(r() - 0.5) * w * 0.5, h + 0.27, -0.2], fin: 'soft' }));
  lamps.push([x, 0.3, z + 0.95, '#ffcf7a']);
  return { g, h };
}

function helicopter(parent) {
  const root = G(parent);
  root.userData.dynamic = true;
  const body = G(root);
  const navy = '#2b3a78';
  body.add(P(sphereGeo(1, 22, 16), navy, { scale: [0.62, 0.42, 0.42], fin: 'soft' }));
  body.add(P(sphereGeo(1, 20, 14), '#9fe8ff', { pos: [0.3, 0.05, 0], scale: [0.36, 0.32, 0.36], fin: 'gloss' }));
  body.add(P(sphereGeo(1, 16, 10), '#ffffff', { pos: [-0.05, -0.08, 0], scale: [0.55, 0.12, 0.425], fin: 'soft' }));
  body.add(P(capsuleGeo(0.08, 1.1, 4, 10), navy, { pos: [-0.85, 0.08, 0], rot: [0, 0, Math.PI / 2 - 0.08], fin: 'soft' }));
  body.add(P(roundBoxGeo(0.22, 0.32, 0.04, 0.02, 1), navy, { pos: [-1.38, 0.24, 0], rot: [0, 0, 0.3], fin: 'soft' }));
  for (const sz of [-0.3, 0.3]) {
    body.add(P(capsuleGeo(0.03, 0.95, 3, 6), '#3c4569', { pos: [0.02, -0.5, sz], rot: [0, 0, Math.PI / 2] }));
    body.add(P(cylGeo(0.02, 0.02, 0.18, 5), '#3c4569', { pos: [0.18, -0.4, sz] }));
    body.add(P(cylGeo(0.02, 0.02, 0.18, 5), '#3c4569', { pos: [-0.18, -0.4, sz] }));
  }
  body.add(P(cylGeo(0.06, 0.08, 0.14, 10), '#3c4569', { pos: [0, 0.46, 0] }));
  body.add(P(sphereGeo(0.05, 8, 6), '#ff3a4a', { pos: [-0.1, 0.42, 0.18], fin: 'glow' }));
  body.add(P(sphereGeo(0.05, 8, 6), '#3a7aff', { pos: [-0.1, 0.42, -0.18], fin: 'glow' }));
  body.add(P(cylGeo(0.08, 0.1, 0.12, 10), '#e9e4f2', { pos: [0.45, -0.3, 0], rot: [0, 0, 0.6], fin: 'soft' }));
  bakeStatic(body);
  const rotor = G(root, 0, 0.55, 0);
  for (let i = 0; i < 4; i++) rotor.add(P(roundBoxGeo(1.5, 0.025, 0.09, 0.01, 1), '#3c4569', { pos: [Math.cos((i * TAU) / 4) * 0.75, 0, -Math.sin((i * TAU) / 4) * 0.75], rot: [0, (i * TAU) / 4, 0] }));
  rotor.add(P(cylGeo(0.07, 0.07, 0.05, 10), '#3c4569'));
  bakeStatic(rotor);
  const tail = G(root, -1.42, 0.25, 0.06);
  for (let i = 0; i < 2; i++) tail.add(P(roundBoxGeo(0.4, 0.04, 0.02, 0.01, 1), '#e9e4f2', { rot: [0, 0, (i * Math.PI) / 2] }));
  bakeStatic(tail);
  return { root, rotor, tail };
}

/** 탐조등 빛기둥(덧그리기, 끝으로 갈수록 옅어짐). 꼭짓점은 원점, −y 쪽으로 길이 1. */
function beamCone() {
  const tex = cachedTex('beamGrad', 4, 128, (ctx, W, Hh) => {
    const g = ctx.createLinearGradient(0, 0, 0, Hh);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.4)');
    g.addColorStop(1, 'rgba(255,255,255,0.08)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, Hh);
  }, { mip: false });
  const geo = new THREE.CylinderGeometry(0.04, 1, 1, 24, 1, true);
  geo.translate(0, -0.5, 0);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: '#fff3c8', map: tex, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  m.userData.ownGeometry = true;
  m.renderOrder = 6;
  return m;
}

// 보도·찻길
function drawStreet(ctx, W, Hh, row) {
  const r = rng(13);
  const px = W / 8;
  const fill = (z0, z1, col) => {
    ctx.fillStyle = col;
    ctx.fillRect(0, row(z0), W, row(z1) - row(z0) + 1);
  };
  fill(9, -0.85, '#e8dccd');
  ctx.strokeStyle = 'rgba(110,90,120,0.3)';
  ctx.lineWidth = 2;
  for (let x = 0; x <= W; x += px * 0.5) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, row(-0.85));
    ctx.stroke();
  }
  for (let z = 8.5; z > -0.85; z -= 0.5) {
    ctx.beginPath();
    ctx.moveTo(0, row(z));
    ctx.lineTo(W, row(z));
    ctx.stroke();
  }
  speckle(ctx, 0, 0, W, row(-0.85), 900, ['rgba(90,70,100,0.1)', 'rgba(255,255,255,0.35)'], r, [1, 3]);
  fill(-0.85, -1.05, '#efe8ea');
  fill(-1.0, -1.08, '#9a8fa6');
  const rg = ctx.createLinearGradient(0, row(-1.08), 0, row(-4.6));
  rg.addColorStop(0, '#585c78');
  rg.addColorStop(1, '#4c5070');
  ctx.fillStyle = rg;
  ctx.fillRect(0, row(-1.08), W, row(-4.6) - row(-1.08));
  speckle(ctx, 0, row(-1.08), W, row(-4.6) - row(-1.08), 800, ['rgba(255,255,255,0.07)', 'rgba(10,10,30,0.12)'], r, [1, 3]);
  // 가운데 노란 겹선, 차선
  ctx.fillStyle = '#ffd23f';
  ctx.fillRect(0, row(-2.78), W, 3);
  ctx.fillRect(0, row(-2.9), W, 3);
  ctx.fillStyle = '#f4efe2';
  for (let x = 0; x < W; x += px * 2) {
    ctx.fillRect(x + px * 0.2, row(-1.95), px, 3);
    ctx.fillRect(x + px * 1.2, row(-3.75), px, 3);
  }
  // 건널목
  ctx.fillStyle = 'rgba(250,246,236,0.9)';
  for (let k = 0; k < 7; k++) ctx.fillRect(px * 5 + k * px * 0.32, row(-1.2), px * 0.18, row(-4.45) - row(-1.2));
  fill(-4.6, -4.8, '#efe8ea');
  fill(-4.8, -6.4, '#d3c8d2');
  ctx.strokeStyle = 'rgba(110,90,120,0.3)';
  for (let x = 0; x <= W; x += px * 0.5) {
    ctx.beginPath();
    ctx.moveTo(x, row(-4.8));
    ctx.lineTo(x, row(-6.4));
    ctx.stroke();
  }
}

// ───────── 무대 ─────────

/** @param {{w:number,h:number}} size */
export function buildCity({ w }) {
  const r = rng(41);
  const root = new THREE.Group();
  const props = G(root);
  const hw0 = halfW(w, 0);

  const street = stripGround({ key: 'city', zNear: 9, zFar: -6.4, period: 8, draw: drawStreet });
  const ground = terrain({ H: () => 0, C: (x, y, z) => mixv(rgb('#8a7f96'), rgb('#b493a6'), smooth(-20, -120, z)), zNear: -6.2, zFar: -340, rows: 40, cols: 40 });

  const lamps = [];
  // 앞줄 가게
  const tints = ['#f4dccb', '#c3d0f2', '#b6a4dc', '#e9b49c', '#9aa4d8', '#f2e6c8'];
  const shopWalls = ['#f08a6a', '#8fb4e6', '#f6d27a', '#b99ae0', '#7fcf9f', '#f5a3b8'];
  const awnings = ['#e2483c', '#2fb5a6', '#4f6fc2', '#ff9a3c', '#8a6ad8'];
  const spanF = halfW(w, -7.6) + 1.5;
  let sx = -spanF;
  let si = 0;
  while (sx < spanF) {
    const sw = 1.3 + r() * 0.8;
    shop(props, sx + sw / 2, -7.4 - r() * 0.3, sw, 1 + ((r() * 3) | 0), shopWalls[si % shopWalls.length], awnings[si % awnings.length], r, lamps);
    sx += sw + 0.04;
    si++;
  }
  // 빌딩: 화면에서 지붕이 닿는 높이를 정해 두고(가운데는 낮게 = 기체 자리, 양옆은 높게) 거기서 높이를 거꾸로 구한다
  const topAt = (x, z, yScreen) => 3.23 + ((432 - yScreen) * (14 - z)) / 896;
  const sideK = (x, z) => smooth(0.35, 0.95, Math.abs(x) / halfW(w, z));
  const roofs = [];
  const midRows = [
    { z: -12.5, n: 6, d: 1.8 },
    { z: -19, n: 7, d: 2.2 },
    { z: -28, n: 8, d: 2.6 },
    { z: -40, n: 9, d: 3 },
  ];
  midRows.forEach((row, ri) => {
    const span = halfW(w, row.z) + 2.5;
    for (let i = 0; i < row.n; i++) {
      const x = -span + ((i + 0.5 + (r() - 0.5) * 0.6) / row.n) * 2 * span;
      const z = row.z + (r() - 0.5) * 2;
      const bw = (2 * span) / row.n * (0.75 + r() * 0.3);
      const yS = 395 - 120 * sideK(x, z) - ri * 6 - r() * 26;
      const hh = Math.max(2.5, topAt(x, z, yS));
      tower(props, x, z, bw, hh, row.d + r(), tints[(i * 3 + ri) % tints.length], r);
      roofs.push([x, hh, z, bw]);
    }
  });
  // 먼 빌딩 숲(옅은 실루엣)
  for (let i = 0; i < 34; i++) {
    const z = -60 - r() * 60;
    const span = halfW(w, z) * 1.15;
    const x = (r() * 2 - 1) * span;
    const hh = Math.max(4, topAt(x, z, 400 - 150 * sideK(x, z) - r() * 30));
    tower(props, x, z, 3 + r() * 3, hh, 3 + r() * 2, ['#c9b2d6', '#b9b0dc', '#d8b6c6'][(r() * 3) | 0], r, { colW: 0.8, floorH: 0.9 });
  }
  // 랜드마크 탑(오른쪽 뒤)
  {
    const x = halfW(w, -44) * 0.72;
    const z = -44;
    const th = topAt(x, z, 250);
    tower(props, x, z, 3.2, th, 3.2, '#c7d3f0', r);
    const tp = G(props, x, th, z, 0, 1);
    tp.add(P(boxGeo(2.6, 1.2, 2.6), '#b9c4e6', { pos: [0, 0.6, 0], fin: 'soft' }));
    tp.add(P(boxGeo(1.8, 1.0, 1.8), '#a9b4dc', { pos: [0, 1.7, 0], fin: 'soft' }));
    tp.add(P(cylGeo(0.06, 0.12, 3.2, 6), '#8890b8', { pos: [0, 3.8, 0] }));
    lamps.push([x, th + 5.5, z, '#ff4a5a']);
  }
  // 옥상 소품
  for (const [x, hh, z, bw] of roofs) {
    const k = r();
    if (k < 0.3 && z > -35) waterTank(props, x + (r() - 0.5) * bw * 0.4, hh, z, 0.9);
    else if (k < 0.6) {
      props.add(P(boxGeo(0.5, 0.3, 0.4), '#c9c3d8', { pos: [x + (r() - 0.5) * bw * 0.5, hh + 0.15, z], fin: 'soft' }));
      props.add(P(boxGeo(0.4, 0.25, 0.4), '#b9b2c6', { pos: [x + (r() - 0.5) * bw * 0.5, hh + 0.12, z + 0.3], fin: 'soft' }));
    } else if (k < 0.85) {
      props.add(P(cylGeo(0.03, 0.04, 1.2, 5), '#5a5f80', { pos: [x, hh + 0.6, z] }));
      lamps.push([x, hh + 1.22, z, '#ff4a5a']);
    }
  }
  // 광고판(옥상)
  const ad = adTexture();
  const bb = roofs.slice(0, 6).reduce((a, b) => (Math.abs(b[0] + 2.2) < Math.abs(a[0] + 2.2) ? b : a));
  billboard(props, bb[0], bb[1], bb[2] + 0.3, 0.12, 1.25, ad);

  // 가로수·가로등·차
  for (let x = -hw0 * 1.8; x <= hw0 * 1.8; x += 2.8) {
    streetLamp(props, x + 0.3, 0, -5.0, 1.05, { lit: true, pole: '#2b3a78' });
    lamps.push([x + 0.3, 1.95 * 1.05, -5.0, '#ffd98a']);
  }
  for (const x of [-hw0 * 1.1, hw0 * 1.05]) {
    roundTree(props, x, 0, -5.6, 0.95, r, { leaf: ['#3f7f4a', '#4f9a54', '#6ab45e'], seg: 12 });
    props.add(P(cylGeo(0.42, 0.42, 0.06, 16), '#6b5a5a', { pos: [x, 0.03, -5.6] }));
  }
  car(props, -1.0, 0, -3.6, Math.PI, 1, '#ffd23f');
  car(props, hw0 + 0.2, 0, -1.9, 0, 1, '#e2483c');
  // 화분·벤치(보도 뒤쪽)
  for (const x of [-hw0 + 0.4, hw0 - 0.5]) {
    const g = G(props, x, 0, -1.55, 0, 1);
    g.add(P(cylGeo(0.2, 0.16, 0.3, 14), '#d8613c', { pos: [0, 0.15, 0], fin: 'soft' }));
    bush(g, 0, 0.28, 0, 0.7, r, { flowers: 5, flowerColor: '#ff8fb0', seg: 9 });
  }

  bake(props, { zMin: -10 });
  root.add(street, ground);

  // 불빛(가로등·간판·안테나) 한 번에
  const lampPts = glowPoints(lamps.map(([x, y, z, c]) => [x, y, z + 0.05, c]), { size: 0.9, atten: true, opacity: 0.75 });
  root.add(lampPts);
  // 노을 해
  const sun = glowSprite('#ffc27a', 46, 0.75);
  sun.position.set(-26, 12, -260);
  root.add(sun);

  // 헬기 + 탐조등
  const heli = helicopter(root);
  heli.root.scale.setScalar(1.2);
  const beam = beamCone();
  root.add(beam);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshBasicMaterial({ map: glowTexture(), color: '#fff0c0', transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
  pool.rotation.x = -Math.PI / 2;
  pool.userData.ownGeometry = true;
  pool.renderOrder = 5;
  root.add(pool);
  const spot = glowSprite('#fff6d8', 1.0, 0.9);
  root.add(spot);

  // 노을 구름(가늘고 길게)
  const cm = cloudMat('#ffd2b4', '#8c6cc0', { light: [-0.8, 0.2, -0.2], mid: '#f39aa8' });
  const sky = G(root);
  const drift = cloudLayer(sky, 43, [
    { x: -26, y: 26, z: -130, w: 30, h: 6, n: 16, seg: 12, speed: 0.12, span: 80, flat: 0.15 },
    { x: 24, y: 36, z: -150, w: 34, h: 6, n: 16, seg: 12, speed: 0.1, span: 85, flat: 0.15 },
    { x: -6, y: 58, z: -180, w: 40, h: 6, n: 14, seg: 10, speed: 0.08, span: 95, flat: 0.15 },
  ], cm);

  const env = {
    sky: { top: '#36389a', mid: '#c46aa4', horizon: '#ffae72', sunDir: [-0.1, 0.03, -1], sunColor: '#ffb070', sunStrength: 0.8, sunSize: 0.0015 },
    fog: { color: '#f6b49a', near: 40, far: 320 },
    sun: { color: '#ffc49a', intensity: 2.3, dir: [-0.85, 0.65, 0.45] },
    hemi: { sky: '#b2abe2', ground: '#a88c7c', intensity: 0.9 },
    exposure: 1.0,
  };

  const tmp = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  return {
    group: root,
    env,
    update(t) {
      // 헬기: 화면 뒤쪽을 천천히 8자로 돈다
      const a = t * 0.22;
      const hx = Math.sin(a) * 4.2;
      const hz = -10 + Math.sin(a * 2) * 0.8;
      const hy = 4.5 + Math.sin(t * 0.9) * 0.15;
      heli.root.position.set(hx, hy, hz);
      const vx = Math.cos(a) * 4.5;
      const vz = Math.cos(a * 2) * 1.6;
      heli.root.rotation.set(0, Math.atan2(-vz, vx), -Math.cos(a) * 0.12);
      heli.rotor.rotation.y = t * 22;
      heli.tail.rotation.z = t * 30;
      // 탐조등: 헬기 배에서 거리로, 좌우로 훑는다
      const tx = hx * 0.4 + Math.sin(t * 0.7) * 2.6;
      const tz = -3 + Math.sin(t * 0.45) * 1.2;
      const src = tmp.set(hx + 0.2, hy - 0.45, hz);
      const dir = new THREE.Vector3(tx - src.x, 0.02 - src.y, tz - src.z);
      const len = dir.length();
      beam.position.copy(src);
      beam.quaternion.setFromUnitVectors(up, dir.clone().multiplyScalar(-1 / len));
      beam.scale.set(1.1, len, 1.1);
      pool.position.set(tx, 0.03, tz);
      pool.scale.set(1.5, 1.1, 1);
      spot.position.copy(src);
      drift(t);
    },
  };
}
