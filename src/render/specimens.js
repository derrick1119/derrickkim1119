// 표본 10종. 원점은 표본 중심, 배율 1 에서 대략 지름 36~40 px 원 안에 들어온다(장면은 1.12 배로 그린다).
// 컨셉 아트의 3D 카툰: 빛은 왼쪽 위, 같은 계열의 가는 외곽선, 반짝임. 낮 하늘과 밤하늘 둘 다에서 보이게 한다.
import { P, TAU, tone, edge, shade, ball, gloss, glow, withAlpha, circle, ellipse, rrect, poly } from './draw.js';

const LW = 1.7; // 기본 외곽선 굵기
// 흰 몸(닭·젖소·드론): 흰색 → 푸른 라벤더 그늘, 외곽선은 차가운 남보라.
const WHITE_MID = '#f6f6ff';
const WHITE_SHADE = '#c2c9ee';
const WHITE_LINE = '#7177b4';
const PATCH = '#363a66'; // 젖소 얼룩(검정 대신 짙은 남색)
const ORANGE_LEG = '#f39a2e';

// ───────── 작은 도구 ─────────

function stroke(ctx, color, lw) {
  ctx.lineWidth = lw;
  ctx.strokeStyle = color;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

/** 공 모양 방사 그라디언트(빛은 왼쪽 위). */
function radial(ctx, cx, cy, r, c0, c1, c2) {
  const g = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.45, r * 0.05, cx, cy, r * 1.08);
  g.addColorStop(0, c0);
  g.addColorStop(0.55, c1);
  g.addColorStop(1, c2);
  return g;
}

/** 왼쪽 위 → 오른쪽 아래 선형 그라디언트. */
function linear(ctx, x0, y0, x1, y1, c0, c1, c2) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, c0);
  g.addColorStop(0.5, c1);
  g.addColorStop(1, c2);
  return g;
}

/** 방금 만든 경로를 흰 면으로 칠한다. */
function whiteFill(ctx, x0, y0, x1, y1, lw = LW, dark = WHITE_SHADE) {
  ctx.fillStyle = linear(ctx, x0, y0, x1, y1, '#ffffff', WHITE_MID, dark);
  ctx.fill();
  if (lw > 0) stroke(ctx, WHITE_LINE, lw);
}

/** 여러 도형을 한 덩어리로 칠한다: 굵은 선을 먼저 긋고 속을 덮어 바깥 외곽선만 남긴다. */
function blob(ctx, fill, line, lw = LW) {
  if (lw > 0) stroke(ctx, line, lw * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

function addCircle(ctx, x, y, r) {
  ctx.moveTo(x + r, y);
  ctx.arc(x, y, r, 0, TAU);
}

function addEllipse(ctx, x, y, rx, ry, rot = 0) {
  ctx.moveTo(x + Math.cos(rot) * rx, y + Math.sin(rot) * rx);
  ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
}

/** 남색 눈 + 흰 반짝점. 깜빡이면 가는 곡선. */
function eye(ctx, x, y, rx = 1.25, ry = 1.7, blink = false) {
  if (blink) {
    ctx.beginPath();
    ctx.moveTo(x - rx * 1.2, y);
    ctx.quadraticCurveTo(x, y + ry * 0.7, x + rx * 1.2, y);
    stroke(ctx, P.ink, 1);
    return;
  }
  ellipse(ctx, x, y, rx, ry);
  ctx.fillStyle = P.ink;
  ctx.fill();
  circle(ctx, x - rx * 0.3, y - ry * 0.38, rx * 0.45);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
}

function cheek(ctx, x, y, rx, ry) {
  ctx.save();
  ctx.globalAlpha *= 0.45;
  ellipse(ctx, x, y, rx, ry);
  ctx.fillStyle = P.cheek;
  ctx.fill();
  ctx.restore();
}

/** 실·줄: 밝은 하늘에서도 보이게 옅은 남색 밑선 위에 크림색 선. */
function cord(ctx, build, lw = 1.2) {
  build();
  stroke(ctx, 'rgba(70,72,130,0.38)', lw + 1.3);
  build();
  stroke(ctx, '#fff8ea', lw);
}

/** 끝이 둥근 별. */
function softStar(ctx, x, y, outer, inner, n, rot, round = 1.4) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = rot + (i * Math.PI) / n;
    pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
  }
  const m = pts.length;
  ctx.beginPath();
  ctx.moveTo((pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2);
  for (let i = 1; i <= m; i++) {
    const p = pts[i % m];
    const q = pts[(i + 1) % m];
    ctx.arcTo(p[0], p[1], q[0], q[1], i % m % 2 === 0 ? round : round * 0.6);
  }
  ctx.closePath();
}

/** 네 갈래 반짝이. */
function twinkle(ctx, x, y, r, color, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

// ───────── 표본 ─────────

const DRAW = {
  dandelion(ctx, t) {
    const CREAM = '#fff6e0';
    const TAN = '#c39a64';
    ctx.save();
    ctx.rotate(Math.sin(t * 1.8) * 0.13);
    // 밝은 하늘·밤하늘 모두에서 보이게 은은한 빛무리
    glow(ctx, 0, -5, 20, '#fff3cf', 0.42);
    const hx = 0;
    const hy = -3;
    // 솜털 우산의 부피
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.arc(hx, hy, 12.5, -Math.PI / 2 - 1.32, -Math.PI / 2 + 1.32);
    ctx.closePath();
    const fluff = ctx.createRadialGradient(hx, hy - 2, 1, hx, hy, 13);
    fluff.addColorStop(0, 'rgba(255,250,236,0.15)');
    fluff.addColorStop(1, 'rgba(255,248,230,0.55)');
    ctx.fillStyle = fluff;
    ctx.fill();
    // 줄기와 씨앗
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.quadraticCurveTo(hx + 1.2, 4, hx + 0.4, 10.5);
    stroke(ctx, TAN, 2.4);
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.quadraticCurveTo(hx + 1.2, 4, hx + 0.4, 10.5);
    stroke(ctx, CREAM, 1.1);
    ellipse(ctx, hx + 0.4, 13.4, 2, 3.7);
    shade(ctx, '#b57a45', -2, 10, 2.5, 17, { lw: 1.1, light: 0.35, dark: 0.25 });
    // 솜털 가닥
    const n = 11;
    const tips = [];
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.255;
      const len = 12.2 - Math.abs(i - (n - 1) / 2) * 0.32;
      tips.push([hx + Math.cos(a) * len, hy + Math.sin(a) * len, a]);
    }
    ctx.beginPath();
    for (const [x, y] of tips) {
      ctx.moveTo(hx, hy);
      ctx.lineTo(x, y);
    }
    stroke(ctx, withAlpha(TAN, 0.9), 2.3);
    ctx.beginPath();
    for (const [x, y] of tips) {
      ctx.moveTo(hx, hy);
      ctx.lineTo(x, y);
    }
    stroke(ctx, CREAM, 1.05);
    // 가닥 끝 솜뭉치
    for (const [x, y, a] of tips) {
      ctx.beginPath();
      addCircle(ctx, x, y, 2.15);
      addCircle(ctx, x - Math.sin(a) * 1.3, y + Math.cos(a) * 1.3 - 0.4, 1.4);
      blob(ctx, CREAM, TAN, 0.55);
    }
    // 가운데 매듭
    ball(ctx, hx, hy, 1.9, '#f1d9a6', { lw: 0.9, line: TAN });
    ctx.restore();
  },

  firefly(ctx, t) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 4.5);
    const bob = Math.sin(t * 3) * 0.9;
    glow(ctx, 4, 4 + bob, 21, '#e9ff70', 0.3 + 0.35 * pulse);
    glow(ctx, 4.5, 4.5 + bob, 10, '#fbffc8', 0.35 + 0.35 * pulse);
    ctx.save();
    ctx.translate(0, bob);
    const flap = 0.4 + 0.6 * Math.abs(Math.sin(t * 26));
    // 뒷날개
    ellipse(ctx, 3.5, -7, 2.9, 6.6 * flap, 0.85);
    ctx.fillStyle = 'rgba(236,240,255,0.6)';
    ctx.fill();
    stroke(ctx, 'rgba(110,118,190,0.75)', 0.9);
    // 빛나는 꽁무니
    ellipse(ctx, 4.8, 4.2, 7.2, 5.6, 0.5);
    ctx.fillStyle = radial(ctx, 5.4, 4.8, 7, '#fdffe0', pulse > 0.4 ? '#eaff66' : '#d9f25a', '#a6cf32');
    ctx.fill();
    stroke(ctx, '#86ad2a', 1.4);
    ctx.save();
    ctx.globalAlpha *= 0.45;
    for (const k of [-1.2, 1.8]) {
      ctx.beginPath();
      ctx.ellipse(4.8 + k * Math.cos(0.5), 4.2 + k * Math.sin(0.5), 4.6, 5.2, 0.5, -0.95 + Math.PI / 2, 0.95 + Math.PI / 2);
      stroke(ctx, '#a4c93a', 0.9);
    }
    ctx.restore();
    // 다리
    ctx.beginPath();
    for (const x of [-3.5, -1, 1.5]) {
      ctx.moveTo(x, 2.5);
      ctx.lineTo(x - 1.2, 5.6);
    }
    stroke(ctx, '#3a3c70', 1.1);
    // 가슴(주황 등판)
    ball(ctx, -1.2, -0.6, 4.6, '#ff8a42', { lw: 1.3, light: 0.45, dark: 0.25 });
    // 머리
    ball(ctx, -6.4, -2.6, 5.1, '#424690', { lw: 1.3, light: 0.4, dark: 0.3 });
    // 더듬이
    ctx.beginPath();
    ctx.moveTo(-8, -6.8);
    ctx.quadraticCurveTo(-10.5, -10, -12.2, -11);
    ctx.moveTo(-5.2, -7.4);
    ctx.quadraticCurveTo(-6, -11, -7.4, -12.6);
    stroke(ctx, '#3a3c70', 1.1);
    circle(ctx, -12.2, -11, 1.15);
    circle(ctx, -7.4, -12.6, 1.15);
    ctx.fillStyle = '#eaff66';
    ctx.fill();
    // 큰 눈
    circle(ctx, -8, -3, 2.5);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    eye(ctx, -8.4, -3, 1.4, 1.75);
    cheek(ctx, -5.4, -0.2, 1.4, 0.9);
    gloss(ctx, -5.2, -5.6, 1.5, 0.9, -0.5, 0.55);
    // 앞날개
    ellipse(ctx, 0.2, -7.4, 3.1, 7.2 * flap, 0.55);
    ctx.fillStyle = 'rgba(246,248,255,0.72)';
    ctx.fill();
    stroke(ctx, 'rgba(110,118,190,0.85)', 1);
    ctx.restore();
  },

  balloon(ctx, t) {
    const BASE = '#f2473f';
    ctx.save();
    ctx.translate(0, -2);
    ctx.rotate(Math.sin(t * 1.7) * 0.06);
    const w = Math.sin(t * 3) * 2;
    cord(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(0, 12.5);
      ctx.bezierCurveTo(3.5, 16.5, -3.5, 19.5, 0.6 + w, 24.5);
    });
    // 매듭
    poly(ctx, [[-2.6, 14.4], [2.6, 14.4], [0.8, 10.8], [-0.8, 10.8]]);
    shade(ctx, BASE, -2, 11, 2, 15, { lw: 1.2, dark: 0.3 });
    // 몸
    ctx.beginPath();
    ctx.moveTo(0, -15.5);
    ctx.bezierCurveTo(8.4, -15.5, 12, -9, 11.6, -3);
    ctx.bezierCurveTo(11.2, 4.5, 5, 11.4, 0, 11.4);
    ctx.bezierCurveTo(-5, 11.4, -11.2, 4.5, -11.6, -3);
    ctx.bezierCurveTo(-12, -9, -8.4, -15.5, 0, -15.5);
    ctx.closePath();
    ctx.fillStyle = radial(ctx, 0, -3, 14, '#ff9e8c', BASE, '#b4233f');
    ctx.fill();
    stroke(ctx, edge(BASE, 0.45), LW);
    // 아래쪽 반사광
    ctx.beginPath();
    ctx.arc(0, -3, 10.2, 0.25 * Math.PI, 0.62 * Math.PI);
    stroke(ctx, withAlpha('#ff8f8a', 0.7), 1.3);
    gloss(ctx, -5, -8.5, 2.6, 4.6, 0.45, 0.85);
    gloss(ctx, -6.8, -1.6, 1, 1.2, 0, 0.6);
    ctx.restore();
  },

  kite(ctx, t) {
    const RED = '#ff574a';
    const YEL = '#ffd23f';
    const w = Math.sin(t * 4) * 3.5;
    // 꼬리(리본)
    cord(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(0, 14);
      ctx.bezierCurveTo(6 + w, 20, -6 - w, 25, 2 + w, 31);
    }, 1.1);
    for (const [x, y, c] of [[2.6 + w * 0.45, 19.8, '#3f8fe8'], [-1.6 - w * 0.35, 25.6, '#2fc4a6']]) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 4, y - 2.6);
      ctx.quadraticCurveTo(x - 4.8, y, x - 4, y + 2.6);
      ctx.closePath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 4, y - 2.6);
      ctx.quadraticCurveTo(x + 4.8, y, x + 4, y + 2.6);
      ctx.closePath();
      shade(ctx, c, x - 4, y - 3, x + 4, y + 3, { lw: 1.1 });
      circle(ctx, x, y, 1.1);
      ctx.fillStyle = tone(c, -0.3);
      ctx.fill();
    }
    // 연 몸: 실이 붙는 아래 꼭짓점(0,14)을 축으로 살짝 흔들린다.
    ctx.save();
    ctx.translate(0, 14);
    ctx.rotate(Math.sin(t * 1.3) * 0.07);
    ctx.translate(0, -14);
    const T = [0, -16.5];
    const Rt = [12.5, -3.5];
    const B = [0, 14];
    const L = [-12.5, -3.5];
    const M = [0, -3.5];
    for (const [pts, c] of [
      [[T, M, L], YEL],
      [[T, Rt, M], RED],
      [[L, M, B], RED],
      [[M, Rt, B], YEL],
    ]) {
      poly(ctx, pts);
      shade(ctx, c, -12, -16, 12, 14, { lw: 0, light: 0.3, dark: 0.25 });
    }
    // 살대
    ctx.beginPath();
    ctx.moveTo(T[0], T[1] + 1);
    ctx.lineTo(B[0], B[1] - 1);
    ctx.moveTo(L[0] + 1, L[1]);
    ctx.quadraticCurveTo(0, -5.2, Rt[0] - 1, Rt[1]);
    stroke(ctx, withAlpha(P.woodDark, 0.75), 1.2);
    poly(ctx, [T, Rt, B, L]);
    stroke(ctx, edge(RED, 0.45), LW);
    gloss(ctx, -4.6, -8.6, 1.4, 3.6, 0.85, 0.6);
    ctx.restore();
  },

  chicken(ctx, t) {
    const ph = t * 7;
    const step = Math.sin(ph);
    const bounce = -Math.abs(Math.cos(ph)) * 0.9;
    const hx = 7.4 + step * 0.7;
    const hy = -7.6;
    // 다리
    for (const [x, s] of [[-4.2, 1], [1.4, -1]]) {
      const fx = x + step * s * 2.1;
      ctx.beginPath();
      ctx.moveTo(x, 8 + bounce);
      ctx.lineTo(fx, 15);
      ctx.moveTo(fx - 1.8, 15.4);
      ctx.lineTo(fx + 2.8, 15.4);
      ctx.moveTo(fx, 15.2);
      ctx.lineTo(fx + 1.8, 13.9);
      stroke(ctx, edge(ORANGE_LEG, 0.35), 2.8);
      ctx.beginPath();
      ctx.moveTo(x, 8 + bounce);
      ctx.lineTo(fx, 15);
      ctx.moveTo(fx - 1.8, 15.4);
      ctx.lineTo(fx + 2.8, 15.4);
      ctx.moveTo(fx, 15.2);
      ctx.lineTo(fx + 1.8, 13.9);
      stroke(ctx, ORANGE_LEG, 1.5);
    }
    ctx.save();
    ctx.translate(0, bounce);
    // 꽁지깃
    ctx.beginPath();
    addEllipse(ctx, -10.6, -7.2, 2.7, 5.4, -0.35);
    addEllipse(ctx, -12.8, -3.6, 2.6, 5, -0.85);
    addEllipse(ctx, -8.4, -8.6, 2.3, 4.4, 0.1);
    blob(ctx, linear(ctx, -14, -13, -7, 0, '#ffffff', WHITE_MID, WHITE_SHADE), WHITE_LINE, 1.5);
    // 볏
    ctx.beginPath();
    addCircle(ctx, hx - 2.8, hy - 5.6, 2.2);
    addCircle(ctx, hx - 0.1, hy - 6.8, 2.6);
    addCircle(ctx, hx + 2.6, hy - 5.4, 2.1);
    blob(ctx, radial(ctx, hx, hy - 6, 5, '#ff8a76', '#f2443c', '#c42a3e'), edge('#f2443c', 0.45), 1.2);
    // 몸통 + 머리를 한 덩어리로
    ctx.beginPath();
    addEllipse(ctx, -1.6, 3, 11.6, 9.2);
    addEllipse(ctx, 3.6, -2, 5.2, 6.4, 0.45);
    addCircle(ctx, hx, hy, 6.2);
    blob(ctx, radial(ctx, 0, -1, 15.5, '#ffffff', WHITE_MID, WHITE_SHADE), WHITE_LINE, LW);
    // 날개
    ctx.beginPath();
    ctx.moveTo(-9.2, 1);
    ctx.bezierCurveTo(-6, -2.4, 1.6, -1.6, 3, 2.6);
    ctx.bezierCurveTo(2.4, 6.6, -3, 8.4, -6.4, 7);
    ctx.quadraticCurveTo(-5.6, 5.6, -7.4, 5.2);
    ctx.quadraticCurveTo(-7, 3.8, -9.2, 1);
    ctx.closePath();
    ctx.fillStyle = linear(ctx, -8, -1, 2, 8, '#ffffff', '#eceefb', '#c6cdee');
    ctx.fill();
    stroke(ctx, '#9298cc', 1.2);
    // 부리·볏 아래 늘어진 살
    ellipse(ctx, hx + 4.6, hy + 4, 1.5, 2.3, -0.2);
    shade(ctx, '#f2443c', hx + 3, hy + 2, hx + 6, hy + 6.5, { lw: 1, dark: 0.3 });
    ctx.beginPath();
    ctx.moveTo(hx + 4.6, hy - 2);
    ctx.quadraticCurveTo(hx + 10.4, hy - 0.4, hx + 4.8, hy + 1.8);
    ctx.closePath();
    shade(ctx, '#ffb43a', hx + 4, hy - 2, hx + 9, hy + 2, { lw: 1.1, light: 0.35 });
    // 얼굴
    eye(ctx, hx + 1.9, hy - 1.1, 1.2, 1.65);
    cheek(ctx, hx + 0.6, hy + 2.3, 1.7, 1.05);
    gloss(ctx, -6, -2.6, 3.4, 1.6, -0.35, 0.6);
    ctx.restore();
  },

  cow(ctx, t) {
    const ph = t * 5;
    const step = Math.sin(ph);
    const bob = -Math.abs(Math.cos(ph)) * 0.6;
    const chew = Math.sin(t * 6) * 0.5;
    const blink = t % 3.4 < 0.13;
    const tw = Math.sin(t * 3.2) * 2.4;
    // 꼬리
    ctx.beginPath();
    ctx.moveTo(-14, -3.5 + bob);
    ctx.quadraticCurveTo(-19, -3 + bob, -18.2 + tw * 0.4, 3.6 + bob);
    stroke(ctx, WHITE_LINE, 3.1);
    ctx.beginPath();
    ctx.moveTo(-14, -3.5 + bob);
    ctx.quadraticCurveTo(-19, -3 + bob, -18.2 + tw * 0.4, 3.6 + bob);
    stroke(ctx, '#f4f4ff', 1.4);
    ellipse(ctx, -18.2 + tw * 0.4, 5.4 + bob, 2, 2.7, tw * 0.05);
    shade(ctx, PATCH, -20, 3, -16, 8, { lw: 1, light: 0.35 });
    // 다리: 먼 쪽 둘(어둡게) → 가까운 쪽 둘
    const leg = (x, s, far) => {
      const sx = x + step * s * 1.3;
      rrect(ctx, sx - 2.6, 4, 5.2, 10, 2.4);
      whiteFill(ctx, sx - 2.6, 4, sx + 2.6, 14, 1.4, far ? '#a9b0de' : WHITE_SHADE);
      rrect(ctx, sx - 2.6, 12.6, 5.2, 3.4, 1.4);
      shade(ctx, far ? '#3d3760' : '#4b4472', sx - 2.6, 12.6, sx + 2.6, 16, { lw: 1.2, light: 0.3 });
    };
    leg(-10.6, -1, true);
    leg(4.6, 1, true);
    // 젖
    ellipse(ctx, -2, 9 + bob, 3.4, 2.4);
    shade(ctx, '#ffa9bb', -5, 7, 1.5, 11.5, { lw: 1.1 });
    leg(-7, 1, false);
    leg(8.2, -1, false);
    // 몸통
    ctx.save();
    ctx.translate(0, bob);
    rrect(ctx, -15.5, -8.5, 25.5, 17, 8);
    ctx.fillStyle = radial(ctx, -3.5, -1, 17, '#ffffff', WHITE_MID, WHITE_SHADE);
    ctx.fill();
    ctx.save();
    ctx.clip();
    for (const [x, y, rx, ry, rot] of [
      [-10.2, -5.4, 6.4, 4.8, 0.35],
      [1.6, 5, 5.6, 4.2, -0.2],
      [3.2, -8.6, 4, 3, 0.2],
      [-15, 5.4, 3.2, 3.4, 0],
    ]) {
      ellipse(ctx, x, y, rx, ry, rot);
      ctx.fillStyle = linear(ctx, x - rx, y - ry, x + rx, y + ry, '#4d5188', PATCH, '#2a2c52');
      ctx.fill();
    }
    ctx.restore();
    rrect(ctx, -15.5, -8.5, 25.5, 17, 8);
    stroke(ctx, WHITE_LINE, LW);
    gloss(ctx, -9, -5.6, 3.6, 1.5, -0.25, 0.4);
    ctx.restore();
    // 머리(살짝 정면을 본다)
    const hx = 12.2;
    const hy = -4.6 + bob + step * 0.25;
    for (const s of [-1, 1]) {
      ellipse(ctx, hx + s * 7, hy - 3.6, 3.7, 2.1, s * 0.5);
      shade(ctx, PATCH, hx + s * 7 - 3, hy - 6, hx + s * 7 + 3, hy - 1.5, { lw: 1.1, light: 0.35 });
      ellipse(ctx, hx + s * 7.3, hy - 3.4, 2, 1, s * 0.5);
      ctx.fillStyle = '#f59bb0';
      ctx.fill();
      // 뿔
      ctx.beginPath();
      ctx.moveTo(hx + s * 2.2, hy - 6);
      ctx.quadraticCurveTo(hx + s * 3, hy - 10.6, hx + s * 4.6, hy - 10.2);
      ctx.quadraticCurveTo(hx + s * 5, hy - 7.6, hx + s * 4.6, hy - 5.6);
      ctx.closePath();
      shade(ctx, '#ffeec2', hx + s * 2, hy - 11, hx + s * 5, hy - 5, { lw: 1, line: '#c09a62' });
    }
    ellipse(ctx, hx, hy, 7.3, 7);
    ctx.fillStyle = radial(ctx, hx, hy, 8, '#ffffff', WHITE_MID, WHITE_SHADE);
    ctx.fill();
    ctx.save();
    ctx.clip();
    ellipse(ctx, hx + 5.6, hy - 5.4, 4.2, 3.6, 0.4);
    ctx.fillStyle = linear(ctx, hx + 2, hy - 9, hx + 9, hy - 2, '#4d5188', PATCH, '#2a2c52');
    ctx.fill();
    ctx.restore();
    ellipse(ctx, hx, hy, 7.3, 7);
    stroke(ctx, WHITE_LINE, LW);
    // 코(분홍 주둥이)
    ellipse(ctx, hx + 0.5, hy + 4.7 + chew * 0.25, 6.7, 4.3);
    ctx.fillStyle = radial(ctx, hx + 0.5, hy + 4.7, 7, '#ffd0da', '#ffa6b8', '#e57793');
    ctx.fill();
    stroke(ctx, edge('#ffa6b8', 0.45), 1.4);
    for (const s of [-1, 1]) {
      ellipse(ctx, hx + 0.5 + s * 2.3, hy + 4.4 + chew * 0.25, 0.85, 1.2, s * 0.3);
      ctx.fillStyle = '#c5577a';
      ctx.fill();
    }
    gloss(ctx, hx - 2.4, hy + 2.6, 1.8, 0.8, -0.2, 0.55);
    eye(ctx, hx - 2.8, hy - 1.2, 1.2, 1.6, blink);
    eye(ctx, hx + 3.2, hy - 1.2, 1.2, 1.6, blink);
  },

  drone(ctx, t) {
    const ARM = '#47517f';
    ctx.save();
    ctx.translate(0, Math.sin(t * 2.6) * 1.1);
    ctx.rotate(0.07);
    const rotor = (x, y, rx, ph, far) => {
      rrect(ctx, x - 1.5, y - 3.2, 3, 3.6, 1);
      shade(ctx, ARM, x - 1.5, y - 3, x + 1.5, y, { lw: 0.9, light: 0.4 });
      const k = 0.55 + 0.45 * Math.abs(Math.sin(t * 38 + ph));
      ellipse(ctx, x, y - 3.8, rx * k, 1.25);
      ctx.fillStyle = far ? 'rgba(235,240,255,0.45)' : 'rgba(240,244,255,0.6)';
      ctx.fill();
      stroke(ctx, 'rgba(84,94,150,0.7)', 0.9);
      circle(ctx, x, y - 3.8, 0.9);
      ctx.fillStyle = ARM;
      ctx.fill();
    };
    // 먼 쪽 팔
    ctx.beginPath();
    ctx.moveTo(-3, -3);
    ctx.lineTo(-11.5, -7.4);
    ctx.moveTo(3, -3);
    ctx.lineTo(11.5, -7.4);
    stroke(ctx, tone(ARM, -0.25), 2.2);
    rotor(-11.5, -7.4, 5.2, 1, true);
    rotor(11.5, -7.4, 5.2, 2, true);
    // 다리
    ctx.beginPath();
    ctx.moveTo(-5, 3);
    ctx.lineTo(-7, 8.6);
    ctx.moveTo(-9, 8.6);
    ctx.lineTo(-4.8, 8.6);
    ctx.moveTo(5, 3);
    ctx.lineTo(7, 8.6);
    ctx.moveTo(4.8, 8.6);
    ctx.lineTo(9, 8.6);
    stroke(ctx, ARM, 1.4);
    // 짐벌 카메라(눈)
    ball(ctx, 3.6, 5.4, 3.7, ARM, { lw: 1.1, light: 0.45 });
    circle(ctx, 4.7, 5.7, 2.1);
    ctx.fillStyle = radial(ctx, 4.7, 5.7, 2.1, '#d8ffff', P.glow, '#1f6f9a');
    ctx.fill();
    circle(ctx, 5, 5.8, 0.85);
    ctx.fillStyle = P.ink;
    ctx.fill();
    circle(ctx, 4.1, 5, 0.6);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    // 몸통
    rrect(ctx, -9.5, -6, 19, 9.6, 4.6);
    whiteFill(ctx, -9, -6, 9, 4);
    // 윗덮개(주황)
    ctx.beginPath();
    ctx.moveTo(-7.6, -3.2);
    ctx.quadraticCurveTo(-7.4, -7.6, 0, -7.6);
    ctx.quadraticCurveTo(7.4, -7.6, 7.6, -3.2);
    ctx.quadraticCurveTo(0, -1.8, -7.6, -3.2);
    ctx.closePath();
    shade(ctx, P.orange, -7, -8, 7, -2, { lw: 1.2, light: 0.35, dark: 0.22 });
    gloss(ctx, -3.4, -5.6, 2.6, 0.9, -0.1, 0.7);
    // 가까운 쪽 팔
    ctx.beginPath();
    ctx.moveTo(-6, -0.5);
    ctx.lineTo(-16, -3.6);
    ctx.moveTo(6, -0.5);
    ctx.lineTo(16, -3.6);
    stroke(ctx, ARM, 2.6);
    rotor(-16, -3.6, 6.6, 0, false);
    rotor(16, -3.6, 6.6, 3, false);
    // 깜빡이(앞 빨강, 뒤 초록)
    const blink = Math.sin(t * 8) > 0;
    if (blink) glow(ctx, 8.4, -1.2, 6, '#ff5a4e', 0.75);
    circle(ctx, 8.4, -1.2, 1.3);
    ctx.fillStyle = blink ? '#ff5a4e' : '#b85a6a';
    ctx.fill();
    circle(ctx, -8.4, -1.2, 1.1);
    ctx.fillStyle = '#5ce07a';
    ctx.fill();
    ctx.restore();
  },

  weather(ctx, t) {
    const sw = Math.sin(t * 1.6) * 2.2;
    const LINE = '#a08470';
    glow(ctx, 0, -8, 22, '#fff4d8', 0.4);
    // 줄 → 반사판 → 관측 상자
    cord(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(0, 4.4);
      ctx.lineTo(sw * 0.5, 9.4);
      ctx.moveTo(sw * 0.5, 12.4);
      ctx.lineTo(sw, 14.4);
    }, 1.1);
    poly(ctx, [[sw * 0.5, 8.4], [sw * 0.5 + 2.6, 10.9], [sw * 0.5, 13.4], [sw * 0.5 - 2.6, 10.9]]);
    shade(ctx, P.orange, sw * 0.5 - 2, 8.4, sw * 0.5 + 2, 13.4, { lw: 1, light: 0.4 });
    ctx.save();
    ctx.translate(sw, 14.4);
    ctx.rotate(-sw * 0.04);
    // 안테나
    ctx.beginPath();
    ctx.moveTo(3, 7.6);
    ctx.lineTo(4.6, 11.4);
    stroke(ctx, '#6a6fa6', 1);
    rrect(ctx, -5.2, 0, 10.4, 8, 1.8);
    shade(ctx, '#fff4dc', -5, 0, 5, 8, { lw: 1.3, line: LINE, light: 0.4, dark: 0.22 });
    rrect(ctx, -5.2, 2.6, 10.4, 2.4, 0);
    ctx.fillStyle = P.blue;
    ctx.fill();
    circle(ctx, 2.6, 6.2, 1);
    ctx.fillStyle = Math.sin(t * 5) > 0.2 ? '#ff5a4e' : '#c58a8a';
    ctx.fill();
    ctx.restore();
    // 목
    poly(ctx, [[-1.8, 4.6], [1.8, 4.6], [1.2, 2], [-1.2, 2]]);
    shade(ctx, '#f6e6cc', -2, 2, 2, 5, { lw: 1, line: LINE });
    // 풍선
    circle(ctx, 0, -9, 12.6);
    ctx.fillStyle = radial(ctx, 0, -9, 12.6, '#ffffff', '#fff2d9', '#d6c8e6');
    ctx.fill();
    stroke(ctx, LINE, 1.8);
    // 고무 이음매
    ctx.save();
    ctx.globalAlpha *= 0.35;
    ctx.beginPath();
    ctx.ellipse(0, -9, 5.4, 12.2, 0, -Math.PI / 2, Math.PI / 2);
    ctx.moveTo(0, -21.6);
    ctx.lineTo(0, 3.6);
    stroke(ctx, '#b49ab8', 0.9);
    ctx.restore();
    gloss(ctx, -5, -14.4, 3, 4.8, 0.55, 0.9);
    gloss(ctx, 6.6, -3.4, 1.1, 2.2, 0.6, 0.35);
  },

  satellite(ctx, t) {
    const GOLD = '#f6b93b';
    const PANEL = '#3d7be0';
    ctx.save();
    ctx.rotate(-0.24 + Math.sin(t * 0.8) * 0.06);
    // 태양 전지판
    for (const s of [-1, 1]) {
      const x0 = s > 0 ? 9 : -22;
      ctx.beginPath();
      ctx.moveTo(s * 5.5, 0);
      ctx.lineTo(s * 9.5, 0);
      stroke(ctx, '#8a90bc', 1.6);
      rrect(ctx, x0, -5.2, 13, 10.4, 1.4);
      shade(ctx, PANEL, x0, -5.2, x0 + 13, 5.2, { lw: 1.3, light: 0.35, dark: 0.3 });
      ctx.beginPath();
      for (const dx of [4.33, 8.66]) {
        ctx.moveTo(x0 + dx, -5);
        ctx.lineTo(x0 + dx, 5);
      }
      ctx.moveTo(x0, 0);
      ctx.lineTo(x0 + 13, 0);
      stroke(ctx, withAlpha('#bfe0ff', 0.55), 0.8);
      // 비스듬한 반사
      poly(ctx, [[x0 + 2.5, -5.2], [x0 + 6, -5.2], [x0 + 3, 5.2], [x0 - 0.5, 5.2]]);
      ctx.save();
      ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.fillRect(x0, -5.2, 13, 10.4);
      ctx.restore();
    }
    // 안테나 막대
    ctx.beginPath();
    ctx.moveTo(-3, -7);
    ctx.lineTo(-5.2, -13);
    stroke(ctx, '#8a90bc', 1.1);
    circle(ctx, -5.2, -13.4, 1.2);
    ctx.fillStyle = '#ff6b5e';
    ctx.fill();
    // 금박 몸통
    rrect(ctx, -6, -7.2, 12, 14.4, 2.6);
    shade(ctx, GOLD, -6, -7, 6, 7, { lw: LW, light: 0.4, dark: 0.28 });
    ctx.beginPath();
    ctx.moveTo(-3.6, -4.6);
    ctx.lineTo(-1, -1.6);
    ctx.lineTo(-3, 2.4);
    ctx.moveTo(1.6, -5.4);
    ctx.lineTo(3.4, -2.2);
    stroke(ctx, withAlpha('#fff3c0', 0.7), 0.9);
    ctx.beginPath();
    ctx.moveTo(-6, 3.6);
    ctx.lineTo(6, 3.6);
    stroke(ctx, withAlpha(edge(GOLD), 0.6), 0.9);
    const blink = Math.sin(t * 5) > 0.3;
    if (blink) glow(ctx, 2.4, 5.4, 5, '#ff5a4e', 0.6);
    circle(ctx, 2.4, 5.4, 1.1);
    ctx.fillStyle = blink ? '#ff5a4e' : '#b4774a';
    ctx.fill();
    // 접시 안테나(앞쪽 위를 본다)
    ctx.beginPath();
    ctx.moveTo(2, -7);
    ctx.lineTo(4, -10);
    stroke(ctx, '#8a90bc', 1.4);
    ctx.save();
    ctx.translate(4.6, -11.6);
    ctx.rotate(0.62);
    ctx.beginPath();
    ctx.ellipse(0, 0, 6.6, 6.2, 0, 0, Math.PI);
    ctx.closePath();
    shade(ctx, '#f2f3ff', -6, 0, 6, 6, { lw: 1.3, line: '#7a80b8', light: 0.3, dark: 0.3 });
    ellipse(ctx, 0, 0, 6.6, 1.8);
    ctx.fillStyle = linear(ctx, -6, -2, 6, 2, '#c9cdf0', '#dfe2fa', '#b3b8e6');
    ctx.fill();
    stroke(ctx, '#7a80b8', 1);
    ctx.beginPath();
    ctx.moveTo(0, 0.4);
    ctx.lineTo(0, -4);
    stroke(ctx, '#7a80b8', 1);
    circle(ctx, 0, -4.4, 1.1);
    ctx.fillStyle = '#ff6b5e';
    ctx.fill();
    ctx.restore();
    ctx.restore();
  },

  meteor(ctx, t, dir = 1) {
    // 꼬리는 날아온 쪽(위·뒤)으로 뻗는다.
    ctx.save();
    ctx.rotate(dir > 0 ? Math.PI + 0.34 : -0.34);
    const L = 40 + Math.sin(t * 18) * 2.5;
    const g = ctx.createLinearGradient(0, 0, L, 0);
    g.addColorStop(0, 'rgba(255,251,224,0.95)');
    g.addColorStop(0.25, 'rgba(255,214,74,0.8)');
    g.addColorStop(0.6, 'rgba(255,138,60,0.42)');
    g.addColorStop(1, 'rgba(255,107,138,0)');
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.quadraticCurveTo(L * 0.45, -5.2, L, 0);
    ctx.quadraticCurveTo(L * 0.45, 5.2, 0, 8);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();
    // 가는 줄기 두 개
    for (const [y, len] of [[-5.6, 0.78], [5.2, 0.66]]) {
      ctx.beginPath();
      ctx.moveTo(2, y);
      ctx.quadraticCurveTo(L * len * 0.5, y * 1.15, L * len, y * 1.4);
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
    for (let i = 0; i < 3; i++) {
      const k = (t * 1.3 + i / 3) % 1;
      twinkle(ctx, 12 + k * 26, (i - 1) * 4.2 * (1 - k * 0.4), 2.4 * (1 - k * 0.6), '#fff6c8', 1 - k);
    }
    ctx.restore();
    glow(ctx, 0, 0, 21, '#ffd84a', 0.5);
    // 별
    const rot = -Math.PI / 2 + Math.sin(t * 2) * 0.25;
    softStar(ctx, 0, 0, 11, 5.6, 5, rot, 1.8);
    ctx.fillStyle = radial(ctx, 0, 0, 11, '#fffbe2', '#ffd23f', '#ff9a2e');
    ctx.fill();
    stroke(ctx, '#d9762a', 1.6);
    gloss(ctx, -2.8, -3.6, 2.2, 1.3, -0.5, 0.8);
  },
};

/**
 * 표본을 그린다.
 * @param {CanvasRenderingContext2D} ctx 원점이 표본 중심으로 옮겨진 상태
 * @param {string} kind 표본 id
 * @param {number} t 애니메이션 시계(초)
 * @param {number} [dir] 진행 방향 -1 | 1
 */
export function drawSpecimen(ctx, kind, t = 0, dir = 1) {
  const fn = DRAW[kind];
  if (!fn) return;
  if (kind === 'meteor') fn(ctx, t, dir);
  else if (kind === 'chicken' || kind === 'cow' || kind === 'drone' || kind === 'satellite') {
    ctx.save();
    ctx.scale(dir, 1);
    fn(ctx, t);
    ctx.restore();
  } else fn(ctx, t);
}

/** 위험 표시(!) 배지. 흰 테두리로 빨간 표본 위에서도 또렷하다. */
export function drawRiskBadge(ctx, x, y, t) {
  const s = 1 + Math.sin(t * 6) * 0.08;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  circle(ctx, 0, 0, 8.3);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  stroke(ctx, '#b3263a', 1);
  ball(ctx, 0, 0, 6.7, '#ff4a42', { lw: 0, light: 0.4, dark: 0.3 });
  rrect(ctx, -1.3, -4.6, 2.6, 5.6, 1.3);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  circle(ctx, 0, 3.2, 1.4);
  ctx.fill();
  ctx.restore();
}
