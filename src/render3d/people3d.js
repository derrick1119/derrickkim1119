// 3D 지구인(하늘을 올려다보는 구경꾼) 12종. 피포와 같은 상자에서 나온 '말랑한 비닐 장난감' 꼬마 인물들.
//
// 피포에게서 가져온 그리는 법
//   · 머리는 반지름 1 단위로 만들어 통째로 HR 배 한다. 살갗은 정수리가 조금 진하고 볼·턱으로 갈수록 밝고 발그레한 그림을 입힌
//     매끈한 구(윤기 있는 비닐). 얼굴(눈썹·입·볼·속눈썹 테·감은 눈·콧수염·주근깨·수염 자국)도 같은 그림에 그린다.
//     머리 구의 UV 를 다시 펴서 정면 얼굴 창(가로 2.5 × 세로 2.0 라디안)이 그림 대부분을 쓰게 했으므로 256px 한 장으로도
//     얼굴이 또렷하다. 그림이 머리 꼭짓점에 바로 붙으므로 얼굴 껍데기·외곽선 겹침 얼룩이 생기지 않는다.
//     표정 그림은 (종류 × 표정)마다 처음 쓸 때 한 장 그려 캐시한다.
//   · 눈은 진짜 3D: 빛을 받지 않는 흰자 + 대상을 따라 도는 눈동자(세로 그라데이션 + 큰 동공) + 카메라 쪽에 고정된 반짝임 두 점
//     (큰 것 왼쪽 위, 작은 것 오른쪽 아래. 좌우로 뒤집혀 걸어도 빛은 늘 왼쪽 위). 속눈썹 테는 눈알이 머리 표면을 뚫고 나오는
//     경계를 계산해 그 바깥에 그린다. 고개는 기체 쪽으로 조금만 들고 나머지는 눈이 올려다본다(얼굴이 늘 보이게).
//   · 코·귀도 같은 살갗 그림을 머리 위로 비춰(투영 UV) 칠하므로 이음매 없이 같은 살빛이다. 코에는 외곽선을 두르지 않는다.
//   · 머리카락은 머리 구를 부풀린 껍데기를 머리선(앞머리 술·옆·뒤 길이)에 맞춰 깎은 한 덩이(매끈한 성형 머리). 모자와 한 메시로 합친다.
//   · 옷·신발·소품은 정점 색 그라데이션(위 밝고 아래 진하게) + 비닐 윤기 + 제 색으로 살짝 빛나는 그늘(그늘이 잿빛으로 죽지 않게).
//
// 짜임
//   · 한 벌만 만들고 걷는 방향(dir)에 따라 좌우를 뒤집는다(flip.scale.x = dir). 뒤집힌 틀 안에서 인물은 늘 +x(기체 쪽)로
//     3/4 돌아서 있다. 기체 쪽 팔(로컬 +x, 손 1)이 몸짓(가리키기·잠자리채·손 인사)을, 카메라 쪽 팔(손 0)이 소품을 든다.
//   · 뼈대: flip → base(화면 평면 기울기·튀어 오르기·찌그러짐, 발밑 기준) → body(몸 방향) → torso(엉덩이) → neck → head.
//   · 원점: 보통 사람은 발밑 가운데(키 ≈ 0.95 ~ 1.15), 열기구는 바구니 바닥 가운데(≈ 1.75), 우주비행사는 몸 중심.
//   · 메시는 외곽선 포함 한 사람에 40 개 이하. 도형·재질·그림은 모두 모듈 캐시를 나눠 쓴다.
//   · update 는 도형·재질·배열을 만들지 않는다. 같은 종류를 풀에서 돌려 쓰므로 움직이는 부품은 매번 전부 다시 놓는다.
import { THREE, mesh, sphereGeo, cylGeo, coneGeo, torusGeo, roundBoxGeo, addOutline, glowSprite, canvasTexture, tone } from './kit.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

/** 지구인 종류(게임 순서). */
export const WATCHER_TYPES = ['farmer', 'kid', 'walker', 'camper', 'fisher', 'worker', 'streamer', 'astronomer', 'photographer', 'balloonist', 'astronaut', 'hunter'];

const TAU = Math.PI * 2;
// 뼈대(발밑 기준, 1 = 64px)
const HIP = 0.18; // 다리 관절 높이 = 몸통 원점
const NECK = 0.2; // 몸통 원점 → 목(머리가 도는 곳)
const HEAD_C = 0.262; // 목 → 머리 중심
const HR = 0.272; // 머리 반지름(머리에 붙는 것은 모두 반지름 1 단위로 만들고 머리 묶음을 HR 배 한다)
const SHX = 0.128; // 어깨(몸통 기준)
const SHY = 0.158;
const ARM = 0.16; // 어깨 → 손 중심
const LEG_X = 0.072;
const FOOT_C = -0.122; // 다리 관절 → 신발 가운데
const SOLE_Y = -HIP; // 다리 관절 → 납작한 밑창(= 땅)
const YAW = 0.42; // 평소 3/4 돌아선 각
const OL = 0.017; // 외곽선(머리·몸통·모자: 실루엣)
const OLS = 0.012; // 외곽선(팔다리·소품)
const OLH = 0.062; // 머리 묶음 안(반지름 1 단위)의 외곽선
const LINE = '#261c42'; // 외곽선 색(보라 기운 남색, 피포와 같은 계열)

const clamp01 = (v) => Math.min(1, Math.max(0, v || 0));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (k) => k * k * (3 - 2 * k);
const frac = (v) => v - Math.floor(v);

const DOWN = new THREE.Vector3(0, -1, 0);
const UP = new THREE.Vector3(0, 1, 0);
const XA = new THREE.Vector3(1, 0, 0);
const ZA = new THREE.Vector3(0, 0, 1);
const CAM_DIR = new THREE.Vector3(0, 0.2, 1).normalize(); // 화면(카메라) 쪽 방향(월드)
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _d = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _qi = new THREE.Quaternion();
const _m = new THREE.Matrix4();
const _hm = new THREE.Matrix4();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();

/** 미리 만든 길이 3 배열에 값 넣기(매 장면 배열을 새로 만들지 않으려고). */
function set3(v, x, y, z) {
  v[0] = x;
  v[1] = y;
  v[2] = z;
  return v;
}
function mix3(v, x, y, z, k) {
  v[0] = lerp(v[0], x, k);
  v[1] = lerp(v[1], y, k);
  v[2] = lerp(v[2], z, k);
  return v;
}

// ───────── 도형 도구 ─────────

const gcache = new Map();
function cg(key, make) {
  let g = gcache.get(key);
  if (!g) {
    g = make();
    g.userData.shared = true;
    gcache.set(key, g);
  }
  return g;
}

/** 도형을 복제해 옮긴다(합치기용). rot 은 오일러각, order 기본 XYZ. */
function place(geo, pos = [0, 0, 0], rot = [0, 0, 0], scale = 1, order = 'XYZ') {
  const g = geo.clone();
  _q.setFromEuler(_e.set(rot[0], rot[1], rot[2], order));
  if (Array.isArray(scale)) _s.set(scale[0], scale[1], scale[2]);
  else _s.set(scale, scale, scale);
  _m.compose(_a.set(pos[0], pos[1], pos[2]), _q, _s);
  g.applyMatrix4(_m);
  return g;
}

/** a → b 를 잇는 막대(합치기용). */
function rodGeo(a, b, r0, r1 = r0, seg = 10) {
  const A = new THREE.Vector3(...a);
  const B = new THREE.Vector3(...b);
  const d = B.clone().sub(A);
  const len = d.length();
  const g = new THREE.CylinderGeometry(r1, r0, len, seg, 1, false);
  const q = new THREE.Quaternion().setFromUnitVectors(UP, d.normalize());
  g.applyMatrix4(new THREE.Matrix4().compose(A.add(B).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
  return g;
}

/** 합치기 전에 속성을 맞춘다(색인 없음 + uv·법선). */
function prep(parts) {
  const flat = parts.some((p) => !p.index);
  return parts.map((p) => {
    const g = flat && p.index ? p.toNonIndexed() : p;
    if (g !== p) p.dispose();
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!g.attributes.normal) g.computeVertexNormals();
    return g;
  });
}

/** 여러 도형을 하나로 합친 도형(캐시). make() 는 새로 만든(복제한) 도형 목록을 돌려준다. */
function merged(key, make) {
  return cg(key, () => {
    const parts = prep(make());
    const g = mergeGeometries(parts, false);
    if (!g) throw new Error(`people3d: merge failed (${key})`);
    for (const p of parts) p.dispose();
    return g;
  });
}

/** 옆모습 [[r, y], ...] 을 부드러운 곡선으로 이어 돌린 도형. phi 범위를 주면 앞판(부분 껍질)이 된다. */
function lathe(key, pts, { seg = 32, n = 26, phiStart = 0, phiLength = TAU, smoothIt = true } = {}) {
  return cg(`lathe:${key}`, () => {
    const src = pts[0][1] > pts[pts.length - 1][1] ? [...pts].reverse() : pts;
    let v = src.map(([r, y]) => new THREE.Vector2(r, y));
    if (smoothIt) v = new THREE.SplineCurve(v).getPoints(n);
    for (const p of v) p.x = Math.max(0, p.x);
    return new THREE.LatheGeometry(v, seg, phiStart, phiLength);
  });
}

/** 캡슐(길이 방향으로도 나눠서 정점 색 띠를 칠할 수 있게). 전체 길이 len, y 축, 가운데 원점. */
const capG = (r, len, hseg = 8, radial = 16) => cg(`cap${r}|${len}|${hseg}|${radial}`, () => new THREE.CapsuleGeometry(r, Math.max(0.001, len - 2 * r), 6, radial, hseg));

/** 구를 늘려 만든 타원체(합치기용). */
function ell(pos, r, rot = [0, 0, 0], seg = null, order = 'XYZ') {
  const big = Array.isArray(r) ? Math.max(...r) : r;
  const sg = seg || (big < 0.03 ? [12, 9] : big < 0.08 ? [18, 12] : [24, 16]);
  return place(sphereGeo(1, sg[0], sg[1]), pos, rot, r, order);
}

// ───────── 정점 색 ─────────

const colCache = new Map();
/** '#rrggbb' → THREE.Color(선형, 캐시). */
function col(hex) {
  let c = colCache.get(hex);
  if (!c) colCache.set(hex, (c = new THREE.Color(hex)));
  return c;
}
const _pc = new THREE.Color();

/** 정점 색 칠하기(복제본). c = '#rrggbb'·THREE.Color 단색, 또는 fn(x, y, z, ny) → THREE.Color. */
function paint(geo, c) {
  const g = geo.clone();
  const p = g.attributes.position;
  const n = g.attributes.normal;
  const arr = new Float32Array(p.count * 3);
  const solid = typeof c === 'string' ? col(c) : c.isColor ? c : null;
  for (let i = 0; i < p.count; i++) {
    const v = solid || c(p.getX(i), p.getY(i), p.getZ(i), n ? n.getY(i) : 0);
    arr[i * 3] = v.r;
    arr[i * 3 + 1] = v.g;
    arr[i * 3 + 2] = v.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

/** 위아래 명암: y0 에서 가장 어둡고 y1 에서 가장 밝다. fn(x, y) */
function grad(hex, y0, y1, dark = 0.2, light = 0.08) {
  const lo = col(tone(hex, -dark));
  const mid = col(hex);
  const hi = col(tone(hex, light));
  return (x, y) => {
    const k = clamp01((y - y0) / (y1 - y0));
    return k < 0.55 ? _pc.copy(lo).lerp(mid, k / 0.55) : _pc.copy(mid).lerp(hi, (k - 0.55) / 0.45);
  };
}

// ───────── 재질: 말랑한 비닐 ─────────
// 그늘에서도 제 색이 살아 있게, 빛과 상관없이 제 색(정점 색·그림 포함)의 일부를 스스로 낸다(피포의 보랏빛 그늘과 같은 생각).

const SELF = 0.13;
function vinylize(m, self = SELF) {
  const s = self.toFixed(3);
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n\ttotalEmissiveRadiance += diffuseColor.rgb * ${s};`);
  };
  m.customProgramCacheKey = () => `vinyl${s}`;
  return m;
}

const vmats = new Map();
/** 정점 색 비닐 재질(캐시). 수정하지 말 것. */
function VM(rough = 0.5, { metal = 0, self = SELF, side = THREE.FrontSide, flat = false, env = 0.75 } = {}) {
  const key = `${rough}|${metal}|${self}|${side}|${flat}|${env}`;
  let m = vmats.get(key);
  if (!m) {
    m = vinylize(new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: rough, metalness: metal, side, flatShading: flat, envMapIntensity: env }), self);
    vmats.set(key, m);
  }
  return m;
}
/** 단색 비닐 재질(캐시). */
function SM(hex, { rough = 0.45, emissive = null, emissiveIntensity = 1, opacity = 1, self = SELF } = {}) {
  const key = `sm${hex}|${rough}|${emissive}|${emissiveIntensity}|${opacity}|${self}`;
  let m = vmats.get(key);
  if (!m) {
    m = vinylize(new THREE.MeshStandardMaterial({ color: hex, roughness: rough, envMapIntensity: 0.75, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 }), self);
    if (emissive) {
      m.emissive = new THREE.Color(emissive);
      m.emissiveIntensity = emissiveIntensity;
    }
    vmats.set(key, m);
  }
  return m;
}

/** 메시를 붙인다(외곽선 선택). */
function add(parent, geo, material, { pos, rot, scale, outline = 0, cast = true } = {}) {
  const m = mesh(geo, material, { cast, pos, rot, scale });
  if (outline) addOutline(m, outline, LINE);
  parent.add(m);
  return m;
}

// ───────── 머리: 살갗 그림의 펼침(UV) ─────────
// 정면 얼굴 창(|경도| ≤ FW/2, |위도| ≤ FH/2)이 그림의 [UB, UT] × [VB, VT] 를 고르게 쓰고, 나머지(옆·뒤·정수리·턱 밑)는
// 가장자리 띠로 눌러 담는다. 가장자리는 위아래 그라데이션뿐이라 눌려도 티가 나지 않는다.

const HS = new THREE.Vector3(1.05, 0.96, 1); // 살짝 넓적한 찹쌀떡 머리
const HSEG = [40, 28];
const FW = 2.5;
const FH = 2.0;
const TS = 256; // 얼굴 그림 크기(px)
const UB = 0.07;
const UT = 0.93;
const VB = 0.08;
const VT = 0.84;
const VTOP = 0.92;

function uOf(lon) {
  const a = Math.abs(lon);
  if (a <= FW / 2) return 0.5 + (lon / FW) * (UT - UB);
  const k = Math.min(1, (a - FW / 2) / (Math.PI - FW / 2));
  return lon > 0 ? UT + k * (1 - UT) : UB - k * UB;
}
function vOf(lat) {
  const a = Math.abs(lat);
  if (a <= FH / 2) return (VB + VT) / 2 + (lat / FH) * (VT - VB);
  const k = Math.min(1, (a - FH / 2) / (Math.PI / 2 - FH / 2));
  return lat > 0 ? VT + k * (VTOP - VT) : VB - k * VB;
}
function latOfV(v) {
  if (v >= VB && v <= VT) return ((v - (VB + VT) / 2) / (VT - VB)) * FH;
  if (v > VT) return FH / 2 + Math.min(1, (v - VT) / (VTOP - VT)) * (Math.PI / 2 - FH / 2);
  return -FH / 2 - ((VB - v) / VB) * (Math.PI / 2 - FH / 2);
}
const PXX = (TS * (UT - UB)) / FW; // 1 라디안 = 몇 px
const PXY = (TS * (VT - VB)) / FH;
const TX = (lon) => uOf(lon) * TS;
const TY = (lat) => (1 - vOf(lat)) * TS;

/** 얼굴 그림 위 한 점을 중심으로, 머리 표면 길이(반지름 1 단위)로 그릴 수 있게 좌표를 맞춘다. y 는 아래가 +. */
function local(ctx, lon, lat) {
  ctx.setTransform(PXX / (HS.x * Math.cos(lat)), 0, 0, PXY / HS.y, TX(lon), TY(lat));
}

/** 경도·위도 → 단위 구 방향. 경도 + = 보는 사람의 오른쪽(+x). */
function dirOf(lon, lat, out = new THREE.Vector3()) {
  return out.set(Math.sin(lon) * Math.cos(lat), Math.sin(lat), Math.cos(lon) * Math.cos(lat));
}

/** 머리 구(UV = 위의 펼침). 이음매는 뒤통수(경도 ±π). */
function headSphere(W = HSEG[0], H = HSEG[1]) {
  return cg(`vhead${W}|${H}`, () => {
    const g = new THREE.SphereGeometry(1, W, H, -Math.PI / 2, TAU);
    const uv = g.attributes.uv;
    for (let iy = 0; iy <= H; iy++) {
      for (let ix = 0; ix <= W; ix++) {
        uv.setXY(iy * (W + 1) + ix, uOf(-Math.PI + (ix / W) * TAU), vOf(Math.PI / 2 - (iy / H) * Math.PI));
      }
    }
    return g;
  });
}

/** 도형 꼭짓점을 머리 중심에서 비춰 살갗 그림의 UV 를 준다. div = 머리 비율로 나눌지(코처럼 HS 가 곱해진 자리), squeeze = 가운데로 모으기. */
function projectUV(g, div = null, squeeze = 0) {
  const p = g.attributes.position;
  const n = p.count;
  const uv = new Float32Array(n * 2);
  let cu = 0;
  let cv = 0;
  for (let i = 0; i < n; i++) {
    _a.set(p.getX(i), p.getY(i), p.getZ(i));
    if (div) _a.divide(div);
    _a.normalize();
    uv[i * 2] = uOf(Math.atan2(_a.x, _a.z));
    uv[i * 2 + 1] = vOf(Math.asin(clamp(_a.y, -1, 1)));
    cu += uv[i * 2] / n;
    cv += uv[i * 2 + 1] / n;
  }
  if (squeeze) {
    for (let i = 0; i < n; i++) {
      uv[i * 2] = lerp(uv[i * 2], cu, squeeze);
      uv[i * 2 + 1] = lerp(uv[i * 2 + 1], cv, squeeze);
    }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

/** 머리 + 귀(같은 살갗 그림). 단위 구 공간(메시에 HS 를 곱한다). */
function headGeo(ear = 1) {
  return cg(`vheadE${ear}`, () => {
    const parts = [headSphere().clone()];
    if (ear > 0) {
      for (const s of [-1, 1]) {
        const e = place(sphereGeo(1, 16, 12), [s * 0.93, -0.1, -0.04], [0, s * 0.25, s * -0.12], [0.16 * ear, 0.21 * ear, 0.15 * ear]);
        parts.push(projectUV(e));
      }
    }
    const pp = prep(parts);
    const g = mergeGeometries(pp, false);
    for (const p of pp) p.dispose();
    return g;
  });
}

const NOSE_LAT = -0.2;
/** 코(머리 묶음 단위, HS 가 이미 곱해진 자리). 살갗 그림을 비춰 칠한다(코끝이 발그레). */
function noseGeo(k = 1) {
  return cg(`vnose${k}`, () => {
    const p = dirOf(0, NOSE_LAT).multiply(HS).multiplyScalar(0.985 + 0.02 * (k - 1));
    const g = place(sphereGeo(1, 20, 14), [p.x, p.y, p.z], [-0.15, 0, 0], [0.13 * k, 0.105 * k, 0.11 * k]);
    return projectUV(g, HS, 0.55);
  });
}

// ───────── 눈 ─────────

const EYE = { lon: 0.37, lat: -0.04, rx: 0.2, ry: 0.245, rz: 0.13, depth: 0.95, fwd: 0.4 };
const IRIS_CAP = 1.08; // 눈동자 껍데기 크기(라디안). sin(1.08) ≈ 눈 반지름의 88 %(피포처럼 눈동자가 눈을 거의 채운다)

/** 눈 자리(머리 중심 기준 위치·방향·크기). side: −1 = 보는 사람의 왼쪽. */
function eyeFrame(side, k = 1, squint = 1) {
  const u = dirOf(side * EYE.lon, EYE.lat);
  const pos = u.clone().multiply(HS).multiplyScalar(EYE.depth);
  const n = new THREE.Vector3(pos.x / HS.x ** 2, pos.y / HS.y ** 2, pos.z / HS.z ** 2).normalize();
  const quat = new THREE.Quaternion().setFromUnitVectors(ZA, n.lerp(ZA, EYE.fwd).normalize());
  const scale = new THREE.Vector3(EYE.rx * k, EYE.ry * k * squint, EYE.rz * k);
  return { pos, quat, scale, inv: quat.clone().invert() };
}

const footCache = new Map();
/** 눈알이 머리 표면을 뚫고 나오는 경계선(오른쪽 눈, [경도, 위도, 눈 둘레 각] 목록). 그 바깥으로 속눈썹 테를 칠한다. */
function eyeFootprint(k, squint) {
  const key = `${k.toFixed(3)}|${squint.toFixed(3)}`;
  if (footCache.has(key)) return footCache.get(key);
  const { pos, quat, scale } = eyeFrame(1, k, squint);
  const m = new THREE.Matrix4().compose(pos, quat, scale);
  const p = new THREE.Vector3();
  const outside = (a, psi) => {
    p.set(Math.sin(psi) * Math.cos(a), Math.sin(psi) * Math.sin(a), Math.cos(psi)).applyMatrix4(m);
    return (p.x / HS.x) ** 2 + (p.y / HS.y) ** 2 + (p.z / HS.z) ** 2 > 1;
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
  footCache.set(key, pts);
  return pts;
}

// ───────── 얼굴 그림 ─────────

const INK = '#2b1838';
const MOUTH_IN = '#6a1d3c';
const TONGUE = '#ff6f8c';
const MOUTH_LAT = -0.54;

/** sRGB 색 섞기 '#rrggbb' */
function mixHex(a, b, k) {
  const A = parseInt(a.slice(1), 16);
  const B = parseInt(b.slice(1), 16);
  const ch = (s) => Math.round(((A >> s) & 255) + (((B >> s) & 255) - ((A >> s) & 255)) * k);
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`;
}

/** 살갗 그라데이션(위도 → 색): 정수리 쪽은 조금 진하고 따뜻하게, 볼·턱은 밝고 발그레하게. */
function skinStops(skin) {
  const top = mixHex(mixHex(skin, '#b8583a', 0.16), '#000000', 0.04);
  const low = mixHex(mixHex(skin, '#fff0e6', 0.3), '#ff9c8c', 0.08);
  const chin = mixHex(skin, '#c8684a', 0.06);
  return [[Math.PI / 2, top], [0.75, top], [0.3, skin], [-0.25, low], [-0.8, low], [-Math.PI / 2, chin]];
}
function skinAt(stops, lat) {
  for (let i = 1; i < stops.length; i++) {
    const [l0, c0] = stops[i - 1];
    const [l1, c1] = stops[i];
    if (lat >= l1) return mixHex(c0, c1, smooth(clamp01((l0 - lat) / (l0 - l1))));
  }
  return stops[stops.length - 1][1];
}

/** 4갈래 반짝이(머리 표면 단위). */
function twinkle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r * 0.8, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r * 0.8, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

/** 콩 모양 눈썹(가운데가 도톰하고 끝이 둥글게 가늘어진다). */
function browShape(ctx, len, arch, thick) {
  ctx.beginPath();
  ctx.moveTo(-len / 2, 0);
  ctx.quadraticCurveTo(0, -arch * 2 - thick * 0.5, len / 2, 0);
  ctx.quadraticCurveTo(0, -arch * 2 + thick * 0.5, -len / 2, 0);
  ctx.closePath();
}

/** 벌린 입: path() 모양 안을 칠하고 혀·이 + 외곽선. */
function openMouth(ctx, path, { tongue = null, teeth = 0, teethBot = 0, lw = 0.036 }) {
  ctx.beginPath();
  path();
  ctx.closePath();
  ctx.fillStyle = MOUTH_IN;
  ctx.fill();
  ctx.save();
  ctx.clip();
  if (tongue) {
    ctx.fillStyle = TONGUE;
    ctx.beginPath();
    ctx.ellipse(tongue[0], tongue[1], tongue[2], tongue[3], 0, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  if (teeth) ctx.fillRect(-0.5, -0.5, 1, 0.5 + teeth);
  if (teethBot) ctx.fillRect(-0.5, teethBot, 1, 0.5);
  ctx.restore();
  ctx.lineWidth = lw;
  ctx.strokeStyle = INK;
  ctx.stroke();
}

function mouthShape(ctx, kind) {
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  if (kind === 'smile') {
    ctx.beginPath();
    ctx.moveTo(-0.13, -0.025);
    ctx.quadraticCurveTo(0, 0.085, 0.13, -0.025);
    ctx.lineWidth = 0.052;
    ctx.stroke();
  } else if (kind === 'flat') {
    ctx.beginPath();
    ctx.moveTo(-0.1, 0.01);
    ctx.bezierCurveTo(-0.04, -0.012, 0.04, 0.03, 0.1, 0.0);
    ctx.lineWidth = 0.05;
    ctx.stroke();
  } else if (kind === 'wobble') {
    ctx.beginPath();
    ctx.moveTo(-0.12, 0.02);
    ctx.bezierCurveTo(-0.07, -0.035, -0.03, -0.03, 0, 0.005);
    ctx.bezierCurveTo(0.03, 0.04, 0.07, 0.04, 0.12, -0.01);
    ctx.lineWidth = 0.048;
    ctx.stroke();
  } else if (kind === 'frown') {
    ctx.beginPath();
    ctx.moveTo(-0.11, 0.04);
    ctx.quadraticCurveTo(0, -0.04, 0.11, 0.04);
    ctx.lineWidth = 0.05;
    ctx.stroke();
  } else if (kind === 'smirk') {
    ctx.beginPath();
    ctx.moveTo(-0.11, 0.01);
    ctx.quadraticCurveTo(0.03, 0.07, 0.14, -0.05);
    ctx.lineWidth = 0.052;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0.12, -0.085);
    ctx.lineTo(0.165, -0.03);
    ctx.lineWidth = 0.034;
    ctx.stroke();
  } else if (kind === 'grin' || kind === 'happy') {
    const big = kind === 'happy';
    const w = big ? 0.2 : 0.15;
    const d = big ? 0.27 : 0.15;
    openMouth(
      ctx,
      () => {
        ctx.moveTo(-w, -0.03);
        ctx.quadraticCurveTo(0, big ? 0.0 : 0.005, w, -0.03);
        ctx.bezierCurveTo(w * 0.92, d * 0.82, -w * 0.92, d * 0.82, -w, -0.03);
      },
      { tongue: [0, d * 0.66, w * 0.62, d * 0.32], teeth: big ? -0.005 : 0, lw: 0.036 },
    );
  } else if (kind === 'o' || kind === 'gasp') {
    const k = kind === 'gasp' ? 1.45 : 1;
    openMouth(
      ctx,
      () => {
        ctx.ellipse(0, 0.03 * k, 0.068 * k, 0.088 * k, 0, 0, TAU);
      },
      { tongue: [0, 0.03 * k + 0.08 * k, 0.06 * k, 0.04 * k], lw: 0.034 },
    );
  } else if (kind === 'shout') {
    openMouth(
      ctx,
      () => {
        ctx.moveTo(-0.2, -0.06);
        ctx.quadraticCurveTo(0, -0.1, 0.2, -0.06);
        ctx.bezierCurveTo(0.22, 0.2, 0.1, 0.27, 0, 0.27);
        ctx.bezierCurveTo(-0.1, 0.27, -0.22, 0.2, -0.2, -0.06);
      },
      { tongue: [0, 0.23, 0.12, 0.08], teeth: -0.03, lw: 0.038 },
    );
  } else if (kind === 'grit') {
    openMouth(
      ctx,
      () => {
        ctx.roundRect(-0.16, -0.065, 0.32, 0.13, 0.055);
      },
      { teeth: 0.5, lw: 0.036 },
    );
    ctx.lineWidth = 0.018;
    ctx.beginPath();
    ctx.moveTo(-0.14, 0);
    ctx.lineTo(0.14, 0);
    for (const x of [-0.055, 0.055]) {
      ctx.moveTo(x, -0.06);
      ctx.lineTo(x, 0.06);
    }
    ctx.stroke();
  }
}

/** 그린 콧수염(코 바로 아래, 두 갈래가 바깥으로 처진다). */
function stacheShape(ctx, S) {
  const { w, h } = S;
  ctx.beginPath();
  for (const s of [-1, 1]) {
    ctx.moveTo(0, -h * 0.42);
    ctx.bezierCurveTo(s * w * 0.3, -h * 0.78, s * w * 0.82, -h * 0.52, s * w, h * 0.3);
    ctx.bezierCurveTo(s * w * 0.9, h * 0.58, s * w * 0.66, h * 0.36, s * w * 0.5, h * 0.3);
    ctx.bezierCurveTo(s * w * 0.32, h * 0.58, s * w * 0.1, h * 0.46, 0, h * 0.16);
  }
  const g = ctx.createLinearGradient(0, -h * 0.7, 0, h * 0.6);
  g.addColorStop(0, S.hi || tone(S.col, 0.28));
  g.addColorStop(0.45, S.col);
  g.addColorStop(1, S.lo || tone(S.col, -0.3));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 0.03;
  ctx.strokeStyle = S.edge || tone(S.col, -0.5);
  ctx.stroke();
  // 윗면 윤기
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 0.026;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * w * 0.18, -h * 0.4);
    ctx.quadraticCurveTo(s * w * 0.5, -h * 0.55, s * w * 0.72, -h * 0.2);
    ctx.stroke();
  }
}

/**
 * 얼굴(살갗 + 표정) 한 장. F = 인물 얼굴 설정, E = 표정(exprOf).
 */
function paintFace(ctx, F, E) {
  const s = TS;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const stops = skinStops(F.skin);
  for (let y = 0; y < s; y++) {
    const v = 1 - (y + 0.5) / s;
    ctx.fillStyle = skinAt(stops, v >= VTOP ? Math.PI / 2 : latOfV(v));
    ctx.fillRect(0, y, s, 1);
  }
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const ek = E.k * (F.ek || 1);
  const foot = eyeFootprint(ek, E.squint);
  let cy = 0;
  let top = -9;
  let bot = 9;
  for (const [, lat] of foot) {
    cy += lat / foot.length;
    top = Math.max(top, lat);
    bot = Math.min(bot, lat);
  }
  // 볼
  for (const side of [-1, 1]) {
    local(ctx, side * 0.6, -0.3);
    const r = 0.18 * (F.blushR || 1);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, `rgba(255,86,112,${0.75 * E.blush})`);
    g.addColorStop(0.55, `rgba(255,104,124,${0.42 * E.blush})`);
    g.addColorStop(1, 'rgba(255,120,130,0)');
    ctx.fillStyle = g;
    ctx.save();
    ctx.scale(1, 0.66);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  // 코끝 발그레(투영 UV 로 코에 그대로 칠해진다)
  {
    local(ctx, 0, NOSE_LAT - 0.02);
    const g = ctx.createRadialGradient(0.02, 0.02, 0, 0, 0, 0.16);
    g.addColorStop(0, `rgba(255,112,104,${0.42 * (F.noseRosy ?? 0.6)})`);
    g.addColorStop(1, 'rgba(255,120,110,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 0.16, 0, TAU);
    ctx.fill();
  }
  if (F.freckles) {
    ctx.fillStyle = 'rgba(184,92,52,0.85)';
    for (const side of [-1, 1]) {
      for (const [x, y] of [[0.47, -0.2], [0.58, -0.17], [0.53, -0.27], [0.66, -0.24], [0.42, -0.3]]) {
        local(ctx, side * x, y);
        ctx.beginPath();
        ctx.arc(0, 0, 0.024, 0, TAU);
        ctx.fill();
      }
    }
  }
  if (F.stubble) {
    // 까칠한 수염 자국: 턱 둘레 옅은 그늘 + 점
    local(ctx, 0, -0.68);
    const g = ctx.createRadialGradient(0, 0, 0.05, 0, 0, 0.62);
    g.addColorStop(0, 'rgba(96,70,84,0.3)');
    g.addColorStop(0.7, 'rgba(96,70,84,0.18)');
    g.addColorStop(1, 'rgba(96,70,84,0)');
    ctx.fillStyle = g;
    ctx.save();
    ctx.scale(1, 0.6);
    ctx.beginPath();
    ctx.arc(0, 0, 0.62, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'rgba(80,60,72,0.28)';
    for (let i = 0; i < 46; i++) {
      const a = (i * 2.399) % TAU;
      const r = 0.15 + ((i * 37) % 40) / 100;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r * 0.45 + 0.04;
      if (y < -0.05 && Math.abs(x) < 0.3) continue;
      ctx.beginPath();
      ctx.arc(x, y, 0.01, 0, TAU);
      ctx.fill();
    }
  }
  if (F.bags && !E.closed) {
    ctx.strokeStyle = 'rgba(122,72,142,0.5)';
    ctx.lineWidth = 0.04;
    for (const side of [-1, 1]) {
      local(ctx, side * (EYE.lon + 0.02), bot - 0.07);
      ctx.beginPath();
      ctx.moveTo(-0.13, -0.02);
      ctx.quadraticCurveTo(0, 0.06, 0.13, -0.02);
      ctx.stroke();
    }
  }
  // 눈 둘레: 뜬 눈은 속눈썹 테(위가 두툼, 바깥 끝이 살짝 삐침), 감은 눈은 선
  for (const side of [-1, 1]) {
    if (!E.closed) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = INK;
      ctx.beginPath();
      foot.forEach(([lon, lat, a], i) => {
        const up = Math.sin(a);
        const out = Math.cos(a);
        const t = 0.03 + (0.066 + (F.lid || 0)) * Math.max(0, up) ** 1.15 + 0.022 * Math.max(0, out * up);
        const x = TX(side * lon) + side * out * t * PXX;
        const y = TY(lat) - up * t * PXY;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fill();
      // 바깥 끝 속눈썹(여자아이들은 두 가닥)
      const flicks = F.lash ? [[0.06, 1], [0.17, 0.85]] : [[0.08, 0.8]];
      for (const [at, len] of flicks) {
        const [lon0, lat0] = foot[Math.round(48 * at)];
        local(ctx, side * lon0, lat0);
        ctx.scale(side, 1);
        ctx.beginPath();
        ctx.moveTo(-0.02, -0.04);
        ctx.quadraticCurveTo(0.05 * len, -0.035 * len, 0.095 * len, -0.1 * len);
        ctx.quadraticCurveTo(0.065 * len, -0.012, 0.0, 0.022);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      local(ctx, side * EYE.lon, cy);
      ctx.strokeStyle = INK;
      ctx.beginPath();
      const w = 0.2 * ek;
      if (E.closed === 'happy') {
        ctx.lineWidth = 0.07;
        ctx.moveTo(-w, 0.06);
        ctx.quadraticCurveTo(0, -0.21, w, 0.06);
      } else {
        ctx.lineWidth = 0.06;
        ctx.moveTo(-w, -0.01);
        ctx.quadraticCurveTo(0, 0.12, w, -0.01);
        ctx.moveTo(side * w, -0.01);
        ctx.lineTo(side * (w + 0.07), -0.07);
      }
      ctx.stroke();
    }
  }
  // 반짝이(방송인)
  if (F.sparkle && !E.closed) {
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    for (const side of [-1, 1]) {
      local(ctx, side * (EYE.lon + 0.29), top + 0.02);
      twinkle(ctx, 0, 0, 0.075);
      local(ctx, side * (EYE.lon + 0.36), top - 0.12);
      twinkle(ctx, 0, 0, 0.04);
    }
  }
  // 눈썹
  const [bh, tilt, arch, thick, len] = E.brow;
  for (const side of [-1, 1]) {
    const lift = side > 0 ? E.asym : 0;
    local(ctx, side * (EYE.lon + 0.02), top + 0.08 + bh + lift);
    ctx.rotate(side * (tilt - (side > 0 ? E.asym * 0.6 : 0)));
    browShape(ctx, len, arch, thick);
    if (F.browEdge) {
      ctx.strokeStyle = F.browEdge;
      ctx.lineWidth = thick * 0.9;
      ctx.stroke();
    }
    ctx.fillStyle = F.browCol;
    ctx.strokeStyle = F.browCol;
    ctx.lineWidth = thick * 0.5;
    ctx.fill();
    ctx.stroke();
  }
  // 입
  local(ctx, 0, MOUTH_LAT + (F.mouthDY || 0));
  mouthShape(ctx, E.mouth);
  // 콧수염(입 위에 덮는다)
  if (F.stache) {
    local(ctx, 0, F.stache.lat);
    stacheShape(ctx, F.stache);
  }
  // 땀방울(관자놀이)
  if (E.sweat) {
    local(ctx, -0.86, 0.22);
    ctx.beginPath();
    ctx.moveTo(0, -0.12);
    ctx.quadraticCurveTo(0.085, 0.02, 0, 0.065);
    ctx.quadraticCurveTo(-0.085, 0.02, 0, -0.12);
    ctx.fillStyle = '#a6e6ff';
    ctx.fill();
    ctx.lineWidth = 0.022;
    ctx.strokeStyle = '#2f62b8';
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-0.022, 0.01, 0.016, 0.028, 0.3, 0, TAU);
    ctx.fill();
  }
  // 기쁨의 눈물(눈꼬리 → 볼 아래로 두 줄기)
  if (E.tears) {
    for (const side of [-1, 1]) {
      local(ctx, side * (EYE.lon + 0.17), cy);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(side * 0.05, 0.12, side * 0.0, 0.25, side * 0.08, 0.42);
      ctx.strokeStyle = 'rgba(110,200,255,0.95)';
      ctx.lineWidth = 0.075;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 0.022;
      ctx.stroke();
    }
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

/**
 * 표정 ex 의 설정(인물 설정 F 바탕).
 *  n 보통(인물 성격), b 깜빡, l 올려다봄(경이: 눈썹 번쩍, 동그란 입), s 들킴(신나서 고함), h 손 인사(^^ + 활짝),
 *  w 손 인사 중 눈 맞춤, j 감격(눈물), g 깜짝(콩알 눈동자).
 * k: 눈 크기, squint: 눈 세로 배율, iris: 눈동자('n' 보통, 's' 작게, 't' 콩알), closed: 감은 눈 그림,
 * brow: [높이, 기울기(+ = 안쪽이 올라감), 아치, 두께, 길이]
 */
function exprOf(F, ex) {
  const b = F.brow;
  const E = { k: 1, squint: F.squint ?? 1, iris: F.irisK || 'n', closed: null, brow: b, asym: F.asym || 0, mouth: F.mouth || 'smile', blush: F.blush ?? 1, sweat: false, tears: false };
  if (ex === 'b') E.closed = 'blink';
  else if (ex === 'l') Object.assign(E, { k: 1.06, squint: lerp(E.squint, 1.02, 0.75), iris: 'n', brow: [b[0] + 0.08, b[1] * 0.25 + 0.2, b[2] + 0.035, b[3], b[4]], asym: E.asym * 0.5, mouth: F.lookMouth || 'o', sweat: !!F.sweat });
  else if (ex === 's') Object.assign(E, { k: 1.1, squint: 1.04, iris: 's', brow: [b[0] + 0.07, -0.2, 0.03, b[3] * 1.05, b[4]], asym: 0, mouth: F.shoutMouth || 'shout', sweat: !!F.sweat, blush: E.blush * 1.25 });
  else if (ex === 'h') Object.assign(E, { closed: 'happy', brow: [b[0] + 0.07, -0.05, b[2] + 0.04, b[3], b[4]], asym: 0, mouth: 'happy', blush: E.blush * 1.3 });
  else if (ex === 'w') Object.assign(E, { k: 1.05, squint: lerp(E.squint, 1.02, 0.8), iris: 'n', brow: [b[0] + 0.07, -0.05, b[2] + 0.04, b[3], b[4]], asym: 0, mouth: 'happy', blush: E.blush * 1.3 });
  else if (ex === 'j') Object.assign(E, { closed: 'happy', brow: [b[0] + 0.06, 0.3, b[2] + 0.02, b[3], b[4]], asym: 0, mouth: 'happy', tears: true, blush: E.blush * 1.4 });
  else if (ex === 'g') Object.assign(E, { k: 1.16, squint: 1.06, iris: 't', brow: [b[0] + 0.12, 0.18, b[2] + 0.05, b[3] * 0.9, b[4]], asym: 0, mouth: 'gasp' });
  return E;
}

const texCache = new Map();
/** 캔버스 그림 텍스처(캐시). */
function texOnce(key, size, draw, opts) {
  let t = texCache.get(key);
  if (!t) {
    t = canvasTexture(size, size, draw, opts);
    texCache.set(key, t);
  }
  return t;
}

const headMats = new Map();
/**
 * 인물 kind 의 표정 ex 살갗 재질(종류 × 표정마다 하나, 처음 쓸 때 그린다).
 * flip = 왼쪽을 보고 걸어 모델이 좌우로 뒤집혔을 때: 얼굴 그림도 좌우로 뒤집어(u → 1 − u) 두 번 뒤집힌 셈이 되게 한다.
 * 그래야 한쪽만 올라간 눈썹·비뚤어진 입꼬리가 걷는 방향과 상관없이 늘 같은 쪽에 있다.
 * 얼굴 펼침(uOf)이 u = 0.5 를 기준으로 대칭이라 가능하다. 뒤집힌 텍스처는 그림(source)을 함께 써서 GPU 메모리가 늘지 않는다.
 */
function headMat(kind, F, ex, flip = false) {
  const key = `${kind}|${ex}${flip ? '|f' : ''}`;
  let m = headMats.get(key);
  if (!m) {
    if (flip) {
      const base = headMat(kind, F, ex, false);
      const tex = base.map.clone();
      tex.repeat.x = -1;
      tex.offset.x = 1;
      // clone() 은 비닐 셰이더 보정(onBeforeCompile)을 옮기지 않으므로 같은 설정으로 새로 만든다
      m = vinylize(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.38, envMapIntensity: 0.75 }), 0.15);
      m.userData.E = base.userData.E;
    } else {
      const E = exprOf(F, ex);
      const tex = texOnce(`vface:${key}`, TS, (ctx) => paintFace(ctx, F, E));
      m = vinylize(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.38, envMapIntensity: 0.75 }), 0.15);
      m.userData.E = E;
    }
    headMats.set(key, m);
  }
  return m;
}

/** 흰자: 위쪽에 눈꺼풀 그늘이 살짝. */
function eyeWhiteTex() {
  return texOnce('vwhite', 64, (ctx, s) => {
    const g = ctx.createLinearGradient(0, 0, 0, s);
    g.addColorStop(0, '#c4bce8');
    g.addColorStop(0.16, '#dcd6f4');
    g.addColorStop(0.32, '#ffffff');
    g.addColorStop(1, '#ffffff');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  });
}

/** 눈동자 그림(색마다). kind: 'n' 보통(큰 눈동자), 's' 작게(긴장), 't' 콩알(깜짝). 위는 깊고 아래는 맑게. */
function irisTex(color, kind) {
  return texOnce(`viris:${color}:${kind}`, 128, (ctx, s) => {
    const c = s / 2;
    const R = { n: 0.5, s: 0.38, t: 0.19 }[kind] * s;
    const P = { n: 0.23, s: 0.15, t: 0.115 }[kind] * s;
    const g = ctx.createLinearGradient(0, c - R, 0, c + R);
    g.addColorStop(0, mixHex(color, '#120a2e', 0.62));
    g.addColorStop(0.42, color);
    g.addColorStop(0.85, mixHex(color, '#ffffff', 0.32));
    g.addColorStop(1, mixHex(color, '#ffffff', 0.55));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(c, c, R, 0, TAU);
    ctx.fill();
    const gl = ctx.createRadialGradient(c, c + R * 0.55, 0, c, c + R * 0.55, R * 0.62);
    gl.addColorStop(0, 'rgba(255,250,235,0.55)');
    gl.addColorStop(1, 'rgba(255,250,235,0)');
    ctx.fillStyle = gl;
    ctx.beginPath();
    ctx.arc(c, c, R, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#140b26';
    ctx.beginPath();
    ctx.arc(c, c - R * 0.04, P, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#140b26';
    ctx.lineWidth = s * 0.028;
    ctx.beginPath();
    ctx.arc(c, c, R - s * 0.013, 0, TAU);
    ctx.stroke();
  });
}

/** 반짝임 두 점(큰 것 왼쪽 위, 작은 것 오른쪽 아래). */
function glintTex() {
  return texOnce('vglint', 128, (ctx, s) => {
    const k = s / (2 * Math.sin(IRIS_CAP));
    const at = (x, y) => [s / 2 + x * k, s / 2 - y * k];
    ctx.fillStyle = '#ffffff';
    const [x1, y1] = at(-0.26, 0.3);
    ctx.beginPath();
    ctx.ellipse(x1, y1, 0.17 * k, 0.2 * k, -0.5, 0, TAU);
    ctx.fill();
    const [x2, y2] = at(0.28, -0.28);
    ctx.beginPath();
    ctx.arc(x2, y2, 0.085 * k, 0, TAU);
    ctx.fill();
  });
}

let eyeParts = null;
/** 눈 공유 부품: 눈동자·반짝임 껍데기, 흰자·반짝임 재질. */
function eyeShared() {
  if (eyeParts) return eyeParts;
  const capGeo = (radius) => {
    const geo = new THREE.SphereGeometry(radius, 24, 8, 0, TAU, 0, IRIS_CAP);
    geo.rotateX(Math.PI / 2);
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    const k = 1 / (2 * radius * Math.sin(IRIS_CAP));
    for (let i = 0; i < pos.count; i++) uv.setXY(i, 0.5 + pos.getX(i) * k, 0.5 + pos.getY(i) * k);
    geo.userData.shared = true;
    return geo;
  };
  eyeParts = {
    ball: sphereGeo(1, 24, 16),
    irisGeo: capGeo(1.012),
    glintGeo: capGeo(1.03),
    // 흰자는 빛을 받지 않는 납작한 흰색(하늘빛에 푸르스름해지지 않게). 빛 번짐 문턱(1.25) 아래로 조금 밝게.
    white: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.13, 1.13, 1.13), map: eyeWhiteTex() }),
    glint: new THREE.MeshBasicMaterial({ map: glintTex(), color: new THREE.Color(1.22, 1.22, 1.22), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    iris: new Map(),
  };
  return eyeParts;
}
/** 눈동자 재질(색 × 종류, 캐시). */
function irisMat(color, kind) {
  const S = eyeShared();
  const key = `${color}|${kind}`;
  let m = S.iris.get(key);
  if (!m) {
    const map = irisTex(color, kind);
    m = new THREE.MeshStandardMaterial({ map, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, roughness: 0.22, emissive: new THREE.Color('#ffffff'), emissiveMap: map, emissiveIntensity: 0.22 });
    S.iris.set(key, m);
  }
  return m;
}

// ───────── 머리카락 껍데기 ─────────

/**
 * 머리 구를 부풀린 껍데기를 덮을 곳만 남기고 나머지는 머리 속으로 집어넣은 매끈한 한 덩이(단위 구 공간 → HS 를 곱해 돌려준다).
 * s.cover(lon, lat, a) = 덮는 정도(+ 면 덮음, 경계 근처에서 매끄럽게 잘린다), s.r(lon, lat, a, y) = 바깥 반지름.
 * 색: 아래는 진하고 위는 밝게 + 비닐 머리의 윤기 띠 + 잘린 가장자리를 조금 어둡게.
 */
function shellGeo(s) {
  const g = new THREE.SphereGeometry(1, s.seg?.[0] || 76, s.seg?.[1] || 52);
  const p = g.attributes.position;
  const cols = new Float32Array(p.count * 3);
  const cover = new Float32Array(p.count);
  const base = new THREE.Color(s.col);
  const dark = new THREE.Color(tone(s.col, -(s.dark ?? 0.34)));
  const light = new THREE.Color(tone(s.col, s.light ?? 0.32));
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    _a.set(p.getX(i), p.getY(i), p.getZ(i)).normalize();
    const lon = Math.atan2(_a.x, _a.z);
    const lat = Math.asin(clamp(_a.y, -1, 1));
    const a = Math.abs(lon);
    const d = s.cover(lon, lat, a);
    const on = smooth(clamp01((d + 0.055) / (s.edge || 0.19)));
    const r = lerp(s.inner ?? 0.86, s.r(lon, lat, a, _a.y), on);
    cover[i] = on;
    p.setXYZ(i, _a.x * r, _a.y * r, _a.z * r);
    c.copy(dark).lerp(base, smooth(clamp01((_a.y + 0.75) / 1.05)));
    c.lerp(light, 0.45 * smooth(clamp01((_a.y - 0.35) / 0.55)));
    const band = Math.exp(-(((_a.y - (s.band ?? 0.62)) / 0.085) ** 2)) * smooth(clamp01((_a.z + 0.5) / 0.9));
    c.lerp(light, 0.55 * band);
    c.lerp(dark, 0.55 * (1 - on));
    if (s.line) c.lerp(dark, 0.7 * s.line(lon, lat, a));
    cols[i * 3] = c.r;
    cols[i * 3 + 1] = c.g;
    cols[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  // 머리 속에 완전히 묻힌 삼각형은 버린다(보이지 않는데 그리기만 비싸다)
  const idx = g.index.array;
  const keep = [];
  for (let i = 0; i < idx.length; i += 3) {
    if (cover[idx[i]] > 0.002 || cover[idx[i + 1]] > 0.002 || cover[idx[i + 2]] > 0.002) keep.push(idx[i], idx[i + 1], idx[i + 2]);
  }
  g.setIndex(keep);
  g.deleteAttribute('uv');
  g.deleteAttribute('normal');
  const m = mergeVertices(g, 1e-4);
  g.dispose();
  m.computeVertexNormals();
  m.scale(HS.x, HS.y, HS.z);
  m.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(m.attributes.position.count * 2), 2));
  return m;
}

/**
 * 머리 모양(머리선) 설정으로 껍데기 만들기.
 * h: { f 앞머리선 위도(가운데), ft 관자놀이로 갈수록 올라가는 양, fw 앞머리 폭(경도), part 가르마 경도, tufts [[경도, 깊이, 폭]],
 *      side 옆 머리선, back 뒤 머리선, crown 이 위도 위는 비움(대머리), t 두께, top 정수리 부풀림, flare 아래 퍼짐 }
 */
function hairGeo(h) {
  const fw = h.fw ?? 1.05;
  return shellGeo({
    col: h.col,
    band: h.band,
    light: h.light,
    dark: h.dark,
    // 가르마: 가르마 경도를 따라 정수리 쪽으로 가는 홈(조금 어둡게)
    line: h.partLine === undefined ? null : (lon, lat) => Math.max(0, 1 - Math.abs(lon - h.partLine) / 0.05) * smooth(clamp01((lat - h.f - 0.05) / 0.15)) * (1 - smooth(clamp01((lat - 1.2) / 0.2))),
    cover(lon, lat, a) {
      let front = h.f + (h.ft ?? 0.25) * Math.min(1, ((lon - (h.part || 0)) / fw) ** 2);
      if (h.tufts) {
        for (const [tl, dep, w] of h.tufts) {
          const k = 1 - ((lon - tl) / w) ** 2;
          if (k > 0) front -= dep * k * k;
        }
      }
      let H = lerp(front, h.side ?? -0.2, smooth(clamp01((a - fw * 0.75) / (Math.PI / 2 - fw * 0.75))));
      H = lerp(H, h.back ?? -0.45, smooth(clamp01((a - Math.PI / 2) / (Math.PI / 2))));
      let d = lat - H;
      if (h.crown !== undefined) d = Math.min(d, h.crown - lat);
      return d;
    },
    r(lon, lat, a, y) {
      const fl = (h.flare || 0) * smooth(clamp01((-lat - 0.1) / 0.8)) * smooth(clamp01((a - 0.45) / 1.0));
      return 1 + (h.t ?? 0.075) + (h.top || 0) * Math.max(0, y) ** 2 + fl;
    },
  });
}

// ───────── 몸 부품 ─────────

/** 팔(어깨 → 손, −y 방향). 반소매는 위만 옷색, 긴소매는 손목에 소매단. */
function armGeo(L) {
  const top = L.arm || L.top;
  const short = L.sleeve === 'short';
  const cuff = L.cuff || tone(top, -0.18);
  return cg(`varm|${top}|${short}|${L.skin}|${cuff}`, () => {
    const g = grad(top, -0.19, 0.03, 0.16, 0.1);
    const skin = grad(L.skin, -0.19, 0.0, 0.1, 0.06);
    const cf = col(cuff);
    return paint(place(capG(0.05, 0.205, 6, 14), [0, -0.085, 0]), (x, y) => (short ? (y > -0.06 ? g(x, y) : skin(x, y)) : y < -0.145 ? cf : g(x, y)));
  });
}

/** 벙어리장갑 같은 동그란 손(엄지가 앞 +z). point = 검지를 편 손(−y 로 뻗는다). */
const handGeo = (color, point = false) =>
  merged(`vhand|${color}|${point}`, () => {
    const g = grad(color, -0.07, 0.06, 0.14, 0.1);
    const parts = [paint(ell([0, -0.004, 0], [0.064, 0.068, 0.06], [0, 0, 0], [22, 16]), g), paint(ell([0, 0.016, 0.052], [0.026, 0.034, 0.026], [0.5, 0, 0], [12, 10]), g)];
    if (point) parts.push(paint(place(capG(0.024, 0.1, 2, 10), [0, -0.08, 0.016]), g));
    return parts;
  });

/** 다리 + 통통한 신발(또는 장화) 한 덩이. 다리 관절(엉덩이)이 원점. 밑창은 납작하고 진하다. */
function legGeo(L) {
  const key = `vleg|${L.legs}|${L.sock || ''}|${L.shoe}|${L.sole || ''}|${L.boot ? 1 : 0}|${L.trim || ''}`;
  return merged(key, () => {
    const pants = grad(L.legs, -0.15, 0.02, 0.2, 0.06);
    const sock = L.sock ? col(L.sock) : null;
    const shoeG = grad(L.shoe, FOOT_C - 0.04, FOOT_C + 0.06, 0.18, 0.16);
    const toe = col(tone(L.shoe, 0.2));
    const sole = col(L.sole || tone(L.shoe, -0.45));
    const trim = col(L.trim || tone(L.shoe, 0.25));
    const shoe = place(sphereGeo(1, 24, 18), [0, FOOT_C, 0.032], [0, 0, 0], [0.092, 0.074, 0.135]);
    const p = shoe.attributes.position;
    const n = shoe.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      if (p.getY(i) < SOLE_Y) {
        p.setY(i, SOLE_Y);
        n.setXYZ(i, 0, -1, 0);
      }
    }
    const shoeC = (x, y, z) => (y < SOLE_Y + 0.022 ? sole : z > 0.1 && y > FOOT_C - 0.03 ? _pc.copy(shoeG(x, y)).lerp(toe, 0.55) : shoeG(x, y));
    const parts = [paint(place(capG(0.064, 0.17, 4, 14), [0, -0.065, 0]), (x, y) => (sock && y < -0.095 ? sock : pants(x, y))), paint(shoe, shoeC)];
    if (L.boot) parts.push(paint(place(capG(0.078, 0.15, 4, 14), [0, -0.082, -0.004]), (x, y) => (y > -0.035 ? trim : shoeG(x, y))));
    return parts;
  });
}

// 몸통 옆모습(몸통 원점 = 엉덩이 높이). 아래가 넓은 통통한 콩 모양.
const BODY = [[0, -0.09], [0.104, -0.088], [0.152, -0.068], [0.168, -0.02], [0.165, 0.045], [0.152, 0.105], [0.128, 0.16], [0.092, 0.2], [0.048, 0.226], [0, 0.232]];
const bodyGeo = () => cg('vbody', () => place(lathe('vbody', BODY, { seg: 40, n: 30 }), [0, 0, 0], [0, 0, 0], [1, 1, 0.9]));
/** 몸통 반지름(앞판 만들 때 몸통에 붙이려고). */
function bodyR(y) {
  for (let i = 1; i < BODY.length; i++) {
    const [r0, y0] = BODY[i - 1];
    const [r1, y1] = BODY[i];
    if (y <= y1) return lerp(r0, r1, (y - y0) / (y1 - y0));
  }
  return 0;
}
/** 몸통 앞면의 점(앞판·단추 놓기). a = 가로 각(0 = 정면). */
const onBody = (y, a = 0, out = 0.008) => [Math.sin(a) * (bodyR(y) + out), y, Math.cos(a) * (bodyR(y) + out) * 0.9];

/** 몸통 앞에 붙는 판(앞치마·가슴받이·셔츠 앞섶). y0..y1 에서 가로 각이 w0 → w1 로 변한다(V 자 앞섶). */
function frontPanel(key, y0, y1, w0, w1 = w0, out = 0.008, flare = 0) {
  return cg(`vpanel:${key}`, () => {
    const rows = 12;
    const cols = 16;
    const pos = [];
    const uv = [];
    const idx = [];
    for (let i = 0; i <= rows; i++) {
      const k = i / rows;
      const y = lerp(y0, y1, k);
      const r = bodyR(y) + out + flare * (1 - k);
      const w = lerp(w0, w1, k);
      for (let j = 0; j <= cols; j++) {
        const a = lerp(-w / 2, w / 2, j / cols);
        pos.push(Math.sin(a) * r, y, Math.cos(a) * r * 0.9);
        uv.push(j / cols, k);
      }
    }
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const a = i * (cols + 1) + j;
        const b = a + cols + 1;
        idx.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  });
}

/** 어깨 덮개(소매 윗부분) 두 개. */
const shoulderCaps = (color, r = 0.072) => [-1, 1].map((s) => paint(ell([s * SHX, SHY - 0.006, 0], [r, r * 0.94, r], [0, 0, 0], [18, 12]), typeof color === 'string' ? grad(color, SHY - r, SHY + r, 0.12, 0.1) : color));

// ───────── 잠자리채 ─────────

let netMat = null;
function netMaterial() {
  if (netMat) return netMat;
  const tex = canvasTexture(
    128,
    128,
    (ctx, w) => {
      ctx.clearRect(0, 0, w, w);
      ctx.fillStyle = 'rgba(255,255,255,0.34)';
      ctx.fillRect(0, 0, w, w);
      ctx.strokeStyle = 'rgba(255,255,255,1)';
      ctx.lineWidth = 10;
      ctx.beginPath();
      for (let i = -w; i <= 2 * w; i += w / 2) {
        ctx.moveTo(i, 0);
        ctx.lineTo(i + w, w);
        ctx.moveTo(i, w);
        ctx.lineTo(i + w, 0);
      }
      ctx.stroke();
    },
    { repeat: [5, 3] },
  );
  netMat = new THREE.MeshStandardMaterial({ color: '#ffffff', map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false, roughness: 0.9 });
  return netMat;
}

const NET_HOOP_Y = 0.6;
/** 잠자리채(손잡이가 원점, +y 로 선다). 테는 xy 평면(앞 = +z)에 있고 그물 주머니는 뒤로 처진다. */
function makeNet() {
  const g = new THREE.Group();
  const frame = merged('vnetFrame', () => {
    const wood = grad('#c0864a', -0.05, 0.45, 0.18, 0.12);
    const tape = col('#ff5a4a');
    return [
      paint(place(cylGeo(0.021, 0.025, 0.5, 12), [0, 0.2, 0]), (x, y) => (y < 0.07 ? tape : wood(x, y))),
      paint(place(torusGeo(0.13, 0.024, 10, 40), [0, NET_HOOP_Y, 0], [0, 0, 0], [1, 1.18, 1]), grad('#ffcf3a', NET_HOOP_Y - 0.15, NET_HOOP_Y + 0.15, 0.2, 0.15)),
      paint(place(cylGeo(0.028, 0.028, 0.06, 12), [0, 0.45, 0]), '#ffcf3a'),
    ];
  });
  add(g, frame, VM(0.4), { outline: OLS });
  const bag = cg('vnetBag', () => {
    const geo = new THREE.LatheGeometry(
      new THREE.SplineCurve([[0.13, 0], [0.127, 0.06], [0.11, 0.13], [0.078, 0.19], [0.036, 0.225], [0, 0.235]].map(([r, y]) => new THREE.Vector2(r, y))).getPoints(14),
      24,
    );
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);
      p.setXYZ(i, x, z * 1.18 - y * 0.75, -y * 0.9);
    }
    geo.computeVertexNormals();
    return geo;
  });
  const b = add(g, bag, netMaterial(), { pos: [0, NET_HOOP_Y, 0], cast: false });
  b.renderOrder = 3;
  g.userData.bag = b;
  g.visible = false;
  return g;
}

// ───────── 사람 뼈대 ─────────

/**
 * 사람 한 명의 뼈대와 공통 부품(머리·눈·코·팔·손·다리·잠자리채). parent 에 붙인다.
 * 몸통 모양·머리카락·모자·소품은 종류마다 따로 붙인다.
 */
function buildPerson(parent, kind, L, { legs = true } = {}) {
  const F = L.face;
  const P = { kind, L, F, legs: [], arms: [], hands: [], items: {}, eyes: [], ex: '', E: null };
  P.base = new THREE.Group();
  parent.add(P.base);
  P.body = new THREE.Group();
  P.base.add(P.body);
  P.torso = new THREE.Group();
  P.torso.position.y = HIP;
  P.body.add(P.torso);
  P.neck = new THREE.Group();
  P.neck.position.y = NECK;
  P.neck.rotation.order = 'YXZ';
  P.torso.add(P.neck);
  P.head = new THREE.Group();
  P.head.position.y = HEAD_C;
  P.head.scale.setScalar(HR * (L.hs || 1));
  P.neck.add(P.head);
  const m0 = headMat(kind, F, 'n');
  P.skull = add(P.head, headGeo(L.ear ?? 1), m0, { scale: [HS.x, HS.y, HS.z], outline: OLH });
  P.nose = add(P.head, noseGeo(L.nose || 1), m0, { cast: false });
  const S = eyeShared();
  for (const side of [-1, 1]) {
    const holder = new THREE.Group();
    const ball = mesh(S.ball, S.white, { cast: false });
    const pivot = new THREE.Group();
    const iris = mesh(S.irisGeo, irisMat(F.iris, 'n'), { cast: false });
    iris.renderOrder = 1;
    pivot.add(iris);
    const glint = mesh(S.glintGeo, S.glint, { cast: false });
    glint.renderOrder = 2;
    holder.add(ball, pivot, glint);
    P.head.add(holder);
    P.eyes.push({ holder, pivot, iris, glint, side, frames: {}, fr: null });
  }
  const handC = L.glove || L.skin;
  P.handGeo = handGeo(handC);
  P.pointGeo = handGeo(handC, true);
  for (const s of [-1, 1]) {
    const sh = new THREE.Group();
    sh.position.set(s * SHX, SHY, 0);
    sh.userData.base = sh.position.clone();
    P.torso.add(sh);
    add(sh, armGeo(L), VM(0.52), { outline: OLS });
    P.arms.push(sh);
    P.hands.push(add(P.torso, P.handGeo, VM(0.42), { outline: OLS }));
  }
  if (legs) {
    for (const s of [-1, 1]) {
      const hip = new THREE.Group();
      hip.position.set(s * LEG_X, HIP, 0);
      P.body.add(hip);
      add(hip, legGeo(L), VM(0.48), { outline: OLS });
      P.legs.push(hip);
    }
  }
  P.net = makeNet();
  P.torso.add(P.net);
  setFace(P, 'n');
  return P;
}

/** 머리 장식(머리카락 + 모자 + 안경테 …)을 머리 묶음에 붙인다(정점 색 한 메시 + 외곽선). */
function headwear(P, key, make, { rough = 0.38, outline = OLH } = {}) {
  return add(P.head, merged(`vhw:${key}`, make), VM(rough), { outline });
}

/** 표정을 바꾼다(살갗 그림·눈 크기·눈동자 종류·감은 눈). 같은 표정·같은 방향이면 아무것도 하지 않는다. */
function setFace(P, ex, dir = 1) {
  const flip = dir < 0;
  const same = P.ex === ex;
  if (same && P.flipped === flip) return;
  P.ex = ex;
  P.flipped = flip;
  const m = headMat(P.kind, P.F, ex, flip);
  P.skull.material = m;
  P.nose.material = m;
  if (same) return; // 방향만 바뀌었다: 눈은 그대로
  const E = m.userData.E;
  P.E = E;
  const k = E.k * (P.F.ek || 1);
  const key = `${k}|${E.squint}`;
  for (const e of P.eyes) {
    let fr = e.frames[key];
    if (!fr) fr = e.frames[key] = eyeFrame(e.side, k, E.squint);
    e.fr = fr;
    e.holder.position.copy(fr.pos);
    e.holder.quaternion.copy(fr.quat);
    e.holder.scale.copy(fr.scale);
    e.holder.visible = !E.closed;
    e.iris.material = irisMat(P.F.iris, E.iris);
  }
}

/** 눈 안의 껍데기(눈동자·반짝임)를 머리 공간의 방향 d 로 돌린다(눈알 밖으로 나가지 않게 각을 묶는다). */
function aimCap(obj, d, fr, my, mp) {
  _a.copy(d).applyQuaternion(fr.inv);
  const yaw = clamp(Math.atan2(_a.x, Math.max(_a.z, 0.05)), -my, my);
  const pitch = clamp(Math.atan2(_a.y, Math.hypot(_a.x, _a.z)), -mp, mp);
  obj.rotation.set(-pitch, yaw, 0);
}

/**
 * 눈: 반짝임은 늘 화면 쪽(좌우로 뒤집혀도 큰 점이 왼쪽 위), 눈동자는 st.eyeT(월드 점)를, 없으면 걷는 쪽·가끔 화면을 본다.
 */
function aimEyes(P, st) {
  P.head.updateWorldMatrix(true, false);
  _hm.copy(P.head.matrixWorld).invert();
  _c.copy(CAM_DIR).transformDirection(_hm);
  if (P.E.closed) return;
  const tgt = st.eyeT;
  if (tgt) _d.copy(tgt).applyMatrix4(_hm);
  for (const e of P.eyes) {
    aimCap(e.glint, _c, e.fr, 0.45, 0.4);
    e.glint.scale.x = st.dir;
    if (tgt) _b.copy(_d).sub(e.holder.position).normalize();
    else _b.set(st.sac[0], st.sac[1] - 0.05, 1).normalize().lerp(_c, st.glance).normalize();
    aimCap(e.pivot, _b, e.fr, 0.5, 0.42);
  }
}

/** 뒤집힌 틀(flip) 기준 → 몸통 기준으로 바꾸는 회전(몸통 회전의 역). 결과는 _qi. */
function torsoInv(P) {
  _qi.copy(P.base.quaternion).multiply(P.body.quaternion).multiply(P.torso.quaternion);
  return _qi.invert();
}

/** 화면 평면(flip 기준)의 방향 (sx·sin h, cos h, fz) 로 어깨 i 에서 len 만큼 뻗은 점 → 손 목표 v. */
function armToward(P, i, h, len, fz, v) {
  const inv = torsoInv(P);
  const s = i ? 1 : -1;
  _c.set(s * Math.sin(h), Math.cos(h), fz).normalize().applyQuaternion(inv);
  const sh = P.arms[i].userData.base;
  return set3(v, sh.x + _c.x * len, sh.y + _c.y * len, sh.z + _c.z * len);
}

/** 팔을 손 목표점(몸통 기준)으로 뻗는다. 닿지 않으면 조금 늘이고(만화식), 그래도 모자라면 손이 그쪽으로 멈춘다. */
function reach(P, i, t, maxK = 1.4) {
  const sh = P.arms[i];
  _a.set(t[0], t[1], t[2]).sub(sh.position);
  const d = _a.length() || 1e-4;
  _a.divideScalar(d);
  sh.quaternion.setFromUnitVectors(DOWN, _a);
  const k = clamp(d / ARM, 0.7, maxK);
  sh.scale.set(1, k, 1);
  const h = P.hands[i];
  h.position.copy(sh.position).addScaledVector(_a, ARM * k);
  h.quaternion.copy(sh.quaternion);
  h.scale.setScalar(1);
}

/** 머리 기준 점(머리 반지름 1 단위) → 몸통 기준 점(지금 고개 각도로). */
function headToTorso(P, x, y, z, out) {
  P.neck.updateMatrix();
  P.head.updateMatrix();
  return out.set(x, y, z).applyMatrix4(P.head.matrix).applyMatrix4(P.neck.matrix);
}

/**
 * 하늘의 목표(기체)를 뒤집힌 틀(flip) 기준으로 본다. yaw = 카메라 쪽을 0 으로 한 좌우 각, elev = 올려다보는 각.
 */
function aimAt(root, flip, target, headY, out) {
  if (!target) {
    out.yaw = 0.35;
    out.elev = 1.0;
    return out;
  }
  flip.updateWorldMatrix(true, false);
  _b.copy(target);
  flip.worldToLocal(_b);
  const dx = _b.x;
  const dy = _b.y - headY;
  out.yaw = clamp(Math.atan2(dx, 1.5), -0.95, 0.95);
  out.elev = Math.atan2(dy, Math.abs(dx) * 0.8 + 0.35);
  return out;
}

/** 한 장면 상태(포즈 계산 중간값). 사람마다 하나를 두고 매 장면 다시 채운다. */
function poseState(p, R) {
  const st =
    R.st ||
    (R.st = {
      aim: { yaw: 0, elev: 0 },
      F: [0, 0, 0],
      B: [0, 0, 0],
      T: [0, 0, 0],
      sac: [0, 0],
      sw: { a: 0, h: 0, sq: 1, lean: 0, air: 0, hop: 0, v: 0, shout: false },
      sw2: { a: 0, h: 0, sq: 1, lean: 0, air: 0, hop: 0, v: 0, shout: false },
    });
  const t = p.t || 0;
  const shock = !!p.shock;
  const wave = !shock && !!p.wave;
  const look = shock || wave ? 0 : clamp01(p.look);
  st.t = t;
  st.dir = p.dir < 0 ? -1 : 1;
  st.walk = clamp01(p.walk);
  st.shock = shock;
  st.wave = wave;
  st.look = look;
  st.lk = smooth(look);
  st.ph = t * 9;
  st.point = 0;
  st.netB = false;
  st.maxF = 0;
  st.maxB = 0;
  st.face = null;
  st.idle = (1 - st.walk) * (1 - Math.max(st.lk, shock || wave ? 1 : 0));
  st.target = p.target || null;
  st.eyeT = st.target && (look > 0.3 || shock || wave) ? st.target : null;
  st.umb = clamp01(p.umbrella);
  st.flash = clamp01(p.flashlight);
  st.flashHand = 0;
  // 눈: 가끔 휙휙 바뀌는 시선(같은 시각이면 늘 같은 값) + 서 있을 때 가끔 화면(보는 사람)을 본다
  const seed = R.seed || 0;
  const step = Math.floor(t * 0.8 + seed * 3.1);
  st.sac[0] = (frac(Math.sin(step * 12.9898 + seed) * 43758.5453) - 0.5) * 0.5 + 0.15 * st.walk;
  st.sac[1] = (frac(Math.sin(step * 78.233 + seed) * 24634.6345) - 0.5) * 0.25;
  const gu = (t + seed * 2.3) % 7.3;
  st.glance = (1 - st.walk) * smooth(clamp01((gu - 4.4) / 0.25)) * smooth(clamp01((6.4 - gu) / 0.25));
  return st;
}

// ───────── 들킴: 잠자리채 퍼 올리기 ─────────
// 한 주기(약 0.85초): 웅크리며 채를 아래로 모았다가(예비 동작) → 뛰어오르며 휙 위로 퍼 올리고 → 머리 위로 넘어가 출렁 →
// 착지(찌그러짐)하며 되돌아온다. 각은 화면 평면에서 위 = 0, 기체 쪽(+x) = +.
const SW_REST = 0.55;
const SW_LOW = 2.3;
const SW_OVER = -0.3;
const SW_TOP = 0.12;

function swingAt(u, out) {
  let a;
  let h;
  let sq = 1;
  let lean = 0;
  if (u < 0.34) {
    const k = smooth(u / 0.34);
    a = lerp(SW_REST, SW_LOW, k);
    h = lerp(0.8, 1.45, k);
    sq = 1 - 0.11 * k;
    lean = -0.12 * k;
  } else if (u < 0.46) {
    const k = 1 - (1 - (u - 0.34) / 0.12) ** 3;
    a = lerp(SW_LOW, SW_OVER, k);
    h = lerp(1.45, 0.5, k);
    sq = lerp(0.89, 1.13, k);
    lean = lerp(-0.12, 0.13, k);
  } else if (u < 0.7) {
    const k = (u - 0.46) / 0.24;
    a = lerp(SW_OVER, SW_TOP, smooth(k)) + Math.sin(k * TAU) * 0.12 * (1 - k);
    h = lerp(0.5, 0.6, k);
    sq = lerp(1.13, 1, smooth(k));
    lean = 0.13 * (1 - smooth(k));
  } else {
    const k = smooth((u - 0.7) / 0.3);
    a = lerp(SW_TOP, SW_REST, k);
    h = lerp(0.6, 0.8, k);
  }
  const ak = (u - 0.37) / 0.35;
  const air = ak > 0 && ak < 1 ? Math.sin(ak * Math.PI) : 0;
  if (u >= 0.72 && u < 0.86) sq *= 1 - 0.11 * Math.sin(((u - 0.72) / 0.14) * Math.PI);
  out.a = a;
  out.h = h;
  out.sq = sq;
  out.lean = lean;
  out.air = air;
  out.hop = air * 0.12;
  out.shout = u < 0.5;
  return out;
}

/** 휘두르기 상태(st.sw: 기체 쪽 손, st.sw2: 반대 손 — 반 박자 늦게). 각속도 v 로 그물 주머니가 뒤처진다. */
function swingState(st, seed) {
  const u = frac(st.t * 1.18 + seed * 0.61);
  swingAt(frac(u - 0.025), st.sw2);
  const a0 = st.sw2.a;
  swingAt(u, st.sw);
  st.sw.v = (st.sw.a - a0) / 0.025;
  const u2 = frac(u + 0.45);
  swingAt(frac(u2 - 0.025), st.sw2);
  const b0 = st.sw2.a;
  swingAt(u2, st.sw2);
  st.sw2.v = (st.sw2.a - b0) / 0.025;
}

/** 감격(사냥꾼): 그물 대신 제자리에서 펄쩍펄쩍 뛰며 기체를 가리킨다. st.sw 를 휘두르기와 같은 꼴로 채운다. */
function celebrateState(st, seed) {
  const u = frac(st.t * 1.7 + seed * 0.37);
  const s = st.sw;
  const air = u < 0.62 ? Math.sin((u / 0.62) * Math.PI) : 0;
  s.air = air;
  s.hop = air * 0.16;
  s.sq = u < 0.62 ? 1 + air * 0.08 : 1 - 0.13 * Math.sin(((u - 0.62) / 0.38) * Math.PI);
  s.lean = 0.08 * air;
  s.shout = true;
  s.a = 0;
  s.v = 0;
  s.h = 0.6;
}

/** 잠자리채를 손 i 에 쥐고 화면 평면 각 a 로 세운다(손 0 이면 좌우 반대). */
function holdNet(P, net, i, a, v) {
  net.visible = true;
  net.position.copy(P.hands[i].position);
  const s = i ? 1 : -1;
  const inv = torsoInv(P);
  _q.setFromAxisAngle(ZA, -s * a);
  _q2.setFromAxisAngle(XA, -0.32);
  net.quaternion.copy(inv).multiply(_q).multiply(_q2);
  net.userData.bag.rotation.set(0, clamp(-v * 0.08, -0.9, 0.9) * s, 0);
}

/** 손 1(기체 쪽)로 기체 쪽 하늘을 가리킨다(머리 옆 바깥으로 쭉, 검지를 편다). */
function pointUp(P, st, k) {
  const el = clamp((st.aim.elev - 0.25) / 0.9, 0, 1);
  const h = lerp(0.95, 0.55, el);
  const jab = 1 + Math.sin(st.t * 7.5) * 0.05;
  armToward(P, 1, h, ARM * 1.4 * jab, 0.35, st.T);
  mix3(st.B, st.T[0], st.T[1], st.T[2], k);
  st.point = k;
}

/** 손 인사: 어깨를 조금 들고 손을 머리 옆 높이 바깥으로 쭉 올려 흔든다(만화처럼 팔이 늘어난다). */
function waveArm(P, st) {
  P.arms[1].position.y += 0.03;
  armToward(P, 1, 0.55 + Math.sin(st.t * 10) * 0.3, ARM * 2.05, 0.12, st.B);
  st.maxB = 2.15;
}

/** 가리키는 손(검지 편 손)으로 바꾸기. */
function placeFinger(P, st) {
  const g = (st.point || 0) > 0.5 ? P.pointGeo : P.handGeo;
  const h = P.hands[1];
  if (h.geometry !== g) {
    h.geometry = g;
    h.children[0].geometry = g;
  }
}

/** 표정 고르기. */
function blinkAt(t, seed, period = 3.7) {
  const u = (t + seed * 1.7) % period;
  return u < 0.12 || (frac(seed * 3.1) > 0.5 && u > 0.26 && u < 0.36);
}
function pickFace(P, st, seed) {
  let ex = st.face;
  if (!ex) {
    if (st.shock) ex = P.shockFace || 's';
    else if (st.wave) ex = (st.t + seed) % 4.2 > 2.6 ? 'w' : 'h';
    else if (st.look > 0.5) ex = blinkAt(st.t, seed, 4.6) ? 'b' : 'l';
    else ex = blinkAt(st.t, seed) ? 'b' : 'n';
  }
  setFace(P, ex, st.dir);
  aimEyes(P, st);
}

// ───────── 땅 위 사람 공통 동작 ─────────

/**
 * 걷기·숨쉬기·올려다보기·들킴·손 인사. 종류별 pose(P, st) 가 손 목표를 바꾸고, after(P, st) 가 소품을 놓는다.
 */
function updateGround(R, pose) {
  const P = R.P;
  const st = poseState(pose, R);
  const { t, walk, shock, wave, lk, idle } = st;
  const seed = R.seed;
  const D = R.def;
  if (D.step) st.ph = t * D.step;
  R.flip.scale.x = st.dir;
  aimAt(R.root, R.flip, pose.target, 0.64, st.aim);
  const foc = shock ? 0.8 : wave ? 0.6 : lk;
  const elev = clamp(st.aim.elev, 0.15, 1.25);
  const sw = Math.sin(st.ph);
  const bnc = Math.abs(sw);
  const br = Math.sin(t * 2.3 + seed * 5);
  const shift = Math.sin(t * 0.9 + seed * 3);
  if (shock) {
    if (D.celebrate) celebrateState(st, seed);
    else swingState(st, seed);
  }

  // 1) 바탕: 튀어 오르기·찌그러짐·화면 평면 기울기(발밑 기준)
  let by = 0;
  let sy = 1;
  let lean = shift * 0.028 * idle;
  if (walk > 0) {
    by += bnc * (shock ? 0.07 : 0.045) * walk;
    sy += (bnc - 0.45) * 0.1 * walk;
    lean -= (shock ? 0.1 : 0.05) * walk;
  }
  if (shock) {
    by += st.sw.hop * (1 - walk * 0.7);
    sy *= st.sw.sq;
    lean += st.sw.lean * (1 - walk * 0.5);
  } else if (lk > 0) {
    by += Math.abs(Math.sin(t * 6.2 + seed)) * 0.014 * lk;
    lean += (D.leanBack ?? 0.07) * lk * elev;
  } else if (wave) {
    const hop = Math.abs(Math.sin(t * 5));
    by += hop * 0.04;
    sy += (hop - 0.5) * 0.05;
  }
  sy += br * 0.01 * idle;
  P.base.position.set(shift * 0.01 * idle, by, 0);
  P.base.rotation.set(0, 0, lean);
  const sxz = 1 / Math.sqrt(sy);
  P.base.scale.set(sxz, sy, sxz);

  // 2) 몸 방향
  const bodyYaw = lerp(YAW, st.aim.yaw * 0.5 + 0.1, foc) + Math.sin(t * 0.45 + seed) * 0.1 * idle;
  P.body.rotation.set(0, bodyYaw, 0);

  // 3) 다리
  const L0 = P.legs[0].rotation;
  const L1 = P.legs[1].rotation;
  if (walk > 0) {
    const lph = shock ? t * 15 : st.ph;
    const amp = (shock ? 0.85 : 0.66) * walk;
    L0.set(Math.sin(lph) * amp, 0, -0.03);
    L1.set(-Math.sin(lph) * amp, 0, 0.03);
  } else if (shock) {
    const air = st.sw.air;
    L0.set(0.45 * air, 0, -0.06 - 0.1 * air);
    L1.set(-0.3 * air, 0, 0.06 + 0.1 * air);
  } else {
    // 한쪽 다리에 무게를 싣고 다른 쪽을 살짝 벌린다
    L0.set(0, 0, -0.05 - Math.max(0, shift) * 0.07 * idle);
    L1.set(0, 0, 0.05 + Math.max(0, -shift) * 0.07 * idle);
  }

  // 4) 몸통: 걸을 때 앞으로·좌우로 비틀고, 올려다볼 때 뒤로 젖힌다. 숨쉬면 가슴이 부푼다.
  P.torso.rotation.set((0.08 + (D.hunch || 0)) * walk - lk * elev * 0.1, -sw * 0.13 * walk, sw * 0.035 * walk);
  const bk = 1 - walk * 0.6;
  P.torso.scale.set(1 + br * 0.01 * bk, 1 + br * 0.02 * bk, 1 + br * 0.01 * bk);

  // 5) 고개: 기체 쪽으로 조금만 들고(얼굴이 보이게) 나머지는 눈이 올려다본다
  const yawRel = clamp(st.aim.yaw - bodyYaw, -0.75, 0.75) * foc * 0.7;
  const pitch = foc * elev * (shock ? 0.22 : (D.lookPitch ?? 0.3));
  const scan = (D.scan || 0) * walk * (1 - foc);
  const around = Math.sin(t * 0.55 + seed * 2) * 0.2 + Math.sin(t * 1.9 + seed) * 0.04;
  P.neck.rotation.set(
    -pitch + Math.sin(st.ph * 2 + 0.8) * 0.045 * walk + Math.sin(t * 1.3) * 0.03 * idle - (shock ? st.sw.lean * 0.5 : 0) - scan * (0.4 + Math.sin(t * 1.3) * 0.15),
    yawRel + around * idle + Math.sin(t * 2.1 + seed) * scan,
    Math.sin(t * 0.8 + seed) * 0.08 * idle + (shock ? Math.sin(t * 17) * 0.05 : 0) + lk * (0.12 + Math.sin(t * 2.1) * 0.03) + (wave ? Math.sin(t * 5) * 0.1 : 0),
  );

  // 6) 손 목표(몸통 기준). F = 카메라 쪽(손 0, 소품), B = 기체 쪽(손 1, 몸짓)
  for (const sh of P.arms) sh.position.copy(sh.userData.base);
  const ar = br * 0.006 * idle;
  set3(st.F, -0.205 - ar, 0.0 + ar + Math.max(0, sw) * 0.045 * walk, 0.035 + sw * 0.14 * walk);
  set3(st.B, 0.205 + ar, 0.0 + ar + Math.max(0, -sw) * 0.045 * walk, 0.035 - sw * 0.14 * walk);
  if (shock && D.celebrate) {
    pointUp(P, st, 1);
    armToward(P, 0, 0.35 + Math.abs(Math.sin(t * 5.3)) * 0.35, ARM * 1.3, 0.35, st.F);
  } else if (shock) {
    armToward(P, 1, st.sw.h, ARM * 1.3, 0.25, st.B);
    armToward(P, 0, 0.55 + Math.sin(t * 15) * 0.18, ARM * 1.2, 0.35, st.F);
  } else if (wave) {
    waveArm(P, st);
  } else if (lk > 0) {
    pointUp(P, st, lk);
    // 빈손: 가슴 앞에서 들뜬 주먹
    mix3(st.F, -0.16, 0.1 + Math.abs(Math.sin(t * 6.2 + seed)) * 0.02, 0.15, lk);
  }
  D.pose?.(P, st);
  extrasHands(P, st, D);
  reach(P, 0, st.F, st.maxF || 1.55);
  reach(P, 1, st.B, st.maxB || 1.7);
  placeFinger(P, st);
  if (wave) P.hands[1].scale.setScalar(1.18);
  // 잠자리채
  if (shock && !D.celebrate) holdNet(P, P.net, 1, st.sw.a, st.sw.v);
  else P.net.visible = false;
  if (P.net2) {
    if (shock && st.netB) holdNet(P, P.net2, 0, st.sw2.a, st.sw2.v);
    else P.net2.visible = false;
  }
  D.after?.(P, st);
  extrasPlace(P, st, D);
  pickFace(P, st, seed);
}

// ───────── 날씨 소품(우산·손전등) ─────────
// pose.umbrella(0..1): 비·폭풍 때 카메라 쪽 손으로 머리 위에 펴 든다(값만큼 커지며 나타난다). 올려다보면 뒤로 젖혀 얼굴을 드러낸다.
// pose.flashlight(0..1): 밤에 카메라 쪽 손(우산을 들었으면 기체 쪽 손)으로 기체를 비춘다. 렌즈 빛은 빛 번짐이 생기게 밝다.
// 그 손에 들던 소품(def.fprop)은 그동안 감춘다. 열기구·우주비행사에는 쓰지 않는다.

/** 종류별 우산 색(두 색 번갈아 8폭). */
const UMB = {
  farmer: ['#ff5a4a', '#fff6e6'],
  kid: ['#ff8fb8', '#fff6e6'],
  walker: ['#2fd0c0', '#a060f0'],
  camper: ['#ff9a3c', '#45b066'],
  fisher: ['#ffd23f', '#3a7ae8'],
  worker: ['#353a5e', '#5a6ab4'],
  streamer: ['#ff86b4', '#2fd0c0'],
  astronomer: ['#4a6ad0', '#ffd24a'],
  photographer: ['#ff5a4a', '#2fc0b0'],
  hunter: ['#6e7a44', '#d4aa66'],
};
const UMB_SHAFT = 0.86; // 천 가장자리 높이(원점) → 손잡이 끝

/** 우산(원점 = 천 가장자리 높이의 가운데, +y 위). 살 끝은 낮고 폭 사이는 살짝 올라간다. */
function umbrellaGeo(c1, c2) {
  return merged(`vumb|${c1}|${c2}`, () => {
    const canopy = lathe('vumbCanopy', [[0.0, 0.18], [0.13, 0.165], [0.26, 0.122], [0.37, 0.058], [0.44, 0.0]], { seg: 48, n: 10 }).clone();
    const p = canopy.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const z = p.getZ(i);
      const k = Math.hypot(x, z) / 0.44;
      p.setY(i, p.getY(i) + (1 - Math.abs(Math.cos(Math.atan2(z, x) * 4))) * 0.045 * k * k);
    }
    canopy.computeVertexNormals();
    const A = grad(c1, -0.02, 0.18, 0.18, 0.12);
    const B = grad(c2, -0.02, 0.18, 0.18, 0.12);
    const dark = '#3a3048';
    const parts = [
      paint(canopy, (x, y, z) => (Math.floor((Math.atan2(z, x) + Math.PI) / (Math.PI / 4)) % 2 ? A(x, y) : B(x, y))),
      paint(place(cylGeo(0.013, 0.013, UMB_SHAFT + 0.18, 8), [0, (0.18 - UMB_SHAFT) / 2, 0]), dark),
      paint(place(torusGeo(0.045, 0.017, 8, 14, Math.PI), [-0.045, -UMB_SHAFT, 0], [0, 0, Math.PI]), '#9a5a32'),
      paint(ell([0, 0.2, 0], [0.026, 0.03, 0.026]), c1),
    ];
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      parts.push(paint(ell([Math.cos(a) * 0.44, 0.0, Math.sin(a) * 0.44], [0.018, 0.018, 0.018]), c1));
    }
    return parts;
  });
}

/** 손전등(손잡이가 원점, +y 로 비춘다). 렌즈 면은 밝은 크림색(빛은 덧그린 빛 번짐 점이 낸다). */
const flashGeo = () =>
  merged('vflashlight', () => [
    paint(place(cylGeo(0.028, 0.028, 0.14, 14), [0, 0.03, 0]), (x, y) => (y < 0.02 ? col('#2a2a3a') : col('#ffcf2e'))),
    paint(place(cylGeo(0.046, 0.03, 0.065, 16), [0, 0.13, 0]), '#ffcf2e'),
    paint(place(cylGeo(0.04, 0.04, 0.008, 16), [0, 0.165, 0]), new THREE.Color(2.4, 2.3, 1.8)),
    paint(place(roundBoxGeo(0.016, 0.032, 0.014, 0.006, 1), [0, 0.05, 0.028]), '#ff4a3c'),
  ]);

/** 우산·손전등을 미리 만들어 감춰 둔다(값이 0 이면 아무 비용도 없다). */
function buildExtras(P, kind) {
  const [c1, c2] = UMB[kind] || UMB.farmer;
  P.umb = new THREE.Group();
  P.umb.visible = false;
  P.torso.add(P.umb);
  add(P.umb, umbrellaGeo(c1, c2), VM(0.4, { side: THREE.DoubleSide }), { outline: OLS });
  P.flash = new THREE.Group();
  P.flash.visible = false;
  P.torso.add(P.flash);
  add(P.flash, flashGeo(), VM(0.35));
  P.flashGlow = glowSprite('#fff0b8', 0.3, 0);
  P.flashGlow.position.set(0, 0.19, 0);
  P.flash.add(P.flashGlow);
}

/** 우산·손전등이 쓰는 손 목표(reach 전에). */
function extrasHands(P, st, D) {
  const u = st.umb;
  const f = st.flash;
  st.flashHand = u > 0.5 ? 1 : 0;
  if (u > 0) {
    const k = smooth(clamp01(u * 1.6));
    mix3(st.F, -0.24, 0.17 + Math.max(0, D.umbY - 0.4) + (st.shock ? Math.sin(st.t * 15) * 0.03 : 0), 0.1, k);
  }
  if (f > 0) {
    if (st.flashHand) {
      if (st.point < 0.5) mix3(st.B, 0.27, 0.08, 0.15, f);
      if (f > 0.5) st.point = 0;
    } else mix3(st.F, -0.28, 0.05 + Math.abs(Math.sin(st.ph)) * 0.02 * st.walk, 0.15, f);
  }
  const busy = u > 0.5 || (f > 0.5 && !st.flashHand);
  const it = D.fprop && P.items[D.fprop];
  if (it) it.visible = !busy;
}

/** 우산·손전등 놓기(reach 뒤에). */
function extrasPlace(P, st, D) {
  const u = st.umb;
  P.umb.visible = u > 0.01;
  if (P.umb.visible) {
    const k = smooth(clamp01(u * 1.4));
    // 천 가운데 = 머리(모자) 위. 올려다보면 뒤로 젖혀 얼굴이 보이게
    const lb = smooth(clamp01((st.look - 0.3) / 0.4));
    headToTorso(P, -0.15 + Math.sin(st.t * 2.3) * 0.07, (D.umbY - 0.1 * lb) / HR, (-0.34 * lb) / HR, _c);
    const h = P.hands[0].position;
    _a.copy(_c).sub(h);
    _b.copy(_a).normalize();
    P.umb.quaternion.setFromUnitVectors(UP, _b);
    P.umb.position.copy(h).addScaledVector(_a, k);
    P.umb.scale.setScalar(Math.max(0.001, k * (1 + Math.sin(k * Math.PI) * 0.12)));
  }
  const f = st.flash;
  P.flash.visible = f > 0.01;
  if (P.flash.visible) {
    const hand = P.hands[st.flashHand].position;
    P.flash.position.copy(hand);
    if (st.target) {
      P.torso.updateWorldMatrix(true, false);
      _b.copy(st.target);
      P.torso.worldToLocal(_b);
      _b.sub(hand).normalize();
    } else _b.set(0.3, 1, 0.4).normalize();
    // 올려다보기 전에는 하늘을 이리저리 훑는다
    const sweep = (1 - st.lk) * (1 - (st.shock ? 1 : 0)) * 0.35;
    _b.x += Math.sin(st.t * 1.3) * sweep;
    _b.z += Math.cos(st.t * 1.1) * sweep * 0.5;
    _b.normalize();
    P.flash.quaternion.setFromUnitVectors(UP, _b);
    P.flash.scale.setScalar(Math.max(0.001, smooth(f) * 1.25));
    P.flashGlow.material.opacity = 0.75 * f;
  }
}

// ───────── 종류별 생김새 ─────────
// 머리 장식(머리카락·모자)은 머리 반지름 1 단위. K0 = 예전(머리 반지름 0.24) 단위로 만든 모자 도형을 옮겨 오는 배율.
const K0 = 1 / 0.24;
/** 예전 단위 도형을 머리 단위로 옮기고 묶음 기울기(rot)를 준다. */
const HU = [K0 * 1.07, K0 * 1.01, K0 * 1.05]; // 머리가 예전보다 조금 넓적해서 모자도 그만큼 키운다
const hu = (g, rot = [0, 0, 0], pos = [0, 0, 0]) => place(g, pos, rot, HU);
/** 머리카락 색 칠하기(위 밝게). hairPaint = 예전 단위 도형, hairPaintH = 머리 단위 도형. */
const hairPaint = (hex) => grad(hex, -0.24, 0.27, 0.3, 0.28);
const hairPaintH = (hex) => grad(hex, -1.0, 1.1, 0.3, 0.28);

/** 보푸라기 고리(털 깃·털 장식): 토러스를 몽글몽글하게. */
function fluffyRing(key, R0, tube, bumps = 13) {
  return cg(`vfluff:${key}`, () => {
    const g = new THREE.TorusGeometry(R0, tube, 12, 48);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);
      const u = Math.atan2(y, x);
      const cx = Math.cos(u) * R0;
      const cy = Math.sin(u) * R0;
      const k = 1 + 0.18 * Math.max(0, Math.cos(u * bumps)) ** 0.6;
      p.setXYZ(i, cx + (x - cx) * k, cy + (y - cy) * k, z * k);
    }
    g.computeVertexNormals();
    return g;
  });
}

/** 밀짚모자(챙 끝이 살짝 물결). 예전 단위. */
function strawGeo() {
  return cg('vstraw', () => {
    const g = lathe('vstrawL', [[0, 0.315], [0.1, 0.31], [0.165, 0.29], [0.188, 0.235], [0.194, 0.16], [0.2, 0.122], [0.27, 0.114], [0.35, 0.1], [0.405, 0.082], [0.404, 0.064], [0.35, 0.07], [0.27, 0.087], [0.2, 0.1], [0.0, 0.102]], { seg: 56, n: 34 }).clone();
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const z = p.getZ(i);
      const r = Math.hypot(x, z);
      if (r > 0.28) p.setY(i, p.getY(i) + 0.012 * Math.sin(Math.atan2(z, x) * 7) * ((r - 0.28) / 0.12));
    }
    g.computeVertexNormals();
    return g;
  });
}

/** 보닛 얼굴 둘레의 물결 주름(예전 단위). */
function ruffleGeo() {
  return cg('vruffle', () => {
    const R0 = 0.236 * 1.05;
    const arc = 3.9;
    const g = new THREE.TorusGeometry(R0, 0.038, 10, 72, arc);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);
      const u = Math.atan2(y, x);
      const cx = Math.cos(u) * R0;
      const cy = Math.sin(u) * R0;
      const k = 1 + 0.26 * Math.sin(u * 16);
      p.setXYZ(i, cx + (x - cx) * k * 1.25, cy + (y - cy) * k * 1.25, z * k * 0.8);
    }
    g.computeVertexNormals();
    const n = new THREE.Vector3(0, 0.055, -0.075).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
    const qz = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI / 2 - arc / 2);
    const v = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
    const twist = Math.atan2(v.y, v.x);
    const qt = new THREE.Quaternion().setFromAxisAngle(n, -twist);
    g.applyMatrix4(new THREE.Matrix4().compose(n.clone().multiplyScalar(-0.035), qt.multiply(q).multiply(qz), new THREE.Vector3(1, 1, 1)));
    return g;
  });
}

/** 가슴의 별 무늬(납작한 별). */
function starGeo() {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.024 : 0.054;
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 2 });
}

/** 구겨진 은박 고깔(머리 단위, 위 = +y). 면마다 따로 반짝이게 평면 법선. */
function foilGeo() {
  return cg('vfoilHat', () => {
    const hash = (x, y, z) => {
      const v = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
      return v - Math.floor(v);
    };
    const cone = lathe('vfoilCone', [[0, 0.44], [0.04, 0.42], [0.1, 0.34], [0.165, 0.24], [0.22, 0.15], [0.262, 0.1], [0.292, 0.072], [0.27, 0.052], [0.0, 0.08]], { seg: 22, n: 11 }).clone();
    const p = cone.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);
      const n = hash(Math.round(x * 200), Math.round(y * 200), Math.round(z * 200)) - 0.5;
      const k = 1 + n * 0.16;
      p.setXYZ(i, x * k, y + n * 0.02, z * k);
    }
    const flat = cone.toNonIndexed();
    flat.computeVertexNormals();
    const silver = col('#f6f6fa');
    const shade = col('#9a9fb4');
    const parts = prep([
      paint(flat, (x, y, z) => _pc.copy(shade).lerp(silver, hash(Math.round(x * 60), Math.round(y * 60), Math.round(z * 60)) * 0.7 + 0.3)),
      paint(rodGeo([0, 0.42, 0], [0.03, 0.56, 0.0], 0.01, 0.008), '#c3cbe6'),
      paint(ell([0.032, 0.585, 0], [0.036, 0.036, 0.036]), '#ff3b4a'),
    ]);
    const g = mergeGeometries(parts, false);
    g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(0, 0.2, -0.04), new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.14, 0, 0.14)), new THREE.Vector3(...HU.map((v) => v * 0.94))));
    return g;
  });
}

/** 레이더 접시(오목한 그릇 + 수신 뿔). 원점 = 접시 아래 가운데, 오목면이 +y. */
const dishGeo = () =>
  merged('vradarDish', () => [
    paint(lathe('vdish', [[0.0, -0.012], [0.05, -0.006], [0.1, 0.02], [0.13, 0.052]], { seg: 28, n: 8 }), grad('#eef0f8', -0.01, 0.05, 0.18, 0.06)),
    paint(rodGeo([0, -0.01, 0], [0, 0.08, 0], 0.007), '#8a919f'),
    paint(ell([0, 0.088, 0], [0.02, 0.02, 0.02]), '#ff4a3c'),
  ]);

/** 큰 쌍안경(가운데가 원점, 대물렌즈가 +z). */
const binoGeo = () =>
  merged('vbinoculars', () => {
    const body = grad('#3a4a40', -0.05, 0.05, 0.2, 0.18);
    const parts = [paint(place(roundBoxGeo(0.06, 0.04, 0.07, 0.014, 2)), '#24302a')];
    for (const sx of [-1, 1]) {
      parts.push(paint(place(cylGeo(0.044, 0.044, 0.13, 16), [sx * 0.052, 0, 0], [Math.PI / 2, 0, 0]), body));
      parts.push(paint(place(cylGeo(0.052, 0.052, 0.032, 18), [sx * 0.052, 0, 0.066], [Math.PI / 2, 0, 0]), '#d6aa4a'));
      parts.push(paint(place(cylGeo(0.028, 0.034, 0.035, 12), [sx * 0.052, 0, -0.078], [Math.PI / 2, 0, 0]), '#1a201c'));
      parts.push(paint(place(cylGeo(0.042, 0.042, 0.006, 16), [sx * 0.052, 0, 0.083], [Math.PI / 2, 0, 0]), '#9feeff'));
    }
    return parts;
  });

const DEFS = {
  // 농부: 큰 밀짚모자(빨간 띠)·무성한 콧수염·딸기코·크림 셔츠·파란 멜빵바지·빨간 목수건·갈색 장화·쇠스랑. 고집 세지만 마음 좋은 아저씨.
  farmer: {
    fprop: 'fork',
    umbY: 0.42,
    L: {
      skin: '#f2b08a',
      top: '#fbf1de',
      sleeve: 'short',
      legs: '#4a78d8',
      shoe: '#8a5230',
      sole: '#3e2416',
      boot: true,
      trim: '#d8a464',
      nose: 1.12,
      face: { skin: '#f2b08a', iris: '#8a5426', brow: [0.0, -0.1, 0.02, 0.12, 0.27], browCol: '#5a3018', mouth: 'smile', mouthDY: -0.04, blush: 0.95, noseRosy: 0.85, stache: { col: '#6e3e20', w: 0.42, h: 0.18, lat: -0.39 } },
    },
    build(P) {
      const denim = '#4a78d8';
      const shirt = '#fbf1de';
      const gD = grad(denim, -0.09, 0.17, 0.24, 0.1);
      const gS = grad(shirt, 0.04, 0.24, 0.14, 0.04);
      add(
        P.torso,
        merged('vfarmerBody', () => [
          paint(bodyGeo(), (x, y) => (y < 0.055 ? gD(x, y) : gS(x, y))),
          ...shoulderCaps(shirt),
          paint(rodGeo([-0.066, 0.16, 0.112], [-0.106, 0.218, 0.0], 0.021), denim),
          paint(rodGeo([0.066, 0.16, 0.112], [0.106, 0.218, 0.0], 0.021), denim),
          // 빨간 목수건(매듭 + 세모)
          paint(place(torusGeo(0.088, 0.03, 10, 28), [0, 0.214, 0.006], [Math.PI / 2 + 0.2, 0, 0]), grad('#ff4a3c', 0.18, 0.24, 0.2, 0.1)),
          paint(place(coneGeo(0.06, 0.09, 4), [0, 0.165, 0.105], [Math.PI, Math.PI / 4, 0.2], [1, 1, 0.35]), '#e8382e'),
        ]),
        VM(0.55),
        { outline: OL },
      );
      add(
        P.torso,
        merged('vfarmerDetail', () => [
          paint(frontPanel('vbib', 0.02, 0.165, 1.02, 0.98, 0.016), gD),
          paint(ell(onBody(0.152, -0.47, 0.03), [0.024, 0.024, 0.016]), '#ffd23f'),
          paint(ell(onBody(0.152, 0.47, 0.03), [0.024, 0.024, 0.016]), '#ffd23f'),
          paint(place(roundBoxGeo(0.1, 0.07, 0.02, 0.012, 2), onBody(0.085, 0, 0.02)), tone(denim, -0.16)),
        ]),
        VM(0.4),
      );
      const straw = grad('#f8d070', 0.06, 0.31, 0.16, 0.12);
      const under = col('#d29a48');
      headwear(P, 'farmer', () => [
        hairGeo({ col: '#6e4024', f: 0.72, ft: 0.1, fw: 1.0, side: -0.48, back: -0.52, crown: 0.45, t: 0.07 }),
        hu(paint(strawGeo(), (x, y, z, ny) => (ny < -0.3 ? under : straw(x, y))), [-0.2, 0, 0.08]),
        hu(paint(lathe('vstrawBand', [[0.198, 0.118], [0.206, 0.126], [0.2, 0.176], [0.19, 0.182]], { seg: 48, smoothIt: false }), grad('#ff4a3c', 0.12, 0.18, 0.18, 0.1)), [-0.2, 0, 0.08]),
      ]);
      // 쇠스랑(나무 자루 + 둥근 끝 쇠갈퀴 셋)
      const fork = new THREE.Group();
      add(
        fork,
        merged('vfork', () => {
          const steel = grad('#c9d2ee', 0.62, 0.9, 0.2, 0.2);
          const parts = [
            paint(place(cylGeo(0.02, 0.02, 0.86, 10), [0, 0.22, 0]), grad('#c88e52', -0.2, 0.65, 0.22, 0.12)),
            paint(place(cylGeo(0.03, 0.024, 0.06, 12), [0, 0.65, 0]), '#8a919f'),
            paint(rodGeo([-0.082, 0.68, 0], [0.082, 0.68, 0], 0.016), steel),
          ];
          for (const x of [-0.082, 0, 0.082]) {
            parts.push(paint(rodGeo([x, 0.675, 0], [x * 1.05, 0.86, 0], 0.016, 0.012), steel));
            parts.push(paint(ell([x * 1.05, 0.865, 0], [0.016, 0.016, 0.016]), steel));
          }
          return parts;
        }),
        VM(0.38),
        { outline: OLS },
      );
      P.torso.add(fork);
      P.items.fork = fork;
    },
    pose(P, st) {
      // 쇠스랑은 얼굴을 가리지 않게 몸 바깥쪽에 세운다
      if (!st.shock) set3(st.F, lerp(-0.24, st.F[0] - 0.03, st.walk), lerp(0.03, st.F[1], st.walk), lerp(0.08, st.F[2], st.walk));
    },
    after(P, st) {
      const f = P.items.fork;
      f.position.copy(P.hands[0].position);
      if (st.shock) f.rotation.set(0.25, 0, 0.35 + Math.sin(st.t * 15) * 0.15);
      else f.rotation.set(0.06 + Math.sin(st.ph) * 0.14 * st.walk, 0, 0.2);
    },
  },

  // 아이: 흰 보닛(빨간 리본)·땋은 머리·빨간 원피스·흰 앞치마·막대사탕. 들키면 잠자리채 두 개를 휘두르는 개구쟁이.
  kid: {
    fprop: 'lolly',
    umbY: 0.4,
    L: {
      hs: 1.1,
      skin: '#f9c6a2',
      top: '#e8465e',
      sleeve: 'short',
      legs: '#f6c09c',
      sock: '#fbf6ee',
      shoe: '#d02a4a',
      sole: '#5a1424',
      nose: 0.8,
      face: { skin: '#f9c6a2', iris: '#3f86ee', ek: 1.12, lash: true, brow: [0.04, 0.14, 0.05, 0.052, 0.15], browCol: '#8a4c2c', mouth: 'grin', blush: 1.3, noseRosy: 0.8 },
    },
    build(P) {
      const red = '#e8465e';
      const white = '#fdf8f0';
      const gR = grad(red, -0.11, 0.2, 0.24, 0.1);
      const W = col(white);
      add(
        P.torso,
        merged('vdress', () => [
          paint(
            place(lathe('vdressL', [[0, -0.112], [0.198, -0.11], [0.222, -0.094], [0.206, -0.035], [0.176, 0.035], [0.152, 0.1], [0.134, 0.15], [0.106, 0.195], [0.072, 0.222], [0.036, 0.236], [0, 0.238]], { seg: 44, n: 32 }), [0, 0, 0], [0, 0, 0], [1, 1, 0.92]),
            (x, y) => (y < -0.088 ? W : gR(x, y)),
          ),
          ...[-1, 1].map((s) => paint(ell([s * SHX, SHY - 0.004, 0], [0.084, 0.078, 0.084]), (x, y) => (y < SHY - 0.052 ? W : gR(x, y)))),
          paint(place(lathe('vapronSkirt', [[0.228, -0.094], [0.218, -0.03], [0.188, 0.03], [0.164, 0.075]], { seg: 18, phiStart: -0.72, phiLength: 1.44, n: 10 }), [0, 0, 0], [0, 0, 0], [1, 1, 0.92]), grad(white, -0.09, 0.08, 0.12, 0.02)),
          paint(ell([-0.05, 0.212, 0.072], [0.064, 0.024, 0.05], [0.35, 0.45, 0.35]), white),
          paint(ell([0.05, 0.212, 0.072], [0.064, 0.024, 0.05], [0.35, -0.45, -0.35]), white),
        ]),
        VM(0.52),
        { outline: OL },
      );
      add(P.torso, merged('vkidApron', () => [paint(frontPanel('vapronBib', 0.06, 0.2, 0.95, 0.82, 0.02), white), paint(place(roundBoxGeo(0.07, 0.05, 0.016, 0.014, 2), [0.05, -0.03, 0.198], [0.1, 0.25, 0]), '#ff8fb8')]), VM(0.45));
      const hair = hairPaint('#8a5230');
      const bh = grad('#9a5c34', -0.3, -0.08, 0.2, 0.16);
      const gW = grad('#fffaf0', -0.1, 0.3, 0.1, 0.02);
      headwear(P, 'kid', () => {
        const parts = [hairGeo({ col: '#8a5230', f: 0.66, ft: 0.1, side: -0.38, back: -0.5, crown: 0.62, t: 0.07 })];
        for (const s of [-1, 1]) {
          parts.push(hu(paint(ell([s * 0.222, -0.12, -0.05], [0.058, 0.06, 0.058], [0, 0, 0], [18, 12]), bh)));
          parts.push(hu(paint(ell([s * 0.256, -0.18, -0.06], [0.05, 0.054, 0.05], [0, 0, 0], [18, 12]), bh)));
          parts.push(hu(paint(ell([s * 0.28, -0.234, -0.065], [0.043, 0.046, 0.043], [0, 0, 0], [16, 10]), bh)));
          parts.push(hu(paint(ell([s * 0.298, -0.276, -0.065], [0.044, 0.028, 0.032], [0, 0, s * 0.5], [14, 8]), '#ff3e52')));
        }
        // 보닛 + 얼굴 둘레 주름 + 큰 리본
        parts.push(hu(paint(ell([0, 0.06, -0.08], [0.272, 0.268, 0.266], [0, 0, 0], [32, 22]), gW)));
        parts.push(hu(paint(ruffleGeo(), gW)));
        for (const s of [-1, 1]) parts.push(hu(paint(place(ell([s * 0.07, 0, 0], [0.078, 0.05, 0.03], [0, 0, s * 0.45], [16, 10]), [-0.15, 0.2, 0.1], [-0.5, -0.6, 0.45], 1.35), grad('#ff4a5a', 0.12, 0.28, 0.2, 0.12))));
        parts.push(hu(paint(place(ell([0, 0, 0.006], [0.032, 0.032, 0.03], [0, 0, 0], [12, 8]), [-0.15, 0.2, 0.1], [-0.5, -0.6, 0.45], 1.35), '#e0303c')));
        return parts;
      });
      // 막대사탕(카메라 쪽 손): 소용돌이 사탕 + 흰 막대 한 덩이
      const lolly = new THREE.Group();
      add(
        lolly,
        merged('vlolly', () => {
          const pink = col('#ff4f8a');
          const cream = col('#fff4f8');
          return [
            paint(place(cylGeo(0.01, 0.01, 0.2, 8), [0, 0.07, 0]), '#fbf6ee'),
            paint(ell([0, 0.2, 0], [0.078, 0.078, 0.032], [0, 0, 0], [32, 18]), (x, y) => {
              const dx = x;
              const dy = y - 0.2;
              const r = Math.hypot(dx, dy);
              return frac(Math.atan2(dy, dx) / TAU + r * 14) < 0.5 ? pink : cream;
            }),
          ];
        }),
        VM(0.28),
        { outline: OLS },
      );
      P.torso.add(lolly);
      P.items.lolly = lolly;
      P.net2 = makeNet();
      P.torso.add(P.net2);
    },
    pose(P, st) {
      if (st.shock) {
        st.netB = true;
        armToward(P, 0, st.sw2.h, ARM * 1.3, 0.25, st.F);
      } else if (!st.walk && st.lk < 0.5) set3(st.F, -0.23, 0.06, 0.11);
    },
    after(P, st) {
      const l = P.items.lolly;
      l.visible = l.visible && !st.shock;
      l.position.copy(P.hands[0].position);
      l.rotation.set(0, 0, 0.45 + Math.sin(st.ph) * 0.15 * st.walk - st.lk * 0.2);
    },
  },

  // 산책하는 사람: 보라 후드티·높이 묶은 포니테일(노란 곱창끈)·청록 머리띠·운동화·개(시바). 상냥하고 밝다.
  walker: {
    umbY: 0.36,
    L: {
      skin: '#c98d62',
      top: '#9a5ce6',
      cuff: '#6c3cb8',
      legs: '#2f2e5c',
      shoe: '#f6f4fb',
      sole: '#ff5f8f',
      face: { skin: '#c98d62', iris: '#7a4420', lash: true, brow: [0.04, 0.0, 0.04, 0.075, 0.2], browCol: '#2a1f2a', mouth: 'grin', blush: 0.95 },
    },
    build(P, R) {
      const top = '#9a5ce6';
      const g = grad(top, -0.09, 0.22, 0.22, 0.1);
      const rib = col(tone(top, -0.22));
      add(
        P.torso,
        merged('vhoodieW', () => [
          paint(bodyGeo(), (x, y) => (y < -0.058 ? rib : g(x, y))),
          ...shoulderCaps(top, 0.072),
          paint(ell([0, 0.19, -0.11], [0.15, 0.088, 0.095]), (x, y) => g(x, y)),
          paint(frontPanel('vkangaroo', -0.045, 0.06, 1.15, 0.92, 0.014), tone(top, -0.1)),
          paint(rodGeo([-0.034, 0.21, 0.08], [-0.04, 0.12, 0.124], 0.01), '#fbf6ee'),
          paint(rodGeo([0.034, 0.21, 0.08], [0.04, 0.11, 0.126], 0.01), '#fbf6ee'),
        ]),
        VM(0.55),
        { outline: OL },
      );
      headwear(P, 'walker', () => [
        hairGeo({ col: '#3a2a36', f: 0.46, ft: 0.3, part: 0.3, tufts: [[-0.22, 0.16, 0.42], [0.36, 0.06, 0.24]], side: -0.28, back: -0.42, t: 0.075 }),
        hu(paint(place(capG(0.09, 0.36, 8), [0, 0.16, -0.4], [1.15, 0, 0]), grad('#3a2a36', -0.1, 0.3, 0.3, 0.25))),
        hu(paint(ell([0, 0.072, -0.56], [0.084, 0.098, 0.084], [0.5, 0, 0]), hairPaint('#3a2a36'))),
        hu(paint(place(torusGeo(0.253, 0.028, 10, 48), [0, 0.085, -0.032], [Math.PI / 2 - 0.36, 0, 0]), grad('#2fd0c0', 0.05, 0.15, 0.2, 0.12))),
        hu(paint(place(fluffyRing('vscrunch', 0.068, 0.03, 9), [0, 0.228, -0.25], [1.15 + Math.PI / 2, 0, 0]), '#ffd23f')),
      ]);
      buildDog(R);
    },
    after(P, st, R) {
      updateDog(R, st);
    },
  },

  // 캠핑족: 주황 비니(방울)·초록 파카(털 깃)·큰 배낭과 침낭·법랑 머그·주근깨. 늘 싱글벙글.
  camper: {
    fprop: 'mug',
    umbY: 0.46,
    L: {
      skin: '#f6c29c',
      top: '#3ea65e',
      cuff: '#2a6a3e',
      legs: '#8a6440',
      shoe: '#7a4a28',
      sole: '#3a2416',
      boot: true,
      trim: '#ecd8a8',
      face: { skin: '#f6c29c', iris: '#3f9a3a', brow: [0.04, -0.04, 0.04, 0.09, 0.21], browCol: '#b8561e', freckles: true, mouth: 'grin', blush: 1.15 },
    },
    build(P) {
      const top = '#3ea65e';
      const g = grad(top, -0.09, 0.22, 0.24, 0.1);
      const hem = col(tone(top, -0.25));
      add(
        P.torso,
        merged('vparka', () => {
          const pg = grad('#ee923e', -0.06, 0.25, 0.24, 0.1);
          const blue = grad('#3f74e0', 0.22, 0.33, 0.22, 0.1);
          const strap = col('#7a4a28');
          return [
            paint(bodyGeo(), (x, y) => (y < -0.06 ? hem : g(x, y))),
            ...shoulderCaps(top, 0.076),
            paint(place(fluffyRing('vcollar', 0.098, 0.044), [0, 0.216, 0.006], [Math.PI / 2 + 0.12, 0, 0], [1, 0.92, 1]), grad('#fff3dc', 0.18, 0.26, 0.15, 0)),
            // 배낭 + 침낭
            paint(place(roundBoxGeo(0.26, 0.29, 0.15, 0.06, 4), [0, 0.1, -0.185]), pg),
            paint(place(roundBoxGeo(0.27, 0.1, 0.16, 0.048, 3), [0, 0.215, -0.185]), tone('#ee923e', -0.14)),
            paint(place(capG(0.062, 0.34, 10), [0, 0.3, -0.176], [0, 0, Math.PI / 2]), (x, y) => (Math.abs(Math.abs(x) - 0.09) < 0.016 ? strap : blue(x, y))),
            paint(rodGeo([-0.086, 0.22, 0.03], [-0.098, 0.03, 0.145], 0.02), '#7a4a28'),
            paint(rodGeo([0.086, 0.22, 0.03], [0.098, 0.03, 0.145], 0.02), '#7a4a28'),
          ];
        }),
        VM(0.55),
        { outline: OL },
      );
      add(
        P.torso,
        merged('vparkaDetail', () => [
          paint(rodGeo(onBody(0.2, 0, 0.004), onBody(-0.07, 0, 0.012), 0.009), '#22502e'),
          paint(place(roundBoxGeo(0.07, 0.05, 0.02, 0.012, 2), onBody(0.03, -0.5, 0.012), [0, -0.5, 0]), tone(top, -0.12)),
          paint(place(roundBoxGeo(0.034, 0.03, 0.02, 0.008, 1), [-0.096, 0.1, 0.142]), '#ffd23f'),
          paint(place(roundBoxGeo(0.034, 0.03, 0.02, 0.008, 1), [0.096, 0.1, 0.142]), '#ffd23f'),
        ]),
        VM(0.42),
      );
      headwear(P, 'camper', () => {
        const o = '#ff8a2c';
        const og = grad(o, 0.06, 0.3, 0.12, 0.12);
        const rib = col(tone(o, -0.14));
        const cream = grad('#fff3dc', 0.0, 0.12, 0.12, 0);
        const tilt = [-0.28, 0, 0.05];
        return [
          hairGeo({ col: '#d8682c', f: 0.5, ft: 0.2, tufts: [[-0.3, 0.1, 0.28], [0.1, 0.12, 0.3], [0.45, 0.08, 0.22]], side: -0.32, back: -0.45, crown: 0.5, t: 0.07 }),
          hu(paint(lathe('vbeanie', [[0, 0.3], [0.1, 0.292], [0.18, 0.258], [0.236, 0.19], [0.258, 0.11], [0.262, 0.06], [0.2, 0.05], [0, 0.05]], { n: 24, seg: 48 }), (x, y, z) => (Math.sin(Math.atan2(z, x) * 12) > 0.4 ? rib : og(x, y))), tilt),
          hu(paint(place(torusGeo(0.254, 0.048, 12, 48), [0, 0.068, 0], [Math.PI / 2, 0, 0]), cream), tilt),
          hu(paint(place(sphereGeo(1, 18, 14), [0, 0.328, 0], [0, 0, 0], 0.08), cream), tilt),
        ];
      });
      // 법랑 머그와 김
      const mug = new THREE.Group();
      add(
        mug,
        merged('vmug', () => {
          const b = grad('#3a7ae8', 0, 0.09, 0.18, 0.12);
          const w = col('#fbf6ee');
          return [paint(place(cylGeo(0.05, 0.045, 0.092, 20), [0, 0.046, 0]), (x, y) => (y > 0.08 ? w : b(x, y))), paint(place(torusGeo(0.027, 0.011, 8, 14), [0.052, 0.046, 0]), '#3a7ae8')];
        }),
        VM(0.25),
        { outline: OLS },
      );
      const steam = SM('#ffffff', { rough: 1, opacity: 0.65 });
      mug.userData.steam = [add(mug, sphereGeo(0.026, 10, 8), steam, { cast: false }), add(mug, sphereGeo(0.02, 10, 8), steam, { cast: false })];
      P.torso.add(mug);
      P.items.mug = mug;
    },
    pose(P, st) {
      if (st.shock) return;
      if (st.lk > 0) {
        set3(st.F, -0.15, 0.06, 0.15);
        return;
      }
      set3(st.F, lerp(st.F[0], -0.15, 1 - st.walk * 0.6), lerp(st.F[1], 0.05, 1 - st.walk * 0.5), lerp(st.F[2], 0.15, 1 - st.walk * 0.5));
      // 서 있을 때 가끔 한 모금
      const u = (st.t + 1.3) % 5.5;
      const k = st.idle * (u < 1.5 ? smooth(clamp01(u / 0.35)) * smooth(clamp01((1.5 - u) / 0.35)) : 0);
      if (k > 0) {
        headToTorso(P, -0.12, -0.8, 0.8, _c);
        mix3(st.F, _c.x - 0.02, _c.y - 0.1, _c.z + 0.02, k);
        if (k > 0.7) st.face = 'b';
      }
      st.sip = k;
    },
    after(P, st) {
      const m = P.items.mug;
      m.position.copy(P.hands[0].position).add(_a.set(0.01, -0.035, 0.035));
      m.rotation.set(0, 0.6, st.shock ? Math.sin(st.t * 15) * 0.35 : -(st.sip || 0) * 0.9);
      const s = m.userData.steam;
      for (let i = 0; i < s.length; i++) {
        const k = (st.t * 0.7 + i * 0.5) % 1;
        s[i].position.set(Math.sin(st.t * 3 + i * 2) * 0.012, 0.11 + k * 0.13, 0);
        s[i].scale.setScalar(Math.max(0.001, (0.6 + k * 0.9) * (1 - k * k) * (st.shock ? 0 : 1)));
      }
      st.sip = 0;
    },
  },

  // 낚시꾼: 올리브 벙거지(빨간 미끼)·하얀 수염·졸린 눈·노란 비옷·초록 장화·낚싯대에 걸린 물고기. 무뚝뚝한 바닷사람.
  fisher: {
    fprop: 'rod',
    umbY: 0.36,
    L: {
      skin: '#eeb48c',
      top: '#ffcf2e',
      cuff: '#e8a81e',
      legs: '#3d4f86',
      shoe: '#3fa062',
      sole: '#24563a',
      boot: true,
      trim: '#6ccc86',
      nose: 1.28,
      face: {
        skin: '#eeb48c',
        iris: '#3f72aa',
        ek: 0.96,
        squint: 0.62,
        brow: [0.0, 0.2, 0.0, 0.15, 0.3],
        browCol: '#f4f2fa',
        browEdge: '#a8a4c0',
        mouth: 'flat',
        mouthDY: -0.02,
        blush: 1.1,
        noseRosy: 1.3,
        stache: { col: '#f6f4fb', hi: '#ffffff', lo: '#cfcce0', edge: '#9a96b2', w: 0.36, h: 0.15, lat: -0.39 },
      },
    },
    build(P) {
      const y = '#ffcf2e';
      const g = grad(y, -0.11, 0.22, 0.24, 0.1);
      add(
        P.torso,
        merged('vraincoat', () => [
          paint(place(lathe('vraincoatL', [[0, -0.116], [0.178, -0.114], [0.204, -0.1], [0.194, -0.03], [0.176, 0.05], [0.156, 0.12], [0.128, 0.175], [0.09, 0.214], [0.044, 0.235], [0, 0.238]], { seg: 40, n: 30 }), [0, 0, 0], [0, 0, 0], [1, 1, 0.9]), g),
          ...shoulderCaps(y, 0.078),
          paint(place(torusGeo(0.1, 0.036, 10, 28), [0, 0.216, 0.01], [Math.PI / 2 + 0.22, 0, 0]), tone(y, 0.1)),
        ]),
        VM(0.32),
        { outline: OL },
      );
      add(
        P.torso,
        merged('vcoatBtn', () => [
          ...[0.14, 0.07, 0.0].map((yy) => paint(place(roundBoxGeo(0.048, 0.018, 0.018, 0.007, 1), onBody(yy, 0, 0.012)), '#c4661e')),
          paint(place(roundBoxGeo(0.07, 0.03, 0.02, 0.01, 2), onBody(-0.02, -0.55, 0.014), [0, -0.55, 0]), tone(y, -0.15)),
          paint(place(roundBoxGeo(0.07, 0.03, 0.02, 0.01, 2), onBody(-0.02, 0.55, 0.014), [0, 0.55, 0]), tone(y, -0.15)),
        ]),
        VM(0.4),
      );
      headwear(P, 'fisher', () => {
        const o = grad('#9aa65a', 0.03, 0.27, 0.18, 0.1);
        const under = col('#66702f');
        const tilt = [-0.16, 0, -0.06];
        return [
          hairGeo({ col: '#f2f0f8', f: 1.3, side: -0.32, back: -0.5, crown: 0.42, t: 0.07, dark: 0.14, light: 0.12 }),
          // 하얀 턱수염: 입 아래에서 귀 옆까지 덮고 아래로 몽실하게 늘어진다
          shellGeo({
            col: '#f6f4fa',
            dark: 0.14,
            light: 0.12,
            band: -2,
            cover(lon, lat, a) {
              const H = lerp(-0.66, 0.02, smooth(clamp01((a - 0.25) / 1.05)));
              return Math.min(H - lat, 1.8 - a);
            },
            r(lon, lat, a) {
              return 1.06 + 0.15 * smooth(clamp01((-lat - 0.4) / 0.8)) * (1 - 0.5 * smooth(clamp01((a - 0.7) / 0.8)));
            },
          }),
          hu(paint(lathe('vbucket', [[0, 0.275], [0.12, 0.272], [0.175, 0.255], [0.19, 0.2], [0.198, 0.13], [0.25, 0.08], [0.31, 0.04], [0.316, 0.024], [0.295, 0.02], [0.24, 0.055], [0.19, 0.095], [0, 0.1]], { n: 32, seg: 48 }), (x, yy, z, ny) => (ny < -0.3 ? under : o(x, yy))), tilt),
          hu(paint(lathe('vbucketBand', [[0.2, 0.13], [0.205, 0.135], [0.199, 0.178], [0.192, 0.183]], { smoothIt: false, seg: 44 }), '#5e6634'), tilt),
          hu(paint(ell([0.14, 0.17, 0.15], [0.03, 0.03, 0.044], [0, 0.8, 0]), '#ff4a3c'), tilt),
          hu(paint(ell([-0.17, 0.2, 0.05], [0.016, 0.072, 0.032], [0.3, 0, 0.5]), '#3f74e0'), tilt),
        ];
      });
      // 낚싯대(어깨에 멘다), 줄, 물고기
      const rod = new THREE.Group();
      add(
        rod,
        merged('vrodStick', () => [
          paint(rodGeo([0, 0.06, 0], [0, 1.0, 0], 0.012, 0.006, 8), '#3a2a36'),
          paint(place(cylGeo(0.024, 0.024, 0.14, 12), [0, 0.0, 0]), '#c88e52'),
          paint(place(cylGeo(0.036, 0.036, 0.032, 16), [0.036, 0.05, 0], [0, 0, Math.PI / 2]), '#c9d2ee'),
          paint(ell([0, 1.0, 0], [0.014, 0.014, 0.014]), '#ff4a3c'),
        ]),
        VM(0.38),
      );
      const line = new THREE.Group();
      line.position.set(0, 1.0, 0);
      rod.add(line);
      line.userData.str = add(line, cg('vfishLine', () => place(cylGeo(0.004, 0.004, 1, 4), [0, -0.5, 0])), SM('#ffffff', { rough: 0.4 }), { cast: false });
      const fish = new THREE.Group();
      line.add(fish);
      add(
        fish,
        merged('vfish', () => {
          const body = grad('#ff7a2a', -0.16, 0.0, 0.2, 0.2);
          const belly = col('#fff1d6');
          const fin = col('#ffc23a');
          return [
            paint(ell([0, -0.085, 0], [0.03, 0.085, 0.055], [0, 0, 0], [18, 16]), (x, y, z) => (z > 0.026 ? belly : body(x, y))),
            paint(place(coneGeo(0.06, 0.08, 12), [0, -0.195, 0], [Math.PI, 0, 0], [0.32, 1, 1.25]), fin),
            paint(ell([0.026, -0.032, 0.018], [0.01, 0.017, 0.017]), '#ffffff'),
            paint(ell([-0.026, -0.032, 0.018], [0.01, 0.017, 0.017]), '#ffffff'),
            paint(ell([0.032, -0.032, 0.021], [0.006, 0.01, 0.01]), '#1d1430'),
            paint(ell([-0.032, -0.032, 0.021], [0.006, 0.01, 0.01]), '#1d1430'),
          ];
        }),
        VM(0.3),
        { outline: OLS },
      );
      line.userData.fish = fish;
      P.torso.add(rod);
      P.items.rod = rod;
      P.items.line = line;
    },
    pose(P, st) {
      if (!st.shock) set3(st.F, -0.165, 0.09, 0.12);
    },
    after(P, st) {
      const r = P.items.rod;
      r.position.copy(P.hands[0].position);
      r.rotation.set(-0.7 + (st.shock ? Math.sin(st.t * 15) * 0.15 : Math.sin(st.ph) * 0.05 * st.walk), 0, 0.3);
      const ln = P.items.line;
      ln.quaternion.copy(r.quaternion).invert();
      const len = 0.26 + Math.sin(st.t * 2.4) * 0.012;
      ln.userData.str.scale.y = len;
      const f = ln.userData.fish;
      f.position.set(Math.sin(st.t * 1.7) * 0.01, -len, 0);
      f.rotation.set(0, st.t * 1.5, Math.sin(st.t * (st.shock ? 22 : 7)) * (st.shock ? 0.6 : 0.25));
    },
  },

  // 회사원: 남색 양복·빨간 넥타이·사원증·서류 가방·포마드 머리. 늘 피곤하고 걱정이 많다(다크서클·식은땀).
  worker: {
    fprop: 'bag',
    umbY: 0.4,
    L: {
      skin: '#f6c29c',
      top: '#3a4c9a',
      cuff: '#f4f4fa',
      legs: '#30407e',
      shoe: '#3a2418',
      sole: '#1e120c',
      face: { skin: '#f6c29c', iris: '#5a3c28', squint: 0.86, brow: [0.02, 0.32, 0.0, 0.085, 0.21], browCol: '#231c2c', bags: true, mouth: 'wobble', sweat: true, blush: 0.7 },
    },
    build(P) {
      const navy = '#3a4c9a';
      const g = grad(navy, -0.09, 0.22, 0.22, 0.12);
      add(
        P.torso,
        merged('vsuit', () => [
          paint(bodyGeo(), g),
          ...shoulderCaps(navy, 0.076),
        ]),
        VM(0.48),
        { outline: OL },
      );
      add(
        P.torso,
        merged('vsuitDetail', () => {
          const red = col('#ff4a3c');
          const stripe = col('#ffd23f');
          return [
            paint(frontPanel('vlapelV', 0.06, 0.232, 0.2, 1.42, 0.011), tone(navy, 0.14)),
            paint(frontPanel('vshirtV', 0.1, 0.232, 0.04, 1.08, 0.017), '#f6f6fc'),
            paint(rodGeo([0, 0.218, 0.096], [0, 0.05, 0.164], 0.018, 0.03, 12), (x, yy) => (Math.abs(frac(yy * 18) - 0.5) < 0.12 ? stripe : red)),
            paint(ell([0, 0.218, 0.094], [0.026, 0.024, 0.02]), '#d8323a'),
            paint(ell(onBody(0.03, 0, 0.012), [0.015, 0.015, 0.009]), '#1e2650'),
            paint(ell(onBody(-0.03, 0, 0.012), [0.015, 0.015, 0.009]), '#1e2650'),
            paint(place(roundBoxGeo(0.045, 0.022, 0.012, 0.007, 1), onBody(0.12, 0.55, 0.012), [0, 0.55, 0.3]), '#ffffff'),
            paint(rodGeo([-0.05, 0.21, 0.07], [-0.08, 0.085, onBody(0.085, -0.5)[2] + 0.02], 0.007), '#3f9fe0'),
            paint(place(roundBoxGeo(0.054, 0.07, 0.012, 0.01, 1), [-0.083, 0.045, onBody(0.045, -0.48)[2] + 0.02], [0, -0.48, 0]), (x, yy) => (yy > 0.066 ? col('#3f9fe0') : col('#ffffff'))),
          ];
        }),
        VM(0.4),
      );
      headwear(
        P,
        'worker',
        () => [
          hairGeo({ col: '#2e2838', f: 0.5, ft: 0.42, part: 0.5, fw: 1.15, partLine: -0.42, tufts: [[-0.05, -0.1, 0.5]], side: -0.24, back: -0.42, top: 0.1, t: 0.09, band: 0.58, light: 0.5 }),
        ],
        { rough: 0.3 },
      );
      const bag = new THREE.Group();
      add(
        bag,
        merged('vbriefcase', () => {
          const lea = grad('#a8643a', -0.19, -0.02, 0.22, 0.12);
          return [
            paint(place(roundBoxGeo(0.08, 0.19, 0.25, 0.03, 3), [0, -0.11, 0]), lea),
            paint(place(torusGeo(0.036, 0.013, 8, 14, Math.PI), [0, -0.016, 0], [0, Math.PI / 2, 0]), '#5a3420'),
            paint(place(roundBoxGeo(0.086, 0.034, 0.05, 0.01, 1), [0, -0.05, 0]), '#ffd23f'),
          ];
        }),
        VM(0.35),
        { outline: OLS },
      );
      P.torso.add(bag);
      P.items.bag = bag;
    },
    after(P, st) {
      const b = P.items.bag;
      b.position.copy(P.hands[0].position);
      b.rotation.set(Math.sin(st.ph) * 0.18 * st.walk, 0, st.shock ? 0.5 + Math.sin(st.t * 15) * 0.25 : 0);
    },
  },

  // 방송인: 분홍 후드티(별)·고양이 귀 헤드폰·머리 경단 둘·셀카봉. 늘 흥분해서 눈이 반짝반짝.
  streamer: {
    fprop: 'stick',
    umbY: 0.42,
    L: {
      skin: '#a8714c',
      top: '#ff7fae',
      cuff: '#e0558a',
      legs: '#5f86d6',
      shoe: '#f6f4fb',
      sole: '#2fc0b0',
      face: { skin: '#a8714c', iris: '#a050ee', ek: 1.06, lash: true, sparkle: true, brow: [0.06, -0.04, 0.05, 0.072, 0.18], browCol: '#1f1822', mouth: 'grin', blush: 0.95 },
    },
    build(P) {
      const top = '#ff7fae';
      const g = grad(top, -0.09, 0.22, 0.22, 0.1);
      const rib = col(tone(top, -0.2));
      add(
        P.torso,
        merged('vhoodieS', () => [paint(bodyGeo(), (x, y) => (y < -0.058 ? rib : g(x, y))), ...shoulderCaps(top, 0.072), paint(ell([0, 0.19, -0.11], [0.15, 0.088, 0.095]), (x, y) => g(x, y))]),
        VM(0.55),
        { outline: OL },
      );
      add(P.torso, cg('vstar', () => paint(starGeo(), '#ffffff')), VM(0.35), { pos: onBody(0.07, 0, -0.008) });
      headwear(P, 'streamer', () => {
        const teal = grad('#2fd0c0', -0.1, 0.3, 0.22, 0.12);
        const pink = col('#ff96bc');
        const parts = [
          hairGeo({ col: '#2e2434', f: 0.44, ft: 0.25, tufts: [[-0.32, 0.12, 0.3], [0.04, 0.14, 0.28], [0.38, 0.1, 0.25]], side: -0.32, back: -0.5, t: 0.075 }),
          hu(paint(ell([-0.1, 0.2, -0.17], [0.088, 0.088, 0.088]), hairPaint('#2e2434'))),
          hu(paint(ell([0.1, 0.2, -0.17], [0.088, 0.088, 0.088]), hairPaint('#2e2434'))),
          hu(paint(place(torusGeo(0.262, 0.026, 10, 40, Math.PI), [0, 0, -0.02], [-0.18, 0, 0]), teal)),
        ];
        for (const s of [-1, 1]) {
          parts.push(hu(paint(place(cylGeo(0.082, 0.082, 0.064, 24), [s * 0.25, -0.01, -0.02], [0, 0, Math.PI / 2]), (x) => (Math.abs(x) > 0.272 ? pink : teal(x, 0)))));
          parts.push(hu(paint(place(coneGeo(0.086, 0.13, 14), [s * 0.175, 0.225, -0.04], [-0.18, 0, -s * 0.6]), teal)));
          parts.push(hu(paint(place(coneGeo(0.054, 0.085, 12), [s * 0.168, 0.22, 0.0], [-0.18, 0, -s * 0.6], [1, 1, 0.4]), pink)));
        }
        return parts;
      });
      // 셀카봉 + 휴대폰
      const stick = new THREE.Group();
      add(stick, cg('vselfie', () => paint(place(cylGeo(0.011, 0.013, 0.5, 10), [0, 0.25, 0]), grad('#4a4f7a', 0, 0.5, 0.2, 0.3))), VM(0.3, { metal: 0.3 }));
      const phone = new THREE.Group();
      phone.position.set(0, 0.52, 0);
      stick.add(phone);
      add(phone, roundBoxGeo(0.11, 0.18, 0.026, 0.024, 3), SM('#9a7ae8', { rough: 0.3 }), { outline: OLS });
      add(phone, roundBoxGeo(0.09, 0.156, 0.006, 0.014, 2), SM('#bff6ff', { rough: 0.25, emissive: '#7fe8ff', emissiveIntensity: 0.9, self: 0 }), { pos: [0, 0, 0.013], cast: false });
      const rec = add(phone, sphereGeo(0.014, 10, 8), SM('#ff3b3b', { emissive: '#ff2020', emissiveIntensity: 2, self: 0 }), { pos: [0.03, 0.066, -0.016], cast: false });
      P.torso.add(stick);
      P.items.stick = stick;
      P.items.phone = phone;
      P.items.rec = rec;
    },
    pose(P, st) {
      // 평소엔 셀카(카메라 쪽 머리 위로 휴대폰을 들어 나를 찍는다), 올려다볼 때·들켰을 때는 높이 들어 기체를 찍는다
      const up = Math.max(st.lk, st.shock ? 1 : 0);
      if (up > 0) armToward(P, 0, 0.42 + (st.shock ? Math.sin(st.t * 15) * 0.08 : 0), ARM * 1.3, 0.3, st.T);
      else set3(st.T, 0, 0, 0);
      set3(st.F, lerp(-0.22, st.T[0], up), lerp(0.13 + Math.abs(Math.sin(st.ph)) * 0.02 * st.walk, st.T[1], up), lerp(0.15, st.T[2], up));
    },
    after(P, st) {
      const s = P.items.stick;
      const up = Math.max(st.lk, st.shock ? 1 : 0);
      s.position.copy(P.hands[0].position);
      s.rotation.set(lerp(0.2, -0.1, up), 0, lerp(0.42 + Math.sin(st.t * 1.7) * 0.05, 0.2, up));
      P.items.phone.rotation.set(lerp(-0.25, 0.3, up), lerp(Math.PI * 0.78, -Math.PI / 2, up), 0);
      P.items.rec.visible = Math.sin(st.t * 5) > -0.3;
    },
  },

  // 천문학자: 대머리·옆머리 곱슬·두꺼운 둥근 안경·흰 가운·망원경. 궁금한 게 많은 괴짜(한쪽 눈썹이 늘 올라가 있다).
  astronomer: {
    fprop: 'scope',
    umbY: 0.36,
    L: {
      skin: '#f6c29c',
      top: '#f4f5fa',
      cuff: '#d6dbee',
      legs: '#56608f',
      shoe: '#6b4428',
      nose: 1.15,
      face: { skin: '#f6c29c', iris: '#3f74e0', brow: [0.04, 0.08, 0.04, 0.1, 0.22], asym: 0.08, browCol: '#c8682e', mouth: 'smile', lookMouth: 'grin', blush: 0.9 },
    },
    build(P) {
      const coat = '#f4f5fa';
      const g = grad(coat, -0.12, 0.22, 0.2, 0.02);
      add(
        P.torso,
        merged('vlabcoat', () => [
          paint(place(lathe('vlabcoatL', [[0, -0.12], [0.186, -0.118], [0.204, -0.104], [0.19, -0.03], [0.172, 0.05], [0.152, 0.125], [0.124, 0.182], [0.086, 0.218], [0.042, 0.236], [0, 0.238]], { seg: 40, n: 30 }), [0, 0, 0], [0, 0, 0], [1, 1, 0.9]), g),
          ...shoulderCaps(coat, 0.076),
        ]),
        VM(0.5),
        { outline: OL },
      );
      add(
        P.torso,
        merged('vlabDetail', () => [
          paint(frontPanel('vlabLapel', -0.11, 0.232, 0.2, 1.4, 0.012), g),
          paint(frontPanel('vlabShirt', 0.04, 0.232, 0.12, 1.05, 0.018), '#8fb8f0'),
          paint(rodGeo([0, 0.218, 0.098], [0, 0.07, 0.158], 0.016, 0.026, 10), '#2b3a78'),
          paint(ell([0, 0.218, 0.096], [0.024, 0.022, 0.018]), '#1f2a5c'),
          paint(rodGeo([-0.096, 0.112, 0.138], [-0.096, 0.165, 0.126], 0.009), '#ff4a3c'),
          paint(rodGeo([-0.076, 0.112, 0.144], [-0.076, 0.16, 0.133], 0.009), '#3f74e0'),
          paint(place(roundBoxGeo(0.075, 0.06, 0.016, 0.012, 2), onBody(0.105, -0.5, 0.016), [0, -0.5, 0]), tone(coat, -0.08)),
        ]),
        VM(0.4),
      );
      // 안경테(눈 둘레 + 코다리 + 다리). 머리 장식에 합친다(알은 그리지 않아야 큰 눈이 또렷하다).
      const lensAt = (side) => {
        const fr = eyeFrame(side, 1, 1);
        const n = new THREE.Vector3(0, 0, 1).applyQuaternion(fr.quat);
        const c = fr.pos.clone().addScaledVector(n, 0.17);
        const r = new THREE.Euler().setFromQuaternion(fr.quat);
        return { c: [c.x, c.y, c.z], r: [r.x, r.y, r.z] };
      };
      headwear(P, 'astronomer', () => {
        const ging = hairPaint('#d47a3c');
        const parts = [hairGeo({ col: '#d47a3c', f: 2.0, side: -0.36, back: -0.45, crown: 0.28, t: 0.08 })];
        for (const s of [-1, 1]) {
          for (const [x, y, z, r] of [[0.21, 0.07, -0.06, 0.064], [0.2, 0.0, -0.11, 0.062], [0.2, 0.11, -0.12, 0.056], [0.15, 0.06, -0.18, 0.06], [0.22, -0.04, -0.05, 0.052], [0.235, 0.13, -0.02, 0.048]]) parts.push(hu(paint(ell([s * x, y, z], [r, r, r], [0, 0, 0], [16, 12]), ging)));
        }
        parts.push(hu(paint(ell([0, 0.0, -0.21], [0.12, 0.09, 0.07]), ging)));
        parts.push(hu(paint(place(torusGeo(0.036, 0.015, 8, 16, Math.PI * 1.5), [0.0, 0.27, 0.02], [0, Math.PI / 2, 0.3]), ging)));
        return parts;
      });
      add(
        P.head,
        merged('vglasses', () => {
          const parts = [];
          for (const side of [-1, 1]) {
            const { c, r } = lensAt(side);
            parts.push(paint(place(torusGeo(0.33, 0.042, 10, 40), c, r), '#3a2a4e'));
            parts.push(paint(rodGeo([c[0] + side * 0.32, c[1] + 0.03, c[2] - 0.06], [side * 1.0, 0.03, -0.1], 0.035), '#3a2a4e'));
          }
          parts.push(paint(rodGeo([-0.1, 0.02, 1.08], [0.1, 0.02, 1.08], 0.038), '#3a2a4e'));
          return parts;
        }),
        VM(0.3),
        { cast: false },
      );
      // 망원경
      const scope = new THREE.Group();
      add(
        scope,
        merged('vscope', () => {
          const tube = grad('#4466c8', 0, 0.36, 0.18, 0.16);
          const brass = col('#ffcf4a');
          return [
            paint(
              lathe('vscopeL', [[0.0, -0.02], [0.032, -0.02], [0.034, -0.001], [0.035, 0.001], [0.04, 0.06], [0.043, 0.104], [0.048, 0.106], [0.048, 0.134], [0.044, 0.136], [0.048, 0.2], [0.052, 0.26], [0.054, 0.294], [0.064, 0.296], [0.064, 0.37], [0.0, 0.37]], { smoothIt: false, seg: 24 }),
              (x, y) => ((y > 0.103 && y < 0.137) || y > 0.293 || y < 0.0 ? brass : tube(x, y)),
            ),
          ];
        }),
        VM(0.32),
        { outline: OLS },
      );
      add(scope, cylGeo(0.052, 0.052, 0.006, 18), SM('#aef4ff', { rough: 0.1, emissive: '#5fdcff', emissiveIntensity: 0.7, self: 0 }), { pos: [0, 0.372, 0], cast: false });
      P.torso.add(scope);
      P.items.scope = scope;
    },
    pose(P, st) {
      if (st.shock) return;
      if (st.lk > 0) {
        // 망원경을 카메라 쪽 눈에 대고 기체 쪽으로 든다(카메라 쪽 손이 받친다). 기체 쪽 손은 가리킨다.
        headToTorso(P, -0.42, 0.0, 1.25, _c);
        mix3(st.F, _c.x - 0.02, _c.y - 0.08, _c.z + 0.02, st.lk);
      } else if (!st.walk) set3(st.F, -0.19, 0.04, 0.12);
    },
    after(P, st) {
      const s = P.items.scope;
      if (st.lk > 0.5 && !st.shock) {
        headToTorso(P, -0.38, 0.08, 1.2, _c);
        s.position.copy(_c);
        _b.set(0.15, 0.62, 1).normalize();
        _q.setFromRotationMatrix(P.neck.matrix);
        _b.applyQuaternion(_q);
        s.quaternion.setFromUnitVectors(UP, _b);
      } else {
        s.position.copy(P.hands[0].position);
        s.rotation.set(st.shock ? 0.4 + Math.sin(st.t * 15) * 0.2 : 1.0, 0, st.shock ? 0.6 : -0.5);
      }
    },
  },

  // 사진가: 빨간 베레모·곱슬 단발·청록 셔츠·주머니 많은 카키 조끼·사진기. 여유만만(한쪽 입꼬리·한쪽 눈썹).
  photographer: {
    umbY: 0.4,
    lookPitch: 0.2,
    L: {
      skin: '#d39a6c',
      top: '#2fbcac',
      cuff: '#22907f',
      legs: '#454b7d',
      shoe: '#5a3526',
      face: { skin: '#d39a6c', iris: '#a8662a', squint: 0.84, lash: true, brow: [0.03, -0.06, 0.03, 0.08, 0.2], asym: 0.07, browCol: '#3a2018', mouth: 'smirk', lookMouth: 'smile', blush: 0.8 },
    },
    build(P) {
      const kh = '#dcc48c';
      const g = grad(kh, -0.09, 0.22, 0.22, 0.08);
      add(
        P.torso,
        merged('vvest', () => [
          paint(bodyGeo(), g),
          ...shoulderCaps('#2fbcac', 0.072),
          paint(place(torusGeo(0.096, 0.03, 10, 28), [0, 0.214, 0.008], [Math.PI / 2 + 0.2, 0, 0]), grad('#ff4a3c', 0.18, 0.24, 0.2, 0.1)),
        ]),
        VM(0.55),
        { outline: OL },
      );
      add(
        P.torso,
        merged('vvestPockets', () => {
          const pk = tone(kh, -0.14);
          return [
            paint(frontPanel('vvestGap', -0.07, 0.232, 0.24, 0.92, 0.018), grad('#2fbcac', -0.07, 0.22, 0.18, 0.08)),
            ...[-0.62, 0.62].map((a) => paint(place(roundBoxGeo(0.07, 0.06, 0.018, 0.012, 2), onBody(0.0, a, 0.008), [0, a, 0]), pk)),
            ...[-0.66, 0.66].map((a) => paint(place(roundBoxGeo(0.06, 0.045, 0.018, 0.012, 2), onBody(0.11, a, 0.008), [0, a, 0]), pk)),
          ];
        }),
        VM(0.45),
      );
      const hair = hairPaintH('#4e2e24');
      headwear(P, 'photographer', () => {
        const r = grad('#ff4a3c', 0.15, 0.3, 0.18, 0.12);
        const parts = [hairGeo({ col: '#4e2e24', f: 0.42, ft: 0.3, part: 0.35, tufts: [[-0.28, 0.14, 0.36], [0.4, 0.06, 0.25]], side: -0.78, back: -0.9, flare: 0.14, t: 0.08 })];
        for (const [a, y] of [[-1.25, -0.72], [1.25, -0.72], [-1.9, -0.8], [1.9, -0.8], [-2.6, -0.85], [2.6, -0.85], [Math.PI, -0.85]]) {
          const d = dirOf(a, y).multiplyScalar(1.12);
          parts.push(paint(ell([d.x * HS.x, d.y * HS.y, d.z], [0.2, 0.2, 0.2], [0, 0, 0], [14, 10]), hair));
        }
        parts.push(hu(paint(ell([-0.03, 0.205, -0.02], [0.258, 0.09, 0.258], [0.1, 0, 0.3], [36, 18]), r)));
        parts.push(hu(paint(place(cylGeo(0.014, 0.018, 0.045, 10), [-0.0, 0.3, -0.02], [0.1, 0, 0.3]), '#c8302a')));
        return parts;
      });
      // 사진기
      const cam = new THREE.Group();
      add(
        cam,
        merged('vcamBody', () => {
          const body = grad('#3e4468', -0.045, 0.045, 0.22, 0.18);
          return [
            paint(place(roundBoxGeo(0.15, 0.095, 0.065, 0.024, 3)), body),
            paint(place(roundBoxGeo(0.153, 0.03, 0.068, 0.012, 2), [0, 0.035, 0]), '#d0d6ee'),
            paint(place(roundBoxGeo(0.05, 0.032, 0.045, 0.01, 2), [-0.035, 0.06, 0]), '#d0d6ee'),
            paint(place(cylGeo(0.014, 0.014, 0.016, 12), [0.045, 0.058, 0]), '#ff4a3c'),
            paint(place(cylGeo(0.042, 0.044, 0.055, 20), [0.015, 0, 0.055], [Math.PI / 2, 0, 0]), (x, y, z) => (z > 0.07 ? col('#d0d6ee') : col('#2a2f4a'))),
          ];
        }),
        VM(0.32),
        { outline: OLS },
      );
      add(cam, cylGeo(0.03, 0.03, 0.004, 16), SM('#7fd8ff', { rough: 0.1, emissive: '#3fb8ff', emissiveIntensity: 1.2, self: 0 }), { pos: [0.015, 0, 0.084], rot: [Math.PI / 2, 0, 0], cast: false });
      const flash = glowSprite('#fffbe8', 0.5, 0);
      flash.position.set(-0.035, 0.07, 0.04);
      cam.add(flash);
      cam.userData.flash = flash;
      P.torso.add(cam);
      P.items.cam = cam;
    },
    pose(P, st) {
      if (st.shock) {
        // 들키면 사진기를 들고 연사(번쩍번쩍)
        armToward(P, 0, 0.5, ARM * 1.2, 0.5, st.F);
        return;
      }
      if (st.lk > 0) {
        // 두 손으로 사진기를 얼굴 앞(조금 아래)에 든다(얼굴이 보이게)
        headToTorso(P, -0.15, -0.55, 1.25, _c);
        mix3(st.F, _c.x - 0.085, _c.y - 0.03, _c.z - 0.02, st.lk);
        set3(st.B, lerp(st.B[0], _c.x + 0.085, st.lk), lerp(st.B[1], _c.y - 0.03, st.lk), lerp(st.B[2], _c.z - 0.02, st.lk));
        st.point = 0;
        st.maxB = 1.7;
      }
    },
    after(P, st) {
      const c = P.items.cam;
      const fl = c.userData.flash;
      if (st.shock) {
        c.position.copy(P.hands[0].position).add(_a.set(0.02, 0.05, 0.02));
        c.rotation.set(-0.5, -0.4, 0.2);
        const k = frac(st.t * 3.1);
        fl.material.opacity = k < 0.12 ? 1 - k / 0.12 : 0;
        fl.scale.setScalar(0.35 + (k < 0.12 ? k * 3 : 0));
      } else if (st.lk > 0.5) {
        headToTorso(P, -0.15, -0.55, 1.25, _c);
        c.position.copy(_c);
        P.neck.updateMatrix();
        c.quaternion.setFromRotationMatrix(P.neck.matrix);
        c.rotateX(-0.45);
        const k = frac(st.t * 0.6);
        fl.material.opacity = k < 0.08 ? 1 - k / 0.08 : 0;
        fl.scale.setScalar(0.45);
      } else {
        c.position.set(0, 0.07 + Math.abs(Math.cos(st.ph)) * 0.01 * st.walk, bodyR(0.07) * 0.9 + 0.05);
        c.rotation.set(0.1, 0, Math.sin(st.ph) * 0.08 * st.walk);
        fl.material.opacity = 0;
      }
    },
  },

  // UFO 사냥꾼(특별 손님): 은박 고깔모자(안테나)·트렌치코트에 UFO 배지·목에 건 큰 쌍안경·레이더 접시 배낭.
  // 20년째 UFO 를 쫓는 집요하고 귀여운 음모론자. 눈을 부릅뜨고(작은 눈동자·다크서클·수염 자국), 웅크린 채 하늘을 훑으며 바삐 걷는다.
  // 올려다보면 쌍안경을 두 손으로 눈에 대고 기체를 정확히 쫓으며 덜덜 떨고, 들키면 감격의 눈물을 흘리며 펄쩍펄쩍 뛴다.
  hunter: {
    lookPitch: 0.5,
    hunch: 0.17,
    scan: 0.42,
    step: 11.5,
    celebrate: true,
    leanBack: 0.12,
    umbY: 0.66,
    L: {
      skin: '#e8b48e',
      top: '#cfa664',
      cuff: '#9a7438',
      legs: '#4a4f5e',
      shoe: '#5a3a22',
      sole: '#2e1c12',
      boot: true,
      trim: '#8a6040',
      nose: 1.12,
      face: { skin: '#e8b48e', iris: '#3f9a4a', irisK: 's', ek: 1.05, brow: [0.01, -0.22, 0.0, 0.12, 0.25], browCol: '#3a2a20', bags: true, stubble: true, mouth: 'flat', lookMouth: 'grin', blush: 0.6 },
    },
    build(P, R) {
      const coat = '#cfa664';
      const g = grad(coat, -0.135, 0.22, 0.24, 0.1);
      const belt = col('#6a4426');
      add(
        P.torso,
        merged('vtrench', () => [
          paint(
            place(lathe('vtrenchL', [[0, -0.138], [0.188, -0.136], [0.218, -0.12], [0.2, -0.04], [0.18, 0.05], [0.158, 0.12], [0.132, 0.175], [0.093, 0.214], [0.045, 0.234], [0, 0.238]], { seg: 40, n: 30 }), [0, 0, 0], [0, 0, 0], [1, 1, 0.9]),
            (x, y) => (y > -0.004 && y < 0.03 ? belt : g(x, y)),
          ),
          ...shoulderCaps(coat, 0.078),
          paint(ell([-0.1, 0.226, -0.01], [0.075, 0.07, 0.024], [0.15, 0.95, 0.35]), tone(coat, -0.06)),
          paint(ell([0.1, 0.226, -0.01], [0.075, 0.07, 0.024], [0.15, -0.95, -0.35]), tone(coat, -0.06)),
          // 레이더 배낭
          paint(place(roundBoxGeo(0.22, 0.26, 0.13, 0.05, 4), [0, 0.09, -0.19]), grad('#6e7a44', -0.04, 0.22, 0.22, 0.1)),
          paint(rodGeo([-0.07, 0.2, -0.2], [-0.2, 0.52, -0.27], 0.014), '#8a919f'),
          paint(rodGeo([-0.086, 0.22, 0.03], [-0.098, 0.03, 0.146], 0.017), '#4a4f2e'),
          paint(rodGeo([0.086, 0.22, 0.03], [0.098, 0.03, 0.146], 0.017), '#4a4f2e'),
        ]),
        VM(0.55),
        { outline: OL },
      );
      // UFO 배지·외계인 배지·벨트 버클·티셔츠의 외계인 얼굴
      add(
        P.torso,
        merged('vhunterPins', () => [
          paint(frontPanel('vhunterShirt', 0.05, 0.232, 0.14, 0.98, 0.017), grad('#46884f', 0.05, 0.22, 0.14, 0.08)),
          paint(frontPanel('vhunterLapel', -0.02, 0.232, 0.32, 1.36, 0.012), tone(coat, -0.12)),
          paint(place(roundBoxGeo(0.05, 0.034, 0.016, 0.01, 1), onBody(0.012, 0, 0.014)), '#ffd23f'),
          paint(ell(onBody(0.13, -0.56, 0.014), [0.03, 0.036, 0.013]), '#8ee86a'),
          paint(ell(onBody(0.07, -0.66, 0.014), [0.038, 0.013, 0.015], [0, -0.66, 0]), '#c3cbe6'),
          paint(ell(onBody(0.078, -0.66, 0.02), [0.017, 0.015, 0.011], [0, -0.66, 0]), '#5ff0ff'),
          paint(ell(onBody(0.15, 0.0, 0.026), [0.032, 0.038, 0.011]), '#b8f0a0'),
          paint(ell(onBody(0.152, -0.12, 0.034), [0.009, 0.013, 0.006], [0, 0, 0.5]), '#1d1430'),
          paint(ell(onBody(0.152, 0.12, 0.034), [0.009, 0.013, 0.006], [0, 0, -0.5]), '#1d1430'),
        ]),
        VM(0.35),
      );
      // 은박모자 밑으로 삐친 부스스한 머리
      const hair = hairPaint('#4e3626');
      headwear(P, 'hunter', () => [
        hairGeo({ col: '#4e3626', f: 0.5, ft: 0.2, tufts: [[-0.4, 0.1, 0.2], [-0.1, 0.13, 0.2], [0.2, 0.1, 0.2], [0.48, 0.08, 0.18]], side: -0.38, back: -0.52, crown: 0.62, t: 0.08 }),
        ...[[-1, 0.0, 1.25], [-1, -0.08, 1.7], [1, 0.0, -1.25], [1, -0.08, -1.7], [-1, 0.06, 0.8], [1, 0.06, -0.8]].map(([sx, y, rz]) => hu(paint(place(coneGeo(0.05, 0.13, 10), [sx * 0.22, y, -0.04], [0, 0, rz]), hair))),
        hu(paint(place(coneGeo(0.055, 0.14, 10), [0, -0.02, -0.25], [-1.3, 0, 0]), hair)),
      ]);
      add(P.head, foilGeo(), VM(0.5, { metal: 0.12, flat: true, env: 0.6, self: 0.1 }), { outline: OLH });
      const dish = new THREE.Group();
      dish.position.set(-0.2, 0.52, -0.27);
      P.torso.add(dish);
      add(dish, dishGeo(), VM(0.4, { side: THREE.DoubleSide }), { rot: [-0.6, 0, 0.35], scale: 1.25, outline: OLS / 1.25 });
      P.items.dish = dish;
      const bino = new THREE.Group();
      P.torso.add(bino);
      add(bino, binoGeo(), VM(0.35), { outline: OLS });
      P.items.bino = bino;
      R.strap = add(P.torso, cg('vleash', () => place(cylGeo(0.008, 0.008, 1, 6), [0, 0.5, 0])), SM('#5a3a22', { rough: 0.6 }), { cast: false });
      P.shockFace = 'j';
    },
    pose(P, st) {
      if (st.shock || st.lk <= 0) return;
      // 쌍안경을 두 손으로 눈에 대고 기체를 쫓는다(들떠서 덜덜)
      headToTorso(P, 0, -0.04, 1.38, _c);
      mix3(st.F, _c.x - 0.09, _c.y - 0.045, _c.z - 0.03, st.lk);
      set3(st.B, lerp(st.B[0], _c.x + 0.09, st.lk), lerp(st.B[1], _c.y - 0.045, st.lk), lerp(st.B[2], _c.z - 0.03, st.lk));
      st.point = 0;
      st.maxF = 1.8;
      st.maxB = 1.8;
      P.torso.rotation.z += Math.sin(st.t * 31) * 0.012 * st.lk;
      P.torso.rotation.x += Math.sin(st.t * 23) * 0.008 * st.lk;
    },
    after(P, st, R) {
      const b = P.items.bino;
      if (st.lk > 0.35 && !st.shock) {
        headToTorso(P, 0, -0.04, 1.38, _c);
        b.position.copy(_c);
        b.position.x += Math.sin(st.t * 37) * 0.003;
        b.position.y += Math.sin(st.t * 29) * 0.003;
        if (st.target) {
          P.torso.updateWorldMatrix(true, false);
          _b.copy(st.target);
          P.torso.worldToLocal(_b);
          _b.sub(_c).normalize();
        } else {
          P.neck.updateMatrix();
          _q.setFromRotationMatrix(P.neck.matrix);
          _b.set(0, 0, 1).applyQuaternion(_q);
        }
        b.quaternion.setFromUnitVectors(ZA, _b);
      } else {
        const sw = st.shock ? Math.sin(st.t * 10.7) * 0.8 : Math.sin(st.ph) * 0.22 * st.walk + Math.sin(st.t * 1.7) * 0.05;
        const L = 0.165;
        b.position.set(Math.sin(sw) * L, 0.2 - Math.cos(sw) * L, bodyR(0.05) * 0.9 + 0.075);
        b.rotation.set(0.2, 0, sw);
      }
      const s = R.strap;
      _a.set(0, 0.2, 0.08);
      s.position.copy(_a);
      _b.copy(b.position).sub(_a);
      const len = _b.length();
      s.quaternion.setFromUnitVectors(UP, _b.divideScalar(len || 1));
      s.scale.set(1, len, 1);
      P.items.dish.rotation.set(0, st.t * (st.shock ? 7 : 1.6), 0);
    },
  },
};

// ───────── 개(시바) ─────────
// 머리는 사람 머리와 같은 펼침의 그림 한 장(털빛 + 흰 볼·주둥이 + 반짝이는 눈 + 흰 눈썹 점 + 코·입)을 입힌다.
// 귀·주둥이도 같은 그림을 비춰 칠하므로 주둥이 끝에 코가, 아래에 입이 그대로 얹힌다.

const DOG_FUR = '#ee8e3a';
const DOG_WHITE = '#fff3e4';

function paintDog(ctx, mode) {
  const s = TS;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  for (let y = 0; y < s; y++) {
    const v = 1 - (y + 0.5) / s;
    const lat = v >= VTOP ? Math.PI / 2 : latOfV(v);
    ctx.fillStyle = mixHex(mixHex(DOG_FUR, '#c8642a', 0.35), mixHex(DOG_FUR, '#ffb466', 0.3), smooth(clamp01((0.9 - lat) / 1.4)));
    ctx.fillRect(0, y, s, 1);
  }
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // 흰 볼·주둥이·턱(가장자리는 부드럽게)
  ctx.fillStyle = DOG_WHITE;
  local(ctx, 0, -0.42);
  ctx.beginPath();
  ctx.ellipse(0, 0, 0.78, 0.46, 0, 0, TAU);
  ctx.fill();
  for (const side of [-1, 1]) {
    local(ctx, side * 0.5, -0.2);
    ctx.beginPath();
    ctx.ellipse(0, 0, 0.32, 0.24, side * 0.4, 0, TAU);
    ctx.fill();
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillRect(0, TY(-0.9), s, s);
  // 흰 눈썹 점
  for (const side of [-1, 1]) {
    local(ctx, side * 0.36, 0.36);
    ctx.beginPath();
    ctx.ellipse(0, 0, 0.09, 0.065, side * -0.2, 0, TAU);
    ctx.fill();
  }
  // 눈
  for (const side of [-1, 1]) {
    local(ctx, side * 0.36, 0.12);
    ctx.strokeStyle = INK;
    ctx.fillStyle = '#1c1030';
    if (mode === 'h') {
      ctx.lineWidth = 0.07;
      ctx.beginPath();
      ctx.moveTo(-0.11, 0.04);
      ctx.quadraticCurveTo(0, -0.12, 0.11, 0.04);
      ctx.stroke();
      continue;
    }
    ctx.beginPath();
    ctx.ellipse(0, 0, 0.1, 0.125, 0, 0, TAU);
    const g = ctx.createLinearGradient(0, -0.125, 0, 0.125);
    g.addColorStop(0, '#120a22');
    g.addColorStop(1, '#5a3468');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-0.035, -0.045, 0.042, 0.05, -0.5, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0.04, 0.05, 0.018, 0, TAU);
    ctx.fill();
    if (mode === 'b') {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.05;
      ctx.beginPath();
      ctx.moveTo(-side * 0.12, -0.2);
      ctx.lineTo(side * 0.12, -0.13);
      ctx.stroke();
    }
  }
  // 코(주둥이 끝)와 입
  local(ctx, 0, -0.17);
  ctx.fillStyle = '#2a1a36';
  ctx.beginPath();
  ctx.moveTo(-0.09, -0.04);
  ctx.quadraticCurveTo(0, -0.08, 0.09, -0.04);
  ctx.quadraticCurveTo(0.06, 0.05, 0, 0.06);
  ctx.quadraticCurveTo(-0.06, 0.05, -0.09, -0.04);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.ellipse(-0.03, -0.035, 0.03, 0.015, 0, 0, TAU);
  ctx.fill();
  local(ctx, 0, -0.31);
  ctx.strokeStyle = '#2a1a36';
  if (mode === 'b') {
    ctx.beginPath();
    ctx.ellipse(0, 0.06, 0.12, 0.11, 0, 0, TAU);
    ctx.fillStyle = MOUTH_IN;
    ctx.fill();
    ctx.lineWidth = 0.03;
    ctx.stroke();
    ctx.fillStyle = TONGUE;
    ctx.beginPath();
    ctx.ellipse(0, 0.12, 0.07, 0.04, 0, 0, TAU);
    ctx.fill();
  } else {
    ctx.fillStyle = TONGUE;
    ctx.beginPath();
    ctx.ellipse(0.02, 0.1, 0.06, 0.09, 0.1, 0, TAU);
    ctx.fill();
    ctx.lineWidth = 0.035;
    ctx.beginPath();
    ctx.moveTo(0, -0.08);
    ctx.lineTo(0, 0.0);
    ctx.moveTo(-0.12, -0.01);
    ctx.quadraticCurveTo(-0.06, 0.06, 0, 0.0);
    ctx.quadraticCurveTo(0.06, 0.06, 0.12, -0.01);
    ctx.stroke();
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

const dogMats = {};
function dogMat(mode) {
  if (!dogMats[mode]) dogMats[mode] = vinylize(new THREE.MeshStandardMaterial({ map: texOnce(`vdog:${mode}`, TS, (ctx) => paintDog(ctx, mode)), roughness: 0.5, envMapIntensity: 0.7 }), 0.15);
  return dogMats[mode];
}

/** 개 머리(단위 구 + 귀 + 주둥이, 같은 그림을 비춰 칠한다). */
function dogHeadGeo() {
  return cg('vdogHead', () => {
    const parts = [headSphere(32, 22).clone()];
    for (const s of [-1, 1]) parts.push(projectUV(place(coneGeo(0.46, 0.82, 14), [s * 0.56, 0.88, -0.1], [-0.1, 0, -s * 0.36], [1, 1, 0.55])));
    parts.push(projectUV(place(sphereGeo(1, 24, 16), [0, -0.36, 0.74], [0, 0, 0], [0.42, 0.29, 0.4])));
    const pp = prep(parts);
    const g = mergeGeometries(pp, false);
    for (const p of pp) p.dispose();
    return g;
  });
}

function buildDog(R) {
  const D = {};
  D.g = new THREE.Group();
  D.g.position.set(0.6, 0, 0.16);
  D.g.rotation.y = Math.PI / 2 - 0.5;
  R.flip.add(D.g);
  D.hop = new THREE.Group();
  D.g.add(D.hop);
  const fur = grad(DOG_FUR, 0.06, 0.26, 0.2, 0.12);
  const white = col(DOG_WHITE);
  add(
    D.hop,
    merged('vdogBody', () => [
      paint(ell([0, 0.155, 0], [0.105, 0.094, 0.152], [0, 0, 0], [26, 18]), (x, y) => (y < 0.118 ? white : fur(x, y))),
      paint(ell([0, 0.172, 0.1], [0.088, 0.088, 0.078], [0, 0, 0], [20, 14]), (x, y, z) => (z > 0.13 && y < 0.2 ? white : fur(x, y))),
      paint(place(torusGeo(0.072, 0.017, 8, 22), [0, 0.218, 0.115], [Math.PI / 2 - 0.7, 0, 0]), '#ff4a3c'),
      paint(place(cylGeo(0.02, 0.02, 0.008, 12), [0, 0.168, 0.17], [Math.PI / 2 - 0.5, 0, 0]), '#ffd23f'),
    ]),
    VM(0.5),
    { outline: OLS },
  );
  // 다리: 대각선 둘씩 한 메시(종종걸음은 대각선 다리가 같이 움직인다). 발은 흰 양말.
  D.legs = [];
  for (const [k, pairs] of [['A', [[-0.058, 0.09], [0.058, -0.09]]], ['B', [[0.058, 0.09], [-0.058, -0.09]]]]) {
    const l = new THREE.Group();
    l.position.set(0, 0.12, 0);
    D.hop.add(l);
    add(l, merged(`vdogLegs${k}`, () => pairs.map(([x, z]) => paint(place(capG(0.036, 0.135, 6, 12), [x, -0.055, z]), (xx, y) => (y < -0.085 ? white : fur(xx, y + 0.12))))), VM(0.5));
    D.legs.push(l);
  }
  D.tail = new THREE.Group();
  D.tail.position.set(0, 0.21, -0.14);
  D.hop.add(D.tail);
  add(D.tail, cg('vdogTail', () => paint(place(torusGeo(0.05, 0.028, 10, 18, Math.PI * 1.45), [0, 0.044, -0.01], [0, Math.PI / 2, -0.5]), (x, y) => (y > 0.07 ? white : fur(x, 0.2)))), VM(0.5));
  D.head = new THREE.Group();
  D.head.position.set(0, 0.265, 0.135);
  D.hop.add(D.head);
  D.headMesh = add(D.head, dogHeadGeo(), dogMat('n'), { scale: [0.105 * 1.06, 0.105 * 0.95, 0.105], outline: OLS / 0.105 });
  D.collar = new THREE.Object3D();
  D.collar.position.set(0, 0.235, 0.15);
  D.hop.add(D.collar);
  R.leash = add(R.flip, cg('vleash', () => place(cylGeo(0.008, 0.008, 1, 6), [0, 0.5, 0])), SM('#ff4a3c', { rough: 0.45 }), { cast: false });
  R.dog = D;
}

function updateDog(R, st) {
  const D = R.dog;
  const { t, walk, shock } = st;
  const ph = t * 11;
  const hop = shock ? Math.abs(Math.sin(t * 9)) * 0.09 : Math.abs(Math.cos(ph)) * 0.014 * walk + Math.abs(Math.sin(t * 4.5)) * 0.006 * (1 - walk);
  D.hop.position.y = hop;
  D.hop.rotation.x = shock ? -0.25 - Math.sin(t * 9) * 0.15 : 0;
  for (let i = 0; i < D.legs.length; i++) D.legs[i].rotation.x = shock ? (i ? 0.3 : -0.3) : Math.sin(ph) * 0.38 * walk * (i ? -1 : 1);
  D.tail.rotation.z = Math.sin(t * (shock ? 26 : 10)) * 0.4;
  const barking = shock && Math.sin(t * 12) > 0;
  D.head.rotation.x = shock ? -0.35 : -st.lk * 0.45 + Math.sin(t * 4.5) * 0.04 * (1 - walk);
  D.head.rotation.y = (Math.sin(t * 1.3) * 0.2 - 0.6) * (1 - walk) * (1 - st.lk) - 0.2 * walk;
  D.head.rotation.z = st.lk * 0.25;
  D.head.scale.set(1, barking ? 1.06 : 1, 1);
  D.headMesh.material = dogMat(barking ? 'b' : st.lk > 0.5 ? 'n' : t % 4.1 < 0.9 ? 'h' : 'n');
  // 목줄: 카메라 쪽 손 → 목걸이
  R.flip.updateMatrixWorld(true);
  R.P.hands[0].getWorldPosition(_a);
  R.flip.worldToLocal(_a);
  D.collar.getWorldPosition(_b);
  R.flip.worldToLocal(_b);
  const L = R.leash;
  L.position.copy(_a);
  _b.sub(_a);
  const len = _b.length();
  L.quaternion.setFromUnitVectors(UP, _b.divideScalar(len || 1));
  L.scale.set(1, len, 1);
}

// ───────── 열기구 ─────────

function balloonTexture() {
  return texOnce(
    'vballoon',
    512,
    (ctx, w, h) => {
      const n = 16;
      for (let i = 0; i < n; i++) {
        const g = ctx.createLinearGradient((i * w) / n, 0, ((i + 1) * w) / n, 0);
        const c = i % 2 ? '#ffd23f' : '#ff4f43';
        g.addColorStop(0, tone(c, -0.1));
        g.addColorStop(0.5, c);
        g.addColorStop(1, tone(c, -0.1));
        ctx.fillStyle = g;
        ctx.fillRect((i * w) / n, 0, w / n + 1, h);
      }
      ctx.fillStyle = '#fbf6ee';
      ctx.fillRect(0, h * 0.05, w, h * 0.07);
      ctx.fillStyle = '#3f74e0';
      ctx.fillRect(0, h * 0.5, w, h * 0.1);
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 8; i++) {
        const x = (i + 0.5) * (w / 8);
        const y = h * 0.55;
        ctx.beginPath();
        for (let k = 0; k < 10; k++) {
          const r = k % 2 ? 9 : 22;
          const a = -Math.PI / 2 + (k * Math.PI) / 5;
          ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.5);
        }
        ctx.fill();
      }
    },
    {},
  );
}
function wickerTexture() {
  return texOnce('vwicker', 128, (ctx, w) => {
    ctx.fillStyle = '#d0925a';
    ctx.fillRect(0, 0, w, w);
    const row = 16;
    for (let y = 0; y < w; y += row) {
      for (let x = 0; x < w; x += 16) {
        const off = (y / row) % 2 ? 8 : 0;
        ctx.fillStyle = 'rgba(255,232,186,0.45)';
        ctx.beginPath();
        ctx.ellipse(x + off + 8, y + row / 2, 7, 5.5, 0, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = 'rgba(110,60,24,0.55)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  });
}

const PILOT = 0.8; // 조종사 크기
const PILOT_Y = 0.07; // 조종사 발밑(바구니 안)

/** 머리 표면 한 점(경도·위도·반지름) 위에 바깥을 보게 놓기. */
function onHead(lon, lat, r) {
  const d = dirOf(lon, lat);
  const p = d.clone().multiply(HS).multiplyScalar(r);
  const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(ZA, d));
  return [[p.x, p.y, p.z], [e.x, e.y, e.z]];
}

function buildBalloonist() {
  const L = {
    hs: 1.05,
    skin: '#f6c29c',
    top: '#9a6238',
    cuff: '#fff1d6',
    glove: '#8a5228',
    face: { skin: '#f6c29c', iris: '#2f9ab4', brow: [0.05, -0.02, 0.04, 0.09, 0.21], browCol: '#5a3522', mouth: 'grin', blush: 1.05 },
  };
  const R = { type: 'balloonist', seed: 2.3 };
  R.root = new THREE.Group();
  R.root.name = 'watcher:balloonist';
  R.flip = new THREE.Group();
  R.root.add(R.flip);
  R.ride = new THREE.Group();
  R.ride.rotation.y = 0.35;
  R.flip.add(R.ride);
  // 바구니
  add(R.ride, roundBoxGeo(0.38, 0.25, 0.34, 0.045, 4), vinylize(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.75, map: wickerTexture() })), { pos: [0, 0.125, 0], outline: OL });
  add(
    R.ride,
    merged('vbasketRim', () => [
      paint(place(roundBoxGeo(0.42, 0.06, 0.38, 0.03, 3), [0, 0.262, 0]), grad('#9a5e36', 0.24, 0.29, 0.22, 0.14)),
      paint(place(roundBoxGeo(0.4, 0.035, 0.36, 0.017, 2), [0, 0.018, 0]), '#6a3c22'),
      paint(ell([-0.205, 0.15, 0.08], [0.042, 0.052, 0.042]), '#ecd8a8'),
      paint(ell([-0.205, 0.14, -0.07], [0.038, 0.048, 0.038]), '#e0c890'),
    ]),
    VM(0.5),
    { outline: OLS },
  );
  // 밧줄 + 버너 + 작은 깃발 줄
  add(
    R.ride,
    merged('vropes', () => {
      const steel = grad('#c9d0ec', 0.78, 0.86, 0.2, 0.15);
      const parts = [
        paint(rodGeo([-0.19, 0.28, 0.16], [-0.14, 1.0, 0.12], 0.008), '#8a6a4a'),
        paint(rodGeo([0.19, 0.28, 0.16], [0.14, 1.0, 0.12], 0.008), '#8a6a4a'),
        paint(rodGeo([-0.19, 0.28, -0.16], [-0.14, 1.0, -0.12], 0.008), '#8a6a4a'),
        paint(rodGeo([0.19, 0.28, -0.16], [0.14, 1.0, -0.12], 0.008), '#8a6a4a'),
        paint(place(cylGeo(0.052, 0.046, 0.05, 16), [0, 0.81, 0]), steel),
        paint(place(torusGeo(0.11, 0.01, 8, 28), [0, 0.835, 0], [Math.PI / 2, 0, 0]), steel),
      ];
      const flags = ['#3f74e0', '#ffd23f', '#5cc85a', '#ff8fb8'];
      for (let i = 0; i < 4; i++) {
        const k = 0.25 + i * 0.17;
        parts.push(paint(place(coneGeo(0.034, 0.066, 3), [lerp(-0.19, -0.14, k) - 0.024, lerp(0.28, 1.0, k) - 0.02, lerp(0.16, 0.12, k)], [0, 0, Math.PI / 2 + 0.3], [1, 1, 0.25]), flags[i]));
      }
      return parts;
    }),
    VM(0.45),
  );
  R.flame = add(R.ride, cg('vflame', () => place(coneGeo(0.038, 0.13, 12), [0, 0.065, 0])), SM('#ffa04a', { emissive: '#ff7a1c', emissiveIntensity: 2.4, self: 0 }), { pos: [0, 0.835, 0], cast: false });
  R.glow = glowSprite('#ffb04a', 0.36, 0.75);
  R.glow.position.set(0, 0.88, 0);
  R.ride.add(R.glow);
  // 풍선
  add(R.ride, lathe('vskirt', [[0.085, 0.915], [0.1, 0.945], [0.135, 0.985]], { smoothIt: false, seg: 24 }), vinylize(new THREE.MeshStandardMaterial({ color: '#c8382e', roughness: 0.6, side: THREE.DoubleSide })));
  add(
    R.ride,
    lathe('venvelope', [[0.13, 0.975], [0.2, 1.03], [0.3, 1.11], [0.4, 1.21], [0.452, 1.33], [0.464, 1.43], [0.45, 1.54], [0.396, 1.64], [0.29, 1.715], [0.15, 1.748], [0, 1.755]], { seg: 56, n: 40 }),
    vinylize(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.38, map: balloonTexture(), envMapIntensity: 0.9 })),
    { outline: OL },
  );
  // 조종사(작은 사람: 가슴 위만 바구니 밖으로)
  R.pilot = new THREE.Group();
  R.pilot.position.set(0, PILOT_Y, 0.0);
  R.pilot.scale.setScalar(PILOT);
  R.ride.add(R.pilot);
  const P = buildPerson(R.pilot, 'balloonist', L, { legs: false });
  R.P = P;
  const g = grad('#9a6238', 0.0, 0.22, 0.22, 0.12);
  add(
    P.torso,
    merged('vflightJacket', () => [
      paint(bodyGeo(), g),
      ...shoulderCaps('#9a6238', 0.076),
      paint(place(fluffyRing('vjacketCollar', 0.1, 0.04, 11), [0, 0.214, 0.006], [Math.PI / 2 + 0.15, 0, 0]), grad('#fff3dc', 0.18, 0.26, 0.15, 0)),
      paint(place(torusGeo(0.11, 0.034, 10, 28), [0, 0.19, 0.01], [Math.PI / 2 + 0.2, 0, 0]), grad('#ff4a3c', 0.16, 0.22, 0.2, 0.1)),
    ]),
    VM(0.45),
    { outline: OL },
  );
  R.scarf = new THREE.Group();
  R.scarf.position.set(0.07, 0.19, -0.08);
  P.torso.add(R.scarf);
  add(R.scarf, merged('vscarfTail', () => [paint(place(capG(0.034, 0.25, 8), [0.1, 0, -0.04], [0, 0, Math.PI / 2], [1, 1, 0.5]), (x) => (x > 0.19 ? col('#ffd23f') : col('#ff4a3c'))), paint(place(capG(0.032, 0.17, 6), [0.08, -0.05, -0.02], [0, 0, Math.PI / 2 - 0.5], [1, 1, 0.5]), (x) => (x > 0.14 ? col('#ffd23f') : col('#ff4a3c')))]), VM(0.5), { outline: OLS });
  headwear(P, 'balloonist', () => {
    const lea = grad('#a8683c', -0.15, 0.28, 0.22, 0.14);
    const parts = [
      hairGeo({ col: '#8a4a2a', f: 0.46, ft: 0.15, tufts: [[-0.25, 0.1, 0.25], [0.15, 0.12, 0.28]], side: -0.2, back: -0.35, t: 0.06 }),
      hu(paint(ell([0, 0.04, -0.03], [0.262, 0.252, 0.258], [0, 0, 0], [36, 24]), lea)),
      hu(paint(ell([-0.215, -0.1, 0.03], [0.062, 0.112, 0.078], [0, 0, 0.15]), lea)),
      hu(paint(ell([0.215, -0.1, 0.03], [0.062, 0.112, 0.078], [0, 0, -0.15]), lea)),
    ];
    for (const sx of [-1, 1]) {
      const [p, r] = onHead(sx * 0.26, 0.6, 1.13);
      parts.push(paint(place(torusGeo(0.21, 0.065, 10, 24), p, r), grad('#d6dcf2', 0.4, 0.9, 0.2, 0.2)));
      parts.push(paint(place(sphereGeo(1, 16, 10), p, r, [0.19, 0.19, 0.07]), '#8fe8ff'));
    }
    return parts;
  });
  R.topY = 1.755;
  R.headY = PILOT_Y + (HIP + NECK + HEAD_C) * PILOT;
  return R;
}

function updateBalloonist(R, pose) {
  const P = R.P;
  const st = poseState(pose, R);
  const { t, shock, wave, lk } = st;
  R.flip.scale.x = st.dir;
  R.ride.position.y = Math.sin(t * 1.2) * 0.03;
  R.ride.rotation.z = Math.sin(t * 0.9) * 0.03 + (shock ? Math.sin(t * 7.4) * 0.05 : 0);
  const fl = 1 + Math.sin(t * 17) * 0.25 + Math.sin(t * 31) * 0.1;
  R.flame.scale.set(1, fl, 1);
  R.glow.material.opacity = 0.55 + Math.sin(t * 23) * 0.15;
  R.scarf.rotation.set(Math.sin(t * 5.3) * 0.25, Math.sin(t * 3.1) * 0.2, Math.sin(t * 6.7) * 0.3 - 0.2);
  aimAt(R.root, R.flip, pose.target, R.headY, st.aim);
  if (shock) swingState(st, R.seed);
  const foc = shock ? 0.75 : wave ? 0.5 : lk;
  const elev = clamp(st.aim.elev, 0.15, 1.25);
  const br = Math.sin(t * 2.3);
  P.base.position.set(0, shock ? st.sw.hop * 0.4 : wave ? Math.abs(Math.sin(t * 5)) * 0.02 : 0, 0);
  P.base.rotation.set(0, 0, shock ? st.sw.lean * 0.6 : lk * 0.04);
  const sy = shock ? st.sw.sq : 1 + br * 0.012;
  P.base.scale.set(1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy));
  const bodyYaw = lerp(YAW - 0.35, st.aim.yaw * 0.5 - 0.2, foc);
  P.body.rotation.set(0, bodyYaw, 0);
  P.torso.rotation.set(-lk * elev * 0.1, 0, 0);
  P.torso.scale.set(1, 1 + br * 0.015, 1);
  const yawRel = clamp(st.aim.yaw - bodyYaw - 0.35, -0.75, 0.75) * foc * 0.7;
  const pitch = foc * elev * (shock ? 0.22 : 0.3);
  const idle = st.idle;
  P.neck.rotation.set(-pitch + Math.sin(t * 1.3) * 0.03, yawRel + Math.sin(t * 0.55 + 1) * 0.2 * idle, Math.sin(t * 1.7) * 0.05 * idle + lk * 0.1 + (shock ? Math.sin(t * 17) * 0.05 : 0));
  // 손: 평소엔 바구니 테를 잡는다(조종사 몸통 기준)
  const rimY = (0.29 - PILOT_Y) / PILOT - HIP;
  set3(st.F, -0.22, rimY, 0.19);
  set3(st.B, 0.22, rimY, 0.19);
  for (const sh of P.arms) sh.position.copy(sh.userData.base);
  if (shock) armToward(P, 1, st.sw.h, ARM * 1.3, 0.25, st.B);
  else if (wave) waveArm(P, st);
  else if (lk > 0) pointUp(P, st, lk);
  reach(P, 0, st.F, 1.6);
  reach(P, 1, st.B, st.maxB || 1.7);
  placeFinger(P, st);
  if (shock) holdNet(P, P.net, 1, st.sw.a, st.sw.v);
  else P.net.visible = false;
  pickFace(P, st, R.seed);
}

// ───────── 우주비행사 ─────────

function buildAstronaut() {
  const SUIT = '#f0f2fa';
  const ACC = '#ff7a3c';
  const L = { skin: '#d39a6c', top: SUIT, cuff: ACC, glove: ACC, legs: SUIT, shoe: '#d6daf0', sole: '#5a6290', boot: true, trim: ACC, face: { skin: '#d39a6c', iris: '#6a4424', brow: [0.05, 0.02, 0.045, 0.08, 0.2], browCol: '#2a2130', mouth: 'grin', lookMouth: 'o', blush: 1.05 } };
  const R = { type: 'astronaut', seed: 1.1 };
  R.root = new THREE.Group();
  R.root.name = 'watcher:astronaut';
  R.flip = new THREE.Group();
  R.root.add(R.flip);
  R.drift = new THREE.Group();
  R.flip.add(R.drift);
  // 사람 뼈대를 그대로 쓰되 몸 중심이 원점이 되게 내린다(발 −0.45 … 헬멧 꼭대기 ≈ +0.48)
  R.suit = new THREE.Group();
  R.suit.position.y = -0.45;
  R.drift.add(R.suit);
  const P = buildPerson(R.suit, 'astronaut', L);
  R.P = P;
  const g = grad(SUIT, -0.09, 0.22, 0.16, 0.02);
  add(
    P.torso,
    merged('vsuitBody', () => [
      paint(place(lathe('vsuitL', [[0, -0.088], [0.11, -0.086], [0.16, -0.062], [0.178, -0.01], [0.176, 0.06], [0.162, 0.13], [0.134, 0.185], [0.094, 0.222], [0.046, 0.238], [0, 0.24]], { seg: 40, n: 30 }), [0, 0, 0], [0, 0, 0], [1, 1, 0.92]), (x, y) => (Math.abs(y + 0.01) < 0.02 ? col('#bcc2dc') : g(x, y))),
      ...shoulderCaps(SUIT, 0.08),
      paint(place(torusGeo(0.12, 0.038, 12, 32), [0, 0.218, 0], [Math.PI / 2, 0, 0]), '#ccd0e8'),
      paint(place(roundBoxGeo(0.27, 0.29, 0.13, 0.055, 4), [0, 0.11, -0.18]), grad('#d8dcf0', -0.03, 0.25, 0.16, 0.03)),
    ]),
    VM(0.45),
    { outline: OL },
  );
  add(
    P.torso,
    roundBoxGeo(0.13, 0.085, 0.03, 0.014, 2),
    vinylize(
      new THREE.MeshStandardMaterial({
        roughness: 0.35,
        map: texOnce('vpanel', 64, (ctx) => {
          ctx.fillStyle = '#3f74e0';
          ctx.fillRect(0, 0, 64, 64);
          for (const [x, c] of [[14, '#ff7a5c'], [32, '#ffd23f'], [50, '#5fe0c8']]) {
            ctx.fillStyle = c;
            ctx.beginPath();
            ctx.arc(x, 24, 7, 0, TAU);
            ctx.fill();
          }
          ctx.fillStyle = '#9fe8ff';
          ctx.fillRect(10, 40, 44, 6);
        }),
        emissive: new THREE.Color('#ffffff'),
        emissiveIntensity: 0.25,
      }),
    ),
    { pos: [0, 0.09, 0.15], rot: [-0.12, 0, 0] },
  );
  // 헬멧: 앞이 뚫린 흰 껍데기 + 유리 + 주황 테. 머리는 조금 줄여 안에 넣는다.
  P.head.scale.setScalar(HR * 0.97);
  const helm = new THREE.Group();
  helm.position.y = HEAD_C;
  P.neck.add(helm);
  const HELM = 0.34;
  const OPEN = 1.0;
  add(
    helm,
    merged('vhelmet', () => [
      paint(place(new THREE.SphereGeometry(HELM, 44, 30, 0, TAU, OPEN, Math.PI - OPEN), [0, 0.01, 0], [Math.PI / 2, 0, 0]), grad(SUIT, -0.3, 0.3, 0.16, 0.02)),
      paint(place(torusGeo(HELM * Math.sin(OPEN), 0.022, 12, 44), [0, 0.01, HELM * Math.cos(OPEN)]), ACC),
      paint(place(cylGeo(0.07, 0.07, 0.05, 18), [-HELM + 0.012, 0.0, -0.02], [0, 0, Math.PI / 2]), '#d8dcf0'),
      paint(place(cylGeo(0.07, 0.07, 0.05, 18), [HELM - 0.012, 0.0, -0.02], [0, 0, Math.PI / 2]), '#d8dcf0'),
      paint(place(cylGeo(0.009, 0.007, 0.12, 6), [HELM * 0.62, HELM * 0.78, -0.06], [0, 0, -0.6]), '#8a919f'),
      paint(ell([HELM * 0.62 + 0.04, HELM * 0.78 + 0.05, -0.06], [0.02, 0.02, 0.02]), '#ff4a3c'),
    ]),
    VM(0.35),
    { outline: OL },
  );
  const visor = add(
    helm,
    cg('vvisor', () => place(new THREE.SphereGeometry(HELM - 0.004, 36, 14, 0, TAU, 0, OPEN + 0.03), [0, 0.01, 0], [Math.PI / 2, 0, 0])),
    new THREE.MeshStandardMaterial({ color: '#b8ecff', transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0.1, envMapIntensity: 1.3, depthWrite: false }),
    { cast: false },
  );
  visor.renderOrder = 4;
  const glint = add(helm, cg('vglintH', () => place(torusGeo(0.24, 0.014, 6, 24, 0.9), [0, 0.01, 0.2], [0, 0, 2.0], [1, 1, 0.5])), basicGlint(), { cast: false });
  glint.renderOrder = 5;
  headwear(P, 'astronaut', () => [hairGeo({ col: '#2e2434', f: 0.46, ft: 0.2, part: 0.2, tufts: [[-0.25, 0.12, 0.35], [0.3, 0.06, 0.25]], side: -0.2, back: -0.4, t: 0.06 })], { outline: 0 });
  // 생명줄(등 → 아래 뒤쪽으로 길게)
  add(
    R.drift,
    cg('vtether', () => {
      const c = new THREE.CatmullRomCurve3([[0.0, -0.32, -0.2], [-0.25, -0.55, -0.32], [-0.2, -0.95, -0.3], [-0.55, -1.35, -0.35], [-0.75, -1.9, -0.4]].map((p) => new THREE.Vector3(...p)));
      return new THREE.TubeGeometry(c, 40, 0.02, 8, false);
    }),
    SM('#e6e8f4', { rough: 0.5 }),
  );
  P.shockFace = 'g';
  R.topY = -0.45 + HIP + NECK + HEAD_C + 0.01 + HELM;
  R.headY = -0.45 + HIP + NECK + HEAD_C;
  return R;
}

function updateAstronaut(R, pose) {
  const P = R.P;
  const st = poseState(pose, R);
  const { t, shock, wave, lk, walk } = st;
  R.flip.scale.x = st.dir;
  R.drift.position.y = Math.sin(t * 1.1) * 0.03;
  R.drift.rotation.set(shock ? -0.1 : 0, 0, Math.sin(t * 1.4) * 0.1 - (shock ? 0.15 + Math.sin(t * 6) * 0.06 : 0));
  aimAt(R.root, R.flip, pose.target, R.headY, st.aim);
  const foc = shock ? 1 : wave ? 0.5 : lk;
  const elev = clamp(st.aim.elev, -0.3, 1.25);
  const br = Math.sin(t * 2);
  P.base.position.set(0, 0, 0);
  P.base.rotation.set(0, 0, 0);
  P.base.scale.setScalar(1);
  const bodyYaw = lerp(0.3, st.aim.yaw * 0.5 + 0.05, foc);
  P.body.rotation.set(0, bodyYaw, 0);
  P.torso.rotation.set(-foc * elev * 0.12, 0, 0);
  P.torso.scale.set(1, 1 + br * 0.012, 1);
  for (let i = 0; i < P.legs.length; i++) {
    const s = i ? 1 : -1;
    const l = P.legs[i];
    l.rotation.set(Math.sin(t * 1.9 + s) * 0.18 + (walk ? Math.sin(t * 3 + s * 1.5) * 0.3 * walk : 0) + (shock ? 0.3 + Math.sin(t * 9 + s) * 0.25 : 0), 0, s * (0.12 + (shock ? 0.2 : 0)));
  }
  const yawRel = clamp(st.aim.yaw - bodyYaw, -0.75, 0.75) * foc * 0.7;
  const pitch = foc * elev * (shock ? 0.3 : 0.32);
  P.neck.rotation.set(-pitch + Math.sin(t * 1.2) * 0.03, yawRel, Math.sin(t * 1.5) * 0.04);
  for (const sh of P.arms) sh.position.copy(sh.userData.base);
  const swim = Math.sin(t * 1.7);
  set3(st.F, -0.24, 0.02 + swim * 0.04, 0.08);
  set3(st.B, 0.24, 0.0 - swim * 0.04, 0.06);
  if (shock) {
    pointUp(P, st, 1);
    armToward(P, 0, 0.6 + Math.sin(t * 13) * 0.35, ARM * 1.25, 0.4, st.F);
  } else if (lk > 0) pointUp(P, st, lk);
  else if (wave) waveArm(P, st);
  reach(P, 0, st.F, 1.5);
  reach(P, 1, st.B, st.maxB || 1.7);
  placeFinger(P, st);
  P.net.visible = false;
  pickFace(P, st, R.seed);
}

let glintMat = null;
function basicGlint() {
  if (!glintMat) glintMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.75, depthWrite: false });
  return glintMat;
}

// ───────── 만들기 ─────────

const topCache = new Map();

/**
 * 지구인 한 명을 만든다.
 * @param {string} type WATCHER_TYPES 중 하나
 * @returns {{ root: THREE.Object3D, update(pose): void, headWorld(out: THREE.Vector3): THREE.Vector3, topY: number }}
 *   pose = { t, dir(-1|1 걷는 방향), walk(0..1), look(0..1), shock(bool), wave(bool), target?(기체의 월드 위치), umbrella?(0..1), flashlight?(0..1) }
 */
export function createWatcher(type) {
  let R;
  let update;
  if (type === 'balloonist') {
    R = buildBalloonist();
    update = (p) => updateBalloonist(R, p);
  } else if (type === 'astronaut') {
    R = buildAstronaut();
    update = (p) => updateAstronaut(R, p);
  } else {
    const kind = DEFS[type] ? type : 'farmer';
    const def = DEFS[kind];
    R = { type: kind, seed: WATCHER_TYPES.indexOf(kind) * 0.77 };
    R.root = new THREE.Group();
    R.root.name = `watcher:${kind}`;
    R.flip = new THREE.Group();
    R.root.add(R.flip);
    const P = buildPerson(R.flip, kind, def.L);
    R.P = P;
    def.build(P, R);
    R.def = {
      pose: def.pose,
      after: def.after ? (PP, st) => def.after(PP, st, R) : null,
      lookPitch: def.lookPitch,
      fprop: def.fprop,
      hunch: def.hunch,
      scan: def.scan,
      step: def.step,
      celebrate: def.celebrate,
      leanBack: def.leanBack,
      umbY: def.umbY ?? 0.38,
    };
    buildExtras(P, kind);
    update = (p) => updateGround(R, p);
  }
  const pose0 = { t: 0, dir: 1, walk: 0, look: 0 };
  update(pose0);
  if (R.topY === undefined) {
    if (!topCache.has(R.type)) {
      R.root.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(R.P.head);
      _a.setFromMatrixPosition(R.root.matrixWorld);
      topCache.set(R.type, box.max.y - _a.y);
    }
    R.topY = topCache.get(R.type);
  }
  const skull = R.P.skull;
  return {
    root: R.root,
    update,
    headWorld(out) {
      skull.updateWorldMatrix(true, false);
      return out.setFromMatrixPosition(skull.matrixWorld);
    },
    topY: R.topY,
  };
}
