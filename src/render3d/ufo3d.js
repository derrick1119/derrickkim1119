// 3D 기체 8형태. 조종사는 피포(pipo.js). 사탕처럼 래커 칠한 남보라 접시(칠한 광택 줄, 옅은 판 이음매)에 반들한 금빛 테,
// 통통한 범퍼 고리에 박힌 알약 모양 청록 조명, 아래쪽 발광부, 유리 돔(피포의 더듬이가 돔을 뚫고 나와 있다). 외곽선은 피포와 같은 색.
// 모델 단위: 원점 = 기체 중심, 윗면이 +y. 장면이 화면 너비에 맞춰 배율을 정하고, 윗면이 보이게 앞으로 기울인다.
import {
  THREE,
  PAL,
  tone,
  mat,
  mesh,
  sphereGeo,
  capsuleGeo,
  cylGeo,
  torusGeo,
  latheGeo,
  roundBoxGeo,
  addOutline,
  glowSprite,
  canvasTexture,
} from './kit.js';
import { createPipo } from './pipo.js';

/** 윗면이 카메라를 보도록 앞으로 기울이는 각도(라디안). */
export const UFO_TILT = 0.36;

// 선체: 사탕처럼 래커 칠한 남보라(피포의 보라와 어울리게) + 반들반들한 금빛 테 + 청록 알약 조명.
// 재질 문법: 윗면은 꼭대기로 갈수록 밝아지는 칠한 그라데이션에 아주 옅은 판 이음매, 투명 코팅(clearcoat)으로
// 하늘이 매끈하게 비친다. 아랫면은 더 짙은 남색 래커. 테두리는 통통한 범퍼 고리에 알약 조명이 박혀 있다.
const HULL = '#352c94';
const HULL_DARK = '#1a1a54';
const BUMPER = '#22216a';
const GOLD = '#ffc444';
const AMBER = '#ffb347';
const DIM = '#24505c';
/** 외곽선 색: 피포와 같은 보라 기운 남색(조종사와 기체가 한 장난감처럼 보이게). */
const LINE = '#2b1a5e';

// ───────── 선체 재질(모든 기체가 함께 쓴다) ─────────

let hullTexCache = null;
/** 윗면 칠: 테두리(v=0)는 조금 짙고 꼭대기(v=1)로 갈수록 밝다 + 방사형 판 이음매 8줄 + 동심 홈 한 줄. 색은 재질 색이 곱한다. */
function hullTexture() {
  if (hullTexCache) return hullTexCache;
  hullTexCache = canvasTexture(512, 256, (ctx, w, h) => {
    // 캔버스 아래 = 테두리(v=0), 위 = 꼭대기(v=1)
    const g = ctx.createLinearGradient(0, h, 0, 0);
    g.addColorStop(0, '#b4b4c8');
    g.addColorStop(0.35, '#d6d6e4');
    g.addColorStop(0.75, '#f4f4fa');
    g.addColorStop(1, '#ffffff');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // 판 이음매(새긴 선: 짙은 선 + 옆의 밝은 선), 꼭대기 단 아래까지만
    const y0 = h * 0.08;
    const y1 = h * 0.52;
    for (let i = 0; i < 8; i++) {
      const x = ((i + 0.5) / 8) * w;
      ctx.fillStyle = 'rgba(40,36,90,0.42)';
      ctx.fillRect(x - 1.5, h - y1, 3, y1 - y0);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(x + 1.5, h - y1, 2, y1 - y0);
    }
    // 동심 홈
    ctx.fillStyle = 'rgba(40,36,90,0.35)';
    ctx.fillRect(0, h - h * 0.3 - 2, w, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(0, h - h * 0.3 + 1, w, 2);
  });
  hullTexCache.anisotropy = 8;
  return hullTexCache;
}

let hullGlossCache = null;
/**
 * 윗면의 칠한 광택(발광 지도): 바탕은 아주 짙은 남보라(그늘에서도 색이 살아 있게), 앞 왼쪽 비탈에는
 * 장난감 래커처럼 또렷한 흰 반사 줄 하나와 작은 점 하나. 기체는 y 축으로 돌지 않으므로 반사가 늘 왼쪽 위에 머문다.
 * u = 0 이 정면(+z), u = 0.75 가 왼쪽(−x).
 */
function hullGloss() {
  if (hullGlossCache) return hullGlossCache;
  hullGlossCache = canvasTexture(512, 256, (ctx, w, h) => {
    ctx.fillStyle = '#100f48';
    ctx.fillRect(0, 0, w, h);
    const streak = (u0, u1, v, th, a) => {
      // 캔버스 아래 = 테두리(v=0)
      const y = h * (1 - v);
      const g = ctx.createLinearGradient(0, y - th, 0, y + th);
      g.addColorStop(0, 'rgba(220,226,255,0)');
      g.addColorStop(0.5, `rgba(220,226,255,${a})`);
      g.addColorStop(1, 'rgba(220,226,255,0)');
      ctx.fillStyle = g;
      ctx.save();
      ctx.beginPath();
      // 끝이 가늘어지는 줄: 가로로 긴 타원
      ctx.ellipse(((u0 + u1) / 2) * w, y, ((u1 - u0) / 2) * w, th, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };
    streak(0.69, 0.92, 0.25, 20, 1);
    streak(0.76, 0.9, 0.86, 13, 0.8);
  });
  return hullGlossCache;
}

const hullMats = new Map();
/** 래커 칠 재질(투명 코팅). kind: top(윗면, 칠 그라데이션) | plain | gold */
function lacquer(color, kind = 'plain') {
  const key = `${color}|${kind}`;
  let m = hullMats.get(key);
  if (m) return m;
  if (kind === 'gold') {
    m = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(color), metalness: 0.8, roughness: 0.28, clearcoat: 0.5, clearcoatRoughness: 0.2, envMapIntensity: 0.95 });
  } else {
    // 피포처럼 제 색으로 살짝 스스로 빛나게(그늘에서도 잿빛이 아니라 진한 남보라로 남는다)
    const top = kind === 'top';
    m = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(color),
      map: top ? hullTexture() : null,
      metalness: 0.1,
      roughness: 0.34,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      envMapIntensity: 0.85,
      emissive: top ? new THREE.Color('#ffffff') : new THREE.Color(color).multiplyScalar(0.55),
      emissiveMap: top ? hullGloss() : null,
      emissiveIntensity: top ? 1 : 0.3,
    });
  }
  hullMats.set(key, m);
  return m;
}

// ───────── 부품 ─────────

/**
 * 접시 하나. 윤곽을 R 배로 키운다. 돌려주는 값: 부품과 윗면 높이(돔을 올릴 자리).
 */
function saucer(o, R, { pills = 10, ambers = 3, top = HULL, emitter = true, tier = true }) {
  const g = new THREE.Group();
  const P = (pts) => pts.map(([r, y]) => [r * R, y * R]);
  const ol = 0.026 * R;
  // 아랫면: 배꼽에서 테두리까지 매끈한 사발(짙은 남색 래커)
  const under = mesh(latheGeo(P([[0.0, -0.2], [0.2, -0.196], [0.4, -0.178], [0.6, -0.145], [0.76, -0.105], [0.87, -0.066], [0.94, -0.03], [0.965, 0.0]]), 44, `ufoUnder${R}`), lacquer(HULL_DARK));
  // 테두리 범퍼: 통통한 고리(알약 조명이 박힌다)
  const bumper = mesh(torusGeo(R * 0.955, R * 0.052, 10, 60), lacquer(BUMPER), { rot: [Math.PI / 2, 0, 0], pos: [0, R * 0.012, 0] });
  // 윗면 + 가운데 솟은 단(둥글린 턱)
  const topPts = tier
    ? [[0.975, 0.045], [0.94, 0.085], [0.86, 0.12], [0.76, 0.152], [0.67, 0.178], [0.64, 0.19], [0.625, 0.21], [0.615, 0.24], [0.59, 0.262], [0.52, 0.276], [0.3, 0.286], [0.001, 0.29]]
    : [[0.975, 0.045], [0.93, 0.09], [0.8, 0.14], [0.62, 0.185], [0.42, 0.215], [0.2, 0.232], [0.001, 0.236]];
  const upper = mesh(latheGeo(P(topPts), 52, `ufoTop${R}|${tier}`), lacquer(top, 'top'));
  addOutline(under, ol, LINE);
  addOutline(bumper, ol * 0.8, LINE);
  addOutline(upper, ol, LINE);
  g.add(under, bumper, upper);
  // 금빛 장식: 윗면 가장자리 테 + 솟은 단 밑동 테 + 단 둘레 둥근 징(적고 크게)
  const gold = lacquer(GOLD, 'gold');
  const trim = mesh(torusGeo(R * 0.9, R * 0.02, 6, 56), gold, { rot: [Math.PI / 2, 0, 0], pos: [0, R * 0.107, 0], cast: false });
  g.add(trim);
  if (tier) {
    g.add(mesh(torusGeo(R * 0.648, R * 0.018, 6, 48), gold, { rot: [Math.PI / 2, 0, 0], pos: [0, R * 0.188, 0], cast: false }));
    for (let i = 0; i < 8; i++) {
      const a = ((i + 0.5) / 8) * Math.PI * 2;
      g.add(mesh(sphereGeo(1, 10, 6), gold, { pos: [Math.sin(a) * R * 0.622, R * 0.226, Math.cos(a) * R * 0.622], scale: [R * 0.03, R * 0.03, R * 0.022], cast: false }));
    }
  }
  // 범퍼 위 청록 선
  const line = mesh(torusGeo(R * 1.0, R * 0.006, 4, 56), o.lineMat, { cast: false, rot: [Math.PI / 2, 0, 0], pos: [0, R * 0.052, 0] });
  g.add(line);
  // 알약 조명(범퍼 앞에 반쯤 박힘)
  const sprites = [];
  for (let i = 0; i < pills; i++) {
    const a = (i / pills) * Math.PI * 2;
    const holder = new THREE.Group();
    holder.rotation.y = a;
    const p = mesh(capsuleGeo(R * 0.04, R * 0.16, 3, 10), o.pillMat, { cast: false, rot: [0, 0, Math.PI / 2], pos: [0, R * 0.012, R * 0.995] });
    holder.add(p);
    const sp = glowSprite(PAL.glow, R * 0.24, 0.6);
    sp.position.set(0, R * 0.012, R * 1.07);
    holder.add(sp);
    sprites.push({ sp, i });
    g.add(holder);
  }
  // 호박색 작은 등(윗면 가장자리)
  const amberSprites = [];
  for (let i = 0; i < ambers; i++) {
    const a = -0.9 + (1.8 * i) / Math.max(1, ambers - 1);
    const x = Math.sin(a) * R * 0.8;
    const z = Math.cos(a) * R * 0.8;
    // 금테 두른 호박색 보석 등
    const b = mesh(sphereGeo(1, 10, 6), o.amberMat, { cast: false, pos: [x, R * 0.136, z], scale: [R * 0.03, R * 0.022, R * 0.03] });
    const rim = mesh(torusGeo(R * 0.032, R * 0.008, 6, 18), lacquer(GOLD, 'gold'), { cast: false, pos: [x, R * 0.132, z], rot: [Math.PI / 2 - 0.12, 0, 0] });
    const sp = glowSprite(AMBER, R * 0.09, 0.5);
    sp.position.set(x, R * 0.15, z);
    g.add(b, rim, sp);
    amberSprites.push(sp);
  }
  // 아래 발광부 + 금빛 테
  let bowl = null;
  if (emitter) {
    bowl = mesh(sphereGeo(1, 24, 10), o.bowlMat, { cast: false, pos: [0, -R * 0.19, 0], scale: [R * 0.3, R * 0.1, R * 0.3] });
    g.add(bowl);
    g.add(mesh(torusGeo(R * 0.3, R * 0.022, 6, 36), gold, { rot: [Math.PI / 2, 0, 0], pos: [0, -R * 0.19, 0], cast: false }));
  }
  return { group: g, sprites, amberSprites, topY: (tier ? 0.29 : 0.236) * R, bellyY: -0.27 * R };
}

/** 조종석 유리: 가운데는 거의 투명(피포가 또렷이 보이게), 가장자리로 갈수록 하늘빛이 짙어진다. */
let pilotGlassMat = null;
function pilotGlass() {
  if (pilotGlassMat) return pilotGlassMat;
  const m = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#c6f6ff'),
    transparent: true,
    roughness: 0.04,
    metalness: 0.1,
    envMapIntensity: 1.8,
    depthWrite: false,
  });
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `float glassF = 1.0 - saturate( dot( geometryNormal, geometryViewDir ) );
      diffuseColor.a = mix( 0.04, 0.62, pow( glassF, 2.4 ) );
      outgoingLight += vec3( 0.55, 0.92, 1.0 ) * pow( glassF, 3.0 ) * 0.45;
      #include <opaque_fragment>`,
    );
  };
  m.customProgramCacheKey = () => 'pipoGlass';
  pilotGlassMat = m;
  return m;
}

/** 돔 유리의 반짝 줄: 화면에서 본 돔 테두리의 왼쪽 위를 따라 휘는 흰 줄(긴 것 + 짧은 것). */
let glintMat = null;
function domeGlints(r, sy) {
  glintMat ??= new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.6, depthWrite: false });
  const g = new THREE.Group();
  g.scale.set(1, sy, 1);
  // 기체가 앞으로 기울어 있으므로 카메라는 돔을 앞 조금 위에서 본다. 그 시선 둘레의 원 위에 줄을 얹는다.
  const view = new THREE.Vector3(0, Math.sin(UFO_TILT), Math.cos(UFO_TILT));
  const gam = 1.18;
  for (const [from, len, tube] of [[1.95, 0.85, 0.028], [2.95, 0.16, 0.024]]) {
    const arc = mesh(torusGeo(r * Math.sin(gam) * 1.01, r * tube, 6, 16, len), glintMat, { cast: false });
    arc.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), view);
    arc.rotateZ(from);
    arc.position.copy(view).multiplyScalar(r * Math.cos(gam) * 1.01);
    arc.renderOrder = 4;
    g.add(arc);
  }
  return g;
}

/** 유리 돔과 조종사. y = 돔 바닥. */
function dome(o, y, r, withPilot = true) {
  const g = new THREE.Group();
  g.position.y = y;
  const collar = mesh(torusGeo(r * 1.02, r * 0.07, 10, 40), mat(PAL.hullLight, { metal: 0.6, rough: 0.3, envIntensity: 1.2 }), {
    rot: [Math.PI / 2, 0, 0],
    pos: [0, r * 0.03, 0],
  });
  g.add(collar);
  let pilot = null;
  // 조종석 돔은 큰 머리가 들어가게 조금 높게
  const sy = withPilot ? 1.1 : 1;
  if (withPilot) {
    pilot = createPipo(r * 0.5);
    const seat = new THREE.Group();
    seat.position.y = r * 0.1; // 스카프·조종간 손잡이가 받침 위로 보이게
    seat.rotation.x = -0.16; // 의자에 살짝 기대 앉아 얼굴이 화면을 향한다(기체가 앞으로 기울어 있으므로)
    seat.add(pilot.group);
    g.add(seat);
  } else {
    const inner = mesh(sphereGeo(1, 16, 10), mat(PAL.glow, { emissive: PAL.glow, emissiveIntensity: 0.8 }), { cast: false, scale: [r * 0.5, r * 0.4, r * 0.5], pos: [0, r * 0.2, 0] });
    g.add(inner);
  }
  const glass = mesh(new THREE.SphereGeometry(r, 36, 18, 0, Math.PI * 2, 0, Math.PI / 2), withPilot ? pilotGlass() : o.glassMat, { cast: false });
  if (withPilot) {
    glass.scale.y = sy;
    g.add(domeGlints(r, sy));
  }
  glass.renderOrder = 3;
  g.add(glass);
  return { group: g, pilot, baseY: y };
}

function antenna(o, x, y, len, lean, color) {
  const g = new THREE.Group();
  g.position.set(x, y, 0);
  g.rotation.z = lean;
  const rod = mesh(cylGeo(0.014, 0.02, len, 8), lacquer(GOLD, 'gold'), { pos: [0, len / 2, 0] });
  g.add(mesh(sphereGeo(1, 10, 8), lacquer(BUMPER), { pos: [0, 0.01, 0], scale: 0.035 }));
  const tipMat = color === AMBER ? o.amberMat : o.pillMat;
  const tip = mesh(sphereGeo(1, 12, 8), tipMat, { cast: false, pos: [0, len, 0], scale: 0.035 });
  const sp = glowSprite(color, 0.22, 0.7);
  sp.position.set(0, len, 0);
  g.add(rod, tip, sp);
  return { group: g, sprite: sp };
}

// ───────── 형태 ─────────

/** 형태별 설계: R = 접시 반지름, hw = 화면 배율용 반폭(고리·호위선 포함). */
const SPECS = [
  { R: 0.5, dome: 0.5, pills: 6, ambers: 0, hw: 0.52 },
  { R: 0.78, dome: 0.42, pills: 10, ambers: 3, hw: 0.8 },
  { R: 0.9, dome: 0.4, pills: 12, ambers: 3, hw: 0.95, antennas: true },
  { R: 0.8, dome: 0.4, pills: 10, ambers: 2, hw: 1.2, ring: true },
  { R: 1.0, dome: 0.36, pills: 14, ambers: 2, hw: 1.1, tiers: 1, fins: true },
  { R: 1.15, dome: 0.36, pills: 14, ambers: 2, hw: 1.2, sideDomes: true, radar: true },
  { R: 1.4, dome: 0.32, pills: 18, ambers: 3, hw: 1.42, deck: true, antennas: true },
  { R: 1.7, dome: 0.34, pills: 20, ambers: 4, hw: 1.98, tiers: 2, escorts: true, antennas: true },
];

/**
 * 기체를 만든다.
 * @returns {{ root: THREE.Group, update(o: {t:number, mood?:string, lit?:number, beam?:number}): void,
 *             halfWidth: number, bellyY: number, topY: number }}
 *   bellyY = 빔이 나오는 자리, topY = 꼭대기(말풍선 자리). 둘 다 기울이기 전 모델 단위.
 */
export function createUfo(form) {
  const spec = SPECS[Math.min(Math.max(form, 0), SPECS.length - 1)];
  // 이 기체만 쓰는 빛 재질(밝기를 매 프레임 바꾼다)
  const o = {
    pillMat: new THREE.MeshStandardMaterial({ color: '#bffaff', emissive: new THREE.Color(PAL.glow), emissiveIntensity: 2, roughness: 0.3 }),
    lineMat: new THREE.MeshBasicMaterial({ color: new THREE.Color(PAL.glow), transparent: true, opacity: 0.9 }),
    amberMat: new THREE.MeshStandardMaterial({ color: '#ffd9a0', emissive: new THREE.Color(AMBER), emissiveIntensity: 1.6, roughness: 0.4 }),
    bowlMat: new THREE.MeshStandardMaterial({ color: '#d8fdff', emissive: new THREE.Color(PAL.glow), emissiveIntensity: 1.2, roughness: 0.25 }),
    glassMat: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#bdf4ff'),
      transparent: true,
      opacity: 0.3,
      roughness: 0.04,
      metalness: 0.1,
      envMapIntensity: 2.2,
      depthWrite: false,
    }),
  };
  const root = new THREE.Group();
  const body = new THREE.Group(); // 기울임·흔들림은 장면이 root 에, 모양은 body 에
  root.add(body);
  const R = spec.R;
  const main = saucer(o, R, { pills: spec.pills, ambers: spec.ambers });
  body.add(main.group);
  const sprites = [...main.sprites];
  const ambers = [...main.amberSprites];
  const blinkers = [];
  let topY = main.topY;
  let domeY = main.topY - 0.01;

  // 위층
  if (spec.tiers) {
    for (let k = 0; k < spec.tiers; k++) {
      const r2 = R * (k === 0 ? 0.6 : 0.36);
      const t = saucer(o, r2, { pills: Math.round(spec.pills * (k === 0 ? 0.7 : 0.5)), ambers: 0, emitter: false, top: tone(HULL, 0.06 + k * 0.05) });
      t.group.position.y = topY - r2 * 0.02;
      body.add(t.group);
      sprites.push(...t.sprites);
      topY = t.group.position.y + t.topY;
    }
    domeY = topY - 0.01;
  }
  // 창문 갑판(대형 모선)
  if (spec.deck) {
    const deckR = R * 0.55;
    const deckH = R * 0.12;
    const deck = mesh(latheGeo([[deckR * 1.04, 0], [deckR * 1.05, deckH * 0.15], [deckR * 1.03, deckH * 0.85], [deckR * 0.99, deckH], [0.001, deckH]], 56, `ufoDeck${R}`), lacquer(tone(HULL, 0.05)), { pos: [0, topY - 0.01, 0] });
    addOutline(deck, 0.02 * R, LINE);
    body.add(deck);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const holder = new THREE.Group();
      holder.rotation.y = a;
      holder.add(mesh(roundBoxGeo(0.1, 0.075, 0.03, 0.025, 2), o.pillMat, { cast: false, pos: [0, topY + deckH / 2 - 0.01, deckR * 1.055] }));
      body.add(holder);
    }
    const cap = mesh(torusGeo(deckR * 0.99, R * 0.016, 8, 64), lacquer(GOLD, 'gold'), { rot: [Math.PI / 2, 0, 0], pos: [0, topY + deckH - 0.005, 0] });
    body.add(cap);
    topY += deckH;
    domeY = topY;
  }
  // 돔과 조종사
  const domeR = R * spec.dome * (spec.tiers === 2 ? 0.8 : 1);
  const d = dome(o, domeY, domeR);
  body.add(d.group);
  // 조종석 받침: 돔 고리 바깥을 두르는 금빛 테와 남색 래커 받침(돔 자체는 건드리지 않는다)
  const seatRing = mesh(torusGeo(domeR * 1.13, domeR * 0.055, 8, 48), lacquer(GOLD, 'gold'), { rot: [Math.PI / 2, 0, 0], pos: [0, domeY + domeR * 0.005, 0], cast: false });
  const seatBase = mesh(cylGeo(domeR * 1.17, domeR * 1.2, domeR * 0.07, 48), lacquer(BUMPER), { pos: [0, domeY - domeR * 0.03, 0], cast: false });
  addOutline(seatBase, 0.012 * R, LINE);
  body.add(seatBase, seatRing);
  const pilot = d.pilot;
  topY = domeY + domeR * 1.1; // 조종석 유리는 10% 더 높다

  // 안테나
  if (spec.antennas) {
    for (const s of [-1, 1]) {
      const a = antenna(o, s * R * (spec.deck ? 0.42 : 0.3), main.topY * 0.92, R * 0.42, -s * 0.35, s < 0 ? PAL.glow : AMBER);
      body.add(a.group);
      blinkers.push(a.sprite);
    }
    topY = Math.max(topY, main.topY + R * 0.42);
  }
  // 날개(순찰선)
  if (spec.fins) {
    for (const s of [-1, 1]) {
      // 뒤로 젖힌 사탕빛 날개: 납작한 구를 옆으로 늘이고 뒤로 비스듬히 민 모양(매끈해서 외곽선이 깨끗하다)
      const fg = new THREE.SphereGeometry(1, 22, 12);
      fg.scale(0.21, 0.05, 0.12);
      fg.translate(s * 0.17, 0, 0);
      fg.applyMatrix4(new THREE.Matrix4().set(1, 0, 0, 0, 0, 1, 0, 0, -0.55 * s, 0, 1, 0, 0, 0, 0, 1));
      const fin = mesh(fg, lacquer('#ec3d52'), { pos: [s * R * 0.93, 0.02, 0.02], rot: [0, 0, s * 0.22] });
      addOutline(fin, 0.016, LINE);
      fin.add(mesh(sphereGeo(1, 10, 8), lacquer(GOLD, 'gold'), { pos: [s * 0.36, 0.0, -0.2], scale: [0.04, 0.04, 0.04], cast: false }));
      body.add(fin);
    }
  }
  // 옆 관측 돔과 레이더(관측선)
  if (spec.sideDomes) {
    for (const s of [-1, 1]) {
      const sd = dome(o, main.topY * 0.62, R * 0.15, false);
      sd.group.position.x = s * R * 0.58;
      body.add(sd.group);
    }
  }
  let radar = null;
  if (spec.radar) {
    radar = new THREE.Group();
    radar.position.set(-R * 0.48, main.topY, -R * 0.2);
    radar.add(mesh(cylGeo(0.016, 0.022, 0.2, 8), lacquer(GOLD, 'gold'), { pos: [0, 0.1, 0] }));
    const dish = mesh(latheGeo([[0.001, 0], [0.08, 0.02], [0.15, 0.07], [0.17, 0.09]], 24, 'radar'), mat('#eef0ff', { rough: 0.35, side: THREE.DoubleSide, envIntensity: 1.1 }), { pos: [0, 0.22, 0], rot: [-0.9, 0, 0] });
    addOutline(dish, 0.009, LINE);
    dish.add(mesh(sphereGeo(1, 8, 6), o.pillMat, { pos: [0, 0.1, 0], scale: 0.025, cast: false }));
    radar.add(dish);
    body.add(radar);
  }
  // 에너지 고리(고리 접시)
  let ring = null;
  const ringSprites = [];
  if (spec.ring) {
    ring = new THREE.Group();
    ring.rotation.set(Math.PI / 2 + 0.12, 0.1, 0);
    ring.add(mesh(torusGeo(R * 1.42, 0.018, 8, 96), new THREE.MeshBasicMaterial({ color: '#e8ffff' }), { cast: false }));
    ring.add(mesh(torusGeo(R * 1.42, 0.06, 10, 96), new THREE.MeshBasicMaterial({ color: PAL.glow, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }), { cast: false }));
    for (let i = 0; i < 3; i++) {
      const sp = glowSprite(PAL.glow, 0.3, 0.9);
      ring.add(sp);
      ringSprites.push(sp);
    }
    body.add(ring);
  }
  // 호위선(은하 모선)
  const escorts = [];
  if (spec.escorts) {
    for (let i = 0; i < 2; i++) {
      const e = saucer(o, 0.2, { pills: 6, ambers: 0, emitter: true, tier: false });
      const d2 = dome(o, e.topY - 0.005, 0.07, false);
      e.group.add(d2.group);
      body.add(e.group);
      escorts.push(e.group);
      sprites.push(...e.sprites);
    }
  }

  const bellyY = main.bellyY;

  /** look = 피포가 눈으로 따라갈 세계 좌표(없으면 정면). */
  function update({ t = 0, mood = 'idle', lit = 1, beam = 0, look = null } = {}) {
    const L = Math.min(Math.max(lit, 0), 1);
    // 빛 번짐은 블룸이 맡으므로 조명 자체와 스프라이트는 은은하게
    o.pillMat.emissiveIntensity = 0.15 + 1.1 * L;
    o.pillMat.color.set(L > 0.3 ? '#bffaff' : DIM);
    o.lineMat.opacity = 0.15 + 0.8 * L;
    o.amberMat.emissiveIntensity = 0.1 + 1.5 * L;
    o.bowlMat.emissiveIntensity = 0.15 + Math.max(beam * 1.9, L * 0.9);
    for (const { sp, i } of sprites) sp.material.opacity = L * (0.12 + 0.2 * (0.5 + 0.5 * Math.sin(t * 4 - i * 0.9)));
    ambers.forEach((sp, i) => {
      sp.material.opacity = L > 0.3 && Math.sin(t * 3 + i * 2) > -0.4 ? 0.6 : 0;
    });
    blinkers.forEach((sp, i) => {
      sp.material.opacity = L > 0.3 && Math.sin(t * 4 + i * 1.7) > -0.2 ? 0.8 : 0.05;
    });
    // 피포: 표정·몸짓·눈길
    pilot.update({ t, mood, look, lit: L });
    // 움직이는 부품
    if (radar) radar.rotation.y = Math.sin(t * 0.9) * 0.6;
    if (ring) {
      ring.rotation.z = t * 0.6;
      ringSprites.forEach((sp, i) => {
        const a = t * 1.6 + (i * Math.PI * 2) / 3;
        sp.position.set(Math.cos(a) * R * 1.42, Math.sin(a) * R * 1.42, 0);
        sp.material.opacity = 0.3 + 0.6 * L;
      });
    }
    escorts.forEach((e, i) => {
      const a = t * 0.7 + i * Math.PI;
      e.position.set(Math.cos(a) * R * 1.12, R * 0.02 + Math.sin(a * 2) * 0.04, Math.sin(a) * R * 0.7);
      e.rotation.y = -a;
    });
  }
  update({});

  // 기체는 높이 떠 있어 땅에 그림자를 드리우지 않는다(컨셉에도 없다)
  root.traverse((m) => {
    if (m.isMesh) m.castShadow = false;
  });
  return { root, update, halfWidth: spec.hw, bellyY, topY, body };
}
