/* Chapter 5 「꽃길」 — years fifteen to twenty-five. The roof goes up, on the whole town's count.
   Years later a magpie fetches him to the post office of the wind, where Lily's letter (she is getting
   married) has come in and will not settle until he catches it. An answer has to go by dream, and what a dream
   is made of comes to him over a few days, each thing in its own time: that afternoon Pipi's crayons (there is
   a crayon star on her envelope), some evenings later the creak of the swing when the wind finds it, and on
   the evening before the wedding the light of 구름이's little lamp. He goes into Lily's dream, kneels by her
   bed and hooks little fingers with her on walking beside her empty arm, and pushes her on the swing he once
   promised her. At the wedding he walks the flower road beside her; afterwards, glad, he finds the swing still
   the size of a six-year-old, and makes it wide enough for the Lily she is now. */
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

  /* ---------- the wedding, walked ---------- */
  function wedding() {
    const V = { dark: false, quiet: true, p: 0, held: false, until: 0, ph: 0, done: false, steps: 0, stir: 0, hug: { k: 0 }, bow: { k: 0 }, petals: [], res: null };
    const SHORE = 470, LX = -150, LEN = 1750;
    const r0 = T.rng(41);
    for (let i = 0; i < 46; i++) V.petals.push({ x: (r0() - 0.5) * 2000, y: r0() * 470, v: 26 + r0() * 30, ph: r0() * 9, c: ['#f6b6c2', '#fbe3a8', '#ffffff', '#e58aa0'][i % 4] });
    V.walked = new Promise((res) => { V.res = res; });
    V.pointer = function (type) { if (V.done) return false; if (type === 'down') V.held = true; else if (type === 'up') V.held = false; return true; };
    V.key = function (key) { if (V.done) return false; if (key === 'ArrowRight' || key === ' ' || key === 'Enter') { V.until = T.time + 0.3; return true; } return false; };
    V.want = function () { return V.done ? null : 'hold'; };
    V.update = function (dt, S) {
      const going = !V.done && (V.held || T.time < V.until);
      V.going = going;
      V.stir += ((going ? 1 : 0) - V.stir) * Math.min(1, dt * 2);
      if (going) {
        S.idle = 0;
        V.p = Math.min(1, V.p + dt / 27);
        V.ph += dt * 5.4;
        const st = Math.floor(V.ph / Math.PI);
        if (st !== V.steps) { V.steps = st; T.audio.sfx('step'); if (st % 2 === 0) S.X.note({ voice: 'felt', vel: 0.42 }); }
        if (V.p >= 1) { V.done = true; V.res(); }
      }
      for (const q of V.petals) { q.y += q.v * dt; q.ph += dt; if (q.y > SHORE) { q.y = -10; } }
    };
    /* the neighbours along the road; Pipi and 구름이 together near the middle of it */
    const guests = [[260, F.styles.villagerB, 132], [330, F.styles.villagerC, 138], [650, F.styles.kidA, 100], [700, F.styles.cloud, 94], [1030, F.styles.villagerA, 140], [1100, F.styles.villagerB, 132], [1420, F.styles.villagerC, 142], [1500, F.styles.post, 140]];
    V.draw = function (g, t, S) {
      const W = T.view.W, wx = V.p * LEN, hint = T.clamp((S.idle - 2) / 1.2);
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
      guests.forEach((q, i) => {
        const x = q[0] - wx + 120;
        if (x < -W / 2 - 80 || x > W / 2 + 80) return;
        const near = T.clamp(1 - Math.abs(x - LX) / 420);
        F.person(g, { x, y: SHORE - 44 - F.hipHeight(q[1], q[2]), s: q[2], style: q[1], flip: x > LX, lean: 0.06, face: { eye: 'happy', mouth: 'smile', blush: 0.2 }, armF: { a: 1.2 + near * 1.2 + Math.sin(t * 8 + i) * 0.2 * near, b: 0.4 }, armB: { a: 0.6 + near * 1.4, b: 0.4 } });
      });
      const bow = T.ease.io(V.bow.k);
      const leo = { x: LX, y: SHORE - 6 - F.hipHeight(F.styles.leoHome, 190), s: 190, style: F.leoAt(2), lean: 0.05 + bow * 0.12, headTilt: bow * 0.3, face: { blush: 0.16, mouth: 'smile', eye: bow > 0.5 ? 'closed' : 'open', tear: bow * 0.8, tearY: (t * 2) % 3 } };
      if (V.going) leo.walk = V.ph;
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
        if (x < -W / 2 - 40 || x > W / 2 + 40) continue;
        const col = ['#5d6f8a', '#8a5578', '#3f6b70', '#6b5a48', '#9a6b43'][((i % 5) + 5) % 5];
        P.fill(g, P.rr(x - 19, SHORE - 96, 38, 62, 13), col);
        P.fill(g, P.circle(x, SHORE - 110, 14), ['#3a2b25', '#6b4a3a', '#d9d2c6', '#2a2024'][((i % 4) + 4) % 4]);
        P.fill(g, P.rr(x - 31, SHORE - 62, 62, 30, 5), '#5a4a5e');
        P.fill(g, P.rr(x - 31, SHORE - 64, 62, 6, 3), '#77657a');
      }
      P.fill(g, P.box(-W / 2, SHORE - 36, W, 36, 0, 2), '#c9573f');
      /* Ana, Lily, and beside Lily's free arm the one who is not there */
      const hug = T.ease.io(V.hug.k);
      const ana = { x: LX + 180 - hug * 62, y: SHORE - 6 - F.hipHeight(F.styles.ana, 176), s: 176, style: F.anaAt(61), flip: hug > 0.4, lean: 0.05, face: { eye: 'happy', mouth: 'smile', blush: 0.24, tear: 0.6, tearY: (t * 2) % 3 } };
      const lst = F.lilyAt(31, { top: '#fbf7ec', bottom: '#fbf7ec', skirt: 44, shoe: '#fbf7ec' });
      const lily = { x: LX + 92, y: SHORE - 6 - F.hipHeight(lst, 178), s: 178, style: lst, lean: 0.04, face: { eye: hug > 0.5 ? 'closed' : 'open', mouth: 'smile', blush: 0.3 } };
      if (V.going) { ana.walk = V.ph + 0.6; lily.walk = V.ph + 0.3; }
      ana.armB = { hand: F.local(ana, lily.x + 20, lily.y - 40) };
      lily.armF = hug > 0.02 ? { hand: F.local(lily, ana.x - 6, ana.y - 60), bend: 1 } : { hand: F.local(lily, ana.x - 22, ana.y - 34) };
      lily.armB = { a: 0.5, b: 1.5 };
      F.person(g, ana);
      const lj = F.person(g, lily);
      /* veil and flowers */
      g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.moveTo(lj.head[0] - 6, lj.head[1] - 20); g.quadraticCurveTo(lj.head[0] - 50, lj.head[1] + 20, lj.head[0] - 46, lj.head[1] + 110); g.lineTo(lj.head[0] - 14, lj.head[1] + 60); g.closePath(); g.fill();
      [['#e58aa0', -6, 0], ['#f6f0e0', 6, -4], ['#f1c04a', 2, 8], ['#9ab86a', -10, 8]].forEach((b) => P.fill(g, P.circle(lj.handF[0] + b[1], lj.handF[1] + b[2], 7), b[0]));
      g.globalAlpha = 0.8 * (1 - hug * 0.5);
      F.person(g, Object.assign({}, leo, { face: { blush: 0.16, mouth: 'smile' }, headTilt: 0, lean: 0.05 }));
      g.restore();
      /* water over all of it */
      g.fillStyle = 'rgba(40,70,112,0.2)'; g.fillRect(-W / 2, SHORE, W, 430);
      g.strokeStyle = 'rgba(230,240,255,0.16)'; g.lineWidth = 2;
      for (let i = 0; i < 16; i++) { const y = SHORE + 14 + i * 27, off = Math.sin(t * 1.1 + i * 1.7) * 30; g.beginPath(); g.moveTo(-W / 2, y); for (let x = -W / 2; x <= W / 2; x += 80) g.quadraticCurveTo(x + 40 + off * 0.2, y + Math.sin(x * 0.01 + t * 1.6 + i) * 5, x + 80, y); g.stroke(); }
      g.fillStyle = 'rgba(255,240,205,0.5)'; g.fillRect(-W / 2, SHORE - 1, W, 3);
      if (!V.done && hint > 0) {
        P.text(g, '꾹 누른 채로, 릴리 곁을 걸어 주세요', 0, 852, { font: 'serif', size: 26, color: '#f3ead8', alpha: 0.9 * hint });
        P.beacon(g, LX, SHORE - 90, 70, t, hint, '#fff0c8');
      }
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

  T.stage('ch5', {
    chapter: 5, title: ['5장', '꽃길'], end: ['5장 끝', '6장 「다 지킨 약속」'], next: 'ch6', pad: 3,
    plot: { stage: 3, stones: 4, board: true, table: true, tree: 0.6, swing: 0, garden: 0.4, patch: 2, fruit: 1 },   /* the swing is built during the first years card */
    flags: { bramGone: true, rosaGone: true },   /* Bram and Marta, and Rosa and her son, went on in chapter 4 */
    update(dt, S) { if (S.swinging) S.ps.swingA = Math.sin(T.time * 1.5) * (S.swingAmp == null ? 0.5 : S.swingAmp); },
    /* after dark, a lamp in a small hand shines over the evening, not under it */
    after(g, S) {
      const c = S.lampOf, n = S.ps.night;
      if (!c || !c.j || c.hidden || n < 0.05) return;
      const h = c.j.handF;
      T.world.layer(g, 1);
      P.glow(g, h[0], h[1] + 24, 60, '#ffd98a', 0.55 * n * (c.lit == null ? 1 : c.lit));
      g.restore();
    },
    onHill(g, h, S) {
      if (S.roofK != null && h === T.world.hillOf(T.plot.HX)) {   /* the ridge beam, coming up the side of the house on the rope */
        const x = T.plot.HX, gy = T.world.y3(x), y = gy - 40 - 210 * S.roofK;
        P.fill(g, P.rr(x - 150, y - 8, 300, 16, 6), '#b98a5a'); P.fill(g, P.rr(x - 150, y - 8, 300, 5, 3), '#d1a676');
      }
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
      await X.years(15, 20, { age: 56, during: (d) => { X.tween(ps, 'tree', 0.85, d); X.tween(ps, 'garden', 1, d); X.wait(d * 0.4).then(() => { A.sfx('knock', 0.3); X.tween(ps, 'swing', 1, d * 0.4); }); } });
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
      await X.years(20, 25, { age: 61 });
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
      await TALK.say('leo', '…우체국에서 왔구나.');
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
      await TALK.say('leo', '보러 와 줄 거지, 래.');
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
      await TALK.say('leo', '삐걱.\n그 애가 그림으로만 타 본 그네.');
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
      await TALK.say('cloud', '나도 같이 갈래.');
      /* she hops down off the crates, and the three of them go along the quay to the lake */
      cloud.chair = 0; cloud.y = W.groundAt(cloud.x) - 22; A.sfx('step');
      await X.tween(cloud, 'y', W.groundAt(cloud.x), 0.28, T.ease.in);
      cloud.y = null; cloud.pose = (q) => { q.armF = { hand: [12, -2] }; };
      qleo.pose = null; qleo.letter = false; qbean.sit = 0;
      X.walk(qleo, 1000, 64); X.walk(qbean, 1060, 70); X.walk(cloud, 940, 58);
      await X.wait(2);

      /* ---- the lake: the night before ---- */
      const way = T.lakeHelp({ level: 2, who: 31, home: F.anaAt(61), leoAge: 2, friend: F.styles.cloud });
      await X.view(way, { color: '#1b2a40' });
      S.lampOf = null;
      T.announce('거울 호수. 결혼식 전날 밤, 비 오는 길을 릴리가 혼자 옛집으로 걷는다. 물가의 것들을 옮기면, 그 그림자가 그 길에 닿는다.');
      await TALK.say('leo', '…옛집으로 가는구나.', { slow: true });
      await way.done();
      await X.wait(1.2);
      const eve = T.lake({ paint: T.vig.eve, leo: F.leoAt(2) });
      await X.view(eve, { color: '#1b2a40' });
      X.age('릴리, 31');
      T.announce('거울 호수. 결혼식 전날 밤, 어릴 적 방에서 릴리가 잠들지 못하고 있다. 손에는 아빠 사진.');
      await X.wait(2.6);
      await TALK.say('leo', '…내일인데, 못 자고 있구나.');
      S.trayHold = true; X.tween(S.tray, 'a', 1, 0.5);
      await X.wait(1.4);
      S.trayHold = false; X.tween(S.tray, 'a', 0, 1.2); X.spendDream();
      T.announce('모은 꿈을 호수에 띄운다. 빛을 끌어 물속으로 보낸다.');
      await eve.offerMote();
      A.sfx('whoosh'); eve.beat = 2;
      await X.wait(1.2);

      /* ---- her dream: the room she drew when she was six, and it will not keep still ---- */
      const D = T.tiltDream();
      await X.view(D, { color: '#1b2440', out: 1.2, in: 0.4 });
      T.announce('꿈. 릴리가 여섯 살 때 그린 방이 이리저리 기울어 있다.');
      A.sfx('whoosh');
      await X.tween(D.fall, 'k', 1, 3.6, T.ease.lin);
      T.announce('기울어지는 방. 왼쪽이나 오른쪽을 누르면 방이 돌고, 떠 있는 것은 모두 미끄러진다. 아빠 인형과 릴리 인형을 문으로 내보낸다.');
      await D.solve();
      await X.tween(D.meet, 'k', 1, 1.8);
      T.announce('방이 바로 선다. 침대에 앉은 릴리. 문으로 레오가 들어와 침대 곁에 무릎을 꿇는다.');
      await X.tween(D.near, 'k', 1, 3.6, T.ease.io);
      await TALK.say('lily', '…아빠?');
      await TALK.say('leo', '편지 받았어.\n바람에 실려 왔더라.');
      await TALK.say('lily', '…정말? 아빠 사진 앞에 두기만 했는데.');
      await TALK.say('lily', '내일, 아빠 자리는 그냥 비워 두려고.\n…이상하지?');
      await TALK.say('leo', '아니. 그 자리, 내가 걸을게.');
      await TALK.say('leo', '팔 한쪽만 비워 둬.');
      T.announce('둘이 새끼손가락을 건다.');
      await X.tween(D.hold, 'k', 1, 1.6);
      await TALK.say('lily', '…약속.', { slow: true });
      await TALK.say('leo', '약속.', { slow: true });
      A.motif({ voice: 'felt', vel: 0.4, beat: 0.8 });
      await X.wait(1.2);
      /* the promise he made her when she was six: in her dream, the room opens onto the hilltop and the apple tree,
         and Lily as she is now sits on the swing he built while he pushes */
      await X.tween(D.swing, 'k', 1, 2.4, T.ease.io);
      await TALK.say('leo', '그리고… 이거.');
      T.announce('꿈속, 언덕 위 사과나무에 레오가 만든 그네가 걸려 있다.');
      await X.wait(1.2);
      await TALK.say('lily', '…그네네.', { slow: true });
      await TALK.say('leo', '아빠가 만들어 준다고 했잖아.\n…많이 늦었지.');
      T.announce('릴리가 그네에 앉는다. 레오가 등을 민다.');
      A.sfx('creak'); await X.wait(1.3); A.sfx('creak');
      await TALK.say('lily', '더 높이!');
      A.sfx('creak');
      await TALK.say('leo', '그래. 더 높이.', { slow: true });
      A.sfx('creak'); await X.wait(1.6);
      /* back on the hill, the same night: flowers for the road she walks tomorrow */
      S.actors = []; S.boats = [];
      leo = X.actor('leo', { x: PL.BOARD_X + 60, style: F.leoAt(2), flip: true, lean: 0.06 });
      bean = X.actor('bean', { dog: true, s: 220, x: PL.BOARD_X + 185, sit: 1, flip: true, wag: 0.5 });
      ps.night = 0.85; X.cam(px, py, 1); X.camSnap();
      await X.view(null, { color: '#1b2440', out: 1.6, in: 1.2 });
      X.bed(4, 0.13, 'night');
      T.announce('꽃길에 걸 화환을 엮는다. 꽃이 되풀이되는 차례를 보고 빈자리를 채운다.');
      await TALK.say('leo', '내일 걸을 길에\n꽃이라도 걸어 둬야지.');
      await X.play(T.puzzle.garland({ pattern: [0, 1, 0, 2], len: 13, gaps: [5, 7, 10, 11, 12] }));

      /* ---- the walk ---- */
      const V = wedding();
      await X.view(V, { out: 1.4, in: 1.6 });

      T.announce('호수 속에서 릴리가 아나의 팔짱을 끼고 입장한다. 레오는 꽃길 위에서, 릴리의 빈 팔 옆을 나란히 걷는다. 누르고 있으면 걷는다.');
      await V.walked;
      await X.tween(V.hug, 'k', 1, 1.2);
      X.tween(V.bow, 'k', 1, 1.4);
      A.theme({ voice: 'box', vel: 0.34, beat: 0.6, left: false });
      await X.wait(4.5);

      /* ---- the swing: he did push her on it, if only in a dream. And it is still a six-year-old's swing ---- */
      ps.night = 0;
      leo.x = PL.TREE_X - 40; leo.flip = false; bean.x = PL.TABLE_X - 74; bean.flip = false; bean.sit = 1;
      X.cam(PL.TREE_X + 40, py + 40, 1.5); X.camSnap();
      await X.view(null, { out: 1.4, in: 1.6 });
      X.bed(5, 0.13, 'home');
      const seat = () => { const q = PL.swingSeat(ps); return [q[0], q[1] - 6, 46]; };
      await X.tap(seat);
      await X.walk(leo, PL.TREE_X + 36, 60);
      leo.flip = false;
      leo.pose = (o) => { o.headTilt = 0.16; o.face.eye = 'happy'; };
      await X.wait(1.2);
      await TALK.say('leo', '…태워 줬다.\n꿈에서라도.', { slow: true });
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
