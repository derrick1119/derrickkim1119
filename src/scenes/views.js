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
  /* o: { paint(g, t), leo: style, mom: bool, mirror: 0..1 (how plainly he sees himself), warm: bool,
     shore: bool, things: [{ kind: 'lamp'|'pot'|'leo', x, to }], kid: a style (someone small sitting on the bank, looking in) } */
  T.lake = function (o) {
    const L = Object.assign({ dark: true, mood: 'still', chord: 4, rip: [], amp: 0, reach: { k: 0 }, mote: null, fade: { a: 1 }, mirror: 0.25, lit: { lamp: 0, pot: 0, leo: 0 }, beat: 0, sip: { k: 0 }, salt: { k: 0 }, tear: { k: 0 }, part: { k: 0 }, gone: { k: 0 }, note: null }, o);
    const SC = 0.7, TOP = 232, PH = 640;
    /* 물그림자: with o.shore he stands on the far bank, and what stands there with him (o.things) throws a
       shadow straight down into her picture. Slid until it lies on its counterpart, a shadow stays. */
    const BANK = 228, DEPTH = { lamp: TOP + 304 * SC, pot: TOP + 548 * SC, leo: TOP + (COUNTER - 34) * SC };
    /* a thing: { kind: 'lamp'|'pot'|'leo'|'who'|'dog' or anything with its own bank()/ghost(), id, x (on the bank),
       at: [x, y] where its shadow belongs in the picture, style (people), flip, ps (picture size) } */
    const things = () => L.things || [];
    const idOf = (q) => q.id || q.kind;
    const person = (q) => q.kind === 'leo' || q.kind === 'who';
    /* a thing with turn: false keeps the way it faces whichever way it is slid (its picture only works that way round) */
    const turns = (q) => q.turn !== false;
    /* the way it faces once it has found its place, which is the way its picture is drawn */
    const restFlip = (q) => (person(q) ? (q.lockFlip == null ? true : q.lockFlip) : !!q.lockFlip);
    (L.things || []).forEach((q) => {
      if (q.at) { q.to = q.at[0] * SC; q.depth = TOP + q.at[1] * SC; }
      if (q.depth == null) q.depth = DEPTH[q.kind] || TOP + 400 * SC;
      if (L.lit[idOf(q)] == null) L.lit[idOf(q)] = 0;
    });
    const clampX = (x) => { const lim = T.view.W * SC / 2 - 56; return T.clamp(x, -lim, lim); };
    /* the picture can arrive broken into rings, each turned a little: tap a ring to turn it a notch */
    const RCY = TOP + PH / 2 - 20, RADS = { 2: [0, 150, 280], 3: [0, 112, 202, 292], 4: [0, 88, 160, 232, 304] };
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
      if (y < TOP - 30 || (L.rh && !L.rh.solved && y < 272)) return;
      L.rip.push({ x, y, t: T.time });
      if (L.rip.length > 6) L.rip.shift();
      L.amp = Math.min(1, L.amp + 0.7);
      T.audio.sfx('star', (((x * 0.001 + 0.5) % 1) + 1) % 1);   /* x runs negative on the left half: keep it in 0..1 */
      if (L.onTouch) L.onTouch(x, y);
    };
    /* the one dream he may send: a light he can carry to the water */
    const aligned = (R) => R.rot.every((v) => v % 8 === 0);
    function turn(i) {
      const R = L.ring;
      if (!R || R.solved || i < 0 || i >= R.n) return;
      R.rot[i]++; if (R.couple && i > 0) R.rot[i - 1]++;
      R.idle = 0;
      T.audio.step(R.taps++, { voice: 'glass', vel: 0.3 });
      if (aligned(R)) { R.solved = true; R.t = 1.3; L.amp = 0; T.audio.promise(); }
    }
    function settle(q) {
      const R = L.rh;
      if (!R || q.lock || Math.abs(q.x - q.to) >= 30) return;
      q.lock = true; q.x = q.to; q.go = null; if (person(q) || q.kind === 'dog') q.flip = restFlip(q); R.n++; R.idle = 0; if (R.sel >= 0 && things()[R.sel] === q) R.sel = -1;
      T.audio.sfx('join'); T.audio.step(R.n * 2 + 1, { voice: 'glass', vel: 0.36 });
      if (things().every((w) => w.lock)) { R.solved = true; R.t = 1.8; L.amp = 0; T.audio.promise(); }
    }
    const thingAt = (x, y) => { let best = -1, bd = 78; if (y < 268) things().forEach((q, i) => { const d = Math.abs(x - q.x); if (!q.lock && d < bd) { bd = d; best = i; } }); return best; };
    const rhNext = () => (L.rh && !L.rh.solved ? things().findIndex((q) => !q.lock) : -1);
    /* begin sliding: resolves when every shadow has found its place */
    L.rhyme = function () { return new Promise((res) => { L.rh = { sel: -1, held: -1, dx: 0, moved: false, idle: 0, solved: false, t: 0, n: 0, res }; L.amp = 0.3; }); };
    const ringNext = () => { const R = L.ring; if (!R || R.solved) return -1; for (let i = R.n - 1; i >= 0; i--) if (R.rot[i] % 8) return i; return -1; };
    /* o: { start: [notches off, innermost first], couple: a ring drags the one inside it } */
    L.calm = function (o) { const n = o.start.length; return new Promise((res) => { L.ring = { n, rot: o.start.slice(), vis: o.start.slice(), couple: !!o.couple, rad: RADS[n], solved: false, idle: 0, taps: 0, t: 0, res }; L.amp = 0.35; }); };
    L.hintAt = () => { const h = rhNext(); if (h >= 0) { const q = things()[h]; return L.rh.sel === h ? [q.to, q.depth - (person(q) ? 60 : 0)] : [q.x, BANK - 46]; } const i = ringNext(); if (i < 0) return null; const R = L.ring; return [0, i === 0 ? RCY : RCY - (R.rad[i] + R.rad[i + 1]) / 2]; };
    L.pointer = function (type, x, y) {
      if (L.rh && !L.rh.solved) {
        const R = L.rh, Q = things();
        if (type === 'down') {
          const i = thingAt(x, y);
          if (i >= 0) { R.held = i; R.sel = i; R.dx = Q[i].x - x; R.moved = false; R.idle = 0; Q[i].go = null; T.audio.sfx('step'); }
          else if (R.sel >= 0 && !Q[R.sel].lock && y > 236) { Q[R.sel].go = clampX(x); R.idle = 0; }   /* picked up with one tap, sent with the next */
        } else if (type === 'move') {
          if (R.held >= 0) { const q = Q[R.held], nx = clampX(x + R.dx); q.ph = (q.ph || 0) + (turns(q) ? Math.abs(nx - q.x) : nx - q.x) / 9; if (nx !== q.x && turns(q)) q.flip = nx < q.x; q.x = nx; R.moved = true; R.idle = 0; }
          T.cursor(R.held >= 0 ? 'grabbing' : thingAt(x, y) >= 0 ? 'grab' : 'default');
        } else if (type === 'up' && R.held >= 0) { const q = Q[R.held]; R.held = -1; if (R.moved) settle(q); }
        return true;
      }
      if (L.ring && !L.ring.solved) {
        if (type === 'down') { const d = Math.hypot(x, y - RCY), R = L.ring; for (let i = 0; i < R.n; i++) if (d < R.rad[i + 1]) { turn(i); break; } }
        return true;
      }
      const m = L.mote;
      if (!m || m.gone) return false;
      if (type === 'down' && Math.hypot(x - m.x, y - m.y) < 80) { m.held = true; return true; }
      if (type === 'move' && m.held) { m.x = x; m.y = y; return true; }
      if (type === 'up' && m.held) { m.held = false; if (m.y > TOP + 60) L.release(); return true; }
      return false;
    };
    L.key = function (key) {
      if (L.rh && !L.rh.solved) {
        const R = L.rh, Q = things();
        if (key >= '1' && key <= String(Q.length)) { if (!Q[+key - 1].lock) { R.sel = +key - 1; R.idle = 0; T.audio.sfx('step'); } return true; }
        if ((key === 'ArrowLeft' || key === 'ArrowRight') && R.sel >= 0 && !Q[R.sel].lock) { const q = Q[R.sel], left = key === 'ArrowLeft'; q.go = null; if (turns(q)) q.flip = left; q.x = clampX(q.x + (left ? -16 : 16)); q.ph = (q.ph || 0) + (left && !turns(q) ? -1.8 : 1.8); R.idle = 0; settle(q); return true; }
        return false;
      }
      if (L.ring && !L.ring.solved) { if (key >= '1' && key <= String(L.ring.n)) { turn(+key - 1); return true; } return false; }
      if (L.mote && !L.mote.gone && (key === ' ' || key === 'Enter' || key === 'ArrowDown')) { L.mote.x = 40; L.mote.y = 520; L.release(); return true; } return false; };
    L.want = function () { const h = rhNext(); if (h >= 0) { const q = things()[h]; return 'key:' + (L.rh.sel !== h ? h + 1 : q.x > q.to ? 'ArrowLeft' : 'ArrowRight'); } if (L.rh) return 'busy'; const i = ringNext(); return i >= 0 ? 'key:' + (i + 1) : L.mote && !L.mote.gone ? 'mote' : null; };
    L.release = function () { const m = L.mote; if (!m || m.gone) return; m.gone = true; L.rip.push({ x: m.x, y: m.y, t: T.time }); L.amp = 1; if (m.res) m.res(); };
    L.update = function (dt) {
      const H = L.rh;
      if (H) {
        H.idle += dt;
        for (const q of things()) if (q.go != null && !q.lock) { const d = q.go - q.x, st = Math.sign(d) * Math.min(Math.abs(d), 560 * dt); q.x += st; q.ph = (q.ph || 0) + (turns(q) ? Math.abs(st) : st) / 9; if (st && turns(q)) q.flip = st < 0; if (Math.abs(q.go - q.x) < 0.5) { q.go = null; settle(q); } }
        if (H.solved) { H.t -= dt; if (H.t <= 0) { L.rh = null; H.res(); } } else L.amp = Math.max(L.amp, 0.2);
      }
      for (const q of things()) { const id = idOf(q); L.lit[id] += ((q.lock ? 1 : 0) - L.lit[id]) * Math.min(1, dt * 1.8); }
      const R = L.ring;
      if (R) {
        R.idle += dt;
        for (let i = 0; i < R.n; i++) R.vis[i] += (R.rot[i] - R.vis[i]) * Math.min(1, dt * 9);
        if (R.solved) { R.t -= dt; if (R.t <= 0) { L.ring = null; R.res(); } } else L.amp = Math.max(L.amp, 0.3);
      }
      L.amp = Math.max(0, L.amp - dt * 0.5); const m = L.mote; if (m && !m.held && !m.gone) { m.x += (m.hx - m.x) * dt * 3; m.y += (m.hy + Math.sin(T.time * 1.6) * 8 - m.y) * dt * 3; } };

    L.draw = function (g, t) {
      const V = T.view, W = V.W;
      if (!L.off || L.gen !== T.gen) L.build();
      /* the lakeside is Welcome Harbor, so it is drawn in crayon; what the water shows is not */
      P.cray = P.look === 'crayon'; if (P.cray) P.crayonize(g);
      /* dusk over the far bank */
      const sky = g.createLinearGradient(0, 0, 0, 240);
      sky.addColorStop(0, '#5d6aa6'); sky.addColorStop(0.7, '#c99aa6'); sky.addColorStop(1, '#f0c39a');
      g.fillStyle = sky; g.fillRect(-W / 2, 0, W, 240);
      if (P.cray) { g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = P.paper(); g.fillRect(-W / 2, 0, W, 240); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 0.2; g.fillStyle = P.crayonPat('#fff8e8').pat; g.scale(4.2, 1.5); g.fillRect(-W / 8.4, 0, W / 4.2, 160); g.restore(); }
      g.fillStyle = '#3c5568';
      g.beginPath(); g.moveTo(-W / 2, 240); g.lineTo(-W / 2, 150);
      for (let x = -W / 2; x <= W / 2; x += 40) g.lineTo(x, 168 + T.noise(x * 0.004, 5) * 34 + Math.sin(x * 0.013) * 10);
      g.lineTo(W / 2, 240); g.closePath(); g.fill();
      (L.shore ? [-450, -140, 420, 650, -720] : [-300, 120, 520, 760, -640]).forEach((x, i) => { K.tree(g, x, 196 + (i % 2) * 8, 0.55, '#2f4a58', '#28404e', '#22343f', Math.sin(t * 0.7 + i)); });
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
      mk.addColorStop(L.shore ? 0.07 : 0, 'rgba(0,0,0,0)'); mk.addColorStop(L.shore ? 0.2 : 0.12, 'rgba(0,0,0,1)'); mk.addColorStop(0.86, 'rgba(0,0,0,1)'); mk.addColorStop(1, 'rgba(0,0,0,0)');
      mg.fillStyle = mk; mg.fillRect(0, 0, mw, mh);
      g.save();
      g.globalAlpha = L.fade.a;
      const R = L.ring;
      if (!R) g.drawImage(L.mid, x0, TOP, pw, PH);
      else {
        /* outside the rings the picture lies still; inside, each ring is turned by its own amount */
        g.save(); g.beginPath(); g.rect(x0 - 40, TOP, pw + 80, PH); g.moveTo(R.rad[R.n], RCY); g.arc(0, RCY, R.rad[R.n], 0, TAU); g.clip('evenodd');
        g.drawImage(L.mid, x0, TOP, pw, PH); g.restore();
        for (let i = 0; i < R.n; i++) {
          g.save(); g.beginPath(); g.arc(0, RCY, R.rad[i + 1], 0, TAU);
          if (R.rad[i] > 0) { g.moveTo(R.rad[i], RCY); g.arc(0, RCY, R.rad[i], 0, TAU); }
          g.clip('evenodd');
          g.translate(0, RCY); g.rotate((R.vis[i] * TAU) / 8); g.translate(0, -RCY);
          g.drawImage(L.mid, x0, TOP, pw, PH); g.restore();
        }
        g.lineWidth = 2;
        for (let i = 1; i <= R.n; i++) { g.strokeStyle = T.rgba('#dfeeff', R.solved ? 0.5 * T.clamp(R.t) : 0.34 + 0.1 * Math.sin(t * 2 + i)); g.beginPath(); g.arc(0, RCY, R.rad[i], 0, TAU); g.stroke(); }
      }
      g.restore();
      if (R && !R.solved) {
        P.text(g, R.couple ? '고리를 눌러 돌려 주세요. 바깥 고리는 안쪽 고리를 함께 끌고 가요' : '물결의 고리를 눌러 돌려서, 흩어진 모습을 맞춰 주세요', 0, 866, { font: 'serif', size: 24, color: '#f3ead8', alpha: 0.9 });
        if (R.idle > 9) { const q = L.hintAt(); if (q) P.beacon(g, q[0], q[1], 44, t, 1, '#fff0c8'); }
      }
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

      if (L.shore) drawShore(g, t, W);
      if (L.wisp) for (let k = 0; k < 6; k++) { const life = (t * 0.35 + k / 6) % 1; P.glow(g, 17 + Math.sin(t * 1.3 + k * 2) * 18, 240 - life * 200, 14 + life * 26, '#fff3dc', Math.sin(life * Math.PI) * 0.7); }
      else if (!L.shore) {
        /* the near bank, and whoever has come to look (with a far bank, they stand over there instead: drawShore) */
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
        if (L.kid) sitter(g, t, bx - 96, 176, false);
        if (L.mom) { const gs = guideStyle(L), gz = (gs.kid ? 0.66 : gs === F.styles.bram ? 1.06 : 1) * 158; const no = { x: bx - 4, y: 206 - F.hipHeight(gs, gz), s: gz, style: gs, lean: 0.1, headTilt: 0.14, armF: { a: 0.9, b: 0.5 }, face: { blush: 0.2 } }; const j = F.person(g, no); if (!gs.kid) { P.glow(g, j.handF[0], j.handF[1] + 20, 60, '#ffd98a', 0.6); P.fill(g, P.rr(j.handF[0] - 6, j.handF[1] + 8, 12, 16, 3), '#fff0b8'); } }
        F.person(g, lo);
        /* reeds */
        g.strokeStyle = '#2f4a48'; g.lineCap = 'round';
        for (let i = 0; i < 16; i++) { const rx = -W / 2 + 20 + i * 27 + T.noise(i, 3) * 12, h = 50 + T.noise(i * 1.7, 4) * 26, sw = Math.sin(t * 1.2 + i) * 5; g.lineWidth = 3; g.beginPath(); g.moveTo(rx, 330 + (i % 3) * 8); g.quadraticCurveTo(rx + sw * 0.4, 300, rx + sw, 330 - h); g.stroke(); }
      }
      const m = L.mote;
      if (m && !m.gone) { P.glow(g, m.x, m.y, 70, '#fff0b8', 0.7 + 0.2 * Math.sin(t * 3)); P.glow(g, m.x, m.y, 20, '#ffffff', 0.9); if (!m.held && T.clamp((T.time - m.t0 - 2.5) / 1.2) > 0) P.fingerHint(g, [[m.hx, m.hy], [m.hx + 120, m.hy + 150], [m.hx + 240, m.hy + 330]], (t * 0.4) % 1, T.clamp((T.time - m.t0 - 2.5) / 1.2), '#fff6e0'); }
    };
    /* who has brought him to the water: o.mom is true for his mother (chapter 1's style), or the style of
       whoever came with him instead (Bram, Pipi) */
    function guideStyle(L) { return L.mom === true ? F.styles.mom : L.mom; }
    /* someone small on the edge of the bank, knees up, looking down into the picture */
    function sitter(g, t, x, y, flip) {
      const st = L.kid, s = 112;
      const o = { x, y: y - 6, s, style: st, flip, sit: true, lean: 0.24, headTilt: 0.42 + Math.sin(t * 0.6) * 0.03, face: { blush: 0.24 },
        legF: { foot: [13, 9] }, legB: { foot: [10, 10] } };
      o.armF = { hand: [12, -4] }; o.armB = { hand: [10, -2] };   /* arms round her knees */
      F.person(g, o);
    }
    /* a flat cut-out of him, for the shadow before it has found its seat */
    const flat = (st, c) => { const o2 = {}; Object.keys(st).forEach((k) => { o2[k] = typeof st[k] === 'string' && st[k][0] === '#' ? c : st[k]; }); return o2; };
    function drawShore(g, t, W) {
      const R = L.rh, Q = things(), live = R && !R.solved, ls = L.leo || F.styles.leoHome;
      const pulse = 0.5 + 0.5 * Math.sin(t * 3);
      /* where each thing belongs: a faint shape of it in the empty place, and a ring that warms as its shadow comes near */
      if (live) for (const q of Q) {
        if (q.lock) continue;
        const near = T.clamp(1 - Math.abs(q.x - q.to) / 180), x = q.to, y = q.depth, pulse = 0.5 + 0.5 * Math.sin(t * 2.4 + x);
        g.save();
        g.globalAlpha = 0.16 + 0.12 * pulse + 0.25 * near;
        if (person(q)) {
          const fo = { x, y, s: (q.ps || 372) * SC, flip: restFlip(q), sit: true, lean: 0.14, headTilt: 0.12, legF: { foot: [16, 6] }, legB: { foot: [12, 8] }, armF: { a: 0.7, b: 0.8 }, armB: { a: 0.55, b: 0.7 }, face: {} };
          if (q.pose) q.pose(fo, t, L, true);
          F.person(g, Object.assign({}, fo, { style: flat(q.style || ls, '#fff3d6'), flatLook: true }));
        } else if (q.kind === 'dog') F.dog(g, { x, y, s: (q.ps || 300) * SC, sit: 1, flip: restFlip(q), tintAll: '#fff3d6' });
        g.globalAlpha = 0.4 + 0.25 * pulse + 0.35 * near;
        g.setLineDash([7, 7]); g.lineDashOffset = -t * 18; g.lineWidth = 2.4; g.strokeStyle = T.mix('#fff3d6', '#ffd98a', near);
        g.beginPath();
        if (person(q) || q.kind === 'dog') g.ellipse(x, y + (q.kind === 'dog' ? 4 : 10), 48, 12, 0, 0, TAU); else g.arc(x, y - 6, 30 + near * 6, 0, TAU);
        g.stroke();
        g.restore();
      }
      /* the shadows, lying in her picture */
      for (let i = 0; i < Q.length; i++) {
        const q = Q[i], near = T.clamp(1 - Math.abs(q.x - q.to) / 180), lit = L.lit[idOf(q)], dy = q.depth;
        if (lit < 0.97) {
          const c = T.mix('#a9c8ea', '#ffd98a', near), gr = g.createLinearGradient(0, 252, 0, dy);
          gr.addColorStop(0, T.rgba(c, 0.5 * (1 - lit))); gr.addColorStop(0.5, T.rgba(c, (0.2 + 0.3 * near) * (1 - lit))); gr.addColorStop(1, T.rgba(c, 0));
          g.fillStyle = gr; g.fillRect(q.x - 3, 250, 6, dy - 250);
        }
        g.save();
        if (q.ghost) q.ghost(g, q.x, dy, near, lit, t, L);
        else if (q.kind === 'dog') {
          const fd = { x: q.x, y: dy, s: (q.ps || 300) * SC, sit: 1, flip: q.flip, wag: Math.sin(t * 9) * 0.5 * lit, headTilt: 0.2 };
          if (lit < 0.97) { g.globalAlpha = (0.34 + 0.3 * near) * (1 - lit); F.dog(g, Object.assign({}, fd, { shadow: true })); }
          if (lit > 0.02) { g.globalAlpha = 0.74 * lit; P.glow(g, q.x, dy - 30, 110, '#ffe2a8', 0.2 * lit); F.dog(g, fd); }
        }
        else if (q.kind === 'lamp') { const a = (0.3 + 0.34 * near) * (1 - lit * 0.85); P.glow(g, q.x, dy, 84 + 30 * near, '#ffd98a', a); g.globalAlpha = a * 0.75; P.fill(g, P.rr(q.x - 27, dy - 36, 54, 72, 9), '#ffe2a0'); g.globalAlpha = 1; }
        else if (q.kind === 'pot') {
          g.globalAlpha = (0.46 + 0.3 * near) * (1 - lit); P.fill(g, P.rr(q.x - 68, dy + 6, 16, 9, 3), '#101c33'); P.fill(g, P.rr(q.x + 52, dy + 6, 16, 9, 3), '#101c33'); P.fill(g, P.rr(q.x - 54, dy - 3, 108, 46, 14), '#101c33'); P.fill(g, P.ellipse(q.x, dy - 3, 55, 9), '#22365c');
          g.globalAlpha = 1; for (let k = 0; k < 2; k++) { const life = (t * 0.3 + k * 0.5) % 1; P.glow(g, q.x + Math.sin(t + k * 2) * 10, dy - 20 - life * 90, 16 + life * 22, '#fff3dc', Math.sin(life * Math.PI) * (0.1 + 0.16 * near + 0.14 * lit)); }
        } else if (person(q)) {
          const qs = q.style || ls, leoHere = q.kind === 'leo';
          const fo = { x: q.x, y: dy, s: (q.ps || 372) * SC, flip: q.flip == null ? true : q.flip, sit: true, lean: 0.14 + (leoHere ? T.ease.io(L.reach.k) * 0.1 : 0), headTilt: 0.12, legF: { foot: [16, 6] }, legB: { foot: [12, 8] }, armF: { a: 0.7, b: 0.8 }, armB: { a: 0.55, b: 0.7 }, face: Object.assign({ blush: 0.14 }, leoHere ? L.leoFace : q.face) };
          if (q.pose) q.pose(fo, t, L, true);
          const sipK = leoHere ? T.ease.io(L.sip.k) : 0;
          if (sipK > 0.02) fo.armF = { hand: F.local(fo, T.lerp(q.x - 66, q.x - 34, sipK), T.lerp(dy - 22, dy - 116, sipK)) };
          if (lit < 0.97) { g.globalAlpha = (0.3 + 0.26 * near) * (1 - lit); F.person(g, Object.assign({}, fo, { style: flat(qs, '#101c33'), face: {} })); }
          const part = leoHere || q.parts ? T.ease.io(L.part.k) : 0, gone = T.ease.io(L.gone.k);
          if (lit > 0.5 && part > 0.02) { g.globalAlpha = 0.36 * part * (1 - gone); F.person(g, Object.assign({}, fo, { style: flat(qs, '#101c33'), face: {} })); }   /* what they see there: nothing */
          if (lit > 0.02) { const here = lit * (1 - part); g.globalAlpha = 0.74 * here; P.glow(g, q.x - 10, dy - 90 * (fo.s / 260), 150 * (fo.s / 260), '#ffe2a8', 0.18 * here); const jk = F.person(g, Object.assign({}, fo, { style: qs })); if (sipK > 0.02 && jk && jk.handF) { P.line(g, jk.handF[0], jk.handF[1], jk.handF[0] - 26, jk.handF[1] + 9, 5, '#b98a5a'); P.fill(g, P.ellipse(jk.handF[0] - 32, jk.handF[1] + 11, 10, 6), '#b98a5a'); } }
        }
        g.restore();
      }
      /* the far bank, across the water from us */
      const edge = (y, amp, seed) => { const pts = []; for (let x = -W / 2 - 60; x <= W / 2 + 60; x += 90) pts.push([x, y + T.noise(x * 0.012, seed) * amp]); return pts; };
      P.fill(g, P.soft(edge(206, 5, 1).concat(edge(256, 6, 2).reverse())), '#3f6058');
      P.fill(g, P.soft(edge(204, 5, 1).concat(edge(238, 5, 3).reverse())), '#58806c');
      /* who has come to look: his mother with her lamp, and Leo himself when he is not one of the things to slide.
         They stand at the far end of the bank, each drawn once, at the same scale as the things beside them. */
      const mx = -W * SC / 2 + 22;
      if (L.kid) sitter(g, t, W / 2 - 92, BANK - 4, true);
      if (L.mom) {
        const ms = guideStyle(L), sm = (ms.kid ? 0.66 : ms === F.styles.bram ? 1.06 : 1) * 150;
        const j = F.person(g, { x: mx, y: BANK - F.hipHeight(ms, sm), s: sm, style: ms, lean: 0.08, headTilt: 0.14, armF: { a: 0.9, b: 0.5 }, face: { blush: 0.2 } });
        P.glow(g, j.handF[0], j.handF[1] + 20, 58, '#ffd98a', 0.6); P.fill(g, P.rr(j.handF[0] - 5, j.handF[1] + 8, 11, 15, 3), '#fff0b8');
      }
      if (!Q.some((q) => q.kind === 'leo')) {
        const reach = T.ease.io(L.reach.k), lx = mx + (L.mom ? 66 : 8);
        const lo = { x: lx, y: BANK - F.hipHeight(ls, 172), s: 172, style: ls, lean: 0.06 + reach * 0.2, headTilt: 0.2 + reach * 0.1, face: Object.assign({ blush: 0.14 }, L.leoFace) };
        lo.armF = reach > 0.02 ? { a: 0.5 + reach * 0.6, b: 0.2 } : { a: 0.25, b: 0.4 };
        lo.armB = { a: 0.15, b: 0.35 };
        F.person(g, lo);
      }
      const order = Q.map((q, i) => i).sort((a2, b2) => (R && R.held === a2 ? 1 : 0) - (R && R.held === b2 ? 1 : 0));
      for (const i of order) {
        const q = Q[i], x = q.x, sel = live && !q.lock && (R.sel === i || R.held === i);
        if (live && !q.lock) {   /* it can be slid: little arrows either side */
          g.save(); g.globalAlpha = sel ? 0.9 : 0.34 + 0.2 * pulse; g.fillStyle = '#fff6e0';
          for (const d of [-1, 1]) { const ax = x + d * 56 + d * (sel ? pulse * 6 : 0), ay = BANK - 44; g.beginPath(); g.moveTo(ax, ay - 14); g.lineTo(ax + d * 18, ay); g.lineTo(ax, ay + 14); g.closePath(); g.fill(); }
          g.restore();
        }
        if (q.bank) q.bank(g, x, t, L, q);
        else if (q.kind === 'dog') { const sat = L.lit[idOf(q)]; F.dog(g, { x, y: BANK + 2 - (q.jump || 0), s: 220, walk: live && (R.held === i || q.go != null) ? q.ph || 0 : null, sit: sat > 0.5 ? 1 : 0, flip: q.lock ? !!q.lockFlip : !!q.flip, wag: Math.sin(t * (q.wagRate || 10)) * (q.wag == null ? 0.8 : q.wag), headTilt: q.tilt || 0 }); }
        else if (q.kind === 'lamp') K.lantern(g, x, BANK + 2, t, { s: 1.2, lit: 1, seed: 5 });
        else if (q.kind === 'pot') {
          const sk = L.beat === 1 ? 0 : L.salt.k;
          g.save(); g.translate(x, BANK); g.scale(1.36, 1.36);
          P.glow(g, 0, -2, 30, '#ffb45a', 0.55 + 0.2 * Math.sin(t * 9));
          [-17, 0, 17].forEach((dx, k) => P.fill(g, P.ellipse(dx, 2, 9, 6), k === 1 ? '#6f6a66' : '#807a74'));
          P.fill(g, P.rr(-25, -34, 50, 28, 9), '#2d6672'); P.fill(g, P.ellipse(0, -34, 25, 5.5), '#a8452a');
          P.line(g, -29, -27, -25, -27, 4, '#234f58'); P.line(g, 25, -27, 29, -27, 4, '#234f58');
          for (let k = 0; k < 3; k++) { const life = (t * 0.33 + k * 0.33) % 1; P.glow(g, Math.sin(t * 1.3 + k * 2) * 7, -44 - life * 70, 9 + life * 14, '#fff3dc', Math.sin(life * Math.PI) * (0.16 + 0.2 * L.lit.pot)); }
          g.restore();
          if (sk > 0.02 && sk < 0.98) { g.fillStyle = '#ffffff'; for (let k = 0; k < 6; k++) g.fillRect(x - 9 + k * 3.4, BANK - 118 + ((t * 130 + k * 13) % 64), 3.4, 3.4); }
        } else if (person(q)) {
          const leoHere = q.kind === 'leo', qs = q.style || ls;
          const reach = leoHere ? T.ease.io(L.reach.k) : 0, seated = T.ease.io(L.lit[idOf(q)]), sip = leoHere ? T.ease.io(L.sip.k) : 0, sk = !leoHere || L.beat === 1 ? 0 : L.salt.k;
          const hh = F.hipHeight(qs, 172);
          const lo = { x, y: T.lerp(BANK - hh, BANK - 6, seated), s: 172, style: qs, flip: q.lock ? (q.lockFlip == null ? true : q.lockFlip) : !!q.flip, lean: 0.05 + reach * 0.34, headTilt: 0.2 + reach * 0.16, face: Object.assign({ blush: 0.14 }, leoHere ? L.leoFace : q.face) };
          if (seated > 0.5) { lo.sit = true; lo.legF = { a: Math.PI / 2 - 0.5, b: 0.5 }; lo.legB = { a: Math.PI / 2 - 0.62, b: 0.62 }; lo.armF = reach > 0.02 ? { hand: F.local(lo, x - 14 - 30 * reach, T.lerp(BANK - 16, BANK + 74, reach)) } : { a: 0.5, b: 1.0 }; lo.armB = { a: 0.3, b: 0.9 }; }
          else if (live && (R.held === i || q.go != null)) lo.walk = q.ph || 0;
          /* his pot is beside him: a pinch of salt, a spoon to the mouth */
          if (q.pose) q.pose(lo, t, L, false);
          const pot = leoHere && Q.find((w) => w.kind === 'pot');
          if (pot && seated > 0.5 && (sip > 0.02 || (sk > 0.02 && sk < 0.98))) {
            const salting = sk > 0.02 && sk < 0.98, hx = salting ? pot.x + 4 : T.lerp(pot.x + 8, x - 14, sip), hy = salting ? BANK - 124 + Math.abs(Math.sin(t * 9)) * 8 : T.lerp(BANK - 58, BANK - 112, sip);
            lo.armF = { hand: F.local(lo, hx, hy) };
            if (salting) lo.shaker = true; else if (sip > 0.02) lo.prop = [hx, hy];
          }
          const j = F.person(g, lo);
          if (q.prop) q.prop(g, j, lo, t, L);
          if (lo.prop) { P.line(g, j.handF[0], j.handF[1], j.handF[0] - 17, j.handF[1] + 6, 3.4, '#b98a5a'); P.fill(g, P.ellipse(j.handF[0] - 21, j.handF[1] + 7, 7, 4), '#b98a5a'); }
          if (lo.shaker) { g.save(); g.translate(j.handF[0] - 2, j.handF[1] + 8); g.rotate(2.7); P.fill(g, P.rr(-6, -10, 12, 19, 3), '#f6f2ea'); P.fill(g, P.rr(-6, -13, 12, 6, 2), '#8f96a0'); g.restore(); }
        }
      }
      /* reeds along the water's edge */
      g.strokeStyle = '#2f4a48'; g.lineCap = 'round'; g.lineWidth = 3;
      for (let i = 0; i < 12; i++) { const rx = (i < 6 ? -W / 2 + 10 + i * 21 : W / 2 - 150 + (i - 6) * 24) + T.noise(i, 3) * 10, h = 34 + T.noise(i * 1.7, 4) * 20, sw = Math.sin(t * 1.2 + i) * 4; g.beginPath(); g.moveTo(rx, 262 + (i % 3) * 5); g.quadraticCurveTo(rx + sw * 0.4, 244, rx + sw, 262 - h); g.stroke(); }
      if (live) {
        /* no instructions up front: the dotted shapes in the water say enough. Only if he is stuck a while does a
           line come, first the gesture, and much later what goes where */
        const cap = R.idle > 16 ? (L.rhText || '등불은 깜깜한 창에, 냄비는 아나의 냄비에, 레오는 아나가 앉던 조리대 자리에. 물가에서 좌우로 끌어 점선에 맞춰 보세요') : R.idle > 6 ? '물가의 것들을 좌우로 끌어 보세요' : null;
        if (cap) { const ca = T.clamp((R.idle - 6) / 1.2); g.save(); g.globalAlpha = ca; T.band(g, 1); g.restore(); P.text(g, cap, 0, 864, { font: 'serif', size: 27, color: '#f3ead8', alpha: 0.94 * ca, glow: 'rgba(8,12,22,0.9)' }); }
        if (R.idle > 9) { const h = L.hintAt(); if (h) P.beacon(g, h[0], h[1], 44, t, 1, '#fff0c8'); }
      } else if (L.note) T.band(g, 1), P.text(g, L.note, 0, 864, { font: 'serif', size: 27, color: '#f3ead8', alpha: 0.94, glow: 'rgba(8,12,22,0.9)' });
    }
    const draw0 = L.draw;
    L.draw = function (g, t) { try { draw0(g, t); } finally { P.cray = false; } };
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
  /* one year on, to the day: she makes his stew out of his notebook, standing in his place at the stove.
     L.lit is what his bank has lent the room; L.beat: 0 stirring · 1 salt, and salt again · 2 the taste · 3 laughing · 4 the empty seat */
  V_.first = function (g, t, L) {
    T.blit(g, bg()); rain(g, t);
    const lit = L.lit || {}, b = L.beat || 0, st = F.anaAt(37), sip = T.ease.io(L.sip ? L.sip.k : 0), salt = L.salt ? L.salt.k : 0;
    if (lit.lamp > 0.01) { g.save(); g.beginPath(); g.rect(-534, 164, 212, 252); g.clip(); g.fillStyle = T.rgba('#ffb85a', 0.34 * lit.lamp); g.fillRect(-534, 164, 212, 252); P.glow(g, -428, 300, 200, '#ffc76a', 0.95 * lit.lamp); P.glow(g, -428, 300, 64, '#ffe6ac', 0.95 * lit.lamp); g.restore(); }
    /* the notebook open on the counter, and two bowls set out from habit */
    book(g, 118, COUNTER - 10, -0.05);
    [176, 216].forEach((x) => { P.fill(g, P.poly([[x - 17, COUNTER - 26], [x + 17, COUNTER - 26], [x + 11, COUNTER - 10], [x - 11, COUNTER - 10]]), '#f2ead8'); P.fill(g, P.ellipse(x, COUNTER - 26, 16, 3.6), '#e3d9c4'); });
    /* the pot */
    P.fill(g, P.ellipse(24, 550, 80, 12), '#a8452a');
    for (let i = 0; i < 4; i++) { const life = (t * 0.2 + i * 0.25) % 1; P.glow(g, 24 + Math.sin(t + i * 2) * 14, 520 - life * 160, 20 + life * 32, '#fff3dc', Math.sin(life * Math.PI) * (0.16 + 0.14 * (lit.pot || 0))); }
    const grim = b === 2 && sip > 0.9, laugh = b === 3, still = b >= 4, tear = L.tear ? L.tear.k : 0;
    const a = { x: -132, y: FLOORY - F.hipHeight(st, 372) + (laugh ? Math.sin(t * 13) * 3 : 0), s: 372, style: st, lean: 0.06 + Math.sin(t * 1.1) * 0.012 - (still ? 0.03 : 0), headTilt: grim ? Math.sin(t * 17) * 0.09 : still ? -0.05 : 0.12,
      face: { eye: grim ? 'closed' : laugh ? 'happy' : 'open', mouth: grim || laugh ? 'open' : still ? 'line' : null, blush: 0.2, tear: tear * 0.9, tearY: (t * 2) % 3 }, skip: { armF: true } };
    a.armB = still ? { a: 0.3, b: 0.4 } : { hand: F.local(a, -28, 566) };
    const j = F.person(g, a);
    /* the spoon hand: round the pot, over it with salt, or up to her mouth */
    let hx, hy, spoon = true;
    let shaker = false;
    if (b === 1 && salt > 0.02 && salt < 0.98) { hx = 4 + Math.sin(t * 9) * 5; hy = 436 + Math.abs(Math.sin(t * 9)) * 12; spoon = false; shaker = true; }
    else if (b >= 2 && !still) { hx = T.lerp(-30, j.head[0] + 50, sip); hy = T.lerp(498, j.head[1] + 38, sip); }
    else if (still) { hx = a.x + 36; hy = a.y + 30; spoon = false; }
    else { const tip = [24 + Math.cos(t * 2.2) * 44, 552 + Math.sin(t * 2.2) * 6]; hx = tip[0] - 60; hy = tip[1] - 56; P.line(g, hx - 6, hy - 10, tip[0], tip[1], 6, '#b98a5a'); spoon = false; }
    if (spoon) { P.line(g, hx, hy, hx - 34, hy + 12, 6, '#b98a5a'); P.fill(g, P.ellipse(hx - 40, hy + 14, 13, 7, 0.2), '#b98a5a'); }
    const ja = F.person(g, Object.assign({}, a, { only: 'armF', skip: null, armF: { hand: F.local(a, hx, hy) } }));
    if (shaker && ja && ja.handF) {
      const sx = ja.handF[0] + 10, sy = ja.handF[1] + 16, fall = Math.max(24, 540 - sy - 36);
      g.save(); g.translate(sx, sy); g.rotate(2.8); P.fill(g, P.rr(-17, -28, 34, 50, 8), '#f6f2ea'); P.fill(g, P.rr(-17, -36, 34, 15, 5), '#8f96a0'); g.restore();
      g.fillStyle = '#ffffff'; for (let k = 0; k < 8; k++) g.fillRect(sx - 6 + k * 4.4, sy + 36 + ((t * 170 + k * 19) % fall), 6, 6);
    }
    night(g, T.mix('#5d6a92', '#7d7890', (lit.lamp || 0) * 0.6 + (lit.leo || 0) * 0.25), T.mix('#e9dcc2', '#ffe9c2', lit.lamp || 0));
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
  V_.grand = function (g, t, L) {
    T.blit(g, bg()); daylight(g);
    const st = F.anaAt(81), lit = (L && L.lit) || {}, b = (L && L.beat) || 0;
    if (lit.lamp > 0.01) { g.save(); g.beginPath(); g.rect(-534, 164, 212, 252); g.clip(); P.glow(g, -428, 300, 200, '#ffc76a', 0.8 * lit.lamp); g.restore(); }
    P.fill(g, P.ellipse(24, 550, 80, 12), '#b9532f');
    for (let i = 0; i < 4; i++) { const life = (t * 0.2 + i * 0.25) % 1; P.glow(g, 24 + Math.sin(t + i * 2) * 14, 520 - life * 170, 20 + life * 34, '#fff3dc', Math.sin(life * Math.PI) * 0.28); }
    const kids = [[262, F.styles.kidB, true, 0], [150, F.styles.kidA, false, 1.4], [372, F.styles.kidC, false, 2.6]];
    kids.forEach((q, i) => {
      const hop = Math.abs(Math.sin(t * 5 + q[3])) * 10;
      if (q[2]) F.person(g, { x: q[0], y: COUNTER - 24, s: 250, style: q[1], flip: true, sit: true, lean: 0.1, legF: { a: Math.PI / 2 - 0.1, b: Math.PI / 2 - 0.3 + Math.sin(t * 6) * 0.4 }, legB: { a: Math.PI / 2 - 0.2, b: Math.PI / 2 - 0.3 + Math.sin(t * 6 + Math.PI) * 0.4 }, face: { eye: 'happy', mouth: 'open', blush: 0.3 }, armF: { a: 2.2 + Math.sin(t * 8) * 0.2, b: 0.3 } });
      else F.person(g, { x: q[0], y: FLOORY - F.hipHeight(q[1], 250) - hop, s: 250, style: q[1], flip: true, lean: 0.1, face: { eye: 'happy', mouth: 'smile', blush: 0.3 }, armF: { a: 1.9 + Math.sin(t * 7 + i) * 0.2, b: 0.3 }, armB: { a: 1.6, b: 0.4 } });
    });
    /* at the end she turns to the place on the counter he used to watch her from, and smiles at it */
    const turn = b >= 2;
    const a = { x: -132, y: FLOORY - F.hipHeight(st, 350), s: 350, style: st, flip: turn, lean: turn ? 0.04 : 0.14, headTilt: turn ? -0.06 : 0.04, face: { eye: 'happy', mouth: 'smile', blush: 0.22, old: true, tear: turn ? 0.5 : 0, tearY: (t * 2) % 3 }, skip: { armF: true } };
    /* the ladle goes round in her hand, never further than her arm reaches; when she turns, it stays standing in the pot */
    const tip = turn ? [44, 556] : [-4 + Math.cos(t * 1.8) * 28, 553 + Math.sin(t * 1.8) * 5];
    a.armB = { hand: F.local(a, -60, 590) };
    F.person(g, a);
    P.line(g, tip[0] - 70, tip[1] - 18, tip[0], tip[1], 6, '#b98a5a');
    F.person(g, Object.assign({}, a, { only: 'armF', skip: null, armF: turn ? { a: 0.5, b: 0.6 } : { hand: F.local(a, tip[0] - 58, tip[1] - 15) } }));
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
  /* o: { chalk: {k}, near: {k} (he comes to sit by her), lift: {k} (she looks up), fall: {k} (falling into it),
     settle: {k} (the room stops drifting) }. Nothing in a dream stays put: the room sways, the air is full of
     slow lights, and the things of the flat float loose until they are put back (D.gather). */
  T.dream = function (o) {
    const D = Object.assign({ dark: true, mood: 'night', chord: 2, chalk: { k: 0 }, near: { k: 0 }, lift: { k: 0 }, lean: { k: 0 }, fall: { k: 0 }, settle: { k: 0 }, items: null, gq: null }, o);
    const ITEMS = [
      { name: 'cup', home: [-436, 600], f: [-40, 330] }, { name: 'book', home: [-330, 486], f: [60, 450] },
      { name: 'photo', home: [-200, 452], f: [-30, 560] }, { name: 'clock', home: [-470, 444], f: [-600, 330] }, { name: 'plant', home: [-150, 618], f: [-620, 600] },
    ];
    let off = null, gen = -1;
    const ZM = 1.38, ZC = [-300, 520], ZS = [-110, 470];
    const toScr = (x, y) => [(x - ZC[0]) * ZM + ZS[0], (y - ZC[1]) * ZM + ZS[1]];
    const toScene = (x, y) => [(x - ZS[0]) / ZM + ZC[0], (y - ZS[1]) / ZM + ZC[1]];
    function build() {
      const V = T.view;
      off = document.createElement('canvas'); off.width = Math.ceil(V.W * V.ps); off.height = Math.ceil(900 * V.ps); gen = T.gen;
    }
    function item(g, n, x, y, rot, a) {
      g.save(); g.translate(x, y); g.rotate(rot); g.scale(1.3, 1.3); g.globalAlpha *= a;
      if (n === 'cup') { P.fill(g, P.poly([[-14, -16], [14, -16], [10, 10], [-10, 10]]), '#f6efe0'); g.strokeStyle = '#f6efe0'; g.lineWidth = 4; g.beginPath(); g.arc(16, -3, 7, -1.4, 1.4); g.stroke(); P.fill(g, P.ellipse(0, -16, 14, 3.5), '#c9a070'); }
      else if (n === 'book') { P.fill(g, P.rr(-30, -9, 60, 18, 3), '#d7a23c'); P.fill(g, P.rr(-27, -6, 54, 12, 2), '#f6f0e0'); P.fill(g, P.rr(12, -10, 5, 22, 1), '#c9573f'); }
      else if (n === 'photo') { P.fill(g, P.rr(-22, -28, 44, 56, 3), '#7a5a3e'); P.fill(g, P.rr(-17, -23, 34, 46, 2), '#e9dcc0'); P.fill(g, P.circle(-5, -6, 5), '#c9573f'); P.fill(g, P.circle(6, -6, 5), '#d7a23c'); }
      else if (n === 'clock') { P.fill(g, P.circle(0, 0, 20), '#f6efe0'); g.strokeStyle = '#3d3a5c'; g.lineWidth = 2.5; g.beginPath(); g.arc(0, 0, 20, 0, TAU); g.moveTo(0, 0); g.lineTo(0, -12); g.moveTo(0, 0); g.lineTo(8, 3); g.stroke(); }
      else { P.fill(g, P.poly([[-14, -2], [14, -2], [10, 22], [-10, 22]]), '#c9805a'); P.fill(g, P.ellipse(-8, -14, 7, 14, -0.4), '#6fa35c'); P.fill(g, P.ellipse(8, -14, 7, 14, 0.4), '#6fa35c'); P.fill(g, P.ellipse(0, -20, 6, 15), '#7fb36c'); }
      g.restore();
    }
    const itemAt = (it, t) => {
      const k = T.ease.io(it.k);
      const fx = it.f[0] + Math.sin(t * 0.6 + it.ph) * 26, fy = it.f[1] + Math.sin(t * 0.9 + it.ph * 2) * 18;
      return [T.lerp(fx, it.home[0], k), T.lerp(fy, it.home[1], k) - Math.sin(k * Math.PI) * 60, (1 - k) * Math.sin(t * 0.7 + it.ph) * 0.8];
    };
    function scene(g, t) {
      const H = T.scenes.home, G = H.GEO, W = T.view.W;
      H.paintStill(g, D.chalk.k);
      const near = T.ease.io(D.near.k), lift = T.ease.io(D.lift.k), ln = T.ease.io(D.lean.k);
      const ana = { x: G.ROOM.x + 290, y: G.FLOOR - 55, s: 190, style: F.anaAt(39, { top: '#e9dcc3', bottom: '#9fb0c4', skirt: 30 }), flip: true, sit: true, lean: 0.3 - lift * 0.22 + ln * 0.16, headTilt: 0.5 - lift * 0.5 + ln * 0.12, face: { eye: lift > 0.5 ? (ln > 0.5 ? 'closed' : 'open') : 'closed', mouth: lift > 0.7 ? 'smile' : 'line', blush: 0.2, tear: lift < 0.5 ? 0.8 : 0.3, tearY: (t * 2) % 3 } };
      /* her hand, held out into the space between them; his comes to meet it there */
      const meet = [ana.x - 44, ana.y - 22 + lift * 14];
      ana.armF = { hand: F.local(ana, meet[0] + 4, meet[1] + 2) }; ana.armB = { a: 0.5, b: 0.9 };
      /* he walks over and sits down on the box across from her: close enough to take her hand, not on top of her */
      const SEAT = G.ROOM.x + 196, hh = F.hipHeight(F.styles.leoHome, 200), wk = T.clamp(near / 0.8), sk = T.smooth(T.clamp((near - 0.8) / 0.2));
      const lx = T.lerp(G.ROOM.x + 40, SEAT, T.ease.io(wk));
      const leo = { x: lx, y: T.lerp(G.FLOOR - hh, G.FLOOR - 55, sk), s: 200, style: F.styles.leoHome, lean: 0.06, headTilt: 0.1, face: { blush: 0.14, mouth: 'smile' } };
      if (near > 0.02 && near < 0.8) leo.walk = wk * 11;
      else if (near >= 0.8 && near < 0.98) { leo.legF = { foot: [T.lerp(1, 26, sk), T.lerp(48.8, 26.5, sk)] }; leo.legB = { foot: [T.lerp(-1, 22, sk), T.lerp(48.8, 27, sk)] }; leo.lean = 0.06 + sk * 0.1; }
      else if (near >= 0.98) { leo.sit = true; leo.y = G.FLOOR - 55; leo.lean = 0.16 + ln * 0.04; leo.armF = { hand: F.local(leo, meet[0] - 4, meet[1] - 1), bend: 1 }; leo.headTilt = 0.12 + ln * 0.08; }
      /* the things of the flat: back in their places they are part of the room, behind the two of them;
         still loose in the air, they drift in front */
      const things = (home) => { if (D.items) for (const it of D.items) { if ((it.k >= 1) !== home) continue; const q = itemAt(it, t); if (it.k < 1) P.glow(g, q[0], q[1], 46, '#fff6e0', 0.35 * (1 - it.k)); item(g, it.name, q[0], q[1], q[2], 1); } };
      things(true);
      g.save(); g.globalAlpha = T.clamp(D.near.k * 6 + (D.enterA || 0));
      P.glow(g, leo.x, leo.y - 30, 110, '#fff0c8', 0.3);
      F.person(g, leo);
      g.restore();
      F.person(g, ana);
      things(false);
      void W;
    }
    D.draw = function (g, t) {
      const V = T.view, W = V.W, ps = V.ps;
      if (!off || gen !== T.gen || off.width !== Math.ceil(W * ps)) build();
      const og = off.getContext('2d');
      og.setTransform(1, 0, 0, 1, 0, 0); og.clearRect(0, 0, off.width, off.height);
      og.setTransform(ps, 0, 0, ps, (W / 2) * ps, 0);
      /* the whole room sways a little, as if on water */
      const sway = (1 - T.ease.io(D.settle.k) * 0.7);
      og.translate(ZS[0], ZS[1]); og.scale(ZM, ZM); og.translate(-ZC[0], -ZC[1]);
      og.translate(-300, 520); og.rotate(Math.sin(t * 0.5) * 0.018 * sway); og.translate(300, -520);
      scene(og, t);
      /* laid down in slow waves: nothing in a dream holds quite still */
      g.fillStyle = '#e9e0f6'; g.fillRect(-W / 2, 0, W, 900);
      const strip = 6;
      for (let y = 0; y < 900; y += strip) {
        const dx = (Math.sin(y * 0.018 + t * 1.1) * 7 + Math.sin(y * 0.047 - t * 1.7) * 3) * sway;
        g.drawImage(off, 0, y * ps, off.width, strip * ps, -W / 2 + dx, y, W, strip + 0.6);
      }
      /* soft at the edges, lilac, and full of slow lights */
      g.save(); g.globalCompositeOperation = 'soft-light'; g.fillStyle = 'rgba(150,130,230,0.45)'; g.fillRect(-W / 2, 0, W, 900); g.restore();
      const vg = g.createRadialGradient(-200, 480, 220, -200, 480, 980);
      vg.addColorStop(0, 'rgba(246,240,255,0)'); vg.addColorStop(0.7, 'rgba(236,226,255,0.55)'); vg.addColorStop(1, 'rgba(246,240,255,0.92)');
      g.fillStyle = vg; g.fillRect(-W / 2, 0, W, 900);
      const r = T.rng(11);
      for (let i = 0; i < 42; i++) {
        const sx = r() * W - W / 2, sp = 0.3 + r() * 0.7, ph = r() * TAU;
        const x = sx + Math.sin(t * 0.3 * sp + ph) * 40, y = 900 - ((t * 22 * sp + r() * 900) % 960);
        P.glow(g, x, y, 10 + sp * 14, i % 3 ? '#fff6e0' : '#d9c8ff', 0.5 + 0.3 * Math.sin(t * 2 + ph));
      }
      /* falling in: the lake's lights swirl down into a point, and open into the room */
      const fk = D.fall.k;
      if (fk < 1) {
        const a = 1 - T.ease.io(T.clamp((fk - 0.55) / 0.45));
        g.save(); g.globalAlpha = a; g.fillStyle = '#1b2440'; g.fillRect(-W / 2, 0, W, 900);
        const rr = T.rng(4);
        for (let i = 0; i < 120; i++) {
          const ang = rr() * TAU + t * (0.6 + rr()) + fk * 6, d0 = 60 + rr() * 700, d = d0 * (1 - T.ease.in(T.clamp(fk / 0.7)) * 0.96);
          P.glow(g, -60 + Math.cos(ang) * d, 450 + Math.sin(ang) * d * 0.6, 6 + rr() * 10, i % 4 ? '#fff0c8' : '#d9c8ff', 0.8);
        }
        P.glow(g, -60, 450, 40 + fk * 600, '#f6f0ff', T.clamp(fk * 1.4));
        g.restore();
      }
      if (D.gq && !D.gq.done) {
        T.band(g, 1);
        P.text(g, '꿈속에서는 아무것도 제자리에 있지 않아요. 떠다니는 것들을 눌러 제자리로 돌려 주세요', 0, 866, { font: 'serif', size: 26, color: '#fbf6ff', alpha: 0.96, glow: 'rgba(27,36,64,0.95)' });
        if (D.gq.idle > 9) { const h = D.hintAt(); if (h) P.beacon(g, h[0], h[1], 52, t, 1, '#fff0c8'); }
      }
    };
    /* put the room back together, a thing at a time; resolves when all of it is home */
    D.gather = function () {
      D.items = ITEMS.map((it, i) => Object.assign({ k: 0, ph: i * 1.7, done: false }, it));
      return new Promise((res) => { D.gq = { idle: 0, done: false, res, n: 0 }; });
    };
    function put(i) {
      const it = D.items && D.items[i];
      if (!it || it.done || !D.gq || D.gq.done) return;
      it.done = true; D.gq.idle = 0; D.gq.n++;
      T.audio.step(D.gq.n * 2, { voice: 'glass', vel: 0.34 });
      if (D.items.every((q) => q.done)) { D.gq.done = true; D.gq.wait = 1.6; T.audio.promise(); }
    }
    D.update = function (dt) {
      if (D.items) for (const it of D.items) if (it.done && it.k < 1) it.k = Math.min(1, it.k + dt * 1.6);
      const q = D.gq;
      if (!q) return;
      if (!q.done) q.idle += dt;
      else if (q.wait > 0) { q.wait -= dt; if (q.wait <= 0) q.res(); }
    };
    D.pointer = function (type, x, y) {
      if (!D.gq || D.gq.done || type !== 'down') return false;
      const t = T.time;
      let best = -1, bd = 70;
      D.items.forEach((it, i) => { if (it.done) return; const q0 = itemAt(it, t), q = toScr(q0[0], q0[1]), d = Math.hypot(x - q[0], y - q[1]); if (d < bd) { bd = d; best = i; } });
      if (best >= 0) put(best);
      return true;
    };
    D.key = function (key) { if (!D.gq || D.gq.done) return false; const n = +key - 1; if (n >= 0 && n < 5) { put(n); return true; } return false; };
    D.want = function () { if (!D.gq || D.gq.done) return null; const i = D.items.findIndex((q) => !q.done); return i >= 0 ? 'key:' + (i + 1) : null; };
    D.hintAt = function () { if (!D.gq || D.gq.done) return null; const it = D.items.find((q) => !q.done); if (!it) return null; const q = itemAt(it, T.time); return toScr(q[0], q[1]); };
    D.spot = () => { const G = T.scenes.home.GEO, q = toScr(G.ROOM.x + 290, G.FLOOR - 110); return [q[0], q[1], 90]; };
    return D;
  };
})();
