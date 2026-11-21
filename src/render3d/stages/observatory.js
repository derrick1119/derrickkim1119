// 5. 천문대 언덕(땅거미 → 밤): 별이 돋는 짙은 청보라 하늘, 지평선의 노을 띠, 흰 돔 천문대(틈이 열린 돔과 망원경),
//    소나무, 작은 등이 줄지어 선 굽은 오솔길, 골짜기 아래 마을 불빛, 달.
import {
  THREE, P, G, bake, terrain, cloudLayer, cloudMat, pine, bush, flowers, tuft, rock, halfW, smooth, clamp, fbm, noise2,
  rgb, mixv, rng, TAU, glowPoints, starField, cachedTex, house,
  sphereGeo, boxGeo, roundBoxGeo, cylGeo, coneGeo, torusGeo, latheGeo,
} from './common.js';
import { bakeStatic, glowSprite } from '../kit.js';

const OBS = { x: 2.6, z: -15.5 };

// 오솔길: 통로 오른쪽에서 출발해 굽이굽이 천문대로
const pathX = (z) => 1.2 + (OBS.x - 1.2) * smooth(-1.5, OBS.z + 1.5, z) + 1.3 * Math.sin(z * 0.42 + 0.6) * smooth(-1.5, -5, z) * smooth(OBS.z + 1, -8, z);

function H(x, z) {
  if (z > -2.6) return 0;
  // 천문대 언덕
  const hill = 2.3 * Math.exp(-((x - OBS.x) ** 2) / 26 - ((z - OBS.z) ** 2) / 34);
  let h = smooth(-2.6, -8, z) * (0.25 + 0.15 * Math.sin(x * 0.5)) + hill * smooth(-2.6, -7, z);
  // 왼쪽 골짜기(마을이 내려다보인다) → 먼 산
  const valley = smooth(-1, -6, x) * smooth(-14, -24, z);
  h -= valley * 2.2;
  h += smooth(-40, -80, z) * (4 + 3 * Math.sin(x * 0.06 + 1) + 2 * Math.sin(x * 0.15)) * (0.8 + 0.4 * fbm(x * 0.04, z * 0.04));
  h += 0.15 * (fbm(x * 0.3, z * 0.3) - 0.5) * smooth(-2.6, -6, z);
  return h;
}

const C_G = rgb('#3f7a62');
const C_G2 = rgb('#5a9670');
const C_PATH = rgb('#b8a88c');
const C_FAR = rgb('#3a4678');

function color(x, y, z, ny) {
  const n = fbm(x * 0.35, z * 0.35);
  let c = mixv(C_G, C_G2, smooth(0.3, 0.75, n));
  if (z > OBS.z - 1 && z < -1.4) c = mixv(c, C_PATH, smooth(0.5, 0.28, Math.abs(x - pathX(z)) + noise2(x * 2, z * 2) * 0.1) * 0.9);
  c = mixv(c, C_FAR, smooth(-25, -70, z));
  return c;
}

function observatory(parent, x, y, z, lamps) {
  const g = G(parent, x, y, z, -0.35, 1.15);
  g.add(P(cylGeo(1.15, 1.2, 0.18, 32), '#b9b6cc', { pos: [0, 0.09, 0], fin: 'soft' }));
  g.add(P(cylGeo(1.05, 1.08, 1.15, 32), '#f3f0f8', { pos: [0, 0.75, 0], fin: 'soft' }));
  g.add(P(torusGeo(1.07, 0.045, 8, 36), '#c9c3d8', { pos: [0, 1.33, 0], rot: [Math.PI / 2, 0, 0], fin: 'soft' }));
  // 돔 + 열린 틈 + 망원경
  const dome = G(g, 0, 1.35, 0, 0.2);
  dome.add(P(sphereGeo(1, 36, 18), '#fbfaff', { scale: [1.07, 1.07, 1.07], fin: 'soft' }));
  dome.add(P(roundBoxGeo(0.42, 1.3, 1.3, 0.05, 1), '#1f2350', { pos: [0, 0.48, 0.42], rot: [-0.55, 0, 0], fin: 'soft' }));
  dome.add(P(roundBoxGeo(0.08, 1.2, 1.25, 0.03, 1), '#d9d6e6', { pos: [0.25, 0.48, 0.44], rot: [-0.55, 0, 0], fin: 'soft' }));
  dome.add(P(roundBoxGeo(0.08, 1.2, 1.25, 0.03, 1), '#d9d6e6', { pos: [-0.25, 0.48, 0.44], rot: [-0.55, 0, 0], fin: 'soft' }));
  dome.add(P(cylGeo(0.16, 0.2, 1.3, 16), '#8890b8', { pos: [0, 0.75, 0.42], rot: [-0.7, 0, 0], fin: 'metal' }));
  dome.add(P(cylGeo(0.2, 0.2, 0.08, 16), '#3c4569', { pos: [0, 1.22, 0.83], rot: [-0.7, 0, 0], fin: 'soft' }));
  // 문과 창(불빛)
  g.add(P(roundBoxGeo(0.4, 0.62, 0.08, 0.05, 2), '#ffd98a', { pos: [0, 0.48, 1.05], fin: 'glow', cast: false }));
  g.add(P(roundBoxGeo(0.5, 0.08, 0.2, 0.03, 1), '#c9c3d8', { pos: [0, 0.82, 1.1], fin: 'soft' }));
  for (const a of [-0.9, 0.9]) g.add(P(cylGeo(0.12, 0.12, 0.06, 14), '#ffd98a', { pos: [Math.sin(a) * 1.06, 0.95, Math.cos(a) * 1.06], rot: [Math.PI / 2, 0, -a], fin: 'glow', cast: false }));
  // 옆 건물
  house(g, 1.75, 0, 0.1, -0.2, 0.75, { w: 1.3, d: 1.1, h: 0.9, wall: '#ece8f6', roof: '#5d6a96', lit: true, detail: 1, chimney: false, door: '#5d6a96' });
  // 작은 돔
  const sm = G(g, -1.7, 0, 0.4, 0, 0.55);
  sm.add(P(cylGeo(0.9, 0.95, 0.9, 24), '#ece8f6', { pos: [0, 0.45, 0], fin: 'soft' }));
  sm.add(P(sphereGeo(1, 24, 12), '#dcd8ee', { pos: [0, 0.9, 0], scale: 0.88, fin: 'soft' }));
  sm.add(P(roundBoxGeo(0.3, 0.9, 0.9, 0.04, 1), '#1f2350', { pos: [0, 1.25, 0.35], rot: [-0.5, 0, 0], fin: 'soft' }));
  lamps.push([x, y + 0.55 * 1.15, z + 1.3 * 1.15, '#ffcf7a', 1.6]);
  return g;
}

function dish(parent, x, y, z, s) {
  const g = G(parent, x, y, z, 0.6, s);
  g.add(P(cylGeo(0.12, 0.2, 0.9, 10), '#c9c3d8', { pos: [0, 0.45, 0], fin: 'soft' }));
  const bowl = latheGeo([[0.02, 0], [0.4, 0.06], [0.75, 0.22], [0.95, 0.42], [0.9, 0.44], [0.02, 0.06]], 24, 'dish');
  g.add(P(bowl, '#f3f0f8', { pos: [0, 0.95, 0.1], rot: [-0.9, 0, 0], fin: 'soft' }));
  g.add(P(cylGeo(0.02, 0.02, 0.6, 5), '#8890b8', { pos: [0, 1.18, 0.3], rot: [-0.9, 0, 0] }));
  return g;
}

function pathLamp(parent, x, y, z, lamps) {
  const g = G(parent, x, y, z, 0, 1);
  g.add(P(cylGeo(0.025, 0.035, 0.5, 6), '#3c4569', { pos: [0, 0.25, 0] }));
  g.add(P(sphereGeo(1, 10, 8), '#ffe39a', { pos: [0, 0.55, 0], scale: 0.07, fin: 'glow', cast: false }));
  g.add(P(coneGeo(0.08, 0.06, 8), '#3c4569', { pos: [0, 0.64, 0] }));
  lamps.push([x, y + 0.55, z, '#ffd27a', 0.7]);
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

  const ground = terrain({ H, C: color, rows: 140, cols: 104 });

  const obsY = H(OBS.x, OBS.z);
  observatory(props, OBS.x, obsY - 0.05, OBS.z, lamps);
  dish(props, OBS.x + 3.6, H(OBS.x + 3.6, OBS.z - 1.5), OBS.z - 1.5, 1.1);
  // 오솔길 등
  for (let z = -2.2; z > OBS.z + 1.2; z -= 1.35) {
    const x = pathX(z) + 0.42;
    pathLamp(props, x, H(x, z), z, lamps);
  }
  // 소나무
  const leafs = [
    ['#1f4a4a', '#285a52', '#336a5c'],
    ['#22504c', '#2c6056', '#3a7262'],
  ];
  const eL = -halfW(w, -4.5) - 0.2;
  const eR = halfW(w, -5.5) + 0.3;
  for (const [x, z, s] of [[eL, -4.5, 2.2], [eL + 1.1, -7, 1.6], [eR, -5.5, 2.3], [eR - 1.2, -3.6, 1.4], [eR - 0.5, -9, 1.8]]) pine(props, x, H(x, z), z, s, r, { leaf: leafs[(r() * 2) | 0], seg: 12, tiers: 4 });
  for (let i = 0; i < 26; i++) {
    const z = -8 - r() * 16;
    const x = OBS.x + (r() < 0.5 ? -1 : 1) * (2.5 + r() * 6);
    if (Math.abs(x - pathX(z)) < 1) continue;
    pine(props, x, H(x, z) - 0.05, z, 0.9 + r() * 0.8, r, { leaf: leafs[(r() * 2) | 0], seg: 8 });
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
    house(props, x, H(x, z) - 0.05, z, r() * 0.6 - 0.3, 1.1, { w: 1.1, d: 0.9, h: 0.7, wall: '#b9b6d6', roof: '#4a5288', lit: r() < 0.8, detail: 0 });
  }
  // 풀·꽃·바위
  for (let i = 0; i < 20; i++) {
    const x = (r() * 2 - 1) * (hw0 + 0.6);
    const z = 0.95 + r() * 2.3;
    if (r() < 0.5) flowers(props, x, 0, z, 0.9 + r() * 0.4, r, { n: 4, colors: ['#e8f0ff', '#b8c8ff', '#ffe9a8'], leaf: '#2f5e4a' });
    else tuft(props, x, 0, z, 1.0, r, '#3a6a52');
  }
  for (let i = 0; i < 12; i++) {
    const x = (r() * 2 - 1) * (hw0 + 1.5);
    const z = -1.3 - r() * 4;
    if (Math.abs(x - pathX(z)) < 0.6) continue;
    flowers(props, x, H(x, z), z, 1.2, r, { colors: ['#e8f0ff', '#b8c8ff'], leaf: '#2f5e4a' });
  }
  for (const [x, z, s] of [[-2.2, -2.5, 0.9], [-1.0, -5.5, 0.7], [3.6, -3.0, 0.8]]) rock(props, x, H(x, z), z, s, r, '#6f6c92');
  bush(props, eL + 1.6, 0, -2.3, 0.9, r, { leaf: ['#244e44', '#2f6050', '#3c725c'] });

  bake(props);
  root.add(ground);

  // 불빛: 크기별로 두 묶음
  root.add(glowPoints(lamps.filter((l) => (l[4] || 1) >= 1).map((l) => l.slice(0, 4)), { size: 2.4, atten: true, opacity: 0.6 }));
  root.add(glowPoints(lamps.filter((l) => (l[4] || 1) < 1).map((l) => l.slice(0, 4)), { size: 0.75, atten: true, opacity: 0.85, fog: false }));
  // 별
  const stars = starField(53, { n: 340, yMin: 0.05, fade: '#7a6aa8' });
  root.add(stars);
  // 달
  const moon = new THREE.Mesh(sphereGeo(1, 24, 16), new THREE.MeshBasicMaterial({ map: moonTex(), fog: false }));
  moon.position.set(-26, 42, -190);
  moon.scale.setScalar(4.2);
  root.add(moon);
  const mg = glowSprite('#cfd8ff', 28, 0.4);
  mg.position.copy(moon.position);
  root.add(mg);

  // 옅은 밤 구름
  const cm = cloudMat('#8f8fd0', '#2e2f70', { light: [-0.6, 0.6, -0.2], mid: '#5d5aa8', fog: false });
  const sky = G(root);
  const drift = cloudLayer(sky, 57, [
    { x: 28, y: 24, z: -140, w: 30, h: 6, n: 14, seg: 10, speed: 0.08, span: 85, flat: 0.15 },
    { x: -40, y: 14, z: -200, w: 50, h: 7, n: 14, seg: 10, speed: 0.05, span: 110, flat: 0.15 },
  ], cm);

  const env = {
    sky: { top: '#0c1240', mid: '#2c2f7e', horizon: '#ef9a8e', sunDir: [0.35, -0.04, -1], sunColor: '#ff9a70', sunStrength: 0.7, sunSize: 0.0015 },
    fog: { color: '#5c4f96', near: 30, far: 260 },
    sun: { color: '#b4c2ff', intensity: 1.35, dir: [-0.5, 0.9, 0.6] },
    hemi: { sky: '#6a78d8', ground: '#2c3a58', intensity: 1.15 },
    exposure: 1.05,
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
