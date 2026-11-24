// 시간과 날씨: 치비 먹선 스타일의 같은 싸움을 새벽·낮·노을·달밤과 맑음·비·뇌우·눈·안개·낙엽으로 바꿔 본다
import { LW, LH, INK, Spr, bayer, rng, mixc, remap } from './px.js';
import { fr } from './scenes.js';
import { TH, makeBattle } from './variants.js';

TH.dawn = { sky: [0x4c5a9c, 0x7078b8, 0xa494c4, 0xdcaec4, 0xf8c8b8, 0xfde0c0, 0xfff2d8], sun: { x: 150, y: 112, r: 13, c: [0xfffbe8, 0xffeccc, 0xffdcc0] },
  clouds: [[90, 70, 100, [0xb89cc8, 0xf4c4c8, 0xffe8dc]], [280, 50, 110, [0x9c8cc4, 0xe8b4c8, 0xffe0d8]], [470, 66, 90, [0xa894c4, 0xf0bcc4, 0xffecdc]], [590, 46, 70, [0x9c8cc4, 0xe4b0c8, 0xffdcd8]]],
  m1: [0xa8a4d0, 0xd0c0dc, 0xecd0d4], m2: [0x7488b8, 0xa0b0d4, 0xd0c4d8, 0x6078a8], m3: [0x3c7078, 0x6ca488, 0xa8c4b4, 0x2c5c68],
  wall: [0xece0d0, 0x8c8ca8, 0xc0b8c0, 0xd8ccc4, 0xb0a8b4, 0x3c4064, 0x383c60, 0x505880, 0xffe0b0, 0xa04448, 0x602838],
  field: [0xc4dc98, 0xa4d088, 0x84c078, 0x64a86c, 0x4c9064, 0x38785c], path: [0xd8c498, 0xecdcb0, 0xbca478, 0xc4b084, 0xf4e8c0, 0xa09078, 0xd0c8b8],
  spk: [0xdcec9c, 0x84c078, 0x74b470, 0x286048, 0x9cd484], bush: [0x30745c, 0x9cd484, 0xffe890], fence: [0x705040, 0xbc9060, 0x58382c, 0x886048] };

export const LIVE = { time: 'day', weather: 'clear', outline: true, auto: false, shown: 'day' };
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
// 눈 내린 들판: 덧칠하지 않고 눈빛 색으로 테마를 다시 짜서 통째로 굽는다
const SNOWP = {
  day: { field: [0xd8e2ee, 0xe2eaf4, 0xeaf0f8, 0xf2f6fa, 0xf8fafc, 0xffffff], path: [0xc0c6d4, 0xd8dce8, 0xa4aaba, 0xb0b6c4, 0xeceef4, 0x8a8076, 0xccd0dc], spk: [0xffffff, 0xc8d4e6, 0xc4d0e2, 0xc4d0e2, 0x7a8c80], bush: [0x426a5c, 0xffffff, 0xe4ecf6], cap: [0xffffff, 0xd4deec], tuft: 0xe4ecf4 },
  dawn: { field: [0xdcd4e4, 0xe4dcea, 0xece4ee, 0xf4ecf2, 0xfaf2f4, 0xfff8f6], path: [0xc4b8c8, 0xdacfdc, 0xa89cb0, 0xb4a8bc, 0xf0e6ec, 0x8a7c7c, 0xd0c4d2], spk: [0xfffaf6, 0xcfc4da, 0xccc0d8, 0xccc0d8, 0x7c8880], bush: [0x4a6a64, 0xfffaf6, 0xece2ee], cap: [0xfff6f4, 0xdccfe0], tuft: 0xece2ec },
  dusk: { field: [0xc8b4cc, 0xd4bed2, 0xe0c8d6, 0xeacfd8, 0xf2d8dc, 0xfae2e0], path: [0xac94ac, 0xc4acc0, 0x927c98, 0x9c86a2, 0xdcc4d0, 0x6c5866, 0xb8a2b8], spk: [0xfff0e6, 0xb8a0bc, 0xbca4c0, 0xbca4c0, 0x6a6a6a], bush: [0x3e5a5c, 0xfff0e6, 0xe8d4dc], cap: [0xfff0ea, 0xd4b8cc], tuft: 0xe0ccd6 },
  night: { field: [0x5a6a9a, 0x6272a2, 0x6a7aaa, 0x7484b4, 0x7e8ebe, 0x8898c8], path: [0x4a5680, 0x5a6690, 0x404a72, 0x465278, 0x6a76a0, 0x323a56, 0x54608a], spk: [0xc4d2f4, 0x6676aa, 0x6676aa, 0x6676aa, 0x2c4448], bush: [0x1c3644, 0xb4c4ec, 0x8c9cd0], cap: [0xb8c8f0, 0x8494c4], tuft: 0x7c8cbc },
};
function snowTheme(time) {
  const th = TH[time], P = SNOWP[time], o = Object.assign({}, th, { field: P.field, path: P.path, spk: P.spk, bush: P.bush, snow: P.cap });
  o.sprFix = sp => remap(sp, 'snowtuft' + time, c => (c === INK ? c : mixc(c, P.tuft, 0.62)));
  return o;
}
// 안개: 점 무늬로 번지는 둥근 안개 덩이 (가장자리가 디더로 풀린다). w 는 가로로 이어지는 길이
function fogBank(w, h, cols, seed, n) {
  const s = new Spr(w, h), R = rng(seed), B = [];
  for (let i = 0; i < n; i++) { const cx = (i + R() * 0.6) / n * w, rx = w / n * (0.55 + R() * 0.8), ry = h * (0.22 + R() * 0.42); B.push([cx, h - ry * (0.35 + R() * 0.25), rx, ry]); }
  const f = (x, y) => { let v = 0; for (const [cx, cy, rx, ry] of B) for (const dx of [0, -w, w]) { const q = 1 - ((x - cx - dx) / rx) ** 2 - ((y - cy) / ry) ** 2; if (q > v) v = q; } return v + Math.max(0, (y - h * 0.72) / (h * 0.28)) * 0.6; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = f(x, y); if (v > 0.42 || (v > 0.06 && bayer(x, y) < (v - 0.06) / 0.36)) s.set(x, y, cols[1]); }
  for (let y = 1; y < h; y++) for (let x = 0; x < w; x++) if (s.get(x, y) !== -1 && s.get(x, y - 1) === -1 && f(x, y) > 0.3) { s.set(x, y, cols[2]); if ((x & 1) && s.get(x, y + 1) !== -1) s.set(x, y + 1, cols[2]); }
  return s;
}
// 먼 풍경을 흐리게: 지평선 쪽일수록 촘촘한 점 무늬로 덮는다
function haze(col, y0, y1, peak) { const s = new Spr(LW, LH); for (let y = y0; y < y1; y++) { const d = y < peak ? (y - y0) / (peak - y0) : 1 - (y - peak) / (y1 - peak), k = Math.max(0, d) * 0.62; for (let x = 0; x < LW; x++) if (bayer(x, y) < k) s.set(x, y, col); } return s; }
const FOGC = { day: [0xb8c4c8, 0xdfe6e8, 0xf6f8f8], dawn: [0xc8b8c8, 0xeadde6, 0xfbf2f4], dusk: [0xb898a8, 0xe4c4c8, 0xf8dcd8], night: [0x3c4878, 0x56649a, 0x7484b8] };

function makeTime(time, snowy) {
  const night = time === 'night', W = night ? [0xb4c4ec, 0x8c9cd0, 0x6c7cb8] : time === 'dusk' ? [0xfff0e8, 0xf0d0d8, 0xd0b0cc] : [0xffffff, 0xe4ecf8, 0xc4d4ec];
  const rainCol = night ? 'rgba(150,180,240,0.5)' : 'rgba(214,230,255,0.62)', wcol = night ? 0xdce6ff : 0xffffff;
  let bank = null, F = null;
  const clip = (g, fn) => { g.save(); g.beginPath(); g.rect(0, 26, LW, 258); g.clip(); fn(); g.restore(); };
  const mid = (g, t, B) => { const w = LIVE.weather;
    if (w === 'rain' || w === 'storm' || w === 'snow') { if (!bank) bank = cloudBank(time); g.drawImage(bank.canvas(), 0, 0); }
    if (w === 'leaves') { const LC = [0xe8742c, 0xd8442c, 0xf0b838, 0xc85c20]; for (let k = 0; k < 150; k++) { const x = Math.round(hash(k, 1) * LW), y = Math.round(152 + hash(k, 2) * 130); fr(g, x, y, 2 + (k % 2), 1, LC[k % 4]); fr(g, x + 1, y - 1, 1, 1, LC[(k + 1) % 4]); } }
    if (w === 'fog') { if (!F) { const c = FOGC[time]; F = { hz: haze(c[1], 30, 200, 128), back: fogBank(LW * 2, 52, c, 7, 22), mid: fogBank(LW * 2, 40, c, 3, 16), front: fogBank(LW * 2, 60, c, 13, 14) }; }
      g.drawImage(F.hz.canvas(), 0, 0); const ox = Math.round((t * 6) % (LW * 2)); g.save(); g.globalAlpha = 0.92; g.drawImage(F.back.canvas(), -ox, 112); g.drawImage(F.back.canvas(), LW * 2 - ox, 112); g.globalAlpha = 0.55; const o2 = Math.round((t * 9 + 400) % (LW * 2)); g.drawImage(F.mid.canvas(), -o2, 160); g.drawImage(F.mid.canvas(), LW * 2 - o2, 160); g.restore(); }
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
      g.fillStyle = night ? 'rgba(110,130,210,0.10)' : 'rgba(200,214,240,0.10)'; g.fillRect(0, 26, LW, 258);
      const far = '#' + W[1].toString(16), near = '#' + W[0].toString(16);
      for (let k = 0; k < 110; k++) { const y = (k * 29 + t * (9 + (k % 3) * 3)) % 264 + 24, x = ((k * 61.3 + Math.sin(t * 0.7 + k) * 5 - t * 3) % LW + LW) % LW; g.fillStyle = far; g.fillRect(Math.round(x), Math.round(y), 1, 1); }
      for (let k = 0; k < 70; k++) { const y = (k * 37 + t * (20 + (k % 4) * 5)) % 264 + 24, x = ((k * 83.1 + Math.sin(t * 1.1 + k * 1.7) * 9 - t * 6) % LW + LW) % LW; g.fillStyle = near; g.fillRect(Math.round(x), Math.round(y), 2, 2); }
      for (let k = 0; k < 16; k++) { const y = (k * 53 + t * (38 + (k % 3) * 8)) % 280 + 20, x = ((k * 127.7 + Math.sin(t * 1.4 + k) * 14 - t * 10) % LW + LW) % LW, X = Math.round(x), Y = Math.round(y); g.fillStyle = near; g.fillRect(X - 1, Y, 3, 1); g.fillRect(X, Y - 1, 1, 3); }
    } else if (w === 'fog') {
      const ox = Math.round((t * 14) % (LW * 2)); g.save(); g.globalAlpha = 0.6; g.drawImage(F.front.canvas(), -ox, 228); g.drawImage(F.front.canvas(), LW * 2 - ox, 228); g.restore();
      const c = FOGC[time][1]; g.fillStyle = `rgba(${c >> 16},${(c >> 8) & 255},${c & 255},0.12)`; g.fillRect(0, 26, LW, 258);
    } else if (w === 'leaves') {
      g.fillStyle = 'rgba(236,150,40,0.10)'; g.fillRect(0, 26, LW, 258); const LC = ['#e8742c', '#d8442c', '#f0b838', '#c85c20'], LD = ['#a04818', '#8a1c30', '#c08020', '#7c3410'];
      for (let k = 0; k < 90; k++) { const x = ((k * 83 + t * (40 + (k % 4) * 14) + Math.sin(t * 1.7 + k) * 12) % (LW + 20)) - 10, y = (k * 47 + t * (22 + (k % 3) * 9) + Math.sin(t * 2.3 + k * 1.3) * 7) % 264 + 24, f = Math.floor(t * 5 + k) % 4, X = Math.round(x), Y = Math.round(y), big = k % 3 === 0;
        g.fillStyle = LC[k % 4]; if (f === 0) { g.fillRect(X, Y, big ? 4 : 3, 2); g.fillRect(X + 1, Y - 1, 2, 1); } else if (f === 1) { g.fillRect(X, Y, 2, big ? 4 : 3); g.fillRect(X + 2, Y + 1, 1, 2); } else if (f === 2) { g.fillRect(X, Y + 1, big ? 4 : 3, 1); g.fillRect(X + 1, Y, 2, 3); } else g.fillRect(X, Y, 2, 2);
        g.fillStyle = LD[k % 4]; g.fillRect(X + 1, Y + 1, 1, 1); }
    } }); };
  if (snowy) { TH[time + '_snow'] = snowTheme(time); }
  return makeBattle({ theme: snowy ? time + '_snow' : time, mid, over, fxp: sp => (LIVE.weather === 'snow' ? snowcap(sp, W) : sp), fxu: sp => (LIVE.outline ? wout(sp, wcol) : sp) });
}
const INST = {}; let OFF = null;
const inst = k => { const sn = LIVE.weather === 'snow', key = k + (sn ? '_s' : ''); return INST[key] || (INST[key] = makeTime(k, sn)); };
// 하루 흐름: 새벽 → 낮 → 노을 → 달밤을 차례로, 사이는 겹쳐 넘긴다
export function live(g, t) {
  if (!LIVE.auto) { LIVE.shown = LIVE.time; return inst(LIVE.time)(g, t); }
  const D = 5.5, F = 1.8, c = t % (D * 4), i = Math.floor(c / D), p = c - i * D, a = TIMES[i], b = TIMES[(i + 1) % 4];
  inst(a)(g, t); LIVE.shown = p > D - F / 2 ? b : a;
  if (p > D - F) { if (!OFF) { OFF = document.createElement('canvas'); OFF.width = LW; OFF.height = LH; } const og = OFF.getContext('2d'); og.imageSmoothingEnabled = false; inst(b)(og, t); g.save(); g.globalAlpha = (p - (D - F)) / F; g.drawImage(OFF, 0, 0); g.restore(); }
}
