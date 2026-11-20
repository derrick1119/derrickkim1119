/* Chapter 5 「꽃길」 — years twenty to twenty-five. Two entrances: his mother at the harbour,
   and Lily at her wedding, where he walks the flower road beside the arm she has left empty.
   Afterwards he looks at the swing he built for a child, and makes it wide enough for two. */
(function () {
  'use strict';
  const T = window.TYT, P = T.P, F = T.F, K = T.town;
  const TAU = Math.PI * 2;

  /* ---------- the wedding, walked ---------- */
  function wedding() {
    const V = { dark: false, p: 0, held: false, until: 0, ph: 0, done: false, steps: 0, hug: { k: 0 }, bow: { k: 0 }, petals: [], res: null };
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
    const guests = [[260, F.styles.nana, 124], [330, F.styles.mother, 138], [640, F.styles.rosa, 138], [700, F.styles.rosaSon, 142], [1030, F.styles.villagerA, 140], [1100, F.styles.villagerB, 132], [1420, F.styles.villagerC, 142], [1500, F.styles.post, 140]];
    V.draw = function (g, t, S) {
      const W = T.view.W, wx = V.p * LEN, hint = T.clamp((S.idle - 2) / 1.2);
      /* ---- above: the flower road in Welcome Harbor ---- */
      const sky = g.createLinearGradient(0, 0, 0, SHORE);
      sky.addColorStop(0, '#8496cc'); sky.addColorStop(0.5, '#eebca6'); sky.addColorStop(1, '#ffe2ae');
      g.fillStyle = sky; g.fillRect(-W / 2, 0, W, SHORE);
      P.glow(g, 380, 420, 520, '#fff2c4', 0.85);
      const hillBand = (par, base, amp, col, seed) => { g.fillStyle = col; g.beginPath(); g.moveTo(-W / 2, SHORE); for (let x = -W / 2; x <= W / 2 + 40; x += 40) g.lineTo(x, base + T.noise((x + wx * par) * 0.0022, seed) * amp); g.lineTo(W / 2, SHORE); g.closePath(); g.fill(); };
      hillBand(0.25, 300, 60, '#c9a0b2', 3); hillBand(0.5, 356, 46, '#9db08c', 5);
      for (let i = 0; i < 9; i++) { const x = ((i * 310 - wx * 0.5) % 2400 + 2400) % 2400 - 1000; K.tree(g, x, 372 + T.noise(i, 2) * 10, 0.6, i % 2 ? '#4f8f7a' : '#e0a94a', null, null, Math.sin(t * 0.8 + i)); }
      P.fill(g, P.box(-W / 2, SHORE - 40, W, 40, 0, 1), '#e3b488');
      g.fillStyle = 'rgba(255,240,200,0.35)'; g.fillRect(-W / 2, SHORE - 40, W, 5);
      for (let i = -2; i < 26; i++) {
        const x = i * 96 - wx + 60;
        if (x < -W / 2 - 80 || x > W / 2 + 80) continue;
        K.bush(g, x, SHORE - 34, 0.62, '#5f8f62', [['#e5758f', '#f09aac'], ['#f1c04a', '#f6f0e0'], ['#e58aa0', '#f6e0e0']][((i % 3) + 3) % 3]);
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
      for (let i = -1; i < 9; i++) {
        const x = i * 300 - wx + 100;
        if (x < -W / 2 - 160 || x > W / 2 + 160) continue;
        P.fill(g, P.soft([[x - 60, SHORE - 60], [x - 60, 190], [x, 110], [x + 60, 190], [x + 60, SHORE - 60]]), '#ffe2a8');
        P.glow(g, x, 250, 150, '#ffe9b8', 0.35);
        g.strokeStyle = '#d9d0e0'; g.lineWidth = 8; g.beginPath(); g.moveTo(x - 60, SHORE - 60); g.lineTo(x - 60, 190); g.quadraticCurveTo(x, 90, x + 60, 190); g.lineTo(x + 60, SHORE - 60); g.stroke();
        for (let k = 0; k < 7; k++) P.fill(g, P.circle(x + 80 + k * 23, 150 + Math.sin(k * 0.6) * 22, 9), ['#e58aa0', '#f6f0e0', '#9ab86a'][k % 3]);
      }
      /* guests in rows */
      for (let i = -3; i < 34; i++) {
        const x = i * 62 - wx * 1.0 + 30;
        if (x < -W / 2 - 40 || x > W / 2 + 40) continue;
        const col = ['#5d6f8a', '#8a5578', '#3f6b70', '#6b5a48', '#9a6b43'][((i % 5) + 5) % 5];
        g.globalAlpha = 0.6;
        P.fill(g, P.rr(x - 16, SHORE - 84, 32, 50, 12), col); P.fill(g, P.circle(x, SHORE - 95, 12), ['#f0c7a9', '#e7b793', '#f3ccb0'][((i % 3) + 3) % 3]);
        P.fill(g, P.box(x - 24, SHORE - 54, 48, 20, 0, i + 50), '#7d6f86');
        g.globalAlpha = 1;
      }
      P.fill(g, P.box(-W / 2, SHORE - 36, W, 36, 0, 2), '#c9573f');
      /* Ana, Lily, and beside Lily's free arm the one who is not there */
      const hug = T.ease.io(V.hug.k);
      const ana = { x: LX + 132 - hug * 34, y: SHORE - 6 - F.hipHeight(F.styles.ana, 176), s: 176, style: F.anaAt(61), flip: hug > 0.4, lean: 0.05, face: { eye: 'happy', mouth: 'smile', blush: 0.24, tear: 0.6, tearY: (t * 2) % 3 } };
      const lst = F.lilyAt(27, { top: '#fbf7ec', bottom: '#fbf7ec', skirt: 44, shoe: '#fbf7ec' });
      const lily = { x: LX + 66, y: SHORE - 6 - F.hipHeight(lst, 178), s: 178, style: lst, lean: 0.04, face: { eye: hug > 0.5 ? 'closed' : 'open', mouth: 'smile', blush: 0.3 } };
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

  T.stage('ch5', {
    chapter: 5, title: ['5장', '꽃길'], end: ['5장 끝', '6장 「다 지킨 약속」'], next: 'ch6', pad: 3,
    plot: { stage: 4, stones: 4, board: true, table: true, tree: 0.85, swing: 1, garden: 1 },
    flags: { bramGone: true },
    update(dt, S) { if (S.swinging) S.ps.swingA = Math.sin(T.time * 1.5) * 0.5; },
    script: async function (X) {
      const W = T.world, C = W.C, PL = T.plot, S = X.S, ps = S.ps, A = X.A, PIER = C.PIER_Y;
      const [px, py] = X.place.plot();
      X.cam(px, py, 1); X.camSnap();
      S.swinging = false;
      let leo = X.actor('leo', { x: PL.HX + 150, style: F.leoAt(2), flip: true, lean: 0.06 });
      let bean = X.actor('bean', { dog: true, s: 220, x: PL.HX + 190, sit: 1, wag: 0.5 });
      X.title();
      await X.wait(5.4);
      X.toll(0); await X.wait(1.5); X.toll(1);
      await X.wait(1);
      X.walk(leo, PL.HX - 440, 96);
      await X.wait(1.6);

      /* ---- his mother ---- */
      let nana, mom;
      await X.dip(async () => {
        S.actors = []; S.boats = [];
        const [qx, qy] = X.place.quay(); X.cam(qx, qy, 1.05); X.camSnap();
        nana = X.actor('nana', { x: 150, style: F.styles.nana, s: C.NANA_S, lamp: true, lampHand: 'F', lean: 0.1, flip: true });
        leo = X.actor('leo', { x: 214, style: F.leoAt(2), flip: true, lean: 0.06 });
        mom = X.actor('mom', { style: F.styles.mother, s: 138, lean: 0.06 });
        S.b1 = X.boat({ x: -880, riders: [mom] });
      });
      X.age('아나, 56');
      nana.pose = (o, a, t) => { if (!a.hug) { o.armF = { a: 1.0 + 0.9 + Math.sin(t * 3.5) * 0.14, b: 0.5 }; o.y -= Math.abs(Math.sin(t * 3)) * 2; } };
      const pressed = X.swell(-470);
      X.sail(S.b1, -74, 62);
      await pressed;
      await new Promise((res) => { const iv = () => (S.b1.x >= -74.5 ? res() : X.wait(0.2).then(iv)); iv(); });
      A.sfx('door');
      await X.land(mom, 40);
      T.announce('배에서 내린 사람은 레오의 어머니다. 할머니의 딸.');
      await X.wait(0.6);
      await X.tap(() => [mom.x, PIER - 70, 64]);
      /* she goes past her own mother, first, to her son */
      nana.lamp = false; nana.pose = null;
      await X.walk(mom, leo.x - 38, 110);
      mom.cup = { k: 0 }; mom.hug = { k: 0 };
      mom.pose = (o, a, t) => {
        const k = T.ease.io(mom.cup.k), hy = PIER - F.hipHeight(leo.style, leo.s) - 72;
        if (k > 0.02 && mom.hug.k < 0.02) { o.armF = { hand: F.local(o, T.lerp(mom.x + 20, leo.x + 2, k), T.lerp(PIER - 60, hy + 12, k)) }; o.armB = { hand: F.local(o, T.lerp(mom.x + 20, leo.x - 14, k), T.lerp(PIER - 60, hy + 16, k)) }; o.headTilt = -0.2 * k; o.face.tear = k * 0.8; o.face.tearY = (t * 2) % 3; }
        T.embrace(o, mom, leo, mom.hug.k);
      };
      leo.pose = (o, a, t) => { o.headTilt = 0.2 * mom.cup.k; o.face.tear = mom.cup.k * 0.7; o.face.tearY = (t * 2) % 3; T.embrace(o, leo, mom, mom.hug.k, true); };
      await X.tween(mom.cup, 'k', 1, 1.1);
      A.motif({ voice: 'felt', vel: 0.4, beat: 0.82 });
      await X.wait(1.2);
      await X.TALK.say('mom', '우리 아들, 여기 있었구나.', { slow: true });
      /* three generations on the quay */
      leo.armOver = true; mom.z = 1;
      await X.tween(mom.hug, 'k', 1, 0.8, T.ease.out);
      nana.hug = { k: 0 };
      nana.pose = (o, a, t) => T.embrace(o, nana, mom, nana.hug.k);
      await X.walk(nana, mom.x - 30, 80);
      nana.flip = false; nana.z = 2;
      await X.tween(nana.hug, 'k', 1, 0.8, T.ease.out);
      T.announce('세 사람이 항구에서 끌어안는다. 할머니의 기다림도 여기서 끝난다.');
      X.notes(4);
      await X.wait(4);

      /* ---- a letter comes up the hill ---- */
      let post;
      await X.dip(async () => {
        S.actors = []; S.boats = [];
        X.cam(px, py, 1); X.camSnap();
        leo = X.actor('leo', { x: PL.HX + 160, style: F.leoAt(2), flip: true, lean: 0.06 });
        bean = X.actor('bean', { dog: true, s: 220, x: PL.HX + 200, sit: 1, wag: 0.5 });
        post = X.actor('post', { x: PL.HX - 520, style: F.styles.post, s: 140, keepFlip: true, y: null });
        post.pose = (o, a, t) => { o.y += 16; o.lean = 0.34; const c = a.moving ? t * 7 : 0; o.legF = { foot: [8 + Math.cos(c) * 6, 28 + Math.sin(c) * 6] }; o.legB = { foot: [8 - Math.cos(c) * 6, 28 - Math.sin(c) * 6] }; o.armF = { hand: [20, -14] }; o.armB = { hand: [19, -12] }; o.walk = null; };
        post.prop = (g, j, o, a, t) => { K.bike(g, o.x - 12, W.groundAt(a.x) + 1, 1.25, a.moving ? t * 7 : 0); P.fill(g, P.rr(o.x - 34, o.y - 2, 24, 20, 4), '#b98a5a'); };
      });
      X.age('아나, 61');
      await X.walk(post, PL.HX - 150, 150);
      A.sfx('bike');
      leo.flip = true;
      await X.walk(leo, PL.HX - 92, 90);
      await X.tap(() => [post.x + 10, W.groundAt(post.x) - 80, 60]);
      await X.card(invitation, { run: async (c) => { T.announce('릴리의 편지. 아빠, 나 결혼해. 보러 와 줄 거지? 릴리.'); await X.tween(c, 'w', 1, 4.4, T.ease.lin); }, max: 16 });
      X.walk(post, PL.HX - 640, 150);
      await X.wait(0.8);

      /* ---- the walk ---- */
      const V = wedding();
      await X.view(V, { out: 1.4, in: 1.6 });
      A.pad(0, 0.16);
      T.announce('호수 속에서 릴리가 아나의 팔짱을 끼고 입장한다. 레오는 꽃길 위에서, 릴리의 빈 팔 옆을 나란히 걷는다. 누르고 있으면 걷는다.');
      await V.walked;
      await X.tween(V.hug, 'k', 1, 1.2);
      X.tween(V.bow, 'k', 1, 1.4);
      A.theme({ voice: 'box', vel: 0.34, beat: 0.6, left: false });
      await X.wait(5.5);

      /* ---- the swing ---- */
      leo.x = PL.TREE_X - 40; leo.flip = false; post.hidden = true; bean.x = PL.TREE_X - 26; bean.flip = false;
      X.cam(PL.TREE_X + 40, py + 40, 1.5); X.camSnap();
      await X.view(null, { out: 1.4, in: 1.6 });
      A.pad(5, 0.14);
      const seat = () => { const q = PL.swingSeat(ps); return [q[0], q[1] - 6, 46]; };
      await X.tap(seat);
      await X.walk(leo, PL.TREE_X + 36, 60);
      leo.flip = false;
      leo.pose = (o, a, t) => { o.headTilt = 0.2; };
      await X.wait(1.6);
      /* it was made for a six-year-old */
      let stepN = 0;
      leo.pose = (o, a, t) => { o.armF = { a: 1.2, b: 0.5 }; o.lean = 0.16; };
      await X.drag({
        axis: 'x', sign: 1, dist: 240,
        on: (p) => { ps.swingW = p; const n = Math.floor(p * 5); if (n > stepN) { stepN = n; X.note(); A.sfx('knock', n / 5); } },
        hint: () => { const q = PL.swingSeat(ps); const a = W.toScreen(q[0] + q[2] / 2, q[1] + 3), b = W.toScreen(q[0] + q[2] / 2 + 80, q[1] + 3); return [a, b]; },
      });
      T.announce('레오는 그네를 허물지 않고, 둘이 앉을 수 있게 넓힌다.');
      A.promise();
      /* he tries it, on one side, with the other left free */
      await X.wait(0.8);
      const q = PL.swingSeat(ps);
      leo.pose = (o, a, t) => { PL.sitOnSwing(o, ps, -1); o.face.eye = 'happy'; };
      leo.x = q[0] - 16; leo.hill = 3;
      S.swinging = true;
      await X.wait(4);
      X.end();
    },
  });
})();
