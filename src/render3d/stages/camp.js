// 3. 캠핑장(해 질 녘 황금빛): 눈 덮인 겹겹 산, 산을 비추는 호수, 소나무 숲, 텐트, 모닥불(일렁임), 통나무, 바위.
const CAMZ = 14;
import {
  THREE, P, G, bake, terrain, cloudLayer, cloudMat, pine, bush, flowers, tuft, rock, groundBlob, halfW, smooth, clamp,
  fbm, noise2, rgb, mixv, rng, TAU, vcolMat, cachedTex, glowPoints, extrudeGeo,
  sphereGeo, boxGeo, roundBoxGeo, cylGeo, coneGeo, capsuleGeo, latheGeo,
} from './common.js';
import { bakeStatic, glowSprite } from '../kit.js';

const LAKE_Y = -0.14;
const nearShore = (x) => -6.6 - 0.7 * Math.sin(x * 0.45 + 0.8) - 0.4 * Math.sin(x * 1.1);
const farShore = (x) => -40 + 2.5 * Math.sin(x * 0.12 + 0.5) + 1.5 * Math.sin(x * 0.31);

// 산: 가운데는 낮고(기체 자리), 양옆이 높다
const PEAKS = [
  // x, z, 높이, 가로 퍼짐, 세로 퍼짐
  [-38, -150, 30, 260, 500], [-4, -185, 17, 260, 600], [32, -150, 31, 300, 500], [60, -170, 26, 300, 500], [-66, -165, 24, 300, 500],
  [-20, -95, 11, 110, 160], [6, -105, 7.5, 120, 140], [27, -92, 13, 120, 180], [-42, -98, 13, 160, 200],
];
function mountH(x, z) {
  let h = 0;
  for (const [px, pz, ph, sx, sz] of PEAKS) {
    const e = Math.exp(-((x - px) ** 2) / sx - ((z - pz) ** 2) / sz);
    h = Math.max(h, ph * e) + ph * e * 0.08;
  }
  // 산자락 결(둥근 능선)
  h *= 0.85 + 0.3 * fbm(x * 0.06 + 4, z * 0.06, 3);
  return h;
}

function H(x, z) {
  if (z > -2.8) return 0;
  const ns = nearShore(x);
  const fs = farShore(x);
  let h;
  if (z > ns) h = smooth(-2.8, ns + 0.5, z) * 0.12 + 0.1 * (fbm(x * 0.4, z * 0.4) - 0.5) * smooth(-2.8, -4, z);
  else if (z > fs) {
    // 호수 바닥(물 아래로 깊게 떨어져야 반영이 보인다)
    const k = Math.min(ns - z, z - fs);
    h = LAKE_Y - 0.05 - smooth(0, 1.2, k) * 3;
  } else {
    // 먼 물가 숲 언덕 → 산
    const k = fs - z;
    h = LAKE_Y + smooth(0, 1.5, k) * 0.4 + smooth(1, 14, k) * (2.2 + 1.6 * Math.sin(x * 0.17 + 0.3) + 1.2 * fbm(x * 0.1, z * 0.1));
    h += mountH(x, z) * smooth(-48, -75, z);
  }
  return h;
}

const C_GRASS = rgb('#9fd34c');
const C_GRASS2 = rgb('#bdd65a');
const C_SAND = rgb('#e9cf9a');
const C_TRAIL = rgb('#d7b47e');
const C_FOREST = rgb('#3d6e4c');
const C_FOREST2 = rgb('#55845a');
const C_ROCK = rgb('#8d88b4');
const C_ROCK2 = rgb('#b298b0');
const C_SNOW = rgb('#fbf6ff');

function color(x, y, z, ny) {
  const n = fbm(x * 0.3, z * 0.3);
  if (z > -12) {
    let c = mixv(C_GRASS, C_GRASS2, smooth(0.35, 0.75, n));
    const ns = nearShore(x);
    c = mixv(c, C_SAND, smooth(ns + 1.4, ns + 0.5, z));
    // 길
    const tz = 0.05 * Math.sin(x * 0.8);
    c = mixv(c, C_TRAIL, smooth(0.55, 0.3, Math.abs(z - tz) + noise2(x * 2, z * 2) * 0.15) * 0.85);
    return c;
  }
  // 먼 쪽: 숲 → 바위 → 눈
  let c = mixv(C_FOREST, C_FOREST2, n);
  const snowLine = 13 + 4 * (fbm(x * 0.08, z * 0.08) - 0.5) * 2;
  c = mixv(c, mixv(C_ROCK, C_ROCK2, n), smooth(5, 10, y));
  c = mixv(c, C_SNOW, smooth(snowLine, snowLine + 2.5, y + ny * 2));
  if (y < LAKE_Y + 0.4 && z < -12) c = mixv(c, C_SAND, smooth(LAKE_Y + 0.4, LAKE_Y + 0.1, y));
  return c;
}

// ───────── 소품 ─────────

function tent(parent, x, z, ry) {
  const g = G(parent, x, 0, z, ry, 1);
  const body = extrudeGeo('tent', [[-0.85, 0], [0.85, 0], [0.06, 1.2], [-0.06, 1.2]], 1.5, 0.04);
  g.add(P(body, '#f08a3c', { fin: 'soft' }));
  // 문(어두운 삼각)
  g.add(P(extrudeGeo('tentdoor', [[-0.42, 0], [0.42, 0], [0, 0.9]], 0.02), '#7a3a2a', { pos: [0, 0.02, 0.79], fin: 'soft', cast: false }));
  g.add(P(extrudeGeo('tentflap', [[0, 0], [0.42, 0], [0.04, 0.88]], 0.02), '#ffb46a', { pos: [0.02, 0.02, 0.82], rot: [0, -0.5, 0], fin: 'soft', cast: false }));
  // 위 덮개 띠, 줄, 말뚝
  g.add(P(roundBoxGeo(0.16, 0.05, 1.62, 0.02, 1), '#d8613c', { pos: [0, 1.22, 0], fin: 'soft' }));
  for (const sz of [-0.85, 0.85]) {
    g.add(P(cylGeo(0.03, 0.03, 0.2, 6), '#8f5a3a', { pos: [0, 1.28, sz * 0.78] }));
    g.add(P(cylGeo(0.01, 0.01, 1.0, 4), '#efe3c8', { pos: [0, 0.75, sz * 1.25], rot: [sz > 0 ? 0.95 : -0.95, 0, 0], cast: false }));
  }
  return g;
}

function campfire(parent, x, z) {
  const g = G(parent, x, 0, z, 0, 1);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU;
    g.add(P(sphereGeo(1, 9, 6), i % 2 ? '#9a94a8' : '#b4aec2', { pos: [Math.cos(a) * 0.36, 0.05, Math.sin(a) * 0.3], scale: [0.1, 0.07, 0.09] }));
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + 0.4;
    g.add(P(cylGeo(0.04, 0.05, 0.5, 7), '#7a4b2a', { pos: [Math.cos(a) * 0.1, 0.17, Math.sin(a) * 0.08], rot: [Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6] }));
  }
  g.add(P(sphereGeo(1, 8, 6), '#ff7a2a', { pos: [0, 0.04, 0], scale: [0.18, 0.04, 0.14], fin: 'glow' }));
  // 불꽃(움직임): 바깥 주황 혀 여러 개 + 안쪽 노란 심
  const fl = G(g, 0, 0.06, 0);
  fl.userData.dynamic = true;
  const lathe = latheGeo([[0, 0], [0.12, 0.05], [0.13, 0.14], [0.08, 0.3], [0.02, 0.45], [0, 0.5]], 12, 'flame');
  for (const [dx, dz, sc, tilt, col] of [[0, 0, [1, 1.1, 1], 0, '#ff6a1c'], [0.08, 0.02, [0.6, 0.8, 0.6], 0.35, '#ff4a14'], [-0.08, 0.01, [0.6, 0.75, 0.6], -0.35, '#ff5a18'], [0.0, 0.07, [0.55, 0.7, 0.55], 0.1, '#ff7a20']]) {
    fl.add(P(lathe, col, { pos: [dx, 0, dz], rot: [0, 0, tilt], scale: sc, fin: 'glow', cast: false }));
  }
  fl.add(P(lathe, '#ffd23a', { pos: [0, 0, 0.06], scale: [0.6, 0.7, 0.6], fin: 'glow', cast: false }));
  fl.add(P(lathe, '#fff2a0', { pos: [0, 0, 0.1], scale: [0.32, 0.4, 0.32], fin: 'glow', cast: false }));
  return { g, fl };
}

function logSeat(parent, x, z, ry, len = 0.9) {
  const g = G(parent, x, 0, z, ry, 1);
  g.add(P(cylGeo(0.13, 0.13, len, 12), '#8f5a3a', { pos: [0, 0.13, 0], rot: [0, 0, Math.PI / 2] }));
  g.add(P(cylGeo(0.1, 0.1, 0.02, 12), '#e0b07a', { pos: [len / 2 + 0.005, 0.13, 0], rot: [0, 0, Math.PI / 2], cast: false }));
  g.add(P(cylGeo(0.1, 0.1, 0.02, 12), '#e0b07a', { pos: [-len / 2 - 0.005, 0.13, 0], rot: [0, 0, Math.PI / 2], cast: false }));
  return g;
}

function canoe(parent, x, z, ry) {
  const g = G(parent, x, LAKE_Y, z, ry, 1);
  g.add(P(sphereGeo(1, 18, 8), '#d8613c', { pos: [0, 0.05, 0], scale: [0.95, 0.2, 0.24], fin: 'soft' }));
  g.add(P(sphereGeo(1, 18, 8), '#6b3a24', { pos: [0, 0.12, 0], scale: [0.85, 0.1, 0.18], fin: 'soft' }));
  g.add(P(roundBoxGeo(0.06, 0.03, 0.42, 0.01, 1), '#e0b07a', { pos: [0.3, 0.2, 0] }));
  g.add(P(roundBoxGeo(0.06, 0.03, 0.42, 0.01, 1), '#e0b07a', { pos: [-0.3, 0.2, 0] }));
  return g;
}

function lantern(parent, x, y, z) {
  const g = G(parent, x, y, z, 0, 1);
  g.add(P(cylGeo(0.07, 0.08, 0.04, 10), '#3c4569', { pos: [0, 0.02, 0] }));
  g.add(P(cylGeo(0.055, 0.055, 0.14, 10), '#ffd98a', { pos: [0, 0.11, 0], fin: 'glow' }));
  g.add(P(coneGeo(0.08, 0.06, 10), '#3c4569', { pos: [0, 0.21, 0] }));
  g.add(P(sphereGeo(0.02, 6, 4), '#3c4569', { pos: [0, 0.25, 0] }));
  return g;
}

const reflMats = new Map();
const reflMat = (k, make) => {
  let m = reflMats.get(k);
  if (!m) reflMats.set(k, (m = make()));
  return m;
};

/** 물에 비친 산: 높이를 뒤집고 감기 방향을 바꾼 사본(법선은 원본 그대로 → 빛도 원본처럼). */
function mirrorOf(mesh, level, tint, material = null) {
  const src = mesh.geometry;
  const g = new THREE.BufferGeometry();
  const p = src.attributes.position.array.slice();
  for (let i = 1; i < p.length; i += 3) p[i] = 2 * level - Math.max(p[i], level) - 0.03;
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  g.setAttribute('normal', src.attributes.normal.clone());
  if (src.attributes.color) g.setAttribute('color', src.attributes.color.clone());
  if (src.attributes.uv) g.setAttribute('uv', src.attributes.uv.clone());
  const n = src.index ? src.index.count : src.attributes.position.count;
  const ni = new Uint32Array(n);
  for (let i = 0; i < n; i += 3) {
    const at = (k) => (src.index ? src.index.array[k] : k);
    ni[i] = at(i);
    ni[i + 1] = at(i + 2);
    ni[i + 2] = at(i + 1);
  }
  g.setIndex(new THREE.BufferAttribute(ni, 1));
  const m = new THREE.Mesh(g, material || reflMat('vc', () => new THREE.MeshStandardMaterial({ vertexColors: true, color: tint, roughness: 1, envMapIntensity: 0.4 })));
  m.userData.ownGeometry = true;
  m.matrixAutoUpdate = false;
  m.updateMatrix();
  return m;
}


/** @param {{w:number,h:number}} size */
export function buildCamp({ w }) {
  const r = rng(37);
  const root = new THREE.Group();
  const props = G(root);
  const hw0 = halfW(w, 0);

  const near = terrain({ H, C: color, zNear: 9, zFar: -44, rows: 110, cols: 104, keep: (x, z, y) => y > LAKE_Y - 0.35 });
  const far = terrain({ H, C: color, zNear: -36, zFar: -330, rows: 90, cols: 110, wide: 1.5, keep: (x, z, y) => y > LAKE_Y - 0.35 });
  // 반영(물 아래 뒤집힌 산) — 물에 가려 보이는 만큼만
  const tint = new THREE.Color('#aaaed8');
  const refl = mirrorOf(far, LAKE_Y, tint);
  // 물: 반투명 남색 + 하늘빛 반사 + 반짝이 결
  const sheen = cachedTex('lakeSheen', 64, 256, (ctx, W, Hh) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, Hh);
    const rr = rng(3);
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(190,200,240,${0.25 + rr() * 0.3})`;
      ctx.fillRect(0, rr() * Hh, W, 1 + rr() * 2);
    }
  }, { repeat: [1, 1] });
  const waterGeo = new THREE.PlaneGeometry(400, 60, 1, 1);
  waterGeo.rotateX(-Math.PI / 2);
  waterGeo.translate(0, LAKE_Y, -24);
  const water = new THREE.Mesh(waterGeo, reflMat('water', () => new THREE.MeshBasicMaterial({ color: '#34468e', transparent: true, opacity: 0.34, depthWrite: false })));
  water.userData.ownGeometry = true;
  water.renderOrder = 2;
  water.receiveShadow = false;

  const leafs = [
    ['#2f6e4a', '#3d8452', '#4f9a5c'],
    ['#2a6446', '#367a4c', '#4a8f56'],
    ['#3a7a4e', '#4a9058', '#5ea862'],
  ];
  // 먼 물가 소나무 숲(따로 구워 물에 비춘다)
  const forest = G(root);
  for (let i = 0; i < 130; i++) {
    const x = (r() * 2 - 1) * 34;
    const z = farShore(x) - 0.8 - r() * 9;
    const y = H(x, z);
    if (y < LAKE_Y + 0.2) continue;
    pine(forest, x, y - 0.05, z, 1.1 + r() * 0.9, r, { leaf: leafs[(r() * 3) | 0], seg: 6, tiers: 3 });
  }
  // 오른쪽 곶(호수로 튀어나온 숲)
  for (let i = 0; i < 16; i++) {
    const x = halfW(w, -16) - 1 + r() * 4;
    const z = -12 - r() * 10;
    pine(props, x, 0, z, 1.0 + r() * 0.8, r, { leaf: leafs[(r() * 3) | 0], seg: 7 });
  }
  // 양옆 큰 소나무(액자)
  const eL = -halfW(w, -4) - 0.2;
  const eR = halfW(w, -5) + 0.5;
  for (const [x, z, s] of [[eL, -4, 2.3], [eL + 1.0, -6.2, 1.7], [eL + 0.2, -8.5, 2.0], [eR, -5, 2.2], [eR - 1.1, -3.2, 1.4], [eR - 0.4, -8, 1.9]]) {
    pine(props, x, H(x, z), z, s, r, { leaf: leafs[(r() * 3) | 0], seg: 12, tiers: 4 });
  }
  for (const [x, z] of [[eL + 1.8, -2.4], [eR - 1.9, -2.2]]) bush(props, x, 0, z, 0.9, r, { leaf: ['#3f7f3a', '#4f9a44', '#68b04c'] });

  // 캠프: 텐트, 모닥불, 통나무, 등불, 장작, 카누
  tent(props, -1.75, -3.6, 0.25);
  const fire = campfire(props, 1.35, -2.55);
  logSeat(props, 0.45, -2.75, 0.5);
  logSeat(props, 2.25, -2.95, -0.6);
  logSeat(props, 1.4, -3.55, 0.05, 1.1);
  lantern(props, -0.75, 0, -2.7);
  for (let i = 0; i < 5; i++) props.add(P(cylGeo(0.07, 0.07, 0.6, 8), '#8f5a3a', { pos: [-3.0 + (i % 3) * 0.15, 0.07 + Math.floor(i / 3) * 0.13, -3.2], rot: [Math.PI / 2, 0, 0.1] }));
  canoe(props, -0.6, nearShore(-0.6) - 0.5, 0.2);
  for (const [x, z, s] of [[-2.7, -2.1, 0.9], [3.1, -4.3, 1.3], [2.4, -6.2, 0.9], [-3.4, -5.8, 1.1], [0.2, -6.0, 0.7]]) rock(props, x, H(x, z), z, s, r, '#a59fbc');
  // 물가 갈대·꽃
  for (let i = 0; i < 18; i++) {
    const x = (r() * 2 - 1) * (hw0 + 2);
    const z = nearShore(x) + 0.3 + r() * 0.6;
    tuft(props, x, H(x, z), z, 1.6 + r(), r, '#6a8f3e');
  }
  for (let i = 0; i < 14; i++) {
    const x = (r() * 2 - 1) * (hw0 + 1);
    const z = -1.2 - r() * 4;
    if (Math.hypot(x - 1.35, z + 2.6) < 1.2 || Math.hypot(x + 1.75, z + 3.6) < 1.2) continue;
    flowers(props, x, H(x, z), z, 1.2, r, { colors: ['#ffffff', '#ffd23f', '#ff9a6a'] });
  }
  for (let i = 0; i < 22; i++) {
    const x = (r() * 2 - 1) * (hw0 + 0.6);
    const z = 0.95 + r() * 2.3;
    if (r() < 0.5) flowers(props, x, 0, z, 0.9 + r() * 0.4, r, { n: 4, colors: ['#ffffff', '#ffd23f', '#b08aff'] });
    else tuft(props, x, 0, z, 1.0, r, '#6a9a3e');
  }

  bake(props);
  bakeStatic(fire.fl);
  bake(forest);
  for (const m of [...forest.children]) {
    if (!m.isMesh) continue;
    const pm = reflMat('pal', () => {
      const c = m.material.clone();
      c.color.set('#aab6d8');
      return c;
    });
    root.add(mirrorOf(m, LAKE_Y, null, pm));
  }
  root.add(near, far, refl, water);

  // 해 아래 물비늘(금빛 결)
  const SUNX = 12;
  const glitTex = cachedTex('glitter', 128, 256, (ctx, W, Hh) => {
    const rr = rng(9);
    for (let i = 0; i < 140; i++) {
      const y = rr() * Hh;
      const cx = W / 2 + (rr() - 0.5) * W * 0.8 * (0.3 + (y / Hh) * 0.7);
      const l = (4 + rr() * 18) * (0.4 + (y / Hh) * 0.8);
      ctx.fillStyle = `rgba(255,${200 + ((rr() * 50) | 0)},140,${0.4 + rr() * 0.5})`;
      ctx.fillRect(cx - l / 2, y, l, 1 + rr() * 2);
    }
  }, { mip: true });
  const gl = new THREE.BufferGeometry();
  const zA = -38;
  const zB = -7.5;
  const xc = (z) => (SUNX * (CAMZ - z)) / 254;
  const wd = (z) => 0.6 + (z - zA) * 0.06;
  gl.setAttribute('position', new THREE.Float32BufferAttribute([xc(zA) - wd(zA), LAKE_Y + 0.01, zA, xc(zA) + wd(zA), LAKE_Y + 0.01, zA, xc(zB) - wd(zB), LAKE_Y + 0.01, zB, xc(zB) + wd(zB), LAKE_Y + 0.01, zB], 3));
  gl.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2));
  gl.setIndex([0, 2, 1, 1, 2, 3]);
  const glit = new THREE.Mesh(gl, new THREE.MeshBasicMaterial({ map: glitTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8 }));
  glit.userData.ownGeometry = true;
  glit.renderOrder = 3;
  root.add(glit);

  // 불빛
  const glow = glowSprite('#ff9a3a', 2.4, 0.7);
  glow.position.set(1.35, 0.45, -2.45);
  root.add(glow);
  const lglow = glowSprite('#ffd98a', 0.7, 0.6);
  lglow.position.set(-0.75, 0.12, -2.65);
  root.add(lglow);
  // 불티
  const sparks = glowPoints([[1.3, 0.8, -2.5, '#ffb050'], [1.45, 1.1, -2.6, '#ffd070'], [1.2, 1.35, -2.5, '#ff9040'], [1.5, 1.6, -2.55, '#ffc060']], { size: 0.12, atten: true });
  root.add(sparks);
  // 해(산 오른쪽 너머로 지는 중)
  const sun = glowSprite('#ffe0a0', 40, 0.75);
  sun.position.set(SUNX, 11, -240);
  const sunCore = glowSprite('#fff6d8', 9, 0.9);
  sunCore.position.set(SUNX, 10.5, -239);
  root.add(sunCore);
  root.add(sun);

  // 노을 구름
  const cm = cloudMat('#ffe6c8', '#9a7cc0', { light: [0.8, 0.3, -0.3], mid: '#f3b6a8' });
  const cmFar = cloudMat('#ffd9b4', '#c8a0c0', { fog: true, light: [0.8, 0.3, -0.3] });
  const sky = G(root);
  const drift = cloudLayer(sky, 37, [
    { x: -28, y: 30, z: -130, w: 26, h: 8, n: 18, seg: 12, speed: 0.1, span: 75 },
    { x: 24, y: 44, z: -150, w: 30, h: 8, n: 18, seg: 12, speed: 0.08, span: 85 },
  ], cm);
  const bank = cloudLayer(sky, 41, [
    { x: -60, y: 18, z: -280, w: 60, h: 9, n: 14, seg: 10, speed: 0.03, span: 130 },
    { x: 40, y: 22, z: -300, w: 70, h: 8, n: 14, seg: 10, speed: 0.03, span: 130 },
  ], cmFar);

  const env = {
    sky: { top: '#3c4fb8', mid: '#a58bd0', horizon: '#ffc58e', sunDir: [0.047, 0.03, -1], sunColor: '#ffd590', sunStrength: 0.9, sunSize: 0.0015 },
    fog: { color: '#f4c3a0', near: 30, far: 330 },
    sun: { color: '#ffcf96', intensity: 2.5, dir: [0.8, 0.8, 0.4] },
    hemi: { sky: '#a7a6ea', ground: '#8fa060', intensity: 0.95 },
    exposure: 1.0,
  };

  return {
    group: root,
    env,
    update(t) {
      const k = 1 + 0.12 * Math.sin(t * 13) + 0.08 * Math.sin(t * 21.7);
      fire.fl.scale.set(1 + 0.05 * Math.sin(t * 9), k, 1 + 0.05 * Math.cos(t * 11));
      fire.fl.rotation.y = t * 0.8;
      glow.material.opacity = 0.45 + 0.12 * Math.sin(t * 12.3) + 0.06 * Math.sin(t * 27);
      sparks.position.y = (t * 0.6) % 1.0;
      sparks.material.opacity = 1 - ((t * 0.6) % 1.0);
      drift(t);
      bank(t);
    },
  };
}
