// 임무 엠블럼과 특수 사건 아이콘. 원점은 중심, 반지름 20 px 의 둥근 배지 안에 그린다.
import { C, TAU, paint, circle, ellipse, rrect, poly, line, glow, star, puffs, withAlpha } from './draw.js';

const R = 20;

function badge(ctx, fill) {
  circle(ctx, 0, 0, R);
  paint(ctx, fill, 2.5);
}

/** 배지 안쪽으로만 그리도록 잘라 낸다. */
function inside(ctx, fn) {
  ctx.save();
  circle(ctx, 0, 0, R - 1.2);
  ctx.clip();
  fn();
  ctx.restore();
  circle(ctx, 0, 0, R);
  paint(ctx, null, 2.5);
}

const NIGHT = '#3a2f78';

const EMBLEMS = {
  crop(ctx) {
    badge(ctx, '#5fbf7a');
    inside(ctx, () => {
      ctx.strokeStyle = withAlpha('#3f8f5a', 0.9);
      ctx.lineWidth = 1.4;
      for (let x = -20; x <= 20; x += 5) {
        ctx.beginPath();
        ctx.moveTo(x, -20);
        ctx.lineTo(x + 6, 20);
        ctx.stroke();
      }
      for (const r of [12, 7.5, 3]) {
        circle(ctx, 0, 0, r);
        ctx.lineWidth = 2.4;
        ctx.strokeStyle = C.cream;
        ctx.stroke();
      }
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * TAU + 0.5;
        circle(ctx, Math.cos(a) * 15.5, Math.sin(a) * 15.5, 2);
        ctx.fillStyle = C.cream;
        ctx.fill();
      }
    });
  },

  cvs(ctx, t) {
    badge(ctx, NIGHT);
    inside(ctx, () => {
      glow(ctx, 0, 4, 22, C.lemon, 0.35);
      rrect(ctx, -12, -4, 24, 17, 2);
      paint(ctx, C.cream, 2);
      rrect(ctx, -9, 1, 9, 12, 1.2);
      paint(ctx, Math.sin(t * 3) > -0.6 ? C.lemon : C.lemonSoft, 1.6);
      rrect(ctx, 3, 1, 6, 12, 1.2);
      paint(ctx, C.aqua, 1.6);
      // 줄무늬 차양
      ctx.save();
      rrect(ctx, -14, -10, 28, 7, 2);
      ctx.clip();
      ctx.fillStyle = C.white;
      ctx.fillRect(-14, -10, 28, 7);
      ctx.fillStyle = C.coral;
      for (let x = -14; x < 14; x += 8) ctx.fillRect(x, -10, 4, 7);
      ctx.restore();
      rrect(ctx, -14, -10, 28, 7, 2);
      paint(ctx, null, 2);
      line(ctx, -20, 13.5, 20, 13.5, C.ink, 2);
    });
  },

  cloudnap(ctx, t) {
    badge(ctx, '#5b7fd6');
    inside(ctx, () => {
      const b = Math.sin(t * 1.5) * 0.8;
      puffs(ctx, [[-8, 5 + b, 7], [0, 1 + b, 9], [9, 5 + b, 6.5], [1, 8 + b, 7]], C.white, 2);
      ctx.strokeStyle = C.lemon;
      ctx.lineWidth = 2.2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      for (const [x, y, s] of [[4, -9, 4.5], [11, -14, 3]]) {
        ctx.beginPath();
        ctx.moveTo(x - s, y - s);
        ctx.lineTo(x + s, y - s);
        ctx.lineTo(x - s, y + s);
        ctx.lineTo(x + s, y + s);
        ctx.stroke();
      }
    });
  },

  streetlamp(ctx, t) {
    badge(ctx, NIGHT);
    inside(ctx, () => {
      const on = Math.sin(t * 9) > -0.9;
      if (on) {
        poly(ctx, [[1, -9], [-13, 20], [16, 20]]);
        ctx.fillStyle = withAlpha(C.lemon, 0.38);
        ctx.fill();
      }
      line(ctx, -7, 20, -7, -10, C.ink, 4.4);
      line(ctx, -7, 20, -7, -10, C.cream, 2);
      ctx.beginPath();
      ctx.moveTo(-7, -10);
      ctx.quadraticCurveTo(-7, -15, 1, -14);
      ctx.lineWidth = 4.4;
      ctx.strokeStyle = C.ink;
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.strokeStyle = C.cream;
      ctx.stroke();
      ellipse(ctx, 3, -11.5, 5.5, 3);
      paint(ctx, on ? C.lemon : C.creamShade, 2);
    });
  },

  highway(ctx, t) {
    badge(ctx, NIGHT);
    inside(ctx, () => {
      ctx.fillStyle = '#5b4a9a';
      ctx.fillRect(-20, -4, 40, 2);
      poly(ctx, [[-3, -4], [3, -4], [18, 20], [-18, 20]]);
      paint(ctx, '#4a4370', 2);
      const off = (t * 9) % 8;
      ctx.fillStyle = C.lemon;
      for (let y = -2 + off; y < 20; y += 8) {
        const w = 1 + (y + 4) * 0.09;
        ctx.fillRect(-w / 2, y, w, 4);
      }
      circle(ctx, -9, -11, 2);
      ctx.fillStyle = C.white;
      ctx.fill();
      circle(ctx, 9, -13, 1.4);
      ctx.fill();
    });
  },

  fireworks(ctx, t) {
    badge(ctx, NIGHT);
    inside(ctx, () => {
      const burst = (x, y, r, col, n, ph) => {
        const k = 0.75 + 0.25 * Math.sin(t * 3 + ph);
        for (let i = 0; i < n; i++) {
          const a = (i / n) * TAU + ph;
          line(ctx, x + Math.cos(a) * r * 0.35, y + Math.sin(a) * r * 0.35, x + Math.cos(a) * r * k, y + Math.sin(a) * r * k, col, 2.2);
          circle(ctx, x + Math.cos(a) * r * (k + 0.18), y + Math.sin(a) * r * (k + 0.18), 1.2);
          ctx.fillStyle = col;
          ctx.fill();
        }
      };
      burst(-3, -3, 12, C.lemon, 10, 0);
      burst(9, 8, 6.5, C.mint, 8, 0.4);
      burst(-11, 10, 5, C.coral, 7, 1.1);
    });
  },

  stadium(ctx, t) {
    badge(ctx, NIGHT);
    inside(ctx, () => {
      glow(ctx, 0, -9, 20, C.white, 0.3);
      line(ctx, -5, 20, -2, -2, C.ink, 2.2);
      line(ctx, 5, 20, 2, -2, C.ink, 2.2);
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 1.4;
      for (const y of [4, 11, 18]) {
        ctx.beginPath();
        ctx.moveTo(-3 - (y - 4) * 0.14, y);
        ctx.lineTo(3 + (y - 4) * 0.14, y - 6);
        ctx.stroke();
      }
      rrect(ctx, -12, -16, 24, 14, 2.5);
      paint(ctx, '#56507a', 2);
      for (let i = 0; i < 6; i++) {
        const on = (i + Math.floor(t * 2)) % 7 !== 0;
        circle(ctx, -7 + (i % 3) * 7, -12.5 + Math.floor(i / 3) * 7, 2.4);
        ctx.fillStyle = on ? C.white : C.lemon;
        ctx.fill();
      }
    });
  },

  telescope(ctx) {
    badge(ctx, '#141a52');
    inside(ctx, () => {
      for (const [x, y, r] of [[-12, -11, 1.2], [10, -13, 1], [14, -3, 0.9], [-5, -15, 0.8]]) {
        circle(ctx, x, y, r);
        ctx.fillStyle = C.white;
        ctx.fill();
      }
      rrect(ctx, -12, 6, 24, 14, 1.5);
      paint(ctx, C.creamShade, 2);
      ctx.beginPath();
      ctx.arc(0, 6, 12, Math.PI, TAU);
      ctx.closePath();
      paint(ctx, C.cream, 2.2);
      poly(ctx, [[-1, 6], [3, -6], [8, -3.5], [5, 6]]);
      paint(ctx, C.ink, 0);
      rrect(ctx, -2.5, 11, 5, 9, 1);
      paint(ctx, C.lemon, 1.6);
    });
  },

  airport(ctx, t) {
    badge(ctx, NIGHT);
    inside(ctx, () => {
      poly(ctx, [[-3.5, 20], [-2.5, -3], [2.5, -3], [3.5, 20]]);
      paint(ctx, C.cream, 2);
      poly(ctx, [[-10, -12], [10, -12], [7, -3], [-7, -3]]);
      paint(ctx, C.aqua, 2);
      line(ctx, -3, -12, -2.2, -3, C.ink, 1.2);
      line(ctx, 3, -12, 2.2, -3, C.ink, 1.2);
      rrect(ctx, -9, -15.5, 18, 4, 1.5);
      paint(ctx, C.creamShade, 1.8);
      line(ctx, 0, -15.5, 0, -19, C.ink, 1.8);
      const on = Math.sin(t * 6) > 0;
      if (on) glow(ctx, 0, -19, 7, C.coral, 0.8);
      circle(ctx, 0, -19, 1.8);
      ctx.fillStyle = on ? C.coral : '#7a5a8a';
      ctx.fill();
    });
  },

  forecast(ctx) {
    badge(ctx, '#4a6fd0');
    inside(ctx, () => {
      line(ctx, 0, 9, 0, 14, C.ink, 2.4);
      line(ctx, -7, 15, 7, 15, C.ink, 2.6);
      rrect(ctx, -13, -12, 26, 21, 3.5);
      paint(ctx, C.cream, 2.2);
      rrect(ctx, -10.5, -9.5, 21, 16, 2);
      paint(ctx, '#8fc7ff', 1.4);
      circle(ctx, -4.5, -3.5, 4);
      paint(ctx, C.lemon, 1.4);
      puffs(ctx, [[0, 2, 3.4], [4.5, 0.5, 4.2], [8, 2.5, 2.8], [3.5, 3.5, 3.2]], C.white, 1.1);
    });
  },

  pyramid(ctx) {
    badge(ctx, '#3d2f7a');
    inside(ctx, () => {
      circle(ctx, 10, -10, 4.5);
      ctx.fillStyle = C.lemonSoft;
      ctx.fill();
      ctx.fillStyle = '#c99a4a';
      ctx.fillRect(-20, 12, 40, 8);
      poly(ctx, [[-2, -11], [15, 12.5], [-17, 12.5]]);
      paint(ctx, '#f0c873', 2.2);
      poly(ctx, [[-2, -11], [15, 12.5], [4, 12.5]]);
      paint(ctx, '#d4a24f', 0);
      poly(ctx, [[-2, -11], [15, 12.5], [-17, 12.5]]);
      paint(ctx, null, 2.2);
      ctx.strokeStyle = withAlpha(C.ink, 0.3);
      ctx.lineWidth = 1;
      for (const y of [-2, 5]) {
        ctx.beginPath();
        ctx.moveTo(-2 - (y + 11) * 0.62, y);
        ctx.lineTo(-2 + (y + 11) * 0.7, y);
        ctx.stroke();
      }
    });
  },

  moon(ctx, t) {
    badge(ctx, '#0c0f3a');
    inside(ctx, () => {
      // 달 뒤에서 살짝 내다보는 접시
      const peek = 2 + Math.sin(t * 1.6) * 1.5;
      ellipse(ctx, 12 + peek, -8, 8, 2.8, -0.3);
      paint(ctx, C.mint, 1.6);
      ctx.beginPath();
      ctx.arc(12 + peek, -9.5, 3.6, Math.PI * 0.95, Math.PI * 1.95);
      ctx.closePath();
      paint(ctx, C.aqua, 1.4);
      circle(ctx, -2, 3, 13.5);
      paint(ctx, C.cream, 2.2);
      for (const [x, y, r] of [[-7, -2, 3], [2, 6, 3.8], [-1, -6, 1.8], [-9, 8, 2]]) {
        circle(ctx, x, y, r);
        paint(ctx, C.creamShade, 1.2, withAlpha(C.ink, 0.35));
      }
    });
  },

  // ── 특수 사건 ──
  sneeze(ctx, t) {
    badge(ctx, '#5b7fd6');
    inside(ctx, () => {
      puffs(ctx, [[-9, 4, 6.5], [-2, -1, 8.5], [6, 4, 6], [-2, 7, 6.5]], C.white, 2);
      const k = 0.6 + 0.4 * Math.abs(Math.sin(t * 5));
      for (const a of [-0.55, -0.15, 0.25]) {
        line(ctx, 9, -6, 9 + Math.cos(a) * 9 * k, -6 + Math.sin(a) * 9 * k, C.lemon, 2.2);
      }
      for (const [x, y] of [[14, 3], [10, 9], [16, 9]]) {
        circle(ctx, x, y, 1.5);
        ctx.fillStyle = C.aqua;
        ctx.fill();
      }
    });
  },

  selfie(ctx, t) {
    badge(ctx, NIGHT);
    inside(ctx, () => {
      const f = 0.8 + 0.2 * Math.sin(t * 7);
      glow(ctx, 0, -6, 22 * f, C.white, 0.5);
      star(ctx, 6, -9, 8 * f, 2.6, 4, t);
      paint(ctx, C.white, 1.4);
      rrect(ctx, -9, -5, 15, 22, 3.5);
      paint(ctx, C.cream, 2.2);
      rrect(ctx, -6.5, -2, 10, 13, 1.5);
      paint(ctx, C.aqua, 1.4);
      circle(ctx, -1.5, 14, 1.3);
      ctx.fillStyle = C.ink;
      ctx.fill();
    });
  },

  tickle(ctx, t) {
    badge(ctx, '#ff9db5');
    inside(ctx, () => {
      const poke = Math.sin(t * 8) * 2;
      // 가리키는 손가락
      ctx.save();
      ctx.translate(-4 + poke, 5 - poke);
      ctx.rotate(-0.75);
      rrect(ctx, -6, 0, 13, 13, 4.5);
      paint(ctx, '#ffd9b8', 2.2);
      rrect(ctx, -6, -13, 5.6, 16, 2.8);
      paint(ctx, '#ffd9b8', 2.2);
      ctx.restore();
      for (const [x, y, a] of [[9, -11, 0.3], [13, -5, 0.9], [4, -15, -0.3]]) {
        line(ctx, x, y, x + Math.cos(a - 1.2) * 4, y + Math.sin(a - 1.2) * 4, C.white, 2);
      }
    });
  },
};

/** 임무·특수 사건 배지를 그린다. 원점이 중심인 상태에서 부른다. */
export function drawEmblem(ctx, id, t = 0) {
  const fn = EMBLEMS[id];
  if (fn) fn(ctx, t);
  else badge(ctx, NIGHT);
}

export const EMBLEM_RADIUS = R;
