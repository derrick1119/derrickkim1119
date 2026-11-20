// 한지 전장: 먹으로 번진 풀밭, 먼 산, 소나무, 돌담·돌탑 같은 지형지물
import { TAU, INK, RED, OCHRE, st, fs, ell, rr, poly, line, path, makeCanvas, paperSprite, rng } from './draw.js';
import { W, H } from '../config.js';

export const THEMES = {
  pass: { paper: '#e9dec4', wash: ['#a9b78f', '#93a57f'], path: '#f1e8d2', fiber: '#9a8660', tuft: '#5f7a5a', mtn: ['#8a98a0', '#5f6f7a'], pine: '#3f6b5c', pineD: '#2c4f44', pineL: '#6f9a86', stone: ['#b9b3a2', '#a59f8f'], water: '#9cc0cf', waterD: '#6f9aae' },
  grove: { paper: '#dfd9bb', wash: ['#8fa87a', '#7a9670', '#9aae7a'], path: '#ece5c9', fiber: '#8a8658', tuft: '#4a6a4a', mtn: ['#7a9088', '#4f6a62'], pine: '#2f5f4c', pineD: '#1f4436', pineL: '#5f8f78', stone: ['#aeb0a0', '#959a8a'], water: '#8fb9bf', waterD: '#5f909a' },
  dusk: { paper: '#c9cfd8', wash: ['#9aa6ba', '#8794ac', '#a8a2bc'], path: '#dadee4', fiber: '#7a8494', tuft: '#56607a', mtn: ['#6a7488', '#454f66'], pine: '#4a5a6c', pineD: '#333f4e', pineL: '#72849a', stone: ['#a9adb6', '#8e939e'], water: '#7f94ba', waterD: '#566c96', night: true },
};

function pine(g, x, y, s, T) {
  g.save(); g.translate(x, y); g.scale(s, s);
  const tr = p => { p.moveTo(-3, 0); p.bezierCurveTo(4, -22, -8, -40, 2, -62); };
  g.beginPath(); tr(g); st(g, INK, 7.5); g.beginPath(); tr(g); st(g, '#7a5a40', 5);
  for (const [cx, cy, rx] of [[-16, -44, 26], [14, -58, 24], [-2, -76, 22]]) { ell(g, cx, cy, rx, rx * 0.42, T.pine, INK, 1.4); for (let i = -2; i <= 2; i++) line(g, [cx + i * rx * 0.3, cy - rx * 0.3, cx + i * rx * 0.34, cy + rx * 0.1], T.pineD, 1.1); g.globalAlpha = 0.5; ell(g, cx - rx * 0.2, cy - rx * 0.16, rx * 0.5, rx * 0.12, T.pineL); g.globalAlpha = 1; }
  g.restore();
}

export function makeGround(themeId, map, seed = 7) {
  const T = THEMES[themeId] || THEMES.pass, S = 2, c = makeCanvas(W * S, H * S), g = c.getContext('2d'); g.scale(S, S);
  const R = rng(seed * 977 + 13);
  g.fillStyle = T.paper; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 28; i++) { g.globalAlpha = 0.32 + R() * 0.2; g.fillStyle = T.wash[(R() * T.wash.length) | 0]; g.beginPath(); g.ellipse(R() * W, 190 + R() * 950, 70 + R() * 120, 40 + R() * 70, R() * 3, 0, TAU); g.fill(); }
  g.globalAlpha = 0.5; g.fillStyle = T.path; for (let y = 200; y < 1150; y += 60) { g.beginPath(); g.ellipse(360 + Math.sin(y * 0.008 + seed) * 70, y, 80, 54, 0, 0, TAU); g.fill(); }
  g.globalAlpha = 1;
  // 마른 붓 자국: 가로로 길게 스친 옅은 먹
  for (let i = 0; i < 26; i++) { const x = R() * W, y = 210 + R() * 900, l = 90 + R() * 200, col = T.wash[(R() * T.wash.length) | 0]; g.globalAlpha = 0.16 + R() * 0.14; for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(x, y + k * 3.2); g.quadraticCurveTo(x + l * 0.5, y + k * 3.2 + (R() - 0.5) * 16, x + l * (0.8 + R() * 0.2), y + k * 3.2 + (R() - 0.5) * 6); st(g, col, 1.6 + R() * 1.8); } }
  g.globalAlpha = 1;
  // 길 가의 디딤돌
  for (let y = 230; y < 1120; y += 74 + R() * 30) { const x = 360 + Math.sin(y * 0.008 + seed) * 70 + (R() - 0.5) * 90; g.globalAlpha = 0.5; ell(g, x, y, 9 + R() * 7, 5 + R() * 3, T.stone[(R() * 2) | 0], INK + '88', 1); } g.globalAlpha = 1;
  // 마당(둥근 굿판)
  if (map && map.mosaic) { const [mx, my, mr] = map.mosaic; g.globalAlpha = 0.45; ell(g, mx, my, mr, mr * 0.78, T.path); g.globalAlpha = 0.55; g.setLineDash([16, 12]); g.beginPath(); g.ellipse(mx, my, mr, mr * 0.78, 0, 0, TAU); st(g, INK, 2.2); g.setLineDash([]); g.beginPath(); g.ellipse(mx, my, mr * 0.62, mr * 0.48, 0, 0, TAU); st(g, INK + '66', 1.4); g.globalAlpha = 1; for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i / 5 * TAU, px = mx + Math.cos(a) * mr, py = my + Math.sin(a) * mr * 0.78; line(g, [px, py, px, py - 26], INK, 2.4); poly(g, [px, py - 26, px + 13, py - 22, px, py - 17], [RED, OCHRE, '#2f4d7e', '#fbf7ec', '#2b2a30'][i], INK, 1); } }
  // 한지 섬유
  for (let i = 0; i < 1500; i++) { const x = R() * W, y = R() * H, a = R() * TAU, l = 4 + R() * 10; g.globalAlpha = 0.15; g.strokeStyle = R() < 0.5 ? T.fiber : '#ffffff'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  g.globalAlpha = 1;
  for (let i = 0; i < 80; i++) { const x = R() * W, y = 200 + R() * 920; line(g, [x - 3, y, x - 4.5, y - 6], T.tuft, 1.2); line(g, [x, y, x, y - 8], T.tuft, 1.2); line(g, [x + 3, y, x + 4.5, y - 6], T.tuft, 1.2); }
  // 풀포기·들꽃·잔돌·먹 튄 자국
  for (let i = 0; i < 34; i++) { const x = R() * W, y = 220 + R() * 880; for (let k = -3; k <= 3; k++) { g.beginPath(); g.moveTo(x + k * 2.2, y); g.quadraticCurveTo(x + k * 3.4, y - 7, x + k * 5.2 + (R() - 0.5) * 3, y - 10 - R() * 6); st(g, k % 2 ? T.tuft : T.pine, 1.1); } }
  const petal = T.night ? ['#dfe8ee', '#b8a0e0'] : themeId === 'grove' ? ['#f0d264', '#fbf7ec'] : ['#f3c4c9', '#fbf7ec', '#f0d264'];
  for (let i = 0; i < 46; i++) { const x = R() * W, y = 220 + R() * 880, c = petal[(R() * petal.length) | 0]; line(g, [x, y + 5, x, y], T.tuft, 1); for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; ell(g, x + Math.cos(a) * 2.2, y + Math.sin(a) * 2.2, 1.5, 1.5, c, INK + '77', 0.5); } ell(g, x, y, 1, 1, OCHRE); }
  for (let i = 0; i < 40; i++) { const x = R() * W, y = 210 + R() * 900; g.globalAlpha = 0.6; ell(g, x, y, 2.4 + R() * 3.4, 1.6 + R() * 1.8, T.stone[(R() * 2) | 0], INK + '99', 0.8); } g.globalAlpha = 1;
  for (let i = 0; i < 70; i++) { g.globalAlpha = 0.1 + R() * 0.14; ell(g, R() * W, 190 + R() * 930, 0.8 + R() * 2.2, 0.8 + R() * 1.8, INK); } g.globalAlpha = 1;
  // 강
  if (map && map.river) {
    const rv = map.river, y0 = rv.y, y1 = rv.y + rv.h;
    const band = p => { p.moveTo(-10, y0); for (let x = 0; x <= W + 20; x += 40) p.lineTo(x, y0 + Math.sin(x * 0.03) * 4); for (let x = W + 20; x >= -10; x -= 40) p.lineTo(x, y1 + Math.sin(x * 0.027 + 2) * 4); p.closePath(); };
    g.globalAlpha = 0.9; path(g, band, T.water, INK, 2); g.globalAlpha = 1;
    g.save(); g.beginPath(); band(g); g.clip(); for (let i = 0; i < 30; i++) { const x = R() * W, y = y0 + 8 + R() * (rv.h - 16); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 9, y - 4, x + 18, y); st(g, T.waterD, 1.3); } g.restore();
    for (const f of rv.fords || []) for (let i = 0; i < 4; i++) for (let k = 0; k < 2; k++) ell(g, f.x + 12 + i * (f.w - 24) / 3 + (k ? 6 : -6), y0 + 14 + k * (rv.h - 28), 12, 8, T.stone[(i + k) % 2], INK, 1.4);
    for (const b of rv.bridges || []) { rr(g, b.x - 2, y0 - 12, b.w + 4, rv.h + 24, 3, '#9a6f45', INK, 1.6); for (let yy = y0 - 6; yy < y1 + 8; yy += 11) line(g, [b.x, yy, b.x + b.w, yy], '#6f4c2c', 1.2); rr(g, b.x - 7, y0 - 15, 7, rv.h + 30, 3, '#7a5a40', INK, 1.4); rr(g, b.x + b.w, y0 - 15, 7, rv.h + 30, 3, '#7a5a40', INK, 1.4); }
  }
  // 먼 산과 안개
  T.mtn.forEach((col, n) => { const yb = 150 + n * 46, amp = 60 - n * 14; g.globalAlpha = 0.5 + n * 0.1; g.fillStyle = col; g.beginPath(); g.moveTo(0, yb + 40); for (let x = 0; x <= W; x += 30) g.lineTo(x, yb - Math.abs(Math.sin(x * 0.011 + yb + seed)) * amp - Math.sin(x * 0.05) * 6); g.lineTo(W, yb + 40); g.closePath(); g.fill(); });
  g.globalAlpha = 1; const m = g.createLinearGradient(0, 150, 0, 250); const pc = T.paper; m.addColorStop(0, pc + '00'); m.addColorStop(1, pc); g.fillStyle = m; g.fillRect(0, 150, W, 100);
  // 능선의 먹선과 산허리 안개
  T.mtn.forEach((col, n) => { const yb = 150 + n * 46, amp = 60 - n * 14; g.globalAlpha = 0.35; g.beginPath(); for (let x = 0; x <= W; x += 30) { const y = yb - Math.abs(Math.sin(x * 0.011 + yb + seed)) * amp - Math.sin(x * 0.05) * 6; if (x) g.lineTo(x, y); else g.moveTo(x, y); } st(g, INK, 1.3); });
  g.globalAlpha = 1; for (let i = 0; i < 7; i++) { const x = R() * W, y = 176 + R() * 50, rx = 90 + R() * 120; const mg = g.createRadialGradient(x, y, 0, x, y, rx); mg.addColorStop(0, 'rgba(255,252,240,0.5)'); mg.addColorStop(1, 'rgba(255,252,240,0)'); g.save(); g.translate(x, y); g.scale(1, 0.22); g.translate(-x, -y); g.fillStyle = mg; g.fillRect(x - rx, y - rx, rx * 2, rx * 2); g.restore(); }
  if (T.night) { for (let i = 0; i < 40; i++) { g.globalAlpha = 0.4 + R() * 0.5; ell(g, R() * W, R() * 120, 0.8 + R() * 1.2, 0.8 + R() * 1.2, '#f4efdc'); } g.globalAlpha = 0.18; ell(g, 560, 70, 58, 58, '#f4efdc'); g.globalAlpha = 0.9; ell(g, 560, 70, 34, 34, '#f4efdc', INK, 1.4); g.globalAlpha = 1; }
  for (let y = 290; y < 1160; y += 190 + R() * 50) { pine(g, 2 + R() * 10, y, 0.95 + R() * 0.2, T); pine(g, 718 - R() * 10, y + 90, 0.95 + R() * 0.2, T); }
  // 가장자리로 갈수록 바랜 종이
  const vg = g.createRadialGradient(W / 2, 640, 300, W / 2, 640, 820); vg.addColorStop(0, 'rgba(70,48,24,0)'); vg.addColorStop(1, T.night ? 'rgba(20,24,44,0.34)' : 'rgba(70,48,24,0.26)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  return c;
}

// ── 지형지물 (y 정렬해서 인형과 함께 그린다) ──
const cache = new Map();
export function propSprite(o, themeId) {
  const T = THEMES[themeId] || THEMES.pass, key = themeId + ':' + o.kind + ':' + (o.w || o.r || 0) + ':' + (o.v || 0);
  let s = cache.get(key); if (s) return s;
  const R = rng((o.v || 1) * 131 + (o.w || o.r || 3)), opt = { border: null, shadow: false };
  if (o.kind === 'wall') s = paperSprite(g => { const n = Math.max(2, Math.round(o.w / 28)), sw = o.w / n; for (let r = 0; r < 2; r++) for (let i = 0; i < n - r; i++) ell(g, sw * (i + 0.5) + (r ? sw / 2 : 0), o.h - 6 - r * 15 + (R() - 0.5) * 2, sw * 0.56, 10.5, T.stone[(i + r) % 2], INK, 1.4); }, Object.assign({ w: o.w + 20, h: o.h + 40, ox: 10, oy: 30 }, opt));
  else if (o.kind === 'pillar') s = paperSprite(g => { for (let i = 0; i < 5; i++) ell(g, (R() - 0.5) * 2, 6 - i * 12, 21 - i * 3.5, 8.4 - i * 0.8, T.stone[i % 2], INK, 1.4); }, Object.assign({ w: 60, h: 80, ox: 30, oy: 62 }, opt));
  else if (o.kind === 'rock') s = paperSprite(g => { const r = o.r; poly(g, [-r, r * 0.4, -r * 0.85, -r * 0.5, -r * 0.25, -r * 1.15, r * 0.55, -r * 0.95, r, -r * 0.1, r * 0.8, r * 0.45, -r * 0.5, r * 0.55], T.stone[1], INK, 1.5); line(g, [-r * 0.5, -r * 0.3, -r * 0.1, -r * 0.9, r * 0.35, -r * 0.5], INK + '88', 1.1); line(g, [r * 0.1, r * 0.3, r * 0.5, -r * 0.2], INK + '66', 1); ell(g, -r * 0.55, r * 0.36, r * 0.34, r * 0.16, T.pine, INK, 1); }, Object.assign({ w: o.r * 2 + 20, h: o.r * 2 + 24, ox: o.r + 10, oy: o.r * 1.3 + 10 }, opt));
  else if (o.kind === 'tree') s = paperSprite(g => pine(g, 0, 8, 1.05, T), Object.assign({ w: 100, h: 120, ox: 50, oy: 104 }, opt));
  else if (o.kind === 'barricade') s = paperSprite(g => { for (let x = 5; x < o.w; x += 12) { g.save(); g.translate(x, o.h); g.rotate((x / 12) % 2 ? 0.14 : -0.14); poly(g, [-2.8, 0, -2.8, -24, 0, -31, 2.8, -24, 2.8, 0], '#b98a55', INK, 1.2); g.restore(); } line(g, [0, o.h - 13, o.w, o.h - 13], INK, 3.6); line(g, [0, o.h - 13, o.w, o.h - 13], '#d9b77a', 2); }, Object.assign({ w: o.w + 20, h: o.h + 44, ox: 10, oy: 36 }, opt));
  else s = paperSprite(() => {}, { w: 8, h: 8, ox: 4, oy: 4, border: null, shadow: false });
  cache.set(key, s); return s;
}
