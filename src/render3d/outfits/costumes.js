// 차림 의상 다섯 벌: 꼬마 마법사, 우주 해적 선장, 꼬마 기사, 꽃 화관, 생일 파티.
// pipo.js 의 의상과 같은 방식: 머리 반지름 1 단위, 도형(og)·재질(mat)·그림(faceTexture)은 캐시해 피포 여럿이 나눠 쓰고,
// 두툼하게 말린 테두리 + 남색 외곽선으로 장난감처럼. 그늘에서 회색이 되지 않게 재질마다 같은 빛깔로 살짝 스스로 빛난다.
// 붙이는 곳: head = 머리 중심 기준(찌그러짐·기울임을 따라간다), body = 목 높이 기준 몸, root = 손에 든 물건(손 자리를 따라간다).
// 얼굴(경도 ±0.6, 위도 −0.6..0.5)은 가리지 않고, 더듬이는 모자를 뚫고 나오거나(antenna 로) 위로 올린다.
import { registerOutfit, OUTFIT_KIT } from '../pipo.js';
import { glowSprite } from '../kit.js';

const {
  THREE,
  mat,
  faceTexture,
  mergeGeometries,
  HS,
  YV,
  BODY_CURVE,
  og,
  headAt,
  surfaceMatrix,
  segGeo,
  smoothed,
  shellGeo,
  edgeGeo,
  plateau,
  bodyR,
  slabGeo,
  wrapBody,
  finishSlab,
  chestMatrix,
  starShape,
  part,
  compose,
  baked,
  sphere,
  rotTo,
  GOLD_MAT,
  glintBasic,
} = OUTFIT_KIT;

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
// 손에 든 물건의 앞면이 향할 쪽(화면은 피포를 앞 조금 위에서 본다)
const VIEW = V3(0, 0.45, 1).normalize();

// ───────── 도형 도구 ─────────

/** 통통한 별 윤곽(극좌표 반지름 ρ(θ)). 꼭짓점도 골도 둥글다. p 가 클수록 꼭짓점이 뾰족하다. 꼭짓점 하나가 위(+y). */
const starRho = (R, r, p = 1.6, n = 5) => (th) => r + (R - r) * Math.pow(0.5 + 0.5 * Math.cos(n * (th - Math.PI / 2)), p);
/** 꽃 윤곽: 둥근 꽃잎 n 장, 꽃잎 사이는 쏙 들어간다. */
const flowerRho = (R, r, n = 5, off = Math.PI / 2) => (th) => r + (R - r) * Math.pow(Math.abs(Math.cos((n * (th - off)) / 2)), 0.55);

/**
 * 윤곽 ρ(θ) 를 앞뒤로 말랑하게 부풀린 베개 모양(별·꽃·반짝이). 앞 = +z, 두께 = depth(앞)·back(뒤).
 * cup = 가장자리를 앞으로 들어 올리는 정도(꽃잎이 오목하게 모인다). 테두리가 둥글어 외곽선이 깔끔하다.
 */
function pillowGeo(rho, { depth = 0.05, back = depth, rings = 6, segs = 72, cup = 0 } = {}) {
  const pos = [];
  const rows = rings * 2;
  for (let r = 0; r <= rows; r++) {
    const front = r <= rings;
    const psi = ((front ? r : rows - r) / rings) * (Math.PI / 2);
    const t = Math.sin(psi);
    const z = (front ? depth : -back) * Math.cos(psi) + cup * t * t;
    for (let j = 0; j <= segs; j++) {
      const th = (j / segs) * Math.PI * 2;
      const R = rho(th) * t;
      pos.push(R * Math.cos(th), R * Math.sin(th), z);
    }
  }
  const idx = [];
  for (let r = 0; r < rows; r++) {
    for (let j = 0; j < segs; j++) {
      const a = r * (segs + 1) + j;
      const b = a + segs + 1;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return smoothed(g);
}

/** 통통한 잎(밑동이 원점, 끝이 +y, 앞이 +z): 양 끝이 뾰족한 렌즈 모양, 가운데 잎맥을 따라 살짝 접히고 끝이 앞으로 휜다. */
function leafGeo(w, L, d) {
  const g = sphere(16, 12);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    const k = Math.sqrt(Math.max(0, 1 - y * y));
    const x = p.getX(i) * k * w;
    const yy = ((y + 1) / 2) * L;
    const z = p.getZ(i) * d * (0.45 + 0.55 * k) + Math.abs(x) * 0.4 + (yy / L) ** 2 * L * 0.16;
    p.setXYZ(i, x, yy, z);
  }
  return smoothed(g);
}

/** 몽글몽글한 털방울(반지름 1): 고르게 흩은 혹 n 개를 부풀린 구. */
function fluffGeo(n = 18, amp = 0.16, sharp = 9, w = 36, h = 26) {
  const g = sphere(w, h);
  const p = g.attributes.position;
  const dirs = [];
  for (let i = 0; i < n; i++) {
    const y = 1 - ((i + 0.5) / n) * 2;
    const r = Math.sqrt(1 - y * y);
    const a = i * 2.39996;
    dirs.push(V3(Math.cos(a) * r, y, Math.sin(a) * r));
  }
  const v = V3();
  for (let i = 0; i < p.count; i++) {
    v.set(p.getX(i), p.getY(i), p.getZ(i)).normalize();
    let k = 0;
    for (const d of dirs) k = Math.max(k, Math.exp(-(1 - v.dot(d)) * sharp));
    v.multiplyScalar(1 - amp * 0.5 + amp * k);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  return smoothed(g);
}

const FRAMES = new WeakMap();
/** 곡선 위 s(0..1, 길이 비율) 자리의 비틀리지 않는 틀(T 접선, N·B 둘레). */
function frameAt(curve, s) {
  let f = FRAMES.get(curve);
  if (!f) FRAMES.set(curve, (f = curve.computeFrenetFrames(400, false)));
  const i = Math.round(Math.min(1, Math.max(0, s)) * 400);
  return { T: f.tangents[i], N: f.normals[i], B: f.binormals[i] };
}

/**
 * 굽은 고깔·관: 곡선 curve 를 따라 반지름 rad(s)(s = 길이 비율 0..1)로 감싼다. s0..s1 구간만 만들 수도 있다(띠).
 * uv = (둘레, s). 반지름이 0 인 끝은 한 점으로 모이고, 그 점의 법선은 곡선 방향.
 */
function taperGeo(curve, rad, { s0 = 0, s1 = 1, radial = 40, len = 60 } = {}) {
  const pos = [];
  const uv = [];
  const c = V3();
  const d = V3();
  for (let i = 0; i <= len; i++) {
    const s = s0 + ((s1 - s0) * i) / len;
    const { N, B } = frameAt(curve, s);
    curve.getPointAt(s, c);
    const r = rad(s);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      d.copy(N).multiplyScalar(Math.cos(a)).addScaledVector(B, Math.sin(a));
      pos.push(c.x + d.x * r, c.y + d.y * r, c.z + d.z * r);
      uv.push(j / radial, s);
    }
  }
  const idx = [];
  for (let i = 0; i < len; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j;
      const b = a + radial + 1;
      idx.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  const nr = g.attributes.normal;
  // 이음매(둘레 0 = 2π)의 법선을 맞추고, 한 점으로 모인 끝은 곡선 방향을 보게 한다
  for (let i = 0; i <= len; i++) {
    const a = i * (radial + 1);
    const e = a + radial;
    d.set(nr.getX(a) + nr.getX(e), nr.getY(a) + nr.getY(e), nr.getZ(a) + nr.getZ(e)).normalize();
    nr.setXYZ(a, d.x, d.y, d.z);
    nr.setXYZ(e, d.x, d.y, d.z);
  }
  for (const [i, s, sign] of [[0, s0, -1], [len, s1, 1]]) {
    if (rad(s) > 1e-4) continue;
    const { T } = frameAt(curve, s);
    for (let j = 0; j <= radial; j++) nr.setXYZ(i * (radial + 1) + j, T.x * sign, T.y * sign, T.z * sign);
  }
  return g;
}

/** 고깔 표면의 자리(s, 둘레 각 a, 바깥으로 lift) → { p, n }. n 은 고깔 기울기까지 따진 바깥 법선. */
function taperAt(curve, rad, s, a, lift = 0) {
  const { T, N, B } = frameAt(curve, s);
  const d = N.clone().multiplyScalar(Math.cos(a)).addScaledVector(B, Math.sin(a));
  const ds = 0.004;
  const slope = (rad(Math.min(1, s + ds)) - rad(Math.max(0, s - ds))) / (2 * ds * curve.getLength());
  const n = d.clone().addScaledVector(T, -slope).normalize();
  const p = curve.getPointAt(s).addScaledVector(d, rad(s)).addScaledVector(n, lift);
  return { p, n };
}

/** 고깔에서 정면(+z)을 보는 둘레 각. */
function frontAngle(curve, s) {
  const { N, B } = frameAt(curve, s);
  return Math.atan2(B.z, N.z);
}

/**
 * 몸통을 두르는 띠(허리띠·갑옷): 높이 y0..y1, 몸에서 th 만큼 두툼하고 위아래 가장자리가 둥글게 말린다.
 * R(y) = 띠 안쪽 반지름(몸 표면). 안쪽 면은 몸에 가려 만들지 않는다.
 */
function bandGeo(y0, y1, R, th, round = th, seg = 48) {
  const pts = [];
  const q = 6;
  for (let k = 0; k <= q; k++) {
    const a = (k / q) * (Math.PI / 2);
    pts.push([R(y0) - 0.01 + (th + 0.01) * Math.sin(a), y0 + round * (1 - Math.cos(a))]);
  }
  const n = 14;
  for (let k = 1; k < n; k++) {
    const y = y0 + round + ((y1 - y0 - 2 * round) * k) / n;
    pts.push([R(y) + th, y]);
  }
  for (let k = 0; k <= q; k++) {
    const a = (k / q) * (Math.PI / 2);
    pts.push([R(y1) - 0.01 + (th + 0.01) * Math.cos(a), y1 - round * (1 - Math.sin(a))]);
  }
  return smoothed(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg));
}

/** 점을 머리 표면에서 바깥 법선 쪽으로: 경도·위도·띄움 → 점(머리 중심 기준). */
const onHead = (lon, lat, lift = 1) => headAt(lon, lat, lift).p;

/** 손에 든 물건(손잡이 = +y, 앞면 = +z)을 손 자리에 두고 dir 쪽으로 세운다. 앞면은 늘 화면 쪽을 본다. */
function handHold(obj) {
  const face = V3();
  const side = V3();
  const basis = new THREE.Matrix4();
  return (h, dir) => {
    obj.position.copy(h.position);
    dir.normalize();
    face.copy(VIEW).addScaledVector(dir, -dir.dot(VIEW)).normalize();
    side.crossVectors(dir, face);
    obj.quaternion.setFromRotationMatrix(basis.makeBasis(side, dir, face));
  };
}

/** 왼손(보는 사람 쪽 왼편)에 든 물건의 기본 자세(요리사 국자와 같은 몸짓). */
function holdDir(mood, h, out) {
  if (mood === 'happy') out.set(-0.25 - h.rotation.z * 0.6, 1, 0.15);
  else if (mood === 'shock') out.set(-0.35, 1, 0.1);
  else if (mood === 'idle') out.set(-1, -0.45, 0.2);
  else out.set(-0.9, -0.7, 0.2);
  return out.normalize();
}

const leftHand = (hands) => hands.find((x) => x.side < 0).h;

/** 반짝이는 금(별 지팡이·장식). 피포마다 따로(빛을 깜빡이므로). */
const glowGold = () => new THREE.MeshStandardMaterial({ color: new THREE.Color('#ffc93a'), metalness: 0.45, roughness: 0.25, envMapIntensity: 1.2, emissive: new THREE.Color('#ffa21f'), emissiveIntensity: 0.55 });

// ───────── 그림(캐시) ─────────

/** 마법사 모자 천: 남보라 바탕에 금빛 작은 별과 연보라 점. 가로·세로로 이어 붙여도 이음매가 없다. */
function wizardArt() {
  const tex = faceTexture(
    'costume-wizard-cloth',
    (ctx, s) => {
      ctx.fillStyle = '#5040d8';
      ctx.fillRect(0, 0, s, s);
      const wrap = (fn) => {
        for (const dx of [-s, 0, s]) for (const dy of [-s, 0, s]) fn(dx, dy);
      };
      const spark = (x, y, R, col) => {
        ctx.fillStyle = col;
        wrap((dx, dy) => {
          ctx.beginPath();
          for (let i = 0; i < 8; i++) {
            const a = (i * Math.PI) / 4;
            const rr = i % 2 ? R * 0.32 : R;
            ctx.lineTo(x + dx + Math.cos(a) * rr, y + dy + Math.sin(a) * rr);
          }
          ctx.closePath();
          ctx.fill();
        });
      };
      for (const [x, y, R] of [[0.1, 0.2, 0.07], [0.6, 0.08, 0.05], [0.36, 0.55, 0.06], [0.82, 0.42, 0.075], [0.2, 0.86, 0.05], [0.7, 0.8, 0.06]]) spark(x * s, y * s, R * s, '#ffe27a');
      ctx.fillStyle = 'rgba(200,184,255,0.9)';
      for (const [x, y] of [[0.3, 0.1], [0.85, 0.15], [0.05, 0.5], [0.55, 0.35], [0.45, 0.92], [0.95, 0.66], [0.62, 0.6], [0.15, 0.68]]) {
        wrap((dx, dy) => {
          ctx.beginPath();
          ctx.arc(x * s + dx, y * s + dy, s * 0.014, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    },
    256,
  );
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  return tex;
}

/** 해적 셔츠: 빨강·하양 가로 줄 한 쌍(세로로 되풀이). */
function stripeArt() {
  const tex = faceTexture(
    'costume-pirate-stripe',
    (ctx, s) => {
      ctx.fillStyle = '#fff6ee';
      ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = '#ff4555';
      ctx.fillRect(0, 0, s, s / 2);
    },
    32,
  );
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** 파티 모자: 하늘색 바탕에 분홍·노랑 사선 줄무늬 + 흰 땡땡이. */
function partyArt() {
  return faceTexture(
    'costume-party-hat',
    (ctx, s) => {
      const img = ctx.createImageData(s, s);
      const cols = [[143, 220, 255], [255, 150, 204], [143, 220, 255], [255, 226, 110]];
      const N = 8;
      const K = 2.2;
      for (let y = 0; y < s; y++) {
        for (let x = 0; x < s; x++) {
          const w = ((x / s) * N + ((s - y) / s) * K) % N;
          const c = cols[Math.floor(w) % cols.length];
          const i = (y * s + x) * 4;
          img.data[i] = c[0];
          img.data[i + 1] = c[1];
          img.data[i + 2] = c[2];
          img.data[i + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
      ctx.fillStyle = '#ffffff';
      for (let k = 0; k < 18; k++) {
        const x = ((k * 0.382) % 1) * s;
        const y = (0.12 + ((k * 0.618) % 1) * 0.76) * s;
        const r = s * (0.018 + 0.012 * (1 - y / s));
        for (const dx of [-s, 0, s]) {
          ctx.beginPath();
          ctx.ellipse(x + dx, y, r * (1 + y / s), r, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    },
    256,
  );
}

/** 빨간 바탕에 흰 땡땡이(나비넥타이). */
function dotsArt() {
  const tex = faceTexture(
    'costume-party-dots',
    (ctx, s) => {
      ctx.fillStyle = '#ff3d55';
      ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = '#ffffff';
      for (const [x, y] of [[0.25, 0.25], [0.75, 0.75], [0.75, 0.25], [0.25, 0.75]].slice(0, 2)) {
        for (const dx of [-s, 0, s]) {
          for (const dy of [-s, 0, s]) {
            ctx.beginPath();
            ctx.arc(x * s + dx, y * s + dy, s * 0.13, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    },
    64,
  );
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// ───────── 꼬마 마법사 ─────────
// 끝이 접혀 늘어진 높은 남보라 고깔모자(넓고 말랑한 챙, 금빛 띠, 금빛 초승달과 별) + 끝에서 반짝이는 별 지팡이.
// 모자는 살짝 뒤·왼쪽으로 젖혀 쓰고, 더듬이는 고깔 앞 오른쪽을 뚫고 나온다.
registerOutfit('wizard', () => {
  const hatM = compose([0, 0.5, -0.06], [-0.2, 0, 0.08]);
  // 고깔 줄기: 챙에서 곧게 솟다가 꼭대기에서 왼쪽 뒤로 꺾여 축 늘어진다
  const curve = new THREE.CatmullRomCurve3([V3(0, -0.3, 0), V3(0, 0.2, 0), V3(-0.01, 0.74, -0.05), V3(-0.06, 1.15, -0.13), V3(-0.2, 1.42, -0.2), V3(-0.42, 1.5, -0.24), V3(-0.62, 1.38, -0.24), V3(-0.72, 1.2, -0.22)]);
  const L = curve.getLength();
  const R0 = 0.82;
  const D0 = 0.32; // 챙 높이(곡선 시작에서의 길이)
  const rad = (s) => {
    const d = s * L;
    if (d <= D0) return R0;
    const u = (d - D0) / (L - D0);
    return R0 * Math.pow(1 - u, 1.2) * (1 + 0.06 * Math.sin(Math.PI * u));
  };
  const sOf = (d) => d / L;
  const cloth = mat('#ffffff', { rough: 0.55, map: wizardArt(), emissive: '#2a1a9a', emissiveIntensity: 0.35 });
  const brimMat = mat('#5040d8', { rough: 0.55, emissive: '#2a1a9a', emissiveIntensity: 0.35 });
  const gold = GOLD_MAT();
  const cone = part(og('wizard-cone', () => taperGeo(curve, rad, { radial: 44, len: 80 }).applyMatrix4(hatM)), cloth, 0.03);
  const brim = part(
    og('wizard-brim', () => {
      const rIn = 0.6;
      const rOut = 1.36;
      const th = 0.05;
      const pts = [];
      const q = 6;
      // 단면: 아래 면(안 → 밖) → 바깥 끝 둥글게 → 위 면(밖 → 안) → 안쪽 끝 둥글게
      for (let k = 0; k <= 10; k++) pts.push([rIn + ((rOut - rIn) * k) / 10, -th]);
      for (let k = 1; k < q; k++) {
        const a = -Math.PI / 2 + (k / q) * Math.PI;
        pts.push([rOut + th * Math.cos(a), th * Math.sin(a)]);
      }
      for (let k = 10; k >= 0; k--) pts.push([rIn + ((rOut - rIn) * k) / 10, th]);
      const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 72);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i);
        const z = p.getZ(i);
        const r = Math.hypot(x, z);
        const phi = Math.atan2(x, z);
        const k = Math.min(1, Math.max(0, (r - 0.9) / (rOut - 0.9)));
        // 바깥으로 갈수록 말랑하게 처지고(뒤가 더), 살짝 물결친다
        const droop = k * k * (0.08 + 0.12 * (1 - Math.cos(phi)) * 0.5 + 0.04 * Math.sin(phi * 4 + 0.6));
        p.setXYZ(i, x * 1.05, p.getY(i) - droop, z);
      }
      return smoothed(g).applyMatrix4(hatM);
    }),
    brimMat,
    0.03,
  );
  // 챙 바로 위 금빛 띠: 고깔에서 둥글게 솟는 납작한 띠
  const bm = sOf(D0 + 0.13);
  const bh = sOf(0.09);
  const bandRad = (s) => {
    const q = Math.min(1, Math.abs((s - bm) / bh));
    return rad(s) - 0.012 + 0.062 * Math.pow(1 - q ** 4, 0.4);
  };
  // 금붙이 한 덩어리: 띠 + 고깔 앞의 초승달과 별 + 끝의 금구슬
  const goldParts = part(
    og('wizard-gold', () => {
      const parts = [taperGeo(curve, bandRad, { s0: bm - bh, s1: bm + bh, radial: 44, len: 12 })];
      const front = frontAngle(curve, sOf(D0 + 0.4));
      const moon = new THREE.Shape();
      {
        const R = 0.17;
        const r = 0.14;
        const off = 0.09;
        const xs = (R * R - r * r + off * off) / (2 * off);
        const ys = Math.sqrt(R * R - xs * xs);
        const a0 = Math.atan2(ys, xs);
        const b0 = Math.atan2(ys, xs - off);
        moon.moveTo(xs, ys);
        moon.absarc(0, 0, R, a0, Math.PI * 2 - a0, false);
        moon.absarc(off, 0, r, Math.PI * 2 - b0, b0, true);
      }
      const at = taperAt(curve, rad, sOf(D0 + 0.42), front - 0.42, -0.012);
      parts.push(finishSlab(slabGeo(moon, { depth: 0.03, bevel: 0.024, seg: 3 }).applyMatrix4(surfaceMatrix(at.p, at.n, compose([0, 0, 0], [0, 0, 0.55])))));
      // 또렷한 금별 둘(작아도 별로 읽히게 뾰족한 판)
      for (const [d, da, R] of [[D0 + 0.66, 0.42, 0.13], [D0 + 0.3, -1.05, 0.11]]) {
        const s = taperAt(curve, rad, sOf(d), front + da, -0.01);
        parts.push(finishSlab(slabGeo(starShape(R, R * 0.47), { depth: 0.022, bevel: 0.02, seg: 2 }).applyMatrix4(surfaceMatrix(s.p, s.n, compose([0, 0, 0], [0, 0, da * 0.3])))));
      }
      parts.push(baked(sphere(14, 10), compose(curve.getPointAt(1).toArray(), [0, 0, 0], [0.075, 0.075, 0.075])));
      for (const g of parts) g.deleteAttribute('uv');
      return mergeGeometries(parts).applyMatrix4(hatM);
    }),
    gold,
    0.021,
  );

  // 별 지팡이: 갈색 막대 끝에 통통한 금별 + 은은한 빛 + 깜빡이는 반짝이
  const wand = new THREE.Group();
  const starMat = glowGold();
  wand.add(
    part(og('wizard-stick', () => segGeo(V3(0, -0.12, 0), V3(0, 0.44, 0), 0.034)), mat('#8a4b2c', { rough: 0.5, emissive: '#4a1e0c', emissiveIntensity: 0.3 }), 0.02),
    part(og('wizard-collar', () => baked(sphere(12, 10), compose([0, 0.46, 0], [0, 0, 0], [0.055, 0.045, 0.055]))), GOLD_MAT(), 0.018),
    part(og('wizard-star', () => baked(pillowGeo(starRho(0.2, 0.1, 1.5), { depth: 0.075 }), compose([0, 0.64, 0]))), starMat, 0.022),
  );
  const glow = glowSprite('#ffe27a', 0.85, 0.5);
  glow.position.set(0, 0.64, 0.06);
  wand.add(glow);
  const sparks = [[0.27, 0.86, 0.06, 0.075, 0], [-0.25, 0.8, 0.05, 0.055, 2.1], [0.2, 0.42, 0.06, 0.05, 4.2]].map(([x, y, z, k, ph]) => {
    const m = part(og('wizard-spark', () => pillowGeo(starRho(1, 0.22, 2.4, 4), { depth: 0.15 })), glintBasic());
    m.position.set(x, y, z);
    m.userData = { k, ph };
    wand.add(m);
    return m;
  });
  const hold = handHold(wand);
  const dir = V3();
  return {
    head: [cone, brim, goldParts],
    root: [wand],
    hide: ['goggles'],
    update({ t, mood, hands }) {
      const h = leftHand(hands);
      holdDir(mood, h, dir);
      if (mood === 'idle') dir.set(-1, 0.42, 0.2);
      if (mood === 'happy') dir.x += Math.sin(t * 11) * 0.25; // 신나게 휘휘
      hold(h, dir);
      const tw = mood === 'happy' ? 1 : mood === 'hide' ? 0.35 : 0.75;
      starMat.emissiveIntensity = (0.45 + 0.2 * Math.sin(t * 3.1)) * (0.6 + 0.4 * tw);
      glow.material.opacity = (0.32 + 0.18 * Math.sin(t * 3.1)) * tw;
      for (const m of sparks) {
        const { k, ph } = m.userData;
        const v = Math.max(0, Math.sin(t * (mood === 'happy' ? 6 : 3.4) + ph));
        m.scale.setScalar(k * v * tw + 1e-4);
        m.rotation.z = t * 0.8 + ph;
      }
    },
  };
});

// ───────── 우주 해적 선장 ─────────
// 머리를 가로질러 쓴 까만 이각 모자(금빛 테, 앞에 흰 해골과 뼈다귀) + 빨강·하양 줄무늬 셔츠 + 금 버클 빨간 허리띠 + 놋쇠 망원경.
registerOutfit('pirate', () => {
  const black = mat('#2c2744', { rough: 0.42, emissive: '#1b1436', emissiveIntensity: 0.4, envIntensity: 0.9 });
  const white = mat('#fffaf0', { rough: 0.4, emissive: '#fff0dc', emissiveIntensity: 0.25 });
  const gold = GOLD_MAT();
  const axis = V3(0, Math.cos(0.22), -Math.sin(0.22));
  const crown = part(og('pirate-crown', () => shellGeo(axis, 1.1, 1.07, 0.96)), black, 0.03);
  // 앞·뒤 날개: 반달 판을 머리 앞뒤에 세워(위로 갈수록 머리 쪽으로 기댄다) 양 끝 뿔에서 맞붙인다.
  // 위에서 본 모양은 렌즈(가운데가 볼록, 양 끝이 뾰족)라 뿔이 머리 옆으로 삐죽 나온다.
  const W = 1.4;
  const TIP = 0.26; // 뿔 끝 높이(살짝 들린다)
  const FLAP = {
    front: { H: 0.8, R0: 0.84, y0: 0.55, sz: 1 },
    back: { H: 0.9, R0: 0.84, y0: 0.44, sz: -1 },
  };
  const LEAN = 0.42;
  const WZ = W * 1.006;
  const DEPTH = 0.035;
  const BEV = 0.035;
  const topCurve = (H) => {
    const p = new THREE.CurvePath();
    p.add(new THREE.CubicBezierCurve(new THREE.Vector2(-W, TIP), new THREE.Vector2(-W * 0.82, TIP + 0.3), new THREE.Vector2(-W * 0.48, H), new THREE.Vector2(0, H)));
    p.add(new THREE.CubicBezierCurve(new THREE.Vector2(0, H), new THREE.Vector2(W * 0.48, H), new THREE.Vector2(W * 0.82, TIP + 0.3), new THREE.Vector2(W, TIP)));
    return p;
  };
  // 위에서 본 렌즈의 앞뒤 두께(가운데 1 → 끝 0)와 그 기울기
  const lens = (x) => Math.pow(Math.max(1e-4, 1 - Math.pow(Math.min(1, Math.abs(x) / WZ), 2.4)), 0.55);
  // 판 위의 점(x, y, 바깥으로 z) → 머리 공간. 뒤 날개는 앞 날개를 y 축으로 반 바퀴 돌린 것
  const flapPoint = (f, x, y, z) => {
    const B = f.R0 - y * LEAN;
    const e = 1e-3;
    const slope = (B * (lens(x + e) - lens(x - e))) / (2 * e);
    const n = V3(-slope, 0, 1).normalize();
    const v = V3(x, f.y0 + y, B * lens(x)).addScaledVector(n, z);
    if (f.sz < 0) v.set(-v.x, v.y, -v.z);
    return v;
  };
  const flapGeo = (f) => {
    const s = new THREE.Shape();
    const top = topCurve(f.H);
    s.moveTo(-W, TIP);
    for (const c of top.curves) s.bezierCurveTo(c.v1.x, c.v1.y, c.v2.x, c.v2.y, c.v3.x, c.v3.y);
    s.bezierCurveTo(W * 0.82, TIP - 0.16, W * 0.45, -0.02, 0, -0.02);
    s.bezierCurveTo(-W * 0.45, -0.02, -W * 0.82, TIP - 0.16, -W, TIP);
    const g = slabGeo(s, { depth: DEPTH, bevel: BEV, seg: 3, tess: 0.07 });
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const v = flapPoint(f, p.getX(i), p.getY(i), p.getZ(i));
      p.setXYZ(i, v.x, v.y, v.z);
    }
    return finishSlab(g);
  };
  const flaps = part(og('pirate-flaps', () => mergeGeometries([flapGeo(FLAP.front), flapGeo(FLAP.back)])), black, 0.03);
  // 금빛 테: 날개 위 가장자리를 따라 두르는 관(양 끝은 가늘어져 뿔 끝에서 사라진다)
  const trim = part(
    og('pirate-trim', () =>
      mergeGeometries(
        [FLAP.front, FLAP.back].map((f) => {
          const top = topCurve(f.H);
          const pts = [];
          for (let k = 0; k <= 40; k++) {
            const u = 0.015 + (k / 40) * 0.97;
            const q = top.getPointAt(u);
            const tg = top.getTangentAt(u);
            pts.push(flapPoint(f, q.x - tg.y * 0.03, q.y + tg.x * 0.03, DEPTH / 2 + BEV));
          }
          const c = new THREE.CatmullRomCurve3(pts);
          return taperGeo(c, (s) => 0.052 * Math.pow(Math.min(1, s / 0.07, (1 - s) / 0.07), 0.5), { radial: 12, len: 90 });
        }),
      ),
    ),
    gold,
    0.022,
  );
  // 앞 날개 가운데: 동글동글 웃는 해골 + 엇갈린 뼈다귀
  const emblemM = (() => {
    const y = 0.38;
    const p = flapPoint(FLAP.front, 0, y, DEPTH + 2 * BEV);
    return surfaceMatrix(p, V3(0, LEAN, 1).normalize(), compose([0, 0, -0.008], [0, 0, 0], [1.08, 1.08, 1.08]));
  })();
  const emblem = part(
    og('pirate-emblem', () => {
      const s = new THREE.Shape();
      const cy = 0.035;
      const R = 0.13;
      const jw = 0.078;
      const ys = cy - Math.sqrt(R * R - jw * jw);
      s.moveTo(-jw, ys);
      s.absarc(0, cy, R, Math.atan2(ys - cy, -jw), Math.atan2(ys - cy, jw), true);
      s.lineTo(jw, -0.12);
      s.quadraticCurveTo(jw, -0.15, jw - 0.03, -0.15);
      s.lineTo(-jw + 0.03, -0.15);
      s.quadraticCurveTo(-jw, -0.15, -jw, -0.12);
      s.closePath();
      for (const x of [-0.052, 0.052]) s.holes.push(new THREE.Path().absarc(x, 0.012, 0.042, 0, Math.PI * 2, true));
      const nose = new THREE.Path();
      nose.moveTo(0, -0.045);
      nose.lineTo(0.02, -0.075);
      nose.lineTo(-0.02, -0.075);
      nose.closePath();
      s.holes.push(nose);
      const g = slabGeo(s, { depth: 0.03, bevel: 0.014, seg: 2, curve: 16 });
      g.translate(0, 0, 0.025);
      const parts = [finishSlab(g)];
      for (const s of [-1, 1]) {
        const a = V3(-0.2 * s, -0.19, 0.012);
        const b = V3(0.2 * s, 0.07, 0.012);
        parts.push(segGeo(a, b, 0.028));
        const d = b.clone().sub(a).normalize();
        const n = V3(-d.y, d.x, 0);
        for (const e of [a, b]) for (const k of [-1, 1]) parts.push(baked(sphere(10, 8), compose(e.clone().addScaledVector(n, k * 0.028).toArray(), [0, 0, 0], [0.036, 0.036, 0.03])));
      }
      return mergeGeometries(parts.map((g, i) => (i ? smoothed(g) : g))).applyMatrix4(emblemM);
    }),
    white,
    0.016,
  );
  // 줄무늬 셔츠: 몸을 감싸는 옷(줄이 높이에 고르게 놓이도록 uv 를 높이로)
  const shirtR = (y) => bodyR(y) * 1.07 + 0.03;
  const shirt = part(
    og('pirate-shirt', () => {
      const g = new THREE.LatheGeometry(BODY_CURVE.getPoints(40).map((v) => new THREE.Vector2(v.x * 1.07 + 0.03, v.y)), 44);
      const p = g.attributes.position;
      const uv = g.attributes.uv;
      for (let i = 0; i < p.count; i++) uv.setY(i, (p.getY(i) + 1.2) / 0.17);
      return g;
    }),
    mat('#ffffff', { rough: 0.5, map: stripeArt(), emissive: '#5a1a2a', emissiveIntensity: 0.12 }),
    0.035,
  );
  const collar = part(og('pirate-collar', () => smoothed(new THREE.TorusGeometry(0.45, 0.1, 10, 36).rotateX(Math.PI / 2).translate(0, 0.05, 0))), mat('#ff4555', { rough: 0.45, emissive: '#a0101e', emissiveIntensity: 0.25 }), 0.03);
  const sashMat = mat('#c41a34', { rough: 0.5, emissive: '#6a0614', emissiveIntensity: 0.3 });
  // 허리띠 + 왼쪽 옆구리의 매듭과 늘어진 두 자락
  const knotA = -0.95;
  const sash = part(
    og('pirate-sash', () => {
      const R = shirtR(-0.36) + 0.07;
      const c = V3(Math.sin(knotA) * R, -0.36, Math.cos(knotA) * R);
      const out = V3(Math.sin(knotA), 0, Math.cos(knotA));
      return mergeGeometries([
        bandGeo(-0.47, -0.25, shirtR, 0.05, 0.04),
        smoothed(baked(sphere(14, 10), compose(c.toArray(), [0, 0, 0], [0.085, 0.075, 0.075]))),
        smoothed(segGeo(c.clone().addScaledVector(out, 0.02), c.clone().add(V3(-0.07, -0.22, 0)).addScaledVector(out, 0.06), 0.045)),
        smoothed(segGeo(c.clone().addScaledVector(out, 0.03), c.clone().add(V3(0.05, -0.25, 0.05)).addScaledVector(out, 0.07), 0.042)),
      ]);
    }),
    sashMat,
    0.024,
  );
  const buckle = part(
    og('pirate-buckle', () => {
      const s = new THREE.Shape();
      const w = 0.12;
      const h = 0.1;
      const r = 0.035;
      s.moveTo(-w + r, -h);
      s.lineTo(w - r, -h);
      s.quadraticCurveTo(w, -h, w, -h + r);
      s.lineTo(w, h - r);
      s.quadraticCurveTo(w, h, w - r, h);
      s.lineTo(-w + r, h);
      s.quadraticCurveTo(-w, h, -w, h - r);
      s.lineTo(-w, -h + r);
      s.quadraticCurveTo(-w, -h, -w + r, -h);
      const hole = new THREE.Path();
      hole.moveTo(-0.055, -0.04);
      hole.lineTo(0.055, -0.04);
      hole.lineTo(0.055, 0.04);
      hole.lineTo(-0.055, 0.04);
      hole.closePath();
      s.holes.push(hole);
      const g = slabGeo(s, { depth: 0.025, bevel: 0.02, seg: 2 });
      return finishSlab(g.applyMatrix4(chestMatrix(0, -0.36, bodyR(-0.36) * 0.07 + 0.03 + 0.045)));
    }),
    gold,
    0.018,
  );
  // 놋쇠 망원경: 손에서 멀어질수록 굵어지는 세 마디 + 마디마다 테 + 끝에 푸른 렌즈
  const scope = new THREE.Group();
  scope.add(
    part(
      og('pirate-scope', () =>
        mergeGeometries(
          [
            segGeo(V3(0, -0.14, 0), V3(0, 0.06, 0), 0.045),
            segGeo(V3(0, 0.06, 0), V3(0, 0.26, 0), 0.056),
            segGeo(V3(0, 0.26, 0), V3(0, 0.5, 0), 0.07),
            ...[0.06, 0.26, 0.5].map((y, i) => smoothed(new THREE.TorusGeometry([0.05, 0.062, 0.074][i], 0.022, 8, 24).rotateX(Math.PI / 2).translate(0, y, 0))),
          ].map((g) => smoothed(g)),
        ),
      ),
      gold,
      0.02,
    ),
    part(og('pirate-lens', () => baked(sphere(16, 10), compose([0, 0.555, 0], [0, 0, 0], [0.058, 0.02, 0.058]))), mat('#8ff6ff', { rough: 0.08, metal: 0.2, emissive: '#3fd8ff', emissiveIntensity: 0.4, envIntensity: 1.6 })),
  );
  const hold = handHold(scope);
  const dir = V3();
  return {
    head: [crown, flaps, trim, emblem],
    body: [shirt, collar, sash, buckle],
    root: [scope],
    hide: ['goggles', 'scarf'],
    update({ mood, hands }) {
      const h = leftHand(hands);
      hold(h, holdDir(mood, h, dir));
    },
  };
});

// ───────── 꼬마 기사 ─────────
// 얼굴이 열린 반짝이는 은 투구(볼가리개, 가운데 볏, 금 리벳, 왼쪽 정수리에서 솟아 뒤로 말리는 몽실한 빨간 깃털)
// + 은 가슴받이와 금별 방패 + 짧은 파란 망토. 깃털은 더듬이(가운데)와 겹치지 않게 왼쪽에 꽂는다.
/** 기사 투구의 은빛: 위는 하얗게 빛나고 눈높이 아래로 어두운 띠가 지나는 만화 같은 금속 그라데이션(세로 = 높이). */
function chromeArt() {
  return faceTexture(
    'costume-knight-chrome',
    (ctx, s) => {
      const g = ctx.createLinearGradient(0, 0, 0, s);
      // 세로 = 높이(맨 위 = 정수리, 가운데 = 머리 중심). 정수리 둘레에 하얀 빛 띠, 관자놀이 높이에 어두운 띠
      g.addColorStop(0, '#dfe3ec');
      g.addColorStop(0.045, '#ffffff');
      g.addColorStop(0.085, '#ffffff');
      g.addColorStop(0.13, '#d3d8e3');
      g.addColorStop(0.22, '#a3aabf');
      g.addColorStop(0.3, '#7c839d');
      g.addColorStop(0.42, '#a7adc0');
      g.addColorStop(0.7, '#c8cdd9');
      g.addColorStop(1, '#d4d8e2');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
    },
    64,
  );
}

registerOutfit('knight', () => {
  const axis = V3(0, Math.cos(0.12), -Math.sin(0.12));
  // 앞은 이마 위에서 둥근 아치로 멈추고, 얼굴 양옆은 볼가리개가 턱 높이까지, 뒤는 목가리개(φ = 0 정면)
  const A = (phi) => {
    const f = Math.abs(phi);
    return 0.8 + 0.1 * Math.min(1, (f / 0.62) ** 2) + 1.35 * THREE.MathUtils.smoothstep(f, 0.6, 1.25) - 0.25 * THREE.MathUtils.smoothstep(f, 1.9, 2.8);
  };
  // 하늘빛 환경을 비추면 푸른 유리처럼 보이므로 금속감은 약하게: 높이를 따르는 은빛 그라데이션 + 스스로 내는 회색 빛
  const silver = mat('#ffffff', { metal: 0.2, rough: 0.2, envIntensity: 0.45, map: chromeArt(), emissive: '#555a6c', emissiveIntensity: 0.3 });
  const plain = mat('#cfd3de', { metal: 0.2, rough: 0.22, envIntensity: 0.45, emissive: '#555a6c', emissiveIntensity: 0.3 });
  const steel = mat('#9aa1b8', { metal: 0.2, rough: 0.26, envIntensity: 0.45, emissive: '#3c4260', emissiveIntensity: 0.32 });
  const gold = GOLD_MAT();
  const helmet = part(
    og('knight-helmet', () => {
      const g = shellGeo(axis, A, 1.1, 0.96, 80);
      // 금속 그라데이션이 높이를 따르게 uv 를 높이로
      const p = g.attributes.position;
      const uv = g.attributes.uv;
      for (let i = 0; i < p.count; i++) uv.setXY(i, 0.5, 0.5 + p.getY(i) / 2.1);
      return g;
    }),
    silver,
    0.035,
  );
  const rim = part(og('knight-rim', () => edgeGeo(axis, A, 1.085, 0.08)), steel, 0.026);
  const q = rotTo(YV, axis);
  const shellPoint = (al, phi, lift) => {
    const d = V3(Math.sin(al) * Math.sin(phi), Math.cos(al), Math.sin(al) * Math.cos(phi)).applyQuaternion(q);
    const p = d.multiply(HS).multiplyScalar(lift);
    return { p, n: V3(p.x / HS.x ** 2, p.y / HS.y ** 2, p.z / HS.z ** 2).normalize() };
  };
  // 가운데 등줄기(이마에서 정수리 너머로 솟은 볏)
  const comb = part(
    og('knight-comb', () => {
      const pts = [];
      for (let k = 0; k <= 16; k++) {
        const g = -0.62 + (k / 16) * 2.3;
        pts.push(V3(0, Math.cos(g), -Math.sin(g)).multiply(HS).multiplyScalar(1.1));
      }
      const c = new THREE.CatmullRomCurve3(pts);
      return smoothed(taperGeo(c, (s) => 0.06 * Math.pow(Math.min(1, s / 0.04, (1 - s) / 0.04), 0.5), { radial: 10, len: 60 }));
    }),
    steel,
    0.022,
  );
  // 깃털 장식: 왼쪽 정수리의 금 꽂이에서 몽실몽실 솟아 뒤로 말려 늘어진다(가운데 더듬이와 겹치지 않게)
  const base = headAt(-0.52, 0.98, 1.1);
  const plume = new THREE.Group();
  plume.position.copy(base.p);
  const plumeMat = mat('#ff3d55', { rough: 0.7, emissive: '#b0102a', emissiveIntensity: 0.32 });
  // [x, y, z, 반지름] (꽂이 기준)
  const BLOBS = [[-0.04, 0.13, 0.02, 0.14], [-0.12, 0.32, -0.02, 0.18], [-0.22, 0.49, -0.1, 0.21], [-0.34, 0.6, -0.23, 0.23], [-0.47, 0.6, -0.38, 0.22], [-0.56, 0.51, -0.52, 0.2], [-0.6, 0.38, -0.62, 0.17], [-0.61, 0.24, -0.68, 0.14]];
  plume.add(
    part(
      og('knight-plume', () =>
        mergeGeometries(
          BLOBS.map(([x, y, z, r], i) => {
            const prev = BLOBS[Math.max(0, i - 1)];
            const next = BLOBS[Math.min(BLOBS.length - 1, i + 1)];
            const dir = V3(next[0] - prev[0], next[1] - prev[1], next[2] - prev[2]).normalize();
            const m = new THREE.Matrix4().compose(V3(x, y, z), rotTo(V3(0, 0, 1), dir).multiply(new THREE.Quaternion().setFromAxisAngle(V3(0, 0, 1), i * 1.3)), V3(r, r * 0.95, r * 1.1));
            return baked(fluffGeo(10, 0.2, 7, 24, 18), m);
          }),
        ),
      ),
      plumeMat,
      0.024,
    ),
  );
  // 금붙이: 깃털 꽂이(금 구슬) + 리벳(볏 양옆 이마 위에 둘, 볼가리개마다 둘). 리벳 자리 = [꼭대기에서 잰 각, 둘레 각 φ]
  const studs = part(
    og('knight-studs', () => {
      const spots = [[A(-0.22) - 0.17, -0.22], [A(0.22) - 0.17, 0.22]];
      for (const sd of [-1, 1]) spots.push([1.5, sd * 1.3], [1.95, sd * 1.3]);
      return mergeGeometries([
        baked(sphere(14, 10), surfaceMatrix(base.p, base.n, compose([0, 0, 0.01], [0, 0, 0], [0.095, 0.095, 0.075]))),
        ...spots.map(([al, phi]) => {
          const { p, n } = shellPoint(al, phi, 1.1);
          return baked(sphere(12, 8), surfaceMatrix(p, n, compose([0, 0, 0], [0, 0, 0], [0.062, 0.062, 0.04])));
        }),
      ]);
    }),
    gold,
    0.019,
  );
  // 은 가슴받이(몸통을 두르는 갑옷) + 목 고리
  const cuirR = (y) => bodyR(y) * 1.04 + 0.02;
  const cuirass = part(og('knight-cuirass', () => bandGeo(-0.64, 0.06, cuirR, 0.05, 0.05)), plain, 0.03);
  const gorget = part(og('knight-gorget', () => smoothed(new THREE.TorusGeometry(0.45, 0.11, 10, 36).rotateX(Math.PI / 2).translate(0, 0.06, 0))), steel, 0.03);
  // 방패 문장: 금 테 방패 + 파란 바탕 + 금별
  const shieldShape = (k) => {
    const s = new THREE.Shape();
    s.moveTo(-0.15 * k, 0.12 * k);
    s.quadraticCurveTo(0, 0.17 * k, 0.15 * k, 0.12 * k);
    s.lineTo(0.15 * k, 0.02 * k);
    s.quadraticCurveTo(0.14 * k, -0.12 * k, 0, -0.2 * k);
    s.quadraticCurveTo(-0.14 * k, -0.12 * k, -0.15 * k, 0.02 * k);
    s.closePath();
    return s;
  };
  const EY = -0.3;
  const shieldAt = (k, lift, depth) => {
    const g = slabGeo(shieldShape(k), { depth, bevel: 0.02, seg: 2, tess: 0.04 });
    g.translate(0, EY, 0);
    return finishSlab(wrapBody(g, { ref: cuirR(EY) + 0.05, lift, radius: cuirR }));
  };
  const shield = part(og('knight-shield', () => mergeGeometries([shieldAt(1, 0.05, 0.02), baked(pillowGeo(starRho(0.085, 0.04, 1.4), { depth: 0.028, back: 0.01 }), chestMatrix(0, EY, cuirR(EY) - bodyR(EY) + 0.13))])), gold, 0.018);
  const field = part(og('knight-field', () => shieldAt(0.78, 0.08, 0.012)), mat('#3b5bff', { rough: 0.3, emissive: '#1a2aa0', emissiveIntensity: 0.3, envIntensity: 1.2 }));
  // 짧은 파란 망토(등 뒤, 진한 파랑 테)
  const capeR = (y) => (y > -0.5 ? cuirR(y) + 0.06 : cuirR(-0.5) + 0.06 + (-0.5 - y) * 0.35);
  const cape = new THREE.Group();
  cape.position.y = 0.06;
  const capeMesh = part(
    og('knight-cape', () => {
      const Wc = 0.92;
      const s = new THREE.Shape();
      s.moveTo(-Wc, 0.06);
      s.quadraticCurveTo(0, 0.12, Wc, 0.06);
      s.lineTo(Wc + 0.05, -0.6);
      s.quadraticCurveTo(Wc * 0.5, -0.74, 0, -0.66);
      s.quadraticCurveTo(-Wc * 0.5, -0.74, -Wc - 0.05, -0.6);
      s.closePath();
      const g = slabGeo(s, { depth: 0.015, bevel: 0.03, seg: 3, tess: 0.1 });
      g.translate(0, -0.06, 0);
      return finishSlab(wrapBody(g, { a0: Math.PI, ref: 0.5, lift: 0.0, radius: capeR }));
    }),
    [mat('#3554e8', { rough: 0.55, emissive: '#16238a', emissiveIntensity: 0.35 }), mat('#2638b8', { rough: 0.55, emissive: '#101a70', emissiveIntensity: 0.35 })],
    0.025,
  );
  capeMesh.position.y = -0.06;
  cape.add(capeMesh);
  return {
    head: [helmet, rim, comb, plume, studs],
    body: [cape, cuirass, gorget, shield, field],
    hide: ['goggles', 'scarf'],
    update({ t, mood, spring }) {
      const k = mood === 'happy' ? 2.2 : mood === 'shock' ? 3 : 1;
      // 깃털은 꽂이를 축으로 더듬이처럼 통통 흔들린다
      plume.rotation.set(Math.sin(t * 2.3) * 0.04 * k, 0, spring * 0.2 + Math.sin(t * 1.7) * 0.03);
      cape.rotation.set(0.03 + Math.abs(Math.sin(t * 2.1)) * 0.035 * k, Math.sin(t * 1.3) * 0.05 * k, 0);
    },
  };
});

// ───────── 꽃 화관 ─────────
// 이마·관자놀이 높이로 머리를 두르는 통통한 다섯 잎 꽃 여덟 송이(분홍·노랑·하양·라벤더, 노란 꽃술)와 작은 잎,
// 왼쪽 관자놀이에 꽂은 큰 꽃 한 송이 + 목에 두른 초록 잎 깃.
registerOutfit('flower', () => {
  const axis = V3(0, Math.cos(0.32), -Math.sin(0.32));
  const alpha = (phi) => 1.0 + 0.2 * plateau(phi, Math.PI / 2, 0.25, 0.7);
  const q = rotTo(YV, axis);
  const ringAt = (phi, lift) => {
    const al = alpha(phi);
    const d = V3(Math.sin(al) * Math.sin(phi), Math.cos(al), Math.sin(al) * Math.cos(phi)).applyQuaternion(q);
    const p = d.multiply(HS).multiplyScalar(lift);
    return { p, n: V3(p.x / HS.x ** 2, p.y / HS.y ** 2, p.z / HS.z ** 2).normalize() };
  };
  const COLS = {
    pink: mat('#ff6fae', { rough: 0.45, emissive: '#c0306a', emissiveIntensity: 0.25 }),
    yellow: mat('#ffe066', { rough: 0.45, emissive: '#c08a00', emissiveIntensity: 0.22 }),
    white: mat('#ffffff', { rough: 0.45, emissive: '#fff0f6', emissiveIntensity: 0.22 }),
    lilac: mat('#b89cff', { rough: 0.45, emissive: '#5a3ac0', emissiveIntensity: 0.25 }),
  };
  const centerMat = mat('#ffc53a', { rough: 0.4, emissive: '#c07000', emissiveIntensity: 0.3 });
  const orangeMat = mat('#ff9a3c', { rough: 0.4, emissive: '#c04a00', emissiveIntensity: 0.3 });
  const leafMat = mat('#5ed36e', { rough: 0.45, emissive: '#1f7a32', emissiveIntensity: 0.25 });
  const vineMat = mat('#3fae58', { rough: 0.5, emissive: '#1a6a2a', emissiveIntensity: 0.25 });
  // [둘레 각 φ(0 = 정면, + = 보는 사람의 오른쪽), 색, 크기]
  const RING = [[0, 'pink', 0.24], [0.68, 'white', 0.225], [-0.64, 'yellow', 0.225], [1.36, 'lilac', 0.215], [2.02, 'yellow', 0.2], [2.68, 'pink', 0.2], [-2.68, 'white', 0.2], [-2.02, 'lilac', 0.2]];
  const BIG = { lon: -1.2, lat: 0.18, col: 'pink', size: 0.34 };
  const flowerFrame = ([phi, , size], i) => {
    const { p, n } = ringAt(phi, 1.06);
    // 옆 꽃도 화면에서 보이게 얼굴을 조금 앞으로 돌린다
    const face = Math.abs(phi) < 2 ? n.clone().lerp(VIEW, 0.3).normalize() : n;
    return surfaceMatrix(p, face, compose([0, 0, 0], [0, 0, i * 0.9], [size, size, size]));
  };
  const bigFrame = () => {
    const { p, n } = headAt(BIG.lon, BIG.lat, 1.05);
    return surfaceMatrix(p, n.clone().lerp(VIEW, 0.35).normalize(), compose([0, 0, 0], [0, 0, 0.3], [BIG.size, BIG.size, BIG.size]));
  };
  const petals = () => pillowGeo(flowerRho(1, 0.5), { depth: 0.24, back: 0.14, cup: 0.22, rings: 5, segs: 60 });
  const dome = () => baked(sphere(16, 10), compose([0, 0, 0.26], [0, 0, 0], [0.34, 0.34, 0.2]));
  const parts = [];
  for (const col of Object.keys(COLS)) {
    const geo = og(`flower-${col}`, () => {
      const list = RING.map((f, i) => [f, i]).filter(([f]) => f[1] === col).map(([f, i]) => baked(petals(), flowerFrame(f, i)));
      if (col === BIG.col) list.push(baked(petals(), bigFrame()));
      return mergeGeometries(list);
    });
    parts.push(part(geo, COLS[col], 0.022));
  }
  parts.push(
    part(og('flower-centers', () => mergeGeometries([...RING.map((f, i) => [f, i]).filter(([f]) => f[1] !== 'yellow').map(([f, i]) => baked(dome(), flowerFrame(f, i))), baked(dome(), bigFrame())])), centerMat, 0.016),
    part(og('flower-centers2', () => mergeGeometries(RING.map((f, i) => [f, i]).filter(([f]) => f[1] === 'yellow').map(([f, i]) => baked(dome(), flowerFrame(f, i))))), orangeMat, 0.016),
  );
  // 꽃 사이 잎(화관을 따라 양쪽으로) + 덩굴 테
  const leaves = part(
    og('flower-leaves', () => {
      const list = [];
      const leafAt = (p, n, t, w, L) => {
        const y = t.clone().addScaledVector(n, -t.dot(n)).normalize();
        const x = V3().crossVectors(y, n);
        const m = new THREE.Matrix4().makeBasis(x, y, n).setPosition(p);
        list.push(leafGeo(w, L, 0.03).applyMatrix4(m));
      };
      const sorted = RING.map((f) => f[0]).sort((a, b) => a - b);
      for (let i = 0; i < sorted.length; i++) {
        const a = sorted[i];
        const b = i + 1 < sorted.length ? sorted[i + 1] : sorted[0] + Math.PI * 2;
        const mid = (a + b) / 2;
        const { p, n } = ringAt(mid, 1.045);
        const p2 = ringAt(mid + 0.01, 1.045).p;
        const t = p2.clone().sub(p).normalize();
        leafAt(p, n, t, 0.075, 0.2);
        leafAt(p, n, t.clone().negate(), 0.07, 0.18);
      }
      // 큰 꽃 아래 잎 두 장
      const { p, n } = headAt(BIG.lon, BIG.lat, 1.04);
      leafAt(p, n, V3(-0.4, -1, 0.2), 0.09, 0.3);
      leafAt(p, n, V3(0.5, -1, 0.3), 0.08, 0.26);
      return mergeGeometries(list);
    }),
    leafMat,
    0.018,
  );
  const vine = part(og('flower-vine', () => edgeGeo(axis, alpha, 1.03, 0.045)), vineMat, 0.016);
  // 목에 두른 초록 잎 깃(잎 열 장이 밖·아래로 퍼진다)
  const collar = part(
    og('flower-collar', () => {
      const list = [smoothed(new THREE.TorusGeometry(0.43, 0.075, 10, 36).rotateX(Math.PI / 2).translate(0, 0.04, 0))];
      for (let k = 0; k < 10; k++) {
        const a = ((k + 0.5) / 10) * Math.PI * 2;
        const out = V3(Math.sin(a), 0, Math.cos(a));
        const y = out.clone().multiplyScalar(0.85).add(V3(0, -0.55, 0)).normalize();
        const z = V3(0, 1, 0).addScaledVector(y, -y.y).normalize();
        const x = V3().crossVectors(y, z);
        const m = new THREE.Matrix4().makeBasis(x, y, z).setPosition(out.clone().multiplyScalar(0.42).add(V3(0, 0.03, 0)));
        list.push(leafGeo(0.1, 0.3, 0.035).applyMatrix4(m));
      }
      return mergeGeometries(list);
    }),
    leafMat,
    0.022,
  );
  return { head: [vine, leaves, ...parts], body: [collar], hide: ['goggles', 'scarf'] };
});

// ───────── 생일 파티 ─────────
// 비스듬히 쓴 파스텔 줄무늬 고깔(흰 땡땡이, 몽실한 분홍 방울, 프릴 테, 턱 아래로 두른 고무줄) + 빨간 땡땡이 나비넥타이.
registerOutfit('party', () => {
  const at = headAt(-0.55, 1.08, 0.93);
  const up = at.n.clone().multiply(V3(1.25, 1, 0.35)).normalize();
  const hatM = new THREE.Matrix4().compose(at.p, rotTo(YV, up), V3(1, 1, 1));
  const H = 1.08;
  const RB = 0.47;
  const hat = part(
    og('party-hat', () => {
      const pts = [new THREE.Vector2(0.001, -0.08), new THREE.Vector2(RB * 0.7, -0.05), new THREE.Vector2(RB, 0)];
      for (let k = 1; k <= 20; k++) {
        const u = k / 20;
        pts.push(new THREE.Vector2(Math.max(0.001, RB * Math.pow(1 - u, 0.95) + 0.03 * Math.sin(Math.PI * u)), u * H));
      }
      const g = new THREE.LatheGeometry(pts, 48);
      const p = g.attributes.position;
      const uv = g.attributes.uv;
      for (let i = 0; i < p.count; i++) uv.setY(i, Math.max(0, p.getY(i)) / H);
      return g.applyMatrix4(hatM);
    }),
    mat('#ffffff', { rough: 0.45, map: partyArt(), emissive: '#6a5a9a', emissiveIntensity: 0.12 }),
    0.03,
  );
  const ruffle = part(
    og('party-ruffle', () => {
      const pts = [];
      const N = 96;
      for (let k = 0; k < N; k++) {
        const a = (k / N) * Math.PI * 2;
        pts.push(V3(Math.sin(a) * (RB + 0.01), 0.03, Math.cos(a) * (RB + 0.01)));
      }
      const curve = new THREE.CatmullRomCurve3(pts, true);
      const g = new THREE.TubeGeometry(curve, N, 0.07, 8, true);
      const p = g.attributes.position;
      const c = V3();
      for (let i = 0; i <= N; i++) {
        curve.getPointAt((i % N) / N, c);
        const k = 1 + 0.3 * (Math.cos((Math.PI * 2 * 16 * i) / N) - 0.3);
        for (let j = 0; j <= 8; j++) {
          const v = i * 9 + j;
          p.setXYZ(v, c.x + (p.getX(v) - c.x) * k, c.y + (p.getY(v) - c.y) * k, c.z + (p.getZ(v) - c.z) * k);
        }
      }
      return smoothed(g).applyMatrix4(hatM);
    }),
    mat('#ffffff', { rough: 0.5, emissive: '#fff0f6', emissiveIntensity: 0.25 }),
    0.022,
  );
  const pom = part(og('party-pom', () => baked(fluffGeo(), new THREE.Matrix4().multiplyMatrices(hatM, compose([0, H + 0.06, 0], [0, 0, 0], [0.17, 0.17, 0.17])))), mat('#ff5fa2', { rough: 0.7, emissive: '#c02a6a', emissiveIntensity: 0.25 }), 0.025);
  // 고무줄: 모자 테 양옆에서 볼 옆을 따라 내려와 턱 아래로 이어진다(머리 표면을 따라)
  const string = part(
    og('party-string', () => {
      const a = V3(-RB * 0.92, 0.04, 0.1).applyMatrix4(hatM);
      const b = V3(RB * 0.92, 0.04, 0.1).applyMatrix4(hatM);
      const L = (lon, lat) => onHead(lon, lat, 1.03);
      const path = [a, L(-1.1, 0.5), L(-1.08, 0.0), L(-0.95, -0.55), L(-0.6, -1.0), L(0, -1.12), L(0.6, -1.0), L(0.95, -0.55), L(1.08, 0.0), L(1.06, 0.5), L(0.76, 0.98), b];
      return smoothed(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(path), 100, 0.018, 6, false));
    }),
    mat('#ffc4e2', { rough: 0.4, emissive: '#ff8cc0', emissiveIntensity: 0.2 }),
    0.008,
  );
  // 나비넥타이: 바깥으로 갈수록 넓어지는 두 날개 + 가운데 매듭(빨강에 흰 땡땡이, 앞에서 비춘 평면 uv)
  const dots = mat('#ffffff', { rough: 0.4, map: dotsArt(), emissive: '#a01030', emissiveIntensity: 0.2 });
  const bowM = compose([0, -0.1, 0.52], [-0.32, 0, 0], [1.15, 1.15, 1.15]);
  const bow = part(
    og('party-bow', () => {
      const list = [];
      for (const s of [-1, 1]) {
        const g = sphere(20, 14);
        const p = g.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const x = p.getX(i);
          const u = (x * s + 1) / 2; // 0 = 매듭 쪽, 1 = 바깥
          const k = 0.42 + 0.58 * Math.pow(u, 0.7);
          p.setXYZ(i, s * (0.07 + u * 0.19), p.getY(i) * 0.12 * k, p.getZ(i) * 0.075 * (0.6 + 0.4 * k));
        }
        list.push(smoothed(g));
      }
      list.push(smoothed(baked(sphere(14, 10), compose([0, 0, 0.02], [0, 0, 0], [0.075, 0.08, 0.07]))));
      const g = mergeGeometries(list).applyMatrix4(bowM);
      const p = g.attributes.position;
      const uv = g.attributes.uv;
      for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) * 5 + 0.5, p.getY(i) * 5 + 0.5);
      return g;
    }),
    dots,
    0.02,
  );
  const neckband = part(og('party-band', () => smoothed(new THREE.TorusGeometry(0.43, 0.045, 8, 36).rotateX(Math.PI / 2).translate(0, -0.03, 0))), mat('#ff3d55', { rough: 0.4, emissive: '#a01030', emissiveIntensity: 0.25 }), 0.015);
  return { head: [hat, ruffle, pom, string], body: [neckband, bow], hide: ['goggles', 'scarf'] };
});
