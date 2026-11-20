// 장난감 마을 지붕 위 무대 + 조명 + 하늘
import * as THREE from 'three';
import { V, PI, ST, tone, lacquer, matte, metal, glowM, basicHDR, mesh, sph, rbox, cyl, torus, rng, texTiles, texPlanks, texShingle, texWindow, texClock, texMoon, texSky, texRadial } from './lib.js';

let TILES, SHING, WIN;
export function ndcPoint(cam, x, y, dist) {
  cam.updateMatrixWorld(); cam.updateProjectionMatrix();
  const p = V(x, y, 0.5).unproject(cam).sub(cam.position).normalize();
  return cam.position.clone().addScaledVector(p, dist);
}

export function lights(scene, slow, { keyPos = [5, 9, 8], target = [0, 0, -1], shadowSize = 7, k = 1 } = {}) {
  scene.add(new THREE.HemisphereLight(slow ? 0xb2c4de : 0x8d9fd8, slow ? 0x2a3044 : 0x4a3438, (slow ? 0.55 : 0.5) * k));
  const key = new THREE.DirectionalLight(slow ? 0xf6f1ea : 0xffcf9a, (slow ? 1.75 : 2.1) * k);
  key.position.set(...keyPos); key.target.position.set(...target);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  const sc = key.shadow.camera; sc.left = sc.bottom = -shadowSize; sc.right = sc.top = shadowSize; sc.near = 1; sc.far = 40;
  key.shadow.radius = 5; key.shadow.blurSamples = 16; key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(slow ? 0xa8ccff : 0x8fbfff, (slow ? 3.0 : 2.6) * k);
  rim.position.set(-5, 6, -12); scene.add(rim);
  const fill = new THREE.DirectionalLight(slow ? 0x8ea6c8 : 0x8f7fc0, 0.45 * k); fill.position.set(-6, 3, 6); scene.add(fill);
  return { key, rim };
}

export function sky(scene, slow) {
  scene.background = slow
    ? texSky([[0, '#18213a'], [0.12, '#26344f'], [0.22, '#4b6080'], [0.3, '#7488a2'], [1, '#7488a2']])
    : texSky([[0, '#11173d'], [0.12, '#212e6e'], [0.22, '#4b4f95'], [0.3, '#a8708a'], [1, '#a8708a']]);
  scene.fog = new THREE.Fog(slow ? 0x63778f : 0x4a4f8a, 12, 34);
}

// 가게 집 한 채
function house(g, { x, z, y0, w, d, h, wall, roof, rot = 0, win = 2, chimney = false, r }) {
  const grp = new THREE.Group(); grp.position.set(x, y0, z); grp.rotation.y = rot;
  grp.add(rbox(w, h, d, 0.1, lacquer(wall, { roughness: 0.65, clearcoat: 0.3 }), [0, h / 2, 0]));
  // 박공 지붕
  const rh = w * 0.42, o = 0.16;
  const s = new THREE.Shape(); s.moveTo(-w / 2 - o, 0); s.lineTo(0, rh); s.lineTo(w / 2 + o, 0); s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: d + 0.2, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 3 });
  geo.translate(0, 0, -(d + 0.2) / 2);
  const rm = new THREE.MeshPhysicalMaterial({ color: tone(roof), map: SHING.map, bumpMap: SHING.bump, bumpScale: 2.5, roughness: 0.55, clearcoat: 0.4 });
  rm.map.repeat.set(1.6, 1.6); rm.bumpMap.repeat.set(1.6, 1.6);
  grp.add(mesh(geo, rm, [0, h - 0.02, 0]));
  grp.add(cyl(0.07, 0.07, d + 0.35, lacquer(roof), [0, h + rh + 0.03, 0], [PI / 2, 0, 0]));
  // 창문 (앞면 +z)
  const wm = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: tone(0xffc27a, 0.5), emissiveMap: WIN, emissiveIntensity: ST.slow ? 2.0 : 2.4 });
  const frame = lacquer(0xf6ecd8, { roughness: 0.5 });
  const n = win, sp = w / (n + 1);
  for (let i = 0; i < n; i++) {
    if (r() < 0.25) continue;
    const wx = -w / 2 + sp * (i + 1), wy = h * (0.45 + r() * 0.15);
    grp.add(rbox(0.36, 0.5, 0.06, 0.03, frame, [wx, wy, d / 2 + 0.01]));
    grp.add(mesh(new THREE.PlaneGeometry(0.28, 0.42), wm, [wx, wy, d / 2 + 0.045], [0, 0, 0], 1, false));
  }
  // 박공 둥근 다락창
  if (r() < 0.75) {
    grp.add(cyl(0.22, 0.22, 0.06, frame, [0, h + rh * 0.36, d / 2 + 0.19], [PI / 2, 0, 0], 28));
    grp.add(mesh(new THREE.CircleGeometry(0.165, 28), wm, [0, h + rh * 0.36, d / 2 + 0.225], [0, 0, 0], 1, false));
  }
  if (chimney) {
    grp.add(rbox(0.32, 0.8, 0.32, 0.05, lacquer(0xb86b52, { roughness: 0.7 }), [w * 0.25, h + rh * 0.5 + 0.2, -d * 0.15]));
    grp.add(rbox(0.42, 0.1, 0.42, 0.04, lacquer(0x5a4a48), [w * 0.25, h + rh * 0.5 + 0.62, -d * 0.15]));
  }
  g.add(grp);
}

function lantern(g, p, slow, s = 1) {
  const grp = new THREE.Group(); grp.position.set(...p); grp.scale.setScalar(s);
  const dark = lacquer(0x3a2c2a);
  grp.add(cyl(0.035, 0.045, 0.9, dark, [0, 0.45, 0]));
  grp.add(cyl(0.12, 0.12, 0.05, dark, [0, 0.9, 0]));
  grp.add(sph(1, glowM(0xffb768, slow ? 1.6 : 3.0, 0.4), [0, 1.08, 0], [0.16, 0.2, 0.16]));
  grp.add(cyl(0.09, 0.12, 0.05, dark, [0, 1.29, 0]));
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: texRadial([[0, 'rgba(255,200,130,0.55)'], [0.4, 'rgba(255,170,90,0.18)'], [1, 'rgba(255,150,80,0)']]), color: tone(0xffffff, 0.5), depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  halo.position.set(0, 1.08, 0); halo.scale.setScalar(slow ? 1.2 : 1.8); grp.add(halo);
  g.add(grp);
  return grp;
}

export function town(scene, cam, { slow = false, deck = true, clockNdc = [0.42, 0.66], clockDist = 22, moonNdc = [-0.55, 0.84], rowsZ = [-6.4, -8.8, -11.6], rowsY = [-3.7, -3.6, -3.9], moonSize = 24, simple = false } = {}) {
  TILES ||= texPlanks(); SHING ||= texShingle(); WIN ||= texWindow();
  const g = new THREE.Group(); scene.add(g);
  const r = rng(slow ? 21 : 21);

  if (deck) {
    // 바닥 타일 데크
    const tm = new THREE.MeshPhysicalMaterial({ color: tone(0xe0a46c), map: TILES.map, bumpMap: TILES.bump, bumpScale: 1.4, roughness: 0.6, clearcoat: 0.12, clearcoatRoughness: 0.5, envMapIntensity: 0.35 });
    tm.map.repeat.set(2.6, 1.7); tm.bumpMap.repeat.set(2.6, 1.7);
    g.add(mesh(new THREE.PlaneGeometry(6.7, 10), tm, [0, 0, 1.2], [-PI / 2, 0, 0], 1, false));
    g.add(rbox(7.0, 0.8, 10.3, 0.08, lacquer(0xe6d3b8, { roughness: 0.7 }), [0, -0.42, 1.2]));
    // 난간 (양옆 + 뒤)
    const wallM = lacquer(0xf1e2c6, { roughness: 0.6, clearcoat: 0.4 }), capM = lacquer(0xc7745a, { roughness: 0.5 });
    for (const sx of [-1, 1]) {
      g.add(rbox(0.28, 0.32, 10, 0.06, wallM, [sx * 3.35, 0.16, 1.2]));
      g.add(rbox(0.38, 0.09, 10.1, 0.04, capM, [sx * 3.35, 0.36, 1.2]));
    }
    g.add(rbox(7.0, 0.32, 0.28, 0.06, wallM, [0, 0.16, -3.8]));
    g.add(rbox(7.1, 0.09, 0.38, 0.04, capM, [0, 0.36, -3.8]));
    for (const [x, z] of [[-3.35, -3.8], [3.35, -3.8], [-3.35, 1.0], [3.35, 1.0]]) {
      lantern(g, [x, 0.4, z], slow);
      const pl = new THREE.PointLight(tone(0xffb060, 0.45), slow ? 3 : 6, 4.5, 1.6); pl.position.set(x * 0.92, 1.5, z); g.add(pl);
    }
  }

  // 뒤쪽 집들 (낮은 지붕들이 겹겹이)
  const walls = [0xf4e3c1, 0xf3c7b5, 0xcfe4d4, 0xdcd2f0, 0xf7dc9e, 0xeed5c6, 0xc9dcef];
  const roofs = [0xd2644a, 0x4f7fc0, 0x3c9488, 0xbd4f63, 0x7c5fb0, 0xdf8a3c, 0x5a6fb8];
  const rows = simple ? [] : rowsZ;
  rows.forEach((z, ri) => {
    for (let x = -8 + (ri % 2) * 1.1; x < 8.5; x += 2.0 + r() * 0.6) {
      const w = 1.4 + r() * 0.5, h = 1.7 + r() * 0.9 + ri * 0.35;
      house(g, { x, z: z - r() * 0.6, y0: rowsY[ri] + r() * 0.3, w, d: 1.5 + r() * 0.4, h, wall: walls[(r() * walls.length) | 0], roof: roofs[(r() * roofs.length) | 0], rot: (r() - 0.5) * 0.25, win: 2, chimney: r() < 0.45, r });
    }
  });

  // 시계탑
  const cp = ndcPoint(cam, clockNdc[0], clockNdc[1], clockDist);
  const T = new THREE.Group(); T.position.copy(cp); g.add(T);
  T.lookAt(cam.position.x, cp.y, cam.position.z);
  const plaster = lacquer(0xf0dcc0, { roughness: 0.7, clearcoat: 0.3 }), trim = lacquer(0x7c5a8c, { roughness: 0.5 });
  T.add(rbox(2.5, 16, 2.1, 0.18, plaster, [0, -6.6, -0.1]));
  T.add(rbox(2.8, 0.28, 2.4, 0.08, trim, [0, 1.45, -0.1]));
  T.add(rbox(2.8, 0.28, 2.4, 0.08, trim, [0, -1.45, -0.1]));
  T.add(cyl(1.15, 1.15, 0.12, trim, [0, 0, 0.98], [PI / 2, 0, 0], 64));
  T.add(mesh(new THREE.CircleGeometry(1.0, 64), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: ST.slow ? 0xdfe6ee : 0xfff3dc, emissiveMap: texClock(slow), emissiveIntensity: slow ? 0.85 : 1.25 }), [0, 0, 1.05], [0, 0, 0], 1, false));
  T.add(torus(1.03, 0.06, metal(0xe2b24e, { roughness: 0.3 }), [0, 0, 1.06]));
  T.add(rbox(2.1, 1.3, 1.8, 0.12, plaster, [0, 2.25, -0.1]));
  const wm = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: tone(0xffc27a, 0.38), emissiveMap: WIN, emissiveIntensity: slow ? 1.3 : 2.2 });
  for (const sx of [-0.5, 0.5]) T.add(mesh(new THREE.PlaneGeometry(0.42, 0.75), wm, [sx, 2.2, 0.81], [0, 0, 0], 1, false));
  for (const yy of [-3.2, -5.4]) T.add(mesh(new THREE.PlaneGeometry(0.42, 0.7), wm, [0, yy, 0.96], [0, 0, 0], 1, false));
  const roofM = new THREE.MeshPhysicalMaterial({ color: tone(0x3f6fb0), map: SHING.map, bumpMap: SHING.bump, bumpScale: 2, roughness: 0.5, clearcoat: 0.5 });
  T.add(mesh(new THREE.ConeGeometry(1.95, 2.8, 4, 1), roofM, [0, 4.3, -0.1], [0, PI / 4, 0]));
  T.add(sph(0.16, metal(0xe8b450, { roughness: 0.25 }), [0, 5.8, -0.1]));
  T.add(cyl(0.03, 0.03, 0.8, metal(0xe8b450), [0, 6.2, -0.1]));

  // 달 + 별
  const mp = ndcPoint(cam, moonNdc[0], moonNdc[1], 70);
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: texMoon(), fog: false, depthWrite: false, color: slow ? 0xe6eef8 : 0xffffff }));
  moon.position.copy(mp); moon.scale.setScalar(moonSize); g.add(moon);
  const sp = [];
  for (let i = 0; i < 70; i++) { const p = ndcPoint(cam, r() * 2 - 1, 0.55 + r() * 0.45, 80); sp.push(p.x, p.y, p.z); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  g.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xdfe8ff, size: 2.2, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.8 })));
  return g;
}

// 접지 그림자(부드러운 원)
let BLOB;
export function blob(size = 0.8, opacity = 0.45) {
  BLOB ||= texRadial([[0, 'rgba(0,0,0,1)'], [0.45, 'rgba(0,0,0,0.55)'], [1, 'rgba(0,0,0,0)']], 128);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: BLOB, transparent: true, opacity, depthWrite: false, color: 0x0a0c18 }));
  m.rotation.x = -PI / 2; m.position.y = 0.006; m.renderOrder = 1;
  return m;
}
