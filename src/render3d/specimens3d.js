// 표본 10종(3D). 컨셉 아트의 장난감 같은 3D 카툰: 둥글고 통통한 도형, 쨍한 색, 점토/플라스틱 재질, 가는 남색 외곽선.
//
// 약속
//   · 원점 = 표본의 눈에 보이는 중심. 반지름 ≈ 0.32 구 안에 든다(장면은 1.12 배로 그린다).
//   · 닭·젖소는 발끝이 y = −0.24 / −0.25 (장면이 원점을 땅 위 그만큼에 둔다). 하늘 무대에서는 같은 모습으로 떠 있다.
//   · 닭·젖소·드론·인공위성·반딧불이는 진행 방향(dir)으로 돌아서되 카메라(+z) 쪽으로 3/4 몸을 튼다.
//   · 별똥별은 dir 쪽 아래로 비스듬히 날고, 꼬리는 날아온 쪽(위·뒤)으로 뻗는다.
//   · 연은 아래 꼭짓점이 (0, −0.22, 0) 에 있다(장면이 거기서 연줄을 그린다).
//   · update(t, dir) 는 매 프레임 불린다. 도형·재질은 만들 때 한 번만 만들고, update 에서는 움직이기만 한다.
import {
  THREE,
  PAL,
  mat,
  basic,
  mesh,
  sphereGeo,
  roundBoxGeo,
  capsuleGeo,
  cylGeo,
  coneGeo,
  latheGeo,
  addOutline,
  outlineMaterial,
  glowSprite,
  canvasTexture,
  faceTexture,
  faceCap,
  rng,
} from './kit.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

/** 표본 종류(SPECIMENS 순서와 같다). */
export const SPECIMEN_KINDS = ['dandelion', 'firefly', 'balloon', 'kite', 'chicken', 'cow', 'drone', 'weather', 'satellite', 'meteor'];

const TAU = Math.PI * 2;
const OL = 0.014; // 기본 외곽선 굵기
const OL_S = 0.008; // 가는 부품 외곽선
const OL_XS = 0.0045; // 실·솜털 외곽선
const WHITE = '#f4f4fb'; // 흰 몸(너무 하얗면 번진다)
const NAVY = '#363a6e';

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
const UP = new THREE.Vector3(0, 1, 0);

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

/** 여러 조각을 한 도형으로 합친다(캐시). groups = true 면 조각마다 재질 묶음이 생긴다. */
function merged(key, make, groups = false) {
  return once(`g:${key}`, () => {
    let parts = make();
    // 색인 있는 도형과 없는 도형(둥근 상자)이 섞이면 모두 색인 없이 맞춘다
    if (parts.some((p) => !p.index) && parts.some((p) => p.index)) {
      parts = parts.map((p) => {
        if (!p.index) return p;
        const n = p.toNonIndexed();
        p.dispose();
        return n;
      });
    }
    const g = mergeGeometries(parts, groups);
    for (const p of parts) p.dispose();
    return g;
  });
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
function outlineWith(target, geo, t = OL, color = PAL.ink) {
  const o = new THREE.Mesh(geo, outlineMaterial(color, t));
  o.name = 'outline';
  o.castShadow = false;
  o.raycast = () => {};
  target.add(o);
  return o;
}

/** 빛을 받는 투명 재질(날개·솜털 등). 캐시. */
function glassy(color, opacity, { rough = 0.35, side = THREE.FrontSide } = {}) {
  return once(`glassy${color}|${opacity}|${rough}|${side}`, () => {
    const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: rough, metalness: 0, transparent: true, opacity, depthWrite: false, side });
    return m;
  });
}

/** 덧그리기 단색(빛·꼬리). 캐시. */
function additive(key, map, color = '#ffffff', opacity = 1, normal = false) {
  return once(`add:${key}`, () =>
    new THREE.MeshBasicMaterial({
      map,
      color: new THREE.Color(color),
      transparent: true,
      opacity,
      depthWrite: false,
      fog: false,
      side: THREE.DoubleSide,
      blending: normal ? THREE.NormalBlending : THREE.AdditiveBlending,
    }),
  );
}

/** 공용 텍스처(한 번만 그린다). */
const tex = (key, w, h, draw, opts) => once(`t:${key}`, () => canvasTexture(w, h, draw, opts));

const lerp = (a, b, k) => a + (b - a) * k;
const smooth01 = (x) => {
  const k = Math.min(1, Math.max(0, x));
  return k * k * (3 - 2 * k);
};

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

/** 한 메시만 보이게 켜고 끈다(깜빡이 등). */
function show(o, on) {
  if (o.visible !== on) o.visible = on;
}

// ───────── 얼굴 그림 ─────────

/** 크고 반짝이는 눈(남색, 아래로 갈수록 푸른빛) + 흰 반짝점 두 개. */
function paintEye(ctx, x, y, rx, ry) {
  const g = ctx.createLinearGradient(0, y - ry, 0, y + ry);
  g.addColorStop(0, '#13163a');
  g.addColorStop(0.55, '#252a66');
  g.addColorStop(1, '#5677d8');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(x - rx * 0.28, y - ry * 0.36, rx * 0.44, ry * 0.38, -0.3, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + rx * 0.36, y + ry * 0.44, rx * 0.2, 0, TAU);
  ctx.fill();
}

/** 감은 눈(아래로 둥근 곡선). */
function paintBlink(ctx, x, y, rx, lw) {
  ctx.beginPath();
  ctx.moveTo(x - rx, y);
  ctx.quadraticCurveTo(x, y + rx * 0.8, x + rx, y);
  ctx.strokeStyle = PAL.ink;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.stroke();
}

/** 발그레한 볼. */
function paintCheek(ctx, x, y, rx, ry, a = 0.6) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, `rgba(255,128,140,${a})`);
  g.addColorStop(0.6, `rgba(255,128,140,${a * 0.6})`);
  g.addColorStop(1, 'rgba(255,128,140,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** 작은 웃는 입. */
function paintSmile(ctx, x, y, w, lw) {
  ctx.beginPath();
  ctx.moveTo(x - w, y);
  ctx.quadraticCurveTo(x, y + w * 0.9, x + w, y);
  ctx.strokeStyle = PAL.ink;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.stroke();
}

// ───────── 1. 민들레 홀씨 ─────────

function buildDandelion() {
  const root = new THREE.Group();
  const sway = new THREE.Group(); // 솜털 가운데를 축으로 흔들린다
  sway.position.y = 0.05;
  root.add(sway);
  const spin = new THREE.Group(); // 천천히 돈다(입체감)
  sway.add(spin);

  // 솜털: 가운데에서 우산처럼 퍼지는 가는 털 + 끝의 잔털
  const N = 30;
  const hairs = once('dandHairs', () => {
    const r = rng(11);
    const list = [];
    for (let i = 0; i < N; i++) {
      const az = i * 2.39996 + r() * 0.35;
      const pol = 0.1 + 1.52 * Math.sqrt((i + 0.5) / N);
      const len = 0.18 + r() * 0.03;
      const d = new THREE.Vector3(Math.sin(pol) * Math.cos(az), Math.cos(pol), Math.sin(pol) * Math.sin(az));
      list.push({ d, len });
    }
    return list;
  });
  const hairGeo = merged('dandHair', () => {
    const parts = [];
    for (const { d, len } of hairs) {
      const tip = d.clone().multiplyScalar(len);
      parts.push(rod([0, 0, 0], tip.toArray(), 0.0058, { seg: 5 }));
      // 끝 갈래: 털 방향에서 ±35° 벌어진 잔털 두 가닥
      const side = new THREE.Vector3().crossVectors(d, Math.abs(d.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : UP).normalize();
      const base = d.clone().multiplyScalar(len * 0.82);
      for (const s of [-1, 1]) {
        const tw = d.clone().multiplyScalar(Math.cos(0.6)).addScaledVector(side, s * Math.sin(0.6)).normalize();
        parts.push(rod(base.toArray(), base.clone().addScaledVector(tw, 0.04).toArray(), 0.0042, { seg: 4 }));
      }
    }
    return parts;
  });
  const hair = mesh(hairGeo, mat('#fffaf0', { rough: 0.6, emissive: '#fff4e0', emissiveIntensity: 0.45 }), { cast: false });
  addOutline(hair, OL_XS, '#b89470');
  spin.add(hair);
  // 털끝 솜뭉치
  const puffGeo = merged('dandPuff', () => hairs.map(({ d, len }) => place(sphereGeo(0.013, 8, 6), d.clone().multiplyScalar(len).toArray())));
  spin.add(mesh(puffGeo, mat('#ffffff', { rough: 0.8, emissive: '#fff6e4', emissiveIntensity: 0.6 }), { cast: false }));
  // 폭신한 부피감(아주 옅은 반구)
  const domeGeo = once('g:dandDome', () => new THREE.SphereGeometry(0.19, 28, 10, 0, TAU, 0, 1.6));
  spin.add(mesh(domeGeo, glassy('#fffaf0', 0.2, { rough: 0.9 }), { cast: false }));
  // 가운데 매듭
  const knot = mesh(sphereGeo(0.022, 16, 12), mat('#f1d9a6', { rough: 0.6 }), { cast: false });
  addOutline(knot, OL_S, '#9c7442');
  sway.add(knot);
  // 부리(가는 줄기)와 씨앗
  sway.add(mesh(cylGeo(0.0055, 0.0065, 0.2, 6), mat('#eedbb0', { rough: 0.7 }), { cast: false, pos: [0, -0.1, 0] }));
  const seed = mesh(capsuleGeo(0.024, 0.1, 6, 12), mat('#b57a45', { rough: 0.65 }), { cast: false, pos: [0, -0.245, 0] });
  addOutline(seed, OL_S, '#5e3a22');
  sway.add(seed);
  // 밝은 하늘에서도 보이게 은은한 빛무리
  const halo = glowSprite('#fff1c8', 0.78, 0.42);
  halo.position.set(0, 0.06, -0.05);
  sway.add(halo);

  return {
    root,
    update(t) {
      sway.rotation.z = Math.sin(t * 1.8) * 0.14;
      sway.rotation.x = Math.sin(t * 1.3 + 1) * 0.08;
      spin.rotation.y = t * 0.6;
      root.position.y = Math.sin(t * 2.2) * 0.012;
    },
  };
}

// ───────── 2. 반딧불이 ─────────

function fireflyFace(ctx, s) {
  const c = s / 2;
  for (const sx of [-1, 1]) {
    const x = c + sx * 48;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(x, c - 8, 34, 38, 0, 0, TAU);
    ctx.fill();
    paintEye(ctx, x + sx * 2, c - 4, 22, 27);
    paintCheek(ctx, c + sx * 74, c + 40, 24, 16, 0.75);
  }
  paintSmile(ctx, c, c + 38, 12, 6);
}

function fireflyTailTextures() {
  // 배: 앞쪽(가슴 쪽) 1/3 은 마디 무늬가 있는 갈색, 뒤쪽은 빛나는 연두.
  const map = tex('ffTail2', 64, 128, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#7d7a34');
    g.addColorStop(0.12, '#c9e04a');
    g.addColorStop(0.3, '#ecff7a');
    g.addColorStop(1, '#fbffd8');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // 마디 고리
    ctx.strokeStyle = 'rgba(120,160,30,0.5)';
    ctx.lineWidth = 3;
    for (const y of [0.2, 0.34, 0.5]) {
      ctx.beginPath();
      ctx.moveTo(0, y * h);
      ctx.lineTo(w, y * h);
      ctx.stroke();
    }
  });
  const emap = tex('ffTailE2', 16, 128, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#000000');
    g.addColorStop(0.1, '#303a10');
    g.addColorStop(0.3, '#c8f040');
    g.addColorStop(1, '#ffffff');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
  return { map, emap };
}

function buildFirefly() {
  const root = new THREE.Group();
  const turn = new THREE.Group();
  root.add(turn);
  const body = new THREE.Group();
  turn.add(body);

  // 빛나는 배(개체마다 재질을 하나 복제해 밝기를 맥박치게 한다)
  const { map, emap } = fireflyTailTextures();
  const tailMat = once('ffTailMat', () => {
    const m = new THREE.MeshStandardMaterial({ color: '#ffffff', map, roughness: 0.4, emissive: new THREE.Color('#d8ff4a'), emissiveMap: emap, emissiveIntensity: 1, envMapIntensity: 0.8 });
    return m;
  }).clone();
  // 극(+y)을 앞(+z)으로 돌려 무늬가 몸통을 감싸는 고리가 되게 한다
  const tailGeo = once('g:ffTail', () => place(sphereGeo(1, 24, 18), [0, 0, 0], [Math.PI / 2, 0, 0]).scale(0.098, 0.09, 0.135));
  const tail = mesh(tailGeo, tailMat, { cast: false, pos: [0, -0.012, -0.115], rot: [0.3, 0, 0] });
  addOutline(tail, OL, '#4f6a1c');
  body.add(tail);
  // 가슴(주황 등판)
  const chest = mesh(sphereGeo(0.066, 20, 14), mat('#ff8a42', { rough: 0.55 }), { cast: false, pos: [0, 0.025, 0.02] });
  addOutline(chest, OL);
  body.add(chest);
  // 머리
  const head = mesh(sphereGeo(0.082, 28, 20), mat('#434a98', { rough: 0.45 }), { cast: false, pos: [0, 0.04, 0.1] });
  addOutline(head, OL);
  head.add(faceCap(0.082, faceTexture('sp-firefly', fireflyFace), { width: 1.85, height: 1.85 }));
  body.add(head);
  const headTurn = head; // 머리는 카메라 쪽으로 더 돌린다
  // 더듬이(끝에 작은 빛 방울)
  const tips = [
    [0.07, 0.2, 0.2],
    [-0.055, 0.21, 0.17],
  ];
  const antGeo = merged('ffAnt', () =>
    tips.map(([x, y, z]) => {
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(x * 0.3, 0.105, 0.125), new THREE.Vector3(x * 0.6, 0.16, 0.15), new THREE.Vector3(x, y, z)]);
      return new THREE.TubeGeometry(curve, 8, 0.0055, 5, false);
    }),
  );
  body.add(mesh(antGeo, mat('#2f3366', { rough: 0.6 }), { cast: false }));
  const tipGeo = merged('ffTips', () => tips.map((p) => place(sphereGeo(0.017, 12, 8), p)));
  body.add(mesh(tipGeo, mat('#eaff66', { emissive: '#d4ff4a', emissiveIntensity: 0.9, rough: 0.4 }), { cast: false }));
  // 다리(작은 남색 막대 여섯 개)
  const legGeo = merged('ffLegs', () => {
    const p = [];
    for (const sx of [-1, 1]) {
      for (const z of [0.055, 0.02, -0.02]) p.push(rod([sx * 0.025, -0.02, z], [sx * 0.06, -0.075, z + 0.012], 0.007, { capsule: true, seg: 5 }));
    }
    return p;
  });
  body.add(mesh(legGeo, mat('#2f3366', { rough: 0.6 }), { cast: false }));
  // 날개(반투명, 빠르게 파닥인다)
  const wingMat = glassy('#eef4ff', 0.6, { rough: 0.25 });
  const wings = [];
  for (const sx of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(sx * 0.025, 0.075, 0.035);
    const wGeo = once('g:ffWing', () => place(sphereGeo(0.1, 20, 12), [0, 0, 0], [0, 0, 0], [0.42, 0.08, 1]));
    const w = mesh(wGeo, wingMat, { cast: false, pos: [sx * 0.02, 0.012, -0.085], rot: [0.25, sx * 0.25, 0] });
    addOutline(w, OL_S, '#7a82c4');
    pivot.add(w);
    body.add(pivot);
    wings.push({ pivot, sx });
  }
  // 빛무리
  const glowBig = glowSprite('#d6ff5a', 0.8, 0.55);
  const glowCore = glowSprite('#f8ffc4', 0.32, 0.7);
  glowBig.position.set(0, -0.04, -0.17);
  glowCore.position.set(0, -0.04, -0.17);
  body.add(glowBig, glowCore);

  const yaw = follower();
  return {
    root,
    update(t, dir = 1) {
      const y = yaw(t, dir * 1.2);
      turn.rotation.y = y;
      headTurn.rotation.y = -y * 0.5;
      const pulse = 0.5 + 0.5 * Math.sin(t * 4.5);
      tailMat.emissiveIntensity = 0.35 + 0.55 * pulse;
      glowBig.material.opacity = 0.3 + 0.4 * pulse;
      glowBig.scale.setScalar(0.7 + 0.18 * pulse);
      glowCore.material.opacity = 0.45 + 0.45 * pulse;
      body.position.y = Math.sin(t * 3) * 0.018;
      body.rotation.x = Math.sin(t * 3 + 0.8) * 0.08;
      const flap = Math.abs(Math.sin(t * 26));
      for (const { pivot, sx } of wings) pivot.rotation.z = sx * (0.15 + 0.75 * flap);
    },
  };
}

// ───────── 3. 놓친 풍선 ─────────

function balloonGeo() {
  return once('g:balloon', () => {
    const pts = [];
    const N = 30;
    for (let i = 0; i <= N; i++) {
      const a = -Math.PI / 2 + (i / N) * Math.PI;
      const s = Math.sin(a);
      const c = Math.cos(a);
      let r = 0.172 * c;
      if (s < 0) r *= 1 - 0.2 * s * s; // 아래로 갈수록 홀쭉한 물방울
      pts.push([Math.max(r, 0), (s < 0 ? 0.205 : 0.172) * s]);
    }
    return latheGeo(pts, 40);
  });
}

function buildBalloon() {
  const root = new THREE.Group();
  const sway = new THREE.Group();
  sway.position.y = 0.07;
  root.add(sway);
  const red = '#f2473f';
  const body = mesh(balloonGeo(), mat(red, { rough: 0.2, envIntensity: 1.1 }), { cast: false });
  addOutline(body, OL);
  sway.add(body);
  // 반짝이(장난감 같은 하이라이트)
  const hiGeo = once('g:balloonHi', () => new THREE.SphereGeometry(0.176, 12, 8, 0.82, 0.3, 0.62, 0.5));
  sway.add(mesh(hiGeo, basic('#ffffff', { opacity: 0.7 }), { cast: false }));
  // 매듭
  const knotGeo = merged('balloonKnot', () => [
    place(coneGeo(0.03, 0.035, 14), [0, -0.214, 0], [Math.PI, 0, 0]),
    place(new THREE.TorusGeometry(0.016, 0.009, 8, 16), [0, -0.235, 0], [Math.PI / 2, 0, 0]),
  ]);
  const knot = mesh(knotGeo, mat('#c9303a', { rough: 0.35 }), { cast: false });
  addOutline(knot, OL_S);
  sway.add(knot);
  // 짧은 끈(흔들린다)
  const string = new THREE.Group();
  string.position.y = -0.24;
  const strGeo = once('g:balloonStr', () => {
    const c = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.025, -0.04, 0),
      new THREE.Vector3(-0.02, -0.085, 0.005),
      new THREE.Vector3(0.012, -0.13, 0),
      new THREE.Vector3(0.002, -0.16, 0),
    ]);
    return new THREE.TubeGeometry(c, 16, 0.0055, 5, false);
  });
  const str = mesh(strGeo, mat('#fff6e6', { rough: 0.7 }), { cast: false });
  addOutline(str, OL_XS, '#5a4f86');
  string.add(str);
  sway.add(string);

  return {
    root,
    update(t) {
      sway.rotation.z = Math.sin(t * 1.7) * 0.07;
      sway.rotation.y = Math.sin(t * 0.9) * 0.25;
      string.rotation.z = Math.sin(t * 3) * 0.18;
      string.rotation.x = Math.sin(t * 2.3) * 0.12;
      root.position.y = Math.sin(t * 2) * 0.014;
    },
  };
}

// ───────── 4. 연 ─────────

const KITE = { top: 0.258, side: 0.192, mid: 0.055, bot: -0.22 };

function kiteGeo() {
  return once('g:kite', () => {
    const k = 0.93; // 경사면(bevel)만큼 안쪽으로
    const P = [
      [0, KITE.top * k + 0.004],
      [KITE.side * k, KITE.mid],
      [0, KITE.bot * k + 0.004],
      [-KITE.side * k, KITE.mid],
    ];
    // 꼭짓점을 살짝 둥글린 마름모
    const shape = new THREE.Shape();
    const n = P.length;
    const near = (a, b, d) => [a[0] + (b[0] - a[0]) * d, a[1] + (b[1] - a[1]) * d];
    for (let i = 0; i < n; i++) {
      const prev = P[(i + n - 1) % n];
      const cur = P[i];
      const next = P[(i + 1) % n];
      const a = near(cur, prev, 0.08);
      const b = near(cur, next, 0.08);
      if (i === 0) shape.moveTo(a[0], a[1]);
      else shape.lineTo(a[0], a[1]);
      shape.quadraticCurveTo(cur[0], cur[1], b[0], b[1]);
    }
    shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.01, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 3, curveSegments: 6 });
    g.translate(0, 0, -0.005);
    // 앞면 그림이 연 전체에 맞게 UV 를 위치로 다시 준다
    const pos = g.attributes.position;
    const uv = g.attributes.uv;
    const x0 = -KITE.side;
    const y0 = KITE.bot;
    const W = KITE.side * 2;
    const H = KITE.top - KITE.bot;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) - x0) / W, (pos.getY(i) - y0) / H);
    return g;
  });
}

function kiteTexture() {
  return tex('kite', 256, 256, (ctx, w, h) => {
    const W = KITE.side * 2;
    const H = KITE.top - KITE.bot;
    const mx = w / 2;
    const my = (1 - (KITE.mid - KITE.bot) / H) * h;
    const RED = '#ff5145';
    const YEL = '#ffd23f';
    ctx.fillStyle = YEL;
    ctx.fillRect(0, 0, mx, my);
    ctx.fillRect(mx, my, w - mx, h - my);
    ctx.fillStyle = RED;
    ctx.fillRect(mx, 0, w - mx, my);
    ctx.fillRect(0, my, mx, h - my);
    // 살대
    ctx.strokeStyle = 'rgba(122,75,42,0.85)';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(mx, 8);
    ctx.lineTo(mx, h - 8);
    ctx.moveTo(10, my + 2);
    ctx.quadraticCurveTo(mx, my - 14, w - 10, my + 2);
    ctx.stroke();
    // 가운데 하얀 별 무늬(단위 길이로 그려 찌그러지지 않게)
    const sx = w / W;
    const sy = h / H;
    ctx.fillStyle = '#fffaf0';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 0.014 : 0.032;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      ctx.lineTo(mx + Math.cos(a) * r * sx, my - 4 + Math.sin(a) * r * sy);
    }
    ctx.closePath();
    ctx.fill();
  });
}

function buildKite() {
  const root = new THREE.Group();
  // 아래 꼭짓점(연줄이 붙는 곳)을 축으로 흔들린다
  const pivot = new THREE.Group();
  pivot.position.set(0, KITE.bot, 0);
  root.add(pivot);
  const kite = new THREE.Group();
  kite.position.y = -KITE.bot;
  pivot.add(kite);
  const geo = kiteGeo();
  const body = mesh(geo, mat('#ffffff', { map: kiteTexture(), rough: 0.6 }), { cast: false });
  outlineWith(body, smoothCopy('kite', geo), OL);
  kite.add(body);

  // 꼬리: 세 마디 끈 + 나비 리본 둘. 마디마다 위 끝을 축으로 돈다.
  const cordMat = mat('#fff4dc', { rough: 0.7 });
  const SEG = 0.085;
  const segGeo = once('g:kiteSeg', () => place(cylGeo(0.0055, 0.0055, SEG, 5), [0, -SEG / 2, 0]));
  const lobe = once('g:kiteLobe', () => {
    // 매듭에서 바깥으로 넓어지는 물방울(리본 한쪽)
    const pts = [];
    for (let i = 0; i <= 12; i++) {
      const a = (i / 12) * Math.PI;
      pts.push([Math.sin(a) * 0.026 * (0.35 + 0.65 * (i / 12)), 0.006 + 0.044 * (1 - Math.cos(a)) * 0.5 + (i / 12) * 0.006]);
    }
    return latheGeo(pts, 14);
  });
  const bowGeo = merged('kiteBow2', () => [
    place(lobe, [0.004, 0, 0], [0, 0, -Math.PI / 2 + 0.25], [1, 1, 0.42]),
    place(lobe, [-0.004, 0, 0], [0, 0, Math.PI / 2 - 0.25], [1, 1, 0.42]),
    place(sphereGeo(0.012, 10, 8), [0, 0, 0]),
  ]);
  const segs = [];
  let parent = root;
  let y0 = KITE.bot;
  const bowColors = ['#3f8fe8', '#2fc4a6'];
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Group();
    s.position.y = y0;
    parent.add(s);
    const cord = mesh(segGeo, cordMat, { cast: false });
    addOutline(cord, OL_XS, '#5a4f86');
    s.add(cord);
    if (i < 2) {
      const bow = mesh(bowGeo, mat(bowColors[i], { rough: 0.55 }), { cast: false, pos: [0, -SEG * 0.85, 0.004] });
      addOutline(bow, OL_S);
      s.add(bow);
    }
    segs.push(s);
    parent = s;
    y0 = -SEG * (i === 0 ? 1 : 0.95);
  }

  return {
    root,
    update(t) {
      pivot.rotation.z = Math.sin(t * 1.3) * 0.08;
      pivot.rotation.y = Math.sin(t * 0.9) * 0.22;
      kite.rotation.x = -0.12 + Math.sin(t * 1.7) * 0.05;
      segs[0].rotation.z = 0.2 + Math.sin(t * 4) * 0.35;
      segs[1].rotation.z = Math.sin(t * 4 - 1.2) * 0.55;
      segs[2].rotation.z = Math.sin(t * 4 - 2.4) * 0.6;
      root.position.y = Math.sin(t * 1.6) * 0.01;
    },
  };
}

// ───────── 5. 닭 ─────────

function chickenFace(ctx, s) {
  const c = s / 2;
  for (const sx of [-1, 1]) {
    paintEye(ctx, c + sx * 46, c - 12, 25, 31);
    paintCheek(ctx, c + sx * 72, c + 34, 28, 18, 0.75);
  }
}

function buildChicken() {
  const root = new THREE.Group();
  const turn = new THREE.Group();
  root.add(turn);
  const body = new THREE.Group(); // 걸음에 맞춰 통통 튄다
  turn.add(body);
  const white = mat(WHITE, { rough: 0.7 });

  const torso = mesh(sphereGeo(0.15, 28, 20), white, { pos: [0, -0.035, -0.015], scale: [0.92, 0.94, 1.05] });
  addOutline(torso, OL);
  body.add(torso);
  // 꽁지깃(위·뒤로 솟은 세 깃)
  const tailGeo = merged('chickTail', () => [
    place(sphereGeo(0.05, 14, 10), [0, 0.075, -0.15], [-0.65, 0, 0], [0.55, 1.25, 0.6]),
    place(sphereGeo(0.045, 14, 10), [0.035, 0.045, -0.16], [-0.85, 0, -0.3], [0.5, 1.2, 0.55]),
    place(sphereGeo(0.045, 14, 10), [-0.035, 0.045, -0.16], [-0.85, 0, 0.3], [0.5, 1.2, 0.55]),
  ]);
  const tail = mesh(tailGeo, white);
  addOutline(tail, OL);
  body.add(tail);
  // 날개(살짝 퍼덕인다)
  const wings = [];
  for (const sx of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(sx * 0.115, 0.02, -0.01);
    const wGeo = once('g:chickWing', () => {
      // 앞이 둥글고 뒤로 뾰족해지는 날개(물방울을 눕힌 것)
      const pts = [];
      for (let i = 0; i <= 16; i++) {
        const a = (i / 16) * Math.PI;
        const k = i / 16;
        pts.push([Math.sin(a) * 0.05 * (1 - 0.55 * k * k), -Math.cos(a) * 0.065 - k * 0.03]);
      }
      return place(latheGeo(pts, 20), [0, 0, 0], [-Math.PI / 2 - 0.5, 0, 0], [0.42, 1, 1]);
    });
    const w = mesh(wGeo, mat('#e6e8f6', { rough: 0.65 }), { pos: [sx * 0.018, -0.045, 0.02], rot: [0, sx * 0.12, 0] });
    pivot.add(w);
    body.add(pivot);
    wings.push({ pivot, sx });
  }
  // 머리
  const head = new THREE.Group();
  head.position.set(0, 0.105, 0.075);
  body.add(head);
  const skull = mesh(sphereGeo(0.102, 28, 20), white);
  addOutline(skull, OL);
  skull.add(faceCap(0.102, faceTexture('sp-chicken', chickenFace), { width: 1.75, height: 1.75 }));
  head.add(skull);
  // 볏
  const combGeo = merged('chickComb', () => [
    place(sphereGeo(0.034, 14, 10), [0, 0.098, 0.04], [0, 0, 0], [0.7, 1, 1]),
    place(sphereGeo(0.04, 14, 10), [0, 0.118, -0.005], [0, 0, 0], [0.7, 1, 1]),
    place(sphereGeo(0.032, 14, 10), [0, 0.1, -0.05], [0, 0, 0], [0.7, 1, 1]),
  ]);
  const comb = mesh(combGeo, mat('#f2443c', { rough: 0.5 }));
  addOutline(comb, OL);
  head.add(comb);
  // 부리
  const beak = mesh(coneGeo(0.032, 0.062, 16), mat('#ffb23a', { rough: 0.45 }), { pos: [0, -0.012, 0.118], rot: [Math.PI / 2, 0, 0], scale: [1.1, 1, 0.8] });
  addOutline(beak, OL_S);
  head.add(beak);
  // 턱 아래 붉은 살
  const wattle = mesh(sphereGeo(0.022, 12, 10), mat('#f2443c', { rough: 0.5 }), { pos: [0, -0.06, 0.09], scale: [0.85, 1.35, 0.8] });
  head.add(wattle);
  // 다리(주황, 발가락 셋)
  const legGeo = merged('chickLeg', () => [
    rod([0, 0, 0], [0, -0.082, 0.008], 0.013, { capsule: true, seg: 8 }),
    rod([0, -0.088, 0.008], [0, -0.09, 0.055], 0.01, { capsule: true, seg: 6 }),
    rod([0, -0.088, 0.008], [0.03, -0.09, 0.045], 0.01, { capsule: true, seg: 6 }),
    rod([0, -0.088, 0.008], [-0.03, -0.09, 0.045], 0.01, { capsule: true, seg: 6 }),
    rod([0, -0.088, 0.008], [0, -0.09, -0.025], 0.009, { capsule: true, seg: 6 }),
  ]);
  const legMat = mat('#f7a13a', { rough: 0.5 });
  const legs = [];
  for (const sx of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(sx * 0.055, -0.14, 0.005);
    const l = mesh(legGeo, legMat);
    addOutline(l, OL_S);
    hip.add(l);
    turn.add(hip);
    legs.push({ hip, sx });
  }

  const yaw = follower();
  return {
    root,
    update(t, dir = 1) {
      const y = yaw(t, dir * 1.05);
      turn.rotation.y = y;
      head.rotation.y = -y * 0.4; // 머리는 카메라 쪽으로 더 돌린다
      const ph = t * 7;
      body.position.y = Math.abs(Math.sin(ph)) * 0.014;
      body.rotation.x = 0.06 + Math.sin(ph * 2) * 0.03;
      head.position.z = 0.075 + Math.sin(ph) * 0.012;
      head.rotation.x = Math.sin(ph) * 0.08;
      for (const { hip, sx } of legs) hip.rotation.x = Math.sin(ph) * 0.55 * sx;
      const flap = Math.max(0, Math.sin(t * 9)) * 0.35;
      for (const { pivot, sx } of wings) pivot.rotation.z = sx * (0.05 + flap);
    },
  };
}

// ───────── 6. 젖소 ─────────

const COW_PATCH = '#2d3054';

function cowFace(blink) {
  return (ctx, s) => {
    const c = s / 2;
    // 오른쪽 눈 위의 얼룩
    ctx.fillStyle = COW_PATCH;
    ctx.beginPath();
    ctx.ellipse(c + 86, c - 70, 56, 46, -0.4, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(c + 50, c - 92, 30, 26, 0, 0, TAU);
    ctx.fill();
    for (const sx of [-1, 1]) {
      const x = c + sx * 50;
      const y = c - 14;
      if (blink) paintBlink(ctx, x, y, 24, 9);
      else {
        // 얼룩 위에서도 보이게 눈에 흰 테두리
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(x, y, 28, 33, 0, 0, TAU);
        ctx.fill();
        paintEye(ctx, x, y, 22, 27);
      }
      paintCheek(ctx, c + sx * 82, c + 26, 26, 17, 0.7);
    }
  };
}

function cowSpots() {
  return tex('cowSpots', 256, 184, (ctx, w, h) => {
    ctx.fillStyle = WHITE;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = COW_PATCH;
    const r = rng(5);
    // (u, v, 크기) — u: 0 = 오른쪽 옆구리, 0.5 = 왼쪽, 0.75 = 등 / v: 1 = 앞
    const spots = [
      [0.03, 0.6, 30],
      [0.11, 0.2, 22],
      [0.47, 0.55, 30],
      [0.58, 0.2, 20],
      [0.79, 0.4, 24],
      [0.68, 0.86, 16],
      [0.93, 0.85, 14],
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
  return tex('cowLeg', 16, 64, (ctx, w, h) => {
    ctx.fillStyle = WHITE;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#3d3a63';
    ctx.fillRect(0, h * 0.6, w, h);
  });
}

function buildCow() {
  const root = new THREE.Group();
  const turn = new THREE.Group();
  root.add(turn);
  const body = new THREE.Group();
  body.position.set(0, -0.025, -0.03);
  turn.add(body);
  const white = mat(WHITE, { rough: 0.7 });

  // 몸통: 누운 캡슐에 얼룩 무늬
  const torsoGeo = once('g:cowTorso', () => place(capsuleGeo(0.125, 0.42, 8, 24), [0, 0, 0], [Math.PI / 2, 0, 0]));
  const torso = mesh(torsoGeo, mat('#ffffff', { map: cowSpots(), rough: 0.7 }), { pos: [0, 0.005, 0], scale: [1.08, 1, 1] });
  addOutline(torso, OL);
  body.add(torso);
  // 젖
  body.add(mesh(sphereGeo(0.042, 14, 10), mat('#ffadc0', { rough: 0.55 }), { pos: [0, -0.112, -0.085], scale: [1, 0.7, 1] }));
  // 꼬리(끝에 털뭉치)
  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 0.06, -0.225);
  const tailGeo = once('g:cowTail', () => rod([0, 0, 0], [0, -0.13, -0.04], 0.011, { capsule: true, seg: 6 }));
  tailPivot.add(mesh(tailGeo, white));
  tailPivot.add(mesh(sphereGeo(0.026, 12, 10), mat(COW_PATCH, { rough: 0.8 }), { pos: [0, -0.14, -0.043], scale: [0.9, 1.25, 0.9] }));
  body.add(tailPivot);
  // 다리 넷: 위 끝을 축으로 걷는다(대각선 둘씩 같이)
  const legGeo = once('g:cowLeg', () => place(capsuleGeo(0.037, 0.15, 6, 14), [0, -0.075, 0]));
  const legMat = mat('#ffffff', { map: cowLegTexture(), rough: 0.7 });
  const legs = [];
  for (const [x, z, ph] of [
    [-0.07, 0.125, 0],
    [0.07, 0.125, 1],
    [-0.07, -0.125, 1],
    [0.07, -0.125, 0],
  ]) {
    const hip = new THREE.Group();
    hip.position.set(x, -0.075, z);
    const l = mesh(legGeo, legMat);
    addOutline(l, OL);
    hip.add(l);
    body.add(hip);
    legs.push({ hip, ph });
  }
  // 머리
  const head = new THREE.Group();
  head.position.set(0, 0.085, 0.215);
  body.add(head);
  const skull = mesh(sphereGeo(0.118, 28, 20), white);
  addOutline(skull, OL);
  const face = faceCap(0.118, faceTexture('sp-cow', cowFace(false)), { width: 1.8, height: 1.8 });
  const faceOpen = face.material.map;
  const faceBlink = faceTexture('sp-cow-blink', cowFace(true));
  skull.add(face);
  head.add(skull);
  // 귀(바깥 흰색 + 안쪽 분홍) — 한 도형에 재질 묶음 넷
  const earGeo = merged(
    'cowEars',
    () => [
      place(sphereGeo(0.05, 14, 10), [-0.125, 0.035, -0.01], [0, 0.3, 0.45], [1.15, 0.5, 0.7]),
      place(sphereGeo(0.05, 14, 10), [0.125, 0.035, -0.01], [0, -0.3, -0.45], [1.15, 0.5, 0.7]),
      place(sphereGeo(0.032, 12, 8), [-0.13, 0.035, 0.012], [0, 0.3, 0.45], [1.15, 0.45, 0.3]),
      place(sphereGeo(0.032, 12, 8), [0.13, 0.035, 0.012], [0, -0.3, -0.45], [1.15, 0.45, 0.3]),
    ],
    true,
  );
  const pink = mat('#ff9fb4', { rough: 0.6 });
  const ears = new THREE.Mesh(earGeo, [white, white, pink, pink]);
  outlineWith(ears, earGeo, OL);
  head.add(ears);
  // 작은 뿔
  const hornGeo = merged('cowHorns', () => [
    place(coneGeo(0.02, 0.05, 12), [-0.052, 0.112, -0.01], [0, 0, 0.45]),
    place(coneGeo(0.02, 0.05, 12), [0.052, 0.112, -0.01], [0, 0, -0.45]),
  ]);
  const horns = mesh(hornGeo, mat('#ffe9b8', { rough: 0.5 }));
  addOutline(horns, OL_S);
  head.add(horns);
  // 분홍 주둥이(우물우물)
  const snout = new THREE.Group();
  snout.position.set(0, -0.05, 0.075);
  head.add(snout);
  const muzzle = mesh(sphereGeo(0.07, 24, 16), mat('#ffa9bc', { rough: 0.5 }), { scale: [1.3, 0.82, 0.95] });
  addOutline(muzzle, OL);
  snout.add(muzzle);
  const nostrilGeo = merged('cowNostrils', () => [
    place(sphereGeo(0.012, 10, 8), [-0.033, 0.006, 0.063], [0, -0.4, 0], [1, 1.35, 0.5]),
    place(sphereGeo(0.012, 10, 8), [0.033, 0.006, 0.063], [0, 0.4, 0], [1, 1.35, 0.5]),
  ]);
  snout.add(mesh(nostrilGeo, mat('#c5577a', { rough: 0.6 }), { cast: false }));

  const yaw = follower();
  return {
    root,
    update(t, dir = 1) {
      const y = yaw(t, dir * 1.1);
      turn.rotation.y = y;
      head.rotation.y = -y * 0.42;
      const ph = t * 5;
      body.position.y = -0.025 + Math.abs(Math.sin(ph)) * 0.008;
      for (const { hip, ph: p } of legs) hip.rotation.x = Math.sin(ph + p * Math.PI) * 0.4;
      head.rotation.x = Math.sin(ph * 2) * 0.03 - 0.04;
      head.rotation.z = Math.sin(t * 1.3) * 0.06;
      snout.rotation.x = Math.sin(t * 6) * 0.07;
      snout.position.y = -0.05 + Math.sin(t * 6) * 0.004;
      face.material.map = t % 3.4 < 0.14 ? faceBlink : faceOpen;
      tailPivot.rotation.z = Math.sin(t * 3.2) * 0.45;
      tailPivot.rotation.x = 0.25 + Math.sin(t * 2.1) * 0.1;
    },
  };
}

// ───────── 7. 촬영 드론 ─────────

function droneLens(ctx, s) {
  const c = s / 2;
  // 렌즈 테 → 청록 홍채 → 검은 동공 → 반짝
  ctx.fillStyle = '#1c2046';
  ctx.beginPath();
  ctx.arc(c, c, 92, 0, TAU);
  ctx.fill();
  const g = ctx.createRadialGradient(c - 10, c - 14, 6, c, c, 74);
  g.addColorStop(0, '#e4ffff');
  g.addColorStop(0.45, '#5ff0ff');
  g.addColorStop(1, '#1d6fa2');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(c, c, 72, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#121638';
  ctx.beginPath();
  ctx.arc(c + 2, c + 3, 34, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(c - 22, c - 26, 20, 15, -0.5, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(c + 26, c + 28, 8, 0, TAU);
  ctx.fill();
}

function buildDrone() {
  const root = new THREE.Group();
  const view = new THREE.Group(); // 위가 조금 보이게 카메라 쪽으로 기울인다
  view.rotation.x = 0.32;
  root.add(view);
  const turn = new THREE.Group();
  view.add(turn);
  const tilt = new THREE.Group(); // 나아가는 쪽으로 앞머리를 숙인다
  turn.add(tilt);

  const body = mesh(roundBoxGeo(0.19, 0.07, 0.21, 0.032, 4), mat(WHITE, { rough: 0.45 }), { cast: false });
  addOutline(body, OL);
  tilt.add(body);
  // 주황 윗덮개
  const domeGeo = once('g:droneDome', () => new THREE.SphereGeometry(0.08, 24, 10, 0, TAU, 0, Math.PI / 2).scale(1, 0.55, 1.12));
  const dome = mesh(domeGeo, mat('#ff9a3c', { rough: 0.4 }), { cast: false, pos: [0, 0.028, -0.005] });
  addOutline(dome, OL);
  tilt.add(dome);
  // X 자 팔 + 모터
  const A = 0.165;
  const armGeo = merged('droneArms', () => {
    const p = [rod([-A, 0.005, -A], [A, 0.005, A], 0.016, { capsule: true, seg: 8 }), rod([-A, 0.005, A], [A, 0.005, -A], 0.016, { capsule: true, seg: 8 })];
    for (const [x, z] of [
      [A, A],
      [-A, A],
      [A, -A],
      [-A, -A],
    ])
      p.push(place(sphereGeo(0.03, 14, 10), [x, 0.02, z], [0, 0, 0], [1, 0.85, 1]));
    return p;
  });
  const arms = mesh(armGeo, mat('#4a5488', { rough: 0.45 }), { cast: false });
  addOutline(arms, OL_S);
  tilt.add(arms);
  // 날개(프로펠러): 두 날 + 회전 잔상 원판
  const propGeo = merged('droneProp', () => [
    place(roundBoxGeo(0.15, 0.007, 0.024, 0.0035, 2), [0, 0, 0], [0.12, 0, 0]),
    place(sphereGeo(0.012, 10, 8), [0, 0.004, 0]),
  ]);
  const propMat = mat('#2b3160', { rough: 0.4 });
  const props = [];
  const corners = [
    [A, A],
    [-A, A],
    [A, -A],
    [-A, -A],
  ];
  corners.forEach(([x, z], i) => {
    const p = mesh(propGeo, propMat, { cast: false, pos: [x, 0.05, z] });
    tilt.add(p);
    props.push({ p, s: i % 3 === 0 ? 1 : -1 });
  });
  const blurGeo = merged('droneBlur', () => corners.map(([x, z]) => place(cylGeo(0.085, 0.085, 0.002, 28), [x, 0.05, z])));
  tilt.add(mesh(blurGeo, glassy('#eef3ff', 0.34, { rough: 0.3 }), { cast: false }));
  const ringGeo = merged('droneRing', () => corners.map(([x, z]) => place(new THREE.TorusGeometry(0.085, 0.0045, 6, 32), [x, 0.05, z], [Math.PI / 2, 0, 0])));
  tilt.add(mesh(ringGeo, glassy('#ffffff', 0.7, { rough: 0.3 }), { cast: false }));
  // 다리(착륙대)
  const skidGeo = merged('droneSkid', () => {
    const p = [];
    for (const sx of [-1, 1]) {
      p.push(rod([sx * 0.055, -0.03, 0.03], [sx * 0.075, -0.095, 0.035], 0.008, { capsule: true, seg: 6 }));
      p.push(rod([sx * 0.055, -0.03, -0.05], [sx * 0.075, -0.095, -0.055], 0.008, { capsule: true, seg: 6 }));
      p.push(rod([sx * 0.075, -0.098, -0.09], [sx * 0.075, -0.098, 0.075], 0.009, { capsule: true, seg: 6 }));
    }
    return p;
  });
  const skids = mesh(skidGeo, mat('#4a5488', { rough: 0.45 }), { cast: false });
  addOutline(skids, OL_S);
  tilt.add(skids);
  // 짐벌 카메라(눈)
  const cam = mesh(sphereGeo(0.054, 24, 16), mat('#3a4170', { rough: 0.35 }), { cast: false, pos: [0, -0.045, 0.085] });
  addOutline(cam, OL);
  cam.add(faceCap(0.054, faceTexture('sp-drone-lens', droneLens), { width: 1.6, height: 1.6 }));
  tilt.add(cam);
  // 깜빡이: 앞 오른쪽 빨강(깜빡), 앞 왼쪽 초록
  const ledOn = mat('#ff5a4e', { emissive: '#ff3a30', emissiveIntensity: 1.4, rough: 0.3 });
  const ledOff = mat('#9a4a5a', { rough: 0.4 });
  const red = mesh(sphereGeo(0.014, 10, 8), ledOn, { cast: false, pos: [0.09, 0.0, 0.1] });
  const green = mesh(sphereGeo(0.013, 10, 8), mat('#5ce07a', { emissive: '#2fd05a', emissiveIntensity: 1, rough: 0.3 }), { cast: false, pos: [-0.09, 0.0, 0.1] });
  const redGlow = glowSprite('#ff5a4e', 0.16, 0.85);
  redGlow.position.copy(red.position);
  tilt.add(red, green, redGlow);

  const yaw = follower(6);
  return {
    root,
    update(t, dir = 1) {
      turn.rotation.y = yaw(t, dir * 0.8);
      tilt.rotation.x = 0.1 + Math.sin(t * 1.9) * 0.03;
      tilt.rotation.z = Math.sin(t * 1.4) * 0.05;
      root.position.y = Math.sin(t * 2.6) * 0.016;
      for (const { p, s } of props) p.rotation.y = s * t * 31;
      const on = Math.sin(t * 8) > 0;
      red.material = on ? ledOn : ledOff;
      show(redGlow, on);
    },
  };
}

// ───────── 8. 기상 관측 풍선 ─────────

function weatherTexture() {
  return tex('weather', 256, 128, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#fffaf0');
    g.addColorStop(1, '#f6ead8');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // 고무 이음매(세로 줄)
    ctx.strokeStyle = 'rgba(176,150,196,0.55)';
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

function buildWeather() {
  const root = new THREE.Group();
  const halo = glowSprite('#fff2d2', 0.8, 0.38);
  halo.position.set(0, 0.11, -0.1);
  root.add(halo);
  const ball = mesh(sphereGeo(0.19, 36, 26), mat('#ffffff', { map: weatherTexture(), rough: 0.32, envIntensity: 0.9 }), { cast: false, pos: [0, 0.11, 0], scale: [1, 1.07, 1] });
  addOutline(ball, OL);
  root.add(ball);
  // 목
  const neckGeo = once('g:weatherNeck', () =>
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
  const neck = mesh(neckGeo, mat('#f3dfc0', { rough: 0.5 }), { cast: false, pos: [0, -0.07, 0] });
  addOutline(neck, OL_S);
  root.add(neck);
  // 매달린 짐: 줄 → 주황 반사판 → 관측 상자(목 아래를 축으로 흔들린다)
  const hang = new THREE.Group();
  hang.position.y = -0.105;
  root.add(hang);
  const lineGeo = merged('weatherLine', () => [
    rod([0, 0, 0], [0, -0.045, 0], 0.0045, { seg: 5 }),
    rod([0, -0.095, 0], [0, -0.12, 0], 0.0045, { seg: 5 }),
    rod([0.03, -0.205, 0.01], [0.044, -0.245, 0.01], 0.004, { seg: 5 }),
    place(sphereGeo(0.009, 8, 6), [0.044, -0.248, 0.01]),
  ]);
  hang.add(mesh(lineGeo, mat('#5f6396', { rough: 0.6 }), { cast: false }));
  const refl = mesh(once('g:weatherRefl', () => new THREE.OctahedronGeometry(0.03, 0)), mat('#ff9a3c', { rough: 0.45, flat: true }), { cast: false, pos: [0, -0.07, 0], rot: [0, 0.6, 0], scale: [1, 1.15, 0.45] });
  hang.add(refl);
  const box = mesh(roundBoxGeo(0.1, 0.075, 0.08, 0.016, 3), mat('#fff4dc', { rough: 0.55 }), { cast: false, pos: [0, -0.16, 0] });
  addOutline(box, OL);
  hang.add(box);
  hang.add(mesh(roundBoxGeo(0.104, 0.022, 0.084, 0.008, 2), mat('#3f6fd0', { rough: 0.5 }), { cast: false, pos: [0, -0.153, 0] }));
  const ledOn = mat('#ff5a4e', { emissive: '#ff3a30', emissiveIntensity: 1.4, rough: 0.3 });
  const ledOff = mat('#b87a7a', { rough: 0.45 });
  const led = mesh(sphereGeo(0.011, 10, 8), ledOn, { cast: false, pos: [0.026, -0.18, 0.04] });
  const ledGlow = glowSprite('#ff5a4e', 0.12, 0.8);
  ledGlow.position.copy(led.position);
  hang.add(led, ledGlow);

  return {
    root,
    update(t) {
      root.position.y = Math.sin(t * 1.5) * 0.014;
      hang.rotation.z = Math.sin(t * 1.6) * 0.16;
      hang.rotation.x = Math.sin(t * 1.1) * 0.08;
      ball.rotation.y = t * 0.25;
      const on = Math.sin(t * 5) > 0.2;
      led.material = on ? ledOn : ledOff;
      show(ledGlow, on);
    },
  };
}

// ───────── 9. 인공위성 ─────────

function foilTexture() {
  return tex('satFoil', 128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#f7b93a';
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
      ctx.fillStyle = r() > 0.5 ? 'rgba(255,240,170,0.4)' : 'rgba(214,140,40,0.22)';
      ctx.fill();
    }
    // 테두리 띠
    ctx.strokeStyle = 'rgba(160,96,24,0.75)';
    ctx.lineWidth = 7;
    ctx.strokeRect(3, 3, w - 6, h - 6);
  });
}

function panelTexture() {
  return tex('satPanel', 256, 168, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#4f94f4');
    g.addColorStop(1, '#2457c8');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(190,226,255,0.75)';
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
    // 비스듬한 반사
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath();
    ctx.moveTo(w * 0.18, 0);
    ctx.lineTo(w * 0.42, 0);
    ctx.lineTo(w * 0.26, h);
    ctx.lineTo(w * 0.02, h);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#d6dbf2';
    ctx.lineWidth = 10;
    ctx.strokeRect(0, 0, w, h);
  });
}

function buildSatellite() {
  const root = new THREE.Group();
  const turn = new THREE.Group();
  root.add(turn);
  const rig = new THREE.Group(); // 천천히 기우뚱
  turn.add(rig);

  const body = mesh(roundBoxGeo(0.13, 0.15, 0.12, 0.022, 3), mat('#ffffff', { map: foilTexture(), rough: 0.32, metal: 0.2, envIntensity: 0.8 }), { cast: false });
  addOutline(body, OL);
  rig.add(body);
  // 팔대 + 접시 받침 + 안테나 막대(한 도형)
  const strutGeo = merged('satStruts', () => [
    rod([-0.06, 0, 0], [-0.1, 0, 0], 0.009, { seg: 8 }),
    rod([0.06, 0, 0], [0.1, 0, 0], 0.009, { seg: 8 }),
    rod([0, 0.07, 0.03], [0, 0.105, 0.055], 0.008, { seg: 6 }),
    rod([-0.035, 0.07, -0.035], [-0.055, 0.15, -0.045], 0.005, { seg: 5 }),
  ]);
  rig.add(mesh(strutGeo, mat('#a3a8cf', { rough: 0.45 }), { cast: false }));
  // 태양 전지판
  const pMat = mat('#ffffff', { map: panelTexture(), rough: 0.3, envIntensity: 0.9 });
  const panels = [];
  for (const sx of [-1, 1]) {
    const p = mesh(roundBoxGeo(0.19, 0.115, 0.012, 0.005, 2), pMat, { cast: false, pos: [sx * 0.19, 0, 0] });
    addOutline(p, OL_S);
    rig.add(p);
    panels.push(p);
  }
  // 접시 안테나: 두께 있는 그릇을 앞 위로 기울인다
  const dishGeo = once('g:satDish', () => {
    const pts = [];
    for (let i = 0; i <= 10; i++) {
      const r = (i / 10) * 0.07;
      pts.push([r, (r * r) / 0.14]);
    }
    pts.push([0.074, 0.037]);
    for (let i = 10; i >= 0; i--) {
      const r = (i / 10) * 0.064;
      pts.push([r, (r * r) / 0.14 + 0.012]);
    }
    return latheGeo(pts, 32);
  });
  const dishG = new THREE.Group();
  dishG.position.set(0, 0.105, 0.055);
  dishG.rotation.x = Math.PI / 2 - 0.5;
  rig.add(dishG);
  const dish = mesh(dishGeo, mat('#f2f3ff', { rough: 0.45 }), { cast: false });
  addOutline(dish, OL_S);
  dishG.add(dish);
  dishG.add(mesh(cylGeo(0.0045, 0.0045, 0.06, 6), mat('#a3a8cf', { rough: 0.45 }), { cast: false, pos: [0, 0.042, 0] }));
  const red = mat('#ff6b5e', { emissive: '#ff3a30', emissiveIntensity: 0.5, rough: 0.35 });
  dishG.add(mesh(sphereGeo(0.012, 10, 8), red, { cast: false, pos: [0, 0.074, 0] }));
  rig.add(mesh(sphereGeo(0.012, 10, 8), red, { cast: false, pos: [-0.055, 0.155, -0.045] }));
  // 깜빡이
  const ledOn = mat('#ff5a4e', { emissive: '#ff3a30', emissiveIntensity: 1.4, rough: 0.3 });
  const ledOff = mat('#b4774a', { rough: 0.45 });
  const led = mesh(sphereGeo(0.012, 10, 8), ledOn, { cast: false, pos: [0.032, -0.045, 0.063] });
  const ledGlow = glowSprite('#ff5a4e', 0.13, 0.8);
  ledGlow.position.copy(led.position);
  rig.add(led, ledGlow);

  const yaw = follower(4);
  return {
    root,
    update(t, dir = 1) {
      turn.rotation.y = yaw(t, dir * 0.4);
      rig.rotation.z = -0.22 * (turn.rotation.y / 0.4) + Math.sin(t * 0.8) * 0.06;
      rig.rotation.x = 0.1 + Math.sin(t * 0.6) * 0.05;
      root.position.y = Math.sin(t * 1.2) * 0.01;
      for (const p of panels) p.rotation.x = Math.sin(t * 0.7) * 0.15;
      const on = Math.sin(t * 5) > 0.3;
      led.material = on ? ledOn : ledOff;
      show(ledGlow, on);
    },
  };
}

// ───────── 10. 별똥별 ─────────

function starGeo() {
  return once('g:star', () => {
    const OUT = 0.155;
    const IN = 0.088;
    const D = 0.07;
    const g = new THREE.SphereGeometry(1, 72, 48);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);
      const a = Math.atan2(y, x);
      const k = Math.pow((1 + Math.cos(5 * (a - Math.PI / 2))) / 2, 1.5); // 뿔끝에서 1
      const R = IN + (OUT - IN) * k;
      const rho = Math.min(1, Math.hypot(x, y));
      p.setXYZ(i, x * R, y * R, z * D * (1 - 0.3 * k * rho * rho));
    }
    g.deleteAttribute('uv');
    g.deleteAttribute('normal');
    const m = mergeVertices(g, 1e-5);
    g.dispose();
    m.computeVertexNormals();
    // 앞에서 비춘 평면 UV(가운데가 밝은 그라디언트용)
    const mp = m.attributes.position;
    const uv = new Float32Array(mp.count * 2);
    for (let i = 0; i < mp.count; i++) {
      uv[i * 2] = mp.getX(i) / (2 * OUT) + 0.5;
      uv[i * 2 + 1] = mp.getY(i) / (2 * OUT) + 0.5;
    }
    m.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    return m;
  });
}

/** 꼬리 그림(화소마다 계산): 왼쪽 끝이 별, 오른쪽으로 가늘어지며 사라진다. */
function tailTexture(key, core) {
  return tex(key, 256, 64, (ctx, w, h) => {
    const img = ctx.createImageData(w, h);
    const d = img.data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const u = x / (w - 1);
        const half = (core ? 0.36 : 0.92) * Math.pow(1 - u, 0.75) + 0.02;
        const v = Math.abs((y + 0.5) / h - 0.5) * 2;
        const across = 1 - smooth01(v / half);
        const along = Math.pow(1 - u, core ? 1.6 : 1.15) * smooth01(u / 0.06);
        let a = across * along;
        let r;
        let gg;
        let b;
        if (core) {
          r = 255;
          gg = lerp(252, 214, u);
          b = lerp(230, 120, u);
        } else {
          // 노랑 → 주황 → 분홍
          r = 255;
          gg = u < 0.5 ? lerp(214, 150, u * 2) : lerp(150, 110, (u - 0.5) * 2);
          b = u < 0.5 ? lerp(80, 70, u * 2) : lerp(70, 150, (u - 0.5) * 2);
          // 가는 줄기 두 가닥
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

function starTexture() {
  return tex('starGrad', 128, 128, (ctx, w) => {
    const g = ctx.createRadialGradient(w * 0.46, w * 0.54, 2, w / 2, w / 2, w * 0.5);
    g.addColorStop(0, '#fffbe6');
    g.addColorStop(0.35, '#ffe36a');
    g.addColorStop(0.7, '#ffc23a');
    g.addColorStop(1, '#ff8a2a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, w);
  });
}

function buildMeteor() {
  const root = new THREE.Group();
  // 꼬리(날아온 쪽으로 뻗는다): 색이 있는 보통 섞기 겹 + 덧그리기 속심
  const tail = new THREE.Group();
  root.add(tail);
  const LEN = 0.66;
  const tailPlane = once('g:meteorTail', () => {
    const g = new THREE.PlaneGeometry(1, 1);
    g.translate(0.5, 0, 0);
    return g;
  });
  const outer = mesh(tailPlane, additive('meteorOuter', tailTexture('tailOuter', false), '#ffffff', 0.9, true), { cast: false, pos: [-0.02, 0, -0.06], scale: [LEN, 0.27, 1] });
  const core = mesh(tailPlane, additive('meteorCore', tailTexture('tailCore', true), '#ffffff', 1), { cast: false, pos: [-0.02, 0, -0.05], scale: [LEN * 0.8, 0.2, 1] });
  outer.renderOrder = 3;
  core.renderOrder = 4;
  tail.add(outer, core);
  // 반짝이: 꼬리를 따라 흘러가며 사라진다
  const sparkles = [];
  for (let i = 0; i < 4; i++) {
    const m = new THREE.SpriteMaterial({ map: sparkleTexture(), color: new THREE.Color(i % 2 ? '#fff3b0' : '#ffffff'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    const s = new THREE.Sprite(m);
    s.renderOrder = 6;
    s.raycast = () => {};
    tail.add(s);
    sparkles.push({ s, k: i / 4, side: (i % 2 ? 1 : -1) * (0.3 + 0.4 * ((i * 7) % 3) / 2) });
  }
  // 빛무리
  const glow = glowSprite('#ffcf4a', 0.85, 0.55);
  const glowCore = glowSprite('#fff6d0', 0.4, 0.6);
  root.add(glow, glowCore);
  // 별(통통한 오각 별)
  const spin = new THREE.Group();
  root.add(spin);
  const star = mesh(starGeo(), mat('#ffffff', { map: starTexture(), emissive: '#ff9a2e', emissiveIntensity: 0.45, rough: 0.28, envIntensity: 1 }), { cast: false });
  addOutline(star, OL, '#9a4a1c');
  spin.add(star);
  // 반짝 하이라이트
  const hiGeo = once('g:starHi', () => new THREE.SphereGeometry(0.03, 12, 8));
  const hi = mesh(hiGeo, basic('#ffffff', { opacity: 0.75 }), { cast: false, pos: [-0.035, 0.04, 0.052], rot: [0, 0, -0.6], scale: [1, 0.55, 0.3] });
  spin.add(hi);

  const ANG = 0.42; // 내려가는 기울기(라디안)
  return {
    root,
    update(t, dir = 1) {
      tail.rotation.z = dir > 0 ? Math.PI - ANG : ANG;
      const flick = 1 + Math.sin(t * 18) * 0.05 + Math.sin(t * 31) * 0.03;
      outer.scale.set(LEN * flick, 0.27 * (1 + Math.sin(t * 13) * 0.04), 1);
      core.scale.set(LEN * 0.8 * flick, 0.2, 1);
      spin.rotation.z = Math.sin(t * 2) * 0.25 - dir * t * 0.6;
      spin.rotation.y = Math.sin(t * 1.7) * 0.35;
      const pulse = 0.5 + 0.5 * Math.sin(t * 6);
      glow.material.opacity = 0.45 + 0.2 * pulse;
      glow.scale.setScalar(0.8 + 0.08 * pulse);
      for (const sp of sparkles) {
        const k = (t * 1.1 + sp.k) % 1;
        sp.s.position.set(0.08 + k * 0.5, sp.side * 0.09 * (1 - k * 0.5), 0.01);
        sp.s.scale.setScalar(0.09 * (1 - k * 0.55) * (0.8 + 0.4 * Math.abs(Math.sin(t * 9 + sp.k * 7))));
        sp.s.material.opacity = Math.sin(Math.PI * Math.min(1, k * 1.15)) * 0.95;
      }
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
 * @returns {{ root: THREE.Object3D, update(t: number, dir: number): void }}
 *   root 의 원점이 표본의 중심. update(t, dir) 는 매 프레임 부른다(t = 초, dir = 진행 방향 −1 | 1).
 */
export function createSpecimen(kind) {
  const make = BUILD[kind] || BUILD.dandelion;
  const sp = make();
  sp.root.name = `specimen:${kind}`;
  const cast = GROUND.has(kind);
  sp.root.traverse((o) => {
    if (o.isMesh && o.name !== 'outline' && !o.material.transparent) o.castShadow = cast && o.castShadow;
  });
  sp.update(0, 1);
  return sp;
}
