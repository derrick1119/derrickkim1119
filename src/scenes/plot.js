/* Leo's plot on the hilltop, and everything he builds there over forty-five years.
   Drawn inside the borrowed town (see T.world); a plain state object says how far along it is. */
(function () {
  'use strict';
  const T = window.TYT, P = T.P, F = T.F, K = T.town;
  const TAU = Math.PI * 2;

  const HX = 3992, BOARD_X = 3846, LAMP_X = 4104, TABLE_X = 4198, TREE_X = 4284, ROOM_X = 4150;
  const PROMISES = ['마당 있는 넓은 집', '평생 밥해주기', '오로라 보러 가기', '릴리의 그네', '같이 늙기'];
  /* the house wears the family's colours: his mustard, her coral, Lily's blue */
  const SPEC = { w: 236, h: 150, roofH: 92, roof: 'hip', wall: '#f8eed6', roofC: '#d7a23c', door: { x: 72, c: '#c9573f' }, win: [[-96, -116, 50, 60, 1, true], [-26, -116, 50, 60, 1, true]], chim: -58, seed: 151 };

  const PL = (T.plot = { HX, BOARD_X, LAMP_X, TABLE_X, TREE_X, ROOM_X, PROMISES, SX: [HX - 104, HX - 36, HX + 36, HX + 104], spr: {} });

  PL.build = function () {
    if (PL.gen === T.gen && PL.spr.full) return;
    PL.gen = T.gen;
    const mk = (stage) => K.house(Object.assign({}, SPEC, { stage }), 1.4);
    PL.spr = { frame: mk(0.2), half: mk(0.62), full: mk(1) };
    /* one soft curtain of light for the aurora */
    const c = document.createElement('canvas'); c.width = 48; c.height = 256;
    const g = c.getContext('2d');
    const v = g.createLinearGradient(0, 0, 0, 256);
    v.addColorStop(0, 'rgba(150,120,255,0)'); v.addColorStop(0.3, 'rgba(120,150,255,0.25)'); v.addColorStop(0.62, 'rgba(110,245,190,0.75)');
    v.addColorStop(0.86, 'rgba(160,255,200,0.95)'); v.addColorStop(0.95, 'rgba(255,170,220,0.5)'); v.addColorStop(1, 'rgba(255,170,220,0)');
    g.fillStyle = v; g.fillRect(0, 0, 48, 256);
    g.globalCompositeOperation = 'destination-in';
    const h = g.createLinearGradient(0, 0, 48, 0);
    h.addColorStop(0, 'rgba(0,0,0,0)'); h.addColorStop(0.5, 'rgba(0,0,0,1)'); h.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = h; g.fillRect(0, 0, 48, 256);
    PL.strip = c;
  };

  /* stage: 0 staked out · 1 foundation · 2 frame · 3 walls and half a roof · 4 finished */
  PL.state = function (o) {
    return Object.assign({
      stage: 0, stones: 0, raise: 0, board: false, cross: [0, 0, 0, 0, 0], table: false,
      food: { show: false, drop: 1, fill: 1, color: '#b9532f', burnt: false, herb: false, glow: 0 },
      tree: 0, swing: 0, swingW: 0, swingA: 0, lantern: 1, night: 0, aurora: [], room2: 0, garden: 0,
    }, o || {});
  };

  PL.draw = function (g, ps) {
    const y3 = T.world.y3, t = T.time;
    /* stakes and string, until the walls hide them */
    if (ps.stage < 3) {
      const xa = HX - 126, xb = HX + 126;
      const stake = (sx, far) => { const y = y3(sx); P.line(g, sx, y + 4, sx, y - (far ? 28 : 38), far ? 4 : 5.5, far ? '#c9a878' : '#b08e62'); return [sx, y - (far ? 24 : 34)]; };
      const a = stake(xa + 22, true), b = stake(xb - 22, true), c = stake(xa, false), d = stake(xb, false);
      g.strokeStyle = 'rgba(246,233,204,0.85)'; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 6, b[0], b[1]);
      g.moveTo(c[0], c[1]); g.quadraticCurveTo((c[0] + d[0]) / 2, (c[1] + d[1]) / 2 + 9, d[0], d[1]); g.stroke();
      [c, d].forEach((q, i) => { const f = Math.sin(t * 3 + i) * 3; P.fill(g, P.poly([[q[0], q[1] - 2], [q[0] + 16 + f, q[1] + 2], [q[0], q[1] + 8]]), i ? '#d7a23c' : '#c9573f'); });
    }
    /* long grass round the edges */
    const r = T.rng(19);
    g.lineCap = 'round';
    for (let i = 0; i < 46; i++) {
      const gx = HX - 190 + r() * 520, h = 10 + r() * 20, sw = Math.sin(t * 1.4 + i) * 4, y = y3(gx) + 3;
      if (ps.stage >= 1 && Math.abs(gx - HX) < 124) { r(); continue; }
      g.strokeStyle = i % 3 ? '#6b9a72' : '#9ab86a'; g.lineWidth = 2 + r();
      g.beginPath(); g.moveTo(gx, y); g.quadraticCurveTo(gx + sw * 0.4, y - h * 0.6, gx + sw, y - h); g.stroke();
      if (i % 8 === 0) P.fill(g, P.circle(gx + sw, y - h, 3.4), ['#f6f0e0', '#f1c04a', '#e58aa0'][i % 3]);
    }
    /* foundation stones */
    const SX = [HX - 104, HX - 36, HX + 36, HX + 104];
    for (let i = 0; i < Math.min(4, ps.stones); i++) {
      const x = SX[i], y = y3(x);
      P.fill(g, P.soft([[x - 22, y + 4], [x - 18, y - 10], [x, y - 15], [x + 18, y - 11], [x + 23, y + 4]]), i % 2 ? '#cdbfae' : '#d9cdbd');
      P.fill(g, P.soft([[x - 16, y - 8], [x, y - 14], [x + 12, y - 10], [x, y - 6]]), 'rgba(255,255,255,0.3)');
    }
    /* the house */
    const gy = y3(HX) + 3;
    if (ps.stage === 1 && ps.raise > 0.01) { g.save(); g.translate(HX, gy); g.scale(1, ps.raise); T.blit(g, PL.spr.frame, 0, 0); g.restore(); }
    else if (ps.stage === 2) T.blit(g, PL.spr.frame, HX, gy);
    else if (ps.stage === 3) T.blit(g, PL.spr.half, HX, gy);
    else if (ps.stage >= 4) {
      T.blit(g, PL.spr.full, HX, gy);
      for (let i = 0; i < 4; i++) { const life = (t * 0.12 + i * 0.25) % 1; P.glow(g, HX - 58 + Math.sin(t * 0.7 + i * 2) * (5 + life * 16) + life * 20, gy - 250 - life * 100, 12 + life * 22, '#fff6ea', Math.sin(life * Math.PI) * 0.3); }
      if (ps.garden > 0.01) { g.save(); g.globalAlpha = ps.garden; [-150, -128, 136].forEach((dx, i) => K.bush(g, HX + dx, y3(HX + dx) + 2, 0.7, '#5f8f62', ['#f1c04a', '#e58aa0', '#f6f0e0'])); g.restore(); }
    }
    /* the list, nailed up where he can see it from anywhere on the plot */
    if (ps.board) {
      const x = BOARD_X, y = y3(x);
      P.line(g, x, y + 4, x, y - 92, 5, '#8a6442');
      g.save(); g.translate(x, y - 74); g.rotate(-0.03);
      P.fill(g, P.box(-25, -27, 50, 56, 0.6, 7), '#f1e6cc');
      for (let i = 0; i < 5; i++) {
        const ly = -18 + i * 10, w = [34, 28, 32, 24, 22][i];
        P.line(g, -18, ly, -18 + w, ly, 1.6, 'rgba(51,64,92,0.7)');
        if (ps.cross[i] > 0.01) P.line(g, -21, ly + 1, -21 + (w + 6) * ps.cross[i], ly - 1, 1.6, '#b54a36');
      }
      g.restore();
    }
    /* his lantern from the boat */
    if (ps.lantern > 0.01) {
      const y = y3(LAMP_X);
      P.line(g, LAMP_X, y + 6, LAMP_X, y - 84, 4.5, '#6f4a34');
      K.lantern(g, LAMP_X, y - 86, t, { bare: true, s: 1.1, lit: 1, seed: 4 });
    }
    /* the table where what she cooks arrives */
    if (ps.table) {
      const x = TABLE_X, y = y3(x), top = y - 52;
      P.line(g, x - 30, top + 4, x - 36, y + 2, 5, '#8a6442'); P.line(g, x + 30, top + 4, x + 36, y + 2, 5, '#8a6442');
      P.fill(g, P.box(x - 44, top - 4, 88, 8, 0.6, 3), '#b98a5a');
      [-66, 66].forEach((dx, i) => P.fill(g, P.box(x + dx - 15, y - 30, 30, 32, 0.8, 5 + i), '#c79a62'));
      const f = ps.food;
      if (f.show) {
        const fy = top - 4 - (1 - T.ease.out3(T.clamp(f.drop))) * 300, a = T.clamp(f.drop * 3);
        if (f.glow > 0.01) P.glow(g, x - 6, fy - 8, 70, '#fff0c0', 0.7 * f.glow);
        g.save(); g.globalAlpha = a;
        const bx = x - 16;
        P.fill(g, P.poly([[bx - 14, fy - 11], [bx + 14, fy - 11], [bx + 9, fy], [bx - 9, fy]]), '#f2ead8');
        if (f.fill > 0.02) { P.fill(g, P.ellipse(bx, fy - 11, 12 * (0.5 + 0.5 * f.fill), 3.2), f.color); if (f.herb) { P.fill(g, P.circle(bx - 4, fy - 11.5, 1.5), '#6fa35c'); P.fill(g, P.circle(bx + 3, fy - 10.5, 1.5), '#6fa35c'); } }
        else P.fill(g, P.ellipse(bx, fy - 11, 11, 2.6), '#e6dcc6');
        if (f.fill > 0.1) P.glow(g, bx, fy - 24 - ((t * 9) % 12), 8, '#fff3dc', 0.2 * a);
        P.fill(g, P.ellipse(x + 20, fy - 6, 14, 7), f.burnt ? '#3a2e29' : '#c98a4b');
        if (!f.burnt) P.fill(g, P.ellipse(x + 18, fy - 9, 8, 3), '#e0a86a');
        g.restore();
      }
    }
    /* apple tree, and the swing on its seaward side */
    if (ps.tree > 0.01) {
      const k = ps.tree, x = TREE_X, y = y3(x), s = 0.5 + 1.1 * k;
      const q = ps.swing > 0.01 ? swingGeo(ps) : null;
      if (q) P.line(g, x, y - 84 * s, q.x1 + 10, q.top - 2, 6.5, '#6b4f52');
      K.tree(g, x, y, s, '#5f9a6a', '#4f8a62', '#6b4f52', Math.sin(t * 0.8));
      if (k > 0.75) { const rr = T.rng(4); for (let i = 0; i < 9; i++) P.fill(g, P.circle(x - 36 * s + rr() * 72 * s, y - 62 * s - rr() * 60 * s, 4.4), '#c9433a'); }
      if (q) {
        const dx = Math.sin(ps.swingA) * 16;
        g.save(); g.globalAlpha = ps.swing;
        P.line(g, q.x0 + 3, q.top + 1, q.x0 + 3 + dx, q.seatY, 2, '#6f5346'); P.line(g, q.x1 - 3, q.top - 1, q.x1 - 3 + dx, q.seatY, 2, '#6f5346');
        P.fill(g, P.rr(q.x0 + dx, q.seatY, q.w, 7, 2.5), '#c9573f');
        g.restore();
      }
    }
    /* the next room: one stone, set by two pairs of hands */
    if (ps.room2 > 0.01) {
      const x = ROOM_X, y = y3(x);
      g.save(); g.globalAlpha = T.clamp(ps.room2 * 2);
      P.fill(g, P.soft([[x - 22, y + 4], [x - 18, y - 10], [x, y - 15], [x + 18, y - 11], [x + 23, y + 4]]), '#d9cdbd');
      g.restore();
      P.glow(g, x, y - 8, 60, '#fff0c0', 0.5 * Math.sin(T.clamp(ps.room2) * Math.PI));
    }
  };
  function swingGeo(ps) {
    const y = T.world.y3(TREE_X), s = 0.5 + 1.1 * ps.tree, w = 30 + 66 * ps.swingW, x0 = TREE_X + 46 * s;
    return { x0, x1: x0 + w, w, top: y - 108 * s, seatY: y - 44 };
  }
  /* [centre x, seat y, width] — it widens away from the tree */
  PL.swingSeat = function (ps) { const q = swingGeo(ps); return [q.x0 + q.w / 2 + Math.sin(ps.swingA) * 16, q.seatY, q.w]; };

  /* seat someone on the swing: side -1 the half nearer the tree, +1 the far half. They face the house. */
  PL.sitOnSwing = function (o, ps, side) {
    const q = PL.swingSeat(ps), hs = (o.s || 150) / 150;
    o.x = q[0] + side * q[2] * 0.25 + 2; o.y = q[1] - 14 * hs; o.sit = true; o.flip = true; o.lean = 0.02; o.walk = null;
    const rope = { hand: F.local(o, q[0] + side * (q[2] / 2 - 4), q[1] - 46), bend: -1 };
    if (side < 0) { o.armF = rope; o.armB = { a: 0.5, b: 0.6 }; } else { o.armB = rope; o.armF = { a: 0.5, b: 0.6 }; }
  };

  /* things that glow once it is dark: windows, lantern (drawn after the night has been laid over) */
  PL.glow = function (g, ps) {
    const y3 = T.world.y3, n = ps.night;
    if (n < 0.02) return;
    if (ps.lantern > 0.01) P.glow(g, LAMP_X, y3(LAMP_X) - 80, 150, '#ffd98a', 0.5 * n);
    if (ps.room2 > 0.5) P.glow(g, ROOM_X, y3(ROOM_X) - 8, 54, '#ffe9b8', 0.42 * n * (0.85 + 0.15 * Math.sin(T.time * 1.6)));
    if (ps.stage >= 4) { const gy = y3(HX); [[-71, -86], [-1, -86]].forEach((q) => { P.glow(g, HX + q[0], gy + q[1], 70, '#ffd98a', 0.55 * n); P.fill(g, P.rr(HX + q[0] - 25, gy + q[1] - 30, 50, 60, 2), T.rgba('#ffe2a0', 0.5 * n)); }); }
  };
  /* stars and the aurora, in screen space above the skyline */
  PL.sky = function (g, ps) {
    const n = ps.night, V = T.view, t = T.time;
    if (n < 0.02) return;
    const r = T.rng(23);
    g.fillStyle = '#f6f3ff';
    for (let i = 0; i < 70; i++) {
      const x = (r() - 0.5) * V.W, y = 20 + r() * 330, s = 0.8 + r() * 1.6;
      g.globalAlpha = n * (0.45 + 0.55 * Math.sin(t * 1.3 + i * 2.1));
      g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
    if (ps.aurora.length) {
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < ps.aurora.length; i++) {
        const p = ps.aurora[i], h = 170 + Math.sin(i * 1.15 + t * 0.7) * 50, sway = Math.sin(t * 0.9 + p[0] * 0.011 + i * 0.37) * 12;
        g.globalAlpha = 0.27 * n * (0.6 + 0.4 * Math.sin(t * 1.7 + i * 1.9));
        g.drawImage(PL.strip, p[0] - 30 + sway, p[1] - h * 0.82, 60, h);
      }
      g.restore();
    }
  };

  /* the list, close up. c: { a, w (0..5 lines written), cross: [0..1 × 5], glow } */
  PL.boardCard = function (g, c) {
    const V = T.view;
    if (c.a <= 0.003) return;
    g.save();
    g.fillStyle = T.rgba('#141a2c', 0.55 * c.a); g.fillRect(-V.W / 2, 0, V.W, V.H);
    const k = T.ease.out3(T.clamp(c.a));
    g.translate(0, 450 + (1 - k) * 60 + Math.sin(T.time * 0.8) * 3); g.rotate(-0.012);
    g.globalAlpha = T.clamp(c.a * 2.5);
    g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 44; g.shadowOffsetY = 16;
    P.fill(g, P.rr(-290, -330, 580, 660, 8), '#f4ead2');
    g.shadowColor = 'transparent';
    P.wash(g, P.rr(-290, -330, 580, 660, 8), '#f1e6cc', [-290, -330, 580, 660], { seed: 61, n: 24, tone: 0.03, len: 220, wid: 40 });
    P.fill(g, P.circle(0, -304, 7), '#8a6442');
    P.text(g, '약속', 0, -236, { font: 'serif', size: 24, track: 22, color: '#33405c', alpha: 0.6 });
    const INK = '#33405c';
    PROMISES.forEach((p, i) => {
      const kk = T.clamp(c.w - i);
      if (kk <= 0) return;
      const y = -138 + i * 86 + (i === 4 ? 26 : 0);
      const L = P.text(g, p, 0, y, { size: i === 4 ? 72 : 62, color: INK, k: kk, seed: 3 + i, alpha: 1 - 0.45 * c.cross[i], glow: i === 4 && c.glow ? T.rgba('#ffd98a', c.glow) : null });
      if (c.cross[i] > 0.01) { const w = L.w + 30; P.strokePts(g, P.trim([[-w / 2, y - 18], [-w / 6, y - 23], [w / 5, y - 15], [w / 2, y - 21]], c.cross[i]), 4, '#b54a36', true); }
    });
    g.restore();
  };
})();
