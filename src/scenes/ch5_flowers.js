/* Chapter 5 「꽃길」 — years fifteen to twenty-five. The roof goes up; his mother, whose white boat has
   waited at the quay every evening since he first ate at her table, goes on to his father at last.
   Years later a magpie brings Lily's letter: she is getting married. He goes into her dream, promises to
   walk beside her empty arm, and sits her on the swing he once promised her and pushes it. At the
   wedding he walks the flower road beside her; afterwards he makes the swing wide enough for two. */
(function () {
  'use strict';
  const T = window.TYT, P = T.P, F = T.F, K = T.town;
  const TAU = Math.PI * 2;

  /* ---------- the wedding, walked ---------- */
  function wedding() {
    const V = { dark: false, quiet: true, p: 0, held: false, until: 0, ph: 0, done: false, steps: 0, hug: { k: 0 }, bow: { k: 0 }, petals: [], res: null };
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
    const guests = [[260, F.styles.villagerB, 132], [330, F.styles.villagerC, 138], [640, F.styles.rosa, 138], [700, F.styles.rosaSon, 142], [1030, F.styles.villagerA, 140], [1100, F.styles.villagerB, 132], [1420, F.styles.villagerC, 142], [1500, F.styles.post, 140]];
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

  T.stage('ch5', {
    chapter: 5, title: ['5장', '꽃길'], end: ['5장 끝', '6장 「다 지킨 약속」'], next: 'ch6', pad: 3,
    plot: { stage: 3, stones: 4, board: true, table: true, tree: 0.6, swing: 0, garden: 0.4, patch: 2, fruit: 1 },   /* the swing is built during the first years card */
    flags: { bramGone: true },
    update(dt, S) { if (S.swinging) S.ps.swingA = Math.sin(T.time * 1.5) * 0.5; },
    onHill(g, h, S) {
      if (S.roofK != null && h === T.world.hillOf(T.plot.HX)) {   /* the ridge beam, coming up the side of the house on the rope */
        const x = T.plot.HX, gy = T.world.y3(x), y = gy - 40 - 210 * S.roofK;
        P.fill(g, P.rr(x - 150, y - 8, 300, 16, 6), '#b98a5a'); P.fill(g, P.rr(x - 150, y - 8, 300, 5, 3), '#d1a676');
      }
      const m = S.pie;
      if (!m || h !== T.world.hillOf(T.plot.BOARD_X)) return;
      const t = T.time, flap = m.land ? 0 : Math.sin(t * 16), dir = m.dx == null ? 1 : m.dx;
      g.save(); g.translate(m.x, m.y + (m.land ? 0 : Math.sin(t * 3) * 6)); g.scale(m.x > T.plot.BOARD_X + 100 ? 1 : -1, 1); void dir;
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
      const W = T.world, C = W.C, PL = T.plot, S = X.S, ps = S.ps, A = X.A, PIER = C.PIER_Y;
      const [px, py] = X.place.plot();
      X.cam(px, py, 1); X.camSnap();
      S.swinging = false;
      T.state.dream = {};
      const TALK = X.TALK;
      let leo = X.actor('leo', { x: PL.HX + 150, style: F.leoAt(2), flip: true, lean: 0.06 });
      let bean = X.actor('bean', { dog: true, s: 220, x: PL.HX + 190, sit: 1, wag: 0.5 });
      X.title();
      await X.wait(4.2);
      /* years go by on the old stones above the cloud sea, where he goes to sit with Bean */
      const ov = T.place ? T.place('overlook', { leoAge: 2 }) : null;
      if (ov) { await X.view(ov, { color: '#fff6e6' }); T.announce('구름 위 오래된 돌 폐허, 꽃 핀 나무 아래 벤치. 레오와 빈이 나란히 앉아 구름바다를 본다.'); X.tween(ov.sun, 'k', 1, 9); }
      await X.years(15, 20, { age: 56, during: (d) => { X.tween(ps, 'tree', 0.85, d); X.tween(ps, 'garden', 1, d); X.wait(d * 0.4).then(() => { A.sfx('knock', 0.3); X.tween(ps, 'swing', 1, d * 0.4); }); } });
      if (ov) await X.view(null, { color: '#fff6e6' });
      T.announce('사과나무가 자라고, 가지에 작은 그네가 걸렸다. 릴리에게 만들어 주겠다던 그네.');

      /* ---- the roof: the ridge beam goes up the way the frame did, on everyone's count ---- */
      const folk = [
        X.actor('v3', { x: C.PLOT - 560, style: F.styles.villagerC, s: 142, lean: 0.08 }),
        X.actor('v1', { x: C.PLOT - 620, style: F.styles.villagerA, s: 142, lean: 0.12 }),
        X.actor('rosa', { x: C.PLOT - 680, style: F.styles.rosa, s: 138 }),
        X.actor('son', { x: C.PLOT - 740, style: F.styles.rosaSon, s: 144, lean: 0.14, face: { old: true } }),
        X.actor('mom', { x: C.PLOT - 800, style: F.styles.mom, s: C.MOM_S, lean: 0.1 }),
        X.actor('kid', { x: C.PLOT - 860, style: F.styles.kidA, s: 104 }),
      ];
      folk.forEach((a, i) => X.walk(a, PL.HX - 180 - i * 58, 80 + i * 3));
      await X.wait(4.4);
      leo.flip = true; bean.sit = 0; bean.flip = true;
      await X.TALK.say('v3', '마룻대 올린다며?\n그건 혼자 못 올려.');
      await X.TALK.say('son', '어머니가 그러시더라고요.\n지붕은 동네가 같이 올리는 거라고.');
      await X.TALK.say('son', '저도 집사람 기다리는 중이라,\n손은 남아돌아요.');
      await X.TALK.say('kid', '이번엔 나 맨 앞!');
      T.announce('지붕 올리기. 셋에 맞춰 눌러 다 같이 마룻대를 끌어 올린다. 이번에는 네 번.');
      /* the ridge beam lies along the grass; everyone takes the rope on the far side of the house */
      const pullers = [leo].concat(folk);
      await X.dip(async () => { pullers.forEach((a, i) => { a.go = null; a.moving = false; a.x = PL.HX + 190 + i * 58; }); S.roofK = 0; X.cam(PL.HX + 180, py + 10, 0.95); }, { out: 0.6, in: 0.8 });
      await X.play(T.puzzle.heave({ pulls: 4, crew: pullers, top: () => [PL.HX, W.y3(PL.HX) - 40 - 210 * (S.roofK || 0)], raise: (k) => { S.roofK = k; } }));
      S.roofK = null; X.cam(px, py, 1);
      ps.stage = 4; A.sfx('knock', 0.6); X.notes(5);
      T.announce('지붕이 올라간다. 집이 다 지어졌다.');
      const cheer = (o, a, t) => { o.armF = { a: 2.4 + Math.sin(t * 9 + a.x) * 0.25, b: 0.3 }; o.face.eye = 'happy'; };
      folk.forEach((a) => { a.pose = cheer; });
      for (let i = 0; i < 3; i++) { await X.tween(bean, 'jump', 12, 0.18, T.ease.out); await X.tween(bean, 'jump', 0, 0.18, T.ease.in); }
      await X.wait(1.2);
      folk.forEach((a) => { a.pose = null; });
      await X.TALK.say('leo', '이제 지붕이 생겼어.');
      await X.TALK.say('mom', '아나 오면\n비 맞을 일은 없겠구나.');
      await X.TALK.say('rosa', '빈 방엔 뭘 들일 거야?');
      await X.TALK.say('leo', '…그건 아나가 정하게 둘래요.');
      await X.TALK.say('rosa', '레오, 하나만 부탁하자.');
      await X.TALK.say('rosa', '며느리까지 오면, 우리 셋은 건너갈 거야.\n그때 종이 물으면, 네가 대답해 줘.');
      await X.TALK.say('leo', '…네. 제가 대답할게요.');
      await X.wait(1);
      folk.forEach((a, i) => X.walk(a, C.PLOT - 600 - i * 40, 80).then(() => { a.hidden = true; }));
      await X.wait(2.4);
      X.toll(0); await X.wait(1.5); X.toll(1);
      await X.wait(1);
      X.walk(leo, PL.HX - 440, 96);
      await X.wait(1.6);

      /* ---- his mother crosses ---- */
      let mom2, far;
      await X.dip(async () => {
        S.actors = []; S.boats = [];
        const [qx, qy] = X.place.quay(); X.cam(qx, qy, 1.05); X.camSnap();
        mom2 = X.actor('mom', { x: 180, style: F.styles.mom, s: C.MOM_S, lean: 0.1, flip: true });
        leo = X.actor('leo', { x: 250, style: F.leoAt(2), flip: true, lean: 0.06 });
        bean = X.actor('bean', { dog: true, s: 220, x: 300, sit: 1, flip: true, wag: 0.4 });
        far = X.boat({ x: -236, hull: '#e9e2d6', lamp: false, riders: [] });
      });
      X.bed(1, 0.12, 'sea');
      T.announce('저녁, 부두. 등불 없는 하얀 배 한 척이 매여 있다.');
      /* the boat that takes people on has been coming for her since her promise was kept */
      await X.TALK.say('mom', '저 배, 네가 내 밥 먹은 날부터\n저녁마다 와 있었단다.');
      await X.TALK.say('mom', '네 아빠, 평생 기다리게만 했는데.\n…이제 가 줘야지.', { slow: true });
      await X.TALK.say('leo', '…가요, 엄마.', { slow: true });
      await X.TALK.say('leo', '기다리는 게 어떤 건지,\n이제 저도 알아요.');
      await X.walk(mom2, 60, 50);
      await X.board(mom2, far, -10);
      mom2.flip = true;
      /* the bell asks one last time; to send someone off, the lamps answer it backwards */
      X.toll(3); await X.wait(0.8);
      T.announce('배웅. 종이 울린 차례를 거꾸로, 마지막 등불부터 눌러 대답한다.');
      await X.play(T.puzzle.bell({ rounds: [[0, 1, 2], [0, 2, 1, 3]], reverse: true }));
      await X.TALK.say('leo', '…천천히 가요.', { slow: true });
      await X.TALK.say('mom', '그래. 넌 천천히 와.', { slow: true });
      A.theme({ voice: 'felt', vel: 0.32, beat: 0.8, left: true });
      mom2.pose = (o, a2, t) => { o.armF = { a: 2.2 + Math.sin(t * 4) * 0.2, b: 0.3 }; };
      leo.pose = (o, a2, t) => { o.armF = { a: 2.3 + Math.sin(t * 4 + 1) * 0.2, b: 0.3 }; };
      X.sail(far, -1500, 34);
      T.announce('하얀 배가 구름바다 너머로 멀어진다.');
      X.cam(-260, 452, 1, 0.4);
      await X.wait(3.4);
      T.announce('빛의 폭포. 엄마의 하얀 배가 빛을 거슬러 저 너머로 오른다. 별 하나가 산 사람들의 하늘로 떨어진다.');
      await X.crossing([{ style: F.styles.mom, s: C.MOM_S }], { leoAge: 2, color: '#2a2440' });
      leo.pose = null;

      /* ---- years on: a magpie with a letter in its beak ---- */
      let pie;
      await X.dip(async () => {
        S.actors = []; S.boats = [];
        X.cam(px, py, 1); X.camSnap();
        leo = X.actor('leo', { x: PL.HX + 160, style: F.leoAt(2), flip: true, lean: 0.06 });
        bean = X.actor('bean', { dog: true, s: 220, x: PL.HX + 200, sit: 1, wag: 0.5 });
        pie = { x: PL.HX - 700, y: W.y3(PL.HX) - 420, k: 0, land: 0 };
        S.pie = pie;
      });
      X.bed(4, 0.13, 'walk');
      await X.years(20, 25, { age: 61 });
      A.sfx('star', 0.8);
      T.announce('까치 한 마리가 편지를 물고 언덕으로 날아온다.');
      const perch = [PL.BOARD_X + 6, W.y3(PL.BOARD_X) - 98];
      X.tween(pie, 'x', perch[0], 3.2, T.ease.out); await X.tween(pie, 'y', perch[1], 3.2, T.ease.io);
      pie.land = 1; A.sfx('step');
      bean.sit = 0; A.sfx('bark'); bean.flip = true;
      leo.flip = true;
      await X.walk(leo, PL.BOARD_X + 60, 90);
      await X.tap(() => [perch[0], perch[1] - 8, 50]);
      pie.letter = false;
      await X.card(invitation, { run: async (c) => { T.announce('릴리의 편지. 아빠, 나 결혼해. 보러 와 줄 거지? 릴리.'); await X.tween(c, 'w', 1, 4.4, T.ease.lin); }, max: 16 });
      await X.TALK.say('leo', '…우리 릴리가.', { slow: true });
      await X.TALK.say('leo', '보러 와 줄 거지, 래.');
      pie.land = 0; A.sfx('whoosh');
      X.tween(pie, 'x', PL.HX + 900, 3, T.ease.in); X.tween(pie, 'y', perch[1] - 380, 3, T.ease.in).then(() => { S.pie = null; });
      await X.wait(1.2);

      /* ---- an answer has to go by dream: three things she knows ---- */
      const pipi = X.actor('kid', { x: PL.HX - 560, style: F.styles.kidA, s: 100 });
      await X.walk(pipi, PL.BOARD_X - 30, 120);
      leo.flip = true;
      await TALK.say('kid', '까치가 뭐 물고 왔어?');
      await TALK.say('leo', '릴리 편지. 결혼한대.\n…대답을 해 주고 싶은데.');
      await TALK.say('kid', '꿈으로 가면 되잖아!\n냄새, 소리, 빛. 그 언니가 아는 걸로.');
      await TALK.say('leo', '빛은… 이 편지면 되겠다.\n그 애 손으로 쓴 거니까, 길을 알 거야.');
      await X.gift('light', W.toScreen(leo.x - 20, W.y3(leo.x) - 110));
      pipi.pose = (o) => { o.armF = { a: 1.5, b: 0.2 }; o.face.eye = 'happy'; };
      await TALK.say('kid', '냄새는 내 크레파스!\n언니도 어릴 때 크레파스로 그림 많이 그렸다며.');
      await X.gift('scent', W.toScreen(pipi.x + 20, W.y3(pipi.x) - 70));
      pipi.pose = null;
      await TALK.say('leo', '소리는….');
      await X.walk(leo, PL.TREE_X + 10, 90);
      leo.flip = false;
      T.announce('레오가 빈 그네를 밀어 본다. 릴리에게 만들어 주겠다던 그네.');
      const seat0 = () => { const q = PL.swingSeat(ps); return [q[0] + q[2] / 2, q[1] - 6, 46]; };
      await X.tap(seat0);
      leo.pose = (o) => { o.armF = { a: 1.4, b: 0.3 }; o.lean = 0.14; };
      S.swinging = true; A.sfx('creak');
      await X.wait(1.1); A.sfx('creak'); leo.pose = null;
      const sq = PL.swingSeat(ps);
      await X.gift('sound', W.toScreen(sq[0] + sq[2] / 2, sq[1]));
      await X.wait(0.6); A.sfx('creak');
      await TALK.say('leo', '삐걱.\n그 애가 그림으로만 타 본 그네.');
      S.swinging = false; X.tween(ps, 'swingA', 0, 1);
      X.walk(pipi, PL.HX - 640, 120).then(() => { pipi.hidden = true; });

      /* ---- the lake: the night before ---- */
      X.walk(leo, C.PLOT + 380, 84);
      await X.wait(1.6);
      const way = T.lakeHelp({ level: 2, who: 31, home: F.anaAt(61), leoAge: 2 });
      await X.view(way, { color: '#1b2a40' });
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
      T.announce('방이 바로 선다. 침대에 앉은 릴리. 문으로 레오가 들어온다.');
      await X.tween(D.near, 'k', 1, 2.6, T.ease.io);
      await TALK.say('lily', '…아빠?');
      await TALK.say('leo', '편지 받았어.\n까치가 물고 왔더라.');
      await TALK.say('lily', '…정말? 아빠 사진 앞에 두기만 했는데.');
      await TALK.say('lily', '내일, 아빠 자리는 그냥 비워 두려고.\n…이상하지?');
      await TALK.say('leo', '아니. 그 자리, 내가 걸을게.');
      await TALK.say('leo', '팔 한쪽만 비워 둬.');
      await X.tween(D.hold, 'k', 1, 1.2);
      await TALK.say('lily', '…약속.', { slow: true });
      await TALK.say('leo', '약속.', { slow: true });
      A.motif({ voice: 'felt', vel: 0.4, beat: 0.8 });
      await X.wait(1.2);
      /* the promise he made her when she was six: in her dream, the swing he built on the hill */
      await X.tween(D.swing, 'k', 1, 2.4, T.ease.io);   /* the dream room opens onto the hill and the apple tree
      dream swing — the dream room opens onto the hilltop and the apple tree; Lily (as she is now, 31) sits on the swing Leo built, he pushes, it swings higher; the room's dreamy light stays */
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
      await X.view(null, { color: '#fff6e6', out: 1.6, in: 1.2 });
      X.bed(4, 0.13, 'walk');
      /* the whole town weaves the road she will not walk on */
      T.announce('꽃길에 걸 화환을 엮는다. 꽃이 되풀이되는 차례를 보고 빈자리를 채운다.');
      await X.TALK.say('leo', '내일 걸을 길에\n꽃이라도 걸어 둬야지.');
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

      /* ---- the swing ---- */
      leo.x = PL.TREE_X - 40; leo.flip = false; bean.x = PL.TREE_X - 26; bean.flip = false;
      X.cam(PL.TREE_X + 40, py + 40, 1.5); X.camSnap();
      await X.view(null, { out: 1.4, in: 1.6 });
      X.bed(5, 0.13, 'home');
      const seat = () => { const q = PL.swingSeat(ps); return [q[0], q[1] - 6, 46]; };
      await X.tap(seat);
      await X.walk(leo, PL.TREE_X + 36, 60);
      leo.flip = false;
      leo.pose = (o, a, t) => { o.headTilt = 0.2; };
      await X.wait(1.6);
      /* it was made for a six-year-old */
      let stepN = 0;
      leo.pose = (o, a, t) => { o.armF = { a: 1.2, b: 0.5 }; o.lean = 0.16; };
      await X.TALK.say('leo', '릴리는 태워 줬으니까….\n이젠 둘이 앉게 넓혀야겠다.');
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
