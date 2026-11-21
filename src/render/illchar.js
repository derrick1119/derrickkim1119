// 일러스트 그림체(시험판)의 인물·도깨비·도깨비불. ART.illust 일 때만 sprites.js 가 이 그림을 쓴다
// 종이 인형(2.5등신, 정면)과 달리 4.7등신쯤의 3/4 측면(오른쪽을 본다)에 짙은 먹선과 셀 음영(빛은 앞 위에서)
// 사람의 좌표: 발바닥 y=0, 허리 -33, 어깨 -45, 목 축 -47.5, 정수리 -64. 손(무기 잡는 자리)은 ILL_HAND
import { TAU, RED, OCHRE, INDIGO, st } from './draw.js';
import { dk, lt } from './figures.js';

const PI = Math.PI;
export const LN = '#1b1526';            // 먹선
const SKIN = '#f0c8a0', HAIR = '#221b2a', WHITE = '#f3efe6', GOLD = '#e0b04a', WOOD = '#7a4a2c';

// ───────── 붓 ─────────
// 매끈한 곡선 (Catmull-Rom). 같은 점을 두 번 쓰면 뾰족한 모서리가 된다
function spline(p, a, closed) {
  const n = a.length / 2, X = i => a[((i % n) + n) % n * 2], Y = i => a[((i % n) + n) % n * 2 + 1];
  p.moveTo(a[0], a[1]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const i0 = closed ? i - 1 : Math.max(0, i - 1), i3 = closed ? i + 2 : Math.min(n - 1, i + 2);
    p.bezierCurveTo(X(i) + (X(i + 1) - X(i0)) / 6, Y(i) + (Y(i + 1) - Y(i0)) / 6, X(i + 1) - (X(i3) - X(i)) / 6, Y(i + 1) - (Y(i3) - Y(i)) / 6, X(i + 1), Y(i + 1));
  }
  if (closed) p.closePath();
}
const S = (...a) => p => spline(p, a, true);       // 닫힌 곡선
const O = (...a) => p => spline(p, a, false);      // 열린 곡선
const PG = (...a) => p => { p.moveTo(a[0], a[1]); for (let i = 2; i < a.length; i += 2) p.lineTo(a[i], a[i + 1]); p.closePath(); };
const EL = (x, y, rx, ry, r = 0) => p => p.ellipse(x, y, rx, ry, r, 0, TAU);
// 셀 음영 한 조각: 바탕 → (안쪽에만) 그늘·빛 → 먹선
function cel(g, fn, col, sh, o = {}) {
  g.beginPath(); fn(g); g.fillStyle = col; g.fill();
  if (sh || o.hi) {
    g.save(); g.beginPath(); fn(g); g.clip();
    if (sh) { g.beginPath(); sh(g); g.fillStyle = o.sc || dk(col, o.k === undefined ? 0.3 : o.k); g.fill(); }
    if (o.hi) { g.beginPath(); o.hi(g); g.fillStyle = o.hc || lt(col, o.hk === undefined ? 0.4 : o.hk); g.fill(); }
    g.restore();
  }
  if (o.lw !== 0) { g.beginPath(); fn(g); st(g, o.line || LN, o.lw || 0.85); }
}
const ln = (g, fn, col = LN, lw = 0.7) => { g.beginPath(); fn(g); st(g, col, lw); };
const dot = (g, x, y, r, col) => { g.beginPath(); g.ellipse(x, y, r, r, 0, 0, TAU); g.fillStyle = col; g.fill(); };
// 팔·다리: 세 점(어깨·팔꿈치·손)을 따라 굵기가 줄어드는 관
function limb(ax, ay, bx, by, cx, cy, w0, w1, w2) {
  const nrm = (x1, y1, x2, y2) => { const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; };
  const n0 = nrm(ax, ay, bx, by), n2 = nrm(bx, by, cx, cy); let n1 = [n0[0] + n2[0], n0[1] + n2[1]]; const l1 = Math.hypot(n1[0], n1[1]) || 1; n1 = [n1[0] / l1, n1[1] / l1];
  return S(ax + n0[0] * w0, ay + n0[1] * w0, bx + n1[0] * w1, by + n1[1] * w1, cx + n2[0] * w2, cy + n2[1] * w2, cx - n2[0] * w2, cy - n2[1] * w2, bx - n1[0] * w1, by - n1[1] * w1, ax - n0[0] * w0, ay - n0[1] * w0);
}
// 팔꿈치: 어깨(s)와 손(h) 사이, bend=1 이면 아래·뒤로 굽는다
function elbow(sx, sy, hx, hy, L1, L2, bend = 1) {
  const dx = hx - sx, dy = hy - sy, D = Math.hypot(dx, dy) || 1, d = Math.min(D, L1 + L2 - 0.05), ux = dx / D, uy = dy / D;
  const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  return [sx + ux * a - uy * h * bend, sy + uy * a + ux * h * bend];
}
// 띠·댕기: 가운뎃줄을 따라 너비 w 의 천 (끝은 가늘게, cut 이면 제비꼬리)
function ribbon(g, pts, w, col, o = {}) {
  const n = pts.length / 2, L = [], R = [];
  for (let i = 0; i < n; i++) {
    const x = pts[i * 2], y = pts[i * 2 + 1], j0 = Math.max(0, i - 1), j1 = Math.min(n - 1, i + 1), dx = pts[j1 * 2] - pts[j0 * 2], dy = pts[j1 * 2 + 1] - pts[j0 * 2 + 1], l = Math.hypot(dx, dy) || 1;
    const k = w * (o.taper === false ? 1 : 1 - 0.45 * i / (n - 1)) * (o.wave ? 1 + 0.35 * Math.sin(i * 1.9) : 1);
    L.push(x - dy / l * k, y + dx / l * k); R.push(x + dy / l * k, y - dx / l * k);
  }
  const tip = o.cut ? [pts[n * 2 - 2] - (pts[n * 2 - 2] - pts[n * 2 - 4]) * 0.5, pts[n * 2 - 1] - (pts[n * 2 - 1] - pts[n * 2 - 3]) * 0.5] : null;
  const outline = [];
  for (let i = 0; i < n; i++) outline.push(L[i * 2], L[i * 2 + 1]);
  if (tip) outline.push(L[n * 2 - 2], L[n * 2 - 1], tip[0], tip[1], tip[0], tip[1]);
  for (let i = n - 1; i >= 0; i--) outline.push(R[i * 2], R[i * 2 + 1]);
  const half = []; for (let i = 0; i < n; i++) half.push(pts[i * 2], pts[i * 2 + 1]); for (let i = n - 1; i >= 0; i--) half.push(R[i * 2], R[i * 2 + 1]);
  cel(g, PG(...outline), col, PG(...half), { k: 0.26, lw: o.lw || 0.75 });
}

// ───────── 얼굴 ─────────
// 눈: (cx,cy) 가운데, w 너비, h 높이, up 눈꼬리 올림, outerL 이면 바깥 눈꼬리가 왼쪽(가까운 눈)
function eye(g, cx, cy, w, h, up, outerL, o) {
  const lx = cx - w / 2, rx = cx + w / 2, ly = cy - (outerL ? up : 0), ry = cy - (outerL ? 0 : up);
  if (o.blink) { ln(g, p => { p.moveTo(lx, ly + 0.2); p.quadraticCurveTo(cx, cy + h * 0.55, rx, ry + 0.2); }, LN, 0.8); return; }
  const white = p => { p.moveTo(lx, ly); p.quadraticCurveTo(cx, cy - h * 1.3, rx, ry); p.quadraticCurveTo(cx, cy + h * 0.75, lx, ly); p.closePath(); };
  g.beginPath(); white(g); g.fillStyle = o.glow ? '#fff3a0' : '#f7f3ec'; g.fill();
  g.save(); g.beginPath(); white(g); g.clip();
  const ix = cx + w * (o.look === undefined ? 0.14 : o.look), iy = cy - h * 0.12;
  g.beginPath(); g.ellipse(ix, iy, w * 0.25, h * 0.72, 0, 0, TAU); g.fillStyle = o.iris || '#5a3426'; g.fill();
  g.beginPath(); g.ellipse(ix, iy - h * 0.12, w * 0.15, h * 0.48, 0, 0, TAU); g.fillStyle = o.glow ? '#b8320e' : '#140c14'; g.fill();
  g.restore();
  dot(g, ix - w * 0.07, iy - h * 0.3, Math.max(0.28, w * 0.1), '#ffffff');
  // 윗눈꺼풀은 굵게, 바깥 눈꼬리를 살짝 뺀다
  ln(g, p => { p.moveTo(lx - (outerL ? 0.4 : 0), ly + (outerL ? 0.25 : 0)); p.quadraticCurveTo(cx, cy - h * 1.32, rx + (outerL ? 0 : 0.4), ry + (outerL ? 0 : 0.25)); }, LN, o.lash ? 1.05 : 0.85);
  if (o.lash) ln(g, p => { const x0 = outerL ? lx : rx, y0 = outerL ? ly : ry, s = outerL ? -1 : 1; p.moveTo(x0, y0); p.lineTo(x0 + s * 0.9, y0 - 0.6); }, LN, 0.6);
}
const BROW = { stern: [0.8, -0.7], calm: [0.1, 0], soft: [-0.3, 0.2], worry: [-0.8, 0.5], fierce: [1.3, -1.1], flat: [0.3, -0.2] };
function face(g, o, skin) {
  const f = o.face || {}, eo = { blink: o.blink, iris: f.iris, lash: f.lash, glow: f.glow }, W = f.eyeW || 3.3, H = f.eyeH || 1.75, up = f.up === undefined ? 0.35 : f.up;
  if (f.eye === 'closed') { for (const [x, w] of [[2.0, 2.4], [5.8, 1.4]]) ln(g, p => { p.moveTo(x - w / 2, -57.3); p.quadraticCurveTo(x, -56.5, x + w / 2, -57.3); }, LN, 0.75); }
  else { eye(g, 1.9, -57.1, W, H, up, true, eo); eye(g, 6.0, -57.0, W * 0.55, H * 0.95, up, false, eo); }
  // 눈썹: 안쪽(코 쪽) 끝을 내리면 엄한 얼굴
  const [d, a] = BROW[f.brow] || BROW.calm, bc = f.browCol || (o.hairCol || HAIR), bw = f.thick ? 1.25 : 0.85;
  ln(g, p => { p.moveTo(0.3, -59.4 - a * 0.5); p.quadraticCurveTo(1.8, -60.3 - a * 0.3, 3.5, -59.6 + d * 0.5); }, bc, bw);
  ln(g, p => { p.moveTo(5.0, -59.7 + d * 0.45); p.quadraticCurveTo(5.9, -60.2, 6.8, -59.8 - a * 0.3); }, bc, bw * 0.85);
  // 코·입
  ln(g, p => { p.moveTo(6.9, -56.2); p.quadraticCurveTo(7.4, -55.2, 6.6, -54.8); }, dk(skin, 0.45), 0.6);
  const mc = f.lip || dk(skin, 0.5);
  if (f.mouth === 'grin') { cel(g, S(4.0, -52.6, 6.2, -52.8, 5.8, -51.6, 4.6, -51.6), '#7a2a2a', null, { lw: 0.5 }); ln(g, p => { p.moveTo(4.1, -52.5); p.lineTo(6.0, -52.7); }, '#ffffff', 0.4); }
  else if (f.mouth === 'open') cel(g, EL(5.2, -52.2, 0.9, 0.7), '#6a2228', null, { lw: 0.5 });
  else ln(g, p => { p.moveTo(3.7, -52.5); p.quadraticCurveTo(4.5, -52.3 + (f.mouth === 'frown' ? -0.4 : 0.15), 5.3, -52.6); }, mc, f.lip ? 0.8 : 0.6);
  if (f.blush) { g.globalAlpha = 0.35; dot(g, 1.6, -54.6, 1.3, '#e0707a'); g.globalAlpha = 1; }
  if (f.lines) { ln(g, p => { p.moveTo(3.2, -54.4); p.quadraticCurveTo(3.6, -53, 3.2, -52); }, dk(skin, 0.35), 0.45); ln(g, p => { p.moveTo(-0.4, -58.0); p.lineTo(0.6, -57.4); }, dk(skin, 0.35), 0.4); }
  if (f.scar) ln(g, p => { p.moveTo(0.4, -60.4); p.lineTo(3.2, -54.6); }, '#a8443a', 0.7);
}
// 수염: 짧은 턱수염·구레나룻 / 길게 늘어진 수염 / 염소수염 / 거뭇한 턱
function beard(g, kind, col) {
  if (!kind) return;
  if (kind === 'stubble') { g.globalAlpha = 0.28; cel(g, S(-3.6, -54.0, -1.4, -50.8, 2.6, -49.6, 5.6, -50.8, 6.6, -53.2, 4.8, -52.0, 1.0, -52.4, -1.6, -54.4), col, null, { lw: 0 }); g.globalAlpha = 1; return; }
  if (kind === 'goatee' || kind === 'long') {
    const L = kind === 'long' ? 12 : 5;
    cel(g, S(1.4, -51.4, 3.6, -50.8, 5.8, -51.6, 5.4, -50 + L * 0.45, 4.2, -50 + L, 2.8, -50 + L * 0.5), col, S(3.8, -51, 6.2, -51, 5, -50 + L, 4, -50 + L), { k: 0.25, lw: 0.75 });
    if (L > 6) for (const t of [0.35, 0.65]) ln(g, O(3.2 + t, -49 + L * t * 0.6, 3.8 + t, -48 + L * t), dk(col, 0.25), 0.4);
    ribbon(g, [4.4, -53.4, 6.0, -53.6, 7.6, -52.6], 0.55, col, { lw: 0.5 });   // 콧수염
    ribbon(g, [4.4, -53.4, 2.8, -53.0, 1.6, -51.6], 0.55, col, { lw: 0.5 });
    return;
  }
  // 짧은 수염 (구레나룻부터 턱까지) + 콧수염
  const wild = kind === 'wild', full = kind === 'full' || wild;
  cel(g, S(-3.8, -55.2, -3.2, -51.6, -0.4, -48.6 - (full ? 1.6 : 0), 3.4, -47.8 - (full ? 2.0 : 0), 6.2, -49.4 - (full ? 1 : 0), 7.0, -52.0, 6.0, -52.0, 4.6, -51.2, 2.6, -51.4, 0.6, -52.6, -1.6, -55.0), col, S(-4, -56, -1, -48, -0.6, -52, -1.8, -55), { k: 0.22, lw: 0.75 });
  if (wild) for (const [x, y] of [[-2.2, -49.8], [1.0, -47.2], [4.4, -47.0]]) cel(g, PG(x - 1.2, y - 1, x, y + 1.8, x + 1.2, y - 1), col, null, { lw: 0.6 });
  ribbon(g, [4.4, -53.4, 6.0, -53.6, 7.6, -52.8], 0.6, col, { lw: 0.5 });
  ribbon(g, [4.4, -53.4, 3.0, -52.8, 2.0, -51.6], 0.6, col, { lw: 0.5 });
  cel(g, EL(5.0, -52.2, 0.8, 0.45), '#6a2a2a', null, { lw: 0 });
}

// ───────── 머리 모양 ─────────
// 정수리·뒷머리 (모자에 가려져도 그린다)
const CAP = [-6.9, -57.4, -6.9, -61.2, -4.8, -64.6, -0.4, -66.0, 4.0, -65.2, 6.6, -62.6, 6.8, -61.0, 4.0, -61.8, 1.0, -61.2, -1.0, -59.6, -1.5, -56.6, -2.2, -54.4, -4.8, -54.2];
function hairCap(g, o) {
  const c = o.hairCol || HAIR;
  if (o.hair === 'bald') return;
  if (o.hair === 'wild') {
    const pts = [-7.4, -55, -9.8, -57.6, -7.8, -59.6, -10.4, -62.6, -6.8, -63.4, -6.6, -67.6, -2.6, -65.8, -0.6, -69.6, 2.4, -66.2, 5.6, -67.6, 6.0, -64.4, 8.6, -63.0, 6.8, -61.0, 4.0, -61.6, 1.0, -61.0, -1.0, -59.4, -1.5, -56.4, -2.4, -54.0, -4.8, -53.4];
    cel(g, PG(...pts), c, S(-10, -60, -6, -56, -2, -55, -6, -52, -11, -54), { k: 0.25, lw: 0.85 }); return;
  }
  cel(g, S(...CAP), c, S(-8, -58, -4.6, -55.8, -2.4, -54.0, -5.6, -52, -9, -55), { k: 0.25, hi: O(), lw: 0.85 });
  // 머릿결 빛: 정수리를 따라 푸른 빛 띠
  ln(g, O(-5.2, -61.6, -2.4, -64.2, 1.8, -64.6, 4.4, -63.6), lt(c, 0.32), 0.9);
  ln(g, O(-4.4, -60.6, -2.6, -62.0), lt(c, 0.25), 0.5);
}
function topknot(g, o) {
  const c = o.hairCol || HAIR;
  cel(g, EL(-1.0, -66.8, 2.6, 2.3, -0.2), c, EL(-0.2, -66, 2.4, 1.8), { k: 0.25, lw: 0.8 });
  ln(g, O(-3.6, -67.4, -0.8, -68.2, 1.8, -67.0), lt(c, 0.3), 0.5);
  ln(g, O(-4.6, -66.2, 3.0, -67.6), o.pin || GOLD, 0.9);   // 동곳
}
// 앞머리 (귀밑까지 내려오는 옆머리 포함) — 여인·검객
function bangs(g, o) {
  const c = o.hairCol || HAIR;
  cel(g, PG(-1.6, -58.4, -1.0, -62.0, 1.6, -64.0, 5.0, -64.2, 7.2, -61.6, 7.0, -59.2, 6.1, -60.6, 5.2, -58.8, 4.4, -60.8, 3.0, -59.0, 2.0, -60.8, 0.8, -59.6, -0.2, -60.4), c, null, { lw: 0.75 });
  ln(g, O(0.6, -62.6, 3.4, -63.6, 5.8, -62.8), lt(c, 0.3), 0.6);
  // 귀 앞으로 내려온 옆머리
  cel(g, PG(-1.4, -59.2, -0.4, -58.6, -0.2, -52.6, -1.0, -50.0, -2.0, -53.4), c, null, { lw: 0.7 });
}
// 묶어 올린 머리 (검객): 정수리에서 뒤로 흩날린다
function ponytail(g, o) {
  const c = o.hairCol || HAIR;
  cel(g, S(-2.6, -66.4, -7.6, -67.2, -13.2, -64.0, -17.6, -58.0, -19.4, -51.6, -16.6, -54.6, -14.4, -52.0, -13.6, -57.0, -10.0, -61.6, -4.6, -63.2), c, S(-20, -50, -14, -52, -11, -60, -16, -62), { k: 0.25, lw: 0.8 });
  ln(g, O(-5.4, -65.4, -10.4, -64.0, -14.6, -59.6), lt(c, 0.3), 0.6);
}
// 등 뒤로 늘어뜨린 긴 머리와 끝의 붉은 댕기 (몸 그림 쪽에 그린다)
function longHairBack(g, o) {
  const c = o.hairCol || HAIR, rc = o.ribbon || RED;
  cel(g, S(-6.4, -60.0, -2.4, -57.6, -3.6, -48.0, -6.2, -40.0, -8.6, -32.6, -10.6, -29.0, -13.6, -31.6, -12.6, -40.0, -10.8, -48.0, -8.8, -56.0), c, S(-14, -42, -9.4, -42, -10, -28, -14, -28), { k: 0.25, lw: 0.8 });
  ln(g, O(-7.4, -52, -8.4, -42, -10.4, -34), lt(c, 0.28), 0.6);
  // 머리끝을 묶은 붉은 댕기: 등 뒤로 길게 늘어진다
  ribbon(g, [-11.6, -30.6, -12.8, -25.4, -14.6, -20.6, -15.4, -15.6, -17.0, -11.4], 1.6, rc, { cut: true, taper: false });
  cel(g, EL(-11.8, -30.8, 2.2, 1.5, 0.5), rc, EL(-11.4, -30.2, 1.6, 0.9), { k: 0.25, lw: 0.7 });
}

// ───────── 모자 ─────────
function gatStrings(g, x0, y0, beads = true) {
  const pt = t => [x0 + (2.4 - x0) * t - 2.2 * Math.sin(t * PI) , y0 + (-43.6 - y0) * t];
  ln(g, p => { const a = pt(0); p.moveTo(a[0], a[1]); for (let i = 1; i <= 12; i++) { const b = pt(i / 12); p.lineTo(b[0], b[1]); } }, '#3a2a30', 0.5);
  if (beads) for (let i = 1; i <= 9; i++) { const [x, y] = pt(i / 9.6); dot(g, x, y, i % 3 === 0 ? 0.75 : 0.55, i % 3 === 0 ? '#e0a040' : '#2a1f28'); }
}
const HAT = {
  // 갓: 비치는 검은 테와 높은 대우
  gat(g) {
    // 대우(위의 통): 말총으로 짜서 속의 상투가 비친다. 위가 살짝 좁다
    const crown = p => { p.moveTo(-3.0, -62.2); p.lineTo(-2.5, -69.4); p.quadraticCurveTo(0.7, -70.8, 3.9, -69.6); p.lineTo(4.4, -62.4); p.quadraticCurveTo(0.7, -61.2, -3.0, -62.2); p.closePath(); };
    g.beginPath(); crown(g); g.fillStyle = 'rgba(24,20,36,0.58)'; g.fill();
    g.save(); g.beginPath(); crown(g); g.clip(); g.fillStyle = 'rgba(10,8,18,0.45)'; g.fillRect(-3.4, -71, 2.2, 10); g.fillStyle = 'rgba(170,160,200,0.35)'; g.fillRect(2.6, -70, 0.9, 8); g.restore();
    g.beginPath(); crown(g); st(g, LN, 0.8);
    g.beginPath(); g.ellipse(0.7, -69.7, 3.2, 0.85, 0, 0, TAU); g.fillStyle = 'rgba(30,26,44,0.85)'; g.fill(); st(g, LN, 0.6);
    cel(g, p => { p.moveTo(-3.0, -63.8); p.quadraticCurveTo(0.7, -62.8, 4.4, -64.0); p.lineTo(4.4, -62.4); p.quadraticCurveTo(0.7, -61.2, -3.0, -62.2); p.closePath(); }, '#141020', null, { lw: 0.45 });
    // 양태(테): 넓고 비치는 테. 가장자리만 짙다
    g.beginPath(); g.ellipse(0.6, -61.6, 12.6, 2.9, -0.05, 0, TAU); g.fillStyle = 'rgba(22,18,34,0.5)'; g.fill(); st(g, LN, 0.85);
    g.beginPath(); g.ellipse(0.6, -61.6, 11.4, 2.4, -0.05, 0, TAU); st(g, 'rgba(22,18,34,0.55)', 0.8);
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; g.beginPath(); g.moveTo(0.6 + Math.cos(a) * 4.2, -61.6 + Math.sin(a) * 1.0); g.lineTo(0.6 + Math.cos(a) * 11.6, -61.6 + Math.sin(a) * 2.5); st(g, 'rgba(22,18,34,0.22)', 0.4); }
    g.beginPath(); g.ellipse(0.6, -61.6, 12.4, 2.75, -0.05, 0.25, 1.9); st(g, 'rgba(220,210,240,0.55)', 0.55);
    gatStrings(g, -1.6, -60.4);
  },
  // 전립: 둥근 꼭대기, 붉은 상모, 금빛 장식 (군관·병사)
  jeonrip(g) {
    g.beginPath(); g.ellipse(0.8, -61.2, 10.6, 2.7, -0.05, 0, TAU); g.fillStyle = '#1e1a28'; g.fill(); st(g, LN, 0.85);
    g.beginPath(); g.ellipse(0.8, -61.2, 10.4, 2.5, -0.05, 0.3, 1.8); st(g, 'rgba(200,190,225,0.5)', 0.55);
    cel(g, p => { p.moveTo(-4.4, -61.8); p.quadraticCurveTo(-4.6, -68.8, 0.8, -69.0); p.quadraticCurveTo(6.2, -68.8, 6.0, -61.8); p.quadraticCurveTo(0.8, -60.6, -4.4, -61.8); p.closePath(); }, '#2a2536', S(-5, -70, -1, -69, -2, -61, -5, -61), { hi: S(3.6, -67.4, 5.4, -65, 5.2, -63, 4.2, -65.6), hc: '#4a4560', lw: 0.85 });
    for (let i = 0; i < 7; i++) { const a = -PI / 2 + (i - 3) * 0.32; cel(g, PG(0.8, -68.4, 0.8 + Math.cos(a - 0.12) * 3.2, -68.6 + Math.sin(a - 0.12) * 3.4, 0.8 + Math.cos(a) * 4.6, -68.8 + Math.sin(a) * 4.8, 0.8 + Math.cos(a + 0.12) * 3.2, -68.6 + Math.sin(a + 0.12) * 3.4), i % 2 ? '#c8302a' : '#e0443a', null, { lw: 0.5 }); }
    cel(g, EL(4.3, -64.6, 1.1, 1.3), GOLD, null, { lw: 0.5 });
    gatStrings(g, -2.2, -60.0);
  },
  // 머리띠 (+ 상투). 띠 끝이 뒤로 날린다
  band(g, o) {
    topknot(g, o);
    const c = o.bandCol || '#2a2836';
    cel(g, p => { p.moveTo(-7.0, -59.2); p.quadraticCurveTo(0, -62.6, 6.9, -61.4); p.lineTo(7.0, -59.8); p.quadraticCurveTo(0, -61.0, -7.0, -57.6); p.closePath(); }, c, null, { lw: 0.7 });
    ribbon(g, [-6.6, -58.6, -10.6, -59.8, -14.6, -58.0, -18.2, -59.4], 0.95, o.ribbon || RED, { cut: true, taper: false, lw: 0.65 });
    ribbon(g, [-6.6, -58.4, -10.4, -56.4, -13.4, -53.0, -16.8, -52.6], 0.9, o.ribbon || RED, { cut: true, taper: false, lw: 0.65 });
    cel(g, EL(-6.8, -58.6, 1.4, 1.5), o.ribbon || RED, null, { lw: 0.6 });
  },
  // 붉은 머리띠만 (상투 없이 머리를 묶은 검객)
  ribbon(g, o) {
    const c = o.ribbon || RED;
    cel(g, p => { p.moveTo(-6.8, -60.6); p.quadraticCurveTo(0, -64.0, 6.6, -62.6); p.lineTo(6.8, -61.2); p.quadraticCurveTo(0, -62.4, -6.9, -59.0); p.closePath(); }, c, null, { lw: 0.7 });
    ribbon(g, [-6.4, -60.0, -10.8, -61.6, -15.4, -60.0, -19.6, -61.4], 0.95, c, { cut: true, taper: false, lw: 0.65 });
    ribbon(g, [-6.4, -59.6, -10.2, -57.2, -13.6, -54.4, -17.6, -54.0], 0.85, c, { cut: true, taper: false, lw: 0.65 });
  },
  // 투구: 쇠 투구에 금빛 띠, 꼭대기의 붉은 상모, 징 박은 볼가리개
  tugu(g) {
    ribbon(g, [0.8, -70.6, -3.6, -73.4, -8.6, -72.2, -12.6, -68.4, -15.4, -64.2], 2.0, '#c8302a', { wave: true, lw: 0.7 });
    cel(g, S(-7.4, -58.6, -7.6, -55.0, -6.6, -50.4, -3.8, -50.0, -2.6, -53.6, -2.6, -58.0), '#8a2a26', S(-8, -56, -5, -50, -7, -50), { lw: 0.8 });
    for (const [x, y] of [[-6.2, -56.4], [-4.4, -56.0], [-6.0, -53.4], [-4.2, -52.6]]) dot(g, x, y, 0.5, GOLD);
    cel(g, p => { p.moveTo(-7.4, -59.2); p.bezierCurveTo(-7.8, -68.8, 8.8, -69.4, 8.0, -59.8); p.quadraticCurveTo(0.4, -58.0, -7.4, -59.2); p.closePath(); }, '#3a3a4a', S(-8, -60, -6, -66, -2, -68, -2, -60), { sc: '#262634', hi: S(4.6, -66.4, 7.4, -62.4, 6.6, -61, 4.4, -64.4), hc: '#6a6a80', lw: 0.9 });
    for (const x of [-3.2, 0.6, 4.4]) ln(g, O(x - 0.6, -59.0, x * 0.6, -64.6, x * 0.2, -68.0), GOLD, 0.7);
    cel(g, p => { p.moveTo(-7.6, -59.6); p.quadraticCurveTo(0.4, -57.6, 8.4, -60.2); p.lineTo(10.4, -59.2); p.quadraticCurveTo(0.4, -56.2, -7.8, -58.0); p.closePath(); }, GOLD, null, { lw: 0.7 });
    cel(g, PG(-0.2, -67.8, 0.2, -71.8, 1.4, -71.8, 1.8, -67.8), GOLD, null, { lw: 0.6 });
    cel(g, EL(0.8, -72.4, 1.3, 1.1), GOLD, null, { lw: 0.6 });
  },
  // 털모자 (사냥꾼)
  fur(g) {
    cel(g, p => { p.moveTo(-6.6, -60.6); p.bezierCurveTo(-6.8, -69.0, 7.6, -69.4, 7.2, -61.0); p.closePath(); }, '#5a3a2a', S(-7, -61, -4, -67, -1, -68, -2, -61), { hi: S(3.6, -66.8, 6.6, -63, 5.4, -62, 3.6, -64.6), lw: 0.8 });
    const pts = []; for (let i = 0; i <= 14; i++) { const t = i / 14, x = -7.8 + t * 16, y = -61.6 + Math.sin(t * PI) * -1.4; pts.push(x, y - 2.6 - (i % 2) * 0.9); } for (let i = 14; i >= 0; i--) { const t = i / 14, x = -7.8 + t * 16, y = -61.6 + Math.sin(t * PI) * -1.4; pts.push(x + 0.3, y + 1.0 + (i % 2) * 0.7); }
    cel(g, PG(...pts), '#b98a5a', PG(-8.4, -60, 8.6, -61.6, 8.6, -58, -8.4, -57), { lw: 0.7 });
    cel(g, S(-6.6, -60.0, -3.6, -59.6, -3.4, -53.0, -5.2, -51.6, -7.0, -53.8), '#b98a5a', S(-7, -56, -4, -53, -6, -51), { lw: 0.7 });
  },
  // 패랭이 (대나무 삿갓)
  paeraeng(g) {
    cel(g, p => { p.moveTo(-11.4, -60.4); p.quadraticCurveTo(-3, -69.8, 0.8, -71.0); p.quadraticCurveTo(5, -69.8, 13.0, -61.0); p.quadraticCurveTo(1, -57.6, -11.4, -60.4); p.closePath(); }, '#d7b46c', PG(-12, -61, 1, -71, -1, -58), { k: 0.22, hi: PG(2, -70.6, 13, -61.2, 8.6, -60.8), hk: 0.25, lw: 0.85 });
    for (let i = 0; i < 9; i++) { const t = i / 8; ln(g, O(0.8, -70.6, -11.0 + t * 23.8, -60.6 + Math.sin(t * PI) * 1.8), '#a0803e', 0.4); }
    ln(g, O(-6.4, -63.2, 1, -64.6, 8.6, -63.4), '#2f4d7e', 1.1);
  },
  // 상모: 전립 꼭대기에서 길게 돌아 나오는 흰 끈
  sangmo(g, o) {
    HAT.jeonrip(g, o);
    ribbon(g, [0.8, -73.0, -3.4, -77.4, -9.6, -77.0, -14.6, -72.0, -16.4, -65.0, -14.4, -58.4], 1.0, '#f6f2ea', { taper: false, lw: 0.6 });
  },
  // 신선: 흰 상투와 작은 금관
  sage(g, o) {
    topknot(g, Object.assign({}, o, { hairCol: '#eae6f0', pin: '#00000000' }));
    // 상투관: 상투를 덮는 작고 둥근 관, 비녀를 가로로 꽂는다
    cel(g, p => { p.moveTo(-3.6, -65.0); p.quadraticCurveTo(-3.8, -70.4, -0.8, -70.6); p.quadraticCurveTo(2.4, -70.6, 2.2, -65.2); p.quadraticCurveTo(-0.8, -64.0, -3.6, -65.0); p.closePath(); }, '#2a2436', S(-4, -66, -2, -70, -1.6, -65), { hi: S(0.6, -69.6, 1.8, -67, 1.2, -66, 0.4, -68), hc: '#5a5070', lw: 0.75 });
    for (const x of [-2.2, -0.8, 0.6]) ln(g, O(x, -65.4, x + 0.2, -69.4), '#4a4060', 0.4);
    ln(g, O(-6.2, -66.6, -0.8, -67.6, 4.8, -68.2), GOLD, 1.0);
    cel(g, EL(4.9, -68.2, 0.8, 0.8), '#c8402f', null, { lw: 0.45 });
  },
  bald() {},
  none() {},
};
const R0 = (x, y, w, h) => p => p.rect(x, y, w, h);

// ───────── 사람 ─────────
// 손 자리: 무기의 손잡이가 오는 곳 (sprites.js 의 hold 와 같다)
export const ILL_HAND = { x: 13.6, y: -31 };
const SHL = [6.0, -45.0], SHR = [-5.4, -44.8];   // 앞(오른쪽)·뒤(왼쪽) 어깨
function legsDraw(g, o, D = 0) {
  const pc = o.pants || '#e8e2d2', wc = o.wrap || pc, sc = o.shoe || '#2a2430', straw = o.straw;
  // 신은 가늘게(발뒤꿈치 쪽으로 줄인다), 다리는 발목 위로 D 만큼 늘인다
  const shoe = (pts, sh) => { const cx = pts[0] + 2; g.save(); g.translate(cx, 0); g.scale(0.8, 0.92); g.translate(-cx, 0); cel(g, S(...pts), sc, sh, { k: 0.3, lw: 0.85 }); if (straw) for (let i = 1; i < 4; i++) ln(g, O(pts[0] + i * 2, pts[1] + 0.4, pts[0] + i * 2 + 0.6, 0.4), dk(sc, 0.3), 0.45); g.restore(); };
  const kL = (27.5 + D) / 27.5, stretch = fn => { g.save(); g.translate(0, -3); g.scale(1, kL); g.translate(0, 3); fn(); g.restore(); };
  // 뒷다리 (그늘에 든다)
  const st2 = o.stance || 1;   // 보폭: 1 = 보통, 클수록 앞발을 내딛은 자세
  g.save(); g.translate(-1.6 * st2, 0); g.transform(1, 0, 0.06 * st2, 1, 0, 0);
  stretch(() => {
    cel(g, S(-6.4, -30.5, 0.4, -30.5, -0.6, -20.0, -2.6, -12.6, -4.2, -10.4, -8.8, -10.8, -9.2, -18.0, -8.0, -25.0), dk(pc, 0.12), S(-10, -30, -4, -30, -6, -10, -10, -10), { k: 0.2, lw: 0.85 });
    cel(g, S(-8.4, -11.6, -3.8, -11.4, -4.4, -6.0, -4.6, -3.0, -8.0, -3.0, -8.6, -7.0), dk(wc, 0.1), S(-9, -12, -6.6, -12, -6.6, -3, -9, -3), { k: 0.18, lw: 0.75 });
  });
  shoe([-9.8, -3.4, -5.4, -3.8, -2.4, -1.6, -1.0, -0.4, -2.4, 0.6, -9.4, 0.6, -10.4, -1.4], S(-11, 0, -2, 0, -2, 1, -11, 1));
  g.restore();
  // 앞다리
  g.save(); g.translate(1.4 * st2, 0); g.transform(1, 0, -0.05 * st2, 1, 0, 0);
  stretch(() => {
    cel(g, S(-1.0, -30.5, 6.0, -30.5, 8.6, -24.0, 9.6, -16.0, 9.0, -11.0, 4.6, -10.6, 2.6, -14.0, 1.0, -22.0), pc, S(-1.5, -31, 3, -31, 3.6, -11, 1, -15), { k: 0.18, lw: 0.85 });
    ln(g, O(4.2, -27, 6.4, -20, 7.0, -14), dk(pc, 0.22), 0.5);
    cel(g, S(4.2, -11.8, 8.8, -11.6, 8.4, -6.6, 8.0, -3.4, 4.4, -3.4, 4.0, -7.2), wc, S(3.6, -12, 5.8, -12, 5.6, -3, 3.6, -3), { k: 0.18, lw: 0.75 });
    if (o.wrapTie) for (const y of [-9.6, -6.0]) ln(g, O(4.2, y, 6.4, y - 0.7, 8.6, y + 0.2), o.wrapTie, 0.6);
  });
  shoe([3.0, -3.6, 7.4, -3.9, 10.4, -1.8, 12.4, -0.8, 11.4, 0.6, 3.4, 0.6, 2.4, -1.4], S(2, 0, 12, 0, 12, 1, 2, 1));
  g.restore();
}
// 두루마기·도포 자락 (무릎 또는 발목까지). 뒤쪽 자락이 바람에 살짝 날린다
function skirtDraw(g, o, D = 0) {
  const c = o.coat, col = c.col, hem = c.len === 'long' ? -4.6 : c.len === 'mid' ? -8 : -12.6, fl = c.len === 'long' ? 1.25 : 1;
  g.save(); const ks = (-34 - D - hem) / (-34 - hem); g.translate(0, hem); g.scale(1, ks); g.translate(0, -hem);
  const pts = [-6.9, -34.0, 6.7, -34.0, 9.0, -25.0, 10.6 * fl, hem + 0.6, 6.0, hem + 1.8, 0.4, hem + 0.8, -5.2, hem + 2.0, -10.8 * fl, hem + 0.4, -14.6 * fl, hem - 1.4, -10.8, -22.0];
  cel(g, S(...pts), col, S(-16 * fl, hem - 2, -9, -30, -2, -33, -4, hem + 4, -16 * fl, hem + 4), { k: 0.24, lw: 0.9 });
  // 앞섶이 갈라진 자리로 안감이 보인다
  if (c.lining) cel(g, S(5.6, -24.0, 9.6 * fl, hem + 0.8, 6.0, hem + 1.6, 4.4, hem - 4), c.lining, null, { lw: 0.7 });
  ln(g, O(5.0, -33.4, 5.2, -24.0, 5.8, hem + 1.2), dk(col, 0.35), 0.7);
  ln(g, O(-2.2, -32.6, -3.4, -22, -4.4, hem + 1.4), dk(col, 0.3), 0.55);
  ln(g, O(-7.8, -28, -11.4, hem + 0.4), dk(col, 0.3), 0.55);
  if (c.studs) for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) { const t = (i + 0.5) / 6, y = -29 + r * ((hem + 1 - -29) / 3), x = -9 + t * 18 - r * (t < 0.5 ? 1 : -0.4); dot(g, x, y, 0.55, GOLD); }
  if (c.trim) ln(g, O(10.6 * fl, hem + 0.6, 6.0, hem + 1.8, 0.4, hem + 0.8, -5.2, hem + 2.0, -10.8 * fl, hem + 0.4, -14.6 * fl, hem - 1.4), c.trim, 1.4);
  g.restore();
}
// 치마 (가슴께부터 땅까지 퍼진다)
function chimaDraw(g, o, D = 0) {
  const c = o.chima;
  cel(g, EL(9.2, -0.4, 2.8, 1.3), '#f3efe6', null, { lw: 0.6 });   // 버선코
  g.save(); g.scale(1, (40.6 + D) / 40.6);
  cel(g, S(-5.8, -40.6, 6.0, -40.6, 9.6, -28.0, 12.6, -10.0, 14.2, -1.6, 6.0, 0.8, -4.0, 0.4, -12.6, -0.6, -16.4, -3.6, -11.8, -20.0, -8.8, -32.0), c.col, S(-18, -4, -10, -30, -4, -41, -2, -30, -3, 1, -18, 1), { k: 0.26, hi: S(6.4, -36, 9.4, -24, 11.4, -8, 9.4, -8, 7.6, -24), hk: 0.18, lw: 0.9 });
  for (const [x0, x1] of [[2.0, 4.6], [-2.4, -4.2], [5.4, 9.8], [-6.0, -10.6]]) ln(g, O(x0, -36, (x0 + x1) / 2, -18, x1, -0.4), dk(c.col, 0.3), 0.55);
  if (c.trim) { cel(g, p => { p.moveTo(14.2, -1.6); p.lineTo(13.6, -4.8); p.quadraticCurveTo(0, -2.4, -15.6, -6.6); p.lineTo(-16.4, -3.6); p.quadraticCurveTo(0, 1.4, 14.2, -1.6); p.closePath(); }, c.trim, null, { lw: 0.6 }); for (let i = 0; i < 7; i++) dot(g, -12 + i * 4, -3.0 + Math.abs(i - 3) * -0.3 + (i < 3 ? -0.6 : 0), 0.5, lt(c.trim, 0.5)); }
  g.restore();
}
// 저고리·몸통
function torsoDraw(g, o) {
  const top = o.top || '#e8e2d2', fem = o.fem;
  const T = fem ? [-5.2, -45.6, -1.6, -47.0, 3.0, -47.2, 6.6, -45.6, 7.4, -42.0, 6.8, -38.6, 5.4, -38.0, 0, -37.4, -5.6, -38.0, -6.4, -41.6]
    : [-6.6, -46.0, -2.0, -47.4, 3.0, -47.6, 7.6, -45.8, 8.8, -41.4, 7.6, -36.0, 6.8, -32.6, 0, -32.0, -6.8, -32.6, -7.6, -38.0, -7.8, -43.0];
  cel(g, S(...T), top, S(-9, -48, -3, -47, -2.4, -40, -3.6, -31, -9, -31), { k: 0.26, hi: S(5.8, -45.2, 8.2, -42, 7.6, -38, 6.4, -40.6), hk: 0.3, lw: 0.9 });
  if (o.bareChest) { ln(g, O(-1.4, -41.6, 2.6, -40.0, 6.6, -41.0), dk(top, 0.35), 0.6); ln(g, O(2.6, -40, 2.8, -34.6), dk(top, 0.3), 0.5); return; }
  if (o.vest) {
    cel(g, S(-6.6, -46.2, -2.6, -47.0, -1.0, -40.0, -2.4, -32.0, -2.8, -24.0, -7.4, -24.6, -8.0, -34.0, -7.8, -42.6), o.vest, S(-9, -47, -4, -47, -5, -24, -9, -24), { k: 0.22, lw: 0.8 });
    cel(g, S(4.0, -47.4, 7.6, -45.8, 8.8, -41.4, 7.6, -34.0, 7.4, -24.6, 4.2, -24.0, 3.4, -34.0, 2.8, -42.0), o.vest, null, { hi: S(6.2, -45, 8.2, -41.6, 7.4, -37, 6.4, -40), hk: 0.25, lw: 0.8 });
  }
  if (o.armor) {   // 두정갑: 징을 박은 몸판과 어깨
    for (let r = 0; r < 3; r++) for (let i = 0; i < 4; i++) dot(g, -5.4 + i * 3.6 + r * 0.4, -43 + r * 3.6, 0.55, GOLD);
    for (const [x, s] of [[-5.6, -1], [6.4, 1]]) { cel(g, S(x - 3.4, -46.6, x + 3.4 * s * 0.4, -47.4, x + 4.2 * s, -44.0, x + 2.6, -40.6, x - 3.0, -41.6, x - 4.4 * s * 0.2, -44.2), o.armor, S(x - 5, -44, x + 5, -44, x + 5, -40, x - 5, -40), { k: 0.28, lw: 0.8 }); for (const t of [-1.6, 0.4, 2.4]) dot(g, x + t, -44.2 + Math.abs(t) * 0.2, 0.5, GOLD); }
    return;
  }
  // 깃과 동정: 목에서 비스듬히 내려오는 깃 (오른섶)
  const git = o.git || dk(top, 0.4), y1 = fem ? -40.0 : -36.4;
  cel(g, PG(-1.8, -47.6, -0.2, -47.8, 1.6, -44.0, 0.4, -43.4), git, null, { lw: 0.6 });
  cel(g, p => { p.moveTo(2.4, -48.0); p.lineTo(4.6, -47.4); p.quadraticCurveTo(2.6, -42.6, -0.2, y1); p.lineTo(-2.4, y1 - 0.6); p.quadraticCurveTo(0.6, -43.0, 2.4, -48.0); p.closePath(); }, git, null, { lw: 0.7 });
  ln(g, p => { p.moveTo(3.0, -47.8); p.quadraticCurveTo(1.8, -45.2, 0.4, -43.4); }, o.collar || '#fbf8f0', 0.9);
  if (o.goreum) {   // 옷고름
    cel(g, S(-0.8, y1 - 0.4, -2.6, y1 + 1.4, -1.8, y1 + 9.0, -0.4, y1 + 8.6, -0.4, y1 + 2.0), o.goreum, null, { lw: 0.6 });
    cel(g, S(-0.4, y1 - 0.4, 1.6, y1 + 1.6, 2.6, y1 + 7.4, 1.4, y1 + 7.6, 0.2, y1 + 1.6), dk(o.goreum, 0.12), null, { lw: 0.6 });
    cel(g, EL(-0.6, y1 - 0.2, 1.2, 1.0), o.goreum, null, { lw: 0.6 });
  }
  if (o.kasa) {   // 가사: 왼어깨에서 비스듬히 두른 붉은 천
    cel(g, p => { p.moveTo(-6.8, -46.0); p.lineTo(-2.4, -47.2); p.lineTo(8.4, -34.6); p.lineTo(7.0, -31.0); p.lineTo(2.6, -31.6); p.closePath(); }, o.kasa, PG(-8, -46, -4, -46, 4, -31, 0, -31), { k: 0.22, lw: 0.8 });
    for (const t of [0.3, 0.62]) ln(g, O(-4.6 + 11 * t + 1.2, -46.6 + 13 * t - 1.0, -4.6 + 11 * t - 1.6, -46.6 + 13 * t + 1.6), GOLD, 0.6);
  }
  if (o.cross) o.cross.forEach((c, i) => ribbon(g, i ? [6.8, -46.0, 0.4, -40.4, -6.4, -33.6] : [-6.2, -46.2, 0.6, -40.0, 7.4, -33.4], 1.0, c, { taper: false, lw: 0.6 }));
}
function sashDraw(g, o) {
  if (!o.sash) return;
  const c = o.sash, y = o.fem ? -38.6 : -33.4;
  cel(g, p => { p.moveTo(-7.2, y - 1.6); p.quadraticCurveTo(0.6, y - 0.4, 7.4, y - 1.8); p.lineTo(7.5, y + 1.2); p.quadraticCurveTo(0.6, y + 2.6, -7.2, y + 1.4); p.closePath(); }, c, PG(-8, y - 3, -3, y - 3, -3, y + 3, -8, y + 3), { k: 0.25, lw: 0.75 });
  if (o.fem) return;
  const fly = o.sashFly;
  ribbon(g, fly ? [-2.6, y + 0.6, -7.6, y + 3.0, -12.4, y + 3.4, -17.0, y + 5.6] : [-2.6, y + 0.6, -4.0, y + 5.0, -4.8, y + 9.6, -5.8, y + 13.4], 1.1, c, { cut: true, lw: 0.6 });
  ribbon(g, fly ? [-2.6, y + 0.6, -6.6, y + 5.4, -10.6, y + 8.0, -14.4, y + 11.4] : [-2.6, y + 0.6, -1.8, y + 5.4, -2.2, y + 10.0, -1.6, y + 12.8], 1.0, dk(c, 0.1), { cut: true, lw: 0.6 });
  cel(g, EL(-2.6, y + 0.2, 1.6, 1.3), c, null, { lw: 0.6 });
}
// 팔: 소매(좁거나 넓게) + 손. lead = 앞팔(무기를 쥔다), rear = 뒷팔
function armDraw(g, o, which, skin) {
  const lead = which === 'lead', [sx, sy] = lead ? (o.fem ? [5.2, -44.6] : SHL) : (o.fem ? [-4.8, -44.4] : SHR);
  const H = lead ? (o.hand || ILL_HAND) : (o.rearHand || { x: -7.4, y: -29.4 }), [ex, ey] = elbow(sx, sy, H.x, H.y, 8.6, 8.6, lead ? 1 : -1);
  const sl = (lead ? o.leadSleeve : null) || o.sleeveCol || o.top || '#e8e2d2', bare = lead ? o.bareLead : o.bareRear;
  if (bare || o.bare) {
    cel(g, limb(sx, sy, ex, ey, H.x, H.y, 2.8, 2.3, 1.9), skin, limb(sx - 1, sy + 1, ex - 1.2, ey + 0.6, H.x - 1, H.y + 0.4, 1.8, 1.4, 1.2), { k: 0.24, lw: 0.85 });
    ln(g, O(sx + 0.6, sy + 2.4, (sx + ex) / 2 + 0.6, (sy + ey) / 2 + 0.6), dk(skin, 0.3), 0.5);
    cel(g, limb(ex + (H.x - ex) * 0.62, ey + (H.y - ey) * 0.62, ex + (H.x - ex) * 0.76, ey + (H.y - ey) * 0.76, ex + (H.x - ex) * 0.88, ey + (H.y - ey) * 0.88, 2.3, 2.3, 2.2), o.wrist || '#6a4a34', null, { lw: 0.6 });
  } else {
    if (o.sleeve === 'wide') cel(g, S(ex - 2.2, ey - 0.6, H.x - 1.8, H.y - 1.2, H.x + 0.6, H.y + 2.4, H.x - 1.4, H.y + 7.4, ex - 1.0, ey + 5.6, ex - 3.4, ey + 2.4), dk(sl, 0.06), S(ex - 4, ey + 2, H.x + 1, H.y + 3, H.x, H.y + 8, ex, ey + 7), { k: 0.24, lw: 0.8 });
    cel(g, limb(sx, sy, ex, ey, H.x, H.y, 3.1, 2.6, 2.2), sl, limb(sx - 0.4, sy + 1.4, ex - 0.6, ey + 1.0, H.x - 0.4, H.y + 0.8, 1.9, 1.5, 1.2), { k: 0.24, hi: lead ? limb(sx + 1.4, sy - 1.2, ex + 0.6, ey - 1.6, H.x + 0.3, H.y - 1.4, 0.9, 0.7, 0.4) : null, hk: 0.28, lw: 0.85 });
    ln(g, O(ex - 1.2, ey - 1.2, ex + 0.8, ey + 0.8), dk(sl, 0.32), 0.5);
    // 소맷부리
    const dx = H.x - ex, dy = H.y - ey, l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l, cx = H.x - ux * 2.0, cy = H.y - uy * 2.0;
    if (o.cuff) cel(g, PG(cx - uy * 2.5 - ux * 0.9, cy + ux * 2.5 - uy * 0.9, cx + uy * 2.5 - ux * 0.9, cy - ux * 2.5 - uy * 0.9, cx + uy * 2.3 + ux * 0.9, cy - ux * 2.3 + uy * 0.9, cx - uy * 2.3 + ux * 0.9, cy + ux * 2.3 + uy * 0.9), o.cuff, null, { lw: 0.6 });
  }
  // 손: 쥔 주먹
  cel(g, EL(H.x, H.y, 2.0, 1.8, 0.3), skin, EL(H.x - 0.6, H.y + 0.8, 1.8, 1.2), { k: 0.2, lw: 0.75 });
  ln(g, O(H.x - 0.6, H.y - 1.2, H.x + 1.4, H.y - 0.4), dk(skin, 0.35), 0.45);
}
// 머리 (목 축 위에 따로 굽는다)
function headDraw(g, o, skin) {
  g.save(); g.translate(0.8, -47.5); g.scale(1.08, 1.08); g.translate(-0.8, 47.5);
  // 목
  cel(g, S(-1.6, -52.4, 2.8, -51.2, 3.6, -47.2, 0.8, -46.4, -1.8, -47.0), skin, S(-3, -53, 3.4, -50.4, 2, -48.6, -3, -48), { k: 0.28, lw: 0.75 });
  if (o.ponytail) ponytail(g, o);
  // 얼굴: 3/4 측면 (코끝이 오른쪽으로 나온다)
  const FACE = [-5.8, -56.4, -4.4, -52.8, -1.4, -50.6, 2.2, -49.8, 4.2, -50.4, 5.8, -51.8, 6.6, -53.6, 7.7, -55.2, 7.7, -55.2, 6.9, -56.2, 7.0, -57.8, 6.8, -59.8, 5.8, -62.4, 2.4, -64.2, -2.2, -64.0, -5.4, -61.8, -6.5, -59.0];
  cel(g, S(...FACE), skin, S(-7, -59, -3.8, -59.6, -2.6, -55.4, -0.6, -52.4, 1.2, -49.4, -6, -50), { k: 0.18, hi: S(4.4, -58.6, 6.0, -58.4, 6.2, -55.6, 4.8, -55.0), hk: 0.18, lw: 0.9 });
  hairCap(g, o);
  // 귀
  if (o.hat !== 'fur') { cel(g, S(-2.6, -58.0, -4.4, -58.4, -4.8, -56.2, -3.8, -54.2, -2.6, -54.8), skin, S(-5, -58, -4, -58, -4, -54, -5, -54), { k: 0.22, lw: 0.7 }); ln(g, O(-3.0, -57.4, -3.9, -56.6, -3.4, -55.4), dk(skin, 0.38), 0.45); }
  if (o.bangs) bangs(g, o);
  if (o.hair === 'topknot' && (!o.hat || o.hat === 'none' || o.hat === 'bald' || o.hat === 'gat')) topknot(g, o);
  if (o.hair === 'bald') { ln(g, O(-3.6, -63.2, 0.4, -64.8, 4.0, -64.0), lt(skin, 0.4), 0.8); }
  face(g, o, skin);
  beard(g, o.face && o.face.beard, o.beardCol || o.hairCol || HAIR);
  if (o.hat && HAT[o.hat]) HAT[o.hat](g, o);
  if (o.hairPin) { cel(g, EL(-5.0, -63.4, 1.3, 1.3), o.hairPin, null, { lw: 0.55 }); cel(g, EL(-3.6, -64.6, 0.9, 0.9), GOLD, null, { lw: 0.5 }); }
  g.restore();
}
// 말 탄 다리: 허벅지는 안장 위로 앞을 향하고 정강이는 말 옆구리로 내려와 등자를 딛는다
function ridingLeg(g, o) {
  const pc = o.pants || BAJI_C, sc = o.shoe || '#2a2430';
  cel(g, limb(-1.0, -30.0, 7.6, -26.4, 6.4, -14.6, 3.6, 3.2, 2.4), pc, limb(-1, -28.6, 7, -25, 5.4, -14.6, 2, 1.8, 1.2), { k: 0.2, lw: 0.85 });
  cel(g, S(3.6, -16.6, 8.8, -16.8, 11.6, -13.6, 11.0, -12.4, 4.0, -12.4), sc, S(3, -13.6, 12, -13.6, 12, -12, 3, -12), { k: 0.3, lw: 0.8 });
  ln(g, O(6.8, -12.2, 6.6, -9.8, 9.0, -9.8), '#8a8a98', 0.8);
}
// 말: 오른쪽을 보는 옆모습. 검붉은 털, 검은 갈기, 붉은 안장 깔개
const BAJI_C = '#e8e2d2';
export function illHorse(g, o = {}) {
  const c = o.coat || '#6e3a26', cd = dk(c, 0.28), mane = o.mane || '#1e1820', hoof = '#2a2228';
  const leg = (pts, col) => { cel(g, S(...pts), col, null, { lw: 0.85 }); };
  // 먼 쪽 다리와 꼬리
  leg([13.0, -31, 17.0, -31, 17.0, -16, 18.4, -3.6, 18.8, 0, 15.0, 0.6, 15.0, -4, 13.6, -16], cd);
  leg([-19.0, -33, -14.0, -32, -14.6, -18, -15.4, -3.6, -14.6, 0, -18.6, 0.6, -18.8, -4, -19.4, -18], cd);
  cel(g, S(-21.6, -43.0, -26.4, -38.0, -30.4, -26.0, -29.0, -14.0, -26.4, -18.0, -25.4, -28.0, -22.0, -36.0), mane, S(-31, -30, -27, -30, -27, -12, -31, -12), { k: 0.2, lw: 0.85 });
  // 몸통·목·머리
  cel(g, S(-22.4, -40.0, -14.0, -46.4, 0.0, -45.6, 12.0, -47.0, 20.4, -42.4, 21.0, -33.0, 14.0, -28.4, 0.0, -27.4, -14.0, -28.2, -22.0, -32.0), c, S(-24, -32, -10, -30.6, 10, -30.6, 22, -32, 22, -26, -24, -26), { k: 0.26, hi: S(-12, -45.4, 0, -44.8, 12, -46, 4, -43.6, -8, -43.6), hk: 0.22, lw: 0.95 });
  cel(g, S(13.0, -44.0, 17.6, -52.0, 23.4, -62.4, 28.6, -61.0, 25.4, -48.0, 21.6, -36.4), c, S(12, -40, 18, -44, 22, -36, 14, -34), { k: 0.24, lw: 0.9 });
  cel(g, S(22.4, -64.0, 27.0, -64.6, 35.8, -53.0, 35.0, -49.6, 31.0, -49.6, 25.4, -55.6), c, S(25, -54, 31, -50, 36, -50, 35, -48, 25, -50), { k: 0.24, hi: S(27, -63.6, 33, -56, 31.6, -55.6), hk: 0.25, lw: 0.9 });
  cel(g, PG(25.8, -59.4, 33.4, -52.2, 31.6, -51.6, 25.2, -58.0), '#f3efe6', null, { lw: 0 });   // 흰 콧날 무늬
  cel(g, PG(23.2, -63.4, 24.0, -69.0, 26.2, -63.6), c, null, { lw: 0.7 });
  dot(g, 27.4, -59.4, 0.8, '#120c10'); dot(g, 34.2, -51.4, 0.5, '#120c10');
  // 갈기
  cel(g, PG(23.4, -64.6, 20.2, -63.0, 21.6, -60.6, 17.4, -58.4, 19.0, -55.6, 14.6, -52.6, 16.2, -50.0, 12.0, -46.8, 14.6, -44.4, 19.4, -52.0, 23.0, -60.0), mane, null, { lw: 0.7 });
  // 굴레와 고삐
  ln(g, O(24.6, -62.4, 30.0, -55.6, 33.6, -51.0), '#5a2a1a', 0.7); ln(g, O(29.4, -54.6, 26.0, -52.4), '#5a2a1a', 0.7);
  ln(g, O(33.0, -51.0, 24.0, -48.0, 15.0, -51.4), '#3a2018', 0.6);
  // 가까운 다리
  leg([14.0, -32, 18.8, -32, 18.4, -17, 19.8, -3.6, 20.8, -0.2, 16.6, 0.6, 16.4, -4, 15.0, -17], c);
  leg([-21.6, -37.0, -12.0, -35.0, -12.0, -21.0, -13.4, -4.0, -12.4, 0.2, -16.8, 0.6, -17.2, -4.0, -18.0, -17.0, -22.6, -27.0], c);
  for (const [x0, x1] of [[16.4, 20.8], [-17.2, -12.4]]) cel(g, PG(x0, -3.0, x1 - 0.6, -3.0, x1, 0.6, x0 - 0.2, 0.6), hoof, null, { lw: 0.6 });
  // 안장 깔개와 안장
  cel(g, S(-9.0, -46.2, 10.0, -46.8, 11.4, -35.0, 1.0, -33.4, -9.4, -34.6), o.cloth || '#a8322a', S(-10, -40, 12, -40, 12, -33, -10, -33), { k: 0.24, lw: 0.85 });
  ln(g, O(-9.0, -36.6, 1.0, -35.4, 11.0, -37.0), GOLD, 1.0);
  cel(g, S(-6.0, -47.8, 0.0, -46.2, 7.4, -48.6, 7.0, -45.2, -5.6, -44.8), '#3a2420', null, { lw: 0.75 });
}
export function illPerson(g, o, sel) {
  const body = sel !== 'head', head = sel !== 'body', skin = o.skin || SKIN, D = o.D || 0;
  if (o.riding && body) { g.save(); g.translate(4, 0); g.scale(1.12, 1.12); illHorse(g, o.horse || {}); g.restore(); }
  if (o.lift) { g.save(); g.translate(0, -o.lift); }
  const up = fn => { g.save(); g.translate(0, -D); fn(); g.restore(); };   // 허리 위는 늘인 다리만큼 올라간다
  if (body) {
    if (o.behind) up(() => o.behind(g, o));
    if (o.chima) chimaDraw(g, o, D); else if (o.riding) { if (o.coat) skirtDraw(g, o); ridingLeg(g, o); } else { legsDraw(g, o, D); if (o.coat) skirtDraw(g, o, D); }
    up(() => {
      if (o.longHair) longHairBack(g, o);
      torsoDraw(g, o);
      sashDraw(g, o);
      if (o.rearItem) o.rearItem(g, o);
      armDraw(g, o, 'rear', skin);
      if (o.rearFront) o.rearFront(g, o);
      armDraw(g, o, 'lead', skin);
      if (o.front) o.front(g, o);
    });
  }
  if (head) up(() => headDraw(g, o, skin));
  if (o.lift) g.restore();
}
// 무기 손잡이를 감싸 쥔 주먹 (무기 그림 위에 따로 얹는다)
export function illFist(g, skin, r = 2.1) {
  cel(g, EL(0, 0.2, r * 1.05, r, 0), skin, EL(-r * 0.35, r * 0.55, r * 0.95, r * 0.6), { k: 0.24, lw: 0.8 });
  for (const t of [-0.42, 0.02, 0.46]) ln(g, O(r * 0.15, t * r * 1.4 + 0.1, r * 0.98, t * r * 1.4), dk(skin, 0.4), 0.42);
  ln(g, O(-r * 0.7, -r * 0.6, -r * 0.1, -r * 0.95), dk(skin, 0.35), 0.4);
}

// ───────── 소품 ─────────
const ITEMS = {
  // 등에 멘 전통(화살통)
  quiver(g) {
    g.save(); g.translate(-6.4, -40); g.rotate(-0.42);
    for (const [x, c] of [[-1.6, WHITE], [0.4, '#c8402f'], [2.2, WHITE]]) { ln(g, O(x, -6, x, -12.4), '#6a4a34', 0.6); cel(g, PG(x - 1.1, -10.6, x, -14.8, x + 1.1, -10.6, x, -11.6), c, null, { lw: 0.5 }); }
    cel(g, S(-3.0, -7.0, 3.4, -7.0, 3.0, 12.0, -2.6, 12.0), '#7a4a2c', R0(1, -8, 3, 21), { k: 0.28, hi: R0(-2.4, -6, 0.9, 17), lw: 0.85 });
    for (const y of [-5.4, 4.0, 10.4]) cel(g, R0(-3.1, y, 6.4, 1.4), GOLD, null, { lw: 0.5 });
    g.restore();
    ln(g, O(-8.6, -32, -1, -40, 5.4, -46.4), '#4a3020', 1.0);
  },
  // 망토 (장군)
  cape(g, o) {
    const c = o.capeCol || '#1f2a44';
    cel(g, S(-5.4, -46.4, 3.0, -47.0, 1.0, -36.0, -2.6, -22.0, -6.6, -7.0, -13.6, -4.0, -21.6, -7.6, -18.4, -13.0, -20.6, -19.4, -14.6, -30.0, -9.0, -40.0), c, S(-23, -8, -18, -18, -14, -32, -9, -24, -7, -6), { k: 0.28, lw: 0.9 });
    cel(g, S(-13.6, -4.0, -21.6, -7.6, -18.4, -13.0, -16.8, -9.0), o.capeLining || '#a8322a', null, { lw: 0.7 });
  },
  // 도사의 지팡이: 끝에 빛나는 구슬
  orbStaff(g, o) {
    const x0 = -12.6, x1 = -11.0, top = -66.0, oy = top - 4.8, y0 = 0.4 + (o && o.D || 0);   // 몸이 올라간 만큼 지팡이 끝이 땅에 닿게
    cel(g, PG(x0 - 0.9, y0, x0 + 0.9, y0, x1 + 0.9, top, x1 - 0.9, top), '#5a3a26', PG(x0 + 0.1, y0 + 0.6, x0 + 1, y0 + 0.6, x1 + 1, top, x1, top), { k: 0.3, lw: 0.75 });
    ln(g, O(x1, top, x1 - 3.0, top - 3.0, x1 - 2.0, top - 7.4, x1 + 0.8, top - 9.6), '#5a3a26', 1.6); ln(g, O(x1, top, x1 + 3.0, top - 2.6, x1 + 2.6, top - 7.0, x1 + 0.8, top - 9.6), '#5a3a26', 1.6);
    cel(g, EL(x1 + 0.1, oy, 3.2, 3.2), '#ffe7a0', EL(x1 + 1.4, oy + 1, 2.4, 2.4), { sc: '#f0b84a', hi: EL(x1 - 1.0, oy - 1.2, 1.1, 0.8), hc: '#ffffff', lw: 0.8 });
    ribbon(g, [x1 - 0.4, top + 1.4, x1 - 2.4, top + 6.0, x1 - 2.0, top + 10.4], 0.8, '#c8402f', { lw: 0.55 });
  },
  // 무녀가 뒷손에 쥔 노란 부적
  talisman(g) {
    g.save(); g.translate(-8.0, -30.6); g.rotate(-0.38);
    cel(g, PG(-2.2, -1.0, 2.2, -1.0, 2.2, -12.0, -2.2, -12.0), '#f2d25a', PG(0.6, 0, 3, 0, 3, -13, 0.6, -13), { k: 0.14, lw: 0.65 });
    ln(g, O(0, -10.6, -1.0, -9.0, 1.0, -7.6, -1.0, -6.0, 0.8, -4.4, -0.4, -2.6), '#b8342a', 0.65);
    dot(g, 0, -10.8, 0.6, '#b8342a');
    g.restore();
  },
  // 등패: 등나무를 엮은 둥근 방패
  rattan(g) {
    const x = -4.6, y = -30.8, r = 9.6;
    cel(g, EL(x, y, r * 0.86, r, -0.06), '#c99a52', EL(x - 2.6, y + 1.4, r * 0.7, r * 0.9), { k: 0.24, hi: EL(x + 3.4, y - 4.2, 2.4, 1.6), lw: 0.95 });
    for (const k of [0.78, 0.56]) { g.beginPath(); g.ellipse(x, y, r * 0.86 * k, r * k, -0.06, 0, TAU); st(g, '#8a6230', 0.55); }
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; ln(g, O(x + Math.cos(a) * r * 0.86 * 0.56, y + Math.sin(a) * r * 0.56, x + Math.cos(a) * r * 0.86 * 0.95, y + Math.sin(a) * r * 0.95), '#9a7238', 0.4); }
    cel(g, EL(x, y, 3.0, 3.4), '#b8302a', EL(x - 1, y + 0.6, 2.4, 2.8), { k: 0.25, lw: 0.7 });
    ln(g, p => p.arc(x, y - 0.4, 1.5, PI * 0.1, PI * 1.2), GOLD, 0.6);
  },
  // 꽹과리 (상쇠의 뒷손)
  gong(g) {
    const x = -8.4, y = -34.4;
    ribbon(g, [x + 0.4, y + 3.6, x - 0.6, y + 8.4, x - 2.0, y + 12.4], 0.6, '#c8402f', { lw: 0.5 });
    ribbon(g, [x + 0.6, y + 3.6, x + 1.4, y + 8.6, x + 1.0, y + 12.6], 0.6, '#2f4d7e', { lw: 0.5 });
    cel(g, EL(x, y, 4.0, 4.6, 0.2), '#e2b24a', EL(x + 1.4, y + 1.2, 3.2, 3.6), { sc: '#b8862a', hi: EL(x - 1.4, y - 1.8, 1.4, 1.0), hc: '#fff1c4', lw: 0.85 });
    g.beginPath(); g.ellipse(x, y, 2.8, 3.3, 0.2, 0, TAU); st(g, '#a8782a', 0.5);
  },
  // 염주 (가슴에 건 짧은 것)
  beads(g) { for (let i = 0; i <= 10; i++) { const t = i / 10, x = -3.0 + t * 8.6, y = -46.6 + Math.sin(t * PI) * 7.0; cel(g, EL(x, y, 0.85, 0.85), i % 5 === 0 ? GOLD : '#6a3a26', null, { lw: 0.45 }); } },
  // 신선이 딛고 선 구름
  cloud(g) {
    // 운문(구름무늬): 둥근 덩이가 겹친 한 덩어리 구름, 끝이 말려 올라간다
    const blob = S(-19.0, 2.6, -20.4, -0.8, -17.2, -3.6, -13.4, -3.2, -11.0, -6.8, -5.6, -7.6, -2.2, -5.0, 1.4, -8.0, 6.8, -7.4, 9.4, -4.0, 13.6, -4.8, 17.8, -2.4, 18.6, 1.2, 15.4, 3.6, 6.0, 4.0, -4.0, 4.4, -13.0, 4.2);
    cel(g, blob, '#eef0fa', S(-20, 1, -8, 1.4, 4, 0.6, 19, 0.4, 18, 5, -20, 5), { sc: '#b4b8d8', hi: S(-10, -6.4, -5.6, -7.2, -2.6, -5.2, -6, -5.2), hc: '#ffffff', lw: 0.9 });
    for (const [x, y, r, a0, a1] of [[-13.6, -1.0, 2.6, PI * 0.8, PI * 2.2], [3.0, -2.6, 3.0, PI * 0.9, PI * 2.3], [13.0, -0.6, 2.2, PI * 0.8, PI * 2.1]]) ln(g, p => p.arc(x, y, r, a0, a1), '#8f95c0', 0.6);
    ribbon(g, [18.0, -1.2, 21.6, -3.2, 23.4, -6.6, 21.6, -8.4], 1.0, '#eef0fa', { lw: 0.6 });
  },
  // 사냥꾼의 털 조끼 (몸판 위에 두른 짐승 털)
  pelt(g) {
    const pts = [-7.4, -46.4, -2.6, -47.0, -1.8, -40.0, -2.8, -33.0];
    for (let i = 0; i < 6; i++) pts.push(-3.6 - i * 0.8, -32.0 + (i % 2 ? 1.6 : 0));
    pts.push(-8.4, -34.0, -8.2, -42.0);
    cel(g, PG(...pts), '#c49a62', PG(-9, -48, -5, -48, -5, -30, -9, -30), { k: 0.24, lw: 0.75 });
    for (const [x, y] of [[-6, -43], [-4.4, -38.6], [-6.8, -36]]) ln(g, O(x, y, x + 1.2, y + 1.4), '#8a6438', 0.5);
  },
};

// ───────── 도깨비 ─────────
// 큰 도깨비 (방망이·두억시니·두목): 웅크린 큰 몸, 뿔 두 개, 굵은 염주, 해진 흰 천, 노랗게 빛나는 눈
// 좌표: 발 0, 허리 -21, 어깨 -41, 목 축 -40
const DH = { x: 16.6, y: -24 };
function bigDokBody(g, o) {
  const sk = o.skin, sh = dk(sk, 0.3);
  if (o.back) o.back(g);
  // 뒷다리·뒷팔
  cel(g, limb(-5.6, -21, -9.4, -11.6, -7.6, -2.8, 4.8, 4.0, 3.0), dk(sk, 0.12), null, { lw: 0.9 });
  cel(g, S(-12.4, -3.6, -5.0, -3.8, -2.4, -1.4, -2.4, 0.6, -12.6, 0.6), dk(sk, 0.16), null, { lw: 0.85 });
  for (const x of [-4.4, -2.8]) cel(g, PG(x, -0.6, x + 1.8, 0, x, 0.8), '#efe2c0', null, { lw: 0.4 });
  const [rex, rey] = elbow(-10.4, -39.6, -13.6, -19.6, 10.4, 10.0, -1);
  cel(g, limb(-10.4, -39.6, rex, rey, -13.6, -19.6, 4.6, 3.8, 3.2), dk(sk, 0.1), null, { lw: 0.9 });
  cel(g, EL(-13.6, -18.6, 3.4, 3.0), dk(sk, 0.1), null, { lw: 0.8 });
  for (const i of [0, 1, 2]) cel(g, PG(-15.6 + i * 1.6, -16.4, -15.0 + i * 1.6, -13.6, -14.2 + i * 1.6, -16.2), '#efe2c0', null, { lw: 0.4 });
  // 앞다리
  cel(g, limb(5.0, -21, 9.6, -11.4, 8.4, -2.8, 5.0, 4.2, 3.2), sk, limb(3.4, -20, 7.6, -11, 6.6, -3, 2.2, 1.6, 1.2), { k: 0.26, lw: 0.9 });
  cel(g, S(4.6, -3.8, 11.0, -3.8, 14.6, -1.4, 14.6, 0.6, 4.4, 0.6), sk, S(4, 0, 15, 0, 15, 1, 4, 1), { k: 0.3, lw: 0.85 });
  for (const x of [11.4, 13.2]) cel(g, PG(x, -0.6, x + 1.8, 0, x, 0.8), '#efe2c0', null, { lw: 0.4 });
  // 몸통: 술통 같은 가슴과 배
  cel(g, S(-12.6, -39.8, -6.4, -44.2, 4.0, -44.6, 12.2, -41.0, 14.0, -33.4, 11.4, -24.6, 2.4, -22.4, -8.0, -23.8, -12.6, -30.6), sk, S(-14, -42, -6, -44, -4, -34, -2, -22, -14, -22), { k: 0.26, hi: S(8.6, -41.6, 12.6, -37.4, 12.6, -32, 10.6, -35.6), hk: 0.22, lw: 0.95 });
  ln(g, O(-0.6, -38.0, 3.6, -35.6, 8.6, -37.4), sh, 0.75);       // 가슴
  ln(g, O(2.6, -35.6, 3.2, -30.0, 2.8, -25.0), sh, 0.6);         // 배
  ln(g, O(-1.4, -30.0, 3.2, -29.2, 7.8, -30.0), sh, 0.5);
  // 해진 흰 천: 허리에 두르고 한쪽 어깨에 걸친다
  const cl = o.cloth || '#ece6d8';
  cel(g, PG(-12.8, -26.4, -4, -24.6, 6, -25.0, 12.6, -27.0, 13.2, -19.0, 10.8, -13.0, 9.0, -16.6, 7.0, -11.4, 4.4, -15.8, 1.6, -10.8, -0.6, -15.4, -3.4, -11.0, -5.6, -15.8, -8.2, -11.6, -10.0, -16.4, -12.6, -13.6, -13.6, -20.0), cl, PG(-15, -27, -4, -27, -3, -10, -15, -10), { k: 0.2, lw: 0.85 });
  ln(g, O(-12.8, -24.4, 0, -22.6, 12.8, -25.2), o.rope || '#8a6a3c', 1.4);
  if (!o.noSash) {
    cel(g, PG(-11.4, -41.4, -7.0, -43.2, 11.6, -26.6, 9.6, -24.0, 7.4, -25.6, 5.0, -26.8, 2.6, -28.0, 0.4, -30.0, -2.2, -31.2), cl, PG(-12, -42, -8, -44, -2, -30, -6, -30), { k: 0.2, lw: 0.8 });
    for (const [x, y] of [[0, -35.6], [5.0, -31.0]]) ln(g, O(x, y, x + 2, y - 1.6), dk(cl, 0.2), 0.5);
  }
  // 앞팔: 굵은 어깨와 팔뚝, 팔찌
  const [ex, ey] = elbow(9.6, -40.4, DH.x, DH.y, 10.0, 9.6, 1);
  cel(g, limb(9.6, -40.4, ex, ey, DH.x, DH.y, 5.2, 4.2, 3.4), sk, limb(8.6, -38.4, ex - 1.4, ey + 0.6, DH.x - 1, DH.y + 0.6, 3.0, 2.2, 1.6), { k: 0.24, hi: limb(10.6, -42, ex + 1.2, ey - 1.4, DH.x + 0.8, DH.y - 1.2, 1.2, 1.0, 0.6), hk: 0.22, lw: 0.95 });
  cel(g, limb(ex + (DH.x - ex) * 0.5, ey + (DH.y - ey) * 0.5, ex + (DH.x - ex) * 0.62, ey + (DH.y - ey) * 0.62, ex + (DH.x - ex) * 0.74, ey + (DH.y - ey) * 0.74, 3.8, 3.8, 3.7), '#b8862a', null, { lw: 0.7 });
  cel(g, EL(DH.x, DH.y, 3.4, 3.0, 0.3), sk, EL(DH.x - 1, DH.y + 1, 2.8, 2), { k: 0.24, lw: 0.85 });
  // 굵은 염주: 목에 걸어 배까지 늘어뜨린 큰 나무 구슬 (팔보다 앞에)
  if (o.beads) for (let i = 0; i <= 8; i++) { const t = i / 8, x = -7.2 + t * 13.6, y = -42.4 + Math.sin(t * PI) * 11.0, r = i === 4 ? 2.6 : 2.1; cel(g, EL(x, y, r, r), i === 4 ? '#c8402f' : '#4a2e22', EL(x + 0.7, y + 0.7, r * 0.8, r * 0.8), { k: 0.32, hi: EL(x - 0.6, y - 0.8, r * 0.36, r * 0.26), hc: '#e8c8a8', lw: 0.7 }); }
  if (o.beads) ribbon(g, [-0.6, -28.4, -1.2, -25.0, -0.4, -21.6], 0.9, '#c8402f', { lw: 0.5 });
  if (o.item) o.item(g);
}
function bigDokHead(g, o) {
  const sk = o.skin, hc = o.hair || '#2a1f2a', hn = o.horn || '#efe2c0';
  // 갈기: 뒤로 뻗친 거친 머리털
  const mane = [-1.6, -59.6, 3.0, -62.0, 8.6, -61.6, 11.6, -58.6, 10.6, -57.6, 6.0, -58.4, 2.6, -57.0, 0.4, -53.0, -0.8, -48.0, -2.4, -43.0, -5.0, -45.8, -6.4, -42.6, -8.6, -47.0, -11.4, -45.4, -11.2, -50.4, -14.6, -51.0, -12.0, -54.8, -14.6, -57.8, -9.4, -58.4, -9.8, -62.0, -5.0, -60.0];
  cel(g, PG(...mane), hc, PG(-16, -60, -5, -58, -2, -44, -16, -44), { k: 0.22, lw: 0.9 });
  // 얼굴: 넓은 턱이 앞으로 나온다
  cel(g, S(-1.6, -56.8, -2.4, -50.6, 0.4, -45.6, 5.6, -43.2, 11.6, -44.0, 13.4, -46.6, 14.0, -49.8, 14.0, -49.8, 12.6, -51.4, 12.8, -54.0, 11.2, -57.6, 5.6, -59.4, 1.0, -58.8), sk, S(-3, -57, 2, -55, 4, -50, 6, -44, -3, -44), { k: 0.24, hi: S(9.6, -56.8, 12.4, -54.4, 12.0, -52, 9.6, -53.6), hk: 0.2, lw: 0.95 });
  // 귀
  cel(g, S(0.0, -53.6, -2.6, -55.4, -3.4, -52.2, -1.2, -49.6), sk, null, { lw: 0.75 });
  // 뿔 두 개 (마디진 상아빛)
  const horn = (bx, by, tx, ty, w, bend) => { cel(g, S(bx - w, by, (bx + tx) / 2 - w * 0.5 + bend, (by + ty) / 2, tx, ty, tx, ty, (bx + tx) / 2 + w * 0.5 + bend, (by + ty) / 2, bx + w, by), hn, S(bx, by + 1, tx, ty, bx + w + 1, by + 1), { k: 0.26, lw: 0.8 }); for (const t of [0.3, 0.55]) { const x = bx + (tx - bx) * t + bend * 0.6, y = by + (ty - by) * t; ln(g, O(x - w * (1 - t) * 0.9, y + 0.3, x + w * (1 - t) * 0.9, y - 0.3), dk(hn, 0.3), 0.45); } };
  horn(3.4, -58.2, 0.4, -68.6, 2.1, -1.6); horn(9.4, -57.8, 11.6, -67.0, 1.6, 0.6);
  // 눈썹·눈: 짙은 눈두덩 아래 노랗게 빛나는 눈
  cel(g, PG(4.4, -55.6, 9.6, -53.0, 9.0, -52.0, 4.0, -54.0), hc, null, { lw: 0.5 });
  cel(g, PG(11.0, -53.2, 13.2, -55.0, 13.4, -54.0, 11.4, -52.4), hc, null, { lw: 0.5 });
  eye(g, 7.4, -51.6, 4.0, 2.0, -0.5, true, { glow: true, iris: '#ffb020', look: 0.12, blink: o.blink });
  eye(g, 12.0, -51.6, 2.0, 1.7, -0.5, false, { glow: true, iris: '#ffb020', look: 0.1, blink: o.blink });
  // 넓적한 코
  cel(g, S(11.8, -50.6, 14.4, -50.0, 14.6, -48.2, 12.4, -47.8), sk, S(11, -48, 15, -48, 15, -47, 11, -47), { k: 0.26, lw: 0.7 });
  dot(g, 13.4, -48.6, 0.5, dk(sk, 0.6));
  // 입: 크게 벌린 입과 위로 솟은 엄니
  cel(g, S(5.0, -46.8, 12.4, -47.0, 11.8, -45.0, 6.4, -44.8), '#5a1820', null, { lw: 0.75 });
  ln(g, O(5.4, -46.6, 8.8, -46.8, 12.0, -46.8), '#f6f0e0', 0.7);
  for (const [x, h] of [[6.6, 3.8], [11.0, 3.0]]) cel(g, PG(x - 0.95, -45.0, x + 0.95, -45.0, x + 0.3, -45.0 - h), '#f6efdc', null, { lw: 0.55 });
  if (o.hat && HAT_DOK[o.hat]) HAT_DOK[o.hat](g, o);
}
// 작은 도깨비 (졸개·돌팔매·야광귀): 머리가 크고 팔다리가 가는 청록빛 꼬마. 외뿔 하나
// 좌표: 발 0, 허리 -14, 어깨 -24, 목 축 -24
const SDH = { x: 9.6, y: -15.6 };
function smallDokBody(g, o) {
  const sk = o.skin, cl = o.cloth || '#c9b07a';
  if (o.back) o.back(g);
  cel(g, limb(-3.4, -14, -5.6, -7.6, -4.6, -2.2, 2.4, 1.9, 1.5), dk(sk, 0.12), null, { lw: 0.8 });
  cel(g, S(-7.6, -2.6, -3.2, -2.8, -1.4, -0.8, -1.6, 0.6, -7.6, 0.6), dk(sk, 0.14), null, { lw: 0.75 });
  const [rex, rey] = elbow(-5.6, -23.2, -7.6, -12.6, 6.0, 5.8, -1);
  cel(g, limb(-5.6, -23.2, rex, rey, -7.6, -12.6, 2.2, 1.8, 1.5), dk(sk, 0.1), null, { lw: 0.8 });
  cel(g, EL(-7.6, -12.2, 1.8, 1.6), dk(sk, 0.1), null, { lw: 0.7 });
  cel(g, limb(3.0, -14, 5.8, -7.4, 5.0, -2.2, 2.4, 1.9, 1.5), sk, limb(2, -13.6, 4.6, -7.4, 4, -2.4, 1, 0.8, 0.6), { k: 0.26, lw: 0.8 });
  cel(g, S(2.4, -2.8, 7.0, -3.0, 9.6, -1.0, 9.4, 0.6, 2.4, 0.6), sk, S(2, 0, 10, 0, 10, 1, 2, 1), { k: 0.3, lw: 0.75 });
  // 배불뚝이 몸
  cel(g, S(-6.4, -22.6, -2.0, -25.4, 3.6, -25.0, 7.0, -21.6, 7.6, -16.0, 5.4, -11.6, -0.4, -10.6, -5.6, -12.4, -7.0, -17.6), sk, S(-8, -24, -3, -25, -2, -17, -1, -10, -8, -10), { k: 0.26, hi: S(4.2, -22.6, 6.8, -19.6, 6.6, -16, 5.2, -18.6), hk: 0.22, lw: 0.9 });
  ln(g, O(0.4, -19.2, 3.0, -17.6, 5.6, -18.4), dk(sk, 0.32), 0.5);
  // 짚을 엮은 허리 가리개
  const pts = [-7.0, -15.4, 0, -14.0, 7.4, -15.6];
  for (let i = 0; i <= 8; i++) pts.push(7.4 - i * 1.85, -8.4 + (i % 2 ? -2.2 : 0));
  cel(g, PG(...pts), cl, PG(-8, -16, -2, -16, -2, -6, -8, -6), { k: 0.22, lw: 0.75 });
  for (let i = 0; i < 7; i++) ln(g, O(-6 + i * 2, -14.4, -6.4 + i * 2.1, -9.4), dk(cl, 0.25), 0.4);
  ln(g, O(-7.0, -15.0, 0, -13.6, 7.4, -15.2), '#6a4a2c', 1.0);
  if (o.item) o.item(g);
  const [ex, ey] = elbow(4.6, -23.4, SDH.x, SDH.y, 5.8, 5.6, 1);
  cel(g, limb(4.6, -23.4, ex, ey, SDH.x, SDH.y, 2.3, 1.9, 1.6), sk, limb(4, -22.4, ex - 0.8, ey + 0.4, SDH.x - 0.6, SDH.y + 0.4, 1.2, 0.9, 0.7), { k: 0.24, lw: 0.8 });
  cel(g, EL(SDH.x, SDH.y, 2.0, 1.8, 0.3), sk, EL(SDH.x - 0.6, SDH.y + 0.6, 1.6, 1.2), { k: 0.24, lw: 0.7 });
}
function smallDokHead(g, o) {
  const sk = o.skin, hc = o.hair || '#1e2a2a', hn = o.horn || '#efe2c0';
  cel(g, PG(-6.4, -35.6, -9.4, -33.0, -7.2, -31.6, -9.6, -28.6, -6.2, -28.6, -6.6, -25.2, -3.4, -27.0, -1.2, -31.4, 0.6, -35.6, 2.4, -38.0, -2.0, -38.6), hc, null, { lw: 0.8 });
  cel(g, S(-6.0, -33.8, -5.6, -28.0, -2.6, -24.6, 2.6, -23.2, 7.6, -24.4, 9.8, -27.4, 10.8, -29.6, 10.8, -29.6, 9.6, -30.6, 9.8, -33.0, 8.4, -36.6, 3.6, -38.8, -1.6, -38.2), sk, S(-7, -35, -2, -35, 0, -29, 2, -23, -7, -23), { k: 0.24, hi: S(6.6, -36, 9.0, -33.6, 8.8, -31.6, 6.6, -33.2), hk: 0.2, lw: 0.9 });
  // 귀: 짧고 둥근 귀 (뾰족한 귀는 서양 괴물 같다)
  cel(g, S(-2.6, -32.6, -5.0, -33.4, -5.8, -30.6, -3.6, -28.6), sk, S(-6, -33, -4.6, -33, -4.6, -28, -6, -28), { k: 0.22, lw: 0.7 });
  if (!o.noHorn) { cel(g, S(2.4, -37.6, 2.8, -40.8, 4.0, -44.4, 4.0, -44.4, 5.6, -40.6, 5.6, -37.8), hn, S(2, -38, 4, -44, 3.2, -38), { k: 0.24, lw: 0.75 }); ln(g, O(2.8, -39.6, 5.4, -39.8), dk(hn, 0.3), 0.45); }
  // 눈: 크고 노랗게 빛나는 눈
  cel(g, PG(2.4, -33.4, 6.6, -32.0, 6.2, -31.2, 2.2, -32.4), hc, null, { lw: 0.4 });
  eye(g, 4.6, -30.2, 3.8, 2.1, -0.2, true, { glow: true, iris: '#ffb020', look: 0.12, blink: o.blink });
  eye(g, 8.8, -30.2, 2.0, 1.8, -0.2, false, { glow: true, iris: '#ffb020', look: 0.1, blink: o.blink });
  cel(g, S(9.6, -29.4, 11.4, -28.8, 11.2, -27.4, 9.8, -27.4), sk, S(9, -27.6, 12, -27.6, 12, -27, 9, -27), { k: 0.25, lw: 0.6 });
  // 히죽 웃는 입과 송곳니
  cel(g, p => { p.moveTo(3.6, -26.6); p.quadraticCurveTo(7.0, -24.8, 9.8, -26.4); p.quadraticCurveTo(7.0, -25.6, 3.6, -26.6); p.closePath(); }, '#5a1820', null, { lw: 0.65 });
  cel(g, PG(5.0, -26.0, 5.8, -25.6, 5.4, -24.6), '#f6efdc', null, { lw: 0.4 });
  if (o.hat && HAT_DOK[o.hat]) HAT_DOK[o.hat](g, o);
}
const HAT_DOK = {
  // 삿갓 (졸개 도깨비): 넓은 짚 삿갓
  straw(g) {
    cel(g, p => { p.moveTo(-10.4, -34.6); p.quadraticCurveTo(-2.0, -43.6, 2.6, -45.2); p.quadraticCurveTo(7.4, -43.6, 15.2, -35.0); p.quadraticCurveTo(2.6, -31.8, -10.4, -34.6); p.closePath(); }, '#d7b46c', PG(-11, -35, 2.6, -45.4, 0, -32), { k: 0.22, hi: PG(3.6, -44.8, 15, -35.2, 10, -34.6), hk: 0.25, lw: 0.85 });
    for (let i = 0; i < 8; i++) { const t = i / 7; ln(g, O(2.6, -44.8, -10.0 + t * 25, -34.8 + Math.sin(t * PI) * 1.8), '#a0803e', 0.4); }
    ln(g, O(-4.0, -37.4, 2.6, -38.6, 9.6, -37.4), '#7a4a2c', 0.8);
    // 삿갓을 뚫고 나온 작은 뿔 둘
    for (const [bx, tx] of [[-0.8, -2.8], [6.4, 8.6]]) { cel(g, S(bx - 1.1, -40.6, (bx + tx) / 2, -44.0, tx, -46.4, tx, -46.4, bx + 1.2, -41.0), '#efe2c0', S(bx, -40, tx, -46.4, bx + 1.4, -40), { k: 0.24, lw: 0.7 }); ln(g, O(bx - 0.9, -42.4, bx + 1.0, -42.8), '#a89878', 0.4); }
  },
  // 머리 수건 (돌팔매)
  wrap(g, o) {
    const c = o.wrapCol || '#8a3a30';
    cel(g, p => { p.moveTo(-5.8, -33.6); p.quadraticCurveTo(1.6, -39.4, 9.2, -35.4); p.lineTo(9.4, -33.4); p.quadraticCurveTo(1.6, -37.0, -6.0, -31.6); p.closePath(); }, c, null, { lw: 0.65 });
    ribbon(g, [-5.6, -32.6, -9.0, -33.4, -12.4, -31.0], 0.8, c, { cut: true, lw: 0.55 });
  },
  // 두목의 상투 매듭
  knot(g, o) { cel(g, EL(2.0, -61.6, 3.0, 2.4), o.hair || '#2a1f2a', null, { lw: 0.7 }); ln(g, O(-1.6, -61.0, 5.6, -62.6), GOLD, 1.0); },
};
// 도깨비의 소품
const DPROP = {
  // 돌팔매: 앞손에서 늘어진 끈과 돌주머니
  sling(g) { ln(g, O(SDH.x + 0.6, SDH.y + 1.2, SDH.x + 2.6, SDH.y + 5.4, SDH.x + 1.2, SDH.y + 8.8), '#8a6a3c', 0.7); ln(g, O(SDH.x + 1.4, SDH.y + 1.2, SDH.x + 4.2, SDH.y + 5.0, SDH.x + 2.2, SDH.y + 8.8), '#8a6a3c', 0.7); cel(g, EL(SDH.x + 1.8, SDH.y + 9.4, 1.9, 1.5), '#8a6a3c', null, { lw: 0.6 }); cel(g, EL(SDH.x + 1.8, SDH.y + 8.8, 1.2, 1.0), '#9a9aa6', null, { lw: 0.5 }); },
  // 야광귀가 훔친 신을 넣은 보따리 (등에 멘다)
  sack(g) { cel(g, S(-10.6, -24.6, -4.4, -25.4, -3.0, -19.0, -5.0, -13.6, -10.4, -13.4, -12.4, -18.6), '#c9b07a', S(-13, -20, -8, -20, -8, -13, -13, -13), { k: 0.24, lw: 0.8 }); cel(g, PG(-8.8, -26.6, -6.4, -27.4, -6.2, -24.6, -8.6, -24.4), '#a8322a', null, { lw: 0.6 }); for (const [x, y] of [[-9, -19], [-6.4, -17]]) ln(g, O(x, y, x + 1.6, y + 1.2), '#8a7040', 0.5); },
  // 솥뚜껑 방패
  lid(g) { cel(g, EL(-6.6, -29.0, 8.4, 9.6, -0.1), '#4a4a58', EL(-9, -27, 6.4, 8.4), { sc: '#34343f', hi: EL(-3.6, -33.6, 2.6, 1.8), hc: '#8a8a9a', lw: 0.95 }); g.beginPath(); g.ellipse(-6.6, -29, 6.2, 7.2, -0.1, 0, TAU); st(g, '#2a2a34', 0.6); cel(g, EL(-6.6, -29.0, 2.2, 1.6), '#2a2a34', null, { lw: 0.6 }); },
  // 북: 붉은 테의 작은 북
  drum(g) { cel(g, S(-13.4, -33.0, -3.6, -33.4, -3.2, -22.6, -13.0, -22.2), '#a8322a', S(-14, -34, -9, -34, -9, -21, -14, -21), { k: 0.25, lw: 0.9 }); for (const y of [-32.6, -22.8]) cel(g, EL(-8.4, y, 5.0, 1.4), '#efe2c0', null, { lw: 0.6 }); for (let i = 0; i < 4; i++) ln(g, O(-12.6 + i * 3, -31.4, -11.6 + i * 3, -24.0), GOLD, 0.5); },
};
// 도깨비불: 얼굴이 있는 푸른 불꽃
function flame(g, o) {
  const outer = [0.6, -47.6, 0.6, -47.6, 3.6, -40.0, 6.4, -41.6, 6.4, -41.6, 8.4, -33.6, 10.4, -24.4, 8.4, -15.6, 2.4, -11.4, -4.4, -12.0, -9.6, -17.6, -10.6, -26.6, -8.6, -33.6, -11.6, -37.4, -11.6, -37.4, -6.6, -35.6, -4.6, -42.0];
  cel(g, S(...outer), '#3f6fe8', S(-12, -30, -6, -36, -8, -16, 0, -11, -12, -12), { sc: '#2c4cc0', hi: S(5.2, -36.8, 8.6, -28.4, 7.8, -20, 6.0, -26.4), hc: '#7ab0ff', lw: 0.9 });
  cel(g, S(0.8, -40.4, 4.4, -33.0, 6.6, -24.8, 4.8, -16.6, -0.2, -14.2, -5.4, -16.6, -7.0, -24.0, -5.0, -31.6, -2.6, -30.6), '#86c4ff', null, { lw: 0 });
  cel(g, S(0.4, -33.6, 3.6, -26.2, 3.0, -18.6, -0.4, -16.4, -3.8, -18.6, -4.4, -24.4, -2.4, -29.6), '#e6f6ff', null, { lw: 0 });
  // 얼굴: 비스듬한 두 눈과 작은 입
  if (o.blink) { for (const x of [-1.6, 3.2]) ln(g, O(x - 1.2, -24.4, x, -23.6, x + 1.2, -24.4), '#1a2a6a', 0.8); }
  else for (const [x, w] of [[-1.6, 1.5], [3.2, 1.2]]) { cel(g, EL(x, -24.6, w, 2.0, x < 0 ? 0.3 : -0.3), '#1a2a6a', null, { lw: 0 }); dot(g, x + 0.3, -25.2, 0.45, '#ffffff'); }
  cel(g, EL(0.8, -20.2, 1.1, 0.8), '#1a2a6a', null, { lw: 0 });
}

// 여우 (불여우·구미호): 오른쪽을 보고 몸을 낮춘 옆모습. 꼬리는 엉덩이에서 부채처럼 펼친다
function illFox(g, o = {}) {
  const fur = o.fur || '#d8662e', belly = o.belly || '#f6efe2', sock = o.sock || '#3a2428', tip = o.tip || '#f8f4ec', n = o.tails === undefined ? 1 : o.tails, fd = dk(fur, 0.2);
  // 꼬리: 밑동에서 뒤·위로 S자로 휘는 탐스러운 붓 모양. 끝은 희다
  const tail = (a, len, w, col, bend) => {
    g.save(); g.translate(-12.4, -17.0); g.rotate(a);
    const N = 10, top = [], bot = [], mid = [], cy = t => bend * len * 0.16 * Math.sin(t * PI * 1.25);
    for (let i = 0; i <= N; i++) {
      const t = i / N, x = -len * t, y = cy(t), dx = -len, dy = bend * len * 0.16 * PI * 1.25 * Math.cos(t * PI * 1.25), l = Math.hypot(dx, dy), nx = -dy / l, ny = dx / l;
      const ww = w * 0.85 * Math.sin(Math.pow(t, 0.7) * PI) + w * (0.32 + 0.12 * t);
      top.push(x + nx * ww, y + ny * ww); bot.push(x - nx * ww, y - ny * ww); mid.push(x, y);
    }
    const tip = [-len * 1.1, cy(1.1)], pts = top.concat(tip);   // 끝은 둥글게 모은다
    for (let i = N; i >= 0; i--) pts.push(bot[i * 2], bot[i * 2 + 1]);
    const shape = S(...pts), shade = []; for (let i = 0; i <= N; i++) shade.push(mid[i * 2], mid[i * 2 + 1]); for (let i = N; i >= 0; i--) shade.push(bot[i * 2] - 2, bot[i * 2 + 1] + 3);
    g.beginPath(); shape(g); g.fillStyle = col; g.fill();
    g.save(); g.beginPath(); shape(g); g.clip(); g.beginPath(); PG(...shade)(g); g.fillStyle = dk(col, 0.22); g.fill();
    g.fillStyle = o.tip || '#f8f4ec'; g.fillRect(-len * 1.4, -w * 3, len * 0.6, w * 6); g.restore();
    g.beginPath(); shape(g); st(g, LN, 0.85);
    for (const t of [0.3, 0.5]) { const i = Math.round(t * N); ln(g, O(mid[i * 2], mid[i * 2 + 1] - w * 0.3, mid[i * 2] - len * 0.1, mid[i * 2 + 1] + w * 0.1), dk(col, 0.28), 0.5); }
    g.restore();
  };
  if (n <= 1) { if (n === 1) tail(0.5, 22, 5.6, fur, 1); }
  else for (let i = n - 1; i >= 0; i--) { const t = i / (n - 1); tail(-0.05 + t * 1.8, 24 + ((i * 7) % 4) * 2.4 + Math.sin(t * PI) * 6, 5.0, i % 2 ? fur : dk(fur, 0.08), i % 2 ? 1 : -0.8); }
  // 먼 쪽 다리 (그늘)
  cel(g, S(-11.0, -14.0, -8.6, -14.0, -8.0, -4.0, -7.0, -0.2, -9.8, 0.6, -10.4, -5.0), fd, null, { lw: 0.8 });
  cel(g, S(10.6, -15.0, 12.8, -15.0, 14.2, -4.4, 15.8, -0.4, 13.0, 0.6, 12.0, -4.4), fd, null, { lw: 0.8 });
  for (const [x0, x1] of [[-10.9, -7.0], [11.6, 16.0]]) cel(g, S(x0, -4.6, x0 + 3.0, -4.8, x1, -0.2, x1 - 3.6, 0.6), sock, null, { lw: 0.7 });
  // 몸통
  cel(g, S(-15.4, -17.0, -10.0, -22.8, 0.0, -23.2, 8.4, -23.6, 13.4, -21.4, 14.0, -16.4, 10.4, -13.4, 2.0, -14.8, -6.0, -14.2, -13.2, -13.6), fur, S(-16, -15.4, -4, -15.8, 8, -15.2, 14, -14, 14, -11, -16, -11), { k: 0.24, hi: S(-9, -22, 0, -21.4, 7.6, -23, 4, -21, -4, -20.4), hk: 0.25, lw: 0.9 });
  cel(g, S(8.2, -20.6, 13.6, -20.4, 13.8, -14.4, 10.2, -10.8, 7.2, -14.2), belly, S(7, -14, 14, -14, 14, -10, 7, -10), { k: 0.14, lw: 0.75 });
  // 가까운 뒷다리·앞다리 (검은 발목)
  cel(g, S(-16.6, -15.6, -10.2, -19.2, -7.8, -13.6, -9.6, -9.6, -11.2, -6.8, -9.4, -0.2, -12.0, 0.6, -13.6, -6.0, -12.6, -9.6, -14.6, -11.2), fur, S(-17, -12, -8, -12, -8, 1, -17, 1), { k: 0.22, lw: 0.85 });
  cel(g, S(7.8, -15.6, 11.0, -15.8, 10.8, -5.2, 12.8, -0.4, 9.8, 0.6, 8.8, -5.0), fur, S(6, -8, 13, -8, 13, 1, 6, 1), { k: 0.2, lw: 0.85 });
  for (const [x0, x1] of [[-13.4, -9.0], [8.8, 12.8]]) cel(g, S(x0, -5.2, x0 + 3.0, -5.4, x1, -0.4, x1 - 0.6, 0.6, x0 + 0.6, 0.6), sock, null, { lw: 0.7 });
  // 목과 머리: 뾰족한 주둥이, 큰 귀, 흰 뺨털
  cel(g, S(8.4, -22.6, 13.6, -28.6, 18.6, -26.4, 15.6, -18.4, 10.6, -17.6), fur, S(9, -20, 16, -20, 15, -17, 9, -17), { k: 0.2, lw: 0.85 });
  cel(g, PG(14.8, -30.2, 17.2, -38.6, 19.4, -30.6), fd, null, { lw: 0.75 });
  cel(g, S(11.4, -29.8, 15.6, -32.2, 19.4, -30.0, 25.6, -25.6, 25.6, -25.6, 23.4, -23.8, 18.0, -22.6, 13.6, -23.4, 11.0, -26.4), fur, S(11, -27, 15, -25, 20, -23.6, 13, -22, 10, -24), { k: 0.2, hi: S(15, -31.4, 19.4, -29.6, 23, -26.8, 18, -28.4), hk: 0.25, lw: 0.9 });
  cel(g, S(13.4, -24.4, 18.0, -22.8, 21.6, -23.6, 17.6, -20.4, 13.0, -20.8), belly, null, { lw: 0.7 });
  cel(g, S(11.6, -29.4, 12.4, -38.8, 12.4, -38.8, 15.6, -31.4), fur, S(12, -38, 13.6, -38, 14.8, -31, 12.8, -30), { k: 0.24, lw: 0.8 });
  cel(g, PG(12.6, -30.6, 12.9, -36.4, 14.4, -31.2), '#3a2428', null, { lw: 0 });
  cel(g, EL(25.4, -25.6, 0.9, 0.8), '#1a1218', null, { lw: 0 });
  ln(g, O(24.6, -24.2, 22.0, -23.8, 20.4, -24.2), LN, 0.55);
  // 눈: 가늘게 치켜 올라간 금빛 눈
  if (o.blink) ln(g, O(17.0, -27.0, 18.6, -26.6, 20.2, -27.6), LN, 0.8);
  else { cel(g, PG(16.8, -26.8, 18.4, -28.4, 20.6, -28.2, 18.8, -26.4), o.eye || '#ffcf3a', null, { lw: 0.55 }); cel(g, EL(18.9, -27.4, 0.35, 0.8), '#1a0e12', null, { lw: 0 }); ln(g, O(16.6, -26.6, 18.6, -28.6, 21.0, -28.4), LN, 0.75); }
  // 여우 구슬 (구미호): 목에 건 푸른 구슬
  if (o.bead) { ln(g, O(11.6, -22.4, 13.6, -18.8, 15.8, -21.6), '#c8402f', 0.6); cel(g, EL(13.8, -18.0, 2.0, 2.0), '#bfe6ff', EL(14.6, -17.2, 1.4, 1.4), { sc: '#6fb2e8', hi: EL(13.2, -18.8, 0.6, 0.5), hc: '#ffffff', lw: 0.65 }); }
}

// ───────── 무기 (일러스트 그림체에서 바꿔 그리는 것) ─────────
// 원점 = 손잡이, 위쪽을 향한다 (sprites.js 의 WEAPONS 와 같다)
const STEEL = '#e4e8ee', STEELD = '#9aa6b4';
export const ILL_WEAPONS = {
  // 환도: 넓고 긴 칼날
  hwando(g) {
    // 큰 칼: 넓은 날이 몸 길이만큼 뻗고 끝이 살짝 휜다
    const blade = p => { p.moveTo(-2.6, -4.8); p.quadraticCurveTo(-2.2, -26, 3.0, -48.0); p.quadraticCurveTo(5.8, -42, 3.2, -4.8); p.closePath(); };
    cel(g, blade, STEEL, p => { p.moveTo(-3, -4); p.quadraticCurveTo(-2.6, -26, 3.0, -48.6); p.quadraticCurveTo(0.2, -28, 0.2, -4); p.closePath(); }, { sc: STEELD, hi: p => { p.moveTo(2.4, -5); p.quadraticCurveTo(4.8, -26, 4.6, -44); p.quadraticCurveTo(3.4, -26, 1.6, -5); p.closePath(); }, hc: '#ffffff', lw: 0.9 });
    ln(g, O(0.2, -7, 0.8, -24, 2.8, -38), '#7a8696', 0.55);
    cel(g, EL(0.2, -5.0, 5.0, 1.8), GOLD, EL(1.2, -4.4, 4.4, 1.2), { k: 0.3, lw: 0.75 });
    cel(g, PG(-1.7, -3.8, 1.7, -3.8, 1.6, 6.0, -1.6, 6.0), '#2a2030', null, { lw: 0.7 });
    for (let y = -2.6; y < 5.4; y += 1.8) ln(g, O(-1.5, y, 1.5, y + 0.9), '#8a3a34', 0.5);
    cel(g, EL(0, 6.6, 1.8, 1.3), GOLD, null, { lw: 0.6 });
    ribbon(g, [0, 7.2, 0.8, 10.4, 1.6, 13.0], 0.9, RED, { cut: true, lw: 0.5 });
  },
  // 각궁: 짧은 활의 양끝이 앞으로 휘어 나간다 (시위는 가늘게)
  bow(g, o = {}) {
    const wood = o.wood || '#7a3a22', c = p => { p.moveTo(7.4, -21.6); p.bezierCurveTo(4.0, -19.4, 4.2, -16.0, 0.4, -13.0); p.bezierCurveTo(-4.6, -9.0, -4.2, -3.0, -2.2, 0); p.bezierCurveTo(-4.2, 3.0, -4.6, 9.0, 0.4, 13.0); p.bezierCurveTo(4.2, 16.0, 4.0, 19.4, 7.4, 21.6); };
    ln(g, c, LN, 3.6); ln(g, c, wood, 2.1); ln(g, p => { p.moveTo(6.6, -20.6); p.bezierCurveTo(3.4, -18.6, 3.0, -15.2, -0.4, -12.0); p.bezierCurveTo(-3.6, -9, -3.6, -4, -2.0, -1); }, lt(wood, 0.4), 0.6);
    for (const y of [-12.6, 12.6]) ln(g, O(-2.4, y - (y < 0 ? 1 : -1), 0.8, y), o.wrap || '#e0b04a', 1.3);
    ln(g, O(5.6, -19.4, 5.6, 19.4), '#e8e2d2', 0.45);
    cel(g, R0(-3.6, -3.0, 3.2, 6.0), o.grip || '#3a2a26', null, { lw: 0.6 });
    cel(g, EL(-0.8, 0, 2.6, 2.4), SKIN, EL(0.2, 1, 2.2, 1.8), { k: 0.2, lw: 0.8 });
    ln(g, O(-0.2, -1.2, 1.2, -0.2), dk(SKIN, 0.35), 0.45);
  },
  greatbow(g) { g.save(); g.scale(1.12, 1.12); ILL_WEAPONS.bow(g, { wood: '#4a2a1e', wrap: '#c8302a', grip: '#2a2030' }); g.restore(); },
  // 방망이: 쇠못을 박은 나무 방망이
  club(g) {
    cel(g, p => { p.moveTo(-1.6, 5.0); p.quadraticCurveTo(-2.4, -10, -5.0, -24); p.quadraticCurveTo(-4.8, -31.4, 0.2, -31.6); p.quadraticCurveTo(5.2, -31.0, 5.0, -23.4); p.quadraticCurveTo(2.6, -10, 1.6, 5.0); p.closePath(); }, '#8a5a34', p => { p.moveTo(1.2, -33); p.lineTo(7, -33); p.lineTo(3, 6); p.lineTo(0.4, 6); p.closePath(); }, { k: 0.3, hi: PG(-3.6, -26, -2.4, -26, -1.2, -6, -1.8, -6), hk: 0.25, lw: 0.9 });
    for (const [x, y, a] of [[-4.8, -27, -1], [4.8, -26.4, 1], [-4.0, -19.4, -1], [4.0, -19.0, 1], [0.2, -31.4, 0], [-2.8, -12.4, -1], [2.6, -12.0, 1], [-1.6, -24.0, -1], [1.8, -23.0, 1]]) cel(g, PG(x - (a ? 0 : 1.1), y - (a ? 1.1 : 0), x + a * 4.0, y - (a ? 0.4 : 4.0), x + (a ? 0 : 1.1), y + (a ? 1.1 : 0)), '#8a909c', PG(x, y, x + a * 4.4, y + (a ? 0 : -4.4), x + (a ? 0 : 1.2), y + (a ? 1.2 : 0)), { sc: '#5a5f6a', lw: 0.55 });
    for (const y of [-1.4, 1.8]) ln(g, O(-1.7, y, 1.7, y + 0.6), '#d9c39a', 0.9);
  },
  // 두목의 큰 방망이
  ironclub(g) {
    g.save(); g.scale(1.18, 1.12); ILL_WEAPONS.club(g); g.restore();
  },
};

// 무녀는 부채를 앞손에만 들고 뒷손에는 노란 부적을 쥔다 (양손 부채면 부적이 가린다)
export const ILL_WEAPON_HAND = { fans: 'R' };

// ───────── 일러스트 그림체의 병종 외형 ─────────
const hold = (a, mode, x = ILL_HAND.x, y = ILL_HAND.y) => ({ x, y, a, mode });
const LEG = 4.5;   // 종이 인형보다 다리를 이만큼 늘인다 (허리 위가 같이 올라간다)
const P = (o, extra = {}) => {
  const D = o.riding ? 0 : (o.legLen === undefined ? LEG : o.legLen); o.D = D;
  const e = Object.assign({ ill: o, neck: 47.5 + D, fist: { skin: o.skin || SKIN, r: 2.1 } }, extra);
  if (e.hold) e.hold = Object.assign({}, e.hold, { y: e.hold.y - D });
  if (e.glow) e.glow = e.glow.map(q => Object.assign({}, q, { y: q.y - D }));
  if (e.h) e.h += D;
  return e;
};
const DOKB = (o, extra) => Object.assign({ fist: { skin: o.skin, r: 3.3 }, fig: (g, sel, b) => sel === 'body' ? bigDokBody(g, o) : bigDokHead(g, Object.assign({}, o, b)), weapon: 'club', hold: hold(0.4, 'slash', DH.x, DH.y), neck: 40, h: 64 }, extra);
const DOKS = (o, extra) => Object.assign({ fist: { skin: o.skin, r: 1.9 }, fig: (g, sel, b) => sel === 'body' ? smallDokBody(g, o) : smallDokHead(g, Object.assign({}, o, b)), weapon: 'club', hold: hold(0.4, 'slash', SDH.x, SDH.y), neck: 24, h: 44 }, extra);
const BOW_HAND = { x: 13.6, y: -37.0 }, BOW_ARM = { x: 16.8, y: -38.0 }, CAST_HAND = { x: 13.0, y: -34.6 };   // 활은 손 자리보다 앞(+3)에 그려지므로 팔을 거기까지 뻗는다
const NAVY = '#3a4462', BAJI = '#e8e2d2';
export const ILL_LOOKS = {
  // 환도 무사: 머리띠와 붉은 띠, 상투, 짧은 수염, 검은 무릎 두루마기, 큰 칼
  sword: P({ hair: 'topknot', hat: 'band', bandCol: '#2a2836', ribbon: '#c8302a', face: { brow: 'stern', up: 0.55, beard: 'short' }, top: NAVY, coat: { col: NAVY, lining: '#b8302a', len: 'knee' }, pants: BAJI, wrap: '#3a3546', wrapTie: '#c8302a', sash: '#b8302a', cuff: '#b8302a', sashFly: true, stance: 2.2 }, { hold: hold(0.42), h: 70 }),
  // 등패수: 전립, 청록 군복, 등패
  shield: P({ hair: 'topknot', hat: 'jeonrip', face: { brow: 'flat', beard: 'stubble' }, skin: '#e8bc90', top: '#3f6a72', coat: { col: '#3f6a72', lining: '#c8402f', len: 'knee' }, vest: '#2a3448', pants: BAJI, wrap: WHITE, sash: '#d9a441', cuff: '#c8402f', front: ITEMS.rattan, rearHand: { x: -4.0, y: -31.0 } }, { hold: hold(0.3), h: 70 }),
  // 창병: 패랭이, 흰 바지저고리에 붉은 배자, 짚신
  spear: P({ hair: 'topknot', hat: 'paeraeng', face: { brow: 'worry', beard: 'stubble' }, skin: '#e8bc90', top: '#ece6d6', vest: '#9a4a32', pants: '#e3dcc8', wrap: '#e3dcc8', wrapTie: '#6a4a34', shoe: '#c9a86a', straw: true, sash: INDIGO, cuff: '#ece6d6' }, { hold: hold(0.1, 'thrust'), h: 70 }),
  // 궁수: 흰 도포에 갓, 등에 전통
  xbow: P({ hair: 'topknot', hat: 'gat', face: { brow: 'calm', up: 0.4 }, top: '#efebe2', coat: { col: '#f2eee6', len: 'long' }, pants: '#e9e4d8', wrap: '#e9e4d8', sash: '#3d5a8a', cuff: '#efebe2', behind: ITEMS.quiver, hand: BOW_ARM, rearHand: { x: 2.4, y: -40.4 } }, { hold: hold(0, 'shoot', BOW_HAND.x, BOW_HAND.y), h: 76 }),
  // 도사: 잿빛 도포, 갓, 빛나는 구슬 지팡이
  wizard: P({ hair: 'topknot', hat: 'gat', face: { brow: 'stern', up: 0.2, beard: 'goatee', lines: true }, skin: '#eec6a0', top: '#7e828f', coat: { col: '#878b98', len: 'long', lining: '#4e5262' }, pants: '#d6d2ca', sash: '#2e2e3c', sleeve: 'wide', cuff: '#d6d2ca', rearItem: ITEMS.orbStaff, rearHand: { x: -11.6, y: -31.4 }, hand: CAST_HAND }, { hold: hold(0, 'cast', CAST_HAND.x, CAST_HAND.y), h: 76, glow: [{ x: -10.9, y: -70.8, r: 5.5, col: '#ffd66a' }] }),
  // 무녀: 붉은 저고리·치마, 긴 머리에 붉은 댕기, 노란 부적
  priest: P({ fem: true, longHair: true, bangs: true, hairPin: '#c8302a', ribbon: '#c8302a', face: { brow: 'soft', eyeW: 3.5, eyeH: 2.05, up: 0.1, lash: true, lip: '#c0404a', blush: true }, skin: '#f6d6b6', top: '#c8463c', git: '#6a1a1c', collar: '#f6f0e4', goreum: '#f0c64a', sleeveCol: '#c8463c', cuff: '#f6f0e4', chima: { col: '#a3242c', trim: '#e0b04a' }, rearItem: ITEMS.talisman, rearHand: { x: -7.4, y: -31.6 }, hand: CAST_HAND }, { hold: hold(0, 'cast', CAST_HAND.x, CAST_HAND.y), h: 70, glow: [{ x: -9.6, y: -37, r: 4, col: '#ffd66a' }] }),
  // 기마 무사: 검붉은 말에 탄 무사, 붉은 군복에 투구, 긴 창
  knight: P({ riding: true, lift: 22, hair: 'topknot', hat: 'tugu', face: { brow: 'stern', thick: true, beard: 'short' }, top: '#a84a32', armor: '#2f3346', coat: { col: '#a84a32', len: 'mid', studs: true }, pants: '#3a3640', shoe: '#1e1a24', sash: '#d9a441', cuff: '#2f3346', hand: { x: 13.6, y: -33 }, rearHand: { x: 9.6, y: -34.6 } }, { hold: hold(0.18, 'thrust', 13.6, -33 - 22), h: 100, w: 150, ox: 64, scale: 0.84 }),
  berserk: P({ hair: 'topknot', hat: 'ribbon', ribbon: '#c8302a', face: { brow: 'fierce', thick: true, beard: 'short', scar: true, mouth: 'grin' }, skin: '#d9a878', bareChest: true, top: '#d9a878', bare: true, wrist: '#6a4a34', coat: { col: '#6b5a44', len: 'knee' }, pants: '#d9cdb0', wrap: '#6a5a44', sash: '#c8302a' }, { hold: hold(0.45), h: 70, wide: 1.12 }),
  // ── 영웅 ──
  // 장군: 두정갑, 투구, 남빛 망토, 짙은 수염
  commander: P({ hair: 'topknot', hat: 'tugu', face: { brow: 'stern', thick: true, up: 0.3, beard: 'full' }, top: '#9a2a26', armor: '#2a2a38', coat: { col: '#9a2a26', len: 'mid', studs: true, trim: '#1e1a28' }, pants: '#2f2d38', wrap: '#2f2d38', shoe: '#1e1a24', sash: '#d9a441', cuff: '#1e1a28', behind: ITEMS.cape, capeCol: '#1f2a44', capeLining: '#a8322a' }, { hold: hold(0.25), scale: 1.2, hero: true, h: 78 }),
  // 고승: 잿빛 장삼, 붉은 가사, 염주
  bishop: P({ hair: 'bald', hat: 'bald', face: { brow: 'soft', browCol: '#7a7a72', eye: 'closed', lines: true, mouth: 'smile' }, skin: '#eec8a2', top: '#8e8e88', coat: { col: '#8e8e88', len: 'long', lining: '#6e6e68' }, kasa: '#a8442f', pants: '#d6d2ca', sleeve: 'wide', cuff: '#d6d2ca', front: ITEMS.beads, hand: CAST_HAND }, { hold: hold(0, 'cast', CAST_HAND.x, CAST_HAND.y), scale: 1.2, hero: true, h: 66 }),
  // 신선: 흰 도포, 흰 상투와 금관, 긴 흰 수염, 구름
  archmage: P({ hair: 'topknot', hairCol: '#e6e2ec', hat: 'sage', face: { brow: 'soft', browCol: '#e6e2ec', eye: 'closed', beard: 'long', lines: true }, beardCol: '#ece8f2', skin: '#f0cfae', top: '#f4f1ea', coat: { col: '#f4f1ea', len: 'long', lining: '#8fb6c8' }, pants: '#f4f1ea', sash: '#8fb6c8', sleeve: 'wide', cuff: '#8fb6c8', lift: 4, under: ITEMS.cloud, hand: CAST_HAND }, { hold: hold(0, 'cast', CAST_HAND.x, CAST_HAND.y - 4), scale: 1.2, hero: true, h: 72, float: true }),
  // 검객: 높이 묶은 머리, 붉은 머리띠, 남빛 무복, 바람에 날리는 붉은 허리띠
  blade: P({ hair: 'topknot', ponytail: true, bangs: true, hat: 'ribbon', ribbon: '#c8302a', face: { brow: 'stern', up: 0.6, lash: true, lip: '#a8443a' }, skin: '#f4d4b4', top: '#262c44', coat: { col: '#262c44', lining: '#c8302a', len: 'knee' }, pants: '#1f2232', wrap: '#1f2232', wrapTie: '#c8302a', shoe: '#1a1620', sash: '#c8302a', sashFly: true, cuff: '#c8302a', stance: 1.8 }, { hold: hold(0.42), scale: 1.2, hero: true, h: 72 }),
  // 명궁: 털모자, 가죽옷에 짐승 털, 큰 활
  hunter: P({ hair: 'topknot', hat: 'fur', face: { brow: 'flat', thick: true, beard: 'stubble' }, skin: '#e2b48a', top: '#6b5a3c', coat: { col: '#6b5a3c', len: 'knee', lining: '#3a2e22' }, pants: '#d9cdb0', wrap: '#5a4030', shoe: '#4a3428', sash: '#4a3d2e', cuff: '#4a3d2e', behind: ITEMS.quiver, front: ITEMS.pelt, hand: BOW_ARM, rearHand: { x: 2.4, y: -40.4 } }, { hold: hold(0, 'shoot', BOW_HAND.x, BOW_HAND.y), scale: 1.2, hero: true, h: 72 }),
  // 상쇠: 흰 옷, 남빛 쾌자, 엇갈린 삼색 띠, 상모
  sangsoe: P({ hair: 'topknot', hat: 'sangmo', face: { brow: 'calm', mouth: 'grin', up: 0.1 }, skin: '#ecc096', top: '#f3efe4', vest: '#2f4d7e', cross: ['#c8402f', '#e0b04a'], pants: '#f3efe4', wrap: '#f3efe4', sash: '#e0b04a', cuff: '#f3efe4', rearItem: ITEMS.gong, rearHand: { x: -8.4, y: -31.0 }, hand: CAST_HAND }, { hold: hold(0.4, 'cast', CAST_HAND.x, CAST_HAND.y), scale: 1.2, hero: true, h: 80 }),
  // 두령: 거친 머리, 붉은 띠, 털 두른 갈옷, 맨팔
  chief: P({ hair: 'wild', hairCol: '#2e2224', hat: 'ribbon', ribbon: '#a8282a', face: { brow: 'fierce', thick: true, beard: 'wild', scar: true }, skin: '#d9a878', top: '#5a4a3a', coat: { col: '#5a4a3a', len: 'knee', lining: '#3a2a22' }, pants: '#3a3640', wrap: '#5a4030', shoe: '#2a2026', sash: '#8a2a26', bareLead: true, wrist: '#3a2a22', front: ITEMS.pelt }, { hold: hold(0.45), scale: 1.2, hero: true, h: 72, wide: 1.1 }),
  // ── 요괴 ──
  // 졸개 도깨비: 청록빛 꼬마, 삿갓, 죽창
  goblin: DOKS({ skin: '#4f9a8c', hat: 'straw' }, { weapon: 'spear', hold: hold(0.1, 'thrust', SDH.x, SDH.y), scale: 0.92 }),
  // 돌팔매 도깨비: 머리 수건, 돌팔매
  garcher: DOKS({ skin: '#5aa294', hat: 'wrap', wrapCol: '#8a3a30', cloth: '#b89a68', item: DPROP.sling }, { weapon: 'none', hold: hold(0, 'shoot', SDH.x, SDH.y), scale: 0.92 }),
  // 야광귀: 검푸른 꼬마
  yagwang: DOKS({ skin: '#56658e', hair: '#1a1a30', cloth: '#3a3550', back: DPROP.sack }, { weapon: 'none', hold: hold(0, 'bite', SDH.x, SDH.y), scale: 0.84 }),
  // 방망이 도깨비: 붉은 큰 도깨비, 뿔 둘, 굵은 염주, 해진 흰 천, 쇠못 방망이
  orc: DOKB({ skin: '#c8442e', beads: true }, { scale: 1.16 }),
  rshield: DOKB({ skin: '#6f8a5a', noSash: true, item: DPROP.lid }, { scale: 1.06 }),
  shaman: DOKB({ skin: '#8a5a8a', cloth: '#3f6b5c', noSash: true, beads: true, item: DPROP.drum }, { weapon: 'none', hold: hold(0.4, 'cast', DH.x, DH.y), scale: 0.98 }),
  dueok: DOKB({ skin: '#7a7488', beads: true, hair: '#5a1f1a' }, { weapon: 'ironclub', scale: 1.32 }),
  // 도깨비불: 얼굴 있는 푸른 불꽃
  bomber: { fig: (g, sel, b) => flame(g, b || {}), body: true, weapon: 'none', hold: hold(0, 'none'), h: 50, float: true, glow: [{ x: 0, y: -26, r: 13, col: '#4a8cff' }] },
  // 불여우·구미호 (꼬리 수마다 그림이 따로 있다)
  rassassin: { fig: (g, sel, b) => illFox(g, Object.assign({}, b)), body: true, weapon: 'none', hold: hold(0, 'bite'), h: 44 },
  gumiho: { fig: (g, sel, b) => illFox(g, Object.assign({ fur: '#f0d8a8', tip: '#ffffff', sock: '#8a5a3a', tails: 9, bead: true }, b)), body: true, weapon: 'none', hold: hold(0, 'bite'), h: 46, scale: 2.0, boss: true, glow: [{ x: 13.8, y: -18, r: 3, col: '#7fc6ff' }] },
  foxfake: { fig: (g, sel, b) => illFox(g, Object.assign({ fur: '#f0d8a8', tip: '#ffffff', sock: '#8a5a3a', tails: 0 }, b)), body: true, weapon: 'none', hold: hold(0, 'bite'), h: 46, scale: 2.0 },
  // 두목
  warchief: DOKB({ skin: '#3f6a9a', beads: true, hat: 'knot' }, { weapon: 'ironclub', scale: 1.75, boss: true, h: 66 }),
  dueokboss: DOKB({ skin: '#7a7488', beads: true, hair: '#5a1f1a' }, { weapon: 'ironclub', scale: 1.85, boss: true, h: 66 }),
};
for (let n = 1; n < 9; n++) ILL_LOOKS['gumiho' + n] = Object.assign({}, ILL_LOOKS.gumiho, { fig: (g, sel, b) => illFox(g, Object.assign({ fur: '#f0d8a8', tip: '#ffffff', sock: '#8a5a3a', tails: n, bead: true }, b)) });
