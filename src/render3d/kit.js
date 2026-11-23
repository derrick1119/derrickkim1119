// 3D 그림 공통 도구. 모든 3D 모듈(기체·지구인·표본·무대)은 여기서 재질과 도형을 가져다 쓴다.
//
// 그림 문법(컨셉 아트의 3D 카툰 렌더):
//   · 재질은 무광에 가까운 플라스틱/점토(roughness 0.55~0.9). 금속은 기체에만.
//   · 빛: 왼쪽 위 앞에서 오는 따뜻한 햇빛 + 하늘빛(위 파랑, 아래 풀색) + 그림자. 엔진이 켠다.
//   · 캐릭터·기체·표본에는 가는 남색 외곽선(addOutline)을 둘러 배경에서 떠 보이게 한다. 배경 소품에는 두르지 않는다.
//   · 얼굴(눈·눈썹·입·볼)은 캔버스로 그린 그림을 머리 앞면에 붙인다(faceCap).
//   · 빛나는 것(조명·빔·반딧불)은 glowSprite 를 겹친다.
// 단위: 1 = 화면에서 64px(행동 평면 z = 0 기준). 사람 키 ≈ 1.0.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { tone } from '../render/draw.js';

export { THREE, tone };

// ───────── 림 라이트(모든 표준 재질에 적용) ─────────
// 물체 가장자리에 하늘빛 테두리를 더한다. 위쪽 가장자리일수록 강하다. 슈퍼셀 게임 캐릭터가 배경에서
// 또렷하게 떠 보이는 핵심 요소다. 하늘빛(반구광의 하늘색)을 쓰므로 무대 시간대에 따라 색이 따라간다.
if (!THREE.ShaderChunk.lights_fragment_end.includes('RIM_LIGHT')) {
  THREE.ShaderChunk.lights_fragment_end += `
#if NUM_HEMI_LIGHTS > 0
  // RIM_LIGHT
  {
    float rimF = 1.0 - saturate( dot( geometryNormal, geometryViewDir ) );
    rimF = smoothstep( 0.5, 1.0, rimF ) * ( 0.55 + 0.45 * saturate( geometryNormal.y + 0.35 ) );
    reflectedLight.directDiffuse += hemisphereLights[ 0 ].skyColor * rimF * 0.6 * ( 0.3 + 0.7 * diffuseColor.rgb );
  }
#endif
`;
}

/** 컨셉 아트에서 뽑은 팔레트. 2D 팔레트(P)와 같은 계열이다. */
export const PAL = {
  ink: '#1f2350',
  white: '#ffffff',
  cream: '#fff4dc',
  skin: ['#ffd9bd', '#f6c29c', '#d9a074', '#a8714c'],
  cheek: '#ff8f8f',
  hairBrown: '#7a4a2e',
  hairDark: '#3a2a2a',
  hairBlond: '#f0c25a',
  hairGinger: '#d9773a',
  grass: '#8fd14f',
  grassDark: '#57a33c',
  leaf: '#4f9e3e',
  leafLight: '#86cf4f',
  leafDark: '#2f7034',
  soil: '#c08a56',
  sand: '#f2dca4',
  wood: '#b37a45',
  woodDark: '#7a4b2a',
  hay: '#f2c75a',
  sea: '#2f78d0',
  seaLight: '#6fb8f2',
  barn: '#d64a3c',
  roof: '#8f4a34',
  roofOrange: '#e0773b',
  roofBlue: '#4f6fc2',
  wall: '#fbeed2',
  stone: '#c9c3d8',
  hull: '#3c4569',
  hullLight: '#93a0cf',
  hullDark: '#1f2543',
  glow: '#5ff0ff',
  glowSoft: '#c6fdff',
  glass: '#9fe8ff',
  alien: '#a4b3cc',
  red: '#e2483c',
  orange: '#ff9a3c',
  yellow: '#ffd23f',
  green: '#5cbf5a',
  teal: '#2fb5a6',
  blue: '#3f6fd0',
  navy: '#2b3a78',
  purple: '#8a6ad8',
  pink: '#ff8fb0',
};

// ───────── 재질 ─────────

const matCache = new Map();

/**
 * 표준 재질(캐시됨). 같은 설정이면 같은 객체를 돌려주므로 수정하지 말 것(수정하려면 .clone()).
 * @param {string} color '#rrggbb'
 * @param {{rough?: number, metal?: number, emissive?: string, emissiveIntensity?: number, flat?: boolean,
 *          transparent?: boolean, opacity?: number, side?: number, map?: THREE.Texture, envIntensity?: number}} [o]
 */
export function mat(color, o = {}) {
  const key = color + JSON.stringify(o, (k, v) => (v && v.isTexture ? v.uuid : v));
  let m = matCache.get(key);
  if (m) return m;
  m = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: o.rough ?? 0.72,
    metalness: o.metal ?? 0,
    flatShading: !!o.flat,
    transparent: !!o.transparent || (o.opacity ?? 1) < 1,
    opacity: o.opacity ?? 1,
    side: o.side ?? THREE.FrontSide,
    map: o.map || null,
    envMapIntensity: o.envIntensity ?? 0.6,
  });
  if (o.emissive) {
    m.emissive = new THREE.Color(o.emissive);
    m.emissiveIntensity = o.emissiveIntensity ?? 1;
  }
  matCache.set(key, m);
  return m;
}

/** 빛을 받지 않는 단색(하늘 장식, 빛 자체 등). */
export function basic(color, o = {}) {
  const key = `basic${color}${JSON.stringify(o)}`;
  let m = matCache.get(key);
  if (m) return m;
  m = new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    transparent: !!o.transparent || (o.opacity ?? 1) < 1,
    opacity: o.opacity ?? 1,
    fog: o.fog ?? true,
    side: o.side ?? THREE.FrontSide,
    depthWrite: o.depthWrite ?? true,
    blending: o.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  matCache.set(key, m);
  return m;
}

// ───────── 외곽선 ─────────

const outlineCache = new Map();

/** 뒷면을 법선 방향으로 부풀린 외곽선 재질. thickness 는 그 물체의 로컬 단위. */
export function outlineMaterial(color = PAL.ink, thickness = 0.018) {
  const key = `${color}|${thickness}`;
  let m = outlineCache.get(key);
  if (m) return m;
  m = new THREE.MeshBasicMaterial({ color: new THREE.Color(color), side: THREE.BackSide });
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `vec3 transformed = vec3( position ) + normalize( normal ) * ${thickness.toFixed(4)};`,
    );
  };
  m.customProgramCacheKey = () => `outline${thickness.toFixed(4)}`;
  outlineCache.set(key, m);
  return m;
}

/**
 * 메시에 외곽선을 두른다(같은 도형을 공유하는 자식 메시를 붙인다).
 * 법선이 매끈한 도형(구·캡슐·둥근 상자)에 쓴다. 각진 상자에는 틈이 생긴다.
 */
export function addOutline(mesh, thickness = 0.018, color = PAL.ink) {
  const o = new THREE.Mesh(mesh.geometry, outlineMaterial(color, thickness));
  o.name = 'outline';
  o.castShadow = false;
  o.receiveShadow = false;
  o.raycast = () => {};
  mesh.add(o);
  return o;
}

// ───────── 도형 ─────────

const geoCache = new Map();
function cached(key, make) {
  let g = geoCache.get(key);
  if (!g) {
    g = make();
    geoCache.set(key, g);
  }
  return g;
}

export const sphereGeo = (r = 1, w = 24, h = 16) => cached(`s${r}|${w}|${h}`, () => new THREE.SphereGeometry(r, w, h));
export const boxGeo = (w, h, d) => cached(`b${w}|${h}|${d}`, () => new THREE.BoxGeometry(w, h, d));
export const roundBoxGeo = (w, h, d, r = 0.05, seg = 3) =>
  cached(`rb${w}|${h}|${d}|${r}|${seg}`, () => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2, h / 2, d / 2)));
/** 캡슐: 전체 높이 len(끝 반구 포함), 반지름 r, y 축 방향, 가운데가 원점. */
export const capsuleGeo = (r, len, cap = 6, radial = 14) =>
  cached(`c${r}|${len}|${cap}|${radial}`, () => new THREE.CapsuleGeometry(r, Math.max(0.001, len - 2 * r), cap, radial));
export const cylGeo = (rt, rb, h, seg = 18, open = false) => cached(`cy${rt}|${rb}|${h}|${seg}|${open}`, () => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open));
export const coneGeo = (r, h, seg = 18) => cached(`co${r}|${h}|${seg}`, () => new THREE.ConeGeometry(r, h, seg));
export const torusGeo = (r, tube, rs = 10, ts = 28, arc = Math.PI * 2) => cached(`t${r}|${tube}|${rs}|${ts}|${arc}`, () => new THREE.TorusGeometry(r, tube, rs, ts, arc));

/** 옆모습 윤곽 [[반지름, 높이], ...] 을 y 축으로 돌린 도형(기체 몸통, 꽃병, 탑 등). */
export function latheGeo(points, seg = 40, key = null) {
  const make = () => new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), seg);
  return key ? cached(`l${key}`, make) : make();
}

/** 메시 하나 만들기. */
export function mesh(geo, material, { cast = true, receive = false, pos, rot, scale } = {}) {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = cast;
  m.receiveShadow = receive;
  if (pos) m.position.set(pos[0], pos[1], pos[2]);
  if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
  if (scale !== undefined) {
    if (Array.isArray(scale)) m.scale.set(scale[0], scale[1], scale[2]);
    else m.scale.setScalar(scale);
  }
  return m;
}

/**
 * 움직이지 않는 배경 묶음을 재질별로 하나의 메시로 합쳐 그리기 호출을 줄인다.
 * 합친 뒤에는 원래 메시들이 빠지고, 재질마다 메시 하나가 남는다. userData.dynamic 이 있는 것은 건드리지 않는다.
 */
export function bakeStatic(group) {
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const buckets = new Map();
  const remove = [];
  group.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.userData.dynamic || o.name === 'outline') return;
    let p = o.parent;
    while (p && p !== group) {
      if (p.userData.dynamic) return;
      p = p.parent;
    }
    const key = `${o.material.uuid}|${o.castShadow ? 1 : 0}|${o.receiveShadow ? 1 : 0}`;
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((g.attributes.position.count) * 2), 2));
    if (!g.attributes.normal) g.computeVertexNormals();
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    if (!buckets.has(key)) buckets.set(key, { material: o.material, cast: o.castShadow, receive: o.receiveShadow, geos: [] });
    buckets.get(key).geos.push(g);
    remove.push(o);
  });
  for (const o of remove) o.parent.remove(o);
  for (const b of buckets.values()) {
    const merged = mergeGeometries(b.geos, false);
    for (const g of b.geos) g.dispose();
    if (!merged) continue;
    const m = new THREE.Mesh(merged, b.material);
    m.castShadow = b.cast;
    m.receiveShadow = b.receive;
    m.matrixAutoUpdate = false;
    group.add(m);
  }
  return group;
}

// ───────── 텍스처 ─────────

/** 캔버스에 그려 텍스처를 만든다. draw(ctx, w, h). */
export function canvasTexture(w, h, draw, { repeat = null, srgb = true } = {}) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(cv);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  if (repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat[0], repeat[1]);
  }
  return tex;
}

let glowTex = null;
/** 가운데가 밝고 가장자리로 사라지는 둥근 빛 텍스처. */
export function glowTexture() {
  if (glowTex) return glowTex;
  glowTex = canvasTexture(128, 128, (ctx, w) => {
    const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.15)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, w);
  });
  return glowTex;
}

/** 덧그리기로 빛나는 동그란 빛(카메라를 향한다). size = 지름(로컬 단위). */
export function glowSprite(color, size = 1, opacity = 0.8) {
  const m = new THREE.SpriteMaterial({
    map: glowTexture(),
    color: new THREE.Color(color),
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  });
  const s = new THREE.Sprite(m);
  s.scale.setScalar(size);
  s.renderOrder = 5;
  s.raycast = () => {};
  return s;
}

let blobTex = null;
/** 바닥에 까는 부드러운 그림자 판(그림자 지도 밖의 소품, 공중 물체 아래에). */
export function shadowBlob(radius = 0.4, opacity = 0.3) {
  if (!blobTex) {
    blobTex = canvasTexture(64, 64, (ctx, w) => {
      const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      g.addColorStop(0, 'rgba(20,24,60,1)');
      g.addColorStop(1, 'rgba(20,24,60,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, w);
    });
  }
  const m = new THREE.Mesh(
    cached('blobplane', () => new THREE.PlaneGeometry(1, 1)),
    new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, opacity, depthWrite: false }),
  );
  m.rotation.x = -Math.PI / 2;
  m.scale.set(radius * 2, radius * 2, 1);
  m.position.y = 0.005;
  m.renderOrder = 1;
  m.raycast = () => {};
  return m;
}

// ───────── 얼굴 ─────────

const faceTexCache = new Map();

/**
 * 얼굴 텍스처(캐시됨). draw(ctx, s) 는 s×s 캔버스의 가운데를 얼굴 가운데로 보고 그린다.
 * 텍스처의 가로 = 머리 둘레의 faceCap width 만큼, 세로 = height 만큼에 붙는다.
 */
export function faceTexture(key, draw, size = 256) {
  let t = faceTexCache.get(key);
  if (t) return t;
  t = canvasTexture(size, size, (ctx, s) => draw(ctx, s));
  faceTexCache.set(key, t);
  return t;
}

/**
 * 머리(구) 앞면에 얼굴 그림을 붙이는 껍데기. +z 가 정면.
 * @param {number} radius 머리 반지름(껍데기는 1.5% 크게)
 * @param {{width?: number, height?: number}} o 덮는 범위(라디안). 기본: 가로 1.9, 세로 1.5
 * 반환한 메시의 material.map 을 바꿔 끼우면 표정이 바뀐다.
 */
export function faceCap(radius, texture, { width = 1.9, height = 1.5 } = {}) {
  // SphereGeometry 에서 phi = π/2 가 정면(+z), theta = π/2 가 적도다. 텍스처 왼쪽 = 보는 사람의 왼쪽.
  const geo = cached(`face${radius}|${width}|${height}`, () =>
    new THREE.SphereGeometry(radius * 1.015, 32, 24, Math.PI / 2 - width / 2, width, Math.PI / 2 - height / 2, height),
  );
  const m = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ map: texture, transparent: true, roughness: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
  );
  m.castShadow = false;
  m.renderOrder = 2;
  m.raycast = () => {};
  return m;
}

// ───────── 하늘 ─────────

/**
 * 하늘 돔(위 → 지평선 색 그라데이션 + 해 주변 빛번짐). 안개를 받지 않는다.
 * @param {{top: string, mid: string, horizon: string, sunDir?: THREE.Vector3, sunColor?: string, sunSize?: number, sunStrength?: number}} c
 */
export function makeSky(c) {
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      top: { value: new THREE.Color(c.top) },
      mid: { value: new THREE.Color(c.mid ?? c.top) },
      horizon: { value: new THREE.Color(c.horizon) },
      sunDir: { value: (c.sunDir || new THREE.Vector3(-0.4, 0.35, -1)).clone().normalize() },
      sunColor: { value: new THREE.Color(c.sunColor || '#fff6d8') },
      sunSize: { value: c.sunSize ?? 0.02 },
      sunStrength: { value: c.sunStrength ?? 0.6 },
    },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }`,
    fragmentShader: `
      uniform vec3 top; uniform vec3 mid; uniform vec3 horizon; uniform vec3 sunDir; uniform vec3 sunColor; uniform float sunSize; uniform float sunStrength;
      varying vec3 vDir;
      void main(){
        float h = clamp(vDir.y, -0.2, 1.0);
        vec3 col = h < 0.18 ? mix(horizon, mid, smoothstep(-0.02, 0.18, h)) : mix(mid, top, smoothstep(0.18, 0.75, h));
        float d = max(dot(normalize(vDir), sunDir), 0.0);
        col += sunColor * (pow(d, 64.0) * 0.6 + pow(d, 8.0) * 0.18) * sunStrength;
        col += sunColor * smoothstep(1.0 - sunSize, 1.0 - sunSize * 0.6, d) * sunStrength * 1.5;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), m);
  sky.renderOrder = -10;
  sky.frustumCulled = false;
  sky.raycast = () => {};
  return sky;
}

/**
 * 뭉게구름 한 덩이(구 여러 개). 위는 하얗고 아래는 푸르스름하다.
 * blobs = [[x, y, z, r], ...] (로컬 단위)
 */
export function cloud3d(blobs, { color = '#ffffff', shadeColor = '#c4cff2', opacity = 1, fog = true } = {}) {
  const g = new THREE.Group();
  const material = cloudMaterial(color, shadeColor, opacity, fog);
  for (const [x, y, z, r] of blobs) {
    const m = new THREE.Mesh(sphereGeo(1, 20, 14), material);
    m.position.set(x, y, z);
    m.scale.setScalar(r);
    m.castShadow = false;
    g.add(m);
  }
  return g;
}

const cloudMats = new Map();
function cloudMaterial(color, shadeColor, opacity, fog) {
  const key = `${color}|${shadeColor}|${opacity}|${fog}`;
  let m = cloudMats.get(key);
  if (m) return m;
  // 구름은 스스로 빛나는 색(위: 흰색, 아래: 그늘색)이 대부분이고, 햇빛은 위쪽을 살짝 데우기만 한다.
  // 그래야 아랫면이 땅빛(풀색)에 물들지 않고 컨셉처럼 라벤더빛 그늘이 된다.
  m = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.32), roughness: 1, metalness: 0, transparent: opacity < 1, opacity, fog });
  m.emissive = new THREE.Color(color);
  m.emissiveIntensity = 0.8;
  const shade = new THREE.Color(shadeColor);
  m.onBeforeCompile = (shader) => {
    shader.uniforms.shadeCol = { value: shade };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vWY;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWY = normalize( mat3( modelMatrix ) * objectNormal ).y;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 shadeCol; varying float vWY;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance = mix( shadeCol * 0.8, totalEmissiveRadiance, smoothstep( -0.55, 0.45, vWY ) );');
  };
  m.customProgramCacheKey = () => 'cloud3d';
  cloudMats.set(key, m);
  return m;
}

/** 0..1 무작위(시드 고정). 같은 시드는 항상 같은 배치를 만든다. */
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
