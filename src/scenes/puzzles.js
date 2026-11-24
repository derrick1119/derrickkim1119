/* Take Your Time — the small puzzles. Each one is something a hand in this story would
   actually be doing: answering the harbour bell, bedding foundation stones, raising a frame in
   the order it will stand, casting off a rope, finding a taste, weaving a garland.

   ---------- one way to play, and one way to be helped, in every puzzle ----------
   Two gestures and nothing else: TAP a thing (or a side of the screen), or DRAG it (slide it along, pull a line).
   Nothing has to be held down, double-tapped or right-clicked, and nothing that is tapped is smaller than about
   100 units across (44 px on a phone held sideways). The keys mean the same in every puzzle:
     Space / Enter   act: the one thing there is to do, or the thing the keyboard is on
     ← →             choose among the things (a white ring shows which one), or, where things are slid, move the
                     one in hand
     1 2 3 …         pick a thing straight away
     S               skip, once 「건너뛰기」 is showing
   A caption ends with its keys in the same words everywhere (Z.KEYS: 「… · 스페이스 / 엔터」, 「… · ← → 로
   고르고 스페이스로」, …), on screens that have a keyboard.
   Help comes the same way in every puzzle, in three steps (Z.coach; the views in views.js, lakehelp.js,
   skyplaces2.js and dreamroom.js use it too):
     1. left alone ~7 s: a soft glow on the next useful thing (hintAt)
     2. ~18 s, or after 2 mistakes (G.wrong): a short line at the top, what to do but never the answer (tip)
     3. ~40 s, or after 4 mistakes: 「건너뛰기」 in the top right corner (tap it, or S). It finishes the puzzle the
        way solving it would (G.solve, or else the puzzle plays itself through next()), so the story goes on
        through its own success.
   「힌트: 적게」 in the settings makes each step wait about twice as long. The test bots press what next() and
   S.want() say, never the skip.

   A puzzle is a little object a scene holds while it is being played:
     begin(clock) -> promise · draw(g, t) · pointer(type, x, y) · key(key) · update(dt)
     next() -> the key that is right just now (the hint, and how the tests play)
     hintAt() -> where on the screen that is
     tip: the line for step 2 · keys: 'act' | 'pick' | 'move' | 'sides' (Z.KEYS), words of its own, or a function
     giving one of those (null while there is nothing to press)
     spots() -> [[n, x, y, r], …]: what ← → choose among (n as tap(n) takes it) · solve(): finish as if solved */
(function () {
  'use strict';
  const T = window.TYT, P = T.P, K = T.town;
  const TAU = Math.PI * 2;
  const Z = (T.puzzle = {});
  const INK = '#f3ead8';

  /* ---------- the keys, said the same way everywhere ---------- */
  Z.KEYS = { act: '스페이스 / 엔터', pick: '← → 로 고르고 스페이스로', move: '스페이스로 고르고 ← → 로 옮겨요', sides: '← →' };
  /* a phone or tablet with no keyboard is not told about keys (until a key is pressed on it after all) */
  const touchOnly = () => !!(window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches);
  Z.hasKeys = () => !!T.keyUsed || !touchOnly();
  Z.keys = (kind) => (kind && Z.hasKeys() ? Z.KEYS[kind] || kind : '');
  /* a caption with its keys after it */
  Z.withKeys = (text, kind) => { const k = Z.keys(kind); return text && k ? T.tr(text) + ' · ' + T.tr(k) : text; };
  Z.isSkipKey = (key) => key === 's' || key === 'S' || key === 'ㄴ';   /* ㄴ: the same key with Korean input */
  Z.isAct = (key) => key === ' ' || key === 'Enter';
  /* the thing the keyboard is on: a plain white ring, unlike the soft glow of a hint */
  Z.focusRing = function (g, x, y, r, t, a) {
    if (a <= 0.01) return;
    const p = 0.5 + 0.5 * Math.sin(t * 4), R = Math.max(28, r);
    g.save(); g.globalAlpha *= a;
    g.strokeStyle = 'rgba(20,26,44,0.45)'; g.lineWidth = 6; g.beginPath(); g.arc(x, y, R + 2 * p, 0, TAU); g.stroke();
    g.strokeStyle = '#fffaec'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, R + 2 * p, 0, TAU); g.stroke();
    P.fill(g, P.poly([[x - 10, y - R - 20 - 3 * p], [x + 10, y - R - 20 - 3 * p], [x, y - R - 8 - 3 * p]]), '#fffaec');
    g.restore();
  };

  /* ---------- one way to help ----------
     o: { idle() seconds since the player last did something, stuck() (for steps 2 and 3, if it is not just idle),
          misses() mistakes so far, live() the puzzle is waiting on the player, hintAt() [x, y] on the screen, r (the
          glow's size), tip (text, or a function), solve() finish it as if solved }
     C.update(dt) · C.glow(g, t, a, r) · C.draw(g, t, a) (the tip and the skip) · C.pointer(type, x, y) / C.key(key):
     true if it was the skip · C.end() once the puzzle is over */
  const STEPS = { basic: { glow: 7, tip: 18, tipMiss: 2, skip: 40, skipMiss: 4 }, less: { glow: 14, tip: 36, tipMiss: 4, skip: 80, skipMiss: 7 } };
  const steps = () => STEPS[T.hintLevel] || STEPS.basic;
  const MC = document.createElement('canvas').getContext('2d');   /* for measuring words before they are drawn */
  const SAID_SKIP = '막히면 오른쪽 위의 건너뛰기를 눌러도 돼요', SAID_SKIPPED = '건너뛰었어요';   /* read aloud */
  Z.coach = function (o) {
    const C = { tipOn: false, skipOn: false, tipA: 0, skipA: 0, glowA: 0, over: false, ended: false, skipped: false };
    const live = () => !C.ended && (!o.live || o.live());
    const tipText = () => (typeof o.tip === 'function' ? o.tip() : o.tip) || '';
    C.update = function (dt) {
      const L = steps(), on = live();
      if (on) {
        const id = o.idle ? o.idle() : 0, st = o.stuck ? o.stuck() : id, m = o.misses ? o.misses() : 0;
        if (!C.tipOn && (st >= L.tip || m >= L.tipMiss) && tipText()) { C.tipOn = true; T.announce(tipText()); }
        if (!C.skipOn && (st >= L.skip || m >= L.skipMiss)) { C.skipOn = true; T.announce(SAID_SKIP); }
        C.glowA += (T.clamp((id - L.glow) / 1.2) - C.glowA) * Math.min(1, dt * 8);
      } else C.glowA = Math.max(0, C.glowA - dt * 3);
      const k = Math.min(1, dt * 3);
      C.tipA += ((on && C.tipOn ? 1 : 0) - C.tipA) * k;
      C.skipA += ((on && C.skipOn ? 1 : 0) - C.skipA) * k;
    };
    /* step 1: the soft glow on the next useful thing */
    C.glow = function (g, t, a, r) {
      if (C.glowA <= 0.01 || !o.hintAt) return;
      const q = o.hintAt();
      if (q) P.beacon(g, q[0], q[1], r || o.r || 46, t, C.glowA * (a == null ? 1 : a), '#fff0c8');
    };
    /* step 3: under the sound and settings buttons, in the top right corner */
    function chip() {
      const V = T.view, label = T.tr('건너뛰기') + (Z.hasKeys() ? '  ·  S' : '  ›');
      MC.font = P.font('serif', 22);
      const w = MC.measureText(label).width + 44, h = 46, fit = V.fit || 1;
      const below = Math.max(10, (V.top || 0) + 12) + 40 - (V.top || 0);   /* the buttons' foot, in page pixels from the canvas top */
      return { x: V.W / 2 - 30 - w / 2, y: Math.max(112, below / fit + 46), w, h, label, hw: Math.max(w / 2 + 8, 24 / fit), hh: Math.max(h / 2 + 8, 24 / fit) };
    }
    const onChip = (x, y) => { const b = chip(); return Math.abs(x - b.x) < b.hw && Math.abs(y - b.y) < b.hh; };
    C.draw = function (g, t, a) {
      a = a == null ? 1 : a;
      /* step 2: a short line at the top, what to do */
      const s = C.tipA > 0.01 ? tipText() : '';
      if (s) {
        /* kept clear of the dream tray (top left) and the skip (top right); a long line goes onto two */
        const V = T.view, al = a * C.tipA, y = 58, maxW = Math.max(520, V.W - 540), tx = T.tr(s);
        MC.font = P.font('serif', 23);
        let lines = [tx];
        if (MC.measureText(tx).width > maxW - 80) {
          let best = -1, bd = 1e9;
          for (let j = 0; j < tx.length; j++) if (tx[j] === ' ' && Math.abs(j - tx.length / 2) < bd) { bd = Math.abs(j - tx.length / 2); best = j; }
          if (best > 0) lines = [tx.slice(0, best), tx.slice(best + 1)];
        }
        const w = Math.min(maxW, Math.max(...lines.map((l) => MC.measureText(l).width)) + 80), h = 22 + lines.length * 32;
        g.save(); g.globalAlpha *= al;
        const box = P.rr(-w / 2, y - 27, w, h, 27);
        P.fill(g, box, 'rgba(14,20,32,0.6)');
        g.strokeStyle = 'rgba(255,233,176,0.42)'; g.lineWidth = 1.5; g.stroke(box);
        P.glow(g, -w / 2 + 28, y, 16, '#ffe9b0', 0.7);
        P.fill(g, P.circle(-w / 2 + 28, y, 4.5), '#fff3d2');
        g.restore();
        lines.forEach((l, i) => P.text(g, l, 12, y + 8 + i * 32, { font: 'serif', size: 23, color: '#ffe9b0', alpha: al, fit: w - 76, nowrap: true }));
      }
      if (C.skipA > 0.01) {
        const b = chip(), al = a * C.skipA * (C.over ? 1 : 0.86);   /* quiet, but it must still read on a pale dream */
        g.save(); g.globalAlpha *= al;
        const box = P.rr(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h, b.h / 2);
        P.fill(g, box, C.over ? 'rgba(14,20,32,0.7)' : 'rgba(14,20,32,0.56)');
        g.strokeStyle = 'rgba(243,234,216,0.5)'; g.lineWidth = 1.5; g.stroke(box);
        g.restore();
        P.text(g, b.label, b.x, b.y + 7, { font: 'serif', size: 22, color: '#f3ead8', alpha: al, nowrap: true });
      }
    };
    C.pointer = function (type, x, y) {
      if (C.skipA < 0.5 || !live()) { C.over = false; return false; }
      C.over = onChip(x, y);
      if (type === 'move' && C.over) T.cursor('pointer');
      if (type === 'down' && C.over) { C.skip(); return true; }
      return false;
    };
    C.key = function (key) {
      T.keyUsed = true;
      if (C.skipA < 0.5 || !live() || !Z.isSkipKey(key)) return false;
      C.skip(); return true;
    };
    C.skip = function () {
      if (C.ended) return;
      C.ended = true; C.skipped = true; C.over = false;
      T.announce(SAID_SKIPPED);
      if (o.solve) o.solve();
    };
    C.end = function () { C.ended = true; };
    C.chipAt = () => { const b = chip(); return [b.x, b.y]; };   /* (where the skip sits: the tests press it) */
    return C;
  };

  /* ---------- the frame every puzzle here is built on ---------- */
  function make(o) {
    const G = Object.assign({ a: 0, idle: 0, done: false, shake: 0, quiet: false, say: '', mistakes: 0, focus: -1, kb: false, auto: false }, o);
    G.promise = new Promise((res) => { G.res = res; });
    G.begin = function (clock) { G.clock = clock; G.idle = 0; G.mistakes = 0; arm(); clock.tween(G, 'a', 1, 0.8, T.ease.out3); if (G.start) G.start(); return G.promise; };
    G.finish = function (hold) {
      if (G.done) return;
      G.done = true; G.say = ''; G.auto = false;
      if (G.coach) G.coach.end();
      const k = G.clock;
      k.wait(hold == null ? 1.3 : hold).then(() => k.tween(G, 'a', 0, 0.8, T.ease.io)).then(() => G.res());
    };
    G.wrong = function (text) { G.shake = 1; G.idle = 0; G.mistakes++; if (text) G.say = text; T.audio.sfx('knock', 0.2); };
    G.dim = function (g, k) { const V = T.view; g.fillStyle = T.rgba('#141a2c', (k == null ? 0.62 : k) * G.a); g.fillRect(-V.W / 2, 0, V.W, V.H); };
    /* the line at the foot of the screen: what went wrong if something did, else what to do, and its keys while
       there is something to press (G.keys may be a function, null when there is not) */
    G.caption = function (g, text) {
      const k = G.done ? null : typeof G.keys === 'function' ? G.keys() : G.keys;
      T.band(g, G.a); P.text(g, G.say || Z.withKeys(text, k), 0, 850, { font: 'serif', size: 25, color: INK, alpha: 0.94 * G.a, glow: 'rgba(8,12,22,0.9)' });
    };
    G.update = function (dt) { G.idle += dt; G.shake = Math.max(0, G.shake - dt * 2.6); };
    /* left alone long enough, it shows the next move (step 1); G.hintR: a glow that rings round bigger things */
    G.hintRing = function (g, t) { G.ringed = true; if (G.done || !G.hintAt || !G.coach) return; G.coach.glow(g, t, G.a, G.hintR || 46); };
    G.pointer = function (type, x, y) {
      if (G.done || G.a < 0.6) return;
      if (type === 'move') { if (G.hit && !G.auto) T.cursor(G.hit(x, y) >= 0 ? 'pointer' : 'default'); return; }
      if (type !== 'down') return;
      G.kb = false;
      const n = G.hit(x, y); if (n >= 0) G.tap(n);
    };
    /* ← → walk the white ring along the things there are (left to right); Space / Enter takes the one it is on */
    function spots() { return G.spots ? G.spots().filter(Boolean).sort((p, q) => p[1] - q[1] || p[2] - q[2]) : []; }
    function moveFocus(d) {
      const list = spots();
      if (!list.length) return false;
      let i = G.kb ? list.findIndex((q) => q[0] === G.focus) : -1;
      i = i < 0 ? (d > 0 ? 0 : list.length - 1) : (i + d + list.length) % list.length;
      G.focus = list[i][0]; G.kb = true; G.idle = 0;
      T.audio.sfx('step');
      return true;
    }
    G.key = function (key) {
      if (G.done || G.a < 0.6) return;
      if (G.kb && Z.isAct(key) && G.spots) { const s = spots().find((q) => q[0] === G.focus); if (s) { G.tap(s[0]); return; } }
      const n = G.keyOf ? G.keyOf(key) : key >= '1' && key <= '9' ? +key - 1 : -1;
      if (n >= 0) { G.kb = false; G.tap(n); return; }
      if (G.spots && (key === 'ArrowLeft' || key === 'ArrowRight')) return moveFocus(key === 'ArrowLeft' ? -1 : 1) ? undefined : false;
      if (G.spots && Z.isAct(key)) return moveFocus(1) ? undefined : false;   /* the first press shows where the keyboard is */
      return false;
    };
    G.jig = (t, i) => (G.shake ? Math.sin(t * 42 + i * 1.7) * 6 * G.shake : 0);

    /* the help, the ring and the skip go round whatever draw / update / pointer / key the puzzle has by now */
    function arm() {
      if (G.coach) return;
      const C = (G.coach = Z.coach({
        idle: () => G.idle, misses: () => G.mistakes, live: () => !G.done && !G.auto && G.a > 0.6,
        hintAt: () => (G.hintAt ? G.hintAt() : null), tip: () => (typeof G.tip === 'function' ? G.tip() : G.tip), solve: skipped,
      }));
      const draw0 = G.draw, upd0 = G.update, ptr0 = G.pointer, key0 = G.key;
      G.draw = function (g, t) {
        G.ringed = false;
        draw0.call(G, g, t);
        if (G.a < 0.005) return;
        if (!G.ringed) G.hintRing(g, t);
        if (G.kb && !G.done && !G.auto) { const s = spots().find((q) => q[0] === G.focus); if (s) Z.focusRing(g, s[1], s[2], s[3] || 50, t, G.a); }
        C.draw(g, t, G.a);
      };
      G.update = function (dt) { upd0.call(G, dt); C.update(dt); if (G.auto && !G.done) autoplay(dt); };
      G.pointer = function (type, x, y) { if (C.pointer(type, x, y)) return; const r = ptr0.call(G, type, x, y); if (type === 'move' && C.over) T.cursor('pointer'); return r; };
      G.key = function (key) { if (C.key(key)) return; return key0.call(G, key); };
      /* skipped: finished the way solving it would finish it, or, for a puzzle with no solve(), played by itself */
      let autoT = 0, autoFor = 0, autoNone = 0;
      function skipped() {
        if (G.done) return;
        G.say = ''; G.kb = false;
        if (G.solve) G.solve(); else G.auto = true;
      }
      function autoplay(dt) {
        autoFor += dt; autoT -= dt;
        /* whatever happens, the story does not wait on it for ever: if it cannot play itself, it is simply done */
        if (autoFor > 60 || autoNone > 8) { G.finish(0.6); return; }
        if (autoT > 0) return;
        const k = G.next && G.next();
        if (k) { autoNone = 0; key0.call(G, k); autoT = 0.12; } else autoNone += dt;
      }
    }
    return G;
  }
  Z.make = make;   /* the jobs of work (work.js) are built on the same frame */

  /* ---------- the bell asks, the lamps answer ---------- */
  /* o: { rounds: [[lamp, lamp, …], …], beat } — four lamps, the four notes of the call */
  Z.bell = function (o) {
    /* The bell asks with a few notes, each lighting a lamp; the lamps answer in the same order.
       Every lamp has its own colour, which travels with it when the lamps change places; dots under them
       show how long the question is. Miss once and the dots keep their colours, as a guide.
       The bell itself can be tapped to hear the question again, at no cost. */
    const NOTE = [69, 67, 65, 72], COL = ['#ffcf6a', '#f39ab4', '#8fc8ff', '#9ee39a'];
    const G = make({ quiet: true, rounds: o.rounds, r: 0, i: 0, phase: 'listen', lit: [0.12, 0.12, 0.12, 0.12], pos: [0, 1, 2, 3], vis: [0, 1, 2, 3], marks: [], miss: 0, ring: 0 });
    const lx = (n) => (G.vis[n] - 1.5) * 196, LY = 300, BELL = [0, 138];
    const want = (seq, i) => (o.reverse ? seq[seq.length - 1 - i] : seq[i]);
    const glow = (n) => { G.lit[n] = 1; G.clock.tween(G.lit, n, 0.12, 1.1, T.ease.out); };
    async function ask() {
      const k = G.clock, seq = G.rounds[G.r];
      G.phase = 'listen'; G.i = 0;
      G.marks = seq.map((n) => ({ n, a: 0, done: 0 }));
      await k.wait(0.9);
      if (G.done) return;
      G.say = '';
      G.pos = [0, 1, 2, 3]; G.vis = [0, 1, 2, 3];
      G.ring = 1; k.tween(G, 'ring', 0, 0.8);
      for (let i = 0; i < seq.length; i++) { if (G.done) return; const n = seq[i]; glow(n); G.marks[i].a = 1; T.audio.note({ m: NOTE[n] - 12, vel: 0.34, voice: 'bell', dur: 5 }); await k.wait(o.beat || 1.0); }
      if (o.shuffle) {   /* the lamps drift to new places: follow the colour you heard, not the place it stood */
        const sh = [[1, 0, 3, 2], [2, 3, 0, 1], [3, 0, 1, 2]][G.r % 3];
        G.pos = sh.slice(); T.audio.sfx('whoosh');
        for (let n = 0; n < 4; n++) k.tween(G.vis, n, sh[n], 1.2, T.ease.io);
        await k.wait(1.3);
      }
      if (G.done) return;
      /* the first time, the dots go pale and it is a memory; after a miss they stay as a guide */
      G.marks.forEach((m) => k.tween(m, 'a', G.miss ? 0.6 : 0, 0.7));
      G.phase = 'answer'; G.idle = 0;
    }
    G.start = ask;
    G.keyOf = (key) => (key === 'r' || key === 'R' || key === '0' ? 9 : key >= '1' && key <= '4' ? +key - 1 : -1);
    G.hit = (x, y) => {
      if (Math.hypot(x - BELL[0], y - BELL[1]) < 64) return 9;
      for (let n = 0; n < 4; n++) if (Math.hypot(x - lx(n), y - (LY + 80)) < 92) return n;
      return -1;
    };
    G.tap = function (n) {
      if (n === 9) { if (G.phase === 'answer') { G.idle = 0; ask(); } return; }
      if (G.phase !== 'answer' || n > 3) return;
      const seq = G.rounds[G.r];
      G.idle = 0;
      if (n !== want(seq, G.i)) {
        G.miss++;
        G.wrong(o.reverse ? '떠나보낼 때는 거꾸로예요. 마지막에 울린 등불부터. 종이 한 번 더 물어요' : o.shuffle ? '등불이 자리를 바꿨어요. 울린 색을 따라가 보세요. 종이 한 번 더 물어요' : '종이 부르는 차례를 한 번 더 들어 보세요');
        ask(); return;
      }
      glow(n); T.audio.note({ m: NOTE[n], vel: 0.42, voice: 'felt', dur: 4 });
      const mi = o.reverse ? seq.length - 1 - G.i : G.i;
      if (G.marks[mi]) { G.marks[mi].done = 1; G.marks[mi].a = 1; }
      if (++G.i < seq.length) return;
      G.phase = 'pause'; G.r++; G.miss = 0;
      if (o.onRound) o.onRound(G.r, G.rounds.length);
      if (G.r >= G.rounds.length) { T.audio.sfx('join'); G.finish(1.1); } else G.clock.wait(0.6).then(ask);
    };
    G.next = () => (G.phase === 'answer' && !G.done ? String(want(G.rounds[G.r], G.i) + 1) : null);
    G.hintAt = () => (G.phase === 'answer' ? [lx(want(G.rounds[G.r], G.i)), LY + 80] : null);
    G.keys = () => (G.phase === 'answer' ? 'pick' : null);
    G.tip = o.reverse ? '마지막에 울린 등불부터 거꾸로 눌러요' : o.shuffle ? '자리 말고 색을 보고, 울린 차례대로 눌러요' : '종이 울린 차례대로 등불을 눌러요';
    G.spots = () => (G.phase !== 'answer' ? [] : [0, 1, 2, 3].map((n) => [n, lx(n), LY + 80, 78]).concat([[9, BELL[0], BELL[1], 56]]));
    /* skipped: the lamps answer every question that is left, and the bell is content */
    G.solve = function () {
      G.phase = 'pause'; G.marks = [];
      while (G.r < G.rounds.length) { G.r++; if (o.onRound) o.onRound(G.r, G.rounds.length); }
      for (let n = 0; n < 4; n++) glow(n);
      T.audio.sfx('join'); G.finish(1.1);
    };
    G.draw = function (g, t) {
      if (G.a < 0.005) return;
      G.dim(g, 0.5);
      g.save(); g.globalAlpha = G.a;
      /* the bell, which can be asked again */
      g.save(); g.translate(BELL[0], BELL[1]); g.rotate(Math.sin(t * 14) * 0.18 * G.ring);
      P.line(g, 0, -56, 0, -40, 4, '#6f5346');
      P.fill(g, P.soft([[-30, 18], [-24, -16], [-12, -38], [12, -38], [24, -16], [30, 18]]), '#d7a23c');
      P.fill(g, P.rr(-36, 14, 72, 9, 4), '#b8862c'); P.fill(g, P.circle(0, 28, 7), '#8a6420');
      g.restore();
      g.strokeStyle = '#6f5346'; g.lineWidth = 4;
      g.beginPath(); g.moveTo(lx(0) - 170, LY - 40); g.quadraticCurveTo(0, LY + 44, lx(3) + 170, LY - 40); g.stroke();
      for (let n = 0; n < 4; n++) {
        const x = lx(n) + G.jig(t, n), y = LY + [4, 20, 20, 4][n];
        P.glow(g, x, y + 76, 100, COL[n], 0.38 + 0.5 * G.lit[n]);
        K.lantern(g, x, y, t, { bare: true, s: 4, lit: G.lit[n], seed: n + 1 });
        /* a coloured tassel, so each lamp can be told apart */
        P.line(g, x, y + 136, x, y + 156, 4, COL[n]);
        P.fill(g, P.circle(x, y + 158, 7), COL[n]);
        P.fill(g, P.poly([[x - 13, y + 160], [x + 13, y + 160], [x + 8, y + 204], [x - 8, y + 204]]), COL[n]);
      }
      /* the question, as dots */
      const M = G.marks, gap = 46;
      M.forEach((m, i) => {
        const x = (i - (M.length - 1) / 2) * gap, y = 560;
        P.fill(g, P.circle(x, y, 15), 'rgba(243,234,216,0.2)');
        if (m.a > 0.01) P.fill(g, P.circle(x, y, 14), T.rgba(COL[m.n], m.a));
        if (m.done) { g.strokeStyle = '#fff6e0'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 19, 0, Math.PI * 2); g.stroke(); }
      });
      for (let i = 0; i < G.rounds.length; i++) P.fill(g, P.circle((i - (G.rounds.length - 1) / 2) * 28, 640, 6), i < G.r ? '#ffd98a' : 'rgba(243,234,216,0.3)');
      g.restore();
      G.hintRing(g, t);
      G.caption(g, G.phase === 'answer' ? (o.reverse ? '떠나보낼 때는 거꾸로, 마지막에 울린 등불부터 눌러 주세요 · 종을 누르면 다시 들려줘요' : o.shuffle ? '등불이 자리를 바꿨어요. 울린 색을 따라 같은 차례로 눌러 주세요 · 종을 누르면 다시 들려줘요' : '같은 차례로 등불을 눌러 대답해 주세요 · 종을 누르면 다시 들려줘요') : G.done ? '' : '종이 부르는 차례를 들어 보세요');
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
    G.keys = 'pick';
    G.tip = '돌을 눌러 구덩이에 놓아요. 놓은 돌은 다시 누르면 들려요';
    G.spots = () => tray.map((s, n) => (G.placed.includes(s) ? null : [n, sx(n), TY - 30, 62]));
    G.solve = function () { G.placed = depth.map((d, i) => i); T.audio.promise(); G.finish(1.5); };
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
    G.keys = 'pick';
    G.tip = '나무를 하나씩 눌러 세워요. 받쳐 줄 것부터'; G.hintR = 70;
    G.spots = () => tray.map((id, n) => (G.has[id] ? null : [n, tx(n), TY, 60]));
    G.solve = function () {
      PIECES.forEach((p, id) => { if (!G.has[id]) { G.has[id] = true; G.clock.wait(id * 0.12).then(() => G.clock.tween(G.up, id, 1, 0.55, T.ease.out3)); } });
      T.audio.promise(); G.finish(2);
    };
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
    G.keys = 'pick';
    G.tip = '말뚝을 눌러 고리를 풀어요. 맨 위 고리부터';
    G.spots = () => [0, 1, 2].map((b) => [b, bx(b), BY - 150, 70]);
    G.solve = function () { G.left = 0; T.audio.sfx('join'); G.finish(1.1); };
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
    G.keys = 'pick';
    G.tip = '병 두 개를 눌러 넣고, 노란 점을 세어 봐요'; G.hintR = 76;
    G.spots = () => (G.busy ? [] : [0, 1, 2, 3].map((n) => [n, jx(n), JY, 70]));
    /* skipped: the two that are hers go in (if a try is still being tasted, it is tasted as hers) */
    G.solve = function () {
      G.pick = ans.slice();
      if (G.busy) return;
      G.tries.push({ pick: ans.slice().sort(), m: 2 }); if (G.tries.length > 5) G.tries.shift();
      T.audio.promise(); G.finish(1.7);
    };
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
    G.keys = 'pick';
    G.tip = '아래의 꽃을 눌러 반짝이는 빈자리를 채워요'; G.hintR = 78;
    G.spots = () => [0, 1, 2].map((n) => [n, bx(n), BY, 66]);
    G.solve = function () { G.n = gaps.length; T.audio.promise(); G.finish(1.6); };
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
