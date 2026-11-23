// 5. 천문대 언덕(땅거미 → 밤): 별이 돋는 짙은 청보라 하늘, 지평선의 노을 띠, 흰 돔 천문대(틈 사이로 새어 나오는 불빛과 망원경),
//    전파 접시, 두 톤 소나무, 작은 등이 줄지어 선 굽은 오솔길(블룸), 골짜기 아래 마을 불빛, 달.
//    값 구조: 앞 풀밭과 양옆 소나무는 짙은 남청, 오솔길과 천문대는 달빛·등빛을 받아 밝게, 먼 산은 보랏빛 실루엣.
//    밤이라도 통로(지구인 자리)는 중간 밝기로 두어 사람과 기체가 또렷하게 보이게 한다.
import {
  THREE, P, G, bake, terrain, cloudLayer, cloudMat, pine, bush, rock, mushroom, halfW, smooth, fbm, noise2, rgb,
  mixv, rng, TAU, glowPoints, starField, cachedTex, house, sphereGeo, roundBoxGeo, cylGeo, coneGeo, torusGeo, latheGeo,
  LEAF, lanePlants, flowerGeo, groundDecal, grassStrokes, speckle, glowS, sharedMat,
} from './common.js';

const OBS = { x: 2.6, z: -15.5 };

// 오솔길: 통로 오른쪽에서 출발해 굽이굽이 천문대로
const pathX = (z) => 1.2 + (OBS.x - 1.2) * smooth(-1.5, OBS.z + 1.5, z) + 1.3 * Math.sin(z * 0.42 + 0.6) * smooth(-1.5, -5, z) * smooth(OBS.z + 1, -8, z);

function H(x, z) {
  if (z > -2.6) return 0;
  const hill = 2.3 * Math.exp(-((x - OBS.x) ** 2) / 26 - ((z - OBS.z) ** 2) / 34);
  let h = smooth(-2.6, -8, z) * (0.25 + 0.15 * Math.sin(x * 0.5)) + hill * smooth(-2.6, -7, z);
  const valley = smooth(-1, -6, x) * smooth(-14, -24, z);
  h -= valley * 2.2;
  h += smooth(-40, -80, z) * (4 + 3 * Math.sin(x * 0.06 + 1) + 2 * Math.sin(x * 0.15)) * (0.8 + 0.4 * fbm(x * 0.04, z * 0.04));
  h += 0.15 * (fbm(x * 0.3, z * 0.3) - 0.5) * smooth(-2.6, -6, z);
  return h;
}

const C_G = rgb('#2f6a62');
const C_G2 = rgb('#4f9478');
const C_MOON = rgb('#6fb0a0');
const C_FRONT = rgb('#1e4250');
const C_PATH = rgb('#c4b496');
const C_FAR = rgb('#34407a');

function color(x, y, z, ny) {
  const n = fbm(x * 0.35, z * 0.35);
  let c = mixv(C_G, C_G2, smooth(0.3, 0.75, n));
  // 달빛 든 언덕 윗면
  c = mixv(c, C_MOON, smooth(0.6, 2.2, y) * 0.35 * smooth(-30, -8, z));
  c = mixv(c, C_FRONT, smooth(0.8, 6.5, z) * 0.6 + smooth(0.55, 1, Math.abs(x) / halfW(390, z)) * smooth(-8, -1, z) * 0.25);
  if (z > OBS.z - 1 && z < -1.4) c = mixv(c, C_PATH, smooth(0.5, 0.28, Math.abs(x - pathX(z)) + noise2(x * 2, z * 2) * 0.1) * 0.9);
  c = mixv(c, C_FAR, smooth(-25, -70, z));
  return c;
}

// 통로 앞 풀 결 + 오솔길 시작(통로에서 갈라져 언덕으로)
function drawDecal(ctx, W, Hh, X, Z, r) {
  const u = W / 13.2;
  grassStrokes(ctx, 0, 0, W, Hh, 2400, ['rgba(10,40,50,0.28)', 'rgba(150,230,200,0.14)', 'rgba(20,60,70,0.2)'], r, [3, 7]);
  // 통로 길(달빛에 밝은 흙길)
  const lz = (x) => -0.05 + 0.06 * Math.sin(x * 0.9 + 1);
  const top = [];
  const bot = [];
  for (let x = -6.6; x <= 6.61; x += 0.1) {
    top.push([X(x), Z(lz(x) - 0.42 - 0.04 * Math.sin(x * 3.3))]);
    bot.push([X(x), Z(lz(x) + 0.42 + 0.04 * Math.sin(x * 2.9 + 1))]);
  }
  const bl = [];
  const br = [];
  for (let z = -0.2; z >= -7.01; z -= 0.1) {
    const hw = 0.3 + 0.03 * Math.sin(z * 4);
    bl.push([X(pathX(z) - hw), Z(z)]);
    br.push([X(pathX(z) + hw), Z(z)]);
  }
  ctx.save();
  ctx.beginPath();
  top.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  for (let i = bot.length - 1; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]);
  ctx.closePath();
  ctx.moveTo(bl[0][0], bl[0][1]);
  bl.forEach(([x, y]) => ctx.lineTo(x, y));
  for (let i = br.length - 1; i >= 0; i--) ctx.lineTo(br[i][0], br[i][1]);
  ctx.closePath();
  ctx.strokeStyle = 'rgba(10,30,40,0.45)';
  ctx.lineWidth = u * 0.14;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.fillStyle = '#9e9a8e';
  ctx.fill();
  ctx.clip();
  ctx.strokeStyle = '#c2bca8';
  ctx.lineWidth = u * 0.42;
  ctx.beginPath();
  for (let x = -6.6; x <= 6.61; x += 0.1) (x === -6.6 ? ctx.moveTo : ctx.lineTo).call(ctx, X(x), Z(lz(x)));
  ctx.stroke();
  // 디딤돌
  for (let z = -0.8; z > -7; z -= 0.42) {
    const x = pathX(z) + (r() - 0.5) * 0.1;
    ctx.fillStyle = '#d6d2e0';
    ctx.beginPath();
    ctx.ellipse(X(x), Z(z), u * 0.17, u * 0.11, (r() - 0.5) * 0.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(60,60,100,0.35)';
    ctx.beginPath();
    ctx.ellipse(X(x), Z(z) + u * 0.04, u * 0.17, u * 0.06, 0, 0, Math.PI);
    ctx.fill();
  }
  speckle(ctx, 0, 0, W, Hh, 1200, ['rgba(60,60,90,0.3)', 'rgba(255,255,240,0.35)'], r, [1, 3]);
  ctx.restore();
  ctx.globalCompositeOperation = 'destination-out';
  const fade = ctx.createLinearGradient(0, Z(-4.5), 0, Z(-7));
  fade.addColorStop(0, 'rgba(0,0,0,0)');
  fade.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.fillStyle = fade;
  ctx.fillRect(0, Z(-4.5), W, Hh - Z(-4.5));
  ctx.globalCompositeOperation = 'source-over';
}

// 돔 껍질 조각(틈·난간) 도형 캐시
const shells = new Map();
function shellGeo(rad, seg, off, width) {
  const key = `${rad}|${seg}|${off}|${width}`;
  let g = shells.get(key);
  if (!g) {
    g = new THREE.SphereGeometry(rad, seg, 12, Math.PI / 2 + off - width / 2, width, 0.05, 1.45);
    g.userData.shared = true;
    shells.set(key, g);
  }
  return g;
}

function observatory(parent, x, y, z, lamps) {
  const g = G(parent, x, y, z, -0.35, 1.2);
  const wallTT = ['#8a88b8', '#f6f4ff'];
  g.add(P(cylGeo(1.18, 1.24, 0.2, 32), '', { pos: [0, 0.1, 0], fin: 'soft', tt: ['#6a6890', '#c8c4e0'] }));
  g.add(P(cylGeo(1.05, 1.08, 1.15, 32), '', { pos: [0, 0.75, 0], fin: 'soft', tt: wallTT }));
  g.add(P(torusGeo(1.08, 0.06, 8, 36), '#b8b4d4', { pos: [0, 1.33, 0], rot: [Math.PI / 2, 0, 0], fin: 'soft' }));
  // 돔 + 열린 틈(안쪽 불빛) + 망원경
  const dome = G(g, 0, 1.35, 0, 0.2);
  dome.add(P(sphereGeo(1, 36, 18), '', { scale: [1.07, 1.07, 1.07], fin: 'soft', tt: ['#9a98c8', '#ffffff', 0.1] }));
  dome.add(P(shellGeo(1.085, 8, 0, 0.4), '#ffc870', { fin: 'warm' }));
  for (const sx of [-0.21, 0.21]) dome.add(P(shellGeo(1.1, 3, sx, 0.08), '#c8c4dc', { fin: 'soft' }));
  dome.add(P(cylGeo(0.17, 0.21, 1.15, 16), '#5a62a0', { pos: [0, 0.64, 0.42], rot: [-0.75, 0, 0], fin: 'metal' }));
  dome.add(P(cylGeo(0.21, 0.21, 0.09, 16), '#2e3768', { pos: [0, 1.04, 0.82], rot: [-0.75, 0, 0], fin: 'soft' }));
  dome.add(P(cylGeo(0.16, 0.16, 0.02, 16), '#cfe8ff', { pos: [0, 1.09, 0.86], rot: [-0.75, 0, 0], fin: 'glow' }));
  // 문과 창(블룸)
  g.add(P(roundBoxGeo(0.48, 0.7, 0.1, 0.06, 2), '#2e3768', { pos: [0, 0.48, 1.02], fin: 'soft' }));
  g.add(P(roundBoxGeo(0.38, 0.6, 0.1, 0.05, 2), '#ffd98a', { pos: [0, 0.46, 1.05], fin: 'glow', cast: false }));
  g.add(P(roundBoxGeo(0.56, 0.09, 0.22, 0.03, 1), '#b8b4d4', { pos: [0, 0.84, 1.1], fin: 'soft' }));
  for (const a of [-0.9, 0.9]) {
    g.add(P(cylGeo(0.15, 0.15, 0.06, 14), '#2e3768', { pos: [Math.sin(a) * 1.05, 0.95, Math.cos(a) * 1.05], rot: [Math.PI / 2, 0, -a], fin: 'soft', cast: false }));
    g.add(P(cylGeo(0.11, 0.11, 0.07, 14), '#ffd98a', { pos: [Math.sin(a) * 1.07, 0.95, Math.cos(a) * 1.07], rot: [Math.PI / 2, 0, -a], fin: 'glow', cast: false }));
  }
  // 옆 건물(창 불빛)
  house(g, 1.75, 0, 0.1, -0.2, 0.75, { w: 1.3, d: 1.1, h: 0.9, wall: '#e2def4', roof: '#4a5290', lit: true, detail: 1, chimney: false, door: '#4a5290', base: '#7a78a0' });
  // 작은 돔
  const sm = G(g, -1.7, 0, 0.4, 0, 0.55);
  sm.add(P(cylGeo(0.9, 0.95, 0.9, 24), '', { pos: [0, 0.45, 0], fin: 'soft', tt: wallTT }));
  sm.add(P(sphereGeo(1, 24, 12), '', { pos: [0, 0.9, 0], scale: 0.88, fin: 'soft', tt: ['#8a88b8', '#eeeaff'] }));
  sm.add(P(roundBoxGeo(0.3, 0.9, 0.9, 0.04, 1), '#1f2350', { pos: [0, 1.25, 0.35], rot: [-0.5, 0, 0], fin: 'soft' }));
  lamps.push([x, y + 0.55 * 1.2, z + 1.35 * 1.2, '#ffcf7a', 1.6]);
  return g;
}

function dish(parent, x, y, z, s) {
  const g = G(parent, x, y, z, 0.6, s);
  g.add(P(cylGeo(0.13, 0.22, 0.9, 10), '', { pos: [0, 0.45, 0], fin: 'soft', tt: ['#6a6890', '#c8c4e0'] }));
  const bowl = latheGeo([[0.02, 0], [0.4, 0.06], [0.75, 0.22], [0.95, 0.42], [0.9, 0.44], [0.02, 0.06]], 24, 'dish');
  g.add(P(bowl, '', { pos: [0, 0.95, 0.1], rot: [-0.9, 0, 0], fin: 'soft', tt: ['#8a88b8', '#ffffff'] }));
  g.add(P(cylGeo(0.025, 0.025, 0.6, 5), '#8890b8', { pos: [0, 1.18, 0.3], rot: [-0.9, 0, 0] }));
  g.add(P(sphereGeo(1, 8, 6), '#ff4a5a', { pos: [0, 1.42, 0.5], scale: 0.05, fin: 'neon', cast: false }));
  return g;
}

function pathLamp(parent, x, y, z, lamps) {
  const g = G(parent, x, y, z, 0, 1.15);
  const tt = ['#141a40', '#5a64a8'];
  g.add(P(cylGeo(0.06, 0.08, 0.06, 8), '', { pos: [0, 0.03, 0], tt }));
  g.add(P(cylGeo(0.028, 0.038, 0.5, 6), '', { pos: [0, 0.28, 0], tt }));
  g.add(P(roundBoxGeo(0.12, 0.13, 0.12, 0.035, 1), '#ffe39a', { pos: [0, 0.58, 0], fin: 'glow', cast: false }));
  g.add(P(coneGeo(0.11, 0.08, 4), '', { pos: [0, 0.68, 0], rot: [0, Math.PI / 4, 0], tt }));
  lamps.push([x, y + 0.58 * 1.15, z, '#ffd27a', 0.7]);
}

function moonTex() {
  return cachedTex('moon', 128, 128, (ctx, W) => {
    ctx.fillStyle = '#fff6d6';
    ctx.fillRect(0, 0, W, W);
    const r = rng(4);
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = `rgba(200,180,150,${0.25 + r() * 0.25})`;
      ctx.beginPath();
      ctx.arc(r() * W, r() * W, 4 + r() * 12, 0, TAU);
      ctx.fill();
    }
  });
}

/** @param {{w:number,h:number}} size */
export function buildObservatory({ w }) {
  const r = rng(53);
  const root = new THREE.Group();
  const props = G(root);
  const hw0 = halfW(w, 0);
  const lamps = [];

  const ground = terrain({ H, C: color, rows: 130, cols: 100 });
  const decal = groundDecal({ key: 'obs', draw: drawDecal, H: (x, z) => Math.max(0, H(x, z)) });

  const obsY = H(OBS.x, OBS.z);
  observatory(props, OBS.x, obsY - 0.05, OBS.z, lamps);
  dish(props, OBS.x + 3.6, H(OBS.x + 3.6, OBS.z - 1.5), OBS.z - 1.5, 1.15);
  // 오솔길 등(블룸)
  for (let z = -2.2; z > OBS.z + 1.2; z -= 1.35) {
    const x = pathX(z) + 0.45;
    pathLamp(props, x, H(x, z), z, lamps);
  }
  // 소나무(밤: 짙은 남청 그늘, 달빛 받은 청록 볕)
  const sets = [LEAF.night, ['#16364a', '#4a8a7a']];
  const eL = -halfW(w, -4.5) - 0.2;
  const eR = halfW(w, -5.5) + 0.3;
  for (const [x, z, s] of [[eL, -4.5, 2.2], [eL + 1.1, -7, 1.6], [eR, -5.5, 2.3], [eR - 1.2, -3.6, 1.4], [eR - 0.5, -9, 1.8]]) {
    pine(props, x, H(x, z), z, s, r, { leaf: ['#0f2a3a', '#3a6e6a'], seg: 12, tiers: 4 });
  }
  for (let i = 0; i < 26; i++) {
    const z = -8 - r() * 16;
    const x = OBS.x + (r() < 0.5 ? -1 : 1) * (2.5 + r() * 6);
    if (Math.abs(x - pathX(z)) < 1) continue;
    pine(props, x, H(x, z) - 0.05, z, 0.9 + r() * 0.8, r, { leaf: sets[(r() * 2) | 0], seg: 8 });
  }
  // 골짜기 마을 불빛(왼쪽 아래)
  for (let i = 0; i < 46; i++) {
    const z = -22 - r() * 30;
    const x = -3 - r() * 14 - (-22 - z) * 0.2;
    lamps.push([x, H(x, z) + 0.25, z, r() < 0.7 ? '#ffcf7a' : '#ffe8b0', 0.55 + r() * 0.3]);
  }
  for (let i = 0; i < 12; i++) {
    const z = -24 - r() * 20;
    const x = -4 - r() * 10;
    house(props, x, H(x, z) - 0.05, z, r() * 0.6 - 0.3, 1.1, { w: 1.1, d: 0.9, h: 0.7, wall: '#a8a4d0', roof: '#3a4280', lit: r() < 0.8, detail: 0 });
  }
  // 바위·버섯·덤불
  for (const [x, z, s] of [[-2.2, -2.5, 0.9], [-1.0, -5.5, 0.7], [3.6, -3.0, 0.8], [eL + 1.4, -1.6, 0.7]]) rock(props, x, H(x, z), z, s, r, '#7a78a8');
  for (const [x, z, s, c] of [[-2.6, -2.1, 0.9, '#c84a7a'], [-2.35, -2.35, 0.6, '#c84a7a'], [3.9, -2.5, 0.8, '#8a6ad8']]) mushroom(props, x, H(x, z), z, s, r, { cap: c });
  bush(props, eL + 1.6, 0, -2.3, 0.9, r, { leaf: ['#122e3a', '#3a7066'] });
  bush(props, eR - 1.8, 0, -1.9, 0.8, r, { leaf: ['#122e3a', '#3a7066'], flowers: 3, flowerColor: '#d8e4ff' });

  // 풀·꽃(인스턴스, 밤빛)
  lanePlants(props, {
    w,
    seed: 54,
    avoid: (x, z) => (Math.abs(z) < 0.4 && Math.abs(x) < 6) || (z < -0.3 && Math.abs(x - pathX(z)) < 0.45),
    back: [-6, -0.95],
    grass: ['#2f6a5a', '#3a7a66', '#245a50'],
    flowers: [
      [flowerGeo('#e8f0ff', '#ffe9a8', '#2f5e4a'), ['#ffffff', '#d8e4ff']],
      [flowerGeo('#b8a8ff', '#fff2c0', '#2f5e4a'), ['#ffffff']],
    ],
    pebble: ['#8a88b0', '#6f6c98'],
    clover: ['#1e4a48', '#24564e'],
  });

  bake(props, { H, light: [-0.5, 1, 0.6] });
  root.add(ground, decal);

  // 불빛(블룸): 크기별로 두 묶음
  root.add(glowPoints(lamps.filter((l) => (l[4] || 1) >= 1).map((l) => l.slice(0, 4)), { size: 1.5, atten: true, opacity: 0.55, boost: 1.3 }));
  root.add(glowPoints(lamps.filter((l) => (l[4] || 1) < 1).map((l) => l.slice(0, 4)), { size: 0.9, atten: true, opacity: 0.85, fog: false, boost: 1.8 }));
  // 별
  const stars = starField(53, { n: 620, yMin: 0.06, fade: '#7a6aa8', big: 0.14, boost: [1.1, 2.6] });
  root.add(stars);
  // 달(살짝 블룸 — 기체가 앞을 지나도 묻히지 않게 세지 않게)
  const moon = new THREE.Mesh(sphereGeo(1, 24, 16), sharedMat('obs:moon', () => new THREE.MeshBasicMaterial({ map: moonTex(), color: new THREE.Color('#ffffff').multiplyScalar(1.22), fog: false })));
  moon.position.set(-26, 42, -190);
  moon.scale.setScalar(4.2);
  root.add(moon);
  const mg = glowS('obs:moonGlow', '#cfd8ff', 24, 0.32);
  mg.position.copy(moon.position);
  root.add(mg);

  // 옅은 밤 구름
  const cm = cloudMat('#9a96d8', '#2e2f70', { light: [-0.6, 0.6, -0.2], mid: '#625ea8', fog: false });
  const sky = G(root);
  const drift = cloudLayer(sky, 57, [
    { x: 28, y: 24, z: -140, w: 30, h: 6, n: 14, seg: 10, speed: 0.08, span: 85, flat: 0.15 },
    { x: -40, y: 14, z: -200, w: 50, h: 7, n: 14, seg: 10, speed: 0.05, span: 110, flat: 0.15 },
  ], cm);

  const env = {
    sky: { top: '#0b1040', mid: '#2e2f84', horizon: '#ef9a8e', sunDir: [0.35, -0.04, -1], sunColor: '#ff9a70', sunStrength: 0.7, sunSize: 0.0015 },
    fog: { color: '#5a4e98', near: 30, far: 260 },
    sun: { color: '#b8c6ff', intensity: 1.55, dir: [-0.5, 0.9, 0.6] },
    hemi: { sky: '#7484e0', ground: '#2c3a5a', intensity: 1.2 },
    exposure: 1.08,
    grade: { saturation: 1.1, contrast: 1.06, vignette: 0.3, bloom: 0.7 },
  };

  const [sa, sb] = stars.userData.layers;
  return {
    group: root,
    env,
    update(t) {
      sa.material.opacity = 0.8 + 0.2 * Math.sin(t * 1.7);
      sb.material.opacity = 0.85 + 0.15 * Math.sin(t * 2.3 + 1);
      drift(t);
    },
  };
}
