// 7. 궤도(우주): 별이 가득한 짙은 남색 우주와 옅은 성운, 화면 아래를 채우는 둥근 지구(바다·초록 땅·흰 구름, 대기 테두리 빛),
//    지구 가장자리에서 떠오르는 해. 우주인은 z = 0 근처 y ≈ 0.8 에 떠 있다.
import { THREE, G, rng, TAU, cachedTex, starField, glowPoints, clamp } from './common.js';
import { glowSprite } from '../kit.js';

const R = 70;
const C = new THREE.Vector3(0, -74, -70);

function earthTex() {
  return cachedTex('earth', 1024, 512, (ctx, W, Hh) => {
    const r = rng(79);
    const g = ctx.createLinearGradient(0, 0, 0, Hh);
    g.addColorStop(0, '#2a6fd6');
    g.addColorStop(0.5, '#1f5cc4');
    g.addColorStop(1, '#2a6fd6');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, Hh);
    // 얕은 바다 얼룩
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = `rgba(90,190,230,${0.12 + r() * 0.12})`;
      ctx.beginPath();
      ctx.ellipse(r() * W, Hh * (0.2 + r() * 0.6), 20 + r() * 60, 10 + r() * 30, r() * 3, 0, TAU);
      ctx.fill();
    }
    // 대륙: 둥근 덩어리를 겹쳐 만든다(가장자리는 연한 모래색)
    const blob = (cx, cy, s, n, col, sand) => {
      const pts = [];
      for (let i = 0; i < n; i++) pts.push([cx + (r() - 0.5) * s * 2.2, cy + (r() - 0.5) * s * 1.3, s * (0.35 + r() * 0.5)]);
      for (const [x, y, rr] of pts) {
        ctx.fillStyle = sand;
        ctx.beginPath();
        ctx.ellipse(x, y, rr + 5, (rr + 5) * 0.8, 0, 0, TAU);
        ctx.fill();
      }
      for (const [x, y, rr] of pts) {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.ellipse(x, y, rr, rr * 0.8, 0, 0, TAU);
        ctx.fill();
      }
      for (const [x, y, rr] of pts) {
        if (r() < 0.5) continue;
        ctx.fillStyle = r() < 0.5 ? '#8fd46a' : '#c8b06a';
        ctx.beginPath();
        ctx.ellipse(x + rr * 0.2, y - rr * 0.1, rr * 0.45, rr * 0.3, 0, 0, TAU);
        ctx.fill();
      }
    };
    const conts = [[150, 200, 70, 9], [330, 300, 60, 8], [520, 180, 90, 11], [700, 320, 55, 7], [860, 220, 75, 9], [430, 420, 40, 5], [80, 380, 35, 4]];
    for (const [x, y, s, n] of conts) blob(x, y, s, n, '#55b558', '#e6d49a');
    // 극지 얼음
    ctx.fillStyle = '#f4f8ff';
    ctx.fillRect(0, 0, W, 22);
    ctx.fillRect(0, Hh - 22, W, 22);
  });
}

function cloudTex() {
  return cachedTex('earthClouds', 1024, 512, (ctx, W, Hh) => {
    const r = rng(81);
    ctx.clearRect(0, 0, W, Hh);
    for (let i = 0; i < 120; i++) {
      const x = r() * W;
      const y = Hh * (0.12 + r() * 0.76);
      const len = 30 + r() * 120;
      const th = 6 + r() * 14;
      ctx.fillStyle = `rgba(255,255,255,${0.5 + r() * 0.4})`;
      ctx.beginPath();
      ctx.ellipse(x, y, len, th, (r() - 0.5) * 0.5, 0, TAU);
      ctx.fill();
    }
    // 소용돌이 몇 개
    for (let k = 0; k < 4; k++) {
      const cx = r() * W;
      const cy = Hh * (0.25 + r() * 0.5);
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 7;
      ctx.beginPath();
      for (let a = 0; a < TAU * 1.6; a += 0.15) {
        const rr = 6 + a * 9;
        ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.7);
      }
      ctx.stroke();
    }
  });
}

function nebulaTex() {
  return cachedTex('nebula', 512, 512, (ctx, W) => {
    const r = rng(83);
    ctx.clearRect(0, 0, W, W);
    const cols = ['120,80,220', '230,90,170', '60,150,230', '90,60,200'];
    for (let i = 0; i < 40; i++) {
      const x = W * (0.2 + r() * 0.6);
      const y = W * (0.25 + r() * 0.5);
      const rr = 40 + r() * 140;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rr);
      const c = cols[(r() * cols.length) | 0];
      g.addColorStop(0, `rgba(${c},0.22)`);
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
  const ball = new THREE.Mesh(new THREE.SphereGeometry(R, 96, 64), earthMat('e', () => new THREE.MeshStandardMaterial({ map: earthTex(), roughness: 0.75, metalness: 0, envMapIntensity: 0.3 })));
  ball.userData.ownGeometry = true;
  turn.add(ball);
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(R * 1.008, 96, 64), earthMat('c', () => new THREE.MeshStandardMaterial({ map: cloudTex(), transparent: true, roughness: 1, depthWrite: false })));
  clouds.userData.ownGeometry = true;
  const cloudTurn = G(spin);
  cloudTurn.add(clouds);
  // 대기: 안쪽 테두리 + 바깥 후광
  const atmoIn = new THREE.Mesh(new THREE.SphereGeometry(R * 1.012, 96, 48), atmosphere('#7fd0ff', 3.0, 1.2, THREE.FrontSide));
  const atmoOut = new THREE.Mesh(new THREE.SphereGeometry(R * 1.06, 96, 48), atmosphere('#5aa8ff', 5.0, 2.2, THREE.BackSide));
  for (const m of [atmoIn, atmoOut]) {
    m.userData.ownGeometry = true;
    earth.add(m);
  }
  ball.receiveShadow = false;
  ball.castShadow = false;

  // 별, 성운
  const stars = starField(79, { n: 520, yMin: -0.05, size: [2.2, 5], big: 0.1 });
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
  const sunGlow = glowSprite('#ffe9c0', 90, 0.6);
  sunGlow.position.set(-150, 8, -330);
  const sunCore = glowSprite('#ffffff', 22, 1.0);
  sunCore.position.set(-150, 8, -329);
  const streak = glowSprite('#cfe6ff', 1, 0.5);
  streak.scale.set(300, 8, 1);
  streak.position.set(-150, 8, -328);
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
    sky: { top: '#03051a', mid: '#0a1240', horizon: '#1b2a72', sunDir: [-0.42, 0.02, -1], sunColor: '#bcd8ff', sunStrength: 0.35, sunSize: 0.0015 },
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

void clamp;
