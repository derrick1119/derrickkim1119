/* 데이 & 나이트 — 화면 그리기
 *
 * 밤에는 같은 풍경을 세 번 그린다.
 *   1) 밤의 색으로 전부           — 밤에만 있는 것(그을음, 그림자 다리, 별)이 여기 그려진다
 *   2) 빛의 원보다 조금 큰 원 안에 황혼의 색으로
 *   3) 빛의 원보다 조금 작은 원 안에 낮의 색으로 — 낮에만 있는 것이 여기 그려진다
 * 그래서 등불 둘레에는 동그란 낮이, 그 가장자리에는 얇은 노을이 생긴다.
 * 해가 떠 있는 동안에는 한 번만 그린다.
 */
(function (root) {
  'use strict';
  const DN = (root.DN = root.DN || {});
  const U = DN.U, Art = DN.Art, T = DN.T;
  const TAU = Math.PI * 2;
  const H = 720;

  /* ───────── 시간대별 색 ───────── */
  // 키: skyTop skyBot haze far near deep tint tintAmt ink dark cloud (+ 물: wFar wNear)
  const THEMES = {
    sky: {
      dusk:  { skyTop: '#6a66a4', skyBot: '#f7b47e', haze: '#ffe3ac', far: '#e3aeb4', near: '#fff2e0', deep: '#f1b79c', tint: '#f0b89c', tintAmt: 0.12, ink: '#7a5262', dark: 0, cloud: '#ffd6bc' },
      night: { skyTop: '#17183f', skyBot: '#4a3f72', haze: '#6a5a8c', far: '#5e5688', near: '#8f88b4', deep: '#4e4878', tint: '#5a5488', tintAmt: 0.5, ink: '#1e1a38', dark: 0.3, cloud: '#5a5288' },
    },
    village: {
      day:   { skyTop: '#8fbdd6', skyBot: '#f4ead0', haze: '#fff6dc', far: '#c6d3b2', near: '#7f9c64', deep: '#58764f', tint: '#7f9c64', tintAmt: 0.05, ink: '#3c3428', dark: 0, cloud: '#ffffff' },
      dusk:  { skyTop: '#59578c', skyBot: '#f0a070', haze: '#ffcf96', far: '#b7959a', near: '#6a5568', deep: '#463a52', tint: '#6a5068', tintAmt: 0.36, ink: '#2c2230', dark: 0.1, cloud: '#f7b9a0' },
      night: { skyTop: '#0c1030', skyBot: '#252b55', haze: '#343a68', far: '#39416a', near: '#1d2344', deep: '#11152e', tint: '#1d2344', tintAmt: 0.6, ink: '#070916', dark: 0.36, cloud: '#2e3560' },
      dawn:  { skyTop: '#4c5c90', skyBot: '#eab9a8', haze: '#ffe2cc', far: '#a3a0bc', near: '#5e6286', deep: '#404466', tint: '#5e6286', tintAmt: 0.32, ink: '#24263c', dark: 0.06, cloud: '#f3c6c0' },
    },
    harbor: {
      day:   { skyTop: '#86c0d8', skyBot: '#f2ecd6', haze: '#fff8e2', far: '#d3d2b4', near: '#b89c70', deep: '#8a7352', wFar: '#8fc4c6', wNear: '#4f93a2', tint: '#b89c70', tintAmt: 0.04, ink: '#3a3228', dark: 0, cloud: '#ffffff' },
      dusk:  { skyTop: '#54588e', skyBot: '#f2a878', haze: '#ffd6a0', far: '#b99a94', near: '#75596a', deep: '#4c3c54', wFar: '#b48a98', wNear: '#5a4a78', tint: '#70566a', tintAmt: 0.36, ink: '#2a2230', dark: 0.1, cloud: '#f6bca4' },
      night: { skyTop: '#0a0e2c', skyBot: '#222a54', haze: '#303a68', far: '#363e66', near: '#1c2242', deep: '#10142c', wFar: '#2a3668', wNear: '#141c46', tint: '#1c2242', tintAmt: 0.6, ink: '#060814', dark: 0.36, cloud: '#2c3460' },
      dawn:  { skyTop: '#4a5e92', skyBot: '#ecbcaa', haze: '#ffe4ce', far: '#a7a4bc', near: '#666584', deep: '#444664', wFar: '#b9a8c4', wNear: '#56628e', tint: '#62648a', tintAmt: 0.32, ink: '#24263c', dark: 0.06, cloud: '#f4c8c2' },
    },
    city: {
      day:   { skyTop: '#8db3d2', skyBot: '#f6e6c8', haze: '#fff3da', far: '#e2ceb6', near: '#b08f84', deep: '#77606a', tint: '#b08f84', tintAmt: 0.05, ink: '#3a3038', dark: 0, cloud: '#ffffff' },
      dusk:  { skyTop: '#55548a', skyBot: '#ee9c72', haze: '#ffc994', far: '#a98e9c', near: '#5c4f68', deep: '#3e3550', tint: '#5c4f68', tintAmt: 0.36, ink: '#261f2e', dark: 0.1, cloud: '#f2b29c' },
      night: { skyTop: '#090c26', skyBot: '#1f2448', haze: '#2c3158', far: '#30365a', near: '#161a36', deep: '#0c0e22', tint: '#161a36', tintAmt: 0.62, ink: '#050610', dark: 0.38, cloud: '#262b52' },
      dawn:  { skyTop: '#48588c', skyBot: '#e6b2a4', haze: '#fbdcc8', far: '#9c9ab4', near: '#565a7c', deep: '#3a3d5c', tint: '#565a7c', tintAmt: 0.34, ink: '#202236', dark: 0.06, cloud: '#eec0bc' },
    },
    cave: {
      day:   { skyTop: '#5a4238', skyBot: '#9a7458', haze: '#c89a6c', far: '#b08a70', near: '#7a5a4c', deep: '#4a3630', tint: '#8a6650', tintAmt: 0.16, ink: '#2a1c18', dark: 0, cloud: '#9a7458' },
      dusk:  { skyTop: '#3a2a3c', skyBot: '#6a4650', haze: '#8a5c5c', far: '#84606c', near: '#54394a', deep: '#2c1e2c', tint: '#54394a', tintAmt: 0.3, ink: '#160e16', dark: 0.06, cloud: '#6a4650' },
      night: { skyTop: '#120e18', skyBot: '#241a26', haze: '#2c2030', far: '#54434e', near: '#30262f', deep: '#16111a', tint: '#30262f', tintAmt: 0.5, ink: '#08060a', dark: 0.42, cloud: '#241a26' },
    },
    snow: {
      day:   { skyTop: '#9cc0dc', skyBot: '#f4eee4', haze: '#ffffff', far: '#d4dcea', near: '#f6f8fc', deep: '#b8c4da', tint: '#c8d2e4', tintAmt: 0.08, ink: '#4a5068', dark: 0, cloud: '#ffffff' },
      dusk:  { skyTop: '#5a5a92', skyBot: '#e8a890', haze: '#ffd0b0', far: '#b4a4c0', near: '#d8c8dc', deep: '#8c7ea4', tint: '#a090b4', tintAmt: 0.3, ink: '#2e2840', dark: 0.06, cloud: '#f0c0b0' },
      night: { skyTop: '#0b0f2c', skyBot: '#262c54', haze: '#3a4070', far: '#5a6288', near: '#8f98b8', deep: '#4a5278', tint: '#4a5278', tintAmt: 0.5, ink: '#0c0e20', dark: 0.34, cloud: '#30365e' },
    },
    realm: {
      day:   { skyTop: '#8a86c4', skyBot: '#f0d8dc', haze: '#fff0e4', far: '#c8bedc', near: '#e8e0f0', deep: '#a8a0c8', tint: '#b8b0d4', tintAmt: 0.2, ink: '#3a3458', dark: 0, cloud: '#f4e8f0' },
      dusk:  { skyTop: '#3c3878', skyBot: '#a878a4', haze: '#d498b0', far: '#7c6ca4', near: '#4a4278', deep: '#2a2650', tint: '#4a4278', tintAmt: 0.4, ink: '#141230', dark: 0.08, cloud: '#7c6ca4' },
      night: { skyTop: '#04051a', skyBot: '#181a42', haze: '#262866', far: '#34366e', near: '#15173c', deep: '#080920', tint: '#14163a', tintAmt: 0.5, ink: '#02030c', dark: 0.26, cloud: '#1c1e4a' },
    },
    hill: {
      day:   { skyTop: '#8cc0dc', skyBot: '#f6eed4', haze: '#fff8e0', far: '#cad6b4', near: '#88a468', deep: '#5e7c54', tint: '#88a468', tintAmt: 0.05, ink: '#3c3428', dark: 0, cloud: '#ffffff' },
      dusk:  { skyTop: '#5a5494', skyBot: '#f4a678', haze: '#ffd49c', far: '#c59aa6', near: '#7a5a78', deep: '#4c3c5c', tint: '#74587a', tintAmt: 0.3, ink: '#2c2234', dark: 0.06, cloud: '#f8bca6' },
      night: { skyTop: '#0a0e2e', skyBot: '#262c5a', haze: '#363c6e', far: '#3c4470', near: '#20264a', deep: '#121632', tint: '#20264a', tintAmt: 0.6, ink: '#070916', dark: 0.34, cloud: '#2e3562' },
      dawn:  { skyTop: '#566a9c', skyBot: '#f4c4ae', haze: '#fff0d6', far: '#b4b0c8', near: '#6c7092', deep: '#4a4e70', tint: '#6c7092', tintAmt: 0.26, ink: '#26283e', dark: 0.04, cloud: '#f8d0c6' },
    },
  };
  const TOD_KEYS = ['day', 'dusk', 'night', 'dawn'];
  const COLOR_KEYS = ['skyTop', 'skyBot', 'haze', 'far', 'near', 'deep', 'tint', 'ink', 'cloud', 'wFar', 'wNear'];

  function themeKey(theme, i) {
    const order = [i, (i + 1) % 4, (i + 3) % 4, (i + 2) % 4];   // 그 시간대의 색이 없으면 가까운 것으로
    for (const k of order) if (theme[TOD_KEYS[k]]) return theme[TOD_KEYS[k]];
    return theme.night;
  }
  function palette(themeName, tod) {
    const theme = THEMES[themeName] || THEMES.village;
    tod = ((tod % 4) + 4) % 4;
    const i = Math.floor(tod), f = U.smooth(tod - i);
    const a = themeKey(theme, i), b = themeKey(theme, (i + 1) % 4);
    const out = {};
    for (const k of COLOR_KEYS) out[k] = U.mix(a[k] || a.near, b[k] || b.near, f);
    out.tintAmt = U.lerp(a.tintAmt, b.tintAmt, f);
    out.dark = U.lerp(a.dark, b.dark, f);
    return out;
  }

  /* ───────── 뷰 ───────── */
  const R = (DN.Render = { H, W: 1280, scale: 1, canvas: null, ctx: null, glows: [], THEMES, palette, pass: 'day' });

  R.init = function (canvas) {
    R.canvas = canvas;
    R.ctx = canvas.getContext('2d');
    R.resize();
  };

  R.resize = function () {
    const c = R.canvas;
    const box = c.parentElement.getBoundingClientRect();
    const cw = box.width, ch = box.height;
    const minA = 4 / 3, maxA = R.wideOverride || 2.2;
    let a = cw / Math.max(1, ch);
    let vw = cw, vh = ch;
    if (a < minA) { vh = cw / minA; a = minA; } else if (a > maxA) { vw = ch * maxA; a = maxA; }
    const dpr = Math.min(root.devicePixelRatio || 1, 2);
    c.style.width = vw + 'px'; c.style.height = vh + 'px';
    c.width = Math.round(vw * dpr); c.height = Math.round(vh * dpr);
    R.W = H * a; R.scale = c.height / H;
    R.cssScale = vh / H;
    if (root.document) {
      document.documentElement.style.setProperty('--stage-w', vw + 'px');
      document.documentElement.style.setProperty('--stage-h', vh + 'px');
      document.documentElement.style.setProperty('--u', (vh / 720) + 'px');
    }
  };

  /* ───────── 겹 꾸밈 미리 만들기 ───────── */
  R.prepare = function (level, terrain) {
    for (const L of terrain.layers) {
      const rnd = U.rng(U.hash(level.id + ':' + L.id));
      const deco = [];
      const style = L.style;
      if (L.dynamic) { L.deco = []; L.dash = []; L.props = []; continue; }
      if (style === 'hill' || style === 'snow') {
        for (let x = L.x0 + 10; x < L.x1 - 10; x += 14 + rnd() * 38) {
          const k = rnd();
          deco.push({ x, kind: k < 0.62 ? 'tuft' : k < 0.8 ? 'flower' : 'stone', s: 0.7 + rnd() * 0.7, d: k < 0.8 ? 0 : 8 + rnd() * 30, c: Math.floor(rnd() * 3) });
        }
      } else if (style === 'cloud') {
        for (let x = L.x0; x < L.x1; x += 22 + rnd() * 30) deco.push({ x, kind: 'puff', s: 15 + rnd() * 20, d: 6 + rnd() * 9 });
        if (L.thick) for (const [x, k] of [[L.x0 + 12, 0.2], [L.x0 + 44, 0.3], [L.x1 - 12, 0.2], [L.x1 - 44, 0.3]]) deco.push({ x, kind: 'puff', s: L.thick * k, d: L.thick * k * 0.7 });
      } else if (style === 'rock' || style === 'glass') {
        for (let x = L.x0 + 10; x < L.x1 - 10; x += 30 + rnd() * 70) deco.push({ x, kind: style === 'glass' ? 'dust' : 'crack', s: 0.6 + rnd() * 0.9, d: 6 + rnd() * 90, c: rnd() });
      }
      L.deco = deco;
      L.dash = [];
      for (let d = 0; d < 4; d++) {
        const row = [];
        for (let x = L.x0; x < L.x1; ) { const on = 30 + rnd() * 90, off = 26 + rnd() * 80; row.push([x, x + on]); x += on + off; }
        L.dash.push(row);
      }
      L.seed = rnd() * 1000;
      L.props = (level.props || []).filter((p) => p.layer === L.id);
      for (const b of level.blocks || []) {
        if (b.layer === L.id && b.prop) L.props.push({ type: b.prop, x: (b.x0 + b.x1) / 2, w: b.x1 - b.x0, unless: b.unless, seed: b.x0 });
      }
      if (style === 'roof') {
        // 평평한 구간 = 건물, 기운 구간 = 계단
        L.bld = []; L.ramps = [];
        for (let i = 0; i < L.pts.length - 1; i++) {
          const a = L.pts[i], b = L.pts[i + 1];
          if (a[1] > 700 || b[1] > 700 || b[0] - a[0] < 12) continue;
          if (a[1] === b[1]) L.bld.push({ x0: a[0], x1: b[0], hue: rnd(), win: 0.2 + rnd() * 0.6, seed: Math.floor(rnd() * 1e6) });
          else L.ramps.push({ x0: a[0], x1: b[0] });
        }
      }
    }
    R.backdrop = (level.backdrop || []).map((b, i) => Object.assign({ seed: 11 + i * 37 }, b));
    const rnd = U.rng(U.hash(level.id + ':sky'));
    R.skyClouds = [];
    for (let i = 0; i < 9; i++) R.skyClouds.push({ x: rnd() * 2400, y: 60 + rnd() * 240, w: 90 + rnd() * 190, sp: 2 + rnd() * 6 });
    R.stars = [];
    for (let i = 0; i < 170; i++) R.stars.push({ x: rnd(), y: rnd() * 0.74, r: 0.6 + rnd() * 1.3, ph: rnd() * 10, rank: rnd() });
  };

  /* 매끄러운 잡음 */
  function noise1(x, seed) {
    const i = Math.floor(x), f = x - i;
    const h = (n) => { let t = Math.imul(n ^ seed, 0x45d9f3b); t ^= t >>> 15; t = Math.imul(t, 0x2c1b3c6d); t ^= t >>> 12; return ((t >>> 0) % 10000) / 10000; };
    return U.lerp(h(i), h(i + 1), U.smooth(f));
  }
  function fbm(x, seed) { return noise1(x, seed) * 0.6 + noise1(x * 2.3 + 9, seed + 7) * 0.28 + noise1(x * 5.1 + 3, seed + 19) * 0.12; }

  /* ───────── 한 프레임 ───────── */
  R.frame = function (g) {
    const ctx = R.ctx, W = R.W, camX = g.cam.x, t = g.time, theme = g.level.theme;
    R.glows.length = 0;
    ctx.setTransform(R.scale, 0, 0, R.scale, 0, 0);
    ctx.imageSmoothingQuality = 'high';
    ctx.lineJoin = 'round';

    if (!g.isNight) {
      world(ctx, g, 'day', palette(theme, g.tod), true);
    } else {
      const palN = palette(theme, 2);
      world(ctx, g, 'night', palN, true);
      // 밤의 어둠 (등불을 끄면 눈이 익어 조금 밝아진다)
      ctx.fillStyle = `rgba(8,9,30,${palN.dark * (g.eyes === undefined ? 1 : g.eyes)})`;
      ctx.fillRect(0, 0, W, H);
      const bs = g.screenBubbles();
      if (bs.length) {
        ctx.save();
        ctx.beginPath();
        for (const b of bs) { ctx.moveTo(b.x + b.r + T.RIM, b.y); ctx.arc(b.x, b.y, b.r + T.RIM, 0, TAU); }
        ctx.clip();
        world(ctx, g, 'dusk', palette(theme, 1), false);
        ctx.restore();
        const inner = bs.filter((b) => b.r > T.RIM + 2);
        if (inner.length) {
          ctx.save();
          ctx.beginPath();
          for (const b of inner) { ctx.moveTo(b.x + b.r - T.RIM, b.y); ctx.arc(b.x, b.y, b.r - T.RIM, 0, TAU); }
          ctx.clip();
          world(ctx, g, 'day', palette(theme, g.dayTod === undefined ? 0.12 : g.dayTod), false);
          ctx.restore();
        }
        rims(ctx, g, bs, t);
      }
    }

    drawGlows(ctx);
    g.drawTop(ctx, R.env, camX);

    // 종이결과 가장자리 음영
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.5;
    const ps = Math.max(1, Math.round(R.scale * 1.2));
    ctx.save(); ctx.scale(ps, ps);
    ctx.fillStyle = ctx.createPattern(Art.paper(), 'repeat');
    ctx.fillRect(0, 0, R.canvas.width / ps + 1, R.canvas.height / ps + 1);
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    const vg = ctx.createRadialGradient(R.canvas.width / 2, R.canvas.height / 2, R.canvas.height * 0.45, R.canvas.width / 2, R.canvas.height / 2, R.canvas.width * 0.75);
    vg.addColorStop(0, 'rgba(30,20,30,0)'); vg.addColorStop(1, 'rgba(30,20,30,0.3)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, R.canvas.width, R.canvas.height);
  };

  /** 한 구역의 색으로 풍경 전체를 그린다 */
  function world(ctx, g, pass, pal, collect) {
    const W = R.W, camX = g.cam.x, t = g.time, terrain = g.terrain, level = g.level;
    R.pal = pal; R.pass = pass;
    const env = (R.env = {
      t, pal, pass, layer: null, ax: 0, flags: g.flags,
      shade: (hex, alpha) => U.css(U.mix(hex, pal.tint, pal.tintAmt), alpha),
      ink: (a) => U.css(pal.ink, a),
      lit: (p) => (p.lit === true) || (typeof p.lit === 'string' && !!g.flags[p.lit]),
      glow: (c, x, y, r, rgb, a) => {
        if (!collect) return;                       // 빛무리는 한 번만 모은다
        const m = c.getTransform(), sc = Math.hypot(m.a, m.b);
        R.glows.push({ x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f, r: r * sc, rgb, a });
      },
      gy: (dx) => (env.layer ? terrain.yAt(env.layer, env.ax + dx) - terrain.yAt(env.layer, env.ax) : 0),
    });
    R.collect = collect;

    drawSky(ctx, g, pal, camX, W, t, pass);
    drawBackdrop(ctx, g, pal, camX, W, t, pass);

    for (const L of terrain.layers) {
      if (L.dynamic) { g.drawLayerThings(ctx, L, env, camX); continue; }
      if (L.def.hidden && !g.flags[L.def.hidden]) continue;
      drawLayer(ctx, g, L, pal, camX, W, t, pass);
      for (const p of L.props) {
        if (p.flag && !g.flags[p.flag]) continue;
        if (p.unless && g.flags[p.unless]) continue;
        if (p.when && p.when !== pass) continue;
        const sx = p.x - camX;
        if (sx < -300 || sx > W + 300) continue;
        const y = terrain.yAt(L, p.x);
        if (y >= T.ABSENT) continue;
        env.layer = L; env.ax = p.x;
        ctx.save(); ctx.translate(sx, y + (p.dy || 0));
        if (p.alpha !== undefined) ctx.globalAlpha = p.alpha;
        Art.prop(ctx, p.type, env, p);
        ctx.restore();
      }
      env.layer = null;
      g.drawLayerThings(ctx, L, env, camX);
    }
    if (level.fore) drawFore(ctx, g, pal, camX, W);
    g.drawOver(ctx, env, camX);
  }

  /* ───────── 하늘 ───────── */
  function drawSky(ctx, g, pal, camX, W, t, pass) {
    const gr = ctx.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, U.css(pal.skyTop));
    gr.addColorStop(0.62, U.css(pal.skyBot));
    gr.addColorStop(1, U.css(pal.haze));
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    const sky = g.level.sky || {};
    if (sky.none) return;

    // 별은 어둠 속에서만 빛난다
    const night = pass === 'night' || (!g.isNight && pal.dark > 0.2);
    const sa = g.starAmount || 0;
    if (night && sa > 0.001) {
      ctx.fillStyle = '#fff';
      for (const s of R.stars) {
        if (s.rank > sa) continue;
        const fade = U.clamp((sa - s.rank) * 12, 0, 1);
        const tw = 0.6 + 0.4 * Math.sin(t * 1.4 + s.ph);
        ctx.globalAlpha = fade * tw * 0.9;
        ctx.beginPath(); ctx.arc(((s.x * 2600 - camX * 0.03) % (W + 40) + W + 40) % (W + 40) - 20, s.y * H, s.r, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    if (night && g.lastStar && g.lastStar.a > 0.01) {
      const sx = g.lastStar.x - camX * (g.lastStar.par === undefined ? 0.05 : g.lastStar.par);
      Art.star(ctx, sx, g.lastStar.y, g.lastStar.r || 3.2, g.lastStar.a, t);
    }
    // 해
    if (pass === 'day' && g.sun && g.sun.a > 0.01) {
      const sx = g.sun.x - camX * (g.sun.par === undefined ? 0.08 : g.sun.par), sy = g.sun.y, r = g.sun.r || 46;
      ctx.save();
      ctx.globalAlpha = g.sun.a;
      let sg = ctx.createRadialGradient(sx, sy, r * 0.4, sx, sy, r * 5);
      sg.addColorStop(0, 'rgba(255,236,190,0.7)'); sg.addColorStop(0.3, 'rgba(255,200,150,0.22)'); sg.addColorStop(1, 'rgba(255,200,150,0)');
      ctx.fillStyle = sg; ctx.fillRect(sx - r * 5, sy - r * 5, r * 10, r * 10);
      sg = ctx.createRadialGradient(sx, sy - r * 0.2, 0, sx, sy, r);
      sg.addColorStop(0, '#fffbe8'); sg.addColorStop(1, g.sun.col || '#ffd9a0');
      ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU); ctx.fill();
      ctx.restore();
      R.sunScreen = { x: sx, y: sy, r };
    }
    if (sky.clouds !== false) {
      const ca = sky.cloudAlpha === undefined ? 0.5 : sky.cloudAlpha;
      for (const c of R.skyClouds) {
        const span = W + 500;
        const x = (((c.x - camX * 0.06 + t * c.sp) % span) + span) % span - 250;
        ctx.fillStyle = U.css(pal.cloud, ca * 0.55);
        for (let i = 0; i < 4; i++) {
          ctx.beginPath(); ctx.ellipse(x + (i - 1.5) * c.w * 0.26, c.y + Math.sin(i * 2.1 + c.w) * 7, c.w * 0.34, c.w * 0.1 + i % 2 * 5, 0, 0, TAU); ctx.fill();
        }
      }
    }
  }

  /* ───────── 먼 배경 ───────── */
  function drawBackdrop(ctx, g, pal, camX, W, t, pass) {
    for (const b of R.backdrop) {
      const par = b.par === undefined ? 0.2 : b.par;
      const ox = camX * par;
      const col = b.color ? U.mix(b.color, pal.skyBot, b.fade || 0) : U.mix(U.mix(pal.far, pal.skyBot, b.fade === undefined ? 0.5 : b.fade), pal.deep, b.deep || 0);
      if (b.kind === 'mountains') {
        ctx.fillStyle = U.css(col);
        ctx.beginPath(); ctx.moveTo(0, H);
        for (let x = 0; x <= W + 12; x += 12) ctx.lineTo(x, b.base - b.amp * fbm((x + ox) * (b.freq || 0.004), b.seed));
        ctx.lineTo(W + 12, H); ctx.closePath(); ctx.fill();
      } else if (b.kind === 'skyline') {
        ctx.fillStyle = U.css(col);
        const span = 2600, off = ((ox % span) + span) % span;
        const blds = R['_sky' + b.seed] || (R['_sky' + b.seed] = (() => {
          const rnd = U.rng(b.seed), out = []; let x = 0;
          while (x < span) { const w = 26 + rnd() * 60; out.push([x, w, b.amp * (0.25 + rnd() * 0.75), rnd()]); x += w + rnd() * 8; }
          return out;
        })());
        for (const [bx, bw, bh, q] of blds) for (let rep = -1; rep <= 1; rep++) {
          const x = bx - off + rep * span;
          if (x > W || x + bw < 0) continue;
          ctx.fillRect(x, b.base - bh, bw, H);
          if (q > 0.7) ctx.fillRect(x + bw * 0.4, b.base - bh - 16, 2, 16);
        }
      } else if (b.kind === 'cavewall') {
        ctx.strokeStyle = U.css(pal.far, 0.16); ctx.lineWidth = 2;
        for (let i = 0; i < 9; i++) {
          ctx.beginPath();
          for (let x = 0; x <= W + 20; x += 20) {
            const y = 60 + i * 62 + 30 * fbm((x + ox) * 0.004 + i * 3, b.seed + i);
            if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      } else if (b.kind === 'lights') {
        // 멀리 내려다보이는 인간 세계의 불빛
        const rnd = U.rng(b.seed);
        const amt = g.farLights === undefined ? 1 : g.farLights;
        for (let i = 0; i < (b.n || 90); i++) {
          const x = rnd() * (W + 300) - 150 - (ox % 300), y = b.base + rnd() * b.amp, r = 0.8 + rnd() * 1.6, order = rnd(), warm = rnd();
          const sp = 1 + rnd() * 3;
          if (order > amt) continue;
          const tw = 0.7 + 0.3 * Math.sin(t * sp + i);
          ctx.fillStyle = warm > 0.3 ? `rgba(255,214,140,${0.85 * tw})` : `rgba(210,230,255,${0.8 * tw})`;
          ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
          if (r > 1.9 && R.collect) R.glows.push({ x: x * R.scale, y: y * R.scale, r: 9 * R.scale, rgb: [255, 200, 120], a: 0.3 * tw });
        }
      } else if (b.kind === 'mural' && g.level.drawMural) {
        g.level.drawMural(ctx, g, b, camX * (b.par === undefined ? 1 : b.par), pal, t, pass);
      }
    }
  }

  /* ───────── 언덕 겹 ───────── */
  function ridgePath(ctx, L, camX, W, close, dy) {
    const S = T.STEP;
    const i0 = Math.max(0, Math.floor((camX - 60) / S)), i1 = Math.min(L.ys.length - 1, Math.ceil((camX + W + 60) / S));
    let started = false, lastX = 0, minY = 9999, firstX = 0;
    dy = dy || 0;
    for (let i = i0; i <= i1; i++) {
      const y = L.ys[i];
      if (y >= T.ABSENT) { if (started) break; continue; }
      const x = i * S - camX;
      if (!started) {
        started = true; firstX = x;
        if (close && !L.thick) { ctx.moveTo(x, H + 80); ctx.lineTo(x, y + dy); } else ctx.moveTo(x, y + dy);
      } else ctx.lineTo(x, y + dy);
      lastX = x;
      if (y < minY) minY = y;
    }
    if (started && close) {
      if (L.thick) {
        // 떠 있는 섬: 아랫면을 따라 되돌아온다
        const iA = Math.round((firstX + camX) / S), iB = Math.round((lastX + camX) / S);
        for (let i = iB; i >= iA; i--) {
          const x = i * S;
          ctx.lineTo(x - camX, L.ys[i] + L.thickAt(x) + Math.sin(x * 0.045 + L.index) * 5 * Math.min(1, L.thickAt(x) / L.thick));
        }
      } else ctx.lineTo(lastX, H + 80);
      ctx.closePath();
    }
    return started ? { minY, firstX, lastX } : null;
  }

  function layerColors(L, pal, n) {
    const tone = L.tone !== undefined ? L.tone : (n > 1 ? L.index / (n - 1) : 1);
    if (L.style === 'water') return { top: U.mix(pal.wFar, pal.wNear, tone), bot: U.mix(pal.wNear, pal.deep, 0.35) };
    const base = U.mix(pal.far, pal.near, tone);
    return { top: base, bot: U.mix(base, pal.deep, 0.6) };
  }

  /** 구역을 타는 겹이 이번 패스에서 얼마나 실재하는가 */
  function presence(L, pass) {
    if (!L.zone) return 1;
    if (pass === 'dusk') return 0.62;
    if (L.zone === pass) return 1;
    return L.thick ? 0.1 : 0;           // 반대 구역에서는 자취만
  }

  function drawLayer(ctx, g, L, pal, camX, W, t, pass) {
    const terrain = g.terrain;
    if (L.thin) { drawBridge(ctx, g, L, pal, camX, W, t, pass); return; }
    const pres = presence(L, pass);
    if (pres <= 0) return;
    const col = layerColors(L, pal, terrain.layers.length - 2);
    ctx.save();
    ctx.globalAlpha = pres;
    ctx.beginPath();
    const info = ridgePath(ctx, L, camX, W, true, 0);
    if (!info) { ctx.restore(); return; }
    const style = L.style;

    if (style === 'cloud') {
      for (const d of L.deco) {            // 뭉게구름: 능선 위로 봉긋한 덩어리
        const sx = d.x - camX;
        if (sx < -60 || sx > W + 60) continue;
        const y = terrain.yAt(L, d.x);
        if (y >= T.ABSENT) continue;
        ctx.moveTo(sx + d.s, y + d.d); ctx.arc(sx, y + d.d, d.s, 0, TAU);
      }
    }
    const gr = ctx.createLinearGradient(0, info.minY - 10, 0, L.thick ? info.minY + L.thick * 1.5 : Math.min(H, info.minY + 420));
    gr.addColorStop(0, U.css(col.top));
    gr.addColorStop(1, U.css(col.bot));
    ctx.fillStyle = gr;
    ctx.fill();

    if (pres > 0.3) {
      ctx.save();
      ctx.clip();
      if (style === 'roof') {
        drawBuildings(ctx, g, L, pal, camX, W, col);
      } else {
        // 능선 바로 아래 밝은 띠 (물감이 고인 가장자리)
        ctx.beginPath(); ridgePath(ctx, L, camX, W, false, 7);
        ctx.strokeStyle = U.css(U.mix(col.top, pal.haze, style === 'water' ? 0.5 : 0.3), 0.5); ctx.lineWidth = 12; ctx.stroke();
        // 능선을 따라 흐르는 붓 자국
        const offs = style === 'water' ? [16, 34, 58, 90] : [30, 66, 112, 170];
        ctx.lineWidth = style === 'water' ? 1.6 : 1.3; ctx.lineCap = 'round';
        for (let d = 0; d < 4; d++) {
          ctx.strokeStyle = style === 'water' ? U.css(pal.haze, 0.2 - d * 0.03) : U.css(pal.ink, 0.085 - d * 0.012);
          ctx.beginPath();
          const drift = style === 'water' ? (t * (10 + d * 4)) % 400 : 0;
          for (const [a, b] of L.dash[d]) {
            const xa = a + drift, xb = b + drift;
            if (xb - camX < -20 || xa - camX > W + 20) continue;
            for (let x = xa; x <= xb; x += 10) {
              const y = terrain.yAt(L, U.clamp(x, L.x0, L.x1));
              if (y >= T.ABSENT) continue;
              const yy = y + offs[d] + Math.sin(x * 0.02 + d) * 3 + (style === 'water' ? Math.sin(x * 0.05 + t * 2 + d) * 2 : 0);
              if (x === xa) ctx.moveTo(x - camX, yy); else ctx.lineTo(x - camX, yy);
            }
          }
          ctx.stroke();
        }
        // 풀, 꽃, 돌 — 꽃은 빛 속에서만 핀다
        for (const d of L.deco) {
          const sx = d.x - camX;
          if (sx < -30 || sx > W + 30 || d.kind === 'puff') continue;
          const y = terrain.yAt(L, d.x) + d.d;
          if (d.kind === 'tuft') {
            ctx.strokeStyle = U.css(U.mix(col.top, pal.ink, 0.42), 0.6); ctx.lineWidth = 1.1;
            ctx.beginPath();
            for (let k = -1; k <= 1; k++) { ctx.moveTo(sx + k * 2.4, y + 5); ctx.lineTo(sx + k * 4.6 * d.s + Math.sin(t * 1.5 + d.x) * 0.8, y - 3 * d.s + Math.abs(k) * 2 + 5); }
            ctx.stroke();
          } else if (d.kind === 'flower') {
            if (pass === 'night') {
              ctx.fillStyle = U.css(U.mix(col.top, pal.ink, 0.3), 0.5);
              ctx.beginPath(); ctx.arc(sx, y + 6, 1.1, 0, TAU); ctx.fill();
            } else {
              const fc = ['#fff6e0', '#f5d08a', '#f2b0b8'][d.c];
              ctx.strokeStyle = U.css(U.mix(col.top, pal.ink, 0.35), 0.6); ctx.lineWidth = 1;
              ctx.beginPath(); ctx.moveTo(sx, y + 6); ctx.lineTo(sx, y - 2 * d.s); ctx.stroke();
              ctx.fillStyle = U.css(U.mix(fc, pal.tint, pal.tintAmt * 0.6), 0.95);
              ctx.beginPath(); ctx.arc(sx, y - 3 * d.s, 2.3 * d.s, 0, TAU); ctx.arc(sx + 5, y + 6, 1.4 * d.s, 0, TAU); ctx.fill();
            }
          } else if (d.kind === 'stone') {
            ctx.fillStyle = U.css(U.mix(col.bot, pal.ink, 0.15), 0.4);
            ctx.beginPath(); ctx.ellipse(sx, y, 5 * d.s, 2.4 * d.s, 0, 0, TAU); ctx.fill();
          } else if (d.kind === 'crack') {
            ctx.strokeStyle = U.css(pal.ink, 0.22); ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(sx, y); ctx.lineTo(sx + 9 * d.s, y + 12 * d.s); ctx.lineTo(sx + 5 * d.s, y + 24 * d.s); ctx.stroke();
          } else if (d.kind === 'dust') {
            const tw = 0.4 + 0.6 * Math.sin(t * 1.2 + d.c * 30);
            ctx.fillStyle = `rgba(200,210,255,${0.3 * tw})`;
            ctx.beginPath(); ctx.arc(sx, y, 1.1 * d.s, 0, TAU); ctx.fill();
          }
        }
      }
      ctx.restore();
    }

    // 연필 선
    ctx.beginPath(); ridgePath(ctx, L, camX, W, false, 0);
    ctx.strokeStyle = U.css(pal.ink, style === 'cloud' ? 0.1 : style === 'water' ? 0.16 : 0.3);
    ctx.lineWidth = 1.2; ctx.stroke();
    if (pass === 'night' && style !== 'cloud') {
      // 밤에는 능선에 희미한 빛 테두리를 둘러 길이 읽히게 한다
      ctx.beginPath(); ridgePath(ctx, L, camX, W, false, -0.8);
      ctx.strokeStyle = U.css(U.mix(pal.haze, '#c8d0ff', 0.5), 0.34); ctx.lineWidth = 1.1; ctx.stroke();
    }
    if (style === 'water') {
      ctx.beginPath(); ridgePath(ctx, L, camX, W, false, 1.5);
      ctx.strokeStyle = U.css(pal.haze, 0.55); ctx.lineWidth = 1.6; ctx.setLineDash([14, 9]); ctx.lineDashOffset = -t * 12; ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.restore();
  }

  /* 건물: 불 꺼진 창문들 */
  function drawBuildings(ctx, g, L, pal, camX, W, col) {
    const terrain = g.terrain;
    ctx.strokeStyle = U.css(pal.ink, 0.3); ctx.lineWidth = 1;
    for (const r of L.ramps) {            // 계단
      if (r.x1 - camX < -10 || r.x0 - camX > W + 10) continue;
      ctx.beginPath();
      for (let x = r.x0; x <= r.x1; x += 12) {
        const y = terrain.yAt(L, x);
        ctx.moveTo(x - camX, y); ctx.lineTo(x - camX, y + 14);
        ctx.moveTo(x - camX, y + 14); ctx.lineTo(x - camX + 12, y + 14);
      }
      ctx.stroke();
    }
    for (const b of L.bld) {
      const x0 = b.x0 - camX, x1 = b.x1 - camX;
      if (x1 < -10 || x0 > W + 10) continue;
      const y = terrain.yAt(L, (b.x0 + b.x1) / 2);
      ctx.fillStyle = U.css(U.mix(col.top, b.hue > 0.5 ? pal.deep : pal.far, 0.16 * Math.abs(b.hue - 0.5) * 2), 0.9);
      ctx.fillRect(x0, y, x1 - x0, H - y + 80);
      ctx.fillStyle = U.css(pal.ink, 0.22); ctx.fillRect(x0, y, x1 - x0, 5);
      ctx.fillStyle = U.css(pal.ink, 0.12); ctx.fillRect(x1 - 3, y, 3, H);
      const rnd = U.rng(b.seed);
      for (let wy = y + 18; wy < H; wy += 24) {
        for (let wx = x0 + 9; wx < x1 - 13; wx += 17) {
          const q = rnd();
          if (q > b.win + 0.35) continue;
          ctx.fillStyle = (g.flags.cityLit && q < 0.3) ? 'rgba(255,214,140,0.85)' : U.css(U.mix(pal.skyTop, pal.ink, 0.5), 0.5);
          ctx.fillRect(wx, wy, 9, 12);
        }
      }
    }
  }

  /* 다리들: 밤에만 단단한 그림자 다리, 누군가 내려 주어야 하는 널다리 */
  function drawBridge(ctx, g, L, pal, camX, W, t, pass) {
    ctx.save();
    ctx.lineCap = 'round';
    if (L.needs) {
      // 널다리: 내려 주기 전에는 건너편에 세워져 있다
      const k = g.flags[L.needs] ? (g.flags[L.needs + 'K'] === undefined ? 1 : g.flags[L.needs + 'K']) : 0;
      const xa = L.x0 - camX, xb = L.x1 - camX, yb = L.ys[Math.round(L.x1 / T.STEP)];
      ctx.translate(xb, yb); ctx.rotate((1 - k) * 1.2);
      const len = xb - xa;
      ctx.fillStyle = U.css(U.mix('#8a6e56', pal.tint, pal.tintAmt)); ctx.fillRect(-len, -4, len, 6);
      ctx.strokeStyle = U.css(pal.ink, 0.4); ctx.lineWidth = 1; ctx.strokeRect(-len, -4, len, 6);
      for (let x = -len + 10; x < 0; x += 18) { ctx.beginPath(); ctx.moveTo(x, -4); ctx.lineTo(x, 2); ctx.stroke(); }
      ctx.restore();
      return;
    }
    if (L.zone !== 'night') { ctx.restore(); return; }
    const solid = pass === 'night' ? 1 : pass === 'dusk' ? 0.55 : 0;
    ctx.beginPath(); const info = ridgePath(ctx, L, camX, W, false, 5);
    if (!info) { ctx.restore(); return; }
    if (solid > 0) {
      ctx.strokeStyle = `rgba(26,20,58,${0.94 * solid})`; ctx.lineWidth = 13; ctx.stroke();
      ctx.beginPath(); ridgePath(ctx, L, camX, W, false, 0);
      ctx.strokeStyle = `rgba(160,150,236,${0.6 * solid})`; ctx.lineWidth = 1.4; ctx.stroke();
      const rnd = U.rng(Math.floor(L.seed));
      for (let x = L.x0; x < L.x1; x += 16) {            // 별가루
        const tw = 0.5 + 0.5 * Math.sin(t * 2 + x * 0.3);
        ctx.fillStyle = `rgba(214,220,255,${0.75 * solid * tw})`;
        ctx.beginPath(); ctx.arc(x - camX + rnd() * 8, g.terrain.yAt(L, x) + 2 + rnd() * 7, 0.9, 0, TAU); ctx.fill();
      }
    } else {
      // 빛 속에서는 자취만 남는다
      ctx.strokeStyle = U.css(pal.ink, 0.16); ctx.lineWidth = 1.6; ctx.setLineDash([3, 9]); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.restore();
  }

  /* 빛의 가장자리 — 황혼 */
  function rims(ctx, g, bs, t) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const b of bs) {
      if (b.r < 20 || b.r > 1500) continue;
      const walk = b.walk ? 1 : 0;
      for (const [w, a, col] of [[T.RIM * 2.4, 0.04, '255,170,150'], [T.RIM * 1.1, 0.06 + walk * 0.1, '214,150,230'], [1.4, 0.26 + walk * 0.44, '255,226,214']]) {
        ctx.strokeStyle = `rgba(${col},${a * (b.soft ? 0.5 : 1)})`; ctx.lineWidth = w;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.stroke();
      }
      // 가장자리를 도는 빛 알갱이 (디딜 수 있을 때는 더 또렷하게)
      const n = Math.max(8, Math.round(b.r / 9));
      for (let i = 0; i < n; i++) {
        const an = (i / n) * TAU + t * (0.12 + walk * 0.1) * (i % 2 ? 1 : -1);
        const tw = 0.5 + 0.5 * Math.sin(t * 2.2 + i * 1.7);
        ctx.fillStyle = `rgba(255,230,240,${(0.25 + walk * 0.5) * tw})`;
        ctx.beginPath(); ctx.arc(b.x + Math.cos(an) * b.r, b.y + Math.sin(an) * b.r, 1 + walk * 0.6, 0, TAU); ctx.fill();
      }
    }
    ctx.restore();
  }

  /* 앞쪽 장식 (동굴 천장의 종유석) */
  function drawFore(ctx, g, pal, camX, W) {
    const f = g.level.fore;
    if (f.kind !== 'stalactites') return;
    ctx.fillStyle = U.css(U.mix(pal.deep, pal.ink, 0.5));
    const span = 2000, off = ((camX * 1.25) % span + span) % span;
    const pts = R._stal || (R._stal = (() => { const rnd = U.rng(77), o = []; let x = 0; while (x < span) { const w = 30 + rnd() * 70; o.push([x, w, 30 + rnd() * 120]); x += w; } return o; })());
    ctx.beginPath(); ctx.moveTo(-10, -10);
    for (let rep = 0; rep < 3; rep++) for (const [px, pw, ph] of pts) {
      const x = px - off + rep * span;
      if (x > W + 100 || x + pw < -100) continue;
      ctx.lineTo(x, 0); ctx.lineTo(x + pw * 0.5, ph); ctx.lineTo(x + pw, 0);
    }
    ctx.lineTo(W + 10, -10); ctx.closePath(); ctx.fill();
  }

  function drawGlows(ctx) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    for (const gl of R.glows) {
      const c = gl.rgb;
      const gr = ctx.createRadialGradient(gl.x, gl.y, 0, gl.x, gl.y, gl.r);
      gr.addColorStop(0, `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${gl.a})`);
      gr.addColorStop(0.45, `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${gl.a * 0.3})`);
      gr.addColorStop(1, `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},0)`);
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(gl.x, gl.y, gl.r, 0, TAU); ctx.fill();
    }
    ctx.restore();
    ctx.setTransform(R.scale, 0, 0, R.scale, 0, 0);
  }

  R.fbm = fbm;
})(typeof globalThis !== 'undefined' ? globalThis : window);
