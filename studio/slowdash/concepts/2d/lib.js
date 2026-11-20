// 2D 카툰 셀 셰이딩 미니 라이브러리 — 베지어/스플라인 도형, 굵기 변하는 외곽선, 2단 셀 명암, 림라이트
const TAU = Math.PI * 2;
let X;                       // 현재 그리는 컨텍스트
let LX = 0.55, LY = -0.83;   // 빛이 오는 방향(달: 오른쪽 위)
let INKS = 1;                // 외곽선 굵기 배율
const INK = '#17132e';

function mkR(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function sstep(a, b, x) { x = Math.max(0, Math.min(1, (x - a) / (b - a))); return x * x * (3 - 2 * x); }
function lerp(a, b, t) { return a + (b - a) * t; }

function setup(id, w, h) {
  const c = document.getElementById(id); c.width = w * 2; c.height = h * 2; c.style.width = w + 'px'; c.style.height = h + 'px';
  const x = c.getContext('2d'); x.scale(2, 2); x.lineJoin = 'round'; x.lineCap = 'round'; return x;
}
function offscreen(w, h) { const c = document.createElement('canvas'); c.width = w * 2; c.height = h * 2; const x = c.getContext('2d'); x.scale(2, 2); return [c, x]; }

// 카디널 스플라인: [x,y,corner?] 제어점 → 촘촘한 점들
function spline(ctrl, closed = true, seg = 10, ten = 0.5) {
  const n = ctrl.length, out = [];
  const P = i => closed ? ctrl[(i + n) % n] : ctrl[Math.max(0, Math.min(n - 1, i))];
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    let m1x = (p2[0] - p0[0]) * ten, m1y = (p2[1] - p0[1]) * ten, m2x = (p3[0] - p1[0]) * ten, m2y = (p3[1] - p1[1]) * ten;
    if (p1[2]) { m1x *= .15; m1y *= .15; } if (p2[2]) { m2x *= .15; m2y *= .15; }
    for (let s = 0; s < seg; s++) {
      const t = s / seg, t2 = t * t, t3 = t2 * t, h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
      out.push([h00 * p1[0] + h10 * m1x + h01 * p2[0] + h11 * m2x, h00 * p1[1] + h10 * m1y + h01 * p2[1] + h11 * m2y]);
    }
  }
  if (!closed) out.push([ctrl[n - 1][0], ctrl[n - 1][1]]);
  return out;
}
function ell(cx, cy, rx, ry, rot = 0, n = 44) {
  const o = [], c = Math.cos(rot), s = Math.sin(rot);
  for (let i = 0; i < n; i++) { const a = i / n * TAU, x = Math.cos(a) * rx, y = Math.sin(a) * ry; o.push([cx + x * c - y * s, cy + x * s + y * c]); }
  return o;
}
function path(p, closed = true) { const P = new Path2D(); P.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) P.lineTo(p[i][0], p[i][1]); if (closed) P.closePath(); return P; }
function cen(p) { let x = 0, y = 0; for (const q of p) { x += q[0]; y += q[1]; } return [x / p.length, y / p.length]; }
function xf(p, dx, dy, s = 1) { const c = cen(p); return p.map(q => [c[0] + (q[0] - c[0]) * s + dx, c[1] + (q[1] - c[1]) * s + dy]); }
function area(p) { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[i], r = p[(i + 1) % p.length]; a += q[0] * r[1] - r[0] * q[1]; } return a / 2; }
function tangents(p, closed) {
  const n = p.length, T = [];
  for (let i = 0; i < n; i++) {
    const a = closed ? p[(i - 1 + n) % n] : p[Math.max(0, i - 1)], b = closed ? p[(i + 1) % n] : p[Math.min(n - 1, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; T.push([tx / l, ty / l]);
  }
  return T;
}

// 굵기가 변하는 외곽선: 빛 쪽은 가늘게(거의 사라짐), 그림자 쪽은 굵게 + 손떨림
function ink(p, w = 2.2, col = INK, lost = 0.22) {
  w *= INKS; const n = p.length, sg = area(p) > 0 ? 1 : -1, T = tangents(p, true), O = [], I = [];
  const ph = p[0][0] * 0.37 + p[0][1] * 0.11;
  for (let i = 0; i < n; i++) {
    const nx = T[i][1] * sg, ny = -T[i][0] * sg;
    const f = -(nx * LX + ny * LY);
    let k = lost + (1 - lost) * sstep(-0.55, 0.85, f);
    k *= 0.86 + 0.14 * Math.sin(i * 0.55 + ph);
    const ww = w * k;
    O.push([p[i][0] + nx * ww * 0.62, p[i][1] + ny * ww * 0.62]);
    I.push([p[i][0] - nx * ww * 0.38, p[i][1] - ny * ww * 0.38]);
  }
  const P = new Path2D(); P.moveTo(O[0][0], O[0][1]); for (let i = 1; i < n; i++) P.lineTo(O[i][0], O[i][1]); P.closePath();
  P.moveTo(I[n - 1][0], I[n - 1][1]); for (let i = n - 2; i >= 0; i--) P.lineTo(I[i][0], I[i][1]); P.closePath();
  X.fillStyle = col; X.fill(P, 'nonzero');
}

// 양 끝이 가는 붓선 (열린 선)
function taper(p, w, col, a = 0.35, b = 0.35, minw = 0) {
  const n = p.length; if (n < 2) return; const s = [0];
  for (let i = 1; i < n; i++) s.push(s[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
  const L = s[n - 1] || 1, T = tangents(p, false), Lp = [], Rp = [];
  for (let i = 0; i < n; i++) {
    const t = s[i] / L; let k = 1;
    if (a > 0) k *= Math.sin(Math.min(1, t / a) * Math.PI / 2);
    if (b > 0) k *= Math.sin(Math.min(1, (1 - t) / b) * Math.PI / 2);
    const ww = Math.max(minw, w * k) / 2, tx = T[i][0], ty = T[i][1];
    Lp.push([p[i][0] - ty * ww, p[i][1] + tx * ww]); Rp.push([p[i][0] + ty * ww, p[i][1] - tx * ww]);
  }
  X.beginPath(); X.moveTo(Lp[0][0], Lp[0][1]); for (const q of Lp) X.lineTo(q[0], q[1]);
  for (let i = n - 1; i >= 0; i--) X.lineTo(Rp[i][0], Rp[i][1]); X.closePath(); X.fillStyle = col; X.fill();
}
function stroke(ctrl, w, col = INK, a = .35, b = .35) { taper(spline(ctrl, false, 8), w * INKS, col, a, b); }

// 둥근 끝 막대(팔·다리)
function capsule(ctrl, w0, w1 = w0) {
  const cl = ctrl.length > 2 ? spline(ctrl, false, 8) : (() => { const o = []; for (let i = 0; i <= 10; i++) o.push([lerp(ctrl[0][0], ctrl[1][0], i / 10), lerp(ctrl[0][1], ctrl[1][1], i / 10)]); return o; })();
  const n = cl.length, T = tangents(cl, false), L = [], Rr = [];
  for (let i = 0; i < n; i++) { const w = lerp(w0, w1, i / (n - 1)) / 2, [tx, ty] = T[i]; L.push([cl[i][0] - ty * w, cl[i][1] + tx * w]); Rr.push([cl[i][0] + ty * w, cl[i][1] - tx * w]); }
  const out = [...L];
  { const [tx, ty] = T[n - 1], we = w1 / 2, c = cl[n - 1]; for (let k = 1; k < 9; k++) { const a = k / 9 * Math.PI; out.push([c[0] - ty * Math.cos(a) * we + tx * Math.sin(a) * we, c[1] + tx * Math.cos(a) * we + ty * Math.sin(a) * we]); } }
  for (let i = n - 1; i >= 0; i--) out.push(Rr[i]);
  { const [tx, ty] = T[0], ws = w0 / 2, c = cl[0]; for (let k = 1; k < 9; k++) { const a = k / 9 * Math.PI; out.push([c[0] + ty * Math.cos(a) * ws - tx * Math.sin(a) * ws, c[1] - tx * Math.cos(a) * ws - ty * Math.sin(a) * ws]); } }
  return out;
}
// 리본(목도리 꼬리): 폭 함수 + 뾰족한 끝
function ribbon(ctrl, wf, tip = 5) {
  const cl = spline(ctrl, false, 10), n = cl.length, T = tangents(cl, false), L = [], Rr = [];
  for (let i = 0; i < n; i++) { const w = wf(i / (n - 1)) / 2, [tx, ty] = T[i]; L.push([cl[i][0] - ty * w, cl[i][1] + tx * w]); Rr.push([cl[i][0] + ty * w, cl[i][1] - tx * w]); }
  const e = cl[n - 1], [tx, ty] = T[n - 1];
  return [...L, [e[0] + tx * tip, e[1] + ty * tip], ...Rr.reverse()];
}

// 셀 셰이딩: 기본색 → 그림자 초승달(빛 반대쪽) → 짙은 그림자 → 림라이트 → 하이라이트 → 굵기 변하는 외곽선
function cel(p, o) {
  const P = path(p);
  X.fillStyle = o.b; X.fill(P);
  X.save(); X.clip(P);
  if (o.g) { X.fillStyle = o.g; X.fill(P); }
  const d = o.d ?? 4;
  if (o.s) { const q = new Path2D(P); q.addPath(path(xf(p, LX * d, LY * d, o.ss ?? 1.03))); X.fillStyle = o.s; X.fill(q, 'evenodd'); }
  if (o.s2) { const d2 = o.d2 ?? d * 0.4; const q = new Path2D(P); q.addPath(path(xf(p, LX * d2, LY * d2, o.ss2 ?? 1))); X.fillStyle = o.s2; X.fill(q, 'evenodd'); }
  if (o.f) o.f(P);
  if (o.r) { const dr = o.dr ?? 1.4; const q = new Path2D(P); q.addPath(path(xf(p, LX * dr, LY * dr))); X.fillStyle = o.r; X.fill(q, 'evenodd'); }
  if (o.lt) { const dl = o.dl ?? 1.6; const q = new Path2D(P); q.addPath(path(xf(p, -LX * dl, -LY * dl))); X.fillStyle = o.lt; X.fill(q, 'evenodd'); }
  if (o.h) for (const h of o.h) { X.fillStyle = h[5] || 'rgba(255,255,255,.9)'; X.beginPath(); X.ellipse(h[0], h[1], h[2], h[3], h[4] || 0, 0, TAU); X.fill(); }
  X.restore();
  if (o.w !== 0) ink(p, o.w ?? 2.2, o.ic || INK, o.lost ?? 0.22);
}
function dot(x, y, r, col) { X.fillStyle = col; X.beginPath(); X.arc(x, y, r, 0, TAU); X.fill(); }
function oval(x, y, rx, ry, col, rot = 0) { X.fillStyle = col; X.beginPath(); X.ellipse(x, y, rx, ry, rot, 0, TAU); X.fill(); }
function starPts(cx, cy, r, ir = 0.48, rot = -Math.PI / 2) { const o = []; for (let i = 0; i < 10; i++) { const a = rot + i / 10 * TAU, rr = i % 2 ? r * ir : r; o.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 0]); } return spline(o.map((q, i) => [q[0], q[1], 1]), true, 3, 0.18); }
function gearPts(cx, cy, r, teeth, rot = 0) { const o = [], n = teeth * 4; for (let i = 0; i < n; i++) { const a = rot + (i + 0.5) / n * TAU, k = i % 4, rr = (k === 0 || k === 1) ? r : r * 0.76; o.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); } return o; }
