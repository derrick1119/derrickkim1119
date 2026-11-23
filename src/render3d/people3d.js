// 3D 지구인(하늘을 올려다보는 구경꾼) 11종. 슈퍼셀풍 꼬마 3D 카툰 인물.
//
// 짜임
//   · 머리가 키의 절반을 넘는 꼬마 비율: 큰 머리(HS 배로 키움)·통통한 몸통·짧은 다리·큰 주먹손·큰 신발.
//   · 얼굴은 캔버스 그림(faceCap). 표정(보통·깜빡·올려다봄·고함 둘·웃음·깜짝)마다 한 장씩 그려 두고 갈아 끼운다.
//     인물마다 눈동자 색·눈썹 모양·눈꺼풀·입 모양이 달라 성격이 보이게 한다.
//   · 옷·신발·머리카락·소품은 정점 색(paint)으로 여러 색을 한 메시에 칠한다. 아래는 어둡고 위는 밝은 명암, 밑단·띠·밑창 같은
//     두 색 장식을 메시 수를 늘리지 않고 넣는다.
//   · 한 벌만 만들고 걷는 방향(dir)에 따라 좌우를 뒤집는다(flip.scale.x = dir). 뒤집힌 틀 안에서 인물은 늘 +x(기체 쪽)로
//     3/4 돌아서 있다. 기체 쪽 팔(로컬 +x, 손 1)이 몸짓(가리키기·잠자리채·손 인사)을 맡고, 카메라 쪽 팔(로컬 −x, 손 0)이
//     소품을 든다. 머리가 커서 팔은 머리 옆 바깥으로만 들어 올린다(얼굴을 가리지 않게).
//   · 뼈대: flip → base(화면 평면 기울기·튀어 오르기·찌그러짐, 발밑 기준) → body(몸 방향) → torso(엉덩이) → neck → head.
//   · 원점: 보통 사람은 발밑 가운데(키 ≈ 1.0), 열기구는 바구니 바닥 가운데(≈ 1.75), 우주비행사는 몸 중심(≈ 0.9).
//   · update 에서는 도형·재질·배열을 만들지 않는다. 같은 종류를 풀에서 돌려 쓰므로 움직이는 부품은 매번 전부 다시 놓는다.
import { THREE, mat, mesh, sphereGeo, cylGeo, coneGeo, torusGeo, roundBoxGeo, addOutline, glowSprite, canvasTexture, faceTexture, faceCap, tone } from './kit.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** 지구인 종류(게임 순서). */
export const WATCHER_TYPES = ['farmer', 'kid', 'walker', 'camper', 'fisher', 'worker', 'streamer', 'astronomer', 'photographer', 'balloonist', 'astronaut', 'hunter'];

const TAU = Math.PI * 2;
// 뼈대(발밑 기준, 1 = 64px)
const HIP = 0.19; // 다리 관절 높이 = 몸통 원점
const NECK = 0.206; // 몸통 원점 → 목(머리가 도는 곳)
const HEAD_C = 0.236; // 목 → 머리 중심
const HS = 1.12; // 머리 확대(머리에 붙는 것은 반지름 HR 기준으로 만들고 통째로 키운다)
const HR = 0.24; // 머리 반지름(확대 전)
const SHX = 0.142; // 어깨(몸통 기준)
const SHY = 0.166;
const ARM = 0.19; // 어깨 → 손 중심
const LEG_X = 0.08;
const FOOT_C = -0.125; // 다리 관절 → 신발 가운데
const SOLE_Y = -0.178; // 다리 관절 → 납작한 밑창
const YAW = 0.55; // 평소 3/4 돌아선 각
const FACE_A = 1.7; // 얼굴 그림이 덮는 각(가로·세로 같게 해서 그림의 원이 머리에서도 원이 되게)
const FK = 256 / FACE_A; // 얼굴 그림 px / 라디안
const OL = 0.02; // 외곽선(머리·몸통·모자: 실루엣)
const OLS = 0.014; // 외곽선(팔다리·소품)

const clamp01 = (v) => Math.min(1, Math.max(0, v || 0));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (k) => k * k * (3 - 2 * k);
const frac = (v) => v - Math.floor(v);

const DOWN = new THREE.Vector3(0, -1, 0);
const UP = new THREE.Vector3(0, 1, 0);
const XA = new THREE.Vector3(1, 0, 0);
const ZA = new THREE.Vector3(0, 0, 1);
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _qi = new THREE.Quaternion();
const _m = new THREE.Matrix4();
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
function rodGeo(a, b, r0, r1 = r0, seg = 8) {
  const A = new THREE.Vector3(...a);
  const B = new THREE.Vector3(...b);
  const d = B.clone().sub(A);
  const len = d.length();
  const g = new THREE.CylinderGeometry(r1, r0, len, seg, 1, false);
  const q = new THREE.Quaternion().setFromUnitVectors(UP, d.normalize());
  g.applyMatrix4(new THREE.Matrix4().compose(A.add(B).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
  return g;
}

/** 여러 도형을 하나로 합친 도형(캐시). make() 는 새로 만든(복제한) 도형 목록을 돌려준다. */
function merged(key, make) {
  return cg(key, () => {
    let parts = make();
    if (parts.some((p) => !p.index)) parts = parts.map((p) => (p.index ? p.toNonIndexed() : p));
    const g = mergeGeometries(parts, false);
    if (!g) throw new Error(`people3d: merge failed (${key})`);
    for (const p of parts) p.dispose();
    return g;
  });
}

/** 옆모습 [[r, y], ...] 을 부드러운 곡선으로 이어 돌린 도형. phi 범위를 주면 앞판(부분 껍질)이 된다. */
function lathe(key, pts, { seg = 32, n = 26, phiStart = 0, phiLength = TAU, smoothIt = true } = {}) {
  return cg(`lathe:${key}`, () => {
    // 옆모습은 아래 → 위 순서여야 면이 바깥을 본다
    const src = pts[0][1] > pts[pts.length - 1][1] ? [...pts].reverse() : pts;
    let v = src.map(([r, y]) => new THREE.Vector2(r, y));
    if (smoothIt) v = new THREE.SplineCurve(v).getPoints(n);
    for (const p of v) p.x = Math.max(0, p.x);
    return new THREE.LatheGeometry(v, seg, phiStart, phiLength);
  });
}

/** 캡슐(길이 방향으로도 나눠서 정점 색 띠를 칠할 수 있게). 전체 길이 len, y 축, 가운데 원점. */
const capG = (r, len, hseg = 8, radial = 16) => cg(`cap${r}|${len}|${hseg}|${radial}`, () => new THREE.CapsuleGeometry(r, Math.max(0.001, len - 2 * r), 6, radial, hseg));

/** 구를 늘려 만든 타원체(합치기용). 나눔 수를 주지 않으면 크기에 맞춰 고른다(작은 단추는 거칠게). */
function ell(pos, r, rot = [0, 0, 0], seg = null, order = 'XYZ') {
  const big = Array.isArray(r) ? Math.max(...r) : r;
  const sg = seg || (big < 0.03 ? [10, 8] : big < 0.06 ? [14, 10] : [20, 14]);
  return place(sphereGeo(1, sg[0], sg[1]), pos, rot, r, order);
}

/** 얼굴 그림 좌표(px, 가운데 0) → 머리 중심 기준 3D 점(반지름 rr). */
function onFace(px, py, rr = HR) {
  const ax = px / FK;
  const ay = py / FK;
  return [Math.sin(ax) * Math.cos(ay) * rr, -Math.sin(ay) * rr, Math.cos(ax) * Math.cos(ay) * rr];
}
/** +z 를 얼굴 그림의 (px, py) 방향으로 돌리는 회전(order YXZ 로 쓴다). */
const faceRot = (px, py, roll = 0) => [py / FK, px / FK, roll];

/** 한 번만 만드는 텍스처. */
const texCache = new Map();
function texOnce(key, make) {
  let t = texCache.get(key);
  if (!t) texCache.set(key, (t = make()));
  return t;
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

/**
 * 정점 색 칠하기(복제본). c = '#rrggbb'·THREE.Color 단색, 또는 fn(x, y, z, ny) → THREE.Color(돌려준 색은 바로 복사한다).
 * 칠한 도형끼리는 색이 달라도 한 메시로 합칠 수 있다(재질 VM).
 */
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
function grad(hex, y0, y1, dark = 0.2, light = 0.07) {
  const lo = col(tone(hex, -dark));
  const mid = col(hex);
  const hi = col(tone(hex, light));
  return (x, y) => {
    const k = clamp01((y - y0) / (y1 - y0));
    return k < 0.6 ? _pc.copy(lo).lerp(mid, k / 0.6) : _pc.copy(mid).lerp(hi, (k - 0.6) / 0.4);
  };
}

const vmats = new Map();
/** 정점 색 재질(색은 도형에 칠한다). 캐시됨 — 수정하지 말 것. */
function VM(rough = 0.78, metal = 0) {
  const key = `${rough}|${metal}`;
  let m = vmats.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: rough, metalness: metal, envMapIntensity: 0.6 });
    vmats.set(key, m);
  }
  return m;
}

// 재질: 무광 점토/플라스틱(단색)
const M = (c, o = {}) => mat(c, { rough: 0.78, ...o });

/** 메시를 붙인다(외곽선 선택). */
function add(parent, geo, material, { pos, rot, scale, outline = 0, cast = true } = {}) {
  const m = mesh(geo, material, { cast, pos, rot, scale });
  if (outline) addOutline(m, outline);
  parent.add(m);
  return m;
}

// ───────── 공통 도형 ─────────

/** 머리 + 귀(피부색, 턱 아래는 살짝 어둡게). 코는 외곽선 없이 따로(headNoseGeo). */
function headGeo(L) {
  return merged(`head|${L.skin}`, () => {
    const skin = col(L.skin);
    const jaw = col(tone(L.skin, -0.12));
    const ear = col(tone(L.skin, -0.04));
    return [
      paint(place(sphereGeo(HR, 36, 26)), (x, y) => (y < -0.1 ? _pc.copy(skin).lerp(jaw, clamp01((-0.1 - y) / 0.13)) : skin)),
      paint(ell([-0.226, -0.025, -0.012], [0.046, 0.062, 0.036], [0, 0, 0.2]), ear),
      paint(ell([0.226, -0.025, -0.012], [0.046, 0.062, 0.036], [0, 0, -0.2]), ear),
    ];
  });
}
/** 발그레한 코(위는 밝게). */
function noseGeo(L) {
  const nose = L.nose || 1;
  return cg(`nose|${L.skin}|${nose}`, () => {
    const c = grad(col(L.skin).clone().lerp(col('#ff7466'), 0.2).getHexString().replace(/^/, '#'), -0.03, 0.03, 0.1, 0.12);
    return paint(ell([0, 0, 0], [0.038 * nose, 0.031 * nose, 0.034 * nose], [0, 0, 0], [18, 14]), c);
  });
}

/** 팔(어깨 → 손, −y 방향). 반소매는 위만 옷색, 긴소매는 손목에 소매단. */
function armGeo(L) {
  const top = L.arm || L.top;
  const short = L.sleeve === 'short';
  const cuff = L.cuff || tone(top, -0.18);
  return cg(`arm|${top}|${short}|${L.skin}|${cuff}`, () => {
    const g = grad(top, -0.2, 0.02, 0.14, 0.06);
    const skin = col(L.skin);
    const cf = col(cuff);
    return paint(place(capG(0.05, 0.215, 6, 14), [0, -0.09, 0]), (x, y) => (short ? (y > -0.07 ? g(x, y) : skin) : y < -0.16 ? cf : g(x, y)));
  });
}

/** 큰 주먹손(엄지가 앞 +z). */
const handGeo = (color) =>
  merged(`hand|${color}`, () => {
    const g = grad(color, -0.07, 0.06, 0.12, 0.05);
    return [paint(ell([0, -0.006, 0], [0.074, 0.078, 0.07], [0, 0, 0], [18, 13]), g), paint(ell([0, 0.014, 0.056], [0.028, 0.036, 0.028], [0.5, 0, 0], [12, 10]), g)];
  });
/** 가리키는 손가락(손 중심에서 −y 로 뻗는다). */
const fingerGeo = (color) => cg(`finger|${color}`, () => paint(place(capG(0.024, 0.1, 2, 10), [0, -0.085, 0.012]), color));

/** 다리 + 신발(또는 장화) 한 덩이. 다리 관절(엉덩이)이 원점. 밑창은 납작하고 진하다. */
function legGeo(L) {
  const key = `leg|${L.legs}|${L.sock || ''}|${L.shoe}|${L.sole || ''}|${L.boot ? 1 : 0}|${L.trim || ''}`;
  return merged(key, () => {
    const pants = grad(L.legs, -0.15, 0.02, 0.18, 0.04);
    const sock = L.sock ? col(L.sock) : null;
    const shoeG = grad(L.shoe, FOOT_C - 0.04, FOOT_C + 0.06, 0.16, 0.12);
    const toe = col(tone(L.shoe, 0.16));
    const sole = col(L.sole || tone(L.shoe, -0.45));
    const trim = col(L.trim || tone(L.shoe, 0.25));
    const shoe = place(sphereGeo(1, 22, 16), [0, FOOT_C, 0.03], [0, 0, 0], [0.088, 0.07, 0.128]);
    // 밑창을 납작하게
    const p = shoe.attributes.position;
    const n = shoe.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      if (p.getY(i) < SOLE_Y) {
        p.setY(i, SOLE_Y);
        n.setXYZ(i, 0, -1, 0);
      }
    }
    const shoeC = (x, y, z) => (y < SOLE_Y + 0.02 ? sole : z > 0.1 && y > FOOT_C - 0.03 ? _pc.copy(shoeG(x, y)).lerp(toe, 0.6) : shoeG(x, y));
    const parts = [paint(place(capG(0.066, 0.17, 4, 14), [0, -0.065, 0]), (x, y) => (sock && y < -0.095 ? sock : pants(x, y))), paint(shoe, shoeC)];
    if (L.boot) parts.push(paint(place(capG(0.078, 0.16, 4, 14), [0, -0.08, -0.004]), (x, y) => (y > -0.03 ? trim : shoeG(x, y))));
    return parts;
  });
}

// 몸통 옆모습(몸통 원점 = 엉덩이 높이). 아래가 넓은 통통한 종 모양.
const BODY = [[0, -0.088], [0.108, -0.086], [0.158, -0.066], [0.178, -0.02], [0.176, 0.045], [0.163, 0.105], [0.138, 0.16], [0.1, 0.203], [0.052, 0.229], [0, 0.236]];
const bodyGeo = () => cg('body', () => place(lathe('body', BODY, { seg: 36, n: 30 }), [0, 0, 0], [0, 0, 0], [1, 1, 0.9]));
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

/**
 * 몸통 앞에 붙는 판(앞치마·가슴받이·셔츠 앞섶). y0..y1 에서 가로 각이 w0 → w1 로 변한다(V 자 앞섶).
 * out = 몸통에서 띄우는 거리, flare = 아래쪽을 더 띄우는 양.
 */
function frontPanel(key, y0, y1, w0, w1 = w0, out = 0.008, flare = 0) {
  return cg(`panel:${key}`, () => {
    const rows = 12;
    const cols = 14;
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
const shoulderCaps = (color, r = 0.076) => [paint(ell([-SHX, SHY - 0.006, 0], [r, r * 0.94, r], [0, 0, 0], [16, 12]), color), paint(ell([SHX, SHY - 0.006, 0], [r, r * 0.94, r], [0, 0, 0], [16, 12]), color)];

// ───────── 얼굴 그림 ─────────

const INK = '#1d1430';
const MOUTH_IN = '#6c1e32';
const TONGUE = '#ff6d84';

function blush(ctx, x, y, a) {
  const g = ctx.createRadialGradient(x, y, 2, x, y, 32);
  g.addColorStop(0, `rgba(255,88,108,${0.62 * a})`);
  g.addColorStop(0.6, `rgba(255,106,122,${0.26 * a})`);
  g.addColorStop(1, 'rgba(255,120,130,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, 34, 24, 0, 0, TAU);
  ctx.fill();
}

/** 4갈래 반짝이. */
function twinkle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

/** 표정 ex 의 눈·눈썹·입 설정(인물 설정 F 를 바탕으로). */
function exprOf(F, ex) {
  const p = {
    eye: 'open',
    k: 1,
    lid: F.lid || 0,
    slant: F.slant || 0,
    px: 3,
    py: 0,
    pupil: 1,
    browY: 0,
    tilt: F.browTilt || 0,
    arch: F.browArch ?? 6,
    asym: F.browAsym || 0,
    browWk: 1,
    mouth: F.mouth || 'smile',
    sweat: false,
    sparkle: !!F.sparkle,
  };
  if (ex === 'b') p.eye = 'shut';
  else if (ex === 'l') Object.assign(p, { lid: 0, slant: 0, py: -10, px: 2, k: 1.07, browY: -14, tilt: -0.14, arch: 11, asym: p.asym * 0.6, mouth: F.lookMouth || 'o', sweat: !!F.sweat });
  else if (ex === 's' || ex === 'z')
    Object.assign(p, { lid: 0.3, slant: 0.52, px: 3, py: 2, browY: 8, tilt: 0.62, arch: -1, asym: 0, browWk: 1.15, mouth: ex === 's' ? 'shout' : 'grit', sparkle: false, sweat: !!F.sweat });
  else if (ex === 'h') Object.assign(p, { eye: 'happy', browY: -7, tilt: -0.1, arch: 8, mouth: 'happy' });
  else if (ex === 'g') Object.assign(p, { lid: 0, slant: 0, pupil: 0.55, k: 1.14, browY: -18, arch: 12, tilt: -0.25, asym: 0, mouth: 'gasp' });
  else if (ex === 'j') Object.assign(p, { eye: 'happy', browY: -12, tilt: -0.38, arch: 6, asym: 0, mouth: 'happy', tears: true });
  return p;
}

function eyeShape(ctx, x, y, sx, F, p) {
  const rx = 22 * p.k * (F.eyeW || 1);
  const ry = 28 * p.k * (F.eyeH || 1);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = INK;
  if (p.eye === 'happy') {
    ctx.beginPath();
    ctx.arc(x, y + ry * 0.5, rx * 0.98, Math.PI * 1.14, Math.PI * 1.86);
    ctx.lineWidth = 8.5;
    ctx.stroke();
    return;
  }
  if (p.eye === 'shut') {
    ctx.beginPath();
    ctx.moveTo(x - rx * 1.02, y + 1);
    ctx.quadraticCurveTo(x, y + 13, x + rx * 1.02, y + 1);
    ctx.lineWidth = 7.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + sx * rx * 0.92, y + 3);
    ctx.lineTo(x + sx * (rx + 8), y - 3);
    ctx.lineWidth = 5;
    ctx.stroke();
    return;
  }
  // 윗눈꺼풀 선: 가운데 높이 lid0, 기울기 slant(+ 면 안쪽이 내려온다 = 화남)
  const lid0 = y - ry + p.lid * 2 * ry;
  const lidAt = (xx) => lid0 + (p.slant * ry * ((x - xx) * sx)) / rx;
  const clipBelowLid = (off) => {
    ctx.beginPath();
    ctx.moveTo(x - 60, lidAt(x - 60) + off);
    ctx.lineTo(x + 60, lidAt(x + 60) + off);
    ctx.lineTo(x + 60, y + 70);
    ctx.lineTo(x - 60, y + 70);
    ctx.closePath();
    ctx.clip();
  };
  ctx.save();
  clipBelowLid(0);
  // 흰자(위는 눈꺼풀 그늘로 살짝 푸르스름)
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  const gs = ctx.createLinearGradient(0, y - ry, 0, y + ry);
  gs.addColorStop(0, '#c9cce6');
  gs.addColorStop(0.42, '#ffffff');
  gs.addColorStop(1, '#f3f3fb');
  ctx.fillStyle = gs;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // 홍채(위 어둡게 → 아래 제 색이 밝게) + 동공
  const ix = x + p.px;
  const iy = y + p.py + 1;
  const irx = rx * 0.8 * p.pupil * (F.irisK || 1);
  const iry = ry * 0.8 * p.pupil * (F.irisK || 1);
  ctx.beginPath();
  ctx.ellipse(ix, iy, irx, iry, 0, 0, TAU);
  const gi = ctx.createLinearGradient(0, iy - iry, 0, iy + iry);
  gi.addColorStop(0, '#120a22');
  gi.addColorStop(0.5, F.iris || '#4a3020');
  gi.addColorStop(1, tone(F.iris || '#4a3020', 0.55));
  ctx.fillStyle = gi;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(ix, iy - iry * 0.08, irx * 0.5, iry * 0.54, 0, 0, TAU);
  ctx.fillStyle = 'rgba(12,6,24,0.9)';
  ctx.fill();
  // 눈꺼풀 그늘
  const gsh = ctx.createLinearGradient(0, lid0 - 4, 0, lid0 + ry * 0.6);
  gsh.addColorStop(0, 'rgba(40,24,80,0.4)');
  gsh.addColorStop(1, 'rgba(40,24,80,0)');
  ctx.fillStyle = gsh;
  ctx.fillRect(x - rx - 4, y - ry - 4, rx * 2 + 8, ry * 2 + 8);
  ctx.restore();
  // 반사광(큰 것 왼쪽 위, 작은 것 오른쪽 아래)
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(ix - irx * 0.3, iy - iry * 0.36, irx * 0.42, iry * 0.32, -0.5, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(ix + irx * 0.42, iy + iry * 0.42, irx * 0.17, 0, TAU);
  ctx.fill();
  if (p.sparkle) twinkle(ctx, ix + irx * 0.34, iy - iry * 0.02, 7);
  ctx.restore();
  // 아래 테두리(가늘게)
  ctx.save();
  clipBelowLid(0);
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0.15, Math.PI - 0.15);
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(29,20,48,0.7)';
  ctx.stroke();
  ctx.restore();
  // 윗눈꺼풀(굵은 속눈썹 선)
  ctx.save();
  clipBelowLid(-6);
  ctx.beginPath();
  ctx.ellipse(x, y, rx + 1, ry + 1, 0, Math.PI * 1.03, Math.PI * 1.97);
  ctx.lineWidth = 7.5;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.restore();
  if (p.lid > 0.01 || Math.abs(p.slant) > 0.01) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, y, rx + 2.5, ry + 2.5, 0, 0, TAU);
    ctx.clip();
    ctx.beginPath();
    ctx.moveTo(x - 40, lidAt(x - 40));
    ctx.lineTo(x + 40, lidAt(x + 40));
    ctx.lineWidth = 8;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.restore();
  }
  // 바깥 꼬리(속눈썹)
  const ox = x + sx * rx * 0.86;
  const oy = Math.max(lidAt(ox), y - ry * 0.52);
  ctx.beginPath();
  ctx.moveTo(ox, oy + 3);
  ctx.lineTo(x + sx * (rx + 9), oy - 6);
  ctx.lineWidth = 6;
  ctx.stroke();
  if (F.lash) {
    ctx.lineWidth = 4.5;
    for (const [a, l] of [[0.8, 11], [0.55, 10]]) {
      const ex = x + sx * rx * a;
      const ey = Math.max(lidAt(ex), y - ry * Math.sqrt(1 - a * a)) - 2;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex + sx * l * 0.7, ey - l);
      ctx.stroke();
    }
  }
}

/** 굵기가 안쪽에서 바깥으로 가늘어지는 눈썹. */
function browShape(ctx, x, y, sx, F, p) {
  const len = F.browLen || 38;
  const w = (F.browW || 9) * p.browWk;
  const asym = sx > 0 ? p.asym : 0;
  const yb = y - 48 + (F.browY || 0) + p.browY - asym;
  const ix = x - sx * len * 0.5;
  const iy = yb + p.tilt * len * 0.5;
  const ox = x + sx * len * 0.5;
  const oy = yb - p.tilt * len * 0.5;
  const cx = x;
  const cy = (iy + oy) / 2 - p.arch;
  const N = 16;
  const top = [];
  const bot = [];
  for (let i = 0; i <= N; i++) {
    const k = i / N;
    const px = (1 - k) * (1 - k) * ix + 2 * (1 - k) * k * cx + k * k * ox;
    const py = (1 - k) * (1 - k) * iy + 2 * (1 - k) * k * cy + k * k * oy;
    const tx = 2 * (1 - k) * (cx - ix) + 2 * k * (ox - cx);
    const ty = 2 * (1 - k) * (cy - iy) + 2 * k * (oy - cy);
    const l = Math.hypot(tx, ty) || 1;
    const ww = w * 0.5 * (1 - k * 0.5) * (k < 0.12 ? 0.8 + k * 1.6 : 1);
    top.push([px - (ty / l) * ww, py + (tx / l) * ww]);
    bot.push([px + (ty / l) * ww, py - (tx / l) * ww]);
  }
  ctx.beginPath();
  ctx.moveTo(top[0][0], top[0][1]);
  for (const [a, b] of top) ctx.lineTo(a, b);
  for (let i = bot.length - 1; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]);
  ctx.closePath();
  ctx.fillStyle = F.brow || INK;
  ctx.fill();
  ctx.lineJoin = 'round';
  ctx.lineWidth = 2;
  ctx.strokeStyle = F.brow || INK;
  ctx.stroke();
}

/** 벌린 입: path() 로 모양을 그리고, 안쪽 어둡게 + 윗니 + 혀 + 외곽선. */
function openMouth(ctx, path, { y, teeth = 0, teethBot = 0, tongue = null, lw = 3.5 }) {
  ctx.save();
  ctx.beginPath();
  path();
  ctx.closePath();
  const g = ctx.createLinearGradient(0, y - 14, 0, y + 30);
  g.addColorStop(0, '#3a0c1c');
  g.addColorStop(1, MOUTH_IN);
  ctx.fillStyle = g;
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
  if (teeth) ctx.fillRect(-40, y - 30, 80, 30 + teeth);
  if (teethBot) ctx.fillRect(-40, teethBot, 80, 40);
  ctx.restore();
  ctx.lineWidth = lw;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.restore();
}

function mouthShape(ctx, F, kind) {
  const y = 70 + (F.mouthDY || 0);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = INK;
  if (kind === 'smile') {
    ctx.beginPath();
    ctx.moveTo(-15, y - 3);
    ctx.quadraticCurveTo(0, y + 12, 15, y - 3);
    ctx.lineWidth = 6.5;
    ctx.stroke();
  } else if (kind === 'flat') {
    ctx.beginPath();
    ctx.moveTo(-12, y + 2);
    ctx.bezierCurveTo(-5, y - 2, 4, y + 4, 12, y);
    ctx.lineWidth = 6;
    ctx.stroke();
  } else if (kind === 'frown') {
    ctx.beginPath();
    ctx.moveTo(-13, y + 5);
    ctx.quadraticCurveTo(0, y - 5, 13, y + 5);
    ctx.lineWidth = 6;
    ctx.stroke();
  } else if (kind === 'smirk') {
    ctx.beginPath();
    ctx.moveTo(-14, y + 1);
    ctx.quadraticCurveTo(3, y + 9, 17, y - 7);
    ctx.lineWidth = 6.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(14, y - 11);
    ctx.lineTo(20, y - 4);
    ctx.lineWidth = 4;
    ctx.stroke();
  } else if (kind === 'grin' || kind === 'happy') {
    const w = kind === 'happy' ? 24 : 21;
    const h = kind === 'happy' ? 25 : 19;
    openMouth(
      ctx,
      () => {
        ctx.moveTo(-w, y - 6);
        ctx.quadraticCurveTo(0, y - 1, w, y - 6);
        ctx.quadraticCurveTo(w * 0.92, y + h, 0, y + h + 1);
        ctx.quadraticCurveTo(-w * 0.92, y + h, -w, y - 6);
      },
      { y, teeth: 2, tongue: [0, y + h - 2, w * 0.55, 9] },
    );
  } else if (kind === 'o' || kind === 'gasp') {
    const k = kind === 'gasp' ? 1.5 : 1;
    openMouth(
      ctx,
      () => {
        ctx.ellipse(0, y + 5 * k, 9 * k, 11.5 * k, 0, 0, TAU);
      },
      { y, tongue: [0, y + 5 * k + 10 * k, 8 * k, 6 * k], lw: 3 },
    );
  } else if (kind === 'shout') {
    openMouth(
      ctx,
      () => {
        ctx.moveTo(-28, y - 9);
        ctx.quadraticCurveTo(0, y - 16, 28, y - 9);
        ctx.quadraticCurveTo(30, y + 30, 0, y + 33);
        ctx.quadraticCurveTo(-30, y + 30, -28, y - 9);
      },
      { y, teeth: -3, tongue: [0, y + 30, 17, 11], lw: 4 },
    );
  } else if (kind === 'grit') {
    // 이를 악문 입(위아래 이 + 가운데 선)
    const w = 25;
    openMouth(
      ctx,
      () => {
        ctx.moveTo(-w, y - 8);
        ctx.quadraticCurveTo(0, y - 13, w, y - 8);
        ctx.quadraticCurveTo(w + 3, y + 6, w - 2, y + 13);
        ctx.quadraticCurveTo(0, y + 17, -w + 2, y + 13);
        ctx.quadraticCurveTo(-w - 3, y + 6, -w, y - 8);
      },
      { y, teeth: 1, teethBot: y + 5, lw: 4 },
    );
    ctx.beginPath();
    ctx.moveTo(-w + 2, y + 2);
    ctx.quadraticCurveTo(0, y + 5, w - 2, y + 2);
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.lineWidth = 2;
    for (const tx of [-12, 0, 12]) {
      ctx.beginPath();
      ctx.moveTo(tx, y - 9);
      ctx.lineTo(tx, y + 13);
      ctx.stroke();
    }
  }
}

/** 땀방울(이마 옆). */
function sweatDrop(ctx, x, y) {
  ctx.beginPath();
  ctx.moveTo(x, y - 16);
  ctx.quadraticCurveTo(x + 11, y + 2, x, y + 8);
  ctx.quadraticCurveTo(x - 11, y + 2, x, y - 16);
  ctx.fillStyle = '#9fe2ff';
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#2f5fb0';
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(x - 3, y + 1, 2.5, 4, 0.3, 0, TAU);
  ctx.fill();
}

/** 기쁨의 눈물 두 줄기(눈꼬리 → 뺨 아래). */
function tearStream(ctx, sx) {
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(sx * 60, 26);
  ctx.bezierCurveTo(sx * 68, 50, sx * 62, 80, sx * 74, 118);
  ctx.strokeStyle = 'rgba(110,200,255,0.9)';
  ctx.lineWidth = 13;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 3.5;
  ctx.stroke();
  ctx.fillStyle = 'rgba(140,215,255,0.95)';
  ctx.beginPath();
  ctx.ellipse(sx * 92, 30, 6, 8, sx * 0.5, 0, TAU);
  ctx.fill();
}

/** 얼굴 한 장. ex: n 보통(인물 성격), b 깜빡, l 올려다봄, s 고함(입 크게), z 고함(이 악물기), h 웃음, g 깜짝, j 감격(눈물). */
function paintFace(ctx, s, F, ex) {
  ctx.clearRect(0, 0, s, s);
  ctx.save();
  ctx.scale(s / 256, s / 256);
  ctx.translate(128, 128);
  const p = exprOf(F, ex);
  const EX = 50;
  const EY = 14;
  blush(ctx, -84, 60, F.blush ?? 1);
  blush(ctx, 84, 60, F.blush ?? 1);
  if (F.freckles) {
    ctx.fillStyle = 'rgba(176,92,48,0.8)';
    for (const sx of [-1, 1]) {
      for (const [fx, fy] of [[70, 50], [86, 46], [78, 60], [94, 57], [63, 61]]) {
        ctx.beginPath();
        ctx.arc(sx * fx, fy, 2.8, 0, TAU);
        ctx.fill();
      }
    }
  }
  if (F.stubble) {
    // 까칠한 수염 자국
    ctx.fillStyle = 'rgba(70,46,40,0.32)';
    for (let i = 0; i < 70; i++) {
      const a = (i * 2.399) % TAU;
      const r = 30 + ((i * 37) % 44);
      const x = Math.cos(a) * r * 1.25;
      const y = 92 + Math.sin(a) * r * 0.55;
      if (y < 66 || Math.abs(x) < 22 && y < 92) continue;
      ctx.beginPath();
      ctx.arc(x, y, 2.2, 0, TAU);
      ctx.fill();
    }
  }
  if (F.bags && p.eye === 'open') {
    ctx.strokeStyle = 'rgba(110,64,130,0.5)';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(sx * EX, EY + 31, 15, 6, 0, 0.3, Math.PI - 0.3);
      ctx.stroke();
    }
  }
  for (const sx of [-1, 1]) eyeShape(ctx, sx * EX, EY, sx, F, p);
  for (const sx of [-1, 1]) browShape(ctx, sx * EX, EY, sx, F, p);
  mouthShape(ctx, F, p.mouth);
  if (p.sweat) sweatDrop(ctx, -104, -34);
  if (p.tears) for (const sx of [-1, 1]) tearStream(ctx, sx);
  ctx.restore();
}

const EXPR = ['n', 'b', 'l', 's', 'z', 'h', 'g'];
/** 얼굴 텍스처 묶음(캐시). */
function faceSet(F) {
  const key = `p4|${JSON.stringify(F)}`;
  const set = {};
  for (const ex of F.joy ? [...EXPR, 'j'] : EXPR) set[ex] = faceTexture(`${key}|${ex}`, (ctx, s) => paintFace(ctx, s, F, ex));
  return set;
}

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
      ctx.lineWidth = 9;
      ctx.beginPath();
      for (let i = -w; i <= 2 * w; i += w / 2) {
        ctx.moveTo(i, 0);
        ctx.lineTo(i + w, w);
        ctx.moveTo(i, w);
        ctx.lineTo(i + w, 0);
      }
      ctx.stroke();
    },
    { repeat: [6, 3] },
  );
  netMat = new THREE.MeshStandardMaterial({ color: '#ffffff', map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false, roughness: 0.9 });
  return netMat;
}

const NET_HOOP_Y = 0.6;
/** 잠자리채(손잡이가 원점, +y 로 선다). 테는 xy 평면(앞 = +z)에 있고 그물 주머니는 뒤로 처진다. */
function makeNet() {
  const g = new THREE.Group();
  const frame = merged('netFrame4', () => {
    const wood = grad('#b97a42', -0.05, 0.45, 0.15, 0.1);
    const tape = col('#e04a3c');
    return [
      paint(place(cylGeo(0.019, 0.023, 0.5, 10), [0, 0.2, 0]), (x, y) => (y < 0.07 ? tape : wood(x, y))),
      paint(place(torusGeo(0.13, 0.02, 8, 40), [0, NET_HOOP_Y, 0], [0, 0, 0], [1, 1.18, 1]), '#6a3a1e'),
      paint(place(cylGeo(0.026, 0.026, 0.06, 10), [0, 0.45, 0]), '#ffd23f'),
    ];
  });
  add(g, frame, VM(0.55), { outline: OLS });
  const bag = cg('netBag', () => {
    const geo = new THREE.LatheGeometry(
      new THREE.SplineCurve([[0.13, 0], [0.127, 0.06], [0.11, 0.13], [0.078, 0.19], [0.036, 0.225], [0, 0.235]].map(([r, y]) => new THREE.Vector2(r, y))).getPoints(14),
      24,
    );
    // 테 평면(xy)에 입구를 두고, 깊이(y)만큼 뒤(−z)와 아래(−y)로 처지게 비튼다.
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
 * 사람 한 명의 뼈대와 공통 부품(머리·얼굴·코·팔·손·다리·손가락·잠자리채). parent 에 붙인다.
 * 몸통 모양·머리카락·모자·소품은 종류마다 따로 붙인다.
 */
function buildPerson(parent, L, { legs = true } = {}) {
  const P = { L, legs: [], arms: [], hands: [], items: {} };
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
  P.head.scale.setScalar(L.hs || HS);
  P.neck.add(P.head);
  P.headMesh = add(P.head, headGeo(L), VM(0.6), { outline: OL });
  add(P.head, noseGeo(L), VM(0.5), { pos: onFace(0, 44, HR - 0.008), rot: faceRot(0, 44) }).rotation.order = 'YXZ';
  P.faces = faceSet(L.face);
  P.face = faceCap(HR, P.faces.n, { width: FACE_A, height: FACE_A });
  P.head.add(P.face);
  const handC = L.glove || L.skin;
  for (const s of [-1, 1]) {
    const sh = new THREE.Group();
    sh.position.set(s * SHX, SHY, 0);
    sh.userData.base = sh.position.clone();
    P.torso.add(sh);
    add(sh, armGeo(L), VM(0.75), { outline: OLS });
    P.arms.push(sh);
    P.hands.push(add(P.torso, handGeo(handC), VM(0.6), { outline: OLS }));
  }
  if (legs) {
    for (const s of [-1, 1]) {
      const hip = new THREE.Group();
      hip.position.set(s * LEG_X, HIP, 0);
      P.body.add(hip);
      add(hip, legGeo(L), VM(0.68), { outline: OLS });
      P.legs.push(hip);
    }
  }
  // 가리키는 손가락(올려다볼 때, 기체 쪽 손)
  P.finger = add(P.torso, fingerGeo(handC), VM(0.6));
  P.finger.visible = false;
  P.net = makeNet();
  P.torso.add(P.net);
  return P;
}

/** 뒤집힌 틀(flip) 기준 → 몸통 기준으로 바꾸는 회전(몸통 회전의 역). 결과는 _qi. */
function torsoInv(P) {
  _qi.copy(P.base.quaternion).multiply(P.body.quaternion).multiply(P.torso.quaternion);
  return _qi.invert();
}

/** 화면 평면(flip 기준)의 방향 (sx·sin h, cos h, fz) 로 어깨 i 에서 len 만큼 뻗은 점 → st 의 손 목표 v. */
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
  const k = clamp(d / ARM, 0.72, maxK);
  sh.scale.set(1, k, 1);
  const h = P.hands[i];
  h.position.copy(sh.position).addScaledVector(_a, ARM * k);
  h.quaternion.copy(sh.quaternion);
  h.scale.setScalar(1);
}

/** 머리 기준 점 → 몸통 기준 점(지금 고개 각도로). */
function headToTorso(P, x, y, z, out) {
  P.neck.updateMatrix();
  P.head.updateMatrix();
  return out.set(x, y, z).applyMatrix4(P.head.matrix).applyMatrix4(P.neck.matrix);
}

/**
 * 하늘의 목표(기체)를 뒤집힌 틀(flip) 기준으로 본다. 돌려주는 yaw 는 카메라 쪽을 0 으로 한 좌우 각,
 * elev 는 올려다보는 각. 목표가 없으면 앞 위쪽.
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
  const st = R.st || (R.st = { aim: { yaw: 0, elev: 0 }, F: [0, 0, 0], B: [0, 0, 0], T: [0, 0, 0], sw: { a: 0, h: 0, sq: 1, lean: 0, air: 0, hop: 0, v: 0, shout: false }, sw2: { a: 0, h: 0, sq: 1, lean: 0, air: 0, hop: 0, v: 0, shout: false } });
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
  st.umb = clamp01(p.umbrella);
  st.flash = clamp01(p.flashlight);
  st.flashHand = 0;
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

/** 손 1(기체 쪽)로 기체 쪽 하늘을 가리킨다(머리 옆 바깥으로 쭉, 손가락이 나온다). */
function pointUp(P, st, k) {
  const el = clamp((st.aim.elev - 0.25) / 0.9, 0, 1);
  const h = lerp(1.0, 0.62, el);
  const jab = 1 + Math.sin(st.t * 7.5) * 0.05;
  armToward(P, 1, h, ARM * 1.24 * jab, 0.3, st.T);
  mix3(st.B, st.T[0], st.T[1], st.T[2], k);
  st.point = k;
}

/** 손가락을 손 1 끝에 붙인다. */
function placeFinger(P, st) {
  const show = (st.point || 0) > 0.5;
  P.finger.visible = show;
  if (show) {
    P.finger.position.copy(P.hands[1].position);
    P.finger.quaternion.copy(P.arms[1].quaternion);
    P.hands[1].scale.setScalar(0.92);
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
    if (st.shock) ex = P.shockFace || (st.sw.shout ? 's' : 'z');
    else if (st.wave) ex = 'h';
    else if (st.look > 0.5) ex = blinkAt(st.t, seed, 4.6) ? 'b' : 'l';
    else ex = blinkAt(st.t, seed) ? 'b' : 'n';
  }
  P.face.material.map = P.faces[ex];
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
  const foc = shock ? 0.8 : lk;
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
    lean += (D.leanBack ?? 0.06) * lk * elev;
  } else if (wave) {
    by += Math.abs(Math.sin(t * 5)) * 0.035;
  }
  sy += br * 0.008 * idle;
  P.base.position.set(shift * 0.01 * idle, by, 0);
  P.base.rotation.set(0, 0, lean);
  const sxz = 1 / Math.sqrt(sy);
  P.base.scale.set(sxz, sy, sxz);

  // 2) 몸 방향
  const bodyYaw = lerp(YAW, st.aim.yaw * 0.55 + 0.12, foc) + Math.sin(t * 0.45 + seed) * 0.1 * idle;
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
  P.torso.rotation.set((0.08 + (D.hunch || 0)) * walk - lk * elev * 0.12, -sw * 0.13 * walk, sw * 0.035 * walk);
  const bk = 1 - walk * 0.6;
  P.torso.scale.set(1 + br * 0.008 * bk, 1 + br * 0.016 * bk, 1 + br * 0.008 * bk);

  // 5) 고개
  const yawRel = clamp(st.aim.yaw - bodyYaw, -0.75, 0.75) * foc;
  const pitch = foc * elev * (shock ? 0.3 : (D.lookPitch ?? 0.62));
  // 하늘을 훑으며 걷는다(사냥꾼): 웅크린 몸에 고개만 들고 좌우로
  const scan = (D.scan || 0) * walk * (1 - foc);
  const around = Math.sin(t * 0.55 + seed * 2) * 0.2 + Math.sin(t * 1.9 + seed) * 0.04;
  P.neck.rotation.set(
    -pitch + Math.sin(st.ph * 2 + 0.8) * 0.045 * walk + Math.sin(t * 1.3) * 0.03 * idle - (shock ? st.sw.lean * 0.5 : 0) - scan * (0.7 + Math.sin(t * 1.3) * 0.2),
    yawRel + around * idle + Math.sin(t * 2.1 + seed) * scan,
    Math.sin(t * 0.8 + seed) * 0.08 * idle + (shock ? Math.sin(t * 17) * 0.05 : 0) + lk * (0.1 + Math.sin(t * 2.1) * 0.03),
  );

  // 6) 손 목표(몸통 기준). F = 카메라 쪽(손 0, 소품), B = 기체 쪽(손 1, 몸짓)
  for (const sh of P.arms) sh.position.copy(sh.userData.base);
  const ar = br * 0.006 * idle;
  set3(st.F, -0.212 - ar, 0.0 + ar + Math.max(0, sw) * 0.045 * walk, 0.035 + sw * 0.14 * walk);
  set3(st.B, 0.212 + ar, 0.0 + ar + Math.max(0, -sw) * 0.045 * walk, 0.035 - sw * 0.14 * walk);
  if (shock && D.celebrate) {
    // 기체를 가리키며 다른 주먹을 불끈불끈
    pointUp(P, st, 1);
    armToward(P, 0, 0.35 + Math.abs(Math.sin(t * 5.3)) * 0.35, ARM * 1.25, 0.35, st.F);
  } else if (shock) {
    armToward(P, 1, st.sw.h, ARM * 1.28, 0.25, st.B);
    // 빈손이면 주먹을 흔든다
    armToward(P, 0, 0.55 + Math.sin(t * 15) * 0.18, ARM * 1.15, 0.35, st.F);
  } else if (wave) {
    armToward(P, 1, 0.98 + Math.sin(t * 10) * 0.3, ARM * 1.42, 0.85, st.B);
  } else if (lk > 0) {
    pointUp(P, st, lk);
    // 빈손: 가슴 앞에서 들뜬 주먹
    mix3(st.F, -0.17, 0.1 + Math.abs(Math.sin(t * 6.2 + seed)) * 0.02, 0.15, lk);
  }
  D.pose?.(P, st);
  extrasHands(P, st, D);
  reach(P, 0, st.F, st.maxF || 1.5);
  reach(P, 1, st.B, st.maxB || 1.5);
  placeFinger(P, st);
  if (wave) P.hands[1].scale.setScalar(1.15);
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
// pose.flashlight(0..1): 밤에 카메라 쪽 손(우산을 들었으면 기체 쪽 손)으로 기체를 비춘다. 렌즈는 빛 번짐이 생기게 밝다.
// 그 손에 들던 소품(def.fprop)은 그동안 감춘다. 열기구·우주비행사에는 쓰지 않는다.

/** 종류별 우산 색(두 색 번갈아 8폭). */
const UMB = {
  farmer: ['#e2483c', '#fbf6ee'],
  kid: ['#ff8fb0', '#fbf6ee'],
  walker: ['#2fc8b8', '#9a5ce6'],
  camper: ['#ff8a2c', '#3e9b5a'],
  fisher: ['#ffd23f', '#2f6fd8'],
  worker: ['#2b2f4a', '#4a5a9c'],
  streamer: ['#ff7fae', '#2fc8b8'],
  astronomer: ['#3f5fb8', '#ffcf4a'],
  photographer: ['#e2483c', '#2fb5a6'],
  hunter: ['#5e6a3a', '#c9a060'],
};
const UMB_SHAFT = 0.86; // 천 가장자리 높이(원점) → 손잡이 끝

let vmd = null;
/** 양면 정점 색 재질(우산 천·레이더 접시처럼 안쪽이 보이는 것). */
function VMD() {
  if (!vmd) vmd = new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.6, side: THREE.DoubleSide, envMapIntensity: 0.6 });
  return vmd;
}

/** 우산(원점 = 천 가장자리 높이의 가운데, +y 위). 살 끝은 낮고 폭 사이는 살짝 올라간다. */
function umbrellaGeo(c1, c2) {
  return merged(`umb|${c1}|${c2}`, () => {
    const canopy = lathe('umbCanopy', [[0.0, 0.17], [0.13, 0.155], [0.26, 0.115], [0.37, 0.055], [0.44, 0.0]], { seg: 64, n: 14 }).clone();
    const p = canopy.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const z = p.getZ(i);
      const k = Math.hypot(x, z) / 0.44;
      p.setY(i, p.getY(i) + (1 - Math.abs(Math.cos(Math.atan2(z, x) * 4))) * 0.04 * k * k);
    }
    const A = grad(c1, -0.02, 0.17, 0.15, 0.08);
    const B = grad(c2, -0.02, 0.17, 0.15, 0.08);
    const dark = '#3a3040';
    const parts = [
      paint(canopy, (x, y, z) => (Math.floor((Math.atan2(z, x) + Math.PI) / (Math.PI / 4)) % 2 ? A(x, y) : B(x, y))),
      paint(place(cylGeo(0.012, 0.012, UMB_SHAFT + 0.17, 8), [0, (0.17 - UMB_SHAFT) / 2, 0]), dark),
      paint(place(torusGeo(0.045, 0.015, 6, 14, Math.PI), [-0.045, -UMB_SHAFT, 0], [0, 0, Math.PI]), '#8a5432'),
      paint(place(coneGeo(0.018, 0.07, 8), [0, 0.2, 0]), dark),
    ];
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      parts.push(paint(ell([Math.cos(a) * 0.44, 0.0, Math.sin(a) * 0.44], [0.014, 0.014, 0.014]), dark));
    }
    return parts;
  });
}

/** 손전등(손잡이가 원점, +y 로 비춘다). */
const flashGeo = () =>
  merged('flashlight', () => [
    paint(place(cylGeo(0.026, 0.026, 0.14, 12), [0, 0.03, 0]), (x, y) => (y < 0.02 ? col('#2a2a33') : col('#ffd23f'))),
    paint(place(cylGeo(0.044, 0.028, 0.06, 14), [0, 0.13, 0]), '#ffd23f'),
    paint(place(torusGeo(0.04, 0.008, 6, 18), [0, 0.16, 0], [Math.PI / 2, 0, 0]), '#c3cbe6'),
    paint(place(roundBoxGeo(0.014, 0.03, 0.012, 0.005, 1), [0, 0.05, 0.026]), '#e2483c'),
  ]);

/** 우산·손전등을 미리 만들어 감춰 둔다(값이 0 이면 아무 비용도 없다). */
function buildExtras(P, type) {
  const [c1, c2] = UMB[type] || UMB.farmer;
  P.umb = new THREE.Group();
  P.umb.visible = false;
  P.torso.add(P.umb);
  add(P.umb, umbrellaGeo(c1, c2), VMD(), { outline: OLS });
  P.flash = new THREE.Group();
  P.flash.visible = false;
  P.torso.add(P.flash);
  add(P.flash, flashGeo(), VM(0.4));
  add(P.flash, cylGeo(0.036, 0.036, 0.006, 16), M('#fff6c8', { rough: 0.2, emissive: '#fff2b0', emissiveIntensity: 2.2 }), { pos: [0, 0.163, 0], cast: false });
  P.flashGlow = glowSprite('#fff0b8', 0.26, 0);
  P.flashGlow.position.set(0, 0.19, 0);
  P.flash.add(P.flashGlow);
}

/** 우산·손전등이 쓰는 손 목표(reach 전에). */
function extrasHands(P, st, D) {
  const u = st.umb;
  const f = st.flash;
  st.flashHand = u > 0.5 ? 1 : 0;
  if (u > 0) {
    // 카메라 쪽 손을 어깨 높이로 들어 우산대를 쥔다(모자가 높으면 더 높이)
    const k = smooth(clamp01(u * 1.6));
    mix3(st.F, -0.25, 0.17 + Math.max(0, D.umbY - 0.4) + (st.shock ? Math.sin(st.t * 15) * 0.03 : 0), 0.1, k);
  }
  if (f > 0) {
    if (st.flashHand) {
      if (st.point < 0.5) mix3(st.B, 0.28, 0.08, 0.15, f);
      if (f > 0.5) st.point = 0;
    } else mix3(st.F, -0.29, 0.05 + Math.abs(Math.sin(st.ph)) * 0.02 * st.walk, 0.15, f);
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
    headToTorso(P, -0.04 + Math.sin(st.t * 2.3) * 0.02, D.umbY - 0.1 * lb, -0.34 * lb, _c);
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
    P.flashGlow.material.opacity = 0.7 * f;
  }
}

// ───────── 종류별 생김새 ─────────

/** 짧은 머리 덮개(정수리·뒤통수). 앞 이마는 열어 둔다. */
const capHair = (s = 1, dy = 0) => ell([0, 0.04 + dy, -0.032], [0.253 * s, 0.246 * s, 0.25 * s], [0, 0, 0], [28, 20]);

/** 이마 앞머리(납작한 타원체를 이마 곡면에 기울여 붙인다). */
const fringe = (x, y, rx, ry, rz, roll = 0) => {
  const p = onFace(x, y, HR - 0.004);
  return ell(p, [rx, ry, rz], faceRot(x, y, roll), [18, 12], 'YXZ');
};

/** 머리카락 색 칠하기: 위는 밝게(윤기), 아래는 어둡게. */
const hairPaint = (hex, light = 0.14) => grad(hex, -0.2, 0.26, 0.2, light);

/** 밀짚모자(챙 끝이 들쭉날쭉). */
function strawGeo() {
  return cg('strawFray', () => {
    const g = lathe('straw', [[0, 0.31], [0.1, 0.305], [0.16, 0.285], [0.183, 0.23], [0.19, 0.16], [0.198, 0.12], [0.27, 0.112], [0.35, 0.098], [0.4, 0.08], [0.398, 0.062], [0.35, 0.068], [0.27, 0.085], [0.2, 0.098], [0.0, 0.1]], { seg: 46, n: 30 }).clone();
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const z = p.getZ(i);
      const r = Math.hypot(x, z);
      if (r > 0.3) {
        const k = 1 + 0.03 * Math.sin(Math.atan2(z, x) * 23) * ((r - 0.3) / 0.1);
        p.setX(i, x * k);
        p.setZ(i, z * k);
      }
    }
    return g;
  });
}

/** 보푸라기 고리(털 깃·털 장식): 토러스를 울퉁불퉁하게. */
function fluffyRing(key, R0, tube, bumps = 13) {
  return cg(`fluff:${key}`, () => {
    const g = new THREE.TorusGeometry(R0, tube, 10, 40);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);
      const u = Math.atan2(y, x);
      const cx = Math.cos(u) * R0;
      const cy = Math.sin(u) * R0;
      const v = Math.atan2(z, Math.hypot(x, y) - R0);
      const k = 1 + 0.22 * Math.sin(u * bumps) * Math.cos(v * 2) + 0.1 * Math.sin(u * bumps * 2 + 1);
      p.setXYZ(i, cx + (x - cx) * k, cy + (y - cy) * k, z * k);
    }
    g.computeVertexNormals();
    return g;
  });
}

const DEFS = {
  // UFO 사냥꾼(특별 손님): 은박 고깔모자(안테나)·트렌치코트에 UFO 배지·목에 건 큰 쌍안경·레이더 접시 배낭.
  // 20년째 UFO 를 쫓는 집요하고 귀여운 음모론자. 눈은 부릅뜨고(작은 눈동자·다크서클·수염 자국), 웅크린 채 하늘을 훑으며 바삐 걷는다.
  // 올려다보면 쌍안경을 두 손으로 눈에 대고 기체를 정확히 쫓으며 덜덜 떨고, 들키면 감격의 눈물을 흘리며 펄쩍펄쩍 뛴다.
  hunter: {
    lookPitch: 0.85,
    hunch: 0.17,
    scan: 0.42,
    step: 11.5,
    celebrate: true,
    leanBack: 0.12,
    umbY: 0.66,
    L: {
      skin: '#e8b48e',
      top: '#c9a060',
      cuff: '#9a7438',
      legs: '#4a4f5e',
      shoe: '#5a3a22',
      sole: '#2e1c12',
      boot: true,
      trim: '#8a6040',
      nose: 1.2,
      face: { iris: '#3f8f4a', irisK: 0.68, brow: '#3a2a20', browW: 13, browLen: 42, browTilt: 0.32, browArch: 1, slant: 0.14, bags: true, stubble: true, mouth: 'flat', lookMouth: 'grin', blush: 0.6, joy: true },
    },
    build(P, R) {
      const coat = '#c9a060';
      const g = grad(coat, -0.135, 0.22, 0.22, 0.06);
      const belt = col('#6a4426');
      add(
        P.torso,
        merged('trench', () => [
          paint(
            place(lathe('trench', [[0, -0.138], [0.19, -0.136], [0.22, -0.12], [0.202, -0.04], [0.182, 0.05], [0.16, 0.12], [0.134, 0.175], [0.095, 0.214], [0.046, 0.234], [0, 0.238]], { seg: 36, n: 30 }), [0, 0, 0], [0, 0, 0], [1, 1, 0.9]),
            (x, y) => (y > -0.004 && y < 0.03 ? belt : g(x, y)),
          ),
          ...shoulderCaps(coat, 0.08),
          paint(frontPanel('hunterLapel', -0.02, 0.236, 0.32, 1.36, 0.012), tone(coat, -0.12)),
          paint(frontPanel('hunterShirt', 0.05, 0.236, 0.14, 0.98, 0.017), grad('#3f7a4a', 0.05, 0.22, 0.12, 0.06)),
          // 세운 깃
          paint(ell([-0.1, 0.228, -0.01], [0.075, 0.07, 0.022], [0.15, 0.95, 0.35]), tone(coat, -0.06)),
          paint(ell([0.1, 0.228, -0.01], [0.075, 0.07, 0.022], [0.15, -0.95, -0.35]), tone(coat, -0.06)),
        ]),
        VM(0.8),
        { outline: OL },
      );
      // UFO 배지·외계인 배지·별 배지·벨트 버클·티셔츠의 외계인 얼굴
      add(
        P.torso,
        merged('hunterPins', () => [
          paint(place(roundBoxGeo(0.05, 0.034, 0.016, 0.008, 1), onBody(0.012, 0, 0.014)), '#ffd23f'),
          paint(ell(onBody(0.13, -0.56, 0.014), [0.028, 0.034, 0.012]), '#7ee06a'),
          paint(ell(onBody(0.126, -0.61, 0.026), [0.007, 0.011, 0.005], [0, 0, 0.5]), '#1d1430'),
          paint(ell(onBody(0.126, -0.5, 0.026), [0.007, 0.011, 0.005], [0, 0, -0.5]), '#1d1430'),
          paint(ell(onBody(0.07, -0.66, 0.014), [0.036, 0.012, 0.014], [0, -0.66, 0]), '#c3cbe6'),
          paint(ell(onBody(0.078, -0.66, 0.02), [0.016, 0.014, 0.01], [0, -0.66, 0]), '#5ff0ff'),
          paint(ell(onBody(-0.06, -0.62, 0.014), [0.024, 0.024, 0.01], [0, -0.62, 0]), '#e2483c'),
          paint(ell(onBody(0.15, 0.0, 0.026), [0.03, 0.036, 0.01]), '#b8f0a0'),
          paint(ell(onBody(0.152, -0.12, 0.034), [0.008, 0.012, 0.005], [0, 0, 0.5]), '#1d1430'),
          paint(ell(onBody(0.152, 0.12, 0.034), [0.008, 0.012, 0.005], [0, 0, -0.5]), '#1d1430'),
        ]),
        VM(0.4),
      );
      // 은박모자 밑으로 삐친 부스스한 머리
      const hair = hairPaint('#4a3324', 0.16);
      add(
        P.head,
        merged('hunterHair', () => [
          paint(capHair(0.98, -0.03), hair),
          paint(ell([0, -0.08, -0.16], [0.18, 0.12, 0.1]), hair),
          ...[[-1, 0.0, 1.25], [-1, -0.08, 1.7], [1, 0.0, -1.25], [1, -0.08, -1.7], [-1, 0.06, 0.8], [1, 0.06, -0.8]].map(([sx, y, rz]) => paint(place(coneGeo(0.045, 0.13, 8), [sx * 0.22, y, -0.04], [0, 0, rz]), hair)),
          paint(place(coneGeo(0.05, 0.14, 8), [0, -0.02, -0.25], [-1.3, 0, 0]), hair),
        ]),
        VM(0.7),
        { outline: OL },
      );
      // 은박 고깔모자 + 안테나(구겨진 면이 반짝반짝)
      const hat = new THREE.Group();
      hat.rotation.set(-0.12, 0, 0.14);
      P.head.add(hat);
      add(hat, foilGeo(), foilMaterial(), { outline: OL });
      // 레이더 배낭
      add(
        P.torso,
        merged('hunterPack', () => [
          paint(place(roundBoxGeo(0.22, 0.26, 0.13, 0.045, 3), [0, 0.09, -0.19]), grad('#5e6a3a', -0.04, 0.22, 0.2, 0.08)),
          paint(place(roundBoxGeo(0.15, 0.08, 0.05, 0.02, 2), [0, 0.03, -0.265]), tone('#5e6a3a', -0.1)),
          paint(rodGeo([-0.07, 0.2, -0.2], [-0.2, 0.52, -0.27], 0.013), '#8a919f'),
          paint(rodGeo([-0.088, 0.222, 0.03], [-0.1, 0.03, 0.15], 0.016), '#4a4f2e'),
          paint(rodGeo([0.088, 0.222, 0.03], [0.1, 0.03, 0.15], 0.016), '#4a4f2e'),
        ]),
        VM(0.75),
        { outline: OL },
      );
      const dish = new THREE.Group();
      dish.position.set(-0.2, 0.52, -0.27);
      P.torso.add(dish);
      add(dish, dishGeo(), VMD(), { rot: [-0.6, 0, 0.35], scale: 1.25, outline: OLS / 1.25 });
      P.items.dish = dish;
      // 쌍안경 + 목끈
      const bino = new THREE.Group();
      P.torso.add(bino);
      add(bino, binoGeo(), VM(0.45), { outline: OLS });
      P.items.bino = bino;
      R.strap = add(P.torso, cg('leash', () => place(cylGeo(0.0075, 0.0075, 1, 6), [0, 0.5, 0])), M('#5a3a22', { rough: 0.7 }), { cast: false });
      P.shockFace = 'j';
    },
    pose(P, st) {
      if (st.shock || st.lk <= 0) return;
      // 쌍안경을 두 손으로 눈에 대고 기체를 쫓는다(들떠서 덜덜)
      headToTorso(P, 0, -0.01, 0.33, _c);
      mix3(st.F, _c.x - 0.09, _c.y - 0.045, _c.z - 0.03, st.lk);
      set3(st.B, lerp(st.B[0], _c.x + 0.09, st.lk), lerp(st.B[1], _c.y - 0.045, st.lk), lerp(st.B[2], _c.z - 0.03, st.lk));
      st.point = 0;
      st.maxF = 1.7;
      st.maxB = 1.7;
      P.torso.rotation.z += Math.sin(st.t * 31) * 0.012 * st.lk;
      P.torso.rotation.x += Math.sin(st.t * 23) * 0.008 * st.lk;
    },
    after(P, st, R) {
      const b = P.items.bino;
      if (st.lk > 0.35 && !st.shock) {
        headToTorso(P, 0, -0.01, 0.33, _c);
        b.position.copy(_c);
        b.position.x += Math.sin(st.t * 37) * 0.003;
        b.position.y += Math.sin(st.t * 29) * 0.003;
        // 기체 쪽으로 정확히 겨눈다
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
        // 목에 걸려 가슴 앞에서 흔들린다(들키면 크게 출렁)
        const sw = st.shock ? Math.sin(st.t * 10.7) * 0.8 : Math.sin(st.ph) * 0.22 * st.walk + Math.sin(st.t * 1.7) * 0.05;
        const L = 0.165;
        b.position.set(Math.sin(sw) * L, 0.2 - Math.cos(sw) * L, bodyR(0.05) * 0.9 + 0.075);
        b.rotation.set(0.2, 0, sw);
      }
      // 목끈: 깃 앞 → 쌍안경
      const s = R.strap;
      _a.set(0, 0.2, 0.08);
      s.position.copy(_a);
      _b.copy(b.position).sub(_a);
      const len = _b.length();
      s.quaternion.setFromUnitVectors(UP, _b.divideScalar(len || 1));
      s.scale.set(1, len, 1);
      // 레이더 접시가 돈다(들키면 빙글빙글)
      P.items.dish.rotation.set(0, st.t * (st.shock ? 7 : 1.6), 0);
    },
  },

  // 농부: 큰 밀짚모자(빨간 띠·밀 이삭)·무성한 콧수염·딸기코·크림 셔츠·파란 멜빵바지·갈색 장화·쇠스랑. 고집 센 아저씨.
  farmer: {
    fprop: 'fork',
    umbY: 0.4,
    L: {
      skin: '#f2b08a',
      top: '#f7efdd',
      sleeve: 'short',
      legs: '#4a74d0',
      shoe: '#8a5230',
      sole: '#3e2416',
      boot: true,
      trim: '#d09a5e',
      nose: 1.45,
      face: { iris: '#5a3518', brow: '#3a2014', browW: 15, browLen: 44, browTilt: 0.22, browArch: 2, mouth: 'flat', mouthDY: 20, lid: 0.1 },
    },
    build(P) {
      const denim = '#4a74d0';
      const shirt = '#f7efdd';
      const gD = grad(denim, -0.09, 0.17, 0.22, 0.06);
      const gS = grad(shirt, 0.04, 0.24, 0.14, 0.04);
      add(
        P.torso,
        merged('farmerBody', () => [
          paint(bodyGeo(), (x, y) => (y < 0.055 ? gD(x, y) : gS(x, y))),
          ...shoulderCaps(shirt),
          paint(frontPanel('bib', 0.02, 0.17, 1.02, 0.98, 0.016), gD),
          paint(rodGeo([-0.068, 0.166, 0.118], [-0.112, 0.222, 0.0], 0.02), denim),
          paint(rodGeo([0.068, 0.166, 0.118], [0.112, 0.222, 0.0], 0.02), denim),
          paint(ell([-0.05, 0.214, 0.072], [0.062, 0.018, 0.045], [0.35, 0.5, 0.5]), shirt),
          paint(ell([0.05, 0.214, 0.072], [0.062, 0.018, 0.045], [0.35, -0.5, -0.5]), shirt),
        ]),
        VM(0.82),
        { outline: OL },
      );
      add(
        P.torso,
        merged('farmerDetail', () => [
          paint(ell(onBody(0.156, -0.47, 0.03), [0.024, 0.024, 0.014]), '#ffd23f'),
          paint(ell(onBody(0.156, 0.47, 0.03), [0.024, 0.024, 0.014]), '#ffd23f'),
          paint(place(roundBoxGeo(0.11, 0.075, 0.02, 0.01, 2), onBody(0.085, 0, 0.02)), tone(denim, -0.14)),
          paint(ell(onBody(0.128, -0.05, 0.028), [0.032, 0.026, 0.012], [0, 0, 0.6]), '#e2483c'),
          paint(ell(onBody(0.13, 0.0, 0.026), [0.022, 0.03, 0.012], [0, 0, -0.4]), '#ff6a5a'),
        ]),
        VM(0.5),
      );
      // 머리카락(모자 밑 옆·뒤) + 무성한 콧수염
      const hair = hairPaint('#5e3720');
      const st = '#3e2213';
      add(
        P.head,
        merged('farmerHair', () => [
          paint(capHair(1, -0.012), hair),
          paint(ell([-0.205, -0.075, 0.05], [0.044, 0.095, 0.056]), hair),
          paint(ell([0.205, -0.075, 0.05], [0.044, 0.095, 0.056]), hair),
          paint(ell([0, -0.1, -0.16], [0.17, 0.11, 0.1]), hair),
        ]),
        VM(0.7),
        { outline: OL },
      );
      // 콧수염(얼굴에 붙는 것은 외곽선을 가늘게: 굵으면 외곽선 껍질이 얼굴을 뚫고 나와 선이 생긴다)
      add(
        P.head,
        merged('farmerStache', () => {
          const sg = grad(st, -0.1, -0.04, 0.1, 0.25);
          return [
            paint(ell(onFace(-25, 64, HR + 0.006), [0.09, 0.045, 0.048], faceRot(-25, 64, 0.38), [18, 12], 'YXZ'), sg),
            paint(ell(onFace(25, 64, HR + 0.006), [0.09, 0.045, 0.048], faceRot(25, 64, -0.38), [18, 12], 'YXZ'), sg),
            paint(ell(onFace(-66, 80, HR - 0.006), [0.038, 0.032, 0.034], faceRot(-66, 80), [12, 8], 'YXZ'), sg),
            paint(ell(onFace(66, 80, HR - 0.006), [0.038, 0.032, 0.034], faceRot(66, 80), [12, 8], 'YXZ'), sg),
          ];
        }),
        VM(0.7),
        { outline: 0.007 },
      );
      // 밀짚모자: 챙 아래는 그늘, 빨간 띠, 밀 이삭
      const hat = new THREE.Group();
      hat.rotation.set(-0.2, 0, 0.08);
      P.head.add(hat);
      add(
        hat,
        merged('farmerHat', () => {
          const straw = grad('#f2c86a', 0.06, 0.31, 0.12, 0.1);
          const under = col('#d6a24e');
          return [
            paint(strawGeo(), (x, y, z, ny) => (ny < -0.3 ? under : straw(x, y))),
            paint(lathe('strawBand', [[0.2, 0.116], [0.206, 0.124], [0.2, 0.172], [0.19, 0.178]], { seg: 48, smoothIt: false }), '#d8463a'),
          ];
        }),
        VM(0.85),
        { outline: OL },
      );
      // 쇠스랑
      const fork = new THREE.Group();
      add(
        fork,
        merged('fork', () => {
          const steel = '#c3cbe6';
          return [
            paint(place(cylGeo(0.018, 0.018, 0.86, 8), [0, 0.22, 0]), grad('#c08a50', -0.2, 0.65, 0.2, 0.1)),
            paint(place(cylGeo(0.027, 0.021, 0.06, 10), [0, 0.65, 0]), '#8a919f'),
            paint(rodGeo([-0.08, 0.68, 0], [0.08, 0.68, 0], 0.014), steel),
            paint(rodGeo([-0.08, 0.68, 0], [-0.085, 0.86, 0], 0.013, 0.006), steel),
            paint(rodGeo([0, 0.67, 0], [0, 0.88, 0], 0.013, 0.006), steel),
            paint(rodGeo([0.08, 0.68, 0], [0.085, 0.86, 0], 0.013, 0.006), steel),
          ];
        }),
        VM(0.5),
        { outline: OLS },
      );
      P.torso.add(fork);
      P.items.fork = fork;
    },
    pose(P, st) {
      // 쇠스랑은 얼굴을 가리지 않게 몸 바깥쪽에 세운다
      if (!st.shock) set3(st.F, lerp(-0.25, st.F[0] - 0.03, st.walk), lerp(0.03, st.F[1], st.walk), lerp(0.08, st.F[2], st.walk));
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
    umbY: 0.38,
    L: {
      hs: 1.2,
      skin: '#f8c4a0',
      top: '#d8435a',
      sleeve: 'short',
      legs: '#f6bf9a',
      sock: '#fbf6ee',
      shoe: '#b0283f',
      sole: '#5a1424',
      face: { iris: '#3f73dc', brow: '#6a3a22', browW: 7.5, browArch: 8, lash: true, mouth: 'grin', blush: 1.25, eyeH: 1.06 },
    },
    build(P) {
      const red = '#d8435a';
      const white = '#fbf6ee';
      const gR = grad(red, -0.11, 0.2, 0.22, 0.06);
      const W = col(white);
      add(
        P.torso,
        merged('dress', () => [
          paint(
            place(lathe('dress', [[0, -0.112], [0.2, -0.11], [0.226, -0.094], [0.212, -0.035], [0.182, 0.035], [0.158, 0.1], [0.14, 0.15], [0.112, 0.195], [0.078, 0.222], [0.04, 0.236], [0, 0.238]], { seg: 40, n: 32 }), [0, 0, 0], [0, 0, 0], [1, 1, 0.92]),
            (x, y) => (y < -0.088 ? W : gR(x, y)),
          ),
          ...[-1, 1].map((s) => paint(ell([s * SHX, SHY - 0.004, 0], [0.088, 0.08, 0.088]), (x, y) => (y < SHY - 0.055 ? W : gR(x, y)))),
          paint(ell([-0.052, 0.213, 0.075], [0.066, 0.022, 0.05], [0.35, 0.45, 0.35]), white),
          paint(ell([0.052, 0.213, 0.075], [0.066, 0.022, 0.05], [0.35, -0.45, -0.35]), white),
        ]),
        VM(0.8),
        { outline: OL },
      );
      add(
        P.torso,
        merged('apron', () => [
          paint(place(lathe('apronSkirt', [[0.232, -0.094], [0.222, -0.03], [0.192, 0.03], [0.168, 0.075]], { seg: 18, phiStart: -0.72, phiLength: 1.44, n: 10 }), [0, 0, 0], [0, 0, 0], [1, 1, 0.92]), grad(white, -0.09, 0.08, 0.12, 0.02)),
          paint(frontPanel('apronBib', 0.06, 0.2, 0.95, 0.82, 0.02), white),
          paint(place(roundBoxGeo(0.07, 0.05, 0.016, 0.012, 2), [0.05, -0.03, 0.2], [0.1, 0.25, 0]), '#ff8fb0'),
        ]),
        VM(0.85),
      );
      // 머리카락: 보닛 밑 옆머리·앞머리 + 양쪽으로 뻗은 땋은 머리(끝에 빨간 리본)
      const hair = hairPaint('#8a5230');
      const bh = grad('#a2643a', -0.3, -0.08, 0.12, 0.1);
      const braid = [];
      for (const s of [-1, 1]) {
        braid.push(paint(ell([s * 0.222, -0.12, -0.05], [0.058, 0.06, 0.058], [0, 0, 0], [16, 12]), bh));
        braid.push(paint(ell([s * 0.258, -0.18, -0.06], [0.05, 0.054, 0.05], [0, 0, 0], [16, 12]), bh));
        braid.push(paint(ell([s * 0.282, -0.235, -0.065], [0.042, 0.046, 0.042], [0, 0, 0], [14, 10]), bh));
        braid.push(paint(ell([s * 0.3, -0.278, -0.065], [0.042, 0.026, 0.03], [0, 0, s * 0.5], [12, 8]), '#e2483c'));
      }
      add(
        P.head,
        merged('kidHair', () => [
          paint(ell([-0.19, -0.08, 0.06], [0.07, 0.12, 0.08], [0, 0, 0.15]), hair),
          paint(ell([0.19, -0.08, 0.06], [0.07, 0.12, 0.08], [0, 0, -0.15]), hair),
          paint(ell([0, -0.05, -0.1], [0.22, 0.2, 0.17]), hair),
          paint(fringe(-36, -86, 0.085, 0.052, 0.032, 0.55), hair),
          paint(fringe(0, -92, 0.09, 0.052, 0.032), hair),
          paint(fringe(36, -86, 0.085, 0.052, 0.032, -0.55), hair),
          ...braid,
        ]),
        VM(0.6),
        { outline: OL },
      );
      // 보닛 + 얼굴 둘레 주름 + 큰 리본
      add(
        P.head,
        merged('bonnet', () => {
          const gW = grad('#f8f4ee', -0.1, 0.3, 0.16, 0.02);
          return [
            paint(ell([0, 0.055, -0.075], [0.275, 0.272, 0.27], [0, 0, 0], [30, 22]), gW),
            paint(ruffleGeo(), gW),
            paint(place(ell([-0.07, 0, 0], [0.075, 0.048, 0.028], [0, 0, 0.45], [14, 10]), [-0.15, 0.2, 0.1], [-0.5, -0.6, 0.45], 1.35), '#e2483c'),
            paint(place(ell([0.07, 0, 0], [0.075, 0.048, 0.028], [0, 0, -0.45], [14, 10]), [-0.15, 0.2, 0.1], [-0.5, -0.6, 0.45], 1.35), '#e2483c'),
            paint(place(ell([0, 0, 0.006], [0.03, 0.03, 0.028], [0, 0, 0], [10, 8]), [-0.15, 0.2, 0.1], [-0.5, -0.6, 0.45], 1.35), '#c8323a'),
          ];
        }),
        VM(0.82),
        { outline: OL },
      );
      // 막대사탕(카메라 쪽 손)
      const lolly = new THREE.Group();
      add(lolly, cg('lollyStick', () => paint(place(cylGeo(0.009, 0.009, 0.2, 6), [0, 0.07, 0]), '#fbf6ee')), VM(0.5));
      add(
        lolly,
        cg('lollyCandy', () => place(cylGeo(0.075, 0.075, 0.03, 28), [0, 0.2, 0], [Math.PI / 2, 0, 0])),
        M('#ffffff', {
          rough: 0.3,
          map: texOnce('lolly', () =>
            canvasTexture(128, 128, (ctx, w) => {
              ctx.fillStyle = '#fff4f8';
              ctx.fillRect(0, 0, w, w);
              ctx.strokeStyle = '#ff4f8a';
              ctx.lineWidth = 11;
              ctx.beginPath();
              for (let a = 0; a < 18; a += 0.1) {
                const r = a * 3.4;
                ctx.lineTo(w / 2 + Math.cos(a) * r, w / 2 + Math.sin(a) * r);
              }
              ctx.stroke();
            }),
          ),
        }),
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
        armToward(P, 0, st.sw2.h, ARM * 1.28, 0.25, st.F);
      } else if (!st.walk && st.lk < 0.5) set3(st.F, -0.235, 0.06, 0.11);
    },
    after(P, st) {
      const l = P.items.lolly;
      l.visible = l.visible && !st.shock;
      l.position.copy(P.hands[0].position);
      l.rotation.set(0, 0, 0.45 + Math.sin(st.ph) * 0.15 * st.walk - st.lk * 0.2);
    },
  },

  // 산책하는 사람: 보라 후드티·높이 묶은 포니테일(노란 곱창끈)·운동화·개(시바). 상냥하고 밝다.
  walker: {
    umbY: 0.36,
    L: {
      skin: '#c98d62',
      top: '#9a5ce6',
      cuff: '#6c3cb8',
      legs: '#2b2a55',
      shoe: '#f6f4fb',
      sole: '#ff5f8f',
      face: { iris: '#6a3a1c', brow: '#2a1f2a', browW: 8.5, browArch: 9, lash: true, mouth: 'smile', blush: 0.9 },
    },
    build(P, R) {
      const top = '#9a5ce6';
      const g = grad(top, -0.09, 0.22, 0.2, 0.07);
      const rib = col(tone(top, -0.22));
      add(
        P.torso,
        merged('hoodieW', () => [
          paint(bodyGeo(), (x, y) => (y < -0.058 ? rib : g(x, y))),
          ...shoulderCaps(top, 0.074),
          paint(ell([0, 0.192, -0.115], [0.155, 0.088, 0.095]), (x, y) => g(x, y)),
          paint(frontPanel('kangaroo', -0.045, 0.06, 1.15, 0.92, 0.014), tone(top, -0.1)),
        ]),
        VM(0.85),
        { outline: OL },
      );
      add(
        P.torso,
        merged('hoodieWStr', () => [
          paint(rodGeo([-0.035, 0.212, 0.082], [-0.042, 0.12, 0.128], 0.009), '#fbf6ee'),
          paint(rodGeo([0.035, 0.212, 0.082], [0.042, 0.11, 0.13], 0.009), '#fbf6ee'),
          paint(ell([-0.042, 0.112, 0.13], [0.013, 0.02, 0.013]), '#ffd23f'),
          paint(ell([0.042, 0.102, 0.132], [0.013, 0.02, 0.013]), '#ffd23f'),
        ]),
        VM(0.6),
      );
      const hair = hairPaint('#33252f', 0.2);
      add(
        P.head,
        merged('walkerHair', () => [
          paint(capHair(), hair),
          paint(fringe(-28, -80, 0.15, 0.054, 0.036, 0.35), hair),
          paint(fringe(38, -78, 0.11, 0.046, 0.032, -0.4), hair),
          paint(place(capG(0.088, 0.36, 6), [0, 0.16, -0.4], [1.15, 0, 0]), hair),
          paint(ell([0, 0.075, -0.565], [0.082, 0.095, 0.082], [0.5, 0, 0]), hair),
          paint(place(torusGeo(0.252, 0.026, 8, 44), [0, 0.085, -0.032], [Math.PI / 2 - 0.36, 0, 0]), '#2fc8b8'),
          paint(place(torusGeo(0.07, 0.028, 8, 18), [0, 0.228, -0.25], [1.15 + Math.PI / 2, 0, 0]), '#ffd23f'),
        ]),
        VM(0.55),
        { outline: OL },
      );
      buildDog(R);
    },
    after(P, st, R) {
      updateDog(R, st);
    },
  },

  // 캠핑족: 주황 비니(방울)·초록 파카(털 깃)·큰 배낭과 침낭·법랑 머그·주근깨. 늘 싱글벙글.
  camper: {
    fprop: 'mug',
    umbY: 0.44,
    L: {
      skin: '#f6c29c',
      top: '#3e9b5a',
      cuff: '#2a6a3e',
      legs: '#8a6440',
      shoe: '#7a4a28',
      sole: '#3a2416',
      boot: true,
      trim: '#e8d2a0',
      face: { iris: '#3f8f3a', brow: '#a44a1c', browW: 10, browTilt: -0.12, browArch: 7, freckles: true, mouth: 'grin', blush: 1.1 },
    },
    build(P) {
      const top = '#3e9b5a';
      const g = grad(top, -0.09, 0.22, 0.22, 0.07);
      const hem = col(tone(top, -0.25));
      add(
        P.torso,
        merged('parka', () => [
          paint(bodyGeo(), (x, y) => (y < -0.06 ? hem : g(x, y))),
          ...shoulderCaps(top, 0.078),
          paint(place(fluffyRing('collar', 0.1, 0.044), [0, 0.218, 0.006], [Math.PI / 2 + 0.12, 0, 0], [1, 0.92, 1]), grad('#fff1d6', 0.18, 0.26, 0.15, 0)),
        ]),
        VM(0.85),
        { outline: OL },
      );
      add(
        P.torso,
        merged('parkaDetail', () => [
          paint(rodGeo(onBody(0.2, 0, 0.004), onBody(-0.07, 0, 0.012), 0.008), '#22502e'),
          paint(place(roundBoxGeo(0.07, 0.05, 0.02, 0.01, 2), onBody(0.06, -0.5, 0.012), [0, -0.5, 0]), tone(top, -0.12)),
          paint(place(roundBoxGeo(0.07, 0.05, 0.02, 0.01, 2), onBody(0.06, 0.5, 0.012), [0, 0.5, 0]), tone(top, -0.12)),
          paint(rodGeo([-0.088, 0.222, 0.03], [-0.1, 0.03, 0.15], 0.019), '#7a4a28'),
          paint(rodGeo([0.088, 0.222, 0.03], [0.1, 0.03, 0.15], 0.019), '#7a4a28'),
          paint(place(roundBoxGeo(0.034, 0.03, 0.018, 0.006, 1), [-0.098, 0.1, 0.145]), '#ffd23f'),
          paint(place(roundBoxGeo(0.034, 0.03, 0.018, 0.006, 1), [0.098, 0.1, 0.145]), '#ffd23f'),
        ]),
        VM(0.6),
      );
      // 배낭 + 침낭
      add(
        P.torso,
        merged('pack', () => {
          const pg = grad('#e08a3a', -0.06, 0.25, 0.22, 0.08);
          const blue = grad('#3f6fd0', 0.22, 0.33, 0.2, 0.08);
          const strap = col('#7a4a28');
          return [
            paint(place(roundBoxGeo(0.27, 0.3, 0.15, 0.055, 3), [0, 0.1, -0.19]), pg),
            paint(place(roundBoxGeo(0.28, 0.1, 0.16, 0.045, 3), [0, 0.215, -0.19]), tone('#e08a3a', -0.12)),
            paint(place(roundBoxGeo(0.18, 0.11, 0.06, 0.03, 2), [0, 0.04, -0.27]), tone('#e08a3a', -0.08)),
            paint(place(capG(0.062, 0.34, 10), [0, 0.3, -0.18], [0, 0, Math.PI / 2]), (x, y, z) => (Math.abs(Math.abs(x) - 0.09) < 0.016 ? strap : blue(x, y))),
          ];
        }),
        VM(0.8),
        { outline: OL },
      );
      add(P.head, merged('camperHair', () => [paint(capHair(), hairPaint('#d0662c')), paint(ell([-0.205, -0.06, 0.04], [0.055, 0.09, 0.06], [0, 0, 0.3]), '#c0582a'), paint(ell([0.205, -0.06, 0.04], [0.055, 0.09, 0.06], [0, 0, -0.3]), '#c0582a')]), VM(0.65), { outline: OL });
      const hat = new THREE.Group();
      hat.rotation.set(-0.28, 0, 0.05);
      P.head.add(hat);
      add(
        hat,
        merged('beanie', () => {
          const o = '#ff8a2c';
          const og = grad(o, 0.06, 0.3, 0.1, 0.1);
          const rib = col(tone(o, -0.12));
          const cream = grad('#fff1d6', 0.0, 0.12, 0.12, 0);
          return [
            paint(lathe('beanie', [[0, 0.3], [0.1, 0.292], [0.18, 0.258], [0.236, 0.19], [0.258, 0.11], [0.262, 0.06], [0.2, 0.05], [0, 0.05]], { n: 24, seg: 48 }), (x, y, z) => (Math.sin(Math.atan2(z, x) * 12) > 0.3 ? rib : og(x, y))),
            paint(place(torusGeo(0.254, 0.046, 10, 40), [0, 0.068, 0], [Math.PI / 2, 0, 0]), cream),
            paint(place(sphereGeo(1, 16, 12), [0, 0.325, 0], [0, 0, 0], 0.075), cream),
            paint(place(sphereGeo(1, 12, 10), [0.03, 0.34, 0.04], [0, 0, 0], 0.05), cream),
          ];
        }),
        VM(0.9),
        { outline: OL },
      );
      // 법랑 머그와 김
      const mug = new THREE.Group();
      add(
        mug,
        merged('mug', () => {
          const b = grad('#2f6fd8', 0, 0.09, 0.15, 0.08);
          const w = col('#fbf6ee');
          return [paint(place(cylGeo(0.048, 0.043, 0.09, 18), [0, 0.045, 0]), (x, y) => (y > 0.08 ? w : b(x, y))), paint(place(torusGeo(0.026, 0.01, 6, 14), [0.05, 0.045, 0]), '#2f6fd8')];
        }),
        VM(0.35),
        { outline: OLS },
      );
      const steam = M('#ffffff', { rough: 1, opacity: 0.6, transparent: true });
      mug.userData.steam = [add(mug, sphereGeo(0.024, 10, 8), steam, { cast: false }), add(mug, sphereGeo(0.019, 10, 8), steam, { cast: false })];
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
        headToTorso(P, -0.03, -0.2, 0.2, _c);
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
        s[i].scale.setScalar((0.6 + k * 0.9) * (1 - k * k) * (st.shock ? 0 : 1));
      }
      st.sip = 0;
    },
  },

  // 낚시꾼: 올리브 벙거지(빨간 미끼)·하얀 수염·졸린 눈·노란 비옷·초록 장화·낚싯대에 걸린 물고기. 무뚝뚝한 바닷사람.
  fisher: {
    fprop: 'rod',
    umbY: 0.34,
    L: {
      skin: '#eab38c',
      top: '#ffcf2e',
      cuff: '#e8a81e',
      legs: '#3d4f86',
      shoe: '#3f9a62',
      sole: '#24563a',
      boot: true,
      trim: '#64c07e',
      nose: 1.5,
      face: { iris: '#3f6a9a', brow: '#eceaf4', browW: 16, browLen: 44, browTilt: -0.22, browArch: 4, lid: 0.34, mouth: 'flat', mouthDY: 14, blush: 1.1 },
    },
    build(P) {
      const y = '#ffcf2e';
      const g = grad(y, -0.11, 0.22, 0.22, 0.06);
      add(
        P.torso,
        merged('raincoat', () => [
          paint(
            place(lathe('raincoat', [[0, -0.116], [0.18, -0.114], [0.206, -0.1], [0.196, -0.03], [0.178, 0.05], [0.158, 0.12], [0.13, 0.175], [0.092, 0.214], [0.045, 0.235], [0, 0.238]], { seg: 36, n: 30 }), [0, 0, 0], [0, 0, 0], [1, 1, 0.9]),
            g,
          ),
          ...shoulderCaps(y, 0.08),
          paint(place(torusGeo(0.104, 0.034, 8, 28), [0, 0.218, 0.01], [Math.PI / 2 + 0.22, 0, 0]), tone(y, 0.06)),
        ]),
        VM(0.42),
        { outline: OL },
      );
      add(
        P.torso,
        merged('coatBtn', () => [
          ...[0.14, 0.07, 0.0].map((yy) => paint(place(roundBoxGeo(0.045, 0.016, 0.016, 0.006, 1), onBody(yy, 0, 0.01)), '#c4661e')),
          paint(place(roundBoxGeo(0.07, 0.03, 0.02, 0.01, 2), onBody(-0.02, -0.55, 0.014), [0, -0.55, 0]), tone(y, -0.15)),
          paint(place(roundBoxGeo(0.07, 0.03, 0.02, 0.01, 2), onBody(-0.02, 0.55, 0.014), [0, 0.55, 0]), tone(y, -0.15)),
        ]),
        VM(0.45),
      );
      const white = grad('#f2f0f8', -0.32, 0.2, 0.14, 0);
      add(
        P.head,
        merged('fisherHair', () => [
          paint(capHair(0.97, -0.03), white),
          paint(ell([-0.2, -0.05, -0.03], [0.055, 0.09, 0.07]), white),
          paint(ell([0.2, -0.05, -0.03], [0.055, 0.09, 0.07]), white),
          paint(ell([0, -0.08, -0.15], [0.18, 0.12, 0.1]), white),
        ]),
        VM(0.92),
        { outline: OL },
      );
      add(
        P.head,
        merged('fisherBeard', () => [
          paint(ell(onFace(-98, 58, HR - 0.012), [0.06, 0.088, 0.064], [0, 0, 0], [16, 12]), white),
          paint(ell(onFace(98, 58, HR - 0.012), [0.06, 0.088, 0.064], [0, 0, 0], [16, 12]), white),
          paint(ell(onFace(-68, 104, HR - 0.02), [0.078, 0.072, 0.07], [0, 0, 0], [16, 12]), white),
          paint(ell(onFace(68, 104, HR - 0.02), [0.078, 0.072, 0.07], [0, 0, 0], [16, 12]), white),
          paint(ell(onFace(-30, 122, HR - 0.026), [0.08, 0.074, 0.07], [0, 0, 0], [16, 12]), white),
          paint(ell(onFace(30, 122, HR - 0.026), [0.08, 0.074, 0.07], [0, 0, 0], [16, 12]), white),
          paint(ell(onFace(0, 130, HR - 0.03), [0.078, 0.078, 0.072], [0, 0, 0], [16, 12]), white),
          paint(ell(onFace(-22, 62, HR + 0.002), [0.074, 0.036, 0.04], faceRot(-22, 62, 0.25), [16, 10], 'YXZ'), '#ffffff'),
          paint(ell(onFace(22, 62, HR + 0.002), [0.074, 0.036, 0.04], faceRot(22, 62, -0.25), [16, 10], 'YXZ'), '#ffffff'),
        ]),
        VM(0.92),
        { outline: 0.008 },
      );
      const hat = new THREE.Group();
      hat.rotation.set(-0.16, 0, -0.06);
      P.head.add(hat);
      add(
        hat,
        merged('bucketHat', () => {
          const o = grad('#8f9a52', 0.03, 0.27, 0.15, 0.08);
          const under = col('#5f6a30');
          return [
            paint(lathe('bucket', [[0, 0.275], [0.12, 0.272], [0.175, 0.255], [0.19, 0.2], [0.198, 0.13], [0.25, 0.08], [0.31, 0.04], [0.316, 0.024], [0.295, 0.02], [0.24, 0.055], [0.19, 0.095], [0, 0.1]], { n: 32, seg: 44 }), (x, yy, z, ny) => (ny < -0.3 ? under : o(x, yy))),
            paint(lathe('bucketBand', [[0.2, 0.13], [0.205, 0.135], [0.199, 0.178], [0.192, 0.183]], { smoothIt: false, seg: 40 }), '#5e6634'),
            paint(ell([0.14, 0.17, 0.15], [0.026, 0.026, 0.04], [0, 0.8, 0]), '#e2483c'),
            paint(ell([0.16, 0.17, 0.12], [0.02, 0.02, 0.03], [0, 0.8, 0]), '#ffffff'),
            paint(rodGeo([0.12, 0.17, 0.17], [0.1, 0.12, 0.2], 0.005), '#c3cbe6'),
            paint(ell([-0.17, 0.2, 0.05], [0.014, 0.07, 0.03], [0.3, 0, 0.5]), '#3f6fd0'),
          ];
        }),
        VM(0.85),
        { outline: OL },
      );
      // 낚싯대(어깨에 멘다), 줄, 물고기
      const rod = new THREE.Group();
      add(
        rod,
        merged('rodStick', () => [
          paint(rodGeo([0, 0.06, 0], [0, 1.0, 0], 0.011, 0.005, 6), '#3a2a26'),
          paint(place(cylGeo(0.022, 0.022, 0.14, 10), [0, 0.0, 0]), '#c08a50'),
          paint(place(cylGeo(0.034, 0.034, 0.03, 14), [0.035, 0.05, 0], [0, 0, Math.PI / 2]), '#c3cbe6'),
          paint(rodGeo([0.02, 0.05, 0], [0.05, 0.05, 0], 0.006), '#8a919f'),
        ]),
        VM(0.45),
      );
      const line = new THREE.Group();
      line.position.set(0, 1.0, 0);
      rod.add(line);
      line.userData.str = add(line, cg('fishLine', () => place(cylGeo(0.0035, 0.0035, 1, 4), [0, -0.5, 0])), M('#ffffff', { rough: 0.4 }), { cast: false });
      const fish = new THREE.Group();
      line.add(fish);
      add(
        fish,
        merged('fish2', () => {
          const body = grad('#ff7a2a', -0.15, 0.0, 0.18, 0.18);
          const belly = col('#fff1d6');
          const fin = col('#ffc23a');
          return [
            paint(ell([0, -0.08, 0], [0.024, 0.08, 0.05], [0, 0, 0], [16, 14]), (x, y, z) => (z > 0.022 ? belly : body(x, y))),
            paint(place(coneGeo(0.055, 0.075, 10), [0, -0.185, 0], [Math.PI, 0, 0], [0.3, 1, 1.25]), fin),
            paint(place(coneGeo(0.024, 0.045, 6), [0, -0.075, -0.05], [-Math.PI / 2, 0, 0], [0.3, 1, 1]), fin),
            paint(ell([0.02, -0.03, 0.016], [0.007, 0.014, 0.014]), '#ffffff'),
            paint(ell([-0.02, -0.03, 0.016], [0.007, 0.014, 0.014]), '#ffffff'),
            paint(ell([0.025, -0.03, 0.018], [0.005, 0.008, 0.008]), '#1d1430'),
            paint(ell([-0.025, -0.03, 0.018], [0.005, 0.008, 0.008]), '#1d1430'),
          ];
        }),
        VM(0.4),
        { outline: OLS },
      );
      line.userData.fish = fish;
      P.torso.add(rod);
      P.items.rod = rod;
      P.items.line = line;
    },
    pose(P, st) {
      if (!st.shock) set3(st.F, -0.17, 0.09, 0.12);
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
      // 물고기가 파닥거린다(들키면 더 세게)
      f.rotation.set(0, st.t * 1.5, Math.sin(st.t * (st.shock ? 22 : 7)) * (st.shock ? 0.6 : 0.25));
    },
  },

  // 회사원: 남색 양복·빨간 줄무늬 넥타이·사원증·서류 가방·포마드 머리. 늘 피곤하고 걱정이 많다(다크서클·땀).
  worker: {
    fprop: 'bag',
    umbY: 0.38,
    L: {
      skin: '#f6c29c',
      top: '#384a8f',
      cuff: '#f4f4fa',
      legs: '#2f3d7a',
      shoe: '#3a2418',
      sole: '#1e120c',
      face: { iris: '#4a3424', brow: '#231c2c', browW: 9, browTilt: -0.32, browArch: 3, lid: 0.2, bags: true, mouth: 'flat', sweat: true, blush: 0.7 },
    },
    build(P) {
      const navy = '#384a8f';
      const g = grad(navy, -0.09, 0.22, 0.2, 0.08);
      add(
        P.torso,
        merged('suit', () => [
          paint(bodyGeo(), g),
          ...shoulderCaps(navy, 0.08),
          paint(frontPanel('lapelV', 0.06, 0.236, 0.2, 1.42, 0.011), tone(navy, 0.12)),
          paint(frontPanel('shirtV', 0.1, 0.236, 0.04, 1.08, 0.017), '#f4f4fa'),
        ]),
        VM(0.7),
        { outline: OL },
      );
      add(
        P.torso,
        merged('suitDetail', () => {
          const red = col('#e2483c');
          const stripe = col('#ffd23f');
          return [
            paint(rodGeo([0, 0.222, 0.098], [0, 0.05, 0.168], 0.017, 0.028, 10), (x, yy) => (Math.sin(yy * 70) > 0.55 ? stripe : red)),
            paint(ell([0, 0.222, 0.096], [0.024, 0.022, 0.018]), '#c8323a'),
            paint(ell(onBody(0.03, 0, 0.012), [0.014, 0.014, 0.008]), '#1e2650'),
            paint(ell(onBody(-0.03, 0, 0.012), [0.014, 0.014, 0.008]), '#1e2650'),
            paint(place(roundBoxGeo(0.045, 0.02, 0.012, 0.006, 1), onBody(0.12, 0.55, 0.012), [0, 0.55, 0.3]), '#ffffff'),
            // 사원증(목줄 + 카드)
            paint(rodGeo([-0.05, 0.215, 0.07], [-0.082, 0.085, onBody(0.085, -0.5)[2] + 0.02], 0.006), '#3f9fe0'),
            paint(place(roundBoxGeo(0.052, 0.068, 0.012, 0.008, 1), [-0.085, 0.045, onBody(0.045, -0.48)[2] + 0.02], [0, -0.48, 0]), (x, yy) => (yy > 0.065 ? col('#3f9fe0') : col('#ffffff'))),
          ];
        }),
        VM(0.55),
      );
      const hair = grad('#2a2433', -0.1, 0.25, 0.1, 0.35);
      add(
        P.head,
        merged('workerHair', () => [
          paint(capHair(1.02, 0.008), hair),
          paint(place(sphereGeo(1, 20, 14), onFace(24, -86, HR + 0.006), faceRot(24, -86, -0.3), [0.17, 0.075, 0.085], 'YXZ'), hair),
          paint(place(sphereGeo(1, 16, 12), onFace(-40, -92, HR - 0.002), faceRot(-40, -92, 0.5), [0.09, 0.05, 0.06], 'YXZ'), hair),
          paint(ell([-0.2, -0.04, 0.03], [0.04, 0.07, 0.05]), hair),
          paint(ell([0.2, -0.04, 0.03], [0.04, 0.07, 0.05]), hair),
          paint(place(torusGeo(0.04, 0.014, 8, 16, Math.PI * 1.4), [-0.03, 0.29, -0.02], [0, Math.PI / 2 - 0.3, 0.6]), hair),
        ]),
        VM(0.32),
        { outline: OL },
      );
      const bag = new THREE.Group();
      add(
        bag,
        merged('briefcase', () => {
          const lea = grad('#9a5a34', -0.19, -0.02, 0.2, 0.1);
          return [
            paint(place(roundBoxGeo(0.08, 0.19, 0.25, 0.026, 3), [0, -0.11, 0]), lea),
            paint(place(torusGeo(0.034, 0.012, 6, 14, Math.PI), [0, -0.016, 0], [0, Math.PI / 2, 0]), '#5a3420'),
            paint(place(roundBoxGeo(0.086, 0.032, 0.05, 0.008, 1), [0, -0.05, 0]), '#ffd23f'),
            paint(place(roundBoxGeo(0.084, 0.012, 0.25, 0.005, 1), [0, -0.105, 0]), '#6a3c22'),
          ];
        }),
        VM(0.45),
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
    umbY: 0.4,
    L: {
      skin: '#a8714c',
      top: '#ff7fae',
      cuff: '#e0558a',
      legs: '#5f86d6',
      shoe: '#f6f4fb',
      sole: '#2fb5a6',
      face: { iris: '#7a3ad0', brow: '#1f1822', browW: 7.5, browArch: 11, browTilt: -0.08, lash: true, mouth: 'grin', sparkle: true, blush: 0.9, eyeH: 1.05 },
    },
    build(P) {
      const top = '#ff7fae';
      const g = grad(top, -0.09, 0.22, 0.2, 0.06);
      const rib = col(tone(top, -0.2));
      add(
        P.torso,
        merged('hoodieS', () => [paint(bodyGeo(), (x, y) => (y < -0.058 ? rib : g(x, y))), ...shoulderCaps(top, 0.074), paint(ell([0, 0.192, -0.115], [0.155, 0.088, 0.095]), (x, y) => g(x, y))]),
        VM(0.85),
        { outline: OL },
      );
      add(P.torso, cg('star', () => paint(starGeo(), '#ffffff')), VM(0.5), { pos: onBody(0.075, 0, -0.006) });
      // 고양이 귀 헤드폰(머리띠 + 귀덮개 + 귀)
      add(
        P.head,
        merged('catPhones', () => {
          const teal = grad('#2fc8b8', -0.1, 0.3, 0.2, 0.08);
          const pink = col('#ff8fb8');
          const parts = [paint(place(torusGeo(0.262, 0.024, 8, 36, Math.PI), [0, 0, -0.02], [-0.18, 0, 0]), teal)];
          for (const s of [-1, 1]) {
            parts.push(paint(place(cylGeo(0.08, 0.08, 0.06, 20), [s * 0.248, -0.01, -0.02], [0, 0, Math.PI / 2]), (x) => (Math.abs(x) > 0.27 ? pink : teal(x, 0))));
            parts.push(paint(place(coneGeo(0.085, 0.13, 12), [s * 0.175, 0.225, -0.04], [-0.18, 0, -s * 0.6]), teal));
            parts.push(paint(place(coneGeo(0.052, 0.085, 10), [s * 0.168, 0.22, 0.0], [-0.18, 0, -s * 0.6], [1, 1, 0.4]), pink));
          }
          return parts;
        }),
        VM(0.45),
        { outline: OL },
      );
      const hair = hairPaint('#2b2230', 0.2);
      add(
        P.head,
        merged('streamerHair', () => [
          paint(capHair(), hair),
          paint(fringe(-26, -80, 0.15, 0.054, 0.036, 0.3), hair),
          paint(fringe(32, -80, 0.13, 0.05, 0.034, -0.3), hair),
          paint(ell([-0.1, 0.2, -0.17], [0.085, 0.085, 0.085]), hair),
          paint(ell([0.1, 0.2, -0.17], [0.085, 0.085, 0.085]), hair),
        ]),
        VM(0.5),
        { outline: OL },
      );
      // 셀카봉 + 휴대폰
      const stick = new THREE.Group();
      add(stick, cg('selfie', () => paint(place(cylGeo(0.01, 0.012, 0.5, 8), [0, 0.25, 0]), grad('#4a4f7a', 0, 0.5, 0.2, 0.3))), VM(0.35, 0.3));
      const phone = new THREE.Group();
      phone.position.set(0, 0.52, 0);
      stick.add(phone);
      add(phone, roundBoxGeo(0.11, 0.18, 0.024, 0.02, 2), M('#8a6ad8', { rough: 0.4 }), { outline: OLS });
      add(phone, roundBoxGeo(0.092, 0.158, 0.006, 0.012, 1), M('#bff6ff', { rough: 0.3, emissive: '#7fe8ff', emissiveIntensity: 0.9 }), { pos: [0, 0, 0.012], cast: false });
      const rec = add(phone, sphereGeo(0.013, 8, 6), M('#ff3b3b', { emissive: '#ff2020', emissiveIntensity: 2 }), { pos: [0.03, 0.065, -0.015], cast: false });
      P.torso.add(stick);
      P.items.stick = stick;
      P.items.phone = phone;
      P.items.rec = rec;
    },
    pose(P, st) {
      // 평소엔 셀카(카메라 쪽 머리 위로 휴대폰을 들어 나를 찍는다), 올려다볼 때·들켰을 때는 높이 들어 기체를 찍는다
      const up = Math.max(st.lk, st.shock ? 1 : 0);
      if (up > 0) armToward(P, 0, 0.42 + (st.shock ? Math.sin(st.t * 15) * 0.08 : 0), ARM * 1.25, 0.3, st.T);
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
      top: '#f2f3f8',
      cuff: '#d6dbee',
      legs: '#56608f',
      shoe: '#6b4428',
      nose: 1.15,
      face: { iris: '#3f6fd0', brow: '#c2662e', browW: 12, browLen: 40, browAsym: 11, browArch: 6, mouth: 'smile', blush: 0.9, eyeW: 1.05 },
    },
    build(P) {
      const coat = '#f2f3f8';
      const g = grad(coat, -0.12, 0.22, 0.18, 0.02);
      add(
        P.torso,
        merged('labcoat', () => [
          paint(place(lathe('labcoat', [[0, -0.12], [0.188, -0.118], [0.206, -0.104], [0.192, -0.03], [0.174, 0.05], [0.154, 0.125], [0.126, 0.182], [0.088, 0.218], [0.044, 0.236], [0, 0.238]], { seg: 36, n: 30 }), [0, 0, 0], [0, 0, 0], [1, 1, 0.9]), g),
          ...shoulderCaps(coat, 0.078),
          paint(frontPanel('labShirt', 0.04, 0.236, 0.12, 1.05, 0.018), '#8fb4ea'),
          paint(frontPanel('labLapel', -0.11, 0.236, 0.2, 1.4, 0.012), g),
        ]),
        VM(0.8),
        { outline: OL },
      );
      add(
        P.torso,
        merged('labDetail', () => [
          paint(rodGeo([0, 0.222, 0.1], [0, 0.07, 0.16], 0.015, 0.024, 8), '#2b3a78'),
          paint(ell([0, 0.222, 0.098], [0.022, 0.02, 0.016]), '#1f2a5c'),
          paint(rodGeo([-0.098, 0.115, 0.14], [-0.098, 0.165, 0.128], 0.008), '#e2483c'),
          paint(rodGeo([-0.078, 0.115, 0.146], [-0.078, 0.16, 0.135], 0.008), '#3f6fd0'),
          paint(place(roundBoxGeo(0.075, 0.06, 0.016, 0.01, 2), onBody(0.105, -0.5, 0.016), [0, -0.5, 0]), tone(coat, -0.08)),
          paint(place(roundBoxGeo(0.08, 0.07, 0.016, 0.01, 2), onBody(-0.04, 0.6, 0.03), [0, 0.6, 0]), tone(coat, -0.08)),
        ]),
        VM(0.6),
      );
      // 옆머리 곱슬과 정수리 한 가닥
      const curls = [];
      const ging = hairPaint('#c8743a', 0.15);
      for (const s of [-1, 1]) {
        for (const [x, y, z, r] of [[0.21, 0.07, -0.06, 0.062], [0.2, 0.0, -0.11, 0.06], [0.2, 0.11, -0.12, 0.054], [0.15, 0.06, -0.18, 0.058], [0.22, -0.04, -0.05, 0.05], [0.24, 0.13, -0.02, 0.046]]) curls.push(paint(ell([s * x, y, z], [r, r, r], [0, 0, 0], [14, 10]), ging));
      }
      add(
        P.head,
        merged('astroHair', () => [...curls, paint(ell([0, 0.0, -0.21], [0.12, 0.09, 0.07]), ging), paint(place(torusGeo(0.035, 0.014, 8, 16, Math.PI * 1.5), [0.0, 0.272, 0.02], [0, Math.PI / 2, 0.3]), ging)]),
        VM(0.7),
        { outline: OLS },
      );
      add(P.head, cg('glasses', () => glassesGeo()), VM(0.35));
      add(P.head, cg('glassLens', () => lensGeo()), new THREE.MeshStandardMaterial({ color: '#cfefff', transparent: true, opacity: 0.32, roughness: 0.05, envMapIntensity: 1.5, depthWrite: false }), { cast: false }).renderOrder = 3;
      // 망원경
      const scope = new THREE.Group();
      add(
        scope,
        merged('scope2', () => {
          const tube = grad('#3f5fb8', 0, 0.36, 0.15, 0.12);
          const brass = col('#ffcf4a');
          return [
            paint(
              lathe('scope2', [[0.0, -0.02], [0.03, -0.02], [0.032, -0.001], [0.033, 0.001], [0.038, 0.06], [0.041, 0.104], [0.046, 0.106], [0.046, 0.134], [0.042, 0.136], [0.046, 0.2], [0.05, 0.26], [0.052, 0.294], [0.062, 0.296], [0.062, 0.37], [0.0, 0.37]], { smoothIt: false, seg: 22 }),
              (x, y) => ((y > 0.103 && y < 0.137) || y > 0.293 || y < 0.0 ? brass : tube(x, y)),
            ),
          ];
        }),
        VM(0.4),
        { outline: OLS },
      );
      add(scope, cylGeo(0.05, 0.05, 0.006, 18), M('#aef4ff', { rough: 0.1, emissive: '#5fdcff', emissiveIntensity: 1.3 }), { pos: [0, 0.372, 0], cast: false });
      P.torso.add(scope);
      P.items.scope = scope;
    },
    pose(P, st) {
      if (st.shock) return;
      if (st.lk > 0) {
        // 망원경을 카메라 쪽 눈에 대고 기체 쪽으로 든다(카메라 쪽 손이 받친다). 기체 쪽 손은 가리킨다.
        headToTorso(P, -0.1, 0.0, 0.3, _c);
        mix3(st.F, _c.x - 0.02, _c.y - 0.08, _c.z + 0.02, st.lk);
      } else if (!st.walk) set3(st.F, -0.19, 0.04, 0.12);
    },
    after(P, st) {
      const s = P.items.scope;
      if (st.lk > 0.5 && !st.shock) {
        // 접안렌즈 = 카메라 쪽 눈 앞, 방향 = 고개가 보는 쪽에서 조금 더 위
        headToTorso(P, -0.09, 0.02, 0.29, _c);
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
    umbY: 0.38,
    lookPitch: 0.3,
    L: {
      skin: '#d39a6c',
      top: '#2fb5a6',
      cuff: '#22907f',
      legs: '#454b7d',
      shoe: '#5a3526',
      face: { iris: '#9a5a1c', brow: '#3a2018', browW: 9, browAsym: 9, browTilt: 0.12, lid: 0.22, lash: true, mouth: 'smirk', blush: 0.8 },
    },
    build(P) {
      const kh = '#d9c08a';
      const g = grad(kh, -0.09, 0.22, 0.2, 0.06);
      add(
        P.torso,
        merged('vest', () => [paint(bodyGeo(), g), ...shoulderCaps('#2fb5a6', 0.074), paint(frontPanel('vestGap', -0.07, 0.236, 0.24, 0.92, 0.018), grad('#2fb5a6', -0.07, 0.22, 0.15, 0.05))]),
        VM(0.85),
        { outline: OL },
      );
      add(
        P.torso,
        merged('vestPockets', () => {
          const pk = tone(kh, -0.12);
          return [
            ...[-0.62, 0.62].map((a) => paint(place(roundBoxGeo(0.07, 0.06, 0.018, 0.01, 2), onBody(0.0, a, 0.008), [0, a, 0]), pk)),
            ...[-0.66, 0.66].map((a) => paint(place(roundBoxGeo(0.06, 0.045, 0.018, 0.01, 2), onBody(0.11, a, 0.008), [0, a, 0]), pk)),
            paint(place(torusGeo(0.138, 0.01, 6, 30, Math.PI * 0.9), [0, 0.15, 0.05], [Math.PI / 2 - 0.5, 0, Math.PI * 1.05]), '#e2483c'),
          ];
        }),
        VM(0.75),
      );
      const hair = hairPaint('#4a2c22', 0.18);
      add(
        P.head,
        merged('bob', () => [
          paint(ell([0, 0.0, -0.035], [0.268, 0.262, 0.255], [0, 0, 0], [32, 22]), hair),
          paint(fringe(-30, -78, 0.16, 0.057, 0.04, 0.4), hair),
          paint(fringe(32, -76, 0.12, 0.052, 0.036, -0.35), hair),
          ...[[-0.22, -0.14, 0.02], [0.22, -0.14, 0.02], [-0.17, -0.19, -0.1], [0.17, -0.19, -0.1], [0, -0.2, -0.17], [-0.25, -0.06, -0.06], [0.25, -0.06, -0.06]].map((p) => paint(ell(p, [0.064, 0.064, 0.064], [0, 0, 0], [12, 10]), hair)),
        ]),
        VM(0.55),
        { outline: OL },
      );
      add(
        P.head,
        merged('beret', () => {
          const r = grad('#e2483c', 0.15, 0.3, 0.15, 0.08);
          return [paint(ell([-0.03, 0.205, -0.02], [0.255, 0.088, 0.255], [0.1, 0, 0.3], [32, 16]), r), paint(place(cylGeo(0.013, 0.017, 0.045, 8), [-0.0, 0.3, -0.02], [0.1, 0, 0.3]), '#b8302a')];
        }),
        VM(0.88),
        { outline: OL },
      );
      // 사진기
      const cam = new THREE.Group();
      add(
        cam,
        merged('camBody2', () => {
          const body = grad('#3a4062', -0.045, 0.045, 0.2, 0.15);
          return [
            paint(place(roundBoxGeo(0.15, 0.095, 0.065, 0.02, 2)), body),
            paint(place(roundBoxGeo(0.153, 0.03, 0.068, 0.01, 1), [0, 0.035, 0]), '#c9cfe6'),
            paint(place(roundBoxGeo(0.05, 0.03, 0.045, 0.008, 1), [-0.035, 0.06, 0]), '#c9cfe6'),
            paint(place(cylGeo(0.013, 0.013, 0.014, 10), [0.045, 0.058, 0]), '#e2483c'),
            paint(place(cylGeo(0.04, 0.042, 0.055, 18), [0.015, 0, 0.055], [Math.PI / 2, 0, 0]), (x, y, z) => (z > 0.07 ? col('#c9cfe6') : col('#2a2f4a'))),
          ];
        }),
        VM(0.4),
        { outline: OLS },
      );
      add(cam, cylGeo(0.028, 0.028, 0.004, 16), M('#7fd8ff', { rough: 0.1, emissive: '#3fb8ff', emissiveIntensity: 1.2 }), { pos: [0.015, 0, 0.084], rot: [Math.PI / 2, 0, 0], cast: false });
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
        armToward(P, 0, 0.5, ARM * 1.15, 0.5, st.F);
        return;
      }
      if (st.lk > 0) {
        // 두 손으로 사진기를 눈앞에 든다
        headToTorso(P, -0.03, -0.03, 0.3, _c);
        mix3(st.F, _c.x - 0.085, _c.y - 0.03, _c.z - 0.02, st.lk);
        set3(st.B, lerp(st.B[0], _c.x + 0.085, st.lk), lerp(st.B[1], _c.y - 0.03, st.lk), lerp(st.B[2], _c.z - 0.02, st.lk));
        st.point = 0;
        st.maxB = 1.6;
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
        headToTorso(P, -0.03, -0.03, 0.3, _c);
        c.position.copy(_c);
        P.neck.updateMatrix();
        c.quaternion.setFromRotationMatrix(P.neck.matrix);
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
};

/** 구겨진 은박 고깔(머리 기준, 위 = +y). 위치마다 정해진 흔들림이라 이음매가 벌어지지 않는다. */
function foilGeo() {
  return cg('foilHat', () => {
    const hash = (x, y, z) => {
      const v = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
      return v - Math.floor(v);
    };
    const cone = lathe('foilCone2', [[0, 0.44], [0.04, 0.42], [0.1, 0.34], [0.165, 0.24], [0.22, 0.15], [0.262, 0.1], [0.292, 0.072], [0.27, 0.052], [0.0, 0.08]], { seg: 30, n: 14 }).clone();
    const p = cone.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);
      const n = hash(Math.round(x * 200), Math.round(y * 200), Math.round(z * 200)) - 0.5;
      const k = 1 + n * 0.2;
      p.setXYZ(i, x * k, y + n * 0.025, z * k);
    }
    cone.computeVertexNormals();
    const silver = col('#f2f2f4');
    const shade = col('#8e93a6');
    return mergeGeometries(
      [
        paint(cone, (x, y, z) => _pc.copy(shade).lerp(silver, hash(Math.round(x * 60), Math.round(y * 60), Math.round(z * 60)) * 0.75 + 0.25)),
        paint(rodGeo([0, 0.42, 0], [0.03, 0.56, 0.0], 0.009, 0.007), '#c3cbe6'),
        paint(ell([0.032, 0.58, 0], [0.032, 0.032, 0.032]), '#ff3b3b'),
      ],
      false,
    );
  });
}
let foilMat = null;
/** 반짝이는 은박(구김이 보이게 면마다 따로 빛난다). */
function foilMaterial() {
  if (!foilMat) foilMat = new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.32, metalness: 0.55, flatShading: true, envMapIntensity: 1.1 });
  return foilMat;
}

/** 레이더 접시(오목한 그릇 + 수신 뿔). 원점 = 접시 아래 가운데, 오목면이 +y. */
const dishGeo = () =>
  merged('radarDish', () => [
    paint(lathe('dish', [[0.0, -0.012], [0.05, -0.006], [0.1, 0.02], [0.13, 0.05]], { seg: 24, n: 8 }), grad('#e6e9f2', -0.01, 0.05, 0.15, 0.05)),
    paint(rodGeo([0, -0.01, 0], [0, 0.08, 0], 0.006), '#8a919f'),
    paint(ell([0, 0.085, 0], [0.016, 0.016, 0.016]), '#e2483c'),
  ]);

/** 큰 쌍안경(가운데가 원점, 대물렌즈가 +z). */
const binoGeo = () =>
  merged('binoculars', () => {
    const body = grad('#34423a', -0.05, 0.05, 0.18, 0.14);
    const parts = [paint(place(roundBoxGeo(0.06, 0.036, 0.07, 0.012, 2)), '#24302a')];
    for (const sx of [-1, 1]) {
      parts.push(paint(place(cylGeo(0.042, 0.042, 0.13, 14), [sx * 0.05, 0, 0], [Math.PI / 2, 0, 0]), body));
      parts.push(paint(place(cylGeo(0.05, 0.05, 0.03, 16), [sx * 0.05, 0, 0.065], [Math.PI / 2, 0, 0]), '#c9a24a'));
      parts.push(paint(place(cylGeo(0.026, 0.032, 0.035, 12), [sx * 0.05, 0, -0.078], [Math.PI / 2, 0, 0]), '#1a201c'));
      parts.push(paint(place(cylGeo(0.04, 0.04, 0.006, 16), [sx * 0.05, 0, 0.082], [Math.PI / 2, 0, 0]), '#8fe8ff'));
    }
    return parts;
  });

/** 보닛 얼굴 둘레의 물결 주름(보닛 구와 머리가 만나는 원을 따라 휜 고리). */
function ruffleGeo() {
  return cg('ruffle', () => {
    const R0 = 0.236 * 1.05;
    const arc = 3.9;
    const g = new THREE.TorusGeometry(R0, 0.036, 8, 72, arc);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);
      const u = Math.atan2(y, x);
      const cx = Math.cos(u) * R0;
      const cy = Math.sin(u) * R0;
      const k = 1 + 0.32 * Math.sin(u * 22);
      p.setXYZ(i, cx + (x - cx) * k * 1.25, cy + (y - cy) * k * 1.25, z * k * 0.8);
    }
    g.computeVertexNormals();
    // 고리 축 = 보닛 중심 방향, 이마 위에서 양쪽 귀 아래까지
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
    const r = i % 2 ? 0.022 : 0.05;
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.005, bevelSize: 0.005, bevelSegments: 1 });
}

/** 두꺼운 둥근 안경(테 두 개 + 코다리 + 다리). 머리 기준. */
function glassesGeo() {
  const parts = [];
  const rr = HR + 0.03;
  for (const sx of [-1, 1]) {
    const px = sx * 50;
    const py = 14;
    const c = onFace(px, py, rr);
    parts.push(paint(place(torusGeo(0.076, 0.016, 8, 32), c, faceRot(px, py), 1, 'YXZ'), '#2b2f4a'));
    const o = onFace(sx * 110, py - 4, HR + 0.012);
    parts.push(paint(rodGeo(o, [sx * 0.234, 0.03, -0.03], 0.009), '#2b2f4a'));
  }
  parts.push(paint(rodGeo(onFace(-22, 8, rr - 0.006), onFace(22, 8, rr - 0.006), 0.01), '#2b2f4a'));
  const g = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  return g;
}
/** 안경알(얇은 볼록 원판 두 개). */
function lensGeo() {
  const parts = [];
  for (const sx of [-1, 1]) {
    const c = onFace(sx * 50, 14, HR + 0.03);
    parts.push(place(sphereGeo(1, 18, 10), c, faceRot(sx * 50, 14), [0.07, 0.07, 0.012], 'YXZ'));
  }
  const g = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  return g;
}

// ───────── 개(시바) ─────────

function dogFace(ctx, s, mode) {
  ctx.clearRect(0, 0, s, s);
  ctx.save();
  ctx.scale(s / 256, s / 256);
  ctx.translate(128, 128);
  // 흰 눈썹 점
  ctx.fillStyle = '#fff1dc';
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(sx * 44, -50, 14, 10, 0, 0, TAU);
    ctx.fill();
  }
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  for (const sx of [-1, 1]) {
    if (mode === 'bark') {
      // 화난 눈: 비스듬한 눈꺼풀 아래 반짝이는 눈
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(sx * 44 - 30, -26 + sx * 10);
      ctx.lineTo(sx * 44 + 30, -26 - sx * 10);
      ctx.lineTo(sx * 44 + 30, 30);
      ctx.lineTo(sx * 44 - 30, 30);
      ctx.closePath();
      ctx.clip();
      dogEye(ctx, sx * 44, -10, 17, 21);
      ctx.restore();
      ctx.beginPath();
      ctx.moveTo(sx * 44 - 20, -24 + sx * 8);
      ctx.lineTo(sx * 44 + 20, -24 - sx * 8);
      ctx.lineWidth = 7;
      ctx.stroke();
    } else if (mode === 'happy') {
      ctx.beginPath();
      ctx.arc(sx * 44, 0, 16, Math.PI * 1.15, Math.PI * 1.85);
      ctx.lineWidth = 8;
      ctx.stroke();
    } else dogEye(ctx, sx * 44, -12, 17, 21);
  }
  ctx.restore();
}
function dogEye(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  const g = ctx.createLinearGradient(0, y - ry, 0, y + ry);
  g.addColorStop(0, '#120a20');
  g.addColorStop(1, '#4a2a5a');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(x - rx * 0.3, y - ry * 0.35, rx * 0.42, ry * 0.32, -0.4, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + rx * 0.4, y + ry * 0.42, rx * 0.17, 0, TAU);
  ctx.fill();
}

function buildDog(R) {
  const F = '#ec9442';
  const W = '#fff1dc';
  const D = {};
  D.g = new THREE.Group();
  D.g.position.set(0.6, 0, 0.16);
  D.g.rotation.y = Math.PI / 2 - 0.5;
  R.flip.add(D.g);
  D.hop = new THREE.Group();
  D.g.add(D.hop);
  const fur = grad(F, 0.06, 0.26, 0.18, 0.08);
  const white = col(W);
  add(
    D.hop,
    merged('dogBody2', () => [
      paint(ell([0, 0.155, 0], [0.105, 0.092, 0.155], [0, 0, 0], [24, 18]), (x, y) => (y < 0.12 ? white : fur(x, y))),
      paint(ell([0, 0.17, 0.1], [0.085, 0.085, 0.075]), (x, y, z) => (z > 0.13 && y < 0.2 ? white : fur(x, y))),
      paint(place(torusGeo(0.072, 0.014, 6, 20), [0, 0.218, 0.115], [Math.PI / 2 - 0.7, 0, 0]), '#e2483c'),
      paint(place(cylGeo(0.018, 0.018, 0.006, 12), [0, 0.17, 0.168], [Math.PI / 2 - 0.5, 0, 0]), '#ffd23f'),
    ]),
    VM(0.85),
    { outline: OLS },
  );
  // 다리: 대각선 둘씩 한 메시(종종걸음은 대각선 다리가 같이 움직인다). 발은 흰 양말.
  D.legs = [];
  for (const [k, pairs] of [['A', [[-0.058, 0.09], [0.058, -0.09]]], ['B', [[0.058, 0.09], [-0.058, -0.09]]]]) {
    const l = new THREE.Group();
    l.position.set(0, 0.12, 0);
    D.hop.add(l);
    add(l, merged(`dogLegs2${k}`, () => pairs.map(([x, z]) => paint(place(capG(0.034, 0.135, 6, 10), [x, -0.055, z]), (xx, y) => (y < -0.085 ? white : fur(xx, y + 0.12))))), VM(0.85));
    D.legs.push(l);
  }
  D.tail = new THREE.Group();
  D.tail.position.set(0, 0.21, -0.14);
  D.hop.add(D.tail);
  add(D.tail, cg('dogTail2', () => paint(place(torusGeo(0.048, 0.026, 8, 16, Math.PI * 1.45), [0, 0.042, -0.01], [0, Math.PI / 2, -0.5]), (x, y) => (y > 0.07 ? white : fur(x, 0.2)))), VM(0.85), { outline: OLS });
  D.head = new THREE.Group();
  D.head.position.set(0, 0.26, 0.13);
  D.hop.add(D.head);
  add(
    D.head,
    merged('dogHead2', () => {
      const pink = col('#ff9fb0');
      return [
        paint(place(sphereGeo(0.105, 28, 20)), (x, y, z) => (y < -0.03 && z > 0.02 ? white : fur(x, y + 0.2))),
        paint(place(coneGeo(0.044, 0.078, 10), [-0.058, 0.09, -0.01], [0, 0, 0.35]), fur(0, 0.3)),
        paint(place(coneGeo(0.044, 0.078, 10), [0.058, 0.09, -0.01], [0, 0, -0.35]), fur(0, 0.3)),
        paint(place(coneGeo(0.024, 0.05, 8), [-0.056, 0.084, 0.012], [0, 0, 0.35], [1, 1, 0.5]), pink),
        paint(place(coneGeo(0.024, 0.05, 8), [0.056, 0.084, 0.012], [0, 0, -0.35], [1, 1, 0.5]), pink),
        paint(ell([0, -0.035, 0.078], [0.062, 0.048, 0.058]), white),
        paint(ell([0, -0.01, 0.135], [0.022, 0.017, 0.016]), '#2a2140'),
      ];
    }),
    VM(0.8),
    { outline: OLS },
  );
  // 입(헥헥 혀 / 짖을 때 벌린 입)
  D.jaw = add(
    D.head,
    merged('dogMouth', () => [paint(ell([0, 0, 0.02], [0.036, 0.014, 0.036]), '#6c1e32'), paint(ell([0, -0.008, 0.045], [0.022, 0.01, 0.032], [0.5, 0, 0]), '#ff6d84')]),
    VM(0.5),
    { pos: [0, -0.068, 0.07] },
  );
  D.faces = { n: faceTexture('dog2|n', (ctx, s) => dogFace(ctx, s, 'n')), b: faceTexture('dog2|b', (ctx, s) => dogFace(ctx, s, 'bark')), h: faceTexture('dog2|h', (ctx, s) => dogFace(ctx, s, 'happy')) };
  D.face = faceCap(0.105, D.faces.n, { width: FACE_A, height: FACE_A });
  D.head.add(D.face);
  D.collar = new THREE.Object3D();
  D.collar.position.set(0, 0.235, 0.15);
  D.hop.add(D.collar);
  R.leash = add(R.flip, cg('leash', () => place(cylGeo(0.0075, 0.0075, 1, 6), [0, 0.5, 0])), M('#e2483c', { rough: 0.5 }), { cast: false });
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
  D.head.rotation.x = shock ? -0.35 : -st.lk * 0.5 + Math.sin(t * 4.5) * 0.04 * (1 - walk);
  D.head.rotation.y = Math.sin(t * 1.3) * 0.18 * (1 - walk) * (1 - st.lk);
  D.head.rotation.z = st.lk * 0.25;
  // 헥헥(혀를 내민 입) ↔ 짖기(크게 벌린 입)
  D.jaw.rotation.x = barking ? 0.55 : 0.15;
  D.jaw.scale.set(1, barking ? 1.5 : 1, 1);
  D.face.material.map = barking ? D.faces.b : st.lk > 0.5 ? D.faces.n : (t % 4.1) < 0.15 ? D.faces.h : D.faces.n;
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

let stripeTex = null;
function balloonTexture() {
  if (stripeTex) return stripeTex;
  stripeTex = canvasTexture(512, 256, (ctx, w, h) => {
    const n = 16;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = i % 2 ? '#ffd23f' : '#e9473b';
      ctx.fillRect((i * w) / n, 0, w / n + 1, h);
      ctx.fillStyle = 'rgba(120,30,40,0.25)';
      ctx.fillRect((i * w) / n, 0, 3, h);
    }
    // 아래쪽 흰 띠와 위쪽 파란 띠(별)
    ctx.fillStyle = '#fbf6ee';
    ctx.fillRect(0, h * 0.06, w, h * 0.07);
    ctx.fillStyle = '#3f6fd0';
    ctx.fillRect(0, h * 0.5, w, h * 0.1);
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 8; i++) {
      const x = (i + 0.5) * (w / 8);
      const y = h * 0.55;
      ctx.beginPath();
      for (let k = 0; k < 10; k++) {
        const r = k % 2 ? 4 : 10;
        const a = -Math.PI / 2 + (k * Math.PI) / 5;
        ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      ctx.fill();
    }
  });
  return stripeTex;
}
let wickerTex = null;
function wickerTexture() {
  if (wickerTex) return wickerTex;
  wickerTex = canvasTexture(128, 128, (ctx, w) => {
    ctx.fillStyle = '#c98a52';
    ctx.fillRect(0, 0, w, w);
    const row = 16;
    for (let y = 0; y < w; y += row) {
      for (let x = 0; x < w; x += 16) {
        const off = (y / row) % 2 ? 8 : 0;
        ctx.fillStyle = 'rgba(255,230,180,0.4)';
        ctx.beginPath();
        ctx.ellipse(x + off + 8, y + row / 2, 7, 5.5, 0, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = 'rgba(90,50,20,0.6)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  });
  return wickerTex;
}

const PILOT = 0.78; // 조종사 크기
const PILOT_Y = 0.085; // 조종사 발밑(바구니 안)

function buildBalloonist() {
  const L = {
    hs: 1.14,
    skin: '#f6c29c',
    top: '#8a5a34',
    cuff: '#fff1d6',
    glove: '#7a4a28',
    face: { iris: '#2f8fa8', brow: '#5a3522', browW: 10, browTilt: 0.12, browArch: 5, mouth: 'grin', blush: 1 },
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
  add(R.ride, roundBoxGeo(0.38, 0.25, 0.34, 0.035, 3), M('#ffffff', { rough: 0.9, map: wickerTexture() }), { pos: [0, 0.125, 0], outline: OL });
  add(
    R.ride,
    merged('basketRim', () => [paint(place(roundBoxGeo(0.42, 0.055, 0.38, 0.026, 2), [0, 0.262, 0]), grad('#8a5432', 0.24, 0.29, 0.2, 0.1)), paint(place(roundBoxGeo(0.4, 0.035, 0.36, 0.016, 2), [0, 0.018, 0]), '#6a3c22')]),
    VM(0.7),
    { outline: OLS },
  );
  add(R.ride, merged('sandbags2', () => [paint(ell([-0.205, 0.15, 0.08], [0.038, 0.048, 0.038]), '#e8d3a0'), paint(ell([-0.205, 0.14, -0.07], [0.034, 0.045, 0.034]), '#dcc48c'), paint(ell([-0.205, 0.2, 0.08], [0.012, 0.012, 0.012]), '#8a6a4a')]), VM(0.9));
  // 밧줄 + 작은 깃발 줄
  add(
    R.ride,
    merged('ropes2', () => {
      const parts = [
        paint(rodGeo([-0.19, 0.28, 0.16], [-0.14, 1.0, 0.12], 0.007), '#8a6a4a'),
        paint(rodGeo([0.19, 0.28, 0.16], [0.14, 1.0, 0.12], 0.007), '#8a6a4a'),
        paint(rodGeo([-0.19, 0.28, -0.16], [-0.14, 1.0, -0.12], 0.007), '#8a6a4a'),
        paint(rodGeo([0.19, 0.28, -0.16], [0.14, 1.0, -0.12], 0.007), '#8a6a4a'),
      ];
      const flags = ['#3f6fd0', '#ffd23f', '#5cbf5a', '#ff8fb0'];
      for (let i = 0; i < 4; i++) {
        const k = 0.25 + i * 0.17;
        const x = lerp(-0.19, -0.14, k);
        const y = lerp(0.28, 1.0, k);
        parts.push(paint(place(coneGeo(0.03, 0.06, 3), [x - 0.022, y - 0.02, lerp(0.16, 0.12, k)], [0, 0, Math.PI / 2 + 0.3], [1, 1, 0.2]), flags[i]));
      }
      return parts;
    }),
    VM(0.8),
  );
  // 버너와 불꽃
  add(
    R.ride,
    merged('burner2', () => {
      const steel = '#b4bcdc';
      return [paint(place(cylGeo(0.05, 0.045, 0.05, 14), [0, 0.81, 0]), steel), paint(place(torusGeo(0.11, 0.008, 6, 24), [0, 0.835, 0], [Math.PI / 2, 0, 0]), steel), paint(rodGeo([-0.11, 0.835, 0], [-0.14, 1.0, 0.0], 0.005), steel), paint(rodGeo([0.11, 0.835, 0], [0.14, 1.0, 0.0], 0.005), steel)];
    }),
    VM(0.35, 0.6),
  );
  R.flame = add(R.ride, cg('flame', () => place(coneGeo(0.035, 0.12, 10), [0, 0.06, 0])), M('#ff9a3c', { emissive: '#ff7a1c', emissiveIntensity: 2.4 }), { pos: [0, 0.835, 0], cast: false });
  R.glow = glowSprite('#ffb04a', 0.34, 0.75);
  R.glow.position.set(0, 0.88, 0);
  R.ride.add(R.glow);
  // 풍선
  add(R.ride, lathe('skirt', [[0.085, 0.915], [0.1, 0.945], [0.135, 0.985]], { smoothIt: false, seg: 24 }), M('#b8352c', { rough: 0.7, side: THREE.DoubleSide }));
  add(
    R.ride,
    lathe('envelope', [[0.13, 0.975], [0.2, 1.03], [0.3, 1.11], [0.4, 1.21], [0.452, 1.33], [0.464, 1.43], [0.45, 1.54], [0.396, 1.64], [0.29, 1.715], [0.15, 1.748], [0, 1.755]], { seg: 48, n: 40 }),
    M('#ffffff', { rough: 0.55, map: balloonTexture() }),
    { outline: OL },
  );
  // 조종사(작은 사람: 가슴 위만 바구니 밖으로)
  R.pilot = new THREE.Group();
  R.pilot.position.set(0, PILOT_Y, 0.0);
  R.pilot.scale.setScalar(PILOT);
  R.ride.add(R.pilot);
  const P = buildPerson(R.pilot, L, { legs: false });
  R.P = P;
  const g = grad('#8a5a34', 0.0, 0.22, 0.2, 0.1);
  add(P.torso, merged('flightJacket', () => [paint(bodyGeo(), g), ...shoulderCaps('#8a5a34', 0.078)]), VM(0.6), { outline: OL });
  // 펄럭이는 목도리(꼬리는 따로 흔든다)
  add(P.torso, cg('scarfRing', () => paint(place(torusGeo(0.112, 0.036, 8, 24), [0, 0.2, 0.01], [Math.PI / 2 + 0.2, 0, 0]), '#e2483c')), VM(0.8), { outline: OLS });
  R.scarf = new THREE.Group();
  R.scarf.position.set(0.07, 0.2, -0.08);
  P.torso.add(R.scarf);
  add(R.scarf, cg('scarfTail', () => paint(merged('scarfTailG', () => [place(capG(0.032, 0.24, 8), [0.1, 0, -0.04], [0, 0, Math.PI / 2], [1, 1, 0.5]), place(capG(0.03, 0.16, 6), [0.08, -0.05, -0.02], [0, 0, Math.PI / 2 - 0.5], [1, 1, 0.5])]), (x) => (x > 0.19 ? col('#ffd23f') : col('#e2483c')))), VM(0.8), { outline: OLS });
  add(
    P.head,
    merged('aviator2', () => {
      const lea = grad('#9a5a34', -0.15, 0.28, 0.2, 0.12);
      return [
        paint(ell([0, 0.035, -0.03], [0.258, 0.252, 0.255], [0, 0, 0], [32, 22]), lea),
        paint(ell([-0.215, -0.1, 0.03], [0.06, 0.11, 0.075], [0, 0, 0.15]), lea),
        paint(ell([0.215, -0.1, 0.03], [0.06, 0.11, 0.075], [0, 0, -0.15]), lea),
      ];
    }),
    VM(0.6),
    { outline: OL },
  );
  const gg = [];
  for (const sx of [-1, 1]) {
    const c = onFace(sx * 36, -88, HR + 0.03);
    gg.push(paint(place(torusGeo(0.054, 0.016, 8, 20), c, faceRot(sx * 36, -88), 1, 'YXZ'), '#c3cbe6'));
    gg.push(paint(place(sphereGeo(0.05, 14, 10), c, faceRot(sx * 36, -88), [1, 1, 0.35], 'YXZ'), '#7fe0f8'));
  }
  gg.push(paint(rodGeo(onFace(-8, -88, HR + 0.03), onFace(8, -88, HR + 0.03), 0.01), '#c3cbe6'));
  add(P.head, merged('goggles2', () => gg), VM(0.2, 0.3), { outline: OLS });
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
  const foc = shock ? 0.75 : lk;
  const elev = clamp(st.aim.elev, 0.15, 1.25);
  const br = Math.sin(t * 2.3);
  P.base.position.set(0, shock ? st.sw.hop * 0.4 : 0, 0);
  P.base.rotation.set(0, 0, shock ? st.sw.lean * 0.6 : lk * 0.04);
  const sy = shock ? st.sw.sq : 1 + br * 0.01;
  P.base.scale.set(1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy));
  const bodyYaw = lerp(YAW - 0.35, st.aim.yaw * 0.55 - 0.2, foc);
  P.body.rotation.set(0, bodyYaw, 0);
  P.torso.rotation.set(-lk * elev * 0.1, 0, 0);
  P.torso.scale.set(1, 1 + br * 0.012, 1);
  const yawRel = clamp(st.aim.yaw - bodyYaw - 0.35, -0.75, 0.75) * foc;
  const pitch = foc * elev * (shock ? 0.3 : 0.62);
  const idle = st.idle;
  P.neck.rotation.set(-pitch + Math.sin(t * 1.3) * 0.03, yawRel + Math.sin(t * 0.55 + 1) * 0.2 * idle, Math.sin(t * 1.7) * 0.05 * idle + lk * 0.1 + (shock ? Math.sin(t * 17) * 0.05 : 0));
  // 손: 평소엔 바구니 테를 잡는다(조종사 몸통 기준)
  const rimY = (0.29 - PILOT_Y) / PILOT - HIP;
  set3(st.F, -0.22, rimY, 0.19);
  set3(st.B, 0.22, rimY, 0.19);
  for (const sh of P.arms) sh.position.copy(sh.userData.base);
  if (shock) armToward(P, 1, st.sw.h, ARM * 1.28, 0.25, st.B);
  else if (wave) armToward(P, 1, 0.98 + Math.sin(t * 10) * 0.3, ARM * 1.42, 0.85, st.B);
  else if (lk > 0) pointUp(P, st, lk);
  reach(P, 0, st.F, 1.5);
  reach(P, 1, st.B, 1.5);
  placeFinger(P, st);
  if (shock) holdNet(P, P.net, 1, st.sw.a, st.sw.v);
  else P.net.visible = false;
  pickFace(P, st, R.seed);
}

// ───────── 우주비행사 ─────────

function buildAstronaut() {
  const SUIT = '#eef0f8';
  const ACC = '#ff7a3c';
  const L = { skin: '#d39a6c', top: SUIT, cuff: ACC, glove: ACC, legs: SUIT, shoe: '#d6d9ee', sole: '#5a6290', boot: true, trim: ACC, face: { iris: '#5a3a20', brow: '#2a2130', browW: 9, browArch: 9, mouth: 'smile', lookMouth: 'gasp', blush: 1 } };
  const R = { type: 'astronaut', seed: 1.1 };
  R.root = new THREE.Group();
  R.root.name = 'watcher:astronaut';
  R.flip = new THREE.Group();
  R.root.add(R.flip);
  R.drift = new THREE.Group();
  R.flip.add(R.drift);
  // 사람 뼈대를 그대로 쓰되 몸 중심이 원점이 되게 내린다(발 −0.45 … 헬멧 꼭대기 +0.45)
  R.suit = new THREE.Group();
  R.suit.position.y = -0.45;
  R.drift.add(R.suit);
  const P = buildPerson(R.suit, L);
  R.P = P;
  const g = grad(SUIT, -0.09, 0.22, 0.14, 0.02);
  add(
    P.torso,
    merged('suitBody2', () => [
      paint(place(lathe('suit', [[0, -0.088], [0.11, -0.086], [0.162, -0.062], [0.182, -0.01], [0.18, 0.06], [0.165, 0.13], [0.136, 0.185], [0.096, 0.222], [0.046, 0.238], [0, 0.24]], { seg: 36, n: 30 }), [0, 0, 0], [0, 0, 0], [1, 1, 0.92]), (x, y) => (Math.abs(y + 0.01) < 0.02 ? col('#b8bdd6') : g(x, y))),
      ...shoulderCaps(SUIT, 0.082),
      paint(place(torusGeo(0.12, 0.036, 10, 28), [0, 0.218, 0], [Math.PI / 2, 0, 0]), '#c9cde4'),
      paint(place(roundBoxGeo(0.27, 0.29, 0.13, 0.05, 3), [0, 0.11, -0.18]), grad('#d6d9ee', -0.03, 0.25, 0.15, 0.03)),
    ]),
    VM(0.62),
    { outline: OL },
  );
  add(
    P.torso,
    roundBoxGeo(0.13, 0.085, 0.03, 0.012, 2),
    M('#ffffff', {
      rough: 0.4,
      map: texOnce('panel', () =>
        canvasTexture(64, 48, (ctx) => {
          ctx.fillStyle = '#3f6fd0';
          ctx.fillRect(0, 0, 64, 48);
          for (const [x, c] of [[14, '#ff7a5c'], [32, '#ffd23f'], [50, '#5fe0c8']]) {
            ctx.fillStyle = c;
            ctx.beginPath();
            ctx.arc(x, 18, 6, 0, TAU);
            ctx.fill();
          }
          ctx.fillStyle = '#9fe8ff';
          ctx.fillRect(10, 32, 44, 5);
        }),
      ),
      emissive: '#ffffff',
      emissiveIntensity: 0.25,
    }),
    { pos: [0, 0.09, 0.152], rot: [-0.12, 0, 0] },
  );
  // 헬멧: 앞이 뚫린 흰 껍데기 + 유리 + 주황 테. 머리는 조금 줄여 안에 넣는다.
  P.head.scale.setScalar(0.98);
  const helm = new THREE.Group();
  helm.position.y = HEAD_C;
  P.neck.add(helm);
  const HELM = 0.31;
  const OPEN = 0.98;
  add(
    helm,
    merged('helmet2', () => [
      paint(place(new THREE.SphereGeometry(HELM, 40, 28, 0, TAU, OPEN, Math.PI - OPEN), [0, 0.01, 0], [Math.PI / 2, 0, 0]), grad(SUIT, -0.3, 0.3, 0.14, 0.02)),
      paint(place(torusGeo(HELM * Math.sin(OPEN), 0.02, 10, 40), [0, 0.01, HELM * Math.cos(OPEN)]), ACC),
      paint(place(cylGeo(0.065, 0.065, 0.05, 16), [-HELM + 0.012, 0.0, -0.02], [0, 0, Math.PI / 2]), '#d6d9ee'),
      paint(place(cylGeo(0.065, 0.065, 0.05, 16), [HELM - 0.012, 0.0, -0.02], [0, 0, Math.PI / 2]), '#d6d9ee'),
      paint(place(cylGeo(0.008, 0.006, 0.12, 6), [HELM * 0.62, HELM * 0.78, -0.06], [0, 0, -0.6]), '#8a919f'),
      paint(ell([HELM * 0.62 + 0.04, HELM * 0.78 + 0.05, -0.06], [0.018, 0.018, 0.018]), '#ff4a3c'),
    ]),
    VM(0.5),
    { outline: OL },
  );
  const visor = add(
    helm,
    cg('visor2', () => place(new THREE.SphereGeometry(HELM - 0.004, 32, 12, 0, TAU, 0, OPEN + 0.03), [0, 0.01, 0], [Math.PI / 2, 0, 0])),
    new THREE.MeshStandardMaterial({ color: '#b8ecff', transparent: true, opacity: 0.2, roughness: 0.05, metalness: 0.1, envMapIntensity: 1.6, depthWrite: false }),
    { cast: false },
  );
  visor.renderOrder = 4;
  // 유리 위 반짝임(왼쪽 위)
  const glint = add(helm, cg('glint2', () => place(torusGeo(0.22, 0.013, 6, 20, 0.9), [0, 0.01, 0.19], [0, 0, 2.0], [1, 1, 0.5])), basicGlint(), { cast: false });
  glint.renderOrder = 5;
  add(P.head, merged('astroHair2', () => [paint(capHair(1, 0.004), hairPaint('#2a2130', 0.2)), paint(fringe(-20, -80, 0.16, 0.05, 0.035, 0.3), hairPaint('#2a2130', 0.2))]), VM(0.5));
  // 생명줄(등 → 아래 뒤쪽으로 길게)
  add(
    R.drift,
    cg('tether', () => {
      const c = new THREE.CatmullRomCurve3([[0.0, -0.32, -0.2], [-0.25, -0.55, -0.32], [-0.2, -0.95, -0.3], [-0.55, -1.35, -0.35], [-0.75, -1.9, -0.4]].map((p) => new THREE.Vector3(...p)));
      return new THREE.TubeGeometry(c, 40, 0.018, 6, false);
    }),
    M('#e4e6f2', { rough: 0.6 }),
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
  const foc = shock ? 1 : lk;
  const elev = clamp(st.aim.elev, -0.3, 1.25);
  const br = Math.sin(t * 2);
  P.base.position.set(0, 0, 0);
  P.base.rotation.set(0, 0, 0);
  P.base.scale.setScalar(1);
  const bodyYaw = lerp(0.32, st.aim.yaw * 0.5 + 0.05, foc);
  P.body.rotation.set(0, bodyYaw, 0);
  P.torso.rotation.set(-foc * elev * 0.12, 0, 0);
  P.torso.scale.set(1, 1 + br * 0.012, 1);
  for (let i = 0; i < P.legs.length; i++) {
    const s = i ? 1 : -1;
    const l = P.legs[i];
    l.rotation.set(Math.sin(t * 1.9 + s) * 0.18 + (walk ? Math.sin(t * 3 + s * 1.5) * 0.3 * walk : 0) + (shock ? 0.3 + Math.sin(t * 9 + s) * 0.25 : 0), 0, s * (0.12 + (shock ? 0.2 : 0)));
  }
  const yawRel = clamp(st.aim.yaw - bodyYaw, -0.75, 0.75) * foc;
  const pitch = foc * elev * (shock ? 0.4 : 0.5);
  P.neck.rotation.set(-pitch + Math.sin(t * 1.2) * 0.03, yawRel, Math.sin(t * 1.5) * 0.04);
  for (const sh of P.arms) sh.position.copy(sh.userData.base);
  const swim = Math.sin(t * 1.7);
  set3(st.F, -0.24, 0.02 + swim * 0.04, 0.08);
  set3(st.B, 0.24, 0.0 - swim * 0.04, 0.06);
  if (shock) {
    // 깜짝 놀라 양팔을 허우적거리며 기체를 가리킨다
    pointUp(P, st, 1);
    armToward(P, 0, 0.6 + Math.sin(t * 13) * 0.35, ARM * 1.2, 0.4, st.F);
  } else if (lk > 0) pointUp(P, st, lk);
  else if (wave) armToward(P, 1, 0.98 + Math.sin(t * 10) * 0.3, ARM * 1.42, 0.85, st.B);
  reach(P, 0, st.F, 1.4);
  reach(P, 1, st.B, 1.4);
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
 *   pose = { t, dir(-1|1 걷는 방향), walk(0..1), look(0..1), shock(bool), wave(bool), target?(기체의 월드 위치) }
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
    const def = DEFS[type] || DEFS.farmer;
    R = { type, seed: WATCHER_TYPES.indexOf(type) * 0.77 };
    R.root = new THREE.Group();
    R.root.name = `watcher:${type}`;
    R.flip = new THREE.Group();
    R.root.add(R.flip);
    const P = buildPerson(R.flip, def.L);
    R.P = P;
    def.build(P, R);
    // 종류별 손 목표·소품 놓기. after 에는 R 도 넘긴다(개처럼 뒤집힌 틀에 붙는 것)
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
      umbY: def.umbY ?? 0.36,
    };
    buildExtras(P, type);
    update = (p) => updateGround(R, p);
  }
  const pose0 = { t: 0, dir: 1, walk: 0, look: 0 };
  update(pose0);
  if (R.topY === undefined) {
    if (!topCache.has(type)) {
      R.root.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(R.P.head);
      _a.setFromMatrixPosition(R.root.matrixWorld);
      topCache.set(type, box.max.y - _a.y);
    }
    R.topY = topCache.get(type);
  }
  const headMesh = R.P.headMesh;
  return {
    root: R.root,
    update,
    headWorld(out) {
      headMesh.updateWorldMatrix(true, false);
      return out.setFromMatrixPosition(headMesh.matrixWorld);
    },
    topY: R.topY,
  };
}
