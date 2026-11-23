/* Take Your Time — two places above the cloud sea, shown full screen like the lake and the dream.
     T.place('overlook', o)  the painting: stone ruins with ivy and an iron lantern, a wooden bench, a tree in
                             blossom on a floating island, ruins adrift in a sea of cloud at sunset. Leo and Bean
                             on the bench. For quiet passages of time.
     T.place('falls', o)     the crossing place: a fall of light pouring UP out of the cloud sea into the sky,
                             where boats rise to the beyond, and a stone landing with lanterns. o.boat + V.sail().
   A place is a view: draw(g, t, S) · update(dt, S) · pointer · key · want · hintAt, so a chapter shows it with
   `await X.view(T.place('overlook'), { color: '#fff6e6' })`. Static art is baked in parallax layers. */
(function () {
  'use strict';
  const T = window.TYT, P = T.P, F = T.F, K = T.town, Dt = T.detail;
  const TAU = Math.PI * 2;

  /* ---------- painting helpers ---------- */
  /* the underside of a floating island: a rough cone of rock, lit along its top */
  function rock(g, x, y, w, seed, o = {}) {
    const r = T.rng(seed), d = o.depth || 0.6, pts = [[x - w / 2, y]];
    const n = 9;
    for (let i = 1; i < n; i++) {
      const u = i / n, sag = Math.sin(u * Math.PI);
      pts.push([x - w / 2 + u * w + (r() - 0.5) * w * 0.05, y + sag * w * d * (0.55 + r() * 0.45) + (u > 0.4 && u < 0.6 ? w * d * 0.25 : 0)]);
    }
    pts.push([x + w / 2, y]);
    const path = P.soft(pts);
    const gr = g.createLinearGradient(0, y, 0, y + w * d);
    gr.addColorStop(0, o.lit || '#c9b0b4'); gr.addColorStop(0.45, o.mid || '#9d86a0'); gr.addColorStop(1, o.dark || '#6f5d84');
    g.fillStyle = gr; g.fill(path);
    if (o.flat) return path;
    g.save(); g.clip(path);
    g.strokeStyle = 'rgba(60,40,80,0.18)'; g.lineWidth = 2;
    for (let i = 0; i < 5; i++) { const yy = y + 8 + i * w * d * 0.12; g.beginPath(); g.moveTo(x - w / 2, yy); g.quadraticCurveTo(x, yy + 10 + r() * 10, x + w / 2, yy - 4); g.stroke(); }
    g.fillStyle = 'rgba(255,228,214,0.35)'; g.fillRect(x - w / 2, y, w, 5);
    g.restore();
    /* roots and ivy hanging off it */
    g.strokeStyle = o.root || 'rgba(90,80,70,0.55)'; g.lineCap = 'round';
    for (let i = 0; i < 6; i++) { const rx = x - w * 0.35 + r() * w * 0.7, ry = y + w * d * (0.15 + r() * 0.35), len = 20 + r() * 50; g.lineWidth = 1.4 + r(); g.beginPath(); g.moveTo(rx, ry); g.quadraticCurveTo(rx + (r() - 0.5) * 14, ry + len * 0.6, rx + (r() - 0.5) * 10, ry + len); g.stroke(); }
    return path;
  }
  /* a wall with arches through it and a broken top. Returns the path (fill it with 'evenodd') */
  function arcadePath(x0, yb, w, h, n, seed, o = {}) {
    const r = T.rng(seed), p = new Path2D();
    const archW = o.archW || 0.62, archTop = o.archTop || 0.72;
    p.moveTo(x0, yb);
    const steps = Math.max(3, Math.round(w / 22));
    /* a broken top: a slow wander with the odd block gone, falling away at the ends */
    let d = o.broken ? r() * h * 0.06 : 0;
    for (let i = 0; i <= steps; i++) {
      const u = i / steps, xx = x0 + w * u;
      if (o.broken) {
        d = T.clamp(d + (r() - 0.5) * h * 0.05, 0, h * 0.12);
        const end = Math.pow(Math.max(0, Math.abs(u - 0.5) * 2 - 0.6) / 0.4, 2) * h * 0.16;
        const y0 = yb - h + d + end, notch = r() < 0.12 ? h * (0.03 + r() * 0.05) : 0;
        p.lineTo(xx, y0 + notch);
        if (notch && i < steps) p.lineTo(xx + (w / steps) * 0.6, y0 + notch);
      } else p.lineTo(xx, yb - h);
    }
    p.lineTo(x0 + w, yb); p.closePath();
    const step = w / n;
    for (let i = 0; i < n; i++) {
      const cx = x0 + step * (i + 0.5), rr = (step * archW) / 2, top = yb - h * archTop;
      p.moveTo(cx - rr, yb); p.lineTo(cx - rr, top + rr); p.arc(cx, top + rr, rr, Math.PI, 0); p.lineTo(cx + rr, yb); p.closePath();
    }
    return p;
  }
  /* old stone, laid roughly in courses: blocks of uneven size, worn round, each its own shade, moss in the joints */
  function stonework(g, x, y, w, h, seed, o = {}) {
    const r = T.rng(seed), base = o.c || '#b9a9b2', rowH = o.rowH || 20;
    g.fillStyle = o.mortar || T.mix(T.shade(base, -0.28), '#5d4a7a', 0.25); g.fillRect(x, y, w, h);
    for (let yy = y, row = 0; yy < y + h; row++) {
      const rh = rowH * (0.8 + r() * 0.45);
      let xx = x - r() * rowH * 1.4;
      while (xx < x + w) {
        const bw = rh * (1.1 + r() * 1.9), gap = Math.max(1.6, rh * 0.09), c = T.shade(base, (r() - 0.5) * 0.2 - (r() < 0.12 ? 0.1 : 0));
        const p = P.rr(xx + gap, yy + gap, bw - gap * 2, rh - gap * 2, Math.min(rh * 0.3, 7));
        P.fill(g, p, c);
        g.fillStyle = 'rgba(255,238,222,0.22)'; g.fillRect(xx + gap * 2, yy + gap, bw - gap * 4, Math.max(1.2, rh * 0.1));
        g.fillStyle = 'rgba(70,46,92,0.16)'; g.fillRect(xx + gap * 2, yy + rh - gap - Math.max(1.4, rh * 0.12), bw - gap * 4, Math.max(1.4, rh * 0.12));
        if (r() < 0.1) { g.fillStyle = 'rgba(112,142,96,0.32)'; g.fillRect(xx + gap, yy + rh - gap * 2.2, bw * (0.3 + r() * 0.4), gap * 1.8); }
        if (r() < 0.06) { g.strokeStyle = 'rgba(70,50,80,0.25)'; g.lineWidth = 1; g.beginPath(); g.moveTo(xx + bw * 0.3, yy + gap); g.lineTo(xx + bw * 0.4, yy + rh * 0.6); g.stroke(); }
        xx += bw;
      }
      yy += rh;
    }
  }
  /* fill a wall: flat for far ones, stone in courses and a light from one side for near ones */
  function wallFill(g, path, box, o) {
    g.save(); g.clip(path, 'evenodd');
    if (o.stone) stonework(g, box[0], box[1], box[2], box[3], o.seed || 3, { rowH: o.rowH || 12, c: o.c });
    else { g.fillStyle = o.c; g.fillRect(box[0], box[1], box[2], box[3]); }
    if (o.stone) { const ao = g.createLinearGradient(0, box[1] + box[3] * 0.55, 0, box[1] + box[3]); ao.addColorStop(0, 'rgba(70,50,100,0)'); ao.addColorStop(1, 'rgba(70,50,100,0.22)'); g.fillStyle = ao; g.fillRect(box[0], box[1], box[2], box[3]); }
    const gr = g.createLinearGradient(box[0], 0, box[0] + box[2], 0), sun = o.sun || 1;
    gr.addColorStop(sun > 0 ? 0 : 1, T.rgba(o.shade || '#5d4a7a', o.shadeA == null ? 0.32 : o.shadeA)); gr.addColorStop(0.55, 'rgba(255,220,200,0)'); gr.addColorStop(sun > 0 ? 1 : 0, T.rgba(o.lit || '#ffd9b8', o.litA == null ? 0.3 : o.litA));
    g.fillStyle = gr; g.fillRect(box[0], box[1], box[2], box[3]);
    if (o.haze) { g.fillStyle = T.rgba(o.haze, o.hazeA || 0.4); g.fillRect(box[0], box[1], box[2], box[3]); }
    g.restore();
  }
  /* a ruin standing on a floating island */
  function isle(g, x, y, w, seed, o = {}) {
    const r = T.rng(seed);
    const hazy = o.haze != null, c = o.c || '#c4b2b8';
    rock(g, x, y, w, seed + 1, hazy ? { lit: T.mix(c, o.haze, 0.3), mid: T.mix('#a58fae', o.haze, o.hazeA || 0.5), dark: T.mix('#7d6a94', o.haze, o.hazeA || 0.5), flat: true } : o.rock || {});
    /* the arcade, a tower beside it */
    const aw = w * (o.span || 0.7), ah = o.h || w * 0.34, ax = x - aw / 2 + (o.shift || 0) * w;
    const ap = arcadePath(ax, y + 2, aw, ah, o.arches || 3, seed + 2, { broken: true, archW: 0.58, archTop: 0.7 });
    wallFill(g, ap, [ax, y - ah - 6, aw, ah + 10], { c, stone: !hazy, seed: seed + 3, rowH: Math.max(6, w * 0.022), haze: o.haze, hazeA: o.hazeA, sun: 1 });
    if (o.tower !== false) {
      const tw = w * 0.16, th = ah * (1.5 + r() * 0.4), tx = o.towerX != null ? x + o.towerX * w : ax + aw - tw * 0.4;
      const tp = arcadePath(tx, y + 2, tw, th, 1, seed + 4, { broken: true, archW: 0.5, archTop: 0.5 });
      wallFill(g, tp, [tx, y - th - 6, tw, th + 10], { c: T.shade(c, -0.04), stone: !hazy, seed: seed + 5, rowH: Math.max(6, w * 0.022), haze: o.haze, hazeA: o.hazeA, sun: 1 });
    }
    /* moss along the top and a little ivy */
    g.fillStyle = hazy ? T.mix('#9fb08c', o.haze, o.hazeA || 0.5) : '#8fa878';
    g.beginPath(); g.ellipse(x, y + 1, w / 2, 5, 0, 0, TAU); g.fill();
    if (!hazy && o.ivy !== false) Dt.ivy(g, ax + aw * 0.2, y, ah * 0.7, seed + 6, Math.max(10, w * 0.06));
  }
  /* a row of cumulus along a line */
  function cloudRow(g, x0, x1, y, size, seed, o = {}) {
    const r = T.rng(seed);
    for (let x = x0, i = 0; x < x1 + size; x += size * (0.45 + r() * 0.3), i++) P.cumulus(g, x, y + (r() - 0.5) * size * 0.12, size * (0.75 + r() * 0.5), seed * 7 + i, o);
  }
  /* a tree in blossom on its island: a thick trunk leaning left, limbs reaching up and out over the sea,
     and a canopy built up in passes from plum shadow to sunlit pink. Returns the canopy's tips. */
  function blossomTree(g, x, y, s, seed) {
    const r = T.rng(seed), tips = [], limbs = [];
    function branch(bx, by, ang, len, wid, d) {
      ang = T.clamp(ang, -Math.PI + 0.22, -0.18);   /* everything reaches upward */
      const ex = bx + Math.cos(ang) * len, ey = by + Math.sin(ang) * len;
      const bend = (r() - 0.5) * len * 0.3, mx = (bx + ex) / 2 - Math.sin(ang) * bend, my = (by + ey) / 2 + Math.cos(ang) * bend;
      limbs.push([bx, by, mx, my, ex, ey, wid]);
      if (d <= 0) { tips.push([ex, ey]); return; }
      if (d <= 2) tips.push([mx, my]);
      const kids = d > 2 ? 2 : 2 + (r() < 0.6 ? 1 : 0);
      for (let i = 0; i < kids; i++) {
        const spread = (i / Math.max(1, kids - 1) - 0.5) * (0.8 + r() * 0.5);
        branch(ex, ey, ang + spread + (r() - 0.5) * 0.25, len * (0.68 + r() * 0.14), wid * 0.6, d - 1);
      }
    }
    /* the trunk, then three main limbs off it: left over the sea, up, and back to the right */
    const tx = x - 56 * s, ty = y - 150 * s;
    limbs.push([x, y, x - 4 * s, y - 90 * s, tx, ty, 46 * s]);
    branch(tx, ty, -Math.PI + 0.36, 150 * s, 30 * s, 3);
    branch(tx, ty, -Math.PI / 2 - 0.3, 110 * s, 26 * s, 3);
    branch(tx + 10 * s, ty + 26 * s, -0.42, 140 * s, 24 * s, 3);
    /* the foot of it, gripping the rock */
    P.fill(g, P.soft([[x - 70 * s, y + 6], [x - 28 * s, y - 18 * s], [x - 22 * s, y - 80 * s], [x + 20 * s, y - 70 * s], [x + 30 * s, y - 14 * s], [x + 74 * s, y + 6]]), '#76596a');
    for (const L of limbs) {
      g.strokeStyle = '#74586a'; g.lineCap = 'round'; g.lineWidth = L[6];
      g.beginPath(); g.moveTo(L[0], L[1]); g.quadraticCurveTo(L[2], L[3], L[4], L[5]); g.stroke();
    }
    for (const L of limbs) {   /* lit from the sun behind it, on the right; a little bark */
      g.strokeStyle = 'rgba(240,196,182,0.42)'; g.lineWidth = L[6] * 0.26;
      g.beginPath(); g.moveTo(L[0] + L[6] * 0.3, L[1]); g.quadraticCurveTo(L[2] + L[6] * 0.3, L[3], L[4] + L[6] * 0.22, L[5]); g.stroke();
      if (L[6] > 14) { g.strokeStyle = 'rgba(60,40,60,0.22)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(L[0] - L[6] * 0.12, L[1]); g.quadraticCurveTo(L[2] - L[6] * 0.1, L[3], L[4] - L[6] * 0.08, L[5]); g.stroke(); }
    }
    /* the blossom, in clusters round every tip: plum shade below, body, light, then sun on the upper right */
    const cl = tips.map((q) => { const out = []; const n = 7 + Math.floor(r() * 4); for (let i = 0; i < n; i++) { const a = r() * TAU, d = r() * 34 * s; out.push([q[0] + Math.cos(a) * d * 1.3, q[1] + Math.sin(a) * d * 0.8, (13 + r() * 13) * s]); } return out; });
    const passes = [['#b9708f', 1.08, -5, 9, 0.9], ['#e393b0', 0.9, -1, 2, 0.95], ['#f3b4c8', 0.7, 4, -4, 0.95], ['#fbd2dd', 0.48, 8, -9, 0.92], ['#fff0f3', 0.22, 11, -12, 0.85]];
    for (const [c, k, dx, dy, a] of passes) {
      g.globalAlpha = a; g.fillStyle = c;
      for (const q of cl) for (const b of q) { g.beginPath(); g.arc(b[0] + dx * s, b[1] + dy * s, b[2] * k, 0, TAU); g.fill(); }
    }
    g.globalAlpha = 1;
    /* single blossoms at the rims, so it reads as flowers and not a cloud */
    for (let i = 0; i < 520; i++) {
      const q = tips[Math.floor(r() * tips.length)], a = r() * TAU, d = (22 + r() * 40) * s;
      g.fillStyle = ['#f3b4c8', '#e393b0', '#fff0f3', '#c97d9c', '#fbd2dd'][i % 5];
      g.beginPath(); g.ellipse(q[0] + Math.cos(a) * d * 1.2, q[1] + Math.sin(a) * d * 0.8, 3.6 * s, 2.3 * s, a, 0, TAU); g.fill();
    }
    return tips;
  }
  /* dark stems and flowers in the corner of the frame, close to the eye */
  function flowerSil(g, x, y, s, seed, c, f) {
    const r = T.rng(seed);
    for (let i = 0; i < 9; i++) {
      const sx = x + (r() - 0.5) * 140 * s, h = (60 + r() * 110) * s, lean = (r() - 0.5) * 40 * s;
      g.strokeStyle = c; g.lineWidth = 2.4 * s; g.lineCap = 'round';
      g.beginPath(); g.moveTo(sx, y); g.quadraticCurveTo(sx + lean * 0.3, y - h * 0.6, sx + lean, y - h); g.stroke();
      P.fill(g, P.ellipse(sx + lean * 0.5, y - h * 0.45, 9 * s, 3.4 * s, 0.6), c);
      for (let p = 0; p < 5; p++) { const a = (p / 5) * TAU + r(); P.fill(g, P.ellipse(sx + lean + Math.cos(a) * 6 * s, y - h + Math.sin(a) * 6 * s, 6 * s, 3.6 * s, a), f); }
      P.fill(g, P.circle(sx + lean, y - h, 3 * s), T.shade(f, -0.25));
    }
    g.fillStyle = c; g.beginPath(); g.ellipse(x, y + 20 * s, 130 * s, 40 * s, 0, 0, TAU); g.fill();
  }
  /* a stone ledge or landing: a top you can stand on, a face of stone in courses, ivy over the lip */
  function ledge(g, xL, xR, y, depth, seed, o = {}) {
    const r = T.rng(seed), c = o.c || '#b9a9b2';
    const face = [[xL, y], [xR, y]];
    (o.steps || []).forEach((q) => { face.push([q[0], q[1]]); });
    face.push([o.footX == null ? xR - 30 : o.footX, y + depth], [xL, y + depth]);
    const path = P.poly(face);
    wallFill(g, path, [xL, y, Math.max(...face.map((q) => q[0])) - xL + 10, depth + 10], { c, stone: true, seed, rowH: 24, sun: 1, shadeA: 0.22, litA: 0.18 });
    /* the top edge and its moss */
    g.fillStyle = T.shade(c, 0.12); g.fillRect(xL, y - 6, xR - xL, 8);
    g.fillStyle = 'rgba(255,232,214,0.5)'; g.fillRect(xL, y - 6, xR - xL, 2);
    for (let i = 0; i < (xR - xL) / 26; i++) { const mx = xL + r() * (xR - xL); P.fill(g, P.ellipse(mx, y - 5, 10 + r() * 18, 3.5, 0), ['#8fa878', '#7f9a6c', '#a3b88a'][i % 3]); }
    g.strokeStyle = '#6f8f5e'; g.lineCap = 'round'; g.lineWidth = 1.6;
    for (let i = 0; i < (xR - xL) / 9; i++) { const gx = xL + r() * (xR - xL), h = 5 + r() * 12; g.beginPath(); g.moveTo(gx, y - 4); g.lineTo(gx + (r() - 0.5) * 6, y - 4 - h); g.stroke(); }
    (o.ivy || []).forEach((ix, i) => Dt.ivy(g, ix, y - 2, -(60 + r() * 90), seed + 10 + i, 34));
    return path;
  }
  /* an iron bracket off a wall, scrolled, with a hook for a lantern at its end. Returns the hook point */
  function bracket(g, x, y, len, s) {
    const IRON = '#433a4c';
    g.strokeStyle = IRON; g.lineCap = 'round';
    g.lineWidth = 5 * s; g.beginPath(); g.moveTo(x, y); g.lineTo(x + len, y); g.stroke();
    g.lineWidth = 3 * s; g.beginPath(); g.moveTo(x, y + 30 * s); g.bezierCurveTo(x + len * 0.4, y + 30 * s, x + len * 0.55, y + 4 * s, x + len * 0.62, y + 2 * s); g.stroke();
    g.beginPath(); g.arc(x + len * 0.3, y + 14 * s, 8 * s, 0.4, TAU - 0.4); g.stroke();
    P.fill(g, P.rr(x - 6 * s, y - 10 * s, 10 * s, 50 * s, 3 * s), IRON);
    P.line(g, x + len - 4 * s, y, x + len - 4 * s, y + 12 * s, 2 * s, IRON);
    return [x + len - 4 * s, y + 22 * s];
  }

  /* ---------- people and dogs in a place ---------- */
  /* an actor: { id, dog, style, s, at (a spot name), dx, x, y, sit, flip, face, lean, headTilt, armF, armB, walk, wag, alpha,
     hidden, pose(o, t, V), prop(g, joints, o, t), draw(g, t, V) } — x/y, if given, win over the spot */
  function drawActor(g, V, a, t) {
    if (a.hidden || a.alpha === 0) return;
    if (a.draw) { a.draw(g, t, V); return; }
    const sp = (a.at && V.spots[a.at]) || V.spots.ground, s = a.s || (a.dog ? 150 : 150);
    const x = a.x != null ? a.x : sp[0] + (a.dx || 0), seat = sp[2] === 'seat';
    g.save(); if (a.alpha != null && a.alpha < 1) g.globalAlpha *= a.alpha;
    if (a.dog) {
      const y = a.y != null ? a.y : sp[1];
      F.dog(g, { x, y, s, sit: a.sit == null ? (seat ? 1 : 0) : a.sit, flip: !!a.flip, walk: a.walk == null ? null : a.walk, wag: Math.sin(t * (a.wagRate || 7)) * (a.wag == null ? 0.6 : a.wag), headTilt: a.headTilt || 0 });
    } else {
      const st = a.style || F.leoAt(1), sit = a.sit == null ? seat : a.sit;
      const y = a.y != null ? a.y : seat ? sp[1] - 4 * (s / 150) : sp[1] - F.hipHeight(st, s) * (sit ? 0.35 : 1);
      const o = { x, y, s, style: st, flip: !!a.flip, sit: !!sit, lean: a.lean == null ? (sit ? -0.02 : 0.04) : a.lean, headTilt: a.headTilt || 0, face: Object.assign({ blush: 0.16 }, a.face), armF: a.armF, armB: a.armB };
      if (a.walk != null) o.walk = a.walk;
      if (sit && !a.armF) { o.armF = { a: 0.75, b: 0.95 }; o.armB = { a: 0.7, b: 0.9 }; }
      if (a.pose) a.pose(o, t, V);
      const j = F.person(g, o);
      if (a.prop) a.prop(g, j, o, t);
    }
    g.restore();
  }

  /* the frame every place shares */
  function base(o, def) {
    const V = Object.assign({ dark: false, quiet: false, mood: 'still', chord: 2, note: null, gen: -1, L: null, sun: { k: 0 }, fade: { a: 1 }, t0: null }, def);
    Object.keys(o).forEach((k) => { if (k !== 'actors') V[k] = o[k]; });
    V.actors = o.actors || (def.actors ? def.actors() : []);
    V.actor = (id) => V.actors.find((a) => a.id === id) || null;
    V.drawActors = (g, t, which) => { for (const a of V.actors) if ((a.layer || 'main') === (which || 'main')) drawActor(g, V, a, t); };
    V.pointer = () => false;
    V.key = () => false;
    V.want = () => null;
    V.hintAt = () => null;
    V.ensure = function () { if (!V.L || V.gen !== T.gen) { V.L = V.bake(); V.gen = T.gen; } };
    V.build = function () { V.L = null; };   /* the stage calls this after a resize: paint again on the next frame */
    V.blit = function (g, name, depth, dx, dy) { const L = V.L[name]; if (!L) return; const p = T.par(depth); T.blit(g, L, p[0] + (dx || 0), p[1] + (dy || 0)); };
    V.caption = function (g) { if (!V.note) return; T.band(g, 1); P.text(g, V.note, 0, 864, { font: 'serif', size: 27, color: '#f3ead8', alpha: 0.94, glow: 'rgba(8,12,22,0.9)' }); };
    return V;
  }

  /* ================= the overlook ================= */
  function overlook(o) {
    const SEAT = 596, LEDGE = 640;
    const V = base(o, {
      mood: 'still', chord: 2,
      spots: { bench: [-150, SEAT, 'seat'], bench2: [-82, SEAT, 'seat'], ledge: [-20, LEDGE, 'ground'], wall: [-300, LEDGE, 'ground'], ground: [-20, LEDGE, 'ground'] },
      actors: () => [{ id: 'leo', style: F.leoAt(o.leoAge == null ? 1 : o.leoAge), at: 'bench', headTilt: -0.08, face: { mouth: 'smile' } }, { id: 'bean', dog: true, at: 'bench2', s: 150, headTilt: -0.15 }],
    });
    const petals = [], r0 = T.rng(5);
    for (let i = 0; i < 54; i++) petals.push({ x: r0() * 1600 - 300, y: r0() * 700, v: 18 + r0() * 26, ph: r0() * 9, sp: 0.6 + r0() * 0.8, c: ['#f7c2d2', '#ec9fb9', '#ffe5ec', '#f2a9c0'][i % 4], front: i % 3 === 0 });
    V.bake = function () {
      const W = T.view.W, L = {};
      /* far: haze, ruins far off, the long banks of cloud on the horizon */
      L.far = T.bake(-W / 2 - 80, 120, W + 160, 620, (g) => {
        cloudRow(g, -W / 2 - 120, W / 2 + 120, 520, 260, 3, { lit: '#ffeede', shade: '#d6b2cc', a: 0.9, sun: 1 });
        isle(g, -430, 300, 120, 11, { haze: '#e6c6d6', hazeA: 0.62, arches: 2, c: '#cdb4c6' });
        isle(g, 120, 250, 90, 12, { haze: '#e9cad6', hazeA: 0.66, arches: 2, c: '#cdb4c6', tower: false });
        isle(g, 760, 330, 150, 13, { haze: '#f0d2d4', hazeA: 0.58, arches: 3, c: '#d6bcc8' });
        cloudRow(g, -W / 2 - 120, W / 2 + 120, 600, 300, 4, { lit: '#fff3e2', shade: '#cfa6c6', a: 0.95, sun: 1 });
      });
      /* middle: a floating arcade, and cloud banks lit from the right */
      L.mid = T.bake(-W / 2 - 80, 200, W + 160, 620, (g) => {
        isle(g, 40, 400, 300, 21, { arches: 4, c: '#cdb9be', h: 92, haze: '#f2d3d6', hazeA: 0.28, tower: true, towerX: 0.3 });
        isle(g, -310, 470, 150, 22, { arches: 2, c: '#c8b4bc', h: 54, haze: '#efd0d6', hazeA: 0.34 });
        const sea = g.createLinearGradient(0, 700, 0, 820); sea.addColorStop(0, 'rgba(240,214,226,0)'); sea.addColorStop(0.35, '#efd3e0'); sea.addColorStop(1, '#e4c2d8');
        g.fillStyle = sea; g.fillRect(-W / 2 - 80, 700, W + 160, 120);   /* the cloud sea goes on under the banks */
        cloudRow(g, -W / 2 - 160, W / 2 + 160, 680, 330, 5, { lit: '#fff4e4', shade: '#c79fc0', a: 1, sun: 1 });
        cloudRow(g, -60, W / 2 + 160, 740, 260, 6, { lit: '#fff8ec', shade: '#c49cc0', a: 1, sun: 1 });
      });
      /* the island and its tree */
      L.isle = T.bake(-300, -220, Math.max(W / 2 + 120, 1000) + 300, 1000, (g) => {
        rock(g, 520, 470, 520, 31, { lit: '#d7bfb8', mid: '#a68ca4', dark: '#76628e', depth: 0.42 });
        const pp = arcadePath(610, 474, 170, 150, 2, 32, { broken: true, archW: 0.56, archTop: 0.7 });
        wallFill(g, pp, [610, 318, 170, 160], { c: '#cdbcbe', stone: true, seed: 33, rowH: 15, sun: 1 });
        const pt = arcadePath(780, 474, 52, 250, 1, 34, { broken: true, archW: 0.5, archTop: 0.4 });
        wallFill(g, pt, [780, 220, 52, 260], { c: '#c6b5ba', stone: true, seed: 35, rowH: 14, sun: 1 });
        Dt.ivy(g, 640, 470, 120, 36, 30);
        g.fillStyle = '#93ab7c'; g.beginPath(); g.ellipse(520, 470, 262, 9, 0, 0, TAU); g.fill();
        blossomTree(g, 520, 474, 1.45, 37);
        for (let i = 0; i < 26; i++) { const r = T.rng(40 + i); P.fill(g, P.ellipse(330 + r() * 380, 476 + r() * 6, 5, 2.4, r() * 3), ['#f7c2d2', '#ec9fb9'][i % 2]); }
      }, 1.1);
      /* near: the arched wall with its ivy and lantern bracket, the mailbox, the ledge and the bench */
      L.near = T.bake(-W / 2 - 80, 30, W / 2 + 80 + 300, 900, (g) => {
        const xL = -W / 2 - 80, xR = -360;
        const n = Math.max(1, Math.round((xR - xL) / 230));
        const wp = arcadePath(xL, LEDGE + 4, xR - xL, 560, n, 51, { broken: true, archW: 0.6, archTop: 0.74 });
        wallFill(g, wp, [xL, LEDGE - 600, xR - xL, 610], { c: '#bcaab0', stone: true, seed: 52, rowH: 26, sun: 1, shadeA: 0.3, litA: 0.24 });
        Dt.quoins(g, xR, LEDGE - 520, LEDGE, 53, '#cdbcbe', 1);
        Dt.ivy(g, xR - 60, LEDGE, 380, 54, 46);
        Dt.ivy(g, xR - 260, LEDGE, 240, 55, 40);
        V.hook = bracket(g, xR - 4, 178, 74, 1.1);
        Dt.ivy(g, xR - 30, 300, -90, 56, 30);   /* trailing off the bracket */
        ledge(g, xL, 150, LEDGE, 300, 57, { steps: [[176, LEDGE + 40], [232, LEDGE + 120], [210, LEDGE + 300]], footX: 210, ivy: [-200, 20, 120] });
        Dt.mailbox(g, -300, LEDGE, 1.05);
        Dt.bench(g, -120, LEDGE, 1.3, false);
        /* a few flowers in the cracks along the ledge */
        for (let i = 0; i < 7; i++) { const r = T.rng(60 + i), fx = xR + 20 + r() * 360; P.line(g, fx, LEDGE - 3, fx + (r() - 0.5) * 6, LEDGE - 14 - r() * 10, 1.4, '#6f8f5e'); P.fill(g, P.circle(fx, LEDGE - 18 - r() * 8, 3), ['#f7c2d2', '#fff1de', '#f1c04a'][i % 3]); }
      });
      /* front: cloud low across the foot of the frame, flowers and a broken pillar close to the eye */
      L.front = T.bake(-W / 2 - 80, 600, W + 160, 340, (g) => {
        cloudRow(g, -W / 2 - 100, W / 2 + 120, 900, 280, 71, { lit: '#fff8ee', shade: '#cfa2c2', a: 1, sun: 1 });
        const px = W / 2 - 170;
        const pp = arcadePath(px, 940, 110, 250, 1, 72, { broken: true, archW: 0.01, archTop: 0.1 });
        wallFill(g, pp, [px, 680, 110, 260], { c: '#8d7a98', stone: true, seed: 73, rowH: 24, sun: 1, shadeA: 0.4, litA: 0.12 });
        flowerSil(g, -W / 2 + 70, 930, 1.3, 74, '#5e4a6e', '#e58aa8');
        flowerSil(g, W / 2 - 40, 930, 1.0, 75, '#5e4a6e', '#d98aa8');
      });
      return L;
    };
    V.update = function (dt) {
      const W = T.view.W;
      for (const p of petals) {
        p.x -= p.v * dt * 1.3; p.y += p.v * dt * 0.55; p.ph += dt * p.sp;
        if (p.x < -W / 2 - 40 || p.y > 920) { p.x = 120 + Math.random() * (W / 2 + 200); p.y = Math.random() * 300 - 20; }
      }
    };
    const petal = (g, p, t) => { g.save(); g.translate(p.x + Math.sin(p.ph * 1.7) * 16, p.y + Math.sin(p.ph) * 6); g.rotate(p.ph * 1.6); g.scale(1, 0.55 + 0.45 * Math.sin(p.ph * 2.3)); g.fillStyle = p.c; g.beginPath(); g.ellipse(0, 0, p.front ? 7 : 5, p.front ? 4 : 3, 0, 0, TAU); g.fill(); g.restore(); };
    V.draw = function (g, t) {
      const W = T.view.W, k = T.clamp(V.sun.k);
      V.ensure();
      /* the sky goes from a gold afternoon (k = 0) to a deep dusk (k = 1) */
      const sky = g.createLinearGradient(0, 0, 0, 700);
      sky.addColorStop(0, T.mix('#a59ad6', '#4f4d92', k)); sky.addColorStop(0.42, T.mix('#e3abc4', '#b5799e', k)); sky.addColorStop(0.72, T.mix('#ffd3ae', '#f29a86', k)); sky.addColorStop(1, T.mix('#fff0d2', '#ffc49a', k));
      g.fillStyle = sky; g.fillRect(-W / 2, 0, W, 900);
      if (k > 0.3) { const r = T.rng(9); g.fillStyle = '#fff8ec'; for (let i = 0; i < 46; i++) { g.globalAlpha = (k - 0.3) * (0.5 + 0.5 * Math.sin(t * 1.4 + i * 2.3)); g.beginPath(); g.arc((r() - 0.5) * W, 20 + r() * 260, 0.8 + r() * 1.4, 0, TAU); g.fill(); } g.globalAlpha = 1; }
      const sp = T.par(0.05);
      P.glow(g, 470 + sp[0], 300 - k * 120 + sp[1], 640, '#fff1c8', 0.9 - k * 0.3);
      P.glow(g, 470 + sp[0], 300 - k * 120 + sp[1], 160, '#ffffff', 0.7 - k * 0.4);
      V.blit(g, 'far', 0.12, Math.sin(t * 0.04) * 14);
      /* light through the gaps in the tree */
      g.save(); g.globalCompositeOperation = 'screen';
      for (let i = 0; i < 5; i++) { const a = 2.6 + i * 0.13 + Math.sin(t * 0.2 + i) * 0.02, len = 1300; g.fillStyle = T.rgba('#fff0d0', (0.06 + 0.03 * Math.sin(t * 0.5 + i * 2)) * (1 - k * 0.6)); g.beginPath(); g.moveTo(470, 300); g.lineTo(470 + Math.cos(a - 0.03) * len, 300 + Math.sin(a - 0.03) * len); g.lineTo(470 + Math.cos(a + 0.03) * len, 300 + Math.sin(a + 0.03) * len); g.closePath(); g.fill(); }
      g.restore();
      V.blit(g, 'mid', 0.3, Math.sin(t * 0.06 + 1) * 10, Math.sin(t * 0.3) * 3);
      V.blit(g, 'isle', 0.5, 0, Math.sin(t * 0.35) * 4);
      for (const p of petals) if (!p.front) petal(g, p, t);
      V.blit(g, 'near', 0.85);
      const np = T.par(0.85);
      g.save(); g.translate(np[0], np[1]);
      if (V.hook) { const fl = 0.85 + 0.15 * Math.sin(t * 5.3) * Math.sin(t * 1.7); K.lantern(g, V.hook[0], V.hook[1], t, { bare: true, s: 1.15, lit: 0.55 + 0.45 * k, seed: 3 }); P.glow(g, V.hook[0], V.hook[1] + 14, 120 * fl, '#ffd98a', 0.25 + 0.35 * k); }
      V.drawActors(g, t);
      g.restore();
      V.blit(g, 'front', 1.25, Math.sin(t * 0.25) * 8);
      for (const p of petals) if (p.front) petal(g, p, t);
      /* dusk lays lilac over the lot */
      if (k > 0.01) { g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = T.rgba('#8a7ab8', 0.35 * k); g.fillRect(-W / 2, 0, W, 900); g.restore(); }
      if (V.fade.a < 1) { g.fillStyle = T.rgba('#fff6e6', 1 - V.fade.a); g.fillRect(-W / 2, 0, W, 900); }
      V.caption(g);
    };
    return V;
  }

  /* ================= the falls ================= */
  function falls(o) {
    const LAND = 700, FXX = 150, BASE = 604, TOP = -60;
    const V = base(o, {
      dark: true, mood: 'sea', chord: 4,
      spots: { landing: [-320, LAND, 'ground'], edge: [-290, LAND, 'ground'], gate: [-515, LAND, 'ground'], ground: [-320, LAND, 'ground'] },
      actors: () => [{ id: 'leo', style: F.leoAt(o.leoAge == null ? 2 : o.leoAge), at: 'landing', headTilt: -0.22, face: { mouth: 'smile' } }, { id: 'bean', dog: true, at: 'landing', dx: 52, s: 150, sit: 1, headTilt: -0.3 }],
    });
    V.sky = T.fx.stars();   /* the falls keep their own sky, so a star can go down behind the landing */
    const MOOR = [-90, 716];
    /* a boat: { riders: [{ style, s, face } | { dog: true }], hull, lamp } */
    V.setBoat = function (b) {
      if (!b) { V.boat = null; return; }
      V.boat = Object.assign({ x: MOOR[0], y: MOOR[1], sc: 1, a: 1, glow: 0, hull: '#8a5a3b', lamp: true, riders: [], k: 0, phase: 'moored' }, b);
    };
    V.setBoat(o.boat || null);
    /* the boat lets go, glides to the foot of the falls and rises up them into the light. Resolves when it is gone.
       so: { star: true (a shooting star when it is gone), glide: 2.6, rise: 5, waitStar: false, onGone } */
    V.sail = function (so = {}) {
      const b = V.boat;
      if (!b) return Promise.resolve();
      return new Promise((res) => {
        b.phase = 'glide'; b.k = 0; b.glideDur = so.glide || 2.6; b.riseDur = so.rise || 5.2; b.from = [b.x, b.y];
        b.done = () => {
          if (T.audio) { T.audio.sfx('join'); }
          if (so.onGone) so.onGone();
          if (so.star === false || o.star === false) { res(); return; }
          const W = T.view.W, p = V.sky.add({ from: [FXX + 50, 30], to: [W * 0.38, 590], dur: 2.3, tail: 360, w: 3.6, bend: 0.1, note: 0.7 });
          if (so.waitStar) p.then(res); else res();
        };
        if (T.audio) T.audio.sfx('whoosh');
      });
    };
    const ambient = [{ ph: 0.1, x: -26, s: 0.3 }, { ph: 0.62, x: 30, s: 0.24 }];
    V.bake = function () {
      const W = T.view.W, L = {};
      L.far = T.bake(-W / 2 - 80, 160, W + 160, 560, (g) => {
        isle(g, -520, 330, 170, 81, { haze: '#7d6aa6', hazeA: 0.55, arches: 3, c: '#8f7cae' });
        isle(g, 620, 280, 210, 82, { haze: '#86709f', hazeA: 0.5, arches: 3, c: '#9a84b0' });
        isle(g, -150, 250, 80, 83, { haze: '#7a69a2', hazeA: 0.6, arches: 2, c: '#8e7aac', tower: false });
        cloudRow(g, -W / 2 - 120, W / 2 + 120, 610, 300, 84, { lit: '#f6c8c4', shade: '#7f6aa4', a: 0.95, sun: -1 });
      });
      L.mid = T.bake(-W / 2 - 80, 440, W + 160, 500, (g) => {
        cloudRow(g, -W / 2 - 140, FXX - 150, 690, 300, 85, { lit: '#ffd6c4', shade: '#8a72aa', a: 1, sun: 1 });
        cloudRow(g, FXX + 170, W / 2 + 160, 690, 300, 86, { lit: '#ffd6c4', shade: '#8a72aa', a: 1, sun: -1 });
        cloudRow(g, -W / 2 - 140, W / 2 + 160, 790, 340, 87, { lit: '#f8d2d0', shade: '#7a66a0', a: 1, sun: 1 });
        g.fillStyle = '#9a86b6'; g.fillRect(-W / 2 - 80, 800, W + 160, 140);   /* under the banks, the sea goes on */
        cloudRow(g, -W / 2 - 140, W / 2 + 160, 900, 300, 88, { lit: '#e8c4cc', shade: '#6f5c98', a: 1, sun: 1 });
      });
      L.land = T.bake(-W / 2 - 80, 360, W / 2 + 80 + 40, 580, (g) => {
        const xL = -W / 2 - 80;
        ledge(g, xL, -160, LAND, 260, 91, { c: '#9f90a8', steps: [[-130, LAND + 30], [-100, LAND + 70], [-80, LAND + 260]], footX: -80, ivy: [-420, -260] });
        /* the gate the crossing goes out under */
        const gp = arcadePath(-590, LAND + 2, 150, 300, 1, 92, { broken: true, archW: 0.7, archTop: 0.72 });
        wallFill(g, gp, [-590, LAND - 310, 150, 320], { c: '#a596ae', stone: true, seed: 93, rowH: 20, sun: 1, shadeA: 0.35, litA: 0.3, lit: '#ffe0c0' });
        Dt.ivy(g, -585, LAND, 220, 94, 30);
        /* lantern posts along the landing; their light is drawn live over them */
        V.lamps = [];
        [-W / 2 + 90, -392, -232].forEach((x, i) => { const q = Dt.lantern(g, x, LAND - 2, 0, {}, 1.05, 1, 1); V.lamps.push([q[0], q[1] - 12 * 1.05, i]); });
        /* the mooring post */
        P.fill(g, P.rr(-196, LAND - 34, 16, 34, 5), '#5d4f62'); P.fill(g, P.ellipse(-188, LAND - 34, 10, 4), '#7a6a80');
      });
      L.front = T.bake(-W / 2 - 80, 700, W + 160, 240, (g) => {
        cloudRow(g, FXX - 40, W / 2 + 140, 930, 260, 95, { lit: '#f6cfd2', shade: '#6f5d98', a: 1, sun: -1 });
        const px = W / 2 - 130;
        const pp = arcadePath(px, 950, 90, 220, 1, 96, { broken: true, archW: 0.01, archTop: 0.1 });
        wallFill(g, pp, [px, 720, 90, 240], { c: '#4f456a', stone: true, seed: 97, rowH: 22, sun: -1, shadeA: 0.45, litA: 0.25, lit: '#ffc8a8' });
      });
      return L;
    };
    function fallsBody(g, t, W) {
      /* narrow where it leaves the cloud, opening out like a fall turned over as it nears the sky */
      const H = BASE - TOP, half = (y) => { const u = T.clamp((BASE - y) / H); return 88 + 70 * u + 150 * Math.pow(u, 3); };
      g.save(); g.globalCompositeOperation = 'screen';
      /* the column's glow, warm at the foot and white where it meets the sky */
      for (let i = 0; i < 4; i++) { const y = BASE - (H * i) / 3; P.glow(g, FXX, y, 290 + i * 45, i < 2 ? '#ffcfa0' : '#e6d8ff', 0.22); }
      P.glow(g, FXX, TOP + 60, 620, '#fff6e2', 0.6);
      P.glow(g, FXX, TOP + 40, 220, '#ffffff', 0.5);
      /* the body of it, a little unsteady at the edges */
      const pts = [];
      for (let y = BASE; y >= TOP; y -= 30) pts.push([FXX - half(y) + Math.sin(y * 0.021 + t * 1.6) * 7, y]);
      for (let y = TOP; y <= BASE; y += 30) pts.push([FXX + half(y) + Math.sin(y * 0.019 - t * 1.4 + 2) * 7, y]);
      /* nested, each narrower and brighter: soft at the edges, white down the middle */
      for (const [k, a, c] of [[1, 0.1, '#ffd9c4'], [0.78, 0.12, '#ffe6d6'], [0.55, 0.15, '#fff0e4'], [0.34, 0.2, '#fff8f0'], [0.16, 0.28, '#ffffff']]) {
        const q = [];
        for (let y = BASE; y >= TOP; y -= 30) q.push([FXX - half(y) * k + Math.sin(y * 0.021 + t * 1.6) * 7 * k, y]);
        for (let y = TOP; y <= BASE; y += 30) q.push([FXX + half(y) * k + Math.sin(y * 0.019 - t * 1.4 + 2) * 7 * k, y]);
        g.fillStyle = T.rgba(c, a); g.fill(P.soft(q));
      }
      void pts;
      /* sheets and streams of it, flowing up */
      g.lineCap = 'round';
      for (let i = 0; i < 24; i++) {
        const u = ((i * 0.618) % 1) - 0.5, sheet = i < 6, sp = sheet ? 46 + i * 6 : 90 + (i % 6) * 24;
        g.setLineDash(sheet ? [120 + (i % 3) * 60, 80 + (i % 2) * 70] : [60 + (i % 4) * 34, 40 + (i % 3) * 36]); g.lineDashOffset = -t * sp - i * 37;
        g.strokeStyle = sheet ? 'rgba(255,240,226,0.1)' : i % 3 ? 'rgba(255,250,240,0.26)' : 'rgba(255,214,176,0.26)';
        g.lineWidth = sheet ? 18 + (i % 3) * 8 : 1.6 + (i % 5) * 0.7;
        g.beginPath();
        for (let y = BASE; y >= TOP; y -= 34) { const x = FXX + u * 2 * half(y) * 0.95 + Math.sin(y * 0.012 + t * 0.8 + i) * 5; if (y === BASE) g.moveTo(x, y); else g.lineTo(x, y); }
        g.stroke();
      }
      g.setLineDash([]);
      /* where it opens into the sky: a fringe of light lifting off the top */
      for (let i = 0; i < 8; i++) { const u = i / 7 - 0.5, life = (t * 0.25 + i * 0.37) % 1; P.glow(g, FXX + u * 2 * half(TOP) * (1 + life * 0.3), TOP + 60 - life * 90, 34 + life * 46, '#fff8ec', Math.sin(life * Math.PI) * 0.38); }
      /* sparks going up */
      const r = T.rng(19);
      for (let i = 0; i < 44; i++) {
        const sp = 40 + r() * 80, ph = r(), u = r() - 0.5, life = ((t * sp) / H + ph) % 1, y = BASE - life * H;
        const x = FXX + u * 2 * half(y) + Math.sin(t * 2 + i) * 6;
        g.globalAlpha = Math.sin(life * Math.PI) * (0.5 + 0.5 * Math.sin(t * 7 + i));
        g.fillStyle = i % 4 ? '#fffaf0' : '#ffd8a8';
        g.beginPath(); g.arc(x, y, 1.2 + r() * 1.8, 0, TAU); g.fill();
      }
      g.globalAlpha = 1;
      /* where it leaves the cloud: a churning brightness, and the cloud round it lit from inside */
      g.save(); g.translate(FXX, BASE + 30); g.scale(1, 0.24); P.glow(g, 0, 0, 420, '#ffd9b0', 0.5); g.restore();
      for (let i = 0; i < 5; i++) P.glow(g, FXX + Math.sin(t * 0.9 + i * 1.3) * 60, BASE + 6 + Math.sin(t * 1.3 + i) * 5, 70 + 20 * Math.sin(t * 1.1 + i * 2), '#fff0d8', 0.34);
      g.restore();
      void W;
    }
    function boatShape(g, b, t, x, y, sc, a, glow) {
      g.save(); g.globalAlpha *= a;
      if (glow > 0.01) P.glow(g, x, y - 40 * sc, 160 * sc * (1 + glow), '#fff4dc', 0.5 * glow);
      const tilt = Math.sin(t * 0.9) * 0.03;
      g.save(); g.translate(x, y); g.rotate(tilt); g.scale(sc, sc);
      P.line(g, 40, -8, 40, -94, 3.5, '#6f4a34');
      if (b.lamp) { P.glow(g, 40, -100, 70, '#ffe6a0', 0.85); P.fill(g, P.rr(33, -110, 14, 18, 4), '#ffe9ae'); }
      g.restore();
      /* the riders, sitting low */
      (b.riders || []).forEach((rd, i) => {
        const n = b.riders.length, seat = (n === 1 ? -6 : -36 + (i * 60) / (n - 1)) * sc, rx = x + seat * Math.cos(tilt), ry = y - 20 * sc + seat * Math.sin(tilt);
        if (rd.dog) F.dog(g, { x: rx, y: ry + 6 * sc, s: (rd.s || 120) * sc, sit: 1, flip: !!rd.flip, wag: Math.sin(t * 8) * 0.6, headTilt: -0.2 });
        else F.person(g, { x: rx, y: ry, s: (rd.s || 130) * sc, style: rd.style || F.styles.villagerA, noLegs: true, flip: !!rd.flip, lean: rd.lean == null ? -0.04 : rd.lean, headTilt: rd.headTilt == null ? -0.18 : rd.headTilt, face: Object.assign({ blush: 0.2, mouth: 'smile' }, rd.face), armF: rd.armF || { a: 0.5, b: 0.9 } });
      });
      g.save(); g.translate(x, y); g.rotate(tilt); g.scale(sc, sc);
      P.fill(g, P.soft([[-66, -22], [66, -22], [84, -30], [70, 4], [44, 16], [-44, 16], [-70, 4]]), b.hull);
      P.fill(g, P.rr(-64, -24, 132, 7, 3), T.shade(b.hull, 0.18));
      g.strokeStyle = 'rgba(40,20,20,0.25)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-60, -6); g.quadraticCurveTo(0, 0, 66, -10); g.stroke();
      g.restore();
      g.restore();
    }
    V.update = function (dt) {
      V.sky.update(dt);
      const b = V.boat;
      if (!b) return;
      if (b.phase === 'glide') {
        b.k = Math.min(1, b.k + dt / b.glideDur);
        const e = T.ease.io(b.k);
        b.x = T.lerp(b.from[0], FXX, e); b.y = T.lerp(b.from[1], BASE + 8, e) - Math.sin(e * Math.PI) * 10; b.sc = T.lerp(1, 0.8, e); b.glow = e * 0.4;
        if (b.k >= 1) { b.phase = 'rise'; b.k = 0; if (T.audio) T.audio.sfx('star', 0.3); }
      } else if (b.phase === 'rise') {
        b.k = Math.min(1, b.k + dt / b.riseDur);
        const e = T.ease.in(b.k) * 0.6 + b.k * 0.4;
        b.y = T.lerp(BASE + 8, TOP + 40, e); b.x = FXX + Math.sin(b.k * 5) * 10 * (1 - b.k); b.sc = T.lerp(0.8, 0.26, e);
        b.glow = 0.4 + b.k * 1.4; b.a = 1 - T.clamp((b.k - 0.62) / 0.38);
        if (b.k >= 1) { b.phase = 'gone'; const d = b.done; b.done = null; if (d) d(); }
      }
    };
    V.draw = function (g, t) {
      const W = T.view.W;
      V.ensure();
      const sky = g.createLinearGradient(0, 0, 0, 720);
      sky.addColorStop(0, '#252a5e'); sky.addColorStop(0.36, '#5a5398'); sky.addColorStop(0.66, '#c58eb2'); sky.addColorStop(0.86, '#ffc6a4'); sky.addColorStop(1, '#ffe2c0');
      g.fillStyle = sky; g.fillRect(-W / 2, 0, W, 900);
      const r = T.rng(29);
      g.fillStyle = '#fff8ec';
      for (let i = 0; i < 80; i++) { const x = (r() - 0.5) * W, y = 10 + r() * 380, s = 0.7 + r() * 1.5; g.globalAlpha = (0.35 + 0.65 * (1 - y / 400)) * (0.5 + 0.5 * Math.sin(t * 1.3 + i * 2.1)); g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill(); }
      g.globalAlpha = 1;
      V.blit(g, 'far', 0.12, Math.sin(t * 0.04) * 12);
      V.sky.draw(g, t, 'screen');
      const fp = T.par(0.3);
      g.save(); g.translate(fp[0], fp[1]);
      fallsBody(g, t, W);
      /* far boats, always some rising */
      if (o.ambient !== false) for (const q of ambient) {
        const life = (t / 17 + q.ph) % 1, y = BASE - 30 - life * (BASE - TOP), sc = q.s * (1 - life * 0.6);
        boatShape(g, { hull: '#5f4a6e', lamp: true, riders: [] }, t, FXX + q.x + Math.sin(life * 7) * 6, y, sc, Math.sin(life * Math.PI) * 0.75, 0.3);
      }
      g.restore();
      V.blit(g, 'mid', 0.4, Math.sin(t * 0.07) * 10, Math.sin(t * 0.3) * 3);
      /* the boat: on the cloud by the landing, going out, or going up (in front of the cloud, so it never jumps behind it) */
      const b = V.boat;
      if (b && b.phase !== 'gone') {
        const depth = b.phase === 'moored' ? 0.6 : b.phase === 'glide' ? T.lerp(0.6, 0.35, b.k) : 0.3;
        const mp = T.par(depth), by = b.y + (b.phase === 'rise' ? 0 : Math.sin(t * 1.3) * 3);
        if (b.phase === 'moored') { const lp = T.par(0.9); g.strokeStyle = '#8a7058'; g.lineWidth = 2; g.beginPath(); g.moveTo(-188 + lp[0], LAND - 30 + lp[1]); g.quadraticCurveTo(-140, LAND, b.x - 60 + mp[0], by - 20 + mp[1]); g.stroke(); }
        boatShape(g, b, t, b.x + mp[0], by + mp[1], b.sc, b.a, b.glow);
      }
      V.blit(g, 'land', 0.9);
      const lp = T.par(0.9);
      g.save(); g.translate(lp[0], lp[1]);
      for (const q of V.lamps || []) { const fl = 0.9 + 0.1 * Math.sin(t * 5.3 + q[2] * 3) * Math.sin(t * 1.7 + q[2]); P.glow(g, q[0], q[1] + 13, 66 * fl, '#ffd98a', 0.66); P.glow(g, q[0], q[1] + 13, 10, '#fffbe8', 0.85); }
      V.drawActors(g, t);
      g.restore();
      V.blit(g, 'front', 1.25, Math.sin(t * 0.22) * 8);
      if (V.fade.a < 1) { g.fillStyle = T.rgba('#1b2440', 1 - V.fade.a); g.fillRect(-W / 2, 0, W, 900); }
      V.caption(g);
    };
    return V;
  }

  const PLACES = { overlook, falls };
  /* name: 'overlook' | 'falls' (and those skyplaces2.js adds); o: { actors, note (a caption), leoAge, boat, star, ambient } */
  T.place = function (name, o) {
    const mk = PLACES[name];
    if (!mk) throw new Error('T.place: no place called ' + name);
    return mk(o || {});
  };
  T.place.names = () => Object.keys(PLACES);
  /* more places (skyplaces2.js) are made with the same brushes and frame */
  T.place.add = function (name, mk) { PLACES[name] = mk; };
  T.place.kit = { rock, arcadePath, stonework, wallFill, isle, cloudRow, blossomTree, flowerSil, ledge, bracket, drawActor, base };
})();
