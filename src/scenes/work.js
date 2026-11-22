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
     o: { leo, at (world x), logs, strokes }. Push and pull: the two sides, turn about. */
  Z.saw = function (o) {
    const G = make({ logs: o.logs || 2, strokes: o.strokes || 9, i: 0, n: 0, side: 0, x: -1, rest: 0 });
    const leo = o.leo, X0 = o.at, base = () => W().groundAt(X0);
    G.start = function () {
      leo.go = null; leo.x = X0 - 150; leo.flip = false;
      leo.pose = (oo) => { const s2 = sawAt(); oo.lean = 0.1 + G.x * 0.06; oo.armF = { hand: F.local(oo, s2[0] - 110, s2[1] - 6) }; oo.armB = { hand: F.local(oo, s2[0] - 104, s2[1] + 2) }; };
    };
    const sawAt = () => [X0 + G.x * 50, base() - 74];
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
      G.x += ((G.side ? -1 : 1) * -1 - G.x) * Math.min(1, dt * 12);
      if (G.rest > 0 && !G.done) { G.rest -= dt; if (G.rest <= 0) G.n = 0; }
    };
    G.next = () => (G.done || G.rest > 0 ? null : G.side ? 'ArrowRight' : 'ArrowLeft');
    G.hintAt = () => [G.side ? 330 : -330, 470];
    G.draw = function (g, t) {
      if (G.a < 0.005) return;
      const z = zoom(), gy = base(), o0 = scr(X0, gy);
      g.save(); g.globalAlpha = G.a; g.translate(o0[0], o0[1]); g.scale(z, z);
      [-90, 90].forEach((x) => { P.line(g, x - 22, 0, x, -60, 6, '#8a6442'); P.line(g, x + 22, 0, x, -60, 6, '#8a6442'); });
      const cut = G.rest > 0 ? 1 : G.n / G.strokes, drop = G.rest > 0 ? (1 - G.rest) * 30 : 0;
      P.fill(g, P.rr(-150, -86, 150, 28, 14), '#b98a5a'); P.fill(g, P.ellipse(-150, -72, 7, 14), '#d9b384');
      g.save(); g.translate(0, drop); g.rotate(drop * 0.006); P.fill(g, P.rr(0, -86, 140, 28, 14), '#b98a5a'); P.fill(g, P.ellipse(140, -72, 7, 14), '#c9a070'); g.restore();
      P.fill(g, P.rr(-2, -87, 4, 29 * cut, 1), '#5a3d28');
      for (let i = 0; i < Math.round(cut * 9); i++) P.fill(g, P.circle(T.noise(i, 3) * 14, -2 - (i % 3) * 2, 2.4), '#e6c79a');
      if (G.rest <= 0 || G.done) {
        g.save(); g.translate(G.x * 50, -90 + 29 * cut); g.rotate(-0.08);
        P.fill(g, P.poly([[-80, -16], [80, -10], [80, 0], [-80, 0]]), '#cfd6da');
        P.fill(g, P.rr(-106, -24, 28, 28, 7), '#8a5a3b');
        g.restore();
      }
      for (let i = 0; i < G.logs; i++) P.fill(g, P.rr(-60 + i * 44, -150, 36, 12, 6), i < G.i ? '#d9b384' : 'rgba(243,234,216,0.45)');
      g.restore();
      /* which way now */
      for (const d of [0, 1]) {
        const on = G.side === d && G.rest <= 0, x = d ? 330 : -330, k = on ? 1 + 0.08 * Math.sin(t * 6) : 1;
        g.save(); g.translate(x, 470); g.scale((d ? 1 : -1) * k, k); g.globalAlpha = G.a * (on ? 0.9 : 0.22);
        P.fill(g, P.poly([[-34, -22], [10, -22], [10, -44], [52, 0], [10, 44], [10, 22], [-34, 22]]), '#fff0c8');
        g.restore();
      }
      G.hintRing(g, t);
      G.caption(g, '왼쪽, 오른쪽을 번갈아 눌러 통나무를 켜세요');
    };
    return G;
  };

  /* ---------- everyone on the rope ----------
     o: { pulls, crew: [actors], top: () => world [x, y] of what is being raised, raise(k), leo }.
     One, two, three: the pull only counts on three, when every hand is on it. */
  Z.heave = function (o) {
    const G = make({ pulls: o.pulls || 3, n: 0, ph: 0, yank: 0, miss: 0, k: 0 });
    const BEAT = 0.62, WIN = 0.3;
    const cyc = () => G.ph % (BEAT * 4);
    const onThree = () => Math.abs(cyc() - BEAT * 2.5) < WIN;
    const crew = o.crew;
    G.start = function () {
      crew.forEach((a, i) => {
        a.go = null; a.flip = true;
        a.pose = (oo, aa, t) => { const pull = G.yank * 0.3 + (onThree() && !G.done ? 0.1 : 0); oo.lean = -0.28 - pull * 0.5; oo.legF = { foot: [-12, 46] }; oo.legB = { foot: [6, 48] }; oo.face.eye = G.yank > 0.4 ? 'closed' : 'open'; oo.face.mouth = G.yank > 0.4 ? 'open' : 'line'; const hy = oo.y - 30 * (aa.s / 150); oo.armF = { hand: F.local(oo, aa.x - 26, hy) }; oo.armB = { hand: F.local(oo, aa.x - 18, hy + 4) }; oo.x += pull * 6; };
      });
    };
    G.keyOf = anyKey; G.hit = () => 0;
    G.tap = function () {
      if (G.miss > 0 || G.done) return;
      G.idle = 0;
      if (!onThree()) { G.wrong('혼자서는 꿈쩍도 안 해요. 「셋!」에 다 같이'); G.miss = 0.7; return; }
      G.say = ''; G.n++; G.yank = 1; G.ph = BEAT * 3.2;
      G.clock.tween(G, 'k', G.n / G.pulls, 0.6, T.ease.out).then(() => o.raise(G.k));
      T.audio.sfx('knock', G.n / G.pulls); T.audio.step(G.n * 2, { voice: 'box', vel: 0.4 });
      if (G.n >= G.pulls) { T.audio.promise(); crew.forEach((a) => { a.pose = null; }); G.finish(1.6); }
    };
    const up = G.update;
    G.update = function (dt) {
      up(dt);
      const before = Math.floor(cyc() / BEAT);
      if (!G.done) G.ph += dt;
      const now = Math.floor(cyc() / BEAT);
      if (now !== before && now < 3 && !G.done) T.audio.note({ m: [57, 57, 64][now], vel: 0.2, voice: 'pluck', dur: 0.4 });
      G.yank = Math.max(0, G.yank - dt * 1.6); G.miss = Math.max(0, G.miss - dt);
      o.raise(G.k - G.yank * 0.03);
    };
    G.next = () => (G.done || G.miss > 0 || !onThree() ? null : '1');
    G.hintAt = () => [0, 180];
    G.draw = function (g, t) {
      if (G.a < 0.005) return;
      g.save(); g.globalAlpha = G.a;
      /* the rope, from what is being raised to every pair of hands */
      const top = o.top(), s0 = scr(top[0], top[1]);
      g.strokeStyle = '#e6d6b0'; g.lineWidth = 4 * zoom(); g.lineCap = 'round';
      g.beginPath(); g.moveTo(s0[0], s0[1]);
      crew.forEach((a) => { if (a.j && a.j.handF) { const h = scr(a.j.handF[0], a.j.handF[1]); g.lineTo(h[0], h[1]); } });
      g.stroke();
      const b = Math.floor(cyc() / BEAT);
      ['하나', '둘', '셋!'].forEach((w, i) => {
        const on = b === i || (i === 2 && onThree()), x = -210 + i * 210;
        P.text(g, w, x, 170, { size: i === 2 ? 120 : 90, color: on ? (i === 2 ? '#ffd98a' : '#fff6e4') : 'rgba(243,234,216,0.35)', alpha: G.a, seed: 3 + i, glow: 'rgba(14,20,32,0.7)' });
      });
      for (let i = 0; i < G.pulls; i++) P.fill(g, P.circle(-((G.pulls - 1) * 30) / 2 + i * 30, 250, 9), i < G.n ? '#ffd98a' : 'rgba(243,234,216,0.35)');
      g.restore();
      G.caption(g, '「셋!」에 맞춰 눌러서, 다 같이 당겨 세우세요');
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
    G.draw = function (g, t) {
      if (G.a < 0.005) return;
      const a = o.at(), s = a[2], x = a[0], y = a[1];
      g.save(); g.globalAlpha = G.a; g.translate(x, y); g.scale(s, s);
      /* the steam box over a fire, and the hull's ribs beyond it */
      for (let k = 0; k < 5; k++) { const ph = t * 9 + k; P.fill(g, P.ellipse(-120 + (k - 2) * 10, 30 - Math.abs(Math.sin(ph)) * 14, 7, 12 + 8 * Math.abs(Math.sin(ph))), k % 2 ? '#ffb45a' : '#ff7a3a'); }
      P.fill(g, P.rr(-200, -10, 160, 34, 6), '#7a5a3c');
      if (G.on) for (let k = 0; k < 5; k++) { const life = (t * 0.8 + k / 5) % 1; P.glow(g, -190 + k * 30, -20 - life * 70, 14 + life * 18, '#fff3dc', Math.sin(life * Math.PI) * 0.8); }
      g.strokeStyle = '#8a5a3b'; g.lineWidth = 7; g.lineCap = 'round';
      for (let k = 0; k < 5; k++) { const rx = 40 + k * 44; g.beginPath(); g.moveTo(rx, 30); g.quadraticCurveTo(rx - 30, -30, rx + 4, -90); g.stroke(); }
      for (let k = 0; k < G.i; k++) { g.beginPath(); g.moveTo(20, -76 + k * 22); g.quadraticCurveTo(130, -36 + k * 18, 240, -76 + k * 22); g.stroke(); }
      /* the plank: straight in the box, then laid round the ribs */
      const bk = T.ease.io(G.bend), py = -76 + G.i * 22;
      g.strokeStyle = G.crack > 0.05 ? '#5a3d28' : T.mix('#d9b384', '#b07a4a', T.clamp(G.heat)); g.lineWidth = 9;
      g.beginPath(); g.moveTo(T.lerp(-196, 20, bk), T.lerp(4, py, bk)); g.quadraticCurveTo(T.lerp(-120, 130, bk), T.lerp(4, py + 40, bk), T.lerp(-44, 240, bk), T.lerp(4, py, bk)); g.stroke();
      g.restore();
      /* the heat, and the band where it will bend */
      const b = band();
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
    G.hit = (x, y) => { const a = o.at(), s = a[2]; for (let n = 0; n < 4; n++) if (Math.hypot(x - (a[0] + (n - 1.5) * 110 * s), y - (a[1] + 150 * s)) < 46 * s) return n; return -1; };
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
