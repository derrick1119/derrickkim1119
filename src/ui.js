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

  /* the dark band words sit on at the foot of the screen, so they read over anything */
  T.band = function (g, a) {
    const V = T.view, gr = g.createLinearGradient(0, 760, 0, 900);
    gr.addColorStop(0, 'rgba(14,20,32,0)'); gr.addColorStop(0.45, T.rgba('#0e1420', 0.55 * a)); gr.addColorStop(1, T.rgba('#0e1420', 0.75 * a));
    g.fillStyle = gr; g.fillRect(-V.W / 2, 760, V.W, 140);
  };

  const WHO = {
    leo: ['레오', '#fbeccb'], ana: ['아나', '#ffdccf'], mom: ['엄마', '#f3e6f4'],
    bram: ['브램 선장', '#dfe8f4'], v1: ['이웃 할아버지', '#e6efe2'], v2: ['빵집 아주머니', '#fbe7d6'], v3: ['목수 아저씨', '#e8e2f2'], rosa: ['로사', '#fff0c0'], wife: ['마르타', '#f0e2f0'], son: ['로사의 아들', '#e6e9ef'], kid: ['피피', '#fde6c8'], pmom: ['피피의 엄마', '#f6e6da'], pdad: ['피피의 아빠', '#e3ecf2'], post: ['집배원', '#dfeaf2'], lily: ['릴리', '#e2ecf8'], dil: ['로사의 며느리', '#f2e6e0'], both: ['레오와 아나', '#fff3dc'],
  };

  /* One line at a time at the foot of the screen. A tap finishes the line, the next tap moves on. */
  T.talk = function (S) {
    const K = { cur: null };
    K.clear = function () { K.cur = null; };
    K.say = function (who, text, o = {}) {
      const k = S.clock;
      const n = P.count(text);
      const tk = (K.cur = { who, text, k: 0, done: false, a: 1, pass: !!o.pass });   /* pass: said in passing; a tap goes through to the scene */
      T.announce(T.tr(WHO[who][0]) + ': ' + T.tr(text).replace(/\n/g, ' '));
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
    K.tap = function () { const tk = K.cur; if (tk && tk.next && !tk.pass) { tk.next(); return true; } return false; };
    K.draw = function (g) {
      const tk = K.cur;
      if (!tk) return;
      const V = T.view;
      const gr = g.createLinearGradient(0, 668, 0, 900);   /* dark enough to read over a pale sea of cloud, and no taller than the words need */
      gr.addColorStop(0, 'rgba(14,20,32,0)'); gr.addColorStop(0.42, T.rgba('#0e1420', 0.6 * tk.a)); gr.addColorStop(1, T.rgba('#0e1420', 0.82 * tk.a));
      g.fillStyle = gr; g.fillRect(-V.W / 2, 668, V.W, 232);
      const col = WHO[tk.who][1];
      const lines = tk.text.split('\n').length;
      P.text(g, tk.text, 0, lines > 1 ? 782 : 810, { font: 'serif', size: 38, color: col, k: tk.k, alpha: tk.a, lh: 1.5, glow: 'rgba(8,12,22,0.9)' });
      if (tk.done && tk.a > 0.9) T.continueDot(g, 0, 872, col);
    };
    return K;
  };
})();
