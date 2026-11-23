// c3 — 부드러운 입체 점토풍 (soft 3D claymation diorama)
// Every object is painted as a flat albedo silhouette, then "inflated" in a tiny software shader:
// distance field -> dome height -> normals -> warm key light + cool sky fill + bounce + SSS + spec.

// ---------- utilities ----------
function mk(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0); return c; }
const LIN = new Float32Array(256); for (let i = 0; i < 256; i++) LIN[i] = Math.pow(i / 255, 2.2);
const GAM = new Uint8ClampedArray(4096); for (let i = 0; i < 4096; i++) GAM[i] = Math.round(Math.pow(i / 4095, 1 / 2.2) * 255);
function outv(v) { if (v > 0.82) v = 0.82 + 0.18 * (1 - Math.exp(-(v - 0.82) / 0.18)); return GAM[Math.max(0, Math.min(4095, (v * 4095) | 0))]; }
let NZ = null;
function initNoise(rand) { NZ = new Float32Array(256 * 256); for (let i = 0; i < NZ.length; i++) NZ[i] = rand(); }
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y); let xf = x - xi, yf = y - yi;
  xf = xf * xf * (3 - 2 * xf); yf = yf * yf * (3 - 2 * yf);
  const x0 = xi & 255, y0 = yi & 255, x1 = (xi + 1) & 255, y1 = (yi + 1) & 255;
  const a = NZ[y0 * 256 + x0], b = NZ[y0 * 256 + x1], c = NZ[y1 * 256 + x0], d = NZ[y1 * 256 + x1];
  return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
}
function fbm(x, y, o) { let s = 0, a = 0.5, f = 1, t = 0; for (let i = 0; i < o; i++) { s += a * vnoise(x * f + i * 17.3, y * f - i * 9.1); t += a; a *= 0.5; f *= 2.03; } return s / t; }
function boxBlur(src, W, H, r, passes) {
  const tmp = new Float32Array(W * H); let a = src;
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < H; y++) { let acc = 0; const o = y * W; for (let x = -r; x <= r; x++) acc += a[o + Math.min(W - 1, Math.max(0, x))];
      for (let x = 0; x < W; x++) { tmp[o + x] = acc / (2 * r + 1); acc += a[o + Math.min(W - 1, x + r + 1)] - a[o + Math.max(0, x - r)]; } }
    for (let x = 0; x < W; x++) { let acc = 0; for (let y = -r; y <= r; y++) acc += tmp[Math.min(H - 1, Math.max(0, y)) * W + x];
      for (let y = 0; y < H; y++) { a[y * W + x] = acc / (2 * r + 1); acc += tmp[Math.min(H - 1, y + r + 1) * W + x] - tmp[Math.max(0, y - r) * W + x]; } }
  }
  return a;
}
function distField(al, W, H) {
  const N = W * H, D = new Float32Array(N), s2 = 1.4142;
  for (let i = 0; i < N; i++) D[i] = al[i] > 0.5 ? 1e6 : 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; let v = D[i]; if (!v) continue;
    const l = x > 0 ? D[i - 1] : 0, u = y > 0 ? D[i - W] : 0, ul = x > 0 && y > 0 ? D[i - W - 1] : 0, ur = x < W - 1 && y > 0 ? D[i - W + 1] : 0;
    D[i] = Math.min(v, l + 1, u + 1, ul + s2, ur + s2); }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) { const i = y * W + x; let v = D[i]; if (!v) continue;
    const r = x < W - 1 ? D[i + 1] : 0, d = y < H - 1 ? D[i + W] : 0, dr = x < W - 1 && y < H - 1 ? D[i + W + 1] : 0, dl = x > 0 && y < H - 1 ? D[i + W - 1] : 0;
    D[i] = Math.min(v, r + 1, d + 1, dr + s2, dl + s2); }
  return D;
}
const LV = (() => { const l = Math.hypot(-0.55, -0.72, 0.62); return [-0.55 / l, -0.72 / l, 0.62 / l]; })();
const HV = (() => { const x = LV[0], y = LV[1], z = LV[2] + 1, l = Math.hypot(x, y, z); return [x / l, y / l, z / l]; })();

// clay(): paint `draw` into an offscreen albedo buffer covering world bbox, inflate and shade it, composite.
function clay(ctx, bx, by, bw, bh, draw, o) {
  o = o || {};
  const S = 2, W = Math.ceil(bw * S), H = Math.ceil(bh * S);
  if (W < 2 || H < 2) return null;
  const c = mk(W, H), g = c.getContext('2d');
  g.setTransform(S, 0, 0, S, -bx * S, -by * S); draw(g);
  const img = g.getImageData(0, 0, W, H), d = img.data, N = W * H;
  const al = new Float32Array(N); for (let i = 0; i < N; i++) al[i] = d[i * 4 + 3] / 255;
  const D = distField(al, W, H), R = (o.R || 10) * S, h = new Float32Array(N);
  for (let i = 0; i < N; i++) { const dd = Math.min(D[i], R); h[i] = Math.sqrt(Math.max(0, R * R - (R - dd) * (R - dd))) + al[i] * 0.5; }
  if (o.bump) { const bc = mk(W, H), bg = bc.getContext('2d'); bg.fillStyle = '#808080'; bg.fillRect(0, 0, W, H);
    bg.setTransform(S, 0, 0, S, -bx * S, -by * S); o.bump(bg); const bd = bg.getImageData(0, 0, W, H).data, ba = (o.bumpAmt || 3) * S;
    for (let i = 0; i < N; i++) if (al[i] > 0) h[i] += (bd[i * 4] / 255 - 0.5) * ba; }
  const nAmt = (o.noise === undefined ? 0.6 : o.noise) * S, nSc = o.nscale || 0.09;
  if (nAmt > 0) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (al[i] > 0) h[i] += (fbm((x / S + bx) * nSc, (y / S + by) * nSc, 3) - 0.5) * nAmt; }
  boxBlur(h, W, H, Math.max(1, Math.round((o.smooth || 0.12) * R)), 2);
  const hs = o.hs || 1, wrap = o.wrap === undefined ? 0.35 : o.wrap;
  const spec = o.spec === undefined ? 0.12 : o.spec, shin = o.shin || 14, spec2 = o.spec2 || 0;
  const sss = o.sss || 0, emit = o.emit || 0, rim = o.rim === undefined ? 0.25 : o.rim, gao = o.gao === undefined ? 0.35 : o.gao;
  const sun = o.sun || [1.25, 1.08, 0.86], sky = o.sky || [0.36, 0.44, 0.58], bnc = o.bounce || [0.34, 0.26, 0.17];
  const rimC = o.rimCol || [1.0, 0.92, 0.78], haze = o.haze || 0, hzC = o.hazeCol || [0.62, 0.74, 0.86];
  const sssC = o.sssCol || [1, 0.7, 0.45], aoY0 = o.aoY0 === undefined ? 0.7 : o.aoY0;
  for (let y = 0; y < H; y++) {
    const yrel = y / H, gf = 1 - gao * Math.pow(Math.max(0, (yrel - aoY0) / (1 - aoY0)), 2);
    for (let x = 0; x < W; x++) {
      const i = y * W + x; if (al[i] <= 0) continue;
      const hx = (h[x < W - 1 ? i + 1 : i] - h[x > 0 ? i - 1 : i]) * 0.5 * hs, hy = (h[y < H - 1 ? i + W : i] - h[y > 0 ? i - W : i]) * 0.5 * hs;
      let nx = -hx, ny = -hy, nz = 1; const nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl;
      const k = i * 4, ar = LIN[d[k]], ag = LIN[d[k + 1]], ab = LIN[d[k + 2]];
      const ndl = nx * LV[0] + ny * LV[1] + nz * LV[2];
      const df = Math.max(0, (ndl + wrap) / (1 + wrap));
      const up = 0.6 - 0.4 * ny, dn = Math.max(0, ny) * 0.9 + 0.1;
      let lr = sun[0] * df + sky[0] * up + bnc[0] * dn, lg = sun[1] * df + sky[1] * up + bnc[1] * dn, lb = sun[2] * df + sky[2] * up + bnc[2] * dn;
      let r = ar * lr * gf, gg = ag * lg * gf, b = ab * lb * gf;
      if (sss > 0) { const thin = 1 - Math.min(1, h[i] / (R * 1.05)); const s = sss * (0.35 + 0.65 * thin) * (0.55 + 0.45 * df);
        r += ar * sssC[0] * s; gg += ag * sssC[1] * s; b += ab * sssC[2] * s; }
      const ndh = Math.max(0, nx * HV[0] + ny * HV[1] + nz * HV[2]);
      const sp = spec * Math.pow(ndh, shin) + spec2 * Math.pow(ndh, 4) * 0.5;
      r += sp * sun[0] * 0.8; gg += sp * sun[1] * 0.8; b += sp * sun[2] * 0.8;
      const fr = Math.pow(1 - nz, 3) * rim; r += rimC[0] * fr * (0.4 + ar); gg += rimC[1] * fr * (0.4 + ag); b += rimC[2] * fr * (0.4 + ab);
      if (emit > 0) { r = r * (1 - emit) + ar * emit * 1.6; gg = gg * (1 - emit) + ag * emit * 1.6; b = b * (1 - emit) + ab * emit * 1.6; }
      if (haze > 0) { r = r * (1 - haze) + hzC[0] * haze; gg = gg * (1 - haze) + hzC[1] * haze; b = b * (1 - haze) + hzC[2] * haze; }
      d[k] = outv(r); d[k + 1] = outv(gg); d[k + 2] = outv(b);
    }
  }
  g.setTransform(1, 0, 0, 1, 0, 0); g.putImageData(img, 0, 0);
  ctx.drawImage(c, bx, by, bw, bh);
  return c;
}

function ell(g, x, y, rx, ry, rot) { g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, Math.PI * 2); }
function softShadow(ctx, x, y, rx, ry, a, col) {
  ctx.save(); ctx.globalCompositeOperation = 'multiply';
  ctx.translate(x, y); ctx.scale(1, ry / rx);
  const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  const c = col || '70,48,30';
  gr.addColorStop(0, `rgba(${c},${a})`); gr.addColorStop(0.55, `rgba(${c},${a * 0.55})`); gr.addColorStop(1, `rgba(${c},0)`);
  ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}
function groundShadow(ctx, x, y, w, s) {
  // contact AO (tight, dark) + soft cast shadow pushed down-right (key light from upper-left)
  softShadow(ctx, x + w * 0.22, y + w * 0.05, w * 0.85, w * 0.3, 0.42 * (s || 1));
  softShadow(ctx, x + w * 0.03, y, w * 0.56, w * 0.17, 0.75 * (s || 1), '60,38,22');
}
function glow(ctx, x, y, r, col, a) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(0.4, `rgba(${col},${a * 0.4})`); gr.addColorStop(1, `rgba(${col},0)`);
  ctx.fillStyle = gr; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
}

// ---------- scene constants ----------
const CX = 195, CY = 592, RX = 222, RY = 200;
function persp(y) { return 0.8 + 0.32 * (y - 390) / 400; }

// ---------- background ----------
function paintSky(ctx, W, H, rand) {
  const g = ctx.createLinearGradient(0, 0, 0, 330);
  g.addColorStop(0, '#6fb2ea'); g.addColorStop(0.45, '#a9d3f2'); g.addColorStop(0.8, '#f3e6cc'); g.addColorStop(1, '#f7e2b8');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, 340);
  glow(ctx, 20, 30, 260, '255,236,190', 0.55);
  // cotton clouds
  const clouds = [[70, 120, 1.1], [300, 95, 1.3], [205, 150, 0.8]];
  for (const [x, y, s] of clouds) {
    clay(ctx, x - 80 * s, y - 45 * s, 160 * s, 80 * s, (gc) => {
      gc.fillStyle = '#fdf8f0';
      for (let i = 0; i < 7; i++) { const a = i / 6; ell(gc, x + (a - 0.5) * 100 * s, y + Math.sin(a * 3.14) * -14 * s + 6 * s, (14 + Math.sin(a * 3.14) * 16) * s, (12 + Math.sin(a * 3.14) * 13) * s); gc.fill(); }
      ell(gc, x, y + 12 * s, 58 * s, 10 * s); gc.fill();
    }, { R: 16 * s, noise: 1.2, nscale: 0.05, sss: 0.35, sssCol: [1, 0.85, 0.7], haze: 0.25, hazeCol: [0.8, 0.88, 0.97], gao: 0.1, wrap: 0.6 });
  }
}

function paintHills(ctx, rand) {
  // far hills
  clay(ctx, -20, 175, 430, 160, (g) => {
    const gr = g.createLinearGradient(0, 180, 0, 330); gr.addColorStop(0, '#8fbf72'); gr.addColorStop(1, '#6e9e58');
    g.fillStyle = gr; g.beginPath(); g.moveTo(-20, 330); g.lineTo(-20, 230);
    g.bezierCurveTo(40, 190, 110, 195, 160, 225); g.bezierCurveTo(210, 200, 260, 175, 330, 200); g.bezierCurveTo(370, 212, 400, 225, 410, 230); g.lineTo(410, 330); g.fill();
  }, { R: 40, hs: 0.5, noise: 2, nscale: 0.04, haze: 0.32, gao: 0, rim: 0.1 });
  // trees: clusters of felt balls
  const trees = [[22, 228, 1.25, '#4f8f3e'], [80, 245, 0.85, '#5f9c45'], [352, 222, 1.35, '#4a8a3c'], [300, 250, 0.8, '#6aa54c'], [150, 238, 0.6, '#5a9844'], [252, 236, 0.65, '#4f8f3e']];
  for (const [x, y, s, col] of trees) {
    clay(ctx, x - 5 * s, y + 10 * s, 12 * s, 50 * s, (g) => { g.fillStyle = '#7a5434'; g.fillRect(x - 3.5 * s, y + 10 * s, 7 * s, 46 * s); }, { R: 3 * s, haze: 0.2, gao: 0.3 });
    clay(ctx, x - 48 * s, y - 62 * s, 96 * s, 100 * s, (g) => {
      g.fillStyle = col;
      const balls = [[0, -18, 26], [-20, 2, 22], [20, 0, 23], [0, 14, 24], [-8, -36, 16], [12, -30, 17]];
      for (const [bx, by, br] of balls) { ell(g, x + bx * s, y + by * s, br * s, br * s * 0.95); g.fill(); }
    }, { R: 18 * s, noise: 3.5, nscale: 0.22, haze: 0.22, rim: 0.3, sss: 0.2, sssCol: [0.6, 1, 0.4], gao: 0.4 });
  }
}

function pennants(ctx, x0, y0, x1, y1, sag, n, rand, sc) {
  const pts = [];
  for (let i = 0; i <= n; i++) { const t = i / n; pts.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * sag]); }
  const cols = ['#e8584b', '#f2b33d', '#4fb3d9', '#f5efe0', '#7cc06a', '#e77aa6'];
  ctx.save(); ctx.strokeStyle = 'rgba(80,60,40,0.85)'; ctx.lineWidth = 1.1 * sc; ctx.beginPath();
  for (let i = 0; i <= 40; i++) { const t = i / 40; const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * sag; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
  ctx.stroke(); ctx.restore();
  const minx = Math.min(x0, x1) - 10, miny = Math.min(y0, y1) - 5;
  clay(ctx, minx, miny, Math.abs(x1 - x0) + 20, Math.abs(y1 - y0) + sag + 30 * sc, (g) => {
    for (let i = 0; i < n; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      const mx = (ax + bx) / 2, my = (ay + by) / 2, sw = (rand() - 0.5) * 3;
      g.fillStyle = cols[i % cols.length];
      g.beginPath(); g.moveTo(ax + (bx - ax) * 0.1, ay + (by - ay) * 0.1); g.lineTo(bx - (bx - ax) * 0.1, by - (by - ay) * 0.1);
      g.lineTo(mx + sw, my + 15 * sc); g.closePath(); g.fill();
    }
  }, { R: 2.2 * sc, noise: 1.2, nscale: 0.5, sss: 0.45, gao: 0, rim: 0.2, wrap: 0.6 });
}

function critter(g, x, y, s, col, arm, rand) {
  // body + head + ears + raised arms (all one silhouette; eyes painted later)
  g.fillStyle = col;
  ell(g, x, y, 7.5 * s, 7 * s); g.fill();
  ell(g, x, y - 9 * s, 7 * s, 6.5 * s); g.fill();
  ell(g, x - 5 * s, y - 15 * s, 2.6 * s, 2.6 * s); g.fill(); ell(g, x + 5 * s, y - 15 * s, 2.6 * s, 2.6 * s); g.fill();
  g.lineCap = 'round'; g.strokeStyle = col; g.lineWidth = 3.4 * s;
  g.beginPath(); g.moveTo(x - 5 * s, y - 2 * s); g.lineTo(x - 10 * s, y - 13 * s - arm * 3 * s); g.stroke();
  g.beginPath(); g.moveTo(x + 5 * s, y - 2 * s); g.lineTo(x + 10 * s, y - 12 * s - (1 - arm) * 4 * s); g.stroke();
}
function paintStands(ctx, rand) {
  const cols = ['#f2c27a', '#e89a8f', '#9ccbe8', '#f5e7c8', '#b9a3d9', '#f0d36a', '#a7d39a', '#d9a06a'];
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? -10 : 262, x1 = side < 0 ? 128 : 400;
    // bleachers: 3 wooden tiers
    clay(ctx, x0, 268, x1 - x0, 110, (g) => {
      for (let t = 0; t < 3; t++) {
        const y = 300 + t * 22; g.fillStyle = t % 2 ? '#b98552' : '#c99561';
        g.fillRect(x0 + 4, y, x1 - x0 - 8, 14);
        g.fillStyle = '#8d6038'; g.fillRect(x0 + 4, y + 14, x1 - x0 - 8, 6);
      }
      g.fillStyle = '#7d5532'; for (let p = x0 + 14; p < x1; p += 38) g.fillRect(p, 300, 6, 72);
    }, { R: 3, noise: 1.5, nscale: 0.35, bump: (g) => { g.strokeStyle = '#5a5a5a'; g.lineWidth = 0.6; for (let i = 0; i < 40; i++) { const y = 300 + rand() * 66; g.beginPath(); g.moveTo(x0 + rand() * 120, y); g.lineTo(x0 + rand() * 140, y + rand() * 0.6); g.stroke(); } }, bumpAmt: 2, haze: 0.08, gao: 0.25 });
    // critters on tiers
    const list = [];
    for (let t = 0; t < 3; t++) for (let k = 0; k < 4; k++) {
      const x = x0 + 18 + k * 30 + (t % 2) * 12 + (rand() - 0.5) * 6; if (x > x1 - 10 || x < 4) continue;
      list.push([x, 296 + t * 22 - 2, (0.95 + t * 0.12) * (0.9 + rand() * 0.2), cols[(list.length * 3 + t + (side > 0 ? 2 : 0)) % cols.length], rand()]);
    }
    for (const c of list) softShadow(ctx, c[0] + 3, c[1] + 6, 10, 3.5, 0.45);
    clay(ctx, x0 - 10, 250, x1 - x0 + 20, 120, (g) => { for (const c of list) critter(g, c[0], c[1], c[2], c[3], c[4]); }, { R: 5, noise: 1.2, nscale: 0.3, rim: 0.35, gao: 0.3, aoY0: 0.5, sss: 0.15 });
    // faces
    for (const [x, y, s, , m] of list) {
      ctx.fillStyle = '#2a1d16';
      ell(ctx, x - 2.4 * s, y - 9.5 * s, 1.1 * s, 1.4 * s); ctx.fill(); ell(ctx, x + 2.4 * s, y - 9.5 * s, 1.1 * s, 1.4 * s); ctx.fill();
      ctx.fillStyle = '#7a2e22'; ell(ctx, x, y - 6.6 * s, 1.6 * s, m > 0.5 ? 1.5 * s : 0.9 * s); ctx.fill();
      ctx.fillStyle = 'rgba(240,120,110,0.45)'; ell(ctx, x - 4.4 * s, y - 7.4 * s, 1.4 * s, 0.9 * s); ctx.fill(); ell(ctx, x + 4.4 * s, y - 7.4 * s, 1.4 * s, 0.9 * s); ctx.fill();
    }
  }
}

function paintGate(ctx, rand) {
  // posts
  for (const px of [142, 248]) {
    softShadow(ctx, px + 8, 382, 16, 5, 0.6);
    clay(ctx, px - 9, 222, 18, 165, (g) => { g.fillStyle = '#9b6a3f'; g.fillRect(px - 6.5, 230, 13, 152); g.fillStyle = '#8a8178'; g.beginPath(); g.roundRect(px - 9, 368, 18, 14, 4); g.fill(); },
      { R: 6, noise: 1.5, nscale: 0.25, bump: (g) => { g.strokeStyle = '#444'; g.lineWidth = 0.7; for (let i = 0; i < 10; i++) { const x = px - 5 + rand() * 10; g.beginPath(); g.moveTo(x, 232 + rand() * 40); g.lineTo(x + (rand() - 0.5), 300 + rand() * 60); g.stroke(); } }, bumpAmt: 2.5, gao: 0.3 });
  }
  // thatched gable roof + log beam + sign
  clay(ctx, 96, 168, 198, 100, (g) => {
    g.fillStyle = '#d6ad5c'; g.beginPath(); g.moveTo(195, 176); g.quadraticCurveTo(250, 196, 292, 222); g.quadraticCurveTo(195, 214, 98, 222); g.quadraticCurveTo(140, 196, 195, 176); g.fill();
    g.fillStyle = '#8f6038'; g.beginPath(); g.roundRect(112, 222, 166, 13, 6); g.fill();
    g.fillStyle = '#9b6a3f'; g.fillRect(128, 250, 134, 8);
    g.fillStyle = '#efdcb2'; g.beginPath(); g.roundRect(174, 232, 42, 24, 5); g.fill();
  }, { R: 6, noise: 1.2, nscale: 0.25, gao: 0.1, sss: 0.15, bump: (g) => { g.strokeStyle = '#fff'; g.lineWidth = 1.2;
    for (let i = 0; i < 70; i++) { const t = i / 70, x = 100 + t * 190; g.beginPath(); g.moveTo(195 + (x - 195) * 0.15, 180); g.lineTo(x, 220); g.stroke(); }
    g.strokeStyle = '#000'; g.lineWidth = 0.8; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(114, 225 + i * 1.6); g.lineTo(276, 226 + i * 1.6 + (rand() - 0.5)); g.stroke(); } }, bumpAmt: 3 });
  // lanterns hanging from tie beam
  for (const lx of [150, 240]) {
    ctx.strokeStyle = '#3a2a20'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(lx, 258); ctx.lineTo(lx, 266); ctx.stroke();
    glow(ctx, lx, 280, 26, '255,170,90', 0.35);
    clay(ctx, lx - 12, 262, 24, 36, (g) => {
      g.fillStyle = '#e8453a'; ell(g, lx, 280, 9.5, 12); g.fill();
      g.fillStyle = '#2b2018'; g.fillRect(lx - 5, 266, 10, 3); g.fillRect(lx - 5, 291, 10, 3);
    }, { R: 7, sss: 0.9, sssCol: [1.2, 0.6, 0.25], noise: 0.6, spec: 0.25, shin: 20, gao: 0 });
    ctx.save(); ctx.globalAlpha = 0.25; ctx.strokeStyle = '#7a1f18'; ctx.lineWidth = 0.6;
    for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.ellipse(lx, 280, Math.abs(k) * 2.8 + 0.3, 11.5, 0, 0, Math.PI * 2); ctx.stroke(); } ctx.restore();
  }
}

function paintGrassField(ctx, rand) {
  // field around the ring: felt with tufts
  clay(ctx, -10, 320, 410, 540, (g) => {
    const gr = g.createLinearGradient(0, 330, 0, 844); gr.addColorStop(0, '#86b95f'); gr.addColorStop(0.5, '#6fa64c'); gr.addColorStop(1, '#5c9640');
    g.fillStyle = gr; g.beginPath(); g.moveTo(-10, 346); g.bezierCurveTo(80, 332, 300, 330, 400, 344); g.lineTo(400, 860); g.lineTo(-10, 860); g.fill();
    for (let i = 0; i < 260; i++) { const x = rand() * 400, y = 340 + rand() * 500; g.fillStyle = rand() < 0.5 ? 'rgba(160,200,100,0.35)' : 'rgba(60,110,40,0.3)'; ell(g, x, y, 3 + rand() * 6, 1.5 + rand() * 3); g.fill(); }
  }, { R: 8, noise: 2.2, nscale: 0.35, hs: 1, gao: 0, rim: 0.05, bump: (g) => {
    for (let i = 0; i < 900; i++) { const x = rand() * 400, y = 340 + rand() * 500; g.strokeStyle = rand() < 0.5 ? '#bbb' : '#444'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rand() - 0.5) * 3, y - 2 - rand() * 3); g.stroke(); }
  }, bumpAmt: 3 });
  // little flowers / tufts near the ring
  clay(ctx, -10, 330, 410, 520, (g) => {
    for (let i = 0; i < 70; i++) {
      const a = rand() * Math.PI * 2, rr = 1.06 + rand() * 0.25; const x = CX + Math.cos(a) * RX * rr, y = CY + Math.sin(a) * RY * rr;
      if (y < 345 || y > 840 || x < -5 || x > 395) continue;
      if (rand() < 0.6) { g.fillStyle = '#5f9a3f'; for (let k = 0; k < 4; k++) { ell(g, x + (k - 1.5) * 2.2, y - 3, 1.3, 4.5, (k - 1.5) * 0.3); g.fill(); } }
      else { g.fillStyle = ['#fff6e0', '#f7d04a', '#f29bb5'][(rand() * 3) | 0]; for (let k = 0; k < 5; k++) { const t = k / 5 * Math.PI * 2; ell(g, x + Math.cos(t) * 2.2, y + Math.sin(t) * 1.6, 1.6, 1.3); g.fill(); } g.fillStyle = '#e9a23b'; ell(g, x, y, 1.2, 1); g.fill(); }
    }
  }, { R: 1.8, noise: 0.3, nscale: 0.5, gao: 0, sss: 0.3 });
}

function paintArena(ctx, rand) {
  // packed sand floor
  const minx = CX - RX, miny = CY - RY;
  softShadow(ctx, CX + 10, CY + 12, RX * 1.08, RY * 1.08, 0.35);
  clay(ctx, minx - 4, miny - 4, RX * 2 + 8, RY * 2 + 8, (g) => {
    const gr = g.createRadialGradient(CX - 30, CY - 40, 20, CX, CY, RX);
    gr.addColorStop(0, '#ebcf9c'); gr.addColorStop(0.7, '#e2c08a'); gr.addColorStop(1, '#cfa673');
    g.fillStyle = gr; ell(g, CX, CY, RX - 6, RY - 6); g.fill();
    // scuffs / darker trampled patches
    for (let i = 0; i < 60; i++) { const a = rand() * 6.28, r = Math.sqrt(rand()) * 0.85; const x = CX + Math.cos(a) * RX * r, y = CY + Math.sin(a) * RY * r;
      g.fillStyle = rand() < 0.5 ? 'rgba(170,120,70,0.16)' : 'rgba(255,240,210,0.18)'; ell(g, x, y, 6 + rand() * 18, 3 + rand() * 7, rand() * 3); g.fill(); }
  }, { R: 9, hs: 0.9, noise: 1.4, nscale: 0.55, gao: 0, rim: 0.05, wrap: 0.5, bump: (g) => {
    // footprints / drag marks / pebble dents
    for (let i = 0; i < 140; i++) { const a = rand() * 6.28, r = Math.sqrt(rand()) * 0.9; const x = CX + Math.cos(a) * RX * r, y = CY + Math.sin(a) * RY * r;
      g.fillStyle = rand() < 0.6 ? 'rgba(40,40,40,0.5)' : 'rgba(220,220,220,0.5)'; ell(g, x, y, 2 + rand() * 4, 1 + rand() * 2, rand() * 3); g.fill(); }
    g.strokeStyle = 'rgba(40,40,40,0.35)'; g.lineWidth = 2.5; g.lineCap = 'round';
    for (let i = 0; i < 14; i++) { const a = rand() * 6.28, r = rand() * 0.7; const x = CX + Math.cos(a) * RX * r, y = CY + Math.sin(a) * RY * r; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 10, y + rand() * 8, x + 18 + rand() * 14, y + (rand() - 0.5) * 10); g.stroke(); }
  }, bumpAmt: 2.4 });
  // pebbles
  clay(ctx, minx, miny, RX * 2, RY * 2, (g) => {
    for (let i = 0; i < 45; i++) { const a = rand() * 6.28, r = Math.sqrt(rand()) * 0.88; const x = CX + Math.cos(a) * RX * r, y = CY + Math.sin(a) * RY * r;
      g.fillStyle = ['#b9a58c', '#d8c7ad', '#9c8a76'][(rand() * 3) | 0]; ell(g, x, y, 1.2 + rand() * 2, 0.9 + rand() * 1.3, rand() * 3); g.fill(); }
  }, { R: 1.6, noise: 0.2, gao: 0, spec: 0.2 });
  // chalk line
  ctx.save();
  for (let i = 0; i < 520; i++) {
    const t = i / 520 * Math.PI * 2, x = CX + Math.cos(t) * (RX - 26), y = CY + Math.sin(t) * (RY - 24);
    ctx.fillStyle = `rgba(255,252,240,${0.45 + rand() * 0.45})`; ell(ctx, x + (rand() - 0.5) * 1.2, y + (rand() - 0.5) * 1.2, 2.6 + rand() * 1.4, 1.6 + rand() * 0.8, t + Math.PI / 2); ctx.fill();
  }
  ctx.restore();
  // center start marks
  ctx.fillStyle = 'rgba(255,250,236,0.75)'; ctx.fillRect(CX - 28, CY + 4, 14, 3); ctx.fillRect(CX + 14, CY + 4, 14, 3);
}

function ropePath(g, rx, ry) { ell(g, CX, CY, rx, ry); }
function paintRope(ctx, rand) {
  const bx = CX - RX - 14, by = CY - RY - 14, bw = RX * 2 + 28, bh = RY * 2 + 30;
  const rope = (g) => {
    g.strokeStyle = '#d8ae55'; g.lineWidth = 15; ropePath(g, RX - 2, RY - 2); g.stroke();
    g.strokeStyle = 'rgba(150,105,40,0.35)'; g.lineWidth = 1.6;
    for (let i = 0; i < 300; i++) { const t = i / 300 * Math.PI * 2; const x = CX + Math.cos(t) * (RX - 2), y = CY + Math.sin(t) * (RY - 2);
      const tx = -Math.sin(t) * RX, ty = Math.cos(t) * RY, tl = Math.hypot(tx, ty); const ux = tx / tl, uy = ty / tl; const nx = -uy, ny = ux;
      g.beginPath(); g.moveTo(x - nx * 7 - ux * 3, y - ny * 7 - uy * 3); g.lineTo(x + nx * 7 + ux * 3, y + ny * 7 + uy * 3); g.stroke(); }
  };
  const c = clay(ctx, bx, by, bw, bh, rope, { R: 7.5, noise: 0.8, nscale: 0.9, rim: 0.3, gao: 0, sss: 0.2, sssCol: [1, 0.8, 0.4],
    bump: (g) => { g.lineCap = 'round';
      for (let i = 0; i < 300; i++) { const t = i / 300 * Math.PI * 2; const x = CX + Math.cos(t) * (RX - 2), y = CY + Math.sin(t) * (RY - 2);
        const tx = -Math.sin(t) * RX, ty = Math.cos(t) * RY, tl = Math.hypot(tx, ty); const ux = tx / tl, uy = ty / tl; const nx = -uy, ny = ux;
        g.strokeStyle = '#ffffff'; g.lineWidth = 3.2; g.beginPath(); g.moveTo(x - nx * 6 - ux * 2.5, y - ny * 6 - uy * 2.5); g.lineTo(x + nx * 6 + ux * 2.5, y + ny * 6 + uy * 2.5); g.stroke();
        g.strokeStyle = '#000000'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(x - nx * 6 - ux * 0.6, y - ny * 6 - uy * 0.6 + 2.2 * uy); g.lineTo(x + nx * 6 + ux * 4.4, y + ny * 6 + uy * 4.4); g.stroke();
        // straw fibres
        g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 0.4; g.beginPath(); g.moveTo(x + (rand() - 0.5) * 10, y + (rand() - 0.5) * 8); g.lineTo(x + (rand() - 0.5) * 10, y + (rand() - 0.5) * 8); g.stroke(); }
    }, bumpAmt: 5 });
  return { c, bx, by, bw, bh };
}

// ---------- characters ----------
function slimeBodyPath(g, w, h) {
  g.beginPath();
  g.moveTo(-w * 0.5, -h * 0.28);
  g.bezierCurveTo(-w * 0.53, -h * 0.86, -w * 0.22, -h * 1.03, 0.02 * w, -h * 1.0);
  g.bezierCurveTo(w * 0.28, -h * 0.98, w * 0.54, -h * 0.8, w * 0.5, -h * 0.26);
  g.bezierCurveTo(w * 0.48, -h * 0.02, w * 0.22, h * 0.03, 0, h * 0.02);
  g.bezierCurveTo(-w * 0.22, h * 0.03, -w * 0.49, -h * 0.02, -w * 0.5, -h * 0.28);
  g.closePath();
}
function shade(hex, f) { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  if (f < 0) { r *= 1 + f; g *= 1 + f; b *= 1 + f; } else { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; }
  return `rgb(${r | 0},${g | 0},${b | 0})`; }

// s: {x, y(base on ground), w, col, rot, sq (squash), lift (air height), eyes:'normal'|'swirl'|'teal', look:[dx,dy], mouth:'grit'|'o'|'grin'|'wobble', shadow}
function slime(ctx, s, rand) {
  const w = s.w, h = w * 0.92 * (s.sq || 1), ww = w * (2 - (s.sq || 1)), lift = s.lift || 0, rot = s.rot || 0;
  const gx = s.x, gy = s.y, bx = gx, by = gy - lift;
  if (s.shadow !== false) groundShadow(ctx, gx, gy, ww * 0.85 * (lift ? Math.max(0.55, 1 - lift / 120) : 1), lift ? Math.max(0.35, 1 - lift / 90) : 1);
  // transmitted jelly light spilling on the ground (colored caustic, lower-right)
  if (!lift) { ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.35; ctx.fillStyle = s.col; ell(ctx, gx + ww * 0.36, gy + 1, ww * 0.26, ww * 0.07, 0.1); ctx.filter = 'blur(3px)'; ctx.fill(); ctx.restore(); }
  const T = (g) => { g.translate(bx, by); g.rotate(rot); };
  if (s.aura) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(bx, by); ctx.rotate(rot);
    ctx.filter = 'blur(5px)'; ctx.strokeStyle = 'rgba(40,230,215,0.75)'; ctx.lineWidth = 8; slimeBodyPath(ctx, ww * 1.04, h * 1.04); ctx.stroke(); ctx.restore(); }
  const box = Math.max(ww, h) * 1.35;
  // feet
  clay(ctx, bx - box, by - box, box * 2, box * 2 + 8, (g) => { T(g); g.fillStyle = shade(s.col, -0.28);
    const fs = s.feet || [0, 0]; ell(g, -ww * 0.2, -1 + fs[0], ww * 0.11, ww * 0.075); g.fill(); ell(g, ww * 0.2, -1 + fs[1], ww * 0.11, ww * 0.075); g.fill(); }, { R: 3, noise: 0.3, gao: 0.2 });
  // jelly body
  clay(ctx, bx - box, by - box, box * 2, box * 2, (g) => {
    T(g);
    const gr = g.createRadialGradient(-ww * 0.05, -h * 0.45, 2, 0, -h * 0.4, ww * 0.62);
    gr.addColorStop(0, shade(s.col, 0.38)); gr.addColorStop(0.55, s.col); gr.addColorStop(1, shade(s.col, -0.22));
    g.fillStyle = gr; slimeBodyPath(g, ww, h); g.fill();
    // suspended bubbles / inner seeds
    g.fillStyle = shade(s.col, 0.5);
    for (let i = 0; i < 4; i++) { ell(g, (rand() - 0.5) * ww * 0.5, -h * (0.2 + rand() * 0.25), 0.8 + rand() * 1.6, 0.8 + rand() * 1.6); g.fill(); }
    // belly tint
    g.fillStyle = 'rgba(255,250,210,0.18)'; ell(g, 0, -h * 0.2, ww * 0.3, h * 0.16); g.fill();
  }, { R: Math.min(ww, h) * 0.42, noise: 0.25, nscale: 0.2, spec: 0.85, shin: 55, spec2: 0.25, sss: 0.75, sssCol: s.sssCol || [1.1, 1.0, 0.55], rim: 0.45, rimCol: [1, 1, 0.9], wrap: 0.55, gao: 0.35, aoY0: 0.55, smooth: 0.2 });
  // eyes
  const ex = ww * 0.17, ey = -h * 0.6, er = ww * 0.13, look = s.look || [0, 0];
  if (s.eyes === 'teal') { glow(ctx, bx, by + ey * Math.cos(rot), ww * 0.38, '80,255,235', 0.22); }
  clay(ctx, bx - box, by - box, box * 2, box * 2, (g) => {
    T(g);
    for (const sx of [-1, 1]) {
      g.fillStyle = s.eyes === 'teal' ? '#d9fffb' : '#fbfaf5'; ell(g, sx * ex, ey, er, er * 1.22); g.fill();
      if (s.eyes === 'swirl') {
        g.strokeStyle = '#2b1d18'; g.lineWidth = er * 0.2; g.beginPath();
        for (let t = 0; t < 14; t += 0.2) { const r = er * 0.78 * (t / 14); const px = sx * ex + Math.cos(t * sx + 1) * r, py = ey + Math.sin(t * sx + 1) * r * 1.2; t ? g.lineTo(px, py) : g.moveTo(px, py); }
        g.stroke();
      } else if (s.eyes === 'teal') {
        const ig = g.createRadialGradient(sx * ex + look[0] * er * 0.3, ey + look[1] * er * 0.3, 0, sx * ex, ey, er);
        ig.addColorStop(0, '#f0fffd'); ig.addColorStop(0.35, '#4ff5e4'); ig.addColorStop(1, '#0d9e98');
        g.fillStyle = ig; ell(g, sx * ex + look[0] * er * 0.25, ey + look[1] * er * 0.25, er * 0.8, er * 1.0); g.fill();
      } else {
        const ig = g.createRadialGradient(sx * ex + look[0] * er * 0.35, ey + er * 0.3, 0, sx * ex + look[0] * er * 0.3, ey + look[1] * er * 0.3, er * 0.8);
        ig.addColorStop(0, '#5b3a22'); ig.addColorStop(0.5, '#2a1a12'); ig.addColorStop(1, '#120a07');
        g.fillStyle = ig; ell(g, sx * ex + look[0] * er * 0.3, ey + look[1] * er * 0.3, er * 0.74, er * 0.92); g.fill();
      }
    }
  }, { R: er * 0.7, noise: 0, spec: 1.0, shin: 80, spec2: 0.2, rim: 0.2, gao: 0, emit: s.eyes === 'teal' ? 0.55 : 0, smooth: 0.15 });
  // overlay details in body space
  ctx.save(); ctx.translate(bx, by); ctx.rotate(rot);
  if (s.aura) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(90,255,240,0.85)'; ctx.lineWidth = 2.2; slimeBodyPath(ctx, ww * 1.0, h * 1.0); ctx.stroke(); ctx.restore(); }
  if (s.eyes !== 'swirl') { // catchlights
    ctx.fillStyle = '#ffffff';
    for (const sx of [-1, 1]) { ell(ctx, sx * ex - er * 0.28 + look[0] * er * 0.3, ey - er * 0.42, er * 0.27, er * 0.3); ctx.fill(); ell(ctx, sx * ex + er * 0.25 + look[0] * er * 0.3, ey + er * 0.35, er * 0.11, er * 0.11); ctx.fill(); }
  }
  // angry/determined brows for scuffling ones
  if (s.brow) { ctx.strokeStyle = shade(s.col, -0.55); ctx.lineWidth = er * 0.32; ctx.lineCap = 'round';
    for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx * (ex + er * 0.9), ey - er * 1.5); ctx.lineTo(sx * (ex - er * 0.5), ey - er * 1.15 + s.brow); ctx.stroke(); } }
  // cheeks
  ctx.fillStyle = 'rgba(255,120,110,0.33)'; ell(ctx, -ex - er * 0.9, ey + er * 1.35, er * 0.55, er * 0.3); ctx.fill(); ell(ctx, ex + er * 0.9, ey + er * 1.35, er * 0.55, er * 0.3); ctx.fill();
  // mouth
  const my = ey + er * 1.6;
  ctx.fillStyle = '#5a1e1a'; ctx.strokeStyle = shade(s.col, -0.6); ctx.lineWidth = Math.max(1, ww * 0.025); ctx.lineCap = 'round';
  if (s.mouth === 'o') { ell(ctx, 0, my + er * 0.2, er * 0.36, er * 0.45); ctx.fill(); ctx.fillStyle = '#e36a6a'; ell(ctx, 0, my + er * 0.4, er * 0.22, er * 0.18); ctx.fill(); }
  else if (s.mouth === 'grin') { ctx.beginPath(); ctx.moveTo(-er * 0.8, my); ctx.quadraticCurveTo(0, my + er * 1.2, er * 0.8, my); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#ef7a78'; ell(ctx, 0, my + er * 0.55, er * 0.35, er * 0.2); ctx.fill(); }
  else if (s.mouth === 'wobble') { ctx.beginPath(); for (let i = 0; i <= 8; i++) { const x = -er * 0.8 + i * er * 0.2; const y = my + (i % 2 ? er * 0.18 : -er * 0.1); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
  else { ctx.beginPath(); ctx.moveTo(-er * 0.65, my); ctx.lineTo(er * 0.65, my); ctx.lineTo(er * 0.5, my + er * 0.45); ctx.lineTo(-er * 0.5, my + er * 0.45); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(-er * 0.5, my, er, er * 0.16); }
  ctx.restore();
}

function dizzyStars(ctx, x, y, r, rand) {
  ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.65)'; ctx.lineWidth = 1; ctx.setLineDash([2, 3]); ell(ctx, x, y, r, r * 0.32); ctx.stroke(); ctx.restore();
  clay(ctx, x - r - 8, y - r * 0.4 - 8, r * 2 + 16, r * 0.8 + 16, (g) => {
    g.fillStyle = '#ffd34d';
    for (let k = 0; k < 3; k++) { const t = k / 3 * Math.PI * 2 + 0.6; const px = x + Math.cos(t) * r, py = y + Math.sin(t) * r * 0.32, rs = 4.2 + Math.sin(t) * 1.2;
      g.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? rs * 0.45 : rs; g.lineTo(px + Math.cos(a) * rr, py + Math.sin(a) * rr); } g.closePath(); g.fill(); }
  }, { R: 2.2, noise: 0, spec: 0.5, shin: 20, gao: 0, emit: 0.25 });
}

function bear(ctx, x, y, rand) {
  // x,y = ground point between feet. Faces left (toward the hero). ~120px wide incl. fists.
  groundShadow(ctx, x + 4, y, 92, 1.1);
  const fur = '#9a6238', furD = '#6f4326', belly = '#e0b483';
  // legs
  clay(ctx, x - 60, y - 40, 120, 50, (g) => { g.fillStyle = furD; ell(g, x - 22, y - 9, 17, 12); g.fill(); ell(g, x + 22, y - 9, 17, 12); g.fill();
    g.fillStyle = '#c99b70'; ell(g, x - 28, y - 4, 7, 5); g.fill(); ell(g, x + 16, y - 4, 7, 5); g.fill(); }, { R: 8, noise: 1.6, nscale: 0.3, gao: 0.5 });
  // back arm (raised, winding up) — behind body
  clay(ctx, x - 10, y - 150, 80, 90, (g) => { g.strokeStyle = furD; g.lineCap = 'round'; g.lineWidth = 22; g.beginPath(); g.moveTo(x + 22, y - 74); g.quadraticCurveTo(x + 46, y - 100, x + 40, y - 120); g.stroke(); }, { R: 11, noise: 1.6, nscale: 0.3, gao: 0 });
  // torso
  clay(ctx, x - 60, y - 115, 120, 112, (g) => {
    const gr = g.createRadialGradient(x - 10, y - 70, 5, x, y - 55, 60); gr.addColorStop(0, '#ad7244'); gr.addColorStop(1, fur);
    g.fillStyle = gr; ell(g, x, y - 52, 46, 48); g.fill();
    g.fillStyle = belly; ell(g, x - 8, y - 44, 26, 30); g.fill();
  }, { R: 30, noise: 1.8, nscale: 0.22, gao: 0.45, aoY0: 0.5, rim: 0.3, sss: 0.15, sssCol: [1, 0.5, 0.3], bump: (g) => {
    g.strokeStyle = '#fff'; g.lineWidth = 0.7; for (let i = 0; i < 120; i++) { const a = rand() * 6.28, r = rand() * 44; const px = x + Math.cos(a) * r, py = y - 52 + Math.sin(a) * r; g.beginPath(); g.moveTo(px, py); g.lineTo(px + (rand() - 0.5) * 3, py + 2 + rand() * 2); g.stroke(); } }, bumpAmt: 1.6 });
  // head
  const hx = x - 10, hy = y - 108;
  clay(ctx, hx - 48, hy - 52, 96, 92, (g) => {
    g.fillStyle = furD; ell(g, hx - 26, hy - 26, 12, 12); g.fill(); ell(g, hx + 24, hy - 30, 12, 12); g.fill();
    g.fillStyle = '#d99a8a'; ell(g, hx - 26, hy - 26, 6, 6); g.fill(); ell(g, hx + 24, hy - 30, 6, 6); g.fill();
  }, { R: 7, noise: 1.2, nscale: 0.3, gao: 0 });
  clay(ctx, hx - 48, hy - 48, 96, 92, (g) => {
    const gr = g.createRadialGradient(hx - 12, hy - 14, 4, hx, hy, 40); gr.addColorStop(0, '#b57a4a'); gr.addColorStop(1, fur);
    g.fillStyle = gr; ell(g, hx, hy, 36, 31); g.fill();
  }, { R: 22, noise: 1.6, nscale: 0.25, gao: 0.25, rim: 0.3, sss: 0.15, sssCol: [1, 0.5, 0.3] });
  // muzzle
  clay(ctx, hx - 30, hy - 12, 50, 40, (g) => { g.fillStyle = belly; ell(g, hx - 8, hy + 10, 16, 11.5); g.fill(); }, { R: 9, noise: 0.8, gao: 0 });
  clay(ctx, hx - 22, hy - 4, 26, 18, (g) => { g.fillStyle = '#2c1a14'; ell(g, hx - 9, hy + 4, 5.5, 4); g.fill(); }, { R: 3.5, noise: 0, spec: 0.9, shin: 50, gao: 0 });
  // face paint: eyes, brows, mouth
  ctx.fillStyle = '#1c120d'; ell(ctx, hx - 20, hy - 6, 4, 4.6); ctx.fill(); ell(ctx, hx + 6, hy - 8, 4, 4.6); ctx.fill();
  ctx.fillStyle = '#fff'; ell(ctx, hx - 21.2, hy - 7.6, 1.4, 1.5); ctx.fill(); ell(ctx, hx + 4.8, hy - 9.6, 1.4, 1.5); ctx.fill();
  ctx.strokeStyle = '#3b2216'; ctx.lineWidth = 3.2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(hx - 27, hy - 17); ctx.lineTo(hx - 13, hy - 12); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(hx + 14, hy - 20); ctx.lineTo(hx + 1, hy - 14); ctx.stroke();
  ctx.fillStyle = '#5a1e1a'; ctx.beginPath(); ctx.moveTo(hx - 18, hy + 14); ctx.quadraticCurveTo(hx - 8, hy + 22, hx + 2, hy + 13); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(hx - 15, hy + 14.5); ctx.lineTo(hx - 12.5, hy + 17.5); ctx.lineTo(hx - 10, hy + 14.5); ctx.fill();
  // stone fists
  const rock = (cx, cy, r, ang) => {
    clay(ctx, cx - r * 1.5, cy - r * 1.5, r * 3, r * 3, (g) => {
      g.translate(cx, cy); g.rotate(ang);
      const gr = g.createLinearGradient(-r, -r, r, r); gr.addColorStop(0, '#a9a49b'); gr.addColorStop(1, '#7d776f');
      g.fillStyle = gr; g.beginPath();
      const pts = [[-1, -0.55], [-0.45, -1], [0.5, -0.95], [1.05, -0.35], [0.95, 0.55], [0.35, 1], [-0.6, 0.95], [-1.05, 0.25]];
      for (const [px, py] of pts) g.lineTo(px * r, py * r); g.closePath(); g.fill();
      g.fillStyle = 'rgba(120,150,90,0.55)'; ell(g, -r * 0.4, -r * 0.6, r * 0.35, r * 0.2); g.fill(); // moss
    }, { R: r * 0.45, noise: 2.4, nscale: 0.35, spec: 0.15, shin: 10, gao: 0.2, rim: 0.3, bump: (g) => {
      g.strokeStyle = '#000'; g.lineWidth = 1.2; g.lineCap = 'round';
      g.beginPath(); g.moveTo(cx - r * 0.5, cy - r * 0.1); g.lineTo(cx - r * 0.1, cy + r * 0.05); g.lineTo(cx + r * 0.15, cy + r * 0.5); g.stroke();
      g.beginPath(); g.moveTo(cx + r * 0.1, cy - r * 0.7); g.lineTo(cx + r * 0.3, cy - r * 0.3); g.stroke();
      // knuckle bumps
      g.fillStyle = '#fff'; for (let k = 0; k < 3; k++) { ell(g, cx - r * 0.65, cy - r * 0.45 + k * r * 0.42, r * 0.2, r * 0.17); g.fill(); }
    }, bumpAmt: 4 });
  };
  rock(x + 42, y - 132, 25, -0.3);  // raised wind-up fist
  // front arm + forward guard fist
  clay(ctx, x - 70, y - 90, 70, 60, (g) => { g.strokeStyle = fur; g.lineCap = 'round'; g.lineWidth = 20; g.beginPath(); g.moveTo(x - 22, y - 64); g.quadraticCurveTo(x - 38, y - 56, x - 46, y - 62); g.stroke(); }, { R: 10, noise: 1.6, nscale: 0.3, gao: 0 });
  rock(x - 56, y - 64, 21, 0.4);
  // speed lines of the wind-up
  ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(x + 30, y - 110, 42 + k * 7, -1.9 + k * 0.08, -1.05); ctx.stroke(); }
  ctx.restore();
}

function ghost(ctx, x, y, s, ang) {
  // x,y = head center. ang = direction of travel (radians, screen). Wavy scalloped tail trails behind.
  glow(ctx, x, y, 52 * s, '60,240,225', 0.45);
  const T = (g) => { g.translate(x, y); g.rotate(ang); };
  const draw = (g) => {
    T(g);
    const gr = g.createRadialGradient(-2 * s, -4 * s, 1, -8 * s, 0, 36 * s);
    gr.addColorStop(0, '#d8fffa'); gr.addColorStop(0.45, '#86f3e8'); gr.addColorStop(0.8, '#33d6cb'); gr.addColorStop(1, '#129c99');
    g.fillStyle = gr;
    g.beginPath();
    g.arc(0, 0, 18 * s, -Math.PI / 2, Math.PI / 2);                // round head toward travel
    g.bezierCurveTo(-8 * s, 18 * s, -16 * s, 17 * s, -22 * s, 15 * s);
    // scalloped skirt edge (3 bumps), curving slightly (S-shaped tail)
    g.quadraticCurveTo(-30 * s, 14 * s, -29 * s, 7 * s);
    g.quadraticCurveTo(-36 * s, 6 * s, -34 * s, -1 * s);
    g.quadraticCurveTo(-41 * s, -3 * s, -37 * s, -9 * s);
    g.bezierCurveTo(-28 * s, -15 * s, -12 * s, -18 * s, 0, -18 * s);
    g.fill();
    // stubby arms stretched forward (diving)
    ell(g, 14 * s, -14 * s, 7 * s, 4 * s, -0.35); g.fill(); ell(g, 14 * s, 14 * s, 7 * s, 4 * s, 0.35); g.fill();
  };
  clay(ctx, x - 60 * s, y - 60 * s, 120 * s, 120 * s, draw, { R: 13 * s, noise: 0, spec: 0.8, shin: 45, sss: 0.9, sssCol: [0.6, 1.3, 1.2], emit: 0.35, rim: 0.6, rimCol: [0.8, 1, 1], gao: 0, wrap: 0.6, smooth: 0.2 });
  // face: placed on the head, kept upright so the expression reads
  const fx = x + Math.cos(ang) * 2 * s, fy = y + Math.sin(ang) * 2 * s - 3 * s;
  ctx.save(); ctx.translate(fx, fy); ctx.rotate((ang - Math.PI / 2) * 0.35);
  ctx.strokeStyle = '#0a4a52'; ctx.lineWidth = 2.5 * s; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-10 * s, -3 * s); ctx.quadraticCurveTo(-6.5 * s, -9.5 * s, -3 * s, -3 * s); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(3 * s, -3 * s); ctx.quadraticCurveTo(6.5 * s, -9.5 * s, 10 * s, -3 * s); ctx.stroke();
  ctx.fillStyle = '#0a4a52'; ctx.beginPath(); ctx.moveTo(-5.5 * s, 2 * s); ctx.quadraticCurveTo(0, 13 * s, 5.5 * s, 2 * s); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ff8f9a'; ell(ctx, 0, 7 * s, 2.8 * s, 1.7 * s); ctx.fill();
  ctx.fillStyle = 'rgba(255,130,165,0.5)'; ell(ctx, -12 * s, 3 * s, 3.2 * s, 1.9 * s); ctx.fill(); ell(ctx, 12 * s, 3 * s, 3.2 * s, 1.9 * s); ctx.fill();
  ctx.restore();
}

function trail(ctx, pts, rand) {
  // tapered teal ribbon (ectoplasm streak) along a cubic, thick at the ghost end
  const [p0, p1, p2, p3] = pts;
  const P = (t) => { const u = 1 - t; return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]; };
  const ribbon = (g, wmax, wmin) => { const L = [], Rr = [];
    for (let i = 0; i <= 80; i++) { const t = i / 80, [x, y] = P(t), [x2, y2] = P(Math.min(1, t + 0.01)), [x1, y1] = P(Math.max(0, t - 0.01));
      let tx = x2 - x1, ty = y2 - y1; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl; const w = wmin + (wmax - wmin) * Math.pow(t, 1.3) + Math.sin(t * 22) * 0.6 * t;
      L.push([x - ty * w, y + tx * w]); Rr.push([x + ty * w, y - tx * w]); }
    g.beginPath(); L.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); for (let i = Rr.length - 1; i >= 0; i--) g.lineTo(Rr[i][0], Rr[i][1]); g.closePath(); };
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.filter = 'blur(8px)'; ctx.fillStyle = 'rgba(30,200,190,0.55)'; ribbon(ctx, 16, 3); ctx.fill(); ctx.restore();
  // soft translucent jelly-ribbon body (inflated)
  ctx.save(); ctx.globalAlpha = 0.75;
  clay(ctx, Math.min(p0[0], p1[0], p2[0], p3[0]) - 30, Math.min(p0[1], p1[1], p2[1], p3[1]) - 30, Math.abs(Math.max(p0[0], p1[0], p2[0], p3[0]) - Math.min(p0[0], p1[0], p2[0], p3[0])) + 60, Math.abs(Math.max(p0[1], p1[1], p2[1], p3[1]) - Math.min(p0[1], p1[1], p2[1], p3[1])) + 60, (g) => {
    const gr = g.createLinearGradient(p0[0], p0[1], p3[0], p3[1]); gr.addColorStop(0, 'rgba(60,220,210,0.0)'); gr.addColorStop(0.4, 'rgba(70,225,215,0.6)'); gr.addColorStop(0.85, 'rgba(110,245,235,0.8)'); gr.addColorStop(1, 'rgba(110,245,235,0.2)');
    g.fillStyle = gr; ribbon(g, 7.5, 1.2); g.fill(); }, { R: 6, noise: 0, emit: 0.55, sss: 0.8, sssCol: [0.6, 1.3, 1.2], spec: 0.6, shin: 30, rim: 0.4, rimCol: [0.8, 1, 1], gao: 0, wrap: 0.7 });
  ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(230,255,252,0.55)'; ribbon(ctx, 2.6, 0.3); ctx.fill(); ctx.restore();
  // sparkles
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 22; i++) { const t = 0.15 + rand() * 0.85, [x, y] = P(t), ox = (rand() - 0.5) * 34 * t, oy = (rand() - 0.5) * 20 * t;
    const r = 1 + rand() * 2.4, X = x + ox, Y = y + oy; ctx.fillStyle = `rgba(200,255,248,${0.5 + rand() * 0.5})`;
    ctx.beginPath(); ctx.moveTo(X, Y - r * 2.4); ctx.lineTo(X + r * 0.45, Y - r * 0.45); ctx.lineTo(X + r * 2.4, Y); ctx.lineTo(X + r * 0.45, Y + r * 0.45); ctx.lineTo(X, Y + r * 2.4); ctx.lineTo(X - r * 0.45, Y + r * 0.45); ctx.lineTo(X - r * 2.4, Y); ctx.lineTo(X - r * 0.45, Y - r * 0.45); ctx.fill(); }
  ctx.restore();
}

function burst(ctx, x, y, gy, rand) {
  // x,y = burst core (above ground at gy). Old body = orange jelly.
  // ground shockwave ring
  ctx.save();
  for (let k = 0; k < 2; k++) { const rr = [64, 44][k];
    ctx.strokeStyle = `rgba(255,250,235,${[0.75, 0.45][k]})`; ctx.lineWidth = [5, 3][k]; ctx.filter = 'blur(1.5px)'; ell(ctx, x, gy, rr, rr * 0.42); ctx.stroke(); }
  ctx.filter = 'none'; ctx.restore();
  // splat puddle left by the old body
  clay(ctx, x - 40, gy - 20, 80, 40, (g) => { g.fillStyle = '#f08a3a'; g.beginPath();
    for (let i = 0; i < 14; i++) { const a = i / 14 * 6.28, r = (i % 2 ? 13 : 22) + rand() * 5; g.lineTo(x + Math.cos(a) * r, gy + Math.sin(a) * r * 0.42); } g.closePath(); g.fill(); },
    { R: 3, spec: 0.9, shin: 50, sss: 0.6, noise: 0, gao: 0 });
  // dust puffs on the ring
  clay(ctx, x - 90, gy - 50, 180, 80, (g) => { g.fillStyle = '#f3e4c8';
    for (let i = 0; i < 11; i++) { const a = i / 11 * 6.28 + 0.2, rr = 66 + rand() * 10; const px = x + Math.cos(a) * rr, py = gy + Math.sin(a) * rr * 0.42; if (py < gy - 30) continue;
      const s = 7 + rand() * 6; ell(g, px, py - s * 0.5, s, s * 0.85); g.fill(); ell(g, px + s * 0.6, py - s * 0.2, s * 0.7, s * 0.6); g.fill(); } },
    { R: 6, noise: 1.6, nscale: 0.2, sss: 0.3, gao: 0.2, wrap: 0.7, haze: 0.08, hazeCol: [1, 0.95, 0.85] });
  // core flash (kept tight so it does not wash the ring)
  glow(ctx, x, y, 95, '255,190,110', 0.25);
  // soft rays
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(x, y);
  for (let i = 0; i < 10; i++) { const a = i / 10 * 6.28 + rand() * 0.3, L = 70 + rand() * 40; ctx.rotate(a);
    const gr = ctx.createLinearGradient(0, 0, L, 0); gr.addColorStop(0, 'rgba(255,235,190,0.55)'); gr.addColorStop(1, 'rgba(255,190,110,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(20, -5); ctx.lineTo(L, 0); ctx.lineTo(20, 5); ctx.fill(); ctx.rotate(-a); }
  ctx.restore();
  // jagged pop star behind the puffs
  clay(ctx, x - 90, y - 90, 180, 180, (g) => { g.fillStyle = '#ffcf4a'; g.beginPath();
    for (let i = 0; i < 26; i++) { const a = i / 26 * 6.28 + 0.1, r = i % 2 ? 40 + rand() * 6 : 66 + rand() * 18; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.92); } g.closePath(); g.fill();
    g.fillStyle = '#ff8a3a'; g.beginPath(); for (let i = 0; i < 26; i++) { const a = i / 26 * 6.28 + 0.22, r = i % 2 ? 32 : 50 + rand() * 10; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.92); } g.closePath(); g.fill(); },
    { R: 6, noise: 0.8, nscale: 0.2, emit: 0.3, sss: 0.4, rim: 0.3, gao: 0, wrap: 0.7, spec: 0.3, shin: 20 });
  // clay puff-ball explosion cloud, lit from within
  clay(ctx, x - 70, y - 70, 140, 140, (g) => {
    const gr = g.createRadialGradient(x, y, 4, x, y, 52); gr.addColorStop(0, '#fff6d8'); gr.addColorStop(0.35, '#ffd98a'); gr.addColorStop(0.75, '#ffa552'); gr.addColorStop(1, '#ea7a3c');
    g.fillStyle = gr; ell(g, x, y, 26, 24); g.fill();
    for (let i = 0; i < 11; i++) { const a = i / 11 * 6.28 + rand() * 0.3, r = 26 + rand() * 10, s = 10 + rand() * 8; ell(g, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.9, s, s * 0.95); g.fill(); }
  }, { R: 12, noise: 1.4, nscale: 0.15, emit: 0.12, sss: 0.6, sssCol: [1.2, 0.8, 0.4], rim: 0.2, gao: 0, wrap: 0.8, spec: 0.1 });
  glow(ctx, x, y, 18, '255,252,235', 0.55);
  // airborne shockwave (screen-space ring)
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,245,220,0.8)'; ctx.lineWidth = 2.5; ell(ctx, x, y, 70, 62); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,210,150,0.35)'; ctx.lineWidth = 10; ctx.filter = 'blur(4px)'; ell(ctx, x, y, 72, 64); ctx.stroke(); ctx.restore();
  // jelly droplets + felt confetti flying outward (with motion streaks)
  const drops = [];
  for (let i = 0; i < 16; i++) { const a = rand() * 6.28, r = 58 + rand() * 50; drops.push([x + Math.cos(a) * r, y + Math.sin(a) * r * 0.85, 2.5 + rand() * 4.5, a]); }
  ctx.save(); ctx.lineCap = 'round';
  for (const [px, py, s, a] of drops) { ctx.strokeStyle = 'rgba(255,190,120,0.35)'; ctx.lineWidth = s * 1.1; ctx.beginPath(); ctx.moveTo(px - Math.cos(a) * s * 4, py - Math.sin(a) * s * 3.4); ctx.lineTo(px, py); ctx.stroke(); }
  ctx.restore();
  clay(ctx, x - 110, y - 110, 220, 220, (g) => { g.fillStyle = '#f39443';
    for (const [px, py, s, a] of drops) { ell(g, px, py, s * 1.25, s, a); g.fill(); } },
    { R: 4, noise: 0, spec: 1.0, shin: 60, sss: 0.8, sssCol: [1.2, 0.8, 0.4], rim: 0.4, gao: 0, wrap: 0.6 });
  clay(ctx, x - 120, y - 120, 240, 240, (g) => {
    const cols = ['#ff5f6d', '#ffd23f', '#3fd0c9', '#ffffff', '#8bd35c', '#b18cff'];
    for (let i = 0; i < 26; i++) { const a = rand() * 6.28, r = 60 + rand() * 65; const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r * 0.9;
      g.save(); g.translate(px, py); g.rotate(rand() * 6.28); g.fillStyle = cols[i % cols.length];
      if (i % 3) g.fillRect(-3.5, -2, 7, 4); else { g.beginPath(); g.moveTo(-3, 3); g.lineTo(0, -4); g.lineTo(3.5, 3); g.fill(); }
      g.restore(); } },
    { R: 1.4, noise: 0.3, nscale: 1, spec: 0.2, gao: 0, wrap: 0.6, sss: 0.3 });
}

// ---------- HUD (clay too, crisp; drawn after post) ----------
function heart(g, x, y, s) {
  g.beginPath(); g.moveTo(x, y + s * 0.85);
  g.bezierCurveTo(x - s * 1.1, y + s * 0.15, x - s * 1.05, y - s * 0.75, x - s * 0.5, y - s * 0.78);
  g.bezierCurveTo(x - s * 0.2, y - s * 0.8, x, y - s * 0.55, x, y - s * 0.35);
  g.bezierCurveTo(x, y - s * 0.55, x + s * 0.2, y - s * 0.8, x + s * 0.5, y - s * 0.78);
  g.bezierCurveTo(x + s * 1.05, y - s * 0.75, x + s * 1.1, y + s * 0.15, x, y + s * 0.85); g.closePath();
}
function starP(g, x, y, r, ir) { g.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? ir : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); }
function paintHUD(ctx, rand) {
  const hy = 66;
  // hearts
  for (let i = 0; i < 3; i++) softShadow(ctx, 26 + i * 27 + 2, hy + 10, 12, 4, 0.35);
  clay(ctx, 6, hy - 18, 100, 36, (g) => { g.fillStyle = '#ef4b5a'; for (let i = 0; i < 3; i++) { heart(g, 26 + i * 27, hy, 12); g.fill(); } },
    { R: 6, noise: 0.25, spec: 0.7, shin: 35, sss: 0.4, sssCol: [1.2, 0.5, 0.5], gao: 0.2, rim: 0.3 });
  // stage plate: clay pebble with embossed 1-1
  softShadow(ctx, 197, hy + 15, 34, 6, 0.4);
  clay(ctx, 150, hy - 20, 90, 42, (g) => {
    g.fillStyle = '#f4ead4'; g.beginPath(); g.roundRect(162, hy - 14, 66, 29, 14); g.fill();
    g.fillStyle = '#4a3324'; g.font = '800 17px Inter, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('1-1', 195, hy + 1);
  }, { R: 7, noise: 0.4, nscale: 0.4, spec: 0.25, gao: 0.25, bump: (g) => { g.fillStyle = '#ffffff'; g.font = '800 17px Inter, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('1-1', 195, hy + 1); }, bumpAmt: 3 });
  // empty star sockets
  for (let i = 0; i < 3; i++) softShadow(ctx, 307 + i * 26 + 2, hy + 10, 11, 4, 0.3);
  clay(ctx, 284, hy - 18, 104, 36, (g) => { for (let i = 0; i < 3; i++) { g.fillStyle = '#e3d6bd'; starP(g, 307 + i * 26, hy + 1, 12, 5.6); g.fill(); } },
    { R: 4, noise: 0.3, spec: 0.2, gao: 0.1, bump: (g) => { g.fillStyle = '#000'; for (let i = 0; i < 3; i++) { starP(g, 307 + i * 26, hy + 1.5, 7.5, 3.4); g.fill(); } }, bumpAmt: 5 });
}

function chargeRing(ctx, x, y, rx, ry, frac) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(10,60,60,0.35)'; ctx.lineWidth = 6; ell(ctx, x, y, rx, ry); ctx.stroke();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = 'rgba(60,240,225,0.35)'; ctx.lineWidth = 11; ctx.filter = 'blur(3px)';
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); ctx.stroke(); ctx.filter = 'none';
  ctx.strokeStyle = '#6ff7ea'; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(x, y - 0.8, rx, ry, 0, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); ctx.stroke();
  ctx.restore();
}

// ---------- post ----------
function post(ctx, W, H, rand) {
  const C = ctx.canvas, CW = C.width, CH = C.height;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  // bloom (thresholded, quarter res)
  const bw = CW / 4 | 0, bh = CH / 4 | 0, b = mk(bw, bh), bg = b.getContext('2d');
  bg.drawImage(C, 0, 0, bw, bh); const bd = bg.getImageData(0, 0, bw, bh), q = bd.data;
  for (let i = 0; i < q.length; i += 4) { const l = (q[i] * 0.3 + q[i + 1] * 0.55 + q[i + 2] * 0.15) / 255, k = Math.max(0, l - 0.82) * 5;
    q[i] *= k; q[i + 1] *= k; q[i + 2] *= k; }
  bg.putImageData(bd, 0, 0);
  const b2 = mk(bw, bh), b2g = b2.getContext('2d'); b2g.filter = 'blur(5px)'; b2g.drawImage(b, 0, 0);
  ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.5; ctx.drawImage(b2, 0, 0, CW, CH); ctx.globalAlpha = 1;
  // tilt-shift (two layers)
  for (const [blur, y0, y1, y2, y3] of [[2.5, 220, 340, 770, 840], [7, 70, 250, 810, 900]]) {
    const t = mk(CW, CH), tg = t.getContext('2d'); tg.filter = `blur(${blur * 2}px)`; tg.drawImage(C, 0, 0); tg.filter = 'none';
    tg.globalCompositeOperation = 'destination-in';
    const gr = tg.createLinearGradient(0, 0, 0, CH);
    gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(y0 * 2 / CH, 'rgba(0,0,0,1)'); gr.addColorStop(y1 * 2 / CH, 'rgba(0,0,0,0)');
    gr.addColorStop(Math.min(1, y2 * 2 / CH), 'rgba(0,0,0,0)'); gr.addColorStop(Math.min(1, y3 * 2 / CH), 'rgba(0,0,0,1)');
    tg.fillStyle = gr; tg.fillRect(0, 0, CW, CH);
    ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(t, 0, 0);
  }
  ctx.restore();
  // warm sun wash + vignette
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  const sw = ctx.createRadialGradient(40, 60, 10, 120, 200, 700); sw.addColorStop(0, 'rgba(255,214,150,0.45)'); sw.addColorStop(0.5, 'rgba(128,128,128,0)'); sw.addColorStop(1, 'rgba(60,70,120,0.35)');
  ctx.fillStyle = sw; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'multiply';
  const vg = ctx.createRadialGradient(W / 2, H * 0.58, H * 0.32, W / 2, H * 0.55, H * 0.78); vg.addColorStop(0, 'rgba(255,255,255,1)'); vg.addColorStop(1, 'rgba(150,120,100,1)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  ctx.restore();
  // color grade: contrast S-curve, saturation, split-tone (warm highlights / cool shadows)
  { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); const id = ctx.getImageData(0, 0, CW, CH), q = id.data;
    const lut = new Uint8ClampedArray(256); for (let i = 0; i < 256; i++) { const x = i / 255; const y = x < 0.5 ? 0.5 * Math.pow(2 * x, 1.22) : 1 - 0.5 * Math.pow(2 * (1 - x), 1.22); lut[i] = Math.round(y * 255); }
    for (let i = 0; i < q.length; i += 4) { let r = lut[q[i]], g = lut[q[i + 1]], b = lut[q[i + 2]]; const l = r * 0.3 + g * 0.59 + b * 0.11, sat = 1.16;
      r = l + (r - l) * sat; g = l + (g - l) * sat; b = l + (b - l) * sat; const t = l / 255;
      q[i] = r + (t - 0.5) * 10; q[i + 1] = g + (t - 0.5) * 2; q[i + 2] = b - (t - 0.5) * 12; }
    ctx.putImageData(id, 0, 0); ctx.restore(); }
  // film grain
  const n = mk(390, 844), ng = n.getContext('2d'), id = ng.createImageData(390, 844);
  for (let i = 0; i < id.data.length; i += 4) { const v = 128 + (rand() - 0.5) * 60; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
  ng.putImageData(id, 0, 0);
  ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.1; ctx.drawImage(n, 0, 0, W, H); ctx.restore();
}

function foreground(ctx, rand) {
  // big out-of-focus clay tufts & flowers at the bottom edge (they fall into the tilt-shift blur)
  clay(ctx, -20, 760, 430, 100, (g) => {
    for (const [x, y, s] of [[18, 842, 1.4], [372, 846, 1.6], [300, 852, 1.0], [90, 856, 1.1]]) {
      g.fillStyle = '#4f8a35'; for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k - 3) * 0.32; ell(g, x + Math.cos(a) * 14 * s, y + Math.sin(a) * 18 * s, 4 * s, 16 * s, a + Math.PI / 2); g.fill(); }
    }
    for (const [x, y, s, c] of [[40, 818, 1.3, '#fff3e0'], [352, 812, 1.5, '#ffd24d'], [330, 838, 1.0, '#f39bb8']]) {
      g.fillStyle = c; for (let k = 0; k < 6; k++) { const t = k / 6 * Math.PI * 2; ell(g, x + Math.cos(t) * 8 * s, y + Math.sin(t) * 6 * s, 6 * s, 5 * s); g.fill(); }
      g.fillStyle = '#e99a2e'; ell(g, x, y, 4.5 * s, 4 * s); g.fill();
    }
  }, { R: 4, noise: 0.6, nscale: 0.3, gao: 0, sss: 0.3, rim: 0.3 });
}

// ---------- main ----------
function paint(ctx, W, H, rand) {
  initNoise(rand);
  paintSky(ctx, W, H, rand);
  paintHills(ctx, rand);
  pennants(ctx, -10, 118, 400, 104, 42, 13, rand, 1.2);
  paintGrassField(ctx, rand);
  paintGate(ctx, rand);
  paintStands(ctx, rand);
  pennants(ctx, 104, 214, -10, 262, 14, 5, rand, 0.8);
  pennants(ctx, 286, 214, 400, 258, 14, 5, rand, 0.8);
  paintArena(ctx, rand);
  const rope = paintRope(ctx, rand);

  // --- the action ---
  const target = { x: 206, y: 632 };
  const burstP = { x: 100, y: 470, gy: 500 };
  chargeRing(ctx, target.x, target.y + 2, 48, 17, 0.68);

  const actors = [
    { y: 462, f: () => slime(ctx, { x: 320, y: 462, w: 40, col: '#9fd65a', eyes: 'normal', look: [-0.6, 0.2], mouth: 'o', rot: 0.08 }, rand) },
    { y: 545, f: () => slime(ctx, { x: 48, y: 560, w: 42, col: '#c3d94a', eyes: 'swirl', mouth: 'wobble', rot: -0.9, sq: 0.9, lift: 14 }, rand) },
    { y: 640, f: () => bear(ctx, 320, 652, rand) },
    { y: 628, f: () => slime(ctx, { x: target.x, y: target.y, w: 62, col: '#7fce5c', eyes: 'teal', look: [0, -0.4], mouth: 'grin', sq: 0.82, feet: [1, 1], aura: true }, rand) },
    { y: 728, f: () => slime(ctx, { x: 120, y: 728, w: 50, col: '#a8dc62', eyes: 'normal', look: [0.5, -0.5], mouth: 'grit', brow: 2, rot: 0.12 }, rand) },
    { y: 676, f: () => slime(ctx, { x: 52, y: 676, w: 40, col: '#f0a64a', sssCol: [1.2, 0.85, 0.5], eyes: 'normal', look: [0.7, -0.3], mouth: 'grit', brow: 2.5, rot: 0.22, feet: [0, -3] }, rand) },
    { y: 760, f: () => slime(ctx, { x: 268, y: 760, w: 46, col: '#e0c64e', eyes: 'normal', look: [-0.5, -0.6], mouth: 'o', rot: -0.1 }, rand) },
  ];
  actors.sort((a, b) => a.y - b.y);
  for (const a of actors) a.f();
  burst(ctx, burstP.x, burstP.y, burstP.gy, rand);
  // flung slimes (airborne, drawn above ground actors)
  slime(ctx, { x: 30, y: 470, w: 42, col: '#b6e05c', eyes: 'swirl', mouth: 'wobble', rot: -0.7, lift: 40, shadow: true }, rand);
  dizzyStars(ctx, 26, 402, 18, rand);
  slime(ctx, { x: 118, y: 622, w: 42, col: '#8fd06a', eyes: 'swirl', mouth: 'o', rot: 1.0, lift: 16 }, rand);
  dizzyStars(ctx, 112, 566, 16, rand);
  dizzyStars(ctx, 46, 506, 17, rand);

  // front half of the rope over the actors
  ctx.save(); ctx.beginPath(); ctx.rect(0, CY + RY * 0.55, W, H); ctx.clip(); ctx.drawImage(rope.c, rope.bx, rope.by, rope.bw, rope.bh); ctx.restore();

  // ghost trail from burst up and over, diving into the target
  trail(ctx, [[burstP.x + 10, burstP.y - 10], [110, 360], [175, 380], [180, 528]], rand);
  // entry splash on the slime top
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(120,255,240,0.85)'; ctx.lineWidth = 2.4; ell(ctx, target.x + 2, target.y - 45, 26, 7.5); ctx.stroke();
  ctx.strokeStyle = 'rgba(120,255,240,0.4)'; ctx.lineWidth = 1.6; ell(ctx, target.x + 2, target.y - 44, 36, 11); ctx.stroke(); ctx.restore();
  clay(ctx, target.x - 60, target.y - 110, 120, 80, (g) => { g.fillStyle = '#8fe06a';
    for (const [dx, dy, r, a] of [[-34, -60, 4.5, -0.6], [-26, -78, 3, -0.9], [36, -62, 4.2, 0.6], [30, -84, 3, 0.9], [46, -50, 2.6, 0.3], [-44, -48, 2.8, -0.3]]) { ell(g, target.x + dx, target.y + dy, r, r * 1.35, a); g.fill(); } },
    { R: 3.5, noise: 0, spec: 1, shin: 60, sss: 0.8, sssCol: [1.1, 1, 0.55], gao: 0, rim: 0.4 });
  ghost(ctx, 200, 566, 1.3, 1.18);
  // soft sun shafts from upper-left
  ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.filter = 'blur(14px)';
  for (const [x0, w0, a] of [[-40, 40, 0.16], [40, 26, 0.12], [110, 50, 0.1]]) {
    const gr = ctx.createLinearGradient(0, 0, 300, 700); gr.addColorStop(0, `rgba(255,236,190,${a})`); gr.addColorStop(1, 'rgba(255,236,190,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(x0, -20); ctx.lineTo(x0 + w0, -20); ctx.lineTo(x0 + w0 + 380, 760); ctx.lineTo(x0 + 330, 760); ctx.fill(); }
  ctx.restore();
  foreground(ctx, rand);
  post(ctx, W, H, rand);
  paintHUD(ctx, rand);
}
