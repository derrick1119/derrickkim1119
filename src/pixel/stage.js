// 도트 인형극 무대: 걸개그림(이야기의 배경)·나무틀·막·단청 들보·휘장과 술·무대 앞판·놋쇠 등잔·구경꾼 뒷모습·장면 바꿈의 막
// 모두 도트 640×360 (화면의 반) 격자에서 굽거나 찍고, 화면에는 2배로 그린다. 붓 그림 쪽(theater.js · stage.js · stagewipe.js · roadevent.js)이 GFX.pixel 일 때 이 함수들을 부른다.
import { Spr, P, INK, bayer, rng, mixc, lum, css } from './px.js';
import { pxUnit, pxFlip } from './units.js';
import { pxPaper } from './paper.js';

const c = (n, i = 2) => P[n][i];
const TAU = Math.PI * 2;
export const fr = (g, x, y, w, h, col) => { g.fillStyle = typeof col === 'number' ? css(col) : col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
// 도트 격자로 그리기: 화면 좌표를 반으로 접은 판에서 그린다
export function px2(g, fn) { g.save(); g.imageSmoothingEnabled = false; g.scale(2, 2); try { fn(g); } finally { g.restore(); } }
const putSpr = (g, s, x, y) => g.drawImage(s.canvas(), Math.round(x) - s.ox, Math.round(y) - s.oy);
function part(s, fn, dl = 1, dd = 1) { const t = new Spr(s.w, s.h); fn(t); if (dl || dd) t.shade(dl, dd); s.blit(t, 0, 0); }
const ridge = (x, base, amp, f, ph) => base - amp * (0.55 * Math.sin(x * f + ph) + 0.3 * Math.sin(x * f * 2.3 + ph * 1.7) + 0.15 * Math.sin(x * f * 5.1 + ph * 0.6));
const OBANG = [c('red', 2), c('blue', 2), c('gold', 3), c('white', 3), c('teal', 2)];
const SAEK = [c('red', 2), c('gold', 3), c('teal', 2), c('white', 3), c('blue', 2), c('pink', 3)];

// ───────── 걸개그림: 이야기의 배경 ─────────
// 장면 이름 → 하늘(때)과 세간(마을·고갯길·숲·서낭당)
const MOOD = { village: 'day', pass: 'day', grove: 'grove', night: 'night', eve: 'eve', dark: 'dark', shrine: 'moon', dawn: 'dawn' };
const SET = { village: 'village', night: 'village', pass: 'pass', eve: 'pass', grove: 'grove', dark: 'pass', shrine: 'shrine', dawn: 'shrine' };
const SKY = {
  day: [0x5a8ed6, 0x74a8e2, 0x98c4ec, 0xc2e0f2, 0xeaf2e6],
  grove: [0x5e98ce, 0x84b8e0, 0xaed4e8, 0xd6ecdc],
  eve: [0x262c66, 0x46468e, 0x7c62a6, 0xc4849e, 0xf0aa8c, 0xffd49c],
  night: [0x080c24, 0x101840, 0x1a285c, 0x2a3c74, 0x3c5088],
  moon: [0x0e1534, 0x18244c, 0x253766, 0x384c80, 0x4c6094],
  dark: [0x05050c, 0x0b0918, 0x131026, 0x1c1834, 0x241e3a],
  dawn: [0x46528f, 0x6c72b2, 0xa092c2, 0xd8aac2, 0xf6c4b4, 0xfcdcbc],
};
// 산 세 겹: [바탕, 볕, 안개]
const MTN = [[0x8c9cc8, 0xb4c0dc, 0xc8d8ea], [0x5f86a4, 0x86a8bc, 0xa8c4d0], [0x3e6e66, 0x5f8e74, 0x7ea488]];
// 낮 그림을 그 때의 빛으로 물들인다 (불 켜진 창·달·별은 그대로)
const GRADE = {
  day: null,
  grove: q => mixc(q, 0x2e6a4a, 0.12),
  eve: q => { const L = lum(q); return mixc(mixc(q, 0x2a2058, 0.42), 0xffb070, Math.max(0, L - 0.55) * 0.45); },
  night: q => mixc(q, 0x101c48, 0.58),
  moon: q => mixc(q, 0x18264e, 0.5),
  dark: q => mixc(q, 0x080614, 0.74),
  dawn: q => mixc(q, 0xf0b8c4, 0.16),
};
function skyBand(s, w, y1, cols, R) { for (let y = 0; y < y1; y++) for (let x = 0; x < w; x++) { const t = Math.min(cols.length - 1 - 1e-6, y / y1 * (cols.length - 1)), k = t | 0; s.set(x, y, t - k > bayer(x, y) ? cols[k + 1] : cols[k]); } }
function mountains(s, base, amp, f, ph, col, lit, haze, yEnd, mist, trees, treeCol, R) {
  for (let x = 0; x < s.w; x++) {
    const y0 = Math.round(ridge(x, base, amp, f, ph)), up = ridge(x + 1, base, amp, f, ph) < ridge(x, base, amp, f, ph) - 0.05;
    for (let y = Math.max(0, y0); y < yEnd; y++) { const d = y - y0; let q = col; if (up && d < 6 && bayer(x, y) > d / 6) q = lit; else if (!up && d < 2 && bayer(x, y) > 0.7) q = lit; const hz = (y - (yEnd - mist)) / mist; if (hz > 0 && bayer(x, y) < hz) q = haze; s.set(x, y, q); }
    if (trees && R() < trees) { const h = 2 + ((R() * 3) | 0); for (let k = 0; k < h; k++) s.hl(x - (k >> 1), x + (k >> 1), y0 - h + k + 1, treeCol); }
  }
}
function cloud(s, cx, cy, w, cols, seed) {
  const R = rng(seed), t = new Spr(s.w, s.h);
  for (let k = 0; k < w / 5; k++) { const x = cx + (R() - 0.5) * w, r = 2 + R() * 6 * (1 - Math.abs(x - cx) / w * 1.6); t.ell(x, cy - r * 0.6, r * 1.7, Math.max(2, r), 1); }
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) { if (t.get(x, y) === -1 || y > cy) continue; s.set(x, y, t.get(x, y - 1) === -1 || t.get(x, y - 2) === -1 ? cols[2] : y >= cy - 1 ? cols[0] : cols[1]); }
}
// 소나무: 휜 줄기에 납작한 솔잎 덩이 (sc = 크기)
function pine(sc, seed) {
  const R = rng(seed), w = Math.ceil(70 * sc), h = Math.ceil(72 * sc), s = new Spr(w, h, Math.round(34 * sc), h - 2), k = v => Math.round(v * sc);
  part(s, t => { t.line(k(34), h - 3, k(32), k(44), c('wood', 1), Math.max(2, k(4))); t.line(k(32), k(44), k(38), k(30), c('wood', 1), Math.max(2, k(3))); t.line(k(38), k(30), k(34), k(18), c('wood', 1), Math.max(1, k(3))); t.line(k(33), k(46), k(20), k(36), c('wood', 1), Math.max(1, k(2))); t.line(k(37), k(34), k(50), k(28), c('wood', 1), Math.max(1, k(2))); }, 1, 0);
  const pad = (cx, cy, rx, ry) => part(s, t => { t.ell(k(cx), k(cy), rx * sc, ry * sc, c('pine', 2)); t.ell(k(cx - rx * 0.4), k(cy) - 1, rx * 0.5 * sc, ry * 0.8 * sc, c('pine', 2)); }, 1, 2);
  for (const [cx, cy, rx, ry] of [[18, 34, 12, 5], [52, 26, 12, 5], [34, 14, 16, 6], [24, 22, 10, 4], [46, 16, 9, 4]]) { pad(cx, cy, rx, ry); for (let n = 0; n < rx * 1.2 * sc; n++) { const x = Math.round(k(cx) - rx * sc + R() * rx * sc * 2), y = Math.round(k(cy) - ry * sc + R() * ry * sc); if (s.get(x, y) !== -1 && s.get(x, y - 1) !== -1) s.set(x, y, c('pine', R() < 0.5 ? 4 : 3)); } }
  return s.outline(P.pine[0]);
}
// 초가: 흙벽·기둥·띠살문(불빛)·둥근 볏짚 지붕
function choga(s, cx, base, wd, lit, E) {
  const w = Math.round(wd), h = Math.round(wd * 0.44), x0 = Math.round(cx - w / 2), y0 = base - h;
  part(s, t => t.rect(x0, y0, w, h, c('cream', 2)), 0, 0);
  for (let y = y0; y < base; y++) for (let x = x0; x < x0 + w; x++) if ((x * 7 + y * 13) % 17 === 0) s.set(x, y, c('cream', 1));
  for (const x of [x0, x0 + Math.round(w * 0.31), x0 + Math.round(w * 0.69), x0 + w - 2]) s.rect(x, y0, 2, h, c('wood', 1));
  s.rect(x0, base - 3, w, 3, c('stone', 1)); s.hl(x0, x0 + w - 1, base - 3, c('stone', 2));
  const dx = x0 + Math.round(w * 0.37), dw = Math.round(w * 0.27), dy = y0 + Math.round(h * 0.25), dh = Math.round(h * 0.62);
  const win = lit ? 0xffd88c : c('cream', 3), bar = lit ? 0xa86c2c : c('wood', 2);
  s.rect(dx, dy, dw, dh, win); for (let x = dx + 2; x < dx + dw; x += 3) s.vl(x, dy, dy + dh - 1, bar); for (const yy of [dy + 3, dy + Math.round(dh / 2), dy + dh - 3]) s.hl(dx, dx + dw - 1, yy, bar); s.vl(dx + (dw >> 1), dy, dy + dh - 1, c('wood', 1));
  if (lit) for (let y = dy; y < dy + dh; y++) for (let x = dx; x < dx + dw; x++) E.add(y * s.w + x);
  const rf = new Spr(s.w, s.h), rh = Math.round(h * 0.55), rows = [];
  for (let i = 0; i < rh; i++) { const q = i / (rh - 1), half = Math.round((0.18 + 0.82 * Math.sqrt(Math.min(1, q * 1.6))) * (w / 2 + w * 0.13)); rows.push([Math.round(cx) - half, Math.round(cx) + half]); }
  rf.rows(y0 - rh + 2, rows, c('straw', 2)); rf.shade(2, 2); s.blit(rf, 0, 0);
  for (let x = rows[rh - 1][0]; x <= rows[rh - 1][1]; x += 4) { s.vl(x, y0 - Math.round(rh * 0.45) + ((x * 3) % 3), y0 + 1, c('straw', 1)); s.set(x + 2, y0 - rh + 4 + (x % 4), c('straw', 4)); }
  for (let x = rows[rh - 1][0]; x <= rows[rh - 1][1]; x += 2) s.set(x, y0 + 2 + (x % 3 ? 0 : 1), c('straw', 1));
  for (let x = x0 + 4; x < x0 + w - 4; x += 10) { s.line(x, y0 - rh + 3, x + 3, y0 - rh + 7, c('straw', 0)); s.line(x + 6, y0 - rh + 3, x + 3, y0 - rh + 7, c('straw', 0)); }
}
// 서낭당: 늙은 당산나무에 금줄을 두르고 오방색 천을 매달았다. 곁에 돌무더기
function seonang(s, cx, base, sc, R) {
  const k = v => Math.round(v * sc), trunk = c('wood', 1);
  part(s, t => { t.rect(cx - k(6), base - k(56), k(12), k(56), trunk); t.line(cx - k(3), base - k(46), cx - k(20), base - k(66), trunk, Math.max(2, k(4))); t.line(cx + k(3), base - k(50), cx + k(22), base - k(70), trunk, Math.max(2, k(4))); t.ell(cx, base - 1, k(11), k(3), trunk); }, 1, 1);
  for (const [dx, dy, rx, ry] of [[-22, -74, 20, 12], [20, -78, 22, 13], [0, -92, 26, 14], [-30, -60, 12, 8], [32, -62, 12, 8]]) part(s, t => { t.ell(cx + k(dx), base + k(dy), rx * sc, ry * sc, c('grass', 1)); t.ell(cx + k(dx - 4), base + k(dy - 3), rx * 0.6 * sc, ry * 0.6 * sc, c('grass', 1)); }, 1, 2);
  for (let i = 0; i < 90 * sc; i++) { const x = Math.round(cx + (R() - 0.5) * 92 * sc), y = Math.round(base - k(60) - R() * 44 * sc); if (s.get(x, y) !== -1 && s.get(x, y - 1) !== -1) s.set(x, y, c('grass', R() < 0.5 ? 3 : 2)); }
  // 금줄: 왼새끼에 흰 종이와 오방색 천
  const ry = base - k(34); s.hl(cx - k(8), cx + k(8), ry, c('straw', 3)); s.hl(cx - k(8), cx + k(8), ry + 1, c('straw', 1));
  [c('red', 2), c('blue', 2), c('gold', 3), c('white', 4), c('teal', 2)].forEach((col, i) => { const x = cx - k(8) + Math.round(i * k(16) / 4); s.vl(x, ry + 2, ry + 2 + k(10) + (i % 2) * 2, col); s.vl(x + 1, ry + 2, ry + k(8) + (i % 2) * 2, col); });
  // 돌무더기
  const sx = cx + k(26); for (const [dx, dy, r] of [[0, 0, 9], [-8, 0, 7], [8, 0, 7], [-4, -7, 7], [4, -7, 6], [0, -13, 5], [0, -18, 3]]) part(s, t => t.ell(sx + k(dx), base - k(3) + k(dy), r * sc, r * 0.75 * sc, c('stone', 2)), 1, 1);
}
function stars(s, w, y1, R, n) { for (let i = 0; i < n; i++) { const x = (R() * w) | 0, y = 2 + ((R() * (y1 - 4)) | 0); s.set(x, y, R() < 0.3 ? 0xfff6c8 : 0x8c98d0); } }
const BD = new Map();
// 걸개그림 한 장 (도트 w×h). 돌려주는 값: { spr, fl(인형이 서는 높이, 도트) }
function bakeBackdrop(bg, w, h) {
  const key = bg + ':' + w + ':' + h; let v = BD.get(key); if (v) return v;
  const mood = MOOD[bg] || 'day', set = SET[bg] || 'pass', k = (w * 2) / 1040, fl = Math.round(h - 37 * k), R = rng(77 + w), s = new Spr(w, h), E = new Set();
  const hz = Math.round(fl - h * 0.2), sky = SKY[mood];
  skyBand(s, w, hz + 6, sky, R);
  const night = mood === 'night' || mood === 'moon' || mood === 'dark';
  if (night) stars(s, w, hz - 10, R, Math.round(w * 0.14));
  // 해와 달: 걸개그림 오른쪽 위
  const sx = Math.round(w * 0.703), sy = Math.round(hz * 0.42), sr = Math.max(6, Math.round(14 * k));
  if (mood !== 'dark') for (let y = sy - sr - 10; y < sy + sr + 10; y++) for (let x = sx - sr - 10; x < sx + sr + 10; x++) {
    const d = Math.hypot(x - sx, y - sy); if (y < 0 || y >= hz) continue;
    const disc = night ? 0xfff2c4 : mood === 'eve' ? 0xffe0a0 : mood === 'dawn' ? 0xfff0d8 : 0xfffbe4, ring = night ? 0x4c64a8 : mood === 'eve' ? 0xffc08a : 0xfff4c8;
    if (d < sr) { s.set(x, y, night && (Math.hypot(x - sx + sr * 0.35, y - sy + sr * 0.3) < sr * 0.25 || Math.hypot(x - sx - sr * 0.3, y - sy - sr * 0.35) < sr * 0.18) ? 0xe2d698 : disc); E.add(y * w + x); }
    else if (d < sr + 9 && bayer(x, y) > (d - sr) / 9) { s.set(x, y, ring); E.add(y * w + x); }
  }
  if (!night) for (const [fx, fy, fw] of [[0.16, 0.32, 0.18], [0.42, 0.18, 0.12], [0.88, 0.3, 0.14], [0.56, 0.42, 0.08]]) cloud(s, Math.round(w * fx), Math.round(hz * fy), Math.round(w * fw), mood === 'eve' ? [0xa07cb0, 0xf4b8a0, 0xffe4c0] : mood === 'dawn' ? [0xb8a0c8, 0xf4c8cc, 0xffeedc] : [0x9cc0e8, 0xe4f0fc, 0xffffff], (fx * 97) | 0);
  // 산 세 겹 (안개가 지평선 쪽에 고인다)
  const am = Math.max(6, hz * 0.32);
  mountains(s, hz - am * 0.85, am * 0.55, 0.03 / k, 1.3, MTN[0][0], MTN[0][1], MTN[0][2], hz + 4, 8, 0, 0, R);
  mountains(s, hz - am * 0.45, am * 0.4, 0.05 / k, 4.1, MTN[1][0], MTN[1][1], MTN[1][2], hz + 6, 6, 0.1, 0x4a6e84, R);
  mountains(s, hz - am * 0.12, am * 0.22, 0.08 / k, 2.2, MTN[2][0], MTN[2][1], MTN[2][2], hz + 8, 4, 0.3, 0x2c5450, R);
  // 들: 지평선에서 무대 바닥까지
  for (let y = hz + 6; y < fl; y++) { const q = (y - hz - 6) / Math.max(1, fl - hz - 6); for (let x = 0; x < w; x++) { const tone = q + (bayer(x, y) - 0.5) * 0.3; s.set(x, y, tone < 0.33 ? 0x8cba62 : tone < 0.66 ? 0x76a856 : 0x62964c); } }
  for (let i = 0; i < w * 0.6; i++) { const x = (R() * w) | 0, y = hz + 8 + ((R() * (fl - hz - 10)) | 0); s.set(x, y, 0x4c8040); s.set(x, y - 1, 0x9cd070); }
  // 세간
  const base = fl - 1;
  if (set === 'village') { choga(s, Math.round(w * 0.14), base, Math.round(w * 0.24), night || mood === 'eve', E); for (const [px, ps] of [[0.93, 1.25], [0.82, 0.8]]) { const p = pine(ps * k * 1.3, (px * 50) | 0); s.blit(p, Math.round(w * px) - p.ox, base - p.oy); } }
  else if (set === 'grove') { for (const [px, ps] of [[0.36, 0.7], [0.62, 0.75], [0.5, 0.55], [0.06, 1.5], [0.2, 1.15], [0.83, 1.25], [0.95, 1.55]]) { const p = pine(ps * k * 1.3, (px * 91) | 0); s.blit(p, Math.round(w * px) - p.ox, base - p.oy + (ps < 0.8 ? -Math.round(10 * k) : 0)); } }
  else if (set === 'shrine') { seonang(s, Math.round(w * 0.8), base, k * 1.15, R); const p = pine(1.3 * k * 1.3, 5); s.blit(p, Math.round(w * 0.05) - p.ox, base - p.oy); }
  else { for (const [px, ps] of [[0.05, 1.4], [0.95, 1.2], [0.14, 0.8]]) { const p = pine(ps * k * 1.3, (px * 73) | 0); s.blit(p, Math.round(w * px) - p.ox, base - p.oy); } for (const [px, r] of [[0.26, 6], [0.74, 8], [0.66, 4]]) part(s, t => t.ell(Math.round(w * px), base - Math.round(r * k * 0.6), r * k * 1.3, r * k * 0.8, c('stone', 2)), 1, 1); }
  // 무대 바닥: 흙마당에 멍석 결
  for (let y = fl - 3; y < h; y++) for (let x = 0; x < w; x++) { const d = y - fl + 3; let q = d === 0 ? 0x8a6a44 : d === 1 ? 0xe4cc98 : (x + y * 3) % 7 === 0 ? 0xb89c6c : (((x >> 1) + (y >> 1)) % 2 ? 0xd4bc88 : 0xccb27c); if (d > 1 && (x * 13 + y * 7) % 29 === 0) q = 0x9c8058; s.set(x, y, q); }
  // 때의 빛으로 물들이기
  const G = GRADE[mood]; if (G) { const memo = new Map(); for (let i = 0; i < s.d.length; i++) { if (E.has(i)) continue; const q = s.d[i]; if (q === -1) continue; if (i < (hz + 6) * w && (q === 0xfff6c8 || q === 0x8c98d0)) continue; let m = memo.get(q); if (m === undefined) memo.set(q, m = G(q)); s.d[i] = m; } }
  // 걸개그림 테: 위아래 짙은 그늘
  for (let x = 0; x < w; x++) { s.set(x, 0, INK); if (s.get(x, 1) !== -1) s.set(x, 1, mixc(s.get(x, 1), 0x000000, 0.4)); }
  v = { spr: s, fl }; BD.set(key, v); return v;
}
// 걸개그림을 그리고 인형이 서는 높이(화면)를 돌려준다
export function pxBackdrop(g, x, y, w, h, bg) {
  const X = Math.round(x / 2), Y = Math.round(y / 2), B = bakeBackdrop(bg, Math.round(w / 2), Math.round(h / 2));
  px2(g, q => q.drawImage(B.spr.canvas(), X, Y));
  return (Y + B.fl) * 2;
}

// ───────── 작은 무대의 틀 (인형극 한 편 · 길 위의 사건 · 도감의 작은 무대) ─────────
const FOLD = [0x161a40, 0x26346e, 0x3c5cae, 0x6c9ce0, 0x3c5cae, 0x26346e];
// 쪽물 무명의 주름: u = 주름 안의 자리(0~1), lit = 무대 쪽 볕(0~1). 골은 짙고 등은 밝게, 사이는 점 무늬로 잇는다
const CL = [0x121634, 0x1c2856, 0x283c7a, 0x3852a0, 0x5274c0, 0x7a9ad8];
function clothCol(u, lit, x, y) { const v = 0.5 - 0.5 * Math.cos(u * TAU), t = Math.min(5, Math.max(0, v * 3.6 + lit * 1.6 + (bayer(x, y) - 0.5) * 0.9)); return CL[t | 0]; }
const CUR = new Map();
// 막 한 폭 (side -1 왼쪽 · 1 오른쪽): 안쪽 끝 너비 fn(y) 를 따라 세로 주름, 아랫단 색동, 안쪽 끝 금실
function curtainSpr(side, w, h, widths, key) {
  let s = CUR.get(key); if (s) return s;
  s = new Spr(w, h);
  for (let y = 0; y < h; y++) { const wd = Math.max(1, Math.min(w, widths[y])); for (let i = 0; i < wd; i++) { const x = side < 0 ? i : w - 1 - i, inner = wd - 1 - i; const nf = Math.max(3, Math.round(widths[0] / 15)), u = ((i / wd) * nf + Math.sin(y * 0.045 + i * 0.02) * 0.08) % 1; let q = inner === 0 ? INK : inner === 1 ? c('gold', 3) : inner === 2 ? c('gold', 1) : clothCol(u, Math.max(0, 1 - inner / 18) * 0.7, x, y); if (y >= h - 6 && inner > 2) q = y === h - 6 || y === h - 1 ? c('gold', 3) : SAEK[((i >> 2) + 1) % SAEK.length]; s.set(x, y, q); } }
  CUR.set(key, s); return s;
}
function tassel(g, x, y, col, len = 7) { fr(g, x, y, 1, 2, INK); fr(g, x - 1, y + 2, 3, 3, INK); fr(g, x, y + 3, 1, 1, col); fr(g, x - 1, y + 5, 3, 1, c('gold', 3)); fr(g, x - 1, y + 6, 3, len, INK); fr(g, x, y + 6, 1, len - 1, col); }
// open: 0 닫힘 → 1 열림 · t: 시각
export function pxFrame(g, x, y, w, h, open = 1, t = 0) {
  const X = Math.round(x / 2), Y = Math.round(y / 2), Wd = Math.round(w / 2), Hd = Math.round(h / 2), k = Wd / 520, e = open * open * (3 - 2 * open);
  px2(g, q => {
    // 막: 걷히면 허리를 오방색 끈으로 묶는다
    const eq = Math.round(e * 16) / 16, cw = Math.round((Wd / 2 + 3) + (Math.round(29 * k) - (Wd / 2 + 3)) * eq), tie = Math.round(Hd * 0.56);
    const widths = []; for (let yy = 0; yy < Hd; yy++) { const pin = eq * Math.sin(yy / Hd * Math.PI) * 8 * k, tieIn = eq > 0.6 ? Math.max(0, 6 * k - Math.abs(yy - tie) * 0.6) * eq : 0; widths.push(Math.round(cw - pin - tieIn)); }
    q.save(); q.beginPath(); q.rect(X - 1, Y - 1, Wd + 2, Hd + 2); q.clip();
    for (const sd of [-1, 1]) { const s = curtainSpr(sd, cw + 2, Hd, widths, 'f' + sd + ':' + Wd + ':' + Hd + ':' + eq); q.drawImage(s.canvas(), sd < 0 ? X : X + Wd - s.w, Y); }
    if (eq >= 0.9) for (const sd of [-1, 1]) { const tx = sd < 0 ? X + widths[tie] - 2 : X + Wd - widths[tie] + 1; fr(q, sd < 0 ? X : tx, Y + tie - 1, Math.abs(tx - (sd < 0 ? X : X + Wd)), 2, c('red', 2)); fr(q, sd < 0 ? X : tx, Y + tie - 1, Math.abs(tx - (sd < 0 ? X : X + Wd)), 1, c('red', 3)); tassel(q, tx, Y + tie, c('gold', 3), 6); }
    q.restore();
    // 기둥: 석간주 칠
    for (const ex of [X - 8, X + Wd]) { fr(q, ex, Y - 6, 8, Hd + 15, INK); fr(q, ex + 1, Y - 6, 6, Hd + 15, c('red', 1)); fr(q, ex + 2, Y - 6, 2, Hd + 15, c('red', 2)); fr(q, ex + 2, Y - 6, 1, Hd + 15, c('red', 3)); }
    // 들보: 단청 띠와 붉은 휘장, 오방색 술
    const ty = Y - 7, bw = Wd + 18; fr(q, X - 9, ty, bw, 10, INK); fr(q, X - 8, ty + 1, bw - 2, 8, c('teal', 1));
    for (let xx = X - 8, i = 0; xx < X + Wd + 8; xx += 12, i++) { fr(q, xx + 1, ty + 2, 10, 6, c('teal', 2)); fr(q, xx + 3, ty + 3, 6, 4, [c('red', 2), c('blue', 2), c('gold', 3)][i % 3]); fr(q, xx + 5, ty + 4, 2, 2, c('white', 4)); fr(q, xx, ty + 1, 1, 8, c('gold', 3)); }
    const n = Math.max(4, Math.round(Wd / 40)), sw = Wd / n;
    for (let i = 0; i < n; i++) { const x0 = Math.round(X + i * sw), x1 = Math.round(X + (i + 1) * sw); for (let xx = x0; xx < x1; xx++) { const u = (xx - x0) / (x1 - x0), hh = Math.round(3 + Math.sin(u * Math.PI) * 4); fr(q, xx, ty + 9, 1, hh, u < 0.06 || u > 0.94 ? c('red', 0) : (xx - x0) % 5 === 0 ? c('red', 1) : c('red', 2)); fr(q, xx, ty + 9 + hh, 1, 1, c('gold', 3)); } if (i > 0) tassel(q, x0, ty + 10, OBANG[i % 3], 5 + (i % 2)); }
    // 무대 앞판: 붉은·푸른 마름모 단청과 놋쇠 못
    const ay = Y + Hd - 10; fr(q, X - 10, ay, Wd + 20, 20, INK); fr(q, X - 9, ay + 1, Wd + 18, 18, c('wood', 1)); fr(q, X - 9, ay + 1, Wd + 18, 1, c('wood', 3)); fr(q, X - 9, ay + 2, Wd + 18, 1, c('wood', 2)); fr(q, X - 9, ay + 17, Wd + 18, 2, c('wood', 0));
    const m = Math.max(6, Math.round(Wd / 44)); for (let i = 0; i < m; i++) { const cx = Math.round(X + Wd * (i + 0.5) / m), cy = ay + 10, col = i % 2 ? c('teal', 2) : c('red', 1); for (let j = 0; j < 5; j++) fr(q, cx - j * 2, cy - 4 + j, j * 4 + 1, 1, col); for (let j = 0; j < 4; j++) fr(q, cx - 6 + j * 2, cy + 1 + j, 13 - j * 4, 1, col); fr(q, cx - 1, cy - 1, 3, 3, c('white', 3)); fr(q, cx, cy, 1, 1, i % 2 ? c('gold', 3) : c('blue', 2)); if (i < m - 1) fr(q, Math.round(X + Wd * (i + 1) / m), cy, 1, 1, c('gold', 4)); }
  });
}

// ───────── 장소 무대의 큰 틀 (장터·주막·대장간 … 화면 가득) ─────────
const LW = 640, LH = 360, AP = 344, PILW = 11, LINH = 15, TIEY = 202;
let BIG = null;
function bigFrame() {
  if (BIG) return BIG;
  const s = new Spr(LW, LH);
  // 무대 앞판
  s.rect(0, AP, LW, LH - AP, c('wood', 1)); s.hl(0, LW - 1, AP, INK); s.hl(0, LW - 1, AP + 1, c('wood', 3)); s.hl(0, LW - 1, AP + 2, c('wood', 2)); s.hl(0, LW - 1, LH - 1, c('wood', 0));
  const n = 22; for (let i = 0; i < n; i++) { const cx = Math.round((i + 0.5) * LW / n), cy = AP + 9, col = i % 2 ? c('teal', 2) : c('red', 1); for (let j = 0; j < 5; j++) s.hl(cx - j * 2, cx + j * 2, cy - 4 + j, col); for (let j = 0; j < 4; j++) s.hl(cx - 6 + j * 2, cx + 6 - j * 2, cy + 1 + j, col); s.rect(cx - 1, cy - 1, 3, 3, c('white', 3)); s.set(cx, cy, i % 2 ? c('gold', 3) : c('blue', 2)); if (i < n - 1) s.set(Math.round((i + 1) * LW / n), cy, c('gold', 4)); }
  // 기둥: 석간주와 머리의 주의초
  for (const x of [0, LW - PILW]) { s.rect(x, 0, PILW, AP, c('red', 1)); s.rect(x + 3, 0, 3, AP, c('red', 2)); s.vl(x + 4, 0, AP - 1, c('red', 3)); s.vl(x, 0, AP - 1, INK); s.vl(x + PILW - 1, 0, AP - 1, INK);
    let y = LINH; for (const [col, hh] of [[c('teal', 2), 6], [c('white', 3), 1], [c('red', 2), 4], [c('white', 3), 1], [c('blue', 2), 4], [c('gold', 3), 2], [c('teal', 2), 3]]) { s.rect(x + 1, y, PILW - 2, hh, col); y += hh; } s.rect(x + 4, LINH + 9, 3, 3, c('gold', 3)); s.set(x + 5, LINH + 10, c('red', 2)); }
  // 단청 들보: 뇌록 바탕에 머리초
  s.rect(0, 0, LW, LINH, c('teal', 1)); s.hl(0, LW - 1, 0, INK); s.hl(0, LW - 1, LINH - 1, INK); s.hl(0, LW - 1, 2, c('white', 3)); s.hl(0, LW - 1, LINH - 3, c('white', 3));
  for (let x = 53; x < LW; x += 107) { for (const sd of [-1, 1]) { [c('blue', 1), c('blue', 2), c('blue', 3), c('blue', 4), c('white', 3)].forEach((col, j) => s.rect(x + sd * (9 + j * 3), 4, 2, 7, col)); [c('red', 1), c('red', 2), c('red', 3), c('white', 3)].forEach((col, j) => s.rect(x + sd * (25 + j * 3), 4, 2, 7, col)); s.rect(x + sd * 37, 5, 1, 5, c('gold', 3)); } s.ell(x, 7, 4, 4, c('red', 2)); s.ell(x, 7, 2.6, 2.6, c('white', 3)); s.ell(x, 7, 1.6, 1.6, c('gold', 3)); s.set(x, 7, c('teal', 2)); }
  // 붉은 휘장 열두 자락: 금실 단과 색동 띠
  const sw = LW / 12;
  for (let x = 0; x < LW; x++) { const i = Math.floor(x / sw), u = (x - i * sw) / sw, hh = Math.round(8 + Math.sin(u * Math.PI) * 7); for (let y = LINH; y < LINH + hh; y++) s.set(x, y, y < LINH + 3 ? SAEK[(x >> 3) % SAEK.length] : u < 0.04 || u > 0.96 ? c('red', 0) : (Math.round(u * 20)) % 4 === 0 ? c('red', 1) : c('red', 2)); s.set(x, LINH + hh, c('gold', 3)); s.set(x, LINH + hh + 1, INK); }
  BIG = s; return s;
}
const gathered = y => (y < TIEY ? 22 + 29 * Math.pow(1 - Math.min(1, Math.max(0, (y - LINH) / (TIEY - LINH))), 1.5) : 22 + 20 * Math.sqrt(Math.min(1, Math.max(0, (y - TIEY) / (AP - TIEY)))));
function bigCurtain(side, e) {
  const eq = Math.round(e * 20) / 20, h = AP - LINH + 2, widths = []; for (let y = 0; y < h; y++) { const yy = y + LINH - 2, gx = gathered(yy), w0 = LW / 2 + 4; widths.push(Math.round(w0 + (gx - w0) * eq) - PILW + 2); }
  return { s: curtainSpr(side, LW / 2 + 6, h, widths, 'B' + side + ':' + eq), eq, widths };
}
function drawBigCurtain(q, side, e, t) {
  const C = bigCurtain(side, e), s = C.s; q.drawImage(s.canvas(), side < 0 ? PILW - 2 : LW - PILW + 2 - s.w, LINH - 2);
  if (C.eq > 0.88) { const y = TIEY - LINH + 2, tx = side < 0 ? PILW - 2 + C.widths[y] : LW - PILW + 2 - C.widths[y]; const x0 = side < 0 ? PILW : tx, x1 = side < 0 ? tx : LW - PILW; fr(q, x0, TIEY - 1, x1 - x0, 3, INK); fr(q, x0, TIEY, x1 - x0, 1, c('red', 2)); for (let xx = x0; xx < x1; xx += 3) fr(q, xx, TIEY, 1, 1, c('gold', 3)); tassel(q, tx, TIEY + 1, c('gold', 3), 8); }
}
// 구경꾼의 뒷모습: kind 0 갓 · 1 댕기 머리 아이 · 2 수건 쓴 아낙 · 3 상투 · 4 패랭이 · 5 쪽진 머리와 비녀
const CROWD = new Map();
export function crowd(kind, sc, far) {
  const key = kind + ':' + sc + ':' + (far ? 1 : 0); let o = CROWD.get(key); if (o) return o;
  const k = v => Math.round(v * sc), W2 = k(60) + 4, H2 = k(70) + 4, cx = W2 >> 1, ny = k(30) + 2;   // (cx, ny) = 목
  const s = new Spr(W2, H2, cx, ny), body = far ? 0x181c40 : 0x1e2250, head = far ? 0x0e1030 : 0x12142e, rim = far ? 0x7070a0 : 0xe8bc7c, rim2 = far ? 0x3c4478 : 0x5c5c98;
  const small = kind === 1, sw = k(small ? 19 : 25);
  for (let y = ny; y < H2; y++) { const q = Math.min(1, (y - ny) / k(12)), half = Math.round(k(5) + (sw - k(5)) * Math.sqrt(q)); s.hl(cx - half, cx + half, y, body); }
  const t = new Spr(W2, H2), hr = small ? 8.5 * sc : 10 * sc, hy = ny - k(12);
  t.rect(cx - k(4), hy + k(4), k(8), k(9), head); t.ell(cx, hy, hr, hr * 1.06, head);
  if (kind === 0) { t.rows(hy - k(19), Array.from({ length: k(11) }, (_, i) => { const hw = i < 2 ? k(3) : k(4.5); return [cx - hw, cx + hw]; }), head); t.ell(cx, hy - k(8), k(22), Math.max(1.2, 2.4 * sc), head); }   // 갓: 좁고 둥근 대우에 넓고 얇은 양태
  else if (kind === 1) { for (let y = hy; y < hy + k(34); y++) t.hl(cx - k(2), cx + k(2), y, head); }
  else if (kind === 2) { t.ell(cx, hy - k(3), hr + 1.5, hr * 0.75, 0x342c38); t.ell(cx, hy + k(2), k(4), k(3), 0x342c38); }
  else if (kind === 3) { t.ell(cx, hy - hr - k(3), k(4.5), k(5.5), head); }
  else if (kind === 4) { t.ell(cx, hy - k(6), k(16), Math.max(1.5, 3.4 * sc), head); t.ell(cx, hy - k(10), k(9), k(8), head); }
  else if (kind === 5) { t.ell(cx, hy + k(7), k(7), k(5), head); }
  s.blit(t, 0, 0);
  o = new Spr(W2, H2, cx, ny); o.blit(s, 0, 0);
  for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) { const q = s.get(x, y); if (q === -1 || s.get(x, y - 1) !== -1) continue; o.set(x, y, q === body ? rim2 : rim); if (q !== body && x % 2 === 0 && s.get(x, y + 1) !== -1) o.set(x, y + 1, mixc(rim, head, 0.5)); }
  if (kind === 1) { o.hl(cx - k(3), cx + k(3), hy + k(32), c('red', 1)); o.hl(cx - k(3), cx + k(3), hy + k(33), c('red', 2)); }
  if (kind === 2) o.rect(cx - k(1), hy + k(3), k(3), k(2), c('red', 2));
  if (kind === 3) o.hl(cx - hr, cx + hr, hy - k(4), 0x2a2232);
  if (kind === 4) { o.set(cx + k(11), hy - k(9), 0xf4ecdc); o.set(cx + k(12), hy - k(8), 0xf4ecdc); }
  if (kind === 5) { o.hl(cx - k(12), cx + k(12), hy + k(6), 0xe8d2a0); o.set(cx + k(12) + 1, hy + k(6), c('gold', 4)); }
  CROWD.set(key, o); return o;
}
// 앞판 위 놋쇠 등잔
function lamp(q, x, y, t) {
  const f = Math.sin(t * 11 + x) > 0.3 ? 1 : 0; q.fillStyle = 'rgba(255,190,110,0.12)'; for (const r of [20 + f, 13, 8]) { q.beginPath(); q.arc(x, y - 5, r, 0, TAU); q.fill(); }
  fr(q, x - 5, y - 1, 11, 2, INK); fr(q, x - 4, y - 2, 9, 1, c('gold', 3)); fr(q, x - 3, y - 2, 4, 1, c('gold', 4)); fr(q, x - 1, y - 6 - f, 3, 4 + f, 0xff9a3a); fr(q, x, y - 5, 1, 3, 0xfff2b8);
}
// 무대 앞쪽: 다 걷힌 막 · 틀 · 등잔 · 구경꾼 (화면 좌표의 SEATS 를 그대로 받는다)
export function pxStageFront(g, t, o = {}) {
  const open = o.open === undefined ? 1 : o.open, seats = o.seats || [];
  px2(g, q => {
    q.fillStyle = 'rgba(8,4,10,0.32)'; q.fillRect(0, LINH, LW, 14); q.fillStyle = 'rgba(8,4,10,0.16)'; q.fillRect(0, LINH + 14, LW, 12);   // 들보 아래 그늘
    q.fillStyle = 'rgba(255,170,90,0.08)'; q.fillRect(PILW, AP - 34, LW - PILW * 2, 34); q.fillStyle = 'rgba(255,170,90,0.07)'; q.fillRect(PILW, AP - 14, LW - PILW * 2, 14);   // 발치 불빛
    if (open >= 1) for (const sd of [-1, 1]) drawBigCurtain(q, sd, 1, t);
    q.drawImage(bigFrame().canvas(), 0, 0);
    for (const x of o.lamps || [336, 866]) lamp(q, Math.round(x / 2), AP + 1, t);
    q.fillStyle = 'rgba(255,190,120,0.07)'; for (const [x] of seats) { q.beginPath(); q.arc(Math.round(x / 2), AP + 2, 26, 0, TAU); q.fill(); }
    for (const [x, s, kind, dy] of seats) { const sc = Math.round(Math.min(1.5, s * 0.62) * 10) / 10, far = s < 1.7, ph = x * 0.137, hop = o.hop ? Math.round(o.hop * Math.abs(Math.sin(t * 9 + ph)) * 5) : 0, bob = Math.sin(t * 1.25 + ph) > 0.85 ? 1 : 0; putSpr(q, crowd(kind, sc, far), Math.round(x / 2), Math.round((716 + (dy || 0)) / 2) - 11 - bob - hop); }
  });
}
// 막이 걷히는 동안: 단추·이름판까지 덮는 막과 틀
export function pxStageCurtain(g, t, open) {
  if (open >= 1) return;
  px2(g, q => { for (const sd of [-1, 1]) drawBigCurtain(q, sd, open, t); q.drawImage(bigFrame().canvas(), 0, 0); if (open < 0.2) { q.fillStyle = `rgba(255,210,140,${0.3 * (1 - open / 0.2)})`; q.fillRect(LW / 2 - 3, LINH, 6, AP - LINH); } });
}
// 막대: 몸통 (x, y) 에서 (bx, by) 로 (화면 좌표). 먹 테 두른 한 픽셀 나무 막대
export function pxRod(g, x, y, bx, by) {
  px2(g, q => { const X0 = x / 2, Y0 = Math.round(y / 2), X1 = bx / 2, Y1 = Math.round(by / 2); for (let yy = Y0; yy <= Y1; yy++) { const xx = Math.round(X0 + (X1 - X0) * (yy - Y0) / Math.max(1, Y1 - Y0)); fr(q, xx - 1, yy, 3, 1, 0x262a36); fr(q, xx, yy, 1, 1, yy % 7 === 0 ? 0xb8925a : 0x9a7440); } });
}
// 기울인 도트 인형: 도트 판에서 가장 가까운 점을 골라 돌린다 (각은 32 단계로 묶어 굽는다)
const ROT = new WeakMap();
function rotSpr(s, a) {
  const n = Math.round(a / TAU * 32), key = ((n % 32) + 32) % 32; let m = ROT.get(s); if (!m) ROT.set(s, m = new Map()); let o = m.get(key); if (o) return o;
  const ang = key / 32 * TAU, co = Math.cos(ang), si = Math.sin(ang), R = Math.ceil(Math.hypot(Math.max(s.ox, s.w - s.ox), Math.max(s.oy, s.h - s.oy))) + 1;
  o = new Spr(R * 2 + 1, R * 2 + 1, R, R);
  for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) { const sx = Math.round(co * x + si * y + s.ox), sy = Math.round(-si * x + co * y + s.oy); const v = s.get(sx, sy); if (v !== -1) o.set(x + R, y + R, v); }
  m.set(key, o); return o;
}
// 막대 인형 한 장 (도트): (x, y) = 발밑(화면), rot = 기울기, f = 보는 쪽, n = 정수 배율
export function pxPuppetBody(g, type, x, y, s, rot, f, wpn, alpha) {
  const P = pxUnit(type, wpn), n = Math.max(1, Math.ceil(s * 1.5 - 0.15)); let sp = P.stand; if (f < 0) sp = pxFlip(sp);
  const a = Math.abs(rot) < 0.1 ? 0 : rot; if (a) sp = rotSpr(sp, a);   // 작은 흔들림은 버리고 (기울인 도트는 거칠어진다), 눕거나 절할 때만 돌린다
  g.save(); g.imageSmoothingEnabled = false; if (alpha !== undefined) g.globalAlpha *= alpha;
  const X = Math.round(x / 2) * 2, Y = Math.round(y / 2) * 2; g.drawImage(sp.canvas(), X - sp.ox * n, Y - sp.oy * n, sp.w * n, sp.h * n); g.restore();
  return P.h * n;
}
// 소품(헌 물건·길가의 것)을 붓 그림에서 도트로
export function pxProp(g, spr, x, y, k = 1) { pxPaper(g, spr, x, y, k); }

// ───────── 장면 바꿈: 양옆에서 닫히는 막과 가운데 매듭, 마당 이름판 ─────────
let WIPE = null;
function wipeTex() {
  if (WIPE) return WIPE; const w = 360, s = new Spr(w, LH), PF = 24;
  for (let y = 0; y < LH; y++) for (let x = 0; x < w; x++) { const sway = Math.sin(y * 0.03 + x * 0.05) * 1.6, u = (((x + sway) % PF) + PF) % PF / PF; let q = clothCol(u, y < 24 ? -0.6 + y / 40 : 0.1, x, y); s.set(x, y, q); }
  // 아랫단: 금실 구름무늬 · 금 띠 · 붉은 단 · 금 띠
  const hb = LH - 22;
  for (let x = 0; x < w; x++) { s.set(x, hb - 1, INK); s.set(x, hb, c('gold', 3)); s.set(x, hb + 1, c('gold', 1)); for (let y = hb + 2; y < LH - 4; y++) s.set(x, y, (x + y) % 8 === 0 ? c('red', 3) : y === hb + 2 ? c('red', 3) : c('red', 1)); s.set(x, LH - 4, c('gold', 3)); s.set(x, LH - 3, c('gold', 2)); s.set(x, LH - 2, c('gold', 1)); s.set(x, LH - 1, INK); }
  for (let cx = 20; cx < w; cx += 60) { const cy = hb - 9; for (const [dx, dy, r] of [[0, 0, 4], [6, 1, 3], [-6, 2, 3]]) for (let a = Math.PI; a <= TAU; a += 0.12) s.set(Math.round(cx + dx + Math.cos(a) * r), Math.round(cy + dy + Math.sin(a) * r * 0.8), c('gold', 3)); for (let x = cx - 10; x <= cx + 10; x++) s.set(x, cy + 4 + (Math.abs(x - cx) > 6 ? 0 : 1), c('gold', 2)); }
  WIPE = s; return s;
}
// k: 0(열림) → 1(닫힘)
export function pxWipe(g, k, W, H, T = 0) {
  if (k <= 0) return; const e = k * k * (3 - 2 * k), half = LW / 2 + 13, cw = Math.round(half * e), vh = 31, vy = Math.round(-vh * (1 - Math.min(1, e * 1.6)));
  px2(g, q => {
    q.fillStyle = `rgba(8,6,14,${0.45 * e})`; q.fillRect(0, 0, LW, LH);
    const tex = wipeTex();
    for (const sd of [-1, 1]) {
      const inner = sd < 0 ? cw : LW - cw; q.save(); q.beginPath(); q.rect(sd < 0 ? 0 : inner, 0, cw, LH); q.clip();
      for (let ox = sd < 0 ? inner - tex.w : inner; sd < 0 ? ox + tex.w > 0 : ox < LW; ox += sd < 0 ? -tex.w : tex.w) q.drawImage(tex.canvas(), ox, 0);
      q.restore();
      q.fillStyle = 'rgba(0,0,0,0.35)'; q.fillRect(sd < 0 ? inner : inner - 6, 0, 6, LH);   // 안쪽 그늘
      fr(q, sd < 0 ? inner - 3 : inner, 0, 3, LH, INK); fr(q, sd < 0 ? inner - 2 : inner + 1, 0, 1, LH, c('gold', 3));
    }
    // 위의 가림막: 짙은 쪽빛 단에 색동 띠와 오방색 술
    fr(q, 0, vy, LW, vh, INK); fr(q, 0, vy, LW, vh - 1, 0x1c2948); for (let i = 0; i * 11 < LW; i++) fr(q, i * 11, vy + vh - 8, 11, 5, SAEK[i % SAEK.length]); fr(q, 0, vy + vh - 3, LW, 1, 0x101830);
    for (let i = 0; i < 15; i++) { const cx = Math.round(LW * (i + 0.5) / 15) + (Math.sin(T * 2.4 + i) > 0.6 ? 1 : 0); tassel(q, cx, vy + vh - 2, OBANG[i % 3], 8); }
    const kk = Math.max(0, (e - 0.82) / 0.18);
    if (kk > 0) { q.fillStyle = `rgba(255,214,150,${0.08 * kk})`; for (const r of [150, 100, 60]) { q.beginPath(); q.arc(LW / 2, LH * 0.42, r, 0, TAU); q.fill(); }
      const cx = LW / 2, y0 = vy + vh, drop = Math.round(35 * (1 - (1 - kk) * (1 - kk))); q.globalAlpha = kk;
      fr(q, cx - 1, y0, 2, drop, INK); fr(q, cx, y0, 1, drop, c('gold', 3)); const ky = y0 + drop + 9;
      for (const [dx, dy] of [[0, -5], [-5, 0], [5, 0], [0, 5]]) { fr(q, cx + dx - 3, ky + dy - 3, 7, 7, INK); fr(q, cx + dx - 2, ky + dy - 2, 5, 5, c('red', 2)); fr(q, cx + dx - 2, ky + dy - 2, 2, 1, c('red', 4)); }
      fr(q, cx - 2, ky - 2, 5, 5, INK); fr(q, cx - 1, ky - 1, 3, 3, c('gold', 3));
      for (let j = -3; j <= 3; j++) fr(q, cx + j, ky + 9, 1, 22 + (Math.sin(T * 3 + j) > 0 ? 1 : 0) + Math.abs(j % 2), j % 2 ? c('gold', 3) : c('red', 2));
      q.globalAlpha = 1; }
  });
}
// 닫힌 막 위에 거는 마당 이름판: 줄에 매달린 한지 판 (글은 부르는 쪽이 쓴다). 돌려주는 값: 판의 가운데 y(화면)
export function pxPlaqueBoard(g, W, H, drop) {
  const cx = LW / 2, cy = Math.round(H * 0.46 / 2) + Math.round(drop / 2);
  px2(g, q => {
    for (const sx of [-75, 75]) { fr(q, cx + sx - 1, 0, 3, cy - 24, INK); fr(q, cx + sx, 0, 1, cy - 24, c('gold', 3)); }
    q.fillStyle = 'rgba(8,6,10,0.45)'; q.fillRect(cx - 103, cy - 23, 210, 52);
    fr(q, cx - 105, cy - 26, 210, 52, INK); fr(q, cx - 104, cy - 25, 208, 50, c('cream', 3)); fr(q, cx - 104, cy - 25, 208, 1, c('cream', 4)); fr(q, cx - 104, cy + 23, 208, 1, c('cream', 1));
    fr(q, cx - 100, cy - 21, 200, 1, c('wood', 2)); fr(q, cx - 100, cy + 20, 200, 1, c('wood', 2)); fr(q, cx - 100, cy - 21, 1, 42, c('wood', 2)); fr(q, cx + 99, cy - 21, 1, 42, c('wood', 2));
    for (const [x, y] of [[cx - 102, cy - 23], [cx + 100, cy - 23], [cx - 102, cy + 21], [cx + 100, cy + 21]]) fr(q, x, y, 2, 2, c('red', 2));
  });
  return cy * 2;
}

// ───────── 화면 가득한 인형극 마당: 어두운 밤, 무대를 비추는 두 줄기 빛과 떠도는 먼지 ─────────
let YARD = null;
export function pxPlayYard(g, t) {
  if (!YARD) { const s = new Spr(LW, LH), R = rng(9); for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) { const d = Math.hypot((x - 320) / 1.6, y - 150) / 330; s.set(x, y, d < 0.35 ? 0x241a1c : d < 0.55 && bayer(x, y) > (d - 0.35) / 0.2 ? 0x241a1c : d < 0.8 && bayer(x, y) > (d - 0.55) / 0.25 ? 0x18121a : 0x0e0a12); }
    for (const [bx, ang] of [[130, 0.95], [510, 2.2]]) for (let r = 60; r < 270; r++) { const wd = 15 + r * 0.25, cx = bx + Math.cos(ang) * r, cy = Math.sin(ang) * r; for (let o2 = -wd; o2 <= wd; o2++) { const x = Math.round(cx - Math.sin(ang) * o2), y = Math.round(cy + Math.cos(ang) * o2); if (x < 0 || x >= LW || y < 0 || y >= LH) continue; if (bayer(x, y) < 0.22 * (1 - r / 270) * (1 - Math.abs(o2) / wd)) s.set(x, y, mixc(s.get(x, y), 0xffe2aa, 0.25)); } }
    for (let i = 0; i < 80; i++) s.set((R() * LW) | 0, (R() * 40) | 0, 0x2c2430);
    YARD = s; }
  px2(g, q => { q.drawImage(YARD.canvas(), 0, 0); for (let i = 0; i < 20; i++) { const x = (i * 87 + Math.sin(t * 0.3 + i) * 15) % LW, y = 20 + ((i * 45 + t * 3) % 250); if (Math.sin(t * 1.6 + i) > -0.2) fr(q, x, y, 1, 1, '#ffe9c0'); } });
}

// ───────── 길 위의 사건 마당: 밤하늘·마을 지붕 그림자·흙마당·대나무 장대 ─────────
let HALL = null;
export function pxHall(g, t, poles) {
  if (!HALL) {
    const s = new Spr(LW, LH), R = rng(5150);
    skyBand(s, LW, 225, [0x0e1024, 0x141632, 0x1c1c3c, 0x241f40, 0x2a2240], R); stars(s, LW, 200, R, 110);
    for (let x = 0; x < LW; x++) { const y0 = Math.round(190 - 30 * Math.exp(-(((x - 80) / 75) ** 2)) - 25 * Math.exp(-(((x - 560) / 85) ** 2)) - 4 * Math.sin(x * 0.04)); for (let y = y0; y < 225; y++) s.set(x, y, y === y0 ? 0x2c2a48 : 0x1b1a2c); }
    for (const [x, w] of [[5, 85], [545, 95]]) { for (let y = 205; y < 236; y++) { const q = (y - 205) / 31, half = Math.round(w * (0.22 + 0.32 * Math.sqrt(q))); for (let xx = x + (w >> 1) - half; xx <= x + (w >> 1) + half; xx++) s.set(xx, y, y === 205 + Math.round(q) ? 0x2a2836 : 0x16141f); } s.rect(x + Math.round(w * 0.3), 226, 12, 9, 0x8a5c34); s.rect(x + Math.round(w * 0.3) + 1, 227, 10, 7, 0xffbe6e); }
    for (let y = 225; y < LH; y++) for (let x = 0; x < LW; x++) { const d = Math.hypot((x - 320) / 2.2, (y - 225) * 1.1) / 160; s.set(x, y, d < 0.6 ? (bayer(x, y) < 0.5 - d * 0.6 ? 0x4c3a30 : 0x3b2e2a) : d < 1 && bayer(x, y) < (1 - d) * 0.8 ? 0x3b2e2a : 0x2a2124); }
    for (let i = 0; i < 260; i++) { const x = (R() * LW) | 0, y = 228 + ((R() * 130) | 0); s.hl(x, x + 1 + ((R() * 3) | 0), y, i % 2 ? 0x5a4636 : 0x30262a); }
    for (const x of poles.map(p => Math.round(p / 2))) { const d = x < LW / 2 ? 1 : -1; s.rect(x - 4, 46, 8, LH - 46, INK); s.rect(x - 3, 46, 6, LH - 46, 0x7f8a4a); s.vl(x - 2, 46, LH - 1, 0xa8b468); s.vl(x + 2, 46, LH - 1, 0x5c6634); for (let y = 70; y < LH; y += 37) { s.hl(x - 4, x + 3, y, INK); s.hl(x - 2, x + 2, y - 1, 0xc8d488); } s.rect(Math.min(x, x + d * 48), 51, 48, 3, INK); s.hl(Math.min(x, x + d * 48), Math.min(x, x + d * 48) + 47, 52, 0x9a8a52); }
    s.ell(320, 223, 240, 7, 0x150e14);
    HALL = s;
  }
  px2(g, q => q.drawImage(HALL.canvas(), 0, 0));
}
// 장대 끝의 청사초롱과 불빛
export function pxLantern(g, x, y, t, col = 'red') {
  px2(g, q => { const X = Math.round(x / 2), Y = Math.round(y / 2), f = Math.sin(t * 2.6 + x) > 0.4 ? 1 : 0; q.fillStyle = 'rgba(255,180,100,0.09)'; for (const r of [36 + f, 24, 14]) { q.beginPath(); q.arc(X, Y + 8, r, 0, TAU); q.fill(); }
    fr(q, X, Y - 9, 1, 9, INK); fr(q, X - 5, Y, 11, 14, INK); fr(q, X - 4, Y + 1, 9, 6, c(col, 2)); fr(q, X - 4, Y + 7, 9, 6, c('blue', 2)); fr(q, X - 3, Y + 1, 2, 12, 0xffffff); q.globalAlpha = 0.35; fr(q, X - 3, Y + 1, 2, 12, c(col, 4)); q.globalAlpha = 1; fr(q, X - 5, Y, 11, 1, c('gold', 3)); fr(q, X - 5, Y + 13, 11, 1, c('gold', 3)); fr(q, X - 1, Y + 14, 3, 5, c('red', 2)); fr(q, X - 2, Y + 4, 5, 5, 0xfff2b8); q.globalAlpha = 0.6; fr(q, X - 2, Y + 4, 5, 5, c('gold', 4)); q.globalAlpha = 1; });
}
// 새끼줄: 꼬인 짚 무늬 (ropeY = 화면 x → 화면 y)
export function pxRope(g, x0, x1, ropeY) {
  px2(g, q => { for (let x = Math.round(x0 / 2); x <= Math.round(x1 / 2); x++) { const y = Math.round(ropeY(x * 2) / 2); fr(q, x, y - 2, 1, 4, INK); fr(q, x, y - 1, 1, 2, x % 3 === 0 ? 0x8a6a2c : 0xc9a862); if (x % 3 === 1) fr(q, x, y - 1, 1, 1, 0xe8cc88); } for (const x of [x0, x1]) { const X = Math.round(x / 2), Y = Math.round(ropeY(x) / 2); fr(q, X - 4, Y - 3, 9, 6, INK); fr(q, X - 3, Y - 2, 7, 4, 0xc9a862); fr(q, X - 2, Y - 2, 2, 1, 0xe8cc88); } });
}
// 한지 쪽지 한 장 (화면 좌표 x, y, w, h): 위에 나무 집게, 아래 끝은 찢은 듯 들쭉날쭉. 쪽지의 글은 부르는 쪽이 쓴다
export function pxSheet(g, x, y, w, h, band, o = {}) {
  px2(g, q => {
    const X = Math.round(x / 2), Y = Math.round(y / 2), Wd = Math.round(w / 2), Hd = Math.round(h / 2), fill = o.fill || '#fbf3df';
    q.fillStyle = 'rgba(6,4,10,0.45)'; q.fillRect(X + 2, Y + 3, Wd, Hd - 1);
    fr(q, X - 1, Y - 1, Wd + 2, Hd, INK); fr(q, X, Y, Wd, Hd - 2, fill);
    for (let i = 0; i < Wd; i++) { const j = ((i * 7) % 3) - 1; fr(q, X + i, Y + Hd - 2, 1, Math.max(0, 1 + j), fill); fr(q, X + i, Y + Hd - 1 + j, 1, 1, INK); }
    fr(q, X, Y, Wd, 4, band); fr(q, X, Y + 4, Wd, 1, mixc(parseInt(String(band).replace('#', ''), 16) || 0x6a5a8a, 0x000000, 0.35));
    q.globalAlpha = 0.18; for (let i = 0; i < 10; i++) fr(q, X + 4 + ((i * 61) % Math.max(1, Wd - 10)), Y + 8 + ((i * 37) % Math.max(1, Hd - 14)), 4, 1, '#7a6040'); q.globalAlpha = 1;
    if (o.ring) { q.strokeStyle = o.ring; q.lineWidth = 1; q.strokeRect(X + 2.5, Y + 6.5, Wd - 5, Hd - 11); }
    const cx = X + (Wd >> 1); fr(q, cx - 4, Y - 10, 8, 15, INK); fr(q, cx - 3, Y - 9, 6, 13, 0xa9753f); fr(q, cx - 3, Y - 9, 1, 13, 0xd09a5c); fr(q, cx, Y - 8, 1, 11, 0x5a3a20); fr(q, cx - 1, Y - 3, 3, 2, 0x6a5030);
  });
}
// 장대 아래 구경꾼 (작은 무대 둘레)
export function pxAudience(g, x, y, s, kind, t) { px2(g, q => putSpr(q, crowd(kind, Math.round(s * 0.62 * 10) / 10, false), Math.round(x / 2), Math.round(y / 2) - 2 + (Math.sin(t * 1.3 + x) > 0.8 ? -1 : 0))); }
// 떠도는 먼지 (무대 위)
export function pxMotes(g, t, x, y, w, h, n = 18) { px2(g, q => { for (let i = 0; i < n; i++) { const X = Math.round(x / 2 + ((i * 53 + t * 4) % (w / 2))), Y = Math.round(y / 2 + ((i * 37 + Math.sin(t * 0.7 + i) * 6 + i * 11) % (h / 2))); if (Math.sin(t * 1.5 + i * 2.1) > 0) fr(q, X, Y, 1, 1, '#ffecbe'); } }); }
