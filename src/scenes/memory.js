/* Take Your Time — what the four memories share: the paper they are painted on,
   the promise written at the end, the melody that advances under the player's hand. */
(function () {
  'use strict';
  const T = window.TYT, P = T.P;

  T.finishMemory = function (id) {
    const st = T.state;
    if (!st.done[id]) { st.done[id] = true; st.count++; st.order.push(id); }
    T.director.go('room', { style: 'fade', color: '#f3ead8', out: 1.3, in: 1.5, args: { from: id } });
  };

  /* Wrap a scene with the shared behaviour. def: { id, line, ink, lineY, seed, chord } */
  T.memory = function (S, def) {
    const M = { line: { k: 0, a: 0 }, ready: false, done: false, noteI: 0, idle: 0, frame: null, veil: { a: 1 } };
    S.M = M;
    M.rebuild = function () { M.frame = P.paperFrame(def.seed || 5, 44); };
    M.enter = function () {
      M.line.k = 0; M.line.a = 0; M.ready = false; M.done = false; M.idle = 0; M.leaving = false;
      /* each memory picks the tune up where the last one left it */
      M.noteI = (T.state.count * 4) % T.audio.melodyLength;
      P.grainAmt = 0.2; P.vignette = 0.16; P.vignetteColor = '#5a4630';
      T.audio.ambience(0.12, 0.08);
      T.audio.pad(def.chord || 0, 0.16);
      M.veil.a = 1;
      S.clock.tween(M.veil, 'a', 0, 1.6, T.ease.io);
    };
    /* one more note of the lullaby */
    M.note = function (o) { const bar = T.audio.step(M.noteI++, o); return bar; };
    M.touch = function () { M.idle = 0; };
    M.update = function (dt) { M.idle += dt; };
    /* how visible the gesture hint should be: it waits, then fades in */
    M.hint = function (delay = 2.2) { return M.done ? 0 : T.clamp((M.idle - delay) / 1.2); };

    M.finish = async function () {
      if (M.done) return;
      M.done = true;
      const k = S.clock;
      await k.wait(def.pause == null ? 0.9 : def.pause);
      T.audio.promise();
      T.announce(def.line.replace(/\n/g, ' '));
      M.line.a = 1;
      await k.tween(M.line, 'k', 1, Math.max(1.2, P.count(def.line) * 0.085), T.ease.lin);
      await k.wait(0.9);
      M.ready = true;
      await Promise.race([new Promise((res) => (M.tap = res)), k.wait(8)]);
      M.leave();
    };
    M.leave = function () {
      if (M.leaving) return;
      M.leaving = true; M.ready = false; M.tap = null;
      T.audio.pad(null);
      T.finishMemory(def.id);
    };
    M.pointerDone = function (type) {
      if (type === 'down' && M.ready && M.tap) { M.tap(); return true; }
      return M.done;
    };
    /* paper edge, the promise, the "go on" dot */
    M.drawOver = function (g) {
      const V = T.view;
      if (M.veil.a > 0.003) { g.fillStyle = T.rgba('#f3ead8', M.veil.a); g.fillRect(-V.W / 2, 0, V.W, V.H); }
      if (M.line.a > 0) {
        const y = def.lineY || 770;
        if (def.band !== false) {
          const gr = g.createLinearGradient(0, y - 150, 0, V.H);
          const c = def.bandColor || '#1a2233';
          const ba = (def.bandA || 1) * Math.min(1, M.line.k * 3);
          gr.addColorStop(0, T.rgba(c, 0)); gr.addColorStop(0.55, T.rgba(c, Math.min(1, 0.42 * ba))); gr.addColorStop(1, T.rgba(c, Math.min(1, 0.5 * ba)));
          g.fillStyle = gr; g.fillRect(-V.W / 2, y - 150, V.W, V.H - y + 150);
        }
        P.text(g, def.line, 0, y, { size: def.size || 70, color: def.ink || '#fff6e0', k: M.line.k, seed: def.seed || 3, glow: def.glow });
      }
      P.drawFrame(g, M.frame);
      if (M.ready) T.continueDot(g, 0, 846, def.dot || '#fff6e0');
    };
    return M;
  };
})();
