// 6. 구름바다(구름 위, 눈부신 한낮): 지평선까지 이어지는 몽글몽글한 구름 바다, 솟아오른 뭉게구름 탑, 밝은 해(블룸),
//    왼쪽에 떠 있는 풀섬(나무·작은 폭포·종탑), 오른쪽 멀리 작은 섬과 무지개, 떠다니는 작은 구름.
//    땅 대신 푹신한 구름 바닥이 지구인(열기구 탄 사람) 발밑에 깔린다.
//    값 구조: 앞 솜은 라벤더 그늘이 깊고, 가운데 구름 바다는 눈부시게 하얗고, 먼 구름은 하늘빛 안개 속으로.
import {
  THREE, P, G, bake, terrain, cloudLayer, cloudMat, cumulus, halfW, rng, TAU, sphereGeo, coneGeo, latheGeo,
  roundBoxGeo, mergeGeometries, roundTree, bush, rock, LEAF, glowS, sharedMat, inkLine, dimWithWeather,
} from './common.js';

// 구름 바닥 높이: 둥근 봉우리(돔)들을 겹친다. 가까운 곳은 낮고 잔잔하게, 멀수록 크고 높게.
// info(x, z) 는 높이와 함께 "봉우리 안쪽 정도"(0 = 봉우리 사이 골짜기, 1 = 꼭대기)를 돌려준다 → 골짜기를 그늘지게.
function makeField(seed) {
  const r = rng(seed);
  const domes = [];
  for (let i = 0; i < 60; i++) domes.push([(r() * 2 - 1) * 9, -1.5 - r() * 6.5, 0.7 + r() * 0.9, 0.35 + r() * 0.5]);
  for (let i = 0; i < 90; i++) {
    const z = -7 - r() * 45;
    const rr = 1.6 + r() * 2.6 + (-z) * 0.06;
    domes.push([(r() * 2 - 1) * (6 + (-z) * 0.5), z, rr, rr * (0.45 + r() * 0.35)]);
  }
  for (let i = 0; i < 110; i++) {
    const z = -50 - r() * 230;
    const rr = 6 + r() * 9 + (-z) * 0.05;
    domes.push([(r() * 2 - 1) * (20 + (-z) * 0.55), z, rr, rr * (0.3 + r() * 0.3)]);
  }
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
    if (z > -0.95 && z < 0.95) h = Math.min(h, 0.06);
    else if (z >= 0.95) h = Math.min(h, 0.12);
    out.h = h;
    out.k = k;
    return out;
  };
}

/** 구름 바닥 재질: 법선 그늘 + 꼭짓점 색(골짜기 그늘). */
function floorMat() {
  return sharedMat('cloudsea:floor', () => {
    const base = cloudMat('#ffffff', '#8f9ce4', { fog: true, light: [-0.35, 0.9, -0.35], mid: '#d2d8f8' });
    const m = base.clone();
    m.vertexColors = true;
    m.customProgramCacheKey = () => 'cloudFloor';
    m.onBeforeCompile = base.onBeforeCompile;
    return m;
  });
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

/** 떠 있는 풀섬: 거꾸로 선 바위 뿌리 + 풀 덮인 윗면 + 나무 + 작은 종탑 + 폭포. */
function floatingIsland(parent, x, y, z, s, r, { tower = true, fall = true } = {}) {
  const g = G(parent, x, y, z, 0.3, s);
  const rockTT = ['#8a5070', '#f0b888'];
  const root = latheGeo([[0, -2.6], [0.35, -2.2], [0.9, -1.5], [1.5, -0.8], [2.0, -0.3], [2.25, -0.05], [2.3, 0]], 14, 'islandRoot');
  g.add(P(root, '', { tt: rockTT, fin: 'soft' }));
  for (const [rx, ry, rz, sc] of [[0.9, -1.0, 1.2, 0.9], [-1.3, -0.7, 0.9, 1.0], [0.2, -1.8, 0.6, 0.7], [1.6, -0.4, -0.6, 0.8]]) {
    g.add(P(sphereGeo(1, 10, 7), '', { pos: [rx, ry, rz], scale: [0.6 * sc, 0.75 * sc, 0.55 * sc], tt: rockTT, fin: 'soft' }));
  }
  // 풀 윗면(두툼한 방석, 가장자리가 둥글게 넘어간다)
  g.add(P(sphereGeo(1, 22, 10), '', { pos: [0, 0.05, 0], scale: [2.42, 0.42, 2.42], tt: ['#3f9a4a', '#b4e25a', 0.2] }));
  roundTree(g, -0.8, 0.35, -0.3, 1.15, r, { leaf: LEAF.fresh, seg: 12 });
  roundTree(g, 0.9, 0.35, -0.9, 0.85, r, { leaf: LEAF.meadow, seg: 10 });
  bush(g, 1.2, 0.35, 0.8, 0.9, r, { flowers: 4, flowerColor: '#ff8fb0', seg: 9 });
  bush(g, -1.4, 0.35, 0.9, 0.8, r, { flowers: 3, flowerColor: '#ffffff', seg: 9 });
  rock(g, 0.3, 0.33, 1.4, 0.8, r);
  if (tower) {
    // 작은 종탑(하얀 벽, 파란 고깔)
    const t = G(g, 0.2, 0.35, 0.2, 0, 1);
    t.add(P(roundBoxGeo(0.62, 1.3, 0.62, 0.06, 1), '', { pos: [0, 0.65, 0], fin: 'soft', tt: ['#c8c0e0', '#fffaf0'] }));
    t.add(P(roundBoxGeo(0.72, 0.1, 0.72, 0.04, 1), '#d8cce8', { pos: [0, 1.32, 0], fin: 'soft' }));
    t.add(P(coneGeo(0.55, 0.9, 4), '', { pos: [0, 1.8, 0], rot: [0, Math.PI / 4, 0], fin: 'soft', tt: ['#3456b0', '#7fa4f0'] }));
    t.add(P(sphereGeo(1, 8, 6), '#ffd23f', { pos: [0, 2.3, 0], scale: 0.07, fin: 'soft' }));
    t.add(P(roundBoxGeo(0.24, 0.32, 0.05, 0.08, 2), '#2e3768', { pos: [0, 1.0, 0.31], fin: 'soft' }));
    t.add(P(sphereGeo(1, 10, 8), '#ffd23f', { pos: [0, 0.98, 0.3], scale: [0.07, 0.08, 0.04], fin: 'soft' }));
    t.add(P(roundBoxGeo(0.22, 0.4, 0.05, 0.08, 2), '#8f5a3a', { pos: [0, 0.2, 0.31], fin: 'soft' }));
  }
  if (fall) {
    // 폭포: 가장자리에서 아래로 떨어지는 옅은 물줄기 + 아래 물보라 솜
    const wf = new THREE.Mesh(sharedMat('cloudsea:fallGeo', () => {
      const fg = new THREE.PlaneGeometry(0.42, 2.6, 1, 6);
      fg.translate(0, -1.3, 0);
      const p = fg.attributes.position;
      for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) * (1 + (-p.getY(i) / 2.6) * 0.6));
      fg.userData.shared = true;
      return fg;
    }), sharedMat('cloudsea:fall', () => {
      const tex = new THREE.CanvasTexture((() => {
        const cv = document.createElement('canvas');
        cv.width = 32;
        cv.height = 128;
        const c = cv.getContext('2d');
        const gr = c.createLinearGradient(0, 0, 0, 128);
        gr.addColorStop(0, 'rgba(180,230,255,0.95)');
        gr.addColorStop(0.7, 'rgba(220,245,255,0.6)');
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = gr;
        c.fillRect(0, 0, 32, 128);
        c.fillStyle = 'rgba(255,255,255,0.7)';
        for (let i = 0; i < 14; i++) c.fillRect(4 + ((i * 7) % 24), (i * 37) % 120, 2, 18);
        return cv;
      })());
      tex.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    }));
    wf.position.set(1.65, 0.25, 1.55);
    wf.rotation.y = 0.8;
    wf.userData.dynamic = true;
    g.add(wf);
    g.add(P(sphereGeo(1, 10, 7), '#ffffff', { pos: [1.85, -2.3, 1.7], scale: [0.5, 0.3, 0.4], fin: 'unlit', cast: false, ao: false }));
  }
  inkLine(g, 0.06);
  return g;
}

/** 무지개(띠 여섯 줄, 반투명). 꼭짓점 색을 쓰는 반원 고리. */
function rainbow(parent, x, y, z, R, width) {
  const geo = sharedMat(`cloudsea:rainbow${R}|${width}`, () => {
    const bands = ['#ff6a6a', '#ffb04a', '#fff06a', '#7ee07a', '#6ab4ff', '#a88aff'];
    const rg = new THREE.RingGeometry(R - width, R, 64, bands.length, 0, Math.PI);
    const p = rg.attributes.position;
    const col = new Float32Array(p.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const rad = Math.hypot(p.getX(i), p.getY(i));
      const t = (R - rad) / width; // 0 = 바깥(빨강) → 1 = 안(보라)
      const k = Math.min(bands.length - 1, t * (bands.length - 1));
      const a = Math.floor(k);
      c.set(bands[a]).lerp(new THREE.Color(bands[Math.min(bands.length - 1, a + 1)]), k - a);
      const edge = Math.sin(Math.min(1, Math.max(0, t)) * Math.PI);
      col.set([c.r * edge, c.g * edge, c.b * edge], i * 3);
    }
    rg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    rg.userData.shared = true;
    return rg;
  });
  const m = new THREE.Mesh(geo, sharedMat('cloudsea:rainbowMat', () => dimWithWeather('cloudsea:rainbow', new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }))));
  m.position.set(x, y, z);
  m.renderOrder = -2;
  parent.add(m);
  return m;
}

/** @param {{w:number,h:number}} size */
export function buildCloudsea({ w }) {
  const root = new THREE.Group();
  const r = rng(67);
  const light = [-0.55, 0.75, 0.35];
  // 구름 바다는 위에서 내리쬐는 빛으로: 윗면은 하얗고 카메라 쪽 옆면은 라벤더 그늘(겹겹이 띠가 진다)
  const seaMat = cloudMat('#ffffff', '#5f68c4', { fog: true, light: [-0.35, 0.9, -0.35], mid: '#b6bcf0', steps: [-0.6, 0.2, 0.32, 0.9], rim: 0.4 });

  // 바닥(통로와 그 앞): 잔잔한 솜 바닥 + 아래 깔개(구멍 메우기)
  const info = makeField(67);
  const shadeC = [0.72, 0.74, 0.96];
  const floor = terrain({
    H: (x, z) => (z > -3 ? info(x, z).h : -0.7),
    C: (x, y, z) => {
      const k = z > -1 ? 1 : info(x, z).k;
      const t = Math.min(1, k / 0.55);
      let a = 1 - (1 - t * t) * 0.62;
      // 앞쪽은 살짝 그늘(액자)
      a *= 1 - 0.12 * Math.min(1, Math.max(0, (z - 1) / 6));
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
  for (let i = 0; i < 26; i++) {
    const z = 1.1 + r() * 2.4;
    const x = (r() * 2 - 1) * (halfW(w, z) + 0.5);
    const rr = 0.25 + r() * 0.3;
    near.push([x, 0.1 - rr * 0.82, z, rr]);
  }
  root.add(puffLayer(near, 14, seaMat), puffLayer(mid, 12, seaMat), puffLayer(far, 10, seaMat));

  // 솟은 뭉게구름 탑(양옆)
  const towerMat = cloudMat('#ffffff', '#8490dc', { fog: true, light, mid: '#d8dcfa' });
  const towers = [
    [-halfW(w, -34) - 2, -1.5, -34, 18, 12],
    [halfW(w, -42) + 3, -1.5, -42, 22, 15],
    [-30, -2, -110, 34, 18],
    [40, -2, -130, 38, 20],
  ];
  for (const [x, y, z, ww, hh] of towers) {
    const m = cumulus(r, { w: ww, h: hh, n: 24, seg: 13, d: ww * 0.6 }, towerMat);
    m.position.set(x, y, z);
    root.add(m);
  }

  // 떠 있는 섬(왼쪽 가까이 큰 섬, 오른쪽 멀리 작은 섬) — 천천히 오르내린다
  const props = G(root);
  const isl = floatingIsland(props, -halfW(w, -22) * 0.55, 2.9, -22, 1.15, r);
  const isl2 = floatingIsland(props, halfW(w, -70) * 0.62, 6.5, -70, 1.4, r, { tower: false, fall: false });
  for (const g of [isl, isl2]) g.userData.dynamic = true;
  bake(isl, { ao: 0.2 });
  bake(isl2, { ao: 0.2 });
  for (const g of [isl, isl2]) g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = false;
      o.receiveShadow = false;
    }
  });
  // 섬 둘레 작은 솜
  const puffs = [];
  for (const [ix, iy, iz, s] of [[isl.position.x, isl.position.y, -22, 1.0], [isl2.position.x, isl2.position.y, -70, 1.25]]) {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + r();
      puffs.push([ix + Math.cos(a) * 2.2 * s, iy - 0.6 * s - r() * 0.8 * s, iz + Math.sin(a) * 1.4 * s + 0.6, (0.45 + r() * 0.35) * s]);
    }
  }
  root.add(puffLayer(puffs, 12, towerMat));

  // 무지개(오른쪽 멀리, 구름 바다에서 솟는다)
  rainbow(root, 34, -6, -170, 34, 6);

  // 해(블룸)
  const sunGlow = glowS('cloudsea:sunGlow', '#fff6d8', 60, 0.85);
  sunGlow.position.set(-55, 70, -220);
  const sunCore = glowS('cloudsea:sunCore', '#ffffff', 16, 1.0, 1.8);
  sunCore.position.set(-55, 70, -219);
  dimWithWeather('cloudsea:sunGlow', sunGlow.material);
  dimWithWeather('cloudsea:sunCore', sunCore.material);
  root.add(sunGlow, sunCore);

  // 떠다니는 작은 구름(하늘 양옆, 지평선 근처)
  const puff = cloudMat('#ffffff', '#949fe8', { light, mid: '#dfe3fb' });
  const sky = G(root);
  const drift = cloudLayer(sky, 69, [
    { x: 22, y: 20, z: -115, w: 16, h: 6, n: 14, seg: 12, speed: 0.35, span: 70 },
    { x: -30, y: 30, z: -140, w: 20, h: 6, n: 14, seg: 12, speed: 0.28, span: 80 },
    { x: 7, y: 8, z: -70, w: 9, h: 3.5, n: 12, seg: 12, speed: 0.4, span: 50 },
    { x: -12, y: 5, z: -46, w: 6, h: 2.4, n: 10, seg: 12, speed: 0.5, span: 40 },
    { x: 40, y: 48, z: -170, w: 26, h: 6, n: 12, seg: 10, speed: 0.2, span: 95 },
  ], puff);

  const env = {
    sky: { top: '#1a4ed0', mid: '#5a9cf4', horizon: '#e2f2ff', sunDir: [-0.55, 0.6, -1], sunColor: '#fff6d8', sunStrength: 0.9, sunSize: 0.004 },
    fog: { color: '#d0e6ff', near: 55, far: 520 },
    sun: { color: '#fff4e0', intensity: 2.4, dir: [-0.6, 1, 0.6] },
    hemi: { sky: '#c0dcff', ground: '#d8e0ff', intensity: 0.95 },
    exposure: 1.0,
    grade: { saturation: 1.14, contrast: 1.07, vignette: 0.18, bloom: 0.5 },
  };

  const y1 = isl.position.y;
  const y2 = isl2.position.y;
  return {
    group: root,
    env,
    update(t) {
      drift(t);
      isl.position.y = y1 + Math.sin(t * 0.6) * 0.12;
      isl2.position.y = y2 + Math.sin(t * 0.45 + 1) * 0.18;
    },
  };
}
