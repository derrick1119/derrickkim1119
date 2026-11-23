// 기체 8형태와 조종사. 원점은 기체 중심, 단위는 "설계 픽셀"(장면이 배율을 정한다).
// 컨셉: 어두운 금속 접시 + 띠를 따라 박힌 알약 모양 청록 조명 + 아래쪽 발광부 + 유리 돔 속 조종사 피포.
import { P, TAU, clamp, tone, edge, shade, ball, gloss, glow, withAlpha, rrect, ellipse, circle, cumulus } from './draw.js';

/** 형태별 반폭(설계 픽셀). 장면이 화면 크기에 맞춰 배율을 구할 때 쓴다. */
export const UFO_HALF_WIDTH = [30, 48, 57, 74, 66, 74, 88, 118];
/** 형태별 빔 발사구의 y 위치. */
export const UFO_BELLY = [19, 25, 28, 27, 34, 33, 42, 48];
/** 형태별 꼭대기(말풍선·구름을 붙일 높이). */
export const UFO_TOP = [-23, -29, -34, -29, -33, -30, -39, -50];

const AMBER = '#ffb347';
const DIM = '#2c5966';

// ───────── 조종사: 피포(3D 모델과 같은 얼굴을 2D 로) ─────────

const SKIN_TOP = '#b468ff';
const SKIN = '#dc84ff';
const SKIN_LOW = '#f6c4ff';
const LINE = '#2b1a5e';
const INK = '#2a1660';
const BULB = { idle: '#5ff0ff', happy: '#ffd23f', alert: '#ff9a3c', shock: '#ff4d5e', hide: '#5b4f8f' };

/** 반짝이는 큰 눈 하나. (cx, cy) 중심, k = 크기 배율, pupil = 눈동자 크기. */
function bigEye(ctx, cx, cy, r, k, pupil, lookX = 0) {
  const rx = r * 0.3 * k;
  const ry = r * 0.36 * k;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = Math.max(1, r * 0.07);
  ctx.strokeStyle = LINE;
  ctx.stroke();
  // 눈동자: 위 남보라 → 아래 청록
  const ir = Math.min(rx, ry) * 0.82 * pupil;
  const ix = cx + lookX * rx * 0.25;
  const iy = cy + ry * 0.08;
  const g = ctx.createLinearGradient(ix, iy - ir, ix, iy + ir);
  g.addColorStop(0, '#231a78');
  g.addColorStop(0.45, '#3d4fe0');
  g.addColorStop(0.85, '#3cc4ff');
  g.addColorStop(1, '#9ff8ff');
  circle(ctx, ix, iy, ir);
  ctx.fillStyle = g;
  ctx.fill();
  circle(ctx, ix, iy - ir * 0.04, ir * 0.48);
  ctx.fillStyle = '#120b3a';
  ctx.fill();
  // 반짝임 둘(큰 것 왼쪽 위, 작은 것 오른쪽 아래)
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(cx - rx * 0.28, cy - ry * 0.3, rx * 0.26, ry * 0.24, -0.5, 0, TAU);
  ctx.fill();
  circle(ctx, cx + rx * 0.3, cy + ry * 0.3, rx * 0.12);
  ctx.fill();
}

/**
 * 피포. (x, y) = 머리 중심, r = 머리 반지름.
 * mood: idle | happy | alert | hide | shock
 */
function alien(ctx, x, y, r, mood, t) {
  const duck = mood === 'hide' ? r * 0.34 : mood === 'shock' ? -r * 0.14 : 0;
  const bob = mood === 'happy' ? Math.abs(Math.sin(t * 9)) * r * 0.1 : Math.sin(t * 2.2) * r * 0.025;
  const hy = y + duck - bob;
  const hw = r * 1.1; // 살짝 넓적한 찹쌀떡 머리
  const hh = r * 0.94;

  // 몸과 주황 목도리
  ctx.beginPath();
  ctx.ellipse(x, hy + hh * 1.45, r * 0.62, r * 0.6, 0, Math.PI, TAU);
  ctx.closePath();
  shade(ctx, SKIN, x - r * 0.6, hy + hh * 0.9, x + r * 0.6, hy + hh * 1.5, { lw: 1.4, line: LINE });
  ctx.beginPath();
  ctx.ellipse(x, hy + hh * 0.98, r * 0.6, r * 0.16, 0, 0, TAU);
  ctx.fillStyle = '#ff8a3c';
  ctx.fill();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = LINE;
  ctx.stroke();

  // 더듬이와 기분 전구
  const tipX = x + r * 0.22;
  const tipY = hy - hh - r * 0.62;
  ctx.beginPath();
  ctx.moveTo(x, hy - hh * 0.9);
  ctx.quadraticCurveTo(x + r * 0.02, tipY + r * 0.2, tipX, tipY);
  ctx.lineWidth = Math.max(1.6, r * 0.13);
  ctx.strokeStyle = LINE;
  ctx.stroke();
  ctx.lineWidth = Math.max(1, r * 0.08);
  ctx.strokeStyle = SKIN;
  ctx.stroke();
  const bulb = BULB[mood] || BULB.idle;
  glow(ctx, tipX, tipY, r * 0.5, bulb, 0.5);
  circle(ctx, tipX, tipY, r * 0.16);
  ctx.fillStyle = bulb;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = LINE;
  ctx.stroke();

  // 머리: 위는 진한 보라, 볼 쪽은 분홍빛
  ctx.beginPath();
  ctx.ellipse(x, hy, hw, hh, 0, 0, TAU);
  const g = ctx.createLinearGradient(x, hy - hh, x, hy + hh);
  g.addColorStop(0, SKIN_TOP);
  g.addColorStop(0.45, SKIN);
  g.addColorStop(1, SKIN_LOW);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = Math.max(1.4, r * 0.09);
  ctx.strokeStyle = LINE;
  ctx.stroke();
  // 연분홍 점박이와 광택
  ctx.fillStyle = withAlpha('#f6b4ff', 0.9);
  for (const [dx, dy, rr] of [[-0.62, -0.5, 0.13], [0.55, -0.62, 0.1], [0.8, -0.2, 0.08]]) {
    circle(ctx, x + dx * r, hy + dy * r, rr * r);
    ctx.fill();
  }
  gloss(ctx, x - hw * 0.45, hy - hh * 0.55, r * 0.3, r * 0.13, -0.5, 0.5);

  // 이마에 올린 비행 고글
  ctx.beginPath();
  ctx.ellipse(x, hy - hh * 0.5, hw * 0.98, hh * 0.2, 0, Math.PI * 1.05, Math.PI * 1.95);
  ctx.lineWidth = Math.max(1.4, r * 0.1);
  ctx.strokeStyle = '#8a5636';
  ctx.stroke();
  for (const s of [-1, 1]) {
    const gx = x + s * r * 0.36;
    const gy = hy - hh * 0.66;
    circle(ctx, gx, gy, r * 0.21);
    ctx.fillStyle = '#ffc444';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = LINE;
    ctx.stroke();
    circle(ctx, gx, gy, r * 0.13);
    ctx.fillStyle = '#8ff6ff';
    ctx.fill();
  }

  // 볼
  ctx.fillStyle = withAlpha('#ff7ab8', mood === 'hide' ? 0.55 : 0.4);
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(x + s * r * 0.68, hy + r * 0.3, r * 0.17, r * 0.1, 0, 0, TAU);
    ctx.fill();
  }

  // 눈
  const ex = r * 0.4;
  const ey = hy + r * 0.02;
  const blink = mood === 'idle' && (t % 4.3 > 4.15 || (t + 1.9) % 6.7 > 6.58);
  ctx.lineCap = 'round';
  if (mood === 'happy' || blink) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(1.2, r * 0.12);
    for (const s of [-1, 1]) {
      ctx.beginPath();
      if (mood === 'happy') ctx.arc(x + s * ex, ey + r * 0.1, r * 0.2, Math.PI * 1.15, Math.PI * 1.85);
      else {
        ctx.moveTo(x + s * ex - r * 0.22, ey + r * 0.04);
        ctx.quadraticCurveTo(x + s * ex, ey + r * 0.14, x + s * ex + r * 0.22, ey + r * 0.04);
      }
      ctx.stroke();
    }
  } else {
    const k = mood === 'shock' ? 1.22 : mood === 'alert' ? 1.1 : 1;
    const pupil = mood === 'shock' ? 0.4 : mood === 'alert' ? 0.75 : 1;
    const look = mood === 'hide' ? Math.sin(t * 3) : 0;
    for (const s of [-1, 1]) bigEye(ctx, x + s * ex, ey, r, k, pupil, look);
    // 걱정 눈썹
    if (mood === 'alert') {
      ctx.strokeStyle = INK;
      ctx.lineWidth = Math.max(1, r * 0.08);
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(x + s * ex - s * r * 0.2, ey - r * 0.48);
        ctx.lineTo(x + s * ex + s * r * 0.16, ey - r * 0.4);
        ctx.stroke();
      }
    }
  }

  // 입
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineWidth = Math.max(1, r * 0.08);
  const my = hy + r * 0.5;
  if (mood === 'shock') {
    ctx.beginPath();
    ctx.ellipse(x, my + r * 0.06, r * 0.1, r * 0.14, 0, 0, TAU);
    ctx.fill();
  } else if (mood === 'happy') {
    ctx.beginPath();
    ctx.arc(x, my - r * 0.06, r * 0.2, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x, my + r * 0.08, r * 0.09, r * 0.05, 0, 0, TAU);
    ctx.fillStyle = '#ff7a9a';
    ctx.fill();
  } else if (mood === 'alert') {
    rrect(ctx, x - r * 0.14, my - r * 0.04, r * 0.28, r * 0.1, r * 0.04);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.stroke();
  } else if (mood !== 'hide') {
    ctx.beginPath();
    ctx.arc(x, my - r * 0.08, r * 0.13, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }

  // 숨을 때: 안경·코·콧수염 변장
  if (mood === 'hide') {
    ctx.lineWidth = Math.max(1.2, r * 0.08);
    ctx.strokeStyle = '#1b1240';
    for (const s of [-1, 1]) {
      circle(ctx, x + s * ex, ey, r * 0.3);
      ctx.stroke();
    }
    circle(ctx, x, hy + r * 0.32, r * 0.14);
    ctx.fillStyle = '#ff9fb8';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x - r * 0.14, hy + r * 0.48, r * 0.16, r * 0.07, 0.3, 0, TAU);
    ctx.ellipse(x + r * 0.14, hy + r * 0.48, r * 0.16, r * 0.07, -0.3, 0, TAU);
    ctx.fillStyle = '#4a2a1a';
    ctx.fill();
  }

  // 식은땀
  if (mood === 'alert' || mood === 'shock') {
    const sx = x + hw * 0.95;
    const sy = hy - hh * 0.5;
    ctx.beginPath();
    ctx.moveTo(sx, sy - r * 0.3);
    ctx.quadraticCurveTo(sx + r * 0.22, sy, sx, sy + r * 0.08);
    ctx.quadraticCurveTo(sx - r * 0.22, sy, sx, sy - r * 0.3);
    shade(ctx, '#9fe3ff', sx - r * 0.2, sy - r * 0.3, sx + r * 0.2, sy + r * 0.1, { lw: 1.1 });
  }
}

// ───────── 부품 ─────────

/** 유리 돔. (x, y) = 돔 바닥 가운데. 조종사가 있으면 안에 그린다. */
function dome(ctx, x, y, rx, ry, o, pilot = true) {
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(x - rx, y);
    ctx.ellipse(x, y, rx, ry, 0, Math.PI, TAU);
    ctx.closePath();
  };
  // 안쪽: 은은한 청록빛 + 조종사
  ctx.save();
  path();
  ctx.clip();
  const inner = ctx.createLinearGradient(x, y - ry, x, y);
  inner.addColorStop(0, withAlpha('#d8f6ff', 0.55));
  inner.addColorStop(1, withAlpha('#6fd2ea', 0.45));
  ctx.fillStyle = inner;
  ctx.fillRect(x - rx, y - ry, rx * 2, ry);
  if (pilot) alien(ctx, x, y - ry * 0.42, rx * 0.5, o.mood, o.t);
  ctx.restore();
  // 유리
  path();
  const g = ctx.createLinearGradient(x - rx, y - ry, x + rx, y);
  g.addColorStop(0, withAlpha('#ffffff', 0.32));
  g.addColorStop(0.5, withAlpha(P.glass, 0.08));
  g.addColorStop(1, withAlpha(P.glass, 0.22));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = withAlpha('#5fb8d6', 0.95);
  ctx.stroke();
  // 반사광
  ctx.beginPath();
  ctx.ellipse(x, y, rx * 0.76, ry * 0.8, 0, Math.PI * 1.14, Math.PI * 1.42);
  ctx.lineWidth = Math.max(1.6, rx * 0.12);
  ctx.strokeStyle = withAlpha('#ffffff', 0.85);
  ctx.lineCap = 'round';
  ctx.stroke();
  circle(ctx, x + rx * 0.42, y - ry * 0.7, Math.max(1, rx * 0.06));
  ctx.fillStyle = withAlpha('#ffffff', 0.8);
  ctx.fill();
  // 돔 받침: 얇은 금속 고리
  ctx.beginPath();
  ctx.ellipse(x, y, rx * 1.08, Math.max(2, rx * 0.15), 0, 0, Math.PI);
  ctx.ellipse(x, y - 1.2, rx * 1.08, Math.max(2, rx * 0.15), 0, Math.PI, 0, true);
  ctx.closePath();
  shade(ctx, P.hullLight, x - rx, y - 3, x + rx, y + 3, { lw: 1.4, light: 0.3, dark: 0.35 });
}

/** 띠 위의 알약 조명 하나. */
function pill(ctx, x, y, w, h, rot, on, alpha = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  if (on > 0.25) glow(ctx, 0, 0, w * 1.4, P.glow, 0.5 * on * alpha);
  rrect(ctx, -w / 2, -h / 2, w, h, h / 2);
  if (on > 0.25) {
    const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.45, P.glowSoft);
    g.addColorStop(1, P.glow);
    ctx.fillStyle = g;
  } else ctx.fillStyle = DIM;
  ctx.globalAlpha *= alpha;
  ctx.fill();
  ctx.lineWidth = 1.1;
  ctx.strokeStyle = on > 0.25 ? '#2aa7c4' : '#183844';
  ctx.stroke();
  ctx.restore();
}

/**
 * 접시 몸통 하나. y = 윗면 가장자리 타원의 중심.
 * @param {object} s  R 반폭, ry 윗면 타원 세로 반지름, band 옆띠 두께, lights 조명 수, bowl 아래 발광부 반폭 비율
 */
function saucer(ctx, o, { y = 0, R, ry = R * 0.3, band = R * 0.2, lights = 5, bowl = 0.42, ambers = 2, seams = true, base = P.hull }) {
  // 돌려주는 값: 가운데 솟은 단의 중심 y(돔을 올릴 자리)
  const lit = o.lit;
  // 아래 발광부(빔이 나오는 곳)
  const by = y + band + ry * 0.62;
  const brx = R * bowl;
  const bry = Math.max(3, R * 0.11);
  if (o.beam > 0) glow(ctx, 0, by + bry, brx * 2.4, P.glow, 0.55 * o.beam);
  ellipse(ctx, 0, by, brx, bry);
  const bg = ctx.createRadialGradient(-brx * 0.2, by + bry * 0.2, 0, 0, by, brx);
  const hot = Math.max(o.beam, lit * 0.7);
  bg.addColorStop(0, hot > 0.3 ? '#ffffff' : tone(DIM, 0.3));
  bg.addColorStop(0.6, hot > 0.3 ? P.glowSoft : DIM);
  bg.addColorStop(1, hot > 0.3 ? P.glow : tone(DIM, -0.3));
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = edge(P.hullDark, 0.3);
  ctx.stroke();

  // 옆띠
  ctx.beginPath();
  ctx.ellipse(0, y, R, ry, 0, 0, Math.PI);
  ctx.ellipse(0, y + band, R * 0.95, ry * 0.9, 0, Math.PI, 0, true);
  ctx.closePath();
  const sg = ctx.createLinearGradient(-R, 0, R, 0);
  sg.addColorStop(0, tone(P.hullDark, 0.28));
  sg.addColorStop(0.4, P.hullDark);
  sg.addColorStop(1, tone(P.hullDark, -0.35));
  ctx.fillStyle = sg;
  ctx.fill();
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = tone(P.hullDark, -0.45);
  ctx.lineJoin = 'round';
  ctx.stroke();
  // 띠의 청록 선
  ctx.beginPath();
  ctx.ellipse(0, y + band * 0.55, R * 0.975, ry * 0.95, 0, Math.PI * 0.05, Math.PI * 0.95);
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = withAlpha(P.glow, 0.15 + 0.55 * lit);
  ctx.stroke();
  // 알약 조명: 앞쪽 반원을 따라, 옆으로 갈수록 짧아진다
  for (let i = 0; i < lights; i++) {
    const a = Math.PI * (0.13 + (0.74 * i) / Math.max(1, lights - 1));
    const px = Math.cos(a) * R * 0.97;
    const py = y + Math.sin(a) * ry * 0.96 + band * 0.5;
    const fore = 0.38 + 0.62 * Math.sin(a);
    const chase = (Math.sin(o.t * 4 - i * 0.9) + 1) / 2;
    const rot = Math.atan2(ry * Math.cos(a), -R * Math.sin(a)) + Math.PI;
    pill(ctx, px, py, Math.max(4, R * 0.2 * fore), Math.max(2.6, band * 0.42), rot, lit * (0.6 + 0.4 * chase));
  }

  // 윗면: 가장자리 판 + 가운데가 솟은 단
  ellipse(ctx, 0, y, R, ry);
  shade(ctx, base, -R * 0.55, y - ry, R * 0.55, y + ry, { lw: 2, light: 0.42, dark: 0.12, line: tone(base, -0.5) });
  const cy = y - ry * 0.34;
  if (seams) {
    ctx.strokeStyle = withAlpha(tone(base, -0.45), 0.5);
    ctx.lineWidth = 1.2;
    for (const a of [0.28, 0.5, 0.72]) {
      const ang = Math.PI * a;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ang) * R * 0.64, cy + Math.sin(ang) * ry * 0.66);
      ctx.lineTo(Math.cos(ang) * R * 0.95, y + Math.sin(ang) * ry * 0.95);
      ctx.stroke();
    }
  }
  // 솟은 단의 옆면(그늘) → 윗면
  ctx.beginPath();
  ctx.ellipse(0, cy, R * 0.64, ry * 0.64, 0, 0, Math.PI);
  ctx.ellipse(0, cy + ry * 0.3, R * 0.66, ry * 0.66, 0, Math.PI, 0, true);
  ctx.closePath();
  ctx.fillStyle = tone(base, -0.12);
  ctx.fill();
  ellipse(ctx, 0, cy, R * 0.64, ry * 0.64);
  shade(ctx, tone(base, 0.06), -R * 0.4, cy - ry * 0.6, R * 0.4, cy + ry * 0.6, { lw: 1.4, light: 0.45, dark: 0.1, line: withAlpha(tone(base, -0.5), 0.7) });
  // 호박색 작은 등
  for (let i = 0; i < ambers; i++) {
    const ang = Math.PI * (ambers === 1 ? 0.5 : 0.22 + (0.56 * i) / (ambers - 1));
    const ax = Math.cos(ang) * R * 0.82;
    const ay = y + Math.sin(ang) * ry * 0.8;
    const on = lit > 0.3 && Math.sin(o.t * 3 + i * 2) > -0.4;
    if (on) glow(ctx, ax, ay, 6, AMBER, 0.55);
    rrect(ctx, ax - 3, ay - 1.4, 6, 2.8, 1.4);
    ctx.fillStyle = on ? AMBER : '#6a5a52';
    ctx.fill();
  }
  // 가장자리 반사광
  ctx.beginPath();
  ctx.ellipse(0, y, R * 0.93, ry * 0.78, 0, Math.PI * 1.03, Math.PI * 1.46);
  ctx.lineWidth = 2;
  ctx.strokeStyle = withAlpha('#ffffff', 0.55);
  ctx.lineCap = 'round';
  ctx.stroke();
  return cy;
}

/** 깜빡이는 끝이 달린 안테나. */
function antenna(ctx, x1, y1, x2, y2, o, color) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineWidth = 3.4;
  ctx.strokeStyle = tone(P.hullDark, -0.4);
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = P.hullLight;
  ctx.stroke();
  const on = o.lit > 0.3 && Math.sin(o.t * 4 + x2) > -0.2;
  if (on) glow(ctx, x2, y2, 9, color, 0.6);
  ball(ctx, x2, y2, 3.2, on ? color : DIM, { lw: 1.2 });
}

/** 기체를 감싸는 에너지 고리(앞쪽 반 / 뒤쪽 반을 따로 그린다). */
function energyRing(ctx, o, front, rx, ry, rot) {
  const from = front ? 0 : Math.PI;
  const to = front ? Math.PI : TAU;
  const a = 0.25 + 0.6 * o.lit;
  for (const [w, c, al] of [
    [9, P.glow, 0.18 * a],
    [4.5, P.glow, 0.55 * a],
    [1.6, '#ffffff', 0.9 * a],
  ]) {
    ctx.beginPath();
    ctx.ellipse(0, 6, rx, ry, rot, from, to);
    ctx.lineWidth = w;
    ctx.strokeStyle = withAlpha(c, al);
    ctx.lineCap = 'round';
    ctx.stroke();
  }
  // 고리를 타고 도는 빛 알갱이
  for (let i = 0; i < 3; i++) {
    const ang = o.t * 1.4 + (i * TAU) / 3;
    const inFront = Math.sin(ang) > 0;
    if (inFront !== front) continue;
    const ex = Math.cos(ang) * rx;
    const ey = Math.sin(ang) * ry;
    const px = ex * Math.cos(rot) - ey * Math.sin(rot);
    const py = 6 + ex * Math.sin(rot) + ey * Math.cos(rot);
    glow(ctx, px, py, 8, P.glow, 0.7 * a);
    circle(ctx, px, py, 2.2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }
}

/** 은하 모선의 호위 접시. */
function escort(ctx, x, y, o) {
  ellipse(ctx, x, y + 2.5, 5, 1.8);
  ctx.fillStyle = o.lit > 0.3 ? P.glowSoft : DIM;
  ctx.fill();
  ellipse(ctx, x, y, 11, 3.6);
  shade(ctx, P.hull, x - 8, y - 3, x + 8, y + 3, { lw: 1.4, light: 0.45 });
  ctx.beginPath();
  ctx.ellipse(x, y - 1, 5, 4.5, 0, Math.PI, TAU);
  ctx.closePath();
  ctx.fillStyle = withAlpha(P.glass, 0.75);
  ctx.fill();
  ctx.lineWidth = 1.1;
  ctx.strokeStyle = '#5fb8d6';
  ctx.stroke();
  if (o.lit > 0.3) glow(ctx, x, y + 1, 8, P.glow, 0.35);
}

// ───────── 형태 ─────────

const FORMS = [
  // 0 콩알 탐사정: 작은 접시에 큰 유리 방울
  (ctx, o) => {
    const cy = saucer(ctx, o, { y: 6, R: 27, ry: 9.5, band: 6, lights: 3, bowl: 0.46, ambers: 0, seams: false });
    dome(ctx, 0, cy, 17, 21, o);
  },
  // 1 꼬마 접시: 컨셉의 기본 접시
  (ctx, o) => {
    const cy = saucer(ctx, o, { y: 5, R: 46, ry: 14, band: 9, lights: 5 });
    dome(ctx, 0, cy, 22, 25, o);
  },
  // 2 정찰 접시: 안테나 두 개
  (ctx, o) => {
    antenna(ctx, -22, -2, -30, -30, o, P.glow);
    antenna(ctx, 22, -2, 32, -24, o, AMBER);
    const cy = saucer(ctx, o, { y: 6, R: 55, ry: 16, band: 10, lights: 6, ambers: 3 });
    dome(ctx, 0, cy, 23, 26, o);
  },
  // 3 고리 접시: 청록 에너지 고리
  (ctx, o) => {
    energyRing(ctx, o, false, 72, 17, -0.1);
    const cy = saucer(ctx, o, { y: 6, R: 50, ry: 15, band: 10, lights: 5 });
    dome(ctx, 0, cy, 21, 24, o);
    energyRing(ctx, o, true, 72, 17, -0.1);
  },
  // 4 순찰선: 두 층 접시와 날개
  (ctx, o) => {
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * 50, 8);
      ctx.lineTo(s * 66, 2);
      ctx.lineTo(s * 62, 14);
      ctx.closePath();
      shade(ctx, P.red, s * 50, 2, s * 66, 14, { lw: 1.6 });
    }
    saucer(ctx, o, { y: 10, R: 62, ry: 17, band: 11, lights: 7, ambers: 2 });
    const cy = saucer(ctx, { ...o, beam: 0 }, { y: -3, R: 36, ry: 10, band: 6, lights: 4, bowl: 0.001, ambers: 0, seams: false, base: tone(P.hull, 0.08) });
    dome(ctx, 0, cy, 19, 22, o);
  },
  // 5 관측선: 관측 돔 셋과 레이더
  (ctx, o) => {
    ctx.save();
    ctx.translate(-56, -6);
    ctx.rotate(-0.45 + Math.sin(o.t * 0.9) * 0.25);
    ctx.beginPath();
    ctx.arc(0, -7, 9, 0, Math.PI);
    ctx.closePath();
    shade(ctx, P.hullLight, -9, -7, 9, 2, { lw: 1.4 });
    ctx.beginPath();
    ctx.moveTo(0, -3);
    ctx.lineTo(0, -12);
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = tone(P.hullDark, -0.3);
    ctx.stroke();
    ctx.restore();
    const cy = saucer(ctx, o, { y: 8, R: 70, ry: 18, band: 11, lights: 7, ambers: 2 });
    for (const s of [-1, 1]) dome(ctx, s * 50, 7, 9, 9, o, false);
    for (const s of [-1, 1]) {
      const on = o.lit > 0.3;
      if (on) glow(ctx, s * 50, 3, 7, s < 0 ? AMBER : P.glow, 0.6);
      circle(ctx, s * 50, 3, 2.4);
      ctx.fillStyle = on ? (s < 0 ? AMBER : P.glow) : DIM;
      ctx.fill();
    }
    dome(ctx, 0, cy, 22, 25, o);
  },
  // 6 대형 모선: 넓은 몸통, 창문 갑판
  (ctx, o) => {
    for (const s of [-1, 1]) antenna(ctx, s * 34, -12, s * 40, -32, o, s < 0 ? P.glow : AMBER);
    const cy = saucer(ctx, o, { y: 12, R: 86, ry: 21, band: 13, lights: 9, ambers: 3, bowl: 0.36 });
    // 창문 갑판
    const dy = cy - 10;
    rrect(ctx, -50, dy - 8, 100, 20, 10);
    shade(ctx, P.hull, -50, dy - 8, 50, dy + 12, { lw: 1.8, light: 0.35 });
    rrect(ctx, -44, dy - 2, 88, 9, 4.5);
    ctx.fillStyle = tone(P.hullDark, -0.2);
    ctx.fill();
    for (let i = 0; i < 8; i++) {
      const on = o.lit > 0.3 && (i * 5 + Math.floor(o.t * 0.8)) % 7 !== 0;
      pill(ctx, -38.5 + i * 11, dy + 2.5, 7, 5, 0, on ? 0.85 : 0);
    }
    dome(ctx, 0, dy - 8, 19, 22, o);
  },
  // 7 은하 모선: 컨셉 배경의 거대 모선처럼 층층이
  (ctx, o) => {
    for (const ph of [0, Math.PI]) {
      const a = o.t * 0.7 + ph;
      if (Math.sin(a) < 0) escort(ctx, Math.cos(a) * 108, 8 + Math.sin(a) * 22, o);
    }
    for (const s of [-1, 1]) antenna(ctx, s * 20, -30, s * 26, -48, o, s < 0 ? P.glow : AMBER);
    saucer(ctx, o, { y: 15, R: 100, ry: 24, band: 15, lights: 11, ambers: 4, bowl: 0.32 });
    saucer(ctx, { ...o, beam: 0 }, { y: -1, R: 66, ry: 15, band: 9, lights: 7, bowl: 0.001, ambers: 2, seams: false, base: tone(P.hull, 0.06) });
    const cy = saucer(ctx, { ...o, beam: 0 }, { y: -17, R: 38, ry: 9, band: 6, lights: 4, bowl: 0.001, ambers: 0, seams: false, base: tone(P.hull, 0.12) });
    dome(ctx, 0, cy, 19, 22, o);
    for (const ph of [0, Math.PI]) {
      const a = o.t * 0.7 + ph;
      if (Math.sin(a) >= 0) escort(ctx, Math.cos(a) * 108, 8 + Math.sin(a) * 22, o);
    }
  },
];

/**
 * 기체를 그린다.
 * @param {CanvasRenderingContext2D} ctx 원점이 기체 중심으로, 배율이 맞춰진 상태
 * @param {{form:number, t:number, mood?:string, lit?:number, beam?:number}} o
 *        lit 1 = 조명 켬, 0 = 숨는 중(조명 끔), beam 1 = 견인 빔 발사 중
 */
export function drawUfo(ctx, o) {
  const opt = { mood: 'idle', lit: 1, beam: 0, ...o };
  opt.lit = clamp(opt.lit);
  ctx.save();
  FORMS[clamp(opt.form, 0, FORMS.length - 1)](ctx, opt);
  ctx.restore();
}

/** 은폐용 뭉게구름. amount 0..1 로 부풀어 오른다. */
export function drawCloak(ctx, form, t, amount) {
  const hw = UFO_HALF_WIDTH[form] * 1.15;
  const top = UFO_TOP[form];
  const s = 0.55 + 0.45 * amount;
  const wob = (i) => Math.sin(t * 1.5 + i * 1.7) * 1.4;
  const blobs = [
    [-hw * 0.74, 12 + wob(0), hw * 0.32],
    [-hw * 0.4, top * 0.38 + wob(1), hw * 0.42],
    [hw * 0.06, top * 0.66 + wob(2), hw * 0.47],
    [hw * 0.5, top * 0.3 + wob(3), hw * 0.38],
    [hw * 0.82, 12 + wob(4), hw * 0.3],
    [-hw * 0.34, 17 + wob(5), hw * 0.4],
    [hw * 0.3, 18 + wob(6), hw * 0.42],
  ].map(([x, y, r]) => [x * s, y * s, r * s]);
  ctx.save();
  ctx.globalAlpha *= clamp(amount * 1.25);
  // 하늘에 묻히지 않도록 바깥에 옅은 테두리를 한 겹 깐다
  cumulus(ctx, blobs.map(([x, y, r]) => [x, y + 1, r + 2.2]), { base: tone(P.cloudShade, -0.05), shadeColor: tone(P.cloudShade, -0.3), alpha: 0.85 });
  cumulus(ctx, blobs, { base: '#ffffff', shadeColor: '#c9d4f6' });
  // 위쪽 반짝임
  for (const [x, y, r] of [blobs[1], blobs[2], blobs[3]]) gloss(ctx, x - r * 0.3, y - r * 0.45, r * 0.35, r * 0.16, -0.3, 0.7);
  ctx.restore();
}
