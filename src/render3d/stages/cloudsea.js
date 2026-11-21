// 6. 구름바다(구름 위, 눈부신 한낮): 지평선까지 이어지는 몽글몽글한 구름 바다, 솟아오른 뭉게구름 탑, 밝은 해,
//    떠다니는 작은 구름. 땅 대신 푹신한 구름 바닥이 지구인(열기구 탄 사람) 발밑에 깔린다.
import { THREE, G, terrain, cloudLayer, cloudMat, cumulus, halfW, smooth, clamp, fbm, rng, TAU, vcolMat } from './common.js';
import { glowSprite } from '../kit.js';

// 구름 바닥 높이: 둥근 봉우리(돔)들을 겹친다. 가까운 곳은 낮고 잔잔하게, 멀수록 크고 높게.
function makeH(seed) {
  const r = rng(seed);
  const domes = [];
  // 앞쪽(통로 뒤) 작은 둔덕
  for (let i = 0; i < 46; i++) domes.push([(r() * 2 - 1) * 9, -1.6 - r() * 6, 0.9 + r() * 1.1, 0.25 + r() * 0.5]);
  // 중간
  for (let i = 0; i < 60; i++) {
    const z = -8 - r() * 40;
    domes.push([(r() * 2 - 1) * (6 + (-z) * 0.45), z, 2 + r() * 3.5 + (-z) * 0.05, 0.6 + r() * 1.4]);
  }
  // 먼 곳
  for (let i = 0; i < 70; i++) {
    const z = -50 - r() * 220;
    domes.push([(r() * 2 - 1) * (20 + (-z) * 0.5), z, 6 + r() * 10 + (-z) * 0.04, 1 + r() * 2.5]);
  }
  // 앞마당(통로 앞) 잔물결
  for (let i = 0; i < 20; i++) domes.push([(r() * 2 - 1) * 6, 1.2 + r() * 7, 0.8 + r() * 0.9, 0.06 + r() * 0.07]);
  return (x, z) => {
    let h = -0.12 + 0.05 * Math.sin(x * 2.1 + z * 0.7) + 0.04 * Math.sin(x * 3.7 - z * 1.3);
    if (z < -1.0) h += smooth(-1.0, -4, z) * 0.25 * fbm(x * 0.4, z * 0.4);
    for (const [cx, cz, rr, hh] of domes) {
      const dx = x - cx;
      const dz = (z - cz) * 1.15;
      const d2 = (dx * dx + dz * dz) / (rr * rr);
      if (d2 < 1) h = Math.max(h, -0.2 + hh * Math.sqrt(1 - d2));
    }
    // 통로는 낮게 유지
    if (z > -0.95 && z < 0.95) h = Math.min(h, 0.06);
    else if (z >= 0.95) h = Math.min(h, 0.12);
    return h;
  };
}

/** @param {{w:number,h:number}} size */
export function buildCloudsea({ w }) {
  const root = new THREE.Group();
  const H = makeH(67);
  // 구름 재질을 꼭짓점 색 대신 법선으로 그늘지게: 지형 그물에 구름 재질을 씌운다
  const floorMat = cloudMat('#ffffff', '#a9b6ec', { fog: true, light: [-0.55, 0.75, 0.35], mid: '#e4e8fb' });
  const floor = terrain({ H, C: () => '#ffffff', rows: 170, cols: 120, zFar: -360, wide: 1.4 });
  floor.material = floorMat;
  floor.receiveShadow = true;
  root.add(floor);

  // 솟은 뭉게구름 탑(양옆) — 정적이지만 한 덩이씩 그린다
  const r = rng(71);
  const towerMat = cloudMat('#ffffff', '#9eaae6', { fog: true, light: [-0.55, 0.75, 0.35] });
  const towers = [
    [-halfW(w, -30) - 1, -2, -30, 18, 11],
    [halfW(w, -38) + 3, -2, -38, 22, 14],
    [-26, -2, -80, 30, 16],
    [34, -2, -95, 34, 18],
  ];
  for (const [x, y, z, ww, hh] of towers) {
    const m = cumulus(r, { w: ww, h: hh, n: 26, seg: 14, d: ww * 0.6 }, towerMat);
    m.position.set(x, y, z);
    m.userData.dynamic = false;
    root.add(m);
  }

  // 해
  const sunGlow = glowSprite('#fff6d8', 60, 0.85);
  sunGlow.position.set(-55, 70, -220);
  const sunCore = glowSprite('#ffffff', 16, 1.0);
  sunCore.position.set(-55, 70, -219);
  root.add(sunGlow, sunCore);

  // 떠다니는 작은 구름(하늘 양옆, 지평선 근처)
  const puff = cloudMat('#ffffff', '#b2bdef', { light: [-0.55, 0.75, 0.35] });
  const sky = G(root);
  const drift = cloudLayer(sky, 69, [
    { x: 22, y: 20, z: -115, w: 16, h: 6, n: 14, seg: 12, speed: 0.35, span: 70 },
    { x: -30, y: 30, z: -140, w: 20, h: 6, n: 14, seg: 12, speed: 0.28, span: 80 },
    { x: 4, y: 9, z: -70, w: 9, h: 3.5, n: 12, seg: 12, speed: 0.4, span: 50 },
    { x: -14, y: 6, z: -48, w: 6, h: 2.4, n: 10, seg: 12, speed: 0.5, span: 40 },
    { x: 40, y: 48, z: -170, w: 26, h: 6, n: 12, seg: 10, speed: 0.2, span: 95 },
  ], puff);

  const env = {
    sky: { top: '#1f52cf', mid: '#5a9cf2', horizon: '#e4f2ff', sunDir: [-0.55, 0.6, -1], sunColor: '#fff6d8', sunStrength: 0.9, sunSize: 0.004 },
    fog: { color: '#dceeff', near: 40, far: 330 },
    sun: { color: '#fff6e4', intensity: 2.3, dir: [-0.6, 1, 0.6] },
    hemi: { sky: '#c4dcff', ground: '#dfe6ff', intensity: 1.0 },
    exposure: 1.0,
  };

  return {
    group: root,
    env,
    update(t) {
      drift(t);
    },
  };
}

void clamp;
void TAU;
void vcolMat;
