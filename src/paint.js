/* Take Your Time — paint: hand-cut shapes, gouache washes, chalk, crayon, grain, lettering. */
(function () {
  'use strict';
  const T = window.TYT;
  const P = (T.P = {});
  const TAU = Math.PI * 2;

  /* ---------- paths ---------- */
  P.poly = function (pts, closed = true) {
    const p = new Path2D();
    pts.forEach((q, i) => (i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])));
    if (closed) p.closePath();
    return p;
  };
  /* subdivide a polyline and nudge the new points sideways: the wobble of a hand-cut edge */
  P.wobPts = function (pts, amp = 1, seg = 34, seed = 1, closed = false) {
    const out = [];
    const n = pts.length, m = closed ? n : n - 1;
    let k = 0;
    for (let i = 0; i < m; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const len = Math.hypot(dx, dy) || 1;
      const steps = Math.max(1, Math.round(len / seg));
      const nx = -dy / len, ny = dx / len;
      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        const w = s === 0 ? 0 : T.noise(k * 0.9, seed) * amp;
        out.push([a[0] + dx * t + nx * w, a[1] + dy * t + ny * w]);
        k++;
      }
    }
    if (!closed) out.push(pts[n - 1].slice());
    return out;
  };
  P.rough = function (pts, amp = 1, seed = 1, seg = 34) { return P.poly(P.wobPts(pts, amp, seg, seed, true), true); };
  P.box = function (x, y, w, h, amp = 1, seed = 1) { return P.rough([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], amp, seed); };
  /* smooth blob through the midpoints of its control polygon */
  P.softPts = function (g, pts, closed = true) {
    const n = pts.length;
    if (closed) {
      const m0 = [(pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2];
      g.moveTo(m0[0], m0[1]);
      for (let i = 0; i < n; i++) {
        const a = pts[i], b = pts[(i + 1) % n];
        g.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
      }
      g.closePath();
    } else {
      g.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < n - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        g.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
      }
      g.lineTo(pts[n - 1][0], pts[n - 1][1]);
    }
  };
  P.soft = function (pts, closed = true) { const p = new Path2D(); P.softPts(p, pts, closed); return p; };
  P.rr = function (x, y, w, h, r) {
    const p = new Path2D();
    r = Math.min(r, w / 2, h / 2);
    p.moveTo(x + r, y); p.lineTo(x + w - r, y); p.quadraticCurveTo(x + w, y, x + w, y + r);
    p.lineTo(x + w, y + h - r); p.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    p.lineTo(x + r, y + h); p.quadraticCurveTo(x, y + h, x, y + h - r);
    p.lineTo(x, y + r); p.quadraticCurveTo(x, y, x + r, y); p.closePath();
    return p;
  };
  P.circle = function (x, y, r) { const p = new Path2D(); p.arc(x, y, r, 0, TAU); return p; };
  P.ellipse = function (x, y, rx, ry, rot = 0) { const p = new Path2D(); p.ellipse(x, y, rx, ry, rot, 0, TAU); return p; };

  /* polyline length helpers, used to draw a line "as it is being drawn" */
  P.len = function (pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; };
  P.trim = function (pts, k) {
    if (k >= 1) return pts;
    if (k <= 0) return [pts[0]];
    const want = P.len(pts) * k;
    const out = [pts[0]];
    let L = 0;
    for (let i = 1; i < pts.length; i++) {
      const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (L + d >= want) {
        const t = (want - L) / (d || 1);
        out.push([T.lerp(pts[i - 1][0], pts[i][0], t), T.lerp(pts[i - 1][1], pts[i][1], t)]);
        return out;
      }
      out.push(pts[i]); L += d;
    }
    return out;
  };

  /* ---------- fills ---------- */
  P.fill = function (g, path, color, alpha) {
    if (alpha != null) g.globalAlpha = alpha;
    g.fillStyle = color; g.fill(path);
    if (alpha != null) g.globalAlpha = 1;
  };
  /* flat colour plus dry-brush streaks, the way gouache dries unevenly. bbox = [x, y, w, h] */
  P.wash = function (g, path, color, bbox, o = {}) {
    const r = T.rng(o.seed || 7);
    const n = o.n == null ? Math.round((bbox[2] * bbox[3]) / 5200) + 6 : o.n;
    const tone = o.tone == null ? 0.07 : o.tone;
    const dir = o.dir || 0;
    g.save();
    g.fillStyle = color; g.fill(path);
    g.clip(path);
    g.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const x = bbox[0] + r() * bbox[2], y = bbox[1] + r() * bbox[3];
      const len = (o.len || 150) * (0.4 + r());
      const a = dir + (r() - 0.5) * (o.spread == null ? 0.35 : o.spread);
      g.strokeStyle = T.shade(color, (r() - 0.5) * 2 * tone);
      g.globalAlpha = 0.22 + r() * 0.3;
      g.lineWidth = (o.wid || 22) * (0.4 + r());
      g.beginPath();
      g.moveTo(x - Math.cos(a) * len / 2, y - Math.sin(a) * len / 2);
      g.quadraticCurveTo(x + (r() - 0.5) * 20, y + (r() - 0.5) * 20, x + Math.cos(a) * len / 2, y + Math.sin(a) * len / 2);
      g.stroke();
    }
    g.restore();
  };
  /* a gradient laid over a shape, clipped to it */
  P.tint = function (g, path, x0, y0, x1, y1, stops, op) {
    g.save();
    g.clip(path);
    if (op) g.globalCompositeOperation = op;
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    stops.forEach((s) => gr.addColorStop(s[0], s[1]));
    g.fillStyle = gr;
    g.fillRect(-4000, -2000, 8000, 5000);
    g.restore();
  };
  P.glow = function (g, x, y, r, color, alpha = 1, op = 'screen') {
    if (alpha <= 0.002 || r <= 0) return;
    g.save();
    g.globalCompositeOperation = op;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, T.rgba(color, alpha));
    gr.addColorStop(0.45, T.rgba(color, alpha * 0.42));
    gr.addColorStop(1, T.rgba(color, 0));
    g.fillStyle = gr;
    g.fillRect(x - r, y - r, r * 2, r * 2);
    g.restore();
  };
  P.line = function (g, x0, y0, x1, y1, w, color) {
    g.strokeStyle = color; g.lineWidth = w; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  };
  P.strokePts = function (g, pts, w, color, smooth) {
    if (pts.length < 2) return;
    g.strokeStyle = color; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath();
    if (smooth && pts.length > 2) P.softPts(g, pts, false);
    else pts.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])));
    g.stroke();
  };

  /* ---------- chalk and crayon ---------- */
  /* chalk on a dark wall: a soft body, a brighter core and a broken, dusty edge */
  P.chalk = function (g, pts, k, color = '#f6efe0', w = 3, seed = 1) {
    const q = P.trim(pts, k);
    if (q.length < 2) return;
    g.save();
    g.globalAlpha *= 0.3; P.strokePts(g, q, w * 2.1, color);
    g.globalAlpha /= 0.3; g.globalAlpha *= 0.8; P.strokePts(g, q, w, color);
    g.globalAlpha /= 0.8; g.globalAlpha *= 0.5;
    g.setLineDash([1.5 + (seed % 3), 3.5]);
    g.lineDashOffset = seed * 7;
    P.strokePts(g, q.map((p, i) => [p[0] + T.noise(i * 1.3, seed) * 1.2, p[1] + T.noise(i * 1.7, seed + 5) * 1.2]), w * 1.5, color);
    g.restore();
  };
  /* wax crayon on drawing paper: a few overlapping passes that never quite cover */
  P.crayon = function (g, pts, color, w = 6, seed = 1, k = 1) {
    const q = P.trim(pts, k);
    if (q.length < 2) return;
    g.save();
    g.globalCompositeOperation = 'multiply';
    for (let pass = 0; pass < 3; pass++) {
      g.globalAlpha = [0.55, 0.4, 0.35][pass];
      const j = [0, 1.3, 1.9][pass];
      P.strokePts(g, q.map((p, i) => [p[0] + T.noise(i * 0.8 + pass * 13, seed) * j, p[1] + T.noise(i * 0.8 + pass * 29, seed + 3) * j]), w * [1, 0.72, 0.5][pass], color, true);
    }
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 0.3;
    g.setLineDash([1, 4.5]);
    g.lineDashOffset = seed * 3;
    P.strokePts(g, q, w * 0.9, '#fffdf6', true);
    g.restore();
  };
  /* scribbled crayon fill: zig-zag hatching clipped to a shape. bbox = [x, y, w, h] */
  P.scribble = function (g, path, bbox, color, o = {}) {
    const r = T.rng(o.seed || 3);
    const gap = o.gap || 9, w = o.w || 7, ang = o.ang == null ? -0.5 : o.ang;
    const cx = bbox[0] + bbox[2] / 2, cy = bbox[1] + bbox[3] / 2;
    const R = Math.hypot(bbox[2], bbox[3]) / 2 + 10;
    const pts = [];
    let side = 1;
    for (let d = -R; d <= R; d += gap) {
      const jx = (r() - 0.5) * gap * 0.8, jl = r() * 12;
      const ox = Math.cos(ang + Math.PI / 2) * (d + jx), oy = Math.sin(ang + Math.PI / 2) * (d + jx);
      pts.push([cx + ox + Math.cos(ang) * (R - jl) * side, cy + oy + Math.sin(ang) * (R - jl) * side]);
      side = -side;
    }
    g.save();
    g.clip(path);
    P.crayon(g, pts, color, w, o.seed || 3, o.k == null ? 1 : o.k);
    g.restore();
  };

  /* ---------- lettering ---------- */
  const FONT = {
    hand: '"TYT Hand", "Nanum Pen Script", cursive',
    serif: '"TYT Batang", "Gowun Batang", "Noto Serif KR", serif',
  };
  P.font = (kind, size) => size + 'px ' + FONT[kind];
  const layCache = new Map();
  P.clearLayout = () => layCache.clear();
  function layout(g, str, kind, size, lh, track) {
    const key = kind + '|' + size + '|' + lh + '|' + track + '|' + str;
    let L = layCache.get(key);
    if (L) return L;
    g.font = P.font(kind, size);
    const lines = str.split('\n');
    L = { chars: [], w: 0, h: lines.length * size * lh, n: 0 };
    lines.forEach((ln, li) => {
      const arr = Array.from(ln);
      const lw = g.measureText(ln).width + Math.max(0, arr.length - 1) * track;
      L.w = Math.max(L.w, lw);
      let acc = '';
      arr.forEach((ch, ci) => {
        const x = g.measureText(acc).width + ci * track;
        acc += ch;
        if (ch.trim()) L.chars.push({ ch, x, lw, line: li, i: L.n });
        L.n++;
      });
      L.n += 2; /* a breath at each line end */
    });
    if (layCache.size > 400) layCache.clear();
    layCache.set(key, L);
    return L;
  }
  /* Draw text that can appear a character at a time.
     o: { font:'hand'|'serif', size, color, k (0..1 reveal, default 1), align, lh, alpha, seed, glow } */
  P.text = function (g, str, x, y, o = {}) {
    const kind = o.font || 'hand', size = o.size || 48;
    const lh = o.lh || (kind === 'hand' ? 1.12 : 1.5);
    const L = layout(g, str, kind, size, lh, o.track || 0);
    const k = o.k == null ? 1 : o.k;
    const shown = k * (L.n + 1);
    const baseA = o.alpha == null ? 1 : o.alpha;
    if (baseA <= 0.003) return L;
    const seed = o.seed || 1;
    const align = o.align || 'center';
    g.save();
    g.font = P.font(kind, size);
    g.textBaseline = 'alphabetic';
    g.textAlign = 'left';
    g.fillStyle = o.color || '#2a2f3a';
    for (const c of L.chars) {
      const a = T.clamp(shown - c.i);
      if (a <= 0) break;
      const ox = align === 'center' ? -c.lw / 2 : align === 'right' ? -c.lw : 0;
      const cx = x + ox + c.x, cy = y + c.line * size * lh;
      g.globalAlpha = baseA * a;
      if (kind === 'hand') {
        const rot = T.noise(c.i * 2.3, seed) * 0.035;
        const dy = T.noise(c.i * 1.7, seed + 9) * size * 0.035 + (1 - a) * size * 0.06;
        g.save(); g.translate(cx, cy + dy); g.rotate(rot);
        if (o.glow) { g.shadowColor = o.glow; g.shadowBlur = size * 0.5; }
        g.fillText(c.ch, 0, 0);
        g.restore();
      } else {
        if (o.glow) { g.shadowColor = o.glow; g.shadowBlur = size * 0.6; }
        g.fillText(c.ch, cx, cy + (1 - a) * 4);
      }
    }
    g.restore();
    return L;
  };
  P.count = function (str) { return Array.from(str).length + str.split('\n').length * 2; };

  /* ---------- finishing: paper grain and vignette over every frame ---------- */
  let grainTile = null, grainGen = -1, grainPat = null;
  function makeGrain() {
    const n = 256;
    const c = document.createElement('canvas');
    c.width = c.height = n;
    const g = c.getContext('2d');
    const im = g.createImageData(n, n);
    const r = T.rng(1234);
    /* a little low-frequency mottle under the fine grain, like the tooth of paper */
    const coarse = new Float32Array(33 * 33);
    for (let i = 0; i < coarse.length; i++) coarse[i] = r();
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const fx = (x / n) * 32, fy = (y / n) * 32;
        const ix = Math.floor(fx), iy = Math.floor(fy), ux = fx - ix, uy = fy - iy;
        const a = coarse[iy * 33 + ix], b = coarse[iy * 33 + ((ix + 1) % 32)];
        const d = coarse[((iy + 1) % 32) * 33 + ix], e = coarse[((iy + 1) % 32) * 33 + ((ix + 1) % 32)];
        const low = (a * (1 - ux) + b * ux) * (1 - uy) + (d * (1 - ux) + e * ux) * uy;
        const v = 128 + (r() - 0.5) * 120 + (low - 0.5) * 60;
        const o = (y * n + x) * 4;
        im.data[o] = im.data[o + 1] = im.data[o + 2] = v;
        im.data[o + 3] = 255;
      }
    }
    g.putImageData(im, 0, 0);
    return c;
  }
  P.grainAmt = 0.16;
  P.vignette = 0.5;
  P.vignetteColor = '#0e1420';
  /* ---------- a trial look for Welcome Harbor: wax crayon on warm paper ---------- */
  /* P.look says which look is chosen; P.cray is true only while the harbour's world is being painted.
     A context that has been "crayonized" then lays every flat fill down as crayon: streaky, the layer
     beneath showing through the tooth of the paper, with a soft drawn line round each shape. */
  P.look = 'plain';
  P.cray = false;
  let toothTile = null, paperPat = null, helper = null;
  const pats = new Map();
  const N = 128;
  const hctx = () => helper || (helper = document.createElement('canvas').getContext('2d'));
  function tooth() {
    if (toothTile) return toothTile;
    const c = document.createElement('canvas'); c.width = c.height = N;
    const g = c.getContext('2d'), r = T.rng(77);
    g.lineCap = 'round';
    for (let i = 0; i < 150; i++) {
      const x = r() * N, y = r() * N, a = -0.62 + (r() - 0.5) * 0.5, len = 10 + r() * 46, w = 0.6 + r() * 1.7;
      g.strokeStyle = 'rgba(0,0,0,' + (0.16 + r() * 0.5) + ')'; g.lineWidth = w;
      for (let ox = -N; ox <= N; ox += N) for (let oy = -N; oy <= N; oy += N) { g.beginPath(); g.moveTo(x + ox, y + oy); g.lineTo(x + ox + Math.cos(a) * len, y + oy + Math.sin(a) * len); g.stroke(); }
    }
    for (let i = 0; i < 260; i++) { g.fillStyle = 'rgba(0,0,0,' + (0.2 + r() * 0.5) + ')'; g.fillRect(r() * N, r() * N, 1 + r() * 1.4, 1 + r() * 1.4); }
    return (toothTile = c);
  }
  /* '#rrggbb' or 'rgb(a)(…)' -> { pat, a, edge }, or null for anything else */
  P.crayonPat = function (color) {
    let R, G, B, A = 1, m;
    if (color[0] === '#' && color.length === 7) { const v = parseInt(color.slice(1), 16); R = v >> 16; G = (v >> 8) & 255; B = v & 255; }
    else if ((m = /^rgba?\(([^)]+)\)/.exec(color))) { const q = m[1].split(',').map(Number); R = q[0]; G = q[1]; B = q[2]; A = q[3] == null ? 1 : q[3]; }
    else return null;
    R &= 248; G &= 248; B &= 248;   /* near colours share a stick of crayon */
    const key = (R << 16) | (G << 8) | B;
    let p = pats.get(key);
    if (!p) {
      if (pats.size > 320) pats.clear();
      const c = document.createElement('canvas'); c.width = c.height = N;
      const g = c.getContext('2d');
      g.fillStyle = 'rgb(' + R + ',' + G + ',' + B + ')'; g.fillRect(0, 0, N, N);
      g.globalCompositeOperation = 'destination-out';
      const v = (R * 7 + G * 3 + B) >> 3 & 3;   /* each crayon is held at its own angle */
      g.translate(N / 2, N / 2); if (v & 1) g.scale(-1, 1); if (v & 2) g.rotate(Math.PI / 2); g.translate(-N / 2, -N / 2);
      g.drawImage(tooth(), 0, 0);
      /* under: the same colour rubbed thin, so a shape stays solid where the crayon skipped */
      p = { pat: hctx().createPattern(c, 'repeat'), edge: 'rgb(' + Math.round(R * 0.66) + ',' + Math.round(G * 0.62) + ',' + Math.round(B * 0.68) + ')', under: 'rgb(' + Math.round(R * 0.58 + 104) + ',' + Math.round(G * 0.58 + 100) + ',' + Math.round(B * 0.58 + 92) + ')' };
      pats.set(key, p);
    }
    return { pat: p.pat, edge: p.edge, under: p.under, a: A };
  };
  P.paper = function () {
    if (paperPat) return paperPat;
    const c = document.createElement('canvas'); c.width = c.height = N;
    const g = c.getContext('2d'), r = T.rng(31);
    g.fillStyle = '#f7eddb'; g.fillRect(0, 0, N, N);
    for (let i = 0; i < 900; i++) { g.fillStyle = r() < 0.5 ? 'rgba(120,96,70,' + (0.03 + r() * 0.07) + ')' : 'rgba(255,255,255,' + (0.1 + r() * 0.3) + ')'; g.fillRect(r() * N, r() * N, 1 + r() * 2, 1 + r() * 2); }
    g.strokeStyle = 'rgba(150,120,90,0.1)'; g.lineWidth = 0.7;
    for (let i = 0; i < 26; i++) { const x = r() * N, y = r() * N, a = r() * 6.3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 14, y + Math.sin(a) * 14); g.stroke(); }
    return (paperPat = hctx().createPattern(c, 'repeat'));
  };
  P.crayonize = function (g) {
    if (g._cray) return;
    g._cray = true;
    const fill = g.fill, stroke = g.stroke;
    g.fill = function (a) {
      const fs = this.fillStyle;
      const q = P.cray && typeof fs === 'string' ? P.crayonPat(fs) : null;
      if (!q) return fill.apply(this, arguments);
      const ga = this.globalAlpha;
      this.globalAlpha = ga * q.a;
      this.fillStyle = q.under; fill.apply(this, arguments);
      this.fillStyle = q.pat; fill.apply(this, arguments);
      if (!P.noEdge) {
        const ss = this.strokeStyle, lw = this.lineWidth, lj = this.lineJoin;
        this.strokeStyle = q.edge; this.lineWidth = 1.5; this.lineJoin = 'round'; this.globalAlpha = ga * q.a * 0.5;
        if (a && typeof a === 'object') stroke.call(this, a); else stroke.call(this);
        this.strokeStyle = ss; this.lineWidth = lw; this.lineJoin = lj;
      }
      this.globalAlpha = ga; this.fillStyle = fs;
    };
  };

  P.finish = function (g) {
    const V = T.view;
    if (P.vignette > 0.01) {
      const gr = g.createRadialGradient(0, 450, 300, 0, 450, Math.hypot(V.W / 2, 450) * 1.05);
      gr.addColorStop(0, T.rgba(P.vignetteColor, 0));
      gr.addColorStop(1, T.rgba(P.vignetteColor, P.vignette));
      g.fillStyle = gr;
      g.fillRect(-V.W / 2, 0, V.W, V.H);
    }
    if (P.grainAmt > 0.01) {
      if (!grainTile) grainTile = makeGrain();
      if (grainGen !== T.gen) {
        /* scale the grain with the backing store so it keeps the same apparent size */
        const s = Math.max(1, V.ps);
        const c = document.createElement('canvas');
        c.width = c.height = Math.round(256 * s);
        c.getContext('2d').drawImage(grainTile, 0, 0, c.width, c.height);
        grainPat = g.createPattern(c, 'repeat');
        grainGen = T.gen;
      }
      g.save();
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = 'overlay';
      g.globalAlpha = P.grainAmt;
      g.fillStyle = grainPat;
      g.fillRect(0, 0, T.canvas.width, T.canvas.height);
      g.restore();
    }
  };

  /* ---------- small shared bits ---------- */
  /* the soft pulsing ring that says "you can touch this" */
  P.beacon = function (g, x, y, r, t, alpha = 1, color = '#ffe2a8') {
    if (alpha <= 0.01) return;
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.2);
    P.glow(g, x, y, r * (1.5 + pulse * 0.35), color, 0.34 * alpha);
    g.save();
    g.globalCompositeOperation = 'screen';
    g.strokeStyle = T.rgba(color, (0.5 + 0.3 * pulse) * alpha);
    g.lineWidth = 2;
    g.setLineDash([3, 7]);
    g.lineDashOffset = -t * 9;
    g.beginPath(); g.arc(x, y, r * (0.74 + 0.07 * pulse), 0, TAU); g.stroke();
    g.restore();
  };
  /* a ghost fingertip that shows a gesture: pts is the path, u is 0..1 along it */
  P.fingerHint = function (g, pts, u, alpha = 1, color = '#fff6e0') {
    if (alpha <= 0.01) return;
    const q = P.trim(pts, T.clamp(u));
    const p = q[q.length - 1];
    const fade = Math.sin(T.clamp(u) * Math.PI);
    g.save();
    g.globalAlpha = alpha * fade * 0.55;
    g.setLineDash([2, 9]);
    P.strokePts(g, q, 3, color, true);
    g.setLineDash([]);
    g.globalAlpha = alpha * fade * 0.85;
    g.fillStyle = color;
    g.beginPath(); g.arc(p[0], p[1], 11, 0, TAU); g.fill();
    g.globalAlpha = alpha * fade * 0.35;
    g.beginPath(); g.arc(p[0], p[1], 19, 0, TAU); g.fill();
    g.restore();
  };
  /* torn-edge picture frame: memories sit on warm paper, the present fills the glass */
  P.paperFrame = function (seed, inset = 46) {
    const V = T.view;
    const x0 = -V.W / 2 + inset, x1 = V.W / 2 - inset, y0 = inset * 0.8, y1 = V.H - inset * 0.8;
    const pts = [];
    const r = T.rng(seed);
    const edge = (ax, ay, bx, by) => {
      const len = Math.hypot(bx - ax, by - ay), steps = Math.round(len / 26);
      const nx = -(by - ay) / len, ny = (bx - ax) / len;
      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        const w = T.noise(pts.length * 0.31, seed) * 7 + (r() - 0.5) * 3;
        pts.push([ax + (bx - ax) * t + nx * w, ay + (by - ay) * t + ny * w]);
      }
    };
    edge(x0, y0, x1, y0); edge(x1, y0, x1, y1); edge(x1, y1, x0, y1); edge(x0, y1, x0, y0);
    const p = new Path2D();
    p.rect(-V.W / 2 - 50, -50, V.W + 100, V.H + 100);
    const hole = new Path2D();
    P.softPts(hole, pts, true);
    p.addPath(hole);
    return { path: p, hole, box: [x0, y0, x1 - x0, y1 - y0] };
  };
  P.drawFrame = function (g, frame, color = '#f3ead8') {
    g.save();
    g.fillStyle = color;
    g.fill(frame.path, 'evenodd');
    g.strokeStyle = T.rgba('#6b5a48', 0.1);
    g.lineWidth = 2;
    g.stroke(frame.hole);
    g.restore();
  };
})();
