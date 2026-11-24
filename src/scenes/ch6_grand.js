/* Chapter 6 「손주」 — years twenty-five to thirty. The cloud whale goes by for the third time since he came, as many
   times as his mother saw it waiting for him, and 구름이 hears the calf answer. Two years on the magpie comes again;
   this time he knows it, and follows it to the post office of the wind, where a photograph has come for him: Lily
   with a newborn in her arms, Ana beside her, and on the back, in Lily's hand, the baby's name. Ana chose it: 노라,
   out of the promise he did not keep (오로라 보러 가기), and he is the only one who hears it. Back on the hill Pipi
   says babies look at the ceiling all day, and Leo works out for himself what the lake can do for her: hang
   something on the bank, and its shadow will reach the ceiling of her room. The carpenter brings offcuts; they make
   a mobile of the things up here (the whale, two stars, a cloud, and the little swing seat), each bar hung level.
   That night, the chapter's one lake: Lily walking the crying baby up and down, Ana at the door. He hangs the
   mobile on a branch at the water's edge (자리 and 거리 together: over the crib, and right at the edge), its shadows
   go down and turn on the ceiling, and Nora stops crying and laughs. He keeps the laugh for a dream (X.gift
   'sound'; chapter 7 spends it). Three years on: the garden of five beds, the reddest tomato, the bell, and Pipi's
   mother, who had promised to hold him again (moved here unchanged from what was chapter 6). */
(function () {
  'use strict';
  const T = window.TYT, P = T.P, F = T.F;
  const TAU = Math.PI * 2;

  function tomato(g, x, y, s) {
    s = s || 1;
    P.fill(g, P.circle(x, y, 5 * s), '#d9584a');
    P.fill(g, P.circle(x - 1.6 * s, y - 1.6 * s, 1.5 * s), 'rgba(255,255,255,0.42)');
    P.fill(g, P.poly([[x - 3.4 * s, y - 4 * s], [x, y - 6.6 * s], [x + 3.4 * s, y - 4 * s], [x, y - 3 * s]]), '#5d8a57');
  }

  /* ---------- the photograph ----------
     A print with a white border: Lily (thirty-three) holding the baby asleep, Ana (sixty-three) bending in to look;
     turned over, Lily's handwriting. c: { a, flip 0..1 (front to back), w (how much of the writing is there) } */
  function snapshot(g, w, h, t) {
    /* what is in it, in a frame w × h centred on the origin */
    g.save(); g.beginPath(); g.rect(-w / 2, -h / 2, w, h); g.clip();
    const bg = g.createLinearGradient(0, -h / 2, 0, h / 2); bg.addColorStop(0, '#efe2cc'); bg.addColorStop(1, '#dcc6a8');
    g.fillStyle = bg; g.fillRect(-w / 2, -h / 2, w, h);
    P.fill(g, P.rr(-w / 2 + 24, -h / 2 + 30, 120, 150, 4), '#f6f0e2'); P.glow(g, -w / 2 + 84, -h / 2 + 100, 140, '#fff6dc', 0.7);   /* a window, daylight */
    const ls = F.lilyAt(33), as = F.anaAt(63), base = h / 2 - 92;
    const li = { x: -70, y: base - 6, s: 300, style: ls, lean: 0.12, headTilt: 0.3, face: { eye: 'happy', mouth: 'smile', blush: 0.3 }, skip: { armF: true } };
    const bb = [li.x + 36, base - 58];
    li.armB = { hand: F.local(li, bb[0] - 26, bb[1] + 8) };
    const an = { x: 120, y: base, s: 296, style: as, flip: true, lean: 0.2, headTilt: 0.24, face: { eye: 'happy', mouth: 'smile', blush: 0.26, old: true } };
    an.armF = { hand: F.local(an, bb[0] + 34, bb[1] - 4) }; an.armB = { a: 0.4, b: 0.6 };
    F.person(g, an);
    F.person(g, li);
    F.baby(g, { x: bb[0], y: bb[1], s: 1.5, flip: true, rot: 0.1, face: 'sleep', t, hand: 0.4 });
    F.person(g, Object.assign({}, li, { only: 'armF', skip: null, armF: { hand: F.local(li, bb[0] + 22, bb[1] + 12) } }));
    g.fillStyle = 'rgba(255,236,200,0.16)'; g.fillRect(-w / 2, -h / 2, w, h);
    g.restore();
  }
  function photoCard(g, c) {
    const V = T.view;
    if (c.a <= 0.003) return;
    g.save();
    g.fillStyle = T.rgba('#141a2c', 0.55 * c.a); g.fillRect(-V.W / 2, 0, V.W, V.H);
    const k = T.ease.out3(T.clamp(c.a)), fl = T.ease.io(T.clamp(c.flip || 0)), back = fl > 0.5;
    g.translate(0, 390 + (1 - k) * 60 + Math.sin(T.time * 0.8) * 3); g.rotate(-0.03 + fl * 0.05);
    g.scale(Math.max(0.02, Math.abs(Math.cos(fl * Math.PI))), 1);
    g.globalAlpha = T.clamp(c.a * 2.5);
    g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 40; g.shadowOffsetY = 14;
    P.fill(g, P.rr(-300, -230, 600, 460, 6), back ? '#f4ecdc' : '#fbf8f1');
    g.shadowColor = 'transparent';
    if (!back) snapshot(g, 556, 384, T.time);
    else {
      /* the back: Lily's handwriting, in blue ink */
      g.strokeStyle = 'rgba(120,100,80,0.12)'; g.lineWidth = 1;
      for (let i = 0; i < 4; i++) { const y = -96 + i * 84; g.beginPath(); g.moveTo(-250, y); g.lineTo(250, y); g.stroke(); }
      P.text(g, '아빠, 손녀야.', 0, -112, { size: 64, color: '#3a5f96', k: T.clamp(c.w), seed: 21 });
      P.text(g, '이름은 엄마가 지어 줬어.', 0, -10, { size: 56, color: '#3a5f96', k: T.clamp(c.w - 1), seed: 22 });
      P.text(g, '노라.', 0, 110, { size: 84, color: '#3a5f96', k: T.clamp(c.w - 2), seed: 23 });
    }
    g.restore();
  }
  /* the same photograph, small, in someone's hand */
  function smallPhoto(g, x, y, rot) {
    g.save(); g.translate(x, y); g.rotate(rot || 0);
    P.fill(g, P.rr(-12, -9, 24, 18, 1.5), '#fbf8f1'); P.fill(g, P.rr(-10, -7, 20, 13, 1), '#d9c0a0');
    P.fill(g, P.circle(-3, -2, 2.4), '#f3ccb0'); P.fill(g, P.circle(4, -1, 2.4), '#ecc1a6'); P.fill(g, P.ellipse(0, 3, 4, 2), '#f2dfe4');
    g.restore();
  }
  /* an armful of offcuts, under the carpenter's arm */
  function offcuts(g, x, y) {
    [[0, 0, 46, '#c99a62'], [-4, 7, 38, '#b98a5a'], [5, 13, 30, '#d8b080']].forEach((q) => { g.save(); g.translate(x + q[0], y + q[1]); g.rotate(-0.12); P.fill(g, P.rr(-q[2] / 2, -3, q[2], 7, 2), q[3]); g.restore(); });
  }

  /* ---------- the reddest tomato ----------
     A close look in among the vines, at the end of summer, from behind the new fence (Bean is on the other side of
     it). Seven tomatoes, none quite alike. The sun coming in from the left makes the ones it falls on look riper than
     they are, and the reddest of all hangs in the shade behind a leaf, a little of it showing. Tap a leaf to lift it,
     a tomato to pick it; Pipi says what is wrong with the others. Nothing is lost by a wrong one. */
  const TOMS = [
    { x: -432, y: 292, r: 36, c: '#a9c46a', say: 'raw' },
    { x: -300, y: 452, r: 40, c: '#e8963a', sun: 1, say: 'raw' },
    { x: -168, y: 300, r: 43, c: '#e9603a', sun: 1, say: 'sun' },
    { x: -26, y: 474, r: 38, c: '#dc6a44', say: 'red' },
    { x: 128, y: 318, r: 40, c: '#d6563c', say: 'red' },
    { x: 258, y: 500, r: 35, c: '#c4c060', leaf: 0, say: 'raw' },
    { x: 404, y: 312, r: 43, c: '#c8121e', leaf: 1 },
  ];
  const BEST = 6;
  /* a leaf hangs from p (where its stalk is) toward its tip; lifted, it swings up about p */
  const LEAVES = [{ p: [196, 446], tip: [328, 556], lift: -1.35 }, { p: [326, 224], tip: [470, 362], lift: -1.3 }];
  const PIPI_SAYS = {
    raw: '피피: "그건 아직 덜 빨개."',
    sun: '피피: "그건 해가 비쳐서 빨개 보이는 거야."',
    red: '피피: "빨갛긴 한데… 더 빨간 거 있어."',
  };
  function bigTomato(g, x, y, r, c, sun, t) {
    P.fill(g, P.ellipse(x + 4, y + r * 0.95, r * 0.7, r * 0.18), 'rgba(40,60,30,0.16)');
    if (sun) P.glow(g, x - r * 0.2, y - r * 0.2, r * 2.1, '#ffe1a0', 0.55);
    const col = sun ? T.mix(c, '#ff9f55', 0.16) : c;
    const body = P.ellipse(x, y, r * 1.06, r * 0.94);
    P.fill(g, body, col);
    g.save(); g.clip(body);
    P.fill(g, P.ellipse(x + r * 0.3, y + r * 0.6, r * 1.15, r * 0.72), T.shade(col, sun ? -0.08 : -0.2));
    g.strokeStyle = T.rgba(T.shade(col, -0.25), 0.5); g.lineWidth = 2;
    for (const d of [-0.42, 0.42]) { g.beginPath(); g.moveTo(x + d * r * 0.5, y - r * 0.8); g.quadraticCurveTo(x + d * r * 1.05, y, x + d * r * 0.45, y + r * 0.85); g.stroke(); }
    g.restore();
    P.fill(g, P.ellipse(x - r * 0.4, y - r * 0.36, r * 0.3, r * 0.17, -0.6), `rgba(255,255,255,${sun ? 0.85 : 0.42})`);
    if (sun) P.fill(g, P.circle(x - r * 0.2, y - r * 0.52, r * 0.07), 'rgba(255,255,255,0.9)');
    const star = [];
    for (let i = 0; i < 10; i++) { const an = -Math.PI / 2 + (i * Math.PI) / 5 + 0.1, rr = i % 2 ? r * 0.14 : r * 0.5; star.push([x + Math.cos(an) * rr, y - r * 0.82 + Math.sin(an) * rr * 0.5]); }
    P.fill(g, P.poly(star), '#4f8a42');
    P.line(g, x, y - r * 0.86, x + 3, y - r * 1.2, 4.5, '#5f8f4a');
    void t;
  }
  function bigLeaf(g, p, tip, lift, k, t, seed) {
    const ang = Math.atan2(tip[1] - p[1], tip[0] - p[0]) + lift * T.ease.out(k) + Math.sin(t * 1.4 + seed) * 0.02 + Math.sin(k * Math.PI) * 0.12, len = Math.hypot(tip[0] - p[0], tip[1] - p[1]);
    g.save(); g.translate(p[0], p[1]); g.rotate(ang);
    if (k < 0.98) { g.save(); g.globalAlpha *= 0.2 * (1 - k); P.fill(g, P.ellipse(len * 0.55 + 10, 22, len * 0.6, 40), '#24401c'); g.restore(); }   /* its shade on what is under it */
    /* a leaflet: a broad, pointed oval, solid under its crayon so that what is behind it does not show through */
    const cray = P.cray;
    const lf = (x, y, w, h, rot, c) => {
      g.save(); g.translate(x, y); g.rotate(rot);
      const sh = P.soft([[-w, 0], [-w * 0.55, -h], [w * 0.35, -h * 0.9], [w * 1.05, 0], [w * 0.35, h * 0.9], [-w * 0.55, h]]);
      P.cray = false; P.fill(g, sh, c); P.cray = cray; if (cray) P.fill(g, sh, c);
      P.line(g, -w * 0.8, 0, w * 0.8, 0, 1.6, 'rgba(220,240,190,0.55)');
      g.restore();
    };
    P.cray = false; P.line(g, 0, 0, len * 0.96, 0, 4, '#4f7f3e'); P.cray = cray;
    for (let i = 0; i < 3; i++) {
      const x = len * (0.26 + i * 0.25), s = 1 - i * 0.1;
      lf(x + 22 * s, -24 * s, 34 * s, 22 * s, -0.55, i % 2 ? '#5f9a52' : '#68a458');
      lf(x + 26 * s, 24 * s, 34 * s, 22 * s, 0.55, i % 2 ? '#68a458' : '#5f9a52');
    }
    lf(len * 0.98, 0, 40, 27, 0, '#6fae5e');
    g.restore();
  }
  function reddest(o) {
    const Z = T.puzzle;
    const G = Z.make({ up: LEAVES.map(() => 0), lifted: LEAVES.map(() => false), wob: TOMS.map(() => 0), pk: 0, picked: -1, busy: false });
    const covered = (n) => TOMS[n].leaf != null && !G.lifted[TOMS[n].leaf];
    const leafMid = (i) => { const L = LEAVES[i]; return [T.lerp(L.p[0], L.tip[0], 0.55), T.lerp(L.p[1], L.tip[1], 0.55)]; };
    function nearLeaf(i, x, y) {
      const L = LEAVES[i], dx = L.tip[0] - L.p[0], dy = L.tip[1] - L.p[1], l2 = dx * dx + dy * dy;
      const u = T.clamp(((x - L.p[0]) * dx + (y - L.p[1]) * dy) / l2), qx = L.p[0] + dx * u, qy = L.p[1] + dy * u;
      return Math.hypot(x - qx, y - qy) < 58;
    }
    G.hit = function (x, y) {
      if (G.busy) return -1;
      for (let i = 0; i < LEAVES.length; i++) if (!G.lifted[i] && nearLeaf(i, x, y)) return 7 + i;
      let best = -1, bd = 1e9;
      TOMS.forEach((q, n) => { const d = Math.hypot(x - q.x, y - q.y); if (d < q.r + 20 && d < bd && !covered(n)) { bd = d; best = n; } });
      return best;
    };
    function lift(i) {
      if (G.lifted[i]) return;
      G.lifted[i] = true; G.idle = 0; G.say = '';
      T.audio.sfx('step-grass'); T.audio.sfx('touch');
      G.clock.tween(G.up, i, 1, 0.7, T.ease.io);
    }
    G.tap = function (n) {
      if (G.done || G.busy || n < 0) return;
      G.idle = 0;
      if (n >= 7) { lift(n - 7); return; }
      if (n >= TOMS.length) return;
      if (covered(n)) { lift(TOMS[n].leaf); return; }
      if (n !== BEST) { G.wob[n] = 1; G.clock.tween(G.wob, n, 0, 0.7); G.wrong(PIPI_SAYS[TOMS[n].say]); return; }
      pick();
    };
    function pick() {
      G.busy = true; G.say = ''; G.picked = BEST;
      T.audio.sfx('join'); T.audio.sfx('star', 0.7);
      G.clock.tween(G, 'pk', 1, 1.1, T.ease.io);
      G.finish(1.3);
    }
    const target = () => (covered(BEST) ? 7 + TOMS[BEST].leaf : BEST);
    G.next = () => (G.done || G.busy ? null : String(target() + 1));
    G.hintAt = () => { if (G.done || G.busy) return null; const n = target(); return n >= 7 ? leafMid(n - 7) : [TOMS[n].x, TOMS[n].y]; };
    G.hintR = 58;
    G.keys = () => (G.busy ? null : 'pick');
    G.tip = '잎 뒤에 숨은 것도 있어요. 잎을 눌러 들춰 봐요';
    G.spots = () => (G.busy ? [] : TOMS.map((q, n) => (covered(n) ? null : [n, q.x, q.y, q.r + 12])).concat(LEAVES.map((L, i) => (G.lifted[i] ? null : [7 + i, ...leafMid(i), 60]))));
    /* skipped: the leaf is lifted, and the right one picked */
    G.solve = function () { if (G.busy || G.done) return; const L = TOMS[BEST].leaf; if (!G.lifted[L]) lift(L); G.clock.wait(0.6).then(pick); };
    G.draw = function (g, t) {
      if (G.a < 0.005) return;
      G.dim(g, 0.5);
      const X0 = -560, Y0 = 118, PW = 1120, PH = 604, frame = P.rr(X0, Y0, PW, PH, 30);
      g.save(); g.globalAlpha = G.a;
      g.save(); g.translate(0, (1 - T.ease.out3(G.a)) * 30);
      g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = 36; g.shadowOffsetY = 12;
      P.fill(g, frame, '#9fbf7a');
      g.shadowColor = 'transparent';
      g.save(); g.clip(frame);
      /* among the vines, late in the afternoon: light from the left */
      const bg = g.createLinearGradient(0, Y0, 0, Y0 + PH);
      bg.addColorStop(0, '#f2e6ae'); bg.addColorStop(0.45, '#b7cf8a'); bg.addColorStop(1, '#7c9c5e');
      g.fillStyle = bg; g.fillRect(X0, Y0, PW, PH);
      P.glow(g, X0 + 60, Y0 + 10, 560, '#fff4c8', 0.8);
      const r = T.rng(66);
      for (let i = 0; i < 46; i++) {   /* the leaves behind, softer */
        const x = X0 + r() * PW, y = Y0 + 40 + r() * (PH - 160), rot = r() * TAU, sx = 22 + r() * 26;
        P.fill(g, P.ellipse(x + Math.sin(t * 0.9 + i) * 2, y, sx, sx * 0.5, rot), r() < 0.5 ? 'rgba(96,150,80,0.55)' : 'rgba(120,170,96,0.5)');
      }
      /* the stakes, with the vines tied up them and a stalk out to each tomato */
      [-366, -96, 190, 440].forEach((sx, i) => {
        P.line(g, sx, Y0 + 30, sx + 4, Y0 + PH - 70, 9, '#c9a878'); P.line(g, sx - 3, Y0 + 30, sx + 1, Y0 + PH - 70, 3, '#e2c99c');
        g.strokeStyle = '#5f8f4a'; g.lineWidth = 7; g.lineCap = 'round'; g.beginPath();
        for (let y = Y0 + PH - 70; y > Y0 + 40; y -= 24) { const x = sx + Math.sin(y * 0.03 + i) * 16; if (y === Y0 + PH - 70) g.moveTo(x, y); else g.lineTo(x, y); }
        g.stroke();
        for (let y = Y0 + 90 + i * 20; y < Y0 + PH - 120; y += 150) { g.strokeStyle = '#efe0c0'; g.lineWidth = 2.4; g.beginPath(); g.ellipse(sx + 2, y, 10, 4, 0.2, 0, TAU); g.stroke(); }
      });
      TOMS.forEach((q) => { const sx = [-366, -96, 190, 440].reduce((a, b) => (Math.abs(b - q.x) < Math.abs(a - q.x) ? b : a)); P.line(g, sx + 4, q.y - q.r - 30, q.x + 2, q.y - q.r * 1.1, 4, '#5f8f4a'); });
      /* the sun, falling in a slant across the left of the picture */
      g.save(); g.globalCompositeOperation = 'screen';
      const beam = g.createLinearGradient(X0, Y0, X0 + 520, Y0 + PH);
      beam.addColorStop(0, 'rgba(255,236,170,0.55)'); beam.addColorStop(1, 'rgba(255,236,170,0)');
      g.fillStyle = beam; g.beginPath(); g.moveTo(X0, Y0); g.lineTo(X0 + 300, Y0); g.lineTo(X0 + 520, Y0 + PH); g.lineTo(X0, Y0 + PH); g.closePath(); g.fill();
      g.restore();
      /* the tomatoes */
      TOMS.forEach((q, n) => {
        if (n === G.picked) return;
        const j = Math.sin(t * 40 + n) * 5 * G.wob[n];
        bigTomato(g, q.x + j, q.y + Math.sin(t * 1.3 + n) * 1.5, q.r, q.c, q.sun, t);
      });
      LEAVES.forEach((L, i) => bigLeaf(g, L.p, L.tip, L.lift, G.up[i], t, i * 2));
      /* the new fence along the front, and the one it was put up against */
      const soil = g.createLinearGradient(0, Y0 + PH - 60, 0, Y0 + PH);
      soil.addColorStop(0, '#7c9c5e'); soil.addColorStop(0.5, '#8a6a46'); soil.addColorStop(1, '#7a5636');
      g.fillStyle = soil; g.fillRect(X0, Y0 + PH - 60, PW, 60);
      F.dog(g, { x: 446, y: Y0 + PH - 8, s: 400, sit: 1, wag: Math.sin(t * 9) * 0.9, headTilt: -0.12 + Math.sin(t * 0.8) * 0.06, flip: true });
      for (let x = X0 + 14; x < X0 + PW; x += 50) {
        const y = Y0 + PH - 82 + (Math.round(x / 50) % 2) * 3;
        P.fill(g, P.poly([[x - 11, Y0 + PH], [x - 11, y + 11], [x, y], [x + 11, y + 11], [x + 11, Y0 + PH]]), '#f1e6cc');
        P.fill(g, P.rr(x + 6, y + 12, 5, Y0 + PH - y - 12, 2), 'rgba(160,130,96,0.3)');
      }
      P.fill(g, P.rr(X0, Y0 + PH - 56, PW, 9, 4), '#e2d1ac'); P.fill(g, P.rr(X0, Y0 + PH - 24, PW, 9, 4), '#e2d1ac');
      g.restore();
      g.strokeStyle = 'rgba(255,250,236,0.7)'; g.lineWidth = 3; g.stroke(frame);
      g.restore();
      /* the one picked comes away in the hand */
      if (G.picked >= 0) {
        const q = TOMS[G.picked], k = G.pk;
        P.glow(g, q.x, q.y - 60 * k, 110 * (1 - k * 0.3), '#fff0c0', 0.5 * Math.sin(k * Math.PI) + 0.2);
        g.save(); g.globalAlpha = 1 - T.clamp((k - 0.8) / 0.2);
        bigTomato(g, q.x, q.y - 60 * k, q.r * (1 + 0.25 * Math.sin(k * Math.PI)), q.c, false, t);
        g.restore();
      }
      g.restore();
      G.hintRing(g, t);
      G.caption(g, '제일 빨간 토마토를 골라 따 주세요');
    };
    void o;
    return G;
  }
  /* the fence round the five beds, and a little gate on the near side (shared: chapter 8 has it too) */
  function fence(g) {
    const Wd = T.world, AX = T.puzzle.PATCH_X, x0 = AX - 184, x1 = AX + 176;
    g.save(); g.globalAlpha *= 0.94;
    const rail = (dy) => { g.strokeStyle = '#d9c7a2'; g.lineWidth = 3; g.beginPath(); for (let x = x0; x <= x1; x += 12) { const y = Wd.y3(x) + dy; if (x === x0) g.moveTo(x, y); else g.lineTo(x, y); } g.stroke(); };
    rail(-9); rail(-19);
    for (let x = x0; x <= x1; x += 13) { const y = Wd.y3(x) + 3, h = x > x1 - 40 ? 22 : 25; P.fill(g, P.poly([[x - 3.6, y], [x - 3.6, y - h], [x, y - h - 4.5], [x + 3.6, y - h], [x + 3.6, y]]), '#f1e5c8'); }
    g.restore();
  }
  T.plot.fence = fence;

  T.stage('ch6', {
    chapter: 6, title: ['6장', '손주'], end: ['6장 끝', '7장 「아직은」'], next: 'ch7', pad: 2, nextColor: '#161d2a',
    plot: { stage: 4, stones: 4, board: true, table: true, tree: 1, swing: 1, swingW: 1, garden: 1, patch: 2, fruit: 1, season: 'spring' },
    flags: { bramGone: true, rosaGone: true },
    build() { T.scenes.kitchen.build(); },
    update(dt, S) { if (S.swinging) S.ps.swingA = Math.sin(T.time * 1.3) * 0.45; },
    onHill(g, h, S) {
      if (h === 3 && S.ps && S.ps.patch >= 3 && !S.ps.patchHide) fence(g);
      /* the magpie from the post office of the wind */
      const m = S.pie;
      if (m && h === T.world.hillOf(T.plot.BOARD_X)) {
        const mv = m.px == null ? 0 : m.x - m.px; m.px = m.x; if (Math.abs(mv) > 0.05) m.face = Math.sign(mv);
        T.place.magpie(g, m.x, m.y + (m.land ? 0 : Math.sin(T.time * 3) * 6), 1, T.time, { flip: m.face < 0, fly: m.land ? 0 : 1, tilt: m.land ? Math.sin(T.time * 1.3) * 0.25 : 0 });
      }
    },
    script: async function (X) {
      const W = T.world, C = W.C, PL = T.plot, S = X.S, ps = S.ps, A = X.A;
      const [px, py] = X.place.plot();
      X.cam(px + 60, py, 1); X.camSnap();
      S.swinging = false; S.pie = null;
      const leo = X.actor('leo', { x: PL.TABLE_X - 66, style: F.leoAt(3), chair: 1, face: { old: true } });
      const bean = X.actor('bean', { dog: true, s: 220, x: PL.TABLE_X + 118, sit: 1, wag: 0.5, flip: true });
      const tableY = () => W.y3(PL.TABLE_X) - 66;
      leo.pose = (o, a, t) => {
        if (a.onSwing) { PL.sitOnSwing(o, ps, -1); o.face.eye = 'happy'; o.headTilt = -0.16; return; }
        if (a.hold) { a.hold(o, a, t); return; }
        if (!a.chair) return;
        o.lean = 0.12; o.armF = { hand: F.local(o, PL.TABLE_X - 16, tableY()), bend: -1 }; o.armB = { hand: F.local(o, PL.TABLE_X - 28, tableY() + 6) };
      };
      const keep0 = S.actors;
      const drop = (a) => { const i = keep0.indexOf(a); if (i >= 0) keep0.splice(i, 1); };
      /* the quay, for the one who comes */
      const quay = (more) => X.dip(async () => {
        ps.food.show = false; leo.chair = 0;
        S.actors = []; S.boats = [];
        const [qx, qy] = X.place.quay(); X.cam(qx, qy, 1.05); X.camSnap();
        more();
      });
      const TALK = X.TALK;
      X.title();
      await X.wait(4.4);

      /* ---- the whale again, the third he has seen: he has waited here about as long as his mother did ---- */
      const wh = T.place('whales', { dusk: 0.2, actors: [
        { id: 'leo', style: F.leoAt(3), at: 'leo', lean: 0.07, face: { old: true, mouth: 'smile' } },
        { id: 'bean', dog: true, at: 'beside', s: 150, sit: 1, headTilt: -0.1 },
        { id: 'cloud', style: F.styles.cloud, s: 94, at: 'beside', dx: 74, headTilt: -0.14, face: { mouth: 'smile' } },
      ] });
      wh.pass({ from: 0.04, dur: 46 });
      await X.view(wh, { color: '#fff6e6', out: 1.4, in: 1.8 });
      T.announce('해 질 녘, 언덕 끝. 구름 고래가 새끼와 함께 또 지나간다. 늙은 레오와 빈, 구름이가 나란히 본다.');
      await X.wait(6.5);
      await TALK.say('leo', '벌써 세 번째 고래야, 빈.');
      await X.wait(0.8);
      await TALK.say('leo', '…엄마도 이걸 세 번 보면서\n날 기다렸대.', { slow: true });
      await X.wait(1.6);
      /* 구름이 has watched the calf, all twenty years: it answers its mother (chapter 4: 「엄마가 부르면, 아기가 대답해.」) */
      await TALK.say('cloud', '…또 대답했다.');
      await X.wait(1);
      X.tween(wh.sun, 'k', 0.6, 8);

      /* ---- two years on: the magpie again, and this time he knows it ---- */
      await X.dip(async () => {
        X.cam(px + 60, py, 1); X.camSnap();
        S.pie = { x: PL.HX - 700, y: W.y3(PL.HX) - 420, land: 0 };
      }, { color: '#fff6e6', out: 1.4, in: 0.1 });
      S.view = null; S.vcam = { x: 0, y: 450, z: 1 };
      X.bed(4, 0.13, 'walk');
      await X.years(25, 27, { age: 63, season: 'spring' });
      const pie = S.pie;
      A.sfx('star', 0.8);
      T.announce('까치 한 마리가 언덕으로 날아와 팻말에 앉는다.');
      const perch = [PL.BOARD_X + 6, W.y3(PL.BOARD_X) - 98];
      X.tween(pie, 'x', perch[0], 3.2, T.ease.out); await X.tween(pie, 'y', perch[1], 3.2, T.ease.io);
      pie.land = 1; A.sfx('step');
      const chatter = () => { for (let i = 0; i < 3; i++) A.note({ m: 86 - (i % 2) * 2, at: i * 0.14, vel: 0.12, voice: 'pluck', dur: 0.12 }); };
      chatter();
      await X.tap(() => [perch[0], perch[1] - 8, 50]);
      leo.chair = 0; bean.sit = 0; A.sfx('bark'); bean.flip = true; leo.flip = false;
      await X.walk(leo, PL.BOARD_X + 60, 90);
      leo.flip = true;
      await TALK.say('leo', '…또 왔구나. 따라갈게.');
      pie.land = 0; A.sfx('whoosh'); chatter();
      X.tween(pie, 'x', PL.HX + 900, 3, T.ease.in); X.tween(pie, 'y', perch[1] - 380, 3, T.ease.in).then(() => { S.pie = null; });
      X.walk(leo, PL.BOARD_X + 260, 90);
      await X.wait(1.6);

      /* ---- the post office: this time it is a photograph ---- */
      const po = T.place('post', { leoAge: 3, noStar: true });
      const pl = po.actor('leo'), pb = po.actor('bean'), spl = po.spot('leo'), spb = po.spot('bean');
      pl.x = spl[0] - 420; pb.x = spb[0] - 400; pb.sit = 0;
      pl.face = { old: true, mouth: 'smile' };
      await X.view(po, { color: '#fff6e6', out: 1.3, in: 1.6 });
      T.announce('바람 우체국. 편지들이 새처럼 날아다니다 제 칸에 내려앉는다.');
      po.walkTo(pb, spb[0], 80).then(() => { pb.sit = 1; pb.flip = false; });
      await po.walkTo(pl, spl[0], 70);
      pl.flip = false;
      await X.wait(0.8);
      const pman = po.actor('post'), satchel = pman.prop;
      let pmHand = null;
      pman.photo = true;
      pman.prop = (g, j, o, t) => { satchel(g, j, o, t); if (pman.photo && j.handF) { pmHand = [j.handF[0], j.handF[1]]; smallPhoto(g, j.handF[0] - 6, j.handF[1] - 4, 0.15); } };
      pman.pose = (q) => { q.armF = { a: 1.5, b: 0.15 }; q.headTilt = 0.06; };
      await TALK.say('post', '이번엔 사진이구먼.');
      /* he goes up to the counter for it */
      await po.walkTo(pl, po.spot('desk')[0] - 96, 60);
      pl.flip = false;
      const par = () => T.par(0.6);
      await X.tap(() => (pmHand ? [pmHand[0] + par()[0] - 6, pmHand[1] + par()[1] - 4, 44] : [po.spot('desk')[0] - 40, 560, 44]), { screen: true });
      pman.photo = false; pman.pose = null;
      pl.photo = true;
      pl.pose = (q) => { q.armF = { hand: [15, -14] }; q.armB = { hand: [13, -12] }; q.headTilt = 0.24; };
      pl.prop = (g, j) => { if (pl.photo && j.handF && j.handB) smallPhoto(g, (j.handF[0] + j.handB[0]) / 2, (j.handF[1] + j.handB[1]) / 2 - 4, -0.1); };
      A.sfx('paper');
      await X.wait(0.6);
      await X.card(photoCard, {
        init: { flip: 0, w: 0 }, max: 20,
        run: async (c) => {
          T.announce('사진. 갓난아기를 안은 릴리, 곁에서 들여다보는 아나.');
          await X.wait(3.2);
          A.sfx('card');
          await X.tween(c, 'flip', 1, 1.1, T.ease.io);
          T.announce('사진 뒷면, 릴리 글씨. 아빠, 손녀야. 이름은 엄마가 지어 줬어. 노라.');
          for (let i = 0; i < 3; i++) { if (i === 2) await X.wait(0.7); A.sfx('crayon'); await X.tween(c, 'w', i + 1, i === 2 ? 1.2 : 1.6, T.ease.lin); X.note(); await X.wait(0.3); }
          await X.wait(0.8);
          await TALK.say('leo', '…노라.', { slow: true });
          await X.wait(0.6);
          await TALK.say('leo', '…오로라.', { slow: true });
        },
      });
      pl.pose = (q) => { q.armF = { hand: [15, -14] }; q.armB = { hand: [13, -12] }; q.headTilt = 0.1; q.face = Object.assign({}, q.face, { eye: 'happy' }); };
      await TALK.say('leo', '우리 릴리가 엄마가 됐네.\n…아나는 할머니고.');
      pman.pose = (q) => { q.face = Object.assign({}, q.face, { eye: 'happy' }); q.headTilt = -0.06; };
      await TALK.say('post', '자네도 할아버지 아닌가.');
      pl.pose = (q, t) => { q.armF = { hand: [15, -14] }; q.armB = { hand: [13, -12] }; q.headTilt = 0.18 + Math.sin(t * 9) * 0.03; q.face = Object.assign({}, q.face, { eye: 'happy', mouth: 'open' }); };
      await X.wait(0.6);
      await TALK.say('leo', '…그러네요.');
      pman.pose = null;
      await X.wait(0.8);

      /* ---- on the hill: what can a grandfather do from up here ---- */
      const holdPhoto = (o) => { o.armF = { hand: [14, -13] }; o.armB = { hand: [12, -11] }; o.headTilt = 0.26; };
      const photoProp = (g, j, o, a) => { if (a.photo && j.handF && j.handB) smallPhoto(g, (j.handF[0] + j.handB[0]) / 2, (j.handF[1] + j.handB[1]) / 2 - 3, a.flip ? 0.12 : -0.12); };
      leo.go = null; leo.moving = false; leo.chair = 0; leo.x = PL.BOARD_X + 60; leo.flip = true; leo.photo = true; leo.prop = photoProp; leo.hold = holdPhoto;
      bean.x = PL.BOARD_X + 185; bean.sit = 1; bean.flip = true;
      X.cam(PL.BOARD_X - 10, py + 70, 1.45); X.camSnap();
      await X.view(null, { color: '#fff6e6', out: 1.3, in: 1.4 });
      const pp = X.actor('kid', { x: PL.BOARD_X - 560, style: F.styles.kidA, s: 100 });
      const cloud = X.actor('cloud', { x: PL.BOARD_X - 620, style: F.styles.cloud, s: 94 });
      X.walk(cloud, PL.BOARD_X - 62, 90);
      await X.walk(pp, PL.BOARD_X - 2, 120);
      pp.flip = false;
      /* he bends to show them */
      leo.hold = (o) => { o.lean = 0.2; o.headTilt = 0.3; o.armF = { hand: [17, -3] }; o.armB = { hand: [15, -2] }; };
      pp.pose = (o, a, t) => { o.lean = 0.14; o.headTilt = -0.12; o.y -= Math.abs(Math.sin(t * 5)) * 2; o.face.eye = 'happy'; };
      await X.wait(0.6);
      await TALK.say('kid', '쪼끄맣다!\n누나가 엄마 됐어?');
      cloud.flip = false;
      cloud.pose = (o) => { o.lean = 0.1; o.headTilt = 0.06; };
      await TALK.say('cloud', '…작다.');
      await X.wait(0.5);
      await TALK.say('cloud', '…따뜻하겠다.');
      pp.pose = null; cloud.pose = null;
      leo.hold = (o) => { holdPhoto(o); o.headTilt = 0.1; };
      await X.wait(0.6);
      await TALK.say('leo', '할아버지가 뭐라도 해 줘야 하는데.\n여기서 뭘 해 줄 수 있을까.');
      pp.pose = (o) => { o.headTilt = -0.3; };
      await TALK.say('kid', '아기들은 맨날 천장만 본대.\n엄마가 그랬어.');
      pp.pose = (o, a, t) => { o.armF = { a: 2.4 + Math.sin(t * 6) * 0.3, b: 0.3 }; o.face.eye = 'happy'; };
      await TALK.say('kid', '그러니까 천장에 뭘 달아 줘!\n빙글빙글 도는 거.');
      pp.pose = null;
      /* he works it out himself: what is set on the bank falls as a shadow, the same place, into the room below */
      leo.hold = (o) => { holdPhoto(o); o.headTilt = -0.06; };
      await X.wait(0.8);
      await TALK.say('leo', '…물가에 걸면,\n그림자가 그 방 천장까지 닿겠구나.', { slow: true });
      await X.wait(0.8);

      /* ---- the carpenter, with offcuts ---- */
      const v3 = X.actor('v3', { x: PL.BOARD_X - 640, style: F.styles.villagerC, s: 142, lean: 0.08 });
      v3.wood = true;
      v3.pose = (o) => { o.armF = { a: 0.9, b: 1.3 }; };
      v3.prop = (g, j, o, a) => { if (a.wood && j.handF) offcuts(g, j.handF[0] + (a.flip ? -6 : 6), j.handF[1] - 6); };
      await X.walk(v3, PL.BOARD_X - 130, 84);
      v3.flip = false;
      leo.photo = false; leo.hold = null;
      await TALK.say('v3', '자투리야.\n아기 거면 가벼워야지.');
      leo.hold = (o) => { o.headTilt = 0.16; o.armF = { a: 0.9, b: 0.8 }; };
      await TALK.say('leo', '고래, 별, 구름….\n여기서 본 것들로 하자.');
      leo.hold = null;
      T.announce('모빌 만들기. 고래, 별 둘, 구름, 작은 그네를 막대에 매달아, 막대마다 수평이 되게 한다. 무거운 것은 가운데 가까이, 가벼운 것은 멀리.');
      await X.play(T.mobile.puzzle({
        caption: '막대가 수평이 되게 매달아 주세요. 무거운 건 가운데 가까이, 가벼운 건 멀리',
        wrong: '피피: "기울었다!"',
        wrongWhale: '피피: "기울었다! 고래가 너무 뚱뚱해!"',
      }));
      /* he holds it up, and it turns */
      v3.wood = false; v3.pose = null;
      leo.mob = true;
      leo.hold = (o) => { o.armF = { a: 1.85, b: 0.05 }; o.armB = { a: 0.3, b: 0.3 }; o.headTilt = 0.04; o.face.eye = 'happy'; };
      leo.prop = (g, j, o, a) => { if (a.mob && j.handF) T.mobile.draw(g, j.handF[0] - 2, j.handF[1] - 2, 0.3, { turn: true, sway: 0.5 }); };
      X.cam(PL.BOARD_X - 20, py + 56, 1.7, 0.9);
      await X.wait(1.4);
      pp.pose = (o) => { o.headTilt = -0.36; o.face.eye = 'happy'; o.face.mouth = 'open'; };
      await TALK.say('kid', '와… 돈다.');
      await X.wait(0.4);
      v3.pose = (o) => { o.headTilt = -0.2; };
      await TALK.say('v3', '…쓸 만하네.');
      pp.pose = null; v3.pose = null;
      await X.wait(1);

      /* ---- that night, by the lake: Lily cannot get her to sleep ---- */
      await X.dip(async () => {
        [pp, cloud, v3].forEach(drop);
        ps.night = 1; leo.hold = (o) => { o.armF = { a: 0.5, b: 0.4 }; }; leo.x = PL.BOARD_X + 120; leo.flip = false;
        bean.x = PL.BOARD_X + 40; bean.flip = false; bean.sit = 0;
        X.cam(PL.BOARD_X + 200, py, 1); X.camSnap();
      }, { color: '#141b36', out: 1.2, in: 1 });
      X.bed(5, 0.13, 'night');
      X.walk(bean, C.PLOT + 330, 90);
      await X.walk(leo, C.PLOT + 380, 84);
      await X.wait(0.4);
      /* 자리 and 거리 together: the mobile must hang over the crib, and right at the water's edge for its shadows to
         reach the ceiling clear and the size they are */
      const NU = T.vig.NURSERY;
      const lake = T.lake({
        paint: T.vig.nursery, leo: F.leoAt(3), leoFace: { old: true }, shore: true, deep: true,
        stop: { k: 0 }, lift: { k: 0 }, lay: { k: 0 },
        rhShow: true, rhText: '모빌을 물가에 걸어 주세요. 그림자가 요람 위 천장에 닿게',
        tip: '물가에 가까이 둘수록 그림자가 크고 짙어져요',
        things: [T.mobile.thing({ x: -330, at: NU.ceiling, d: 0.08, rx: 150, ry: 30 })],
      });
      await X.view(lake, { color: '#141b36' });
      X.age('릴리, 33');
      T.announce('거울 호수. 밤의 아기 방. 릴리가 우는 아기를 안고 서성인다. 문가에 아나가 서 있다.');
      await X.wait(2);
      await TALK.say('lily', '…엄마, 얘 왜 이렇게 안 자.');
      await TALK.say('ana', '너도 딱 이랬어.\n아빠가 밤새 안고 걸었지.');
      await TALK.say('leo', '…그랬지.', { slow: true });
      T.announce('모빌을 물가 나뭇가지에 건다. 그림자가 요람 위 천장에 닿게. 물가에 가까울수록 그림자가 크고 짙다.');
      await lake.rhyme();
      /* its shadows go down, and turn on the ceiling; she stops, and looks up */
      await X.wait(1.6);
      lake.beat = 1;
      await X.tween(lake.stop, 'k', 1, 2.2, T.ease.io);
      await X.wait(1.2);
      lake.beat = 2;
      A.sfx('laugh');
      X.tween(lake.lift, 'k', 1, 1.2, T.ease.io);
      await X.wait(1.4);
      await TALK.say('lily', '…웃었어.\n엄마, 노라 웃었어!');
      A.sfx('laugh', 0.6);
      await TALK.say('ana', '…천장에 별이 도네.');
      await TALK.say('lily', '저 그림자, 어디서 생긴 거지?');
      await TALK.say('ana', '…글쎄.\n할아버지가 달아 줬나 보다.', { slow: true });
      A.sfx('laugh', 0.3);
      await X.wait(1.4);
      await TALK.say('leo', '…이 웃음소리, 담아 둬야지.');
      /* the laugh comes up out of the water into the tray: the sound for a dream (chapter 7 spends it) */
      await X.gift('sound', [(NU.crib - 200) * 0.7, 232 + 540 * 0.7]);
      await X.tween(lake.lift, 'k', 0, 1, T.ease.io);
      lake.beat = 3;
      await X.tween(lake.lay, 'k', 1, 4.2, T.ease.io);
      lake.beat = 4;
      await X.wait(2.4);
      lake.sleep = true;
      await X.wait(1.6);
      /* three years on, while the room sleeps */
      leo.hold = null; leo.photo = false; leo.mob = false; leo.prop = null; leo.chair = 1; ps.night = 0;
      leo.x = PL.TABLE_X - 66; leo.flip = false; bean.go = null; bean.x = PL.TABLE_X + 118; bean.flip = true; bean.sit = 1;
      await X.years(27, 30, { age: 66, season: 'late summer' });   /* tomato time */
      await X.wait(0.6);

      /* ---- the garden, grown to five beds this year, and a fence round it against Bean ---- */
      const GZ = T.puzzle;
      const pipi0 = X.actor('kid', { x: GZ.PATCH_X + 275, style: F.styles.kidA, s: 100, flip: true });
      leo.chair = 0; leo.x = GZ.PATCH_X + 230; leo.flip = true; bean.x = GZ.PATCH_X + 330; bean.flip = true; bean.sit = 1;
      ps.patch = 3; ps.fruit = 1; ps.patchHide = false;
      { const q = GZ.patchCam(); X.cam(q[0] + 60, q[1] + 10, GZ.PATCH_Z * 0.9); X.camSnap(); }
      await X.view(null, { color: '#fff6e6', out: 1.4, in: 1.4 });
      await TALK.say('kid', '올해는 고랑 다섯 개!\n울타리도 쳤으니까 빈은 못 들어와.');
      A.sfx('bark', 0.3);
      await X.wait(0.4);
      await TALK.say('kid', '올해 건 진짜 빨개!\n제일 빨간 거, 아저씨가 골라 줘.');
      T.announce('제일 빨간 토마토 고르기. 덩굴 사이에 토마토가 일곱 개 열려 있다. 햇빛이 드는 쪽은 더 빨개 보이고, 잎 뒤에 숨은 것도 있다.');
      await X.play(reddest({}));
      /* he holds it up, and it goes into his pocket */
      pipi0.hold = true;
      pipi0.pose = (o, a) => { if (a.hold) { o.armF = { a: 2.3, b: 0.4 }; o.face.eye = 'happy'; } };
      pipi0.prop = (g, j, o, a) => { if (a.hold && j.handF) tomato(g, j.handF[0], j.handF[1] - 3, 0.8); };
      A.sfx('join');
      await TALK.say('kid', '이건 내 거!\n제일 빨간 거.');
      pipi0.hold = false;
      await X.wait(0.8);
      /* the bell, far off at the harbour */
      X.toll(0);
      T.announce('항구 쪽에서 종이 운다.');
      await X.wait(1.6);
      await TALK.say('leo', '…종이 우네.\n마중 나가자, 피피.');

      /* ---- the one who steps off the boat: Pipi has been seven all this time, and she has grown old ---- */
      let pipi, pm;
      await quay(() => {
        keep0.splice(keep0.indexOf(pipi0), 1);
        X.actor('leo', { x: 340, style: F.leoAt(3), flip: true, face: { old: true } });
        X.actor('bean', { dog: true, s: 220, x: 410, sit: 1, flip: true, wag: 0.4 });
        pipi = X.actor('kid', { x: 250, style: F.styles.kidA, s: 100, flip: true });
        pm = X.actor('pmom', { style: F.styles.villagerB, s: 128, lean: 0.14, face: { old: true } });
        S.b1 = X.boat({ x: -880, riders: [pm] });
        X.cloudKid({ lamp: true, lampHand: 'F', look: true });
      });
      X.bed(1, 0.13, 'sea');
      X.toll(1); await X.wait(1.2);
      T.announce('부두. 구름바다 안개 속에서 배 한 척이 기다린다. 바다 등불이 꺼져 있다. 등불을 눌러 켠다.');
      await TALK.say('leo', '안개가 짙네.\n등불부터 켜 드리자.');
      const pressed = X.seaLamp();
      X.sail(S.b1, -74, 62);
      await pressed;
      await new Promise((res) => { const iv = () => (S.b1.x >= -74.5 ? res() : X.wait(0.2).then(iv)); iv(); });
      A.sfx('door');
      await X.land(pm, 30);
      X.sail(S.b1, -1500, 34);   /* the boat that brought her goes back into the cloud, empty */
      T.announce('배에서 백발의 할머니가 내린다. 피피가 멀뚱히 올려다본다. 할머니도 피피를 본다.');
      pm.pose = (o) => { o.headTilt = 0.1; o.face.mouth = 'line'; };
      X.cam(150, 540, 1.7, 0.9);   /* closer, for the two of them */
      await X.wait(1.8);
      await TALK.say('pmom', '…피피?', { slow: true });
      await TALK.say('kid', '…엄마?', { slow: true });
      pipi.hug = { k: 0 }; pm.hug = pipi.hug;
      pipi.pose = (o, a) => { T.embrace(o, pipi, pm, pipi.hug.k, true); if (a.give) o.armF = { a: 1.35, b: 0.15 }; };
      pm.pose = (o, a) => { T.embrace(o, pm, pipi, pipi.hug.k); o.lean += 0.2 * pipi.hug.k; if (a.tom) o.armF = { a: 0.9, b: 0.9 }; };
      pipi.armOver = true; pm.z = 1;
      await X.walk(pipi, pm.x + 30, 180);
      pipi.flip = true;
      await X.tween(pipi.hug, 'k', 1, 0.7, T.ease.out);
      A.motif({ voice: 'box', vel: 0.36, beat: 0.7 });
      await X.wait(1.2);
      await TALK.say('pmom', '우리 피피, 여기 있었구나.', { slow: true });
      /* what she could not do down there, and has done now */
      await TALK.say('pmom', '…꼭 다시 안아 준다고 했는데.\n이제 지켰다.');
      await X.tween(pipi.hug, 'k', 0.35, 0.6, T.ease.io);   /* he leans back in her arms to look at her */
      pipi.face = { eye: 'open', mouth: 'open' };
      await TALK.say('kid', '엄마… 할머니 됐네.');
      pm.face = { old: true, eye: 'happy', mouth: 'smile' };
      await TALK.say('pmom', '그러게. 엄마만 이렇게 늙었네.');
      pipi.face = {};
      await X.tween(pipi.hug, 'k', 1, 0.5, T.ease.io);
      await TALK.say('kid', '그래도 엄마 냄새는 그대로야.');
      await X.wait(0.8);
      await TALK.say('kid', '아빠는? 아빠도 잘 있어?');
      await TALK.say('pmom', '응. 잘 지내.\n네 사진, 아직도 지갑에 넣고 다녀.');
      /* the tomato from his pocket */
      await X.tween(pipi.hug, 'k', 0, 0.6, T.ease.io);
      pipi.armOver = false; pipi.keepFlip = true;
      await X.walk(pipi, pm.x + 40, 40);
      pipi.give = true;
      pipi.prop = (g, j, o, a) => { if (a.give && j.handF) tomato(g, j.handF[0], j.handF[1] + 1, 1.2); };
      await TALK.say('kid', '아, 맞다. 엄마, 이거.\n레오 아저씨랑 같이 키운 토마토.');
      T.announce('피피가 주머니에서 빨간 토마토를 꺼내 엄마 손에 쥐여 준다.');
      await X.wait(0.4);
      pipi.give = false; pm.tom = true;
      pm.prop = (g, j, o, a) => { if (a.tom && j.handF) tomato(g, j.handF[0], j.handF[1] - 3, 1.2); };
      A.sfx('star', 0.4);
      await X.wait(0.6);
      await TALK.say('pmom', '…베란다에서 키우던 거, 기억하는구나.');
      await TALK.say('kid', '빨간 거 열리면 준다고 했잖아.');
      await TALK.say('pmom', '…다 컸네, 우리 피피.');
      await TALK.say('pmom', '…고맙습니다.\n우리 애 곁에 있어 주셔서.');
      await TALK.say('leo', '제가 도움을 받았는걸요.');
      await X.wait(1.6);
      X.end();
    },
  });
})();
