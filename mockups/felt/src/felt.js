// 양모 펠트 질감 도구: 조각 하나를 그리면 결(섬유)·보풀·둥근 음영을 입힌다
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function mk(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }

function hex2rgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function rgb2hsl([r, g, b]) { r /= 255; g /= 255; b /= 255; const M = Math.max(r, g, b), m = Math.min(r, g, b); let h = 0, s = 0; const l = (M + m) / 2; if (M !== m) { const d = M - m; s = l > 0.5 ? d / (2 - M - m) : d / (M + m); h = M === r ? (g - b) / d + (g < b ? 6 : 0) : M === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; } return [h * 360, s, l]; }
export function hsl(h, s, l, a = 1) { return `hsla(${h.toFixed(1)},${(s * 100).toFixed(1)}%,${(Math.max(0, Math.min(1, l)) * 100).toFixed(1)}%,${a})`; }
export function tone(hex, dl = 0, a = 1, dh = 0, ds = 0) { const [h, s, l] = rgb2hsl(hex2rgb(hex)); return hsl(h + dh, Math.max(0, Math.min(1, s + ds)), l + dl, a); }
export function hslOf(hex) { return rgb2hsl(hex2rgb(hex)); }

// 스프라이트 판: 발밑이 (0,0), 위가 음수. res = 단위당 픽셀
export function sheet(w, h, res, footY = 0.92) {
  const c = mk(w * res, h * res), g = c.getContext('2d');
  return { c, g, w, h, res, ox: w * res / 2, oy: h * res * footY };
}
function local(S, x) { x.setTransform(S.res, 0, 0, S.res, S.ox, S.oy); }

// 펠트 조각. path(ctx) 는 지역 좌표로 경로를 만든다
export function felt(S, path, col, o = {}) {
  const R = rng(o.seed || (col.length * 977 + (S._n = (S._n || 0) + 1) * 131));
  const W = S.c.width, H = S.c.height;
  const c = mk(W, H), x = c.getContext('2d');
  local(S, x); x.beginPath(); path(x); x.fillStyle = col; x.fill(o.rule || 'nonzero');
  const img = x.getImageData(0, 0, W, H).data;
  let x0 = W, y0 = H, x1 = 0, y1 = 0, area = 0;
  for (let y = 0; y < H; y += 2) for (let i = 0; i < W; i += 2) if (img[(y * W + i) * 4 + 3] > 128) { area += 4; if (i < x0) x0 = i; if (i > x1) x1 = i; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (!area) return;
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1, r = S.res;
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-atop';
  // 둥근 부피: 왼위 빛, 오른아래 그늘
  const lx = x0 + bw * (o.lx ?? 0.32), ly = y0 + bh * (o.ly ?? 0.22), rad = Math.max(bw, bh) * 1.05;
  const gr = x.createRadialGradient(lx, ly, 0, lx, ly, rad);
  gr.addColorStop(0, `rgba(255,246,228,${o.hi ?? 0.34})`); gr.addColorStop(0.45, 'rgba(255,246,228,0)'); gr.addColorStop(0.78, 'rgba(40,20,10,0.06)'); gr.addColorStop(1, `rgba(30,14,6,${o.lo ?? 0.36})`);
  x.fillStyle = gr; x.fillRect(x0, y0, bw, bh);
  // 가장자리 안쪽이 살짝 말려 들어간 그늘
  local(S, x); x.beginPath(); path(x); x.lineWidth = (o.rim ?? 2.4); x.strokeStyle = 'rgba(25,12,4,0.22)'; x.filter = `blur(${r * 0.9}px)`; x.stroke(); x.filter = 'none';
  x.setTransform(1, 0, 0, 1, 0, 0);
  // 섬유 결
  const [hh, ss, ll] = hslOf(col), n = Math.min(90000, area * (o.dens ?? 0.05) * 1.8);
  x.lineCap = 'round';
  for (let k = 0; k < n; k++) {
    const px = x0 + R() * bw | 0, py = y0 + R() * bh | 0;
    if (img[(py * W + px) * 4 + 3] < 128) continue;
    const a = R() * Math.PI * 2, len = r * (0.4 + R() * 1.1) * (o.fib ?? 1), bend = (R() - 0.5) * len;
    const dl = (R() - 0.45) * (o.jit ?? 0.09), lit = R() < 0.5;
    x.strokeStyle = hsl(hh + (R() - 0.5) * 6, ss * (0.9 + R() * 0.2), ll + dl + (ll < 0.25 ? 0.05 : 0), 0.22 + R() * 0.34);
    x.lineWidth = r * (0.1 + R() * 0.14);
    x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a) * len / 2 - Math.sin(a) * bend, py + Math.sin(a) * len / 2 + Math.cos(a) * bend, px + Math.cos(a) * len, py + Math.sin(a) * len); x.stroke();
    if (lit && R() < 0.08) { x.fillStyle = 'rgba(255,250,236,0.18)'; x.fillRect(px, py, r * 0.25, r * 0.25); }
  }
  // 보풀: 가장자리 바깥으로 삐친 털
  x.globalCompositeOperation = 'source-over';
  const fuzz = o.fuzz ?? 1, step = Math.max(1, Math.round(r * 0.5)), d = Math.max(2, Math.round(r * 0.8));
  const al = (i, y) => (i < 0 || y < 0 || i >= W || y >= H) ? 0 : img[(y * W + i) * 4 + 3];
  for (let y = y0; y <= y1; y += step) for (let i = x0; i <= x1; i += step) {
    if (al(i, y) < 128) continue;
    const gx = al(i + d, y) - al(i - d, y), gy = al(i, y + d) - al(i, y - d);
    if (Math.abs(gx) + Math.abs(gy) < 200 || R() > 0.55 * fuzz) continue;
    const m = Math.hypot(gx, gy), nx = -gx / m, ny = -gy / m, a = Math.atan2(ny, nx) + (R() - 0.5) * 1.6, len = r * (0.4 + R() * 1.3) * fuzz;
    x.strokeStyle = hsl(hh, ss * 0.9, ll + 0.03 + (R() - 0.5) * 0.06, 0.2 + R() * 0.3); x.lineWidth = r * (0.08 + R() * 0.1);
    x.beginPath(); x.moveTo(i, y); x.quadraticCurveTo(i + Math.cos(a + 0.6) * len * 0.5, y + Math.sin(a + 0.6) * len * 0.5, i + Math.cos(a) * len, y + Math.sin(a) * len); x.stroke();
  }
  const g = S.g; g.save();
  // 털 뭉치 둘레의 보송한 번짐
  g.save(); g.globalAlpha = 0.35 * (o.alpha ?? 1) * Math.min(1, fuzz); g.filter = `blur(${r * 0.7}px)`; g.drawImage(c, 0, 0); g.restore();
  if (o.shadow !== false) { g.shadowColor = `rgba(30,14,4,${o.sha ?? 0.32})`; g.shadowBlur = r * (o.sb ?? 2.2); g.shadowOffsetY = r * (o.sy ?? 1); g.shadowOffsetX = r * 0.3; }
  if (o.alpha != null) g.globalAlpha = o.alpha;
  g.drawImage(c, 0, 0); g.restore();
}

// 유리구슬 눈
export function bead(S, x, y, rad, col = '#14100c') {
  const g = S.g; g.save(); local(S, g);
  const gr = g.createRadialGradient(x - rad * 0.35, y - rad * 0.4, rad * 0.1, x, y, rad);
  gr.addColorStop(0, tone(col, 0.28)); gr.addColorStop(0.5, col); gr.addColorStop(1, tone(col, -0.06));
  g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = S.res * 0.8; g.shadowOffsetY = S.res * 0.3;
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill(); g.shadowColor = 'transparent';
  g.fillStyle = 'rgba(255,255,255,0.95)'; g.beginPath(); g.ellipse(x - rad * 0.32, y - rad * 0.38, rad * 0.3, rad * 0.22, -0.5, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.4)'; g.beginPath(); g.arc(x + rad * 0.35, y + rad * 0.35, rad * 0.12, 0, Math.PI * 2); g.fill();
  g.restore();
}
// 나무·쇠처럼 펠트가 아닌 소품은 그대로 그린다
export function prop(S, fn) { const g = S.g; g.save(); local(S, g); fn(g, S.res); g.restore(); }

// 바느질 땀
export function stitch(S, pts, col = 'rgba(255,240,210,0.7)', w = 0.6, dash = 2.2) {
  prop(S, g => { g.setLineDash([dash, dash * 0.9]); g.lineCap = 'round'; g.strokeStyle = col; g.lineWidth = w; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); });
}

// 종이·수채 질감 무늬
export function noiseTex(size, seed, oct = 5) {
  const R = rng(seed), c = mk(size, size), x = c.getContext('2d');
  for (let o = 0; o < oct; o++) {
    const cells = 4 << o, cs = size / cells, a = 0.5 / (o + 1);
    for (let j = 0; j < cells; j++) for (let i = 0; i < cells; i++) { const v = R(); x.fillStyle = `rgba(${v > 0.5 ? '255,255,255' : '0,0,0'},${Math.abs(v - 0.5) * a})`; x.fillRect(i * cs, j * cs, cs + 1, cs + 1); }
    if (o < oct - 1) { const t = mk(size, size), tx = t.getContext('2d'); tx.filter = `blur(${cs * 0.6}px)`; tx.drawImage(c, 0, 0); x.clearRect(0, 0, size, size); x.drawImage(t, 0, 0); }
  }
  return c;
}
export function grainTex(size, seed, amt = 0.08) {
  const R = rng(seed), c = mk(size, size), x = c.getContext('2d'), id = x.createImageData(size, size);
  for (let i = 0; i < size * size; i++) { const v = R() < 0.5 ? 0 : 255; id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = R() * 255 * amt; }
  x.putImageData(id, 0, 0);
  // 한지 섬유
  for (let k = 0; k < size * 0.6; k++) { const px = R() * size, py = R() * size, a = R() * 6.28, l = 6 + R() * 22; x.strokeStyle = `rgba(${R() < 0.5 ? '255,255,250' : '120,100,70'},${0.05 + R() * 0.08})`; x.lineWidth = 0.6; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a + 1) * l / 2, py + Math.sin(a + 1) * l / 2, px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke(); }
  return c;
}
