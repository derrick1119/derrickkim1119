/* Welcome Harbor — the kit the town is built from: houses at every stage of being built,
   lanterns at every gate (a lit lantern means someone here is waiting), boats, trees, cloud.
   Local space for every piece: the middle of its base is (0, 0) and up is -y. */
(function () {
  'use strict';
  const T = window.TYT, P = T.P;
  const TAU = Math.PI * 2;
  const K = (T.town = {});
  const WOOD = '#dcbd8d', WOOD_D = '#b08e62', CREAM = '#f6e9cc', LIT = '#ffd98a', PANE = '#6f83a0';

  /* ---------- houses ---------- */
  function roofPts(h) {
    const w = h.w, wh = h.h, rh = h.roofH, x0 = -w / 2;
    if (h.roof === 'hip') return [[x0 - 16, -wh + 4], [x0 + rh * 0.6, -wh - rh], [w / 2 - rh * 0.6, -wh - rh], [w / 2 + 16, -wh + 4]];
    return [[x0 - 18, -wh + 4], [0, -wh - rh], [w / 2 + 18, -wh + 4]];
  }
  function windowAt(g, x, y, ww, wh, lit, seed, box) {
    P.fill(g, P.box(x - 5, y - 5, ww + 10, wh + 10, 0.6, seed), '#fff4dc');
    P.fill(g, P.box(x, y, ww, wh, 0.4, seed + 1), lit ? LIT : PANE);
    if (lit) P.tint(g, P.box(x, y, ww, wh, 0.4, seed + 1), 0, y, 0, y + wh, [[0, 'rgba(255,255,255,0.3)'], [1, 'rgba(230,140,70,0.25)']]);
    else { g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(x + 4, y + 4, ww * 0.3, wh - 8); }
    g.fillStyle = '#fff4dc'; g.fillRect(x + ww / 2 - 1.5, y, 3, wh); g.fillRect(x, y + wh * 0.45, ww, 3);
    P.fill(g, P.box(x - 9, y + wh + 3, ww + 18, 6, 0.5, seed + 2), '#e6d6b4');
    if (box) {
      P.fill(g, P.box(x - 4, y + wh + 6, ww + 8, 12, 0.6, seed + 3), '#b9643f');
      const r = T.rng(seed + 9);
      for (let i = 0; i < 7; i++) {
        const fx = x + (i / 6) * ww, fy = y + wh + 4 - r() * 6;
        P.fill(g, P.circle(fx, fy, 6), '#5f8f62');
        P.fill(g, P.circle(fx + (r() - 0.5) * 6, fy - 4, 3.2), ['#e58aa0', '#f1c04a', '#f6f0e0'][i % 3]);
      }
    }
  }
  function paintHouse(g, h) {
    const seed = h.seed || 1, w = h.w, wh = h.h, rh = h.roofH, x0 = -w / 2, st = h.stage == null ? 1 : h.stage;
    P.fill(g, P.box(x0 - 8, -12, w + 16, 20, 0.8, seed), '#b3a08c');
    const rp = roofPts(h);
    if (st >= 1) {
      const wall = P.box(x0, -wh, w, wh - 8, 0.8, seed + 1);
      P.wash(g, wall, h.wall || CREAM, [x0, -wh, w, wh], { seed: seed + 2, n: 12, tone: 0.04, dir: Math.PI / 2, len: 90, wid: 18 });
      /* low sun from the right: a warm side and a cool side */
      P.tint(g, wall, x0, 0, x0 + w, 0, [[0, 'rgba(70,60,120,0.22)'], [0.55, 'rgba(70,60,120,0)'], [1, 'rgba(255,214,150,0.25)']]);
      P.tint(g, wall, 0, -wh, 0, -wh + 34, [[0, 'rgba(60,50,90,0.3)'], [1, 'rgba(60,50,90,0)']]);
      if (h.chim != null) { P.fill(g, P.box(h.chim - 13, -wh - rh * 0.62 - 44, 26, 70, 0.6, seed + 4), '#c9a78a'); P.fill(g, P.box(h.chim - 16, -wh - rh * 0.62 - 50, 32, 9, 0.5, seed + 5), '#a98a70'); }
      const roof = P.rough(rp, 1, seed + 6);
      P.wash(g, roof, h.roofC, [x0 - 20, -wh - rh, w + 40, rh + 6], { seed: seed + 7, n: 14, tone: 0.06, len: 80, wid: 14 });
      P.tint(g, roof, x0, 0, x0 + w, 0, [[0, 'rgba(40,30,80,0.22)'], [0.6, 'rgba(40,30,80,0)'], [1, 'rgba(255,220,160,0.28)']]);
      g.save(); g.clip(roof); g.strokeStyle = 'rgba(40,30,50,0.13)'; g.lineWidth = 2;
      for (let y = -wh - rh + 16; y < -wh; y += 16) { g.beginPath(); g.moveTo(x0 - 20, y); g.lineTo(x0 + w + 20, y + 2); g.stroke(); }
      g.restore();
      P.fill(g, P.box(x0 - 20, -wh - 2, w + 40, 7, 0.6, seed + 8), T.shade(h.roofC, -0.2));
      if (h.door) {
        const d = h.door;
        P.fill(g, P.box(d.x - 27, -100, 54, 100, 0.6, seed + 10), '#fff4dc');
        P.fill(g, P.rr(d.x - 22, -95, 44, 95, 3), d.c || '#3f7f86');
        P.tint(g, P.rr(d.x - 22, -95, 44, 95, 3), d.x - 22, 0, d.x + 22, 0, [[0, 'rgba(0,0,30,0.2)'], [1, 'rgba(255,255,255,0.1)']]);
        P.fill(g, P.circle(d.x + 13, -46, 3.4), '#e9c25a');
        P.fill(g, P.box(d.x - 34, -8, 68, 12, 0.6, seed + 11), '#c9b8a2');
      }
      (h.win || []).forEach((q, i) => windowAt(g, q[0], q[1], q[2] || 46, q[3] || 54, q[4] !== 0, seed + 20 + i * 5, q[5]));
      if (h.round) { const q = h.round; P.fill(g, P.circle(q[0], q[1], 24), '#fff4dc'); P.fill(g, P.circle(q[0], q[1], 18), LIT); g.fillStyle = '#fff4dc'; g.fillRect(q[0] - 1.5, q[1] - 18, 3, 36); g.fillRect(q[0] - 18, q[1] - 1.5, 36, 3); }
      if (h.sign === 'envelope') {
        const sx = h.signX || 0;
        P.line(g, sx, -wh + 26, sx + 46, -wh + 26, 4, '#6b5a48');
        P.fill(g, P.rr(sx + 8, -wh + 32, 46, 32, 3), '#fff4dc');
        P.strokePts(g, [[sx + 10, -wh + 34], [sx + 31, -wh + 50], [sx + 52, -wh + 34]], 2.6, '#c9573f');
      }
      if (h.roses) {
        const r = T.rng(seed + 40);
        g.strokeStyle = '#5f8f62'; g.lineWidth = 4; g.lineCap = 'round';
        g.beginPath(); g.moveTo(w / 2 - 14, -6); g.bezierCurveTo(w / 2 - 40, -80, w / 2 + 2, -140, w / 2 - 30, -wh + 20); g.stroke();
        for (let i = 0; i < 26; i++) {
          const k = r(), bx = w / 2 - 22 + Math.sin(k * 6) * 18 + (r() - 0.5) * 22, by = -10 - k * (wh - 36);
          P.fill(g, P.circle(bx, by, 9 + r() * 5), i % 3 ? '#5f8f62' : '#74a06a');
          if (i % 2) P.fill(g, P.circle(bx + (r() - 0.5) * 8, by - 3, 4.6), ['#e5758f', '#f09aac', '#d9546f'][i % 3]);
        }
      }
    } else {
      /* still being built: posts, braces, the first boards, bare rafters */
      const line = (a, b, c, d, wd, col) => P.line(g, a, b, c, d, wd || 7, col || WOOD);
      const posts = Math.max(3, Math.round(w / 62));
      const up = st * wh * 1.5;
      if (up > 20) {
        const hgt = Math.min(wh - 10, up);
        const boards = P.box(x0, -hgt, w, hgt - 8, 0.8, seed + 3);
        P.fill(g, boards, '#ecd7ae');
        g.save(); g.clip(boards); g.strokeStyle = 'rgba(120,90,50,0.3)'; g.lineWidth = 1.6;
        for (let y = -hgt + 15; y < 0; y += 15) { g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + w, y + 1); g.stroke(); }
        g.restore();
      }
      for (let i = 0; i <= posts; i++) line(x0 + (w * i) / posts, -8, x0 + (w * i) / posts, -wh, 7, i % 2 ? WOOD : WOOD_D);
      line(x0 - 4, -wh, x0 + w + 4, -wh, 8, WOOD_D);
      line(x0, -wh * 0.52, x0 + w, -wh * 0.52, 5, WOOD);
      line(x0, -8, x0 + w / posts, -wh * 0.52, 5, WOOD_D);
      line(x0 + w, -8, x0 + w - w / posts, -wh * 0.52, 5, WOOD_D);
      /* rafters */
      const n = 7;
      for (let i = 0; i <= n; i++) {
        const k = i / n, ex = T.lerp(rp[0][0], rp[rp.length - 1][0], k);
        const top = h.roof === 'hip' ? [T.clamp(ex, rp[1][0], rp[2][0]), -wh - rh] : [0, -wh - rh];
        line(ex, -wh + 2, top[0], top[1], 4.5, i % 2 ? WOOD : WOOD_D);
      }
      if (h.roof === 'hip') line(rp[1][0], -wh - rh, rp[2][0], -wh - rh, 6, WOOD_D);
      if (st > 0.55) { /* the first half of the roof is on */
        const part = h.roof === 'hip' ? [rp[0], rp[1], [0, -wh - rh], [0, -wh + 4]] : [rp[0], rp[1], [0, -wh + 4]];
        P.wash(g, P.rough(part, 1, seed + 6), h.roofC, [x0 - 20, -wh - rh, w / 2 + 20, rh + 6], { seed: seed + 7, n: 8, tone: 0.06, len: 70, wid: 14 });
      }
      /* ladder and a stack of boards */
      const lx = w / 2 + 40;
      line(lx, 0, lx - 34, -wh - 14, 4, '#a98660'); line(lx + 18, 0, lx - 16, -wh - 14, 4, '#a98660');
      for (let i = 1; i < 9; i++) { const k = i / 9; line(lx - 34 * k, -(wh + 14) * k, lx + 18 - 34 * k, -(wh + 14) * k, 3, '#a98660'); }
      for (let i = 0; i < 4; i++) P.fill(g, P.box(x0 - 58 + i * 3, -12 - i * 9, 70, 8, 0.6, seed + 50 + i), i % 2 ? '#ecd7ae' : '#dcbd8d');
    }
  }
  /* spec: { w, h, roofH, roof:'gable'|'hip', wall, roofC, door:{x,c}, win:[[x,y,w,h,lit,box]], chim, stage, sign, roses, round, seed } */
  K.house = function (h, k) {
    h.roofH = h.roofH || 80;
    return T.bake(-h.w / 2 - 90, -(h.h + h.roofH) - 70, h.w + 180, h.h + h.roofH + 96, (g) => paintHouse(g, h), k || 1.3);
  };
  K.paintHouse = paintHouse;
  K.roofPts = roofPts;

  /* ---------- small things, drawn live ---------- */
  K.lantern = function (g, x, y, t, o = {}) {
    const s = o.s || 1, lit = o.lit == null ? 1 : o.lit, seed = o.seed || 0;
    if (!o.bare) {
      P.line(g, x, y, x, y - 92 * s, 4.5 * s, '#5d5066');
      P.line(g, x, y - 92 * s, x + 16 * s, y - 92 * s, 4 * s, '#5d5066');
    }
    const lx = o.bare ? x : x + 16 * s, ly = o.bare ? y : y - 84 * s;
    const fl = 0.9 + 0.1 * Math.sin(t * 5.3 + seed * 3) * Math.sin(t * 1.7 + seed);
    if (lit > 0.01) P.glow(g, lx, ly + 10 * s, 58 * s * fl, '#ffd98a', 0.62 * lit);
    P.line(g, lx, ly - 8 * s, lx, ly, 2 * s, '#5d5066');
    P.fill(g, P.rr(lx - 8 * s, ly, 16 * s, 20 * s, 3 * s), T.mix('#b9a98c', '#fff0b8', lit));
    P.fill(g, P.rr(lx - 10 * s, ly - 3 * s, 20 * s, 5 * s, 2 * s), '#5d5066');
    P.fill(g, P.rr(lx - 9 * s, ly + 19 * s, 18 * s, 4 * s, 2 * s), '#5d5066');
    return [lx, ly + 10 * s];
  };
  K.tree = function (g, x, y, s, c1, c2, trunk, sway) {
    const w = (sway || 0) * 4;
    P.line(g, x, y + 3, x + w * 0.3, y - 48 * s, 7 * s, trunk || '#6b4f52');
    P.fill(g, P.ellipse(x + w, y - 84 * s, 40 * s, 46 * s), c1);
    P.fill(g, P.ellipse(x - 20 * s + w * 0.8, y - 66 * s, 25 * s, 27 * s), c2 || T.shade(c1, -0.1));
    P.fill(g, P.ellipse(x + 16 * s + w * 1.1, y - 104 * s, 22 * s, 22 * s), T.shade(c1, 0.12));
  };
  K.bush = function (g, x, y, s, c, dots) {
    P.fill(g, P.ellipse(x, y - 14 * s, 30 * s, 20 * s), c);
    P.fill(g, P.ellipse(x + 20 * s, y - 10 * s, 20 * s, 15 * s), T.shade(c, -0.08));
    if (dots) {
      const r = T.rng(Math.round(x));
      for (let i = 0; i < 9; i++) P.fill(g, P.circle(x - 22 * s + r() * 56 * s, y - 6 * s - r() * 22 * s, 4.4 * s), dots[i % dots.length]);
    }
  };
  /* a little boat at rest; origin at the waterline amidships */
  K.boat = function (g, x, y, s, hull, tilt) {
    g.save(); g.translate(x, y); g.rotate(tilt || 0); g.scale(s, s);
    P.line(g, 8, -8, 8, -96, 4, '#6f4a34');
    P.fill(g, P.poly([[10, -92], [10, -30], [52, -30]]), '#f3e7cf');
    P.fill(g, P.soft([[-70, -22], [70, -22], [88, -30], [72, 6], [44, 18], [-46, 18], [-74, 6]]), hull || '#8a5a3b');
    P.fill(g, P.rr(-68, -24, 138, 7, 3), T.shade(hull || '#8a5a3b', 0.18));
    g.restore();
  };
  /* Captain Bram's boat on the slip: fifty years in the building, two thwarts */
  K.slip = function () {
    return T.bake(-250, -220, 500, 250, (g) => {
      [-120, 0, 120].forEach((x, i) => {
        P.fill(g, P.rough([[x - 34, 0], [x - 12, -46], [x + 12, -46], [x + 34, 0]], 1, 60 + i), '#9a7550');
        P.fill(g, P.box(x - 44, -8, 88, 10, 0.6, 64 + i), '#7f5f40');
      });
      const hull = P.soft([[-176, -124], [-186, -96], [-150, -52], [-40, -40], [80, -42], [164, -62], [206, -140], [176, -132], [0, -122]]);
      P.wash(g, hull, '#b9774a', [-190, -140, 400, 110], { seed: 70, n: 16, tone: 0.06, len: 150, wid: 10, spread: 0.1 });
      g.save(); g.clip(hull);
      g.strokeStyle = 'rgba(70,40,20,0.3)'; g.lineWidth = 2;
      for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(-190, -112 + i * 15); g.quadraticCurveTo(0, -100 + i * 15, 210, -128 + i * 13); g.stroke(); }
      /* the bow is still open: ribs against the dark inside */
      g.fillStyle = '#5a3a2a'; g.fillRect(104, -150, 120, 120);
      g.strokeStyle = WOOD; g.lineWidth = 6;
      for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(118 + i * 20, -136 + i * 2); g.quadraticCurveTo(110 + i * 20, -90, 124 + i * 16, -50); g.stroke(); }
      g.restore();
      P.strokePts(g, [[-178, -124], [0, -122], [176, -132], [206, -140]], 7, '#f3e7cf', true);
      P.fill(g, P.box(-96, -134, 44, 9, 0.5, 72), '#dcbd8d'); P.fill(g, P.box(6, -134, 44, 9, 0.5, 73), '#dcbd8d');
      /* trestle with a plank and a pot of paint */
      P.line(g, -236, 0, -222, -52, 5, '#9a7550'); P.line(g, -196, 0, -210, -52, 5, '#9a7550');
      P.fill(g, P.box(-244, -58, 60, 8, 0.6, 74), '#dcbd8d');
      P.fill(g, P.rr(-226, -76, 18, 18, 3), '#3f7f86');
    }, 1.3);
  };
  /* the same boat fifty years later, finished and afloat. Origin at the waterline amidships;
     drawn in two passes so whoever is aboard sits inside the hull. */
  K.bigBoat = function (g, part) {
    if (part === 'back') {
      P.line(g, 10, -40, 10, -230, 6, '#6f4a34');
      P.fill(g, P.poly([[14, -224], [14, -70], [120, -70]]), '#f6ecd6');
      P.fill(g, P.poly([[6, -214], [6, -84], [-70, -84]]), '#efe2c6');
      P.fill(g, P.poly([[10, -230], [10, -214], [38, -222]]), '#c9573f');
      return;
    }
    const hull = P.soft([[-176, -62], [-186, -34], [-150, 10], [-40, 22], [80, 20], [164, 0], [206, -78], [176, -70], [0, -60]]);
    P.fill(g, hull, '#b9774a');
    g.save(); g.clip(hull);
    g.strokeStyle = 'rgba(70,40,20,0.3)'; g.lineWidth = 2;
    for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(-190, -50 + i * 15); g.quadraticCurveTo(0, -38 + i * 15, 210, -66 + i * 13); g.stroke(); }
    g.restore();
    P.strokePts(g, [[-178, -62], [0, -60], [176, -70], [206, -78]], 7, '#f3e7cf', true);
  };
  K.bike = function (g, x, y, s, ph, col) {
    g.save(); g.translate(x, y); g.scale(s, s);
    g.strokeStyle = '#3d3540'; g.lineWidth = 3;
    [[-24, -15], [24, -15]].forEach((c) => {
      g.beginPath(); g.arc(c[0], c[1], 15, 0, TAU); g.stroke();
      for (let i = 0; i < 4; i++) { const a = ph * 2 + (i * Math.PI) / 2; g.beginPath(); g.moveTo(c[0], c[1]); g.lineTo(c[0] + Math.cos(a) * 15, c[1] + Math.sin(a) * 15); g.lineWidth = 1.2; g.stroke(); g.lineWidth = 3; }
    });
    P.strokePts(g, [[-24, -15], [-6, -42], [16, -42], [24, -15]], 3.4, col || '#c9573f');
    P.strokePts(g, [[-6, -42], [2, -16], [16, -42]], 3.4, col || '#c9573f');
    P.line(g, -10, -48, 0, -48, 4, '#3d3540'); P.line(g, 16, -42, 20, -56, 3, '#3d3540'); P.line(g, 14, -57, 27, -55, 3.4, '#3d3540');
    g.restore();
  };

  /* ---------- cloud ---------- */
  K.makeBank = function (y, n, rMin, rMax, seed, x0, x1) {
    const rr = T.rng(seed), list = [];
    for (let i = 0; i < n; i++) list.push({ x: x0 + (i / n) * (x1 - x0) + (rr() - 0.5) * 80, y: y + (rr() - 0.5) * 34, r: rMin + rr() * (rMax - rMin) });
    return list;
  };
  K.bankPath = function (list, ox, bob, xa, xb, depth) {
    const p = new Path2D();
    let top = 1e9;
    for (const c of list) {
      const x = c.x + ox;
      if (x + c.r < xa || x - c.r > xb) continue;
      p.moveTo(x + c.r, c.y + bob); p.arc(x, c.y + bob, c.r, 0, TAU);
      top = Math.min(top, c.y);
    }
    if (top < 1e9) p.rect(xa - 10, top + bob + 20, xb - xa + 20, depth || 900);
    return p;
  };
})();
