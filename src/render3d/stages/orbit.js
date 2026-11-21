// 7. 궤도(우주): 별이 가득한 짙은 남색 우주와 옅은 성운, 화면 아래를 채우는 둥근 지구(바다·초록 땅·흰 구름, 대기 테두리 빛),
//    지구 가장자리에서 떠오르는 해. 우주인은 z = 0 근처 y ≈ 0.8 에 떠 있다.
import { THREE, G, rng, cachedTex, starField, glowPoints, fbm } from './common.js';
import { glowSprite } from '../kit.js';

const R = 70;
const C = new THREE.Vector3(0, -66, -150);

// 이음매 없는(가로로 반복되는) 잡음
function wrapNoise(u, v, f, oct = 4) {
  const a = fbm(u * f, v * f, oct);
  if (u < 0.85) return a;
  const k = (u - 0.85) / 0.15;
  return a + (fbm((u - 1) * f, v * f, oct) - a) * k * k * (3 - 2 * k);
}

function earthTex() {
  return cachedTex('earth', 1024, 512, (ctx, W, Hh) => {
    const img = ctx.createImageData(W, Hh);
    const d = img.data;
    const deep = [28, 86, 196];
    const shallow = [70, 170, 225];
    const green = [86, 178, 82];
    const green2 = [52, 138, 70];
    const sand = [222, 196, 128];
    const ice = [240, 246, 255];
    for (let y = 0; y < Hh; y++) {
      const v = y / Hh;
      const lat = Math.abs(v - 0.5) * 2;
      for (let x = 0; x < W; x++) {
        const u = x / W;
        const n = wrapNoise(u, v, 3.5) + 0.08 * (wrapNoise(u, v, 11.5, 2) - 0.5);
        const m = wrapNoise(u, v + 3.7, 5.5, 2);
        const land = n - 0.53;
        const sea = deep.map((k, i) => k + (shallow[i] - k) * Math.max(0, 1 + land * 12) ** 2);
        let g = green.map((k, i) => k + (green2[i] - k) * Math.min(1, Math.max(0, land) * 9));
        if (m > 0.56 && lat < 0.6) g = g.map((k, i) => k + (sand[i] - k) * Math.min(1, (m - 0.56) * 6));
        const coast = Math.min(1, Math.max(0, (land + 0.004) / 0.012));
        const beach = Math.max(0, 1 - Math.abs(land - 0.004) / 0.01) * 0.6;
        let c = sea.map((k, i) => k + (g[i] - k) * coast);
        c = c.map((k, i) => k + (sand[i] - k) * beach);
        const ic = Math.min(1, Math.max(0, (lat - 0.82 - 0.06 * (n - 0.5)) * 25));
        if (ic > 0) c = c.map((k, i) => k + (ice[i] - k) * ic);
        const o = (y * W + x) * 4;
        d[o] = c[0];
        d[o + 1] = c[1];
        d[o + 2] = c[2];
        d[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  });
}

function cloudTex() {
  return cachedTex('earthClouds', 1024, 512, (ctx, W, Hh) => {
    const img = ctx.createImageData(W, Hh);
    const d = img.data;
    for (let y = 0; y < Hh; y++) {
      const v = y / Hh;
      for (let x = 0; x < W; x++) {
        const u = x / W;
        const n = wrapNoise(u, v * 2.8, 4.5, 3) * 0.7 + wrapNoise(u, v * 2, 7, 2) * 0.3;
        const a = Math.max(0, Math.min(1, (n - 0.5) * 5));
        const o = (y * W + x) * 4;
        d[o] = d[o + 1] = d[o + 2] = 255;
        d[o + 3] = a * 235;
      }
    }
    ctx.putImageData(img, 0, 0);
  });
}

function nebulaTex() {
  return cachedTex('nebula', 512, 512, (ctx, W) => {
    const r = rng(83);
    ctx.clearRect(0, 0, W, W);
    const cols = ['120,80,220', '220,90,170', '50,150,230', '60,190,200', '90,60,200'];
    for (let i = 0; i < 40; i++) {
      const x = W * (0.2 + r() * 0.6);
      const y = W * (0.25 + r() * 0.5);
      const rr = 40 + r() * 140;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rr);
      const c = cols[(r() * cols.length) | 0];
      g.addColorStop(0, `rgba(${c},0.15)`);
      g.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, W);
    }
  });
}

const atmoMats = new Map();
/** 대기 테두리 빛(가장자리에서 밝아지는 덧그리기). */
function atmosphere(color, power, strength, side) {
  const key = `${color}|${power}|${strength}|${side}`;
  let m = atmoMats.get(key);
  if (m) return m;
  m = new THREE.ShaderMaterial({
    uniforms: { col: { value: new THREE.Color(color) }, pw: { value: power }, k: { value: strength } },
    vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 wp = modelMatrix * vec4(position,1.0); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - wp.xyz); gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: `uniform vec3 col; uniform float pw; uniform float k; varying vec3 vN; varying vec3 vV;
      void main(){ float f = 1.0 - abs(dot(normalize(vN), normalize(vV))); float a = pow(f, pw) * k; gl_FragColor = vec4(col * a, a);
      #include <colorspace_fragment>
      }`,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side,
    fog: false,
  });
  atmoMats.set(key, m);
  return m;
}

const earthMats = new Map();
function earthMat(key, make) {
  let m = earthMats.get(key);
  if (!m) earthMats.set(key, (m = make()));
  return m;
}

/** @param {{w:number,h:number}} size */
export function buildOrbit({ w }) {
  const root = new THREE.Group();

  // 지구: 극이 카메라 쪽을 보게 눕혀서, 적도 띠가 위쪽 가장자리를 지나가게 한다
  const earth = G(root, C.x, C.y, C.z);
  const spin = G(earth);
  spin.rotation.x = -Math.PI / 2 + 0.25;
  const turn = G(spin);
  // 텍스처를 가로로 두 번 감아(보이는 쪽은 지구의 일부뿐이라 티가 안 난다) 화면에서 더 또렷하게
  const eTex = earthTex();
  eTex.wrapS = THREE.RepeatWrapping;
  eTex.repeat.set(2, 1);
  const cTex = cloudTex();
  cTex.wrapS = THREE.RepeatWrapping;
  cTex.repeat.set(2, 1);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(R, 96, 64), earthMat('e', () => new THREE.MeshStandardMaterial({ map: eTex, roughness: 0.75, metalness: 0, envMapIntensity: 0.3 })));
  ball.userData.ownGeometry = true;
  turn.add(ball);
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(R * 1.008, 96, 64), earthMat('c', () => new THREE.MeshStandardMaterial({ map: cTex, transparent: true, roughness: 1, depthWrite: false })));
  clouds.userData.ownGeometry = true;
  const cloudTurn = G(spin);
  cloudTurn.add(clouds);
  // 대기: 안쪽 테두리 + 바깥 후광
  const atmoIn = new THREE.Mesh(new THREE.SphereGeometry(R * 1.012, 96, 48), atmosphere('#7fd0ff', 2.2, 0.9, THREE.FrontSide));
  const atmoOut = new THREE.Mesh(new THREE.SphereGeometry(R * 1.06, 96, 48), atmosphere('#5aa8ff', 5.0, 2.2, THREE.BackSide));
  for (const m of [atmoIn, atmoOut]) {
    m.userData.ownGeometry = true;
    earth.add(m);
  }
  ball.receiveShadow = false;
  ball.castShadow = false;

  // 별, 성운
  const stars = starField(79, { n: 900, yMin: -0.05, size: [2.4, 5.5], big: 0.12 });
  root.add(stars);
  const neb = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), earthMat('neb', () => new THREE.MeshBasicMaterial({ map: nebulaTex(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })));
  neb.userData.ownGeometry = true;
  neb.position.set(40, 120, -330);
  neb.scale.set(420, 300, 1);
  neb.renderOrder = -5;
  root.add(neb);
  const neb2 = neb.clone();
  neb2.position.set(-150, 60, -300);
  neb2.scale.set(300, 220, 1);
  neb2.rotation.z = 0.8;
  root.add(neb2);

  // 지구 가장자리 너머의 해
  const sunGlow = glowSprite('#ffe9c0', 70, 0.6);
  sunGlow.position.set(-62, 5, -330);
  const sunCore = glowSprite('#ffffff', 16, 1.0);
  sunCore.position.set(-62, 4.5, -329);
  const streak = glowSprite('#cfe6ff', 1, 0.5);
  streak.scale.set(220, 5, 1);
  streak.position.set(-62, 4.5, -328);
  root.add(sunGlow, sunCore, streak);
  // 먼 달
  const moon = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), earthMat('moon', () => new THREE.MeshStandardMaterial({ color: '#c9c6d6', roughness: 0.9 })));
  moon.userData.ownGeometry = true;
  moon.position.set(70, 95, -300);
  moon.scale.setScalar(9);
  root.add(moon);
  // 반짝이는 큰 별 몇 개
  const r = rng(85);
  const big = [];
  for (let i = 0; i < 14; i++) big.push([(r() * 2 - 1) * 160, 20 + r() * 150, -300, ['#ffffff', '#cfe0ff', '#ffe0f0'][i % 3]]);
  const twinkle = glowPoints(big, { size: 9, opacity: 0.9 });
  root.add(twinkle);

  const env = {
    sky: { top: '#03051a', mid: '#0a1240', horizon: '#1b2a72', sunDir: [-0.18, 0.005, -1], sunColor: '#bcd8ff', sunStrength: 0.35, sunSize: 0.0015 },
    fog: { color: '#0a1240', near: 600, far: 900 },
    sun: { color: '#fff4e0', intensity: 2.6, dir: [-0.8, 0.55, 0.25] },
    hemi: { sky: '#6a7ad8', ground: '#2a4aa0', intensity: 0.75 },
    exposure: 1.0,
  };

  const [sa, sb] = stars.userData.layers;
  return {
    group: root,
    env,
    update(t) {
      turn.rotation.y = t * 0.006;
      cloudTurn.rotation.y = t * 0.009;
      sa.material.opacity = 0.75 + 0.25 * Math.sin(t * 1.3);
      sb.material.opacity = 0.8 + 0.2 * Math.sin(t * 2.1 + 2);
      twinkle.material.opacity = 0.7 + 0.3 * Math.sin(t * 3.1);
      sunGlow.material.opacity = 0.55 + 0.05 * Math.sin(t * 0.8);
    },
  };
}

