/* Take Your Time — the small things the concept painting is full of: stone laid in courses, ivy,
   roof tiles, iron lanterns with a scroll on the bracket, floorboards, a jar of flowers on a sill.
   Only the painted look (T.artOn) asks for them; the crayon look stays plain on purpose. */
(function () {
  'use strict';
  const T = window.TYT, P = T.P;
  const D = (T.detail = {});
  D.on = () => !!(T.artOn && T.artOn());

  /* stone in courses inside a rectangle; the mortar is whatever is already painted under it */
  D.masonry = function (g, x, y, w, h, seed, o = {}) {
    const r = T.rng(seed), rowH = o.rowH || 12, base = o.c || '#b9ad9c';
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    g.fillStyle = o.mortar || T.shade(base, -0.22); g.fillRect(x, y, w, h);
    for (let yy = y, row = 0; yy < y + h; yy += rowH, row++) {
      let xx = x - (row % 2 ? rowH * 0.9 : 0) - r() * 6;
      while (xx < x + w) {
        const bw = rowH * (1.3 + r() * 1.5);
        P.fill(g, P.rr(xx + 1.2, yy + 1.2, bw - 2.4, rowH - 2.4, Math.min(3, rowH * 0.25)), T.shade(base, (r() - 0.5) * 0.18));
        g.fillStyle = 'rgba(255,242,222,0.2)'; g.fillRect(xx + 2.5, yy + 1.5, bw - 5, Math.max(1, rowH * 0.14));
        if (r() < 0.12) { g.fillStyle = 'rgba(90,120,80,0.28)'; g.fillRect(xx + 2, yy + rowH - 4, bw * 0.5, 2.4); }   /* a little moss */
        xx += bw;
      }
    }
    g.restore();
  };
  /* where the plaster has come away and the stone shows: a soft patch of masonry */
  D.patch = function (g, cx, cy, rw, rh, seed, c) {
    const r = T.rng(seed), pts = [];
    for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2, k = 0.7 + r() * 0.45; pts.push([cx + Math.cos(a) * rw * k, cy + Math.sin(a) * rh * k]); }
    const blob = P.soft(pts);
    g.save(); g.clip(blob);
    D.masonry(g, cx - rw * 1.3, cy - rh * 1.3, rw * 2.6, rh * 2.6, seed + 3, { rowH: 10, c });
    g.restore();
    g.save(); g.strokeStyle = 'rgba(80,64,70,0.25)'; g.lineWidth = 1.6; g.stroke(blob); g.restore();
  };
  /* quoins: the big corner stones, alternately long and short */
  D.quoins = function (g, x, top, bottom, seed, c, side) {
    const r = T.rng(seed);
    for (let y = bottom - 4, i = 0; y > top + 10; y -= 20, i++) {
      const bw = i % 2 ? 16 : 26, bx = side < 0 ? x : x - bw;
      P.fill(g, P.rr(bx, y - 18, bw, 17, 2.5), T.shade(c, (r() - 0.5) * 0.12));
      g.fillStyle = 'rgba(255,242,222,0.22)'; g.fillRect(bx + 2, y - 17, bw - 4, 2);
    }
  };
  /* ivy, from the foot of a wall up toward the eaves */
  D.ivy = function (g, x, y0, h, seed, spread) {
    const r = T.rng(seed), sp = spread || 40;
    const leaf = (lx, ly, s, a, c) => { g.save(); g.translate(lx, ly); g.rotate(a); P.fill(g, P.ellipse(0, -s * 0.5, s * 0.55, s * 0.62), c); P.fill(g, P.ellipse(-s * 0.42, -s * 0.15, s * 0.42, s * 0.36, -0.6), c); P.fill(g, P.ellipse(s * 0.42, -s * 0.15, s * 0.42, s * 0.36, 0.6), c); g.restore(); };
    for (let v = 0; v < 3; v++) {
      const pts = []; let px = x + (r() - 0.5) * 10;
      for (let k = 0; k <= 10; k++) { pts.push([px, y0 - (h * k) / 10]); px += (r() - 0.5) * sp * 0.35 + (v - 1) * sp * 0.05; }
      g.strokeStyle = '#5a5a3e'; g.lineWidth = 1.6; g.lineCap = 'round'; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
      for (let k = 1; k < pts.length; k++) g.lineTo(pts[k][0], pts[k][1]);
      g.stroke();
      for (let k = 0; k < 34; k++) {
        const q = pts[Math.floor(r() * pts.length)], s = 5 + r() * 5;
        leaf(q[0] + (r() - 0.5) * sp * 0.5, q[1] + (r() - 0.5) * 14, s, (r() - 0.5) * 1.8, ['#3f6648', '#557d55', '#6b9a5e', '#4e7a52'][Math.floor(r() * 4)]);
      }
    }
  };
  /* roof tiles: seams between the courses, a few tiles a shade off */
  D.tiles = function (g, clip, x0, x1, top, bottom, seed) {
    const r = T.rng(seed);
    g.save(); g.clip(clip);
    for (let y = top + 16, row = 0; y < bottom; y += 16, row++) {
      for (let x = x0 - 20 + (row % 2) * 11; x < x1 + 20; x += 22) {
        g.fillStyle = 'rgba(40,30,50,0.14)'; g.fillRect(x, y - 15, 1.6, 13);
        if (r() < 0.1) { g.fillStyle = r() < 0.5 ? 'rgba(255,230,200,0.14)' : 'rgba(50,30,60,0.12)'; g.fillRect(x + 1.6, y - 15, 20, 14); }
        g.fillStyle = 'rgba(255,236,214,0.12)'; g.fillRect(x + 2, y - 3, 18, 1.4);
      }
    }
    g.restore();
  };
  /* boards: a floor or a worktop, seams and grain */
  D.boards = function (g, x, y, w, h, seed, o = {}) {
    const r = T.rng(seed), bh = o.bh || 22;
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    for (let yy = y, row = 0; yy < y + h; yy += bh, row++) {
      g.fillStyle = 'rgba(60,36,20,0.22)'; g.fillRect(x, yy, w, 1.6);
      for (let xx = x - r() * 200; xx < x + w; xx += 160 + r() * 180) { g.fillStyle = 'rgba(60,36,20,0.18)'; g.fillRect(xx, yy, 1.6, bh); }
      g.strokeStyle = 'rgba(70,44,24,0.1)'; g.lineWidth = 1;
      for (let k = 0; k < 3; k++) { const gy = yy + 5 + k * (bh - 8) / 3 + r() * 3; g.beginPath(); g.moveTo(x, gy); for (let xx = x; xx < x + w; xx += 60) g.lineTo(xx, gy + Math.sin(xx * 0.02 + row + k) * 1.4); g.stroke(); }
      g.fillStyle = 'rgba(255,236,206,0.08)'; g.fillRect(x, yy + 2, w, 2);
    }
    g.restore();
  };
  /* a jar of wildflowers */
  D.flowers = function (g, x, y, s, seed) {
    const r = T.rng(seed);
    g.save(); g.translate(x, y); g.scale(s, s);
    for (let i = 0; i < 7; i++) {
      const a = -0.6 + (i / 6) * 1.2 + (r() - 0.5) * 0.2, len = 34 + r() * 18, ex = Math.sin(a) * len, ey = -Math.cos(a) * len - 14;
      g.strokeStyle = '#6a8f5a'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(0, -10); g.quadraticCurveTo(ex * 0.3, ey * 0.6, ex, ey); g.stroke();
      const c = ['#e58aa0', '#f6f0e0', '#f1c04a', '#b48ab0', '#f6b6c2'][i % 5];
      for (let p = 0; p < 5; p++) { const pa = (p / 5) * Math.PI * 2; P.fill(g, P.circle(ex + Math.cos(pa) * 3.6, ey + Math.sin(pa) * 3.6, 3.2), c); }
      P.fill(g, P.circle(ex, ey, 2.2), '#d7a23c');
    }
    P.fill(g, P.rr(-11, -14, 22, 26, 6), 'rgba(214,236,240,0.75)');
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(-7, -10, 3, 16);
    g.restore();
  };
  /* books on their side */
  D.books = function (g, x, y, n, seed) {
    const r = T.rng(seed);
    for (let i = 0, yy = y; i < n; i++) { const bw = 46 + r() * 16, bh = 8 + r() * 4; P.fill(g, P.rr(x - bw / 2 + (r() - 0.5) * 6, yy - bh, bw, bh, 2), ['#7a5a8a', '#c9573f', '#3f6f9a', '#d7a23c', '#5f8f62'][Math.floor(r() * 5)]); g.fillStyle = 'rgba(255,246,228,0.6)'; g.fillRect(x - bw / 2 + 4, yy - bh + 2, bw - 10, 1.5); yy -= bh; }
  };
  /* bundles of drying herbs, hung upside down */
  D.herbs = function (g, x, y, n, seed) {
    const r = T.rng(seed);
    for (let i = 0; i < n; i++) {
      const hx = x + i * 30, len = 34 + r() * 14;
      P.line(g, hx, y, hx, y + 10, 1.4, '#8a6a4a');
      P.fill(g, P.rr(hx - 4, y + 8, 8, 6, 2), '#c9a878');
      for (let k = 0; k < 9; k++) { const a = Math.PI / 2 + (r() - 0.5) * 0.7; g.strokeStyle = ['#6f8f5a', '#8aa06a', '#a3a36a'][k % 3]; g.lineWidth = 2.2; g.beginPath(); g.moveTo(hx, y + 12); g.lineTo(hx + Math.cos(a) * len, y + 12 + Math.sin(a) * len); g.stroke(); }
    }
  };
  /* a round wall clock */
  D.clock = function (g, x, y, rad, hh, mm) {
    P.fill(g, P.circle(x, y, rad + 5), '#8a7a6a'); P.fill(g, P.circle(x, y, rad), '#f6f0e2');
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; P.line(g, x + Math.cos(a) * rad * 0.78, y + Math.sin(a) * rad * 0.78, x + Math.cos(a) * rad * 0.9, y + Math.sin(a) * rad * 0.9, 1.6, '#6b5a5a'); }
    const ha = ((hh % 12) / 12 + mm / 720) * Math.PI * 2 - Math.PI / 2, ma = (mm / 60) * Math.PI * 2 - Math.PI / 2;
    P.line(g, x, y, x + Math.cos(ha) * rad * 0.5, y + Math.sin(ha) * rad * 0.5, 2.6, '#3d3a5c');
    P.line(g, x, y, x + Math.cos(ma) * rad * 0.74, y + Math.sin(ma) * rad * 0.74, 1.8, '#3d3a5c');
  };
  /* a wooden bench, as in the painting, looking out over the cloud sea */
  D.bench = function (g, x, y, s, flip) {
    g.save(); g.translate(x, y); g.scale(flip ? -s : s, s);
    const W0 = '#8a6440', W1 = '#a77b52', W2 = '#c49a6c';
    [[-50, 0], [44, 0]].forEach((q) => { P.fill(g, P.rr(q[0], -30, 8, 30, 2), W0); P.fill(g, P.rr(q[0] + 2, -66, 6, 36, 2), W0); });
    for (let i = 0; i < 2; i++) { P.fill(g, P.rr(-62, -34 + i * 7, 124, 6, 2), i ? W1 : W2); }
    for (let i = 0; i < 2; i++) { P.fill(g, P.rr(-60, -64 + i * 12, 120, 8, 2), i ? W1 : W2); g.fillStyle = 'rgba(60,36,20,0.18)'; g.fillRect(-56, -60 + i * 12, 112, 1); }
    g.fillStyle = 'rgba(255,236,206,0.25)'; g.fillRect(-60, -34, 120, 1.5);
    g.restore();
  };
  /* a mailbox on a post */
  D.mailbox = function (g, x, y, s) {
    g.save(); g.translate(x, y); g.scale(s, s);
    P.fill(g, P.rr(-4, -64, 8, 64, 2), '#7d5a3b');
    const box = new Path2D(); box.moveTo(-18, -62); box.lineTo(-18, -84); box.arc(0, -84, 18, Math.PI, 0); box.lineTo(18, -62); box.closePath();
    g.fillStyle = '#6f5a6a'; g.fill(box); g.fillStyle = 'rgba(255,240,220,0.18)'; g.fillRect(-14, -96, 4, 30);
    P.fill(g, P.rr(-12, -78, 24, 4, 2), '#4a3d4a');
    P.line(g, 18, -80, 18, -100, 2.4, '#4a3d4a'); P.fill(g, P.rr(18, -100, 12, 7, 1), '#c9573f');
    g.restore();
  };
  /* an iron lantern on a post with a scrolled bracket, as in the painting */
  D.lantern = function (g, x, y, t, o, s, lit, fl) {
    const IRON = '#433a4c', bare = o.bare;
    if (!bare) {
      P.fill(g, P.rr(x - 6 * s, y - 7 * s, 12 * s, 7 * s, 2 * s), IRON);
      P.line(g, x, y, x, y - 96 * s, 4 * s, IRON);
      P.fill(g, P.circle(x, y - 98 * s, 3.4 * s), IRON);
      g.strokeStyle = IRON; g.lineCap = 'round'; g.lineWidth = 3 * s;
      g.beginPath(); g.moveTo(x, y - 92 * s); g.quadraticCurveTo(x + 12 * s, y - 100 * s, x + 20 * s, y - 92 * s); g.stroke();
      g.lineWidth = 2 * s; g.beginPath(); g.moveTo(x, y - 78 * s); g.bezierCurveTo(x + 12 * s, y - 78 * s, x + 14 * s, y - 90 * s, x + 7 * s, y - 89 * s); g.stroke();
    }
    const lx = bare ? x : x + 20 * s, ly = bare ? y : y - 84 * s;
    if (lit > 0.01) P.glow(g, lx, ly + 12 * s, 60 * s * fl, '#ffd98a', 0.64 * lit);
    P.line(g, lx, ly - 10 * s, lx, ly - 2 * s, 1.6 * s, IRON);
    const glass = P.poly([[lx - 9 * s, ly + 2 * s], [lx + 9 * s, ly + 2 * s], [lx + 7 * s, ly + 22 * s], [lx - 7 * s, ly + 22 * s]]);
    P.fill(g, glass, T.mix('#b9a98c', '#fff0b8', lit));
    if (lit > 0.01) P.glow(g, lx, ly + 12 * s, 9 * s, '#fffbe8', 0.8 * lit);
    P.line(g, lx, ly + 2 * s, lx, ly + 22 * s, 1.2 * s, IRON);
    P.fill(g, P.poly([[lx - 12 * s, ly + 3 * s], [lx, ly - 7 * s], [lx + 12 * s, ly + 3 * s]]), IRON);
    P.fill(g, P.circle(lx, ly - 8 * s, 2 * s), IRON);
    P.fill(g, P.rr(lx - 9 * s, ly + 21 * s, 18 * s, 4 * s, 2 * s), IRON);
    P.fill(g, P.poly([[lx - 3 * s, ly + 25 * s], [lx + 3 * s, ly + 25 * s], [lx, ly + 30 * s]]), IRON);
    void t;
    return [lx, ly + 12 * s];
  };

  /* ---------- the seasons on the hill (src/look.js: T.season.paint gives sz = { s, f, c }) ---------- */
  const SNOW = '#f6f5f7', SNOW_S = '#c6cede';
  /* a tree in its season: blossom in spring, full in summer, turning and thinning in autumn, bare (and snowed on)
     in winter. Same shape as the town's trees (T.town.tree), drawn live. seed: which way it turns, whether it blossoms */
  D.tree = function (g, x, y, s, c, c2, trunk, sway, seed, sz) {
    const f = sz.f, w = (sway || 0) * 4, tr = trunk || '#6b4f52', leaves = f.leaves;
    const tx = x + w * 0.3, ty = y - 48 * s;
    P.line(g, x, y + 3, tx, ty, 7 * s, tr);
    if (leaves < 0.98) {   /* the branches that the leaves hide in summer */
      g.strokeStyle = tr; g.lineCap = 'round';
      for (let i = 0; i < 5; i++) {
        const a = -1.15 + i * 0.58 + T.noise(i * 1.9, seed) * 0.16, len = (44 + T.noise(i * 2.7, seed + 3) * 14) * s, k = i === 2 ? 1.1 : 1;
        const bx = tx + Math.sin(a) * len * k + w * 0.9, by = ty + 6 * s - Math.cos(a) * len * k;
        const mx = tx + Math.sin(a) * len * 0.45 + w * 0.4, my = ty + 4 * s - Math.cos(a) * len * 0.6;
        g.lineWidth = 3.4 * s; g.beginPath(); g.moveTo(tx, ty + 6 * s); g.quadraticCurveTo(mx, my, bx, by); g.stroke();
        const tw = a + (i % 2 ? 0.55 : -0.55), tl = len * 0.42, sx = T.lerp(tx, bx, 0.6), sy = T.lerp(ty, by, 0.6);
        g.lineWidth = 1.8 * s; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + Math.sin(tw) * tl, sy - Math.cos(tw) * tl); g.stroke();
        if (f.snow > 0.02 && leaves < 0.3) { g.save(); g.globalAlpha *= f.snow * 0.95; g.strokeStyle = SNOW; g.lineWidth = 2.6 * s; g.beginPath(); g.moveTo(T.lerp(tx, mx, 0.7), T.lerp(ty, my, 0.7) - 2 * s); g.quadraticCurveTo(mx, my - 2.5 * s, T.lerp(mx, bx, 0.7), T.lerp(my, by, 0.7) - 2 * s); g.stroke(); g.restore(); }
      }
    }
    if (leaves > 0.01) {
      const col = T.season.leaf(c, seed, sz), k = 0.62 + 0.38 * leaves;
      g.save(); g.globalAlpha *= Math.min(1, leaves * 1.5);
      P.fill(g, P.ellipse(x + w, y - 84 * s, 40 * s * k, 46 * s * k), col);
      P.fill(g, P.ellipse(x - 20 * s + w * 0.8, y - 66 * s, 25 * s * k, 27 * s * k), c2 && f.turn < 0.05 && f.fresh < 0.05 ? c2 : T.shade(col, -0.1));
      P.fill(g, P.ellipse(x + 16 * s + w * 1.1, y - 104 * s, 22 * s * k, 22 * s * k), T.shade(col, 0.12));
      g.restore();
      if (f.snow > 0.02) { g.save(); g.globalAlpha *= f.snow * 0.9; P.fill(g, P.ellipse(x + w * 1.05, y - 120 * s * k - 8 * s, 30 * s * k, 9 * s), SNOW); P.fill(g, P.ellipse(x + 16 * s + w * 1.1, y - 122 * s, 15 * s * k, 6 * s), SNOW); g.restore(); }
    }
    /* blossom on every other tree in spring, a few flowers on the rest */
    const bl = f.blossom * (seed % 2 ? 0.35 : 1);
    if (bl > 0.03) {
      const n = Math.round(34 * bl);
      for (let c = 0; c < 3; c++) {   /* one path for each of the three pinks */
        g.beginPath();
        for (let i = c; i < n; i += 3) {
          const px = x + w + T.noise(i * 1.31, seed + 7) * 40 * s, py = y - 86 * s + T.noise(i * 1.73, seed + 11) * 44 * s, r = (1.5 + c * 0.6) * s;
          const rot = i * 0.7;
          g.moveTo(px + Math.cos(rot) * r * 1.25, py + Math.sin(rot) * r * 1.25); g.ellipse(px, py, r * 1.25, r, rot, 0, Math.PI * 2);
        }
        g.fillStyle = T.season.BLOSSOM[c]; g.fill();
      }
    }
  };
  /* a bush in its season: roses in summer, hips in autumn, snow in winter */
  D.bush = function (g, x, y, s, c, dots, sz) {
    const f = sz.f;
    let col = c;
    if (f.turn > 0.02) col = T.mix(col, '#9a8a4c', Math.round(f.turn * 0.6 * 32) / 32);
    if (f.snow > 0.02) col = T.mix(col, '#7c8a80', Math.round(f.snow * 0.6 * 32) / 32);
    if (f.fresh > 0.02) col = T.mix(col, '#8cc47a', Math.round(f.fresh * 0.3 * 32) / 32);
    const bloom = dots ? T.clamp(f.flowers * 1.2) : 0, hips = dots ? f.turn * (1 - f.snow) : 0;
    T.town.bush(g, x, y, s, col, null);
    if (bloom > 0.05 || hips > 0.05) {
      for (let i = 0; i < 9; i++) {
        if ((i + 1) / 9 > Math.max(bloom, hips * 0.6)) break;
        const px = x - 22 * s + (T.noise(i * 1.37, x * 0.01) * 0.5 + 0.5) * 56 * s, py = y - 6 * s - (T.noise(i * 1.91, x * 0.013 + 3) * 0.5 + 0.5) * 22 * s;
        P.fill(g, P.circle(px, py, (bloom > hips ? 4.4 : 3) * s), bloom > hips ? dots[i % dots.length] : '#b5452f');
      }
    }
    if (f.snow > 0.02) { g.save(); g.globalAlpha *= f.snow * 0.92; P.fill(g, P.ellipse(x + 2 * s, y - 28 * s, 26 * s, 8 * s), SNOW); P.fill(g, P.ellipse(x + 22 * s, y - 21 * s, 15 * s, 6 * s), SNOW); g.restore(); }
  };
  /* snow lying along a roof (spec: the house's spec; x, y: where its sprite is laid) */
  D.snowRoof = function (g, spec, x, y, snow, k) {
    if (snow < 0.02 || !spec || (spec.stage != null && spec.stage < 1)) return;
    k = k || 1;
    const rp = T.town.roofPts(spec), wh = spec.h, rh = spec.roofH;
    g.save(); g.translate(x, y); if (k !== 1) g.scale(k, k);
    g.lineJoin = 'round'; g.lineCap = 'round';
    g.beginPath(); rp.forEach((q, i) => (i ? g.lineTo(q[0], q[1] + 1) : g.moveTo(q[0] + 4, q[1] - 1)));
    g.globalAlpha = 0.55 * snow; g.strokeStyle = SNOW_S; g.lineWidth = 13; g.stroke();
    g.beginPath(); rp.forEach((q, i) => (i ? g.lineTo(q[0], q[1] - 3) : g.moveTo(q[0] + 4, q[1] - 4)));
    g.globalAlpha = 0.95 * snow; g.strokeStyle = SNOW; g.lineWidth = 10; g.stroke();
    /* a soft lip hanging over the eaves */
    const e0 = rp[0], e1 = rp[rp.length - 1];
    P.fill(g, P.ellipse(e0[0] + 6, e0[1] - 1, 12, 5), SNOW); P.fill(g, P.ellipse(e1[0] - 6, e1[1] - 1, 12, 5), SNOW);
    if (spec.chim != null) P.fill(g, P.rr(spec.chim - 17, -wh - rh * 0.62 - 56, 34, 8, 4), SNOW);
    g.restore();
  };
  /* a little snow on top of something small (a stone, a post, a seat) */
  D.snowCap = function (g, x, y, w, snow) {
    if (snow < 0.02) return;
    g.save(); g.globalAlpha *= snow * 0.92; P.fill(g, P.ellipse(x, y, w / 2, Math.max(2.5, w * 0.14)), SNOW); g.restore();
  };
  /* what falls through the air, in screen space: blossom petals, turning leaves, snow (each 0..1) */
  const AIR = 70, air = new Float32Array(AIR * 5);
  (function () { const r = T.rng(4242); for (let i = 0; i < air.length; i++) air[i] = r(); })();
  D.air = function (g, petals, leaves, snow, t) {
    const W = T.view.W;
    if (petals + leaves + snow < 0.02) return;
    g.save();
    for (let i = 0; i < AIR; i++) {
      const x0 = air[i * 5], y0 = air[i * 5 + 1], sp = 0.5 + air[i * 5 + 2], ph = air[i * 5 + 3] * 6.28, sz = 0.6 + air[i * 5 + 4] * 0.8;
      const kind = i % 3;   /* 0 petal, 1 leaf, 2 snowflake */
      const a = kind === 0 ? petals : kind === 1 ? leaves : snow;
      if (a < 0.02 || (i / AIR) > a * 1.2) continue;
      if (kind === 2) {
        const x = -W / 2 - 20 + ((x0 * (W + 40) + t * 14 * sp + Math.sin(t * 0.8 + ph) * 18) % (W + 40)), y = -20 + ((y0 * 940 + t * 38 * sp) % 940);
        g.globalAlpha = a * (0.55 + 0.35 * sz / 1.4); g.fillStyle = '#ffffff';
        g.beginPath(); g.arc(x, y, 2.2 * sz + 0.6, 0, Math.PI * 2); g.fill();
      } else {
        const x = -W / 2 - 40 + ((x0 * (W + 80) + t * (kind ? 52 : 40) * sp) % (W + 80)), y = -30 + ((y0 * 960 + t * (kind ? 46 : 30) * sp + Math.sin(t * 1.6 + ph) * 22) % 960);
        g.globalAlpha = a * 0.85;
        g.fillStyle = kind ? T.season.TURN[i % T.season.TURN.length] : T.season.BLOSSOM[i % 3];
        g.save(); g.translate(x, y); g.rotate(t * (kind ? 1.6 : 2.2) * (i % 2 ? 1 : -1) + ph); g.scale(1, 0.45 + 0.4 * Math.abs(Math.sin(t * 2.4 + ph)));
        g.beginPath(); g.ellipse(0, 0, (kind ? 7 : 5.5) * sz, (kind ? 3.6 : 3.4) * sz, 0, 0, Math.PI * 2); g.fill();
        g.restore();
      }
    }
    g.restore();
  };
})();
