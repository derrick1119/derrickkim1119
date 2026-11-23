// 공용 그리기 도구 — 한지 위 종이 인형극 그림체 (가는 먹선 + 종이 테두리)
export const TAU = Math.PI * 2;
export const INK = '#262a36', PAPER = '#f8f0dc', HANJI = '#e9dec4', RED = '#c8402f', REDD = '#7a1f1c', INDIGO = '#2f4d7e', NAVY = '#1f2a44', TEAL = '#3f6b5c', OCHRE = '#d9a441', SKIN = '#f1cfa4', BROWN = '#7a5a40', SUB = '#6b5a44';
// 글꼴은 한글 둘뿐이다. 도장·낙관·큰 붓 자국에는 글자 대신 그림 기호를 찍는다 (symbols.js)
export const FONT = "'Gowun Batang', 'Apple SD Gothic Neo', 'Malgun Gothic', serif";
export const FONT_B = "'Yeon Sung', 'Gowun Batang', 'Apple SD Gothic Neo', serif";

// 받침에 따라 조사를 고른다: iga('장승 행렬') → '장승 행렬이', iga('방망이 패') → '방망이 패가'
export const josa = (w, a, b) => { const c = String(w).charCodeAt(String(w).length - 1); return w + (c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 ? a : b); };
export const iga = w => josa(w, '이', '가');
export function st(g, col, lw) { g.strokeStyle = col; g.lineWidth = lw; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(); }
export function fs(g, fill, sc, lw) { if (fill) { g.fillStyle = fill; g.fill(); } if (sc) st(g, sc, lw || 1.2); }
export function ell(g, x, y, rx, ry, fill, sc, lw, rot) { g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, TAU); fs(g, fill, sc, lw); }
export function rrPath(g, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
}
export function rr(g, x, y, w, h, r, fill, sc, lw) { g.beginPath(); rrPath(g, x, y, w, h, r); fs(g, fill, sc, lw); }
export function poly(g, pts, fill, sc, lw) { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); fs(g, fill, sc, lw); }
export function line(g, pts, col, lw) { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); st(g, col, lw); }
export function path(g, fn, fill, sc, lw) { g.beginPath(); fn(g); fs(g, fill, sc, lw); }
// 먹선: 채우고 가는 먹색 선을 두른다
export function ink(g, fn, fill, lw) { g.beginPath(); fn(g); fs(g, fill, INK, lw || 1.2); }

// 글자: 기본은 외곽선 없는 먹색. stroke 를 주면 테두리를 두른다
export function text(g, str, x, y, o = {}) {
  let size = o.size || 22; const font = o.font || FONT;
  const f = z => `${o.weight || (font === FONT ? 700 : 400)} ${z}px ${font}`;
  g.font = f(size);
  if (o.maxW) { const w = g.measureText(str).width; if (w > o.maxW) { size *= o.maxW / w; g.font = f(size); } }
  g.textAlign = o.align || 'center'; g.textBaseline = o.base || 'middle';
  if (o.stroke) { g.lineJoin = 'round'; g.miterLimit = 2; g.strokeStyle = o.stroke; g.lineWidth = o.lw || Math.max(3, size * 0.2); g.strokeText(str, x, y); }
  g.fillStyle = o.fill || INK; g.fillText(str, x, y);
}
export function textBlock(g, str, x, y, maxW, lh, o = {}) {
  const font = o.font || FONT; g.font = `${o.weight || (font === FONT ? 700 : 400)} ${o.size || 20}px ${font}`;
  const lines = [];
  // 괄호 안의 낱말은 한 덩이로 묶어 줄바꿈에서 갈라지지 않게 한다
  const chunks = para => { const out = []; let depth = 0; for (const w of para.split(' ')) { if (depth > 0 && out.length) out[out.length - 1] += ' ' + w; else out.push(w); for (const c of w) { if (c === '(') depth++; else if (c === ')') depth = Math.max(0, depth - 1); } } return out; };
  // 한 덩이가 한 줄보다 길면: 괄호 묶음은 낱말로 풀고, 그래도 긴 낱말은 가운뎃점(·) 뒤나 글자 사이에서 끊는다
  const fit = w => { if (g.measureText(w).width <= maxW) return [w]; const ws = w.split(' '); if (ws.length > 1) return ws.flatMap(fit);
    const out = []; let cur = ''; for (const piece of w.split(/(?<=·)/)) { if (g.measureText(cur + piece).width <= maxW) { cur += piece; continue; } if (cur) out.push(cur); cur = ''; for (const ch of piece) { if (g.measureText(cur + ch).width > maxW && cur) { out.push(cur); cur = ch; } else cur += ch; } } if (cur) out.push(cur); return out; };
  for (const para of String(str).split('\n')) { let cur = ''; for (const word of chunks(para).flatMap(fit)) { const t = cur ? cur + ' ' + word : word; if (g.measureText(t).width > maxW && cur) { lines.push(cur); cur = word; } else cur = t; } lines.push(cur); }
  let yy = y; for (const l of lines) { text(g, l, x, yy, o); yy += lh; }
  return lines.length;
}

export function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); return c; }

// 종이 인형 스프라이트: 크림색 종이 테두리 + 바닥에 떨어지는 그림자
export const SS = 3;
export function paperSprite(draw, o = {}) {
  let w = o.w || 110, h = o.h || 124, ox = o.ox || 55, oy = o.oy || 110;
  let c = makeCanvas(w * SS, h * SS); { const g = c.getContext('2d'); g.scale(SS, SS); g.translate(ox, oy); draw(g); }
  // 먼저 그림이 있는 곳만 남긴다 (테두리와 종이 두께가 들어갈 여유를 두고): 병사 그림은 판의 2할 남짓만 써서,
  // 자르면 테두리를 굽는 일도, 전장에서 그릴 때 빈 곳까지 섞는 일도 몇 배 가벼워진다
  const cr = cropBox(c, Math.ceil(((o.bw || 2.4) + 2.6) * SS) + 2);
  if (cr) { c = cutCanvas(c, cr); ox -= cr.x / SS; oy -= cr.y / SS; w = cr.w / SS; h = cr.h / SS; }
  if (o.grain !== false) paperGrain(c, o.grain || 1);
  let img = c; const border = o.border === undefined ? PAPER : o.border;
  if (border) {
    const tint = col => { const k = makeCanvas(c.width, c.height), kg = k.getContext('2d'); kg.drawImage(c, 0, 0); kg.globalCompositeOperation = 'source-in'; kg.fillStyle = col; kg.fillRect(0, 0, c.width, c.height); return k; };
    const sil = tint(border), edge = tint('rgba(96,78,52,0.5)'), thick = tint('#bda57a');
    const out = makeCanvas(c.width, c.height), og = out.getContext('2d'); const d = (o.bw || 2.4) * SS;
    // 두꺼운 종이 스탠디: 테두리 아래·오른쪽으로 종이의 두께(옆면)가 비친다
    for (let i = 0; i < 16; i++) og.drawImage(thick, Math.cos(i / 16 * TAU) * d + 0.8 * SS, Math.sin(i / 16 * TAU) * d + 2 * SS);
    // 가위로 오린 종이: 크림색 테두리 바깥에 가는 그늘선을 한 번 더 두른다
    for (let i = 0; i < 24; i++) og.drawImage(edge, Math.cos(i / 24 * TAU) * (d + 1.6), Math.sin(i / 24 * TAU) * (d + 1.6));
    for (let i = 0; i < 24; i++) og.drawImage(sil, Math.cos(i / 24 * TAU) * d, Math.sin(i / 24 * TAU) * d);
    for (let i = 0; i < 12; i++) og.drawImage(sil, Math.cos(i / 12 * TAU) * d * 0.5, Math.sin(i / 12 * TAU) * d * 0.5);
    og.drawImage(c, 0, 0); img = out;
  }
  let sh = null;
  if (o.shadow !== false) { sh = makeCanvas(c.width, c.height); const hg = sh.getContext('2d'); hg.drawImage(img, 0, 0); hg.globalCompositeOperation = 'source-in'; hg.fillStyle = o.shadow || 'rgba(50,36,20,0.26)'; hg.fillRect(0, 0, c.width, c.height); }
  return { img, sh, w, h, ox, oy, flash: null };
}
// 그림이 있는 곳의 상자 (둘레 pad 여유). 거의 꽉 찼으면 자르지 않는다
function cropBox(c, pad = 2) {
  const W0 = c.width, H0 = c.height; let d;
  try { d = new Uint32Array(c.getContext('2d').getImageData(0, 0, W0, H0).data.buffer); } catch (e) { return null; }
  const rowHas = y => { for (let x = 0, i = y * W0; x < W0; x++, i++) if (d[i] >>> 24 > 3) return true; return false; };
  const colHas = (x, y0, y1) => { for (let y = y0, i = y0 * W0 + x; y <= y1; y++, i += W0) if (d[i] >>> 24 > 3) return true; return false; };
  let y0 = 0; while (y0 < H0 && !rowHas(y0)) y0++; if (y0 >= H0) return null;
  let y1 = H0 - 1; while (y1 > y0 && !rowHas(y1)) y1--;
  let x0 = 0; while (x0 < W0 && !colHas(x0, y0, y1)) x0++;
  let x1 = W0 - 1; while (x1 > x0 && !colHas(x1, y0, y1)) x1--;
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(W0 - 1, x1 + pad); y1 = Math.min(H0 - 1, y1 + pad);
  const w = x1 - x0 + 1, h = y1 - y0 + 1; if (w * h > W0 * H0 * 0.85) return null;
  return { x: x0, y: y0, w, h };
}
function cutCanvas(c, r) { const k = makeCanvas(r.w, r.h); k.getContext('2d').drawImage(c, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h); return k; }
// 색종이 질감: 왼쪽 위는 밝게, 오른쪽 아래는 살짝 어둡게 + 잔 섬유 (그려진 부분에만 입힌다)
function paperGrain(c, k) {
  const g = c.getContext('2d'), w = c.width, h = c.height, R = rng(w * 31 + h * 7);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-atop';
  const gr = g.createLinearGradient(w * 0.2, 0, w * 0.8, h); gr.addColorStop(0, `rgba(255,248,228,${0.2 * k})`); gr.addColorStop(0.45, 'rgba(255,248,228,0)'); gr.addColorStop(1, `rgba(46,30,22,${0.2 * k})`);
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.lineWidth = 1; const n = Math.round(w * h / 520);
  for (let i = 0; i < n; i++) { const x = R() * w, y = R() * h, a = R() * TAU, l = 3 + R() * 8; g.strokeStyle = R() < 0.5 ? `rgba(255,255,255,${0.16 * k})` : `rgba(70,50,30,${0.1 * k})`; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  g.restore();
}
export function flashOf(spr) {
  if (!spr.flash) { const f = makeCanvas(spr.img.width, spr.img.height), fg = f.getContext('2d'); fg.drawImage(spr.img, 0, 0); fg.globalCompositeOperation = 'source-in'; fg.fillStyle = '#ffffff'; fg.fillRect(0, 0, f.width, f.height); spr.flash = f; }
  return spr.flash;
}
// 그림자는 뒤집힘·회전과 상관없이 늘 오른쪽 아래로 떨어진다
export function drawSprite(g, spr, x, y, sx = 1, sy = 1, rot = 0, flash = 0, noShadow = false) {
  if (spr.sh && !noShadow) { const k = Math.abs(sy); g.save(); g.translate(x + 2.2 * k, y + 3.4 * k); if (rot) g.rotate(rot); g.scale(sx, sy); g.drawImage(spr.sh, -spr.ox, -spr.oy, spr.w, spr.h); g.restore(); }
  g.save(); g.translate(x, y); if (rot) g.rotate(rot); if (sx !== 1 || sy !== 1) g.scale(sx, sy);
  g.drawImage(spr.img, -spr.ox, -spr.oy, spr.w, spr.h);
  if (flash > 0) { g.globalAlpha *= Math.min(1, flash); g.drawImage(flashOf(spr), -spr.ox, -spr.oy, spr.w, spr.h); }
  g.restore();
}

export function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
export function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
export function easeOutBack(t) { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
