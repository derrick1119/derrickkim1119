/* Memory: Bean's lead → an evening walk up the hill behind the town.
   The land gives under your finger: pull each far hill down until its ridge meets the path.
   At the top the dark comes, and they paint the sky with the aurora they mean to see one day. */
(function () {
  'use strict';
  const T = window.TYT, P = T.P, F = T.F;
  const TAU = Math.PI * 2;

  const J1 = -150, J2 = 150, TOP = 424, TREE = 492;
  const K1 = [[-1100, 770], [-640, 712], [-400, 646], [-150, 612], [50, 690], [300, 776], [1100, 810]];
  const K2 = [[-1100, 650], [-520, 628], [-150, 612], [150, 508], [520, 584], [1100, 610]];
  const K3 = [[-1100, 530], [-320, 520], [150, 510], [340, 372], [460, 358], [740, 446], [1100, 486]];
  const KM = [[-1100, 440], [-760, 380], [-520, 430], [-260, 350], [20, 420], [260, 372], [520, 410], [800, 350], [1100, 420]];
  function interp(k, x) {
    if (x <= k[0][0]) return k[0][1];
    for (let i = 1; i < k.length; i++) {
      if (x <= k[i][0]) { const u = (x - k[i - 1][0]) / (k[i][0] - k[i - 1][0]); const s = (1 - Math.cos(u * Math.PI)) / 2; return k[i - 1][1] + (k[i][1] - k[i - 1][1]) * s; }
    }
    return k[k.length - 1][1];
  }
  const bump = (x, c, w) => Math.exp(-((x - c) / w) * ((x - c) / w));

  const S = (T.scenes.walk = {
    d2: 0, d3: 0, a2: 0, a3: 0, join1: false, join2: false, x: -480, ph: 0, moving: false, phase: 'walk',
    sit: { k: 0 }, night: { k: 0 }, point: { k: 0 }, rest: { k: 0 }, snap: { k: 0, x: 0, y: 0 },
    drag: null, paint: [], painted: 0, lastNote: 0, auto: 0, stars: [], strip: null, wob: { k: 0 }, trees: [],
  });
  const M = T.memory(S, { id: 'leash', line: '오로라, 꼭 같이 보러 가자.', seed: 17, chord: 5, lineY: 800, size: 70, ink: '#f2fbf2', bandColor: '#0c1326', glow: 'rgba(140,255,200,0.35)' });

  const y1 = (x) => interp(K1, x);
  const y2 = (x) => interp(K2, x) + S.d2 * bump(x, J1, 270);
  const y3 = (x) => interp(K3, x) + S.d3 * bump(x, J2, 250);
  const ym = (x) => interp(KM, x);
  const hillOf = (x) => (x < J1 || !S.join1 ? 1 : x < J2 || !S.join2 ? 2 : 3);
  const groundAt = (x) => { const h = hillOf(x); return h === 1 ? y1(x) : h === 2 ? y2(x) : y3(x); };
  const sizeAt = (x) => T.lerp(T.lerp(152, 144, T.smooth(T.unlerp(J1 - 50, J1 + 50, x))), 136, T.smooth(T.unlerp(J2 - 50, J2 + 50, x)));

  S.build = function () {
    M.rebuild();
    /* one soft curtain of light, reused for every stroke of aurora */
    const c = document.createElement('canvas');
    c.width = 48; c.height = 256;
    const g = c.getContext('2d');
    const v = g.createLinearGradient(0, 0, 0, 256);
    v.addColorStop(0, 'rgba(150,120,255,0)'); v.addColorStop(0.3, 'rgba(120,150,255,0.25)'); v.addColorStop(0.62, 'rgba(110,245,190,0.75)');
    v.addColorStop(0.86, 'rgba(160,255,200,0.95)'); v.addColorStop(0.95, 'rgba(255,170,220,0.5)'); v.addColorStop(1, 'rgba(255,170,220,0)');
    g.fillStyle = v; g.fillRect(0, 0, 48, 256);
    g.globalCompositeOperation = 'destination-in';
    const h = g.createLinearGradient(0, 0, 48, 0);
    h.addColorStop(0, 'rgba(0,0,0,0)'); h.addColorStop(0.5, 'rgba(0,0,0,1)'); h.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = h; g.fillRect(0, 0, 48, 256);
    S.strip = c;
  };

  S.enter = function () {
    M.enter();
    P.grainAmt = 0.18; P.vignette = 0.2; P.vignetteColor = '#1c1830';
    S.d2 = 0; S.d3 = 0;
    S.a2 = y1(J1) - interp(K2, J1);                  /* where each hill has to sit for the ridges to meet */
    S.d2 = S.a2;
    S.a3 = y2(J2) - interp(K3, J2);
    S.d2 = S.a2 - 98; S.d3 = S.a3 - 116;
    S.join1 = false; S.join2 = false; S.x = -500; S.ph = 0; S.moving = false; S.phase = 'walk';
    S.sit.k = 0; S.night.k = 0; S.point.k = 0; S.rest.k = 0; S.snap.k = 0; S.wob.k = 0;
    S.drag = null; S.paint = []; S.painted = 0; S.lastNote = 0; S.auto = 0; S.autoLast = null;
    if (!S.stars.length) {
      const r = T.rng(23);
      for (let i = 0; i < 90; i++) S.stars.push({ x: (r() - 0.5) * 2100, y: 40 + r() * 400, s: 0.8 + r() * 1.8, ph: r() * 9, at: r() });
      for (let i = 0; i < 9; i++) S.trees.push({ x: [-900, -700, -420, -40, 30, 300, 560, 700, 880][i], hill: [2, 2, 2, 2, 2, 2, 2, 2, 2][i], s: 0.7 + r() * 0.5, c: ['#e08a3c', '#cf6a3a', '#e6a640'][i % 3] });
      for (let i = 0; i < 7; i++) S.trees.push({ x: [-860, -560, -300, -60, 640, 800, 980][i], hill: 3, s: 0.5 + r() * 0.35, c: ['#d98a52', '#c9705a', '#deA24a'][i % 3].toLowerCase() });
    }
  };

  function target() { return !S.join1 ? 2 : !S.join2 ? 3 : 0; }
  function moveHill(dy) {
    const h = target();
    if (!h || M.done) return;
    M.touch();
    if (h === 2) {
      S.d2 = T.clamp(S.d2 + dy, S.a2 - 140, S.a2 + 46);
      if (Math.abs(S.d2 - S.a2) < 7) { S.d2 = S.a2; joined(1); }
    } else {
      S.d3 = T.clamp(S.d3 + dy, S.a3 - 150, S.a3 + 46);
      if (Math.abs(S.d3 - S.a3) < 7) { S.d3 = S.a3; joined(2); }
    }
  }
  function joined(n) {
    if (n === 1) S.join1 = true; else S.join2 = true;
    S.drag = null;
    const jx = n === 1 ? J1 : J2;
    S.snap.x = jx; S.snap.y = n === 1 ? y1(jx) : y2(jx); S.snap.k = 1;
    S.clock.tween(S.snap, 'k', 0, 1.4, T.ease.out);
    T.audio.sfx('join');
    for (let i = 0; i < 3; i++) M.note({ voice: 'box', vel: 0.4, at: 0.25 + i * 0.36 });
  }

  async function arrive() {
    const k = S.clock;
    S.phase = 'settle';
    await k.tween(S.sit, 'k', 1, 1.1, T.ease.io);
    T.audio.pad(6, 0.18);
    k.tween(S.night, 'k', 1, 5.5, T.ease.io);
    await k.wait(2.4);
    k.tween(S.point, 'k', 1, 0.9, T.ease.out);
    await k.wait(1.6);
    S.phase = 'paint';
    M.idle = 1.2;
  }

  function addPaint(x, y) {
    const last = S.paint[S.paint.length - 1];
    const horizon = Math.min(ym(x), y3(x)) - 30;
    y = Math.min(y, horizon);
    if (last && !last.gap) {
      const d = Math.hypot(x - last.x, y - last.y);
      if (d < 13) return;
      const n = Math.min(12, Math.floor(d / 13));
      for (let i = 1; i <= n; i++) S.paint.push({ x: T.lerp(last.x, x, i / n), y: T.lerp(last.y, y, i / n), t: S.clock.t, ph: S.paint.length * 0.37 });
      S.painted += d;
    } else {
      S.paint.push({ x, y, t: S.clock.t, ph: S.paint.length * 0.37 });
    }
    if (S.paint.length > 420) S.paint.splice(0, S.paint.length - 420);
    M.touch();
    const n = Math.floor(S.painted / 190);
    if (n > S.lastNote) { S.lastNote = n; M.note({ voice: 'box', vel: 0.36 }); T.audio.sfx('star', (n * 0.31) % 1); }
    if (S.painted > 1450 && S.phase === 'paint') finishPaint();
  }
  function finishPaint() {
    S.phase = 'done';
    S.auto = 0.001;
    S.clock.tween(S.rest, 'k', 1, 1.6, T.ease.io);
    S.clock.tween(S.point, 'k', 0, 1.2, T.ease.io);
    M.finish();
  }

  S.pointer = function (type, x, y) {
    if (S.phase === 'done' && M.pointerDone(type)) return;
    if (S.phase === 'walk') {
      const h = target();
      T.cursor(S.drag ? 'grabbing' : h ? 'grab' : 'default');
      if (type === 'down' && h) { S.drag = { y }; M.touch(); }
      else if (type === 'move' && S.drag) { moveHill(y - S.drag.y); if (S.drag) S.drag.y = y; }
      else if (type === 'up') S.drag = null;
    } else if (S.phase === 'paint') {
      T.cursor('crosshair');
      if (type === 'down') { S.drag = { y }; if (S.paint.length) S.paint[S.paint.length - 1].gap = true; addPaint(x, y); }
      else if (type === 'move' && S.drag) addPaint(x, y);
      else if (type === 'up') { S.drag = null; if (S.paint.length) S.paint[S.paint.length - 1].gap = true; }
    } else T.cursor('default');
  };
  S.key = function (key) {
    if (M.ready && (key === ' ' || key === 'Enter')) { M.tap(); return; }
    if (S.phase === 'walk') {
      if (key === 'ArrowDown' || key === ' ' || key === 'Enter') moveHill(12); else if (key === 'ArrowUp') moveHill(-12); else return false;
    } else if (S.phase === 'paint') {
      if (key === ' ' || key === 'Enter' || key.startsWith('Arrow')) {
        const u = (S.painted / 1450) * 1.15;
        if (S.paint.length) S.paint[S.paint.length - 1].gap = false;
        addPaint(-520 + u * 900, 250 + Math.sin(u * 7) * 70);
      } else return false;
    } else return false;
  };

  S.update = function (dt) {
    M.update(dt);
    if (S.phase === 'walk') {
      const limit = !S.join1 ? J1 - 74 : !S.join2 ? J2 - 74 : TOP;
      S.moving = S.x < limit;
      if (S.moving) {
        const slope = Math.abs(groundAt(S.x + 8) - groundAt(S.x - 8)) / 16;
        const v = 64 / (1 + slope * 0.8);
        S.x = Math.min(limit, S.x + v * dt);
        S.ph += (v * dt) / 9.5;
        const st = Math.floor(S.ph / Math.PI);
        if (st !== S.lastStep) { S.lastStep = st; if (st % 2 === 0) T.audio.sfx('step'); }
      }
      if (S.x >= TOP) arrive();
    }
    if (S.auto > 0 && S.auto < 1) {
      /* the sky finishes the thought for them */
      S.auto = Math.min(1, S.auto + dt / 4.5);
      const u = S.auto;
      const x = -640 + u * 1150, y = 210 + Math.sin(u * 8.5) * 70 - u * 40;
      const last = S.paint[S.paint.length - 1];
      if (last && Math.abs(last.x - x) > 200) last.gap = true;
      if (!S.autoLast || Math.abs(x - S.autoLast) >= 14) { S.autoLast = x; S.paint.push({ x, y, t: S.clock.t, ph: S.paint.length * 0.37 }); }
      if (S.paint.length > 520) S.paint.splice(0, S.paint.length - 520);
    }
  };

  /* ---------- drawing ---------- */
  function hillPath(g, fn, x0, x1, ox) {
    g.beginPath();
    g.moveTo(x0, 960);
    for (let x = x0; x <= x1; x += 18) g.lineTo(x, fn(x - ox));
    g.lineTo(x1, fn(x1 - ox)); g.lineTo(x1, 960);
    g.closePath();
  }
  function tufts(g, fn, seed, color, x0, x1, ox, n, size) {
    const r = T.rng(seed);
    g.strokeStyle = color; g.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const x = -1000 + r() * 2000, d = 14 + r() * 150, s = size * (0.6 + r() * 0.8);
      if (x + ox < x0 || x + ox > x1) continue;
      const y = fn(x) + d;
      g.lineWidth = 2.2 + r() * 1.6; g.globalAlpha = 0.5 * (1 - d / 190);
      g.beginPath(); g.moveTo(x + ox - s, y); g.quadraticCurveTo(x + ox, y - s * 1.3, x + ox + s * 0.8, y - s * 0.2); g.stroke();
    }
    g.globalAlpha = 1;
  }
  function tree(g, x, y, s, color, dark) {
    P.line(g, x, y + 4, x, y - 30 * s, 5 * s, dark);
    P.fill(g, P.ellipse(x, y - 52 * s, 24 * s, 30 * s), color);
    P.fill(g, P.ellipse(x - 12 * s, y - 40 * s, 15 * s, 17 * s), T.shade(color, -0.08));
  }
  function bigTree(g, x, y, night) {
    const dark = T.mix('#4a3247', '#1a1c33', night * 0.7);
    g.strokeStyle = dark; g.lineCap = 'round'; g.lineWidth = 15;
    g.beginPath(); g.moveTo(x + 4, y + 10); g.quadraticCurveTo(x - 6, y - 70, x + 6, y - 130); g.stroke();
    g.lineWidth = 8;
    g.beginPath(); g.moveTo(x, y - 90); g.quadraticCurveTo(x - 40, y - 120, x - 62, y - 150); g.stroke();
    g.beginPath(); g.moveTo(x + 4, y - 100); g.quadraticCurveTo(x + 44, y - 124, x + 58, y - 160); g.stroke();
    const cols = ['#e3923f', '#d6703b', '#e9ae46', '#c95a38', '#e39a44'];
    const r = T.rng(71);
    for (let i = 0; i < 16; i++) {
      const a = r() * TAU, d = 20 + r() * 74;
      const lx = x + Math.cos(a) * d * 1.25, ly = y - 168 + Math.sin(a) * d * 0.8;
      P.fill(g, P.ellipse(lx, ly, 34 + r() * 22, 28 + r() * 16, r() * 3), T.mix(cols[i % 5], '#2a2c55', night * 0.55));
    }
    /* a few leaves letting go */
    for (let i = 0; i < 5; i++) {
      const life = (T.time * 0.09 + i * 0.21) % 1;
      const lx = x - 80 + i * 36 + Math.sin(T.time * 1.2 + i * 2) * 16 - life * 60, ly = y - 150 + life * 190;
      g.save(); g.translate(lx, ly); g.rotate(T.time * 1.5 + i); g.globalAlpha = Math.sin(life * Math.PI) * 0.9;
      g.fillStyle = T.mix(cols[i % 5], '#2a2c55', night * 0.5);
      g.beginPath(); g.ellipse(0, 0, 7, 3.6, 0, 0, TAU); g.fill(); g.restore();
    }
  }

  function walkers(g, layer) {
    const t = T.time, sit = T.ease.io(S.sit.k), moving = S.moving;
    const arrived = S.phase !== 'walk';
    const who = [
      { id: 'bean', x: S.x + 58 },
      { id: 'leo', x: S.x },
      { id: 'ana', x: S.x - 40 },
    ];
    if (arrived) { who[0].x = TOP + 58 - sit * 172; who[1].x = TOP; who[2].x = TOP - 40 + sit * 6; }
    let leoHand = null, collar = null, onLayer = false;
    for (const w of who) {
      const hill = hillOf(w.x);
      if (hill !== layer) continue;
      onLayer = true;
      const gy = groundAt(w.x), s = sizeAt(w.x);
      const waiting = !moving && !arrived;
      if (w.id === 'bean') {
        const slope = Math.atan2(groundAt(w.x + 14) - groundAt(w.x - 14), 28);
        const b = F.dog(g, { x: w.x, y: gy + 2, rot: slope * 0.75, s: s * 1.5, walk: moving ? S.ph : null, sit: arrived ? sit : waiting ? 1 : 0, flip: arrived && sit > 0.4, wag: Math.sin(t * (waiting || arrived ? 12 : 7)), headTilt: arrived ? -0.25 * S.night.k : waiting ? -0.3 : 0 });
        collar = b.collar;
      } else {
        const st = w.id === 'leo' ? Object.assign({}, F.styles.leo, { scarf: '#c9573f' }) : Object.assign({}, F.styles.ana, { top: '#c9573f', scarf: '#f1e6cf' });
        const sz = w.id === 'leo' ? s : s * 0.93;
        const hh = F.hipHeight(st, sz);
        const o = { x: w.x, y: gy - hh * (1 - sit * 0.72), s: sz, style: st, face: { blush: 0.2 } };
        if (arrived) {
          /* sitting on the grass, knees up, faces to the open sky */
          o.flip = sit > 0.4;
          const kf = [T.lerp(1, 20, sit), T.lerp(49, 15, sit)], kb = [T.lerp(-1, 15, sit), T.lerp(49, 16, sit)];
          o.legF = { foot: kf }; o.legB = { foot: kb };
          const look = S.night.k * 0.3;
          if (w.id === 'ana') {
            o.lean = -0.1 * sit - S.rest.k * 0.24;
            o.headTilt = -look - S.rest.k * 0.16;
            const pt = T.ease.io(S.point.k);
            o.armF = pt > 0.01 ? { a: T.lerp(0.7, 2.25, pt) + Math.sin(t * 2) * 0.04, b: T.lerp(0.9, 0.12, pt) } : { a: 0.75, b: 0.9 };
            o.armB = { a: 0.7, b: 0.9 };
            o.face = { eye: S.rest.k > 0.6 ? 'happy' : 'open', mouth: 'smile', blush: 0.25 };
          } else {
            o.lean = -0.14 * sit;
            o.headTilt = -look;
            o.armF = { a: 0.75, b: 0.95 };
            o.armB = S.rest.k > 0.2 ? { a: 1.1, b: 0.5 } : { a: 0.7, b: 0.9 };
            o.face = { eye: 'open', mouth: 'smile' };
          }
        } else if (moving) {
          o.walk = S.ph + (w.id === 'ana' ? 2.2 : 0);
          o.lean = 0.07;
          if (w.id === 'leo') o.armF = { a: 0.7, b: 0.5 };
        } else {
          o.lean = 0.02; o.headTilt = -0.18 + Math.sin(t * 0.8 + (w.id === 'ana' ? 1 : 0)) * 0.03;
          if (w.id === 'leo') o.armF = { a: 0.6, b: 0.5 };
          if (w.id === 'ana') o.armF = { a: 1.5 + Math.sin(t * 1.5) * 0.08, b: 0.3 };   /* she points at the hill ahead */
        }
        const j = F.person(g, o);
        if (w.id === 'leo') leoHand = j.handF;
      }
    }
    if (leoHand && collar) F.leash(g, leoHand, collar, arrived ? 10 : moving ? 12 : 22, 2.4);
    if (onLayer && S.night.k > 0.01) P.glow(g, who[1].x, groundAt(who[1].x) - 50, 150, '#1b2452', 0.42 * S.night.k, 'multiply');
    return onLayer;
  }

  S.draw = function (g) {
    const V = T.view, W = V.W, t = T.time, n = S.night.k;
    const x0 = -W / 2 - 30, x1 = W / 2 + 30;
    const [px, py] = T.par(0.5);
    const tint = (c, k) => T.mix(c, '#141a36', n * (k == null ? 0.62 : k));

    /* sky */
    const sky = g.createLinearGradient(0, 0, 0, 640);
    sky.addColorStop(0, T.mix('#4a4a80', '#0b1026', n)); sky.addColorStop(0.5, T.mix('#b0748f', '#16204a', n)); sky.addColorStop(0.9, T.mix('#f3ad78', '#33406e', n));
    g.fillStyle = sky; g.fillRect(x0, 0, x1 - x0, 900);
    if (n < 0.98) P.glow(g, -260 + px * 0.2, 560, 420, '#ffd08a', 0.7 * (1 - n));
    /* stars come out one at a time */
    g.fillStyle = '#f6f3ff';
    for (const s of S.stars) {
      const a = T.clamp((n - s.at * 0.75) * 5);
      if (a <= 0) continue;
      g.globalAlpha = a * (0.5 + 0.5 * Math.sin(t * 1.3 + s.ph));
      g.beginPath(); g.arc(s.x + px * 0.15, s.y + py * 0.15, s.s, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
    /* aurora */
    if (S.paint.length) {
      g.save(); g.globalCompositeOperation = 'lighter';
      const now = S.clock.t;
      for (let i = 0; i < S.paint.length; i++) {
        const p = S.paint[i];
        const age = now - p.t;
        const grow = T.clamp(age / 0.7);
        const h = (190 + Math.sin(p.ph * 3.1 + t * 0.7) * 60) * (0.35 + 0.65 * grow);
        const sway = Math.sin(t * 0.9 + p.x * 0.011 + p.ph) * 12;
        g.globalAlpha = 0.27 * (0.6 + 0.4 * Math.sin(t * 1.7 + p.ph * 5)) * Math.min(1, age * 4 + 0.2);
        g.drawImage(S.strip, p.x - 30 + sway, p.y - h * 0.82, 60, h);
      }
      g.restore();
    }

    /* far mountains */
    g.fillStyle = tint('#6a6193', 0.7); hillPath(g, ym, x0, x1, px * 0.3); g.fill();

    /* the three hills, far to near, with whoever is standing on each */
    const o3 = px * 0.5, o2 = px * 0.8, o1 = px * 1.1;
    const tgt = S.phase === 'walk' ? target() : 0;
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.6);

    g.save(); g.translate(o3, 0);
    g.fillStyle = tint('#7a6a9c'); hillPath(g, y3, x0 - o3, x1 - o3, 0); g.fill();
    tufts(g, y3, 5, tint('#5f5383'), x0 - o3, x1 - o3, 0, 60, 9);
    for (const tr of S.trees) if (tr.hill === 3) tree(g, tr.x, y3(tr.x), tr.s, tint(tr.c, 0.5), tint('#4a3d63'));
    bigTree(g, TREE, y3(TREE), n);
    if (tgt === 3) ridgeGlow(g, y3, J2, pulse);
    walkers(g, 3);
    g.restore();

    g.save(); g.translate(o2, 0);
    g.fillStyle = tint('#9d6d88'); hillPath(g, y2, x0 - o2, x1 - o2, 0); g.fill();
    tufts(g, y2, 6, tint('#7e5471'), x0 - o2, x1 - o2, 0, 70, 11);
    for (const tr of S.trees) if (tr.hill === 2 && (tr.x < J1 - 60 || tr.x > J2 + 60)) tree(g, tr.x, y2(tr.x), tr.s, tint(tr.c, 0.5), tint('#5a3d56'));
    if (tgt === 2) ridgeGlow(g, y2, J1, pulse);
    walkers(g, 2);
    g.restore();

    g.save(); g.translate(o1, 0);
    g.fillStyle = tint('#c4775c'); hillPath(g, y1, x0 - o1, x1 - o1, 0); g.fill();
    tufts(g, y1, 7, tint('#9d5646'), x0 - o1, x1 - o1, 0, 90, 14);
    walkers(g, 1);
    g.restore();

    /* the place where the two ridges should meet */
    if (tgt) {
      const jx = tgt === 2 ? J1 : J2, oa = tgt === 2 ? o1 : o2, ob = tgt === 2 ? o2 : o3;
      const ya = tgt === 2 ? y1(jx) : y2(jx), yb = tgt === 2 ? y2(jx) : y3(jx);
      g.save(); g.setLineDash([3, 8]); g.lineDashOffset = -t * 12;
      P.strokePts(g, [[jx + ob, yb], [jx + oa, ya]], 2.5, T.rgba('#fff3d0', 0.5 + 0.3 * pulse));
      g.restore();
      P.glow(g, jx + oa, ya, 26, '#ffe9b0', 0.6 + 0.3 * pulse);
      P.glow(g, jx + ob, yb, 26, '#ffe9b0', 0.6 + 0.3 * pulse);
      g.fillStyle = '#fff3d0';
      g.beginPath(); g.arc(jx + oa, ya, 5, 0, TAU); g.fill();
      g.beginPath(); g.arc(jx + ob, yb, 5, 0, TAU); g.fill();
    }
    if (S.snap.k > 0.01) P.glow(g, S.snap.x + px * 0.8, S.snap.y, 60 + (1 - S.snap.k) * 160, '#fff0c0', S.snap.k * 0.9);

    /* tall grass at our feet */
    const fg = tint('#3f2d45', 0.5);
    g.fillStyle = fg;
    g.beginPath(); g.moveTo(x0, 900);
    for (let x = x0; x <= x1; x += 22) g.lineTo(x + px * 1.6, 846 + T.noise(x * 0.006, 4) * 26 + Math.sin(x * 0.05) * 5);
    g.lineTo(x1, 900); g.closePath(); g.fill();
    const r = T.rng(9);
    g.strokeStyle = fg; g.lineCap = 'round';
    for (let i = 0; i < 46; i++) {
      const x = x0 + r() * (x1 - x0), h = 30 + r() * 62, sway = Math.sin(t * 1.1 + i) * 5;
      g.lineWidth = 2 + r() * 2.5;
      g.beginPath(); g.moveTo(x + px * 1.6, 880); g.quadraticCurveTo(x + px * 1.6 + sway * 0.4, 880 - h * 0.6, x + px * 1.6 + sway + (r() - 0.5) * 18, 880 - h); g.stroke();
    }
    /* the aurora lays a little green on the land */
    if (S.paint.length && n > 0.3) {
      g.save(); g.globalCompositeOperation = 'screen';
      const lg = g.createLinearGradient(0, 380, 0, 640);
      lg.addColorStop(0, T.rgba('#5fe0b0', 0)); lg.addColorStop(1, T.rgba('#5fe0b0', 0.08 * Math.min(1, S.paint.length / 120)));
      g.fillStyle = lg;
      g.fillRect(x0, 380, x1 - x0, 520);
      g.restore();
    }

    /* hints */
    const h = M.hint(2);
    if (h > 0) {
      if (tgt) {
        const jx = tgt === 2 ? J1 : J2, ob = tgt === 2 ? o2 : o3;
        const yb = tgt === 2 ? y2(jx) : y3(jx), ya = tgt === 2 ? y1(jx) : y2(jx);
        P.fingerHint(g, [[jx + ob + 70, yb + 46], [jx + ob + 70, ya + 46]], (t * 0.5) % 1, h);
      } else if (S.phase === 'paint') {
        const pts = [];
        for (let i = 0; i <= 20; i++) pts.push([-480 + i * 34, 250 + Math.sin(i * 0.5) * 60]);
        P.fingerHint(g, pts, (t * 0.33) % 1, h, '#c8ffe6');
      }
    }
    M.drawOver(g);
  };

  function ridgeGlow(g, fn, cx, pulse) {
    g.save();
    g.globalCompositeOperation = 'screen';
    g.lineCap = 'round';
    for (let pass = 0; pass < 2; pass++) {
      g.strokeStyle = T.rgba('#ffe9b0', (pass ? 0.5 : 0.16) * (0.5 + 0.5 * pulse));
      g.lineWidth = pass ? 3 : 12;
      g.beginPath();
      for (let x = cx - 260; x <= cx + 260; x += 16) {
        const y = fn(x) + 1;
        if (x === cx - 260) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();
    }
    g.restore();
  }
})();
