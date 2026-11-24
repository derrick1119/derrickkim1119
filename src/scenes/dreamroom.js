/* Take Your Time — Lily's dream, the night before her wedding.
   Leo sends it down from the end of the pier under 구름이's little lamp (ch5_flowers.js); it comes to Lily, who is
   thirty-one, as the room she drew when she was six, and the room will not keep still. Turn it, and whatever is
   loose in it slides until something stops it. Two paper dolls, her father and her, have to leave by the door
   together; the last time, Bean's ball goes with them (the same ball as on her back step, chapter 4). If the room
   jams, the crayon arrow she drew by the door spins back and the room goes back one turn, never to the start.
   After each room, the faint sound of a crayon from beyond the door. Then the room rights itself: she is on her
   bed with her father's picture in her lap, and he comes in at the door. */
(function () {
  'use strict';
  const T = window.TYT, P = T.P, F = T.F;
  const TAU = Math.PI * 2;

  /* ---------- the boards ----------
     '#' a piece of furniture, 'O' the door, D her father, L Lily, B Bean's ball. Upright, things fall down. */
  const BOARDS = [
    ['...#..', '...#..', '#.D.#.', 'O.#.#.', '.#.#..', '.#.#..'],
    ['O.....', '#...L.', '..#.#.', '......', '...#..', '#.D##.'],
    ['#..O#.', '..#.##', '....#.', '.##...', '...L..', '.B.#.D'],
  ];
  const N = 6, GV = [[0, 1], [1, 0], [0, -1], [-1, 0]], CELL = 76;
  function parse(rows) {
    const walls = rows.map((r) => r.split('').map((c) => (c === '#' ? 1 : 0)));
    let door = null; const toks = [];
    rows.forEach((r, y) => r.split('').forEach((c, x) => { if (c === 'O') door = [x, y]; const k = 'DLB'.indexOf(c); if (k >= 0) toks[k] = { kind: 'DLB'[k], p: [x, y] }; }));
    return { walls, door, toks: toks.filter(Boolean) };
  }
  /* slide everything loose as far as it goes; whatever crosses the door is out */
  function settle(B, pos, r) {
    const [gx, gy] = GV[r], out = pos.map((p) => (p ? p.slice() : null)), moved = pos.map(() => 0);
    const live = out.map((p, i) => i).filter((i) => out[i]).sort((a, b) => (out[b][0] * gx + out[b][1] * gy) - (out[a][0] * gx + out[a][1] * gy));
    for (const i of live) {
      for (;;) {
        const nx = out[i][0] + gx, ny = out[i][1] + gy;
        if (nx < 0 || ny < 0 || nx >= N || ny >= N || B.walls[ny][nx] || out.some((q, j) => j !== i && q && q[0] === nx && q[1] === ny)) break;
        out[i] = [nx, ny]; moved[i]++;
        if (nx === B.door[0] && ny === B.door[1]) { moved[i] = -moved[i]; out[i] = null; break; }
      }
    }
    return { pos: out, moved };
  }
  const key = (r, pos) => r + ':' + pos.map((p) => (p ? p.join(',') : 'x')).join('|');
  function plan(B, r0, pos0) {
    if (pos0.every((p) => !p)) return '';
    const seen = new Set([key(r0, pos0)]), q = [{ r: r0, pos: pos0, path: '' }];
    while (q.length) {
      const s = q.shift();
      for (const [m, dr] of [['R', 1], ['L', 3]]) {
        const r = (s.r + dr) % 4, pos = settle(B, s.pos, r).pos, k = key(r, pos);
        if (seen.has(k)) continue; seen.add(k);
        if (pos.every((p) => !p)) return s.path + m;
        q.push({ r, pos, path: s.path + m });
      }
    }
    return null;
  }

  function doll(g, kind, s, a) {
    g.save(); g.scale(s, s); g.globalAlpha *= a;
    g.shadowColor = 'rgba(40,30,70,0.35)'; g.shadowBlur = 8; g.shadowOffsetY = 3;
    if (kind === 'B') {   /* Bean's ball: the yellow one with the seam, as it lay in the grass by her back step */
      P.fill(g, P.circle(0, 12, 16), '#e3b64f'); g.shadowColor = 'transparent';
      g.strokeStyle = '#c99a2a'; g.lineWidth = 2.2; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-13, 4); g.quadraticCurveTo(0, 14, 13, 20); g.stroke();
      P.fill(g, P.ellipse(-6, 5, 5, 3, -0.5), 'rgba(255,248,220,0.45)');
      g.restore(); return;
    }
    const dad = kind === 'D';
    /* a paper doll: cut out, a little crooked, drawn in crayon */
    P.fill(g, P.soft([[-17, 30], [-14, -2], [-8, -10], [8, -10], [14, -2], [17, 30]]), dad ? '#eee3d0' : '#7fb0d8');
    g.shadowColor = 'transparent';
    P.fill(g, P.circle(0, -20, 12), '#f3d6bf');
    if (dad) {
      P.fill(g, P.soft([[-13, -24], [-11, -36], [0, -40], [11, -36], [13, -24]]), '#d7a23c');
      P.fill(g, P.circle(0, -41, 4), '#f1c04a');
      P.fill(g, P.rr(-12, -10, 24, 7, 3), '#c9443a'); P.fill(g, P.rr(4, -6, 6, 16, 3), '#c9443a');
    } else {
      P.fill(g, P.soft([[-12, -18], [-10, -32], [0, -34], [10, -32], [12, -18]]), '#6b4a3a');
      P.fill(g, P.circle(-14, -24, 5), '#6b4a3a'); P.fill(g, P.circle(14, -24, 5), '#6b4a3a');
    }
    P.fill(g, P.circle(-4, -21, 1.6), '#3d3a5c'); P.fill(g, P.circle(4, -21, 1.6), '#3d3a5c');
    g.strokeStyle = '#3d3a5c'; g.lineWidth = 1.4; g.beginPath(); g.arc(0, -17, 4, 0.3, Math.PI - 0.3); g.stroke();
    P.line(g, -6, 30, -6, 40, 3, '#3d3a5c'); P.line(g, 6, 30, 6, 40, 3, '#3d3a5c');
    g.restore();
  }
  const FURN = ['#b48ab0', '#8fb0c8', '#d9a86c', '#9cb88a', '#c98a8a'];
  function furniture(g, x, y, i) {
    const c = FURN[i % FURN.length];
    P.fill(g, P.rr(x + 3, y + 3, CELL - 6, CELL - 6, 10), c);
    P.fill(g, P.rr(x + 3, y + 3, CELL - 6, 12, 8), T.shade(c, 0.18));
    const k = i % 4;
    if (k === 0) { for (let j = 0; j < 3; j++) P.fill(g, P.rr(x + 14 + j * 17, y + 22, 12, 40, 2), ['#f6f0e0', '#c9573f', '#3f6f9a'][j]); }
    else if (k === 1) { P.fill(g, P.circle(x + CELL / 2, y + CELL / 2 + 4, 14), '#fbf4e2'); P.fill(g, P.circle(x + CELL / 2 - 5, y + CELL / 2, 2.4), '#3d3a5c'); P.fill(g, P.circle(x + CELL / 2 + 5, y + CELL / 2, 2.4), '#3d3a5c'); }
    else if (k === 2) { P.fill(g, P.rr(x + 16, y + 30, CELL - 32, 8, 3), T.shade(c, -0.2)); P.fill(g, P.circle(x + CELL / 2, y + 50, 5), '#f6f0e0'); }
    else { const st = (q, r) => { const p = []; for (let j = 0; j < 10; j++) { const a = (j / 10) * TAU - Math.PI / 2, rr = j % 2 ? r * 0.45 : r; p.push([q[0] + Math.cos(a) * rr, q[1] + Math.sin(a) * rr]); } return p; }; P.fill(g, P.poly(st([x + CELL / 2, y + CELL / 2 + 4], 18)), '#f1c04a'); }
  }

  /* the dreamy laying-down of a picture: painted off to one side, laid in slow trembling strips */
  function makeDreamy() {
    let off = null, gen = -1;
    return function (g, t, paint, sway) {
      const V = T.view, W = V.W, ps = V.ps;
      if (!off || gen !== T.gen || off.width !== Math.ceil(W * ps)) { off = document.createElement('canvas'); off.width = Math.ceil(W * ps); off.height = Math.ceil(900 * ps); gen = T.gen; }
      const og = off.getContext('2d');
      og.setTransform(1, 0, 0, 1, 0, 0); og.clearRect(0, 0, off.width, off.height);
      og.setTransform(ps, 0, 0, ps, (W / 2) * ps, 0);
      paint(og);
      g.fillStyle = '#e9e0f6'; g.fillRect(-W / 2, 0, W, 900);
      for (let y = 0; y < 900; y += 6) {
        const dx = (Math.sin(y * 0.018 + t * 1.1) * 6 + Math.sin(y * 0.047 - t * 1.7) * 2.5) * sway;
        g.drawImage(off, 0, y * ps, off.width, 6 * ps, -W / 2 + dx, y, W, 6.6);
      }
      g.save(); g.globalCompositeOperation = 'soft-light'; g.fillStyle = 'rgba(150,130,230,0.42)'; g.fillRect(-W / 2, 0, W, 900); g.restore();
      const vg = g.createRadialGradient(0, 440, 260, 0, 440, 980);
      vg.addColorStop(0, 'rgba(246,240,255,0)'); vg.addColorStop(0.7, 'rgba(236,226,255,0.5)'); vg.addColorStop(1, 'rgba(246,240,255,0.9)');
      g.fillStyle = vg; g.fillRect(-W / 2, 0, W, 900);
      const r = T.rng(17);
      for (let i = 0; i < 36; i++) {
        const sx = r() * W - W / 2, sp = 0.3 + r() * 0.7, ph = r() * TAU;
        P.glow(g, sx + Math.sin(t * 0.3 * sp + ph) * 40, 900 - ((t * 20 * sp + r() * 900) % 960), 10 + sp * 12, i % 3 ? '#fff6e0' : '#d9c8ff', 0.45 + 0.3 * Math.sin(t * 2 + ph));
      }
    };
  }

  T.tiltDream = function () {
    /* fall, meet, near, hold, swing: the scene's own tweens. tears: she smiles through them; arm: she looks down at
       her free arm; cheek: his hand to her cheek; high: the swing goes higher; laugh: she laughs on it */
    const D = { dark: true, mood: 'night', chord: 2, fall: { k: 0 }, meet: { k: 0 }, near: { k: 0 }, hold: { k: 0 }, room: { k: 1 }, swing: { k: 0 },
      tears: { k: 0 }, arm: { k: 0 }, cheek: { k: 0 }, high: { k: 0 }, laugh: { k: 0 }, gq: null };
    const dreamy = makeDreamy();
    let B = null, round = -1, r = 0, ang = 0, pos = [], anim = null, busy = false, idle = 0, say = '', sayT = 0, outN = 0, sparkle = 0, rewind = 0;
    let hist = [];   /* the room as it was before each turn, so that a jam goes back one turn only */
    const OX = 0, OY = 430, tw = [];
    const fade = (to, dur) => new Promise((res) => { tw.push({ from: D.room.k, to, dur, t: 0, res }); });
    function load(i) {
      round = i; B = parse(BOARDS[i]); r = 0; ang = 0; outN = 0; hist = [];
      pos = settle(B, B.toks.map((q) => q.p), 0).pos;
      anim = null; busy = false; idle = 0;
    }
    let stuckN = 0, skipping = false;
    D.solve = function () {
      load(0); stuckN = 0; skipping = false;
      return new Promise((res) => {
        const q = (D.gq = { res, done: false });
        /* the help every puzzle has; a room jammed shut counts as a slip. Skipped, the room comes right of itself
           and the dream goes on, as it does when the last of them is out of the door */
        q.coach = T.puzzle.coach({
          idle: () => idle, misses: () => stuckN, live: () => D.gq === q && !q.done && !skipping && D.fall.k >= 1, hintAt: () => D.hintAt(), r: 60,
          tip: '왼쪽이나 오른쪽을 눌러 방을 돌려요',
          solve: () => { skipping = true; anim = null; busy = true; say = ''; T.audio.promise(); fade(0, 0.9).then(() => { q.done = true; busy = false; q.res(); }); },
        });
      });
    };
    function turn(dr) {
      if (!D.gq || D.gq.done || busy) return;
      busy = true; idle = 0; say = '';
      hist.push({ r, ang, pos: pos.map((p) => (p ? p.slice() : null)) });
      const from = ang, to = ang + dr * (Math.PI / 2), r2 = (r + (dr > 0 ? 1 : 3)) % 4;
      T.audio.sfx('whoosh'); T.audio.sfx('creak');
      anim = { kind: 'turn', t: 0, dur: 0.46, from, to, r2 };
    }
    function afterTurn() {
      const before = pos, res = settle(B, pos, r);
      const far = Math.max(1, ...res.moved.map(Math.abs));
      anim = { kind: 'slide', t: 0, dur: 0.1 + far * 0.075, before, after: res.pos, moved: res.moved };
      if (res.moved.some((m) => m)) T.audio.sfx('step');
    }
    /* jammed: the crayon arrow by the door spins the wrong way round, and the room, with everything in it, goes back
       to how it was one turn ago (a peak, not a punishment) */
    function undo() {
      const h = hist.pop();
      if (!h) { fade(0, 0.7).then(() => { if (skipping) return; load(round); return fade(1, 0.7); }); return; }
      rewind = 1; T.audio.sfx('crayon'); T.audio.sfx('whoosh');
      anim = { kind: 'undo', t: 0, dur: 0.9, from: ang, to: h.ang, before: pos, after: h.pos, h };
    }
    function afterSlide() {
      const left = anim.after;
      anim.moved.forEach((m, i) => { if (m < 0) { outN++; T.audio.step(outN * 2 + round, { voice: 'glass', vel: 0.36 }); sparkle = 1; } });
      pos = left; anim = null;
      if (pos.every((p) => !p)) {
        T.audio.promise(); busy = true;
        fade(0, 0.9).then(() => {
          T.audio.sfx('crayon');   /* from beyond the door, very small: whoever drew this room is drawing still */
          if (skipping) return;
          if (round + 1 < BOARDS.length) { load(round + 1); return fade(1, 0.9); }
          D.gq.done = true; busy = false; D.gq.res();
        });
        return;
      }
      if (plan(B, r, pos) == null) {
        say = '방이 꽉 막혔어요. 한 번 전으로 되돌려요'; sayT = 2.4; busy = true; stuckN++;
        undo();
        return;
      }
      busy = false;
    }
    D.update = function (dt) {
      idle += dt; sayT = Math.max(0, sayT - dt); sparkle = Math.max(0, sparkle - dt * 1.4); rewind = Math.max(0, rewind - dt * 0.9);
      if (D.gq && D.gq.coach) D.gq.coach.update(dt);
      for (let i = tw.length - 1; i >= 0; i--) { const q = tw[i]; q.t += dt; D.room.k = T.lerp(q.from, q.to, T.ease.io(T.clamp(q.t / q.dur))); if (q.t >= q.dur) { tw.splice(i, 1); q.res(); } }
      if (!anim) return;
      anim.t += dt;
      if (anim.kind === 'turn') { const k = T.ease.io(T.clamp(anim.t / anim.dur)); ang = T.lerp(anim.from, anim.to, k); if (anim.t >= anim.dur) { ang = anim.to; r = anim.r2; afterTurn(); } }
      else if (anim.kind === 'undo') {
        ang = T.lerp(anim.from, anim.to, T.ease.io(T.clamp(anim.t / anim.dur)));
        if (anim.t >= anim.dur) { const h = anim.h; ang = h.ang; r = h.r; pos = h.pos; outN = pos.filter((p) => !p).length; anim = null; busy = false; }
      }
      else if (anim.t >= anim.dur) afterSlide();
    };
    D.pointer = function (type, x, y) {
      if (D.gq && D.gq.coach && D.gq.coach.pointer(type, x, y)) return true;
      if (!D.gq || D.gq.done || type !== 'down') return false;
      if (busy) return true;
      turn(x < 0 ? -1 : 1);
      return true;
    };
    D.key = function (key) {
      if (!D.gq || D.gq.done) return false;
      if (D.gq.coach && D.gq.coach.key(key)) return true;
      if (key === 'ArrowLeft' || key === '1') { turn(-1); return true; }
      if (key === 'ArrowRight' || key === '2') { turn(1); return true; }
      return false;
    };
    const nextMove = () => { if (!D.gq || D.gq.done || busy || !B) return null; const p = plan(B, r, pos); return p ? p[0] : null; };
    D.want = function () { const m = nextMove(); return m ? 'key:' + (m === 'L' ? 'ArrowLeft' : 'ArrowRight') : null; };
    D.hintAt = function () { const m = nextMove(); return m ? [m === 'L' ? -330 : 330, OY] : null; };
    /* where a token is drawn this frame, in the room's own grid */
    function cellOf(i) {
      if (anim && anim.kind === 'slide') {
        const a = anim.before[i], b = anim.after[i], m = anim.moved[i];
        if (!a) return null;
        const k = T.ease.in(T.clamp(anim.t / anim.dur));
        if (b) return [T.lerp(a[0], b[0], k), T.lerp(a[1], b[1], k), 1];
        const [gx, gy] = GV[r], n = Math.abs(m);
        return [a[0] + gx * n * k, a[1] + gy * n * k, 1 - T.clamp((k - 0.7) / 0.3)];
      }
      if (anim && anim.kind === 'undo') {   /* going back: each one drifts back to where it was, and one that went out comes back in */
        const a = anim.before[i], b = anim.after[i], k = T.ease.io(T.clamp(anim.t / anim.dur));
        if (!b) return null;
        return a ? [T.lerp(a[0], b[0], k), T.lerp(a[1], b[1], k), 1] : [b[0], b[1], k];
      }
      const p = pos[i];
      return p ? [p[0], p[1], 1] : null;
    }
    function paintRoom(g, t) {
      const S = N * CELL, k = T.ease.io(D.room.k);
      g.save(); g.translate(OX, OY); g.rotate(ang); g.scale(0.92 + 0.08 * k, 0.92 + 0.08 * k); g.globalAlpha = k;
      g.translate(-S / 2, -S / 2);
      /* the wallpaper of a six-year-old's room */
      P.fill(g, P.rr(-14, -14, S + 28, S + 28, 18), '#8c6f96');
      P.fill(g, P.rr(0, 0, S, S, 8), '#f6e6ee');
      g.save(); g.beginPath(); g.rect(0, 0, S, S); g.clip();
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if ((x + y) % 2 === 0) P.fill(g, P.circle(x * CELL + CELL / 2, y * CELL + CELL / 2, 3), 'rgba(201,87,63,0.18)');
      g.restore();
      let fi = 0;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (B.walls[y][x]) furniture(g, x * CELL, y * CELL, fi++ + round * 3);
      /* the door, open, with warm light and the flower road beyond */
      const [dx, dy] = B.door;
      P.glow(g, dx * CELL + CELL / 2, dy * CELL + CELL / 2, 70, '#fff0c8', 0.8 + 0.15 * Math.sin(t * 3));
      g.save(); g.translate(dx * CELL + CELL / 2, dy * CELL + CELL / 2); g.rotate(-ang);   /* a door, the right way up whichever way the room is */
      const arch = new Path2D(); arch.moveTo(-24, 34); arch.lineTo(-24, -14); arch.arc(0, -14, 24, Math.PI, 0); arch.lineTo(24, 34); arch.closePath();
      g.fillStyle = '#ffe7b0'; g.fill(arch); g.lineWidth = 6; g.strokeStyle = '#a8735a'; g.stroke(arch);
      for (let j = 0; j < 5; j++) P.fill(g, P.circle(-14 + (j % 3) * 14 + Math.sin(t + j) * 2, 26 - Math.floor(j / 3) * 10, 4), ['#e58aa0', '#f6f0e0', '#f1c04a', '#f6b6c2', '#e58aa0'][j]);
      /* beside it, the round arrow she drew in crayon; when the room jams it shines and spins back the wrong way */
      g.save(); g.translate(34, -30); g.rotate(-rewind * rewind * TAU * 0.75);
      if (rewind > 0.01) P.glow(g, 0, 0, 34, '#fff0c8', rewind);
      const ring = []; for (let j = 0; j <= 12; j++) { const a = -2.6 + (j / 12) * 4.4; ring.push([Math.cos(a) * 11, Math.sin(a) * 11]); }
      P.crayon(g, ring, '#3f7fc2', 3, 13 + round, 1);
      const ea = 1.8, ex = Math.cos(ea) * 11, ey = Math.sin(ea) * 11;
      P.crayon(g, [[ex - 7, ey - 3], [ex, ey], [ex + 1, ey - 8]], '#3f7fc2', 3, 17 + round, 1);
      g.restore();
      g.restore();
      /* the dolls, which always stand the way the room is falling */
      B.toks.forEach((tk, i) => {
        const c = cellOf(i);
        if (!c) return;
        g.save(); g.translate(c[0] * CELL + CELL / 2, c[1] * CELL + CELL / 2); g.rotate(-ang);
        doll(g, tk.kind, 1.05, c[2]);
        g.restore();
      });
      g.restore();
    }
    function arrows(g, t, a) {
      const draw = (sx, dir) => {
        g.save(); g.translate(sx, OY); g.globalAlpha = a * (0.85 + 0.15 * Math.sin(t * 3)); if (dir < 0) g.scale(-1, 1);
        P.fill(g, P.circle(0, 0, 54), 'rgba(40,30,70,0.32)');
        g.strokeStyle = '#fbf6ff'; g.lineWidth = 6; g.lineCap = 'round';
        g.beginPath(); g.arc(0, 0, 28, -2.5, 0.5); g.stroke();
        const e = 0.5, ex = Math.cos(e) * 28, ey = Math.sin(e) * 28, tx = -Math.sin(e), ty = Math.cos(e);
        P.fill(g, P.poly([[ex + tx * 13, ey + ty * 13], [ex - ty * 10 - tx * 3, ey + tx * 10 - ty * 3], [ex + ty * 10 - tx * 3, ey - tx * 10 - ty * 3]]), '#fbf6ff');
        g.restore();
      };
      draw(-330, -1); draw(330, 1);
    }
    function scene(g, t) {
      const W = T.view.W, mk = T.ease.io(D.meet.k);
      /* the room, upright and quiet, once she is in it */
      if (mk > 0.01) {
        g.save(); g.globalAlpha = mk;
        g.fillStyle = '#f6e6ee'; g.fillRect(-W / 2, 0, W, 900);
        g.fillStyle = '#ead2e2'; g.fillRect(-W / 2, 664, W, 236);
        for (let y = 60; y < 640; y += 90) for (let x = -W / 2 + ((y / 90) % 2) * 45; x < W / 2; x += 90) P.fill(g, P.circle(x, y, 3.4), 'rgba(201,87,63,0.16)');
        P.fill(g, P.rr(150, 300, 150, 364, 8), '#ffe7b0'); P.glow(g, 225, 480, 230, '#fff0c8', 0.7);
        g.strokeStyle = '#a8735a'; g.lineWidth = 9; g.strokeRect(150, 300, 150, 364);
        for (let j = 0; j < 8; j++) P.fill(g, P.circle(170 + (j % 3) * 50 + Math.sin(t + j) * 4, 640 - Math.floor(j / 3) * 16, 6), ['#e58aa0', '#f6f0e0', '#f1c04a', '#f6b6c2'][j % 4]);
        P.fill(g, P.rr(-470, 540, 360, 130, 18), '#b48ab0'); P.fill(g, P.rr(-462, 518, 344, 40, 16), '#fbf4ee');
        const ls = F.lilyAt(31, { top: '#e9e0f0', bottom: '#e9e0f0' }), hk = T.ease.io(D.hold.k), ak = T.ease.io(D.arm.k);
        const lily = { x: -250, y: 540, s: 300, style: ls, sit: true, lean: 0.06 + hk * 0.1 + ak * 0.04, headTilt: 0.12 - hk * 0.16 + ak * 0.34, legF: { a: Math.PI / 2 - 0.1, b: 0.1 }, legB: { a: Math.PI / 2 - 0.16, b: 0.14 }, face: { eye: hk > 0.6 ? 'closed' : 'open', mouth: 'smile', blush: 0.26 } };
        if (D.tears.k > 0.01) T.face.set(lily, 'smileTears', D.tears.k * (1 - hk * 0.5), t);   /* she smiles, and her eyes fill */
        /* he comes in at the door, walks to her bedside and goes down on one knee there, so that his face is level with
           hers: four steps (the feet keep pace with the floor), then the front foot steps on and the back knee goes down */
        const FLOOR = 664, u = 3, KX = -104, WX = -58, wk = T.clamp(D.near.k / 0.72), kk = T.ease.io(T.clamp((D.near.k - 0.72) / 0.28));
        const standY = FLOOR - F.hipHeight(F.styles.leoHome, 300), kneelY = FLOOR - 28.5 * u, SOLE = FLOOR - 2.8 * u;
        const leo = { x: T.lerp(T.lerp(194, WX, wk), KX, kk), y: T.lerp(standY, kneelY, kk), s: 300, style: F.styles.leoHome, flip: true, lean: 0.06 + kk * 0.09 + hk * 0.04, headTilt: 0.1 - kk * 0.06, face: { mouth: 'smile', blush: 0.14 } };
        if (wk > 0 && wk < 1) leo.walk = wk * 4 * Math.PI;
        else if (wk >= 1) {
          const lift = Math.sin(kk * Math.PI) * 5 * u;
          leo.legF = { foot: F.local(leo, T.lerp(WX - 10.5 * u, KX - 24 * u, kk), SOLE - lift) };
          leo.legB = { foot: F.local(leo, WX + 10.5 * u, SOLE) };   /* the back foot stays where it was */
        }
        /* little fingers: both hands go to one point between them, a little below their shoulders */
        const sh = (o) => { const ou = o.s / 100, sx = o.flip ? -1 : 1; return [o.x + sx * ou * (Math.sin(o.lean) * 26 + 1.2), o.y + ou * (1.5 - Math.cos(o.lean) * 26)]; };
        const s1 = sh(lily), s2 = sh(leo), M = [(s1[0] + s2[0]) / 2, (s1[1] + s2[1]) / 2 + 14], lap = [lily.x + 42, lily.y - 4];
        lily.armF = { hand: F.local(lily, T.lerp(lap[0], M[0] - 6, hk), T.lerp(lap[1], M[1], hk)) };
        lily.armB = { hand: F.local(lily, lap[0] - 6 + ak * 10, lap[1] + 2 - ak * 14) };   /* the arm she will leave free: she looks at it */
        if (hk > 0.01) leo.armF = { hand: F.local(leo, T.lerp(s2[0] + 4, M[0] + 6, hk), T.lerp(s2[1] + 80, M[1], hk)) };
        const ck = T.ease.io(D.cheek.k);
        if (ck > 0.01) T.pose.pair('cheek', leo, lily, ck, t);   /* as he says no: his hand to her cheek, and she leans into it */
        const lj = F.person(g, lily);
        /* his picture in her lap, the one she sets the letter in front of */
        g.save(); g.translate(lj.handB[0] + 6, lj.handB[1] - 4); g.rotate(0.28 - ak * 0.2);
        P.fill(g, P.rr(-17, -22, 34, 44, 3), '#7a5a3e'); P.fill(g, P.rr(-13, -18, 26, 36, 2), '#e9dcc0');
        P.fill(g, P.circle(0, -5, 6), '#d7a23c'); P.fill(g, P.rr(-7, 2, 14, 12, 4), '#c9443a');
        g.restore();
        g.save(); g.globalAlpha *= T.clamp(D.near.k * 4); P.glow(g, leo.x, leo.y - 40, 120, '#fff0c8', 0.3); F.person(g, leo); g.restore();
        if (hk > 0.6) {   /* hooked */
          const a = T.clamp((hk - 0.6) / 0.4);
          P.glow(g, M[0], M[1], 46, '#fff0c8', 0.4 * a);
          g.save(); g.globalAlpha *= a; g.lineCap = 'round'; g.lineWidth = 4.2;
          g.strokeStyle = ls.skin; g.beginPath(); g.moveTo(M[0] - 3, M[1] + 7); g.quadraticCurveTo(M[0] + 6, M[1] + 13, M[0] + 4, M[1] + 4); g.stroke();
          g.strokeStyle = F.styles.leoHome.skin; g.beginPath(); g.moveTo(M[0] + 4, M[1] + 9); g.quadraticCurveTo(M[0] - 6, M[1] + 4, M[0] - 3, M[1] + 12); g.stroke();
          g.restore();
        }
        g.restore();
      }
      if (mk < 0.99 && B) paintRoom(g, t);
      if (D.swing.k > 0.01) swingHill(g, t, T.ease.io(D.swing.k));
    }
    /* the promise from when she was six: the room opens onto the hill, the apple tree, and the swing he built */
    function swingHill(g, t, k) {
      const W = T.view.W;
      g.save(); g.globalAlpha = k;
      const sky = g.createLinearGradient(0, 0, 0, 900);
      sky.addColorStop(0, '#c8b4ee'); sky.addColorStop(0.55, '#f4cfdc'); sky.addColorStop(1, '#ffe8c6');
      g.fillStyle = sky; g.fillRect(-W / 2, 0, W, 900);
      P.glow(g, 380, 520, 420, '#fff2cc', 0.6);
      P.fill(g, P.soft([[-W / 2, 720], [-360, 660], [-40, 628], [300, 650], [W / 2, 706], [W / 2, 900], [-W / 2, 900]]), '#a7c48c');
      P.fill(g, P.soft([[-W / 2, 780], [-200, 744], [200, 752], [W / 2, 790], [W / 2, 900], [-W / 2, 900]]), '#93b47c');
      /* the apple tree */
      P.fill(g, P.poly([[-262, 650], [-226, 650], [-218, 330], [-252, 330]]), '#7a5a40');
      P.line(g, -238, 352, 170, 300, 20, '#7a5a40');
      const r = T.rng(9);
      for (let i = 0; i < 16; i++) P.fill(g, P.circle(-330 + r() * 470, 170 + r() * 170, 60 + r() * 34), ['#6f9f5e', '#7fb06a', '#5f8f52'][i % 3]);
      for (let i = 0; i < 12; i++) P.fill(g, P.circle(-310 + r() * 430, 200 + r() * 150, 8), '#d9483a');
      /* the swing, and Lily on it; he pushes from behind */
      const a = Math.sin(t * 1.7) * (0.34 + 0.2 * T.ease.io(D.high.k)), piv = [70, 316], L = 300;   /* 더 높이: it goes higher */
      const seat = [piv[0] + Math.sin(a) * L, piv[1] + Math.cos(a) * L];
      g.strokeStyle = '#d8c4a0'; g.lineWidth = 4;
      g.beginPath(); g.moveTo(piv[0] - 34, piv[1] + 4); g.lineTo(seat[0] - 34, seat[1]); g.moveTo(piv[0] + 34, piv[1] - 4); g.lineTo(seat[0] + 34, seat[1]); g.stroke();
      const ls = F.lilyAt(31, { top: '#e9e0f0', bottom: '#e9e0f0' });
      const lily = { x: seat[0] - 4, y: seat[1] - 6, s: 250, style: ls, sit: true, flip: true, lean: -a * 0.6, headTilt: -0.2, legF: { a: Math.PI / 2 - 0.5 - a, b: 0.3 }, legB: { a: Math.PI / 2 - 0.6 - a, b: 0.34 }, face: { eye: 'happy', mouth: 'open', blush: 0.3 } };
      lily.armF = { hand: F.local(lily, seat[0] - 28, seat[1] - 120) }; lily.armB = { hand: F.local(lily, seat[0] + 30, seat[1] - 116) };
      if (D.laugh.k > 0.01) { T.pose.laugh(lily, D.laugh.k, t); lily.face.mouth = 'laugh'; }   /* out loud, the way she did at six */
      F.person(g, lily);
      P.fill(g, P.rr(seat[0] - 46, seat[1] - 4, 92, 10, 4), '#b98a5a');
      /* he stands his ground behind her, feet planted: only his weight goes into it. He leans in as the seat comes
         back to him and his hands meet her back, then eases upright again while she flies off */
      const near = T.ease.io(T.clamp((Math.sin(t * 1.7) - 0.2) / 0.8)), GY = 712, SOLE = GY - 2.8 * 2.7;
      const leo = { x: 304 - near * 20, y: GY - F.hipHeight(F.styles.leoHome, 270) + 6 + near * 3, s: 270, style: F.styles.leoHome, flip: true, lean: 0.08 + near * 0.24, headTilt: -0.04, face: { mouth: 'smile', eye: 'happy' } };
      leo.legF = { foot: F.local(leo, 268, SOLE) }; leo.legB = { foot: F.local(leo, 322, SOLE) };
      const back = [seat[0] + 24, seat[1] - 44], ready = [leo.x - 34, leo.y - 52];
      leo.armF = { hand: F.local(leo, T.lerp(ready[0], back[0], near), T.lerp(ready[1], back[1], near)) };
      leo.armB = { hand: F.local(leo, T.lerp(ready[0] + 8, back[0] + 8, near), T.lerp(ready[1] - 6, back[1] - 10, near)) };
      F.person(g, leo);
      for (let i = 0; i < 18; i++) { const ph = (t * 0.05 + i * 0.13) % 1; P.fill(g, P.ellipse(-W / 2 + ((i * 197) % W) + Math.sin(t + i) * 30, ph * 900, 5, 3, ph * 6), '#f6b6c2'); }
      g.restore();
    }
    D.draw = function (g, t) {
      const W = T.view.W, solving = D.gq && !D.gq.done;
      dreamy(g, t, (og) => scene(og, t), solving ? 0.6 : 1 - T.ease.io(D.meet.k) * 0.6);
      if (sparkle > 0 && B) for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU + t; P.glow(g, Math.cos(a) * 120 * (1.2 - sparkle), OY + Math.sin(a) * 120 * (1.2 - sparkle), 10, '#fff6e0', sparkle); }
      /* falling in */
      const fk = D.fall.k;
      if (fk < 1) {
        const a = 1 - T.ease.io(T.clamp((fk - 0.55) / 0.45));
        g.save(); g.globalAlpha = a; g.fillStyle = '#1b2440'; g.fillRect(-W / 2, 0, W, 900);
        const rr = T.rng(8);
        for (let i = 0; i < 110; i++) { const an = rr() * TAU + t * (0.6 + rr()) + fk * 6, d = (60 + rr() * 700) * (1 - T.ease.in(T.clamp(fk / 0.7)) * 0.96); P.glow(g, Math.cos(an) * d, 450 + Math.sin(an) * d * 0.6, 6 + rr() * 10, i % 4 ? '#fff0c8' : '#d9c8ff', 0.8); }
        P.glow(g, 0, 450, 40 + fk * 600, '#f6f0ff', T.clamp(fk * 1.4));
        g.restore();
      }
      if (solving) {
        arrows(g, t, busy ? 0.45 : 1);
        if (!busy) D.gq.coach.glow(g, t, 1, 60);
        T.band(g, 1);
        const cap = sayT > 0 ? say : round === 2 ? '빈의 공도 같이 내보내 주세요. 왼쪽·오른쪽을 눌러 방을 돌려요' : round === 1 ? '이번엔 아빠랑 릴리, 둘이 같이 문 밖으로. 방을 돌리면 떠 있는 것은 모두 미끄러져요' : '꿈속의 방이 기울어져 있어요. 왼쪽·오른쪽을 눌러 방을 돌려, 아빠 인형을 문 밖 꽃길로 내보내세요';
        P.text(g, sayT > 0 ? cap : T.puzzle.withKeys(cap, 'sides'), 0, 866, { font: 'serif', size: 26, color: '#fbf6ff', alpha: 0.96, glow: 'rgba(27,36,64,0.95)' });
        for (let i = 0; i < BOARDS.length; i++) P.fill(g, P.circle(-((BOARDS.length - 1) * 26) / 2 + i * 26, 806, 7), i < round ? '#ffd98a' : i === round ? '#fbf6ff' : 'rgba(251,246,255,0.35)');
      }
      if (D.gq && D.gq.coach) D.gq.coach.draw(g, t);
    };
    D.BOARDS = BOARDS; D.plan = () => (B ? plan(B, r, pos) : null);
    return D;
  };
})();
