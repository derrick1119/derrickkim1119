/* Take Your Time — core: maths, viewport, clock, input, scene director.
   Everything hangs off one global, TYT, so the game runs from file:// with plain <script> tags. */
(function () {
  'use strict';
  const T = (window.TYT = {});

  /* ---------- maths ---------- */
  T.clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  T.lerp = (a, b, t) => a + (b - a) * t;
  T.unlerp = (a, b, v) => T.clamp((v - a) / (b - a));
  T.smooth = (t) => { t = T.clamp(t); return t * t * (3 - 2 * t); };
  T.ease = {
    lin: (t) => t,
    in: (t) => t * t,
    out: (t) => 1 - (1 - t) * (1 - t),
    io: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    out3: (t) => 1 - Math.pow(1 - t, 3),
    io3: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    back: (t) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  };
  T.rng = function (seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  /* smooth 1-D value noise in [-1, 1] */
  T.noise = function (x, seed = 0) {
    const i = Math.floor(x), f = x - i;
    const h = (n) => { const t = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453; return t - Math.floor(t); };
    const u = f * f * (3 - 2 * f);
    return (h(i) * (1 - u) + h(i + 1) * u) * 2 - 1;
  };

  /* ---------- colour ---------- */
  const hexCache = new Map();
  T.hex = function (h) {
    let v = hexCache.get(h);
    if (v) return v;
    let s = h.replace('#', '');
    if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
    const n = parseInt(s, 16);
    v = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    hexCache.set(h, v);
    return v;
  };
  const h2 = (n) => { const s = Math.round(T.clamp(n, 0, 255)).toString(16); return s.length < 2 ? '0' + s : s; };
  T.mix = function (a, b, t) {
    const A = T.hex(a), B = T.hex(b);
    return '#' + h2(A[0] + (B[0] - A[0]) * t) + h2(A[1] + (B[1] - A[1]) * t) + h2(A[2] + (B[2] - A[2]) * t);
  };
  T.rgba = function (h, a) { const c = T.hex(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; };
  T.shade = (h, amt) => (amt >= 0 ? T.mix(h, '#ffffff', amt) : T.mix(h, '#000000', -amt));
  /* piecewise blend through a list of colours, t in [0, n-1] */
  T.ramp = function (list, t) {
    const n = list.length - 1;
    t = T.clamp(t, 0, n);
    const i = Math.min(n - 1, Math.floor(t));
    return T.mix(list[i], list[i + 1], t - i);
  };
  T.rampNum = function (list, t) {
    const n = list.length - 1;
    t = T.clamp(t, 0, n);
    const i = Math.min(n - 1, Math.floor(t));
    return T.lerp(list[i], list[i + 1], t - i);
  };

  /* ---------- viewport ----------
     Virtual stage: 900 units tall, x centred on 0. Width follows the window between 4:3 and 20:9,
     so scenes keep what matters inside x = -600..600 and let the backdrop run wider. */
  const canvas = document.getElementById('stage');
  const ctx = canvas.getContext('2d');
  const V = (T.view = { H: 900, W: 1600, fit: 1, ps: 1, left: 0, top: 0 });
  T.canvas = canvas;
  T.ctx = ctx;
  T.reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function resize() {
    const wrap = document.getElementById('wrap');
    const cw = Math.max(1, wrap.clientWidth), ch = Math.max(1, wrap.clientHeight);
    const a = T.clamp(cw / ch, 4 / 3, 20 / 9);
    V.W = Math.round(V.H * a);
    V.fit = Math.min(cw / V.W, ch / V.H);
    const dw = V.W * V.fit, dh = V.H * V.fit;
    V.left = (cw - dw) / 2;
    V.top = (ch - dh) / 2;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    V.ps = T.clamp(V.fit * dpr, 0.5, 2);
    canvas.width = Math.round(V.W * V.ps);
    canvas.height = Math.round(V.H * V.ps);
    canvas.style.width = dw + 'px';
    canvas.style.height = dh + 'px';
    canvas.style.left = V.left + 'px';
    canvas.style.top = V.top + 'px';
    const mute = document.getElementById('mute');
    if (mute) { mute.style.right = Math.max(10, V.left + 12) + 'px'; mute.style.top = Math.max(10, V.top + 12) + 'px'; }
    T.gen = (T.gen || 0) + 1; /* baked layers are stale after a resize */
    const cur = T.director && T.director.cur;
    if (cur && cur.build) cur.build();
  }
  T.resize = resize;

  /* Bake static art once into an offscreen layer covering a virtual rectangle. */
  T.bake = function (x0, y0, w, h, fn) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w * V.ps));
    c.height = Math.max(1, Math.ceil(h * V.ps));
    const g = c.getContext('2d');
    g.scale(V.ps, V.ps);
    g.translate(-x0, -y0);
    fn(g);
    return { c, x0, y0, w: c.width / V.ps, h: c.height / V.ps };
  };
  T.blit = function (g, L, dx = 0, dy = 0) { g.drawImage(L.c, L.x0 + dx, L.y0 + dy, L.w, L.h); };

  /* ---------- clock: game-time waits and tweens, awaitable ---------- */
  class Clock {
    constructor() { this.t = 0; this.waits = []; this.tweens = []; }
    clear() { this.waits.length = 0; this.tweens.length = 0; }
    wait(sec) { return new Promise((res) => this.waits.push({ at: this.t + sec, res })); }
    tween(obj, key, to, dur, ease) {
      for (let i = this.tweens.length - 1; i >= 0; i--) { /* a new tween on the same value replaces the old one */
        const w = this.tweens[i];
        if (w.obj === obj && w.key === key) this.tweens.splice(i, 1);
      }
      return new Promise((res) => this.tweens.push({ obj, key, from: obj[key], to, t0: this.t, dur: Math.max(1e-4, dur), ease: ease || T.ease.io, res }));
    }
    update(dt) {
      this.t += dt;
      for (let i = this.waits.length - 1; i >= 0; i--) {
        if (this.waits[i].at <= this.t) { const w = this.waits[i]; this.waits.splice(i, 1); w.res(); }
      }
      for (let i = this.tweens.length - 1; i >= 0; i--) {
        const w = this.tweens[i];
        const k = T.clamp((this.t - w.t0) / w.dur);
        w.obj[w.key] = w.from + (w.to - w.from) * w.ease(k);
        if (k >= 1) { this.tweens.splice(i, 1); w.res(); }
      }
    }
  }
  T.Clock = Clock;

  /* ---------- scenes + director ---------- */
  T.scenes = {};
  T.state = { done: { photo: false, book: false, drawing: false, leash: false }, count: 0, order: [], together: false };

  const D = (T.director = {
    cur: null,
    trans: null, /* { phase:'out'|'in', k, dur, x, y, color, to, args, style } */
    busy() { return !!this.trans; },
    start(name, args) {
      if (this.cur && this.cur.exit) this.cur.exit();
      const s = T.scenes[name];
      this.cur = s;
      s.clock = s.clock || new Clock();
      s.clock.clear();
      s.clock.t = 0;
      if (s.build) s.build();
      if (s.enter) s.enter(args || {});
      T.announce('');
    },
    /* opts: { x, y, color, out, in, style:'bloom'|'fade', args } */
    go(name, opts = {}) {
      if (this.trans) return;
      this.trans = {
        phase: 'out', k: 0, to: name, args: opts.args,
        x: opts.x || 0, y: opts.y == null ? 450 : opts.y,
        color: opts.color || '#f3ead8', style: opts.style || 'bloom',
        dOut: opts.out == null ? 1.1 : opts.out, dIn: opts.in == null ? 1.2 : opts.in,
        hold: opts.hold || 0,
      };
    },
    update(dt) {
      const tr = this.trans;
      if (tr) {
        if (tr.phase === 'out') {
          tr.k += dt / tr.dOut;
          if (tr.k >= 1) { tr.k = 1; tr.phase = 'hold'; tr.h = 0; this.start(tr.to, tr.args); }
        } else if (tr.phase === 'hold') {
          tr.h += dt;
          if (tr.h >= tr.hold) { tr.phase = 'in'; tr.k = 0; }
        } else {
          tr.k += dt / tr.dIn;
          if (tr.k >= 1) this.trans = null;
        }
      }
      if (this.cur) {
        this.cur.clock.update(dt);
        if (this.cur.update) this.cur.update(dt);
      }
    },
    draw(g) {
      if (this.cur) this.cur.draw(g);
      const tr = this.trans;
      if (!tr) return;
      const W = V.W;
      if (tr.phase === 'out') {
        const k = T.ease.io(tr.k);
        if (tr.style === 'fade') {
          g.globalAlpha = k; g.fillStyle = tr.color; g.fillRect(-W / 2, 0, W, V.H); g.globalAlpha = 1;
        } else {
          /* a soft, slightly uneven pool of paint opening from the touched thing */
          const far = Math.hypot(W / 2 + Math.abs(tr.x), Math.max(tr.y, V.H - tr.y)) + 80;
          const r = far * k;
          g.fillStyle = tr.color;
          for (let ring = 0; ring < 3; ring++) {
            g.globalAlpha = [0.35, 0.6, 1][ring];
            const rr = r * [1.12, 1.05, 0.97][ring];
            g.beginPath();
            const n = 40;
            for (let i = 0; i <= n; i++) {
              const a = (i / n) * Math.PI * 2;
              const w = 1 + 0.045 * T.noise(i * 0.55 + ring * 9, 3) + 0.03 * Math.sin(a * 3 + T.time * 0.8 + ring);
              const px = tr.x + Math.cos(a) * rr * w, py = tr.y + Math.sin(a) * rr * w;
              if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
            }
            g.closePath(); g.fill();
          }
          g.globalAlpha = 1;
        }
      } else {
        const a = tr.phase === 'hold' ? 1 : 1 - T.ease.io(tr.k);
        g.globalAlpha = a; g.fillStyle = tr.color; g.fillRect(-W / 2, 0, W, V.H); g.globalAlpha = 1;
      }
    },
  });

  /* ---------- screen-reader mirror of the on-canvas words ---------- */
  const live = document.getElementById('live');
  T.announce = function (text) { if (live && live.textContent !== text) live.textContent = text; };

  /* ---------- input ---------- */
  const ptr = (T.pointer = { x: 0, y: 0, down: false, id: null, seen: false });
  function toStage(e) {
    const r = canvas.getBoundingClientRect();
    return [(e.clientX - r.left) / V.fit - V.W / 2, (e.clientY - r.top) / V.fit];
  }
  function send(type, e) {
    const [x, y] = toStage(e);
    ptr.x = x; ptr.y = y; ptr.seen = true;
    if (D.trans && D.trans.phase !== 'in') return;
    const s = D.cur;
    if (s && s.pointer) s.pointer(type, x, y, e);
  }
  canvas.addEventListener('pointerdown', (e) => {
    if (ptr.id !== null && ptr.id !== e.pointerId) return;
    ptr.id = e.pointerId; ptr.down = true;
    try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* fine */ }
    if (T.audio) T.audio.unlock();
    send('down', e);
    e.preventDefault();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (ptr.id !== null && ptr.id !== e.pointerId) return;
    send('move', e);
  });
  const lift = (e) => {
    if (ptr.id !== e.pointerId) return;
    ptr.down = false; ptr.id = null;
    if (T.audio) T.audio.unlock(); /* touch only counts as a gesture once the finger lifts */
    send('up', e);
  };
  canvas.addEventListener('pointerup', lift);
  canvas.addEventListener('pointercancel', lift);
  canvas.addEventListener('click', () => { if (T.audio) T.audio.unlock(); });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('keydown', (e) => {
    if (e.target && e.target.id === 'mute') return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (T.audio) T.audio.unlock();
    if (e.key === 'm' || e.key === 'M') { if (T.audio) T.audio.toggleMute(); return; }
    if (D.trans && D.trans.phase !== 'in') return;
    const s = D.cur;
    if (s && s.key && s.key(e.key, e) !== false) {
      if ([' ', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault();
    }
  });
  T.cursor = function (c) { if (canvas.style.cursor !== c) canvas.style.cursor = c; };

  /* ---------- camera drift: a little parallax from the pointer, a little breathing ---------- */
  const cam = (T.cam = { px: 0, py: 0 });
  function updateCam(dt) {
    let tx = 0, ty = 0;
    if (ptr.seen && !T.reduceMotion) { tx = T.clamp(ptr.x / (V.W / 2), -1, 1); ty = T.clamp((ptr.y - 450) / 450, -1, 1); }
    const k = 1 - Math.exp(-dt * 2.2);
    cam.px += (tx - cam.px) * k;
    cam.py += (ty - cam.py) * k;
  }
  /* offset for a layer at a given depth (0 = glued to the glass, 1 = far) */
  T.par = function (depth) {
    if (T.reduceMotion) return [0, 0];
    const sway = Math.sin(T.time * 0.23) * 0.25;
    return [-(cam.px + sway) * depth * 14, -cam.py * depth * 6];
  };

  /* ---------- main loop ---------- */
  T.time = 0;
  let last = 0;
  T.speed = 1; /* test hook */
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0) * T.speed;
    last = now;
    T.step(dt);
    requestAnimationFrame(frame);
  }
  T.step = function (dt) {
    T.time += dt;
    updateCam(dt);
    D.update(dt);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#161d2a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(V.ps, 0, 0, V.ps, (V.W / 2) * V.ps, 0);
    D.draw(ctx);
    if (T.P && T.P.finish) T.P.finish(ctx);
  };
  T.run = function (first, args) {
    resize();
    window.addEventListener('resize', resize);
    D.start(first, args);
    requestAnimationFrame((now) => { last = now; requestAnimationFrame(frame); });
  };
})();
