/* Chapter 7 「아직은」 — years thirty to thirty-five: the year Ana is ill.
   Spring, the thirty-second year: Pipi's mother, here since the thirtieth, shows Pipi how the side shoots come off a
   tomato, and Leo, who has let them grow every year, promises to do it next year. Late autumn: a small light falls into
   the sea by the pier at night, a wish made on a shooting star (chapter 2's rule), and in it, as in the wish grove
   (chapter 3), the one who wished: Lily and Nora, five, at a hospital window at night with a bed behind them. It is
   his; he keeps it. At dawn the bell, and for the first time the bell frightens him: the lantern shakes in his hand,
   the bell's question is answered as it always is (chapter 1), and the boat comes slowly out of the fog with someone
   in it he cannot make out. It is the baker's husband. Leo tells him what his mother once told Leo on this quay.
   That day on the hill he decides to go to her by dream, and the makings are all from before: the sound is Nora's
   laugh (kept in chapter 6), the light is the one Lily sent, and the scent is Bean's, which Pipi tries to catch in a
   jar while Bean wriggles. That night, the chapter's one lake: the hospital room of the prologue the other way round,
   Ana in the bed. He hangs the star mobile at the water's edge again (chapter 6's rule, no new one) so that its
   shadows turn on the hospital ceiling, and lays the light on the water; it sinks to her window. Her dream: the hill
   where the two of them once drew an aurora with their fingers, Bean beside them; she is as she is now, sixty-nine
   and tired, and he says 「아직은」. No puzzle and nothing on the screen there. The morning in the hospital room. On
   the hill the next morning the baker and his wife bring up the first loaf they have baked together, half of it
   burnt. Two years on, at dusk, he sits on one half of the swing he widened for two.

   The pieces it has from chapter 6: T.mobile (mobile.js), Nora's laugh in T.state.dream.sound, F.styles.nora and
   F.styles.baker. Its own: the hospital room again (T.vig.ward in pictures.js), the picture in the wish light, Ana's
   dream (a view), the morning after it (a view), a lantern held up by a hand that will not keep still (a gesture). */
(function () {
  'use strict';
  const T = window.TYT, P = T.P, F = T.F, K = T.town;
  const TAU = Math.PI * 2;
  const hash = (i, k) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };

  /* ---------- a lantern held up for a boat, and the hand will not keep still ----------
     The lamp arm out in front, shaking with a tremor that never quite repeats; the shoulders up and held, the breath
     held with them; the eyes on the fog. Laid over whatever pose the actor has (the stage plays it). */
  if (T.gesture && !T.gesture.defs['ch7-dread']) {
    T.gesture.def('ch7-dread', {
      in: 1.4, out: 1.6, dur: Infinity,
      pose(o, k, t) {
        const tr = (Math.sin(t * 29) * 0.5 + Math.sin(t * 41 + 1.3) * 0.32 + Math.sin(t * 17 + 0.4) * 0.18) * k;
        o.armF = { a: T.lerp(0.3, 1.42, k) + tr * 0.085, b: T.lerp(0.3, 0.14, k) + tr * 0.05 };
        o.shrug = (o.shrug || 0) + 1.1 * k + tr * 0.35;
        o.lean = (o.lean || 0) - 0.03 * k;
        o.headTilt = (o.headTilt || 0) - 0.05 * k + tr * 0.01;
        if (k > 0.35) o.face = Object.assign({}, o.face, { eye: 'wide', brow: 'worry', mouth: 'line', blush: 0.04 });
      },
    });
  }

  /* ---------- small things in hands ---------- */
  /* the wish light: a soft halo and a white heart */
  function wishLight(g, x, y, a, t, s) {
    s = s || 1;
    if (a <= 0.01) return;
    const p = 0.9 + 0.1 * Math.sin(t * 5);
    P.glow(g, x, y, 46 * s * p, '#ffe6a8', 0.6 * a);
    P.glow(g, x, y, 14 * s, '#ffffff', 0.9 * a);
    g.save(); g.globalAlpha *= a; P.fill(g, P.circle(x, y, 3.2 * s), '#fffdf4'); g.restore();
  }
  /* a little glass jar with a cork, for a smell (a.cork 0..1: the cork going in) */
  function jar(g, x, y, cork, glow) {
    g.save(); g.translate(x, y);
    if (glow > 0.01) P.glow(g, 0, -2, 26, '#fff0d0', 0.5 * glow);
    P.fill(g, P.rr(-8, -10, 16, 20, 5), 'rgba(222,238,240,0.55)');
    g.strokeStyle = 'rgba(160,190,196,0.9)'; g.lineWidth = 1.4; g.stroke(P.rr(-8, -10, 16, 20, 5));
    P.fill(g, P.rr(-5, -8, 3, 13, 1.5), 'rgba(255,255,255,0.55)');
    P.fill(g, P.rr(-5.5, -15 + 5 * cork, 11, 7, 2), '#b98a5a');
    g.restore();
  }
  /* the loaf: crusty, and burnt black at one end */
  function loaf(g, x, y, rot, s) {
    g.save(); g.translate(x, y); g.rotate(rot || 0); g.scale(s || 1, s || 1);
    const body = P.ellipse(0, 0, 22, 11);
    P.fill(g, body, '#c98a4a');
    g.save(); g.clip(body);
    const gr = g.createLinearGradient(-22, 0, 22, 0); gr.addColorStop(0, 'rgba(52,34,26,0)'); gr.addColorStop(0.42, 'rgba(52,34,26,0)'); gr.addColorStop(0.6, 'rgba(52,34,26,0.85)'); gr.addColorStop(1, 'rgba(40,26,20,0.95)');
    g.fillStyle = gr; g.fillRect(-24, -12, 48, 24);
    P.fill(g, P.ellipse(-6, -5, 12, 4), 'rgba(255,226,170,0.45)');
    g.restore();
    g.strokeStyle = 'rgba(90,50,30,0.6)'; g.lineWidth = 1.6; g.lineCap = 'round';
    for (const d of [-10, -1, 8]) { g.beginPath(); g.moveTo(d - 3, -8); g.lineTo(d + 4, 4); g.stroke(); }
    g.restore();
  }

  /* ---------- the picture in the wish light ----------
     The hospital from outside at night: a lit window, and in it Lily and Nora, the little one's hands together,
     looking up at where the star went; behind them a bed, and a head of white hair on the pillow. Drawn in a square
     of 780 round the origin; the caller clips it round and scales it. */
  function wishPicture(g, t) {
    const sky = g.createLinearGradient(0, -390, 0, -200); sky.addColorStop(0, '#0d1330'); sky.addColorStop(1, '#283160');
    g.fillStyle = sky; g.fillRect(-390, -390, 780, 780);
    const r = T.rng(71);
    for (let i = 0; i < 22; i++) { const x = -380 + r() * 760, y = -385 + r() * 120, s = 1.4 + r() * 1.8; g.globalAlpha = 0.45 + 0.45 * Math.sin(t * (0.7 + r()) + i); P.fill(g, P.circle(x, y, s), '#fff6e0'); }
    g.globalAlpha = 1;
    /* the star they saw, going over again and again, as a wish remembers it */
    const u = (t * 0.24) % 1, sa = Math.sin(T.clamp(u * 1.3) * Math.PI), sx = 200 - u * 360, sy = -360 + u * 70;
    g.save(); g.globalAlpha = sa; g.lineCap = 'round';
    g.strokeStyle = 'rgba(255,240,210,0.35)'; g.lineWidth = 10; g.beginPath(); g.moveTo(sx + 110, sy - 22); g.lineTo(sx, sy); g.stroke();
    g.strokeStyle = 'rgba(255,250,236,0.9)'; g.lineWidth = 4; g.beginPath(); g.moveTo(sx + 92, sy - 18); g.lineTo(sx, sy); g.stroke();
    P.glow(g, sx, sy, 28, '#fff6e0', 0.95); g.restore();
    /* the wall of the hospital */
    P.fill(g, P.rr(-390, -275, 780, 670, 0), '#363d5c');
    /* the window, and the room inside: a bed at the back with her in it, a drip, a lamp */
    const X0 = -300, Y0 = -250, WW = 600, WH = 570;
    g.save(); g.beginPath(); g.rect(X0, Y0, WW, WH); g.clip();
    g.fillStyle = '#aab1b2'; g.fillRect(X0, Y0, WW, WH);
    P.fill(g, P.rr(X0, Y0 + 300, WW, WH - 300, 0), '#979e9c');
    P.glow(g, 250, -40, 260, '#ffd9a0', 0.6);
    P.line(g, 278, -230, 278, 120, 5, '#c2c8c8'); P.fill(g, P.rr(258, -226, 40, 58, 10), '#e3ecee');
    P.fill(g, P.rr(-10, 40, 330, 26, 8), '#d9dcd6'); P.fill(g, P.rr(-10, -6, 320, 56, 18), '#a9c2cc');
    P.fill(g, P.ellipse(232, -12, 56, 26, -0.2), '#f6f4ee');
    P.fill(g, P.circle(220, -30, 26), '#efe9e2'); P.fill(g, P.ellipse(204, -20, 13, 16), '#ecc1a6');   /* white hair on the pillow; her cheek */
    /* Lily, a hand on her daughter's shoulder, eyes shut; Nora with her hands together, looking up */
    const ls = F.lilyAt(38), ns = F.styles.nora;
    const nora = { x: -150, y: 246, s: 340, style: ns, flip: true, lean: -0.05, headTilt: -0.5, face: { eye: 'open', mouth: 'o', blush: 0.3 } };
    const nj0 = F.joints(nora);
    nora.armF = { hand: F.local(nora, nj0.neck[0] - 30, nj0.neck[1] + 34) }; nora.armB = { hand: F.local(nora, nj0.neck[0] - 24, nj0.neck[1] + 40) };
    const lily = { x: 10, y: 290, s: 450, style: ls, flip: true, lean: 0.03, headTilt: -0.38, face: { eye: 'closed', mouth: 'line', blush: 0.2 } };
    lily.armF = { hand: F.local(lily, nj0.shoulder[0] + 6, nj0.shoulder[1] + 2) }; lily.armB = { a: 0.3, b: 0.4 };
    F.person(g, lily);
    F.person(g, nora);
    /* the night outside on the glass, and the lamp's warmth on them */
    g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = '#a2aad0'; g.fillRect(X0, Y0, WW, WH); g.restore();
    P.glow(g, -60, 120, 260, '#ffe2b0', 0.16);
    g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = 'rgba(190,210,255,0.12)';
    g.beginPath(); g.moveTo(X0 + 80, Y0); g.lineTo(X0 + 190, Y0); g.lineTo(X0 + 30, Y0 + WH); g.lineTo(X0 - 80, Y0 + WH); g.closePath(); g.fill(); g.restore();
    g.restore();
    /* frame and sill */
    g.strokeStyle = '#d6d0c2'; g.lineWidth = 16; g.strokeRect(X0, Y0, WW, WH);
    P.fill(g, P.rr(X0 - 30, Y0 + WH - 8, WW + 60, 28, 4), '#cfc8b8');
  }

  /* ---------- her dream: the hill, at night, where they drew an aurora ----------
     As she remembers it: the long hill behind the town, the big tree at the top, the sky full of stars and the
     aurora they drew with their fingers still there; Bean beside her. She is as she is now, sixty-nine, and tired,
     sitting in the grass. He comes up the hill and sits down beside her, as he was. Nothing to do here but listen.
     D.fall falling in · D.near he comes and sits · D.lift she looks up at him · D.tear · D.hand his hand on hers ·
     D.smile · D.lean she leans on him. No puzzle and nothing written on it. */
  function hillDream() {
    const D = { dark: true, mood: 'night', chord: 2, gq: null, fall: { k: 0 }, near: { k: 0 }, lift: { k: 0 }, tear: { k: 0 }, hand: { k: 0 }, smile: { k: 0 }, lean: { k: 0 } };
    let off = null, gen = -1;
    const GY = (x) => 640 + Math.pow((x - 10) / 560, 2) * 130;   /* the crest of the hill */
    const FY = (x) => 520 + Math.sin(x * 0.004 + 1) * 26 + Math.sin(x * 0.011) * 10;   /* the hills beyond */
    const MY = (x) => 452 + Math.sin(x * 0.0032 + 2) * 40 + Math.sin(x * 0.009) * 14;   /* the mountains */
    const AU = [];
    for (let i = 0; i < 150; i++) AU.push([-520 + i * 7.2, 392 + Math.sin(i * 0.055) * 34 + Math.sin(i * 0.19) * 16, i * 0.37]);
    const ANA = 70, LEO = -42, SEAT = 0.72;
    function sitPose(o, gy) { const hh = F.hipHeight(o.style, o.s); o.y = gy - hh * (1 - SEAT); o.legF = { foot: [20, 15] }; o.legB = { foot: [15, 16] }; }
    function scene(g, t) {
      const W = T.view.W;
      const sky = g.createLinearGradient(0, 0, 0, 640); sky.addColorStop(0, '#0b1026'); sky.addColorStop(0.5, '#16204a'); sky.addColorStop(0.9, '#33406e');
      g.fillStyle = sky; g.fillRect(-W / 2 - 40, 0, W + 80, 900);
      const r = T.rng(23);
      for (let i = 0; i < 110; i++) { const x = (r() - 0.5) * 1000, y = 250 + r() * 260, s = 0.8 + r() * 1.8, ph = r() * 9; g.globalAlpha = 0.5 + 0.5 * Math.sin(t * 1.3 + ph); P.fill(g, P.circle(x, y, s), '#f6f3ff'); }
      g.globalAlpha = 1;
      /* the aurora they drew, still in the sky */
      const strip = T.plot.strip;
      if (strip) {
        g.save(); g.globalCompositeOperation = 'lighter';
        for (const p of AU) {
          const h = 190 + Math.sin(p[2] * 3.1 + t * 0.7) * 60, sway = Math.sin(t * 0.9 + p[0] * 0.011 + p[2]) * 12;
          g.globalAlpha = 0.22 * (0.6 + 0.4 * Math.sin(t * 1.7 + p[2] * 5));
          g.drawImage(strip, p[0] - 30 + sway, p[1] - h * 0.82, 60, h);
        }
        g.restore();
      }
      const hill = (fn, c) => { g.fillStyle = c; g.beginPath(); g.moveTo(-W / 2 - 40, 960); for (let x = -W / 2 - 40; x <= W / 2 + 40; x += 18) g.lineTo(x, fn(x)); g.lineTo(W / 2 + 40, 960); g.closePath(); g.fill(); };
      hill(MY, '#2e3260'); hill(FY, '#3a3a68');
      /* the crest they sit on, and the big tree at the top of it */
      hill(GY, '#4a3d63');
      g.strokeStyle = '#3c3156'; g.lineCap = 'round';
      const rg = T.rng(5);
      for (let i = 0; i < 70; i++) { const x = (rg() - 0.5) * W, d = 10 + rg() * 200, s = 8 + rg() * 8; g.lineWidth = 2 + rg() * 1.5; g.globalAlpha = 0.6; g.beginPath(); g.moveTo(x - s, GY(x) + d); g.quadraticCurveTo(x + Math.sin(t + i) * 2, GY(x) + d - s * 1.3, x + s * 0.8, GY(x) + d - s * 0.2); g.stroke(); }
      g.globalAlpha = 1;
      const TX = 360, ty = GY(TX);
      g.strokeStyle = '#231c36'; g.lineWidth = 15; g.beginPath(); g.moveTo(TX + 4, ty + 10); g.quadraticCurveTo(TX - 6, ty - 70, TX + 6, ty - 130); g.stroke();
      g.lineWidth = 8; g.beginPath(); g.moveTo(TX, ty - 90); g.quadraticCurveTo(TX - 40, ty - 120, TX - 62, ty - 150); g.moveTo(TX + 4, ty - 100); g.quadraticCurveTo(TX + 44, ty - 124, TX + 58, ty - 160); g.stroke();
      const rt = T.rng(71);
      for (let i = 0; i < 16; i++) { const a = rt() * TAU, d = 20 + rt() * 74; P.fill(g, P.ellipse(TX + Math.cos(a) * d * 1.25, ty - 168 + Math.sin(a) * d * 0.8, 34 + rt() * 22, 28 + rt() * 16, rt() * 3), T.mix(['#e3923f', '#d6703b', '#e9ae46', '#c95a38', '#e39a44'][i % 5], '#2a2c55', 0.6)); }
      /* the three of them */
      const near = T.ease.io(D.near.k), lift = T.ease.io(D.lift.k), hk = T.ease.io(D.hand.k), sm = T.ease.io(D.smile.k), ln = T.ease.io(D.lean.k), tear = D.tear.k;
      const br = Math.sin(t * 0.9) * 0.012;
      /* Bean, sitting up beside her, as he did on the walk */
      F.dog(g, { x: ANA + 108, y: GY(ANA + 108) + 2, s: 190, sit: 1, flip: true, wag: Math.sin(t * (near > 0.9 ? 11 : 4)) * (near > 0.9 ? 1 : 0.4), headTilt: near > 0.9 ? -0.05 : -0.25 });
      const as = F.anaAt(69, { scarf: '#e9dcc3' });
      const ana = { x: ANA, s: 196, style: as, flip: true, lean: T.lerp(0.26, 0.08, lift) + 0.2 * ln + br, headTilt: T.lerp(0.42, 0.02, lift) + 0.12 * ln,
        face: { eye: sm > 0.5 ? 'happy' : lift > 0.5 ? (tear > 0.3 ? 'teary' : 'open') : 'sad', mouth: sm > 0.4 ? 'smile' : tear > 0.4 ? 'tremble' : 'line', tremble: 0.4 * tear, blush: 0.16 + 0.08 * sm, old: true, tear: tear * 0.8, tearY: (t * 2) % 3, well: tear * 0.7 } };
      sitPose(ana, GY(ANA));
      const meet = [ANA - 56, GY(ANA - 56) - 6];   /* her hand on the grass, on his side */
      ana.armF = { hand: F.local(ana, meet[0], meet[1]) }; ana.armB = { hand: F.local(ana, ANA - 26, ana.y + 10) };
      /* he comes up the hill, and sits down by her: as he was */
      const ls = F.styles.leoHome, hh = F.hipHeight(ls, 200), wk = T.clamp(near / 0.8), sk = T.smooth(T.clamp((near - 0.8) / 0.2));
      const lx = T.lerp(-W / 2 - 80, LEO, T.ease.io(wk));
      const leo = { x: lx, s: 200, style: ls, lean: 0.06, headTilt: 0.06, face: { blush: 0.14, mouth: 'smile', eye: sm > 0.5 ? 'happy' : 'open' } };
      if (near < 0.8) { leo.y = GY(lx) - hh; if (near > 0.01) leo.walk = wk * 14; }
      else {
        leo.y = T.lerp(GY(lx) - hh, GY(lx) - hh * (1 - SEAT), sk);
        leo.legF = { foot: [T.lerp(1, 20, sk), T.lerp(49, 15, sk)] }; leo.legB = { foot: [T.lerp(-1, 15, sk), T.lerp(49, 16, sk)] };
        leo.lean = 0.06 + sk * 0.08; leo.headTilt = 0.1 - 0.06 * lift;
        leo.armB = { hand: F.local(leo, LEO - 18, GY(LEO) - 4) };
        leo.armF = hk > 0.01 ? { hand: F.local(leo, T.lerp(LEO + 20, meet[0] + 2, hk), T.lerp(GY(LEO) - 20, meet[1] - 5, hk) - Math.sin(hk * Math.PI) * 10), bend: 1 } : { a: 0.6, b: 0.9 };
      }
      if (near > 0.001) { g.save(); g.globalAlpha = T.clamp(near * 5); P.glow(g, leo.x, leo.y - 40, 120, '#fff0c8', 0.22); F.person(g, leo); g.restore(); }
      F.person(g, ana);
      /* near grass at our feet */
      g.fillStyle = '#2a2040'; g.beginPath(); g.moveTo(-W / 2 - 40, 900);
      for (let x = -W / 2 - 40; x <= W / 2 + 40; x += 22) g.lineTo(x, 856 + T.noise(x * 0.006, 4) * 24);
      g.lineTo(W / 2 + 40, 900); g.closePath(); g.fill();
      /* the aurora lays a little green on the land */
      g.save(); g.globalCompositeOperation = 'screen'; const lg = g.createLinearGradient(0, 400, 0, 760); lg.addColorStop(0, 'rgba(95,224,176,0)'); lg.addColorStop(1, 'rgba(95,224,176,0.1)'); g.fillStyle = lg; g.fillRect(-W / 2 - 40, 400, W + 80, 500); g.restore();
    }
    function build() { const V = T.view; off = document.createElement('canvas'); off.width = Math.ceil(V.W * V.ps); off.height = Math.ceil(900 * V.ps); gen = T.gen; }
    D.draw = function (g, t) {
      const V = T.view, W = V.W, ps = V.ps;
      if (!off || gen !== T.gen || off.width !== Math.ceil(W * ps)) build();
      const og = off.getContext('2d');
      og.setTransform(1, 0, 0, 1, 0, 0); og.clearRect(0, 0, off.width, off.height);
      og.setTransform(ps, 0, 0, ps, (W / 2) * ps, 0);
      /* a little closer than the hill is wide, on the two of them */
      og.translate(0, 600); og.scale(1.7, 1.7); og.translate(-10, -610);   /* close, on the two of them */
      og.translate(0, 540); og.rotate(Math.sin(t * 0.45) * 0.012); og.translate(0, -540);
      scene(og, t);
      /* laid down in slow waves, as a dream is */
      g.fillStyle = '#1b2440'; g.fillRect(-W / 2, 0, W, 900);
      for (let y = 0; y < 900; y += 6) {
        const dx = Math.sin(y * 0.018 + t * 1.1) * 6 + Math.sin(y * 0.047 - t * 1.7) * 2.5;
        g.drawImage(off, 0, y * ps, off.width, 6 * ps, -W / 2 + dx, y, W, 6.6);
      }
      g.save(); g.globalCompositeOperation = 'soft-light'; g.fillStyle = 'rgba(150,130,230,0.4)'; g.fillRect(-W / 2, 0, W, 900); g.restore();
      const vg = g.createRadialGradient(0, 520, 260, 0, 520, 980);
      vg.addColorStop(0, 'rgba(40,34,80,0)'); vg.addColorStop(0.7, 'rgba(70,60,120,0.4)'); vg.addColorStop(1, 'rgba(200,190,240,0.7)');
      g.fillStyle = vg; g.fillRect(-W / 2, 0, W, 900);
      const r = T.rng(11);
      for (let i = 0; i < 30; i++) {
        const sx = r() * W - W / 2, sp = 0.3 + r() * 0.7, ph = r() * TAU;
        const x = sx + Math.sin(t * 0.3 * sp + ph) * 40, y = 900 - ((t * 20 * sp + r() * 900) % 960);
        P.glow(g, x, y, 8 + sp * 12, i % 3 ? '#fff6e0' : '#d9c8ff', 0.4 + 0.25 * Math.sin(t * 2 + ph));
      }
      /* falling in: the light he laid on the water, down into a point, and opening onto the hill */
      const fk = D.fall.k;
      if (fk < 1) {
        const a = 1 - T.ease.io(T.clamp((fk - 0.55) / 0.45));
        g.save(); g.globalAlpha = a; g.fillStyle = '#1b2440'; g.fillRect(-W / 2, 0, W, 900);
        const rr = T.rng(4);
        for (let i = 0; i < 120; i++) {
          const ang = rr() * TAU + t * (0.6 + rr()) + fk * 6, d0 = 60 + rr() * 700, d = d0 * (1 - T.ease.in(T.clamp(fk / 0.7)) * 0.96);
          P.glow(g, Math.cos(ang) * d, 470 + Math.sin(ang) * d * 0.6, 6 + rr() * 10, i % 4 ? '#fff0c8' : '#b8ffe0', 0.8);
        }
        P.glow(g, 0, 470, 40 + fk * 600, '#f6f0ff', T.clamp(fk * 1.4));
        g.restore();
      }
    };
    D.update = function () {};
    return D;
  }

  /* ---------- the morning after the dream: the room as it is, no lake and no bank ---------- */
  function wardMorning() {
    const V = { dark: false, mood: 'walk', chord: 0, open: { k: 0 }, morning: true, nora: { k: 0 }, turn: { k: 0 }, lily: { k: 0 } };
    V.draw = function (g, t) {
      const W = T.view.W;
      T.vig.ward(g, t, V);
      const k = 1 - T.ease.io(T.clamp(V.open.k));   /* the white of the dream, going */
      if (k > 0.01) { g.fillStyle = T.rgba('#fff6e6', 0.85 * k); g.fillRect(-W / 2, 0, W, 900); }
      const vg = g.createRadialGradient(0, 450, 380, 0, 450, 980);
      vg.addColorStop(0, 'rgba(255,246,230,0)'); vg.addColorStop(1, 'rgba(255,240,214,0.5)');
      g.fillStyle = vg; g.fillRect(-W / 2, 0, W, 900);
    };
    V.update = function () {};
    return V;
  }

  /* ---------- over the world ---------- */
  /* dawn coming up into the mist: warm low down, cool overhead (screen space) */
  function dawn(g, S) {
    const k = S.dawn || 0, W = T.view.W;
    if (k < 0.01) return;
    g.save(); g.globalCompositeOperation = 'screen';
    const gr = g.createLinearGradient(0, 0, 0, 900);
    gr.addColorStop(0, T.rgba('#3a3058', 0.25 * k)); gr.addColorStop(0.5, T.rgba('#c98a7a', 0.26 * k)); gr.addColorStop(0.8, T.rgba('#ffcf9a', 0.2 * k)); gr.addColorStop(1, 'rgba(255,207,154,0)');
    g.fillStyle = gr; g.fillRect(-W / 2, 0, W, 900);
    g.restore();
  }
  function after(g, S) {
    const Wd = T.world, t = T.time;
    dawn(g, S);
    Wd.layer(g, 1);
    /* the fog the boat comes out of */
    const fg = S.fog || 0;
    if (fg > 0.01 && S.fogAt != null) {
      for (let i = 0; i < 11; i++) { const x = S.fogAt + (i - 6) * 64 + Math.sin(t * 0.4 + i * 1.7) * 18, y = Wd.C.PIER_Y - 60 - (i % 3) * 34 + Math.sin(t * 0.3 + i) * 8; P.glow(g, x, y, 140, '#fbf4ec', 0.62 * fg, 'source-over'); }
    }
    /* the wish light: falling, in the sea, in his hands */
    const w = S.wl;
    if (w && w.a > 0.01) {
      if (w.tail > 0.01) { g.save(); g.globalAlpha = w.tail; g.strokeStyle = 'rgba(255,240,210,0.5)'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(w.x + 70, w.y - 120); g.lineTo(w.x, w.y); g.stroke(); g.restore(); }
      if (w.sea) { g.save(); g.translate(w.x, Wd.surf(w.x) + 4); g.scale(1, 0.28); P.glow(g, 0, 0, 90, '#ffe6a8', 0.45 * w.a); g.restore(); }
      wishLight(g, w.x, w.y + (w.sea ? Math.sin(t * 1.6) * 3 : 0), w.a, t, w.s || 1);
      /* and what it holds: a round picture opening above it */
      const vk = T.ease.io(T.clamp(S.vis || 0));
      if (vk > 0.01) {
        const R = 150 * vk, cx = w.x + 6, cy = w.y - 40 - 140 * vk;
        g.save(); g.globalCompositeOperation = 'screen';
        g.strokeStyle = T.rgba('#ffe2b0', 0.4 * vk); g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(w.x, w.y - 12); g.quadraticCurveTo(w.x - 8, (w.y + cy) / 2, cx, cy + R * 0.9); g.stroke();
        P.glow(g, cx, cy, R * 1.6, '#ffd796', 0.36 * vk);
        g.restore();
        g.save(); g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.clip();
        g.translate(cx, cy); g.scale(R / 390, R / 390); wishPicture(g, t);
        g.restore();
        const rim = g.createRadialGradient(cx, cy, R * 0.7, cx, cy, R);
        rim.addColorStop(0, 'rgba(255,226,176,0)'); rim.addColorStop(1, T.rgba('#ffe2b0', 0.8 * vk));
        g.fillStyle = rim; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill();
        g.globalAlpha = 0.7 * vk; g.strokeStyle = '#fff3da'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.stroke(); g.globalAlpha = 1;
      }
    }
    g.restore();
    /* the three makings of a dream, out of the tray and into his hands as one light (screen space) */
    const q = S.gath;
    if (q && q.k > 0.001 && q.to) {
      const k = T.ease.io(T.clamp(q.k)), to = q.to(), x0 = -T.view.W / 2 + 70;
      for (let i = 0; i < 3; i++) {
        const u = T.clamp(k * 1.25 - i * 0.12), x = T.lerp(x0 + i * 64, to[0], T.ease.io(u)), y = T.lerp(70, to[1], T.ease.io(u)) - Math.sin(u * Math.PI) * 90;
        if (u < 0.98) { P.glow(g, x, y, 30, ['#fff3dc', '#f2d6c9', '#d8ff9a'][i], 0.7); P.glow(g, x, y, 8, '#ffffff', 0.9); }
      }
      if (k > 0.7) { const a = T.clamp((k - 0.7) / 0.3); P.glow(g, to[0], to[1], 60 * a, '#fff0c8', 0.6 * a); }
    }
  }

  T.stage('ch7', {
    chapter: 7, title: ['7장', '아직은'], end: ['7장 끝', '8장 「다 지킨 약속」'], next: 'ch8', pad: 2, nextColor: '#161d2a',
    plot: { stage: 4, stones: 4, board: true, table: true, tree: 1, swing: 1, swingW: 1, garden: 1, patch: 3, fruit: 1, season: 'spring' },
    flags: { bramGone: true, rosaGone: true },
    build() { T.scenes.room.build(); },
    update(dt, S) {
      if (S.swinging) S.ps.swingA = Math.sin(T.time * 1.3) * 0.45 * (S.swingAmp == null ? 1 : S.swingAmp);
      if (S.fogBoat && S.fogAt != null) S.fogAt = Math.min(-200, S.fogBoat.x + 40);   /* the fog goes along with the boat */
    },
    onHill(g, h, S) {
      if (h === 3 && S.ps && S.ps.patch >= 3 && !S.ps.patchHide) T.plot.fence(g);
      if (h === 1 && S.lampDown != null) K.lantern(g, S.lampDown, T.world.C.PIER_Y - 22, T.time, { bare: true, s: 0.85, lit: 1, seed: 3 });   /* his lantern, on the boards */
    },
    after(g, S) { after(g, S); },
    script: async function (X) {
      const W = T.world, C = W.C, PL = T.plot, S = X.S, ps = S.ps, A = X.A, TALK = X.TALK, PIER = C.PIER_Y;
      T.state.dream = Object.assign({ sound: true }, T.state.dream || {});   /* Nora's laugh, from chapter 6 */
      S.wl = null; S.vis = 0; S.fog = 0; S.fogAt = null; S.dawn = 0; S.gath = null; S.lampDown = null; S.swinging = false; S.swingAmp = 1;
      const [px, py] = X.place.plot();
      const GZ = T.puzzle;
      const TAB = PL.TABLE_X;

      X.title();
      await X.wait(4.4);
      X.bed(4, 0.13, 'walk');

      /* ---- spring, the thirty-second year: the tomatoes, and someone who knows how ---- */
      let leo = X.actor('leo', { x: GZ.PATCH_X + 236, style: F.leoAt(3), flip: true, face: { old: true } });
      let bean = X.actor('bean', { dog: true, s: 220, x: GZ.PATCH_X + 330, sit: 1, wag: 0.5, flip: true });
      const pm = X.actor('pmom', { x: GZ.PATCH_X + 40, style: F.styles.villagerB, s: 128, lean: 0.1, flip: false, face: { old: true } });
      const pipi = X.actor('kid', { x: GZ.PATCH_X + 112, style: F.styles.kidA, s: 100, flip: true });
      ps.fruit = 0.12;   /* late spring: flowers, and only a few small green ones yet */
      { const q = GZ.patchCam(); X.cam(GZ.PATCH_X + 132, q[1] - 4, 2.05); X.camSnap(); }
      await X.years(30, 32, { age: 68, season: 'late spring' });
      T.announce('늦봄, 언덕의 텃밭. 피피의 엄마가 토마토 덩굴 앞에 쪼그려 앉아 있고, 피피가 곁에서 들여다본다.');
      await X.gesture(pm, 'kneel', { hold: true });
      pm.pose = (o, a, t) => { o.armF = { a: 1.1 + Math.sin(t * 3) * 0.06, b: 0.5 }; o.headTilt = 0.28; o.face.eye = 'open'; };
      pipi.pose = (o) => { o.lean = 0.12; o.headTilt = 0.22; };
      await X.wait(0.8);
      await TALK.say('pmom', '피피야, 토마토 곁순은\n이렇게 따 줘야 해.');
      A.sfx('step-grass');
      pipi.pose = (o) => { o.headTilt = -0.06; o.armF = { a: 1.6, b: 0.3 }; };   /* pointing at Leo's */
      pipi.flip = false;
      await X.wait(0.3);
      await TALK.say('kid', '아저씨는 그냥 두던데?');
      pm.pose = (o) => { o.armF = { a: 0.8, b: 0.6 }; o.headTilt = -0.1; o.face.eye = 'happy'; o.face.mouth = 'smile'; };
      X.gesture(leo, 'shy', { dur: 3.2 });   /* a hand to the back of his neck */
      await X.wait(0.6);
      await TALK.say('leo', '…내년부턴 딸게요.');
      pipi.pose = (o, a, t) => { o.y -= Math.abs(Math.sin(t * 6)) * 3; o.face.eye = 'happy'; o.face.mouth = 'open'; };
      await X.wait(1.8);

      /* ---- late autumn, night, on the pier: a light falls into the sea ---- */
      let pp, cloud;
      await X.dip(async () => {
        S.actors = []; S.boats = [];
        ps.night = 1;
        X.cam(60, 520, 1.45); X.camSnap();
        leo = X.actor('leo', { x: 150, style: F.leoAt(3), flip: true, face: { old: true } });
        leo.pose = (o, a) => { if (a.hold) a.hold(o, a); };
        pp = X.actor('kid', { x: 196, style: F.styles.kidA, s: 100, flip: true });
        bean = X.actor('bean', { dog: true, s: 220, x: 250, sit: 1, wag: 0.3, flip: true });
        cloud = X.cloudKid({ x: 468 });
        /* sitting on the boards, looking at the sky */
        X.gesture(leo, 'sit-ground', { hold: true, in: 0.01, face: false }); X.gesture(leo, 'look-up', { hold: true, in: 0.01 });
        X.gesture(pp, 'sit-ground', { hold: true, hug: true, in: 0.01, face: false }); X.gesture(pp, 'look-up', { hold: true, in: 0.01 });
      }, { color: '#141b36', out: 1.4, in: 1.4 });
      X.bed(5, 0.12, 'night');
      T.announce('늦가을 밤, 부두. 레오와 피피가 부두에 앉아 하늘을 본다. 구름이는 상자 위에 앉아 있다.');
      await X.wait(2.6);
      /* a wish, made down there on a shooting star, falls here as a small light (chapter 2) */
      const sea = -210;
      S.wl = { x: sea - 260, y: 90, a: 0, tail: 0, sea: false, s: 1 };
      A.sfx('star', 0.9);
      X.tween(S.wl, 'a', 1, 0.3); X.tween(S.wl, 'tail', 1, 0.3);
      X.tween(S.wl, 'x', sea, 1.8, T.ease.lin); await X.tween(S.wl, 'y', W.surf(sea) - 8, 1.8, T.ease.in);
      S.wl.sea = true; X.tween(S.wl, 'tail', 0, 0.4);
      A.sfx('ripple'); A.note({ m: 84, vel: 0.2, voice: 'glass', dur: 2.4 });
      await X.wait(0.6);
      X.ungesture(pp, 'look-up'); await X.ungesture(pp, 'sit-ground');
      pp.flip = true; A.sfx('step');
      pp.pose = (o, a, t) => { o.armF = { a: 1.8 + Math.sin(t * 7) * 0.12, b: 0.2 }; o.y -= Math.abs(Math.sin(t * 6)) * 3; o.face.eye = 'open'; o.face.mouth = 'open'; };
      await TALK.say('kid', '아저씨! 빛 떨어졌다.\n누가 아저씨한테 소원 빌었나 봐.');
      pp.pose = null;
      X.ungesture(leo, 'look-up'); await X.ungesture(leo, 'sit-ground');
      X.walk(pp, -6, 90).then(() => { pp.flip = true; });
      X.cam(-40, 500, 1.6, 0.8);
      await X.walk(leo, -48, 60);
      leo.flip = true;
      cloud.look = true;
      await X.gesture(leo, 'kneel', { hold: true });
      leo.hold = (o) => { o.armF = { a: 0.9, b: 0.4 }; o.headTilt = 0.34; };
      T.announce('구름바다 위에 작은 빛이 떠 있다. 눌러서 건져 올린다.');
      await X.tap(() => [S.wl.x, S.wl.y, 40]);
      /* it comes up out of the cloud into his hands */
      leo.hold = (o) => { o.armF = { hand: [17, -9] }; o.armB = { hand: [15, -7] }; o.headTilt = 0.26; };
      const handAt = () => (leo.j ? [(leo.j.handF[0] + leo.j.handB[0]) / 2, (leo.j.handF[1] + leo.j.handB[1]) / 2 - 8] : [leo.x - 24, PIER - 60]);
      A.sfx('join');
      S.wl.sea = false;
      const h0 = handAt();
      X.tween(S.wl, 'x', h0[0], 1.4, T.ease.io); await X.tween(S.wl, 'y', h0[1], 1.4, T.ease.io);
      await X.wait(0.6);
      /* in the light, the one who wished: the way the wish grove shows them (chapter 3) */
      T.announce('빛 속에 그림이 열린다. 밤의 병원 창가에서 릴리와 다섯 살 노라가 하늘을 올려다본다. 그 뒤에 병상이 있다.');
      A.note({ m: 79, vel: 0.2, voice: 'glass', dur: 3 });
      X.cam(-56, 452, 1.75, 0.6);
      await X.tween(S, 'vis', 1, 2.2);
      await X.wait(1.4);
      await TALK.say('leo', '…릴리네.', { slow: true });
      pp.pose = (o) => { o.headTilt = -0.24; o.face.mouth = 'line'; };
      await TALK.say('kid', '여기… 병원이야?');
      cloud.chair = 0; cloud.y = null; cloud.pose = (q) => { q.headTilt = -0.1; };
      await X.walk(cloud, 62, 60);
      cloud.flip = true;
      await TALK.say('cloud', '…그 따뜻한 아줌마?');
      await X.wait(0.6);
      await TALK.say('leo', '…아나.', { slow: true });
      await X.wait(1.4);
      /* the picture closes; the light is his, and he keeps it, against his chest */
      await X.tween(S, 'vis', 0, 1.6);
      X.cam(-40, 500, 1.6, 0.6);
      await X.ungesture(leo, 'kneel');
      leo.hold = (o) => { o.armF = { hand: [13, -26] }; o.armB = { hand: [11, -24] }; o.headTilt = 0.2; };
      await X.wait(0.8);
      const chest = () => (leo.j ? [T.lerp(leo.j.shoulder[0], leo.j.hip[0], 0.4) + leo.j.sx * 5, T.lerp(leo.j.shoulder[1], leo.j.hip[1], 0.4)] : [leo.x, PIER - 80]);
      const c0 = chest();
      X.tween(S.wl, 'x', c0[0], 1.2, T.ease.io); X.tween(S.wl, 's', 0.5, 1.2); await X.tween(S.wl, 'y', c0[1], 1.2, T.ease.io);
      S.wl = null;
      leo.pocket = 1;
      leo.prop = (g, j, o, a) => { if (a.pocket > 0.01) { const q = [T.lerp(j.shoulder[0], j.hip[0], 0.4) + j.sx * 5, T.lerp(j.shoulder[1], j.hip[1], 0.4)]; P.glow(g, q[0], q[1], 16, '#ffe6a8', 0.5 * a.pocket); } };
      leo.hold = (o) => { o.armF = { hand: [12, -24] }; o.headTilt = 0.1; };
      await X.wait(2.2);

      /* ---- dawn: the bell, and for the first time it frightens him ---- */
      let wife, baker, boat;
      const pocketProp = (g, j, o, a) => { if (a.pocket > 0.01) { const q = [T.lerp(j.shoulder[0], j.hip[0], 0.4) + j.sx * 5, T.lerp(j.shoulder[1], j.hip[1], 0.4)]; P.glow(g, q[0], q[1], 16, '#ffe6a8', 0.5 * a.pocket); } };
      await X.dip(async () => {
        S.actors = []; S.boats = [];
        ps.night = 0.55; S.dawn = 1;
        X.cam(260, 500, 1.35); X.camSnap();
        leo = X.actor('leo', { x: 250, style: F.leoAt(3), flip: true, face: { old: true }, pocket: 1, prop: pocketProp });
        leo.pose = (o, a) => {
          if (a.sitting) { o.headTilt = (o.headTilt || 0) + 0.1; o.armF = { hand: [12, -22] }; }
          if (a.bend) { const k = a.bend; o.lean = (o.lean || 0) + 0.45 * k; o.headTilt = (o.headTilt || 0) + 0.3 * k; o.armF = { a: T.lerp(0.4, 0.15, k), b: 0.1 }; }
          if (a.wet) o.face = Object.assign({}, o.face, { well: 0.7 * a.wet, brow: 'worry' });
        };
        leo.sitting = true;
        S.lampDown = 222;
        pp = X.actor('kid', { x: 330, style: F.styles.kidA, s: 100, flip: true, face: { eye: 'closed', mouth: 'line' } });
        bean = X.actor('bean', { dog: true, s: 220, x: 372, sit: 1, wag: 0.2, flip: true });
        cloud = X.cloudKid({ x: 468 });
        /* he has sat on the boards all night; Pipi has gone to sleep against Bean */
        X.gesture(leo, 'sit-ground', { hold: true, in: 0.01, face: false });
        X.gesture(pp, 'sit-ground', { hold: true, hug: true, in: 0.01, face: false });
      }, { color: '#2a2f4a', out: 1.4, in: 1.6 });
      S.bedNow = null; X.hush();
      T.announce('새벽, 부두. 레오는 밤새 부두에 앉아 있었다. 피피는 빈에게 기대어 잠들었다.');
      await X.wait(2.4);
      for (let i = 0; i < 4; i++) { X.toll(i, 0.55); await X.wait(1.6); }
      T.announce('종이 운다.');
      pp.face = { eye: 'open', mouth: 'open' };
      await X.ungesture(pp, 'sit-ground');
      await X.wait(0.8);
      await TALK.say('kid', '아저씨, 종 울려.');
      await X.wait(0.8);
      await TALK.say('leo', '…알아.', { slow: true });
      await X.wait(1.2);
      /* he gets up, and bends for his lantern */
      leo.sitting = false;
      await X.ungesture(leo, 'sit-ground');
      await X.walk(leo, 240, 24);
      leo.flip = true;
      leo.bend = 0; await X.tween(leo, 'bend', 1, 0.9, T.ease.io);
      S.lampDown = null; leo.lamp = true; leo.lampHand = 'F'; A.sfx('knock', 0.3);
      await X.tween(leo, 'bend', 0, 0.9, T.ease.io); leo.bend = 0;
      /* out along the pier, slowly; the light shaking in his hand */
      X.gesture(leo, 'ch7-dread', { hold: true });
      X.cam(90, 500, 1.2, 0.5);
      X.walk(pp, 200, 50).then(() => { pp.flip = true; pp.face = {}; });
      X.walk(bean, 236, 50).then(() => { bean.flip = true; bean.sit = 1; });
      await X.walk(leo, 124, 24);
      leo.flip = true;
      /* the neighbours come down, the way they do for every boat */
      wife = X.actor('v2', { x: 760, style: Object.assign({}, F.styles.villagerB, { apron: '#f6efe2' }), s: 134, flip: true });
      X.walk(wife, 70, 80).then(() => { wife.flip = true; });
      cloud.chair = 0; cloud.y = null; cloud.lamp = true; cloud.lampHand = 'F'; cloud.look = true;
      X.walk(cloud, 164, 46).then(() => { cloud.flip = true; cloud.pose = (q, a, t) => { q.headTilt = 0.02; q.armF = { a: 1.9 + Math.sin(t * 2) * 0.06, b: 0.5 }; }; });
      baker = X.actor('v4', { style: F.styles.baker, s: 140, lean: 0.08, face: { old: true }, veil: 1 });
      baker.prop = (g, j, o, a) => {
        if (a.veil > 0.01) {   /* out in the fog, only a shape: no one could say who */
          const ink = {}; Object.keys(o.style).forEach((k2) => { ink[k2] = typeof o.style[k2] === 'string' && o.style[k2][0] === '#' ? '#9c97b0' : o.style[k2]; }); ink.glasses = false;
          g.save(); g.globalAlpha *= a.veil; F.person(g, Object.assign({}, o, { style: ink, face: { eye: 'closed', mouth: 'line', blush: 0 } })); g.restore();
        }
      };
      boat = X.boat({ x: -900, riders: [baker] });
      T.announce('부두 끝은 안개뿐이다. 바다 등불이 꺼져 있다. 등불을 눌러 켠다.');
      const pressed = X.seaLamp({ rounds: [[0, 1, 2], [0, 1, 2, 3]], beat: 1.1, onRound: (r, n) => { if (S.sw) X.tween(S.sw, 'mist', 1 - (r / n) * 0.4, 1.8, T.ease.io); } });
      X.sail(boat, -476, 60);
      await pressed;
      /* the mist parts a little, and the boat comes on, slowly: whoever is in it, a shape in the fog */
      S.fogBoat = boat; S.fogAt = -440; S.fog = 1;
      X.hush(); S.bedNow = null;
      T.announce('안개 속에서 배 한 척이 천천히 나온다. 배에 누가 앉아 있다. 누군지 보이지 않는다.');
      const arrived = X.sail(boat, -74, 26);
      X.cam(-60, 520, 1.4, 0.4);
      await X.wait(3.6);
      X.tween(baker, 'stand', 1, 2, T.ease.io);   /* whoever it is gets up in the boat */
      A.note({ m: 69, vel: 0.14, voice: 'glass', dur: 3 });
      await X.wait(3.4);
      X.tween(S, 'fog', 0.45, 4, T.ease.io);
      X.tween(baker, 'veil', 0.55, 4, T.ease.io);
      await X.wait(3.2);
      /* she knows him before anyone can see who it is */
      wife.pose = (o) => { o.lean = 0.14; o.headTilt = -0.06; o.face.eye = 'wide'; o.face.mouth = 'o'; };
      X.walk(wife, 48, 60);
      X.tween(baker, 'veil', 0, 1.6, T.ease.io);
      X.tween(S, 'fog', 0, 3, T.ease.io).then(() => { S.fogBoat = null; S.fogAt = null; });
      await TALK.say('v2', '여보!');
      await arrived;
      A.sfx('door');
      await X.land(baker, -4);
      X.sail(boat, -1500, 30);
      X.cam(50, 520, 1.6, 0.6);
      wife.flip = true; baker.flip = false;
      X.bed(1, 0.11, 'sea');
      wife.pose = null;
      X.gesture(wife, 'hug', { with: baker, hold: true, in: 1.1, out: 1.2 });
      A.motif({ voice: 'box', vel: 0.3, beat: 0.74 });
      await X.wait(2.4);
      await TALK.say('v4', '…당신, 앞치마 그대로네.');
      await X.ungesture(wife, 'hug');
      wife.pose = (o) => { o.face.eye = 'happy'; o.face.mouth = 'smile'; o.face.tear = 0.6; o.face.tearY = (T.time * 2) % 3; };
      await TALK.say('v2', '당신 오면 갓 구운 거 먹이려고.\n날마다 구웠지.');
      await X.wait(0.6);
      /* she turns round, and sees his face. Nothing on the screen from here to her answer */
      wife.flip = false; wife.pose = (o) => { o.headTilt = 0.04; o.face.eye = 'open'; o.face.mouth = 'line'; };
      X.cam(96, 520, 1.7, 0.6);
      leo.wet = 1;
      await X.wait(1.2);
      await TALK.say('v2', '레오, 얼굴이 왜 그래?');
      await X.wait(0.6);
      await TALK.say('leo', '…아나인 줄 알았어요.', { slow: true });
      /* the lantern comes down to his side */
      X.ungesture(leo, 'ch7-dread');
      await X.wait(0.8);
      X.walk(wife, 80, 30).then(() => { wife.flip = false; });
      wife.pose = (o) => { o.headTilt = 0.1; o.face.eye = 'happy'; o.face.mouth = 'smile'; };
      await TALK.say('v2', '…그럼 다행이네.\n아직 아니어서.', { slow: true });
      leo.wet = 0.4;
      await X.wait(1);
      X.cam(50, 520, 1.6, 0.6);
      baker.pose = (o) => { o.headTilt = -0.12; o.face.eye = 'open'; o.face.mouth = 'line'; };
      await TALK.say('v4', '여기가… 어디요?');
      leo.wet = 0; leo.flip = true;
      /* what his mother told him on this quay, the day he came */
      await TALK.say('leo', '마중 나루예요.\n못 지킨 약속이 있는 사람이 오는 데요.');
      baker.pose = (o) => { o.headTilt = 0.1; o.face.eye = 'open'; o.face.mouth = 'smile'; };
      await TALK.say('v4', '…약속이라.\n저 사람이랑 빵 한 번 같이 굽자 해 놓고, 끝내 못 했지.');
      wife.flip = true;
      wife.pose = (o) => { o.face.eye = 'happy'; o.face.mouth = 'open'; };
      await TALK.say('v2', '그럼 내일 새벽에 같이 구워.');
      baker.pose = (o) => { o.face.eye = 'happy'; o.face.mouth = 'smile'; };
      await X.wait(2);

      /* ---- that day, on the hill: the makings of a dream, all of them from before ---- */
      let pipi2;
      await X.dip(async () => {
        S.actors = []; S.boats = []; S.dawn = 0; S.fog = 0; S.fogBoat = null; S.fogAt = null; ps.night = 0; S.sw = null; W.S.lamps = [{ x: C.SEA_LAMP, k: 0, ok: true, mist: 0 }];
        ps.season = 'late autumn'; ps.fruit = 1;
        leo = X.actor('leo', { x: TAB - 40, style: F.leoAt(3), flip: true, face: { old: true }, pocket: 1 });
        leo.prop = (g, j, o, a) => {
          if (a.pocket > 0.01) { const q = [T.lerp(j.shoulder[0], j.hip[0], 0.4) + j.sx * 5, T.lerp(j.shoulder[1], j.hip[1], 0.4)]; P.glow(g, q[0], q[1], 16, '#ffe6a8', 0.5 * a.pocket); }
          if (a.lightK > 0.01) wishLight(g, (j.handF[0] + j.handB[0]) / 2, (j.handF[1] + j.handB[1]) / 2 - 8, a.lightK, T.time, 0.8);
        };
        bean = X.actor('bean', { dog: true, s: 220, x: TAB + 60, sit: 1, wag: 0.5, flip: true });
        pipi2 = X.actor('kid', { x: TAB - 150, style: F.styles.kidA, s: 100 });
        cloud = X.actor('cloud', { x: TAB - 210, style: F.styles.cloud, s: 94, lamp: true, lampHand: 'F' });
        X.cam(TAB, W.y3(TAB) - 92, 2.05); X.camSnap();
      }, { color: '#fff6e6', out: 1.4, in: 1.4 });
      X.bed(4, 0.12, 'home');
      T.announce('그날 낮, 언덕. 레오가 생각에 잠겨 서 있다. 피피와 구름이가 곁에 있다.');
      await X.wait(1.4);
      leo.pose = (o) => { o.headTilt = 0.2; o.armF = { hand: [12, -24] }; };
      await TALK.say('leo', '…아나한테 가 봐야겠어. 꿈으로.');
      /* what he has already: the laugh */
      S.tray = S.tray || { a: 0, fly: null }; S.trayHold = true; X.tween(S.tray, 'a', 1, 0.6);
      A.note({ m: 81, vel: 0.18, voice: 'glass', dur: 2 });
      await X.wait(0.6);
      await TALK.say('leo', '소리는… 노라 웃음소리.', { slow: true });
      cloud.flip = false;
      cloud.pose = (q) => { q.armF = { a: 1.5, b: 0.3 }; q.headTilt = 0.04; };   /* her lamp held out to him */
      await TALK.say('cloud', '빛은?\n내 등불, 또 빌려줄까?');
      leo.pose = (o) => { o.headTilt = 0.1; o.face.eye = 'happy'; o.armF = { hand: [12, -24] }; };
      await TALK.say('leo', '고마워. 근데 오늘은\n릴리가 보낸 빛이 있어.');
      cloud.pose = null;
      T.announce('레오가 품에 넣어 둔 빛을 꺼낸다.');
      const pocketAt = () => (leo.j ? [T.lerp(leo.j.shoulder[0], leo.j.hip[0], 0.4) + leo.j.sx * 5, T.lerp(leo.j.shoulder[1], leo.j.hip[1], 0.4)] : [leo.x, W.y3(leo.x) - 90]);
      await X.tap(() => [pocketAt()[0], pocketAt()[1], 30]);
      const p0 = pocketAt();
      leo.pocket = 0;
      await X.gift('light', W.toScreen(p0[0], p0[1]));
      const lightAt = () => (leo.j ? [(leo.j.handF[0] + leo.j.handB[0]) / 2, (leo.j.handF[1] + leo.j.handB[1]) / 2 - 8] : [leo.x, W.y3(leo.x) - 90]);
      leo.pose = (o) => { o.headTilt = 0.12; };
      pipi2.pose = (o) => { o.headTilt = -0.2; o.armF = { a: 1.3, b: 0.4 }; };
      await TALK.say('kid', '냄새는?\n아줌마가 아는 냄새.');
      pipi2.flip = false;
      pipi2.pose = (o) => { o.headTilt = 0.16; o.face.eye = 'open'; };   /* looking at Bean */
      await X.wait(0.8);
      await TALK.say('kid', '…빈 냄새?');
      leo.pose = (o) => { o.headTilt = 0.18; o.face.eye = 'happy'; o.armF = { a: 0.5, b: 0.9 }; };
      await TALK.say('leo', '아나만큼 빈 냄새 잘 아는 사람 없어.\n목욕은 늘 아나가 시켰거든.');
      /* Pipi and a jar, and Bean, who has no intention of being put in one */
      pipi2.cork = 0;
      pipi2.prop = (g, j, o, a) => { if (a.cork != null && j.handF) jar(g, j.handF[0], j.handF[1] - 6, a.cork, a.jarGlow || 0); };
      pipi2.pose = (o) => { o.armF = { a: 1.45, b: 0.2 }; o.lean = 0.14; o.face.eye = 'open'; o.face.mouth = 'open'; };
      bean.sit = 0; bean.wag = 1.2; bean.wagRate = 16;
      X.walk(pipi2, bean.x - 54, 110);
      await TALK.say('kid', '빈, 가만있어!\n냄새 좀 담자!');
      cloud.pose = (q) => { q.face.eye = 'happy'; q.face.mouth = 'smile'; };
      leo.pose = (o, a, t) => { o.face.eye = 'happy'; o.face.mouth = 'open'; o.headTilt = 0.1 + Math.sin(t * 9) * 0.02; };
      const B0 = bean.x;
      /* round and round: he wriggles off, and comes back, and off again */
      for (const [bx, px2] of [[B0 + 90, B0 + 30], [B0 - 40, B0 - 100], [B0 + 30, B0 - 26]]) {
        A.sfx('bark', 0.4); bean.run = 0.6;
        X.walk(bean, bx, 190);
        await X.walk(pipi2, px2, 150);
        pipi2.flip = bean.x < pipi2.x;
        await X.wait(0.3);
      }
      bean.run = 0; bean.sit = 1; bean.flip = pipi2.x > bean.x; bean.wag = 0.8; bean.wagRate = 10;
      pipi2.pose = (o) => { o.armF = { a: 1.2, b: 0.4 }; o.lean = 0.24; o.headTilt = 0.2; o.face.eye = 'happy'; o.face.mouth = 'smile'; };
      T.announce('빈이 겨우 가만히 앉았다. 병뚜껑을 눌러 냄새를 담는다.');
      const jarAt = () => (pipi2.j ? [pipi2.j.handF[0], pipi2.j.handF[1] - 6] : [pipi2.x, W.y3(pipi2.x) - 50]);
      await X.tap(() => [jarAt()[0], jarAt()[1] - 6, 30]);
      A.sfx('knock', 0.7); pipi2.jarGlow = 1;
      await X.tween(pipi2, 'cork', 1, 0.3);
      await X.gift('scent', W.toScreen(jarAt()[0], jarAt()[1]));
      pipi2.pose = (o) => { o.armF = { a: 2.2, b: 0.3 }; o.face.eye = 'happy'; o.face.mouth = 'open'; };
      A.sfx('bark', 0.2);
      await X.wait(1);
      /* the three, out of the tray and together in his hands */
      pipi2.pose = null; cloud.pose = null;
      leo.pose = (o) => { o.armF = { hand: [17, -22] }; o.armB = { hand: [15, -20] }; o.headTilt = 0.26; };
      await X.wait(0.6);
      S.gath = { k: 0, to: () => W.toScreen(lightAt()[0], lightAt()[1]) };
      X.spendDream(); A.sfx('join');
      for (let i = 0; i < 3; i++) A.note({ m: [76, 79, 84][i], at: 0.3 + i * 0.32, vel: 0.2, voice: 'glass', dur: 2 });
      await X.tween(S.gath, 'k', 1, 1.8, T.ease.lin);
      leo.lightK = 1; S.gath = null;
      S.trayHold = false; X.tween(S.tray, 'a', 0, 0.8);
      T.announce('냄새, 소리, 빛이 레오의 손에서 하나의 빛이 된다.');
      await X.wait(2);

      /* ---- that night, by the lake: the room the other way round ---- */
      await X.dip(async () => {
        S.actors = []; ps.night = 1;
        leo = X.actor('leo', { x: PL.BOARD_X + 120, style: F.leoAt(3), flip: false, face: { old: true }, lightK: 1 });
        leo.pose = (o) => { o.armF = { a: 1.0, b: 0.2 }; o.armB = { a: 0.5, b: 0.9 }; };
        leo.prop = (g, j, o, a) => { if (j.handF) T.mobile.draw(g, j.handF[0] - 2, j.handF[1] - 2, 0.26, { turn: true, sway: 0.5 }); if (j.handB) wishLight(g, j.handB[0], j.handB[1] - 6, a.lightK, T.time, 0.7); };
        bean = X.actor('bean', { dog: true, s: 220, x: PL.BOARD_X + 40, flip: false });
        X.cam(PL.BOARD_X + 200, py, 1); X.camSnap();
      }, { color: '#141b36', out: 1.2, in: 1 });
      X.bed(5, 0.13, 'night');
      X.walk(bean, C.PLOT + 330, 90);
      await X.walk(leo, C.PLOT + 380, 80);
      await X.wait(0.4);
      const WD = T.vig.WARD;
      const lake = T.lake({
        paint: T.vig.ward, leo: F.leoAt(3), leoFace: { old: true }, shore: true, deep: true,
        wake: { k: 0 }, look: { k: 0 }, down: { k: 0 }, win: { k: 0 },
        rhShow: true, rhText: '모빌을 물가에 걸어 주세요',
        tip: '물가에 가까이 둘수록 그림자가 크고 짙어져요',
        things: [T.mobile.thing({ x: -330, at: WD.ceiling, d: 0.08, rx: 150, ry: 30 })],
      });
      await X.view(lake, { color: '#141b36' });
      T.announce('거울 호수. 늦가을 밤의 병실. 침대에 아나가 누워 있고, 릴리가 엄마 손을 잡은 채 의자에서 졸고, 노라는 침대 발치에서 그림을 안고 잠들었다.');
      await X.age('늦가을, 병실');
      X.age('아나, 69');
      await X.wait(3.2);
      await TALK.say('leo', '…그날이랑 똑같네.\n자리만 바뀌었어.', { slow: true });
      await X.wait(0.6);
      T.announce('모빌을 물가 나뭇가지에 건다. 그림자가 침대 위 천장에 닿게. 물가에 가까울수록 그림자가 크고 짙다.');
      await lake.rhyme();
      /* the shadows go round on the hospital ceiling; the little one wakes and sees them */
      await X.wait(2.2);
      await X.tween(lake.wake, 'k', 1, 1.6, T.ease.io);
      await X.wait(0.6);
      await TALK.say('nora', '…엄마, 별이다.');
      await X.tween(lake.look, 'k', 1, 1.6, T.ease.io);
      await X.wait(0.8);
      await TALK.say('lily', '…또 이 별이네.', { slow: true });
      await X.wait(1.2);
      await X.tween(lake.down, 'k', 1, 3.4, T.ease.io);   /* and back to sleep, under it */
      await X.wait(0.6);
      /* the light he has brought, laid on the water: it goes down to her window */
      T.announce('모은 빛을 물 위에 내려놓는다. 빛을 끌어 물에 놓는다.');
      const laid = lake.offerMote();
      if (lake.mote) { lake.mote.hx = -T.view.W * 0.35 + 150; lake.mote.hy = 150; lake.mote.x = lake.mote.hx - 30; lake.mote.y = 190; }
      await laid;
      const m = lake.mote, sink = { x: m.x, y: m.y, k: 0 };
      const d0 = lake.draw;
      lake.draw = function (g, t) { d0(g, t); if (sink.k < 1) { const u = T.ease.io(sink.k), x = T.lerp(sink.x, WD.window[0] * 0.7, u), y = T.lerp(sink.y, 262, u); P.glow(g, x, y, 60, '#fff0b8', 0.7 * (1 - u * 0.6)); P.glow(g, x, y, 16, '#ffffff', 0.9 * (1 - u)); } };
      X.hush();
      await X.tween(sink, 'k', 1, 1.2, T.ease.io);
      T.shadowFall.add(lake.falls, { x: WD.window[0] * 0.7, top: 258, y: 232 + WD.window[1] * 0.7, r: 96, warm: true });
      await X.wait(0.9);
      await X.tween(lake.win, 'k', 1, 2.8, T.ease.io);
      T.announce('빛이 물속으로 가라앉아 병실 창으로 들어간다. 잠든 아나의 얼굴에 빛이 머문다.');
      await X.wait(2.4);

      /* ---- her dream: the hill, the aurora they drew, and Bean ---- */
      const D = hillDream();
      await X.view(D, { color: '#1b2440', out: 1.4, in: 0.4 });
      A.score('dream'); X.bed(2, 0.1, 'night');
      ps.night = 0;
      T.announce('꿈. 둘이 빈과 함께 손가락으로 오로라를 그리던 언덕의 밤. 지금 나이의 아나가 지쳐 풀밭에 앉아 있다. 곁에 빈이 있다.');
      A.sfx('whoosh');
      X.wait(1.2).then(() => A.sfx('laugh', 0.25));   /* the sound it is made of, very far off */
      await X.tween(D.fall, 'k', 1, 3.8, T.ease.lin);
      await X.wait(2.4);
      T.announce('레오가 언덕을 올라와 아나 곁에 앉는다.');
      await X.tween(D.near, 'k', 1, 4.4, T.ease.io);
      await X.wait(1);
      X.tween(D.lift, 'k', 1, 1.6, T.ease.io);
      await X.wait(0.8);
      await TALK.say('ana', '…레오?', { slow: true });
      await X.wait(0.4);
      await TALK.say('ana', '데리러 왔어?');
      await TALK.say('leo', '아니. 보러 왔어.');
      X.tween(D.tear, 'k', 1, 1.6);
      await X.wait(0.6);
      await TALK.say('ana', '…나 좀 지쳤어.\n당신 있는 데 가서 쉬면 안 돼?', { slow: true });
      await X.wait(1.2);
      await TALK.say('leo', '아직은.', { slow: true });
      await X.wait(0.8);
      /* his hand on hers, as hers was on Lily's in the room where he went */
      await X.tween(D.hand, 'k', 1, 1.8, T.ease.io);
      await TALK.say('leo', '릴리가 당신 손 잡고 있어.\n그 손, 아직 놓지 마.', { slow: true });
      await X.wait(1);
      X.tween(D.tear, 'k', 0.4, 2);
      X.tween(D.smile, 'k', 1, 1.6);
      await TALK.say('ana', '…노라 손은, 엄청 작다?');
      await TALK.say('leo', '알아. 웃음소리도 들었어.');
      await TALK.say('ana', '…어떻게?');
      await TALK.say('leo', '호수에 다 비쳐.');
      await X.wait(0.8);
      X.tween(D.lean, 'k', 1, 2.2, T.ease.io);
      await TALK.say('ana', '…그럼, 조금만 더 있다 갈게.', { slow: true });
      await X.wait(0.6);
      A.motif({ voice: 'felt', vel: 0.4, beat: 0.84 });
      await TALK.say('leo', '천천히.\n…아주 천천히.', { slow: true });
      await X.wait(3.4);

      /* ---- the morning, in the room as it is ---- */
      const morn = wardMorning();
      A.score(null);
      await X.view(morn, { color: '#fff6e6', out: 1.8, in: 0.6 });
      X.tween(morn.open, 'k', 1, 1.8);
      T.announce('다음 날 아침, 병실. 아나가 눈을 뜨고 앉아 있다.');
      X.age('다음 날 아침');
      X.notes(3, { vel: 0.26 });
      await X.wait(3.6);
      A.sfx('step');
      X.tween(morn.lily, 'k', 0.6, 1.4, T.ease.io);
      await X.tween(morn.nora, 'k', 1, 1.2, T.ease.io);
      await TALK.say('nora', '할머니!');
      await X.tween(morn.turn, 'k', 1, 1.2, T.ease.io);
      await TALK.say('ana', '…노라야, 별 봤어?');
      await TALK.say('nora', '응! 천장에서 빙글빙글 돌았어.');
      await X.wait(0.6);
      await TALK.say('ana', '…할아버지가 보여 준 거야.', { slow: true });
      await X.tween(morn.lily, 'k', 1, 1.4, T.ease.io);
      await TALK.say('lily', '…엄마.', { slow: true });
      await X.wait(2.4);

      /* ---- the next morning on the hill: the first loaf they have baked together ---- */
      let v2, v4;
      S.actors = []; ps.night = 0; ps.season = 'late autumn';
      leo = X.actor('leo', { x: TAB - 66, style: F.leoAt(3), chair: 1, face: { old: true } });
      const tableY = () => W.y3(TAB) - 66;
      leo.pose = (o, a) => {
        if (a.onSwing) { PL.sitOnSwing(o, ps, -1); o.headTilt = -0.1; o.face.eye = 'open'; o.face.mouth = 'smile'; return; }
        if (a.chair) { o.lean = 0.12; o.armF = { hand: F.local(o, TAB - 16, tableY()), bend: -1 }; o.armB = { hand: F.local(o, TAB - 28, tableY() + 6) }; }
        if (a.take) { o.armF = { hand: F.local(o, a.take[0], a.take[1]) }; }
        if (a.bite) { o.face.eye = 'happy'; o.face.mouth = 'open'; }
      };
      bean = X.actor('bean', { dog: true, s: 220, x: TAB + 118, sit: 1, wag: 0.5, flip: true });
      v4 = X.actor('v4', { x: TAB - 620, style: F.styles.baker, s: 140, lean: 0.06, face: { old: true }, loaf: 1 });
      v2 = X.actor('v2', { x: TAB - 680, style: Object.assign({}, F.styles.villagerB, { apron: '#f6efe2' }), s: 134 });
      v4.pose = (o, a) => { if (a.loaf) o.armF = { a: 1.25, b: 0.5 }; };
      v4.prop = (g, j, o, a) => { if (a.loaf && j.handF) loaf(g, j.handF[0] + (a.flip ? -8 : 8), j.handF[1] - 6, a.flip ? 0.2 : -0.2, 1); };
      X.cam(TAB - 185, W.y3(TAB - 185) - 84, 2.1); X.camSnap();
      await X.view(null, { color: '#fff6e6', out: 1.6, in: 1.4 });
      X.bed(4, 0.13, 'walk');
      T.announce('다음 날 아침, 언덕. 빵집 부부가 빵을 들고 올라온다.');
      X.walk(v2, TAB - 250, 70);
      await X.walk(v4, TAB - 190, 70);
      v4.flip = false; v2.flip = false;
      leo.chair = 0; leo.flip = true;
      await X.walk(leo, TAB - 120, 50);
      leo.flip = true;
      v4.pose = (o, a) => { if (a.loaf) { o.armF = { a: 1.5, b: 0.1 }; o.lean = 0.12; } o.face.eye = 'happy'; o.face.mouth = 'smile'; };
      await TALK.say('v4', '둘이 같이 구운 첫 빵이오.');
      v2.pose = (o) => { o.headTilt = 0.12; o.face.eye = 'happy'; o.face.mouth = 'line'; };
      await TALK.say('v2', '…반은 탔어.');
      const loafAt = () => (v4.j ? [v4.j.handF[0] + 8, v4.j.handF[1] - 6] : [v4.x + 30, W.y3(v4.x) - 80]);
      await X.tap(() => [loafAt()[0], loafAt()[1], 34]);
      /* he breaks off the burnt end */
      leo.take = loafAt(); A.sfx('paper', 0.4);
      await X.wait(0.7);
      leo.take = null; leo.bite = true;
      leo.prop = (g, j, o, a) => { if (a.bite && j.handF) { g.save(); g.translate(j.handF[0], j.handF[1] - 4); P.fill(g, P.ellipse(0, 0, 7, 5), '#3a2618'); P.fill(g, P.ellipse(-3, -1, 4, 3), '#c98a4a'); g.restore(); } };
      await X.wait(0.4);
      await TALK.say('leo', '탄 데가 제일 맛있죠.');
      X.gesture(v2, 'laugh', { dur: 2.6, hand: 'mouth' });
      v4.pose = (o, a) => { if (a.loaf) o.armF = { a: 1.25, b: 0.5 }; o.face.eye = 'happy'; o.face.mouth = 'open'; o.headTilt = -0.08; };
      await X.wait(2.8);

      /* ---- two years on, at dusk: one half of the swing ---- */
      leo.bite = false; leo.prop = null;
      v2.hidden = true; v4.hidden = true;
      leo.x = PL.TREE_X - 30; leo.flip = false; leo.chair = 0;
      bean.x = PL.TABLE_X + 30; bean.flip = false; bean.sit = 1;
      X.cam(PL.TREE_X + 24, W.y3(PL.TREE_X) - 112, 1.9); X.camSnap();
      ps.night = 0.5;
      await X.years(33, 35, { age: 71, season: 'late summer' });
      X.bed(5, 0.12, 'home');
      T.announce('해 질 녘, 언덕. 사과나무의 그네. 어른 둘이 앉게 넓혀 놓은 자리.');
      await X.wait(1);
      const seat = () => { const q = PL.swingSeat(ps); return [q[0] - q[2] / 4, q[1] - 6, 40]; };
      await X.tap(seat);
      await X.walk(leo, PL.swingSeat(ps)[0] - 40, 50);
      const q = PL.swingSeat(ps);
      leo.onSwing = true; leo.hill = 3; leo.x = q[0] - 16;
      S.swingAmp = 0.35; S.swinging = true; A.sfx('creak');
      await X.wait(3.2);
      A.sfx('creak', 0.4);
      await X.wait(1.4);
      await TALK.say('leo', '…아직은 아니야.\n천천히 와.', { slow: true });
      A.motif({ voice: 'felt', vel: 0.34, beat: 0.86 });
      await X.wait(4);
      X.end();
    },
  });
})();
