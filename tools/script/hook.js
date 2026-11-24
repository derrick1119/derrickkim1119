// Injected before the game loads: records every spoken line (T.talk → K.say) and every piece of
// on-screen writing (P.text) in the order it first appears, tagged with the scene it appeared in.
(function () {
  const LOG = (window.__lines = []);
  const seenText = new Set();
  let T = null;
  const scene = () => { try { const d = T.director; return Object.keys(T.scenes).find((k) => T.scenes[k] === d.cur) || '?'; } catch (e) { return '?'; } };
  const wrapTalk = (fn) => function (S) {
    const K = fn.apply(this, arguments);
    const s0 = K.say;
    K.say = function (who, text, o) {
      LOG.push({ t: 'say', sc: scene(), who, text, slow: !!(o && o.slow), auto: !!(o && o.auto), time: T.time });
      return s0.apply(this, arguments);
    };
    return K;
  };
  const wrapText = (fn) => function (g, str, x, y, o) {
    try {
      if (typeof str === 'string' && /[가-힣]/.test(str)) {
        const sc = scene(), key = sc + '\u0001' + str;
        if (!seenText.has(key)) { seenText.add(key); LOG.push({ t: 'text', sc, text: str, time: T.time }); }
      }
    } catch (e) {}
    return fn.apply(this, arguments);
  };
  const trapP = (P) => {
    let text = P.text;
    Object.defineProperty(P, 'text', { configurable: true, get: () => text, set: (f) => { text = wrapText(f); } });
    if (text) text = wrapText(text);
  };
  let tyt;
  Object.defineProperty(window, 'TYT', {
    configurable: true,
    get: () => tyt,
    set: (v) => {
      tyt = v; T = v;
      let talk, P;
      Object.defineProperty(v, 'talk', { configurable: true, enumerable: true, get: () => talk, set: (f) => { talk = wrapTalk(f); } });
      Object.defineProperty(v, 'P', { configurable: true, enumerable: true, get: () => P, set: (p) => { P = p; trapP(p); } });
    },
  });
})();
