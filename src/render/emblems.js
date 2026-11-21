// 임무 엠블럼과 특수 사건 배지. 원점은 중심, 반지름 20 px 의 둥근 배지.
// 금빛 테두리 고리 안에 컨셉 아트풍 작은 풍경(밝은 낮 하늘·초록 들판·밤의 따뜻한 불빛)을 그린다.
import { P, TAU, edge, shade, ball, gloss, glow, withAlpha, circle, ellipse, rrect, poly, cumulus } from './draw.js';

const R = 20;
const IN = 16.3; // 그림 창 반지름

const DAY = ['#3a78de', '#69aaf4', '#bfe2ff'];
const NIGHT = ['#121a5a', '#28318a', '#4a3f95'];
const WARM = '#ffd86a'; // 밤 불빛
const ALIEN = '#a4b3cc'; // 대원(기체 그림과 같은 색)
const ALIEN_EYE = '#141a36';

// ───────── 틀과 도구 ─────────

/** 금빛 테두리 고리. */
function ring(ctx) {
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, TAU);
  ctx.arc(0, 0, IN, 0, TAU, true);
  const g = ctx.createLinearGradient(-R, -R, R, R);
  g.addColorStop(0, '#fff3bd');
  g.addColorStop(0.42, '#f6c650');
  g.addColorStop(1, '#c7832b');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, (R + IN) / 2, Math.PI * 1.08, Math.PI * 1.42);
  stroke(ctx, 'rgba(255,255,255,0.8)', 1.1);
  circle(ctx, 0, 0, R);
  stroke(ctx, '#94601f', 1.3);
  circle(ctx, 0, 0, IN);
  stroke(ctx, '#a76c26', 1);
}

/** 그림 창 안쪽만 그리고, 오목한 그늘과 테두리를 얹는다. */
function scene(ctx, fn) {
  ctx.save();
  circle(ctx, 0, 0, IN);
  ctx.clip();
  fn();
  const g = ctx.createRadialGradient(-2.5, -3.5, IN * 0.55, 0, 0, IN + 0.5);
  g.addColorStop(0, 'rgba(27,29,74,0)');
  g.addColorStop(1, 'rgba(27,29,74,0.26)');
  ctx.fillStyle = g;
  ctx.fillRect(-R, -R, R * 2, R * 2);
  ctx.beginPath();
  ctx.arc(0, 0, IN - 1.6, Math.PI * 1.1, Math.PI * 1.4);
  stroke(ctx, 'rgba(255,255,255,0.32)', 1.6);
  ctx.restore();
  ring(ctx);
}

function stroke(ctx, color, lw) {
  ctx.lineWidth = lw;
  ctx.strokeStyle = color;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

function fill(ctx, color) {
  ctx.fillStyle = color;
  ctx.fill();
}

/** 세로 그라디언트. */
function vg(ctx, y0, y1, ...cols) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  cols.forEach((c, i) => g.addColorStop(i / (cols.length - 1), c));
  return g;
}

/** 창 전체를 하늘색으로. */
function sky(ctx, cols, y0 = -IN, y1 = IN) {
  ctx.fillStyle = vg(ctx, y0, y1, ...cols);
  ctx.fillRect(-R, -R, R * 2, R * 2);
}

/** 땅: 왼쪽 높이 yl, 가운데 ym, 오른쪽 yr 을 잇는 완만한 곡선 아래를 칠한다. */
function land(ctx, yl, ym, yr, color) {
  ctx.beginPath();
  ctx.moveTo(-R, yl);
  ctx.quadraticCurveTo(0, ym * 2 - (yl + yr) / 2, R, yr);
  ctx.lineTo(R, R);
  ctx.lineTo(-R, R);
  ctx.closePath();
  fill(ctx, color);
}

/** 반짝이는 별들 [[x, y, r], ...] */
function stars(ctx, pts, t) {
  pts.forEach(([x, y, r], i) => {
    const k = 0.6 + 0.4 * Math.sin(t * 2.6 + i * 1.9);
    ctx.save();
    ctx.globalAlpha *= k;
    if (r > 0.8) {
      ctx.beginPath();
      ctx.moveTo(x, y - r * 1.8);
      ctx.quadraticCurveTo(x, y, x + r * 1.8, y);
      ctx.quadraticCurveTo(x, y, x, y + r * 1.8);
      ctx.quadraticCurveTo(x, y, x - r * 1.8, y);
      ctx.quadraticCurveTo(x, y, x, y - r * 1.8);
      fill(ctx, '#fffbe6');
    } else {
      circle(ctx, x, y, r);
      fill(ctx, '#ffffff');
    }
    ctx.restore();
  });
}

/**
 * 작은 우리 기체(컨셉처럼 남색 접시 + 하늘색 유리 돔 + 청록 띠 불빛). s=1 이면 폭 15 px.
 * face: 돔 속 대원의 표정 'calm' | 'sleep' | 'happy' | 'laugh' | 'sneeze' | null
 * lights: 테두리 띠 불빛 색
 */
function ufo(ctx, x, y, s = 1, { face = 'calm', tilt = 0, lights = P.glow } = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.scale(s, s);
  // 돔
  ctx.beginPath();
  ctx.ellipse(0, -1.4, 3.9, 4.6, 0, Math.PI, TAU);
  ctx.closePath();
  const g = ctx.createLinearGradient(-3, -5, 3, -1);
  g.addColorStop(0, '#e8fcff');
  g.addColorStop(0.5, P.glass);
  g.addColorStop(1, '#4ea4d8');
  fill(ctx, g);
  if (face) {
    ball(ctx, 0, -2.9, 2.3, ALIEN, { lw: 0, light: 0.35, dark: 0.25 });
    if (face === 'calm' || face === 'happy') {
      for (const sx of [-1, 1]) {
        ellipse(ctx, sx * 0.9, -3, 0.62, 0.86, -sx * 0.4);
        fill(ctx, ALIEN_EYE);
        circle(ctx, sx * 0.9 - 0.2, -3.3, 0.2);
        fill(ctx, '#ffffff');
      }
    } else {
      ctx.beginPath();
      for (const sx of [-1, 1]) {
        const ex = sx * 0.9;
        if (face === 'sleep') {
          ctx.moveTo(ex - 0.55, -3.1);
          ctx.quadraticCurveTo(ex, -2.5, ex + 0.55, -3.1);
        } else if (face === 'laugh') {
          ctx.moveTo(ex - 0.55, -2.8);
          ctx.quadraticCurveTo(ex, -3.7, ex + 0.55, -2.8);
        } else {
          // 재채기: 질끈 감은 > < 눈
          ctx.moveTo(ex - 0.5 * sx, -3.6);
          ctx.lineTo(ex + 0.45 * sx, -3.1);
          ctx.lineTo(ex - 0.5 * sx, -2.6);
        }
      }
      stroke(ctx, ALIEN_EYE, 0.5);
    }
  }
  ctx.beginPath();
  ctx.ellipse(0, -1.4, 3.9, 4.6, 0, Math.PI, TAU);
  stroke(ctx, '#3b7fb3', 0.6);
  gloss(ctx, -2, -4.4, 0.9, 0.55, -0.6, 0.85);
  // 아래 빛 그릇
  ellipse(ctx, 0, 2.3, 2.8, 1);
  fill(ctx, withAlpha(lights, 0.9));
  // 선체: 어두운 아랫면 + 밝은 윗면
  ellipse(ctx, 0, 0.7, 7, 2.2);
  fill(ctx, P.hullDark);
  ctx.beginPath();
  ctx.ellipse(0, 0, 7.4, 2.2, 0, Math.PI, TAU);
  ctx.ellipse(0, 0, 7.4, 1.3, 0, 0, Math.PI);
  ctx.closePath();
  shade(ctx, P.hull, -4, -2.2, 4, 1.4, { lw: 0.6, light: 0.5, dark: 0.25, line: P.hullDark });
  ctx.beginPath();
  ctx.ellipse(0, -0.4, 5.8, 1.1, 0, Math.PI * 1.08, Math.PI * 1.92);
  stroke(ctx, withAlpha(P.hullLight, 0.85), 0.6);
  // 테두리 띠 불빛
  ctx.beginPath();
  ctx.ellipse(0, 0.3, 7, 1.35, 0, Math.PI * 0.06, Math.PI * 0.94);
  stroke(ctx, lights, 1.1);
  for (const lx of [-4.6, -1.6, 1.6, 4.6]) {
    circle(ctx, lx, 0.3 + 1.35 * Math.sqrt(1 - (lx / 7) ** 2), 0.5);
    fill(ctx, '#ffffff');
  }
  ctx.restore();
}

/** 낮 구름(외곽선 없음). */
function cloud(ctx, blobs, shadeColor = '#b9c6f2') {
  cumulus(ctx, blobs, { shadeColor });
}

/** 불꽃 한 송이. */
function burst(ctx, x, y, r, col, n, ph, t) {
  const k = 0.78 + 0.22 * Math.sin(t * 3 + ph);
  glow(ctx, x, y, r * 1.35, col, 0.4);
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + ph;
    ctx.moveTo(x + Math.cos(a) * r * 0.3 * k, y + Math.sin(a) * r * 0.3 * k);
    ctx.lineTo(x + Math.cos(a) * r * k, y + Math.sin(a) * r * k);
  }
  stroke(ctx, col, 1.3);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + ph;
    circle(ctx, x + Math.cos(a) * r * (k + 0.16), y + Math.sin(a) * r * (k + 0.16), 0.85);
    fill(ctx, '#fffbe6');
  }
  circle(ctx, x, y, 1.2);
  fill(ctx, '#ffffff');
}

/** 아래로 퍼지는 빛 원뿔. */
function cone(ctx, x, y, w0, x1, x2, y2, color, a0 = 0.55, a1 = 0.05) {
  poly(ctx, [[x - w0, y], [x + w0, y], [x2, y2], [x1, y2]]);
  ctx.fillStyle = vg(ctx, y, y2, withAlpha(color, a0), withAlpha(color, a1));
  ctx.fill();
}

// ───────── 엠블럼 ─────────

const EMBLEMS = {
  crop(ctx, t) {
    scene(ctx, () => {
      sky(ctx, ['#3a78de', '#7ab8f6', '#d8f0ff'], -IN, 0);
      cloud(ctx, [[-10, -9.5, 2.6], [-7, -10.8, 3.4], [-4, -9.4, 2.4]]);
      // 먼 언덕
      ellipse(ctx, -10, 0.2, 13, 4.2);
      fill(ctx, '#7ccb58');
      ellipse(ctx, 11, 0.6, 12, 3.6);
      fill(ctx, '#5fb44a');
      // 밀밭
      ctx.fillStyle = vg(ctx, -0.5, IN, '#ffe27a', '#f3bf4c', '#da962e');
      ctx.fillRect(-R, -0.5, R * 2, R);
      ctx.beginPath();
      for (let i = -7; i <= 7; i++) {
        ctx.moveTo(i * 1.6, -0.5);
        ctx.lineTo(i * 7.5, R);
      }
      stroke(ctx, withAlpha('#c4832a', 0.45), 0.7);
      // 미스터리 서클: 눌린 밀(밝게)과 선 밀(밭 색)이 번갈아
      const PALE = '#fff3bd';
      const FIELD = '#ecb446';
      ctx.beginPath();
      ctx.moveTo(-14, 6.6);
      ctx.lineTo(13, 9.8);
      stroke(ctx, PALE, 1.1);
      for (const [rx, ry, c] of [[11.2, 4.8, PALE], [8.5, 3.6, FIELD], [6.2, 2.6, PALE], [3.6, 1.55, FIELD], [1.6, 0.7, PALE]]) {
        ellipse(ctx, 0, 8.4, rx, ry);
        fill(ctx, c);
      }
      for (const [x, y, rx] of [[-14, 6.6, 2], [13, 9.8, 2.4]]) {
        ellipse(ctx, x, y, rx, rx * 0.45);
        fill(ctx, PALE);
      }
      // 기체와 빔
      const b = Math.sin(t * 2) * 0.8;
      cone(ctx, 0, -7.5 + b, 2.2, -7.5, 7.5, 8.4, P.glowSoft, 0.6, 0.1);
      ufo(ctx, 0, -8.6 + b, 1.1);
    });
  },

  cvs(ctx, t) {
    scene(ctx, () => {
      sky(ctx, NIGHT);
      stars(ctx, [[-11, -11, 0.9], [-3, -14, 0.6], [11, -10, 0.7], [6, -14, 0.5]], t);
      ctx.fillStyle = vg(ctx, 9, IN, '#3d4088', '#2a2d6c');
      ctx.fillRect(-R, 9, R * 2, R);
      glow(ctx, -1, 10.5, 16, WARM, 0.55);
      // 건물
      rrect(ctx, -12, -5.5, 24, 15, 1.2);
      shade(ctx, P.wall, -12, -6, 12, 10, { lw: 1, light: 0.25, dark: 0.35 });
      // 유리창: 밤새 켜진 따뜻한 불빛
      const fl = Math.sin(t * 3) > -0.7 ? 1 : 0.85;
      rrect(ctx, -10, -2, 13.4, 10.2, 0.8);
      ctx.fillStyle = vg(ctx, -2, 8, '#fffbe2', fl > 0.9 ? '#ffe680' : '#f5d56a', '#ffc14a');
      ctx.fill();
      stroke(ctx, '#8a6a4a', 0.8);
      ctx.beginPath();
      for (const y of [1.4, 4.6]) {
        ctx.moveTo(-9.4, y);
        ctx.lineTo(2.8, y);
      }
      stroke(ctx, withAlpha('#d8963a', 0.8), 0.8);
      for (const [x, y, c] of [[-8, 0.4, '#ff6b5e'], [-5.6, 0.4, '#3f8fe8'], [-2.6, 0.5, '#5cbf5a'], [0.6, 0.4, '#ff9a3c'], [-7, 3.6, '#ff8fb0'], [-3.8, 3.6, '#ffd23f'], [-0.6, 3.6, '#2fb5a6']]) {
        rrect(ctx, x - 0.9, y - 1, 1.8, 1.8, 0.4);
        fill(ctx, c);
      }
      // 문
      rrect(ctx, 4.6, -2, 5.6, 10.2, 0.6);
      ctx.fillStyle = vg(ctx, -2, 8, '#e6fbff', '#a9e4f2');
      ctx.fill();
      stroke(ctx, '#8a6a4a', 0.8);
      ctx.beginPath();
      ctx.moveTo(7.4, -2);
      ctx.lineTo(7.4, 8.2);
      stroke(ctx, '#8a6a4a', 0.6);
      // 간판
      rrect(ctx, -13.2, -9.6, 26.4, 5, 1.4);
      shade(ctx, '#2fb57a', -13, -10, 13, -4.6, { lw: 1, light: 0.3 });
      ctx.fillStyle = '#ff9a3c';
      ctx.fillRect(-12.4, -5.9, 24.8, 0.9);
      ctx.font = 'bold 4.6px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('24', 0, -7.4);
      glow(ctx, 0, -7.4, 10, '#c6ffd8', 0.25);
    });
  },

  cloudnap(ctx, t) {
    scene(ctx, () => {
      sky(ctx, ['#3a78de', '#5f9ff0', '#93c9fb']);
      glow(ctx, -11, -11, 10, '#fff6c8', 0.6);
      const b = Math.sin(t * 1.5) * 0.7;
      cloud(ctx, [[-12, 4 + b, 5], [-5, 1 + b, 6.4], [4, 0.4 + b, 6.8], [12, 4 + b, 5.4]], '#c3cdf3');
      ufo(ctx, 0, 1.8 + b, 1.55, { face: 'sleep' });
      cloud(ctx, [[-14, 11 + b, 5.6], [-7, 8.8 + b, 6.2], [1, 9.6 + b, 6.6], [9, 8.4 + b, 6], [15, 11 + b, 5.2], [0, 15 + b, 7]], '#bcc8f2');
      // Zz
      const z = (t * 0.5) % 1;
      for (const [x, y, s, a] of [[6, -6.2, 2.3, 1], [9.8, -9.8, 1.6, 0.85]]) {
        ctx.beginPath();
        const yy = y - z * 1.2;
        ctx.moveTo(x - s, yy - s);
        ctx.lineTo(x + s, yy - s);
        ctx.lineTo(x - s, yy + s);
        ctx.lineTo(x + s, yy + s);
        ctx.save();
        ctx.globalAlpha *= a;
        stroke(ctx, P.navy, 2.6);
        stroke(ctx, '#ffffff', 1.2);
        ctx.restore();
      }
    });
  },

  streetlamp(ctx, t) {
    scene(ctx, () => {
      sky(ctx, ['#1c276e', '#383f96', '#6a52a6']);
      stars(ctx, [[-6, -13, 0.8], [12, -12, 0.6], [-12, -6, 0.5]], t);
      // 골목 집들
      ctx.fillStyle = '#2c3378';
      ctx.fillRect(-R, 0, 10, R);
      poly(ctx, [[-R, 0], [-15, -4.5], [-10, 0]]);
      ctx.fill();
      ctx.fillRect(9, 2, R, R);
      poly(ctx, [[8, 2], [13.5, -2.5], [19, 2]]);
      ctx.fill();
      for (const [x, y] of [[-15.8, 2.6], [-12.8, 2.6], [11.4, 4.6], [14.4, 4.6]]) {
        glow(ctx, x + 1.1, y + 1.3, 3.2, WARM, 0.5);
        ctx.fillStyle = WARM;
        ctx.fillRect(x, y, 2.2, 2.6);
      }
      ctx.fillStyle = vg(ctx, 10, IN, '#3a3e84', '#2b2f6e');
      ctx.fillRect(-R, 10, R * 2, R);
      // 뒤쪽 진짜 가로등(작게)
      ctx.beginPath();
      ctx.moveTo(-6.5, 11);
      ctx.lineTo(-6.5, -1.5);
      ctx.quadraticCurveTo(-6.5, -3.5, -4.4, -3.4);
      stroke(ctx, '#6a74b4', 1.2);
      cone(ctx, -4.2, -2.4, 1.4, -8, 0, 11, '#ffe99a', 0.3, 0.04);
      glow(ctx, -4, -2.6, 6, WARM, 0.85);
      ellipse(ctx, -4, -3, 1.8, 1);
      fill(ctx, '#fff2b0');
      // 앞 가로등: 머리가 우리 기체
      const on = Math.sin(t * 9) > -0.92;
      if (on) cone(ctx, 4.4, -6, 4.5, -6.5, 16, 13, '#ffe99a', 0.7, 0.12);
      glow(ctx, 4.4, 11.5, 9, WARM, on ? 0.45 : 0.2);
      rrect(ctx, 0.4, -5, 2.2, 17, 0.8);
      shade(ctx, '#4f5b9c', 0.4, -5, 2.6, 12, { lw: 0.7, light: 0.5 });
      rrect(ctx, -0.6, 10.6, 4.2, 2.6, 0.8);
      shade(ctx, '#4f5b9c', -0.6, 10.6, 3.6, 13, { lw: 0.7 });
      if (on) glow(ctx, 4.4, -6.4, 9, '#fff3b0', 0.7);
      ufo(ctx, 4.4, -7.6, 1.15, { face: 'calm', lights: on ? '#fff3b0' : P.glow });
    });
  },

  highway(ctx, t) {
    scene(ctx, () => {
      sky(ctx, ['#17205e', '#46418f', '#f08a7a'], -IN, 0);
      stars(ctx, [[-10, -12, 0.8], [3, -14, 0.6]], t);
      // 언덕과 땅
      ellipse(ctx, -9, 0.6, 14, 3.4);
      fill(ctx, '#2e3778');
      ellipse(ctx, 11, 0.8, 12, 3);
      fill(ctx, '#353f86');
      ctx.fillStyle = vg(ctx, 0, IN, '#2a3270', '#1e2558');
      ctx.fillRect(-R, 0.6, R * 2, R);
      // 도로(원근)
      poly(ctx, [[-1.3, 0.6], [1.3, 0.6], [14, R], [-14, R]]);
      ctx.fillStyle = vg(ctx, 0, IN, '#545b98', '#41477e');
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-1.3, 0.6);
      ctx.lineTo(-14, R);
      ctx.moveTo(1.3, 0.6);
      ctx.lineTo(14, R);
      stroke(ctx, withAlpha('#ffffff', 0.75), 0.7);
      // 가운데 점선(앞으로 흐른다)
      ctx.fillStyle = '#ffd23f';
      for (let i = 0; i < 5; i++) {
        const u = ((i + t * 1.4) % 5) / 5;
        const y = 0.6 + u * u * 17;
        const w = 0.25 + u * 1.2;
        ctx.fillRect(-w / 2, y, w, 0.4 + u * 3.2);
      }
      // 길가 가로등
      for (const u of [0.25, 0.55, 0.9]) {
        const y = 0.6 + u * u * 16;
        for (const sx of [-1, 1]) {
          const x = sx * (1.8 + u * 13.5);
          glow(ctx, x, y - 2.5 * u - 1, 1.5 + u * 3, WARM, 0.9);
        }
      }
      // 앞 차의 빨간 미등
      rrect(ctx, 2.4, 6.2, 5.2, 3.2, 1);
      fill(ctx, '#2a2f66');
      for (const x of [3.3, 6.7]) {
        glow(ctx, x, 8, 2.6, '#ff4a4a', 0.8);
        circle(ctx, x, 8, 0.7);
        fill(ctx, '#ffd0c8');
      }
      // 길을 따라가는 기체
      const b = Math.sin(t * 2.2) * 0.8;
      glow(ctx, -3, -5.8 + b, 7, P.glow, 0.35);
      ufo(ctx, -3, -7.4 + b, 1.05);
    });
  },

  fireworks(ctx, t) {
    scene(ctx, () => {
      sky(ctx, ['#0f165a', '#262e84', '#463a92']);
      burst(ctx, -4, -5, 8.6, '#ffd23f', 12, 0, t);
      burst(ctx, 8.4, -9.2, 5.2, '#ff7ab8', 10, 1.3, t);
      burst(ctx, -11.5, 3, 4, '#7dff8a', 8, 2.1, t);
      // 섞여 있는 우리 기체
      ufo(ctx, 8.4, 1.4, 0.95, { face: 'happy', lights: '#ffe36a' });
      // 강과 군중
      ctx.fillStyle = vg(ctx, 8, IN, '#2d3486', '#1d2360');
      ctx.fillRect(-R, 8.4, R * 2, R);
      for (const [x, c] of [[-4, '#ffd23f'], [8.4, '#ff7ab8'], [-11.5, '#7dff8a']]) {
        ctx.fillStyle = withAlpha(c, 0.55);
        ctx.fillRect(x - 2.4, 9.6, 4.8, 0.7);
        ctx.fillRect(x - 1.4, 11.2, 2.8, 0.6);
      }
      ctx.fillStyle = '#161b4c';
      ctx.beginPath();
      for (let i = 0; i < 9; i++) {
        const x = -16 + i * 4 + (i % 2) * 0.8;
        const y = 13.4 + (i % 3) * 0.5;
        ctx.moveTo(x + 1.6, y);
        ctx.arc(x, y, 1.6, 0, TAU);
        ctx.rect(x - 2, y + 1, 4, 6);
      }
      ctx.fill();
    });
  },

  stadium(ctx, t) {
    scene(ctx, () => {
      sky(ctx, NIGHT);
      stars(ctx, [[2, -14, 0.6], [-2, -9, 0.5]], t);
      glow(ctx, 0, -4, 20, '#e8f4ff', 0.25);
      // 관중석
      ellipse(ctx, 0, 14, 22, 11);
      ctx.fillStyle = vg(ctx, 3, 16, '#3d3f88', '#2a2c68');
      ctx.fill();
      ctx.save();
      ctx.globalAlpha *= 0.8;
      for (let i = 0; i < 26; i++) {
        const x = -17 + (i % 13) * 2.8;
        const y = 5.2 + Math.floor(i / 13) * 1.8 + Math.abs(x) * 0.06;
        circle(ctx, x, y, 0.55);
        fill(ctx, ['#ff8fb0', '#ffd23f', '#9fe8ff', '#ffffff'][i % 4]);
      }
      ctx.restore();
      // 잔디와 내야
      ellipse(ctx, 0, 16, 18, 7.6);
      ctx.fillStyle = vg(ctx, 9, IN, '#7fd75a', '#4fae45');
      ctx.fill();
      poly(ctx, [[0, 10.4], [5, 13.2], [0, 16], [-5, 13.2]]);
      fill(ctx, '#e8b06a');
      poly(ctx, [[0, 11.4], [3.2, 13.2], [0, 15], [-3.2, 13.2]]);
      fill(ctx, '#6fcf55');
      // 조명 빛줄기
      cone(ctx, -9, -8, 3, -12, 6, 12, '#ffffff', 0.32, 0.03);
      cone(ctx, 8, -8, 3, -4, 13, 12, '#ffffff', 0.32, 0.03);
      // 조명탑(왼쪽)
      ctx.beginPath();
      ctx.moveTo(-10.6, 9);
      ctx.lineTo(-9.4, -6);
      ctx.moveTo(-7.4, 9);
      ctx.lineTo(-8.6, -6);
      for (const y of [6, 2, -2]) {
        ctx.moveTo(-10.4, y);
        ctx.lineTo(-7.6, y - 3.4);
      }
      stroke(ctx, '#8a92c8', 0.8);
      rrect(ctx, -14, -13, 10, 7, 1.2);
      shade(ctx, '#4a5294', -14, -13, -4, -6, { lw: 0.8, light: 0.35 });
      for (let i = 0; i < 6; i++) {
        const x = -12 + (i % 3) * 3;
        const y = -11 + Math.floor(i / 3) * 3;
        const on = (i + Math.floor(t * 2)) % 7 !== 0;
        glow(ctx, x, y, 3, '#ffffff', on ? 0.6 : 0.2);
        circle(ctx, x, y, 1.1);
        fill(ctx, on ? '#ffffff' : '#fff2b0');
      }
      // 조명탑 흉내 내는 기체(오른쪽)
      glow(ctx, 8, -8, 9, '#ffffff', 0.55);
      ufo(ctx, 8, -9.2, 1.15, { face: 'calm', lights: '#ffffff' });
    });
  },

  telescope(ctx, t) {
    scene(ctx, () => {
      sky(ctx, ['#0e1550', '#21307e', '#3b4c9c']);
      stars(ctx, [[-12, -9, 0.9], [-6, -14, 0.6], [-2, -6, 0.5], [6, -3, 0.6], [13, -2, 0.5], [-13, -1, 0.5]], t);
      // 지나가는 기체와 꼬리 빛
      const x = 5.6 + Math.sin(t * 0.9) * 1.2;
      ctx.beginPath();
      ctx.moveTo(x - 6.4, -7.2);
      ctx.quadraticCurveTo(x - 12, -5.4, x - 17, -8);
      stroke(ctx, withAlpha(P.glow, 0.45), 1.6);
      glow(ctx, x, -8, 8, P.glow, 0.3);
      ufo(ctx, x, -8.4, 1.05, { tilt: -0.1 });
      // 언덕
      land(ctx, 6, 3.6, 7.4, '#2c5a7a');
      land(ctx, 11, 9.5, 10, '#23496a');
      // 천문대
      rrect(ctx, -7.4, 1.6, 12, 8.4, 0.8);
      shade(ctx, '#e6e2f4', -7, 1.6, 5, 10, { lw: 0.8, light: 0.2, dark: 0.3 });
      rrect(ctx, -2.8, 5.4, 2.8, 4.6, 0.6);
      fill(ctx, WARM);
      // 망원경: 반대쪽 하늘(왼쪽 위)을 본다
      ctx.save();
      ctx.translate(-1.4, -2.4);
      ctx.rotate(-2.35);
      rrect(ctx, 0, -1.3, 9.2, 2.6, 0.6);
      shade(ctx, '#5a63a6', 0, -1.3, 9, 1.3, { lw: 0.7, light: 0.4 });
      rrect(ctx, 8, -1.8, 1.8, 3.6, 0.5);
      fill(ctx, '#3c4478');
      ctx.restore();
      // 돔(틈이 열려 있다)
      ctx.beginPath();
      ctx.arc(-1.4, 1.8, 7, Math.PI, TAU);
      ctx.closePath();
      shade(ctx, '#f4f2ff', -8, -5, 5, 2, { lw: 0.9, line: '#7a7fb2', light: 0.3, dark: 0.32 });
      ctx.save();
      ctx.beginPath();
      ctx.arc(-1.4, 1.8, 7, Math.PI, TAU);
      ctx.closePath();
      ctx.clip();
      poly(ctx, [[-3.6, 1.8], [-0.2, 1.8], [-5.2, -6], [-8.6, -4]]);
      fill(ctx, '#2a2f66');
      ctx.restore();
      gloss(ctx, -0.4, -2.6, 1.8, 1, -0.4, 0.7);
    });
  },

  airport(ctx, t) {
    scene(ctx, () => {
      sky(ctx, NIGHT);
      stars(ctx, [[8, -13, 0.8], [13, -6, 0.5], [2, -15, 0.5]], t);
      // 땅과 활주로(멀리 뻗는다)
      ctx.fillStyle = vg(ctx, 4, IN, '#26336c', '#1c2457');
      ctx.fillRect(-R, 4, R * 2, R);
      poly(ctx, [[3.2, 4.2], [6.2, 4.2], [17, R], [-5, R]]);
      ctx.fillStyle = vg(ctx, 4, IN, '#3f4688', '#525aa0');
      ctx.fill();
      poly(ctx, [[3.2, 4.2], [6.2, 4.2], [17, R], [-5, R]]);
      stroke(ctx, withAlpha('#c9d4ff', 0.5), 0.6);
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const u0 = i / 4 + 0.08;
        const u1 = u0 + 0.13;
        ctx.moveTo(4.7 + 1.3 * u0 * u0, 4.2 + 15.8 * u0 * u0);
        ctx.lineTo(4.7 + 1.3 * u1 * u1, 4.2 + 15.8 * u1 * u1);
      }
      stroke(ctx, withAlpha('#ffffff', 0.65), 0.7);
      // 활주로 등(차례로 깜빡인다)
      for (let i = 0; i < 5; i++) {
        const u = (i + 0.4) / 5;
        const k = u * u;
        const on = Math.floor(t * 6 - i) % 5 === 0;
        for (const [ax, bx, c] of [[3.2, -5, '#9fe8ff'], [6.2, 17, '#ffd86a']]) {
          const x = ax + (bx - ax) * k;
          const y = 4.2 + 15.8 * k;
          glow(ctx, x, y, 1.2 + k * 2.4 + (on ? 1.6 : 0), c, 0.85);
          circle(ctx, x, y, 0.45 + k * 0.6);
          fill(ctx, on ? '#ffffff' : c);
        }
      }
      // 관제탑
      poly(ctx, [[-9.6, 13], [-8.2, -3.6], [-4.6, -3.6], [-3.2, 13]]);
      shade(ctx, P.wall, -10, -4, -3, 13, { lw: 0.9, light: 0.2, dark: 0.35 });
      ctx.beginPath();
      for (const y of [2, 7]) {
        ctx.moveTo(-8.8, y);
        ctx.lineTo(-4, y);
      }
      stroke(ctx, withAlpha('#b59a7a', 0.7), 0.6);
      poly(ctx, [[-13, -9.2], [0.2, -9.2], [-1.8, -3.6], [-11, -3.6]]);
      ctx.fillStyle = vg(ctx, -9.2, -3.6, '#d8fbff', P.glass, '#4fb0d8');
      ctx.fill();
      stroke(ctx, '#2f5f8a', 0.8);
      glow(ctx, -6.4, -6.4, 9, P.glowSoft, 0.35);
      ctx.beginPath();
      for (const x of [-9, -6.4, -3.8]) {
        ctx.moveTo(x, -9.2);
        ctx.lineTo(x + (x + 6.4) * -0.12, -3.6);
      }
      stroke(ctx, '#2f5f8a', 0.6);
      rrect(ctx, -12.6, -11.6, 12.4, 2.6, 1);
      shade(ctx, P.wall, -12.6, -11.6, -0.2, -9, { lw: 0.8, light: 0.2, dark: 0.35 });
      ctx.beginPath();
      ctx.moveTo(-6.4, -11.6);
      ctx.lineTo(-6.4, -15);
      stroke(ctx, '#c9c3d8', 0.8);
      const on = Math.sin(t * 6) > 0;
      if (on) glow(ctx, -6.4, -15.4, 5, '#ff5a4e', 0.85);
      circle(ctx, -6.4, -15.4, 1.1);
      fill(ctx, on ? '#ff6b5e' : '#9a5a7a');
      // 활주로를 산책하는 기체
      const hb = Math.sin(t * 2) * 0.7;
      glow(ctx, 8.2, -3 + hb, 7, P.glow, 0.3);
      ufo(ctx, 8.2, -4 + hb, 0.95, { face: 'happy' });
    });
  },

  forecast(ctx, t) {
    scene(ctx, () => {
      // 초록 크로마키 벽
      sky(ctx, ['#7fdc86', '#4cc066', '#36a252']);
      glow(ctx, 10, -12, 14, '#fffbe0', 0.55);
      ctx.fillStyle = vg(ctx, 9, IN, '#d99d5e', '#b6773f');
      ctx.fillRect(-R, 9.4, R * 2, R);
      // 예보 화면
      ctx.beginPath();
      ctx.moveTo(-6, 4);
      ctx.lineTo(-7.6, 9.6);
      ctx.moveTo(-1, 4);
      ctx.lineTo(0.6, 9.6);
      stroke(ctx, '#3c4478', 1);
      rrect(ctx, -14, -11, 21, 15.4, 2);
      shade(ctx, '#3c4478', -14, -11, 7, 4.4, { lw: 0.8, light: 0.35 });
      rrect(ctx, -12.6, -9.6, 18.2, 12.6, 1.2);
      ctx.fillStyle = vg(ctx, -9.6, 3, '#8fd0ff', '#4f9ae8');
      ctx.fill();
      // 지도 속 땅
      ctx.beginPath();
      ctx.moveTo(-12.6, 0);
      ctx.quadraticCurveTo(-8, -3.6, -4, -1);
      ctx.quadraticCurveTo(0, 1.4, 5.6, -2.4);
      ctx.lineTo(5.6, 3);
      ctx.lineTo(-12.6, 3);
      ctx.closePath();
      fill(ctx, '#7fcf5a');
      // 해와 구름
      const sp = t * 0.8;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = sp + (i / 8) * TAU;
        ctx.moveTo(-7.6 + Math.cos(a) * 3.4, -5.4 + Math.sin(a) * 3.4);
        ctx.lineTo(-7.6 + Math.cos(a) * 4.6, -5.4 + Math.sin(a) * 4.6);
      }
      stroke(ctx, '#ffd23f', 0.9);
      ball(ctx, -7.6, -5.4, 2.7, '#ffd23f', { lw: 0.7 });
      ctx.beginPath();
      for (const [x, y, r] of [[-1.6, -3.2, 2.2], [1, -4.6, 2.8], [3.6, -3.2, 2]]) {
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, TAU);
      }
      ctx.rect(-1.6, -3.2, 5.2, 2.2);
      ctx.fillStyle = vg(ctx, -7, -1, '#ffffff', '#dbe3fb');
      ctx.fill();
      // 카메라(촬영 중 빨간 불)
      ctx.beginPath();
      ctx.moveTo(10.5, 6);
      ctx.lineTo(8, 12.6);
      ctx.moveTo(10.5, 6);
      ctx.lineTo(13.4, 12.6);
      ctx.moveTo(10.5, 6);
      ctx.lineTo(10.5, 12.8);
      stroke(ctx, '#3c4478', 0.9);
      rrect(ctx, 7.4, 0.4, 8, 5.6, 1.4);
      shade(ctx, '#4a5294', 7.4, 0.4, 15.4, 6, { lw: 0.8, light: 0.4 });
      rrect(ctx, 4.6, 1.4, 3.2, 3.6, 0.6);
      shade(ctx, '#2f3566', 4.6, 1.4, 7.8, 5, { lw: 0.7, light: 0.3 });
      circle(ctx, 4.7, 3.2, 1.3);
      fill(ctx, P.glass);
      const rec = Math.sin(t * 4) > -0.3;
      if (rec) glow(ctx, 13.6, -0.8, 3.4, '#ff4a4a', 0.8);
      circle(ctx, 13.6, -0.6, 0.9);
      fill(ctx, rec ? '#ff5a4e' : '#9a5a6a');
    });
  },

  pyramid(ctx, t) {
    scene(ctx, () => {
      sky(ctx, ['#3f82e2', '#86c2f6', '#ffe3ad']);
      glow(ctx, -9.5, -9, 9, '#fff6c8', 0.8);
      ball(ctx, -9.5, -9, 3.2, '#ffd84a', { lw: 0, light: 0.5 });
      // 먼 모래언덕
      ellipse(ctx, -10, 9, 16, 5.4);
      fill(ctx, '#f0c47a');
      ellipse(ctx, 13, 8.6, 12, 4.4);
      fill(ctx, '#e8b86c');
      // 피라미드: 밝은 왼쪽 면, 그늘진 오른쪽 면
      const A = [2, -6.4];
      poly(ctx, [A, [-13.4, 10.6], [6.4, 10.6]]);
      ctx.fillStyle = vg(ctx, -6, 10.6, '#ffe7a4', '#f2c066');
      ctx.fill();
      poly(ctx, [A, [6.4, 10.6], [16, 10.6]]);
      ctx.fillStyle = vg(ctx, -6, 10.6, '#dfa158', '#bf7f3c');
      ctx.fill();
      ctx.save();
      poly(ctx, [A, [-13.4, 10.6], [16, 10.6]]);
      ctx.clip();
      ctx.beginPath();
      for (const y of [-1.6, 2.6, 6.6]) {
        ctx.moveTo(-14, y);
        ctx.lineTo(16, y);
      }
      stroke(ctx, withAlpha('#a8692c', 0.35), 0.6);
      ctx.restore();
      poly(ctx, [A, [-13.4, 10.6], [16, 10.6]]);
      stroke(ctx, '#b0712f', 0.8);
      // 앞 모래
      land(ctx, 10.4, 9.6, 11, vg(ctx, 9, IN, '#f9d790', '#e8b25e'));
      // 꼭대기에서 쉬는 기체
      ufo(ctx, 2, -8.4, 0.95, { face: 'happy', tilt: Math.sin(t * 1.2) * 0.05 });
    });
  },

  moon(ctx, t) {
    scene(ctx, () => {
      sky(ctx, ['#0b1042', '#1a2266', '#2c3280']);
      stars(ctx, [[-3, -13, 0.8], [13, 6, 0.6], [-14, 4, 0.5], [6, -14, 0.5], [12, -11, 0.6]], t);
      // 멀리 뜬 지구
      glow(ctx, -8.4, -7.8, 7, '#7fc4ff', 0.35);
      ball(ctx, -8.4, -7.8, 3.5, '#3f86e0', { lw: 0.6, light: 0.45 });
      ctx.save();
      circle(ctx, -8.4, -7.8, 3.5);
      ctx.clip();
      ellipse(ctx, -9.8, -8.6, 1.8, 1.2, 0.4);
      fill(ctx, '#6fcf5a');
      ellipse(ctx, -6.6, -6.2, 1.4, 1.6, -0.3);
      fill(ctx, '#6fcf5a');
      ctx.restore();
      gloss(ctx, -9.6, -9.2, 1, 0.6, -0.5, 0.7);
      // 달 뒤에서 빼꼼 내다보는 기체
      const peek = 1 + Math.sin(t * 1.6) * 1.5;
      ufo(ctx, 8 + peek, -5.4, 1.05, { tilt: -0.3 });
      // 달
      ball(ctx, -0.5, 4.4, 12.4, '#ffe8a6', { lw: 1, line: '#c7a456', light: 0.4, dark: 0.32 });
      for (const [x, y, r] of [[-5, -0.6, 2.6], [3.4, 7.4, 3.2], [-1.6, -5.2, 1.5], [-6.8, 8.6, 1.9], [5.6, -0.8, 1.4]]) {
        circle(ctx, x, y, r);
        fill(ctx, '#ecce86');
        ctx.beginPath();
        ctx.arc(x, y, r, Math.PI * 1.05, Math.PI * 1.75);
        stroke(ctx, withAlpha('#c09a4a', 0.7), 0.7);
      }
      gloss(ctx, -6, -3, 2.6, 1.4, -0.6, 0.45);
    });
  },

  // ── 특수 사건 ──
  sneeze(ctx, t) {
    scene(ctx, () => {
      sky(ctx, ['#3a78de', '#62a2f2', '#9fd2ff']);
      const k = 0.5 + 0.5 * Math.sin(t * 2.5);
      // 에취! 만화식 폭발 테두리
      ctx.beginPath();
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * TAU + 0.1;
        const r = i % 2 ? 7.6 : 11.4 + k * 1.2 + (i % 4 ? 0 : 1.2);
        if (i) ctx.lineTo(Math.cos(a) * r, 2 + Math.sin(a) * r * 0.9);
        else ctx.moveTo(Math.cos(a) * r, 2 + Math.sin(a) * r * 0.9);
      }
      ctx.closePath();
      fill(ctx, 'rgba(255,248,214,0.92)');
      stroke(ctx, '#ffc93f', 0.9);
      // 사방으로 날아가는 은폐 구름 조각
      for (const [a, d, r] of [[-2.55, 13.6, 4.6], [-1.45, 14.6, 3.6], [-0.35, 14, 4.2], [0.75, 13.6, 4.8], [2.15, 14.2, 4]]) {
        const dd = d + k * 2;
        const cx = Math.cos(a);
        const sy = Math.sin(a);
        const x = cx * dd;
        const y = 2 + sy * dd * 0.9;
        ctx.beginPath();
        for (const o of [-1.6, 1.6]) {
          ctx.moveTo(x - cx * (r + 1) - sy * o, y - sy * (r + 1) + cx * o);
          ctx.lineTo(x - cx * (r + 4.5) - sy * o, y - sy * (r + 4.5) + cx * o);
        }
        stroke(ctx, 'rgba(255,255,255,0.85)', 0.8);
        cloud(ctx, [[x, y, r], [x - cx * r * 0.7 + sy * r * 0.5, y - sy * r * 0.7 - cx * r * 0.4, r * 0.66]], '#c3cdf3');
      }
      ufo(ctx, 0, 2.4, 1.45, { face: 'sneeze', tilt: -0.1 + k * 0.1 });
      for (const [x, y, r] of [[6.2, -4.6, 0.9], [8.4, -2.4, 0.7], [7.6, -6.8, 0.6]]) {
        circle(ctx, x + k * 1.2, y - k * 0.6, r);
        fill(ctx, '#7fd8ff');
      }
    });
  },

  selfie(ctx, t) {
    scene(ctx, () => {
      sky(ctx, NIGHT);
      const f = 0.82 + 0.18 * Math.sin(t * 7);
      glow(ctx, 6, -10, 26 * f, '#fff8dc', 0.9);
      // 휴대폰(화면에 우리 기체가 찍혀 있다)
      ctx.save();
      ctx.translate(-2, 2);
      ctx.rotate(-0.16);
      rrect(ctx, -7.4, -11, 14.8, 23, 3);
      shade(ctx, '#ff6b5e', -7, -11, 7, 12, { lw: 1, light: 0.3 });
      rrect(ctx, -6, -8.4, 12, 17.4, 1.4);
      ctx.fillStyle = vg(ctx, -8, 9, '#9fd8ff', '#d8f2ff');
      ctx.fill();
      cloud(ctx, [[-3.4, 5.4, 2.4], [-0.6, 4.4, 2.8], [2.6, 5.6, 2.2]]);
      ufo(ctx, 0, -0.4, 0.95, { face: 'happy' });
      circle(ctx, 0, 10.4, 1.1);
      fill(ctx, '#ffffff');
      circle(ctx, 0, -9.6, 0.6);
      fill(ctx, '#4a2f4a');
      ctx.restore();
      // 번쩍!
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU + 0.2;
        const r = (i % 2 ? 5.6 : 9) * f;
        ctx.moveTo(7.6 + Math.cos(a) * 2, -9 + Math.sin(a) * 2);
        ctx.lineTo(7.6 + Math.cos(a) * r, -9 + Math.sin(a) * r);
      }
      stroke(ctx, '#fff2a0', 1.4);
      ctx.beginPath();
      const s = 4.6 * f;
      ctx.moveTo(7.6, -9 - s);
      ctx.quadraticCurveTo(7.6, -9, 7.6 + s, -9);
      ctx.quadraticCurveTo(7.6, -9, 7.6, -9 + s);
      ctx.quadraticCurveTo(7.6, -9, 7.6 - s, -9);
      ctx.quadraticCurveTo(7.6, -9, 7.6, -9 - s);
      fill(ctx, '#ffffff');
      circle(ctx, 7.6, -9, 1.6);
      fill(ctx, '#ffffff');
    });
  },

  tickle(ctx, t) {
    scene(ctx, () => {
      sky(ctx, ['#ffd3de', '#ffb0c6', '#ff93b2']);
      // 만화 집중선
      ctx.save();
      ctx.globalAlpha *= 0.35;
      ctx.beginPath();
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU;
        ctx.moveTo(1 + Math.cos(a) * 11, -1 + Math.sin(a) * 11);
        ctx.lineTo(1 + Math.cos(a) * 20, -1 + Math.sin(a) * 20);
      }
      stroke(ctx, '#ffffff', 1.6);
      ctx.restore();
      const wob = Math.sin(t * 14) * 0.09;
      // 웃음을 못 참아 불이 전부 켜졌다
      glow(ctx, 1.5, -0.6, 13, '#fff6b0', 0.55);
      ufo(ctx, 1.5, -1.4, 1.75, { face: 'laugh', tilt: wob, lights: '#fff6a0' });
      // 간질간질 표시
      ctx.beginPath();
      for (const [x, y, s] of [[-11, -7, 1], [13, -8, -1], [14.4, 4, -1]]) {
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + s * 1.2, y - 1.4, x + s * 2.4, y);
        ctx.quadraticCurveTo(x + s * 3.6, y + 1.4, x + s * 4.8, y);
      }
      stroke(ctx, '#d04a7a', 1);
      // 콕콕 찌르는 손가락(아래 왼쪽에서)
      const poke = Math.max(0, Math.sin(t * 8)) * 1.6;
      const SKIN = P.skin[0];
      const SKIN_LINE = edge(P.skin[1], 0.4);
      ctx.save();
      ctx.translate(-6.2 + poke * 0.6, 9.8 - poke * 0.8);
      ctx.rotate(0.6);
      rrect(ctx, -5.8, 6.6, 11.6, 7, 1.6);
      shade(ctx, P.blue, -5.8, 6.6, 5.8, 13, { lw: 0.9 });
      rrect(ctx, -3.8, -8.4, 4.6, 9.6, 2.3);
      shade(ctx, SKIN, -3.8, -8.4, 0.8, 1, { lw: 0.9, line: SKIN_LINE });
      rrect(ctx, -3, -7.7, 3, 2.8, 1.2);
      fill(ctx, '#fff0ea');
      rrect(ctx, -5.2, -1.4, 10.4, 8.6, 3.8);
      shade(ctx, SKIN, -5.2, -1.4, 5.2, 7.2, { lw: 0.9, line: SKIN_LINE });
      ctx.beginPath();
      for (const y of [1, 3.2, 5.4]) {
        ctx.moveTo(1.4, y);
        ctx.quadraticCurveTo(3.8, y + 0.2, 4.8, y + 1.2);
      }
      stroke(ctx, SKIN_LINE, 0.7);
      ellipse(ctx, -4.6, 2.4, 1.7, 3, 0.25);
      shade(ctx, SKIN, -6.2, -0.8, -2.8, 5.2, { lw: 0.9, line: SKIN_LINE });
      gloss(ctx, -2.4, -5.6, 0.7, 1.8, 0, 0.5);
      ctx.restore();
    });
  },
};

/** 모르는 id: 빈 하늘 배지. */
function plain(ctx) {
  scene(ctx, () => {
    sky(ctx, ['#7fa6ec', '#a9c8f6', '#d6e6ff']);
  });
}

/** 임무·특수 사건 배지를 그린다. 원점이 중심인 상태에서 부른다. */
export function drawEmblem(ctx, id, t = 0) {
  const fn = EMBLEMS[id];
  if (fn) fn(ctx, t);
  else plain(ctx);
}

export const EMBLEM_RADIUS = R;
