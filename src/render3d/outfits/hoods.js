// 후드·모자 의상 다섯 벌: 냥냥 후드(cat), 공룡 후드(dino), 꿀벌(bee), 개구리 모자(frog), 겨울 니트(winter).
// pipo.js 의 의상과 같은 규칙: 머리 반지름 1 단위, 도형은 og(키) 캐시(키 앞에 의상 id), 재질은 mat()·아래 캐시,
// 외곽선은 part(도형, 재질, 굵기). 얼굴(경도 ±0.6, 위도 -0.6..0.5)은 가리지 않고 피포의 더듬이는 늘 보이게 둔다.
// head = 머리(찌그러짐·기울임을 따라간다, 머리 중심 기준), body = 몸(목 높이 기준).
// update({ t, mood, y, hands, spring }) 로 귀·날개·방울 등을 기분 따라 움직인다.
import { registerOutfit, OUTFIT_KIT } from '../pipo.js';

const { THREE, mat, faceTexture, latheGeo, mergeGeometries, HS, YV, BODY_CURVE, og, headAt, surfaceMatrix, segGeo, smoothed, shellGeo, edgeGeo, plateau, smooth01, bodyR, slabGeo, wrapBody, finishSlab, part, compose, baked, sphere, rotTo, GOLD_MAT, glintBasic } = OUTFIT_KIT;

// ───────── 공용 도구 ─────────

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const V2 = (x, y) => new THREE.Vector2(x, y);
const Z = V(0, 0, 1);
const q = new THREE.Quaternion();
const e = new THREE.Euler();

/** 머리 공간의 점 p 에서 머리(타원체) 바깥 법선. */
const normalAt = (p) => V(p.x / HS.x ** 2, p.y / HS.y ** 2, p.z / HS.z ** 2).normalize();

/** 껍데기(shellGeo) 둘레 φ, 축에서 각 al, 단위 구 반지름 r 인 점 → 머리 공간(edgeGeo 와 같은 식). */
function shellPoint(axis, al, phi, r) {
  return V(r * Math.sin(al) * Math.sin(phi), r * Math.cos(al), r * Math.sin(al) * Math.cos(phi)).applyQuaternion(rotTo(YV, axis)).multiply(HS);
}

/** 머리 늘림(HS)을 되돌린 shellGeo: 둥근 구 껍데기(눈꺼풀 등 머리 밖에 따로 붙이는 둥근 덮개). */
const roundShell = (alpha, ro, ri, seg = 32) => shellGeo(YV, alpha, ro, ri, seg).applyMatrix4(new THREE.Matrix4().makeScale(1 / HS.x, 1 / HS.y, 1 / HS.z));

/** 모서리를 둥글린 다각형 Shape. r = 모서리 둥글기(하나 또는 꼭짓점마다). */
function roundPoly(pts, r) {
  const s = new THREE.Shape();
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const a = pts[(i + n - 1) % n];
    const b = pts[(i + 1) % n];
    const ri = Array.isArray(r) ? r[i] : r;
    const p0 = p.clone().lerp(a, Math.min(0.5, ri / p.distanceTo(a)));
    const p1 = p.clone().lerp(b, Math.min(0.5, ri / p.distanceTo(b)));
    if (i === 0) s.moveTo(p0.x, p0.y);
    else s.lineTo(p0.x, p0.y);
    s.quadraticCurveTo(p.x, p.y, p1.x, p1.y);
  }
  s.closePath();
  return s;
}

/** 곡선을 따라 굵기가 바뀌는 관(꼬리·더듬이). rOf(0..1) = 반지름, 0 이면 그 끝이 닫힌다. */
function taperTube(curve, rOf, segs = 24, radial = 12) {
  const g = new THREE.TubeGeometry(curve, segs, 1, radial, false);
  const p = g.attributes.position;
  const c = V();
  for (let i = 0; i <= segs; i++) {
    curve.getPointAt(i / segs, c);
    const k = rOf(i / segs);
    for (let j = 0; j <= radial; j++) {
      const v = i * (radial + 1) + j;
      p.setXYZ(v, c.x + (p.getX(v) - c.x) * k, c.y + (p.getY(v) - c.y) * k, c.z + (p.getZ(v) - c.z) * k);
    }
  }
  return smoothed(g);
}

/** 목에 두르는 고리(반지름 R, 굵기 tube, 높이 y). bumps = 몽글몽글한 털 결 수. */
function neckRing(R, tube, y, bumps = 0, amp = 0.2) {
  const g = new THREE.TorusGeometry(R, tube, 12, Math.max(40, bumps * 6)).rotateX(Math.PI / 2);
  if (bumps) {
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const a = Math.atan2(p.getX(i), p.getZ(i));
      const cx = Math.sin(a) * R;
      const cz = Math.cos(a) * R;
      const k = 1 + amp * (Math.cos(a * bumps) - 0.4);
      p.setXYZ(i, cx + (p.getX(i) - cx) * k, p.getY(i) * k, cz + (p.getZ(i) - cz) * k);
    }
  }
  g.translate(0, y, 0);
  return smoothed(g);
}

/** 보송한 털방울(단위 구를 몽글몽글하게). */
function fluffGeo(seed = 0) {
  const g = new THREE.SphereGeometry(1, 36, 26);
  const p = g.attributes.position;
  const d = V();
  for (let i = 0; i < p.count; i++) {
    d.fromBufferAttribute(p, i).normalize();
    const n = Math.sin(d.x * 9 + seed) * Math.sin(d.y * 9 + 1.3) * Math.sin(d.z * 9 + 2.1) + 0.5 * Math.sin(d.x * 17 + 2) * Math.sin(d.y * 15 + seed) * Math.sin(d.z * 16);
    d.multiplyScalar(1 + 0.075 * n);
    p.setXYZ(i, d.x, d.y, d.z);
  }
  return smoothed(g);
}

const MATS = new Map();
/** 그림을 입힌 재질(캐시): 그림 색 그대로 살짝 스스로 빛나 그늘에서도 색이 탁해지지 않는다. */
function texMat(key, map, { rough = 0.6, glow = 0.2, env = 0.7 } = {}) {
  let m = MATS.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ map, roughness: rough, metalness: 0, envMapIntensity: env, emissive: new THREE.Color('#ffffff'), emissiveMap: map, emissiveIntensity: glow });
    MATS.set(key, m);
  }
  return m;
}

/** 표면에 붙인 물체의 자리: 위(up)를 세우고 정면(+z)을 최대한 화면 쪽으로. */
function uprightBasis(p, up, yaw = 0) {
  const u = up.clone().normalize();
  const x = V().crossVectors(u, Z).normalize();
  const z = V().crossVectors(x, u);
  const m = new THREE.Matrix4().makeBasis(x, u, z);
  const quat = new THREE.Quaternion().setFromRotationMatrix(m);
  if (yaw) quat.multiply(new THREE.Quaternion().setFromAxisAngle(YV, yaw));
  return { pos: p.clone(), quat };
}

// 두건(얼굴을 동그랗게 감싸는 후드): 노란 우비와 같은 뒤로 누운 축. 얼굴 구멍 = 정면 조금 아래를 중심으로 각반지름 1.08
const HOOD_AXIS = V(0, Math.sin(0.14), -Math.cos(0.14));
const HOOD_A = Math.PI - 1.08;
// 후드 그림 좌표: u = 둘레(0.5 = 얼굴 구멍 위, 0.25 = 보는 사람의 왼쪽, 0/1 = 턱 아래),
// v = 안쪽 꼭대기(0) → 가장자리(14/32) → 바깥 꼭대기(1, 뒤통수). 캔버스 y = (1 - v) s
const RIM_V = 14 / 32;

// ───────── 냥냥 후드 ─────────

/** 주황 고등어 무늬: 이마에서 뒤로 가늘어지는 줄무늬(이마 M 자) + 옆머리 가로줄, 턱 쪽은 크림색. */
function catArt() {
  return faceTexture(
    'pipo-out-cat',
    (ctx, s) => {
      ctx.fillStyle = '#ffa445';
      ctx.fillRect(0, 0, s, s);
      // 턱 아래(u 0·1 근처, 가장자리 가까이만)는 크림색으로 부드럽게: 가로 그러데이션을 세로 그러데이션으로 가린다
      const cv = document.createElement('canvas');
      cv.width = cv.height = s;
      const c2 = cv.getContext('2d');
      const g = c2.createLinearGradient(0, 0, s, 0);
      g.addColorStop(0, '#fff0d8');
      g.addColorStop(0.12, 'rgba(255,240,216,0)');
      g.addColorStop(0.88, 'rgba(255,240,216,0)');
      g.addColorStop(1, '#fff0d8');
      c2.fillStyle = g;
      c2.fillRect(0, 0, s, s);
      c2.globalCompositeOperation = 'destination-in';
      const fade = c2.createLinearGradient(0, (1 - 0.6) * s, 0, (1 - RIM_V) * s);
      fade.addColorStop(0, 'rgba(0,0,0,0)');
      fade.addColorStop(1, 'rgba(0,0,0,1)');
      c2.fillStyle = fade;
      c2.fillRect(0, 0, s, s);
      ctx.drawImage(cv, 0, 0);
      ctx.fillStyle = '#fff0d8';
      ctx.fillRect(0, (1 - RIM_V) * s, s, RIM_V * s);
      // 붓 자국 줄무늬: (u, 시작 v, 끝 v, 굵기 u, 휘어짐)
      const stripe = (u, v0, v1, w, bend) => {
        const x0 = u * s;
        const y0 = (1 - v0) * s;
        const y1 = (1 - v1) * s;
        const hw = (w * s) / 2;
        ctx.beginPath();
        ctx.moveTo(x0 - hw, y0);
        ctx.quadraticCurveTo(x0 - hw * 0.7 + bend * s, (y0 + y1) / 2, x0 + bend * s * 1.6, y1);
        ctx.quadraticCurveTo(x0 + hw * 0.7 + bend * s, (y0 + y1) / 2, x0 + hw, y0);
        ctx.closePath();
        ctx.fill();
      };
      ctx.fillStyle = '#e2601c';
      // 이마(정수리 쪽으로)
      stripe(0.5, 0.43, 0.74, 0.042, 0);
      for (const sd of [-1, 1]) {
        stripe(0.5 + sd * 0.062, 0.43, 0.66, 0.034, sd * 0.012);
        stripe(0.5 + sd * 0.118, 0.43, 0.6, 0.03, sd * 0.01);
        // 옆머리(가로줄)
        stripe(0.5 + sd * 0.185, 0.43, 0.63, 0.038, 0);
        stripe(0.5 + sd * 0.25, 0.43, 0.67, 0.04, sd * 0.006);
        stripe(0.5 + sd * 0.315, 0.43, 0.62, 0.036, 0);
        stripe(0.5 + sd * 0.375, 0.43, 0.57, 0.03, 0);
      }
      // 뒤통수 고리 무늬(앞에선 잘 안 보이지만 돌아볼 때)
      ctx.strokeStyle = '#e2601c';
      ctx.lineCap = 'round';
      ctx.lineWidth = s * 0.03;
      for (const v of [0.8, 0.9]) {
        ctx.beginPath();
        ctx.moveTo(0.2 * s, (1 - v) * s);
        ctx.lineTo(0.8 * s, (1 - v) * s);
        ctx.stroke();
      }
    },
    512,
  );
}

// 냥냥 후드의 얼굴 구멍은 조금 작게(주황 털이 더 보이게). 볼 그림(경도 0.81)까지는 닿지 않는다
const CAT_A = Math.PI - 1.0;

registerOutfit('cat', () => {
  const fur = texMat('cat-fur', catArt(), { rough: 0.6, glow: 0.2 });
  const cream = mat('#fff1dc', { rough: 0.8, emissive: '#c8955a', emissiveIntensity: 0.25 });
  const orange = mat('#ffa445', { rough: 0.6, emissive: '#c0601a', emissiveIntensity: 0.22 });
  const pink = mat('#ff9ec4', { rough: 0.5, emissive: '#c0306a', emissiveIntensity: 0.2 });
  const hood = part(og('cat-hood', () => shellGeo(HOOD_AXIS, CAT_A, 1.09, 0.96)), fur, 0.035);
  const rim = part(og('cat-rim', () => edgeGeo(HOOD_AXIS, CAT_A, 1.075, 0.064, 26, 0.12)), cream, 0.028);
  // 귀: 통통한 둥근 삼각형(끝이 살짝 바깥으로) + 분홍 속귀. 밑동은 후드 속에 묻는다
  const ears = [-1, 1].map((side) => {
    const outer = part(
      og(`cat-ear${side}`, () => {
        const g = slabGeo(roundPoly([V2(-0.33, -0.26), V2(0.33, -0.26), V2(side * 0.06, 0.56)], [0.08, 0.08, 0.15]), { depth: 0.05, bevel: 0.065, seg: 4 });
        g.translate(0, 0, -0.09);
        return finishSlab(g);
      }),
      orange,
      0.03,
    );
    const inner = part(
      og(`cat-ear-in${side}`, () => {
        const g = slabGeo(roundPoly([V2(-0.19, -0.08), V2(0.19, -0.08), V2(side * 0.045, 0.38)], [0.06, 0.06, 0.1]), { depth: 0.01, bevel: 0.03, seg: 3 });
        g.translate(0, 0, 0.045);
        return finishSlab(g);
      }),
      pink,
    );
    const { p, n } = headAt(side * 0.72, 1.0, 1.04);
    const ear = new THREE.Group();
    const b = uprightBasis(p, n.clone().lerp(YV, 0.35), side * 0.22);
    ear.position.copy(b.pos);
    ear.quaternion.copy(b.quat);
    ear.userData = { base: b.quat, side };
    ear.add(outer, inner);
    return ear;
  });
  // 빨간 목줄 + 금방울(목줄 앞에 매달려 흔들린다)
  const collar = part(og('cat-collar', () => neckRing(0.5, 0.085, -0.02)), mat('#ff3d5a', { rough: 0.35, emissive: '#a0102a', emissiveIntensity: 0.25 }), 0.025);
  const bell = new THREE.Group();
  bell.position.set(0, -0.08, 0.6);
  bell.add(
    part(
      og('cat-bell', () =>
        mergeGeometries([
          baked(sphere(20, 16), compose([0, -0.13, 0.04], [0, 0, 0], [0.125, 0.12, 0.125])),
          new THREE.TorusGeometry(0.122, 0.02, 8, 28).rotateX(Math.PI / 2).translate(0, -0.11, 0.04),
          new THREE.TorusGeometry(0.035, 0.018, 8, 16).translate(0, 0, 0.02),
        ]),
      ),
      GOLD_MAT(),
      0.022,
    ),
    part(og('cat-bell-slit', () => mergeGeometries([segGeo(V(-0.05, -0.2, 0.15), V(0.05, -0.2, 0.15), 0.018), baked(sphere(10, 8), compose([0, -0.165, 0.158], [0, 0, 0], [0.024, 0.024, 0.012]))])), mat('#5a2c00', { rough: 0.5 })),
    part(og('cat-bell-glint', () => baked(sphere(10, 8), compose([-0.045, -0.08, 0.14], [0, 0, 0.6], [0.035, 0.022, 0.012]))), glintBasic()),
  );
  return {
    head: [hood, rim, ...ears],
    body: [collar, bell],
    hide: ['goggles', 'scarf'],
    update({ t, mood }) {
      for (const ear of ears) {
        const { side, base } = ear.userData;
        let out = 0; // + = 끝이 바깥으로 눕는다
        let back = 0; // + = 뒤로 젖힌다
        if (mood === 'happy') out = Math.sin(t * 15 + side * 1.2) * 0.14;
        else if (mood === 'alert') {
          // 쫑긋: 곧게 세우고 앞으로 살짝, 미세하게 떨린다
          out = -0.14 + Math.sin(t * 31) * 0.015;
          back = -0.12;
        } else if (mood === 'shock') {
          out = -0.18 + Math.sin(t * 47 + side) * 0.05;
          back = -0.06;
        } else if (mood === 'hide') {
          // 납작: 옆·뒤로 착 눕힌다(비행기 귀)
          out = 0.7;
          back = 0.35;
        } else {
          // 평소: 살랑 + 몇 초마다 한쪽 귀를 파르르
          const k = (t + (side > 0 ? 0 : 2.1)) % 4.3;
          out = Math.sin(t * 1.7 + side) * 0.04 + (k < 0.3 ? Math.sin(k * 42) * 0.14 : 0);
        }
        ear.quaternion.copy(base).multiply(q.setFromEuler(e.set(-back, 0, -side * out)));
      }
      const swing = mood === 'happy' ? Math.sin(t * 7) * 0.35 : mood === 'shock' ? Math.sin(t * 40) * 0.2 : mood === 'hide' ? 0 : Math.sin(t * 2.3) * 0.1;
      bell.rotation.set(0, 0, swing);
    },
  };
});

// ───────── 공룡 후드 ─────────

/** 민트 공룡 가죽: 옆머리·뒤통수에 진한 민트 점박이(이마 가운데 등판 자리는 비운다). */
function dinoArt() {
  return faceTexture(
    'pipo-out-dino',
    (ctx, s) => {
      ctx.fillStyle = '#7ee69e';
      ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = '#d2f8d8';
      ctx.fillRect(0, (1 - RIM_V) * s, s, RIM_V * s);
      // [u, v, 지름(라디안)]
      const spots = [[0.3, 0.55, 0.26], [0.36, 0.68, 0.18], [0.22, 0.62, 0.15], [0.41, 0.82, 0.16], [0.27, 0.78, 0.2], [0.15, 0.52, 0.14], [0.33, 0.9, 0.14]];
      ctx.fillStyle = '#4ccb7c';
      for (const [u, v, d] of spots) {
        for (const uu of [u, 1 - u]) {
          const th = HOOD_A * (1 - (v - RIM_V) / (1 - RIM_V));
          const w = (d / (2 * Math.PI * 1.09 * Math.max(0.35, Math.sin(th)))) * s;
          const h = (d / (HOOD_A / (1 - RIM_V))) * s;
          ctx.beginPath();
          ctx.ellipse(uu * s, (1 - v) * s, w / 2, h / 2, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    },
    512,
  );
}

let plateMat = null;
/** 등 가시 재질: 꼭짓점 색(밑동 → 끝으로 밝게). */
const dinoPlateMat = () => (plateMat ??= new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.36, envMapIntensity: 0.8, emissive: new THREE.Color('#c05000'), emissiveIntensity: 0.18 }));

registerOutfit('dino', () => {
  const skin = texMat('dino-skin', dinoArt(), { rough: 0.5, glow: 0.18 });
  const mint = mat('#7ee69e', { rough: 0.5, emissive: '#1f8a40', emissiveIntensity: 0.2 });
  const deep = mat('#3dbd70', { rough: 0.45, emissive: '#0f6a30', emissiveIntensity: 0.22 });
  const white = mat('#ffffff', { rough: 0.35, emissive: '#fff4ec', emissiveIntensity: 0.3 });
  const hood = part(og('dino-hood', () => shellGeo(HOOD_AXIS, HOOD_A, 1.09, 0.96)), skin, 0.035);
  const rim = part(og('dino-rim', () => edgeGeo(HOOD_AXIS, HOOD_A, 1.07, 0.09)), deep, 0.03);
  // 이: 얼굴 구멍 위 테에서 이마 쪽으로 내민 동글동글한 흰 이 다섯 개(무섭지 않게 짧고 뭉툭하게)
  const teeth = part(
    og('dino-teeth', () => {
      const tooth = new THREE.LatheGeometry([[0.001, -0.02], [0.07, 0.0], [0.074, 0.04], [0.06, 0.09], [0.037, 0.13], [0.014, 0.152], [0.001, 0.156]].map(([x, y]) => V2(x, y)), 16);
      tooth.scale(1, 1, 0.62);
      return mergeGeometries(
        [-0.64, -0.32, 0, 0.32, 0.64].map((phi) => {
          const a = shellPoint(HOOD_AXIS, HOOD_A + 0.02, phi, 1.075);
          const b = shellPoint(HOOD_AXIS, HOOD_A + 0.28, phi, 1.04);
          const y = V().subVectors(b, a);
          const len = y.length();
          y.normalize();
          const z = normalAt(a.clone().lerp(b, 0.5));
          z.addScaledVector(y, -z.dot(y)).normalize();
          const x = V().crossVectors(y, z);
          const k = phi === 0 ? 1.08 : 1;
          return smoothed(tooth.clone().scale(k, (len / 0.156) * k, k).applyMatrix4(new THREE.Matrix4().makeBasis(x, y, z).setPosition(a)));
        }),
      );
    }),
    white,
    0.02,
  );
  // 등 가시: 이마에서 뒤통수까지 정수리 가운데를 따라 좌우로 엇갈린 한 줄(가운데가 가장 크다). 납작한 판은 앞에서 보면
  // 모로 서서 막대처럼 보이므로, 밑동이 통통하고 끝이 둥근 원뿔이라 어느 쪽에서 봐도 세모로 읽힌다.
  // 더듬이(호 1.85)는 가운데 두 가시 사이로 나온다. 왼쪽은 노랑, 오른쪽은 주황(밑동 → 끝으로 밝게)
  const plates = part(
    og('dino-plates', () => {
      const tone = { 1: [new THREE.Color('#ff7424'), new THREE.Color('#ffae3c')], [-1]: [new THREE.Color('#ffb42a'), new THREE.Color('#ffe46c')] };
      const c = new THREE.Color();
      // [호 위치(이마 0.95 → 정수리 π/2 → 뒤통수), 높이, 쪽(+1 = 보는 사람의 오른쪽)]
      const list = [[1.0, 0.25, 1], [1.26, 0.33, -1], [1.53, 0.41, 1], [1.84, 0.44, -1], [2.16, 0.38, 1], [2.47, 0.3, -1], [2.76, 0.21, 1]];
      return mergeGeometries(
        list.map(([s, h, sd]) => {
          const rb = h * 0.4 + 0.02;
          const prof = new THREE.SplineCurve([[rb, -0.14], [rb, 0], [rb * 0.8, h * 0.32], [rb * 0.48, h * 0.66], [rb * 0.2, h * 0.92], [0.001, h]].map(([x, y]) => V2(x, y))).getPoints(14);
          const g = new THREE.LatheGeometry([V2(0.001, -0.14), ...prof], 18);
          const p = g.attributes.position;
          const col = [];
          for (let i = 0; i < p.count; i++) {
            c.copy(tone[sd][0]).lerp(tone[sd][1], smooth01(0, h, p.getY(i)));
            col.push(c.r, c.g, c.b);
          }
          g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
          // 가운데 줄에서 옆으로 살짝 비켜(경도 ±0.13) 머리 표면에 거의 곧게 세우고(바깥으로 눕히면 앞에서 리본처럼 보인다),
          // 끝은 뒤로 조금 눕힌다
          const off = sd * 0.13;
          const at = V(Math.sin(off), Math.sin(s) * Math.cos(off), Math.cos(s) * Math.cos(off)).multiply(HS).multiplyScalar(1.07);
          const n = normalAt(at);
          const tng = V(0, Math.cos(s) * HS.y, -Math.sin(s) * HS.z);
          tng.addScaledVector(n, -tng.dot(n)).normalize();
          const side = V().crossVectors(tng, n);
          const M = new THREE.Matrix4().makeBasis(tng, n, side).setPosition(at);
          M.multiply(new THREE.Matrix4().makeRotationX(sd * 0.04)).multiply(new THREE.Matrix4().makeRotationZ(-0.12));
          // 옆(앞에서 보이는 폭)은 그대로, 줄 방향으로 조금 길쭉하게(옆에서 보면 판 같은 세모)
          M.multiply(new THREE.Matrix4().makeScale(1.25, 1, 1));
          return smoothed(g).applyMatrix4(M);
        }),
      );
    }),
    dinoPlateMat(),
    0.025,
  );
  // 몸: 민트 공룡 옷 + 연한 배 + 짧고 통통한 꼬리
  const suit = part(og('dino-suit', () => smoothed(latheGeo(BODY_CURVE.getPoints(24).map((v) => [v.x * 1.07 + 0.03, v.y]), 40))), mint, 0.035);
  const suitR = (y) => bodyR(y) * 1.07 + 0.03;
  const belly = part(
    og('dino-belly', () => {
      const s = new THREE.Shape();
      s.absellipse(0, -0.5, 0.3, 0.36, 0, Math.PI * 2);
      return finishSlab(wrapBody(slabGeo(s, { depth: 0.01, bevel: 0.022, seg: 2, tess: 0.06 }), { ref: 0.62, lift: 0.0, radius: suitR }));
    }),
    mat('#e6ffd2', { rough: 0.55, emissive: '#7ab070', emissiveIntensity: 0.22 }),
    0.02,
  );
  const tail = new THREE.Group();
  tail.position.set(0.0, -0.6, -0.52);
  tail.add(
    part(
      og('dino-tail', () => {
        const curve = new THREE.CatmullRomCurve3([V(0, 0, 0), V(0.05, -0.08, -0.28), V(0.2, -0.12, -0.5), V(0.42, -0.06, -0.6)]);
        return taperTube(curve, (t) => (0.22 - 0.15 * t) * Math.sqrt(Math.max(0, 1 - Math.max(0, (t - 0.8) / 0.2) ** 2)), 28, 14);
      }),
      mint,
      0.03,
    ),
  );
  return {
    head: [hood, rim, teeth, plates],
    body: [suit, belly, tail],
    hide: ['goggles'],
    update({ t, mood }) {
      const k = mood === 'happy' ? 3 : mood === 'shock' ? 0.6 : mood === 'hide' ? 0 : 1;
      tail.rotation.set(0, Math.sin(t * (mood === 'happy' ? 9 : 2.4)) * 0.18 * k, 0);
    },
  };
});

// ───────── 꿀벌 ─────────

// 몸 옷의 높이 범위(BODY_CURVE 아래 끝 → 목): 그림 v = (y - BEE_Y0) / BEE_H
const BEE_Y0 = -1.0;
const BEE_H = 1.14;
const BEE_BANDS = [[-0.27, -0.13], [-0.58, -0.43], [-0.88, -0.74]];

/** 꿀벌 옷: 노랑 바탕에 까만 띠 셋(띠 가장자리는 살짝 부드럽게). */
function beeArt() {
  return faceTexture(
    'pipo-out-bee',
    (ctx, s) => {
      ctx.fillStyle = '#ffd338';
      ctx.fillRect(0, 0, s, s);
      const Y = (y) => (1 - (y - BEE_Y0) / BEE_H) * s;
      for (const [a, b] of BEE_BANDS) {
        ctx.fillStyle = '#2a2140';
        ctx.fillRect(0, Y(b), s, Y(a) - Y(b));
        // 띠 위쪽에 아주 옅은 윤기
        ctx.fillStyle = 'rgba(120,100,170,0.35)';
        ctx.fillRect(0, Y(b) + 1, s, (Y(a) - Y(b)) * 0.18);
      }
    },
    128,
  );
}

/** 날개 막: 밑동은 연분홍, 끝으로 하늘색 → 연보라. 밑동에서 뻗는 흰 날개맥. uv = 날개 판 좌표. */
function wingArt() {
  return faceTexture(
    'pipo-out-wing',
    (ctx, s) => {
      const g = ctx.createRadialGradient(0, s / 2, 0, 0, s / 2, s);
      g.addColorStop(0, '#ffd9f0');
      g.addColorStop(0.45, '#bff4ff');
      g.addColorStop(1, '#d9c8ff');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = s * 0.018;
      ctx.lineCap = 'round';
      for (const a of [-0.35, -0.05, 0.25, 0.55]) {
        ctx.beginPath();
        ctx.moveTo(0, s / 2);
        ctx.quadraticCurveTo(s * 0.4, s / 2 - Math.sin(a) * s * 0.2, s * Math.cos(a) * 0.95, s / 2 - Math.sin(a) * s * 0.5);
        ctx.stroke();
      }
    },
    128,
  );
}

let wingMatCache = null;
const wingMat = () =>
  (wingMatCache ??= new THREE.MeshPhysicalMaterial({
    map: wingArt(),
    color: '#ffffff',
    roughness: 0.12,
    transparent: true,
    opacity: 0.78,
    side: THREE.DoubleSide,
    depthWrite: false,
    iridescence: 1,
    iridescenceIOR: 1.4,
    iridescenceThicknessMinimum: 220,
    iridescenceThicknessMaximum: 680,
    envMapIntensity: 1.3,
    emissive: new THREE.Color('#ffffff'),
    emissiveMap: wingArt(),
    emissiveIntensity: 0.3,
  }));

/** 날개 한 장(막 + 테두리 관). 밑동이 원점, 바깥(+x·side)으로 뻗는다. */
function wingGeos(key, side, L, W) {
  const shape = () => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.bezierCurveTo(side * L * 0.2, W * 0.95, side * L * 0.85, W * 1.05, side * L, W * 0.35);
    s.bezierCurveTo(side * L * 1.08, -W * 0.15, side * L * 0.5, -W * 0.5, 0, 0);
    return s;
  };
  const membrane = og(`${key}${side}`, () => {
    const g = new THREE.ShapeGeometry(shape(), 24);
    const p = g.attributes.position;
    const uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, Math.abs(p.getX(i)) / (L * 1.1), 0.5 + p.getY(i) / (L * 1.1));
    return g;
  });
  const edge = og(`${key}-edge${side}`, () => {
    const pts = shape().getSpacedPoints(60);
    pts.pop();
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((v) => V(v.x, v.y, 0)), true), 80, 0.017, 6, true);
  });
  return { membrane, edge };
}

registerOutfit('bee', () => {
  const black = mat('#262038', { rough: 0.2, envIntensity: 1.5, emissive: '#2b1a5e', emissiveIntensity: 0.25 });
  const yellow = mat('#ffd338', { rough: 0.4, emissive: '#c07a00', emissiveIntensity: 0.22, envIntensity: 1.0 });
  // 줄무늬 옷(몸 윤곽을 따라 돈 선반 도형, 그림 v = 높이)
  const suit = part(
    og('bee-suit', () => {
      const g = latheGeo(BODY_CURVE.getPoints(28).map((v) => [v.x * 1.07 + 0.03, v.y]), 40);
      const p = g.attributes.position;
      const uv = g.attributes.uv;
      for (let i = 0; i < p.count; i++) uv.setY(i, (p.getY(i) - BEE_Y0) / BEE_H);
      return g;
    }),
    texMat('bee-suit', beeArt(), { rough: 0.45, glow: 0.16 }),
    0.035,
  );
  // 보송한 목털
  const ruff = part(og('bee-ruff', () => neckRing(0.49, 0.125, 0.03, 24, 0.1)), mat('#fff0b4', { rough: 0.9, emissive: '#c89a40', emissiveIntensity: 0.3 }), 0.028);
  // 날개: 등에 두 쌍(큰 앞날개 + 작은 뒷날개). 머리가 커서 위로 펼치면 가려지므로 옆으로 펼쳐 머리 아래 몸 양옆에 보이게,
  // 막은 반투명 무지갯빛이라 외곽선 대신 테두리 관을 두른다(외곽선 뒷면이 막을 통해 비쳐 어두워진다)
  const edgeMat = mat('#3a2f7a', { rough: 0.4, emissive: '#2b1a5e', emissiveIntensity: 0.3 });
  const wings = [-1, 1].map((side) => {
    const root = new THREE.Group();
    root.position.set(side * 0.2, 0.03, -0.35);
    const fore = new THREE.Group();
    const big = wingGeos('bee-wing', side, 0.92, 0.38);
    fore.add(part(big.membrane, wingMat()), part(big.edge, edgeMat));
    const hind = new THREE.Group();
    const small = wingGeos('bee-hwing', side, 0.64, 0.25);
    hind.add(part(small.membrane, wingMat()), part(small.edge, edgeMat));
    hind.rotation.z = -side * 0.5;
    hind.position.set(0, -0.03, -0.01);
    root.add(fore, hind);
    root.userData.side = side;
    return root;
  });
  // 머리띠 + 통통 튀는 까만 구슬 더듬이 둘(피포 더듬이 양옆)
  const TAU = -0.06; // 머리띠를 앞으로 살짝 기울인 각
  const bandAt = (th, lift = 1.03) => V(Math.sin(th), Math.cos(th) * Math.cos(TAU), -Math.cos(th) * Math.sin(TAU)).multiply(HS).multiplyScalar(lift);
  const band = part(
    og('bee-band', () => {
      const pts = [];
      for (let i = 0; i <= 40; i++) pts.push(bandAt(-1.68 + (3.36 * i) / 40));
      const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.055, 8, false);
      const caps = [pts[0], pts[pts.length - 1]].map((c) => baked(sphere(10, 8), compose([c.x, c.y, c.z], [0, 0, 0], [0.055, 0.055, 0.055])));
      return mergeGeometries([smoothed(tube), ...caps.map((g) => smoothed(g))]);
    }),
    yellow,
    0.025,
  );
  const feelers = [-1, 1].map((side) => {
    const base = bandAt(side * 0.74, 1.04);
    const n = normalAt(base);
    const g = new THREE.Group();
    g.position.copy(base);
    const c1 = n.clone().multiplyScalar(0.12);
    const c2 = c1.clone().add(V(side * 0.07, 0.16, 0.02));
    const c3 = c2.clone().add(V(side * 0.11, 0.13, 0.03));
    g.add(
      part(og(`bee-stalk${side}`, () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(), c1, c2, c3]), 20, 0.036, 8, false)), black, 0.02),
      part(og(`bee-ball${side}`, () => baked(sphere(18, 14), compose([c3.x, c3.y, c3.z], [0, 0, 0], [0.125, 0.125, 0.125]))), black, 0.025),
      part(og(`bee-ball-glint${side}`, () => baked(sphere(10, 8), compose([c3.x - 0.045, c3.y + 0.05, c3.z + 0.09], [0, 0, 0.6], [0.04, 0.026, 0.015]))), glintBasic()),
    );
    g.userData.side = side;
    return g;
  });
  return {
    head: [band, ...feelers],
    body: [suit, ruff, ...wings],
    hide: ['goggles', 'scarf'],
    update({ t, mood, spring }) {
      // 날개: 기쁘면 더 빠르게, 숨으면 등에 접고 멈춘다
      const f = mood === 'happy' ? 46 : mood === 'shock' ? 60 : mood === 'alert' ? 34 : 24;
      for (const w of wings) {
        const side = w.userData.side;
        if (mood === 'hide') w.rotation.set(0.15, side * 1.05, side * -0.15);
        else {
          // 앞(화면) 쪽으로 면을 살짝 세우고, 파닥임은 위아래 + 앞뒤
          const flap = Math.sin(t * f + side * 0.4);
          w.rotation.set(-0.25, side * (0.22 + flap * 0.14), side * (0.06 + flap * 0.2));
        }
      }
      // 더듬이: 피포 더듬이보다 반 박자 늦게 통통
      for (const g of feelers) {
        const side = g.userData.side;
        const lag = mood === 'shock' ? Math.sin(t * 28 - 0.9) * 0.22 : mood === 'happy' ? Math.sin(t * 14 - 0.7 + side * 0.4) * 0.2 : Math.sin(t * 3.4 - 0.6 + side) * 0.09;
        g.rotation.set(lag * 0.6 - (mood === 'hide' ? 0.25 : 0), 0, spring * 0.5 + lag - side * (mood === 'hide' ? 0.3 : 0));
      }
    },
  };
});

// ───────── 개구리 모자 ─────────

/** 연잎 목깃: 둥근 잎 가운데서 뻗는 연한 잎맥 + 가장자리는 진하게. uv = 잎 판 좌표 × 0.6 + 0.5. */
function lilyArt() {
  return faceTexture(
    'pipo-out-lily',
    (ctx, s) => {
      const c = s / 2;
      const g = ctx.createRadialGradient(c, c, 0, c, c, s * 0.5);
      g.addColorStop(0, '#8ee86a');
      g.addColorStop(0.7, '#5fcf52');
      g.addColorStop(1, '#3fae45');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
      ctx.strokeStyle = 'rgba(214,255,170,0.85)';
      ctx.lineCap = 'round';
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2 + 0.11;
        ctx.lineWidth = s * 0.014;
        ctx.beginPath();
        ctx.moveTo(c + Math.cos(a) * s * 0.2, c + Math.sin(a) * s * 0.2);
        ctx.quadraticCurveTo(c + Math.cos(a + 0.08) * s * 0.33, c + Math.sin(a + 0.08) * s * 0.33, c + Math.cos(a + 0.05) * s * 0.46, c + Math.sin(a + 0.05) * s * 0.46);
        ctx.stroke();
      }
    },
    256,
  );
}

registerOutfit('frog', () => {
  const axis = V(0, Math.cos(0.36), -Math.sin(0.36));
  const A = 1.24;
  const green = mat('#7ad650', { rough: 0.45, emissive: '#2f8a1a', emissiveIntensity: 0.22 });
  const deep = mat('#53bb43', { rough: 0.45, emissive: '#1f6a14', emissiveIntensity: 0.22 });
  const hat = part(og('frog-hat', () => shellGeo(axis, A, 1.08, 0.96)), green, 0.035);
  const brim = part(og('frog-brim', () => edgeGeo(axis, A, 1.065, 0.095)), deep, 0.03);
  const blush = part(
    og('frog-blush', () =>
      mergeGeometries(
        [-1, 1].map((side) => {
          const { p, n } = headAt(side * 0.76, 0.84, 1.075);
          return baked(sphere(16, 10), surfaceMatrix(p, n, compose([0, 0, 0], [0, 0, side * -0.25], [0.12, 0.075, 0.025])));
        }),
      ),
    ),
    mat('#ff8fb6', { rough: 0.5, emissive: '#d0407a', emissiveIntensity: 0.3 }),
  );
  // 눈: 모자 위 초록 눈두덩 + 흰 눈알 + 까만 눈동자(반짝임) + 초록 눈꺼풀(깜빡·실눈)
  const whiteMat = mat('#ffffff', { rough: 0.25, emissive: '#ffffff', emissiveIntensity: 0.32 });
  const pupilMat = mat('#1d1733', { rough: 0.2, envIntensity: 1.4 });
  const R = 0.22;
  const eyes = [-1, 1].map((side) => {
    const { p, n } = headAt(side * 0.42, 1.0, 1.0);
    const eye = new THREE.Group();
    eye.position.copy(p).addScaledVector(n, 0.25);
    eye.add(part(og('frog-socket', () => baked(sphere(22, 16), compose([0, -0.06, -0.08], [0, 0, 0], [0.25, 0.25, 0.25]))), green, 0.03));
    eye.add(part(og('frog-ball', () => baked(sphere(24, 18), compose([0, 0, 0], [0, 0, 0], [R, R, R]))), whiteMat, 0.022));
    const look = new THREE.Group();
    look.add(part(og('frog-pupil', () => baked(sphere(18, 12), compose([0, 0, R - 0.02], [0, 0, 0], [0.1, 0.12, 0.05]))), pupilMat));
    look.add(part(og('frog-glint', () => baked(sphere(10, 8), compose([-0.035, 0.05, R + 0.026], [0, 0, 0.5], [0.034, 0.042, 0.012]))), glintBasic()));
    eye.add(look);
    // 윗눈꺼풀(깜빡·실눈)과 아랫눈꺼풀(기쁠 때 볼이 밀려 올라와 눈이 반달 ∩ 이 된다)
    const lidGeo = og('frog-lid', () => roundShell(1.3, 1.1, 0.97).scale(R * 1.04, R * 1.04, R * 1.04));
    const lid = new THREE.Group();
    lid.add(part(lidGeo, green, 0.022));
    const low = new THREE.Group();
    low.scale.setScalar(1.04); // 감을 때 윗눈꺼풀 위로 겹쳐 덮는다(같은 크기면 겹친 면이 깜빡인다)
    low.add(part(lidGeo, green, 0.022));
    // 감은 눈의 속눈썹 선: 아랫눈꺼풀 테를 따라 앞쪽만(눈꺼풀을 거꾸로 돌려 쓰므로 둘레 φ = π 쪽이 앞)
    const lash = part(
      og('frog-lash', () => {
        const pts = [];
        for (let i = 0; i <= 16; i++) {
          const phi = Math.PI - 1.15 + (2.3 * i) / 16;
          const al = 1.34 - 0.08 * Math.abs(Math.sin((phi - Math.PI) * 1.2)); // 양 끝을 살짝 올려 웃는 눈꼬리
          const r = 1.1 * R * 1.04 + 0.004;
          pts.push(V(r * Math.sin(al) * Math.sin(phi), r * Math.cos(al), r * Math.sin(al) * Math.cos(phi)));
        }
        const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.016, 6, false);
        const caps = [pts[0], pts[pts.length - 1]].map((c) => baked(sphere(8, 6), compose([c.x, c.y, c.z], [0, 0, 0], [0.016, 0.016, 0.016])));
        return mergeGeometries([smoothed(g), ...caps.map((x) => smoothed(x))]);
      }),
      mat('#2a1660', { rough: 0.5 }),
    );
    low.add(lash);
    eye.add(lid, low);
    eye.userData = { side, look, lid, low, lash };
    return eye;
  });
  // 연잎 목깃: 정면 조금 왼쪽에 V 자 홈이 난 둥근 잎을 목에 끼우고 가장자리는 아래로 살짝 늘어뜨린다
  const lily = part(
    og('frog-lily', () => {
      const Ro = 0.76;
      const ri = 0.33;
      const notch = Math.atan2(-0.95, -0.32); // 판 좌표에서 홈 방향(세상: 정면에서 조금 왼쪽)
      const s = new THREE.Shape();
      const N = 120;
      for (let i = 0; i <= N; i++) {
        const a = notch + 0.0001 + (i / N) * (Math.PI * 2 - 0.0002);
        const d = Math.min(a - notch, notch + Math.PI * 2 - a); // 홈 가운데에서 떨어진 각
        const r = d < 0.3 ? 0.42 + (Ro - 0.42) * (d / 0.3) ** 1.15 : Ro * (1 + 0.025 * Math.sin(a * 7));
        if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      const hole = new THREE.Path();
      hole.absarc(0, 0, ri, 0, Math.PI * 2, true);
      s.holes.push(hole);
      const g = slabGeo(s, { depth: 0.015, bevel: 0.026, seg: 2, uvScale: 0.6, tess: 0.07 });
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i);
        const yv = p.getY(i);
        const r = Math.hypot(x, yv);
        const dr = Math.max(0, r - ri);
        p.setXYZ(i, x, -0.02 - 0.16 * dr - 0.42 * dr * dr + p.getZ(i), -yv);
      }
      return finishSlab(g);
    }),
    texMat('frog-lily', lilyArt(), { rough: 0.45, glow: 0.18 }),
    0.025,
  );
  // 연잎 위 작은 분홍 연꽃(오른쪽 어깨): 꽃잎 다섯 + 노란 꽃술
  const flower = new THREE.Group();
  {
    const a = 0.95;
    const r = 0.6;
    const dr = r - 0.33;
    flower.position.set(Math.sin(a) * r, -0.02 - 0.16 * dr - 0.42 * dr * dr + 0.06, Math.cos(a) * r);
    flower.rotation.set(0.25, a, -0.2);
    flower.add(
      part(
        og('frog-petals', () =>
          mergeGeometries(
            [0, 1, 2, 3, 4].map((k) => {
              const ang = (k / 5) * Math.PI * 2;
              // 꽃잎: 바깥으로 누운 긴 타원을 살짝 세워(오목한 꽃) 둘레에 돌린다
              const m = new THREE.Matrix4().makeRotationY(ang).multiply(new THREE.Matrix4().makeRotationX(-0.5)).multiply(compose([0, 0.02, 0.075], [0, 0, 0], [0.062, 0.035, 0.1]));
              return baked(sphere(14, 10), m);
            }),
          ),
        ),
        mat('#ff9ac6', { rough: 0.45, emissive: '#d0407a', emissiveIntensity: 0.28 }),
        0.018,
      ),
      part(og('frog-pistil', () => baked(sphere(12, 10), compose([0, 0.06, 0], [0, 0, 0], [0.045, 0.035, 0.045]))), mat('#ffd84a', { rough: 0.4, emissive: '#c08000', emissiveIntensity: 0.3 }), 0.015),
    );
  }
  const st = { mood: '', since: 0 };
  return {
    head: [hat, brim, blush, ...eyes],
    body: [lily, flower],
    hide: ['goggles', 'scarf'],
    update({ t, mood }) {
      if (mood !== st.mood) {
        st.mood = mood;
        st.since = t;
      }
      // 윗눈꺼풀 각(+ = 앞으로 덮는다): 뜬 눈 -0.95, 감은 눈 0.6. 아랫눈꺼풀 lowK: 0 = 눈두덩 속, 1 = 위로 올라와 ^ 자로 감긴다
      let lidA = -0.95;
      let lowK = 0;
      let lookX = 0;
      let lookY = 0;
      let k = 1;
      let pk = 1; // 눈동자 크기
      const blink = t % 3.9 > 3.76 || (t + 1.7) % 6.3 > 6.17;
      if (mood === 'happy') {
        // 피포의 ^^ 와 같은 때에 감고(처음 1.4초, 그 뒤 3초마다 1.7초), 뜰 땐 눈을 반짝 위로
        const since = t - st.since;
        const open = since > 1.4 && (since - 1.4) % 3 < 1.3;
        if (open) {
          lidA = -1.1;
          lookY = -0.12;
        } else {
          lidA = 0.6;
          lowK = 1;
        }
      } else if (mood === 'shock') {
        lidA = -1.15;
        k = 1.12;
        pk = 0.6;
      } else if (mood === 'alert') {
        // 긴장: 눈을 크게 뜨고 눈동자는 콩알만 하게
        lidA = -1.1;
        pk = 0.72;
      } else if (mood === 'hide') {
        // 실눈으로 두리번두리번
        lidA = 0.05;
        lookX = Math.sin(t * 3.1) * 0.45;
      } else if (blink) lidA = 0.95;
      for (const eye of eyes) {
        const { look, lid, low, lash, side } = eye.userData;
        lid.rotation.x = lidA;
        low.rotation.x = Math.PI + 1.15 - lowK * 1.72;
        lash.visible = lowK > 0.5;
        look.rotation.set(lookY - 0.04, lookX - side * 0.06, 0);
        look.scale.set(pk, pk, 1);
        eye.scale.setScalar(k);
      }
    },
  };
});

// ───────── 겨울 니트 ─────────

const KNIT_RED = '#e8364d';
const KNIT_WHITE = '#fff7f2';

/** 니트 모자: 빨강 바탕에 코바늘 V 무늬, 가장자리 위로 흰 눈송이 띠(지그재그 두 줄 사이). */
function knitArt() {
  return faceTexture(
    'pipo-out-knit',
    (ctx, s) => {
      ctx.fillStyle = KNIT_RED;
      ctx.fillRect(0, 0, s, s);
      // 뜨개 코: 세로 줄마다 V 자
      const cols = 44;
      const rows = 18;
      ctx.lineCap = 'round';
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = ((i + 0.5) / cols) * s;
          const y = ((j + 0.5) / rows) * s;
          const w = (s / cols) * 0.42;
          const h = (s / rows) * 0.42;
          const fadeTop = 1 - smooth01(0.82, 0.97, 1 - y / s); // 꼭대기(뒤통수 쪽 극)에선 코가 몰리므로 흐리게
          ctx.strokeStyle = `rgba(120,0,30,${0.3 * fadeTop})`;
          ctx.lineWidth = s * 0.005;
          ctx.beginPath();
          ctx.moveTo(x - w, y - h);
          ctx.lineTo(x, y + h);
          ctx.lineTo(x + w, y - h);
          ctx.stroke();
          ctx.strokeStyle = `rgba(255,200,200,${0.16 * fadeTop})`;
          ctx.beginPath();
          ctx.moveTo(x - w * 0.8, y - h * 1.2);
          ctx.lineTo(x, y + h * 0.6);
          ctx.stroke();
        }
      }
      // 눈송이 띠(v 0.5 ~ 0.66)
      const Y = (v) => (1 - v) * s;
      ctx.fillStyle = KNIT_WHITE;
      ctx.strokeStyle = KNIT_WHITE;
      for (const v of [0.495, 0.665]) {
        ctx.lineWidth = s * 0.008;
        ctx.beginPath();
        const n = 48;
        for (let i = 0; i <= n; i++) ctx.lineTo((i / n) * s, Y(v) + (i % 2 ? -1 : 1) * s * 0.008);
        ctx.stroke();
      }
      const flakes = 12;
      const sy = 2.6; // 세로가 가로보다 덜 늘어나므로 눈송이를 세로로 늘려 그린다
      for (let i = 0; i < flakes; i++) {
        ctx.save();
        ctx.translate(((i + 0.5) / flakes) * s, Y(0.58));
        ctx.scale(1, sy);
        const r = s * 0.021;
        ctx.lineWidth = s * 0.0065;
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2;
          const cx = Math.cos(a);
          const cy = Math.sin(a);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(cx * r, cy * r);
          // 가지
          const bx = cx * r * 0.6;
          const by = cy * r * 0.6;
          for (const sgn of [-1, 1]) {
            const b = a + sgn * 0.8;
            ctx.moveTo(bx, by);
            ctx.lineTo(bx + Math.cos(b) * r * 0.38, by + Math.sin(b) * r * 0.38);
          }
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    },
    512,
  );
}

/** 줄무늬 목도리: 가로(u)로 빨강·흰 띠가 번갈아(고리), 세로(v)로 번갈아(꼬리) + 뜨개 결. */
function scarfArt(vertical) {
  return faceTexture(
    `pipo-out-scarf:${vertical ? 'v' : 'u'}`,
    (ctx, s) => {
      const n = 10;
      for (let i = 0; i < n; i++) {
        ctx.fillStyle = i % 2 ? KNIT_WHITE : KNIT_RED;
        if (vertical) ctx.fillRect(0, (i / n) * s, s, s / n + 1);
        else ctx.fillRect((i / n) * s, 0, s / n + 1, s);
      }
      // 뜨개 결(가는 골)
      ctx.strokeStyle = 'rgba(90,0,30,0.14)';
      ctx.lineWidth = s * 0.012;
      for (let i = 0; i < 16; i++) {
        const c = ((i + 0.5) / 16) * s;
        ctx.beginPath();
        if (vertical) {
          ctx.moveTo(c, 0);
          ctx.lineTo(c, s);
        } else {
          ctx.moveTo(0, c);
          ctx.lineTo(s, c);
        }
        ctx.stroke();
      }
    },
    128,
  );
}

registerOutfit('winter', () => {
  const axis = V(0, Math.cos(0.3), -Math.sin(0.3));
  // 가장자리: 앞은 이마 위(위도 0.69), 옆으로는 귀덮개가 볼 옆까지 내려온다
  const A = (phi) => 1.18 + 0.9 * plateau(phi, 1.6, 0.1, 0.38);
  // 정수리를 조금 높여 니트 모자답게(가장자리 쪽은 그대로)
  const crown = (geo, seg) => {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + 0.12 * smooth01(0.68, 1.1, p.getY(i)));
    geo.computeVertexNormals();
    // 이음매(둘레 첫 줄 = 끝 줄) 법선을 다시 맞춘다(shellGeo 와 같이)
    const nr = geo.attributes.normal;
    const P = p.count / (seg + 1);
    const v = V();
    for (let i = 0; i < P; i++) {
      const j = seg * P + i;
      v.set(nr.getX(i) + nr.getX(j), nr.getY(i) + nr.getY(j), nr.getZ(i) + nr.getZ(j)).normalize();
      nr.setXYZ(i, v.x, v.y, v.z);
      nr.setXYZ(j, v.x, v.y, v.z);
    }
    return geo;
  };
  const knit = texMat('winter-knit', knitArt(), { rough: 0.75, glow: 0.2, env: 0.4 });
  const wool = mat(KNIT_WHITE, { rough: 0.85, emissive: '#d8b8c0', emissiveIntensity: 0.3 });
  const red = mat(KNIT_RED, { rough: 0.75, emissive: '#a01030', emissiveIntensity: 0.22 });
  // 그림 v 를 꼭대기 축에서 잰 실제 각으로 다시 매긴다(귀덮개에선 v < RIM_V = 무늬 없는 니트). 그래야 눈송이 띠가
  // 귀덮개를 따라 흘러내리지 않고 머리를 수평으로 두른다
  const KNIT_A = 1.18;
  const hat = part(
    og('winter-hat', () => {
      const g = shellGeo(axis, A, 1.1, 0.96, 72);
      const p = g.attributes.position;
      const uv = g.attributes.uv;
      const d = V();
      for (let i = 0; i < p.count; i++) {
        d.set(p.getX(i) / HS.x, p.getY(i) / HS.y, p.getZ(i) / HS.z).normalize();
        const th = Math.acos(Math.max(-1, Math.min(1, d.dot(axis))));
        uv.setY(i, Math.max(0, RIM_V + (1 - RIM_V) * (1 - th / KNIT_A)));
      }
      return crown(g, 72);
    }),
    knit,
    0.035,
  );
  const cuff = part(og('winter-cuff', () => edgeGeo(axis, A, 1.085, 0.095, 64, 0.1, 384)), wool, 0.028);
  // 털방울: 정수리 앞쪽(더듬이는 그 뒤로 나온다)
  const pom = new THREE.Group();
  pom.position.set(0, 1.3, 0.14);
  pom.add(part(og('winter-pom', () => fluffGeo(0.7).scale(0.28, 0.27, 0.28)), wool, 0.03));
  // 귀덮개 끝에서 늘어진 땋은 끈(빨강·흰 매듭이 번갈아) + 작은 털방울
  const braids = [-1, 1].map((side) => {
    const base = shellPoint(axis, A(side * Math.PI / 2) + 0.02, (side * Math.PI) / 2, 1.07);
    const g = new THREE.Group();
    g.position.copy(base);
    const knots = (odd) =>
      mergeGeometries(
        [0, 1, 2, 3, 4]
          .filter((k) => k % 2 === odd)
          .map((k) => baked(sphere(12, 10), compose([(k % 2 ? 1 : -1) * 0.018, -0.03 - k * 0.075, 0], [0, 0, (k % 2 ? 1 : -1) * 0.5], [0.052, 0.068, 0.05]))),
      );
    g.add(part(og('winter-braid-a', () => knots(0)), red, 0.02), part(og('winter-braid-b', () => knots(1)), wool, 0.02));
    g.add(part(og('winter-tassel', () => fluffGeo(2.1).scale(0.085, 0.09, 0.085).translate(0, -0.43, 0)), wool, 0.022));
    g.userData.side = side;
    return g;
  });
  // 목도리: 굵은 고리 + 오른쪽 앞 매듭 + 가슴으로 늘어진 두 꼬리(끝에 술)
  const ringMat = texMat('winter-scarf-u', scarfArt(false), { rough: 0.8, glow: 0.2, env: 0.4 });
  const tailMat = texMat('winter-scarf-v', scarfArt(true), { rough: 0.8, glow: 0.2, env: 0.4 });
  const ring = part(og('winter-ring', () => new THREE.TorusGeometry(0.5, 0.16, 12, 40).rotateX(Math.PI / 2).translate(0, 0.03, 0)), ringMat, 0.03);
  const knot = part(og('winter-knot', () => baked(sphere(18, 14), compose([0.15, -0.07, 0.66], [0.2, 0.25, 0.3], [0.15, 0.14, 0.12]))), ringMat, 0.03);
  const TAILS = [
    // [가운데 각, 위 높이, 아래 높이, 기울기(아래로 갈수록 옆으로)]
    [0.17, -0.04, -0.46, -0.22],
    [0.42, -0.06, -0.38, 0.28],
  ];
  const tails = part(
    og('winter-tails', () =>
      mergeGeometries(
        TAILS.map(([a0, top, bot, lean]) => {
          const w = 0.1;
          const s = roundPoly([V2(-w, top), V2(w, top), V2(w + lean * (top - bot), bot), V2(-w + lean * (top - bot), bot)], 0.035);
          return finishSlab(wrapBody(slabGeo(s, { depth: 0.03, bevel: 0.03, seg: 2, tess: 0.05 }), { a0, ref: 0.55, lift: 0.07 }));
        }),
      ),
    ),
    tailMat,
    0.025,
  );
  const fringe = part(
    og('winter-fringe', () =>
      mergeGeometries(
        TAILS.flatMap(([a0, top, bot, lean]) => {
          const out = [];
          for (const fx of [-0.07, 0, 0.07]) {
            const x = fx + lean * (top - bot);
            const at = (y, dx = 0) => {
              const a = a0 + (x + dx) / 0.55;
              const r = bodyR(y) + 0.07 + 0.045;
              return V(Math.sin(a) * r, y, Math.cos(a) * r);
            };
            out.push(segGeo(at(bot - 0.02), at(bot - 0.1, lean * 0.06), 0.022));
          }
          return out;
        }),
      ),
    ),
    wool,
    0.016,
  );
  const scarf = new THREE.Group();
  scarf.add(ring, knot, tails, fringe);
  return {
    head: [hat, cuff, pom, ...braids],
    body: [scarf],
    hide: ['goggles', 'scarf'],
    antenna: 0.16,
    update({ t, mood }) {
      // 털방울: 기쁘면 통통, 놀라면 부르르
      let bob = Math.sin(t * 2.4) * 0.008;
      let sq = 1;
      if (mood === 'happy') {
        const h = Math.sin(t * 14);
        bob = h * 0.035;
        sq = 1 - h * 0.07;
      } else if (mood === 'shock') {
        bob = 0.02 + Math.sin(t * 40) * 0.015;
        sq = 1.06;
      } else if (mood === 'hide') {
        bob = -0.03;
        sq = 0.95;
      }
      pom.position.y = 1.3 + bob;
      pom.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
      for (const b of braids) {
        const side = b.userData.side;
        const sw = mood === 'happy' ? Math.sin(t * 7 + side) * 0.2 : mood === 'shock' ? Math.sin(t * 40) * 0.05 : Math.sin(t * 2 + side) * 0.05;
        b.rotation.set(0, 0, sw + side * 0.04);
      }
    },
  };
});
