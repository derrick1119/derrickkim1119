// 3D 지구인(하늘을 올려다보는 구경꾼) 11종. 컨셉 아트의 꼬마 3D 카툰 인물.
//
// 짜임
//   · 머리(키의 절반쯤)·몸통·짧은 팔다리를 둥근 도형으로 만들고, 얼굴은 캔버스 그림(faceCap)을 갈아 끼워 표정을 바꾼다.
//   · 한 벌만 만들고 걷는 방향(dir)에 따라 좌우를 뒤집는다(flip.scale.x = dir). 뒤집힌 틀 안에서 인물은 늘
//     +x 쪽으로 3/4 돌아서 있고, 카메라 쪽 팔(로컬 −x, 오른팔)이 몸짓(손 차양·잠자리채·손 인사)을 맡는다.
//     들고 다니는 물건은 반대 손(왼손)에 든다.
//   · 원점: 보통 사람은 발밑 가운데(키 ≈ 1.0), 열기구는 바구니 바닥 가운데(≈ 1.75), 우주비행사는 몸 중심(≈ 0.9).
//   · update 에서는 도형·재질을 만들지 않는다. 미리 만든 부품을 옮기고 돌리고, 얼굴 텍스처만 바꿔 끼운다.
//   · 같은 종류를 여러 번 만들어도 도형·재질·텍스처는 캐시에서 함께 쓴다.
import { THREE, mat, mesh, sphereGeo, capsuleGeo, cylGeo, coneGeo, torusGeo, roundBoxGeo, addOutline, glowSprite, canvasTexture, faceTexture, faceCap, tone } from './kit.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** 지구인 종류(게임 순서). */
export const WATCHER_TYPES = ['farmer', 'kid', 'walker', 'camper', 'fisher', 'worker', 'streamer', 'astronomer', 'photographer', 'balloonist', 'astronaut'];

const TAU = Math.PI * 2;
// 뼈대(발밑 기준, 1 = 64px)
const HIP = 0.2; // 다리 관절 높이 = 몸통 원점
const NECK = 0.232; // 몸통 원점 → 목(머리가 도는 곳)
const HEAD_C = 0.205; // 목 → 머리 중심
const HR = 0.24; // 머리 반지름(키의 약 절반이 머리)
const SHX = 0.128; // 어깨(몸통 기준)
const SHY = 0.19;
const ARM = 0.21; // 어깨 → 손 중심
const LEG_X = 0.072;
const FOOT_Y = -0.155; // 다리 관절 → 신발 가운데
const YAW = 0.55; // 평소 3/4 돌아선 각
const FACE_A = 1.7; // 얼굴 그림이 덮는 각(가로·세로 같게 해서 그림의 원이 머리에서도 원이 되게)
const FK = 256 / FACE_A; // 얼굴 그림 px / 라디안
const OL = 0.017; // 외곽선(머리·몸통·모자)
const OLS = 0.012; // 외곽선(팔다리·소품)

const clamp01 = (v) => Math.min(1, Math.max(0, v || 0));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (k) => k * k * (3 - 2 * k);

const DOWN = new THREE.Vector3(0, -1, 0);
const UP = new THREE.Vector3(0, 1, 0);
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _m = new THREE.Matrix4();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();

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

/** 구를 늘려 만든 타원체(합치기용). */
const ell = (pos, r, rot = [0, 0, 0], seg = [20, 14], order = 'XYZ') => place(sphereGeo(1, seg[0], seg[1]), pos, rot, r, order);

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

// 재질: 무광 점토/플라스틱
const M = (c, o = {}) => mat(c, { rough: 0.78, ...o });

/** 메시를 붙인다(외곽선 선택). */
function add(parent, geo, material, { pos, rot, scale, outline = 0, cast = true } = {}) {
  const m = mesh(geo, material, { cast, pos, rot, scale });
  if (outline) addOutline(m, outline);
  parent.add(m);
  return m;
}

// ───────── 공통 도형 ─────────

/** 머리 + 귀. */
const headGeo = () =>
  merged('head', () => [
    place(sphereGeo(HR, 40, 30)),
    ell([-0.228, -0.02, -0.01], [0.042, 0.058, 0.036], [0, 0, 0.2]),
    ell([0.228, -0.02, -0.01], [0.042, 0.058, 0.036], [0, 0, -0.2]),
  ]);
const armGeo = () => cg('arm', () => place(capsuleGeo(0.045, 0.235, 6, 14), [0, -0.098, 0]));
const legGeo = () => cg('leg', () => place(capsuleGeo(0.06, 0.19, 6, 14), [0, -0.075, 0]));
const shoeGeo = () => cg('shoe', () => ell([0, 0, 0.006], [0.07, 0.05, 0.098], [0, 0, 0], [22, 14]));
const bootGeo = () =>
  merged('boot', () => [place(capsuleGeo(0.07, 0.15, 5, 14), [0, 0.055, -0.012]), ell([0, 0, 0.012], [0.074, 0.052, 0.1], [0, 0, 0], [22, 14])]);
const handGeo = () => sphereGeo(0.058, 18, 12);

// 몸통 옆모습(몸통 원점 = 엉덩이 높이). 아래가 넓은 종 모양.
const BODY = [[0, -0.072], [0.1, -0.07], [0.148, -0.05], [0.163, -0.005], [0.159, 0.07], [0.143, 0.14], [0.118, 0.195], [0.082, 0.234], [0.038, 0.255], [0, 0.26]];
const bodyGeo = () => cg('body', () => place(lathe('body', BODY), [0, 0, 0], [0, 0, 0], [1, 1, 0.9]));
/** 몸통 반지름(앞판 만들 때 몸통에 붙이려고). */
function bodyR(y) {
  for (let i = 1; i < BODY.length; i++) {
    const [r0, y0] = BODY[i - 1];
    const [r1, y1] = BODY[i];
    if (y <= y1) return lerp(r0, r1, (y - y0) / (y1 - y0));
  }
  return 0;
}
/**
 * 몸통 앞에 붙는 판(앞치마·가슴받이·셔츠 앞섶). y0..y1 에서 가로 각이 w0 → w1 로 변한다(V 자 앞섶).
 * out = 몸통에서 띄우는 거리, flare = 아래쪽을 더 띄우는 양.
 */
function frontPanel(key, y0, y1, w0, w1 = w0, out = 0.008, flare = 0) {
  return cg(`panel:${key}`, () => {
    const rows = 10;
    const cols = 12;
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

// ───────── 얼굴 그림 ─────────

const MOUTH = '#86283a';
const TONGUE = '#ff7b88';
const EYE_INK = '#22183a';

function blush(ctx, x, y) {
  const g = ctx.createRadialGradient(x, y, 2, x, y, 33);
  g.addColorStop(0, 'rgba(255,96,112,0.62)');
  g.addColorStop(0.55, 'rgba(255,112,124,0.28)');
  g.addColorStop(1, 'rgba(255,120,130,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, 34, 24, 0, 0, TAU);
  ctx.fill();
}

/** 반짝이는 검은 눈동자(위 큰 반사광 + 아래 작은 반사광). */
function glossy(ctx, x, y, rx, ry) {
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  const g = ctx.createLinearGradient(x, y - ry, x, y + ry);
  g.addColorStop(0, '#120a22');
  g.addColorStop(0.5, '#24183e');
  g.addColorStop(1, '#5b4796');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  ctx.fillStyle = 'rgba(150,128,236,0.45)';
  ctx.beginPath();
  ctx.ellipse(x, y + ry * 0.82, rx * 0.78, ry * 0.38, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(x - rx * 0.3, y - ry * 0.36, rx * 0.42, ry * 0.31, -0.35, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + rx * 0.38, y + ry * 0.42, rx * 0.17, 0, TAU);
  ctx.fill();
}

function eye(ctx, x, y, sx, st, ex) {
  const rx = st.lash ? 24 : 23;
  const ry = st.lash ? 32 : 31;
  ctx.lineCap = 'round';
  if (ex === 'h') {
    // 웃는 눈 ^ ^
    ctx.beginPath();
    ctx.arc(x, y + ry * 0.45, rx * 1.02, Math.PI * 1.13, Math.PI * 1.87);
    ctx.lineWidth = 7.5;
    ctx.strokeStyle = EYE_INK;
    ctx.stroke();
    return;
  }
  if (ex === 'b') {
    // 깜빡
    ctx.beginPath();
    ctx.moveTo(x - rx * 1.05, y + 2);
    ctx.quadraticCurveTo(x, y + 12, x + rx * 1.05, y + 2);
    ctx.lineWidth = 6.5;
    ctx.strokeStyle = EYE_INK;
    ctx.stroke();
    if (st.lash) {
      ctx.beginPath();
      ctx.moveTo(x + sx * rx * 0.95, y + 3);
      ctx.lineTo(x + sx * rx * 1.4, y - 2);
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    return;
  }
  if (ex === 'g' || ex === 'l') {
    // 흰자가 보이는 눈: 올려다보기(눈동자 위로), 놀람(작은 눈동자)
    const k = ex === 'g' ? 1.16 : 1.06;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, y, rx * k, ry * k, 0, 0, TAU);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 3.2;
    ctx.strokeStyle = EYE_INK;
    ctx.stroke();
    ctx.clip();
    if (ex === 'l') glossy(ctx, x, y - ry * 0.3, rx * 0.86, ry * 0.8);
    else glossy(ctx, x, y - 1, rx * 0.5, ry * 0.5);
    ctx.restore();
  } else if (ex === 's') {
    // 화난 눈: 안쪽 위를 눈꺼풀이 비스듬히 덮는다
    const inner = x - sx * rx;
    const outer = x + sx * rx;
    const yi = y - ry * 0.12;
    const yo = y - ry * 0.95;
    const at = (xx) => yi + ((xx - inner) / (outer - inner)) * (yo - yi);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x - 30, at(x - 30));
    ctx.lineTo(x + 30, at(x + 30));
    ctx.lineTo(x + 30, y + 40);
    ctx.lineTo(x - 30, y + 40);
    ctx.closePath();
    ctx.clip();
    glossy(ctx, x, y + 1, rx * 1.02, ry * 1.0);
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(inner - sx * 3, at(inner - sx * 3));
    ctx.lineTo(outer + sx * 3, at(outer + sx * 3));
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = EYE_INK;
    ctx.stroke();
  } else {
    glossy(ctx, x, y, rx, ry);
  }
  if (st.lash && ex !== 's') {
    // 위 눈꺼풀 선과 바깥 속눈썹
    const k = ex === 'g' ? 1.16 : ex === 'l' ? 1.06 : 1;
    ctx.beginPath();
    ctx.ellipse(x, y, rx * k + 1, ry * k + 1, 0, Math.PI * 1.12, Math.PI * 1.88);
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = EYE_INK;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + sx * rx * 0.85 * k, y - ry * 0.62 * k);
    ctx.lineTo(x + sx * rx * 1.38 * k, y - ry * 0.95 * k);
    ctx.lineWidth = 4;
    ctx.stroke();
  }
}

function brow(ctx, x, y, sx, st, ex) {
  const w = st.browW || 9;
  ctx.strokeStyle = st.brow;
  ctx.lineCap = 'round';
  let yb = y - 50;
  ctx.beginPath();
  if (ex === 's') {
    ctx.moveTo(x + sx * 22, yb - 9);
    ctx.lineTo(x - sx * 17, yb + 14);
    ctx.lineWidth = w * 1.3;
  } else {
    const lift = ex === 'l' ? 9 : ex === 'g' ? 14 : ex === 'h' ? 5 : 0;
    const arch = ex === 'l' || ex === 'g' ? 9 : 5;
    yb -= lift;
    ctx.moveTo(x - 19, yb + 4);
    ctx.quadraticCurveTo(x, yb - arch, x + 19, yb + 4);
    ctx.lineWidth = w;
  }
  ctx.stroke();
}

function mouth(ctx, y, ex) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (ex === 's') {
    // 소리치는 입: 윗니가 보이는 D 자
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-26, y - 8);
    ctx.quadraticCurveTo(0, y - 13, 26, y - 8);
    ctx.quadraticCurveTo(27, y + 26, 0, y + 28);
    ctx.quadraticCurveTo(-27, y + 26, -26, y - 8);
    ctx.closePath();
    ctx.fillStyle = MOUTH;
    ctx.fill();
    ctx.clip();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-30, y - 16, 60, 12);
    ctx.fillStyle = TONGUE;
    ctx.beginPath();
    ctx.ellipse(0, y + 24, 16, 10, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  } else if (ex === 'h') {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-22, y - 6);
    ctx.quadraticCurveTo(0, y - 1, 22, y - 6);
    ctx.quadraticCurveTo(20, y + 21, 0, y + 22);
    ctx.quadraticCurveTo(-20, y + 21, -22, y - 6);
    ctx.closePath();
    ctx.fillStyle = MOUTH;
    ctx.fill();
    ctx.clip();
    ctx.fillStyle = TONGUE;
    ctx.beginPath();
    ctx.ellipse(0, y + 18, 13, 8, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  } else if (ex === 'l' || ex === 'g') {
    const k = ex === 'g' ? 1.45 : 1;
    ctx.beginPath();
    ctx.ellipse(0, y + 3, 9.5 * k, 12 * k, 0, 0, TAU);
    ctx.fillStyle = MOUTH;
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = TONGUE;
    ctx.beginPath();
    ctx.ellipse(0, y + 3 + 11 * k, 8 * k, 6 * k, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  } else {
    ctx.beginPath();
    ctx.moveTo(-12, y);
    ctx.quadraticCurveTo(0, y + 11, 12, y);
    ctx.lineWidth = 6;
    ctx.strokeStyle = MOUTH;
    ctx.stroke();
  }
}

/** 얼굴 한 장. ex: n 보통, b 깜빡, l 올려다봄, s 화나서 소리침, h 웃음(손 인사), g 깜짝(우주비행사). */
function paintFace(ctx, s, st, ex) {
  ctx.clearRect(0, 0, s, s);
  ctx.save();
  ctx.scale(s / 256, s / 256);
  ctx.translate(128, 128);
  const EX = 50;
  const EY = 14;
  blush(ctx, -82, 58);
  blush(ctx, 82, 58);
  if (st.freckles) {
    ctx.fillStyle = 'rgba(176,96,52,0.75)';
    for (const sx of [-1, 1]) {
      for (const [fx, fy] of [[70, 50], [86, 46], [78, 60], [94, 57], [63, 61]]) {
        ctx.beginPath();
        ctx.arc(sx * fx, fy, 2.6, 0, TAU);
        ctx.fill();
      }
    }
  }
  for (const sx of [-1, 1]) eye(ctx, sx * EX, EY, sx, st, ex);
  for (const sx of [-1, 1]) brow(ctx, sx * EX, EY, sx, st, ex);
  mouth(ctx, 72 + (st.mouthDY || 0), ex);
  ctx.restore();
}

const EXPR = ['n', 'b', 'l', 's', 'h', 'g'];
/** 얼굴 텍스처 묶음(캐시). */
function faceSet(st) {
  const key = `p3|${st.brow}|${st.browW || 0}|${st.lash ? 1 : 0}|${st.freckles ? 1 : 0}|${st.mouthDY || 0}`;
  const set = {};
  for (const ex of EXPR) set[ex] = faceTexture(`${key}|${ex}`, (ctx, s) => paintFace(ctx, s, st, ex));
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
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(0, 0, w, w);
      ctx.strokeStyle = 'rgba(255,255,255,1)';
      ctx.lineWidth = 8;
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
  const frame = merged('netFrame', () => [
    place(cylGeo(0.015, 0.018, 0.52, 10), [0, 0.2, 0]),
    place(torusGeo(0.125, 0.013, 8, 40), [0, NET_HOOP_Y, 0], [0, 0, 0], [1, 1.16, 1]),
    place(cylGeo(0.02, 0.02, 0.05, 10), [0, 0.43, 0]),
  ]);
  add(g, frame, M('#5e3a24', { rough: 0.6 }));
  const bag = cg('netBag', () => {
    const geo = new THREE.LatheGeometry(
      new THREE.SplineCurve([[0.125, 0], [0.122, 0.06], [0.105, 0.13], [0.075, 0.19], [0.035, 0.225], [0, 0.235]].map(([r, y]) => new THREE.Vector2(r, y))).getPoints(14),
      24,
    );
    // 테 평면(xy)에 입구를 두고, 깊이(y)만큼 뒤(−z)와 아래(−y)로 처지게 비튼다.
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);
      p.setXYZ(i, x, z * 1.16 - y * 0.75, -y * 0.9);
    }
    geo.computeVertexNormals();
    return geo;
  });
  const b = add(g, bag, netMaterial(), { pos: [0, NET_HOOP_Y, 0], cast: false });
  b.renderOrder = 3;
  g.visible = false;
  return g;
}

// ───────── 사람 뼈대 ─────────

/**
 * 사람 한 명의 뼈대와 공통 부품(머리·얼굴·코·팔·손·다리). parent 에 붙인다.
 * 몸통 모양·머리카락·모자·소품은 종류마다 따로 붙인다.
 */
function buildPerson(parent, L, { legs = true } = {}) {
  const P = { L, legs: [], arms: [], hands: [], items: {} };
  P.body = new THREE.Group();
  parent.add(P.body);
  P.torso = new THREE.Group();
  P.torso.position.y = HIP;
  P.body.add(P.torso);
  P.neck = new THREE.Group();
  P.neck.position.y = NECK;
  P.neck.rotation.order = 'YXZ';
  P.torso.add(P.neck);
  P.head = new THREE.Group();
  P.head.position.y = HEAD_C;
  P.neck.add(P.head);
  P.skin = M(L.skin, { rough: 0.62 });
  P.headMesh = add(P.head, headGeo(), P.skin, { outline: OL });
  add(P.head, sphereGeo(0.032, 16, 12), M(tone(L.skin, -0.06), { rough: 0.55 }), { pos: onFace(0, 44, HR - 0.006) });
  P.faces = faceSet(L.face);
  P.face = faceCap(HR, P.faces.n, { width: FACE_A, height: FACE_A });
  P.head.add(P.face);
  const sleeve = L.sleeve === 'short' ? P.skin : M(L.arm || L.top);
  const handMat = L.glove ? M(L.glove, { rough: 0.6 }) : P.skin;
  for (const s of [-1, 1]) {
    const sh = new THREE.Group();
    sh.position.set(s * SHX, SHY, 0);
    sh.userData.base = sh.position.clone();
    P.torso.add(sh);
    add(sh, armGeo(), sleeve, { outline: OLS });
    P.arms.push(sh);
    P.hands.push(add(P.torso, handGeo(), handMat, { outline: OLS }));
  }
  if (legs) {
    for (const s of [-1, 1]) {
      const hip = new THREE.Group();
      hip.position.set(s * LEG_X, HIP, 0);
      P.body.add(hip);
      add(hip, legGeo(), M(L.legs), { outline: OLS });
      add(hip, L.boot ? bootGeo() : shoeGeo(), M(L.shoe, { rough: 0.55 }), { pos: [0, FOOT_Y, 0.022], outline: OLS });
      P.legs.push(hip);
    }
  }
  // 가리키는 손가락(올려다볼 때)
  P.finger = add(P.torso, cg('finger', () => place(capsuleGeo(0.021, 0.085, 4, 8), [0, -0.035, 0])), handMat);
  P.finger.visible = false;
  P.net = makeNet();
  P.torso.add(P.net);
  return P;
}

/**
 * 올려다볼 때 카메라 쪽 팔: 기체 쪽 하늘을 손가락으로 가리킨다(머리가 커서 팔이 이마에 닿지 않으므로
 * 손 차양 대신 머리 옆으로 팔을 쭉 뻗는다). k = 0..1
 */
function pointUp(P, st, bodyYaw, k) {
  const yr = clamp(st.aim.yaw - bodyYaw, -0.6, 0.9);
  const el = clamp(st.aim.elev, 0.6, 1.25);
  _c.set(-0.55 + Math.sin(yr) * 0.12, 0.6 + el * 0.2, 0.2).normalize();
  const sh = P.arms[0].userData.base;
  const t = [sh.x + _c.x * ARM * 1.12, sh.y + 0.02 + _c.y * ARM * 1.12, sh.z + _c.z * ARM * 1.12];
  st.F = [lerp(st.F[0], t[0], k), lerp(st.F[1], t[1], k), lerp(st.F[2], t[2], k)];
  st.point = k;
}

/** 손가락을 손 끝에 붙인다. */
function placeFinger(P, st) {
  const show = (st.point || 0) > 0.5;
  P.finger.visible = show;
  if (show) {
    P.finger.position.copy(P.hands[0].position);
    P.finger.quaternion.copy(P.arms[0].quaternion);
  }
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
  P.hands[i].position.copy(sh.position).addScaledVector(_a, ARM * k);
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

/** 한 장면 상태(포즈 계산 중간값). */
function poseState(p) {
  const t = p.t || 0;
  const shock = !!p.shock;
  const wave = !shock && !!p.wave;
  const look = shock || wave ? 0 : clamp01(p.look);
  const walk = clamp01(p.walk);
  return { t, dir: p.dir < 0 ? -1 : 1, walk, shock, wave, look, lk: smooth(look), ph: t * 9, aim: { yaw: 0, elev: 0 }, F: [0, 0, 0], B: [0, 0, 0], palm: 0, netB: false };
}

/** 표정 고르기. */
function pickFace(P, st, seed) {
  let ex = 'n';
  if (st.shock) ex = P.shockFace || 's';
  else if (st.wave) ex = 'h';
  else if (st.look > 0.5) ex = 'l';
  else if ((st.t + seed) % 3.7 < 0.13) ex = 'b';
  P.face.material.map = P.faces[ex];
}

/** 잠자리채 휘두르기. 손 i 에 쥐고, side 쪽으로 기울인다. */
function swingNet(net, hand, t, side, phase = 0) {
  net.visible = true;
  net.position.copy(hand.position);
  const sw = Math.sin(t * 7 + phase);
  net.rotation.set(-0.35 + Math.cos(t * 7 + phase) * 0.15, 0.25 * side, -side * (0.25 + sw * 0.55));
}

// ───────── 땅 위 사람 공통 동작 ─────────

/**
 * 걷기·올려다보기·들킴·손 인사. 종류별 pose(P, st) 가 손 목표를 바꾸고, after(P, st) 가 소품을 놓는다.
 */
function updateGround(R, pose) {
  const P = R.P;
  const st = poseState(pose);
  const { t, walk, shock, wave, lk } = st;
  R.flip.scale.x = st.dir;
  aimAt(R.root, R.flip, pose.target, 0.66, st.aim);
  const foc = shock ? 0.75 : lk;
  const elev = clamp(st.aim.elev, 0.15, 1.25);

  // 몸 방향·통통 튀기
  const bodyYaw = lerp(YAW, st.aim.yaw * 0.55 + 0.12, foc);
  P.body.rotation.y = bodyYaw;
  const hopK = Math.abs(Math.sin(t * 7));
  const hop = shock ? hopK * 0.065 : 0;
  P.body.position.y = Math.abs(Math.cos(st.ph)) * 0.024 * walk + hop;

  // 다리
  const lph = shock ? t * 14 : st.ph;
  const amp = shock ? 0.35 + walk * 0.25 : 0.62 * walk;
  P.legs[0].rotation.x = Math.sin(lph) * amp;
  P.legs[1].rotation.x = -Math.sin(lph) * amp;

  // 몸통: 걸을 때 앞으로, 올려다볼 때 뒤로 젖힌다
  const sw = Math.sin(st.ph) * walk;
  P.torso.rotation.set(0.07 * walk + (shock ? 0.05 : 0) - lk * elev * 0.12, -sw * 0.1, Math.sin(st.ph) * 0.035 * walk);

  // 고개
  const yawRel = clamp(st.aim.yaw - bodyYaw, -0.75, 0.75) * foc;
  const pitch = foc * elev * (shock ? 0.32 : R.def.lookPitch ?? 0.6);
  const idle = 1 - Math.max(walk, foc);
  P.neck.rotation.set(-pitch + Math.sin(st.ph * 2) * 0.025 * walk + Math.sin(t * 1.3) * 0.02 * idle, yawRel, Math.sin(t * 1.7) * 0.035 * idle + (shock ? Math.sin(t * 14) * 0.05 : 0));

  // 손 목표(몸통 기준). F = 카메라 쪽(오른손), B = 반대 손
  st.F = [-0.205, -0.002, 0.035 + sw * 0.11];
  st.B = [0.205, -0.002, 0.035 - sw * 0.11];
  for (const sh of P.arms) sh.position.copy(sh.userData.base);
  if (shock) {
    st.F = [-0.25, 0.33, 0.1];
    st.B = [0.25, 0.28 + Math.sin(t * 14) * 0.035, 0.07];
  } else if (wave) {
    st.F = [-0.28 + Math.sin(t * 10) * 0.06, 0.36, 0.08];
  } else if (lk > 0) {
    pointUp(P, st, bodyYaw, lk);
  }
  R.def.pose?.(P, st);
  reach(P, 0, st.F, st.maxF || 1.5);
  reach(P, 1, st.B, st.maxB || 1.4);
  // 손바닥(차양)
  const hF = P.hands[0];
  if (st.palm > 0.01) {
    hF.scale.set(lerp(1, 1.25, st.palm), lerp(1, 0.6, st.palm), lerp(1, 1.3, st.palm));
    hF.rotation.set(-pitch * 0.8 - 0.25 * st.palm, 0, 0.3 * st.palm);
  } else {
    hF.scale.setScalar(wave ? 1.12 : 1);
    hF.rotation.set(0, 0, 0);
  }
  P.hands[1].scale.setScalar(1);
  placeFinger(P, st);
  // 잠자리채
  if (shock) swingNet(P.net, hF, t, -1);
  else P.net.visible = false;
  if (P.net2) {
    if (shock && st.netB) swingNet(P.net2, P.hands[1], t, 1, 1.9);
    else P.net2.visible = false;
  }
  R.def.after?.(P, st);
  pickFace(P, st, R.seed);
}

// ───────── 종류별 생김새 ─────────

/** 짧은 머리 덮개(정수리·뒤통수). 앞 이마는 열어 둔다. */
const capHair = (s = 1, dy = 0) => ell([0, 0.04 + dy, -0.032], [0.253 * s, 0.246 * s, 0.25 * s], [0, 0, 0], [32, 22]);

/** 이마 앞머리(납작한 타원체를 이마 곡면에 기울여 붙인다). */
const fringe = (x, y, rx, ry, rz, roll = 0) => {
  const p = onFace(x, y, HR - 0.004);
  return ell(p, [rx, ry, rz], faceRot(x, y, roll), [18, 12], 'YXZ');
};

const DEFS = {
  // 농부: 밀짚모자·콧수염·흰 셔츠·파란 멜빵바지·쇠스랑
  farmer: {
    L: { skin: '#f3b998', top: '#efe6d4', sleeve: 'short', legs: '#5577c8', shoe: '#7a4a2e', face: { brow: '#3a2014', browW: 12, mouthDY: 14 } },
    build(P) {
      const shirt = M(P.L.top);
      add(P.torso, merged('farmerShirt', () => [place(bodyGeo()), ell([-SHX, SHY - 0.005, 0], [0.072, 0.066, 0.072]), ell([SHX, SHY - 0.005, 0], [0.072, 0.066, 0.072])]), shirt, { outline: OL });
      const blue = M('#5577c8');
      add(
        P.torso,
        merged('overalls', () => [
          place(lathe('overLow', [[0, -0.078], [0.106, -0.076], [0.156, -0.054], [0.17, -0.005], [0.168, 0.058], [0.08, 0.062], [0, 0.062]], { n: 20 }), [0, 0, 0], [0, 0, 0], [1, 1, 0.9]),
        ]),
        blue,
        { outline: OL },
      );
      add(P.torso, frontPanel('bib', 0.04, 0.168, 1.0, 1.0, 0.02), blue);
      add(
        P.torso,
        merged('straps', () => [rodGeo([-0.07, 0.158, 0.118], [-0.1, 0.235, 0.0], 0.016), rodGeo([0.07, 0.158, 0.118], [0.1, 0.235, 0.0], 0.016)]),
        blue,
      );
      add(P.torso, merged('btn2', () => [ell([-0.068, 0.15, 0.132], [0.017, 0.017, 0.01]), ell([0.068, 0.15, 0.132], [0.017, 0.017, 0.01])]), M('#ffd23f', { rough: 0.4 }));
      // 머리카락(모자 밑으로 보이는 옆·뒤), 콧수염
      const hair = M('#5e3720', { rough: 0.6 });
      add(
        P.head,
        merged('farmerHair', () => [
          capHair(1, -0.01),
          ell([-0.205, -0.07, 0.05], [0.04, 0.085, 0.05]),
          ell([0.205, -0.07, 0.05], [0.04, 0.085, 0.05]),
          ell([0, -0.1, -0.16], [0.17, 0.11, 0.1]),
        ]),
        hair,
        { outline: OL },
      );
      add(
        P.head,
        merged('mustache', () => [
          ell(onFace(-21, 60, HR + 0.0), [0.076, 0.038, 0.04], faceRot(-21, 60, 0.3), [18, 12], 'YXZ'),
          ell(onFace(21, 60, HR + 0.0), [0.076, 0.038, 0.04], faceRot(21, 60, -0.3), [18, 12], 'YXZ'),
          ell(onFace(-54, 73, HR - 0.008), [0.032, 0.028, 0.03], faceRot(-54, 73), [12, 8], 'YXZ'),
          ell(onFace(54, 73, HR - 0.008), [0.032, 0.028, 0.03], faceRot(54, 73), [12, 8], 'YXZ'),
        ]),
        M('#4a2716', { rough: 0.7 }),
        { outline: OLS },
      );
      // 밀짚모자
      const hat = new THREE.Group();
      hat.rotation.set(-0.2, 0, 0.07);
      P.head.add(hat);
      add(
        hat,
        lathe('straw', [[0, 0.31], [0.1, 0.305], [0.16, 0.285], [0.183, 0.23], [0.19, 0.16], [0.198, 0.12], [0.27, 0.112], [0.35, 0.098], [0.39, 0.08], [0.388, 0.062], [0.35, 0.068], [0.27, 0.085], [0.2, 0.098], [0.0, 0.1]], { seg: 40, n: 40 }),
        M('#eec26a', { rough: 0.85 }),
        { outline: OL },
      );
      add(hat, lathe('strawBand', [[0.188, 0.118], [0.194, 0.125], [0.19, 0.17], [0.182, 0.176]], { seg: 32, smoothIt: false }), M('#b4553a'));
      // 쇠스랑
      const fork = new THREE.Group();
      add(fork, cylGeo(0.016, 0.016, 0.78, 8), M('#b37a45'), { pos: [0, 0.18, 0] });
      add(
        fork,
        merged('forkHead', () => [
          rodGeo([-0.07, 0.6, 0], [0.07, 0.6, 0], 0.012),
          rodGeo([-0.07, 0.6, 0], [-0.07, 0.75, 0], 0.011, 0.006),
          rodGeo([0, 0.57, 0], [0, 0.77, 0], 0.011, 0.006),
          rodGeo([0.07, 0.6, 0], [0.07, 0.75, 0], 0.011, 0.006),
        ]),
        M('#b4bcdc', { rough: 0.35, metal: 0.6 }),
      );
      P.torso.add(fork);
      P.items.fork = fork;
    },
    pose(P, st) {
      if (st.shock) st.B = [0.22, 0.26 + Math.sin(st.t * 14) * 0.03, 0.1];
    },
    after(P, st) {
      const f = P.items.fork;
      f.position.copy(P.hands[1].position);
      f.rotation.set(0.15, 0, st.shock ? -0.15 + Math.sin(st.t * 14) * 0.08 : -0.12);
    },
  },

  // 아이: 흰 보닛·빨간 원피스·흰 앞치마. 들키면 잠자리채 두 개.
  kid: {
    L: { skin: '#f6c29c', top: '#c9455a', sleeve: 'short', legs: '#3c3a66', shoe: '#8c2f3f', face: { brow: '#5a3220', lash: true } },
    build(P) {
      const red = M('#c9455a');
      add(
        P.torso,
        merged('dress', () => [
          place(lathe('dress', [[0, -0.108], [0.19, -0.106], [0.214, -0.09], [0.2, -0.03], [0.17, 0.04], [0.146, 0.1], [0.134, 0.15], [0.116, 0.2], [0.082, 0.236], [0.04, 0.255], [0, 0.258]]), [0, 0, 0], [0, 0, 0], [1, 1, 0.92]),
          ell([-SHX, SHY - 0.01, 0], [0.075, 0.07, 0.075]),
          ell([SHX, SHY - 0.01, 0], [0.075, 0.07, 0.075]),
        ]),
        red,
        { outline: OL },
      );
      const apron = M('#ebe6de', { rough: 0.85 });
      add(
        P.torso,
        cg('apron', () =>
          place(
            lathe('apronSkirt', [[0.226, -0.088], [0.214, -0.03], [0.186, 0.03], [0.162, 0.075]], { seg: 16, phiStart: -0.72, phiLength: 1.44, n: 10 }),
            [0, 0, 0],
            [0, 0, 0],
            [1, 1, 0.92],
          ),
        ),
        apron,
      );
      add(P.torso, frontPanel('apronBib', 0.06, 0.205, 0.95, 0.85, 0.02), apron);
      // 머리카락: 보닛 밑 옆머리와 앞머리
      add(
        P.head,
        merged('kidHair', () => [
          ell([-0.19, -0.08, 0.06], [0.07, 0.12, 0.08], [0, 0, 0.15]),
          ell([0.19, -0.08, 0.06], [0.07, 0.12, 0.08], [0, 0, -0.15]),
          ell([0, -0.05, -0.1], [0.22, 0.2, 0.17]),
          fringe(-36, -86, 0.08, 0.05, 0.03, 0.55),
          fringe(0, -92, 0.085, 0.05, 0.03),
          fringe(36, -86, 0.08, 0.05, 0.03, -0.55),
        ]),
        M('#86512f', { rough: 0.6 }),
        { outline: OL },
      );
      // 보닛 + 얼굴 둘레 주름 장식
      const W = M('#f6f3ee', { rough: 0.85 });
      add(P.head, cg('bonnet', () => ell([0, 0.055, -0.075], [0.275, 0.272, 0.27], [0, 0, 0], [36, 26])), W, { outline: OL });
      add(P.head, cg('frill', () => ruffleGeo()), W, { outline: OLS });
      add(
        P.head,
        merged('ribbon', () => [
          ell([-0.06, 0, 0], [0.062, 0.04, 0.024], [0, 0, 0.45], [14, 10]),
          ell([0.06, 0, 0], [0.062, 0.04, 0.024], [0, 0, -0.45], [14, 10]),
          ell([0, 0, 0.004], [0.026, 0.026, 0.024], [0, 0, 0], [10, 8]),
        ]),
        M('#e2483c', { rough: 0.55 }),
        { pos: [-0.15, 0.2, 0.1], rot: [-0.5, -0.6, 0.45], scale: 1.3, outline: OLS / 1.3 },
      );
      P.net2 = makeNet();
      P.torso.add(P.net2);
    },
    pose(P, st) {
      if (st.shock) {
        st.B = [0.21, 0.36, 0.1];
        st.netB = true;
      }
    },
  },

  // 산책하는 사람: 보라 후드티·포니테일·개(시바)
  walker: {
    L: { skin: '#d39a6c', top: '#8a6ad8', legs: '#2f3d7a', shoe: '#f2f0f8', face: { brow: '#2a1f2a', lash: true } },
    build(P, R) {
      add(P.torso, merged('hoodieW', () => [place(bodyGeo()), ell([0, 0.205, -0.11], [0.13, 0.075, 0.08])]), M(P.L.top), { outline: OL });
          add(
        P.head,
        merged('walkerHair', () => [
          capHair(),
          fringe(-28, -80, 0.15, 0.052, 0.035, 0.35),
          fringe(38, -78, 0.11, 0.045, 0.032, -0.4),
          place(capsuleGeo(0.068, 0.27, 6, 12), [0, -0.01, -0.3], [0.64, 0, 0]),
          ell([0, 0.1, -0.22], [0.08, 0.075, 0.075]),
        ]),
        M('#33252f', { rough: 0.55 }),
        { outline: OL },
      );
      buildDog(R);
    },
    after(P, st, R) {
      updateDog(R, st);
    },
  },

  // 캠핑족: 주황 비니·초록 재킷·큰 배낭·머그
  camper: {
    L: { skin: '#f6c29c', top: '#4f9e58', legs: '#8a6440', shoe: '#6b4428', boot: true, face: { brow: '#8a3f1c', freckles: true } },
    build(P) {
      add(P.torso, merged('jacket', () => [place(bodyGeo()), ell([0, 0.225, 0.03], [0.13, 0.05, 0.13])]), M(P.L.top), { outline: OL });
      add(P.torso, merged('fur', () => [place(torusGeo(0.1, 0.035, 10, 24), [0, 0.232, 0.0], [Math.PI / 2, 0, 0], [1, 0.9, 1])]), M('#fff1d6', { rough: 0.95 }));
      add(P.torso, merged('packStraps', () => [rodGeo([-0.085, 0.235, 0.05], [-0.1, 0.05, 0.142], 0.017), rodGeo([0.085, 0.235, 0.05], [0.1, 0.05, 0.142], 0.017)]), M('#6b4428'));
      add(P.torso, merged('pack', () => [place(roundBoxGeo(0.25, 0.29, 0.14, 0.05, 3), [0, 0.1, -0.17]), place(roundBoxGeo(0.17, 0.1, 0.06, 0.025, 2), [0, 0.03, -0.25])]), M('#c98a4a'), { outline: OL });
      add(P.torso, cg('bedroll', () => place(capsuleGeo(0.055, 0.3, 6, 14), [0, 0.28, -0.17], [0, 0, Math.PI / 2])), M('#3f6fd0'));
      add(P.head, merged('camperHair', () => [capHair(), ell([-0.2, -0.06, 0.04], [0.05, 0.08, 0.06]), ell([0.2, -0.06, 0.04], [0.05, 0.08, 0.06])]), M('#c0602c', { rough: 0.6 }), { outline: OL });
      const hat = new THREE.Group();
      hat.rotation.set(-0.28, 0, 0.05);
      P.head.add(hat);
      add(hat, lathe('beanie', [[0, 0.3], [0.1, 0.292], [0.18, 0.258], [0.236, 0.19], [0.258, 0.11], [0.262, 0.06], [0.2, 0.05], [0, 0.05]], { n: 24 }), M('#ff8f3c', { rough: 0.9 }), { outline: OL });
      add(hat, merged('beanieCuff', () => [place(torusGeo(0.252, 0.042, 10, 36), [0, 0.065, 0], [Math.PI / 2, 0, 0]), ell([0, 0.31, 0], [0.07, 0.07, 0.07])]), M('#fff1d6', { rough: 0.95 }), { outline: OLS });
      // 머그와 김
      const mug = new THREE.Group();
      add(mug, merged('mug', () => [place(cylGeo(0.042, 0.038, 0.08, 16), [0, 0.04, 0]), place(torusGeo(0.024, 0.009, 6, 12), [0.045, 0.04, 0], [0, 0, 0])]), M('#e2483c', { rough: 0.45 }));
      const steam = M('#ffffff', { rough: 1, opacity: 0.6, transparent: true });
      mug.userData.steam = [add(mug, sphereGeo(0.022, 10, 8), steam, { cast: false }), add(mug, sphereGeo(0.018, 10, 8), steam, { cast: false })];
      P.torso.add(mug);
      P.items.mug = mug;
    },
    pose(P, st) {
      if (!st.shock) st.B = [0.19, 0.06 + st.lk * 0.02, 0.12];
      else st.B = [0.2, 0.2 + Math.sin(st.t * 14) * 0.03, 0.12];
    },
    after(P, st) {
      const m = P.items.mug;
      m.position.copy(P.hands[1].position).add(_a.set(0.005, -0.03, 0.03));
      m.rotation.set(0, 0.6, st.shock ? Math.sin(st.t * 14) * 0.25 : 0);
      m.userData.steam.forEach((s, i) => {
        const k = (st.t * 0.7 + i * 0.5) % 1;
        s.position.set(Math.sin(st.t * 3 + i * 2) * 0.012, 0.1 + k * 0.12, 0);
        s.scale.setScalar((0.6 + k * 0.9) * (1 - k * k) * (st.shock ? 0 : 1));
      });
    },
  },

  // 낚시꾼: 벙거지·흰 수염·노란 비옷·장화·낚싯대
  fisher: {
    L: { skin: '#e9b08a', top: '#ffd23f', legs: '#3d4f86', shoe: '#3f9a62', boot: true, face: { brow: '#d0cadf', browW: 14, mouthDY: 10 } },
    build(P) {
      const coat = M('#ffd23f', { rough: 0.45 });
      add(
        P.torso,
        merged('raincoat', () => [
          place(lathe('raincoat', [[0, -0.1], [0.17, -0.098], [0.19, -0.085], [0.18, -0.02], [0.165, 0.06], [0.145, 0.14], [0.12, 0.195], [0.084, 0.234], [0.04, 0.255], [0, 0.26]]), [0, 0, 0], [0, 0, 0], [1, 1, 0.9]),
          place(torusGeo(0.1, 0.03, 8, 24), [0, 0.235, 0.01], [Math.PI / 2 + 0.2, 0, 0]),
        ]),
        coat,
        { outline: OL },
      );
      add(P.torso, merged('coatBtn', () => [0.13, 0.06, -0.01].map((y) => ell([0, y, bodyR(y) * 0.9 + 0.012], [0.017, 0.017, 0.01]))), M('#e07a2a', { rough: 0.4 }));
      const white = M('#eeeaf2', { rough: 0.9 });
      add(P.head, merged('fisherHair', () => [capHair(1, -0.015), ell([0, -0.08, -0.15], [0.18, 0.12, 0.1])]), white, { outline: OL });
      add(
        P.head,
        merged('beard', () => [
          ell(onFace(-96, 58, HR - 0.012), [0.055, 0.08, 0.06]),
          ell(onFace(96, 58, HR - 0.012), [0.055, 0.08, 0.06]),
          ell(onFace(-66, 104, HR - 0.02), [0.07, 0.066, 0.066]),
          ell(onFace(66, 104, HR - 0.02), [0.07, 0.066, 0.066]),
          ell(onFace(-28, 120, HR - 0.026), [0.072, 0.066, 0.066]),
          ell(onFace(28, 120, HR - 0.026), [0.072, 0.066, 0.066]),
          ell(onFace(0, 126, HR - 0.03), [0.07, 0.068, 0.068]),
          ell(onFace(-20, 60, HR + 0.0), [0.068, 0.032, 0.036], faceRot(-20, 60, 0.25), [16, 10], 'YXZ'),
          ell(onFace(20, 60, HR + 0.0), [0.068, 0.032, 0.036], faceRot(20, 60, -0.25), [16, 10], 'YXZ'),
        ]),
        white,
        { outline: OLS },
      );
      const hat = new THREE.Group();
      hat.rotation.set(-0.16, 0, -0.05);
      P.head.add(hat);
      add(hat, lathe('bucket', [[0, 0.275], [0.12, 0.272], [0.175, 0.255], [0.19, 0.2], [0.198, 0.13], [0.25, 0.08], [0.305, 0.04], [0.31, 0.024], [0.29, 0.02], [0.24, 0.055], [0.19, 0.095], [0, 0.1]], { n: 32 }), M('#8f9a52', { rough: 0.9 }), { outline: OL });
      add(hat, lathe('bucketBand', [[0.196, 0.13], [0.2, 0.135], [0.194, 0.175], [0.188, 0.18]], { smoothIt: false }), M('#5e6634'));
      add(hat, sphereGeo(0.024, 12, 8), M('#e2483c', { rough: 0.4 }), { pos: [0.12, 0.16, 0.15] });
      // 낚싯대(어깨에 멘다), 줄, 찌
      const rod = new THREE.Group();
      add(rod, merged('rodStick', () => [rodGeo([0, 0.06, 0], [0, 0.98, 0], 0.009, 0.004, 6)]), M('#3a2a26', { rough: 0.5 }));
      add(rod, merged('rodGrip', () => [place(cylGeo(0.02, 0.02, 0.13, 10), [0, 0.0, 0]), place(cylGeo(0.022, 0.022, 0.03, 10), [0.03, 0.04, 0], [0, 0, Math.PI / 2])]), M('#a8714c'));
      const line = new THREE.Group();
      line.position.set(0, 0.98, 0);
      rod.add(line);
      add(line, cg('fishLine', () => place(cylGeo(0.003, 0.003, 1, 4), [0, -0.5, 0])), M('#ffffff', { rough: 0.4 }), { cast: false });
      const bob = add(
        line,
        sphereGeo(0.03, 14, 10),
        M('#ffffff', { rough: 0.4, map: texOnce('bobber', () => canvasTexture(16, 16, (ctx) => {
          ctx.fillStyle = '#e2483c';
          ctx.fillRect(0, 0, 16, 8);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 8, 16, 8);
        })) }),
      );
      line.userData.bob = bob;
      line.userData.str = line.children[0];
      P.torso.add(rod);
      P.items.rod = rod;
      P.items.line = line;
    },
    pose(P, st) {
      st.B = [0.19, 0.1, 0.09];
    },
    after(P, st) {
      const r = P.items.rod;
      r.position.copy(P.hands[1].position);
      r.rotation.set(-0.75 + (st.shock ? Math.sin(st.t * 14) * 0.1 : 0), 0, -0.18);
      const ln = P.items.line;
      ln.quaternion.copy(r.quaternion).invert();
      const len = 0.34 + Math.sin(st.t * 2.4) * 0.015;
      ln.userData.str.scale.y = len;
      ln.userData.bob.position.set(Math.sin(st.t * 1.7) * 0.01, -len, 0);
    },
  },

  // 회사원: 남색 양복·빨간 넥타이·서류 가방
  worker: {
    L: { skin: '#f6c29c', top: '#4a5a9c', legs: '#3c4a86', shoe: '#5a3526', face: { brow: '#231c2c' } },
    build(P) {
      add(P.torso, bodyGeo(), M(P.L.top), { outline: OL });
      add(P.torso, frontPanel('shirtV', 0.1, 0.25, 0.04, 1.1, 0.02), M('#f4f4fa'));
      add(P.torso, merged('tie', () => [rodGeo([0, 0.235, 0.105], [0, 0.07, 0.152], 0.016, 0.024, 8), ell([0, 0.232, 0.103], [0.022, 0.02, 0.016])]), M('#e2483c', { rough: 0.5 }));
      add(P.torso, merged('suitBtn', () => [ell([0, 0.04, bodyR(0.04) * 0.9 + 0.006], [0.014, 0.014, 0.008]), ell([0, -0.02, bodyR(-0.02) * 0.9 + 0.006], [0.014, 0.014, 0.008])]), M('#2a3360'));
      add(
        P.head,
        merged('workerHair', () => [
          capHair(1.02, 0.008),
          place(sphereGeo(1, 20, 14), onFace(22, -84, HR + 0.004), faceRot(22, -84, -0.3), [0.16, 0.07, 0.08], 'YXZ'),
          ell([-0.2, -0.04, 0.03], [0.04, 0.07, 0.05]),
          ell([0.2, -0.04, 0.03], [0.04, 0.07, 0.05]),
        ]),
        M('#2a2433', { rough: 0.4 }),
        { outline: OL },
      );
      const bag = new THREE.Group();
      add(bag, merged('briefcase', () => [place(roundBoxGeo(0.07, 0.17, 0.22, 0.02, 2), [0, -0.1, 0]), place(torusGeo(0.032, 0.01, 6, 14, Math.PI), [0, -0.015, 0], [0, Math.PI / 2, 0])]), M('#8a5634', { rough: 0.5 }), { outline: OLS });
      add(bag, boxGeo3(), M('#ffd23f', { rough: 0.35, metal: 0.3 }), { pos: [0, -0.04, 0] });
      P.torso.add(bag);
      P.items.bag = bag;
    },
    pose(P, st) {
      if (st.shock) st.B = [0.23, 0.2 + Math.sin(st.t * 14) * 0.05, 0.08];
    },
    after(P, st) {
      const b = P.items.bag;
      b.position.copy(P.hands[1].position);
      b.rotation.set(Math.sin(st.ph) * 0.15 * st.walk, 0, st.shock ? 0.4 : 0);
    },
  },

  // 방송인: 분홍 후드티·머리 경단 둘·헤드폰·셀카봉
  streamer: {
    L: { skin: '#a8714c', top: '#ff8fb0', legs: '#5f86d6', shoe: '#f2f0f8', face: { brow: '#1f1822', lash: true } },
    build(P) {
      add(P.torso, merged('hoodieS', () => [place(bodyGeo()), ell([0, 0.205, -0.11], [0.13, 0.075, 0.08])]), M(P.L.top), { outline: OL });
      add(P.torso, cg('star', () => starGeo()), M('#ffffff', { rough: 0.5 }), { pos: [0.0, 0.085, bodyR(0.085) * 0.9 - 0.004] });
      add(
        P.torso,
        merged('phones', () => [
          place(torusGeo(0.118, 0.016, 8, 28, Math.PI * 1.1), [0, 0.245, 0.02], [Math.PI / 2 + 0.35, 0, Math.PI * 0.95]),
          place(cylGeo(0.042, 0.042, 0.03, 16), [-0.118, 0.232, 0.045], [0, 0, Math.PI / 2 - 0.3]),
          place(cylGeo(0.042, 0.042, 0.03, 16), [0.118, 0.232, 0.045], [0, 0, -Math.PI / 2 + 0.3]),
        ]),
        M('#2fb5a6', { rough: 0.4 }),
        { outline: OLS },
      );
      add(
        P.head,
        merged('streamerHair', () => [capHair(), fringe(-26, -80, 0.15, 0.05, 0.035, 0.3), fringe(32, -80, 0.13, 0.048, 0.033, -0.3), ell([-0.15, 0.2, -0.05], [0.09, 0.09, 0.09]), ell([0.15, 0.2, -0.05], [0.09, 0.09, 0.09])]),
        M('#2b2230', { rough: 0.5 }),
        { outline: OL },
      );
      // 셀카봉 + 휴대폰
      const stick = new THREE.Group();
      add(stick, cg('selfie', () => place(cylGeo(0.009, 0.011, 0.5, 8), [0, 0.25, 0])), M('#3a3f6a', { rough: 0.4, metal: 0.3 }));
      const phone = new THREE.Group();
      phone.position.set(0, 0.52, 0);
      stick.add(phone);
      add(phone, roundBoxGeo(0.1, 0.17, 0.022, 0.018, 2), M('#8a6ad8', { rough: 0.45 }), { outline: OLS });
      add(phone, roundBoxGeo(0.085, 0.15, 0.006, 0.01, 1), M('#bff6ff', { rough: 0.3, emissive: '#7fe8ff', emissiveIntensity: 0.9 }), { pos: [0, 0, 0.011], cast: false });
      const rec = add(phone, sphereGeo(0.012, 8, 6), M('#ff3b3b', { emissive: '#ff2020', emissiveIntensity: 1.5 }), { pos: [0.028, 0.06, -0.014], cast: false });
      P.torso.add(stick);
      P.items.stick = stick;
      P.items.phone = phone;
      P.items.rec = rec;
    },
    pose(P, st) {
      // 평소엔 셀카(휴대폰이 나를 본다), 올려다볼 때·들켰을 때는 높이 들어 기체를 찍는다
      const up = Math.max(st.lk, st.shock ? 1 : 0);
      st.B = [lerp(0.2, 0.22, up), lerp(0.08, 0.3, up), lerp(0.13, 0.08, up)];
    },
    after(P, st) {
      const s = P.items.stick;
      const up = Math.max(st.lk, st.shock ? 1 : 0);
      s.position.copy(P.hands[1].position);
      s.rotation.set(lerp(0.5, -0.15, up), 0, lerp(0.35, -0.25, up));
      P.items.phone.rotation.set(lerp(-0.2, 0.6, up), lerp(Math.PI - 0.5, 0.2, up), 0);
      P.items.rec.visible = Math.sin(st.t * 5) > -0.3;
    },
  },

  // 천문학자: 대머리·둥근 안경·흰 가운·망원경
  astronomer: {
    L: { skin: '#f6c29c', top: '#f2f3f8', legs: '#56608f', shoe: '#6b4428', face: { brow: '#9a6438', browW: 9 } },
    build(P) {
      const coat = M('#f2f3f8', { rough: 0.8 });
      add(
        P.torso,
        merged('labcoat', () => [
          place(lathe('labcoat', [[0, -0.105], [0.185, -0.103], [0.2, -0.09], [0.188, -0.03], [0.172, 0.05], [0.152, 0.13], [0.124, 0.192], [0.086, 0.233], [0.04, 0.256], [0, 0.26]]), [0, 0, 0], [0, 0, 0], [1, 1, 0.9]),
          place(torusGeo(0.1, 0.026, 8, 24), [0, 0.236, 0.012], [Math.PI / 2 + 0.25, 0, 0]),
        ]),
        coat,
        { outline: OL },
      );
      add(P.torso, frontPanel('labShirt', 0.03, 0.25, 0.12, 1.05, 0.02), M('#8fb4ea'));
      add(P.torso, merged('labTie', () => [rodGeo([0, 0.235, 0.112], [0, 0.07, 0.16], 0.014, 0.022, 8), ell([0, 0.232, 0.11], [0.02, 0.018, 0.015])]), M('#2b3a78', { rough: 0.5 }));
      add(P.torso, merged('pens', () => [rodGeo([-0.085, 0.12, 0.14], [-0.085, 0.165, 0.137], 0.007), rodGeo([-0.065, 0.12, 0.143], [-0.065, 0.16, 0.14], 0.007)]), M('#3f6fd0', { rough: 0.4 }));
      // 옆머리 곱슬과 정수리 한 가닥
      const curls = [];
      for (const s of [-1, 1]) {
        for (const [x, y, z, r] of [[0.21, 0.07, -0.06, 0.058], [0.2, 0.0, -0.11, 0.056], [0.2, 0.11, -0.12, 0.05], [0.15, 0.06, -0.18, 0.055], [0.22, -0.04, -0.05, 0.045]]) curls.push(ell([s * x, y, z], [r, r, r], [0, 0, 0], [14, 10]));
      }
      add(
        P.head,
        merged('astroHair', () => [...curls, ell([0, 0.0, -0.21], [0.12, 0.09, 0.07]), ell([0.0, 0.248, 0.02], [0.038, 0.034, 0.038]), ell([0.04, 0.258, -0.01], [0.032, 0.03, 0.032]), ell([-0.032, 0.252, -0.03], [0.03, 0.028, 0.03])]),
        M('#d89a5f', { rough: 0.7 }),
        { outline: OLS },
      );
      add(P.head, cg('glasses', () => glassesGeo()), M('#2b2f4a', { rough: 0.4 }));
      // 망원경
      const scope = new THREE.Group();
      add(scope, lathe('scope', [[0.0, -0.02], [0.03, -0.02], [0.032, 0.0], [0.04, 0.12], [0.05, 0.3], [0.056, 0.31], [0.056, 0.36], [0.0, 0.36]], { smoothIt: false, seg: 20 }), M('#3f5fb8', { rough: 0.45 }), { outline: OLS });
      add(scope, merged('scopeBands', () => [place(torusGeo(0.043, 0.008, 6, 20), [0, 0.12, 0], [Math.PI / 2, 0, 0]), place(torusGeo(0.058, 0.009, 6, 20), [0, 0.3, 0], [Math.PI / 2, 0, 0])]), M('#ffd23f', { rough: 0.35, metal: 0.4 }));
      add(scope, cylGeo(0.046, 0.046, 0.006, 18), M('#aef4ff', { rough: 0.1, emissive: '#5fdcff', emissiveIntensity: 0.6 }), { pos: [0, 0.362, 0], cast: false });
      P.torso.add(scope);
      P.items.scope = scope;
    },
    pose(P, st) {
      if (st.shock) {
        st.B = [0.2, 0.06, 0.12];
        return;
      }
      if (st.lk > 0) {
        // 망원경을 눈에 대고 기체 쪽으로 든다(손은 망원경 몸통을 받친다)
        headToTorso(P, -0.085, 0.02, 0.27, _c);
        st.F = [lerp(st.F[0], _c.x - 0.02, st.lk), lerp(st.F[1], _c.y - 0.06, st.lk), lerp(st.F[2], _c.z + 0.04, st.lk)];
        st.palm = 0;
        st.B = [lerp(0.2, 0.06, st.lk), lerp(0.04, 0.2, st.lk), lerp(0.1, 0.2, st.lk)];
      } else {
        st.B = [0.2, 0.05, 0.11];
      }
    },
    after(P, st) {
      const s = P.items.scope;
      if (st.lk > 0.5 && !st.shock) {
        // 접안렌즈 = 오른눈 앞, 방향 = 고개가 보는 쪽에서 조금 더 위
        headToTorso(P, -0.075, 0.02, 0.262, _c);
        s.position.copy(_c);
        _b.set(0, 0.62, 1).normalize();
        _q.setFromRotationMatrix(P.neck.matrix);
        _b.applyQuaternion(_q);
        s.quaternion.setFromUnitVectors(UP, _b);
      } else {
        s.position.copy(P.hands[1].position);
        s.rotation.set(1.0, 0, -0.5);
      }
    },
  },

  // 사진가: 빨간 베레모·곱슬 단발·청록 셔츠·카키 조끼·사진기
  photographer: {
    lookPitch: 0.3,
    L: { skin: '#d39a6c', top: '#2fb5a6', legs: '#454b7d', shoe: '#5a3526', face: { brow: '#3a2018', lash: true } },
    build(P) {
      add(P.torso, bodyGeo(), M('#d9c08a', { rough: 0.85 }), { outline: OL });
      add(P.torso, frontPanel('vestGap', -0.07, 0.25, 0.22, 0.9, 0.02), M(P.L.top));
      add(P.torso, merged('vestPockets', () => [ell([-0.085, 0.0, bodyR(0) * 0.9 + 0.002], [0.04, 0.035, 0.012]), ell([0.085, 0.0, bodyR(0) * 0.9 + 0.002], [0.04, 0.035, 0.012])]), M('#c4a86e', { rough: 0.85 }));
      add(
        P.head,
        merged('bob', () => [
          ell([0, 0.0, -0.035], [0.268, 0.262, 0.255], [0, 0, 0], [32, 22]),
          fringe(-30, -78, 0.16, 0.055, 0.04, 0.4),
          fringe(32, -76, 0.12, 0.05, 0.036, -0.35),
          ...[[-0.22, -0.14, 0.02], [0.22, -0.14, 0.02], [-0.17, -0.19, -0.1], [0.17, -0.19, -0.1], [0, -0.2, -0.17]].map((p) => ell(p, [0.06, 0.06, 0.06], [0, 0, 0], [12, 10])),
        ]),
        M('#4a2c22', { rough: 0.55 }),
        { outline: OL },
      );
      add(P.head, merged('beret', () => [ell([-0.03, 0.205, -0.02], [0.25, 0.085, 0.25], [0.1, 0, 0.3], [32, 16]), place(cylGeo(0.012, 0.016, 0.04, 8), [-0.0, 0.3, -0.02], [0.1, 0, 0.3])]), M('#e2483c', { rough: 0.85 }), { outline: OL });
      add(P.torso, cg('strap', () => place(torusGeo(0.135, 0.009, 6, 30, Math.PI * 0.9), [0, 0.15, 0.05], [Math.PI / 2 - 0.5, 0, Math.PI * 1.05])), M('#e2483c', { rough: 0.6 }));
      // 사진기
      const cam = new THREE.Group();
      add(cam, merged('camBody', () => [place(roundBoxGeo(0.14, 0.09, 0.06, 0.018, 2)), place(cylGeo(0.035, 0.038, 0.05, 16), [0.015, 0, 0.045], [Math.PI / 2, 0, 0])]), M('#3a4062', { rough: 0.45 }), { outline: OLS });
      add(cam, merged('camTop', () => [place(roundBoxGeo(0.045, 0.025, 0.04, 0.008, 1), [-0.035, 0.05, 0]), place(cylGeo(0.012, 0.012, 0.012, 10), [0.04, 0.05, 0])]), M('#c9cfe6', { rough: 0.3, metal: 0.5 }));
      add(cam, cylGeo(0.026, 0.026, 0.004, 16), M('#7fd8ff', { rough: 0.1, emissive: '#3fb8ff', emissiveIntensity: 0.5 }), { pos: [0.015, 0, 0.071], rot: [Math.PI / 2, 0, 0], cast: false });
      P.torso.add(cam);
      P.items.cam = cam;
    },
    pose(P, st) {
      if (st.shock) {
        st.B = [0.2, 0.0, 0.08];
        return;
      }
      if (st.lk > 0) {
        // 두 손으로 사진기를 눈앞에 든다
        headToTorso(P, -0.03, -0.03, 0.3, _c);
        st.F = [lerp(st.F[0], _c.x - 0.075, st.lk), lerp(st.F[1], _c.y - 0.03, st.lk), lerp(st.F[2], _c.z - 0.02, st.lk)];
        st.B = [lerp(st.B[0], _c.x + 0.075, st.lk), lerp(st.B[1], _c.y - 0.03, st.lk), lerp(st.B[2], _c.z - 0.02, st.lk)];
        st.palm = 0;
        st.maxB = 1.5;
      }
    },
    after(P, st) {
      const c = P.items.cam;
      if (st.lk > 0.5 && !st.shock) {
        headToTorso(P, -0.03, -0.03, 0.3, _c);
        c.position.copy(_c);
        P.neck.updateMatrix();
        c.quaternion.setFromRotationMatrix(P.neck.matrix);
      } else {
        c.position.set(0, 0.075 + Math.abs(Math.cos(st.ph)) * 0.01 * st.walk, bodyR(0.075) * 0.9 + 0.045);
        c.rotation.set(0.1, 0, Math.sin(st.ph) * 0.08 * st.walk);
      }
    },
  },
};

/** 보닛 얼굴 둘레의 물결 주름(보닛 구와 머리가 만나는 원을 따라 휜 고리). */
function ruffleGeo() {
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
  // setFromUnitVectors 가 x 축을 비틀 수 있으니 x 가 그대로 x 를 향하게 맞춘다
  const twist = Math.atan2(v.y, v.x);
  const qt = new THREE.Quaternion().setFromAxisAngle(n, -twist);
  g.applyMatrix4(new THREE.Matrix4().compose(n.clone().multiplyScalar(-0.035), qt.multiply(q).multiply(qz), new THREE.Vector3(1, 1, 1)));
  return g;
}

const boxGeo3 = () => cg('clasp', () => roundBoxGeo(0.074, 0.03, 0.05, 0.008, 1));

/** 가슴의 별 무늬(납작한 별). */
function starGeo() {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.02 : 0.045;
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 1 });
}

/** 둥근 안경(테 두 개 + 코다리 + 귀걸이). 머리 기준. */
function glassesGeo() {
  const parts = [];
  const rr = HR + 0.03;
  const pts = [];
  for (const sx of [-1, 1]) {
    const px = sx * 50;
    const py = 14;
    const c = onFace(px, py, rr);
    pts.push(c);
    parts.push(place(torusGeo(0.074, 0.013, 8, 32), c, faceRot(px, py), 1, 'YXZ'));
    // 귀걸이: 테 바깥 → 귀
    const o = onFace(sx * 108, py - 4, HR + 0.01);
    parts.push(rodGeo(o, [sx * 0.232, 0.03, -0.03], 0.008));
  }
  const l = onFace(-20, 8, rr - 0.006);
  const r = onFace(20, 8, rr - 0.006);
  parts.push(rodGeo(l, r, 0.009));
  const g = mergeGeometries(parts.map((p) => (p.index ? p : p)), false);
  for (const p of parts) p.dispose();
  return g;
}

// ───────── 개(시바) ─────────

function dogFace(ctx, s, bark) {
  ctx.clearRect(0, 0, s, s);
  ctx.save();
  ctx.scale(s / 256, s / 256);
  ctx.translate(128, 128);
  // 흰 눈썹 점
  ctx.fillStyle = '#fff1dc';
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(sx * 44, -46, 14, 10, 0, 0, TAU);
    ctx.fill();
  }
  for (const sx of [-1, 1]) {
    if (bark) {
      ctx.beginPath();
      ctx.moveTo(sx * 44 - 16, -10);
      ctx.lineTo(sx * 44 + 16, -4 + (sx > 0 ? -6 : 6) * 0);
      ctx.lineWidth = 9;
      ctx.strokeStyle = EYE_INK;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(sx * 44, -2, 17, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    } else glossy(ctx, sx * 44, -12, 15, 19);
  }
  ctx.restore();
}

function buildDog(R) {
  const F = '#e8964a';
  const W = '#fff1dc';
  const D = {};
  D.g = new THREE.Group();
  D.g.position.set(-0.56, 0, 0.12);
  D.g.rotation.y = Math.PI / 2 - 0.5;
  R.flip.add(D.g);
  D.hop = new THREE.Group();
  D.g.add(D.hop);
  const fur = M(F, { rough: 0.85 });
  const white = M(W, { rough: 0.9 });
  add(D.hop, merged('dogBody', () => [ell([0, 0.155, 0], [0.1, 0.088, 0.15], [0, 0, 0], [22, 16]), ell([0, 0.17, 0.1], [0.08, 0.08, 0.07])]), fur, { outline: OLS });
  // 다리: 대각선 둘씩 한 메시(종종걸음은 대각선 다리가 같이 움직인다)
  D.legs = [];
  for (const [k, pairs] of [['A', [[-0.055, 0.09], [0.055, -0.09]]], ['B', [[0.055, 0.09], [-0.055, -0.09]]]]) {
    const l = new THREE.Group();
    l.position.set(0, 0.12, 0);
    D.hop.add(l);
    add(l, merged(`dogLegs${k}`, () => pairs.map(([x, z]) => place(capsuleGeo(0.032, 0.13, 4, 10), [x, -0.055, z]))), fur);
    D.legs.push(l);
  }
  D.tail = new THREE.Group();
  D.tail.position.set(0, 0.2, -0.14);
  D.hop.add(D.tail);
  add(D.tail, cg('dogTail', () => place(torusGeo(0.045, 0.024, 8, 16, Math.PI * 1.4), [0, 0.04, -0.01], [0, Math.PI / 2, -0.5])), fur);
  D.head = new THREE.Group();
  D.head.position.set(0, 0.25, 0.13);
  D.hop.add(D.head);
  add(
    D.head,
    merged('dogHead', () => [
      place(sphereGeo(0.1, 28, 20)),
      place(coneGeo(0.04, 0.07, 10), [-0.055, 0.085, -0.01], [0, 0, 0.35]),
      place(coneGeo(0.04, 0.07, 10), [0.055, 0.085, -0.01], [0, 0, -0.35]),
    ]),
    fur,
    { outline: OLS },
  );
  add(D.head, ell([0, -0.035, 0.075], [0.058, 0.045, 0.055]), white);
  add(D.head, sphereGeo(0.019, 10, 8), M('#2a2140', { rough: 0.3 }), { pos: [0, -0.012, 0.13] });
  D.jaw = add(D.head, ell([0, 0, 0.03], [0.04, 0.016, 0.04]), M('#c4455a'), { pos: [0, -0.07, 0.07] });
  D.faces = { n: faceTexture('dog|n', (ctx, s) => dogFace(ctx, s, false)), b: faceTexture('dog|b', (ctx, s) => dogFace(ctx, s, true)) };
  D.face = faceCap(0.1, D.faces.n, { width: FACE_A, height: FACE_A });
  D.head.add(D.face);
  add(D.hop, cg('collar', () => place(torusGeo(0.068, 0.013, 6, 20), [0, 0.215, 0.115], [Math.PI / 2 - 0.7, 0, 0])), M('#e2483c', { rough: 0.5 }));
  D.collar = new THREE.Object3D();
  D.collar.position.set(0, 0.235, 0.15);
  D.hop.add(D.collar);
  R.leash = add(R.flip, cg('leash', () => place(cylGeo(0.0065, 0.0065, 1, 6), [0, 0.5, 0])), M('#e2483c', { rough: 0.5 }), { cast: false });
  R.dog = D;
}

function updateDog(R, st) {
  const D = R.dog;
  const { t, walk, shock } = st;
  const ph = t * 11;
  const hop = shock ? Math.abs(Math.sin(t * 9)) * 0.09 : Math.abs(Math.cos(ph)) * 0.012 * walk;
  D.hop.position.y = hop;
  D.hop.rotation.x = shock ? -0.25 - Math.sin(t * 9) * 0.15 : 0;
  D.legs.forEach((l, i) => {
    l.rotation.x = shock ? (i ? 0.25 : -0.25) : Math.sin(ph) * 0.35 * walk * (i ? -1 : 1);
  });
  D.tail.rotation.z = Math.sin(t * (shock ? 26 : 10)) * 0.4;
  const barking = shock && Math.sin(t * 12) > 0;
  D.head.rotation.x = shock ? -0.35 : -st.lk * 0.45;
  D.head.rotation.y = Math.sin(t * 1.3) * 0.15 * (1 - walk);
  D.jaw.rotation.x = barking ? 0.5 : 0;
  D.jaw.visible = barking;
  D.face.material.map = barking ? D.faces.b : D.faces.n;
  // 목줄: 손 → 목걸이
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
  stripeTex = canvasTexture(512, 64, (ctx, w, h) => {
    const n = 16;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = i % 2 ? '#ffd23f' : '#e9473b';
      ctx.fillRect((i * w) / n, 0, w / n + 1, h);
      ctx.fillStyle = 'rgba(120,30,40,0.25)';
      ctx.fillRect((i * w) / n, 0, 2, h);
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
        ctx.fillStyle = 'rgba(255,230,180,0.35)';
        ctx.beginPath();
        ctx.ellipse(x + off + 8, y + row / 2, 7, 5.5, 0, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = 'rgba(90,50,20,0.55)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  });
  return wickerTex;
}

const PILOT = 0.78; // 조종사 크기

function buildBalloonist() {
  const L = { skin: '#f6c29c', top: '#4f7fd0', face: { brow: '#5a3522' } };
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
  add(R.ride, roundBoxGeo(0.41, 0.05, 0.37, 0.024, 2), M('#7a4b2a', { rough: 0.7 }), { pos: [0, 0.262, 0], outline: OLS });
  add(R.ride, merged('sandbags', () => [ell([-0.205, 0.15, 0.08], [0.035, 0.045, 0.035]), ell([-0.205, 0.14, -0.07], [0.032, 0.042, 0.032])]), M('#e8d3a0', { rough: 0.9 }));
  // 밧줄
  add(
    R.ride,
    merged('ropes', () => [
      rodGeo([-0.19, 0.28, 0.16], [-0.14, 1.0, 0.12], 0.006),
      rodGeo([0.19, 0.28, 0.16], [0.14, 1.0, 0.12], 0.006),
      rodGeo([-0.19, 0.28, -0.16], [-0.14, 1.0, -0.12], 0.006),
      rodGeo([0.19, 0.28, -0.16], [0.14, 1.0, -0.12], 0.006),
    ]),
    M('#8a6a4a'),
  );
  // 버너와 불꽃
  add(R.ride, merged('burner', () => [place(cylGeo(0.05, 0.045, 0.05, 14), [0, 0.81, 0]), place(torusGeo(0.11, 0.008, 6, 24), [0, 0.835, 0], [Math.PI / 2, 0, 0]), rodGeo([-0.11, 0.835, 0], [-0.14, 1.0, 0.0], 0.005), rodGeo([0.11, 0.835, 0], [0.14, 1.0, 0.0], 0.005)]), M('#b4bcdc', { rough: 0.35, metal: 0.6 }));
  R.flame = add(R.ride, cg('flame', () => place(coneGeo(0.035, 0.12, 10), [0, 0.06, 0])), M('#ff9a3c', { emissive: '#ff7a1c', emissiveIntensity: 2.2 }), { pos: [0, 0.835, 0], cast: false });
  R.glow = glowSprite('#ffb04a', 0.32, 0.75);
  R.glow.position.set(0, 0.88, 0);
  R.ride.add(R.glow);
  // 풍선
  add(R.ride, lathe('skirt', [[0.085, 0.915], [0.1, 0.945], [0.135, 0.985]], { smoothIt: false, seg: 24 }), M('#b8352c', { rough: 0.7, side: THREE.DoubleSide }));
  add(
    R.ride,
    lathe('envelope', [[0.13, 0.975], [0.2, 1.03], [0.3, 1.11], [0.4, 1.21], [0.452, 1.33], [0.464, 1.43], [0.45, 1.54], [0.396, 1.64], [0.29, 1.715], [0.15, 1.748], [0, 1.755]], { seg: 48, n: 40 }),
    M('#ffffff', { rough: 0.6, map: balloonTexture() }),
    { outline: OL },
  );
  // 조종사(작은 사람: 가슴 위만 바구니 밖으로)
  R.pilot = new THREE.Group();
  R.pilot.position.set(0, 0.07, 0.0);
  R.pilot.scale.setScalar(PILOT);
  R.ride.add(R.pilot);
  const P = buildPerson(R.pilot, L, { legs: false });
  R.P = P;
  add(P.torso, bodyGeo(), M(L.top), { outline: OL });
  add(P.torso, merged('scarf', () => [place(torusGeo(0.1, 0.034, 8, 24), [0, 0.235, 0.01], [Math.PI / 2 + 0.2, 0, 0]), rodGeo([0.05, 0.22, -0.08], [0.2, 0.17, -0.2], 0.03, 0.02)]), M('#e2483c', { rough: 0.8 }), { outline: OLS });
  add(
    P.head,
    merged('aviator', () => [
      ell([0, 0.035, -0.03], [0.258, 0.252, 0.255], [0, 0, 0], [32, 22]),
      ell([-0.21, -0.1, 0.03], [0.055, 0.1, 0.07], [0, 0, 0.15]),
      ell([0.21, -0.1, 0.03], [0.055, 0.1, 0.07], [0, 0, -0.15]),
    ]),
    M('#9a5a34', { rough: 0.65 }),
    { outline: OL },
  );
  const gg = [];
  const gl = [];
  for (const sx of [-1, 1]) {
    const c = onFace(sx * 36, -86, HR + 0.03);
    gg.push(place(torusGeo(0.05, 0.014, 8, 20), c, faceRot(sx * 36, -86), 1, 'YXZ'));
    gl.push(place(sphereGeo(0.046, 14, 10), c, faceRot(sx * 36, -86), [1, 1, 0.35], 'YXZ'));
  }
  add(P.head, merged('goggleRims', () => gg), M('#b4bcdc', { rough: 0.3, metal: 0.6 }));
  add(P.head, merged('goggleLens', () => gl), M('#6fd8f2', { rough: 0.1, emissive: '#2fb8e8', emissiveIntensity: 0.25 }));
  R.topY = 1.755;
  R.headY = 0.07 + (HIP + NECK + HEAD_C) * PILOT;
  return R;
}

function updateBalloonist(R, pose) {
  const P = R.P;
  const st = poseState(pose);
  const { t, shock, wave, lk } = st;
  R.flip.scale.x = st.dir;
  R.ride.position.y = Math.sin(t * 1.2) * 0.03;
  R.ride.rotation.z = Math.sin(t * 0.9) * 0.03;
  const fl = 1 + Math.sin(t * 17) * 0.25 + Math.sin(t * 31) * 0.1;
  R.flame.scale.set(1, fl, 1);
  R.glow.material.opacity = 0.55 + Math.sin(t * 23) * 0.15;
  aimAt(R.root, R.flip, pose.target, R.headY, st.aim);
  const foc = shock ? 0.75 : lk;
  const elev = clamp(st.aim.elev, 0.15, 1.25);
  const bodyYaw = lerp(YAW - 0.35, st.aim.yaw * 0.55 - 0.2, foc);
  P.body.rotation.y = bodyYaw;
  P.body.position.y = shock ? Math.abs(Math.sin(t * 7)) * 0.03 : 0;
  P.torso.rotation.set(-lk * elev * 0.1, 0, 0);
  const yawRel = clamp(st.aim.yaw - bodyYaw - 0.35, -0.75, 0.75) * foc;
  const pitch = foc * elev * (shock ? 0.32 : 0.6);
  P.neck.rotation.set(-pitch + Math.sin(t * 1.3) * 0.02, yawRel, Math.sin(t * 1.7) * 0.03 + (shock ? Math.sin(t * 14) * 0.05 : 0));
  // 손: 평소엔 바구니 테를 잡는다(조종사 몸통 기준)
  const rimY = (0.29 - 0.07) / PILOT - HIP;
  st.F = [-0.22, rimY, 0.19];
  st.B = [0.22, rimY, 0.19];
  for (const sh of P.arms) sh.position.copy(sh.userData.base);
  if (shock) {
    st.F = [-0.25, 0.33, 0.1];
    st.B = [0.22, rimY, 0.19];
  } else if (wave) {
    st.F = [-0.28 + Math.sin(t * 10) * 0.06, 0.36, 0.08];
  } else if (lk > 0) {
    pointUp(P, st, bodyYaw + 0.35, lk);
  }
  reach(P, 0, st.F, 1.5);
  reach(P, 1, st.B, 1.4);
  const hF = P.hands[0];
  if (st.palm > 0.01) {
    hF.scale.set(lerp(1, 1.25, st.palm), lerp(1, 0.6, st.palm), lerp(1, 1.3, st.palm));
    hF.rotation.set(-pitch * 0.8 - 0.25 * st.palm, 0, 0.3 * st.palm);
  } else {
    hF.scale.setScalar(wave ? 1.12 : 1);
    hF.rotation.set(0, 0, 0);
  }
  placeFinger(P, st);
  if (shock) swingNet(P.net, hF, t, -1);
  else P.net.visible = false;
  pickFace(P, st, R.seed);
}

// ───────── 우주비행사 ─────────

function buildAstronaut() {
  const SUIT = '#eef0f8';
  const ACC = '#ff7a5c';
  const L = { skin: '#d39a6c', top: SUIT, glove: ACC, face: { brow: '#2a2130' } };
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
  const suit = M(SUIT, { rough: 0.7 });
  add(P.torso, merged('suitBody', () => [place(lathe('suit', [[0, -0.075], [0.11, -0.073], [0.16, -0.05], [0.175, 0.0], [0.172, 0.08], [0.158, 0.15], [0.13, 0.2], [0.09, 0.238], [0.04, 0.256], [0, 0.26]]), [0, 0, 0], [0, 0, 0], [1, 1, 0.92]), place(torusGeo(0.12, 0.035, 10, 28), [0, 0.235, 0], [Math.PI / 2, 0, 0])]), suit, { outline: OL });
  add(P.torso, roundBoxGeo(0.26, 0.28, 0.12, 0.045, 3), M('#d6d9ee', { rough: 0.6 }), { pos: [0, 0.12, -0.17], outline: OL });
  add(
    P.torso,
    roundBoxGeo(0.12, 0.08, 0.03, 0.012, 2),
    M('#ffffff', { rough: 0.4, map: texOnce('panel', () => canvasTexture(64, 48, (ctx) => {
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
    })) }),
    { pos: [0, 0.09, 0.145], rot: [-0.12, 0, 0] },
  );
  add(P.torso, cg('suitBelt', () => place(torusGeo(0.165, 0.018, 8, 32), [0, -0.01, 0], [Math.PI / 2, 0, 0], [1, 0.9, 1])), M('#b8bdd6', { rough: 0.5 }));
  // 헬멧: 앞이 뚫린 흰 껍데기(안쪽은 외곽선 재질이 남색으로 비친다) + 유리 + 테. 머리는 조금 줄여 안에 넣는다.
  P.head.scale.setScalar(0.86);
  const helm = new THREE.Group();
  helm.position.y = HEAD_C;
  P.neck.add(helm);
  const HELM = 0.285;
  const OPEN = 0.98;
  add(helm, cg('helmet', () => place(new THREE.SphereGeometry(HELM, 40, 28, 0, TAU, OPEN, Math.PI - OPEN), [0, 0.01, 0], [Math.PI / 2, 0, 0])), suit, { outline: OL });
  add(helm, cg('helmetRim', () => place(torusGeo(HELM * Math.sin(OPEN), 0.016, 10, 40), [0, 0.01, HELM * Math.cos(OPEN)])), M('#c9cde4', { rough: 0.45 }));
  const visor = add(
    helm,
    cg('visor', () => place(new THREE.SphereGeometry(HELM - 0.004, 32, 12, 0, TAU, 0, OPEN + 0.03), [0, 0.01, 0], [Math.PI / 2, 0, 0])),
    new THREE.MeshStandardMaterial({ color: '#b8ecff', transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.1, envMapIntensity: 1.6, depthWrite: false }),
    { cast: false },
  );
  visor.renderOrder = 4;
  // 유리 위 반짝임(왼쪽 위)
  const glint = add(
    helm,
    cg('glint', () => place(torusGeo(0.2, 0.012, 6, 20, 0.9), [0, 0.01, 0.17], [0, 0, 2.0], [1, 1, 0.5])),
    basicGlint(),
    { cast: false },
  );
  glint.renderOrder = 5;
  add(helm, merged('helmetEars', () => [place(cylGeo(0.06, 0.06, 0.05, 16), [-HELM + 0.01, 0.0, -0.02], [0, 0, Math.PI / 2]), place(cylGeo(0.06, 0.06, 0.05, 16), [HELM - 0.01, 0.0, -0.02], [0, 0, Math.PI / 2])]), M('#d6d9ee', { rough: 0.5 }));
  add(P.head, merged('astroHair', () => [capHair(1, 0.004), fringe(-20, -80, 0.16, 0.05, 0.035, 0.3)]), M('#2a2130', { rough: 0.5 }));
  // 생명줄(등 → 아래 뒤쪽으로 길게)
  add(
    R.drift,
    cg('tether', () => {
      const c = new THREE.CatmullRomCurve3([[0.0, -0.32, -0.2], [-0.25, -0.55, -0.32], [-0.2, -0.95, -0.3], [-0.55, -1.35, -0.35], [-0.75, -1.9, -0.4]].map((p) => new THREE.Vector3(...p)));
      return new THREE.TubeGeometry(c, 40, 0.016, 6, false);
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
  const st = poseState(pose);
  const { t, shock, wave, lk, walk } = st;
  R.flip.scale.x = st.dir;
  R.drift.position.y = Math.sin(t * 1.1) * 0.03;
  R.drift.rotation.z = Math.sin(t * 1.4) * 0.1 - (shock ? 0.12 : 0);
  R.drift.rotation.x = shock ? -0.1 : 0;
  aimAt(R.root, R.flip, pose.target, R.headY, st.aim);
  const foc = shock ? 1 : lk;
  const elev = clamp(st.aim.elev, -0.3, 1.25);
  const bodyYaw = lerp(0.32, st.aim.yaw * 0.5 + 0.05, foc);
  P.body.rotation.y = bodyYaw;
  P.torso.rotation.set(-foc * elev * 0.12, 0, 0);
  for (const [i, l] of P.legs.entries()) {
    const s = i ? 1 : -1;
    l.rotation.x = Math.sin(t * 1.9 + s) * 0.18 + (walk ? Math.sin(t * 3 + s * 1.5) * 0.3 * walk : 0) + (shock ? 0.25 : 0);
    l.rotation.z = s * (0.12 + (shock ? 0.15 : 0));
  }
  const yawRel = clamp(st.aim.yaw - bodyYaw, -0.75, 0.75) * foc;
  const pitch = foc * elev * (shock ? 0.4 : 0.5);
  P.neck.rotation.set(-pitch + Math.sin(t * 1.2) * 0.03, yawRel, Math.sin(t * 1.5) * 0.04);
  for (const sh of P.arms) sh.position.copy(sh.userData.base);
  const swim = Math.sin(t * 1.7);
  st.F = [-0.24, 0.02 + swim * 0.04, 0.08];
  st.B = [0.24, 0.0 - swim * 0.04, 0.06];
  if (shock || lk > 0) {
    // 기체 쪽으로 팔을 뻗는다(들키면 손가락으로 가리킨다)
    // 헬멧이 커서 팔은 헬멧 옆으로 뻗는다
    const el = clamp(st.aim.elev, 0, 1.3);
    _c.set(-0.75 + clamp(st.aim.yaw - bodyYaw, -0.8, 0.8) * 0.2, 0.25 + el * 0.4, 0.35).normalize();
    const k = shock ? 1 : lk;
    const reachP = [-SHX + _c.x * ARM * 1.1, SHY + _c.y * ARM * 1.1, _c.z * ARM * 1.1];
    st.F = [lerp(st.F[0], reachP[0], k), lerp(st.F[1], reachP[1], k), lerp(st.F[2], reachP[2], k)];
    if (shock) st.B = [0.25, 0.25 + Math.sin(t * 12) * 0.05, 0.05];
  } else if (wave) {
    st.F = [-0.31 + Math.sin(t * 10) * 0.05, 0.33, 0.08];
  }
  reach(P, 0, st.F, 1.3);
  reach(P, 1, st.B, 1.3);
  P.hands[0].scale.setScalar(1.1);
  P.hands[1].scale.setScalar(1.1);
  st.point = shock ? 1 : 0;
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
    R.def = { pose: def.pose, after: def.after ? (PP, st) => def.after(PP, st, R) : null, lookPitch: def.lookPitch };
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
