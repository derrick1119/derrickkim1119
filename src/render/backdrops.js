// 무대 배경 7종 — 컨셉 아트의 낮 3D 카툰 풍.
// 배경은 외곽선 없이 부드러운 그러데이션 덩어리로만 그려서, 외곽선이 있는 게임 요소가 또렷하게 보이게 한다.
// 먼 것일수록 하늘색에 묻혀 옅고 푸르다(대기 원근). 빛은 왼쪽 위에서 온다.
// 위쪽은 탁 트인 하늘로 두고, 볼거리는 수평선 ~ groundY 사이와 땅 띠에 모은다.
// makeBackdrop() 은 크기가 바뀔 때 한 번 그리는 paint 와 매 프레임 그리는 live 를 돌려준다.
import { P, TAU, clamp, tone, shade, ball, glow, groundShadow, cumulus, withAlpha, circle, ellipse, rrect, poly, star } from './draw.js';
import { seededRng } from '../core/rng.js';

const STAGE_SEED = { farm: 11, suburb: 23, camp: 37, city: 41, observatory: 53, cloudsea: 67, orbit: 79 };
const HUD = 150; // 위쪽 계기판이 덮는 높이(대략)

/** 무대별 대표 색(브라우저 테마 색 등에 쓴다): 화면 맨 위 하늘색. */
export const STAGE_THEME = {
  farm: '#3567d6',
  suburb: '#3d72d6',
  camp: '#4a68cc',
  city: '#3a4ab0',
  observatory: '#141a4c',
  cloudsea: '#2c62d6',
  orbit: '#060a26',
};

// 구름 색: lit 볕 받는 윗면, mid 몸통, shade 아랫면 그늘
const TINT = {
  day: { lit: '#ffffff', mid: '#e2e7fb', shade: '#9aace6' },
  far: { lit: '#f7fbff', mid: '#e4ecfb', shade: '#bccdf0' },
  warm: { lit: '#fffbf2', mid: '#ece8f8', shade: '#a9abe2' },
  gold: { lit: '#fff5e4', mid: '#fcd8c8', shade: '#ad90c8' },
  sunset: { lit: '#ffdcb8', mid: '#f2a6a8', shade: '#8070c2' },
};

// ───────── 공통 도구 ─────────

const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** 두 색을 섞어 '#rrggbb' 로 돌려준다(tone·ball 에 다시 넣을 수 있게). */
function mixHex(a, b, t) {
  const x = parseInt(a.slice(1), 16);
  const y = parseInt(b.slice(1), 16);
  const k = clamp(t);
  let s = '#';
  for (const sh of [16, 8, 0]) {
    const v = Math.round(((x >> sh) & 255) * (1 - k) + ((y >> sh) & 255) * k);
    s += v.toString(16).padStart(2, '0');
  }
  return s;
}

function vgrad(ctx, y0, y1, stops) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  for (const [k, c] of stops) g.addColorStop(k, c);
  return g;
}

function hgrad(ctx, x0, x1, stops) {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  for (const [k, c] of stops) g.addColorStop(k, c);
  return g;
}

/** 하늘: 0 ~ y1 세로 그러데이션으로 화면 전체를 덮는다(아래는 마지막 색). */
function sky(ctx, e, stops, y1 = e.hz) {
  ctx.fillStyle = vgrad(ctx, 0, y1, stops);
  ctx.fillRect(0, 0, e.w, e.h);
}

/** 시드 고정 물결 높이 함수. */
function waves(rng, w, amp, n = 3) {
  const ps = [];
  for (let i = 0; i < n; i++) ps.push([((0.9 + i * 1.6 + rng() * 0.8) * TAU) / w, rng() * TAU, amp / (1 + i * 0.8)]);
  return (x) => {
    let s = 0;
    for (const [f, p, a] of ps) s += Math.sin(x * f + p) * a;
    return s;
  };
}

/** 위 가장자리가 yf(x) 인 땅 덩어리. rim 이 있으면 능선을 따라 밝은 빛 띠를 넣는다. */
function land(ctx, e, yf, stops, { bottom = e.h, depth = 0, rim = null } = {}) {
  const { w } = e;
  let top = Infinity;
  ctx.beginPath();
  ctx.moveTo(-6, bottom);
  for (let x = -6; x <= w + 6; x += 3) {
    const y = yf(x);
    if (y < top) top = y;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w + 6, yf(w + 6));
  ctx.lineTo(w + 6, bottom);
  ctx.closePath();
  ctx.fillStyle = vgrad(ctx, top, depth ? top + depth : bottom, stops);
  ctx.fill();
  if (rim) {
    ctx.save();
    ctx.clip();
    ctx.beginPath();
    for (let x = -6; x <= w + 6; x += 3) ctx.lineTo(x, yf(x));
    ctx.strokeStyle = rim[0];
    ctx.lineWidth = rim[1];
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();
  }
}

// ───────── 구름 ─────────

/**
 * 뭉게구름 원 목록. 바닥 가운데가 (0,0), 너비 cw, 높이 ch.
 * a = 그늘진 몸통 전체, b = 볕 받는 윗층(왼쪽 위로 비켜 작게), c = 봉우리의 하이라이트.
 */
function cloudShape(rng, cw, ch) {
  const base = [];
  const body = [];
  const crown = [];
  // 납작한 바닥
  const br = ch * 0.13;
  for (let x = -cw * 0.42; x <= cw * 0.42; x += br * 1.2) base.push([x + (rng() - 0.5) * br * 0.4, -br * (1 + rng() * 0.3), br * (0.9 + rng() * 0.35)]);
  // 몸통: 가운데가 솟는다
  const n = Math.max(3, Math.round(cw / (ch * 0.4)));
  for (let i = 0; i < n; i++) {
    const kx = (i + 0.5) / n;
    const hump = Math.sin(kx * Math.PI) ** 0.6;
    const r = ch * (0.17 + 0.2 * hump) * (0.8 + rng() * 0.4);
    const x = -cw / 2 + cw * kx + (rng() - 0.5) * r * 0.5;
    body.push([x, -ch * 0.08 - r * (0.85 + 0.25 * hump), r]);
  }
  // 봉우리
  const m = Math.max(2, Math.round(n * 0.55));
  for (let i = 0; i < m; i++) {
    const kx = 0.22 + 0.56 * (i / (m - 1)) + (rng() - 0.5) * 0.08;
    const hump = Math.sin(kx * Math.PI);
    const r = ch * (0.18 + 0.12 * hump) * (0.85 + rng() * 0.3);
    crown.push([-cw / 2 + cw * kx, -ch * (0.42 + 0.58 * hump * (0.75 + rng() * 0.25)) + r, r]);
  }
  const top = [...body, ...crown];
  return {
    a: [...base, ...top],
    b: top.map(([x, y, r]) => [x - r * 0.14, y - r * 0.22, r * 0.76]),
    c: crown.map(([x, y, r]) => [x - r * 0.3, y - r * 0.34, r * 0.4]),
  };
}

/** 얇게 퍼진 구름: 납작한 타원 몇 개. */
function wispShape(rng, cw, ch) {
  const list = [];
  const n = 5 + ((rng() * 3) | 0);
  for (let i = 0; i < n; i++) {
    const kx = (i + 0.5) / n;
    const hump = Math.sin(kx * Math.PI);
    list.push([-cw / 2 + cw * kx + (rng() - 0.5) * cw * 0.08, -ch * (0.3 + 0.4 * hump * rng()), cw * (0.13 + 0.1 * rng()), ch * (0.3 + 0.5 * hump)]);
  }
  return { list, ch };
}

function drawCloud(ctx, c, x, y, tint, alpha = 1) {
  ctx.save();
  ctx.translate(x, y);
  cumulus(ctx, c.a, { base: tint.mid, shadeColor: tint.shade, alpha });
  cumulus(ctx, c.b, { base: tint.lit, shadeColor: tint.mid, alpha });
  if (c.c.length) cumulus(ctx, c.c, { base: tone(tint.lit, 0.45), shadeColor: tint.lit, alpha: alpha * 0.6 });
  ctx.restore();
}

function drawWisp(ctx, s, x, y, top, bottom, alpha) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = vgrad(ctx, -s.ch, s.ch * 0.3, [[0, top], [1, bottom]]);
  ctx.beginPath();
  for (const [ex, ey, rx, ry] of s.list) {
    ctx.moveTo(ex + rx, ey);
    ctx.ellipse(ex, ey, rx, ry, 0, 0, TAU);
  }
  ctx.fill();
  ctx.restore();
}

const bigCloud = (ctx, rng, x, y, cw, ch, tint, alpha = 1) => drawCloud(ctx, cloudShape(rng, cw, ch), x, y, tint, alpha);

/** 수평선에 낮게 깔린 구름 띠. */
function horizonBank(ctx, rng, e, tint, y = e.hz + 3, scale = 1) {
  const { w, k } = e;
  for (let x = -w * 0.12; x < w * 1.12; ) {
    const cw = w * (0.26 + rng() * 0.22);
    const ch = (24 + rng() * 30) * k * scale;
    drawCloud(ctx, cloudShape(rng, cw, ch), x + cw / 2, y, tint);
    x += cw * (0.62 + rng() * 0.3);
  }
}

/** 흘러가는 구름 준비: [y(놀이 영역 비율), 너비(w 비율), 높이, 속도]. */
function drifters(rng, e, specs) {
  return specs.map(([yf, cwf, ch, sp]) => {
    const cw = e.w * cwf;
    return { shape: cloudShape(rng, cw, ch * e.k), y: HUD + e.pf * yf, cw, sp, off: rng() * (e.w + cw * 1.2) };
  });
}

function drawDrifters(ctx, e, t, tint, alpha = 1) {
  for (const c of e.drift || []) {
    const span = e.w + c.cw * 1.2;
    const x = ((t * c.sp + c.off) % span) - c.cw * 0.6;
    drawCloud(ctx, c.shape, x, c.y, tint, alpha);
  }
}

// ───────── 나무·풀·꽃 ─────────

const TREE_PUFFS = [
  [0.42, -1.55, 0.55],
  [-0.45, -1.45, 0.55],
  [0.05, -1.95, 0.6],
  [0.55, -1.1, 0.5],
  [-0.55, -1.05, 0.5],
  [0, -1.3, 0.62],
  [-0.22, -1.78, 0.45],
];

/** 둥글고 풍성한 활엽수. (x, y) = 밑동, s = 잎 덩어리 크기(전체 높이 ≈ 2.5s). */
function bushTree(ctx, x, y, s, leaf = P.leaf, shadow = true) {
  if (shadow) groundShadow(ctx, x + s * 0.25, y, s * 1.1, s * 0.25, 0.2);
  ctx.fillStyle = hgrad(ctx, x - s * 0.15, x + s * 0.15, [[0, tone(P.woodDark, 0.1)], [1, tone(P.woodDark, -0.25)]]);
  poly(ctx, [[x - s * 0.15, y], [x - s * 0.09, y - s * 1.0], [x + s * 0.09, y - s * 1.0], [x + s * 0.17, y]]);
  ctx.fill();
  for (const [dx, dy, r] of TREE_PUFFS) ball(ctx, x + dx * s, y + dy * s, r * s, leaf, { lw: 0, light: 0.3, dark: 0.3 });
}

/** 먼 나무(줄기 없이 잎 덩어리 셋). */
function farTree(ctx, x, y, s, col) {
  ball(ctx, x - s * 0.55, y - s * 0.75, s * 0.72, col, { lw: 0, light: 0.18, dark: 0.16 });
  ball(ctx, x + s * 0.55, y - s * 0.8, s * 0.7, col, { lw: 0, light: 0.18, dark: 0.16 });
  ball(ctx, x, y - s * 1.25, s * 0.82, col, { lw: 0, light: 0.18, dark: 0.16 });
}

/** 뾰족한 전나무. (x, y) = 밑동, ht = 높이. */
function pine(ctx, x, y, ht, base, flat = false) {
  const wd = ht * 0.32;
  if (!flat) {
    ctx.fillStyle = tone(P.woodDark, -0.1);
    ctx.fillRect(x - ht * 0.03, y - ht * 0.16, ht * 0.06, ht * 0.17);
  }
  ctx.fillStyle = flat ? base : hgrad(ctx, x - wd, x + wd, [[0, tone(base, 0.22)], [0.42, base], [1, tone(base, -0.32)]]);
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const t0 = y - ht * 0.1 - i * ht * 0.19;
    const hw = wd * (1 - i * 0.2);
    const tip = t0 - ht * 0.36;
    ctx.moveTo(x - hw, t0);
    ctx.quadraticCurveTo(x - hw * 0.3, t0 - ht * 0.1, x, tip);
    ctx.quadraticCurveTo(x + hw * 0.3, t0 - ht * 0.1, x + hw, t0);
    ctx.quadraticCurveTo(x, t0 + ht * 0.05, x - hw, t0);
  }
  ctx.fill();
}

/** 작은 풀 포기. */
function tuft(ctx, x, y, s, col) {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x - 2.8 * s, y);
  ctx.quadraticCurveTo(x - 2.4 * s, y - 4 * s, x - 4 * s, y - 8 * s);
  ctx.quadraticCurveTo(x - 0.8 * s, y - 5 * s, x + 0.2 * s, y - 11 * s);
  ctx.quadraticCurveTo(x + 1.2 * s, y - 5 * s, x + 3.8 * s, y - 7.5 * s);
  ctx.quadraticCurveTo(x + 2.2 * s, y - 3.5 * s, x + 2.8 * s, y);
  ctx.closePath();
  ctx.fill();
}

/** 작은 꽃(꽃잎 다섯 장). */
function flower(ctx, x, y, r, col) {
  ctx.fillStyle = col;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = (i * TAU) / 5 - 0.4;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r * 0.85;
    ctx.moveTo(px + r * 0.7, py);
    ctx.arc(px, py, r * 0.7, 0, TAU);
  }
  ctx.fill();
  ctx.fillStyle = col === P.yellow ? P.orange : P.yellow;
  circle(ctx, x, y, r * 0.5);
  ctx.fill();
}

/** 풀 포기와 꽃을 흩뿌린다. 아래로 갈수록 크게(가까움). */
function meadow(ctx, rng, e, x0, x1, y0, y1, n, grass, flowers = [], fRate = 0.45) {
  for (let i = 0; i < n; i++) {
    const v = rng();
    const x = x0 + (x1 - x0) * rng();
    const y = y0 + (y1 - y0) * v;
    const s = e.k * (0.5 + 0.7 * v);
    if (flowers.length && rng() < fRate) flower(ctx, x, y - 2 * s, 1.8 * s, flowers[(rng() * flowers.length) | 0]);
    else tuft(ctx, x, y, s, grass);
  }
}

/** 사람이 걷는 흙길(groundY 를 따라). */
function dirtPath(ctx, rng, e, col) {
  const { w, G, k } = e;
  const wv = waves(rng, w, 2.5 * k, 2);
  ctx.beginPath();
  for (let x = -6; x <= w + 6; x += 4) ctx.lineTo(x, G - 6 * k + wv(x));
  for (let x = w + 6; x >= -6; x -= 4) ctx.lineTo(x, G + 12 * k + wv(x) * 0.6);
  ctx.closePath();
  ctx.fillStyle = vgrad(ctx, G - 8 * k, G + 12 * k, [[0, tone(col, 0.18)], [1, col]]);
  ctx.fill();
  for (let i = 0; i < 16; i++) {
    const x = rng() * w;
    const y = G - 2 * k + rng() * 11 * k;
    ellipse(ctx, x, y, (1.2 + rng() * 1.6) * k, (0.8 + rng()) * k);
    ctx.fillStyle = withAlpha(tone(col, rng() < 0.5 ? -0.25 : 0.3), 0.6);
    ctx.fill();
  }
}

// ───────── 건물 ─────────

/** 창문: 흰 창틀 + 하늘이 비친 유리. */
function houseWindow(ctx, x, y, ww, wh, s, glass = ['#bfe6ff', '#6f9edc']) {
  ctx.fillStyle = '#fffaf0';
  ctx.fillRect(x - 1.3 * s, y - 1.3 * s, ww + 2.6 * s, wh + 2.6 * s);
  ctx.fillStyle = vgrad(ctx, y, y + wh, [[0, glass[0]], [1, glass[1]]]);
  ctx.fillRect(x, y, ww, wh);
  ctx.fillStyle = 'rgba(255,255,255,0.42)';
  poly(ctx, [[x, y + wh * 0.45], [x + ww * 0.45, y], [x + ww * 0.7, y], [x, y + wh * 0.8]]);
  ctx.fill();
  ctx.fillStyle = '#fffaf0';
  ctx.fillRect(x + ww / 2 - 0.5 * s, y, 1 * s, wh);
  ctx.fillRect(x, y + wh * 0.45, ww, 0.9 * s);
}

/** 박공지붕 집(3/4 시점). x = 앞면 왼쪽, y = 바닥. */
function house(ctx, x, y, s, o) {
  const fw = o.fw * s;
  const wh = o.wh * s;
  const rh = o.rh * s;
  const sw = o.sw * s;
  const d = sw * 0.16;
  const ov = 3.5 * s;
  const ax = x + fw / 2;
  const ay = y - wh - rh;
  groundShadow(ctx, x + (fw + sw) * 0.55, y + 1, (fw + sw) * 0.62, 5 * s, 0.24);
  // 옆벽(그늘)
  poly(ctx, [[x + fw, y], [x + fw + sw, y - d], [x + fw + sw, y - d - wh], [x + fw, y - wh]]);
  ctx.fillStyle = hgrad(ctx, x + fw, x + fw + sw, [[0, tone(o.wall, -0.2)], [1, tone(o.wall, -0.3)]]);
  ctx.fill();
  const winW = 7 * s;
  const winH = 8.5 * s;
  const floors = o.floors || 1;
  for (let f = 0; f < floors; f++) {
    const wy = y - wh + (wh / floors) * f + (wh / floors) * 0.28;
    for (let i = 0; i < 2; i++) {
      const wx = x + fw + sw * (0.18 + i * 0.46);
      houseWindow(ctx, wx, wy - d * (0.2 + i * 0.46), winW * 0.85, winH, s, ['#9cc8f0', '#5a82c4']);
    }
  }
  // 지붕(옆 비탈)
  poly(ctx, [[ax, ay], [ax + sw, ay - d], [x + fw + sw + ov, y - wh - d + ov * 0.8], [x + fw + ov, y - wh + ov * 0.8]]);
  shade(ctx, o.roof, ax, ay, x + fw + sw, y - wh, { lw: 0, light: 0.28, dark: 0.18 });
  // 기와 줄
  ctx.strokeStyle = withAlpha(tone(o.roof, -0.35), 0.35);
  ctx.lineWidth = 1 * s;
  for (let i = 1; i < 4; i++) {
    const t = i / 4;
    ctx.beginPath();
    ctx.moveTo(ax + (fw / 2 + ov) * t, ay + (rh + ov * 0.8) * t);
    ctx.lineTo(ax + sw + (fw / 2 + ov) * t, ay - d + (rh + ov * 0.8) * t);
    ctx.stroke();
  }
  // 굴뚝
  if (o.chimney) {
    const cx = ax + sw * 0.62 + (fw / 2) * 0.3;
    const cb = ay - d * 0.62 + rh * 0.3;
    const ct = ay - d * 0.62 - 7 * s;
    ctx.fillStyle = hgrad(ctx, cx - 3.5 * s, cx + 3.5 * s, [[0, '#e08a6c'], [1, '#9a5246']]);
    ctx.fillRect(cx - 3.5 * s, ct, 7 * s, cb - ct);
    ctx.fillStyle = '#8a4a40';
    ctx.fillRect(cx - 4.5 * s, ct - 2 * s, 9 * s, 2.5 * s);
  }
  // 앞면
  poly(ctx, [[x, y], [x, y - wh], [ax, ay], [x + fw, y - wh], [x + fw, y]]);
  shade(ctx, o.wall, x, ay, x + fw, y, { lw: 0, light: 0.2, dark: 0.1 });
  // 박공 테두리
  ctx.strokeStyle = tone(o.roof, -0.12);
  ctx.lineWidth = 3.4 * s;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x - ov, y - wh + ov * 0.8);
  ctx.lineTo(ax, ay - 1.2 * s);
  ctx.lineTo(x + fw + ov * 0.6, y - wh + ov * 0.6);
  ctx.stroke();
  // 다락 둥근 창
  circle(ctx, ax, ay + rh * 0.55, 3.2 * s);
  ctx.fillStyle = '#fffaf0';
  ctx.fill();
  circle(ctx, ax, ay + rh * 0.55, 2.2 * s);
  ctx.fillStyle = '#7fa8dc';
  ctx.fill();
  // 앞면 창과 문
  for (let f = 0; f < floors; f++) {
    const top = y - wh + (wh / floors) * f;
    const fh = wh / floors;
    if (f === floors - 1) {
      // 1층: 문 + 창
      const dw = 9 * s;
      const dh = Math.min(15 * s, fh * 0.72);
      const dx = x + fw * 0.62 - dw / 2;
      rrect(ctx, dx, y - dh, dw, dh, 3 * s);
      ctx.fillStyle = vgrad(ctx, y - dh, y, [[0, tone(o.door || P.wood, 0.15)], [1, tone(o.door || P.wood, -0.2)]]);
      ctx.fill();
      circle(ctx, dx + dw * 0.78, y - dh * 0.45, 0.9 * s);
      ctx.fillStyle = P.yellow;
      ctx.fill();
      houseWindow(ctx, x + fw * 0.14, top + fh * 0.3, winW, winH, s);
    } else {
      houseWindow(ctx, x + fw * 0.16, top + fh * 0.3, winW, winH, s);
      houseWindow(ctx, x + fw * 0.84 - winW, top + fh * 0.3, winW, winH, s);
    }
  }
}

/** 먼 마을의 작은 집. */
function tinyHouse(ctx, x, y, s, wall, roof) {
  const bw = 12 * s;
  const bh = 9 * s;
  ctx.fillStyle = wall;
  ctx.fillRect(x - bw / 2, y - bh, bw, bh);
  ctx.fillStyle = withAlpha('#1b1d4a', 0.12);
  ctx.fillRect(x + bw * 0.05, y - bh, bw * 0.45, bh);
  ctx.fillStyle = roof;
  poly(ctx, [[x - bw / 2 - 1.5 * s, y - bh + 0.5 * s], [x - bw * 0.1, y - bh - 7 * s], [x + bw * 0.25, y - bh - 7 * s], [x + bw / 2 + 1.5 * s, y - bh + 0.5 * s]]);
  ctx.fill();
  ctx.fillStyle = withAlpha('#5a7ab8', 0.55);
  ctx.fillRect(x - bw * 0.3, y - bh * 0.6, 2 * s, 2.4 * s);
  ctx.fillRect(x + bw * 0.15, y - bh * 0.6, 2 * s, 2.4 * s);
}

// ───────── 무대별 그림 ─────────

const PAINT = {
  // 1. 시골: 바다·등대 절벽·언덕·헛간·풍차·연못
  farm(ctx, e, rng) {
    const { w, G, hz, D, k, pf } = e;
    sky(ctx, e, [[0, '#3567d6'], [0.42, '#5d9bee'], [0.8, '#a6d2fa'], [1, '#dbefff']]);
    glow(ctx, w * 0.05, 0, w * 0.95, '#fff6dc', 0.3);
    bigCloud(ctx, rng, w * 0.1, HUD + pf * 0.13, w * 0.82, 128 * k, TINT.day);
    bigCloud(ctx, rng, w * 1.0, HUD + pf * 0.4, w * 0.58, 86 * k, TINT.day);
    horizonBank(ctx, rng, e, TINT.far);

    // 바다
    const seaB = hz + D * 0.56;
    ctx.fillStyle = vgrad(ctx, hz, seaB, [[0, '#93c6ee'], [0.12, '#5d9de2'], [0.55, '#3b80d2'], [1, '#2f6cc0']]);
    ctx.fillRect(0, hz, w, seaB - hz + 4);
    for (let i = 0; i < 44; i++) {
      const v = rng();
      const y = hz + 2 + v * v * (seaB - hz);
      ctx.fillStyle = withAlpha('#ffffff', 0.15 + rng() * 0.3);
      ctx.fillRect(rng() * w, y, (3 + rng() * 10) * k * (0.5 + v), 0.8 + v);
    }
    // 먼 섬
    ctx.fillStyle = mixHex('#5f9a78', '#b8d6f0', 0.6);
    ctx.beginPath();
    ctx.moveTo(w * 0.5, hz + 1);
    ctx.quadraticCurveTo(w * 0.58, hz - 9 * k, w * 0.66, hz - 3 * k);
    ctx.quadraticCurveTo(w * 0.8, hz - 16 * k, w * 0.95, hz - 6 * k);
    ctx.lineTo(w + 6, hz - 4 * k);
    ctx.lineTo(w + 6, hz + 1);
    ctx.closePath();
    ctx.fill();

    // 등대 절벽
    const cx1 = w * 0.4;
    const ct = hz + D * 0.1;
    const cTop = (x) => ct - 5 * k * Math.sin(Math.PI * clamp(x / cx1)) + Math.max(0, x - cx1 * 0.8) * 0.4;
    ctx.beginPath();
    ctx.moveTo(-6, seaB);
    for (let x = -6; x <= cx1; x += 3) ctx.lineTo(x, cTop(x));
    ctx.lineTo(cx1 + 5 * k, cTop(cx1) + D * 0.1);
    ctx.lineTo(cx1 + 2 * k, cTop(cx1) + D * 0.17);
    ctx.lineTo(cx1 + 12 * k, seaB);
    ctx.closePath();
    ctx.fillStyle = hgrad(ctx, 0, cx1 + 12 * k, [[0, '#d39a6a'], [0.65, '#b67a52'], [1, '#8a5a4c']]);
    ctx.fill();
    ctx.fillStyle = withAlpha('#7a4a3e', 0.22);
    for (let i = 0; i < 9; i++) {
      const x = rng() * cx1;
      ctx.fillRect(x, cTop(x) + (10 + rng() * D * 0.12) * 1, 2 * k, (6 + rng() * 10) * k);
    }
    ctx.beginPath();
    for (let x = -6; x <= cx1; x += 3) ctx.lineTo(x, cTop(x) - 1);
    for (let x = cx1; x >= -6; x -= 3) ctx.lineTo(x, cTop(x) + (7 + 3 * Math.sin(x * 0.19) + 2 * Math.sin(x * 0.07)) * k);
    ctx.closePath();
    ctx.fillStyle = vgrad(ctx, ct - 6 * k, ct + 10 * k, [[0, '#aee266'], [1, '#62ad46']]);
    ctx.fill();
    for (const [fx, r] of [[0.04, 9], [0.31, 7], [0.36, 5.5]]) {
      const bx = w * fx;
      ball(ctx, bx, cTop(bx) - r * 0.4 * k, r * k, '#5fae48', { lw: 0, light: 0.3, dark: 0.3 });
    }
    lighthouse(ctx, w * 0.17, cTop(w * 0.17) + 3 * k, k);
    // 등대지기 집
    const hx = w * 0.25;
    const hy = cTop(hx) + 3 * k;
    ctx.fillStyle = hgrad(ctx, hx, hx + 16 * k, [[0, '#fff8ea'], [1, '#d8cfe0']]);
    ctx.fillRect(hx, hy - 9 * k, 16 * k, 9 * k);
    poly(ctx, [[hx - 2 * k, hy - 8.5 * k], [hx + 8 * k, hy - 15 * k], [hx + 18 * k, hy - 8.5 * k]]);
    shade(ctx, P.red, hx, hy - 15 * k, hx + 16 * k, hy - 8 * k, { lw: 0 });
    e.boat = { x: w * 0.57, y: hz + D * 0.16, span: w * 0.05 };

    // 먼 뭍(오른쪽)
    const wv1 = waves(rng, w, 3 * k);
    const yFar = (x) => hz + D * (0.47 - 0.36 * smooth(w * 0.46, w * 0.98, x)) + wv1(x);
    land(ctx, e, yFar, [[0, mixHex('#8ccb5e', '#bfe0f5', 0.32)], [1, mixHex('#6db24c', '#bfe0f5', 0.2)]], { depth: D * 0.4 });
    const farLeaf = mixHex(P.leaf, '#b9d8f0', 0.42);
    for (let x = w * 0.55; x < w + 10; x += (8 + rng() * 9) * k) {
      farTree(ctx, x, yFar(x) + (4 + rng() * 7) * k, (4 + rng() * 3) * k, farLeaf);
    }

    // 가운데 언덕
    const wv2 = waves(rng, w, 7 * k);
    const yMid = (x) => hz + D * 0.63 + wv2(x) - D * 0.1 * (1 - smooth(0, w * 0.45, x));
    // 언덕 뒤 나무들
    for (const [fx, s] of [[0.02, 17], [0.11, 15], [0.66, 10], [0.99, 15]]) bushTree(ctx, w * fx, yMid(w * fx) + 7 * k, s * k, mixHex(P.leaf, '#b9d8f0', 0.15), false);
    // 풍차 탑(날개는 live)
    const mx = w * 0.84;
    const my = yMid(mx) + 5 * k;
    land(ctx, e, yMid, [[0, '#c4e264'], [1, '#90c84a']], { depth: D * 0.4, rim: [withAlpha('#f0fbb0', 0.55), 4 * k] });
    e.mill = windmill(ctx, mx, my, k);
    // 헛간
    barn(ctx, w * 0.42, yMid(w * 0.52) + 9 * k, k);
    for (const [fx, s] of [[0.2, 16], [0.3, 12]]) bushTree(ctx, w * fx, yMid(w * fx) + 12 * k, s * k, P.leaf);

    // 앞 들판
    const wv3 = waves(rng, w, 4 * k);
    const yNear = (x) => G - D * 0.31 + wv3(x);
    land(ctx, e, yNear, [[0, '#a6dc5c'], [0.35, '#8fcf4e'], [1, '#6fb444']], { depth: G - yNear(0) + 70, rim: [withAlpha('#e6f8a0', 0.5), 3 * k] });
    meadow(ctx, rng, e, 0, w, yNear(0) + 6 * k, G - 8 * k, 26, withAlpha('#5ea43e', 0.7), [P.white, P.yellow, P.pink], 0.35);
    // 연못과 나무 선창
    pond(ctx, w * 0.24, G - D * 0.15, 56 * k, 12.5 * k, k);
    // 울타리와 건초
    fence(ctx, w * 0.47, w + 4, (x) => yNear(x) + 11 * k, k);
    hayBale(ctx, w * 0.6, G - D * 0.12, 7.5 * k);
    hayBale(ctx, w * 0.86, G - D * 0.06, 9.5 * k);

    // 발밑 길과 풀
    dirtPath(ctx, rng, e, '#dcc48a');
    meadow(ctx, rng, e, 0, w, G + 14 * k, G + 54 * k, 30, '#4f9a3a', [P.white, P.yellow, P.purple, P.pink], 0.4);
  },

  // 2. 마을: 오후 햇살, 크림색 집과 주황·갈색·파란 지붕, 거리
  suburb(ctx, e, rng) {
    const { w, G, hz, D, k, pf } = e;
    sky(ctx, e, [[0, '#3d72d6'], [0.42, '#6fa8ee'], [0.8, '#c2ddf6'], [1, '#fbe8cc']]);
    glow(ctx, w * 0.05, 0, w, '#ffe8b4', 0.36);
    bigCloud(ctx, rng, w * 0.9, HUD + pf * 0.15, w * 0.78, 116 * k, TINT.warm);
    bigCloud(ctx, rng, w * 0.06, HUD + pf * 0.42, w * 0.42, 60 * k, TINT.warm);
    horizonBank(ctx, rng, e, TINT.far);

    // 먼 언덕 마을
    const haze = '#cfe4f6';
    const wv1 = waves(rng, w, 6 * k);
    const yFar = (x) => hz + D * 0.1 + wv1(x) - D * 0.07 * Math.sin((x / w) * Math.PI);
    land(ctx, e, yFar, [[0, mixHex('#8cc864', haze, 0.5)], [1, mixHex('#6fb04e', haze, 0.38)]], { depth: D * 0.35 });
    const roofs = [P.roofOrange, P.roof, P.red, P.roofBlue];
    for (let x = w * 0.06; x < w * 0.96; x += (11 + rng() * 9) * k) {
      const y = yFar(x) + (5 + rng() * 9) * k;
      if (rng() < 0.3) farTree(ctx, x, y, (4 + rng() * 2) * k, mixHex(P.leaf, haze, 0.5));
      else tinyHouse(ctx, x, y, (0.5 + rng() * 0.3) * k, mixHex(rng() < 0.5 ? P.wall : '#ffe2c8', haze, 0.4), mixHex(roofs[(rng() * 4) | 0], haze, 0.45));
    }
    // 교회 탑
    const chx = w * 0.6;
    const chy = yFar(chx) + 6 * k;
    ctx.fillStyle = mixHex('#f4e6d0', haze, 0.4);
    ctx.fillRect(chx - 4 * k, chy - 30 * k, 8 * k, 30 * k);
    ctx.fillStyle = mixHex(P.roofBlue, haze, 0.45);
    poly(ctx, [[chx - 5.5 * k, chy - 30 * k], [chx, chy - 44 * k], [chx + 5.5 * k, chy - 30 * k]]);
    ctx.fill();
    ctx.fillStyle = mixHex('#5a7ab8', haze, 0.4);
    ctx.fillRect(chx - 1.5 * k, chy - 25 * k, 3 * k, 4 * k);

    // 가운데 언덕과 뒷줄 집
    const wv2 = waves(rng, w, 5 * k);
    const yMid = (x) => hz + D * 0.36 + wv2(x);
    land(ctx, e, yMid, [[0, '#b2dc64'], [1, '#88c44e']], { depth: D * 0.45, rim: [withAlpha('#f0fbb0', 0.5), 3 * k] });
    const backWalls = ['#fff1dc', '#ffe0cc', '#eef0fb', '#fff6e4'];
    let bx = -w * 0.04;
    let bi = 0;
    while (bx < w) {
      const s = (0.5 + rng() * 0.12) * k;
      if (rng() < 0.3) {
        bushTree(ctx, bx + 10 * s, yMid(bx) + 10 * k, 13 * s, mixHex(P.leaf, haze, 0.18), false);
        bx += 26 * s;
        continue;
      }
      const o = { fw: 40 + rng() * 10, wh: 30 + rng() * 10, rh: 20 + rng() * 6, sw: 20 + rng() * 8, wall: mixHex(backWalls[bi % 4], haze, 0.12), roof: mixHex(roofs[(bi + 1) % 4], haze, 0.15), chimney: rng() < 0.5 };
      house(ctx, bx, yMid(bx) + 12 * k, s, o);
      bx += (o.fw + o.sw + 6 + rng() * 10) * s;
      bi++;
    }

    // 앞줄 마당과 집
    const yb = G - D * 0.17;
    const wv3 = waves(rng, w, 2 * k);
    land(ctx, e, (x) => yb - D * 0.12 + wv3(x), [[0, '#a8dc5e'], [1, '#86c44c']], { depth: D * 0.2 });
    bushTree(ctx, w * 0.3, yb + 2 * k, 17 * k, P.leaf);
    bushTree(ctx, w * 0.68, yb + 3 * k, 15 * k, mixHex(P.leaf, '#5cbf5a', 0.4));
    house(ctx, w * 0.01, yb, k, { fw: 48, wh: 44, rh: 28, sw: 26, wall: P.wall, roof: P.roofOrange, chimney: true, floors: 2, door: '#5f8fd0' });
    house(ctx, w * 0.39, yb + 2 * k, k, { fw: 54, wh: 46, rh: 30, sw: 30, wall: '#ffe2cc', roof: P.roof, chimney: true, floors: 2, door: P.red });
    house(ctx, w * 0.75, yb, k, { fw: 46, wh: 38, rh: 26, sw: 24, wall: '#eaf0fc', roof: P.roofBlue, chimney: false, floors: 1, door: P.wood });
    // 산울타리
    for (let x = -4; x < w + 10; x += 13 * k) {
      ball(ctx, x, G - 11 * k + Math.sin(x * 0.7) * 1.5 * k, (8 + Math.sin(x * 1.3) * 1.5) * k, '#58a845', { lw: 0, light: 0.32, dark: 0.32 });
    }
    // 하얀 울타리
    ctx.fillStyle = '#fffaf0';
    ctx.fillRect(0, G - 13 * k, w, 2 * k);
    ctx.fillRect(0, G - 7.5 * k, w, 2 * k);
    for (let x = 4 * k; x < w; x += 9 * k) {
      poly(ctx, [[x - 1.6 * k, G - 4 * k], [x - 1.6 * k, G - 15 * k], [x, G - 17.5 * k], [x + 1.6 * k, G - 15 * k], [x + 1.6 * k, G - 4 * k]]);
      ctx.fillStyle = hgrad(ctx, x - 1.6 * k, x + 1.6 * k, [[0, '#ffffff'], [1, '#d6d2ea']]);
      ctx.fill();
    }

    // 인도와 찻길
    const sw0 = G - 5 * k;
    ctx.fillStyle = vgrad(ctx, sw0, G + 12 * k, [[0, '#f6ebda'], [1, '#e2d2c4']]);
    ctx.fillRect(0, sw0, w, G + 12 * k - sw0);
    ctx.fillStyle = withAlpha('#b8a8c0', 0.45);
    for (let x = 0; x < w; x += 24 * k) ctx.fillRect(x, sw0, 1, G + 12 * k - sw0);
    ctx.fillStyle = vgrad(ctx, G + 12 * k, G + 16 * k, [[0, '#ece4f2'], [1, '#b8b0cc']]);
    ctx.fillRect(0, G + 12 * k, w, 4 * k);
    ctx.fillStyle = vgrad(ctx, G + 16 * k, G + 70, [[0, '#8890b6'], [1, '#6c74a0']]);
    ctx.fillRect(0, G + 16 * k, w, e.h - G);
    const dashY = G + 16 * k + (e.band - 16 * k) * 0.5;
    ctx.fillStyle = withAlpha('#fff4d6', 0.85);
    for (let x = 8; x < w; x += 44 * k) {
      rrect(ctx, x, dashY, 22 * k, 3 * k, 1.5 * k);
      ctx.fill();
    }
    // 가로등
    for (const fx of [0.33, 0.93]) streetLamp(ctx, w * fx, G - 2 * k, k, false);
    e.birds = 2;
  },

  // 3. 캠프: 늦은 오후 황금빛, 호수·산·전나무·텐트·모닥불
  camp(ctx, e, rng) {
    const { w, G, hz, D, k, pf } = e;
    sky(ctx, e, [[0, '#4a68cc'], [0.34, '#7f8ede'], [0.62, '#d6a6c6'], [0.85, '#ffc996'], [1, '#ffe4a8']]);
    const sx = w * 0.7;
    const sy = hz - D * 0.42;
    glow(ctx, sx, sy, w * 0.9, '#ffd28a', 0.45);
    glow(ctx, sx, sy, 70 * k, '#fff0c0', 0.75);
    circle(ctx, sx, sy, 20 * k);
    ctx.fillStyle = vgrad(ctx, sy - 20 * k, sy + 20 * k, [[0, '#fffbe6'], [1, '#ffe39a']]);
    ctx.fill();
    bigCloud(ctx, rng, w * 0.12, HUD + pf * 0.12, w * 0.74, 104 * k, TINT.gold);
    bigCloud(ctx, rng, w * 0.98, HUD + pf * 0.33, w * 0.46, 62 * k, TINT.gold);
    for (const [fx, fy, cw] of [[0.3, 0.6, 0.5], [0.85, 0.7, 0.4]]) {
      drawWisp(ctx, wispShape(rng, w * cw, 9 * k), w * fx, HUD + pf * fy, '#ffe6d2', '#e0a6b8', 0.7);
    }

    // 먼 산(눈 덮인 봉우리)
    const kv = e.kv;
    const farCol = '#a9a4dc';
    for (const [fx, ht, wd] of [[0.04, 98, 0.32], [0.34, 120, 0.38], [0.8, 108, 0.36]]) mountain(ctx, w * fx, hz + 2, ht * kv, w * wd, farCol, ['#fff6f0', '#cdc4ea']);
    // 가까운 산
    const midCol = '#6f8cc4';
    for (const [fx, ht, wd] of [[0.18, 66, 0.28], [0.6, 58, 0.3], [1.02, 76, 0.3]]) mountain(ctx, w * fx, hz + 3, ht * kv, w * wd, midCol, ['#fff2ea', '#b8b4e0'], 0.18);
    // 호수
    const lakeB = hz + D * 0.48;
    ctx.fillStyle = vgrad(ctx, hz, lakeB, [[0, '#f6d3ae'], [0.25, '#c8b4d6'], [0.62, '#7f9ed8'], [1, '#5c86cc']]);
    ctx.fillRect(0, hz, w, lakeB - hz + 6);
    // 숲 그림자 반영
    ctx.fillStyle = vgrad(ctx, hz, hz + 18 * k, [[0, withAlpha('#2c5a5a', 0.55)], [1, withAlpha('#2c5a5a', 0)]]);
    ctx.fillRect(0, hz, w, 18 * k);
    // 햇빛 물길
    for (let i = 0; i < 16; i++) {
      const v = i / 16;
      const y = hz + 6 * k + v * (lakeB - hz - 8 * k);
      const lw = (6 + v * 34) * k * (0.6 + rng() * 0.6);
      ctx.fillStyle = withAlpha('#fff4cc', 0.55 * (1 - v * 0.6));
      rrect(ctx, sx - lw / 2 + (rng() - 0.5) * 10 * k, y, lw, (1 + v * 1.5) * k, 1 * k);
      ctx.fill();
    }
    e.glints = Array.from({ length: 10 }, () => ({ x: sx + (rng() - 0.5) * w * 0.4, y: hz + 8 * k + rng() * (lakeB - hz - 14 * k), ph: rng() * TAU, sp: 1.5 + rng() * 2.5 }));
    // 건너편 숲
    const forest = '#3f6f6a';
    for (let x = -4; x < w + 6; x += (5 + rng() * 4) * k) pine(ctx, x, hz + 4 * k, (12 + rng() * 14) * k, mixHex(forest, '#c8b4d6', 0.25), true);
    for (let x = 0; x < w + 6; x += (7 + rng() * 6) * k) pine(ctx, x, hz + 6 * k, (8 + rng() * 9) * k, forest, true);

    // 물가
    const wv = waves(rng, w, 4 * k);
    const yShore = (x) => lakeB + wv(x) - D * 0.1 * (1 - Math.sin((x / w) * Math.PI));
    land(ctx, e, yShore, [[0, '#f2d8a0'], [1, '#e0c088']], { depth: 10 * k });
    const yGrass = (x) => yShore(x) + 5 * k + wv(x * 1.7) * 0.4;
    land(ctx, e, yGrass, [[0, '#b6d660'], [0.4, '#98c650'], [1, '#76ae44']], { depth: G - yGrass(w / 2) + 60, rim: [withAlpha('#fff0a8', 0.5), 3 * k] });
    // 카누
    const cnx = w * 0.46;
    const cny = yShore(cnx) + 3 * k;
    ctx.beginPath();
    ctx.moveTo(cnx - 22 * k, cny - 5 * k);
    ctx.quadraticCurveTo(cnx, cny + 6 * k, cnx + 22 * k, cny - 5 * k);
    ctx.quadraticCurveTo(cnx, cny - 2 * k, cnx - 22 * k, cny - 5 * k);
    ctx.closePath();
    shade(ctx, P.red, cnx - 20 * k, cny - 5 * k, cnx + 20 * k, cny + 5 * k, { lw: 0, light: 0.3, dark: 0.25 });
    // 큰 전나무(양쪽 끝)
    const pineCol = '#2f7a5a';
    pine(ctx, w * 0.12, G - D * 0.3, 96 * k, tone(pineCol, -0.05));
    pine(ctx, w * 0.0, G - D * 0.16, 140 * k, pineCol);
    pine(ctx, w * 0.88, G - D * 0.3, 104 * k, tone(pineCol, -0.05));
    pine(ctx, w * 1.0, G - D * 0.1, 150 * k, pineCol);
    meadow(ctx, rng, e, w * 0.1, w * 0.9, yGrass(w / 2) + 8 * k, G - 6 * k, 20, withAlpha('#5a9a3c', 0.65), [P.yellow, P.white, P.orange], 0.3);
    // 바위
    for (const [fx, fy, r] of [[0.36, 0.2, 7], [0.4, 0.17, 4.5], [0.8, 0.12, 6]]) {
      ellipse(ctx, w * fx, G - D * fy, r * k, r * 0.62 * k);
      shade(ctx, '#b6aed0', w * fx - r * k, G - D * fy - r * k, w * fx + r * k, G - D * fy + r * 0.5 * k, { lw: 0, light: 0.3, dark: 0.25 });
    }
    // 텐트
    tent(ctx, w * 0.25, G - D * 0.08, k * 1.3);
    // 모닥불 자리(불꽃은 live)
    const fx = w * 0.6;
    const fy = G - 6 * k;
    groundShadow(ctx, fx, fy + 2 * k, 22 * k, 5 * k, 0.3);
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * 0.05 + (i / 6) * Math.PI * 0.9;
      const rx = fx + Math.cos(a) * 14 * k;
      const ry = fy + 1 * k + Math.sin(a) * 4 * k;
      ellipse(ctx, rx, ry, 4.2 * k, 3.2 * k);
      shade(ctx, '#a8a0c6', rx - 4 * k, ry - 3 * k, rx + 4 * k, ry + 3 * k, { lw: 0, light: 0.35, dark: 0.25 });
    }
    ctx.lineCap = 'round';
    for (const [x1, y1, x2, y2] of [[-9, 1, 9, -4], [9, 1, -9, -4]]) {
      ctx.strokeStyle = '#7a4a30';
      ctx.lineWidth = 4 * k;
      ctx.beginPath();
      ctx.moveTo(fx + x1 * k, fy + y1 * k);
      ctx.lineTo(fx + x2 * k, fy + y2 * k);
      ctx.stroke();
    }
    e.fire = { x: fx, y: fy - 3 * k };
    // 통나무 의자
    const lx = w * 0.76;
    const ly = G - 4 * k;
    groundShadow(ctx, lx, ly + 2 * k, 20 * k, 4 * k, 0.25);
    rrect(ctx, lx - 17 * k, ly - 9 * k, 34 * k, 9 * k, 4.5 * k);
    shade(ctx, P.wood, lx, ly - 9 * k, lx, ly, { lw: 0, light: 0.3, dark: 0.3 });
    ellipse(ctx, lx - 17 * k, ly - 4.5 * k, 3 * k, 4.5 * k);
    ctx.fillStyle = '#e8c48a';
    ctx.fill();

    // 발밑 땅
    dirtPath(ctx, rng, e, '#d6b884');
    meadow(ctx, rng, e, 0, w, G + 14 * k, G + 54 * k, 26, '#4f8f3a', [P.yellow, P.white, P.orange], 0.3);
  },

  // 4. 도시: 노을 지는 시내, 빌딩·전광판·옥상 경고등
  city(ctx, e, rng) {
    const { w, G, hz, D, k, pf } = e;
    sky(ctx, e, [[0, '#3a4ab0'], [0.34, '#7466c8'], [0.6, '#d88ab4'], [0.82, '#ffa47e'], [1, '#ffd08c']]);
    const sx = w * 0.27;
    const sy = hz - D * 0.1;
    glow(ctx, sx, sy, w * 1.0, '#ffb26a', 0.45);
    glow(ctx, sx, sy, 84 * k, '#ffe4a4', 0.7);
    circle(ctx, sx, sy, 30 * k);
    ctx.fillStyle = vgrad(ctx, sy - 30 * k, sy + 30 * k, [[0, '#fff4c8'], [1, '#ffbe6a']]);
    ctx.fill();
    bigCloud(ctx, rng, w * 0.86, HUD + pf * 0.12, w * 0.72, 92 * k, TINT.sunset);
    bigCloud(ctx, rng, w * 0.08, HUD + pf * 0.34, w * 0.48, 54 * k, TINT.sunset);
    for (const [fx, fy, cw] of [[0.62, 0.58, 0.6], [0.2, 0.68, 0.45]]) {
      drawWisp(ctx, wispShape(rng, w * cw, 9 * k), w * fx, HUD + pf * fy, '#ffd2b8', '#d88aa8', 0.75);
    }
    e.beacons = [];
    const kv = e.kv;

    // 먼 빌딩(노을빛에 묻힌)
    const farBase = hz + D * 0.3;
    const haze = '#f2a8a0';
    let x = -8 * k;
    while (x < w + 8) {
      const bw = (20 + rng() * 26) * k;
      const bh = (40 + rng() * 90) * kv;
      const col = mixHex(['#8a78c8', '#9a7ab8', '#7a86c8'][(rng() * 3) | 0], haze, 0.5);
      ctx.fillStyle = vgrad(ctx, farBase - bh, farBase, [[0, col], [1, mixHex(col, haze, 0.4)]]);
      ctx.fillRect(x, farBase - bh, bw, bh + 4);
      if (rng() < 0.35) {
        ctx.fillRect(x + bw * 0.25, farBase - bh - 8 * k, bw * 0.5, 8 * k);
        if (rng() < 0.6) {
          ctx.fillRect(x + bw * 0.5 - 0.8 * k, farBase - bh - 24 * k, 1.6 * k, 16 * k);
          e.beacons.push({ x: x + bw * 0.5, y: farBase - bh - 24 * k, r: 1.6 * k });
        }
      }
      // 해를 받는 왼쪽 가장자리
      ctx.fillStyle = withAlpha('#ffe2b8', 0.45);
      ctx.fillRect(x, farBase - bh, 2 * k, bh);
      x += bw + rng() * 3 * k;
    }

    // 가운데 빌딩
    const mb = G - D * 0.2;
    const pal = ['#7d73b8', '#9a78a8', '#6d84bc', '#b27c86', '#8a90c4', '#a86e84'];
    const blds = [];
    x = -10 * k;
    let glassDone = false;
    while (x < w + 10) {
      const bw = (36 + rng() * 26) * k;
      const bh = (54 + rng() * 80) * kv;
      let style = rng() < 0.4 ? 'bands' : 'grid';
      if (!glassDone && x > w * 0.5 && bh > 90 * kv) {
        style = 'glass';
        glassDone = true;
      }
      blds.push({ x, bw, bh, col: pal[(rng() * pal.length) | 0], style });
      x += bw + (2 + rng() * 6) * k;
    }
    let low = null;
    for (const b of blds) {
      tower(ctx, rng, b.x, mb, b.bw, b.bh, k, b.col, b.style);
      if (b.x > w * 0.15 && b.x + b.bw < w * 0.85 && (!low || b.bh < low.bh)) low = b;
    }
    for (const b of blds) {
      if (b === low) continue;
      const r = rng();
      if (r < 0.35 || b.style === 'glass') {
        const ax = b.x + b.bw * 0.7;
        ctx.fillStyle = '#4a4a80';
        ctx.fillRect(ax - 0.9 * k, mb - b.bh - 22 * k, 1.8 * k, 22 * k);
        e.beacons.push({ x: ax, y: mb - b.bh - 22 * k, r: 2 * k });
      } else if (r < 0.6) waterTower(ctx, b.x + b.bw * 0.35, mb - b.bh, k);
    }
    if (low) billboard(ctx, low.x + low.bw / 2, mb - low.bh, k);

    // 거리의 가게들(차양)
    x = -6 * k;
    let si = 0;
    while (x < w + 6) {
      const bw = (44 + rng() * 18) * k;
      shop(ctx, x, G - 5 * k, bw, (34 + rng() * 12) * k, k, si++);
      x += bw;
    }
    // 거리 나무와 가로등
    for (const fx of [0.1, 0.52, 0.92]) bushTree(ctx, w * fx, G - 3 * k, 12 * k, '#4f9a4a');
    for (const fx of [0.31, 0.72]) streetLamp(ctx, w * fx, G - 3 * k, k, true);
    // 인도와 찻길
    const sw0 = G - 6 * k;
    ctx.fillStyle = vgrad(ctx, sw0, G + 12 * k, [[0, '#f2d2c4'], [1, '#d8b8b8']]);
    ctx.fillRect(0, sw0, w, G + 12 * k - sw0);
    ctx.fillStyle = withAlpha('#a888a8', 0.4);
    for (let sx2 = 0; sx2 < w; sx2 += 22 * k) ctx.fillRect(sx2, sw0, 1, G + 12 * k - sw0);
    ctx.fillStyle = vgrad(ctx, G + 12 * k, G + 16 * k, [[0, '#f4dcd6'], [1, '#b49ab8']]);
    ctx.fillRect(0, G + 12 * k, w, 4 * k);
    ctx.fillStyle = vgrad(ctx, G + 16 * k, G + 70, [[0, '#6c6c9e'], [1, '#55588a']]);
    ctx.fillRect(0, G + 16 * k, w, e.h - G);
    const dashY = G + 16 * k + (e.band - 16 * k) * 0.5;
    ctx.fillStyle = withAlpha('#ffd890', 0.85);
    for (let dx = 8; dx < w; dx += 44 * k) {
      rrect(ctx, dx, dashY, 22 * k, 3 * k, 1.5 * k);
      ctx.fill();
    }
    e.heli = { y: HUD + pf * 0.12 };
  },

  // 5. 천문대: 해 질 녘에서 밤으로, 첫 별과 지평선 노을
  observatory(ctx, e, rng) {
    const { w, G, hz, D, k, pf } = e;
    sky(ctx, e, [[0, '#141a4c'], [0.3, '#2b3282'], [0.6, '#6658b2'], [0.84, '#d283a8'], [1, '#ffbb90']]);
    // 별(위쪽일수록 많고 밝게)
    const starTop = hz * 0.7;
    for (let i = 0; i < 140; i++) {
      const v = rng();
      const y = v * v * starTop;
      const a = (1 - y / starTop) * (0.35 + rng() * 0.6);
      ctx.fillStyle = withAlpha(rng() < 0.15 ? '#ffe6b0' : '#ffffff', a);
      circle(ctx, rng() * w, y, 0.5 + rng() * 1.1);
      ctx.fill();
    }
    // 초승달(어두운 쪽은 희미하게)
    const mx = w * 0.8;
    const my = HUD + pf * 0.1;
    const mr = 15 * k;
    glow(ctx, mx, my, mr * 4, '#fff0d0', 0.22);
    circle(ctx, mx, my, mr);
    ctx.fillStyle = '#fff4d8';
    ctx.fill();
    ctx.save();
    circle(ctx, mx, my, mr);
    ctx.clip();
    circle(ctx, mx + mr * 0.45, my - mr * 0.2, mr * 0.92);
    ctx.fillStyle = withAlpha('#3a3c8a', 0.88);
    ctx.fill();
    ctx.restore();
    // 지평선 노을과 낮은 구름
    glow(ctx, w * 0.25, hz + 10, w * 0.95, '#ffb08a', 0.32);
    for (const [fx, fy, cw, ch] of [[0.15, 0.68, 0.55, 14], [0.75, 0.6, 0.6, 18], [0.45, 0.8, 0.5, 11]]) {
      drawWisp(ctx, wispShape(rng, w * cw, ch * k), w * fx, HUD + pf * fy, '#7a6cc0', '#f8a8a8', 0.85);
    }
    // 먼 산
    const farCol = mixHex('#5a4c9c', '#d08aa8', 0.35);
    for (const [fx, ht, wd] of [[0.12, 46, 0.3], [0.48, 64, 0.36], [0.86, 40, 0.3]]) mountain(ctx, w * fx, hz + 2, ht * k, w * wd, farCol, null, 0.12);
    // 골짜기 마을 불빛
    const wv0 = waves(rng, w, 3 * k);
    const yV = (x) => hz + D * 0.1 + wv0(x);
    land(ctx, e, yV, [[0, '#4a3f88'], [1, '#3a3274']], { depth: D * 0.3 });
    for (let i = 0; i < 30; i++) {
      const lx = rng() * w;
      const ly = yV(lx) + (2 + rng() * D * 0.2);
      glow(ctx, lx, ly, 4 * k, '#ffd88a', 0.5);
      ctx.fillStyle = '#ffe6a8';
      ctx.fillRect(lx - 0.7, ly - 0.7, 1.4, 1.4);
    }
    // 왼쪽 언덕
    const wv1 = waves(rng, w, 6 * k);
    const yL = (x) => hz + D * 0.42 + wv1(x) - D * 0.1 * (1 - smooth(0, w * 0.4, x));
    land(ctx, e, yL, [[0, '#35507e'], [1, '#26395e']], { depth: D * 0.5, rim: [withAlpha('#d79ab8', 0.45), 3 * k] });
    for (const [fx, ht] of [[0.05, 52], [0.13, 40], [0.21, 46], [0.3, 30]]) pine(ctx, w * fx, yL(w * fx) + 8 * k, ht * k, '#1f4a52');
    // 오른쪽 큰 언덕과 천문대
    const wv2 = waves(rng, w, 4 * k);
    const yR = (x) => G - D * 0.24 - D * 0.5 * smooth(w * 0.3, w * 0.82, x) + wv2(x);
    land(ctx, e, yR, [[0, '#3c5c88'], [1, '#253c62']], { depth: D * 0.6, rim: [withAlpha('#e6a6c0', 0.5), 3.5 * k] });
    const ox = w * 0.74;
    observatory(ctx, ox, yR(ox) + 6 * k, k * 1.3);
    observatory(ctx, w * 0.94, yR(w * 0.94) + 4 * k, k * 0.6);
    for (const [fx, ht] of [[0.55, 42], [0.6, 30], [0.99, 48]]) pine(ctx, w * fx, yR(w * fx) + 10 * k, ht * k, '#21505a');
    // 꼬불길과 길등
    ctx.strokeStyle = withAlpha('#c8b8d8', 0.55);
    ctx.lineWidth = 4 * k;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(w * 0.42, G + 4);
    ctx.bezierCurveTo(w * 0.62, G - D * 0.12, w * 0.5, G - D * 0.32, ox - 6 * k, yR(ox) + 6 * k);
    ctx.stroke();
    for (const [px, py] of [[0.5, 0.1], [0.56, 0.24], [0.62, 0.38]]) {
      const lx = w * px;
      const ly = G - D * py;
      ctx.fillStyle = '#2a3058';
      ctx.fillRect(lx - 0.8 * k, ly - 9 * k, 1.6 * k, 9 * k);
      glow(ctx, lx, ly - 10 * k, 10 * k, '#ffd88a', 0.55);
      circle(ctx, lx, ly - 10 * k, 1.8 * k);
      ctx.fillStyle = '#fff0c0';
      ctx.fill();
    }
    // 앞 풀밭
    const wv3 = waves(rng, w, 3 * k);
    land(ctx, e, (x) => G - D * 0.1 + wv3(x), [[0, '#3a6a7a'], [0.4, '#2f5a6c'], [1, '#22445a']], { depth: D * 0.1 + 60, rim: [withAlpha('#9ab0d8', 0.4), 2.5 * k] });
    meadow(ctx, rng, e, 0, w, G - D * 0.04, G + 50 * k, 30, withAlpha('#4a7a8a', 0.55), ['#c6d4ff', '#ffffff', '#b79cff'], 0.35);
  },

  // 6. 구름 바다: 구름 위의 맑은 낮
  cloudsea(ctx, e, rng) {
    const { w, G, hz, D, k, pf } = e;
    sky(ctx, e, [[0, '#2c62d6'], [0.4, '#5d9bf0'], [0.78, '#a6d4ff'], [1, '#e8f6ff']]);
    const sx = w * 0.2;
    const sy = HUD + pf * 0.1;
    glow(ctx, sx, sy, w * 1.0, '#fff2c0', 0.42);
    glow(ctx, sx, sy, 64 * k, '#fff8dc', 0.85);
    circle(ctx, sx, sy, 19 * k);
    ctx.fillStyle = '#fffbea';
    ctx.fill();
    // 햇살
    ctx.save();
    ctx.translate(sx, sy);
    for (let i = 0; i < 10; i++) {
      ctx.rotate(TAU / 10 + rng() * 0.1);
      const len = (90 + rng() * 80) * k;
      ctx.fillStyle = hgrad(ctx, 0, len, [[0, withAlpha('#fff6d0', 0.28)], [1, withAlpha('#fff6d0', 0)]]);
      poly(ctx, [[22 * k, -3 * k], [len, -10 * k], [len, 10 * k], [22 * k, 3 * k]]);
      ctx.fill();
    }
    ctx.restore();
    // 높은 새털구름
    for (const [fx, fy, cw] of [[0.75, 0.06, 0.6], [0.35, 0.3, 0.5]]) drawWisp(ctx, wispShape(rng, w * cw, 10 * k), w * fx, HUD + pf * fy, '#ffffff', '#d6e4fa', 0.6);
    const kv = e.kv;
    // 수평선의 옅은 빛
    ctx.fillStyle = vgrad(ctx, hz - D * 0.5, hz, [[0, 'rgba(255,255,255,0)'], [1, 'rgba(250,252,255,0.7)']]);
    ctx.fillRect(0, hz - D * 0.5, w, D * 0.5);
    // 솟은 구름 기둥
    bigCloud(ctx, rng, w * 0.04, hz + D * 0.2, w * 0.46, 150 * kv, { lit: '#ffffff', mid: '#e6ecfc', shade: '#a9bbec' });
    bigCloud(ctx, rng, w * 0.97, hz + D * 0.16, w * 0.4, 104 * kv, { lit: '#fbfdff', mid: '#e8eefc', shade: '#b3c4ee' });
    // 구름 바다(먼 줄 → 가까운 줄): 멀수록 옅고 납작하다
    const rows = [
      [0.0, 10, 3.4, { lit: '#f6faff', mid: '#e8f0fc', shade: '#d2def6' }],
      [0.1, 16, 3.0, { lit: '#f8fbff', mid: '#e6eefc', shade: '#c8d6f4' }],
      [0.24, 26, 2.7, { lit: '#fbfcff', mid: '#e6ecfc', shade: '#bccbf0' }],
      [0.42, 38, 2.4, { lit: '#ffffff', mid: '#e6ebfb', shade: '#b0c0ee' }],
      [0.64, 54, 2.2, { lit: '#ffffff', mid: '#e5e9fb', shade: '#a5b4ea' }],
      [0.9, 74, 2.0, { lit: '#ffffff', mid: '#e4e8fb', shade: '#9caae6' }],
      [1.22, 96, 1.9, { lit: '#ffffff', mid: '#e4e7fb', shade: '#96a3e2' }],
    ];
    for (const [fy, chB, ratio, tint] of rows) {
      const by = hz + D * fy;
      const ch = chB * kv;
      ctx.fillStyle = vgrad(ctx, by, by + ch, [[0, tint.mid], [1, tint.shade]]);
      ctx.fillRect(0, by + ch * 0.12, w, e.h - by);
      for (let x = -w * 0.06 - rng() * ch; x < w * 1.1; ) {
        const hh = ch * (0.6 + rng() * 0.7);
        const cw = hh * ratio * (0.85 + rng() * 0.4);
        drawCloud(ctx, cloudShape(rng, cw, hh), x + cw / 2, by + ch * 0.2, tint);
        x += cw * (0.48 + rng() * 0.2);
      }
    }
  },

  // 7. 궤도: 깊은 우주, 성운, 지구의 곡면
  orbit(ctx, e, rng) {
    const { w, G, k, pf } = e;
    const top = G - clamp(pf * 0.22, 70, 140);
    sky(ctx, e, [[0, '#060a26'], [0.55, '#0e1546'], [0.86, '#1a266a'], [1, '#2a3f8f']], top);
    // 성운
    for (const [fx, fy, r, col, a] of [
      [0.22, 0.22, 0.75, '#7a5ad8', 0.24],
      [0.36, 0.34, 0.45, '#ff8fb0', 0.13],
      [0.82, 0.1, 0.5, '#ff8fb0', 0.14],
      [0.75, 0.44, 0.55, '#2fb5a6', 0.13],
      [0.1, 0.5, 0.4, '#5f7ae0', 0.14],
    ]) glow(ctx, w * fx, HUD + pf * fy, w * r, col, a);
    // 성운 먼지 띠
    ctx.save();
    ctx.translate(w * 0.4, HUD + pf * 0.3);
    ctx.rotate(-0.5);
    for (let i = 0; i < 160; i++) {
      const x = (rng() - 0.5) * w * 1.6;
      const y = (rng() + rng() + rng() - 1.5) * 40 * k;
      ctx.fillStyle = withAlpha(rng() < 0.3 ? '#ffc6e0' : '#d6ccff', 0.2 + rng() * 0.4);
      ctx.fillRect(x, y, 1.1, 1.1);
    }
    ctx.restore();
    // 별
    for (let i = 0; i < 190; i++) {
      const p = rng();
      ctx.fillStyle = withAlpha(p < 0.12 ? '#bdf0ff' : p < 0.2 ? '#ffd6e6' : '#ffffff', 0.35 + rng() * 0.6);
      circle(ctx, rng() * w, rng() * top, 0.5 + rng() * 1.2);
      ctx.fill();
    }
    for (let i = 0; i < 7; i++) {
      const x = rng() * w;
      const y = rng() * top * 0.9;
      glow(ctx, x, y, 8 * k, '#dfe8ff', 0.4);
      ctx.fillStyle = '#ffffff';
      star(ctx, x, y, 4.5 * k, 0.9 * k, 4, 0);
      ctx.fill();
    }
    // 멀리 보이는 달
    const mx = w * 0.84;
    const my = HUD + pf * 0.2;
    glow(ctx, mx, my, 40 * k, '#cfd8ff', 0.25);
    ball(ctx, mx, my, 13 * k, '#d6d2ea', { lw: 0, light: 0.4, dark: 0.55 });
    for (const [dx, dy, r] of [[-0.3, -0.25, 0.22], [0.25, 0.2, 0.28], [0.3, -0.35, 0.14], [-0.35, 0.35, 0.15]]) {
      circle(ctx, mx + dx * 13 * k, my + dy * 13 * k, r * 13 * k);
      ctx.fillStyle = withAlpha('#8a86b8', 0.4);
      ctx.fill();
    }
    // 지구
    const R = w * 1.8;
    const cx = w * 0.5;
    const cy = top + R;
    const halo = ctx.createRadialGradient(cx, cy, R * 0.99, cx, cy, R + 40 * k);
    halo.addColorStop(0, withAlpha('#a6e0ff', 0.9));
    halo.addColorStop(0.22, withAlpha('#5fb0ff', 0.45));
    halo.addColorStop(1, withAlpha('#3f6fd0', 0));
    ctx.fillStyle = halo;
    circle(ctx, cx, cy, R + 40 * k);
    ctx.fill();
    ctx.save();
    circle(ctx, cx, cy, R);
    ctx.clip();
    ctx.fillStyle = vgrad(ctx, top, top + 170 * k, [[0, '#5ab2f4'], [0.4, '#2f80d8'], [1, '#1c4fa6']]);
    ctx.fillRect(0, top - 2, w, e.h - top + 2);
    // 대륙(가장자리일수록 납작하게 보인다)
    const flat = (y) => 0.22 + 0.5 * clamp((y - top) / (170 * k));
    const continent = (x0, y0, n, size) => {
      const pts = [];
      let x = x0;
      let y = y0;
      let dir = rng() * TAU;
      for (let i = 0; i < n; i++) {
        const r = size * (0.35 + rng() * 0.45);
        pts.push([x, y, r]);
        dir += (rng() - 0.5) * 1.8;
        x += Math.cos(dir) * r * 0.95;
        y += Math.sin(dir) * r * 0.95 * flat(y);
      }
      const blobs = (grow, col) => {
        ctx.fillStyle = col;
        ctx.beginPath();
        for (const [px, py, r] of pts) {
          ctx.moveTo(px + r + grow, py);
          ctx.ellipse(px, py, r + grow, (r + grow) * flat(py), 0, 0, TAU);
        }
        ctx.fill();
      };
      blobs(5 * k, withAlpha('#8fdcf4', 0.45)); // 얕은 바다
      blobs(0, vgrad(ctx, y0 - size, y0 + size, [[0, '#86d064'], [1, '#4aa44c']]));
      for (const [px, py, r] of pts) {
        const desert = rng() < 0.45;
        softBlob(ctx, px + r * (desert ? 0.25 : -0.2), py, r * 0.55, r * 0.55 * flat(py), desert ? '#ecd690' : '#2f7a3e', desert ? 0.85 : 0.5);
      }
    };
    continent(w * 0.06, top + 26 * k, 9, 22 * k);
    continent(w * 0.6, top + 16 * k, 10, 18 * k);
    continent(w * 0.3, top + 100 * k, 7, 20 * k);
    continent(w * 0.9, top + 80 * k, 8, 24 * k);
    // 구름 띠(부드러운 덩어리)
    for (let i = 0; i < 12; i++) {
      let x = rng() * w;
      const y = top + Math.pow(rng(), 0.85) * 170 * k;
      const n = 3 + ((rng() * 4) | 0);
      for (let j = 0; j < n; j++) {
        const r = (7 + rng() * 12) * k;
        softBlob(ctx, x, y + (rng() - 0.5) * 6 * k * flat(y), r * 1.5, r * flat(y), '#ffffff', 0.75 + rng() * 0.2);
        x += r * (1.2 + rng() * 0.8);
      }
    }
    // 소용돌이 구름
    const vx = w * 0.72;
    const vy = top + 116 * k;
    for (let a = 0; a < TAU * 2.4; a += 0.32) {
      const r = 2 * k + a * 3.6 * k;
      softBlob(ctx, vx + Math.cos(a) * r, vy + Math.sin(a) * r * flat(vy), (4 + a * 1.1) * k, (4 + a * 1.1) * k * flat(vy), '#ffffff', 0.7);
    }
    // 밤 쪽 그늘(오른쪽)과 가장자리 대기
    ctx.fillStyle = hgrad(ctx, w * 0.45, w, [[0, 'rgba(12,18,64,0)'], [1, 'rgba(12,18,64,0.38)']]);
    ctx.fillRect(0, top - 2, w, e.h - top + 2);
    const limb = ctx.createRadialGradient(cx, cy, R * 0.975, cx, cy, R);
    limb.addColorStop(0, 'rgba(190,232,255,0)');
    limb.addColorStop(1, 'rgba(200,238,255,0.75)');
    ctx.fillStyle = limb;
    ctx.fillRect(0, top - 2, w, e.h - top + 2);
    ctx.restore();
    // 지구 가장자리 위로 떠오르는 햇빛
    const lxs = w * 0.06;
    const lys = cy - Math.sqrt(R * R - (lxs - cx) * (lxs - cx));
    glow(ctx, lxs, lys, 90 * k, '#fff1c8', 0.5);
    glow(ctx, lxs, lys, 26 * k, '#ffffff', 0.85);
    e.earthTop = top;
  },
};

// ───────── 무대 소품 ─────────

/** 가장자리가 흐린 타원 덩어리(지구의 구름·사막 등). */
function softBlob(ctx, x, y, rx, ry, col, a) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, Math.max(ry, 0.01) / Math.max(rx, 0.01));
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(rx, 0.01));
  g.addColorStop(0, withAlpha(col, a));
  g.addColorStop(0.55, withAlpha(col, a * 0.75));
  g.addColorStop(1, withAlpha(col, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(rx, 0.01), 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** 빨강·하양 줄무늬 등대. (x, y) = 밑동 가운데. */
function lighthouse(ctx, x, y, s) {
  const H = 76 * s;
  const bw = 9 * s;
  const tw = 6.2 * s;
  const top = y - H;
  const bodyTop = top + 14 * s;
  groundShadow(ctx, x + 4 * s, y, 14 * s, 3 * s, 0.25);
  ctx.save();
  poly(ctx, [[x - bw, y], [x - tw, bodyTop], [x + tw, bodyTop], [x + bw, y]]);
  ctx.clip();
  const bandH = (y - bodyTop) / 5;
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i % 2 ? '#f8f2ea' : P.red;
    ctx.fillRect(x - bw - 1, y - (i + 1) * bandH - 0.5, bw * 2 + 2, bandH + 1);
  }
  ctx.fillStyle = hgrad(ctx, x - bw, x + bw, [[0, 'rgba(255,250,235,0.35)'], [0.42, 'rgba(255,255,255,0)'], [1, 'rgba(27,29,74,0.35)']]);
  ctx.fillRect(x - bw - 1, bodyTop, bw * 2 + 2, H);
  ctx.restore();
  // 난간
  rrect(ctx, x - tw - 2.8 * s, bodyTop - 2.5 * s, (tw + 2.8 * s) * 2, 3.2 * s, 1 * s);
  ctx.fillStyle = '#8a3a44';
  ctx.fill();
  // 등불 방
  glow(ctx, x, top + 8 * s, 22 * s, '#fff1a8', 0.55);
  ctx.fillStyle = hgrad(ctx, x - tw, x + tw, [[0, '#fffbe0'], [1, '#ffd86a']]);
  ctx.fillRect(x - tw * 0.72, top + 4 * s, tw * 1.44, 8 * s);
  ctx.fillStyle = '#8a3a44';
  ctx.fillRect(x - 0.6 * s, top + 4 * s, 1.2 * s, 8 * s);
  // 지붕
  ctx.beginPath();
  ctx.moveTo(x - tw - 1.2 * s, top + 4.6 * s);
  ctx.quadraticCurveTo(x - tw * 0.3, top - 5 * s, x, top - 5.5 * s);
  ctx.quadraticCurveTo(x + tw * 0.3, top - 5 * s, x + tw + 1.2 * s, top + 4.6 * s);
  ctx.closePath();
  shade(ctx, P.red, x - tw, top - 5 * s, x + tw, top + 4 * s, { lw: 0, light: 0.3, dark: 0.25 });
  ctx.fillStyle = '#8a3a44';
  ctx.fillRect(x - 0.7 * s, top - 9 * s, 1.4 * s, 4 * s);
}

/** 바다 위 작은 배(live). */
function boat(ctx, x, y, s, t) {
  const bob = Math.sin(t * 1.6) * 0.7 * s;
  const tilt = Math.sin(t * 1.2) * 0.04;
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.rotate(tilt);
  ctx.fillStyle = withAlpha('#ffffff', 0.5);
  ctx.fillRect(10 * s, 1.5 * s, 14 * s, 1 * s);
  ctx.fillRect(14 * s, 3 * s, 9 * s, 0.8 * s);
  ctx.fillStyle = '#f4efe8';
  ctx.fillRect(-5 * s, -10 * s, 9 * s, 6 * s);
  ctx.fillStyle = '#6f9edc';
  ctx.fillRect(-3.5 * s, -8.5 * s, 2.5 * s, 2.2 * s);
  ctx.fillRect(0 * s, -8.5 * s, 2.5 * s, 2.2 * s);
  ctx.fillStyle = '#8a3a44';
  ctx.fillRect(-5.5 * s, -11 * s, 10 * s, 1.5 * s);
  ctx.fillRect(5 * s, -16 * s, 1 * s, 12 * s);
  ctx.beginPath();
  ctx.moveTo(-13 * s, -4.5 * s);
  ctx.lineTo(13 * s, -4.5 * s);
  ctx.lineTo(10 * s, 1.5 * s);
  ctx.lineTo(-10 * s, 1.5 * s);
  ctx.closePath();
  ctx.fillStyle = '#fbf6ee';
  ctx.fill();
  ctx.fillStyle = P.red;
  ctx.fillRect(-12 * s, -2.5 * s, 24 * s, 1.6 * s);
  ctx.restore();
}

/** 풍차 탑. 날개 중심을 돌려준다. */
function windmill(ctx, x, y, s) {
  const H = 52 * s;
  const bw = 11 * s;
  const tw = 7 * s;
  groundShadow(ctx, x + 6 * s, y, 18 * s, 3.5 * s, 0.25);
  poly(ctx, [[x - bw, y], [x - tw, y - H], [x + tw, y - H], [x + bw, y]]);
  shade(ctx, '#f6e8cc', x - bw, y - H, x + bw, y - H * 0.4, { lw: 0, light: 0.25, dark: 0.32 });
  rrect(ctx, x - 3 * s, y - 11 * s, 6 * s, 11 * s, 3 * s);
  ctx.fillStyle = P.wood;
  ctx.fill();
  houseWindow(ctx, x - 2.2 * s, y - H * 0.62, 4.4 * s, 5 * s, s * 0.6);
  ctx.beginPath();
  ctx.moveTo(x - tw - 3 * s, y - H + 1.5 * s);
  ctx.quadraticCurveTo(x - tw * 0.5, y - H - 12 * s, x, y - H - 13 * s);
  ctx.quadraticCurveTo(x + tw * 0.6, y - H - 11 * s, x + tw + 3 * s, y - H + 1.5 * s);
  ctx.closePath();
  shade(ctx, P.roof, x - tw, y - H - 12 * s, x + tw, y - H, { lw: 0, light: 0.3, dark: 0.22 });
  return { x: x - 1 * s, y: y - H - 3 * s, r: 30 * s, s };
}

/** 풍차 날개(live). */
function sails(ctx, m, a) {
  const { x, y, r, s } = m;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  for (let i = 0; i < 4; i++) {
    ctx.rotate(TAU / 4);
    ctx.fillStyle = '#8a5a3a';
    ctx.fillRect(-0.9 * s, 0, 1.8 * s, r);
    ctx.fillStyle = 'rgba(252,246,232,0.95)';
    ctx.fillRect(1 * s, r * 0.2, r * 0.27, r * 0.78);
    ctx.fillStyle = 'rgba(176,120,67,0.55)';
    for (let j = 1; j < 5; j++) ctx.fillRect(1 * s, r * (0.2 + j * 0.156), r * 0.27, 0.8 * s);
    ctx.fillRect(1 * s + r * 0.13, r * 0.2, 0.8 * s, r * 0.78);
  }
  ctx.restore();
  ball(ctx, x, y, 3 * s, P.woodDark, { lw: 0 });
}

/** 빨간 헛간(하얀 테, 갈색 지붕). x = 앞면 왼쪽, y = 바닥. */
function barn(ctx, x, y, s) {
  const fw = 36 * s;
  const wh = 24 * s;
  const rh = 19 * s;
  const sw = 32 * s;
  const d = 5 * s;
  const trim = '#fff6ea';
  groundShadow(ctx, x + fw, y + 1, fw * 1.3, 5 * s, 0.26);
  // 옆벽
  poly(ctx, [[x + fw, y], [x + fw + sw, y - d], [x + fw + sw, y - d - wh], [x + fw, y - wh]]);
  ctx.fillStyle = hgrad(ctx, x + fw, x + fw + sw, [[0, tone(P.barn, -0.18)], [1, tone(P.barn, -0.3)]]);
  ctx.fill();
  ctx.fillStyle = withAlpha('#7a2a2a', 0.35);
  for (let i = 1; i < 6; i++) ctx.fillRect(x + fw + (sw * i) / 6, y - wh - d * (i / 6), 0.8 * s, wh);
  for (const fx of [0.25, 0.65]) {
    const wx = x + fw + sw * fx;
    const wy = y - wh * 0.7 - d * fx;
    ctx.fillStyle = trim;
    ctx.fillRect(wx - 1 * s, wy - 1 * s, 8 * s, 8 * s);
    ctx.fillStyle = '#6a8ac8';
    ctx.fillRect(wx, wy, 6 * s, 6 * s);
  }
  // 지붕
  const gam = [[x, y - wh], [x + fw * 0.17, y - wh - rh * 0.62], [x + fw * 0.5, y - wh - rh], [x + fw * 0.83, y - wh - rh * 0.62], [x + fw, y - wh]];
  poly(ctx, [gam[2], [gam[2][0] + sw, gam[2][1] - d], [gam[3][0] + sw, gam[3][1] - d], [gam[4][0] + sw + 2.5 * s, gam[4][1] - d + 2 * s], [gam[4][0] + 2.5 * s, gam[4][1] + 2 * s], gam[3]]);
  shade(ctx, P.roof, gam[2][0], gam[2][1], gam[4][0] + sw, gam[4][1], { lw: 0, light: 0.3, dark: 0.15 });
  ctx.strokeStyle = withAlpha(tone(P.roof, 0.35), 0.8);
  ctx.lineWidth = 1.4 * s;
  ctx.beginPath();
  ctx.moveTo(gam[3][0], gam[3][1]);
  ctx.lineTo(gam[3][0] + sw, gam[3][1] - d);
  ctx.stroke();
  // 앞면
  poly(ctx, [[x, y], ...gam, [x + fw, y]]);
  shade(ctx, P.barn, x, gam[2][1], x + fw, y, { lw: 0, light: 0.25, dark: 0.12 });
  // 문
  const dx = x + fw * 0.24;
  const dw = fw * 0.52;
  const dh = wh * 0.78;
  ctx.fillStyle = tone(P.barn, -0.15);
  ctx.fillRect(dx, y - dh, dw, dh);
  ctx.strokeStyle = trim;
  ctx.lineWidth = 1.8 * s;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeRect(dx, y - dh, dw, dh);
  ctx.beginPath();
  ctx.moveTo(dx, y - dh);
  ctx.lineTo(dx + dw, y);
  ctx.moveTo(dx + dw, y - dh);
  ctx.lineTo(dx, y);
  ctx.moveTo(dx + dw / 2, y - dh);
  ctx.lineTo(dx + dw / 2, y);
  ctx.stroke();
  // 하얀 테두리
  ctx.lineWidth = 2.2 * s;
  ctx.beginPath();
  ctx.moveTo(gam[0][0] - 1 * s, gam[0][1] + 1 * s);
  for (const [gx, gy] of gam) ctx.lineTo(gx, gy);
  ctx.lineTo(gam[4][0] + 1 * s, gam[4][1] + 1 * s);
  ctx.stroke();
  ctx.lineWidth = 1.6 * s;
  ctx.beginPath();
  ctx.moveTo(x + 0.8 * s, y);
  ctx.lineTo(x + 0.8 * s, y - wh);
  ctx.moveTo(x + fw - 0.8 * s, y);
  ctx.lineTo(x + fw - 0.8 * s, y - wh);
  ctx.stroke();
  // 다락 창
  const lx = x + fw * 0.5;
  const ly = y - wh - rh * 0.48;
  ctx.fillStyle = trim;
  ctx.fillRect(lx - 4.5 * s, ly - 4 * s, 9 * s, 8 * s);
  ctx.fillStyle = '#6a8ac8';
  ctx.fillRect(lx - 3.3 * s, ly - 2.8 * s, 6.6 * s, 5.6 * s);
}

/** 연못과 나무 선창. */
function pond(ctx, x, y, rx, ry, s) {
  ellipse(ctx, x, y + ry * 0.15, rx + 7 * s, ry + 4.5 * s);
  ctx.fillStyle = vgrad(ctx, y - ry, y + ry + 4 * s, [[0, '#7fae4a'], [0.4, '#e8d6a0'], [1, '#d6bf86']]);
  ctx.fill();
  ellipse(ctx, x, y, rx, ry);
  ctx.fillStyle = vgrad(ctx, y - ry, y + ry, [[0, '#2a62b4'], [0.45, '#3f86e0'], [1, '#86c4f4']]);
  ctx.fill();
  ctx.save();
  ellipse(ctx, x, y, rx, ry);
  ctx.clip();
  ctx.fillStyle = withAlpha('#ffffff', 0.45);
  for (const [dx, dy, lw] of [[-0.4, -0.1, 0.3], [-0.15, 0.25, 0.4], [0.25, -0.3, 0.22], [0.3, 0.35, 0.18]]) {
    rrect(ctx, x + dx * rx, y + dy * ry, lw * rx, 1.4 * s, 0.7 * s);
    ctx.fill();
  }
  ctx.restore();
  // 수련잎
  for (const [dx, dy, r] of [[-0.55, 0.1, 4], [-0.45, 0.35, 3], [0.1, -0.35, 3.5]]) {
    ellipse(ctx, x + dx * rx, y + dy * ry, r * s, r * 0.45 * s);
    ctx.fillStyle = '#5cbf5a';
    ctx.fill();
  }
  flower(ctx, x - rx * 0.5, y + ry * 0.15, 1.3 * s, P.pink);
  // 둑의 돌
  for (const [dx, dy, r] of [[-0.95, 0.4, 4], [-0.7, 0.85, 3.5], [0.9, 0.6, 4.5], [0.55, 1.05, 3]]) {
    ellipse(ctx, x + dx * rx, y + dy * ry, r * s, r * 0.65 * s);
    shade(ctx, P.stone, x + dx * rx - r * s, y + dy * ry - r * s, x + dx * rx + r * s, y + dy * ry + r * s, { lw: 0, light: 0.4, dark: 0.25 });
  }
  // 선창
  const d0 = x + rx * 0.15;
  const d1 = x + rx + 10 * s;
  const dy = y + 2 * s;
  ctx.fillStyle = P.woodDark;
  for (let px = d0 + 3 * s; px < d1; px += 13 * s) ctx.fillRect(px, dy, 2.4 * s, 7 * s);
  ctx.fillStyle = vgrad(ctx, dy - 3 * s, dy + 3 * s, [[0, tone(P.wood, 0.3)], [1, P.wood]]);
  ctx.fillRect(d0, dy - 3 * s, d1 - d0, 4.5 * s);
  ctx.fillStyle = tone(P.wood, -0.25);
  ctx.fillRect(d0, dy + 1.5 * s, d1 - d0, 1 * s);
  ctx.fillStyle = withAlpha(tone(P.wood, -0.35), 0.6);
  for (let px = d0 + 5 * s; px < d1; px += 5 * s) ctx.fillRect(px, dy - 3 * s, 0.7 * s, 4.5 * s);
}

/** 나무 울타리(땅 높이 yf 를 따라). */
function fence(ctx, x0, x1, yf, s) {
  const ph = 13 * s;
  ctx.lineCap = 'round';
  for (const [dy, col] of [[0.72, tone(P.wood, 0.1)], [0.36, tone(P.wood, 0.18)]]) {
    ctx.beginPath();
    for (let x = x0; x <= x1; x += 4) ctx.lineTo(x, yf(x) - ph * dy);
    ctx.strokeStyle = col;
    ctx.lineWidth = 2.6 * s;
    ctx.stroke();
  }
  for (let x = x0; x <= x1; x += 17 * s) {
    const y = yf(x);
    rrect(ctx, x - 1.8 * s, y - ph, 3.6 * s, ph + 1 * s, 1 * s);
    shade(ctx, P.wood, x - 1.8 * s, y - ph, x + 1.8 * s, y, { lw: 0, light: 0.3, dark: 0.3 });
  }
}

/** 누운 원통형 건초 더미. (x, y) = 앞면 아래. */
function hayBale(ctx, x, y, r) {
  const L = r * 1.3;
  groundShadow(ctx, x + L * 0.5, y, r * 1.7, r * 0.35, 0.28);
  ctx.beginPath();
  ctx.moveTo(x, y - 2 * r);
  ctx.lineTo(x + L, y - 2 * r);
  ctx.ellipse(x + L, y - r, r * 0.45, r, 0, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fillStyle = vgrad(ctx, y - 2 * r, y, [[0, tone(P.hay, 0.25)], [0.5, P.hay], [1, tone(P.hay, -0.3)]]);
  ctx.fill();
  ctx.fillStyle = withAlpha(tone(P.hay, -0.3), 0.35);
  for (let i = 1; i < 5; i++) ctx.fillRect(x, y - 2 * r + (2 * r * i) / 5, L, 0.8);
  ellipse(ctx, x, y - r, r * 0.45, r);
  ctx.fillStyle = vgrad(ctx, y - 2 * r, y, [[0, tone(P.hay, 0.35)], [1, tone(P.hay, -0.05)]]);
  ctx.fill();
  ctx.strokeStyle = withAlpha(tone(P.hay, -0.35), 0.45);
  ctx.lineWidth = 0.9;
  for (const q of [0.7, 0.45, 0.2]) {
    ellipse(ctx, x, y - r, r * 0.45 * q, r * q);
    ctx.stroke();
  }
}

/** 가로등. lit 이면 불이 켜져 있다. */
function streetLamp(ctx, x, y, s, lit) {
  const H = 86 * s;
  const col = '#3e4a78';
  ctx.fillStyle = hgrad(ctx, x - 2 * s, x + 2 * s, [[0, tone(col, 0.3)], [1, tone(col, -0.2)]]);
  ctx.fillRect(x - 1.6 * s, y - H, 3.2 * s, H);
  rrect(ctx, x - 3.5 * s, y - 8 * s, 7 * s, 8 * s, 2 * s);
  ctx.fill();
  ctx.strokeStyle = col;
  ctx.lineWidth = 2.2 * s;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y - H);
  ctx.quadraticCurveTo(x, y - H - 8 * s, x + 9 * s, y - H - 6 * s);
  ctx.stroke();
  if (lit) glow(ctx, x + 10 * s, y - H - 1 * s, 26 * s, '#ffd88a', 0.55);
  poly(ctx, [[x + 5 * s, y - H - 3 * s], [x + 15 * s, y - H - 3 * s], [x + 13 * s, y - H - 7 * s], [x + 7 * s, y - H - 7 * s]]);
  ctx.fillStyle = col;
  ctx.fill();
  ellipse(ctx, x + 10 * s, y - H - 2 * s, 4.5 * s, 1.8 * s);
  ctx.fillStyle = lit ? '#fff2c0' : '#e8eefc';
  ctx.fill();
}

/** 산 하나: 왼쪽 볕, 오른쪽 그늘, 꼭대기 눈. */
function mountain(ctx, x, base, ht, wd, col, snow, snowK = 0.24) {
  const top = base - ht;
  const qb = (a, b, c, u) => (1 - u) * (1 - u) * a + 2 * u * (1 - u) * b + u * u * c;
  ctx.beginPath();
  ctx.moveTo(x - wd, base + 2);
  ctx.quadraticCurveTo(x - wd * 0.42, top + ht * 0.62, x, top);
  ctx.quadraticCurveTo(x + wd * 0.04, top + ht * 0.5, x + wd * 0.16, base + 2);
  ctx.closePath();
  ctx.fillStyle = vgrad(ctx, top, base, [[0, tone(col, 0.2)], [1, col]]);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x, top);
  ctx.quadraticCurveTo(x + wd * 0.42, top + ht * 0.62, x + wd, base + 2);
  ctx.lineTo(x + wd * 0.16, base + 2);
  ctx.quadraticCurveTo(x + wd * 0.04, top + ht * 0.5, x, top);
  ctx.closePath();
  ctx.fillStyle = vgrad(ctx, top, base, [[0, tone(col, -0.2)], [1, tone(col, -0.1)]]);
  ctx.fill();
  if (!snow) return;
  const u = 1 - snowK;
  const lx = qb(x - wd, x - wd * 0.42, x, u);
  const ly = qb(base, top + ht * 0.62, top, u);
  const rx = qb(x + wd, x + wd * 0.42, x, u);
  const dx = (rx - lx) / 2;
  const sh = ly - top;
  ctx.beginPath();
  ctx.moveTo(x, top);
  ctx.lineTo(rx, ly);
  ctx.lineTo(x + dx * 0.55, top + sh * 0.72);
  ctx.lineTo(x + dx * 0.25, top + sh * 1.12);
  ctx.lineTo(x - dx * 0.15, top + sh * 0.7);
  ctx.lineTo(x - dx * 0.5, top + sh * 1.08);
  ctx.lineTo(x - dx * 0.75, top + sh * 0.82);
  ctx.lineTo(lx, ly);
  ctx.closePath();
  ctx.fillStyle = hgrad(ctx, lx, rx, [[0, snow[0]], [0.54, snow[0]], [0.58, snow[1]], [1, snow[1]]]);
  ctx.fill();
}

/** 주황 텐트. (x, y) = 바닥 가운데. */
function tent(ctx, x, y, s) {
  const hw = 28 * s;
  const ht = 38 * s;
  groundShadow(ctx, x + 6 * s, y + 1, hw * 1.3, 6 * s, 0.28);
  // 오른쪽 옆면(그늘)
  poly(ctx, [[x, y - ht], [x + hw * 0.55, y - ht + 2 * s], [x + hw * 1.45, y - 2 * s], [x + hw * 0.9, y]]);
  ctx.fillStyle = hgrad(ctx, x, x + hw * 1.45, [[0, tone('#f07a3c', -0.12)], [1, tone('#f07a3c', -0.3)]]);
  ctx.fill();
  // 앞면
  poly(ctx, [[x - hw, y], [x, y - ht], [x + hw * 0.9, y]]);
  shade(ctx, '#f07a3c', x - hw, y - ht, x + hw, y, { lw: 0, light: 0.3, dark: 0.15 });
  // 입구(따뜻한 빛)
  poly(ctx, [[x - 9 * s, y], [x - 1 * s, y - ht * 0.62], [x + 7 * s, y]]);
  ctx.fillStyle = vgrad(ctx, y - ht * 0.6, y, [[0, '#7a3a3a'], [1, '#ffb060']]);
  ctx.fill();
  ctx.strokeStyle = '#fff0d8';
  ctx.lineWidth = 1.4 * s;
  ctx.beginPath();
  ctx.moveTo(x, y - ht);
  ctx.lineTo(x - 1 * s, y - ht * 0.62);
  ctx.stroke();
  // 줄
  ctx.strokeStyle = withAlpha('#fff0d8', 0.7);
  ctx.lineWidth = 0.9 * s;
  ctx.beginPath();
  ctx.moveTo(x - hw * 0.5, y - ht * 0.5);
  ctx.lineTo(x - hw * 1.35, y);
  ctx.moveTo(x + hw * 1.2, y - ht * 0.3);
  ctx.lineTo(x + hw * 1.7, y);
  ctx.stroke();
}

/** 빌딩 한 채(노을빛이 왼쪽 면에 든다). style: grid 낱창, bands 띠창, glass 유리 외벽. */
function tower(ctx, rng, x, y, bw, bh, s, col, style = 'grid') {
  const sd = 7 * s;
  const top = y - bh;
  // 오른쪽 옆면
  poly(ctx, [[x + bw, y], [x + bw + sd, y - sd * 0.4], [x + bw + sd, top - sd * 0.4], [x + bw, top]]);
  ctx.fillStyle = vgrad(ctx, top, y, [[0, tone(col, -0.22)], [1, tone(col, -0.38)]]);
  ctx.fill();
  // 앞면
  if (style === 'glass') {
    ctx.fillStyle = vgrad(ctx, top, y, [[0, '#9a8ad8'], [0.35, '#e898c0'], [0.7, '#ffc08e'], [1, '#c98aa8']]);
    ctx.fillRect(x, top, bw, bh + 2);
    ctx.fillStyle = hgrad(ctx, x, x + bw, [[0, 'rgba(255,236,200,0.45)'], [0.4, 'rgba(255,255,255,0)'], [1, 'rgba(40,30,100,0.3)']]);
    ctx.fillRect(x, top, bw, bh + 2);
    // 유리에 비친 해
    ctx.fillStyle = withAlpha('#fff2c8', 0.55);
    poly(ctx, [[x, top + bh * 0.45], [x + bw * 0.5, top + bh * 0.3], [x + bw * 0.5, top + bh * 0.38], [x, top + bh * 0.56]]);
    ctx.fill();
    ctx.fillStyle = withAlpha('#5a4a8a', 0.35);
    for (let mx = x + 6 * s; mx < x + bw - 2 * s; mx += 6 * s) ctx.fillRect(mx, top, 0.8 * s, bh);
    for (let my = top + 8 * s; my < y; my += 8 * s) ctx.fillRect(x, my, bw, 0.8 * s);
  } else {
    ctx.fillStyle = hgrad(ctx, x, x + bw, [[0, mixHex(col, '#ffb48a', 0.45)], [0.35, col], [1, tone(col, -0.12)]]);
    ctx.fillRect(x, top, bw, bh + 2);
    ctx.fillStyle = vgrad(ctx, top, y, [[0, 'rgba(255,220,190,0.18)'], [1, 'rgba(40,30,90,0.22)']]);
    ctx.fillRect(x, top, bw, bh + 2);
  }
  // 해를 받는 가장자리와 옥상 턱
  ctx.fillStyle = withAlpha('#ffdcae', 0.6);
  ctx.fillRect(x, top, 2.2 * s, bh);
  ctx.fillStyle = mixHex(col, '#ffd8b8', 0.4);
  ctx.fillRect(x - 1.5 * s, top - 3 * s, bw + 3 * s + sd * 0.5, 3.2 * s);
  if (style === 'glass') return;
  // 창: 위쪽은 하늘(분홍·보라), 아래쪽은 노을(금빛)이 비친다
  const ww = 4.4 * s;
  const wh = style === 'bands' ? 4.2 * s : 6 * s;
  const rowGap = style === 'bands' ? 5 * s : 5.5 * s;
  const cols = Math.max(2, Math.floor((bw - 8 * s) / (ww + 3.6 * s)));
  const gap = (bw - cols * ww) / (cols + 1);
  for (let wy = top + 8 * s; wy < y - wh - 6 * s; wy += wh + rowGap) {
    const v = (wy - top) / bh;
    const refl = mixHex('#e8a0c8', '#ffc98e', v);
    if (style === 'bands') {
      ctx.fillStyle = hgrad(ctx, x, x + bw, [[0, tone(refl, 0.25)], [1, mixHex(refl, col, 0.5)]]);
      ctx.fillRect(x + 4 * s, wy, bw - 8 * s, wh);
      if (rng() < 0.3) {
        ctx.fillStyle = '#ffe48e';
        ctx.fillRect(x + 4 * s + rng() * (bw - 16 * s), wy, 8 * s, wh);
      }
      continue;
    }
    for (let c = 0; c < cols; c++) {
      const wx = x + gap + c * (ww + gap);
      const r = rng();
      const u = (wx - x) / bw;
      ctx.fillStyle = r < 0.14 ? '#ffe48e' : r < 0.78 ? mixHex(tone(refl, 0.2), mixHex(refl, col, 0.6), u) : tone(col, -0.28);
      ctx.fillRect(wx, wy, ww, wh);
    }
  }
}

/** 거리의 가게(줄무늬 차양, 불 켜진 진열창). x = 왼쪽, y = 바닥. */
function shop(ctx, x, y, bw, bh, s, i) {
  const walls = ['#fbe6d2', '#d8eadc', '#f6d6e0', '#e2dcf6', '#fff0d0'];
  const awn = [P.red, P.teal, P.orange, P.blue, P.pink];
  const wall = walls[i % walls.length];
  const top = y - bh;
  ctx.fillStyle = hgrad(ctx, x, x + bw, [[0, mixHex(wall, '#ffd0a0', 0.3)], [0.5, wall], [1, tone(wall, -0.18)]]);
  ctx.fillRect(x, top, bw, bh + 1);
  ctx.fillStyle = tone(wall, -0.25);
  ctx.fillRect(x, top - 2.5 * s, bw, 3 * s);
  ctx.fillRect(x + bw - 1 * s, top, 1 * s, bh);
  // 위층 창
  houseWindow(ctx, x + bw * 0.2, top + 4 * s, 6 * s, 6.5 * s, s * 0.8, ['#f0b8c8', '#c08ab0']);
  houseWindow(ctx, x + bw * 0.8 - 6 * s, top + 4 * s, 6 * s, 6.5 * s, s * 0.8, ['#ffd8a8', '#e8a0a8']);
  // 진열창(따뜻한 불빛)
  const wy = top + bh * 0.52;
  ctx.fillStyle = vgrad(ctx, wy, y, [[0, '#ffeeb0'], [1, '#ffbe70']]);
  ctx.fillRect(x + bw * 0.1, wy, bw * 0.5, y - wy - 1 * s);
  ctx.fillStyle = tone(wall, -0.3);
  ctx.fillRect(x + bw * 0.7, wy + 1 * s, bw * 0.18, y - wy - 1 * s);
  // 차양
  const ay = top + bh * 0.4;
  const col = awn[i % awn.length];
  const n = 6;
  const aw = bw * 0.84;
  const ax = x + bw * 0.06;
  for (let j = 0; j < n; j++) {
    ctx.fillStyle = j % 2 ? '#fffaf0' : col;
    poly(ctx, [[ax + (aw * j) / n, ay], [ax + (aw * (j + 1)) / n, ay], [ax + (aw * (j + 1)) / n + 1.5 * s, ay + 7 * s], [ax + (aw * j) / n + 1.5 * s, ay + 7 * s]]);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ax + (aw * (j + 0.5)) / n + 1.5 * s, ay + 7 * s, aw / n / 2, 0, Math.PI);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(27,29,74,0.15)';
  ctx.fillRect(ax + 1.5 * s, ay + 7 * s + aw / n / 2, aw, 2 * s);
}

function waterTower(ctx, x, y, s) {
  ctx.strokeStyle = '#5a4a6a';
  ctx.lineWidth = 1.3 * s;
  ctx.beginPath();
  ctx.moveTo(x - 6 * s, y);
  ctx.lineTo(x - 5 * s, y - 9 * s);
  ctx.moveTo(x + 6 * s, y);
  ctx.lineTo(x + 5 * s, y - 9 * s);
  ctx.moveTo(x - 6 * s, y - 2 * s);
  ctx.lineTo(x + 5 * s, y - 8 * s);
  ctx.stroke();
  rrect(ctx, x - 7 * s, y - 21 * s, 14 * s, 13 * s, 2 * s);
  ctx.fillStyle = hgrad(ctx, x - 7 * s, x + 7 * s, [[0, '#e0a080'], [0.4, '#b07a6a'], [1, '#6a4a5a']]);
  ctx.fill();
  poly(ctx, [[x - 8 * s, y - 20 * s], [x, y - 27 * s], [x + 8 * s, y - 20 * s]]);
  ctx.fillStyle = hgrad(ctx, x - 8 * s, x + 8 * s, [[0, '#c08a7a'], [1, '#5a3a4a']]);
  ctx.fill();
}

/** 옥상 전광판(아이스크림 광고). */
function billboard(ctx, x, y, s) {
  const bw = 52 * s;
  const bh = 28 * s;
  const by = y - 10 * s - bh;
  ctx.fillStyle = '#4a4a7a';
  ctx.fillRect(x - bw * 0.3, y - 11 * s, 2.4 * s, 11 * s);
  ctx.fillRect(x + bw * 0.3 - 2.4 * s, y - 11 * s, 2.4 * s, 11 * s);
  rrect(ctx, x - bw / 2 - 2 * s, by - 2 * s, bw + 4 * s, bh + 4 * s, 2.5 * s);
  ctx.fillStyle = '#3a3a6a';
  ctx.fill();
  ctx.fillStyle = vgrad(ctx, by, by + bh, [[0, '#ffb8d0'], [1, '#ff8fb0']]);
  ctx.fillRect(x - bw / 2, by, bw, bh);
  // 아이스크림
  const ix = x - bw * 0.22;
  poly(ctx, [[ix - 5 * s, by + 13 * s], [ix + 5 * s, by + 13 * s], [ix, by + 26 * s]]);
  ctx.fillStyle = '#e8b070';
  ctx.fill();
  ball(ctx, ix - 2.5 * s, by + 11 * s, 4.5 * s, '#fff4dc', { lw: 0 });
  ball(ctx, ix + 2.5 * s, by + 11 * s, 4.5 * s, '#7fd8c4', { lw: 0 });
  ball(ctx, ix, by + 6 * s, 4.5 * s, '#ffe08a', { lw: 0 });
  // 글자 대신 줄 무늬
  ctx.fillStyle = '#ffffff';
  rrect(ctx, x - bw * 0.02, by + 7 * s, bw * 0.4, 4.5 * s, 2 * s);
  ctx.fill();
  ctx.fillStyle = withAlpha('#ffffff', 0.75);
  rrect(ctx, x - bw * 0.02, by + 15 * s, bw * 0.3, 3 * s, 1.5 * s);
  ctx.fill();
  rrect(ctx, x - bw * 0.02, by + 20.5 * s, bw * 0.36, 3 * s, 1.5 * s);
  ctx.fill();
  // 조명
  for (const fx of [-0.3, 0, 0.3]) {
    glow(ctx, x + bw * fx, by - 1 * s, 10 * s, '#fff0c0', 0.5);
  }
}

/** 언덕 위 천문대(흰 돔, 열린 틈의 망원경). (x, y) = 바닥 가운데. */
function observatory(ctx, x, y, s) {
  const bw = 24 * s;
  const bh = 24 * s;
  groundShadow(ctx, x + 5 * s, y, bw * 1.4, 5 * s, 0.35);
  // 몸통
  ctx.fillStyle = hgrad(ctx, x - bw, x + bw, [[0, '#f0dceb'], [0.4, '#bdb4dc'], [1, '#6a6aa8']]);
  ctx.fillRect(x - bw, y - bh, bw * 2, bh);
  ctx.fillStyle = withAlpha('#3a3a7a', 0.25);
  ctx.fillRect(x - bw, y - bh, bw * 2, 2.5 * s);
  // 창과 문(불빛)
  for (const fx of [-0.6, 0.45]) {
    glow(ctx, x + bw * fx, y - bh * 0.55, 10 * s, '#ffd88a', 0.4);
    rrect(ctx, x + bw * fx - 2.5 * s, y - bh * 0.7, 5 * s, 7 * s, 2.5 * s);
    ctx.fillStyle = '#ffe6a0';
    ctx.fill();
  }
  rrect(ctx, x - 4 * s, y - 13 * s, 8 * s, 13 * s, 4 * s);
  ctx.fillStyle = '#ffd890';
  ctx.fill();
  // 돔
  const g = ctx.createRadialGradient(x - bw * 0.45, y - bh - bw * 0.6, bw * 0.08, x, y - bh, bw * 1.1);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.35, '#e4e0f6');
  g.addColorStop(0.75, '#9a9ad0');
  g.addColorStop(1, '#5a5c98');
  ctx.beginPath();
  ctx.arc(x, y - bh, bw * 1.04, Math.PI, 0);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
  // 열린 틈과 망원경
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y - bh, bw * 1.04, Math.PI, 0);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = '#1e2252';
  ctx.fillRect(x + bw * 0.08, y - bh - bw * 1.1, bw * 0.3, bw * 1.1);
  ctx.restore();
  ctx.save();
  ctx.translate(x + bw * 0.23, y - bh - bw * 0.35);
  ctx.rotate(-0.7);
  rrect(ctx, -2.6 * s, -bw * 0.95, 5.2 * s, bw * 0.95, 1.5 * s);
  ctx.fillStyle = hgrad(ctx, -3 * s, 3 * s, [[0, '#e8e6f6'], [1, '#7a7ab0']]);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = withAlpha('#ffffff', 0.55);
  ctx.fillRect(x - bw * 1.04, y - bh - 1 * s, bw * 2.08, 1.6 * s);
}

/** 경찰 헬리콥터(live). (x, y) = 몸통 가운데. */
function helicopter(ctx, x, y, s, t) {
  const body = '#2f3f86';
  // 꼬리
  poly(ctx, [[x + 6 * s, y - 3 * s], [x + 30 * s, y - 5 * s], [x + 30 * s, y - 2 * s], [x + 6 * s, y + 3 * s]]);
  ctx.fillStyle = body;
  ctx.fill();
  poly(ctx, [[x + 27 * s, y - 4 * s], [x + 31 * s, y - 12 * s], [x + 34 * s, y - 12 * s], [x + 32 * s, y - 2 * s]]);
  ctx.fill();
  ctx.fillStyle = withAlpha('#dfe6ff', 0.35);
  ellipse(ctx, x + 31 * s, y - 6 * s, 5 * s, 5 * s);
  ctx.fill();
  // 몸통
  ctx.beginPath();
  ctx.ellipse(x, y, 13 * s, 8 * s, 0, 0, TAU);
  shade(ctx, body, x - 10 * s, y - 8 * s, x + 10 * s, y + 8 * s, { lw: 0, light: 0.4, dark: 0.3 });
  ctx.fillStyle = '#f4f6ff';
  ctx.fillRect(x - 6 * s, y + 1.5 * s, 18 * s, 2 * s);
  // 유리창
  ctx.beginPath();
  ctx.ellipse(x - 6.5 * s, y - 1.5 * s, 6 * s, 5 * s, -0.25, 0, TAU);
  ctx.fillStyle = vgrad(ctx, y - 6 * s, y + 3 * s, [[0, '#dff4ff'], [1, '#6fa8e0']]);
  ctx.fill();
  // 썰매다리
  ctx.strokeStyle = '#3a3f70';
  ctx.lineWidth = 1.3 * s;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - 6 * s, y + 7 * s);
  ctx.lineTo(x - 7 * s, y + 11 * s);
  ctx.moveTo(x + 5 * s, y + 7 * s);
  ctx.lineTo(x + 6 * s, y + 11 * s);
  ctx.moveTo(x - 12 * s, y + 11 * s);
  ctx.lineTo(x + 10 * s, y + 11 * s);
  ctx.stroke();
  // 회전 날개
  ctx.fillStyle = body;
  ctx.fillRect(x - 1 * s, y - 11 * s, 2 * s, 4 * s);
  ctx.fillStyle = withAlpha('#dfe6ff', 0.28);
  ellipse(ctx, x, y - 11 * s, 30 * s, 2.6 * s);
  ctx.fill();
  const L = Math.cos(t * 31) * 30 * s;
  ctx.strokeStyle = withAlpha('#2a3366', 0.8);
  ctx.lineWidth = 1.6 * s;
  ctx.beginPath();
  ctx.moveTo(x - L, y - 11 * s);
  ctx.lineTo(x + L, y - 11 * s);
  ctx.stroke();
  // 경광등
  const red = Math.sin(t * 8) > 0;
  ctx.fillStyle = red ? '#ff5a5a' : '#5a8aff';
  ctx.fillRect(x - 2 * s, y - 9 * s, 4 * s, 1.6 * s);
}

// ───────── 움직이는 부분 ─────────

function drawTwinkles(ctx, list, t) {
  for (const s of list) {
    const k = 0.5 + 0.5 * Math.sin(t * s.sp + s.ph);
    if (k < 0.3) continue;
    ctx.fillStyle = withAlpha('#ffffff', k * 0.9);
    star(ctx, s.x, s.y, s.r * k, s.r * k * 0.25, 4, 0);
    ctx.fill();
  }
}

function birds(ctx, e, t, col, n) {
  const { w, k, pf } = e;
  ctx.strokeStyle = col;
  ctx.lineWidth = 1.6 * k;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 0; i < n; i++) {
    const x = ((t * (10 + i * 3) + i * 137) % (w + 80)) - 40;
    const y = HUD + pf * (0.36 + i * 0.07) + Math.sin(t * 0.8 + i * 2) * 6;
    const f = Math.sin(t * 7 + i * 1.7);
    const s = k * (1 - i * 0.12);
    ctx.beginPath();
    ctx.moveTo(x - 6 * s, y - 1 * s + f * 2.2 * s);
    ctx.quadraticCurveTo(x - 3 * s, y - 3 * s - f * 1.2 * s, x, y);
    ctx.quadraticCurveTo(x + 3 * s, y - 3 * s - f * 1.2 * s, x + 6 * s, y - 1 * s + f * 2.2 * s);
    ctx.stroke();
  }
}

function flame(ctx, x, y, hw, ht, col, sway) {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x - hw, y);
  ctx.quadraticCurveTo(x - hw * 1.1, y - ht * 0.5, x + sway, y - ht);
  ctx.quadraticCurveTo(x + hw * 1.1, y - ht * 0.5, x + hw, y);
  ctx.closePath();
  ctx.fill();
}

const LIVE = {
  farm(ctx, e, t) {
    drawDrifters(ctx, e, t, TINT.day);
    birds(ctx, e, t, '#ffffff', 3);
    if (e.boat) boat(ctx, e.boat.x + Math.sin(t * 0.09) * e.boat.span, e.boat.y, e.k, t);
    if (e.mill) sails(ctx, e.mill, t * 0.8);
  },
  suburb(ctx, e, t) {
    drawDrifters(ctx, e, t, TINT.warm);
    birds(ctx, e, t, '#4a5a9a', e.birds || 2);
  },
  camp(ctx, e, t) {
    drawDrifters(ctx, e, t, TINT.gold);
    for (const g of e.glints || []) {
      const a = Math.sin(t * g.sp + g.ph);
      if (a < 0.4) continue;
      ctx.fillStyle = withAlpha('#fffbe0', (a - 0.4) * 1.5);
      star(ctx, g.x, g.y, 4 * e.k * a, 0.8 * e.k, 4, 0);
      ctx.fill();
    }
    if (!e.fire) return;
    const { x, y } = e.fire;
    const k = e.k;
    const f = 1 + Math.sin(t * 13) * 0.1 + Math.sin(t * 7.3) * 0.08;
    glow(ctx, x, y - 8 * k, 62 * k * f, '#ffb04a', 0.3);
    flame(ctx, x, y, 9 * k, 26 * k * f, '#ff7a3a', Math.sin(t * 9) * 2.5 * k);
    flame(ctx, x - 1 * k, y, 6 * k, 17 * k * f, '#ffb347', Math.sin(t * 11 + 1) * 2 * k);
    flame(ctx, x, y, 3.5 * k, 10 * k * f, '#ffe88a', Math.sin(t * 13 + 2) * 1.2 * k);
    for (let i = 0; i < 4; i++) {
      const q = (t * 0.55 + i / 4) % 1;
      ctx.fillStyle = withAlpha('#ffd08a', 1 - q);
      ctx.fillRect(x + Math.sin(q * 9 + i * 2) * 7 * k, y - 22 * k - q * 40 * k, 1.8 * k, 1.8 * k);
    }
    for (let i = 0; i < 3; i++) {
      const q = (t * 0.22 + i / 3) % 1;
      circle(ctx, x + Math.sin(q * 4 + i) * 6 * k + q * 14 * k, y - 34 * k - q * 70 * k, (4 + q * 9) * k);
      ctx.fillStyle = withAlpha('#e8e0f0', 0.28 * (1 - q));
      ctx.fill();
    }
  },
  city(ctx, e, t) {
    const { w, k } = e;
    drawDrifters(ctx, e, t, TINT.sunset);
    for (const [i, b] of (e.beacons || []).entries()) {
      const on = Math.sin(t * 3 + i * 1.7) > 0.2;
      if (on) glow(ctx, b.x, b.y, 7 * b.r, '#ff6b5e', 0.65);
      ctx.fillStyle = on ? '#ff8a7a' : '#8a4a6a';
      circle(ctx, b.x, b.y, b.r);
      ctx.fill();
    }
    if (!e.heli) return;
    // 헬리콥터와 탐조등
    const hs = k * 1.3;
    const hx = w * 0.8 + Math.sin(t * 0.31) * w * 0.06;
    const hy = e.heli.y + Math.sin(t * 0.63) * 8 * k;
    const lx = hx - 10 * hs;
    const ly = hy + 6 * hs;
    const ang = 0.24 + Math.sin(t * 0.55) * 0.2; // 아래 왼쪽 거리를 훑는다
    const len = (e.G - ly - e.D * 0.15) / Math.cos(ang);
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(ang);
    const spread = len * 0.2;
    const g = ctx.createLinearGradient(0, 0, 0, len);
    g.addColorStop(0, 'rgba(255,250,220,0.4)');
    g.addColorStop(1, 'rgba(255,250,220,0.06)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-1.5 * k, 0);
    ctx.lineTo(1.5 * k, 0);
    ctx.lineTo(spread, len);
    ctx.quadraticCurveTo(0, len + spread * 0.3, -spread, len);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    glow(ctx, lx - Math.sin(ang) * len, ly + Math.cos(ang) * len, len * 0.22, '#fff6d8', 0.22);
    helicopter(ctx, hx, hy, hs, t);
  },
  observatory(ctx, e, t) {
    drawTwinkles(ctx, e.tw, t);
    // 가끔 지나가는 유성
    const q = (t % 8) / 0.8;
    if (q < 1) {
      const x = e.w * (0.12 + 0.45 * q);
      const y = HUD + e.pf * (0.02 + 0.14 * q);
      const g = ctx.createLinearGradient(x, y, x - 50 * e.k, y - 16 * e.k);
      g.addColorStop(0, withAlpha('#ffffff', 0.95 * (1 - q)));
      g.addColorStop(1, withAlpha('#ffffff', 0));
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 50 * e.k, y - 16 * e.k);
      ctx.stroke();
    }
    // 반딧불
    for (const f of e.flies || []) {
      const a = 0.5 + 0.5 * Math.sin(t * f.sp + f.ph);
      if (a < 0.25) continue;
      const x = f.x + Math.sin(t * 0.7 + f.ph) * 10;
      const y = f.y + Math.sin(t * 1.1 + f.ph * 2) * 5;
      glow(ctx, x, y, 7 * e.k, '#e6ff8a', 0.55 * a);
      ctx.fillStyle = withAlpha('#f6ffc0', a);
      ctx.fillRect(x - 0.9, y - 0.9, 1.8, 1.8);
    }
  },
  cloudsea(ctx, e, t) {
    const { w } = e;
    for (const c of e.wisps || []) {
      const span = w + c.cw * 1.4;
      const x = ((t * c.sp + c.off) % span) - c.cw * 0.7;
      drawWisp(ctx, c.blobs, x, c.y, '#ffffff', '#d4e0f8', c.a);
    }
    // 멀리 지나가는 비행기와 비행운
    const p = e.plane;
    if (p) {
      const x = ((t * 9 + p.off) % (w + 200)) - 100;
      const y = p.y - x * 0.04;
      ctx.fillStyle = hgrad(ctx, x - 70 * e.k, x, [[0, 'rgba(255,255,255,0)'], [1, 'rgba(255,255,255,0.75)']]);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-0.04);
      ctx.fillRect(-70 * e.k, -1 * e.k, 68 * e.k, 2 * e.k);
      ctx.fillStyle = '#f4f6ff';
      rrect(ctx, -2 * e.k, -1.6 * e.k, 9 * e.k, 3.2 * e.k, 1.6 * e.k);
      ctx.fill();
      ctx.fillStyle = '#c4cce8';
      poly(ctx, [[1 * e.k, 0], [4 * e.k, 0], [0, 5 * e.k]]);
      ctx.fill();
      ctx.restore();
    }
  },
  orbit(ctx, e, t) {
    const { w, k, pf } = e;
    drawTwinkles(ctx, e.tw, t);
    // 천천히 지나가는 우주 정거장
    const x = ((t * 11) % (w + 120)) - 60;
    const y = HUD + pf * 0.34 + Math.sin(x * 0.006) * 14;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.12);
    ctx.fillStyle = '#c8cce8';
    ctx.fillRect(-9 * k, -0.6 * k, 18 * k, 1.2 * k);
    for (const sx of [-1, 1]) {
      ctx.fillStyle = hgrad(ctx, sx * 4 * k, sx * 12 * k, [[0, '#6f8fe0'], [1, '#3a58b0']]);
      ctx.fillRect(sx > 0 ? 4 * k : -12 * k, -4 * k, 8 * k, 3 * k);
      ctx.fillRect(sx > 0 ? 4 * k : -12 * k, 1 * k, 8 * k, 3 * k);
    }
    rrect(ctx, -3 * k, -1.8 * k, 6 * k, 3.6 * k, 1.5 * k);
    ctx.fillStyle = '#eef0ff';
    ctx.fill();
    ctx.restore();
    const gl = Math.sin(t * 1.7);
    if (gl > 0.85) {
      const a = (gl - 0.85) / 0.15;
      glow(ctx, x, y, 12 * k, '#ffffff', 0.6 * a);
      ctx.fillStyle = withAlpha('#ffffff', a);
      star(ctx, x, y, 8 * k * a, 1 * k, 4, 0);
      ctx.fill();
    }
  },
};

// ───────── 무대별 움직임 준비(위치는 고정 시드) ─────────

function twinkles(rng, n, w, y0, y1, r0 = 2.2) {
  return Array.from({ length: n }, () => ({ x: rng() * w, y: y0 + rng() * (y1 - y0), ph: rng() * TAU, sp: 1.2 + rng() * 2, r: r0 + rng() * 2.4 }));
}

const PREP = {
  farm(e, rng) {
    e.drift = drifters(rng, e, [[-0.18, 0.5, 70, 6], [0.24, 0.42, 52, 4.2]]);
  },
  suburb(e, rng) {
    e.drift = drifters(rng, e, [[-0.15, 0.48, 66, 5.5], [0.3, 0.36, 46, 3.8]]);
  },
  camp(e, rng) {
    e.drift = drifters(rng, e, [[-0.12, 0.46, 60, 5], [0.46, 0.3, 34, 3.4]]);
  },
  city(e, rng) {
    e.drift = drifters(rng, e, [[0.02, 0.44, 50, 4.6]]);
  },
  observatory(e, rng) {
    e.tw = twinkles(rng, 16, e.w, 0, e.hz * 0.55);
    e.flies = Array.from({ length: 6 }, () => ({ x: rng() * e.w, y: e.G - e.D * (0.04 + rng() * 0.3), ph: rng() * TAU, sp: 1.5 + rng() * 2 }));
  },
  cloudsea(e, rng) {
    e.wisps = [[0.22, 0.5, 14, 7, 0.55], [0.5, 0.36, 10, 11, 0.45], [0.74, 0.44, 16, 15, 0.6]].map(([yf, cwf, ch, sp, a]) => {
      const cw = e.w * cwf;
      return { blobs: wispShape(rng, cw, ch * e.k), y: HUD + e.pf * yf, cw, sp, a, off: rng() * (e.w + cw) };
    });
    e.plane = { y: HUD + e.pf * 0.3, off: rng() * 300 };
  },
  orbit(e, rng) {
    e.tw = twinkles(rng, 16, e.w, 0, e.G - e.pf * 0.25);
  },
};

/**
 * 무대 배경을 만든다.
 * @param {string} stage 무대 이름(farm, suburb, camp, city, observatory, cloudsea, orbit)
 * @param {number} w 화면 너비(CSS px)
 * @param {number} h 화면 높이(CSS px)
 * @param {number} groundY 땅 높이(지구인이 서는 줄)
 * @returns {{paint: (ctx: CanvasRenderingContext2D) => void, live: (ctx: CanvasRenderingContext2D, t: number) => void}}
 */
export function makeBackdrop(stage, w, h, groundY) {
  const G = groundY;
  const pf = Math.max(150, G - HUD);
  const D = clamp(pf * 0.36, 95, 240);
  const e = {
    w,
    h,
    G,
    pf,
    D,
    hz: G - D, // 수평선
    k: clamp(Math.min(w / 390, 0.35 + (0.65 * D) / 176), 0.68, 1.25), // 소품 크기 배율
    kv: clamp(D / 176, 0.55, 1.2), // 키 큰 것(산·빌딩)의 높이 배율
    band: clamp(h * 0.065, 30, 56), // 조작부 위로 보이는 땅 띠
  };
  const seed = STAGE_SEED[stage] || 1;
  PREP[stage]?.(e, seededRng(seed * 7 + 3));
  return {
    paint(ctx) {
      ctx.save();
      PAINT[stage](ctx, e, seededRng(seed));
      ctx.restore();
    },
    live(ctx, t) {
      ctx.save();
      LIVE[stage]?.(ctx, e, t);
      ctx.restore();
    },
  };
}
