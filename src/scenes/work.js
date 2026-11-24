/* Take Your Time — the jobs of work, done where they happen: on the hill, in the town, with the people
   who are there. A house on a hill is not thought into being: stone is pushed up to it, timber is sawn
   beside it, what falls is pulled up again by everyone at once, and what is lost the dog finds.
   Built on the same frame as the small puzzles (puzzles.js); the scene's own actors do the moving. */
(function () {
  'use strict';
  const T = window.TYT, P = T.P, F = T.F;
  const Z = T.puzzle, make = Z.make;
  const INK = '#f3ead8';
  const anyKey = (key) => (key === ' ' || key === 'Enter' || key === '1' ? 0 : -1);
  const W = () => T.world, scr = (x, y) => T.world.toScreen(x, y), zoom = () => T.world.S.cam.z;

  /* ---------- pushing stone up the hill ----------
     o: { leo, from, to (world x), trips }. Each press is a heave; breath runs out, and pushed past it the stone rolls back. */
  Z.haul = function (o) {
    const G = make({ trips: o.trips || 2, i: 0, p: 0, breath: 1, slip: 0, rest: 0, heave: 0, fade: 1 });
    const leo = o.leo, at = () => T.lerp(o.from, o.to, G.p);
    const stone = () => { const x = at() + (o.to > o.from ? 34 : -34); return [x, W().groundAt(x) - 24]; };
    G.start = function () {
      leo.go = null; leo.flip = o.to < o.from;
      leo.pose = (oo, a, t) => { const q = stone(); oo.lean = 0.34 + G.heave * 0.12 - (G.breath < 0.2 ? 0.24 : 0); oo.walk = G.breath < 0.2 ? null : G.p * 40; if (G.breath < 0.2) { oo.face.eye = 'closed'; oo.face.mouth = 'open'; oo.armF = { a: 0.2, b: 0.3 }; } else { oo.armF = { hand: F.local(oo, q[0] - (o.to > o.from ? 16 : -16), q[1] - 6) }; oo.armB = { hand: F.local(oo, q[0] - (o.to > o.from ? 18 : -18), q[1] + 10) }; } oo.face.blush = 0.2 + (1 - G.breath) * 0.5; };
    };
    G.keyOf = anyKey; G.hit = () => 0;
    G.tap = function () {
      if (G.rest > 0) return;
      G.idle = 0;
      if (G.breath < 0.16) { G.wrong('숨이 턱까지 찼어요. 잠깐 쉬었다가 밀어요'); G.slip = 1; G.p = Math.max(0, G.p - 0.12); return; }
      G.say = ''; G.breath -= 0.19; G.p = Math.min(1, G.p + 0.085); G.heave = 1;
      T.audio.sfx('step'); T.audio.sfx('knock', G.p * 0.9);
      if (G.p >= 1) { G.i++; G.rest = 1.4; T.audio.sfx('join'); if (G.i >= G.trips) { leo.pose = null; G.finish(1.0); } }
    };
    const up = G.update;
    G.update = function (dt) {
      up(dt);
      G.breath = Math.min(1, G.breath + dt * (G.breath < 0.16 ? 0.34 : 0.42));
      G.slip = Math.max(0, G.slip - dt * 2); G.heave = Math.max(0, G.heave - dt * 3.2);
      if (G.rest > 0 && !G.done) { G.rest -= dt; G.fade = T.clamp(Math.abs(G.rest - 0.7) / 0.7); if (G.rest <= 0) { G.p = 0; G.breath = 1; G.fade = 1; } }
      if (!G.done) leo.x = at() - (o.to > o.from ? 40 : -40);
    };
    G.next = () => (G.done || G.rest > 0 || G.breath < 0.4 ? null : '1');
    G.hintAt = () => { const q = stone(), s = scr(q[0], q[1]); return [s[0], s[1] - 40]; };
    G.draw = function (g, t) {
      if (G.a < 0.005) return;
      const z = zoom();
      g.save(); g.globalAlpha = G.a;
      /* the stones already up, by the stakes */
      for (let i = 0; i < G.i; i++) { const sx = o.to + 30 + i * 46, s2 = scr(sx, W().groundAt(sx) - 18); P.fill(g, P.ellipse(s2[0], s2[1], 22 * z, 17 * z), i % 2 ? '#a9a39b' : '#b9b3aa'); }
      if (G.rest <= 0 || G.done || G.rest > 0.7) {
        const q = stone(), s2 = scr(q[0], q[1]);
        g.save(); g.globalAlpha = G.a * (G.done ? 1 : G.fade); g.translate(s2[0] + G.jig(t, 1) * 0.5, s2[1]); g.rotate(G.p * 9 + G.slip * -0.6); g.scale(z, z);
        P.fill(g, P.ellipse(0, 0, 26, 22), '#b3ada4'); P.fill(g, P.ellipse(-7, -6, 8, 5), '#c9c3ba'); P.line(g, -10, 7, 5, 12, 2, '#8f8982');
        g.restore();
      }
      /* breath */
      P.text(g, '숨', -150, 150, { font: 'serif', size: 26, color: INK, alpha: 0.95 * G.a, glow: 'rgba(14,20,32,0.8)' });
      P.fill(g, P.rr(-110, 132, 260, 22, 11), 'rgba(20,26,44,0.35)');
      if (G.breath > 0.02) P.fill(g, P.rr(-110, 132, 260 * G.breath, 22, 11), G.breath < 0.2 ? '#c9573f' : G.breath < 0.4 ? '#e2a85a' : '#9fcf86');
      for (let i = 0; i < G.trips; i++) P.fill(g, P.circle(-20 + i * 40 - (G.trips - 1) * 20 + 20, 190, 9), i < G.i ? '#ffd98a' : 'rgba(243,234,216,0.4)');
      g.restore();
      G.hintRing(g, t);
      G.caption(g, '눌러서 돌을 밀어 올리세요. 숨이 차면 잠깐 쉬었다 가요');
    };
    return G;
  };

  /* ---------- sawing timber, beside the plot ----------
     o: { leo, at (world x of the cut), logs, strokes }. Push and pull: the two sides, turn about.
     He stands at the downhill end of the log with the saw in his hand: the handle goes where his hand goes, and his
     arm and shoulders go with every stroke. The log is set level at his height; each trestle stands on its own
     bit of the slope, and uphill the log simply rests on the bank. */
  Z.saw = function (o) {
    const G = make({ logs: o.logs || 2, strokes: o.strokes || 9, i: 0, n: 0, side: 0, x: -1, rest: 0 });
    const leo = o.leo, X0 = o.at, XL = X0 - 118;
    const gAt = (x) => W().groundAt(x);
    const base = () => gAt(XL), logTop = () => base() - 96, logBot = () => logTop() + 28;   /* about his belt: a working height */
    const cutK = () => (G.rest > 0 ? 1 : G.n / G.strokes);
    /* the off-cut runs uphill until the bank comes up to meet it */
    const rightLen = () => { let L = 40; while (L < 140 && gAt(X0 + L + 10) > logBot() + 2) L += 10; return L; };
    /* where the handle should be: stroke along the log, the blade sloping down into the kerf, steeper as it goes deeper */
    const SLOPE = (c) => 0.2 - 0.1 * c;
    const handTarget = () => { const c = cutK(), hx = X0 - 84 + G.x * 24, cy = logTop() + 28 * c; return [hx, Math.min(logTop() - 10, cy - 6 - (X0 - hx) * Math.tan(SLOPE(c)))]; };
    G.start = function () {
      leo.go = null; leo.moving = false; leo.x = XL; leo.flip = false;
      leo.pose = (oo) => {
        const push = (G.x + 1) / 2, h = handTarget();
        oo.x += G.x * 7; oo.lean = 0.1 + cutK() * 0.34 + push * 0.12; oo.headTilt = 0.16;   /* bending over it as the cut goes deeper */
        oo.legF = { foot: [9 + push * 2, 48.6] }; oo.legB = { foot: [-9 + push * 3, 48.8] };
        oo.armF = { hand: F.local(oo, h[0], h[1]), bend: 1 };
        oo.armB = { hand: F.local(oo, XL + 24 + G.x * 7, logTop() + 3), bend: 1 };   /* the other hand steadies the log */
      };
    };
    G.keyOf = (key) => (key === 'ArrowLeft' || key === '1' ? 0 : key === 'ArrowRight' || key === '2' ? 1 : -1);
    G.hit = (x) => (x < 0 ? 0 : 1);
    G.tap = function (n) {
      if (G.rest > 0 || n > 1) return;
      G.idle = 0;
      if (n !== G.side) { G.wrong('톱은 밀고 당기기예요. 반대쪽을 눌러요'); return; }
      G.say = ''; G.side = 1 - G.side; G.n++;
      T.audio.sfx('crayon'); T.audio.sfx('chalk', n);
      if (G.n >= G.strokes) { G.i++; G.rest = 1.0; T.audio.sfx('knock', 0.3); if (G.i >= G.logs) { leo.pose = null; G.finish(1.0); } }
    };
    const up = G.update;
    G.update = function (dt) {
      up(dt);
      G.x += ((G.side ? -1 : 1) * -1 - G.x) * Math.min(1, dt * 7);   /* a stroke takes a moment: the arm carries it through */
      if (G.rest > 0 && !G.done) { G.rest -= dt; if (G.rest <= 0) G.n = 0; }
    };
    G.next = () => (G.done || G.rest > 0 ? null : G.side ? 'ArrowRight' : 'ArrowLeft');
    G.hintAt = () => [G.side ? 330 : -330, 470];
    G.keys = 'sides';
    G.tip = '빛나는 화살표 쪽을 눌러요. 왼쪽, 오른쪽 번갈아';
    /* skipped: the last strokes go through, and the cut log drops */
    G.solve = function () { G.i = G.logs; G.n = G.strokes; G.rest = 1; leo.pose = null; T.audio.sfx('knock', 0.3); G.finish(1.0); };
    G.draw = function (g, t) {
      if (G.a < 0.005) return;
      const z = zoom(), yb = base(), o0 = scr(X0, yb), top = logTop() - yb, bot = top + 28, RL = rightLen();
      g.save(); g.globalAlpha = G.a; g.translate(o0[0], o0[1]); g.scale(z, z);
      /* local: x from the cut, y from the ground where he stands */
      const trestle = (x) => { const gy = gAt(X0 + x) - yb; if (gy - bot < 14) return; const h = gy - bot; P.line(g, x - 10 - h * 0.28, gy, x, bot - 2, 6, '#8a6442'); P.line(g, x + 10 + h * 0.28, gy, x, bot - 2, 6, '#8a6442'); P.line(g, x - 6 - h * 0.14, (gy + bot) / 2, x + 6 + h * 0.14, (gy + bot) / 2, 3.4, '#7a5838'); };
      trestle(-80); trestle(Math.min(70, RL - 26));
      const cut = cutK(), drop = G.rest > 0 ? (1 - G.rest) * 30 : 0;
      /* the saw, in his hand the whole time: the blade first, so that where it has gone down into the kerf the wood hides it */
      const hw = leo.j && leo.j.handF ? leo.j.handF : handTarget(), hl = [hw[0] - X0, hw[1] - yb];
      const ky = top + 28 * cut, ang = Math.atan2(ky - 6 - hl[1], -hl[0]), blade = Math.hypot(hl[0], ky - 6 - hl[1]) + 36 - 22 * cut;
      {
        g.save(); g.translate(hl[0], hl[1]); g.rotate(ang);
        P.fill(g, P.poly([[9, -8], [blade, -3], [blade, 6], [9, 7]]), '#cfd6da');
        g.strokeStyle = '#9aa3a8'; g.lineWidth = 1; g.beginPath();
        for (let x = 12; x < blade - 3; x += 6) { g.moveTo(x, 6.6); g.lineTo(x + 3, 9); g.lineTo(x + 6, 6.4); }
        g.stroke();
        g.restore();
      }
      P.fill(g, P.rr(-150, top, 150, 28, 14), '#b98a5a'); P.fill(g, P.ellipse(-150, top + 14, 7, 14), '#d9b384');
      g.save(); g.translate(0, drop); g.rotate(drop * 0.006); P.fill(g, P.rr(0, top, RL, 28, 14), '#b98a5a'); P.fill(g, P.ellipse(RL, top + 14, 7, 14), '#c9a070'); g.restore();
      P.fill(g, P.rr(-2, top - 1, 4, 29 * cut, 1), '#5a3d28');
      const gc = gAt(X0) - yb;
      for (let i = 0; i < Math.round(cut * 9); i++) P.fill(g, P.circle(T.noise(i, 3) * 14, gc - 2 - (i % 3) * 2, 2.4), '#e6c79a');
      {   /* the grip sits in his fist */
        g.save(); g.translate(hl[0], hl[1]); g.rotate(ang);
        P.fill(g, P.rr(-10, -10, 20, 20, 6), '#8a5a3b'); P.fill(g, P.rr(-4.5, -5, 9, 9, 3), 'rgba(40,28,20,0.5)');
        const skin = leo.style && leo.style.skin ? leo.style.skin : '#e7b793';
        g.fillStyle = skin; g.beginPath(); g.ellipse(0.5, 1.5, 5.6, 4.4, 0, 0, Math.PI * 2); g.fill();   /* his fingers round it */
        g.fillStyle = T.shade(skin, -0.12); g.beginPath(); g.ellipse(3.2, 3.2, 2.2, 1.6, 0.4, 0, Math.PI * 2); g.fill();
        g.restore();
      }
      for (let i = 0; i < G.logs; i++) P.fill(g, P.rr(-60 + i * 44, top - 64, 36, 12, 6), i < G.i ? '#d9b384' : 'rgba(243,234,216,0.45)');
      g.restore();
      /* which way now */
      for (const d of [0, 1]) {
        const on = G.side === d && G.rest <= 0, x = d ? 330 : -330, k = on ? 1 + 0.08 * Math.sin(t * 6) : 1;
        g.save(); g.translate(x, 470); g.scale((d ? 1 : -1) * k, k); g.globalAlpha = G.a * (on ? 0.9 : 0.22);
        const arrow = P.poly([[-34, -22], [10, -22], [10, -44], [52, 0], [10, 44], [10, 22], [-34, 22]]);
        g.strokeStyle = 'rgba(48,44,78,0.6)'; g.lineWidth = 5; g.lineJoin = 'round'; g.stroke(arrow);   /* an edge, so it shows on a pale sky */
        P.fill(g, arrow, '#fff0c8');
        g.restore();
      }
      G.hintRing(g, t);
      G.caption(g, '왼쪽, 오른쪽을 번갈아 눌러 통나무를 켜세요');
    };
    return G;
  };

  /* ---------- everyone on the rope: 다 같이, 한 번에 ----------
     One rope, and everyone on it in a line down the hill. What is going up (the frame after the storm, the ridge
     beam) moves only when every one of them pulls at the same moment. Each gets ready in their own time: plants
     their feet, breathes in, leans back, and the little circle over their head fills as they do and shines once
     they are set. The children are set in no time, the old ones take longer, and nobody can hold it for long: they
     tremble, breathe out, and start again. Press once when every circle shines at the same time: Leo calls 영차!,
     they all heave, it comes up a notch and a peg drops in under it. Pressed too soon, only the ones who were set
     pull: it jerks up and slides back onto its peg, and everyone starts again. After two misses running they all
     hold it a little longer (twice at most). Left alone a while, a ring shows who they are waiting for.
     o: { crew: [actors, standing in their line, the one nearest it first], pulls, at: world x of its middle,
          top(k) -> world [x, y]: where the rope is tied at height k (0..1), raise(k, sh): show it at height k
          (sh: a shudder), cam(x, y, z, k), beam: length (the puzzle draws the beam itself, coming up on pegs),
          stake: world x of a notched stake beside a frame, win: seconds that they are all set together,
          hold: how long they can hold it (x), wobble (0..1: how unevenly they come ready),
          slow: { id: seconds to get set }, late: id of one who takes the rope only for the last heave,
          bean: Bean, gust (0..1: how often a gust or Bean puts someone off just before they are all set),
          caller: id of who says 「숨 맞추고!」 } */
  Z.heave = function (o) {
    const N = o.pulls || 3, BEAM = o.beam || 0, crew = o.crew, rnd = T.rng(o.seed || 23), wob = o.wobble == null ? 0.3 : o.wobble;
    const G = make({ kind: 'heave', pulls: N, n: 0, k: 0, kv: 0, peg: 0, T: 0, phase: 'take', ph: 0, miss: 0, assist: 0, word: 0, shud: 0,
      set: false, setT: 0, glow: 0, said: -9, we: Infinity, plans: 0, gust: 0, bark: 0, sayT: 0, events: [], pops: [] });
    const gAt = (x) => W().groundAt(x);
    /* how long each of them takes to get set, and how long they can hold it there */
    const TEMPER = { kid: [0.55, 1.2], cloud: [0.65, 1.3], leo: [1.0, 2.0], v3: [0.95, 2.0], rosa: [1.15, 1.9], v2: [1.25, 1.9], bram: [1.45, 2.1], bram2: [1.45, 2.1], v1: [1.8, 1.9] };
    const OUT = 0.45, SLIP = 0.6, PULL = 1.0, BEAN_V = 420;   /* breathing out; losing a footing; the heave; Bean at a run */
    const fx = Math.sign(o.at - crew[0].x) || -1;   /* the way they face: toward what is going up */
    const ppl = crew.map((a, i) => {
      const tp = TEMPER[a.id] || [1.1, 1.9];
      return { a, i, prep: (o.slow && o.slow[a.id]) || tp[0], hold: tp[1] * (o.hold || 1), on: a.id !== o.late, segs: [], q: { s: 'slack', k: 0 }, prev: 'slack',
        L: 0, pl: 0.2, br: 0, sl: 0.3, sb: 0, tr: 0, tau: 0.1, pop: 0, puff: 0, say: '', sayT: 0, slot: a.x };
    });
    const act = () => ppl.filter((p) => p.on);
    const late = ppl.find((p) => !p.on) || null;
    if (late) { const on = ppl.filter((p) => p.on), a = on[on.length - 1], b = on[on.length - 2]; late.slot = a.slot + (b ? a.slot - b.slot : -fx * 60); }   /* his place: next in the line */
    const byId = (id) => ppl.find((p) => p.a.id === id);
    const win = () => (o.win || 1) * [1, 1.3, 1.6][G.assist];
    const holdK = () => [1, 1.3, 1.6][G.assist];
    const say = (p, w, d) => { if (p) { p.say = w; p.sayT = d || 1.4; } };
    /* close enough to set that a press counts for them: a breath all but full, or let go a moment ago */
    const nearly = (p) => p.q.s === 'ready' || (p.q.s === 'prep' && p.q.k >= 0.88) || (p.q.s === 'tire' && p.q.since < 0.14);

    /* ---------- who is set, and when ----------
       Each round is planned around one moment when they will all be set together, for win() seconds. Everyone gets
       there by their own breaths: the quick ones are set early, can't hold it that long, breathe out and go again;
       the slow ones start at once and only just make it. Someone (usually the slowest) is the last to be set, and
       someone is the first to let go. If nobody presses, the next such moment is planned when this one is over. */
    const free = (p) => (p.segs.length ? p.segs[p.segs.length - 1].t1 : G.T);
    function breaths(p, f0, r0, r1, P) {   /* p's breaths from f0 until set from r0 to r1, then breathing out */
      const out = [], cap = p.hold * holdK(), add = (s, a, b) => { if (b > a + 0.001) out.push({ s, t0: a, t1: b }); };
      let t = Math.min(f0 + 0.06 + rnd() * 0.3, r0 - P);
      add('slack', f0, t);
      for (let i = 0; i < 8; i++) {
        const last = r0 - P;   /* the latest they can start the breath that carries them through */
        if (t >= last - 0.001 || r1 - (t + P) <= cap) {   /* one breath will do */
          const s = Math.max(t, Math.min(last, T.lerp(t, last, rnd() * 0.7)));
          add('slack', t, s); add('prep', s, s + P); add('ready', s + P, r1); add('tire', r1, r1 + OUT);
          return out;
        }
        const room = last - 0.08 - (t + P + OUT);   /* too long to hold: set early anyway, then breathe out and go again */
        if (room < 0.35) { add('slack', t, last); t = last; continue; }
        const h = Math.min(cap * (0.55 + 0.45 * rnd()), room);
        add('prep', t, t + P); add('ready', t + P, t + P + h); add('tire', t + P + h, t + P + h + OUT);
        t += P + h + OUT;
        const gap = Math.max(0, Math.min(last - t, rnd() * 0.25));
        add('slack', t, t + gap); t += gap;
      }
      add('slack', t, r0 - P); add('prep', r0 - P, r0); add('ready', r0, r1); add('tire', r1, r1 + OUT);
      return out;
    }
    function plan(from) {
      G.plans++;
      const A = act(), Wn = win() * (G.plans === 1 ? 1.3 : 1), hk = holdK(), f = (p) => from.get(p);   /* the very first time, a little longer */
      const P = new Map(A.map((p) => [p, p.prep * (0.92 + 0.16 * rnd())]));
      let ws = Math.max(...A.map((p) => f(p) + 0.45 + P.get(p))) + 0.1 + rnd() * 0.5 * wob;
      const slowest = A.reduce((m, p) => (P.get(p) > P.get(m) ? p : m), A[0]);
      let opener = rnd() < wob ? A[Math.floor(rnd() * A.length)] : slowest;
      const closer = A[Math.floor(rnd() * A.length)];
      /* now and then, just before they are all set, a gust or Bean puts someone off their footing */
      let trip = null;
      if (o.gust && G.plans > 1 && A.length > 2 && rnd() < o.gust) {
        const pool = A.filter((p) => p !== slowest), who = pool[Math.floor(rnd() * pool.length)];
        const kind = o.bean && !o.bean.go && rnd() < 0.5 ? 'bean' : 'gust', Pv = P.get(who), h1 = Math.min(who.hold * hk, 0.45 + rnd() * 0.4);
        ws = Math.max(ws, f(who) + 0.4 + Pv + h1 + SLIP + Pv);
        if (kind === 'bean') ws = Math.max(ws, G.T + 0.3 + Math.abs(who.a.x - o.bean.x) / BEAN_V + SLIP + Pv);
        trip = { who, kind, at: ws - Pv - SLIP, h1 };
        opener = who;
      }
      G.ws = ws; G.we = ws + Wn;
      A.forEach((p) => {
        const Pp = P.get(p);
        const tail = p === closer ? 0 : Math.min(0.08 + rnd() * 0.45, Math.max(0, p.hold * hk - Wn - 0.05));
        const room = Math.max(0, p.hold * hk - Wn - tail);
        const lead = p === opener ? 0 : Math.max(0, Math.min(room * (0.35 + 0.65 * rnd()), ws - Pp - f(p) - 0.4));   /* most are set a while before the last one */
        const r1 = ws + Wn + tail;
        let segs;
        if (trip && trip.who === p) {
          segs = breaths(p, f(p), trip.at - trip.h1, trip.at, Pp);
          segs.pop();   /* not a breath out: they lose their footing, and must start again */
          segs.push({ s: 'slip', t0: trip.at, t1: trip.at + SLIP, kind: trip.kind }, { s: 'prep', t0: trip.at + SLIP, t1: ws }, { s: 'ready', t0: ws, t1: r1 }, { s: 'tire', t0: r1, t1: r1 + OUT });
        } else segs = breaths(p, f(p), ws - lead, r1, Pp);
        p.segs = p.segs.concat(segs);
      });
      if (trip && trip.kind === 'bean') { const d = Math.abs(trip.who.a.x - o.bean.x); G.events.push({ t: trip.at - d / BEAN_V, fn: dash }); }
      if (trip && trip.kind === 'gust') G.events.push({ t: trip.at - 0.4, fn: () => { G.gust = 1; G.shud = Math.max(G.shud, 0.4); T.audio.sfx('wind'); } });
    }
    /* everyone lets the rope go slack and starts again, after d seconds */
    function reset(d) {
      G.events = [];
      act().forEach((p) => { p.segs = [{ s: 'slack', t0: G.T, t1: G.T + d }]; });
      plan(new Map(act().map((p) => [p, G.T + d])));
    }
    /* Bean, at a run up the line between their feet, and back */
    function dash() {
      const b = o.bean;
      if (!b || b.go) return;
      if (b.home == null) b.home = b.x;
      b.sit = 0; b.run = 1; b.z0 = b.z0 == null ? b.z : b.z0; b.z = 4;
      T.audio.sfx('bark', 0.7);
      b.go = { x: crew[0].x + fx * 36, v: BEAN_V, res: () => { b.run = 0; b.go = { x: b.home, v: 150, res: () => { b.flip = fx < 0; b.sit = 1; b.z = b.z0; } }; } };
    }

    /* ---------- how they stand ----------
       Slack: upright, the rope loose and low in their hands. Getting set: feet planted, a breath in (shoulders
       up), then leaning back with the rope drawn in to the waist. Set: leaning right back, face set, trembling at
       the end of it. Breathing out: slumped. On the heave: thrown back all at once. */
    const pose = (p) => (oo, aa, t) => {
      if (aa.go) return;
      const f = fx, u = (aa.s / 150) * (aa.style && aa.style.kid ? 0.62 : 1), q = p.q;
      const L = p.L, pl = p.pl, br = p.br, sl = p.sl, sb = p.sb, tr = p.tr;
      const shake = tr * Math.sin(t * 41 + p.i * 1.7) * 0.025 + G.gust * Math.sin(t * 9 + p.i) * 0.04;
      oo.flip = f < 0;
      oo.x = aa.x - f * (L * 9 - sb * 9) * u;
      oo.y += (pl * 2.2 + L * 3.2 + sl * 1.4 - br * 1.6) * u;
      oo.lean = 0.05 + sl * 0.13 - L * 0.35 + sb * 0.34 + shake;
      const gF = aa.x + f * (7 + pl * 7 + sb * 9) * u, gB = aa.x - f * (3 + pl * 7 - sb * 2) * u, fF = F.local(oo, gF, gAt(gF)), fB = F.local(oo, gB, gAt(gB));
      oo.legF = { foot: [fF[0], fF[1] - 2.8] }; oo.legB = { foot: [fB[0], fB[1] - 2.8] };
      const hy = oo.y - (13 + L * 9 + br * 2 - sl * 3 + sb * 4) * u, hx = oo.x + f * (25 - L * 6 + sb * 6) * u;
      oo.armF = { hand: F.local(oo, hx + f * 6 * u, hy - 1 * u) }; oo.armB = { hand: F.local(oo, hx - f * 3 * u, hy + 2 * u) };
      const s = q.s, strain = s === 'pull' || (s === 'ready' && tr > 0.45);
      const face = s === 'pull' ? { eye: 'closed', mouth: 'open', blush: 0.55 }
        : s === 'ready' ? { eye: strain ? 'closed' : 'open', mouth: 'line', blush: 0.3 + tr * 0.35 }
          : s === 'prep' ? { eye: 'open', mouth: br > 0.4 ? 'line' : 'smile', blush: 0.2 + br * 0.15 }
            : s === 'tire' ? { eye: 'closed', mouth: 'open', blush: 0.35 }
              : s === 'slip' || s === 'jolt' ? { eye: 'open', mouth: 'open', blush: 0.3 } : s === 'glad' ? { eye: 'happy', mouth: 'smile', blush: 0.4 } : { eye: 'open', mouth: 'smile' };
      oo.face = Object.assign({}, oo.face, face);
      oo.headTilt = -0.04 - L * 0.05 + sl * 0.12 + sb * 0.1;
    };
    /* the one who joins at the end, watching till then with his hands behind his back */
    const watch = (oo) => { oo.flip = fx < 0; oo.armF = { a: -0.55, b: 0.9 }; oo.armB = { a: -0.5, b: 0.95 }; oo.face = Object.assign({}, oo.face, { mouth: 'smile' }); };

    G.start = function () {
      ppl.forEach((p) => {
        const a = p.a;
        a.sit = 0; a.moving = false; a.go = null; a.flip = fx < 0;
        a.pose = p.on ? pose(p) : watch;
      });
      if (o.bean) { o.bean.home = o.bean.x; o.bean.z0 = o.bean.z; }
      if (o.cam) {
        const xs = ppl.map((p) => (p.on ? p.slot : p.a.x)).concat([o.at + fx * (BEAM ? BEAM / 2 + 10 : 160)], o.bean ? [o.bean.x] : []);
        const x0 = Math.min(...xs) - 20, x1 = Math.max(...xs) + 60, z = T.clamp(1100 / (x1 - x0), 0.8, 1.25);
        o.cam((x0 + x1) / 2, gAt(o.at) - 125 / z, z, 1.2);
      }
      o.raise(0, 0);
      T.announce('다 같이 당기기. 한 줄로 줄을 잡은 사람들이 저마다 발을 딛고, 숨을 들이쉬고, 몸을 뒤로 젖힌다. 모두가 준비된 순간에 스페이스나 엔터를 누르면 다 같이 당긴다.');
    };

    /* ---------- a press ---------- */
    G.keyOf = (key) => (key === ' ' || key === 'Enter' || key === 'ArrowUp' || key === 'w' || key === 'W' || key === '1' ? 0 : -1);
    G.hit = () => 0;   /* anywhere: on the rope, on them, on the sky */
    G.tap = function () {
      if (G.done || G.phase !== 'go') return;
      G.idle = 0;
      if (act().every(nearly)) heave(); else miss();
    };
    function heave() {
      G.phase = 'heave'; G.ph = 0; G.n++; G.miss = 0; G.say = ''; G.word = 1; G.pegged = false; G.we = Infinity; G.events = [];
      G.kv += BEAM ? 1.1 : 1.4; G.shud = 1;
      act().forEach((p) => { p.segs = [{ s: 'pull', t0: G.T, t1: G.T + PULL }]; p.L = 1.75; p.tau = 1; });
      T.audio.sfx('creak'); T.audio.step(G.n * 2, { voice: 'box', vel: 0.4 });
      if (o.bean) { G.bark = 0.7; T.audio.sfx('bark', 0.5); }
      T.announce(G.n >= N ? '영차! 다 같이 당겨서 끝까지 올라갔다.' : '영차! 다 같이 당겨서 한 칸 올라가고, 쐐기가 걸렸다.');
    }
    function miss() {
      const A = act(), set = A.filter(nearly), not = A.filter((p) => !nearly(p));
      G.phase = 'slip'; G.ph = 0; G.miss++; G.we = Infinity; G.events = [];
      G.kv += 0.3 + 0.7 * (set.length / A.length); G.shud = 0.6;
      set.forEach((p) => { p.segs = [{ s: 'pull', t0: G.T, t1: G.T + 0.6 }]; p.L = 1.35; });
      not.forEach((p) => { p.segs = [{ s: 'jolt', t0: G.T, t1: G.T + 0.6 }]; });
      const shy = not.reduce((m, p) => (p.q.k < m.q.k ? p : m), not[0]), caller = o.caller ? byId(o.caller) : null;
      say(shy, '아직!');
      if (caller && caller !== shy) G.events.push({ t: G.T + 0.4, fn: () => say(caller, '숨 맞추고!', 1.6) });
      T.audio.sfx('creak'); T.audio.note({ m: 50, vel: 0.12, voice: 'pluck', dur: 0.5 });
      if (G.miss >= 2 && G.assist < 2) { G.assist++; G.miss = 0; G.say = '괜찮아요. 이번엔 다들 숨을 조금 더 오래 참아 줄 거예요'; }
      else G.say = '아직 숨을 고르던 사람이 있었어요. 모두 환해질 때 눌러요';
      G.sayT = 5;
      T.announce('아직 준비 안 된 사람이 있다. 조금 들렸다가 도로 미끄러져 쐐기에 걸린다.' + (G.miss === 0 ? ' 이번엔 다들 조금 더 오래 버틴다.' : ''));
    }
    function join() {
      G.phase = 'join'; G.ph = 0;
      act().forEach((p) => { p.segs = [{ s: 'slack', t0: G.T, t1: G.T + 30 }]; });
      say(late, '마지막은 나도 잡아야지.', 2.4);
      late.a.pose = null;
      late.a.go = { x: late.slot, v: 52, res: () => { late.a.flip = fx < 0; } };
      T.announce('마지막 한 번. 지켜보던 이웃도 와서 줄 끝을 잡는다.');
    }

    /* ---------- the clock ---------- */
    const up = G.update;
    G.update = function (dt) {
      up(dt);
      const t = T.time;
      G.T += dt; G.ph += dt;
      G.word = Math.max(0, G.word - dt * 0.9); G.gust = Math.max(0, G.gust - dt * 0.8); G.shud = Math.max(0, G.shud - dt * 2.2);
      if (G.sayT > 0) { G.sayT -= dt; if (G.sayT <= 0) G.say = ''; }
      G.pops = G.pops.map((v) => Math.max(0, v - dt * 3));
      if (G.done) {
        G.kv += ((1 - G.k) * 50 - G.kv * 8) * dt; G.k += G.kv * dt;
        o.raise(G.k, 0);
        ppl.forEach((p) => { p.L += (0 - p.L) * Math.min(1, dt * 4); p.sl += (0.2 - p.sl) * Math.min(1, dt * 4); p.tau = 0.3; if (p.on && G.ph > PULL) p.q = { s: 'glad', k: 0 }; });   /* up: glad faces all along the line */
        if (G.a < 0.3 && !G.let) { G.let = true; ppl.forEach((p) => { p.a.pose = null; }); }   /* they let go of the rope */
        return;
      }
      if (G.phase === 'take') {
        if (G.ph > 1.1 && crew.every((a) => !a.go)) { G.phase = 'go'; G.idle = 0; reset(0.1); }
      } else if (G.phase === 'heave') {
        if (!G.pegged && G.ph > 0.32) { G.pegged = true; G.peg = G.n / N; G.pops[G.n - 1] = 1; T.audio.sfx('knock', G.peg); }
        if (G.ph > PULL + 0.2) {
          if (G.n >= N) { T.audio.promise(); G.finish(1.6); }
          else if (late && !late.on && G.n === N - 1) join();
          else { G.phase = 'go'; reset(0.05); }
        }
      } else if (G.phase === 'slip') {
        if (G.ph > 0.9) { G.phase = 'go'; reset(0.05); }
      } else if (G.phase === 'join') {
        if (G.ph > 1.2 && !late.a.go) { late.on = true; late.a.pose = pose(late); G.phase = 'go'; G.idle = 0; reset(0.15); }
      } else if (G.phase === 'go' && G.T >= G.we + 0.05) { G.we = Infinity; plan(new Map(act().map((p) => [p, free(p)]))); }
      for (let i = 0; i < G.events.length; i++) if (G.events[i].t <= G.T) { const e = G.events.splice(i--, 1)[0]; e.fn(); }

      /* each of them: where they are in their breath, and the pose easing toward it */
      act().forEach((p) => {
        while (p.segs.length > 1 && p.segs[0].t1 <= G.T) p.segs.shift();
        const s = p.segs[0];
        let q;
        if (!s || G.T >= s.t1) q = { s: 'slack', k: 0, u: 1, left: 9, since: 9 };
        else { const u = T.clamp((G.T - s.t0) / Math.max(1e-3, s.t1 - s.t0)); q = { s: s.s, u, k: s.s === 'prep' ? u : s.s === 'ready' ? 1 : 0, left: s.t1 - G.T, since: G.T - s.t0, kind: s.kind }; }
        p.q = q;
        if (q.s !== p.prev) {
          if (q.s === 'ready') { p.pop = 1; T.audio.note({ m: [67, 69, 72, 74, 76, 79, 81, 84][p.i % 8], vel: 0.06, voice: 'pluck', dur: 0.3 }); }
          if (q.s === 'tire' && p.prev === 'ready') p.puff = 1;
          if (q.s === 'slip') { say(p, q.kind === 'bean' && p.a.style && p.a.style.kid ? '빈!' : '어이쿠!', 1.2); T.audio.sfx('step'); G.shud = Math.max(G.shud, 0.3); }
          p.prev = q.s;
        }
        const k = q.k, s2 = q.s;
        let L = 0, pl = 0.15, br = 0, sl = 0.35, sb = 0;
        if (s2 === 'prep') { pl = T.clamp(k / 0.35); br = T.clamp((k - 0.3) / 0.35); L = 0.85 * T.clamp((k - 0.6) / 0.4); sl = 0; }
        else if (s2 === 'ready') { L = 1; pl = 1; br = 1; sl = 0; }
        else if (s2 === 'tire') { L = 0.12; pl = 0.6; sl = 1; }
        else if (s2 === 'slip') { sb = q.u < 0.6 ? 1 : 0; pl = 0; sl = 0.2; }
        else if (s2 === 'jolt') { sb = q.u < 0.5 ? 0.5 : 0; pl = 0.4; sl = 0.2; }
        else if (s2 === 'pull') { L = q.u < 0.4 ? 1.5 : 0.3; pl = 1; sl = q.u < 0.4 ? 0 : 0.5; }
        const r = Math.min(1, dt * 9);
        p.L += (L - p.L) * r; p.pl += (pl - p.pl) * r; p.br += (br - p.br) * r; p.sl += (sl - p.sl) * Math.min(1, dt * 6); p.sb += (sb - p.sb) * Math.min(1, dt * 14);
        p.tr = s2 === 'ready' ? T.clamp(1 - q.left / 0.5) : 0;
        const tau = s2 === 'ready' || s2 === 'pull' ? 1 : s2 === 'prep' ? 0.2 + 0.55 * k : s2 === 'tire' ? 0.25 : 0.06;
        p.tau += (tau - p.tau) * Math.min(1, dt * (tau > p.tau ? 14 : 6));
      });
      ppl.forEach((p) => { p.pop = Math.max(0, p.pop - dt * 4); p.puff = Math.max(0, p.puff - dt * 1.6); if (p.sayT > 0) p.sayT -= dt; });

      /* all set together */
      const A = act(), all = G.phase === 'go' && A.length > 0 && A.every((p) => p.q.s === 'ready');
      if (all && !G.set) {
        G.setT = G.T;
        T.audio.note({ m: 79, vel: 0.1, voice: 'felt', dur: 1.2 });
        if (G.T - G.said > 2.5) { G.said = G.T; T.announce('모두 준비됐다.'); }
      }
      G.set = all;
      G.glow += ((all ? 1 : 0) - G.glow) * Math.min(1, dt * (all ? 16 : 7));

      /* what is going up: a spring to its notch, never below the last peg */
      const aim = G.phase === 'heave' ? G.n / N : G.peg, kS = G.phase === 'slip' ? 24 : BEAM ? 46 : 62;
      G.kv += ((aim - G.k) * kS - G.kv * (G.phase === 'slip' ? 6 : 8.5)) * dt;
      G.k += G.kv * dt;
      if (G.k < G.peg) { if (G.kv < -0.15) T.audio.sfx('knock', 0.15 + G.peg * 0.4); G.k = G.peg; G.kv = Math.max(0, G.kv); }
      o.raise(Math.max(0, G.k), G.shud * 0.035 * Math.sin(t * 27));
      if (o.bean) { const b = o.bean; G.bark = Math.max(0, G.bark - dt); if (!b.go) b.jump = G.bark > 0 ? Math.abs(Math.sin(G.bark * 13)) * 12 : 0; }
    };
    G.next = () => (G.phase === 'go' && !G.done && G.a > 0.6 && G.set && G.T - G.setT > 0.04 ? 'Enter' : null);
    G.who = () => ppl.map((p) => ({ id: p.a.id, on: p.on, s: p.q.s, k: p.q.k, left: p.q.left }));   /* for the tests: where each of them is */
    const cueAt = (p) => { const j = p.a.j; if (!j) return null; const s = scr(j.head[0], j.head[1] - j.R); return [s[0], s[1] - 34]; };
    const ropeMid = () => { const A = act(), p = A[Math.floor((A.length - 1) / 2)]; const j = p && p.a.j; return j ? scr(j.handF[0], j.handF[1]) : [0, 450]; };
    G.hintAt = () => (G.phase === 'go' && G.set ? ropeMid() : null);
    /* who they are waiting for: of those not set, the one whose next set comes last */
    function waitingFor() {
      let best = null, bt = -1;
      act().forEach((p) => {
        if (p.q.s === 'ready') return;
        const r = p.segs.find((s) => s.s === 'ready'), at = r ? r.t0 : 99;
        if (at > bt) { bt = at; best = p; }
      });
      return best;
    }

    /* ---------- drawing ---------- */
    const WOOD = '#8a6442', WOOD2 = '#a57d58';
    function peg(g, x, y, w, h, pop, z) {   /* a wooden peg, end on; it pops in when it goes in */
      const k = 1 + 0.6 * pop;
      g.save(); g.translate(x, y); g.scale(k * z, k * z);
      if (pop > 0.01) P.glow(g, 0, 0, w * 1.4, '#ffe2a8', 0.7 * pop);
      P.fill(g, P.rr(-w / 2 - 1.5, -h / 2 - 1.5, w + 3, h + 3, h / 2 + 1.5), '#4a3424'); P.fill(g, P.rr(-w / 2, -h / 2, w, h, h / 2), '#b07f55'); P.fill(g, P.rr(-w / 2 + 2, -h / 2 + 1, w - 4, h * 0.38, h / 3), '#d1a676');
      g.restore();
    }
    function stake(g, z) {   /* a notched stake beside the frame: a peg goes in under it at every notch */
      const x = o.stake, side = Math.sign(o.at - x) || 1, b = scr(x, gAt(x) + 4), tp = scr(x, o.top(1)[1] - 22);
      P.line(g, b[0], b[1], tp[0], tp[1], 9 * z, WOOD); P.line(g, b[0] - 2 * z, b[1], tp[0] - 2 * z, tp[1], 3 * z, WOOD2);
      for (let n = 1; n <= N; n++) {
        const y = scr(x, o.top(n / N)[1] + 6)[1];
        P.line(g, b[0] - 4 * z, y, b[0] + 4 * z, y, 2 * z, '#5a3d28');
        if (n <= Math.round(G.peg * N)) peg(g, b[0] + side * 13 * z, y, 28, 11, G.pops[n - 1] || 0, z);
      }
    }
    function beamAt() { const c = o.top(G.k); return [c[0], c[1]]; }
    function beam(g, z, t) {   /* the ridge beam, coming up level, on a sling, onto pegs in the walls */
      const c = beamAt(), half = BEAM / 2, tilt = G.shud * 0.02 * Math.sin(t * 23);
      for (let n = 1; n <= Math.round(G.peg * N); n++) {
        const y = o.top(n / N)[1] + 12;
        [-1, 1].forEach((sd) => { const q = scr(c[0] + sd * (half - 16), y); peg(g, q[0], q[1], 22, 10, G.pops[n - 1] || 0, z); });
      }
      const s = scr(c[0], c[1]);
      g.save(); g.translate(s[0], s[1]); g.scale(z, z); g.rotate(tilt);
      g.strokeStyle = '#e6d6b0'; g.lineWidth = 3; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-half + 34, -6); g.lineTo(0, -64); g.lineTo(half - 34, -6); g.stroke();   /* the sling */
      P.fill(g, P.rr(-half, -8, BEAM, 16, 6), '#b98a5a'); P.fill(g, P.rr(-half, -8, BEAM, 5, 3), '#d1a676');
      P.fill(g, P.ellipse(-half, 0, 5, 8), '#d9b384'); P.fill(g, P.ellipse(half, 0, 5, 8), '#d9b384');
      g.restore();
    }
    const tieAt = () => { if (BEAM) { const c = beamAt(); return scr(c[0], c[1] - 64); } const c = o.top(G.k); return scr(c[0], c[1]); };
    function rope(g, z) {
      const A = act().filter((p) => p.a.j && !p.a.go);
      if (!A.length) return;
      const pts = [], e = tieAt();
      let prev = e;
      A.forEach((p, i) => {
        const j = p.a.j, hf = scr(j.handF[0], j.handF[1]), hb = scr(j.handB[0], j.handB[1]);
        const tau = i === 0 ? p.tau : Math.min(p.tau, A[i - 1].tau);
        pts.push([prev, hf, (1 - tau) * 26 * z]); pts.push([hf, hb, 0]);
        prev = hb;
      });
      /* the end of it, trailing in the grass (as far as the one who will take it last) */
      const lp = A[A.length - 1], lu = lp.a.s / 150, ex = (late && !late.on ? late.slot : lp.a.x) - fx * 34 * lu, en = scr(ex, gAt(ex) - 2);
      const run = (w, c) => {
        g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round';
        g.beginPath(); g.moveTo(pts[0][0][0], pts[0][0][1]);
        pts.forEach(([a, b, sag]) => { if (sag > 0.5) g.quadraticCurveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + sag, b[0], b[1]); else g.lineTo(b[0], b[1]); });
        g.quadraticCurveTo(prev[0] - fx * 14 * z, prev[1] + 18 * z, en[0], en[1]);
        g.stroke();
      };
      if (G.glow > 0.02) { g.save(); g.globalAlpha *= G.glow * (0.45 + 0.15 * Math.sin(T.time * 7)); run(9 * z, '#ffd98a'); g.restore(); }
      run(4.2 * z, '#e6d6b0');
      P.fill(g, P.circle(e[0], e[1], 5 * z), '#cdb88f');   /* tied on */
    }
    function cue(g, p, t) {
      const c = cueAt(p);
      if (!c) return;
      const [x, y] = c, q = p.q, R = 15, j = p.a.j;
      if (p.puff > 0.01) {   /* the breath let out: a little cloud from the mouth, drifting off */
        const u = 1 - p.puff, m = scr(j.head[0] + fx * j.R * 1.05, j.head[1] + j.R * 0.5), zz = zoom();
        g.save(); g.globalAlpha *= Math.min(1, p.puff * 1.6) * 0.85;
        [[0, 0, 4.2], [7, -3, 5.4], [14, -1, 3.6]].forEach(([dx, dy, r]) => P.fill(g, P.circle(m[0] + fx * (dx + 4 + u * 16) * zz, m[1] + (dy - u * 6) * zz, r * (0.7 + u * 0.6) * zz), '#fbf8f2'));
        g.restore();
      }
      const on = q.s === 'ready' || (q.s === 'pull' && G.phase === 'heave');
      P.fill(g, P.circle(x, y, R + 3.5), 'rgba(38,30,54,0.34)');   /* a backing, so it reads on a bright sky */
      if (on) {
        const pop = p.pop, tired = p.tr, rr = R * (1 + 0.35 * pop) * (1 - 0.14 * tired * (0.5 + 0.5 * Math.sin(t * 34)));
        P.glow(g, x, y, rr * 2.8, '#ffd98a', 0.5 * (1 - 0.45 * tired) + 0.3 * G.glow);
        P.fill(g, P.circle(x, y, rr), tired > 0.5 ? '#f6c873' : '#ffd98a');
        P.fill(g, P.circle(x - rr * 0.32, y - rr * 0.32, rr * 0.32), 'rgba(255,252,240,0.85)');
        if (G.glow > 0.05) { g.save(); g.globalAlpha *= G.glow; g.strokeStyle = '#fff6e0'; g.lineWidth = 2.5; g.beginPath(); g.arc(x, y, rr + 6 + 2 * Math.sin(t * 7), 0, Math.PI * 2); g.stroke(); g.restore(); }
      } else {
        g.save(); g.strokeStyle = 'rgba(255,246,228,0.8)'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, R - 1.5, 0, Math.PI * 2); g.stroke(); g.restore();
        if (q.s === 'tire' && q.since < 0.35) { const u = 1 - q.since / 0.35; P.fill(g, P.circle(x, y, (R - 3) * u), T.rgba('#ffd98a', 0.4 + 0.5 * u)); }   /* the light going out of it */
        if (q.s === 'prep' && q.k > 0.01) {
          const pth = new Path2D(); pth.moveTo(x, y); pth.arc(x, y, R - 3.5, -Math.PI / 2, -Math.PI / 2 + q.k * Math.PI * 2); pth.closePath();
          P.fill(g, pth, T.mix('#fff3d6', '#ffd98a', q.k));
        }
      }
    }
    function speech(g, p) {   /* a word from one of them, in a little bubble over the circle */
      if (p.sayT <= 0 || !p.say) return;
      const c = cueAt(p);
      if (!c) return;
      /* it opens away from what is going up, where the line is lower and the sky is clear */
      const w = P.text(g, p.say, 0, 0, { size: 32, alpha: 0 }).w, y = c[1] - 46, x = c[0] - fx * (w / 2 - 4);
      g.save(); g.globalAlpha *= T.clamp(p.sayT * 3);
      P.fill(g, P.rr(x - w / 2 - 15, y - 31, w + 30, 44, 22), 'rgba(58,47,62,0.25)');
      P.fill(g, P.rr(x - w / 2 - 13, y - 33, w + 26, 42, 21), '#fff8ea'); P.fill(g, P.poly([[c[0] - 9, y + 7], [c[0] + 9, y + 7], [c[0], y + 21]]), '#fff8ea');
      P.text(g, p.say, x, y, { size: 32, color: '#3a2f3e', seed: 5 + p.i });
      g.restore();
    }
    function wind(g) {   /* a gust coming up the hill */
      const k = G.gust, a = Math.sin(k * Math.PI) * 0.55;
      g.save(); g.globalAlpha *= a; g.strokeStyle = '#fbf6ec'; g.lineWidth = 3; g.lineCap = 'round';
      for (let i = 0; i < 6; i++) {
        const x = -fx * (900 - (1 - k) * 2000) + i * 70 * -fx, y = 240 + i * 62 + Math.sin(i * 2.3) * 20, L2 = 150 + (i % 3) * 40;
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + fx * L2 * 0.5, y - 14, x + fx * L2, y + 4); g.stroke();
      }
      g.restore();
    }
    G.draw = function (g, t) {
      if (G.a < 0.005) return;
      const z = zoom();
      g.save(); g.globalAlpha = G.a;
      if (o.stake != null) stake(g, z);
      if (BEAM) beam(g, z, t);
      rope(g, z);
      if (!G.done) act().forEach((p) => cue(g, p, t));
      ppl.forEach((p) => speech(g, p));
      if (G.gust > 0.01) wind(g);
      if (G.word > 0.01) P.text(g, '영차!', 0, 190 - (1 - G.word) * 16, { size: 120 * (1 + 0.12 * Math.max(0, G.word - 0.8) * 5), color: '#ffd98a', alpha: G.a * T.clamp(G.word * 2.2), seed: 7, glow: 'rgba(14,20,32,0.7)' });
      for (let i = 0; i < N; i++) {   /* how far up: a dot a notch */
        const x = -((N - 1) * 34) / 2 + i * 34, f = T.clamp(G.peg * N - i);
        P.fill(g, P.circle(x, 262, 10), 'rgba(38,30,54,0.3)'); P.fill(g, P.circle(x, 262, 8), 'rgba(243,234,216,0.45)');
        if (f > 0.02) { g.save(); g.globalAlpha *= f; P.fill(g, P.circle(x, 262, 9 * (1 + 0.4 * (G.pops[i] || 0))), '#ffd98a'); g.restore(); }
      }
      /* left alone a while: a ring round the one they are waiting for, or (all set) on the rope */
      const hint = G.phase === 'go' && G.idle > 8;
      if (hint) {
        if (G.set) { const q = ropeMid(); P.beacon(g, q[0], q[1], 46, t, G.a, '#fff0c8'); }
        else { const w = waitingFor(), c = w && cueAt(w); if (c) P.beacon(g, c[0], c[1], 34, t, G.a, '#fff0c8'); }
      }
      g.restore();
      G.caption(g, G.phase === 'take' ? '한 줄로 서서 다 같이 줄을 잡아요' : G.phase === 'join' ? '마지막 한 번은, 다 같이' : hint ? '머리 위 동그라미가 모두 환해지면, 그때 눌러요 · 스페이스 / 엔터' : '모두 몸을 젖히고 숨을 모으면, 그때 눌러요 · 스페이스 / 엔터');
    };
    return G;
  };

  /* ---------- Bean finds it, from Pipi's clues ----------
     o: { bean, walk (X.walk), spots: [{ x, name }], finds: [{ at, clue, thing }] }. The tufts are in the grass around
     the plot; each clue points at one of them, plainly at first, then by what is near it, then by what it is not. */
  Z.sniff = function (o) {
    const G = make({ r: 0, busy: false, dig: 0, near: 9, got: [], tried: {} });
    const spots = o.spots, bean = o.bean;
    const spotScr = (i) => { const x = spots[i].x; return scr(x, W().groundAt(x) - 14); };
    function go(i) {
      G.busy = true; G.say = '';
      bean.sit = 0;
      o.walk(bean, spots[i].x + 10, 230).then(() => {
        const want = o.finds[G.r].at, d = Math.abs(i - want);
        G.near = d; G.busy = false;
        if (d === 0) { G.dig = 1.6; bean.headTilt = 0.5; T.audio.sfx('step'); T.audio.sfx('join'); return; }
        (G.tried[G.r] = G.tried[G.r] || []).push(i);
        bean.sit = 1; T.audio.sfx('bubble', 1 - d / 6);
        G.say = d === 1 ? '꼬리가 세차게 흔들려요. 바로 옆이에요' : d === 2 ? '꼬리가 살랑거려요. 멀지 않아요' : '빈이 고개를 갸웃해요. 여긴 아니에요';
      });
    }
    G.hit = (x, y) => { let best = -1, bd = 60 * zoom(); spots.forEach((s, i) => { const q = spotScr(i), d = Math.hypot(x - q[0], y - q[1] + 10); if (d < bd) { bd = d; best = i; } }); return best; };
    G.tap = function (n) { if (G.busy || G.dig > 0 || n < 0 || n >= spots.length) return; G.idle = 0; go(n); };
    const up = G.update;
    G.update = function (dt) {
      up(dt);
      bean.wagRate = G.dig > 0 ? 22 : G.near === 1 ? 20 : G.near === 2 ? 11 : 7;
      bean.wag = G.near >= 3 && G.near < 9 ? 0.3 : 1;
      if (G.dig > 0) {
        G.dig -= dt; bean.jump = Math.abs(Math.sin(T.time * 22)) * 3;
        if (G.dig <= 0) { bean.jump = 0; bean.headTilt = 0; G.got.push(G.r); G.r++; G.near = 9; T.audio.promise(); if (G.r >= o.finds.length) G.finish(1.4); }
      }
    };
    G.next = () => (G.done || G.busy || G.dig > 0 ? null : String(o.finds[G.r].at + 1));
    G.hintAt = () => (G.done || G.dig > 0 ? null : spotScr(o.finds[G.r].at));
    G.draw = function (g, t) {
      if (G.a < 0.005) return;
      const z = zoom();
      g.save(); g.globalAlpha = G.a;
      spots.forEach((s, i) => {
        const q = spotScr(i), tried = (G.tried[G.r] || []).includes(i);
        g.strokeStyle = tried ? 'rgba(90,120,80,0.6)' : '#3f6b4a'; g.lineCap = 'round'; g.lineWidth = 4 * z;
        for (let b = 0; b < 7; b++) { const bx = q[0] + (b - 3) * 8 * z, h = (34 + T.noise(i * 3 + b, 2) * 14) * z, sw = Math.sin(t * 1.6 + i + b) * 4 * z; g.beginPath(); g.moveTo(bx, q[1] + 14 * z); g.quadraticCurveTo(bx + sw * 0.4, q[1] - h * 0.5, bx + sw, q[1] - h); g.stroke(); }
        P.text(g, String(i + 1), q[0], q[1] + 34 * z, { font: 'serif', size: 16, color: '#fff6e4', alpha: 0.7, glow: 'rgba(14,20,32,0.9)' });
      });
      if (G.dig > 0.02 && G.dig < 1.4) { const q = spotScr(o.finds[G.r].at); for (let i = 0; i < 5; i++) { const life = (t * 3 + i * 0.2) % 1; P.fill(g, P.circle(q[0] - (20 + life * 40) * z, q[1] - Math.sin(life * Math.PI) * 36 * z, 4 * z), '#8a6442'); } }
      /* Pipi's clue, and what has been found */
      const f = o.finds[Math.min(G.r, o.finds.length - 1)];
      if (!G.done) {
        P.fill(g, P.rr(-430, 112, 860, 92, 16), 'rgba(251,244,226,0.94)');
        P.text(g, T.tr('피피의 힌트') + ' ' + (G.r + 1) + '/' + o.finds.length + ' · ' + T.tr(f.thing), 0, 140, { font: 'serif', size: 20, color: '#8a5a50' });
        P.text(g, f.clue, 0, 180, { font: 'serif', size: 26, color: '#33405c' });
      }
      g.restore();
      G.hintRing(g, t);
      G.caption(g, '힌트에 맞는 풀숲을 눌러 빈을 보내세요. 가까울수록 꼬리를 세게 흔들어요');
    };
    return G;
  };

  /* everyone on the rope (Z.heave, above) gets the same help as every puzzle, through the frame; this is its
     line for the second step, kept out here so the rope itself can change freely */
  const heave0 = Z.heave;
  Z.heave = function (o) { const G = heave0(o); if (G.tip == null) G.tip = '머리 위 동그라미가 모두 환해지면, 그때 눌러요'; return G; };
})();

/* ---------- cooking her stew, at his own stove on the hill ----------
   Drawn where the stove stands in the town (o.at: () => screen [x, y, scale]), not on a screen of its own.
   o.steps: the recipe, in order (ingredient keys); o.heat: true when the heat must be turned down once the
   tomatoes are in and the pot left to simmer; o.herb: an ingredient that only goes in at the very end. */
(function () {
  'use strict';
  const T = window.TYT, P = T.P, Z = T.puzzle, make = Z.make;
  const ING = {
    potato: ['감자', '#d9b56a'], carrot: ['당근', '#e07a3c'], onion: ['양파', '#e9d2a8'], tomato: ['토마토', '#c9473a'],
    salt: ['소금', '#f4f1ea'], herb: ['처음 보는 풀', '#6fa35c'], bread: ['빵', '#c98a4b'],
  };
  Z.cook = function (o) {
    const keys = o.pantry || ['potato', 'carrot', 'onion', 'tomato', 'salt'];
    const G = make({ i: 0, heat: 2, simmer: 0, bub: 0, pot: [], need: o.steps.slice(), stirred: 0 });
    /* once the tomatoes are in (with o.heat) the fire must come down to low and the pot simmer before anything else */
    const waiting = () => o.heat && G.pot.includes('tomato') && G.simmer < 1 && G.i < G.need.length;
    const geo = () => { const a = o.at(); const s = a[2]; return { x: a[0], y: a[1], s, jar: (n) => [a[0] - 250 * s + n * (500 * s / Math.max(1, keys.length - 1)), a[1] + 120 * s], fire: [a[0] + 170 * s, a[1] + 40 * s] }; };
    G.keyOf = (key) => { if (key === 'ArrowDown' || key === '0') return 99; const n = +key - 1; return n >= 0 && n < keys.length ? n : -1; };
    G.hit = (x, y) => { const q = geo(); if (Math.hypot(x - q.fire[0], y - q.fire[1]) < 56 * q.s) return 99; for (let n = 0; n < keys.length; n++) { const j = q.jar(n); if (Math.hypot(x - j[0], y - j[1]) < 52 * q.s) return n; } return -1; };
    G.tap = function (n) {
      G.idle = 0;
      if (n === 99) {   /* the fire: high, then low */
        if (!o.heat) return;
        G.heat = G.heat === 2 ? 1 : 2; T.audio.sfx('step'); G.say = G.heat === 1 ? '불을 약하게 줄였어요' : '불을 세게 올렸어요'; return;
      }
      if (G.i >= G.need.length) return;
      const k = keys[n];
      if (waiting()) { G.wrong(G.heat === 2 ? '공책에 “불은 약하게, 오래오래”라고 적혀 있어요. 불부터 줄여요' : '아직이에요. 약한 불에서 뭉근히 끓도록 조금 기다려요'); return; }
      if (k !== G.need[G.i]) { G.wrong(o.herb && k === o.herb && G.i < G.need.length - 1 ? '그 풀은 맨 마지막이에요. 아나가 불을 끄기 직전에 넣었어요' : '아나는 그걸 이때 넣지 않았어요. 공책의 차례를 봐요'); return; }
      G.say = ''; G.pot.push(k); G.i++; G.bub = 1; T.audio.sfx('bubble', n / keys.length); T.audio.step(G.i * 2, { voice: 'pluck', vel: 0.34 });
      if (G.i >= G.need.length) { T.audio.promise(); G.finish(1.6); }
    };
    const up = G.update;
    G.update = function (dt) {
      up(dt);
      G.bub = Math.max(0, G.bub - dt * 1.2);
      if (o.heat && G.pot.includes('tomato') && G.simmer < 1) G.simmer = Math.min(1, G.simmer + dt * (G.heat === 1 ? 0.28 : 0));
    };
    G.next = () => { if (G.done || G.i >= G.need.length) return null; if (waiting()) return G.heat === 2 ? 'ArrowDown' : null; return String(keys.indexOf(G.need[G.i]) + 1); };
    G.hintAt = () => { const q = geo(); if (waiting()) return G.heat === 2 ? q.fire : null; return G.i < G.need.length ? q.jar(keys.indexOf(G.need[G.i])) : null; };
    G.draw = function (g, t) {
      if (G.a < 0.005) return;
      const q = geo(), s = q.s;
      g.save(); g.globalAlpha = G.a;
      /* the stove on the grass: stones, a fire, the pot */
      [-30, 0, 30].forEach((dx, k) => P.fill(g, P.ellipse(q.fire[0] + dx * s, q.fire[1] + 22 * s, 16 * s, 10 * s), k === 1 ? '#6f6a66' : '#807a74'));
      const fl = G.heat === 2 ? 1 : 0.45;
      for (let k = 0; k < 5; k++) { const ph = t * 9 + k * 1.7; P.fill(g, P.ellipse(q.fire[0] + (k - 2) * 9 * s, q.fire[1] + (6 - Math.abs(Math.sin(ph)) * 18 * fl) * s, 7 * s, (12 + 14 * fl * Math.abs(Math.sin(ph))) * s), k % 2 ? '#ffb45a' : '#ff7a3a'); }
      P.glow(g, q.fire[0], q.fire[1], 70 * s, '#ffb45a', 0.4 + 0.3 * fl);
      P.fill(g, P.rr(q.fire[0] - 50 * s, q.fire[1] - 52 * s, 100 * s, 50 * s, 12 * s), '#2d6672');
      const fillC = G.pot.length ? T.mix('#e9d2a8', '#c9573f', Math.min(1, G.pot.filter((k) => k === 'tomato' || k === 'carrot').length / 2)) : '#7fa3b0';
      P.fill(g, P.ellipse(q.fire[0], q.fire[1] - 52 * s, 50 * s, 10 * s), fillC);
      if (G.pot.includes('herb')) { P.fill(g, P.circle(q.fire[0] - 12 * s, q.fire[1] - 53 * s, 4 * s), '#6fa35c'); P.fill(g, P.circle(q.fire[0] + 10 * s, q.fire[1] - 51 * s, 4 * s), '#6fa35c'); }
      const steam = 0.2 + G.bub * 0.5 + (o.heat && G.pot.includes('tomato') ? G.simmer * 0.3 : 0);
      for (let k = 0; k < 4; k++) { const life = (t * 0.4 + k / 4) % 1; P.glow(g, q.fire[0] + Math.sin(t + k * 2) * 12 * s, q.fire[1] - (70 + life * 90) * s, (14 + life * 20) * s, '#fff3dc', Math.sin(life * Math.PI) * steam); }
      if (o.heat && G.pot.includes('tomato') && G.simmer < 1) {   /* how long it has simmered */
        P.fill(g, P.rr(q.fire[0] - 50 * s, q.fire[1] + 44 * s, 100 * s, 8 * s, 4 * s), 'rgba(20,26,44,0.4)');
        P.fill(g, P.rr(q.fire[0] - 50 * s, q.fire[1] + 44 * s, 100 * s * G.simmer, 8 * s, 4 * s), '#ffcf8a');
      }
      /* the jars and baskets, each with what is in it */
      keys.forEach((k, n) => {
        const j = q.jar(n), used = G.pot.includes(k) && k !== 'salt', c = ING[k][1];
        g.save(); g.globalAlpha = G.a * (used ? 0.35 : 1);
        P.fill(g, P.rr(j[0] - 34 * s, j[1] - 26 * s, 68 * s, 46 * s, 10 * s), '#a57d58');
        for (let m = 0; m < 3; m++) P.fill(g, P.circle(j[0] + (m - 1) * 16 * s, j[1] - 26 * s - (m % 2) * 6 * s, 11 * s), c);
        P.text(g, ING[k][0], j[0], j[1] + 44 * s, { font: 'serif', size: 20 * Math.max(0.8, s), color: '#fff6e4', glow: 'rgba(14,20,32,0.9)' });
        P.text(g, String(n + 1), j[0] - 30 * s, j[1] - 40 * s, { font: 'serif', size: 15, color: '#fff6e4', alpha: 0.6, glow: 'rgba(14,20,32,0.9)' });
        g.restore();
      });
      /* her recipe, as he has written it down, with what is done struck through */
      const rx = q.x - 470 * s, ry = q.y - 200 * s;
      P.fill(g, P.rr(rx - 120 * s, ry - 30 * s, 240 * s, (60 + G.need.length * 34) * s, 10 * s), 'rgba(251,244,226,0.95)');
      P.text(g, '아나표 스튜', rx, ry, { size: 34 * Math.max(0.85, s), color: '#b54a36', seed: 3 });
      G.need.forEach((k, n) => {
        const y = ry + (40 + n * 34) * s, done = n < G.i;
        P.text(g, (n + 1) + '. ' + (o.labels && o.labels[n] ? o.labels[n] : ING[k][0]), rx, y, { size: 26 * Math.max(0.85, s), color: done ? '#9a8f86' : '#33405c', seed: 5 + n });
        if (done) P.line(g, rx - 80 * s, y - 4, rx + 80 * s, y - 2, 2, '#c9573f');
      });
      g.restore();
      G.hintRing(g, t);
      G.caption(g, o.caption || '공책에 적은 차례대로 재료를 눌러 넣으세요');
    };
    return G;
  };
})();

/* ---------- bending a plank for Bram's boat, and knitting Rosa's blanket from memory ---------- */
(function () {
  'use strict';
  const T = window.TYT, P = T.P, Z = T.puzzle, make = Z.make;

  /* Steam a plank until it will bend: tap to start the steam, tap again to lift it out while the heat is in the
     right band. Too soon and it springs back; too long and it cracks. The band narrows plank by plank.
     o: { at: () => screen [x, y, scale], bands: [[lo, hi, speed], …] } */
  Z.steam = function (o) {
    const G = make({ i: 0, heat: 0, on: false, bend: 0, crack: 0 });
    const band = () => o.bands[Math.min(G.i, o.bands.length - 1)];
    G.keyOf = (key) => (key === ' ' || key === 'Enter' || key === '1' ? 0 : -1);
    G.hit = () => 0;
    G.tap = function () {
      if (G.done || G.bend > 0) return;
      G.idle = 0;
      if (!G.on) { G.on = true; G.heat = 0; G.say = ''; T.audio.sfx('whoosh'); return; }
      G.on = false;
      const b = band();
      if (G.heat < b[0]) { G.wrong('아직 덜 쪘어요. 판자가 도로 튕겨 나와요'); G.heat = 0; return; }
      if (G.heat > b[1]) { G.wrong('너무 오래 쪘어요. 판자에 금이 갔어요'); G.crack = 1; G.heat = 0; return; }
      G.say = ''; T.audio.sfx('knock', 0.5); T.audio.step(G.i * 2 + 1, { voice: 'box', vel: 0.4 });
      G.clock.tween(G, 'bend', 1, 0.9, T.ease.out).then(() => { G.bend = 0; G.heat = 0; G.i++; if (G.i >= o.bands.length) { T.audio.promise(); G.finish(1.2); } });
    };
    const up = G.update;
    G.update = function (dt) {
      up(dt);
      if (G.on) { G.heat += dt * band()[2]; if (G.heat > 1.05) { G.on = false; G.wrong('너무 오래 쪘어요. 판자에 금이 갔어요'); G.crack = 1; G.heat = 0; } }
      G.crack = Math.max(0, G.crack - dt * 1.5);
    };
    G.next = () => { if (G.done || G.bend > 0) return null; if (!G.on) return '1'; const b = band(); return G.heat > b[0] + 0.02 && G.heat < b[1] - 0.02 ? '1' : null; };
    G.hintAt = () => { const a = o.at(); return [a[0], a[1] - 60 * a[2]]; };
    G.keys = 'act';
    G.tip = '눌러서 김을 쬐고, 노란 눈금이 초록 칸에 들면 또 눌러요';
    /* skipped: every plank comes out of the steam at the right moment, and is laid round the ribs */
    G.solve = function () { G.on = false; G.heat = 0; G.bend = 0; G.crack = 0; G.i = o.bands.length; T.audio.sfx('knock', 0.5); T.audio.promise(); G.finish(1.2); };
    G.draw = function (g, t) {
      if (G.a < 0.005) return;
      const a = o.at(), s = a[2], x = a[0], y = a[1];
      g.save(); g.globalAlpha = G.a; g.translate(x, y); g.scale(s, s);
      /* the steam box over a fire, and the hull's ribs beyond it */
      for (let k = 0; k < 5; k++) { const ph = t * 9 + k; P.fill(g, P.ellipse(-320 + (k - 2) * 10, 30 - Math.abs(Math.sin(ph)) * 14, 7, 12 + 8 * Math.abs(Math.sin(ph))), k % 2 ? '#ffb45a' : '#ff7a3a'); }
      P.fill(g, P.rr(-400, -10, 160, 34, 6), '#7a5a3c');
      if (G.on) for (let k = 0; k < 5; k++) { const life = (t * 0.8 + k / 5) % 1; P.glow(g, -390 + k * 30, -20 - life * 70, 14 + life * 18, '#fff3dc', Math.sin(life * Math.PI) * 0.8); }
      g.strokeStyle = '#8a5a3b'; g.lineWidth = 7; g.lineCap = 'round';
      for (let k = 0; k < 5; k++) { const rx = 40 + k * 44; g.beginPath(); g.moveTo(rx, 30); g.quadraticCurveTo(rx - 30, -30, rx + 4, -90); g.stroke(); }
      for (let k = 0; k < G.i; k++) { g.beginPath(); g.moveTo(20, -76 + k * 22); g.quadraticCurveTo(130, -36 + k * 18, 240, -76 + k * 22); g.stroke(); }
      /* the plank: straight in the box, then laid round the ribs */
      const bk = T.ease.io(G.bend), py = -76 + G.i * 22;
      g.strokeStyle = G.crack > 0.05 ? '#5a3d28' : T.mix('#d9b384', '#b07a4a', T.clamp(G.heat)); g.lineWidth = 9;
      g.beginPath(); g.moveTo(T.lerp(-396, 20, bk), T.lerp(4, py, bk)); g.quadraticCurveTo(T.lerp(-320, 130, bk), T.lerp(4, py + 40, bk), T.lerp(-244, 240, bk), T.lerp(4, py, bk)); g.stroke();
      g.restore();
      /* the heat, and the band where it will bend */
      const b = band();
      P.text(g, '판자를 김에 쬔 정도', 0, 112, { font: 'serif', size: 22, color: '#f3ead8', alpha: 0.85 * G.a, glow: 'rgba(8,12,22,0.8)' });
      P.fill(g, P.rr(-200, 132, 400, 22, 11), 'rgba(20,26,44,0.45)');
      P.fill(g, P.rr(-200 + 400 * b[0], 130, 400 * (b[1] - b[0]), 26, 6), 'rgba(159,207,134,0.85)');
      P.fill(g, P.rr(-200, 136, 400 * T.clamp(G.heat), 14, 7), '#ffcf8a');
      for (let k = 0; k < o.bands.length; k++) P.fill(g, P.circle(-((o.bands.length - 1) * 28) / 2 + k * 28, 186, 8), k < G.i ? '#ffd98a' : 'rgba(243,234,216,0.4)');
      G.hintRing(g, t);
      G.caption(g, G.on ? '노란 눈금이 초록 칸에 들면 눌러서 판자를 꺼내세요' : '눌러서 판자를 김에 쬐기 시작하세요');
    };
    return G;
  };

  /* Knit the stripes of the old blanket from memory: the pattern shows, then is put away, and the rows are knitted
     a colour at a time. A wrong colour unravels the row and the pattern shows again, briefly.
     o: { at: () => screen [x, y, scale], rounds: [[colour index, …], …], show: seconds (or one per round: [4, 3]),
          wrong: the line when a colour is wrong (a voice of its own, if it likes), reshow: seconds it shows again then,
          peek(g, round, t): draw what is shown instead of the paper card, in the puzzle's own frame (the card was
          the box -260..-90, -260..-60) } */
  const YARN = ['#e9c45a', '#c9573f', '#7fb0c9', '#f6efe0'];
  Z.knit = function (o) {
    const G = make({ r: 0, i: 0, phase: 'show', peek: 0, rows: [] });
    const seq = () => o.rounds[Math.min(G.r, o.rounds.length - 1)];
    async function show(sec) { G.phase = 'show'; G.peek = 1; await G.clock.wait(sec); G.clock.tween(G, 'peek', 0, 0.6); G.phase = 'knit'; G.idle = 0; }
    const showFor = (r) => (Array.isArray(o.show) ? o.show[Math.min(r, o.show.length - 1)] : o.show || 3);
    G.start = () => show(showFor(0));
    const ball = (n) => { const a = o.at(), s = a[2]; return [a[0] + (n - 1.5) * 110 * s, a[1] + 150 * s]; };
    G.hit = (x, y) => { let best = -1, bd = Math.max(54, 50 * o.at()[2]); for (let n = 0; n < 4; n++) { const q = ball(n), d = Math.hypot(x - q[0], y - q[1]); if (d < bd) { bd = d; best = n; } } return best; };
    G.tap = function (n) {
      if (G.phase !== 'knit' || n > 3) return;
      G.idle = 0;
      if (n !== seq()[G.i]) { G.wrong(o.wrong || '그 줄이 아니에요. 한 번 더 보여 줄게요'); G.rows = []; G.i = 0; show(o.reshow || 1.6); return; }
      G.say = ''; G.rows.push(n); G.i++; T.audio.sfx('crayon'); T.audio.step(G.i + G.r * 4, { voice: 'felt', vel: 0.34 });
      if (G.i >= seq().length) {
        G.phase = 'pause'; G.r++;
        G.clock.wait(1.1).then(() => { if (G.r >= o.rounds.length) { T.audio.promise(); G.finish(1.2); } else { G.rows = []; G.i = 0; show(showFor(G.r)); } });
      }
    };
    G.next = () => (G.phase === 'knit' && !G.done ? String(seq()[G.i] + 1) : null);
    G.hintAt = () => { if (G.phase !== 'knit') return null; const a = o.at(), s = a[2]; return [a[0] + (seq()[G.i] - 1.5) * 110 * s, a[1] + 150 * s]; };
    G.keys = () => (G.phase === 'knit' ? 'pick' : null);
    G.tip = '보여 준 줄무늬 차례대로 실타래를 눌러요'; G.hintR = 54;
    G.spots = () => (G.phase !== 'knit' ? [] : [0, 1, 2, 3].map((n) => { const q = ball(n); return [n, q[0], q[1], 40 * o.at()[2]]; }));
    /* skipped: the last stripes are knitted from memory, as they were */
    G.solve = function () { G.r = o.rounds.length; G.rows = seq().slice(); G.i = G.rows.length; G.phase = 'pause'; G.peek = 0; T.audio.sfx('crayon'); T.audio.promise(); G.finish(1.2); };
    G.draw = function (g, t) {
      if (G.a < 0.005) return;
      const a = o.at(), s = a[2], sq = seq();
      g.save(); g.globalAlpha = G.a; g.translate(a[0], a[1]); g.scale(s, s);
      /* the old blanket, held up for a moment */
      if (G.peek > 0.01 && o.peek) { g.save(); g.globalAlpha = G.a * G.peek; o.peek(g, Math.min(G.r, o.rounds.length - 1), t); g.restore(); }
      else if (G.peek > 0.01) { g.save(); g.globalAlpha = G.a * G.peek; P.fill(g, P.rr(-260, -260, 170, 200, 10), '#fbf4e2'); sq.forEach((c, i) => P.fill(g, P.rr(-250, -250 + i * (180 / sq.length), 150, 180 / sq.length - 4, 4), YARN[c])); P.text(g, '그 애의 담요', -175, -36, { font: 'serif', size: 20, color: '#33405c' }); g.restore(); }
      /* the new one, on the needles */
      P.fill(g, P.rr(-60, -260, 200, 200, 10), 'rgba(251,244,226,0.25)');
      G.rows.forEach((c, i) => P.fill(g, P.rr(-50, -250 + i * (180 / sq.length), 180, 180 / sq.length - 4, 4), YARN[c]));
      P.line(g, -70, -262, 150, -262, 4, '#c9c3ba'); P.line(g, -64, -270, 148, -254, 3, '#c9c3ba');
      /* the yarn */
      for (let n = 0; n < 4; n++) { const x = (n - 1.5) * 110, on = G.hintAt && G.idle > 9 && G.phase === 'knit' && sq[G.i] === n; P.fill(g, P.circle(x, 150, 34), YARN[n]); g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 2; for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(x, 150, 30 - k * 8, 12 + k * 4, 0.6, 0, Math.PI * 2); g.stroke(); } P.text(g, String(n + 1), x, 205, { font: 'serif', size: 16, color: '#fff6e4', alpha: 0.7, glow: 'rgba(14,20,32,0.9)' }); void on; }
      g.restore();
      for (let k = 0; k < o.rounds.length; k++) P.fill(g, P.circle(-((o.rounds.length - 1) * 28) / 2 + k * 28, 120, 8), k < G.r ? '#ffd98a' : 'rgba(243,234,216,0.4)');
      G.hintRing(g, t);
      G.caption(g, G.phase === 'show' ? '옛 담요의 줄무늬를 잘 봐 두세요' : '기억한 차례대로 실을 눌러 한 줄씩 뜨세요');
    };
    return G;
  };
})();
