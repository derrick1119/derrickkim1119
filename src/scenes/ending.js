/* Take Your Time — after the white: the promises, the title, and a first sight of the sea of clouds. */
(function () {
  'use strict';
  const T = window.TYT, P = T.P, F = T.F;
  const TAU = Math.PI * 2;

  const PROMISES = ['마당 있는 넓은 집', '평생 밥해주기', '오로라 보러 가기', '릴리의 그네', '같이 늙기'];
  const INK = '#33405c';

  const S = (T.scenes.ending = {
    rows: PROMISES.map(() => ({ k: 0, a: 1 })), head: { a: 0 }, title: { a: 0 }, sea: { a: 0 }, next: { a: 0 }, again: { a: 0 },
    boat: { x: -520 }, clouds: null, canReplay: false,
  });

  function makeClouds() {
    const r = T.rng(61);
    const bank = (y, n, rMin, rMax, seed) => {
      const rr = T.rng(seed), list = [];
      for (let i = 0; i < n; i++) list.push({ x: -1300 + (i / n) * 2600 + (rr() - 0.5) * 80, y: y + (rr() - 0.5) * 34, r: rMin + rr() * (rMax - rMin) });
      return list;
    };
    S.clouds = {
      far: bank(520, 26, 46, 86, 3), mid: bank(600, 22, 70, 120, 5), near: bank(720, 18, 110, 170, 7), front: bank(860, 14, 130, 190, 9),
      wisps: Array.from({ length: 6 }, (_, i) => ({ x: -1000 + r() * 2000, y: 270 + r() * 130, w: 160 + r() * 240, s: 4 + r() * 6 })),
    };
  }

  S.enter = function () {
    if (!S.clouds) makeClouds();
    S.rows.forEach((q) => { q.k = 0; q.a = 1; });
    S.head.a = 0; S.title.a = 0; S.sea.a = 0; S.next.a = 0; S.again.a = 0; S.boat.x = -560; S.canReplay = false;
    P.grainAmt = 0.12; P.vignette = 0;
    T.audio.ambience(0.25, 0.2);
    run();
  };
  S.exit = function () { T.cursor('default'); };

  async function run() {
    const k = S.clock, A = T.audio;
    await k.wait(1.6);
    k.tween(S.head, 'a', 1, 1.2);
    await k.wait(0.9);
    T.announce('약속. ' + PROMISES.join(', '));
    for (let i = 0; i < PROMISES.length; i++) {
      if (i === PROMISES.length - 1) await k.wait(1.1);   /* the last one takes him longer to write */
      A.sfx('crayon');
      await k.tween(S.rows[i], 'k', 1, i === PROMISES.length - 1 ? 1.9 : 1.05, T.ease.lin);
      await k.wait(0.3);
    }
    await k.wait(2.4);
    for (let i = 0; i < PROMISES.length - 1; i++) k.tween(S.rows[i], 'a', 0, 1.8, T.ease.io);
    k.tween(S.head, 'a', 0, 1.8, T.ease.io);
    await k.wait(4);
    await k.tween(S.rows[PROMISES.length - 1], 'a', 0, 1.8, T.ease.io);
    await k.wait(0.4);
    T.announce('천천히 와. Take Your Time. 프롤로그 끝.');
    A.pad(0, 0.16);
    A.motif({ voice: 'box', vel: 0.36, beat: 0.86 });
    k.tween(S.title, 'a', 1, 2.2, T.ease.io);
    await k.wait(2.6);
    k.tween(S.sea, 'a', 1, 5, T.ease.io);
    A.theme({ voice: 'box', vel: 0.32, beat: 0.9, at: 2.2 });
    await k.wait(6.5);
    await k.tween(S.title, 'a', 0, 2, T.ease.io);
    k.tween(S.next, 'a', 1, 2, T.ease.io);
    await k.wait(2.2);
    k.tween(S.again, 'a', 1, 1.4, T.ease.io);
    S.canReplay = true;
  }

  S.replay = function () {
    if (!S.canReplay || T.director.busy()) return;
    S.canReplay = false;
    const st = T.state;
    Object.keys(st.done).forEach((id) => { st.done[id] = false; });
    st.count = 0; st.order = []; st.together = false;
    T.audio.pad(null);
    T.director.go('room', { style: 'fade', color: '#161d2a', out: 1.6, in: 1.6, args: { title: true } });
  };
  /* on into chapter one */
  S.next1 = function () {
    if (!S.canReplay || T.director.busy()) return;
    S.canReplay = false;
    T.audio.pad(null);
    T.director.go('kitchen', { style: 'fade', color: '#0f1522', out: 1.8, in: 1.6 });
  };
  const overNext = (x, y) => Math.abs(x) < 190 && Math.abs(y - 792) < 40;
  const overAgain = (x, y) => Math.abs(x) < 150 && Math.abs(y - 858) < 20;
  S.pointer = function (type, x, y) {
    const a = S.canReplay && overNext(x, y), b = S.canReplay && overAgain(x, y);
    T.cursor(a || b ? 'pointer' : 'default');
    if (type === 'down' && a) S.next1(); else if (type === 'down' && b) S.replay();
  };
  S.key = function (key) {
    if (!S.canReplay) return false;
    if (key === ' ' || key === 'Enter') S.next1(); else if (key === 'r' || key === 'R') S.replay(); else return false;
  };

  S.update = function (dt) { if (S.sea.a > 0) S.boat.x += dt * 9; };

  function bankPath(list, ox, bob) {
    const p = new Path2D();
    for (const c of list) { p.moveTo(c.x + ox + c.r, c.y + bob); p.arc(c.x + ox, c.y + bob, c.r, 0, TAU); }
    p.rect(-1400, list[0].y + bob, 2800, 600);
    return p;
  }

  function drawSea(g) {
    const V = T.view, W = V.W, t = T.time, a = S.sea.a;
    const [px, py] = T.par(0.6);
    g.save();
    g.globalAlpha = a;
    const sky = g.createLinearGradient(0, 0, 0, 640);
    sky.addColorStop(0, '#93a6d0'); sky.addColorStop(0.42, '#eebf9e'); sky.addColorStop(0.78, '#ffdca6'); sky.addColorStop(1, '#fff0cc');
    g.fillStyle = sky; g.fillRect(-W / 2, 0, W, 900);
    /* the light they are all sailing towards */
    P.glow(g, 380 + px * 0.2, 500, 520, '#fff2c4', 0.85 * a);
    P.glow(g, 380 + px * 0.2, 500, 150, '#ffffff', 0.7 * a);
    /* high cloud */
    g.lineCap = 'round';
    for (const w of S.clouds.wisps) {
      const x = ((w.x + t * w.s + 1200) % 2400) - 1200 + px * 0.2;
      g.strokeStyle = 'rgba(255,246,228,0.42)'; g.lineWidth = 9;
      g.beginPath(); g.moveTo(x, w.y); g.quadraticCurveTo(x + w.w / 2, w.y - 12, x + w.w, w.y + 4); g.stroke();
    }
    /* the harbour, very far off: a quay, a bell tower, someone waiting with a lamp */
    const hx = 392 + px * 0.25, hy = 468;
    g.fillStyle = 'rgba(152,120,140,0.75)';
    g.fillRect(hx - 90, hy, 210, 9);
    g.fillRect(hx + 40, hy - 62, 16, 62); g.beginPath(); g.moveTo(hx + 34, hy - 62); g.lineTo(hx + 48, hy - 84); g.lineTo(hx + 62, hy - 62); g.fill();
    g.fillRect(hx + 70, hy - 26, 34, 26); g.fillRect(hx - 6, hy - 20, 30, 20);
    g.fillRect(hx - 62, hy - 15, 4, 15); g.beginPath(); g.arc(hx - 60, hy - 18, 3.4, 0, TAU); g.fill();
    P.glow(g, hx - 54, hy - 12, 30, '#fff0b0', 0.95 * a * (0.8 + 0.2 * Math.sin(t * 2.3)));
    g.fillStyle = '#fff6cf'; g.beginPath(); g.arc(hx - 54, hy - 12, 2.2, 0, TAU); g.fill();

    const fill = (list, ox, bob, top, bot, y0) => {
      const gr = g.createLinearGradient(0, y0 - 150, 0, y0 + 200);
      gr.addColorStop(0, top); gr.addColorStop(1, bot);
      g.fillStyle = gr; g.fill(bankPath(list, ox, bob));
    };
    fill(S.clouds.far, ((t * 3) % 100) + px * 0.35, Math.sin(t * 0.3) * 3, '#fff3dc', '#e7b8b4', 520);
    /* the boat rides between two banks of cloud */
    const bx = S.boat.x + px * 0.5, by = 548 + Math.sin(t * 0.9) * 5, tilt = Math.sin(t * 0.9 + 1) * 0.04;
    g.save(); g.translate(bx, by); g.rotate(tilt);
    P.line(g, 26, -8, 26, -92, 3.5, '#6f4a34');
    P.glow(g, 26, -98, 60, '#ffe6a0', 0.85 * a);
    P.fill(g, P.rr(19, -108, 14, 18, 4), '#ffe9ae');
    F.person(g, { x: -12, y: -22, s: 118, style: F.styles.leoBed, noLegs: true, lean: 0.05, headTilt: -0.08, armF: { a: 0.9, b: 0.9 }, armB: { a: 0.6, b: 0.8 }, face: { blush: 0.15 } });
    P.fill(g, P.soft([[-66, -22], [66, -22], [84, -30], [70, 4], [44, 16], [-44, 16], [-70, 4]]), '#8a5a3b');
    P.fill(g, P.rr(-64, -24, 132, 7, 3), '#a8744c');
    g.restore();
    fill(S.clouds.mid, -((t * 6) % 118) + px * 0.6, Math.sin(t * 0.36 + 1) * 4, '#fff6e4', '#e2aeb6', 600);
    fill(S.clouds.near, ((t * 10) % 144) + px * 0.9, Math.sin(t * 0.4 + 2) * 5, '#fffaf0', '#d7a6bd', 720);
    fill(S.clouds.front, -((t * 15) % 185) + px * 1.3, Math.sin(t * 0.45 + 3) * 6, '#fffdf7', '#c9a0c2', 860);
    g.restore();
  }

  S.draw = function (g) {
    const V = T.view, W = V.W;
    g.fillStyle = '#fffaf0'; g.fillRect(-W / 2, 0, W, V.H);
    if (S.sea.a > 0.003) drawSea(g);
    P.vignette = 0.22 * S.sea.a; P.vignetteColor = '#6a4a6a';

    if (S.head.a > 0.01) P.text(g, '약속', 0, 196, { font: 'serif', size: 24, track: 22, color: INK, alpha: 0.6 * S.head.a });
    PROMISES.forEach((p, i) => {
      const q = S.rows[i];
      if (q.k <= 0 || q.a <= 0.003) return;
      const last = i === PROMISES.length - 1;
      const y = last ? 640 : 300 + i * 78;
      P.text(g, p, 0, y, { size: last ? 76 : 64, color: INK, k: q.k, alpha: q.a, seed: 3 + i });
    });
    if (S.title.a > 0.003) {
      const a = S.title.a;
      P.text(g, 'TAKE YOUR TIME', 0, 300, { font: 'serif', size: 25, track: 11, color: INK, alpha: 0.75 * a });
      P.text(g, '천천히 와', 0, 448, { size: 172, color: INK, alpha: a, seed: 2 });
    }
    if (S.next.a > 0.003) {
      P.text(g, '프롤로그 끝', 0, 150, { font: 'serif', size: 22, track: 10, color: '#4a4f6e', alpha: 0.7 * S.next.a });
      P.text(g, '1장 「항구」', 0, 222, { font: 'serif', size: 46, track: 4, color: '#3a3f5c', alpha: S.next.a });
    }
    if (S.again.a > 0.003) {
      const a = S.again.a;
      g.save(); g.globalAlpha = a;
      P.fill(g, P.rr(-150, 760, 300, 62, 31), 'rgba(58,63,92,0.78)');
      g.restore();
      P.text(g, '이어서 보기', 0, 800, { font: 'serif', size: 26, color: '#fff6e4', alpha: a });
      P.text(g, '처음부터 다시 보기', 0, 864, { font: 'serif', size: 19, color: '#4a4f6e', alpha: 0.85 * a });
    }
  };
})();
