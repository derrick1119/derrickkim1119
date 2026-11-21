/* Take Your Time — the small puzzles. Each one is something a hand in this story would
   actually be doing: answering the harbour bell, bedding foundation stones, raising a frame in
   the order it will stand, casting off a rope, finding a taste, weaving a garland.
   A puzzle is a little object a scene holds while it is being played:
     begin(clock) -> promise · draw(g, t) · pointer(type, x, y) · key(key) · update(dt)
     next() -> the key that is right just now (the hint, and how the tests play)
     hintAt() -> where on the screen that is */
(function () {
  'use strict';
  const T = window.TYT, P = T.P, K = T.town;
  const TAU = Math.PI * 2;
  const Z = (T.puzzle = {});
  const INK = '#f3ead8';

  function make(o) {
    const G = Object.assign({ a: 0, idle: 0, done: false, shake: 0, quiet: false, say: '' }, o);
    G.promise = new Promise((res) => { G.res = res; });
    G.begin = function (clock) { G.clock = clock; G.idle = 0; clock.tween(G, 'a', 1, 0.8, T.ease.out3); if (G.start) G.start(); return G.promise; };
    G.finish = function (hold) {
      if (G.done) return;
      G.done = true; G.say = '';
      const k = G.clock;
      k.wait(hold == null ? 1.3 : hold).then(() => k.tween(G, 'a', 0, 0.8, T.ease.io)).then(() => G.res());
    };
    G.wrong = function (text) { G.shake = 1; G.idle = 0; if (text) G.say = text; T.audio.sfx('knock', 0.2); };
    G.dim = function (g, k) { const V = T.view; g.fillStyle = T.rgba('#141a2c', (k == null ? 0.62 : k) * G.a); g.fillRect(-V.W / 2, 0, V.W, V.H); };
    G.caption = function (g, text) { P.text(g, G.say || text, 0, 850, { font: 'serif', size: 25, color: INK, alpha: 0.94 * G.a }); };
    G.update = function (dt) { G.idle += dt; G.shake = Math.max(0, G.shake - dt * 2.6); };
    /* left alone long enough, it shows the next move */
    G.hintRing = function (g, t) { if (G.done || G.idle < 9 || !G.hintAt) return; const q = G.hintAt(); if (q) P.beacon(g, q[0], q[1], 46, t, G.a, '#fff0c8'); };
    G.pointer = function (type, x, y) { if (type !== 'down' || G.done || G.a < 0.6) return; const n = G.hit(x, y); if (n >= 0) G.tap(n); };
    G.key = function (key) {
      if (G.done || G.a < 0.6) return;
      const n = G.keyOf ? G.keyOf(key) : key >= '1' && key <= '9' ? +key - 1 : -1;
      if (n >= 0) G.tap(n); else return false;
    };
    G.jig = (t, i) => (G.shake ? Math.sin(t * 42 + i * 1.7) * 6 * G.shake : 0);
    return G;
  }

  /* ---------- the bell asks, the lamps answer ---------- */
  /* o: { rounds: [[lamp, lamp, …], …], beat } — four lamps, the four notes of the call */
  Z.bell = function (o) {
    /* the call, a syllable to a lamp; in English the last lamp is the note held */
    const NOTE = [69, 67, 65, 72], WORD = T.lang === 'en' ? ['Take', 'your', 'time', '...'] : ['천', '천', '히', '와'];
    const G = make({ quiet: true, rounds: o.rounds, r: 0, i: 0, phase: 'listen', lit: [0.12, 0.12, 0.12, 0.12] });
    const lx = (n) => (n - 1.5) * 196, LY = 300;
    const glow = (n) => { G.lit[n] = 1; G.clock.tween(G.lit, n, 0.12, 1.1, T.ease.out); };
    async function ask() {
      const k = G.clock, seq = G.rounds[G.r];
      G.phase = 'listen'; G.i = 0;
      await k.wait(0.9);
      G.say = '';
      for (const n of seq) { glow(n); T.audio.note({ m: NOTE[n] - 12, vel: 0.34, voice: 'bell', dur: 5 }); await k.wait(o.beat || 0.85); }
      G.phase = 'answer'; G.idle = 0;
    }
    G.start = ask;
    G.hit = (x, y) => { for (let n = 0; n < 4; n++) if (Math.hypot(x - lx(n), y - (LY + 80)) < 92) return n; return -1; };
    G.tap = function (n) {
      if (G.phase !== 'answer' || n > 3) return;
      const seq = G.rounds[G.r];
      G.idle = 0;
      if (n !== seq[G.i]) { G.wrong('종이 부르는 차례를 한 번 더 들어 보세요'); G.phase = 'listen'; ask(); return; }
      glow(n); T.audio.note({ m: NOTE[n], vel: 0.42, voice: 'felt', dur: 4 });
      if (++G.i < seq.length) return;
      G.phase = 'pause'; G.r++;
      if (G.r >= G.rounds.length) { T.audio.sfx('join'); G.finish(1.1); } else ask();
    };
    G.next = () => (G.phase === 'answer' && !G.done ? String(G.rounds[G.r][G.i] + 1) : null);
    G.hintAt = () => (G.phase === 'answer' ? [lx(G.rounds[G.r][G.i]), LY + 80] : null);
    G.draw = function (g, t) {
      if (G.a < 0.005) return;
      G.dim(g, 0.5);
      g.save(); g.globalAlpha = G.a;
      g.strokeStyle = '#6f5346'; g.lineWidth = 4;
      g.beginPath(); g.moveTo(lx(0) - 170, LY - 40); g.quadraticCurveTo(0, LY + 44, lx(3) + 170, LY - 40); g.stroke();
      for (let n = 0; n < 4; n++) {
        const x = lx(n) + G.jig(t, n), y = LY + [4, 20, 20, 4][n];
        K.lantern(g, x, y, t, { bare: true, s: 4, lit: G.lit[n], seed: n + 1 });
        P.text(g, WORD[n], x, y + 168, { size: 60, color: INK, alpha: 0.3 + 0.7 * G.lit[n], seed: n + 3 });
      }
      for (let i = 0; i < G.rounds.length; i++) P.fill(g, P.circle((i - (G.rounds.length - 1) / 2) * 28, 640, 6), i < G.r ? '#ffd98a' : 'rgba(243,234,216,0.3)');
      g.restore();
      G.hintRing(g, t);
      G.caption(g, G.phase === 'answer' ? '같은 차례로 등불을 눌러 대답해 주세요' : G.done ? '' : '종이 부르는 차례를 들어 보세요');
    };
    return G;
  };

  /* ---------- foundation stones ---------- */
  /* Four holes of different depths, four stones of different heights: every top must come up to the string.
     o: { depth: [units per hole, all different], tray: [stone lying at each place in the grass] } */
  Z.stones = function (o) {
    const depth = o.depth, N = depth.length, U = 18, TOP = 34;
    const tray = o.tray || [2, 0, 3, 1];
    const G = make({ placed: [] });
    const sx = (i) => (i - (N - 1) / 2) * 170, GY = 430, TY = 740;
    const h = (s) => TOP + depth[s] * U;
    const bad = () => G.placed.some((s, i) => s !== i);
    G.tap = function (n) {
      G.idle = 0; G.say = '';
      if (n === 9) { if (G.placed.length) { G.placed.pop(); T.audio.sfx('step'); } return; }
      const s = tray[n];
      if (s == null || G.placed.includes(s) || G.placed.length >= N) return;
      G.placed.push(s); T.audio.sfx('knock', G.placed.length / N);
      if (G.placed.length < N) return;
      if (bad()) G.wrong('줄보다 솟거나 꺼진 돌이 있어요. 놓은 돌을 눌러 다시 들어내세요');
      else { T.audio.promise(); G.finish(1.5); }
    };
    G.hit = (x, y) => {
      if (y > TY - 120) { for (let n = 0; n < N; n++) if (Math.abs(x - sx(n)) < 70 && !G.placed.includes(tray[n])) return n; return -1; }
      return G.placed.length && Math.abs(y - GY) < 130 && Math.abs(x) < 420 ? 9 : -1;
    };
    G.keyOf = (key) => (key === 'Backspace' || key === 'ArrowUp' ? 9 : key >= '1' && key <= String(N) ? +key - 1 : -1);
    G.next = () => (G.done ? null : bad() ? 'Backspace' : G.placed.length < N ? String(tray.indexOf(G.placed.length) + 1) : null);
    G.hintAt = () => (bad() ? [sx(G.placed.length - 1), GY - 10] : G.placed.length < N ? [sx(tray.indexOf(G.placed.length)), TY - 30] : null);
    const stone = (g, x, bottom, s, lit) => {
      const hh = h(s);
      P.fill(g, P.soft([[x - 44, bottom], [x - 40, bottom - hh + 8], [x - 22, bottom - hh], [x + 24, bottom - hh + 2], [x + 42, bottom - hh + 10], [x + 45, bottom]]), s % 2 ? '#cdbfae' : '#d9cdbd');
      P.fill(g, P.soft([[x - 30, bottom - hh + 12], [x - 10, bottom - hh + 5], [x + 18, bottom - hh + 8], [x - 4, bottom - hh + 16]]), 'rgba(255,255,255,0.3)');
      if (lit) P.glow(g, x, bottom - hh, 46, '#fff0c0', 0.5);
    };
    G.draw = function (g, t) {
      if (G.a < 0.005) return;
      G.dim(g);
      g.save(); g.globalAlpha = G.a;
      /* the ground in section, with the four holes dug */
      P.fill(g, P.rr(-430, GY, 860, 150, 14), '#8a6f58');
      P.fill(g, P.rr(-430, GY - 10, 860, 22, 10), '#7fa878');
      for (let i = 0; i < N; i++) P.fill(g, P.rr(sx(i) - 52, GY - 12, 104, depth[i] * U + 14, 6), '#3c3140');
      G.placed.forEach((s, i) => stone(g, sx(i) + (G.placed.length === N ? G.jig(t, i) : 0), GY + depth[i] * U, s, G.done));
      /* the string between the stakes: this is level */
      const ly = GY - TOP;
      P.line(g, -450, GY + 6, -450, ly - 22, 6, '#b08e62'); P.line(g, 450, GY + 6, 450, ly - 22, 6, '#b08e62');
      g.strokeStyle = G.done ? '#ffe9b0' : 'rgba(246,233,204,0.9)'; g.lineWidth = 2; g.setLineDash([10, 7]);
      g.beginPath(); g.moveTo(-450, ly); g.lineTo(450, ly); g.stroke(); g.setLineDash([]);
      /* the stones still lying in the grass */
      P.fill(g, P.rr(-380, TY, 760, 12, 6), 'rgba(127,168,120,0.55)');
      for (let n = 0; n < N; n++) if (!G.placed.includes(tray[n])) stone(g, sx(n), TY + 4, tray[n]);
      g.restore();
      G.hintRing(g, t);
      G.caption(g, '돌마다 높이가 달라요. 네 돌의 머리가 모두 줄에 닿게 놓아 주세요');
    };
    return G;
  };

  /* ---------- raising the frame ---------- */
  /* Seven timbers lie in the grass. Each can only go up once what carries it is standing. */
  Z.frame = function () {
    const W2 = 170, H = 170, RH = 110, BY = 520;
    const PIECES = [
      { need: [], a: [-W2 - 16, BY], b: [W2 + 16, BY], w: 15 },
      { need: [0], a: [-W2, BY], b: [-W2, BY - H], w: 13 },
      { need: [0], a: [W2, BY], b: [W2, BY - H], w: 13 },
      { need: [1, 2], a: [-W2 - 24, BY - H], b: [W2 + 24, BY - H], w: 15 },
      { need: [3], a: [0, BY - H], b: [0, BY - H - RH], w: 12 },
      { need: [4], a: [-W2 - 24, BY - H], b: [0, BY - H - RH], w: 12 },
      { need: [4], a: [W2 + 24, BY - H], b: [0, BY - H - RH], w: 12 },
    ];
    const tray = [5, 3, 1, 6, 0, 4, 2];
    const G = make({ has: PIECES.map(() => false), up: PIECES.map(() => 0), badAt: -1 });
    const tx = (n) => (n - 3) * 124, TY = 716;
    const ready = (id) => PIECES[id].need.every((q) => G.has[q]);
    G.tap = function (n) {
      const id = tray[n];
      if (id == null || G.has[id]) return;
      G.idle = 0;
      if (!ready(id)) { G.badAt = n; G.wrong('그건 아직 받쳐 줄 것이 없어요'); return; }
      G.say = ''; G.has[id] = true;
      G.clock.tween(G.up, id, 1, 0.55, T.ease.out3);
      T.audio.sfx('knock', id / 7); T.audio.step(G.has.filter(Boolean).length, { voice: 'box', vel: 0.36 });
      if (G.has.every(Boolean)) { T.audio.promise(); G.finish(1.6); }
    };
    G.hit = (x, y) => { if (Math.abs(y - TY) > 76) return -1; for (let n = 0; n < 7; n++) if (Math.abs(x - tx(n)) < 58 && !G.has[tray[n]]) return n; return -1; };
    const want = () => tray.findIndex((id) => !G.has[id] && ready(id));
    G.next = () => (G.done ? null : want() < 0 ? null : String(want() + 1));
    G.hintAt = () => (want() < 0 ? null : [tx(want()), TY]);
    G.draw = function (g, t) {
      if (G.a < 0.005) return;
      G.dim(g);
      g.save(); g.globalAlpha = G.a;
      /* the plan, in chalk, the way they drew it on the floor */
      PIECES.forEach((p, i) => { if (!G.has[i]) P.chalk(g, [p.a, p.b], 1, '#fffdf2', 2.4, i + 2); });
      P.fill(g, P.rr(-300, BY + 8, 600, 10, 5), 'rgba(127,168,120,0.6)');
      PIECES.forEach((p, i) => {
        const k = G.up[i];
        if (k <= 0.01) return;
        const drop = (1 - k) * 60;
        P.line(g, p.a[0], p.a[1] - drop, T.lerp(p.a[0], p.b[0], k), T.lerp(p.a[1], p.b[1], k) - drop, p.w, i % 2 ? '#c9a878' : '#b98a5a');
      });
      /* the timber in the grass */
      for (let n = 0; n < 7; n++) {
        const id = tray[n];
        if (G.has[id]) continue;
        const p = PIECES[id], dx = p.b[0] - p.a[0], dy = p.b[1] - p.a[1], len = Math.hypot(dx, dy), sc = 84 / len;
        const x = tx(n) + (G.badAt === n ? G.jig(t, n) : 0);
        P.fill(g, P.rr(x - 54, TY - 58, 108, 116, 12), 'rgba(243,234,216,0.1)');
        P.line(g, x - dx * sc / 2, TY - dy * sc / 2, x + dx * sc / 2, TY + dy * sc / 2, p.w * 0.8, id % 2 ? '#c9a878' : '#b98a5a');
      }
      g.restore();
      G.hintRing(g, t);
      G.caption(g, '아래에서부터, 서로 받쳐 주는 차례대로 세워 주세요');
    };
    return G;
  };

  /* ---------- casting off ---------- */
  /* The mooring line was thrown round three bollards. It only comes off the way it went on: last turn first.
     o: { order: [bollard of each turn, first wound first] } */
  Z.rope = function (o) {
    const order = o.order, N = order.length;
    const G = make({ left: N });
    const bx = (b) => (b - 1) * 240, BY = 600, ly = (i) => BY - 46 - i * 30;
    G.tap = function (b) {
      if (b > 2 || G.left <= 0) return;
      G.idle = 0;
      if (order[G.left - 1] !== b) { G.wrong('맨 나중에 감긴, 가장 위의 고리부터 풀려요'); return; }
      G.say = ''; G.left--;
      T.audio.sfx('whoosh'); T.audio.step(N - G.left, { voice: 'pluck', vel: 0.42 });
      if (G.left === 0) { T.audio.sfx('join'); G.finish(1.1); }
    };
    G.hit = (x, y) => { if (y < BY - 300 || y > BY + 40) return -1; for (let b = 0; b < 3; b++) if (Math.abs(x - bx(b)) < 100) return b; return -1; };
    G.next = () => (G.left > 0 && !G.done ? String(order[G.left - 1] + 1) : null);
    G.hintAt = () => (G.left > 0 ? [bx(order[G.left - 1]), ly(G.left - 1)] : null);
    G.draw = function (g, t) {
      if (G.a < 0.005) return;
      G.dim(g);
      g.save(); g.globalAlpha = G.a;
      P.fill(g, P.rr(-430, BY, 860, 26, 6), '#b98a5a'); P.fill(g, P.rr(-430, BY + 22, 860, 10, 4), '#8a6442');
      const rope = '#efe2c4';
      g.lineCap = 'round'; g.lineJoin = 'round';
      /* behind the posts: the far half of every turn, and the line running from one turn to the next */
      g.strokeStyle = T.shade(rope, -0.22); g.lineWidth = 7;
      for (let i = 0; i < G.left; i++) { g.beginPath(); g.ellipse(bx(order[i]) + G.jig(t, i), ly(i), 46, 13, 0, Math.PI, TAU); g.stroke(); }
      g.strokeStyle = T.shade(rope, -0.1);
      g.beginPath(); g.moveTo(-470, BY - 20);
      for (let i = 0; i < G.left; i++) g.lineTo(bx(order[i]) - 46, ly(i));
      g.stroke();
      for (let b = 0; b < 3; b++) {
        P.fill(g, P.rr(bx(b) - 24, BY - 250, 48, 256, 10), '#6f4a34');
        P.fill(g, P.rr(bx(b) - 32, BY - 262, 64, 22, 10), '#8a6442');
      }
      /* in front: the near half of every turn, lowest first so the last one lies on top */
      g.strokeStyle = rope; g.lineWidth = 8;
      for (let i = 0; i < G.left; i++) { g.beginPath(); g.ellipse(bx(order[i]) + G.jig(t, i), ly(i), 46, 13, 0, 0, Math.PI); g.stroke(); }
      /* the free end, away to the boat */
      if (G.left > 0) { g.beginPath(); g.moveTo(bx(order[G.left - 1]) + 46, ly(G.left - 1)); g.quadraticCurveTo(360, ly(G.left - 1) - 70, 520, BY - 300); g.stroke(); }
      g.restore();
      G.hintRing(g, t);
      G.caption(g, '감긴 차례를 거꾸로 따라가며, 말뚝을 눌러 밧줄을 풀어 주세요');
    };
    return G;
  };

  /* ---------- finding the taste ---------- */
  /* Two of four herbs are hers. He cannot taste her pot, only see it in the lake: each try tells him how near his looks. o: { answer: [a, b] } */
  Z.taste = function (o) {
    const ans = o.answer, COL = ['#6fa35c', '#c8a23c', '#b65a7a', '#4f8f9a'];
    const G = make({ pick: [], tries: [], busy: false });
    const jx = (n) => -420 + n * 150, JY = 600;
    const leaf = (g, x, y, n, s) => {
      const c = COL[n];
      if (n === 0) for (let i = -1; i <= 1; i++) P.fill(g, P.ellipse(x + i * 13 * s, y - Math.abs(i) * -6 * s, 9 * s, 20 * s, i * 0.5), c);
      else if (n === 1) for (let i = 0; i < 5; i++) P.fill(g, P.circle(x + Math.cos(i * 1.26) * 13 * s, y + Math.sin(i * 1.26) * 13 * s, 7 * s), c);
      else if (n === 2) { P.line(g, x, y + 22 * s, x, y - 20 * s, 3 * s, c); for (let i = 0; i < 3; i++) { P.fill(g, P.ellipse(x - 9 * s, y - 12 * s + i * 13 * s, 9 * s, 4.5 * s, 0.5), c); P.fill(g, P.ellipse(x + 9 * s, y - 12 * s + i * 13 * s, 9 * s, 4.5 * s, -0.5), c); } }
      else for (let i = 0; i < 4; i++) P.line(g, x, y + 20 * s, x + (i - 1.5) * 11 * s, y - 18 * s, 4 * s, c);
    };
    G.tap = async function (n) {
      if (n > 3 || G.busy) return;
      G.idle = 0; G.say = '';
      const at = G.pick.indexOf(n);
      if (at >= 0) { G.pick.splice(at, 1); T.audio.sfx('step'); return; }
      if (G.pick.length >= 2) return;
      G.pick.push(n); T.audio.sfx('bubble', n / 4);
      if (G.pick.length < 2) return;
      G.busy = true;
      await G.clock.wait(1.0);
      const m = G.pick.filter((q) => ans.includes(q)).length;
      G.tries.push({ pick: G.pick.slice().sort(), m });
      if (G.tries.length > 5) G.tries.shift();
      if (m === 2) { T.audio.promise(); G.finish(1.7); return; }
      G.wrong(m === 1 ? '반쯤 닮았어요. 둘 중 하나는 맞아요' : '전혀 다른 빛깔이에요');
      G.pick = []; G.busy = false;
    };
    G.hit = (x, y) => { for (let n = 0; n < 4; n++) if (Math.abs(x - jx(n)) < 66 && Math.abs(y - JY) < 110) return n; return -1; };
    const want = () => { const off = G.pick.find((q) => !ans.includes(q)); if (off != null) return off; const need = ans.find((q) => !G.pick.includes(q)); return need == null ? -1 : need; };
    G.next = () => (G.done || G.busy || want() < 0 ? null : String(want() + 1));
    G.hintAt = () => (want() < 0 ? null : [jx(want()), JY]);
    G.draw = function (g, t) {
      if (G.a < 0.005) return;
      G.dim(g);
      g.save(); g.globalAlpha = G.a;
      /* her pot, as the lake shows it: to look at, not to taste */
      P.glow(g, -196, 300, 150, '#cfe2f2', 0.3);
      g.lineWidth = 2; for (let i = 0; i < 3; i++) { g.strokeStyle = T.rgba('#dfeeff', 0.34 - i * 0.09 + 0.06 * Math.sin(t * 2 + i)); g.beginPath(); g.ellipse(-196, 306, 122 + i * 26 + Math.sin(t * 1.4 + i) * 4, 62 + i * 13, 0, 0, TAU); g.stroke(); }
      P.fill(g, P.poly([[-276, 268], [-116, 268], [-144, 340], [-248, 340]]), '#f2ead8');
      P.fill(g, P.ellipse(-196, 268, 78, 15), '#c8742f');
      P.fill(g, P.circle(-216, 266, 5), '#6fa35c'); P.fill(g, P.circle(-178, 270, 5), '#6fa35c');
      /* the jars */
      for (let n = 0; n < 4; n++) {
        const on = G.pick.includes(n), x = jx(n) + (on ? 0 : G.jig(t, n) * 0.4), y = JY - (on ? 26 : 0);
        if (on) P.glow(g, x, y, 100, '#fff0c0', 0.5);
        P.fill(g, P.rr(x - 46, y - 66, 92, 140, 16), 'rgba(226,240,236,0.9)');
        P.fill(g, P.rr(x - 40, y - 84, 80, 22, 8), '#b98a5a');
        leaf(g, x, y + 6, n, 1.5);
      }
      /* his pot, and what has gone into it */
      P.fill(g, P.rr(240, 560, 200, 110, 22), '#2d6672'); P.fill(g, P.ellipse(340, 562, 100, 18), '#b9532f');
      G.pick.forEach((n, i) => leaf(g, 310 + i * 60, 556, n, 0.8));
      /* what he has tried, and how near each came */
      G.tries.forEach((q, i) => {
        const y = 250 + i * 56;
        P.fill(g, P.rr(214, y - 24, 250, 48, 12), 'rgba(243,234,216,0.1)');
        q.pick.forEach((n, j) => leaf(g, 250 + j * 50, y, n, 0.7));
        for (let j = 0; j < 2; j++) P.fill(g, P.circle(386 + j * 34, y, 10), j < q.m ? '#ffd98a' : 'rgba(243,234,216,0.22)');
      });
      g.restore();
      G.hintRing(g, t);
      G.caption(g, '두 가지를 골라 넣어 보세요. 노란 점은 호수에 비친 아나의 스튜와 닮은 만큼이에요');
    };
    return G;
  };

  /* ---------- weaving the garland ---------- */
  /* The flowers go round in a repeating order; fill the gaps. o: { pattern: [kinds], len, gaps: [positions] } */
  Z.garland = function (o) {
    const pat = o.pattern, len = o.len, gaps = o.gaps;
    const COL = [['#e5758f', '#f9c2cc'], ['#f1c04a', '#fbe9a8'], ['#f6f0e0', '#e9b0bd']];
    const G = make({ n: 0 });
    const fx = (i) => (i - (len - 1) / 2) * 84, fy = (i) => 360 + Math.sin((i / (len - 1)) * Math.PI) * 70;
    const bx = (n) => (n - 1) * 170, BY = 660;
    const kind = (i) => pat[i % pat.length];
    const flower = (g, x, y, n, s, a) => {
      g.save(); g.globalAlpha *= a == null ? 1 : a;
      for (let i = 0; i < (n === 2 ? 6 : 5); i++) { const an = (i / (n === 2 ? 6 : 5)) * TAU + n; P.fill(g, P.ellipse(x + Math.cos(an) * 15 * s, y + Math.sin(an) * 15 * s, (n === 1 ? 9 : 12) * s, 12 * s, an), COL[n][0]); }
      P.fill(g, P.circle(x, y, 9 * s), COL[n][1]);
      g.restore();
    };
    G.tap = function (n) {
      if (n > 2 || G.n >= gaps.length) return;
      G.idle = 0;
      if (kind(gaps[G.n]) !== n) { G.wrong('앞에서부터 되풀이되는 차례를 살펴보세요'); return; }
      G.say = ''; G.n++;
      T.audio.step(G.n, { voice: 'box', vel: 0.38 });
      if (G.n >= gaps.length) { T.audio.promise(); G.finish(1.6); }
    };
    G.hit = (x, y) => { for (let n = 0; n < 3; n++) if (Math.hypot(x - bx(n), y - BY) < 78) return n; return -1; };
    G.next = () => (G.n < gaps.length && !G.done ? String(kind(gaps[G.n]) + 1) : null);
    G.hintAt = () => (G.n < gaps.length ? [bx(kind(gaps[G.n])), BY] : null);
    G.draw = function (g, t) {
      if (G.a < 0.005) return;
      G.dim(g);
      g.save(); g.globalAlpha = G.a;
      g.strokeStyle = '#7fa86a'; g.lineWidth = 7; g.lineCap = 'round';
      g.beginPath(); for (let i = 0; i < len; i++) { if (i) g.lineTo(fx(i), fy(i)); else g.moveTo(fx(i), fy(i)); } g.stroke();
      for (let i = 0; i < len; i++) {
        const gi = gaps.indexOf(i);
        if (gi >= 0 && gi >= G.n) {
          const now = gi === G.n, r = 24 + (now ? Math.sin(t * 4) * 3 : 0);
          g.strokeStyle = T.rgba('#fff0c8', now ? 0.9 : 0.4); g.lineWidth = 2.5; g.setLineDash([6, 6]);
          g.beginPath(); g.arc(fx(i) + (now ? G.jig(t, i) : 0), fy(i), r, 0, TAU); g.stroke(); g.setLineDash([]);
        } else flower(g, fx(i), fy(i), kind(i), 1.25);
      }
      for (let n = 0; n < 3; n++) { P.fill(g, P.circle(bx(n), BY, 62), 'rgba(243,234,216,0.12)'); flower(g, bx(n), BY, n, 1.7); }
      g.restore();
      G.hintRing(g, t);
      G.caption(g, '꽃이 놓이는 차례를 보고, 빈자리에 올 꽃을 골라 주세요');
    };
    return G;
  };
})();
