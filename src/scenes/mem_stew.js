/* Memory: the recipe notebook → a small kitchen on a snowy night.
   He stirs, she waits on the counter with her spoon already in her hand. Stir in circles. */
(function () {
  'use strict';
  const T = window.TYT, P = T.P, F = T.F;
  const TAU = Math.PI * 2;

  const POT = { x: 24, y: 548, rx: 82, ry: 13 };
  const COUNTER = 622, FLOORY = 822;
  const TURNS = 3;

  const S = (T.scenes.stew = { L: {}, ang: 0, total: 0, p: 0, shown: 0, last: null, drag: false, taste: { k: 0 }, joy: { k: 0 }, lastNote: 0, lastBub: 0, snow: [], steam: [] });
  const M = T.memory(S, { id: 'book', line: '평생 밥은 내가 해줄게.', seed: 9, chord: 2, lineY: 792, size: 70, ink: '#fff3d8', bandColor: '#1d2f33' });

  /* The kitchen itself. Chapter one comes back to this room on a colder night (o.cold). */
  S.paintBg = function (g, o = {}) {
    const V = T.view, x0 = -V.W / 2 - 20, w = V.W + 40;
    {
      /* wall */
      P.wash(g, P.box(x0, 0, w, 640, 0, 1), '#e6c88c', [x0, 0, w, 640], { seed: 2, len: 260, wid: 44, tone: 0.045, dir: Math.PI / 2, spread: 0.14 });
      P.tint(g, P.box(x0, 0, w, 640, 0, 1), 0, 0, 0, 640, [[0, 'rgba(120,70,30,0.30)'], [0.5, 'rgba(120,70,30,0.04)'], [1, 'rgba(120,70,30,0)']]);
      /* tiles behind the counter */
      const tiles = P.box(x0, 452, w, 172, 0.6, 3);
      P.fill(g, tiles, '#b9cfc0');
      g.save(); g.clip(tiles);
      const r = T.rng(6);
      for (let x = Math.floor(x0 / 58) * 58; x < x0 + w; x += 58) {
        for (let y = 452; y < 624; y += 58) {
          g.fillStyle = T.shade('#b9cfc0', (r() - 0.5) * 0.12);
          g.fillRect(x + 2, y + 2, 54, 54);
        }
      }
      g.restore();
      P.fill(g, P.box(x0, 446, w, 9, 0.6, 4), '#93ad9f');

      /* window: snow is falling tonight */
      P.fill(g, P.box(-548, 150, 240, 280, 0.8, 10), '#f3e7cc');
      const ns = g.createLinearGradient(0, 164, 0, 416);
      if (o.dusk) {
        /* the kitchen he built in Welcome Harbor looks out on the hill and the apple tree */
        ns.addColorStop(0, '#93a6d6'); ns.addColorStop(0.6, '#f0c3a2'); ns.addColorStop(1, '#ffe0a8');
        g.fillStyle = ns; g.fillRect(-534, 164, 212, 252);
        g.fillStyle = '#84a184'; g.beginPath(); g.moveTo(-534, 416); g.lineTo(-534, 372); g.quadraticCurveTo(-430, 330, -322, 380); g.lineTo(-322, 416); g.fill();
        g.fillStyle = '#6b4f52'; g.fillRect(-388, 318, 7, 52);
        P.fill(g, P.ellipse(-384, 300, 34, 30), '#5f9a6a');
        [[-398, 296], [-374, 308], [-380, 286]].forEach((q) => P.fill(g, P.circle(q[0], q[1], 4), '#c9433a'));
      } else {
        ns.addColorStop(0, '#1f2b4d'); ns.addColorStop(1, '#3b4a78');
        g.fillStyle = ns; g.fillRect(-534, 164, 212, 252);
        g.fillStyle = '#2a3559';
        g.fillRect(-534, 352, 70, 64); g.fillRect(-470, 330, 60, 86); g.fillRect(-400, 362, 78, 54);
        g.fillStyle = '#e9c66f'; g.fillRect(-452, 346, 9, 11); g.fillRect(-380, 378, 9, 11); g.fillRect(-512, 372, 9, 11);
      }
      if (!o.cold) { g.fillStyle = '#e8eef8'; g.fillRect(-534, 404, 212, 12); }
      P.fill(g, P.box(-432, 164, 8, 252, 0.4, 11), '#f3e7cc');
      P.fill(g, P.box(-560, 424, 264, 16, 0.8, 12), '#f3e7cc');
      /* a short curtain */
      P.fill(g, P.soft([[-552, 140], [-300, 140], [-304, 196], [-340, 214], [-380, 196], [-428, 216], [-470, 198], [-512, 214], [-548, 196]]), '#c9573f');
      g.fillStyle = 'rgba(255,240,220,0.5)';
      for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(-530 + i * 27, 172 + (i % 2) * 12, 3, 0, TAU); g.fill(); }

      /* shelf with the things a cook collects */
      P.fill(g, P.box(150, 296, 400, 14, 0.8, 20), '#9a6b43');
      P.fill(g, P.box(170, 310, 8, 34, 0.5, 21), '#7f5534'); P.fill(g, P.box(520, 310, 8, 34, 0.5, 22), '#7f5534');
      const jar = (x, wj, hj, col, lid) => { P.fill(g, P.rr(x, 296 - hj, wj, hj, 7), col); P.fill(g, P.rr(x - 2, 296 - hj - 7, wj + 4, 10, 3), lid); g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x + 5, 296 - hj + 6, 5, hj - 14); };
      jar(170, 40, 62, '#c98a4b', '#7f5534'); jar(218, 34, 48, '#a9443a', '#e9dcc3'); jar(260, 44, 76, '#e9dcc3', '#7fa5a8');
      P.fill(g, P.poly([[330, 296], [394, 296], [386, 262], [338, 262]]), '#7fa5a8');                 /* bowls */
      P.fill(g, P.poly([[336, 262], [388, 262], [382, 240], [342, 240]]), '#f1e6cf');
      P.fill(g, P.rr(420, 246, 50, 50, 14), '#d7a23c');                                              /* teapot */
      g.strokeStyle = '#d7a23c'; g.lineWidth = 6; g.beginPath(); g.arc(474, 268, 13, -1.3, 1.3); g.stroke();
      P.line(g, 420, 262, 404, 250, 6, '#d7a23c');
      P.fill(g, P.rr(436, 238, 18, 10, 4), '#b8862c');
      P.fill(g, P.poly([[498, 296], [536, 296], [530, 262], [504, 262]]), '#b9532f');                 /* herb pot */
      g.strokeStyle = '#5d8a57'; g.lineWidth = 5; g.lineCap = 'round';
      [[-16, -40], [-4, -52], [8, -44], [20, -34], [0, -30]].forEach((d) => { g.beginPath(); g.moveTo(517, 262); g.quadraticCurveTo(517 + d[0] * 0.3, 262 + d[1] * 0.7, 517 + d[0], 262 + d[1]); g.stroke(); });
      /* hanging things */
      P.line(g, -250, 300, -90, 300, 5, '#7f5534');
      [[-228, 86, '#59636a'], [-176, 70, '#8a9aa0'], [-124, 98, '#59636a']].forEach((q) => {
        P.line(g, q[0], 300, q[0], 300 + q[1] * 0.45, 3, '#6b5a48');
        P.fill(g, P.ellipse(q[0], 300 + q[1] * 0.45 + q[1] * 0.3, q[1] * 0.2, q[1] * 0.3), q[2]);
      });

      /* floor */
      P.wash(g, P.box(x0, FLOORY, w, 90, 0, 30), '#b98a5a', [x0, FLOORY, w, 90], { seed: 31, len: 300, wid: 16, tone: 0.06, spread: 0.04 });
      const DT = T.detail;
      if (DT && DT.on()) {
        DT.boards(g, x0, FLOORY, w, 90, 34, { bh: 18 });
        DT.herbs(g, 330, 302, 4, 35);   /* drying under the shelf */
        g.save(); g.beginPath(); g.rect(x0, 452, w, 172); g.clip();   /* glaze on the tiles */
        for (let x = Math.floor(x0 / 58) * 58; x < x0 + w; x += 58) for (let y = 452; y < 624; y += 58) { g.fillStyle = 'rgba(255,255,255,0.16)'; g.fillRect(x + 6, y + 6, 16, 4); }
        g.restore();
        /* the recipe card pinned up by the window */
        g.save(); g.translate(-640, 300); g.rotate(0.05); P.fill(g, P.rr(-34, -42, 68, 84, 3), '#fbf4e2'); g.fillStyle = 'rgba(51,64,92,0.45)'; for (let i = 0; i < 5; i++) g.fillRect(-24, -26 + i * 13, 40 - (i % 2) * 12, 1.6); P.fill(g, P.circle(0, -38, 4), '#c9573f'); g.restore();
      }
      /* cabinets */
      const cab = P.box(x0, COUNTER, w, FLOORY - COUNTER + 4, 0.6, 32);
      P.wash(g, cab, '#4f7d7c', [x0, COUNTER, w, 210], { seed: 33, len: 180, wid: 30, tone: 0.05, dir: Math.PI / 2, spread: 0.12 });
      P.tint(g, cab, 0, COUNTER, 0, FLOORY, [[0, 'rgba(10,30,36,0.36)'], [0.25, 'rgba(10,30,36,0.06)'], [1, 'rgba(10,30,36,0.26)']]);
      for (let x = Math.floor(x0 / 150) * 150 + 30; x < x0 + w; x += 150) {
        if (x > -130 && x < 150) continue;
        g.strokeStyle = 'rgba(20,48,52,0.4)'; g.lineWidth = 3; g.strokeRect(x, COUNTER + 34, 124, 150);
        P.fill(g, P.circle(x + 106, COUNTER + 110, 6), '#d9b45a');
      }
      /* oven under the hob */
      P.fill(g, P.box(-118, COUNTER + 6, 284, FLOORY - COUNTER - 6, 0.8, 34), '#e9e3d2');
      P.fill(g, P.rr(-92, COUNTER + 62, 232, 110, 10), '#3a4648');
      P.fill(g, P.rr(-78, COUNTER + 76, 204, 82, 6), '#2a3436');
      P.fill(g, P.rr(-84, COUNTER + 40, 216, 9, 4), '#b5bdb8');
      [-70, -30, 110, 142].forEach((x) => P.fill(g, P.circle(x, COUNTER + 24, 8), '#59636a'));
      /* worktop */
      P.fill(g, P.box(x0, COUNTER - 8, w, 20, 0.8, 35), '#f0e2c4');
      P.fill(g, P.box(x0, COUNTER + 10, w, 5, 0.5, 36), '#c7b48d');
      /* hob */
      P.fill(g, P.rr(-108, COUNTER - 14, 264, 10, 4), '#3a4648');
      P.fill(g, P.rr(-60, COUNTER - 22, 168, 10, 3), '#2a3436');
      /* sink side: the pan from her last attempt */
      P.fill(g, P.rr(-506, COUNTER - 14, 150, 9, 4), '#c9d0ca');
      if (!o.cold) {
        g.save(); g.translate(-430, COUNTER - 16); g.rotate(-0.34);
        P.fill(g, P.rr(-58, -9, 96, 18, 8), '#2f3538');
        P.fill(g, P.rr(34, -4, 74, 8, 4), '#2f3538');
        P.fill(g, P.ellipse(-12, -8, 38, 6), '#17191b');
        g.restore();
      }
      /* a plate of very black toast by her side */
      if (!o.cold) {
        P.fill(g, P.ellipse(398, COUNTER - 10, 46, 7), '#f6efe0');
        P.fill(g, P.rough([[372, COUNTER - 30], [404, COUNTER - 34], [408, COUNTER - 14], [376, COUNTER - 12]], 1.2, 40), '#2b2523');
        P.fill(g, P.rough([[396, COUNTER - 38], [428, COUNTER - 34], [426, COUNTER - 16], [394, COUNTER - 18]], 1.2, 41), '#3a2e29');
      }
      /* pendant lamp */
      P.line(g, 24, 0, 24, 196, 3, '#5c4a3a');
      P.fill(g, P.poly([[-28, 250], [76, 250], [50, 196], [-2, 196]]), '#c9573f');
      P.fill(g, P.rr(-30, 246, 108, 9, 4), '#a8412e');
    }
  };
  S.build = function () {
    M.rebuild();
    const V = T.view, x0 = -V.W / 2 - 20, w = V.W + 40;
    S.L.bg = T.bake(x0, 0, w, 900, (g) => S.paintBg(g));
    S.L.bg2 = null;
  };
  /* The last chapter plays this scene again, forty-five years on, in the kitchen he built:
     other bodies in the same two places, no paper frame, nothing for the hand to do. */
  /* the later kitchen's backdrop; baked again whenever the screen has changed size under it */
  function bakeLater() {
    const V = T.view, x0 = -V.W / 2 - 20, w = V.W + 40;
    if (!S.L.bg2 || S.bg2Gen !== T.gen) { S.L.bg2 = T.bake(x0, 0, w, 900, (g) => S.paintBg(g, { cold: true, dusk: true })); S.bg2Gen = T.gen; }
  }
  S.restage = function (cast) {
    bakeLater();
    S.plain = true; S.cast = cast;
    S.ang = -0.6; S.shown = 1; S.p = 1; S.taste.k = 0; S.joy.k = 0; S.drag = false;
    if (!S.steam.length) { const r = T.rng(3); for (let i = 0; i < 9; i++) S.steam.push({ ph: r() * 10, x: (r() - 0.5) * 120, sp: 0.5 + r() * 0.5 }); }
  };

  S.enter = function () {
    S.plain = false; S.cast = null;
    M.enter();
    S.ang = -0.6; S.total = 0; S.p = 0; S.shown = 0; S.last = null; S.drag = false;
    S.taste.k = 0; S.joy.k = 0; S.lastNote = 0; S.lastBub = 0;
    if (!S.snow.length) {
      const r = T.rng(3);
      for (let i = 0; i < 34; i++) S.snow.push({ x: r() * 212, y: r() * 252, v: 14 + r() * 22, s: 1.2 + r() * 1.8, ph: r() * 9 });
      for (let i = 0; i < 9; i++) S.steam.push({ ph: r() * 10, x: (r() - 0.5) * 120, sp: 0.5 + r() * 0.5 });
    }
  };

  function stir(d) {
    if (M.done) return;
    S.ang += d;
    S.total += Math.abs(d);
    M.touch();
    S.p = T.clamp(S.total / (TAU * TURNS));
    const n = Math.floor(S.total / (Math.PI * 0.75));
    if (n > S.lastNote) { S.lastNote = n; M.note({ voice: 'pluck', vel: 0.5 }); }
    const b = Math.floor(S.total / 0.55);
    if (b > S.lastBub) { S.lastBub = b; if (b % 2) T.audio.sfx('bubble', (b * 0.37) % 1); }
    if (S.p >= 1) serve();
  }
  async function serve() {
    if (M.done) return;
    const k = S.clock;
    M.finish();
    await k.tween(S.taste, 'k', 1, 1.1, T.ease.io);
    await k.wait(0.45);
    T.audio.sfx('join');
    k.tween(S.joy, 'k', 1, 0.7, T.ease.out);
    await k.wait(0.9);
    k.tween(S.taste, 'k', 0, 1.2, T.ease.io);
  }

  S.pointer = function (type, x, y) {
    if (M.pointerDone(type)) return;
    const near = Math.hypot(x - POT.x, (y - POT.y) * 1.2) < 300;
    T.cursor(S.drag ? 'grabbing' : near ? 'grab' : 'default');
    if (type === 'down' && near) { S.drag = true; S.last = Math.atan2(y - POT.y, x - POT.x); M.touch(); }
    if (type === 'up') { S.drag = false; S.last = null; }
    if (S.drag && type === 'move' && S.last != null) {
      if (Math.hypot(x - POT.x, y - POT.y) < 14) return; /* too close to the centre to mean a direction */
      const a = Math.atan2(y - POT.y, x - POT.x);
      let d = a - S.last;
      if (d > Math.PI) d -= TAU; else if (d < -Math.PI) d += TAU;
      S.last = a;
      if (Math.abs(d) < 1.2) stir(d);
    }
  };
  S.key = function (key) {
    if (M.ready && (key === ' ' || key === 'Enter')) { M.tap(); return; }
    if (key === 'ArrowRight' || key === ' ' || key === 'Enter' || key === 'ArrowDown') stir(0.5);
    else if (key === 'ArrowLeft' || key === 'ArrowUp') stir(-0.5);
    else return false;
  };

  S.update = function (dt) {
    M.update(dt);
    S.shown += (S.p - S.shown) * (1 - Math.exp(-dt * 5));
    for (const f of S.snow) { f.y += f.v * dt; f.ph += dt; if (f.y > 252) { f.y = 0; f.x = (f.x * 5.7 + 31) % 212; } }
    /* left alone, the spoon drifts to rest */
    if (!S.drag && !M.done) S.ang += Math.sin(T.time * 0.7) * 0.02 * dt;
  };

  S.draw = function (g) {
    const t = T.time, p = S.shown;
    const [bx, by] = T.par(0.3);
    const plain = S.plain, cast = S.cast || { leo: F.styles.leo, ana: F.styles.ana };
    g.save(); g.translate(bx * 0.5, by * 0.5);
    if (plain) bakeLater();
    T.blit(g, plain ? S.L.bg2 : S.L.bg);
    if (plain) S.ang += 0.035;

    /* snow in the window */
    g.save(); g.beginPath(); g.rect(-534, 164, 212, plain ? 0 : 240); g.clip();
    g.fillStyle = '#f2f5fb';
    for (const f of S.snow) { g.globalAlpha = 0.85; g.beginPath(); g.arc(-534 + f.x + Math.sin(f.ph * 1.2) * 6, 164 + f.y, f.s, 0, TAU); g.fill(); }
    g.restore();
    /* smoke from the burnt pan, still sulking */
    g.strokeStyle = plain ? 'rgba(90,84,80,0)' : 'rgba(90,84,80,0.35)'; g.lineWidth = 5; g.lineCap = 'round';
    g.beginPath();
    for (let j = 0; j < 16; j++) { const yy = COUNTER - 40 - j * 9; g.lineTo(-446 + Math.sin(t * 1.3 + j * 0.5) * (3 + j * 0.9), yy); }
    g.stroke();

    /* lamp light */
    P.glow(g, 24, 262, 330, '#ffdc9a', 0.34 + p * 0.1);
    g.save(); g.globalCompositeOperation = 'screen';
    const cone = g.createLinearGradient(0, 250, 0, 640);
    cone.addColorStop(0, 'rgba(255,224,160,0.22)'); cone.addColorStop(1, 'rgba(255,224,160,0)');
    g.fillStyle = cone;
    g.beginPath(); g.moveTo(-26, 252); g.lineTo(74, 252); g.lineTo(300, 640); g.lineTo(-250, 640); g.closePath(); g.fill();
    g.restore();

    /* flame */
    for (let i = 0; i < 7; i++) {
      const fx = -36 + i * 20, fh = 9 + Math.sin(t * 11 + i * 1.9) * 3;
      g.fillStyle = 'rgba(120,170,235,0.9)';
      g.beginPath(); g.moveTo(fx - 6, COUNTER - 22); g.quadraticCurveTo(fx, COUNTER - 22 - fh * 2, fx + 6, COUNTER - 22); g.fill();
    }

    /* pot: inside, stew, then the front wall */
    const stew = T.ramp(['#d8b27f', '#cf8d4e', '#b9532f', '#a6452a'], p * 3);
    P.fill(g, P.ellipse(POT.x, POT.y, POT.rx + 6, POT.ry + 3), '#1f3f48');
    P.fill(g, P.ellipse(POT.x, POT.y + 2, POT.rx, POT.ry), stew);
    /* bits that come up as it thickens */
    const bits = [['#e58a3a', -40, 2], ['#f1dfb5', 28, -3], ['#e58a3a', 52, 4], ['#7fa35c', -8, 5], ['#f1dfb5', -58, -1], ['#e58a3a', 6, -5]];
    bits.forEach((b, i) => {
      const a = T.clamp(p * 7 - i);
      if (a <= 0) return;
      const ang = S.ang * 0.45 + i * 1.1;
      g.globalAlpha = a;
      P.fill(g, P.ellipse(POT.x + b[1] * 0.9 + Math.cos(ang) * 10, POT.y + 2 + b[2] + Math.sin(ang) * 2.4, 8, 4.2), b[0]);
    });
    g.globalAlpha = 1;
    /* a swirl that follows the spoon */
    g.save(); g.beginPath(); g.ellipse(POT.x, POT.y + 2, POT.rx, POT.ry, 0, 0, TAU); g.clip();
    g.strokeStyle = 'rgba(255,240,210,0.35)'; g.lineWidth = 3;
    for (let k = 0; k < 2; k++) {
      g.beginPath();
      for (let j = 0; j <= 14; j++) { const a = S.ang - j * 0.2 - k * Math.PI; const rr = 0.9 - j * 0.03; g.lineTo(POT.x + Math.cos(a) * POT.rx * rr * 0.8, POT.y + 2 + Math.sin(a) * POT.ry * rr * 0.8); }
      g.stroke();
    }
    g.restore();

    /* the cook */
    const tk = T.ease.io(S.taste.k), joy = S.joy.k;
    const tip = [POT.x + Math.cos(S.ang) * 46, POT.y + 2 + Math.sin(S.ang) * 7];
    const ana = { x: 262, y: COUNTER - 34, s: plain ? 350 : 372, style: cast.ana, flip: true, sit: true };
    const sniff = T.smooth(T.clamp(p * 1.4));
    ana.lean = 0.04 + sniff * 0.22 + tk * 0.24 - joy * 0.2;
    ana.headTilt = 0.02 + sniff * 0.12 - joy * 0.22;
    /* her feet swing a little while she waits: slow, small, and not quite together */
    const sw = (t * 1.5) % (Math.PI * 2), amp = 0.06 + sniff * 0.05 + joy * 0.1;
    ana.legF = { a: Math.PI / 2 - 0.1, b: Math.PI / 2 - 0.25 + Math.sin(sw) * amp };
    ana.legB = { a: Math.PI / 2 - 0.2, b: Math.PI / 2 - 0.2 + Math.sin(sw * 1 + 2.1) * amp * 0.8 };
    ana.face = { eye: joy > 0.4 ? 'happy' : sniff > 0.75 && tk < 0.3 ? 'closed' : 'open', mouth: tk > 0.7 && joy < 0.3 ? 'open' : 'smile', blush: 0.24 + joy * 0.2, old: plain };
    const aj0 = [ana.x - 46 - sniff * 14, COUNTER - 104];
    ana.armF = joy > 0.02 ? { a: T.lerp(0.9, 2.5, joy) + Math.sin(t * 10) * 0.12 * joy, b: 0.5 } : { hand: F.local(ana, aj0[0], aj0[1]) };
    ana.armB = joy > 0.02 ? { a: T.lerp(0.4, 2.2, joy) + Math.cos(t * 10) * 0.12 * joy, b: 0.5 } : { a: 0.5, b: 0.9 };

    const leo = { x: -132, y: FLOORY - F.hipHeight(cast.leo, plain ? 386 : 400), s: plain ? 386 : 400, style: cast.leo, skip: { armF: true } };
    leo.lean = 0.07 + tk * 0.06;
    leo.headTilt = 0.16 - tk * 0.22;
    leo.face = { eye: joy > 0.4 ? 'happy' : 'open', mouth: 'smile' };
    if (plain) { leo.face.old = true; leo.lean = (leo.lean || 0) + 0.06; }
    leo.armB = { hand: F.local(leo, POT.x - POT.rx - 12, POT.y + 30) };
    /* spoon hand: stirring, then lifted across to her */
    const ms = plain ? 350 / 372 : 1;   /* she is a little smaller now */
    const mouth = [ana.x - (62 + sniff * 16) * ms, ana.y - 150 * ms + (plain ? 16 : 0)];
    const stirHand = [tip[0] - 62, tip[1] - 58];
    const offer = [mouth[0] - 96, mouth[1] + 26];
    const hand = [T.lerp(stirHand[0], offer[0], tk), T.lerp(stirHand[1], offer[1], tk) - Math.sin(tk * Math.PI) * 40];
    leo.x += tk * (plain ? 62 : 58);
    leo.armF = { hand: F.local(leo, hand[0], hand[1]) };
    const lj = F.person(g, leo);
    /* apron */
    g.save();
    g.translate(leo.x, leo.y); g.rotate(leo.lean);
    P.fill(g, P.rr(4, -70, 34, 150, 10), '#f1e6cf');
    P.line(g, 4, -30, -30, -34, 4, '#f1e6cf');
    g.restore();

    const aj = F.person(g, ana);
    /* her own spoon, held like a flag */
    if (joy < 0.02 && !plain) { P.line(g, aj.handF[0], aj.handF[1] + 6, aj.handF[0] - 4, aj.handF[1] - 44, 4, '#c9d0ca'); P.fill(g, P.ellipse(aj.handF[0] - 5, aj.handF[1] - 50, 7, 10, -0.1), '#c9d0ca'); }

    /* wooden spoon, held in his hand, then his arm over it */
    const hj = lj.handF ? [lj.handF[0] + 2, lj.handF[1] + 4] : hand;
    const herMouth = aj.head ? [aj.head[0] - 14 * ms, aj.head[1] + 14 * ms] : mouth;
    const aim = [T.lerp(tip[0], herMouth[0], tk), T.lerp(tip[1], herMouth[1], tk)];
    const SL = 92 * ms, dx = aim[0] - hj[0], dy = aim[1] - hj[1], dl = Math.hypot(dx, dy) || 1;
    const spoonTip = [hj[0] + (dx / dl) * Math.min(SL, dl), hj[1] + (dy / dl) * Math.min(SL, dl)];
    P.line(g, hj[0] - (dx / dl) * 12, hj[1] - (dy / dl) * 12, spoonTip[0], spoonTip[1], 6, '#b98a5a');
    P.fill(g, P.ellipse(spoonTip[0], spoonTip[1], 12, 8, 0.4), tk > 0.2 ? stew : '#b98a5a');
    F.person(g, Object.assign({}, leo, { only: 'armF', skip: null }));

    /* pot front */
    const body = P.soft([[POT.x - POT.rx - 6, POT.y], [POT.x - POT.rx - 4, COUNTER - 34], [POT.x - POT.rx + 14, COUNTER - 22], [POT.x + POT.rx - 14, COUNTER - 22], [POT.x + POT.rx + 4, COUNTER - 34], [POT.x + POT.rx + 6, POT.y], [POT.x + POT.rx - 10, POT.y + 14], [POT.x, POT.y + 17], [POT.x - POT.rx + 10, POT.y + 14]]);
    P.fill(g, body, '#2d6672');
    P.tint(g, body, POT.x - POT.rx, 0, POT.x + POT.rx, 0, [[0, 'rgba(255,255,255,0.20)'], [0.3, 'rgba(255,255,255,0)'], [1, 'rgba(0,20,30,0.3)']]);
    g.strokeStyle = '#e9dcc3'; g.lineWidth = 3.4;
    g.beginPath(); g.ellipse(POT.x, POT.y + 1, POT.rx + 5, POT.ry + 3, 0, 0.05 * Math.PI, 0.95 * Math.PI); g.stroke();
    P.fill(g, P.rr(POT.x - POT.rx - 26, POT.y + 14, 26, 12, 6), '#22515b');
    P.fill(g, P.rr(POT.x + POT.rx, POT.y + 14, 26, 12, 6), '#22515b');

    /* steam: thin at first, then the whole room smells of it */
    const amount = 0.3 + p * 0.7;
    S.steam.forEach((s, i) => {
      if (i > 2 + p * 7) return;
      const life = ((t * 0.14 * s.sp + s.ph) % 1);
      const drift = sniff * life * life * 90;   /* it leans towards her */
      const x = POT.x + s.x * 0.5 + Math.sin(t * 0.8 + s.ph * 3 + life * 5) * (6 + life * 26) + drift;
      const y = POT.y - 14 - life * 270;
      P.glow(g, x, y, 22 + life * 46, '#fff3dc', Math.sin(life * Math.PI) * 0.2 * amount);
    });
    g.save(); g.globalCompositeOperation = 'screen'; g.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const life = ((t * 0.1 + i * 0.37) % 1);
      g.strokeStyle = T.rgba('#fff3dc', Math.sin(life * Math.PI) * 0.26 * amount); g.lineWidth = 3.5;
      g.beginPath();
      for (let j = 0; j <= 10; j++) {
        const yy = POT.y - 20 - life * 150 - j * 11;
        g.lineTo(POT.x - 34 + i * 34 + Math.sin(j * 0.75 + t * 1.1 + i * 2) * (5 + j * 1.1) + sniff * life * 40, yy);
      }
      g.stroke();
    }
    g.restore();
    g.restore();

    if (plain) return;
    const h = M.hint(1.8);
    if (h > 0 && S.p < 0.97) {
      const pts = [];
      for (let i = 0; i <= 28; i++) { const a = -Math.PI / 2 + (i / 28) * TAU; pts.push([POT.x + Math.cos(a) * 130, POT.y - 10 + Math.sin(a) * 74]); }
      P.fingerHint(g, pts, (t * 0.4) % 1, h);
    }
    M.drawOver(g);
  };
})();
