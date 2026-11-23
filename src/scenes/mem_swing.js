/* Memory: Lily's drawing → the picture itself comes alive, in wax crayon.
   "Our house" has a tree, and the tree has a swing. Pull the swing back and let go. */
(function () {
  'use strict';
  const T = window.TYT, P = T.P;
  const TAU = Math.PI * 2;

  const PIV = [120, 296], LEN = 282, GROUND = 694;
  const C = { red: '#d9452b', yel: '#f2b62a', grn: '#4f9a4a', lime: '#86bf5a', blue: '#3f7fc2', sky: '#6fb1dc', brown: '#8a5a34', org: '#ee8a2a', pink: '#ee7fa2', ink: '#3a3432', must: '#d19a2e', skin: '#f0b48c' };

  const S = (T.scenes.swing = { L: [], th: 0, A: 0, ph: 0, drag: false, grab: null, pushes: 0, lastPush: -9, joy: { k: 0 }, pops: [], say: { k: 0 }, wave: { k: 0 } });
  const M = T.memory(S, { id: 'drawing', line: '아빠가 그네 만들어줄게.', seed: 13, chord: 4, lineY: 818, size: 66, ink: '#2f3b52', bandColor: '#fbf8ef', bandA: 1.9, dot: '#6b5a48' });

  const circ = (cx, cy, r, n = 18, seed = 1, a0 = 0, a1 = TAU + 0.5) => {
    const out = [];
    for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * (i / n); const rr = r * (1 + T.noise(i * 0.6, seed) * 0.1); out.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
    return out;
  };
  const wob = (pts, seed, amp = 2.2) => P.wobPts(pts, amp, 26, seed, false);

  function paintStatic(g, boil) {
    const V = T.view, x0 = -V.W / 2 - 20, w = V.W + 40;
    const sd = (n) => n + boil * 101;
    const cl = (pts, col, wd, seed) => P.crayon(g, pts, col, wd, sd(seed));
    g.fillStyle = '#fbf8ef'; g.fillRect(x0, 0, w, 900);
    /* sky: a few lazy strokes along the top, the way children colour sky */
    for (let i = 0; i < 5; i++) {
      const y = 52 + i * 17;
      cl(wob([[x0 + 30, y + (i % 2) * 6], [x0 + w - 30, y + ((i + 1) % 2) * 6]], sd(300 + i), 4), C.sky, 15, 300 + i);
    }
    /* grass */
    P.scribble(g, P.box(x0, GROUND, w, 240, 0, 1), [x0, GROUND - 6, w, 200], C.lime, { gap: 13, w: 12, seed: sd(2), ang: 1.25 });
    cl(wob([[x0, GROUND + 2], [x0 + w, GROUND - 2]], sd(3), 5), C.grn, 9, 3);
    for (let i = 0; i < 26; i++) {
      const x = x0 + 30 + i * (w / 26) + T.noise(i, 5) * 20;
      cl([[x, GROUND + 4], [x + 5, GROUND - 16 - (i % 3) * 5], [x + 11, GROUND + 3]], C.grn, 5, 10 + i);
    }
    /* sun, top left */
    P.scribble(g, P.circle(-430, 138, 60), [-492, 76, 124, 124], C.yel, { gap: 9, w: 11, seed: sd(40), ang: 0.7 });
    cl(circ(-430, 138, 60, 20, sd(41)), C.org, 7, 41);
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * TAU + 0.2;
      cl([[-430 + Math.cos(a) * 76, 138 + Math.sin(a) * 76], [-430 + Math.cos(a) * (106 + (i % 2) * 14), 138 + Math.sin(a) * (106 + (i % 2) * 14)]], C.org, 7, 44 + i);
    }
    /* clouds and birds */
    const cloud = (x, y, s, seed) => cl([[x - 60 * s, y + 14 * s], [x - 50 * s, y - 16 * s], [x - 18 * s, y - 6 * s], [x - 4 * s, y - 34 * s], [x + 30 * s, y - 14 * s], [x + 60 * s, y - 14 * s], [x + 64 * s, y + 14 * s], [x - 60 * s, y + 14 * s]], C.blue, 6, seed);
    cloud(-150, 150, 1, 60); cloud(120, 196, 0.7, 61);
    [[-250, 262], [-196, 232], [-60, 250]].forEach((b, i) => cl([[b[0] - 16, b[1] - 8], [b[0], b[1] + 4], [b[0] + 16, b[1] - 9]], C.ink, 4, 64 + i));
    /* our house */
    P.scribble(g, P.box(-506, 482, 214, 212, 0, 70), [-506, 482, 214, 212], C.yel, { gap: 12, w: 12, seed: sd(71), ang: -0.6 });
    cl(wob([[-506, 694], [-506, 482], [-292, 482], [-292, 694]], sd(72)), C.org, 8, 72);
    const roof = P.poly([[-534, 484], [-399, 368], [-264, 484]]);
    P.scribble(g, roof, [-534, 368, 270, 116], C.red, { gap: 10, w: 11, seed: sd(73), ang: 0.3 });
    cl(wob([[-534, 484], [-399, 368], [-264, 484], [-534, 484]], sd(74)), C.red, 8, 74);
    cl(wob([[-348, 412], [-348, 372], [-320, 372], [-320, 436]], sd(75), 1.4), C.brown, 7, 75);
    cl([[-334, 360], [-322, 340], [-340, 322], [-318, 304], [-332, 288]], '#9a9a9a', 5, 76);
    P.scribble(g, P.box(-424, 590, 56, 104, 0, 77), [-424, 590, 56, 104], C.brown, { gap: 8, w: 9, seed: sd(77), ang: 1.4 });
    cl(circ(-380, 646, 4, 8, sd(78)), C.yel, 5, 78);
    cl(wob([[-486, 520], [-438, 520], [-438, 566], [-486, 566], [-486, 520]], sd(79), 1.2), C.blue, 6, 79);
    cl([[-462, 520], [-462, 566]], C.blue, 4, 80); cl([[-486, 543], [-438, 543]], C.blue, 4, 81);
    /* flowers */
    [[-250, C.pink], [-40, C.red], [14, C.yel], [446, C.pink], [520, C.red], [-560, C.pink], [588, C.yel]].forEach((f, i) => {
      const x = f[0], y = GROUND - 2;
      cl([[x, y + 20], [x + 2, y - 26]], C.grn, 5, 90 + i);
      cl(circ(x + 2, y - 36, 11, 10, sd(92 + i)), f[1], 8, 92 + i);
      cl(circ(x + 2, y - 36, 3, 6, sd(99 + i)), C.org, 5, 99 + i);
    });
    /* the tree, and the branch the swing hangs from */
    P.scribble(g, P.box(416, 300, 52, 396, 0, 110), [416, 300, 52, 396], C.brown, { gap: 9, w: 11, seed: sd(110), ang: 1.5 });
    cl(wob([[420, 694], [424, 300]], sd(111)), C.brown, 8, 111); cl(wob([[466, 694], [462, 300]], sd(112)), C.brown, 8, 112);
    cl(wob([[430, 326], [250, 302], [44, 290]], sd(113), 3), C.brown, 15, 113);
    const CR = [[250, 250], [230, 150], [310, 60], [430, 36], [550, 70], [620, 160], [600, 260], [510, 320], [410, 300], [320, 320]];
    const crown = P.soft(CR);
    P.scribble(g, crown, [230, 36, 390, 290], C.grn, { gap: 14, w: 15, seed: sd(114), ang: 0.9 });
    P.scribble(g, crown, [230, 36, 390, 290], C.lime, { gap: 26, w: 11, seed: sd(115), ang: -0.5 });
    cl(wob(CR.concat([CR[0]]), sd(116), 5), C.grn, 8, 116);
    [[330, 150], [460, 110], [530, 210], [380, 240]].forEach((a, i) => cl(circ(a[0], a[1], 12, 10, sd(120 + i)), C.red, 9, 120 + i));
    /* mum by the door */
    const mum = [-212, GROUND];
    P.scribble(g, P.poly([[mum[0], mum[1] - 132], [mum[0] - 40, mum[1] - 30], [mum[0] + 40, mum[1] - 30]]), [mum[0] - 40, mum[1] - 132, 80, 102], C.red, { gap: 9, w: 10, seed: sd(130), ang: 0.4 });
    cl([[mum[0] - 14, mum[1] - 30], [mum[0] - 16, mum[1]]], C.ink, 6, 131); cl([[mum[0] + 14, mum[1] - 30], [mum[0] + 16, mum[1]]], C.ink, 6, 132);
    cl(circ(mum[0], mum[1] - 158, 26, 16, sd(133)), C.ink, 6, 133);
    P.scribble(g, P.poly([[mum[0] - 30, mum[1] - 176], [mum[0] + 30, mum[1] - 176], [mum[0] + 32, mum[1] - 140], [mum[0] + 18, mum[1] - 168], [mum[0] - 18, mum[1] - 168], [mum[0] - 32, mum[1] - 140]]), [mum[0] - 32, mum[1] - 190, 64, 56], C.ink, { gap: 6, w: 7, seed: sd(134), ang: 0.2 });
    cl([[mum[0] - 9, mum[1] - 160], [mum[0] - 8, mum[1] - 157]], C.ink, 5, 135); cl([[mum[0] + 9, mum[1] - 160], [mum[0] + 10, mum[1] - 157]], C.ink, 5, 136);
    cl(circ(mum[0], mum[1] - 152, 10, 8, sd(137), 0.3, Math.PI - 0.3), C.red, 4, 137);
    cl([[mum[0] - 22, mum[1] - 104], [mum[0] - 52, mum[1] - 76]], C.ink, 6, 138);
    /* dad behind the swing (his arms are drawn live) */
    const dad = [346, GROUND];
    P.scribble(g, P.box(dad[0] - 34, dad[1] - 176, 68, 100, 0, 140), [dad[0] - 34, dad[1] - 176, 68, 100], C.must, { gap: 9, w: 10, seed: sd(140), ang: -0.4 });
    cl(wob([[dad[0] - 34, dad[1] - 176], [dad[0] + 34, dad[1] - 176], [dad[0] + 34, dad[1] - 76], [dad[0] - 34, dad[1] - 76], [dad[0] - 34, dad[1] - 176]], sd(141), 1.6), C.must, 6, 141);
    cl([[dad[0] - 16, dad[1] - 76], [dad[0] - 18, dad[1]]], C.blue, 9, 142); cl([[dad[0] + 16, dad[1] - 76], [dad[0] + 18, dad[1]]], C.blue, 9, 143);
    cl(circ(dad[0], dad[1] - 206, 28, 16, sd(144)), C.ink, 6, 144);
    cl([[dad[0] - 26, dad[1] - 220], [dad[0] - 12, dad[1] - 238], [dad[0] + 4, dad[1] - 232], [dad[0] + 18, dad[1] - 240], [dad[0] + 28, dad[1] - 218]], C.ink, 8, 145);
    cl([[dad[0] - 10, dad[1] - 208], [dad[0] - 9, dad[1] - 205]], C.ink, 5, 146); cl([[dad[0] + 9, dad[1] - 208], [dad[0] + 10, dad[1] - 205]], C.ink, 5, 147);
    cl(circ(dad[0], dad[1] - 200, 12, 8, sd(148), 0.3, Math.PI - 0.3), C.red, 4, 148);
    /* labels, in a six-year-old's letters */
    const lab = (t, x, y, s, rot) => { g.save(); g.translate(x, y); g.rotate(rot || 0); g.globalCompositeOperation = 'multiply'; P.text(g, t, 0, 0, { size: s, color: C.ink, alpha: 0.86, seed: 3 + x }); g.restore(); };
    lab('엄마', mum[0] - 4, GROUND + 50, 48, -0.05);
    lab('아빠', dad[0] + 2, GROUND + 50, 48, 0.04);
    lab('우리 집', -398, 462, 50, -0.03);
  }

  S.build = function () {
    M.rebuild();
    const V = T.view, x0 = -V.W / 2 - 20, w = V.W + 40;
    const n = T.reduceMotion ? 1 : 3;
    S.L = [];
    for (let i = 0; i < n; i++) S.L.push(T.bake(x0, 0, w, 900, (g) => paintStatic(g, i)));
  };

  S.enter = function () {
    M.enter();
    P.grainAmt = 0.14; P.vignette = 0.08;
    S.th = 0; S.A = 0.06; S.ph = 0; S.drag = false; S.grab = null; S.pushes = 0; S.lastPush = -9;
    S.joy.k = 0; S.pops = []; S.say.k = 0; S.wave.k = 0;
  };

  function seatAt(th) { if (th > 0.42) th = 0.42 + (th - 0.42) * 0.4; return [PIV[0] + Math.sin(th) * LEN, PIV[1] + Math.cos(th) * LEN]; }

  function countPush(strength) {
    const now = S.clock.t;
    if (M.done || now - S.lastPush < 0.5) return;
    S.lastPush = now;
    S.pushes++;
    M.touch();
    for (let i = 0; i < 3; i++) M.note({ voice: 'box', vel: 0.42, at: i * 0.34 });
    T.audio.sfx('whoosh');
    const s = seatAt(S.th);
    for (let i = 0; i < 6; i++) S.pops.push({ x: s[0] - 60 + Math.cos(i * 1.1) * 80, y: s[1] - 90 + Math.sin(i * 1.7) * 70, t: now + i * 0.07, c: [C.yel, C.pink, C.org][i % 3], s: 9 + (i % 3) * 4 });
    if (S.pushes === 2) S.clock.tween(S.say, 'k', 1, 0.8, T.ease.lin);
    if (S.pushes >= 3) {
      S.A = Math.max(S.A, 0.95);
      S.clock.tween(S.joy, 'k', 1, 0.8, T.ease.out);
      S.clock.tween(S.wave, 'k', 1, 0.6, T.ease.out);
      M.finish();
    }
  }
  function dadPush() {
    if (M.done) return;
    S.A = Math.min(1, S.A + 0.34);
    countPush();
  }

  S.pointer = function (type, x, y) {
    if (M.pointerDone(type)) return;
    const s = seatAt(S.th);
    const near = Math.hypot(x - s[0], y - (s[1] - 50)) < 170;
    T.cursor(S.drag ? 'grabbing' : near ? 'grab' : 'pointer');
    if (type === 'down') {
      M.touch();
      S.grab = { x, y, moved: false, near };
      if (near) S.drag = true;
    } else if (type === 'move' && S.grab) {
      if (Math.hypot(x - S.grab.x, y - S.grab.y) > 12) S.grab.moved = true;
      if (S.drag) {
        const want = T.clamp(Math.atan2(x - PIV[0], Math.max(40, y - PIV[1] + 50)), -1.05, 1.05);
        S.th += (want - S.th) * 0.5;
      }
    } else if (type === 'up' && S.grab) {
      if (S.drag && S.grab.moved) {
        /* let go: it swings from wherever you held it */
        S.A = Math.abs(S.th); S.ph = S.th >= 0 ? 0 : Math.PI;
        if (S.A >= 0.42) countPush();
      } else {
        dadPush();
      }
      S.drag = false; S.grab = null;
    }
  };
  S.key = function (key) {
    if (M.ready && (key === ' ' || key === 'Enter')) { M.tap(); return; }
    if (key === ' ' || key === 'Enter' || key === 'ArrowLeft' || key === 'ArrowRight') dadPush(); else return false;
  };

  S.update = function (dt) {
    M.update(dt);
    if (!S.drag) {
      S.ph += dt * 2.25;
      if (!M.done) S.A = Math.max(0.05, S.A - S.A * 0.05 * dt);
      const want = S.A * Math.cos(S.ph);
      S.th += (want - S.th) * (1 - Math.exp(-dt * 12));
    }
    const now = S.clock.t;
    S.pops = S.pops.filter((p) => now - p.t < 1.3);
  };

  S.draw = function (g) {
    const t = T.time, now = S.clock.t;
    const boil = T.reduceMotion ? 0 : Math.floor(t * 4.5) % 3;
    const sd = (n) => n + boil * 57;
    const cl = (pts, col, wd, seed) => P.crayon(g, pts, col, wd, sd(seed));
    const [bx, by] = T.par(0.3);
    g.save(); g.translate(bx * 0.4, by * 0.4);
    T.blit(g, S.L[boil % S.L.length]);
    const joy = S.joy.k, th = S.th > 0.42 ? 0.42 + (S.th - 0.42) * 0.4 : S.th;
    const seat = [PIV[0] + Math.sin(th) * LEN, PIV[1] + Math.cos(th) * LEN];
    const dx = Math.sin(th), dy = Math.cos(th);
    const px = dy, py = -dx;   /* across the ropes */

    /* sun face: it likes this too */
    cl([[-448, 128], [-446, 132]], C.ink, 6, 200); cl([[-412, 128], [-410, 132]], C.ink, 6, 201);
    cl(circ(-430, 142, 18 + joy * 6, 8, sd(202), 0.25, Math.PI - 0.25), C.red, 5, 202);

    /* Bean */
    const hop = Math.abs(Math.sin(t * 7)) * 16 * S.wave.k;
    const bean = [-104, GROUND - hop];
    P.scribble(g, P.ellipse(bean[0], bean[1] - 44, 40, 22), [bean[0] - 40, bean[1] - 66, 80, 44], C.brown, { gap: 8, w: 8, seed: sd(210), ang: 0.3 });
    cl(circ(0, 0, 1, 16, sd(211)).map((q) => [bean[0] + q[0] * 40, bean[1] - 44 + q[1] * 22]), C.brown, 5, 211);
    cl(circ(bean[0] + 46, bean[1] - 66, 20, 12, sd(212)), C.brown, 6, 212);
    cl([[bean[0] + 34, bean[1] - 84], [bean[0] + 28, bean[1] - 58]], C.ink, 8, 213);
    cl([[bean[0] + 52, bean[1] - 70], [bean[0] + 53, bean[1] - 68]], C.ink, 5, 214);
    cl([[bean[0] + 64, bean[1] - 62], [bean[0] + 66, bean[1] - 60]], C.ink, 6, 215);
    [-26, -10, 14, 28].forEach((o, i) => cl([[bean[0] + o, bean[1] - 26], [bean[0] + o + Math.sin(t * 7 + i) * 3 * S.wave.k, bean[1]]], C.brown, 6, 216 + i));
    const wag = Math.sin(t * 11) * (0.35 + 0.4 * S.wave.k);
    cl([[bean[0] - 38, bean[1] - 52], [bean[0] - 52 + wag * 12, bean[1] - 80], [bean[0] - 46 + wag * 22, bean[1] - 96]], C.brown, 6, 220);
    g.save(); g.globalCompositeOperation = 'multiply'; P.text(g, '빈', bean[0] + 4, GROUND + 50, { size: 48, color: C.ink, alpha: 0.86, seed: 7 }); g.restore();
    /* mum waves */
    const mum = [-212, GROUND];
    const wv = S.wave.k, wa = -0.9 - wv * 0.9 + Math.sin(t * 9) * 0.3 * wv;
    cl([[mum[0] + 22, mum[1] - 104], [mum[0] + 22 + Math.cos(wa) * 44, mum[1] - 104 + Math.sin(wa) * 44]], C.ink, 6, 230);

    /* dad's arms follow the swing */
    const dad = [346, GROUND];
    const reach = T.clamp((th + 0.2) / 0.7);
    const hand = [T.lerp(dad[0] - 74, seat[0] + 46, reach * 0.9), T.lerp(dad[1] - 124, seat[1] - 74, reach * 0.9)];
    cl([[dad[0] - 30, dad[1] - 158], [hand[0], hand[1]]], C.ink, 6, 240);
    cl([[dad[0] - 30, dad[1] - 136], [hand[0] + 4, hand[1] + 26]], C.ink, 6, 241);

    /* ropes, seat */
    const r0 = [PIV[0] - 26, PIV[1]], r1 = [PIV[0] + 26, PIV[1]];
    const s0 = [seat[0] - px * 30, seat[1] - py * 30], s1 = [seat[0] + px * 30, seat[1] + py * 30];
    cl([r0, s0], C.ink, 4.5, 250); cl([r1, s1], C.ink, 4.5, 251);
    cl([[s0[0] - px * 8, s0[1] - py * 8], [s1[0] + px * 8, s1[1] + py * 8]], C.red, 11, 252);

    /* Lily: sits facing the open air, legs flying */
    const up = (k) => [seat[0] - dx * k, seat[1] - dy * k];
    const off = (p, a, b) => [p[0] + px * a - dx * b, p[1] + py * a - dy * b];
    const hip = up(8), neck = up(92), head = up(130);
    const kick = -Math.sin(S.ph) * S.A * 0.9;
    const kx = -px * Math.cos(kick) + dx * Math.sin(kick), ky = -py * Math.cos(kick) + dy * Math.sin(kick);
    cl([off(hip, -6, 0), [hip[0] + kx * 58, hip[1] + ky * 58 + 14]], C.ink, 6, 260);
    cl([off(hip, 4, 0), [hip[0] + kx * 56, hip[1] + ky * 56 + 30]], C.ink, 6, 261);
    cl([[hip[0] + kx * 58 - 8, hip[1] + ky * 58 + 14], [hip[0] + kx * 58 + 6, hip[1] + ky * 58 + 16]], C.red, 9, 262);
    cl([[hip[0] + kx * 56 - 8, hip[1] + ky * 56 + 30], [hip[0] + kx * 56 + 6, hip[1] + ky * 56 + 32]], C.red, 9, 263);
    const dress = P.poly([off(neck, 0, 4), off(hip, -40, -6), off(hip, 40, -6)]);
    P.scribble(g, dress, [seat[0] - 120, seat[1] - 150, 240, 200], C.blue, { gap: 8, w: 9, seed: sd(264), ang: 0.5 + th });
    cl([off(neck, -8, -14), off(up(60), -30, 0)], C.ink, 6, 265);
    cl([off(neck, 8, -14), off(up(60), 30, 0)], C.ink, 6, 266);
    cl(circ(head[0], head[1], 30, 16, sd(267)), C.ink, 6, 267);
    cl([off(head, -16, 26), off(head, -4, 44), off(head, 6, 30), off(head, 18, 44)], C.brown, 9, 268);
    cl(circ(head[0] - dx * 40, head[1] - dy * 40, 6, 6, sd(269)), C.red, 7, 269);
    cl([off(head, -11, 4), off(head, -10, 0)], C.ink, 5, 270); cl([off(head, 11, 4), off(head, 12, 0)], C.ink, 5, 271);
    const grin = 9 + S.A * 6 + joy * 5;
    cl(circ(0, 0, grin, 8, sd(272), 0.2, Math.PI - 0.2).map((q) => off(head, q[0], -q[1] - 4)), C.red, 5, 272);
    g.save(); g.globalCompositeOperation = 'multiply';
    P.text(g, '나', head[0] - dx * 78, head[1] - dy * 78 + 12, { size: 50, color: C.ink, alpha: 0.86, seed: 5 });
    g.restore();

    /* little bursts when she flies */
    for (const p of S.pops) {
      const k = (now - p.t) / 1.3;
      if (k < 0) continue;
      g.save(); g.globalAlpha = Math.sin(T.clamp(k) * Math.PI);
      const s = p.s * (0.6 + k * 0.8);
      cl([[p.x - s, p.y], [p.x + s, p.y]], p.c, 5, 300); cl([[p.x, p.y - s], [p.x, p.y + s]], p.c, 5, 301);
      cl([[p.x - s * 0.6, p.y - s * 0.6], [p.x + s * 0.6, p.y + s * 0.6]], p.c, 4, 302);
      g.restore();
    }
    /* what she shouts */
    if (S.say.k > 0.01) {
      g.save(); g.translate(-70, 392); g.rotate(-0.08); g.globalCompositeOperation = 'multiply';
      P.text(g, '더 높이!', 0, 0, { size: 84, color: C.red, k: S.say.k, alpha: 0.9, seed: 9 });
      g.restore();
    }
    g.restore();

    const h = M.hint(1.8);
    if (h > 0 && S.pushes < 3 && !S.drag) {
      const pts = [];
      for (let i = 0; i <= 12; i++) { const q = seatAt((i / 12) * 0.78); pts.push([q[0], q[1] - 50]); }
      P.fingerHint(g, pts, (t * 0.5) % 1, h * (Math.abs(S.th) < 0.25 ? 1 : 0.3), '#6b5a48');
    }
    M.drawOver(g);
  };
})();
