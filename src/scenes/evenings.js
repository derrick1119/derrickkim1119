/* Take Your Time — two evening puzzles that bracket the forty-five years.
   Chapter 2: waiting with Pipi on the quay, finding the pictures she draws among the stars.
   The last chapter: knitting Rosa's yarn with Ana, a stripe for every story, told in the order it happened. */
(function () {
  'use strict';
  const T = window.TYT, P = T.P;
  const Z = T.puzzle, make = Z.make;
  const TAU = Math.PI * 2;

  /* ---------- the stars ----------
     o.rounds: [{ name, pts: [[x,y]...], edges: [[i,j]...], at: [x,y], scale, rot, filler }] */
  Z.stars = function (o) {
    const G = make({ r: 0, stars: [], sel: [], lines: 0, phase: 'look', tw: 0 });
    const R = () => o.rounds[Math.min(G.r, o.rounds.length - 1)];
    let W0 = 1600;
    function lay() {
      W0 = T.view.W;
      const q = R(), rng = T.rng(31 + G.r * 7), c = Math.cos(q.rot || 0), s = Math.sin(q.rot || 0), sc = q.scale || 1;
      G.stars = q.pts.map((p, i) => ({ x: q.at[0] + (p[0] * c - p[1] * s) * sc, y: q.at[1] + (p[0] * s + p[1] * c) * sc, mine: i, ph: rng() * TAU, r: 3.2 + rng() * 1.6 }));
      let tries = 0;
      while (G.stars.length < q.pts.length + q.filler && tries++ < 4000) {
        const x = -560 + rng() * 1120, y = 90 + rng() * 520;
        if (x < -W0 / 2 + 340 && y > 500) continue;
        if (G.stars.some((t) => Math.hypot(t.x - x, t.y - y) < 54)) continue;
        G.stars.push({ x, y, mine: -1, ph: rng() * TAU, r: 2.4 + rng() * 2.4 });
      }
      G.sel = []; G.lines = 0; G.phase = 'look'; G.idle = 0;
    }
    G.start = () => lay();
    const near = (x, y) => { let b = -1, bd = 36; G.stars.forEach((t, i) => { const d = Math.hypot(x - t.x, y - t.y); if (d < bd) { bd = d; b = i; } }); return b; };
    G.hit = (x, y) => near(x, y);
    G.keyOf = (key) => (key === ' ' || key === 'Enter' ? 999 : -1);
    function check() {
      const want = R().pts.length;
      if (G.sel.length < want) return;
      if (G.sel.every((i) => G.stars[i].mine >= 0)) {
        G.phase = 'join'; T.audio.promise();
        G.clock.tween(G, 'lines', 1, 1.4, T.ease.io).then(() => G.clock.wait(1.2)).then(() => {
          G.r++;
          if (G.r >= o.rounds.length) G.finish(0.8); else lay();
        });
      } else {
        G.wrong('그림이랑 모양이 달라요. 피피의 그림을 다시 봐요');
        G.phase = 'oops';
        G.clock.wait(0.7).then(() => { G.sel = []; G.phase = 'look'; });
      }
    }
    G.tap = function (n) {
      if (G.done || G.phase !== 'look') return;
      G.idle = 0;
      if (n === 999) {   /* the keyboard: let go of a wrong star, or take the next right one */
        const bad = G.sel.findIndex((i) => G.stars[i].mine < 0);
        if (bad >= 0) { G.sel.splice(bad, 1); return; }
        n = G.stars.findIndex((t, i) => t.mine >= 0 && !G.sel.includes(i));
        if (n < 0) return;
      }
      const k = G.sel.indexOf(n);
      if (k >= 0) { G.sel.splice(k, 1); T.audio.sfx('touch'); return; }
      G.sel.push(n); G.say = '';
      T.audio.step(G.sel.length * 2 + G.r, { voice: 'glass', vel: 0.32 });
      check();
    };
    G.next = () => (G.done || G.phase !== 'look' ? null : 'Enter');
    G.hintAt = () => { if (G.phase !== 'look') return null; const t = G.stars.find((s, i) => s.mine >= 0 && !G.sel.includes(i)); return t ? [t.x, t.y] : null; };
    G.draw = function (g, t) {
      if (G.a < 0.005) return;
      const V = T.view, W = V.W, q = R();
      g.save(); g.globalAlpha = G.a;
      const sky = g.createLinearGradient(0, 0, 0, 900); sky.addColorStop(0, '#141b36'); sky.addColorStop(0.7, '#2a2f58'); sky.addColorStop(1, '#4a3f6a');
      g.fillStyle = sky; g.fillRect(-W / 2, 0, W, 900);
      const rr = T.rng(5); for (let i = 0; i < 140; i++) P.fill(g, P.circle(rr() * W - W / 2, rr() * 640, 0.8 + rr() * 1.1), T.rgba('#f6f0ff', 0.25 + 0.25 * Math.sin(t * 1.3 + i)));
      /* the quay's edge, and the two of them sitting on it */
      P.fill(g, P.rr(-W / 2, 820, W, 80, 0), '#2a2436');
      /* lines, once the picture is found */
      if (G.lines > 0) {
        g.strokeStyle = T.rgba('#fff0c8', 0.85); g.lineWidth = 2.6; g.lineCap = 'round';
        const L = q.edges.length, upto = G.lines * L;
        q.edges.forEach((e, i) => {
          const k = T.clamp(upto - i); if (k <= 0) return;
          const a = G.stars.find((s) => s.mine === e[0]), b = G.stars.find((s) => s.mine === e[1]);
          g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(T.lerp(a.x, b.x, k), T.lerp(a.y, b.y, k)); g.stroke();
        });
      }
      G.stars.forEach((s, i) => {
        const on = G.sel.includes(i), tw = 0.75 + 0.25 * Math.sin(t * 2.2 + s.ph);
        if (on) { P.glow(g, s.x, s.y, 30, G.phase === 'oops' && s.mine < 0 ? '#ff9a8a' : '#fff0c8', 0.8); g.strokeStyle = 'rgba(255,240,200,0.8)'; g.lineWidth = 1.6; g.beginPath(); g.arc(s.x, s.y, 13, 0, TAU); g.stroke(); }
        P.glow(g, s.x, s.y, s.r * 4, '#e8e4ff', 0.35 * tw);
        P.fill(g, P.circle(s.x, s.y, s.r * (on ? 1.3 : 1)), '#fbf8ff');
      });
      /* Pipi's drawing of what to look for */
      g.save(); g.translate(-W / 2 + 175, 690); g.rotate(-0.04); g.scale(1.25, 1.25);
      P.fill(g, P.rr(-110, -92, 220, 184, 6), '#fbf4e2');
      const sc = 0.62;
      g.strokeStyle = '#c9573f'; g.lineWidth = 3; g.lineCap = 'round';
      q.edges.forEach((e) => { const a = q.pts[e[0]], b = q.pts[e[1]]; g.beginPath(); g.moveTo(a[0] * sc, a[1] * sc - 6); g.lineTo(b[0] * sc, b[1] * sc - 6); g.stroke(); });
      q.pts.forEach((p) => P.fill(g, P.circle(p[0] * sc, p[1] * sc - 6, 4.2), '#d7a23c'));
      P.text(g, q.name, 0, 76, { size: 30, color: '#3f6f9a', seed: 3 + G.r });
      g.restore();
      for (let k = 0; k < o.rounds.length; k++) P.fill(g, P.circle(-((o.rounds.length - 1) * 26) / 2 + k * 26, 806, 7), k < G.r ? '#ffd98a' : k === G.r ? '#fbf6ff' : 'rgba(251,246,255,0.35)');
      g.restore();
      G.hintRing(g, t);
      G.caption(g, q.rot ? '이번 별자리는 기울어져 있어요. 그림과 같은 모양이 되는 별을 눌러 고르세요' : '피피가 그린 모양을 하늘에서 찾아, 그 별들을 눌러 고르세요');
    };
    return G;
  };

  /* ---------- the story blanket ----------
     o.items: [{ name, c, icon }] in the order things happened; offered shuffled by o.order */
  const ICON = {
    stone(g) { P.fill(g, P.rr(-14, -8, 28, 16, 5), '#a9a39a'); P.fill(g, P.rr(-10, -6, 12, 4, 2), 'rgba(255,255,255,0.4)'); },
    firefly(g, t) { P.glow(g, 0, 0, 16, '#d8ff9a', 0.7 + 0.2 * Math.sin(t * 5)); P.fill(g, P.circle(0, 0, 4), '#f4ffd6'); },
    dog(g) { P.fill(g, P.circle(0, 2, 12), '#f6f2ea'); P.fill(g, P.ellipse(-10, -4, 4, 8, 0.4), '#e3d8c8'); P.fill(g, P.ellipse(10, -4, 4, 8, -0.4), '#e3d8c8'); P.fill(g, P.circle(-4, 0, 1.6), '#3d3a5c'); P.fill(g, P.circle(4, 0, 1.6), '#3d3a5c'); P.fill(g, P.circle(0, 5, 2.2), '#3d3a5c'); },
    roof(g) { P.fill(g, P.poly([[-16, 6], [0, -12], [16, 6]]), '#d7a23c'); P.fill(g, P.rr(-11, 6, 22, 10, 2), '#f8eed6'); },
    bouquet(g) { [['#e58aa0', -5, -4], ['#f6f0e0', 5, -6], ['#f1c04a', 0, 3], ['#f6b6c2', -7, 5], ['#e58aa0', 7, 4]].forEach((q) => P.fill(g, P.circle(q[1], q[2], 5), q[0])); },
    tomato(g) { P.fill(g, P.circle(0, 2, 11), '#d9483a'); P.fill(g, P.poly([[-6, -8], [0, -4], [6, -8], [0, -11]]), '#5f9a52'); },
    aurora(g, t) { g.strokeStyle = '#7ff0c0'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); for (let i = 0; i <= 8; i++) { const x = -16 + i * 4, y = Math.sin(i * 0.9 + t) * 5; if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke(); },
  };
  Z.story = function (o) {
    const G = make({ i: 0, rows: [], used: [] });
    const order = o.order, X0 = (n) => (n - (order.length - 1) / 2) * 124, BY = 706;
    G.hit = (x, y) => { for (let n = 0; n < order.length; n++) if (!G.used.includes(n) && Math.hypot(x - X0(n), y - BY) < 50) return n; return -1; };
    G.tap = function (n) {
      if (G.done || n < 0 || n >= order.length || G.used.includes(n)) return;
      G.idle = 0;
      if (order[n] !== G.i) { G.wrong(o.wrong || '아나: "어, 그게 먼저였어?" 있었던 차례를 다시 떠올려 봐요'); return; }
      G.say = ''; G.used.push(n); G.rows.push({ k: 0, item: o.items[G.i] }); G.clock.tween(G.rows[G.rows.length - 1], 'k', 1, 0.7, T.ease.out);
      G.i++; T.audio.sfx('crayon'); T.audio.step(G.i + 2, { voice: 'felt', vel: 0.34 });
      if (G.i >= o.items.length) { T.audio.promise(); G.finish(1.8); }
    };
    G.next = () => (G.done ? null : String(order.indexOf(G.i) + 1));
    G.hintAt = () => (G.done ? null : [X0(order.indexOf(G.i)), BY]);
    G.draw = function (g, t) {
      if (G.a < 0.005) return;
      G.dim(g, 0.5);
      g.save(); g.globalAlpha = G.a;
      /* the blanket so far, a stripe a story */
      const SH = 44, top = 120;
      P.fill(g, P.rr(-210, top - 14, 420, o.items.length * SH + 28, 12), 'rgba(251,244,226,0.16)');
      G.rows.forEach((row, i) => {
        const y = top + i * SH, k = T.ease.out(row.k), c = row.item.c;
        g.save(); g.beginPath(); g.rect(-200, y, 400 * k, SH - 4); g.clip();
        P.fill(g, P.rr(-200, y, 400, SH - 4, 6), c);
        g.strokeStyle = T.shade(c, -0.18); g.lineWidth = 2;
        for (let x = -196; x < 200; x += 12) { g.beginPath(); g.moveTo(x, y + 8); g.lineTo(x + 6, y + SH - 12); g.lineTo(x + 12, y + 8); g.stroke(); }
        g.restore();
        if (k > 0.6) { g.save(); g.translate(-240, y + SH / 2 - 2); ICON[row.item.icon](g, t); g.restore(); P.text(g, row.item.name, 290, y + SH / 2 + 10, { size: 32, color: '#fbf4e2', alpha: T.clamp((k - 0.6) * 2.5), seed: 40 + i }); }
      });
      const ny = top + G.rows.length * SH + 6;
      P.line(g, -230, ny, 230, ny - 6, 4, '#c9c3ba'); P.line(g, -226, ny + 6, 228, ny + 2, 3, '#c9c3ba');
      /* the yarn, one ball for each story */
      order.forEach((idx, n) => {
        if (G.used.includes(n)) return;
        const it = o.items[idx], x = X0(n) + G.jig(t, n);
        P.fill(g, P.circle(x, BY, 38), it.c);
        g.strokeStyle = T.shade(it.c, -0.2); g.lineWidth = 2;
        for (let k = -2; k <= 2; k++) { g.beginPath(); g.ellipse(x, BY, 34, 12 + Math.abs(k) * 5, k * 0.5, 0, TAU); g.stroke(); }
        g.save(); g.translate(x, BY - 62); ICON[it.icon](g, t); g.restore();
        P.text(g, it.name, x, BY + 68, { font: 'serif', size: 22, color: '#fbf4e2', seed: 2 });
      });
      g.restore();
      G.hintRing(g, t);
      G.caption(g, G.i === 0 ? '아나가 "처음부터" 들려 달래요. 있었던 차례대로 실을 골라 한 줄씩 뜨세요' : '아나가 묻는다: "그다음엔?"');
    };
    return G;
  };
})();
