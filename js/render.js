/* 데이 & 나이트 — 화면 그리기
 * 하늘 → 먼 배경 → 언덕 겹(뒤에서 앞으로, 겹마다 소품과 인물) → 어둠과 빛 → 종이결
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
      night: { skyTop: '#23245a', skyBot: '#84689a', haze: '#a98ab0', far: '#877cab', near: '#cfc6e4', deep: '#7b72a6', tint: '#7b72a6', tintAmt: 0.4, ink: '#2e2848', dark: 0.22, cloud: '#8f84b6' },
    },
    village: {
      day:   { skyTop: '#8fbdd6', skyBot: '#f4ead0', haze: '#fff6dc', far: '#c6d3b2', near: '#7f9c64', deep: '#58764f', tint: '#7f9c64', tintAmt: 0.05, ink: '#3c3428', dark: 0, cloud: '#ffffff' },
      dusk:  { skyTop: '#59578c', skyBot: '#f0a070', haze: '#ffcf96', far: '#b7959a', near: '#6a5568', deep: '#463a52', tint: '#6a5068', tintAmt: 0.36, ink: '#2c2230', dark: 0.14, cloud: '#f7b9a0' },
      night: { skyTop: '#0c1030', skyBot: '#252b55', haze: '#343a68', far: '#39416a', near: '#1d2344', deep: '#11152e', tint: '#1d2344', tintAmt: 0.6, ink: '#070916', dark: 0.4, cloud: '#2e3560' },
      dawn:  { skyTop: '#4c5c90', skyBot: '#eab9a8', haze: '#ffe2cc', far: '#a3a0bc', near: '#5e6286', deep: '#404466', tint: '#5e6286', tintAmt: 0.32, ink: '#24263c', dark: 0.08, cloud: '#f3c6c0' },
    },
    harbor: {
      day:   { skyTop: '#86c0d8', skyBot: '#f2ecd6', haze: '#fff8e2', far: '#d3d2b4', near: '#b89c70', deep: '#8a7352', wFar: '#8fc4c6', wNear: '#4f93a2', tint: '#b89c70', tintAmt: 0.04, ink: '#3a3228', dark: 0, cloud: '#ffffff' },
      dusk:  { skyTop: '#54588e', skyBot: '#f2a878', haze: '#ffd6a0', far: '#b99a94', near: '#75596a', deep: '#4c3c54', wFar: '#b48a98', wNear: '#5a4a78', tint: '#70566a', tintAmt: 0.36, ink: '#2a2230', dark: 0.14, cloud: '#f6bca4' },
      night: { skyTop: '#0a0e2c', skyBot: '#222a54', haze: '#303a68', far: '#363e66', near: '#1c2242', deep: '#10142c', wFar: '#2a3668', wNear: '#141c46', tint: '#1c2242', tintAmt: 0.6, ink: '#060814', dark: 0.4, cloud: '#2c3460' },
      dawn:  { skyTop: '#4a5e92', skyBot: '#ecbcaa', haze: '#ffe4ce', far: '#a7a4bc', near: '#666584', deep: '#444664', wFar: '#b9a8c4', wNear: '#56628e', tint: '#62648a', tintAmt: 0.32, ink: '#24263c', dark: 0.08, cloud: '#f4c8c2' },
    },
    city: {
      day:   { skyTop: '#93b9d0', skyBot: '#efe6d2', haze: '#fbf2de', far: '#bcc3cc', near: '#7c8294', deep: '#5a6072', tint: '#7c8294', tintAmt: 0.06, ink: '#34343c', dark: 0, cloud: '#ffffff' },
      dusk:  { skyTop: '#55548a', skyBot: '#ee9c72', haze: '#ffc994', far: '#a98e9c', near: '#5c4f68', deep: '#3e3550', tint: '#5c4f68', tintAmt: 0.36, ink: '#261f2e', dark: 0.14, cloud: '#f2b29c' },
      night: { skyTop: '#090c26', skyBot: '#1f2448', haze: '#2c3158', far: '#30365a', near: '#161a36', deep: '#0c0e22', tint: '#161a36', tintAmt: 0.62, ink: '#050610', dark: 0.42, cloud: '#262b52' },
      dawn:  { skyTop: '#48588c', skyBot: '#e6b2a4', haze: '#fbdcc8', far: '#9c9ab4', near: '#565a7c', deep: '#3a3d5c', tint: '#565a7c', tintAmt: 0.34, ink: '#202236', dark: 0.08, cloud: '#eec0bc' },
    },
    cave: {
      night: { skyTop: '#120e18', skyBot: '#241a26', haze: '#2c2030', far: '#54434e', near: '#30262f', deep: '#16111a', tint: '#30262f', tintAmt: 0.5, ink: '#08060a', dark: 0.6, cloud: '#241a26' },
      dusk:  { skyTop: '#2a1e2c', skyBot: '#5a3c40', haze: '#7a5648', far: '#7a5e5c', near: '#4a363c', deep: '#241a22', tint: '#4a363c', tintAmt: 0.3, ink: '#120c10', dark: 0.3, cloud: '#5a3c40' },
    },
    snow: {
      night: { skyTop: '#0b0f2c', skyBot: '#262c54', haze: '#3a4070', far: '#5a6288', near: '#8f98b8', deep: '#4a5278', tint: '#4a5278', tintAmt: 0.5, ink: '#0c0e20', dark: 0.42, cloud: '#30365e' },
    },
    realm: {
      night: { skyTop: '#04051a', skyBot: '#181a42', haze: '#262866', far: '#2c2e62', near: '#0f1132', deep: '#06071a', tint: '#14163a', tintAmt: 0.5, ink: '#02030c', dark: 0.34, cloud: '#1c1e4a' },
      dusk:  { skyTop: '#2c2a66', skyBot: '#8f6a9a', haze: '#b888a8', far: '#6a5c94', near: '#34305e', deep: '#1e1c40', tint: '#34305e', tintAmt: 0.4, ink: '#141230', dark: 0.18, cloud: '#6a5c94' },
    },
    hill: {
      day:   { skyTop: '#8cc0dc', skyBot: '#f6eed4', haze: '#fff8e0', far: '#cad6b4', near: '#88a468', deep: '#5e7c54', tint: '#88a468', tintAmt: 0.05, ink: '#3c3428', dark: 0, cloud: '#ffffff' },
      dusk:  { skyTop: '#5a5494', skyBot: '#f4a678', haze: '#ffd49c', far: '#c59aa6', near: '#7a5a78', deep: '#4c3c5c', tint: '#74587a', tintAmt: 0.3, ink: '#2c2234', dark: 0.08, cloud: '#f8bca6' },
      night: { skyTop: '#0a0e2e', skyBot: '#262c5a', haze: '#363c6e', far: '#3c4470', near: '#20264a', deep: '#121632', tint: '#20264a', tintAmt: 0.6, ink: '#070916', dark: 0.42, cloud: '#2e3562' },
      dawn:  { skyTop: '#566a9c', skyBot: '#f4c4ae', haze: '#fff0d6', far: '#b4b0c8', near: '#6c7092', deep: '#4a4e70', tint: '#6c7092', tintAmt: 0.26, ink: '#26283e', dark: 0.04, cloud: '#f8d0c6' },
    },
  };
  const TOD_KEYS = ['day', 'dusk', 'night', 'dawn'];
  const COLOR_KEYS = ['skyTop', 'skyBot', 'haze', 'far', 'near', 'deep', 'tint', 'ink', 'cloud', 'wFar', 'wNear'];

  function themeKey(theme, i) {
    // 그 시간대의 색이 없으면 가까운 것으로
    const order = [i, (i + 1) % 4, (i + 3) % 4, (i + 2) % 4];
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
  const R = (DN.Render = {
    H, W: 1280, scale: 1, canvas: null, ctx: null,
    glows: [], lights: [], darkCanvas: null,
    THEMES, palette,
  });

  R.init = function (canvas) {
    R.canvas = canvas;
    R.ctx = canvas.getContext('2d');
    R.darkCanvas = document.createElement('canvas');
    R.resize();
  };

  R.resize = function () {
    const c = R.canvas;
    const box = c.parentElement.getBoundingClientRect();
    let cw = box.width, ch = box.height;
    const minA = 4 / 3, maxA = R.wideOverride || 2.2;
    let a = cw / Math.max(1, ch);
    let vw = cw, vh = ch;
    if (a < minA) { vh = cw / minA; a = minA; } else if (a > maxA) { vw = ch * maxA; a = maxA; }
    const dpr = Math.min(root.devicePixelRatio || 1, 2);
    c.style.width = vw + 'px'; c.style.height = vh + 'px';
    c.width = Math.round(vw * dpr); c.height = Math.round(vh * dpr);
    R.W = H * a; R.scale = c.height / H;
    R.cssScale = vh / H;
    R.darkCanvas.width = Math.ceil(c.width / 2); R.darkCanvas.height = Math.ceil(c.height / 2);
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
      if (style === 'hill' || style === 'dusk' || style === 'snow') {
        for (let x = L.x0 + 10; x < L.x1 - 10; x += 14 + rnd() * 38) {
          const k = rnd();
          deco.push({ x, kind: k < 0.62 ? 'tuft' : k < 0.8 ? 'flower' : 'stone', s: 0.7 + rnd() * 0.7, d: k < 0.8 ? 0 : 8 + rnd() * 30, c: Math.floor(rnd() * 3) });
        }
      } else if (style === 'cloud') {
        for (let x = L.x0; x < L.x1; x += 22 + rnd() * 30) deco.push({ x, kind: 'puff', s: 15 + rnd() * 20, d: 6 + rnd() * 9 });
        if (L.thick) {
          // 섬의 양 끝을 둥글게
          for (const [x, k] of [[L.x0 + 12, 0.2], [L.x0 + 44, 0.3], [L.x1 - 12, 0.2], [L.x1 - 44, 0.3]]) deco.push({ x, kind: 'puff', s: L.thick * k, d: L.thick * k * 0.7 });
        }
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
    for (let i = 0; i < 150; i++) R.stars.push({ x: rnd(), y: rnd() * 0.72, r: 0.6 + rnd() * 1.3, ph: rnd() * 10, rank: rnd() });
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
    const ctx = R.ctx, W = R.W;
    const level = g.level, terrain = g.terrain;
    const camX = g.cam.x;
    const t = g.time;
    const pal = (R.pal = palette(level.theme, g.tod));
    R.glows.length = 0; R.lights.length = 0;
    ctx.setTransform(R.scale, 0, 0, R.scale, 0, 0);
    ctx.imageSmoothingQuality = 'high';
    ctx.lineJoin = 'round';

    const env = (R.env = {
      t, pal, layer: null, ax: 0, flags: g.flags,
      shade: (hex, alpha) => U.css(U.mix(hex, pal.tint, pal.tintAmt), alpha),
      ink: (a) => U.css(pal.ink, a),
      lit: (p) => (p.lit === true) || (typeof p.lit === 'string' && !!g.flags[p.lit]),
      glow: (c, x, y, r, rgb, a) => {
        const m = c.getTransform();
        const sc = Math.hypot(m.a, m.b);
        R.glows.push({ x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f, r: r * sc, rgb, a });
      },
      gy: (dx) => (env.layer ? terrain.yAt(env.layer, env.ax + dx) - terrain.yAt(env.layer, env.ax) : 0),
    });

    drawSky(ctx, g, pal, camX, W, t);
    drawBackdrop(ctx, g, pal, camX, W, t);

    for (const L of terrain.layers) {
      if (L.def.hidden && !g.flags[L.def.hidden]) continue;
      drawLayer(ctx, g, L, pal, camX, W, t, env);
      // 소품
      for (const p of L.props) {
        if (p.when && !g.flags[p.when]) continue;
        if (p.unless && g.flags[p.unless]) continue;
        const sx = p.x - camX;
        if (sx < -260 || sx > W + 260) continue;
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

    if (level.fore) drawFore(ctx, g, pal, camX, W, t);
    g.drawOver(ctx, env, camX);          // 빛줄기, 입자 등 (어둠 아래)

    drawDarkness(ctx, g, pal, W);
    drawGlows(ctx);
    g.drawTop(ctx, env, camX);           // 손잡이 표시, 누른 자리 (어둠 위)

    // 종이결과 가장자리 음영
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.5;
    const paper = Art.paper();
    const ps = Math.max(1, Math.round(R.scale * 1.2));
    ctx.save(); ctx.scale(ps, ps);
    ctx.fillStyle = ctx.createPattern(paper, 'repeat');
    ctx.fillRect(0, 0, R.canvas.width / ps + 1, R.canvas.height / ps + 1);
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    const vg = ctx.createRadialGradient(R.canvas.width / 2, R.canvas.height / 2, R.canvas.height * 0.45, R.canvas.width / 2, R.canvas.height / 2, R.canvas.width * 0.75);
    vg.addColorStop(0, 'rgba(30,20,30,0)'); vg.addColorStop(1, 'rgba(30,20,30,0.32)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, R.canvas.width, R.canvas.height);
  };

  /* ───────── 하늘 ───────── */
  function drawSky(ctx, g, pal, camX, W, t) {
    const level = g.level;
    const gr = ctx.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, U.css(pal.skyTop));
    gr.addColorStop(0.62, U.css(pal.skyBot));
    gr.addColorStop(1, U.css(pal.haze));
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    const sky = level.sky || {};
    if (sky.none) return;

    // 별 (나이트의 별은 거의 다 꺼졌다 — g.starAmount 만큼만 보인다)
    const sa = g.starAmount || 0;
    if (sa > 0.001) {
      const darkness = U.clamp(pal.dark / 0.3, 0, 1);
      ctx.fillStyle = '#fff';
      for (const s of R.stars) {
        if (s.rank > sa) continue;
        const fade = U.clamp((sa - s.rank) * 12, 0, 1);
        const tw = 0.6 + 0.4 * Math.sin(t * 1.4 + s.ph);
        ctx.globalAlpha = darkness * fade * tw * 0.9;
        ctx.beginPath(); ctx.arc(((s.x * 2600 - camX * 0.03) % (W + 40) + W + 40) % (W + 40) - 20, s.y * H, s.r, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // 마지막 별
    if (g.lastStar && g.lastStar.a > 0.01) {
      const sx = g.lastStar.x - camX * (g.lastStar.par === undefined ? 0.05 : g.lastStar.par);
      Art.star(ctx, sx, g.lastStar.y, g.lastStar.r || 3.2, g.lastStar.a, t);
      R.lastStarScreen = { x: sx, y: g.lastStar.y };
    }
    // 해
    if (g.sun && g.sun.a > 0.01) {
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
    // 구름
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
  function drawBackdrop(ctx, g, pal, camX, W, t) {
    for (const b of R.backdrop) {
      const par = b.par === undefined ? 0.2 : b.par;
      const ox = camX * par;
      const col = b.color ? U.mix(b.color, pal.skyBot, b.fade || 0) : U.mix(U.mix(pal.far, pal.skyBot, b.fade === undefined ? 0.5 : b.fade), pal.deep, b.deep || 0);
      if (b.kind === 'mountains') {
        ctx.fillStyle = U.css(col);
        ctx.beginPath(); ctx.moveTo(0, H);
        for (let x = 0; x <= W + 12; x += 12) {
          const y = b.base - b.amp * fbm((x + ox) * (b.freq || 0.004), b.seed);
          ctx.lineTo(x, y);
        }
        ctx.lineTo(W + 12, H); ctx.closePath(); ctx.fill();
      } else if (b.kind === 'sea') {
        const gr = ctx.createLinearGradient(0, b.base, 0, H);
        gr.addColorStop(0, U.css(U.mix(pal.wFar, pal.skyBot, 0.45)));
        gr.addColorStop(1, U.css(pal.wNear));
        ctx.fillStyle = gr; ctx.fillRect(0, b.base, W, H - b.base);
        ctx.strokeStyle = U.css(pal.haze, 0.35); ctx.lineWidth = 1;
        for (let i = 0; i < 26; i++) {
          const yy = b.base + 6 + i * i * 0.75;
          const xx = (((i * 331 - ox * (0.3 + i * 0.03) + t * (3 + i)) % (W + 200)) + W + 200) % (W + 200) - 100;
          ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx + 30 + i * 3, yy); ctx.stroke();
        }
      } else if (b.kind === 'skyline') {
        const rnd = U.rng(b.seed);
        ctx.fillStyle = U.css(col);
        const span = 2600, off = ((ox % span) + span) % span;
        const blds = R['_sky' + b.seed] || (R['_sky' + b.seed] = (() => {
          const out = []; let x = 0;
          while (x < span) { const w = 26 + rnd() * 60; out.push([x, w, b.amp * (0.25 + rnd() * 0.75), rnd()]); x += w + rnd() * 8; }
          return out;
        })());
        for (const [bx, bw, bh, q] of blds) {
          for (let rep = -1; rep <= 1; rep++) {
            const x = bx - off + rep * span;
            if (x > W || x + bw < 0) continue;
            ctx.fillRect(x, b.base - bh, bw, H);
            if (q > 0.7) ctx.fillRect(x + bw * 0.4, b.base - bh - 16, 2, 16);
          }
        }
      } else if (b.kind === 'cavewall') {
        // 벽의 층리
        ctx.strokeStyle = U.css(pal.far, 0.14); ctx.lineWidth = 2;
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
          const x = rnd() * (W + 300) - 150 - (ox % 300), y = b.base + rnd() * b.amp, r = 0.8 + rnd() * 1.6, order = rnd();
          const warm = rnd();
          if (order > amt) continue;
          const tw = 0.7 + 0.3 * Math.sin(t * (1 + rnd() * 3) + i);
          ctx.fillStyle = warm > 0.3 ? `rgba(255,214,140,${0.85 * tw})` : `rgba(210,230,255,${0.8 * tw})`;
          ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
          if (r > 1.9) R.glows.push({ x: x * R.scale, y: y * R.scale, r: 9 * R.scale, rgb: [255, 200, 120], a: 0.3 * tw });
        }
      } else if (b.kind === 'mural' && g.drawMural) {
        g.drawMural(ctx, b, camX * (b.par === undefined ? 1 : b.par), pal, t);
      }
    }
  }

  /* ───────── 언덕 겹 ───────── */
  function ridgePath(ctx, L, camX, W, close, dy) {
    const S = T.STEP;
    const i0 = Math.max(0, Math.floor((camX - 60) / S)), i1 = Math.min(L.ys.length - 1, Math.ceil((camX + W + 60) / S));
    let started = false, lastX = 0, minY = 9999, firstX = 0, prevY = 0;
    dy = dy || 0;
    for (let i = i0; i <= i1; i++) {
      const y = L.ys[i];
      if (y >= T.ABSENT) { if (started) break; continue; }
      const x = i * S - camX;
      if (!started) {
        started = true; firstX = x;
        if (close && !L.thick) { ctx.moveTo(x, H + 80); ctx.lineTo(x, y + dy); } else ctx.moveTo(x, y + dy);
      } else {
        if (L.kind === 'step' && y !== prevY) ctx.lineTo(x, prevY + dy);
        ctx.lineTo(x, y + dy);
      }
      prevY = y; lastX = x;
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
      } else {
        ctx.lineTo(lastX, H + 80);
      }
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

  function drawLayer(ctx, g, L, pal, camX, W, t, env) {
    const terrain = g.terrain;
    if (L.thin) { drawRibbon(ctx, g, L, pal, camX, W, t); return; }
    const col = layerColors(L, pal, terrain.layers.length);
    ctx.beginPath();
    const info = ridgePath(ctx, L, camX, W, true, 0);
    if (!info) return;
    const style = L.style;

    if (style === 'cloud') {
      // 뭉게구름: 능선 위로 봉긋한 덩어리
      ctx.fillStyle = U.css(col.top);
      for (const d of L.deco) {
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
      // 풀, 꽃, 돌
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
          const fc = ['#fff6e0', '#f5d08a', '#f2b0b8'][d.c];
          ctx.fillStyle = U.css(U.mix(fc, pal.tint, pal.tintAmt * 0.8), 0.9);
          ctx.beginPath(); ctx.arc(sx, y + 6, 1.7 * d.s, 0, TAU); ctx.arc(sx + 5, y + 9, 1.3 * d.s, 0, TAU); ctx.fill();
        } else if (d.kind === 'stone') {
          ctx.fillStyle = U.css(U.mix(col.bot, pal.ink, 0.15), 0.4);
          ctx.beginPath(); ctx.ellipse(sx, y, 5 * d.s, 2.4 * d.s, 0, 0, TAU); ctx.fill();
        } else if (d.kind === 'crack') {
          ctx.strokeStyle = U.css(pal.ink, 0.22); ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(sx, y); ctx.lineTo(sx + 9 * d.s, y + 12 * d.s); ctx.lineTo(sx + 5 * d.s, y + 24 * d.s); ctx.stroke();
        } else if (d.kind === 'dust') {
          const tw = 0.4 + 0.6 * Math.sin(t * 1.2 + d.c * 30);
          ctx.fillStyle = `rgba(200,210,255,${0.22 * tw})`;
          ctx.beginPath(); ctx.arc(sx, y, 1.1 * d.s, 0, TAU); ctx.fill();
        }
      }
    }
    ctx.restore();

    // 연필 선
    ctx.beginPath(); ridgePath(ctx, L, camX, W, false, 0);
    ctx.strokeStyle = U.css(pal.ink, style === 'cloud' ? 0.1 : style === 'water' ? 0.16 : 0.3);
    ctx.lineWidth = 1.2; ctx.stroke();
    if (pal.dark > 0.05 && style !== 'cloud') {
      // 밤에는 능선에 희미한 빛 테두리를 둘러 길이 읽히게 한다
      ctx.beginPath(); ridgePath(ctx, L, camX, W, false, -0.8);
      ctx.strokeStyle = U.css(U.mix(pal.haze, '#c8d0ff', 0.5), Math.min(0.42, pal.dark * 0.95)); ctx.lineWidth = 1.1; ctx.stroke();
    }
    if (style === 'water') {
      ctx.beginPath(); ridgePath(ctx, L, camX, W, false, 1.5);
      ctx.strokeStyle = U.css(pal.haze, 0.55); ctx.lineWidth = 1.6; ctx.setLineDash([14, 9]); ctx.lineDashOffset = -t * 12; ctx.stroke(); ctx.setLineDash([]);
    }
  }

  /* 건물: 지붕 높이에 붙어 움직이는 창문들 */
  function drawBuildings(ctx, g, L, pal, camX, W, col) {
    const terrain = g.terrain;
    // 계단
    ctx.strokeStyle = U.css(pal.ink, 0.3); ctx.lineWidth = 1;
    for (const r of L.ramps) {
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
      // 건물마다 살짝 다른 색
      ctx.fillStyle = U.css(U.mix(col.top, b.hue > 0.5 ? pal.deep : pal.far, 0.16 * Math.abs(b.hue - 0.5) * 2), 0.9);
      ctx.fillRect(x0, y, x1 - x0, H - y + 80);
      ctx.fillStyle = U.css(pal.ink, 0.22); ctx.fillRect(x0, y, x1 - x0, 5);
      ctx.fillStyle = U.css(pal.ink, 0.12); ctx.fillRect(x1 - 3, y, 3, H);
      // 창문 (정전 — 모두 꺼져 있다)
      const rnd = U.rng(b.seed);
      const lit = g.flags.cityLit;
      for (let wy = y + 18; wy < H; wy += 24) {
        for (let wx = x0 + 9; wx < x1 - 13; wx += 17) {
          const q = rnd();
          if (q > b.win + 0.35) continue;
          if (lit && q < 0.3) {
            ctx.fillStyle = 'rgba(255,214,140,0.85)';
          } else {
            ctx.fillStyle = U.css(U.mix(pal.skyTop, pal.ink, 0.5), 0.5);
          }
          ctx.fillRect(wx, wy, 9, 12);
        }
      }
    }
  }

  /* 그림자 길: 등불을 끄면 단단해지는 어둠의 띠 */
  function drawRibbon(ctx, g, L, pal, camX, W, t) {
    const dark = g.shadowSolid || 0;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.beginPath(); const info = ridgePath(ctx, L, camX, W, false, 5);
    if (!info) { ctx.restore(); return; }
    if (dark > 0.02) {
      ctx.strokeStyle = `rgba(22,16,48,${0.92 * dark})`; ctx.lineWidth = 13; ctx.stroke();
      ctx.beginPath(); ridgePath(ctx, L, camX, W, false, 0);
      ctx.strokeStyle = `rgba(150,140,230,${0.55 * dark})`; ctx.lineWidth = 1.4; ctx.stroke();
      // 별가루
      const rnd = U.rng(Math.floor(L.seed));
      for (let x = L.x0; x < L.x1; x += 16) {
        const tw = 0.5 + 0.5 * Math.sin(t * 2 + x * 0.3);
        const yy = g.terrain.yAt(L, x) + 2 + rnd() * 7;
        ctx.fillStyle = `rgba(210,215,255,${0.7 * dark * tw})`;
        ctx.beginPath(); ctx.arc(x - camX + rnd() * 8, yy, 0.9, 0, TAU); ctx.fill();
      }
    }
    if (dark < 0.98) {
      ctx.beginPath(); ridgePath(ctx, L, camX, W, false, 4);
      ctx.strokeStyle = `rgba(60,50,110,${0.3 * (1 - dark)})`; ctx.lineWidth = 2; ctx.setLineDash([3, 9]); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.restore();
  }

  /* 앞쪽 장식 (동굴 천장의 종유석 등) */
  function drawFore(ctx, g, pal, camX, W, t) {
    const f = g.level.fore;
    if (f.kind === 'stalactites') {
      const rnd = U.rng(77);
      ctx.fillStyle = U.css(U.mix(pal.deep, pal.ink, 0.5));
      const span = 2000, off = ((camX * 1.25) % span + span) % span;
      ctx.beginPath(); ctx.moveTo(-10, -10);
      const pts = R._stal || (R._stal = (() => { const o = []; let x = 0; while (x < span) { const w = 30 + rnd() * 70; o.push([x, w, 30 + rnd() * 120]); x += w; } return o; })());
      for (let rep = 0; rep < 3; rep++) for (const [px, pw, ph] of pts) {
        const x = px - off + rep * span;
        if (x > W + 100 || x + pw < -100) continue;
        ctx.lineTo(x, 0); ctx.lineTo(x + pw * 0.5, ph); ctx.lineTo(x + pw, 0);
      }
      ctx.lineTo(W + 10, -10); ctx.closePath(); ctx.fill();
    }
  }

  /* ───────── 어둠과 빛 ───────── */
  function drawDarkness(ctx, g, pal, W) {
    const dark = pal.dark * (g.darkMul === undefined ? 1 : g.darkMul) * (g.eyes === undefined ? 1 : g.eyes);
    if (dark < 0.01) return;
    const dc = R.darkCanvas, dx = dc.getContext('2d');
    const s = dc.width / W;
    dx.setTransform(1, 0, 0, 1, 0, 0);
    dx.globalCompositeOperation = 'source-over';
    dx.clearRect(0, 0, dc.width, dc.height);
    dx.fillStyle = `rgba(8,9,30,${dark})`;
    dx.fillRect(0, 0, dc.width, dc.height);
    dx.globalCompositeOperation = 'destination-out';
    const punch = (x, y, r, a) => {
      const gr = dx.createRadialGradient(x, y, r * 0.12, x, y, r);
      gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(0.55, `rgba(0,0,0,${a * 0.55})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      dx.fillStyle = gr; dx.beginPath(); dx.arc(x, y, r, 0, TAU); dx.fill();
    };
    for (const l of R.lights) punch(l.x * s, l.y * s, l.r * s, l.a === undefined ? 0.95 : l.a);
    const gs = dc.width / R.canvas.width;
    for (const gl of R.glows) punch(gl.x * gs, gl.y * gs, gl.r * 1.5 * gs, Math.min(0.9, gl.a * 1.3));
    ctx.drawImage(dc, 0, 0, W, H);
    // 등불 둘레의 따스한 기운
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const l of R.lights) {
      if (!l.warm) continue;
      const gr = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * 0.8);
      gr.addColorStop(0, `rgba(255,190,110,${0.2 * l.warm})`); gr.addColorStop(1, 'rgba(255,190,110,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(l.x, l.y, l.r * 0.8, 0, TAU); ctx.fill();
    }
    ctx.restore();
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
