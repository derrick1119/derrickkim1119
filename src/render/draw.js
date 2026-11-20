// 공용 그리기 도구 — 한지 위 종이 인형극 그림체 (가는 먹선 + 종이 테두리)
export const TAU = Math.PI * 2;
export const INK = '#262a36', PAPER = '#f8f0dc', HANJI = '#e9dec4', RED = '#c8402f', REDD = '#7a1f1c', INDIGO = '#2f4d7e', NAVY = '#1f2a44', TEAL = '#3f6b5c', OCHRE = '#d9a441', SKIN = '#f1cfa4', BROWN = '#7a5a40', SUB = '#6b5a44';
export const FONT = "'Gowun Batang', 'Apple SD Gothic Neo', 'Malgun Gothic', serif";
export const FONT_B = "'Yeon Sung', 'Gowun Batang', 'Apple SD Gothic Neo', serif";

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
  for (const para of String(str).split('\n')) { let cur = ''; for (const word of para.split(' ')) { const t = cur ? cur + ' ' + word : word; if (g.measureText(t).width > maxW && cur) { lines.push(cur); cur = word; } else cur = t; } lines.push(cur); }
  let yy = y; for (const l of lines) { text(g, l, x, yy, o); yy += lh; }
  return lines.length;
}

export function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); return c; }

// 종이 인형 스프라이트: 크림색 종이 테두리 + 바닥에 떨어지는 그림자
export const SS = 3;
export function paperSprite(draw, o = {}) {
  const w = o.w || 110, h = o.h || 124, ox = o.ox || 55, oy = o.oy || 110;
  const c = makeCanvas(w * SS, h * SS), g = c.getContext('2d'); g.scale(SS, SS); g.translate(ox, oy); draw(g);
  let img = c; const border = o.border === undefined ? PAPER : o.border;
  if (border) {
    const sil = makeCanvas(c.width, c.height), sg = sil.getContext('2d'); sg.drawImage(c, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = border; sg.fillRect(0, 0, c.width, c.height);
    const out = makeCanvas(c.width, c.height), og = out.getContext('2d'); const d = (o.bw || 2.4) * SS;
    for (let i = 0; i < 20; i++) og.drawImage(sil, Math.cos(i / 20 * TAU) * d, Math.sin(i / 20 * TAU) * d);
    og.drawImage(c, 0, 0); img = out;
  }
  let sh = null;
  if (o.shadow !== false) { sh = makeCanvas(c.width, c.height); const hg = sh.getContext('2d'); hg.drawImage(img, 0, 0); hg.globalCompositeOperation = 'source-in'; hg.fillStyle = o.shadow || 'rgba(50,36,20,0.26)'; hg.fillRect(0, 0, c.width, c.height); }
  return { img, sh, w, h, ox, oy, flash: null };
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
