/* Take Your Time — the star mobile. In chapter 6 Leo makes it for his granddaughter out of the carpenter's offcuts:
   things from up here (the whale, two stars, a cloud) and the little swing seat he once promised Lily, hung from two
   bars so that each bar hangs level. Then he hangs it on a branch by the lake, and its shadows turn on the ceiling
   over Nora's crib. Chapter 7 hangs it again, by the lake, over a hospital bed.

   ---------- API ----------
   T.mobile.draw(g, x, y, s, o)
       The finished mobile. (x, y) is the hook it hangs from; s its scale (1: about 520 wide and 300 tall, the size it
       has in the making). o: { t (time, default T.time), sway 0..1 (how much the bars rock, default 0.3),
                                turn (true: it turns slowly about its string), spin (radians about the string, if you
                                want to say how far round it is yourself), glow 0..1 (a warm light round the pieces),
                                ink (a colour: everything drawn flat in it, a silhouette), alpha }
   T.mobile.piece(g, kind, x, y, s, o)
       One piece hanging from (x, y): 'whale' 'star' 'cloud' 'swing'. o: { ink, sx (horizontal squash, -1..1, for a
       piece turned away), t }
   T.mobile.shadows(g, cx, cy, rx, ry, t, o)
       Its shadows going round on a ceiling: the pieces travel an ellipse centred (cx, cy), radii rx, ry, the near
       ones a little larger, in a soft pool of lamplight. o: { a 0..1, ink (default '#2a2a44'), light (the pool's
       colour, default '#ffe2a8'; false for none), spin (radians; default t * 0.32), size (1) }
   T.mobile.thing(o)
       The mobile as a thing on the far bank of the lake (T.lake with shore: true; with deep: true it is place and
       distance both): it hangs from a bent branch stuck in the bank, is slid like any other thing, and its shadow falls
       into the picture at o.at. Before it has found its place its shadows show there faint (and small, set back from
       the water); once it has, they turn there in a pool of light, as plain as L.lit[o.id] says.
       o: { id ('mobile'), x (where it starts on the bank), at: [x, y] in the picture (the middle of the ceiling where
            the shadows should turn), d (how near the water it starts, 0..1, default 0.1), rx, ry (the ellipse on the
            ceiling; 150, 30), cueR (how wide the picture's want of it is; 96) }
       Returns the thing; put it in the lake's o.things.
   T.mobile.puzzle(o)
       The making of it, on the frame every puzzle has (puzzles.js: T.puzzle.make, the coach, next(), hintAt(),
       solve()), played with X.play. First one bar (the cloud and the two stars), then two tiers (that bar, the whale and
       the swing seat on the top bar). Each bar tilts the way its weight pulls it (weight × distance from the string).
       o: { caption (the line at the foot), wrong (said when everything is hung and a bar is not level), wrongWhale
            (said instead when the whale's side is the one that sinks), onLevel(stage) (called as each bar comes level) }
   T.mobile.WEIGHT: the pieces' weights, { whale: 5, cloud: 2, star: 1, swing: 1 } (the lower bar with its three is 4).
*/
(function () {
  'use strict';
  const T = window.TYT, P = T.P;
  const TAU = Math.PI * 2;
  const M = (T.mobile = {});
  const WEIGHT = (M.WEIGHT = { whale: 5, cloud: 2, star: 1, swing: 1 });
  const WOOD = '#b98a5a', STRING = '#8a7a6a';
  const COL = { whale: '#7fa6c9', star: '#f1c84a', cloud: '#f4efe6', swing: '#c98a5a' };

  /* ---------- the pieces ---------- */
  /* each hangs from (x, y) by its own short string; s its scale. Painted offcuts: the grain shows through */
  const PIECE_H = { whale: 34, star: 30, cloud: 24, swing: 56 };   /* how far below the attach point it hangs (string + half itself) */
  function grain(g, ink, w, h) { if (ink) return; g.strokeStyle = 'rgba(90,60,40,0.16)'; g.lineWidth = 1; for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(-w, i * h * 0.3); g.quadraticCurveTo(0, i * h * 0.3 + 2, w, i * h * 0.3 - 1); g.stroke(); } }
  M.piece = function (g, kind, x, y, s, o = {}) {
    const ink = o.ink, c = (k) => ink || k, sx = o.sx == null ? 1 : o.sx, t = o.t == null ? T.time : o.t;
    g.save(); g.translate(x, y); g.scale(s, s);
    const str = (len) => { g.strokeStyle = c(STRING); g.lineWidth = 1.2 / Math.max(0.4, s) * 0.9; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, len); g.stroke(); };
    if (kind === 'swing') {   /* a seat on two ropes from a little cross-piece */
      const w = 26 * Math.max(0.2, Math.abs(sx));
      g.strokeStyle = c(STRING); g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 8); g.stroke();
      P.fill(g, P.rr(-w - 3, 7, (w + 3) * 2, 4, 2), c(WOOD));
      g.strokeStyle = c('#a8845e'); g.lineWidth = 1.4; g.beginPath(); g.moveTo(-w, 10); g.lineTo(-w, 50); g.moveTo(w, 10); g.lineTo(w, 50); g.stroke();
      P.fill(g, P.rr(-w - 6, 49, (w + 6) * 2, 8, 3), c(COL.swing));
      if (!ink) P.fill(g, P.rr(-w - 6, 49, (w + 6) * 2, 3, 2), 'rgba(255,240,214,0.4)');
      g.restore(); return;
    }
    str(kind === 'cloud' ? 10 : 12);
    g.translate(0, PIECE_H[kind]);
    g.scale(sx < 0 ? Math.min(-0.18, sx) : Math.max(0.18, sx), 1);
    if (kind === 'whale') {
      g.rotate(Math.sin(t * 0.9) * 0.04);
      P.fill(g, P.soft([[-44, 4], [-30, -14], [0, -20], [26, -16], [44, -4], [46, 8], [30, 18], [-6, 20], [-34, 14]]), c(COL.whale));
      P.fill(g, P.poly([[-40, 2], [-62, -16], [-58, 0], [-64, 14]]), c(T.shade(COL.whale, -0.08)));   /* tail */
      if (!ink) { P.fill(g, P.soft([[-26, 12], [0, 18], [30, 14], [40, 6], [20, 9], [-8, 10]]), '#e6eef4'); P.fill(g, P.circle(28, -4, 2.6), '#2a3448'); P.fill(g, P.ellipse(4, 6, 10, 4, 0.4), T.shade(COL.whale, -0.1)); }
      grain(g, ink, 38, 16);
    } else if (kind === 'star') {
      const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 9.5 : 22; pts.push([Math.cos(a) * r, Math.sin(a) * r + 2]); }
      g.rotate(Math.sin(t * 1.3 + x * 0.01) * 0.12);
      P.fill(g, P.poly(pts), c(COL.star));
      if (!ink) { P.fill(g, P.circle(-4, -2, 3), 'rgba(255,255,255,0.4)'); grain(g, ink, 14, 10); }
    } else if (kind === 'cloud') {
      const puffs = [[-20, 4, 13], [-4, -5, 17], [14, -1, 14], [26, 6, 9], [2, 7, 14]];
      if (!ink) puffs.forEach((q) => P.fill(g, P.circle(q[0], q[1], q[2] + 1.6), '#b9c3d2'));
      puffs.forEach((q) => P.fill(g, P.circle(q[0], q[1], q[2]), c(COL.cloud)));
      if (!ink) { P.fill(g, P.ellipse(2, 14, 26, 5), '#d9d0c4'); grain(g, ink, 22, 12); }
    }
    g.restore();
  };
  /* a bar: a stick of wood with little notches, and the string it hangs from at its middle */
  function bar(g, half, ink, glowNotch) {
    P.fill(g, P.rr(-half, -3, half * 2, 6, 3), ink || WOOD);
    if (!ink) { g.fillStyle = 'rgba(255,240,214,0.35)'; g.fillRect(-half + 3, -3, half * 2 - 6, 1.6); }
    P.fill(g, P.circle(0, 0, 3.6), ink || '#7a5a3e');
    void glowNotch;
  }

  /* ---------- the finished mobile ----------
     The shape the puzzle ends on: the top bar (notches 78 apart) carries the lower bar two notches to the left, the
     whale one to the right and the swing seat three to the right; the lower bar (40 apart) carries the cloud two to
     the left and the stars one and three to the right. */
  const TOP = { u: 78, half: 3 * 78 + 16, drop: 64 }, LOW = { u: 40, half: 3 * 40 + 10, drop: 58 };
  const FINAL = { top: [['low', -2], ['whale', 1], ['swing', 3]], low: [['cloud', -2], ['star', 1], ['star', 3]] };
  function lowerBar(g, x, y, s, o, ang, spin) {
    /* (x, y) where its string starts. ang: its tilt; spin: how far round it is about its own string */
    const cs = Math.cos(spin), ink = o.ink;
    g.strokeStyle = ink || STRING; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + LOW.drop * s); g.stroke();
    const by = y + LOW.drop * s;
    const pts = (o.low || FINAL.low).map(([k, d]) => { const dx = d * LOW.u * cs * s; return [k, x + dx * Math.cos(ang), by + dx * Math.sin(ang)]; });
    g.save(); g.translate(x, by); g.rotate(ang); g.scale(s * Math.max(0.08, Math.abs(cs)), s); bar(g, LOW.half, ink); g.restore();
    pts.forEach(([k, px, py]) => M.piece(g, k, px, py, s, { ink, sx: cs, t: o.t }));
    if (o.glow > 0.01 && !ink) pts.forEach(([k, px, py]) => { if (k === 'star') P.glow(g, px, py + PIECE_H.star * s, 30 * s, '#ffe9a8', 0.5 * o.glow); });
  }
  M.draw = function (g, x, y, s, o = {}) {
    const t = o.t == null ? T.time : o.t, sway = o.sway == null ? 0.3 : o.sway;
    const spin = o.spin != null ? o.spin : o.turn ? t * 0.45 : 0.18, spin2 = o.spin != null ? o.spin * 1.25 + 0.3 : o.turn ? t * 0.56 + 0.3 : 0.3;
    const ink = o.ink, cs = Math.cos(spin);
    g.save(); if (o.alpha != null) g.globalAlpha *= o.alpha;
    /* the hook and the string to the top bar */
    if (!ink) P.fill(g, P.circle(x, y, 3.2 * s), '#6a5a4a');
    g.strokeStyle = ink || STRING; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + TOP.drop * s); g.stroke();
    const ang = Math.sin(t * 1.1) * 0.05 * sway, ang2 = Math.sin(t * 1.4 + 1.3) * 0.07 * sway, by = y + TOP.drop * s;
    g.save(); g.translate(x, by); g.rotate(ang); g.scale(s * Math.max(0.08, Math.abs(cs)), s); bar(g, TOP.half, ink); g.restore();
    for (const [k, d] of FINAL.top) {
      const dx = d * TOP.u * cs * s, px = x + dx * Math.cos(ang), py = by + dx * Math.sin(ang);
      if (k === 'low') lowerBar(g, px, py, s, Object.assign({}, o, { t }), ang2, spin2);
      else { M.piece(g, k, px, py, s, { ink, sx: cs, t }); if (o.glow > 0.01 && !ink) P.glow(g, px, py + PIECE_H[k] * s, 36 * s, '#ffe9a8', 0.35 * o.glow); }
    }
    g.restore();
  };

  /* ---------- its shadows on a ceiling ---------- */
  const RING = [['whale', 0, 1], ['star', 1.25, 0.62], ['cloud', 2.3, 0.9], ['star', 3.4, 1], ['swing', 4.4, 0.72], ['star', 5.3, 0.5]];
  function flat(g, kind, x, y, k, ink, a) {
    /* a soft-edged silhouette: drawn twice, the larger one fainter */
    g.save(); g.globalAlpha *= a * 0.45; M.piece(g, kind, x, y - PIECE_H[kind] * k * 1.08, k * 1.08, { ink }); g.restore();
    g.save(); g.globalAlpha *= a * 0.7; M.piece(g, kind, x, y - PIECE_H[kind] * k, k, { ink }); g.restore();
  }
  M.shadows = function (g, cx, cy, rx, ry, t, o = {}) {
    const a = o.a == null ? 1 : o.a;
    if (a <= 0.005) return;
    const spin = o.spin != null ? o.spin : t * 0.32, sz = o.size || 1, ink = o.ink || '#2a2a44';
    if (o.light !== false) {
      P.glow(g, cx, cy, rx * 1.55, o.light || '#ffe2a8', 0.42 * a);
      g.save(); g.globalAlpha *= 0.13 * a; P.fill(g, P.ellipse(cx, cy, rx * 1.2, ry * 1.5), o.light || '#ffe2a8'); g.restore();
    }
    /* the far ones first */
    const list = RING.map(([k, a0, r]) => { const an = spin + a0; return { k, x: cx + Math.cos(an) * rx * r, y: cy + Math.sin(an) * ry * r, near: (Math.sin(an) + 1) / 2 }; }).sort((p, q) => p.near - q.near);
    for (const q of list) flat(g, q.k, q.x, q.y, sz * (0.5 + 0.22 * q.near) * (q.k === 'whale' ? 0.9 : 1), ink, a * (0.65 + 0.35 * q.near));
  };

  /* ---------- on the lake's far bank ---------- */
  M.thing = function (o = {}) {
    const q = { kind: 'mobile', id: o.id || 'mobile', x: o.x == null ? 300 : o.x, at: o.at, d: o.d == null ? 0.1 : o.d, cueR: o.cueR || 96, turn: false };
    const rx = o.rx || 150, ry = o.ry || 30;
    /* a branch bent over at the top, stuck in the bank, and the mobile on it */
    q.bank = function (g, x, t, L) {
      const B = 228, cray = P.cray;
      g.save();
      g.strokeStyle = '#5a4634'; g.lineCap = 'round'; g.lineWidth = 6;
      g.beginPath(); g.moveTo(x - 6, B + 2); g.quadraticCurveTo(x - 16, B - 110, x - 2, B - 204); g.quadraticCurveTo(x + 12, B - 236, x + 52, B - 224); g.stroke();
      g.lineWidth = 3; g.beginPath(); g.moveTo(x - 9, B - 96); g.quadraticCurveTo(x - 30, B - 112, x - 36, B - 132); g.stroke();
      P.fill(g, P.ellipse(x - 36, B - 136, 9, 5, -0.6), '#6f9a62'); P.fill(g, P.ellipse(x + 56, B - 228, 8, 4.4, 0.4), '#6f9a62');
      P.cray = false;
      M.draw(g, x + 50, B - 222, 0.38, { t, turn: true, sway: 0.6, glow: L.lit[q.id] || 0 });
      P.cray = cray;
      g.restore();
    };
    /* what falls in the picture: its shadows on the ceiling, faint until it has found its place */
    q.ghost = function (g, x, dy, near, lit, t, L) {
      const sa = L.deep ? T.lerp(0.26, 1, q.d) : 1;
      if (lit < 0.97) M.shadows(g, x, dy, rx, ry, t, { a: sa * (0.24 + 0.36 * near) * (1 - lit), ink: '#101c33', light: false, size: 0.8 });
      if (lit > 0.02) M.shadows(g, x, dy, rx, ry, t, { a: lit, ink: '#2b2c4a', size: 0.8 });
    };
    return q;
  };

  /* ---------- the making of it ---------- */
  const SLOTS = [-3, -2, -1, 1, 2, 3], SLOT_KEYS = ['q', 'w', 'e', 'r', 't', 'y'];
  /* two stages: the lower bar on its own, then the top bar with the lower bar as one of its three things */
  const STAGES = [
    { items: [['cloud', 2], ['star', 1], ['star', 1]], at: [1, 3, 5], u: 74, half: 3 * 74 + 16 },
    { items: [['low', 4], ['whale', 5], ['swing', 1]], at: [1, 3, 5], u: 78, half: 3 * 78 + 16 },
  ];
  M.puzzle = function (o = {}) {
    const PZ = T.puzzle;
    const G = PZ.make({ stage: 0, place: [-1, -1, -1], hand: -1, th: 0, tv: 0, lift: [0, 0, 0], swap: 0, spin: 0, spinV: 0, level: 0, busy: false, skipAll: false });
    const SZ = 1.45, HX = 0, BY = 270, HY = BY - TOP.drop * SZ, TRAY_Y = 628, TABLE = TRAY_Y + 34;   /* SZ: the mobile here is drawn bigger than its own size */
    const st = () => STAGES[G.stage];
    const items = () => st().items;
    const torque = () => G.place.reduce((s, p, i) => (p >= 0 ? s + items()[i][1] * SLOTS[p] : s), 0);
    const hungW = () => G.place.reduce((s, p, i) => (p >= 0 ? s + items()[i][1] : s), 0);
    const target = () => { const tq = torque(), w = hungW(); return T.clamp(Math.atan(tq / (w * 2.2 + 3)) * 0.9, -0.27, 0.27); };
    const slotXY = (p) => { const d = SLOTS[p] * st().u * SZ; return [HX + d * Math.cos(G.th), BY + d * Math.sin(G.th)]; };
    const trayXY = (i) => [-300 + i * 300, TRAY_Y];
    /* on the table, each hangs from a little peg so that it just clears the top */
    const trayTop = (i) => { const k = items()[i][0]; return TABLE - (k === 'low' ? 132 : PIECE_H[k] + (k === 'swing' ? 6 : 26)) * SZ - G.lift[i] * 26; };
    /* where an item's body is, to touch it */
    const bodyDy = (k) => (k === 'low' ? 98 : k === 'swing' ? 40 : PIECE_H[k] + 4) * SZ;
    const itemXY = (i) => {
      const p = G.place[i], k = items()[i][0];
      if (p < 0) return [trayXY(i)[0], trayTop(i) + bodyDy(k)];
      const q = slotXY(p);
      return [q[0], q[1] + bodyDy(k)];
    };
    /* the right answer, or its mirror image if the player has started that way round */
    function plan() {
      const a = st().at, b = a.map((p) => 5 - p);
      const score = (pl) => G.place.reduce((s, p, i) => s + (p >= 0 && p === pl[i] ? 1 : p >= 0 ? -1 : 0), 0);
      return score(b) > score(a) ? b : a;
    }
    function settle() { G.say = ''; G.idle = 0; }
    function pickUp(i) {
      if (G.hand >= 0 && G.hand !== i) G.lift[G.hand] = 0;
      if (G.place[i] >= 0) { G.place[i] = -1; G.tv += (Math.random() - 0.5) * 0.4; }
      G.hand = i; G.clock.tween(G.lift, i, 1, 0.3, T.ease.out);
      T.audio.sfx('knock', 0.8);
    }
    function hang(p) {
      const i = G.hand, other = G.place.indexOf(p);
      if (other >= 0) { G.place[other] = -1; G.lift[other] = 0; }   /* what was there goes back to the table */
      G.place[i] = p; G.hand = -1; G.lift[i] = 0;
      G.tv += -Math.sign(SLOTS[p]) * 0.05;   /* a little dip as it takes the weight */
      T.audio.sfx('knock', 0.2 + p * 0.12); T.audio.note({ m: 72 + p * 2, vel: 0.14, voice: 'pluck', dur: 0.4 });
      check();
    }
    function check() {
      if (G.place.some((p) => p < 0)) return;
      const tq = torque();
      if (tq === 0) { level(); return; }
      /* the whale's side going down gets Pipi laughing at the whale */
      const wi = items().findIndex((q) => q[0] === 'whale'), wSide = wi >= 0 ? Math.sign(SLOTS[G.place[wi]]) : 0;
      G.clock.wait(0.5).then(() => { if (!G.done && G.place.every((p) => p >= 0) && torque() !== 0) G.wrong(wSide && wSide === Math.sign(tq) ? o.wrongWhale || o.wrong : o.wrong); });
    }
    function level() {
      G.busy = true; G.say = '';
      T.audio.sfx('join'); T.audio.note({ m: 84, at: 0.2, vel: 0.18, voice: 'glass', dur: 1.6 });
      G.clock.tween(G, 'level', 1, 0.6);
      if (o.onLevel) o.onLevel(G.stage);
      if (G.stage === 0) {
        G.lowLayout = items().map((q, i) => [q[0], SLOTS[G.place[i]]]);
        /* the lower bar is done: it goes down onto the table as one thing, and the top bar comes */
        G.clock.wait(1.6).then(() => G.clock.tween(G, 'swap', 1, 0.7, T.ease.io)).then(() => {
          G.stage = 1; G.place = [-1, -1, -1]; G.lift = [0, 0, 0]; G.hand = -1; G.th = 0.18; G.tv = 0; G.level = 0; G.idle = 0;
          return G.clock.tween(G, 'swap', 0, 0.7, T.ease.io);
        }).then(() => { G.busy = false; if (G.skipAll) G.clock.wait(0.4).then(G.solve); });
      } else {
        /* all level: it turns (from the way round the player built it) */
        const wi = items().findIndex((q) => q[0] === 'whale');
        G.spin = SLOTS[G.place[wi]] < 0 ? Math.PI : 0; G.spinV = 0.9; T.audio.promise();
        G.finish(3.2);
      }
    }
    G.hit = function (x, y) {
      if (G.busy) return -1;
      for (let i = 0; i < 3; i++) { const q = itemXY(i); if (Math.abs(x - q[0]) < (items()[i][0] === 'low' ? 150 : 80) && Math.abs(y - q[1]) < (items()[i][0] === 'low' ? 90 : 60)) return i; }
      for (let p = 0; p < 6; p++) { const q = slotXY(p); if (Math.hypot(x - q[0], y - q[1]) < 40) return 10 + p; }
      return -1;
    };
    G.tap = function (n) {
      if (G.done || G.busy || n < 0) return;
      settle();
      if (n >= 10) { const p = n - 10, there = G.place.indexOf(p); if (G.hand >= 0) hang(p); else if (there >= 0) pickUp(there); return; }
      if (n >= 3) return;
      if (G.hand === n) { G.hand = -1; G.lift[n] = 0; T.audio.sfx('step'); return; }
      pickUp(n);
    };
    G.keyOf = (key) => { if (key >= '1' && key <= '3') return +key - 1; const s = SLOT_KEYS.indexOf(key); return s >= 0 ? 10 + s : -1; };
    /* the move that is right just now: what is in the hand goes to its place; else the first thing not yet where it goes */
    function move() {
      if (G.done || G.busy) return -1;
      const pl = plan();
      if (G.hand >= 0) return 10 + pl[G.hand];
      for (let i = 0; i < 3; i++) if (G.place[i] !== pl[i]) return i;
      return -1;
    }
    G.next = () => { const n = move(); return n < 0 ? null : n >= 10 ? SLOT_KEYS[n - 10] : String(n + 1); };
    G.hintAt = () => { const n = move(); return n < 0 ? null : n >= 10 ? slotXY(n - 10) : itemXY(n); };
    G.hintR = 52;
    G.keys = () => (G.busy ? null : 'pick');
    G.tip = '내려간 쪽의 것을 가운데 쪽으로 옮겨 보세요';
    G.spots = () => (G.busy ? [] : [0, 1, 2].map((i) => [i, ...itemXY(i), items()[i][0] === 'low' ? 80 : 50]).concat(G.hand >= 0 ? SLOTS.map((d, p) => [10 + p, ...slotXY(p), 34]) : []));
    /* skipped: everything goes where it belongs, both bars */
    G.solve = function () {
      if (G.done) return;
      G.skipAll = true;
      if (G.busy) return;
      const pl = plan();
      G.hand = -1; G.lift = [0, 0, 0]; G.place = pl.slice();
      check();
    };
    const upd0 = G.update;
    G.update = function (dt) {
      upd0.call(G, dt);
      /* the bar swings toward the way its weight pulls it, and settles */
      const tg = target();
      G.tv += (-(G.th - tg) * 9 - G.tv * 2.6) * dt; G.th += G.tv * dt;
      if (Math.abs(G.th) > 0.3) { G.th = Math.sign(G.th) * 0.3; G.tv *= -0.3; }   /* it comes up against its string, and bounces a little */
      G.spin += G.spinV * dt;
    };
    /* ---------- drawing ---------- */
    function drawItem(g, i, x, y, t, hold) {
      const k = items()[i][0];
      if (hold) P.glow(g, x, y + bodyDy(k), 90, '#fff0c0', 0.55);
      if (k === 'low') lowerBar(g, x, y, SZ, { t, low: G.lowLayout || FINAL.low }, Math.sin(t * 1.4) * 0.03, 0);
      else M.piece(g, k, x, y, SZ, { t });
    }
    G.draw = function (g, t) {
      if (G.a < 0.005) return;
      G.dim(g, 0.5);
      const X0 = -560, Y0 = 108, PW = 1120, PH = 624, frame = P.rr(X0, Y0, PW, PH, 30);
      g.save(); g.globalAlpha = G.a;
      g.save(); g.translate(0, (1 - T.ease.out3(G.a)) * 30);
      g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = 36; g.shadowOffsetY = 12;
      P.fill(g, frame, '#e9d9bc');
      g.shadowColor = 'transparent';
      g.save(); g.clip(frame);
      /* under the apple tree in the afternoon: the leaves above, light through them, the table below */
      const bg = g.createLinearGradient(0, Y0, 0, Y0 + PH); bg.addColorStop(0, '#cfe3d0'); bg.addColorStop(0.55, '#f2e8cc'); bg.addColorStop(1, '#e6d3ae');
      g.fillStyle = bg; g.fillRect(X0, Y0, PW, PH);
      const r = T.rng(91);
      for (let i = 0; i < 30; i++) { const x = X0 + r() * PW, y = Y0 - 10 + r() * 70, sx = 30 + r() * 36; P.fill(g, P.ellipse(x + Math.sin(t * 0.8 + i) * 3, y, sx, sx * 0.5, r() * 3), r() < 0.5 ? 'rgba(96,150,80,0.7)' : 'rgba(126,172,96,0.6)'); }
      for (let i = 0; i < 7; i++) P.glow(g, X0 + 80 + i * 160 + Math.sin(t * 0.5 + i) * 20, Y0 + 260 + (i % 3) * 120, 90, '#fff6d6', 0.35);
      /* the branch the hook is on */
      P.line(g, X0, Y0 + 40, X0 + PW, Y0 + 30, 16, '#7a5a3e'); P.line(g, X0, Y0 + 36, X0 + PW, Y0 + 26, 4, '#9a7a5a');
      /* the table: the offcuts are laid out on it */
      P.fill(g, P.rr(X0, TRAY_Y + 34, PW, 120, 0), '#b98a5a'); P.fill(g, P.rr(X0, TRAY_Y + 34, PW, 7, 0), '#d1a676');
      for (let i = 0; i < 9; i++) { const x = X0 + 40 + r() * (PW - 80); P.fill(g, P.rr(x, TRAY_Y + 46 + r() * 30, 14 + r() * 30, 5, 2), 'rgba(240,220,180,0.7)'); }   /* shavings */
      const sw = T.ease.io(G.swap);
      /* the hook, its string, and the bar on it */
      g.save(); g.globalAlpha *= 1 - sw;
      g.strokeStyle = STRING; g.lineWidth = 2; g.beginPath(); g.moveTo(HX, Y0 + 34); g.lineTo(HX, HY); g.stroke();
      P.fill(g, P.circle(HX, HY, 5), '#5a4a3a');
      g.lineWidth = 1.4; g.beginPath(); g.moveTo(HX, HY); g.lineTo(HX, BY); g.stroke();
      const turning = G.done && G.stage === 1;
      if (turning) { M.draw(g, HX, HY, SZ, { t, spin: G.spin, sway: 0.25 }); g.restore(); }
      else {
      g.save(); g.translate(HX, BY); g.rotate(G.th); g.scale(SZ, SZ); bar(g, st().half, null);
      /* the notches: little rings where a string can go, pulsing when something is in the hand */
      for (let p = 0; p < 6; p++) {
        const x = SLOTS[p] * st().u, open = G.place.indexOf(p) < 0;
        g.strokeStyle = T.rgba('#6a4a30', 0.8); g.lineWidth = 2; g.beginPath(); g.arc(x, -1, 5, 0, TAU); g.stroke();
        if (G.hand >= 0 && !G.busy) { g.strokeStyle = T.rgba('#fff6dc', open ? 0.55 + 0.3 * Math.sin(t * 4 + p) : 0.3); g.lineWidth = 2.4; g.beginPath(); g.arc(x, 0, 13, 0, TAU); g.stroke(); }
      }
      g.restore();
      /* what hangs from it */
      for (let i = 0; i < 3; i++) if (G.place[i] >= 0) { const q = slotXY(G.place[i]); drawItem(g, i, q[0], q[1], t, false); }
      /* how far off level it is, as a plumb line from the hook would show */
      if (G.level > 0.01) { P.glow(g, HX, BY, 160, '#fff3c8', 0.4 * G.level * (1 - sw)); }
      g.restore();
      }
      /* on the table: what is not hung yet (the one in the hand lifted) */
      for (let i = 0; i < 3; i++) if (G.place[i] < 0) { drawItem(g, i, trayXY(i)[0], trayTop(i), t, G.hand === i); }
      /* the lower bar going down onto the table between the stages */
      if (sw > 0.01 && G.stage === 0) { g.save(); g.globalAlpha *= sw; lowerBar(g, trayXY(0)[0], TABLE - 132 * SZ, SZ, { t, low: G.lowLayout }, 0, 0); g.restore(); }
      g.restore();
      g.strokeStyle = 'rgba(255,250,236,0.7)'; g.lineWidth = 3; g.stroke(frame);
      g.restore();
      /* done: it turns, slowly, on its string */
      if (G.done && G.stage === 1) { const k = T.clamp(G.spin / 1.5); P.glow(g, 0, 360, 300, '#fff6d6', 0.25 * k); }
      g.restore();
      G.hintRing(g, t);
      G.caption(g, G.done ? '' : o.caption || '');
    };
    return G;
  };
})();
