/* Take Your Time — the few bits of interface the scenes share: spoken lines and the "go on" dot. */
(function () {
  'use strict';
  const T = window.TYT, P = T.P;
  const TAU = Math.PI * 2;

  T.continueDot = function (g, x, y, color) {
    const p = 0.5 + 0.5 * Math.sin(T.time * 3);
    g.save();
    g.globalAlpha = 0.35 + 0.4 * p; g.fillStyle = color;
    g.beginPath(); g.arc(x, y + p * 3, 5, 0, TAU); g.fill();
    g.restore();
  };

  const WHO = {
    leo: ['레오', '#fbeccb'], ana: ['아나', '#ffdccf'], nana: ['할머니', '#f3e6f4'],
    bram: ['브램 선장', '#dfe8f4'], rosa: ['로사', '#fff0c0'], mom: ['엄마', '#e2f2ee'], both: ['레오와 아나', '#fff3dc'],
  };

  /* One line at a time at the foot of the screen. A tap finishes the line, the next tap moves on. */
  T.talk = function (S) {
    const K = { cur: null };
    K.clear = function () { K.cur = null; };
    K.say = function (who, text, o = {}) {
      const k = S.clock;
      const n = P.count(text);
      const tk = (K.cur = { who, text, k: 0, done: false, a: 1 });
      T.announce(WHO[who][0] + ': ' + text.replace(/\n/g, ' '));
      const dur = Math.max(0.6, n * (o.slow ? 0.11 : 0.062));
      k.tween(tk, 'k', 1, dur, T.ease.lin).then(() => { tk.done = true; });
      /* a remark in passing leaves by itself: o.auto seconds after it has been said */
      if (o.auto) k.wait(dur + o.auto).then(() => { if (K.cur === tk && tk.next) { tk.done = true; tk.next(); } });
      return new Promise((res) => {
        tk.next = () => {
          if (!tk.done) { tk.k = 1; tk.done = true; k.tweens = k.tweens.filter((w) => w.obj !== tk); return; }
          tk.next = null; res();
        };
      }).then(() => k.tween(tk, 'a', 0, 0.35)).then(() => { if (K.cur === tk) K.cur = null; });
    };
    K.tap = function () { const tk = K.cur; if (tk && tk.next) { tk.next(); return true; } return false; };
    K.draw = function (g) {
      const tk = K.cur;
      if (!tk) return;
      const V = T.view;
      const gr = g.createLinearGradient(0, 640, 0, 900);
      gr.addColorStop(0, 'rgba(14,20,32,0)'); gr.addColorStop(1, T.rgba('#0e1420', 0.62 * tk.a));
      g.fillStyle = gr; g.fillRect(-V.W / 2, 640, V.W, 260);
      const col = WHO[tk.who][1];
      const lines = tk.text.split('\n').length;
      P.text(g, tk.text, 0, lines > 1 ? 782 : 810, { font: 'serif', size: 38, color: col, k: tk.k, alpha: tk.a, lh: 1.5 });
      if (tk.done && tk.a > 0.9) T.continueDot(g, 0, 872, col);
    };
    return K;
  };
})();
