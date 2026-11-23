// 표본 10종(3D). 피포와 같은 '말랑한 비닐 장난감' 문법으로 그린다.
//   · 재질: 윤기 나는 비닐(거칠기 0.2~0.45) + 칠한 듯한 위아래 그라데이션(위는 진하게, 아래는 밝게, toy()).
//     그늘이 회색으로 죽지 않게 몸 색과 같은 계열의 옅은 자체 발광을 섞는다.
//   · 눈: 피포처럼 진짜 3D 눈알(빛을 받지 않는 흰자 + 그라데이션 눈동자 + 큰 동공)을 머리에 박고, 반짝임 두 점은
//     눈동자가 굴러가도 제자리에 둔다. 속눈썹 테·눈썹·입·볼·땀은 머리와 꼭짓점을 나눠 쓰는 얼굴 껍데기에 그린다.
//   · 표정: EXPR 표(평소·깜빡·^^·와!·걱정·질겁·꾹·졸림·씨익·녹화)를 종류마다 한 장씩 그려 캐시한다(처음 쓸 때 그린다).
//   · 굵은 남보라 외곽선(피포와 같은 색), 통통한 2~3등신 비율, 화면 40~60px 에서도 읽히는 굵은 실루엣.
//
// 약속
//   · 원점 = 표본의 눈에 보이는 중심. 반지름 ≈ 0.34 구 안에 든다(장면은 1.12 배로 그린다).
//   · 닭·젖소는 발끝이 y = −0.24 / −0.25 (장면이 원점을 땅 위 그만큼에 둔다). 하늘 무대에서는 같은 모습으로 떠 있다.
//   · 연은 아래 꼭짓점이 (0, −0.22, 0) 에 있다(장면이 거기서 연줄을 그린다).
//   · update(t, dir, sp) 는 매 프레임 불린다. sp = 살아 있는 표본 기록(held·hold·flee·rec·cut·state), 아이콘·미리보기에서는 없다.
//     도형·재질·그림은 만들 때 한 번만 만들고(캐시), update 에서는 움직이고 바꿔 끼우기만 한다(새 객체를 만들지 않는다).
//   · 개체는 종류별로 재사용되므로 update 는 매번 모든 상태를 다시 정한다.
import { THREE, mat, mesh, sphereGeo, cylGeo, coneGeo, torusGeo, roundBoxGeo, latheGeo, addOutline, outlineMaterial, glowSprite, canvasTexture, faceTexture, rng } from './kit.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

/** 표본 종류(SPECIMENS 순서와 같다). */
export const SPECIMEN_KINDS = ['dandelion', 'firefly', 'balloon', 'kite', 'chicken', 'cow', 'drone', 'weather', 'satellite', 'meteor'];

const TAU = Math.PI * 2;
const LINE = '#2b1a5e'; // 외곽선(피포와 같은 남보라)
const INK = '#2a1660'; // 눈썹·입·속눈썹
const OL = 0.0142; // 몸통 외곽선(모델 단위)
const OL_S = 0.0098; // 작은 부품
const OL_XS = 0.006; // 실·끈

// ───────── 캐시와 도형 도구 ─────────

const store = new Map();
/** 모듈 전체에서 한 번만 만든다(도형·텍스처·재질). */
function once(key, make) {
  let v = store.get(key);
  if (v === undefined) {
    v = make();
    store.set(key, v);
  }
  return v;
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _v = new THREE.Vector3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _d = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);

const lerp = (a, b, k) => a + (b - a) * k;
const clamp = (x, a = -1, b = 1) => Math.min(b, Math.max(a, x));
const smooth01 = (x) => {
  const k = Math.min(1, Math.max(0, x));
  return k * k * (3 - 2 * k);
};

/** 공용 도형을 복제해 옮긴 사본(합치기용). */
function place(geo, pos = [0, 0, 0], rot = [0, 0, 0], scale = 1) {
  const g = geo.clone();
  const s = Array.isArray(scale) ? scale : [scale, scale, scale];
  _m.compose(_p.set(pos[0], pos[1], pos[2]), _q.setFromEuler(_e.set(rot[0], rot[1], rot[2])), _s.set(s[0], s[1], s[2]));
  g.applyMatrix4(_m);
  return g;
}

/** 두 점을 잇는 막대(capsule 이면 끝이 둥글다). */
function rod(a, b, r, { capsule = false, seg = 8 } = {}) {
  const A = new THREE.Vector3(a[0], a[1], a[2]);
  const B = new THREE.Vector3(b[0], b[1], b[2]);
  const d = B.clone().sub(A);
  const len = d.length();
  const g = capsule ? new THREE.CapsuleGeometry(r, Math.max(0.0001, len), 3, seg) : new THREE.CylinderGeometry(r, r, len, seg, 1);
  _q.setFromUnitVectors(UP, d.normalize());
  _m.compose(A.add(B).multiplyScalar(0.5), _q, _s.set(1, 1, 1));
  g.applyMatrix4(_m);
  return g;
}

/** 점들을 잇는 매끈한 관(줄기·더듬이·끈). */
function tube(points, r, seg = 14, radial = 6) {
  const c = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
  return new THREE.TubeGeometry(c, seg, r, radial, false);
}

/** 여러 조각을 한 도형으로 합친다(캐시). groups = true 면 조각마다 재질 묶음이 생긴다. */
function merged(key, make, groups = false) {
  return once(`g:${key}`, () => {
    let parts = make();
    if (parts.some((p) => !p.index) && parts.some((p) => p.index)) {
      parts = parts.map((p) => {
        if (!p.index) return p;
        const n = p.toNonIndexed();
        p.dispose();
        return n;
      });
    }
    // 합치려면 속성이 같아야 한다(관·원뿔·구는 모두 position·normal·uv)
    for (const p of parts) for (const name of Object.keys(p.attributes)) if (!['position', 'normal', 'uv'].includes(name)) p.deleteAttribute(name);
    const g = mergeGeometries(parts, groups);
    for (const p of parts) p.dispose();
    return g;
  });
}

/** 합친 도형의 재질 묶음을 다시 나눈다. plan = 조각마다 재질 번호. */
function regroup(geo, plan) {
  if (geo.userData.regrouped) return geo;
  const old = geo.groups.slice();
  geo.clearGroups();
  let cur = null;
  old.forEach((g, i) => {
    const mi = plan[i] ?? 0;
    if (cur && cur.mi === mi && cur.start + cur.count === g.start) cur.count += g.count;
    else {
      if (cur) geo.addGroup(cur.start, cur.count, cur.mi);
      cur = { start: g.start, count: g.count, mi };
    }
  });
  if (cur) geo.addGroup(cur.start, cur.count, cur.mi);
  geo.userData.regrouped = true;
  return geo;
}

/** 외곽선 전용 도형: 꼭짓점을 합쳐 법선을 매끈하게(각진 도형용). */
function smoothCopy(key, geo) {
  return once(`o:${key}`, () => {
    const g = geo.clone();
    for (const name of Object.keys(g.attributes)) if (name !== 'position') g.deleteAttribute(name);
    const m = mergeVertices(g, 1e-4);
    m.computeVertexNormals();
    g.dispose();
    return m;
  });
}

/** 따로 만든 도형으로 외곽선을 두른다. */
function outlineWith(target, geo, t = OL, color = LINE) {
  const o = new THREE.Mesh(geo, outlineMaterial(color, t));
  o.name = 'outline';
  o.castShadow = false;
  o.raycast = () => {};
  target.add(o);
  return o;
}

const line = (m, t = OL, color = LINE) => addOutline(m, t, color);

/** 빛을 받는 투명 재질(날개 등). 캐시. */
function glassy(color, opacity, { rough = 0.25, side = THREE.FrontSide, emissive = null, ei = 0.3 } = {}) {
  return once(`glassy${color}|${opacity}|${rough}|${side}|${emissive}|${ei}`, () => {
    const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: rough, metalness: 0, transparent: true, opacity, depthWrite: false, side, envMapIntensity: 1 });
    if (emissive) {
      m.emissive = new THREE.Color(emissive);
      m.emissiveIntensity = ei;
    }
    return m;
  });
}

/** 공용 텍스처(한 번만 그린다). */
const tex = (key, w, h, draw, opts) => once(`t:${key}`, () => canvasTexture(w, h, draw, opts));

/** 방향 전환을 부드럽게 따라가는 각도(처음과 시간이 튀면 바로 맞춘다). */
function follower(rate = 9) {
  let v = null;
  let last = 0;
  return (t, target) => {
    const dt = t - last;
    last = t;
    if (v === null || !(dt > 0 && dt < 0.25)) v = target;
    else v += (target - v) * (1 - Math.exp(-dt * rate));
    return v;
  };
}

function show(o, on) {
  if (o.visible !== on) o.visible = on;
}

/** 개체마다 하나씩 생기는 재질(빛무리·맥박 치는 빛)을 표시한다(dispose 대상). */
function own(o) {
  o.userData.ownMaterial = true;
  return o;
}

/** 덧그리기 빛무리(개체 소유). */
const glow = (color, size, opacity) => own(glowSprite(color, size, opacity));

/** 깜빡임 리듬(몇 초마다 0.12초). t 에 표본마다 다른 위상이 이미 섞여 있다. */
const blinkAt = (t) => t % 3.9 > 3.77 || (t + 1.7) % 6.1 > 5.98;

// ───────── 장난감 재질(칠한 그라데이션) ─────────

/**
 * 윤기 나는 비닐 장난감 재질. 면이 위를 볼수록 top, 아래를 볼수록 low 색을 곱한다(세계 기준이라 돌아도 위가 진하다).
 * o: rough, metal, env, map, emissive, ei, emissiveMap, own(개체 전용 사본), transparent, opacity
 */
function toy(top, mid, low, o = {}) {
  const make = () => {
    const m = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: o.rough ?? 0.38,
      metalness: o.metal ?? 0,
      map: o.map || null,
      envMapIntensity: o.env ?? 0.8,
      transparent: !!o.transparent,
      opacity: o.opacity ?? 1,
    });
    if (o.emissive) {
      m.emissive = new THREE.Color(o.emissive);
      m.emissiveIntensity = o.ei ?? 0.2;
      if (o.emissiveMap) m.emissiveMap = o.emissiveMap;
    }
    const U = { toyTop: { value: new THREE.Color(top) }, toyMid: { value: new THREE.Color(mid) }, toyLow: { value: new THREE.Color(low) } };
    m.userData.toy = U;
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying float vToyY;')
        .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n\tvToyY = normalize( mat3( modelMatrix ) * objectNormal ).y;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform vec3 toyTop;\nuniform vec3 toyMid;\nuniform vec3 toyLow;\nvarying float vToyY;')
        .replace(
          '#include <color_fragment>',
          '#include <color_fragment>\n\tdiffuseColor.rgb *= vToyY > 0.0 ? mix( toyMid, toyTop, smoothstep( 0.05, 0.9, vToyY ) ) : mix( toyMid, toyLow, smoothstep( 0.0, 0.85, -vToyY ) );',
        );
    };
    m.customProgramCacheKey = () => 'spToy1';
    return m;
  };
  if (o.own) return make();
  return once(`toy:${top}|${mid}|${low}|${JSON.stringify(o, (k, v) => (v && v.isTexture ? v.uuid : v))}`, make);
}

// ───────── 눈(피포 방식) ─────────

/** 눈동자 색(위 → 아래). 작게 보여도 검은 구멍이 되지 않게 아래쪽을 밝게. */
const IRIS = {
  blue: ['#231a78', '#3d4fe0', '#3cc4ff', '#9ff8ff'],
  navy: ['#1c1458', '#3042c4', '#4fb0ff', '#c4f6ff'],
  brown: ['#2a120c', '#6e3618', '#c47a30', '#ffd890'],
  amber: ['#3a1606', '#a04c0c', '#f2a22a', '#ffeaa0'],
  green: ['#0b3420', '#138a48', '#4ade6a', '#e2ff90'],
  honey: ['#3a2008', '#8f5812', '#e6aa3a', '#fff2ac'],
  ember: ['#3a0a10', '#8c1c1c', '#ff6030', '#ffd478'],
  violet: ['#2a0f5a', '#6a2fd0', '#b47cff', '#f0d8ff'],
};
const CAP = 0.95; // 반짝임 껍데기 크기(라디안)

/** 렌즈 눈(드론): 짙은 유리 + 조리개 무늬. kind 'n' 청록, 'r' 녹화 중(빨강, 동공을 조인다), 't' 깜짝. */
function paintLens(ctx, s, kind) {
  const c = s / 2;
  ctx.fillStyle = '#161a40';
  ctx.fillRect(0, 0, s, s);
  const R = 0.43 * s;
  const ring = ctx.createRadialGradient(c, c - R * 0.2, R * 0.2, c, c, R);
  ring.addColorStop(0, '#3a4486');
  ring.addColorStop(1, '#141838');
  ctx.fillStyle = ring;
  ctx.beginPath();
  ctx.arc(c, c, R, 0, TAU);
  ctx.fill();
  const col = kind === 'r' ? ['#ffe0e6', '#ff5470', '#a8102e'] : ['#e6ffff', '#46d8ff', '#1c5cb8'];
  const IR = R * 0.82;
  const g = ctx.createRadialGradient(c, c + IR * 0.35, IR * 0.1, c, c, IR);
  g.addColorStop(0, col[0]);
  g.addColorStop(0.45, col[1]);
  g.addColorStop(1, col[2]);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(c, c, IR, 0, TAU);
  ctx.fill();
  const P = (kind === 'r' ? 0.32 : kind === 't' ? 0.18 : 0.44) * IR;
  // 조리개 날(여섯 갈래)
  ctx.strokeStyle = 'rgba(12,16,50,0.45)';
  ctx.lineWidth = s * 0.018;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + 0.3;
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(a) * P, c + Math.sin(a) * P);
    ctx.lineTo(c + Math.cos(a + 0.9) * IR * 0.92, c + Math.sin(a + 0.9) * IR * 0.92);
    ctx.stroke();
  }
  ctx.fillStyle = '#080a22';
  ctx.beginPath();
  ctx.arc(c, c, P, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#0c0f2c';
  ctx.lineWidth = s * 0.03;
  ctx.beginPath();
  ctx.arc(c, c, IR, 0, TAU);
  ctx.stroke();
}

/** 눈알 그림(앞에서 비춘 평면 좌표: 지름 = 그림 전체). kind 'n' 보통, 't' 콩알(깜짝). */
function irisTex(pal, kind) {
  return faceTexture(
    `spIris:${pal}:${kind}`,
    (ctx, s) => {
      if (pal === 'lens') {
        paintLens(ctx, s, kind);
        return;
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, s, s);
      const c = s / 2;
      const C = IRIS[pal] || IRIS.blue;
      const R = (kind === 't' ? 0.2 : 0.41) * s;
      const P = (kind === 't' ? 0.1 : 0.19) * s;
      const g = ctx.createLinearGradient(0, c - R, 0, c + R);
      g.addColorStop(0, C[0]);
      g.addColorStop(0.45, C[1]);
      g.addColorStop(0.85, C[2]);
      g.addColorStop(1, C[3]);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(c, c, R, 0, TAU);
      ctx.fill();
      const lt = new THREE.Color(C[3]);
      const rgb = `${Math.round(lt.r * 255)},${Math.round(lt.g * 255)},${Math.round(lt.b * 255)}`;
      const gl = ctx.createRadialGradient(c, c + R * 0.55, 0, c, c + R * 0.55, R * 0.62);
      gl.addColorStop(0, `rgba(${rgb},0.8)`);
      gl.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = gl;
      ctx.beginPath();
      ctx.arc(c, c, R, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#120b30';
      ctx.beginPath();
      ctx.arc(c, c - R * 0.05, P, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#110a30';
      ctx.lineWidth = s * 0.024;
      ctx.beginPath();
      ctx.arc(c, c, R - s * 0.01, 0, TAU);
      ctx.stroke();
    },
    128,
  );
}

/** 반짝임: 'n' 두 점(큰 것 왼쪽 위, 작은 것 오른쪽 아래), 's' 별 반짝(와!). */
function glintTex(kind) {
  return faceTexture(
    `spGlint:${kind}`,
    (ctx, s) => {
      const k = s / (2 * Math.sin(CAP));
      const at = (x, y) => [s / 2 + x * k, s / 2 - y * k];
      ctx.fillStyle = '#ffffff';
      if (kind === 's') {
        const [x, y] = at(-0.26, 0.28);
        const r = 0.36 * k;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * TAU - Math.PI / 2;
          const rr = i % 2 ? r * 0.26 : r;
          ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        }
        ctx.closePath();
        ctx.fill();
      } else {
        const [x1, y1] = at(-0.28, 0.3);
        ctx.beginPath();
        ctx.ellipse(x1, y1, 0.18 * k, 0.21 * k, -0.5, 0, TAU);
        ctx.fill();
      }
      const [x2, y2] = at(0.3, -0.28);
      ctx.beginPath();
      ctx.arc(x2, y2, 0.09 * k, 0, TAU);
      ctx.fill();
    },
    128,
  );
}

/** 눈알: 단위 구. 앞쪽은 평면으로 비춘 좌표, 뒤쪽은 그림 밖(흰색)으로 밀어낸다. 위쪽에 눈꺼풀 그늘(꼭짓점 색). */
function eyeBallGeo() {
  return once('g:eyeBall', () => {
    const g = new THREE.SphereGeometry(1, 28, 20);
    const pos = g.attributes.position;
    const uv = g.attributes.uv;
    const col = new Float32Array(pos.count * 3);
    const lid = new THREE.Color('#c9bdf0');
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const rho = Math.hypot(x, y);
      const a = Math.atan2(y, x);
      const r = z >= 0 ? rho / 2 : (2 - rho) / 2;
      uv.setXY(i, 0.5 + Math.cos(a) * r, 0.5 + Math.sin(a) * r);
      const k = smooth01((y - 0.52) / 0.42);
      col[i * 3] = lerp(1, lid.r, k);
      col[i * 3 + 1] = lerp(1, lid.g, k);
      col[i * 3 + 2] = lerp(1, lid.b, k);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  });
}

/** 반짝임 껍데기: +z 를 감싸는 구 조각(평면 좌표). */
function glintGeo() {
  return once('g:glintCap', () => {
    const geo = new THREE.SphereGeometry(1.035, 24, 8, 0, TAU, 0, CAP);
    geo.rotateX(Math.PI / 2);
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    const k = 1 / (2 * 1.035 * Math.sin(CAP));
    for (let i = 0; i < pos.count; i++) uv.setXY(i, 0.5 + pos.getX(i) * k, 0.5 + pos.getY(i) * k);
    return geo;
  });
}

/** 흰자 재질: 빛을 받지 않는 흰색(빛 번짐 문턱 1.25 아래). 종류·크기마다 하나, 모든 개체가 나눠 쓴다. */
const eyeMats = new Map();
function eyeMat(pal, kind) {
  const key = pal + kind;
  let m = eyeMats.get(key);
  if (!m) {
    const k = pal === 'lens' ? 1 : 1.15;
    m = new THREE.MeshBasicMaterial({ map: irisTex(pal, kind), vertexColors: true, color: new THREE.Color(k, k, k) });
    eyeMats.set(key, m);
  }
  return m;
}

let glintN = null;
let glintS = null;
function glintMat(star) {
  const make = (kind) =>
    new THREE.MeshBasicMaterial({ map: glintTex(kind), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, color: new THREE.Color(1.22, 1.22, 1.22) });
  if (star) return glintS || (glintS = make('s'));
  return glintN || (glintN = make('n'));
}

/** 머리 공간의 방향 d 를 보도록 눈알을 굴린다(inv = 눈 자리의 역회전). */
function aimAt(obj, d, inv) {
  _v.copy(d).applyQuaternion(inv);
  obj.rotation.set(Math.atan2(-_v.y, _v.z), Math.asin(clamp(_v.x)), 0);
}

/** 눈 하나: 자리(holder) → 굴러가는 눈알(ball) + 고정된 반짝임(glint). */
function makeEye(pal) {
  const holder = new THREE.Group();
  const ball = mesh(eyeBallGeo(), eyeMat(pal, 'n'), { cast: false });
  const glint = mesh(glintGeo(), glintMat(false), { cast: false });
  glint.renderOrder = 3;
  glint.raycast = () => {};
  holder.add(ball, glint);
  return { holder, ball, glint, pal, iris: 'n', fr: null, side: 1, frames: new Map(), mats: { n: ball.material } };
}

function frameOf(pos, quat, scale) {
  return { pos, quat, scale, inv: quat.clone().invert() };
}

function placeEye(e, fr) {
  e.fr = fr;
  e.holder.position.copy(fr.pos);
  e.holder.quaternion.copy(fr.quat);
  e.holder.scale.copy(fr.scale);
  aimAt(e.glint, Z, fr.inv);
}

function setIris(e, kind, star) {
  if (e.iris !== kind) {
    e.iris = kind;
    e.ball.material = e.mats[kind] || (e.mats[kind] = eyeMat(e.pal, kind));
  }
  e.glint.material = glintMat(star);
}

// ───────── 얼굴 ─────────

/**
 * 표정 표. eye: 눈 크기, sq: 세로 배율, iris: 'n' | 't', star: 별 반짝, closed: 그림으로 그린 감은 눈('blink' | 'happy' | 'squeeze'),
 * brow: [높이, 기울기(+ = 안쪽이 올라감 = 걱정), 아치, 두께, 길이], browR: 오른 눈썹만 [높이, 기울기, 아치](씨익),
 * mouth: 입 그림, blush: 볼 진하기, sweat: 땀방울.
 */
const EXPR = {
  idle: { eye: 1, sq: 1, iris: 'n', brow: [0.05, 0.12, 0.035, 0.11, 0.24], mouth: 'smile', blush: 0.9 },
  blink: { closed: 'blink', brow: [0.04, 0.12, 0.035, 0.11, 0.24], mouth: 'smile', blush: 0.9 },
  happy: { closed: 'happy', brow: [0.1, -0.1, 0.05, 0.11, 0.24], mouth: 'grin', blush: 1.05 },
  wow: { eye: 1.1, sq: 1.05, iris: 'n', star: true, brow: [0.14, -0.06, 0.06, 0.1, 0.23], mouth: 'yay', blush: 1.05 },
  worry: { eye: 1.03, sq: 1.02, iris: 'n', brow: [0.07, 0.46, 0, 0.11, 0.24], mouth: 'wobble', blush: 0.7, sweat: true },
  panic: { eye: 1.12, sq: 1.08, iris: 't', brow: [0.15, 0.34, 0.05, 0.1, 0.23], mouth: 'scream', blush: 0.5, sweat: true },
  squeeze: { closed: 'squeeze', brow: [0.05, 0.42, 0, 0.11, 0.24], mouth: 'wobble', blush: 1.15, sweat: true },
  sleepy: { eye: 1, sq: 1, iris: 'n', brow: [-0.01, -0.12, 0.02, 0.1, 0.24], mouth: 'snore', blush: 0.95 },
  smirk: { eye: 1, sq: 0.96, iris: 'n', brow: [0.02, -0.3, 0.0, 0.12, 0.24], browR: [0.09, 0.05, 0.06], mouth: 'smirk', blush: 0.65 },
  rec: { eye: 1, sq: 1, iris: 'n', brow: [-0.02, -0.42, 0, 0.13, 0.24], mouth: 'flat', blush: 0.4 },
};

const MOUTH_IN = '#5a1f4e';
const TONGUE = '#ff6f9a';

/** 입(머리 반지름 1 단위, y 아래가 +). */
function paintMouth(ctx, style, ink) {
  if (!style || style === 'none') return;
  ctx.strokeStyle = ink;
  ctx.fillStyle = MOUTH_IN;
  ctx.lineWidth = 0.042;
  if (style === 'smile' || style === 'grin' || style === 'yay') {
    const w = style === 'smile' ? 0.15 : style === 'grin' ? 0.2 : 0.19;
    const d = style === 'smile' ? 0.14 : style === 'grin' ? 0.3 : 0.36;
    const c = style === 'smile' ? -0.03 : style === 'grin' ? -0.02 : -0.06;
    ctx.beginPath();
    ctx.moveTo(-w, c);
    ctx.quadraticCurveTo(0, style === 'yay' ? -0.02 : 0.02, w, c);
    ctx.bezierCurveTo(w * 0.9, d * 0.8, -w * 0.9, d * 0.8, -w, c);
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = TONGUE;
    ctx.beginPath();
    ctx.ellipse(0, d * 0.64, w * 0.64, d * 0.36, 0, 0, TAU);
    ctx.fill();
    if (style === 'grin') {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(-0.09, -0.035, 0.075, 0.075, 0.02);
      ctx.fill();
    }
    ctx.restore();
    ctx.stroke();
  } else if (style === 'o' || style === 'snore' || style === 'scream') {
    const rx = style === 'scream' ? 0.11 : style === 'snore' ? 0.055 : 0.08;
    const ry = style === 'scream' ? 0.16 : style === 'snore' ? 0.065 : 0.1;
    ctx.beginPath();
    ctx.ellipse(0, 0.03, rx, ry, 0, 0, TAU);
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = TONGUE;
    ctx.beginPath();
    ctx.ellipse(0, 0.03 + ry * 0.85, rx * 0.8, ry * 0.45, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.stroke();
  } else if (style === 'wobble') {
    ctx.lineWidth = 0.045;
    ctx.beginPath();
    ctx.moveTo(-0.16, 0.03);
    ctx.quadraticCurveTo(-0.11, -0.03, -0.055, 0.02);
    ctx.quadraticCurveTo(0, 0.07, 0.055, 0.02);
    ctx.quadraticCurveTo(0.11, -0.03, 0.16, 0.03);
    ctx.stroke();
  } else if (style === 'flat') {
    ctx.lineWidth = 0.045;
    ctx.beginPath();
    ctx.moveTo(-0.1, 0.01);
    ctx.quadraticCurveTo(0, -0.015, 0.1, 0.01);
    ctx.stroke();
  } else if (style === 'smirk') {
    // 한쪽 입꼬리만 올라간 씨익 + 메롱
    ctx.beginPath();
    ctx.moveTo(-0.15, 0.0);
    ctx.quadraticCurveTo(0.02, 0.2, 0.2, -0.08);
    ctx.quadraticCurveTo(0.03, 0.07, -0.15, 0.0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = TONGUE;
    ctx.beginPath();
    ctx.ellipse(0.06, 0.13, 0.065, 0.08, 0.3, 0, TAU);
    ctx.fill();
    ctx.lineWidth = 0.03;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(190,40,90,0.7)';
    ctx.lineWidth = 0.018;
    ctx.beginPath();
    ctx.moveTo(0.06, 0.08);
    ctx.lineTo(0.07, 0.16);
    ctx.stroke();
  }
}

/** 그림으로 그린 감은 눈. w = 눈 반폭. */
function paintClosed(ctx, kind, side, ink, w) {
  ctx.strokeStyle = ink;
  ctx.lineWidth = kind === 'happy' ? 0.075 : 0.065;
  ctx.beginPath();
  if (kind === 'happy') {
    ctx.moveTo(-w, 0.06);
    ctx.quadraticCurveTo(0, -w * 1.05, w, 0.06);
  } else if (kind === 'squeeze') {
    const s = -side; // 왼눈 '>', 오른눈 '<'
    ctx.moveTo(-s * w * 0.8, -w * 0.62);
    ctx.lineTo(s * w * 0.75, 0);
    ctx.lineTo(-s * w * 0.8, w * 0.62);
  } else {
    ctx.moveTo(-w, -0.01);
    ctx.quadraticCurveTo(0, w * 0.62, w, -0.01);
    ctx.moveTo(side * w, -0.01);
    ctx.lineTo(side * (w + 0.07), -0.065);
  }
  ctx.stroke();
}

function paintBlush(ctx, r, a) {
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, `rgba(255,92,158,${0.9 * a})`);
  g.addColorStop(0.6, `rgba(255,110,170,${0.55 * a})`);
  g.addColorStop(1, 'rgba(255,120,175,0)');
  ctx.fillStyle = g;
  ctx.save();
  ctx.scale(1, 0.64);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function paintSweat(ctx) {
  ctx.beginPath();
  ctx.moveTo(0, -0.14);
  ctx.bezierCurveTo(0.075, -0.03, 0.085, 0.065, 0, 0.075);
  ctx.bezierCurveTo(-0.085, 0.065, -0.075, -0.03, 0, -0.14);
  ctx.closePath();
  ctx.fillStyle = '#a6e6ff';
  ctx.fill();
  ctx.lineWidth = 0.024;
  ctx.strokeStyle = '#3b7fb0';
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(-0.022, 0.0, 0.016, 0.03, 0.2, 0, TAU);
  ctx.fill();
}

/** 콩 모양 눈썹(가운데 도톰, 끝이 둥글게 가늘어진다). */
function paintBrow(ctx, arch, thick, len, ink) {
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = thick * 0.55;
  ctx.beginPath();
  ctx.moveTo(-len / 2, 0);
  ctx.quadraticCurveTo(0, -arch * 2 - thick * 0.45, len / 2, 0);
  ctx.quadraticCurveTo(0, -arch * 2 + thick * 0.45, -len / 2, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

// ───────── 머리(구 + 얼굴 껍데기 + 3D 눈) ─────────

function dirOf(lon, lat, out = new THREE.Vector3()) {
  return out.set(Math.sin(lon) * Math.cos(lat), Math.sin(lat), Math.cos(lon) * Math.cos(lat));
}
function surfPoint(f, lon, lat, out) {
  return dirOf(lon, lat, out).multiplyScalar(f ? f(lat) : 1);
}
function surfNormal(f, lon, lat, out) {
  if (Math.abs(lat) > Math.PI / 2 - 1e-4) return out.set(0, Math.sign(lat), 0);
  const e = 1e-3;
  surfPoint(f, lon + e, lat, _a).sub(surfPoint(f, lon - e, lat, _b));
  surfPoint(f, lon, lat + e, _c).sub(surfPoint(f, lon, lat - e, _d));
  return out.crossVectors(_a, _c).normalize();
}

/** 구(위도마다 반지름 배율 f 로 빚은 모양). 머리와 얼굴 껍데기가 같은 꼭짓점을 쓰도록 같은 칸으로 나눈다. */
function shapedSphere(W, Hh, phiStart, phiLen, thStart, thLen, f) {
  const g = new THREE.SphereGeometry(1, W, Hh, phiStart, phiLen, thStart, thLen);
  if (!f) return g;
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    const lat = Math.asin(clamp(pos.getY(i)));
    const lon = Math.atan2(pos.getX(i), pos.getZ(i));
    surfPoint(f, lon, lat, p);
    surfNormal(f, lon, lat, n);
    pos.setXYZ(i, p.x, p.y, p.z);
    nor.setXYZ(i, n.x, n.y, n.z);
  }
  return g;
}

/**
 * 머리 한 종류의 공용 자료(도형·눈 자리·얼굴 그림·재질). 모든 개체가 나눠 쓴다.
 * H = { key, seg: [가로, 세로], face: [가로, 세로](얼굴 껍데기 칸 수, 짝수), HS: [x, y, z], shape?: (위도) => 반지름 배율,
 *       eye?: { lon, lat, rx, ry, rz, depth, fwd }, rim, lash, blush: [경도, 위도, 반지름], mouthLat, mouth(false = 안 그림),
 *       browLat/browLon(눈이 없을 때), sweat: [경도, 위도], ink, beak(부리 속 위도) }
 */
function headKit(H) {
  return once(`hk:${H.key}`, () => {
    const HS = new THREE.Vector3(...H.HS);
    const f = H.shape || null;
    const R = (lat) => (f ? f(lat) : 1);
    const [SW, SH] = H.seg;
    const [FWs, FHs] = H.face;
    const FW = (FWs * TAU) / SW;
    const FH = (FHs * Math.PI) / SH;
    const K = {
      H,
      HS,
      FW,
      FH,
      R,
      headGeo: shapedSphere(SW, SH, 0, TAU, 0, Math.PI, f),
      faceGeo: shapedSphere(FWs, FHs, ((SW / 4 - FWs / 2) * TAU) / SW, FW, ((SH / 2 - FHs / 2) * Math.PI) / SH, FH, f),
      frames: new Map(),
      foots: new Map(),
      mats: new Map(),
    };
    /** 머리(단위) 공간의 점이 머리 안에 있는지. */
    K.inside = (p) => {
      const x = p.x / HS.x;
      const y = p.y / HS.y;
      const z = p.z / HS.z;
      const r = Math.hypot(x, y, z);
      return r < R(Math.asin(clamp(y / Math.max(r, 1e-6))));
    };
    /** 눈 자리. side: −1 = 보는 사람의 왼쪽. */
    K.frame = (side, k = 1, sq = 1) => {
      const key = `${side}|${k}|${sq}`;
      let fr = K.frames.get(key);
      if (fr) return fr;
      const E = H.eye;
      const lon = side * E.lon;
      const pos = surfPoint(f, lon, E.lat, new THREE.Vector3()).multiply(HS).multiplyScalar(E.depth);
      const n = surfNormal(f, lon, E.lat, new THREE.Vector3());
      n.set(n.x / HS.x, n.y / HS.y, n.z / HS.z).normalize();
      const quat = new THREE.Quaternion().setFromUnitVectors(Z, n.lerp(Z, E.fwd).normalize());
      fr = frameOf(pos, quat, new THREE.Vector3(E.rx * k, E.ry * k * sq, E.rz * k));
      K.frames.set(key, fr);
      return fr;
    };
    /** 눈알이 머리 표면을 뚫고 나오는 경계(오른눈, [경도, 위도, 눈 둘레 각]). 그 바깥에 속눈썹 테를 칠한다. */
    K.foot = (k, sq) => {
      const key = `${k}|${sq}`;
      if (K.foots.has(key)) return K.foots.get(key);
      const fr = K.frame(1, k, sq);
      const m = new THREE.Matrix4().compose(fr.pos, fr.quat, fr.scale);
      const p = new THREE.Vector3();
      const outside = (a, psi) => {
        p.set(Math.sin(psi) * Math.cos(a), Math.sin(psi) * Math.sin(a), Math.cos(psi)).applyMatrix4(m);
        return !K.inside(p);
      };
      const pts = [];
      for (let i = 0; i < 48; i++) {
        const a = (i / 48) * TAU;
        let lo = 0;
        let hi = Math.PI / 2;
        for (let s = 0; s < 22; s++) {
          const mid = (lo + hi) / 2;
          if (outside(a, mid)) lo = mid;
          else hi = mid;
        }
        outside(a, lo);
        const u = new THREE.Vector3(p.x / HS.x, p.y / HS.y, p.z / HS.z).normalize();
        pts.push([Math.atan2(u.x, u.z), Math.asin(u.y), a]);
      }
      K.foots.set(key, pts);
      return pts;
    };
    K.faceMat = (expr) => {
      let m = K.mats.get(expr);
      if (!m) {
        m = new THREE.MeshStandardMaterial({ map: faceArt(K, expr), transparent: true, roughness: 0.4, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 });
        K.mats.set(expr, m);
      }
      return m;
    };
    return K;
  });
}

/** 표정 한 장(256px, 처음 쓸 때 그린다). 피포의 얼굴 그림과 같은 방식(경위도 위에 머리 표면 길이로 그린다). */
function faceArt(K, expr) {
  const H = K.H;
  const f = EXPR[expr] || EXPR.idle;
  return faceTexture(
    `spFace:${H.key}:${expr}`,
    (ctx, s) => {
      const { FW, FH, HS } = K;
      const TX = (lon) => s * (0.5 + lon / FW);
      const TY = (lat) => s * (0.5 - lat / FH);
      const PXX = s / FW;
      const PXY = s / FH;
      const local = (lon, lat) => {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.translate(TX(lon), TY(lat));
        const r = K.R(lat);
        ctx.scale(PXX / (HS.x * Math.cos(lat) * r), PXY / (HS.y * r));
      };
      const ink = H.ink || INK;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (H.blush) {
        for (const side of [-1, 1]) {
          local(side * H.blush[0], H.blush[1]);
          paintBlush(ctx, H.blush[2], f.blush ?? 0.9);
        }
      }
      let browBase = H.browLat ?? 0.4;
      const E = H.eye;
      if (E) {
        const foot = K.foot(f.eye ?? 1, f.sq ?? 1);
        let cy = 0;
        let top = -9;
        for (const [, lat] of foot) {
          cy += lat / foot.length;
          top = Math.max(top, lat);
        }
        browBase = top + 0.07;
        const rim = H.rim ?? 1.3;
        for (const side of [-1, 1]) {
          if (!f.closed) {
            // 속눈썹 테(위가 두툼, 바깥 끝이 살짝 삐침)
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.fillStyle = ink;
            ctx.beginPath();
            foot.forEach(([lon, lat, a], i) => {
              const up = Math.sin(a);
              const out = Math.cos(a);
              const t = (0.016 + 0.036 * Math.max(0, up) ** 1.3 + 0.012 * Math.max(0, out * up)) * rim;
              const x = TX(side * lon) + side * out * t * PXX;
              const y = TY(lat) - up * t * PXY;
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            });
            ctx.closePath();
            ctx.fill();
            if (H.lash) {
              const [lon0, lat0] = foot[Math.round(48 * 0.09)];
              local(side * lon0, lat0);
              ctx.scale(side, 1);
              ctx.beginPath();
              ctx.moveTo(-0.02, -0.04);
              ctx.quadraticCurveTo(0.055, -0.035, 0.095, -0.1);
              ctx.quadraticCurveTo(0.065, -0.01, 0.0, 0.025);
              ctx.closePath();
              ctx.fill();
            }
          } else {
            local(side * E.lon, cy);
            paintClosed(ctx, f.closed, side, ink, E.rx * 0.82);
          }
        }
      }
      if (H.brows !== false) {
        const [bh, tilt, arch, thick, len] = f.brow;
        const bLon = H.browLon ?? (E ? E.lon + 0.02 : 0.3);
        for (const side of [-1, 1]) {
          const r = side > 0 && f.browR;
          local(side * bLon, browBase + (r ? r[0] : bh));
          ctx.rotate(side * (r ? r[1] : tilt));
          paintBrow(ctx, r ? r[2] : arch, thick * (H.browK ?? 1), len * (H.browK ?? 1), ink);
        }
      }
      if (H.mouth !== false) {
        local(0, H.mouthLat ?? -0.45);
        ctx.scale(H.mouthK ?? 1, H.mouthK ?? 1);
        paintMouth(ctx, f.mouth, ink);
      } else if (H.beak !== undefined && (expr === 'wow' || expr === 'panic' || expr === 'happy')) {
        // 부리가 벌어지면 보이는 입속
        local(0, H.beak);
        ctx.fillStyle = MOUTH_IN;
        ctx.beginPath();
        ctx.ellipse(0, 0, 0.13, 0.13, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = TONGUE;
        ctx.beginPath();
        ctx.ellipse(0, 0.06, 0.08, 0.05, 0, 0, TAU);
        ctx.fill();
      }
      if (f.sweat && H.sweat) {
        local(H.sweat[0], H.sweat[1]);
        paintSweat(ctx);
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    },
    256,
  );
}

/**
 * 머리 한 벌(개체마다): 머리 구 + 외곽선 + 얼굴 껍데기 + 눈 둘. 머리 반지름 1 단위(바깥 묶음이 반지름 배로 키운다).
 * set(표정) 은 바뀔 때만 일한다. look(좌우, 위아래) 는 머리 공간의 방향(라디안, 위 = +).
 */
function headRig(K, headMat, olT, pal) {
  const HS = K.HS;
  const group = new THREE.Group();
  let head = null;
  if (K.headGeo) {
    head = mesh(K.headGeo, headMat, { scale: [HS.x, HS.y, HS.z] });
    if (olT) line(head, olT);
    group.add(head);
  }
  const face = mesh(K.faceGeo, K.faceMat('idle'), { cast: false, scale: [HS.x, HS.y, HS.z] });
  face.renderOrder = 2;
  face.raycast = () => {};
  group.add(face);
  const eyes = [];
  if (K.H.eye) {
    for (const side of [-1, 1]) {
      const e = makeEye(pal);
      e.side = side;
      group.add(e.holder);
      eyes.push(e);
    }
  }
  const aim = new THREE.Vector3();
  let cur = '';
  let open = true;
  const rig = {
    group,
    head,
    face,
    eyes,
    get expr() {
      return cur;
    },
    set(expr) {
      if (expr === cur) return;
      cur = expr;
      const f = EXPR[expr] || EXPR.idle;
      face.material = K.faceMat(expr);
      open = !f.closed;
      for (const e of eyes) {
        e.holder.visible = open;
        if (!open) continue;
        // 표정마다 눈 자리를 한 번만 찾아 둔다(깜빡일 때마다 새 문자열·객체를 만들지 않게)
        let fr = e.frames.get(expr);
        if (!fr) {
          fr = K.frame(e.side, f.eye ?? 1, f.sq ?? 1);
          e.frames.set(expr, fr);
        }
        placeEye(e, fr);
        setIris(e, f.iris || 'n', !!f.star);
      }
    },
    look(yaw, pitch) {
      if (!open) return;
      aim.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
      for (const e of eyes) aimAt(e.ball, aim, e.fr.inv);
    },
  };
  rig.set('idle');
  rig.look(0, 0);
  return rig;
}

/** 평소 눈길: 정면(보는 사람)을 보다가 가끔 두리번. 머리가 돌아간 만큼(netYaw) 되돌려 카메라를 본다. */
function idleLook(rig, t, netYaw, k = 1) {
  const sac = Math.sin(t * 0.73) * 0.22 + (Math.sin(t * 0.31) > 0.6 ? 0.18 : 0);
  rig.look(clamp(-netYaw * 0.85 + sac * k, -0.55, 0.55), Math.sin(t * 0.53) * 0.08 + 0.04);
}

// ───────── 1. 민들레 홀씨 ─────────
// 동그란 얼굴 둘레를 솜털 갈기가 감싼 홀씨 머리 + 사방으로 뻗은 홀씨 살과 반짝이는 씨앗 + 작은 줄기와 잎.

const DAND = {
  key: 'dand',
  seg: [32, 24],
  face: [16, 16],
  HS: [1, 1, 0.94],
  eye: { lon: 0.37, lat: 0.04, rx: 0.29, ry: 0.34, rz: 0.18, depth: 0.9, fwd: 0.35 },
  rim: 1.3,
  blush: [0.64, -0.26, 0.17],
  mouthLat: -0.46,
  mouthK: 0.9,
  sweat: [0.76, 0.5],
  ink: '#3a2466',
};

function sparkleTexture() {
  return tex('sparkle', 64, 64, (ctx, w, h) => {
    const img = ctx.createImageData(w, h);
    const d = img.data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = ((x + 0.5) / w) * 2 - 1;
        const dy = ((y + 0.5) / h) * 2 - 1;
        const ax = Math.abs(dx);
        const ay = Math.abs(dy);
        const ray = Math.max(Math.pow(Math.max(0, 1 - ax), 2.5) * Math.exp(-ay * ay * 90), Math.pow(Math.max(0, 1 - ay), 2.5) * Math.exp(-ax * ax * 90));
        const core = Math.exp(-(dx * dx + dy * dy) * 22);
        const a = Math.min(1, ray + core);
        const i = (y * w + x) * 4;
        d[i] = 255;
        d[i + 1] = 255;
        d[i + 2] = 255;
        d[i + 3] = Math.round(a * 255);
      }
    }
    ctx.putImageData(img, 0, 0);
  });
}

function sparkleSprite(color, size) {
  const m = new THREE.SpriteMaterial({ map: sparkleTexture(), color: new THREE.Color(color), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const s = own(new THREE.Sprite(m));
  s.scale.setScalar(size);
  s.renderOrder = 6;
  s.raycast = () => {};
  return s;
}

/** 피보나치 구 위의 방향들. */
function fibDirs(n, seed = 0) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const y = 1 - ((i + 0.5) / n) * 2;
    const r = Math.sqrt(1 - y * y);
    const a = i * 2.39996 + seed;
    out.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
  }
  return out;
}

function buildDandelion() {
  const root = new THREE.Group();
  const bob = new THREE.Group();
  root.add(bob);
  const sway = new THREE.Group(); // 줄기 아래를 축으로 흔들린다
  sway.position.y = -0.2;
  bob.add(sway);
  const R = 0.112;
  const hg = new THREE.Group();
  hg.position.y = 0.245;
  hg.scale.setScalar(R);
  sway.add(hg);
  const turn = new THREE.Group(); // 얼굴은 늘 앞을 보되 살짝 갸웃
  hg.add(turn);

  const cream = toy('#fffaf0', '#fff3dc', '#ffe6cc', { rough: 0.45, emissive: '#ffe8c8', ei: 0.18 });
  const K = headKit(DAND);
  const H = headRig(K, cream, OL / R, 'honey');
  turn.add(H.group);

  // 솜털 갈기: 얼굴(앞) 둘레와 뒤를 덮는 솜뭉치들
  const puffGeo = merged('dandPuffs', () => {
    const parts = [];
    const r = rng(21);
    for (const d of fibDirs(34, 0.4)) {
      if (d.z > 0.45) continue; // 얼굴 자리는 비운다
      const s = 0.36 + r() * 0.1;
      parts.push(place(sphereGeo(1, 14, 10), d.clone().multiplyScalar(1.1).toArray(), [0, 0, 0], s));
    }
    return parts;
  });
  const fluff = toy('#ffffff', '#fdfcff', '#ebe4ff', { rough: 0.75, emissive: '#fff8ee', ei: 0.16 });
  const puffs = mesh(puffGeo, fluff, { cast: false });
  line(puffs, (OL_S * 0.85) / R, '#5a4a9a');
  turn.add(puffs);

  // 홀씨 살 + 끝의 씨앗 솜(반짝이는 하얀 별)
  const rayGeo = merged(
    'dandRays',
    () => {
      const parts = [];
      const tips = [];
      for (const d of fibDirs(26, 1.1)) {
        if (d.z > 0.6) continue;
        const a = d.clone().multiplyScalar(1.2);
        const b = d.clone().multiplyScalar(1.95);
        parts.push(rod(a.toArray(), b.toArray(), 0.05, { seg: 5 }));
        tips.push(place(sphereGeo(1, 8, 6), b.toArray(), [0, 0, 0], 0.12));
      }
      return [...parts, ...tips];
    },
    true,
  );
  const nRays = rayGeo.groups.length / 2;
  regroup(
    rayGeo,
    rayGeo.groups.map((g, i) => (i < nRays ? 0 : 1)),
  );
  const rays = new THREE.Mesh(rayGeo, [mat('#fff7ea', { rough: 0.6, emissive: '#fff4e0', emissiveIntensity: 0.5 }), mat('#ffffff', { emissive: '#fff8d8', emissiveIntensity: 1.05, rough: 0.4 })]);
  rays.castShadow = false;
  turn.add(rays);

  // 줄기 + 잎
  const stemGeo = merged('dandStem', () => [
    tube([[0, 0.17, 0], [0.008, 0.11, 0.004], [-0.006, 0.05, 0], [0.006, 0.0, 0]], 0.0105, 14, 7),
    place(sphereGeo(1, 14, 10), [0.032, 0.075, 0.006], [0, 0, -0.9], [0.014, 0.036, 0.009]),
    place(sphereGeo(1, 10, 8), [0.006, 0.0, 0], [0, 0, 0], 0.013),
  ]);
  const stem = mesh(stemGeo, toy('#3f9a3a', '#5cc24a', '#9fe36a', { rough: 0.45, emissive: '#1f6a20', ei: 0.15 }), { cast: false });
  line(stem, OL_XS);
  sway.add(stem);

  const tw = [sparkleSprite('#fff6c8', 0.07), sparkleSprite('#ffffff', 0.06), sparkleSprite('#fff0b0', 0.055)];
  const TW = [
    [0.16, 0.13, 0.05],
    [-0.17, 0.02, 0.05],
    [0.05, 0.24, 0.03],
  ];
  for (const s of tw) bob.add(s);
  const halo = glow('#fff3cc', 0.7, 0.22);
  halo.position.set(0, 0.04, -0.06);
  bob.add(halo);

  return {
    root,
    update(t, dir = 1, sp) {
      const state = sp ? sp.state : 'live';
      const beam = state === 'beam';
      const wind = Math.sin(t * 1.6) + 0.4 * Math.sin(t * 2.9 + 1);
      sway.rotation.z = wind * 0.09 - dir * 0.04;
      sway.rotation.x = Math.sin(t * 1.2 + 1) * 0.05;
      bob.position.y = Math.sin(t * 2.1) * 0.012;
      turn.rotation.y = Math.sin(t * 0.8) * 0.18;
      turn.rotation.z = -wind * 0.06;
      puffs.rotation.z = Math.sin(t * 2.3) * 0.04;
      rays.rotation.z = Math.sin(t * 2.3 + 0.5) * 0.06;
      let expr = 'idle';
      if (beam) expr = 'wow';
      else if (state === 'caught') expr = 'panic';
      else if (t % 7.3 > 6.1) expr = 'happy';
      else if (blinkAt(t)) expr = 'blink';
      H.set(expr);
      if (beam) H.look(0, 0.45);
      else idleLook(H, t, turn.rotation.y);
      for (let i = 0; i < tw.length; i++) {
        const k = Math.max(0, Math.sin(t * 2.6 + i * 2.1));
        tw[i].position.set(TW[i][0], TW[i][1], TW[i][2]);
        tw[i].material.opacity = k * k;
        tw[i].material.rotation = t * 0.8 + i;
      }
    },
  };
}

// ───────── 2. 반딧불이 ─────────
// 큰 눈의 남보라 머리 + 주황 가슴 + 빛나는 연두 전구 엉덩이(빛 번짐) + 파닥이는 투명 날개 + 끝이 빛나는 더듬이.

const FLY = {
  key: 'fly',
  seg: [32, 24],
  face: [16, 16],
  HS: [1.05, 0.97, 1],
  eye: { lon: 0.4, lat: 0.06, rx: 0.29, ry: 0.35, rz: 0.18, depth: 0.9, fwd: 0.35 },
  rim: 1.3,
  blush: [0.68, -0.3, 0.16],
  mouthLat: -0.47,
  mouthK: 0.9,
  sweat: [0.8, 0.52],
};

function fireflyTailTextures() {
  const map = tex('ffTail3', 64, 128, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#8a7a2a');
    g.addColorStop(0.16, '#d8ec56');
    g.addColorStop(0.34, '#f4ff8a');
    g.addColorStop(1, '#fdffe0');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(130,150,30,0.55)';
    ctx.lineWidth = 4;
    for (const y of [0.2, 0.32]) {
      ctx.beginPath();
      ctx.moveTo(0, y * h);
      ctx.lineTo(w, y * h);
      ctx.stroke();
    }
  });
  const emap = tex('ffTailE3', 16, 128, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#000000');
    g.addColorStop(0.14, '#202a08');
    g.addColorStop(0.36, '#c8f040');
    g.addColorStop(1, '#ffffff');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
  return { map, emap };
}

function buildFirefly() {
  const root = new THREE.Group();
  const hover = new THREE.Group();
  root.add(hover);
  const turn = new THREE.Group();
  hover.add(turn);
  const body = new THREE.Group();
  turn.add(body);

  // 빛나는 배(개체마다 재질 하나: 밝기가 맥박친다)
  const { map, emap } = fireflyTailTextures();
  const bulbMat = own(new THREE.MeshStandardMaterial({ color: '#ffffff', map, roughness: 0.3, emissive: new THREE.Color('#d8ff4a'), emissiveMap: emap, emissiveIntensity: 2, envMapIntensity: 0.8 }));
  const bulbGeo = once('g:ffBulb', () => place(sphereGeo(1, 26, 18), [0, 0, 0], [Math.PI / 2, 0, 0]).scale(0.088, 0.082, 0.118));
  const bulb = mesh(bulbGeo, bulbMat, { cast: false, pos: [0, -0.04, -0.15], rot: [0.32, 0, 0] });
  bulb.userData.ownMaterial = true;
  line(bulb, OL, '#4a5a16');
  body.add(bulb);
  // 가슴(주황)
  const chest = mesh(sphereGeo(1, 20, 14), toy('#e8561e', '#ff8a3c', '#ffc07a', { rough: 0.35, emissive: '#b03a10', ei: 0.18 }), { cast: false, pos: [0, 0.0, -0.055], scale: 0.064 });
  line(chest, OL / 0.064);
  body.add(chest);
  // 다리(짧은 남색 막대)
  const legGeo = merged('ffLegs2', () => {
    const p = [];
    for (const sx of [-1, 1]) for (const z of [-0.02, -0.05, -0.08]) p.push(rod([sx * 0.025, -0.04, z], [sx * 0.05, -0.085, z + 0.012], 0.0075, { capsule: true, seg: 5 }));
    return p;
  });
  body.add(mesh(legGeo, mat('#2f2a6a', { rough: 0.5 }), { cast: false }));
  // 날개
  const wingMat = glassy('#eef6ff', 0.55, { rough: 0.15, emissive: '#cfe8ff', ei: 0.25 });
  const wingGeo = once('g:ffWing2', () => place(sphereGeo(1, 20, 12), [0, 0, 0], [0, 0, 0], [0.05, 0.011, 0.105]));
  const wings = [];
  for (const sx of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(sx * 0.03, 0.055, -0.06);
    const w = mesh(wingGeo, wingMat, { cast: false, pos: [sx * 0.04, 0.012, -0.065], rot: [-0.45, sx * 0.4, sx * 0.25] });
    line(w, 0.0045, '#6a74c4');
    pivot.add(w);
    body.add(pivot);
    wings.push({ pivot, sx });
  }
  // 머리
  const R = 0.105;
  const hg = new THREE.Group();
  hg.position.set(0, 0.05, 0.045);
  hg.scale.setScalar(R);
  body.add(hg);
  const indigo = toy('#3236a6', '#5660dc', '#8e9cff', { rough: 0.32, emissive: '#2a1f8a', ei: 0.24 });
  const K = headKit(FLY);
  const H = headRig(K, indigo, OL / R, 'green');
  hg.add(H.group);
  // 더듬이(머리 단위) + 빛나는 끝
  const antGeo = merged('ffAnt2', () => [-1, 1].map((sx) => tube([[sx * 0.26, 0.86, 0.05], [sx * 0.36, 1.25, 0.12], [sx * 0.58, 1.6, 0.28]], 0.06, 12, 6)));
  H.group.add(mesh(antGeo, mat('#2c2870', { rough: 0.45 }), { cast: false }));
  const tipGeo = merged('ffTips2', () => [-1, 1].map((sx) => place(sphereGeo(1, 14, 10), [sx * 0.6, 1.63, 0.3], [0, 0, 0], 0.17)));
  const tips = mesh(tipGeo, mat('#f2ffa0', { emissive: '#d8ff4a', emissiveIntensity: 1.6, rough: 0.3 }), { cast: false });
  line(tips, 0.07, '#4a5a16');
  H.group.add(tips);
  // 빛무리
  const glowBig = glow('#d6ff5a', 0.85, 0.55);
  const glowCore = glow('#f8ffc4', 0.34, 0.7);
  glowBig.position.set(0, -0.045, -0.18);
  glowCore.position.set(0, -0.045, -0.18);
  body.add(glowBig, glowCore);

  const yaw = follower();
  return {
    root,
    update(t, dir = 1, sp) {
      const state = sp ? sp.state : 'live';
      const beam = state === 'beam';
      const y = yaw(t, dir * 0.85);
      turn.rotation.y = y;
      hg.rotation.y = -y * 0.45;
      hg.rotation.z = Math.sin(t * 1.4) * 0.08;
      const pulse = 0.5 + 0.5 * Math.sin(t * 4.2);
      bulbMat.emissiveIntensity = 1.55 + 0.9 * pulse;
      glowBig.material.opacity = 0.32 + 0.38 * pulse;
      glowBig.scale.setScalar(0.72 + 0.2 * pulse);
      glowCore.material.opacity = 0.45 + 0.45 * pulse;
      hover.position.y = Math.sin(t * 3) * 0.018;
      body.rotation.x = Math.sin(t * 3 + 0.8) * 0.08;
      const flap = Math.abs(Math.sin(t * (beam ? 34 : 26)));
      for (const { pivot, sx } of wings) pivot.rotation.z = sx * (0.12 + 0.8 * flap);
      let expr = 'idle';
      if (beam) expr = 'wow';
      else if (state === 'caught') expr = 'panic';
      else if (t % 6.7 > 5.6) expr = 'happy';
      else if (blinkAt(t)) expr = 'blink';
      H.set(expr);
      if (beam) H.look(0, 0.45);
      else idleLook(H, t, y + hg.rotation.y);
    },
  };
}

// ───────── 3. 놓친 풍선 ─────────
// 반들반들한 빨강 풍선 얼굴(눈·볼·웃는 입) + 커다란 반사광 + 노랑 리본 매듭 + 꼬불꼬불 끈. 누르면 말랑하게 찌그러지며 >< 한다.

const BAL = {
  key: 'balloon',
  seg: [40, 30],
  face: [18, 18],
  HS: [1, 1.04, 1],
  shape: (lat) => 1 + 0.3 * Math.pow(Math.max(0, -Math.sin(lat)), 2.2),
  eye: { lon: 0.33, lat: 0.15, rx: 0.22, ry: 0.27, rz: 0.13, depth: 0.93, fwd: 0.4 },
  rim: 1.25,
  blush: [0.58, -0.12, 0.17],
  mouthLat: -0.29,
  sweat: [0.72, 0.52],
};

function shineTexture() {
  return tex('shine', 64, 64, (ctx, w) => {
    const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.75)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, w);
  });
}

function buildBalloon() {
  const root = new THREE.Group();
  const bob = new THREE.Group();
  root.add(bob);
  const sway = new THREE.Group(); // 매듭을 축으로 흔들린다
  sway.position.y = -0.18;
  bob.add(sway);
  const squash = new THREE.Group(); // 누르면 말랑
  squash.position.y = 0.252;
  sway.add(squash);
  const R = 0.186;
  const hg = new THREE.Group();
  hg.scale.setScalar(R);
  squash.add(hg);
  const red = toy('#c8172c', '#ff3346', '#ff9090', { rough: 0.34, env: 1.0, emissive: '#a0102a', ei: 0.16 });
  const K = headKit(BAL);
  const H = headRig(K, red, OL / R, 'navy');
  hg.add(H.group);
  // 반사광: 왼쪽 위의 길쭉한 빛 + 작은 점
  const shineGeo = merged('balShine', () => {
    const cap = (ang) => {
      const g = new THREE.SphereGeometry(1.015, 14, 6, 0, TAU, 0, ang);
      const pos = g.attributes.position;
      const k = 1 / (2 * 1.015 * Math.sin(ang));
      for (let i = 0; i < pos.count; i++) g.attributes.uv.setXY(i, 0.5 + pos.getX(i) * k, 0.5 + pos.getZ(i) * k);
      return g;
    };
    const a = cap(0.3);
    const b = cap(0.1);
    const put = (g, lon, lat, sx, sy) => {
      const d = dirOf(lon, lat);
      _q.setFromUnitVectors(UP, d);
      const m = new THREE.Matrix4().makeRotationFromQuaternion(_q);
      g.applyMatrix4(new THREE.Matrix4().makeScale(sx, 1, sy));
      g.applyMatrix4(m);
      g.applyMatrix4(new THREE.Matrix4().makeScale(BAL.HS[0], BAL.HS[1], BAL.HS[2]));
      return g;
    };
    return [put(a, -0.66, 0.6, 0.62, 1.0), put(b, -0.78, 0.3, 1, 1)];
  });
  const shine = mesh(shineGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(1.1, 1.1, 1.1), map: shineTexture(), transparent: true, opacity: 0.85, depthWrite: false }), { cast: false });
  shine.renderOrder = 2;
  hg.add(shine);
  // 매듭 + 리본(노랑)
  const knotGeo = merged(
    'balKnot2',
    () => [
      place(coneGeo(1, 1, 14), [0, -0.018, 0], [Math.PI, 0, 0], [0.026, 0.036, 0.026]),
      place(sphereGeo(1, 10, 8), [0, -0.04, 0], [0, 0, 0], [0.018, 0.012, 0.018]),
      place(torusGeo(1, 0.36, 8, 16), [-0.026, -0.04, 0.012], [0.2, 0.5, 0.35], [0.024, 0.016, 0.016]),
      place(torusGeo(1, 0.36, 8, 16), [0.026, -0.04, 0.012], [0.2, -0.5, -0.35], [0.024, 0.016, 0.016]),
      place(sphereGeo(1, 10, 8), [0, -0.04, 0.016], [0, 0, 0], 0.012),
    ],
    true,
  );
  regroup(knotGeo, [0, 0, 1, 1, 1]);
  const knot = new THREE.Mesh(knotGeo, [toy('#c8172c', '#e8283a', '#ff7070', { rough: 0.3 }), toy('#ffb020', '#ffd23f', '#fff09a', { rough: 0.35, emissive: '#c07a00', ei: 0.12 })]);
  outlineWith(knot, knotGeo, OL_S * 0.8);
  sway.add(knot);
  // 꼬불꼬불 끈(흔들린다)
  const string = new THREE.Group();
  string.position.y = -0.045;
  const strGeo = once('g:balStr2', () =>
    tube(
      [
        [0, 0, 0],
        [0.022, -0.03, 0],
        [-0.018, -0.06, 0.004],
        [0.018, -0.09, 0],
        [-0.012, -0.12, 0],
        [0.004, -0.15, 0],
      ],
      0.0055,
      24,
      5,
    ),
  );
  const str = mesh(strGeo, mat('#fff6e6', { rough: 0.6 }), { cast: false });
  line(str, OL_XS, '#5a4f86');
  string.add(str);
  sway.add(string);

  return {
    root,
    update(t, dir = 1, sp) {
      const state = sp ? sp.state : 'live';
      const held = !!(sp && sp.held && state === 'live');
      const h = held ? sp.hold : 0;
      sway.rotation.z = Math.sin(t * 1.7) * 0.07 - dir * 0.03;
      sway.rotation.y = Math.sin(t * 0.9) * 0.22;
      string.rotation.z = Math.sin(t * 3) * 0.2;
      string.rotation.x = Math.sin(t * 2.3) * 0.12;
      bob.position.y = Math.sin(t * 2) * 0.014;
      // 말랑: 평소엔 숨쉬듯, 누르면 납작 + 부르르
      const jig = held ? Math.sin(t * 40) * 0.025 * h : 0;
      const breath = Math.sin(t * 2.4) * 0.012;
      const sy = 1 - 0.16 * h + breath - jig;
      const sx = 1 + 0.12 * h - breath * 0.5 + jig;
      squash.scale.set(sx, sy, sx);
      squash.position.y = 0.252 * sy;
      let expr = 'idle';
      if (state === 'beam') expr = 'wow';
      else if (state === 'caught') expr = 'panic';
      else if (held) expr = h > 0.12 ? 'squeeze' : 'worry';
      else if (t % 8.1 > 7.0) expr = 'happy';
      else if (blinkAt(t)) expr = 'blink';
      H.set(expr);
      if (state === 'beam') H.look(0, 0.5);
      else idleLook(H, t, sway.rotation.y);
    },
  };
}

// ───────── 4. 연 ─────────
// 노랑 마름모 안에 큰 눈 두 개와 웃는 입(눈은 반들반들한 3D) + 빨강 테두리 + 나비 리본 꼬리 셋.
// 줄이 끊기면 ^^ 하고 신나게 빙글, 끊긴 줄 끝이 달랑거린다.

const KITE = { top: 0.275, side: 0.205, mid: 0.07, bot: -0.22 };
const KZ = 0.0175; // 앞면 높이
const KF = { w: 0.3, h: 0.26, y: 0.075, u: 0.105 }; // 얼굴 그림 판(가로·세로·가운데 높이), 머리 단위 1 = u
const KEYE = { x: 0.064, y: 0.104, rx: 0.043, ry: 0.05, rz: 0.03 };

function kiteGeo() {
  return once('g:kite2', () => {
    const k = 0.93;
    const P = [
      [0, KITE.top * k + 0.004],
      [KITE.side * k, KITE.mid],
      [0, KITE.bot * k + 0.004],
      [-KITE.side * k, KITE.mid],
    ];
    const shape = new THREE.Shape();
    const n = P.length;
    const near = (a, b, d) => [a[0] + (b[0] - a[0]) * d, a[1] + (b[1] - a[1]) * d];
    for (let i = 0; i < n; i++) {
      const prev = P[(i + n - 1) % n];
      const cur = P[i];
      const next = P[(i + 1) % n];
      const a = near(cur, prev, 0.1);
      const b = near(cur, next, 0.1);
      if (i === 0) shape.moveTo(a[0], a[1]);
      else shape.lineTo(a[0], a[1]);
      shape.quadraticCurveTo(cur[0], cur[1], b[0], b[1]);
    }
    shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.01, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 3, curveSegments: 6 });
    g.translate(0, 0, -0.005);
    const pos = g.attributes.position;
    const uv = g.attributes.uv;
    const W = KITE.side * 2;
    const Hh = KITE.top - KITE.bot;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + KITE.side) / W, (pos.getY(i) - KITE.bot) / Hh);
    return g;
  });
}

function kiteTexture() {
  return tex('kite2', 256, 256, (ctx, w, h) => {
    const W = KITE.side * 2;
    const Hh = KITE.top - KITE.bot;
    const X = (x) => ((x + KITE.side) / W) * w;
    const Y = (y) => (1 - (y - KITE.bot) / Hh) * h;
    const diamond = (k) => {
      const cy = KITE.mid;
      ctx.beginPath();
      ctx.moveTo(X(0), Y(cy + (KITE.top - cy) * k));
      ctx.lineTo(X(KITE.side * k), Y(cy));
      ctx.lineTo(X(0), Y(cy + (KITE.bot - cy) * k));
      ctx.lineTo(X(-KITE.side * k), Y(cy));
      ctx.closePath();
    };
    // 바깥 띠(빨강 → 분홍 그라데이션)
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#e8283a');
    g.addColorStop(1, '#ff6a6a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // 흰 바느질 테
    ctx.fillStyle = '#fff6e0';
    diamond(0.8);
    ctx.fill();
    // 노랑 안쪽(위는 진하게)
    const g2 = ctx.createLinearGradient(0, Y(KITE.top), 0, Y(KITE.bot));
    g2.addColorStop(0, '#ffc21a');
    g2.addColorStop(0.6, '#ffdc4a');
    g2.addColorStop(1, '#fff0a0');
    ctx.fillStyle = g2;
    diamond(0.74);
    ctx.fill();
    // 살대(옅게)
    ctx.strokeStyle = 'rgba(160,90,30,0.35)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(X(0), Y(KITE.top) + 10);
    ctx.lineTo(X(0), Y(KF.y + 0.11));
    ctx.moveTo(X(0), Y(KF.y - 0.12));
    ctx.lineTo(X(0), Y(KITE.bot) - 10);
    ctx.stroke();
    // 바깥 띠의 점박이 무늬
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (const [x, y] of [
      [0, KITE.top - 0.03],
      [KITE.side - 0.035, KITE.mid],
      [-(KITE.side - 0.035), KITE.mid],
      [0, KITE.bot + 0.035],
    ]) {
      ctx.beginPath();
      ctx.arc(X(x), Y(y), 5, 0, TAU);
      ctx.fill();
    }
  });
}

/** 연 얼굴(평면 그림 판). */
function kiteFaceArt(expr) {
  const f = EXPR[expr] || EXPR.idle;
  return faceTexture(
    `spFace:kite:${expr}`,
    (ctx, s) => {
      const P = s / KF.w;
      const at = (x, y) => {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.translate(s / 2 + x * P, s / 2 - (y - KF.y) * P);
        ctx.scale(P * KF.u, P * KF.u);
      };
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const u = KF.u;
      for (const side of [-1, 1]) {
        at(side * 0.112, 0.05);
        paintBlush(ctx, 0.3, (f.blush ?? 0.9) * 0.9);
      }
      const k = f.eye ?? 1;
      const rx = (KEYE.rx * k) / u;
      const ry = (KEYE.ry * k * (f.sq ?? 1)) / u;
      for (const side of [-1, 1]) {
        at(side * KEYE.x, KEYE.y);
        if (!f.closed) {
          // 둘레 테(위가 두툼)
          ctx.fillStyle = INK;
          ctx.beginPath();
          ctx.ellipse(0, -0.035, rx + 0.05, ry + 0.085, 0, 0, TAU);
          ctx.moveTo(rx, 0);
          ctx.ellipse(0, 0, rx, ry, 0, 0, TAU);
          ctx.fill('evenodd');
        } else paintClosed(ctx, f.closed, side, INK, rx * 0.85);
      }
      const [bh, tilt, arch, thick, len] = f.brow;
      for (const side of [-1, 1]) {
        at(side * KEYE.x, KEYE.y + KEYE.ry * k + 0.025 + bh * u);
        ctx.rotate(side * tilt);
        paintBrow(ctx, arch, thick * 1.3, len * 1.5, INK);
      }
      at(0, 0.025);
      ctx.scale(1.25, 1.25);
      paintMouth(ctx, f.mouth, INK);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    },
    256,
  );
}

const kiteFaceMats = new Map();
function kiteFaceMat(expr) {
  let m = kiteFaceMats.get(expr);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ map: kiteFaceArt(expr), transparent: true, roughness: 0.45, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 });
    kiteFaceMats.set(expr, m);
  }
  return m;
}

function buildKite() {
  const root = new THREE.Group();
  const pivot = new THREE.Group(); // 아래 꼭짓점(연줄 자리)을 축으로 흔들린다
  pivot.position.set(0, KITE.bot, 0);
  root.add(pivot);
  const kite = new THREE.Group();
  kite.position.y = -KITE.bot;
  pivot.add(kite);
  const geo = kiteGeo();
  const body = mesh(geo, toy('#f2f0ff', '#ffffff', '#fff6ec', { map: kiteTexture(), rough: 0.42, env: 0.9, emissive: '#ff6a3a', ei: 0.06 }), { cast: false });
  outlineWith(body, smoothCopy('kite2', geo), OL);
  kite.add(body);
  const faceGeo = once('g:kiteFace', () => new THREE.PlaneGeometry(KF.w, KF.h));
  const face = mesh(faceGeo, kiteFaceMat('idle'), { cast: false, pos: [0, KF.y, KZ + 0.0004] });
  face.renderOrder = 2;
  kite.add(face);
  const eyes = [-1, 1].map((side) => {
    const e = makeEye('navy');
    e.side = side;
    kite.add(e.holder);
    return e;
  });
  const frames = new Map();
  const kFrame = (side, k, sq) => {
    const key = side * 100 + k * 10 + sq;
    let fr = frames.get(key);
    if (!fr) {
      fr = frameOf(new THREE.Vector3(side * KEYE.x, KEYE.y, KZ - 0.004), new THREE.Quaternion(), new THREE.Vector3(KEYE.rx * k, KEYE.ry * k * sq, KEYE.rz * k));
      frames.set(key, fr);
    }
    return fr;
  };
  let cur = '';
  const aim = new THREE.Vector3();
  const setExpr = (expr) => {
    if (expr === cur) return;
    cur = expr;
    const f = EXPR[expr];
    face.material = kiteFaceMat(expr);
    for (const e of eyes) {
      e.holder.visible = !f.closed;
      if (f.closed) continue;
      placeEye(e, kFrame(e.side, f.eye ?? 1, f.sq ?? 1));
      setIris(e, f.iris || 'n', !!f.star);
    }
  };
  setExpr('idle');

  // 꼬리: 세 마디 끈 + 나비 리본 셋. 마디마다 위 끝을 축으로 돈다.
  const cordMat = mat('#fff4dc', { rough: 0.7 });
  const SEG = 0.085;
  const segGeo = once('g:kiteSeg2', () => place(cylGeo(0.0058, 0.0058, SEG, 5), [0, -SEG / 2, 0]));
  const lobe = once('g:kiteLobe2', () => {
    const pts = [];
    for (let i = 0; i <= 12; i++) {
      const a = (i / 12) * Math.PI;
      pts.push([Math.sin(a) * 0.03 * (0.35 + 0.65 * (i / 12)), 0.006 + 0.05 * (1 - Math.cos(a)) * 0.5 + (i / 12) * 0.006]);
    }
    return latheGeo(pts, 14);
  });
  const bowGeo = merged('kiteBow3', () => [
    place(lobe, [0.004, 0, 0], [0, 0, -Math.PI / 2 + 0.25], [1, 1, 0.42]),
    place(lobe, [-0.004, 0, 0], [0, 0, Math.PI / 2 - 0.25], [1, 1, 0.42]),
    place(sphereGeo(0.014, 10, 8), [0, 0, 0]),
  ]);
  const bowColors = [
    ['#2f6fe0', '#4f9bff', '#9fd0ff'],
    ['#14a890', '#2fd4b4', '#9ff0dc'],
    ['#d8308a', '#ff5ab0', '#ffb0d8'],
  ];
  const segs = [];
  let parent = root;
  let y0 = KITE.bot;
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Group();
    s.position.y = y0;
    parent.add(s);
    const cord = mesh(segGeo, cordMat, { cast: false });
    line(cord, OL_XS * 0.8, '#5a4f86');
    s.add(cord);
    const [a, b, c] = bowColors[i];
    const bow = mesh(bowGeo, toy(a, b, c, { rough: 0.4 }), { cast: false, pos: [0, -SEG * 0.85, 0.004] });
    line(bow, OL_S * 0.8);
    s.add(bow);
    segs.push(s);
    parent = s;
    y0 = -SEG * (i === 0 ? 1 : 0.95);
  }
  // 끊긴 연줄 끝(줄이 끊겼을 때만)
  const cutGeo = merged('kiteCut2', () => [
    tube(
      [
        [0, 0, 0.004],
        [0.035, -0.035, 0.004],
        [0.06, -0.08, 0.004],
        [0.1, -0.1, 0.004],
      ],
      0.0055,
      12,
      5,
    ),
    // 끊긴 끝의 보푸라기
    rod([0.1, -0.1, 0.004], [0.118, -0.094, 0.004], 0.004, { seg: 4 }),
    rod([0.1, -0.1, 0.004], [0.114, -0.115, 0.004], 0.004, { seg: 4 }),
  ]);
  const cutEnd = mesh(cutGeo, mat('#fff8ec', { rough: 0.6 }), { cast: false });
  line(cutEnd, OL_XS * 0.8, '#5a4f86');
  pivot.add(cutEnd);

  return {
    root,
    update(t, dir = 1, sp) {
      const state = sp ? sp.state : 'live';
      const cut = !!(sp && sp.cut);
      const beam = state === 'beam';
      const free = cut && !beam;
      pivot.rotation.z = free ? Math.sin(t * 2.1) * 0.28 + dir * 0.1 : Math.sin(t * 1.3) * 0.08;
      pivot.rotation.y = Math.sin(t * 0.9) * (free ? 0.35 : 0.2);
      kite.rotation.x = -0.1 + Math.sin(t * 1.7) * 0.05;
      const wag = free ? 1.5 : 1;
      segs[0].rotation.z = 0.2 * dir + Math.sin(t * 4 * wag) * 0.35;
      segs[1].rotation.z = Math.sin(t * 4 * wag - 1.2) * 0.55;
      segs[2].rotation.z = Math.sin(t * 4 * wag - 2.4) * 0.65;
      show(cutEnd, cut);
      if (cut) {
        cutEnd.scale.x = dir;
        cutEnd.rotation.z = Math.sin(t * 5) * 0.35;
      }
      let expr = 'idle';
      if (beam) expr = 'wow';
      else if (state === 'caught') expr = 'panic';
      else if (cut) expr = (t % 2.6) < 1.9 ? 'happy' : 'wow';
      else if (blinkAt(t)) expr = 'blink';
      setExpr(expr);
      if (!EXPR[expr].closed) {
        const yaw = beam ? 0 : clamp(-pivot.rotation.y * 0.8 + Math.sin(t * 0.7) * 0.25, -0.5, 0.5);
        const pitch = beam ? 0.5 : Math.sin(t * 0.5) * 0.1;
        aim.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
        for (const e of eyes) aimAt(e.ball, aim, e.fr.inv);
      }
    },
  };
}

// ───────── 5. 닭 ─────────
// 동글동글 한 덩이 몸(머리 겸 몸통)에 큰 눈 + 빨간 볏·턱살 + 주황 부리(벌어진다) + 퍼덕이는 날개 + 꽁지깃.

const CHICK = {
  key: 'chick',
  seg: [40, 30],
  face: [18, 18],
  HS: [1, 0.95, 0.97],
  eye: { lon: 0.36, lat: 0.22, rx: 0.25, ry: 0.3, rz: 0.17, depth: 0.9, fwd: 0.35 },
  rim: 1.35,
  lash: true,
  blush: [0.64, -0.06, 0.16],
  mouth: false,
  beak: -0.1,
  sweat: [0.8, 0.5],
};

function buildChicken() {
  const root = new THREE.Group();
  const turn = new THREE.Group();
  root.add(turn);
  const body = new THREE.Group(); // 통통 뛴다
  turn.add(body);
  const lean = new THREE.Group(); // 앞으로 숙이기(쪼기·달리기), 발 근처가 축
  lean.position.y = -0.17;
  body.add(lean);
  const R = 0.175;
  const hg = new THREE.Group();
  hg.position.y = 0.15; // 몸 가운데 y = −0.02
  hg.scale.setScalar(R);
  lean.add(hg);

  const white = toy('#ffffff', '#f6f3ff', '#ffe8c4', { rough: 0.42, emissive: '#8e7ad8', ei: 0.1 });
  const K = headKit(CHICK);
  const H = headRig(K, white, OL / R, 'amber');
  hg.add(H.group);
  // 볏 + 턱살
  const red = toy('#e0203a', '#ff4448', '#ff9078', { rough: 0.3, emissive: '#b01030', ei: 0.18 });
  const combGeo = merged('chickComb3', () => [
    place(sphereGeo(1, 16, 12), [0, 0.9, 0.42], [0.6, 0, 0], [0.14, 0.25, 0.21]),
    place(sphereGeo(1, 16, 12), [0, 1.13, 0.1], [0.2, 0, 0], [0.15, 0.31, 0.25]),
    place(sphereGeo(1, 16, 12), [0, 1.03, -0.25], [-0.35, 0, 0], [0.14, 0.25, 0.21]),
    place(sphereGeo(1, 14, 10), [-0.06, -0.33, 0.93], [0, 0, 0.15], [0.085, 0.13, 0.08]),
    place(sphereGeo(1, 14, 10), [0.06, -0.33, 0.93], [0, 0, -0.15], [0.085, 0.13, 0.08]),
  ]);
  const comb = mesh(combGeo, red);
  line(comb, OL_S / R);
  hg.add(comb);
  // 부리: 위(고정) + 아래(벌어진다)
  const beakMat = toy('#ff9414', '#ffb22e', '#ffd870', { rough: 0.3, emissive: '#c25a00', ei: 0.16 });
  const upper = mesh(coneGeo(0.19, 0.4, 16), beakMat, { pos: [0, -0.04, 1.1], rot: [Math.PI / 2 + 0.16, 0, 0], scale: [1.3, 1, 0.78] });
  line(upper, 0.05);
  hg.add(upper);
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.12, 0.92);
  const lower = mesh(coneGeo(0.14, 0.28, 14), beakMat, { pos: [0, -0.01, 0.13], rot: [Math.PI / 2 + 0.28, 0, 0], scale: [1.25, 1, 0.62] });
  line(lower, 0.05);
  jaw.add(lower);
  hg.add(jaw);
  // 날개
  const wingMat = toy('#ffffff', '#f1ecff', '#ffe2bc', { rough: 0.45, emissive: '#8e7ad8', ei: 0.1 });
  const wingGeo = once('g:chickWing3', () => place(sphereGeo(1, 18, 12), [0, -0.27, -0.06], [0.35, 0, 0], [0.15, 0.38, 0.3]));
  const wings = [];
  for (const sx of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(sx * 0.9, 0.02, -0.04);
    const w = mesh(wingGeo, wingMat, { pos: [sx * 0.07, 0, 0], rot: [0, 0, sx * 0.12] });
    line(w, OL / R);
    pivot.add(w);
    hg.add(pivot);
    wings.push({ pivot, sx });
  }
  // 꽁지깃
  const tailGeo = merged('chickTail3', () => [
    place(sphereGeo(1, 14, 10), [0, 0.5, -0.88], [-0.7, 0, 0], [0.13, 0.32, 0.13]),
    place(sphereGeo(1, 14, 10), [0.17, 0.38, -0.85], [-0.8, 0, -0.45], [0.11, 0.27, 0.11]),
    place(sphereGeo(1, 14, 10), [-0.17, 0.38, -0.85], [-0.8, 0, 0.45], [0.11, 0.27, 0.11]),
  ]);
  const tail = mesh(tailGeo, white);
  line(tail, OL / R);
  hg.add(tail);
  // 다리(주황, 발가락 셋 + 뒤 하나)
  const legGeo = merged('chickLeg3', () => [
    rod([0, 0, 0], [0, -0.07, 0.004], 0.0125, { capsule: true, seg: 8 }),
    rod([0, -0.075, 0.004], [0, -0.078, 0.046], 0.0095, { capsule: true, seg: 6 }),
    rod([0, -0.075, 0.004], [0.027, -0.078, 0.036], 0.0095, { capsule: true, seg: 6 }),
    rod([0, -0.075, 0.004], [-0.027, -0.078, 0.036], 0.0095, { capsule: true, seg: 6 }),
    rod([0, -0.075, 0.004], [0, -0.078, -0.022], 0.0085, { capsule: true, seg: 6 }),
  ]);
  const legMat = toy('#f07a10', '#ff9a2e', '#ffc070', { rough: 0.4 });
  const legs = [];
  for (const sx of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(sx * 0.055, -0.155, 0.01);
    const l = mesh(legGeo, legMat);
    line(l, OL_S * 0.8);
    hip.add(l);
    turn.add(hip);
    legs.push({ hip, sx });
  }

  const yaw = follower(8);
  return {
    root,
    update(t, dir = 1, sp) {
      const state = sp ? sp.state : 'live';
      const live = state === 'live';
      const flee = !!(sp && sp.flee > 0 && live);
      const beam = state === 'beam';
      const y = yaw(t, dir * (flee ? 0.95 : 0.5));
      turn.rotation.y = y;
      const ph = t * 7;
      const step = Math.sin(ph);
      body.position.y = Math.abs(step) * (flee ? 0.022 : 0.012);
      body.rotation.z = step * (flee ? 0.1 : 0.07);
      // 콕콕 쪼기(평소 가끔)
      let peck = 0;
      if (live && !flee) {
        const c = t % 4.6;
        if (c > 3.9) peck = Math.sin(((c - 3.9) / 0.7) * Math.PI * 2) ** 2;
      }
      lean.rotation.x = flee ? 0.3 : 0.03 + peck * 0.42;
      for (const { hip, sx } of legs) hip.rotation.x = beam ? sx * Math.sin(t * 20) * 0.5 : step * (flee ? 0.85 : 0.5) * sx;
      // 날개: 달아나거나 끌려갈 땐 마구 퍼덕, 평소엔 가끔 파닥
      let flap = 0.06 + Math.max(0, Math.sin(t * 1.7)) ** 10 * 0.6 * Math.abs(Math.sin(t * 16));
      if (flee) flap = 0.45 + 0.75 * Math.abs(Math.sin(t * 6));
      else if (beam || state === 'caught') flap = 0.5 + 0.7 * Math.abs(Math.sin(t * 18));
      for (const { pivot, sx } of wings) pivot.rotation.z = sx * flap;
      let expr = 'idle';
      if (beam) expr = 'wow';
      else if (state === 'caught' || flee) expr = 'panic';
      else if (peck > 0.05) expr = 'happy';
      else if (blinkAt(t)) expr = 'blink';
      H.set(expr);
      jaw.rotation.x = expr === 'panic' ? 0.5 + Math.sin(t * 22) * 0.12 : expr === 'wow' ? 0.5 : expr === 'happy' ? 0.3 : 0.02;
      if (beam) H.look(-y, 0.5);
      else if (flee) H.look(clamp(-dir * 1.2 - y, -0.6, 0.6), 0.05);
      else idleLook(H, t, y);
    },
  };
}

// ───────── 6. 젖소 ─────────
// 큰 머리의 2등신 아기 젖소: 눈가 얼룩, 분홍 주둥이(콧구멍·입), 작은 뿔, 늘어진 귀, 빨간 목줄에 금방울, 짧은 다리.
// 빔에 들리면 다리를 버둥거리며 걱정 → 질겁.

const COW_PATCH = '#2e2a52';
const COW = {
  key: 'cow',
  seg: [40, 30],
  face: [18, 18],
  HS: [1.14, 0.98, 1],
  eye: { lon: 0.38, lat: 0.12, rx: 0.26, ry: 0.31, rz: 0.17, depth: 0.9, fwd: 0.35 },
  rim: 1.35,
  lash: true,
  blush: [0.66, -0.2, 0.17],
  mouth: false,
  sweat: [0.84, 0.48],
};

function cowHeadTexture() {
  return tex('cowHead', 256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = COW_PATCH;
    const at = (lon, lat) => [((lon + Math.PI / 2) / TAU) * w, (0.5 - lat / Math.PI) * h];
    const blob = (lon, lat, r, seed) => {
      const q = rng(seed);
      const [x, y] = at(lon, lat);
      const sx = (r / TAU) * w / Math.cos(lat);
      const sy = (r / Math.PI) * h;
      for (const dx of [-w, 0, w]) {
        ctx.beginPath();
        ctx.ellipse(x + dx, y, sx, sy, 0, 0, TAU);
        ctx.fill();
        for (let k = 0; k < 4; k++) {
          const a = q() * TAU;
          ctx.beginPath();
          ctx.ellipse(x + dx + Math.cos(a) * sx * 0.75, y + Math.sin(a) * sy * 0.7, sx * (0.4 + q() * 0.25), sy * (0.4 + q() * 0.25), 0, 0, TAU);
          ctx.fill();
        }
      }
    };
    blob(0.6, 0.42, 0.42, 3); // 오른눈 위
    blob(-1.9, 0.3, 0.5, 4); // 뒤통수
    blob(-0.9, 0.85, 0.28, 5); // 왼쪽 정수리
  });
}

function cowBodyTexture() {
  return tex('cowSpots2', 256, 184, (ctx, w, h) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = COW_PATCH;
    const r = rng(5);
    const spots = [
      [0.03, 0.55, 30],
      [0.13, 0.18, 22],
      [0.45, 0.5, 32],
      [0.58, 0.16, 20],
      [0.8, 0.42, 26],
      [0.68, 0.84, 16],
      [0.93, 0.86, 14],
      [0.3, 0.88, 14],
    ];
    for (const [u, v, sz] of spots) {
      const x = u * w;
      const y = (1 - v) * h;
      for (const off of [-w, 0, w]) {
        ctx.beginPath();
        ctx.ellipse(x + off, y, sz, sz * 0.85, r() * 3, 0, TAU);
        ctx.fill();
        for (let k = 0; k < 3; k++) {
          const a = r() * TAU;
          ctx.beginPath();
          ctx.arc(x + off + Math.cos(a) * sz * 0.7, y + Math.sin(a) * sz * 0.6, sz * (0.4 + r() * 0.25), 0, TAU);
          ctx.fill();
        }
      }
    }
  });
}

function cowLegTexture() {
  return tex('cowLeg2', 16, 64, (ctx, w, h) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#4a3a5e';
    ctx.fillRect(0, h * 0.62, w, h);
  });
}

/** 주둥이 그림(콧구멍 + 표정별 입). 앞(+z)이 그림 가운데. */
const SNOUT_MOUTH = { idle: 'smile', blink: 'smile', happy: 'grin', wow: 'yay', worry: 'wobble', panic: 'scream' };

function snoutArt(mouth) {
  return faceTexture(
    `spSnout:${mouth}`,
    (ctx, s) => {
      const w = s;
      const h = s;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      const SX = 0.6;
      const SY = 0.4;
      const local = (lon, lat, k) => {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.translate((0.5 + lon / TAU) * w, (0.5 - lat / Math.PI) * h);
        ctx.scale(((w / TAU) / (SX * Math.cos(lat))) * k, ((h / Math.PI) / SY) * k);
      };
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.fillStyle = '#c4507a';
      for (const side of [-1, 1]) {
        local(side * 0.4, 0.22, 1);
        ctx.beginPath();
        ctx.ellipse(0, 0, 0.075, 0.1, side * 0.4, 0, TAU);
        ctx.fill();
      }
      local(0, -0.3, 1);
      ctx.scale(1.1, 1.1);
      paintMouth(ctx, mouth, INK);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    },
    256,
  );
}

const snoutMats = new Map();
function snoutMat(expr) {
  const mouth = SNOUT_MOUTH[expr] || 'smile';
  let m = snoutMats.get(mouth);
  if (!m) {
    m = toy('#f27e9e', '#ffa6bc', '#ffd0dc', { map: snoutArt(mouth), rough: 0.3, emissive: '#c04070', ei: 0.12 });
    snoutMats.set(mouth, m);
  }
  return m;
}

function buildCow() {
  const root = new THREE.Group();
  const turn = new THREE.Group();
  root.add(turn);
  const body = new THREE.Group();
  turn.add(body);
  const white = toy('#ffffff', '#fbf8ff', '#ffe6ef', { rough: 0.42, emissive: '#8e7ad8', ei: 0.08 });

  // 몸통: 통통한 누운 캡슐 + 얼룩
  const torsoGeo = once('g:cowTorso2', () => place(new THREE.CapsuleGeometry(0.125, 0.1, 10, 24), [0, 0, 0], [Math.PI / 2, 0, 0]));
  const torso = mesh(torsoGeo, toy('#ffffff', '#fbf8ff', '#ffe6ef', { map: cowBodyTexture(), rough: 0.42, emissive: '#8e7ad8', ei: 0.08 }), { pos: [0, -0.07, -0.055], scale: [1.1, 1, 1] });
  line(torso, OL);
  body.add(torso);
  // 꼬리(끝에 털뭉치)
  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, -0.02, -0.225);
  const tailGeo = merged(
    'cowTail2',
    () => [rod([0, 0, 0], [0, -0.1, -0.035], 0.011, { capsule: true, seg: 6 }), place(sphereGeo(1, 12, 10), [0, -0.118, -0.04], [0, 0, 0], [0.024, 0.032, 0.024])],
    true,
  );
  const tailMesh = new THREE.Mesh(tailGeo, [white, mat(COW_PATCH, { rough: 0.6 })]);
  tailMesh.castShadow = true;
  outlineWith(tailMesh, tailGeo, OL_XS);
  tailPivot.add(tailMesh);
  body.add(tailPivot);
  // 다리 넷(짧고 통통, 발굽은 진하게)
  const legGeo = once('g:cowLeg3', () => place(new THREE.CapsuleGeometry(0.04, 0.03, 6, 14), [0, -0.055, 0]));
  const legMat = toy('#ffffff', '#fbf8ff', '#f4ecff', { map: cowLegTexture(), rough: 0.45 });
  const legs = [];
  for (const [x, z, ph] of [
    [-0.07, 0.05, 0],
    [0.07, 0.05, 1],
    [-0.07, -0.16, 1],
    [0.07, -0.16, 0],
  ]) {
    const hip = new THREE.Group();
    hip.position.set(x, -0.14, z); // 발굽 바닥 = −0.25
    const l = mesh(legGeo, legMat);
    line(l, OL);
    hip.add(l);
    body.add(hip);
    legs.push({ hip, ph, x });
  }
  // 머리
  const R = 0.142;
  const hg = new THREE.Group();
  hg.position.set(0, 0.075, 0.115);
  hg.scale.setScalar(R);
  body.add(hg);
  const headMat = toy('#ffffff', '#fbf8ff', '#ffe6ef', { map: cowHeadTexture(), rough: 0.4, emissive: '#8e7ad8', ei: 0.08 });
  const K = headKit(COW);
  const H = headRig(K, headMat, OL / R, 'brown');
  hg.add(H.group);
  // 주둥이(표정마다 입 그림을 바꿔 끼운다)
  const snoutGeo = once('g:cowSnout', () => new THREE.SphereGeometry(1, 32, 20, -Math.PI / 2, TAU));
  const snout = mesh(snoutGeo, snoutMat('idle'), { pos: [0, -0.46, 0.74], scale: [0.6, 0.4, 0.4] });
  line(snout, 0.16);
  H.group.add(snout);
  // 귀(흰 겉 + 분홍 속) + 뿔
  const earGeo = merged(
    'cowEars2',
    () => {
      const parts = [];
      for (const sx of [-1, 1]) parts.push(place(sphereGeo(1, 16, 12), [sx * 1.14, 0.22, -0.08], [0, -sx * 0.3, -sx * 0.45], [0.5, 0.2, 0.3]));
      for (const sx of [-1, 1]) parts.push(place(sphereGeo(1, 14, 10), [sx * 1.17, 0.215, 0.02], [0, -sx * 0.3, -sx * 0.45], [0.36, 0.12, 0.2]));
      for (const sx of [-1, 1]) parts.push(place(coneGeo(1, 1, 14), [sx * 0.44, 0.9, -0.06], [0, 0, -sx * 0.45], [0.15, 0.4, 0.15]));
      return parts;
    },
    true,
  );
  regroup(earGeo, [0, 0, 1, 1, 2, 2]);
  const ears = new THREE.Mesh(earGeo, [white, toy('#ff8eac', '#ffa6bc', '#ffc6d4', { rough: 0.45 }), toy('#ffe2a0', '#fff0c8', '#fffbe8', { rough: 0.35 })]);
  ears.castShadow = true;
  outlineWith(ears, earGeo, 0.1);
  H.group.add(ears);
  // 빨간 목줄 + 금방울
  const bellGeo = merged(
    'cowBell',
    () => [
      place(torusGeo(1, 0.17, 10, 32), [0, -0.83, 0.02], [Math.PI / 2 + 0.15, 0, 0], [0.62, 0.62, 0.6]),
      place(
        latheGeo(
          [
            [0.001, -0.13],
            [0.15, -0.12],
            [0.2, -0.07],
            [0.17, 0.05],
            [0.1, 0.13],
            [0.001, 0.16],
          ],
          18,
        ),
        [0, -1.02, 0.6],
        [0.15, 0, 0],
      ),
      place(sphereGeo(1, 10, 8), [0, -1.14, 0.62], [0, 0, 0], 0.06),
    ],
    true,
  );
  regroup(bellGeo, [0, 1, 2]);
  const bell = new THREE.Mesh(bellGeo, [toy('#d81e3a', '#ff3a4e', '#ff7a80', { rough: 0.35 }), toy('#f0a000', '#ffcc33', '#fff0a0', { rough: 0.22, metal: 0.45, env: 1.4 }), mat('#4a2a10', { rough: 0.5 })]);
  outlineWith(bell, bellGeo, 0.08);
  H.group.add(bell);

  const yaw = follower();
  return {
    root,
    update(t, dir = 1, sp) {
      const state = sp ? sp.state : 'live';
      const held = !!(sp && sp.held && state === 'live');
      const h = held ? sp.hold : 0;
      const beam = state === 'beam';
      const y = yaw(t, dir * 0.75);
      turn.rotation.y = y;
      const hy = -y * 0.42;
      hg.rotation.y = hy;
      let swing = 0;
      if (held || beam || state === 'caught') {
        // 버둥버둥: 네 다리가 따로 차고, 몸이 들썩
        const k = held ? 0.45 + 0.5 * h : 0.6;
        for (let i = 0; i < legs.length; i++) {
          legs[i].hip.rotation.x = Math.sin(t * 24 + i * 1.7) * 0.65 * k;
          legs[i].hip.rotation.z = Math.sin(t * 19 + i) * 0.2 * k;
        }
        body.position.y = Math.sin(t * 30) * 0.006;
        body.rotation.x = -0.12 * k;
        hg.rotation.x = -0.18 * k;
        hg.rotation.z = Math.sin(t * 17) * 0.08 * k;
        tailPivot.rotation.z = Math.sin(t * 22) * 0.9;
        tailPivot.rotation.x = 0.5;
      } else {
        const ph = t * 5;
        swing = Math.sin(ph) * 0.38;
        // 다리를 벌린 만큼 몸을 낮춰 발굽이 늘 땅에 닿게 한다
        body.position.y = -0.105 * (1 - Math.cos(swing));
        for (const { hip, ph: p } of legs) {
          hip.rotation.x = p ? -swing : swing;
          hip.rotation.z = 0;
        }
        body.rotation.x = 0;
        hg.rotation.x = Math.sin(ph * 2) * 0.03 - 0.03;
        hg.rotation.z = Math.sin(t * 1.3) * 0.07;
        tailPivot.rotation.z = Math.sin(t * 3.2) * 0.45;
        tailPivot.rotation.x = 0.1 + Math.sin(t * 2.1) * 0.08;
      }
      snout.rotation.x = Math.sin(t * 6) * 0.05;
      let expr = 'idle';
      if (beam) expr = 'wow';
      else if (state === 'caught') expr = 'panic';
      else if (held) expr = h < 0.45 ? 'worry' : 'panic';
      else if (t % 7.7 > 6.6) expr = 'happy';
      else if (blinkAt(t)) expr = 'blink';
      H.set(expr);
      snout.material = snoutMat(expr);
      if (held || beam || state === 'caught') H.look(clamp(-(y + hy), -0.5, 0.5), 0.5);
      else idleLook(H, t, y + hy);
    },
  };
}

// ───────── 7. 촬영 드론 ─────────
// 주황·흰 몸통의 동글한 기체 + 커다란 렌즈 외눈(조리개가 조여진다) + 눈썹 + 머리 위 REC 등(녹화 중엔 빨갛게 번진다).

const DRONE = {
  key: 'drone',
  seg: [32, 24],
  face: [16, 16],
  HS: [1.3, 0.86, 1.12],
  eye: null,
  browLat: 0.74,
  browLon: 0.36,
  browK: 1.35,
  blush: [0.7, -0.32, 0.16],
  mouth: false,
  sweat: [0.84, 0.5],
};

function droneBodyTexture() {
  return tex('droneBody', 256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#ff8a2a';
    ctx.fillRect(0, 0, w, h * 0.5);
    ctx.fillStyle = '#f6f6ff';
    ctx.fillRect(0, h * 0.5, w, h * 0.5);
    ctx.fillStyle = '#2b3170';
    ctx.fillRect(0, h * 0.47, w, h * 0.07);
    // 정수리 흰 줄무늬
    ctx.fillStyle = '#fff1dc';
    ctx.fillRect(0, 0, w, h * 0.06);
  });
}

function buildDrone() {
  const root = new THREE.Group();
  const bob = new THREE.Group();
  root.add(bob);
  const view = new THREE.Group(); // 위가 조금 보이게 카메라 쪽으로 기울인다
  view.rotation.x = 0.28;
  bob.add(view);
  const turn = new THREE.Group();
  view.add(turn);
  const tilt = new THREE.Group();
  turn.add(tilt);

  const R = 0.122;
  const hg = new THREE.Group();
  hg.scale.setScalar(R);
  tilt.add(hg);
  const K = headKit(DRONE);
  const shell = toy('#ffd8c4', '#ffffff', '#eeeaff', { map: droneBodyTexture(), rough: 0.3, env: 1, emissive: '#a04a20', ei: 0.08 });
  const H = headRig(K, shell, OL / R, null);
  hg.add(H.group);
  // 렌즈 눈 + 테
  const eye = makeEye('lens');
  const EZ = new THREE.Vector3(0, -0.14, 1.0);
  placeEye(eye, frameOf(EZ, new THREE.Quaternion(), new THREE.Vector3(0.47, 0.47, 0.4)));
  hg.add(eye.holder);
  const bezel = mesh(torusGeo(1, 0.24, 12, 32), toy('#1c2150', '#2f3678', '#5a64b0', { rough: 0.25, env: 1.2 }), { pos: [0, -0.14, 1.04], scale: 0.5 });
  line(bezel, 0.12);
  hg.add(bezel);
  // REC 등(머리 위 오른쪽)
  const lampOn = mat('#ff6a6a', { emissive: '#ff3040', emissiveIntensity: 4.2, rough: 0.25 });
  const lampOff = mat('#7a3442', { rough: 0.35, emissive: '#3a0a18', emissiveIntensity: 0.3 });
  const lamp = mesh(sphereGeo(1, 16, 12), lampOn, { cast: false, pos: [0.6, 0.68, 0.3], scale: 0.21 });
  line(lamp, 0.4);
  hg.add(lamp);
  const lampGlow = glow('#ff3a4e', 0.2, 0.9);
  lampGlow.position.set(0.6 * R, 0.72 * R, 0.36 * R);
  tilt.add(lampGlow);
  // 팔 넷 + 모터 + 착륙 다리 + 안테나(한 도형)
  const A = [0.21, 0.14];
  const corners = [
    [A[0], A[1]],
    [-A[0], A[1]],
    [A[0], -A[1]],
    [-A[0], -A[1]],
  ];
  const frameGeo = merged('droneFrame2', () => {
    const p = [];
    for (const [x, z] of corners) {
      p.push(rod([Math.sign(x) * 0.1, 0.0, Math.sign(z) * 0.05], [x, 0.012, z], 0.015, { capsule: true, seg: 8 }));
      p.push(place(new THREE.CylinderGeometry(0.03, 0.026, 0.04, 16), [x, 0.022, z]));
    }
    for (const sx of [-1, 1]) {
      p.push(rod([sx * 0.05, -0.07, 0.03], [sx * 0.065, -0.12, 0.035], 0.008, { capsule: true, seg: 6 }));
      p.push(rod([sx * 0.05, -0.07, -0.04], [sx * 0.065, -0.12, -0.045], 0.008, { capsule: true, seg: 6 }));
      p.push(rod([sx * 0.065, -0.123, -0.075], [sx * 0.065, -0.123, 0.07], 0.009, { capsule: true, seg: 6 }));
    }
    p.push(rod([-0.05, 0.085, -0.05], [-0.075, 0.16, -0.07], 0.005, { seg: 5 }));
    p.push(place(sphereGeo(1, 10, 8), [-0.076, 0.165, -0.071], [0, 0, 0], 0.013));
    return p;
  });
  const frame = mesh(frameGeo, toy('#262c64', '#3a4288', '#6a74c0', { rough: 0.35 }), { cast: false });
  line(frame, OL_S);
  tilt.add(frame);
  // 프로펠러: 두 날 + 회전 잔상
  const propGeo = merged('droneProp2', () => [place(roundBoxGeo(0.15, 0.007, 0.026, 0.0035, 2), [0, 0, 0], [0.12, 0, 0]), place(sphereGeo(0.013, 10, 8), [0, 0.004, 0])]);
  const propMat = mat('#2b3160', { rough: 0.4 });
  const props = corners.map(([x, z], i) => {
    const p = mesh(propGeo, propMat, { cast: false, pos: [x, 0.05, z] });
    tilt.add(p);
    return { p, s: i % 3 === 0 ? 1 : -1 };
  });
  const blurGeo = merged('droneBlur2', () => [
    ...corners.map(([x, z]) => place(cylGeo(0.085, 0.085, 0.002, 28), [x, 0.05, z])),
    ...corners.map(([x, z]) => place(new THREE.TorusGeometry(0.085, 0.004, 6, 32), [x, 0.05, z], [Math.PI / 2, 0, 0])),
  ]);
  tilt.add(mesh(blurGeo, glassy('#eef3ff', 0.32, { rough: 0.3 }), { cast: false }));

  const yaw = follower(6);
  const aim = new THREE.Vector3();
  let lastIris = '';
  return {
    root,
    update(t, dir = 1, sp) {
      const state = sp ? sp.state : 'live';
      const beam = state === 'beam';
      const rec = sp ? !!sp.rec && state === 'live' : t % 2.4 < 1.3;
      const y = yaw(t, dir * 0.55);
      turn.rotation.y = y;
      tilt.rotation.x = 0.08 + Math.sin(t * 1.9) * 0.03;
      tilt.rotation.z = Math.sin(t * 1.4) * 0.05 + (beam ? Math.sin(t * 15) * 0.12 : 0);
      bob.position.y = Math.sin(t * 2.6) * 0.016;
      for (const { p, s } of props) p.rotation.y = s * t * 31;
      lamp.material = rec ? lampOn : lampOff;
      show(lampGlow, rec);
      if (rec) lampGlow.material.opacity = 0.75 + 0.2 * Math.sin(t * 9);
      let expr = 'idle';
      if (beam) expr = 'wow';
      else if (state === 'caught') expr = 'panic';
      else if (rec && sp) expr = 'rec';
      H.set(expr);
      const iris = beam ? 'n' : state === 'caught' ? 't' : rec ? 'r' : 'n';
      if (iris !== lastIris) {
        lastIris = iris;
        setIris(eye, iris, beam);
      }
      // 눈길: 녹화 중엔 빤히(보는 사람), 쉴 땐 두리번, 끌려가면 위
      let ey = -y * 0.9;
      let ep = 0.02;
      if (beam) ep = 0.5;
      else if (!rec) {
        ey += Math.sin(t * 0.9) * 0.4;
        ep = Math.sin(t * 0.6) * 0.15;
      }
      aim.set(Math.sin(ey) * Math.cos(ep), Math.sin(ep), Math.cos(ey) * Math.cos(ep));
      aimAt(eye.ball, aim, eye.fr.inv);
      // 렌즈 깜빡(조리개가 잠깐 닫히듯 납작)
      eye.holder.scale.y = 0.47 * (blinkAt(t) && !beam ? 0.15 : 1);
    },
  };
}

// ───────── 8. 기상 관측 풍선 ─────────
// 졸린 눈꺼풀(꾸벅꾸벅)의 하얀 고무 풍선 얼굴 + 둥실 떠오르는 Z + 줄에 매달린 주황 반사판과 관측 상자(깜빡이·안테나).

const WX = {
  key: 'wx',
  seg: [40, 30],
  face: [18, 18],
  HS: [1, 1.05, 1],
  shape: (lat) => 1 + 0.12 * Math.pow(Math.max(0, -Math.sin(lat)), 2),
  eye: { lon: 0.34, lat: 0.12, rx: 0.22, ry: 0.25, rz: 0.14, depth: 0.92, fwd: 0.38 },
  rim: 1.25,
  blush: [0.6, -0.16, 0.17],
  mouthLat: -0.34,
  sweat: [0.74, 0.5],
};

function weatherTexture() {
  return tex('weather2', 256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(176,150,210,0.4)';
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 8; i++) {
      const x = (i + 0.5) * (w / 8);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
  });
}

function lidTexture() {
  return tex('lid', 8, 64, (ctx, w, h) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = INK;
    ctx.fillRect(0, h * 0.84, w, h * 0.16);
  });
}

function zTexture() {
  return tex('zzz', 64, 64, (ctx, w) => {
    ctx.font = `900 ${w * 0.8}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = w * 0.14;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText('Z', w / 2, w / 2 + 2);
    ctx.fillStyle = '#4a3a9a';
    ctx.fillText('Z', w / 2, w / 2 + 2);
  });
}

function buildWeather() {
  const root = new THREE.Group();
  const bob = new THREE.Group();
  root.add(bob);
  const halo = glow('#fff2d2', 0.8, 0.3);
  halo.position.set(0, 0.08, -0.12);
  bob.add(halo);
  const R = 0.188;
  const hg = new THREE.Group();
  hg.position.y = 0.075;
  hg.scale.setScalar(R);
  bob.add(hg);
  const nod = new THREE.Group(); // 꾸벅
  hg.add(nod);
  const latex = toy('#f4f0ff', '#fffdf8', '#fff0de', { map: weatherTexture(), rough: 0.28, env: 1, emissive: '#c8b8ff', ei: 0.12 });
  const K = headKit(WX);
  const H = headRig(K, latex, OL / R, 'blue');
  nod.add(H.group);
  // 눈꺼풀(눈마다): 위 반구 껍데기를 굴려 내린다
  const lidGeo = once('g:lid', () => new THREE.SphereGeometry(1.08, 24, 10, 0, TAU, 0, Math.PI / 2));
  const lidMat = toy('#f4f0ff', '#fffdf8', '#fff0de', { map: lidTexture(), rough: 0.3, emissive: '#c8b8ff', ei: 0.12 });
  const lids = H.eyes.map((e) => {
    const l = mesh(lidGeo, lidMat, { cast: false });
    e.holder.add(l);
    return l;
  });
  // 목
  const neckGeo = once('g:weatherNeck2', () =>
    latheGeo(
      [
        [0.0, -0.035],
        [0.016, -0.035],
        [0.02, -0.028],
        [0.018, -0.012],
        [0.028, 0.008],
        [0.04, 0.02],
      ],
      18,
    ),
  );
  const neck = mesh(neckGeo, toy('#e8d6c0', '#f6e6cc', '#fff4e4', { rough: 0.45 }), { cast: false, pos: [0, -0.158, 0] });
  line(neck, OL_S * 0.8);
  bob.add(neck);
  // 매달린 짐: 줄 → 주황 반사판 → 관측 상자(목 아래를 축으로 흔들린다)
  const hang = new THREE.Group();
  hang.position.y = -0.19;
  bob.add(hang);
  const lineGeo = merged('weatherLine3', () => [rod([0, 0, 0], [0, -0.03, 0], 0.0045, { seg: 5 }), rod([0, -0.07, 0], [0, -0.085, 0], 0.0045, { seg: 5 })]);
  hang.add(mesh(lineGeo, mat('#5f6396', { rough: 0.6 }), { cast: false }));
  const refl = mesh(once('g:weatherRefl', () => new THREE.OctahedronGeometry(0.03, 0)), mat('#ff9a3c', { rough: 0.4, flat: true, emissive: '#c05010', emissiveIntensity: 0.2 }), { cast: false, pos: [0, -0.05, 0], rot: [0, 0.6, 0], scale: [0.85, 1, 0.4] });
  hang.add(refl);
  const boxGeo = merged(
    'weatherBox2',
    () => [
      roundBoxGeo(0.1, 0.075, 0.08, 0.018, 3),
      place(roundBoxGeo(0.104, 0.022, 0.084, 0.008, 2), [0, 0.006, 0]),
      place(roundBoxGeo(0.044, 0.026, 0.01, 0.005, 2), [-0.014, -0.014, 0.039]),
      rod([0.03, 0.035, 0], [0.042, 0.075, -0.01], 0.0035, { seg: 5 }),
    ],
    true,
  );
  regroup(boxGeo, [0, 1, 2, 1]);
  const box = new THREE.Mesh(boxGeo, [toy('#f0ecff', '#ffffff', '#fff4e0', { rough: 0.4 }), toy('#2f5fc8', '#3f78e0', '#7fb0ff', { rough: 0.4 }), mat('#7fe8ff', { emissive: '#3fd0ff', emissiveIntensity: 0.6, rough: 0.2 })]);
  box.position.y = -0.122;
  outlineWith(box, smoothCopy('weatherBox2', boxGeo), OL_S);
  hang.add(box);
  const ledOn = mat('#ff6a6a', { emissive: '#ff3040', emissiveIntensity: 3, rough: 0.3 });
  const ledOff = mat('#b87a7a', { rough: 0.45 });
  const led = mesh(sphereGeo(0.011, 10, 8), ledOn, { cast: false, pos: [0.03, -0.134, 0.04] });
  const ledGlow = glow('#ff5a4e', 0.12, 0.8);
  ledGlow.position.copy(led.position);
  hang.add(led, ledGlow);
  // Z
  const zMat = own(new THREE.SpriteMaterial({ map: zTexture(), transparent: true, depthWrite: false, fog: false }));
  const zz = own(new THREE.Sprite(zMat));
  zz.renderOrder = 6;
  zz.raycast = () => {};
  bob.add(zz);

  return {
    root,
    update(t, dir = 1, sp) {
      const state = sp ? sp.state : 'live';
      const beam = state === 'beam';
      const awake = beam || state === 'caught';
      bob.position.y = Math.sin(t * 1.5) * 0.014;
      hang.rotation.z = Math.sin(t * 1.6) * 0.16;
      hang.rotation.x = Math.sin(t * 1.1) * 0.08;
      // 졸음 주기: 천천히 감기다가(고개 꾸벅) 퍼뜩 뜬다
      const cyc = (t % 5.2) / 5.2;
      const droop = awake ? 0 : smooth01(cyc / 0.85);
      const startle = !awake && cyc > 0.9;
      nod.rotation.x = awake ? -0.1 : startle ? -0.06 : droop * 0.22;
      nod.rotation.z = Math.sin(t * 0.9) * 0.05;
      let expr = 'sleepy';
      if (beam) expr = 'wow';
      else if (state === 'caught') expr = 'panic';
      else if (startle) expr = 'worry';
      H.set(expr);
      const lidK = awake ? -1.05 : startle ? -0.75 : lerp(-0.12, 0.62, droop);
      for (const l of lids) l.rotation.x = lidK;
      H.look(beam ? 0 : Math.sin(t * 0.4) * 0.12, beam ? 0.45 : startle ? 0.1 : -0.12);
      // Z: 잠잘 때만 오른쪽 위로 떠오르며 사라진다
      const zk = (t * 0.45) % 1;
      show(zz, !awake && !startle);
      zz.position.set(0.17 + zk * 0.1, 0.25 + zk * 0.14, 0.05);
      zz.scale.setScalar(0.05 + zk * 0.05);
      zMat.opacity = Math.sin(Math.PI * zk) * 0.95;
      zMat.rotation = -0.2 + Math.sin(t * 2) * 0.1;
      const on = Math.sin(t * 5) > 0.2;
      led.material = on ? ledOn : ledOff;
      show(ledGlow, on);
    },
  };
}

// ───────── 9. 인공위성 ─────────
// 금박 몸통의 동글한 위성: 하얀 접시 테두리 안의 큰 외눈 + 웃는 입 + 날개처럼 파닥이는 태양 전지판 + 깜빡이 안테나.

const SAT = {
  key: 'sat',
  seg: [32, 24],
  face: [16, 16],
  HS: [1.05, 1.1, 0.95],
  eye: null,
  brows: false,
  blush: [0.62, -0.3, 0.16],
  mouthLat: -0.5,
  mouthK: 1,
  sweat: [0.76, 0.42],
};

function foilTexture() {
  return tex('satFoil2', 128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    const r = rng(9);
    for (let i = 0; i < 46; i++) {
      const x = r() * w;
      const y = r() * h;
      const s = 10 + r() * 22;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (r() - 0.5) * s * 2, y + (r() - 0.5) * s * 2);
      ctx.lineTo(x + (r() - 0.5) * s * 2, y + (r() - 0.5) * s * 2);
      ctx.closePath();
      ctx.fillStyle = r() > 0.5 ? 'rgba(255,250,220,0.5)' : 'rgba(200,140,60,0.18)';
      ctx.fill();
    }
  });
}

function panelTexture() {
  return tex('satPanel2', 256, 168, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#5aa2ff');
    g.addColorStop(1, '#2a5cd0');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(200,232,255,0.8)';
    ctx.lineWidth = 3;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo((i * w) / 4, 0);
      ctx.lineTo((i * w) / 4, h);
      ctx.stroke();
    }
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(0, (i * h) / 3);
      ctx.lineTo(w, (i * h) / 3);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.beginPath();
    ctx.moveTo(w * 0.18, 0);
    ctx.lineTo(w * 0.42, 0);
    ctx.lineTo(w * 0.26, h);
    ctx.lineTo(w * 0.02, h);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#e4e8ff';
    ctx.lineWidth = 12;
    ctx.strokeRect(0, 0, w, h);
  });
}

function buildSatellite() {
  const root = new THREE.Group();
  const bob = new THREE.Group();
  root.add(bob);
  const turn = new THREE.Group();
  bob.add(turn);
  const rig = new THREE.Group(); // 천천히 기우뚱
  turn.add(rig);
  const R = 0.108;
  const hg = new THREE.Group();
  hg.scale.setScalar(R);
  rig.add(hg);
  const gold = toy('#f08a0a', '#ffc23a', '#ffe590', { map: foilTexture(), rough: 0.32, metal: 0.08, env: 0.9, emissive: '#c06a00', ei: 0.2 });
  const K = headKit(SAT);
  const H = headRig(K, gold, OL / R, null);
  hg.add(H.group);
  // 접시 눈: 하얀 접시 테 + 큰 눈알
  const eye = makeEye('blue');
  placeEye(eye, frameOf(new THREE.Vector3(0, 0.27, 0.8), new THREE.Quaternion(), new THREE.Vector3(0.42, 0.42, 0.34)));
  hg.add(eye.holder);
  const dishGeo = once('g:satDishRim', () =>
    latheGeo(
      [
        [0.5, -0.12],
        [0.68, -0.05],
        [0.8, 0.12],
        [0.74, 0.16],
        [0.62, 0.06],
        [0.52, 0.02],
      ],
      36,
    ),
  );
  const dish = mesh(dishGeo, toy('#dfe4ff', '#ffffff', '#eef0ff', { rough: 0.25, env: 1.2 }), { cast: false, pos: [0, 0.27, 0.82], rot: [Math.PI / 2, 0, 0], scale: 0.74 });
  line(dish, 0.1);
  hg.add(dish);
  // 지지대 + 안테나(은색)
  const strutGeo = merged('satStruts2', () => [
    rod([-0.09, 0, 0], [-0.135, 0, 0], 0.009, { seg: 8 }),
    rod([0.09, 0, 0], [0.135, 0, 0], 0.009, { seg: 8 }),
    rod([0.02, 0.1, -0.02], [0.04, 0.19, -0.03], 0.005, { seg: 6 }),
  ]);
  rig.add(mesh(strutGeo, toy('#8a90c0', '#b8bce0', '#e4e6ff', { rough: 0.3, metal: 0.4 }), { cast: false }));
  const tipOn = mat('#ff6a6a', { emissive: '#ff3040', emissiveIntensity: 3, rough: 0.3 });
  const tipOff = mat('#b05050', { rough: 0.4 });
  const tip = mesh(sphereGeo(1, 12, 10), tipOn, { cast: false, pos: [0.041, 0.195, -0.031], scale: 0.016 });
  line(tip, 0.4);
  rig.add(tip);
  const tipGlow = glow('#ff5a4e', 0.13, 0.85);
  tipGlow.position.copy(tip.position);
  rig.add(tipGlow);
  // 태양 전지판 날개(지지대 끝을 축으로 파닥)
  const pMat = toy('#e6ecff', '#ffffff', '#f4f6ff', { map: panelTexture(), rough: 0.25, env: 1.1 });
  const panels = [];
  for (const sx of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(sx * 0.135, 0, 0);
    const p = mesh(roundBoxGeo(0.2, 0.125, 0.014, 0.006, 2), pMat, { cast: false, pos: [sx * 0.1, 0, 0] });
    line(p, OL_S);
    pivot.add(p);
    rig.add(pivot);
    panels.push({ pivot, sx });
  }

  const yaw = follower(4);
  let lastIris = -1;
  const aim = new THREE.Vector3();
  return {
    root,
    update(t, dir = 1, sp) {
      const state = sp ? sp.state : 'live';
      const beam = state === 'beam';
      turn.rotation.y = yaw(t, dir * 0.32);
      rig.rotation.z = -0.2 * (turn.rotation.y / 0.32) * 0.5 + Math.sin(t * 0.8) * 0.07;
      rig.rotation.x = 0.06 + Math.sin(t * 0.6) * 0.05;
      bob.position.y = Math.sin(t * 1.2) * 0.012;
      const flap = beam ? Math.sin(t * 14) * 0.5 : Math.sin(t * 1.6) * 0.22;
      for (const { pivot, sx } of panels) {
        pivot.rotation.x = flap;
        pivot.rotation.z = sx * (beam ? 0.3 + Math.sin(t * 14) * 0.25 : Math.sin(t * 1.6 + 1) * 0.08);
      }
      let expr = 'idle';
      if (beam) expr = 'wow';
      else if (state === 'caught') expr = 'panic';
      else if (t % 7.1 > 6.0) expr = 'happy';
      H.set(expr);
      const code = (state === 'caught' ? 1 : 0) + (beam || expr === 'happy' ? 2 : 0);
      if (code !== lastIris) {
        lastIris = code;
        setIris(eye, code & 1 ? 't' : 'n', code >= 2);
      }
      const ey = beam ? 0 : -turn.rotation.y + Math.sin(t * 0.7) * 0.3;
      const ep = beam ? 0.5 : Math.sin(t * 0.5) * 0.12 + 0.04;
      aim.set(Math.sin(ey) * Math.cos(ep), Math.sin(ep), Math.cos(ey) * Math.cos(ep));
      aimAt(eye.ball, aim, eye.fr.inv);
      eye.holder.scale.y = 0.42 * (blinkAt(t) && !beam ? 0.12 : expr === 'happy' ? 0.75 : 1);
      const on = Math.sin(t * 5) > 0.3;
      tip.material = on ? tipOn : tipOff;
      show(tipGlow, on);
    },
  };
}

// ───────── 10. 별똥별 ─────────
// 씨익 웃는 불덩이: 뜨거운 노랑·주황 공 얼굴 + 뒤로 나부끼는 불꽃 혀(빛 번짐) + 길게 끌리는 꼬리와 반짝이.

const MET = {
  key: 'met',
  seg: [32, 24],
  face: [16, 16],
  HS: [1, 1, 1],
  eye: { lon: 0.37, lat: 0.1, rx: 0.25, ry: 0.3, rz: 0.17, depth: 0.9, fwd: 0.35 },
  rim: 1.3,
  blush: [0.64, -0.22, 0.15],
  mouthLat: -0.43,
  sweat: [0.78, 0.52],
  ink: '#4a1030',
};

/** 꼬리 그림(화소마다 계산): 왼쪽 끝이 머리, 오른쪽으로 가늘어지며 사라진다. */
function tailTexture(key, core) {
  return tex(key, 256, 64, (ctx, w, h) => {
    const img = ctx.createImageData(w, h);
    const d = img.data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const u = x / (w - 1);
        const half = (core ? 0.38 : 0.92) * Math.pow(1 - u, 0.7) + 0.02;
        const v = Math.abs((y + 0.5) / h - 0.5) * 2;
        const across = 1 - smooth01(v / half);
        const along = Math.pow(1 - u, core ? 1.5 : 1.1) * smooth01(u / 0.08);
        let a = across * along;
        let r;
        let gg;
        let b;
        if (core) {
          r = 255;
          gg = lerp(250, 210, u);
          b = lerp(220, 110, u);
        } else {
          r = 255;
          gg = u < 0.5 ? lerp(190, 120, u * 2) : lerp(120, 90, (u - 0.5) * 2);
          b = u < 0.5 ? lerp(60, 70, u * 2) : lerp(70, 150, (u - 0.5) * 2);
          for (const off of [-0.42, 0.38]) {
            const sv = Math.abs((y + 0.5) / h - 0.5 - off * 0.5 * Math.pow(1 - u, 0.5));
            a = Math.max(a, (1 - smooth01(sv / 0.05)) * Math.pow(1 - u, 1.8) * 0.75 * smooth01(u / 0.1));
          }
        }
        const i = (y * w + x) * 4;
        d[i] = r;
        d[i + 1] = gg;
        d[i + 2] = b;
        d[i + 3] = Math.round(Math.min(1, a) * 255);
      }
    }
    ctx.putImageData(img, 0, 0);
  });
}

function buildMeteor() {
  const root = new THREE.Group();
  const ANG = 0.42; // 내려가는 기울기(라디안)
  // 꼬리(날아온 쪽): 스프라이트라 아이콘 크기 재기에서 빠지고 늘 화면을 향한다
  const trail = new THREE.Group();
  root.add(trail);
  const mkTail = (key, core, op, add) => {
    const m = own(
      new THREE.SpriteMaterial({ map: tailTexture(key, core), transparent: true, opacity: op, depthWrite: false, fog: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending }),
    );
    const s = own(new THREE.Sprite(m));
    s.center.set(0, 0.5);
    s.renderOrder = add ? 4 : 3;
    s.raycast = () => {};
    return s;
  };
  const outer = mkTail('tailOuter2', false, 0.92, false);
  const core = mkTail('tailCore2', true, 1, true);
  outer.position.z = -0.08;
  core.position.z = -0.07;
  root.add(outer, core);
  const sparkles = [];
  const SIDES = [-0.5, 0.7, -0.75, 0.35];
  for (let i = 0; i < 4; i++) {
    const s = sparkleSprite(i % 2 ? '#fff3b0' : '#ffffff', 0.08);
    trail.add(s);
    sparkles.push({ s, k: i / 4, side: SIDES[i] });
  }
  const glowBig = glow('#ff9a2a', 0.8, 0.36);
  const glowCore = glow('#ffe0a0', 0.4, 0.22);
  root.add(glowBig, glowCore);
  // 불꽃 혀(꼬리 쪽으로 나부낀다, 빛 번짐)
  const flameGeo = merged('metFlames', () => {
    const lathe = latheGeo(
      Array.from({ length: 13 }, (_, i) => {
        const y = i / 12;
        return [Math.max(0.0005, Math.sin(Math.PI * Math.pow(y, 0.5)) * (1 - y * 0.6) * 0.5), y];
      }),
      12,
    );
    const parts = [];
    const spec = [
      [-1.15, 0.6, 0.05],
      [-0.6, 0.86, 0.07],
      [0, 1.0, 0.085],
      [0.6, 0.86, 0.07],
      [1.15, 0.6, 0.05],
      [-0.3, 0.7, -0.06],
      [0.35, 0.72, -0.06],
    ];
    for (const [a, len, wd] of spec) {
      const g = lathe.clone();
      g.scale(wd * 2.2, 0.17 * len + 0.06, wd * 2.2);
      // +y → 꼬리 방향(+x)으로 눕히고 부채꼴로 벌린다
      const dir = new THREE.Vector3(1, Math.sin(a) * 0.75, Math.abs(a) < 0.1 ? 0 : 0.12 * Math.sign(wd)).normalize();
      _q.setFromUnitVectors(UP, dir);
      g.applyQuaternion(_q);
      g.translate(Math.cos(a) * 0.075, Math.sin(a) * 0.075, wd < 0.06 ? -0.02 : 0.01);
      parts.push(g);
    }
    lathe.dispose();
    return parts;
  });
  const flameTex = tex('flameGrad', 8, 64, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, h, 0, 0);
    g.addColorStop(0, '#fff7c0');
    g.addColorStop(0.3, '#ffd23a');
    g.addColorStop(0.65, '#ff8a1e');
    g.addColorStop(1, '#ff3a1a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
  const flameMat = once('metFlameMat', () => new THREE.MeshStandardMaterial({ color: '#ffffff', map: flameTex, roughness: 0.5, emissive: new THREE.Color('#ffffff'), emissiveMap: flameTex, emissiveIntensity: 1.45 }));
  const flames = mesh(flameGeo, flameMat, { cast: false });
  line(flames, OL_S * 0.9, '#c0401a');
  trail.add(flames);
  // 불덩이 얼굴
  const R = 0.125;
  const hg = new THREE.Group();
  hg.scale.setScalar(R);
  root.add(hg);
  const fire = toy('#ff7a1a', '#ffb83a', '#fff09a', { rough: 0.35, emissive: '#ff6a10', ei: 0.62 });
  const K = headKit(MET);
  const H = headRig(K, fire, 0, 'ember');
  line(H.head, OL / R, '#7a1a20'); // 남보라 대신 불씨색 외곽선
  hg.add(H.group);

  return {
    root,
    update(t, dir = 1, sp) {
      const state = sp ? sp.state : 'live';
      const beam = state === 'beam';
      const a = dir > 0 ? Math.PI - ANG : ANG;
      trail.rotation.z = a;
      const flick = 1 + Math.sin(t * 18) * 0.06 + Math.sin(t * 31) * 0.04;
      flames.scale.set(flick, 1 + Math.sin(t * 23) * 0.08, 1);
      const LEN = 0.7 * flick;
      outer.scale.set(LEN, 0.3 * (1 + Math.sin(t * 13) * 0.04), 1);
      core.scale.set(LEN * 0.8, 0.2, 1);
      outer.material.rotation = a;
      core.material.rotation = a;
      hg.rotation.y = dir * 0.28;
      hg.rotation.z = Math.sin(t * 2.2) * 0.06 - dir * 0.05;
      hg.position.y = Math.sin(t * 5) * 0.006;
      const pulse = 0.5 + 0.5 * Math.sin(t * 6);
      glowBig.material.opacity = 0.28 + 0.14 * pulse;
      glowBig.scale.setScalar(0.74 + 0.08 * pulse);
      for (const s of sparkles) {
        const k = (t * 1.1 + s.k) % 1;
        s.s.position.set(0.1 + k * 0.5, s.side * 0.09 * (1 - k * 0.5), 0.01);
        s.s.scale.setScalar(0.09 * (1 - k * 0.55) * (0.8 + 0.4 * Math.abs(Math.sin(t * 9 + s.k * 7))));
        s.s.material.opacity = Math.sin(Math.PI * Math.min(1, k * 1.15)) * 0.95;
      }
      let expr = 'smirk';
      if (beam) expr = 'wow';
      else if (state === 'caught') expr = 'panic';
      else if (blinkAt(t)) expr = 'blink';
      H.set(expr);
      // 날아가는 쪽 아래를 본다
      H.look(beam ? -dir * 0.28 : dir * 0.22, beam ? 0.45 : -0.22);
    },
  };
}

// ───────── 공개 ─────────

const BUILD = {
  dandelion: buildDandelion,
  firefly: buildFirefly,
  balloon: buildBalloon,
  kite: buildKite,
  chicken: buildChicken,
  cow: buildCow,
  drone: buildDrone,
  weather: buildWeather,
  satellite: buildSatellite,
  meteor: buildMeteor,
};

/** 걸어 다니는 표본(닭·젖소)은 그림자를 드리운다. */
const GROUND = new Set(['chicken', 'cow']);

/**
 * 표본 하나를 만든다.
 * @param {string} kind SPECIMEN_KINDS 중 하나
 * @returns {{ root: THREE.Object3D, update(t: number, dir: number, sp?: object): void, dispose(): void }}
 *   root 의 원점이 표본의 중심. update(t, dir, sp) 는 매 프레임 부른다(t = 초, dir = 진행 방향 −1 | 1,
 *   sp = 표본 기록 {state, held, hold, flee, rec, cut, shiny}, 없어도 된다).
 */
export function createSpecimen(kind) {
  const make = BUILD[kind] || BUILD.dandelion;
  const sp = make();
  sp.root.name = `specimen:${kind}`;
  const cast = GROUND.has(kind);
  const owned = [];
  sp.root.traverse((o) => {
    if (o.isMesh && o.name !== 'outline') {
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      o.castShadow = cast && o.castShadow && !ms.some((m) => m.transparent);
    }
    if (o.userData.ownMaterial) owned.push(o);
  });
  sp.update(0, 1);
  /** (선택) 내릴 때 이 개체만 쓰던 재질(빛무리·맥박 치는 빛·Z)을 해제한다. 공용 도형·텍스처·재질은 그대로 둔다. */
  sp.dispose = () => {
    for (const o of owned) {
      if (o.material && !Array.isArray(o.material)) o.material.dispose();
    }
  };
  return sp;
}
