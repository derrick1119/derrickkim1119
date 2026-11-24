/* Take Your Time — the look of each place, in one table, and the seasons on Leo's hill.
   Every frame is finished the same way: paint.js lays the place's palette over it (P.grade), with the glow of
   its light and the motes drifting in it, then its vignette and its grain (P.finish); and every figure is given
   a lit side and a shadow side in the place's own light (F.person and F.dog, below). What differs from place to
   place lives in LOOKS and nowhere else. A scene says which place it is (S.lookAs: a name, a look, or a function
   that returns one), a view cut to from the stage says so with its own look, and the hill in the later chapters
   is worked out from its season and how dark it is (ps.season, ps.night).
   Seasons: ps.season runs 0..4 round the year (0 spring, 1 summer, 2 autumn, 3 winter); X.season('autumn') sets
   it, and X.years(from, to, { season }) turns the year round under the year card and lands on that season.
   Loaded after the scenes that make the views and before the chapter scripts, because it puts the look on
   those views and gives the stage its seasons. */
(function () {
  'use strict';
  const T = window.TYT, F = T.F;

  /* ---------- the table ----------
     g0 g1 g2 gA   the palette laid over the frame in soft-light: top, middle, foot, and how strongly
     bloom         the blurred copy of the frame laid back over it (softness, a little glow)
     glow core     the light where the scene says it is: its wide warmth and its bright heart (colour, strength)
     motes mote    how many motes drift in that light (1 = the usual 26), and their colour
     vig vigC      the vignette;  grain  the paper grain;  paper  warm drawing paper multiplied over (memories)
     lit shade     the two sides of a figure (colour, strength); dx dy  where the light comes from, for figures */
  const BASE = { g0: '#6c50b8', g1: '#e87c86', g2: '#ffad5c', gA: 0.66, bloom: 0.55, glow: '#ffc98c', glowA: 0.34, core: '#fff0d4', coreA: 0.26, motes: 1, mote: '#fff4e0',
    vig: 0.28, vigC: '#3d2a55', grain: 0.15, paper: 0, lit: '#ffe4c0', litA: 0.34, shade: '#4c2c68', shadeA: 0.38, dx: -0.55, dy: -0.83 };
  const look = (o) => Object.assign({}, BASE, o);
  const LOOKS = {
    /* Welcome Harbor at dusk: warm peach and violet, the sun low on the right (the houses are lit from there too) */
    harbour: look({ dx: 0.72, dy: -0.69 }),
    /* the evening his mother goes on: violet deepening, the first stars */
    dusk: look({ g0: '#3c3c90', g1: '#a06aa0', g2: '#e0906a', gA: 0.6, glow: '#ffd0a0', glowA: 0.2, coreA: 0.14, motes: 0.5, vig: 0.36, vigC: '#1c1a40', lit: '#ffd8c0', litA: 0.26, shade: '#2a2050', shadeA: 0.42, dx: 0.72, dy: -0.69 }),
    /* Leo's hill by day, round the year: fresh green and gold light; the season tints it */
    spring: look({ g0: '#7470c4', g1: '#f0a6a4', g2: '#f8d090', gA: 0.52, bloom: 0.6, glow: '#ffe2cc', glowA: 0.32, core: '#fff4e6', motes: 1, mote: '#fff0f2', vig: 0.24, vigC: '#4a3a66', lit: '#fff0e0', litA: 0.34, shade: '#5a3c72', shadeA: 0.34, dx: 0.72, dy: -0.69 }),
    summer: look({ g0: '#566cc0', g1: '#ee9c7c', g2: '#f4c252', gA: 0.58, glow: '#ffd890', glowA: 0.38, core: '#fff6dc', coreA: 0.28, motes: 0.9, mote: '#fff6dc', vig: 0.24, vigC: '#3a3a5c', lit: '#fff0c8', litA: 0.38, shade: '#3c3a64', shadeA: 0.38, dx: 0.72, dy: -0.69 }),
    autumn: look({ g0: '#6852a6', g1: '#e48a64', g2: '#f6a44e', gA: 0.58, glow: '#ffbe78', glowA: 0.38, core: '#ffeccc', motes: 0.8, mote: '#ffe8cc', vig: 0.3, vigC: '#3d2a48', grain: 0.16, lit: '#ffdcb0', litA: 0.36, shade: '#4a2c50', shadeA: 0.4, dx: 0.72, dy: -0.69 }),
    winter: look({ g0: '#6a80c4', g1: '#c4aac4', g2: '#f0d8bc', gA: 0.5, bloom: 0.62, glow: '#fff2e4', glowA: 0.28, core: '#ffffff', coreA: 0.22, motes: 0.4, mote: '#ffffff', vig: 0.26, vigC: '#2c3454', grain: 0.14, lit: '#f4f0ff', litA: 0.3, shade: '#34405e', shadeA: 0.4, dx: 0.72, dy: -0.69 }),
    /* the hill (or the harbour) after dark: deep indigo, moonlight from above, the windows and lamps their own */
    night: look({ g0: '#28307c', g1: '#5a5a9c', g2: '#9a7090', gA: 0.52, bloom: 0.5, glow: '#c8d6ff', glowA: 0.1, core: '#e8eeff', coreA: 0.06, motes: 0.3, mote: '#dfe8ff', vig: 0.42, vigC: '#0c1228', lit: '#dae4ff', litA: 0.2, shade: '#101838', shadeA: 0.46, dx: -0.5, dy: -0.86 }),
    /* the mirror lake: deep teal and indigo; the warm windows are the picture's own */
    lake: look({ g0: '#3a4c9e', g1: '#3a8a96', g2: '#2a5878', gA: 0.5, bloom: 0.5, glow: '#ffd49a', glowA: 0.14, core: '#fff0d0', coreA: 0.08, motes: 0.45, mote: '#d8f0ff', vig: 0.44, vigC: '#0a1426', lit: '#e2eeff', litA: 0.24, shade: '#0e2236', shadeA: 0.44, dx: -0.45, dy: -0.89 }),
    /* someone's dream: a pale pink and lilac haze */
    dream: look({ g0: '#b08ad8', g1: '#f4a8c8', g2: '#ffd6e0', gA: 0.5, bloom: 0.78, glow: '#ffd8f0', glowA: 0.3, core: '#fff6fb', coreA: 0.22, motes: 1.2, mote: '#ffe8f6', vig: 0.26, vigC: '#4a3466', grain: 0.12, lit: '#fff0f8', litA: 0.32, shade: '#5a3c7c', shadeA: 0.34, dx: -0.3, dy: -0.95 }),
    /* the places in the sky (the overlook, the post office of the wind, the headland of the whales): pastel */
    sky: look({ g0: '#8078d2', g1: '#f4a4be', g2: '#ffd09c', gA: 0.48, bloom: 0.62, glow: '#fff0dc', glowA: 0.32, core: '#fffaf0', coreA: 0.24, motes: 1, mote: '#fff6ea', vig: 0.22, vigC: '#4a3a68', grain: 0.13, lit: '#fff2e4', litA: 0.32, shade: '#5a447e', shadeA: 0.34, dx: 0.6, dy: -0.8 }),
    skyNight: look({ g0: '#2c3488', g1: '#6c58aa', g2: '#c08aa8', gA: 0.48, bloom: 0.62, glow: '#cfd4ff', glowA: 0.16, core: '#f0f0ff', coreA: 0.1, motes: 0.8, mote: '#e8e2ff', vig: 0.38, vigC: '#0e1230', grain: 0.14, lit: '#e6e2ff', litA: 0.26, shade: '#1a1842', shadeA: 0.42, dx: -0.4, dy: -0.9 }),
    /* the hospital room, late autumn: amber at dusk, indigo and one lamp at night, pale gold at first light */
    room: look({ g0: '#70507a', g1: '#e08c54', g2: '#f8a444', gA: 0.66, bloom: 0.5, glow: '#ffb860', glowA: 0.38, core: '#ffe6c0', coreA: 0.24, motes: 0.8, mote: '#ffe8c8', vig: 0.42, vigC: '#1e1420', grain: 0.12, lit: '#ffd8a0', litA: 0.36, shade: '#4a2a3c', shadeA: 0.4, dx: -0.8, dy: -0.6 }),
    roomNight: look({ g0: '#2e3270', g1: '#7a5a8a', g2: '#c8864e', gA: 0.55, bloom: 0.5, glow: '#ffc880', glowA: 0.26, core: '#ffe6c0', coreA: 0.14, motes: 0.4, mote: '#ffe8c8', vig: 0.5, vigC: '#0e1020', grain: 0.12, lit: '#ffd8a0', litA: 0.3, shade: '#1e1a34', shadeA: 0.46, dx: -0.8, dy: -0.6 }),
    roomDawn: look({ g0: '#7c84c0', g1: '#e8a49a', g2: '#ffd49a', gA: 0.56, bloom: 0.55, glow: '#fff0d4', glowA: 0.34, core: '#ffffff', coreA: 0.26, motes: 1, mote: '#fff6e6', vig: 0.3, vigC: '#2a2a44', grain: 0.12, lit: '#fff0dc', litA: 0.34, shade: '#4a3a5a', shadeA: 0.34, dx: -0.8, dy: -0.6 }),
    /* Ana's kitchen at night: one lamp overhead */
    kitchen: look({ g0: '#4c4a88', g1: '#c08470', g2: '#eaa45c', gA: 0.5, bloom: 0.5, glow: '#ffc070', glowA: 0.32, core: '#ffe8c0', coreA: 0.2, motes: 0.4, mote: '#ffe6c4', vig: 0.42, vigC: '#0b101a', grain: 0.13, lit: '#ffd8a0', litA: 0.34, shade: '#20203c', shadeA: 0.44, dx: 0.1, dy: -0.99 }),
    /* the memories: warm drawing paper under everything, crayon or paint */
    memory: look({ g0: '#a07a7a', g1: '#e8a484', g2: '#f2c68e', gA: 0.46, bloom: 0.38, glow: '#ffd8a8', glowA: 0.24, core: '#fff2dc', coreA: 0.16, motes: 0.45, mote: '#fff0d8', vig: 0.2, vigC: '#5a4630', grain: 0.2, paper: 0.2, lit: '#ffe8c8', litA: 0.28, shade: '#5a3a44', shadeA: 0.32 }),
    /* the list at the end, on white paper; then the sea of cloud comes up under it */
    paper: look({ g0: '#8a70b0', g1: '#e8a0a0', g2: '#ffc890', gA: 0.25, bloom: 0.3, glowA: 0.1, coreA: 0.06, motes: 0.3, vig: 0.14, vigC: '#6a4a6a', grain: 0.12 }),
    endSea: look({ gA: 0.6, vig: 0.24, vigC: '#6a4a6a', grain: 0.12 }),
  };
  const HILL = [LOOKS.spring, LOOKS.summer, LOOKS.autumn, LOOKS.winter];

  /* ---------- blending one look into another (into a scratch object: no new objects per frame) ---------- */
  const COLS = ['g0', 'g1', 'g2', 'glow', 'core', 'vigC', 'lit', 'shade'];
  const NUMS = ['gA', 'bloom', 'glowA', 'coreA', 'motes', 'vig', 'grain', 'paper', 'litA', 'shadeA', 'dx', 'dy'];
  /* blend steps are kept to 1/64, so a slow change makes a bounded number of colour strings */
  const q64 = (k) => Math.round(T.clamp(k) * 64) / 64;
  function blend(out, A, B, k) {
    k = q64(k);
    if (k <= 0) return A;
    if (k >= 1) return B;
    for (let i = 0; i < COLS.length; i++) { const c = COLS[i]; out[c] = A[c] === B[c] ? A[c] : T.mix(A[c], B[c], k); }
    for (let i = 0; i < NUMS.length; i++) { const n = NUMS[i]; out[n] = A[n] + (B[n] - A[n]) * k; }
    out.mote = k < 0.5 ? A.mote : B.mote;   /* one sprite per colour: the motes change colour at the halfway point */
    return out;
  }
  const S1 = {}, S2 = {}, S3 = {};

  /* ---------- which look each scene has ---------- */
  /* the room keeps time by the memories seen (S.tod: 0 dusk · 2 night · 4 first light · 5 morning) */
  function roomLook(S) {
    const d = S.tod || 0;
    if (d <= 2) return blend(S1, LOOKS.room, LOOKS.roomNight, T.smooth(d / 2));
    return blend(S1, LOOKS.roomNight, LOOKS.roomDawn, T.smooth(T.clamp((d - 2.4) / 1.8)));
  }
  const SCENES = {
    room: roomLook,
    kitchen: 'kitchen',
    stew: 'memory', walk: 'memory', swing: 'memory', home: 'memory',
    harbor: (S) => blend(S1, LOOKS.harbour, LOOKS.dusk, T.smooth(S.dusk || 0)),
    ending: (S) => blend(S1, LOOKS.paper, LOOKS.endSea, T.smooth(S.sea ? S.sea.a : 0)),
  };
  function pick(x, who) {
    if (x == null) return null;
    if (typeof x === 'function') x = x(who);
    return typeof x === 'string' ? LOOKS[x] || null : x && x.g0 ? x : null;
  }
  /* the hill in the chapters: its season, and how dark it is */
  function hill(S) {
    const s = T.season.at(S), ps = S.ps;
    let L = LOOKS.harbour;
    if (s != null) { const ph = T.season.phase(s); L = blend(S2, HILL[ph.i], HILL[ph.j], ph.k); }
    const n = ps && ps.night ? T.smooth(ps.night) : 0;
    return n > 0.005 ? blend(S3, L, LOOKS.night, n) : L;
  }
  function resolve(cur) {
    if (!cur) return LOOKS.harbour;
    if (cur.ps && cur.yr) T.season.at(cur);   /* keeps the year card's colours in step with the hill, even under a view */
    const v = cur.view;
    let L = v ? pick(v.lookAs, v) || (v.dark ? LOOKS.night : null) : null;
    if (!L) L = pick(cur.lookAs, cur);
    if (!L && cur.ps) L = hill(cur);
    if (!L) { const name = sceneName(cur); L = pick(SCENES[name], cur); }
    return L || LOOKS.harbour;
  }
  const names = new WeakMap();
  function sceneName(cur) {
    let n = names.get(cur);
    if (n == null) { n = Object.keys(T.scenes).find((k) => T.scenes[k] === cur) || ''; names.set(cur, n); }
    return n;
  }
  let memoT = -1, memoCur = null, memoView = null, memoL = BASE;
  const DIR = [0, 0];
  T.look = {
    LOOKS, SCENES, blend,
    get: (name) => LOOKS[name] || LOOKS.harbour,
    /* the look of what is on the screen this frame */
    now() {
      const cur = T.director && T.director.cur, v = cur ? cur.view : null;
      if (memoT === T.time && memoCur === cur && memoView === v) return memoL;
      memoT = T.time; memoCur = cur; memoView = v;
      try { memoL = resolve(cur); } catch (e) { memoL = LOOKS.harbour; }
      return memoL;
    },
    /* the direction the light comes from for figures: the view's, the scene's, or the look's */
    dir(L) {
      const cur = T.director && T.director.cur, v = cur && cur.view;
      const d = (v && v.lightDir) || (!v && cur && cur.lightDir) || null;
      if (d) return d;
      DIR[0] = L.dx; DIR[1] = L.dy;
      return DIR;
    },
  };

  /* views cut to from the stage take the look of their place */
  const VIEWS = { lake: 'lake', lakeHelp: 'lake', dream: 'dream', tiltDream: 'dream', twins: 'memory', place: (V) => (V.dark ? 'skyNight' : 'sky') };
  Object.keys(VIEWS).forEach((k) => {
    const mk = T[k];
    if (typeof mk !== 'function') return;
    const w = function () { const V = mk.apply(this, arguments); if (V && V.lookAs == null) V.lookAs = typeof VIEWS[k] === 'function' ? VIEWS[k](V) : VIEWS[k]; return V; };
    Object.keys(mk).forEach((p) => { w[p] = mk[p]; });   /* T.place.add, T.place.kit, … */
    T[k] = w;
  });

  /* ---------- seasons on the hill ---------- */
  const NAMES = { spring: 0.12, 'early spring': 3.8, 'late spring': 0.55, summer: 1.15, 'early summer': 0.8, 'late summer': 1.6, autumn: 2.1, fall: 2.1, 'early autumn': 1.85, 'late autumn': 2.55, winter: 3.15, 'late winter': 3.5 };
  const wrap4 = (s) => ((s % 4) + 4) % 4;
  const cd = (a, b) => { const d = Math.abs(wrap4(a) - wrap4(b)); return Math.min(d, 4 - d); };
  const ramp = (s, a, b) => T.smooth((s - a) / (b - a));
  /* colours round the year: [spring, summer, autumn, winter] */
  const PAL = {
    sky0: ['#8ea6dc', '#7c9cd6', '#8a8cc4', '#93a4c8'], sky1: ['#eec6bc', '#e6c4ac', '#eeb08e', '#d6d0dc'],
    sky2: ['#ffe0c2', '#ffe0a6', '#ffc884', '#f0e6dc'], sky3: ['#fff4e2', '#fff2d0', '#fff0c8', '#fbf6f0'],
    h3: ['#98ba84', '#88ae7a', '#b8a462', '#a4ac9e'], h3s: ['#68967e', '#5a8a78', '#8a7458', '#76848c'],
    h2: ['#bdb46a', '#b8ac5e', '#cf9e56', '#b8ac94'], h2s: ['#8e8a5e', '#8a8258', '#9a7652', '#8a8278'],
    h1: ['#dcac7c', '#daa876', '#dca06a', '#cfb6a2'], h1s: ['#b8846c', '#b6806a', '#b47a62', '#a89088'],
    tuft3: ['#78a86a', '#6a9470', '#9a8a58', '#8a9288'], tuft2: ['#9a9a50', '#a08c4e', '#b08040', '#9a9080'],
    grass: ['#7cb06a', '#6b9a72', '#b0985a', '#8e9a88'], grass2: ['#a8c870', '#9ab86a', '#c8a860', '#a8ae9c'],
    bank: ['#fff6ec', '#fff8ea', '#fff4e2', '#f8fbff'], bankS: ['#eebcc6', '#e6b6bc', '#e8b4a8', '#c9cfe2'],
  };
  const SNOW = '#eef0f5', SNOW_S = '#b8c2d8';
  /* how the leaves turn: each tree picks its own colour */
  const TURN = ['#e0913a', '#d4602e', '#e9b23e', '#c8503c', '#d98a2e', '#e2a03a'];
  const BLOSSOM = ['#f7c6d4', '#fbe4ec', '#f4b0c4'];
  const SZ = { s: null, f: {}, c: {} };
  function features(s) {
    const f = SZ.f;
    f.blossom = T.clamp(1 - cd(s, 0.15) / 0.7);
    f.leaves = s < 0.7 ? 0.55 + 0.45 * ramp(s, 0, 0.7) : s < 2.25 ? 1 : s < 2.95 ? 1 - ramp(s, 2.25, 2.95) : s < 3.5 ? 0 : 0.55 * ramp(s, 3.5, 4);
    f.turn = s < 1.5 || s > 3.4 ? 0 : ramp(s, 1.5, 2.05);
    f.fresh = s < 0.8 ? 1 - ramp(s, 0, 0.8) : s > 3.5 ? 1 : 0;
    f.snow = s < 2.85 ? 0 : s < 3.1 ? ramp(s, 2.85, 3.1) : s < 3.5 ? 1 : s < 3.8 ? 1 - ramp(s, 3.5, 3.8) : 0;
    f.leafFall = T.clamp(1 - Math.abs(s - 2.45) / 0.5);
    f.petalFall = T.clamp(1 - cd(s, 0.25) / 0.45);
    f.flowers = T.clamp(1 - cd(s, 0.6) / 1.1);   /* wild flowers in the grass, spring into summer */
    f.fruit = s > 1.2 && s < 2.6 ? 1 : 0;        /* apples, late summer into autumn */
    return f;
  }
  /* each season keeps its colours for a while about its middle, and turns into the next between:
     { i, j, k } = this season, the next, and how far into the next */
  const MID = [NAMES.spring, NAMES.summer, NAMES.autumn, NAMES.winter], PH = { i: 0, j: 1, k: 0 };
  function phase(s) {
    const x = s < MID[0] ? s + 4 : s;
    let i = 3;
    for (let n = 0; n < 3; n++) if (x < MID[n + 1]) { i = n; break; }
    const a = MID[i], b = i === 3 ? MID[0] + 4 : MID[i + 1];
    PH.i = i; PH.j = (i + 1) % 4; PH.k = q64(T.smooth(((x - a) / (b - a) - 0.3) / 0.45));
    return PH;
  }
  function colours(s, snow) {
    const c = SZ.c, ph = phase(s), i = ph.i, j = ph.j, k = ph.k;
    for (const key in PAL) { const a = PAL[key]; c[key] = k <= 0 ? a[i] : k >= 1 ? a[j] : T.mix(a[i], a[j], k); }
    if (snow > 0.01) {
      const sn = q64(snow);
      c.h3 = T.mix(c.h3, SNOW, sn * 0.86); c.h3s = T.mix(c.h3s, SNOW_S, sn * 0.75);
      c.h2 = T.mix(c.h2, SNOW, sn * 0.8); c.h2s = T.mix(c.h2s, SNOW_S, sn * 0.7);
      c.h1 = T.mix(c.h1, SNOW, sn * 0.6); c.h1s = T.mix(c.h1s, SNOW_S, sn * 0.5);
    }
    return c;
  }
  let szT = -1, szCur = null;
  T.season = {
    NAMES, PAL, TURN, BLOSSOM, phase,
    /* a season as a number on 0..4 from a number or a name ('spring', 'late autumn', …), or null */
    value(v) {
      if (v == null || v === '') return null;
      if (typeof v === 'number') return isFinite(v) ? wrap4(v) : null;
      const k = String(v).toLowerCase().replace(/[-_]/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim();
      return NAMES[k] != null ? NAMES[k] : null;
    },
    /* the hill's season this frame (turning round with the year card while one is up), or null where it has none */
    at(S) {
      S = S || (T.director && T.director.cur);
      const ps = S && S.ps;
      if (!ps) return null;
      const base = T.season.value(ps.season), y = S.yr, sw = S.seasonSweep;
      if (base == null) { if (y) { y.sp = null; y.veil = null; } return null; }
      let s = base;
      if (sw && y && y.a > 0.001 && y.to > y.from) s = sw.s0 + sw.D * T.clamp((y.n - y.from) / (y.to - y.from));   /* y.n is eased already */
      if (y) { y.sp = sw && y.a > 0.001 ? wrap4(s) / 4 : null; y.veil = sw && !S.view ? 0.4 : null; }
      return wrap4(s);
    },
    /* everything the world needs to paint this season, worked out once a frame: { s, f: features, c: colours } or null */
    paint(S) {
      S = S || (T.director && T.director.cur);
      if (szT === T.time && szCur === S) return SZ.s == null ? null : SZ;
      szT = T.time; szCur = S;
      const s = T.season.at(S);
      SZ.s = s;
      if (s == null) return null;
      const f = features(s);
      colours(s, f.snow);
      SZ.quiet = !!(S && S.yr && S.yr.a > 0.05);   /* the year card has its own falling petals and leaves */
      return SZ;
    },
    /* this tree's leaf colour in this season (c: its summer colour, seed: which way it turns) */
    leaf(c, seed, sz) {
      const f = sz.f;
      let col = c;
      if (f.fresh > 0.01) col = T.mix(col, '#a8d88c', q64(0.38 * f.fresh));
      if (f.turn > 0.01) col = T.mix(col, TURN[Math.abs(Math.round(seed)) % TURN.length], q64(f.turn * 0.92));
      if (f.snow > 0.01 && f.leaves > 0.01) col = T.mix(col, '#8a9a90', q64(f.snow * 0.5));   /* the evergreens, dulled */
      return col;
    },
  };

  /* ---------- the stage: X.season, and seasons under the year card ---------- */
  const stage0 = T.stage;
  T.stage = function (name, def) {
    const S = stage0(name, def), X = S && S.X;
    if (!X) return S;
    const years0 = X.years;
    /* o.season: the season the years land on (a name or 0..4); without it they come round to the one they started in */
    X.years = function (from, to, o) {
      const ps = S.ps, span = to - from, want = T.season.value(o && o.season);
      let s0 = ps ? T.season.value(ps.season) : null;
      if (!ps || span <= 0 || (s0 == null && want == null)) return years0.call(this, from, to, o);
      if (s0 == null) { s0 = want; ps.season = want; }
      const tgt = want == null ? s0 : want, d = wrap4(tgt - s0);
      S.seasonSweep = { s0, D: 4 * (Math.min(Math.max(1, Math.round(span)), 3) - 1) + (d < 0.02 ? 4 : d) };
      const done = () => { ps.season = tgt; S.seasonSweep = null; if (S.yr) { S.yr.sp = null; S.yr.veil = null; } };
      return years0.call(this, from, to, o).then((r) => { done(); return r; }, (e) => { done(); throw e; });
    };
    /* the hill's season: X.season('winter') at once, or X.season('spring', 4) turning forward over four seconds */
    X.season = function (v, dur) {
      const ps = S.ps, s = T.season.value(v);
      if (!ps || s == null) return Promise.resolve();
      const s0 = T.season.value(ps.season);
      if (!dur || s0 == null) { ps.season = s; return Promise.resolve(); }
      ps.season = s0;
      return S.clock.tween(ps, 'season', s0 + wrap4(s - s0), dur, T.ease.io).then(() => { ps.season = s; });
    };
    return S;
  };

  /* ---------- figures in the light of the place ----------
     Each figure is drawn on a sheet of its own, given its lit side and its shadow side in the colours of the
     place it is in, with the light coming from where that place's light is, and laid on the picture. */
  let sheet = null;
  function inLight(g, o, draw, bx0, by0, bx1, by1, cx, cy, R) {
    const m = g.getTransform();
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (let i = 0; i < 4; i++) {
      const x = i & 1 ? bx1 : bx0, y = i & 2 ? by1 : by0, px = m.a * x + m.c * y + m.e, py = m.b * x + m.d * y + m.f;
      if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
    }
    const rx = Math.floor(x0), ry = Math.floor(y0), rw = Math.ceil(x1) - rx, rh = Math.ceil(y1) - ry;
    if (rw <= 0 || rh <= 0 || rw * rh > 6e6) return draw(g, o);
    if (!sheet) sheet = document.createElement('canvas');
    if (sheet.width < rw || sheet.height < rh) { sheet.width = Math.max(sheet.width, rw); sheet.height = Math.max(sheet.height, rh); }
    const sg = sheet.getContext('2d');
    sg.setTransform(1, 0, 0, 1, 0, 0); sg.globalAlpha = 1; sg.globalCompositeOperation = 'source-over'; sg.clearRect(0, 0, rw, rh);
    sg.setTransform(m.a, m.b, m.c, m.d, m.e - rx, m.f - ry);
    const fl = o.flatLook;
    o.flatLook = true;
    let j;
    try { j = draw(sg, o); } finally { o.flatLook = fl; }
    const L = T.look.now(), d = T.look.dir(L), dl = Math.hypot(d[0], d[1]) || 1, dx = d[0] / dl, dy = d[1] / dl;
    sg.globalCompositeOperation = 'source-atop';
    const gr = sg.createLinearGradient(cx + dx * R, cy + dy * R, cx - dx * R, cy - dy * R);
    gr.addColorStop(0, T.rgba(L.lit, L.litA)); gr.addColorStop(0.42, T.rgba(L.lit, 0)); gr.addColorStop(0.58, T.rgba(L.shade, 0)); gr.addColorStop(1, T.rgba(L.shade, L.shadeA));
    sg.fillStyle = gr; sg.fillRect(bx0, by0, bx1 - bx0, by1 - by0);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(sheet, 0, 0, rw, rh, rx, ry, rw, rh); g.restore();
    return j;
  }
  const painted = (g, o) => T.artOn && T.artOn() && !T.artLite && g.getTransform && g.canvas === T.canvas && !o.flatLook;
  const person0 = F.person;
  F.person = function (g, o) {
    if (!painted(g, o)) return person0(g, o);
    const s = o.s || 150;
    return inLight(g, o, person0, o.x - s * 0.85, o.y - s * 0.9, o.x + s * 0.85, o.y + s * 0.62, o.x, o.y - s * 0.35, s * 0.8);
  };
  /* Bean sits in the same light (not his shadow in the lake, nor a white silhouette) */
  const dog0 = F.dog;
  F.dog = function (g, o) {
    if (!painted(g, o) || o.tintAll || o.shadow) return dog0(g, o);
    const u = ((o.s || 240) / 100) * (F.dogScale || 0.82);
    return inLight(g, o, dog0, o.x - 30 * u, o.y - 46 * u, o.x + 30 * u, o.y + 6 * u, o.x, o.y - 18 * u, 26 * u);
  };
})();
