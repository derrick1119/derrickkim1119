// 6. 구름바다(구름 위, 눈부신 한낮): 지평선까지 이어지는 몽글몽글한 구름 바다, 솟아오른 뭉게구름 탑, 밝은 해,
//    떠다니는 작은 구름. 땅 대신 푹신한 구름 바닥이 지구인(열기구 탄 사람) 발밑에 깔린다.
import { THREE, G, terrain, cloudLayer, cloudMat, cumulus, halfW, rng, sphereGeo, mergeGeometries } from './common.js';
import { glowSprite } from '../kit.js';

// 구름 바닥 높이: 둥근 봉우리(돔)들을 겹친다. 가까운 곳은 낮고 잔잔하게, 멀수록 크고 높게.
// info(x, z) 는 높이와 함께 "봉우리 안쪽 정도"(0 = 봉우리 사이 골짜기, 1 = 꼭대기)를 돌려준다 → 골짜기를 그늘지게.
function makeField(seed) {
  const r = rng(seed);
  const domes = [];
  // 통로 바로 뒤 작은 솜뭉치
  for (let i = 0; i < 60; i++) domes.push([(r() * 2 - 1) * 9, -1.5 - r() * 6.5, 0.7 + r() * 0.9, 0.35 + r() * 0.5]);
  // 중간
  for (let i = 0; i < 90; i++) {
    const z = -7 - r() * 45;
    const rr = 1.6 + r() * 2.6 + (-z) * 0.06;
    domes.push([(r() * 2 - 1) * (6 + (-z) * 0.5), z, rr, rr * (0.45 + r() * 0.35)]);
  }
  // 먼 곳
  for (let i = 0; i < 110; i++) {
    const z = -50 - r() * 230;
    const rr = 6 + r() * 9 + (-z) * 0.05;
    domes.push([(r() * 2 - 1) * (20 + (-z) * 0.55), z, rr, rr * (0.3 + r() * 0.3)]);
  }
  // 통로 앞 잔물결
  for (let i = 0; i < 24; i++) domes.push([(r() * 2 - 1) * 6, 1.2 + r() * 7, 0.6 + r() * 0.8, 0.08 + r() * 0.06]);
  const out = { h: 0, k: 0 };
  return (x, z) => {
    let h = -0.12 + 0.05 * Math.sin(x * 2.1 + z * 0.7) + 0.04 * Math.sin(x * 3.7 - z * 1.3);
    let k = 0.35;
    for (const [cx, cz, rr, hh] of domes) {
      const dx = x - cx;
      const dz = (z - cz) * 1.1;
      const d2 = (dx * dx + dz * dz) / (rr * rr);
      if (d2 < 1) {
        const f = Math.sqrt(1 - d2);
        const v = -0.25 + hh * f;
        if (v > h) {
          h = v;
          k = f;
        }
      }
    }
    // 통로는 낮게 유지
    if (z > -0.95 && z < 0.95) h = Math.min(h, 0.06);
    else if (z >= 0.95) h = Math.min(h, 0.12);
    out.h = h;
    out.k = k;
    return out;
  };
}

const floorMats = new Map();
/** 구름 바닥 재질: 법선 그늘 + 꼭짓점 색(골짜기 그늘). */
function floorMat() {
  let m = floorMats.get('f');
  if (m) return m;
  m = cloudMat('#ffffff', '#9aa6e4', { fog: true, light: [-0.35, 0.9, -0.35], mid: '#d6dcf8' }).clone();
  m.vertexColors = true;
  m.customProgramCacheKey = () => 'cloudFloor';
  m.onBeforeCompile = cloudMat('#ffffff', '#9aa6e4', { fog: true, light: [-0.35, 0.9, -0.35], mid: '#d6dcf8' }).onBeforeCompile;
  floorMats.set('f', m);
  return m;
}

/** 구 여러 개를 한 도형으로(구름 바다 한 겹). blobs = [[x,y,z,r], ...] */
function puffLayer(blobs, seg, material) {
  const sg = sphereGeo(1, seg, Math.round(seg * 0.7));
  const geos = blobs.map(([x, y, z, rr]) => {
    const g = sg.clone();
    g.scale(rr, rr * 0.82, rr);
    g.translate(x, y, z);
    return g;
  });
  const merged = mergeGeometries(geos, false);
  for (const g of geos) g.dispose();
  const m = new THREE.Mesh(merged, material);
  m.userData.ownGeometry = true;
  m.matrixAutoUpdate = false;
  m.updateMatrix();
  return m;
}

/** @param {{w:number,h:number}} size */
export function buildCloudsea({ w }) {
  const root = new THREE.Group();
  const r = rng(67);
  const light = [-0.55, 0.75, 0.35];
  // 구름 바다는 위에서 내리쬐는 빛으로: 윗면은 하얗고 카메라 쪽 옆면은 라벤더 그늘(겹겹이 띠가 진다)
  const seaMat = cloudMat('#fffcf4', '#7c88d4', { fog: true, light: [-0.35, 0.9, -0.35], mid: '#b8c0ee', steps: [-0.55, 0.15, 0.28, 0.85], rim: 0.3 });

  // 바닥(통로와 그 앞): 잔잔한 솜 바닥 + 아래 깔개(구멍 메우기)
  const info = makeField(67);
  const shadeC = [0.8, 0.83, 0.97];
  const floor = terrain({
    H: (x, z) => (z > -3 ? info(x, z).h : -0.7),
    C: (x, y, z) => {
      const k = z > -1 ? 1 : info(x, z).k;
      const t = Math.min(1, k / 0.55);
      const a = 1 - (1 - t * t) * 0.8;
      return [shadeC[0] + (1 - shadeC[0]) * a, shadeC[1] + (1 - shadeC[1]) * a, shadeC[2] + (1 - shadeC[2]) * a];
    },
    rows: 90,
    cols: 90,
    zFar: -400,
    wide: 1.5,
  });
  floor.material = floorMat();
  root.add(floor);

  // 구름 바다: 가까운 겹(작은 솜) → 중간 → 먼 겹(큰 솜). 가운데 기체 자리는 낮게.
  const near = [];
  for (let i = 0; i < 70; i++) {
    const z = -1.4 - r() * 7;
    const x = (r() * 2 - 1) * (halfW(w, z) + 1.2);
    const rr = 0.35 + r() * 0.5 + (-z) * 0.05;
    near.push([x, -rr * 0.35 + (-z - 1.4) * 0.03, z, rr]);
  }
  const mid = [];
  for (let i = 0; i < 120; i++) {
    const z = -8 - r() * 42;
    const x = (r() * 2 - 1) * (halfW(w, z) + 3);
    const rr = 1.0 + r() * 1.6 + (-z) * 0.06;
    mid.push([x, -rr * 0.45 + (-z) * 0.02, z, rr]);
  }
  const far = [];
  for (let i = 0; i < 150; i++) {
    const z = -50 - r() * 260;
    const x = (r() * 2 - 1) * (halfW(w, z) + 10);
    const rr = 4 + r() * 6 + (-z) * 0.05;
    far.push([x, -rr * 0.5 + (-z) * 0.012, z, rr]);
  }
  // 통로 앞 낮은 솜(높이 0.12 이하)
  for (let i = 0; i < 26; i++) {
    const z = 1.1 + r() * 2.4;
    const x = (r() * 2 - 1) * (halfW(w, z) + 0.5);
    const rr = 0.25 + r() * 0.3;
    near.push([x, 0.1 - rr * 0.82, z, rr]);
  }
  root.add(puffLayer(near, 14, seaMat), puffLayer(mid, 12, seaMat), puffLayer(far, 10, seaMat));

  // 솟은 뭉게구름 탑(양옆)
  const towerMat = cloudMat('#ffffff', '#9eaae6', { fog: true, light });
  const towers = [
    [-halfW(w, -34) - 2, -1.5, -34, 18, 12],
    [halfW(w, -42) + 3, -1.5, -42, 22, 15],
    [-30, -2, -110, 34, 18],
    [40, -2, -130, 38, 20],
  ];
  for (const [x, y, z, ww, hh] of towers) {
    const m = cumulus(r, { w: ww, h: hh, n: 26, seg: 14, d: ww * 0.6 }, towerMat);
    m.position.set(x, y, z);
    root.add(m);
  }

  // 해
  const sunGlow = glowSprite('#fff6d8', 60, 0.85);
  sunGlow.position.set(-55, 70, -220);
  const sunCore = glowSprite('#ffffff', 16, 1.0);
  sunCore.position.set(-55, 70, -219);
  root.add(sunGlow, sunCore);

  // 떠다니는 작은 구름(하늘 양옆, 지평선 근처)
  const puff = cloudMat('#ffffff', '#b2bdef', { light });
  const sky = G(root);
  const drift = cloudLayer(sky, 69, [
    { x: 22, y: 20, z: -115, w: 16, h: 6, n: 14, seg: 12, speed: 0.35, span: 70 },
    { x: -30, y: 30, z: -140, w: 20, h: 6, n: 14, seg: 12, speed: 0.28, span: 80 },
    { x: 7, y: 8, z: -70, w: 9, h: 3.5, n: 12, seg: 12, speed: 0.4, span: 50 },
    { x: -12, y: 5, z: -46, w: 6, h: 2.4, n: 10, seg: 12, speed: 0.5, span: 40 },
    { x: 40, y: 48, z: -170, w: 26, h: 6, n: 12, seg: 10, speed: 0.2, span: 95 },
  ], puff);

  const env = {
    sky: { top: '#1f52cf', mid: '#5a9cf2', horizon: '#e4f2ff', sunDir: [-0.55, 0.6, -1], sunColor: '#fff6d8', sunStrength: 0.9, sunSize: 0.004 },
    fog: { color: '#d4e8ff', near: 40, far: 440 },
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
