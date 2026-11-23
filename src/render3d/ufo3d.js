// 3D 기체 8형태. 조종사는 피포(pipo.js). 짙은 남보라 금속 접시에 금빛 테두리와 리벳,
// 띠를 따라 박힌 알약 모양 청록 조명, 아래쪽 발광부, 유리 돔(피포의 더듬이가 돔을 뚫고 나와 있다).
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
} from './kit.js';
import { createPipo } from './pipo.js';

/** 윗면이 카메라를 보도록 앞으로 기울이는 각도(라디안). */
export const UFO_TILT = 0.36;

// 선체: 남보라 금속(피포의 보라와 어울리게) + 금빛 장식
const HULL = '#3a3e92';
const HULL_DARK = '#1e2257';
const GOLD = '#ffc444';
const AMBER = '#ffb347';
const DIM = '#24505c';

// ───────── 부품 ─────────

/**
 * 접시 하나. 윤곽을 R 배로 키운다. 돌려주는 값: 부품과 윗면 높이(돔을 올릴 자리).
 */
function saucer(o, R, { pills = 10, ambers = 3, top = HULL, emitter = true, tier = true }) {
  const g = new THREE.Group();
  const hullMat = mat(top, { metal: 0.42, rough: 0.34, envIntensity: 1.25 });
  const darkMat = mat(HULL_DARK, { metal: 0.4, rough: 0.42, envIntensity: 1 });
  const P = (pts) => pts.map(([r, y]) => [r * R, y * R]);
  // 아랫면
  const under = mesh(latheGeo(P([[0.3, -0.17], [0.55, -0.15], [0.82, -0.1], [0.97, -0.035], [1.0, 0]]), 48), darkMat);
  // 옆띠(조명이 박히는 곳)
  const band = mesh(latheGeo(P([[1.0, 0], [1.02, 0.04], [1.0, 0.08]]), 48), darkMat);
  // 윗면 + 가운데 솟은 단
  const topPts = tier
    ? [[1.0, 0.08], [0.93, 0.11], [0.78, 0.16], [0.64, 0.19], [0.62, 0.235], [0.5, 0.27], [0.001, 0.285]]
    : [[1.0, 0.08], [0.9, 0.12], [0.7, 0.18], [0.45, 0.22], [0.001, 0.235]];
  const upper = mesh(latheGeo(P(topPts), 56), hullMat);
  for (const m of [under, band, upper]) addOutline(m, 0.016 * R);
  g.add(under, band, upper);
  // 금빛 장식: 가장자리 테 + 윗면 줄무늬 + 솟은 단의 리벳
  const gold = mat(GOLD, { metal: 0.75, rough: 0.28, envIntensity: 1.4 });
  const trim = mesh(torusGeo(R * 0.985, R * 0.022, 8, 72), gold, { rot: [Math.PI / 2, 0, 0], pos: [0, R * 0.085, 0], cast: false });
  addOutline(trim, R * 0.006);
  const stripe = mesh(torusGeo(R * 0.8, R * 0.014, 6, 64), gold, { rot: [Math.PI / 2, 0, 0], pos: [0, R * 0.155, 0], cast: false });
  g.add(trim, stripe);
  if (tier) {
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      g.add(mesh(sphereGeo(1, 8, 6), gold, { pos: [Math.sin(a) * R * 0.635, R * 0.215, Math.cos(a) * R * 0.635], scale: R * 0.022, cast: false }));
    }
  }
  // 띠의 청록 선
  const line = mesh(torusGeo(R * 1.02, R * 0.006, 6, 64), o.lineMat, { cast: false, rot: [Math.PI / 2, 0, 0], pos: [0, R * 0.04, 0] });
  g.add(line);
  // 알약 조명
  const sprites = [];
  for (let i = 0; i < pills; i++) {
    const a = (i / pills) * Math.PI * 2;
    const holder = new THREE.Group();
    holder.rotation.y = a;
    const p = mesh(capsuleGeo(R * 0.038, R * 0.17, 4, 10), o.pillMat, { cast: false, rot: [0, 0, Math.PI / 2], pos: [0, R * 0.04, R * 1.028] });
    holder.add(p);
    const sp = glowSprite(PAL.glow, R * 0.32, 0.6);
    sp.position.set(0, R * 0.04, R * 1.08);
    holder.add(sp);
    sprites.push({ sp, i });
    g.add(holder);
  }
  // 호박색 작은 등(윗면 가장자리)
  const amberSprites = [];
  for (let i = 0; i < ambers; i++) {
    const a = -0.9 + (1.8 * i) / Math.max(1, ambers - 1);
    const x = Math.sin(a) * R * 0.86;
    const z = Math.cos(a) * R * 0.86;
    const b = mesh(sphereGeo(1, 12, 8), o.amberMat, { cast: false, pos: [x, R * 0.125, z], scale: [R * 0.045, R * 0.02, R * 0.045] });
    const sp = glowSprite(AMBER, R * 0.18, 0.5);
    sp.position.set(x, R * 0.14, z);
    g.add(b, sp);
    amberSprites.push(sp);
  }
  // 아래 발광부
  let bowl = null;
  if (emitter) {
    bowl = mesh(sphereGeo(1, 28, 12), o.bowlMat, { cast: false, pos: [0, -R * 0.165, 0], scale: [R * 0.34, R * 0.11, R * 0.34] });
    g.add(bowl);
  }
  return { group: g, sprites, amberSprites, topY: (tier ? 0.285 : 0.235) * R, bellyY: -0.27 * R };
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
  if (withPilot) {
    pilot = createPipo(r * 0.42);
    const seat = new THREE.Group();
    seat.position.y = r * 0.08; // 스카프가 받침 바로 위에 오게
    seat.add(pilot.group);
    g.add(seat);
  } else {
    const inner = mesh(sphereGeo(1, 16, 10), mat(PAL.glow, { emissive: PAL.glow, emissiveIntensity: 0.8 }), { cast: false, scale: [r * 0.5, r * 0.4, r * 0.5], pos: [0, r * 0.2, 0] });
    g.add(inner);
  }
  const glass = mesh(new THREE.SphereGeometry(r, 36, 18, 0, Math.PI * 2, 0, Math.PI / 2), o.glassMat, { cast: false });
  glass.renderOrder = 3;
  g.add(glass);
  return { group: g, pilot, baseY: y };
}

function antenna(o, x, y, len, lean, color) {
  const g = new THREE.Group();
  g.position.set(x, y, 0);
  g.rotation.z = lean;
  const rod = mesh(cylGeo(0.012, 0.018, len, 8), mat(PAL.hullLight, { metal: 0.6, rough: 0.35 }), { pos: [0, len / 2, 0] });
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
    const deck = mesh(cylGeo(deckR, deckR * 1.04, deckH, 48), mat(tone(HULL, 0.05), { metal: 0.42, rough: 0.34, envIntensity: 1.25 }), { pos: [0, topY + deckH / 2 - 0.01, 0] });
    addOutline(deck, 0.014 * R);
    body.add(deck);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const holder = new THREE.Group();
      holder.rotation.y = a;
      holder.add(mesh(roundBoxGeo(0.09, 0.07, 0.02, 0.02, 2), o.pillMat, { cast: false, pos: [0, topY + deckH / 2, deckR * 1.02] }));
      body.add(holder);
    }
    const cap = mesh(cylGeo(deckR * 0.96, deckR, 0.02, 48), mat(PAL.hullLight, { metal: 0.6, rough: 0.3 }), { pos: [0, topY + deckH, 0] });
    body.add(cap);
    topY += deckH;
    domeY = topY;
  }
  // 돔과 조종사
  const domeR = R * spec.dome * (spec.tiers === 2 ? 0.8 : 1);
  const d = dome(o, domeY, domeR);
  body.add(d.group);
  const pilot = d.pilot;
  topY = domeY + domeR;

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
      const fin = mesh(roundBoxGeo(0.34, 0.06, 0.16, 0.025, 2), mat(PAL.red, { rough: 0.5 }), { pos: [s * R * 1.05, 0.03, 0], rot: [0, 0, s * 0.35] });
      addOutline(fin, 0.012);
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
    radar.add(mesh(cylGeo(0.015, 0.02, 0.2, 8), mat(PAL.hullLight, { metal: 0.6, rough: 0.35 }), { pos: [0, 0.1, 0] }));
    const dish = mesh(latheGeo([[0.001, 0], [0.08, 0.02], [0.15, 0.07], [0.17, 0.09]], 24, 'radar'), mat('#dfe6ff', { rough: 0.4, side: THREE.DoubleSide }), { pos: [0, 0.22, 0], rot: [-0.9, 0, 0] });
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
    o.pillMat.emissiveIntensity = 0.15 + 1.55 * L;
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
