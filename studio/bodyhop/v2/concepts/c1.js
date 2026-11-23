// Body Hop concept c1 — 손그림 수채 동화풍 (hand-painted watercolor storybook)
// Technique: paper reserved for lights, transparent multiply glazes for form, pigment pooling at wash
// edges, granulation, wet-in-wet blooms, spatter, broken sepia/indigo ink line, paper grain, soft bloom.
let R = Math.random;
const PAPER = '#FBF6EA';
const TEAL = '#12C9C0';

function mk(w, h) { const c = document.createElement('canvas'); c.width = w * 2; c.height = h * 2; const x = c.getContext('2d'); x.scale(2, 2); return [c, x]; }
function hex(h) { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
function rgba(h, a) { const A = hex(h); return `rgba(${A[0]},${A[1]},${A[2]},${a})`; }
function shade(h, k) { const A = hex(h).map(v => Math.max(0, Math.min(255, Math.round(v * k)))); return '#' + A.map(v => v.toString(16).padStart(2, '0')).join(''); }

// ---------- shape point sets ----------
function ellPts(cx, cy, rx, ry, w, n, rot) {
  n = n || 52; w = w == null ? 0.035 : w; rot = rot || 0;
  const p1 = R() * 6.28, p2 = R() * 6.28, out = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2, k = 1 + w * Math.sin(3 * a + p1) + w * 0.6 * Math.sin(5 * a + p2) + (R() - 0.5) * w * 0.5;
    const x = Math.cos(a) * rx * k, y = Math.sin(a) * ry * k;
    out.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
  }
  return out;
}
function beanPts(cx, cy, rx, ry, w, rot) {
  const p = ellPts(0, 0, rx, ry, w == null ? 0.025 : w, 56, 0);
  rot = rot || 0;
  return p.map(([x, y]) => { const t = Math.max(0, y / ry); x *= 1 + 0.1 * t - 0.06 * Math.max(0, -y / ry); y = y < 0 ? y * 1.04 : y * 0.92;
    return [cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]; });
}
function wob(pts, a) { return pts.map(p => [p[0] + (R() - 0.5) * a, p[1] + (R() - 0.5) * a]); }
function path(ctx, pts, open) {
  ctx.beginPath(); const n = pts.length;
  if (open) { ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < n - 1; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my); } ctx.lineTo(pts[n - 1][0], pts[n - 1][1]); return; }
  const m0 = [(pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2]; ctx.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
  ctx.closePath();
}
function bbox(pts) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return [x0, y0, x1, y1]; }

// ---------- watercolor primitives ----------
// reserve: masking — restore paper under a shape so later glazes stay clean
function reserve(ctx, pts, soft) {
  ctx.save(); if (soft) ctx.filter = `blur(${soft}px)`; path(ctx, pts); ctx.fillStyle = PAPER; ctx.fill(); ctx.restore();
}
// flat wash with pooled edge + granulation
function wash(ctx, pts, col, a, o) {
  o = o || {};
  ctx.save(); ctx.globalCompositeOperation = 'multiply';
  const L = o.layers || 3;
  if (o.soft) ctx.filter = `blur(${o.soft}px)`;
  for (let k = 0; k < L; k++) { path(ctx, wob(pts, o.jit == null ? 1.4 : o.jit)); ctx.fillStyle = rgba(col, a / L * 1.25); ctx.fill(); }
  ctx.filter = 'none';
  path(ctx, pts); ctx.clip();
  // pigment pooling at the edge (inside)
  const e = o.edge == null ? 0.6 : o.edge;
  if (e > 0) { ctx.filter = `blur(${o.eb || 1.1}px)`; ctx.lineWidth = o.ew || 2.6; ctx.strokeStyle = rgba(shade(col, 0.72), Math.min(1, a * e)); path(ctx, pts); ctx.stroke(); ctx.filter = 'none'; }
  // granulation
  const g = o.gran == null ? 0.5 : o.gran;
  if (g > 0) { const [x0, y0, x1, y1] = bbox(pts); const n = Math.min(1600, (x1 - x0) * (y1 - y0) * 0.09 * g);
    for (let i = 0; i < n; i++) { ctx.fillStyle = rgba(shade(col, 0.6), 0.12 + R() * 0.2); const s = 0.4 + R() * 0.8; ctx.fillRect(x0 + R() * (x1 - x0), y0 + R() * (y1 - y0), s, s); } }
  // occasional back-run bloom (cauliflower)
  if (o.bloom) { for (let i = 0; i < o.bloom; i++) { const [x0, y0, x1, y1] = bbox(pts); const bx = x0 + R() * (x1 - x0), by = y0 + R() * (y1 - y0), br = 3 + R() * (x1 - x0) * 0.12;
    const bp = ellPts(bx, by, br, br * 0.8, 0.12, 30); ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.25; ctx.filter = 'blur(1.5px)'; path(ctx, bp); ctx.fillStyle = PAPER; ctx.fill(); ctx.restore();
    ctx.lineWidth = 1.1; ctx.strokeStyle = rgba(shade(col, 0.7), a * 0.5); path(ctx, bp); ctx.stroke(); } }
  ctx.restore();
}
// glaze clipped to a shape: soft multiply blob (form shadow / warm bounce)
function glaze(ctx, clipPts, x, y, rx, ry, col, a, blur, rot) {
  ctx.save(); path(ctx, clipPts); ctx.clip(); ctx.globalCompositeOperation = 'multiply';
  ctx.filter = `blur(${blur}px)`; path(ctx, ellPts(x, y, rx, ry, 0.08, 40, rot || 0)); ctx.fillStyle = rgba(col, a); ctx.fill();
  ctx.restore();
}
// lift / white-paper highlight
function lift(ctx, x, y, rx, ry, a, blur, rot, clipPts) {
  ctx.save(); if (clipPts) { path(ctx, clipPts); ctx.clip(); }
  ctx.globalAlpha = a; if (blur) ctx.filter = `blur(${blur}px)`; path(ctx, ellPts(x, y, rx, ry, 0.1, 30, rot || 0)); ctx.fillStyle = PAPER; ctx.fill(); ctx.restore();
}
// broken ink line
function ink(ctx, pts, col, w, o) {
  o = o || {}; const n = pts.length, closed = !o.open;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const gap = o.gap == null ? 0.12 : o.gap;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    if (R() < gap) continue;
    const a = pts[i], b = pts[(i + 1) % n];
    const lw = w * (0.55 + R() * 0.7) * (o.side ? (0.5 + 0.9 * Math.max(0, (o.side[0] * (a[0] - o.side[2]) + o.side[1] * (a[1] - o.side[3])) / o.side[4])) : 1);
    ctx.strokeStyle = rgba(col, (o.a || 0.85) * (0.6 + R() * 0.4)); ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(a[0] + (R() - 0.5) * 0.4, a[1] + (R() - 0.5) * 0.4); ctx.lineTo(b[0] + (R() - 0.5) * 0.4, b[1] + (R() - 0.5) * 0.4); ctx.stroke();
  }
  ctx.restore();
}
function spatter(ctx, x, y, rad, n, cols, smin, smax, yk) {
  ctx.save(); ctx.globalCompositeOperation = 'multiply';
  for (let i = 0; i < n; i++) { const a = R() * 6.28, d = Math.pow(R(), 0.7) * rad; const s = smin + Math.pow(R(), 2) * (smax - smin);
    const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d * (yk || 1);
    const c = cols[Math.floor(R() * cols.length)];
    ctx.fillStyle = rgba(c, 0.55 + R() * 0.35); path(ctx, ellPts(px, py, s, s * (0.8 + R() * 0.3), 0.15, 12)); ctx.fill();
    ctx.strokeStyle = rgba(shade(c, 0.7), 0.5); ctx.lineWidth = 0.5; ctx.stroke(); }
  ctx.restore();
}
function cast(ctx, x, y, rx, ry, a) { // cast shadow: cool violet glaze, offset to lower-right (key light upper-left)
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.filter = 'blur(2.2px)';
  path(ctx, ellPts(x + rx * 0.28, y + ry * 0.15, rx * 1.15, ry, 0.06, 36)); ctx.fillStyle = `rgba(120,100,160,${a})`; ctx.fill();
  ctx.filter = 'blur(1px)'; path(ctx, ellPts(x + rx * 0.08, y, rx * 0.8, ry * 0.6, 0.06, 30)); ctx.fillStyle = `rgba(80,55,90,${a * 0.8})`; ctx.fill();
  ctx.restore();
}

// ---------- characters ----------
function eye(ctx, x, y, r, mode, look) {
  look = look || 0;
  if (mode === 'dizzy') { const pts = []; for (let i = 0; i < 34; i++) { const t = i / 33, a = t * 11, rr = r * t; pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); } ink(ctx, pts, '#2A2240', r * 0.35, { open: true, gap: 0 }); return; }
  if (mode === 'teal') {
    ctx.save(); ctx.globalCompositeOperation = 'screen'; const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3); g.addColorStop(0, 'rgba(120,255,240,0.9)'); g.addColorStop(1, 'rgba(60,230,220,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 3, 0, 7); ctx.fill(); ctx.restore();
    const p = ellPts(x, y, r * 0.9, r * 1.05, 0.04, 24); reserve(ctx, p);
    wash(ctx, p, '#1FD6CC', 0.85, { edge: 0.9, gran: 0, ew: 2, jit: 0.4 });
    glaze(ctx, p, x + r * 0.3, y + r * 0.45, r * 0.7, r * 0.6, '#0A6E78', 0.8, 1);
    lift(ctx, x - r * 0.28, y - r * 0.35, r * 0.3, r * 0.36, 1, 0.3);
    lift(ctx, x + r * 0.3, y + r * 0.35, r * 0.12, r * 0.12, 1, 0);
    ink(ctx, p, '#0A4A55', 0.9, { gap: 0.05 });
    return;
  }
  const p = ellPts(x, y, r * 0.86, r, 0.04, 24);
  wash(ctx, p, '#2B2440', 0.95, { edge: 0.4, gran: 0.2, jit: 0.4 });
  glaze(ctx, p, x, y + r * 0.6, r * 0.6, r * 0.35, '#8A5A70', 0.35, 1);
  lift(ctx, x - r * 0.3 + look * r * 0.12, y - r * 0.38, r * 0.3, r * 0.36, 1, 0.2, -0.4);
  lift(ctx, x + r * 0.32 + look * r * 0.1, y + r * 0.33, r * 0.12, r * 0.12, 1, 0);
}

function slime(ctx, o) {
  const { x, y, r } = o; const col = o.col || '#9ACF52', dk = o.dk || '#4E8A2C';
  const sq = o.sq || 1, tilt = o.tilt || 0, air = o.air || 0;
  const rx = r * (2 - sq), ry = r * 1.02 * sq;
  cast(ctx, x, y, r * (air ? 0.65 : 0.95), r * 0.3, air ? 0.3 : 0.55);
  const by = y - air - ry - r * 0.08, bx = x;
  const rot = (px, py) => [bx + px * Math.cos(tilt) - py * Math.sin(tilt), by + px * Math.sin(tilt) + py * Math.cos(tilt)];
  // feet
  for (const s of [-1, 1]) { const [fx, fy] = rot(s * rx * 0.42 + (o.kick && s > 0 ? r * 0.2 : 0), ry * 0.92 - (o.kick && s > 0 ? r * 0.18 : 0));
    const fp = ellPts(fx, fy, r * 0.25, r * 0.15, 0.05, 20, tilt); reserve(ctx, fp); wash(ctx, fp, col, 0.7, { gran: 0.2 }); glaze(ctx, fp, fx + 3, fy + 2, r * 0.25, r * 0.15, dk, 0.5, 1.5); ink(ctx, fp, shade(dk, 0.6), 0.8, { gap: 0.3 }); }
  const body = beanPts(bx, by, rx, ry, 0.022, tilt);
  reserve(ctx, body);
  // first light wash, wet-in-wet: lighter upper-left, richer lower-right
  wash(ctx, body, col, 0.62, { edge: 0.75, gran: 0.35, ew: 3 });
  // form shadow glaze (core shadow on the right/bottom)
  glaze(ctx, body, bx + rx * 0.55, by + ry * 0.45, rx * 0.85, ry * 0.8, dk, 0.55, 4);
  glaze(ctx, body, bx + rx * 0.75, by + ry * 0.2, rx * 0.35, ry * 0.75, shade(dk, 0.8), 0.35, 3);
  // cool reflected sky on the far right rim
  glaze(ctx, body, bx + rx * 1.02, by - ry * 0.1, rx * 0.18, ry * 0.7, o.rim || '#8EB8E8', o.rim ? 0.8 : 0.45, 2);
  // warm ground bounce at bottom (jelly transmits light)
  glaze(ctx, body, bx - rx * 0.1, by + ry * 0.95, rx * 0.7, ry * 0.2, '#F2B25A', 0.45, 3);
  // paper highlight: big soft sheen + sharp glint
  lift(ctx, bx - rx * 0.4, by - ry * 0.5, rx * 0.3, ry * 0.16, 0.95, 1.6, -0.6 + tilt, body);
  lift(ctx, bx - rx * 0.62, by - ry * 0.12, r * 0.07, r * 0.07, 1, 0, 0, body);
  // ink contour: heavier on shadow side
  ink(ctx, body, o.inkc || shade(dk, 0.55), 1.4, { gap: 0.1, side: [1, 1, bx, by, rx] });
  // face
  const look = o.look || 0, [fx, fy] = rot(look * rx * 0.16, -ry * 0.02), er = r * 0.26;
  const [e1x, e1y] = rot(look * rx * 0.16 - rx * 0.33, -ry * 0.04), [e2x, e2y] = rot(look * rx * 0.16 + rx * 0.33, -ry * 0.04);
  eye(ctx, e1x, e1y, er, o.eyes, look); eye(ctx, e2x, e2y, er, o.eyes, look);
  if (o.angry) { const a1 = rot(look * rx * 0.16 - rx * 0.55, -ry * 0.04 - er * 1.45), a2 = rot(look * rx * 0.16 - rx * 0.13, -ry * 0.04 - er * 1.0), b1 = rot(look * rx * 0.16 + rx * 0.55, -ry * 0.04 - er * 1.45), b2 = rot(look * rx * 0.16 + rx * 0.13, -ry * 0.04 - er * 1.0);
    ink(ctx, [a1, a2], '#2B2440', r * 0.1, { open: true, gap: 0 }); ink(ctx, [b1, b2], '#2B2440', r * 0.1, { open: true, gap: 0 }); }
  // blush
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.filter = 'blur(1.4px)'; ctx.fillStyle = 'rgba(240,120,120,0.45)';
  for (const s of [-1, 1]) { const [cx2, cy2] = rot(look * rx * 0.16 + s * rx * 0.6, er * 1.0); ctx.beginPath(); ctx.ellipse(cx2, cy2, r * 0.14, r * 0.08, tilt, 0, 7); ctx.fill(); }
  ctx.restore();
  // mouth
  const [mx, my] = rot(look * rx * 0.16, er * 1.25);
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgba(90,30,50,0.9)'; ctx.translate(mx, my); ctx.rotate(tilt); ctx.beginPath();
  if (o.mouth === 'o') ctx.ellipse(0, r * 0.03, r * 0.09, r * 0.12, 0, 0, 7);
  else if (o.mouth === 'shout') { ctx.moveTo(-r * 0.17, -r * 0.04); ctx.quadraticCurveTo(0, r * 0.35, r * 0.17, -r * 0.04); ctx.closePath(); }
  else { ctx.moveTo(-r * 0.1, 0); ctx.quadraticCurveTo(0, r * 0.15, r * 0.1, 0); ctx.closePath(); }
  ctx.fill(); ctx.restore();
  // sprout
  const [sx, sy] = rot(rx * 0.05, -ry * 1.0);
  const stem = [[sx, sy + 2], [sx + 1, sy - r * 0.15], [sx + r * 0.05 + Math.sin(tilt) * 4, sy - r * 0.3]];
  ink(ctx, stem, '#3C7A26', r * 0.07, { open: true, gap: 0, a: 1 });
  for (const s of [-1, 1]) { const lx = stem[2][0] + s * r * 0.16, ly = stem[2][1] - r * 0.03; const lp = ellPts(lx, ly, r * 0.19, r * 0.085, 0.05, 18, s * 0.5 - 0.1 + tilt);
    reserve(ctx, lp); wash(ctx, lp, '#86C84A', 0.75, { gran: 0.1 }); glaze(ctx, lp, lx + s * 2, ly + 2, r * 0.15, r * 0.05, '#3C7A26', 0.5, 1); ink(ctx, lp, '#2E5E1E', 0.7, { gap: 0.3 }); }
}

function rock(ctx, x, y, s, rot) {
  const pts = []; const n = 10;
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + rot; const rr = s * (0.84 + R() * 0.24); pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.88]); }
  reserve(ctx, pts);
  // granulating ultramarine-umber wash
  wash(ctx, pts, '#9C98AE', 0.75, { gran: 2.2, edge: 0.8, jit: 0.8 });
  // facet glazes
  const c = [x - s * 0.15, y - s * 0.2];
  for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; const ang = Math.atan2((p[1] + q[1]) / 2 - y, (p[0] + q[0]) / 2 - x);
    const lit = Math.cos(ang + 2.3); if (lit > 0.2) continue;
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = `rgba(70,60,95,${0.25 + 0.4 * (-lit + 0.2)})`;
    ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.closePath(); ctx.fill(); ctx.restore(); }
  lift(ctx, x - s * 0.4, y - s * 0.42, s * 0.3, s * 0.16, 0.7, 1.2, -0.5, pts);
  // moss dabs
  for (let i = 0; i < 4; i++) { const mp = ellPts(x - s * 0.5 + R() * s * 0.6, y - s * 0.62 + R() * s * 0.2, s * 0.14, s * 0.1, 0.2, 14); wash(ctx, mp, '#8DBE4C', 0.6, { gran: 0.5 }); }
  // cracks + knuckles
  ink(ctx, [[x + s * 0.1, y - s * 0.55], [x + s * 0.25, y - s * 0.1], [x + s * 0.1, y + s * 0.2], [x + s * 0.35, y + s * 0.55]], '#3A3048', 1.1, { open: true, gap: 0.1 });
  for (let i = 0; i < 3; i++) { const kp = []; for (let k = 0; k <= 8; k++) { const a = 0.3 + k / 8 * 2.3; kp.push([x - s * 0.35 + i * s * 0.3 + Math.cos(a) * s * 0.15, y + s * 0.18 + Math.sin(a) * s * 0.15]); } ink(ctx, kp, '#3A3048', 1.2, { open: true, gap: 0.1 }); }
  ink(ctx, pts, '#2F2638', 1.6, { gap: 0.06, side: [1, 1, x, y, s] });
}

function furPart(ctx, pts, base, dk, cx, cy, rx, ry, n) {
  reserve(ctx, pts);
  wash(ctx, pts, base, 0.7, { gran: 0.8, edge: 0.7, bloom: rx > 30 ? 2 : 0 });
  glaze(ctx, pts, cx + rx * 0.5, cy + ry * 0.45, rx * 0.95, ry * 0.85, dk, 0.55, 5);
  glaze(ctx, pts, cx + rx * 0.95, cy, rx * 0.18, ry * 0.7, '#8EB0E0', 0.4, 2);
  lift(ctx, cx - rx * 0.4, cy - ry * 0.45, rx * 0.35, ry * 0.25, 0.45, 3, -0.5, pts);
  // dry-brush fur strokes
  ctx.save(); path(ctx, pts); ctx.clip(); ctx.globalCompositeOperation = 'multiply'; ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) { const a = R() * 6.28, d = Math.sqrt(R()); const px = cx + Math.cos(a) * rx * d, py = cy + Math.sin(a) * ry * d;
    const shadowSide = ((px - cx) / rx + (py - cy) / ry) > -0.2;
    ctx.strokeStyle = rgba(shade(dk, 0.8), shadowSide ? 0.35 : 0.15); ctx.lineWidth = 0.7 + R() * 0.6;
    const ang = Math.atan2(py - cy, px - cx) + 0.4 + (R() - 0.5) * 0.4; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(ang) * 4.5, py + Math.sin(ang) * 4.5); ctx.stroke(); }
  ctx.restore();
  ink(ctx, pts, '#3A2214', 1.3, { gap: 0.15, side: [1, 1, cx, cy, rx] });
}

function bear(ctx, x, y, k) {
  cast(ctx, x - 4, y, 56 * k, 18 * k, 0.6);
  const B = '#C08850', D = '#6A3A22';
  const T = (px, py) => [x + px * k, y + py * k];
  const E = (px, py, rx, ry, rot) => { const [a, b] = T(px, py); return [ellPts(a, b, rx * k, ry * k, 0.05, 44, rot || 0), a, b, rx * k, ry * k]; };
  const fp = (args, n) => { const [p, a, b, rx, ry] = args; furPart(ctx, p, B, D, a, b, rx, ry, n); };
  // raised arm behind
  fp(E(34, -112, 13, 28, -0.5), 60);
  // legs
  fp(E(-22, -12, 17, 13), 60); fp(E(22, -12, 17, 13), 60);
  // body
  const bodyE = E(0, -54, 46, 44); fp(bodyE, 420);
  // belly
  { const [p, a, b, rx, ry] = E(-5, -46, 28, 26); wash(ctx, p, '#F4D2A0', 0.0, { edge: 0, gran: 0 }); reserve(ctx, p, 2); wash(ctx, p, '#EDC48E', 0.5, { edge: 0.5, gran: 0.4 }); glaze(ctx, p, a + rx * 0.5, b + ry * 0.5, rx * 0.8, ry * 0.7, '#B07848', 0.45, 4); lift(ctx, a - rx * 0.35, b - ry * 0.4, rx * 0.35, ry * 0.25, 0.8, 3); }
  // sash
  { const pts = []; for (let i = 0; i <= 20; i++) { const t = i / 20; pts.push(T(-46 + t * 92, -38 + Math.sin(t * Math.PI) * 10)); } for (let i = 20; i >= 0; i--) { const t = i / 20; pts.push(T(-46 + t * 92, -24 + Math.sin(t * Math.PI) * 10)); }
    ctx.save(); path(ctx, bodyE[0]); ctx.clip(); reserve(ctx, pts); wash(ctx, pts, '#D8463A', 0.85, { gran: 0.5, edge: 0.8 }); ctx.restore();
    const [kx, ky] = T(-6, -22); const kp = ellPts(kx, ky, 6 * k, 5 * k, 0.05, 16); reserve(ctx, kp); wash(ctx, kp, '#F0C040', 0.8, { gran: 0.2 }); ink(ctx, kp, '#6A4010', 0.8); }
  // head
  const hy = -110;
  for (const s of [-1, 1]) { fp(E(s * 24, hy - 22, 11, 11), 30); const ip = E(s * 24, hy - 21, 5.5, 5.5)[0]; wash(ctx, ip, '#E89A8A', 0.6, { gran: 0.2 }); }
  fp(E(0, hy, 34, 29), 260);
  { const [p, a, b, rx, ry] = E(-2, hy + 10, 16, 12); reserve(ctx, p, 1); wash(ctx, p, '#EFCB98', 0.55, { gran: 0.3 }); glaze(ctx, p, a + 6, b + 6, 12, 8, '#A87040', 0.4, 3); ink(ctx, p, '#5A3218', 0.8, { gap: 0.4 }); }
  { const [p, a, b] = E(-3, hy + 4, 7, 4.8); wash(ctx, p, '#2B2232', 0.95, { gran: 0, edge: 0.3 }); lift(ctx, a - 2.5, b - 1.5, 2, 1, 1, 0); }
  { const mp = [T(-12, hy + 12), T(-3, hy + 21), T(7, hy + 12)]; ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgba(80,25,40,0.92)'; ctx.beginPath(); ctx.moveTo(...mp[0]); ctx.quadraticCurveTo(mp[1][0], mp[1][1], mp[2][0], mp[2][1]); ctx.closePath(); ctx.fill(); ctx.restore();
    const [tx, ty] = T(-9, hy + 12); ctx.fillStyle = PAPER; ctx.fillRect(tx, ty, 14 * k, 2.4 * k); }
  { const [a, b] = T(-15, hy - 6), [c, d] = T(10, hy - 6); eye(ctx, a, b, 5.2 * k, 'normal', -0.6); eye(ctx, c, d, 5.2 * k, 'normal', -0.6);
    ink(ctx, [T(-24, hy - 17), T(-9, hy - 11)], '#2A160C', 3.2 * k, { open: true, gap: 0 }); ink(ctx, [T(19, hy - 17), T(4, hy - 11)], '#2A160C', 3.2 * k, { open: true, gap: 0 }); }
  // front arm + low fist
  fp(E(-42, -60, 12, 20, 0.5), 50);
  { const [a, b] = T(-54, -36); rock(ctx, a, b, 24 * k, 0.2); }
  // raised fist wound back
  { const [a, b] = T(40, -150); rock(ctx, a, b, 30 * k, -0.4);
    for (let i = 0; i < 4; i++) { const an = -2.2 + i * 0.42; ink(ctx, [[a + Math.cos(an) * 42 * k, b + Math.sin(an) * 42 * k], [a + Math.cos(an) * 54 * k, b + Math.sin(an) * 54 * k]], '#3A2A40', 1.6, { open: true, gap: 0 }); } }
}

function ghost(ctx, x, y, r, ang) {
  // halo glow (screen) — the one "light source" in a watercolor world
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  let g = ctx.createRadialGradient(x, y, 0, x, y, r * 3.4); g.addColorStop(0, 'rgba(110,255,240,0.75)'); g.addColorStop(0.45, 'rgba(60,220,215,0.28)'); g.addColorStop(1, 'rgba(40,200,200,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 3.4, 0, 7); ctx.fill(); ctx.restore();
  // body: round head + flame tail pointing back along travel direction
  const pts = []; const tailL = r * 2.6; const ca = Math.cos(ang), sa = Math.sin(ang);
  const L2 = (lx, ly) => [x + lx * ca - ly * sa, y + lx * sa + ly * ca];
  for (let i = 0; i <= 20; i++) { const a = -Math.PI / 2 + i / 20 * Math.PI; pts.push(L2(Math.cos(a) * r, Math.sin(a) * r)); }
  const c = (t) => Math.sin(t * Math.PI * 1.6) * r * 0.45 * t, w = (t) => r * Math.pow(1 - t, 0.9) * (1 + 0.12 * Math.sin(t * 14));
  for (let i = 0; i <= 24; i++) { const t = i / 24; pts.push(L2(-t * tailL, c(t) + w(t))); }
  for (let i = 24; i >= 0; i--) { const t = i / 24; pts.push(L2(-t * tailL, c(t) - w(t))); }
  reserve(ctx, pts);
  wash(ctx, pts, '#5FE6DC', 0.55, { gran: 0, edge: 1.0, ew: 3.2, jit: 0.8 });
  glaze(ctx, pts, x - Math.cos(ang) * r * 1.6, y - Math.sin(ang) * r * 1.6, r * 1.3, r * 0.9, '#11A8B0', 0.7, 4, ang);
  glaze(ctx, pts, x + r * 0.5, y + r * 0.55, r * 0.7, r * 0.45, '#1890A0', 0.45, 3);
  lift(ctx, x - r * 0.35, y - r * 0.4, r * 0.45, r * 0.3, 1, 2, -0.5, pts);
  ink(ctx, pts, '#0B5C66', 1.3, { gap: 0.08 });
  // gleeful face
  ink(ctx, arcPts(x - r * 0.36, y + r * 0.05, r * 0.2, Math.PI * 1.1, Math.PI * 1.9), '#083A44', r * 0.15, { open: true, gap: 0, a: 1 });
  ink(ctx, arcPts(x + r * 0.36, y + r * 0.05, r * 0.2, Math.PI * 1.1, Math.PI * 1.9), '#083A44', r * 0.15, { open: true, gap: 0, a: 1 });
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgba(10,50,60,0.95)'; ctx.beginPath(); ctx.moveTo(x - r * 0.3, y + r * 0.24); ctx.quadraticCurveTo(x, y + r * 0.9, x + r * 0.3, y + r * 0.24); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,120,150,0.8)'; ctx.beginPath(); ctx.ellipse(x, y + r * 0.52, r * 0.12, r * 0.08, 0, 0, 7); ctx.fill();
  ctx.filter = 'blur(1px)'; ctx.fillStyle = 'rgba(255,130,160,0.55)'; ctx.beginPath(); ctx.ellipse(x - r * 0.66, y + r * 0.28, r * 0.15, r * 0.09, 0, 0, 7); ctx.ellipse(x + r * 0.66, y + r * 0.28, r * 0.15, r * 0.09, 0, 0, 7); ctx.fill(); ctx.restore();
}
function arcPts(x, y, r, a0, a1) { const p = []; for (let i = 0; i <= 10; i++) { const a = a0 + (a1 - a0) * i / 10; p.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); } return p; }

function star5Pts(x, y, s, rot) { const p = []; for (let i = 0; i < 10; i++) { const a = rot + i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? s * 0.48 : s; p.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); } return p; }
function polyPath(ctx, p) { ctx.beginPath(); p.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); }
function dizzy(ctx, x, y, r) {
  const ring = ellPts(x, y, r, r * 0.33, 0.02, 40); ink(ctx, ring, '#6A5A7A', 0.9, { gap: 0.35 });
  for (let i = 0; i < 3; i++) { const a = i * 2.1 + 0.4; const sx = x + Math.cos(a) * r, sy = y + Math.sin(a) * r * 0.33;
    const p = star5Pts(sx, sy, 5.5, a); ctx.save(); polyPath(ctx, p); ctx.fillStyle = PAPER; ctx.fill(); ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; polyPath(ctx, p); ctx.fillStyle = 'rgba(245,200,40,0.9)'; ctx.fill(); ctx.strokeStyle = 'rgba(170,100,20,0.9)'; ctx.lineWidth = 0.8; ctx.stroke(); ctx.restore(); }
}

// ---------- scene pieces ----------
function sky(ctx, W) {
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, 900);
  // wet-in-wet sky: cerulean top bleeding into warm horizon, leaving paper near sun
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.filter = 'blur(6px)';
  let g = ctx.createLinearGradient(0, 0, 0, 330); g.addColorStop(0, 'rgba(60,150,225,0.9)'); g.addColorStop(0.5, 'rgba(130,195,240,0.6)'); g.addColorStop(0.85, 'rgba(250,228,190,0.3)'); g.addColorStop(1, 'rgba(250,215,170,0.3)');
  ctx.fillStyle = g; ctx.fillRect(-20, -20, W + 40, 350);
  // uneven pigment patches
  for (let i = 0; i < 26; i++) { const px = R() * W, py = 20 + R() * 220; ctx.fillStyle = `rgba(60,140,220,${0.04 + R() * 0.07})`; path(ctx, ellPts(px, py, 18 + R() * 30, 10 + R() * 14, 0.2, 30)); ctx.fill(); }
  ctx.restore();
  // sun: lifted paper glow upper-left
  ctx.save(); const sg = ctx.createRadialGradient(30, 60, 0, 30, 60, 170); sg.addColorStop(0, 'rgba(251,246,234,1)'); sg.addColorStop(0.35, 'rgba(251,246,234,0.75)'); sg.addColorStop(1, 'rgba(251,246,234,0)'); ctx.fillStyle = sg; ctx.fillRect(0, 0, 260, 260);
  ctx.globalCompositeOperation = 'multiply'; const sg2 = ctx.createRadialGradient(30, 60, 30, 30, 60, 160); sg2.addColorStop(0, 'rgba(255,220,150,0.35)'); sg2.addColorStop(1, 'rgba(255,220,150,0)'); ctx.fillStyle = sg2; ctx.fillRect(0, 0, 260, 260); ctx.restore();
  // clouds: lifted paper with violet-grey undersides
  const cloud = (cx, cy, s) => {
    const parts = []; for (let i = 0; i < 7; i++) { const t = i / 6; parts.push([cx + (t - 0.5) * s * 2.2, cy - Math.sin(t * Math.PI) * s * 0.4 + (R() - 0.5) * 6, s * (0.35 + Math.sin(t * Math.PI) * 0.3)]); }
    ctx.save(); ctx.filter = 'blur(2.5px)'; ctx.fillStyle = PAPER; for (const [px, py, rr] of parts) { path(ctx, ellPts(px, py, rr, rr * 0.8, 0.1, 30)); ctx.fill(); } ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.filter = 'blur(3px)'; for (const [px, py, rr] of parts) { path(ctx, ellPts(px + rr * 0.2, py + rr * 0.45, rr * 0.8, rr * 0.35, 0.1, 30)); ctx.fillStyle = 'rgba(170,160,200,0.35)'; ctx.fill(); } ctx.restore();
  };
  cloud(300, 120, 52); cloud(110, 190, 34); cloud(250, 215, 26);
}

function ridge(ctx, W, base, amp, col, a, seed, o) {
  const pts = [[-300, 1400], [-300, base]]; for (let x = -10; x <= W + 10; x += 8) { pts.push([x, base - amp * (0.5 + 0.5 * Math.sin(x * 0.012 + seed)) * (0.7 + 0.3 * Math.sin(x * 0.031 + seed * 2)) + (R() - 0.5) * 1.5]); } pts.push([W + 300, base], [W + 300, 1400]);
  wash(ctx, pts, col, a, Object.assign({ gran: 0.25, edge: 0.7, jit: 1 }, o || {}));
}

function tree(ctx, tx, ty, s, far) {
  const trunk = [[tx - s * 0.07, ty], [tx - s * 0.05, ty - s * 0.6], [tx + s * 0.05, ty - s * 0.6], [tx + s * 0.08, ty]];
  wash(ctx, trunk, '#8A5A3A', far ? 0.4 : 0.7, { gran: 0.5 });
  const cols = far ? ['#8CBC7E', '#78AC86'] : ['#8CC456', '#6EAE4A'];
  for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28 + R(); const px = tx + Math.cos(a) * s * 0.32, py = ty - s * 0.85 + Math.sin(a) * s * 0.28, rr = s * (0.3 + R() * 0.1);
    wash(ctx, ellPts(px, py, rr, rr * 0.9, 0.12, 26), cols[i % 2], far ? 0.6 : 0.55, { gran: 0.4, edge: 0.8, layers: 2 }); }
  // shadow glaze lower-right of crown
  const crown = ellPts(tx, ty - s * 0.85, s * 0.62, s * 0.55, 0.12, 40);
  glaze(ctx, crown, tx + s * 0.3, ty - s * 0.6, s * 0.5, s * 0.4, far ? '#7890A8' : '#3C7840', far ? 0.25 : 0.45, 4);
  // dabs
  if (!far) for (let i = 0; i < 14; i++) { const px = tx + (R() - 0.5) * s, py = ty - s * 0.85 + (R() - 0.5) * s * 0.9; wash(ctx, ellPts(px, py, 2 + R() * 3, 1.5 + R() * 2, 0.2, 10), '#3E7A34', 0.4, { gran: 0, edge: 0.5, layers: 1 }); }
}

function stand(ctx, x0, y0, w, rows, flip) {
  for (let r = 0; r < rows; r++) {
    const y = y0 + r * 17, xs = x0 + (flip ? -r * 7 : r * 7);
    const bench = [[xs, y + 6], [xs + w, y + 6], [xs + w, y + 14], [xs, y + 14]];
    wash(ctx, bench, '#B8834E', 0.6, { gran: 0.6 }); ink(ctx, [[xs, y + 6], [xs + w, y + 6]], '#5A3A22', 0.8, { open: true, gap: 0.2 });
    const cols = ['#F0B080', '#A8D070', '#EDE4D4', '#F4A0B8', '#9CB8F0', '#F0CC60'];
    for (let i = 0; i < Math.floor(w / 15); i++) {
      const cx = xs + 8 + i * 15 + (R() - 0.5) * 3, cy = y + 2 - R() * 3, rr = 6 + R() * 1.5; const c = cols[Math.floor(R() * cols.length)];
      if (R() < 0.5) for (const s of [-1, 1]) { const ep = ellPts(cx + s * rr * 0.6, cy - rr * 0.8, rr * 0.35, rr * 0.35, 0.05, 10); reserve(ctx, ep); wash(ctx, ep, c, 0.7, { gran: 0, layers: 1 }); }
      if (R() < 0.6) for (const s of [-1, 1]) ink(ctx, [[cx + s * rr * 0.8, cy + 1], [cx + s * rr * 1.3, cy - rr * 1.25]], shade(c, 0.55), 2.2, { open: true, gap: 0 });
      const hp = ellPts(cx, cy, rr, rr * 0.95, 0.05, 16); reserve(ctx, hp); wash(ctx, hp, c, 0.6, { gran: 0.2, layers: 2 }); glaze(ctx, hp, cx + rr * 0.5, cy + rr * 0.5, rr * 0.7, rr * 0.6, shade(c, 0.6), 0.4, 1.5);
      ctx.fillStyle = 'rgba(40,30,50,0.85)'; ctx.beginPath(); ctx.arc(cx - 2, cy - 0.5, 1.1, 0, 7); ctx.arc(cx + 2, cy - 0.5, 1.1, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(120,40,60,0.8)'; ctx.beginPath(); ctx.arc(cx, cy + 2, 1.4, 0, Math.PI); ctx.fill();
    }
  }
}

function pennants(ctx, x1, y1, x2, y2, sag) {
  const colors = ['#3C78D0', '#D84A38', '#EEC040', '#F4EEE0', '#4A4458'];
  const P = (t) => [(1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * (x1 + x2) / 2 + t * t * x2, (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * ((y1 + y2) / 2 + sag) + t * t * y2];
  const line = []; for (let i = 0; i <= 30; i++) line.push(P(i / 30)); ink(ctx, line, '#5A4434', 0.9, { open: true, gap: 0.02 });
  const n = Math.floor(Math.hypot(x2 - x1, y2 - y1) / 15);
  for (let i = 1; i < n; i++) { const [px, py] = P(i / n); const c = colors[i % 5]; const sw = (R() - 0.5) * 4;
    const tp = [[px - 5, py], [px + 5, py], [px + sw, py + 12]]; ctx.save(); polyPath(ctx, tp); ctx.fillStyle = PAPER; ctx.fill(); ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; polyPath(ctx, tp); ctx.fillStyle = rgba(c, c === '#F4EEE0' ? 0.5 : 0.8); ctx.fill(); ctx.lineWidth = 0.6; ctx.strokeStyle = rgba(shade(c, 0.6), 0.6); ctx.stroke(); ctx.restore(); }
}

function gate(ctx, cx, by) {
  const post = (x) => { const p = [[x, by], [x + 1, by - 112], [x + 11, by - 112], [x + 12, by]]; reserve(ctx, p); wash(ctx, p, '#B07A48', 0.75, { gran: 1 }); glaze(ctx, p, x + 12, by - 56, 6, 60, '#5A3218', 0.5, 2); ink(ctx, p, '#4A2A16', 1, { gap: 0.15 }); };
  post(cx - 58); post(cx + 46);
  // thatched little roof arch (rustic, not a shrine gate)
  const roof = []; for (let i = 0; i <= 20; i++) { const t = i / 20; roof.push([cx - 82 + t * 164, by - 118 - Math.sin(t * Math.PI) * 26]); } for (let i = 20; i >= 0; i--) { const t = i / 20; roof.push([cx - 76 + t * 152, by - 104 - Math.sin(t * Math.PI) * 18]); }
  reserve(ctx, roof); wash(ctx, roof, '#D8B060', 0.75, { gran: 1.2, edge: 0.9 }); glaze(ctx, roof, cx + 30, by - 108, 70, 8, '#8A6020', 0.5, 3);
  ctx.save(); path(ctx, roof); ctx.clip(); ctx.globalCompositeOperation = 'multiply'; ctx.strokeStyle = 'rgba(120,80,30,0.45)'; ctx.lineWidth = 0.8;
  for (let i = 0; i < 60; i++) { const x = cx - 80 + i * 2.7; ctx.beginPath(); ctx.moveTo(x, by - 150); ctx.lineTo(x + 2, by - 100); ctx.stroke(); } ctx.restore();
  ink(ctx, roof, '#5A3A16', 1.1, { gap: 0.12 });
  // hanging sign w/ painted star
  const sign = [[cx - 17, by - 98], [cx + 17, by - 98], [cx + 17, by - 78], [cx - 17, by - 78]]; reserve(ctx, sign); wash(ctx, sign, '#4A4058', 0.85, { gran: 0.5 }); ink(ctx, sign, '#2A2030', 1);
  const sp = star5Pts(cx, by - 88, 6, 0); ctx.save(); polyPath(ctx, sp); ctx.fillStyle = PAPER; ctx.fill(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgba(240,190,50,0.95)'; ctx.fill(); ctx.restore();
  // lanterns
  for (const s of [-1, 1]) { const lx = cx + s * 34, ly = by - 66;
    ink(ctx, [[lx, by - 98], [lx, ly - 10]], '#3A2414', 0.8, { open: true, gap: 0 });
    ctx.save(); ctx.globalCompositeOperation = 'screen'; const gl = ctx.createRadialGradient(lx, ly, 0, lx, ly, 22); gl.addColorStop(0, 'rgba(255,200,120,0.6)'); gl.addColorStop(1, 'rgba(255,170,90,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(lx, ly, 22, 0, 7); ctx.fill(); ctx.restore();
    const lp = ellPts(lx, ly, 7.5, 10, 0.03, 24); reserve(ctx, lp); wash(ctx, lp, '#F08850', 0.6, { gran: 0.1, edge: 1 }); glaze(ctx, lp, lx + 4, ly + 3, 5, 8, '#B83A28', 0.6, 2); lift(ctx, lx - 2, ly - 2, 3, 4, 0.9, 1.5);
    ink(ctx, lp, '#6A2414', 0.8, { gap: 0.2 }); wash(ctx, [[lx - 4, ly - 11], [lx + 4, ly - 11], [lx + 4, ly - 8.5], [lx - 4, ly - 8.5]], '#3A2414', 0.9, { gran: 0 }); wash(ctx, [[lx - 4, ly + 8.5], [lx + 4, ly + 8.5], [lx + 4, ly + 11], [lx - 4, ly + 11]], '#3A2414', 0.9, { gran: 0 }); }
}

function arena(ctx, cx, cy, rx, ry) {
  const drum = 18;
  // earth drum side
  const side = []; for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI; side.push([cx + Math.cos(a) * (rx + 14), cy + drum + Math.sin(a) * (ry + 12)]); }
  for (let i = 40; i >= 0; i--) { const a = i / 40 * Math.PI; side.push([cx + Math.cos(a) * (rx + 14), cy + Math.sin(a) * (ry + 12)]); }
  // shadow of drum on grass
  cast(ctx, cx + 6, cy + ry + drum + 4, rx * 0.85, 20, 0.4);
  reserve(ctx, side); wash(ctx, side, '#A86E40', 0.8, { gran: 1.4, edge: 0.8 }); glaze(ctx, side, cx + rx * 0.7, cy + ry + 10, rx * 0.7, 30, '#5A3A40', 0.5, 6);
  // strata strokes
  ctx.save(); path(ctx, side); ctx.clip(); ctx.globalCompositeOperation = 'multiply';
  for (let i = 0; i < 160; i++) { const a = R() * Math.PI, px = cx + Math.cos(a) * (rx + 13), py = cy + drum * R() + Math.sin(a) * (ry + 11) + 2; ctx.fillStyle = `rgba(110,60,30,${0.2 + R() * 0.25})`; ctx.fillRect(px, py, 3 + R() * 5, 0.8); }
  ctx.restore();
  // top sand surface
  const top = ellPts(cx, cy, rx + 14, ry + 12, 0.006, 90);
  reserve(ctx, top);
  wash(ctx, top, '#EBC58C', 0.55, { gran: 1.1, edge: 0.7, ew: 4, bloom: 4 });
  // light pool upper-left (lift), shade lower-right & toward the back rim
  lift(ctx, cx - rx * 0.25, cy - ry * 0.2, rx * 0.55, ry * 0.45, 0.35, 18);
  glaze(ctx, top, cx + rx * 0.55, cy + ry * 0.55, rx * 0.7, ry * 0.6, '#C08A68', 0.4, 20);
  glaze(ctx, top, cx, cy - ry * 0.95, rx * 1.0, ry * 0.25, '#B89880', 0.3, 12);
  // raked arcs in pencil
  for (let i = 0; i < 8; i++) { const k = 0.25 + i * 0.08; const a0 = R() * 6, a1 = a0 + 1.5 + R() * 2; ink(ctx, arcE(cx, cy, rx * k, ry * k, a0, a1), '#A07040', 0.7, { open: true, gap: 0.3, a: 0.35 }); }
  // chalk ring: reserved paper with slight wobble
  const chalk = ellPts(cx, cy, rx - 16, ry - 14, 0.004, 120);
  ctx.save(); path(ctx, chalk); ctx.lineWidth = 3.4; ctx.strokeStyle = 'rgba(253,250,242,0.95)'; ctx.stroke(); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(200,180,150,0.4)'; ctx.globalCompositeOperation = 'multiply'; path(ctx, ellPts(cx + 0.8, cy + 1.2, rx - 16, ry - 14, 0.004, 120)); ctx.stroke(); ctx.restore();
  for (const s of [-1, 1]) { ctx.save(); ctx.lineCap = 'round'; ctx.lineWidth = 3.2; ctx.strokeStyle = 'rgba(253,250,242,0.95)'; ctx.beginPath(); ctx.moveTo(cx + s * 28, cy - 8); ctx.lineTo(cx + s * 28, cy + 8); ctx.stroke(); ctx.restore(); }
}
function arcE(cx, cy, rx, ry, a0, a1) { const p = []; for (let i = 0; i <= 24; i++) { const a = a0 + (a1 - a0) * i / 24; p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return p; }

function rope(ctx, cx, cy, rx, ry, front) {
  const a0 = front ? -0.05 : Math.PI - 0.05, a1 = front ? Math.PI + 0.05 : Math.PI * 2 + 0.05;
  const th = (a) => 6 + 3 * Math.sin(a);
  const outer = [], inner = []; const N = 120;
  for (let i = 0; i <= N; i++) { const a = a0 + (a1 - a0) * i / N, t = th(a); outer.push([cx + Math.cos(a) * (rx + t), cy + Math.sin(a) * (ry + t)]); inner.push([cx + Math.cos(a) * (rx - t), cy + Math.sin(a) * (ry - t)]); }
  const band = outer.concat(inner.reverse());
  cast(ctx, cx, cy + 4, 0, 0, 0); // noop keep rand stream
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.filter = 'blur(2px)'; path(ctx, band.map(p => [p[0] + 2, p[1] + 3])); ctx.fillStyle = 'rgba(110,80,90,0.4)'; ctx.fill(); ctx.restore();
  reserve(ctx, band);
  wash(ctx, band, '#E2BE6A', 0.7, { gran: 0.8, edge: 0.9, jit: 0.6 });
  // twist: alternating glaze crescents + ink
  const segs = Math.floor((a1 - a0) * (rx + ry) / 2 / 7.5);
  for (let i = 0; i < segs; i++) { const a = a0 + (a1 - a0) * (i + 0.5) / segs, t = th(a); const px = cx + Math.cos(a) * rx, py = cy + Math.sin(a) * ry;
    const tx = -Math.sin(a) * rx, ty = Math.cos(a) * ry, l = Math.hypot(tx, ty), ux = tx / l, uy = ty / l, nx = -uy, ny = ux;
    const q = [[px - ux * t * 0.55 + nx * t, py - uy * t * 0.55 + ny * t], [px + ux * 0.5, py + uy * 0.5], [px + ux * t * 0.55 - nx * t, py + uy * t * 0.55 - ny * t]];
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgba(160,110,40,0.45)'; ctx.beginPath(); ctx.moveTo(...q[0]); ctx.quadraticCurveTo(q[1][0] + ux * 3, q[1][1] + uy * 3, q[2][0], q[2][1]); ctx.lineTo(q[2][0] + ux * 3, q[2][1] + uy * 3); ctx.quadraticCurveTo(q[1][0] + ux * 6, q[1][1] + uy * 6, q[0][0] + ux * 3, q[0][1] + uy * 3); ctx.closePath(); ctx.fill(); ctx.restore();
    ink(ctx, [q[0], q[1], q[2]], '#6A4818', 0.8, { open: true, gap: 0.15, a: 0.8 }); }
  // shadow side of the tube (lower) and lit top
  glaze(ctx, band, cx + rx * 0.4, cy + ry * 1.05, rx * 0.8, 6, '#8A5A30', front ? 0.35 : 0, 2);
  ink(ctx, outer, '#5A3A12', 1, { open: true, gap: 0.1 });
  // straw fibres
  for (let i = 0; i < 70; i++) { const a = a0 + (a1 - a0) * R(); const px = cx + Math.cos(a) * rx, py = cy + Math.sin(a) * ry, t = th(a), d = R() * 6.28;
    ink(ctx, [[px + Math.cos(d) * t * 0.9, py + Math.sin(d) * t * 0.9], [px + Math.cos(d) * (t + 3 + R() * 3), py + Math.sin(d) * (t + 3 + R() * 3)]], R() < 0.5 ? '#B08A40' : '#7A5A20', 0.6, { open: true, gap: 0 }); }
}

function burst(ctx, x, y) {
  // splash decal on sand
  spatter(ctx, x + 8, y + 30, 70, 60, ['#8CCB4E', '#6FB040', '#B8E070'], 1, 6, 0.5);
  // the blast: a big area of untouched paper (white) with warm wet-in-wet halo bleeding outward
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.filter = 'blur(5px)';
  const halo = ellPts(x, y, 108, 92, 0.14, 50); const g = ctx.createRadialGradient(x, y, 30, x, y, 108);
  g.addColorStop(0, 'rgba(255,230,150,0)'); g.addColorStop(0.5, 'rgba(255,205,90,0.75)'); g.addColorStop(0.82, 'rgba(250,135,60,0.6)'); g.addColorStop(1, 'rgba(250,140,70,0)');
  ctx.fillStyle = g; path(ctx, halo); ctx.fill(); ctx.restore();
  // jagged paper-white burst shape with pooled orange edge
  const bp = []; for (let i = 0; i < 22; i++) { const a = i / 22 * 6.28, rr = i % 2 ? 30 + R() * 6 : 54 + R() * 18; bp.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.9]); }
  ctx.save(); ctx.filter = 'blur(1px)'; polyPath(ctx, bp); ctx.fillStyle = PAPER; ctx.fill(); ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; polyPath(ctx, bp); ctx.clip(); ctx.filter = 'blur(2px)'; ctx.lineWidth = 9; ctx.strokeStyle = 'rgba(250,170,50,0.75)'; polyPath(ctx, bp); ctx.stroke(); ctx.restore();
  ctx.save(); ctx.lineJoin = 'round'; polyPath(ctx, bp); ctx.strokeStyle = 'rgba(200,100,40,0.8)'; ctx.lineWidth = 1.3; ctx.stroke(); ctx.restore();
  // inner glow (screen) — warm white core
  ctx.save(); ctx.globalCompositeOperation = 'screen'; const cg = ctx.createRadialGradient(x, y, 0, x, y, 80); cg.addColorStop(0, 'rgba(255,255,245,1)'); cg.addColorStop(0.45, 'rgba(255,240,180,0.65)'); cg.addColorStop(1, 'rgba(255,220,150,0)'); ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(x, y, 60, 0, 7); ctx.fill(); ctx.restore();
  // shockwave: lifted paper ring on the sand (perspective) with ochre leading edge
  const ring = ellPts(x + 4, y + 22, 104, 50, 0.02, 80);
  ctx.save(); ctx.filter = 'blur(2px)'; path(ctx, ring); ctx.lineWidth = 9; ctx.strokeStyle = 'rgba(251,246,234,0.85)'; ctx.stroke(); ctx.restore();
  ink(ctx, ellPts(x + 4, y + 22, 109, 54, 0.02, 80), '#C07A30', 1.2, { gap: 0.3, a: 0.7 });
  // speed strokes radiating (dry brush)
  for (let i = 0; i < 18; i++) { const a = i / 18 * 6.28 + R() * 0.2, r0 = 62 + R() * 10, r1 = r0 + 16 + R() * 22; ink(ctx, [[x + Math.cos(a) * r0, y + Math.sin(a) * r0 * 0.85], [x + Math.cos(a) * r1, y + Math.sin(a) * r1 * 0.85]], '#D08A3A', 1.6, { open: true, gap: 0, a: 0.75 }); }
  // dust puffs (wet blobs, warm-grey)
  for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28 + R() * 0.3; const px = x + Math.cos(a) * (88 + R() * 10), py = y + 22 + Math.sin(a) * (44 + R() * 6); const rr = 7 + R() * 7;
    const dp = ellPts(px, py - rr * 0.4, rr, rr * 0.8, 0.15, 22); ctx.save(); ctx.globalAlpha = 0.7; reserve(ctx, dp, 3); ctx.restore(); wash(ctx, dp, '#F4DDB0', 0.3, { gran: 0.1, edge: 0.5, soft: 2.5 }); glaze(ctx, dp, px + rr * 0.4, py + rr * 0.2, rr * 0.7, rr * 0.35, '#C8A080', 0.3, 3); }
  // jelly droplets (painted, glossy) + confetti spatter
  for (let i = 0; i < 18; i++) { const a = R() * 6.28, d = 56 + R() * 52; const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d * 0.8 - 10, s = i < 4 ? 6 + R() * 2 : 2.6 + R() * 3.4;
    const dp = ellPts(px, py, s * 1.2, s, 0.08, 14, a); reserve(ctx, dp); wash(ctx, dp, '#94D050', 0.8, { gran: 0, edge: 1, ew: 1.5, layers: 2 });
    glaze(ctx, dp, px + s * 0.4, py + s * 0.4, s * 0.7, s * 0.5, '#3E7A20', 0.6, 0.8); lift(ctx, px - s * 0.35, py - s * 0.35, s * 0.3, s * 0.25, 1, 0);
    ink(ctx, [[px - Math.cos(a) * s * 1.6, py - Math.sin(a) * s * 1.6], [px - Math.cos(a) * s * 4.5, py - Math.sin(a) * s * 4.5]], '#7AB040', 1, { open: true, gap: 0, a: 0.6 }); }
  spatter(ctx, x, y - 6, 112, 46, ['#F5C830', '#F07090', '#F09A40', '#A98AE8', '#58B8F0'], 1, 3.2, 0.85);
}

function trail(ctx, p0, p1, p2, p3) {
  const P = (t) => { const u = 1 - t; return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]; };
  const N = 70, L = [], Rr = [];
  for (let i = 0; i <= N; i++) { const t = i / N, [px, py] = P(t), [qx, qy] = P(Math.min(1, t + 0.01)), [ox, oy] = P(Math.max(0, t - 0.01)); const dx = qx - ox, dy = qy - oy, l = Math.hypot(dx, dy) || 1; const w = 1 + 14 * Math.pow(t, 1.3);
    L.push([px - dy / l * w, py + dx / l * w]); Rr.push([px + dy / l * w, py - dx / l * w]); }
  const band = L.concat(Rr.reverse());
  // glow
  ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.filter = 'blur(8px)'; path(ctx, band); ctx.fillStyle = 'rgba(90,240,225,0.55)'; ctx.fill(); ctx.restore();
  reserve(ctx, band, 0.6);
  // gradient teal wash, stronger toward the ghost
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; path(ctx, band); const g = ctx.createLinearGradient(p0[0], p0[1], p3[0], p3[1]); g.addColorStop(0, 'rgba(60,210,205,0.12)'); g.addColorStop(1, 'rgba(20,195,190,0.8)'); ctx.fillStyle = g; ctx.fill();
  path(ctx, band); ctx.clip(); ctx.filter = 'blur(1px)'; ctx.lineWidth = 2.4; ctx.strokeStyle = 'rgba(10,140,150,0.6)'; path(ctx, band); ctx.stroke(); ctx.restore();
  // white core (lifted)
  const core = []; for (let i = 10; i <= N; i++) core.push(P(i / N)); ctx.save(); ctx.lineCap = 'round'; for (let i = 0; i < core.length - 1; i++) { const t = (i + 10) / N; ctx.strokeStyle = `rgba(251,250,244,${0.5 + 0.5 * t})`; ctx.lineWidth = 0.5 + 4.5 * t; ctx.beginPath(); ctx.moveTo(...core[i]); ctx.lineTo(...core[i + 1]); ctx.stroke(); } ctx.restore();
  // ink speed lines alongside
  for (const k of [-1, 1]) { const sl = []; for (let i = 25; i <= 62; i++) { const t = i / N; const [px, py] = P(t), [qx, qy] = P(t + 0.01); const dx = qx - px, dy = qy - py, l = Math.hypot(dx, dy) || 1, off = k * (8 + 18 * t); sl.push([px - dy / l * off, py + dx / l * off]); } ink(ctx, sl, '#1A8A90', 1, { open: true, gap: 0.25, a: 0.7 }); }
  // sparkles: paper-white 4-point stars with teal glaze
  for (let i = 0; i < 12; i++) { const t = 0.15 + R() * 0.8; const [px, py] = P(t); const sx = px + (R() - 0.5) * 34, sy = py + (R() - 0.5) * 34, s = 2.5 + R() * 4;
    const sp = []; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 - Math.PI / 2, rr = k % 2 ? s * 0.28 : s; sp.push([sx + Math.cos(a) * rr, sy + Math.sin(a) * rr]); }
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.filter = 'blur(2px)'; ctx.fillStyle = 'rgba(120,255,240,0.7)'; ctx.beginPath(); ctx.arc(sx, sy, s * 1.2, 0, 7); ctx.fill(); ctx.restore();
    ctx.save(); polyPath(ctx, sp); ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.restore(); }
}

// ---------- HUD (painted paper tags) ----------
function tag(ctx, x, y, w, h, col) {
  const p = []; const n = 40; for (let i = 0; i < n; i++) { const t = i / n; let px, py; const per = 2 * (w + h), d = t * per;
    if (d < w) { px = x + d; py = y; } else if (d < w + h) { px = x + w; py = y + d - w; } else if (d < 2 * w + h) { px = x + w - (d - w - h); py = y + h; } else { px = x; py = y + h - (d - 2 * w - h); } p.push([px + (R() - 0.5) * 1.2, py + (R() - 0.5) * 1.2]); }
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.filter = 'blur(3px)'; path(ctx, p.map(q => [q[0] + 2, q[1] + 3])); ctx.fillStyle = 'rgba(60,40,60,0.35)'; ctx.fill(); ctx.restore();
  reserve(ctx, p); wash(ctx, p, col, 0.35, { gran: 0.6, edge: 0.9 }); ink(ctx, p, '#5A3A28', 1.1, { gap: 0.08 });
  return p;
}
function heart(ctx, x, y, s) {
  const p = []; for (let i = 0; i < 40; i++) { const t = i / 40 * Math.PI * 2; p.push([x + s * 0.062 * 16 * Math.pow(Math.sin(t), 3), y - s * 0.062 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))]); }
  reserve(ctx, p); wash(ctx, p, '#E8485E', 0.85, { gran: 0.4, edge: 0.9, jit: 0.5 }); glaze(ctx, p, x + s * 0.4, y + s * 0.4, s * 0.7, s * 0.6, '#901830', 0.5, 2);
  lift(ctx, x - s * 0.45, y - s * 0.35, s * 0.2, s * 0.13, 1, 0.5, -0.6); ink(ctx, p, '#6A1020', 1, { gap: 0.05 });
}
function hud(ctx, W) {
  const top = 50;
  tag(ctx, 12, top, 88, 30, '#F2E2C0');
  for (let i = 0; i < 3; i++) heart(ctx, 31 + i * 25, top + 16, 10);
  // stage plank
  const pl = tag(ctx, W / 2 - 30, top - 1, 60, 32, '#E0B070');
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.strokeStyle = 'rgba(110,60,30,0.35)'; ctx.lineWidth = 0.7; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(W / 2 - 28, top + 5 + i * 7); ctx.bezierCurveTo(W / 2 - 10, top + 3 + i * 7, W / 2 + 10, top + 8 + i * 7, W / 2 + 28, top + 5 + i * 7); ctx.stroke(); } ctx.restore();
  ctx.save(); ctx.font = 'bold 16px "WenQuanYi Zen Hei", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = PAPER; ctx.fillText('1-1', W / 2 + 0.8, top + 16.8); ctx.fillStyle = '#4A2410'; ctx.fillText('1-1', W / 2, top + 16); ctx.restore();
  tag(ctx, W - 100, top, 88, 30, '#F2E2C0');
  for (let i = 0; i < 3; i++) { const sp = star5Pts(W - 81 + i * 25, top + 16, 9.5, 0); ctx.save(); ctx.globalCompositeOperation = 'multiply'; polyPath(ctx, sp); ctx.fillStyle = 'rgba(160,140,130,0.35)'; ctx.fill(); ctx.restore(); ink(ctx, sp, '#6A4A38', 1.3, { gap: 0.05 }); }
}
function chargeRing(ctx, x, y, rx, ry, frac) {
  ink(ctx, ellPts(x, y, rx, ry, 0.01, 70), '#2A6A70', 1, { gap: 0.4, a: 0.5 });
  const arc = arcE(x, y, rx, ry, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
  ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.filter = 'blur(4px)'; ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(80,240,225,0.7)'; path(ctx, arc, true); ctx.stroke(); ctx.restore();
  ctx.save(); ctx.lineCap = 'round'; ctx.lineWidth = 4.5; ctx.strokeStyle = PAPER; path(ctx, arc, true); ctx.stroke(); ctx.globalCompositeOperation = 'multiply'; ctx.strokeStyle = 'rgba(20,200,195,0.9)'; ctx.stroke(); ctx.restore();
  ctx.save(); ctx.lineCap = 'round'; ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; path(ctx, arcE(x, y - 0.8, rx, ry, -Math.PI / 2 + 0.05, -Math.PI / 2 + Math.PI * 2 * frac - 0.05), true); ctx.stroke(); ctx.restore();
}

function paperGrain(ctx, W, H) {
  // low-frequency pigment unevenness + fine tooth
  const sw = 98, sh = 211; const [lc] = [document.createElement('canvas')]; lc.width = sw; lc.height = sh; const lx = lc.getContext('2d'); const id = lx.createImageData(sw, sh);
  for (let i = 0; i < sw * sh; i++) { const v = 235 + R() * 20; id.data[i * 4] = v; id.data[i * 4 + 1] = v - 2; id.data[i * 4 + 2] = v - 8; id.data[i * 4 + 3] = 255; }
  lx.putImageData(id, 0, 0);
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.imageSmoothingEnabled = true; ctx.filter = 'blur(3px)'; ctx.globalAlpha = 0.6; ctx.drawImage(lc, 0, 0, W, H); ctx.restore();
  const fc = document.createElement('canvas'); fc.width = W * 2; fc.height = H * 2; const fx = fc.getContext('2d'); const fd = fx.createImageData(fc.width, fc.height);
  for (let y = 0; y < fc.height; y++) for (let x = 0; x < fc.width; x++) { const i = (y * fc.width + x) * 4; const n = R(); const v = 255 - (n < 0.5 ? n * 26 : 0) - ((x * 7 + y * 13) % 11 === 0 ? 8 : 0); fd.data[i] = v; fd.data[i + 1] = v; fd.data[i + 2] = v - 3; fd.data[i + 3] = 255; }
  fx.putImageData(fd, 0, 0);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.55; ctx.drawImage(fc, 0, 0); ctx.restore();
  // raised tooth highlights
  ctx.save(); ctx.globalCompositeOperation = 'screen'; for (let i = 0; i < 2500; i++) { ctx.fillStyle = `rgba(255,252,240,${0.05 + R() * 0.12})`; ctx.fillRect(R() * W, R() * H, 0.6, 0.6); } ctx.restore();
}

// ================= MAIN =================
function paint(ctx, W, H, rand) {
  R = rand;
  const cx = 195, cy = 598, rx = 186, ry = 160;

  // --- background on its own sheet (softened for depth) ---
  const [bgc, bg] = mk(W, H);
  sky(bg, W);
  ridge(bg, W, 262, 70, '#B4C0DC', 0.55, 1.2, { gran: 0.1 });          // far, pale & blue
  ridge(bg, W, 292, 50, '#9DBFA4', 0.6, 3.1, { gran: 0.2 });
  [[372, 312, 48], [30, 316, 40], [334, 322, 30], [95, 318, 24], [290, 318, 22]].forEach(t => tree(bg, t[0], t[1], t[2], true));
  // meadow
  { const m = [[-10, 336]]; for (let x = 0; x <= W + 10; x += 10) m.push([x, 330 - Math.sin(x / W * Math.PI) * 26 + (R() - 0.5) * 2]); m.push([W + 400, 335], [W + 400, 1600], [-400, 1600], [-400, 335]);
    wash(bg, m, '#A6D06A', 0.65, { gran: 0.5, edge: 0.8, bloom: 3 });
    bg.save(); bg.globalCompositeOperation = 'multiply'; const mg = bg.createLinearGradient(0, 330, 0, 844); mg.addColorStop(0, 'rgba(120,170,90,0)'); mg.addColorStop(0.35, 'rgba(110,170,80,0.45)'); mg.addColorStop(1, 'rgba(70,140,60,0.7)'); bg.fillStyle = mg; bg.fillRect(0, 330, W, 520); bg.restore(); }
  pennants(bg, -10, 150, 140, 268, 30);
  pennants(bg, 400, 140, 250, 268, 34);
  pennants(bg, -10, 236, 400, 232, 42);
  stand(bg, 4, 354, 118, 3, false);
  stand(bg, 268, 354, 118, 3, true);
  gate(bg, 195, 410);
  ctx.save(); ctx.filter = 'blur(0.7px)'; ctx.drawImage(bgc, 0, 0, W, H); ctx.restore();
  // atmospheric veil
  ctx.save(); let g = ctx.createLinearGradient(0, 200, 0, 420); g.addColorStop(0, 'rgba(240,236,240,0)'); g.addColorStop(0.4, 'rgba(240,236,240,0.22)'); g.addColorStop(1, 'rgba(240,236,240,0)'); ctx.fillStyle = g; ctx.fillRect(0, 200, W, 220); ctx.restore();

  // foreground meadow strokes
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.lineCap = 'round';
  for (let i = 0; i < 900; i++) { const px = R() * W, py = 420 + R() * (H - 420); const d = ((px - cx) / (rx + 20)) ** 2 + ((py - cy - 10) / (ry + 30)) ** 2; if (d < 1) continue;
    ctx.strokeStyle = R() < 0.6 ? `rgba(80,140,50,${0.25 + R() * 0.3})` : `rgba(150,190,80,${0.3 + R() * 0.3})`; ctx.lineWidth = 0.8 + R() * 0.6; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + (R() - 0.5) * 3, py - 4 - R() * 6); ctx.stroke(); }
  ctx.restore();
  for (let i = 0; i < 26; i++) { const px = R() * W, py = 430 + R() * 400; const d = ((px - cx) / (rx + 24)) ** 2 + ((py - cy - 10) / (ry + 32)) ** 2; if (d < 1) continue; const fp = ellPts(px, py, 2, 1.6, 0.1, 8); reserve(ctx, fp); if (i % 2) wash(ctx, fp, ['#F5C830', '#F090B0'][i % 4 > 1 ? 1 : 0], 0.6, { gran: 0, layers: 1 }); }

  arena(ctx, cx, cy, rx, ry);
  rope(ctx, cx, cy, rx - 2, ry - 2, false);

  // --- characters, back to front ---
  bear(ctx, 300, 566, 1.08);
  slime(ctx, { x: 262, y: 612, r: 21, look: 1, angry: true, mouth: 'shout', col: '#F0B848', dk: '#B06A20' });
  const bx = 106, by = 512;
  burst(ctx, bx, by);
  slime(ctx, { x: 44, y: 476, r: 22, air: 24, tilt: -0.7, eyes: 'dizzy', mouth: 'o' }); dizzy(ctx, 40, 418, 16);
  slime(ctx, { x: 186, y: 486, r: 20, air: 34, tilt: 0.85, eyes: 'dizzy', mouth: 'o', col: '#C2D850', dk: '#7A8A20' }); dizzy(ctx, 196, 418, 14);
  slime(ctx, { x: 46, y: 604, r: 23, air: 8, tilt: -1.15, eyes: 'dizzy', mouth: 'o', col: '#84CC70', dk: '#3A7A40' }); dizzy(ctx, 30, 560, 14);

  // target + ghost
  const tx = 206, ty = 676;
  ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.filter = 'blur(6px)'; path(ctx, ellPts(tx, ty, 66, 26, 0.03, 40)); ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(90,240,225,0.8)'; ctx.stroke(); ctx.restore();
  chargeRing(ctx, tx, ty, 52, 21, 0.4);
  trail(ctx, [bx + 4, by - 40], [bx + 10, by - 175], [tx + 60, by - 150], [tx + 6, ty - 70]);
  // teal aura behind target
  ctx.save(); ctx.globalCompositeOperation = 'screen'; const ag = ctx.createRadialGradient(tx, ty - 34, 10, tx, ty - 34, 70); ag.addColorStop(0, 'rgba(90,250,235,0.6)'); ag.addColorStop(1, 'rgba(60,230,220,0)'); ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(tx, ty - 34, 70, 0, 7); ctx.fill(); ctx.restore();
  slime(ctx, { x: tx, y: ty, r: 36, sq: 0.84, eyes: 'teal', mouth: 'o', rim: '#20C8C0', inkc: '#0B6A70' });
  // teal possession rim (painted, thick, with glow)
  { const sq = 0.84, srx = 36 * (2 - sq), sry = 36 * 1.02 * sq; const op = beanPts(tx, ty - sry - 36 * 0.08, srx + 3, sry + 3, 0.01);
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.filter = 'blur(3px)'; path(ctx, op); ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(80,250,235,0.9)'; ctx.stroke(); ctx.restore();
    ink(ctx, op, '#12B8B2', 2.6, { gap: 0.04, a: 1 }); }
  ink(ctx, ellPts(tx + 2, ty - 58, 30, 8, 0.03, 40), '#14C0B8', 1.8, { gap: 0.3 });
  ink(ctx, ellPts(tx + 2, ty - 58, 42, 12, 0.03, 40), '#14C0B8', 1.2, { gap: 0.45, a: 0.6 });
  ghost(ctx, tx + 2, ty - 80, 25, -Math.PI / 2 + 0.35 + Math.PI);
  // squash splash ticks at the entry point
  for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.38; const r0 = 30, r1 = 40; ink(ctx, [[tx + 2 + Math.cos(a) * r0 * 1.3, ty - 60 + Math.sin(a) * r0 * 0.6], [tx + 2 + Math.cos(a) * r1 * 1.3, ty - 60 + Math.sin(a) * r1 * 0.6]], '#18B0AA', 1.6, { open: true, gap: 0 }); }

  // foreground fighters
  slime(ctx, { x: 104, y: 706, r: 28, look: 1, angry: true, mouth: 'shout', kick: true });
  slime(ctx, { x: 318, y: 700, r: 30, look: -1, angry: true, mouth: 'shout', col: '#7CCB8A', dk: '#2E7A50' });
  rope(ctx, cx, cy, rx - 2, ry - 2, true);
  // a little one tumbling just outside the rope? keep inside: small slime at front-center-left, in front of rope ring line
  slime(ctx, { x: 236, y: 742, r: 20, look: -0.6, mouth: 'o', col: '#F0B848', dk: '#B06A20' });

  // soft foreground grass (out of focus)
  ctx.save(); ctx.filter = 'blur(2.5px)'; ctx.globalCompositeOperation = 'multiply';
  for (let i = 0; i < 10; i++) { const px = i * 42 + R() * 20, py = 842; for (let k = 0; k < 10; k++) { ctx.strokeStyle = k % 2 ? 'rgba(70,130,50,0.6)' : 'rgba(130,180,70,0.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px + k * 2.4, py + 8); ctx.quadraticCurveTo(px + k * 2.4 + 4, py - 8, px + k * 2.4 + (R() - 0.5) * 16, py - 16 - R() * 14); ctx.stroke(); } }
  ctx.restore();

  // --- finishing ---
  // soft bloom of the lights
  const [blc, bl] = mk(W, H); bl.filter = 'blur(12px)'; bl.drawImage(ctx.canvas, 0, 0, W, H);
  ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.18; ctx.drawImage(blc, 0, 0, W, H); ctx.restore();
  // warm morning glaze upper-left, cool shade lower-right
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, 'rgba(255,236,200,0.5)'); g.addColorStop(0.55, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(200,205,235,0.45)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  // vignette as a pale violet wash
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; g = ctx.createRadialGradient(W / 2, H * 0.56, H * 0.33, W / 2, H * 0.56, H * 0.72); g.addColorStop(0, 'rgba(200,190,220,0)'); g.addColorStop(1, 'rgba(170,150,190,0.4)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  // gentle contrast lift
  { const [cc, cx2] = mk(W, H); cx2.drawImage(ctx.canvas, 0, 0, W, H); ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.22; ctx.drawImage(cc, 0, 0, W, H); ctx.restore(); }
  paperGrain(ctx, W, H);
  hud(ctx, W);
}
