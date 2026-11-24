// 기체 장식(꾸미기 'deco'). 능력치 없음. 기체(ufo3d.js createUfo)의 body 에 붙는 작은 부품 묶음.
// 형태(0..7)마다 크기·모양이 다르므로 anchor(아래)로 자리를 잡는다. 모델 단위는 기체와 같다(원점 = 기체 중심, +y 위, +z 정면).
//
// anchor = {
//   form, spec(형태 설계: R, dome, antennas, ring, fins, tiers, deck, sideDomes, radar, escorts),
//   R(맨 아래 접시 반지름), surfaceY(r)(가운데에서 r 떨어진 윗면 높이), rimY(윗면 가장자리 높이), mainTopY,
//   domeY(조종석 돔 바닥), domeR(돔 반지름, 세로는 domeSY 배), domeTop(돔 꼭대기), topY(기체 꼭대기), bellyY,
//   domeSY, tiers([{ r2, y0 }] 위층 접시), antennaX(안테나 밑동 가로 자리, 없으면 0),
//   o(기체 재질 묶음: o.light() = 도색 조명 색), pmesh(geo, role, opts)(도색을 따르는 메시), paint()(지금 도색 값)
// }
// buildDeco(id, anchor) → { group: THREE.Group, update({ t, mood, lit, beam }) } | null
//
// 그리는 법(기체·피포와 같은 장난감 래커 문법)
//   · 부품은 '단위 도형'(돔 반지름 D = 1 이나 장식 크기 = 1)으로 만들어 캐시해 두고, 기체마다 고르게(uniform) 키운다.
//     외곽선(addOutline)은 메시의 로컬 단위라 그 배율로 나눠 두께를 맞춘다(화면에서 기체 테두리보다 조금 가늘게).
//   · 재질은 투명 코팅 래커 + 제 색으로 살짝 빛나는 emissive(그늘에서 잿빛이 되지 않게). 빛나는 것은 glowSprite 를 겹친다.
//   · 돔 주변 장식(귀·뿔·별·프로펠러·왕관·고리)은 돔 반지름 D 로, 테두리 장식(가시·날개·깃발·리본)은 접시 반지름 R 로 잰다.
//   · 피포의 더듬이 전구가 돔 꼭대기를 뚫고 D × 0.36 만큼 솟는다(조금 뒤쪽). 돔 위 장식은 그 위로 비켜 간다.
//   · 표정(mood): idle | happy | alert | shock | hide. 시간이 크게 건너뛰면(새 기체·아이콘 촬영) 자세를 바로 맞추고,
//     이어지는 프레임에서는 부드럽게 따라간다. update 안에서는 새 객체를 만들지 않는다.
import { THREE, mesh, sphereGeo, capsuleGeo, torusGeo, addOutline, glowSprite, canvasTexture } from './kit.js';

/** 장식 설계도: id → (anchor) => { group, update? }. 'none' 은 장식 없음. */
export const DECO_BUILD = { none: () => null };

/** 고를 수 있는 장식 id(catalog.js 의 deco 와 같은 id). */
export const DECO_IDS = ['none'];

export function registerDeco(id, build) {
  DECO_BUILD[id] = build;
  if (!DECO_IDS.includes(id)) DECO_IDS.push(id);
}

export function buildDeco(id, anchor) {
  const b = DECO_BUILD[id];
  if (!b) return null;
  const out = b(anchor);
  if (!out) return null;
  if (!out.group) out.group = new THREE.Group();
  return out;
}

// ───────── 공통 도구 ─────────

/** 외곽선 색: 피포·기체와 같은 보라 기운 남색. */
const LINE = '#2b1a5e';
const TAU = Math.PI * 2;
/** 돔 단위(D = 1) 부품의 외곽선 두께. */
const OL_D = 0.032;
/** 접시 단위(R = 1) 부품의 외곽선 두께. */
const OL_R = 0.013;
/** 기체를 앞으로 기울이는 각도(ufo3d.js 의 UFO_TILT 와 같다. 서로 가져오면 순환 참조라 값만 적어 둔다). */
const VIEW_TILT = 0.36;

const ink = (m, th) => addOutline(m, th, LINE);

const geoCache = new Map();
function geo(key, make) {
  let g = geoCache.get(key);
  if (!g) {
    g = make();
    geoCache.set(key, g);
  }
  return g;
}

const matCache = new Map();
/**
 * 장식 래커 재질(캐시). map 이 있으면 emissive 도 그 그림을 따른다. vc = 꼭짓점 색.
 * @param {string} color
 * @param {{map?: THREE.Texture, vc?: boolean, metal?: number, rough?: number, coat?: number, glow?: number,
 *          emissive?: string, env?: number, side?: number}} [o]
 */
function gloss(color, o = {}) {
  const key = color + JSON.stringify(o, (k, v) => (v && v.isTexture ? v.uuid : v));
  let m = matCache.get(key);
  if (m) return m;
  const plain = !o.map && !o.vc;
  m = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(plain ? color : '#ffffff'),
    map: o.map || null,
    vertexColors: !!o.vc,
    metalness: o.metal ?? 0.05,
    roughness: o.rough ?? 0.32,
    clearcoat: o.coat ?? 1,
    clearcoatRoughness: 0.12,
    envMapIntensity: o.env ?? 0.9,
    emissive: new THREE.Color(o.map ? '#ffffff' : o.emissive || color),
    emissiveMap: o.map || null,
    emissiveIntensity: o.glow ?? 0.24,
    side: o.side ?? THREE.FrontSide,
  });
  matCache.set(key, m);
  return m;
}

/** 장식 금붙이: 하늘빛 반사에 푸르게 뜨지 않게 따뜻한 빛을 조금 낸다(피포 의상 금과 같은 결). */
const goldMat = () => gloss('#ffc63a', { metal: 0.55, rough: 0.26, coat: 0.6, emissive: '#8a4a00', glow: 0.42, env: 1.1 });

const _v = new THREE.Vector3();
const _w = new THREE.Vector3();
const _n = new THREE.Vector3();
const _J = new THREE.Matrix3();
const _cols = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];

/**
 * 도형의 꼭짓점을 fn(p) 로 옮기고 법선을 야코비안(수치 미분)으로 함께 옮긴다. 구를 주물러 만든 도형이
 * 이음매·극점에서도 매끈한 법선을 갖게 해서(외곽선이 갈라지지 않는다) UV 는 그대로 둔다. 만들 때 한 번만 쓴다.
 */
function deform(g, fn, eps = 1e-4) {
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const out = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    for (let k = 0; k < 3; k++) {
      const c = _cols[k];
      _v.fromBufferAttribute(pos, i);
      _v.setComponent(k, _v.getComponent(k) + eps);
      fn(_v);
      c.copy(_v);
      _v.fromBufferAttribute(pos, i);
      _v.setComponent(k, _v.getComponent(k) - eps);
      fn(_v);
      c.sub(_v).divideScalar(2 * eps);
    }
    const [a, b, c] = _cols;
    _J.set(a.x, b.x, c.x, a.y, b.y, c.y, a.z, b.z, c.z);
    _n.fromBufferAttribute(nor, i);
    if (Math.abs(_J.determinant()) > 1e-12) {
      _J.invert().transpose();
      _n.applyMatrix3(_J).normalize();
    }
    nor.setXYZ(i, _n.x, _n.y, _n.z);
    _v.fromBufferAttribute(pos, i);
    fn(_v);
    out[i * 3] = _v.x;
    out[i * 3 + 1] = _v.y;
    out[i * 3 + 2] = _v.z;
  }
  pos.array.set(out);
  pos.needsUpdate = true;
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}

/**
 * 말랑한 둥근 삼각형(고양이 귀·왕관 뾰족이): 둥근 원뿔을 앞뒤로 눌러 납작하게. 밑동 가운데가 원점, 키 1,
 * 밑 반폭 ≈ 0.52, 두께 = depth. 얼굴은 +z.
 */
function puffTri(depth = 0.42) {
  return geo(`puff${depth}`, () => {
    const pts = [[0.001, -0.1], [0.3, -0.09], [0.47, -0.05], [0.52, 0.04], [0.49, 0.2], [0.4, 0.44], [0.28, 0.68], [0.17, 0.87], [0.08, 0.97], [0.001, 1.0]];
    const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 28);
    g.scale(1, 1, depth);
    return g;
  });
}

/**
 * 윗면(top) 도색 재질을 쓰는 도형: UV 를 선체 칠 그림의 이음매 없는 밝은 띠(꼭대기 쪽)로 옮긴다.
 * (선체 칠 그림은 가로로 판 이음매 8줄과 가로 홈 한 줄이 있어 그대로 쓰면 줄무늬가 생긴다.)
 */
function topUV(key, src) {
  return geo(`topUV|${key}`, () => {
    const g = src.clone();
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.012 + 0.03 * uv.getX(i), 0.6 + 0.38 * uv.getY(i));
    return g;
  });
}

/** 위층 접시들(형태 4·7): [{ r2: 반지름, y0: 접시 바닥 높이 }]. ufo3d.js 의 쌓는 규칙과 같다. */
function tiersOf(a) {
  if (a.tiers) return a.tiers; // ufo3d.js 가 실제로 쌓은 값
  const out = [];
  let top = a.mainTopY;
  for (let k = 0; k < (a.spec.tiers || 0); k++) {
    const r2 = a.R * (k === 0 ? 0.6 : 0.36);
    const y0 = top - r2 * 0.02;
    out.push({ r2, y0 });
    top = y0 + 0.29 * r2;
  }
  return out;
}

/** 가운데에서 r 떨어진 자리의 가장 높은 선체 면(위층 접시·창문 갑판·조종석 받침 포함). */
function hullTop(a, r) {
  const { R, spec } = a;
  let y = a.surfaceY(r);
  for (const { r2, y0 } of tiersOf(a)) {
    if (r <= r2 * 0.975) y = Math.max(y, y0 + a.surfaceY((r / r2) * R) * (r2 / R));
    else if (r <= r2 * 1.01) y = Math.max(y, y0 + 0.064 * r2); // 위층 범퍼 꼭대기
  }
  if (spec.deck && r <= R * 0.57) y = Math.max(y, a.domeY - 0.01);
  if (r <= a.domeR * 1.2) y = Math.max(y, a.domeY + a.domeR * 0.005);
  return y;
}

/** 윗면 기울기(dy/dr). */
const slope = (a, r) => (hullTop(a, r + a.R * 0.01) - hullTop(a, r - a.R * 0.01)) / (a.R * 0.02);

/**
 * 돔 옆(조금 뒤) 자리: 귀·사슴뿔. 위층 접시 범퍼에 걸리면 그 바깥 비탈로 옮기고,
 * 관측선(옆 관측 돔이 양옆을 차지)은 더 뒤로 물린다.
 */
function sideSlot(a) {
  let r = a.domeR * 1.36;
  for (const { r2 } of tiersOf(a)) if (r > r2 * 0.88 && r < r2 * 1.1) r = r2 * 1.12;
  const az = Math.PI / 2 + (a.spec.sideDomes ? 0.78 : 0.3);
  return { r, az };
}

/**
 * 시계: 지난 프레임과의 시간차(dt)와 따라가기 비율(k). 시간이 거꾸로 가거나 0.25 초 넘게 건너뛰면(새 기체, 아이콘
 * 촬영) k = 1(바로 맞춤), dt = 0.
 */
function clock() {
  const c = { last: -1, dt: 0, k: 1, snap: true };
  c.tick = (t) => {
    const dt = t - c.last;
    c.last = t;
    if (dt >= 0 && dt <= 0.25) {
      c.dt = dt;
      c.k = 1 - Math.exp(-dt * 8);
      c.snap = false;
    } else {
      c.dt = 0;
      c.k = 1;
      c.snap = true;
    }
    return c;
  };
  return c;
}

let sparkTex = null;
/** 네 갈래 반짝이(가운데 빛 + 가는 십자). */
function sparkleTexture() {
  if (sparkTex) return sparkTex;
  sparkTex = canvasTexture(64, 64, (ctx, w) => {
    const c = w / 2;
    const g = ctx.createRadialGradient(c, c, 0, c, c, c * 0.5);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.45)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, w);
    ctx.fillStyle = '#ffffff';
    for (const [dx, dy] of [[1, 0], [0, 1]]) {
      ctx.beginPath();
      ctx.moveTo(c - dx * c * 0.98, c - dy * c * 0.98);
      ctx.lineTo(c + dy * 2.6, c + dx * 2.6);
      ctx.lineTo(c + dx * c * 0.98, c + dy * c * 0.98);
      ctx.lineTo(c - dy * 2.6, c - dx * 2.6);
      ctx.closePath();
      ctx.fill();
    }
  });
  return sparkTex;
}

/** 덧그리기 반짝이 스프라이트. */
function sparkle(color, size, opacity = 0.9) {
  const s = glowSprite(color, size, opacity);
  s.material.map = sparkleTexture();
  return s;
}

// ───────── 1. 고양이 귀 ─────────

const PINK_EAR = () => gloss('#ff9cc8', { rough: 0.4, coat: 0.5, glow: 0.3 });

registerDeco('catears', (a) => {
  const D = a.domeR;
  const { r, az } = sideSlot(a);
  const group = new THREE.Group();
  const H = 0.84; // 귀 키(돔 반지름 단위)
  const outerGeo = topUV('ear', puffTri(0.42));
  const innerGeo = puffTri(0.3);
  const ears = [];
  const lean0 = Math.atan(-slope(a, r)) * 0.4;
  for (const side of [-1, 1]) {
    const ang = side * az;
    const base = new THREE.Group();
    base.position.set(Math.sin(ang) * r, hullTop(a, r) - D * 0.06, Math.cos(ang) * r);
    base.rotation.y = side * 0.28; // 얼굴은 앞(조금 바깥)을 본다
    base.scale.setScalar(D);
    const joint = new THREE.Group();
    base.add(joint);
    // 바깥 귀: 선체 윗면 도색을 따른다. 안쪽: 분홍 귀속(바깥 귀 앞면 위로 도톰하게 솟아 있다)
    const outer = a.pmesh(outerGeo, 'top', { scale: [H * 0.9, H, H] });
    ink(outer, OL_D / H);
    const inner = mesh(innerGeo, PINK_EAR(), { scale: [H * 0.58, H * 0.68, H * 0.5], pos: [0, H * 0.08, H * 0.15] });
    joint.add(outer, inner);
    group.add(base);
    ears.push({ joint, side, ph: side > 0 ? 0.12 : 0.61 });
  }
  const st = { lean: 0.3, back: 0, up: 1 };
  const clk = clock();
  return {
    group,
    update({ t, mood }) {
      const { k } = clk.tick(t);
      // 기분별 자세: lean = 바깥으로 눕힌 정도, back = 뒤로 젖힌 정도(−), up = 쫑긋 늘린 정도
      let lean = 0.3 + lean0;
      let back = 0.04;
      let up = 1;
      if (mood === 'alert') {
        lean = 0.06;
        back = 0.12;
        up = 1.12;
      } else if (mood === 'shock') {
        lean = 0.02;
        back = 0.05;
        up = 1.16;
      } else if (mood === 'hide') {
        lean = 1.0;
        back = -0.75;
        up = 0.8;
      } else if (mood === 'happy') {
        lean = 0.36 + lean0;
      }
      st.lean += (lean - st.lean) * k;
      st.back += (back - st.back) * k;
      st.up += (up - st.up) * k;
      for (let i = 0; i < ears.length; i++) {
        const e = ears[i];
        // 가끔 한쪽 귀를 파르르(짧게 두 번)
        const ph = (t * 0.27 + e.ph) % 1;
        const tw = mood === 'hide' ? 0 : ph < 0.07 ? Math.sin((ph / 0.07) * TAU * 2) * 0.22 : 0;
        const wig = mood === 'happy' ? Math.sin(t * 9 + e.side) * 0.12 : mood === 'shock' ? Math.sin(t * 42 + e.side) * 0.06 : 0;
        e.joint.rotation.set(st.back + tw * 0.5, tw, -e.side * (st.lean + wig));
        e.joint.scale.set(1, st.up, 1);
      }
    },
  };
});

// ───────── 2. 공룡 등가시 ─────────

/** 공룡 판: 잎 모양 납작한 판(밑동 주황 → 끝 노랑 꼭짓점 색). 밑동 가운데가 원점, 키 1, 두께 축 = z. */
function plateGeo() {
  return geo('dinoPlate', () => {
    const pts = [[0.001, -0.12], [0.26, -0.1], [0.4, 0.02], [0.46, 0.2], [0.44, 0.42], [0.35, 0.64], [0.22, 0.84], [0.1, 0.96], [0.001, 1.0]];
    const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 28);
    g.scale(1, 1, 0.3);
    const lo = new THREE.Color('#ff7a1e');
    const hi = new THREE.Color('#ffd84a');
    const c = new THREE.Color();
    const pos = g.attributes.position;
    const col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const f = THREE.MathUtils.smoothstep(pos.getY(i), 0.05, 0.85);
      c.copy(lo).lerp(hi, f);
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  });
}

registerDeco('spikes', (a) => {
  const R = a.R;
  const group = new THREE.Group();
  const n = 7;
  const r = R * 0.82;
  const y = hullTop(a, r);
  const lean = Math.atan(-slope(a, r)) * 0.55; // 비탈을 따라 조금 바깥으로
  // 한가운데 뒤의 큰 판은 돔에 가려지므로, 앞에서 볼 때 돔 꼭대기 위로 끝이 살짝 솟을 만큼 키운다(너무 크지는 않게)
  const hc = THREE.MathUtils.clamp(a.domeTop + a.domeR * 0.28 - y - r * Math.tan(VIEW_TILT), R * 0.3, R * 0.46);
  const hs = R * 0.15;
  const plates = [];
  const m0 = gloss('#ffffff', { vc: true, emissive: '#ff8a1e', glow: 0.22, rough: 0.3 });
  for (let i = 0; i < n; i++) {
    const u = (i / (n - 1)) * 2 - 1; // −1(왼쪽 끝) .. 1(오른쪽 끝), 0 = 한가운데 뒤
    const az = Math.PI + u * 1.3;
    const sz = hs + (hc - hs) * Math.pow(1 - u * u, 1.5);
    const holder = new THREE.Group();
    holder.position.set(Math.sin(az) * r, y - sz * 0.08, Math.cos(az) * r);
    holder.rotation.y = az; // 판의 얼굴(z)이 바깥을 본다 → 판은 둘레를 따라 선다
    const pivot = new THREE.Group();
    holder.add(pivot);
    const p = mesh(plateGeo(), m0, { scale: sz });
    ink(p, (OL_R * R) / sz);
    pivot.add(p);
    group.add(holder);
    plates.push({ pivot, i });
  }
  const st = { up: 1, lean };
  const clk = clock();
  return {
    group,
    update({ t, mood }) {
      const { k } = clk.tick(t);
      const up = mood === 'hide' ? 0.72 : mood === 'shock' ? 1.14 : mood === 'alert' ? 1.06 : 1;
      const ln = mood === 'hide' ? lean + 0.5 : lean;
      st.up += (up - st.up) * k;
      st.lean += (ln - st.lean) * k;
      const sp = mood === 'happy' ? 7 : mood === 'shock' ? 30 : 2.4;
      const amp = mood === 'happy' ? 0.12 : mood === 'shock' ? 0.05 : mood === 'hide' ? 0.01 : 0.06;
      for (let j = 0; j < plates.length; j++) {
        const p = plates[j];
        // 파도처럼 하나씩 늦게 흔들린다
        p.pivot.rotation.set(st.lean + Math.sin(t * sp * 0.8 - p.i * 0.9) * amp * 0.5, 0, Math.sin(t * sp - p.i * 0.7) * amp);
        p.pivot.scale.set(1, st.up, 1);
      }
    },
  };
});

// ───────── 3. 꿀벌 날개 ─────────

let wingTex = null;
/** 꿀벌 날개 그림: 투명한 물방울 모양 + 날개맥 + 테두리. 왼쪽 가운데가 뿌리(u = 0). */
function wingTexture() {
  if (wingTex) return wingTex;
  wingTex = canvasTexture(256, 128, (ctx, w, h) => {
    const shape = () => {
      ctx.beginPath();
      ctx.moveTo(6, h * 0.5);
      ctx.bezierCurveTo(w * 0.25, h * 0.04, w * 0.78, -h * 0.04, w * 0.95, h * 0.3);
      ctx.bezierCurveTo(w * 1.02, h * 0.5, w * 0.93, h * 0.84, w * 0.66, h * 0.88);
      ctx.bezierCurveTo(w * 0.4, h * 0.92, w * 0.18, h * 0.8, 6, h * 0.5);
      ctx.closePath();
    };
    // 안쪽: 맑은 물빛 → 끝으로 갈수록 분홍·보라 무지갯빛
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, 'rgba(210,250,255,0.6)');
    g.addColorStop(0.45, 'rgba(200,235,255,0.42)');
    g.addColorStop(0.75, 'rgba(255,200,245,0.48)');
    g.addColorStop(1, 'rgba(220,190,255,0.6)');
    shape();
    ctx.fillStyle = g;
    ctx.fill();
    // 날개맥: 뿌리에서 부채처럼
    ctx.save();
    shape();
    ctx.clip();
    ctx.strokeStyle = 'rgba(70,50,140,0.55)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (const [ex, ey, cx, cy] of [[0.95, 0.32, 0.5, 0.18], [0.9, 0.62, 0.5, 0.48], [0.62, 0.9, 0.36, 0.66], [0.75, 0.12, 0.4, 0.3]]) {
      ctx.beginPath();
      ctx.moveTo(8, h * 0.5);
      ctx.quadraticCurveTo(w * cx, h * cy, w * ex, h * ey);
      ctx.stroke();
    }
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(w * 0.55, h * 0.22);
    ctx.quadraticCurveTo(w * 0.62, h * 0.45, w * 0.58, h * 0.72);
    ctx.moveTo(w * 0.78, h * 0.2);
    ctx.quadraticCurveTo(w * 0.8, h * 0.45, w * 0.76, h * 0.7);
    ctx.stroke();
    // 반짝이는 윗가장자리
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(w * 0.2, h * 0.22);
    ctx.quadraticCurveTo(w * 0.5, h * 0.04, w * 0.82, h * 0.14);
    ctx.stroke();
    ctx.restore();
    // 테두리(외곽선 색)
    shape();
    ctx.strokeStyle = 'rgba(43,26,94,0.95)';
    ctx.lineWidth = 5.5;
    ctx.stroke();
  });
  return wingTex;
}

let wingMatC = null;
function wingMat() {
  wingMatC ??= new THREE.MeshPhysicalMaterial({
    map: wingTexture(),
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    roughness: 0.12,
    metalness: 0,
    clearcoat: 0.6,
    iridescence: 1,
    iridescenceIOR: 1.5,
    iridescenceThicknessMinimum: 180,
    iridescenceThicknessMaximum: 520,
    envMapIntensity: 1.3,
    emissive: new THREE.Color('#ffffff'),
    emissiveMap: wingTexture(),
    emissiveIntensity: 0.3,
  });
  return wingMatC;
}

/** 날개 판: 뿌리(x = 0)에서 +x 로 길이 1, 높이 0.5. */
const wingPlane = () => geo('wingPlane', () => new THREE.PlaneGeometry(1, 0.5, 1, 1).translate(0.5, 0, 0));

registerDeco('wings', (a) => {
  const R = a.R;
  const group = new THREE.Group();
  const r = R * 0.7;
  // 관측선은 왼쪽 뒤에 레이더가 있어 날개를 더 뒤로 붙인다
  const az = Math.PI / 2 + (a.spec.radar ? 1.0 : 0.62);
  const knobGeo = sphereGeo(1, 14, 10);
  const sides = [];
  for (const side of [-1, 1]) {
    const ang = side * az;
    const root = new THREE.Group();
    root.position.set(Math.sin(ang) * r, hullTop(a, r) + R * 0.03, Math.cos(ang) * r);
    root.scale.set(side * R, R, R); // 왼쪽은 거울(날개 판은 양면)
    const knob = a.pmesh(knobGeo, 'trim', { scale: 0.045 });
    ink(knob, OL_R / 0.045);
    root.add(knob);
    // 큰 날개(위)와 작은 날개(아래)
    const pairs = [];
    for (const [len, lift, dz] of [[0.7, 0.4, 0], [0.48, -0.06, -0.012]]) {
      const pivot = new THREE.Group();
      pivot.position.z = dz;
      const w = mesh(wingPlane(), wingMat(), { scale: [len, len, 1] });
      w.renderOrder = 2;
      pivot.add(w);
      root.add(pivot);
      pairs.push({ pivot, lift });
    }
    group.add(root);
    sides.push({ root, pairs, side });
  }
  const st = { fold: 0, amp: 0.3, size: 1, ph: 0, sp: 24 };
  const clk = clock();
  return {
    group,
    update({ t, mood }) {
      const { k, dt, snap } = clk.tick(t);
      // 날갯짓 빠르기·폭·크기. 숨을 땐 뒤로 접고 멈춘다
      const sp = mood === 'happy' ? 34 : mood === 'shock' ? 42 : mood === 'alert' ? 28 : mood === 'hide' ? 0 : 22;
      const amp = mood === 'happy' ? 0.5 : mood === 'shock' ? 0.22 : mood === 'hide' ? 0 : 0.32;
      const size = mood === 'happy' ? 1.12 : mood === 'hide' ? 0.9 : 1;
      const fold = mood === 'hide' ? 1 : 0;
      st.sp += (sp - st.sp) * k;
      st.amp += (amp - st.amp) * k;
      st.size += (size - st.size) * k;
      st.fold += (fold - st.fold) * k;
      st.ph = snap ? t * st.sp : st.ph + st.sp * dt;
      const f = Math.sin(st.ph) * st.amp;
      for (let i = 0; i < sides.length; i++) {
        const s = sides[i];
        for (let j = 0; j < s.pairs.length; j++) {
          const p = s.pairs[j];
          // 위아래로 파닥(앞에서 보면 날개가 위아래로 쓸린다) + 끝이 살짝 뒤로. 접으면 뒤로 눕힌다
          const lift = p.lift * (1 - st.fold) - 0.15 * st.fold;
          p.pivot.rotation.set(0, 0.3 + st.fold * 1.0 + f * 0.15, lift + f * (j === 0 ? 1 : 0.8));
          p.pivot.scale.setScalar(st.size);
        }
      }
    },
  };
});

// ───────── 4. 반짝 별 위성 ─────────

/** 통통한 다섯 꼭지 별(두께 축 = z, 꼭지 하나가 위). 반지름 1. */
function starGeo() {
  return geo('chubbyStar', () => {
    const g = new THREE.SphereGeometry(1, 90, 12).rotateX(Math.PI / 2);
    return deform(g, (p) => {
      const th = Math.atan2(p.y, p.x) - Math.PI / 2;
      const rs = 0.54 + 0.46 * Math.pow(0.5 + 0.5 * Math.cos(5 * th), 1.2);
      p.set(p.x * rs, p.y * rs, p.z * 0.36);
    });
  });
}

registerDeco('stars', (a) => {
  const D = a.domeR;
  const group = new THREE.Group();
  // 궤도: 돔 둘레의 기울어진 원(앞쪽이 낮다). 안테나·레이더가 있는 형태는 좁게(또는 높게) 돈다
  const tight = a.spec.antennas && (a.spec.deck || a.spec.tiers);
  const rad = D * (a.spec.radar ? 1.32 : tight ? 1.3 : 1.5);
  const cy = a.domeY + D * (a.spec.radar ? 0.85 : 0.55);
  const orbit = new THREE.Group();
  orbit.position.set(0, cy, 0);
  orbit.rotation.set(0.26, 0, 0.12);
  group.add(orbit);
  const sr = D * 0.28; // 별 반지름
  const m0 = gloss('#ffcf3a', { metal: 0.35, rough: 0.28, emissive: '#ff9a00', glow: 0.36, env: 1.1 });
  const stars = [];
  for (let i = 0; i < 3; i++) {
    const holder = new THREE.Group();
    const s = mesh(starGeo(), m0, { scale: sr * (i === 0 ? 1.12 : 1) });
    ink(s, (OL_D * D) / (sr * (i === 0 ? 1.12 : 1)));
    // 별에 반짝이는 하이라이트 점 하나(통통해 보이게)
    const glow = glowSprite('#ffe27a', sr * 3.2, 0.4);
    const tw = sparkle('#fff6c8', sr * 2.6, 0);
    tw.position.set(sr * 0.5, sr * 0.6, sr * 0.3);
    holder.add(glow, s, tw);
    orbit.add(holder);
    stars.push({ holder, s, glow, tw, i });
  }
  const st = { sp: 0.9, ph: 0, rad, lift: 0, glow: 1 };
  const clk = clock();
  return {
    group,
    update({ t, mood, lit = 1 }) {
      const { k, dt, snap } = clk.tick(t);
      const sp = mood === 'happy' ? 1.8 : mood === 'shock' ? 3.2 : mood === 'alert' ? 1.2 : mood === 'hide' ? 0.35 : 0.9;
      const rr = mood === 'hide' ? rad * 0.9 : mood === 'shock' ? rad * 1.08 : rad;
      const lift = mood === 'hide' ? -D * 0.15 : mood === 'happy' ? D * 0.06 : 0;
      const gl = mood === 'hide' ? 0.25 : mood === 'happy' ? 1.25 : 1;
      st.sp += (sp - st.sp) * k;
      st.rad += (rr - st.rad) * k;
      st.lift += (lift - st.lift) * k;
      st.glow += (gl - st.glow) * k;
      st.ph = snap ? t * st.sp : st.ph + st.sp * dt;
      orbit.position.y = cy + st.lift;
      for (let j = 0; j < stars.length; j++) {
        const s = stars[j];
        const ang = st.ph + (s.i * TAU) / 3;
        const bob = Math.sin(t * 2.4 + s.i * 2.1) * D * 0.05;
        s.holder.position.set(Math.sin(ang) * st.rad, bob, Math.cos(ang) * st.rad);
        // 늘 얼굴을 앞(카메라 쪽)으로: 궤도 기울기를 되돌리고 살랑 흔든다
        s.holder.rotation.set(-0.26, Math.sin(t * 1.7 + s.i) * 0.45, -0.12 + Math.sin(t * 1.3 + s.i * 2) * 0.25);
        const tw = 0.5 + 0.5 * Math.sin(t * 5.2 + s.i * 2.3);
        s.glow.material.opacity = lit * st.glow * (0.22 + 0.25 * tw);
        s.tw.material.opacity = lit * Math.min(1, st.glow) * Math.max(0, tw * 1.6 - 0.6);
        s.tw.material.rotation = t * 0.8 + s.i;
      }
    },
  };
});

// ───────── 5. 사슴뿔 ─────────

/** 굵은 마디 하나: 캡슐(끝이 둥글어 마디끼리 매끈하게 이어진다). 단위 공간의 A → B, 반지름 rad. */
function limb(A, B, rad, material, olTh) {
  const dir = _w.set(B[0] - A[0], B[1] - A[1], B[2] - A[2]);
  const len = dir.length();
  const m = mesh(capsuleGeo(rad, +(len + rad * 2).toFixed(3), 6, 12), material, { pos: [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2] });
  m.quaternion.setFromUnitVectors(_v.set(0, 1, 0), dir.normalize());
  ink(m, olTh);
  return m;
}

/** 금방울(입구가 아래, 가운데 원점이 꼭지). 단위 1 = 방울 키. */
function bellGeo() {
  return geo('bell', () => {
    // 윤곽은 아래 → 위 순서여야 겉면이 바깥을 본다
    const pts = [[0.001, -0.84], [0.3, -0.84], [0.44, -0.86], [0.46, -0.8], [0.38, -0.62], [0.33, -0.36], [0.26, -0.12], [0.12, 0.0], [0.001, 0.02]];
    return new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 20);
  });
}

/** 작은 빨간 리본 + 금방울(단위 = 리본 폭의 절반). 가운데 매듭이 원점, 얼굴 +z. bell = 흔들리는 방울 묶음. */
function ribbonBell(red, olTh) {
  const g = new THREE.Group();
  const lobe = sphereGeo(1, 16, 12);
  for (const s of [-1, 1]) {
    const l = mesh(lobe, red, { pos: [s * 0.55, 0.1, 0], scale: [0.55, 0.36, 0.26], rot: [0, 0, s * 0.35] });
    ink(l, olTh / 0.4);
    const tail = mesh(lobe, red, { pos: [s * 0.36, -0.42, 0.02], scale: [0.15, 0.4, 0.1], rot: [0, 0, s * 0.6] });
    ink(tail, olTh / 0.3);
    g.add(l, tail);
  }
  const knot = mesh(lobe, red, { scale: [0.24, 0.26, 0.22], pos: [0, 0, 0.05] });
  ink(knot, olTh / 0.24);
  const bell = new THREE.Group();
  bell.position.set(0, -0.14, 0.26);
  const b = mesh(bellGeo(), goldMat(), { scale: 0.95 });
  ink(b, olTh / 0.95);
  const slot = mesh(sphereGeo(1, 10, 8), gloss('#6a3a10', { rough: 0.5 }), { pos: [0, -0.62, 0.36], scale: [0.12, 0.05, 0.04] });
  const clap = mesh(sphereGeo(1, 10, 8), goldMat(), { pos: [0, -0.84, 0], scale: 0.13 });
  bell.add(b, slot, clap);
  g.add(knot, bell);
  return { group: g, bell };
}

registerDeco('antlers', (a) => {
  const D = a.domeR;
  const R = a.R;
  const group = new THREE.Group();
  const { r, az } = sideSlot(a);
  const brown = gloss('#9a5a2c', { rough: 0.45, coat: 0.5, glow: 0.3, emissive: '#7a3c18' });
  const tip = gloss('#c48650', { rough: 0.45, coat: 0.5, glow: 0.3, emissive: '#8a4c20' });
  const red = gloss('#e8323f', { rough: 0.35, glow: 0.3 });
  const S = 1.12; // 뿔 키(돔 반지름 단위)
  const th = OL_D / S;
  const bells = [];
  const sides = [];
  for (const side of [-1, 1]) {
    const ang = side * az;
    const base = new THREE.Group();
    base.position.set(Math.sin(ang) * r, hullTop(a, r) - D * 0.05, Math.cos(ang) * r);
    base.rotation.y = side * 0.35;
    base.scale.set(side * D * S, D * S, D * S); // 왼쪽은 거울(x = 바깥쪽)
    const sway = new THREE.Group();
    base.add(sway);
    // 굵은 줄기(바깥으로 휘며 올라간다) + 안쪽 위로 뻗은 가지 둘 + 바깥 짧은 가지
    sway.add(
      limb([0, -0.05, 0], [0.08, 0.36, -0.02], 0.105, brown, th),
      limb([0.08, 0.36, -0.02], [0.26, 0.68, -0.06], 0.09, brown, th),
      limb([0.26, 0.68, -0.06], [0.33, 0.96, -0.04], 0.075, tip, th),
      limb([0.09, 0.4, -0.02], [-0.06, 0.66, 0.0], 0.068, tip, th),
      limb([0.24, 0.66, -0.06], [0.1, 0.9, -0.02], 0.064, tip, th),
      limb([0.18, 0.54, -0.04], [0.42, 0.6, -0.04], 0.058, tip, th),
    );
    group.add(base);
    sides.push({ sway, side });
    if (side > 0) {
      // 오른쪽 뿔 밑동에 빨간 리본 + 금방울
      const rb = ribbonBell(red, (th * 0.6) / 0.27); // 작은 부품이라 외곽선을 가늘게
      rb.group.position.set(0.07, 0.4, 0.12);
      rb.group.scale.setScalar(0.27);
      rb.group.rotation.y = -0.2;
      sway.add(rb.group);
      bells.push(rb.bell);
    }
  }
  // 빨간 코: 테두리 범퍼 정면에 반짝이는 동그란 불
  const noseMat = new THREE.MeshPhysicalMaterial({ color: '#ff4a4a', emissive: new THREE.Color('#ff1f2a'), emissiveIntensity: 0.9, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05 });
  const nr = R * 0.1;
  const nose = mesh(sphereGeo(1, 20, 14), noseMat, { pos: [0, R * 0.014, R * 1.035], scale: nr });
  ink(nose, (OL_R * R * 0.9) / nr);
  const shine = mesh(sphereGeo(1, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' }), { pos: [-0.38, 0.42, 0.78], scale: [0.2, 0.15, 0.1] });
  nose.add(shine);
  const noseGlow = glowSprite('#ff3a3a', R * 0.6, 0.6);
  noseGlow.position.set(0, R * 0.014, R * 1.1);
  group.add(nose, noseGlow);
  const clk = clock();
  const st = { bounce: 0 };
  return {
    group,
    update({ t, mood, lit = 1 }) {
      const { k } = clk.tick(t);
      // 코: 평소엔 천천히 숨쉬듯, 긴장하면 빠르게 깜빡, 숨을 땐 거의 끈다
      let pulse = 0.5 + 0.5 * Math.sin(t * 2.6);
      if (mood === 'alert' || mood === 'shock') pulse = Math.sin(t * (mood === 'shock' ? 22 : 9)) > 0 ? 1 : 0.2;
      const on = (mood === 'hide' ? 0.12 : 1) * (0.35 + 0.65 * lit);
      noseMat.emissiveIntensity = (0.35 + 1.1 * pulse) * on;
      noseGlow.material.opacity = (0.4 + 0.5 * pulse) * on;
      noseGlow.scale.setScalar(R * (0.5 + 0.2 * pulse));
      const b = mood === 'happy' ? 1 : mood === 'shock' ? 0.6 : 0;
      st.bounce += (b - st.bounce) * k;
      for (let i = 0; i < sides.length; i++) {
        const s = sides[i];
        const wob = mood === 'shock' ? Math.sin(t * 38 + s.side) * 0.04 : Math.sin(t * 8 + s.side * 1.3) * 0.08 * st.bounce;
        s.sway.rotation.set(-0.1, 0, wob + Math.sin(t * 1.4 + s.side) * 0.02);
      }
      for (let i = 0; i < bells.length; i++) {
        const sp = mood === 'happy' ? 9 : mood === 'shock' ? 24 : 3;
        bells[i].rotation.z = Math.sin(t * sp) * (mood === 'hide' ? 0.02 : 0.28);
      }
    },
  };
});

// ───────── 6. 해적 깃발 ─────────

let flagTex = null;
/** 해적 깃발 그림: 검은 천에 둥글고 귀여운 흰 해골 + 엇갈린 뼈. 왼쪽(u = 0)이 깃대 쪽. */
function flagTexture() {
  if (flagTex) return flagTex;
  flagTex = canvasTexture(256, 176, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#2a2140');
    g.addColorStop(1, '#17122a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // 가장자리 박음질 띠
    ctx.strokeStyle = '#4a3c78';
    ctx.lineWidth = 7;
    ctx.strokeRect(6, 6, w - 12, h - 12);
    ctx.setLineDash([8, 7]);
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 2;
    ctx.strokeRect(14, 14, w - 28, h - 28);
    ctx.setLineDash([]);
    const cx = w * 0.52;
    const cy = h * 0.47;
    const bone = '#fff7ea';
    // 엇갈린 뼈(해골 뒤)
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.translate(cx, cy + 14);
      ctx.rotate(s * 0.62);
      ctx.fillStyle = bone;
      ctx.beginPath();
      ctx.roundRect(-74, -8, 148, 16, 8);
      ctx.fill();
      for (const e of [-1, 1]) {
        for (const o of [-1, 1]) {
          ctx.beginPath();
          ctx.arc(e * 74, o * 9, 11, 0, TAU);
          ctx.fill();
        }
      }
      ctx.restore();
    }
    // 해골: 둥근 머리 + 턱
    ctx.fillStyle = bone;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 6, 46, 42, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(cx - 27, cy + 18, 54, 30, 13);
    ctx.fill();
    // 볼 발그레
    ctx.fillStyle = 'rgba(255,140,170,0.55)';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(cx + s * 30, cy + 14, 9, 6, 0, 0, TAU);
      ctx.fill();
    }
    // 큰 동그란 눈 + 반짝임
    ctx.fillStyle = '#1d1630';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(cx + s * 18, cy - 4, 13, 15, 0, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#ffffff';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(cx + s * 18 - 4, cy - 10, 4.5, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + s * 18 + 5, cy + 2, 2, 0, TAU);
      ctx.fill();
    }
    // 작은 하트 코 + 이
    ctx.fillStyle = '#1d1630';
    ctx.beginPath();
    ctx.moveTo(cx, cy + 22);
    ctx.lineTo(cx - 6, cy + 14);
    ctx.arc(cx - 3, cy + 13, 3, Math.PI, 0);
    ctx.arc(cx + 3, cy + 13, 3, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#1d1630';
    ctx.lineCap = 'round';
    for (const dx of [-11, 0, 11]) {
      ctx.beginPath();
      ctx.moveTo(cx + dx, cy + 32);
      ctx.lineTo(cx + dx, cy + 43);
      ctx.stroke();
    }
  });
  return flagTex;
}

let flagMatC = null;
const flagMat = () =>
  (flagMatC ??= new THREE.MeshStandardMaterial({
    map: flagTexture(),
    side: THREE.DoubleSide,
    roughness: 0.7,
    emissive: new THREE.Color('#ffffff'),
    emissiveMap: flagTexture(),
    emissiveIntensity: 0.2,
  }));

registerDeco('flag', (a) => {
  const R = a.R;
  const D = a.domeR;
  const group = new THREE.Group();
  // 깃대: 왼쪽 뒤(관측선은 레이더가 왼쪽 뒤에 있어 오른쪽 뒤로). 깃발은 바깥쪽으로 나부낀다
  const side = a.spec.radar ? 1 : -1;
  const r = R * 0.72;
  const ang = side * (Math.PI / 2 + 0.72);
  const baseY = hullTop(a, r);
  const H = R * 0.5 + D * 0.55; // 깃대 높이
  const pr = R * 0.02;
  const pole = new THREE.Group();
  pole.position.set(Math.sin(ang) * r, baseY, Math.cos(ang) * r);
  pole.rotation.z = -side * 0.06; // 바깥으로 아주 조금
  group.add(pole);
  const rod = a.pmesh(capsuleGeo(pr, +H.toFixed(3), 4, 10), 'trim', { pos: [0, H / 2 - pr, 0] });
  ink(rod, OL_R * R * 0.8);
  const foot = a.pmesh(sphereGeo(1, 14, 8), 'bumper', { scale: [R * 0.055, R * 0.03, R * 0.055], pos: [0, 0, 0] });
  ink(foot, (OL_R * R) / (R * 0.04));
  const ball = a.pmesh(sphereGeo(1, 14, 10), 'trim', { pos: [0, H, 0], scale: R * 0.04 });
  ink(ball, OL_R / 0.04);
  pole.add(rod, foot, ball);
  // 깃발 천(기체마다 따로: 꼭짓점이 나부낀다)
  const FW = R * 0.46;
  const FH = R * 0.31;
  const cloth = new THREE.PlaneGeometry(FW, FH, 16, 6).translate(FW / 2, 0, 0);
  const pos = cloth.attributes.position;
  const nor = cloth.attributes.normal;
  const base = Float32Array.from(pos.array);
  const flag = mesh(cloth, flagMat(), { pos: [pr * 0.5, H - FH / 2 - R * 0.035, 0] });
  flag.frustumCulled = false;
  const holder = new THREE.Group();
  holder.scale.x = side; // 바깥쪽으로
  holder.add(flag);
  pole.add(holder);
  const st = { wind: 1, sp: 5 };
  const clk = clock();
  return {
    group,
    update({ t, mood }) {
      const { k } = clk.tick(t);
      const wind = mood === 'hide' ? 0.25 : mood === 'happy' ? 1.15 : mood === 'shock' ? 1.3 : 1;
      const sp = mood === 'shock' ? 13 : mood === 'happy' ? 8 : mood === 'hide' ? 2.5 : 5.5;
      st.wind += (wind - st.wind) * k;
      st.sp += (sp - st.sp) * k;
      // 깃대에서 멀수록 크게 출렁이는 물결(z) + 바람이 약하면 끝이 처진다
      const kx = TAU / (FW * 0.85);
      const ky = 2.2 / FH;
      const amp = R * 0.065 * st.wind;
      const droop = R * 0.1 * (1.2 - st.wind);
      const ph0 = t * st.sp;
      const P = pos.array;
      const N = nor.array;
      for (let i = 0; i < pos.count; i++) {
        const x = base[i * 3];
        const y = base[i * 3 + 1];
        const f = x / FW;
        const ph = kx * x - ph0 + y * ky;
        const sn = Math.sin(ph);
        const cs = Math.cos(ph);
        P[i * 3 + 1] = y - droop * f * f;
        P[i * 3 + 2] = amp * f * sn;
        const dzdx = (amp / FW) * sn + amp * f * kx * cs;
        const dzdy = amp * f * ky * cs;
        const l = 1 / Math.sqrt(dzdx * dzdx + dzdy * dzdy + 1);
        N[i * 3] = -dzdx * l;
        N[i * 3 + 1] = -dzdy * l;
        N[i * 3 + 2] = l;
      }
      pos.needsUpdate = true;
      nor.needsUpdate = true;
    },
  };
});

// ───────── 7. 리본 ─────────

/**
 * 납작한 리본 띠: pts([[x, y, z], ...]) 를 잇는 곡선을 따라 폭 w·두께 th 의 납작한 관. 폭 방향은 wd 를 곡선에
 * 수직으로 맞춘 것. 끝은 제비꼬리(V)로 파이고 두께가 0 으로 모여 닫힌다. 둘레를 이어 붙여 법선이 매끈하다(외곽선용).
 */
function ribbonGeo(pts, wd, w, th, notch = 0.1) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
  const N = 30;
  const M = 14;
  const pos = new Float32Array((N + 1) * M * 3);
  const P = new THREE.Vector3();
  const T = new THREE.Vector3();
  const W = new THREE.Vector3();
  const B = new THREE.Vector3();
  for (let j = 0; j < M; j++) {
    const phi = (j / M) * TAU;
    const cx = Math.cos(phi);
    const sy = Math.sin(phi);
    const L = 1 - notch * (1 - Math.abs(cx)); // 가운데일수록 짧다 → 제비꼬리
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      curve.getPointAt(u * L, P);
      curve.getTangentAt(u * L, T);
      W.copy(wd).addScaledVector(T, -wd.dot(T)).normalize();
      B.crossVectors(T, W);
      const ww = w * 0.5 * (0.8 + 0.25 * u) * Math.min(1, 0.4 + u * 5);
      const tt = th * 0.5 * Math.min(1, (1 - u) * 8, 0.4 + u * 6);
      const k = (i * M + j) * 3;
      pos[k] = P.x + W.x * ww * cx + B.x * tt * sy;
      pos[k + 1] = P.y + W.y * ww * cx + B.y * tt * sy;
      pos[k + 2] = P.z + W.z * ww * cx + B.z * tt * sy;
    }
  }
  const idx = [];
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < M; j++) {
      const a0 = i * M + j;
      const b0 = i * M + ((j + 1) % M);
      const c0 = (i + 1) * M + j;
      const d0 = (i + 1) * M + ((j + 1) % M);
      idx.push(a0, b0, c0, b0, d0, c0);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}


let dotTex = null;
/** 분홍 바탕에 흰 물방울무늬(가로로 이어 붙여도 이음매 없이). */
function dotTexture() {
  if (dotTex) return dotTex;
  dotTex = canvasTexture(256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#ff5fa6';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fff4fa';
    const cols = 5;
    for (let row = 0; row < 4; row++) {
      for (let c = 0; c < cols; c++) {
        const x = ((c + (row % 2) * 0.5) / cols) * w;
        const y = (0.2 + row * 0.2) * h;
        const rr = row === 0 || row === 3 ? 7 : 9.5;
        for (const dx of [-w, 0, w]) {
          ctx.beginPath();
          ctx.ellipse(x + dx, y, rr * 0.9, rr * 1.15, 0, 0, TAU);
          ctx.fill();
        }
      }
    }
  });
  dotTex.wrapS = THREE.RepeatWrapping;
  return dotTex;
}

/** 리본 고리 하나: 매듭(원점)에서 +x 로 길이 1, 매듭 쪽은 가늘고 끝은 둥글게 부푼 물방울. */
function lobeGeo() {
  return geo('bowLobe', () => {
    const g = new THREE.SphereGeometry(1, 32, 20).rotateZ(-Math.PI / 2); // 극이 x 축(+x = 끝)
    return deform(g, (p) => {
      const s = Math.min(1, Math.max(0, (p.x + 1) / 2));
      const x = Math.pow(s, 0.6);
      p.set(x, p.y * 0.5 + 0.1 * x * x, p.z * 0.26);
    });
  });
}

registerDeco('bow', (a) => {
  const R = a.R;
  const group = new THREE.Group();
  const az = 0.62; // 정면 오른쪽
  const r = R * 0.8;
  const S = R * 0.22; // 리본 단위(고리 길이)
  const y0 = hullTop(a, r);
  const knotY = y0 + S * 0.55;
  const pink = gloss('#ffffff', { map: dotTexture(), glow: 0.22, rough: 0.28 });
  const plain = gloss('#ff5fa6', { glow: 0.26, rough: 0.28 });
  const bow = new THREE.Group();
  bow.position.set(Math.sin(az) * r, knotY, Math.cos(az) * r);
  bow.rotation.set(-0.18, az * 0.55, 0);
  bow.scale.setScalar(S);
  group.add(bow);
  const lobes = [];
  for (const s of [-1, 1]) {
    const piv = new THREE.Group();
    piv.scale.x = s;
    piv.rotation.z = s * 0.18;
    const l = mesh(lobeGeo(), pink, { scale: 1.05 });
    ink(l, (OL_R * R) / S / 1.05);
    piv.add(l);
    bow.add(piv);
    lobes.push(piv);
  }
  const knot = mesh(sphereGeo(1, 18, 12), plain, { scale: [0.24, 0.27, 0.2], pos: [0, 0, 0.04] });
  ink(knot, (OL_R * R) / S / 0.22);
  bow.add(knot);
  // 꼬리 두 가닥: 매듭 밑에서 나와 윗면을 따라 테두리 너머로 늘어진 납작한 띠(끝은 제비꼬리)
  const at = (rr, a2, y) => [Math.sin(a2) * rr, y, Math.cos(a2) * rr];
  const wd = new THREE.Vector3(Math.cos(az), 0, -Math.sin(az)); // 폭 방향 = 둘레 방향
  for (const s of [-1, 1]) {
    const g = geo(`bowTail|${a.form}|${R}|${s}`, () =>
      ribbonGeo(
        [
          at(r + S * 0.02, az + s * 0.02, knotY - S * 0.08),
          at(R * 0.9, az + s * 0.08, hullTop(a, R * 0.9) + R * 0.05),
          at(R * 1.0, az + s * 0.12, R * 0.085),
          at(R * 1.05, az + s * 0.15, R * 0.03),
          at(R * 1.065, az + s * 0.18, -R * 0.05),
        ],
        wd,
        S * 0.4,
        S * 0.09,
      ),
    );
    const tail = mesh(g, plain);
    ink(tail, OL_R * R * 0.9);
    group.add(tail);
  }
  const clk = clock();
  const st = { amp: 1 };
  return {
    group,
    update({ t, mood }) {
      const { k } = clk.tick(t);
      const amp = mood === 'happy' ? 2 : mood === 'shock' ? 1.6 : mood === 'hide' ? 0.2 : 1;
      st.amp += (amp - st.amp) * k;
      const sp = mood === 'shock' ? 16 : mood === 'happy' ? 6 : 3;
      // 통통: 살짝 튀어 오르며 고리가 눌렸다 펴진다
      const b = Math.abs(Math.sin(t * sp * 0.5));
      bow.position.y = knotY + S * 0.06 * b * st.amp;
      const sq = Math.sin(t * sp) * 0.05 * st.amp;
      for (let i = 0; i < lobes.length; i++) {
        const l = lobes[i];
        l.rotation.z = (i ? 1 : -1) * (0.18 + sq * 1.4);
        l.scale.set(i ? 1 : -1, 1 - sq, 1);
      }
      bow.rotation.z = Math.sin(t * sp * 0.25) * 0.05 * st.amp;
    },
  };
});

// ───────── 8. 프로펠러 모자 ─────────

let beanieTex = null;
/** 빵모자 조각 무늬: 빨강·노랑·파랑·초록 여섯 조각(가로로 이어진다). */
function beanieTexture() {
  if (beanieTex) return beanieTex;
  beanieTex = canvasTexture(256, 32, (ctx, w, h) => {
    const cols = ['#ff4d5e', '#ffd23f', '#3f8cff', '#ff4d5e', '#ffd23f', '#5cd65a'];
    cols.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect((i / cols.length) * w, 0, w / cols.length + 1, h);
    });
    // 조각 사이 박음질 줄
    ctx.fillStyle = 'rgba(43,26,94,0.45)';
    for (let i = 0; i < cols.length; i++) ctx.fillRect((i / cols.length) * w - 1, 0, 2.5, h);
  });
  return beanieTex;
}

/** 프로펠러 날: 허브 쪽이 가늘고 끝이 넓은 납작한 콩(돔 반지름 단위). +x 로 뻗는다. */
function bladeGeo() {
  return geo('propBlade', () =>
    deform(new THREE.SphereGeometry(1, 20, 12), (p) => {
      const s = (p.x + 1) / 2;
      p.set(0.08 + s * 0.62, p.y * 0.034, p.z * (0.07 + 0.09 * s)); // 끝이 넓다
    }),
  );
}

registerDeco('propeller', (a) => {
  const D = a.domeR;
  const group = new THREE.Group();
  const hat = new THREE.Group();
  hat.position.y = a.domeY;
  hat.scale.setScalar(D);
  group.add(hat);
  // 빵모자: 돔 꼭대기에 얹힌 작고 둥근 조각 모자(테두리가 유리에 살짝 묻힌다). 앞에서도 조각 무늬가 보이게 봉긋하다
  const CR = 0.5; // 모자 반지름
  const CH = 0.38; // 모자 높이
  const capY = (a.domeSY || 1.1) * Math.sqrt(1 - CR * CR) - 0.025;
  const cap = mesh(
    geo('beanieCap', () => new THREE.SphereGeometry(1, 36, 12, 0, TAU, 0, Math.PI / 2).scale(CR, CH, CR)),
    gloss('#ffffff', { map: beanieTexture(), glow: 0.24, rough: 0.42, coat: 0.6 }),
    { pos: [0, capY, 0] },
  );
  ink(cap, OL_D);
  const band = mesh(torusGeo(CR, 0.06, 10, 40), gloss('#3f6fe0', { glow: 0.25 }), { rot: [Math.PI / 2, 0, 0], pos: [0, capY + 0.01, 0] });
  ink(band, OL_D * 0.8);
  const topY = capY + CH;
  // 짧은 기둥 + 단추 허브. 날개는 피포의 더듬이 전구 위로 지나간다
  const stemH = 0.36;
  const stem = mesh(capsuleGeo(0.05, stemH, 4, 10), gloss('#fff2c8', { glow: 0.25 }), { pos: [0, topY + stemH / 2 - 0.05, 0] });
  ink(stem, OL_D * 0.8);
  const spinner = new THREE.Group();
  spinner.position.y = topY + stemH - 0.06;
  const hub = mesh(sphereGeo(1, 16, 12), gloss('#ff4d5e', { glow: 0.28 }), { scale: [0.1, 0.075, 0.1] });
  ink(hub, OL_D / 0.09);
  spinner.add(hub);
  const colors = ['#ff4d5e', '#ffd23f', '#3fa8ff'];
  for (let i = 0; i < 3; i++) {
    const arm = new THREE.Group();
    arm.rotation.y = (i * TAU) / 3;
    const b = mesh(bladeGeo(), gloss(colors[i], { glow: 0.28 }), { rot: [0.32, 0, 0] });
    ink(b, OL_D * 0.75);
    arm.add(b);
    spinner.add(arm);
  }
  hat.add(cap, band, stem, spinner);
  const st = { sp: 8, ph: 0 };
  const clk = clock();
  return {
    group,
    update({ t, mood }) {
      const { k, dt, snap } = clk.tick(t);
      const sp = mood === 'happy' ? 19 : mood === 'shock' ? 26 : mood === 'alert' ? 12 : mood === 'hide' ? 0 : 7.5;
      // 멈출 때는 천천히 풀리듯(빨리 돌던 날이 툭 서지 않게)
      st.sp += (sp - st.sp) * (sp < st.sp ? k * 0.5 : k);
      st.ph = snap ? t * st.sp : st.ph + st.sp * dt;
      spinner.rotation.y = st.ph;
      // 멋 부려 왼쪽으로 삐딱하게(돔 중심을 축으로 돌려 돔 면을 따라 미끄러진다). 피포의 더듬이 전구가 기둥 오른쪽으로 보인다
      const tilt = mood === 'shock' ? Math.sin(t * 30) * 0.04 : Math.sin(t * 1.6) * 0.03;
      hat.rotation.set(tilt * 0.5, 0, 0.15 + tilt);
    },
  };
});

// ───────── 9. 왕관 ─────────

/** 왕관 띠: 돔에 걸쳐 앉는 두께 있는 고리(돔 반지름 단위, 밑이 원점). */
function crownBandGeo() {
  return geo('crownBand', () => {
    const pts = [[0.5, -0.02], [0.555, -0.025], [0.58, 0.02], [0.605, 0.18], [0.61, 0.22], [0.585, 0.245], [0.55, 0.23], [0.53, 0.05], [0.5, -0.02]];
    return new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 48);
  });
}

registerDeco('crown', (a) => {
  const D = a.domeR;
  const group = new THREE.Group();
  // 돔 가운데를 축으로 뒤로 젖혀 쓴다(돔 면을 따라 미끄러져 앞 띠가 피포의 눈을 가리지 않는다. 더듬이는 왕관 안으로 솟는다)
  const pivot = new THREE.Group();
  pivot.position.y = a.domeY;
  pivot.scale.setScalar(D);
  group.add(pivot);
  const crown = new THREE.Group();
  // 띠 밑동 반지름 0.52 가 돔 면에 닿는 높이(돔은 세로 1.1 배)
  const baseY = (a.domeSY || 1.1) * Math.sqrt(1 - 0.52 * 0.52) - 0.02;
  crown.position.y = baseY;
  pivot.add(crown);
  const gold = goldMat();
  const band = mesh(crownBandGeo(), gold);
  ink(band, OL_D);
  crown.add(band);
  // 다섯 뾰족이(앞 하나가 가운데) + 끝에 진주
  const tips = [];
  const pearl = gloss('#fff4e4', { rough: 0.2, glow: 0.3, emissive: '#ffd9b0' });
  for (let i = 0; i < 5; i++) {
    const az = (i * TAU) / 5;
    const holder = new THREE.Group();
    holder.position.set(Math.sin(az) * 0.585, 0.2, Math.cos(az) * 0.585);
    holder.rotation.set(0, az, 0);
    const tilt = new THREE.Group();
    tilt.rotation.x = 0.16; // 바깥으로 살짝 벌어진다
    const h = 0.3;
    const p = mesh(puffTri(0.36), gold, { scale: [h * 0.85, h, h] });
    ink(p, OL_D / h);
    const ball = mesh(sphereGeo(1, 12, 10), pearl, { pos: [0, h + 0.035, 0], scale: 0.055 });
    ink(ball, OL_D / 0.055);
    tilt.add(p, ball);
    holder.add(tilt);
    crown.add(holder);
    tips.push(holder);
  }
  // 띠의 보석: 앞 루비(크게), 양옆 사파이어, 뒤쪽 에메랄드
  const gems = [
    [0, '#ff2f55', 0.085],
    [TAU / 10, '#3f7dff', 0.06],
    [-TAU / 10, '#3f7dff', 0.06],
    [(3 * TAU) / 10, '#2fd27a', 0.06],
    [(-3 * TAU) / 10, '#2fd27a', 0.06],
    [Math.PI, '#ff2f55', 0.07],
  ];
  for (const [az, c, s] of gems) {
    const g = mesh(sphereGeo(1, 14, 10), gloss(c, { rough: 0.12, glow: 0.45, metal: 0.1 }), {
      pos: [Math.sin(az) * 0.612, 0.11, Math.cos(az) * 0.612],
      rot: [0, az, 0],
      scale: [s, s * 1.15, s * 0.5],
    });
    ink(g, OL_D / s / 1.2);
    crown.add(g);
  }
  // 반짝이: 뾰족이 끝을 번갈아 반짝
  const sparks = [];
  for (let i = 0; i < 3; i++) {
    const sp = sparkle('#fff3c0', 0.55, 0);
    crown.add(sp);
    sparks.push(sp);
  }
  const glow = glowSprite('#ffd86b', 1.6, 0.18);
  glow.position.y = 0.2;
  crown.add(glow);
  const clk = clock();
  const st = { hop: 0 };
  return {
    group,
    update({ t, mood, lit = 1 }) {
      const { k } = clk.tick(t);
      const hop = mood === 'shock' ? 0.12 : mood === 'hide' ? -0.04 : 0;
      st.hop += (hop - st.hop) * k;
      const bounce = mood === 'happy' ? Math.abs(Math.sin(t * 7)) * 0.06 : 0;
      crown.position.y = baseY + st.hop + bounce;
      pivot.rotation.set(-0.3, 0, 0.07 + (mood === 'shock' ? Math.sin(t * 30) * 0.05 : Math.sin(t * 1.2) * 0.02));
      for (let i = 0; i < sparks.length; i++) {
        // 세 개가 차례로 다섯 뾰족이 중 하나에서 반짝
        const c = t * 0.9 + i * 0.37;
        const n = Math.floor(c);
        const f = c - n;
        const tip = tips[(n * 3 + i * 2) % 5];
        sparks[i].position.set(tip.position.x * 1.05, 0.56, tip.position.z * 1.05);
        sparks[i].material.opacity = lit * (mood === 'hide' ? 0.3 : 1) * Math.max(0, Math.sin(f * Math.PI)) ** 2;
        sparks[i].material.rotation = f * 1.5;
        sparks[i].scale.setScalar(0.35 + 0.35 * Math.sin(f * Math.PI));
      }
      glow.material.opacity = lit * (mood === 'hide' ? 0.06 : 0.16 + 0.05 * Math.sin(t * 2));
    },
  };
});

// ───────── 10. 천사 고리 ─────────

registerDeco('halo', (a) => {
  const D = a.domeR;
  const group = new THREE.Group();
  const halo = new THREE.Group();
  const y0 = a.domeTop + D * 0.52; // 피포의 더듬이 전구보다 위
  halo.position.y = y0;
  halo.scale.setScalar(D);
  group.add(halo);
  const ringMat = new THREE.MeshStandardMaterial({ color: '#fff0b8', emissive: new THREE.Color('#ffc83a'), emissiveIntensity: 1.1, roughness: 0.25, metalness: 0.2 });
  const ring = mesh(torusGeo(0.56, 0.07, 12, 56), ringMat, { rot: [Math.PI / 2, 0, 0] });
  ink(ring, OL_D * 0.7);
  // 부드러운 빛 번짐: 덧그리는 굵은 고리 + 둘레의 빛 몇 점
  const hazeMat = new THREE.MeshBasicMaterial({ color: '#ffd86b', transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false });
  const haze = mesh(torusGeo(0.56, 0.13, 10, 48), hazeMat, { rot: [Math.PI / 2, 0, 0] });
  haze.renderOrder = 5;
  halo.add(haze, ring);
  const dots = [];
  for (let i = 0; i < 4; i++) {
    const sp = glowSprite('#ffe08a', 0.6, 0.3);
    halo.add(sp);
    dots.push(sp);
  }
  const spark = sparkle('#fffbe0', 0.5, 0);
  halo.add(spark);
  const clk = clock();
  const st = { y: 0, glow: 1, sp: 0.6, ph: 0 };
  return {
    group,
    update({ t, mood, lit = 1 }) {
      const { k, dt, snap } = clk.tick(t);
      const y = mood === 'shock' ? 0.22 : mood === 'hide' ? -0.1 : mood === 'happy' ? 0.06 : 0;
      const gl = mood === 'hide' ? 0.35 : mood === 'happy' ? 1.3 : mood === 'alert' ? 0.85 : 1;
      const sp = mood === 'happy' ? 2.2 : mood === 'shock' ? 4 : 0.6;
      st.y += (y - st.y) * k;
      st.glow += (gl - st.glow) * k;
      st.sp += (sp - st.sp) * k;
      st.ph = snap ? t * st.sp : st.ph + st.sp * dt;
      // 둥실둥실
      halo.position.y = y0 + D * (st.y + Math.sin(t * 1.8) * 0.05);
      // 앞으로 더 숙여 동그란 고리가 또렷한 타원으로 보이게
      halo.rotation.set(0.22 + Math.sin(t * 1.1) * 0.05, 0, Math.sin(t * 1.3) * 0.07 + (mood === 'shock' ? Math.sin(t * 28) * 0.06 : 0));
      const L = lit * st.glow;
      ringMat.emissiveIntensity = 0.3 + 0.9 * L;
      hazeMat.opacity = 0.17 * L + 0.04 * Math.sin(t * 2.4) * L;
      for (let i = 0; i < dots.length; i++) {
        const ang = st.ph + (i * TAU) / 4;
        dots[i].position.set(Math.sin(ang) * 0.56, 0, Math.cos(ang) * 0.56);
        dots[i].material.opacity = 0.22 * L * (0.6 + 0.4 * Math.sin(t * 3 + i * 1.7));
      }
      const f = (t * 0.45) % 1;
      const sa = st.ph * 0.6 + 1.2;
      spark.position.set(Math.sin(sa) * 0.56, 0.05, Math.cos(sa) * 0.56);
      spark.material.opacity = lit * Math.min(1, st.glow) * Math.max(0, Math.sin(f * Math.PI * 2)) ** 3;
      spark.scale.setScalar(0.3 + 0.3 * Math.max(0, Math.sin(f * Math.PI * 2)));
    },
  };
});
