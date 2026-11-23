// c2 — 두꺼운 외곽선의 고급 카툰 (premium bold-outline cartoon)
// paint(ctx, W, H, rand): 390×844 CSS px, ctx already scaled 2×.

const PI = Math.PI, TAU = Math.PI * 2;
const INK = '#2a1630';
const LX = -0.55, LY = -0.83; // light direction (toward the light, upper-left)

function M() { return new DOMMatrix(); }
function xf(p, m) { const q = new Path2D(); q.addPath(p, m); return q; }
function shift(p, dx, dy) { return xf(p, M().translate(dx, dy)); }
function ellP(cx, cy, rx, ry, rot) { const p = new Path2D(); p.ellipse(cx, cy, rx, ry, rot || 0, 0, TAU); return p; }
function lerp(a, b, t) { return a + (b - a) * t; }

// ---------- core toon renderer ----------
// o: cx, cy, r, c:[hi, base, low], shade, deep, rim, ink, lw, spec(bool), sss(color), glow
function toon(ctx, p, o) {
  const { cx, cy, r } = o;
  const ink = o.ink || INK, lw = o.lw == null ? 2.6 : o.lw;
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // weighted outline: heavier toward shadow side (lower-right)
  if (lw > 0) {
    const sp = shift(p, -LX * lw * 0.55, -LY * lw * 0.55);
    ctx.fillStyle = ink; ctx.strokeStyle = ink;
    ctx.lineWidth = lw * 2.1; ctx.stroke(sp); ctx.fill(sp);
    ctx.lineWidth = lw * 1.5; ctx.stroke(p);
  }
  // base soft gradient
  const g = ctx.createRadialGradient(cx + LX * r * 0.45, cy + LY * r * 0.45, r * 0.05, cx, cy, r * 1.25);
  g.addColorStop(0, o.c[0]); g.addColorStop(0.55, o.c[1]); g.addColorStop(1, o.c[2]);
  ctx.fillStyle = g; ctx.fill(p);
  ctx.save(); ctx.clip(p);
  const R = r * 4;
  const cres = (d, col, alpha) => {
    const b = new Path2D(); b.rect(cx - R, cy - R, R * 2, R * 2);
    b.addPath(shift(p, LX * d, LY * d));
    ctx.globalAlpha = alpha == null ? 1 : alpha; ctx.fillStyle = col; ctx.fill(b, 'evenodd'); ctx.globalAlpha = 1;
  };
  if (o.sss) { // subsurface glow in the lower body (jelly)
    const s = ctx.createRadialGradient(cx - LX * r * 0.2, cy + r * 0.55, 0, cx, cy + r * 0.5, r * 0.9);
    s.addColorStop(0, o.sss); s.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = s; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
  }
  if (o.shade) cres(r * (o.sd || 0.3), o.shade);
  if (o.deep) cres(r * (o.dd || 0.12), o.deep);
  if (o.rim) cres(r * 0.06 + lw * 0.9, o.rim, o.rimA == null ? 0.95 : o.rimA);
  // light-side crisp light tone
  if (o.lite) {
    const b = new Path2D(); b.rect(cx - R, cy - R, R * 2, R * 2);
    b.addPath(shift(p, -LX * r * 0.16, -LY * r * 0.16));
    ctx.globalAlpha = 0.55; ctx.fillStyle = o.lite; ctx.fill(b, 'evenodd'); ctx.globalAlpha = 1;
  }
  if (o.after) o.after(ctx);
  ctx.restore();
  if (lw > 0) { ctx.strokeStyle = ink; ctx.lineWidth = lw; ctx.stroke(p); }
  ctx.restore();
}

function spec(ctx, x, y, rx, ry, rot, a) {
  ctx.save(); ctx.globalAlpha = a == null ? 0.95 : a; ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); ctx.fill(); ctx.restore();
}
// curved jelly highlight (crescent band)
function specArc(ctx, x, y, r, a0, a1, w, a) {
  ctx.save(); ctx.globalAlpha = a == null ? 0.9 : a; ctx.strokeStyle = '#fff'; ctx.lineCap = 'round';
  ctx.lineWidth = w; ctx.beginPath(); ctx.arc(x, y, r, a0, a1); ctx.stroke(); ctx.restore();
}

function groundShadow(ctx, x, y, rx, ry, a) {
  ctx.save(); ctx.globalCompositeOperation = 'multiply';
  const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
  g.addColorStop(0, `rgba(120,60,40,${a == null ? 0.55 : a})`); g.addColorStop(0.7, `rgba(150,80,50,${(a == null ? 0.55 : a) * 0.5})`); g.addColorStop(1, 'rgba(160,90,60,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill(); ctx.restore();
}

function star5(ctx, x, y, r, rot) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot - PI / 2 + i * PI / 5, rr = i % 2 ? r * 0.45 : r;
    i ? ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}
function star5P(x, y, r, rot, inner) {
  const p = new Path2D();
  for (let i = 0; i < 10; i++) {
    const a = rot - PI / 2 + i * PI / 5, rr = i % 2 ? r * (inner || 0.47) : r;
    i ? p.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : p.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  p.closePath(); return p;
}

// ---------- palettes ----------
const PAL = {
  lime:   { c: ['#f4ff9c', '#9ee03f', '#5cb030'], shade: '#3f9a37', deep: '#256b39', rim: '#ffe98a', sss: 'rgba(230,255,140,0.55)', feet: '#4c9a2c' },
  green:  { c: ['#d9ffa0', '#5fd055', '#2f9e4a'], shade: '#25864a', deep: '#175c42', rim: '#ffe48a', sss: 'rgba(200,255,150,0.5)', feet: '#2b8a44' },
  orange: { c: ['#fff0a0', '#ffb43c', '#f07a22'], shade: '#e0601f', deep: '#a53a1e', rim: '#fff0b0', sss: 'rgba(255,240,150,0.55)', feet: '#d86420' },
  yellow: { c: ['#fffbd0', '#ffe04a', '#f2b021'], shade: '#e89a1c', deep: '#b0601a', rim: '#ffffff', sss: 'rgba(255,255,190,0.6)', feet: '#e49a20' },
  coral:  { c: ['#ffe0c8', '#ff8a6a', '#e8504e'], shade: '#d43e4c', deep: '#952846', rim: '#ffe0a0', sss: 'rgba(255,220,180,0.5)', feet: '#cc404a' },
};

// ---------- slime ----------
function slimePath(w, h) {
  const p = new Path2D();
  p.moveTo(0, -h);
  p.bezierCurveTo(w * 0.36, -h, w * 0.53, -h * 0.58, w * 0.53, -h * 0.27);
  p.bezierCurveTo(w * 0.53, -h * 0.03, w * 0.3, 0, 0, 0);
  p.bezierCurveTo(-w * 0.3, 0, -w * 0.53, -h * 0.03, -w * 0.53, -h * 0.27);
  p.bezierCurveTo(-w * 0.53, -h * 0.58, -w * 0.36, -h, 0, -h);
  p.closePath();
  return p;
}

function slime(ctx, s) {
  const pal = PAL[s.pal];
  const w = s.w, h = s.h || s.w * 0.86, air = s.air || 0, rot = s.rot || 0, sq = s.sq || 0;
  const by = s.y - air;
  if (!s.noShadow) groundShadow(ctx, s.x + 6, s.y + 2, w * (0.62 - Math.min(air, 60) / 300), w * 0.2, 0.6 - Math.min(air, 60) / 160);
  const m = M().translate(s.x, by).rotate(rot * 180 / PI).scale(1 + sq, 1 - sq);
  // aura for possessed
  if (s.possessed) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const c = m.transformPoint(new DOMPoint(0, -h * 0.5));
    const g = ctx.createRadialGradient(c.x, c.y, w * 0.3, c.x, c.y, w * 1.05);
    g.addColorStop(0, 'rgba(40,255,230,0.55)'); g.addColorStop(1, 'rgba(0,200,220,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c.x, c.y, w * 1.1, 0, TAU); ctx.fill(); ctx.restore();
  }
  // feet
  const ink = s.possessed ? '#073e4c' : INK;
  for (const sx of [-1, 1]) {
    const fp = xf(ellP(sx * w * 0.22 + (s.step || 0) * sx, -h * 0.02, w * 0.13, h * 0.1, 0), m);
    const c = m.transformPoint(new DOMPoint(sx * w * 0.22, -h * 0.02));
    toon(ctx, fp, { cx: c.x, cy: c.y, r: w * 0.13, c: [pal.c[1], pal.feet, pal.deep], shade: pal.deep, lw: 2, ink });
  }
  const p = xf(slimePath(w, h), m);
  const c = m.transformPoint(new DOMPoint(0, -h * 0.5));
  toon(ctx, p, {
    cx: c.x, cy: c.y, r: Math.max(w, h) * 0.5, c: pal.c, shade: pal.shade, deep: pal.deep,
    rim: s.possessed ? '#5ffff0' : pal.rim, rimA: s.possessed ? 1 : 0.85, sss: pal.sss, lw: s.lw || 2.7, ink,
    sd: 0.34, dd: 0.13,
    after: (ctx) => {
      // jelly highlights
      ctx.save(); ctx.setTransform(ctx.getTransform().multiply(m));
      specArc(ctx, 0, -h * 0.5, w * 0.36, PI * 1.12, PI * 1.45, w * 0.075, 0.95);
      spec(ctx, -w * 0.3, -h * 0.66, w * 0.05, w * 0.035, -0.6, 0.95);
      spec(ctx, w * 0.3, -h * 0.25, w * 0.025, w * 0.04, 0.3, 0.6);
      // inner bubbles
      ctx.globalAlpha = 0.35; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(w * 0.18, -h * 0.18, w * 0.04, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(-w * 0.1, -h * 0.12, w * 0.025, 0, TAU); ctx.stroke();
      ctx.restore();
    },
  });
  // possessed teal glow rim outline
  if (s.possessed) {
    ctx.save(); ctx.shadowColor = '#2ffff0'; ctx.shadowBlur = 14; ctx.strokeStyle = '#3ffcef'; ctx.lineWidth = 3.2;
    ctx.stroke(p); ctx.shadowBlur = 0; ctx.strokeStyle = '#e6fffd'; ctx.lineWidth = 1.1; ctx.stroke(p); ctx.restore();
  }
  // face
  ctx.save(); ctx.setTransform(ctx.getTransform().multiply(m));
  const fx = s.look || 0;
  const ey = -h * 0.56, ex = w * 0.17;
  const erx = w * 0.105, ery = h * 0.15;
  for (const sx of [-1, 1]) {
    const x = sx * ex + fx * w * 0.08;
    if (s.eyes === 'swirl') {
      ctx.fillStyle = '#fff'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(x, ey, erx * 1.1, ery * 0.95, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.lineWidth = 1.6; ctx.beginPath();
      for (let t = 0; t < 14; t++) { const a = t * 0.75 * sx, rr = erx * 0.95 * (1 - t / 14); const px = x + Math.cos(a) * rr, py = ey + Math.sin(a) * rr * 0.9; t ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.stroke();
    } else if (s.eyes === 'x') {
      ctx.strokeStyle = INK; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - erx, ey - ery * 0.6); ctx.lineTo(x + erx, ey + ery * 0.6); ctx.moveTo(x + erx, ey - ery * 0.6); ctx.lineTo(x - erx, ey + ery * 0.6); ctx.stroke();
    } else if (s.eyes === 'teal') {
      ctx.save(); ctx.shadowColor = '#22fff0'; ctx.shadowBlur = 12;
      ctx.fillStyle = '#063a48'; ctx.beginPath(); ctx.ellipse(x, ey, erx * 1.12, ery * 1.08, 0, 0, TAU); ctx.fill();
      ctx.restore();
      const g = ctx.createRadialGradient(x, ey + ery * 0.2, 0, x, ey, ery);
      g.addColorStop(0, '#f0fffd'); g.addColorStop(0.35, '#6ffff2'); g.addColorStop(1, '#0bbcc8');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, ey, erx * 0.86, ery * 0.84, 0, 0, TAU); ctx.fill();
      spec(ctx, x - erx * 0.3, ey - ery * 0.4, erx * 0.32, ery * 0.26, -0.4, 1);
      spec(ctx, x + erx * 0.35, ey + ery * 0.35, erx * 0.14, erx * 0.14, 0, 0.9);
    } else {
      // glossy dark eye
      ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(x, ey, erx * 1.12, ery * 1.08, 0, 0, TAU); ctx.fill();
      const g = ctx.createLinearGradient(0, ey - ery, 0, ey + ery);
      g.addColorStop(0, '#1a1030'); g.addColorStop(0.6, '#3a2860'); g.addColorStop(1, '#7a5aa0');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x + fx * erx * 0.2, ey, erx * 0.86, ery * 0.86, 0, 0, TAU); ctx.fill();
      spec(ctx, x - erx * 0.25 + fx * erx * 0.2, ey - ery * 0.38, erx * 0.38, ery * 0.3, -0.4, 1);
      spec(ctx, x + erx * 0.35 + fx * erx * 0.2, ey + ery * 0.38, erx * 0.15, erx * 0.15, 0, 0.9);
      if (s.eyes === 'angry') { // brow lid
        ctx.fillStyle = pal.shade; ctx.strokeStyle = INK; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x - erx * 1.3, ey - ery * (sx > 0 ? 0.3 : 1.2)); ctx.lineTo(x + erx * 1.3, ey - ery * (sx > 0 ? 1.2 : 0.3)); ctx.lineTo(x + erx * 1.3, ey - ery * 1.5); ctx.lineTo(x - erx * 1.3, ey - ery * 1.5); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x - erx * 1.3, ey - ery * (sx > 0 ? 0.3 : 1.2)); ctx.lineTo(x + erx * 1.3, ey - ery * (sx > 0 ? 1.2 : 0.3)); ctx.stroke();
      }
    }
  }
  // blush
  ctx.globalAlpha = 0.45; ctx.fillStyle = '#ff6f8a';
  for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sx * w * 0.32 + fx * w * 0.06, -h * 0.38, w * 0.07, h * 0.04, 0, 0, TAU); ctx.fill(); }
  ctx.globalAlpha = 1;
  // mouth
  const mx = fx * w * 0.08, my = -h * 0.36;
  ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.lineJoin = 'round';
  if (s.mouth === 'o') {
    ctx.fillStyle = '#5a1630'; ctx.beginPath(); ctx.ellipse(mx, my + 1, w * 0.06, h * 0.07, 0, 0, TAU); ctx.fill(); ctx.stroke();
  } else if (s.mouth === 'grin') {
    ctx.fillStyle = '#5a1630'; ctx.beginPath(); ctx.moveTo(mx - w * 0.1, my - 1); ctx.quadraticCurveTo(mx, my + h * 0.16, mx + w * 0.1, my - 1); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff7f96'; ctx.beginPath(); ctx.ellipse(mx, my + h * 0.06, w * 0.045, h * 0.03, 0, 0, TAU); ctx.fill();
  } else if (s.mouth === 'grit') {
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.rect(mx - w * 0.09, my - h * 0.03, w * 0.18, h * 0.07); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(mx - w * 0.09, my + h * 0.005); ctx.lineTo(mx + w * 0.09, my + h * 0.005); ctx.moveTo(mx, my - h * 0.03); ctx.lineTo(mx, my + h * 0.04); ctx.stroke();
  } else if (s.mouth === 'wobble') {
    ctx.beginPath(); for (let i = 0; i <= 6; i++) { const px = mx - w * 0.1 + i * w * 0.2 / 6, py = my + (i % 2 ? 2 : -1); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(mx - w * 0.06, my); ctx.quadraticCurveTo(mx, my + h * 0.07, mx + w * 0.06, my); ctx.stroke();
  }
  ctx.restore();
}

// ---------- rock fist (faceted) ----------
function rock(ctx, x, y, r, rot, rnd) {
  const n = 9, pts = [];
  for (let i = 0; i < n; i++) {
    const a = rot + i * TAU / n, rr = r * (0.82 + rnd() * 0.26);
    pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.92]);
  }
  const p = new Path2D(); pts.forEach((q, i) => i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])); p.closePath();
  const ink = INK;
  ctx.save(); ctx.lineJoin = 'round';
  const sp = shift(p, 1.8, 2.6); ctx.fillStyle = ink; ctx.strokeStyle = ink; ctx.lineWidth = 6; ctx.stroke(sp); ctx.fill(sp);
  ctx.lineWidth = 4; ctx.stroke(p);
  ctx.fillStyle = '#9b93a8'; ctx.fill(p);
  ctx.save(); ctx.clip(p);
  const kx = x + LX * r * 0.28, ky = y + LY * r * 0.28; // facet apex toward light
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const mx = (a[0] + b[0]) / 2 - x, my = (a[1] + b[1]) / 2 - y; const l = Math.hypot(mx, my);
    const d = (mx * LX + my * LY) / l; // -1..1
    const tone = d > 0.45 ? '#e9e3ef' : d > 0 ? '#c4bccf' : d > -0.5 ? '#8a8099' : '#5f5470';
    ctx.fillStyle = tone; ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(60,40,80,0.35)'; ctx.lineWidth = 1; ctx.stroke();
  }
  // top face
  ctx.fillStyle = '#f6f2fa'; ctx.beginPath(); ctx.moveTo(kx, ky);
  ctx.lineTo(kx + (pts[5][0] - kx) * 0.35, ky + (pts[5][1] - ky) * 0.35);
  ctx.lineTo(kx + (pts[6][0] - kx) * 0.45, ky + (pts[6][1] - ky) * 0.45);
  ctx.closePath(); ctx.globalAlpha = 0.8; ctx.fill(); ctx.globalAlpha = 1;
  // cracks
  ctx.strokeStyle = '#3a2a48'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x + r * 0.1, y - r * 0.2); ctx.lineTo(x + r * 0.35, y + r * 0.05); ctx.lineTo(x + r * 0.3, y + r * 0.35);
  ctx.moveTo(x + r * 0.35, y + r * 0.05); ctx.lineTo(x + r * 0.6, y + r * 0.1); ctx.stroke();
  // knuckle grooves
  ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(42,22,48,0.7)';
  for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(x + k * r * 0.3 - r * 0.1, y - r * 0.75); ctx.quadraticCurveTo(x + k * r * 0.3, y - r * 0.5, x + k * r * 0.3 + r * 0.05, y - r * 0.3); ctx.stroke(); }
  // moss
  ctx.fillStyle = '#7cc443';
  for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(x - r * 0.45 + k * r * 0.22, y - r * 0.78 + Math.abs(k - 1.5) * 3, r * 0.17, 0, TAU); ctx.fill(); }
  ctx.fillStyle = '#b8ee6a';
  for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(x - r * 0.48 + k * r * 0.22, y - r * 0.84 + k, r * 0.07, 0, TAU); ctx.fill(); }
  // rim on shadow side
  const b = new Path2D(); b.rect(x - r * 3, y - r * 3, r * 6, r * 6); b.addPath(shift(p, LX * 4, LY * 4));
  ctx.fillStyle = '#c9b8ff'; ctx.globalAlpha = 0.8; ctx.fill(b, 'evenodd'); ctx.globalAlpha = 1;
  ctx.restore();
  ctx.strokeStyle = ink; ctx.lineWidth = 2.8; ctx.stroke(p);
  ctx.restore();
}

function capsule(x1, y1, x2, y2, r1, r2) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const p = new Path2D();
  p.arc(x1, y1, r1, a + PI / 2, a - PI / 2);
  p.arc(x2, y2, r2, a - PI / 2, a + PI / 2);
  p.closePath(); return p;
}

// ---------- bear ----------
function bear(ctx, X, Y, rnd) {
  const fur = { c: ['#f0b070', '#b8703a', '#8a4a26'], shade: '#7a3e22', deep: '#4e2418', rim: '#ffd08a', lw: 3 };
  groundShadow(ctx, X + 12, Y + 4, 78, 24, 0.65);
  // wind-up motion arcs behind raised fist
  ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) { ctx.lineWidth = 3.5 - i; ctx.beginPath(); ctx.arc(X + 10, Y - 85, 62 + i * 9, -1.25 - i * 0.05, -0.35 + i * 0.05); ctx.stroke(); }
  ctx.restore();
  // back arm + raised rock fist
  toon(ctx, capsule(X + 18, Y - 70, X + 46, Y - 118, 15, 12), { cx: X + 32, cy: Y - 94, r: 22, ...fur, c: fur.c });
  rock(ctx, X + 52, Y - 134, 27, 0.4, rnd);
  // legs
  for (const [lx, ly] of [[X - 26, Y - 8], [X + 22, Y - 6]]) {
    toon(ctx, ellP(lx, ly, 17, 13, 0), { cx: lx, cy: ly, r: 17, ...fur });
    ctx.fillStyle = '#f2c79a'; ctx.beginPath(); ctx.ellipse(lx - 2, ly + 4, 9, 5, 0, 0, TAU); ctx.fill();
  }
  // body
  const body = new Path2D();
  body.moveTo(X - 6, Y - 112);
  body.bezierCurveTo(X + 34, Y - 112, X + 52, Y - 70, X + 46, Y - 34);
  body.bezierCurveTo(X + 42, Y - 6, X + 14, Y + 2, X - 6, Y);
  body.bezierCurveTo(X - 34, Y - 2, X - 50, Y - 24, X - 48, Y - 52);
  body.bezierCurveTo(X - 46, Y - 88, X - 34, Y - 112, X - 6, Y - 112);
  toon(ctx, body, { cx: X - 2, cy: Y - 56, r: 54, ...fur, after: (c) => {
    // belly
    const bp = ellP(X - 10, Y - 40, 27, 30, -0.15);
    c.fillStyle = '#f6cf9c'; c.fill(bp);
    const b = new Path2D(); b.rect(X - 200, Y - 200, 400, 400); b.addPath(shift(bp, LX * 8, LY * 8));
    c.save(); c.clip(bp); c.fillStyle = '#d9a26a'; c.fill(b, 'evenodd'); c.restore();
    c.strokeStyle = 'rgba(78,36,24,0.6)'; c.lineWidth = 1.5; c.stroke(bp);
    // fur tufts strokes
    c.strokeStyle = 'rgba(78,36,24,0.55)'; c.lineWidth = 1.4;
    for (let i = 0; i < 6; i++) { const tx = X + 20 + i * 4, ty = Y - 60 + i * 8; c.beginPath(); c.moveTo(tx, ty); c.lineTo(tx + 5, ty + 3); c.stroke(); }
  } });
  // belt
  ctx.save(); ctx.clip(body);
  ctx.fillStyle = '#d8323e'; ctx.fillRect(X - 60, Y - 24, 120, 11);
  ctx.fillStyle = '#9a1c34'; ctx.fillRect(X - 60, Y - 16, 120, 3);
  ctx.fillStyle = '#ff7a72'; ctx.fillRect(X - 60, Y - 24, 120, 2.5);
  ctx.restore();
  ctx.strokeStyle = INK; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(X - 47, Y - 25); ctx.quadraticCurveTo(X, Y - 22, X + 45, Y - 26); ctx.moveTo(X - 44, Y - 12); ctx.quadraticCurveTo(X, Y - 10, X + 42, Y - 14); ctx.stroke();
  // head
  const hx = X - 16, hy = Y - 122;
  for (const [ex, ey] of [[hx - 24, hy - 26], [hx + 22, hy - 28]]) {
    toon(ctx, ellP(ex, ey, 12, 11, 0), { cx: ex, cy: ey, r: 12, ...fur });
    ctx.fillStyle = '#e89a7a'; ctx.beginPath(); ctx.ellipse(ex, ey + 1, 6, 5, 0, 0, TAU); ctx.fill();
  }
  const head = new Path2D();
  head.moveTo(hx, hy - 34);
  head.bezierCurveTo(hx + 30, hy - 34, hx + 38, hy - 10, hx + 36, hy + 6);
  head.bezierCurveTo(hx + 34, hy + 26, hx + 16, hy + 30, hx, hy + 30);
  head.bezierCurveTo(hx - 20, hy + 30, hx - 38, hy + 24, hx - 38, hy + 2);
  head.bezierCurveTo(hx - 38, hy - 16, hx - 28, hy - 34, hx, hy - 34);
  toon(ctx, head, { cx: hx, cy: hy, r: 36, ...fur });
  // headband
  ctx.save(); ctx.clip(head);
  ctx.fillStyle = '#e8343f'; ctx.beginPath(); ctx.moveTo(hx - 40, hy - 18); ctx.quadraticCurveTo(hx, hy - 26, hx + 40, hy - 16); ctx.lineTo(hx + 40, hy - 6); ctx.quadraticCurveTo(hx, hy - 15, hx - 40, hy - 8); ctx.fill();
  ctx.fillStyle = '#ff8f82'; ctx.beginPath(); ctx.moveTo(hx - 40, hy - 18); ctx.quadraticCurveTo(hx, hy - 26, hx + 40, hy - 16); ctx.lineTo(hx + 40, hy - 13); ctx.quadraticCurveTo(hx, hy - 23, hx - 40, hy - 15); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = INK; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(hx - 37, hy - 17); ctx.quadraticCurveTo(hx, hy - 26, hx + 36, hy - 16); ctx.moveTo(hx - 38, hy - 7); ctx.quadraticCurveTo(hx, hy - 15, hx + 37, hy - 6); ctx.stroke();
  // headband tails flapping right
  const tail = new Path2D();
  tail.moveTo(hx + 34, hy - 14); tail.quadraticCurveTo(hx + 52, hy - 26, hx + 64, hy - 18); tail.lineTo(hx + 58, hy - 12); tail.quadraticCurveTo(hx + 50, hy - 16, hx + 36, hy - 6); tail.closePath();
  tail.moveTo(hx + 34, hy - 10); tail.quadraticCurveTo(hx + 50, hy - 6, hx + 60, hy + 4); tail.lineTo(hx + 52, hy + 6); tail.quadraticCurveTo(hx + 46, hy - 1, hx + 34, hy - 4); tail.closePath();
  toon(ctx, tail, { cx: hx + 48, cy: hy - 10, r: 14, c: ['#ff9a8a', '#e8343f', '#b01e36'], shade: '#a81c34', lw: 2 });
  // muzzle
  const mz = ellP(hx - 14, hy + 12, 17, 12, -0.1);
  toon(ctx, mz, { cx: hx - 14, cy: hy + 12, r: 17, c: ['#fff0d8', '#f6cf9c', '#d9a26a'], shade: '#d29560', lw: 2 });
  toon(ctx, ellP(hx - 18, hy + 4, 6, 4.2, 0), { cx: hx - 18, cy: hy + 4, r: 6, c: ['#6a5070', '#2a1630', '#1a0a20'], lw: 1.5 });
  spec(ctx, hx - 20, hy + 2.5, 2.2, 1.3, 0, 0.9);
  // gritted teeth grin
  ctx.fillStyle = '#5a1630'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(hx - 26, hy + 13); ctx.quadraticCurveTo(hx - 14, hy + 24, hx - 1, hy + 12); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(hx - 26, hy + 13); ctx.lineTo(hx - 1, hy + 12); ctx.lineTo(hx - 3, hy + 16); ctx.lineTo(hx - 24, hy + 17); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(hx - 26, hy + 13); ctx.quadraticCurveTo(hx - 14, hy + 24, hx - 1, hy + 12); ctx.closePath(); ctx.stroke();
  // eyes: fierce
  for (const [ex, s] of [[hx - 22, -1], [hx + 4, 1]]) {
    const ey = hy - 4;
    ctx.fillStyle = '#fff'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(ex, ey, 6.2, 6.8, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(ex - 1.8, ey + 0.8, 3.8, 4.6, 0, 0, TAU); ctx.fill();
    spec(ctx, ex - 2.8, ey - 1, 1.5, 1.5, 0, 1);
    // heavy brow
    ctx.fillStyle = '#4e2418'; ctx.beginPath();
    ctx.moveTo(ex - 9, ey - (s < 0 ? 10 : 5)); ctx.lineTo(ex + 9, ey - (s < 0 ? 5 : 10)); ctx.lineTo(ex + 9, ey - (s < 0 ? 1 : 4)); ctx.lineTo(ex - 9, ey - (s < 0 ? 4 : 1)); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#b8703a'; ctx.beginPath(); ctx.moveTo(ex - 10, ey - 14); ctx.lineTo(ex + 10, ey - 14); ctx.lineTo(ex + 10, ey - (s < 0 ? 4 : 9)); ctx.lineTo(ex - 10, ey - (s < 0 ? 9 : 4)); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ex - 8, ey - (s < 0 ? 9 : 4)); ctx.lineTo(ex + 8, ey - (s < 0 ? 4 : 9)); ctx.stroke();
  }
  // vein/anger mark
  ctx.strokeStyle = '#ff3b4a'; ctx.lineWidth = 2.4;
  const ax = hx + 24, ay = hy - 30;
  ctx.beginPath(); ctx.moveTo(ax - 6, ay - 2); ctx.quadraticCurveTo(ax - 2, ay - 2, ax - 2, ay - 6); ctx.moveTo(ax + 2, ay - 6); ctx.quadraticCurveTo(ax + 2, ay - 2, ax + 6, ay - 2);
  ctx.moveTo(ax + 6, ay + 2); ctx.quadraticCurveTo(ax + 2, ay + 2, ax + 2, ay + 6); ctx.moveTo(ax - 2, ay + 6); ctx.quadraticCurveTo(ax - 2, ay + 2, ax - 6, ay + 2); ctx.stroke();
  // front arm + forward fist (guard)
  toon(ctx, capsule(X - 30, Y - 72, X - 52, Y - 44, 14, 12), { cx: X - 40, cy: Y - 58, r: 20, ...fur });
  rock(ctx, X - 60, Y - 36, 22, 1.1, rnd);
}

// ---------- ghost (hero) ----------
function ghostPath(R) {
  const p = new Path2D();
  p.moveTo(0, -R);
  p.arc(0, 0, R, -PI / 2, PI / 2);
  p.bezierCurveTo(-R * 0.8, R * 1.0, -R * 1.5, R * 0.75, -R * 2.0, R * 0.62);
  p.quadraticCurveTo(-R * 1.7, R * 0.3, -R * 1.85, R * 0.15);
  p.bezierCurveTo(-R * 2.3, R * 0.25, -R * 2.9, R * 0.2, -R * 3.0, -R * 0.25);
  p.bezierCurveTo(-R * 3.05, -R * 0.6, -R * 2.7, -R * 0.75, -R * 2.45, -R * 0.55);
  p.bezierCurveTo(-R * 2.6, -R * 0.4, -R * 2.55, -R * 0.2, -R * 2.3, -R * 0.25);
  p.bezierCurveTo(-R * 1.7, -R * 0.5, -R * 1.2, -R * 1.05, 0, -R);
  p.closePath();
  return p;
}
function ghost(ctx, x, y, R, ang) {
  const m = M().translate(x, y).rotate(ang * 180 / PI);
  // bloom
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  let g = ctx.createRadialGradient(x, y, 0, x, y, R * 3.2);
  g.addColorStop(0, 'rgba(80,255,235,0.75)'); g.addColorStop(0.4, 'rgba(20,220,220,0.3)'); g.addColorStop(1, 'rgba(0,160,200,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R * 3.2, 0, TAU); ctx.fill(); ctx.restore();
  const ink = '#06384a';
  const p = xf(ghostPath(R), m);
  ctx.save(); ctx.shadowColor = 'rgba(30,255,235,0.9)'; ctx.shadowBlur = 22; ctx.fillStyle = '#3ff0e0'; ctx.fill(p); ctx.restore();
  toon(ctx, p, {
    cx: x, cy: y, r: R * 1.1, c: ['#f2fffd', '#5ff3e6', '#16b7c6'], shade: '#12a2b8', deep: '#0b7894', rim: '#ffffff', rimA: 1, lw: 2.8, ink, sd: 0.32, dd: 0.12,
    sss: 'rgba(200,255,250,0.4)',
    after: (c) => {
      c.save(); c.setTransform(c.getTransform().multiply(m));
      // light-side spec
      c.rotate(-ang);
      specArc(c, 0, 0, R * 0.72, PI * 1.08, PI * 1.42, R * 0.18, 0.95);
      spec(c, -R * 0.62, -R * 0.62, R * 0.1, R * 0.08, 0, 1);
      c.restore();
    },
  });
  // face: drawn upright-ish (tilted a bit toward travel)
  ctx.save(); ctx.translate(x + Math.cos(ang) * R * 0.12, y + Math.sin(ang) * R * 0.12); ctx.rotate(ang - PI / 2 + 0.0);
  // after rotate: +y axis points along travel. We want face looking down-right toward the slime; rotate face to be readable
  ctx.restore();
  ctx.save(); ctx.translate(x, y); ctx.rotate((ang - PI / 2) * 0.35);
  const fy = R * 0.1;
  // happy closed eyes ^ ^
  ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(s * R * 0.46 - R * 0.2, fy - R * 0.12); ctx.quadraticCurveTo(s * R * 0.46, fy - R * 0.5, s * R * 0.46 + R * 0.2, fy - R * 0.12); ctx.stroke();
  }
  // big open grin
  ctx.fillStyle = '#4a1240'; ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.moveTo(-R * 0.36, fy + R * 0.08); ctx.quadraticCurveTo(0, fy + R * 0.12, R * 0.36, fy + R * 0.08); ctx.quadraticCurveTo(R * 0.3, fy + R * 0.72, 0, fy + R * 0.72); ctx.quadraticCurveTo(-R * 0.3, fy + R * 0.72, -R * 0.36, fy + R * 0.08); ctx.closePath(); ctx.fill();
  ctx.save(); ctx.clip(); ctx.fillStyle = '#ff7fa0'; ctx.beginPath(); ctx.ellipse(0, fy + R * 0.7, R * 0.24, R * 0.2, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.fillRect(-R * 0.3, fy + R * 0.06, R * 0.6, R * 0.12); ctx.restore();
  ctx.stroke();
  // cheeks
  ctx.globalAlpha = 0.6; ctx.fillStyle = '#ff8fb8';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * R * 0.68, fy + R * 0.1, R * 0.16, R * 0.1, 0, 0, TAU); ctx.fill(); }
  ctx.restore();
}

// ---------- trail ----------
function bez(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
          u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]];
}
function trail(ctx, P, rnd) {
  const N = 80, pts = [];
  for (let i = 0; i <= N; i++) pts.push(bez(P[0], P[1], P[2], P[3], i / N));
  // ribbon with width & colour varying along t
  const ribbon = (wfn, colfn, comp, blur) => {
    const L = [], Rr = [];
    for (let i = 0; i <= N; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N, i + 1)];
      let nx = -(b[1] - a[1]), ny = b[0] - a[0]; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      const w = wfn(i / N);
      L.push([pts[i][0] + nx * w, pts[i][1] + ny * w]); Rr.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
    }
    ctx.save(); if (comp) ctx.globalCompositeOperation = comp; if (blur) ctx.filter = `blur(${blur}px)`;
    for (let i = 0; i < N; i++) {
      ctx.fillStyle = colfn(i / N);
      ctx.beginPath(); ctx.moveTo(L[i][0], L[i][1]); ctx.lineTo(L[i + 1][0], L[i + 1][1]); ctx.lineTo(Rr[i + 1][0], Rr[i + 1][1]); ctx.lineTo(Rr[i][0], Rr[i][1]); ctx.closePath(); ctx.fill();
      // overlap seam
      ctx.beginPath(); ctx.moveTo(L[i][0], L[i][1]); ctx.lineTo(L[Math.min(N, i + 2)][0], L[Math.min(N, i + 2)][1]); ctx.lineTo(Rr[Math.min(N, i + 2)][0], Rr[Math.min(N, i + 2)][1]); ctx.lineTo(Rr[i][0], Rr[i][1]); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  };
  const ease = (t) => Math.min(1, t * 1.6);
  ribbon((t) => 4 + 20 * t, (t) => `rgba(40,240,230,${0.25 * ease(t)})`, 'lighter', 6);
  ribbon((t) => 2.5 + 12.5 * Math.pow(t, 0.9), (t) => `rgba(6,56,74,${0.18 + 0.82 * ease(t)})`);
  ribbon((t) => 1.2 + 10.3 * Math.pow(t, 0.9), (t) => `rgba(${Math.round(40 + 90 * t)},${Math.round(225 + 30 * t)},${Math.round(225 + 20 * t)},${0.3 + 0.7 * ease(t)})`);
  ribbon((t) => 0.4 + 3.6 * t, (t) => `rgba(255,255,255,${0.2 + 0.75 * t})`);
  // sparkles along the trail
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 34; i++) {
    const t = 0.15 + rnd() * 0.8, q = bez(P[0], P[1], P[2], P[3], t);
    const ox = (rnd() - 0.5) * 34 * t, oy = (rnd() - 0.5) * 34 * t;
    const r = 0.8 + rnd() * 2.2 * t;
    ctx.fillStyle = rnd() < 0.5 ? '#bffff8' : '#4ff6e6';
    ctx.beginPath(); ctx.arc(q[0] + ox, q[1] + oy, r, 0, TAU); ctx.fill();
  }
  for (let i = 0; i < 6; i++) {
    const t = 0.3 + i * 0.11, q = bez(P[0], P[1], P[2], P[3], t);
    const ox = (rnd() - 0.5) * 30, oy = (rnd() - 0.5) * 20;
    sparkle(ctx, q[0] + ox, q[1] + oy, 3 + t * 5, '#e8fffd');
  }
  ctx.restore();
}
function sparkle(ctx, x, y, r, col) {
  ctx.fillStyle = col; ctx.beginPath();
  ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r); ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.fill();
}

// ---------- burst ----------
function spikyP(x, y, r1, r2, n, rnd, sy, rot) {
  const p = new Path2D();
  for (let i = 0; i < n * 2; i++) {
    const a = (rot || 0) + i * PI / n + (rnd() - 0.5) * 0.18;
    const rr = i % 2 ? r2 * (0.85 + rnd() * 0.3) : r1 * (0.8 + rnd() * 0.4);
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * (sy || 1);
    i ? p.lineTo(px, py) : p.moveTo(px, py);
  }
  p.closePath(); return p;
}
function burst(ctx, x, y, rnd) {
  // ground scorch / splat
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgba(120,170,60,0.5)';
  for (let i = 0; i < 9; i++) { const a = rnd() * TAU, d = 18 + rnd() * 30; ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * d, y + 26 + Math.sin(a) * d * 0.4, 6 + rnd() * 8, 3 + rnd() * 3, 0, 0, TAU); ctx.fill(); }
  ctx.restore();
  // bloom
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  let g = ctx.createRadialGradient(x, y, 0, x, y, 150);
  g.addColorStop(0, 'rgba(255,250,220,0.95)'); g.addColorStop(0.25, 'rgba(255,220,140,0.55)'); g.addColorStop(0.6, 'rgba(255,170,80,0.15)'); g.addColorStop(1, 'rgba(255,150,60,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 150, 0, TAU); ctx.fill(); ctx.restore();
  // shockwave ring (perspective ellipse, on ground plane)
  ctx.save();
  const ry = 0.55;
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) { ctx.strokeStyle = `rgba(255,240,200,${0.15 - i * 0.02})`; ctx.lineWidth = 16 - i * 3; ctx.beginPath(); ctx.ellipse(x, y + 24, 104, 104 * ry, 0, 0, TAU); ctx.stroke(); }
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = INK; ctx.lineWidth = 7; ctx.beginPath(); ctx.ellipse(x, y + 24, 100, 100 * ry, 0, PI * 0.05, PI * 0.95); ctx.stroke();
  ctx.strokeStyle = '#fff8e0'; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.ellipse(x, y + 24, 100, 100 * ry, 0, 0, TAU); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y + 24, 112, 112 * ry, 0, 0, TAU); ctx.stroke();
  ctx.restore();
  // radial action lines
  ctx.save(); ctx.lineCap = 'round';
  for (let i = 0; i < 22; i++) {
    const a = i * TAU / 22 + rnd() * 0.2, r0 = 58 + rnd() * 16, r1 = r0 + 22 + rnd() * 30;
    ctx.strokeStyle = i % 3 ? '#fff6d8' : '#ffd25a'; ctx.lineWidth = 1.5 + rnd() * 2.5;
    ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0 * 0.85); ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1 * 0.85); ctx.stroke();
  }
  ctx.restore();
  // cartoon smoke puffs (irregular clusters, behind the star)
  for (const [ang, d, r] of [[-2.5, 58, 15], [-2.1, 70, 10], [-0.6, 62, 17], [-0.25, 74, 10], [0.9, 58, 14], [2.3, 60, 16], [2.7, 72, 9], [1.4, 70, 9]]) {
    const px = x + Math.cos(ang) * d, py = y + Math.sin(ang) * d * 0.8;
    toon(ctx, ellP(px, py, r, r * 0.9, 0), { cx: px, cy: py, r, c: ['#ffffff', '#fff4d8', '#f2d6a8'], shade: '#e8c08a', lw: 2.2, sd: 0.25 });
  }
  // impact frame: layered spiky star with bold ink
  const s1 = spikyP(x, y, 66, 40, 11, rnd, 0.88, 0.1);
  const s2 = spikyP(x, y, 50, 30, 9, rnd, 0.88, 0.35);
  const s3 = spikyP(x, y, 32, 20, 8, rnd, 0.88, 0.0);
  ctx.save(); ctx.lineJoin = 'round';
  ctx.fillStyle = INK; ctx.strokeStyle = INK; ctx.lineWidth = 7; const s1s = shift(s1, 2, 3); ctx.stroke(s1s); ctx.fill(s1s); ctx.lineWidth = 5; ctx.stroke(s1);
  g = ctx.createRadialGradient(x, y, 10, x, y, 70); g.addColorStop(0, '#ffe066'); g.addColorStop(1, '#ff7a2a');
  ctx.fillStyle = g; ctx.fill(s1);
  ctx.save(); ctx.clip(s1); const b = new Path2D(); b.rect(x - 200, y - 200, 400, 400); b.addPath(shift(s1, -6, -8)); ctx.fillStyle = '#e8481e'; ctx.fill(b, 'evenodd'); ctx.restore();
  ctx.lineWidth = 3; ctx.stroke(s2);
  g = ctx.createRadialGradient(x, y, 5, x, y, 50); g.addColorStop(0, '#fffbe0'); g.addColorStop(1, '#ffd23a');
  ctx.fillStyle = g; ctx.fill(s2);
  ctx.fillStyle = '#ffffff'; ctx.fill(s3);
  ctx.restore();
  // hot core glow
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  g = ctx.createRadialGradient(x, y, 0, x, y, 40); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,240,200,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 40, 0, TAU); ctx.fill(); ctx.restore();
  // jelly droplets & skin shreds of the old body
  const pal = PAL.lime;
  for (let i = 0; i < 16; i++) {
    const a = rnd() * TAU, d = 62 + rnd() * 70, r = 3 + rnd() * 6.5;
    const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d * 0.85;
    // streak behind
    ctx.save(); ctx.strokeStyle = 'rgba(200,255,120,0.55)'; ctx.lineWidth = r * 0.9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(px - Math.cos(a) * r * 2.4, py - Math.sin(a) * r * 2.4); ctx.lineTo(px, py); ctx.stroke(); ctx.restore();
    const dp = new Path2D(); dp.ellipse(px, py, r * 1.25, r, a, 0, TAU);
    toon(ctx, dp, { cx: px, cy: py, r, c: pal.c, shade: pal.shade, rim: pal.rim, lw: 1.8 });
    spec(ctx, px - r * 0.35, py - r * 0.4, r * 0.3, r * 0.22, -0.5, 1);
  }
  // confetti
  const cc = ['#ff4d6d', '#ffd23a', '#ffffff', '#ff8a2a', '#b06dff', '#7be04a'];
  for (let i = 0; i < 26; i++) {
    const a = rnd() * TAU, d = 50 + rnd() * 110;
    const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d * 0.8;
    ctx.save(); ctx.translate(px, py); ctx.rotate(rnd() * TAU);
    ctx.fillStyle = cc[i % cc.length]; ctx.strokeStyle = INK; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.rect(-3.5, -1.8, 7, 3.6); ctx.fill(); ctx.stroke(); ctx.restore();
  }
}

function dizzyStars(ctx, x, y, r) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
  ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.35, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  for (let i = 0; i < 3; i++) {
    const a = i * TAU / 3 + 0.4; const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r * 0.35;
    star5(ctx, px, py, 5.5 + (i === 0 ? 1.5 : 0), a);
    ctx.fillStyle = '#ffe14a'; ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.lineJoin = 'round'; ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

// ---------- background ----------
function cloud(ctx, x, y, s, rnd) {
  const blobs = [[0, 0, 1], [-0.9, 0.25, 0.7], [0.9, 0.2, 0.75], [-0.4, -0.35, 0.72], [0.45, -0.3, 0.68], [1.6, 0.4, 0.45], [-1.6, 0.42, 0.45]];
  const p = new Path2D();
  for (const [bx, by, br] of blobs) p.ellipse(x + bx * s, y + by * s, br * s, br * s * 0.85, 0, 0, TAU);
  ctx.save();
  ctx.fillStyle = '#d7ecff'; ctx.fill(p);
  ctx.clip(p);
  const p2 = new Path2D(); for (const [bx, by, br] of blobs) p2.ellipse(x + bx * s - s * 0.12, y + by * s - s * 0.2, br * s, br * s * 0.85, 0, 0, TAU);
  ctx.fillStyle = '#ffffff'; ctx.fill(p2);
  ctx.fillStyle = 'rgba(170,200,240,0.5)'; ctx.fillRect(x - 3 * s, y + s * 0.45, 6 * s, s);
  ctx.restore();
}

function tree(ctx, x, y, s, dark) {
  ctx.save();
  ctx.fillStyle = '#6b4a34'; ctx.fillRect(x - s * 0.08, y - s * 0.4, s * 0.16, s * 0.45);
  const p = new Path2D();
  p.ellipse(x, y - s * 0.9, s * 0.55, s * 0.6, 0, 0, TAU);
  p.ellipse(x - s * 0.35, y - s * 0.6, s * 0.38, s * 0.36, 0, 0, TAU);
  p.ellipse(x + s * 0.36, y - s * 0.62, s * 0.4, s * 0.36, 0, 0, TAU);
  p.ellipse(x, y - s * 1.35, s * 0.36, s * 0.34, 0, 0, TAU);
  ctx.fillStyle = dark ? '#2f6b4a' : '#3e8a4a'; ctx.strokeStyle = dark ? '#1e4636' : '#24553a'; ctx.lineWidth = 2;
  ctx.stroke(p); ctx.fill(p);
  ctx.save(); ctx.clip(p);
  const q = xf(p, M().translate(s * 0.12, s * 0.12).scale(1)); // highlight: inverse cres
  const b = new Path2D(); b.rect(x - s * 3, y - s * 3, s * 6, s * 6); b.addPath(q);
  ctx.fillStyle = dark ? '#4f9a5a' : '#6fc35a'; ctx.fill(b, 'evenodd');
  const b2 = new Path2D(); b2.rect(x - s * 3, y - s * 3, s * 6, s * 6); b2.addPath(xf(p, M().translate(s * 0.24, s * 0.26)));
  ctx.fillStyle = dark ? '#7cc070' : '#a6e46e'; ctx.globalAlpha = 0.8; ctx.fill(b2, 'evenodd');
  ctx.restore();
  ctx.restore();
}

function critter(ctx, x, y, s, col, kind, rnd) {
  ctx.save(); ctx.lineJoin = 'round';
  const ink = '#3a2440';
  // raised arms
  const arm = rnd() < 0.7;
  ctx.strokeStyle = ink; ctx.lineWidth = s * 0.32; ctx.lineCap = 'round';
  if (arm) { ctx.beginPath(); ctx.moveTo(x - s * 0.5, y - s * 0.2); ctx.lineTo(x - s * 0.85, y - s * 1.0); ctx.moveTo(x + s * 0.5, y - s * 0.2); ctx.lineTo(x + s * 0.85, y - s * 1.0); ctx.stroke(); }
  ctx.strokeStyle = col; ctx.lineWidth = s * 0.18;
  if (arm) { ctx.beginPath(); ctx.moveTo(x - s * 0.5, y - s * 0.2); ctx.lineTo(x - s * 0.85, y - s * 1.0); ctx.moveTo(x + s * 0.5, y - s * 0.2); ctx.lineTo(x + s * 0.85, y - s * 1.0); ctx.stroke(); }
  const p = new Path2D();
  p.ellipse(x, y, s * 0.62, s * 0.58, 0, 0, TAU);
  if (kind === 0) { p.ellipse(x - s * 0.3, y - s * 0.75, s * 0.14, s * 0.38, -0.2, 0, TAU); p.ellipse(x + s * 0.3, y - s * 0.75, s * 0.14, s * 0.38, 0.2, 0, TAU); }
  if (kind === 1) { p.ellipse(x - s * 0.45, y - s * 0.45, s * 0.2, s * 0.2, 0, 0, TAU); p.ellipse(x + s * 0.45, y - s * 0.45, s * 0.2, s * 0.2, 0, 0, TAU); }
  if (kind === 2) { p.moveTo(x - s * 0.5, y - s * 0.3); p.lineTo(x - s * 0.35, y - s * 0.85); p.lineTo(x - s * 0.1, y - s * 0.5); p.moveTo(x + s * 0.5, y - s * 0.3); p.lineTo(x + s * 0.35, y - s * 0.85); p.lineTo(x + s * 0.1, y - s * 0.5); }
  ctx.fillStyle = ink; ctx.strokeStyle = ink; ctx.lineWidth = 3.2; ctx.stroke(p);
  ctx.fillStyle = col; ctx.fill(p);
  ctx.save(); ctx.clip(p); const b = new Path2D(); b.rect(x - s * 3, y - s * 3, s * 6, s * 6); b.addPath(shift(p, -s * 0.18, -s * 0.2));
  ctx.fillStyle = 'rgba(60,20,60,0.28)'; ctx.fill(b, 'evenodd'); ctx.restore();
  // face
  ctx.fillStyle = ink;
  ctx.beginPath(); ctx.arc(x - s * 0.2, y - s * 0.05, s * 0.09, 0, TAU); ctx.arc(x + s * 0.2, y - s * 0.05, s * 0.09, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x, y + s * 0.18, s * 0.12, s * 0.1, 0, 0, PI); ctx.fill();
  ctx.restore();
}

function pennants(ctx, x1, y1, x2, y2, sag, n, rnd, sz) {
  const pts = [];
  ctx.save(); ctx.strokeStyle = '#4a3040'; ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) { const t = i / 40, x = lerp(x1, x2, t), y = lerp(y1, y2, t) + Math.sin(t * PI) * sag; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
  ctx.stroke();
  const cols = ['#ff4d5e', '#ffd23a', '#ffffff', '#ff8a2a', '#9a6dff'];
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, x = lerp(x1, x2, t), y = lerp(y1, y2, t) + Math.sin(t * PI) * sag;
    const w = sz, h = sz * 1.4, sw = (rnd() - 0.5) * 4;
    ctx.fillStyle = cols[i % cols.length]; ctx.strokeStyle = '#4a3040'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x + w / 2, y); ctx.lineTo(x + sw, y + h); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(80,30,60,0.25)'; ctx.beginPath(); ctx.moveTo(x + w * 0.05, y); ctx.lineTo(x + w / 2, y); ctx.lineTo(x + sw, y + h); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

function lantern(ctx, x, y, s) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, s * 2.6); g.addColorStop(0, 'rgba(255,170,90,0.45)'); g.addColorStop(1, 'rgba(255,120,60,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, s * 2.6, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = '#3a2430'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, y - s * 1.6); ctx.lineTo(x, y - s); ctx.stroke();
  const p = ellP(x, y, s * 0.8, s, 0);
  toon(ctx, p, { cx: x, cy: y, r: s, c: ['#ffe0a0', '#ff6a3a', '#d8302e'], shade: '#b8222e', rim: '#ffd27a', lw: 1.6, ink: '#3a2430' });
  ctx.strokeStyle = 'rgba(120,20,30,0.6)'; ctx.lineWidth = 1;
  for (const k of [-0.4, 0, 0.4]) { ctx.beginPath(); ctx.ellipse(x, y, s * 0.8 * Math.abs(k) + 0.5, s, 0, -PI / 2, PI / 2, k < 0); ctx.stroke(); }
  ctx.fillStyle = '#3a2430'; ctx.fillRect(x - s * 0.45, y - s * 1.08, s * 0.9, s * 0.22); ctx.fillRect(x - s * 0.45, y + s * 0.88, s * 0.9, s * 0.22);
}

function plank(ctx, x, y, w, h, c1, c2) {
  const p = new Path2D(); p.rect(x, y, w, h);
  ctx.save(); ctx.fillStyle = c1; ctx.fill(p);
  ctx.fillStyle = c2; ctx.fillRect(x, y + h * 0.62, w, h * 0.38);
  ctx.fillStyle = 'rgba(255,240,200,0.45)'; ctx.fillRect(x, y, w, Math.min(2, h * 0.2));
  ctx.strokeStyle = '#3a2430'; ctx.lineWidth = 1.8; ctx.stroke(p); ctx.restore();
}

function background(ctx, W, H, rnd) {
  // sky
  let g = ctx.createLinearGradient(0, 0, 0, 330);
  g.addColorStop(0, '#3f9ef0'); g.addColorStop(0.55, '#86c8f7'); g.addColorStop(1, '#d8f0ff');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, 340);
  // sun glow upper-left
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  g = ctx.createRadialGradient(-20, 40, 0, -20, 40, 260); g.addColorStop(0, 'rgba(255,240,190,0.85)'); g.addColorStop(0.4, 'rgba(255,220,150,0.25)'); g.addColorStop(1, 'rgba(255,200,120,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, 340);
  ctx.restore();
  cloud(ctx, 300, 120, 26, rnd); cloud(ctx, 70, 170, 18, rnd); cloud(ctx, 215, 200, 12, rnd);
  // far mountains
  ctx.fillStyle = '#9cc7e0';
  ctx.beginPath(); ctx.moveTo(0, 250); ctx.lineTo(40, 222); ctx.lineTo(90, 238); ctx.lineTo(150, 205); ctx.lineTo(210, 236); ctx.lineTo(270, 214); ctx.lineTo(330, 232); ctx.lineTo(390, 210); ctx.lineTo(390, 300); ctx.lineTo(0, 300); ctx.fill();
  ctx.fillStyle = '#bcdcec';
  ctx.beginPath(); ctx.moveTo(150, 205); ctx.lineTo(165, 214); ctx.lineTo(158, 222); ctx.lineTo(150, 216); ctx.lineTo(140, 222); ctx.closePath(); ctx.fill();
  // far hills
  ctx.fillStyle = '#7fbf7a';
  ctx.beginPath(); ctx.moveTo(0, 262); ctx.quadraticCurveTo(80, 236, 170, 258); ctx.quadraticCurveTo(270, 280, 390, 246); ctx.lineTo(390, 330); ctx.lineTo(0, 330); ctx.fill();
  // distant tree line
  for (let i = 0; i < 22; i++) { const x = i * 19 + rnd() * 8; const y = 262 + Math.sin(i * 0.7) * 6; tree(ctx, x, y + 6, 15 + rnd() * 6, true); }
  // mid hill
  g = ctx.createLinearGradient(0, 270, 0, 440);
  g.addColorStop(0, '#8fd45e'); g.addColorStop(1, '#5fae3c');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(0, 290); ctx.quadraticCurveTo(120, 268, 200, 280); ctx.quadraticCurveTo(300, 292, 390, 276); ctx.lineTo(390, 844); ctx.lineTo(0, 844); ctx.fill();
  ctx.strokeStyle = '#4f9a3a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 290); ctx.quadraticCurveTo(120, 268, 200, 280); ctx.quadraticCurveTo(300, 292, 390, 276); ctx.stroke();
  // big side trees framing
  tree(ctx, 18, 318, 48, false); tree(ctx, 372, 312, 52, false);
  // dirt path from gate
  ctx.fillStyle = '#e2c28a';
  ctx.beginPath(); ctx.moveTo(176, 330); ctx.lineTo(214, 330); ctx.lineTo(250, 430); ctx.lineTo(140, 430); ctx.closePath(); ctx.fill();
  // grass texture strokes
  ctx.save(); ctx.lineCap = 'round';
  for (let i = 0; i < 520; i++) {
    const x = rnd() * W, y = 285 + rnd() * 560;
    const sh = 3 + (y - 285) / 70;
    ctx.strokeStyle = rnd() < 0.5 ? 'rgba(60,130,40,0.55)' : 'rgba(190,240,120,0.55)'; ctx.lineWidth = 1 + (y - 285) / 400;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (rnd() - 0.5) * 2, y - sh); ctx.stroke();
  }
  ctx.restore();
  // ---- stands (left & right) ----
  const stand = (x0, w, flip) => {
    const top = 296;
    // back wall
    plank(ctx, x0, top - 18, w, 70, '#b9794a', '#9a5e38');
    // roof awning stripes
    ctx.save();
    const aw = new Path2D(); aw.moveTo(x0 - 6, top - 20); aw.lineTo(x0 + w + 6, top - 20); aw.lineTo(x0 + w + 2, top - 38); aw.lineTo(x0 - 2, top - 38); aw.closePath();
    ctx.fillStyle = '#fff'; ctx.fill(aw); ctx.clip(aw);
    for (let i = 0; i < w / 12 + 1; i++) { ctx.fillStyle = '#ff4d5e'; ctx.fillRect(x0 - 6 + i * 24, top - 40, 12, 24); }
    ctx.restore();
    ctx.strokeStyle = '#3a2430'; ctx.lineWidth = 2; ctx.stroke(aw);
    ctx.save(); for (let i = 0; i < w / 12 + 1; i++) { ctx.fillStyle = i % 2 ? '#fff' : '#ff4d5e'; ctx.beginPath(); ctx.arc(x0 - 6 + i * 12 + 6, top - 20, 6, 0, PI); ctx.fill(); ctx.strokeStyle = '#3a2430'; ctx.lineWidth = 1.5; ctx.stroke(); } ctx.restore();
    // critters rows
    const cols = ['#ffd6a0', '#ffb3c8', '#c9e6ff', '#fff2a8', '#d8c2ff', '#ffc98a', '#b8f0a8'];
    for (let row = 0; row < 3; row++) {
      const y = top + 2 + row * 17, s = 8 + row * 1.6;
      for (let i = 0; i < 6; i++) {
        const x = x0 + 10 + i * (w - 18) / 5 + (row % 2) * 6 + (rnd() - 0.5) * 3;
        if (x > x0 + w - 4) continue;
        critter(ctx, x, y + (rnd() - 0.5) * 3, s, cols[Math.floor(rnd() * cols.length)], Math.floor(rnd() * 3), rnd);
      }
      plank(ctx, x0 - 2, y + s * 0.5, w + 4, 7, '#d49a5c', '#b07444');
    }
    // legs
    ctx.fillStyle = '#6b4030'; ctx.fillRect(x0 + 4, top + 58, 5, 12); ctx.fillRect(x0 + w - 9, top + 58, 5, 12);
  };
  stand(8, 112); stand(272, 110);
  // ---- gate ----
  const gx = 195, gy = 334;
  // posts
  for (const px of [gx - 48, gx + 48]) {
    const p = new Path2D(); p.rect(px - 7, gy - 118, 14, 120);
    toon(ctx, p, { cx: px, cy: gy - 58, r: 30, c: ['#d9884e', '#b0603a', '#8a4428'], shade: '#7a3624', lw: 2, ink: '#3a2430', sd: 0.12 });
    ctx.fillStyle = '#5a2c20'; ctx.fillRect(px - 9, gy - 6, 18, 8);
  }
  // beams
  const beam = new Path2D();
  beam.moveTo(gx - 62, gy - 120); beam.quadraticCurveTo(gx, gy - 150, gx + 62, gy - 120); beam.lineTo(gx + 62, gy - 110); beam.quadraticCurveTo(gx, gy - 138, gx - 62, gy - 110); beam.closePath();
  toon(ctx, beam, { cx: gx, cy: gy - 128, r: 40, c: ['#ffd08a', '#d98a4a', '#a8582e'], shade: '#8a4428', lw: 2.2, ink: '#3a2430', sd: 0.1 });
  const b2 = new Path2D(); b2.rect(gx - 62, gy - 100, 124, 9);
  toon(ctx, b2, { cx: gx, cy: gy - 96, r: 30, c: ['#d9884e', '#b0603a', '#8a4428'], shade: '#7a3624', lw: 2, ink: '#3a2430', sd: 0.06 });
  // emblem: round plaque with paw/fist icon
  const pl = ellP(gx, gy - 116, 15, 13, 0);
  toon(ctx, pl, { cx: gx, cy: gy - 116, r: 15, c: ['#fff2b0', '#ffd23a', '#e09a1c'], shade: '#d08818', lw: 2, ink: '#3a2430' });
  ctx.fillStyle = '#7a3624'; ctx.beginPath(); ctx.arc(gx, gy - 113, 4.6, 0, TAU); ctx.fill();
  for (const k of [-1, 0, 1]) { ctx.beginPath(); ctx.arc(gx + k * 4.8, gy - 120, 2.2, 0, TAU); ctx.fill(); }
  // lanterns
  for (const lx of [gx - 30, gx, gx + 30]) lantern(ctx, lx, gy - 76 + (lx === gx ? 4 : 0), 7.5);
  // pennant strings
  pennants(ctx, gx - 60, gy - 122, -10, 252, 26, 9, rnd, 11);
  pennants(ctx, gx + 60, gy - 122, 400, 246, 26, 9, rnd, 11);
  pennants(ctx, -10, 150, 400, 138, 40, 16, rnd, 13);
}

// ---------- arena ----------
function arena(ctx, cx, cy, rx, ry, rnd) {
  // platform side (extrusion)
  ctx.save();
  ctx.fillStyle = 'rgba(40,80,30,0.35)'; ctx.beginPath(); ctx.ellipse(cx + 10, cy + 28, rx + 10, ry + 8, 0, 0, TAU); ctx.fill();
  const side = new Path2D(); side.ellipse(cx, cy + 18, rx, ry, 0, 0, PI); side.lineTo(cx - rx, cy); side.ellipse(cx, cy, rx, ry, 0, PI, 0, true); side.closePath();
  let g = ctx.createLinearGradient(cx - rx, 0, cx + rx, 0); g.addColorStop(0, '#c07a44'); g.addColorStop(1, '#7a3e26');
  ctx.fillStyle = g; ctx.fill(side);
  // side strata strokes
  ctx.save(); ctx.clip(side); ctx.strokeStyle = 'rgba(80,30,20,0.35)'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 26; i++) { const t = rnd() * PI, x = cx + Math.cos(t) * rx, y = cy + Math.sin(t) * ry + 6 + rnd() * 8; ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x + 6, y + 1); ctx.stroke(); }
  ctx.restore();
  ctx.strokeStyle = INK; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.ellipse(cx, cy + 18, rx, ry, 0, 0, PI); ctx.stroke();
  // top surface
  const top = ellP(cx, cy, rx, ry, 0);
  g = ctx.createRadialGradient(cx - rx * 0.35, cy - ry * 0.5, 20, cx, cy, rx * 1.1);
  g.addColorStop(0, '#fbe6b4'); g.addColorStop(0.55, '#ecc888'); g.addColorStop(1, '#cf9a5e');
  ctx.fillStyle = g; ctx.fill(top);
  ctx.save(); ctx.clip(top);
  // sand texture
  for (let i = 0; i < 1600; i++) {
    const x = cx + (rnd() - 0.5) * rx * 2, y = cy + (rnd() - 0.5) * ry * 2;
    ctx.fillStyle = rnd() < 0.5 ? 'rgba(150,90,40,0.22)' : 'rgba(255,250,225,0.35)';
    ctx.fillRect(x, y, 1 + rnd(), 1);
  }
  // swept arcs / scuff marks
  ctx.lineCap = 'round';
  for (let i = 0; i < 22; i++) {
    const x = cx + (rnd() - 0.5) * rx * 1.5, y = cy + (rnd() - 0.5) * ry * 1.5, l = 10 + rnd() * 22;
    ctx.strokeStyle = 'rgba(170,110,60,0.25)'; ctx.lineWidth = 1.5 + rnd() * 2;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + l * 0.5, y - 4, x + l, y + 1); ctx.stroke();
  }
  // inner chalk circle
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 3;
  ctx.setLineDash([22, 4, 9, 3]);
  ctx.beginPath(); ctx.ellipse(cx, cy, rx * 0.8, ry * 0.8, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  // shading toward front-right edge (crisp cel band)
  const band = new Path2D(); band.rect(cx - rx * 2, cy - ry * 2, rx * 4, ry * 4); band.addPath(ellP(cx - 14, cy - 12, rx, ry, 0));
  ctx.fillStyle = 'rgba(170,100,50,0.28)'; ctx.fill(band, 'evenodd');
  ctx.restore();
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke(top);
  ctx.restore();
  // braided straw rope
  const rrx = rx - 10, rry = ry - 9, n = 150;
  // rope base tube
  ctx.save();
  ctx.strokeStyle = INK; ctx.lineWidth = 15; ctx.beginPath(); ctx.ellipse(cx + 0.8, cy + 1.6, rrx, rry, 0, 0, TAU); ctx.stroke();
  ctx.strokeStyle = '#c9963a'; ctx.lineWidth = 11; ctx.beginPath(); ctx.ellipse(cx, cy, rrx, rry, 0, 0, TAU); ctx.stroke();
  for (let i = 0; i < n; i++) {
    const t = i / n * TAU, x = cx + Math.cos(t) * rrx, y = cy + Math.sin(t) * rry;
    const tx = -Math.sin(t) * rrx, ty = Math.cos(t) * rry, a = Math.atan2(ty, tx);
    const lightD = -(Math.cos(t) * LX + Math.sin(t) * LY * 0.6); // inner side faces light? approximate
    ctx.save(); ctx.translate(x, y); ctx.rotate(a + 0.75);
    const gg = ctx.createLinearGradient(0, -5, 0, 5);
    gg.addColorStop(0, '#fff2b8'); gg.addColorStop(0.45, '#f2cf6a'); gg.addColorStop(1, '#a8742a');
    ctx.fillStyle = gg; ctx.strokeStyle = 'rgba(90,50,20,0.85)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(0, 0, 6.2, 3.4, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  // tassels/knots at four points
  for (const t of [0, PI]) {
    const x = cx + Math.cos(t) * rrx, y = cy + Math.sin(t) * rry;
    if (y > 840 || x < -10 || x > 400) continue;
    toon(ctx, ellP(x, y, 9, 7, 0), { cx: x, cy: y, r: 9, c: ['#ffef9a', '#e8343f', '#a81c34'], shade: '#a81c34', lw: 2 });
  }
  // shade over the far-right rope portion
  ctx.restore();
}

// ---------- HUD ----------
function heart(ctx, x, y, s) {
  const p = new Path2D();
  p.moveTo(x, y + s * 0.35);
  p.bezierCurveTo(x - s * 0.9, y - s * 0.25, x - s * 0.45, y - s * 0.95, x, y - s * 0.45);
  p.bezierCurveTo(x + s * 0.45, y - s * 0.95, x + s * 0.9, y - s * 0.25, x, y + s * 0.35);
  p.closePath();
  const p2 = xf(p, M().translate(x, y - s * 0.2).scale(1.0).translate(-x, -y + s * 0.2));
  toon(ctx, p2, { cx: x, cy: y - s * 0.25, r: s * 0.6, c: ['#ffb0b8', '#ff4058', '#d01e3c'], shade: '#c01838', deep: '#8a1030', rim: '#ffc0c8', lw: 2.4 });
  spec(ctx, x - s * 0.3, y - s * 0.55, s * 0.14, s * 0.09, -0.6, 1);
}
function hud(ctx, W, H, rnd) {
  const y = 66;
  // backing pill for hearts
  const pill = (x, yy, w, h) => { const p = new Path2D(); p.roundRect(x, yy, w, h, h / 2); return p; };
  ctx.save();
  let p = pill(10, y - 17, 92, 32);
  ctx.fillStyle = 'rgba(42,22,48,0.55)'; ctx.fill(p); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.5; ctx.stroke(p);
  ctx.restore();
  for (let i = 0; i < 3; i++) heart(ctx, 30 + i * 27, y + 2, 21);
  // stage plate (wood plank w/ rope ends)
  const sp = new Path2D(); sp.roundRect(163, y - 17, 64, 32, 9);
  toon(ctx, sp, { cx: 195, cy: y, r: 34, c: ['#ffd89a', '#d99350', '#a86230'], shade: '#9a5a2c', rim: '#ffe0a0', lw: 2.6, sd: 0.12, dd: 0.05 });
  ctx.save();
  ctx.font = '900 20px "Inter", "Inter Display", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round'; ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.strokeText('1-1', 195, y + 1);
  ctx.fillStyle = '#fff7e0'; ctx.fillText('1-1', 195, y + 1);
  ctx.restore();
  // nails
  ctx.fillStyle = '#5a3020'; for (const nx of [170, 220]) { ctx.beginPath(); ctx.arc(nx, y - 9, 1.8, 0, TAU); ctx.fill(); }
  // stars
  p = pill(282, y - 17, 98, 32);
  ctx.fillStyle = 'rgba(42,22,48,0.55)'; ctx.fill(p); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.5; ctx.stroke(p);
  for (let i = 0; i < 3; i++) {
    const sx = 302 + i * 29, sy = y - (i === 1 ? 2 : 0);
    const s = star5P(sx, sy, 12.5, 0, 0.5);
    ctx.save(); ctx.lineJoin = 'round';
    ctx.fillStyle = INK; ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.stroke(s);
    ctx.fillStyle = '#5a4868'; ctx.fill(s);
    ctx.clip(s); ctx.fillStyle = '#3a2a48'; ctx.fill(shift(s, 0, 4)); ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1; ctx.stroke(star5P(sx, sy, 8, 0, 0.5));
  }
}

function chargeRing(ctx, x, y, rx, ry, frac) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(6,56,74,0.75)'; ctx.lineWidth = 8; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.stroke();
  ctx.shadowColor = '#2ffff0'; ctx.shadowBlur = 12;
  ctx.strokeStyle = '#3ff7e8'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, -PI / 2, -PI / 2 + TAU * frac); ctx.stroke();
  ctx.shadowBlur = 0; ctx.strokeStyle = '#e8fffd'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, -PI / 2, -PI / 2 + TAU * frac); ctx.stroke();
  // ticks
  ctx.strokeStyle = 'rgba(6,56,74,0.9)'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 12; i++) { const a = -PI / 2 + i * TAU / 12; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * (rx - 3), y + Math.sin(a) * (ry - 2)); ctx.lineTo(x + Math.cos(a) * (rx + 3), y + Math.sin(a) * (ry + 2)); ctx.stroke(); }
  // head pip
  const a = -PI / 2 + TAU * frac;
  ctx.fillStyle = '#fff'; ctx.shadowColor = '#2ffff0'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(x + Math.cos(a) * rx, y + Math.sin(a) * ry, 4, 0, TAU); ctx.fill();
  ctx.restore();
}

// ---------- main ----------
function layer(W, H) {
  const c = document.createElement('canvas'); c.width = W * 2; c.height = H * 2;
  const x = c.getContext('2d'); x.scale(2, 2); return [c, x];
}

function godRays(ctx, W, H) {
  ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.filter = 'blur(10px)';
  const rays = [[0.1, 0.06], [0.24, 0.05], [0.4, 0.08], [0.58, 0.05], [0.75, 0.07]];
  for (const [a, w] of rays) {
    const g = ctx.createLinearGradient(-30, -30, W * 0.7, H * 0.7);
    g.addColorStop(0, 'rgba(255,240,190,0.38)'); g.addColorStop(1, 'rgba(255,240,190,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-40, -40);
    ctx.lineTo(Math.cos(a) * 1200 - 40, Math.sin(a) * 1200 - 40);
    ctx.lineTo(Math.cos(a + w) * 1200 - 40, Math.sin(a + w) * 1200 - 40); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

function fgGrass(ctx, x, y, s, flip, rnd) {
  ctx.save(); ctx.filter = 'blur(2.5px)'; ctx.translate(x, y); ctx.scale(flip ? -1 : 1, 1);
  for (let i = 0; i < 14; i++) {
    const bx = i * 5 * s / 10 + rnd() * 6, h = (40 + rnd() * 50) * s / 10, lean = (10 + rnd() * 30) * s / 10;
    ctx.fillStyle = i % 2 ? '#2f7a34' : '#4a9a3a';
    ctx.beginPath(); ctx.moveTo(bx - 4, 10); ctx.quadraticCurveTo(bx + lean * 0.3, -h * 0.5, bx + lean, -h); ctx.quadraticCurveTo(bx + lean * 0.2, -h * 0.45, bx + 5, 10); ctx.fill();
  }
  ctx.restore();
}

function paint(ctx, W, H, rand) {
  const rnd = rand;
  // background on its own layer -> slight depth-of-field blur
  const [bgc, bgx] = layer(W, H);
  background(bgx, W, H, rnd);
  ctx.save(); ctx.filter = 'blur(0.9px)'; ctx.drawImage(bgc, 0, 0, W, H); ctx.restore();
  // haze over the far part so the arena pops
  let g = ctx.createLinearGradient(0, 180, 0, 400);
  g.addColorStop(0, 'rgba(220,240,255,0.0)'); g.addColorStop(0.6, 'rgba(230,245,255,0.18)'); g.addColorStop(1, 'rgba(230,245,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 180, W, 220);

  const ACX = 195, ACY = 612, ARX = 232, ARY = 190;
  arena(ctx, ACX, ACY, ARX, ARY, rnd);

  const BX = 92, BY = 488; // burst point (abandoned body)
  const T = { x: 210, y: 660 }; // target slime ground point
  chargeRing(ctx, T.x, T.y + 2, 52, 21, 0.72);

  const items = [
    { y: 560, f: () => bear(ctx, 304, 568, rnd) },
    { y: T.y, f: () => slime(ctx, { x: T.x, y: T.y, w: 70, h: 52, pal: 'lime', sq: 0.13, eyes: 'teal', mouth: 'grin', possessed: true, lw: 3 }) },
    { y: 730, f: () => slime(ctx, { x: 92, y: 732, w: 56, pal: 'coral', eyes: 'angry', mouth: 'grit', look: 0.6, rot: 0.08 }) },
    { y: 716, f: () => slime(ctx, { x: 322, y: 716, w: 60, pal: 'green', eyes: 'angry', mouth: 'grit', look: -0.7, rot: -0.1 }) },
    { y: 792, f: () => slime(ctx, { x: 236, y: 794, w: 46, pal: 'yellow', eyes: 'normal', mouth: 'o', look: -0.3, air: 6, rot: -0.05 }) },
  ];
  items.sort((a, b) => a.y - b.y).forEach((it) => it.f());

  // scuffle dust
  ctx.save();
  for (const [dx, dy] of [[160, 748], [268, 730], [246, 592]]) {
    for (let i = 0; i < 4; i++) {
      const x = dx + (rnd() - 0.5) * 20, y = dy + (rnd() - 0.5) * 8, r = 5 + rnd() * 6;
      ctx.fillStyle = 'rgba(255,245,220,0.92)'; ctx.strokeStyle = 'rgba(160,110,70,0.85)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.stroke();
    }
  }
  ctx.restore();

  burst(ctx, BX, BY, rnd);
  // flung slimes (drawn over the burst so their silhouettes read)
  slime(ctx, { x: 40, y: 452, w: 46, pal: 'orange', air: 46, rot: -0.75, eyes: 'swirl', mouth: 'o', sq: 0.04 });
  slime(ctx, { x: 126, y: 652, w: 44, pal: 'yellow', air: 12, rot: 0.45, eyes: 'swirl', mouth: 'wobble', sq: -0.06 });
  slime(ctx, { x: 40, y: 598, w: 48, pal: 'green', air: 22, rot: -0.5, eyes: 'x', mouth: 'o' });
  dizzyStars(ctx, 28, 384, 16);
  dizzyStars(ctx, 140, 596, 13);
  dizzyStars(ctx, 28, 544, 14);

  // trail & ghost
  const P = [[BX + 4, BY - 18], [60, 330], [120, 300], [209, 606]];
  trail(ctx, P, rnd);
  // impact splash on slime top
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const ix = 210, iy = 618;
  g = ctx.createRadialGradient(ix, iy, 0, ix, iy, 44); g.addColorStop(0, 'rgba(220,255,252,0.95)'); g.addColorStop(0.4, 'rgba(60,255,235,0.5)'); g.addColorStop(1, 'rgba(0,200,220,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ix, iy, 44, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.save(); ctx.strokeStyle = '#bffff8'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  for (let i = 0; i < 9; i++) { const a = PI + i * PI / 8; ctx.beginPath(); ctx.moveTo(ix + Math.cos(a) * 30, iy + Math.sin(a) * 13); ctx.lineTo(ix + Math.cos(a) * 44, iy + Math.sin(a) * 20); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(ix, iy + 2, 32, 10, 0, 0, TAU); ctx.stroke();
  ctx.restore();
  ghost(ctx, 201, 592, 25, Math.atan2(P[3][1] - P[2][1], P[3][0] - P[2][0]));

  // speed lines along the dive
  ctx.save(); ctx.lineCap = 'round';
  for (let i = 0; i < 10; i++) {
    const x = 140 + rnd() * 110, y = 430 + rnd() * 110, l = 18 + rnd() * 28;
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1 + rnd() * 1.6;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + l * 0.17, y + l); ctx.stroke();
  }
  ctx.restore();

  // SFX
  ctx.save(); ctx.translate(112, 404); ctx.rotate(-0.2);
  ctx.font = '900 36px "WenQuanYi Zen Hei", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 11; ctx.strokeStyle = INK; ctx.strokeText('펑!', 2, 3);
  ctx.lineWidth = 8; ctx.strokeText('펑!', 0, 0);
  g = ctx.createLinearGradient(0, -16, 0, 16); g.addColorStop(0, '#fffbe0'); g.addColorStop(0.5, '#ffd23a'); g.addColorStop(1, '#ff7a2a');
  ctx.fillStyle = g; ctx.fillText('펑!', 0, 0);
  ctx.restore();

  godRays(ctx, W, H);
  // foreground framing (out of focus)
  fgGrass(ctx, -10, 850, 12, false, rnd);
  fgGrass(ctx, 400, 852, 11, true, rnd);

  // ---- global grade ----
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, 'rgba(255,220,150,0.6)'); g.addColorStop(1, 'rgba(60,40,120,0.5)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'multiply';
  g = ctx.createRadialGradient(W * 0.45, H * 0.6, H * 0.3, W * 0.5, H * 0.55, H * 0.75);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(90,60,110,0.55)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // final punch: saturation / contrast
  const [cc, cx2] = layer(W, H);
  cx2.setTransform(1, 0, 0, 1, 0, 0); cx2.drawImage(ctx.canvas, 0, 0);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.filter = 'saturate(1.15) contrast(1.06)'; ctx.drawImage(cc, 0, 0); ctx.restore();

  // glint on the raised rock fist (anticipation)
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  sparkle(ctx, 372, 424, 11, 'rgba(255,255,240,0.95)'); sparkle(ctx, 372, 424, 5, '#fff');
  ctx.restore();

  hud(ctx, W, H, rnd);
}
