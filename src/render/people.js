// 하늘을 올려다보는 지구인들. 원점은 발밑(열기구·우주비행사는 몸 중심).
import { C, TAU, paint, circle, ellipse, rrect, poly, line, glow, withAlpha, lerp } from './draw.js';

const SKIN = ['#ffd9b8', '#f2bf95', '#d9a077', '#b97f58'];

/**
 * @typedef {object} Pose
 * @property {number} t      애니메이션 시계(초)
 * @property {number} dir    바라보는 방향 -1 | 1
 * @property {number} walk   걷는 정도 0..1
 * @property {number} look   고개를 든 정도 0..1
 * @property {boolean} [shock] 들켰을 때(가리키며 놀란다)
 * @property {boolean} [wave]  손을 흔든다(진엔딩)
 */

const LOOKS = {
  farmer: { skin: 2, shirt: '#5b8fd6', pants: '#3a3266', hat: 'straw', item: 'hoe' },
  kid: { skin: 0, shirt: C.coral, pants: '#3a3266', hat: 'cap' },
  walker: { skin: 1, shirt: C.lilac, pants: '#4a3a7a', hat: 'ponytail', item: 'dog' },
  camper: { skin: 1, shirt: '#5fbf7a', pants: '#3a3266', hat: 'beanie', item: 'mug' },
  fisher: { skin: 2, shirt: '#e8c26a', pants: '#3f5a52', hat: 'bucket', item: 'rod' },
  worker: { skin: 0, shirt: '#3d4b8f', pants: '#2b2452', hat: 'neat', item: 'case' },
  streamer: { skin: 3, shirt: '#ff8fd0', pants: '#3a3266', hat: 'phones', item: 'stick' },
  astronomer: { skin: 1, shirt: '#f4f0ff', pants: '#3a3266', hat: 'messy', item: 'scope' },
  photographer: { skin: 3, shirt: '#3fae93', pants: '#2b2452', hat: 'beret', item: 'camera' },
};

function hat(ctx, kind, dir) {
  switch (kind) {
    case 'straw':
      ellipse(ctx, 0, -6.5, 15.5, 4);
      paint(ctx, '#e8c26a', 2.2);
      ctx.beginPath();
      ctx.ellipse(0, -7, 8.5, 8, 0, Math.PI, TAU);
      ctx.closePath();
      paint(ctx, '#f0d48a', 2.2);
      break;
    case 'cap':
      ctx.beginPath();
      ctx.arc(0, -2.5, 10.3, Math.PI, TAU);
      ctx.closePath();
      paint(ctx, C.lemon, 2.2);
      rrect(ctx, dir > 0 ? 4 : -15, -5, 11, 3.6, 1.8);
      paint(ctx, C.lemon, 2);
      break;
    case 'ponytail':
      circle(ctx, -dir * 11, -1, 5);
      paint(ctx, '#7a4a3a', 2.2);
      ctx.beginPath();
      ctx.arc(0, -1.5, 10.4, Math.PI * 0.95, Math.PI * 2.05);
      ctx.closePath();
      paint(ctx, '#7a4a3a', 2.2);
      rrect(ctx, dir > 0 ? 2 : -13, -5.5, 11, 3.2, 1.6);
      paint(ctx, C.white, 1.8);
      break;
    case 'beanie':
      ctx.beginPath();
      ctx.ellipse(0, -3, 10.4, 10, 0, Math.PI, TAU);
      ctx.closePath();
      paint(ctx, C.coral, 2.2);
      rrect(ctx, -11, -5.5, 22, 4.4, 2.2);
      paint(ctx, C.cream, 2);
      circle(ctx, 0, -13.5, 3.2);
      paint(ctx, C.cream, 1.8);
      break;
    case 'bucket':
      poly(ctx, [[-7, -12], [7, -12], [12.5, -3.5], [-12.5, -3.5]]);
      paint(ctx, '#7a9a6a', 2.2);
      break;
    case 'neat':
      ctx.beginPath();
      ctx.arc(0, -1.5, 10.3, Math.PI * 1.02, Math.PI * 1.98);
      ctx.quadraticCurveTo(dir * 2, -4, -dir * 10, -1.5);
      ctx.closePath();
      paint(ctx, '#2b2452', 2);
      break;
    case 'phones':
      ctx.beginPath();
      ctx.arc(0, -1, 11.5, Math.PI * 1.08, Math.PI * 1.92);
      ctx.lineWidth = 3.4;
      ctx.strokeStyle = C.ink;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -1.5, 9.6, Math.PI, TAU);
      ctx.closePath();
      paint(ctx, '#4a2f2a', 0);
      circle(ctx, -dir * 9.5, 1, 4.2);
      paint(ctx, C.mint, 2);
      break;
    case 'messy':
      for (const [x, y, r] of [[-7, -7, 4.5], [0, -10, 5], [7, -7, 4.5], [-10, -1, 3.5], [10, -1, 3.5]]) {
        circle(ctx, x, y, r);
        paint(ctx, '#e6e2f4', 1.8);
      }
      break;
    case 'beret':
      ellipse(ctx, -dir * 2, -8, 11.5, 5, -dir * 0.18);
      paint(ctx, '#2b2452', 2);
      circle(ctx, -dir * 2, -13, 1.6);
      paint(ctx, '#2b2452', 1.4);
      break;
  }
}

function dog(ctx, t, dir, alert) {
  const wag = Math.sin(t * (alert ? 22 : 10)) * 0.5;
  ctx.save();
  ctx.translate(-dir * 22, 0);
  ctx.scale(dir, 1);
  // 꼬리
  ctx.save();
  ctx.translate(-9, -11);
  ctx.rotate(-0.9 + wag);
  line(ctx, 0, 0, -1, -8, C.ink, 4.4);
  line(ctx, 0, 0, -1, -8, '#f0d6a3', 2.2);
  ctx.restore();
  line(ctx, -6, -5, -6, 0, C.ink, 3.4);
  line(ctx, 6, -5, 6, 0, C.ink, 3.4);
  rrect(ctx, -10, -14, 20, 10, 5);
  paint(ctx, '#f0d6a3', 2.2);
  const up = alert ? -3 : 0;
  circle(ctx, 11, -15 + up, 6);
  paint(ctx, '#f0d6a3', 2.2);
  ellipse(ctx, 8, -20 + up, 2.6, 4, -0.4);
  paint(ctx, '#b98a5a', 1.8);
  circle(ctx, 13, -16 + up, 1.1);
  ctx.fillStyle = C.ink;
  ctx.fill();
  circle(ctx, 16.5, -14 + up, 1.5);
  ctx.fill();
  if (alert) {
    for (const a of [-0.5, 0, 0.5]) {
      line(ctx, 20, -18 + up + a * 10, 25, -19 + up + a * 16, C.white, 1.8);
    }
  }
  ctx.restore();
}

function person(ctx, type, p) {
  const L = LOOKS[type];
  const skin = SKIN[L.skin];
  const dir = p.dir;
  const look = p.look;
  const swing = Math.sin(p.t * 9) * 5 * p.walk;
  const bounce = Math.abs(Math.sin(p.t * 9)) * 1.4 * p.walk;
  const shock = !!p.shock;

  if (L.item === 'dog') dog(ctx, p.t, dir, look > 0.5);

  // 다리와 발
  ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    line(ctx, s * 4, -14, s * 4 + s * swing, -1.5, L.pants, 5.6);
    ellipse(ctx, s * 4 + s * swing + dir * 1.5, -1, 4, 2.2);
    paint(ctx, C.ink, 0);
  }
  ctx.save();
  ctx.translate(0, -bounce);

  // 뒤쪽 팔
  const backHand = [-dir * 11 - swing * 0.5, -17];
  line(ctx, -dir * 8, -29, backHand[0], backHand[1], C.ink, 6);
  line(ctx, -dir * 8, -29, backHand[0], backHand[1], L.shirt, 3.4);
  if (L.item === 'case') {
    rrect(ctx, backHand[0] - 6, backHand[1] + 1, 12, 9, 2);
    paint(ctx, '#8a5a3a', 2);
  }
  if (L.item === 'dog') line(ctx, backHand[0], backHand[1], -dir * 14, -13, C.ink, 1.4);

  // 몸
  rrect(ctx, -10, -35, 20, 23, 8);
  paint(ctx, L.shirt, 2.4);
  if (type === 'worker') {
    poly(ctx, [[-1.6, -34], [1.6, -34], [2.4, -24], [0, -21], [-2.4, -24]]);
    paint(ctx, C.coral, 1.4);
  }
  if (type === 'farmer') {
    rrect(ctx, -7, -27, 14, 15, 3);
    paint(ctx, '#3d5fa8', 1.8);
  }
  if (type === 'photographer' && look < 0.5) {
    rrect(ctx, dir * 2 - 6, -27, 12, 8, 2);
    paint(ctx, '#2b2452', 1.8);
    circle(ctx, dir * 4, -23, 3);
    paint(ctx, C.aqua, 1.6);
  }

  // 앞쪽 팔: 평소엔 흔들고, 올려다볼 땐 이마에 손, 들켰으면 가리킨다
  let hand;
  if (shock) hand = [dir * 17, -45];
  else if (p.wave) hand = [dir * 14 + Math.sin(p.t * 9) * 3, -50];
  else hand = [lerp(dir * 11 + swing * 0.5, dir * 9, look), lerp(-17, -45, look)];
  if (L.item === 'hoe') {
    line(ctx, hand[0], hand[1] + 14, hand[0] + dir * 2, hand[1] - 22, '#8a5a3a', 2.6);
    rrect(ctx, hand[0] + dir * 2 - (dir > 0 ? 0 : 8), hand[1] - 24, 8, 4, 1.5);
    paint(ctx, '#a9a3c9', 1.6);
  }
  if (L.item === 'rod') {
    const tip = [hand[0] + dir * 22, hand[1] - 30];
    line(ctx, hand[0], hand[1] + 6, tip[0], tip[1], '#8a5a3a', 2.2);
    ctx.beginPath();
    ctx.moveTo(tip[0], tip[1]);
    ctx.quadraticCurveTo(tip[0] + dir * 6, tip[1] + 14, tip[0] + dir * 3, tip[1] + 22 + Math.sin(p.t * 3) * 2);
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = withAlpha(C.white, 0.8);
    ctx.stroke();
  }
  if (L.item === 'stick') {
    const tip = [hand[0] + dir * 12, hand[1] - 16];
    line(ctx, hand[0], hand[1], tip[0], tip[1], C.ink, 2.2);
    glow(ctx, tip[0], tip[1] - 3, 12, C.aqua, 0.5);
    rrect(ctx, tip[0] - 3.5, tip[1] - 9, 7, 11, 2);
    paint(ctx, C.aqua, 1.8);
  }
  if (L.item === 'scope' && !shock) {
    ctx.save();
    ctx.translate(dir * 2, -23);
    ctx.rotate(dir * lerp(0.25, -0.75, look));
    rrect(ctx, dir > 0 ? -2 : -18, -3, 20, 6, 2.5);
    paint(ctx, '#a9a3c9', 1.8);
    ctx.restore();
  }
  line(ctx, dir * 8, -29, hand[0], hand[1], C.ink, 6);
  line(ctx, dir * 8, -29, hand[0], hand[1], L.shirt, 3.4);
  circle(ctx, hand[0], hand[1], 2.8);
  paint(ctx, skin, 1.6);
  if (L.item === 'mug') {
    rrect(ctx, hand[0] - 3 + dir * 2, hand[1] - 6, 7, 7, 1.5);
    paint(ctx, C.white, 1.6);
    if (look < 0.5) {
      ctx.beginPath();
      ctx.moveTo(hand[0] + dir * 2, hand[1] - 8);
      ctx.quadraticCurveTo(hand[0] + dir * 2 + 3, hand[1] - 12, hand[0] + dir * 2, hand[1] - 15 - Math.sin(p.t * 3));
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = withAlpha(C.white, 0.6);
      ctx.stroke();
    }
  }
  if (type === 'photographer' && look >= 0.5) {
    rrect(ctx, dir * 8 - 6, -50, 12, 8, 2);
    paint(ctx, '#2b2452', 1.8);
    circle(ctx, dir * 11, -48, 3.4);
    paint(ctx, C.aqua, 1.6);
  }

  // 머리: 올려다볼수록 뒤로 젖힌다
  ctx.save();
  ctx.translate(0, -44);
  ctx.rotate(-dir * look * 0.5);
  circle(ctx, 0, 0, 10);
  paint(ctx, skin, 2.4);
  hat(ctx, L.hat, dir);
  const ex = dir * lerp(3.4, 2, look);
  const ey = lerp(0.5, -2.6, look);
  ctx.fillStyle = C.ink;
  if (shock) {
    for (const s of [-1, 1]) {
      circle(ctx, ex + s * 3.2, ey, 2.6);
      paint(ctx, C.white, 1.4);
      circle(ctx, ex + s * 3.2, ey, 0.9);
      ctx.fillStyle = C.ink;
      ctx.fill();
    }
    ellipse(ctx, ex, ey + 5.6, 2.2, 2.8);
    ctx.fill();
  } else {
    circle(ctx, ex - 2.8, ey, 1.35);
    ctx.fill();
    circle(ctx, ex + 2.8, ey, 1.35);
    ctx.fill();
    if (look > 0.5) {
      ellipse(ctx, ex, ey + 4.6, 1.5, 1.9);
      ctx.fill();
    } else {
      line(ctx, ex - 1.6, ey + 4.4, ex + 1.6, ey + 4.4, C.ink, 1.4);
    }
  }
  if (L.hat === 'messy') {
    for (const s of [-1, 1]) {
      circle(ctx, ex + s * 2.8, ey, 2.9);
      ctx.lineWidth = 1.3;
      ctx.strokeStyle = C.ink;
      ctx.stroke();
    }
  }
  ctx.restore();
  ctx.restore();
}

/** 열기구. 원점은 바구니 바닥 가운데. */
function balloonist(ctx, p) {
  const dir = p.dir;
  const look = p.look;
  // 풍선
  const by = -78;
  for (const s of [-1, 1]) line(ctx, s * 15, by + 22, s * 10, -20, C.ink, 1.6);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-11, by + 30);
  ctx.bezierCurveTo(-34, by + 12, -32, by - 28, 0, by - 28);
  ctx.bezierCurveTo(32, by - 28, 34, by + 12, 11, by + 30);
  ctx.closePath();
  paint(ctx, C.cream, 2.5);
  ctx.clip();
  ctx.fillStyle = C.coral;
  for (const x of [-27, -6, 15]) ctx.fillRect(x, by - 30, 10, 64);
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(-11, by + 30);
  ctx.bezierCurveTo(-34, by + 12, -32, by - 28, 0, by - 28);
  ctx.bezierCurveTo(32, by - 28, 34, by + 12, 11, by + 30);
  ctx.closePath();
  paint(ctx, null, 2.5);
  // 버너 불꽃
  const fl = 5 + Math.sin(p.t * 17) * 1.6;
  glow(ctx, 0, by + 36, 14, C.lemon, 0.5);
  ctx.beginPath();
  ctx.moveTo(-3, by + 40);
  ctx.quadraticCurveTo(0, by + 40 - fl * 2, 3, by + 40);
  ctx.closePath();
  paint(ctx, C.lemon, 1.4);
  // 승객
  ctx.save();
  ctx.translate(0, -27);
  ctx.rotate(-dir * look * 0.45);
  circle(ctx, 0, 0, 8);
  paint(ctx, SKIN[1], 2.2);
  ctx.beginPath();
  ctx.arc(0, -1, 8.3, Math.PI, TAU);
  ctx.closePath();
  paint(ctx, '#8a5a3a', 2);
  rrect(ctx, -8.5, -3.2, 17, 4.6, 2.2);
  paint(ctx, p.shock ? C.white : C.aqua, 1.6);
  ctx.fillStyle = C.ink;
  if (look > 0.5 || p.shock) {
    ellipse(ctx, dir * 1.5, 4.6, 1.5, 2);
    ctx.fill();
  }
  ctx.restore();
  if (p.shock || look > 0.5) {
    line(ctx, dir * 8, -22, dir * 15, -33, C.ink, 5);
    line(ctx, dir * 8, -22, dir * 15, -33, '#5b8fd6', 2.8);
  }
  // 바구니
  rrect(ctx, -12, -21, 24, 21, 4);
  paint(ctx, '#c98a52', 2.4);
  ctx.strokeStyle = withAlpha(C.ink, 0.35);
  ctx.lineWidth = 1.2;
  for (const y of [-14, -7]) {
    ctx.beginPath();
    ctx.moveTo(-11, y);
    ctx.lineTo(11, y);
    ctx.stroke();
  }
  rrect(ctx, -13.5, -23, 27, 5, 2.5);
  paint(ctx, '#a66a3a', 2);
}

/** 우주비행사. 원점은 몸 중심. */
function astronaut(ctx, p) {
  const dir = p.dir;
  const look = p.look;
  const drift = Math.sin(p.t * 1.4) * 0.18;
  // 생명줄
  ctx.beginPath();
  ctx.moveTo(-dir * 8, 6);
  ctx.bezierCurveTo(-dir * 30, 30, -dir * 10, 50, -dir * 44, 80);
  ctx.lineWidth = 2;
  ctx.strokeStyle = withAlpha(C.white, 0.6);
  ctx.stroke();
  ctx.save();
  ctx.rotate(drift - dir * look * 0.25);
  // 배낭
  rrect(ctx, -dir * 16 - 5, -14, 11, 24, 4);
  paint(ctx, '#c9c4e0', 2.2);
  // 다리
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.translate(s * 5, 12);
    ctx.rotate(s * 0.18 + Math.sin(p.t * 1.9 + s) * 0.14);
    rrect(ctx, -4, 0, 8, 15, 4);
    paint(ctx, C.white, 2.2);
    ctx.restore();
  }
  // 팔
  const armA = p.shock ? -2.2 : p.wave ? -2.4 + Math.sin(p.t * 9) * 0.35 : lerp(0.5, -2.0, look);
  ctx.save();
  ctx.translate(dir * 9, -8);
  ctx.rotate(dir * armA);
  rrect(ctx, -3.6, 0, 7.2, 16, 3.6);
  paint(ctx, C.white, 2.2);
  ctx.restore();
  ctx.save();
  ctx.translate(-dir * 9, -8);
  ctx.rotate(-dir * 0.5 + Math.sin(p.t * 1.7) * 0.1);
  rrect(ctx, -3.6, 0, 7.2, 15, 3.6);
  paint(ctx, C.white, 2.2);
  ctx.restore();
  // 몸
  rrect(ctx, -11, -13, 22, 27, 9);
  paint(ctx, C.white, 2.4);
  rrect(ctx, -5, -4, 10, 7, 2);
  paint(ctx, C.coral, 1.6);
  // 헬멧
  circle(ctx, 0, -22, 12.5);
  paint(ctx, C.white, 2.4);
  const vx = dir * lerp(2, 1, look);
  const vy = lerp(-21, -24, look);
  ellipse(ctx, vx, vy, 8.6, 7.2);
  paint(ctx, '#2b2452', 2);
  if (p.shock) {
    for (const s of [-1, 1]) {
      circle(ctx, vx + s * 3.2, vy, 2.3);
      ctx.fillStyle = C.white;
      ctx.fill();
    }
  } else {
    ctx.beginPath();
    ctx.ellipse(vx, vy, 5.8, 4.6, 0, Math.PI * 1.1, Math.PI * 1.5);
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = withAlpha(C.aqua, 0.9);
    ctx.stroke();
  }
  ctx.restore();
}

/** 지구인 한 명을 그린다. */
export function drawWatcher(ctx, type, pose) {
  const p = { t: 0, dir: 1, walk: 0, look: 0, shock: false, wave: false, ...pose };
  if (type === 'balloonist') balloonist(ctx, p);
  else if (type === 'astronaut') astronaut(ctx, p);
  else person(ctx, type, p);
}

/** 머리 위치(발밑 원점 기준). 말풍선과 시선 원뿔의 시작점. */
export function headOffset(type, scale = 1) {
  if (type === 'balloonist') return { x: 0, y: -27 };
  if (type === 'astronaut') return { x: 0, y: -22 };
  return { x: 0, y: -44 * scale };
}

/** 머리 위 말풍선에 들어갈 꼭대기 높이. */
export function topOffset(type, scale = 1) {
  if (type === 'balloonist') return -112;
  if (type === 'astronaut') return -40;
  return -62 * scale;
}
