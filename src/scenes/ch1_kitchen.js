/* Chapter 1 opens in the living world: "Ana, 36". The same kitchen as the stew memory, colder.
   After the funeral she sits where she always sat, and opens the notebook he left. */
(function () {
  'use strict';
  const T = window.TYT, P = T.P, F = T.F;
  const TAU = Math.PI * 2;
  const COUNTER = 622, FLOORY = 822;
  const INK = '#2f3b52', RED = '#b54a36';
  const ANA = { x: 262, y: COUNTER - 34, s: 372 };
  const BOOK = [ANA.x - 44, COUNTER - 78];

  const S = (T.scenes.kitchen = {
    L: {}, rain: [], mode: 'idle', cap: { a: 0 }, hint: { a: 0 }, card: { a: 0, w: 0, ready: false, tap: null },
    look: { k: 0 }, hug: { k: 0 }, tear: { k: 0 },
  });

  S.build = function () {
    if (S.bgGen === T.gen && S.L.bg) return;
    S.bgGen = T.gen;
    const V = T.view, x0 = -V.W / 2 - 20, w = V.W + 40;
    S.L.bg = T.bake(x0, 0, w, 900, (g) => {
      T.scenes.stew.paintBg(g, { cold: true });
      /* his apron, where he left it on the oven door */
      g.save();
      g.shadowColor = 'rgba(20,30,40,0.3)'; g.shadowBlur = 8; g.shadowOffsetY = 3;
      P.fill(g, P.soft([[-66, COUNTER + 36], [-10, COUNTER + 36], [-6, COUNTER + 150], [-22, COUNTER + 162], [-52, COUNTER + 158], [-70, COUNTER + 146]]), '#efe4cd');
      g.restore();
      P.line(g, -58, COUNTER + 62, -20, COUNTER + 140, 3, 'rgba(120,110,90,0.25)');
      /* the pot, cold, with its lid on */
      const px = 24, py = 548, rx = 82;
      const body = P.soft([[px - rx - 6, py], [px - rx - 4, COUNTER - 34], [px - rx + 14, COUNTER - 22], [px + rx - 14, COUNTER - 22], [px + rx + 4, COUNTER - 34], [px + rx + 6, py], [px + rx - 10, py + 14], [px, py + 17], [px - rx + 10, py + 14]]);
      P.fill(g, body, '#2d6672');
      P.tint(g, body, px - rx, 0, px + rx, 0, [[0, 'rgba(255,255,255,0.18)'], [0.3, 'rgba(255,255,255,0)'], [1, 'rgba(0,20,30,0.3)']]);
      P.fill(g, P.rr(px - rx - 26, py + 14, 26, 12, 6), '#22515b');
      P.fill(g, P.rr(px + rx, py + 14, 26, 12, 6), '#22515b');
      P.fill(g, P.soft([[px - rx - 8, py + 4], [px - rx + 10, py - 14], [px, py - 22], [px + rx - 10, py - 14], [px + rx + 8, py + 4], [px, py + 12]]), '#357785');
      P.fill(g, P.rr(px - 12, py - 34, 24, 13, 6), '#22515b');
    });
  };

  S.enter = function () {
    const k = S.clock, A = T.audio;
    T.state.chapter = 1; T.state.cp = null;
    S.mode = 'idle'; S.cap.a = 0; S.hint.a = 0; S.card.a = 0; S.card.w = 0; S.card.ready = false; S.card.tap = null;
    S.look.k = 0; S.hug.k = 0; S.tear.k = 0;
    P.grainAmt = 0.13; P.vignette = 0.6; P.vignetteColor = '#0b101a';
    if (!S.rain.length) { const r = T.rng(14); for (let i = 0; i < 46; i++) S.rain.push({ x: r() * 212, y: r() * 252, v: 250 + r() * 160, l: 12 + r() * 16 }); }
    A.pad(null);
    A.ambience(0.7, 0.05);
    k.wait(2.4).then(() => A.bed(4, 0.11, 'still'));   /* the tune's left hand, very far off */
    k.wait(1.6).then(() => { T.announce('아나, 서른여섯. 장례가 끝난 밤의 부엌.'); return k.tween(S.cap, 'a', 1, 1.4); })
      .then(() => k.wait(3.6)).then(() => k.tween(S.cap, 'a', 0, 1.6));
    k.wait(3.4).then(() => { if (S.mode === 'idle') S.mode = 'wait'; });
    k.wait(7.5).then(() => { if (S.mode === 'wait') k.tween(S.hint, 'a', 1, 1.2); });
  };
  S.exit = function () { T.cursor('default'); };

  S.open = async function () {
    if (S.mode !== 'wait') return;
    const k = S.clock, A = T.audio, c = S.card;
    S.mode = 'card';
    k.tween(S.hint, 'a', 0, 0.4);
    A.sfx('page');
    await k.tween(c, 'a', 1, 1.3, T.ease.out3);
    T.announce('레시피 공책 첫 장. 레오표 스튜. 감자 셋, 당근 둘, 양파 하나, 토마토 넷. 약한 불에 오래오래. 소금은 조금만. 끼니 거르지 마. 레오.');
    k.wait(0.6).then(() => A.fragment(5));
    await k.tween(c, 'w', 1, 6.2, T.ease.lin);
    await k.wait(0.8);
    c.ready = true;
    await Promise.race([new Promise((res) => (c.tap = res)), k.wait(12)]);
    c.ready = false; c.tap = null;
    await k.tween(c, 'a', 0, 1.1, T.ease.io);
    /* she looks at the place by the stove, then holds the book to her */
    S.mode = 'after';
    await k.tween(S.look, 'k', 1, 1.2, T.ease.io);
    await k.wait(1.5);
    k.tween(S.look, 'k', 0, 1.4, T.ease.io);
    A.motif({ voice: 'felt', vel: 0.26, beat: 1.05 });
    await k.tween(S.hug, 'k', 1, 1.5, T.ease.io);
    k.tween(S.tear, 'k', 1, 1.2);
    await k.wait(3.4);
    T.director.go('harbor', { style: 'fade', color: '#fff6e6', out: 2.4, in: 2.2, hold: 0.4 });
  };

  S.pointer = function (type, x, y) {
    if (S.mode === 'wait') {
      const near = Math.hypot(x - BOOK[0], y - BOOK[1]) < 110;
      T.cursor(near ? 'pointer' : 'default');
      if (type === 'down' && near) S.open();
    } else if (S.mode === 'card') {
      T.cursor(S.card.ready ? 'pointer' : 'default');
      if (type === 'down' && S.card.tap) S.card.tap();
    } else T.cursor('default');
  };
  S.key = function (key) {
    if (key !== ' ' && key !== 'Enter') return false;
    if (S.mode === 'wait') S.open(); else if (S.mode === 'card' && S.card.tap) S.card.tap();
  };

  S.update = function (dt) {
    for (const d of S.rain) { d.y += d.v * dt; d.x -= d.v * dt * 0.18; if (d.y > 252) { d.y = -20; d.x = (d.x * 3.7 + 53) % 232; } }
  };

  /* small ink drawings for the recipe page */
  function doodle(g, kind, x, y, k) {
    if (k <= 0) return;
    g.save(); g.globalAlpha *= T.clamp(k * 2);
    const st = (pts, w) => P.strokePts(g, P.trim(pts, T.clamp(k)), w || 2.4, INK, true);
    if (kind === 'potato') st([[x - 11, y], [x - 8, y - 9], [x + 4, y - 10], [x + 12, y - 2], [x + 8, y + 8], [x - 5, y + 9], [x - 11, y]]);
    else if (kind === 'carrot') { st([[x - 12, y - 6], [x + 12, y + 2], [x - 10, y + 6], [x - 12, y - 6]]); st([[x - 12, y - 2], [x - 20, y - 9]], 2); st([[x - 12, y], [x - 21, y + 1]], 2); }
    else if (kind === 'onion') { st([[x, y - 11], [x - 10, y - 2], [x - 6, y + 9], [x + 6, y + 9], [x + 10, y - 2], [x, y - 11]]); st([[x, y - 11], [x + 2, y - 18]], 2); }
    else if (kind === 'tomato') { st([[x - 10, y], [x - 6, y - 9], [x + 6, y - 9], [x + 10, y], [x + 6, y + 9], [x - 6, y + 9], [x - 10, y]]); st([[x - 4, y - 10], [x, y - 14], [x + 4, y - 10]], 2); }
    else if (kind === 'pot') {
      st([[x - 34, y - 6], [x - 30, y + 22], [x + 30, y + 22], [x + 34, y - 6], [x - 34, y - 6]], 2.8);
      st([[x - 34, y], [x - 46, y + 2]], 2.4); st([[x + 34, y], [x + 46, y + 2]], 2.4);
      [-14, 0, 14].forEach((d, i) => st([[x + d, y - 14], [x + d + 5, y - 24], [x + d - 4, y - 34], [x + d + 3, y - 46]], 2));
    }
    g.restore();
  }

  function drawCard(g) {
    const c = S.card;
    if (c.a <= 0.003) return;
    const V = T.view, w = c.w;
    g.save();
    g.fillStyle = T.rgba('#0b101a', 0.62 * c.a); g.fillRect(-V.W / 2, 0, V.W, V.H);
    const k = T.ease.out3(T.clamp(c.a));
    g.translate(T.lerp(BOOK[0], 0, k), T.lerp(BOOK[1], 450, k) + Math.sin(T.time * 0.8) * 4 * k);
    g.rotate(T.lerp(0.2, 0.02, k));
    const sc = T.lerp(0.14, 1, k);
    g.scale(sc, sc);
    g.globalAlpha = T.clamp(c.a * 3);
    g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 50; g.shadowOffsetY = 18;
    P.fill(g, P.rr(-250, -336, 500, 672, 8), '#f6f0e0');
    g.shadowColor = 'transparent';
    /* ruled lines, a margin, the cover peeking out behind */
    g.fillStyle = 'rgba(96,124,160,0.16)';
    for (let y = -238; y < 320; y += 46) g.fillRect(-250, y, 500, 1.5);
    g.fillStyle = 'rgba(190,90,70,0.2)'; g.fillRect(-196, -336, 1.5, 672);
    g.fillStyle = '#d7a23c'; g.fillRect(-262, -330, 14, 660);
    g.fillStyle = 'rgba(60,50,40,0.25)';
    for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(-226, -270 + i * 108, 7, 0, TAU); g.fill(); }
    const seg = (a, b) => T.clamp((w - a) / (b - a));
    const tx = (str, x, y, size, a, b, o = {}) => { const kk = seg(a, b); if (kk > 0) P.text(g, str, x, y, Object.assign({ size, color: INK, k: kk, align: 'left', seed: Math.round(y + 400) }, o)); };
    tx('레오표 스튜', -170, -246, 76, 0, 0.14);
    if (seg(0.13, 0.18) > 0) P.strokePts(g, P.trim([[-172, -226], [-80, -222], [10, -227], [92, -223]], seg(0.13, 0.18)), 3, INK, true);
    doodle(g, 'pot', 168, -262, seg(0.15, 0.26));
    const rows = [['potato', '감자 셋'], ['carrot', '당근 둘'], ['onion', '양파 하나'], ['tomato', '토마토 넷']];
    rows.forEach((r, i) => {
      const a = 0.24 + i * 0.085;
      doodle(g, r[0], -146, -158 + i * 56, seg(a, a + 0.05));
      tx(r[1], -110, -144 + i * 56, 50, a + 0.03, a + 0.085);
    });
    tx('약한 불에, 오래오래', -160, 96, 48, 0.6, 0.71);
    tx('소금은 조금만!', -30, 172, 54, 0.72, 0.82, { color: RED });
    if (seg(0.81, 0.86) > 0) { P.strokePts(g, P.trim([[-32, 190], [60, 186], [176, 191]], seg(0.81, 0.86)), 2.6, RED, true); P.strokePts(g, P.trim([[-26, 199], [70, 195], [170, 200]], seg(0.83, 0.87)), 2.2, RED, true); }
    tx('끼니 거르지 마.', -160, 268, 62, 0.88, 0.97);
    tx('레오', 150, 312, 42, 0.96, 1, { alpha: 0.85 });
    g.restore();
    if (c.ready) T.continueDot(g, 0, 852, '#f3ead8');
  }

  S.draw = function (g) {
    const V = T.view, W = V.W, t = T.time;
    const [bx, by] = T.par(0.3);
    g.save(); g.translate(bx * 0.5, by * 0.5);
    T.blit(g, S.L.bg);

    /* rain against the window */
    g.save(); g.beginPath(); g.rect(-534, 164, 212, 252); g.clip();
    g.fillStyle = 'rgba(16,24,44,0.45)'; g.fillRect(-534, 164, 212, 252);
    g.strokeStyle = 'rgba(200,214,236,0.5)'; g.lineWidth = 1.6; g.lineCap = 'round';
    g.beginPath();
    for (const d of S.rain) { g.moveTo(-534 + d.x, 164 + d.y); g.lineTo(-534 + d.x - d.l * 0.18, 164 + d.y + d.l); }
    g.stroke();
    g.restore();

    /* Ana, where she always sat. Nobody is at the stove. */
    const look = T.ease.io(S.look.k), hug = T.ease.io(S.hug.k);
    const breath = Math.sin(t * 1.1) * 0.012;
    const ana = {
      x: ANA.x, y: ANA.y, s: ANA.s, style: F.styles.anaBlack, flip: true, sit: true,
      lean: 0.1 + breath + hug * 0.12 - look * 0.06, headTilt: 0.34 - look * 0.4 + hug * 0.2,
      legF: { a: Math.PI / 2 - 0.1, b: Math.PI / 2 - 0.22 }, legB: { a: Math.PI / 2 - 0.2, b: Math.PI / 2 - 0.14 },
      face: { eye: hug > 0.5 ? 'closed' : 'open', mouth: hug > 0.6 ? 'line' : null, blush: 0.12, tear: S.tear.k * 0.9, tearY: (t * 2) % 3 },
      skip: { armF: true },
    };
    const lap = [BOOK[0], BOOK[1]], chest = [ANA.x - 22, ANA.y - 92];
    const bookAt = [T.lerp(lap[0], chest[0], hug), T.lerp(lap[1], chest[1], hug)];
    ana.armB = { hand: F.local(ana, bookAt[0] + 10, bookAt[1] + 6) };
    F.person(g, ana);
    /* the notebook: mustard cover, red band */
    g.save(); g.translate(bookAt[0], bookAt[1]); g.rotate(T.lerp(-0.06, -1.1, hug));
    P.fill(g, P.rr(-36, -9, 72, 8, 2), '#f6f0e0');
    P.fill(g, P.rr(-38, -14, 76, 7, 3), '#d7a23c');
    P.fill(g, P.rr(-38, -3, 76, 6, 3), '#b8862c');
    P.fill(g, P.rr(12, -14, 6, 17, 1), '#c9573f');
    g.restore();
    ana.only = 'armF'; ana.skip = null;
    ana.armF = { hand: F.local(ana, bookAt[0] - 14, bookAt[1] - 6) };
    F.person(g, ana);
    g.restore();

    /* night: everything cool, one warm pool under the lamp she left on */
    g.save();
    g.globalCompositeOperation = 'multiply';
    const pool = g.createRadialGradient(24, 300, 30, 24, 420, 620);
    pool.addColorStop(0, '#ffe9c2'); pool.addColorStop(0.3, '#c9b7b0'); pool.addColorStop(0.7, '#6f7ba3'); pool.addColorStop(1, '#4b5780');
    g.fillStyle = pool; g.fillRect(-W / 2, 0, W, 900);
    g.restore();
    P.glow(g, 24 + bx * 0.5, 262, 150, '#ffdc9a', 0.4);
    g.save(); g.globalCompositeOperation = 'screen';
    const cone = g.createLinearGradient(0, 250, 0, 640);
    cone.addColorStop(0, 'rgba(255,224,160,0.16)'); cone.addColorStop(1, 'rgba(255,224,160,0)');
    g.fillStyle = cone;
    g.beginPath(); g.moveTo(-26, 252); g.lineTo(74, 252); g.lineTo(300, 640); g.lineTo(-250, 640); g.closePath(); g.fill();
    g.restore();

    if (S.mode === 'wait') P.beacon(g, BOOK[0] + bx * 0.5, BOOK[1] + by * 0.5, 50, t, 1);
    if (S.hint.a > 0.01) P.text(g, '공책을 펼쳐 보세요', 0, 850, { font: 'serif', size: 26, color: '#f3ead8', alpha: 0.9 * S.hint.a });
    if (S.cap.a > 0.01) {
      P.text(g, '장례를 마친 밤', -W / 2 + 98, 846, { font: 'serif', size: 22, color: '#d9d2e4', alpha: 0.9 * S.cap.a, align: 'left' });
      P.text(g, '아나, 36', -W / 2 + 96, 792, { font: 'serif', size: 40, track: 3, color: '#f1e8d6', alpha: S.cap.a, align: 'left' });
      g.fillStyle = T.rgba('#f1e8d6', 0.5 * S.cap.a); g.fillRect(-W / 2 + 98, 812, 150 * T.ease.out(S.cap.a), 1.4);
    }
    drawCard(g);
  };
})();
