/* Memory: the photograph → their first flat, one small lit room in a big dark building.
   Pull the wall outward and the house they dream of is chalked across the bricks. */
(function () {
  'use strict';
  const T = window.TYT, P = T.P, F = T.F;
  const TAU = Math.PI * 2;

  const ROOM = { x: -520, y: 384, w: 400, h: 256 };
  const WALL_X = ROOM.x + ROOM.w;   /* the wall you take hold of */
  const SPAN = 640;
  const FLOOR = ROOM.y + ROOM.h;

  const S = (T.scenes.home = { L: {}, p: 0, shown: 0, drag: false, spark: 0, lastNote: 0, joy: { k: 0 }, aim: [0, 0] });
  const M = T.memory(S, { id: 'photo', line: '언젠가, 마당 있는 넓은 집에서 살자.', seed: 5, chord: 0, lineY: 792, size: 66, ink: '#fdf3dc' });

  /* ---- the chalk plan: [from, to, points, width, colour] — drawn in this order as the wall is pulled ---- */
  const W = (pts, amp, seed) => P.wobPts(pts, amp == null ? 1.6 : amp, 30, seed || 1, false);
  const circlePts = (cx, cy, r, n, seed, a0 = 0, a1 = TAU) => {
    const out = [];
    for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * (i / n); const rr = r * (1 + T.noise(i * 0.7, seed) * 0.12); out.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
    return out;
  };
  const CH = '#f6efe0', PINK = '#f3b6ae', YEL = '#f6d88a', GRN = '#bfe0b0';
  const PLAN = [];
  const add = (a, b, pts, w, c, seed) => PLAN.push({ a, b, pts, w: w || 3.2, c: c || CH, seed: seed || PLAN.length + 1 });
  add(0.0, 0.3, W([[WALL_X, FLOOR], [WALL_X + SPAN + 10, FLOOR + 2]], 1.4, 2));
  add(0.08, 0.46, W([[WALL_X + 8, 446], [WALL_X + 200, 338], [WALL_X + 424, 456]], 1.8, 4), 3.6);
  add(0.4, 0.52, W([[WALL_X + 392, 448], [WALL_X + 392, FLOOR]], 1.2, 5));
  add(0.3, 0.4, W([[WALL_X + 272, 372], [WALL_X + 272, 336], [WALL_X + 304, 336], [WALL_X + 304, 390]], 1, 6), 2.8);
  /* door, two windows */
  add(0.42, 0.54, W([[WALL_X + 168, FLOOR], [WALL_X + 168, 548], [WALL_X + 226, 548], [WALL_X + 226, FLOOR]], 1, 8), 3, YEL);
  add(0.5, 0.54, circlePts(WALL_X + 214, 598, 3.5, 8, 9), 2.4, YEL);
  [[WALL_X + 52, 496], [WALL_X + 278, 496]].forEach((o, i) => {
    add(0.44 + i * 0.06, 0.56 + i * 0.06, W([[o[0], o[1]], [o[0] + 70, o[1]], [o[0] + 70, o[1] + 66], [o[0], o[1] + 66], [o[0], o[1]]], 1, 10 + i), 2.8);
    add(0.5 + i * 0.06, 0.58 + i * 0.06, [[o[0] + 35, o[1]], [o[0] + 35, o[1] + 66]], 2.2, CH, 12 + i);
    add(0.52 + i * 0.06, 0.6 + i * 0.06, [[o[0], o[1] + 33], [o[0] + 70, o[1] + 33]], 2.2, CH, 14 + i);
  });
  /* the yard: fence, then the tree with its apples */
  add(0.58, 0.8, W([[WALL_X + 404, 598], [WALL_X + SPAN + 4, 596]], 1.2, 16), 2.8);
  for (let i = 0; i < 9; i++) {
    const x = WALL_X + 418 + i * 27;
    add(0.6 + i * 0.022, 0.66 + i * 0.022, [[x, FLOOR], [x + 1, 584], [x + 7, 576], [x + 13, 584], [x + 12, FLOOR]], 2.4, CH, 20 + i);
  }
  const TX = WALL_X + 528;
  add(0.74, 0.86, W([[TX - 8, FLOOR], [TX - 4, 520], [TX - 22, 486]], 1.6, 30), 3.6);
  add(0.76, 0.86, W([[TX + 10, FLOOR], [TX + 6, 524], [TX + 26, 492]], 1.6, 31), 3.6);
  add(0.8, 0.97, circlePts(TX, 446, 70, 26, 32, -0.5, TAU - 0.2).map((p, i) => [p[0] + Math.sin(i * 1.9) * 9, p[1] * 0.92 + 36 + Math.cos(i * 2.3) * 7]), 3.4, GRN);
  [[-30, 440], [22, 416], [34, 470], [-8, 476]].forEach((o, i) => add(0.9 + i * 0.02, 0.95 + i * 0.02, circlePts(TX + o[0], o[1], 7, 9, 40 + i), 3, PINK));
  const STARS = [[60, 372, 8], [130, 346, 6], [330, 352, 9], [400, 400, 6], [452, 368, 8], [618, 372, 7], [596, 520, 6], [20, 420, 5], [356, 420, 5]].map((q) => [WALL_X + q[0], q[1], q[2]]);
  const LABELS = [
    { at: 0.6, x: WALL_X + 196, y: 430, t: '넓은 부엌', s: 40, c: CH },
    { at: 0.93, x: WALL_X + 458, y: 560, t: '마당', s: 40, c: CH },
  ];

  S.build = function () {
    M.rebuild();
    if (S.bgGen === T.gen && S.L.bg) return;
    S.bgGen = T.gen;
    const V = T.view, x0 = -V.W / 2 - 20, w = V.W + 40;
    S.L.bg = T.bake(x0, 0, w, 900, (g) => {
      /* evening sky and the roofline */
      const sky = g.createLinearGradient(0, 0, 0, 220);
      sky.addColorStop(0, '#8d86ad'); sky.addColorStop(0.6, '#d99f95'); sky.addColorStop(1, '#f5c58d');
      g.fillStyle = sky; g.fillRect(x0, 0, w, 230);
      const r = T.rng(8);
      g.fillStyle = '#5b6a80';
      for (let x = x0; x < x0 + w; x += 90 + r() * 80) g.fillRect(x, 120 + r() * 50, 70 + r() * 70, 120);
      /* the building */
      const wall = '#33505d';
      P.wash(g, P.box(x0, 176, w, 760, 1.2, 3), wall, [x0, 176, w, 760], { seed: 4, len: 240, wid: 34, tone: 0.05, spread: 0.08 });
      P.fill(g, P.box(x0, 168, w, 16, 1, 5), '#27404b');
      /* brick courses, barely there */
      g.strokeStyle = 'rgba(18,34,42,0.16)'; g.lineWidth = 1.5;
      for (let y = 214; y < 900; y += 30) { g.beginPath(); g.moveTo(x0, y + T.noise(y, 2)); g.lineTo(x0 + w, y + T.noise(y, 3)); g.stroke(); }
      /* water tank and aerials */
      g.fillStyle = '#27404b';
      g.fillRect(300, 112, 74, 58); P.fill(g, P.poly([[294, 112], [337, 86], [380, 112]]), '#27404b');
      P.line(g, -300, 170, -300, 96, 3, '#27404b'); P.line(g, -322, 112, -278, 112, 3, '#27404b'); P.line(g, -316, 126, -284, 126, 3, '#27404b');
      /* other people's windows, top and bottom rows */
      const win = (x, y, lit, seed) => {
        const rr = T.rng(seed);
        P.fill(g, P.box(x - 5, y - 5, 82, 112, 0.8, seed), '#27404b');
        if (lit) {
          P.fill(g, P.box(x, y, 72, 102, 0.6, seed + 1), T.mix('#f2c46d', '#e9a45a', rr()));
          g.fillStyle = 'rgba(120,70,40,0.35)';
          if (rr() < 0.6) g.fillRect(x, y, 20 + rr() * 16, 102); else g.fillRect(x + 18, y + 62, 28, 40);
        } else {
          P.fill(g, P.box(x, y, 72, 102, 0.6, seed + 1), '#243b47');
          g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(x + 6, y + 6, 22, 90);
        }
        P.fill(g, P.box(x - 9, y + 104, 90, 8, 0.6, seed + 2), '#27404b');
      };
      const r2 = T.rng(21);
      for (let i = -6; i <= 6; i++) {
        win(i * 172 - 36, 216, r2() < 0.45, 100 + i);
        win(i * 172 - 36, 716, r2() < 0.5, 200 + i);
      }
      /* their room, cut open */
      const R = ROOM;
      g.save();
      g.shadowColor = 'rgba(255,196,110,0.5)'; g.shadowBlur = 46;
      P.fill(g, P.box(R.x - 10, R.y - 10, R.w + 20, R.h + 20, 0.8, 30), '#efe4cb');
      g.restore();
      const inner = P.box(R.x, R.y, R.w, R.h, 0.6, 31);
      P.wash(g, inner, '#e3bf7f', [R.x, R.y, R.w, R.h], { seed: 32, n: 26, tone: 0.05, len: 120, wid: 22, dir: Math.PI / 2 });
      g.save(); g.clip(inner);
      /* light falls off into the corners */
      const lg = g.createRadialGradient(R.x + 200, R.y + 60, 20, R.x + 200, R.y + 60, 300);
      lg.addColorStop(0, 'rgba(255,236,180,0.6)'); lg.addColorStop(1, 'rgba(120,70,40,0.32)');
      g.fillStyle = lg; g.fillRect(R.x, R.y, R.w, R.h);
      /* skirting and floorboards */
      P.fill(g, P.box(R.x, FLOOR - 26, R.w, 26, 0.6, 33), '#a8794c');
      g.strokeStyle = 'rgba(70,40,20,0.25)'; g.lineWidth = 1.5;
      for (let x = R.x + 30; x < R.x + R.w; x += 62) { g.beginPath(); g.moveTo(x, FLOOR - 26); g.lineTo(x - 8, FLOOR); g.stroke(); }
      /* the one small window */
      P.fill(g, P.box(R.x + 236, R.y + 44, 84, 96, 0.6, 34), '#f5ead1');
      const ws = g.createLinearGradient(0, R.y + 50, 0, R.y + 134);
      ws.addColorStop(0, '#8d86ad'); ws.addColorStop(1, '#f1b98c');
      g.fillStyle = ws; g.fillRect(R.x + 243, R.y + 51, 70, 82);
      g.fillStyle = '#4c5a70'; g.fillRect(R.x + 243, R.y + 104, 26, 29); g.fillRect(R.x + 276, R.y + 92, 37, 41);
      P.fill(g, P.box(R.x + 276, R.y + 51, 4, 82, 0.3, 35), '#f5ead1');
      /* boxes not yet unpacked */
      const box = (x, y, bw, bh, seed, tape) => {
        P.wash(g, P.box(x, y, bw, bh, 0.8, seed), '#c79a62', [x, y, bw, bh], { seed, n: 6, tone: 0.05, len: 50, wid: 12 });
        P.fill(g, P.box(x, y, bw, 5, 0.5, seed + 1), '#b3864f');
        if (tape) P.fill(g, P.box(x + bw / 2 - 7, y, 14, bh * 0.5, 0.5, seed + 2), '#e3cfa0');
      };
      box(R.x + 8, FLOOR - 74, 78, 74, 40, true); box(R.x + 16, FLOOR - 128, 62, 54, 43, false); box(R.x + 24, FLOOR - 168, 46, 40, 46, true);
      box(R.x + 322, FLOOR - 58, 70, 58, 49, true);
      /* a rolled rug and a lamp with no shade yet */
      P.fill(g, P.rr(R.x + 352, FLOOR - 196, 26, 140, 12), '#a45a48');
      P.fill(g, P.rr(R.x + 352, FLOOR - 196, 26, 14, 7), '#8b4638');
      /* seats and the box they eat off */
      box(R.x + 86, FLOOR - 40, 56, 40, 52, false);
      box(R.x + 262, FLOOR - 40, 56, 40, 55, false);
      box(R.x + 164, FLOOR - 62, 78, 62, 58, true);
      /* flex of the bulb */
      P.line(g, R.x + 200, R.y, R.x + 200, R.y + 46, 2, '#5c4a3a');
      g.restore();
    });
  };

  S.enter = function () {
    M.enter();
    S.p = 0; S.shown = 0; S.drag = false; S.spark = 0; S.lastNote = 0; S.joy.k = 0;
    S.aim = [WALL_X + 60, 520];
  };

  function advance(to) {
    if (M.done) return;
    const before = S.p;
    S.p = T.clamp(Math.max(S.p, to));
    if (S.p > before) {
      M.touch();
      const n = Math.floor(S.p * 8);
      if (n > S.lastNote) { S.lastNote = n; M.note({ voice: 'box', vel: 0.42 }); }
      S.scratch = (S.scratch || 0) + (S.p - before);
      if (S.scratch > 0.018) { S.scratch = 0; T.audio.sfx('chalk', S.p); }
    }
    if (S.p >= 1) {
      S.clock.tween(S.joy, 'k', 1, 0.9, T.ease.out);
      S.clock.tween(S, 'spark', 1, 2.4, T.ease.out);
      M.finish();
    }
  }

  S.pointer = function (type, x, y) {
    if (M.pointerDone(type)) return;
    const near = Math.abs(x - (WALL_X + S.p * SPAN)) < 150 && y > 250 && y < 760;
    T.cursor(S.drag ? 'grabbing' : near ? 'grab' : 'default');
    if (type === 'down' && (near || x > WALL_X - 60)) { S.drag = true; M.touch(); }
    if (type === 'up') S.drag = false;
    if (S.drag && (type === 'move' || type === 'down')) {
      S.aim = [x, y];
      /* the chalk follows the finger, but only a little ahead of what is already drawn */
      const want = (x - WALL_X) / SPAN;
      advance(Math.min(want, S.p + 0.05));
    }
  };
  S.key = function (key) {
    if (M.ready && (key === ' ' || key === 'Enter')) { M.tap(); return; }
    if (key === 'ArrowRight' || key === ' ' || key === 'Enter') advance(S.p + 0.04); else return false;
  };

  S.update = function (dt) {
    M.update(dt);
    S.shown += (S.p - S.shown) * (1 - Math.exp(-dt * 7));
  };

  /* the same room as somewhere to dream in: the chalk drawn as far as k, nobody in it */
  S.paintStill = function (g, k) {
    const t = T.time;
    T.blit(g, S.L.bg);
    const bulbX = ROOM.x + 200, bulbY = ROOM.y + 54;
    P.glow(g, bulbX, bulbY, 150 * (1 + Math.sin(t * 13) * 0.015), '#ffe2a0', 0.55);
    g.fillStyle = '#fff4cf'; g.beginPath(); g.arc(bulbX, bulbY, 9, 0, TAU); g.fill();
    for (const s of PLAN) { const kk = T.unlerp(s.a, s.b, k); if (kk > 0) P.chalk(g, s.pts, kk, s.c, s.w, s.seed); }
    for (const l of LABELS) { const kk = T.unlerp(l.at, l.at + 0.07, k); if (kk > 0) P.text(g, l.t, l.x, l.y, { size: l.s, color: l.c, k: kk, alpha: 0.86, seed: 8 }); }
  };
  S.GEO = { ROOM, FLOOR, WALL_X };

  S.draw = function (g) {
    const V = T.view, t = T.time, p = S.shown;
    const [bx, by] = T.par(0.3);
    T.blit(g, S.L.bg, bx * 0.5, by * 0.5);
    g.save(); g.translate(bx * 0.5, by * 0.5);

    /* bulb */
    const bulbX = ROOM.x + 200, bulbY = ROOM.y + 54;
    const flick = 1 + Math.sin(t * 13) * 0.015 + S.joy.k * 0.12;
    P.glow(g, bulbX, bulbY, 150 * flick, '#ffe2a0', 0.55);
    g.fillStyle = '#fff4cf'; g.beginPath(); g.arc(bulbX, bulbY, 9, 0, TAU); g.fill();

    /* the two of them, eating off a box */
    const joy = S.joy.k, bobL = Math.sin(t * 9) * 1.4 * joy, bobA = Math.sin(t * 9 + 1) * 1.6 * joy;
    const ana = { x: ROOM.x + 290, y: FLOOR - 55 + bobA, s: 190, style: F.styles.ana, flip: true, sit: true, lean: 0.06, face: { eye: joy > 0.5 ? 'happy' : 'open', mouth: 'smile' } };
    const leo = { x: ROOM.x + 114, y: FLOOR - 55 + bobL, s: 200, style: F.styles.leo, sit: true, lean: 0.1, face: { eye: joy > 0.5 ? 'happy' : 'open', mouth: p > 0.2 ? 'smile' : null } };
    /* he turns to look where she points */
    leo.headTilt = -0.05 - T.clamp(p * 2) * 0.12;
    leo.armF = { hand: F.local(leo, ROOM.x + 176, FLOOR - 72) };
    /* she draws it in the air: her hand follows yours */
    const k = T.clamp(p * 4 + (S.drag ? 0.6 : 0));
    const ax = T.clamp(S.aim[0], WALL_X - 40, WALL_X + 400), ay = T.clamp(S.aim[1], 330, 640);
    const sh = [ana.x, ana.y - 60];
    const dx = ax - sh[0], dy = ay - sh[1], d = Math.hypot(dx, dy) || 1;
    const reach = [sh[0] + (dx / d) * 52, sh[1] + (dy / d) * 52 - 6];
    const rest = [ROOM.x + 232, FLOOR - 74];
    ana.armB = { hand: F.local(ana, T.lerp(rest[0], reach[0], T.smooth(k)), T.lerp(rest[1], reach[1], T.smooth(k))), bend: 1 };
    ana.armF = { hand: F.local(ana, ROOM.x + 238, FLOOR - 70) };
    ana.headTilt = -0.1 * T.smooth(k);
    ana.flip = k < 0.5;   /* she turns from the table to the wall */
    if (!ana.flip) { ana.x -= 6; ana.armB = { hand: F.local(ana, reach[0], reach[1]) }; ana.armF = { a: 0.5, b: 0.9 }; }
    F.person(g, leo);
    F.person(g, ana);
    /* bowls */
    [ROOM.x + 184, ROOM.x + 222].forEach((x, i) => {
      P.fill(g, P.poly([[x - 13, FLOOR - 74], [x + 13, FLOOR - 74], [x + 8, FLOOR - 62], [x - 8, FLOOR - 62]]), i ? '#c9573f' : '#f2ead8');
      g.strokeStyle = 'rgba(255,250,235,0.5)'; g.lineWidth = 2.4; g.lineCap = 'round';
      g.beginPath();
      for (let j = 0; j < 12; j++) { const yy = FLOOR - 78 - j * 4; g.lineTo(x + Math.sin(t * 2 + j * 0.6 + i * 2) * (2 + j * 0.4), yy); }
      g.stroke();
    });

    /* the dream, in chalk */
    for (const s of PLAN) {
      const kk = T.unlerp(s.a, s.b, p);
      if (kk <= 0) continue;
      P.chalk(g, s.pts, kk, s.c, s.w, s.seed);
    }
    for (const l of LABELS) {
      const kk = T.unlerp(l.at, l.at + 0.07, p);
      if (kk > 0) P.text(g, l.t, l.x, l.y, { size: l.s, color: l.c, k: kk, alpha: 0.86, seed: 8 });
    }
    /* chalk dust where the line is growing */
    if (S.drag && p < 1) {
      const hx = WALL_X + p * SPAN;
      g.fillStyle = 'rgba(246,239,224,0.7)';
      for (let i = 0; i < 6; i++) {
        const a = t * 3 + i * 1.7;
        g.globalAlpha = 0.3 + 0.3 * Math.sin(a * 2);
        g.beginPath(); g.arc(hx + Math.cos(a) * 12 + 4, FLOOR + 6 + Math.abs(Math.sin(a * 1.3)) * 16, 1.6, 0, TAU); g.fill();
      }
      g.globalAlpha = 1;
    }
    /* a few chalk stars when it is done */
    if (S.spark > 0.01) {
      STARS.forEach((q, i) => {
        const s = q[2], tw = Math.sin(t * 3 + i * 2);
        const a = T.clamp(S.spark * 10 - i) * (0.55 + 0.35 * tw);
        if (a <= 0) return;
        g.save(); g.globalAlpha = a;
        P.chalk(g, [[q[0] - s, q[1]], [q[0] + s, q[1]]], 1, YEL, 2, i); P.chalk(g, [[q[0], q[1] - s], [q[0], q[1] + s]], 1, YEL, 2, i + 3);
        g.restore();
      });
    }
    /* the wall that wants pulling */
    if (!M.done && S.p < 0.02) P.beacon(g, WALL_X, 512, 46, t, 1);
    g.restore();

    const h = M.hint(1.6);
    if (h > 0 && S.p < 0.98) {
      const x0 = WALL_X + S.p * SPAN;
      P.fingerHint(g, [[x0, 512], [Math.min(x0 + 260, WALL_X + SPAN), 512]], (t * 0.45) % 1, h);
    }
    M.drawOver(g);
  };
})();
