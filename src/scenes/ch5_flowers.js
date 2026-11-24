/* Chapter 5 「꽃길」 — years fifteen to twenty-five. The roof goes up, on the whole town's count.
   Years later a magpie fetches him to the post office of the wind, where Lily's letter (she is getting
   married) has come in and will not settle until he catches it. An answer has to go by dream, and what a dream
   is made of comes to him over a few days, each thing in its own time: that afternoon Pipi's crayons (there is
   a crayon star on her envelope), some evenings later the creak of the swing when the wind finds it, and on
   the evening before the wedding the light of 구름이's little lamp. She walks out with him to the end of the pier
   and holds the lamp out over the cloud sea, and there he sends the dream down, the way the ones who come come
   up: no lake tonight. In Lily's dream (dreamroom.js) the room she drew at six tilts until the dolls are out of
   the door; then he kneels by her bed and hooks little fingers with her on walking beside her empty arm, and
   pushes her on the swing he once promised her, higher. That night he hangs a garland on the list by the road.
   At the wedding, the chapter's one lake, he walks the flower road beside her, the groom waiting at the end of
   it; afterwards, glad, he finds the swing still the size of a six-year-old, and makes it wide enough for the
   Lily she is now. */
(function () {
  'use strict';
  const T = window.TYT, P = T.P, F = T.F, K = T.town;
  const TAU = Math.PI * 2;

  /* a bush of flowers along the road: its own flowers every frame (seeded by which bush it is, not where it is
     drawn), nodding in the breeze, and a little more as feet go by */
  function roadBush(g, x, y, s, c, dots, seed, t, stir) {
    const sw = Math.sin(t * 1.1 + seed * 1.7) * 0.9 + stir * Math.sin(t * 3 + seed) * 2.2;
    P.fill(g, P.ellipse(x + sw * 0.25, y - 14 * s, 30 * s, 20 * s), c);
    P.fill(g, P.ellipse(x + 20 * s + sw * 0.25, y - 10 * s, 20 * s, 15 * s), T.shade(c, -0.08));
    const r = T.rng(seed * 7 + 3);
    for (let i = 0; i < 9; i++) {
      const hx = r() * 56 * s, hy = r() * 22 * s;
      P.fill(g, P.circle(x - 22 * s + hx + sw * (0.4 + hy / (22 * s)), y - 6 * s - hy, 4.4 * s), dots[i % dots.length]);
    }
  }

  /* a garland draped from a to b (world or view points), sagging in the middle: leaves, and flowers among them */
  function garland(g, a, b, sag, t, s) {
    s = s || 1;
    const c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + sag * 2], n = Math.max(8, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / (6 * s)));
    const at = (u) => [(1 - u) * (1 - u) * a[0] + 2 * (1 - u) * u * c[0] + u * u * b[0], (1 - u) * (1 - u) * a[1] + 2 * (1 - u) * u * c[1] + u * u * b[1]];
    g.strokeStyle = '#5f8f52'; g.lineWidth = 2 * s; g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo(c[0], c[1], b[0], b[1]); g.stroke();
    for (let i = 0; i <= n; i++) {
      const u = i / n, q = at(u), sw = Math.sin(t * 1.3 + i) * 0.3;
      P.fill(g, P.ellipse(q[0] - 2 * s, q[1] + 1.5 * s, 4.6 * s, 2.4 * s, 0.6 + sw + (i % 2) * 1.6), i % 2 ? '#6f9f5e' : '#86b06a');
    }
    for (let i = 1; i < n; i += 2) { const q = at(i / n); P.fill(g, P.circle(q[0], q[1] + 1 * s, 3.4 * s), ['#e58aa0', '#f6f0e0', '#f1c04a', '#f6b6c2'][(i >> 1) % 4]); }
    [a, b].forEach((e, j) => { P.line(g, e[0], e[1], e[0] + (j ? 2 : -2) * s, e[1] + 11 * s, 1.6 * s, '#e58aa0'); P.fill(g, P.circle(e[0], e[1], 3.8 * s), '#f1c04a'); });
  }

  /* a flat cut-out of someone, all in one colour (his shadow while it is thin) */
  const flatStyle = (st, c) => { const o2 = {}; Object.keys(st).forEach((k) => { o2[k] = typeof st[k] === 'string' && st[k][0] === '#' ? c : st[k]; }); return o2; };

  /* ---------- the wedding, walked (나란히) ----------
     Above, the flower road in Welcome Harbor; below, in the water, the hall, upside down, where Lily walks in on her
     mother's arm with her other arm crooked and empty. She goes at her own pace: she sets off when he does, stops
     twice on the way to look down at the arm she kept free, and slows at the end. He walks the road above her, and
     his shadow in the water keeps pace beside her: level with her it fills the empty arm, warm, his hand in it;
     behind her or ahead of her it thins to almost nothing, and comes back when he is level again (each time it does,
     it falls in the way every shadow here does, T.shadowFall). Nothing is counted and nothing fails: she waits for
     him if he is left far behind, he cannot get far ahead, and at the end he comes up beside her of himself. The one
     line of help is small, at the start only, and long gone before she speaks. */
  function wedding() {
    /* age: seconds since it opened; look: Lily looking down at her free arm; hug: Lily and her mother; bow: Leo, and
       the groom to Ana. pL / pLeo: how far along the aisle she and he are (0..1); fill: how full his shadow is */
    const V = { dark: false, quiet: true, pL: 0, pLeo: 0, until: 0, ph: 0, lph: 0, done: false, steps: 0, stir: 0, age: 0, look: { k: 0 }, hug: { k: 0 }, bow: { k: 0 }, petals: [], falls: [], fill: 0, full: false, off: 0, tipA: 0, lilyGo: false, pause: -1, pauseT: 0, glance: 0, res: null };
    const SHORE = 470, LX = -150, LEN = 1750, ALTAR = LX + 330 + LEN, START = 2;
    const VL = 1 / 30;   /* her pace, walking: the length of the aisle in half a minute */
    /* where she stops, and for how long; at each she looks down at the arm she kept free */
    const STOPS = [{ at: 0.3, dur: 2.8 }, { at: 0.63, dur: 2.4 }];
    const r0 = T.rng(41);
    for (let i = 0; i < 46; i++) V.petals.push({ x: (r0() - 0.5) * 2000, y: r0() * 470, v: 26 + r0() * 30, ph: r0() * 9, c: ['#f6b6c2', '#fbe3a8', '#ffffff', '#e58aa0'][i % 4] });
    V.walked = new Promise((res) => { V.res = res; });
    const gap = () => (V.pLeo - V.pL) * LEN;   /* how far he is from level with her, along the road (+ ahead) */
    /* the controls every puzzle has (puzzles.js): a tap sets him walking and another stops him; nothing has to be held
       down. → walks while it is pressed; Space / Enter is the tap. For the first moments nothing walks at all: the
       petals come down and everyone along the road looks up */
    V.pointer = function (type) { if (V.done) return false; if (V.age < START) return true; if (type === 'down') { V.on = !V.on; V.touched = true; } return true; };
    V.key = function (key) {
      if (V.done) return false;
      const ours = key === 'ArrowRight' || key === ' ' || key === 'Enter';
      if (V.age < START) return ours;
      if (key === 'ArrowRight') { V.until = T.time + 0.3; V.touched = true; return true; }
      if (key === ' ' || key === 'Enter') { V.on = !V.on; V.touched = true; return true; }
      return false;
    };
    /* (the tests: walk while she walks or he is behind, stop while she stands) */
    V.want = function () {
      if (V.done || V.age < START || V.pL >= 1) return V.done ? null : 'busy';
      const d = gap(), should = !V.lilyGo || d < -14 || (V.lilyMoving && d < 14);
      return should !== !!V.on ? 'key: ' : 'busy';
    };
    V.update = function (dt, S) {
      if (S.dip.a < 0.05) V.age += dt;   /* counted from when it is fully in view */
      const going = !V.done && V.pL < 1 && V.age >= START && (V.on || T.time < V.until);   /* once she is there, he comes level of himself */
      V.going = going;
      if (V.touched && V.t1 == null) V.t1 = V.age;
      /* she sets off when he does; his shadow goes down into the water beside her */
      if (going && !V.lilyGo) { V.lilyGo = true; V.full = true; T.shadowFall.add(V.falls, { x: LX, top: SHORE + 4, y: SHORE + 118, r: 84, warm: true }); }
      /* her pace: her own, with two stops on the way and slower at the end; if he is left far behind she waits */
      let vl = 0;
      if (V.lilyGo && V.pL < 1) {
        const i = STOPS.findIndex((q, j) => j > V.pause && V.pL >= q.at);
        if (i >= 0) { V.pause = i; V.pauseT = STOPS[i].dur; }
        if (V.pauseT > 0) V.pauseT -= dt;
        else {
          vl = VL * (1 + 0.1 * Math.sin(V.age * 0.9)) * (V.pL > 0.86 ? 0.72 : 1);
          const lag = -gap();
          if (lag > 150) vl *= T.clamp(1 - (lag - 150) / 140);
        }
        V.pL = Math.min(1, V.pL + vl * dt);
      }
      V.lilyMoving = vl > 1e-4;
      if (V.lilyMoving) V.lph += dt * 5.4 * (vl / VL);
      /* his: hers while he is level with her, quicker when he has fallen behind, and never far ahead */
      const d = gap(), end = V.pL >= 1;
      let vleo = 0;
      if (going) { vleo = d < -10 ? VL * 1.7 : V.lilyMoving && d < 40 ? vl : VL; if (d > 240) vleo = 0; }
      if (end && !V.done && !going && d < -3) vleo = VL * 1.3;   /* at the end he comes up beside her of himself */
      V.pLeo += vleo * dt;
      if (end && !V.done && d > 3 && !going) V.pLeo += (V.pL - V.pLeo) * Math.min(1, dt * 1.2);   /* (or waits there, and she comes level) */
      V.leoMoving = vleo > 1e-4;
      V.stir += ((V.leoMoving || V.lilyMoving ? 1 : 0) - V.stir) * Math.min(1, dt * 2);
      if (V.leoMoving) {
        S.idle = 0;
        V.ph += dt * 5.4 * Math.min(1.5, vleo / VL);
        const st = Math.floor(V.ph / Math.PI);
        if (st !== V.steps) { V.steps = st; T.audio.sfx('step'); if (st % 2 === 0) S.X.note({ voice: 'felt', vel: 0.2 + 0.24 * V.fill }); }
      }
      /* his shadow beside her: full when he is level with her, thin when he is not; each time it comes back level it
         falls in again */
      const fillTo = V.lilyGo ? 1 - T.clamp((Math.abs(gap()) - 36) / 150) : 0.2;
      V.fill += (fillTo - V.fill) * Math.min(1, dt * 4);
      if (V.fill > 0.86 && !V.full) { V.full = true; if (V.age - V.off > 1.6) T.shadowFall.add(V.falls, { x: LX + gap(), top: SHORE + 4, y: SHORE + 118, r: 84, warm: true }); }
      if (V.fill < 0.45 && V.full) { V.full = false; V.off = V.age; }
      /* at each stop she looks down at the arm she kept free (the script has the last look) */
      if (!V.done) { const p = V.pause >= 0 && V.pauseT > 0 ? V.pauseT / STOPS[V.pause].dur : 0; V.look.k += ((p > 0.2 && p < 0.92 ? 0.72 : 0) - V.look.k) * Math.min(1, dt * 3); }
      if (end && !V.done && Math.abs(gap()) < 4) { V.done = true; V.on = false; V.res(); }
      /* the one line of help: from the start until a little after he first walks */
      V.tipA += ((V.age >= START && (V.t1 == null || V.age - V.t1 < 4.5) && !V.done ? 1 : 0) - V.tipA) * Math.min(1, dt * 2.5);
      for (const q of V.petals) { q.y += q.v * dt; q.ph += dt; if (q.y > SHORE) { q.y = -10; } }
    };
    /* the neighbours along the road; Pipi and 구름이 together near the middle of it, two more waiting where it ends */
    const guests = [[260, F.styles.villagerB, 132], [330, F.styles.villagerC, 138], [650, F.styles.kidA, 100], [700, F.styles.cloud, 94], [1030, F.styles.villagerA, 140], [1100, F.styles.villagerB, 132], [1880, F.styles.villagerC, 142], [1960, F.styles.post, 140]];
    V.draw = function (g, t, S) {
      const W = T.view.W, wx = V.pL * LEN, d = gap(), hint = V.t1 == null ? T.clamp((S.idle - 2) / 1.2) * T.clamp(V.age - START) : 0, up = T.ease.io(T.clamp(V.age / START));
      P.cray = P.look === 'crayon'; if (P.cray) P.crayonize(g);   /* the road is the harbour's; the hall below it is not */
      /* ---- above: the flower road in Welcome Harbor ---- */
      const sky = g.createLinearGradient(0, 0, 0, SHORE);
      sky.addColorStop(0, '#8496cc'); sky.addColorStop(0.5, '#eebca6'); sky.addColorStop(1, '#ffe2ae');
      g.fillStyle = sky; g.fillRect(-W / 2, 0, W, SHORE);
      P.glow(g, 380, 420, 520, '#fff2c4', 0.85);
      const hillBand = (par, base, amp, col, seed) => { g.fillStyle = col; g.beginPath(); g.moveTo(-W / 2, SHORE); for (let x = -W / 2; x <= W / 2 + 40; x += 40) g.lineTo(x, base + T.noise((x + wx * par) * 0.0022, seed) * amp); g.lineTo(W / 2, SHORE); g.closePath(); g.fill(); };
      hillBand(0.25, 300, 60, '#c9a0b2', 3); hillBand(0.5, 356, 46, '#9db08c', 5);
      for (let i = 0; i < 9; i++) { const x = ((i * 310 - wx * 0.5) % 2400 + 2400) % 2400 - 1000; const near = T.clamp((Math.abs(x - LX) - 70) / 70); if (near <= 0.02) continue; g.globalAlpha = near; K.tree(g, x, 372 + T.noise(i, 2) * 10, 0.6, ['#4f8f7a', '#7fb08a', '#e9a3b4'][i % 3], null, null, Math.sin(t * 0.8 + i)); g.globalAlpha = 1; }
      P.fill(g, P.box(-W / 2, SHORE - 40, W, 40, 0, 1), '#e3b488');
      g.fillStyle = 'rgba(255,240,200,0.35)'; g.fillRect(-W / 2, SHORE - 40, W, 5);
      for (let i = -2; i < 26; i++) {
        const x = i * 96 - wx + 60;
        if (x < -W / 2 - 80 || x > W / 2 + 80) continue;
        roadBush(g, x, SHORE - 34, 0.62, '#5f8f62', [['#e5758f', '#f09aac'], ['#f1c04a', '#f6f0e0'], ['#e58aa0', '#f6e0e0']][((i % 3) + 3) % 3], i + 40, t, V.stir * T.clamp(1 - Math.abs(x + 10 - LX) / 150));
        if (i % 3 === 0) K.lantern(g, x + 44, SHORE - 36, t, { s: 0.8, seed: i });
      }
      /* where the road starts: the list on its post, with the garland he hung on it last night */
      const sx = LX - 118 - wx;
      if (sx > -W / 2 - 60) {
        P.line(g, sx, SHORE - 34, sx, SHORE - 140, 6, '#8a6442');
        g.save(); g.translate(sx, SHORE - 120); g.rotate(-0.03);
        P.fill(g, P.box(-30, -32, 60, 66, 0.6, 7), '#f1e6cc');
        for (let i = 0; i < 5; i++) P.line(g, -21, -21 + i * 12, -21 + [40, 33, 38, 28, 26][i], -21 + i * 12, 1.8, 'rgba(51,64,92,0.7)');
        garland(g, [-31, -31], [31, -33], 9, t, 1.15);
        g.restore();
      }
      guests.forEach((q, i) => {
        const x = q[0] - wx + 120;
        if (x < -W / 2 - 80 || x > W / 2 + 80) return;
        const near = T.clamp(1 - Math.abs(x - LX) / 420), o = { x, y: SHORE - 44 - F.hipHeight(q[1], q[2]), s: q[2], style: q[1], flip: x > LX, lean: 0.06, headTilt: 0.3 * (1 - up), face: { eye: 'happy', mouth: 'smile', blush: 0.2 } };
        if (i === 2) { o.armF = { a: 2.5 + Math.sin(t * 9) * 0.42 * near, b: 0.25 }; o.armB = { a: 0.6 + near * 1.6, b: 0.3 }; o.y -= Math.abs(Math.sin(t * 6)) * 4 * near; }   /* Pipi, waving with all of him */
        else if (i === 3) { o.headTilt = 0.3 * (1 - up) + 0.46 * near; o.lean = 0.1 * near; o.face = { eye: 'open', mouth: 'smile', blush: 0.24 }; o.armF = { a: 0.3, b: 0.3 }; o.armB = { a: 0.2, b: 0.3 }; }   /* 구름이 looks down into the water, at Lily */
        else { o.armF = { a: 1.2 + near * 1.2 + Math.sin(t * 8 + i) * 0.2 * near, b: 0.4 }; o.armB = { a: 0.6 + near * 1.4, b: 0.4 }; }
        F.person(g, o);
      });
      const bow = T.ease.io(V.bow.k);
      /* him on the road above her: level with her, or behind, or ahead */
      const leo = { x: LX + d, y: SHORE - 6 - F.hipHeight(F.styles.leoHome, 190), s: 190, style: F.leoAt(2), lean: 0.05 + bow * 0.12, headTilt: bow * 0.3 + 0.12 * (1 - V.fill) * (V.lilyGo ? 1 : 0), face: { blush: 0.16, mouth: 'smile' } };
      if (bow > 0.01) T.face.set(leo, 'smileTears', bow, t);
      if (V.leoMoving) leo.walk = V.ph;
      leo.armF = { a: 0.5, b: 1.5 - bow * 0.6 };   /* an arm crooked for someone to hold */
      F.person(g, leo);
      g.save(); g.beginPath(); g.rect(-W / 2, 0, W, SHORE); g.clip();
      for (const q of V.petals) { g.save(); g.translate(q.x + Math.sin(q.ph * 1.3) * 20, q.y); g.rotate(q.ph * 2); g.fillStyle = q.c; g.globalAlpha = 0.9; g.beginPath(); g.ellipse(0, 0, 6, 3.4, 0, 0, TAU); g.fill(); g.restore(); }
      g.restore();

      P.cray = false;
      /* ---- below: the water, and in it the wedding ---- */
      const wg = g.createLinearGradient(0, SHORE, 0, 900);
      wg.addColorStop(0, '#5d7896'); wg.addColorStop(1, '#22384f');
      g.fillStyle = wg; g.fillRect(-W / 2, SHORE, W, 430);
      g.save();
      g.beginPath(); g.rect(-W / 2, SHORE, W, 430); g.clip();
      g.translate(0, SHORE * 2); g.scale(1, -1);
      /* the hall */
      const hall = g.createLinearGradient(0, 40, 0, SHORE);
      hall.addColorStop(0, '#6f7fa6'); hall.addColorStop(1, '#a79bb4');
      g.fillStyle = hall; g.fillRect(-W / 2, 40, W, SHORE - 40);
      g.fillStyle = '#7d7096'; g.fillRect(-W / 2, SHORE - 150, W, 150);          /* panelled lower wall */
      g.fillStyle = 'rgba(255,240,220,0.25)'; g.fillRect(-W / 2, SHORE - 152, W, 4);
      for (let i = -1; i < 9; i++) {
        const x = i * 300 - wx + 100;
        if (x < -W / 2 - 160 || x > W / 2 + 160) continue;
        P.glow(g, x, 230, 130, '#ffe9b8', 0.4);
        P.fill(g, P.soft([[x - 46, SHORE - 176], [x - 46, 212], [x, 150], [x + 46, 212], [x + 46, SHORE - 176]]), '#ffe2a8');
        g.strokeStyle = '#d9d0e0'; g.lineWidth = 5;
        g.beginPath(); g.moveTo(x - 46, SHORE - 176); g.lineTo(x - 46, 212); g.quadraticCurveTo(x, 138, x + 46, 212); g.lineTo(x + 46, SHORE - 176); g.closePath(); g.stroke();
        g.lineWidth = 3; g.beginPath(); g.moveTo(x, 156); g.lineTo(x, SHORE - 176); g.moveTo(x - 46, 236); g.lineTo(x + 46, 236); g.stroke();
        for (let k = 0; k < 7; k++) P.fill(g, P.circle(x + 78 + k * 24, 132 + Math.sin((k / 6) * Math.PI) * 26, 9), ['#e58aa0', '#f6f0e0', '#9ab86a'][k % 3]);
      }
      /* pews, and the backs of the people in them */
      for (let i = -3; i < 34; i++) {
        const x = i * 66 - wx + 30;
        if (x < -W / 2 - 40 || x > W / 2 + 40 || i * 66 + 30 > ALTAR - 90) continue;   /* none in front of the altar */
        const col = ['#5d6f8a', '#8a5578', '#3f6b70', '#6b5a48', '#9a6b43'][((i % 5) + 5) % 5];
        P.fill(g, P.rr(x - 19, SHORE - 96, 38, 62, 13), col);
        P.fill(g, P.circle(x, SHORE - 110, 14), ['#3a2b25', '#6b4a3a', '#d9d2c6', '#2a2024'][((i % 4) + 4) % 4]);
        P.fill(g, P.rr(x - 31, SHORE - 62, 62, 30, 5), '#5a4a5e');
        P.fill(g, P.rr(x - 31, SHORE - 64, 62, 6, 3), '#77657a');
      }
      P.fill(g, P.box(-W / 2, SHORE - 36, W, 36, 0, 2), '#c9573f');
      /* at the end of the aisle, under an arch of flowers, the one she is marrying: his back to them while they come,
         and he turns as they are nearly there */
      const gx = ALTAR - wx;
      if (gx < W / 2 + 200) {
        const ax = gx + 34;
        P.line(g, ax - 70, SHORE - 36, ax - 70, SHORE - 250, 7, '#e9dcc8'); P.line(g, ax + 70, SHORE - 36, ax + 70, SHORE - 250, 7, '#e9dcc8');
        for (let k = 0; k <= 18; k++) { const a = Math.PI + (k / 18) * Math.PI, fx = ax + Math.cos(a) * 70, fy = SHORE - 250 + Math.sin(a) * 60; P.fill(g, P.circle(fx, fy, 11), ['#9ab86a', '#e58aa0', '#f6f0e0', '#7fa86a', '#f1c04a'][k % 5]); }
        for (let k = 0; k < 8; k++) { P.fill(g, P.circle(ax - 70 + Math.sin(k * 1.7) * 6, SHORE - 230 + k * 24, 8), ['#9ab86a', '#f6f0e0', '#e58aa0'][k % 3]); P.fill(g, P.circle(ax + 70 - Math.sin(k * 1.3) * 6, SHORE - 230 + k * 24, 8), ['#e58aa0', '#9ab86a', '#f6f0e0'][k % 3]); }
        const turned = V.pL > 0.9, gb = turned ? T.ease.io(V.bow.k) : 0;
        const groom = { x: gx, y: SHORE - 6 - F.hipHeight(F.styles.groom, 182), s: 182, style: F.styles.groom, flip: turned, lean: 0.04, headTilt: turned ? 0.06 : -0.04, face: { blush: 0.22, mouth: 'smile', eye: turned ? 'happy' : 'open' } };
        groom.armF = { a: 0.35, b: 0.5 }; groom.armB = { a: 0.3, b: 0.55 };   /* hands together in front, waiting */
        if (gb > 0.01) T.pose.bow(groom, gb, t, { face: 'gentle' });   /* to her mother, and to the empty place beside her */
        F.person(g, groom);
      }
      /* Ana, Lily, and beside Lily's free arm the one who is not there */
      const hug = T.ease.io(V.hug.k);
      const ana = { x: LX + 180 - hug * 62, y: SHORE - 6 - F.hipHeight(F.styles.ana, 176), s: 176, style: F.anaAt(61), flip: hug > 0.4, lean: 0.05, face: { eye: 'happy', mouth: 'smile', blush: 0.24, tear: 0.6, tearY: (t * 2) % 3 } };
      const lst = F.lilyAt(31, { top: '#fbf7ec', bottom: '#fbf7ec', skirt: 44, shoe: '#fbf7ec' });
      const lk = T.ease.io(V.look.k);
      const lily = { x: LX + 92, y: SHORE - 6 - F.hipHeight(lst, 178), s: 178, style: lst, lean: 0.04 + lk * 0.03, headTilt: lk * 0.42, face: { eye: hug > 0.5 ? 'closed' : 'open', mouth: 'smile', blush: 0.3 } };
      if (lk > 0.01) T.face.set(lily, 'smileTears', lk * 0.8, t);   /* she looks down at her free arm */
      if (V.lilyMoving) { ana.walk = V.lph + 0.6; lily.walk = V.lph + 0.3; }
      ana.armB = { hand: F.local(ana, lily.x + 20, lily.y - 40) };
      lily.armF = hug > 0.02 ? { hand: F.local(lily, ana.x - 6, ana.y - 60), bend: 1 } : { hand: F.local(lily, ana.x - 22, ana.y - 34) };
      lily.armB = { a: 0.78, b: 1.3 };   /* crooked, held a little away from her side: room for an arm in it */
      F.person(g, ana);
      const lj = F.person(g, lily);
      /* veil and flowers */
      g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.moveTo(lj.head[0] - 6, lj.head[1] - 20); g.quadraticCurveTo(lj.head[0] - 50, lj.head[1] + 20, lj.head[0] - 46, lj.head[1] + 110); g.lineTo(lj.head[0] - 14, lj.head[1] + 60); g.closePath(); g.fill();
      [['#e58aa0', -6, 0], ['#f6f0e0', 6, -4], ['#f1c04a', 2, 8], ['#9ab86a', -10, 8]].forEach((b) => P.fill(g, P.circle(lj.handF[0] + b[1], lj.handF[1] + b[2], 7), b[0]));
      /* his shadow, beside her: thin and flat while he is not level with her, and, level, warm and full, his hand in the
         arm she kept free */
      const fk = T.ease.io(T.clamp(V.fill)), lo = Object.assign({}, leo, { face: { blush: 0.16, mouth: 'smile' }, headTilt: 0, lean: 0.05 });
      if (fk > 0.45 && lj.elbowB) lo.armF = { hand: F.local(lo, T.lerp(lo.x + 40, lj.elbowB[0] - 4, T.clamp((fk - 0.45) / 0.4)), T.lerp(lo.y - 10, lj.elbowB[1] + 2, T.clamp((fk - 0.45) / 0.4))) };
      const thin = 0.3 * (1 - fk) * (V.lilyGo ? 1 : 0.6);
      if (thin > 0.01) { g.save(); g.globalAlpha = thin * (1 - hug * 0.5); g.translate(lo.x, lo.y); g.scale(0.94, 1.06); g.translate(-lo.x, -lo.y); F.person(g, Object.assign({}, lo, { style: flatStyle(lo.style, '#24304f'), flatLook: true })); g.restore(); }
      if (fk > 0.01) { g.globalAlpha = 0.84 * fk * (1 - hug * 0.5); P.glow(g, lo.x + 30, lo.y - 50, 150, '#ffe9c0', 0.3 * fk); F.person(g, lo); }
      g.restore();
      /* water over all of it */
      g.fillStyle = 'rgba(40,70,112,0.2)'; g.fillRect(-W / 2, SHORE, W, 430);
      g.strokeStyle = 'rgba(230,240,255,0.16)'; g.lineWidth = 2;
      for (let i = 0; i < 16; i++) { const y = SHORE + 14 + i * 27, off = Math.sin(t * 1.1 + i * 1.7) * 30; g.beginPath(); g.moveTo(-W / 2, y); for (let x = -W / 2; x <= W / 2; x += 80) g.quadraticCurveTo(x + 40 + off * 0.2, y + Math.sin(x * 0.01 + t * 1.6 + i) * 5, x + 80, y); g.stroke(); }
      g.fillStyle = 'rgba(255,240,205,0.5)'; g.fillRect(-W / 2, SHORE - 1, W, 3);
      T.shadowFall.draw(g, V.falls, t);
      /* the one line of help, small, at the start only */
      if (V.tipA > 0.01) P.text(g, T.puzzle.withKeys('릴리 걸음에 맞춰, 곁에서 걸어요', 'act'), 0, 872, { font: 'serif', size: 21, color: '#f3ead8', alpha: 0.8 * V.tipA, glow: 'rgba(20,30,50,0.6)' });
      if (!V.done && hint > 0) P.beacon(g, LX + d, SHORE - 90, 70, t, hint, '#fff0c8');
    };
    return V;
  }

  function invitation(g, c) {
    const V = T.view;
    if (c.a <= 0.003) return;
    g.save();
    g.fillStyle = T.rgba('#141a2c', 0.55 * c.a); g.fillRect(-V.W / 2, 0, V.W, V.H);
    const k = T.ease.out3(T.clamp(c.a));
    g.translate(0, 450 + (1 - k) * 60 + Math.sin(T.time * 0.8) * 3); g.rotate(0.015);
    g.globalAlpha = T.clamp(c.a * 2.5);
    g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 44; g.shadowOffsetY = 16;
    P.fill(g, P.rr(-240, -310, 480, 620, 10), '#fbf6ea');
    g.shadowColor = 'transparent';
    g.strokeStyle = 'rgba(201,87,63,0.35)'; g.lineWidth = 2; g.strokeRect(-216, -286, 432, 572);
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * TAU, x = Math.cos(a) * 120, y = -150 + Math.sin(a) * 96;
      P.fill(g, P.ellipse(x, y, 13, 7, a + 1.2), i % 2 ? '#7fa86a' : '#9ab86a');
      if (i % 3 === 0) P.fill(g, P.circle(x * 1.05, y * 1.0 - 4, 9), ['#e58aa0', '#f1c04a', '#f6b6c2'][(i / 3) % 3 | 0]);
    }
    P.text(g, '아빠,', 0, -128, { size: 60, color: '#33405c', k: T.clamp(c.w * 3), seed: 5 });
    P.text(g, '나 결혼해.', 0, 74, { size: 92, color: '#33405c', k: T.clamp(c.w * 2 - 0.5), seed: 7 });
    P.text(g, '보러 와 줄 거지?', 0, 164, { size: 56, color: '#33405c', k: T.clamp(c.w * 3 - 1.7), seed: 9, alpha: 0.9 });
    P.text(g, '릴리', 130, 248, { size: 52, color: '#3f6f9a', k: T.clamp(c.w * 6 - 5), seed: 11 });
    g.restore();
  }

  /* her envelope, in his hands: the crayon star she drew on it */
  function envelope(g, x, y, rot) {
    g.save(); g.translate(x, y); g.rotate(rot || 0);
    P.fill(g, P.rr(-11, -7, 22, 14, 2), '#fbf4e2');
    g.strokeStyle = 'rgba(120,96,70,0.4)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(-11, -7); g.lineTo(0, 1); g.lineTo(11, -7); g.stroke();
    const st = []; for (let j = 0; j < 10; j++) { const a = (j / 10) * TAU - Math.PI / 2, rr = j % 2 ? 1.7 : 3.8; st.push([6 + Math.cos(a) * rr, 2 + Math.sin(a) * rr]); }
    P.fill(g, P.poly(st), '#f2b62a');
    g.restore();
  }
  /* Pipi's box of crayons; open, the tips show */
  function crayonBox(g, x, y, open) {
    g.save(); g.translate(x, y);
    ['#d9452b', '#f2b62a', '#4f9a4a', '#3f7fc2', '#ee7fa2'].forEach((c, i) => P.fill(g, P.rr(-8 + i * 3.4, -6 - open * 5 - (i % 2) * 1.5, 3, 8, 1), c));
    P.fill(g, P.rr(-10, -4, 20, 12, 2), '#3f7fc2');
    P.fill(g, P.rr(-10, -4, 20, 3.5, 1.5), '#f2b62a');
    if (open < 0.5) P.fill(g, P.rr(-10, -6, 20, 4, 1.5), '#2f6aa8');
    g.restore();
  }

  /* the dream going down, from the end of the pier. m: { who (Leo), fly (0..1: the three things she knows coming out
     of the corner into his hands), k (the one light in his hands), p (drawn down past the end of the pier), sink (into
     the cloud sea), path (her lamp's light laid down after it), E (where it goes in) } */
  function sendDraw(g, S) {
    const m = S.send, W = T.world, t = T.time, a = m.who;
    const hands = a.j ? [(a.j.handF[0] + a.j.handB[0]) / 2 - 3, (a.j.handF[1] + a.j.handB[1]) / 2 - 5] : [a.x - 20, W.groundAt(a.x) - 60];
    if (m.fly != null && m.fly < 1) {   /* on the screen: from the tray to his hands */
      const to = W.toScreen(hands[0], hands[1]), x0 = -T.view.W / 2 + 70, k = T.ease.io(m.fly);
      for (let i = 0; i < 3; i++) {
        const x = T.lerp(x0 + i * 64, to[0], k), y = T.lerp(70, to[1], k) - Math.sin(k * Math.PI) * (50 + i * 34);
        P.glow(g, x, y, 40, ['#fff3dc', '#f6dccf', '#e6ffb8'][i], 0.9); P.glow(g, x, y, 10, '#ffffff', 1); P.glow(g, T.lerp(x, x0 + i * 64, 0.08), y - 6, 18, '#fff6e0', 0.4);
      }
    }
    if (!(m.k > 0.01)) return;
    const E = m.E, p = T.ease.io(m.p || 0), sk = m.sink || 0;
    const x = T.lerp(hands[0], E[0], p), y = T.lerp(hands[1], E[1], p) - Math.sin(p * Math.PI) * 18 + T.ease.in(sk) * 170;
    const fade = 1 - T.clamp((sk - 0.25) / 0.75);
    W.layer(g, 1);
    if (m.path > 0.01) {   /* her lamp's light goes down after it, and makes a way */
      const L = S.lampOf && S.lampOf.j ? [S.lampOf.j.handF[0], S.lampOf.j.handF[1] + 24] : [E[0] + 40, E[1] - 80];
      for (let i = 0; i < 16; i++) {
        const u = i / 15, px = T.lerp(L[0], E[0] - 6, u) + Math.sin(t * 1.3 + i * 0.9) * 4 * u, py = T.lerp(L[1] + 12, E[1] + 230, u * m.path);
        P.glow(g, px, py, 30 - u * 12, '#ffe2a0', 0.46 * m.path * (1 - u * 0.55) * (0.85 + 0.15 * Math.sin(t * 3 + i)));
      }
    }
    if (sk > 0.02) P.glow(g, E[0], W.surf(E[0]) + 6, 70 + sk * 150, '#fff0c8', 0.45 * Math.sin(Math.min(1, sk * 1.4) * Math.PI * 0.9));   /* where it went in */
    P.glow(g, x, y, 62 * m.k * (1 - sk * 0.4), '#fff0b8', (0.72 + 0.2 * Math.sin(t * 3)) * fade);
    P.glow(g, x, y, 15 * m.k, '#ffffff', 0.92 * fade);
    g.restore();
  }
  /* the garland: in his hands (k 0), going up (k 0..1), and hung across the top of the list (on) */
  function boardGarland(g, S) {
    const q = S.garland, PL = T.plot, x = PL.BOARD_X, y = T.world.y3(x), t = T.time;
    const n1 = [x - 25, y - 101], n2 = [x + 25, y - 103];
    if (q.on) { garland(g, n1, n2, 8, t); return; }
    const a = q.who && q.who.j;
    if (!a) return;
    const k = T.ease.io(q.k), h1 = a.handB, h2 = a.handF, lo = h1[0] < h2[0] ? [h1, h2] : [h2, h1];
    garland(g, [T.lerp(lo[0][0], n1[0], k), T.lerp(lo[0][1], n1[1], k)], [T.lerp(lo[1][0], n2[0], k), T.lerp(lo[1][1], n2[1], k)], T.lerp(16, 8, k), t);
  }

  T.stage('ch5', {
    chapter: 5, title: ['5장', '꽃길'], end: ['5장 끝', '6장 「다 지킨 약속」'], next: 'ch6', pad: 3,
    plot: { stage: 3, stones: 4, board: true, table: true, tree: 0.6, swing: 0, garden: 0.4, patch: 2, fruit: 1, season: 'winter' },   /* the swing is built during the first years card */
    flags: { bramGone: true, rosaGone: true },   /* Bram and Marta, and Rosa and her son, went on in chapter 4 */
    update(dt, S) { if (S.swinging) S.ps.swingA = Math.sin(T.time * 1.5) * (S.swingAmp == null ? 0.5 : S.swingAmp); },
    /* after dark, a lamp in a small hand shines over the evening, not under it */
    after(g, S) {
      const c = S.lampOf, n = S.ps.night;
      if (c && c.j && !c.hidden && n >= 0.05) {
        const h = c.j.handF;
        T.world.layer(g, 1);
        P.glow(g, h[0], h[1] + 24, 60, '#ffd98a', 0.55 * n * (c.lit == null ? 1 : c.lit));
        g.restore();
      }
      if (S.send) sendDraw(g, S);
    },
    onHill(g, h, S) {
      if (S.roofK != null && h === T.world.hillOf(T.plot.HX)) {   /* the ridge beam, coming up the side of the house on the rope */
        const x = T.plot.HX, gy = T.world.y3(x), y = gy - 40 - 210 * S.roofK;
        P.fill(g, P.rr(x - 150, y - 8, 300, 16, 6), '#b98a5a'); P.fill(g, P.rr(x - 150, y - 8, 300, 5, 3), '#d1a676');
      }
      if (S.garland && h === T.world.hillOf(T.plot.BOARD_X)) boardGarland(g, S);
      const m = S.pie;
      if (!m || h !== T.world.hillOf(T.plot.BOARD_X)) return;
      const t = T.time, flap = m.land ? 0 : Math.sin(t * 16), dir = m.dx == null ? 1 : m.dx;
      const mv = m.px == null ? 0 : m.x - m.px; m.px = m.x; if (Math.abs(mv) > 0.05) m.face = Math.sign(mv);   /* a bird faces the way it flies */
      g.save(); g.translate(m.x, m.y + (m.land ? 0 : Math.sin(t * 3) * 6)); g.scale(m.face || 1, 1); void dir;
      /* tail, body, white belly and shoulder, the wing going */
      P.fill(g, P.poly([[-10, -2], [-46, -14], [-48, -6], [-12, 6]]), '#1f2c3f'); P.line(g, -44, -10, -46, -9, 2, '#3a6aa0');
      P.fill(g, P.ellipse(0, 0, 16, 10, -0.15), '#1c2232'); P.fill(g, P.ellipse(2, 4, 10, 6, -0.1), '#f4f1ea');
      P.fill(g, P.circle(13, -7, 7), '#1c2232'); P.fill(g, P.poly([[19, -8], [27, -6], [19, -4]]), '#2a2a30');
      P.fill(g, P.circle(15, -9, 1.4), '#fff');
      g.save(); g.translate(-2, -4); g.rotate(-0.4 - flap * 0.7); P.fill(g, P.ellipse(-8, -6, 16, 6, -0.3), '#24304a'); P.fill(g, P.ellipse(-4, -4, 7, 3, -0.3), '#f4f1ea'); g.restore();
      if (m.land) { P.line(g, -2, 9, -4, 16, 1.6, '#2a2a30'); P.line(g, 4, 9, 4, 16, 1.6, '#2a2a30'); }
      if (m.letter !== false) { g.save(); g.translate(26, -2); g.rotate(0.3); P.fill(g, P.rr(-2, -6, 20, 13, 2), '#fbf4e2'); P.fill(g, P.circle(8, 0, 2.4), '#c9573f'); g.restore(); }
      g.restore();
    },
    script: async function (X) {
      const W = T.world, C = W.C, PL = T.plot, S = X.S, ps = S.ps, A = X.A;
      const [px, py] = X.place.plot();
      X.cam(px, py, 1); X.camSnap();
      S.swinging = false; S.swingAmp = 0.5;
      T.state.dream = {};
      const TALK = X.TALK;
      let leo = X.actor('leo', { x: PL.HX + 150, style: F.leoAt(2), flip: true, lean: 0.06 });
      let bean = X.actor('bean', { dog: true, s: 220, x: PL.HX + 190, sit: 1, wag: 0.5 });
      X.title();
      await X.wait(4.2);
      /* the years go by here on the hill: the apple tree grows, and one spring a swing hangs from it */
      await X.years(15, 20, { age: 56, season: 'summer', during: (d) => { X.tween(ps, 'tree', 0.85, d); X.tween(ps, 'garden', 1, d); X.wait(d * 0.4).then(() => { A.sfx('knock', 0.3); X.tween(ps, 'swing', 1, d * 0.4); }); } });
      T.announce('사과나무가 자라고, 가지에 작은 그네가 걸렸다. 릴리에게 만들어 주겠다던 그네.');

      /* ---- the roof: the ridge beam goes up the way the frame did, on everyone's count ---- */
      const folk = [
        X.actor('v3', { x: C.PLOT - 560, style: F.styles.villagerC, s: 142, lean: 0.08 }),
        X.actor('v1', { x: C.PLOT - 620, style: F.styles.villagerA, s: 142, lean: 0.12 }),
        X.actor('v2', { x: C.PLOT - 680, style: F.styles.villagerB, s: 134, lean: 0.06 }),
        X.actor('kid', { x: C.PLOT - 740, style: F.styles.kidA, s: 104 }),
        X.actor('cloud', { x: C.PLOT - 790, style: F.styles.cloud, s: 94 }),
      ];
      folk.forEach((a, i) => X.walk(a, PL.HX - 180 - i * 58, 80 + i * 3));
      await X.wait(4.4);
      leo.flip = true; bean.sit = 0; bean.flip = true;
      await TALK.say('v3', '마룻대 올린다며?\n그건 혼자 못 올려.');
      await TALK.say('v2', '지붕은 원래\n동네가 같이 올리는 거야.');
      await TALK.say('kid', '이번엔 나 맨 앞!');
      T.announce('지붕 올리기. 모두가 숨을 모은 순간에 눌러 다 같이 마룻대를 끌어 올린다. 이번에는 네 번, 마지막은 이웃 할아버지까지.');
      /* the ridge beam lies along the grass; everyone takes the rope in one line down the hill, Pipi at the very
         front as he said. The old neighbour (v1) watches from the end of it, and takes hold himself for the last heave */
      const pullers = [folk[3], leo, folk[0], folk[2], folk[4], folk[1]];
      await X.dip(async () => { pullers.forEach((a, i) => { a.go = null; a.moving = false; a.x = PL.HX + 190 + i * 58; }); folk[1].x += 50; bean.go = null; bean.x = PL.HX + 590; bean.sit = 1; bean.flip = true; S.roofK = 0; X.cam(PL.HX + 200, py + 10, 0.95); }, { out: 0.6, in: 0.8 });
      await X.play(T.puzzle.heave({ pulls: 4, win: 0.55, hold: 0.85, wobble: 0.8, gust: 0.45, slow: { v1: 2.4 }, late: 'v1', caller: 'v1', bean, beam: 300, crew: pullers, at: PL.HX, cam: X.cam, top: (k) => [PL.HX, W.y3(PL.HX) - 40 - 210 * k], raise: () => { S.roofK = null; } }));   /* the puzzle draws the beam, coming up on its pegs */
      S.roofK = null; X.cam(px, py, 1);
      ps.stage = 4; A.sfx('knock', 0.6); X.notes(5);
      T.announce('지붕이 올라간다. 집이 다 지어졌다.');
      const cheer = (o, a, t) => { o.armF = { a: 2.4 + Math.sin(t * 9 + a.x) * 0.25, b: 0.3 }; o.face.eye = 'happy'; };
      folk.forEach((a) => { a.pose = cheer; });
      for (let i = 0; i < 3; i++) { await X.tween(bean, 'jump', 12, 0.18, T.ease.out); await X.tween(bean, 'jump', 0, 0.18, T.ease.in); }
      await X.wait(1.2);
      folk.forEach((a) => { a.pose = null; });
      await TALK.say('leo', '…빈, 이제 진짜 우리 집이다.');
      await TALK.say('v1', '아나 씨 오면\n비 맞을 일은 없겠구먼.');
      await TALK.say('v2', '남는 방엔 뭘 들일 거야?');
      await TALK.say('leo', '…그건 아나가 정하게 둘래요.');
      await X.wait(1);
      folk.forEach((a, i) => X.walk(a, C.PLOT - 600 - i * 40, 80).then(() => { a.hidden = true; }));
      await X.wait(2.4);

      /* ---- years on: a magpie from the post office of the wind, come to fetch him ---- */
      let pie;
      await X.dip(async () => {
        S.actors = []; S.boats = [];
        X.cam(px, py, 1); X.camSnap();
        leo = X.actor('leo', { x: PL.HX + 160, style: F.leoAt(2), flip: true, lean: 0.06 });
        bean = X.actor('bean', { dog: true, s: 220, x: PL.HX + 200, sit: 1, wag: 0.5 });
        pie = { x: PL.HX - 700, y: W.y3(PL.HX) - 420, k: 0, land: 0, letter: false };
        S.pie = pie;
      });
      X.bed(4, 0.13, 'walk');
      await X.years(20, 25, { age: 61, season: 'spring' });   /* a spring wedding */
      A.sfx('star', 0.8);
      T.announce('까치 한 마리가 언덕으로 날아와 팻말에 앉는다. 바람 우체국의 까치다.');
      const perch = [PL.BOARD_X + 6, W.y3(PL.BOARD_X) - 98];
      X.tween(pie, 'x', perch[0], 3.2, T.ease.out); await X.tween(pie, 'y', perch[1], 3.2, T.ease.io);
      pie.land = 1; A.sfx('step');
      const chatter = () => { for (let i = 0; i < 3; i++) A.note({ m: 86 - (i % 2) * 2, at: i * 0.14, vel: 0.12, voice: 'pluck', dur: 0.12 }); };
      chatter();
      bean.sit = 0; A.sfx('bark'); bean.flip = true;
      leo.flip = true;
      await X.walk(leo, PL.BOARD_X + 60, 90);
      await X.wait(0.4); chatter();
      await X.tap(() => [perch[0], perch[1] - 8, 50]);
      await TALK.say('leo', '…따라오라는 거니?');
      /* it goes on ahead, and he follows it to the cliff of cloud */
      pie.land = 0; A.sfx('whoosh');
      X.tween(pie, 'x', PL.HX + 900, 3, T.ease.in); X.tween(pie, 'y', perch[1] - 380, 3, T.ease.in).then(() => { S.pie = null; });
      X.walk(leo, PL.BOARD_X + 260, 90);
      await X.wait(1.6);

      /* ---- the post office: a letter has come for him, and it will not settle ---- */
      const po = T.place('post', { leoAge: 2 });
      const pl = po.actor('leo'), pb = po.actor('bean'), spl = po.spot('leo'), spb = po.spot('bean');
      pl.x = spl[0] - 420; pb.x = spb[0] - 400; pb.sit = 0;
      await X.view(po, { color: '#fff6e6', out: 1.3, in: 1.6 });
      T.announce('바람 우체국. 구름 절벽에 지은 높다란 우체국. 바람에 실려 온 편지들이 새처럼 날아다니다 제 칸에 내려앉는다. 지붕에는 까치들이 앉아 있다.');
      po.walkTo(pb, spb[0], 80).then(() => { pb.sit = 1; pb.flip = false; });
      await po.walkTo(pl, spl[0], 70);
      pl.flip = false;
      await X.wait(1.2);
      const pm = po.actor('post');
      pm.pose = (q, t) => { q.armF = { a: 1.9 + Math.sin(t * 1.5) * 0.08, b: 0.6 }; };
      await TALK.say('post', '왔구먼. 자네 앞으로 한 통 왔어.');
      pm.pose = (q) => { q.armF = { a: 2.6, b: 0.2 }; q.headTilt = -0.2; };
      await TALK.say('post', '크레파스로 별을 그린 거.\n…근데 도무지 내려앉질 않아.');
      pm.pose = null;
      T.announce('편지 잡기. 새처럼 날아다니는 편지 가운데 크레파스 별이 그려진 편지를 눌러 잡는다. 레오의 손 가까이 지나갈 때 스페이스나 엔터로도 잡을 수 있다.');
      await po.catchLetter();
      await X.wait(1);
      await TALK.say('leo', '…릴리 글씨야.', { slow: true });
      pm.pose = (q) => { q.face = Object.assign({}, q.face, { eye: 'happy' }); };
      await TALK.say('post', '그런 편지는\n받을 사람 손에만 앉더라고.');
      pm.pose = null;
      await X.card(invitation, { run: async (c) => { T.announce('릴리의 편지. 아빠, 나 결혼해. 보러 와 줄 거지? 릴리.'); await X.tween(c, 'w', 1, 4.4, T.ease.lin); }, max: 16 });
      await TALK.say('leo', '…우리 릴리가.', { slow: true });
      await TALK.say('leo', '…보러 와 달래.');
      await X.wait(0.8);

      /* ---- an answer has to go by dream; what a dream is made of comes over a few days ----
         He carries her letter about with him from now on: a little envelope with a crayon star, held in both hands */
      const letterProp = (g, j, o, a) => { if (a.letter) envelope(g, (j.handF[0] + j.handB[0]) / 2, (j.handF[1] + j.handB[1]) / 2 - 3, a.flip ? 0.12 : -0.12); };
      const reading = (o) => { o.armF = { hand: [14, -13] }; o.armB = { hand: [12, -11] }; o.headTilt = 0.26; };
      leo.go = null; leo.moving = false; leo.x = PL.BOARD_X + 60; leo.flip = true; leo.letter = true; leo.prop = letterProp; leo.pose = reading;
      bean.x = PL.BOARD_X + 185; bean.sit = 1; bean.flip = true; S.pie = null;
      X.cam(PL.BOARD_X + 40, py + 78, 1.6); X.camSnap();
      await X.view(null, { color: '#fff6e6', out: 1.3, in: 1.4 });

      /* that afternoon: Pipi, and the star on the envelope */
      const pipi = X.actor('kid', { x: PL.BOARD_X - 520, style: F.styles.kidA, s: 100 });
      await X.walk(pipi, PL.BOARD_X - 4, 120);
      pipi.flip = false;
      await TALK.say('kid', '우체국 다녀왔어?\n누구 편지야?');
      leo.pose = (o) => { reading(o); o.headTilt = 0.04; };
      await TALK.say('leo', '릴리 편지. 결혼한대.\n…대답을 해 주고 싶은데.');
      pipi.pose = (o, a, t) => { o.y -= Math.abs(Math.sin(t * 5)) * 3; o.face.eye = 'happy'; };
      await TALK.say('kid', '아나 아줌마한테 갔던 것처럼,\n꿈으로 가면 되잖아!');
      pipi.pose = null;
      S.tray = S.tray || { a: 0, fly: null }; S.trayHold = true; X.tween(S.tray, 'a', 1, 0.6);
      leo.pose = (o) => { reading(o); o.headTilt = 0.18; };
      await TALK.say('leo', '냄새, 소리, 빛….\n그 애가 아는 걸로.', { slow: true });
      /* he bends to show it; Pipi looks */
      leo.pose = (o) => { o.lean = 0.2; o.headTilt = 0.3; o.armF = { hand: [17, -3] }; o.armB = { hand: [15, -2] }; };
      pipi.pose = (o) => { o.lean = 0.14; o.headTilt = -0.12; };
      await X.wait(0.8);
      await TALK.say('kid', '누나는 아직도 크레파스로 그리네.\n어릴 때 맨날 그렸다며.');
      leo.pose = (o) => { reading(o); o.headTilt = 0.1; o.face.eye = 'happy'; };
      await TALK.say('leo', '응. 벽지에도 그렸지.');
      pipi.box = 0;
      pipi.prop = (g, j, o, a) => { if (a.box != null) crayonBox(g, j.handF[0] + 2, j.handF[1] - 4, a.box); };
      pipi.pose = (o) => { o.armF = { hand: [15, -15] }; o.lean = 0.08; o.face.eye = 'happy'; };
      await TALK.say('kid', '그럼 냄새는 이거!\n내 크레파스.');
      const boxAt = () => (pipi.j ? [pipi.j.handF[0] + 2, pipi.j.handF[1] - 4] : [pipi.x + 16, W.y3(pipi.x) - 50]);
      await X.tap(() => [boxAt()[0], boxAt()[1], 34]);
      A.sfx('crayon'); X.tween(pipi, 'box', 1, 0.3);
      await X.gift('scent', W.toScreen(boxAt()[0], boxAt()[1] - 8));
      await TALK.say('kid', '냄새만 가져가.\n크레파스는 내 거야.');
      pipi.pose = null; pipi.box = null;
      leo.pose = (o) => { reading(o); o.headTilt = 0.04; o.face.eye = 'happy'; };
      await TALK.say('leo', '그래. 고마워, 피피.');
      S.trayHold = false; X.tween(S.tray, 'a', 0, 0.8);
      X.walk(pipi, PL.BOARD_X - 640, 120).then(() => { pipi.hidden = true; });
      leo.pose = reading;
      await X.wait(1.6);

      /* some evenings later, at the table: the wind finds the swing */
      const sitting = (o) => { o.armF = { hand: [13, -11] }; o.armB = { hand: [11, -9] }; o.headTilt = 0.28; o.lean = 0.1; };
      await X.dip(async () => {
        S.actors.splice(S.actors.indexOf(pipi), 1);
        leo.go = null; leo.moving = false; leo.x = PL.TABLE_X - 66; leo.chair = 1; leo.flip = false; leo.pose = sitting;
        bean.x = PL.HX - 20; bean.sit = 1; bean.flip = false;
        ps.night = 0.56;
        X.cam(PL.TABLE_X + 80, py + 40, 1.4); X.camSnap();
      }, { color: '#2a2f4a', out: 1.1, in: 1.3 });
      X.bed(5, 0.12, 'home');
      X.age('며칠 뒤');
      await X.wait(3.4);
      A.sfx('wind');
      S.swingAmp = 0; S.swinging = true; X.tween(S, 'swingAmp', 0.16, 1.6);
      await X.wait(1.2); A.sfx('creak');
      await X.wait(1.3);
      leo.pose = (o) => { sitting(o); o.headTilt = -0.04; };   /* he looks up */
      await X.wait(0.6); A.sfx('creak');
      await X.wait(1.0);
      leo.chair = 0; leo.pose = null; leo.letter = false;
      await X.walk(leo, PL.TREE_X + 14, 70);
      leo.flip = false;
      T.announce('레오가 빈 그네를 밀어 본다. 릴리에게 만들어 주겠다던 그네.');
      const seat0 = () => { const q = PL.swingSeat(ps); return [q[0], q[1] - 6, 46]; };
      await X.tap(seat0);
      leo.pose = (o) => { o.armF = { a: 1.4, b: 0.3 }; o.armB = { a: 1.2, b: 0.4 }; o.lean = 0.14; };
      X.tween(S, 'swingAmp', 0.5, 0.6); A.sfx('creak');
      await X.wait(1.1); A.sfx('creak'); leo.pose = null;
      const sq = PL.swingSeat(ps);
      await X.gift('sound', W.toScreen(sq[0], sq[1]));
      await X.wait(0.6); A.sfx('creak');
      await TALK.say('leo', '…이 소리.\n그 애가 그림으로만 타 본 그네.');
      X.tween(S, 'swingAmp', 0, 2.4).then(() => { S.swinging = false; ps.swingA = 0; });
      await X.wait(1.6);

      /* the evening before the wedding, on the quay: 구름이 and her little lamp */
      let cloud, qleo, qbean;
      await X.dip(async () => {
        S.actors = []; S.boats = []; S.swinging = false; ps.swingA = 0; S.swingAmp = 0.5;
        ps.night = 0.56;
        X.cam(500, 532, 2.05); X.camSnap();
        cloud = X.cloudKid({ x: 468 });   /* on her crates, face to the sky, the little lamp in her lap */
        cloud.lit = 1; cloud.offer = 0;
        const sitUp = cloud.pose;
        cloud.pose = (q, a, t) => {
          sitUp(q, a, t);
          const k = T.ease.io(a.offer);
          q.armF = k > 0.01 ? { hand: [T.lerp(9, 17, k), T.lerp(-4, -16, k)] } : { hand: [9, -4] };
          q.armB = { a: -0.3, b: 0.2 };
          if (a.down) q.headTilt = 0.3;
        };
        cloud.prop = (g, j, o, a) => { W.handLamp(g, j.handF, a.lit); };
        S.lampOf = cloud;
        qleo = X.actor('leo', { x: 940, style: F.leoAt(2), flip: true, lean: 0.06, letter: true, prop: letterProp, pose: reading });
        qbean = X.actor('bean', { dog: true, s: 220, x: 990, flip: true, wag: 0.5 });
      }, { color: '#1b2440', out: 1.2, in: 1.4 });
      X.bed(1, 0.12, 'sea');
      X.age('결혼식 전날');
      X.walk(qbean, 646, 64).then(() => { qbean.sit = 1; qbean.flip = true; });
      await X.walk(qleo, 540, 56);
      qleo.flip = true;
      await X.wait(0.8);
      cloud.look = true; cloud.flip = false;   /* she turns round to him */
      await X.wait(0.4);
      await TALK.say('cloud', '아저씨, 또 편지 봐?');
      qleo.pose = (o) => { reading(o); o.headTilt = 0.08; };
      await TALK.say('leo', '내일이야, 결혼식.\n오늘 밤엔 대답하러 가야 하는데.');
      await TALK.say('leo', '빛이 하나 모자라.\n어두운 데서 길 잃지 않게.');
      cloud.down = true;   /* she looks at her lamp */
      await X.wait(1.4);
      cloud.down = false;
      await X.tween(cloud, 'offer', 1, 0.8);
      await TALK.say('cloud', '이거 가져가.\n길 비춰 줄 거야.');
      await TALK.say('leo', '그건 네가 기다릴 때 드는 거잖아.');
      await TALK.say('cloud', '괜찮아.\n금방 또 켜져.');
      const lampAt = () => (cloud.j ? [cloud.j.handF[0], cloud.j.handF[1] + 24] : [cloud.x + 14, C.PIER_Y - 40]);
      await X.tap(() => [lampAt()[0], lampAt()[1], 30]);
      qleo.pose = (o) => { reading(o); o.lean = 0.14; o.headTilt = 0.14; };
      X.tween(cloud, 'lit', 0.12, 0.6);
      await X.gift('light', W.toScreen(lampAt()[0], lampAt()[1]));
      await X.tween(cloud, 'lit', 1, 1.8, T.ease.io);   /* and it is lit again, as she said */
      X.tween(cloud, 'offer', 0, 0.8);
      qleo.pose = (o) => { reading(o); o.headTilt = 0.06; o.face.eye = 'happy'; };
      await TALK.say('leo', '…고마워, 구름아.');
      await TALK.say('cloud', '내가 비춰 줄게.\n저 아래까지.');
      /* she hops down off the crates, and the three of them go out along the pier, to the very end of it: where
         she stands with her lamp for every boat */
      cloud.chair = 0; cloud.y = W.groundAt(cloud.x) - 22; A.sfx('step');
      await X.tween(cloud, 'y', W.groundAt(cloud.x), 0.28, T.ease.in);
      cloud.y = null; cloud.look = true;
      cloud.pose = (q, a) => {
        q.headTilt = a.down ? 0.3 : 0.04;
        q.armF = a.held ? { a: 1.9, b: 0.5 } : { hand: [12, -2] };   /* held out over the cloud sea, the way she holds it for the boats */
        q.armB = { a: 0.2, b: 0.3 };
      };
      qleo.pose = null; qleo.letter = false; qbean.sit = 0;
      X.cam(150, 548, 1.95, 0.42);
      X.walk(cloud, 52, 54).then(() => { cloud.flip = true; cloud.held = true; });
      X.walk(qbean, 184, 60).then(() => { qbean.sit = 1; qbean.flip = true; });
      await X.wait(0.7);
      await X.walk(qleo, 108, 54);
      qleo.flip = true;
      X.cam(60, 566, 2.05, 0.8);
      await X.wait(1.0);
      cloud.down = true;   /* down, past the end of the pier, to where the cloud goes on below */
      T.announce('부두 끝. 구름이가 다시 켜진 등불을 구름바다 위로 내민다.');
      await X.wait(1.4);
      /* he goes down on one knee at the edge, and what he has gathered comes into his hands as one light */
      const cupped = (o) => { o.armF = { hand: [18, -13] }; o.armB = { hand: [16, -11] }; o.headTilt = 0.3; };
      qleo.pose = cupped;
      await X.gesture(qleo, 'kneel', { hold: true });
      S.trayHold = true; X.tween(S.tray, 'a', 1, 0.5);
      await X.wait(1.0);
      const E = [-104, C.PIER_Y + 62];   /* out past the end of the pier, into the cloud */
      S.send = { who: qleo, fly: 0, k: 0, p: 0, sink: 0, path: 0, E };
      X.spendDream(); A.sfx('join');
      await X.tween(S.send, 'fly', 1, 1.5, T.ease.lin);
      S.send.fly = null; X.tween(S.send, 'k', 1, 0.5); A.note({ m: 77, vel: 0.3, voice: 'glass', dur: 2 });
      S.trayHold = false; X.tween(S.tray, 'a', 0, 1.0);
      await X.wait(1.0);
      /* drawn down, over the edge of the pier and into the cloud: the way the ones who come come up */
      T.announce('모은 꿈을 부두 끝에서 구름바다 아래로 내려보낸다. 빛을 아래로 끌어 내린다.');
      qleo.pose = (o) => { const r = T.clamp(T.ease.io(S.send.p) / 0.45); o.lean = 0.06 + r * 0.2; o.headTilt = 0.26 + r * 0.14; o.armF = { hand: [18 + r * 8, -13 + r * 27] }; o.armB = { hand: [16 + r * 8, -11 + r * 27] }; };
      let tick = 0;
      await X.drag({
        axis: 'y', sign: 1, dist: 260,
        on: (p) => { S.send.p = p; const n = Math.floor(p * 4); if (n > tick) { tick = n; A.note({ m: [77, 74, 72, 69][n - 1] || 69, vel: 0.22, voice: 'glass', dur: 1.6 }); } },
        hint: () => { const a = qleo.j ? W.toScreen((qleo.j.handF[0] + qleo.j.handB[0]) / 2, (qleo.j.handF[1] + qleo.j.handB[1]) / 2) : W.toScreen(qleo.x - 20, C.PIER_Y - 60); return [a, W.toScreen(E[0], E[1])]; },
      });
      /* it sinks into the cloud, and her lamp lays its light down after it; for a while nothing sounds at all */
      X.hush(); A.sfx('ripple');
      qleo.pose = (o) => { cupped(o); o.armF = { hand: [20, 8] }; o.armB = { hand: [18, 10] }; o.headTilt = 0.4; };
      X.tween(S.send, 'path', 1, 1.8);
      await X.tween(S.send, 'sink', 1, 2.8, T.ease.lin);
      T.announce('빛이 구름 속으로 가라앉는다. 구름이의 등불 빛이 그 뒤를 따라 아래로 길을 낸다.');
      await X.wait(1.4);

      /* ---- her dream: the room she drew when she was six, and it will not keep still ---- */
      const D = T.tiltDream();
      await X.view(D, { color: '#1b2440', out: 1.4, in: 0.4 });
      A.score('dream');
      ps.night = 0; S.lampOf = null; S.send = null;
      T.announce('꿈. 릴리가 여섯 살 때 그린 방이 이리저리 기울어 있다.');
      A.sfx('whoosh');
      await X.tween(D.fall, 'k', 1, 3.6, T.ease.lin);
      T.announce('기울어지는 방. 왼쪽이나 오른쪽을 누르면 방이 돌고, 떠 있는 것은 모두 미끄러진다. 아빠 인형과 릴리 인형을 문으로 내보낸다.');
      await D.solve();
      /* the room rights itself, and goes quiet: she is on her bed with his picture in her lap */
      D.dark = false; X.hush();
      await X.tween(D.meet, 'k', 1, 1.8);
      T.announce('방이 바로 선다. 침대에 앉은 릴리, 무릎에 아빠 사진. 문으로 레오가 들어와 침대 곁에 무릎을 꿇는다.');
      const inPic = (x, z) => T.clamp(x, -T.view.W / 2 * (1 - 1 / z), T.view.W / 2 * (1 - 1 / z));   /* a camera inside a view stays within the picture */
      X.vcam(inPic(-40, 1.15), 500, 1.15, 3.2);   /* in, between her bed and the door */
      X.age('릴리, 31');
      await X.wait(1.0);
      await X.tween(D.near, 'k', 1, 3.6, T.ease.io);
      await TALK.say('lily', '…아빠?', { slow: true });
      X.bed(2, 0.1, 'night');   /* and the music comes back, softly */
      await TALK.say('leo', '편지 받았어.\n바람에 실려 왔더라.');
      X.tween(D.tears, 'k', 1, 1.4);
      await TALK.say('lily', '…정말? 아빠 사진 앞에 두기만 했는데.');
      await TALK.say('lily', '내일, 아빠 자리는 그냥 비워 두려고.\n…이상하지?', { slow: true });
      await X.wait(0.8);
      X.tween(D.cheek, 'k', 1, 1.2);   /* his hand to her cheek */
      await TALK.say('leo', '아니. 그 자리, 내가 걸을게.');
      X.tween(D.cheek, 'k', 0, 0.9);
      X.tween(D.arm, 'k', 1, 1.1);   /* she looks down at her arm */
      await TALK.say('leo', '팔 한쪽만 비워 둬.', { slow: true });
      X.tween(D.arm, 'k', 0, 0.9);
      await X.wait(0.4);
      /* little fingers, on the four notes: her word comes in on the last of them */
      T.announce('둘이 새끼손가락을 건다.');
      A.motif({ voice: 'felt', vel: 0.4, beat: 0.8 });
      await X.tween(D.hold, 'k', 1, 1.6);
      await TALK.say('lily', '…약속.', { slow: true });
      await TALK.say('leo', '약속.', { slow: true });
      await X.wait(1.2);
      /* the promise he made her when she was six: in her dream, the room opens onto the hilltop and the apple tree,
         and Lily as she is now sits on the swing he built while he pushes */
      X.bed(5, 0.13, 'walk');
      X.vcam(inPic(100, 1.15), 500, 1.15, 2.4);
      await X.tween(D.swing, 'k', 1, 2.4, T.ease.io);
      await TALK.say('leo', '그리고… 이거.');
      T.announce('꿈속, 언덕 위 사과나무에 레오가 만든 그네가 걸려 있다.');
      await X.wait(1.2);
      await TALK.say('lily', '…그네네.', { slow: true });
      await TALK.say('leo', '아빠가 만들어 준다고 했잖아.\n…많이 늦었지.', { slow: true });
      T.announce('릴리가 그네에 앉는다. 레오가 등을 민다.');
      A.sfx('creak'); await X.wait(1.3); A.sfx('creak');
      X.tween(D.laugh, 'k', 1, 0.4);
      await TALK.say('lily', '더 높이!');
      /* higher, and the camera steps back to give her the sky */
      X.tween(D.high, 'k', 1, 6, T.ease.io); X.vcam(0, 450, 1, 7);
      A.sfx('creak');
      await TALK.say('leo', '그래. 더 높이.', { slow: true });
      X.tween(D.laugh, 'k', 0.5, 1.5);
      A.sfx('creak'); await X.wait(2.2); A.sfx('creak'); await X.wait(1.6);
      /* back on the hill, the same night: flowers for the road she walks tomorrow. The dream goes white at the top
         of a swing, so that the gladness carries over */
      let toTop = ((((Math.PI * 1.5 - T.time * 1.7) % TAU) + TAU) % TAU / 1.7) * T.pace - 0.8;   /* she is furthest out (dreamroom.js swingHill) half-way into the white */
      if (toTop < 0) toTop += (TAU / 1.7) * T.pace;
      await X.wait(toTop);
      S.actors = []; S.boats = [];
      leo = X.actor('leo', { x: PL.BOARD_X + 40, style: F.leoAt(2), flip: true, lean: 0.06 });
      bean = X.actor('bean', { dog: true, s: 220, x: PL.BOARD_X + 170, sit: 1, flip: true, wag: 0.5 });
      S.garland = { k: 0, on: false, who: leo };
      const holding = (o) => { const k = T.ease.io(S.garland.k), up = Math.sin(Math.min(1, k * 1.25) * Math.PI / 2); o.armF = { hand: [T.lerp(13, 15, up), T.lerp(-6, -40, up)] }; o.armB = { hand: [T.lerp(9, 30, up), T.lerp(-4, -36, up)] }; o.headTilt = T.lerp(0.18, -0.24, up); o.lean = 0.04; };
      leo.pose = holding;
      ps.night = 0.85; X.cam(PL.BOARD_X + 34, W.y3(PL.BOARD_X) - 92, 2.6); X.camSnap();   /* close: the list, and his hands */
      A.score(null);
      await X.view(null, { color: '#fff6e6', out: 1.6, in: 1.6 });
      X.bed(4, 0.13, 'night');
      await X.wait(0.6);
      await TALK.say('leo', '내일 걸을 길에\n꽃이라도 걸어 둬야지.');
      T.announce('레오가 엮어 둔 꽃 화환을 길가의 팻말에 건다.');
      await X.tap(() => [PL.BOARD_X, W.y3(PL.BOARD_X) - 100, 40]);
      A.sfx('paper');
      await X.tween(S.garland, 'k', 1, 1.5, T.ease.io);
      S.garland.on = true; A.sfx('knock', 0.2); X.notes(2, { voice: 'box', vel: 0.3 });
      leo.pose = (o) => { o.headTilt = -0.14; o.face.eye = 'happy'; };
      bean.wag = 1.2;
      await X.wait(2.4);
      leo.pose = null;

      /* ---- the walk: the chapter's one lake ---- */
      const V = wedding();
      await X.view(V, { out: 1.4, in: 1.6 });
      A.score('wedding');
      T.announce('호수 속에서 릴리가 아나의 팔짱을 끼고 입장한다. 꽃길 끝에 신랑이 기다린다. 레오는 꽃길 위에서 릴리와 나란히 걷는다. 릴리는 제 걸음으로 걷다가, 두 번 멈춰 비워 둔 팔을 내려다본다. 걸음이 맞으면 레오의 그림자가 그 빈 팔을 채우고, 뒤처지거나 앞서면 엷어진다. 누르면 걷고, 한 번 더 누르면 멈춘다.');
      await V.walked;
      /* she is there. The notes stop, and for a breath nothing sounds; she looks at the arm she kept free */
      await X.wait(1.5);
      X.tween(V.look, 'k', 1, 1.3);
      await X.wait(1.0);
      await TALK.say('lily', '…아빠, 옆에 있었지?', { pass: true, auto: 2.5 });
      await TALK.say('leo', '응. 끝까지.', { slow: true });
      X.tween(V.look, 'k', 0, 0.9);
      /* she holds her mother; he bows his head; the lullaby, slowly, going on alone into the next scene */
      const themeAt = S.clock.t, themeLen = A.theme({ voice: 'box', vel: 0.34, beat: 0.8 }) || 0;
      await X.tween(V.hug, 'k', 1, 1.2);
      X.tween(V.bow, 'k', 1, 1.6);
      await X.wait(5.0);

      /* ---- the swing: he did push her on it, if only in a dream. And it is still a six-year-old's swing ---- */
      ps.night = 0;   /* back from the wedding; the garland is still on the list */
      leo.x = PL.TREE_X - 40; leo.flip = false; bean.x = PL.TABLE_X - 74; bean.flip = false; bean.sit = 1; bean.wag = 0.5;
      X.cam(PL.TREE_X + 40, py + 40, 1.5); X.camSnap();
      S.bedNow = null;   /* nothing under the lullaby until it is done */
      await X.view(null, { color: '#fff6e6', out: 2.0, in: 1.6 });
      const seat = () => { const q = PL.swingSeat(ps); return [q[0], q[1] - 6, 46]; };
      await X.tap(seat);
      await X.walk(leo, PL.TREE_X + 36, 60);
      leo.flip = false;
      leo.pose = (o) => { o.headTilt = 0.16; o.face.eye = 'happy'; };
      S.swingAmp = 0; S.swinging = true; X.tween(S, 'swingAmp', 0.14, 3);   /* a breeze has it swaying a little while he looks */
      await X.wait(Math.max(1.2, themeAt + Math.max(0, themeLen - 2.6) * T.pace - S.clock.t));   /* after the lullaby's last bar */
      await TALK.say('leo', '…태워 줬다.\n꿈에서라도.', { slow: true });
      A.score(null); X.bed(5, 0.13, 'home');
      X.tween(S, 'swingAmp', 0, 1.6).then(() => { S.swinging = false; ps.swingA = 0; });
      await TALK.say('leo', '더 높이, 그러더라.\n여섯 살 때 그림처럼.');
      /* a step closer, a hand on the rope, and a look down at the seat: it is the width of a child */
      await X.walk(leo, PL.swingSeat(ps)[0] - 32, 40);
      leo.flip = false;
      leo.pose = (o) => { const q = PL.swingSeat(ps); o.lean = 0.2; o.headTilt = 0.36; o.armF = { hand: F.local(o, q[0] - q[2] / 2 + 3, q[1] - 30) }; };
      await X.wait(1);
      await TALK.say('leo', '근데 이건 여섯 살 자리네.\n다 큰 우리 릴리는 못 앉겠다.');
      let stepN = 0;
      leo.pose = (o) => { o.armF = { a: 1.2, b: 0.5 }; o.lean = 0.16; };
      await X.drag({
        axis: 'x', sign: 1, dist: 240,
        on: (p) => { ps.swingW = p; const n = Math.floor(p * 5); if (n > stepN) { stepN = n; X.note(); A.sfx('knock', n / 5); } },
        hint: () => { const q = PL.swingSeat(ps); const a = W.toScreen(q[0] + q[2] / 2, q[1] + 3), b = W.toScreen(q[0] + q[2] / 2 + 80, q[1] + 3); return [a, b]; },
      });
      T.announce('레오는 그네를 허물지 않고, 어른 둘이 앉을 수 있게 넓힌다.');
      A.promise();
      /* he tries it, on one side, with the other left free */
      await X.wait(0.8);
      const q = PL.swingSeat(ps);
      leo.pose = (o) => { PL.sitOnSwing(o, ps, -1); o.face.eye = 'happy'; };
      leo.x = q[0] - 16; leo.hill = 3;
      S.swinging = true; S.swingAmp = 0.3;
      await X.wait(1.4);
      await TALK.say('leo', '…이제 어른 둘도 앉겠다.');
      await X.wait(3);
      X.end();
    },
  });
})();
