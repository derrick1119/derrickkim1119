/* Take Your Time — the jobs of work. A house on a hill is not thought into being: stone is hauled up
   to it, timber is sawn for it, and what falls down is pulled up again by everyone at once.
   And one job that is Bean's alone. Built on the same frame as the small puzzles (puzzles.js):
     begin(clock) -> promise · draw(g, t) · pointer · key · update(dt) · next() · hintAt() */
(function () {
  'use strict';
  const T = window.TYT, P = T.P, F = T.F;
  const TAU = Math.PI * 2;
  const Z = T.puzzle, make = Z.make;
  const INK = '#f3ead8';
  const anyKey = (key) => (key === ' ' || key === 'Enter' || key === '1' ? 0 : -1);
  /* the jobs are played out of doors: a sky of their own over the hill behind */
  function sky(g, G, ground) {
    const W = T.view.W;
    g.save(); g.globalAlpha = G.a;
    const gr = g.createLinearGradient(0, 0, 0, 900);
    gr.addColorStop(0, '#8496cc'); gr.addColorStop(0.5, '#e9b9a4'); gr.addColorStop(1, '#ffdba6');
    g.fillStyle = gr; g.fillRect(-W / 2, 0, W, 900);
    P.glow(g, 320, 300, 420, '#fff2c4', 0.5);
    if (ground != null) { P.fill(g, P.rr(-W / 2, ground, W, 900 - ground, 0), '#6f9a6a'); P.fill(g, P.rr(-W / 2, ground, W, 16, 0), '#8fb884'); }
    g.restore();
  }

  /* ---------- hauling stone up the hill ---------- */
  /* Each press is one heave. Breath runs out; pushed past it, the stone rolls back. o: { trips, style } */
  Z.haul = function (o) {
    const G = make({ trips: o.trips || 2, i: 0, p: 0, breath: 1, slip: 0, rest: 0, heave: 0, style: o.style || F.styles.leoHome });
    const AX = -470, AY = 700, BX = 430, BY = 300;
    const at = (p) => [T.lerp(AX, BX, p), T.lerp(AY, BY, p)];
    G.keyOf = anyKey;
    G.hit = () => 0;
    G.tap = function () {
      if (G.rest > 0) return;
      G.idle = 0;
      if (G.breath < 0.16) { G.wrong('숨이 턱까지 찼어요. 잠깐 쉬었다가 밀어요'); G.slip = 1; G.p = Math.max(0, G.p - 0.13); return; }
      G.say = '';
      G.breath -= 0.19; G.p = Math.min(1, G.p + 0.085); G.heave = 1;
      T.audio.sfx('step'); T.audio.sfx('knock', G.p * 0.9);
      if (G.p >= 1) {
        G.i++; G.rest = 1.1; T.audio.sfx('join');
        if (G.i >= G.trips) G.finish(1.2);
      }
    };
    const up = G.update;
    G.update = function (dt) {
      up(dt);
      G.breath = Math.min(1, G.breath + dt * (G.breath < 0.16 ? 0.34 : 0.42));
      G.slip = Math.max(0, G.slip - dt * 2); G.heave = Math.max(0, G.heave - dt * 3.2);
      if (G.rest > 0 && !G.done) { G.rest -= dt; if (G.rest <= 0) { G.p = 0; G.breath = 1; } }
    };
    G.next = () => (G.done || G.rest > 0 || G.breath < 0.4 ? null : '1');
    G.hintAt = () => { const q = at(G.p); return [q[0] + 40, q[1] - 60]; };
    G.draw = function (g, t) {
      if (G.a < 0.005) return;
      sky(g, G);
      g.save(); g.globalAlpha = G.a;
      /* the slope, and the cloud sea it climbs out of */
      P.fill(g, P.poly([[AX - 260, AY + 60], [AX - 40, AY + 30], [BX + 40, BY + 30], [BX + 330, BY + 30], [BX + 330, 900], [AX - 260, 900]]), '#6f9a6a');
      P.fill(g, P.poly([[AX - 260, AY + 60], [AX - 40, AY + 30], [BX + 40, BY + 30], [BX + 330, BY + 30], [BX + 330, BY + 52], [BX + 44, BY + 52], [AX - 36, AY + 54], [AX - 260, AY + 84]]), '#8fb884');
      for (let i = 0; i < 5; i++) P.fill(g, P.circle(AX - 250 + i * 60, AY + 110 + (i % 2) * 14, 64), 'rgba(255,248,232,0.9)');
      /* stones already up, by the stakes */
      for (let i = 0; i < G.i; i++) P.fill(g, P.ellipse(BX + 110 + i * 62, BY + 18, 27, 20), i % 2 ? '#a9a39b' : '#b9b3aa');
      P.line(g, BX + 290, BY + 30, BX + 290, BY - 40, 5, '#b08e62'); P.fill(g, P.poly([[BX + 290, BY - 40], [BX + 312, BY - 34], [BX + 290, BY - 26]]), '#c9573f');
      if (G.rest <= 0 || G.done) {
        const q = at(G.p), sl = Math.atan2(BY - AY, BX - AX), jig = G.jig(t, 1) * 0.5;
        const sx = q[0] + 44 + jig, sy = q[1] + 6;
        /* the stone turns as it goes */
        g.save(); g.translate(sx, sy - 22); g.rotate(G.p * 9 + G.slip * -0.6);
        P.fill(g, P.ellipse(0, 0, 30, 25), '#b3ada4'); P.fill(g, P.ellipse(-8, -7, 9, 6), '#c9c3ba'); P.line(g, -12, 8, 6, 14, 2, '#8f8982');
        g.restore();
        /* Leo, shoulder to it */
        const st = G.style, s = 150, hh = F.hipHeight(st, s), lean = 0.34 + G.heave * 0.12 - (G.breath < 0.2 ? 0.2 : 0);
        const lo = { x: q[0] - 8, y: q[1] + 26 - hh * 0.94, s, style: st, lean, headTilt: G.breath < 0.2 ? 0.34 : 0.1, walk: G.p * 26, face: { blush: 0.2 + (1 - G.breath) * 0.5, eye: G.breath < 0.2 ? 'closed' : 'open', mouth: G.breath < 0.35 ? 'open' : 'line' } };
        if (G.breath < 0.2) { lo.walk = null; lo.armF = { a: 0.2, b: 0.3 }; lo.armB = { a: 0.1, b: 0.3 }; }
        else { lo.armF = { hand: F.local(lo, sx - 26, sy - 36) }; lo.armB = { hand: F.local(lo, sx - 22, sy - 16) }; }
        F.person(g, lo);
        void sl;
      }
      /* breath */
      P.text(g, '숨', -150, 150, { font: 'serif', size: 26, color: INK, alpha: 0.9 * G.a });
      P.fill(g, P.rr(-110, 132, 260, 22, 11), 'rgba(243,234,216,0.16)');
      if (G.breath > 0.02) P.fill(g, P.rr(-110, 132, 260 * G.breath, 22, 11), G.breath < 0.2 ? '#c9573f' : G.breath < 0.4 ? '#e2a85a' : '#9fcf86');
      g.restore();
      G.hintRing(g, t);
      G.caption(g, '눌러서 돌을 밀어 올리세요. 숨이 차면 잠깐 쉬었다 가요');
    };
    return G;
  };

  /* ---------- sawing timber ---------- */
  /* Push and pull: the two sides of the screen, turn about. o: { logs, strokes } */
  Z.saw = function (o) {
    const G = make({ logs: o.logs || 2, strokes: o.strokes || 9, i: 0, n: 0, side: 0, x: -1, rest: 0 });
    G.keyOf = (key) => (key === 'ArrowLeft' || key === '1' ? 0 : key === 'ArrowRight' || key === '2' ? 1 : -1);
    G.hit = (x) => (x < 0 ? 0 : 1);
    G.tap = function (n) {
      if (G.rest > 0 || n > 1) return;
      G.idle = 0;
      if (n !== G.side) { G.wrong('톱은 밀고 당기기예요. 반대쪽을 눌러요'); return; }
      G.say = ''; G.side = 1 - G.side; G.n++;
      T.audio.sfx('crayon'); T.audio.sfx('chalk', n);
      if (G.n >= G.strokes) {
        G.i++; G.rest = 1.0; T.audio.sfx('knock', 0.3);
        if (G.i >= G.logs) G.finish(1.2);
      }
    };
    const up = G.update;
    G.update = function (dt) {
      up(dt);
      G.x += ((G.side ? -1 : 1) * -1 - G.x) * Math.min(1, dt * 12);
      if (G.rest > 0 && !G.done) { G.rest -= dt; if (G.rest <= 0) { G.n = 0; } }
    };
    G.next = () => (G.done || G.rest > 0 ? null : G.side ? 'ArrowRight' : 'ArrowLeft');
    G.hintAt = () => [G.side ? 330 : -330, 470];
    G.draw = function (g, t) {
      if (G.a < 0.005) return;
      sky(g, G, 640);
      g.save(); g.globalAlpha = G.a;
      /* trestles and the log */
      [-230, 230].forEach((x) => { P.line(g, x - 40, 640, x, 500, 9, '#8a6442'); P.line(g, x + 40, 640, x, 500, 9, '#8a6442'); });
      const cut = G.rest > 0 ? 1 : G.n / G.strokes, drop = G.rest > 0 ? (1 - G.rest) * 60 : 0;
      P.fill(g, P.rr(-330, 440, 360, 62, 30), '#b98a5a'); P.fill(g, P.ellipse(-330, 471, 16, 31), '#d9b384');
      g.save(); g.translate(30, 440 + drop); g.rotate(drop * 0.004);
      P.fill(g, P.rr(0, 0, 300, 62, 30), '#b98a5a'); P.fill(g, P.ellipse(300, 31, 16, 31), '#c9a070');
      g.restore();
      for (let i = 0; i < 5; i++) P.line(g, -300 + i * 62, 458 + (i % 2) * 22, -262 + i * 62, 458 + (i % 2) * 22, 2, 'rgba(120,84,50,0.5)');
      /* the kerf, and dust under it */
      P.fill(g, P.rr(27, 438, 6, 64 * cut, 2), '#5a3d28');
      for (let i = 0; i < Math.round(cut * 9); i++) P.fill(g, P.circle(30 + T.noise(i, 3) * 30, 660 - (i % 3) * 5, 3.5), '#e6c79a');
      /* the saw */
      if (G.rest <= 0 || G.done) {
        const sx = 30 + G.x * 96 + G.jig(t, 2), sy = 430 + 64 * cut;
        g.save(); g.translate(sx, sy); g.rotate(-0.1);
        P.fill(g, P.poly([[-170, -34], [170, -22], [170, 0], [-170, 0]]), '#cfd6da');
        for (let i = 0; i < 22; i++) P.fill(g, P.poly([[-168 + i * 15.4, 0], [-160.3 + i * 15.4, 8], [-152.6 + i * 15.4, 0]]), '#aeb7bd');
        P.fill(g, P.rr(-222, -50, 60, 60, 14), '#8a5a3b'); P.fill(g, P.rr(-208, -36, 30, 30, 9), 'rgba(20,26,44,0.7)');
        g.restore();
      }
      /* which way now */
      for (const d of [0, 1]) {
        const on = G.side === d && G.rest <= 0, x = d ? 330 : -330, k = on ? 1 + 0.08 * Math.sin(t * 6) : 1;
        g.save(); g.translate(x, 470); g.scale((d ? 1 : -1) * k, k); g.globalAlpha = G.a * (on ? 0.95 : 0.25);
        P.fill(g, P.poly([[-34, -22], [10, -22], [10, -44], [52, 0], [10, 44], [10, 22], [-34, 22]]), '#fff0c8');
        g.restore();
      }
      /* logs done */
      for (let i = 0; i < G.logs; i++) P.fill(g, P.rr(-40 + i * 46 - (G.logs - 1) * 23, 250, 38, 14, 7), i < G.i ? '#d9b384' : 'rgba(243,234,216,0.2)');
      g.restore();
      G.hintRing(g, t);
      G.caption(g, '왼쪽, 오른쪽을 번갈아 눌러 통나무를 켜세요');
    };
    return G;
  };

  /* ---------- everyone on the rope ---------- */
  /* One, two, three: the pull only counts on three, when every hand is on it. o: { pulls, crew: [styles] } */
  Z.heave = function (o) {
    const G = make({ pulls: o.pulls || 3, n: 0, ph: 0, crew: o.crew || [], yank: 0, miss: 0 });
    const BEAT = 0.62, WIN = 0.3;                 /* seconds a count; how far either side of "three" still counts */
    const cyc = () => G.ph % (BEAT * 4);
    const onThree = () => Math.abs(cyc() - BEAT * 2.5) < WIN;
    G.keyOf = anyKey;
    G.hit = () => 0;
    G.tap = function () {
      if (G.miss > 0) return;
      G.idle = 0;
      if (!onThree()) { G.wrong('혼자서는 꿈쩍도 안 해요. 「셋!」에 다 같이'); G.miss = 0.7; return; }
      G.say = ''; G.n++; G.yank = 1; G.ph = BEAT * 3.2;
      T.audio.sfx('knock', G.n / G.pulls); T.audio.step(G.n * 2, { voice: 'box', vel: 0.4 });
      if (G.n >= G.pulls) { T.audio.promise(); G.finish(1.6); }
    };
    const up = G.update;
    G.update = function (dt) {
      up(dt);
      const before = Math.floor(cyc() / BEAT);
      if (!G.done) G.ph += dt;
      const now = Math.floor(cyc() / BEAT);
      if (now !== before && now < 3 && !G.done) T.audio.note({ m: [57, 57, 64][now], vel: 0.2, voice: 'pluck', dur: 0.4 });
      G.yank = Math.max(0, G.yank - dt * 1.6); G.miss = Math.max(0, G.miss - dt);
    };
    G.next = () => (G.done || G.miss > 0 || !onThree() ? null : '1');
    G.hintAt = () => [0, 180];
    G.draw = function (g, t) {
      if (G.a < 0.005) return;
      sky(g, G);
      g.save(); g.globalAlpha = G.a;
      const GY = 700, k = (G.n - G.yank * 0.8 * (G.n > 0 ? 1 : 0)) / G.pulls;
      P.fill(g, P.rr(-900, GY, 1800, 220, 0), '#6f9a6a'); P.fill(g, P.rr(-900, GY, 1800, 16, 0), '#8fb884');
      /* the frame coming up off the grass, hinged at its foot */
      const ang = T.lerp(-1.42, 0, T.ease.io(T.clamp(k)));
      g.save(); g.translate(-420, GY); g.rotate(ang);
      const beam = (x0, y0, x1, y1, w) => P.line(g, x0, y0, x1, y1, w, '#b98a5a');
      beam(0, 0, 0, -260, 12); beam(210, 0, 210, -260, 12); beam(-8, -260, 218, -260, 12); beam(0, -260, 105, -350, 11); beam(210, -260, 105, -350, 11); beam(0, -130, 210, -130, 8);
      const top = [105, -350];
      const c = Math.cos(ang), s2 = Math.sin(ang), tx = -420 + top[0] * c - top[1] * s2, ty = GY + top[0] * s2 + top[1] * c;
      g.restore();
      /* the crew, leaning back on the rope */
      const pull = G.yank * 0.3 + (onThree() && !G.done ? 0.1 : 0);
      const crew = [o.leo || F.styles.leoHome].concat(G.crew);
      const hands = [];
      crew.forEach((st, i) => {
        const x = 60 + i * 118 + pull * 30, s = st.kid ? 104 : i === 0 ? 150 : 140, hh = F.hipHeight(st, s);
        const po = { x, y: GY - hh * (0.9 - pull * 0.2), s, style: st, flip: true, lean: -0.3 - pull * 0.5, face: { eye: G.yank > 0.4 ? 'closed' : 'open', mouth: G.yank > 0.4 ? 'open' : 'line', blush: 0.24 }, legF: { foot: [-12, 46] }, legB: { foot: [6, 48] } };
        const hy = GY - hh - 34 * (s / 150);
        po.armF = { hand: F.local(po, x - 30, hy) }; po.armB = { hand: F.local(po, x - 22, hy + 4) };
        hands.push([x - 30, hy]);
        F.person(g, po);
      });
      g.strokeStyle = '#e6d6b0'; g.lineWidth = 5; g.lineCap = 'round';
      g.beginPath(); g.moveTo(tx, ty); hands.forEach((q) => g.lineTo(q[0], q[1])); g.stroke();
      /* one, two, three */
      const b = Math.floor(cyc() / BEAT);
      ['하나', '둘', '셋!'].forEach((w, i) => {
        const on = b === i || (i === 2 && onThree()), x = -210 + i * 210;
        P.text(g, w, x, 200, { size: i === 2 ? 130 : 96, color: on ? (i === 2 ? '#ffd98a' : '#fff6e4') : 'rgba(243,234,216,0.3)', alpha: G.a, seed: 3 + i });
      });
      for (let i = 0; i < G.pulls; i++) P.fill(g, P.circle(-30 + i * 30 - (G.pulls - 1) * 0, 280, 9), i < G.n ? '#ffd98a' : 'rgba(243,234,216,0.22)');
      g.restore();
      G.caption(g, '「셋!」에 맞춰 눌러서, 다 같이 당겨 세우세요');
    };
    return G;
  };

  /* ---------- Bean finds it ---------- */
  /* Something is lost in the long grass. Send Bean to a tuft: the nearer he is, the harder the tail goes. o: { finds: [tuft, …], what: [name, …] } */
  Z.sniff = function (o) {
    const N = 7, G = make({ finds: o.finds, r: 0, at: 3, bx: 0, dig: 0, got: [], near: 9, moving: false });
    const lx = (i) => (i - (N - 1) / 2) * 190, GY = 620;
    G.bx = lx(3);
    G.tap = function (n) {
      if (n >= N || G.dig > 0 || G.moving) return;
      G.idle = 0; G.at = n; G.moving = true; G.say = '';
    };
    function arrive() {
      G.moving = false;
      const d = Math.abs(G.at - G.finds[G.r]);
      G.near = d;
      if (d === 0) { G.dig = 1.5; T.audio.sfx('step'); T.audio.sfx('join'); return; }
      T.audio.sfx('bubble', 1 - d / 6);
      G.say = d === 1 ? '꼬리가 세차게 흔들려요. 바로 옆이에요' : d === 2 ? '꼬리가 살랑거려요. 멀지 않아요' : '빈이 고개를 갸웃해요. 여긴 아니에요';
    }
    const up = G.update;
    G.update = function (dt) {
      up(dt);
      const tx = lx(G.at), d = tx - G.bx;
      if (G.moving) { G.bx += Math.sign(d) * Math.min(Math.abs(d), 720 * dt); if (Math.abs(tx - G.bx) < 1) arrive(); }
      if (G.dig > 0) {
        G.dig -= dt;
        if (G.dig <= 0) { G.got.push(G.finds[G.r]); G.r++; G.near = 9; T.audio.promise(); if (G.r >= G.finds.length) G.finish(1.4); }
      }
    };
    G.hit = (x, y) => { if (y < 380 || y > 760) return -1; for (let i = 0; i < N; i++) if (Math.abs(x - lx(i)) < 92) return i; return -1; };
    G.next = () => (G.done || G.dig > 0 || G.moving ? null : String(G.finds[G.r] + 1));
    G.hintAt = () => (G.done || G.dig > 0 ? null : [lx(G.finds[G.r]), GY - 20]);
    const THING = [
      (g, x, y) => { P.line(g, x - 20, y + 8, x + 16, y - 10, 6, '#8a6442'); P.fill(g, P.rr(x + 6, y - 28, 30, 22, 5), '#b98a5a'); },                 /* the mallet */
      (g, x, y) => { P.fill(g, P.soft([[x - 16, y + 6], [x - 14, y - 8], [x, y - 14], [x + 14, y - 8], [x + 16, y + 6]]), '#d7a23c'); P.fill(g, P.rr(x - 18, y + 3, 36, 7, 3), '#e4b85a'); },   /* his cap */
      (g, x, y) => { P.line(g, x - 14, y, x + 14, y, 7, '#f2ead8'); P.fill(g, P.circle(x - 16, y - 4, 6), '#f2ead8'); P.fill(g, P.circle(x - 16, y + 4, 6), '#f2ead8'); P.fill(g, P.circle(x + 16, y - 4, 6), '#f2ead8'); P.fill(g, P.circle(x + 16, y + 4, 6), '#f2ead8'); },   /* and a bone, which nobody lost */
    ];
    G.draw = function (g, t) {
      if (G.a < 0.005) return;
      sky(g, G);
      g.save(); g.globalAlpha = G.a;
      P.fill(g, P.rr(-900, GY, 1800, 300, 0), '#6f9a6a'); P.fill(g, P.rr(-900, GY, 1800, 16, 0), '#8fb884');
      for (let i = 0; i < N; i++) {
        const x = lx(i) + (G.at === i && !G.moving ? 0 : G.jig(t, i) * 0.3), gone = G.got.includes(i);
        g.strokeStyle = gone ? '#8fb884' : '#3f6b4a'; g.lineCap = 'round'; g.lineWidth = 5;
        for (let b = 0; b < 9; b++) { const bx = x - 44 + b * 11, h = (gone ? 14 : 44) + T.noise(i * 3 + b, 2) * 16, sw = Math.sin(t * 1.6 + i + b) * 5; g.beginPath(); g.moveTo(bx, GY + 8); g.quadraticCurveTo(bx + sw * 0.4, GY - h * 0.5, bx + sw, GY - h); g.stroke(); }
      }
      /* Bean */
      const wag = G.dig > 0 ? 22 : G.near === 1 ? 20 : G.near === 2 ? 11 : G.near > 8 ? 7 : 3;
      const digging = G.dig > 0 && G.dig < 1.3;
      F.dog(g, { x: G.bx, y: GY + 4 + (digging ? Math.abs(Math.sin(t * 22)) * 4 : 0), s: 300, walk: G.moving ? t * 16 : null, sit: G.moving || digging ? 0 : G.near >= 3 && G.near < 9 ? 1 : 0, flip: lx(G.at) < G.bx - 1, wag: Math.sin(t * wag) * (G.near >= 3 && G.near < 9 ? 0.3 : 1), headTilt: G.near >= 3 && G.near < 9 && !G.moving ? 0.3 : digging ? 0.5 : 0, rot: digging ? 0.16 : 0 });
      if (digging) for (let i = 0; i < 5; i++) { const life = (t * 3 + i * 0.2) % 1; P.fill(g, P.circle(G.bx - 50 - life * 60, GY - 10 - Math.sin(life * Math.PI) * 50, 5), '#8a6442'); }
      /* found so far */
      G.got.forEach((ti, i) => { const x = -80 + i * 80, y = 230; P.glow(g, x, y, 50, '#fff0c0', 0.4); THING[i % THING.length](g, x, y); });
      for (let i = G.got.length; i < G.finds.length; i++) P.fill(g, P.circle(-80 + i * 80, 230, 10), 'rgba(243,234,216,0.22)');
      g.restore();
      G.hintRing(g, t);
      G.caption(g, '풀숲을 눌러 빈을 보내세요. 가까울수록 꼬리를 세게 흔들어요');
    };
    return G;
  };
})();
