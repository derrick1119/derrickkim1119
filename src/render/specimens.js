// 표본 10종. 원점은 표본 중심, 대략 지름 36 px 안에 들어온다.
import { C, TAU, paint, circle, ellipse, rrect, poly, line, glow, star, withAlpha } from './draw.js';

const DRAW = {
  dandelion(ctx, t) {
    glow(ctx, 0, -2, 17, C.white, 0.22);
    line(ctx, 0, 1, 0.6, 12, withAlpha(C.cream, 0.9), 1.4);
    ellipse(ctx, 0.8, 13.5, 1.8, 3);
    paint(ctx, '#b98a5a', 1.2);
    const sway = Math.sin(t * 2) * 0.12;
    ctx.lineCap = 'round';
    for (let i = 0; i < 11; i++) {
      const a = -Math.PI / 2 + (i - 5) * 0.27 + sway;
      const len = 12 - Math.abs(i - 5) * 0.5;
      const x = Math.cos(a) * len;
      const y = 1 + Math.sin(a) * len;
      line(ctx, 0, 1, x, y, withAlpha(C.white, 0.9), 1.1);
      circle(ctx, x, y, 1.5);
      ctx.fillStyle = C.white;
      ctx.fill();
    }
  },

  firefly(ctx, t) {
    const pulse = 0.6 + 0.4 * Math.sin(t * 4.5);
    glow(ctx, 3, 3, 20, '#e8ff7a', 0.55 * pulse);
    const flap = 0.5 + 0.5 * Math.abs(Math.sin(t * 30));
    for (const s of [-1, 1]) {
      ellipse(ctx, -1 + s * 3, -6, 3.2, 6.5 * flap, s * 0.5);
      paint(ctx, withAlpha(C.white, 0.75), 1.2, withAlpha(C.ink, 0.6));
    }
    ellipse(ctx, 3.5, 3, 6, 4.8, 0.3);
    paint(ctx, pulse > 0.5 ? '#f2ff8a' : '#d8ee6a', 2);
    ellipse(ctx, -3.5, -1, 4.6, 4, 0.3);
    paint(ctx, '#4a3a7a', 2);
    circle(ctx, -5, -2, 1.1);
    ctx.fillStyle = C.white;
    ctx.fill();
  },

  balloon(ctx, t) {
    ctx.beginPath();
    ctx.moveTo(0, 14);
    ctx.bezierCurveTo(4, 19, -4, 22, 1 + Math.sin(t * 3) * 2, 28);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = withAlpha(C.white, 0.85);
    ctx.stroke();
    poly(ctx, [[-3, 16], [3, 16], [0, 12]]);
    paint(ctx, C.coralDark, 1.8);
    ellipse(ctx, 0, -1, 11.5, 13.5);
    paint(ctx, C.coral, 2.5);
    ellipse(ctx, -4.4, -6, 2.6, 4.2, 0.5);
    ctx.fillStyle = withAlpha(C.white, 0.8);
    ctx.fill();
  },

  kite(ctx, t) {
    // 꼬리
    ctx.beginPath();
    ctx.moveTo(0, 14);
    const w = Math.sin(t * 4) * 4;
    ctx.bezierCurveTo(6 + w, 20, -6 - w, 25, 3 + w, 32);
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = withAlpha(C.white, 0.85);
    ctx.stroke();
    for (const [x, y] of [[3 + w * 0.5, 20], [-2 - w * 0.4, 26]]) {
      poly(ctx, [[x - 4, y - 2.5], [x, y], [x - 4, y + 2.5]]);
      paint(ctx, C.coral, 1.3);
      poly(ctx, [[x + 4, y - 2.5], [x, y], [x + 4, y + 2.5]]);
      paint(ctx, C.coral, 1.3);
    }
    const pts = [[0, -16], [12, -2], [0, 14], [-12, -2]];
    poly(ctx, pts);
    paint(ctx, C.mint, 0);
    poly(ctx, [[0, -16], [0, 14], [-12, -2]]);
    paint(ctx, C.lemon, 0);
    poly(ctx, pts);
    paint(ctx, null, 2.5);
    line(ctx, 0, -16, 0, 14, C.ink, 1.5);
    line(ctx, -12, -2, 12, -2, C.ink, 1.5);
  },

  chicken(ctx, t) {
    const bob = Math.sin(t * 7) * 1;
    for (const s of [-1, 1]) {
      line(ctx, s * 3.5, 7, s * 3.5, 14, '#f0a63a', 2.2);
      line(ctx, s * 3.5 - 2.5, 14, s * 3.5 + 3.5, 14, '#f0a63a', 2.2);
    }
    // 꽁지
    for (const [x, y, r] of [[-12, -5, 5], [-14, 0, 4.4]]) {
      circle(ctx, x, y, r);
      paint(ctx, C.white, 2);
    }
    ellipse(ctx, 0, 0, 12.5, 10);
    paint(ctx, C.white, 2.5);
    ctx.beginPath();
    ctx.arc(-1, 0, 6, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = withAlpha(C.ink, 0.5);
    ctx.stroke();
    // 볏
    for (const [x, r] of [[7, 2.6], [10, 3], [13, 2.4]]) {
      circle(ctx, x, -16.5 + bob, r);
      paint(ctx, C.coral, 1.6);
    }
    circle(ctx, 10, -9.5 + bob, 6.4);
    paint(ctx, C.white, 2.5);
    poly(ctx, [[15.5, -11 + bob], [21, -9 + bob], [15.5, -7 + bob]]);
    paint(ctx, C.lemon, 1.6);
    circle(ctx, 13.5, -4.2 + bob, 2.1);
    paint(ctx, C.coral, 1.4);
    circle(ctx, 11.5, -11 + bob, 1.3);
    ctx.fillStyle = C.ink;
    ctx.fill();
  },

  cow(ctx, t) {
    const chew = Math.sin(t * 5) * 0.8;
    // 꼬리
    ctx.beginPath();
    ctx.moveTo(-17, -6);
    ctx.quadraticCurveTo(-24, -4 + Math.sin(t * 4) * 3, -22, 4);
    ctx.lineWidth = 2;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
    circle(ctx, -22, 5, 2.4);
    paint(ctx, C.ink, 0);
    for (const x of [-12, -5, 5, 11]) {
      rrect(ctx, x - 2.6, 4, 5.2, 11, 2);
      paint(ctx, C.white, 2);
      rrect(ctx, x - 2.6, 12, 5.2, 3.4, 1.4);
      paint(ctx, C.ink, 0);
    }
    ellipse(ctx, 2, 9, 5, 3.4);
    paint(ctx, C.pink, 1.8);
    ctx.save();
    rrect(ctx, -18, -11, 33, 19, 8.5);
    paint(ctx, C.white, 2.5);
    ctx.clip();
    ctx.fillStyle = C.ink;
    for (const [x, y, rx, ry] of [[-11, -8, 7, 5.5], [3, 5, 6.5, 4.5], [10, -10, 4.5, 4]]) {
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0.3, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    rrect(ctx, -18, -11, 33, 19, 8.5);
    paint(ctx, null, 2.5);
    // 머리
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(17 + s * 5.5, -17, 3.4, s < 0 ? Math.PI * 0.9 : Math.PI * 1.5, s < 0 ? Math.PI * 1.5 : Math.PI * 2.1);
      ctx.lineWidth = 2.6;
      ctx.strokeStyle = C.creamShade;
      ctx.stroke();
    }
    ellipse(ctx, 9.5, -12, 3.4, 2.2, -0.5);
    paint(ctx, C.white, 1.8);
    ellipse(ctx, 24.5, -12, 3.4, 2.2, 0.5);
    paint(ctx, C.white, 1.8);
    rrect(ctx, 10.5, -17, 13, 13, 5);
    paint(ctx, C.white, 2.5);
    ellipse(ctx, 17, -4.5 + chew * 0.4, 6.6, 4.4);
    paint(ctx, C.pink, 2.2);
    ctx.fillStyle = C.ink;
    for (const s of [-1, 1]) {
      circle(ctx, 17 + s * 2.4, -4.5 + chew * 0.4, 0.95);
      ctx.fill();
      circle(ctx, 17 + s * 3, -11.5, 1.25);
      ctx.fill();
    }
  },

  drone(ctx, t) {
    const blink = Math.sin(t * 8) > 0;
    for (const s of [-1, 1]) {
      line(ctx, s * 6, -2, s * 16, -6, C.ink, 3.2);
      line(ctx, s * 16, -6, s * 16, -9, C.ink, 2.4);
      ellipse(ctx, s * 16, -10, 9.5 * (0.55 + 0.45 * Math.abs(Math.sin(t * 40 + s))), 2.2);
      paint(ctx, withAlpha(C.white, 0.7), 1.2, withAlpha(C.ink, 0.5));
    }
    rrect(ctx, -9, -5.5, 18, 10.5, 4.5);
    paint(ctx, '#7d76a6', 2.5);
    rrect(ctx, -4, 5, 8, 3, 1.5);
    paint(ctx, C.ink, 0);
    circle(ctx, 0, 9.5, 4.2);
    paint(ctx, '#2b2452', 2);
    circle(ctx, -1, 8.6, 1.3);
    ctx.fillStyle = C.aqua;
    ctx.fill();
    if (blink) glow(ctx, 5, -1.5, 7, C.coral, 0.7);
    circle(ctx, 5, -1.5, 1.8);
    ctx.fillStyle = blink ? C.coral : '#5a4a8a';
    ctx.fill();
  },

  weather(ctx, t) {
    const sw = Math.sin(t * 1.6) * 2;
    line(ctx, 0, 6, sw, 15, withAlpha(C.white, 0.85), 1.4);
    poly(ctx, [[sw, 13], [sw + 4, 16.5], [sw, 20], [sw - 4, 16.5]]);
    paint(ctx, C.lemon, 1.6);
    line(ctx, sw, 20, sw, 23, withAlpha(C.white, 0.85), 1.4);
    rrect(ctx, sw - 5.5, 23, 11, 8.5, 2);
    paint(ctx, C.cream, 2);
    circle(ctx, sw + 2, 27, 1.3);
    ctx.fillStyle = C.coral;
    ctx.fill();
    circle(ctx, 0, -8, 14.5);
    paint(ctx, C.white, 2.5);
    ctx.beginPath();
    ctx.arc(0, -8, 10, Math.PI * 1.1, Math.PI * 1.45);
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = withAlpha(C.lilac, 0.7);
    ctx.stroke();
    poly(ctx, [[-2.4, 6.2], [2.4, 6.2], [0, 3.6]]);
    paint(ctx, C.white, 1.6);
  },

  satellite(ctx, t) {
    ctx.save();
    ctx.rotate(-0.32 + Math.sin(t * 0.8) * 0.06);
    for (const s of [-1, 1]) {
      line(ctx, s * 6, 0, s * 9, 0, C.ink, 2.4);
      rrect(ctx, s > 0 ? 9 : -25, -6, 16, 12, 2);
      paint(ctx, '#6fa8ff', 2.2);
      ctx.strokeStyle = withAlpha(C.ink, 0.45);
      ctx.lineWidth = 1;
      const x0 = s > 0 ? 9 : -25;
      for (const dx of [5.3, 10.6]) {
        ctx.beginPath();
        ctx.moveTo(x0 + dx, -6);
        ctx.lineTo(x0 + dx, 6);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(x0, 0);
      ctx.lineTo(x0 + 16, 0);
      ctx.stroke();
    }
    rrect(ctx, -6.5, -8, 13, 16, 3);
    paint(ctx, '#f3d27a', 2.5);
    line(ctx, 0, -8, 0, -13, C.ink, 2);
    ctx.beginPath();
    ctx.arc(0, -17, 5.5, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.closePath();
    paint(ctx, C.white, 1.8);
    const blink = Math.sin(t * 5) > 0.3;
    circle(ctx, 0, 2, 2);
    ctx.fillStyle = blink ? C.coral : '#a9853a';
    ctx.fill();
    ctx.restore();
  },

  meteor(ctx, t, dir = 1) {
    // 꼬리는 날아온 쪽(위·뒤)으로 뻗는다.
    ctx.save();
    ctx.rotate(dir > 0 ? Math.PI + 0.36 : -0.36);
    const g = ctx.createLinearGradient(0, 0, 46, 0);
    g.addColorStop(0, withAlpha(C.lemon, 0.85));
    g.addColorStop(1, withAlpha(C.lemon, 0));
    poly(ctx, [[0, -7], [46 + Math.sin(t * 20) * 3, 0], [0, 7]]);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
    glow(ctx, 0, 0, 20, C.lemon, 0.5);
    star(ctx, 0, 0, 10.5, 5, 5, -Math.PI / 2 + t * 2);
    paint(ctx, C.lemon, 2.2);
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

/** 위험 표시(!) 배지. */
export function drawRiskBadge(ctx, x, y, t) {
  const s = 1 + Math.sin(t * 6) * 0.08;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  circle(ctx, 0, 0, 7);
  paint(ctx, C.coral, 2);
  rrect(ctx, -1.2, -4.4, 2.4, 5.2, 1.2);
  ctx.fillStyle = C.white;
  ctx.fill();
  circle(ctx, 0, 3.2, 1.3);
  ctx.fill();
  ctx.restore();
}
