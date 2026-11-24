/* Take Your Time — demo pages for the new pieces, reached by the address alone (main.js does not need to know):
     index.html#place:overlook   index.html#place:falls   index.html#lakehelp:1 (2, 3)   index.html#stars
     index.html#place:grove   index.html#place:post   index.html#place:whales   (skyplaces2.js)
     index.html#gestures   index.html#gestures:<name>   index.html#gestures:faces   index.html#gestures:sheet   (gestures.js)
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
    if ((m = /^gestures(?::([\w-]+))?$/.exec(h))) return { kind: 'gestures', page: m[1] || null };
    return null;
  }
  FX.parseDemo = parse;

  /* ---------- the gesture showcase: index.html#gestures (every page in turn), #gestures:<name> (one gesture),
     #gestures:faces (the face presets on adult, child and old faces), #gestures:sheet (all of them at once, held).
     Each gesture page shows it three times: two adults, an adult with a child, two old people, playing in and out
     on a loop with its k drawn under it. T.fx.demo.page / T.fx.demo.freeze (seconds into the loop) steer it.
     It uses the pure helpers (T.pose.*, T.pose.pair), the same pose functions the actors play. */
  const GS = [
    { name: 'cry', ko: '울기', how: 'solo', col: [{ hands: 'face' }, { hands: 'both' }, { hands: 'wipe' }] },
    { name: 'sob-hug', ko: '안겨 흐느끼기', how: 'face', gap: 30, kneel: true, kgap: 40 },
    { name: 'hug', ko: '안아 주기', how: 'face', gap: 30, kneel: true, kgap: 40 },
    { name: 'pat-back', ko: '등 토닥이기', how: 'face', gap: 30, kneel: true, kgap: 40 },
    { name: 'laugh', ko: '웃음', how: 'solo', col: [{}, { hand: 'mouth' }, { hand: 'belly' }] },
    { name: 'surprise', ko: '놀람', how: 'solo' },
    { name: 'relief', ko: '안도의 한숨', how: 'solo' },
    { name: 'forehead', ko: '이마 맞대기', how: 'face', gap: 30, kneel: true, kgap: 42 },
    { name: 'hold-hands', ko: '손잡기', how: 'side', gap: 30 },
    { name: 'hand-on-head', ko: '머리에 손', how: 'face', gap: 28 },
    { name: 'cheek', ko: '뺨에 손', how: 'face', gap: 33, kneel: true, kgap: 44, popts: { cover: true } },
    { name: 'wave', ko: '손 흔들기', how: 'solo', col: [{ style: 'goodbye' }, { style: 'slow' }, { style: 'soft' }] },
    { name: 'look-up', ko: '하늘 보기', how: 'solo', col: [{}, {}, { shade: true }] },
    { name: 'kneel', ko: '한쪽 무릎 꿇기', how: 'face', gap: 46, one: true },
    { name: 'sit-ground', ko: '땅에 앉기', how: 'solo', col: [{}, { hug: true }, {}] },
    { name: 'lean-on', ko: '어깨에 기대기', how: 'side', gap: 15, sitCols: [1, 2] },
    { name: 'bow', ko: '고개 숙여 인사', how: 'solo', col: [{ depth: 'small' }, { depth: 'nod' }, { depth: 'deep' }] },
    { name: 'point', ko: '가리키기', how: 'solo', at: true },
    { name: 'shy', ko: '쑥스러움 (목 뒤에 손)', how: 'solo' },
    { name: 'shrug', ko: '어깨 으쓱', how: 'solo' },
  ];
  const FACE_COLS = [['', '보통'], ['teary', '글썽'], ['sob', '흐느낌'], ['smileTears', '울다 웃기'], ['gentle', '눈웃음'], ['surprised', '놀람'], ['softFrown', '시무룩'], ['laugh', '웃음'], ['relief', '안도'], ['shy', '수줍음'], ['wonder', '감탄']];
  function gestureShow(first) {
    const P = T.P, V = { dark: false, quiet: true, mood: 'still' };
    const pages = ['faces'].concat(GS.map((q) => q.name));
    demo.page = first || null; demo.freeze = null;
    let auto = 0, t0 = T.time, shown = null;
    const pairs = () => [
      { label: '어른 + 어른', a: { style: F.styles.leo, s: 300 }, b: { style: F.styles.ana, s: 286 } },
      { label: '어른 + 아이', a: { style: F.styles.ana, s: 292 }, b: { style: F.styles.lily, s: 196 } },
      { label: '노인 + 노인', a: { style: F.leoAt(4), s: 300, lean: 0.1, face: { old: true } }, b: { style: F.anaAt(81), s: 284, lean: 0.06, face: { old: true } } },
    ];
    const GROUND = 700;
    const env = (x, d, hold) => {   /* in, hold, out, a rest: k and whether it is on the way out */
      const a = d.in, b = a + hold, c = b + d.out;
      if (x < 0) return [0, false];
      if (x < a) return [(d.curve || T.ease.io)(x / a), false];
      if (x < b) return [1, false];
      if (x < c) return [1 - T.ease.io((x - b) / d.out), true];
      return [0, true];
    };
    const loopLen = (q) => { const d = T.gesture.defs[q.name], kd = T.gesture.defs.kneel; return (q.kneel ? kd.in + 0.4 : 0) + d.in + 2.8 + d.out + (q.kneel ? kd.out : 0) + 0.9; };
    function drawFig(g, o) { F.person(g, o); }
    function drawTwo(g, a, b) {
      const over = a.armOver;
      if (over) a.skip = Object.assign({}, a.skip, { armF: true });
      drawFig(g, a); drawFig(g, b);
      if (over) drawFig(g, Object.assign({}, a, { only: 'armF', skip: null }));
    }
    const base = (p, x, y, flip) => Object.assign({ x, y: y - F.hipHeight(p.style, p.s), flip: !!flip, lean: 0.04, face: { blush: 0.18, mouth: 'smile' } }, p, { face: Object.assign({ blush: 0.18, mouth: 'smile' }, p.face) });
    function cell(g, q, ci, cx, tl, t, bare) {
      const pr = pairs()[ci], d = T.gesture.defs[q.name], kd = T.gesture.defs.kneel;
      const ua = pr.a.s / 100;
      const kneelOn = q.kneel && ci === 1;
      const lead = kneelOn ? kd.in + 0.4 : 0;
      const [k, out] = env(tl - lead, d, 2.8);
      const kk = kneelOn ? env(tl, { in: kd.in, out: kd.out, curve: kd.curve }, d.in + 2.8 + d.out + 0.4)[0] : 0;
      const col = (q.col && q.col[ci]) || {};
      let a, b;
      if (q.how === 'solo') {
        const gap = 64 * ua;
        a = base(pr.a, cx - gap / 2, GROUND); b = base(pr.b, cx + gap / 2, GROUND, true);
        const o2 = Object.assign({ tl: tl, out }, col);
        if (q.at) { o2.at = [cx + gap * 0.9, GROUND - 330]; }
        T.pose[q.name](a, k, t, o2);
        const kb = env(tl - 0.35, d, 2.8);
        const ob = Object.assign({ tl: tl - 0.35, out: kb[1] }, col);
        if (q.at) ob.at = [cx + gap * 1.2, GROUND - 400];
        if (q.at) { b.flip = false; b.x = cx + gap / 2; }
        T.pose[q.name](b, kb[0], t + 0.7, ob);
        drawTwo(g, a, b);
        if (q.at) { P.glow(g, o2.at[0], o2.at[1], 26, '#ffd98a', 0.8); P.glow(g, ob.at[0], ob.at[1], 22, '#ffd98a', 0.6); }
      } else if (q.how === 'face') {
        const gap = (kneelOn && q.kgap ? q.kgap : q.gap) * ua;
        a = base(pr.a, cx - gap / 2, GROUND); b = base(pr.b, cx + gap / 2, GROUND, true);
        if (q.one) {
          T.pose.kneel(a, k, t, { with: b, tl, out });
          drawTwo(g, a, b);
        } else {
          if (kneelOn) T.pose.kneel(a, kk, t, { with: b });
          T.pose.pair(q.name, a, b, k, t, Object.assign({ tl, out, partnerOpts: q.popts }, col));
          drawTwo(g, a, b);
        }
      } else {   /* side by side, both facing the same way */
        const gap = q.gap * ua, sit = q.sitCols && q.sitCols.includes(ci);
        if (q.name === 'lean-on') {   /* the leaner sits in front and leans back against the other */
          b = base(pr.a, cx - gap / 2, GROUND); a = base(pr.b, cx + gap / 2, GROUND);
          if (sit) { T.pose.sitGround(b, 1, t); T.pose.sitGround(a, 1, t); }
          T.pose.pair(q.name, a, b, k, t, { tl, out });
          a.armOver = false;
          drawFig(g, b); drawFig(g, a);
        } else {
          a = base(pr.a, cx - gap / 2, GROUND); b = base(pr.b, cx + gap / 2, GROUND);
          T.pose.pair(q.name, a, b, k, t, Object.assign({ tl, out }, col));
          drawTwo(g, a, b);
        }
      }
      if (bare) return;
      /* k, and the label */
      g.fillStyle = 'rgba(61,58,92,0.18)'; g.fillRect(cx - 90, GROUND + 74, 180, 5);
      g.fillStyle = 'rgba(201,87,63,0.85)'; g.fillRect(cx - 90, GROUND + 74, 180 * k, 5);
      P.text(g, pr.label + (col.hands || col.style || col.depth || col.hand || (col.hug ? 'hug' : '') || (col.shade ? 'shade' : '') ? '  · ' + (col.hands || col.style || col.depth || col.hand || (col.hug ? '무릎 안기' : '') || (col.shade ? '손 차양' : '')) : '') + (kneelOn ? '  · 무릎 꿇고' : ''), cx, GROUND + 120, { font: 'serif', size: 22, color: '#4a4468', alpha: 0.85, nowrap: true });
    }
    function facesPage(g, t) {
      const W = T.view.W, rows = [['어른', F.styles.ana, {}], ['아이', F.styles.lily, {}], ['노인', F.anaAt(81), { old: true }]];
      const cw = Math.min(140, (W - 120) / FACE_COLS.length), x0 = -cw * (FACE_COLS.length - 1) / 2;
      FACE_COLS.forEach((fc, i) => P.text(g, fc[1], x0 + i * cw, 170, { font: 'serif', size: 20, color: '#4a4468', alpha: 0.9, nowrap: true }));
      rows.forEach((row, ri) => {
        const cy = 290 + ri * 205;
        P.text(g, row[0], x0 - cw * 0.75, cy + 8, { font: 'serif', size: 22, color: '#4a4468', alpha: 0.8, nowrap: true });
        FACE_COLS.forEach((fc, i) => {
          const cx = x0 + i * cw, s = row[1].kid ? 470 : 600;
          const o = { x: 0, y: 0, s, style: row[1], face: Object.assign({ blush: 0.2 }, row[2]), headTilt: 0.02 };
          if (fc[0]) T.face.set(o, fc[0], 1, t + i * 0.37, i);
          const j = F.joints(o);
          o.x = cx - j.head[0]; o.y = cy - j.head[1];
          g.save(); g.beginPath(); g.arc(cx, cy, cw * 0.47, 0, Math.PI * 2); g.fillStyle = 'rgba(255,250,240,0.7)'; g.fill(); g.clip();
          F.person(g, o);
          g.restore();
        });
      });
    }
    function sheetPage(g, t) {
      const W = T.view.W, cols = 5, cw = (W - 60) / cols, ch = 192;
      GS.forEach((q, i) => {
        const cx = -W / 2 + 30 + cw * (i % cols + 0.5), gy = 240 + ch * Math.floor(i / cols);
        g.save(); g.translate(cx, gy); g.scale(0.36, 0.36); g.translate(-cx, -GROUND);
        const ci = q.kneel || q.name === 'hand-on-head' || q.name === 'kneel' ? 1 : 0;
        cell(g, q, ci, cx, (q.kneel && ci === 1 ? T.gesture.defs.kneel.in + 0.4 : 0) + T.gesture.defs[q.name].in + 1.4, t, true);
        g.restore();
        P.text(g, q.ko, cx, gy + 34, { font: 'serif', size: 17, color: '#4a4468', alpha: 0.85, nowrap: true });
      });
    }
    V.draw = function (g, t) {
      const W = T.view.W, H = T.view.H;
      g.fillStyle = '#f3ead8'; g.fillRect(-W / 2, 0, W, H);
      const page = demo.page || pages[auto % pages.length];
      if (page !== shown) { shown = page; t0 = T.time; }
      const tl = demo.freeze != null ? demo.freeze : T.time - t0;
      if (page === 'faces') { P.text(g, '표정 · faces', 0, 92, { font: 'serif', size: 32, color: '#3d3a5c', nowrap: true }); facesPage(g, t); return; }
      if (page === 'sheet') { P.text(g, '몸짓 모음 · gestures', 0, 72, { font: 'serif', size: 30, color: '#3d3a5c', nowrap: true }); sheetPage(g, t); return; }
      const q = GS.find((x) => x.name === page);
      if (!q) return;
      g.fillStyle = 'rgba(120,110,96,0.14)'; g.fillRect(-W / 2, GROUND + 4, W, 40);
      P.text(g, q.ko + '  ·  ' + q.name, 0, 96, { font: 'serif', size: 34, color: '#3d3a5c', nowrap: true });
      const L = loopLen(q), x = tl % L;
      [-1, 0, 1].forEach((c, i) => cell(g, q, i, c * W / 3.05, x, t));
      if (!demo.page && demo.freeze == null && T.time - t0 > L * 1.5) auto++;
    };
    V.key = function (key) {
      if (key !== 'ArrowRight' && key !== 'ArrowLeft') return false;
      const i = pages.indexOf(demo.page || pages[auto % pages.length]);
      demo.page = pages[(i + (key === 'ArrowRight' ? 1 : pages.length - 1)) % pages.length];
      return true;
    };
    V.touch = function () { const i = pages.indexOf(demo.page || pages[auto % pages.length]); demo.page = pages[(i + 1) % pages.length]; };
    return V;
  }

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
      if (args.kind === 'gestures') {
        await X.view(gestureShow(args.page), { color: '#f3ead8', out: 0.05, in: 0.4 });
        demo.done = true;
        for (;;) await X.wait(5);
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
