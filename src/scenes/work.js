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

  /* ---------- everyone on the rope ----------
     What is going up (the frame after the storm, the ridge beam) has a rope to each side, and the crew split between
     them. Someone calls the count, 하나, 둘, 셋!, and a pull only takes when every hand is on it, on 셋, and only if what
     they are raising stands straight. It sways as it comes up, and once it leans it goes on leaning, dragging the
     team on the far side toward it: that side must haul it back (← or →, or tap that side), and too hard a haul sends
     it over the other way. Pulled crooked it only lurches; pulled out of time it sags back a little; let it lean too
     far and it sinks back down. The count can quicken, wait a beat, or (an old joke) tease with 「둘 반」. After a few
     misses the count slows and everyone holds on harder.
     o: { crew: [actors], top(k) -> world [x, y]: the middle of its top at height k (0..1), raise(k, sh): show it at
          height k, leaning sh (top over foot, + to the right), at: world x of its middle, cam(x, y, z, k): to frame
          both teams, beam: length (a beam the puzzle draws itself, tilting; otherwise the scene draws a frame),
          span: half the gap between the ropes' ends, pulls, sway (how unsteady), tempo (seconds a beat),
          quick (the beat shortens by this after each good pull), tricks (0..1: how often the count waits or teases),
          tease (「둘 반」 allowed), gust (0..1: a lurch of its own now and then) } */
  Z.heave = function (o) {
    const N = o.pulls || 3, SW = o.sway == null ? 0.6 : o.sway, BEAM = o.beam || 0, crew = o.crew, rnd = T.rng(o.seed || 17);
    const G = make({ pulls: N, h: 0, k: 0, L: 0, corr: 0, phase: 'gather', wait: 0.9, cyc: [], bi: 0, ct: 0, n: 0, beat: o.tempo || 0.62, pulled: false,
      yank: 0, cool: 0, fails: 0, dry: 0, assist: 0, said: 0, since3: Infinity });
    const PRE = 0.12, SH = 0.36, gAt = (x) => W().groundAt(x);
    const teams = [{ dir: 1, m: [], heave: 0, give: 0, drag: 0, slip: 0 }, { dir: -1, m: [], heave: 0, give: 0, drag: 0, slip: 0 }];
    let at = o.at;
    const slow = () => [1, 1.15, 1.3][G.assist], steady = () => [1, 0.6, 0.3][G.assist], straight = () => [0.4, 0.5, 0.62][G.assist];
    const itemLen = (it) => (it.rest ? (G.pulled ? 1.6 : 1) : it.d) * G.beat * slow();   /* a breath after a good pull */
    const post = () => T.clamp(0.85 * G.beat, 0.45, 0.55) + 0.12 * G.assist;   /* long enough to hear 셋 and answer it */
    const cur = () => G.cyc[G.bi];
    const inWindow = () => {   /* from just before 셋 until a moment after it, even into the breath that follows */
      const c = cur(); if (!c || G.pulled) return false;
      if (G.since3 <= post()) return true;
      const nx = G.cyc[G.bi + 1];
      return !!(nx && nx.three && itemLen(c) - G.ct <= PRE);
    };
    const lean = () => G.L + G.corr;   /* where it is heading, with the last haul still going into it */
    /* the rope's two ends on what is going up, at its height k */
    const ends = (k) => {
      const c = o.top(k);
      if (BEAM) { const th = -G.L * 0.2, h = BEAM / 2 - 12; return [[c[0] - Math.cos(th) * h, c[1] - Math.sin(th) * h], [c[0] + Math.cos(th) * h, c[1] + Math.sin(th) * h], c, th]; }
      const sp = o.span || 110, sh = G.L * SH, foot = gAt(c[0]), dx = sh * (foot - c[1]);
      return [[c[0] - sp + dx, c[1]], [c[0] + sp + dx, c[1]], c, sh];
    };

    /* a puller: braced, leaning back into the rope, hands on it at the waist; dragged in when the load leans away */
    const posePull = (tm, rank) => (oo, aa, t) => {
      if (aa.go) return;
      const dir = tm.dir, u = (aa.s / 150) * (aa.style && aa.style.kid ? 0.62 : 1);
      const pull = Math.max(tm.heave, G.yank * 0.85), drag = Math.max(tm.drag, tm.give * 0.4, tm.slip), wob = Math.sin(t * 1.9 + aa.x * 0.07);
      const sx = aa.x + dir * (drag * 9 + tm.slip * 6) * u;
      oo.flip = dir < 0;
      oo.x = sx - dir * (7 + pull * 7 - drag * 6) * u;
      oo.y += (3 + pull * 4 - drag * 2) * u;
      oo.lean = -0.3 - pull * 0.16 + drag * 0.27 + wob * 0.015;
      const gF = sx + dir * 13 * u, gB = sx - dir * 9 * u, fF = F.local(oo, gF, gAt(gF)), fB = F.local(oo, gB, gAt(gB));
      oo.legF = { foot: [fF[0], fF[1] - 2.8] }; oo.legB = { foot: [fB[0], fB[1] - 2.8] };
      const hy = oo.y - (26 + (rank === 0 ? 6 : 0) - pull * 3) * u, hx = oo.x + dir * (21 + drag * 8 - pull * 4) * u;
      oo.armF = { hand: F.local(oo, hx + dir * 6 * u, hy - 2 * u) }; oo.armB = { hand: F.local(oo, hx - dir * 3 * u, hy + 2 * u) };
      const strain = pull > 0.45 || drag > 0.55;
      oo.face = Object.assign({}, oo.face, { eye: strain ? 'closed' : 'open', mouth: strain ? 'open' : 'line', blush: 0.2 + 0.3 * Math.max(pull, drag) });
      oo.headTilt = -0.05 - pull * 0.08 + drag * 0.12;
    };
    G.start = function () {
      if (at == null) at = o.top(0)[0];
      const near = crew.slice().sort((a, b) => Math.abs(a.x - at) - Math.abs(b.x - at));
      const L0 = near.filter((a) => a.x < at), R0 = near.filter((a) => a.x >= at);
      let left = L0, right = R0;
      if (!L0.length || !R0.length) {   /* all on one side: the nearer half takes the rope round to the other */
        const half = Math.ceil(near.length / 2), one = R0.length ? -1 : 1;
        const go = near.slice(0, half), stay = near.slice(half);
        if (one < 0) { left = go; right = stay; } else { right = go; left = stay; }
      }
      const D0 = o.reach || 205, GAP = o.gap || 60;
      [[left, 0], [right, 1]].forEach(([list, ti]) => {
        const tm = teams[ti];
        tm.m = list;
        list.forEach((a, j) => {
          const x = at - tm.dir * (D0 + j * GAP), d = Math.abs(x - a.x);
          a.sit = 0; a.moving = false; a.pose = posePull(tm, j);
          if (d > 2) a.go = { x, v: T.clamp(d / 2.4, 80, 240), res: () => { a.flip = tm.dir < 0; } };
          else { a.go = null; a.x = x; a.flip = tm.dir < 0; }
        });
      });
      if (o.cam) { const far = D0 + GAP * (Math.max(left.length, right.length) - 1) + 120; o.cam(at, gAt(at) - 150, T.clamp((T.view.W / 2 - 30) / far, 0.72, 1.02), 1.2); }
      o.raise(0, 0);
      T.announce('다 같이 당기기. 셋에 맞춰 위 방향키나 가운데를 눌러 다 함께 당긴다. 기울면 끌려가는 쪽 줄을 왼쪽, 오른쪽 방향키나 그쪽을 눌러 당겨 바로 세운다.');
    };

    /* ---------- the count ---------- */
    function cycle() {
      G.bi = 0; G.ct = 0; G.pulled = false; G.since3 = Infinity; G.n++;
      const rest = { w: '', rest: true };
      let kind = 'base';
      if (G.n > 1 && G.assist === 0 && rnd() < (o.tricks || 0)) kind = o.tease && rnd() < 0.5 ? 'tease' : 'hold';
      if (kind === G.prevKind && kind !== 'base') kind = 'base';   /* never the same trick twice running */
      G.prevKind = kind;
      const one = { w: '하나', d: 1, m: 57 }, two = { w: '둘', d: 1, m: 57 }, three = { w: '셋!', d: 1, m: 64, three: true };
      G.cyc = kind === 'tease' ? [one, two, { w: '둘 반', d: 1, m: 58, tease: true }, three, rest] : kind === 'hold' ? [one, two, { w: '', d: 1.1, hold: true }, three, rest] : [one, two, three, rest];
      if (o.gust && G.n > 1 && G.h > 0.05 && rnd() < o.gust) { G.L += (rnd() < 0.5 ? -1 : 1) * 0.22 * SW; T.audio.sfx('creak'); }
      enter();
    }
    function enter() { const c = cur(); if (c && c.three) G.since3 = 0; if (c && c.m) T.audio.note({ m: c.m, vel: c.three ? 0.3 : 0.2, voice: 'pluck', dur: 0.4 }); }
    function sag(f) { G.h = Math.max(0, G.h - f / N); T.audio.sfx('creak'); }
    function stepCount(dt) {
      G.ct += dt; G.since3 += dt;
      while (cur() && G.ct >= itemLen(cur())) {
        G.ct -= itemLen(cur());
        G.bi++;
        if (G.bi >= G.cyc.length) {
          if (!G.pulled && ++G.dry >= 3 && G.assist < 2) { G.assist++; G.dry = 0; G.wrong('천천히 해요. 구령을 늦추고, 다들 꽉 붙잡았어요'); }   /* 셋 went by with no pull */
          cycle(); return;
        }
        enter();
      }
    }

    /* ---------- the moves ---------- */
    G.keyOf = (key) => (key === 'ArrowLeft' || key === 'a' || key === 'A' || key === '1' ? 0 : key === 'ArrowRight' || key === 'd' || key === 'D' || key === '3' ? 2 : key === 'ArrowUp' || key === ' ' || key === 'Enter' || key === 'w' || key === 'W' || key === '2' ? 1 : -1);
    const loadX = () => { const e = ends(G.k); return scr(e[2][0], e[2][1])[0]; };
    G.hit = (x, y) => { const lx = loadX(); if ((y < 265 && Math.abs(x) < 400) || Math.abs(x - lx) < 120) return 1; return x < lx ? 0 : 2; };
    G.tap = function (n) {
      if (G.done || G.phase !== 'count') return;
      G.idle = 0;
      if (n !== 1) {   /* one side hauls, the other gives a little */
        const tm = teams[n === 0 ? 0 : 1], other = teams[n === 0 ? 1 : 0];
        tm.heave = 1; other.give = 1;
        if (G.h > 0.02) G.corr += n === 0 ? -0.38 : 0.38;
        T.audio.sfx('step'); T.audio.note({ m: n === 0 ? 50 : 52, vel: 0.14, voice: 'pluck', dur: 0.3 });
        return;
      }
      if (G.cool > 0 || G.pulled) return;
      const c = cur();
      if (!inWindow()) {
        G.fails++; G.cool = 0.5; sag(0.3);
        G.wrong(c && c.tease ? '「둘 반」은 셋이 아니에요! 조금 처졌어요' : '혼자서는 꿈쩍도 안 해요. 「셋!」에 다 같이');
        return;
      }
      if (G.h > 0.02 && Math.abs(lean()) > straight()) {   /* crooked: the pull only throws it further over */
        G.fails++; G.cool = 0.4; G.pulled = true;
        G.L += Math.sign(G.L || 1) * 0.15;
        G.wrong(BEAM ? '기운 채로 당기면 더 기울어요. 먼저 수평부터 맞춰요' : '비뚤어진 채로 당기면 기울기만 해요. 먼저 바로 세워요');
        return;
      }
      G.say = ''; G.pulled = true; G.yank = 1; G.fails = 0; G.dry = 0;
      G.h = Math.min(1, G.h + 1 / N);
      teams.forEach((tm) => { tm.heave = Math.max(tm.heave, 0.6); });
      T.audio.sfx('knock', G.h); T.audio.step(Math.round(G.h * N) * 2, { voice: 'box', vel: 0.4 });
      if (G.h >= 0.999) { T.audio.promise(); G.finish(1.6); return; }
      G.beat = Math.max(0.46, G.beat * (o.quick || 1));
      if (G.assist > 0) G.assist--;
      G.L += (rnd() < 0.5 ? -1 : 1) * (0.18 + 0.18 * SW);   /* it comes up with a lurch to one side */
      T.audio.sfx('creak');
    };

    const up = G.update;
    G.update = function (dt) {
      up(dt);
      const t = T.time;
      G.yank = Math.max(0, G.yank - dt * 1.6); G.cool = Math.max(0, G.cool - dt);
      teams.forEach((tm) => { tm.heave = Math.max(0, tm.heave - dt * 2.4); tm.give = Math.max(0, tm.give - dt * 2.4); tm.slip = Math.max(0, tm.slip - dt * 1.5); });
      if (G.phase === 'gather') {
        G.wait -= dt;
        if (G.wait <= 0 && crew.every((a) => !a.go)) { G.phase = 'count'; G.idle = 0; cycle(); }
      } else if (!G.done) stepCount(dt);
      /* the lean: nothing while it lies on the ground; once up, it keeps going the way it leans */
      if (G.done) { G.L *= 1 - Math.min(1, dt * 4); G.corr = 0; }
      else if (G.phase === 'count' && G.h > 0.02) {
        const r = SW * (0.35 + 0.65 * G.h) * steady(), wind = SW * 0.16 * (Math.sin(t * 1.3 + 0.5) + 0.6 * Math.sin(t * 2.9 + 1.7)) * (0.3 + G.h) * steady();
        G.L += (r * G.L + wind) * dt;
        const d = G.corr * Math.min(1, dt * 9); G.L += d; G.corr -= d;
        if (Math.abs(G.L) >= 1) {   /* over too far: it sinks back, and the dragged side stumbles in */
          const s = Math.sign(G.L), tm = teams[s > 0 ? 0 : 1];
          tm.slip = 1; G.fails++; sag(0.5);
          G.L = s * 0.5; G.corr = 0;
          G.wrong(BEAM ? '한쪽이 처져서 도로 내려앉았어요. 처지는 쪽 줄을 당겨요' : '너무 기울어서 도로 내려앉았어요. 끌려가는 쪽 줄을 당겨요');
        }
      } else { G.L = 0; G.corr = 0; }
      if (G.fails >= 3 && G.assist < 2) { G.assist++; G.fails = 0; }
      teams[0].drag = T.clamp((G.L - 0.05) / 0.7); teams[1].drag = T.clamp((-G.L - 0.05) / 0.7);
      /* for those who listen: say which way it goes when it starts to go */
      const side = Math.abs(G.L) > 0.35 ? Math.sign(G.L) : 0;
      if (side && side !== G.said) T.announce(BEAM ? (side > 0 ? '왼쪽이 처진다. 왼쪽 줄을 당긴다.' : '오른쪽이 처진다. 오른쪽 줄을 당긴다.') : side > 0 ? '오른쪽으로 기운다. 왼쪽 줄을 당긴다.' : '왼쪽으로 기운다. 오른쪽 줄을 당긴다.');
      G.said = side;
      G.k += (G.h - G.k) * Math.min(1, dt * (G.h > G.k ? 4 : 2.5));
      o.raise(G.k, BEAM ? 0 : G.L * SH);
      if (G.done && G.a < 0.3 && !G.let) { G.let = true; crew.forEach((a) => { a.pose = null; }); }   /* let go of the rope */
    };
    G.next = () => {
      if (G.done || G.phase !== 'count') return null;
      const Le = lean();
      if (G.cool <= 0 && inWindow() && !(cur() && cur().tease) && (G.h <= 0.02 || Math.abs(Le) <= straight())) return 'ArrowUp';
      if (G.h > 0.02 && Math.abs(Le) > 0.24) return Le > 0 ? 'ArrowLeft' : 'ArrowRight';
      return null;
    };
    const teamSpot = (tm) => {
      const pts = tm.m.map((a) => (a.j && a.j.head ? a.j.head : [a.x, gAt(a.x) - 1.3 * a.s])), x = pts.reduce((s, p) => s + p[0], 0) / Math.max(1, pts.length);
      const y = Math.min(...pts.map((p) => p[1])) - 56;
      return scr(x, y);
    };
    G.hintAt = () => { const k = G.next(); return !k ? null : k === 'ArrowUp' ? [0, 170] : teamSpot(teams[k === 'ArrowLeft' ? 0 : 1]); };

    /* ---------- drawing ---------- */
    function rope(g, tm, end, z) {
      const hands = [];
      tm.m.forEach((a) => { if (a.j && a.j.handF && !a.go) hands.push(scr(a.j.handF[0], a.j.handF[1]), scr(a.j.handB[0], a.j.handB[1])); });
      const e = scr(end[0], end[1]);
      if (!hands.length) return;
      const tense = T.clamp(0.35 + tm.drag * 0.8 + tm.heave * 0.4 + G.yank * 0.4), h0 = hands[0], sagY = (1 - tense) * 26 * z;
      const run = (w, c) => {
        g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round';
        g.beginPath(); g.moveTo(e[0], e[1]); g.quadraticCurveTo((e[0] + h0[0]) / 2, (e[1] + h0[1]) / 2 + sagY, h0[0], h0[1]);
        for (let i = 1; i < hands.length; i++) g.lineTo(hands[i][0], hands[i][1]);
        const lx = hands[hands.length - 1], a = tm.m[tm.m.length - 1], tx = a.x - tm.dir * 40 * (a.s / 150), ty = scr(tx, gAt(tx) - 2);
        g.quadraticCurveTo(lx[0] - tm.dir * 16 * z, lx[1] + 10 * z, ty[0], ty[1]);   /* the end of it, trailing in the grass */
        g.stroke();
      };
      const need = T.clamp((tm.drag - 0.08) / 0.4);
      if (need > 0.02) { g.save(); g.globalAlpha *= need * (0.55 + 0.25 * Math.sin(T.time * 8)); run(11 * z, '#ffd98a'); g.restore(); }
      run(4 * z, '#e6d6b0');
      P.fill(g, P.circle(e[0], e[1], 5 * z), '#cdb88f');   /* tied on */
    }
    function arrow(g, tm, t) {
      if (!tm.m.length) return;
      const q = teamSpot(tm), need = G.phase === 'count' ? T.clamp((tm.drag - 0.08) / 0.4) : 0, k = 1 + 0.1 * need * Math.sin(t * 8);
      const shape = P.poly([[-34, -22], [10, -22], [10, -44], [52, 0], [10, 44], [10, 22], [-34, 22]]);
      g.save(); g.translate(q[0], q[1]); g.scale(-tm.dir * k * 0.6, k * 0.6); g.globalAlpha = G.a * (0.4 + 0.6 * need);
      if (need > 0.05) P.glow(g, 8, 0, 90, '#ffd98a', 0.5 * need, 'source-over');
      g.lineJoin = 'round'; g.lineWidth = 7; g.strokeStyle = 'rgba(40,32,56,0.45)'; g.stroke(shape);   /* readable on a bright sky */
      P.fill(g, shape, need > 0.3 ? '#ffd98a' : '#fff6e4');
      g.restore();
    }
    G.draw = function (g, t) {
      if (G.a < 0.005) return;
      const z = zoom(), e = ends(G.k);
      g.save(); g.globalAlpha = G.a;
      if (G.h > 0.02 && Math.abs(G.L) > 0.12 && !G.done) {   /* where straight is */
        const c = e[2], foot = gAt(c[0]), q0 = BEAM ? scr(c[0] - BEAM / 2 - 30, c[1]) : scr(c[0], foot), q1 = BEAM ? scr(c[0] + BEAM / 2 + 30, c[1]) : scr(c[0], c[1] - 30);
        g.save(); g.globalAlpha *= T.clamp((Math.abs(G.L) - 0.12) * 2) * 0.6; g.strokeStyle = '#fff6e0'; g.lineWidth = 2; g.setLineDash([8, 8]);
        g.beginPath(); g.moveTo(q0[0], q0[1]); g.lineTo(q1[0], q1[1]); g.stroke(); g.restore();
      }
      if (BEAM) {   /* the ridge beam, tipping as it comes up */
        const c = scr(e[2][0], e[2][1]);
        g.save(); g.translate(c[0], c[1]); g.scale(z, z); g.rotate(e[3]);
        P.fill(g, P.rr(-BEAM / 2, -8, BEAM, 16, 6), '#b98a5a'); P.fill(g, P.rr(-BEAM / 2, -8, BEAM, 5, 3), '#d1a676');
        P.fill(g, P.ellipse(-BEAM / 2, 0, 5, 8), '#d9b384'); P.fill(g, P.ellipse(BEAM / 2, 0, 5, 8), '#d9b384');
        g.restore();
      }
      rope(g, teams[0], e[0], z); rope(g, teams[1], e[1], z);
      arrow(g, teams[0], t); arrow(g, teams[1], t);
      /* the count, word by word as it is called */
      if (G.phase === 'count' && !G.done) {
        const words = G.cyc.map((c, i) => [c, i]).filter((q) => q[0].w), n = words.length, gap = n > 3 ? 200 : 220;
        words.forEach(([c, i], j) => {
          if (i > G.bi) return;
          const now = i === G.bi || (c.three && inWindow()) || (cur().hold && i === G.bi - 1), x = (j - (n - 1) / 2) * gap;   /* 「둘…」 held */
          const col = !now ? 'rgba(243,234,216,0.4)' : c.three ? '#ffd98a' : c.tease ? '#f6a6bd' : '#fff6e4';
          P.text(g, c.w, x, 170, { size: c.three ? 124 : c.tease ? 78 : 90, color: col, alpha: G.a, seed: 3 + j, glow: 'rgba(14,20,32,0.7)' });
        });
        const c = cur();
        if (c && c.hold) { const nx = words.findIndex((q) => q[0].three); P.text(g, '…', (nx - (n - 1) / 2) * gap, 160, { font: 'serif', size: 60, color: 'rgba(243,234,216,0.5)', alpha: G.a * (0.5 + 0.5 * Math.sin(t * 9)), glow: 'rgba(14,20,32,0.6)' }); }
      }
      /* how far up: a dot a pull, filling as it rises and emptying if it sinks */
      for (let i = 0; i < N; i++) {
        const x = -((N - 1) * 30) / 2 + i * 30, f = T.clamp(G.k * N - i);
        P.fill(g, P.circle(x, 250, 9), 'rgba(243,234,216,0.35)');
        if (f > 0.02) { g.save(); g.globalAlpha *= f; P.fill(g, P.circle(x, 250, 9), '#ffd98a'); g.restore(); }
      }
      g.restore();
      G.hintRing(g, t);
      G.caption(g, G.phase === 'gather' ? '양쪽으로 나뉘어 줄을 잡아요' : BEAM ? '「셋!」에 맞춰 눌러 다 같이 당겨요 · 기울면 처지는 쪽 줄을 ← → 로 당겨 수평을 맞춰요' : '「셋!」에 맞춰 눌러 다 같이 당겨요 · 기울면 끌려가는 쪽 줄을 ← → 로 당겨 바로 세워요');
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
  Z.heave = function (o) { const G = heave0(o); if (G.tip == null) G.tip = '「셋!」 소리가 들릴 때 맞춰 눌러요'; return G; };
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
     o: { at: () => screen [x, y, scale], rounds: [[colour index, …], …], show: seconds } */
  const YARN = ['#e9c45a', '#c9573f', '#7fb0c9', '#f6efe0'];
  Z.knit = function (o) {
    const G = make({ r: 0, i: 0, phase: 'show', peek: 0, rows: [] });
    const seq = () => o.rounds[Math.min(G.r, o.rounds.length - 1)];
    async function show(sec) { G.phase = 'show'; G.peek = 1; await G.clock.wait(sec); G.clock.tween(G, 'peek', 0, 0.6); G.phase = 'knit'; G.idle = 0; }
    G.start = () => show(o.show || 3);
    const ball = (n) => { const a = o.at(), s = a[2]; return [a[0] + (n - 1.5) * 110 * s, a[1] + 150 * s]; };
    G.hit = (x, y) => { let best = -1, bd = Math.max(54, 50 * o.at()[2]); for (let n = 0; n < 4; n++) { const q = ball(n), d = Math.hypot(x - q[0], y - q[1]); if (d < bd) { bd = d; best = n; } } return best; };
    G.tap = function (n) {
      if (G.phase !== 'knit' || n > 3) return;
      G.idle = 0;
      if (n !== seq()[G.i]) { G.wrong('그 줄이 아니에요. 한 번 더 보여 줄게요'); G.rows = []; G.i = 0; show(1.6); return; }
      G.say = ''; G.rows.push(n); G.i++; T.audio.sfx('crayon'); T.audio.step(G.i + G.r * 4, { voice: 'felt', vel: 0.34 });
      if (G.i >= seq().length) {
        G.phase = 'pause'; G.r++;
        G.clock.wait(1.1).then(() => { if (G.r >= o.rounds.length) { T.audio.promise(); G.finish(1.2); } else { G.rows = []; G.i = 0; show(o.show || 3); } });
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
      if (G.peek > 0.01) { g.save(); g.globalAlpha = G.a * G.peek; P.fill(g, P.rr(-260, -260, 170, 200, 10), '#fbf4e2'); sq.forEach((c, i) => P.fill(g, P.rr(-250, -250 + i * (180 / sq.length), 150, 180 / sq.length - 4, 4), YARN[c])); P.text(g, '그 애의 담요', -175, -36, { font: 'serif', size: 20, color: '#33405c' }); g.restore(); }
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
