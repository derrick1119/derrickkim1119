// 7. 궤도(우주): 별이 가득한 짙은 남색 우주와 옅은 성운, 화면 아래를 채우는 둥근 지구(바다·초록 땅·흰 구름, 대기 테두리 빛,
//    밤 쪽 가장자리의 도시 불빛), 지구 끝을 따라 일렁이는 오로라, 지구 가장자리에서 떠오르는 해(블룸),
//    오른쪽에 고리 달린 작은 행성과 달. 우주인은 z = 0 근처 y ≈ 0.8 에 떠 있다.
//    값 구조: 위쪽 우주는 기체(남색 몸통·청록 불빛)가 또렷하도록 보랏빛 중간 밝기, 지구는 밝고 진하게.
import { THREE, G, rng, cachedTex, starField, glowPoints, fbm, glowS, sharedMat, mix } from './common.js';

const R = 70;
const C = new THREE.Vector3(0, -66, -150);

// 이음매 없는(가로로 반복되는) 잡음
function wrapNoise(u, v, f, oct = 4) {
  const a = fbm(u * f, v * f, oct);
  if (u < 0.85) return a;
  const k = (u - 0.85) / 0.15;
  return a + (fbm((u - 1) * f, v * f, oct) - a) * k * k * (3 - 2 * k);
}

const fieldCache = new Map();
/** 반정밀 실수 값 지도(채널 2개, 선형 보간). 8비트 캔버스와 달리 크게 늘려도 계단·띠가 생기지 않는다. */
function fieldTex(key, W, Hh, fn) {
  let t = fieldCache.get(key);
  if (t) return t;
  const data = new Uint16Array(W * Hh * 2);
  const out = [0, 0];
  for (let y = 0; y < Hh; y++) {
    for (let x = 0; x < W; x++) {
      fn(x / W, y / Hh, out);
      const o = (y * W + x) * 2;
      data[o] = THREE.DataUtils.toHalfFloat(out[0]);
      data[o + 1] = THREE.DataUtils.toHalfFloat(out[1]);
    }
  }
  t = new THREE.DataTexture(data, W, Hh, THREE.RGFormat, THREE.HalfFloatType);
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.flipY = false;
  t.needsUpdate = true;
  fieldCache.set(key, t);
  return t;
}

/**
 * 지구 바탕 "값 지도": R = 땅 높이 잡음(0.53 위가 땅), G = 메마름(사막 띠). 색은 셰이더가 칠한다 →
 * 아무리 크게 보여도 해안선이 흐려지지 않고 또렷한 장난감 지구본이 된다.
 * (캔버스 지도와 같은 방향이 되도록 v 를 뒤집어 채운다)
 */
function earthField() {
  return fieldTex('earth', 1024, 512, (u, v, out) => {
    const vv = 1 - v;
    out[0] = wrapNoise(u, vv, 3.5) + 0.08 * (wrapNoise(u, vv, 11.5, 2) - 0.5);
    out[1] = wrapNoise(u, vv + 3.7, 5.5, 2);
  });
}

/** 도시 불빛(땅 위 따뜻한 점들, 해안을 따라 더 빽빽하게). */
function lightsTex() {
  return cachedTex('earthLights', 1024, 512, (ctx, W, Hh) => {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, Hh);
    const r = rng(77);
    for (let i = 0; i < 5200; i++) {
      const u = r();
      const v = 0.15 + r() * 0.7;
      const n = wrapNoise(u, v, 3.5) + 0.08 * (wrapNoise(u, v, 11.5, 2) - 0.5);
      const land = n - 0.53;
      if (land < 0 || (land > 0.05 && r() < 0.6)) continue;
      const s = 0.8 + r() * 1.6;
      ctx.fillStyle = r() < 0.7 ? '#ffc870' : '#fff0c0';
      ctx.globalAlpha = 0.5 + r() * 0.5;
      ctx.fillRect(u * W, v * Hh, s, s);
    }
    ctx.globalAlpha = 1;
  });
}

/** 구름 값 지도(R = 구름 잡음). 셰이더가 0.54 에서 또렷하게 잘라 솜뭉치 모양을 만든다. */
function cloudField() {
  return fieldTex('earthClouds', 1024, 512, (u, v, out) => {
    const vv = 1 - v;
    out[0] = wrapNoise(u, vv * 2.8, 4.5, 3) * 0.7 + wrapNoise(u, vv * 2, 7, 2) * 0.3;
    out[1] = 0;
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

function moonTex() {
  return cachedTex('moonOrbit', 256, 128, (ctx, W, Hh) => {
    ctx.fillStyle = '#d8d4e4';
    ctx.fillRect(0, 0, W, Hh);
    const r = rng(14);
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = `rgba(150,140,175,${0.25 + r() * 0.2})`;
      ctx.beginPath();
      ctx.ellipse(r() * W, Hh * (0.2 + r() * 0.6), 14 + r() * 30, 8 + r() * 16, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 40; i++) {
      const x = r() * W;
      const y = r() * Hh;
      const s = 2 + r() * 7;
      ctx.fillStyle = 'rgba(120,110,150,0.45)';
      ctx.beginPath();
      ctx.arc(x, y, s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.arc(x - s * 0.25, y - s * 0.25, s * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

/** 대기 테두리 빛(가장자리에서 밝아지는 덧그리기). */
function atmosphere(color, power, strength, side) {
  return sharedMat(`orbit:atmo${color}|${power}|${strength}|${side}`, () => new THREE.ShaderMaterial({
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
  }));
}

/** 오로라 띠 텍스처(아래 초록 → 위 보라, 세로 결). */
function auroraTex() {
  return cachedTex('aurora', 512, 64, (ctx, W, Hh) => {
    const r = rng(31);
    for (let x = 0; x < W; x++) {
      const k = 0.35 + 0.65 * Math.abs(Math.sin(x * 0.045 + Math.sin(x * 0.013) * 3)) * (0.6 + 0.4 * r());
      const g = ctx.createLinearGradient(0, Hh, 0, 0);
      g.addColorStop(0, 'rgba(80,255,180,0)');
      g.addColorStop(0.12, `rgba(90,255,190,${0.9 * k})`);
      g.addColorStop(0.5, `rgba(80,220,200,${0.45 * k})`);
      g.addColorStop(1, 'rgba(170,110,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x, 0, 1, Hh);
    }
  });
}

/** @param {{w:number,h:number}} size */
export function buildOrbit({ w }) {
  const root = new THREE.Group();

  // 지구: 극이 카메라 쪽을 보게 눕혀서, 적도 띠가 위쪽 가장자리를 지나가게 한다
  const earth = G(root, C.x, C.y, C.z);
  const spin = G(earth);
  spin.rotation.x = -Math.PI / 2 + 0.25;
  const turn = G(spin);
  const eTex = earthField();
  eTex.wrapS = THREE.RepeatWrapping;
  eTex.repeat.set(2, 1);
  const lTex = lightsTex();
  lTex.wrapS = THREE.RepeatWrapping;
  lTex.repeat.set(2, 1);
  const cTex = cloudField();
  cTex.wrapS = THREE.RepeatWrapping;
  cTex.repeat.set(2, 1);
  const sphere = (rad, ws, hs) => sharedMat(`orbit:sphere${rad}|${ws}|${hs}`, () => {
    const g = new THREE.SphereGeometry(rad, ws, hs);
    g.userData.shared = true;
    return g;
  });
  // 지구 재질: 밤 쪽(해를 등진 곳)에만 도시 불빛이 켜진다(블룸)
  const earthMaterial = sharedMat('orbit:earth', () => {
    const m = new THREE.MeshStandardMaterial({ map: eTex, roughness: 0.55, metalness: 0, envMapIntensity: 0.45, emissiveMap: lTex, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 2.4 });
    const U = {
      eDeep: { value: new THREE.Color('#1c48c0') },
      eShallow: { value: new THREE.Color('#46b4ec') },
      eReef: { value: new THREE.Color('#8ce4f0') },
      eGreen: { value: new THREE.Color('#68c454') },
      eGreen2: { value: new THREE.Color('#2e8a4a') },
      eSand: { value: new THREE.Color('#f0d088') },
      eIce: { value: new THREE.Color('#f4f8ff') },
    };
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, U);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform vec3 eDeep; uniform vec3 eShallow; uniform vec3 eReef; uniform vec3 eGreen; uniform vec3 eGreen2; uniform vec3 eSand; uniform vec3 eIce;\nfloat eCoast;')
        .replace(
          '#include <map_fragment>',
          `vec4 ef = texture2D( map, vMapUv );
          float land = ef.r - 0.53;
          float aa = fwidth( land ) * 1.2 + 1e-4;
          eCoast = smoothstep( -aa, aa, land );
          // 바다: 깊은 파랑 → 얕은 하늘빛, 해안 바로 앞은 옥빛 띠
          float shal = smoothstep( -0.11, 0.0, land );
          vec3 sea = mix( eDeep, eShallow, shal * shal );
          sea = mix( sea, eReef, smoothstep( -0.022, -0.004, land ) * 0.6 );
          // 땅: 볕 든 연두 → 안쪽 짙은 초록, 메마른 곳은 모래빛(경계도 또렷하게)
          vec3 grn = mix( eGreen, eGreen2, smoothstep( 0.0, 0.11, land ) );
          float dry = ef.g - 0.62;
          float lat = abs( fract( vMapUv.y ) - 0.5 ) * 2.0;
          float daa = max( fwidth( dry ) * 1.2, 0.004 );
          grn = mix( grn, eSand, smoothstep( -daa, daa, dry ) * ( 1.0 - smoothstep( 0.5, 0.62, lat ) ) * 0.85 );
          vec3 ec = mix( sea, grn, eCoast );
          float ice = lat - 0.82 - 0.06 * ( ef.r - 0.5 );
          float iaa = max( fwidth( ice ) * 1.2, 0.004 );
          ec = mix( ec, eIce, smoothstep( -iaa, iaa, ice ) );
          diffuseColor.rgb *= ec;`,
        )
        .replace(
          '#include <roughnessmap_fragment>',
          // 바다는 반들반들(해 쪽에 장난감 지구본 같은 반짝임), 땅은 보들하게
          '#include <roughnessmap_fragment>\nroughnessFactor = mix( 0.32, 0.85, eCoast );',
        )
        .replace(
        '#include <lights_fragment_end>',
        `#include <lights_fragment_end>
        #if NUM_DIR_LIGHTS > 0
          totalEmissiveRadiance *= 1.0 - smoothstep( -0.3, 0.05, dot( normal, directionalLights[ 0 ].direction ) );
        #endif`,
      );
    };
    m.customProgramCacheKey = () => 'earthToy';
    return m;
  });
  const ball = new THREE.Mesh(sphere(R, 96, 64), earthMaterial);
  turn.add(ball);
  // 구름: 값 지도를 또렷하게 잘라 솜뭉치처럼(가장자리는 매끈, 가운데는 더 하얗게)
  const clouds = new THREE.Mesh(sphere(R * 1.008, 96, 64), sharedMat('orbit:clouds', () => {
    const m = new THREE.MeshStandardMaterial({ map: cTex, transparent: true, roughness: 0.9, depthWrite: false });
    m.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        `float cf = texture2D( map, vMapUv ).r - 0.585;
        float caa = fwidth( cf ) * 1.2 + 1e-4;
        diffuseColor.a *= smoothstep( -caa, caa, cf ) * mix( 0.7, 0.9, smoothstep( 0.0, 0.07, cf ) );`,
      );
    };
    m.customProgramCacheKey = () => 'earthCloudToy';
    return m;
  }));
  const cloudTurn = G(spin);
  cloudTurn.add(clouds);
  // 대기: 안쪽 테두리 + 바깥 후광
  const atmoIn = new THREE.Mesh(sphere(R * 1.012, 96, 48), atmosphere('#7fd0ff', 2.2, 0.95, THREE.FrontSide));
  const atmoOut = new THREE.Mesh(sphere(R * 1.06, 96, 48), atmosphere('#5aa8ff', 5.0, 1.45, THREE.BackSide));
  earth.add(atmoIn, atmoOut);

  // 오로라: 카메라에서 본 지구 테두리(가장자리 원)를 따라 그 바깥에 두른 띠. 가장자리 원이 놓인 평면에 눕힌다.
  const aTex = auroraTex();
  aTex.wrapS = THREE.RepeatWrapping;
  const camPos = new THREE.Vector3(0, 3.2, 14);
  const axis = camPos.clone().sub(C);
  const D = axis.length();
  axis.normalize();
  const limbR = R * Math.sqrt(1 - (R / D) ** 2);
  const auroraGeo = sharedMat('orbit:auroraGeo', () => {
    const g = new THREE.RingGeometry(limbR * 1.004, limbR * 1.004 + 4.2, 160, 2);
    const p = g.attributes.position;
    const uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      uv.setXY(i, ((Math.atan2(y, x) / (Math.PI * 2)) + 1) * 7, (Math.hypot(x, y) - limbR * 1.004) / 4.2);
    }
    g.userData.shared = true;
    return g;
  });
  const aurora = new THREE.Mesh(auroraGeo, sharedMat('orbit:aurora', () => new THREE.MeshBasicMaterial({ map: aTex, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })));
  aurora.position.copy(C).addScaledVector(axis, (R * R) / D);
  aurora.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), axis);
  aurora.renderOrder = 2;
  root.add(aurora);

  // 별, 성운
  const stars = starField(79, { n: 900, yMin: -0.05, size: [2.4, 5.5], big: 0.12, boost: [1.1, 2.4] });
  root.add(stars);
  const nebGeo = sharedMat('orbit:plane', () => {
    const g = new THREE.PlaneGeometry(1, 1);
    g.userData.shared = true;
    return g;
  });
  const nebMat = sharedMat('orbit:neb', () => new THREE.MeshBasicMaterial({ map: nebulaTex(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  const neb = new THREE.Mesh(nebGeo, nebMat);
  neb.position.set(40, 120, -330);
  neb.scale.set(420, 300, 1);
  neb.renderOrder = -5;
  root.add(neb);
  const neb2 = new THREE.Mesh(nebGeo, nebMat);
  neb2.position.set(-150, 60, -300);
  neb2.scale.set(300, 220, 1);
  neb2.rotation.z = 0.8;
  neb2.renderOrder = -5;
  root.add(neb2);

  // 지구 가장자리 너머의 해(블룸)
  const sunGlow = glowS('orbit:sunGlow', '#ffe9c0', 70, 0.6);
  sunGlow.position.set(-62, 5, -330);
  const sunCore = glowS('orbit:sunCore', '#ffffff', 16, 1.0, 2.2);
  sunCore.position.set(-62, 4.5, -329);
  // 해 빛줄기는 블룸 문턱 아래로(화면 폭 전체에 걸쳐 있어 넘으면 위쪽 전체가 청록 안개에 덮인다)
  const streak = glowS('orbit:streak', '#cfe6ff', 1, 0.42, 0.9);
  streak.scale.set(220, 5, 1);
  streak.position.set(-62, 4.5, -328);
  root.add(sunGlow, sunCore, streak);

  // 달(분화구 무늬, 햇빛에 그늘진다)
  const moon = new THREE.Mesh(sphere(1, 32, 20), sharedMat('orbit:moon', () => new THREE.MeshStandardMaterial({ map: moonTex(), roughness: 0.95 })));
  moon.position.set(70, 95, -300);
  moon.scale.setScalar(9);
  root.add(moon);

  // 고리 달린 작은 행성(오른쪽, 지구 위)
  const planet = G(root, 52, 34, -300, 0, 1);
  planet.add(new THREE.Mesh(sphere(1, 32, 20), sharedMat('orbit:planet', () => {
    const tex = cachedTex('planetBands', 64, 128, (ctx, W, Hh) => {
      const cols = ['#ffb070', '#ff8a6a', '#ffd29a', '#e87a8a', '#ffc080', '#f09a7a'];
      for (let y = 0; y < Hh; y += 8) {
        ctx.fillStyle = cols[(y / 8) % cols.length];
        ctx.fillRect(0, y, W, 8);
      }
    });
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 });
  })));
  planet.children[0].scale.setScalar(7);
  const ringGeo = sharedMat('orbit:ringGeo', () => {
    const g = new THREE.RingGeometry(9.5, 14, 64, 3);
    const p = g.attributes.position;
    const col = new Float32Array(p.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const rad = Math.hypot(p.getX(i), p.getY(i));
      c.set(mix('#ffe2b0', '#c8a0ff', (rad - 9.5) / 4.5));
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.userData.shared = true;
    return g;
  });
  const ring = new THREE.Mesh(ringGeo, sharedMat('orbit:ring', () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })));
  ring.rotation.set(-1.25, 0.2, 0.35);
  planet.add(ring);

  // 반짝이는 큰 별 몇 개(블룸)
  const r = rng(85);
  const big = [];
  for (let i = 0; i < 14; i++) big.push([(r() * 2 - 1) * 160, 20 + r() * 150, -300, ['#ffffff', '#cfe0ff', '#ffe0f0'][i % 3]]);
  const twinkle = glowPoints(big, { size: 9, opacity: 0.9, boost: 2.2 });
  root.add(twinkle);

  const env = {
    sky: { top: '#04061e', mid: '#0c1448', horizon: '#1d2c78', sunDir: [-0.18, 0.005, -1], sunColor: '#bcd8ff', sunStrength: 0.35, sunSize: 0.0015 },
    fog: { color: '#0a1240', near: 600, far: 900 },
    sun: { color: '#fff4e0', intensity: 2.6, dir: [-0.8, 0.55, 0.25] },
    hemi: { sky: '#6a7ad8', ground: '#2a4aa0', intensity: 0.8 },
    exposure: 1.0,
    grade: { saturation: 1.12, contrast: 1.07, vignette: 0.28, bloom: 0.5 },
  };

  const [sa, sb] = stars.userData.layers;
  return {
    group: root,
    env,
    update(t) {
      turn.rotation.y = t * 0.006;
      cloudTurn.rotation.y = t * 0.009;
      aTex.offset.x = (t * 0.01) % 1;
      aurora.material.opacity = 0.45 + 0.12 * Math.sin(t * 0.9);
      sa.material.opacity = 0.75 + 0.25 * Math.sin(t * 1.3);
      sb.material.opacity = 0.8 + 0.2 * Math.sin(t * 2.1 + 2);
      twinkle.material.opacity = 0.7 + 0.3 * Math.sin(t * 3.1);
      sunGlow.material.opacity = 0.48 + 0.05 * Math.sin(t * 0.8);
      planet.rotation.y = t * 0.02;
    },
  };
}
