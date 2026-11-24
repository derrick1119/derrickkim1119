/* Take Your Time — more pictures for the mirror lake: the people the neighbours left behind.
   Painted in the lake's own frame (900 tall, x centred), like T.vig in views.js. L.lit[id] is what the
   bank has lent the picture so far (0..1); L.beat moves the little story inside it along. */
(function () {
  'use strict';
  const T = window.TYT, P = T.P, F = T.F, K = T.town;
  const V_ = T.vig;
  const FLOOR = 822, TAU = Math.PI * 2;

  /* ---------- a room in the living world ---------- */
  function room(g, o) {
    const W = T.view.W;
    g.fillStyle = o.wall; g.fillRect(-W / 2, 0, W, 900);
    g.fillStyle = T.shade(o.wall, -0.06); g.fillRect(-W / 2, 560, W, FLOOR - 560);
    g.fillStyle = T.shade(o.wall, -0.2); g.fillRect(-W / 2, 554, W, 7);
    g.fillStyle = o.floor; g.fillRect(-W / 2, FLOOR, W, 900 - FLOOR);
    g.strokeStyle = T.shade(o.floor, -0.14); g.lineWidth = 2;
    for (let x = -W / 2; x < W / 2; x += 120) { g.beginPath(); g.moveTo(x, FLOOR); g.lineTo(x - 40, 900); g.stroke(); }
  }
  function windowView(g, w, t, view, lit) {
    const [x, y, ww, hh] = w;
    g.save(); g.beginPath(); g.rect(x, y, ww, hh); g.clip();
    if (view === 'night') {
      const gr = g.createLinearGradient(0, y, 0, y + hh); gr.addColorStop(0, '#1b2440'); gr.addColorStop(1, '#3a4a70');
      g.fillStyle = gr; g.fillRect(x, y, ww, hh);
      const r = T.rng(5); for (let i = 0; i < 14; i++) P.fill(g, P.circle(x + r() * ww, y + r() * hh * 0.7, 1.6 + r() * 1.4), T.rgba('#fff6e0', 0.5 + 0.4 * Math.sin(t * 2 + i)));
      P.fill(g, P.circle(x + ww * 0.72, y + hh * 0.26, 16), '#f6efd8');
    } else if (view === 'sea') {
      const gr = g.createLinearGradient(0, y, 0, y + hh * 0.62); gr.addColorStop(0, '#6f79a8'); gr.addColorStop(1, '#f0b38c');
      g.fillStyle = gr; g.fillRect(x, y, ww, hh);
      const sea = g.createLinearGradient(0, y + hh * 0.62, 0, y + hh); sea.addColorStop(0, '#5a6d94'); sea.addColorStop(1, '#33415f');
      g.fillStyle = sea; g.fillRect(x, y + hh * 0.62, ww, hh * 0.38);
      g.strokeStyle = 'rgba(255,220,180,0.4)'; g.lineWidth = 2;
      for (let i = 0; i < 6; i++) { const yy = y + hh * 0.66 + i * 14, dx = Math.sin(t * 0.8 + i) * 20; g.beginPath(); g.moveTo(x + ww * 0.3 + dx, yy); g.lineTo(x + ww * 0.6 + dx, yy); g.stroke(); }
      /* the headland and its lighthouse, dark until something lends it a light */
      P.fill(g, P.poly([[x, y + hh * 0.62], [x + ww * 0.2, y + hh * 0.52], [x + ww * 0.34, y + hh * 0.62]]), '#2f3a52');
      P.fill(g, P.rr(x + ww * 0.17, y + hh * 0.36, 16, hh * 0.17, 3), '#e9e3d6'); P.fill(g, P.rr(x + ww * 0.165, y + hh * 0.33, 19, 12, 3), '#3f4a62');
      if (lit > 0.01) { const bx = x + ww * 0.17 + 8, by = y + hh * 0.34, sw = Math.sin(t * 0.9) * 0.5; P.glow(g, bx, by, 60, '#ffe6a0', 0.9 * lit); g.save(); g.globalAlpha = 0.35 * lit; g.fillStyle = '#fff0c0'; g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + 260, by - 60 + sw * 80); g.lineTo(bx + 260, by + 10 + sw * 80); g.closePath(); g.fill(); g.restore(); }
    } else {
      const gr = g.createLinearGradient(0, y, 0, y + hh); gr.addColorStop(0, '#f0b98e'); gr.addColorStop(1, '#f6dcb0');
      g.fillStyle = gr; g.fillRect(x, y, ww, hh);
    }
    g.restore();
    g.strokeStyle = '#f3ecdf'; g.lineWidth = 10; g.strokeRect(x, y, ww, hh);
    g.lineWidth = 6; g.beginPath(); g.moveTo(x + ww / 2, y); g.lineTo(x + ww / 2, y + hh); g.moveTo(x, y + hh / 2); g.lineTo(x + ww, y + hh / 2); g.stroke();
    P.fill(g, P.rr(x - 16, y + hh, ww + 32, 12, 4), '#efe6d6');
  }
  /* how dark the room is, and the one warm pool of light in it */
  function evening(g, col, pool, px, py) {
    const W = T.view.W;
    g.save(); g.globalCompositeOperation = 'multiply';
    const gr = g.createRadialGradient(px, py, 30, px, py + 120, 700);
    gr.addColorStop(0, pool); gr.addColorStop(0.4, T.mix(pool, col, 0.6)); gr.addColorStop(1, col);
    g.fillStyle = gr; g.fillRect(-W / 2, 0, W, 900); g.restore();
  }
  const notes = (g, x, y, t, a) => { for (let i = 0; i < 3; i++) { const life = (t * 0.5 + i / 3) % 1; g.save(); g.globalAlpha = a * Math.sin(life * Math.PI); g.translate(x + i * 22 + Math.sin(t * 2 + i) * 8, y - life * 90); P.fill(g, P.ellipse(0, 0, 7, 5.4, -0.3), '#5a4a6a'); P.line(g, 6, 0, 6, -20, 2.4, '#5a4a6a'); g.restore(); } };

  /* Rosa's blanket, in the yarns and the stripes she knits it again with in chapter 4 (ch4_neighbours.js) */
  const YARN = ['#e9c45a', '#c9573f', '#7fb0c9', '#f6efe0'], STRIPES = [2, 0, 3, 1, 0, 2];
  function stripes(g, x, y, w, h, n, r) {
    g.save(); g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); g.clip();
    for (let i = 0; i < n; i++) { g.fillStyle = YARN[STRIPES[i]]; g.fillRect(x, y + (i * h) / n, w, h / n + 0.6); }
    g.strokeStyle = 'rgba(90,60,40,0.22)'; g.lineWidth = 1.2;
    for (let k = 1; k < 7; k++) { g.beginPath(); g.moveTo(x + (k * w) / 7, y); g.lineTo(x + (k * w) / 7, y + h); g.stroke(); }
    g.restore();
  }

  /* ---------- Rosa's son, an old man now, rocking his own grandchild ---------- */
  /* beats: 0 he dozes · 1 the baby cries, he rocks · 2 he hums, and so does she · 3 asleep · 4 the blanket */
  V_.rosa = function (g, t, L) {
    const lit = L.lit || {}, b = L.beat || 0;
    room(g, { wall: '#d6c4a2', floor: '#8a6a52' });
    windowView(g, [-520, 170, 220, 250], t, 'night', 0);
    if (lit.lamp > 0.01) { g.save(); g.globalAlpha = lit.lamp; P.glow(g, -410, 300, 170, '#ffd98a', 0.8); g.restore(); }
    /* her photograph, young, the only face of her he knows */
    g.save(); g.translate(330, 300); g.rotate(0.03);
    P.fill(g, P.rr(-46, -58, 92, 116, 4), '#7a5a3e'); P.fill(g, P.rr(-38, -50, 76, 100, 2), '#e9dcc0');
    F.person(g, { x: 0, y: 30, s: 70, style: F.styles.rosa, noLegs: true, face: { mouth: 'smile', blush: 0.2 } });
    g.restore();
    /* the cradle, and the child in it */
    const rock = b >= 1 && b < 4 ? Math.sin(t * (b === 1 ? 4 : 2.2)) * (b === 1 ? 0.16 : 0.1) : 0;
    g.save(); g.translate(-120, FLOOR - 6); g.rotate(rock);
    g.strokeStyle = '#7a5a3e'; g.lineWidth = 7; g.beginPath(); g.arc(0, -120, 120, Math.PI * 0.32, Math.PI * 0.68); g.stroke();
    P.fill(g, P.rr(-86, -96, 172, 70, 18), '#b98a5a'); P.fill(g, P.rr(-80, -92, 160, 20, 10), '#f6efe0');
    P.fill(g, P.circle(-48, -98, 17), '#f3ccb0'); P.fill(g, P.ellipse(-48, -112, 16, 8), '#3b2a23');
    if (b === 1) { g.strokeStyle = '#7a3438'; g.lineWidth = 2; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(-62, -100, 24 + i * 9 + (t * 30) % 9, Math.PI * 1.1, Math.PI * 1.4); g.stroke(); } }
    else { g.strokeStyle = '#2b2024'; g.lineWidth = 2; g.beginPath(); g.moveTo(-54, -100); g.quadraticCurveTo(-50, -97, -46, -100); g.stroke(); }
    /* the blanket over the child, once he has laid it there */
    const bk = L.cover ? T.ease.io(L.cover.k) : 0;
    if (bk > 0.02) { g.globalAlpha = bk; stripes(g, -84, -86, 146, 62, 6, 10); }   /* spread over the child and down the cradle's side: all six stripes */
    g.restore();
    /* her yarn, where she has left it */
    if (lit.yarn > 0.01) { g.save(); g.globalAlpha = 0.8 * lit.yarn; P.fill(g, P.circle(-36, FLOOR - 18, 20), '#e9c45a'); P.line(g, -44, FLOOR - 40, -20, FLOOR - 6, 3, '#9a8a7a'); P.line(g, -30, FLOOR - 42, -46, FLOOR - 4, 3, '#9a8a7a'); g.restore(); }
    /* the stool she would have sat on */
    P.fill(g, P.rr(-300, FLOOR - 40, 70, 12, 4), '#a57d58'); P.line(g, -292, FLOOR - 28, -296, FLOOR, 5, '#8a6442'); P.line(g, -238, FLOOR - 28, -234, FLOOR, 5, '#8a6442');
    /* him, in the armchair, the old blanket she knitted worn thin across his knees */
    P.fill(g, P.rr(120, FLOOR - 210, 190, 210, 30), '#6f8a7a'); P.fill(g, P.rr(100, FLOOR - 120, 36, 120, 14), '#5f7a6a'); P.fill(g, P.rr(294, FLOOR - 120, 36, 120, 14), '#5f7a6a');
    const st = F.styles.rosaSon, hum = b === 2, look = b >= 3;
    const a = { x: 214, y: FLOOR - 92, s: 330, style: st, flip: true, sit: true, lean: 0.12 + (b === 0 ? 0.08 : 0) + (b === 1 ? 0.2 : 0), headTilt: b === 0 ? 0.4 : look ? -0.06 : 0.16,
      legF: { a: Math.PI / 2 - 0.2, b: Math.PI / 2 - 0.1 }, legB: { a: Math.PI / 2 - 0.3, b: Math.PI / 2 }, face: { eye: b === 0 || hum ? 'closed' : look ? 'happy' : 'open', mouth: hum ? 'open' : look ? 'smile' : 'line', blush: 0.16, old: true }, skip: { armF: true } };
    a.armB = { hand: F.local(a, 190, FLOOR - 90) };
    F.person(g, a);
    if (bk > 0.5) P.fill(g, P.rr(146, FLOOR - 112, 128, 44, 14), '#b9a98e');
    else stripes(g, 146, FLOOR - 112, 128, 44, 4, 14);   /* folded across his knees: the first four stripes show */
    const rx = -36 + rock * 120, ry = FLOOR - 120;
    F.person(g, Object.assign({}, a, { only: 'armF', skip: null, armF: { hand: F.local(a, b >= 1 && b < 4 ? rx : 170, b >= 1 && b < 4 ? ry : FLOOR - 100) } }));
    if (hum) notes(g, 150, 440, t, 1);
    evening(g, '#4d5a82', '#ffe3b4', 120, 520);
  };

  /* ---------- Lily's nursery, the night after Nora came home (chapter 6) ----------
     Night. A low ceiling over a lavender room (the lake fades the top of a picture, so the ceiling is brought well
     down into it); a door on the left with the hall light behind Ana; a window with the moon; the crib on the right,
     a little lamp on the dresser beside it. Lily walks up and down with the baby crying in her arms.
     T.vig.NURSERY.ceiling: the middle of the ceiling over the crib, where the mobile's shadows turn (for
     T.mobile.thing's at). L.lit.mobile: how far its shadows have come into the room. L.beat: 0 walking, Nora crying ·
     1 she stops under the ceiling and looks up (L.stop.k) · 2 Nora laughs (L.lift.k: Lily holds her up a little
     toward it) · 3 Lily lays her in the crib (L.lay.k 0..1) · 4 Nora in the crib, watching it (L.sleep: asleep) */
  const NURSERY = (T.vig.NURSERY = { ceiling: [300, 176], crib: 300, CEIL: 248 });
  V_.nursery = function (g, t, L) {
    const W = T.view.W, lit = (L.lit && L.lit.mobile) || 0, b = L.beat || 0, CEIL = NURSERY.CEIL, CX = NURSERY.crib;
    /* the ceiling, seen a little from below, and the walls */
    const cg = g.createLinearGradient(0, 0, 0, CEIL); cg.addColorStop(0, '#c9c4dc'); cg.addColorStop(1, '#e3def0');
    g.fillStyle = cg; g.fillRect(-W / 2, 0, W, CEIL);
    g.fillStyle = '#d6cde4'; g.fillRect(-W / 2, CEIL, W, FLOOR - CEIL);
    P.fill(g, P.rr(-W / 2, CEIL - 6, W, 12, 0), '#f1ecf6');   /* the cornice */
    /* little stars on the wallpaper */
    const r = T.rng(27);
    for (let i = 0; i < 46; i++) {
      const x = -W / 2 + r() * W, y = CEIL + 30 + r() * 380, rot = r() * 1.2;
      g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = 'rgba(255,248,226,0.55)'; g.beginPath();
      for (let k = 0; k < 10; k++) { const an = (k * Math.PI) / 5, rr = k % 2 ? 2.4 : 6; g.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); }
      g.closePath(); g.fill(); g.restore();
    }
    g.fillStyle = '#c3b8d4'; g.fillRect(-W / 2, 640, W, FLOOR - 640); P.fill(g, P.rr(-W / 2, 636, W, 8, 0), '#efe8f2');   /* the dado */
    g.fillStyle = '#a07a5a'; g.fillRect(-W / 2, FLOOR, W, 900 - FLOOR);
    P.fill(g, P.ellipse(-60, FLOOR + 30, 300, 26), '#e6c7c9');   /* the rug */
    /* the door, open, and the hall light */
    P.fill(g, P.rr(-600, 360, 176, FLOOR - 360, 4), '#f6dcae'); P.glow(g, -512, 600, 230, '#ffd9a0', 0.5);
    P.fill(g, P.rr(-612, 350, 12, FLOOR - 350, 3), '#efe8f2'); P.fill(g, P.rr(-424, 350, 12, FLOOR - 350, 3), '#efe8f2'); P.fill(g, P.rr(-612, 344, 200, 12, 3), '#efe8f2');
    P.fill(g, P.poly([[-424, 360], [-356, 384], [-356, FLOOR + 10], [-424, FLOOR]]), '#e7dccf');   /* the door itself, swung in */
    /* the window: night, the moon */
    windowView(g, [-250, 320, 200, 230], t, 'night', 0);
    /* a dresser and its little lamp */
    P.fill(g, P.rr(500, 650, 170, FLOOR - 650, 6), '#e9dcc6');
    for (let k = 0; k < 2; k++) { P.fill(g, P.rr(512, 666 + k * 74, 146, 62, 4), '#f2e8d6'); P.fill(g, P.circle(585, 697 + k * 74, 4), '#b98a5a'); }
    P.fill(g, P.rr(560, 610, 50, 40, 8), '#f1c48a'); P.fill(g, P.rr(578, 640, 14, 12, 3), '#b98a5a'); P.glow(g, 585, 626, 110, '#ffd08a', 0.75); P.glow(g, 585, 626, 30, '#fff0c8', 0.9);
    /* the crib: its far side first */
    P.fill(g, P.rr(CX - 160, 560, 14, FLOOR - 560, 4), '#f3ede4'); P.fill(g, P.rr(CX + 146, 560, 14, FLOOR - 560, 4), '#f3ede4');
    P.fill(g, P.rr(CX - 152, 582, 304, 10, 4), '#e9e1d6'); P.fill(g, P.rr(CX - 150, 694, 300, 40, 6), '#f6f2fa'); P.fill(g, P.rr(CX - 150, 690, 300, 14, 6), '#dfe6f2');
    /* Ana in the doorway, a hand on the frame */
    const as = F.anaAt(63), look = b >= 2;
    const a = { x: -486, y: FLOOR - F.hipHeight(as, 350), s: 350, style: as, lean: 0.04, headTilt: look ? -0.24 : 0.14, face: { eye: look ? 'happy' : 'open', mouth: look ? 'smile' : 'line', blush: 0.2, old: true } };
    a.armB = { hand: F.local(a, -430, 560) }; a.armF = { a: 0.3, b: 0.5 };
    F.person(g, a);
    /* Lily, walking her up and down; then still, under the ceiling; then by the crib */
    const ls = F.lilyAt(33), stopK = L.stop ? T.ease.io(L.stop.k) : 0, lay = L.lay ? T.clamp(L.lay.k) : 0;
    const ph = t * 0.42, walkX = -110 + Math.sin(ph) * 170, dirW = Math.cos(ph) >= 0 ? 1 : -1;
    const stopX = T.lerp(90, CX - 170, T.ease.io(T.clamp(lay / 0.45)));
    const lx = T.lerp(walkX, stopX, stopK), dir = stopK > 0.5 ? 1 : dirW;
    const bob = stopK < 0.5 ? Math.abs(Math.sin(ph * 6)) * 3 : 0, rock = b === 0 ? Math.sin(t * 3.2) * 0.06 : Math.sin(t * 1.4) * 0.03;
    const bend = T.ease.io(T.clamp((lay - 0.45) / 0.4)) * (lay > 0.9 ? T.clamp((1 - lay) * 10) * 0.6 + 0.4 : 1);
    const lo = { x: lx, y: FLOOR - F.hipHeight(ls, 360) - bob, s: 360, style: ls, flip: dir < 0, lean: 0.06 + 0.34 * bend + (b === 0 ? 0.04 : 0), headTilt: b === 0 ? 0.26 : b <= 2 ? T.lerp(0.2, -0.3, stopK) : 0.3,
      face: { eye: b === 2 ? 'happy' : b === 0 ? 'closed' : 'open', mouth: b === 2 ? 'open' : b === 0 ? 'line' : 'smile', blush: 0.22 + (b === 2 ? 0.1 : 0) }, skip: { armF: true } };
    /* where the baby is: in her arms, lifted a little, then down into the crib */
    const lift = L.lift ? T.ease.io(L.lift.k) : 0, inArms = [lx + dir * 24, lo.y - 58 - lift * 34], inCrib = [CX - 30, 680];
    const dk = T.ease.io(T.clamp((lay - 0.45) / 0.45)), bx = T.lerp(inArms[0], inCrib[0], dk), by = T.lerp(inArms[1], inCrib[1], dk);
    const held = lay < 0.97;
    lo.armB = held ? { hand: F.local(lo, bx - dir * 28, by + 8) } : { hand: F.local(lo, CX - 136, 624) };
    F.person(g, lo);
    const face = b === 0 ? 'cry' : b === 2 ? 'laugh' : b >= 4 && L.sleep ? 'sleep' : 'open';
    F.baby(g, { x: bx, y: by, s: 2, flip: dk > 0.5 ? false : dir > 0, rot: (dir > 0 ? 0.12 : -0.12) * (1 - dk) + rock, face, t, hand: b === 0 || b === 2 ? 1 : 0.3 });
    F.person(g, Object.assign({}, lo, { only: 'armF', skip: null, armF: { hand: held ? F.local(lo, bx + dir * 26, by + 12) : F.local(lo, CX - 112, 622) } }));
    /* the crib's near side, over her */
    P.fill(g, P.rr(CX - 158, 620, 316, 10, 4), '#f6f0e8');
    for (let x = CX - 140; x <= CX + 140; x += 28) P.fill(g, P.rr(x - 3, 628, 6, 116, 3), '#f6f0e8');
    P.fill(g, P.rr(CX - 158, 738, 316, 12, 4), '#efe7dc');
    if (b === 0) for (let i = 0; i < 3; i++) { g.strokeStyle = T.rgba('#7a3a48', 0.35); g.lineWidth = 2; g.beginPath(); g.arc(bx + dir * 6, by - 20, 18 + i * 9 + ((t * 30) % 9), Math.PI * 1.15, Math.PI * 1.45); g.stroke(); }
    /* night: dark at the edges, the lamp and the hall the warm places; warmer overhead once the shadows turn there */
    evening(g, T.mix('#6e7299', '#8a88aa', lit), T.mix('#ffe2b4', '#fff0d0', lit), T.lerp(560, CX, lit * 0.4), T.lerp(620, 420, lit * 0.6));
    if (lit > 0.01) P.glow(g, NURSERY.ceiling[0], NURSERY.ceiling[1], 300, '#ffe6b8', 0.3 * lit);
  };

  /* ---------- Bram's wife, at the window over the sea ---------- */
  /* beats: 0 she watches the sea · 1 she hums and taps the chair arm · 2 dozing, a hand on the sill */
  V_.bramWife = function (g, t, L) {
    const lit = L.lit || {}, b = L.beat || 0;
    room(g, { wall: '#cfd3cc', floor: '#9a8f86' });
    windowView(g, [-470, 150, 560, 330], t, 'sea', lit.lamp || 0);
    /* the boat he carved for her, sixty years on the sill */
    const boat = (x, y, s, c, a) => { g.save(); g.globalAlpha = a; g.translate(x, y); g.scale(s, s); P.fill(g, P.soft([[-34, -10], [34, -10], [42, -14], [34, 4], [-34, 4], [-42, -14]]), c); P.line(g, 0, -10, 0, -54, 2.6, '#6f4a34'); P.fill(g, P.poly([[2, -52], [26, -16], [2, -16]]), '#f3ecdf'); g.restore(); };
    boat(-330, 484, 1.2, '#8a5a3b', 1);
    if (lit.boat > 0.01) { P.glow(g, -150, 470, 60, '#ffe2a8', 0.3 * lit.boat); boat(-150, 484, 1.2, '#b07a4a', 0.85 * lit.boat); }
    /* the visitor's chair beside hers, that nobody sits in */
    P.fill(g, P.rr(96, FLOOR - 150, 100, 14, 5), '#a57d58'); P.line(g, 104, FLOOR - 136, 100, FLOOR, 6, '#8a6442'); P.line(g, 188, FLOOR - 136, 192, FLOOR, 6, '#8a6442'); P.line(g, 186, FLOOR - 150, 196, FLOOR - 280, 7, '#8a6442'); P.line(g, 196, FLOOR - 270, 196, FLOOR - 160, 6, '#8a6442');
    /* her chair */
    P.fill(g, P.rr(240, FLOOR - 200, 150, 200, 24), '#8f6f8a'); P.fill(g, P.rr(220, FLOOR - 110, 30, 110, 12), '#7f5f7a');
    const st = F.styles.bramWife, doze = b >= 2;
    const tap = b === 1 ? Math.max(0, Math.sin(t * 6)) : 0;
    const a = { x: 300, y: FLOOR - 88, s: 300, style: st, flip: true, sit: true, lean: 0.12 + (doze ? 0.1 : 0), headTilt: doze ? 0.36 : -0.08,
      legF: { a: Math.PI / 2 - 0.2, b: Math.PI / 2 - 0.1 }, legB: { a: Math.PI / 2 - 0.3, b: Math.PI / 2 }, face: { eye: doze || b === 1 ? 'closed' : 'open', mouth: b === 1 ? 'open' : 'smile', blush: 0.2, old: true } };
    a.armF = doze ? { hand: F.local(a, 120, 488) } : { hand: F.local(a, 236, FLOOR - 112 - tap * 10) };
    a.armB = { hand: F.local(a, 280, FLOOR - 80) };
    F.person(g, a);
    if (b === 1) notes(g, 250, 470, t, 1);
    evening(g, '#7a7f9e', '#ffe6c4', 0, 360);
  };

  /* ---------- Lily, on the back step, with Bean's collar ---------- */
  /* beats: 0 crying · 1 she whistles, twice · 2 she laughs, wet-eyed, the collar held close ·
     3 her mother comes out and sits down beside her (L.ana.k: the door opens, she comes out, sits, puts an arm
     round her). Above the yard, in the evening sky, two small clouds holding hands (seen in chapter 2) */
  function twinClouds(g, x, y, t, a) {
    if (a < 0.01) return;
    const bob = Math.sin(t * 0.35) * 3, c = '#fff8f2', sh = '#f0d4dc';
    g.save(); g.globalAlpha *= a; g.translate(x, y + bob);
    P.glow(g, 0, -4, 130, '#fff0e6', 0.3);
    /* two small clouds side by side, the same size, the near edge of each running into the other's: holding hands */
    for (const f of [-1, 1]) {
      const cx = f * 34;
      P.fill(g, P.ellipse(cx, 6, 38, 9), sh);
      [[cx - f * 22, -1, 12], [cx - f * 6, -11, 16], [cx + f * 11, -6, 13], [cx + f * 25, 0, 9], [cx, 2, 16]].forEach((q) => P.fill(g, P.circle(q[0], q[1], q[2]), c));
    }
    P.fill(g, P.ellipse(0, 3, 13, 6), c);   /* where the two run into each other */
    g.restore();
  }
  V_.lilyBean = function (g, t, L) {
    const W = T.view.W, lit = L.lit || {}, b = L.beat || 0;
    const ak = b >= 3 && L.ana ? T.clamp(L.ana.k) : 0, seg = (u, a0, a1) => T.smooth(T.clamp((u - a0) / (a1 - a0)));
    const sky = g.createLinearGradient(0, 0, 0, 600); sky.addColorStop(0, '#8d96c6'); sky.addColorStop(1, '#f2c49c');
    g.fillStyle = sky; g.fillRect(-W / 2, 0, W, 900);
    twinClouds(g, -130, 262, t, 0.9);
    /* the fence, the grass, the apple tree that is only a sapling here */
    g.fillStyle = '#c9b089'; for (let x = -W / 2; x < W / 2; x += 46) g.fillRect(x, 470, 30, 170);
    g.fillRect(-W / 2, 510, W, 12); g.fillRect(-W / 2, 590, W, 12);
    g.fillStyle = '#7fa66a'; g.fillRect(-W / 2, 620, W, 300); g.fillStyle = '#8fb67a'; g.fillRect(-W / 2, 620, W, 16);
    K.tree(g, -380, 640, 1.1, '#5f8a5a', '#4f7a4a', '#3f6a3a', Math.sin(t * 0.7));
    /* the house wall, the door (it opens when her mother comes out), the steps, and the porch light */
    const open = seg(ak, 0, 0.22);
    P.fill(g, P.rr(120, 150, W / 2, 690, 0), '#e9dcc3');
    if (open > 0.01) { P.fill(g, P.rr(200, 400, 130, 230, 6), '#f6d7a4'); P.glow(g, 265, 540, 190, '#ffd9a0', 0.55 * open); }
    P.fill(g, P.rr(200, 400, 130 * (1 - 0.78 * open), 230, 6), '#5a8fa0'); P.fill(g, P.circle(200 + 112 * (1 - 0.78 * open), 520, 6), '#e3b64f');
    P.fill(g, P.rr(170, 630, 330, 30, 4), '#bdb1a0'); P.fill(g, P.rr(150, 660, 370, 30, 4), '#ada192');
    P.fill(g, P.rr(370, 360, 26, 36, 6), '#5d5066');
    if (lit.lamp > 0.01) { P.glow(g, 383, 380, 160, '#ffd98a', 0.85 * lit.lamp); P.fill(g, P.rr(373, 368, 20, 22, 5), T.rgba('#fff0b8', lit.lamp)); }
    /* Bean's bowl, still out, and his ball in the grass */
    P.fill(g, P.ellipse(110, 690, 34, 10), '#c9573f'); P.fill(g, P.ellipse(110, 686, 26, 6), '#7a3438');
    if (lit.ball > 0.01) { g.save(); g.globalAlpha = lit.ball; P.fill(g, P.circle(-150, 700, 18), '#e3b64f'); P.line(g, -164, 694, -136, 706, 2, '#c99a2a'); g.restore(); }
    /* Lily */
    const st = F.lilyAt(11, { knit: F.KNIT }), cry = b === 0, wh = b === 1, laugh = b >= 2, held = seg(ak, 0.78, 1);   /* still in her knitted hat from the walk home */
    const a = { x: 250, y: 620, s: 290, style: st, flip: true, sit: true, lean: cry ? 0.36 : 0.08 - 0.12 * held, headTilt: cry ? 0.42 : wh ? -0.12 : 0.06 + 0.06 * held,
      legF: { a: Math.PI / 2 - 0.1, b: Math.PI / 2 - 0.05 }, legB: { a: Math.PI / 2 - 0.2, b: Math.PI / 2 }, face: { eye: cry ? 'closed' : laugh ? 'happy' : 'open', mouth: wh ? 'open' : laugh ? 'smile' : 'line', blush: 0.3 + 0.08 * held, tear: cry || laugh ? 0.8 - 0.3 * held : 0, tearY: (t * 2) % 3 } };
    const collar = [a.x - 40, a.y - 56];
    a.armF = { hand: F.local(a, collar[0] + (wh ? 30 : 0), collar[1] - (wh ? 40 : 0)) }; a.armB = { hand: F.local(a, collar[0] + 8, collar[1] + 8) };
    /* her mother: out of the door, a step to the side, down onto the step beside her, an arm round her shoulders */
    let mo = null;
    if (ak > 0.01) {
      const ms = F.anaAt(41, { bottom: '#8a6f86' }), s = 300, hh = F.hipHeight(ms, s), sit = seg(ak, 0.5, 0.82), mx = T.lerp(300, 338, seg(ak, 0.3, 0.6));
      mo = { x: mx, y: T.lerp(630 - hh, 624, sit), s, style: ms, flip: true, lean: 0.06 + 0.12 * sit, headTilt: 0.16 + 0.08 * held, face: { eye: held > 0.5 ? 'happy' : 'open', mouth: 'smile', blush: 0.22 } };
      const fF = [T.lerp(mx - 4, mx - 96, sit), T.lerp(630, 690, sit)], fB = [T.lerp(mx + 6, mx - 80, sit), T.lerp(630, 688, sit)];
      mo.legF = { foot: F.local(mo, fF[0], fF[1]) }; mo.legB = { foot: F.local(mo, fB[0], fB[1]) };
      mo.armF = held > 0.01 ? { hand: F.local(mo, T.lerp(mx - 40, a.x + 12, held), T.lerp(mo.y - 20, a.y - 66, held)) } : { a: 0.25, b: 0.4 };
      mo.armB = { hand: F.local(mo, T.lerp(mx + 14, 392, sit), T.lerp(mo.y + 30, 624, sit)) };   /* the other hand on the step, on the side away from Lily */
      g.save(); g.globalAlpha = seg(ak, 0.1, 0.34);
      F.person(g, Object.assign({}, mo, held > 0.01 ? { skip: { armF: true } } : null));
      g.restore();
    }
    F.person(g, a);
    if (mo && held > 0.01) F.person(g, Object.assign({}, mo, { only: 'armF', skip: null }));   /* her arm across Lily's back */
    g.strokeStyle = '#c4523f'; g.lineWidth = 6; g.beginPath(); g.ellipse(collar[0] + 4, collar[1] + 4, 20, 12, 0.3, 0, TAU); g.stroke();
    P.fill(g, P.circle(collar[0] + 20, collar[1] + 12, 4), '#e3b64f');
    if (wh) for (let i = 0; i < 2; i++) { const life = (t * 0.9 + i * 0.5) % 1; P.fill(g, P.circle(a.x - 70 - life * 80, a.y - 150 - i * 12, 5 * (1 - life)), T.rgba('#3a3f5c', 1 - life)); }
    evening(g, '#a88f9e', '#fff0d6', 250, 560);
  };
})();
