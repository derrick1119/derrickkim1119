// 무대 공용 도구: 팔레트 재질, 굽기(꼭짓점 그늘), 흩뿌리기(인스턴스), 지형, 구름, 나무·덤불·꽃·울타리 같은 소품.
//
// 그리기 호출을 줄이는 방법
//   · 단색 소품은 모두 "팔레트 텍스처" 한 장을 쓰는 재질(마감별 몇 개)로 칠한다. 도형의 UV 를 그 색 칸에 고정하므로
//     색이 수십 가지여도 재질은 하나 → bake 가 마감별로 한 덩어리로 합친다.
//   · bake 는 합치면서 꼭짓점 색을 굽는다: 땅에 닿는 아랫부분은 어둡게(접지 그늘), 잎 덩이는 볕 쪽은 노란 연두·
//     그늘 쪽은 푸른 초록(두 톤). 슈퍼셀 게임처럼 "칠한 듯한" 입체감을 빛 계산 없이 얻는다.
//   · 풀 포기·꽃·조약돌처럼 잔뜩 반복되는 작은 것은 InstancedMesh 하나로 그린다(scatter).
//   · 지형은 꼭짓점 색을 쓰는 높이 그물 한 장, 길 가장자리 같은 잔무늬는 반투명 그림 한 장(decal)을 덮는다.
//   · 구름은 덩이마다 구 여러 개를 한 도형으로 합쳐 한 번에 그린다.
//   · 빛나는 것(등·창·불·별)만 방출 세기를 1.5 이상으로 올려 블룸이 걸리게 한다. 나머지는 1 아래로 둔다.
//   · 스프라이트·물·빛기둥 재질은 key 로 캐시해 무대를 다시 만들어도 새 재질을 만들지 않는다(재질 누수 방지).
import { THREE, mat, sphereGeo, boxGeo, roundBoxGeo, capsuleGeo, cylGeo, coneGeo, torusGeo, latheGeo, glowTexture, rng } from '../kit.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export const CAM_Z = 14;
export const TAU = Math.PI * 2;
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/**
 * 화면 높이로 엔진의 카메라 배치를 어림한다(엔진 layout 과 같은 식, 계기판 150px·조작부 150px 기준).
 * horizon = 지평선 화면 y, yAt(Y, z) = 세계 높이 Y·깊이 z 의 화면 y, Yat(yScreen, z) = 그 반대.
 */
export function screenModel(h = 844) {
  const groundY = Math.round(h - 150 - Math.min(Math.max(h * 0.065, 30), 56));
  const camY = Math.min(Math.max((0.45 * (groundY - 180)) / 64, 2.2), 3.4);
  const horizon = groundY - 64 * camY;
  const f = 64 * CAM_Z;
  return {
    groundY,
    camY,
    horizon,
    hud: 150,
    yAt: (Y, z) => horizon - (f * (Y - camY)) / (CAM_Z - z),
    Yat: (yScreen, z) => camY + ((horizon - yScreen) * (CAM_Z - z)) / f,
    /** 계기판(0) ~ 땅선(1) 사이 비율 → 화면 y */
    frac: (k) => 150 + k * (groundY - 150),
  };
}

/** 깊이 z 에서 화면 가로 절반(세계 단위). w = 화면 폭(px). */
export const halfW = (w, z) => ((w / 2) / 64) * ((CAM_Z - z) / CAM_Z);

// ───────── 색 ─────────

const tmpA = new THREE.Color();
const tmpB = new THREE.Color();
/** 두 '#rrggbb' 를 sRGB 로 섞는다. */
export function mix(a, b, t) {
  tmpA.set(a);
  tmpB.set(b);
  return '#' + tmpA.lerp(tmpB, clamp(t)).getHexString();
}

// ───────── 팔레트 재질 ─────────

const PN = 64; // 64×64 칸
const PC = 4; // 칸 하나 = 4px
let palCv = null;
let palCtx = null;
let palTex = null;
const palIdx = new Map();

function paletteTex() {
  if (palTex) return palTex;
  palCv = document.createElement('canvas');
  palCv.width = palCv.height = PN * PC;
  palCtx = palCv.getContext('2d');
  palTex = new THREE.CanvasTexture(palCv);
  palTex.colorSpace = THREE.SRGBColorSpace;
  palTex.magFilter = THREE.NearestFilter;
  palTex.minFilter = THREE.NearestFilter;
  palTex.generateMipmaps = false;
  palTex.flipY = false;
  return palTex;
}

/** 색 하나의 팔레트 UV. 처음 보는 색이면 칸을 새로 칠한다. */
export function palUV(hex) {
  paletteTex();
  let i = palIdx.get(hex);
  if (i === undefined) {
    i = palIdx.size % (PN * PN);
    palIdx.set(hex, i);
    palCtx.fillStyle = hex;
    palCtx.fillRect((i % PN) * PC, Math.floor(i / PN) * PC, PC, PC);
    palTex.needsUpdate = true;
  }
  return [((i % PN) + 0.5) / PN, (Math.floor(i / PN) + 0.5) / PN];
}

// 마감별 거칠기 등. glow 류는 방출 세기(블룸 문턱 1.25 를 넘도록 노란빛 2.6, 채도 높은 빛 5)
const FIN_OPT = {
  matte: { rough: 0.9 },
  soft: { rough: 0.62 },
  gloss: { rough: 0.22, env: 1.1 },
  metal: { rough: 0.4, metal: 0.5, env: 1 },
  flat: { rough: 0.85, flat: true },
};
const GLOW_K = { glow: 2.6, neon: 5.0, lit: 0.85 };
const finishCache = new Map();
const palFin = new Map(); // 팔레트 재질 → 마감 이름(굽기 때 꼭짓점 색 판으로 바꾼다)

/**
 * 팔레트 마감 재질. matte(풀·나무), soft(칠한 나무·벽), gloss(유리·물), metal, flat(각진 바위),
 * glow(스스로 빛남·블룸), neon(채도 높은 빛·블룸), lit(은은히 밝음·블룸 없음), unlit.
 * vc = 꼭짓점 색을 곱하는 판(bake 가 쓴다).
 */
export function finish(name = 'matte', vc = false) {
  const key = `${name}|${vc}`;
  let m = finishCache.get(key);
  if (m) return m;
  const map = paletteTex();
  if (name === 'unlit') m = new THREE.MeshBasicMaterial({ map, vertexColors: vc });
  else if (GLOW_K[name]) {
    m = new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: new THREE.Color('#ffffff'), emissiveIntensity: GLOW_K[name], roughness: 0.5, vertexColors: vc });
  } else {
    const o = FIN_OPT[name] || FIN_OPT.matte;
    m = new THREE.MeshStandardMaterial({ map, roughness: o.rough, metalness: o.metal || 0, envMapIntensity: o.env ?? 0.6, flatShading: !!o.flat, vertexColors: vc });
  }
  m.name = `pal:${key}`;
  finishCache.set(key, m);
  palFin.set(m, name);
  return m;
}

const cgCache = new Map();
/** 도형을 한 색으로 칠한 사본(캐시). */
export function cgeo(geo, hex) {
  const key = geo.uuid + hex;
  let g = cgCache.get(key);
  if (g) return g;
  g = geo.clone();
  const [u, v] = palUV(hex);
  const n = g.attributes.position.count;
  const uv = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    uv[i * 2] = u;
    uv[i * 2 + 1] = v;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.userData.shared = true;
  cgCache.set(key, g);
  return g;
}

/**
 * 팔레트 색 메시. o = { pos, rot, scale, fin, cast, tt, ao }
 *   tt = [그늘색, 볕색, 치우침?] → 굽기 때 해 쪽 면과 윗부분은 볕색, 반대쪽은 그늘색으로 칠한다(두 톤 잎·바위).
 *   ao = false → 접지 그늘을 굽지 않는다.
 * 그림자는 나중에 shadowPolicy 가 위치를 보고 정한다(가까운 것만 드리운다).
 */
export function P(geo, hex, o = {}) {
  const m = new THREE.Mesh(cgeo(geo, o.tt ? '#ffffff' : hex), finish(o.fin || 'matte'));
  if (o.pos) m.position.set(o.pos[0], o.pos[1], o.pos[2]);
  if (o.rot) m.rotation.set(o.rot[0], o.rot[1], o.rot[2]);
  if (o.scale !== undefined) {
    if (Array.isArray(o.scale)) m.scale.set(o.scale[0], o.scale[1], o.scale[2]);
    else m.scale.setScalar(o.scale);
  }
  if (o.cast === false) m.userData.noCast = true;
  if (o.tt) m.userData.tt = o.tt;
  if (o.ao === false) m.userData.noAO = true;
  return m;
}

/** 자리 잡은 빈 묶음. */
export function G(parent, x = 0, y = 0, z = 0, ry = 0, s = 1) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = ry;
  g.scale.setScalar(s);
  if (parent) parent.add(g);
  return g;
}

/**
 * 가까운 것(그림자 지도 안)만 그림자를 드리우고 받게 한다. 먼 것은 둘 다 끈다(그림자 그리기 비용 절약).
 */
export function shadowPolicy(group, { zMin = -9.5, xMax = 8.5 } = {}) {
  group.updateMatrixWorld(true);
  const v = new THREE.Vector3();
  group.traverse((o) => {
    if (!o.isMesh || o.name === 'outline' || o.isInstancedMesh) return;
    o.getWorldPosition(v);
    const near = v.z > zMin && Math.abs(v.x) < xMax;
    o.castShadow = near && !o.userData.noCast;
    o.receiveShadow = near;
  });
}

const LIGHT = [-0.65, 1, 0.3]; // 두 톤 기준 빛(왼쪽 위): 왼쪽·윗면은 볕, 오른쪽·아랫면은 그늘
const _m4 = new THREE.Matrix4();
const _wp = new THREE.Vector3();
const _lo = new THREE.Color();
const _hi = new THREE.Color();

/**
 * 움직이지 않는 묶음을 재질별로 하나의 메시로 합친다(kit 의 bakeStatic 과 같고, 팔레트 소품에는 꼭짓점 색을 굽는다).
 * @param {{H?: (x:number,z:number)=>number, ao?: number, aoH?: number, light?: number[]}} o
 *   H = 땅 높이(접지 그늘 기준), ao = 땅에 닿는 곳을 어둡게 하는 정도, aoH = 그늘이 올라오는 높이, light = 두 톤의 해 방향.
 */
export function bakeV(group, { H = null, ao = 0.32, aoH = 0.5, light = LIGHT } = {}) {
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const L = new THREE.Vector3(...light).normalize();
  const buckets = new Map();
  const remove = [];
  group.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.userData.dynamic || o.name === 'outline') return;
    for (let p = o.parent; p && p !== group; p = p.parent) if (p.userData.dynamic) return;
    const fin = palFin.get(o.material);
    const material = fin ? finish(fin, true) : o.material;
    const key = `${material.uuid}|${o.castShadow ? 1 : 0}|${o.receiveShadow ? 1 : 0}`;
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
    const n = g.attributes.position.count;
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n * 2), 2));
    if (!g.attributes.normal) g.computeVertexNormals();
    g.applyMatrix4(_m4.multiplyMatrices(inv, o.matrixWorld));
    if (fin) {
      const pos = g.attributes.position.array;
      const nrm = g.attributes.normal.array;
      const col = new Float32Array(n * 3).fill(1);
      const tt = o.userData.tt;
      if (tt) {
        _lo.set(tt[0]);
        _hi.set(tt[1]);
        const bias = tt[2] ?? 0;
        g.computeBoundingSphere();
        const c = g.boundingSphere.center;
        const r = Math.max(1e-3, g.boundingSphere.radius);
        for (let i = 0; i < n; i++) {
          const k = nrm[i * 3] * L.x + nrm[i * 3 + 1] * L.y + nrm[i * 3 + 2] * L.z;
          const s = smooth(-0.25, 0.35, k * 0.7 + ((pos[i * 3 + 1] - c.y) / r) * 0.45 + bias);
          col[i * 3] = _lo.r + (_hi.r - _lo.r) * s;
          col[i * 3 + 1] = _lo.g + (_hi.g - _lo.g) * s;
          col[i * 3 + 2] = _lo.b + (_hi.b - _lo.b) * s;
        }
      }
      if (ao > 0 && !o.userData.noAO && !GLOW_K[fin]) {
        o.getWorldPosition(_wp);
        const gy = o.userData.groundY ?? (H ? H(_wp.x, _wp.z) : 0);
        for (let i = 0; i < n; i++) {
          const f = 1 - ao * (1 - smooth(0, aoH, pos[i * 3 + 1] - gy));
          col[i * 3] *= f;
          col[i * 3 + 1] *= f;
          col[i * 3 + 2] *= f * 0.97 + 0.03; // 그늘은 살짝 푸르게
        }
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    }
    if (!buckets.has(key)) buckets.set(key, { material, cast: o.castShadow, receive: o.receiveShadow, geos: [] });
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
    m.userData.ownGeometry = true;
    group.add(m);
  }
  return group;
}

/** 정적 소품 묶음을 굽는다(그림자 정책 → 재질별 합치기 + 꼭짓점 그늘). */
export function bake(group, opts = {}) {
  shadowPolicy(group, opts);
  bakeV(group, opts);
  return group;
}

// ───────── 흩뿌리기(인스턴스) ─────────

const partsCache = new Map();
/**
 * 조각 여러 개를 꼭짓점 색으로 칠해 한 도형으로 합친다(캐시). 흩뿌리기용 작은 소품 모양.
 * parts = [[geo, '#hex', {pos, rot, scale, grad:[아래 밝기, 위 밝기]}], ...]
 */
export function partsGeo(key, parts) {
  let g = partsCache.get(key);
  if (g) return g;
  const c = new THREE.Color();
  const geos = parts.map(([geo, hex, o = {}]) => {
    const p = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const name of Object.keys(p.attributes)) if (!['position', 'normal'].includes(name)) p.deleteAttribute(name);
    const m = new THREE.Object3D();
    if (o.pos) m.position.set(...o.pos);
    if (o.rot) m.rotation.set(...o.rot);
    if (o.scale !== undefined) Array.isArray(o.scale) ? m.scale.set(...o.scale) : m.scale.setScalar(o.scale);
    m.updateMatrix();
    p.applyMatrix4(m.matrix);
    const n = p.attributes.position.count;
    const col = new Float32Array(n * 3);
    c.set(hex);
    p.computeBoundingBox();
    const y0 = p.boundingBox.min.y;
    const y1 = Math.max(p.boundingBox.max.y, y0 + 1e-4);
    const [k0, k1] = o.grad || [1, 1];
    for (let i = 0; i < n; i++) {
      const k = k0 + (k1 - k0) * ((p.attributes.position.getY(i) - y0) / (y1 - y0));
      col[i * 3] = c.r * k;
      col[i * 3 + 1] = c.g * k;
      col[i * 3 + 2] = c.b * k;
    }
    p.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return p;
  });
  g = mergeGeometries(geos, false);
  for (const p of geos) p.dispose();
  g.userData.shared = true;
  partsCache.set(key, g);
  return g;
}

const instMats = new Map();
function instMat(fin) {
  let m = instMats.get(fin);
  if (!m) {
    const o = FIN_OPT[fin] || FIN_OPT.matte;
    m = new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: o.rough, metalness: o.metal || 0, envMapIntensity: o.env ?? 0.5, flatShading: !!o.flat });
    m.name = `inst:${fin}`;
    instMats.set(fin, m);
  }
  return m;
}

const _o3 = new THREE.Object3D();
const _ic = new THREE.Color();
/**
 * 같은 모양 여러 개를 InstancedMesh 하나로 그린다. geo 는 partsGeo 로 만든 꼭짓점 색 도형.
 * items = [[x, y, z, s(수 또는 [sx,sy,sz]), ry, '#tint'?, rx?, rz?], ...]  tint 는 꼭짓점 색에 곱한다.
 * 무대를 내릴 때 도형과 함께 인스턴스 버퍼도 해제된다.
 */
export function scatter(parent, geo, items, { fin = 'matte', cast = false, receive = true } = {}) {
  if (!items.length) return null;
  const g = geo.clone();
  const im = new THREE.InstancedMesh(g, instMat(fin), items.length);
  items.forEach(([x, y, z, s = 1, ry = 0, tint = null, rx = 0, rz = 0], i) => {
    _o3.position.set(x, y, z);
    _o3.rotation.set(rx, ry, rz);
    if (Array.isArray(s)) _o3.scale.set(s[0], s[1], s[2]);
    else _o3.scale.setScalar(s);
    _o3.updateMatrix();
    im.setMatrixAt(i, _o3.matrix);
    im.setColorAt(i, _ic.set(tint || '#ffffff'));
  });
  im.instanceMatrix.needsUpdate = true;
  if (im.instanceColor) im.instanceColor.needsUpdate = true;
  im.castShadow = cast;
  im.receiveShadow = receive;
  im.frustumCulled = false;
  im.userData.ownGeometry = true;
  im.matrixAutoUpdate = false;
  im.updateMatrix();
  // disposeTree 가 도형을 해제할 때 인스턴스 버퍼도 함께 해제한다
  g.addEventListener('dispose', () => im.dispose());
  parent.add(im);
  return im;
}

// ───────── 공유 재질(빛 스프라이트 등) ─────────

const spriteMats = new Map();
/**
 * 빛 스프라이트(덧그리기, 카메라를 향한다). 재질은 key 마다 하나만 만들어 다시 쓴다.
 * boost > 1 이면 색을 HDR 로 키워 블룸이 걸린다(등불·별·해). 같은 key 의 스프라이트는 불투명도를 함께 쓴다.
 */
export function glowS(key, color, size = 1, opacity = 0.8, boost = 1) {
  let m = spriteMats.get(key);
  if (!m) {
    m = new THREE.SpriteMaterial({
      map: glowTexture(),
      color: new THREE.Color(color).multiplyScalar(boost),
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    spriteMats.set(key, m);
  }
  m.opacity = opacity;
  const s = new THREE.Sprite(m);
  s.scale.setScalar(size);
  s.renderOrder = 5;
  s.raycast = () => {};
  return s;
}

const sharedMats = new Map();
/** key 로 캐시한 아무 재질(무대를 다시 만들어도 새로 만들지 않는다). */
export function sharedMat(key, make) {
  let m = sharedMats.get(key);
  if (!m) sharedMats.set(key, (m = make()));
  return m;
}

// ───────── 잡음 ─────────

function hash2(x, y) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
/** 값 잡음 0..1 (부드러운 보간). */
export function noise2(x, y) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi);
  const b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1);
  const d = hash2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
/** 겹 잡음 0..1 */
export function fbm(x, y, oct = 3) {
  let s = 0;
  let a = 0.5;
  let n = 0;
  for (let i = 0; i < oct; i++) {
    s += noise2(x, y) * a;
    n += a;
    x *= 2.03;
    y *= 2.03;
    a *= 0.5;
  }
  return s / n;
}

// ───────── 지형 ─────────

const terrainMats = new Map();
export function vcolMat(rough = 0.95, key = 'terrain') {
  const k = `${key}|${rough}`;
  let m = terrainMats.get(k);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: rough, metalness: 0, envMapIntensity: 0.55 });
    terrainMats.set(k, m);
  }
  return m;
}

/**
 * 높이 그물 지형. 줄은 카메라에서의 거리에 로그 간격으로 놓아(가까울수록 촘촘) 화면에서 고르게 보이게 하고,
 * 줄마다 가로 폭을 화면 시야만큼 넓힌다.
 * @param {{H:(x:number,z:number)=>number, C:(x:number,y:number,z:number,ny:number)=>string|number[],
 *          zNear?:number, zFar?:number, rows?:number, cols?:number, wide?:number, keep?:(x:number,z:number,y:number)=>boolean}} o
 *   C 는 sRGB '#rrggbb' 또는 [r,g,b](0..1, sRGB) 를 돌려준다. keep 이 false 인 꼭짓점만으로 된 삼각형은 뺀다.
 */
export function terrain({ H, C, zNear = 9, zFar = -300, rows = 150, cols = 128, wide = 1.35, keep = null, rough = 0.95, matKey = 'terrain' }) {
  const d0 = CAM_Z - zNear;
  const d1 = CAM_Z - zFar;
  const nv = rows * (cols + 1);
  const pos = new Float32Array(nv * 3);
  let p = 0;
  for (let i = 0; i < rows; i++) {
    const d = d0 * Math.pow(d1 / d0, i / (rows - 1));
    const z = CAM_Z - d;
    const W = 4.1 * (d / CAM_Z) * wide + 2;
    for (let j = 0; j <= cols; j++) {
      const x = -W + (2 * W * j) / cols;
      pos[p++] = x;
      pos[p++] = H(x, z);
      pos[p++] = z;
    }
  }
  const idx = [];
  const kept = keep ? new Uint8Array(nv) : null;
  if (keep) for (let v = 0; v < nv; v++) kept[v] = keep(pos[v * 3], pos[v * 3 + 2], pos[v * 3 + 1]) ? 1 : 0;
  for (let i = 0; i < rows - 1; i++) {
    for (let j = 0; j < cols; j++) {
      const a = i * (cols + 1) + j;
      const b = a + 1;
      const c = a + cols + 1;
      const d = c + 1;
      if (!kept || kept[a] || kept[b] || kept[c]) idx.push(a, b, c);
      if (!kept || kept[b] || kept[d] || kept[c]) idx.push(b, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const nrm = g.attributes.normal.array;
  const col = new Float32Array(nv * 3);
  const c = new THREE.Color();
  for (let v = 0; v < nv; v++) {
    const r = C(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2], nrm[v * 3 + 1]);
    if (typeof r === 'string') c.set(r);
    else c.setRGB(r[0], r[1], r[2], THREE.SRGBColorSpace);
    col[v * 3] = c.r;
    col[v * 3 + 1] = c.g;
    col[v * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.Mesh(g, vcolMat(rough, matKey));
  m.receiveShadow = true;
  m.castShadow = false;
  m.userData.ownGeometry = true;
  m.matrixAutoUpdate = false;
  m.updateMatrix();
  return m;
}

/**
 * 깎아지른 절벽 덩어리(곶·바위산). 발자국은 중심(cx, cz) 둘레의 반지름 함수 R(θ) 로 정한다.
 * 옆벽은 층마다 조금씩 울퉁불퉁하고 띠 무늬 바위색, 윗면은 살짝 부푼 풀밭이며 가장자리가 둥글게 넘어간다.
 * @returns {{mesh: THREE.Mesh, topY: (x:number, z:number)=>number, inside: (x:number, z:number)=>number}}
 *   inside = 중심에서의 거리 / 그 방향 반지름(1 = 가장자리)
 */
export function mesa({ cx, cz, R, top = 4, bottom = -1, rings = 9, seg = 72, dome = 0.35, seed = 1, rock = ['#c99363', '#a86f4c', '#8a5640'], grass = ['#7cc045', '#a6d75a'], taper = 0.06, lump = 0.12 }) {
  const r = rng(seed);
  const phase = [r() * 10, r() * 10, r() * 10];
  const ringR = (k, t) => 1 - taper * (k / rings) + lump * (Math.sin(t * 5 + phase[0] + k * 0.9) * 0.5 + Math.sin(t * 11 + phase[1] - k * 1.7) * 0.35) / Math.max(1, R(t) * 0.25);
  const pos = [];
  const col = [];
  const c = new THREE.Color();
  const push = (x, y, z, hex) => {
    pos.push(x, y, z);
    c.set(hex);
    col.push(c.r, c.g, c.b);
  };
  const band = (k) => {
    const v = (Math.sin(k * 2.3 + phase[2]) + 1) / 2;
    return k < 2 ? rock[2] : mix(rock[0], rock[1], v * 0.8);
  };
  // 옆벽 고리들(아래 → 위), 맨 위 두 고리는 풀 언저리
  const layers = [];
  for (let k = 0; k <= rings; k++) layers.push({ y: bottom + ((top - bottom) * k) / rings, k, colr: k >= rings ? grass[0] : band(k), wall: true });
  layers.push({ y: top + 0.12, k: rings + 1, colr: grass[0] });
  layers.push({ y: top + dome * 0.45, k: rings + 2, colr: mix(grass[0], grass[1], 0.4) });
  layers.push({ y: top + dome * 0.85, k: rings + 3, colr: grass[1] });
  for (const L of layers) {
    for (let i = 0; i < seg; i++) {
      const t = (i / seg) * TAU;
      const rad = R(t);
      const base = rad * ringR(Math.min(L.k, rings), t);
      const f = L.wall ? base : L.k === rings + 1 ? base - 0.25 : L.k === rings + 2 ? base * 0.62 : base * 0.3;
      const nn = L.wall ? 1 + (r() - 0.5) * 0.04 : 1;
      const hex = L.wall && L.k < rings ? mix(L.colr, '#ffffff', (r() - 0.5) * 0.12 + 0.03) : L.colr;
      push(cx + Math.cos(t) * f * nn, L.y + (L.wall && L.k > 0 && L.k < rings ? (r() - 0.5) * 0.12 : 0), cz - Math.sin(t) * f * nn, hex);
    }
  }
  const centre = pos.length / 3;
  push(cx, top + dome, cz, grass[1]);
  const idx = [];
  const nL = layers.length;
  for (let l = 0; l < nL - 1; l++) {
    for (let i = 0; i < seg; i++) {
      const a = l * seg + i;
      const b = l * seg + ((i + 1) % seg);
      const cc = (l + 1) * seg + i;
      const d = (l + 1) * seg + ((i + 1) % seg);
      idx.push(a, b, cc, b, d, cc);
    }
  }
  const last = (nL - 1) * seg;
  for (let i = 0; i < seg; i++) idx.push(centre, last + i, last + ((i + 1) % seg));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, vcolMat(0.92));
  m.userData.ownGeometry = true;
  m.receiveShadow = true;
  m.matrixAutoUpdate = false;
  m.updateMatrix();
  const inside = (x, z) => {
    const t = Math.atan2(-(z - cz), x - cx);
    return Math.hypot(x - cx, z - cz) / R((t + TAU) % TAU);
  };
  const topY = (x, z) => top + dome * (1 - clamp(inside(x, z)) ** 2) * 0.9;
  return { mesh: m, topY, inside };
}

/**
 * 앞마당 띠(길·보도처럼 또렷한 무늬가 필요한 땅). x 방향으로 반복하는 캔버스 그림 한 장을 깐다.
 * draw(ctx, W, H, zOf) : 캔버스 위쪽(행 0)이 zNear, 아래쪽이 zFar. zOf(row) → z, rowOf(z) → row.
 */
export function stripGround({ key, zNear = 9, zFar = -5, period = 8, xHalf = 40, px = 64, draw, rough = 0.9, y = 0 }) {
  const W = Math.round(period * px);
  const Hh = Math.round((zNear - zFar) * px);
  const rowOf = (z) => ((zNear - z) / (zNear - zFar)) * Hh;
  const tex = cachedTex(`strip:${key}`, W, Hh, (ctx) => draw(ctx, W, Hh, rowOf));
  tex.wrapS = THREE.RepeatWrapping;
  tex.flipY = false;
  tex.needsUpdate = true;
  const g = new THREE.PlaneGeometry(2 * xHalf, zNear - zFar, 1, 1);
  g.rotateX(-Math.PI / 2);
  g.translate(0, y, (zNear + zFar) / 2);
  const uv = g.attributes.uv;
  const pos = g.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / period, (zNear - pos.getZ(i)) / (zNear - zFar));
  const m = new THREE.Mesh(g, mat('#ffffff', { map: tex, rough }));
  m.receiveShadow = true;
  m.userData.ownGeometry = true;
  m.matrixAutoUpdate = false;
  m.updateMatrix();
  return m;
}

/**
 * 땅 위에 덮는 반투명 그림(길과 길 가장자리, 풀 결, 잔돌 같은 잔무늬). 지형의 꼭짓점 색 위에 얹힌다.
 * draw(ctx, W, H, X, Z, r): X(x) → 캔버스 x, Z(z) → 캔버스 y(위쪽이 zNear). 칠하지 않은 곳은 투명하게 둔다.
 * H(x, z) 를 주면 땅 높이를 따라 휜다.
 */
export function groundDecal({ key, x0 = -6.6, x1 = 6.6, zNear = 9, zFar = -7, px = 64, draw, y = 0.004, H = null, rough = 0.95, seg = [24, 32] }) {
  const W = Math.round((x1 - x0) * px);
  const Hh = Math.round((zNear - zFar) * px);
  const X = (x) => ((x - x0) / (x1 - x0)) * W;
  const Z = (z) => ((zNear - z) / (zNear - zFar)) * Hh;
  const tex = cachedTex(`decal:${key}`, W, Hh, (ctx) => draw(ctx, W, Hh, X, Z, rng(W + Hh)), { mip: true });
  tex.flipY = false;
  tex.needsUpdate = true;
  const g = new THREE.PlaneGeometry(x1 - x0, zNear - zFar, seg[0], seg[1]);
  g.rotateX(-Math.PI / 2);
  g.translate((x0 + x1) / 2, 0, (zNear + zFar) / 2);
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, (H ? H(x, z) : 0) + y);
    uv.setXY(i, (x - x0) / (x1 - x0), (zNear - z) / (zNear - zFar));
  }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, sharedMat(`decal:${key}`, () => new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: rough, envMapIntensity: 0.5, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 })));
  m.receiveShadow = true;
  m.renderOrder = 1;
  m.userData.ownGeometry = true;
  m.matrixAutoUpdate = false;
  m.updateMatrix();
  return m;
}

/** 칠한 풀 결(작은 초승달·붓 자국)을 뿌린다. 색은 반투명 rgba 를 권한다. */
export function grassStrokes(ctx, x0, y0, w, h, n, cols, r, size = [3, 7]) {
  for (let i = 0; i < n; i++) {
    const x = x0 + r() * w;
    const y = y0 + r() * h;
    const s = size[0] + r() * (size[1] - size[0]);
    ctx.fillStyle = cols[(r() * cols.length) | 0];
    ctx.beginPath();
    ctx.moveTo(x - s, y);
    ctx.quadraticCurveTo(x - s * 0.2, y - s * 0.9, x + s * 0.15, y - s * 1.1);
    ctx.quadraticCurveTo(x + s * 0.1, y - s * 0.4, x + s, y);
    ctx.quadraticCurveTo(x, y + s * 0.25, x - s, y);
    ctx.fill();
  }
}

/** 캔버스에 잡티(작은 점·얼룩)를 뿌린다. */
export function speckle(ctx, x0, y0, w, h, n, cols, r = Math.random, size = [1, 3]) {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = cols[(r() * cols.length) | 0];
    const s = size[0] + r() * (size[1] - size[0]);
    ctx.beginPath();
    ctx.ellipse(x0 + r() * w, y0 + r() * h, s, s * 0.6, 0, 0, TAU);
    ctx.fill();
  }
}

/** 작은 자동차(정면 +x 방향). */
export function car(parent, x, y, z, ry = 0, s = 1, col = '#e2483c') {
  const g = G(parent, x, y, z, ry, s);
  g.add(P(roundBoxGeo(1.3, 0.34, 0.62, 0.12, 2), col, { pos: [0, 0.3, 0], fin: 'soft' }));
  g.add(P(roundBoxGeo(0.72, 0.3, 0.56, 0.1, 2), col, { pos: [-0.08, 0.58, 0], fin: 'soft' }));
  g.add(P(roundBoxGeo(0.62, 0.22, 0.58, 0.06, 2), '#9fd3ff', { pos: [-0.08, 0.6, 0], fin: 'gloss' }));
  g.add(P(roundBoxGeo(0.12, 0.22, 0.6, 0.05, 2), col, { pos: [-0.08, 0.6, 0], fin: 'soft' }));
  for (const sx of [-0.4, 0.4]) for (const sz of [-0.3, 0.3]) g.add(P(cylGeo(0.14, 0.14, 0.1, 14), '#2b2f45', { pos: [sx, 0.14, sz], rot: [Math.PI / 2, 0, 0] }));
  g.add(P(sphereGeo(1, 8, 6), '#fff3c4', { pos: [0.64, 0.34, 0.2], scale: [0.03, 0.05, 0.06], fin: 'gloss' }));
  g.add(P(sphereGeo(1, 8, 6), '#fff3c4', { pos: [0.64, 0.34, -0.2], scale: [0.03, 0.05, 0.06], fin: 'gloss' }));
  return g;
}

/** 다듬은 산울타리(둥근 상자). */
export function hedge(parent, x, y, z, len, s = 1, col = '#4f9e3e', ry = 0) {
  const g = G(parent, x, y, z, ry, s);
  g.add(P(roundBoxGeo(len, 0.42, 0.38, 0.16, 3), col, { pos: [0, 0.21, 0] }));
  return g;
}

/** sRGB hex → [r,g,b] 0..1 */
export function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
/** [r,g,b] 섞기 */
export function mixv(a, b, t) {
  t = clamp(t);
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

// ───────── 물 ─────────

const waterCache = new Map();
/** 반짝이는 물 재질(하늘을 비춘다). */
export function waterMat(color, { rough = 0.18, opacity = 1, map = null, env = 1.2 } = {}) {
  const key = `${color}|${rough}|${opacity}|${map ? map.uuid : ''}|${env}`;
  let m = waterCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: rough, metalness: 0.05, envMapIntensity: env, transparent: opacity < 1, opacity, map });
    if (opacity < 1) m.depthWrite = false;
    waterCache.set(key, m);
  }
  return m;
}

const texCache = new Map();
/** 한 번만 그리는 캔버스 텍스처(무대를 다시 만들어도 재사용). */
export function cachedTex(key, w, h, draw, { repeat = null, srgb = true, mip = true } = {}) {
  let t = texCache.get(key);
  if (t) return t;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  draw(cv.getContext('2d'), w, h);
  t = new THREE.CanvasTexture(cv);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (!mip) {
    t.generateMipmaps = false;
    t.minFilter = THREE.LinearFilter;
  }
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  texCache.set(key, t);
  return t;
}

/** 물결 반짝임 무늬(반복). */
export function rippleTex() {
  return cachedTex('ripple', 256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    const r = rng(7);
    for (let i = 0; i < 90; i++) {
      const x = r() * w;
      const y = r() * h;
      const l = 6 + r() * 26;
      ctx.fillStyle = `rgba(255,255,255,1)`;
      ctx.globalAlpha = 1;
      ctx.fillStyle = r() < 0.5 ? '#dfefff' : '#ffffff';
      ctx.fillRect(x, y, l, 1.5 + r() * 1.5);
    }
    // 아주 옅은 어두운 결
    for (let i = 0; i < 70; i++) {
      ctx.fillStyle = 'rgba(40,80,150,0.12)';
      ctx.fillRect(r() * w, r() * h, 10 + r() * 30, 2);
    }
  }, { repeat: [1, 1] });
}

// ───────── 빛 점(한 번에 그리는 반짝이·등불) ─────────

const pointsMats = new Map();
/**
 * 빛 점 여러 개를 한 번에 그린다. pts = [[x,y,z,'#color', boost?], ...], size = 픽셀 크기(원근 없음) 또는 세계 크기(sizeAttenuation).
 * boost > 1 이면 색을 HDR 로 키워 블룸이 걸린다(점마다 다섯 번째 값으로 따로 줄 수도 있다).
 */
export function glowPoints(pts, { size = 8, atten = false, opacity = 1, tex = null, fog = false, additive = true, boost = 1 } = {}) {
  const pos = new Float32Array(pts.length * 3);
  const col = new Float32Array(pts.length * 3);
  const c = new THREE.Color();
  pts.forEach((p, i) => {
    pos.set([p[0], p[1], p[2]], i * 3);
    c.set(p[3] || '#ffffff').multiplyScalar(p[4] ?? boost);
    col.set([c.r, c.g, c.b], i * 3);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const key = `${size}|${atten}|${opacity}|${tex ? tex.uuid : 'g'}|${fog}|${additive}`;
  let m = pointsMats.get(key);
  if (!m) {
    m = new THREE.PointsMaterial({
      size,
      sizeAttenuation: atten,
      map: tex || glowTexture(),
      vertexColors: true,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      fog,
    });
    pointsMats.set(key, m);
  }
  const pts3 = new THREE.Points(g, m);
  pts3.userData.ownGeometry = true;
  pts3.frustumCulled = false;
  pts3.renderOrder = 4;
  return pts3;
}

/** 작은 별 모양 텍스처(가운데 밝은 점 + 십자 빛). */
export function starTex() {
  return cachedTex('star', 64, 64, (ctx, w) => {
    const c = w / 2;
    const g = ctx.createRadialGradient(c, c, 0, c, c, c);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.12, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.3, 'rgba(255,255,255,0.18)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, w);
    ctx.globalAlpha = 0.5;
    const lg = ctx.createLinearGradient(0, c, w, c);
    lg.addColorStop(0, 'rgba(255,255,255,0)');
    lg.addColorStop(0.5, 'rgba(255,255,255,1)');
    lg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(0, c - 1, w, 2);
    const lg2 = ctx.createLinearGradient(c, 0, c, w);
    lg2.addColorStop(0, 'rgba(255,255,255,0)');
    lg2.addColorStop(0.5, 'rgba(255,255,255,1)');
    lg2.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = lg2;
    ctx.fillRect(c - 1, 0, 2, w);
  }, { mip: false });
}

/** 하늘에 별 뿌리기(하늘 돔 안쪽 반지름 R). 밝기에 따라 두 겹(작은 별 / 큰 별, 큰 별은 블룸). */
export function starField(seed, { n = 260, R = 420, yMin = 0.04, big = 0.12, color = ['#ffffff', '#cfe0ff', '#fff1c8'], size = [2.2, 5.5], fade = null, boost = [1, 2.6] } = {}) {
  const r = rng(seed);
  const small = [];
  const large = [];
  for (let i = 0; i < n; i++) {
    const az = -Math.PI * 0.45 + r() * Math.PI * 0.9; // 앞쪽(−z) 부채꼴
    const el = yMin + Math.pow(r(), 0.8) * (1.25 - yMin);
    const dir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
    const c = color[(r() * color.length) | 0];
    const tint = fade ? mix(c, fade, clamp(1 - (el - yMin) / 0.25) * 0.85) : c;
    (r() < big ? large : small).push([dir.x * R, dir.y * R, CAM_Z + dir.z * R, tint]);
  }
  const g = new THREE.Group();
  const a = glowPoints(small, { size: size[0], tex: starTex(), boost: boost[0] });
  const b = glowPoints(large, { size: size[1], tex: starTex(), boost: boost[1] });
  g.add(a, b);
  g.userData.layers = [a, b];
  return g;
}

// ───────── 구름 ─────────

const cloudMatCache = new Map();
/**
 * 구름 재질: 거의 스스로 빛나는 흰색에, 해를 등진 쪽과 아랫면은 라벤더빛 그늘이 진다.
 * light = 해가 오는 방향(세계), color = 볕 받는 면, shade = 그늘, rim = 가장자리 밝기.
 */
export function cloudMat(color = '#ffffff', shade = '#b8c2f0', { opacity = 1, fog = false, light = [-0.5, 0.8, 0.45], mid = null, steps = [-0.75, 0.05, 0.0, 0.7], rim = 0.35 } = {}) {
  const key = `${color}|${shade}|${opacity}|${fog}|${light}|${mid}|${steps}|${rim}`;
  let m = cloudMatCache.get(key);
  if (m) return m;
  m = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: opacity < 1, opacity, fog });
  if (opacity < 1) m.depthWrite = false;
  const L = new THREE.Vector3(...light).normalize();
  const top = new THREE.Color(color);
  const sh = new THREE.Color(shade);
  const md = new THREE.Color(mid || mix(color, shade, 0.35));
  m.onBeforeCompile = (shader) => {
    shader.uniforms.cTop = { value: top };
    shader.uniforms.cShade = { value: sh };
    shader.uniforms.cMid = { value: md };
    shader.uniforms.cL = { value: L };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWN; varying vec3 vVD;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWN = normalize( mat3( modelMatrix ) * normal );\nvVD = normalize( ( modelMatrix * vec4( position, 1.0 ) ).xyz - cameraPosition );');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 cTop; uniform vec3 cShade; uniform vec3 cMid; uniform vec3 cL; varying vec3 vWN; varying vec3 vVD;')
      .replace(
        'vec4 diffuseColor = vec4( diffuse, opacity );',
        `vec3 n = normalize( vWN );
        float lit = dot( n, cL ) * 0.55 + n.y * 0.45;
        vec3 cc = mix( cShade, cMid, smoothstep( ${steps[0].toFixed(3)}, ${steps[1].toFixed(3)}, lit ) );
        cc = mix( cc, cTop, smoothstep( ${steps[2].toFixed(3)}, ${steps[3].toFixed(3)}, lit ) );
        float rim = pow( 1.0 - abs( dot( n, -vVD ) ), 3.0 );
        cc = mix( cc, cTop, rim * ${rim.toFixed(3)} * smoothstep( -0.2, 0.4, n.y ) );
        vec4 diffuseColor = vec4( cc, opacity );`,
      );
  };
  m.customProgramCacheKey = () => `cloudMat2|${steps}|${rim}`;
  cloudMatCache.set(key, m);
  return m;
}

/**
 * 뭉게구름 도형(구 여러 개를 하나로). 바닥은 납작하게 눌러 적운 모양을 낸다.
 * @param {()=>number} r 난수
 * @param {{w:number, h:number, d?:number, n?:number, seg?:number, flat?:number}} o  w = 가로 폭, h = 높이
 */
export function cumulusGeo(r, { w = 6, h = 2.6, d = null, n = 14, seg = 18, flat = 0.25, base = 0.18, soft = [0.6, 0.5] } = {}) {
  const geos = [];
  const depth = d ?? w * 0.35;
  const sg = sphereGeo(1, seg, Math.round(seg * 0.7));
  const blobs = [];
  // 받침(가로로 길게, 바닥은 나중에 눌린다) → 몸통(둥근 지붕 모양) → 꼭대기 작은 솜뭉치(꽃양배추 윤곽)
  const nb = Math.max(3, Math.round(n * 0.3));
  for (let i = 0; i < nb; i++) {
    const t = nb === 1 ? 0.5 : i / (nb - 1);
    const rr = w * (0.13 + 0.05 * r()) * (1 - Math.abs(t - 0.5) * 0.7);
    blobs.push([(t - 0.5) * w * 0.8, rr * 0.3, (r() - 0.5) * depth * 0.3, rr]);
  }
  const env = (t) => Math.sqrt(Math.max(0, 1 - (2 * t - 1) ** 2));
  const nBody = Math.round(n * 0.35);
  for (let i = 0; i < nBody; i++) {
    const t = 0.12 + r() * 0.76;
    const e = env(t);
    const rr = w * (0.11 + 0.06 * r()) * (0.55 + 0.45 * e);
    blobs.push([(t - 0.5) * w * 0.78, h * 0.18 + e * h * 0.3 * (0.6 + 0.4 * r()), (r() - 0.5) * depth * 0.35 + depth * 0.05, rr]);
  }
  const nCrown = n - nb - nBody;
  for (let i = 0; i < nCrown; i++) {
    const t = 0.15 + (i + r() * 0.8) / nCrown * 0.7;
    const e = env(t);
    const rr = w * (0.065 + 0.04 * r()) * (0.6 + 0.4 * e);
    const y = h * (0.3 + 0.45 * e) + rr * 0.2;
    blobs.push([(t - 0.5) * w * 0.74, Math.min(y, h - rr), (r() - 0.5) * depth * 0.3 + depth * 0.12, rr]);
  }
  for (const [x, y, z, rr] of blobs) {
    const g = sg.clone();
    g.scale(rr, rr * 0.92, Math.max(rr * 0.8, Math.min(rr, depth * 0.6)));
    g.translate(x, y, z);
    geos.push(g);
  }
  const merged = mergeGeometries(geos, false);
  for (const g of geos) g.dispose();
  // 바닥 누르기 + 법선 부드럽게(구끼리 만나는 주름이 덜 보이게, 덩어리 전체가 하나의 솜처럼 그늘지게)
  const p = merged.attributes.position;
  const nr = merged.attributes.normal;
  const b = h * base * 0.2;
  const cy = h * 0.35;
  const v = new THREE.Vector3();
  const nn = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    v.set(p.getX(i) / (w * 0.5), (y - cy) / (h * 0.6), p.getZ(i) / (depth * 0.6)).normalize();
    nn.set(nr.getX(i), nr.getY(i), nr.getZ(i)).multiplyScalar(soft[0]).addScaledVector(v, soft[1]).normalize();
    if (y < b) {
      p.setY(i, b + (y - b) * flat);
      nn.y = Math.min(nn.y, -0.2);
      nn.normalize();
    }
    nr.setXYZ(i, nn.x, nn.y, nn.z);
  }
  p.needsUpdate = true;
  merged.computeBoundingSphere();
  return merged;
}

/** 구름 한 덩이 메시(움직일 수 있음). */
export function cumulus(r, o, material) {
  const m = new THREE.Mesh(cumulusGeo(r, o), material);
  m.userData.ownGeometry = true;
  m.userData.dynamic = true;
  m.castShadow = false;
  m.receiveShadow = false;
  return m;
}

/**
 * 흘러가는 구름 목록. specs = [{x,y,z,w,h,speed}], 범위 [−span, span] 를 돌아 다시 들어온다.
 */
export function cloudLayer(parent, seed, specs, material) {
  const r = rng(seed);
  const list = [];
  for (const s of specs) {
    const m = cumulus(r, { w: s.w, h: s.h, n: s.n ?? 14, seg: s.seg ?? 18, d: s.d, flat: s.flat ?? 0.25 }, s.mat || material);
    m.position.set(s.x, s.y, s.z);
    if (s.ry) m.rotation.y = s.ry;
    parent.add(m);
    list.push({ m, x0: s.x, speed: s.speed ?? 0.15, span: s.span ?? 60 });
  }
  return (t) => {
    for (const c of list) {
      const span = c.span;
      let x = c.x0 + c.speed * t;
      x = ((((x + span) % (2 * span)) + 2 * span) % (2 * span)) - span;
      c.m.position.x = x;
    }
  };
}

// ───────── 식물 ─────────

/** 잎 두 톤 묶음 [그늘, 볕]. 그늘은 푸른 초록, 볕은 노란 연두(빛 계산 위에 칠해진 색). */
export const LEAF = {
  meadow: ['#2b6b4a', '#8ccb48'],
  fresh: ['#2f7a4c', '#9fd650'],
  deep: ['#1f5640', '#6fb446'],
  olive: ['#3a6a3e', '#b4cf58'],
  pine: ['#1f5848', '#6fb158'],
  pineDark: ['#173f3f', '#4f8f5a'],
  night: ['#173a44', '#3f7f6a'],
  dusk: ['#2a4f4c', '#c7b25a'],
  city: ['#2e6448', '#9ccf58'],
};
const TRUNK = ['#5a3420', '#a36d3c'];

const DEF_PUFFS = [
  // x, y, z, r  (줄기 끝 위 기준) — 가운데 큰 덩이 + 둘레 덩이 + 위 작은 혹: 뭉실뭉실한 실루엣
  [0, 0.1, 0, 0.58],
  [0.42, -0.08, 0.1, 0.42],
  [-0.4, -0.06, 0.08, 0.44],
  [0.06, -0.14, 0.4, 0.42],
  [-0.08, -0.1, -0.38, 0.42],
  [0.22, 0.42, 0.12, 0.34],
  [-0.24, 0.36, -0.06, 0.32],
];

/** 둥근 활엽수. 덩이마다 볕 쪽 위는 밝고 아래·그늘 쪽은 짙은 두 톤. o = { leaf:[그늘,볕], trunk, seg, trunkH, puffs, roots } */
export function roundTree(parent, x, y, z, s = 1, r = Math.random, o = {}) {
  const leaf = o.leaf || LEAF.meadow;
  const trunk = o.trunk || TRUNK;
  const seg = o.seg || 14;
  const g = G(parent, x, y, z, r() * TAU, s);
  const th = o.trunkH ?? 0.72;
  g.add(P(cylGeo(0.085, 0.15, th, Math.max(6, Math.round(seg * 0.6))), '', { pos: [0, th / 2, 0], tt: trunk }));
  if (o.roots !== false) g.add(P(sphereGeo(1, 9, 5), '', { pos: [0, 0.03, 0], scale: [0.24, 0.1, 0.24], tt: trunk }));
  const sg = sphereGeo(1, seg, Math.max(6, Math.round(seg * 0.7)));
  const cy = th + 0.42;
  for (const [px, py, pz, pr] of o.puffs || DEF_PUFFS) {
    const j = 0.9 + r() * 0.2;
    g.add(P(sg, '', { pos: [px, cy + py, pz], scale: [pr * j, pr * j * 0.88, pr * j], tt: [leaf[0], leaf[1], 0.04 + py * 0.25] }));
  }
  return g;
}

/** 덤불(땅에 붙은 잎 덩이 몇 개, 두 톤). o = { leaf, n, seg, flowers, flowerColor, flat } */
export function bush(parent, x, y, z, s = 1, r = Math.random, o = {}) {
  const leaf = o.leaf || LEAF.fresh;
  const seg = o.seg || 10;
  const g = G(parent, x, y, z, r() * TAU, s);
  const sg = sphereGeo(1, seg, Math.max(5, Math.round(seg * 0.65)));
  const n = o.n || 4;
  const fl = o.flat ?? 0.85;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + r();
    const rr = 0.24 + r() * 0.12;
    const rad = i === 0 ? 0 : 0.22 + r() * 0.1;
    g.add(P(sg, '', { pos: [Math.cos(a) * rad, rr * fl * 0.8 + (i === 0 ? 0.08 : 0), Math.sin(a) * rad], scale: [rr, rr * fl, rr], tt: [leaf[0], leaf[1], i === 0 ? 0.08 : 0] }));
  }
  if (o.flowers) {
    const fs = sphereGeo(1, 8, 6);
    for (let i = 0; i < o.flowers; i++) {
      const a = r() * TAU;
      const fy = 0.26 + r() * 0.18;
      g.add(P(fs, o.flowerColor || '#ffffff', { pos: [Math.cos(a) * 0.3, fy, Math.sin(a) * 0.3 + 0.06], scale: [0.06, 0.045, 0.06], ao: false }));
      g.add(P(fs, '#ffd23f', { pos: [Math.cos(a) * 0.31, fy + 0.03, Math.sin(a) * 0.31 + 0.065], scale: 0.022, ao: false }));
    }
  }
  return g;
}

const pineProfiles = new Map();
/** 둥근 끝 원뿔 층(소나무 한 층, 아랫단이 통통하게 말린다). */
function pineTierGeo(seg = 10) {
  let g = pineProfiles.get(seg);
  if (!g) {
    g = latheGeo([[0.0, -0.02], [0.7, 0.0], [0.97, 0.06], [1.0, 0.15], [0.86, 0.26], [0.5, 0.6], [0.18, 0.9], [0.0, 1.0]], seg, `pinetier2_${seg}`);
    pineProfiles.set(seg, g);
  }
  return g;
}

/** 소나무(둥근 층 3~4개, 두 톤). o = { leaf:[그늘,볕], trunk, tiers, seg, snow } */
export function pine(parent, x, y, z, s = 1, r = Math.random, o = {}) {
  const leaf = o.leaf || LEAF.pine;
  const g = G(parent, x, y, z, r() * TAU, s);
  g.add(P(cylGeo(0.07, 0.11, 0.42, 7), '', { pos: [0, 0.21, 0], tt: o.trunk || TRUNK }));
  const tiers = o.tiers || 3;
  const tg = pineTierGeo(o.seg || 10);
  for (let i = 0; i < tiers; i++) {
    const k = i / tiers;
    const rad = 0.66 * (1 - k * 0.55);
    const hh = 0.78 * (1 - k * 0.25);
    g.add(P(tg, '', { pos: [0, 0.32 + i * 0.42, 0], scale: [rad, hh, rad], tt: [leaf[0], leaf[1], -0.05 + k * 0.2] }));
  }
  if (o.snow) g.add(P(tg, '#f4f8ff', { pos: [0, 0.32 + (tiers - 1) * 0.42 + 0.38, 0], scale: [0.18, 0.3, 0.18] }));
  return g;
}

/** 꽃 무더기(낮게, 굵직하게). 높이 ≈ 0.1×s. */
export function flowers(parent, x, y, z, s = 1, r = Math.random, o = {}) {
  const cols = o.colors || ['#ffffff', '#ffd23f', '#ff8fb0', '#b08aff'];
  const g = G(parent, x, y, z, 0, s);
  const leafG = sphereGeo(1, 8, 5);
  const fg = sphereGeo(1, 7, 5);
  const n = o.n || 5;
  g.add(P(leafG, '', { pos: [0, 0.0, 0], scale: [0.18, 0.06, 0.13], cast: false, tt: o.leafTT || LEAF.fresh, ao: false }));
  for (let i = 0; i < n; i++) {
    const a = r() * TAU;
    const rad = r() * 0.14;
    const c = o.one ? cols[0] : cols[(r() * cols.length) | 0];
    const fx = Math.cos(a) * rad;
    const fz = Math.sin(a) * rad * 0.7;
    const fy = 0.055 + r() * 0.03;
    g.add(P(fg, c, { pos: [fx, fy, fz], scale: [0.045, 0.03, 0.045], cast: false, ao: false }));
    g.add(P(fg, '#ffd23f', { pos: [fx, fy + 0.022, fz + 0.01], scale: 0.016, cast: false, ao: false }));
  }
  return g;
}

/** 풀 포기(굵은 잎 몇 장, 높이 ≈ 0.12×s). 많이 쓸 때는 scatter + tuftGeo. */
export function tuft(parent, x, y, z, s = 1, r = Math.random, col = '#4f9e3e') {
  const g = G(parent, x, y, z, r() * TAU, s);
  const cg = coneGeo(0.032, 0.13, 4);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU;
    g.add(P(cg, col, { pos: [Math.cos(a) * 0.03, 0.055, Math.sin(a) * 0.03], rot: [Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4], cast: false, ao: false }));
  }
  return g;
}

const rockGeos = new Map();
/** 울퉁불퉁한 바위 도형(변형 몇 가지, 캐시). */
export function rockGeo(v = 0) {
  let g = rockGeos.get(v);
  if (g) return g;
  const r = rng(300 + v);
  g = mergeVertices(new THREE.IcosahedronGeometry(1, 1));
  const p = g.attributes.position;
  const ph = [r() * 6, r() * 6, r() * 6];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const k = 1 + 0.12 * Math.sin(x * 3 + ph[0]) + 0.1 * Math.sin(z * 3.4 + ph[1]) + 0.08 * Math.sin(y * 4 + ph[2]);
    // 바닥은 납작하게, 윗면도 살짝 평평하게(굵직한 돌덩이)
    p.setXYZ(i, x * k, Math.max(-0.35, Math.min(0.8, y * k)), z * k);
  }
  g.computeVertexNormals();
  g.userData.shared = true;
  rockGeos.set(v, g);
  return g;
}

/** 둥근 바위(두 톤: 위는 밝은 라벤더 회색, 아래는 짙은 남회색). */
export function rock(parent, x, y, z, s = 1, r = Math.random, col = '#b9b2c6') {
  const g = G(parent, x, y, z, r() * TAU, s);
  const tt = [mix(col, '#2b3a78', 0.45), mix(col, '#fff6e6', 0.3)];
  g.add(P(rockGeo((r() * 3) | 0), '', { pos: [0, 0.1, 0], scale: [0.34, 0.3 + r() * 0.08, 0.28], tt, fin: 'soft' }));
  if (r() < 0.6) g.add(P(rockGeo(3), '', { pos: [0.26, 0.05, 0.08], scale: [0.17, 0.15, 0.16], tt, fin: 'soft' }));
  return g;
}

/** 버섯(빨간 갓에 흰 점, 크림색 대). 높이 ≈ 0.32×s. */
export function mushroom(parent, x, y, z, s = 1, r = Math.random, o = {}) {
  const g = G(parent, x, y, z, r() * TAU, s);
  const cap = o.cap || '#e2483c';
  const stem = latheGeo([[0.0, 0], [0.075, 0], [0.065, 0.06], [0.055, 0.16], [0.06, 0.2], [0.0, 0.2]], 10, 'mushstem');
  const capG = latheGeo([[0.0, 0.0], [0.15, 0.0], [0.17, 0.03], [0.15, 0.08], [0.1, 0.13], [0.0, 0.15]], 14, 'mushcap');
  g.add(P(stem, '', { tt: ['#d8c4a8', '#fff4de'], cast: false }));
  g.add(P(capG, '', { pos: [0, 0.17, 0], tt: [mix(cap, '#3a1030', 0.4), mix(cap, '#ffd0a0', 0.25)] }));
  const dot = sphereGeo(1, 6, 4);
  for (const [a, rr, yy, sc] of [[0.3, 0.1, 0.27, 0.028], [2.2, 0.11, 0.26, 0.024], [4.1, 0.08, 0.29, 0.022], [5.4, 0.13, 0.24, 0.02], [0, 0, 0.32, 0.025]]) {
    g.add(P(dot, '#fff8ee', { pos: [Math.cos(a) * rr, yy, Math.sin(a) * rr], scale: [sc, sc * 0.5, sc], cast: false, ao: false }));
  }
  return g;
}

// ───────── 흩뿌릴 작은 것들(인스턴스 도형) ─────────

let bladeG = null;
/** 풀잎 하나(세모 기둥, 밑면 없음) */
function bladeGeo() {
  if (!bladeG) bladeG = new THREE.ConeGeometry(0.036, 0.17, 3, 1, true);
  return bladeG;
}

/** 풀 포기 도형(잎 5~7장, 밑동은 어둡고 끝은 밝다). 높이 ≈ 0.16. 색은 scatter 의 tint 로. */
export function tuftGeo(v = 0) {
  const r = rng(100 + v);
  const n = 5 + (v % 3);
  const blade = bladeGeo();
  const parts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + r() * 0.6;
    const tilt = 0.25 + r() * 0.4;
    const hs = 0.65 + r() * 0.4;
    parts.push([blade, '#ffffff', { pos: [Math.cos(a) * 0.035, 0.08 * hs, Math.sin(a) * 0.035], rot: [Math.sin(a) * tilt, 0, -Math.cos(a) * tilt], scale: [1, hs, 1], grad: [0.5, 1.3] }]);
  }
  return partsGeo(`tuft${v}`, parts);
}

let petalGeo = null;
/** 꽃잎 원반(꽃잎 5장 모양으로 가장자리를 물결지게 한 납작한 구). */
function petalDisc() {
  if (petalGeo) return petalGeo;
  const g = new THREE.SphereGeometry(1, 15, 3);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    const a = Math.atan2(z, x);
    const k = 0.6 + 0.4 * Math.abs(Math.cos(a * 2.5));
    p.setXYZ(i, x * k, p.getY(i) * 0.3, z * k);
  }
  g.computeVertexNormals();
  petalGeo = g;
  return g;
}

/** 꽃 도형: 줄기 + 꽃잎 원반 + 꽃술. 높이 ≈ 0.1(통로 규칙 안). */
export function flowerGeo(petal = '#ffffff', centre = '#ffc83a', stem = '#4f9e3e') {
  return partsGeo(`flower${petal}${centre}${stem}`, [
    [cylGeo(0.009, 0.012, 0.08, 4), stem, { pos: [0, 0.04, 0] }],
    [sphereGeo(1, 5, 3), stem, { pos: [0.03, 0.012, 0], scale: [0.035, 0.012, 0.018], rot: [0, 0, 0.4] }],
    [petalDisc(), petal, { pos: [0, 0.082, 0], scale: 0.055, rot: [0.35, 0, 0], grad: [0.85, 1.08] }],
    [sphereGeo(1, 6, 4), centre, { pos: [0, 0.09, 0.008], scale: [0.022, 0.015, 0.022] }],
  ]);
}

/** 튤립 도형(동그란 컵 꽃). */
export function tulipGeo(petal = '#ff5a6e') {
  const cup = latheGeo([[0.0, 0.0], [0.03, 0.005], [0.042, 0.03], [0.04, 0.055], [0.03, 0.07], [0.034, 0.075]], 8, 'tulipcup');
  return partsGeo(`tulip${petal}`, [
    [cylGeo(0.008, 0.011, 0.07, 4), '#3f8f3a', { pos: [0, 0.035, 0] }],
    [sphereGeo(1, 6, 4), '#4f9e3e', { pos: [0.02, 0.025, 0], scale: [0.012, 0.03, 0.008], rot: [0, 0, -0.5] }],
    [cup, petal, { pos: [0, 0.062, 0], grad: [0.75, 1.15] }],
  ]);
}

/** 조약돌 도형(각진 작은 돌, 위가 밝다). */
export function pebbleGeo() {
  return partsGeo('pebble', [[new THREE.IcosahedronGeometry(1, 0), '#ffffff', { pos: [0, 0.25, 0], scale: [1, 0.55, 0.85], grad: [0.6, 1.15] }]]);
}

/** 땅에 붙은 낮은 잎 덤불(높이 ≈ 0.13). */
export function cloverGeo() {
  const sg = sphereGeo(1, 8, 5);
  return partsGeo('clover', [
    [sg, '#ffffff', { pos: [0, 0.05, 0], scale: [0.12, 0.08, 0.1], grad: [0.55, 1.2] }],
    [sg, '#ffffff', { pos: [0.1, 0.035, 0.04], scale: [0.085, 0.06, 0.075], grad: [0.55, 1.2] }],
    [sg, '#ffffff', { pos: [-0.09, 0.03, 0.03], scale: [0.075, 0.055, 0.07], grad: [0.55, 1.2] }],
  ]);
}

/**
 * 통로 둘레를 풀·꽃·조약돌로 채운다(인스턴스 몇 개). 통로(|z| ≤ 0.9)에는 0.1 이하, 그 앞은 0.15 이하만 둔다.
 * o = { w, seed, grass:[색...], flowers:[[도형, [tint...]], ...], pebble:[색...], clover:[색...],
 *       back:[zFar, zNear] 뒤쪽 띠, avoid(x,z)→true 면 건너뜀, H(x,z), density }
 */
export function lanePlants(parent, o) {
  const r = rng(o.seed || 7);
  const w = o.w || 390;
  const H = o.H || (() => 0);
  const dens = o.density ?? 1;
  const avoid = o.avoid || (() => false);
  const tufts = [[], [], []];
  const fl = (o.flowers || []).map(() => []);
  const peb = [];
  const clo = [];
  const pick = (a) => a[(r() * a.length) | 0];
  const maxH = (z) => (z > 0.9 ? 0.145 : z >= -0.9 ? 0.095 : 0.3);
  const hOf = (geo) => {
    if (!geo.boundingBox) geo.computeBoundingBox();
    return geo.boundingBox.max.y;
  };
  const tG = [tuftGeo(0), tuftGeo(1), tuftGeo(2)];
  const tH = Math.max(...tG.map(hOf));
  const fH = (o.flowers || []).map(([g]) => hOf(g));
  const cH = hOf(cloverGeo());
  // 위치 고르기: 화면 가장자리·앞쪽 구석일수록 빽빽하게
  const place = (n, z0, z1, edgeBias, fn) => {
    for (let i = 0; i < n * dens; i++) {
      const z = z0 + r() * (z1 - z0);
      const hw = halfW(w, z) + 0.4;
      let u = r() * 2 - 1;
      if (edgeBias > 0 && r() < edgeBias) u = Math.sign(u || 1) * (0.55 + 0.45 * Math.sqrt(r()));
      const x = u * hw;
      if (avoid(x, z)) continue;
      fn(x, H(x, z), z);
    }
  };
  const grass = o.grass || ['#5aa83f', '#6fbf4a', '#4b9a3a'];
  // 1) 앞 띠(조작부 아래까지): 풀 포기·꽃·잎 방석, 구석에 몰리게
  place(110, 0.95, 4.2, 0.6, (x, y, z) => {
    const k = r();
    const hm = maxH(z);
    if (k < 0.55) tufts[(r() * 3) | 0].push([x, y, z, Math.min(hm / tH, 0.6 + r() * 0.4), r() * TAU, pick(grass)]);
    else if (k < 0.8 && fl.length) {
      const t = (r() * fl.length) | 0;
      fl[t].push([x, y, z, Math.min(hm / fH[t], 0.95 + r() * 0.45), r() * TAU, pick(o.flowers[t][1])]);
    } else if (o.clover) clo.push([x, y, z, Math.min(hm / cH, 0.8 + r() * 0.5), r() * TAU, pick(o.clover)]);
  });
  // 2) 통로 가장자리(낮게): 통로 한가운데는 비운다
  place(60, -0.9, 0.9, 0.75, (x, y, z) => {
    if (Math.abs(z) < 0.45 && r() < 0.8) return;
    const k = r();
    const hm = maxH(z);
    if (k < 0.5) tufts[(r() * 3) | 0].push([x, y, z, Math.min(hm / tH, 0.4 + r() * 0.15), r() * TAU, pick(grass)]);
    else if (k < 0.75 && fl.length) {
      const t = (r() * fl.length) | 0;
      fl[t].push([x, y, z, Math.min(hm / fH[t], 0.85), r() * TAU, pick(o.flowers[t][1])]);
    } else if (o.pebble) peb.push([x, y, z, [0.035 + r() * 0.03, 0.04 + r() * 0.03, 0.035 + r() * 0.03], r() * TAU, pick(o.pebble)]);
  });
  // 3) 뒤 띠(통로 뒤 ~ 소품 앞)
  const [bz0, bz1] = o.back || [-5.5, -0.95];
  place(130, bz0, bz1, 0.35, (x, y, z) => {
    const k = r();
    if (k < 0.55) tufts[(r() * 3) | 0].push([x, y, z, 0.8 + r() * 0.6, r() * TAU, pick(grass)]);
    else if (k < 0.82 && fl.length) {
      const t = (r() * fl.length) | 0;
      fl[t].push([x, y, z, 1.1 + r() * 0.6, r() * TAU, pick(o.flowers[t][1])]);
    } else if (o.pebble) peb.push([x, y, z, [0.05 + r() * 0.05, 0.05 + r() * 0.05, 0.05 + r() * 0.04], r() * TAU, pick(o.pebble)]);
  });
  for (let v = 0; v < 3; v++) scatter(parent, tG[v], tufts[v]);
  (o.flowers || []).forEach(([geo], t) => scatter(parent, geo, fl[t]));
  if (o.pebble) scatter(parent, pebbleGeo(), peb, { fin: 'flat' });
  if (o.clover) scatter(parent, cloverGeo(), clo);
}

// ───────── 농장 소품 ─────────

/** 굵은 나무 울타리(점 목록을 따라). 기둥 사이 간격 gap. */
export function fence(parent, pts, { gap = 0.66, h = 0.46, col = '#c08550', dark = '#8a5a34', y = () => 0 } = {}) {
  const g = G(parent);
  const post = roundBoxGeo(0.13, h, 0.13, 0.04, 1);
  const cap = sphereGeo(1, 8, 4);
  const ttPost = [mix(dark, '#2a1a30', 0.3), mix(dark, '#ffe0b0', 0.25)];
  const ttRail = [mix(col, '#4a2a30', 0.35), mix(col, '#fff0c8', 0.3)];
  for (let k = 0; k < pts.length - 1; k++) {
    const [ax, az] = pts[k];
    const [bx, bz] = pts[k + 1];
    const len = Math.hypot(bx - ax, bz - az);
    const n = Math.max(1, Math.round(len / gap));
    const ang = Math.atan2(bz - az, bx - ax);
    for (let i = 0; i <= n; i++) {
      if (k > 0 && i === 0) continue;
      const t = i / n;
      const x = ax + (bx - ax) * t;
      const z = az + (bz - az) * t;
      const yy = y(x, z);
      g.add(P(post, '', { pos: [x, yy + h / 2 - 0.02, z], rot: [0, -ang, 0], tt: ttPost }));
      g.add(P(cap, '', { pos: [x, yy + h - 0.02, z], scale: [0.075, 0.04, 0.075], tt: ttPost }));
    }
    const rail = roundBoxGeo(len + 0.08, 0.095, 0.07, 0.035, 1);
    const mx = (ax + bx) / 2;
    const mz = (az + bz) / 2;
    const my = y(mx, mz);
    for (const ry of [h * 0.4, h * 0.78]) g.add(P(rail, '', { pos: [mx, my + ry, mz + 0.02], rot: [0, -ang, 0], tt: ttRail }));
  }
  return g;
}

/** 하얀 말뚝 울타리(두툼하게, 끝이 둥근 말뚝). */
export function picketFence(parent, x0, x1, z, { h = 0.36, col = '#fbf6ec', y = 0, gap = 0.17 } = {}) {
  const g = G(parent);
  const pk = roundBoxGeo(0.085, h, 0.05, 0.022, 1);
  const tip = sphereGeo(1, 8, 4);
  const tt = [mix(col, '#7a86c8', 0.35), col];
  for (let x = x0; x <= x1 + 1e-6; x += gap) {
    g.add(P(pk, '', { pos: [x, y + h / 2, z], fin: 'soft', tt }));
    g.add(P(tip, '', { pos: [x, y + h, z], scale: [0.043, 0.05, 0.026], fin: 'soft', tt }));
  }
  const rail = roundBoxGeo(x1 - x0 + 0.12, 0.06, 0.04, 0.02, 1);
  for (const ry of [h * 0.3, h * 0.72]) g.add(P(rail, '', { pos: [(x0 + x1) / 2, y + ry, z - 0.04], fin: 'soft', tt }));
  return g;
}

/** 둥근 건초 더미(옆으로 누운 원기둥, 끈 두 줄). */
export function hayBale(parent, x, y, z, s = 1, ry = 0) {
  const g = G(parent, x, y, z, ry, s);
  const body = latheGeo([[0, -0.25], [0.27, -0.25], [0.32, -0.21], [0.34, -0.1], [0.34, 0.1], [0.32, 0.21], [0.27, 0.25], [0, 0.25]], 22, 'haybale2');
  g.add(P(body, '', { pos: [0, 0.33, 0], rot: [0, 0, Math.PI / 2], tt: ['#c98f34', '#ffe08a'] }));
  const face = cylGeo(0.21, 0.21, 0.02, 16);
  g.add(P(face, '#e8b04a', { pos: [0.255, 0.33, 0], rot: [0, 0, Math.PI / 2], cast: false }));
  g.add(P(face, '#e8b04a', { pos: [-0.255, 0.33, 0], rot: [0, 0, Math.PI / 2], cast: false }));
  g.add(P(torusGeo(0.11, 0.012, 4, 16), '#c8923c', { pos: [0.27, 0.33, 0], rot: [0, Math.PI / 2, 0], cast: false }));
  g.add(P(torusGeo(0.343, 0.016, 4, 22), '#a8742c', { pos: [0.09, 0.33, 0], rot: [0, Math.PI / 2, 0], cast: false }));
  g.add(P(torusGeo(0.343, 0.016, 4, 22), '#a8742c', { pos: [-0.09, 0.33, 0], rot: [0, Math.PI / 2, 0], cast: false }));
  return g;
}

// ───────── 집 ─────────

const prismCache = new Map();
/** 박공 벽(삼각기둥): 밑변 w, 높이 h, 두께 d. */
export function gableGeo(w, h, d) {
  const key = `${w}|${h}|${d}`;
  let g = prismCache.get(key);
  if (!g) {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0);
    s.lineTo(w / 2, 0);
    s.lineTo(0, h);
    s.closePath();
    g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false });
    g.translate(0, 0, -d / 2);
    prismCache.set(key, g);
  }
  return g;
}

/** 모양 하나를 앞뒤로 뽑은 도형(캐시 키 필수). pts = [[x,y],...] */
export function extrudeGeo(key, pts, d, bevel = 0) {
  let g = prismCache.get(key);
  if (!g) {
    const s = new THREE.Shape();
    s.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
    s.closePath();
    g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2 });
    g.translate(0, 0, -d / 2);
    prismCache.set(key, g);
  }
  return g;
}

/**
 * 동화풍 집. 정면은 +z. side = true 면 처마 쪽(긴 지붕 비탈)이 정면을 본다.
 * o = { w, d, h, wall, roof, trim, door, chimney, win, floors, detail(0..2), lit, side, shutters }
 */
export function house(parent, x, y, z, ry = 0, s = 1, o = {}) {
  const g = G(parent, x, y, z, ry, s);
  const side = !!o.side;
  const inner = G(g, 0, 0, 0, side ? -Math.PI / 2 : 0);
  const w = o.w ?? 1.2; // 박공 쪽 폭(x)
  const d = o.d ?? 1.0; // 깊이(z)
  const h = o.h ?? 0.8;
  const wall = o.wall || '#fbeed2';
  const roof = o.roof || '#e0773b';
  const trim = o.trim || '#ffffff';
  const detail = o.detail ?? 2;
  const pitch = o.pitch ?? 0.7;
  const rs = detail > 1 ? 2 : 1; // 둥근 상자 분할(먼 집은 거칠게)
  inner.add(P(detail > 0 ? roundBoxGeo(w, h, d, 0.04, rs) : boxGeo(w, h, d), wall, { pos: [0, h / 2, 0], fin: 'soft' }));
  // 돌 기단(아래를 묵직하게)
  if (detail > 0) inner.add(P(roundBoxGeo(w + 0.08, 0.14, d + 0.08, 0.04, 1), o.base || '#a9a2bc', { pos: [0, 0.07, 0], fin: 'soft' }));
  const roofTT = [mix(roof, '#2a1a40', 0.32), mix(roof, '#fff0d0', 0.18), 0.1];
  const rh = (w / 2) * pitch;
  inner.add(P(gableGeo(w, rh, d * 0.98), wall, { pos: [0, h, 0], fin: 'soft' }));
  // 지붕판 두 장 + 용마루(두툼하게)
  const over = o.over ?? 0.15;
  const ang = Math.atan2(rh, w / 2);
  const th = detail > 0 ? 0.13 : 0.11;
  const len = (w / 2 + over) / Math.cos(ang) + 0.05;
  const rd = d + 2 * over * 0.9;
  const rg = detail > 0 ? roundBoxGeo(len, th, rd, 0.05, rs) : boxGeo(len, th, rd);
  for (const sgn of [-1, 1]) {
    const cx = sgn * ((len / 2 - 0.05) * Math.cos(ang) + (th / 2) * Math.sin(ang));
    const cy = h + rh - (len / 2 - 0.05) * Math.sin(ang) + (th / 2) * Math.cos(ang);
    inner.add(P(rg, roof, { pos: [cx, cy, 0], rot: [0, 0, -sgn * ang], fin: 'soft', tt: detail > 0 ? roofTT : null }));
  }
  inner.add(P(detail > 0 ? cylGeo(0.08, 0.08, rd + 0.04, 8) : boxGeo(0.12, 0.12, rd), o.ridge || mix(roof, '#3a2030', 0.25), { pos: [0, h + rh + th * 0.8, 0], rot: [Math.PI / 2, 0, 0], fin: 'soft' }));
  if (o.chimney !== false && detail > 0) {
    const cx = (o.chimneyX ?? 0.25) * w;
    const cy = h + rh * (1 - Math.abs(cx) / (w / 2)) + 0.12;
    inner.add(P(boxGeo(0.18, 0.46, 0.18), o.chimneyCol || '#c7745a', { pos: [cx, cy, -d * 0.18], fin: 'soft' }));
    inner.add(P(boxGeo(0.23, 0.07, 0.23), '#8a4f3e', { pos: [cx, cy + 0.25, -d * 0.18], fin: 'soft' }));
  }
  const winCol = o.lit ? '#ffd98a' : o.win || (detail > 0 ? '#9fd3ff' : '#86aede');
  const fin = o.lit ? 'glow' : detail > 0 ? 'gloss' : 'soft';
  // 정면(바깥 +z 쪽에서 본 면): side 면 inner 의 +x 면
  const faceW = side ? d : w;
  const put = (geo, col, fx, fy, out, f, rot = 0) => {
    // fx: 정면 가로 위치, out: 벽에서 나온 거리
    if (side) inner.add(P(geo, col, { pos: [w / 2 + out, fy, -fx], rot: [0, Math.PI / 2 + rot, 0], fin: f, cast: false }));
    else inner.add(P(geo, col, { pos: [fx, fy, d / 2 + out], rot: [0, rot, 0], fin: f, cast: false }));
  };
  const floors = o.floors ?? 1;
  const fh = h / floors;
  if (detail > 0) {
    const wg = boxGeo(0.2, 0.23, 0.04);
    const fr = boxGeo(0.28, 0.31, 0.03);
    const sill = boxGeo(0.32, 0.04, 0.08);
    const mull = boxGeo(0.02, 0.23, 0.045);
    const shut = boxGeo(0.09, 0.27, 0.03);
    const cols = Math.max(1, Math.round(faceW / 0.5));
    const doorX = o.doorX ?? (side ? -faceW * 0.18 : 0);
    for (let f = 0; f < floors; f++) {
      const wy = fh * f + fh * 0.56;
      for (let c = 0; c < cols; c++) {
        const wx = cols === 1 ? 0.25 * faceW : -faceW / 2 + (faceW / cols) * (c + 0.5);
        if (f === 0 && Math.abs(wx - doorX) < 0.24 && o.door !== false) continue;
        put(fr, trim, wx, wy, 0.012, 'soft');
        put(wg, winCol, wx, wy, 0.022, fin);
        put(mull, trim, wx, wy, 0.03, 'soft');
        put(sill, trim, wx, wy - 0.16, 0.03, 'soft');
        if (o.shutters) {
          put(shut, o.shutters, wx - 0.19, wy, 0.02, 'soft');
          put(shut, o.shutters, wx + 0.19, wy, 0.02, 'soft');
        }
      }
    }
    // 박공 둥근 창(박공이 정면일 때)
    if (!side && detail > 1 && rh > 0.3) {
      put(cylGeo(0.1, 0.1, 0.03, 14), trim, 0, h + rh * 0.38, 0.0, 'soft');
      inner.add(P(cylGeo(0.072, 0.072, 0.03, 14), winCol, { pos: [0, h + rh * 0.38, d / 2 + 0.015], rot: [Math.PI / 2, 0, 0], fin, cast: false }));
    }
    // 처마 쪽 지붕창(side)
    if (side && detail > 1) {
      const dm = G(inner, w * 0.22, h + rh * 0.5, -faceW * 0.15, Math.PI / 2, 1);
      dm.add(P(boxGeo(0.36, 0.34, 0.4), wall, { pos: [0, 0.12, 0], fin: 'soft' }));
      dm.add(P(gableGeo(0.36, 0.18, 0.42), wall, { pos: [0, 0.29, 0], fin: 'soft' }));
      dm.add(P(boxGeo(0.3, 0.05, 0.5), roof, { pos: [-0.1, 0.38, 0], rot: [0, 0, 0.5], fin: 'soft' }));
      dm.add(P(boxGeo(0.3, 0.05, 0.5), roof, { pos: [0.1, 0.38, 0], rot: [0, 0, -0.5], fin: 'soft' }));
      dm.add(P(boxGeo(0.18, 0.2, 0.04), winCol, { pos: [0, 0.14, 0.2], fin, cast: false }));
    }
    if (o.door !== false) {
      put(boxGeo(0.3, 0.46, 0.04), trim, doorX, 0.23, 0.008, 'soft');
      put(boxGeo(0.24, 0.42, 0.05), o.door || '#8f5a3a', doorX, 0.21, 0.015, 'soft');
      put(boxGeo(0.4, 0.05, 0.16), trim, doorX, 0.5, 0.07, 'soft');
      put(boxGeo(0.4, 0.05, 0.2), '#d9cfc2', doorX, 0.025, 0.1, 'soft');
    }
  } else {
    // 먼 집: 창 몇 개만
    const wg = boxGeo(0.17, 0.2, 0.04);
    const cols = Math.max(1, Math.round(faceW / 0.55));
    for (let f = 0; f < floors; f++) for (let c = 0; c < cols; c++) put(wg, winCol, -faceW / 2 + (faceW / cols) * (c + 0.5), fh * f + fh * 0.55, 0.01, fin);
  }
  return g;
}

/** 가로등(굵은 기둥 + 등롱). lit 이면 등이 빛난다(블룸). */
export function streetLamp(parent, x, y, z, s = 1, { lit = false, pole = '#3c4569', glass = '#fff3c4' } = {}) {
  const g = G(parent, x, y, z, 0, s);
  const tt = [mix(pole, '#0a0f30', 0.4), mix(pole, '#c8d4ff', 0.3)];
  g.add(P(cylGeo(0.13, 0.17, 0.16, 12), '', { pos: [0, 0.08, 0], fin: 'soft', tt }));
  g.add(P(cylGeo(0.055, 0.075, 1.62, 10), '', { pos: [0, 0.9, 0], fin: 'soft', tt }));
  g.add(P(torusGeo(0.075, 0.03, 6, 14), '', { pos: [0, 0.4, 0], rot: [Math.PI / 2, 0, 0], fin: 'soft', tt }));
  g.add(P(cylGeo(0.12, 0.07, 0.08, 10), '', { pos: [0, 1.72, 0], fin: 'soft', tt }));
  g.add(P(roundBoxGeo(0.2, 0.24, 0.2, 0.05, 2), lit ? '#ffe39a' : glass, { pos: [0, 1.88, 0], fin: lit ? 'glow' : 'gloss' }));
  g.add(P(coneGeo(0.19, 0.13, 4), '', { pos: [0, 2.06, 0], rot: [0, Math.PI / 4, 0], fin: 'soft', tt }));
  g.add(P(sphereGeo(1, 8, 6), '', { pos: [0, 2.15, 0], scale: 0.035, fin: 'soft', tt }));
  return g;
}

/** 바닥에 까는 부드러운 그림자(그림자 지도 밖의 먼 소품용). 진하기 단계별 재질 하나씩이라 구우면 합쳐진다. */
const blobMats = new Map();
let blobGeo = null;
export function groundBlob(parent, x, y, z, rx, rz = rx, opacity = 0.25) {
  const k = Math.round(opacity * 10) / 10;
  let m = blobMats.get(k);
  if (!m) {
    const tex = cachedTex('blob', 64, 64, (ctx, w) => {
      const gr = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(0.45, 'rgba(255,255,255,0.6)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, w, w);
    });
    m = new THREE.MeshBasicMaterial({ color: '#1e2a50', alphaMap: tex, transparent: true, opacity: k, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    blobMats.set(k, m);
  }
  if (!blobGeo) {
    blobGeo = new THREE.PlaneGeometry(1, 1);
    blobGeo.rotateX(-Math.PI / 2);
    blobGeo.userData.shared = true;
  }
  const b = new THREE.Mesh(blobGeo, m);
  b.position.set(x, y + 0.015, z);
  b.scale.set(rx * 2, 1, rz * 2);
  b.renderOrder = 1;
  b.userData.noCast = true;
  parent.add(b);
  return b;
}

export { THREE, mat, sphereGeo, boxGeo, roundBoxGeo, capsuleGeo, cylGeo, coneGeo, torusGeo, latheGeo, rng, mergeGeometries };
