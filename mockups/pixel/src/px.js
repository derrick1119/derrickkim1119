// 도트 시안용 작은 엔진: 저해상도(640×360) 정수 픽셀만 다룬다. 색은 0xRRGGBB 정수, -1 은 투명.
export const LW = 640, LH = 360;
const H = s => parseInt(s.slice(1), 16);
// 색띠(ramp): 어두운 쪽은 보랏빛·푸른빛으로, 밝은 쪽은 노란빛으로 색상을 살짝 틀어 준다
const R = {
  ink: ['#120e1c', '#1b1425', '#2a2036', '#3c3050'],
  skin: ['#7a3c3a', '#b8704e', '#e8a87c', '#f8d4a8', '#fff0d0'],
  pale: ['#4a5878', '#8098b8', '#b8d0e0', '#e4f2f4', '#ffffff'],
  red: ['#4a1230', '#8a1c30', '#c83232', '#ec6a3c', '#ffa860'],
  blue: ['#161a40', '#26346e', '#3c5cae', '#6c9ce0', '#b0dcf8'],
  teal: ['#0e2e38', '#18584e', '#2e8c64', '#74c878', '#c8f098'],
  gold: ['#5a2c1a', '#a05a1c', '#e09a28', '#ffd24a', '#fff6a8'],
  white: ['#585a80', '#9aa2c0', '#d4dce8', '#f4f6f4', '#ffffff'],
  cream: ['#7a5848', '#b89468', '#e4cc98', '#f8ecc0', '#fffbe4'],
  wood: ['#2a161c', '#54301e', '#84522c', '#b8844a', '#e4bc78'],
  black: ['#0c0a14', '#1a1826', '#2e2e44', '#4c5070', '#7880a0'],
  steel: ['#22243a', '#4c5270', '#8c98b0', '#ccd8e4', '#ffffff'],
  dok: ['#4a1820', '#983020', '#dc5c28', '#f89848', '#ffd088'],      // 붉은 도깨비 살빛
  dokb: ['#1e2244', '#3c4880', '#6a80c0', '#a4bce8', '#dcecff'],     // 푸른 도깨비 살빛
  tiger: ['#5a2018', '#a84818', '#e88420', '#fcb848', '#ffe498'],
  grass: ['#143030', '#22583c', '#4c9040', '#94c850', '#d8ec80'],
  earth: ['#3c2428', '#6c4630', '#a47c4c', '#d4b47c', '#f0dca8'],
  stone: ['#2c2c44', '#555a74', '#8890a0', '#b8c0c4', '#e4e8e0'],
  pine: ['#0c2430', '#143c38', '#1e5a40', '#3a8448', '#74b454'],
  straw: ['#5a3a20', '#9a6c2c', '#d0a040', '#f0cc68', '#fff0a0'],
  pink: ['#6a2048', '#b03c68', '#e87090', '#fcb0b8', '#ffe0e0'],
  night: ['#0a0c20', '#141a3c', '#22305e', '#38508c', '#6084c0'],
  purple: ['#1c1238', '#3a2060', '#6a3c94', '#a070c8', '#d8b0f0'],
};
export const P = {}; const RAMP = new Map();
for (const k in R) { P[k] = R[k].map(H); P[k].forEach((c, i) => { if (!RAMP.has(c)) RAMP.set(c, [P[k], i]); }); }
export const INK = P.ink[1];
export const css = c => '#' + c.toString(16).padStart(6, '0');
export const hexc = H;
const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const bayer = (x, y) => (B4[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
export function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }

export class Spr {
  constructor(w, h, ox = 0, oy = 0) { this.w = w; this.h = h; this.ox = ox; this.oy = oy; this.d = new Int32Array(w * h).fill(-1); this.cv = null; }
  get(x, y) { return x < 0 || y < 0 || x >= this.w || y >= this.h ? -1 : this.d[y * this.w + x]; }
  set(x, y, c) { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = c; return this; }
  rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); return this; }
  hl(x0, x1, y, c) { for (let x = x0; x <= x1; x++) this.set(x, y, c); return this; }
  vl(x, y0, y1, c) { for (let y = y0; y <= y1; y++) this.set(x, y, c); return this; }
  // 줄마다 [x0, x1] 을 채운다 (손으로 잡은 실루엣)
  rows(y, spans, c) { spans.forEach((s, i) => { if (s) this.hl(s[0], s[1], y + i, c); }); return this; }
  ell(cx, cy, rx, ry, c) { for (let y = Math.ceil(cy - ry); y <= Math.floor(cy + ry); y++) { const k = 1 - ((y - cy) / ry) ** 2; if (k < 0) continue; const hw = rx * Math.sqrt(k); this.hl(Math.round(cx - hw), Math.round(cx + hw), y, c); } return this; }
  line(x0, y0, x1, y1, c, th = 1) { x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0; const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy; for (;;) { if (th === 1) this.set(x0, y0, c); else this.rect(x0 - ((th - 1) >> 1), y0 - ((th - 1) >> 1), th, th, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } } return this; }
  poly(pts, c) { let y0 = 1e9, y1 = -1e9; for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); } for (let y = Math.ceil(y0); y <= Math.floor(y1); y++) { const xs = []; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) xs.push(a[0] + (y - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); } xs.sort((p, q) => p - q); for (let i = 0; i + 1 < xs.length; i += 2) this.hl(Math.round(xs[i]), Math.round(xs[i + 1]), y, c); } return this; }
  // 글자 그림: 줄마다 글자 하나가 한 픽셀 ('.' 은 비움)
  art(x, y, lines, map) { lines.forEach((ln, j) => { for (let i = 0; i < ln.length; i++) { const ch = ln[i]; if (ch !== '.' && ch !== ' ' && map[ch] !== undefined) this.set(x + i, y + j, map[ch]); } }); return this; }
  blit(s, x, y, flip) { for (let j = 0; j < s.h; j++) for (let i = 0; i < s.w; i++) { const c = s.d[j * s.w + (flip ? s.w - 1 - i : i)]; if (c !== -1) this.set(x + i, y + j, c); } return this; }
  // 빛은 왼쪽 위에서: 빛 받는 가장자리는 한 단 밝게, 그늘 가장자리는 한 단(깊이 dd) 어둡게
  shade(dl = 1, dd = 1) {
    const o = new Int32Array(this.d);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const c = this.d[y * this.w + x]; if (c === -1) continue; const r = RAMP.get(c); if (!r) continue;
      let lit = false, dark = false;
      for (let k = 1; k <= dl; k++) if (this.get(x, y - k) === -1 || this.get(x - k, y) === -1) lit = true;
      for (let k = 1; k <= dd; k++) if (this.get(x, y + k) === -1 || this.get(x + k, y) === -1) dark = true;
      if (dark) o[y * this.w + x] = r[0][Math.max(0, r[1] - 1)]; else if (lit) o[y * this.w + x] = r[0][Math.min(r[0].length - 1, r[1] + 1)];
    }
    this.d = o; return this;
  }
  // 바깥 한 픽셀 먹선 (크기가 한 픽셀씩 커진다)
  outline(c = INK) {
    const o = new Spr(this.w + 2, this.h + 2, this.ox + 1, this.oy + 1); o.blit(this, 1, 1);
    for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) if (o.d[y * o.w + x] === -1 && (this.get(x - 2, y - 1) !== -1 || this.get(x, y - 1) !== -1 || this.get(x - 1, y - 2) !== -1 || this.get(x - 1, y) !== -1)) o.d[y * o.w + x] = c;
    return o;
  }
  flipped() { const o = new Spr(this.w, this.h, this.w - 1 - this.ox, this.oy); o.blit(this, 0, 0, true); return o; }
  // 두 색을 디더로 섞은 세로 띠 (cols: 위에서 아래로)
  vgrad(x, y, w, h, cols, bias = 0) { const n = cols.length - 1; for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const t = Math.min(n - 1e-6, Math.max(0, (j / Math.max(1, h - 1)) * n + bias)), k = t | 0; this.set(x + i, y + j, t - k > bayer(x + i, y + j) ? cols[k + 1] : cols[k]); } return this; }
  canvas() { if (this.cv) return this.cv; const c = document.createElement('canvas'); c.width = this.w; c.height = this.h; const g = c.getContext('2d'), im = g.createImageData(this.w, this.h), u = new Uint32Array(im.data.buffer); for (let i = 0; i < this.d.length; i++) { const v = this.d[i]; u[i] = v === -1 ? 0 : (0xff000000 | ((v & 0xff) << 16) | (v & 0xff00) | ((v >> 16) & 0xff)); } g.putImageData(im, 0, 0); this.cv = c; return c; }
}
// 스프라이트를 발밑 기준점에 맞춰 그린다
export function draw(g, s, x, y, o = {}) { const c = s.canvas(); if (o.alpha !== undefined) { g.save(); g.globalAlpha = o.alpha; } g.drawImage(c, Math.round(x) - s.ox, Math.round(y) - s.oy); if (o.alpha !== undefined) g.restore(); }
// 하얗게 번쩍이는 판 (맞았을 때)
const TINT = new Map();
export function tinted(s, col) { const key = col + ':' + s.w + ':' + s.h + ':' + s.d.length; let m = TINT.get(s); if (!m) TINT.set(s, m = new Map()); let t = m.get(col); if (!t) { t = new Spr(s.w, s.h, s.ox, s.oy); for (let i = 0; i < s.d.length; i++) if (s.d[i] !== -1) t.d[i] = col; m.set(col, t); } return t; }

// ── 글자: 도트 글꼴(Galmuri)을 제 크기로 찍고, 번짐 없이 0/1 로 깎는다 ──
const FONTS = { 7: '8px Galmuri7', 9: '10px Galmuri9', 11: '12px Galmuri11', b: 'bold 12px Galmuri11', 14: '15px Galmuri14', 28: '30px Galmuri14', 22: '24px Galmuri11' };
const FH = { 7: 9, 9: 11, 11: 13, b: 13, 14: 16, 28: 32, 22: 26 };
const TC = new Map(); let MG = null;
export function textW(s, f = 11) { if (!MG) MG = document.createElement('canvas').getContext('2d'); MG.font = FONTS[f]; return Math.ceil(MG.measureText(s).width); }
function glyphs(s, f) {
  const key = f + '|' + s; let c = TC.get(key); if (c) return c;
  const w = textW(s, f) + 2, h = FH[f] + 8; c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.font = FONTS[f]; g.textBaseline = 'top'; g.fillStyle = '#fff'; g.fillText(s, 1, 4);
  const im = g.getImageData(0, 0, w, h), d = im.data; for (let i = 0; i < d.length; i += 4) { const a = d[i + 3] >= 110 ? 255 : 0; d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = a; } g.putImageData(im, 0, 0);
  TC.set(key, c); return c;
}
const COLC = new Map();
function colored(s, f, col) { const key = f + '|' + col + '|' + s; let c = COLC.get(key); if (c) return c; const m = glyphs(s, f); c = document.createElement('canvas'); c.width = m.width; c.height = m.height; const g = c.getContext('2d'); g.drawImage(m, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = typeof col === 'number' ? css(col) : col; g.fillRect(0, 0, c.width, c.height); COLC.set(key, c); return c; }
// o: { f 글꼴, c 색, a 'l'|'c'|'r', sh 그림자색, ol 외곽선색 }
export function txt(g, s, x, y, o = {}) {
  s = String(s); const f = o.f || 11, w = textW(s, f); let px = Math.round(o.a === 'c' ? x - w / 2 : o.a === 'r' ? x - w : x) - 1; const py = Math.round(y) - 4;
  if (o.ol !== undefined) { const oc = colored(s, f, o.ol); for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) g.drawImage(oc, px + dx, py + dy); }
  if (o.sh !== undefined) g.drawImage(colored(s, f, o.sh), px + (o.shx === undefined ? 1 : o.shx), py + 1);
  g.drawImage(colored(s, f, o.c === undefined ? P.cream[3] : o.c), px, py); return w;
}
// 긴 글 줄바꿈
export function wrap(s, maxW, f = 11) { const out = []; for (const para of s.split('\n')) { let cur = ''; for (const w of para.split(' ')) { const t = cur ? cur + ' ' + w : w; if (textW(t, f) > maxW && cur) { out.push(cur); cur = w; } else cur = t; } out.push(cur); } return out; }
// 큰 붓글씨를 도트로: 글꼴을 크게 찍어 0/1 로 깎은 뒤 줄마다 색띠를 입히고 외곽선·그림자를 두른다
export function logo(str, size, font, cols, o = {}) {
  const m = document.createElement('canvas').getContext('2d'); m.font = `${size}px ${font}`; const w = Math.ceil(m.measureText(str).width) + 8, h = Math.ceil(size * 1.3) + 8;
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.font = `${size}px ${font}`; g.textBaseline = 'top'; g.fillStyle = '#fff'; g.fillText(str, 4, 4);
  const d = g.getImageData(0, 0, w, h).data, s = new Spr(w, h); let y0 = h, y1 = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] >= (o.th || 120)) { s.set(x, y, 1); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const n = cols.length;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (s.get(x, y) === 1) { const t = (y - y0) / Math.max(1, y1 - y0) * (n - 1), k = Math.min(n - 2, t | 0); let col = o.dither ? (t - k > bayer(x, y) ? cols[k + 1] : cols[k]) : cols[Math.min(n - 1, Math.floor((y - y0) / Math.max(1, y1 - y0 + 1) * n))]; if (s.get(x, y - 1) === -1 && o.hi !== undefined) col = o.hi; else if (s.get(x, y + 1) === -1 && o.lo !== undefined) col = o.lo; s.set(x, y, col); }
  let out = s.outline(o.ol === undefined ? INK : o.ol); if (o.ol2 !== undefined) out = out.outline(o.ol2);
  return out;
}

// ── 색 바꾸기 도구 ──
export const mixc = (a, b, k) => { const r = ((a >> 16) & 255) * (1 - k) + ((b >> 16) & 255) * k, g = ((a >> 8) & 255) * (1 - k) + ((b >> 8) & 255) * k, bl = (a & 255) * (1 - k) + (b & 255) * k; return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(bl); };
export const lum = c => (((c >> 16) & 255) * 0.299 + ((c >> 8) & 255) * 0.587 + (c & 255) * 0.114) / 255;
// 스프라이트의 색을 함수로 바꾼 새 판 (판마다·이름마다 한 번만 만든다)
const REMAP = new WeakMap();
export function remap(s, key, fn) { let m = REMAP.get(s); if (!m) REMAP.set(s, m = new Map()); let o = m.get(key); if (!o) { o = new Spr(s.w, s.h, s.ox, s.oy); const memo = new Map(); for (let i = 0; i < s.d.length; i++) { const c = s.d[i]; if (c === -1) continue; let v = memo.get(c); if (v === undefined) memo.set(c, v = fn(c)); o.d[i] = v; } m.set(key, o); } return o; }
// 해 쪽(오른쪽) 가장자리에 따뜻한 빛 테를 두른 판
export function rimlit(s, col = 0xffe0a0, k = 0.62) { let m = REMAP.get(s); if (!m) REMAP.set(s, m = new Map()); let o = m.get('rim' + col); if (!o) { o = new Spr(s.w, s.h, s.ox, s.oy); o.d.set(s.d); for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) { const c = s.get(x, y); if (c === -1 || c === INK) continue; if ((s.get(x + 1, y) === INK && s.get(x + 2, y) === -1) || (s.get(x + 1, y) === INK && s.get(x + 1, y - 1) === -1 && s.get(x, y - 1) === INK)) o.set(x, y, mixc(c, col, k)); } m.set('rim' + col, o); } return o; }
// 화면 전체의 색을 함수로 바꾼다 (색 수가 적어서 표를 만들어 두고 쓴다)
export function grade(g, fn, cache) { const im = g.getImageData(0, 0, LW, LH), u = new Uint32Array(im.data.buffer); for (let i = 0; i < u.length; i++) { const v = u[i] & 0xffffff; let o = cache.get(v); if (o === undefined) { const c = ((v & 255) << 16) | (v & 0xff00) | ((v >> 16) & 255), m = fn(c); o = ((m & 255) << 16) | (m & 0xff00) | ((m >> 16) & 255); cache.set(v, o); } u[i] = 0xff000000 | o; } g.putImageData(im, 0, 0); }
