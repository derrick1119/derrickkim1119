/* Take Your Time — shooting stars and wish lights.
   When someone crosses the cloud sea, a star falls across the sky of the living world; a wish made on it
   by someone down there falls back into the harbour as a small light. Cheap to draw: one tapered ribbon,
   a few glows, a handful of glints that linger where the head has been.

   T.fx.shootingStar(g, t, s)     draw one star from its state (see below), for scenes that keep their own
   T.fx.stars()                   a manager: { add(o) -> Promise, wish(o) -> Promise, draw(g, t, layer), update(dt), clear(), has(layer) }
   T.fx.star                      the shared manager. Its 'screen' layer draws itself over whatever scene is on
                                  (under the scene-change fade) and follows that scene's clock; other layers are
                                  drawn only where a scene asks for them: T.fx.star.draw(g, t, 'lake').
   T.fx.wishLight(o)              a wish falling into the cloud sea on T.fx.star, then (o.to) flying on. */
(function () {
  'use strict';
  const T = window.TYT, P = T.P;
  const FX = (T.fx = T.fx || {});
  const TAU = Math.PI * 2;

  /* a point on the quadratic curve p0 -> c -> p1 */
  const bez = (p0, c, p1, u) => { const v = 1 - u; return [v * v * p0[0] + 2 * v * u * c[0] + u * u * p1[0], v * v * p0[1] + 2 * v * u * c[1] + u * u * p1[1]]; };
  /* a control point bowed off the chord by `bend` of its length (positive bows down-ish for a left-to-right fall) */
  const bow = (a, b, bend) => { const dx = b[0] - a[0], dy = b[1] - a[1]; return [(a[0] + b[0]) / 2 - dy * bend, (a[1] + b[1]) / 2 + dx * bend]; };
  const pathLen = (s) => { let L = 0, q = bez(s.from, s.ctrl, s.to, 0); for (let i = 1; i <= 10; i++) { const p = bez(s.from, s.ctrl, s.to, i / 10); L += Math.hypot(p[0] - q[0], p[1] - q[1]); q = p; } return L || 1; };

  /* ---------- one star ----------
     s: { from: [x, y], to: [x, y], ctrl (optional), k: 0..1 where the head is, end: 0..1 fading after it lands,
          tail: px (260), w: head width (3.2), color (#fff4dc), glow (#ffd98a), a: alpha, seed, dur: seconds (for the glints) } */
  FX.shootingStar = function (g, t, s) {
    if (!s.ctrl) s.ctrl = bow(s.from, s.to, s.bend == null ? 0.06 : s.bend);
    if (!s.len) s.len = pathLen(s);
    const k = T.clamp(s.k == null ? 1 : s.k), end = T.clamp(s.end || 0), a = (s.a == null ? 1 : s.a) * (1 - end);
    const tailU = Math.min(k, (s.tail || 260) / s.len) * (1 - end * 0.85), w = s.w || 3.2;
    const col = s.color || '#fff4dc', glow = s.glow || '#ffd98a';
    if (a <= 0.004 && end >= 1) return;
    g.save();
    g.globalCompositeOperation = 'screen';
    /* the ribbon: widest at the head, nothing at the far end of the tail */
    const n = 16, C = [], N = [], HW = [];
    for (let i = 0; i <= n; i++) {
      const u = Math.max(0, k - (tailU * i) / n), v = 1 - u;
      const tx0 = 2 * v * (s.ctrl[0] - s.from[0]) + 2 * u * (s.to[0] - s.ctrl[0]), ty0 = 2 * v * (s.ctrl[1] - s.from[1]) + 2 * u * (s.to[1] - s.ctrl[1]);
      const tl = Math.hypot(tx0, ty0) || 1;
      C.push(bez(s.from, s.ctrl, s.to, u)); N.push([-ty0 / tl, tx0 / tl]);
      HW.push((w * Math.pow(1 - i / n, 1.25)) / 2 + 0.2);
    }
    const head = C[0], last = C[n];
    if (tailU > 0.002) {
      for (const [wide, al, c] of [[4.2, 0.2, glow], [1, 0.95, col]]) {
        const gr = g.createLinearGradient(head[0], head[1], last[0], last[1]);
        gr.addColorStop(0, T.rgba(c, al * a)); gr.addColorStop(0.35, T.rgba(c, al * 0.45 * a)); gr.addColorStop(1, T.rgba(c, 0));
        g.fillStyle = gr; g.beginPath();
        for (let i = 0; i <= n; i++) { const h = HW[i] * wide; if (i) g.lineTo(C[i][0] + N[i][0] * h, C[i][1] + N[i][1] * h); else g.moveTo(C[i][0] + N[i][0] * h, C[i][1] + N[i][1] * h); }
        for (let i = n; i >= 0; i--) { const h = HW[i] * wide; g.lineTo(C[i][0] - N[i][0] * h, C[i][1] - N[i][1] * h); }
        g.closePath(); g.fill();
      }
    }
    /* glints left behind along the way, drifting down a little and going out */
    const r = T.rng((s.seed || 7) * 131 + 3), dur = s.dur || 1.6, m = 14;
    for (let j = 0; j < m; j++) {
      const f = (j + r()) / m, side = (r() - 0.5) * 16, sz = 0.9 + r() * 1.8, ph = r() * TAU;
      if (f > k) continue;
      const age = (k - f) * dur + end * 0.8, life = 0.9 + sz * 0.25;
      if (age > life) continue;
      const p = bez(s.from, s.ctrl, s.to, f), tw = 0.6 + 0.4 * Math.sin(t * 14 + ph);
      g.globalAlpha = a * (1 - age / life) * tw;
      g.fillStyle = j % 3 ? col : glow;
      g.beginPath(); g.arc(p[0] + side * (0.4 + age), p[1] + age * 14, sz * (1 - age / life * 0.5), 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
    /* the head, and a little four-pointed glint on it */
    const hk = a * (end > 0 ? 1 - end : 1);
    P.glow(g, head[0], head[1], 9 * w, glow, 0.7 * hk, 'screen');
    P.glow(g, head[0], head[1], 3.2 * w, '#ffffff', 0.95 * hk, 'screen');
    const sp = (5 + 2 * Math.sin(t * 9 + (s.seed || 0))) * w * 0.9;
    g.globalAlpha = 0.85 * hk; g.strokeStyle = '#fffdf4'; g.lineCap = 'round'; g.lineWidth = Math.max(0.8, w * 0.32);
    g.beginPath(); g.moveTo(head[0] - sp, head[1]); g.lineTo(head[0] + sp, head[1]); g.moveTo(head[0], head[1] - sp * 0.7); g.lineTo(head[0], head[1] + sp * 0.7); g.stroke();
    g.restore();
  };

  /* ---------- a wish light: a small light that falls, settles on the cloud, and may fly on ---------- */
  function drawWish(g, t, q) {
    const a = q.a * (1 - q.fade);
    if (a <= 0.004) return;
    g.save(); g.globalCompositeOperation = 'screen';
    /* where it touched the cloud: two soft rings */
    if (q.ring0 != null) for (let i = 0; i < 2; i++) {
      const age = q.age - q.ring0 - i * 0.35; if (age < 0 || age > 1.8) continue;
      const rx = 14 + age * 70, ry = rx * 0.26;
      g.strokeStyle = T.rgba(q.color, 0.55 * (1 - age / 1.8) * q.a); g.lineWidth = 2;
      g.beginPath(); g.ellipse(q.ring[0], q.ring[1] + 4, rx, ry, 0, 0, TAU); g.stroke();
    }
    /* its trail */
    for (let i = 0; i < q.trail.length; i++) {
      const p = q.trail[i], k = (i + 1) / q.trail.length;
      g.globalAlpha = a * k * 0.5; g.fillStyle = i % 2 ? q.color : '#fffdf4';
      g.beginPath(); g.arc(p[0], p[1], 0.8 + k * 2.2, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
    const pulse = 0.85 + 0.15 * Math.sin(t * 3.1 + q.seed), flash = q.flash || 0;
    P.glow(g, q.x, q.y, (q.r || 46) * (1 + flash * 1.6), q.color, (0.46 + flash * 0.4) * a * pulse, 'screen');
    P.glow(g, q.x, q.y, 13, '#ffffff', 0.9 * a, 'screen');
    g.fillStyle = T.rgba('#fffdf4', a); g.beginPath(); g.arc(q.x, q.y, 2.8, 0, TAU); g.fill();
    const sp = 7 + 3 * Math.sin(t * 6 + q.seed);
    g.globalAlpha = 0.7 * a; g.strokeStyle = '#fffdf4'; g.lineWidth = 1; g.lineCap = 'round';
    g.beginPath(); g.moveTo(q.x - sp, q.y); g.lineTo(q.x + sp, q.y); g.moveTo(q.x, q.y - sp); g.lineTo(q.x, q.y + sp); g.stroke();
    g.restore();
  }
  function chime(k) {
    const A = T.audio;
    if (!A) return;
    A.sfx('star', k);
    if (A.note) A.note({ m: 84 + [0, 4, 7, 9][Math.floor(T.clamp(k) * 3.99)], at: 0.16, vel: 0.12, voice: 'glass', dur: 2.6 });
  }

  /* ---------- a manager ---------- */
  FX.stars = function () {
    const M = { list: [] };
    let seedN = 1;
    /* o: { from, to, dur (1.4), bend, tail, w, color, glow, a, layer ('screen'), chime (true), note (0..1), onLand(star) }
       Resolves when the head reaches `to`; the tail then thins away by itself. */
    M.add = function (o = {}) {
      const W = T.view.W;
      const from = o.from || [W * (0.12 + Math.random() * 0.3), 40 + Math.random() * 90];
      const to = o.to || [from[0] - 640, from[1] + 300];
      const s = { kind: 'star', from, to, bend: o.bend == null ? 0.06 : o.bend, dur: o.dur || 1.4, t: 0, k: 0, end: 0, endDur: o.fade || 0.7, tail: o.tail || 260, w: o.w || 3.2,
        color: o.color || '#fff4dc', glow: o.glow || '#ffd98a', a: o.a == null ? 1 : o.a, seed: seedN++, layer: o.layer || 'screen', onLand: o.onLand, landed: false, chime: o.chime !== false, note: o.note };
      s.ctrl = o.ctrl || bow(from, to, s.bend);
      M.list.push(s);
      if (s.chime && T.audio) T.audio.sfx('star', 0.95);
      return new Promise((res) => { s.res = res; });
    };
    /* o: { from, land: [x, y] (where it settles on the cloud), to: [x, y] (optional, where it flies on to), dur (2.2), rest (0.9),
            fly (1.3), keep (stay lit at the end), color (#fff0b8), layer, onLand, note }
       The promise resolves when it has arrived where it ends (o.to, or o.land); it carries .landed (a promise) and .light. */
    M.wish = function (o = {}) {
      const land = o.land || [0, 560];
      const from = o.from || [land[0] + 240, -30];
      const q = { kind: 'wish', phase: 'fall', from, land, to: o.to || null, x: from[0], y: from[1], k: 0, age: 0, dur: o.dur || 2.2, rest: o.rest == null ? 0.9 : o.rest, fly: o.fly || 1.3,
        keep: !!o.keep, stay: o.stay == null ? 2.4 : o.stay, color: o.color || '#fff0b8', a: 1, fade: 0, trail: [], seed: seedN++ * 1.7, layer: o.layer || 'screen', onLand: o.onLand, note: o.note == null ? 0.6 : o.note, r: o.r };
      q.ctrl = [from[0] + (land[0] - from[0]) * 0.15 + 60, from[1] + (land[1] - from[1]) * 0.55];
      let resLand, resDone;
      const landed = new Promise((r) => { resLand = r; }), done = new Promise((r) => { resDone = r; });
      q.resLand = resLand; q.resDone = resDone;
      q.flyTo = (p, dur) => new Promise((r) => { q.to = p; q.fly = dur || q.fly; q.phase = 'fly'; q.fk = 0; q.flyFrom = [q.x, q.y]; q.resFly = r; q.fade = 0; });
      q.fadeOut = () => { q.keep = false; q.phase = 'out'; };
      M.list.push(q);
      if (T.audio) T.audio.sfx('star', 0.8);
      done.landed = landed; done.light = q;
      return done;
    };
    function stepStar(s, dt) {
      s.t += dt;
      const raw = s.t / s.dur;
      if (raw < 1) { s.k = 1 - Math.pow(1 - raw, 1.35); return true; }
      s.k = 1;
      if (!s.landed) { s.landed = true; if (s.chime) chime(s.note == null ? 0.5 : s.note); if (s.onLand) { try { s.onLand(s); } catch (e) { T.report(e, 'star'); } } s.res(); }
      s.end += dt / s.endDur;
      return s.end < 1;
    }
    function stepWish(q, dt) {
      q.age += dt;
      const push = () => { q.trail.push([q.x, q.y]); if (q.trail.length > 12) q.trail.shift(); };
      if (q.flash) q.flash = Math.max(0, q.flash - dt * 2.2);
      if (q.phase === 'fall') {
        q.k = Math.min(1, q.k + dt / q.dur);
        const p = bez(q.from, q.ctrl, q.land, T.ease.io(q.k));
        q.x = p[0] + Math.sin(q.age * 3.1 + q.seed) * 10 * (1 - q.k); q.y = p[1]; push();
        if (q.k >= 1) {
          q.phase = 'rest'; q.t0 = q.age; q.ring0 = q.age; q.ring = q.land.slice(); q.flash = 0.6;
          chime(q.note);
          if (q.onLand) { try { q.onLand(q); } catch (e) { T.report(e, 'wish'); } }
          q.resLand();
          if (!q.to) q.resDone();
        }
      } else if (q.phase === 'rest' || q.phase === 'stay') {
        const base = q.phase === 'rest' ? q.land : q.to;
        q.x = base[0] + Math.sin((q.age - q.t0) * 1.3 + q.seed) * 2; q.y = base[1] - 6 - Math.sin((q.age - q.t0) * 2) * 4;
        if (q.trail.length) q.trail.shift();
        if (q.phase === 'rest' && q.to && q.age - q.t0 >= q.rest) { q.phase = 'fly'; q.fk = 0; q.flyFrom = [q.x, q.y]; }
        else if (!q.keep && !q.to && q.age - q.t0 >= q.stay) q.phase = 'out';
      } else if (q.phase === 'fly') {
        q.fk = Math.min(1, q.fk + dt / q.fly);
        const c = [(q.flyFrom[0] + q.to[0]) / 2, Math.min(q.flyFrom[1], q.to[1]) - 140];
        const p = bez(q.flyFrom, c, q.to, T.ease.io(q.fk));
        q.x = p[0]; q.y = p[1]; push();
        if (q.fk >= 1) {
          q.flash = 1; q.t0 = q.age;
          if (T.audio) T.audio.sfx('star', 0.95);
          if (q.resFly) { const r = q.resFly; q.resFly = null; r(); }
          q.resDone();
          q.phase = q.keep ? 'stay' : 'out';
        }
      } else if (q.phase === 'out') {
        if (q.trail.length) q.trail.shift();
        q.fade = Math.min(1, q.fade + dt / 0.7);
        if (q.fade >= 1) return false;
      }
      return true;
    }
    M.update = function (dt) {
      if (!(dt > 0)) return;
      for (let i = M.list.length - 1; i >= 0; i--) {
        const q = M.list[i];
        const keep = q.kind === 'star' ? stepStar(q, dt) : stepWish(q, dt);
        if (!keep) M.list.splice(i, 1);
      }
    };
    M.has = (layer) => M.list.some((q) => q.layer === (layer || 'screen'));
    M.draw = function (g, t, layer, alpha) {
      const ly = layer || 'screen';
      if (alpha != null && alpha <= 0.004) return;
      for (const q of M.list) {
        if (q.layer !== ly) continue;
        g.save(); if (alpha != null) g.globalAlpha *= alpha;
        if (q.kind === 'star') FX.shootingStar(g, t == null ? T.time : t, q); else drawWish(g, t == null ? T.time : t, q);
        g.restore();
      }
    };
    /* let everything go at once (a scene is ending): every promise still waiting is kept */
    M.clear = function () {
      for (const q of M.list) {
        if (q.kind === 'star') { if (!q.landed) { q.landed = true; q.res(); } }
        else { q.resLand(); q.resDone(); if (q.resFly) q.resFly(); }
      }
      M.list.length = 0;
    };
    return M;
  };

  /* ---------- the shared one, laid over whatever is on stage ---------- */
  const SH = (FX.star = FX.stars());
  FX.wishLight = (o) => SH.wish(o);
  const D = T.director;
  let lastCur = null;
  const update0 = D.update;
  D.update = function (dt) {
    const c0 = this.cur, clk = c0 && c0.clock, t0 = clk ? clk.t : 0;
    update0.call(this, dt);
    if (this.cur !== lastCur) { if (lastCur) SH.clear(); lastCur = this.cur; }
    /* on the scene's own clock, so a hurried scene hurries its stars too */
    const d = clk && this.cur === c0 ? clk.t - t0 : dt;
    try { SH.update(d); } catch (e) { T.report(e, 'stars'); }
  };
  const draw0 = D.draw;
  D.draw = function (g) {
    const cur = this.cur;
    if (!cur || !SH.has('screen')) return draw0.call(this, g);
    /* drawn straight after the scene, so a cut to the next scene still covers them */
    const own = Object.prototype.hasOwnProperty.call(cur, 'draw'), cd = cur.draw;
    cur.draw = function (g2) {
      cd.apply(cur, arguments);
      const dip = cur.dip && cur.dip.a ? 1 - cur.dip.a : 1;   /* a stage dipping to colour takes its stars with it */
      try { SH.draw(g2, T.time, 'screen', dip); } catch (e) { T.report(e, 'stars'); }
    };
    try { draw0.call(this, g); } finally { if (own) cur.draw = cd; else delete cur.draw; }
  };
})();
