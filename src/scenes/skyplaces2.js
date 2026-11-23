/* Take Your Time — three more places above the cloud sea, painted with the brushes and the frame of skyplaces.js.
     T.place('grove', o)   소원 숲. Night on a floating island. The wishes made on shooting stars hang in an old tree
                           as small lights, and each one hums the tune its wisher had in mind; a stream of light runs
                           through the grass and pours over the edge. V.find() -> Promise: the player listens to the
                           low lights and picks the one humming Ana's lullaby; it drops into Leo's hands.
     T.place('post', o)    바람 우체국. A tall post office of pigeonholes built into a cliff of cloud. Letters people
                           write to the ones who have gone (left by a photo, burned, kept in a drawer) come in on the
                           wind and flutter about like birds; magpies on the roof, an old postmaster at the counter.
                           V.catchLetter() -> Promise: catch the one with a crayon star on it as it flies past.
     T.place('whales', o)  구름 고래. Dusk over the open cloud sea, from a grassy headland. A cloud whale and her calf
                           go by, singing, once every ten years. V.pass({ dur, from }) -> Promise (when they are gone).
   Each is a view (draw · update · pointer · key · want · hintAt) shown with `await X.view(T.place('grove', o))`.
   o.actors replaces who is there (see skyplaces.js for an actor's fields); V.walkTo(actor, x, speed) walks one. */
(function () {
  'use strict';
  const T = window.TYT, P = T.P, F = T.F, Dt = T.detail;
  const TAU = Math.PI * 2;
  const KIT = T.place.kit, base = KIT.base, cloudRow = KIT.cloudRow, isle = KIT.isle;
  const AU = () => T.audio;

  /* ---------- shared ---------- */
  /* a soft round light or puff */
  function blob(g, x, y, r, c, a) {
    const gr = g.createRadialGradient(x, y, r * 0.12, x, y, r);
    gr.addColorStop(0, T.rgba(c, a)); gr.addColorStop(0.65, T.rgba(c, a * 0.62)); gr.addColorStop(1, T.rgba(c, 0));
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  /* blades of grass along a line y = yAt(x) */
  function tufts(g, x0, x1, yAt, n, seed, cols, h, lean) {
    const r = T.rng(seed);
    g.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const x = x0 + r() * (x1 - x0), y = yAt(x), hh = h * (0.45 + r()), ln = (r() - 0.5 + (lean || 0)) * hh * 0.6;
      g.strokeStyle = cols[i % cols.length]; g.lineWidth = 1.1 + r() * 1.5;
      g.beginPath(); g.moveTo(x, y + 2); g.quadraticCurveTo(x + ln * 0.25, y - hh * 0.6, x + ln, y - hh); g.stroke();
    }
  }
  function starField(g, W, t, n, seed, top, h, k) {
    if (k <= 0.01) return;
    const r = T.rng(seed);
    g.fillStyle = '#fff8ec';
    for (let i = 0; i < n; i++) {
      const x = (r() - 0.5) * W, y = top + r() * h, s = 0.6 + r() * 1.5, sp = 0.7 + r() * 1.1;
      g.globalAlpha = k * (0.3 + 0.7 * (1 - (y - top) / h)) * (0.55 + 0.45 * Math.sin(t * sp + i * 2.1));
      g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
  }
  /* actors that can walk inside a place */
  function walkers(V) {
    const go = [];
    V.walkTo = function (a, x, v) {
      return new Promise((res) => {
        const sp = (a.at && V.spots[a.at]) || V.spots.ground;
        if (a.x == null) a.x = sp[0] + (a.dx || 0);
        for (let i = go.length - 1; i >= 0; i--) if (go[i].a === a) { go[i].res(); go.splice(i, 1); }
        go.push({ a, x, v: v || 80, res });
      });
    };
    /* where a spot is for the width on screen now */
    V.spot = function (name) { if (V.layout) V.layout(); return (V.spots[name] || V.spots.ground).slice(); };
    V.stepWalkers = function (dt) {
      for (let i = go.length - 1; i >= 0; i--) {
        const q = go[i], a = q.a, d = q.x - a.x, st = Math.sign(d) * Math.min(Math.abs(d), q.v * dt);
        a.x += st;
        if (st) { if (!a.keepFlip) a.flip = d < 0; a.ph = (a.ph || 0) + Math.abs(st) / (a.dog ? 5 : 10 * ((a.s || 150) / 150)); a.walk = a.ph; }
        if (Math.abs(q.x - a.x) < 0.5) { a.x = q.x; a.walk = null; go.splice(i, 1); q.res(); }
      }
    };
  }
  /* a point and a direction on the quadratic curve [x0, y0, cx, cy, x1, y1] */
  const qAt = (L, u) => { const v = 1 - u; return [v * v * L[0] + 2 * v * u * L[2] + u * u * L[4], v * v * L[1] + 2 * v * u * L[3] + u * u * L[5]]; };
  const qDir = (L, u) => [2 * (1 - u) * (L[2] - L[0]) + 2 * u * (L[4] - L[2]), 2 * (1 - u) * (L[3] - L[1]) + 2 * u * (L[5] - L[3])];
  /* a limb that thins from L[6] to L[7] along its curve */
  function limbPath(L) {
    const n = 12, a = [], b = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, p = qAt(L, u), d = qDir(L, u), l = Math.hypot(d[0], d[1]) || 1, w = T.lerp(L[6], L[7], u) / 2;
      a.push([p[0] - (d[1] / l) * w, p[1] + (d[0] / l) * w]); b.push([p[0] + (d[1] / l) * w, p[1] - (d[0] / l) * w]);
    }
    return P.poly(a.concat(b.reverse()));
  }
  /* a smooth line through points (Catmull-Rom), n steps between each pair */
  function spline(pts, n) {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (let k = 0; k < n; k++) {
        const t = k / n, t2 = t * t, t3 = t2 * t, f = (j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3);
        out.push([f(0), f(1)]);
      }
    }
    out.push(pts[pts.length - 1].slice());
    return out;
  }

  /* ================= the wishing grove ================= */
  /* the tunes the low lights hum: [midi, beats]. The lullaby's first bar and a half is Ana's */
  const LULLABY = [[69, 1], [67, 1], [65, 1], [72, 3]];
  const OTHERS = [[[72, 1], [74, 1], [77, 1], [76, 2], [72, 1]], [[64, 1], [67, 1], [69, 2], [67, 1], [64, 2]], [[77, 0.5], [76, 0.5], [74, 1], [72, 1], [74, 3]]];
  const BEAT = 0.5;
  const phraseLen = (p) => p.reduce((s, n) => s + n[1], 0) * BEAT;
  /* how bright a light is u seconds into its tune: a swell at each note, held while the note is */
  function phraseGlow(p, u) {
    let at = 0;
    for (const n of p) {
      const len = n[1] * BEAT;
      if (u >= at && u < at + len) return 0.42 + 0.58 * Math.exp(-(u - at) * 2.4) * (u - at < len - 0.08 ? 1 : 0.4);
      at += len;
    }
    return 0;
  }
  function grove(o) {
    const GY = 704;
    const V = base(o, {
      dark: true, quiet: true, mood: 'night', chord: 5,
      spots: { leo: [-400, GY, 'ground'], kid: [-322, GY, 'ground'], ground: [-400, GY, 'ground'] },   /* laid out again for the width */
      actors: () => [
        { id: 'leo', style: F.leoAt(o.leoAge == null ? 0 : o.leoAge), at: 'leo', headTilt: -0.22, face: { mouth: 'smile' } },
        { id: 'kid', style: F.styles.kidA, s: 100, at: 'kid', headTilt: -0.3, face: { eye: 'happy' } },
      ],
    });
    walkers(V);
    V.answer = o.answer == null ? 2 : o.answer;
    V.t = 0; V.idle = 0;
    let G = null;   /* the layout for the width we were last drawn at */
    function layout() {
      const W = T.view.W;
      if (G && G.W === W) return G;
      const r = T.rng(71), TX = W * 0.1, TY = 648;
      /* a limb: [x0, y0, cx, cy, x1, y1, width at the start, width at the end] */
      const trunk = [TX + 10, TY + 8, TX - 8, TY - 120, TX - 12, TY - 250, 104, 52];
      const limbs = [], tips = [], leafy = [];
      const main = [
        [TX - 18, TY - 196, TX - W * 0.2, TY - 420, -W * 0.5, TY - 296, 46, 12],
        [TX - 20, TY - 236, TX - W * 0.02, TY - 480, -W * 0.22, TY - 590, 36, 10],
        [TX - 12, TY - 246, TX - W * 0.03, TY - 470, TX + 40, TY - 690, 36, 10],
        [TX - 4, TY - 232, TX + W * 0.16, TY - 360, W * 0.31, TY - 590, 34, 10],
        [TX + 4, TY - 194, TX + W * 0.2, TY - 420, W * 0.5, TY - 330, 38, 11],
      ];
      main.forEach((L) => limbs.push(L));
      /* twigs off the limbs, all reaching up and out */
      function twig(x, y, ang, len, w, d) {
        ang = T.clamp(ang, -Math.PI + 0.25, -0.25);
        const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len, bend = (r() - 0.5) * len * 0.3;
        const L = [x, y, (x + ex) / 2 - Math.sin(ang) * bend, (y + ey) / 2 + Math.cos(ang) * bend, ex, ey, w, w * 0.45];
        limbs.push(L);
        if (d <= 0) { tips.push([ex, ey]); return; }
        tips.push([L[2], L[3]]);
        for (let i = 0; i < 2; i++) twig(ex, ey, ang + (i ? 1 : -1) * (0.3 + r() * 0.4), len * (0.62 + r() * 0.16), w * 0.5, d - 1);
      }
      main.forEach((L, mi) => {
        for (const u of [0.4, 0.62, 0.82, 1]) {
          const p = qAt(L, u), dv = qDir(L, u), a = Math.atan2(dv[1], dv[0]);
          const n = u === 1 ? 2 : 1;
          for (let k = 0; k < n; k++) twig(p[0], p[1], (mi === 0 || mi === 4 ? -Math.PI / 2 + (mi === 0 ? -0.55 : 0.55) : a) + (r() - 0.5) * 1.1, (70 + r() * 70) * (W / 1600 * 0.4 + 0.6), T.lerp(L[6], L[7], u) * 0.55, 2);
          if (mi > 0 && u > 0.5) leafy.push(p);   /* the crown is thick along the upper limbs too */
        }
      });
      /* the four low lights, on twigs drooping from the long left limb, within reach */
      const cand = [], low = main[0];
      const HANG = [452, 488, 440, 478];
      for (let i = 0; i < 4; i++) {
        const x = -W * 0.37 + i * W * 0.106;
        let best = 0, bd = 1e9;
        for (let s = 0; s <= 60; s++) { const p = qAt(low, s / 60); const d = Math.abs(p[0] - x); if (d < bd) { bd = d; best = s / 60; } }
        const an = qAt(low, best);
        cand.push({ i, ax: an[0], ay: an[1] + 6, x, y: HANG[i], droop: [an[0], an[1] + 4, an[0] + (x - an[0]) * 0.3 + 18, (an[1] + HANG[i]) / 2 - 10, x, HANG[i] - 30] });
      }
      /* the rest: hanging all through the tree */
      const amb = [], COLS = ['#ffe7a8', '#ffd3dc', '#d6ecff', '#e4ffd4', '#fff0c8', '#f2d6ff', '#ffdcb4'];
      for (let i = 0; i < 78; i++) {
        let ax, ay;
        if (i < 44) { const L = main[i % 5], u = 0.24 + r() * 0.76, p = qAt(L, u); ax = p[0] + (r() - 0.5) * 20; ay = p[1] + 8; }
        else { const q = tips[Math.floor(r() * tips.length)]; ax = q[0] + (r() - 0.5) * 30; ay = q[1] + 10 + r() * 20; }
        const len = 10 + r() * 52, y = ay + len;
        if (cand.some((c) => Math.hypot(c.x - ax, c.y - y) < 60) || y > 560) { r(); r(); continue; }
        amb.push({ ax, ay, len, rad: 3 + r() * 3.4, c: COLS[Math.floor(r() * COLS.length)], ph: r() * TAU, w: 0.6 + r() * 0.7, amp: 0.05 + r() * 0.07, glow: 0 });
      }
      const STREAM = [[-W * 0.12, 594], [W * 0.03, 618], [-W * 0.03, 656], [W * 0.13, 690], [W * 0.27, 724], [W * 0.355, 704]];
      const SS = spline(STREAM, 14).map((p, i, a) => [p[0], p[1], T.lerp(5, 26, i / (a.length - 1))]);
      G = { W, TX, TY, trunk, limbs, tips, leafy, main, cand, amb, STREAM, SS, EDGE: W * 0.36 };
      V.spots.leo = [-W * 0.25, GY, 'ground']; V.spots.kid = [-W * 0.25 + 78, GY, 'ground']; V.spots.ground = V.spots.leo;
      return G;
    }
    V.layout = layout;
    /* the candidates' tunes and colours */
    const C = [0, 1, 2, 3].map((i) => {
      const right = i === V.answer, k = (i - (i > V.answer ? 1 : 0)) % 3;
      return { i, right, phr: right ? LULLABY : OTHERS[k], col: right ? '#ffd796' : ['#a9cbff', '#ffb4cf', '#c2eaa4'][k], song: -99, sway: 0, rest: 1.6 + i * 0.37 };
    });
    const flies = [], r0 = T.rng(9);
    for (let i = 0; i < 34; i++) flies.push({ x: (r0() - 0.5) * 1800, y: 380 + r0() * 480, ph: r0() * TAU, sp: 0.3 + r0() * 0.6, front: i % 4 === 0 });

    V.bake = function () {
      const W = T.view.W, L = {}, g0 = layout();
      /* far: night cloud banks and isles a long way off */
      L.far = T.bake(-W / 2 - 80, 220, W + 160, 460, (g) => {
        isle(g, -W * 0.36, 430, 110, 301, { haze: '#3c3d74', hazeA: 0.6, arches: 2, c: '#55548a', tower: false });
        isle(g, W * 0.4, 400, 150, 302, { haze: '#3a3a70', hazeA: 0.55, arches: 3, c: '#58568c' });
        cloudRow(g, -W / 2 - 120, W / 2 + 120, 600, 260, 303, { lit: '#8a86c0', shade: '#34336a', a: 0.95, sun: -1 });
      });
      /* mid: the cloud sea below the island, moonlit */
      L.mid = T.bake(-W / 2 - 80, 440, W + 160, 500, (g) => {
        g.fillStyle = '#34356c'; g.fillRect(-W / 2 - 80, 640, W + 160, 300);
        cloudRow(g, -W / 2 - 140, W / 2 + 160, 640, 300, 311, { lit: '#9c98cc', shade: '#3a3a74', a: 1, sun: -1 });
        cloudRow(g, -W / 2 - 140, W / 2 + 160, 760, 320, 312, { lit: '#8e8ac4', shade: '#2f306a', a: 1, sun: -1 });
      });
      /* the trees at the back of the island, dark, with lights in them */
      L.back = T.bake(-W / 2 - 80, 300, W + 160, 340, (g) => {
        const r = T.rng(321);
        for (let i = 0; i < 16; i++) {
          const x = -W / 2 - 40 + i * (W + 80) / 15 + (r() - 0.5) * 40, h = 110 + r() * 130, y = 600;
          if (x > g0.EDGE - 40) continue;
          P.line(g, x, y, x + (r() - 0.5) * 8, y - h * 0.5, 7, '#232546');
          for (let k = 0; k < 9; k++) { const a = r() * TAU, d = r() * h * 0.28; P.fill(g, P.ellipse(x + Math.cos(a) * d * 1.2, y - h * 0.62 + Math.sin(a) * d * 0.7, h * (0.16 + r() * 0.1), h * (0.13 + r() * 0.08)), ['#262a50', '#2b2e58', '#30305c'][k % 3]); }
          for (let k = 0; k < 6; k++) { const lx = x + (r() - 0.5) * h * 0.5, ly = y - h * (0.35 + r() * 0.45); blob(g, lx, ly, 10, ['#ffe7a8', '#d6ecff', '#ffd3dc'][k % 3], 0.5); P.fill(g, P.circle(lx, ly, 1.8), '#fff8e8'); }
        }
        g.fillStyle = '#262a4e'; g.fillRect(-W / 2 - 80, 596, g0.EDGE + W / 2 + 40, 44);
      });
      /* the island: grass, the stream's bed, the edge with its roots, the old tree */
      L.isle = T.bake(-W / 2 - 80, -80, W + 160, 1020, (g) => {
        const EDGE = g0.EDGE, r = T.rng(332);
        /* the side of the island beyond its edge, going down into the cloud, roots hanging off the lip */
        const face = P.soft([[EDGE - 50, 598], [EDGE + 30, 606], [EDGE + 74, 660], [EDGE + 96, 760], [EDGE + 70, 880], [EDGE + 20, 960], [EDGE - 10, 960], [EDGE + 10, 700]]);
        const fg = g.createLinearGradient(EDGE, 600, EDGE + 90, 900);
        fg.addColorStop(0, '#4a4678'); fg.addColorStop(0.5, '#34305e'); fg.addColorStop(1, '#25244c');
        g.fillStyle = fg; g.fill(face);
        g.save(); g.clip(face);
        g.strokeStyle = 'rgba(20,16,40,0.3)'; g.lineWidth = 2;
        for (let i = 0; i < 7; i++) { const y = 640 + i * 40; g.beginPath(); g.moveTo(EDGE, y); g.quadraticCurveTo(EDGE + 50, y + 14, EDGE + 110, y - 6); g.stroke(); }
        g.restore();
        g.strokeStyle = 'rgba(170,180,240,0.4)'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(EDGE + 30, 606); g.quadraticCurveTo(EDGE + 80, 650, EDGE + 96, 760); g.stroke();
        g.lineCap = 'round';
        for (let i = 0; i < 22; i++) {
          const x = EDGE - 6 + r() * 96, y = 604 + r() * 60 * (x - EDGE + 10) / 100, len = 60 + r() * 240, sw = (r() - 0.3) * 60;
          g.strokeStyle = ['#211d36', '#2c2644', '#3a3252'][i % 3]; g.lineWidth = 1.2 + r() * 3.4;
          g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + 22, y + len * 0.3, x + sw, y + len * 0.65, x + sw * 1.3 + 14, y + len); g.stroke();
          if (i % 4 === 0) { g.strokeStyle = 'rgba(150,170,230,0.25)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x - 1, y); g.bezierCurveTo(x + 21, y + len * 0.3, x + sw - 1, y + len * 0.65, x + sw * 1.3 + 13, y + len); g.stroke(); }
        }
        /* the ground: moonlit blue-green going back, deep violet close to us */
        const gp = P.soft([[-W / 2 - 100, 600], [-W * 0.3, 592], [0, 598], [EDGE - 60, 596], [EDGE + 4, 612], [EDGE + 14, 700], [EDGE + 4, 820], [EDGE - 6, 960], [-W / 2 - 100, 960]]);
        const gr = g.createLinearGradient(0, 590, 0, 940);
        gr.addColorStop(0, '#24507a'); gr.addColorStop(0.3, '#244470'); gr.addColorStop(0.7, '#262f66'); gr.addColorStop(1, '#1c1a4a');
        g.fillStyle = gr; g.fill(gp);
        g.save(); g.clip(gp);
        /* soft patches of moss and shadow, a band of moonlight, warm pools under the tree */
        for (let i = 0; i < 46; i++) blob(g, -W / 2 + r() * (W * 0.86 + 40), 620 + r() * 300, 50 + r() * 120, ['#2f6a80', '#1e2a62', '#3a6a88', '#2a2266'][i % 4], 0.35);
        blob(g, -W * 0.3, 640, 420, '#7a8ad0', 0.16);
        blob(g, g0.TX - 80, 690, 420, '#ffcf8a', 0.2);
        blob(g, -W * 0.24, 690, 300, '#ffd9a0', 0.16);
        /* the stream's bed, and the grass round it lit by the water */
        const SS = g0.SS;
        for (let i = 0; i < SS.length; i += 3) blob(g, SS[i][0], SS[i][1], 30 + SS[i][2] * 3, '#8aa8ff', 0.16);
        g.lineCap = 'round';
        for (let i = 1; i < SS.length; i++) { g.strokeStyle = 'rgba(20,24,70,0.45)'; g.lineWidth = SS[i][2] * 1.9 + 4; g.beginPath(); g.moveTo(SS[i - 1][0], SS[i - 1][1] + 2); g.lineTo(SS[i][0], SS[i][1] + 2); g.stroke(); }
        for (let i = 1; i < SS.length; i++) { g.strokeStyle = '#3a52a0'; g.lineWidth = SS[i][2] * 1.5; g.beginPath(); g.moveTo(SS[i - 1][0], SS[i - 1][1]); g.lineTo(SS[i][0], SS[i][1]); g.stroke(); }
        /* pebbles along its banks */
        for (let i = 0; i < SS.length; i += 2) { const q = SS[i], s = (r() < 0.5 ? -1 : 1); P.fill(g, P.ellipse(q[0] + (r() - 0.5) * 10, q[1] + s * (q[2] * 0.95 + 3), 3 + q[2] * 0.12, 1.8 + q[2] * 0.06), ['#5a6a9a', '#7a86b8', '#4a5482'][i % 3]); }
        g.restore();
        /* grass along the back and in clumps */
        tufts(g, -W / 2 - 80, EDGE, () => 600, 300, 333, ['#3f6476', '#527886', '#2f4a62', '#6a7aa8'], 22, 0.1);
        for (let i = 0; i < 34; i++) { const cx = -W / 2 + r() * (W * 0.86), cy = 640 + r() * 250; tufts(g, cx - 34, cx + 34, () => cy, 18, 340 + i, ['#4c7480', '#3a5a72', '#62868e', '#7a86b8'], 16 + (cy - 600) * 0.07, 0.1); }
        /* glowing flowers and mushrooms */
        for (let i = 0; i < 36; i++) {
          const x = -W / 2 + 30 + r() * (W * 0.84), y = 630 + r() * 260, c = ['#9fd8ff', '#ffb8d8', '#f6f0b0', '#c8b4ff'][i % 4];
          if (i % 3 === 0) { blob(g, x, y - 10, 22, c, 0.45); P.fill(g, P.rr(x - 1.5, y - 10, 3, 10, 1.5), '#d8d0e0'); P.fill(g, P.ellipse(x, y - 11, 7, 4.2), c); P.fill(g, P.ellipse(x - 2, y - 13, 3, 1.4), 'rgba(255,255,255,0.7)'); }
          else { blob(g, x + 2, y - 15, 14, c, 0.5); P.line(g, x, y, x + 2, y - 14, 1.4, '#4c7480'); for (let p = 0; p < 5; p++) { const a = (p / 5) * TAU; P.fill(g, P.circle(x + 2 + Math.cos(a) * 2.6, y - 15 + Math.sin(a) * 2.6, 2), c); } P.fill(g, P.circle(x + 2, y - 15, 1.4), '#fffbe8'); }
        }
        /* the old tree: roots, trunk and limbs (thinning as they go), lit by the moon on one side and its lights below */
        const TX = g0.TX, TY = g0.TY, BARK = '#3b3150';
        for (let i = 0; i < 7; i++) {
          const a = -Math.PI + (i / 6) * Math.PI, rl = 100 + r() * 70, w = 30 - Math.abs(i - 3) * 4;
          P.fill(g, limbPath([TX + Math.cos(a) * 18, TY - 30, TX + Math.cos(a) * rl * 0.55, TY - 14, TX + Math.cos(a) * rl, TY + 8 + r() * 16, w, 3]), BARK);
        }
        const all = [g0.trunk].concat(g0.limbs);
        for (const L of all) P.fill(g, limbPath(L), BARK);
        for (const L of all) {
          if (L[6] < 5) continue;
          const lit = [L[0] - L[6] * 0.28, L[1] - L[6] * 0.12, L[2] - L[6] * 0.28, L[3] - L[6] * 0.12, L[4] - L[7] * 0.25, L[5] - L[7] * 0.1, L[6] * 0.3, L[7] * 0.3];
          P.fill(g, limbPath(lit), 'rgba(140,150,215,0.18)');
          const warm = [L[0] + L[6] * 0.22, L[1] + L[6] * 0.26, L[2] + L[6] * 0.22, L[3] + L[6] * 0.26, L[4] + L[7] * 0.2, L[5] + L[7] * 0.22, L[6] * 0.24, L[7] * 0.24];
          P.fill(g, limbPath(warm), 'rgba(255,186,140,0.14)');
        }
        g.strokeStyle = 'rgba(24,16,36,0.4)'; g.lineWidth = 2;
        for (let i = 0; i < 7; i++) { g.beginPath(); g.moveTo(TX - 30 + i * 10, TY + 4); g.quadraticCurveTo(TX - 32 + i * 8, TY - 120, TX - 26 + i * 6, TY - 240); g.stroke(); }
        P.fill(g, P.ellipse(TX - 2, TY - 128, 10, 16), '#241c34');   /* a knot-hole */
        /* the drooping twigs the low lights hang from */
        for (const c of g0.cand) {
          P.fill(g, limbPath([c.droop[0], c.droop[1], c.droop[2], c.droop[3], c.droop[4], c.droop[5], 6, 2]), BARK);
          for (let k = 0; k < 6; k++) { const p = qAt(c.droop, 0.22 + k * 0.13); P.fill(g, P.ellipse(p[0] + (k % 2 ? 8 : -8), p[1] + 3, 9, 3.8, k % 2 ? 0.7 : -0.7), ['#33506e', '#45648a'][k % 2]); }
        }
        /* leaves in clusters round the tips and along the upper limbs: shade, body, moonlight, then a warm rim from the lights below */
        const seeds = g0.tips.concat(g0.leafy);
        const cl = seeds.map((q) => { const out = []; const n = 6 + Math.floor(r() * 4); for (let i = 0; i < n; i++) { const a = r() * TAU, d = r() * 38; out.push([q[0] + Math.cos(a) * d * 1.35, q[1] + Math.sin(a) * d * 0.75 - 8, 14 + r() * 15]); } return out; });
        for (const [c, k, dx, dy, a] of [['#1a2040', 1.1, 3, 9, 0.95], ['#263458', 0.92, 0, 2, 0.95], ['#30466e', 0.72, -4, -4, 0.92], ['#4a6090', 0.44, -8, -9, 0.85], ['#6a7ab0', 0.2, -10, -12, 0.7]]) {
          g.globalAlpha = a; g.fillStyle = c;
          for (const q of cl) for (const b of q) { g.beginPath(); g.arc(b[0] + dx, b[1] + dy, b[2] * k, 0, TAU); g.fill(); }
        }
        g.globalAlpha = 0.42; g.fillStyle = '#9a7088';
        for (const q of cl) for (const b of q) { g.beginPath(); g.arc(b[0] + 2, b[1] + b[2] * 0.5, b[2] * 0.4, 0.1, Math.PI - 0.1); g.fill(); }
        g.globalAlpha = 1;
        for (let i = 0; i < 900; i++) { const q = seeds[Math.floor(r() * seeds.length)], a = r() * TAU, d = 22 + r() * 40; P.fill(g, P.ellipse(q[0] + Math.cos(a) * d * 1.3, q[1] + Math.sin(a) * d * 0.8 - 6, 4.2, 2.2, a), ['#3f5580', '#2c3b62', '#56659a', '#6a6aa0', '#7a6a98'][i % 5]); }
      }, 1.1);
      /* close to the eye: ferns and grass in the corners */
      L.front = T.bake(-W / 2 - 80, 700, W + 160, 240, (g) => {
        const r = T.rng(351);
        const fern = (x, y, s, a, c) => { g.save(); g.translate(x, y); g.rotate(a); g.strokeStyle = c; g.lineWidth = 3 * s; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(10 * s, -70 * s, 40 * s, -120 * s); g.stroke(); for (let k = 1; k < 12; k++) { const u = k / 12, p = [20 * s * u * u + 10 * s * u, -120 * s * u], l = (1 - u) * 34 * s + 6 * s; P.fill(g, P.ellipse(p[0] - l * 0.5, p[1] + 3, l * 0.55, 3.2 * s, -0.35), c); P.fill(g, P.ellipse(p[0] + l * 0.5, p[1] + 3, l * 0.55, 3.2 * s, 0.35), c); } g.restore(); };
        for (let i = 0; i < 6; i++) fern(-W / 2 + 20 + r() * 220, 950, 1.1 + r() * 0.5, -0.5 + r() * 0.7, ['#1a1f36', '#20263e'][i % 2]);
        for (let i = 0; i < 5; i++) fern(W / 2 - 40 - r() * 200, 950, 1 + r() * 0.5, 0.1 + r() * 0.5, ['#1a1f36', '#20263e'][i % 2]);
        tufts(g, -W / 2 - 80, W / 2 + 80, () => 930, 120, 352, ['#1c2138', '#232a44'], 46, 0);
        for (let i = 0; i < 8; i++) { const x = (r() - 0.5) * W, y = 900 + r() * 20; blob(g, x, y - 30, 14, ['#9fd8ff', '#ffb8d8'][i % 2], 0.5); P.fill(g, P.circle(x, y - 30, 3), '#f4f0ff'); }
      });
      return L;
    };

    /* ---------- the low lights ---------- */
    const lightPos = (q, t) => { const a = Math.sin(t * 0.9 + q.i * 1.7) * 0.06 + C[q.i].sway * Math.sin(t * 7 + q.i) * 0.2; return [q.droop[4] + Math.sin(a) * 30, q.droop[5] + 30 - (1 - Math.cos(a)) * 30]; };
    function candScreen(i) { const g0 = layout(), q = g0.cand[i], p = lightPos(q, V.t), sp = T.par(0.6); return [p[0] + sp[0], p[1] + sp[1]]; }
    function humming() { return C.some((c) => V.t - c.song < phraseLen(c.phr) + 0.2); }
    function hum(i, vel) {
      const c = C[i], A = AU();
      c.song = V.t;
      let at = 0;
      for (const n of c.phr) { A.note({ m: n[0], at, vel: vel || 0.36, voice: 'hum', dur: Math.max(0.55, n[1] * BEAT * 1.15) }); at += n[1] * BEAT; }
    }
    V.find = function () {
      V.finding = true; V.picked = null; V.tries = 0; V.idle = 0;
      V.note = '빛을 눌러 들어 보세요. 아나가 릴리에게 불러 주던 노래를 찾아요';
      return new Promise((res) => { V.foundRes = res; });
    };
    function tap(i) {
      if (!V.finding || V.picked) return;
      V.idle = 0;
      const c = C[i], playing = V.t - c.song < phraseLen(c.phr);
      if (!playing) hum(i);   /* already singing (the pointer rested on it): let it finish, do not start it over */
      if (c.right) {
        V.picked = { i, phase: 'hum', t0: playing ? c.song : V.t };
        V.note = null;
        return;
      }
      c.sway = 1; V.tries++;
      V.note = V.tries >= 2 ? '다른 사람의 노래예요. 스튜 김처럼 하얀 김이 오르는 빛이 있어요' : '다른 사람의 노래예요. 다른 빛도 들어 보세요';
    }
    function hit(x, y) {
      const g0 = layout();
      let best = -1, bd = 58;
      g0.cand.forEach((q, i) => { const p = candScreen(i), d = Math.hypot(x - p[0], y - p[1]); if (d < bd) { bd = d; best = i; } });
      return best;
    }
    let hov = -1, hovT = 0;
    V.pointer = function (type, x, y) {
      if (!V.finding || V.picked) { hov = -1; return false; }
      const i = hit(x, y);
      if (type === 'move') { if (i !== hov) { hov = i; hovT = 0; } T.cursor(i >= 0 ? 'pointer' : 'default'); return i >= 0; }
      if (type === 'down' && i >= 0) { tap(i); return true; }
      return false;
    };
    V.key = function (key) {
      if (!V.finding || V.picked) return false;
      if (key >= '1' && key <= '4') { tap(+key - 1); return true; }
      return false;
    };
    V.want = () => (V.finding && !V.picked ? 'key:' + (V.answer + 1) : V.finding ? 'busy' : null);
    V.hintAt = () => (V.finding && !V.picked ? candScreen(V.answer) : null);
    /* where the light is in his hands (for the dream tray to fly from) */
    V.heldAt = () => { const h = V.held; if (!h) return [0, 450]; const sp = T.par(0.6); return [h.x + sp[0], h.y + sp[1]]; };
    V.letGo = () => { if (V.held) V.held.out = true; };

    V.update = function (dt) {
      V.t += dt; V.idle += dt;
      V.stepWalkers(dt);
      const g0 = layout(), A = AU();
      for (const c of C) { c.sway = Math.max(0, c.sway - dt * 0.5); }
      /* resting the pointer on a light is enough to hear it */
      if (hov >= 0 && V.finding && !V.picked) { hovT += dt; if (hovT > 0.35 && !humming() && V.t - C[hov].song > 0.4) { hum(hov); hovT = -99; } }
      /* now and then one of the others hums a note to itself */
      if (!humming() && V.t > (V.nextHum || 2)) {
        V.nextHum = V.t + 2.2 + Math.random() * 2.6;
        const q = g0.amb[Math.floor(Math.random() * g0.amb.length)];
        if (q) { q.glow = 1; A.note({ m: [72, 74, 77, 79, 81, 84][Math.floor(Math.random() * 6)], vel: 0.07, voice: 'hum', dur: 1.6 }); }
      }
      for (const q of g0.amb) q.glow = Math.max(0, q.glow - dt * 0.6);
      for (const f of flies) { f.ph += dt * f.sp; f.x += Math.sin(f.ph * 0.7) * dt * 14 + dt * 5; f.y += Math.cos(f.ph) * dt * 9; if (f.x > 900) f.x = -900; }
      /* the right one, once it has sung: it lets go and comes down into his hands */
      const pk = V.picked, leo = V.actor('leo');
      if (pk && pk.phase === 'hum' && V.t - pk.t0 > phraseLen(LULLABY) + 0.5) {
        const p = lightPos(g0.cand[pk.i], V.t);
        pk.phase = 'fall'; pk.t0 = V.t; pk.from = p;
        A.sfx('star', 0.5);
      }
      if (pk && pk.phase === 'fall') {
        const k = T.clamp((V.t - pk.t0) / 2.6), e = T.ease.io(k), to = V.hands || [-T.view.W * 0.25 + 20, GY - 140];
        V.held = { x: T.lerp(pk.from[0], to[0], e) + Math.sin(k * Math.PI * 2.5) * 26 * (1 - k), y: T.lerp(pk.from[1], to[1] - 8, e), out: false, a: 1 };
        if (k >= 1) { pk.phase = 'held'; A.sfx('join'); A.note({ m: 81, vel: 0.2, voice: 'glass', dur: 3 }); const r = V.foundRes; V.foundRes = null; V.finding = false; if (r) r(); }
      }
      if (pk && pk.phase === 'held' && V.held) { const to = V.hands || [V.held.x, V.held.y]; V.held.x = to[0]; V.held.y = to[1] - 8; if (V.held.out) V.held.a = Math.max(0, V.held.a - dt * 1.4); }
      /* Leo looks up at the lights, reaches for the one that comes down, and holds it */
      if (leo && !leo.pose) leo.pose = (q, t) => {
        const p = V.picked;
        if (p && (p.phase === 'fall' || p.phase === 'held')) { q.armF = { a: 1.05, b: 1.25 }; q.armB = { a: 0.95, b: 1.3 }; q.headTilt = p.phase === 'held' ? 0.12 : -0.1; q.face = Object.assign({}, q.face, { eye: p.phase === 'held' ? 'happy' : 'open' }); return; }
        if (p && p.phase === 'hum') { q.armF = { hand: F.local(q, lightPos(layout().cand[p.i], V.t)[0], lightPos(layout().cand[p.i], V.t)[1] + 30) }; q.headTilt = -0.36; return; }
        q.headTilt = -0.26 + Math.sin(t * 0.5) * 0.05;
      };
      if (leo && !leo.prop) leo.prop = (g, j) => { V.hands = [(j.handF[0] + j.handB[0]) / 2, (j.handF[1] + j.handB[1]) / 2]; };
    };

    V.draw = function (g, t) {
      const W = T.view.W;
      V.ensure();
      const g0 = layout(), tt = V.t;
      /* the night sky, a moon, and the stars */
      const sky = g.createLinearGradient(0, 0, 0, 640);
      sky.addColorStop(0, '#151a40'); sky.addColorStop(0.45, '#2c2c66'); sky.addColorStop(0.8, '#55508e'); sky.addColorStop(1, '#7a6aa2');
      g.fillStyle = sky; g.fillRect(-W / 2, 0, W, 900);
      starField(g, W, t, 110, 41, 0, 460, 1);
      const mp = T.par(0.06), mx = W * 0.27 + mp[0], my = 408 + mp[1];
      P.glow(g, mx, my, 260, '#c9c4ff', 0.32); P.glow(g, mx, my, 90, '#fff6e6', 0.4);
      P.fill(g, P.circle(mx, my, 34), '#fbf4e4'); P.fill(g, P.circle(mx + 9, my - 6, 30), 'rgba(226,222,246,0.55)');
      V.blit(g, 'far', 0.08, Math.sin(t * 0.03) * 10);
      V.blit(g, 'mid', 0.22, Math.sin(t * 0.05 + 1) * 8, Math.sin(t * 0.3) * 2);
      V.blit(g, 'back', 0.4);
      for (const f of flies) if (!f.front && f.y < 600) { const a = 0.5 + 0.5 * Math.sin(t * 2.3 + f.ph * 3); P.glow(g, f.x, f.y - 120, 8, '#e8ffb0', 0.5 * a); }
      V.blit(g, 'isle', 0.6);
      const sp = T.par(0.6);
      g.save(); g.translate(sp[0], sp[1]);
      /* the stream of light, running to the edge and over it */
      const SS = g0.SS;
      g.save(); g.globalCompositeOperation = 'screen'; g.lineCap = 'round';
      for (const [k, c, a] of [[1.4, '#4a62c0', 0.28], [0.95, '#7ea4ff', 0.36], [0.4, '#dce8ff', 0.4]]) {
        g.strokeStyle = T.rgba(c, a);
        for (let i = 1; i < SS.length; i++) { g.lineWidth = SS[i][2] * k; g.beginPath(); g.moveTo(SS[i - 1][0], SS[i - 1][1]); g.lineTo(SS[i][0], SS[i][1]); g.stroke(); }
      }
      /* glints going downstream */
      for (let j = 0; j < 46; j++) {
        const u = ((tt * (0.05 + (j % 5) * 0.008) + j * 0.137) % 1), f = u * (SS.length - 1), i = Math.floor(f), q = SS[i], q2 = SS[Math.min(SS.length - 1, i + 1)], k = f - i;
        const x = T.lerp(q[0], q2[0], k), y = T.lerp(q[1], q2[1], k), w = q[2], off = Math.sin(j * 2.3) * w * 0.4;
        g.globalAlpha = Math.sin(u * Math.PI) * (0.5 + 0.5 * Math.sin(tt * 5 + j));
        g.strokeStyle = j % 3 ? '#ffffff' : '#fff0c8'; g.lineWidth = 1.2 + w * 0.06;
        const dx = q2[0] - q[0], dy = q2[1] - q[1], l = Math.hypot(dx, dy) || 1, len = 4 + w * 0.5;
        g.beginPath(); g.moveTo(x - (dx / l) * len - (dy / l) * off, y - (dy / l) * len + (dx / l) * off); g.lineTo(x + (dx / l) * len - (dy / l) * off, y + (dy / l) * len + (dx / l) * off); g.stroke();
      }
      g.globalAlpha = 1;
      /* over the edge: a thin fall of light down the side of the island into the cloud */
      const E = SS[SS.length - 1];
      for (let i = 0; i < 4; i++) { g.strokeStyle = T.rgba(i % 2 ? '#d8e6ff' : '#9ab8ff', 0.22 - i * 0.03); g.lineWidth = 20 - i * 4; g.beginPath(); g.moveTo(E[0], E[1]); g.bezierCurveTo(E[0] + 30, E[1] + 12, E[0] + 34 + i * 3, E[1] + 110, E[0] + 30 + i * 5, 920); g.stroke(); }
      for (let j = 0; j < 3; j++) { g.setLineDash([14 + j * 6, 26 + j * 10]); g.lineDashOffset = -tt * (80 + j * 30) - j * 17; g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(E[0] - 3 + j * 4, E[1]); g.bezierCurveTo(E[0] + 27 + j * 4, E[1] + 14, E[0] + 30 + j * 5, E[1] + 110, E[0] + 30 + j * 7, 920); g.stroke(); }
      g.setLineDash([]);
      P.glow(g, E[0] + 30, 890, 150, '#9ab8ff', 0.3); P.glow(g, E[0] + 8, E[1] + 4, 40, '#e6f0ff', 0.4);
      g.restore();
      /* every wish in the tree: a thread, a little fruit of light */
      g.save(); g.globalCompositeOperation = 'screen';
      for (const q of g0.amb) {
        const a = Math.sin(t * q.w + q.ph) * q.amp, x = q.ax + Math.sin(a) * q.len, y = q.ay + Math.cos(a) * q.len;
        g.strokeStyle = 'rgba(255,230,190,0.14)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(q.ax, q.ay); g.lineTo(x, y); g.stroke();
        const pulse = 0.75 + 0.25 * Math.sin(t * (1.1 + q.w) + q.ph * 3) + q.glow * 0.9;
        P.glow(g, x, y, q.rad * 9 * pulse, q.c, 0.42 * pulse);
        P.glow(g, x, y, q.rad * 2.6, q.c, 0.85);
        P.glow(g, x, y, q.rad * 1.2, '#fffdf4', 0.9);
      }
      g.restore();
      /* the four low ones, larger: a papery husk lit from inside */
      g0.cand.forEach((q, i) => {
        const c = C[i];
        if (V.picked && V.picked.i === i && V.picked.phase !== 'hum') return;
        const p = lightPos(q, tt);
        const since = tt - c.song, sing = since < phraseLen(c.phr) + 0.2;
        const per = phraseLen(c.phr) + c.rest, idle = phraseGlow(c.phr, (tt + i * 1.3) % per);
        const lv = sing ? phraseGlow(c.phr, since) : idle * 0.75;
        g.strokeStyle = 'rgba(255,230,190,0.5)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(q.droop[4], q.droop[5]); g.lineTo(p[0], p[1] - 14); g.stroke();
        husk(g, p[0], p[1], c.col, 0.55 + lv * 0.6, t, i);
        if (sing) {
          for (let k = 0; k < 2; k++) { const u = ((since * 0.9 + k * 0.5) % 1); g.strokeStyle = T.rgba(T.mix(c.col, '#ffffff', 0.4), (1 - u) * 0.75); g.lineWidth = 2.2; g.beginPath(); g.arc(p[0], p[1], 20 + u * 54, 0, TAU); g.stroke(); }
          /* a mote for every note, drifting up */
          let at = 0;
          c.phr.forEach((n, j) => { const age = since - at; if (age > 0 && age < 1.8) { const ga = 1 - age / 1.8; g.fillStyle = T.rgba('#fffbea', ga); g.beginPath(); g.arc(p[0] + Math.sin(j * 2.2) * 18 + Math.sin(age * 3 + j) * 4, p[1] - 24 - age * 42, 2.4 + n[1] * 0.6, 0, TAU); g.fill(); P.glow(g, p[0] + Math.sin(j * 2.2) * 18, p[1] - 24 - age * 42, 10, c.col, 0.6 * ga); } at += n[1] * BEAT; });
        }
        if (c.right) steam(g, p[0], p[1] - 16, t, sing ? 1 : 0.55);
      });
      for (const f of flies) if (!f.front && f.y >= 600) { const a = 0.5 + 0.5 * Math.sin(t * 2.3 + f.ph * 3); P.glow(g, f.x, f.y - 160, 7, '#e8ffb0', 0.55 * a); }
      V.drawActors(g, t);
      /* the one in his hands */
      const h = V.held;
      if (h && h.a > 0.01) { g.save(); g.globalAlpha = h.a; husk(g, h.x, h.y, C[V.answer].col, 1.1, t, 9); steam(g, h.x, h.y - 16, t, 0.8); g.restore(); }
      if (V.finding && !V.picked && V.idle > (V.tries >= 2 ? 5 : 10)) { const q = lightPos(g0.cand[V.answer], tt); P.beacon(g, q[0], q[1], 44, t, T.clamp((V.idle - 5) / 2), '#fff0c8'); }
      g.restore();
      V.blit(g, 'front', 1.2, Math.sin(t * 0.3) * 4);
      for (const f of flies) if (f.front) { const a = 0.5 + 0.5 * Math.sin(t * 2 + f.ph * 3); P.glow(g, f.x * 1.1, f.y + 20, 14, '#e8ffb0', 0.5 * a); P.glow(g, f.x * 1.1, f.y + 20, 3, '#ffffff', 0.8 * a); }
      if (V.fade.a < 1) { g.fillStyle = T.rgba('#151a36', 1 - V.fade.a); g.fillRect(-W / 2, 0, W, 900); }
      V.caption(g);
    };
    /* a lantern-fruit: a papery husk, glowing from inside */
    function husk(g, x, y, c, k, t, seed) {
      const kk = Math.min(1, k);
      P.glow(g, x, y + 2, 78 * k, c, 0.5 * kk);
      P.glow(g, x, y + 2, 26 * k, c, 0.6 * kk);
      const w = 14, h = 18;
      const p = new Path2D();
      p.moveTo(x, y - h); p.bezierCurveTo(x + w * 1.2, y - h * 0.6, x + w * 1.1, y + h * 0.5, x, y + h * 0.9); p.bezierCurveTo(x - w * 1.1, y + h * 0.5, x - w * 1.2, y - h * 0.6, x, y - h);
      g.fillStyle = T.rgba(T.mix(c, '#fff6e6', 0.12), 0.62 + 0.3 * kk); g.fill(p);
      g.save(); g.clip(p); P.glow(g, x, y + 4, 16, T.mix(c, '#ffffff', 0.6), 0.95 * kk); P.glow(g, x - 4, y - 4, 6, '#ffffff', 0.5 * kk); g.restore();
      g.strokeStyle = T.rgba(T.shade(c, -0.4), 0.6); g.lineWidth = 1;
      for (const s of [-0.6, 0, 0.6]) { g.beginPath(); g.moveTo(x, y - h); g.quadraticCurveTo(x + w * s * 1.4, y, x, y + h * 0.9); g.stroke(); }
      P.fill(g, P.ellipse(x, y - h + 1, 5, 2.4), '#5d7a5a');
      void t; void seed;
    }
    /* the stew's steam: three wisps going up and out */
    function steam(g, x, y, t, k) {
      g.save(); g.lineCap = 'round';
      P.glow(g, x, y - 16, 22, '#fff3dc', 0.3 * k);
      for (let i = 0; i < 3; i++) {
        const life = (t * 0.33 + i / 3) % 1, a = Math.sin(life * Math.PI) * 0.75 * k, x0 = x + (i - 1) * 6, y0 = y - 2 - life * 26;
        g.strokeStyle = T.rgba('#fff8ee', a); g.lineWidth = 2.8 - life * 1.4;
        g.beginPath(); g.moveTo(x0, y0); g.bezierCurveTo(x0 + 7, y0 - 8, x0 - 7, y0 - 17, x0 + Math.sin(t * 1.6 + i) * 4, y0 - 28); g.stroke();
      }
      g.restore();
    }
    return V;
  }

  /* ================= the wind post office ================= */
  /* a letter on the wing: an envelope with two paper wings at its top corners. mark: what is on its face
     ('star' is a child's star in crayon; 'moon' is crayon too; 'seal', 'stamp', 'flower', 'ribbon', 'ink' are other people's) */
  function envelope(g, x, y, s, rot, flap, paper, mark, a) {
    g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
    if (a != null && a < 1) g.globalAlpha *= a;
    const up = flap == null ? 0.35 : 0.5 + 0.5 * Math.sin(flap);
    const wing = (side) => {
      const tipX = side * (47 - 6 * Math.abs(up - 0.5)), tipY = 12 - 46 * up, midY = -6 - 24 * up;
      g.fillStyle = T.shade(paper, -0.08);
      g.beginPath(); g.moveTo(side * 20, -10); g.quadraticCurveTo(side * 36, midY - 6, tipX, tipY); g.lineTo(side * 38, (tipY + 6) * 0.5 + 3); g.lineTo(side * 31, (tipY + 6) * 0.35 + 6); g.lineTo(side * 20, 5); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(96,74,110,0.3)'; g.lineWidth = 0.8; g.stroke();
      g.strokeStyle = 'rgba(96,74,110,0.2)'; g.beginPath(); g.moveTo(side * 21, -2); g.lineTo(tipX * 0.9, tipY * 0.8 + 2); g.stroke();
    };
    if (flap !== false) { wing(-1); wing(1); }
    P.fill(g, P.rr(-21, -10, 46, 29, 3), 'rgba(70,50,100,0.16)');
    P.fill(g, P.rr(-23, -14, 46, 29, 3), paper);
    g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect(-21, -13, 42, 1.6);
    g.fillStyle = 'rgba(90,60,110,0.12)'; g.fillRect(-21, 12, 42, 2.4);
    markOn(g, mark);
    g.restore();
  }
  function markOn(g, mark) {
    const lines = (c, w, wob) => { g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; for (let i = 0; i < 3; i++) { const y = -4 + i * 5.4, x1 = -17 + (i === 2 ? 0 : 0), x2 = 1 - i * 4; g.beginPath(); g.moveTo(x1, y); if (wob) { for (let x = x1; x <= x2; x += 3) g.lineTo(x, y + Math.sin(x * 1.3 + i * 2) * 1.1); } else g.lineTo(x2, y); g.stroke(); } };
    if (mark === 'star') {   /* a child's star, in crayon, and the address in crayon too */
      lines('#4a78b0', 1.6, true);
      const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? 3.8 : 8.6; pts.push([12 + Math.cos(a) * rr + (i % 3 - 1) * 0.5, 1 + Math.sin(a) * rr]); }
      P.fill(g, P.poly(pts), '#f6c843');
      g.strokeStyle = '#e48a32'; g.lineWidth = 1.3; g.lineJoin = 'round'; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0] + 0.4, p[1] - 0.3) : g.moveTo(p[0] + 0.4, p[1] - 0.3))); g.closePath(); g.stroke();
      g.strokeStyle = 'rgba(228,138,50,0.5)'; g.lineWidth = 0.9; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(8 + i * 2, -3 + i); g.lineTo(13 + i * 2, -1 + i); g.stroke(); }
      return;
    }
    if (mark === 'moon') {
      lines('#7a6a9a', 1.6, true);
      g.fillStyle = '#7fa6dc'; g.beginPath(); g.arc(12, 1, 8, 0.6, TAU - 0.6 + Math.PI * 0.2, false); g.arc(15.5, -1, 6.4, TAU - 0.4, 0.9, true); g.closePath(); g.fill();
      g.strokeStyle = '#4f72a8'; g.lineWidth = 1; g.stroke();
      return;
    }
    lines('#4a4058', 1, false);
    if (mark === 'seal') { P.fill(g, P.circle(12, 3, 6.6), '#c4443a'); P.fill(g, P.circle(12, 3, 4.2), '#a83630'); P.fill(g, P.ellipse(16, 8, 2, 3, 0.5), '#c4443a'); g.strokeStyle = 'rgba(255,220,200,0.6)'; g.lineWidth = 0.8; g.beginPath(); g.arc(12, 3, 3, 3.5, 5.5); g.stroke(); }
    else if (mark === 'stamp') { P.fill(g, P.rr(8, -11, 13, 15, 1), '#f8f2e6'); P.fill(g, P.rr(9.5, -9.5, 10, 12, 1), '#7fb0c9'); P.fill(g, P.circle(14.5, -4, 2.6), '#f6d6a0'); g.strokeStyle = 'rgba(60,50,80,0.45)'; g.lineWidth = 0.8; g.beginPath(); g.arc(6, -2, 6, 0, TAU); g.stroke(); for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(10, -6 + i * 3); g.quadraticCurveTo(15, -8 + i * 3, 22, -6 + i * 3); g.stroke(); } }
    else if (mark === 'flower') { P.line(g, 12, 9, 10, 2, 1, '#6a8f5a'); for (let p = 0; p < 5; p++) { const an = (p / 5) * TAU; P.fill(g, P.ellipse(12 + Math.cos(an) * 3.4, 1 + Math.sin(an) * 3.4, 2.6, 1.8, an), '#ef9ab4'); } P.fill(g, P.circle(12, 1, 1.6), '#f1c04a'); }
    else if (mark === 'ribbon') { P.line(g, -23, 2, 23, 2, 1.6, '#7f9f6a'); P.line(g, 6, -14, 6, 15, 1.6, '#7f9f6a'); P.fill(g, P.ellipse(3, 0, 4, 2.4, 0.5), '#7f9f6a'); P.fill(g, P.ellipse(9, 0, 4, 2.4, -0.5), '#7f9f6a'); }
    else { g.strokeStyle = 'rgba(60,50,80,0.5)'; g.lineWidth = 0.9; g.beginPath(); g.arc(13, 0, 6, 0, TAU); g.stroke(); g.beginPath(); g.arc(13, 0, 3.6, 0, TAU); g.stroke(); }
  }
  /* a magpie, standing (fly 0) or on the wing (fly 1). Faces +x unless flip */
  function magpie(g, x, y, s, t, o = {}) {
    g.save(); g.translate(x, y); g.scale((o.flip ? -1 : 1) * s, s);
    const fly = o.fly || 0, flap = fly ? Math.sin(t * 15 + (o.ph || 0)) : 0, tilt = o.tilt || 0;
    g.save(); g.rotate(-0.15 + (o.tail || 0) * 0.3 - fly * 0.15);
    P.fill(g, P.poly([[-8, -4], [-46, -16], [-48, -8], [-10, 4]]), '#1f2c3f'); P.line(g, -44, -12, -47, -11, 2, '#3a6aa0');
    g.restore();
    P.fill(g, P.ellipse(0, -2, 16, 10, -0.15), '#1c2232'); P.fill(g, P.ellipse(3, 3, 10, 6, -0.1), '#f4f1ea');
    g.save(); g.translate(12, -9); g.rotate(tilt);
    P.fill(g, P.circle(0, 0, 7.2), '#1c2232'); P.fill(g, P.poly([[6, -1.6], [14, 0.6], [6, 2.2]]), '#2a2a30'); P.fill(g, P.circle(2.6, -1.8, 1.4), '#fff');
    g.restore();
    g.save(); g.translate(-2, -6); g.rotate(-0.3 - flap * 0.8 - fly * 0.2); P.fill(g, P.ellipse(-8, -5, 17, 6.4, -0.3), '#24304a'); P.fill(g, P.ellipse(-3, -3, 7, 3, -0.3), '#f4f1ea'); P.line(g, -20, -7, -14, -4, 1.4, '#3a6aa0'); g.restore();
    if (!fly) { P.line(g, -2, 7, -4, 15, 1.6, '#2a2a30'); P.line(g, 4, 7, 4, 15, 1.6, '#2a2a30'); }
    g.restore();
  }
  function post(o) {
    const LAND = 712;
    const POSTMAN = Object.assign({}, F.styles.post, { hair: '#ebe6dc', beard: '#ebe6dc' });
    const V = base(o, {
      dark: false, mood: 'walk', chord: 3,
      spots: { leo: [-320, LAND, 'ground'], bean: [-394, LAND, 'ground'], desk: [166, LAND, 'ground'], ground: [-320, LAND, 'ground'] },
      actors: () => [
        { id: 'leo', style: F.leoAt(o.leoAge == null ? 2 : o.leoAge), at: 'leo', face: { mouth: 'smile' } },
        { id: 'bean', dog: true, at: 'bean', s: 150, sit: 1 },
        { id: 'post', style: POSTMAN, s: 146, at: 'desk', flip: true, lean: 0.08, face: { old: true, mouth: 'smile' }, prop: satchel },
      ],
    });
    walkers(V);
    V.t = 0; V.idle = 0;
    function satchel(g, j) {
      const h = j.hip, sh = j.shoulder, u = j.u;
      P.line(g, sh[0] + 4 * u * j.sx, sh[1], h[0] - 9 * u * j.sx, h[1] - 2 * u, 2.2 * u, '#6b4a34');
      P.fill(g, P.rr(h[0] - 16 * u, h[1] - 6 * u, 15 * u, 12 * u, 2.5 * u), '#8a5a3b'); P.fill(g, P.rr(h[0] - 16 * u, h[1] - 6 * u, 15 * u, 4 * u, 2 * u), '#a87050');
      P.fill(g, P.rr(h[0] - 12 * u, h[1] - 9 * u, 9 * u, 5 * u, 1), '#fbf3e0');
    }
    let G = null;
    function layout() {
      const W = T.view.W;
      if (G && G.W === W) return G;
      const BX = W * 0.06, BW = 360, TOPY = 204, LX = -W * 0.2;
      const cub = [], cols = 6, rows = 6, gx0 = BX + 24, gy0 = TOPY + 64, cw = (BW - 48) / cols, ch = (LAND - 196 - gy0) / rows;
      for (let rI = 0; rI < rows; rI++) for (let c = 0; c < cols; c++) cub.push([gx0 + (c + 0.5) * cw, gy0 + (rI + 0.5) * ch]);
      const R = [LX + 22, LAND - 172];
      /* the letters in the air, each on its own loop in front of the house; Lily's comes down past his hand */
      const rr = T.rng(17), loops = [];
      const PAP = ['#fbf3e0', '#f3e6f0', '#e6eef8', '#fff6dc', '#eef3e2', '#f6e8dc', '#efe8f8'];
      const MK = ['star', 'moon', 'seal', 'stamp', 'flower', 'ribbon', 'ink'];
      for (let i = 0; i < 7; i++) {
        let pts;
        if (i === 0) pts = [[R[0] + 6, R[1] + 4], [R[0] + 190, R[1] - 60], [BX - 40, 360], [BX + 150, 262], [BX - 150, 196], [LX + 140, 300], [LX - 50, 420]];
        else {
          const cx = T.lerp(LX + 40, BX + 150, (i - 1) / 5) + (rr() - 0.5) * 60, cy = 200 + ((i * 3) % 5) * 70 + rr() * 30, rx = 120 + rr() * 110, ry = 60 + rr() * 60, ph = rr() * TAU, n = 6;
          pts = [];
          for (let k = 0; k < n; k++) { const a = ph + (k / n) * TAU * (i % 2 ? 1 : -1); pts.push([cx + Math.cos(a) * rx * (0.8 + rr() * 0.4), Math.min(LAND - 140, cy + Math.sin(a) * ry * (0.8 + rr() * 0.4))]); }
          if (i === 2 || i === 4) pts[1] = [R[0] + 40 + rr() * 30, R[1] + 10];   /* some others come low past him too */
        }
        loops.push({ i, pts, per: i === 0 ? 11 : 9 + rr() * 5, u: i === 0 ? 0.55 : rr(), paper: PAP[i], mark: MK[i], ph: rr() * TAU, slow: 1, boost: 0, x: pts[0][0], y: pts[0][1], vx: 0, phase: 'fly' });
      }
      const perch = [[BX + BW * 0.24, TOPY - 36], [BX + BW * 0.5, TOPY - 158], [BX + BW * 0.77, TOPY - 30]];
      G = { W, BX, BW, TOPY, LX, R, cub, cw, ch, loops, perch };
      V.spots.leo = [LX, LAND, 'ground']; V.spots.bean = [LX - 74, LAND, 'ground']; V.spots.desk = [BX + 74, LAND, 'ground']; V.spots.ground = V.spots.leo;
      return G;
    }
    V.layout = layout;
    /* where a letter is on its loop: a closed Catmull-Rom through its points */
    function loopAt(L, u) {
      const pts = L.pts, n = pts.length, f = (((u % 1) + 1) % 1) * n, i = Math.floor(f), t = f - i, t2 = t * t, t3 = t2 * t;
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      const c = (j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3);
      return [c(0), c(1)];
    }
    const birds = [], arrivals = [];
    V.bake = function () {
      const W = T.view.W, L = {}, g0 = layout();
      L.far = T.bake(-W / 2 - 80, 220, W + 160, 520, (g) => {
        isle(g, -W * 0.38, 420, 130, 401, { haze: '#d6d2ee', hazeA: 0.62, arches: 2, c: '#c8c0dc', tower: false });
        isle(g, -W * 0.02, 380, 90, 402, { haze: '#dcd6f0', hazeA: 0.66, arches: 2, c: '#cbc2dc' });
        cloudRow(g, -W / 2 - 120, W / 2 + 120, 640, 280, 403, { lit: '#fffaf2', shade: '#cdbfe0', a: 0.95, sun: -1 });
      });
      L.mid = T.bake(-W / 2 - 80, 420, W + 160, 520, (g) => {
        g.fillStyle = '#e4d6ea'; g.fillRect(-W / 2 - 80, 760, W + 160, 180);
        cloudRow(g, -W / 2 - 160, W / 2 + 160, 740, 320, 411, { lit: '#fffaf0', shade: '#c6b2d6', a: 1, sun: -1 });
        cloudRow(g, -W / 2 - 160, W / 2 + 160, 830, 340, 412, { lit: '#fff6ec', shade: '#bca8d0', a: 1, sun: -1 });
      });
      /* the cliff of cloud, the post office built into it, and the landing in front */
      L.house = T.bake(-W / 2 - 80, -100, W + 160, 1040, (g) => {
        const { BX, BW, TOPY } = g0, r = T.rng(421), CX = BX - 46;
        /* a tower of cloud going up out of the frame, lit from the left */
        const body = P.soft([[CX + 30, -120], [CX - 10, 120], [CX + 6, 360], [CX - 24, 620], [CX - 40, 960], [W / 2 + 120, 960], [W / 2 + 120, -120]]);
        const bg = g.createLinearGradient(CX, 0, W / 2, 0); bg.addColorStop(0, '#f6eaf0'); bg.addColorStop(0.4, '#ddd0e8'); bg.addColorStop(1, '#c6b6dc');
        g.fillStyle = bg; g.fill(body);
        g.save(); g.clip(body);
        for (let i = 0; i < 70; i++) { const x = CX + r() * (W / 2 + 120 - CX), y = -100 + r() * 1040, rad = 60 + r() * 90, lx = (x - CX) / (W / 2 + 120 - CX); blob(g, x + 10, y + 14, rad, T.mix('#c9b6dc', '#ad98c8', lx), 0.55); blob(g, x - rad * 0.25, y - rad * 0.28, rad * 0.7, T.mix('#fff6ee', '#e2d6ec', lx), 0.6); }
        g.restore();
        for (let y = -90; y < 960; y += 64) { const x = CX + Math.sin(y * 0.02) * 16 - (y > 600 ? (y - 600) * 0.06 : 0), rad = 54 + r() * 40; blob(g, x + 8, y + 10, rad, '#c8b4da', 0.8); blob(g, x - 10, y - 12, rad * 0.76, '#fff7ef', 0.85); }
        /* the house: a tall front of pigeonholes under a gable */
        const wallP = P.poly([[BX, LAND], [BX, TOPY], [BX + BW, TOPY], [BX + BW, LAND]]);
        KIT.wallFill(g, wallP, [BX, TOPY - 4, BW, LAND - TOPY + 8], { c: '#e4c49e', sun: -1, shade: '#7a5f9a', shadeA: 0.34, lit: '#fff0d8', litA: 0.3 });
        /* boards running up the wall */
        g.strokeStyle = 'rgba(120,80,60,0.18)'; g.lineWidth = 1.2; for (let x = BX + 12; x < BX + BW; x += 18) { g.beginPath(); g.moveTo(x, TOPY + 4); g.lineTo(x, LAND); g.stroke(); }
        /* the pigeonholes */
        const fr = '#a77c5c';
        P.fill(g, P.rr(BX + 16, TOPY + 56, BW - 32, g0.ch * 6 + 16, 4), fr);
        g0.cub.forEach((c, i) => {
          const w = g0.cw - 8, h = g0.ch - 8, x = c[0] - w / 2, y = c[1] - h / 2;
          const ig = g.createLinearGradient(0, y, 0, y + h); ig.addColorStop(0, '#4c3a5e'); ig.addColorStop(1, '#6e5a80');
          g.fillStyle = ig; g.fillRect(x, y, w, h);
          g.fillStyle = 'rgba(255,236,210,0.3)'; g.fillRect(x, y + h - 3, w, 3);
          if (r() < 0.55) {   /* letters waiting in it */
            const n = 1 + Math.floor(r() * 3);
            for (let k = 0; k < n; k++) { const lw = w * (0.5 + r() * 0.3), lh = h * (0.35 + r() * 0.25); g.save(); g.translate(x + 6 + k * 6 + lw / 2, y + h - 3 - lh / 2); g.rotate((r() - 0.5) * 0.3); P.fill(g, P.rr(-lw / 2, -lh / 2, lw, lh, 1.5), ['#fbf3e0', '#f3e6f0', '#e6eef8', '#fff6dc'][Math.floor(r() * 4)]); if (r() < 0.4) P.fill(g, P.rr(lw / 2 - 7, -lh / 2 + 2, 5, 5, 0.8), ['#c4443a', '#7fb0c9', '#e9b93a'][Math.floor(r() * 3)]); g.restore(); }
          }
          if (i % 3 === 1) P.fill(g, P.rr(c[0] - 6, y + h + 1.5, 12, 3.4, 1), '#d7a23c');
        });
        /* the counter window with its awning, and the door */
        const wx = BX + 28, wy = LAND - 156, ww = 170, wh = 92;
        const wg = g.createLinearGradient(0, wy, 0, wy + wh); wg.addColorStop(0, '#ffe2b0'); wg.addColorStop(1, '#f2b57e');
        P.fill(g, P.rr(wx - 6, wy - 6, ww + 12, wh + 10, 4), '#8a6248'); g.fillStyle = wg; g.fillRect(wx, wy, ww, wh);
        for (let i = 0; i < 5; i++) P.fill(g, P.rr(wx + 12 + i * 32, wy + 30, 22, 30, 2), 'rgba(120,80,70,0.25)');   /* the sorting shelves inside */
        P.fill(g, P.rr(wx - 12, wy + wh - 4, ww + 24, 12, 3), '#b98a5a'); g.fillStyle = 'rgba(255,240,210,0.5)'; g.fillRect(wx - 10, wy + wh - 4, ww + 20, 2);
        for (let i = 0; i < 8; i++) { const sx = wx - 14 + i * (ww + 28) / 8; P.fill(g, P.poly([[sx, wy - 34], [sx + (ww + 28) / 8, wy - 34], [sx + (ww + 28) / 8, wy - 12], [sx + (ww + 28) / 16, wy - 4], [sx, wy - 12]]), i % 2 ? '#fbeee0' : '#e3877a'); }
        P.fill(g, P.rr(wx - 16, wy - 38, ww + 32, 6, 2), '#c66e62');
        const dx = BX + BW - 118, dy = LAND - 178;
        const door = new Path2D(); door.moveTo(dx, LAND); door.lineTo(dx, dy + 40); door.arc(dx + 44, dy + 40, 44, Math.PI, 0); door.lineTo(dx + 88, LAND); door.closePath();
        P.fill(g, P.rr(dx - 8, dy - 12, 104, LAND - dy + 12, 44), '#a77c5c'); g.fillStyle = '#8f78a8'; g.fill(door);
        g.strokeStyle = 'rgba(60,40,80,0.3)'; g.lineWidth = 2; g.beginPath(); g.moveTo(dx + 44, dy); g.lineTo(dx + 44, LAND); g.stroke();
        P.fill(g, P.rr(dx + 14, dy + 92, 22, 5, 2), '#d7a23c'); P.fill(g, P.circle(dx + 54, dy + 110, 3.4), '#d7a23c');
        /* the gable, its clock, the tiles, a little bell-cote and a weathervane */
        const gable = P.poly([[BX - 30, TOPY + 6], [BX + BW / 2, TOPY - 104], [BX + BW + 30, TOPY + 6]]);
        const rg = g.createLinearGradient(BX, 0, BX + BW, 0); rg.addColorStop(0, '#e9a08e'); rg.addColorStop(1, '#b47288');
        g.fillStyle = rg; g.fill(gable);
        Dt.tiles(g, gable, BX - 30, BX + BW + 30, TOPY - 104, TOPY + 6, 422);
        P.fill(g, P.rr(BX - 34, TOPY + 2, BW + 68, 9, 3), '#8a5a68');
        Dt.clock(g, BX + BW / 2, TOPY - 34, 22, 7, 10);
        P.fill(g, P.rr(BX + BW / 2 - 18, TOPY - 140, 36, 38, 4), '#e4c49e'); P.fill(g, P.poly([[BX + BW / 2 - 26, TOPY - 138], [BX + BW / 2, TOPY - 162], [BX + BW / 2 + 26, TOPY - 138]]), '#c07a86');
        P.fill(g, P.circle(BX + BW / 2, TOPY - 118, 8), '#5a4766'); P.fill(g, P.soft([[BX + BW / 2 - 6, TOPY - 112], [BX + BW / 2, TOPY - 125], [BX + BW / 2 + 6, TOPY - 112]]), '#d7a23c');
        P.line(g, BX + BW / 2, TOPY - 162, BX + BW / 2, TOPY - 186, 2.4, '#5a4a5e');
        const vy = TOPY - 182;
        P.fill(g, P.poly([[BX + BW / 2 - 30, vy], [BX + BW / 2 + 22, vy], [BX + BW / 2 + 22, vy - 4], [BX + BW / 2 - 30, vy - 4]]), '#5a4a5e');
        P.fill(g, P.poly([[BX + BW / 2 + 22, vy - 8], [BX + BW / 2 + 34, vy - 2], [BX + BW / 2 + 22, vy + 4]]), '#5a4a5e');
        P.fill(g, P.rr(BX + BW / 2 - 40, vy - 10, 16, 11, 1.5), '#fbf3e0'); g.strokeStyle = '#5a4a5e'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(BX + BW / 2 - 40, vy - 10); g.lineTo(BX + BW / 2 - 32, vy - 4); g.lineTo(BX + BW / 2 - 24, vy - 10); g.stroke();
        /* a sign on an iron arm: an envelope with wings */
        const hook = KIT.bracket(g, BX, TOPY + 240, -70, 1);
        void hook;
        const sx = BX - 56, sy = TOPY + 290;
        P.line(g, sx - 12, TOPY + 252, sx - 12, sy - 24, 1.6, '#433a4c'); P.line(g, sx + 12, TOPY + 252, sx + 12, sy - 24, 1.6, '#433a4c');
        P.fill(g, P.circle(sx, sy, 30), '#a77c5c'); P.fill(g, P.circle(sx, sy, 26), '#fbf3e0');
        envelope(g, sx, sy + 4, 0.8, 0, 2.2, '#fbf3e0', 'ink');
        /* ivy up the corner and a ladder on its rail */
        Dt.ivy(g, BX + 6, LAND, 300, 423, 34);
        g.save(); g.strokeStyle = '#8a6248'; g.lineWidth = 5; g.lineCap = 'round';
        const lx0 = BX + BW - 150, lx1 = BX + BW - 100;
        g.beginPath(); g.moveTo(lx0, LAND - 182); g.lineTo(lx0 + 30, TOPY + 120); g.moveTo(lx1, LAND - 182); g.lineTo(lx1 + 30, TOPY + 120); g.stroke();
        g.lineWidth = 3; for (let i = 0; i < 11; i++) { const u = (i + 0.5) / 11, y = T.lerp(LAND - 182, TOPY + 120, u), x = T.lerp(lx0, lx0 + 30, u); g.beginPath(); g.moveTo(x, y); g.lineTo(x + (lx1 - lx0), y); g.stroke(); }
        P.line(g, BX + 20, TOPY + 112, BX + BW - 20, TOPY + 112, 3, '#6b5a6a');
        g.restore();
        /* the landing: boards over the cloud, on posts */
        const x0 = -W / 2 - 90, x1 = BX + BW + 90;
        for (let x = x0 + 60; x < x1; x += 160) { P.fill(g, P.rr(x - 9, LAND + 20, 18, 260, 4), '#8a6a6a'); g.strokeStyle = '#7a5a62'; g.lineWidth = 5; g.beginPath(); g.moveTo(x, LAND + 40); g.lineTo(x + 80, LAND + 150); g.stroke(); }
        P.fill(g, P.rr(x0, LAND, x1 - x0, 30, 3), '#b98a6a');
        Dt.boards(g, x0, LAND + 4, x1 - x0, 26, 424, { bh: 13 });
        g.fillStyle = 'rgba(255,240,214,0.55)'; g.fillRect(x0, LAND, x1 - x0, 3);
        g.fillStyle = 'rgba(80,50,90,0.25)'; g.fillRect(x0, LAND + 24, x1 - x0, 6);
        /* sacks of letters, parcels tied with string, a pot of flowers by the door */
        const sack = (x, s) => { P.fill(g, P.soft([[x - 26 * s, LAND], [x - 30 * s, LAND - 30 * s], [x - 14 * s, LAND - 56 * s], [x + 12 * s, LAND - 58 * s], [x + 30 * s, LAND - 30 * s], [x + 26 * s, LAND]]), '#d8c4a0'); P.fill(g, P.ellipse(x - 2 * s, LAND - 58 * s, 10 * s, 6 * s), '#c4ae88'); g.strokeStyle = '#8a6a48'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 12 * s, LAND - 52 * s); g.lineTo(x + 10 * s, LAND - 52 * s); g.stroke(); for (let k = 0; k < 3; k++) P.fill(g, P.rr(x - 10 * s + k * 7 * s, LAND - 70 * s - k * 3, 12 * s, 16 * s, 1), ['#fbf3e0', '#f3e6f0', '#e6eef8'][k]); };
        sack(BX - 70, 1); sack(BX - 128, 0.8);
        for (let k = 0; k < 3; k++) { const px = BX + BW - 6 + (k % 2) * 16, py = LAND - k * 22; P.fill(g, P.rr(px, py - 22, 40 - k * 6, 22, 2), ['#c9a07a', '#b98a64', '#d8b48a'][k]); P.line(g, px + 18 - k * 3, py - 22, px + 18 - k * 3, py, 1.4, '#7a5a48'); }
        Dt.flowers(g, dx - 20, LAND - 2, 1.1, 425);
        Dt.lantern(g, -W * 0.34, LAND, 0, {}, 1.1, 0.35, 1);
        /* and the cloud it is built into, coming round its far side and its foot */
        for (let i = 0; i < 9; i++) { const y = TOPY - 60 + i * 70, x = BX + BW + 14 + Math.sin(i * 1.7) * 14, rad = 46 + (i % 3) * 14; blob(g, x + 10, y + 10, rad, '#c6b2d8', 0.85); blob(g, x - 6, y - 8, rad * 0.74, '#fbf2f0', 0.9); }
        for (let i = 0; i < 4; i++) { const x = BX + BW * (0.65 + i * 0.12), y = TOPY - 20 + i * 12; blob(g, x, y, 36, '#fbf2f0', 0.7); }
      }, 1.05);
      L.front = T.bake(-W / 2 - 80, 760, W + 160, 180, (g) => {
        cloudRow(g, -W / 2 - 100, W / 2 + 120, 940, 280, 431, { lit: '#fffaf2', shade: '#c4aed4', a: 1, sun: -1 });
      });
      return L;
    };
    /* ---------- catching the letter ---------- */
    const letterAt = (L) => { const sp = T.par(0.6); return [L.x + sp[0], L.y + sp[1]]; };
    function nearest(x, y, lim) { const g0 = layout(); let best = null, bd = lim; for (const L of g0.loops) { if (L.phase !== 'fly') continue; const p = letterAt(L), d = Math.hypot(x - p[0], y - p[1]); if (d < bd) { bd = d; best = L; } } return best; }
    function grab(L) {
      if (!V.catching || V.caught) return;
      V.idle = 0;
      if (L.mark === 'star') {
        V.caught = L; L.phase = 'caught'; L.k = 0; L.from = [L.x, L.y]; V.note = null;
        AU().sfx('paper'); AU().sfx('join');
        return;
      }
      L.boost = 1; V.misses = (V.misses || 0) + 1;
      AU().sfx('paper'); AU().note({ m: 79, vel: 0.12, voice: 'pluck', dur: 0.3 });
      V.note = '다른 사람에게 가는 편지예요. 크레파스로 그린 별을 찾아요';
    }
    let hov = null;
    V.catchLetter = function () {
      layout();
      V.catching = true; V.caught = null; V.idle = 0; V.misses = 0;
      V.note = '날아다니는 편지 가운데, 크레파스 별이 그려진 걸 눌러 잡아요';
      return new Promise((res) => { V.caughtRes = res; });
    };
    V.pointer = function (type, x, y) {
      if (!V.catching || V.caught) { hov = null; return false; }
      const L = nearest(x, y, 62);
      if (type === 'move') { hov = L; T.cursor(L ? 'pointer' : 'default'); return !!L; }
      if (type === 'down' && L) { grab(L); return true; }
      return false;
    };
    /* with keys: the letter nearest his raised hand */
    const inReach = (L) => Math.hypot(L.x - layout().R[0], L.y - layout().R[1]);
    const reachable = () => { let best = null, bd = 96; for (const L of layout().loops) { const d = inReach(L); if (L.phase === 'fly' && d < bd) { bd = d; best = L; } } return best; };
    V.key = function (key) {
      if (!V.catching || V.caught) return false;
      if (key !== ' ' && key !== 'Enter') return false;
      const L = reachable();
      if (L) grab(L); else V.reach = 1;
      return true;
    };
    V.want = function () {
      if (!V.catching) return null;
      if (V.caught) return 'busy';
      const L = reachable();
      return L && L.mark === 'star' ? 'key:Enter' : 'busy';
    };
    V.hintAt = () => (V.catching && !V.caught ? letterAt(layout().loops[0]) : null);

    V.update = function (dt) {
      V.t += dt; V.idle += dt; V.reach = Math.max(0, (V.reach || 0) - dt * 2);
      V.stepWalkers(dt);
      const g0 = layout(), A = AU();
      for (const L of g0.loops) {
        L.slow += ((hov === L ? 0.28 : 1) - L.slow) * Math.min(1, dt * 4);
        L.boost = Math.max(0, L.boost - dt * 0.7);
        if (L.phase === 'fly') {
          const sp = L.slow * (1 + L.boost * 2.2);
          L.u += (dt / L.per) * sp;
          const p = loopAt(L, L.u);
          L.vx = (p[0] - L.x) / Math.max(dt, 1e-4); L.x = p[0]; L.y = p[1];
          L.ph += dt * (9 + 10 * L.boost) * (0.6 + 0.4 * Math.max(0, Math.sin(V.t * 0.7 + L.i)));
        } else if (L.phase === 'caught') {
          L.k = Math.min(1, L.k + dt / 0.9);
          const to = V.hand || g0.R, e = T.ease.io(L.k);
          L.x = T.lerp(L.from[0], to[0], e); L.y = T.lerp(L.from[1], to[1], e) - Math.sin(e * Math.PI) * 40; L.ph += dt * 6;
          if (L.k >= 1) { L.phase = 'held'; const r = V.caughtRes; V.caughtRes = null; V.catching = false; if (r) r(); }
        } else if (L.phase === 'held') { const to = V.hand || g0.R; L.x = to[0] + 8; L.y = to[1] - 6; }
      }
      /* new ones coming in on the wind, and going home to their pigeonholes */
      if (V.t > (V.nextIn || 1)) {
        V.nextIn = V.t + 1.4 + Math.random() * 1.8;
        const c = g0.cub[Math.floor(Math.random() * g0.cub.length)];
        arrivals.push({ from: [-T.view.W / 2 - 60, 140 + Math.random() * 300], to: c, k: 0, dur: 4.5 + Math.random() * 2, ph: Math.random() * 9, paper: ['#fbf3e0', '#f3e6f0', '#e6eef8', '#fff6dc', '#eef3e2'][Math.floor(Math.random() * 5)], mark: ['seal', 'stamp', 'flower', 'ink', 'ribbon'][Math.floor(Math.random() * 5)], bend: (Math.random() - 0.5) * 200 });
      }
      for (let i = arrivals.length - 1; i >= 0; i--) { const q = arrivals[i]; q.k += dt / q.dur; q.ph += dt * 10; if (q.k >= 1.15) arrivals.splice(i, 1); }
      /* a gust now and then */
      if (V.t > (V.nextGust || 3)) { V.nextGust = V.t + 6 + Math.random() * 5; A.sfx('wind'); }
      /* the magpies: one on the wing, now and then trading places */
      if (!birds.length) g0.perch.forEach((p, i) => birds.push({ p: i, x: p[0], y: p[1], flip: i === 2, tilt: 0, tail: 0, fly: 0, ph: i * 2 }));
      for (const b of birds) {
        b.tilt = Math.sin(V.t * 1.3 + b.ph) * 0.25 + (Math.sin(V.t * 0.37 + b.ph * 3) > 0.92 ? 0.5 : 0);
        b.tail = Math.max(0, Math.sin(V.t * 2.1 + b.ph * 5) - 0.85) * 4;
      }
      if (V.t > (V.nextHop || 6)) {
        V.nextHop = V.t + 7 + Math.random() * 6;
        const b = birds[Math.floor(Math.random() * birds.length)];
        if (b && !b.go) { b.go = { k: 0, from: [b.x, b.y], to: g0.perch[(b.p + 1) % 3].slice() }; b.p = (b.p + 1) % 3; A.note({ m: 86, vel: 0.08, voice: 'pluck', dur: 0.12 }); A.note({ m: 86, at: 0.13, vel: 0.07, voice: 'pluck', dur: 0.12 }); }
      }
      for (const b of birds) if (b.go) {
        b.go.k = Math.min(1, b.go.k + dt / 1.6); const e = T.ease.io(b.go.k);
        b.x = T.lerp(b.go.from[0], b.go.to[0], e); b.y = T.lerp(b.go.from[1], b.go.to[1], e) - Math.sin(e * Math.PI) * 60; b.fly = Math.sin(e * Math.PI) > 0.1 ? 1 : 0; b.flip = b.go.to[0] < b.go.from[0];
        if (b.go.k >= 1) { b.go = null; b.fly = 0; }
      }
      /* Leo: watching them go round, then a hand up for the one he wants */
      const leo = V.actor('leo');
      if (leo && !leo.pose) leo.pose = (q, t) => {
        if (V.caught) { q.armF = { hand: F.local(q, q.x + (q.flip ? -1 : 1) * 26, q.y - 18 * (q.s / 150)) }; q.headTilt = 0.22; q.face = Object.assign({}, q.face, { eye: 'happy' }); return; }
        if (V.catching) { const R = layout().R; q.armF = { hand: F.local(q, R[0], R[1] + 8) }; q.headTilt = -0.3; return; }
        q.headTilt = -0.2 + Math.sin(t * 0.6) * 0.08;
      };
      if (leo && !leo.prop) leo.prop = (g, j) => { V.hand = [j.handF[0], j.handF[1] - 4]; };
    };

    V.draw = function (g, t) {
      const W = T.view.W;
      V.ensure();
      const g0 = layout(), tt = V.t;
      const sky = g.createLinearGradient(0, 0, 0, 760);
      sky.addColorStop(0, '#8aa2dc'); sky.addColorStop(0.4, '#bfc2ea'); sky.addColorStop(0.75, '#f2d8e2'); sky.addColorStop(1, '#fff0de');
      g.fillStyle = sky; g.fillRect(-W / 2, 0, W, 900);
      const sp0 = T.par(0.05);
      P.glow(g, -W * 0.36 + sp0[0], 110 + sp0[1], 560, '#fff4d8', 0.75); P.glow(g, -W * 0.36 + sp0[0], 110 + sp0[1], 120, '#ffffff', 0.7);
      V.blit(g, 'far', 0.1, Math.sin(t * 0.05) * 16);
      /* wind across the sky */
      g.save(); g.lineCap = 'round';
      for (let i = 0; i < 12; i++) {
        const sp = 70 + (i % 4) * 30, len = 140 + (i % 3) * 80, x = -W / 2 - len + ((tt * sp + i * 377) % (W + len * 2)), y = 90 + ((i * 97) % 520);
        g.strokeStyle = 'rgba(255,255,255,' + (0.18 + (i % 3) * 0.06) + ')'; g.lineWidth = 1.6 + (i % 2);
        g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + len * 0.3, y - 10, x + len * 0.6, y + 12, x + len, y - 4 + Math.sin(tt + i) * 6); g.stroke();
      }
      g.restore();
      V.blit(g, 'mid', 0.25, Math.sin(t * 0.06 + 1) * 10, Math.sin(t * 0.3) * 3);
      V.blit(g, 'house', 0.6);
      const sp = T.par(0.6);
      g.save(); g.translate(sp[0], sp[1]);
      /* the lantern on the landing, faintly lit by day */
      P.glow(g, -W * 0.34 + 22, LAND - 81, 40, '#ffd98a', 0.3);
      /* magpies on the roof */
      for (const b of birds) magpie(g, b.x, b.y, 0.95, t, { flip: b.flip, tilt: b.tilt, tail: b.tail, fly: b.fly, ph: b.ph });
      const fl = [g0.BX + g0.BW / 2 + Math.cos(tt * 0.5) * 240, 120 + Math.sin(tt * 0.5) * 50 - 60];
      magpie(g, fl[0], fl[1], 0.8, t, { fly: 1, flip: Math.sin(tt * 0.5) > 0 });
      /* letters coming in to their pigeonholes */
      for (const q of arrivals) {
        const k = Math.min(1, q.k), e = T.ease.io(k), c = [(q.from[0] + q.to[0]) / 2, Math.min(q.from[1], q.to[1]) - 120 + q.bend];
        const v = 1 - e, x = v * v * q.from[0] + 2 * v * e * c[0] + e * e * q.to[0], y = v * v * q.from[1] + 2 * v * e * c[1] + e * e * q.to[1] + Math.sin(q.ph * 0.4) * 8 * (1 - k);
        const s = 0.75 * (q.k > 1 ? Math.max(0, 1 - (q.k - 1) / 0.15) : 1) * (0.7 + 0.3 * (1 - k * 0.6));
        envelope(g, x, y, s, Math.sin(q.ph * 0.3) * 0.2, k < 0.95 ? q.ph : null, q.paper, q.mark);
      }
      V.drawActors(g, t);
      /* the ones flying round in front, Lily's among them */
      for (const L of g0.loops) {
        const rot = T.clamp(L.vx * 0.0016, -0.45, 0.45) + Math.sin(L.ph * 0.25) * 0.08;
        envelope(g, L.x, L.y, L.phase === 'held' ? 0.9 : 1.4, L.phase === 'held' ? -0.25 : rot, L.phase === 'held' ? false : L.ph, L.paper, L.mark);
      }
      if (V.catching && !V.caught) {
        const R = g0.R, near = g0.loops.some((L) => inReach(L) < 96);
        if (near || V.reach > 0) { g.save(); g.strokeStyle = T.rgba('#fff6e0', 0.4 + 0.3 * (V.reach || 0)); g.lineWidth = 2; g.setLineDash([4, 7]); g.lineDashOffset = -t * 8; g.beginPath(); g.arc(R[0], R[1], 50, 0, TAU); g.stroke(); g.restore(); }
        if (V.idle > (V.misses >= 2 ? 5 : 10)) { const L = g0.loops[0]; P.beacon(g, L.x, L.y, 46, t, T.clamp((V.idle - 5) / 2), '#fff0c8'); }
      }
      g.restore();
      V.blit(g, 'front', 1.2, Math.sin(t * 0.25) * 8);
      if (V.fade.a < 1) { g.fillStyle = T.rgba('#fff6e6', 1 - V.fade.a); g.fillRect(-W / 2, 0, W, 900); }
      V.caption(g);
    };
    return V;
  }

  /* ================= the cloud whales ================= */
  /* the whale's body, facing left, nose at x = -300: a soft-edged mass of cloud with a long fin */
  const WHALE_TOP = [[-304, 10], [-292, -20], [-256, -46], [-196, -66], [-110, -78], [-20, -76], [60, -66], [118, -58], [134, -66], [150, -56], [210, -36], [262, -16], [304, -6]];
  const WHALE_BOT = [[304, 6], [250, 18], [170, 40], [70, 62], [-40, 72], [-150, 66], [-230, 50], [-280, 32]];
  function whaleBody(g) {
    const r = T.rng(501);
    const path = P.soft(WHALE_TOP.concat(WHALE_BOT));
    const gr = g.createLinearGradient(0, -80, 0, 74);
    gr.addColorStop(0, '#fbf0f2'); gr.addColorStop(0.35, '#e8dcee'); gr.addColorStop(0.7, '#bfaed8'); gr.addColorStop(1, '#9686bc');
    g.fillStyle = gr; g.fill(path);
    g.save(); g.clip(path);
    /* the sun low on our right: warm along the back and the right of it */
    const sg = g.createLinearGradient(-300, 0, 310, 0); sg.addColorStop(0, 'rgba(255,214,190,0)'); sg.addColorStop(1, 'rgba(255,200,170,0.5)');
    g.fillStyle = sg; g.fillRect(-310, -90, 620, 180);
    /* the grooves under its chin */
    g.strokeStyle = 'rgba(120,100,160,0.35)'; g.lineWidth = 1.6;
    for (let i = 0; i < 7; i++) { const y = 24 + i * 6.5; g.beginPath(); g.moveTo(-282 + i * 6, y - 4); g.quadraticCurveTo(-170, y + 6, -40 + i * 10, y + 2); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,0.12)'; for (let i = 0; i < 26; i++) { g.beginPath(); g.arc(-260 + r() * 520, -60 + r() * 60, 3 + r() * 8, 0, TAU); g.fill(); }
    g.restore();
    /* made of cloud: soft puffs along its back, lit from the right */
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i < 13; i++) {
      const u = 0.1 + ((i + pass * 0.5) / 12.5) * 0.8 + (r() - 0.5) * 0.03, k = u * (WHALE_TOP.length - 1), j = Math.floor(k), f = k - j, a = WHALE_TOP[j], b = WHALE_TOP[Math.min(WHALE_TOP.length - 1, j + 1)];
      const x = T.lerp(a[0], b[0], f) + (r() - 0.5) * 14, y = T.lerp(a[1], b[1], f) + (pass ? 10 : 2) + (r() - 0.5) * 10, rad = (pass ? 16 : 20 + r() * 20) * (1 - Math.abs(u - 0.42) * 0.85);
      blob(g, x - 3, y + 7, rad * 1.25, '#c8b8e0', 0.55); blob(g, x + rad * 0.2, y - rad * 0.12, rad, '#fff6f2', 0.75);
    }
    /* mouth and eye */
    g.strokeStyle = 'rgba(90,70,120,0.55)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-300, 14); g.quadraticCurveTo(-262, 30, -214, 22); g.stroke();
    P.fill(g, P.ellipse(-226, 4, 5.6, 4.6), '#4a3d66'); P.fill(g, P.circle(-227.5, 2.4, 1.6), '#ffffff');
    g.strokeStyle = 'rgba(90,70,120,0.35)'; g.lineWidth = 1.2; g.beginPath(); g.arc(-226, 4, 8.6, 3.6, 5.6); g.stroke();
    /* the long fin, near side */
    const fin = P.soft([[-176, 36], [-120, 44], [-70, 74], [-30, 118], [-46, 124], [-104, 92], [-160, 60]]);
    const fg = g.createLinearGradient(-170, 40, -40, 124); fg.addColorStop(0, '#e2d4ec'); fg.addColorStop(1, '#a898c8');
    g.fillStyle = fg; g.fill(fin);
    g.strokeStyle = 'rgba(255,240,236,0.6)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-170, 38); g.quadraticCurveTo(-90, 52, -34, 116); g.stroke();
  }
  function whales(o) {
    const GY = 708;
    const V = base(o, {
      dark: false, quiet: true, mood: 'still', chord: 1,
      spots: { leo: [-480, GY, 'ground'], beside: [-420, GY, 'ground'], ground: [-480, GY, 'ground'] },
      actors: () => [
        { id: 'leo', style: F.leoAt(o.leoAge == null ? 0 : o.leoAge), at: 'leo', headTilt: -0.06, face: { mouth: 'smile' } },
        { id: 'bean', dog: true, at: 'beside', s: 150, sit: 1, headTilt: -0.1 },
      ],
    });
    walkers(V);
    V.t = 0;
    V.sun.k = o.dusk == null ? 0.15 : o.dusk;
    V.wh = { k: -1, dur: 36, spout: -9, song: 0 };
    let G = null;
    function layout() {
      const W = T.view.W;
      if (G && G.W === W) return G;
      G = { W };
      V.spots.leo = [-W * 0.33, GY, 'ground']; V.spots.beside = [-W * 0.33 + 60, GY, 'ground']; V.spots.ground = V.spots.leo;
      return G;
    }
    V.layout = layout;
    /* the whale and her calf go by, right to left. po: { dur (seconds to cross), from (0..1, how far along to start) } */
    V.pass = function (po = {}) {
      const w = V.wh;
      w.k = po.from || 0; w.dur = po.dur || 36; w.song = V.t + (po.firstSong == null ? 1.2 : po.firstSong);
      return new Promise((res) => { w.res = res; });
    };
    const whaleX = (k) => { const W = T.view.W; return T.lerp(W / 2 + 420, -W / 2 - 560, k); };
    V.bake = function () {
      const W = T.view.W, L = {};
      layout();
      L.far = T.bake(-W / 2 - 80, 300, W + 160, 340, (g) => {
        /* long flat clouds at the horizon, lit underneath by the sun going down */
        const r = T.rng(511);
        for (let i = 0; i < 9; i++) { const y = 340 + i * 26 + r() * 10, x = -W / 2 + r() * W, w = 260 + r() * 420; g.fillStyle = T.rgba(i % 2 ? '#f6c2b8' : '#e8b0c4', 0.35 + r() * 0.25); g.fill(P.soft([[x - w / 2, y], [x - w * 0.2, y - 7 - r() * 6], [x + w * 0.3, y - 5], [x + w / 2, y + 1], [x, y + 5]])); }
        isle(g, -W * 0.08, 520, 90, 512, { haze: '#e7b4c2', hazeA: 0.7, arches: 2, c: '#d6a8bc', tower: false });
        cloudRow(g, -W / 2 - 120, W / 2 + 120, 610, 220, 513, { lit: '#ffd9c6', shade: '#c09ac0', a: 0.9, sun: 1 });
      });
      L.sea = T.bake(-W / 2 - 80, 470, W + 160, 300, (g) => {
        g.fillStyle = '#d6b0c8'; g.fillRect(-W / 2 - 80, 600, W + 160, 170);
        cloudRow(g, -W / 2 - 160, W / 2 + 160, 640, 280, 521, { lit: '#ffdcc8', shade: '#b494c2', a: 1, sun: 1 });
      });
      L.near = T.bake(-W / 2 - 80, 520, W + 160, 420, (g) => {
        g.fillStyle = '#b89ac0'; g.fillRect(-W / 2 - 80, 780, W + 160, 160);
        cloudRow(g, -W / 2 - 180, W / 2 + 180, 764, 340, 531, { lit: '#ffe0cc', shade: '#a888b8', a: 1, sun: 1 });
        cloudRow(g, -W / 2 - 180, W / 2 + 180, 850, 360, 532, { lit: '#ffd8c8', shade: '#9a7cb0', a: 1, sun: 1 });
        cloudRow(g, -W / 2 - 180, W / 2 + 180, 940, 380, 533, { lit: '#f6ccc4', shade: '#8e72a8', a: 1, sun: 1 });
      });
      /* the headland they watch from: long grass, a fence, a lamp */
      L.land = T.bake(-W / 2 - 80, 520, W * 0.7 + 80, 420, (g) => {
        const r = T.rng(541);
        const top = (x) => (x < -W * 0.12 ? GY + Math.sin(x * 0.01) * 4 : GY + Math.pow((x + W * 0.12) / (W * 0.2), 2) * 150);
        const pts = []; for (let x = -W / 2 - 90; x <= W * 0.1; x += 20) pts.push([x, top(x)]);
        pts.push([W * 0.12, 960], [-W / 2 - 90, 960]);
        const path = P.soft(pts);
        const gr = g.createLinearGradient(-W / 2, 0, W * 0.1, 0); gr.addColorStop(0, '#7a8a6a'); gr.addColorStop(0.6, '#98a274'); gr.addColorStop(1, '#c0b07a');
        g.fillStyle = gr; g.fill(path);
        g.save(); g.clip(path);
        const vg = g.createLinearGradient(0, GY, 0, 940); vg.addColorStop(0, 'rgba(255,220,170,0.2)'); vg.addColorStop(0.3, 'rgba(120,90,140,0)'); vg.addColorStop(1, 'rgba(90,70,130,0.55)');
        g.fillStyle = vg; g.fillRect(-W / 2 - 90, GY - 20, W, 300);
        for (let i = 0; i < 40; i++) blob(g, -W / 2 + r() * W * 0.6, GY + 30 + r() * 220, 40 + r() * 70, ['#6a7a62', '#a8a878', '#7a6a8a'][i % 3], 0.3);
        g.restore();
        /* a rim of sunlit grass along the top */
        tufts(g, -W / 2 - 80, W * 0.08, (x) => top(x), 420, 542, ['#b8b47a', '#d6c88a', '#8a9a6a', '#e8c890', '#9a8aa0'], 26, 0.35);
        /* wildflowers */
        for (let i = 0; i < 60; i++) { const x = -W / 2 + r() * (W * 0.55), y = top(x) + 4 + r() * 60; P.line(g, x, y, x + 2, y - 12, 1.2, '#7a8a5a'); P.fill(g, P.circle(x + 2, y - 13, 2.6 + r() * 1.4), ['#f6c2cc', '#fff0d0', '#f1c04a', '#e59ab4', '#c8b0e8'][i % 5]); }
        /* the fence going down the slope, and its rope */
        const posts = [-W * 0.16, -W * 0.08, -W * 0.01, W * 0.05].map((x) => [x, top(x)]);
        posts.forEach((p, i) => { P.fill(g, P.rr(p[0] - 5, p[1] - 60 + i * 2, 10, 62, 3), '#8a6a5a'); g.fillStyle = 'rgba(255,220,180,0.5)'; g.fillRect(p[0] + 2, p[1] - 58 + i * 2, 2, 56); P.fill(g, P.ellipse(p[0], p[1] - 60 + i * 2, 6, 3), '#a8826a'); });
        g.strokeStyle = '#c9b08a'; g.lineWidth = 2.4;
        for (let i = 1; i < posts.length; i++) { const a = posts[i - 1], b = posts[i]; g.beginPath(); g.moveTo(a[0], a[1] - 50); g.quadraticCurveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 22, b[0], b[1] - 48); g.stroke(); }
        V.lamp = Dt.lantern(g, -W * 0.46, top(-W * 0.46), 0, {}, 1.1, 0.6, 1);
      });
      L.front = T.bake(-W / 2 - 80, 720, W + 160, 220, (g) => {
        const r = T.rng(551);
        tufts(g, -W / 2 - 80, -W * 0.05, () => 930, 140, 552, ['#5a5a6e', '#6a6070', '#4e4a62'], 70, 0.3);
        for (let i = 0; i < 9; i++) { const x = -W / 2 + 30 + r() * W * 0.35, y = 900 - r() * 40; P.line(g, x, 940, x + 6, y - 30, 2, '#4e4a62'); P.fill(g, P.ellipse(x + 6, y - 34, 6, 9, 0.2), ['#e59ab4', '#f6c2cc', '#c8a0d8'][i % 3]); }
      });
      L.whale = T.bake(-330, -100, 660, 240, whaleBody);
      return L;
    };
    /* the whale at x, y (its middle), size s: the baked body, a tail that beats slowly, a trail of cloud */
    function drawWhale(g, x, y, s, t, ph, a) {
      g.save(); g.translate(x, y); g.rotate(Math.sin(t * 0.32 + ph) * 0.035); g.scale(s, s);
      if (a != null) g.globalAlpha *= a;
      /* cloud streaming off it behind */
      for (let i = 0; i < 7; i++) { const u = i / 6, wx = 300 + u * 220 + Math.sin(t * 0.7 + i) * 10, wy = -30 + u * 20 + Math.sin(t * 0.5 + i * 1.3) * 8; blob(g, wx, wy, 34 - u * 14, '#fff2f0', 0.4 * (1 - u)); }
      /* the flukes, beating up and down from the tail stock */
      g.save(); g.translate(292, -2); g.rotate(Math.sin(t * 0.55 + ph) * 0.2);
      const fl = P.soft([[0, -6], [30, -18], [62, -54], [78, -50], [66, -8], [72, 30], [58, 36], [30, 14], [0, 6]]);
      const fg = g.createLinearGradient(0, -50, 0, 36); fg.addColorStop(0, '#fbf0f2'); fg.addColorStop(1, '#b4a2d0');
      g.fillStyle = fg; g.fill(fl);
      g.restore();
      const L = V.L.whale; T.blit(g, L);
      g.restore();
    }
    V.update = function (dt) {
      V.t += dt;
      V.stepWalkers(dt);
      const w = V.wh, A = AU(), W = T.view.W;
      if (w.k >= 0 && w.k < 1) {
        w.k = Math.min(1, w.k + dt / w.dur);
        const x = whaleX(w.k);
        /* she sings while she is in sight; the calf answers, higher */
        if (V.t > w.song && x < W / 2 + 200 && x > -W / 2 - 300) {
          w.song = V.t + 7.5 + Math.random() * 3;
          const lo = [45, 43, 47][Math.floor(Math.random() * 3)];
          A.glide({ m0: lo, m1: lo + 7, m2: lo + 3, dur: 4.6, vel: 0.36 });
          A.glide({ m0: lo + 19, m1: lo + 24, dur: 2.2, vel: 0.12, at: 3.6 });
        }
        if (V.t - w.spout > 9.5 && x < W / 2 - 100 && x > -W / 2 + 200) { w.spout = V.t; A.sfx('whoosh'); }
        if (w.k >= 1) { const r = w.res; w.res = null; if (r) r(); }
      }
      const leo = V.actor('leo');
      if (leo && !leo.pose) leo.pose = (q, t) => {
        const x = whaleX(T.clamp(V.wh.k)), d = T.clamp((x - q.x) / 900, -1, 1);
        q.headTilt = -0.08 - Math.max(0, d) * 0.04; q.flip = x < q.x - 40;
      };
    };
    V.draw = function (g, t) {
      const W = T.view.W, k = T.clamp(V.sun.k), tt = V.t;
      V.ensure();
      const sky = g.createLinearGradient(0, 0, 0, 620);
      sky.addColorStop(0, T.mix('#6a64ae', '#3a3a7e', k)); sky.addColorStop(0.38, T.mix('#a886be', '#7a5c9e', k)); sky.addColorStop(0.7, T.mix('#f0a8b2', '#d88a9a', k)); sky.addColorStop(1, T.mix('#ffd2a6', '#f8a888', k));
      g.fillStyle = sky; g.fillRect(-W / 2, 0, W, 900);
      starField(g, W, t, 50, 61, 0, 260, 0.25 + k * 0.6);
      const sp0 = T.par(0.06), sx = W * 0.24 + sp0[0], sy = 470 + k * 40 + sp0[1];
      P.glow(g, sx, sy, 720, '#ffcf9a', 0.55); P.glow(g, sx, sy, 220, '#fff0d4', 0.6);
      P.fill(g, P.circle(sx, sy, 38), T.rgba('#fff2dc', 0.92));
      V.blit(g, 'far', 0.1, Math.sin(t * 0.03) * 10);
      V.blit(g, 'sea', 0.2, Math.sin(t * 0.05 + 2) * 8, Math.sin(t * 0.3) * 2);
      /* the whales, swimming in the cloud: the calf a little behind and farther off */
      const w = V.wh, wp = T.par(0.32);
      if (w.k >= 0 && w.k <= 1) {
        const x = whaleX(w.k), y = 588 + Math.sin(tt * 0.26) * 10;
        g.save(); g.translate(wp[0], wp[1]);
        drawWhale(g, x + 600, y + 26 + Math.sin(tt * 0.3 + 1) * 6, 0.44, t, 1.7, 0.92);
        drawWhale(g, x, y, 1.08, t, 0);
        /* her breath, now and then: a plume of mist and glitter */
        const age = tt - w.spout;
        if (age < 3.2) {
          const bx = x - 150 * 1.08, by = y - 80 * 1.08;
          for (let i = 0; i < 10; i++) { const u = T.clamp(age / 3.2), h = (20 + i * 12) * Math.min(1, age * 1.6), spread = (i - 4.5) * 5 * (0.4 + u); blob(g, bx + spread + Math.sin(i + tt) * 4, by - h, 14 + i * 1.6 + u * 18, '#fff8f4', 0.5 * (1 - u)); }
          g.fillStyle = '#fffbe8'; for (let i = 0; i < 14; i++) { const u = T.clamp(age / 3.2), a = i * 2.4; g.globalAlpha = (1 - u) * (0.5 + 0.5 * Math.sin(tt * 9 + i)); g.beginPath(); g.arc(bx + Math.cos(a) * 40 * u, by - 90 * Math.min(1, age) + Math.sin(a) * 20 * u + u * 30, 1.6, 0, TAU); g.fill(); }
          g.globalAlpha = 1;
        }
        /* birds riding along over her back */
        for (let i = 0; i < 4; i++) { const bx = x - 80 + Math.cos(tt * 0.6 + i * 1.6) * 120, by = y - 150 - i * 14 + Math.sin(tt * 0.9 + i) * 16, f = Math.sin(tt * 9 + i * 2) * 5; g.strokeStyle = '#5a4a6e'; g.lineWidth = 2; g.lineCap = 'round'; g.beginPath(); g.moveTo(bx - 9, by - f); g.quadraticCurveTo(bx - 4, by - 3, bx, by); g.quadraticCurveTo(bx + 4, by - 3, bx + 9, by - f); g.stroke(); }
        /* the cloud she pushes through, curling round her */
        for (let i = 0; i < 5; i++) blob(g, x - 290 + i * 40 + Math.sin(tt + i) * 6, y + 46 + Math.sin(tt * 1.3 + i) * 4, 36, '#ffe6da', 0.45);
        g.restore();
      }
      V.blit(g, 'near', 0.4, Math.sin(t * 0.07) * 10, Math.sin(t * 0.32) * 3);
      V.blit(g, 'land', 0.85);
      const lp = T.par(0.85);
      g.save(); g.translate(lp[0], lp[1]);
      if (V.lamp) { const fl = 0.9 + 0.1 * Math.sin(t * 5.3) * Math.sin(t * 1.7); P.glow(g, V.lamp[0], V.lamp[1], 70 * fl, '#ffd98a', 0.4 + k * 0.3); P.glow(g, V.lamp[0], V.lamp[1], 10, '#fffbe8', 0.8); }
      V.drawActors(g, t);
      g.restore();
      V.blit(g, 'front', 1.2, Math.sin(t * 0.4) * 6);
      if (k > 0.01) { g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = T.rgba('#8a7ab8', 0.3 * k); g.fillRect(-W / 2, 0, W, 900); g.restore(); }
      if (V.fade.a < 1) { g.fillStyle = T.rgba('#fff6e6', 1 - V.fade.a); g.fillRect(-W / 2, 0, W, 900); }
      V.caption(g);
    };
    return V;
  }

  T.place.add('grove', grove);
  T.place.add('post', post);
  T.place.add('whales', whales);
})();
