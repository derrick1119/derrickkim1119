// 그림 배경: 전장을 붓으로 칠한 풍경화처럼 그린다 (종이 디오라마 배경과 바꿔 볼 수 있다).
// 먼 하늘과 겹산 → 성곽과 문루가 앉은 언덕 → 울타리 두른 모래빛 들판 → 양옆의 꽃나무와 반송.
// 층마다 한 장씩 굽고(먼 것일수록 천천히 흐른다), 큰 나무는 인형들과 앞뒤를 맞춰 세운다.
import { W, H } from '../config.js';
import { TAU, makeCanvas, rng } from './draw.js';
import { THEMES, GW, FW, BW } from './terrain.js';

// ── 고개마다의 빛깔 ──
// sky 위·아래, far 먼 산 세 겹, hill 언덕, leaf 솔잎(짙은·가운데·밝은), sand 들판, grass 풀(가운데·밝은·짙은), bloom 꽃나무(가운데·밝은·짙은)
const BASE = {
  sky: ['#bcd3df', '#f6ead0'], far: ['#7c93a8', '#9cb0bf', '#c0ccd2'], hill: ['#6f8c6c', '#8fa77a'], leaf: ['#2f5440', '#557d48', '#8fb260'],
  trunk: '#5a3e2e', sand: ['#ceb47c', '#b99a62'], grass: ['#8fa64a', '#b3c35e', '#66843a'], bloom: ['#f0a6ba', '#fcd8e1', '#d4728e'],
  rock: ['#b5ad9c', '#8e8676'], wood: '#8c6a48', roof: '#4f5866', wall: '#cfc6b2', light: [255, 236, 196], sun: true,
};
const PT = {
  pass: {},
  autumn: { sky: ['#dcd0bc', '#f4e2c2'], far: ['#a2958c', '#b9ac9e', '#cfc3b0'], hill: ['#a0884e', '#b99c60'], leaf: ['#4a5a3a', '#6f7a44', '#a3a05a'], grass: ['#b8a04e', '#d0b462', '#937a3c'], sand: ['#ead2a0', '#d8b882'], bloom: ['#d8662c', '#f2a446', '#a9402a'] },
  grove: { sky: ['#c6dccf', '#eef0d8'], far: ['#86a397', '#a2b9ab', '#c2d0bf'], hill: ['#6a9468', '#84a774'], leaf: ['#2f5a3c', '#4f7c46', '#86a85c'], grass: ['#84a04c', '#a2b85e', '#62833e'], sand: ['#e0d09c', '#cdb984'], bloom: ['#f3efdc', '#fffcec', '#d8d2a8'] },
  snow: { sky: ['#c3d1de', '#eaeff3'], far: ['#a2b3c4', '#bccad6', '#d8e0e8'], hill: ['#bccad4', '#d4dde4'], leaf: ['#3e5a56', '#5f7c74', '#e8f0f2'], grass: ['#c2ced4', '#dfe7ec', '#9aaab4'], sand: ['#ccd7df', '#b3c2cd'], bloom: ['#e4edf2', '#ffffff', '#aebdc8'], bare: true, rock: ['#c4cad0', '#9aa4ac'], light: [236, 244, 255] },
  mist: { sky: ['#d3d8ce', '#e9e8da'], far: ['#a2aba6', '#b8bfb9', '#cfd3cb'], hill: ['#8b9b8c', '#a3ae9f'], leaf: ['#3f5a4c', '#5d7660', '#8fa384'], grass: ['#96a276', '#adb688', '#7a8862'], sand: ['#ddd8be', '#cbc5a8'], bloom: ['#e8e2ef', '#f6f4f9', '#c4bad6'] },
  ember: { sky: ['#a89488', '#d8b89a'], far: ['#7c726e', '#938680', '#ab9c92'], hill: ['#6a6058', '#7e7268'], leaf: ['#3a3630', '#4e4840', '#6e6458'], grass: ['#7a705e', '#8e826c', '#5a5246'], sand: ['#bdb2a4', '#a39788'], wood: '#4e3e34', smoke: true, bare: true, bloom: ['#4e4038', '#b8582a', '#2a221e'], rock: ['#9a928a', '#726a64'], light: [255, 196, 140] },   // 불탄 숲: 검게 그은 가지에 불씨가 남았다
  storm: { sky: ['#a7b6bf', '#ccd6d8'], far: ['#788b96', '#90a2aa', '#adbbc0'], hill: ['#6a8284', '#829698'], leaf: ['#2f4e4e', '#4a6a66', '#7a9a8e'], grass: ['#7d987e', '#93ac8e', '#607c66'], sand: ['#cdd1c6', '#b7bcb0'], bloom: ['#cfe2e6', '#eef6f8', '#98bccb'], light: [220, 236, 244], sun: false },
  dusk: { sky: ['#2a2c56', '#c98a74'], far: ['#45506e', '#5a6584', '#707b98'], hill: ['#3a4560', '#4b5672'], leaf: ['#26343e', '#3a4a52', '#5c6e78'], grass: ['#4c5c66', '#5e6e78', '#3c4a54'], sand: ['#8a90a2', '#767c90'], bloom: ['#b9a2e2', '#dccdf4', '#8a72ba'], rock: ['#8a8ea0', '#646878'], wood: '#5a4c48', wall: '#9aa0b0', light: [196, 206, 255], night: true },
  under: { sky: ['#140f1e', '#5a2a4a'], far: ['#3a2c4c', '#4c3a5e', '#62486e'], hill: ['#2c2a3a', '#3a3a4a'], leaf: ['#1e2a2c', '#2e3e40', '#4e6264'], grass: ['#34484a', '#466064', '#24343a'], sand: ['#5c6c6e', '#48585c'], bloom: ['#d0422f', '#ec7060', '#8a2420'], rock: ['#8a8292', '#625a6c'], wood: '#4a3a40', wall: '#9a90a6', light: [255, 170, 160], night: true },
};
const pal = id => Object.assign({}, BASE, PT[id] || {}, { night: !!(PT[id] && PT[id].night) || !!(THEMES[id] && THEMES[id].night) });

// ── 붓질 도구 ──
const hx = c => [1, 3, 5].map(j => parseInt(c.slice(j, j + 2), 16));
const mix = (a, b, t) => { const p = hx(a), q = hx(b); return '#' + p.map((v, i) => Math.round(v * (1 - t) + q[i] * t).toString(16).padStart(2, '0')).join(''); };
const rgba = (c, a) => { const [r, g, b] = hx(c); return `rgba(${r},${g},${b},${a})`; };
// 붓 자국 하나: 납작한 타원 (여러 번 겹쳐 칠한 것처럼)
const dab = (g, x, y, rx, ry, col, a, rot = 0) => { g.globalAlpha = a; g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, TAU); g.fill(); };
const stroke = (g, pts, col, w, a = 1) => { g.globalAlpha = a; g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.stroke(); };
const vgrad = (g, y0, y1, stops) => { const gr = g.createLinearGradient(0, y0, 0, y1); stops.forEach(([t, c]) => gr.addColorStop(t, c)); return gr; };
// 이어 붙여 흐르는 그림: 가장자리를 넘는 것은 반대편에도 한 번 더 그린다
const wrapAt = (P, x, r, fn) => { fn(x); if (x - r < 0) fn(x + P); if (x + r > P) fn(x - P); };
const bumpP = (x, c, w, P) => { const d = ((x - c) % P + P * 1.5) % P - P / 2; return Math.exp(-(d / w) * (d / w)); };
function ridgeShape(g, f, x0, x1, yb) { g.beginPath(); g.moveTo(x0, yb); for (let x = x0; x <= x1; x += 5) g.lineTo(x, f(x)); g.lineTo(x1, yb); g.closePath(); }

// 산 한 겹: 능선은 짙고 산허리는 밝게 풀리며, 비스듬한 붓결(준)을 옅게 얹고 아래는 안개에 잠긴다
function mountain(g, f, w, yb, col, haze, R, o = {}) {
  ridgeShape(g, f, -10, w + 10, yb); g.globalAlpha = 1; g.fillStyle = vgrad(g, yb - (o.h || 150), yb, [[0, mix(col, '#2a3440', 0.12)], [0.55, col], [1, mix(col, haze, 0.55)]]); g.fill();
  g.save(); ridgeShape(g, f, -10, w + 10, yb); g.clip();
  // 볕 드는 쪽 (오른 비탈을 밝게)
  for (let x = 0; x < w; x += 7) { const y = f(x), s = f(x + 6) - y; if (s > 0.6) dab(g, x + 3, y + 22, 7, 26, mix(col, '#fff6e0', 0.35), 0.16); }
  for (let i = 0; i < (o.n || 260); i++) { const x = R() * w, y0 = f(x) + 4 + R() * 60, l = 8 + R() * 18; stroke(g, [x, y0, x - l * 0.35, y0 + l], mix(col, '#26303c', 0.3), 1.2, 0.12); }
  g.restore(); g.globalAlpha = 1;
  // 능선의 옅은 볕 테
  g.beginPath(); for (let x = -10; x <= w + 10; x += 5) { if (x === -10) g.moveTo(x, f(x) + 1); else g.lineTo(x, f(x) + 1); } g.globalAlpha = 0.35; g.strokeStyle = mix(col, '#fffaf0', 0.6); g.lineWidth = 1.4; g.stroke(); g.globalAlpha = 1;
  g.fillStyle = vgrad(g, yb - (o.mist || 46), yb, [[0, rgba(haze, 0)], [1, rgba(haze, 0.92)]]); g.fillRect(-10, yb - (o.mist || 46), w + 20, (o.mist || 46));
}
// 뭉게구름: 흰 붓 자국을 겹쳐 쌓고 아래쪽은 서늘한 그늘
function cloud(g, x, y, w, P, R) {
  const n = 9 + ((w / 18) | 0), lite = P.night ? '#8c92b4' : '#fffdf6', shade = P.night ? '#4a5272' : mix(P.sky[0], '#8a9aac', 0.4);
  for (let i = 0; i < n; i++) { const t = i / (n - 1), cx = x + (t - 0.5) * w, cy = y - Math.sin(t * Math.PI) * w * 0.16 - R() * 8, r = w * (0.1 + Math.sin(t * Math.PI) * 0.13); dab(g, cx, cy + r * 0.35, r * 1.1, r * 0.5, shade, 0.35); }
  for (let i = 0; i < n; i++) { const t = i / (n - 1), cx = x + (t - 0.5) * w, cy = y - Math.sin(t * Math.PI) * w * 0.16 - R() * 8, r = w * (0.1 + Math.sin(t * Math.PI) * 0.13); dab(g, cx, cy, r, r * 0.78, lite, 0.75); dab(g, cx - r * 0.25, cy - r * 0.3, r * 0.5, r * 0.36, '#ffffff', P.night ? 0.12 : 0.5); }
  g.globalAlpha = 1;
}

// ── 먼 하늘과 겹산 (FW 한 장, 가장 천천히 흐른다) ──
const CACHE = new Map(), keep = (k, c) => { CACHE.set(k, c); while (CACHE.size > 8) CACHE.delete(CACHE.keys().next().value); return c; };
export function paintFar(id, seed = 7) {
  const key = 'far:' + id + ':' + seed; let c = CACHE.get(key); if (c) return c;
  const P = pal(id), S = 1.25, Hh = 240; c = makeCanvas(FW * S, Hh * S); const g = c.getContext('2d'); g.scale(S, S); const R = rng(seed * 71 + 3);
  g.fillStyle = vgrad(g, 0, Hh, [[0, P.sky[0]], [0.62, P.sky[1]], [1, mix(P.sky[1], '#ffffff', 0.25)]]); g.fillRect(0, 0, FW, Hh);
  if (P.night) { for (let i = 0; i < 120; i++) dab(g, R() * FW, 62 + R() * 80, 0.6 + R() * 1.1, 0.6 + R() * 1.1, '#f4efdc', 0.3 + R() * 0.5); const mx = 1320, my = 98; const gl = g.createRadialGradient(mx, my, 8, mx, my, 110); gl.addColorStop(0, 'rgba(230,232,255,0.5)'); gl.addColorStop(1, 'rgba(230,232,255,0)'); g.globalAlpha = 1; g.fillStyle = gl; g.fillRect(mx - 110, my - 110, 220, 220); dab(g, mx, my, 22, 22, '#f1eedf', 1); dab(g, mx - 6, my - 5, 6, 5, '#d8d4c4', 0.5); dab(g, mx + 7, my + 6, 4, 3.4, '#d8d4c4', 0.5); }
  else if (P.sun !== false) { const sx = 980, sy = 96, gl = g.createRadialGradient(sx, sy, 10, sx, sy, 300); gl.addColorStop(0, `rgba(${P.light},0.75)`); gl.addColorStop(0.3, `rgba(${P.light},0.25)`); gl.addColorStop(1, `rgba(${P.light},0)`); g.globalAlpha = 1; g.fillStyle = gl; g.fillRect(sx - 300, sy - 300, 600, 600); }
  for (let i = 0; i < 7; i++) { const x = (i + 0.3 + R() * 0.4) * FW / 7, y = 92 + R() * 34, w = 110 + R() * 120; for (const xx of [x, x - FW, x + FW]) cloud(g, xx, y, w, P, R); }
  const haze = mix(P.sky[1], '#ffffff', P.night ? 0 : 0.2);
  const range = (yb, list) => x => yb - Math.max(...list.map(([cx, h, w]) => h * bumpP(x, cx, w, FW))) - Math.sin(x * 0.05) * 1.5 - Math.sin(x * 0.013) * 3;
  // 세 겹: 가장 먼 산은 하늘빛에 거의 녹고, 가운데 겹에 우뚝한 봉우리
  mountain(g, range(176, [[200, 64, 110], [520, 80, 150], [900, 58, 120], [1240, 92, 160], [1600, 70, 130], [1840, 60, 110]]), FW, 200, mix(P.far[2], haze, 0.3), haze, R, { h: 110, n: 120, mist: 60 });
  mountain(g, range(196, [[90, 70, 90], [430, 104, 120], [700, 60, 110], [1030, 120, 110], [1150, 84, 90], [1420, 66, 120], [1760, 96, 120]]), FW, 218, P.far[1], haze, R, { h: 130, n: 220, mist: 56 });
  mountain(g, range(222, [[260, 50, 120], [610, 64, 140], [880, 44, 100], [1300, 58, 130], [1660, 46, 110]]), FW, 240, P.far[0], haze, R, { h: 80, n: 200, mist: 50 });
  g.globalAlpha = 1; return keep(key, c);
}

// ── 성곽·문루·정자 ──
// 기와지붕: 처마 끝이 살짝 들린 팔작지붕
function roof(g, x, y, w, h, col) {
  g.beginPath(); g.moveTo(x - w * 0.56, y - h * 0.18); g.quadraticCurveTo(x - w * 0.42, y + h * 0.1, x - w * 0.2, y + h * 0.08); g.lineTo(x + w * 0.2, y + h * 0.08); g.quadraticCurveTo(x + w * 0.42, y + h * 0.1, x + w * 0.56, y - h * 0.18);
  g.quadraticCurveTo(x + w * 0.4, y - h * 0.5, x + w * 0.26, y - h * 0.9); g.lineTo(x - w * 0.26, y - h * 0.9); g.quadraticCurveTo(x - w * 0.4, y - h * 0.5, x - w * 0.56, y - h * 0.18); g.closePath();
  g.globalAlpha = 1; g.fillStyle = vgrad(g, y - h, y, [[0, mix(col, '#000000', 0.15)], [1, mix(col, '#c8d0dc', 0.25)]]); g.fill();
  stroke(g, [x - w * 0.26, y - h * 0.9, x + w * 0.26, y - h * 0.9], mix(col, '#000000', 0.35), Math.max(1, h * 0.12));
  for (let i = -5; i <= 5; i++) stroke(g, [x + i * w * 0.045, y - h * 0.86, x + i * w * 0.07, y + h * 0.02], mix(col, '#e0e6ee', 0.25), 0.7, 0.4);
  stroke(g, [x - w * 0.5, y - h * 0.12, x + w * 0.5, y - h * 0.12], mix(col, '#e8eef4', 0.3), 0.9, 0.5);
}
// 문루: 무지개 문을 낸 돌 축대 위에 두 층 누각
function gateTower(g, x, y, s, P) {
  const st = P.wall, red = P.night ? '#6a4a52' : '#9a4a3a', green = P.night ? '#3e5a5a' : '#4f8a70';
  g.globalAlpha = 1; g.fillStyle = vgrad(g, y - 34 * s, y, [[0, mix(st, '#ffffff', 0.15)], [1, mix(st, '#5a5040', 0.25)]]);
  g.beginPath(); g.moveTo(x - 62 * s, y); g.lineTo(x - 56 * s, y - 34 * s); g.lineTo(x + 56 * s, y - 34 * s); g.lineTo(x + 62 * s, y); g.closePath(); g.fill();
  for (let r = 1; r < 4; r++) stroke(g, [x - 60 * s + r * 1.5 * s, y - r * 8.5 * s, x + 60 * s - r * 1.5 * s, y - r * 8.5 * s], mix(st, '#4a4030', 0.35), 0.6, 0.5);
  g.fillStyle = mix(st, '#2a2018', 0.7); g.beginPath(); g.moveTo(x - 11 * s, y); g.lineTo(x - 11 * s, y - 16 * s); g.arc(x, y - 16 * s, 11 * s, Math.PI, 0); g.lineTo(x + 11 * s, y); g.closePath(); g.fill();
  // 아래층
  g.fillStyle = red; for (const dx of [-36, -18, 0, 18, 36]) g.fillRect(x + dx * s - 1.4 * s, y - 52 * s, 2.8 * s, 18 * s);
  g.fillStyle = green; g.fillRect(x - 40 * s, y - 54 * s, 80 * s, 4 * s);
  roof(g, x, y - 50 * s, 122 * s, 24 * s, P.roof);
}
// 정자: 네 기둥에 팔작지붕
function pavilion(g, x, y, s, P) {
  const red = P.night ? '#6a4a52' : '#9a4a3a';
  g.globalAlpha = 1; g.fillStyle = mix(P.wall, '#6a6050', 0.2); g.fillRect(x - 24 * s, y - 5 * s, 48 * s, 5 * s);
  g.fillStyle = red; for (const dx of [-18, -6, 6, 18]) g.fillRect(x + dx * s - 1.3 * s, y - 24 * s, 2.6 * s, 19 * s);
  g.fillStyle = P.night ? '#3e5a5a' : '#4f8a70'; g.fillRect(x - 21 * s, y - 26 * s, 42 * s, 3 * s);
  roof(g, x, y - 22 * s, 64 * s, 17 * s, P.roof);
}
// 성벽: 언덕 능선을 따라 기어오르는 돌담과 여장
// 마을: 기와집과 초가가 비탈에 모여 앉았다
function village(g, f, x0, n, P, R) {
  for (let i = 0; i < n; i++) { const x = x0 + i * (32 + R() * 16), y = f(x) + 8 + R() * 12, w = 32 + R() * 16, tile = R() < 0.55;
    g.globalAlpha = 1; g.fillStyle = mix(P.wall, '#ffffff', 0.2); g.fillRect(x - w * 0.36, y - 8, w * 0.72, 8); g.fillStyle = mix(P.wood, '#000000', 0.2); g.fillRect(x - w * 0.36, y - 8, 1.6, 8); g.fillRect(x + w * 0.36 - 1.6, y - 8, 1.6, 8);
    if (tile) roof(g, x, y - 7, w, 10, P.roof); else { g.fillStyle = vgrad(g, y - 18, y - 6, [[0, mix(P.sand[0], '#c8a868', 0.4)], [1, mix(P.sand[1], '#7a5a34', 0.35)]]); g.beginPath(); g.moveTo(x - w * 0.5, y - 6); g.quadraticCurveTo(x - w * 0.42, y - 17, x, y - 18); g.quadraticCurveTo(x + w * 0.42, y - 17, x + w * 0.5, y - 6); g.closePath(); g.fill(); } }
  g.globalAlpha = 1;
}
function wall(g, f, x0, x1, P, R) {
  const st = P.wall, h = 7;
  g.beginPath(); for (let x = x0; x <= x1; x += 4) { if (x === x0) g.moveTo(x, f(x) - h); else g.lineTo(x, f(x) - h); } for (let x = x1; x >= x0; x -= 4) g.lineTo(x, f(x) + 2); g.closePath();
  g.globalAlpha = 1; g.fillStyle = mix(st, '#6a6050', 0.12); g.fill();
  g.globalAlpha = 0.7; g.fillStyle = mix(st, '#ffffff', 0.12); for (let x = x0; x < x1; x += 4) g.fillRect(x, f(x) - h - 2, 4.4, 2.4);
  stroke(g, Array.from({ length: Math.ceil((x1 - x0) / 4) + 1 }, (_, i) => { const x = Math.min(x1, x0 + i * 4); return [x, f(x) - h * 0.45]; }).flat(), mix(st, '#4a4030', 0.4), 0.6, 0.35);
}

// ── 반송: 굽은 줄기 위에 넓적한 솔잎 구름이 층층이 앉는다 ──
function pinePads(g, pads, P, R, s) {
  // 그늘진 아래쪽 → 몸통 → 위쪽 볕 순으로 붓 자국을 겹친다
  for (const [px, py, rx, ry] of pads) dab(g, px, py + ry * 0.35, rx * 1.02, ry * 0.75, mix(P.leaf[0], '#1a2a20', 0.25), 0.95);
  for (const [px, py, rx, ry] of pads) { dab(g, px, py, rx, ry * 0.8, P.leaf[0], 1); for (let i = 0; i < rx * 0.9; i++) { const a = R() * TAU, d = Math.sqrt(R()), x = px + Math.cos(a) * rx * 0.9 * d, y = py + Math.sin(a) * ry * 0.6 * d - ry * 0.15; dab(g, x, y, (4 + R() * 6) * s, (2.4 + R() * 3) * s, P.leaf[1], 0.55); } }
  for (const [px, py, rx, ry] of pads) for (let i = 0; i < rx * 0.6; i++) { const t = R(), x = px - rx * 0.85 + t * rx * 1.7, y = py - ry * 0.55 * Math.sin(t * Math.PI) + R() * ry * 0.3; dab(g, x, y, (3 + R() * 5) * s, (1.6 + R() * 2.2) * s, P.leaf[2], 0.55); }
  // 솔잎 결
  for (const [px, py, rx, ry] of pads) for (let i = 0; i < rx * 0.25; i++) { const x = px + (R() - 0.5) * rx * 1.7, y = py + ry * 0.45 + R() * 3; stroke(g, [x, y, x + (R() - 0.5) * 5, y + 4 + R() * 4], mix(P.leaf[0], '#101810', 0.4), 0.9 * s, 0.5); }
  g.globalAlpha = 1;
}
function umbrellaPine(g, x, y, s, P, R, flip) {
  const f = flip ? -1 : 1, tr = P.trunk;
  // 땅 그림자
  dab(g, x + 10 * s, y + 2, 92 * s, 12 * s, '#2a2014', P.night ? 0.3 : 0.22);
  // 줄기 둘이 갈라져 비스듬히 오른다
  const trunk = (pts, w0, w1) => { for (let i = 0; i < pts.length - 2; i += 2) { const t = i / (pts.length - 2), w = w0 + (w1 - w0) * t; stroke(g, [pts[i], pts[i + 1], pts[i + 2], pts[i + 3]], tr, w); stroke(g, [pts[i] - w * 0.25 * f, pts[i + 1], pts[i + 2] - w * 0.25 * f, pts[i + 3]], mix(tr, '#f0d8b0', 0.4), w * 0.28, 0.6); } };
  trunk([x, y, x + 6 * s * f, y - 40 * s, x - 4 * s * f, y - 78 * s, x - 30 * s * f, y - 108 * s], 16 * s, 6 * s);
  trunk([x + 6 * s * f, y - 40 * s, x + 32 * s * f, y - 76 * s, x + 66 * s * f, y - 96 * s], 9 * s, 4 * s);
  trunk([x - 4 * s * f, y - 78 * s, x + 18 * s * f, y - 112 * s, x + 20 * s * f, y - 136 * s], 7 * s, 3.4 * s);
  for (let i = 0; i < 6; i++) { const yy = y - 6 * s - i * 12 * s; stroke(g, [x - 5 * s, yy, x + 3 * s, yy - 3 * s], mix(tr, '#000000', 0.35), 1.1 * s, 0.6); }
  const pads = [[x - 34 * s * f, y - 114 * s, 54 * s, 20 * s], [x + 68 * s * f, y - 100 * s, 46 * s, 17 * s], [x + 18 * s * f, y - 142 * s, 50 * s, 19 * s], [x - 70 * s * f, y - 98 * s, 34 * s, 13 * s], [x + 4 * s * f, y - 120 * s, 40 * s, 15 * s]];
  pinePads(g, pads, P, R, s);
}
// ── 꽃나무: 검붉은 가지가 비스듬히 뻗고, 가지 끝마다 꽃송이 구름이 핀다 ──
function bloomTree(g, x, y, s, P, R, flip) {
  const f = flip ? -1 : 1, tr = mix(P.trunk, '#2a1c18', 0.35), tips = [];
  dab(g, x + 20 * s * f, y + 2, 110 * s, 12 * s, '#2a2014', P.night ? 0.3 : 0.2);
  const branch = (x0, y0, a, len, w, d) => {
    const x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len, mx = (x0 + x1) / 2 + Math.sin(a) * len * 0.12 * (R() - 0.5), my = (y0 + y1) / 2 - Math.cos(a) * len * 0.12 * (R() - 0.5);
    g.globalAlpha = 1; g.strokeStyle = tr; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(mx, my, x1, y1); g.stroke();
    if (w > 5) { g.globalAlpha = 0.35; g.strokeStyle = mix(tr, '#e8c8a8', 0.4); g.lineWidth = w * 0.25; g.beginPath(); g.moveTo(x0 - w * 0.2, y0); g.quadraticCurveTo(mx - w * 0.2, my, x1 - w * 0.2, y1); g.stroke(); }
    if (d <= 0 || len < 14 * s) { tips.push([x1, y1]); return; }
    const n = d > 2 ? 2 : 2 + (R() < 0.4 ? 1 : 0); for (let i = 0; i < n; i++) branch(x1, y1, a + (i - (n - 1) / 2) * (0.55 + R() * 0.35) + (R() - 0.5) * 0.3, len * (0.62 + R() * 0.18), w * 0.62, d - 1);
    if (d < 3) tips.push([x1, y1]);
  };
  branch(x, y, -Math.PI / 2 + 0.32 * f, 70 * s, 15 * s, 4);
  branch(x + 4 * s * f, y - 30 * s, -Math.PI / 2 + 1.05 * f, 54 * s, 8 * s, 3);
  // 꽃송이: 짙은 바탕 → 가운데 빛 → 밝은 꽃잎, 군데군데 흰 꽃잎 (빈 가지(bare)면 눈송이·불씨만 성기게 얹힌다)
  const nb = P.bare ? 0.4 : 1;
  for (const [tx, ty] of tips) { const r = (16 + R() * 14) * s; for (let i = 0; i < 12 * nb; i++) { const a = R() * TAU, d = R() * r; dab(g, tx + Math.cos(a) * d, ty + Math.sin(a) * d * 0.75, (5 + R() * 6) * s, (4 + R() * 4) * s, P.bloom[2], 0.55); } }
  for (const [tx, ty] of tips) { const r = (15 + R() * 13) * s; for (let i = 0; i < 18 * nb; i++) { const a = R() * TAU, d = R() * r; dab(g, tx + Math.cos(a) * d, ty + Math.sin(a) * d * 0.7 - 3 * s, (3.4 + R() * 4.4) * s, (2.8 + R() * 3) * s, P.bloom[0], 0.75); } }
  for (const [tx, ty] of tips) { const r = (13 + R() * 10) * s; for (let i = 0; i < 12 * nb; i++) { const a = -Math.PI * R(), d = R() * r; dab(g, tx + Math.cos(a) * d - 3 * s, ty + Math.sin(a) * d * 0.7 - 5 * s, (2 + R() * 3) * s, (1.8 + R() * 2.2) * s, P.bloom[1], 0.85); } if (R() < 0.5) dab(g, tx, ty - 6 * s, 2 * s, 2 * s, '#ffffff', 0.8); }
  // 떨어진 꽃잎
  for (let i = 0; i < 26; i++) dab(g, x + (R() - 0.3) * 150 * s * f, y - 2 + R() * 10, 2.4 * s, 1.4 * s, R() < 0.5 ? P.bloom[0] : P.bloom[1], 0.8, R());
  g.globalAlpha = 1;
}
// 바위: 위는 볕을 받아 밝고 아래로 갈수록 그늘, 이끼 자국
function rock(g, x, y, w, h, P, R) {
  const [lc, dc] = P.rock, pts = []; for (let i = 0; i < 9; i++) { const a = Math.PI + i / 8 * Math.PI, rr2 = 0.82 + R() * 0.22; pts.push([x + Math.cos(a) * w * 0.5 * rr2, y + Math.sin(a) * h * rr2]); }
  dab(g, x + w * 0.08, y + 2, w * 0.6, h * 0.2, '#2a2014', 0.25);
  g.globalAlpha = 1; g.beginPath(); g.moveTo(x - w * 0.5, y); for (const [px, py] of pts) g.lineTo(px, py); g.lineTo(x + w * 0.5, y); g.closePath();
  g.fillStyle = vgrad(g, y - h, y, [[0, mix(lc, '#ffffff', 0.25)], [0.5, lc], [1, dc]]); g.fill();
  g.save(); g.clip(); dab(g, x + w * 0.22, y - h * 0.3, w * 0.4, h * 0.6, mix(dc, '#2a2a30', 0.3), 0.35); dab(g, x - w * 0.18, y - h * 0.8, w * 0.3, h * 0.22, '#ffffff', 0.3);
  for (let i = 0; i < 6; i++) dab(g, x + (R() - 0.5) * w * 0.8, y - R() * h * 0.5, 3 + R() * 6, 2 + R() * 3, P.grass[2], 0.35); g.restore();
  stroke(g, [x - w * 0.1, y - h * 0.8, x + w * 0.02, y - h * 0.45, x - w * 0.06, y - h * 0.15], mix(dc, '#1e1e22', 0.4), 1, 0.45); g.globalAlpha = 1;
}
// 풀포기: 가는 붓으로 쓸어 올린 잎 몇 가닥
function tuft(g, x, y, s, P, R, col) {
  const n = 5 + ((R() * 5) | 0); for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (R() - 0.5) * 1.3, l = (7 + R() * 9) * s, bx = x + (R() - 0.5) * 8 * s; stroke(g, [bx, y, bx + Math.cos(a) * l * 0.5 + (R() - 0.5) * 3, y + Math.sin(a) * l * 0.6, bx + Math.cos(a) * l, y + Math.sin(a) * l], i % 3 ? col || P.grass[2] : P.grass[0], 1.3 * s, 0.85); }
  g.globalAlpha = 1;
}
// 나무 울타리: 기둥과 두 줄 가로대, 군데군데 끊긴다
function fence(g, f, x0, x1, P, R) {
  const wd = P.wood, top = mix(wd, '#f4dcb0', 0.45), dk2 = mix(wd, '#1e140c', 0.4);
  let px = x0; const posts = []; while (px < x1) { posts.push(px); px += 30 + R() * 8; }
  for (let i = 0; i < posts.length - 1; i++) { if (R() < 0.08) continue; const a = posts[i], b = posts[i + 1]; for (const [h, sag] of [[20, 1.5], [11, 1]]) { stroke(g, [a, f(a) - h, (a + b) / 2, f((a + b) / 2) - h + sag, b, f(b) - h], dk2, 3.4); stroke(g, [a, f(a) - h - 0.8, (a + b) / 2, f((a + b) / 2) - h + sag - 0.8, b, f(b) - h - 0.8], top, 1.2, 0.8); } }
  for (const a of posts) { const y = f(a), h = 27 + R() * 4; g.globalAlpha = 1; g.fillStyle = vgrad(g, y - h, y, [[0, top], [0.25, wd], [1, dk2]]); g.fillRect(a - 2.6, y - h, 5.2, h); g.fillStyle = top; g.fillRect(a - 2.6, y - h, 5.2, 1.6); }
  g.globalAlpha = 1;
}

// ── 언덕과 성곽 (BW 한 장, 바닥의 절반 빠르기) ──
export function paintBack(id) {
  const key = 'back:' + id; let c = CACHE.get(key); if (c) return c;
  const P = pal(id), S = 1.25, Hh = 260; c = makeCanvas(BW * S, Hh * S); const g = c.getContext('2d'); g.scale(S, S); const R = rng(907);
  const haze = mix(P.sky[1], '#ffffff', P.night ? 0 : 0.15);
  // 두 무리의 언덕: 뒤 언덕에 성곽과 문루, 앞 언덕에 정자와 반송
  const hillA = x => 196 - 64 * bumpP(x, 640, 230, BW) - 40 * bumpP(x, 980, 160, BW) - 52 * bumpP(x, 1900, 240, BW) - 26 * bumpP(x, 2250, 150, BW) - Math.sin(x * 0.02) * 2;
  mountain(g, hillA, BW, 232, mix(P.hill[0], haze, 0.42), haze, R, { h: 90, n: 160, mist: 44 });
  wall(g, hillA, 560, 600, P, R); wall(g, hillA, 680, 740, P, R);
  g.globalAlpha = 0.9; gateTower(g, 640, hillA(640) + 2, 0.66, P); village(g, hillA, 1780, 8, P, R); pavilion(g, 1000, hillA(1000) + 1, 0.5, P); pavilion(g, 2260, hillA(2260) + 1, 0.46, P);
  // 안개를 한 겹 덮어 멀어 보이게
  g.globalAlpha = 1; g.fillStyle = vgrad(g, 90, 232, [[0, rgba(haze, 0.1)], [1, rgba(haze, 0.28)]]); g.fillRect(0, 90, BW, 142);
  for (let i = 0; i < 60; i++) { const x = R() * BW; dab(g, x, 198 + R() * 14, 60 + R() * 90, 7 + R() * 6, haze, 0.18); }   // 안개 띠
  const hillB = x => 232 - 44 * bumpP(x, 260, 200, BW) - 30 * bumpP(x, 1250, 260, BW) - 38 * bumpP(x, 1530, 170, BW) - 34 * bumpP(x, 2440, 210, BW) - Math.sin(x * 0.03 + 1) * 2;
  mountain(g, hillB, BW, 258, mix(P.hill[0], '#1e2a1e', 0.12), haze, R, { h: 70, n: 160, mist: 22 });
  pavilion(g, 260, hillB(260) + 1, 0.7, P); pavilion(g, 1530, hillB(1530) + 1, 0.62, P);
  // 언덕 위의 작은 반송과 덤불 (멀어서 작고 옅다)
  g.globalAlpha = 1;
  for (const [x, s2, fl] of [[200, 0.28, false], [330, 0.24, true], [1180, 0.3, false], [1330, 0.22, true], [1470, 0.26, true], [1600, 0.3, false], [2380, 0.28, false], [2520, 0.24, true], [800, 0.2, false], [2050, 0.22, true]]) wrapAt(BW, x, 60, xx => { g.save(); g.globalAlpha = 0.9; umbrellaPine(g, xx, hillB(xx) + 6, s2, Object.assign({}, P, { leaf: P.leaf.map(q => mix(q, haze, 0.3)), trunk: mix(P.trunk, haze, 0.3) }), R, fl); g.restore(); });
  for (let i = 0; i < 700; i++) { const x = R() * BW, y = 238 + R() * 20 - 6 * Math.sin(x * 0.01); dab(g, x, y, 6 + R() * 12, 4 + R() * 7, R() < 0.6 ? mix(P.leaf[0], '#0e1a12', 0.15) : P.leaf[1], 0.8); }   // 울타리 뒤로 보이는 짙은 숲 띠
  if (P.smoke) for (const sx of [420, 1180, 1960]) for (let i = 0; i < 26; i++) { const t = i / 25; dab(g, sx + Math.sin(t * 5) * 22 * t + t * 60, 200 - t * 150, 10 + t * 34, 8 + t * 22, mix('#5e5650', P.sky[0], t * 0.45), 0.42 * (1 - t * 0.55)); }
  g.fillStyle = vgrad(g, 222, 258, [[0, rgba(haze, 0)], [1, rgba(haze, 0.5)]]); g.globalAlpha = 1; g.fillRect(0, 222, BW, 38);
  return keep(key, c);
}

// ── 싸움터 바닥 (GW 한 장, 행군과 함께 흐른다) ──
export const FIELD_TOP = 182;
export function paintGround(id, seed = 7) {
  const key = 'ground:' + id + ':' + seed; let c = CACHE.get(key); if (c) return c;
  const P = pal(id), S = 1.25; c = makeCanvas(GW * S, H * S); const g = c.getContext('2d'); g.scale(S, S); const R = rng(seed * 977 + 41), k = TAU / GW;
  const top = x => FIELD_TOP + Math.sin(x * k * 4 + 0.6) * 4 + Math.sin(x * k * 11) * 2;
  // 들판 뒤 둔덕: 풀빛 띠 위로 덤불과 작은 꽃나무, 그 앞에 울타리
  const bank = x => top(x) - 14 - 6 * Math.sin(x * k * 6 + 1.2);
  g.beginPath(); g.moveTo(-10, H); for (let x = -10; x <= GW + 10; x += 8) g.lineTo(x, bank(x)); g.lineTo(GW + 10, H); g.closePath(); g.globalAlpha = 1; g.fillStyle = vgrad(g, FIELD_TOP - 24, FIELD_TOP + 30, [[0, mix(P.grass[2], P.hill[1], 0.3)], [1, P.grass[0]]]); g.fill();
  for (let i = 0; i < 260; i++) { const x = R() * GW, y = bank(x) + R() * 16; wrapAt(GW, x, 20, xx => dab(g, xx, y, 8 + R() * 14, 4 + R() * 6, R() < 0.5 ? P.leaf[0] : mix(P.leaf[1], P.grass[2], 0.4), 0.55)); }
  for (let i = 0; i < 120; i++) { const x = R() * GW, y = bank(x) + R() * 10; wrapAt(GW, x, 16, xx => dab(g, xx, y - 3, 5 + R() * 8, 3 + R() * 3, P.leaf[2], 0.4)); }
  // 둔덕 뒤의 큰 바위 무리와 떨기나무 (울타리 너머)
  for (const [bx, n] of [[330, 3], [930, 2], [1520, 3], [2210, 2]]) for (let j = 0; j < n; j++) { const x = bx + j * (34 + R() * 20), w = 50 + R() * 50; wrapAt(GW, x, w, xx => rock(g, xx, bank(x) + 8, w, w * (0.55 + R() * 0.25), P, R)); }
  for (let i = 0; i < 46; i++) { const x = R() * GW, y = bank(x) + 2, r = 14 + R() * 18, fl2 = R() < 0.3; wrapAt(GW, x, r * 2, xx => { for (let j = 0; j < 9; j++) dab(g, xx + (R() - 0.5) * r * 1.6, y - R() * r * 0.9, r * (0.35 + R() * 0.3), r * (0.25 + R() * 0.2), j < 4 ? P.leaf[0] : P.leaf[1], 0.8); for (let j = 0; j < 7; j++) dab(g, xx + (R() - 0.5) * r * 1.3, y - r * 0.5 - R() * r * 0.5, 3 + R() * 4, 2 + R() * 2, fl2 ? P.bloom[R() < 0.5 ? 0 : 1] : P.leaf[2], fl2 ? 0.85 : 0.55); }); }
  // 들판: 가운데는 모래빛 흙, 가장자리와 군데군데 풀밭
  g.beginPath(); g.moveTo(-10, H); for (let x = -10; x <= GW + 10; x += 8) g.lineTo(x, top(x) + 8); g.lineTo(GW + 10, H); g.closePath();
  g.globalAlpha = 1; g.fillStyle = vgrad(g, FIELD_TOP, H, [[0, mix(P.sand[0], P.grass[0], 0.3)], [0.35, P.sand[0]], [1, P.sand[1]]]); g.fill();
  g.save(); g.clip();
  // 풀밭이 모이는 곳: 뒤쪽 가장자리, 앞쪽 가장자리, 그리고 들판의 풀섬 몇
  const isles = Array.from({ length: 11 }, () => [R() * GW, 260 + R() * 240, 60 + R() * 130, 18 + R() * 32]);
  const dens = (x, y) => { let d = Math.exp(-Math.pow((y - FIELD_TOP - 10) / (40 + 14 * Math.sin(x * k * 7)), 2)) + Math.exp(-Math.pow((y - 574) / (46 + 16 * Math.sin(x * k * 5 + 2)), 2)); for (const [ix, iy, rx, ry] of isles) { const dx = (((x - ix) % GW) + GW * 1.5) % GW - GW / 2; d += Math.exp(-(dx * dx) / (rx * rx) - Math.pow((y - iy) / ry, 2)) * 0.8; } return Math.min(1, d); };
  // 흙빛의 큰 얼룩 (붓을 눕혀 넓게)
  for (let i = 0; i < 420; i++) { const x = R() * GW, y = 230 + R() * 300, r = 30 + R() * 80; wrapAt(GW, x, r, xx => dab(g, xx, y, r, r * 0.26, R() < 0.45 ? mix(P.sand[0], '#fff8e4', 0.25) : mix(P.sand[1], '#7a5a34', 0.25), 0.14)); }
  { const py = x => 380 + Math.sin(x * k * 2 + 0.4) * 70 + Math.sin(x * k * 5) * 18, pw = x => 34 + 10 * Math.sin(x * k * 6 + 1);
    for (let i = 0; i < 2600; i++) { const x = R() * GW, y = py(x) + (R() - 0.5) * 2 * pw(x) * 0.85, r = 6 + R() * 16; wrapAt(GW, x, r, xx => dab(g, xx, y, r, r * 0.24, mix(P.sand[0], '#fff6e2', 0.4), 0.16)); }
    for (let i = 0; i < 1600; i++) { const x = R() * GW, side = R() < 0.5 ? -1 : 1, y = py(x) + side * pw(x) + (R() - 0.5) * 6, r = 4 + R() * 10; wrapAt(GW, x, r, xx => dab(g, xx, y, r, r * 0.22, mix(P.sand[1], '#5a4024', 0.3), 0.18)); } }   // 밝게 닳은 길
  // 풀: 먼저 넓은 붓으로 풀빛 바탕을 깔고, 가는 붓으로 잎 자국을 얹는다
  for (let i = 0; i < 9000; i++) { const x = R() * GW, y = FIELD_TOP + R() * (H - FIELD_TOP), d = dens(x, y); if (R() > d) continue; const r = 10 + R() * 14; wrapAt(GW, x, r, xx => dab(g, xx, y, r, r * 0.22, R() < 0.6 ? P.grass[0] : P.grass[2], 0.06 + d * 0.16)); }
  for (let i = 0; i < 52000; i++) { const x = R() * GW, y = FIELD_TOP + R() * (H - FIELD_TOP), d = dens(x, y); if (R() > d * d) continue; const r = 2 + R() * 5, q = R(), col = q < 0.42 ? P.grass[0] : q < 0.72 ? P.grass[1] : P.grass[2]; wrapAt(GW, x, r, xx => dab(g, xx, y, r, r * 0.34, col, 0.2 + d * 0.5 * R() + d * 0.2)); }
  // 풀밭 가장자리의 볕: 위쪽에 밝은 잎 자국
  for (let i = 0; i < 5000; i++) { const x = R() * GW, y = FIELD_TOP + R() * (H - FIELD_TOP), d = dens(x, y); if (R() > d * d * 0.8) continue; wrapAt(GW, x, 6, xx => dab(g, xx, y - 2, 3 + R() * 4, 1.4 + R() * 1.4, mix(P.grass[1], '#fff4c0', 0.3), 0.45)); }
  // 흙의 결: 밝게 닳은 자리와 옅은 바퀴 자국 같은 붓결
  for (let i = 0; i < 700; i++) { const x = R() * GW, y = 230 + R() * 300; if (dens(x, y) > 0.45) continue; wrapAt(GW, x, 40, xx => dab(g, xx, y, 14 + R() * 30, 3 + R() * 5, R() < 0.6 ? mix(P.sand[0], '#ffffff', 0.25) : mix(P.sand[1], '#8a6a40', 0.15), 0.16)); }
  for (let i = 0; i < 300; i++) { const x = R() * GW, y = 220 + R() * 330; wrapAt(GW, x, 4, xx => { dab(g, xx + 0.8, y + 1, 2 + R() * 2.4, 1.2 + R() * 1.2, '#4a3a28', 0.18); dab(g, xx, y, 1.6 + R() * 2.2, 1 + R() * 1.2, mix(P.rock[0], '#ffffff', R() * 0.3), 0.7); }); }
  // 풀포기와 들꽃 (풀밭 쪽에 많다)
  for (let i = 0; i < 900; i++) { const x = R() * GW, y = FIELD_TOP + 10 + R() * (H - FIELD_TOP - 10), d = dens(x, y); if (R() > d * 0.9) continue; wrapAt(GW, x, 12, xx => tuft(g, xx, y, 0.7 + R() * 0.6, P, R)); }
  const fl = P.night ? ['#c9c4e8', '#f0e8ff'] : ['#f4e38a', '#fbf7ec', P.bloom[0]];
  for (let i = 0; i < 420; i++) { const x = R() * GW, y = FIELD_TOP + 14 + R() * (H - FIELD_TOP - 14); if (R() > dens(x, y) * 0.8) continue; const col = fl[(R() * fl.length) | 0]; wrapAt(GW, x, 4, xx => { dab(g, xx, y, 2.2, 1.8, col, 0.9); dab(g, xx, y, 0.8, 0.8, '#d9a441', 0.8); }); }
  for (let i = 0; i < 90; i++) { const x = R() * GW, y = 220 + R() * 320, w = 8 + R() * 14; if (R() < 0.5 && dens(x, y) < 0.2) continue; wrapAt(GW, x, w, xx => rock(g, xx, y, w, w * 0.5, P, R)); }
  // 바위 몇 덩이 (가장자리 쪽)
  for (let i = 0; i < 14; i++) { const x = R() * GW, y = R() < 0.5 ? FIELD_TOP + 18 + R() * 30 : 500 + R() * 50, w = 26 + R() * 46; wrapAt(GW, x, w, xx => rock(g, xx, y, w, w * (0.4 + R() * 0.2), P, R)); }
  g.restore();
  g.globalAlpha = 1; g.fillStyle = vgrad(g, 470, 566, [[0, 'rgba(40,34,20,0)'], [1, P.night ? 'rgba(10,10,24,0.35)' : 'rgba(50,40,20,0.26)']]); g.fillRect(0, 470, GW, 96);
  // 들판 끝 가장자리의 부드러운 그늘
  g.globalAlpha = 1; g.fillStyle = vgrad(g, FIELD_TOP, FIELD_TOP + 40, [[0, 'rgba(60,50,30,0.22)'], [1, 'rgba(60,50,30,0)']]); g.fillRect(0, FIELD_TOP, GW, 40);
  // 울타리 (들판 뒤 둔덕을 따라)
  fence(g, x => top(x) - 2, 10, GW - 10, P, R);
  // 빛: 위는 따뜻하고 밝게, 앞쪽은 조금 눌러 깊이를 준다
  g.save(); g.globalCompositeOperation = 'source-atop'; g.fillStyle = vgrad(g, FIELD_TOP - 30, H, P.night ? [[0, 'rgba(180,190,255,0.12)'], [1, 'rgba(20,24,60,0.3)']] : [[0, `rgba(${P.light},0.22)`], [0.6, 'rgba(255,240,210,0)'], [1, 'rgba(90,60,30,0.16)']]); g.fillRect(0, 0, GW, H); g.restore();
  g.globalAlpha = 1; return keep(key, c);
}
// 맨 앞 한 겹: 패 받침 바로 위의 풀과 돌 (낮게, 인형을 가리지 않게)
export function paintFront(id) {
  const key = 'front:' + id; let c = CACHE.get(key); if (c) return c;
  const P = pal(id), S = 1.25; c = makeCanvas(GW * S, H * S); const g = c.getContext('2d'); g.scale(S, S); const R = rng(613);
  for (let i = 0; i < 70; i++) { const x = R() * GW, n = 2 + ((R() * 6) | 0), y = 548 + R() * 22; wrapAt(GW, x, 40, xx => { for (let j = 0; j < n; j++) tuft(g, xx + (R() - 0.5) * 30, y + R() * 8, 0.9 + R() * 0.8, P, R, R() < 0.5 ? P.leaf[0] : P.grass[2]); }); }
  const fl = P.night ? ['#c9c4e8', '#f0e8ff'] : ['#f4e38a', '#fbf7ec', P.bloom[0]];
  for (const cx of [0, 1280]) for (let i = 0; i < 60; i++) { const x = cx + (R() - 0.5) * 360, y = 530 + R() * 36, col = fl[(R() * fl.length) | 0]; wrapAt(GW, x, 6, xx => { tuft(g, xx, y + 4, 0.8, P, R); dab(g, xx, y - 6, 2.6, 2.2, col, 0.95); dab(g, xx, y - 6, 1, 1, '#d9a441', 0.9); }); }
  for (const cx of [0, 1280]) for (let i = 0; i < 4; i++) { const x = cx + (R() - 0.5) * 300, w = 40 + R() * 50; wrapAt(GW, x, w, xx => rock(g, xx, 566 + R() * 4, w, w * 0.42, P, R)); }
  g.globalAlpha = 1; return keep(key, c);
}
// 들판에 선 큰 나무들 (인형들과 앞뒤를 맞춰 그린다): 뒤쪽 반송, 앞 양옆의 꽃나무
export function paintTrees(id) {
  const key = 'trees:' + id; let a = CACHE.get(key); if (a) return a;
  const P = pal(id), S2 = 2, pad = 16;
  const mk = (fn, w, h) => { const c = makeCanvas((w + pad * 2) * S2, (h + 24) * S2), g = c.getContext('2d'); g.scale(S2, S2); g.translate(pad + w / 2, h); fn(g); return { img: c, ox: pad + w / 2, oy: h, w: w + pad * 2, h: h + 24 }; };
  a = [
    { wx: 150, y: 214, s: 1.05, kind: 'pine', f: false, w: 300, h: 200 },
    { wx: 1130, y: 206, s: 0.85, kind: 'pine', f: true, w: 260, h: 170 },
    { wx: 1720, y: 216, s: 1.0, kind: 'pine', f: true, w: 300, h: 190 },
    { wx: 2330, y: 208, s: 0.8, kind: 'pine', f: false, w: 240, h: 160 },
    { wx: -14, y: 640, s: 1.0, kind: 'bloom', f: false, w: 320, h: 260, under: true },
    { wx: 1310, y: 640, s: 0.95, kind: 'bloom', f: true, w: 310, h: 250, under: true },
    { wx: 560, y: 200, s: 0.55, kind: 'bloom', f: true, w: 180, h: 140 },
    { wx: 2040, y: 198, s: 0.5, kind: 'bloom', f: false, w: 170, h: 130 },
  ].map((t, i) => {
    const R = rng(1201 + i * 37);
    const spr = mk(g => t.kind === 'pine' ? umbrellaPine(g, 0, 0, t.s, P, R, t.f) : bloomTree(g, 0, 0, t.s, P, R, t.f), t.w, t.h);
    return { wx: t.wx, y: t.y, hw: t.w * 0.36, h: t.fh || t.h * 0.9, fade: t.kind === 'bloom' ? 0.45 : 0.32, under: !!t.under, spr };
  });
  return keep(key, a);
}
export const paintNight = id => pal(id).night;
