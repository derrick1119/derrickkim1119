/* Take Your Time — other places the later chapters cut to.
   The mirror lake shows the living world when someone there is thinking of him: a picture in
   the water, cool and true-coloured, that trembles when it is touched and cannot be held.
   The pictures themselves (T.vig) are mostly the old kitchen, as the years go by in it. */
(function () {
  'use strict';
  const T = window.TYT, P = T.P, F = T.F, K = T.town;
  const TAU = Math.PI * 2;
  const COUNTER = 622, FLOORY = 822;

  /* ---------- the lake ---------- */
  /* o: { paint(g, t), leo: style, nana: bool, mirror: 0..1 (how plainly he sees himself), warm: bool } */
  T.lake = function (o) {
    const L = Object.assign({ dark: true, rip: [], amp: 0, reach: { k: 0 }, mote: null, fade: { a: 1 }, mirror: 0.25 }, o);
    const SC = 0.7, TOP = 232, PH = 640;
    L.build = function () {
      const V = T.view;
      const c = document.createElement('canvas');
      const ps = Math.max(0.5, V.ps * SC);
      c.width = Math.ceil(V.W * ps); c.height = Math.ceil(PH / SC * ps);
      L.off = c; L.ops = ps; L.gen = T.gen;
      /* a second sheet: the strips are laid here, then its edges are feathered */
      const m = document.createElement('canvas');
      m.width = Math.ceil(V.W * SC * V.ps); m.height = Math.ceil(PH * V.ps);
      L.mid = m;
    };
    L.touch = function (x, y) {
      if (y < TOP - 30) return;
      L.rip.push({ x, y, t: T.time });
      if (L.rip.length > 6) L.rip.shift();
      L.amp = Math.min(1, L.amp + 0.7);
      T.audio.sfx('star', (x * 0.001 + 0.5) % 1);
      if (L.onTouch) L.onTouch(x, y);
    };
    /* the one dream he may send: a light he can carry to the water */
    L.pointer = function (type, x, y) {
      const m = L.mote;
      if (!m || m.gone) return false;
      if (type === 'down' && Math.hypot(x - m.x, y - m.y) < 80) { m.held = true; return true; }
      if (type === 'move' && m.held) { m.x = x; m.y = y; return true; }
      if (type === 'up' && m.held) { m.held = false; if (m.y > TOP + 60) L.release(); return true; }
      return false;
    };
    L.key = function (key) { if (L.mote && !L.mote.gone && (key === ' ' || key === 'Enter' || key === 'ArrowDown')) { L.mote.x = 40; L.mote.y = 520; L.release(); return true; } return false; };
    L.want = function () { return L.mote && !L.mote.gone ? 'mote' : null; };
    L.release = function () { const m = L.mote; if (!m || m.gone) return; m.gone = true; L.rip.push({ x: m.x, y: m.y, t: T.time }); L.amp = 1; if (m.res) m.res(); };
    L.update = function (dt) { L.amp = Math.max(0, L.amp - dt * 0.5); const m = L.mote; if (m && !m.held && !m.gone) { m.x += (m.hx - m.x) * dt * 3; m.y += (m.hy + Math.sin(T.time * 1.6) * 8 - m.y) * dt * 3; } };

    L.draw = function (g, t) {
      const V = T.view, W = V.W;
      if (!L.off || L.gen !== T.gen) L.build();
      /* dusk over the far bank */
      const sky = g.createLinearGradient(0, 0, 0, 240);
      sky.addColorStop(0, '#5d6aa6'); sky.addColorStop(0.7, '#c99aa6'); sky.addColorStop(1, '#f0c39a');
      g.fillStyle = sky; g.fillRect(-W / 2, 0, W, 240);
      g.fillStyle = '#3c5568';
      g.beginPath(); g.moveTo(-W / 2, 240); g.lineTo(-W / 2, 150);
      for (let x = -W / 2; x <= W / 2; x += 40) g.lineTo(x, 168 + T.noise(x * 0.004, 5) * 34 + Math.sin(x * 0.013) * 10);
      g.lineTo(W / 2, 240); g.closePath(); g.fill();
      [-300, 120, 520, 760, -640].forEach((x, i) => { K.tree(g, x, 196 + (i % 2) * 8, 0.55, '#2f4a58', '#28404e', '#22343f', Math.sin(t * 0.7 + i)); });
      [-80, 380, 640].forEach((x, i) => P.glow(g, x, 188, 34, '#ffd98a', 0.7 * (0.8 + 0.2 * Math.sin(t * 2 + i))));
      /* water */
      const wg = g.createLinearGradient(0, 206, 0, 900);
      wg.addColorStop(0, '#3a5a78'); wg.addColorStop(0.25, '#274562'); wg.addColorStop(1, '#172c44');
      g.fillStyle = wg; g.fillRect(-W / 2, 206, W, 700);
      g.fillStyle = 'rgba(240,195,154,0.16)'; g.fillRect(-W / 2, 206, W, 30);

      /* the picture, painted off to one side and laid on the water in trembling strips */
      const og = L.off.getContext('2d'), ps = L.ops;
      const cw = L.off.width, ch = L.off.height;
      og.setTransform(1, 0, 0, 1, 0, 0);
      og.globalAlpha = 1; og.globalCompositeOperation = 'source-over';
      og.clearRect(0, 0, cw, ch);
      og.setTransform(ps, 0, 0, ps, (W / 2) * ps, 0);
      if (L.paint) L.paint(og, t, L);
      /* cool the colours */
      og.setTransform(1, 0, 0, 1, 0, 0);
      og.globalAlpha = 1;
      og.globalCompositeOperation = 'source-atop';
      og.fillStyle = L.warm ? 'rgba(60,90,130,0.12)' : 'rgba(40,70,112,0.24)'; og.fillRect(0, 0, cw, ch);
      og.globalCompositeOperation = 'source-over';
      /* lay it down in trembling strips, then let the edges melt into the water */
      const pw = W * SC, x0 = -pw / 2, mg = L.mid.getContext('2d'), mw = L.mid.width, mh = L.mid.height, vs = T.view.ps;
      mg.setTransform(1, 0, 0, 1, 0, 0); mg.globalCompositeOperation = 'source-over'; mg.globalAlpha = 1;
      mg.clearRect(0, 0, mw, mh);
      const strip = 6, sh = strip / SC;
      for (let y = 0; y < PH; y += strip) {
        const dx = Math.sin(y * 0.045 + t * 1.5) * (1.4 + L.amp * 9) + Math.sin(y * 0.11 - t * 2.3) * L.amp * 5;
        mg.drawImage(L.off, 0, (y / SC) * ps, cw, sh * ps, dx * vs, y * vs, mw, (strip + 1) * vs);
      }
      mg.globalCompositeOperation = 'destination-in';
      let mk = mg.createLinearGradient(0, 0, mw, 0);
      mk.addColorStop(0, 'rgba(0,0,0,0)'); mk.addColorStop(0.11, 'rgba(0,0,0,1)'); mk.addColorStop(0.89, 'rgba(0,0,0,1)'); mk.addColorStop(1, 'rgba(0,0,0,0)');
      mg.fillStyle = mk; mg.fillRect(0, 0, mw, mh);
      mk = mg.createLinearGradient(0, 0, 0, mh);
      mk.addColorStop(0, 'rgba(0,0,0,0)'); mk.addColorStop(0.12, 'rgba(0,0,0,1)'); mk.addColorStop(0.86, 'rgba(0,0,0,1)'); mk.addColorStop(1, 'rgba(0,0,0,0)');
      mg.fillStyle = mk; mg.fillRect(0, 0, mw, mh);
      g.save();
      g.globalAlpha = L.fade.a;
      g.drawImage(L.mid, x0, TOP, pw, PH);
      g.restore();
      /* rings where a finger went in */
      g.save(); g.lineWidth = 2;
      for (const r of L.rip) {
        const age = t - r.t;
        if (age > 2.6) continue;
        for (let k = 0; k < 3; k++) {
          const a = age - k * 0.3; if (a < 0) continue;
          g.strokeStyle = T.rgba('#dfeeff', 0.5 * (1 - a / 2.6));
          g.beginPath(); g.ellipse(r.x, r.y, a * 110, a * 44, 0, 0, TAU); g.stroke();
        }
      }
      g.restore();

      /* the near bank, and whoever has come to look */
      const bx = -W / 2 + 250;
      P.fill(g, P.soft([[-W / 2 - 40, 150], [-W / 2 + 120, 150], [bx + 90, 178], [bx + 190, 226], [bx + 110, 252], [-W / 2 + 60, 300], [-W / 2 - 40, 330]]), '#3f6058');
      P.fill(g, P.soft([[-W / 2 - 40, 150], [-W / 2 + 120, 150], [bx + 90, 178], [bx + 188, 224], [bx + 60, 206], [-W / 2 - 40, 196]]), '#58806c');
      const ls = L.leo || F.styles.leoHome, s = 190;
      const reach = T.ease.io(L.reach.k);
      const lo = { x: bx + 96, y: 208, s, style: ls, sit: true, lean: 0.16 + reach * 0.14, headTilt: 0.26, legF: { a: Math.PI / 2 - 0.5, b: 0.5 }, legB: { a: Math.PI / 2 - 0.62, b: 0.62 }, face: Object.assign({ blush: 0.14 }, L.leoFace) };
      lo.armF = reach > 0.02 ? { a: 0.5 + reach * 0.5, b: 0.1 } : { a: 0.5, b: 1.0 };
      lo.armB = { a: 0.3, b: 0.9 };
      /* his reflection, upside down in the dark water under him */
      g.save();
      g.beginPath(); g.rect(-W / 2, 250, W, 400); g.clip();
      g.translate(Math.sin(t * 1.4) * 2.5, 2 * 262); g.scale(1, -1);
      g.globalAlpha = L.mirror * (0.75 + 0.25 * Math.sin(t * 1.1));
      F.person(g, lo);
      g.restore();
      if (L.nana) { const no = { x: bx - 4, y: 206 - F.hipHeight(F.styles.nana, 158), s: 158, style: F.styles.nana, lean: 0.1, headTilt: 0.14, armF: { a: 0.9, b: 0.5 }, face: { blush: 0.2 } }; const j = F.person(g, no); P.glow(g, j.handF[0], j.handF[1] + 20, 60, '#ffd98a', 0.6); P.fill(g, P.rr(j.handF[0] - 6, j.handF[1] + 8, 12, 16, 3), '#fff0b8'); }
      F.person(g, lo);
      /* reeds */
      g.strokeStyle = '#2f4a48'; g.lineCap = 'round';
      for (let i = 0; i < 16; i++) { const rx = -W / 2 + 20 + i * 27 + T.noise(i, 3) * 12, h = 50 + T.noise(i * 1.7, 4) * 26, sw = Math.sin(t * 1.2 + i) * 5; g.lineWidth = 3; g.beginPath(); g.moveTo(rx, 330 + (i % 3) * 8); g.quadraticCurveTo(rx + sw * 0.4, 300, rx + sw, 330 - h); g.stroke(); }
      const m = L.mote;
      if (m && !m.gone) { P.glow(g, m.x, m.y, 70, '#fff0b8', 0.7 + 0.2 * Math.sin(t * 3)); P.glow(g, m.x, m.y, 20, '#ffffff', 0.9); if (!m.held && T.clamp((T.time - m.t0 - 2.5) / 1.2) > 0) P.fingerHint(g, [[m.hx, m.hy], [m.hx + 120, m.hy + 150], [m.hx + 240, m.hy + 330]], (t * 0.4) % 1, T.clamp((T.time - m.t0 - 2.5) / 1.2), '#fff6e0'); }
    };
    /* give him the dream to carry; resolves when he has let it into the water */
    L.offerMote = function () { const W = T.view.W; return new Promise((res) => { L.mote = { hx: -W / 2 + 420, hy: 150, x: -W / 2 + 420, y: 120, held: false, gone: false, t0: T.time, res }; }); };
    return L;
  };

  /* ---------- pictures of the living world ---------- */
  const V_ = (T.vig = {});
  const bg = () => T.scenes.kitchen.L.bg;
  function night(g, col, pool) {
    const W = T.view.W;
    g.save(); g.globalCompositeOperation = 'multiply';
    const gr = g.createRadialGradient(24, 300, 30, 24, 420, 640);
    gr.addColorStop(0, pool || '#ffe9c2'); gr.addColorStop(0.35, T.mix(pool || '#ffe9c2', col, 0.6)); gr.addColorStop(1, col);
    g.fillStyle = gr; g.fillRect(-W / 2, 0, W, 900); g.restore();
  }
  function rain(g, t) {
    g.save(); g.beginPath(); g.rect(-534, 164, 212, 252); g.clip();
    g.fillStyle = 'rgba(16,24,44,0.45)'; g.fillRect(-534, 164, 212, 252);
    g.strokeStyle = 'rgba(200,214,236,0.45)'; g.lineWidth = 1.6; g.beginPath();
    for (let i = 0; i < 26; i++) { const x = -534 + ((i * 53 + t * 40) % 212), y = 164 + ((i * 97 + t * 260) % 252); g.moveTo(x, y); g.lineTo(x - 3, y + 16); }
    g.stroke(); g.restore();
  }
  function daylight(g) { g.fillStyle = '#bcd3ea'; g.fillRect(-534, 164, 212, 252); g.fillStyle = '#e9d9a8'; g.fillRect(-534, 352, 70, 64); g.fillRect(-470, 330, 60, 86); g.fillRect(-400, 362, 78, 54); g.fillStyle = '#f3e7cc'; g.fillRect(-432, 164, 8, 252); }
  const book = (g, x, y, rot) => { g.save(); g.translate(x, y); g.rotate(rot); P.fill(g, P.rr(-36, -9, 72, 8, 2), '#f6f0e0'); P.fill(g, P.rr(-38, -14, 76, 7, 3), '#d7a23c'); P.fill(g, P.rr(-38, -3, 76, 6, 3), '#b8862c'); P.fill(g, P.rr(12, -14, 6, 17, 1), '#c9573f'); g.restore(); };

  /* one year on: the stew was too salty and the bread burnt, and she is on the floor with his notebook */
  V_.floor = function (g, t) {
    T.blit(g, bg()); rain(g, t);
    P.fill(g, P.ellipse(150, COUNTER - 12, 30, 12), '#2b2523');
    g.strokeStyle = 'rgba(90,84,80,0.4)'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath();
    for (let j = 0; j < 14; j++) g.lineTo(150 + Math.sin(t * 1.3 + j * 0.5) * (3 + j), COUNTER - 30 - j * 9);
    g.stroke();
    const st = F.anaAt(37), br = Math.sin(t * 1.1) * 0.012;
    const a = { x: -300, y: FLOORY - 34, s: 372, style: st, sit: true, lean: -0.1 + br, headTilt: 0.44, legF: { a: Math.PI / 2 - 0.04, b: 0.08 }, legB: { a: Math.PI / 2 - 0.1, b: 0.16 }, face: { eye: 'closed', mouth: 'line', blush: 0.14, tear: 0.9, tearY: (t * 2) % 3 }, skip: { armF: true } };
    a.armB = { hand: F.local(a, a.x + 44, a.y - 50) };
    F.person(g, a);
    book(g, a.x + 36, a.y - 60, -1.25);
    F.person(g, Object.assign({}, a, { only: 'armF', skip: null, armF: { hand: F.local(a, a.x + 30, a.y - 70) } }));
    night(g, '#5d6a92');
  };
  /* three years on: work, the child, the nights. i picks one of three evenings. */
  V_.tired = function (g, t, L) {
    T.blit(g, bg()); rain(g, t);
    const i = L.i || 0, st = F.anaAt(39), br = Math.sin(t * 1.0) * 0.012;
    if (i === 0) {
      /* still working at the counter, long after bedtime */
      [[178, -6], [206, 4], [232, -3]].forEach((q, n) => { g.save(); g.translate(q[0], COUNTER - 12); g.rotate(q[1] * 0.02); P.fill(g, P.rr(-22, -3, 44, 5, 1), '#f6f0e0'); g.restore(); });
      P.fill(g, P.rr(250, COUNTER - 66, 86, 56, 4), '#59636a'); P.fill(g, P.rr(256, COUNTER - 60, 74, 44, 2), '#cfe2f2'); P.glow(g, 292, COUNTER - 40, 110, '#cfe2f2', 0.3);
      P.fill(g, P.rr(120, COUNTER - 36, 22, 26, 4), '#e9e3d2');
      const a = { x: 150, y: FLOORY - F.hipHeight(st, 372), s: 372, style: st, lean: 0.34 + br, headTilt: 0.42, face: { eye: 'closed', mouth: 'line', blush: 0.12 } };
      a.armF = { hand: F.local(a, 224, COUNTER - 40) }; a.armB = { hand: F.local(a, 190, COUNTER - 24) };
      F.person(g, a);
    } else if (i === 1) {
      /* the child asleep on her, the washing still to fold */
      P.fill(g, P.poly([[-180, FLOORY], [-80, FLOORY], [-92, FLOORY - 56], [-168, FLOORY - 56]]), '#e9dcc3');
      P.fill(g, P.soft([[-172, FLOORY - 54], [-150, FLOORY - 86], [-110, FLOORY - 78], [-90, FLOORY - 54]]), '#f6f0e0');
      const a = { x: -360, y: FLOORY - 34, s: 372, style: st, sit: true, lean: -0.12 + br, headTilt: -0.12, legF: { a: Math.PI / 2 - 0.04, b: 0.08 }, legB: { a: Math.PI / 2 - 0.1, b: 0.16 }, face: { eye: 'open', mouth: 'line', blush: 0.12 } };
      a.armF = { hand: F.local(a, a.x + 86, a.y - 44) }; a.armB = { a: 0.4, b: 0.6 };
      F.person(g, a);
      const ls = F.lilyAt(9);
      F.person(g, { x: a.x + 96, y: FLOORY - 26, s: 300, style: ls, sit: true, flip: true, lean: 0.46, headTilt: 0.2, headRot: 0.1, legF: { a: Math.PI / 2 - 0.04, b: 0.1 }, legB: { a: Math.PI / 2 - 0.12, b: 0.2 }, face: { eye: 'closed', blush: 0.3 }, armF: { a: 0.5, b: 0.7 } });
    } else {
      /* alone in her place on the counter, where nobody is cooking */
      const a = { x: 262, y: COUNTER - 34, s: 372, style: st, flip: true, sit: true, lean: 0.3 + br, headTilt: 0.5, legF: { foot: [16, 6] }, legB: { foot: [12, 8] }, face: { eye: 'closed', mouth: 'line', blush: 0.12, tear: 0.7, tearY: (t * 2) % 3 } };
      a.armF = { hand: F.local(a, a.x - 62, a.y - 8) }; a.armB = { hand: F.local(a, a.x - 54, a.y) };
      F.person(g, a);
    }
    night(g, '#566490', i === 0 ? '#d9e0e8' : '#ffe9c2');
  };
  /* the morning after the dream: she does Lily's hair, and laughs */
  V_.morning = function (g, t) {
    T.blit(g, bg()); daylight(g);
    const st = F.anaAt(39), ls = F.lilyAt(9), bob = Math.sin(t * 5) * 1.2;
    P.fill(g, P.rr(-250, FLOORY - 78, 62, 78, 12), '#5d8fb0'); P.fill(g, P.rr(-240, FLOORY - 60, 42, 26, 6), '#7fb0c9');
    const l = { x: 40, y: FLOORY - F.hipHeight(ls, 300) + bob * 0.4, s: 300, style: ls, lean: 0.02, headTilt: -0.06, hairSway: Math.sin(t * 5) * 0.2, face: { eye: 'happy', mouth: 'smile', blush: 0.32 }, armF: { a: 0.3 + Math.sin(t * 5) * 0.14, b: 0.4 }, armB: { a: 0.1, b: 0.3 } };
    const lj = F.person(g, l);
    const a = { x: -66, y: FLOORY - 150, s: 372, style: st, lean: 0.12, headTilt: 0.08, legF: { foot: [22, 34] }, legB: { foot: [-12, 40] }, face: { eye: 'happy', mouth: 'smile', blush: 0.26 } };
    a.armF = { hand: F.local(a, lj.head[0] - 22, lj.head[1] - 34 + bob) }; a.armB = { hand: F.local(a, lj.head[0] - 30, lj.head[1] - 20 - bob) };
    F.person(g, a);
    night(g, '#f1e2c8', '#fff8e6');
  };
  /* years on: she cooks in his place now, Lily sits in hers — and there is one white hair */
  V_.gray = function (g, t, L) {
    T.blit(g, bg()); daylight(g);
    const st = F.anaAt(50), ls = F.lilyAt(20), k = T.ease.io(L.found ? L.found.k : 0);
    /* pot uncovered and going */
    P.fill(g, P.ellipse(24, 550, 80, 12), '#b9532f');
    for (let i = 0; i < 3; i++) { const life = (t * 0.2 + i * 0.33) % 1; P.glow(g, 24 + Math.sin(t + i * 2) * 14, 520 - life * 150, 20 + life * 30, '#fff3dc', Math.sin(life * Math.PI) * 0.26); }
    const l = { x: 262, y: COUNTER - 34, s: 344, style: ls, flip: true, sit: true, lean: 0.06, legF: { a: Math.PI / 2 - 0.1, b: Math.PI / 2 - 0.25 + Math.sin(t * 3) * 0.22 }, legB: { a: Math.PI / 2 - 0.2, b: Math.PI / 2 - 0.2 + Math.sin(t * 3 + Math.PI) * 0.22 }, face: { eye: k > 0.5 ? 'happy' : 'open', mouth: 'smile', blush: 0.26 } };
    l.armF = k > 0.3 ? { a: 1.5 + Math.sin(t * 6) * 0.1, b: 0.2 } : { a: 0.6, b: 0.9 };
    F.person(g, l);
    const a = { x: -132, y: FLOORY - F.hipHeight(st, 372), s: 372, style: st, lean: 0.06, headTilt: 0.12 - k * 0.1, face: { eye: 'open', mouth: k > 0.6 ? 'smile' : null, blush: 0.2 }, skip: { armF: true } };
    const tip = [24 + Math.cos(t * 2.2) * 44, 552 + Math.sin(t * 2.2) * 6];
    a.armB = { hand: F.local(a, tip[0] - 60, tip[1] - 56) };
    const j = F.person(g, a);
    P.line(g, a.x + (tip[0] - 60 - a.x) - 6, tip[1] - 66, tip[0], tip[1], 6, '#b98a5a');
    /* the strand, held out to look at */
    const hx = T.lerp(a.x + 30, j.head[0] + 64, k), hy = T.lerp(a.y + 10, j.head[1] + 6, k);
    if (k > 0.05) { g.strokeStyle = T.rgba('#fbf8f0', k); g.lineWidth = 2.2; g.beginPath(); g.moveTo(j.head[0] + 8, j.head[1] - 30); g.quadraticCurveTo(j.head[0] + 44, j.head[1] - 34, hx, hy); g.stroke(); }
    F.person(g, Object.assign({}, a, { only: 'armF', skip: null, armF: { hand: F.local(a, hx, hy) } }));
    night(g, '#ecdcc6', '#fff8e6');
  };
  /* past eighty: the same pot, and grandchildren waiting on it the way she used to */
  V_.grand = function (g, t) {
    T.blit(g, bg()); daylight(g);
    const st = F.anaAt(81);
    P.fill(g, P.ellipse(24, 550, 80, 12), '#b9532f');
    for (let i = 0; i < 4; i++) { const life = (t * 0.2 + i * 0.25) % 1; P.glow(g, 24 + Math.sin(t + i * 2) * 14, 520 - life * 170, 20 + life * 34, '#fff3dc', Math.sin(life * Math.PI) * 0.28); }
    const kids = [[262, F.styles.kidB, true, 0], [150, F.styles.kidA, false, 1.4], [372, F.styles.kidC, false, 2.6]];
    kids.forEach((q, i) => {
      const hop = Math.abs(Math.sin(t * 5 + q[3])) * 10;
      if (q[2]) F.person(g, { x: q[0], y: COUNTER - 24, s: 250, style: q[1], flip: true, sit: true, lean: 0.1, legF: { a: Math.PI / 2 - 0.1, b: Math.PI / 2 - 0.3 + Math.sin(t * 6) * 0.4 }, legB: { a: Math.PI / 2 - 0.2, b: Math.PI / 2 - 0.3 + Math.sin(t * 6 + Math.PI) * 0.4 }, face: { eye: 'happy', mouth: 'open', blush: 0.3 }, armF: { a: 2.2 + Math.sin(t * 8) * 0.2, b: 0.3 } });
      else F.person(g, { x: q[0], y: FLOORY - F.hipHeight(q[1], 250) - hop, s: 250, style: q[1], flip: true, lean: 0.1, face: { eye: 'happy', mouth: 'smile', blush: 0.3 }, armF: { a: 1.9 + Math.sin(t * 7 + i) * 0.2, b: 0.3 }, armB: { a: 1.6, b: 0.4 } });
    });
    const a = { x: -132, y: FLOORY - F.hipHeight(st, 350), s: 350, style: st, lean: 0.14, headTilt: 0.04, face: { eye: 'happy', mouth: 'smile', blush: 0.22, old: true }, skip: { armF: true } };
    const tip = [24 + Math.cos(t * 1.8) * 44, 552 + Math.sin(t * 1.8) * 6];
    a.armB = { hand: F.local(a, -60, 590) };
    F.person(g, a);
    P.line(g, tip[0] - 66, tip[1] - 66, tip[0], tip[1], 6, '#b98a5a');
    F.person(g, Object.assign({}, a, { only: 'armF', skip: null, armF: { hand: F.local(a, tip[0] - 60, tip[1] - 56) } }));
    night(g, '#f3e2c6', '#fff8e6');
  };
  /* the last one: the same hospital room, the other way round */
  V_.bed = function (g, t, L) {
    const R = T.scenes.room, Q = R.SPOTS, k = L.said ? L.said.k : 0;
    R.paintStill(g, {
      tod: 5,
      inBed(g2) {
        const st = F.anaAt(81), br = Math.sin(t * 1.1) * 0.01;
        const o = { x: Q.LEO.x, y: Q.LEO.y, s: 376, style: st, flip: true, noLegs: true, lean: -0.7 + br, headTilt: 0.2, face: { eye: k > 0.6 ? 'happy' : 'open', mouth: 'smile', blush: 0.16, old: true } };
        o.armF = { hand: F.local(o, 84, 600) }; o.armB = { hand: F.local(o, 132, 596) };
        F.person(g2, o);
      },
      atChair(g2) {
        const st = F.lilyAt(51), cry = k > 0.3 && k < 0.8 ? 1 : 0;
        const o = { x: Q.ANA.x, y: Q.ANA.y, s: 372, style: st, sit: true, lean: 0.12 + cry * 0.1, headTilt: 0.04 + cry * 0.3, face: { eye: cry ? 'closed' : k >= 0.8 ? 'happy' : 'open', mouth: k >= 0.8 ? 'smile' : null, blush: 0.22, tear: k > 0.3 ? 0.9 : 0, tearY: (t * 2) % 3 } };
        o.armF = { hand: F.local(o, 76, 604) }; o.armB = { hand: F.local(o, 70, 612) };
        F.person(g2, o);
      },
    });
  };

  /* ---------- the dream: their first flat, as she remembers it ---------- */
  /* o: { chalk: {k}, near: {k} (he comes to sit by her), lift: {k} (she looks up) } */
  T.dream = function (o) {
    const D = Object.assign({ dark: true, chalk: { k: 0 }, near: { k: 0 }, lift: { k: 0 }, lean: { k: 0 } }, o);
    D.draw = function (g, t) {
      const H = T.scenes.home, G = H.GEO, W = T.view.W;
      H.paintStill(g, D.chalk.k);
      const near = T.ease.io(D.near.k), lift = T.ease.io(D.lift.k), ln = T.ease.io(D.lean.k);
      const ana = { x: G.ROOM.x + 290, y: G.FLOOR - 55, s: 190, style: F.anaAt(39, { top: '#e9dcc3', bottom: '#9fb0c4', skirt: 30 }), flip: true, sit: true, lean: 0.3 - lift * 0.22 + ln * 0.16, headTilt: 0.5 - lift * 0.5 + ln * 0.12, face: { eye: lift > 0.5 ? (ln > 0.5 ? 'closed' : 'open') : 'closed', mouth: lift > 0.7 ? 'smile' : 'line', blush: 0.2, tear: 0.8 * (1 - ln * 0.6), tearY: (t * 2) % 3 } };
      ana.armF = { hand: F.local(ana, ana.x - 30, ana.y - 20 + lift * 14) }; ana.armB = { a: 0.5, b: 0.9 };
      const lx = T.lerp(G.ROOM.x + 40, G.ROOM.x + 238, near);
      const leo = { x: lx, y: G.FLOOR - F.hipHeight(F.styles.leoHome, 200) * (1 - near * 0.3) - near * 4, s: 200, style: F.styles.leoHome, lean: 0.06, headTilt: 0.1, face: { blush: 0.14, mouth: 'smile' } };
      if (near < 0.98 && near > 0.02) leo.walk = near * 14;
      else if (near >= 0.98) { leo.sit = true; leo.y = G.FLOOR - 55; leo.armF = { hand: F.local(leo, ana.x - 32, ana.y - 22 + lift * 14) }; leo.headTilt = 0.14; }
      g.save(); g.globalAlpha = T.clamp(D.near.k * 6 + (D.enterA || 0));
      P.glow(g, leo.x, leo.y - 30, 110, '#fff0c8', 0.3);
      F.person(g, leo);
      g.restore();
      F.person(g, ana);
      /* dreams are soft at the edges */
      g.save(); g.globalCompositeOperation = 'soft-light'; g.fillStyle = 'rgba(150,130,230,0.4)'; g.fillRect(-W / 2, 0, W, 900); g.restore();
      const vg = g.createRadialGradient(-200, 480, 240, -200, 480, 1000);
      vg.addColorStop(0, 'rgba(246,240,255,0)'); vg.addColorStop(1, 'rgba(246,240,255,0.75)');
      g.fillStyle = vg; g.fillRect(-W / 2, 0, W, 900);
    };
    D.spot = () => { const G = T.scenes.home.GEO; return [G.ROOM.x + 290, G.FLOOR - 110, 70]; };
    return D;
  };
})();
