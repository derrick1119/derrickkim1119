// 무대 배경: 한지 수채 하늘, 금테 청록 종이산, 부조 구름, 이끼 땅, 바위, 소나무, 물
import { rng, mk, tone, grainTex } from './felt.js';

const TAU = Math.PI * 2, DPR = 2;
export const W = 1280, H = 720;

// 값 노이즈(fbm) → 알파 가면
const masks = new Map();
export function fbm(size, seed, base = 4, oct = 5, gain = 0.55, contrast = 1.6) {
  const key = [size, seed, base, oct, contrast].join(); if (masks.has(key)) return masks.get(key);
  const R = rng(seed), c = mk(size, size), x = c.getContext('2d'), id = x.createImageData(size, size), acc = new Float32Array(size * size);
  let amp = 1, tot = 0;
  for (let o = 0; o < oct; o++) {
    const n = base << o, grid = new Float32Array((n + 1) * (n + 1)); for (let i = 0; i < grid.length; i++) grid[i] = R();
    for (let y = 0; y < size; y++) { const fy = y / size * n, iy = fy | 0, ty = fy - iy, sy = ty * ty * (3 - 2 * ty);
      for (let i = 0; i < size; i++) { const fx = i / size * n, ix = fx | 0, tx = fx - ix, sx = tx * tx * (3 - 2 * tx), a = grid[iy * (n + 1) + ix], b = grid[iy * (n + 1) + ix + 1], cc = grid[(iy + 1) * (n + 1) + ix], d = grid[(iy + 1) * (n + 1) + ix + 1];
        acc[y * size + i] += amp * ((a + (b - a) * sx) + ((cc + (d - cc) * sx) - (a + (b - a) * sx)) * sy); } }
    tot += amp; amp *= gain;
  }
  for (let i = 0; i < size * size; i++) { const v = Math.max(0, Math.min(1, (acc[i] / tot - 0.5) * contrast + 0.5)); id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = 255; id.data[i * 4 + 3] = v * 255; }
  x.putImageData(id, 0, 0); masks.set(key, c); return c;
}
let GRAIN;
export function grain(g, a = 0.5) { GRAIN = GRAIN || grainTex(512, 7, 0.09); g.save(); g.globalAlpha = a; g.globalCompositeOperation = 'overlay'; g.fillStyle = g.createPattern(GRAIN, 'repeat'); g.fillRect(0, 0, W, H); g.restore(); }

// 수채 번짐 한 자국
export function wash(g, x, y, rx, ry, col, a, seed = 1, rot = 0, comp = 'source-over') {
  const w = Math.ceil(rx * 2), h = Math.ceil(ry * 2), c = mk(w, h), cx = c.getContext('2d');
  cx.save(); cx.translate(w / 2, h / 2); cx.scale(1, ry / rx);
  const gr = cx.createRadialGradient(0, 0, 0, 0, 0, rx); gr.addColorStop(0, tone(col, 0, a)); gr.addColorStop(0.6, tone(col, 0, a * 0.8)); gr.addColorStop(1, tone(col, 0, 0));
  cx.fillStyle = gr; cx.beginPath(); cx.arc(0, 0, rx, 0, TAU); cx.fill(); cx.restore();
  cx.globalCompositeOperation = 'destination-in'; cx.drawImage(fbm(128, seed, 3, 5, 0.55, 2.2), 0, 0, w, h);
  g.save(); g.globalCompositeOperation = comp; g.translate(x, y); g.rotate(rot); g.drawImage(c, -w / 2, -h / 2); g.restore();
}

// 하늘: 따뜻한 한지 + 푸른 번짐 + 붉은 해
export function sky(g, o = {}) {
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#e9e1d4'); gr.addColorStop(0.45, '#f2e7d5'); gr.addColorStop(1, '#f1e2cb');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  wash(g, 1040, 70, 420, 150, '#8fb2c9', 0.42, 11, -0.05);
  wash(g, 800, 30, 300, 90, '#9dbdd0', 0.3, 12);
  wash(g, 300, 260, 520, 120, '#f0c7a8', 0.28, 13);
  wash(g, 640, 320, 700, 110, '#f6dcc0', 0.35, 14);
  const sx = o.sunX ?? 300, sy = o.sunY ?? 120, sr = o.sunR ?? 52;
  // 붉은 해: 가장자리가 번진 물감 원 (따로 그려 하늘에 얹는다)
  { const pad = 6, d = Math.ceil((sr + pad) * 2), c = mk(d * 2, d * 2), x = c.getContext('2d'); x.scale(2, 2);
    const sg = x.createRadialGradient(d / 2 - sr * 0.3, d / 2 - sr * 0.3, 0, d / 2, d / 2, sr); sg.addColorStop(0, '#ee7a62'); sg.addColorStop(0.7, '#e25a4b'); sg.addColorStop(1, '#d4483f');
    x.filter = 'blur(1.2px)'; x.fillStyle = sg; x.beginPath(); x.arc(d / 2, d / 2, sr, 0, TAU); x.fill(); x.filter = 'none';
    x.globalCompositeOperation = 'source-atop'; x.globalAlpha = 0.3; x.drawImage(fbm(128, 21, 6, 4, 0.6, 2.6), d / 2 - sr, d / 2 - sr, sr * 2, sr * 2);
    g.drawImage(c, sx - d / 2, sy - d / 2, d, d); }
  wash(g, sx, sy, sr * 1.6, sr * 1.5, '#f08a72', 0.18, 22);
  // 해를 가로지르는 분홍 안개 띠
  wash(g, sx + 40, sy + sr * 0.55, sr * 3.2, 16, '#eba59a', 0.55, 23);
  wash(g, sx + 160, sy + sr * 0.95, sr * 3.8, 14, '#efb4a5', 0.45, 24);
  wash(g, sx - 60, sy + sr * 1.2, sr * 2.2, 10, '#f0c0b0', 0.4, 25);
}

// 금테 두른 청록 종이산
const MCOL = [['#25506f', '#3c7a72', '#a99258'], ['#2c6285', '#4f8b74', '#b9a065'], ['#1f4a63', '#3d7266', '#9b8650'], ['#346f86', '#5b9579', '#c2a96b']];
function ridge(R, x0, x1, base, px, py) {
  const pts = [[x0, base]], n = 6;
  for (let i = 1; i < n; i++) { const t = i / n, e = Math.pow(t, 0.8 + R() * 0.5), x = x0 + (px - x0) * t + (R() - 0.5) * 14, y = base + (py - base) * e + (R() - 0.5) * 20; pts.push([x, y]); if (R() < 0.45) pts.push([x + (px - x0) / n * 0.45, y + (R() < 0.5 ? 2 : -6)]); }
  pts.push([px - 6 - R() * 6, py + 4 + R() * 3]); pts.push([px, py]); pts.push([px + 5 + R() * 8, py + 3 + R() * 5]);
  for (let i = 1; i < n; i++) { const t = i / n, e = Math.pow(t, 1.1 + R() * 0.4), x = px + (x1 - px) * t + (R() - 0.5) * 14, y = py + (base - py) * e + (R() - 0.5) * 20; pts.push([x, y]); if (R() < 0.45) pts.push([x + (x1 - px) / n * 0.45, y + (R() < 0.5 ? -2 : 6)]); }
  pts.push([x1, base]); return pts;
}
function poly(g, pts) { g.beginPath(); pts.forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b)); g.closePath(); }
export function mountain(g, x0, x1, base, px, py, seed, o = {}) {
  const R = rng(seed), outer = ridge(R, x0, x1, base, px, py, true), cx = px, bands = o.bands ?? 4, pal = MCOL[seed % MCOL.length];
  for (let k = 0; k < bands; k++) {
    const s = 1 - k * 0.2, sx = 1 - k * 0.06, pts = outer.map(([x, y]) => [cx + (x - cx) * sx + (k ? (R() - 0.5) * 4 : 0), base - (base - y) * s]);
    const top = base - (base - py) * s, gr = g.createLinearGradient(0, top, 0, base);
    const c0 = MCOL[(seed + k) % MCOL.length];
    gr.addColorStop(0, tone(c0[0], k * 0.02)); gr.addColorStop(0.55, c0[1]); gr.addColorStop(1, c0[2]);
    g.save(); g.shadowColor = 'rgba(14,26,34,0.45)'; g.shadowBlur = 8; g.shadowOffsetY = 3; g.shadowOffsetX = 1;
    g.fillStyle = gr; poly(g, pts); g.fill(); g.restore();
    // 물감 얼룩 + 세로 붓자국
    g.save(); poly(g, pts); g.clip();
    g.globalAlpha = 0.5; g.globalCompositeOperation = 'soft-light'; g.drawImage(fbm(128, seed * 7 + k, 5, 5, 0.6, 2.4), x0, top, x1 - x0, base - top);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    const RR = rng(seed * 31 + k);
    for (let s2 = 0; s2 < 16; s2++) { const xx = x0 + RR() * (x1 - x0), lg = g.createLinearGradient(0, top, 0, base); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, `rgba(${RR() < 0.5 ? '20,40,50' : '250,240,210'},${0.05 + RR() * 0.07})`); lg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = lg; g.fillRect(xx, top, 2 + RR() * 7, base - top); }
    // 금가루
    for (let s2 = 0; s2 < 26; s2++) { const xx = x0 + RR() * (x1 - x0), yy = top + RR() * (base - top) * 0.7; g.fillStyle = `rgba(226,186,96,${0.3 + RR() * 0.5})`; g.beginPath(); g.arc(xx, yy, 0.5 + RR() * 1.1, 0, TAU); g.fill(); }
    g.restore();
    // 금테
    g.save(); const gg = g.createLinearGradient(x0, top, x1, base); gg.addColorStop(0, '#f6dc94'); gg.addColorStop(0.35, '#c9993c'); gg.addColorStop(0.6, '#f0cf7c'); gg.addColorStop(1, '#a87a2a');
    g.strokeStyle = gg; g.lineWidth = o.gold ?? 2.2; g.lineJoin = 'round'; g.beginPath(); pts.slice(0, -1).forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b)); g.stroke();
    g.strokeStyle = 'rgba(255,248,220,0.6)'; g.lineWidth = 0.6; g.stroke(); g.restore();
  }
}

// 부조 구름(운문): 겹친 종이를 오려 붙인 듯
function spiral(g, x, y, r, dir = 1) { g.beginPath(); for (let t = 0; t < 2.4 * Math.PI; t += 0.12) { const rr = r * (1 - t / (2.6 * Math.PI)); const a = t * dir; t ? g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.stroke(); }
export function cloud(g, x, y, s, flip = false, o = {}) {
  g.save(); g.translate(x, y); g.scale(flip ? -s : s, s);
  const lobes = o.lobes || [[0, 0, 20], [24, -12, 25], [52, -6, 21], [76, 0, 15], [12, -26, 14], [40, -30, 16], [96, 4, 11]];
  const body = () => { g.beginPath(); for (const [lx, ly, r] of lobes) { g.moveTo(lx + r, ly); g.arc(lx, ly, r, 0, TAU); } g.moveTo(-14, 10); g.quadraticCurveTo(40, 26, 120, 8); g.quadraticCurveTo(150, 2, 170, -6); g.quadraticCurveTo(140, 12, 90, 20); g.quadraticCurveTo(30, 26, -10, 16); g.closePath(); };
  // 종이 두께(아래 그늘진 옆면)
  g.save(); g.translate(0, 3.5); g.fillStyle = o.edge || '#d9b8a8'; g.shadowColor = 'rgba(90,50,40,0.35)'; g.shadowBlur = 12; g.shadowOffsetY = 6; body(); g.fill(); g.restore();
  const gr = g.createLinearGradient(0, -34, 0, 26); gr.addColorStop(0, '#fffaf1'); gr.addColorStop(0.55, '#f6ebde'); gr.addColorStop(1, o.tint || '#efcdc0');
  g.fillStyle = gr; body(); g.fill();
  g.save(); body(); g.clip(); g.globalAlpha = 0.35; g.globalCompositeOperation = 'multiply'; g.drawImage(fbm(128, 41, 5, 4, 0.6, 2), -30, -40, 220, 70); g.restore();
  g.lineCap = 'round';
  for (const [lx, ly, r] of lobes) { if (r < 15) continue; g.strokeStyle = 'rgba(205,170,150,0.75)'; g.lineWidth = 2.2; spiral(g, lx + 1, ly + 1, r * 0.62); g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 1.1; spiral(g, lx, ly, r * 0.62); }
  g.strokeStyle = 'rgba(200,160,140,0.5)'; g.lineWidth = 0.8; body(); g.stroke();
  if (o.gold) { g.strokeStyle = 'rgba(214,170,80,0.7)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-10, 18); g.quadraticCurveTo(60, 28, 150, 4); g.stroke(); }
  g.restore();
}

// 물 (투명 수지처럼 반짝이는 푸른 물)
export function water(g, top, bot, seed) {
  const R = rng(seed);
  g.save(); g.beginPath(); top.forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b)); for (let i = bot.length - 1; i >= 0; i--) g.lineTo(bot[i][0], bot[i][1]); g.closePath();
  const y0 = Math.min(...top.map(p => p[1])), y1 = Math.max(...bot.map(p => p[1]));
  const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, '#7aa6c4'); gr.addColorStop(0.5, '#3f7aa6'); gr.addColorStop(1, '#2e5f8a');
  g.fillStyle = gr; g.fill(); g.clip();
  g.globalAlpha = 0.4; g.globalCompositeOperation = 'soft-light'; g.drawImage(fbm(128, seed, 4, 5, 0.6, 2), 0, y0, W, y1 - y0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  g.lineCap = 'round';
  for (let k = 0; k < 70; k++) { const x = R() * W, y = y0 + R() * (y1 - y0), l = 10 + R() * 40; g.strokeStyle = `rgba(235,248,255,${0.25 + R() * 0.45})`; g.lineWidth = 0.6 + R() * 1.2; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + l * 0.3, y - 2, x + l * 0.6, y + 2, x + l, y); g.stroke(); }
  for (let k = 0; k < 90; k++) { const x = R() * W, y = y0 + R() * (y1 - y0); g.fillStyle = `rgba(255,255,255,${0.5 + R() * 0.5})`; g.beginPath(); g.arc(x, y, 0.4 + R() * 0.9, 0, TAU); g.fill(); }
  g.restore();
  // 물가 조약돌
  for (const edge of [top, bot]) { const pts = []; for (let i = 0; i < edge.length - 1; i++) for (let t = 0; t < 1; t += 0.02) pts.push([edge[i][0] + (edge[i + 1][0] - edge[i][0]) * t, edge[i][1] + (edge[i + 1][1] - edge[i][1]) * t]);
    for (const [px, py] of pts) { if (R() < 0.45) continue; const rw = 3 + R() * 7, rh = rw * (0.5 + R() * 0.2), gx = px + (R() - 0.5) * 8, gy = py + (R() - 0.5) * 3 + (edge === top ? 1 : -1);
      const pg = g.createLinearGradient(gx, gy - rh, gx, gy + rh); const c0 = ['#b4b0a8', '#9d9992', '#c7c1b4', '#8c8780'][(R() * 4) | 0]; pg.addColorStop(0, tone(c0, 0.1)); pg.addColorStop(1, tone(c0, -0.15));
      g.save(); g.shadowColor = 'rgba(20,30,30,0.4)'; g.shadowBlur = 3; g.shadowOffsetY = 1.5; g.fillStyle = pg; g.beginPath(); g.ellipse(gx, gy, rw, rh, (R() - 0.5) * 0.3, 0, TAU); g.fill(); g.restore(); } }
  // 물가 젖은 그늘
  g.save(); g.strokeStyle = 'rgba(30,50,40,0.35)'; g.lineWidth = 3; g.filter = 'blur(2px)'; g.beginPath(); top.forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b)); g.stroke(); g.restore();
}
export function waterfall(g, x, y, w, h, seed) {
  const R = rng(seed);
  g.save(); const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, 'rgba(200,225,240,0.9)'); gr.addColorStop(1, 'rgba(240,250,255,0.95)');
  g.fillStyle = gr; g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y); g.quadraticCurveTo(x + w + 4, y + h * 0.6, x + w + 6, y + h); g.lineTo(x - 6, y + h); g.quadraticCurveTo(x - 4, y + h * 0.6, x, y); g.fill();
  for (let k = 0; k < 40; k++) { const xx = x + R() * w; g.strokeStyle = `rgba(${R() < 0.5 ? '255,255,255' : '120,170,200'},${0.3 + R() * 0.5})`; g.lineWidth = 0.6 + R(); g.beginPath(); g.moveTo(xx, y + R() * 6); g.lineTo(xx + (xx - x - w / 2) * 0.15, y + h); g.stroke(); }
  for (let k = 0; k < 30; k++) { g.fillStyle = `rgba(255,255,255,${0.4 + R() * 0.5})`; g.beginPath(); g.arc(x - 8 + R() * (w + 16), y + h - 4 + R() * 8, 2 + R() * 5, 0, TAU); g.fill(); }
  g.restore();
}

// 바위: 화강암 알갱이
export function rock(g, x, y, w, h, seed, o = {}) {
  if (o.facet) return crag(g, x, y, w, h, seed, o);
  const R = rng(seed), n = 9, pts = [];
  for (let i = 0; i < n; i++) { const a = Math.PI + i / (n - 1) * Math.PI, rr = 0.82 + R() * 0.22; pts.push([x + Math.cos(a) * w / 2 * rr, y + Math.sin(a) * h * rr * (i === 0 || i === n - 1 ? 0 : 1)]); }
  const path = () => { g.beginPath(); g.moveTo(pts[0][0], y); for (let i = 1; i < n; i++) { const p = pts[i - 1], q = pts[i]; g.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); } g.lineTo(pts[n - 1][0], y); g.quadraticCurveTo(x, y + h * 0.08, pts[0][0], y); g.closePath(); };
  g.save(); const sg = g.createRadialGradient(x, y, 0, x, y, w * 0.7); sg.addColorStop(0, 'rgba(30,26,14,0.45)'); sg.addColorStop(1, 'rgba(30,26,14,0)'); g.fillStyle = sg; g.save(); g.translate(x, y); g.scale(1, 0.25); g.beginPath(); g.arc(0, 0, w * 0.7, 0, TAU); g.fill(); g.restore();
  const base = o.col || '#8e8b86', gr = g.createLinearGradient(x - w / 2, y - h, x + w / 3, y);
  gr.addColorStop(0, tone(base, 0.16)); gr.addColorStop(0.5, base); gr.addColorStop(1, tone(base, -0.18));
  g.fillStyle = gr; path(); g.fill(); g.clip();
  const n2 = Math.min(4000, w * h * 0.5);
  for (let k = 0; k < n2; k++) { const px = x - w / 2 + R() * w, py = y - h + R() * h, d = R(); g.fillStyle = d < 0.45 ? `rgba(40,36,34,${0.25 + R() * 0.4})` : d < 0.8 ? `rgba(240,236,228,${0.2 + R() * 0.35})` : `rgba(150,120,95,${0.3})`; g.fillRect(px, py, 0.5 + R() * 1.2, 0.5 + R() * 1.2); }
  const hl = g.createRadialGradient(x - w * 0.2, y - h * 0.9, 0, x - w * 0.2, y - h * 0.9, w * 0.5); hl.addColorStop(0, 'rgba(255,240,215,0.35)'); hl.addColorStop(1, 'rgba(255,240,215,0)'); g.fillStyle = hl; g.fillRect(x - w, y - h * 2, w * 2, h * 2);
  if (o.moss) for (let k = 0; k < w * 3; k++) { const px = x - w * 0.35 + R() * w * 0.6, py = y - h * (0.75 + R() * 0.3); g.fillStyle = ['#6f8f3e', '#8aa94d', '#a7b95c', '#56752f'][k % 4]; g.globalAlpha = 0.8; g.beginPath(); g.arc(px, py, 0.6 + R() * 1.6, 0, TAU); g.fill(); }
  g.restore();
  g.save(); g.strokeStyle = 'rgba(40,34,30,0.35)'; g.lineWidth = 1; path(); g.stroke(); g.restore();
}

// 분재 같은 소나무
export function pine(g, x, y, s, seed, o = {}) {
  const R = rng(seed);
  g.save(); g.translate(x, y); g.scale(s, s);
  const lean = (R() - 0.5) * 30, top = [lean, -120];
  const trunk = (w0, w1) => { g.beginPath(); g.moveTo(-w0, 0); g.bezierCurveTo(-w0 + lean * 0.2 - 8, -40, lean * 0.6 + 10 - w1, -80, top[0] - w1, top[1]); g.lineTo(top[0] + w1, top[1]); g.bezierCurveTo(lean * 0.6 + 10 + w1, -80, w0 + lean * 0.2 - 8, -40, w0, 0); g.closePath(); };
  const tg = g.createLinearGradient(-10, 0, 10, 0); tg.addColorStop(0, '#5a2a1c'); tg.addColorStop(0.45, '#9a5238'); tg.addColorStop(1, '#4a2216');
  g.fillStyle = tg; g.shadowColor = 'rgba(30,14,4,0.4)'; g.shadowBlur = 6; g.shadowOffsetY = 2; trunk(9, 4); g.fill(); g.shadowColor = 'transparent';
  g.save(); trunk(9, 4); g.clip(); g.strokeStyle = 'rgba(40,16,8,0.45)'; g.lineWidth = 0.8; for (let k = 0; k < 20; k++) { const yy = -R() * 120; g.beginPath(); g.moveTo(-10 + lean * (-yy / 200), yy); g.quadraticCurveTo(lean * (-yy / 120), yy - 3, 10 + lean * (-yy / 200), yy - 1); g.stroke(); } g.restore();
  const pads = o.pads || [[top[0], top[1] - 6, 34, 13], [top[0] - 30, -88, 28, 11], [top[0] + 26, -78, 26, 10], [top[0] - 18, -58, 22, 9]];
  for (const [px, py, rx, ry] of pads) {
    if (Math.abs(px - top[0]) > 4) { g.strokeStyle = '#6a3424'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(lean * 0.5 * (-py / 120), py + 8); g.quadraticCurveTo((px + lean * 0.5) / 2, py + 10, px, py + 2); g.stroke(); }
  }
  for (const [px, py, rx, ry] of pads) {
    const blobs = []; for (let b = 0; b < 6; b++) { const t = (b / 5 - 0.5) * 2; blobs.push([px + t * rx * 0.62 + (R() - 0.5) * 4, py + Math.abs(t) * ry * 0.25 + (R() - 0.5) * 3, rx * (0.42 + R() * 0.16) * (1 - Math.abs(t) * 0.25), ry * (0.85 + R() * 0.3)]); }
    blobs.push([px + (R() - 0.5) * rx * 0.3, py - ry * 0.45, rx * 0.4, ry * 0.7]);
    const shape = () => { g.beginPath(); for (const [bx, by, brx, bry] of blobs) { g.moveTo(bx + brx, by); g.ellipse(bx, by, brx, bry, 0, 0, TAU); } };
    g.save(); g.shadowColor = 'rgba(10,20,8,0.5)'; g.shadowBlur = 10; g.shadowOffsetY = 5; g.fillStyle = '#2a4227'; shape(); g.fill(); g.restore();
    g.save(); shape(); g.clip();
    const lg = g.createLinearGradient(0, py - ry * 1.3, 0, py + ry); lg.addColorStop(0, 'rgba(150,180,100,0.55)'); lg.addColorStop(0.5, 'rgba(80,110,60,0.1)'); lg.addColorStop(1, 'rgba(10,20,8,0.35)'); g.fillStyle = lg; g.fillRect(px - rx * 1.5, py - ry * 2, rx * 3, ry * 4);
    for (let k = 0; k < rx * ry * 2.2; k++) { const qx = px + (R() - 0.5) * rx * 2.2, qy = py - ry * 1.4 + R() * ry * 2.6, up = (py - qy) / ry; g.fillStyle = up > 0.25 ? ['#6f914f', '#83a35a', '#5d7f45'][k % 3] : up > -0.2 ? ['#3f5f37', '#4b6b3e', '#36522f'][k % 3] : ['#25381f', '#2d4527'][k % 2]; g.globalAlpha = 0.75; g.beginPath(); g.arc(qx, qy, 0.6 + R() * 1.3, 0, TAU); g.fill(); }
    g.restore();
    g.save(); g.lineCap = 'round'; for (let k = 0; k < rx * 2.5; k++) { const [bx, by, brx, bry] = blobs[(R() * blobs.length) | 0], a = Math.PI * (1.1 + R() * 0.8), qx = bx + Math.cos(a) * brx, qy = by + Math.sin(a) * bry; g.strokeStyle = `rgba(${R() < 0.5 ? '140,170,100' : '70,100,55'},0.7)`; g.lineWidth = 0.7; g.beginPath(); g.moveTo(qx, qy); g.lineTo(qx + (R() - 0.5) * 3, qy - 1 - R() * 3.5); g.stroke(); } g.restore();
  }
  g.restore();
}

// 이끼 덮인 땅
const MOSS = ['#6f8f3e', '#86a54b', '#9fb557', '#58772f', '#b8bf63', '#4b6a2a', '#7d9a44'];
export function moss(g, edge, seed, o = {}) {
  const R = rng(seed), y0 = Math.min(...edge.map(p => p[1]));
  g.save(); g.beginPath(); edge.forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b)); g.lineTo(W + 20, H + 20); g.lineTo(-20, H + 20); g.closePath();
  const gr = g.createLinearGradient(0, y0, 0, H); gr.addColorStop(0, o.back || '#9aad62'); gr.addColorStop(0.35, '#738f40'); gr.addColorStop(1, '#4f6e2c');
  g.fillStyle = gr; g.shadowColor = 'rgba(30,40,20,0.35)'; g.shadowBlur = 10; g.shadowOffsetY = -2; g.fill(); g.shadowColor = 'transparent'; g.clip();
  g.globalAlpha = 0.5; g.globalCompositeOperation = 'soft-light'; g.drawImage(fbm(128, seed, 6, 5, 0.6, 2.2), 0, y0, W, H - y0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  // 흙길
  if (o.path) { const P = o.path; g.save(); g.beginPath(); P.forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b)); g.closePath(); g.filter = 'blur(3px)'; g.fillStyle = 'rgba(150,112,72,0.85)'; g.fill(); g.filter = 'none'; g.clip();
    for (let k = 0; k < 5000; k++) { const px = R() * W, py = y0 + R() * (H - y0); g.fillStyle = ['#a8825a', '#8a6644', '#c09a6c', '#76553a'][k % 4]; g.globalAlpha = 0.6; g.fillRect(px, py, 1 + R() * 1.5, 1 + R()); } g.restore(); }
  // 이끼 뭉치: 그늘진 아랫면, 볕 받는 윗면
  const NC = Math.round((o.n || 26000) / 45);
  for (let k = 0; k < NC; k++) {
    const py = y0 + 6 + Math.pow(R(), 0.9) * (H - y0), px = R() * W, d = (py - y0) / (H - y0), rr = 1.5 + d * 6 + Math.pow(R(), 2) * 12 * (0.4 + d);
    g.globalAlpha = 0.25 + R() * 0.3; g.fillStyle = 'rgba(30,48,16,0.55)'; g.beginPath(); g.ellipse(px, py + rr * 0.25, rr * 1.1, rr * 0.45, 0, 0, TAU); g.fill();
    const hue = R(); g.globalAlpha = 1;
    for (let q = 0; q < 10 + rr * 3; q++) { const a = R() * TAU, m = Math.sqrt(R()), qx = px + Math.cos(a) * rr * m, qy = py + Math.sin(a) * rr * 0.55 * m, up = (py - qy) / (rr * 0.55) + 0.2;
      g.fillStyle = up > 0.45 ? (hue < 0.5 ? '#a9bd5e' : '#bcc56a') : up > 0 ? (hue < 0.5 ? '#7f9e45' : '#8fa84c') : '#557530';
      g.globalAlpha = 0.6 + R() * 0.4; g.beginPath(); g.arc(qx, qy, 0.5 + d * 1.3 + R() * (0.5 + d), 0, TAU); g.fill(); }
  }
  // 이끼 알갱이: 앞일수록 크다
  const N = (o.n || 26000) * 0.5;
  for (let k = 0; k < N; k++) {
    const py = y0 + Math.pow(R(), 0.8) * (H - y0 + 10), px = R() * W, d = (py - y0) / (H - y0), r = 0.4 + d * 1.6 + R() * (0.6 + d);
    if (o.path && g.isPointInPath && false) continue;
    g.globalAlpha = 0.3 + R() * 0.4; g.fillStyle = MOSS[(R() * MOSS.length) | 0]; g.beginPath(); g.arc(px, py, r * 0.8, 0, TAU); g.fill();
  }
  // 풀잎
  g.lineCap = 'round';
  for (let k = 0; k < 900; k++) { const py = y0 + R() * (H - y0), px = R() * W, d = (py - y0) / (H - y0), l = 2 + d * 8; g.globalAlpha = 0.6; g.strokeStyle = ['#a9c062', '#6d8f3c', '#c7c97a'][k % 3]; g.lineWidth = 0.5 + d * 0.6; g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo(px + (R() - 0.5) * 3, py - l * 0.6, px + (R() - 0.5) * 5, py - l); g.stroke(); }
  g.restore();
}

// 작은 꽃(흰 꽃, 노란 꽃), 붉은 고사리, 진달래 덤불
export function flowers(g, x, y, s, seed, kind = 'white') {
  const R = rng(seed), col = kind === 'white' ? '#fbf6ea' : kind === 'yellow' ? '#f2cf5a' : '#d94f86';
  for (let k = 0; k < 5; k++) { const fx = x + (R() - 0.5) * 30 * s, fy = y + (R() - 0.5) * 8 * s; g.strokeStyle = '#5c7a35'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(fx, fy + 6 * s); g.lineTo(fx, fy); g.stroke();
    for (let p = 0; p < 5; p++) { const a = p / 5 * TAU; g.fillStyle = col; g.beginPath(); g.arc(fx + Math.cos(a) * 2 * s, fy + Math.sin(a) * 2 * s, 1.6 * s, 0, TAU); g.fill(); }
    g.fillStyle = '#e8b13a'; g.beginPath(); g.arc(fx, fy, 1 * s, 0, TAU); g.fill(); }
}
export function fern(g, x, y, s, seed, flip = 1) {
  const R = rng(seed); g.save(); g.translate(x, y); g.scale(s * flip, s);
  for (let f = 0; f < 3; f++) { const a = -1.2 + f * 0.5 + (R() - 0.5) * 0.2; g.save(); g.rotate(a + 1.57); g.strokeStyle = '#a3432b'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-4, -20, 2, -40); g.stroke();
    for (let k = 0; k < 9; k++) { const t = k / 9, py = -t * 38, l = (1 - t) * 9 + 2; g.fillStyle = ['#c4573a', '#b0472f', '#d06a45'][k % 3]; for (const d of [-1, 1]) { g.beginPath(); g.moveTo(0, py); g.quadraticCurveTo(d * l * 0.6, py - 3, d * l, py - 1); g.quadraticCurveTo(d * l * 0.5, py + 1, 0, py + 1.5); g.fill(); } } g.restore(); }
  g.restore();
}
export function azalea(g, x, y, s, seed) {
  const R = rng(seed);
  g.save(); g.fillStyle = '#3f5f2c'; g.shadowColor = 'rgba(20,30,10,0.4)'; g.shadowBlur = 6; g.shadowOffsetY = 3; g.beginPath(); g.ellipse(x, y - 8 * s, 22 * s, 12 * s, 0, 0, TAU); g.fill(); g.restore();
  for (let k = 0; k < 120; k++) { const a = R() * TAU, r = Math.sqrt(R()); g.fillStyle = ['#4f7034', '#5f8140', '#3a5726'][k % 3]; g.beginPath(); g.arc(x + Math.cos(a) * 20 * s * r, y - 8 * s + Math.sin(a) * 11 * s * r, 1.2 * s, 0, TAU); g.fill(); }
  for (let k = 0; k < 9; k++) { const fx = x + (R() - 0.5) * 36 * s, fy = y - 8 * s + (R() - 0.7) * 16 * s; for (let p = 0; p < 5; p++) { const a = p / 5 * TAU + 0.3; g.fillStyle = p % 2 ? '#d64a7c' : '#e2679a'; g.beginPath(); g.ellipse(fx + Math.cos(a) * 2.6 * s, fy + Math.sin(a) * 2.6 * s, 2.4 * s, 1.7 * s, a, 0, TAU); g.fill(); } g.fillStyle = '#f7d9e3'; g.beginPath(); g.arc(fx, fy, 1 * s, 0, TAU); g.fill(); }
}

// 빛줄기와 마감 색보정
export function rays(g, x, y, ang, n, seed, a = 0.16) {
  const R = rng(seed); g.save(); g.globalCompositeOperation = 'screen';
  g.filter = 'blur(6px)';
  for (let k = 0; k < n; k++) { const t = ang + (R() - 0.5) * 0.6, l = 1000, w = 30 + R() * 70, sx = x + Math.cos(t) * 90 + (R() - 0.5) * 80, sy = y + Math.sin(t) * 90, ex = sx + Math.cos(t) * l, ey = sy + Math.sin(t) * l, nx = -Math.sin(t), ny = Math.cos(t), w0 = 10 + R() * 14;
    const gr = g.createLinearGradient(sx, sy, ex, ey); gr.addColorStop(0, 'rgba(255,226,170,0)'); gr.addColorStop(0.12, `rgba(255,226,170,${a * (0.5 + R())})`); gr.addColorStop(1, 'rgba(255,226,170,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(sx + nx * w0, sy + ny * w0); g.lineTo(ex + nx * w, ey + ny * w); g.lineTo(ex - nx * w, ey - ny * w); g.lineTo(sx - nx * w0, sy - ny * w0); g.fill(); }
  g.restore();
}
export function grade(g, o = {}) {
  g.save(); g.globalCompositeOperation = 'soft-light'; g.fillStyle = o.warm || 'rgba(255,190,120,0.25)'; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'source-over'; const v = g.createRadialGradient(W / 2, H * 0.48, H * 0.35, W / 2, H * 0.5, H * 0.95); v.addColorStop(0, 'rgba(20,12,6,0)'); v.addColorStop(1, `rgba(20,12,6,${o.vig ?? 0.42})`); g.fillStyle = v; g.fillRect(0, 0, W, H); g.restore();
  grain(g, 0.45);
}

// 흐림 층: fn 을 따로 그려 블러를 먹인다
export function layer(g, blur, fn) {
  const c = mk(W * DPR, H * DPR), x = c.getContext('2d'); x.scale(DPR, DPR); fn(x);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); if (blur) g.filter = `blur(${blur * DPR}px)`; g.drawImage(c, 0, 0); g.restore();
}

// 모난 큰 바위: 깎인 면마다 빛이 다르다
function crag(g, x, y, w, h, seed, o) {
  const R = rng(seed), base = o.col || '#8e8b86';
  const out = [[x - w * 0.5, y], [x - w * 0.47, y - h * 0.45], [x - w * 0.36, y - h * 0.82], [x - w * 0.12, y - h], [x + w * 0.2, y - h * 0.97], [x + w * 0.38, y - h * 0.7], [x + w * 0.42, y - h * 0.42], [x + w * 0.52, y - h * 0.18], [x + w * 0.5, y]];
  const sg = g.createRadialGradient(x, y, 0, x, y, w * 0.75); sg.addColorStop(0, 'rgba(30,26,14,0.5)'); sg.addColorStop(1, 'rgba(30,26,14,0)'); g.save(); g.fillStyle = sg; g.translate(x, y); g.scale(1, 0.22); g.beginPath(); g.arc(0, 0, w * 0.75, 0, TAU); g.fill(); g.restore();
  const faces = [
    [[out[2], out[3], out[4], [x + w * 0.08, y - h * 0.8], [x - w * 0.22, y - h * 0.72]], 0.2],
    [[out[0], out[1], out[2], [x - w * 0.22, y - h * 0.72], [x - w * 0.2, y - h * 0.42], [x - w * 0.24, y]], 0.06],
    [[[x - w * 0.22, y - h * 0.72], [x + w * 0.08, y - h * 0.8], [x + w * 0.12, y - h * 0.46], [x - w * 0.2, y - h * 0.42]], 0.0],
    [[out[4], out[5], out[6], [x + w * 0.12, y - h * 0.46], [x + w * 0.08, y - h * 0.8]], -0.1],
    [[[x - w * 0.2, y - h * 0.42], [x + w * 0.12, y - h * 0.46], out[6], out[7], out[8], [x - w * 0.24, y]], -0.08],
  ];
  const path = pts => { g.beginPath(); pts.forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b)); g.closePath(); };
  g.save(); g.shadowColor = 'rgba(20,14,8,0.4)'; g.shadowBlur = 14; g.shadowOffsetY = 4; g.fillStyle = base; path(out); g.fill(); g.restore();
  g.save(); path(out); g.clip();
  for (const [pts, l] of faces) { const ys = pts.map(p => p[1]), gr = g.createLinearGradient(0, Math.min(...ys), 0, Math.max(...ys)); gr.addColorStop(0, tone(base, l + 0.06)); gr.addColorStop(1, tone(base, l - 0.06)); g.fillStyle = gr; path(pts); g.fill(); g.strokeStyle = `rgba(${l > 0.05 ? '255,245,225,0.35' : '30,26,22,0.3'})`; g.lineWidth = 1.2; g.stroke(); }
  for (let k = 0; k < w * h * 0.16; k++) { const px = x - w / 2 + R() * w, py = y - h + R() * h, d = R(); g.fillStyle = d < 0.45 ? `rgba(40,36,34,${0.12 + R() * 0.3})` : d < 0.8 ? `rgba(240,236,228,${0.2 + R() * 0.35})` : 'rgba(150,120,95,0.3)'; g.fillRect(px, py, 0.6 + R() * 1.4, 0.6 + R() * 1.4); }
  const wl = g.createLinearGradient(x - w / 2, y - h, x + w / 3, y - h / 2); wl.addColorStop(0, 'rgba(255,214,160,0.35)'); wl.addColorStop(1, 'rgba(255,214,160,0)'); g.fillStyle = wl; g.fillRect(x - w, y - h * 1.2, w * 2, h * 1.2);
  g.strokeStyle = 'rgba(40,34,30,0.45)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x - w * 0.46, y - h * 0.5); g.quadraticCurveTo(x - w * 0.1, y - h * 0.46, x + w * 0.4, y - h * 0.5); g.stroke();
  if (o.moss) for (let k = 0; k < w * 2; k++) { const px = x - w * 0.3 + R() * w * 0.5, py = y - h * (0.93 + R() * 0.06); g.fillStyle = ['#6f8f3e', '#8aa94d', '#a7b95c', '#56752f'][k % 4]; g.globalAlpha = 0.8; g.beginPath(); g.arc(px, py, 0.6 + R() * 1.6, 0, TAU); g.fill(); }
  g.restore();
}
