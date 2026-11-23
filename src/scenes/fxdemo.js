/* Take Your Time — demo pages for the new pieces, reached by the address alone (main.js does not need to know):
     index.html#place:overlook   index.html#place:falls   index.html#lakehelp:1 (2, 3)   index.html#stars
     index.html#place:grove   index.html#place:post   index.html#place:whales   (skyplaces2.js)
   Each one is a tiny chapter on the stage (T.stage), so it shows the pieces exactly the way a chapter script would
   use them: X.view(view), V.done(), V.sail(), T.fx.star.add(), T.fx.wishLight(). T.fx.demo.done turns true at the end.
   Not part of the story: the line for this file can be left out of index.html for release. */
(function () {
  'use strict';
  const T = window.TYT, F = T.F;
  const FX = (T.fx = T.fx || {});
  const demo = (FX.demo = { done: false, kind: null });

  function parse(h) {
    h = (h || '').replace(/^#/, '');
    let m;
    if ((m = /^place:(\w+)$/.exec(h))) return { kind: 'place', name: m[1] };
    if ((m = /^lakehelp:([1-3])$/.exec(h))) return { kind: 'lakehelp', level: +m[1] };
    if (h === 'stars') return { kind: 'stars' };
    return null;
  }
  FX.parseDemo = parse;

  T.stage('fxdemo', {
    chapter: 0, title: ['', ''], end: ['', ''], pad: 2, mood: 'night',
    plot: { stage: 4, night: 0 },
    script: async function (X, args) {
      const A = X.A;
      demo.done = false; demo.kind = args.kind;
      if (args.kind === 'place') {
        const boat = { riders: [{ style: F.styles.bram, s: 128 }, { style: F.styles.bramWife, s: 124, flip: false }], hull: '#8a5a3b' };
        const V = T.place(args.name, args.name === 'falls' ? { boat } : {});
        await X.view(V, { color: args.name === 'falls' ? '#1b2440' : '#fff6e6', out: 0.05, in: 1.4 });
        /* the whales go by again and again; the grove and the post office hold out their little tasks */
        if (V.pass) (async () => { for (;;) { await V.pass({ dur: 40, from: 0.12 }); await X.wait(2); } })();
        if (V.find) (async () => { for (;;) { await V.find(); await X.wait(3); V.picked = null; V.held = null; } })();
        if (V.catchLetter) (async () => { for (;;) { await V.catchLetter(); await X.wait(3); const L = V.caught; if (L) { L.phase = 'fly'; } V.caught = null; } })();
        if (args.name === 'falls') {
          /* a crossing, again and again: the boat goes up, a star falls, and the next boat comes in */
          for (let n = 0; ; n++) {
            await X.wait(2.2);
            const leo = V.actor('leo'); if (leo) leo.armF = { a: 2.4, b: 0.2 };
            await V.sail({ waitStar: true });
            if (leo) leo.armF = null;
            demo.done = true;
            await X.wait(2.5);
            V.setBoat(n % 2 ? boat : { riders: [{ style: F.styles.rosa, s: 124 }, { style: F.styles.rosaSon, s: 128 }, { dog: true, s: 110 }], hull: '#6f7f9a' });
          }
        }
        /* the overlook: a day going by */
        await X.wait(2.5); demo.done = true;
        for (;;) { await X.tween(V.sun, 'k', 1, 7); await X.wait(2); await X.tween(V.sun, 'k', 0, 7); await X.wait(2); }
      }
      if (args.kind === 'lakehelp') {
        const V = T.lakeHelp({ level: args.level });
        await X.view(V, { color: '#1b2a40', out: 0.05, in: 1.2 });
        await V.done();
        demo.done = true;
        T.announce('릴리가 집에 왔다.');
        return;
      }
      if (args.kind === 'stars') {
        /* the harbour at night: stars cross, wishes fall into the cloud sea and fly to the corner */
        const ps = X.S.ps;
        ps.night = 0.85;
        X.cam(560, 380, 1); X.camSnap();
        const W = T.view.W;
        for (let n = 0; ; n++) {
          await X.wait(1.2);
          const x0 = W * (0.1 + (n % 3) * 0.12);
          await T.fx.star.add({ from: [x0, 50], to: [x0 - 620, 380], dur: 1.5 });
          const w = T.fx.wishLight({ from: [x0 - 560, 300], land: [x0 - 420 + (n % 2) * 160, 560], to: [-W / 2 + 70, 70], rest: 1 });
          await w;
          A.sfx('join');
          demo.done = true;
        }
      }
    },
  });

  /* start on the demo when the address asks for one; otherwise the game starts as it always does */
  const run0 = T.run;
  T.run = function (first, args) {
    const d = parse(location.hash);
    if (d) return run0('fxdemo', d);
    return run0(first, args);
  };
  window.addEventListener('hashchange', () => {
    const d = parse(location.hash);
    if (!d || !T.director.cur) return;
    T.director.trans = null;
    T.director.go('fxdemo', { style: 'fade', color: '#161d2a', out: 0.35, in: 0.6, args: d });
  });
})();
