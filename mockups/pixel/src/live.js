// 시간과 날씨: 치비 먹선 스타일의 같은 싸움을 새벽·낮·노을·달밤과 맑음·비·뇌우·눈·안개·낙엽으로 바꿔 본다
import { LW, LH, INK, Spr, bayer, rng } from './px.js';
import { fr } from './scenes.js';
import { TH, makeBattle } from './variants.js';

TH.dawn = { sky: [0x4c5a9c, 0x7078b8, 0xa494c4, 0xdcaec4, 0xf8c8b8, 0xfde0c0, 0xfff2d8], sun: { x: 150, y: 112, r: 13, c: [0xfffbe8, 0xffeccc, 0xffdcc0] },
  clouds: [[90, 70, 100, [0xb89cc8, 0xf4c4c8, 0xffe8dc]], [280, 50, 110, [0x9c8cc4, 0xe8b4c8, 0xffe0d8]], [470, 66, 90, [0xa894c4, 0xf0bcc4, 0xffecdc]], [590, 46, 70, [0x9c8cc4, 0xe4b0c8, 0xffdcd8]]],
  m1: [0xa8a4d0, 0xd0c0dc, 0xecd0d4], m2: [0x7488b8, 0xa0b0d4, 0xd0c4d8, 0x6078a8], m3: [0x3c7078, 0x6ca488, 0xa8c4b4, 0x2c5c68],
  wall: [0xece0d0, 0x8c8ca8, 0xc0b8c0, 0xd8ccc4, 0xb0a8b4, 0x3c4064, 0x383c60, 0x505880, 0xffe0b0, 0xa04448, 0x602838],
  field: [0xc4dc98, 0xa4d088, 0x84c078, 0x64a86c, 0x4c9064, 0x38785c], path: [0xd8c498, 0xecdcb0, 0xbca478, 0xc4b084, 0xf4e8c0, 0xa09078, 0xd0c8b8],
  spk: [0xdcec9c, 0x84c078, 0x74b470, 0x286048, 0x9cd484], bush: [0x30745c, 0x9cd484, 0xffe890], fence: [0x705040, 0xbc9060, 0x58382c, 0x886048] };

export const LIVE = { time: 'day', weather: 'clear', outline: false, auto: false, shown: 'day' };
export const TIMES = ['dawn', 'day', 'dusk', 'night'];
const CLOUD = { dawn: [0x6c6c98, 0x9890b4, 0xc0b4cc], day: [0x6c7c94, 0x8c9cb0, 0xb4c0cc], dusk: [0x54466e, 0x846888, 0xb48a98], night: [0x0a0e22, 0x141a3a, 0x222a52] };
const WATER = { dawn: 0xc0c0e0, day: 0xa4c0d8, dusk: 0xd0b0c0, night: 0x40548c };
const hash = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };

// 인형에 두르는 흰 테 한 픽셀, 소품에 얹는 눈
const CV = new WeakMap(), conv = (s, key, fn) => { let m = CV.get(s); if (!m) CV.set(s, m = new Map()); let o = m.get(key); if (!o) m.set(key, o = fn(s)); return o; };
const wout = (sp, col) => conv(sp, 'w' + col, s => s.outline(col));
const snowcap = (sp, W) => conv(sp, 'sn' + W[0], s => { const o = new Spr(s.w, s.h, s.ox, s.oy); o.d.set(s.d); for (let y = 2; y < s.h; y++) for (let x = 0; x < s.w; x++) { const v = s.get(x, y); if (v === -1 || v === INK) continue; if (s.get(x, y - 1) === INK && s.get(x, y - 2) === -1) { o.set(x, y, W[0]); const b = s.get(x, y + 1); if (b !== -1 && b !== INK) o.set(x, y + 1, (x + y) % 3 ? W[0] : W[1]); } } return o; });

function cloudBank(time) { const s = new Spr(LW, 96), c = CLOUD[time];
  for (let x = 0; x < LW; x++) { const e = 66 + Math.sin(x * 0.05) * 5 + Math.sin(x * 0.13 + 1) * 3 + Math.abs(Math.sin(x * 0.021 + 0.6)) * 9; for (let y = 24; y < e; y++) { const d = e - y, n = Math.sin(x * 0.03 + y * 0.11) + Math.sin(x * 0.011 - y * 0.07 + 2); s.set(x, y, d < 3 ? c[0] : d < 12 && bayer(x, y) > d / 12 ? c[0] : n > 0.9 ? c[2] : n > 0.5 && bayer(x, y) > 0.5 ? c[2] : c[1]); } }
  return s; }
function snowCover(bg, th, W) { const s = new Spr(LW, LH), in3 = (m, c) => m[0] === c || m[1] === c || m[2] === c, lay = c => (in3(th.m1, c) ? 1 : in3(th.m2, c) ? 2 : in3(th.m3, c) ? 3 : 0), PT = th.path;
  // 산마루: 겹마다 꼭대기에서 몇 픽셀만 하얗게
  for (let x = 0; x < LW; x++) for (let y = 78; y < 147; y++) { const l = lay(bg.get(x, y)); if (!l) continue; let d = 0; while (d < 9 && lay(bg.get(x, y - d - 1)) === l) d++; const cap = 2 + ((x * 7 + l * 3) % 3) + (l === 1 ? 2 : 0); if (d < cap) s.set(x, y, W[0]); else if (d === cap && x % 2) s.set(x, y, W[1]); }
  // 울타리·덤불 위에 얹힌 눈
  for (let y = 137; y < 150; y++) for (let x = 0; x < LW; x++) { const v = bg.get(x, y), u = bg.get(x, y - 1); if (v !== u && !lay(v) && (x + y) % 4) s.set(x, y, W[0]); }
  // 들판: 눈으로 덮고, 완만한 그늘 띠와 드문드문 비치는 풀만 남긴다. 길은 한 단 어둡게 다져진 눈
  for (let y = 150; y < 284; y++) for (let x = 0; x < LW; x++) { const v = bg.get(x, y), onPath = v === PT[0] || v === PT[1] || v === PT[2] || v === PT[3] || v === PT[4];
    const n = Math.sin(x * 0.045 + Math.sin(y * 0.09) * 1.6 + y * 0.02), n2 = Math.sin(x * 0.017 - y * 0.05 + 2);
    if (onPath) { s.set(x, y, n > 0.75 && bayer(x, y) > 0.5 ? -1 : (x + y * 2) % 9 === 0 ? W[2] : W[1]); continue; }
    if (n2 > 0.93 && bayer(x, y) > 0.4) continue;   // 풀이 비치는 자리
    s.set(x, y, n > 0.82 ? W[1] : n > 0.7 && (x + y) % 2 ? W[1] : n < -0.94 ? W[1] : W[0]); }
  return s; }

function makeTime(time) {
  const night = time === 'night', W = night ? [0xb4c4ec, 0x8c9cd0, 0x6c7cb8] : time === 'dusk' ? [0xfff0e8, 0xf0d0d8, 0xd0b0cc] : [0xffffff, 0xe4ecf8, 0xc4d4ec];
  const rainCol = night ? 'rgba(150,180,240,0.5)' : 'rgba(214,230,255,0.62)', wcol = night ? 0xdce6ff : 0xffffff;
  let bank = null;
  const clip = (g, fn) => { g.save(); g.beginPath(); g.rect(0, 26, LW, 258); g.clip(); fn(); g.restore(); };
  const mid = (g, t, B) => { const w = LIVE.weather;
    if (w === 'rain' || w === 'storm' || w === 'snow') { if (!bank) bank = cloudBank(time); g.drawImage(bank.canvas(), 0, 0); }
    if (w === 'leaves') { const LC = [0xe8742c, 0xd8442c, 0xf0b838, 0xc85c20]; for (let k = 0; k < 150; k++) { const x = Math.round(hash(k, 1) * LW), y = Math.round(152 + hash(k, 2) * 130); fr(g, x, y, 2 + (k % 2), 1, LC[k % 4]); fr(g, x + 1, y - 1, 1, 1, LC[(k + 1) % 4]); } }
    if (w === 'snow') { if (!B.snow) B.snow = snowCover(B.bg, TH[time], W); g.drawImage(B.snow.canvas(), 0, 0); }
    if (w === 'rain' || w === 'storm') for (const [k, [px, py, pw]] of [[200, 222, 15], [330, 206, 11], [470, 228, 17], [92, 214, 9], [566, 214, 12]].entries()) {   // 길 위 물웅덩이와 번지는 물결
      for (let j = -3; j <= 3; j++) { const hw = Math.round(pw * Math.sqrt(1 - (j / 3.6) ** 2)); fr(g, px - hw, py + j, hw * 2, 1, WATER[time]); } fr(g, px - pw + 4, py - 2, pw - 2, 1, wcol);
      const p = (t * 1.4 + k * 0.31) % 1, r = 2 + p * (pw - 4); g.fillStyle = `rgba(255,255,255,${0.8 * (1 - p)})`; g.fillRect(Math.round(px - r), py, 2, 1); g.fillRect(Math.round(px + r), py, 2, 1); g.fillRect(Math.round(px - r * 0.6), py + 2, Math.round(r * 1.2), 1); } };
  const over = (g, t) => { const w = LIVE.weather; if (w === 'clear') return; clip(g, () => {
    if (w === 'rain' || w === 'storm') { const st = w === 'storm';
      g.fillStyle = st ? (night ? 'rgba(2,4,24,0.36)' : 'rgba(18,22,60,0.4)') : night ? 'rgba(4,8,36,0.22)' : 'rgba(44,62,104,0.24)'; g.fillRect(0, 26, LW, 258);
      g.fillStyle = rainCol; const n = st ? 260 : 150, sl = st ? 2 : 1;
      for (let k = 0; k < n; k++) { const sp = 430 + (k % 5) * 60, y = (k * 37 + t * sp) % 290 + 10, x = ((k * 53.7 - (y - 10) * sl * 0.34 - t * (st ? 90 : 20)) % (LW + 60) + LW + 60) % (LW + 60) - 30; g.fillRect(Math.round(x), Math.round(y), 1, 3); g.fillRect(Math.round(x) - sl, Math.round(y) + 3, 1, 3); if (k % 3 === 0) g.fillRect(Math.round(x) - sl * 2, Math.round(y) + 6, 1, 2); }
      for (let k = 0; k < (st ? 40 : 26); k++) { const ph = t * 2.4 + k * 0.37, i = Math.floor(ph), p = ph - i, x = Math.round(hash(k, i) * LW), y = Math.round(152 + hash(i, k + 9) * 128); if (p > 0.5) continue; g.fillStyle = `rgba(236,244,255,${0.9 - p})`; g.fillRect(x - 1 - Math.round(p * 5), y - Math.round(p * 2), 1, 1); g.fillRect(x + 1 + Math.round(p * 5), y - Math.round(p * 2), 1, 1); g.fillRect(x, y - 1 - Math.round(p * 4), 1, 1); }
      if (st) { const T = 4.2, c = t % T, i = Math.floor(t / T); if (c < 0.09 || (c > 0.16 && c < 0.22)) { g.fillStyle = 'rgba(232,238,255,0.5)'; g.fillRect(0, 26, LW, 258); }
        if (c < 0.34) { let x = 110 + hash(i, 3) * 420, y = 26; g.fillStyle = c < 0.22 ? '#ffffff' : 'rgba(220,230,255,0.6)'; for (let j = 0; y < 128; j++) { const nx = x + (hash(i, j) - 0.5) * 16, ny = y + 5 + hash(j, i) * 5; const steps = Math.ceil(ny - y); for (let q = 0; q < steps; q++) g.fillRect(Math.round(x + (nx - x) * q / steps), Math.round(y + q), 2, 1); if (j === 3 || j === 6) { let bx = nx, by = ny; for (let q = 0; q < 12; q++) { bx += j === 3 ? 1.4 : -1.2; by += 1; g.fillRect(Math.round(bx), Math.round(by), 1, 1); } } x = nx; y = ny; } } }
    } else if (w === 'snow') {
      g.fillStyle = night ? 'rgba(120,150,230,0.10)' : 'rgba(214,228,255,0.12)'; g.fillRect(0, 26, LW, 258);
      for (let k = 0; k < 150; k++) { const big = k % 6 === 0, y = (k * 29 + t * (20 + (k % 5) * 8)) % 264 + 24, x = ((k * 61.3 + Math.sin(t * 0.9 + k) * 9 - t * (5 + (k % 3) * 4)) % LW + LW) % LW; g.fillStyle = k % 4 === 3 ? '#' + W[1].toString(16) : '#ffffff'; g.fillRect(Math.round(x), Math.round(y), big ? 2 : 1, big ? 2 : 1); }
    } else if (w === 'fog') { const c = night ? '120,140,196' : time === 'dusk' ? '240,214,208' : '228,234,238';
      g.fillStyle = `rgba(${c},0.5)`; g.fillRect(0, 26, LW, 104); g.fillStyle = `rgba(${c},0.34)`; g.fillRect(0, 130, LW, 30); g.fillStyle = `rgba(${c},0.16)`; g.fillRect(0, 160, LW, 124);
      for (let k = 0; k < 10; k++) { const y = Math.round(128 + k * 16 + Math.sin(t * 0.3 + k) * 3), x0 = Math.round(((t * (5 + (k % 3) * 3) + k * 230) % (LW + 420)) - 420); g.fillStyle = `rgba(${c},${0.5 - k * 0.028})`; g.fillRect(x0 + 40, y - 3, 300, 3); g.fillRect(x0, y, 380, 6); g.fillRect(x0 + 70, y + 6, 250, 3); g.fillRect(x0 + 470, y + 2, 240, 5); g.fillRect(x0 + 500, y - 1, 170, 3); }
    } else if (w === 'leaves') {
      g.fillStyle = 'rgba(236,150,40,0.10)'; g.fillRect(0, 26, LW, 258); const LC = ['#e8742c', '#d8442c', '#f0b838', '#c85c20'], LD = ['#a04818', '#8a1c30', '#c08020', '#7c3410'];
      for (let k = 0; k < 90; k++) { const x = ((k * 83 + t * (40 + (k % 4) * 14) + Math.sin(t * 1.7 + k) * 12) % (LW + 20)) - 10, y = (k * 47 + t * (22 + (k % 3) * 9) + Math.sin(t * 2.3 + k * 1.3) * 7) % 264 + 24, f = Math.floor(t * 5 + k) % 4, X = Math.round(x), Y = Math.round(y), big = k % 3 === 0;
        g.fillStyle = LC[k % 4]; if (f === 0) { g.fillRect(X, Y, big ? 4 : 3, 2); g.fillRect(X + 1, Y - 1, 2, 1); } else if (f === 1) { g.fillRect(X, Y, 2, big ? 4 : 3); g.fillRect(X + 2, Y + 1, 1, 2); } else if (f === 2) { g.fillRect(X, Y + 1, big ? 4 : 3, 1); g.fillRect(X + 1, Y, 2, 3); } else g.fillRect(X, Y, 2, 2);
        g.fillStyle = LD[k % 4]; g.fillRect(X + 1, Y + 1, 1, 1); }
    } }); };
  return makeBattle({ theme: time, mid, over, fxp: sp => (LIVE.weather === 'snow' ? snowcap(sp, W) : sp), fxu: sp => (LIVE.outline ? wout(sp, wcol) : sp) });
}
const INST = {}; let OFF = null;
const inst = k => INST[k] || (INST[k] = makeTime(k));
// 하루 흐름: 새벽 → 낮 → 노을 → 달밤을 차례로, 사이는 겹쳐 넘긴다
export function live(g, t) {
  if (!LIVE.auto) { LIVE.shown = LIVE.time; return inst(LIVE.time)(g, t); }
  const D = 5.5, F = 1.8, c = t % (D * 4), i = Math.floor(c / D), p = c - i * D, a = TIMES[i], b = TIMES[(i + 1) % 4];
  inst(a)(g, t); LIVE.shown = p > D - F / 2 ? b : a;
  if (p > D - F) { if (!OFF) { OFF = document.createElement('canvas'); OFF.width = LW; OFF.height = LH; } const og = OFF.getContext('2d'); og.imageSmoothingEnabled = false; inst(b)(og, t); g.save(); g.globalAlpha = (p - (D - F)) / F; g.drawImage(OFF, 0, 0); g.restore(); }
}
