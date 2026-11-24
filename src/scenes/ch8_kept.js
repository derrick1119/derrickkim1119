/* Chapter 8 「다 지킨 약속」 — years thirty-five to forty-five. (Until the story was split into nine parts this was
   the second half of chapter 6; its first half, the whale, the reddest tomato and Pipi's mother, is in
   ch6_grand.js now.) On the day he died, every year, Ana cooks his stew from his notebook and he takes his pot
   down to the lake to cook it with her; this year her kitchen is dark, and she is walking through the rain to
   Lily's with the makings in a basket. From the bank he lights her way, as he once walked Lily home. At Lily's she
   teaches the grandchildren (the elder is Nora, ten) and puts in what is not in his notebook; the steam of her pot
   comes up out of the water into his, and this time he is the one who learns. Then she looks round at the
   grandchild sitting up on the counter, where she used to sit and watch him cook, and this time she smiles. He
   crosses off the house, the cooking and the swing. Years on Pipi's father comes, who had promised to go and look
   at the stars with him, and is shown the ones Pipi joined up while he waited; the white boat comes, and Leo rings
   the bell for them himself. The smallest one is left on the pier, and he says he will help her look for hers. He
   paints an aurora to practise. */
(function () {
  'use strict';
  const T = window.TYT, P = T.P, F = T.F;
  const TAU = Math.PI * 2;

  /* his notebook, this time */
  function notebook(g, c) {
    const V = T.view;
    if (c.a <= 0.003) return;
    g.save();
    g.fillStyle = T.rgba('#141a2c', 0.55 * c.a); g.fillRect(-V.W / 2, 0, V.W, V.H);
    const k = T.ease.out3(T.clamp(c.a));
    g.translate(0, 450 + (1 - k) * 60 + Math.sin(T.time * 0.8) * 3); g.rotate(-0.02);
    g.globalAlpha = T.clamp(c.a * 2.5);
    g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 44; g.shadowOffsetY = 16;
    P.fill(g, P.rr(-276, -326, 552, 652, 16), '#d7a23c');
    g.shadowColor = 'transparent';
    P.fill(g, P.rr(-276, -326, 46, 652, 16), '#b8862c');
    P.fill(g, P.rr(-246, -310, 508, 620, 6), '#fbf4e2');
    g.strokeStyle = 'rgba(93,125,163,0.22)'; g.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) { const y = -128 + i * 86; g.beginPath(); g.moveTo(-214, y); g.lineTo(232, y); g.stroke(); }
    g.strokeStyle = 'rgba(201,87,63,0.3)'; g.beginPath(); g.moveTo(-190, -300); g.lineTo(-190, 300); g.stroke();
    P.text(g, '아나표 스튜', 14, -216, { size: 78, color: '#b54a36', k: T.clamp(c.w), seed: 3 });
    ['토마토는 넉넉히', '불은 약하게, 오래오래', '처음 보는 풀 한 줌'].forEach((s, i) => P.text(g, s, 14, -146 + i * 86, { size: 56, color: '#33405c', k: T.clamp(c.w - 1 - i), seed: 5 + i }));
    P.text(g, '이번엔 내가 배운다', 14, 222, { size: 62, color: '#3f6f9a', k: T.clamp(c.w - 4), seed: 11 });
    g.restore();
  }

  /* small things carried */
  function pot(g, x, y) {   /* his pot, hanging from his hand by its bail */
    g.strokeStyle = '#4a5560'; g.lineWidth = 1.8; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x - 12, y + 11); g.quadraticCurveTo(x, y - 7, x + 12, y + 11); g.stroke();
    P.fill(g, P.rr(x - 14, y + 9, 28, 19, 6), '#2d6672');
    P.fill(g, P.ellipse(x, y + 10, 14, 3.4), '#357785');
    P.fill(g, P.rr(x - 3, y + 4, 6, 4, 2), '#22515b');
  }
  function tomato(g, x, y, s) {
    s = s || 1;
    P.fill(g, P.circle(x, y, 5 * s), '#d9584a');
    P.fill(g, P.circle(x - 1.6 * s, y - 1.6 * s, 1.5 * s), 'rgba(255,255,255,0.42)');
    P.fill(g, P.poly([[x - 3.4 * s, y - 4 * s], [x, y - 6.6 * s], [x + 3.4 * s, y - 4 * s], [x, y - 3 * s]]), '#5d8a57');
  }

  /* ---------- Lily's kitchen, as the lake shows it ----------
     Smaller than her mother's: sage walls, a window full of rain on the right, a calendar with one day ringed,
     a photograph of a man in a yellow hat and a little girl. Ana at the hob with Lily's red pot, a grandchild on
     a step stool reading his notebook, another sitting up on the counter, Lily laying the table behind them.
     L.beat: 0 stirring · 1 the herb, from the jar she brought (L.herb.k) · 2 a taste (L.sip.k) · 3 laughing.
     L.stir.k blends the ladle between going round in her hand (1) and standing in the pot (0). */
  const COUNTER = 622, FLOORY = 822, PX = -10, PY = 552, AX = -140;
  let kitBg = null, kitGen = -1;
  function kitchenBg(g) {
    const W = T.view.W, x0 = -W / 2 - 20, w = W + 40;
    g.fillStyle = '#bccab0'; g.fillRect(x0, 0, w, COUNTER);
    g.fillStyle = 'rgba(255,252,236,0.17)';
    for (let x = Math.floor(x0 / 46) * 46; x < x0 + w; x += 46) g.fillRect(x, 0, 16, COUNTER);
    const sh = g.createLinearGradient(0, 0, 0, COUNTER);
    sh.addColorStop(0, 'rgba(50,60,44,0.3)'); sh.addColorStop(0.6, 'rgba(50,60,44,0.04)'); sh.addColorStop(1, 'rgba(50,60,44,0)');
    g.fillStyle = sh; g.fillRect(x0, 0, w, COUNTER);
    /* white tiles behind the counter */
    g.fillStyle = '#e9ede6'; g.fillRect(-340, 474, W / 2 + 360, COUNTER - 474);
    g.strokeStyle = 'rgba(140,152,140,0.4)'; g.lineWidth = 1.4; g.beginPath();
    for (let y = 474; y <= COUNTER; y += 37) { g.moveTo(-340, y); g.lineTo(W / 2 + 20, y); }
    for (let y = 474, r = 0; y < COUNTER; y += 37, r++) for (let x = -340 + (r % 2) * 37; x < W / 2 + 20; x += 74) { g.moveTo(x, y); g.lineTo(x, y + 37); }
    g.stroke();
    /* the window, night outside (the rain on it moves, and is drawn each frame) */
    P.fill(g, P.rr(322, 150, 258, 290, 8), '#f4efe4');
    const ns = g.createLinearGradient(0, 164, 0, 426);
    ns.addColorStop(0, '#1d2848'); ns.addColorStop(1, '#3a4876');
    g.fillStyle = ns; g.fillRect(336, 164, 230, 262);
    g.fillStyle = '#263256'; g.fillRect(336, 360, 64, 66); g.fillRect(404, 336, 70, 90); g.fillRect(478, 372, 88, 54);
    g.fillStyle = '#e9c66f'; g.fillRect(420, 352, 9, 12); g.fillRect(500, 386, 9, 12); g.fillRect(352, 378, 9, 12);
    P.fill(g, P.rr(446, 164, 8, 262, 2), '#f4efe4'); P.fill(g, P.rr(336, 290, 230, 8, 2), '#f4efe4');
    P.fill(g, P.rr(312, 432, 278, 14, 4), '#f4efe4');
    P.fill(g, P.poly([[512, 432], [548, 432], [543, 404], [517, 404]]), '#c9805a');
    g.strokeStyle = '#5d8a57'; g.lineWidth = 4; g.lineCap = 'round';
    [[-14, -34], [-3, -44], [8, -38], [16, -28]].forEach((d) => { g.beginPath(); g.moveTo(530, 404); g.quadraticCurveTo(530 + d[0] * 0.3, 404 + d[1] * 0.7, 530 + d[0], 404 + d[1]); g.stroke(); });
    /* the calendar: one day ringed */
    P.fill(g, P.rr(150, 300, 96, 118, 4), '#fbf7ee'); P.fill(g, P.rr(150, 300, 96, 22, 4), '#c9573f');
    g.fillStyle = 'rgba(60,64,90,0.45)';
    for (let r = 0; r < 5; r++) for (let c = 0; c < 7; c++) g.fillRect(157 + c * 12.4, 332 + r * 16, 6, 5);
    g.strokeStyle = '#c9443a'; g.lineWidth = 2.4; g.beginPath(); g.ellipse(157 + 4 * 12.4 + 3, 332 + 2 * 16 + 2.5, 9, 8, -0.2, 0, TAU); g.stroke();
    /* a shelf of bowls and jars */
    P.fill(g, P.rr(-380, 300, 230, 12, 3), '#9a6b43');
    P.fill(g, P.poly([[-360, 300], [-310, 300], [-316, 278], [-354, 278]]), '#7fa5a8'); P.fill(g, P.poly([[-356, 278], [-314, 278], [-318, 262], [-352, 262]]), '#f1e6cf');
    P.fill(g, P.rr(-292, 252, 34, 48, 7), '#e9dcc3'); P.fill(g, P.rr(-294, 245, 38, 9, 3), '#c9573f');
    P.fill(g, P.rr(-240, 268, 26, 32, 6), '#c98a4b'); P.fill(g, P.rr(-242, 262, 30, 8, 3), '#7f5534');
    P.fill(g, P.rr(-200, 276, 30, 24, 8), '#f6f0e0');
    /* the photograph: a man in a yellow hat, and a little girl */
    P.fill(g, P.rr(-596, 206, 96, 118, 4), '#7a5a3e'); P.fill(g, P.rr(-588, 214, 80, 102, 2), '#efe3c6');
    P.fill(g, P.rr(-572, 268, 26, 44, 7), '#eee3d0'); P.fill(g, P.circle(-559, 254, 12), '#e9c0a2'); P.fill(g, P.ellipse(-560, 246, 13, 8), '#d7a23c');
    P.fill(g, P.rr(-534, 286, 16, 26, 5), '#7fb0c9'); P.fill(g, P.circle(-526, 276, 9), '#f3ccb0'); P.fill(g, P.ellipse(-527, 270, 9, 6), '#3b2a23');
    /* the counter: a wooden top over pale cupboards, and the hob */
    g.fillStyle = '#dfe5e2'; g.fillRect(-344, COUNTER + 4, W / 2 + 370, FLOORY - COUNTER - 4);
    for (let x = -340; x < W / 2; x += 124) { P.fill(g, P.rr(x + 6, COUNTER + 18, 112, FLOORY - COUNTER - 34, 4), '#e9eeeb'); P.fill(g, P.rr(x + 96, COUNTER + 50, 6, 26, 3), '#a39a8c'); }
    P.fill(g, P.rr(-350, COUNTER - 12, W / 2 + 380, 18, 4), '#c49a6c');
    P.fill(g, P.rr(PX - 100, COUNTER - 17, 200, 7, 3), '#3d3d48');
    /* the floor */
    g.fillStyle = '#9c7656'; g.fillRect(x0, FLOORY, w, 120);
    g.strokeStyle = 'rgba(60,40,26,0.25)'; g.lineWidth = 2; g.beginPath();
    for (let y = FLOORY + 22; y < 920; y += 26) { g.moveTo(x0, y); g.lineTo(x0 + w, y); }
    g.stroke();
    /* the lamp over the hob */
    P.line(g, PX, 0, PX, 150, 2.5, '#4a4458');
    P.fill(g, P.poly([[PX - 40, 196], [PX + 40, 196], [PX + 24, 150], [PX - 24, 150]]), '#d7a23c');
  }
  const lerp2 = (a, b, k) => [T.lerp(a[0], b[0], k), T.lerp(a[1], b[1], k)];
  function lilyKitchen(g, t, L) {
    const W = T.view.W;
    if (!kitBg || kitGen !== T.gen) { const c0 = P.cray; P.cray = false; kitBg = T.bake(-W / 2 - 20, 0, W + 40, 900, kitchenBg); P.cray = c0; kitGen = T.gen; }
    T.blit(g, kitBg);
    /* rain on the window */
    g.save(); g.beginPath(); g.rect(336, 164, 230, 262); g.clip();
    g.strokeStyle = 'rgba(200,214,236,0.5)'; g.lineWidth = 1.6; g.beginPath();
    for (let i = 0; i < 24; i++) { const x = 336 + ((i * 53 + t * 40) % 230), y = 164 + ((i * 97 + t * 260) % 262); g.moveTo(x, y); g.lineTo(x - 3, y + 16); }
    g.stroke(); g.restore();
    const b = L.beat || 0, hk = L.herb ? L.herb.k : 0, sip = T.ease.io(L.sip.k), joy = b === 3, stirK = L.stir ? L.stir.k : 1;
    const look = L.look ? T.ease.io(L.look.k) : 0, tk = b === 5 && L.tom ? L.tom.k : 0, toms = L.toms || 0;
    const herbed = T.clamp((hk - 0.55) / 0.35) + (L.herbed ? 1 : 0);
    /* Lily, laying the table */
    const ls = F.lilyAt(43);
    const lo = { x: -468, y: FLOORY - F.hipHeight(ls, 368) + (joy ? Math.sin(t * 11) * 1.5 : 0), s: 368, style: ls, lean: 0.08, headTilt: joy ? -0.04 : 0.1,
      face: { eye: joy || look > 0.5 ? 'happy' : 'open', mouth: joy ? 'open' : 'smile', blush: 0.24 } };
    lo.armF = { hand: F.local(lo, -394, 688) }; lo.armB = { hand: F.local(lo, -414, 694) };
    F.person(g, lo);
    P.fill(g, P.rr(-640, 694, 340, 14, 4), '#a8784e');
    P.line(g, -620, 706, -624, FLOORY + 4, 9, '#8a6040'); P.line(g, -322, 706, -318, FLOORY + 4, 9, '#8a6040');
    [-570, -514, -458, -402].forEach((x) => { P.fill(g, P.poly([[x - 17, 678], [x + 17, 678], [x + 11, 694], [x - 11, 694]]), '#f2ead8'); P.fill(g, P.ellipse(x, 678, 16, 3.6), '#e3d9c4'); });
    /* her basket, on the floor by the table, a few green tops still in it */
    P.line(g, -282, 808, -272, 790, 3, '#7fb36c'); P.line(g, -276, 810, -262, 794, 3, '#9fc77e');
    P.fill(g, P.poly([[-306, 806], [-248, 806], [-254, 824], [-300, 824]]), '#b48658');
    g.strokeStyle = '#7a5636'; g.lineWidth = 3; g.beginPath(); g.ellipse(-277, 806, 24, 22, 0, Math.PI, TAU); g.stroke();
    /* the tomatoes she brought, in a bowl on the counter beside her: fewer of them as they go in */
    [[-240, -2], [-222, 0], [-231, -11]].forEach((q, i) => { if (i < 3 - toms) tomato(g, q[0], COUNTER - 22 + q[1], 1.6); });
    P.fill(g, P.poly([[-256, COUNTER - 24], [-206, COUNTER - 24], [-214, COUNTER - 10], [-248, COUNTER - 10]]), '#e9dcc3');
    P.fill(g, P.ellipse(-231, COUNTER - 24, 25, 4), '#d8c8a8');
    /* Lily's pot on the hob, and what is in it */
    P.fill(g, P.rr(PX - 104, PY + 12, 22, 10, 5), '#a8452a'); P.fill(g, P.rr(PX + 82, PY + 12, 22, 10, 5), '#a8452a');
    P.fill(g, P.rr(PX - 84, PY - 4, 168, COUNTER - 17 - PY + 4, 16), '#c9573f');
    P.fill(g, P.ellipse(PX, PY - 2, 84, 13), '#a8452a');
    P.fill(g, P.ellipse(PX, PY - 1, 76, 10), T.mix('#b9532f', '#c8742f', T.clamp(herbed)));
    if (toms > 0) [[-30, 2], [14, -2], [44, 3], [-52, -1]].slice(0, toms * 2).forEach((q) => P.fill(g, P.ellipse(PX + q[0], PY - 1 + q[1], 6, 3.4), '#d9483a'));
    if (herbed > 0.02) { g.save(); g.globalAlpha *= T.clamp(herbed); [[-40, 1], [-18, 4], [6, -2], [28, 3], [48, -1], [-2, 5]].forEach((q) => P.fill(g, P.circle(PX + q[0], PY - 1 + q[1], 3.2), '#6fa35c')); g.restore(); }
    for (let i = 0; i < 4; i++) { const life = (t * 0.2 + i * 0.25) % 1; P.glow(g, PX + Math.sin(t + i * 2) * 14, 520 - life * 170, 20 + life * 34, '#fff3dc', Math.sin(life * Math.PI) * 0.28); }
    /* his notebook, open on the counter beside the pot */
    g.save(); g.translate(118, COUNTER - 16); g.rotate(-0.04);
    P.fill(g, P.rr(-42, -6, 84, 8, 2), '#f6f0e0'); P.fill(g, P.rr(-44, 0, 88, 7, 3), '#d7a23c'); P.fill(g, P.rr(-2, -8, 4, 10, 1), '#b8862c'); P.fill(g, P.rr(20, -6, 5, 16, 1), '#c9573f');
    g.restore();
    /* Ana. The ladle goes round in her hand, never further than her arm reaches; when her hand has other work it stands in the pot.
       At the end (look) she straightens and looks round at the grandchild up on the counter, and smiles */
    const st = F.anaAt(73);
    const a = { x: AX, y: FLOORY - F.hipHeight(st, 356) + (joy ? Math.sin(t * 12) * 2 : 0), s: 356, style: st, lean: T.lerp(0.12, 0.03, look),
      headTilt: T.lerp(b === 1 || b === 5 ? 0.2 : joy ? -0.06 : 0.08, -0.17 + Math.sin(t * 0.9) * 0.015, look),
      face: { eye: joy || look > 0.4 ? 'happy' : 'open', mouth: joy ? 'open' : 'smile', blush: 0.22 + 0.1 * look, old: true }, skip: { armF: true } };
    const round = [PX + Math.cos(t * 1.8) * 30, PY + 2 + Math.sin(t * 1.8) * 5], rest = [PX + 30, PY + 4];
    const tip = lerp2(rest, round, stirK), grip = [tip[0] - 58, tip[1] - 16];
    const JAR = [-80, 556], pocket = [-104, 640];
    /* the jar comes out of her apron pocket in her other hand, and she takes a pinch from it */
    const jarUp = b === 1 ? T.ease.io(T.clamp(hk / 0.18)) * (1 - T.ease.io(T.clamp((hk - 0.9) / 0.1))) : 0;
    let handB = jarUp > 0.02 ? lerp2(pocket, JAR, jarUp) : [-98, COUNTER - 4];
    /* a tomato from the bowl, held over the pot, let go */
    const bowl = [-226, COUNTER - 30], over2 = [-52, 512], rest0 = [-98, COUNTER - 4];
    if (tk > 0) {
      if (tk < 0.16) handB = lerp2(rest0, bowl, T.ease.io(tk / 0.16));
      else if (tk < 0.38) handB = lerp2(bowl, over2, T.ease.io((tk - 0.16) / 0.22));
      else if (tk < 0.62) handB = over2;
      else handB = lerp2(over2, rest0, T.ease.io(T.clamp((tk - 0.62) / 0.3)));
    }
    a.armB = { hand: F.local(a, handB[0], handB[1]) };
    const ja = F.person(g, a);
    if (tk > 0.16 && tk < 0.46 && ja && ja.handB) tomato(g, ja.handB[0] + 4, ja.handB[1] + 2, 1.5);   /* in her hand */
    if (tk >= 0.46 && tk < 0.64) { const u = T.ease.in((tk - 0.46) / 0.18); tomato(g, over2[0] + 4, T.lerp(over2[1] + 2, PY - 2, u), 1.5); }   /* falling */
    if (tk >= 0.62 && tk < 0.86) { const u = (tk - 0.62) / 0.24; g.strokeStyle = T.rgba('#fff1dc', 0.6 * (1 - u)); g.lineWidth = 2; g.beginPath(); g.ellipse(over2[0] + 4, PY - 1, 8 + u * 26, 2 + u * 4, 0, 0, TAU); g.stroke(); }
    P.line(g, tip[0] - 70, tip[1] - 20, tip[0], tip[1], 6, '#b98a5a');
    if (jarUp > 0.02) {
      P.fill(g, P.rr(handB[0] - 12, handB[1] - 26, 24, 30, 6), 'rgba(226,240,236,0.92)');
      P.fill(g, P.rr(handB[0] - 13, handB[1] - 31, 26, 7, 3), '#b98a5a');
      [[-5, -10], [3, -14], [-1, -5], [6, -8]].forEach((q) => P.fill(g, P.ellipse(handB[0] + q[0], handB[1] + q[1], 4, 2.4, q[0] * 0.2), '#6fa35c'));
    }
    let hand = grip, spoon = false;
    const over = [-56, 486];
    if (b === 1) {
      const k = hk, top = [JAR[0] + 2, JAR[1] - 34];
      if (k < 0.18) hand = grip;
      else if (k < 0.34) hand = lerp2(grip, top, T.ease.io((k - 0.18) / 0.16));
      else if (k < 0.5) hand = lerp2(top, over, T.ease.io((k - 0.34) / 0.16));
      else if (k < 0.86) hand = [over[0] + Math.sin(t * 16) * 4, over[1] + Math.abs(Math.sin(t * 16)) * 4];
      else hand = lerp2(over, grip, T.ease.io(T.clamp((k - 0.86) / 0.14)));
      if (k > 0.5 && k < 0.86) for (let i = 0; i < 7; i++) {
        const life = (t * 1.7 + i / 7) % 1, x = hand[0] + 6 + Math.sin(i * 2.3) * 7, y = hand[1] + 12 + life * (PY - hand[1] - 12);
        P.fill(g, P.ellipse(x, y, 2.6, 1.6, i), '#6fa35c');
      }
    } else if ((b === 2 || b === 3) && ja) {
      const m = F.mouth(a), up = [m[0] + 30, m[1] + 14];
      hand = lerp2([PX - 40, PY - 30], up, sip); spoon = true;
    }
    const jf = F.person(g, Object.assign({}, a, { only: 'armF', skip: null, armF: { hand: F.local(a, hand[0], hand[1]) } }));
    if (spoon && jf && jf.handF) { const h = jf.handF; P.line(g, h[0], h[1], h[0] - 24, h[1] - 6, 3.4, '#b98a5a'); P.fill(g, P.ellipse(h[0] - 28, h[1] - 7, 7, 4), '#b98a5a'); }
    /* the grandchildren: Nora (ten, the elder) up on a step stool over the notebook, her little brother sitting on the
       counter (where Ana used to sit) */
    const kb = F.styles.nora, kc = F.styles.kidC;
    P.fill(g, P.rr(112, 722, 84, 14, 4), '#c79a62'); P.line(g, 120, 734, 116, FLOORY, 6, '#a8784e'); P.line(g, 188, 734, 192, FLOORY, 6, '#a8784e'); P.line(g, 118, 780, 190, 780, 5, '#a8784e');
    const k1 = { x: 154, y: 722 - F.hipHeight(kb, 268) - (joy ? Math.abs(Math.sin(t * 6)) * 6 : 0), s: 268, style: kb, flip: true, lean: 0.16, headTilt: b >= 2 ? 0.04 : 0.26,
      face: { eye: joy ? 'happy' : 'open', mouth: joy ? 'open' : 'smile', blush: 0.3 }, skip: { armF: true } };
    k1.armB = { hand: F.local(k1, 132, COUNTER - 10) };
    F.person(g, k1);
    let h1 = [128, COUNTER - 18];
    if (b === 2 || b === 3) { const m = F.mouth(k1); h1 = lerp2(h1, [m[0] - 22, m[1] + 12], sip); }
    if (joy) h1 = [k1.x - 10, k1.y - 96 + Math.sin(t * 8) * 6];
    const j1 = F.person(g, Object.assign({}, k1, { only: 'armF', skip: null, armF: { hand: F.local(k1, h1[0], h1[1]) } }));
    if (b === 2 && j1 && j1.handF) { const h = j1.handF; P.line(g, h[0], h[1], h[0] + 18, h[1] - 4, 2.8, '#b98a5a'); P.fill(g, P.ellipse(h[0] + 21, h[1] - 5, 5, 3), '#b98a5a'); }
    const sw = joy ? 9 : look > 0.3 ? 3.2 : 5;
    F.person(g, { x: 268, y: COUNTER - 24, s: 250, style: kc, flip: true, sit: true, lean: 0.1, headTilt: b === 1 ? 0.2 : T.lerp(0.04, 0.16, look),
      legF: { a: Math.PI / 2 - 0.1, b: Math.PI / 2 - 0.3 + Math.sin(t * sw) * 0.4 }, legB: { a: Math.PI / 2 - 0.2, b: Math.PI / 2 - 0.3 + Math.sin(t * sw + Math.PI) * 0.4 },
      face: { eye: joy || look > 0.5 ? 'happy' : 'open', mouth: joy ? 'open' : 'smile', blush: 0.3 + 0.1 * look }, armF: joy ? { a: 2.3 + Math.sin(t * 8) * 0.25, b: 0.3 } : { a: 0.7, b: 0.9 }, armB: { a: 0.4, b: 0.6 } });
    /* evening: warm under the lamp, cool toward the edges */
    g.save(); g.globalCompositeOperation = 'multiply';
    const gr = g.createRadialGradient(PX, 330, 40, PX, 420, 700);
    gr.addColorStop(0, '#fff6e4'); gr.addColorStop(0.45, '#eedcc2'); gr.addColorStop(1, '#727799');
    g.fillStyle = gr; g.fillRect(-W / 2, 0, W, 900); g.restore();
    P.glow(g, PX, 210, 260, '#ffd98a', 0.32);
    P.glow(g, PX, 194, 46, '#fff2c8', 0.8);
  }
  /* his own pot on the bank beside him, on its three stones: he has brought it, as he does every year on this day */
  const BANKPOT = () => [-T.view.W / 2 + 262, 168];
  function bankPot(g, t, L) {
    const [x, y] = BANKPOT();
    g.save(); g.translate(x, y); g.scale(1.1, 1.1);
    P.glow(g, 0, -2, 30, '#ffb45a', 0.5 + 0.2 * Math.sin(t * 9));
    [-17, 0, 17].forEach((dx, k) => P.fill(g, P.ellipse(dx, 2, 9, 6), k === 1 ? '#6f6a66' : '#807a74'));
    P.fill(g, P.rr(-25, -34, 50, 28, 9), '#2d6672'); P.fill(g, P.ellipse(0, -34, 25, 5.5), L.mine ? '#c8742f' : '#a8452a');
    if (L.mine) [[-12, -34], [-2, -32], [9, -35], [15, -33]].forEach((q) => P.fill(g, P.circle(q[0], q[1], 1.8), '#6fa35c'));
    P.line(g, -29, -27, -25, -27, 4, '#234f58'); P.line(g, 25, -27, 29, -27, 4, '#234f58');
    for (let k = 0; k < 3; k++) { const life = (t * 0.33 + k * 0.33) % 1; P.glow(g, Math.sin(t * 1.3 + k * 2) * 7, -44 - life * 70, 9 + life * 14, '#fff3dc', Math.sin(life * Math.PI) * 0.3); }
    g.restore();
  }
  /* the steam of her pot, coming up out of the water (as it once did in her own kitchen) and drifting over to settle in
     his. L.steam: { k: how far it has come (0..1), a: how much of it there is } */
  function steamOver(g, t, L) {
    const s = L.steam;
    if (!s || s.a <= 0.01 || s.k <= 0.001) return;
    const W = T.view.W, bp = BANKPOT(), p0 = [-7, 560], p1 = [-20, 150], p2 = [-W / 2 + 470, 10], p3 = [bp[0], bp[1] - 40];
    const at = (u) => { const v = 1 - u; return [0, 1].map((i) => v * v * v * p0[i] + 3 * v * v * u * p1[i] + 3 * v * u * u * p2[i] + u * u * u * p3[i]); };
    const n = 34;
    for (let i = 0; i <= n; i++) {
      const u = i / n; if (u > s.k) break;
      const q = at(u), sway = Math.sin(t * 1.7 + i * 0.6) * 9 * Math.sin(u * Math.PI), head = T.clamp((s.k - u) * 6);
      const r = 12 + 20 * Math.sin(u * Math.PI) * (0.8 + 0.2 * Math.sin(t * 2 + i));
      P.glow(g, q[0] + sway, q[1], r * 1.15, '#fff3dc', 0.36 * s.a * head * (0.75 + 0.25 * Math.sin(t * 2.4 + i * 1.3)));
    }
    const hq = at(Math.min(1, s.k));
    P.glow(g, hq[0], hq[1], 26, '#fff6e6', 0.4 * s.a);
  }

  /* the four lanterns strung from the end post to the bell: when he rings, they answer one by one, out to the boat */
  function lineLamp(u) {
    const PY = T.world.C.PIER_Y, A0 = [16, PY - 240], C0 = [218, PY - 186], B0 = [412, PY - 174], v = 1 - u;
    return [v * v * A0[0] + 2 * v * u * C0[0] + u * u * B0[0], v * v * A0[1] + 2 * v * u * C0[1] + u * u * B0[1] + 16];
  }
  function pierLights(g, S) {
    const lit = S.lineLit;
    if (!lit || !lit.some((v) => v > 0.004)) return;
    T.world.layer(g, 1);
    [0.8, 0.6, 0.4, 0.2].forEach((u, i) => {
      const k = lit[i]; if (k <= 0.004) return;
      const q = lineLamp(u);
      P.glow(g, q[0], q[1], 74 + 20 * Math.sin(T.time * 2 + i), '#ffd98a', 0.55 * k);
      P.glow(g, q[0], q[1], 18, '#fff6dc', 0.95 * k);
      g.save(); g.translate(q[0], T.world.C.PIER_Y + 2); g.scale(1, 0.22); P.glow(g, 0, 0, 90, '#ffd98a', 0.35 * k); g.restore();   /* its light on the boards */
    });
    g.restore();
  }

  T.stage('ch8', {
    chapter: 8, title: ['8장', '다 지킨 약속'], end: ['8장 끝', '마지막 장 「마중」'], next: 'ch9', pad: 2, nextColor: '#161d2a',
    plot: { stage: 4, stones: 4, board: true, table: true, tree: 1, swing: 1, swingW: 1, garden: 1, patch: 3, fruit: 1, season: 'spring' },
    flags: { bramGone: true, rosaGone: true },
    build() { T.scenes.kitchen.build(); },
    update(dt, S) { if (S.swinging) S.ps.swingA = Math.sin(T.time * 1.3) * 0.45; },
    onHill(g, h, S) { if (h === 3 && S.ps && S.ps.patch >= 3 && !S.ps.patchHide) T.plot.fence(g); },   /* the five beds and their fence, since chapter 6 */
    after(g, S) { pierLights(g, S); },
    script: async function (X) {
      const W = T.world, C = W.C, PL = T.plot, S = X.S, ps = S.ps, A = X.A, lin = T.ease.lin, PIER = C.PIER_Y;
      const [px, py] = X.place.plot();
      X.cam(px + 60, py, 1); X.camSnap();
      S.swinging = false; S.lineLit = null;
      const leo = X.actor('leo', { x: PL.TABLE_X - 66, style: F.leoAt(3), chair: 1, face: { old: true } });
      const bean = X.actor('bean', { dog: true, s: 220, x: PL.TABLE_X + 118, sit: 1, wag: 0.5, flip: true });
      const tableY = () => W.y3(PL.TABLE_X) - 66;
      leo.pose = (o, a, t) => {
        if (a.onSwing) { PL.sitOnSwing(o, ps, -1); o.face.eye = 'happy'; o.headTilt = -0.16; return; }
        if (!a.chair) return;
        o.lean = 0.12; o.armF = { hand: F.local(o, PL.TABLE_X - 16, tableY()), bend: -1 }; o.armB = { hand: F.local(o, PL.TABLE_X - 28, tableY() + 6) };
      };
      const keep0 = S.actors;
      /* the quay, for the ones who come and the ones who go on */
      const quay = (more) => X.dip(async () => {
        ps.food.show = false; leo.chair = 0;
        S.actors = []; S.boats = [];
        const [qx, qy] = X.place.quay(); X.cam(qx, qy, 1.05); X.camSnap();
        more();
      });
      /* and back up the hill; fn puts everyone where they are wanted */
      const home = (fn) => X.dip(async () => { S.actors = keep0; S.boats = []; ps.night = 0; S.lineLit = null; X.cam(px + 60, py, 1); if (fn) fn(); X.camSnap(); }, { out: 1, in: 1.2 });
      const atTable = () => { leo.x = PL.TABLE_X - 66; leo.chair = 1; leo.flip = false; leo.prop = null; bean.x = PL.TABLE_X + 118; bean.flip = true; bean.sit = 1; };
      const potProp = (g, j) => { if (j && j.handF) pot(g, j.handF[0], j.handF[1]); };
      const TALK = X.TALK;
      X.title();
      await X.wait(4.4);
      X.bed(4, 0.13, 'home');

      /* ---- his day. Every year she makes his stew from his notebook, and he takes his pot to the lake and makes it with her ---- */
      await X.years(35, 37, { age: 73, season: 'late autumn' });   /* the day he went */
      T.announce('레오의 기일. 해마다 이날이면 아나는 레오의 공책을 펴 놓고 스튜를 끓이고, 레오는 냄비를 들고 호수에 내려가 같이 끓인다.');
      await TALK.say('leo', '오늘이네, 빈.\n해마다 아나랑 같이 끓이는 날.');
      leo.chair = 0; leo.prop = potProp;
      A.sfx('knock', 0.3);
      X.walk(bean, C.PLOT + 330, 90);
      await X.walk(leo, C.PLOT + 380, 84);
      await X.wait(0.6);
      /* her kitchen is dark this year: she is out in the rain with a basket, on her way to Lily's. From the bank he
         lights her way, the way he once walked Lily home from school. 겹치기: two things make one shadow (a light and
         a cloud where it is dark and raining at once), and where the rain is heaviest a cloud alone will not do: the
         plank stood up under it, and their one shadow is an umbrella that goes along over her */
      const way = T.lakeHelp({
        level: 3, len: 3000, who: { style: F.anaAt(73), s: 150 }, name: '아나', home: F.lilyAt(43), homeS: 160, carry: 'basket', arrive: '아나가 릴리네 집에 왔어요',
        from: 'house', steady: true, say: { lantern: '길이 깜깜해요. 등불을 그 위로 옮겨 주세요' },
        leoAge: 3, friend: { style: F.styles.cloud, beside: false },
        helpers: [{ kind: 'lantern', x: 210 }, { kind: 'plank', x: 340 }, { kind: 'cloud', x: 470 }],
        obstacles: [{ x: 680, need: 'lantern' }, { x: 1160, need: 'plank' }, { x: 1680, need: ['lantern', 'cloud'] }, { x: 2320, need: 'umbrella', w: 400 }],
      });
      await X.view(way, { color: '#1b2a40' });
      X.age('아나, 73');
      T.announce('거울 호수. 올해는 아나의 부엌이 불이 꺼져 있다. 대신 비 오는 저녁 길이 비친다. 장바구니를 든 아나가 우산도 없이 릴리네 집으로 걷는다.');
      await TALK.say('leo', '장바구니에 토마토가 한가득이네.\n…올해는 릴리네서 끓이려나 봐.');
      await TALK.say('leo', '…또 우산 없이 나갔구나.');
      await way.done();
      await X.wait(0.6);
      await TALK.say('lily', '엄마! 이 비에 우산도 없이….');
      await TALK.say('ana', '나올 땐 안 왔어.\n…그런데 오는 길이 하나도 안 무섭더라.');
      await TALK.say('lily', '아빠가 같이 걸어 줬나 보네.');
      await TALK.say('ana', '…그랬나 보다.', { slow: true });
      await X.wait(1);

      /* ---- the same evening, at Lily's: she teaches the grandchildren, and puts in what is not in his notebook ---- */
      const kit = T.lake({ paint: lilyKitchen, leo: F.leoAt(3), leoFace: { old: true }, kid: F.styles.cloud, herb: { k: 0 }, stir: { k: 1 }, tom: { k: 0 }, look: { k: 0 }, steam: { k: 0, a: 0 }, toms: 0, mine: false });
      const kd0 = kit.draw;
      kit.draw = function (g, t) { kd0(g, t); P.cray = P.look === 'crayon'; if (P.cray) P.crayonize(g); try { bankPot(g, t, kit); } finally { P.cray = false; } steamOver(g, t, kit); };
      await X.view(kit, { color: '#1b2a40', out: 0.9, in: 1.1 });
      A.rain(0.3, { window: true });   /* the rain on Lily's window, heard from inside */
      T.announce('거울 호수. 그날 저녁, 릴리네 부엌. 아나가 레오의 공책을 펴 놓고 손주들에게 스튜 끓이는 법을 가르친다. 한 손주는 조리대에 걸터앉아 있다. 물가에서 레오도 제 냄비를 올려 두고 본다.');
      await X.wait(2.4);
      await TALK.say('leo', '토마토 넷, 약한 불에 오래오래.\n…내 공책 그대로네.');
      await X.wait(0.4);
      /* and then not quite: two more tomatoes go in */
      kit.beat = 5;
      await X.tween(kit.stir, 'k', 0, 0.4, T.ease.io);
      for (let i = 0; i < 2; i++) {
        kit.tom.k = 0;
        X.wait(1.0).then(() => A.sfx('bubble', 0.3 + i * 0.3));
        await X.tween(kit.tom, 'k', 1, 1.9, lin);
        kit.toms = i + 1;
      }
      kit.beat = 0; kit.tom.k = 0;
      X.tween(kit.stir, 'k', 1, 0.5, T.ease.io);
      await TALK.say('ana', '토마토는 넉넉히\n넣어야 맛있어.');
      await X.wait(0.4);
      kit.beat = 1;
      await X.tween(kit.stir, 'k', 0, 0.5, T.ease.io);
      T.announce('아나가 앞치마 주머니에서 작은 병을 꺼내, 초록 풀을 한 줌 넣는다.');
      A.sfx('step');
      await X.tween(kit.herb, 'k', 1, 4.2, lin);
      kit.herbed = true; kit.beat = 0;
      X.tween(kit.stir, 'k', 1, 0.6, T.ease.io);
      A.fragment(6);
      await TALK.say('leo', '…어? 그건 공책에 없는데.');
      await TALK.say('ana', '이건 할아버지 공책엔 없어.\n할머니가 찾아낸 거야.');
      await TALK.say('leo', '…혼자 끓이면서 찾았구나.');
      await TALK.say('leo', '가르쳐 줘, 아나.', { slow: true });
      /* the water answers: the steam of her pot comes up out of it, and over, and into his */
      T.announce('물속 부엌에서 스튜 김 한 줄기가 물 위로 피어올라, 물가에 놓인 레오의 냄비로 내려앉는다.');
      kit.steam.a = 1;
      A.sfx('sparkle');
      await X.tween(kit.steam, 'k', 1, 3.6, T.ease.io);
      kit.mine = true; A.sfx('bubble', 0.6); X.notes(3, { voice: 'glass', vel: 0.3 });
      X.tween(kit.steam, 'a', 0, 1.4);
      await X.wait(1.2);
      await X.card(notebook, {
        max: 18,
        run: async (c) => {
          T.announce('레오의 공책. 아나표 스튜. 토마토는 넉넉히. 불은 약하게, 오래오래. 처음 보는 풀 한 줌. 이번엔 내가 배운다.');
          for (let i = 0; i < 5; i++) { if (i === 4) await X.wait(0.8); A.sfx('crayon'); await X.tween(c, 'w', i + 1, i === 4 ? 1.5 : 0.9, lin); X.note(); await X.wait(0.2); }
        },
      });
      /* a taste, on both sides of the water */
      kit.beat = 2;
      await X.tween(kit.stir, 'k', 0, 0.4, T.ease.io);
      T.announce('호수 속에서 아나와 손주가 한 숟갈씩 맛을 본다. 물가에서 레오도 제 냄비의 스튜를 맛본다.');
      await X.tween(kit.sip, 'k', 1, 1.1);
      kit.leoFace = { eye: 'closed', mouth: 'smile', old: true };
      await X.wait(1.2);
      kit.beat = 3; kit.leoFace = { eye: 'happy', mouth: 'open', old: true };
      X.tween(kit.sip, 'k', 0, 0.8);
      X.notes(3, { voice: 'pluck', vel: 0.34 });
      await X.wait(1.6);
      await TALK.say('leo', '…이게 당신 맛이구나.');
      await X.wait(0.6);
      /* the laughing dies down, and she looks round at the grandchild up on the counter: where she used to sit and
         watch him cook, and the place she looked at, the first year, and stopped smiling */
      kit.beat = 4; kit.leoFace = { mouth: 'line', old: true };
      X.vcam(130, 590, 1.45, 3.2);
      await X.tween(kit.look, 'k', 1, 1.8, T.ease.io);
      T.announce('아나가 조리대에 걸터앉은 손주를 돌아본다. 이번에는 웃는다.');
      X.notes(3, { voice: 'felt', vel: 0.32 });
      await X.wait(2.2);
      kit.leoFace = { eye: 'happy', mouth: 'smile', old: true, well: 0.7 };
      await TALK.say('leo', '…이번엔 웃네.', { slow: true });
      await X.wait(2.4);
      A.rain(null);
      leo.prop = null; leo.x = PL.BOARD_X + 160; leo.flip = true; bean.x = PL.BOARD_X + 230; bean.flip = true; bean.sit = 1;
      X.cam(px - 40, py, 1); X.camSnap();
      await X.view(null, { color: '#1b2a40', out: 1.4 });

      /* ---- the list ---- */
      const board = () => [PL.BOARD_X, W.y3(PL.BOARD_X) - 74, 44];
      await X.tap(board);
      await X.walk(leo, PL.BOARD_X + 34, 84);
      leo.flip = true;
      const crossOff = async (c, i) => { c.ready = true; await X.any(); c.ready = false; A.sfx('crayon'); await X.tween(c.cross, i, 1, 0.7, lin); ps.cross[i] = 1; X.note(); await X.wait(0.35); };
      await X.card(PL.boardCard, {
        init: { w: 5, cross: [0, 0, 0, 0, 0] }, max: 12,
        run: async (c) => {
          T.announce('약속 목록. 마당 있는 넓은 집, 평생 밥해주기, 릴리의 그네에 줄을 긋는다.');
          await X.wait(0.6);
          await crossOff(c, 0); await crossOff(c, 1); await crossOff(c, 3);
        },
      });
      await TALK.say('leo', '다 해 놨어.\n…그러니까 천천히 와.', { slow: true });
      await X.wait(0.8);

      /* ---- years on: Pipi's father, and then nobody is left for them to wait for ---- */
      await X.years(37, 43, { age: 79, season: 'winter' });
      let pipi2, pm2, pd, qleo2, cloud;
      X.toll(0);
      await quay(() => {
        cloud = X.cloudKid({ x: 548, chair: 0, lamp: true, lampHand: 'F', look: true });
        qleo2 = X.actor('leo', { x: 420, style: F.leoAt(3), flip: true, face: { old: true } });
        X.actor('bean', { dog: true, s: 220, x: 480, sit: 1, flip: true, wag: 0.4 });
        pm2 = X.actor('pmom', { x: 330, style: F.styles.villagerB, s: 128, lean: 0.14, flip: true, face: { old: true } });
        pipi2 = X.actor('kid', { x: 240, style: F.styles.kidA, s: 100, flip: true });
        pd = X.actor('pdad', { style: Object.assign({}, F.styles.villagerA, { top: '#6f8fa8' }), s: 140, lean: 0.16, face: { old: true } });
        S.b1 = X.boat({ x: -880, riders: [pd] });
      });
      X.bed(1, 0.13, 'sea');
      X.toll(1); await X.wait(1);
      await TALK.say('kid', '이번엔 내가 켤래.\n아저씨가 가르쳐 준 대로.');
      T.announce('피피가 혼자 바다 등불을 켠다. 배 한 척이 들어온다.');
      A.sfx('star', 0.3); await X.wait(0.4); A.sfx('star', 0.6); await X.wait(0.4); A.sfx('star', 0.9);
      await X.sail(S.b1, -74, 70);
      A.sfx('door');
      await X.land(pd, 30);
      X.sail(S.b1, -1500, 34);   /* the boat that brought him goes back into the cloud, empty */
      T.announce('배에서 허리가 굽은 할아버지가 내린다. 할아버지가 피피를 보고 멈춰 선다.');
      await X.wait(1.4);
      await TALK.say('pdad', '…피피야?', { slow: true });
      await TALK.say('kid', '…아빠?', { slow: true });
      pipi2.hug = { k: 0 }; pd.hug = pipi2.hug;
      pipi2.pose = (o) => T.embrace(o, pipi2, pd, pipi2.hug.k, true);
      pd.pose = (o) => { T.embrace(o, pd, pipi2, pipi2.hug.k); o.lean += 0.24 * pipi2.hug.k; };
      pipi2.armOver = true; pd.z = 1;
      await X.walk(pipi2, pd.x + 30, 180);
      pipi2.flip = true;
      await X.tween(pipi2.hug, 'k', 1, 0.7, T.ease.out);
      X.notes(3, { voice: 'felt', vel: 0.28 });   /* quieter than the call his mother got: the run of these is long enough */
      /* what he had promised, and not done in time */
      await TALK.say('pdad', '같이 별 보러 가자고 해 놓고…\n아빠가 너무 늦었지.', { slow: true });
      await TALK.say('kid', '아니. 천천히 와서 좋았어.\n엄마가 아빠 얘기 다 해 줬어.');
      await TALK.say('pdad', '…지갑 속 사진이랑 똑같네.');
      await X.walk(pm2, pd.x + 70, 60);
      await TALK.say('pmom', '…여보.\n이제 다 모였네.');
      await TALK.say('kid', '아빠, 밤 되면 보여 줄 거 있어.\n기다리면서 만든 별자리.');
      await X.wait(0.6);
      pipi2.pose = null; pd.pose = null; pipi2.hug = null; pipi2.armOver = false;
      /* his promise to his father, and his father's to him: the stars he joined up while he waited, looked at together */
      await X.dip(async () => { ps.night = 0.9; }, { color: '#141b36', out: 1, in: 0.6 });
      T.announce('그날 밤, 부두. 피피가 아빠에게 기다리면서 만든 별자리를 하나씩 짚어 보인다.');
      await X.play(T.puzzle.stars({ rounds: [
        { name: '토마토', pts: [[0, -46], [44, -20], [44, 26], [0, 50], [-44, 26], [-44, -20], [0, -84]], edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [0, 6]], at: [160, 320], scale: 1.25, filler: 14 },
        { name: '별똥별', pts: [[0, -50], [48, -16], [29, 40], [-29, 40], [-48, -16], [-118, -58], [-176, -92]], edges: [[0, 2], [2, 4], [4, 1], [1, 3], [3, 0], [4, 5], [5, 6]], at: [-120, 330], scale: 1.2, rot: -0.2, filler: 20 },
      ] }));
      await TALK.say('pdad', '…이걸 다 우리 피피가?');
      await TALK.say('kid', '응. 아빠 보여 주기로 했잖아.');
      await X.wait(0.8);

      /* ---- the white boat. The music goes quiet while it comes in; its own small light is the brightest thing there ---- */
      X.walk(pipi2, qleo2.x - 46, 120);
      S.b2 = X.boat({ x: -720, hull: '#e9e2d6', lamp: false, riders: [] });
      T.announce('등불 없는 하얀 배 한 척이 구름 속에서 부두로 미끄러져 온다.');
      X.hush(4);
      X.cam(60, 500, 1.15, 0.5);
      await X.sail(S.b2, -74, 66);
      await X.wait(0.6);
      /* the two of them: he goes down on one knee to be the height of the boy */
      pipi2.flip = false;
      X.cam((pipi2.x + qleo2.x) / 2, PIER - 84, 1.9, 0.8);
      await X.gesture(qleo2, 'kneel', { with: pipi2, hold: true, in: 1.4, out: 1.2 });
      await TALK.say('kid', '하얀 배 왔다.\n…우리 이제 가야 돼.', { slow: true });
      pipi2.pose = (o) => { o.headTilt = (o.headTilt || 0) + 0.3; };   /* he asks it looking at his feet */
      await TALK.say('kid', '같이 기다리자고 했는데….\n나 먼저 가도 돼?', { slow: true });
      pipi2.pose = null;
      X.gesture(qleo2, 'hand-on-head', { with: pipi2, hold: true, in: 0.9, out: 0.8 });
      await X.wait(0.6);
      await TALK.say('leo', '그럼. 그동안 하나도 안 심심했어.\n다 지킨 거야.');
      X.ungesture(qleo2, 'hand-on-head');
      await TALK.say('kid', '아저씨는 혼자서도 기다릴 수 있어?');
      await TALK.say('leo', '빈도 있고, 구름이도 있어.\n아나는… 늦게 올수록 좋고.');
      X.gesture(pipi2, 'laugh', { dur: 2.2, hand: 'mouth' });   /* a giggle, in spite of everything */
      await X.wait(1.4);
      await TALK.say('kid', '아나 아줌마 오면, 내 얘기 해 줘.\n토마토 같이 키운 거.');
      await TALK.say('leo', '응. 제일 먼저 할게.');
      pipi2.z = 1;
      await X.gesture(pipi2, 'hug', { with: qleo2, dur: 3.4, in: 0.8, out: 0.9 });
      X.ungesture(qleo2, 'kneel');
      await X.wait(0.6);
      /* the three of them step down into it, and turn round in it to face the quay */
      X.cam(150, 480, 1.1, 0.6);
      for (const [a, seat, v] of [[pd, -40, 62], [pm2, -14, 62], [pipi2, 12, 84]]) { await X.walk(a, 24, v); await X.board(a, S.b2, seat); a.flip = true; }
      [pd, pm2, pipi2].forEach((a) => { a.flip = false; });
      await X.wait(0.6);
      await TALK.say('kid', '아저씨, 종 쳐 줘.\n이번엔 아저씨가 물어봐.');
      /* he rings the bell himself, the four notes of the call; at each one a lantern on the line answers, out
         toward the boat, and Pipi puts his hand up. Nothing else is heard */
      X.hush();
      qleo2.ring = { k: 0 };
      pipi2.raise = { k: 0 };
      pipi2.pose = (o, a) => { const r = T.ease.out(a.raise.k); if (r > 0.01) o.armF = { a: T.lerp(0.6, 2.75, r), b: T.lerp(0.6, 0.15, r) }; o.face.eye = 'happy'; };
      await X.walk(qleo2, 396, 50);
      qleo2.flip = false;
      qleo2.pose = (o, a) => { const r = a.ring.k; o.headTilt = -0.2; o.armF = { hand: F.local(o, 410 + r * 10, PIER - 106 - r * 8) }; };
      X.cam(170, 478, 1.12, 0.6);
      S.lineLit = [0, 0, 0, 0];
      T.announce('레오가 종을 친다. 「천천히 와」의 네 음. 한 번 칠 때마다 부두의 등불이 하나씩, 배 쪽으로 켜진다.');
      for (let i = 0; i < 4; i++) {
        await X.tap(() => [420, PIER - 118, 44]);
        qleo2.ring.k = 1; X.tween(qleo2.ring, 'k', 0, 0.6, T.ease.out);
        X.toll(i, 0.5);
        X.wait(0.35).then(() => X.tween(S.lineLit, i, 1, 0.8, T.ease.out));
        X.wait(0.5).then(() => { pipi2.raise.k = 0; return X.tween(pipi2.raise, 'k', 1, 0.4).then(() => X.wait(0.5)).then(() => X.tween(pipi2.raise, 'k', 0, 0.7)); });
        await X.wait(1.0);
      }
      await X.wait(1.6);
      /* goodbye: he comes out from under the bell to the edge of the boards; they wave from the boat, and Pipi waves
         till the very end */
      qleo2.pose = () => {};
      await X.walk(qleo2, 346, 46);
      qleo2.flip = true;
      pipi2.pose = (o) => { o.face.eye = 'happy'; };
      X.gesture(pipi2, 'wave', { style: 'goodbye', hold: true, in: 0.4 });
      X.gesture(pd, 'wave', { style: 'soft', hold: true, in: 0.8 });
      X.gesture(pm2, 'wave', { style: 'slow', hold: true, in: 0.8 });
      X.gesture(qleo2, 'wave', { style: 'slow', hold: true, in: 0.8 });
      await X.wait(0.8);
      await TALK.say('leo', '잘 가, 피피.\n토마토는 내가 키울게.', { slow: true });
      A.score('farewell');
      X.sail(S.b2, -1500, 34);
      T.announce('하얀 배가 구름바다 너머로 멀어진다. 피피가 끝까지 손을 흔든다.');
      X.cam(-260, 452, 1, 0.4);
      await X.wait(3);
      T.announce('밤바다 위에서 피피네 셋의 배가 빛으로 물든다. 배가 구름을 떠나고, 셋은 하나의 빛이 되어 하늘로 오른다.');
      await X.crossing([{ style: Object.assign({}, F.styles.villagerA, { top: '#6f8fa8' }), s: 140 }, { style: F.styles.villagerB, s: 128 }, { style: F.styles.kidA, s: 100 }], {
        leoAge: 3, color: '#141b36', also: X.seeOff(),
        /* as it lets go of the cloud, the lullaby, out to the star; the star is a fall of chimes */
        say: async () => { A.theme({ voice: 'box', vel: 0.3, beat: 0.8 }); X.wait(3.6).then(() => A.sfx('shoot')); },
      });
      [pd, pm2, pipi2].forEach((a) => T.gesture.clear(a));
      X.ungesture(qleo2, 'wave');
      qleo2.pose = null;
      X.bed(2, 0.11, 'sea');
      [0, 1, 2, 3].forEach((i) => X.tween(S.lineLit, i, 0, 4 + i * 0.6));
      X.cam(...X.place.quay(), 1.05, 0.5);
      await X.wait(1.4);
      await TALK.say('leo', '…이제 피피네도 갔네, 빈.', { slow: true });
      A.sfx('bark');
      await X.wait(1.2);
      /* and the smallest one is still at the end of the quay, her lamp put out, looking at the sea */
      cloud.lamp = false; cloud.look = false;
      X.cam(470, 500, 1.4, 0.8);
      await X.wait(1.2);
      await TALK.say('cloud', '다들 약속 지키고 가는데,\n나는 아직도 몰라.');
      const qbean = S.actors.find((a) => a.id === 'bean');
      if (qbean) { qbean.sit = 0; X.walk(qbean, 372, 70).then(() => { qbean.flip = false; qbean.sit = 1; }); }
      await X.walk(qleo2, cloud.x - 44, 50);
      qleo2.flip = false;
      await X.gesture(qleo2, 'kneel', { with: cloud, hold: true, in: 1.4 });
      await TALK.say('leo', '그럼 나랑 같이 찾아보자.\n심심하지 않게.');
      cloud.look = true;
      cloud.face = { eye: 'happy', mouth: 'smile' };
      A.note({ m: 76, vel: 0.2, voice: 'glass', dur: 2.4 });   /* the lullaby has only just finished: one small note */
      await X.wait(2.4);
      A.score(null);

      /* ---- two years on: the one that needs a night sky ---- */
      await home(() => { atTable(); leo.chair = 0; leo.x = PL.TREE_X - 30; leo.flip = false; ps.night = 1; bean.x = PL.BOARD_X - 70; bean.flip = false; bean.sit = 1; ps.spot = [PL.TREE_X - 30]; X.cam(px + 150, py + 44, 1.25); });
      X.bed(5, 0.14, 'night');
      await X.years(43, 45, { age: 81, season: 'autumn' });
      leo.pose2 = 1;
      const look = leo.pose;
      leo.pose = (o, a, t) => { if (a.onSwing) return look(o, a, t); o.headTilt = -0.3; if (S.paintG) o.armF = { a: 2.5 + Math.sin(t * 2.2) * 0.3, b: 0.2 }; };
      T.announce('밤. 언덕 위 하늘에 손가락으로 오로라를 건다.');
      await X.wait(1.2);
      await X.paint({ goal: 2600 });
      A.promise();
      await TALK.say('leo', '당신 오면, 같이 보자.');
      A.motif({ voice: 'felt', vel: 0.36, beat: 0.82 });
      await X.wait(2.2);
      /* he keeps the other half of the swing free */
      await X.walk(leo, PL.TREE_X + 70, 60);
      leo.onSwing = true; leo.hill = 3; leo.x = PL.swingSeat(ps)[0] - 16; ps.spot = [leo.x];
      S.swinging = true;
      await X.wait(4.2);
      X.end();
    },
  });
})();
