// 조종사 "피포(Pipo)": 스스로 은하 최고의 잠입 요원이라 믿는 허세 가득한 신입 관측대원.
// 라벤더 젤리콩 몸, 금빛 큰 눈(진짜 3D 눈이라 표본과 지구인을 눈으로 따라간다), 진한 눈썹, 송곳니 하나,
// 주황 스카프, 기분 따라 색이 바뀌는 더듬이 전구. 숨을 땐 코·콧수염 달린 변장 안경을 쓴다.
// 모델 단위: r = 머리 반지름. 원점 = 목(스카프) 높이의 몸 중심. 정면은 +z.
import { THREE, mat, mesh, sphereGeo, capsuleGeo, torusGeo, cylGeo, latheGeo, addOutline, glowSprite, faceTexture, faceCap } from './kit.js';

const SKIN = '#cf8cff';
const BELLY = '#e6dcff';
const BROW = '#33206e';
const SCARF = '#ff8a3c';
const IRIS_IN = '#ffe27a';
const IRIS_OUT = '#f5a524';
const PUPIL = '#1a1238';

/** 기분별 더듬이 전구 색. */
export const BULB = {
  idle: '#5ff0ff',
  happy: '#ffd23f',
  alert: '#ff9a3c',
  shock: '#ff4d5e',
  hide: '#5b4f8f',
};

/**
 * 기분별 표정 설계.
 * lid: 윗눈꺼풀 회전(라디안, −0.5 = 활짝, 0.5 = 반쯤 감음, 1.57 = 감음)
 * brow: [기울기, 높이] (기울기 + = 눈썹 안쪽이 내려감 = 화남/음흉, − = 안쪽이 올라감 = 걱정)
 * eye: 눈 크기 배율, squint: 눈 세로 배율(작을수록 웃는 눈), pupil: 눈동자 크기 배율, mouth: 입 그림
 */
const FACES = {
  idle: { lid: 0.12, brow: [0.14, 0], eye: 1, squint: 1, pupil: 1, mouth: 'smirk' },
  happy: { lid: 1.57, brow: [-0.18, 0.1], eye: 1, squint: 1, pupil: 1, mouth: 'grin', arcs: true },
  alert: { lid: -0.55, brow: [-0.42, 0.08], eye: 1.1, squint: 1, pupil: 0.8, mouth: 'worry' },
  hide: { lid: 0.45, brow: [0.4, -0.04], eye: 1, squint: 1, pupil: 1, mouth: 'none' },
  shock: { lid: -0.65, brow: [-0.3, 0.17], eye: 1.2, squint: 1.06, pupil: 0.5, mouth: 'o' },
};

const browMatShared = () => mat(BROW, { rough: 0.6 });

/** 입·볼 그림(머리 아래쪽에 붙인다). */
function mouthTexture(kind) {
  return faceTexture(`pipo-mouth:${kind}`, (ctx, s) => {
    const cx = s / 2;
    const my = s * 0.66;
    // 볼
    for (const k of [-1, 1]) {
      const g = ctx.createRadialGradient(cx + k * s * 0.3, s * 0.56, 0, cx + k * s * 0.3, s * 0.56, s * 0.09);
      g.addColorStop(0, 'rgba(255,120,170,0.75)');
      g.addColorStop(1, 'rgba(255,120,170,0)');
      ctx.fillStyle = g;
      ctx.fillRect(cx + k * s * 0.3 - s * 0.1, s * 0.46, s * 0.2, s * 0.2);
    }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.translate(cx, my);
    ctx.scale(1.35, 1.35);
    ctx.translate(-cx, -my);
    const ink = '#2a1660';
    const tongue = '#ff6f8e';
    const mouthIn = '#4a1d4f';
    if (kind === 'smirk') {
      // 한쪽만 올라간 자신만만한 웃음 + 송곳니
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.1, my);
      ctx.quadraticCurveTo(cx + s * 0.02, my + s * 0.06, cx + s * 0.12, my - s * 0.035);
      ctx.lineWidth = s * 0.028;
      ctx.strokeStyle = ink;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + s * 0.035, my + s * 0.028);
      ctx.lineTo(cx + s * 0.055, my + s * 0.07);
      ctx.lineTo(cx + s * 0.075, my + s * 0.02);
      ctx.closePath();
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = s * 0.008;
      ctx.stroke();
    } else if (kind === 'grin') {
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.13, my - s * 0.03);
      ctx.quadraticCurveTo(cx, my + s * 0.16, cx + s * 0.13, my - s * 0.03);
      ctx.closePath();
      ctx.fillStyle = mouthIn;
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.fillStyle = tongue;
      ctx.beginPath();
      ctx.ellipse(cx, my + s * 0.085, s * 0.07, s * 0.045, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx + s * 0.02, my - s * 0.03, s * 0.04, s * 0.035);
      ctx.restore();
      ctx.lineWidth = s * 0.02;
      ctx.strokeStyle = ink;
      ctx.stroke();
    } else if (kind === 'worry') {
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.1, my + s * 0.02);
      for (let i = 1; i <= 4; i++) ctx.lineTo(cx - s * 0.1 + i * s * 0.05, my + (i % 2 ? -s * 0.012 : s * 0.02));
      ctx.lineWidth = s * 0.022;
      ctx.strokeStyle = ink;
      ctx.stroke();
    } else if (kind === 'o') {
      ctx.beginPath();
      ctx.ellipse(cx, my + s * 0.03, s * 0.055, s * 0.075, 0, 0, Math.PI * 2);
      ctx.fillStyle = mouthIn;
      ctx.fill();
      ctx.lineWidth = s * 0.02;
      ctx.strokeStyle = ink;
      ctx.stroke();
      ctx.fillStyle = tongue;
      ctx.beginPath();
      ctx.ellipse(cx, my + s * 0.08, s * 0.035, s * 0.02, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

/**
 * 피포를 만든다.
 * @param {number} r 머리 반지름
 * @returns {{ group: THREE.Group, update(o: {t:number, mood:string, look?: THREE.Vector3|null, lit?: number}): void, height: number }}
 */
export function createPipo(r) {
  const g = new THREE.Group();
  const skin = mat(SKIN, { rough: 0.48 });
  const headY = r * 1.0;
  // 몸(목 아래로 퍼지는 젤리콩) — 대부분 기체 속에 가려진다
  const body = mesh(latheGeo([[0.001, -1.1], [0.62, -1.05], [0.86, -0.75], [0.84, -0.35], [0.66, -0.02], [0.5, 0.2]].map(([a, b]) => [a * r, b * r]), 28), skin);
  addOutline(body, r * 0.05);
  const belly = mesh(sphereGeo(1, 20, 14), mat(BELLY, { rough: 0.55 }), { pos: [0, -r * 0.55, r * 0.5], scale: [r * 0.5, r * 0.45, r * 0.32] });
  // 머리
  const headPivot = new THREE.Group();
  headPivot.position.y = headY;
  // 볼이 통통하게 살짝 넓적한 머리
  const head = mesh(sphereGeo(1, 36, 28), skin, { scale: [r * 1.06, r * 0.97, r] });
  addOutline(head, 0.045);
  headPivot.add(head);
  // 귀지느러미
  for (const s of [-1, 1]) {
    const fin = mesh(sphereGeo(1, 16, 12), skin, { pos: [s * r * 0.92, r * 0.12, -r * 0.1], scale: [r * 0.2, r * 0.42, r * 0.14], rot: [0, s * 0.5, -s * 0.5] });
    addOutline(fin, 0.12);
    headPivot.add(fin);
  }
  // 입·볼
  const mouth = faceCap(r, mouthTexture('smirk'), { width: 1.8, height: 1.6 });
  mouth.rotation.x = 0.18;
  headPivot.add(mouth);

  // 눈: 흰자 + (따라 도는) 홍채·눈동자 + 고정된 반짝임 + 윗눈꺼풀
  const eyeR = r * 0.33;
  const eyes = [];
  const white = mat('#ffffff', { rough: 0.18 });
  const irisTex = faceTexture('pipo-iris', (ctx, s) => {
    const c = s / 2;
    const gr = ctx.createRadialGradient(c, c * 0.85, 0, c, c, c);
    gr.addColorStop(0, IRIS_IN);
    gr.addColorStop(0.75, IRIS_OUT);
    gr.addColorStop(1, '#b8640c');
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.arc(c, c, c, 0, Math.PI * 2);
    ctx.fill();
  });
  const irisMat = new THREE.MeshStandardMaterial({ map: irisTex, roughness: 0.25 });
  const pupilMat = mat(PUPIL, { rough: 0.2 });
  const lidMat = skin;
  for (const s of [-1, 1]) {
    const dir = new THREE.Vector3(s * 0.4, 0.12, 0.9).normalize();
    const holder = new THREE.Group();
    holder.position.copy(dir).multiplyScalar(r * 0.8);
    holder.lookAt(dir.clone().multiplyScalar(r * 3));
    const ball = mesh(sphereGeo(1, 24, 18), white, { scale: eyeR });
    addOutline(ball, 0.06);
    const pivot = new THREE.Group();
    const iris = mesh(sphereGeo(1, 20, 14), irisMat, { pos: [0, 0, eyeR * 0.78], scale: [eyeR * 0.66, eyeR * 0.66, eyeR * 0.28], cast: false });
    const pupil = mesh(sphereGeo(1, 16, 12), pupilMat, { pos: [0, 0, eyeR * 0.9], scale: [eyeR * 0.34, eyeR * 0.34, eyeR * 0.15], cast: false });
    pivot.add(iris, pupil);
    const glint = mesh(sphereGeo(1, 10, 8), mat('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.8 }), { pos: [-eyeR * 0.32, eyeR * 0.34, eyeR * 0.92], scale: eyeR * 0.15, cast: false });
    // 웃는 눈(^^): 감은 눈꺼풀 위에 얹는 어두운 반원 선
    const arc = mesh(torusGeo(eyeR * 0.62, eyeR * 0.13, 6, 18, Math.PI), browMatShared(), { pos: [0, -eyeR * 0.12, eyeR * 1.04], cast: false });
    arc.visible = false;
    // 눈꺼풀: 위쪽 반구 껍데기. 앞으로 돌리면 눈을 덮는다.
    const lid = mesh(new THREE.SphereGeometry(eyeR * 1.12, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2), lidMat, { cast: false });
    addOutline(lid, eyeR * 0.05);
    holder.add(ball, pivot, glint, lid, arc);
    headPivot.add(holder);
    eyes.push({ holder, pivot, iris, pupil, lid, ball, glint, arc, s });
  }
  // 눈썹
  const brows = [];
  const browMat = browMatShared();
  for (const s of [-1, 1]) {
    const b = mesh(capsuleGeo(r * 0.085, r * 0.5, 4, 10), browMat, { cast: false });
    b.rotation.z = Math.PI / 2;
    const holder = new THREE.Group();
    const dir = new THREE.Vector3(s * 0.4, 0.62, 0.68).normalize();
    holder.position.copy(dir).multiplyScalar(r * 1.04);
    holder.add(b);
    headPivot.add(holder);
    brows.push({ holder, s, base: holder.position.clone() });
  }
  // 더듬이: 머리 꼭대기에서 휘어 올라가 끝에 전구
  const antenna = new THREE.Group();
  antenna.position.set(0, r * 0.92, -r * 0.12);
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(r * 0.06, r * 0.45, -r * 0.12),
    new THREE.Vector3(r * 0.28, r * 0.82, -r * 0.02),
    new THREE.Vector3(r * 0.42, r * 0.98, r * 0.12),
  ]);
  const stalk = mesh(new THREE.TubeGeometry(curve, 16, r * 0.055, 8, false), skin);
  stalk.userData.ownGeometry = true;
  addOutline(stalk, r * 0.025);
  const bulbMat = new THREE.MeshStandardMaterial({ color: '#dffcff', emissive: new THREE.Color(BULB.idle), emissiveIntensity: 2.2, roughness: 0.25 });
  const tip = curve.getPoint(1);
  const bulb = mesh(sphereGeo(1, 18, 14), bulbMat, { pos: [tip.x, tip.y, tip.z], scale: r * 0.17, cast: false });
  addOutline(bulb, 0.08);
  const bulbGlow = glowSprite(BULB.idle, r * 1.1, 0.75);
  bulbGlow.position.copy(tip);
  antenna.add(stalk, bulb, bulbGlow);
  headPivot.add(antenna);
  // 땀방울(긴장할 때)
  const sweat = mesh(sphereGeo(1, 12, 10), mat('#9fe3ff', { rough: 0.15 }), { pos: [r * 0.86, r * 0.45, r * 0.42], scale: [r * 0.09, r * 0.13, r * 0.09], cast: false });
  addOutline(sweat, 0.12, '#3b7fb0');
  headPivot.add(sweat);
  // 변장 안경(숨을 때): 동그란 테 + 큰 코 + 콧수염
  const disguise = new THREE.Group();
  const black = mat('#1d1830', { rough: 0.4 });
  for (const s of [-1, 1]) {
    const rim = mesh(torusGeo(eyeR * 1.05, eyeR * 0.14, 8, 24), black, { cast: false });
    const dir = new THREE.Vector3(s * 0.42, 0.14, 0.9).normalize();
    rim.position.copy(dir).multiplyScalar(r * 1.1);
    rim.lookAt(dir.clone().multiplyScalar(r * 4));
    disguise.add(rim);
  }
  disguise.add(mesh(cylGeo(eyeR * 0.09, eyeR * 0.09, r * 0.22, 8), black, { pos: [0, r * 0.15, r * 1.06], rot: [0, 0, Math.PI / 2], cast: false }));
  const nose = mesh(sphereGeo(1, 16, 12), mat('#ff9fb0', { rough: 0.4 }), { pos: [0, -r * 0.08, r * 1.08], scale: [r * 0.2, r * 0.18, r * 0.2], cast: false });
  addOutline(nose, 0.1);
  disguise.add(nose);
  const stache = mat('#4a2a1a', { rough: 0.7 });
  for (const s of [-1, 1]) {
    const m = mesh(capsuleGeo(r * 0.09, r * 0.4, 4, 8), stache, { pos: [s * r * 0.17, -r * 0.27, r * 0.98], rot: [0, s * 0.25, Math.PI / 2 + s * 0.35], cast: false });
    disguise.add(m);
  }
  headPivot.add(disguise);

  // 스카프(목): 고리 + 매듭 + 펄럭이는 꼬리
  const scarfMat = mat(SCARF, { rough: 0.62 });
  const scarf = new THREE.Group();
  scarf.position.y = r * 0.08;
  const ring = mesh(torusGeo(r * 0.6, r * 0.17, 10, 28), scarfMat, { rot: [Math.PI / 2, 0, 0] });
  addOutline(ring, r * 0.03);
  const knot = mesh(sphereGeo(1, 14, 10), scarfMat, { pos: [r * 0.36, -r * 0.05, r * 0.5], scale: r * 0.2 });
  addOutline(knot, 0.1);
  const tail = new THREE.Group();
  tail.position.set(r * 0.42, -r * 0.08, r * 0.45);
  const tailMesh = mesh(capsuleGeo(r * 0.12, r * 0.55, 4, 8), scarfMat, { pos: [r * 0.1, -r * 0.24, 0], rot: [0, 0, 0.45] });
  addOutline(tailMesh, r * 0.025);
  tail.add(tailMesh);
  scarf.add(ring, knot, tail);

  g.add(body, belly, scarf, headPivot);

  const tmp = new THREE.Vector3();
  const inv = new THREE.Matrix4();
  let lastMouth = '';
  const state = { bulb: new THREE.Color(BULB.idle), eyeAim: [0, 0] };

  /**
   * 표정과 움직임. look = 눈으로 따라갈 세계 좌표(없으면 정면).
   */
  function update({ t = 0, mood = 'idle', look = null, lit = 1 } = {}) {
    const f = FACES[mood] || FACES.idle;
    // 깜빡임(평소·긴장 때)
    const blink = (mood === 'idle' || mood === 'alert') && (t % 3.7 > 3.58 || (t + 1.3) % 5.9 > 5.8);
    const hop = mood === 'happy' ? Math.abs(Math.sin(t * 9)) * r * 0.12 : 0;
    const duck = mood === 'hide' ? -r * 0.35 : mood === 'shock' ? r * 0.12 : 0;
    g.position.y = hop + duck;
    // 몸짓: 평소엔 살짝 갸웃, 기쁘면 좌우로 흔들, 놀라면 부르르
    headPivot.rotation.z = mood === 'happy' ? Math.sin(t * 7) * 0.14 : mood === 'shock' ? Math.sin(t * 46) * 0.05 : Math.sin(t * 1.3) * 0.05;
    headPivot.rotation.x = mood === 'hide' ? 0.12 : mood === 'alert' ? -0.05 : 0;
    const squash = mood === 'shock' ? 1 + Math.sin(t * 30) * 0.03 : 1 + Math.sin(t * 2.4) * 0.02;
    headPivot.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));
    // 눈
    let yaw = 0;
    let pitch = 0;
    if (look) {
      headPivot.updateMatrixWorld(true);
      inv.copy(headPivot.matrixWorld).invert();
      tmp.copy(look).applyMatrix4(inv);
      yaw = Math.atan2(tmp.x, Math.max(tmp.z, 0.2));
      pitch = -Math.atan2(tmp.y, Math.max(Math.hypot(tmp.x, tmp.z), 0.2));
    }
    if (mood === 'hide') {
      yaw = Math.sin(t * 3.1) * 0.5; // 두리번두리번
      pitch = 0.1;
    }
    const k = 0.25; // 눈은 부드럽게 따라간다
    state.eyeAim[0] += (Math.max(-0.5, Math.min(0.5, yaw)) - state.eyeAim[0]) * k;
    state.eyeAim[1] += (Math.max(-0.4, Math.min(0.4, pitch)) - state.eyeAim[1]) * k;
    for (const e of eyes) {
      e.pivot.rotation.set(state.eyeAim[1], state.eyeAim[0], 0);
      e.ball.scale.set(eyeR * f.eye, eyeR * f.eye * f.squint, eyeR * f.eye);
      e.pivot.scale.set(f.eye, f.eye * f.squint, f.eye);
      e.pupil.scale.set(eyeR * 0.34 * f.pupil, eyeR * 0.34 * f.pupil, eyeR * 0.15);
      e.lid.rotation.x = blink ? 1.57 : f.lid;
      e.lid.scale.setScalar(f.eye);
      e.arc.visible = !!f.arcs;
      const closed = blink || f.lid > 1.2;
      e.glint.visible = !closed;
      e.pivot.visible = !closed; // 감은 눈꺼풀 사이로 눈동자가 비치지 않게
    }
    // 눈썹: 안쪽 끝이 내려가면 화남/음흉, 올라가면 걱정
    const browWiggle = mood === 'shock' ? Math.sin(t * 20) * 0.04 : 0;
    for (const b of brows) {
      b.holder.position.copy(b.base);
      b.holder.position.y += f.brow[1] * r + browWiggle * r;
      b.holder.rotation.set(0, 0, b.s * f.brow[0]);
    }
    // 입
    if (f.mouth !== lastMouth) {
      mouth.visible = f.mouth !== 'none';
      if (mouth.visible) {
        mouth.material.map = mouthTexture(f.mouth);
        mouth.material.needsUpdate = true;
      }
      lastMouth = f.mouth;
    }
    disguise.visible = mood === 'hide';
    sweat.visible = mood === 'alert' || mood === 'hide';
    if (sweat.visible) sweat.position.y = r * (0.45 - ((t * 0.8) % 1) * 0.25);
    // 더듬이: 통통 튀는 스프링, 전구 색 = 기분
    const spring = mood === 'shock' ? Math.sin(t * 28) * 0.25 : Math.sin(t * 3.2) * 0.12 + Math.sin(t * 7.1) * 0.04;
    antenna.rotation.set(spring * 0.6, 0, spring);
    state.bulb.set(BULB[mood] || BULB.idle);
    const flash = mood === 'shock' ? (Math.sin(t * 18) > 0 ? 1 : 0.35) : 1;
    const on = (mood === 'hide' ? 0.15 : 1) * flash * (0.35 + 0.65 * lit);
    bulbMat.emissive.copy(state.bulb);
    bulbMat.emissiveIntensity = 0.3 + 2.2 * on;
    bulbGlow.material.color.copy(state.bulb);
    bulbGlow.material.opacity = 0.75 * on;
    // 스카프 꼬리 펄럭
    tail.rotation.z = Math.sin(t * 6) * 0.25 + (mood === 'shock' ? Math.sin(t * 30) * 0.2 : 0);
    tail.rotation.x = Math.sin(t * 4.3) * 0.15;
  }
  update({});
  return { group: g, update, height: headY + r * 2.0 };
}
