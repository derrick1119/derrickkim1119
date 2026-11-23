/* Take Your Time — the dance Rosa's son owes his wife, practised on the quay (chapter 5).
   At their wedding there was no money for music; she said she would hum it herself and asked for one dance,
   and with everyone looking his feet would not leave the ground. Now he has chalked the steps on the boards,
   Rosa hums her lullaby in three-four, and Leo counts. One step a bar, on 「하나」.
   The floor is shown from above the way the boards lie: the end of the pier, where she will stand, on the left,
   so the arrows go the way he does (left is towards her, right is back, up and down are to either side). The pattern grows round by
   round; in the last round he rubs the chalk out, to look at her and not at the floor.
   A miss costs nothing: he stumbles, Rosa laughs, Leo counts a little slower, and in the round without chalk
   the next footprint shows again, faintly. */
(function () {
  'use strict';
  const T = window.TYT, P = T.P, F = T.F;
  const Z = T.puzzle, make = Z.make;
  const TAU = Math.PI * 2;
  const INK = '#f3ead8', CHALK = '#fbf6ea', ROSE = '#f2a7b8';
  const DIR = [[-1, 0], [0, -1], [1, 0], [0, 1]], KEYS = ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'];
  const now = () => { const s = T.director && T.director.cur; return s && s.clock ? s.clock.t : T.time; };
  const ease = (k) => T.ease.io(T.clamp(k));

  /* ---------- a dancer: the feet and the empty hold, for an actor on the stage ----------
     The floor is three places deep (0 nearest the sea … 2) and two across (0 far, 1 near); a step moves him one
     place. Each step goes in two halves: the leading foot, then the other closing to it. o: { start: [col, row],
     look (above 0 his head is down at the floor, below 0 up at her), hold (0 arms down … 1 arms round someone who is not there yet) } */
  function dancer(a, o = {}) {
    const D = { a, cell: (o.start || [1, 1]).slice(), from: null, to: null, t0: -99, dur: 1, lead: 'F', st0: -99, sc0: -99, scDur: 1.6, look: o.look == null ? 0.2 : o.look, hold: o.hold == null ? 1 : o.hold, gap: o.gap || [22, 4] };
    D.wx = (c) => (c[0] - 1) * D.gap[0];
    D.wy = (c) => (c[1] - 0.5) * 2 * D.gap[1];
    D.k = () => T.clamp((now() - D.t0) / D.dur);
    D.step = function (dir, beat) {
      const d = DIR[dir];
      D.from = D.cell.slice(); D.to = [D.cell[0] + d[0], D.cell[1] + d[1]]; D.cell = D.to.slice();
      D.t0 = now(); D.dur = 1.5 * (beat || 0.85);
      /* the left foot leads towards her and to his left; the right foot leads back and to his right */
      const fwd = d[0] !== 0 && (d[0] < 0) === !!a.flip;
      D.lead = d[0] !== 0 ? (fwd ? 'F' : 'B') : d[1] > 0 === !!a.flip ? 'F' : 'B';
    };
    D.stumble = function () { D.st0 = now(); };
    D.scuff = function (sec) { D.sc0 = now(); D.scDur = sec || 1.6; };
    /* the two feet on the floor plan, [col, row] each, and how high each is lifted */
    D.feet = function () {
      const c0 = D.from || D.cell, c1 = D.to || D.cell, k = D.from ? D.k() : 1;
      const lr = T.clamp(k / 0.6), tr = T.clamp((k - 0.4) / 0.6);
      const at = (r) => ({ c: T.lerp(c0[0], c1[0], ease(r)), r: T.lerp(c0[1], c1[1], ease(r)), up: Math.sin(r * Math.PI) });
      const lead = at(lr), trail = at(tr);
      return D.lead === 'F' ? { F: lead, B: trail } : { F: trail, B: lead };
    };
    D.pose = function (oo, aa, t) {
      const u = aa.s / 100, gy = T.world.groundAt(aa.x);
      const c0 = D.from || D.cell, c1 = D.to || D.cell, k = D.from ? D.k() : 1, kb = ease(k);
      oo.x = aa.x + T.lerp(D.wx(c0), D.wx(c1), kb);
      oo.y += T.lerp(D.wy(c0), D.wy(c1), kb);
      const ft = D.feet();
      const foot = (q, side) => { const fx = aa.x + (q.c - 1) * D.gap[0], fy = gy + (q.r - 0.5) * 2 * D.gap[1] - q.up * 6 * u; const L = F.local(oo, fx, fy); return { foot: [L[0] + side, L[1]] }; };
      oo.legF = foot(ft.F, 1.6); oo.legB = foot(ft.B, -1.6);
      oo.lean = (aa.lean || 0) + 0.02 * Math.sin(t * 2.1) + (D.from && k < 1 ? 0.03 * Math.sin(k * Math.PI) : 0);
      oo.headTilt = (oo.headTilt || 0) + D.look;
      oo.face.mouth = D.look > 0.1 ? 'line' : 'smile';
      /* the hold: his left hand up for hers, his right round her back */
      const h = T.clamp(D.hold);
      if (h > 0.01) {
        const sw = Math.sin(t * 1.7) * 1.1 * h;
        oo.armF = { hand: [T.lerp(3, 25, h), T.lerp(5, -37, h) + sw] };
        oo.armB = { hand: [T.lerp(0.5, 19, h), T.lerp(5, -12, h)] };
      }
      /* rubbing the chalk out with the toe of his shoe */
      const sc = now() - D.sc0;
      if (sc >= 0 && sc < D.scDur) {
        const w = Math.sin(Math.PI * sc / D.scDur);
        oo.legF = { foot: [3 + Math.sin(sc * 13) * 8 * w, 49 - 2.5 * w] };
        oo.headTilt += 0.22 * w; oo.lean += 0.05 * w;
      }
      /* a stumble: the foot catches, the arms go up, and back he comes */
      const st = T.clamp(1 - (now() - D.st0) / 0.9);
      if (st > 0) {
        const w = Math.sin(st * Math.PI);
        oo.lean -= 0.2 * w; oo.headTilt -= 0.22 * w; oo.x += Math.sin((1 - st) * 20) * 2.4 * w;
        oo.armF = { a: 0.4 + 2.1 * w, b: 0.5 }; oo.armB = { a: 0.3 + 1.6 * w, b: 0.7 };
        oo.legF = { foot: [5 + 6 * w, 49 - 5 * w] };
        oo.face.eye = 'closed'; oo.face.mouth = 'open';
      }
    };
    return D;
  }

  /* two people swaying through the same small box together, for a dance that is not practice any more:
     returns this moment's [dx, dy, lift of the leading foot (0..1)]. Both partners use the same clock, so the
     two of them go the same way at once (when he goes forward she goes back). o: { beat, gap } */
  function sway(t, o = {}) {
    const beat = o.beat || 0.9, gap = o.gap || [8, 2.5], BOX = [[1, 1], [0, 1], [0, 0], [1, 0]];
    const bars = t / (beat * 3), b = Math.floor(bars), k = T.clamp(((bars - b) * 3) / 1.5);
    const c0 = BOX[((b % 4) + 4) % 4], c1 = BOX[(((b + 1) % 4) + 4) % 4], e = ease(k);
    return [(T.lerp(c0[0], c1[0], e) - 0.5) * gap[0], (T.lerp(c0[1], c1[1], e) - 0.5) * gap[1], Math.sin(T.clamp(k / 0.6) * Math.PI)];
  }

  T.dance = { dancer, sway };

  /* ---------- the practice ----------
     o: { dancer, count (the actor who counts), hum (the actor who hums), rounds: [{ path: [dir…], beat, arrow, blind, rub }] }
     Every round starts where the dancer stands and comes back to it. */
  const CW = 120, RH = 96, GX = -60, GY = 152, HER = [-184, 200];
  const PX0 = -262, PX1 = 262, PY0 = 84, PY1 = 318;
  const cellXY = (c, r) => [GX + c * CW, GY + r * RH];
  Z.dance = function (o) {
    const D = o.dancer, rounds = o.rounds, A = T.audio;
    const G = make({ quiet: true, r: 0, i: 0, phase: 'wait', ph: 0, beat: rounds[0].beat || 0.9, last: -1, first: 1, mel0: 1, miss: 0, peek: 0, stum: 0, chalk: 1, ink: 1, laugh: 0, pulse: 0, start0: D.cell.slice() });
    const R = () => rounds[Math.min(G.r, rounds.length - 1)];
    const cellsOf = (rd) => { const out = []; let c = G.start0.slice(); for (const d of rd.path) { c = [c[0] + DIR[d][0], c[1] + DIR[d][1]]; out.push(c); } return out; };
    const target = () => { const c = D.cell, d = DIR[R().path[G.i]]; return [c[0] + d[0], c[1] + d[1]]; };
    const running = () => G.phase === 'count' || G.phase === 'dance' || G.phase === 'pause';

    function music() { G.phase = 'count'; G.ph = 0; G.first = 1; G.mel0 = 1; G.last = -1; G.i = 0; G.idle = 0; beatSound(0); }
    G.start = function () {
      G.chalk = R().blind && !R().rub ? 0 : 1;
      if (o.count) o.count.pose = (q, a, t) => { const p = G.pulse; q.armF = { a: 0.45 + 0.35 * p, b: 1.5 - 0.6 * p }; q.face.mouth = p > 0.55 ? 'open' : 'smile'; q.headTilt = 0.08 + 0.05 * Math.sin((G.ph / 3) * TAU); };
      if (o.hum) o.hum.pose = (q, a, t) => { const sw = Math.sin((G.ph / 3) * TAU); q.lean = (a.lean || 0) + 0.04 * sw; q.headTilt = 0.1 * sw; q.armF = { hand: [10, -12] }; q.armB = { hand: [8, -8] }; q.face.eye = 'happy'; q.face.mouth = G.laugh > 0.25 ? 'open' : 'smile'; if (G.laugh > 0.25) q.y += Math.sin(t * 24) * 1.3 * G.laugh; };
      if (R().rub) {   /* he rubs the chalk out first */
        G.phase = 'rub'; D.scuff(1.8); T.audio.sfx('chalk', 0.2);
        G.clock.wait(0.7).then(() => T.audio.sfx('chalk', 0.6));
        G.clock.tween(G, 'chalk', 0, 1.8, T.ease.io).then(() => G.clock.wait(0.4)).then(music);
      } else music();
      T.announce('발자국 차례: ' + R().path.map((d) => ['그 사람 쪽', '위', '뒤', '아래'][d]).join(', ') + '.');
    };

    /* the lullaby, a beat at a time: the bass on 「하나」, the chord on 「둘」 and 「셋」, and Rosa humming the tune over it */
    function beatSound(n) {
      const tune = A.tune;
      G.pulse = n % 3 === 0 ? 1 : 0.5;
      if (!tune) return;
      const k = ((n % 3) + 3) % 3, bar = Math.floor(n / 3), mb = (((bar - G.mel0) % 8) + 8) % 8;
      const humming = bar >= G.mel0, c = humming ? tune.chords[mb] : tune.chords[7], sec = G.beat / (T.pace || 1);
      A.note({ m: k === 0 ? c[0] + 12 : c[k], vel: k === 0 ? 0.22 : 0.1, voice: 'felt', dur: k === 0 ? sec * 3 : sec * 1.6 });
      if (!humming) return;
      let at = 0;
      for (const q of tune.melody[mb]) { if (at === k) A.note({ m: q[0], vel: 0.3, voice: 'hum', dur: Math.max(0.5, q[1] * sec * 1.05) }); at += q[1]; }
    }
    /* how near the beat is to the next 「하나」: [beats from it (negative before it), which bar it is] */
    const nearest = () => { const tb = Math.round(G.ph / 3); return [G.ph - tb * 3, tb]; };
    const open = () => { const [f, tb] = nearest(); return f >= -0.55 && f <= 0.5 && tb >= G.first && tb > G.last; };

    function miss(text, tb) {
      G.miss++; G.peek = 1; G.stum = 0.9; G.laugh = 1;
      if (tb != null) G.last = tb;
      G.beat = Math.min(1.12, G.beat + 0.07);   /* Leo counts a little slower */
      D.stumble();
      G.wrong(text);
    }
    G.keyOf = (key) => KEYS.indexOf(key);
    G.hit = (x, y) => {
      if (x < PX0 || x > PX1 || y < PY0 - 20 || y > PY1 + 10) return -1;
      const c = cellXY(D.cell[0], D.cell[1]), vx = x - c[0], vy = y - c[1];
      if (Math.hypot(vx, vy) < 30) return -1;
      return Math.abs(vx) * 0.8 > Math.abs(vy) ? (vx < 0 ? 0 : 2) : vy < 0 ? 1 : 3;
    };
    G.tap = function (n) {
      if (G.done || n < 0 || n > 3 || (G.phase !== 'count' && G.phase !== 'dance') || G.stum > 0) return;
      G.idle = 0;
      const [f, tb] = nearest();
      /* between one 「하나」 and the next his feet are already moving: a step there is out of time (in the count-in, it is only eagerness) */
      if (f < -0.55 || f > 0.5) { if (G.phase === 'dance') miss('「하나」에 맞춰 발을 떼요. 레오가 조금 천천히 세요'); return; }
      if (tb < G.first || tb <= G.last) return;   /* the 「하나」 of the count-in, or a bar whose step is already taken */
      if (n !== R().path[G.i]) { miss(R().blind ? '그쪽이 아니었어요. 발밑을 한 번 내려다봐요' : '그쪽이 아니에요. 빛나는 발자국 쪽으로 한 발', tb); return; }
      /* a step, on the beat */
      G.say = ''; G.last = tb; G.peek = 0;
      D.step(n, G.beat);
      T.audio.sfx('step');
      const tune = A.tune;
      if (tune) A.note({ m: tune.melody[(((tb - G.mel0) % 8) + 8) % 8][0][0], vel: 0.26, voice: 'box' });
      if (++G.i < R().path.length) return;
      /* the round is danced */
      G.r++; G.miss = 0;
      if (G.r >= rounds.length) {
        G.phase = 'end';
        G.clock.wait(0.5).then(() => { [41, 53, 60, 65, 69].forEach((m, i) => A.note({ m, at: i * 0.11, vel: 0.24, voice: 'felt', dur: 5 })); T.audio.promise(); });
        G.finish(2.4);
        return;
      }
      T.audio.sfx('join');
      G.prev = cellsOf(rounds[G.r - 1]);
      G.phase = 'pause'; G.i = 0; G.beat = R().beat || G.beat; G.chalk = R().blind ? 0 : 1;
      G.first = tb + 3;   /* a bar to draw the next figure, a bar to count it in */
      G.ink = 0; G.clock.wait(0.6).then(() => G.clock.tween(G, 'ink', 1, 1.6, T.ease.io));
      T.announce('발자국 차례: ' + R().path.map((d) => ['그 사람 쪽', '위', '뒤', '아래'][d]).join(', ') + '.');
    };
    const up = G.update;
    G.update = function (dt) {
      up(dt);
      G.stum = Math.max(0, G.stum - dt); G.laugh = Math.max(0, G.laugh - dt * 1.1); G.pulse = Math.max(0, G.pulse - dt * 2.6);
      if (!running()) return;
      const b0 = Math.floor(G.ph);
      G.ph += dt / G.beat;
      const b1 = Math.floor(G.ph);
      if (b1 !== b0) beatSound(b1);
      const bar = Math.floor(G.ph / 3);
      if (G.phase === 'pause' && bar >= G.first - 1) G.phase = 'count';
      if (G.phase === 'count' && bar >= G.first) G.phase = 'dance';
    };
    G.next = () => (G.done || G.stum > 0 || (G.phase !== 'count' && G.phase !== 'dance') || !open() ? null : KEYS[R().path[G.i]]);
    G.hintAt = () => { if (G.done || (G.phase !== 'count' && G.phase !== 'dance')) return null; const c = target(); return cellXY(c[0], c[1]); };

    /* ---------- drawing: the boards seen from above ---------- */
    function sole(x, y, ang, s) {
      const pts = [[16, 0], [13, -6], [4, -7], [-6, -5.5], [-15, -4.6], [-17.5, 0], [-15, 4.6], [-6, 5.5], [4, 7], [13, 6]];
      const c = Math.cos(ang), sn = Math.sin(ang);
      return pts.map((p) => [x + (p[0] * c - p[1] * sn) * s, y + (p[0] * sn + p[1] * c) * s]);
    }
    /* a pair of footprints facing `ang`; his left foot on his left */
    function pair(x, y, ang, s, fn) {
      const lx = Math.cos(ang - Math.PI / 2) * 10 * s, ly = Math.sin(ang - Math.PI / 2) * 10 * s;
      fn(sole(x + lx, y + ly, ang, s), 0); fn(sole(x - lx, y - ly, ang, s), 1);
    }
    const chalkPrint = (g, x, y, k, seed, alpha) => {
      if (alpha <= 0.01 || k <= 0.01) return;
      g.save(); g.globalAlpha *= Math.min(1, alpha);
      pair(x, y, Math.PI, 1.15, (pts, i) => P.chalk(g, pts.concat([pts[0]]), k, CHALK, 2.2, seed * 3 + i));
      g.restore();
    };
    G.draw = function (g, t) {
      if (G.a < 0.005) return;
      const rd = R(), cells = cellsOf(rd), blind = !!rd.blind, beatK = ((Math.floor(G.ph) % 3) + 3) % 3;
      const [f] = nearest(), win = running() ? T.clamp(1 - Math.abs(f + 0.02) / 0.6) : 0;
      g.save(); g.globalAlpha = G.a;
      /* the boards */
      g.save(); g.shadowColor = 'rgba(20,14,30,0.35)'; g.shadowBlur = 24; g.shadowOffsetY = 8;
      P.fill(g, P.rr(PX0, PY0, PX1 - PX0, PY1 - PY0, 16), '#8d6b4f');
      g.restore();
      g.save(); g.beginPath(); g.rect(PX0, PY0, PX1 - PX0, PY1 - PY0); g.clip();
      for (let i = 1; i < 6; i++) { const y = PY0 + i * 39; P.line(g, PX0, y, PX1, y, 1.6, 'rgba(58,38,26,0.4)'); }
      for (let i = 0; i < 6; i++) { const x = PX0 + 70 + ((i * 173) % 460); P.line(g, x, PY0 + i * 39, x, PY0 + (i + 1) * 39, 1.4, 'rgba(58,38,26,0.3)'); }
      /* where the pier ends, the cloud sea */
      for (let i = 0; i < 9; i++) P.fill(g, P.circle(PX0 - 6 + Math.sin(i * 2.3 + t * 0.4) * 4, PY0 + i * 30, 22), 'rgba(250,244,238,0.8)');
      g.restore();
      g.strokeStyle = 'rgba(255,240,215,0.28)'; g.lineWidth = 2; g.beginPath(); g.roundRect ? g.roundRect(PX0, PY0, PX1 - PX0, PY1 - PY0, 16) : g.rect(PX0, PY0, PX1 - PX0, PY1 - PY0); g.stroke();
      /* where she will stand: not chalk, a little light, facing him */
      const hb = 0.7 + 0.15 * Math.sin(t * 1.6) + (blind ? 0.15 : 0);
      P.glow(g, HER[0], HER[1], 70, '#ffd2dc', 0.5 * hb);
      pair(HER[0], HER[1], 0, 1.15, (pts) => { P.fill(g, P.soft(pts), T.rgba(ROSE, 0.85 * hb)); g.strokeStyle = T.rgba('#fff2f4', 0.8 * hb); g.lineWidth = 1.8; g.stroke(P.soft(pts)); });
      /* the chalked steps: numbered where each one lands. A new figure is drawn in over the last; in the last round they are rubbed out */
      if (G.prev && G.ink < 1) G.prev.forEach((c, i) => { const q = cellXY(c[0], c[1]); chalkPrint(g, q[0], q[1], 1, i + 11, T.clamp(1 - G.ink * 2.5) * 0.6); });
      if (G.chalk < 0.98) cells.forEach((c, i) => { const q = cellXY(c[0], c[1]); P.fill(g, P.ellipse(q[0] + 4, q[1], 30, 22, 0.3 + i), 'rgba(251,246,234,0.08)'); });
      cells.forEach((c, i) => {
        const q = cellXY(c[0], c[1]), next = i === G.i && running() && !G.done;
        let al = G.chalk, k = G.ink;
        if (blind && next && G.peek > 0) { al = Math.max(al, 0.55 * G.peek); k = 1; }
        if (next && G.ink > 0.9) P.glow(g, q[0], q[1], 64, '#fff0c8', (0.18 + 0.55 * win) * (blind ? al : 1));
        chalkPrint(g, q[0], q[1], k, i + 1, al * (i < G.i ? 0.5 : 1));
        if (al * k > 0.02) P.text(g, String(i + 1), q[0] + 34, q[1] - 30, { font: 'serif', size: 22, color: CHALK, alpha: al * T.clamp(k * 2 - 1) * (i < G.i ? 0.5 : 0.95) });
      });
      /* a chalk arrow for the next step: in the first round, or once he has stumbled twice */
      if ((rd.arrow || G.miss >= 2) && running() && !G.done && G.i < rd.path.length) {
        const a0 = cellXY(D.cell[0], D.cell[1]), tq = target(), a1 = cellXY(tq[0], tq[1]);
        const dx = a1[0] - a0[0], dy = a1[1] - a0[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
        const p0 = [a0[0] + ux * 34, a0[1] + uy * 34], p1 = [a1[0] - ux * 36, a1[1] - uy * 36];
        g.save(); g.globalAlpha *= 0.55 + 0.35 * win;
        P.chalk(g, [p0, p1], 1, '#ffe9b0', 2.4, 5);
        P.chalk(g, [[p1[0] - ux * 12 - uy * 9, p1[1] - uy * 12 + ux * 9], p1, [p1[0] - ux * 12 + uy * 9, p1[1] - uy * 12 - ux * 9]], 1, '#ffe9b0', 2.4, 7);
        g.restore();
      }
      /* his shoes, where his feet are just now */
      const ft = D.feet();
      [['B', -1], ['F', 1]].forEach(([w, side]) => {
        const q = ft[w], p = cellXY(q.c, q.r), lift = q.up;
        const x = p[0], y = p[1] + side * 11.5 - lift * 6, s = 1.15 * (1 + lift * 0.12);
        P.fill(g, P.ellipse(x, p[1] + side * 11.5 + 4, 19, 8), T.rgba('#2a1c14', 0.25 * (1 - lift * 0.5)));
        const pts = sole(x, y, Math.PI, s);
        P.fill(g, P.soft(pts), '#3a2a20');
        P.fill(g, P.soft(sole(x - 3, y - 1.5, Math.PI, s * 0.62)), 'rgba(255,240,220,0.16)');
      });
      /* how far into this round's steps */
      const n = rd.path.length;
      for (let i = 0; i < n; i++) P.fill(g, P.circle(PX1 - 24 - (n - 1 - i) * 20, PY1 - 18, 6), i < G.i ? '#ffd98a' : 'rgba(243,234,216,0.4)');
      /* Rosa humming: a few notes drift up from her */
      if (o.hum && o.hum.j && running()) {
        const hd = o.hum.j.head, s0 = T.world.toScreen(hd[0], hd[1]), z = T.world.S.cam.z;
        for (let i = 0; i < 3; i++) {
          const life = (t * 0.42 + i / 3) % 1, x = s0[0] - (14 + life * 26) * z + Math.sin(life * 6 + i * 2) * 4, y = s0[1] - (2 + life * 40) * z;
          g.save(); g.globalAlpha *= Math.sin(life * Math.PI) * 0.75;
          P.fill(g, P.ellipse(x, y, 3.4 * z, 2.5 * z, -0.4), '#8a5a7a');
          P.line(g, x + 2.8 * z, y - 1, x + 2.8 * z, y - 10 * z, 1.2 * z, '#8a5a7a');
          g.restore();
        }
      }
      /* Leo counting */
      if (running()) {
        P.fill(g, P.rr(-236, 338, 472, 82, 41), 'rgba(28,30,52,0.32)');
        ['하나', '둘', '셋'].forEach((w, i) => {
          const on = beatK === i, x = -150 + i * 150;
          P.text(g, w, x, 386, { size: i === 0 ? 70 : 56, color: on ? (i === 0 ? '#ffd98a' : '#fff6e4') : 'rgba(243,234,216,0.45)', alpha: G.a, seed: 3 + i, glow: 'rgba(14,20,32,0.7)' });
        });
      }
      g.restore();
      G.hintRing(g, t);
      G.caption(g, G.phase === 'rub' || G.phase === 'pause' || G.done ? '' : blind ? '발자국 없이, 아까 그 걸음대로 「하나」마다 한 발씩' : '「하나」에 맞춰, 빛나는 발자국 쪽으로 한 발씩 옮겨 주세요');
    };
    return G;
  };
})();
