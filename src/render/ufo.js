// 기체 8형태와 조종사. 원점은 기체 중심, 단위는 "설계 픽셀"(장면이 배율을 정한다).
import { C, TAU, paint, circle, ellipse, rrect, poly, line, glow, puffs, withAlpha, clamp } from './draw.js';

/** 형태별 반폭(설계 픽셀). 장면이 화면 크기에 맞춰 배율을 구할 때 쓴다. */
export const UFO_HALF_WIDTH = [29, 47, 55, 71, 73, 72, 86, 110];
/** 형태별 빔 발사구의 y 위치. */
export const UFO_BELLY = [20, 17, 17, 17, 22, 20, 24, 26];
/** 형태별 꼭대기(말풍선·구름을 붙일 높이). */
export const UFO_TOP = [-38, -26, -40, -40, -32, -30, -34, -46];

const HULL = C.cream;
const DIM_LIGHT = '#bfae86';

/**
 * 조종사 얼굴.
 * mood: idle | happy | alert | hide | shock
 */
function pilot(ctx, x, y, r, mood, t) {
  const duck = mood === 'hide' ? r * 0.55 : mood === 'shock' ? -r * 0.18 : 0;
  const py = y + duck;
  // 더듬이
  line(ctx, x, py - r * 0.9, x + r * 0.18, py - r * 1.55, C.ink, 2);
  circle(ctx, x + r * 0.18, py - r * 1.62, r * 0.2);
  paint(ctx, C.lemon, 1.6);
  circle(ctx, x, py, r);
  paint(ctx, C.pink, 2.2);
  // 볼
  ctx.fillStyle = withAlpha(C.coral, 0.45);
  circle(ctx, x - r * 0.62, py + r * 0.28, r * 0.17);
  ctx.fill();
  circle(ctx, x + r * 0.62, py + r * 0.28, r * 0.17);
  ctx.fill();

  const ex = r * 0.4;
  const ey = py - r * 0.08;
  const blink = mood === 'idle' && (t % 4.2 > 4.05 || (t + 1.7) % 6.1 > 6.0);
  ctx.lineCap = 'round';
  if (mood === 'happy') {
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(x + s * ex, ey + r * 0.1, r * 0.22, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
  } else if (mood === 'hide' || blink) {
    for (const s of [-1, 1]) line(ctx, x + s * ex - r * 0.2, ey, x + s * ex + r * 0.2, ey, C.ink, 2);
  } else {
    const big = mood === 'shock' ? 0.36 : mood === 'alert' ? 0.31 : 0.25;
    const pupil = mood === 'shock' ? 0.07 : mood === 'alert' ? 0.11 : 0.15;
    const look = mood === 'alert' ? r * 0.08 : 0;
    for (const s of [-1, 1]) {
      ellipse(ctx, x + s * ex, ey, r * big, r * (big + 0.07));
      paint(ctx, C.white, 1.5);
      circle(ctx, x + s * ex, ey + look, r * pupil);
      ctx.fillStyle = C.ink;
      ctx.fill();
    }
  }
  // 입
  if (mood === 'shock') {
    ellipse(ctx, x, py + r * 0.5, r * 0.14, r * 0.2);
    paint(ctx, C.ink, 0);
  } else if (mood === 'happy') {
    ctx.beginPath();
    ctx.arc(x, py + r * 0.3, r * 0.24, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
  } else if (mood === 'alert') {
    line(ctx, x - r * 0.12, py + r * 0.46, x + r * 0.12, py + r * 0.46, C.ink, 1.8);
  } else if (mood !== 'hide') {
    ctx.beginPath();
    ctx.arc(x, py + r * 0.34, r * 0.16, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
  }
  if (mood === 'alert' || mood === 'hide') {
    // 식은땀
    ctx.beginPath();
    ctx.moveTo(x + r * 0.95, py - r * 0.75);
    ctx.quadraticCurveTo(x + r * 1.25, py - r * 0.3, x + r * 0.95, py - r * 0.22);
    ctx.quadraticCurveTo(x + r * 0.68, py - r * 0.3, x + r * 0.95, py - r * 0.75);
    paint(ctx, C.aqua, 1.4);
  }
}

/** 위로 볼록한 유리 돔. 안에 조종사가 있으면 함께 그린다. */
function dome(ctx, x, y, rx, ry, o, withPilot = true, pilotR = 11) {
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(x - rx, y);
    ctx.ellipse(x, y, rx, ry, 0, Math.PI, TAU);
    ctx.closePath();
  };
  ctx.save();
  path();
  ctx.clip();
  ctx.fillStyle = withAlpha('#7fd4f0', 0.35);
  ctx.fillRect(x - rx, y - ry, rx * 2, ry);
  if (withPilot) pilot(ctx, x, y - ry * 0.34, pilotR, o.mood, o.t);
  ctx.restore();
  path();
  paint(ctx, withAlpha(C.aqua, 0.28), 2.5);
  // 유리 반사
  ctx.beginPath();
  ctx.ellipse(x, y, rx * 0.72, ry * 0.76, 0, Math.PI * 1.12, Math.PI * 1.42);
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = withAlpha(C.white, 0.85);
  ctx.lineCap = 'round';
  ctx.stroke();
}

/** 둘레 조명. 순서대로 깜빡인다. lit 0 = 숨는 중(꺼짐). */
function lights(ctx, pts, r, o) {
  pts.forEach(([x, y], i) => {
    const chase = (Math.sin(o.t * 5 - i * 1.1) + 1) / 2;
    const on = o.lit * (0.55 + 0.45 * chase);
    if (on > 0.3) glow(ctx, x, y, r * 2.8, C.lemon, 0.45 * on);
    circle(ctx, x, y, r);
    paint(ctx, on > 0.3 ? (chase > 0.5 ? C.lemon : C.lemonSoft) : DIM_LIGHT, 1.8);
  });
}

/** 타원 둘레를 따라 n 개의 조명 위치를 만든다(앞쪽 반원). */
function rimPoints(cx, cy, rx, ry, n) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = Math.PI * (0.14 + (0.72 * i) / (n - 1));
    pts.push([cx + Math.cos(a) * rx * -1, cy + Math.sin(a) * ry]);
  }
  return pts;
}

function emitter(ctx, x, y, rx, ry, o) {
  ellipse(ctx, x, y, rx, ry);
  paint(ctx, o.beam > 0 ? C.lemonSoft : C.lilac, 2.2);
  if (o.beam > 0) glow(ctx, x, y + 2, rx * 2, C.lemon, 0.6 * o.beam);
}

/** 기본 접시 몸통: 민트 테두리 + 크림 윗면. */
function saucer(ctx, rx, ry, y = 5) {
  ellipse(ctx, 0, y + 4, rx, ry + 1);
  paint(ctx, C.mint, 2.5);
  ellipse(ctx, 0, y, rx, ry);
  paint(ctx, HULL, 2.5);
  // 윗면 하이라이트
  ctx.beginPath();
  ctx.ellipse(0, y - 1, rx * 0.78, ry * 0.62, 0, Math.PI * 1.08, Math.PI * 1.45);
  ctx.lineWidth = 2;
  ctx.strokeStyle = withAlpha(C.white, 0.9);
  ctx.stroke();
}

function mast(ctx, x, y1, y2, o, color = C.coral) {
  line(ctx, x, y1, x, y2, C.ink, 2.4);
  const on = o.lit > 0.3 && Math.sin(o.t * 4) > -0.2;
  if (on) glow(ctx, x, y2 - 2, 9, color, 0.5);
  circle(ctx, x, y2 - 2, 3.4);
  paint(ctx, on ? color : DIM_LIGHT, 1.8);
}

const FORMS = [
  // 0 콩알 탐사정
  (ctx, o) => {
    mast(ctx, 0, -20, -33, o, C.lemon);
    emitter(ctx, 0, 19, 9, 4, o);
    circle(ctx, 0, 0, 22);
    paint(ctx, HULL, 2.5);
    ctx.beginPath();
    ctx.arc(0, 0, 17, Math.PI * 1.1, Math.PI * 1.4);
    ctx.lineWidth = 2;
    ctx.strokeStyle = withAlpha(C.white, 0.9);
    ctx.stroke();
    // 둥근 창
    ctx.save();
    circle(ctx, 0, -3, 13);
    ctx.clip();
    ctx.fillStyle = withAlpha('#7fd4f0', 0.4);
    ctx.fillRect(-14, -17, 28, 28);
    pilot(ctx, 0, -1, 10.5, o.mood, o.t);
    ctx.restore();
    circle(ctx, 0, -3, 13);
    paint(ctx, withAlpha(C.aqua, 0.22), 2.5);
    // 치마 테두리
    ellipse(ctx, 0, 13, 28, 7.5);
    paint(ctx, C.mint, 2.5);
    lights(ctx, [[-16, 15], [0, 17.5], [16, 15]], 2.8, o);
  },
  // 1 꼬마 접시
  (ctx, o) => {
    emitter(ctx, 0, 16, 13, 5, o);
    saucer(ctx, 46, 10.5);
    dome(ctx, 0, 0, 19, 21, o);
    lights(ctx, rimPoints(0, 9, 38, 8, 3), 3.6, o);
  },
  // 2 정찰 접시
  (ctx, o) => {
    mast(ctx, 0, -22, -36, o);
    emitter(ctx, 0, 16, 14, 5, o);
    saucer(ctx, 54, 11);
    ctx.beginPath();
    ctx.ellipse(0, 5, 40, 6.5, 0, Math.PI * 0.08, Math.PI * 0.92);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = C.coral;
    ctx.stroke();
    dome(ctx, 0, -1, 20, 22, o);
    lights(ctx, rimPoints(0, 9.5, 46, 8.5, 5), 3.4, o);
  },
  // 3 고리 접시
  (ctx, o) => {
    const ring = (from, to) => {
      for (const [w, col] of [[8, C.ink], [4.5, C.lilac]]) {
        ctx.beginPath();
        ctx.ellipse(0, 4, 68, 15, -0.13, from, to);
        ctx.lineWidth = w;
        ctx.strokeStyle = col;
        ctx.lineCap = 'butt';
        ctx.stroke();
      }
    };
    ring(Math.PI, TAU); // 뒤쪽 반
    mast(ctx, 0, -22, -36, o, C.lilac);
    emitter(ctx, 0, 16, 14, 5, o);
    saucer(ctx, 52, 11);
    dome(ctx, 0, -1, 20, 22, o);
    lights(ctx, rimPoints(0, 9.5, 44, 8.5, 5), 3.4, o);
    ring(0, Math.PI); // 앞쪽 반
    // 고리를 타고 도는 작은 구슬
    const a = o.t * 1.3;
    const bx = Math.cos(a) * 68;
    const by = 4 + Math.sin(a) * 15;
    const rx = bx * Math.cos(-0.13) - (by - 4) * Math.sin(-0.13);
    const ry = 4 + bx * Math.sin(-0.13) + (by - 4) * Math.cos(-0.13);
    if (Math.sin(a) > -0.2) {
      circle(ctx, rx, ry, 4);
      paint(ctx, C.lemon, 1.8);
    }
  },
  // 4 순찰선
  (ctx, o) => {
    for (const s of [-1, 1]) {
      poly(ctx, [[s * 56, 2], [s * 73, 6], [s * 58, 14]]);
      paint(ctx, C.coral, 2.5);
    }
    emitter(ctx, 0, 21, 16, 6, o);
    saucer(ctx, 62, 12.5, 8);
    ellipse(ctx, 0, -2, 37, 9.5);
    paint(ctx, C.creamShade, 2.5);
    for (const x of [-24, 24]) {
      circle(ctx, x, -2, 4);
      paint(ctx, o.lit > 0.3 ? C.aqua : '#8fb5c4', 1.8);
    }
    dome(ctx, 0, -6, 17, 19, o, true, 10);
    lights(ctx, rimPoints(0, 13, 53, 9.5, 6), 3.4, o);
  },
  // 5 관측선
  (ctx, o) => {
    // 레이더 접시
    line(ctx, -50, 2, -55, -14, C.ink, 2.4);
    ctx.save();
    ctx.translate(-56, -17);
    ctx.rotate(-0.5 + Math.sin(o.t * 0.9) * 0.25);
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI);
    ctx.closePath();
    paint(ctx, C.lilac, 2.2);
    line(ctx, 0, 0, 0, -6, C.ink, 2);
    ctx.restore();
    emitter(ctx, 0, 19, 16, 6, o);
    saucer(ctx, 70, 12.5, 6);
    ctx.beginPath();
    ctx.ellipse(0, 6, 54, 7.5, 0, Math.PI * 0.08, Math.PI * 0.92);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = C.coral;
    ctx.stroke();
    for (const s of [-1, 1]) {
      dome(ctx, s * 35, 1, 10.5, 11, o, false);
      circle(ctx, s * 35, -3, 2.6);
      ctx.fillStyle = s < 0 ? C.lemon : C.mint;
      ctx.fill();
    }
    dome(ctx, 0, -2, 19, 21, o);
    lights(ctx, rimPoints(0, 11, 61, 9.5, 7), 3.3, o);
  },
  // 6 대형 모선
  (ctx, o) => {
    mast(ctx, -36, -12, -26, o, C.lilac);
    mast(ctx, 36, -12, -26, o, C.coral);
    for (const x of [-40, 40]) emitter(ctx, x, 20, 9, 4, o);
    emitter(ctx, 0, 23, 18, 6.5, o);
    saucer(ctx, 84, 14, 8);
    rrect(ctx, -46, -15, 92, 19, 9.5);
    paint(ctx, C.creamShade, 2.5);
    for (let i = 0; i < 7; i++) {
      const lit = o.lit > 0.3 && (i * 7 + Math.floor(o.t * 0.7)) % 5 !== 0;
      rrect(ctx, -39 + i * 11.6, -10, 7.5, 8, 2.2);
      paint(ctx, lit ? C.lemon : '#8d7fb8', 1.6);
    }
    dome(ctx, 0, -15, 15, 17, o, true, 9);
    lights(ctx, rimPoints(0, 14, 74, 10.5, 9), 3.2, o);
  },
  // 7 은하 모선
  (ctx, o) => {
    const escort = (front) => {
      for (const ph of [0, Math.PI]) {
        const a = o.t * 0.8 + ph;
        if (Math.sin(a) > 0 !== front) continue;
        const x = Math.cos(a) * 104;
        const y = 2 + Math.sin(a) * 20;
        ellipse(ctx, x, y, 9, 3.4);
        paint(ctx, C.mint, 1.8);
        ctx.beginPath();
        ctx.arc(x, y - 1.5, 4, Math.PI, TAU);
        ctx.closePath();
        paint(ctx, C.aqua, 1.6);
      }
    };
    escort(false);
    // 왕관 고리
    const halo = 0.6 + 0.4 * Math.sin(o.t * 2.2);
    if (o.lit > 0.3) glow(ctx, 0, -42, 26, C.lemon, 0.35 * halo);
    for (const [w, col] of [[6.5, C.ink], [3, o.lit > 0.3 ? C.lemon : DIM_LIGHT]]) {
      ellipse(ctx, 0, -42, 22, 5.5);
      ctx.lineWidth = w;
      ctx.strokeStyle = col;
      ctx.stroke();
    }
    for (const s of [-1, 1]) {
      circle(ctx, s * 82, 8, 10);
      paint(ctx, C.lilac, 2.5);
      circle(ctx, s * 82, 8, 4);
      paint(ctx, o.lit > 0.3 ? C.aqua : '#8fb5c4', 1.6);
    }
    for (const x of [-46, 46]) emitter(ctx, x, 22, 10, 4.2, o);
    emitter(ctx, 0, 25, 20, 7, o);
    saucer(ctx, 88, 15, 9);
    rrect(ctx, -54, -13, 108, 19, 9.5);
    paint(ctx, C.creamShade, 2.5);
    rrect(ctx, -34, -27, 68, 16, 8);
    paint(ctx, HULL, 2.5);
    for (let i = 0; i < 9; i++) {
      const lit = o.lit > 0.3 && (i * 5 + Math.floor(o.t * 0.8)) % 6 !== 0;
      rrect(ctx, -48 + i * 10.9, -8.5, 7, 8, 2.2);
      paint(ctx, lit ? C.lemon : '#8d7fb8', 1.6);
    }
    for (let i = 0; i < 5; i++) {
      const lit = o.lit > 0.3 && (i * 3 + Math.floor(o.t * 0.6)) % 4 !== 0;
      circle(ctx, -24 + i * 12, -19, 3.2);
      paint(ctx, lit ? C.aqua : '#8fb5c4', 1.5);
    }
    dome(ctx, 0, -27, 14, 16, o, true, 8.5);
    lights(ctx, rimPoints(0, 15.5, 78, 11, 11), 3.1, o);
    escort(true);
  },
];

/**
 * 기체를 그린다.
 * @param {CanvasRenderingContext2D} ctx 원점이 기체 중심으로, 배율이 맞춰진 상태
 * @param {{form:number, t:number, mood?:string, lit?:number, beam?:number}} o
 */
export function drawUfo(ctx, o) {
  const opt = { mood: 'idle', lit: 1, beam: 0, ...o };
  FORMS[clamp(opt.form, 0, FORMS.length - 1)](ctx, opt);
}

/** 은폐용 구름. amount 0..1 로 부풀어 오른다. */
export function drawCloak(ctx, form, t, amount) {
  const hw = UFO_HALF_WIDTH[form] * 1.18;
  const top = UFO_TOP[form];
  const s = 0.6 + 0.4 * amount;
  const wob = (i) => Math.sin(t * 1.6 + i * 1.7) * 1.6;
  const blobs = [
    [-hw * 0.72, 8 + wob(0), hw * 0.34],
    [-hw * 0.36, top * 0.42 + wob(1), hw * 0.42],
    [hw * 0.08, top * 0.62 + wob(2), hw * 0.46],
    [hw * 0.5, top * 0.3 + wob(3), hw * 0.38],
    [hw * 0.8, 9 + wob(4), hw * 0.3],
    [-hw * 0.3, 14 + wob(5), hw * 0.42],
    [hw * 0.28, 15 + wob(6), hw * 0.44],
  ].map(([x, y, r]) => [x * s, y * s, r * s]);
  ctx.save();
  ctx.globalAlpha = clamp(amount * 1.2) * 0.96;
  puffs(ctx, blobs, C.cloud, 2.5);
  // 구름 결
  ctx.strokeStyle = withAlpha(C.lilac, 0.55);
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (const [x, y, r] of [blobs[1], blobs[3], blobs[6]]) {
    ctx.beginPath();
    ctx.arc(x, y, r * 0.55, Math.PI * 0.15, Math.PI * 0.6);
    ctx.stroke();
  }
  ctx.restore();
}
