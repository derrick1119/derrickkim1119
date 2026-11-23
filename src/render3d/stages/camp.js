// 3. 캠핑장(해 질 녘 황금빛): 눈 덮인 겹겹 산, 산을 비추는 호수, 두 톤 소나무 숲, 주황 텐트(안에 등불), 모닥불(일렁임·블룸),
//    텐트와 소나무 사이에 걸린 전구 줄, 카누와 작은 선착장, 나무 표지판, 통나무, 버섯, 바위.
//    값 구조: 앞 풀밭과 양옆 소나무는 짙은 청록 그늘, 캠프 마당은 노을빛에 따뜻하게, 산은 분홍빛 볕과 보랏빛 그늘.
import {
  CAM_Z, THREE, P, G, bake, bakeV, terrain, cloudLayer, cloudMat, pine, bush, rock, mushroom, halfW, smooth, fbm, noise2, rgb,
  mixv, rng, TAU, cachedTex, glowPoints, extrudeGeo, sphereGeo, roundBoxGeo, cylGeo, coneGeo, latheGeo, torusGeo, boxGeo,
  lanePlants, flowerGeo, groundDecal, grassStrokes, speckle, glowS, sharedMat,
} from './common.js';

const LAKE_Y = -0.14;
const nearShore = (x) => -6.6 - 0.7 * Math.sin(x * 0.45 + 0.8) - 0.4 * Math.sin(x * 1.1);
const farShore = (x) => -40 + 2.5 * Math.sin(x * 0.12 + 0.5) + 1.5 * Math.sin(x * 0.31);

// 산: 가운데는 낮고(기체 자리), 양옆이 높다
const PEAKS = [
  [-38, -150, 30, 260, 500], [-4, -185, 17, 260, 600], [32, -150, 31, 300, 500], [60, -170, 26, 300, 500], [-66, -165, 24, 300, 500],
  [-20, -95, 11, 110, 160], [6, -105, 7.5, 120, 140], [27, -92, 13, 120, 180], [-42, -98, 13, 160, 200],
];
function mountH(x, z) {
  let h = 0;
  for (const [px, pz, ph, sx, sz] of PEAKS) {
    const e = Math.exp(-((x - px) ** 2) / sx - ((z - pz) ** 2) / sz);
    h = Math.max(h, ph * e) + ph * e * 0.08;
  }
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
    const k = Math.min(ns - z, z - fs);
    h = LAKE_Y - 0.05 - smooth(0, 1.2, k) * 3;
  } else {
    const k = fs - z;
    h = LAKE_Y + smooth(0, 1.5, k) * 0.4 + smooth(1, 14, k) * (2.2 + 1.6 * Math.sin(x * 0.17 + 0.3) + 1.2 * fbm(x * 0.1, z * 0.1));
    h += mountH(x, z) * smooth(-48, -75, z);
  }
  return h;
}

const C_GRASS = rgb('#8fc44a');
const C_GRASS2 = rgb('#c9cf5a');
const C_FRONT = rgb('#3d6e3e');
const C_SAND = rgb('#efcf98');
const C_TRAIL = rgb('#c8b468');
const C_FOREST = rgb('#2f5e4a');
const C_FOREST2 = rgb('#4f7a54');
const C_ROCK = rgb('#8a7fb8');
const C_ROCK_LIT = rgb('#e0a0a0');
const C_SNOW = rgb('#fff4f4');

const tz = (x) => 0.05 * Math.sin(x * 0.8);

function color(x, y, z, ny) {
  const n = fbm(x * 0.3, z * 0.3);
  if (z > -12) {
    let c = mixv(C_GRASS, C_GRASS2, smooth(0.35, 0.75, n));
    // 캠프 마당은 노을빛이 고이고, 앞은 짙게
    c = mixv(c, rgb('#d8c860'), Math.exp(-((x - 0.2) ** 2) / 10 - ((z + 3) ** 2) / 3) * 0.3);
    c = mixv(c, C_FRONT, smooth(0.8, 6, z) * 0.6 + smooth(0.6, 1, Math.abs(x) / halfW(390, z)) * 0.2);
    const ns = nearShore(x);
    c = mixv(c, C_SAND, smooth(ns + 1.4, ns + 0.5, z));
    c = mixv(c, C_TRAIL, smooth(0.55, 0.3, Math.abs(z - tz(x)) + noise2(x * 2, z * 2) * 0.15) * 0.85);
    return c;
  }
  // 먼 쪽: 숲 → 바위(해 쪽은 분홍 볕, 반대쪽은 보라 그늘) → 눈
  let c = mixv(C_FOREST, C_FOREST2, n);
  const snowLine = 13 + 4 * (fbm(x * 0.08, z * 0.08) - 0.5) * 2;
  c = mixv(c, mixv(C_ROCK, C_ROCK_LIT, smooth(-0.2, 0.6, n - 0.5 + (x > 0 ? 0.25 : -0.1))), smooth(5, 10, y));
  c = mixv(c, C_SNOW, smooth(snowLine, snowLine + 2.5, y + ny * 2));
  if (y < LAKE_Y + 0.4 && z < -12) c = mixv(c, C_SAND, smooth(LAKE_Y + 0.4, LAKE_Y + 0.1, y));
  return c;
}

// 통로 흙길과 풀 결
function drawDecal(ctx, W, Hh, X, Z, r) {
  const u = W / 13.2;
  grassStrokes(ctx, 0, 0, W, Hh, 2200, ['rgba(30,70,45,0.22)', 'rgba(255,235,140,0.18)', 'rgba(40,90,50,0.16)'], r, [3, 7]);
  const top = [];
  const bot = [];
  for (let x = -6.6; x <= 6.61; x += 0.1) {
    const wob = 0.05 * Math.sin(x * 2.7) + 0.03 * Math.sin(x * 6.1 + 2);
    top.push([X(x), Z(tz(x) - 0.42 - wob)]);
    bot.push([X(x), Z(tz(x) + 0.42 + wob)]);
  }
  ctx.save();
  ctx.beginPath();
  top.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  for (let i = bot.length - 1; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]);
  ctx.closePath();
  ctx.strokeStyle = 'rgba(40,60,40,0.4)';
  ctx.lineWidth = u * 0.14;
  ctx.stroke();
  ctx.fillStyle = '#b09848';
  ctx.fill();
  ctx.clip();
  ctx.strokeStyle = '#d4bc6c';
  ctx.lineWidth = u * 0.45;
  ctx.beginPath();
  for (let x = -6.6; x <= 6.61; x += 0.1) (x === -6.6 ? ctx.moveTo : ctx.lineTo).call(ctx, X(x), Z(tz(x)));
  ctx.stroke();
  speckle(ctx, 0, 0, W, Hh, 1400, ['rgba(120,100,50,0.35)', 'rgba(255,245,200,0.45)'], r, [1, 3]);
  ctx.restore();
  // 모닥불 둘레 그을린 흙
  const fx = X(1.35);
  const fz = Z(-2.55);
  const gr = ctx.createRadialGradient(fx, fz, 0, fx, fz, u * 0.9);
  gr.addColorStop(0, 'rgba(90,60,50,0.55)');
  gr.addColorStop(0.6, 'rgba(150,110,70,0.35)');
  gr.addColorStop(1, 'rgba(150,110,70,0)');
  ctx.fillStyle = gr;
  ctx.beginPath();
  ctx.ellipse(fx, fz, u * 0.95, u * 0.8, 0, 0, TAU);
  ctx.fill();
  // 텐트 앞 다져진 흙
  const tx = X(-1.75);
  const tzz = Z(-2.75);
  const g2 = ctx.createRadialGradient(tx, tzz, 0, tx, tzz, u * 0.8);
  g2.addColorStop(0, 'rgba(200,150,100,0.5)');
  g2.addColorStop(1, 'rgba(200,150,100,0)');
  ctx.fillStyle = g2;
  ctx.fillRect(tx - u, tzz - u, u * 2, u * 2);
  // 멀어지면 흐려진다(물가 앞에서 끝)
  ctx.globalCompositeOperation = 'destination-out';
  const fade = ctx.createLinearGradient(0, Z(-4.2), 0, Z(-6));
  fade.addColorStop(0, 'rgba(0,0,0,0)');
  fade.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.fillStyle = fade;
  ctx.fillRect(0, Z(-4.2), W, Hh - Z(-4.2));
  ctx.globalCompositeOperation = 'source-over';
}

// ───────── 소품 ─────────

function tent(parent, x, z, ry) {
  const g = G(parent, x, 0, z, ry, 1.05);
  const body = extrudeGeo('tent', [[-0.85, 0], [0.85, 0], [0.06, 1.2], [-0.06, 1.2]], 1.5, 0.04);
  g.add(P(body, '', { fin: 'soft', tt: ['#c0502c', '#ffa24a'] }));
  // 문: 안에서 등불이 비치는 따뜻한 빛(블룸) + 젖힌 덮개
  g.add(P(extrudeGeo('tentdoor', [[-0.42, 0], [0.42, 0], [0, 0.9]], 0.02), '#ffb050', { pos: [0, 0.02, 0.79], fin: 'lit', cast: false }));
  g.add(P(extrudeGeo('tentflap', [[0, 0], [0.42, 0], [0.04, 0.88]], 0.03), '#ffc27a', { pos: [0.02, 0.02, 0.83], rot: [0, -0.5, 0], fin: 'soft', cast: false }));
  g.add(P(roundBoxGeo(0.18, 0.07, 1.64, 0.03, 1), '#a8402a', { pos: [0, 1.22, 0], fin: 'soft' }));
  for (const sz of [-0.85, 0.85]) {
    g.add(P(cylGeo(0.035, 0.035, 0.24, 6), '#7a4b2a', { pos: [0, 1.3, sz * 0.78] }));
    g.add(P(cylGeo(0.012, 0.012, 1.0, 4), '#efe3c8', { pos: [0, 0.75, sz * 1.25], rot: [sz > 0 ? 0.95 : -0.95, 0, 0], cast: false }));
  }
  // 바닥 깔개
  g.add(P(roundBoxGeo(0.9, 0.03, 0.5, 0.015, 1), '#5a8fd0', { pos: [0, 0.015, 1.05], fin: 'soft', cast: false }));
  return g;
}

function campfire(parent, x, z) {
  const g = G(parent, x, 0, z, 0, 1.1);
  const rr = rng(91);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU;
    rock(g, Math.cos(a) * 0.38, 0, Math.sin(a) * 0.32, 0.36, rr, i % 2 ? '#9a94a8' : '#b4aec2');
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + 0.4;
    g.add(P(cylGeo(0.05, 0.06, 0.52, 7), '', { pos: [Math.cos(a) * 0.1, 0.17, Math.sin(a) * 0.08], rot: [Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6], tt: ['#4a2a1a', '#9a6438'] }));
  }
  g.add(P(sphereGeo(1, 10, 6), '#ff8a2a', { pos: [0, 0.04, 0], scale: [0.2, 0.05, 0.16], fin: 'neon' }));
  // 불꽃(움직임): 바깥 주황 혀 여러 개 + 안쪽 노란 심 — 채도 높은 빛이라 neon(블룸)
  const fl = G(g, 0, 0.06, 0);
  fl.userData.dynamic = true;
  const lathe = latheGeo([[0, 0], [0.13, 0.05], [0.14, 0.15], [0.09, 0.32], [0.02, 0.48], [0, 0.54]], 12, 'flame2');
  for (const [dx, dz, sc, tilt, col] of [[0, 0, [1, 1.1, 1], 0, '#ff7a2a'], [0.09, 0.02, [0.6, 0.8, 0.6], 0.35, '#ff6a22'], [-0.09, 0.01, [0.6, 0.75, 0.6], -0.35, '#ff7026'], [0.0, 0.07, [0.55, 0.7, 0.55], 0.1, '#ff8a2a']]) {
    fl.add(P(lathe, col, { pos: [dx, 0, dz], rot: [0, 0, tilt], scale: sc, fin: 'neon', cast: false }));
  }
  fl.add(P(lathe, '#ffc23a', { pos: [0, 0, 0.06], scale: [0.6, 0.7, 0.6], fin: 'glow', cast: false }));
  fl.add(P(lathe, '#fff0a0', { pos: [0, 0, 0.1], scale: [0.32, 0.4, 0.32], fin: 'glow', cast: false }));
  return { g, fl };
}

function logSeat(parent, x, z, ry, len = 0.9) {
  const g = G(parent, x, 0, z, ry, 1);
  g.add(P(cylGeo(0.15, 0.15, len, 12), '', { pos: [0, 0.15, 0], rot: [0, 0, Math.PI / 2], tt: ['#5a3420', '#a8703e'] }));
  g.add(P(cylGeo(0.12, 0.12, 0.02, 12), '#ecc08a', { pos: [len / 2 + 0.005, 0.15, 0], rot: [0, 0, Math.PI / 2], cast: false }));
  g.add(P(cylGeo(0.12, 0.12, 0.02, 12), '#ecc08a', { pos: [-len / 2 - 0.005, 0.15, 0], rot: [0, 0, Math.PI / 2], cast: false }));
  g.add(P(torusGeo(0.06, 0.012, 4, 12), '#c8925a', { pos: [len / 2 + 0.016, 0.15, 0], rot: [0, Math.PI / 2, 0], cast: false }));
  return g;
}

function canoe(parent, x, z, ry) {
  const g = G(parent, x, LAKE_Y, z, ry, 1.1);
  g.add(P(sphereGeo(1, 18, 8), '', { pos: [0, 0.05, 0], scale: [0.95, 0.2, 0.24], fin: 'soft', tt: ['#a8402a', '#f07a46'] }));
  g.add(P(sphereGeo(1, 18, 8), '#5a3020', { pos: [0, 0.12, 0], scale: [0.85, 0.1, 0.18], fin: 'soft' }));
  g.add(P(roundBoxGeo(0.07, 0.035, 0.44, 0.015, 1), '#e0b07a', { pos: [0.3, 0.2, 0] }));
  g.add(P(roundBoxGeo(0.07, 0.035, 0.44, 0.015, 1), '#e0b07a', { pos: [-0.3, 0.2, 0] }));
  g.add(P(roundBoxGeo(0.9, 0.03, 0.06, 0.012, 1), '#c08a56', { pos: [0.1, 0.24, 0.12], rot: [0, 0.3, 0.1] }));
  return g;
}

function lantern(parent, x, y, z, s = 1) {
  const g = G(parent, x, y, z, 0, s);
  g.add(P(cylGeo(0.075, 0.085, 0.045, 10), '#3c4569', { pos: [0, 0.022, 0] }));
  g.add(P(cylGeo(0.06, 0.06, 0.15, 10), '#ffd98a', { pos: [0, 0.12, 0], fin: 'glow' }));
  for (let i = 0; i < 4; i++) g.add(P(boxGeo(0.015, 0.15, 0.015), '#3c4569', { pos: [Math.cos(i * 1.57) * 0.062, 0.12, Math.sin(i * 1.57) * 0.062] }));
  g.add(P(coneGeo(0.09, 0.07, 10), '#3c4569', { pos: [0, 0.23, 0] }));
  g.add(P(torusGeo(0.03, 0.008, 4, 10), '#3c4569', { pos: [0, 0.28, 0] }));
  return g;
}

/** 나무 표지판(화살표 판 두 장). */
function signpost(parent, x, z, ry) {
  const g = G(parent, x, 0, z, ry, 1);
  const wood = ['#6a4026', '#c08a56'];
  g.add(P(cylGeo(0.05, 0.06, 1.05, 8), '', { pos: [0, 0.52, 0], tt: wood }));
  const board = extrudeGeo('signArrow', [[-0.36, -0.09], [0.26, -0.09], [0.38, 0], [0.26, 0.09], [-0.36, 0.09]], 0.05, 0.015);
  g.add(P(board, '', { pos: [0.12, 0.88, 0.04], rot: [0, 0, 0.06], fin: 'soft', tt: ['#a0683c', '#f0c088'] }));
  g.add(P(board, '', { pos: [-0.1, 0.66, 0.04], rot: [0, Math.PI, -0.05], fin: 'soft', tt: ['#a0683c', '#f0c088'] }));
  // 판 위 글씨 자리(짙은 띠)
  g.add(P(roundBoxGeo(0.3, 0.035, 0.01, 0.01, 1), '#6a4026', { pos: [0.08, 0.88, 0.075], cast: false }));
  g.add(P(roundBoxGeo(0.3, 0.035, 0.01, 0.01, 1), '#6a4026', { pos: [-0.08, 0.66, 0.075], cast: false }));
  return g;
}

/** 작은 선착장(물가에서 호수로). */
function jetty(parent, x, z, ry) {
  const g = G(parent, x, 0, z, ry, 1);
  for (let i = 0; i < 9; i++) g.add(P(roundBoxGeo(0.62, 0.06, 0.17, 0.02, 1), '', { pos: [0, 0.02, -i * 0.19], fin: 'soft', tt: i % 2 ? ['#7a5034', '#d0a070'] : ['#6e4830', '#c4945e'] }));
  for (const [px, pz] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, -1.5], [0.3, -1.5]]) g.add(P(cylGeo(0.05, 0.05, 0.5, 7), '#5a3a24', { pos: [px, -0.12, pz] }));
  return g;
}

const reflMat = (k, make) => sharedMat(`camp:${k}`, make);

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
  const at = (k) => (src.index ? src.index.array[k] : k);
  const sy = src.attributes.position.array;
  const ni = [];
  for (let i = 0; i < n; i += 3) {
    const a = at(i);
    const b = at(i + 1);
    const c = at(i + 2);
    if (Math.max(sy[a * 3 + 1], sy[b * 3 + 1], sy[c * 3 + 1]) < level + 0.05) continue;
    ni.push(a, c, b);
  }
  g.setIndex(ni);
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

  const near = terrain({ H, C: color, zNear: 9, zFar: -44, rows: 100, cols: 100, keep: (x, z, y) => y > LAKE_Y - 0.35 });
  const far = terrain({ H, C: color, zNear: -36, zFar: -330, rows: 84, cols: 104, wide: 1.5, keep: (x, z, y) => y > LAKE_Y - 0.35 });
  const decal = groundDecal({ key: 'camp', draw: drawDecal, zFar: -6.4, H: (x, z) => Math.max(0, H(x, z)) });
  // 반영(물 아래 뒤집힌 산) — 물에 가려 보이는 만큼만
  const refl = mirrorOf(far, LAKE_Y, new THREE.Color('#b0a8d8'));
  // 물: 반투명 남보라 + 잔물결 결
  const waterGeo = new THREE.PlaneGeometry(400, 60, 1, 1);
  waterGeo.rotateX(-Math.PI / 2);
  waterGeo.translate(0, LAKE_Y, -24);
  const water = new THREE.Mesh(waterGeo, reflMat('water', () => new THREE.MeshBasicMaterial({ color: '#2c3478', transparent: true, opacity: 0.42, depthWrite: false })));
  water.userData.ownGeometry = true;
  water.renderOrder = 2;
  const rip = cachedTex('lakeRipple', 256, 512, (ctx, W, Hh) => {
    const rr = rng(12);
    ctx.clearRect(0, 0, W, Hh);
    for (let i = 0; i < 160; i++) {
      const y = rr() * Hh;
      const l = 10 + rr() * 60;
      ctx.fillStyle = `rgba(230,215,255,${0.2 + rr() * 0.35})`;
      ctx.fillRect(rr() * W, y, l, 1.5);
    }
  }, { repeat: [24, 6] });
  const ripples = new THREE.Mesh(waterGeo, reflMat('ripple', () => new THREE.MeshBasicMaterial({ map: rip, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false })));
  ripples.position.y = 0.005;
  ripples.renderOrder = 3;

  const sets = [
    ['#163e44', '#4f9662'],
    ['#143840', '#43885c'],
    ['#1c4a4a', '#5aa266'],
  ];
  // 먼 물가 소나무 숲(따로 구워 물에 비춘다)
  const forest = G(root);
  for (let i = 0; i < 120; i++) {
    const x = (r() * 2 - 1) * 34;
    const z = farShore(x) - 0.8 - r() * 9;
    const y = H(x, z);
    if (y < LAKE_Y + 0.2) continue;
    pine(forest, x, y - 0.05, z, 1.1 + r() * 0.9, r, { leaf: sets[(r() * 3) | 0], seg: 6, tiers: 3 });
  }
  // 오른쪽 곶(호수로 튀어나온 숲)
  for (let i = 0; i < 16; i++) {
    const x = halfW(w, -16) - 1 + r() * 4;
    const z = -12 - r() * 10;
    pine(props, x, 0, z, 1.0 + r() * 0.8, r, { leaf: sets[(r() * 3) | 0], seg: 7 });
  }
  // 양옆 큰 소나무(액자, 짙은 그늘)
  const eL = -halfW(w, -4) - 0.2;
  const eR = halfW(w, -5) + 0.5;
  const dark = ['#123634', '#4f8250'];
  for (const [x, z, s] of [[eL, -4, 2.3], [eL + 1.0, -6.2, 1.7], [eL + 0.2, -8.5, 2.0], [eR, -5, 2.2], [eR - 1.1, -3.2, 1.4], [eR - 0.4, -8, 1.9]]) {
    pine(props, x, H(x, z), z, s, r, { leaf: z > -5.5 ? dark : sets[(r() * 3) | 0], seg: 12, tiers: 4 });
  }
  for (const [x, z] of [[eL + 1.8, -2.4], [eR - 1.9, -2.2]]) bush(props, x, 0, z, 0.95, r, { leaf: ['#244a3a', '#7aa050'] });

  // 캠프: 텐트, 모닥불, 통나무, 등불, 장작, 카누, 선착장, 표지판
  tent(props, -1.75, -3.6, 0.25);
  const fire = campfire(props, 1.35, -2.55);
  logSeat(props, 0.45, -2.75, 0.5);
  logSeat(props, 2.25, -2.95, -0.6);
  logSeat(props, 1.4, -3.6, 0.05, 1.1);
  lantern(props, -0.72, 0, -2.75, 1.2);
  for (let i = 0; i < 6; i++) props.add(P(cylGeo(0.075, 0.075, 0.62, 8), '', { pos: [-3.0 + (i % 3) * 0.16, 0.075 + Math.floor(i / 3) * 0.14, -3.2], rot: [Math.PI / 2, 0, 0.1], tt: ['#5a3420', '#b07a44'] }));
  canoe(props, -0.6, nearShore(-0.6) - 0.5, 0.2);
  jetty(props, 2.6, nearShore(2.6) + 0.35, -0.15);
  signpost(props, -3.2, -1.5, 0.3);
  for (const [x, z, s] of [[-2.7, -2.1, 0.9], [3.1, -4.3, 1.3], [2.4, -6.2, 0.9], [-3.4, -5.8, 1.1], [0.2, -6.0, 0.7]]) rock(props, x, H(x, z), z, s, r, '#a59fbc');
  for (const [x, z, s, c] of [[-2.4, -1.7, 1.0, '#e2483c'], [-2.15, -1.9, 0.7, '#e2483c'], [3.4, -2.0, 0.9, '#f08a3c'], [eR - 1.5, -4.0, 1.2, '#e2483c']]) mushroom(props, x, H(x, z), z, s, r, { cap: c });
  // 전구 줄(텐트 뒤 기둥 ↔ 오른쪽 소나무 앞 기둥): 늘어진 줄 + 빛나는 전구(블룸)
  const poleA = [-2.9, -4.4];
  const poleB = [3.4, -5.2];
  for (const [px, pz] of [poleA, poleB]) props.add(P(cylGeo(0.045, 0.06, 1.9, 7), '', { pos: [px, 0.95, pz], tt: ['#4a2c1c', '#9a6a40'] }));
  const bulbs = [];
  const nB = 14;
  const wire = [];
  for (let i = 0; i <= nB; i++) {
    const t = i / nB;
    const x = poleA[0] + (poleB[0] - poleA[0]) * t;
    const z = poleA[1] + (poleB[1] - poleA[1]) * t;
    const y = 1.85 - Math.sin(t * Math.PI) * 0.55;
    wire.push([x, y, z]);
    if (i > 0 && i < nB) bulbs.push([x, y - 0.07, z, ['#ffd27a', '#ff9a6a', '#fff0a0', '#9fe8ff', '#ff8fb0'][i % 5]]);
  }
  for (let i = 0; i < wire.length - 1; i++) {
    const [ax, ay, az] = wire[i];
    const [bx, by, bz] = wire[i + 1];
    const len = Math.hypot(bx - ax, by - ay, bz - az);
    const m = P(cylGeo(0.008, 0.008, 1, 4), '#2a2030', { pos: [(ax + bx) / 2, (ay + by) / 2, (az + bz) / 2], cast: false, ao: false });
    m.scale.y = len;
    m.lookAt(bx, by, bz);
    m.rotateX(Math.PI / 2);
    props.add(m);
  }
  for (const [x, y, z, c] of bulbs) props.add(P(sphereGeo(1, 8, 6), c, { pos: [x, y, z], scale: [0.045, 0.06, 0.045], fin: 'glow', cast: false }));

  // 풀·꽃(인스턴스)
  const avoid = (x, z) => Math.hypot(x - 1.35, z + 2.6) < 1.0 || Math.hypot(x + 1.75, (z + 3.6) * 1.3) < 1.3 || (Math.abs(z - tz(x)) < 0.38 && Math.abs(z) < 0.95) || z < nearShore(x) + 0.4;
  lanePlants(props, {
    w,
    seed: 38,
    avoid,
    back: [-6.2, -0.95],
    grass: ['#4f8a3a', '#6a9a3e', '#3f7a3a'],
    flowers: [
      [flowerGeo('#ffffff', '#ffc83a', '#3f7a3a'), ['#ffffff', '#ffe8d0']],
      [flowerGeo('#ffd23f', '#e8702a', '#3f7a3a'), ['#ffffff']],
      [flowerGeo('#c8a0ff', '#fff2a0', '#3f7a3a'), ['#ffffff']],
    ],
    pebble: ['#b4aec2', '#9a94a8'],
    clover: ['#2f5e3a', '#3c6e40'],
  });

  const light = [0.75, 1, 0.35]; // 해가 오른쪽 뒤에서 지므로 두 톤의 볕도 오른쪽
  bake(props, { H, light });
  bakeV(fire.fl, { ao: 0 });
  bake(forest, { H, light });
  for (const m of [...forest.children]) {
    if (!m.isMesh) continue;
    const pm = reflMat('pal', () => {
      const c = m.material.clone();
      c.color.set('#aab0d8');
      return c;
    });
    root.add(mirrorOf(m, LAKE_Y, null, pm));
  }
  root.add(near, far, refl, water, ripples, decal);

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
  const xc = (z) => (SUNX * (CAM_Z - z)) / 254;
  const wd = (z) => 0.6 + (z - zA) * 0.06;
  gl.setAttribute('position', new THREE.Float32BufferAttribute([xc(zA) - wd(zA), LAKE_Y + 0.01, zA, xc(zA) + wd(zA), LAKE_Y + 0.01, zA, xc(zB) - wd(zB), LAKE_Y + 0.01, zB, xc(zB) + wd(zB), LAKE_Y + 0.01, zB], 3));
  gl.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2));
  gl.setIndex([0, 2, 1, 1, 2, 3]);
  const glit = new THREE.Mesh(gl, reflMat('glit', () => new THREE.MeshBasicMaterial({ map: glitTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.85 })));
  glit.userData.ownGeometry = true;
  glit.renderOrder = 3;
  root.add(glit);

  // 불빛(블룸): 모닥불, 등불, 텐트 안, 전구 줄
  const glow = glowS('camp:fire', '#ff9a3a', 2.6, 0.7, 1.6);
  glow.position.set(1.35, 0.5, -2.45);
  const lglow = glowS('camp:lantern', '#ffd98a', 0.8, 0.7, 1.6);
  lglow.position.set(-0.72, 0.16, -2.6);
  const tglow = glowS('camp:tent', '#ffb060', 1.3, 0.35, 1.0);
  tglow.position.set(-1.62, 0.4, -2.7);
  root.add(glow, lglow, tglow);
  root.add(glowPoints(bulbs.map(([x, y, z, c]) => [x, y, z + 0.05, c]), { size: 0.42, atten: true, opacity: 0.8, boost: 1.4 }));
  // 불티
  const sparks = glowPoints([[1.3, 0.8, -2.5, '#ffb050'], [1.45, 1.1, -2.6, '#ffd070'], [1.2, 1.35, -2.5, '#ff9040'], [1.5, 1.6, -2.55, '#ffc060']], { size: 0.12, atten: true, boost: 2 });
  root.add(sparks);
  // 해(산 오른쪽 너머로 지는 중)
  const sun = glowS('camp:sun', '#ffd890', 40, 0.75);
  sun.position.set(SUNX, 11, -240);
  const sunCore = glowS('camp:sunCore', '#fff6d8', 9, 0.95, 1.6);
  sunCore.position.set(SUNX, 10.5, -239);
  root.add(sunCore, sun);

  // 노을 구름
  const cm = cloudMat('#ffe2c4', '#9478c0', { light: [0.8, 0.3, -0.3], mid: '#f4b0a8' });
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
    sky: { top: '#3848b4', mid: '#a888d2', horizon: '#ffc28a', sunDir: [0.047, 0.03, -1], sunColor: '#ffd590', sunStrength: 0.9, sunSize: 0.0015 },
    fog: { color: '#f4c09e', near: 30, far: 330 },
    sun: { color: '#ffc890', intensity: 2.55, dir: [0.8, 0.8, 0.4] },
    hemi: { sky: '#a6a2ec', ground: '#7f9058', intensity: 0.9 },
    exposure: 1.0,
    grade: { saturation: 1.12, contrast: 1.08, vignette: 0.24, bloom: 0.62 },
  };

  return {
    group: root,
    env,
    update(t) {
      const k = 1 + 0.12 * Math.sin(t * 13) + 0.08 * Math.sin(t * 21.7);
      fire.fl.scale.set(1 + 0.05 * Math.sin(t * 9), k, 1 + 0.05 * Math.cos(t * 11));
      fire.fl.rotation.y = t * 0.8;
      glow.material.opacity = 0.6 + 0.12 * Math.sin(t * 12.3) + 0.06 * Math.sin(t * 27);
      sparks.position.y = (t * 0.6) % 1.0;
      sparks.material.opacity = 1 - ((t * 0.6) % 1.0);
      drift(t);
      bank(t);
    },
  };
}
