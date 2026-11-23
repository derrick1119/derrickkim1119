/* Take Your Time — the garden on the slope below Leo's plot, where he and Pipi grow tomatoes.
   Rain is caught in a barrel on top of a rack of troughs. A trough tips all its water off its lower
   end; a peaked board shares it half and half; every bed wants just so many bucketfuls, no more.
   Pour too much into one bed and another goes dry; the barrel is only ever as full as the beds need.
   The garden grows a year at a time: two beds, then three, then five. */
(function () {
  'use strict';
  const T = window.TYT, P = T.P;
  const Z = T.puzzle, make = Z.make;
  const AX = 3672, SC = 0.58, COL = 80, SPD = 560, POUR = 2.4, TIP = 0.17;
  const WATER = '#a8daf4', WOOD = '#a77b52', WOOD_D = '#7d5a3b';
  /* the layouts are drawn on an 80-wide grid: k 's' shares, 't' tips toward d (+1 right, as it starts) */
  const LAYOUTS = [
    { water: 2, pieces: [{ k: 's', x: 0, y: -300 }, { k: 't', x: -80, y: -220, d: 1 }, { k: 't', x: 80, y: -220, d: 1 }],
      beds: [{ x: -160, n: 1 }, { x: 0, n: 1 }] },
    { water: 4, pieces: [{ k: 's', x: 0, y: -330 }, { k: 't', x: -80, y: -260, d: 1 }, { k: 't', x: 80, y: -260, d: 1 }, { k: 's', x: -160, y: -195 }, { k: 't', x: 0, y: -160, d: -1 }],
      beds: [{ x: -240, n: 1 }, { x: -80, n: 1 }, { x: 80, n: 2 }] },
    { water: 8, pieces: [{ k: 's', x: 0, y: -330 }, { k: 's', x: -80, y: -260 }, { k: 't', x: 80, y: -260, d: -1 }, { k: 't', x: -160, y: -195, d: 1 }, { k: 't', x: 0, y: -195, d: 1 },
      { k: 's', x: 160, y: -130 }, { k: 's', x: -80, y: -65 }, { k: 't', x: 80, y: -65, d: -1 }],
      beds: [{ x: -240, n: 2 }, { x: -160, n: 1 }, { x: 0, n: 1 }, { x: 160, n: 2 }, { x: 240, n: 2 }] },
  ];
  const W = () => T.world;
  const WY = () => Math.min(W().y3(AX - 290 * SC), W().y3(AX), W().y3(AX + 290 * SC)) - 28;
  const ground = (lx) => (W().y3(AX + lx * SC) - WY()) / SC;
  const rim = (b) => ground(b.x) - 36;

  /* where the water goes, and when: falls, runs along boards, and what each bed gets */
  function flow(L, dirs) {
    const got = L.beds.map(() => 0), into = [], falls = [], runs = [], spills = [];
    function drop(x, y, amt, t) {
      let best = -1, by = Infinity;
      L.pieces.forEach((p, i) => { if (p.y > y + 1 && p.y < by && Math.abs(x - p.x) < COL - 12) { best = i; by = p.y; } });
      if (best < 0) {
        const b = L.beds.findIndex((q) => Math.abs(q.x - x) <= 34), y1 = b >= 0 ? rim(L.beds[b]) : ground(x), t1 = t + (y1 - y) / SPD;
        falls.push({ x, y0: y, y1, amt, t0: t });
        if (b >= 0) { got[b] += amt; into.push({ b, amt, t: t1 }); } else spills.push({ x, y: y1, amt, t: t1 });
        return;
      }
      const p = L.pieces[best], tf = t + (p.y - 10 - y) / SPD;
      falls.push({ x, y0: y, y1: p.y - 10, amt, t0: t });
      if (p.k === 's') { runs.push({ i: best, dir: 0, amt, t: tf }); drop(p.x - COL, p.y + 6, amt / 2, tf + 0.16); drop(p.x + COL, p.y + 6, amt / 2, tf + 0.16); }
      else { runs.push({ i: best, dir: dirs[best], amt, t: tf }); drop(p.x + dirs[best] * COL, p.y + 4 + COL * Math.sin(TIP), amt, tf + 0.2); }
    }
    drop(0, -372, L.water, 0);
    let end = POUR;
    falls.forEach((f) => { end = Math.max(end, f.t0 + POUR + (f.y1 - f.y0) / SPD); });
    return { got, into, falls, runs, spills, end: end + 0.25, waste: spills.reduce((s, q) => s + q.amt, 0) };
  }
  function answer(L) {
    const tilts = L.pieces.map((p, i) => (p.k === 't' ? i : -1)).filter((i) => i >= 0);
    for (let m = 0; m < 1 << tilts.length; m++) {
      const dirs = L.pieces.map((p) => p.d || 0);
      tilts.forEach((i, b) => { dirs[i] = m & (1 << b) ? 1 : -1; });
      const r = flow(L, dirs);
      if (r.waste < 0.01 && r.got.every((v, i) => Math.abs(v - L.beds[i].n) < 0.01)) return dirs;
    }
    return null;
  }

  function drip(g, x, y, r, full, col) {
    const p = new Path2D();
    p.moveTo(x, y - r * 1.5); p.bezierCurveTo(x + r * 0.9, y - r * 0.4, x + r, y + r * 0.9, x, y + r); p.bezierCurveTo(x - r, y + r * 0.9, x - r * 0.9, y - r * 0.4, x, y - r * 1.5);
    g.fillStyle = 'rgba(255,252,244,0.92)'; g.fill(p);
    if (full > 0) { g.save(); g.clip(p); g.fillStyle = col || '#5fb4ea'; g.fillRect(x - r, y + r - 2.6 * r * T.clamp(full), r * 2, 2.6 * r); g.restore(); }
    g.lineWidth = Math.max(2, r * 0.28); g.strokeStyle = '#2f4a66'; g.stroke(p);
  }
  function plant(g, x, y, k, t, seed) {
    if (k <= 0.01) return;
    const h = 20 + 46 * k, sw = Math.sin(t * 1.3 + seed) * 2;
    P.line(g, x + 12, y, x + 12, y - h - 8, 2.6, '#c9a878');   /* the stake */
    P.line(g, x, y, x + sw, y - h, 3.4, '#5f8f4a');
    for (let i = 0; i < 4; i++) { if (k < i * 0.22) break; const yy = y - 12 - i * h * 0.24, s = i % 2 ? 1 : -1; P.fill(g, P.ellipse(x + sw + s * 12, yy, 12, 6, s * 0.5), i % 2 ? '#6fa35c' : '#5f9a52'); }
    if (k > 0.6) for (let i = 0; i < 3; i++) { const fk = T.clamp((k - 0.6) / 0.4 - i * 0.2); if (fk <= 0) continue; P.fill(g, P.circle(x + sw + (i - 1) * 10, y - h * (0.42 + (i % 2) * 0.18), 4 + 3.2 * fk), T.mix('#9ab86a', '#d9483a', fk)); }
  }
  function frame(g, L) {
    const lo = -290, hi = 290, top = -386;
    [lo, hi].forEach((x) => { P.fill(g, P.rr(x - 7, top, 14, ground(x) - top + 6, 4), WOOD_D); });
    const ys = Array.from(new Set(L.pieces.map((p) => p.y)));
    ys.forEach((y) => { g.globalAlpha *= 0.55; P.fill(g, P.rr(lo, y + 16, hi - lo, 6, 3), WOOD_D); g.globalAlpha /= 0.55; });
    P.fill(g, P.rr(lo - 6, top - 6, hi - lo + 12, 12, 5), WOOD);
  }
  function barrel(g, L, level, open, t) {
    const y = -386;
    P.fill(g, P.rr(-44, y - 96, 88, 96, 16), '#8f6a44');
    for (let i = 0; i < 3; i++) P.fill(g, P.rr(-46, y - 86 + i * 34, 92, 6, 3), '#5a4a46');
    P.fill(g, P.ellipse(0, y - 96, 44, 9), '#6d5236');
    P.fill(g, P.ellipse(0, y - 96, 38, 6), T.mix('#4f6f86', WATER, level));
    P.fill(g, P.rr(-6, y - 4, 12, 16, 3), '#5a4a46');
    P.fill(g, P.rr(-16, y - 20, 32, 6, 3), open ? '#c9573f' : '#7d5a3b');
    const n = L.water, gap = n > 4 ? 19 : 26;
    for (let i = 0; i < n; i++) drip(g, -((n - 1) * gap) / 2 + i * gap, y - 50, n > 4 ? 7 : 9, T.clamp(level * n - i));
    void t;
  }
  function board(g, p, ang, wet, t) {
    g.save(); g.translate(p.x, p.y);
    if (p.k === 's') {
      P.fill(g, P.poly([[-COL + 10, 8], [0, -10], [COL - 10, 8], [COL - 10, 16], [0, -1], [-COL + 10, 16]]), WOOD);
      P.fill(g, P.poly([[-COL + 10, 8], [0, -10], [0, -4], [-COL + 10, 12]]), '#c49a6c');
      if (wet > 0) { g.globalAlpha *= wet; P.line(g, -COL + 14, 6, 0, -8, 3.6, WATER); P.line(g, 0, -8, COL - 14, 6, 3.6, WATER); g.globalAlpha /= wet; }
      P.fill(g, P.circle(0, -6, 4), WOOD_D);
    } else {
      g.rotate(ang);
      P.fill(g, P.rr(-COL + 6, -8, (COL - 6) * 2, 16, 6), WOOD);
      P.fill(g, P.rr(-COL + 6, -8, (COL - 6) * 2, 5, 3), '#c49a6c');
      if (wet > 0) { g.globalAlpha *= wet; P.line(g, -COL + 14, -6, COL - 14, -6, 4, WATER); g.globalAlpha /= wet; }
      P.fill(g, P.circle(0, 0, 4.5), WOOD_D);
    }
    g.restore();
    void t;
  }
  function bed(g, b, fill, k, t, i, bad, still) {
    const y = rim(b), gy = ground(b.x);
    P.fill(g, P.rr(b.x - 36, y, 72, gy - y + 4, 6), '#8a5e3c');
    P.fill(g, P.rr(b.x - 32, y + 4, 64, 14, 5), T.mix('#7a5236', '#4a3426', T.clamp(fill / Math.max(1, b.n))));
    P.fill(g, P.rr(b.x - 36, y - 2, 72, 7, 3), '#a77b52');
    plant(g, b.x - 8, y + 4, k, t, i * 1.7);
    if (!still) {
    P.line(g, b.x + 30, y + 2, b.x + 30, y - 40, 3, '#7d5a3b'); P.fill(g, P.rr(b.x + 30 - (b.n * 15 + 8), y - 66, b.n * 30 + 16, 34, 6), '#f3e6c8');
    for (let j = 0; j < b.n; j++) drip(g, b.x + 30 - ((b.n - 1) * 30) / 2 + j * 30, y - 50, 10, T.clamp(fill - j), bad && fill > b.n ? '#ef8a70' : null);
    }
    if (fill > b.n + 0.05) { for (let j = 0; j < 4; j++) { const ph = (t * 1.6 + j / 4) % 1; P.fill(g, P.circle(b.x + (j % 2 ? 40 : -40) + (j % 2 ? 1 : -1) * ph * 18, y + ph * 30, 3), T.rgba(WATER, 1 - ph)); } }
  }

  /* o: { which: 0 | 1 | 2 } */
  Z.trough = function (o) {
    const L = LAYOUTS[o.which || 0], SOL = answer(L);
    const tilts = L.pieces.map((p, i) => (p.k === 't' ? i : -1)).filter((i) => i >= 0);
    const G = make({ garden: true, dir: L.pieces.map((p) => p.d || 0), ang: L.pieces.map((p) => (p.d || 0) * TIP), pour: null, fill: L.beds.map(() => 0), level: 1, grow: 0, busy: false, tries: 0 });
    const at = () => { const q = W().toScreen(AX, WY()), z = W().S.cam.z * SC; return [q[0], q[1], z]; };
    const toLocal = (x, y) => { const a = at(); return [(x - a[0]) / a[2], (y - a[1]) / a[2]]; };
    const toScr = (lx, ly) => { const a = at(); return [a[0] + lx * a[2], a[1] + ly * a[2]]; };
    G.keyOf = (key) => (key === ' ' || key === 'Enter' ? 99 : key >= '1' && key <= String(tilts.length) ? +key - 1 : -1);
    G.hit = function (x, y) {
      const [lx, ly] = toLocal(x, y);
      if (Math.abs(lx) < 56 && ly > -486 && ly < -366) return 99;
      for (let n = 0; n < tilts.length; n++) { const p = L.pieces[tilts[n]]; if (Math.abs(lx - p.x) < COL && Math.abs(ly - p.y) < 30) return n; }
      if (L.pieces.some((p) => p.k === 's' && Math.abs(lx - p.x) < COL && Math.abs(ly - p.y) < 30)) return 98;
      return -1;
    };
    G.tap = function (n) {
      if (G.done || G.busy) return;
      G.idle = 0;
      if (n === 98) { G.wrong('뾰족한 갈림판은 고정돼 있어요. 물을 반씩 나눠 보내요'); return; }
      if (n === 99) { pour(); return; }
      const i = tilts[n];
      G.dir[i] = -G.dir[i]; G.say = '';
      T.audio.sfx('knock', 0.3 + n * 0.1);
      G.clock.tween(G.ang, i, G.dir[i] * TIP, 0.22, T.ease.out);
    };
    function pour() {
      G.busy = true; G.say = '';
      const r = flow(L, G.dir);
      G.pour = Object.assign(r, { t: 0 });
      T.audio.sfx('pour', 0.6); T.audio.sfx('whoosh');
    }
    function judge() {
      const r = G.pour, over = r.got.some((v, i) => v > L.beds[i].n + 0.01), under = r.got.some((v, i) => v < L.beds[i].n - 0.01);
      if (r.waste < 0.01 && !over && !under) {
        T.audio.promise();
        G.say = '';
        /* the first year only sprouts come up; fruit is for later years (the scene after shows the same) */
        G.clock.tween(G, 'grow', o.grow != null ? o.grow : [0.35, 0.5, 1][o.which || 0], 2.2, T.ease.out).then(() => G.finish(1.4));
        return;
      }
      G.tries++;
      G.wrong(r.waste > 0.01 ? '물 한 줄기가 고랑 밖으로 샜어요. 판자를 다시 맞춰 보세요'
        : over ? '한 고랑은 넘치고, 다른 고랑은 말랐어요. 물방울 수를 세어 보세요'
        : '물이 모자란 고랑이 있어요. 판자를 다시 맞춰 보세요');
      G.clock.wait(2.2).then(() => {
        /* the sun dries the beds, and the next rain fills the barrel again */
        G.clock.tween(G, 'level', 1, 1.2);
        L.beds.forEach((b, i) => G.clock.tween(G.fill, i, 0, 1.2));
        return G.clock.wait(1.3);
      }).then(() => { G.pour = null; G.busy = false; });
    }
    const up = G.update;
    G.update = function (dt) {
      up(dt);
      const r = G.pour;
      if (!r || r.judged) return;
      r.t += dt;
      G.level = 1 - T.clamp(r.t / POUR);
      L.beds.forEach((b, i) => { G.fill[i] = r.into.filter((q) => q.b === i).reduce((s, q) => s + q.amt * T.clamp((r.t - q.t) / POUR), 0); });
      if (r.t >= r.end) { r.judged = true; judge(); }
    };
    G.next = () => {
      if (G.done || G.busy || !SOL) return null;
      const n = tilts.findIndex((i) => G.dir[i] !== SOL[i]);
      return n >= 0 ? String(n + 1) : ' ';
    };
    G.hintAt = () => {
      if (!SOL) return null;
      const n = tilts.findIndex((i) => G.dir[i] !== SOL[i]);
      return n >= 0 ? toScr(L.pieces[tilts[n]].x, L.pieces[tilts[n]].y) : toScr(0, -430);
    };
    G.draw = function (g, t) {
      if (G.a < 0.005) return;
      const a = at();
      g.save(); g.globalAlpha = G.a; g.translate(a[0] + G.jig(t, 0), a[1]); g.scale(a[2], a[2]);
      frame(g, L);
      const r = G.pour, tt = r ? r.t : -1;
      L.pieces.forEach((p, i) => {
        const run = r && r.runs.filter((q) => q.i === i && tt >= q.t && tt <= q.t + POUR + 0.3);
        board(g, p, G.ang[i], run && run.length ? 1 : 0, t);
      });
      L.beds.forEach((b, i) => bed(g, b, G.fill[i], G.grow * (b.n > 0 ? 1 : 0), t, i, r && r.judged));
      if (r) {
        g.lineCap = 'round';
        for (const f of r.falls) {
          const head = Math.min(f.y1, f.y0 + Math.max(0, tt - f.t0) * SPD), tail = Math.min(f.y1, f.y0 + Math.max(0, tt - f.t0 - POUR) * SPD);
          if (head - tail < 1) continue;
          g.strokeStyle = T.rgba(WATER, 0.85); g.lineWidth = 3 + f.amt * 2.2;
          g.beginPath(); g.moveTo(f.x + Math.sin(t * 20 + f.x) * 0.8, tail); g.lineTo(f.x, head); g.stroke();
        }
        for (const s of r.spills) { if (tt < s.t || tt > s.t + POUR + 0.4) continue; for (let j = 0; j < 5; j++) { const ph = (t * 2 + j / 5) % 1; P.fill(g, P.circle(s.x + (j - 2) * 9 * ph * 2, s.y - Math.sin(ph * Math.PI) * 22, 3.4), T.rgba(WATER, 1 - ph)); } }
      }
      barrel(g, L, G.level, r && tt < POUR, t);
      g.restore();
      G.hintRing(g, t);
      G.caption(g, G.busy ? (G.say || '물이 흐른다…') : o.caption || '판자를 눌러 기울이고, 물통을 눌러 부으세요. 고랑마다 물방울 수만큼 들어가야 해요');
    };
    return G;
  };

  /* the garden as it stands between years: o.which's beds, their plants, the rack with its boards set right */
  Z.patchDraw = function (g, ps) {
    const L = LAYOUTS[ps.patch - 1];
    if (!L || ps.patchHide) return;
    const SOL = answer(L), t = T.time;
    g.save(); g.translate(AX, WY()); g.scale(SC, SC);
    frame(g, L);
    L.pieces.forEach((p, i) => board(g, p, (SOL[i] || 0) * TIP, 0, t));
    L.beds.forEach((b, i) => bed(g, b, 0, ps.fruit == null ? 1 : ps.fruit, t, i, false, true));
    barrel(g, L, 1, false, t);
    g.restore();
  };
  Z.patchSpot = (which) => { const L = LAYOUTS[which || 0], b = L.beds[L.beds.length - 1]; return [AX + b.x * SC, WY() + (rim(b) - 40) * SC]; };
  Z.patchCam = () => [AX - 20, WY() - 55];   /* at zoom PATCH_Z */
  Z.PATCH_Z = 1.65;
  Z.PATCH_X = AX;
})();
