// 인형 그림: 사람과 도깨비는 몸과 머리를 따로 오린 관절 종이 인형, 그 밖의 요괴·탈것은 한 장
// 모든 그림은 발이 원점(0,0), 위쪽이 -y. 셀 음영(오른쪽 아래 그늘 + 왼쪽 위 빛)과 먹선으로 그린다
import { TAU, INK, RED, INDIGO, TEAL, OCHRE, SKIN, st, ell, rr, poly, line, path } from './draw.js';
import { taegeuk } from './symbols.js';

export const WHITE = '#fbf7ec', BLACK = '#2b2a30', STEEL = '#e4e8ea', IRON = '#4a4a55', WOOD = '#a9753f', WOODD = '#7a4a2c';
export const HX = 15.5, HY = -18.4; // 인형의 손 위치 (무기를 쥐는 자리)
const PI = Math.PI;

// ───────── 색과 음영 ─────────
const hex = c => { const n = parseInt(c.slice(1, 7), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const mix = (c, t, k) => { const a = hex(c), b = hex(t); return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * k).toString(16).padStart(2, '0')).join(''); };
export const dk = (c, k = 0.22) => mix(c, '#1e1830', k);   // 그늘: 살짝 보랏빛으로 가라앉힌다
export const lt = (c, k = 0.3) => mix(c, '#fff6de', k);    // 빛: 따뜻하게 밝힌다
export const E = (x, y, rx, ry, rot = 0) => p => p.ellipse(x, y, rx, ry, rot, 0, TAU);
export const R = (x, y, w, h) => p => p.rect(x, y, w, h);
export const P = (...pts) => p => { p.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) p.lineTo(pts[i], pts[i + 1]); p.closePath(); };
// 한 조각: 바탕색 → (조각 안쪽에만) 그늘과 빛 → 먹선
export function part(g, fn, col, sh, o = {}) {
  g.beginPath(); fn(g); g.fillStyle = col; g.fill();
  if (sh || o.hi) { g.save(); g.clip(); if (sh) { g.fillStyle = o.shc || dk(col, o.k === undefined ? 0.2 : o.k); g.beginPath(); sh(g); g.fill(); } if (o.hi) { g.fillStyle = o.hic || lt(col, o.hk === undefined ? 0.34 : o.hk); g.beginPath(); o.hi(g); g.fill(); } g.restore(); }
  if (o.lw !== 0) { g.beginPath(); fn(g); st(g, o.line || INK, o.lw || 1.2); }
}
export const curve = (g, fn, col, lw) => { g.beginPath(); fn(g); st(g, col, lw); };
export const rope = (g, fn, col, lw = 1.6) => { curve(g, fn, INK, lw + 1.5); curve(g, fn, col, lw); };
// 사람 인형의 입체감: 조각 안쪽에서 왼쪽 위는 따뜻한 빛, 오른쪽 아래는 보랏빛 그늘이 번진다 (평면 색면이 둥글게 보이게)
function shade(g, fn, x0, y0, x1, y1, a = 0.2, b = 0.24) {
  a *= 1.35; b *= 1.45;   // 전투 크기(50~80px)에서도 둥근 맛이 보이게 조금 세게
  g.save(); g.beginPath(); fn(g); g.clip(); const gr = g.createLinearGradient(x0, y0, x1, y1);
  gr.addColorStop(0, `rgba(255,246,222,${a})`); gr.addColorStop(0.38, 'rgba(255,246,222,0)'); gr.addColorStop(0.6, 'rgba(30,24,48,0)'); gr.addColorStop(1, `rgba(30,24,48,${b})`);
  g.fillStyle = gr; g.fillRect(-60, -100, 120, 112);
  // 볕 받는 테두리: 왼쪽 위 가장자리 안쪽을 따라 가는 빛줄 (같은 테두리를 오른쪽 아래로 밀어 그리면 왼쪽 위만 조각 안에 남는다)
  g.translate(1.1, 0.9); g.beginPath(); fn(g); st(g, `rgba(255,248,228,${Math.min(0.6, a * 1.6)})`, 1.4); g.restore();
}
// 그늘 쪽(오른쪽) 먹선을 굵게: 같은 테두리를 x 가 x0 보다 큰 쪽만 한 번 더 긋는다 (붓을 눌러 그은 듯한 굵고 가는 선)
function heavy(g, fn, lw = 2, x0 = 0.6) { g.save(); g.beginPath(); g.rect(x0, -100, 80, 112); g.clip(); g.beginPath(); fn(g); st(g, INK, lw); g.restore(); }
// 붓으로 그은 옷 주름: 가운데가 굵고 양 끝이 가는 먹 획 + 곁의 옅은 빛 (x0,y0 → x1,y1)
function fold(g, x0, y0, x1, y1, col, w = 1.1, hiCol) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L * w * 0.5, ny = dx / L * w * 0.5, mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  path(g, p => { p.moveTo(x0, y0); p.quadraticCurveTo(mx + nx, my + ny, x1, y1); p.quadraticCurveTo(mx - nx, my - ny, x0, y0); p.closePath(); }, col);
  if (hiCol) { g.save(); g.globalAlpha *= 0.55; line(g, [x0 - 0.9, y0 + 0.3, x1 - 0.9, y1], hiCol, 0.6); g.restore(); }
}

// ───────── 얼굴 ─────────
// 눈매는 사람마다 다르다: 눈꼬리의 기울기(up), 위·아래 눈꺼풀의 부풀기(top·bot), 눈의 너비(w), 눈동자 크기(ir)
const EYES = {
  calm: { up: 0.3, top: 2.1, bot: 1.3, ir: 1.35, lid: 1.2 },                                  // 담담한 눈
  sharp: { up: 1.05, top: 1.55, bot: 0.9, ir: 1.35, tail: 1.25, lid: 1.45 },                  // 눈꼬리가 올라간 매서운 눈
  soft: { up: 0, top: 2.5, bot: 1.7, ir: 1.5, lid: 1.05, fold: true, tail: 0.6, dy0: 0.4 },   // 순한 눈
  round: { up: 0, top: 3.3, bot: 2.7, ir: 1.25, w: 0.1, lid: 1.1, fold: true, tail: 0.5, dy0: 0.3 }, // 둥글고 또렷한 눈
  droop: { up: -1.1, top: 2.4, bot: 1.2, ir: 1.4, tail: -0.8, lid: 1.15, dy0: 0.3 },          // 눈꼬리가 처진 눈
  heavy: { up: 0.1, top: 0.7, bot: 2.2, ir: 1.5, dy: 0.5, lid: 1.9, tail: 0.7 },              // 눈꺼풀이 반쯤 내려온 눈
  narrow: { up: 0.5, top: 0.9, bot: 0.4, ir: 0.95, w: 0.4, lid: 1.2 },                        // 가늘게 뜬 실눈
  glare: { up: 0.5, top: 3.2, bot: 2.4, ir: 0.95, lid: 1.5, tail: 0.8 },                      // 흰자가 드러나게 부릅뜬 눈
};
function eyes(g, o, cx, cy) {
  const kind = o.eyes || 'calm', e = EYES[kind] || EYES.calm, w = e.w || 0; cy += e.dy0 || 0;
  for (const s of [-1, 1]) {
    const xi = s * (cx - 2.5 - w), xo = s * (cx + 2.7 + w);
    if (o.blink || kind === 'closed') { curve(g, p => { p.moveTo(xi, cy + 0.2); p.quadraticCurveTo(s * cx, cy + 1.5, xo, cy - 0.3); }, INK, 1.3); line(g, [xo, cy - 0.3, xo + s * 0.9, cy - 0.8], INK, 0.9); continue; }
    // 눈웃음: 초승달처럼 휜 눈
    if (kind === 'smile') { curve(g, p => { p.moveTo(xi, cy + 0.8); p.quadraticCurveTo(s * cx, cy - 2.5, xo, cy + 0.5); }, INK, 1.45); line(g, [xo, cy + 0.5, xo + s * 1, cy + 0.9], INK, 0.8); continue; }
    if (kind === 'ghost') { part(g, p => { p.moveTo(xi, cy + 1); p.quadraticCurveTo(s * cx, cy - 3.1, xo, cy - 1.7); p.quadraticCurveTo(s * (cx + 0.8), cy + 2.6, xi, cy + 1); p.closePath(); }, '#262d48', null, { lw: 0 }); ell(g, s * (cx + 0.3), cy - 0.2, 0.75, 0.85, '#bfe9f5'); continue; }
    const yo = cy - e.up, iy = cy - 0.2 + (e.dy || 0), tl = e.tail === undefined ? 1 : e.tail;
    const top = p => { p.moveTo(xi, cy + 0.45); p.quadraticCurveTo(s * (cx - 0.3), cy - e.top, xo, yo); }, low = p => { p.moveTo(xo, yo); p.quadraticCurveTo(s * (cx + 0.5), cy + e.bot, xi, cy + 0.45); };
    g.beginPath(); top(g); g.quadraticCurveTo(s * (cx + 0.5), cy + e.bot, xi, cy + 0.45); g.closePath(); g.fillStyle = '#f6f0e2'; g.fill();
    g.save(); g.clip(); g.globalAlpha *= 0.22; ell(g, s * cx, cy - e.top * 0.45, 3.4, 1.4, '#5a4038'); g.globalAlpha /= 0.22;   // 윗눈꺼풀이 흰자에 드리운 그늘
    ell(g, s * (cx + 0.15), iy, e.ir, e.ir * 1.07, o.iris || '#4a3026'); ell(g, s * (cx + 0.15), iy + 0.1, e.ir * 0.62, e.ir * 0.66, '#140c10'); ell(g, s * (cx + 0.15) - 0.5, iy - 0.55, e.fold ? 0.72 : 0.64, e.fold ? 0.72 : 0.64, '#ffffff'); ell(g, s * (cx + 0.15) + 0.55, iy + 0.5, 0.28, 0.28, 'rgba(255,255,255,0.75)'); g.restore();
    curve(g, top, INK, e.lid || 1.45); if (tl) line(g, [xo, yo, xo + s * 1.15 * Math.abs(tl), yo - 0.55 * tl], INK, 1);
    if (o.lash) { line(g, [xo - s * 0.2, yo, xo + s * 1.3, yo - 1.1], INK, 0.6); line(g, [xo - s * 1.1, yo - 0.5, xo - s * 0.4, yo - 1.5], INK, 0.5); }
    g.globalAlpha *= 0.45; curve(g, low, INK, 0.6);
    if (e.fold) curve(g, p => { p.moveTo(xi + s * 0.9, cy - 0.5); p.quadraticCurveTo(s * (cx - 0.2), cy - e.top - 0.95, xo - s * 0.3, yo - 0.95); }, INK, 0.6);
    if (o.bags) curve(g, p => { p.moveTo(s * (cx - 1.8), cy + e.bot * 0.5 + 1.3); p.quadraticCurveTo(s * cx, cy + e.bot * 0.5 + 2.1, s * (cx + 2), cy + e.bot * 0.5 + 1.1); }, INK, 0.6);
    g.globalAlpha /= 0.45;
  }
}
// 눈썹: 붓을 눌렀다 빼듯 안쪽이 굵고 꼬리가 가늘다.  [안쪽 x·y, 꼬리 x·y, 굵기, 휨]
const BROWS = {
  calm: [1.4, -45.5, 7, -46.1, 1.2, 0.7], stern: [1.2, -43.9, 7, -46.3, 1.5, 0.5], thick: [1, -45.1, 7.4, -46.2, 2.3, 0.7], soft: [1.6, -46.3, 6.8, -46.1, 1, 1.2],
  flat: [1.2, -45.8, 7.3, -46, 1.9, 0.2],    // 굵은 일자 눈썹
  arch: [1.5, -46.1, 7.2, -45.3, 1.1, 1.9],  // 둥글게 휜 눈썹
  worry: [1.4, -47.3, 7, -45.1, 1.2, 0.4],   // 안쪽이 올라간 팔자 눈썹
  bushy: [0.8, -44.6, 7.9, -46.6, 2.8, 0.9], // 치켜 올라간 숯검댕이 눈썹
  thin: [1.7, -46.2, 6.9, -46.5, 0.8, 0.9],  // 가는 눈썹
};
function brow(g, s, x0, y0, x1, y1, w, col, arch = 0.9) {
  path(g, p => { p.moveTo(s * x0, y0 - w * 0.55); p.quadraticCurveTo(s * (x0 + x1) / 2, (y0 + y1) / 2 - arch - w * 0.5, s * x1, y1); p.quadraticCurveTo(s * (x0 + x1) / 2, (y0 + y1) / 2 - arch + w * 0.5, s * x0, y0 + w * 0.55); p.closePath(); }, col);
}
// 턱선: [볼 x·y, 턱 x·y, 턱끝 y]
const JAW = { oval: [8.9, -39.4, 5, -33.2, -32.6], square: [9.3, -37.2, 6.9, -32.8, -32.5], round: [9.7, -38, 6.3, -32.2, -32.1], slim: [8.5, -40.8, 3.7, -33.6, -32.3], long: [8.9, -38.6, 4.8, -31.6, -31.3] };
function face(g, o, skin) {
  const cy = -41.2, tall = o.eyes === 'glare' ? 0.6 : 0;
  if (o.pale) { g.globalAlpha = 0.4; for (const s of [-1, 1]) ell(g, s * 3.7, cy + 0.3, 3.8, 3.4, '#4a4a6a'); g.globalAlpha = 1; }
  // 볼에 옅은 홍조 (망령·노인은 빼고)
  if (!o.pale && !o.ghost) for (const s of [-1, 1]) { const gx = s * 5.6, gy = -37.6, gr = g.createRadialGradient(gx, gy, 0.2, gx, gy, 3.2); gr.addColorStop(0, o.old ? 'rgba(214,120,104,0.14)' : 'rgba(228,112,96,0.26)'); gr.addColorStop(1, 'rgba(228,112,96,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(gx, gy, 3.4, 2.4, 0, 0, TAU); g.fill(); }
  // 콧날 오른쪽의 옅은 그늘
  g.save(); g.globalAlpha *= 0.18; path(g, p => { p.moveTo(0.9, -41.6); p.quadraticCurveTo(2.4, -39.6, 1.6, -37.8); p.lineTo(0.6, -38.2); p.quadraticCurveTo(1.2, -39.8, 0.4, -41.4); p.closePath(); }, '#6a3a30'); g.restore();
  eyes(g, o, 3.75, cy);
  const b = o.brow || 'calm', bc = o.browCol || (o.old ? WHITE : INK);
  for (const s of [-1, 1]) {
    if (b === 'old') path(g, p => { p.moveTo(s * 1.2, -44.8); p.quadraticCurveTo(s * 5, -47.6, s * 8.6, -43.6); p.quadraticCurveTo(s * 5, -45.4, s * 1.2, -43.6); p.closePath(); }, bc, INK, 0.5);
    else { const q = BROWS[b] || BROWS.calm; brow(g, s, q[0], q[1] - tall, q[2], q[3] - tall, q[4], bc, q[5]); }
  }
  if (o.lines) { g.globalAlpha = 0.4; for (const s of [-1, 1]) { line(g, [s * 7.2, cy - 0.4, s * 8.4, cy - 1], INK, 0.5); line(g, [s * 7.3, cy + 0.5, s * 8.5, cy + 0.7], INK, 0.5); curve(g, p => { p.moveTo(s * 2.2, -38.4); p.quadraticCurveTo(s * 3.6, -37, s * 3.2, -35.2); }, INK, 0.5); } g.globalAlpha = 1; }
  // 코: 콧날과 콧방울 (broad = 주먹코)
  if (o.nose === 'broad') { line(g, [0.4, -40.6, 0.7, -38.6], dk(skin, 0.36), 0.8); curve(g, p => { p.moveTo(-1.9, -38.3); p.quadraticCurveTo(-2.1, -37, -0.7, -37.3); p.quadraticCurveTo(0, -36.7, 0.7, -37.3); p.quadraticCurveTo(2.1, -37, 1.9, -38.3); }, dk(skin, 0.46), 0.9); }
  else curve(g, p => { p.moveTo(0.5, -41.4); p.quadraticCurveTo(1.5, -39, 0.9, -37.9); p.quadraticCurveTo(0.2, -37.4, -0.6, -37.8); }, dk(skin, 0.42), 0.85);
  // 입: 굳게 다문 입이 기본 (곧은 입. 가운데를 올리면 시무룩해 보인다)
  const m = o.mouth || 'flat', mc = o.lip || '#7a3a30';
  if (m === 'smile') curve(g, p => { p.moveTo(-2, -35.9); p.quadraticCurveTo(0, -35.1, 2, -35.9); }, mc, 1);
  else if (m === 'flat') { curve(g, p => { p.moveTo(-2, -35.6); p.quadraticCurveTo(0, -35.6, 2, -35.6); }, mc, o.lip ? 1.4 : 1.1); for (const s of [-1, 1]) line(g, [s * 2, -35.6, s * 2.5, -35.2], mc, 0.6); line(g, [-0.7, -34.5, 0.7, -34.5], dk(skin, 0.3), 0.6); g.save(); g.globalAlpha *= 0.35; line(g, [-0.6, -34.9, 0.4, -34.9], lt(skin, 0.6), 0.5); g.restore(); }
  else if (m === 'frown') curve(g, p => { p.moveTo(-2.1, -35.2); p.quadraticCurveTo(0, -36.5, 2.1, -35.2); }, mc, 1.1);
  else if (m === 'smirk') { curve(g, p => { p.moveTo(-1.9, -35.4); p.quadraticCurveTo(0.4, -35.2, 2.3, -36.3); }, mc, 1.1); line(g, [2.3, -36.3, 2.7, -37], mc, 0.7); }
  else if (m === 'grin') { path(g, p => { p.moveTo(-3, -36.7); p.quadraticCurveTo(0, -36, 3, -36.7); p.quadraticCurveTo(0, -33.2, -3, -36.7); p.closePath(); }, WHITE, INK, 0.8); line(g, [-2.2, -35.6, 2.2, -35.6], '#b9b3a2', 0.4); }
  else if (m === 'grit') { rr(g, -2.5, -36.8, 5, 2.1, 0.5, WHITE, INK, 0.7); line(g, [0, -36.8, 0, -34.7], INK, 0.5); for (const x of [-1.25, 1.25]) line(g, [x, -36.8, x, -34.7], INK, 0.4); }
  else if (m === 'o') ell(g, 0, -35.6, 1.4, 1.8, '#5a2a26', INK, 0.7);
  // 수염
  const bd = o.beard, hc = o.beardCol || o.hair || BLACK;
  if (bd === 'long') { part(g, p => { p.moveTo(-5.6, -38.4); p.quadraticCurveTo(-7, -27, -2.6, -19.6); p.quadraticCurveTo(0, -16.4, 2.6, -19.6); p.quadraticCurveTo(7, -27, 5.6, -38.4); p.quadraticCurveTo(3, -34.6, 0, -35.6); p.quadraticCurveTo(-3, -34.6, -5.6, -38.4); p.closePath(); }, WHITE, P(1, -40, 8, -40, 8, -16, 2.6, -16), { k: 0.12, lw: 1 }); for (const x of [-2.6, 0, 2.6]) line(g, [x, -32, x * 0.7, -21], '#c9d0d2', 0.7); for (const s of [-1, 1]) curve(g, p => { p.moveTo(s * 0.5, -36.9); p.quadraticCurveTo(s * 3.6, -37.2, s * 5.6, -32.6); }, WHITE, 1.5); }
  else if (bd === 'full') { part(g, p => { p.moveTo(-8.2, -40.4); p.quadraticCurveTo(-8.6, -32.4, -4, -29.4); p.quadraticCurveTo(0, -27.6, 4, -29.4); p.quadraticCurveTo(8.6, -32.4, 8.2, -40.4); p.quadraticCurveTo(6, -35, 2.6, -37.3); p.quadraticCurveTo(0, -34.4, -2.6, -37.3); p.quadraticCurveTo(-6, -35, -8.2, -40.4); p.closePath(); }, hc, P(2, -42, 9, -42, 9, -27, 3, -27), { lw: 1 }); for (const x of [-4.6, -1.6, 1.6, 4.6]) line(g, [x, -33.4, x * 0.9, -30], '#4a4852', 0.6); curve(g, p => { p.moveTo(-1.7, -35.5); p.quadraticCurveTo(0, -35.9, 1.7, -35.5); }, '#b87a6a', 0.9); }
  // 봉두난발 수염: 턱을 덮고 뻗친다
  else if (bd === 'wild') { part(g, p => { p.moveTo(-9, -41); p.lineTo(-10.6, -35); p.lineTo(-8, -34.6); p.lineTo(-8.6, -29.6); p.lineTo(-5, -30.6); p.lineTo(-3.6, -25.6); p.lineTo(0, -28.6); p.lineTo(3.6, -25.6); p.lineTo(5, -30.6); p.lineTo(8.6, -29.6); p.lineTo(8, -34.6); p.lineTo(10.6, -35); p.lineTo(9, -41); p.quadraticCurveTo(6, -35.4, 2.8, -37.4); p.quadraticCurveTo(0, -34.6, -2.8, -37.4); p.quadraticCurveTo(-6, -35.4, -9, -41); p.closePath(); }, hc, P(2, -42, 11, -42, 11, -25, 3, -25), { lw: 1 }); for (const x of [-5.6, -2, 2, 5.6]) line(g, [x, -33.6, x * 0.9, -29.6], lt(hc, 0.22), 0.6); curve(g, p => { p.moveTo(-1.9, -35.3); p.quadraticCurveTo(0, -36, 1.9, -35.3); }, '#b87a6a', 1); }
  else if (bd === 'short') { path(g, p => { p.moveTo(-3.6, -34.8); p.quadraticCurveTo(0, -30.2, 3.6, -34.8); p.quadraticCurveTo(0, -33.2, -3.6, -34.8); p.closePath(); }, hc, INK, 0.8); for (const s of [-1, 1]) brow(g, s, 0.4, -37, 4.4, -35.4, 1.2, hc, -0.3); }
  else if (bd === 'mustache') { for (const s of [-1, 1]) brow(g, s, 0.3, -37, 4.8, -35.2, 1.4, hc, -0.4); }
  else if (bd === 'stubble') { g.globalAlpha = 0.34; for (const [x, y] of [[-5, -35.6], [-3.4, -34], [-1.6, -33.2], [0.2, -33], [2, -33.3], [3.8, -34.2], [5.2, -35.8], [-2.4, -36.9], [2.6, -36.9], [-4.2, -37], [4.4, -37.1]]) ell(g, x, y, 0.42, 0.42, hc); g.globalAlpha = 1; }
  else if (bd === 'goatee') { path(g, p => { p.moveTo(-1.6, -34.2); p.quadraticCurveTo(0, -27.6, 1.6, -34.2); p.closePath(); }, hc, INK, 0.7); for (const s of [-1, 1]) curve(g, p => { p.moveTo(s * 0.6, -37); p.quadraticCurveTo(s * 3.8, -36.8, s * 5.6, -33); }, hc, 1.1); }
  if (o.scar) { line(g, [5.2, -46, 6.8, -38.4], '#a8584a', 0.9); for (const y of [-44, -41.6]) line(g, [4.9 + (y + 46) * 0.2, y + 0.3, 6.9 + (y + 46) * 0.2, y - 0.4], '#a8584a', 0.7); }
}

// ───────── 모자 ─────────
const HATS = {
  // 전립: 무관의 벙거지
  jeonrip(g, o) {
    part(g, E(0, -49, 14.4, 4), '#2e2c35', E(5, -47.4, 12, 3.2), { hi: E(-6, -50.4, 5, 1) });
    part(g, p => { p.moveTo(-7.6, -49.6); p.bezierCurveTo(-7.6, -61, 7.6, -61, 7.6, -49.6); p.quadraticCurveTo(0, -47.4, -7.6, -49.6); p.closePath(); }, '#38363f', P(2.4, -62, 9, -62, 9, -47, 3.6, -47), { hi: E(-3.6, -56.4, 1.5, 3.2) });
    curve(g, p => { p.moveTo(-7.5, -51.3); p.quadraticCurveTo(0, -49.1, 7.5, -51.3); }, OCHRE, 1.6);
    if (o.plain) return;
    path(g, p => { p.moveTo(0.6, -60.4); p.quadraticCurveTo(9.6, -63.6, 12.6, -55.6); p.quadraticCurveTo(8.6, -58.4, 1.6, -58.2); p.closePath(); }, RED, INK, 0.8); line(g, [3.6, -59.6, 9.6, -58.4], '#7a1f1c', 0.6);
    ell(g, 0, -60.6, 2.2, 2.2, OCHRE, INK, 0.9); ell(g, -0.6, -61.2, 0.7, 0.7, '#fff3c0');
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) ell(g, s * (9.9 - i * 0.6), -45.2 + i * 2.5, 0.95, 0.95, i % 2 ? '#3f8a6a' : OCHRE, INK, 0.4);
  },
  // 패랭이: 대나무로 엮은 갓
  paeraeng(g) {
    part(g, E(0, -48.8, 13.6, 3.9), '#d9b77a', E(5, -47.2, 11, 3), { hi: E(-6, -50.2, 5, 1) });
    for (const x of [-10, -6, -2, 2, 6, 10]) line(g, [x * 0.62, -50.2, x * 1.16, -46.4], '#a8884a', 0.7);
    part(g, p => { p.moveTo(-6.6, -49.4); p.bezierCurveTo(-6.6, -58.6, 6.6, -58.6, 6.6, -49.4); p.quadraticCurveTo(0, -47.4, -6.6, -49.4); p.closePath(); }, '#e6cc94', P(2, -60, 8, -60, 8, -47, 3, -47));
    for (const x of [-3.4, 0, 3.4]) curve(g, p => { p.moveTo(x, -56.6); p.quadraticCurveTo(x * 1.3, -53, x * 1.5, -49.4); }, '#b8944f', 0.6);
    curve(g, p => { p.moveTo(-6.5, -51); p.quadraticCurveTo(0, -48.9, 6.5, -51); }, BLACK, 1.4);
    for (const s of [-1, 1]) line(g, [s * 8.6, -46.6, s * 6.2, -37.6], BLACK, 0.8);
  },
  // 갓: 비치는 검은 말총 갓
  gat(g) {
    g.globalAlpha = 0.78; part(g, E(0, -48.6, 16.6, 4.4), '#1f1e25', E(6, -47, 13, 3.4)); g.globalAlpha = 1;
    // 양태(챙)의 말총 결: 가운데서 바깥으로 퍼지는 가는 줄과 둥근 테
    { g.save(); g.beginPath(); g.ellipse(0, -48.6, 16.6, 4.4, 0, 0, TAU); g.clip(); g.strokeStyle = 'rgba(170,170,190,0.38)'; g.lineWidth = 0.3; for (let a = 0; a < TAU; a += 0.21) { g.beginPath(); g.moveTo(Math.cos(a) * 5.4, -48.6 + Math.sin(a) * 1.4); g.lineTo(Math.cos(a) * 16.6, -48.6 + Math.sin(a) * 4.4); g.stroke(); } for (const k of [0.62, 0.86]) { g.beginPath(); g.ellipse(0, -48.6, 16.6 * k, 4.4 * k, 0, 0, TAU); g.stroke(); } g.restore(); }
    g.globalAlpha = 0.9;
    part(g, p => { p.moveTo(-5.6, -49.4); p.lineTo(-5, -61.6); p.quadraticCurveTo(0, -63, 5, -61.6); p.lineTo(5.6, -49.4); p.quadraticCurveTo(0, -47.6, -5.6, -49.4); p.closePath(); }, '#24232a', P(1.6, -64, 7, -64, 7, -47, 2.4, -47), { hi: R(-4, -60.6, 1.2, 10) }); g.globalAlpha = 1;
    for (const s of [-1, 1]) line(g, [s * 7.6, -46.4, s * 5.2, -35.6], INK, 0.9); ell(g, 0, -33.6, 1.2, 1.2, '#c9962e', INK, 0.5);
  },
  // 투구: 드림과 간주가 달린 장수의 투구
  tugu(g, o) {
    const m = o.metal || '#d9b24a', fl = o.flap || '#b8342a';
    for (const s of [-1, 1]) { part(g, p => { p.moveTo(s * 6.6, -48); p.lineTo(s * 11.6, -47); p.lineTo(s * 11.2, -35); p.lineTo(s * 7.6, -37); p.closePath(); }, fl, s > 0 ? R(9, -49, 4, 16) : null); for (const y of [-44.6, -41.4, -38.4]) ell(g, s * 9.6, y, 0.85, 0.85, OCHRE, INK, 0.35); }
    part(g, p => { p.moveTo(-9.2, -47.2); p.bezierCurveTo(-9.4, -60.4, 9.4, -60.4, 9.2, -47.2); p.quadraticCurveTo(0, -50, -9.2, -47.2); p.closePath(); }, m, P(3, -62, 11, -62, 11, -46, 4.4, -46), { hi: E(-4.4, -55, 1.8, 3.6) });
    line(g, [0, -59.6, 0, -49.2], dk(m, 0.35), 0.9); for (const s of [-1, 1]) curve(g, p => { p.moveTo(s * 5, -58); p.quadraticCurveTo(s * 6.6, -53, s * 6, -48.6); }, dk(m, 0.35), 0.7);
    // 쇠의 반짝임: 왼쪽에 하얀 빛줄, 오른쪽 가운데는 짙게
    g.save(); g.globalAlpha *= 0.32; path(g, p => { p.moveTo(3, -58.4); p.quadraticCurveTo(6.4, -54, 6, -48.4); p.lineTo(2.4, -49.2); p.quadraticCurveTo(3, -54, 1.4, -58.4); p.closePath(); }, dk(m, 0.6)); g.restore();
    path(g, p => { p.moveTo(-5.4, -57); p.quadraticCurveTo(-7.4, -53.4, -6.8, -49.6); p.quadraticCurveTo(-6, -53.4, -4.4, -56.4); p.closePath(); }, '#ffffff'); ell(g, -3.6, -58, 0.7, 0.7, '#ffffff');
    for (const x of [-7.4, -3.7, 3.7, 7.4]) { ell(g, x, -47.2 + Math.abs(x) * 0.08, 0.75, 0.75, '#f0d27a', INK, 0.3); ell(g, x - 0.25, -47.45 + Math.abs(x) * 0.08, 0.25, 0.25, '#ffffff'); }
    part(g, p => { p.moveTo(-9.6, -47); p.quadraticCurveTo(0, -50.2, 9.6, -47); p.lineTo(9, -44.8); p.quadraticCurveTo(0, -48, -9, -44.8); p.closePath(); }, '#8a5f1c', null); path(g, P(-1.6, -48.6, 0, -45.4, 1.6, -48.6), OCHRE, INK, 0.6);
    rr(g, -1.1, -66, 2.2, 6.6, 0.8, m, INK, 0.9); for (const s of [-1, 1]) curve(g, p => { p.moveTo(0, -64); p.quadraticCurveTo(s * 3.6, -64, s * 3.4, -67.6); }, INK, 1.8);
    path(g, p => { p.moveTo(0, -65.4); p.quadraticCurveTo(-8.4, -69, -7.2, -60.6); p.quadraticCurveTo(-2.6, -64.2, 0, -62); p.quadraticCurveTo(2.6, -64.2, 7.2, -60.6); p.quadraticCurveTo(8.4, -69, 0, -65.4); }, RED, INK, 0.9);
  },
  // 고깔
  gokkal(g) { // 무녀의 고깔: 낮고 둥근 종이 고깔에 오방색 띠를 두르고 종이꽃을 꽂았다
    part(g, p => { p.moveTo(-10.6, -47.4); p.quadraticCurveTo(-10.4, -58.6, 0, -60.4); p.quadraticCurveTo(10.4, -58.6, 10.6, -47.4); p.quadraticCurveTo(0, -50.6, -10.6, -47.4); p.closePath(); }, WHITE, P(0.6, -61, 11, -61, 11, -46, 2.6, -47), { k: 0.13 });
    for (const [c, dy] of [[RED, 0], ['#e0b23c', 2], ['#2f4d7e', 4]]) curve(g, p => { p.moveTo(-10.4, -47.6 - dy); p.quadraticCurveTo(0, -50.8 - dy, 10.4, -47.6 - dy); }, c, 1.5);
    for (const [x, y, c] of [[6.6, -55.6, RED], [3.4, -57.8, '#e0b23c'], [8.4, -52.6, '#d98aa0']]) { ell(g, x, y, 2.3, 2.3, c, INK, 0.6); ell(g, x, y, 0.7, 0.7, WHITE); }
    for (const s of [-1, 1]) { path(g, p => { p.moveTo(s * 9.4, -47.6); p.quadraticCurveTo(s * 13.6, -44, s * 11.6, -38.6); p.quadraticCurveTo(s * 9.6, -43, s * 8.2, -46.4); p.closePath(); }, WHITE, INK, 0.8); }
  },
  // 신내림 고깔: 높이 솟은 종이 고깔에 오방 띠를 겹겹이 두르고, 큰 종이꽃 다섯과 긴 술을 늘어뜨렸다
  gokkal2(g) {
    for (const [s, c] of [[-1, RED], [1, '#2f4d7e']]) { path(g, p => { p.moveTo(s * 9.8, -47.4); p.quadraticCurveTo(s * 15, -40, s * 12.6, -31); p.lineTo(s * 10.8, -31.4); p.quadraticCurveTo(s * 12, -40, s * 8.4, -46.4); p.closePath(); }, c, INK, 0.8); }
    part(g, p => { p.moveTo(-11.4, -47.2); p.quadraticCurveTo(-10.6, -63, 0, -69); p.quadraticCurveTo(10.6, -63, 11.4, -47.2); p.quadraticCurveTo(0, -50.8, -11.4, -47.2); p.closePath(); }, WHITE, P(0.6, -70, 12, -70, 12, -46, 2.6, -47), { k: 0.13, hi: P(-9.6, -50, -7, -58, -5.6, -57.6, -8, -49.6) });
    [[RED, 0], ['#e0b23c', 2], ['#3f6b5c', 4], ['#2f4d7e', 6]].forEach(([c, dy]) => curve(g, p => { p.moveTo(-11.2, -47.6 - dy); p.quadraticCurveTo(0, -51 - dy, 11.2, -47.6 - dy); }, c, 1.6));
    for (const [x, y, c, r] of [[0, -66.4, RED, 2.6], [5.6, -60.6, '#e0b23c', 2.7], [-5, -60, '#d98aa0', 2.5], [8, -55.4, RED, 2.4], [-7.4, -55, '#e0b23c', 2.3]]) {
      for (let i = 0; i < 5; i++) { const a = i / 5 * TAU - PI / 2; ell(g, x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, r * 0.58, r * 0.58, c, INK, 0.5); }
      ell(g, x, y, r * 0.42, r * 0.42, '#fff3c0', INK, 0.4);
    }
  },
  // 상투와 머리띠
  band(g, o) {
    const hair = o.hair || BLACK;
    part(g, E(0, -55.4, 3.4, 3.6), hair, E(1.6, -54.6, 2.6, 3), { hi: E(-1.2, -56.6, 1, 1.3) }); rr(g, -3.4, -53.4, 6.8, 1.8, 0.6, '#1e1d24', INK, 0.5); for (let x = -2.8; x < 3; x += 0.9) line(g, [x, -53.3, x + 0.4, -51.7], 'rgba(150,150,170,0.5)', 0.3);   // 상투 밑동을 조인 망건
    line(g, [-5.2, -56.6, 5, -55], INK, 2); line(g, [-5.2, -56.6, 5, -55], '#e2b85a', 1); ell(g, -5.2, -56.6, 0.9, 0.9, '#e2b85a', INK, 0.5);   // 상투를 꿰뚫은 금빛 동곳
    part(g, p => { p.moveTo(-9.2, -46.2); p.bezierCurveTo(-9.4, -55.4, 9.4, -55.4, 9.2, -46.2); p.quadraticCurveTo(0, -49.6, -9.2, -46.2); p.closePath(); }, hair, P(2.6, -56, 10, -56, 10, -45, 4, -45), { hi: E(-4, -52, 2.4, 1) });
    part(g, p => { p.moveTo(-9.3, -47.4); p.quadraticCurveTo(0, -50.9, 9.3, -47.4); p.lineTo(9.2, -44.9); p.quadraticCurveTo(0, -48.4, -9.2, -44.9); p.closePath(); }, o.bandCol || WHITE, P(3, -52, 10, -52, 10, -44, 4, -44), { lw: 0.9 });
    path(g, p => { p.moveTo(8.8, -46.4); p.quadraticCurveTo(13.6, -45.4, 12.6, -39.4); p.quadraticCurveTo(10.6, -43, 8.8, -44.4); p.closePath(); }, o.bandCol || WHITE, INK, 0.8);
  },
  // 정자관: 말총으로 엮은 두 층의 관. 층마다 앞면이 둥근 산봉우리 셋으로 솟는다 (선비·도사가 쓰던 관)
  yugeon(g) {
    const mesh = (fn, x0, x1, y0, y1) => { g.save(); g.beginPath(); fn(g); g.clip(); g.strokeStyle = 'rgba(150,150,170,0.42)'; g.lineWidth = 0.35; for (let x = x0; x <= x1; x += 1.1) { g.beginPath(); g.moveTo(x, y0); g.lineTo(x + 0.6, y1); g.stroke(); } g.restore(); };
    const upper = p => { p.moveTo(-6.4, -54.6); p.lineTo(-6.6, -60.2); p.quadraticCurveTo(-5, -62.6, -3.3, -60.6); p.quadraticCurveTo(-1.7, -64.6, 0, -64.7); p.quadraticCurveTo(1.7, -64.6, 3.3, -60.6); p.quadraticCurveTo(5, -62.6, 6.6, -60.2); p.lineTo(6.4, -54.6); p.closePath(); };
    part(g, upper, '#2a2930', P(1.6, -66, 8, -66, 8, -54, 2.6, -54), { hi: P(-5.8, -59.8, -4.4, -61, -4.8, -56, -5.8, -55.6), lw: 1 }); mesh(upper, -7, 7, -66, -54);
    const lower = p => { p.moveTo(-9.4, -46.8); p.lineTo(-9.6, -53.2); p.quadraticCurveTo(-7.4, -56, -5.1, -53.8); p.quadraticCurveTo(-2.6, -58, 0, -58.2); p.quadraticCurveTo(2.6, -58, 5.1, -53.8); p.quadraticCurveTo(7.4, -56, 9.6, -53.2); p.lineTo(9.4, -46.8); p.quadraticCurveTo(0, -49.9, -9.4, -46.8); p.closePath(); };
    part(g, lower, '#24232a', P(1.6, -60, 11, -60, 11, -45, 3, -45), { hi: P(-8.8, -52.4, -6.8, -54, -7.2, -49, -8.8, -48.6), lw: 1.1 }); mesh(lower, -10, 10, -59, -46);
    for (const s of [-1, 1]) curve(g, p => { p.moveTo(s * 5.1, -53.8); p.quadraticCurveTo(s * 5.6, -50.6, s * 5.4, -48.2); }, '#55535f', 0.6);
    curve(g, p => { p.moveTo(-9.4, -48.7); p.quadraticCurveTo(0, -51.9, 9.4, -48.7); }, '#5a5866', 1.1);
    for (const s of [-1, 1]) line(g, [s * 7.6, -45.6, s * 6, -38], INK, 0.8);
  },
  // 삭발
  bald(g) { g.globalAlpha = 0.55; ell(g, -3.2, -49, 3.2, 1.6, '#fffaf0', null, 0, -0.4); g.globalAlpha = 1; for (const [x, y] of [[-1.3, -51.6], [1.3, -51.6], [0, -50.2]]) ell(g, x, y, 0.55, 0.55, '#b8584a'); },
  // 신선: 흰 머리를 틀어 올리고 금비녀를 꽂았다
  sage(g) {
    part(g, E(0, -56.6, 4, 3.8), WHITE, E(1.8, -55.8, 3, 3), { k: 0.12 }); line(g, [-6, -56.8, 6, -56.4], OCHRE, 1.8); ell(g, 6.4, -56.4, 1.3, 1.3, '#3f8a6a', INK, 0.5);
    part(g, p => { p.moveTo(-9.2, -45.8); p.bezierCurveTo(-9.4, -55.6, 9.4, -55.6, 9.2, -45.8); p.quadraticCurveTo(5, -50.4, 0, -48.4); p.quadraticCurveTo(-5, -50.4, -9.2, -45.8); p.closePath(); }, WHITE, P(2.6, -56, 10, -56, 10, -45, 4, -46), { k: 0.12 });
    for (const s of [-1, 1]) path(g, p => { p.moveTo(s * 8.6, -46.4); p.quadraticCurveTo(s * 11.6, -40, s * 9.4, -33); p.quadraticCurveTo(s * 8, -39, s * 7.6, -44); p.closePath(); }, WHITE, INK, 0.8);
  },
  // 삿갓: 대오리로 엮어 얼굴에 그늘을 드리운다
  satgat(g) {
    g.globalAlpha = 0.2; path(g, P(-8.7, -47.4, 8.7, -47.4, 8.8, -42.8, -8.8, -42.8), '#1e1830'); g.globalAlpha = 1;
    for (const s of [-1, 1]) line(g, [s * 9.8, -47, s * 6.4, -37.2], '#2b2a30', 0.8);
    part(g, p => { p.moveTo(-17.8, -48.4); p.quadraticCurveTo(-9, -57, 0, -63.8); p.quadraticCurveTo(9, -57, 17.8, -48.4); p.quadraticCurveTo(0, -44.6, -17.8, -48.4); p.closePath(); }, '#d9b77a', P(1.6, -65, 19, -65, 19, -45, 5, -46.4), { k: 0.2, hi: P(-14.4, -50.2, -2.4, -62, -1, -61, -9.4, -51.2), hk: 0.22, lw: 1.3 });
    for (const x of [-12.6, -7.4, -2.6, 2.6, 7.4, 12.6]) line(g, [x * 0.08, -62.6, x * 1.12, -47.6 + Math.abs(x) * 0.06], '#a8884a', 0.6);
    curve(g, p => { p.moveTo(-11.4, -53.4); p.quadraticCurveTo(0, -50.2, 11.4, -53.4); }, '#a8884a', 0.6); curve(g, p => { p.moveTo(-5.8, -58.4); p.quadraticCurveTo(0, -56.6, 5.8, -58.4); }, '#a8884a', 0.6);
    ell(g, 0, -63.4, 1.5, 1.3, '#8a6a3c', INK, 0.7);
  },
  // 털벙거지: 사냥꾼의 털모자와 꿩 깃
  fur(g) {
    curve(g, p => { p.moveTo(5, -57); p.quadraticCurveTo(12, -64, 15.4, -71); }, INK, 2.6); curve(g, p => { p.moveTo(5, -57); p.quadraticCurveTo(12, -64, 15.4, -71); }, '#b8742a', 1.3); for (const k of [0.3, 0.55, 0.8]) line(g, [5 + k * 9.4, -57 - k * 12.6, 7.4 + k * 9.4, -57.4 - k * 12.6], '#2b2a30', 0.7);
    for (const s of [-1, 1]) part(g, P(s * 8.4, -47.4, s * 12.2, -46.4, s * 11.6, -37.6, s * 8.4, -39.6), '#6b4a3a', s > 0 ? R(10, -48, 3, 12) : null, { lw: 1 });
    part(g, p => { p.moveTo(-9.4, -47.6); p.bezierCurveTo(-9.8, -60.8, 9.8, -60.8, 9.4, -47.6); p.quadraticCurveTo(0, -50.4, -9.4, -47.6); p.closePath(); }, '#6b4a3a', P(3, -62, 11, -62, 11, -46, 4.4, -46), { hi: E(-4.4, -55.6, 1.8, 3.2) });
    for (let i = -3; i <= 3; i++) { const x = i * 3.1, y = -46.4 - (1 - i * i / 9) * 2.6; part(g, E(x, y, 2.4, 2.1), '#e3d3b0', E(x + 0.7, y + 0.8, 2, 1.6), { k: 0.16, lw: 0.8 }); }
  },
  // 상모: 전립 꼭대기에 흰 부포를 달고 종이꽃을 꽂았다
  sangmo(g) {
    // 길게 나부끼는 흰 상모 끈 (머리 뒤로 휘돌아 나간다)
    { const rb = p => { p.moveTo(-1.6, -68.6); p.bezierCurveTo(-6.6, -74.4, -11.6, -63.4, -16.4, -67.4); p.quadraticCurveTo(-19.4, -70.4, -22.6, -66.2); }; curve(g, rb, INK, 3.2); curve(g, rb, '#fbf7ec', 1.9); curve(g, p => { p.moveTo(-2.4, -69.2); p.bezierCurveTo(-6.8, -73.6, -11.4, -64.2, -16, -68.2); }, 'rgba(200,190,170,0.8)', 0.5); }
    HATS.jeonrip(g, { plain: true });
    line(g, [0, -60.4, 0, -65], INK, 2.2); line(g, [0, -60.4, 0, -65], OCHRE, 1);
    for (const [x, y, r] of [[-3.2, -66.6, 2.9], [3.2, -66.6, 2.9], [-1.7, -64.6, 2.2], [1.9, -64.6, 2.2], [0, -69.4, 3.1]]) part(g, E(x, y, r, r), WHITE, E(x + 0.9, y + 0.9, r * 0.8, r * 0.8), { k: 0.12, lw: 0.8 });
    for (const [x, c] of [[-6.4, RED], [6.4, INDIGO]]) { for (let i = 0; i < 5; i++) { const a = i / 5 * PI * 2; ell(g, x + Math.cos(a) * 1.5, -53.4 + Math.sin(a) * 1.5, 1.3, 1.3, c, INK, 0.4); } ell(g, x, -53.4, 0.9, 0.9, OCHRE); }
    for (const s of [-1, 1]) line(g, [s * 8.8, -46.6, s * 7, -38.4], INK, 0.7);
  },
  // 봉두난발: 뻗친 머리에 범 가죽 띠
  wild(g, o) {
    const hair = o.hair || BLACK;
    part(g, E(0, -57, 3.6, 3.8), hair, E(1.6, -56.2, 2.8, 3));
    part(g, p => { p.moveTo(-9.4, -45.2); p.lineTo(-13.4, -46.4); p.lineTo(-10.8, -49.6); p.lineTo(-13.6, -53); p.lineTo(-9.4, -53.4); p.lineTo(-9.6, -57.4); p.lineTo(-5.4, -55.4); p.lineTo(-3, -58.4); p.lineTo(0, -55.6); p.lineTo(3, -58.4); p.lineTo(5.4, -55.4); p.lineTo(9.6, -57.4); p.lineTo(9.4, -53.4); p.lineTo(13.6, -53); p.lineTo(10.8, -49.6); p.lineTo(13.4, -46.4); p.lineTo(9.4, -45.2); p.quadraticCurveTo(0, -49.4, -9.4, -45.2); p.closePath(); }, hair, P(2.6, -59, 14, -59, 14, -44, 4, -45), { hi: P(-8, -54, -5, -53.4, -6.6, -49.6, -8.6, -49.6) });
    const band = p => { p.moveTo(-9.3, -47.6); p.quadraticCurveTo(0, -51.1, 9.3, -47.6); p.lineTo(9.2, -44.7); p.quadraticCurveTo(0, -48.2, -9.2, -44.7); p.closePath(); };
    g.beginPath(); band(g); g.fillStyle = '#d9963f'; g.fill(); g.save(); g.clip(); for (const x of [-6.6, -3, 0.6, 4.2, 7.6]) path(g, P(x - 0.9, -51, x + 0.9, -51, x + 0.2, -44), '#2b2a30'); g.restore(); g.beginPath(); band(g); st(g, INK, 0.9);
  },
  // 족두리 대신: 쪽진 머리에 비녀 (무녀의 고깔 안쪽)
  none() {},
};

// 말 탄 아랫도리: 안장 위로 퍼진 자락, 등자에 건 다리 (인형의 허리가 안장에 얹힌다)
function riding(g, o) {
  const robe = o.robe, leg = o.legs || dk(robe, 0.3);
  part(g, p => { p.moveTo(-9.8, -21.6); p.lineTo(9.8, -21.6); p.quadraticCurveTo(12.6, -17.6, 11.4, -14.6); p.quadraticCurveTo(5, -12.4, -2, -14); p.quadraticCurveTo(-8, -9.6, -15.6, -10.6); p.quadraticCurveTo(-14, -17.4, -9.8, -21.6); p.closePath(); }, robe, P(3, -22, 13, -22, 13, -9, 6, -9), { hi: P(-8.6, -21, -6.8, -21, -12, -12, -14, -12), hk: 0.16 });
  for (const [a, b, c] of [[-5, -9.4, -11.6], [-1, -3, -13.4]]) line(g, [a, -20.4, b, c], dk(robe, 0.34), 0.8);
  if (o.hem) curve(g, p => { p.moveTo(-15, -11.5); p.quadraticCurveTo(-8, -10.6, -2.4, -14.8); }, o.hem, 1.5);
  // 허벅지 → 무릎 → 정강이
  part(g, p => { p.moveTo(-2.4, -20); p.quadraticCurveTo(4.4, -22.4, 9.6, -16.6); p.quadraticCurveTo(12.6, -13, 10.2, -10.2); p.lineTo(9, -3.4); p.lineTo(4, -3.4); p.lineTo(4.6, -10.4); p.quadraticCurveTo(0.6, -13, -3.4, -14.2); p.closePath(); }, leg, p => { p.moveTo(-4, -15.8); p.quadraticCurveTo(2, -14.8, 6.2, -11.6); p.lineTo(6, -3); p.lineTo(3, -3); p.lineTo(3.6, -10); p.lineTo(-4, -13.6); p.closePath(); }, { lw: 1.1 });
  curve(g, p => { p.moveTo(6.6, -15.4); p.quadraticCurveTo(8.8, -13.4, 8, -11); }, dk(leg, 0.36), 0.8);
  // 행전과 신, 등자
  part(g, P(3.8, -8, 9.4, -8, 9, -3.4, 4, -3.4), o.cuff || WHITE, P(6.6, -8.4, 9.8, -8.4, 9.4, -3, 6.6, -3), { k: 0.14, lw: 0.9 });
  part(g, p => { p.moveTo(3.4, -4); p.lineTo(9.2, -4); p.quadraticCurveTo(13.6, -2.6, 13, 0.6); p.lineTo(3.6, 0.8); p.closePath(); }, o.shoe || '#2e2a33', R(2, -1, 13, 3), { hi: E(9, -2.6, 1.8, 0.7) });
  line(g, [4.4, 1.5, 12.6, 1.5], INK, 2.8); line(g, [4.4, 1.5, 12.6, 1.5], '#c9962e', 1.4);
}

// ───────── 사람 인형 ─────────
// sel: 'body' 몸만 / 'head' 머리만 / 없으면 한 장에 모두
export function doll(g, o, sel) {
  const body = sel !== 'head', head = sel !== 'body';
  const skin = o.skin || SKIN, robe = o.robe, top = o.top || robe, sl = o.sleeve || top, long = !o.legs, hem = long ? -2.2 : -9.6, fl = long ? 15 : 13.4;
  if (o.ghost) g.globalAlpha = 0.92;
  if (body) {
    if (o.back) o.back(g);
    if (o.riding) riding(g, o); else {
    // 다리와 신
    if (!long) for (const s of [-1, 1]) { const lgP = p => { p.moveTo(s * 0.6, -12); p.quadraticCurveTo(s * 10.6, -12.4, s * 9.2, -4.4); p.lineTo(s * 2.4, -4); p.closePath(); }; part(g, lgP, o.legs, s > 0 ? R(5.6, -13, 6, 10) : R(-4, -13, 3.2, 10), { lw: 1.1 }); shade(g, lgP, s * 1, -12, s * 10, -4, 0.16, 0.22); fold(g, s * 3.6, -11, s * 5.2, -5.2, dk(o.legs, 0.3), 0.8); }
    if (!o.tatter) for (const s of [-1, 1]) { part(g, p => { p.moveTo(s * 1.6, -5); p.lineTo(s * 9.2, -5.2); p.quadraticCurveTo(s * 11.2, -1.4, s * 10.2, 1.2); p.lineTo(s * 1.8, 1.2); p.closePath(); }, o.shoe || '#2e2a33', R(-12, -1.2, 24, 3), { hi: s < 0 ? E(-7.4, -3.4, 1.6, 0.8) : null }); line(g, [s * 2.2, 1.3, s * 10, 1.3], '#e9dec4', 0.9); }
    // 아랫자락
    const skirtP = p => {
      p.moveTo(-9.8, -21.6); p.lineTo(9.8, -21.6); p.quadraticCurveTo(fl - 1.4, (hem - 21.6) / 2 - 2, fl, hem);
      if (o.tatter) { for (let i = 1; i < 8; i++) p.lineTo(fl - fl * 2 * i / 8, hem + (i % 2 ? 3.4 : -1.6)); p.lineTo(-fl, hem); } else p.quadraticCurveTo(0, hem + 4, -fl, hem);
      p.quadraticCurveTo(-fl + 1.4, (hem - 21.6) / 2 - 2, -9.8, -21.6); p.closePath();
    };
    part(g, skirtP, robe, P(4, -22, 18, -22, 18, 5, 8.6, 5), { hi: P(-8.4, -21, -6.4, -21, -10.6, hem + 1, -13.4, hem) , hk: 0.16 });
    shade(g, skirtP, -fl, -22, fl, hem + 2, 0.18, 0.26);
    { g.save(); g.beginPath(); skirtP(g); g.clip(); const gr = g.createLinearGradient(0, -21.6, 0, -15.4); gr.addColorStop(0, 'rgba(30,24,48,0.34)'); gr.addColorStop(1, 'rgba(30,24,48,0)'); g.fillStyle = gr; g.fillRect(-20, -22, 40, 7); g.restore(); }
    // 붓으로 그은 주름: 허리에서 아래로 퍼지며, 가운데가 굵고 끝이 가늘다
    const pc = dk(robe, 0.36), ph = lt(robe, 0.35); for (const [a, b, w] of [[-5.2, -9, 1.2], [-1.2, -2.4, 1], [3, 5, 1.2], [6.6, 10.4, 1.3]]) fold(g, a, -20.2, b * fl / 15, hem + 2.4, pc, w, ph);
    heavy(g, skirtP, 1.9);
    if (o.hem && !o.tatter) { path(g, p => { p.moveTo(-fl, hem); p.quadraticCurveTo(0, hem + 4, fl, hem); p.lineTo(fl - 0.9, hem - 2.7); p.quadraticCurveTo(0, hem + 1.2, -fl + 0.9, hem - 2.7); p.closePath(); }, o.hem, INK, 0.8);
      // 단에 찍은 금박 마름모 (가운데가 처진 단의 곡선을 따라)
      // 단의 번개무늬: 단의 곡선을 따라 꺾여 나가는 밝은 선과 금점
      { const yy = x => { const t = x / fl; return hem - 1.1 + 2 * (1 - t * t); }; g.beginPath(); for (let x = -fl + 1.6, i = 0; x < fl - 1.4; x += 1.6, i++) { const y = yy(x) + (i % 2 ? -0.7 : 0.7); i ? g.lineTo(x, y) : g.moveTo(x, y); } st(g, lt(o.hem, 0.6), 0.6); for (let x = -fl + 3.2; x < fl - 2; x += 4.8) ell(g, x, yy(x), 0.55, 0.55, '#e8c45a'); } }
    if (o.crane) { const cx = -4.6, cy = hem - 9.6; path(g, p => { p.moveTo(cx - 5.4, cy - 1.2); p.quadraticCurveTo(cx - 2.6, cy - 3.8, cx, cy - 0.6); p.quadraticCurveTo(cx + 2.6, cy - 3.8, cx + 5.4, cy - 1.2); p.quadraticCurveTo(cx + 2.4, cy - 0.2, cx, cy + 0.8); p.quadraticCurveTo(cx - 2.4, cy - 0.2, cx - 5.4, cy - 1.2); p.closePath(); }, '#fbf7ec', INK, 0.6); for (const sg of [-1, 1]) line(g, [cx + sg * 5.2, cy - 1.2, cx + sg * 3.6, cy - 0.4], '#2b2a30', 1); curve(g, p => { p.moveTo(cx, cy - 0.6); p.quadraticCurveTo(cx + 1.6, cy - 3, cx + 3.2, cy - 3.6); }, '#2b2a30', 0.9); ell(g, cx + 3.4, cy - 3.7, 0.55, 0.45, '#c8402f'); line(g, [cx - 0.4, cy + 0.6, cx - 1.8, cy + 2.6], '#2b2a30', 0.6); }
    if (o.dots) for (const [x, y] of [[-7, -12], [6.4, -8], [-2, -6], [9.6, -15], [-10.4, -6], [2.6, -15]]) ell(g, x * fl / 15, y, 0.9, 0.9, o.dots);
    }
    // 팔
    for (const s of [-1, 1]) {
      if (o.bare) {
        const armP = p => { p.moveTo(s * 7.4, -31.6); p.quadraticCurveTo(s * 16, -33, s * 18.2, -26); p.quadraticCurveTo(s * 20, -21.6, s * 18.2, -17.6); p.lineTo(s * 12.4, -17.2); p.quadraticCurveTo(s * 12.8, -22.4, s * 8.6, -25); p.closePath(); };
        part(g, armP, skin, s > 0 ? R(16.4, -34, 5, 18) : E(-11, -21.6, 2.6, 5)); shade(g, armP, s * 7, -33, s * 19, -17, 0.24, 0.26); if (s > 0) heavy(g, armP, 1.8);
        curve(g, p => p.arc(s * 13.6, -27.6, 2.8, s > 0 ? 0.5 : PI - 2.4, s > 0 ? 2.4 : PI - 0.5), dk(skin, 0.34), 0.9);
        rr(g, s * 15.3 - 3.6, -21.6, 7.2, 2.6, 0.8, o.wrist || '#7a4a2c', INK, 0.8);
      } else {
        const slP = p => { p.moveTo(s * 7.2, -31.8); p.quadraticCurveTo(s * 16.8, -31.8, s * 18.8, -24.6); p.lineTo(s * 19, -19.6); p.lineTo(s * 12.2, -17); p.quadraticCurveTo(s * 11.6, -23, s * 8.2, -25.4); p.closePath(); };
        part(g, slP, sl, s > 0 ? P(15, -33, 21, -33, 21, -15, 15.8, -16.6) : E(-10.6, -21, 2.8, 5), { hi: s < 0 ? P(-9, -31.4, -12.6, -31, -17, -27, -16, -25.6) : null, hk: 0.18 });
        shade(g, slP, s > 0 ? 8 : -19, -32, s > 0 ? 19 : -8, -17, 0.2, 0.26);
        // 팔꿈치 안쪽의 주름 두 획 (붓 주름)
        fold(g, s * 10.4, -29.6, s * 13.2, -22.6, dk(sl, 0.34), 1.1); fold(g, s * 14.6, -30.4, s * 16.4, -25, dk(sl, 0.28), 0.8);
        if (s > 0) heavy(g, slP, 1.8);
        if (o.stripes) o.stripes.forEach((c, i) => line(g, [s * (13 + i * 1.7), -30.4 + i * 2.6, s * (12.7 + i * 1.9), -22.4 + i * 0.6], c, 1.9));
        path(g, P(s * 18.9, -22.5, s * 19, -19.6, s * 12.2, -17, s * 12, -19.9), o.cuff || WHITE, INK, 0.8);
        if (o.bracer) { part(g, P(s * 18.4, -26.6, s * 18.9, -22.4, s * 12, -19.8, s * 11.4, -23.6), o.bracer, s > 0 ? P(15, -27, 20, -27, 20, -21, 15, -21) : null, { hi: s < 0 ? P(-12, -23.4, -17.6, -26, -17.8, -25, -12.2, -22.6) : null, lw: 0.9 }); for (const k of [0.3, 0.7]) ell(g, s * (12 + 6.4 * k), -23.4 - 2.8 * k + 1.3, 0.6, 0.6, '#e2b85a', INK, 0.3); }
      }
    }
    // 목
    path(g, p => { p.moveTo(-3.2, -35.4); p.lineTo(3.2, -35.4); p.lineTo(3.8, -31.2); p.quadraticCurveTo(0, -29.4, -3.8, -31.2); p.closePath(); }, dk(skin, 0.16), INK, 0.9);
    // 몸통
    const chest = o.bareChest ? skin : top, torP = p => { p.moveTo(-8.4, -31.9); p.quadraticCurveTo(-4, -32.8, -3.4, -31.6); p.quadraticCurveTo(0, -29.6, 3.4, -31.6); p.quadraticCurveTo(4, -32.8, 8.4, -31.9); p.lineTo(10.2, -20.4); p.lineTo(-10.2, -20.4); p.closePath(); };
    part(g, torP, chest, P(4.4, -34, 12, -34, 12, -19, 5.6, -19)); shade(g, torP, -10, -33, 10, -20, 0.2, 0.24); heavy(g, torP, 1.8);
    if (o.bareChest) { curve(g, p => { p.moveTo(-6.4, -27.4); p.quadraticCurveTo(-3, -25.4, 0, -27); p.quadraticCurveTo(3, -25.4, 6.4, -27.4); }, dk(skin, 0.36), 0.9); line(g, [0, -27, 0, -22], dk(skin, 0.3), 0.7); path(g, P(-8.6, -31.8, -5.6, -32, 6.6, -20.6, 3.6, -20.6), o.strap || '#7a4a2c', INK, 0.8); }
    else {
      if (o.vest) for (const s of [-1, 1]) { part(g, P(s * 8.4, -31.9, s * 3.4, -31.4, s * 4.8, -20.4, s * 10.2, -20.4), o.vest, s > 0 ? R(7, -33, 5, 14) : null, { lw: 0.9 }); g.save(); g.setLineDash([0.9, 0.8]); line(g, [s * 4.2, -30.6, s * 5.5, -21.3], lt(o.vest, 0.55), 0.5); g.restore(); }
      // 깃과 동정
      const git = o.git || dk(top, 0.32);
      path(g, P(5.8, -32.3, 2.8, -32, -3.6, -22.4, -1, -21.2), git, INK, 0.7);
      path(g, P(-5.8, -32.3, -2.8, -32, 4, -22.8, 1.5, -21.4), git, INK, 0.7); line(g, [-4.5, -31.9, 2.4, -22.6], o.collar || WHITE, 1.3);
      if (o.goreum) { path(g, P(2.2, -24, 5.6, -24.6, 4.6, -15, 2.6, -15.6), o.goreum, INK, 0.7); path(g, P(2, -24, -0.6, -22.6, -0.4, -17.6, 1.6, -18), o.goreum, INK, 0.7); ell(g, 2.2, -24, 1.3, 1.1, o.goreum, INK, 0.6); }
      if (o.kasaya) { const kp = p => { p.moveTo(-9, -31.6); p.lineTo(-2.6, -32.6); p.lineTo(10.8, -20.4); p.lineTo(2.4, -20.4); p.closePath(); }; part(g, kp, o.kasaya, P(2, -26, 11, -19, 11, -22), { lw: 0.9 });
        // 조각보처럼 이어 붙인 가사의 격자: 띠를 따라 가로지르는 줄과 세로 줄
        g.save(); g.beginPath(); kp(g); g.clip(); for (let k = 0.12; k < 1; k += 0.17) { const x = -9 + 19.6 * k, y = -32 + 11.6 * k; line(g, [x - 3.2, y + 3, x + 3.6, y - 3.2], dk(o.kasaya, 0.42), 0.6); } for (const d of [-1.6, 1.6]) line(g, [-9 + d, -31.8, 10.8 + d, -20.4], lt(o.kasaya, 0.25), 0.5); g.restore(); shade(g, kp, -9, -32, 11, -20, 0.2, 0.26);
        curve(g, p => p.arc(-5.2, -30.2, 1.8, 0, TAU), INK, 2.2); curve(g, p => p.arc(-5.2, -30.2, 1.8, 0, TAU), '#e8c45a', 1.1); ell(g, -5.8, -30.8, 0.4, 0.4, '#ffffff'); }   // 가사를 거는 금빛 고리
      if (o.pelt) for (const s of [-1, 1]) for (const y of [-29.4, -26.4, -23.4]) path(g, P(s * 9.6, y, s * 5.8, y + 1.5, s * 9.8, y + 1.9), '#2b2a30');
      if (o.cross) o.cross.forEach((c, i) => { const s = i ? -1 : 1; path(g, P(s * -8.4, -31.8, s * -5.2, -32.2, s * 9.6, -21, s * 6.2, -20.6), c, INK, 0.7); });
      if (o.fur) { const fp = p => { p.moveTo(-12.6, -29.6); p.quadraticCurveTo(-11, -34.4, -4.6, -33.4); p.quadraticCurveTo(0, -31.6, 4.6, -33.4); p.quadraticCurveTo(11, -34.4, 12.6, -29.6); for (let k = 0; k <= 10; k++) { const x = 12.6 - k * 2.52, y = -27.4 + Math.sin(k * 1.7) * 0.9 + (k % 2 ? 1.6 : 0); p.lineTo(x, y); } p.closePath(); };
        part(g, fp, '#d9c9a8', P(3, -34, 14, -34, 14, -24, 3, -24), { lw: 1.1 });
        // 붓으로 그은 털결: 목에서 바깥으로 뻗는 짧은 획 (밝은 결과 짙은 결)
        g.save(); g.beginPath(); fp(g); g.clip(); for (let k = 0; k < 26; k++) { const t = k / 25, x = -12 + 24 * t, y0 = -32.4 + Math.abs(x) * 0.12, a = (x / 12) * 0.6; line(g, [x, y0, x + Math.sin(a) * 4.2, y0 + 4.6], k % 3 ? 'rgba(122,98,64,0.75)' : 'rgba(255,248,226,0.8)', k % 3 ? 0.7 : 0.6); } g.restore(); shade(g, fp, -12, -34, 12, -25, 0.2, 0.26); }
      if (o.studs) for (const [x, y] of [[-6.4, -27.6], [-6.8, -23.6], [6.4, -27.6], [6.8, -23.6], [-3.4, -25.4], [3.6, -25.4]]) { ell(g, x, y, 1.05, 1.05, '#d9a83a', INK, 0.4); ell(g, x - 0.3, y - 0.3, 0.35, 0.35, '#fff6d0'); }
      if (o.pauldron) for (const s of [-1, 1]) { part(g, p => { p.moveTo(s * 5.6, -32.6); p.quadraticCurveTo(s * 13, -35.6, s * 16.4, -29.4); p.quadraticCurveTo(s * 12, -29.6, s * 7, -27.6); p.closePath(); }, o.pauldron, s > 0 ? R(12, -36, 5, 9) : null, { hi: s < 0 ? E(-10, -32, 2.6, 1) : null }); ell(g, s * 10.6, -31, 0.9, 0.9, OCHRE, INK, 0.35); }
    }
    if (o.beads) { for (let i = -4; i <= 4; i++) { const x = i * 1.75, y = -30.4 + (16 - i * i) * 0.36; ell(g, x, y, 1.35, 1.35, i % 2 ? '#6a3a22' : '#9a6a3c', INK, 0.5); ell(g, x - 0.4, y - 0.4, 0.4, 0.4, 'rgba(255,240,210,0.8)'); }
      ell(g, 0, -23.4, 1.6, 1.6, '#e8c45a', INK, 0.5); path(g, P(-1.2, -22.2, 1.2, -22.2, 1.8, -17.8, -1.8, -17.8), '#b8322a', INK, 0.6); for (const x of [-0.9, 0, 0.9]) line(g, [x, -21.6, x * 1.3, -18.2], '#7a1f1c', 0.4); }   // 염주 끝의 금 알과 붉은 술
    // 쾌자: 소매 없는 긴 겉옷. 앞이 트여 속옷이 보이고, 안감(붉은 단)이 가장자리로 드러난다 (검객)
    if (o.kwaeja) for (const s of [-1, 1]) { const kp = P(s * 9, -32.4, s * 3.8, -31.8, s * 2.4, -20.4, s * 4, hem + 1.4, s * (fl + 0.9), hem + 0.8, s * (fl - 0.4), (hem - 21.6) / 2 - 2, s * 10.6, -20.4);
      part(g, kp, o.kwaeja, s > 0 ? P(6, -33, 20, -33, 20, hem + 2, 7, hem + 2) : null, { lw: 1.1 }); shade(g, kp, s * 3, -32, s * (fl + 1), hem, 0.22, 0.3); if (s > 0) heavy(g, kp, 1.8);
      line(g, [s * 3.8, -31.8, s * 2.4, -20.4], o.kwaejaLine || RED, 1.2); line(g, [s * 2.4, -20.4, s * 4, hem + 1.4], o.kwaejaLine || RED, 1.2); fold(g, s * 7, -18, s * 9.6, hem, dk(o.kwaeja, 0.4), 1.2, lt(o.kwaeja, 0.3)); }
    if (o.strap) { const sp = P(-8.4, -32.2, -5.6, -32.9, 10.6, -21.4, 8.2, -20.4); part(g, sp, '#5a3a26', P(0, -28, 12, -21, 12, -19, 0, -26), { lw: 0.8 }); g.save(); g.setLineDash([0.8, 0.8]); line(g, [-6.9, -32.3, 9.4, -21.2], lt('#5a3a26', 0.5), 0.45); g.restore(); rr(g, 6.4, -24.6, 2.4, 2.2, 0.4, '#d9a83a', INK, 0.5); ell(g, 7, -24, 0.35, 0.35, '#ffffff'); }   // 동개를 멘 가죽끈과 놋쇠 고리
    // 흉배: 가슴에 단 네모난 수놓은 판 — 쪽빛 바탕에 범 얼굴과 구름, 금실 테와 놋쇠 징 (장군)
    if (o.breast) { const bx = -5, by = -28.9, bw = 10, bh = 6.4;
      rr(g, bx - 0.5, by - 0.5, bw + 1, bh + 1, 0.8, '#e2b85a', INK, 0.8); rr(g, bx + 0.6, by + 0.6, bw - 1.2, bh - 1.2, 0.5, '#22385c');
      for (const [x, y] of [[bx + 1.9, by + 1.8], [bx + bw - 1.9, by + 1.8], [bx + 1.9, by + bh - 1.8], [bx + bw - 1.9, by + bh - 1.8]]) { curve(g, p => { p.moveTo(x - 1, y + 0.3); p.quadraticCurveTo(x - 0.4, y - 1.1, x + 0.5, y - 0.2); p.quadraticCurveTo(x + 1.2, y + 0.6, x + 0.3, y + 0.8); }, '#dfe8ee', 0.5); }
      const cx = bx + bw / 2, cy = by + bh / 2 + 0.3; ell(g, cx, cy, 2.3, 2, '#e0a040', INK, 0.5); for (const sg of [-1, 1]) { line(g, [cx + sg * 0.9, cy - 2, cx + sg * 0.6, cy - 1], INK, 0.45); line(g, [cx + sg * 2.4, cy - 0.4, cx + sg * 1.5, cy], INK, 0.45); ell(g, cx + sg * 0.9, cy - 0.4, 0.45, 0.35, '#fff3c0'); ell(g, cx + sg * 1.6, cy - 2.2, 0.6, 0.6, '#e0a040', INK, 0.35); } ell(g, cx, cy + 0.8, 0.5, 0.35, INK);
      for (const [x, y] of [[bx, by], [bx + bw, by], [bx, by + bh], [bx + bw, by + bh]]) { ell(g, x, y, 0.75, 0.75, '#d9a83a', INK, 0.35); ell(g, x - 0.2, y - 0.2, 0.25, 0.25, '#ffffff'); } }
    // 승급한 병사의 갑옷과 계급 표식 (sprites.js 의 br_* 모습). 어깨 갑옷은 갑옷 위에 다시 얹는다
    if (o.armor) { armour(g, o, fl, hem, long); if (o.pauldron) for (const s of [-1, 1]) { part(g, p => { p.moveTo(s * 5.6, -32.6); p.quadraticCurveTo(s * 13, -35.6, s * 16.4, -29.4); p.quadraticCurveTo(s * 12, -29.6, s * 7, -27.6); p.closePath(); }, o.pauldron, s > 0 ? R(12, -36, 5, 9) : null, { hi: s < 0 ? E(-10, -32, 2.6, 1) : null }); for (const k of [0, 1]) curve(g, p => { p.moveTo(s * (7.4 + k * 2.2), -30.6 + k * 0.4); p.quadraticCurveTo(s * (11.6 + k * 1.6), -33.2 + k * 0.6, s * (14.6 + k * 0.6), -29.8 + k * 0.4); }, dk(o.pauldron, 0.4), 0.6); ell(g, s * 10.6, -31, 0.9, 0.9, OCHRE, INK, 0.35); } }
    // 몸통에 지는 접촉 그늘: 양 팔과 맞닿은 옆구리, 턱 아래 깃 언저리
    if (!o.bareChest || o.armor) { g.save(); g.beginPath(); torP(g); g.clip(); for (const s of [-1, 1]) { const gr = g.createLinearGradient(s * 10.6, 0, s * 6, 0); gr.addColorStop(0, 'rgba(30,24,48,0.36)'); gr.addColorStop(1, 'rgba(30,24,48,0)'); g.fillStyle = gr; g.fillRect(s > 0 ? 6 : -11, -33, 5, 13); } const cg = g.createRadialGradient(0, -32, 0.4, 0, -32, 6.4); cg.addColorStop(0, 'rgba(30,24,48,0.4)'); cg.addColorStop(1, 'rgba(30,24,48,0)'); g.fillStyle = cg; g.fillRect(-8, -34, 16, 7); g.restore(); }
    if (o.rank) rankBadge(g, o.rank);
    // 허리띠
    if (o.sash) {
      path(g, P(1.6, -19.4, 3.4, -10.6, 6.4, -11.8, 5.2, -19.6), o.sash, INK, 0.8); path(g, P(4.6, -19.6, 7.8, -12.4, 9.6, -14, 7, -19.8), dk(o.sash, 0.16), INK, 0.8);
      const sashP = p => { p.moveTo(-10.3, -22.8); p.quadraticCurveTo(0, -20.6, 10.3, -22.8); p.lineTo(10.7, -18.9); p.quadraticCurveTo(0, -16.7, -10.7, -18.9); p.closePath(); };
      part(g, sashP, o.sash, P(4.6, -24, 12, -24, 12, -16, 5.6, -16), { hi: P(-9.6, -22.4, -4, -21.4, -4.2, -20.6, -9.8, -21.6) }); shade(g, sashP, -10, -23, 10, -17, 0.22, 0.2);
      for (const x of [-6.6, -2.4, 7.6]) fold(g, x, -22.2, x + 0.8, -18.6, dk(o.sash, 0.3), 0.7);
      part(g, E(4.2, -19.3, 2.1, 1.9), o.sash, E(5, -18.6, 1.6, 1.4), { lw: 0.8, hi: E(3.6, -20, 0.9, 0.6) }); line(g, [3.3, -19.4, 5.1, -19.1], dk(o.sash, 0.36), 0.5);
      // 허리에 늘어뜨린 매듭과 술: 끈 → 도래매듭 → 술 머리 → 술 (붉은 띠에는 금빛, 다른 띠에는 붉은 술)
      if (o.knot !== false) { const kc = o.knot || (/^#(c8|b8|a8|8a)/i.test(o.sash) ? '#e2b85a' : '#b8322a'), kx = -6.4; line(g, [kx, -18.6, kx, -16.8], INK, 1.4); line(g, [kx, -18.6, kx, -16.8], kc, 0.7);
        poly(g, [kx, -17.4, kx + 1.3, -16, kx, -14.6, kx - 1.3, -16], kc, INK, 0.5); rr(g, kx - 1, -14.4, 2, 1.1, 0.4, dk(kc, 0.25), INK, 0.4);
        path(g, P(kx - 1, -13.4, kx + 1, -13.4, kx + 1.6, -9.8, kx - 1.6, -9.8), kc, INK, 0.5); for (const x of [-0.8, 0, 0.8]) line(g, [kx + x, -13, kx + x * 1.5, -10.2], dk(kc, 0.35), 0.35); }
    }
    // 손
    for (const s of [-1, 1]) { part(g, E(s * HX, -18.2, 3.3, 3.1), skin, E(s * HX + 1.6, -16.6, 3, 2.4), { lw: 1.1, hi: E(s * HX - 1, -19.4, 1.4, 0.9) }); ell(g, s * 13.3, -19.7, 1.35, 1.7, skin, INK, 0.8, s * 0.5); for (const k of [0, 1, 2]) line(g, [s * (15.2 + k * 0.9), -16.2 - k * 0.5, s * (16.2 + k * 0.7), -17.4 - k * 0.6], dk(skin, 0.4), 0.55); }
    if (o.thumbRing) { curve(g, p => p.ellipse(13.3, -19.5, 1.5, 1.2, 0.5, 0, TAU), INK, 1.6); curve(g, p => p.ellipse(13.3, -19.5, 1.5, 1.2, 0.5, 0, TAU), '#efe6cf', 0.8); }   // 명궁의 깍지: 엄지에 낀 뿔 가락지
    if (o.item) o.item(g);
  }
  if (head) {
    // 머리는 목을 축으로 조금 줄인다 (어른스러운 비례)
    g.save(); g.translate(0, -33.2); g.scale(0.92, 0.94); g.translate(0, 33.2);
    const hair = o.hair || BLACK;
    if (o.hat !== 'bald' && !o.noHair) ell(g, 0, -43.6, 9.9, 9.6, o.hat === 'sage' ? WHITE : hair, INK, 1.1);
    for (const s of [-1, 1]) { ell(g, s * 9.1, -41.8, 1.9, 2.7, skin, INK, 0.9); curve(g, p => p.arc(s * 9.2, -41.8, 1, s > 0 ? -1.2 : PI - 1.2 + 1.2, s > 0 ? 1.2 : PI + 1.2), dk(skin, 0.36), 0.6); }
    const jw = JAW[o.jaw] || JAW.oval;
    const faceP = p => { p.moveTo(-8.8, -45.4); p.bezierCurveTo(-8.8, -54.8, 8.8, -54.8, 8.8, -45.4); p.bezierCurveTo(jw[0], jw[1], jw[2], jw[3], 0, jw[4]); p.bezierCurveTo(-jw[2], jw[3], -jw[0], jw[1], -8.8, -45.4); p.closePath(); };
    part(g, faceP, skin, p => { p.moveTo(4.6, -56); p.lineTo(12, -56); p.lineTo(12, -30); p.lineTo(-1, -30); p.quadraticCurveTo(8.4, -36.4, 6, -48); p.closePath(); }, { k: 0.1, lw: 1.25 });
    // 살빛의 입체: 이마는 밝고, 턱 아래로 가며 따뜻한 그늘
    { g.save(); g.beginPath(); faceP(g); g.clip(); const gr = g.createLinearGradient(-6, -50, 4, -32); gr.addColorStop(0, 'rgba(255,248,232,0.28)'); gr.addColorStop(0.5, 'rgba(255,248,232,0)'); gr.addColorStop(1, 'rgba(150,80,60,0.16)'); g.fillStyle = gr; g.fillRect(-10, -56, 20, 26); g.restore(); }
    // 귀밑머리: 관자놀이에서 귀 앞까지 내려온 머리 (모자 아래로 드러난다)
    if (o.hat !== 'bald' && !o.noHair) for (const s of [-1, 1]) path(g, p => { p.moveTo(s * 8.9, -47.4); p.quadraticCurveTo(s * 7.6, -45, s * 8.2, -42.6); p.lineTo(s * 8.9, -42.8); p.quadraticCurveTo(s * 9.2, -45, s * 9.4, -47); p.closePath(); }, o.hat === 'sage' ? WHITE : hair);
    heavy(g, faceP, 1.8, 1.2);
    // 모자 그늘이 이마에 진다
    if (o.hat && o.hat !== 'bald' && o.hat !== 'sage') { g.save(); g.beginPath(); faceP(g); g.clip(); const hg = g.createLinearGradient(0, -48.6, 0, -43); hg.addColorStop(0, 'rgba(30,24,48,0.42)'); hg.addColorStop(1, 'rgba(30,24,48,0)'); g.fillStyle = hg; g.fillRect(-10, -49, 20, 6.4); g.restore(); }
    face(g, o, skin);
    if (o.hat) HATS[o.hat](g, o);
    if (o.plume) plume(g, o);
    g.restore();
  }
  g.globalAlpha = 1;
}

// ───────── 승급한 병사의 갑옷 ─────────
// kind: dujeong 두정갑(천에 쇠징을 줄지어 박은 갑옷) · mail 경번갑(쇠고리를 엮은 사슬) · lamellar 쇠미늘(작은 쇳조각을 엮은 비늘)
// col 바탕, trim 가장자리 선, short 짧은 자락, mirror 가슴의 둥근 쇠거울(호심경)
function armourPattern(g, kind, col, x0, y0, x1, y1) {
  if (kind === 'dujeong') { for (let y = y0 + 1.7, r = 0; y < y1; y += 2.8, r++) for (let x = x0 + (r % 2 ? 1.6 : 0.2); x < x1; x += 3.2) ell(g, x, y, 0.62, 0.62, '#e2b85a', dk(col, 0.5), 0.25); }
  else if (kind === 'mail') { g.lineWidth = 0.45; g.strokeStyle = lt(col, 0.42); for (let y = y0, r = 0; y < y1 + 2; y += 1.8, r++) for (let x = x0 + (r % 2 ? 1 : 0); x < x1 + 2; x += 2) { g.beginPath(); g.arc(x, y, 0.92, 0, TAU); g.stroke(); } }
  else for (let y = y0, r = 0; y < y1 + 2; y += 2.6, r++) for (let x = x0 + (r % 2 ? 1.2 : 0) - 1; x < x1 + 2; x += 2.4) { rr(g, x - 1.05, y - 1.3, 2.1, 2.7, 0.9, r % 2 ? col : lt(col, 0.1), dk(col, 0.5), 0.3); ell(g, x - 0.2, y - 0.7, 0.28, 0.28, lt(col, 0.55)); }
}
function armour(g, o, fl, hem, long) {
  const A = o.armor, col = A.col, tr = A.trim || OCHRE, kind = A.kind;
  // 자락: 가운데가 갈라진 앞자락 두 쪽
  if (!o.riding) {
    const yb = A.short ? -14.2 : long ? -5.2 : -10.6, w = y => 10.7 + (fl - 9.8) * Math.min(1, Math.max(0, (y + 21.6) / (hem + 21.6)));
    for (const s of [-1, 1]) {
      const sh = P(s * 0.8, -22.2, s * w(-22.2), -22.2, s * (w(yb) + 0.4), yb, s * 1.2, yb + 0.8);
      part(g, sh, col, s > 0 ? P(5, -23, 16, -23, 18, yb + 2, 6, yb + 2) : null, { lw: 1, hi: s < 0 ? P(-w(-22) + 0.6, -21.6, -w(-22) + 2.4, -21.6, -w(yb) + 1.4, yb, -w(yb) - 0.2, yb) : null });
      g.save(); g.beginPath(); sh(g); g.clip(); armourPattern(g, kind, col, s > 0 ? 1 : -w(yb) - 1, -22, s > 0 ? w(yb) + 1 : -1, yb); g.restore();
      path(g, P(s * (w(yb) + 0.4), yb, s * 1.2, yb + 0.8, s * 1.2, yb - 1, s * (w(yb) + 0.1), yb - 1.8), tr, INK, 0.6);
      line(g, [s * 1, -21.8, s * 1.3, yb], tr, 1.1);
    }
  } else for (const [x0, x1] of [[-15.8, -6], [-2, 10]]) { const sh = P(x0 + 3, -21.6, x1, -21.6, x1 + 1, -13.6, x0, -12.2); part(g, sh, col, null, { lw: 0.9 }); g.save(); g.beginPath(); sh(g); g.clip(); armourPattern(g, kind, col, x0, -21.6, x1 + 1, -12.2); g.restore(); line(g, [x0, -12.6, x1 + 1, -14], tr, 1.3); }
  // 몸통: 어깨에서 허리까지 감싸고 앞섶을 장식 띠로 여민다
  const body = p => { p.moveTo(-9, -32.4); p.quadraticCurveTo(-4.2, -33.4, -3.4, -32.1); p.quadraticCurveTo(0, -30.3, 3.4, -32.1); p.quadraticCurveTo(4.2, -33.4, 9, -32.4); p.lineTo(11, -20.1); p.lineTo(-11, -20.1); p.closePath(); };
  part(g, body, col, P(4.4, -34, 12, -34, 12, -19, 5.6, -19), { hi: P(-7.4, -31, -5.4, -31.4, -8.8, -22, -9.8, -22), lw: 1.1 });
  g.save(); g.beginPath(); body(g); g.clip(); armourPattern(g, kind, col, -11, -33, 11, -20); g.restore(); shade(g, body, -11, -33, 11, -20, 0.24, 0.3); heavy(g, body, 1.9);
  curve(g, p => { p.moveTo(-8.7, -32.1); p.quadraticCurveTo(-4, -33.1, -3.4, -31.9); p.quadraticCurveTo(0, -29.9, 3.4, -31.9); p.quadraticCurveTo(4, -33.1, 8.7, -32.1); }, tr, 1.7);
  if (kind !== 'mail') line(g, [0, -30.4, 0, -20.6], tr, 1.5);
  line(g, [-10.8, -20.7, 10.8, -20.7], tr, 1.4);
  if (A.mirror) { part(g, E(0, -26, 3.3, 3.3), '#e4e8ea', E(1, -25, 2.5, 2.5), { hi: E(-1.1, -27.3, 1.1, 0.7), hic: '#ffffff', lw: 0.9 }); curve(g, p => p.arc(0, -26, 2.3, 0, TAU), '#e2b85a', 0.8); }
}
// 계급 표식: 왼가슴에 단 금빛 마름모 (1~3개)
function rankBadge(g, n) {
  for (let i = 0; i < Math.min(3, n); i++) { const x = -5.4 + i * 0, y = -28.4 + i * 2.7; poly(g, [x, y - 1.7, x + 1.5, y, x, y + 1.7, x - 1.5, y], '#e2b85a', INK, 0.5); ell(g, x, y, 0.45, 0.45, RED); }
}
// 투구의 붉은 상모(털 술) · 전립에 꽂은 공작 깃
function plume(g, o) {
  const c = o.plume === 'peacock' ? null : o.plume;
  if (o.hat === 'tugu') {
    for (const [n, k, col, w] of [[9, 1.18, dk(c || RED, 0.35), 1.4], [7, 1, c || RED, 1.5], [4, 0.7, lt(c || RED, 0.3), 1]]) for (let i = 0; i < n; i++) { const a = -1.1 + i * (2.2 / (n - 1)) * 0.86, l = (7.4 + (i % 3) * 1.3) * k, fn = p => { p.moveTo(0, -66); p.quadraticCurveTo(Math.sin(a) * l * 0.5 - 2, -66 - l * 0.6, Math.sin(a) * l - 3.2, -66 - Math.cos(a) * l * 0.92); }; if (w > 1.2) curve(g, fn, INK, w + 1.2); curve(g, fn, col, w); }   // 두 겹의 붉은 상모 (짙은 뒷겹 · 앞겹 · 밝은 끝)
    ell(g, 0, -66, 1.9, 1.9, '#e2b85a', INK, 0.7); return;
  }
  // 공작 깃: 깃대를 따라 부푼 깃털, 끝에 공작 눈 (색을 주면 그 빛의 깃)
  const vc = c || '#3f8a6a', len = 15.4; g.save(); g.translate(2, -60); g.rotate(-1.0);
  curve(g, p => { p.moveTo(0, 0); p.lineTo(len, 0); }, INK, 1.9);
  part(g, p => { p.moveTo(len * 0.2, 0); p.quadraticCurveTo(len * 0.62, -3.6, len + 0.6, -2.4); p.lineTo(len + 0.6, 2.4); p.quadraticCurveTo(len * 0.62, 3.6, len * 0.2, 0); p.closePath(); }, vc, p => { p.rect(0, 0, len + 2, 4); }, { lw: 0.9 });
  for (let k = 0; k < 5; k++) { const x = len * (0.36 + k * 0.12); for (const s of [-1, 1]) line(g, [x, 0, x + 1.8, s * 2.1], lt(vc, 0.32), 0.5); }
  line(g, [0, 0, len, 0], '#e9d9b0', 0.8);
  part(g, E(len + 0.8, 0, 3.3, 2.8), c ? lt(c, 0.12) : '#2f7a6a', null, { lw: 0.8 }); part(g, E(len + 1, 0, 2.1, 1.8), '#e2b85a', null, { lw: 0.5 }); ell(g, len + 1.1, 0, 1.1, 1.05, c ? dk(c, 0.5) : '#1f3a6a');
  g.restore();
}

// ───────── 손에 든 소품·등에 멘 것 (몸 그림에 포함) ─────────
export const ITEM = {
  shield(g) {
    part(g, E(-HX, -16.8, 11, 11), '#cda766', E(-HX + 3.6, -13.6, 9.6, 9.6), { hi: E(-HX - 4, -21.4, 3.6, 2), lw: 1.3 });
    for (const r of [8.2, 5.2]) curve(g, p => p.arc(-HX, -16.8, r, 0, TAU), '#9a7840', 1); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; line(g, [-HX + Math.cos(a) * 5.2, -16.8 + Math.sin(a) * 5.2, -HX + Math.cos(a) * 10.4, -16.8 + Math.sin(a) * 10.4], '#9a7840', 0.75); }
    part(g, E(-HX, -16.8, 3.4, 3.4), RED, E(-HX + 1.2, -15.6, 2.6, 2.6), { hi: E(-HX - 1, -17.8, 1, 0.7), lw: 1 }); ell(g, -HX - 1.2, -18, 0.6, 0.6, '#ffffff');
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; ell(g, -HX + Math.cos(a) * 9.6, -16.8 + Math.sin(a) * 9.6, 0.5, 0.5, '#7a5a2c'); }   // 등나무를 엮은 테의 매듭
  },
  quiver(g) { g.save(); g.translate(8.6, -30); g.rotate(0.36); for (const [x, c] of [[-1.9, WHITE], [0.4, RED], [2.5, WHITE]]) { line(g, [x, -6, x, -13], '#8a6a4a', 1); poly(g, [x - 1.5, -12.4, x, -16.4, x + 1.5, -12.4], c, INK, 0.7); } part(g, p => p.roundRect ? p.roundRect(-3.3, -6.4, 6.6, 17, 2) : p.rect(-3.3, -6.4, 6.6, 17), WOODD, R(0.6, -7, 3, 18)); rr(g, -3.6, -6.8, 7.2, 2.4, 0.8, OCHRE, INK, 0.7); g.restore(); },
  scroll(g) { part(g, p => p.rect(11.4, -29, 9, 13), '#8a2a26', R(16, -30, 5, 15)); rr(g, 13.2, -27, 5.4, 6, 0.6, WHITE, INK, 0.7); for (const y of [-25.6, -24, -22.4]) line(g, [14.2, y, 17.6, y], INK, 0.5); ell(g, HX, -17.4, 3.2, 3, '#e6e3d8', INK, 1.1); },
  gourd(g) { part(g, E(9.4, -14.6, 3.8, 4.6), '#b8742a', E(10.8, -13.4, 2.8, 3.6)); part(g, E(9.4, -20, 2.2, 2.2), '#b8742a', E(10.2, -19.4, 1.6, 1.6), { lw: 1 }); line(g, [9.4, -22, 9.2, -23.6], WOODD, 1.4); curve(g, p => { p.moveTo(7.6, -18); p.quadraticCurveTo(5, -19.6, 5.6, -21.6); }, RED, 0.9); },
  bow(g) { const c = p => { p.moveTo(-15.8, -39.4); p.quadraticCurveTo(-13.6, -38.4, -12.6, -36.4); p.bezierCurveTo(-15.6, -31.4, -21.4, -26.4, -21.4, -18.4); p.bezierCurveTo(-21.4, -10.4, -15.6, -5.4, -12.6, -0.4); p.quadraticCurveTo(-13.6, 1.6, -15.8, 2.6); }; curve(g, c, INK, 3.8); curve(g, c, '#8a4f2c', 2.2); line(g, [-12.6, -36.4, -12.6, -0.4], WHITE, 0.8); for (const y of [-29, -8]) line(g, [-19.6, y, -16.6, y + (y < -18 ? -1.8 : 1.8)], OCHRE, 1.4); ell(g, -19.2, HY, 3.2, 3, SKIN, INK, 1.1); },   // 각궁: 매끈한 활등에 끝이 바깥으로 젖혀진다 ('B' 처럼 잘록하지 않게)
  cloud(g) { for (const [x, y, r] of [[-13, -1, 6.6], [-4.6, 0.6, 7.8], [5, 0.6, 7.8], [13.4, -1, 6.6]]) part(g, E(x, y, r, r * 0.62), '#f2f6f6', E(x + 2, y + 2.4, r, r * 0.5), { k: 0.14, lw: 1 }); rr(g, -13, -4.4, 26, 5, 2, '#f2f6f6'); for (const [x, s] of [[-9, 1], [6, -1]]) curve(g, p => p.arc(x, 0.4, 2.6, s > 0 ? 0.4 : 1, s > 0 ? 3.6 : 4.4), '#b9c8cc', 0.9); },
  // 어깨 앞으로 넘긴 땋은 머리와 붉은 댕기
  braid(g) { for (const [x, y] of [[-6.6, -30.6], [-7.4, -27.4], [-7.6, -24.2], [-7.4, -21]]) part(g, E(x, y, 2, 2.1), '#2b2a30', E(x + 0.7, y + 0.6, 1.5, 1.5), { lw: 0.8 }); path(g, P(-9.2, -19.6, -5.8, -19.4, -5, -13.6, -7.4, -15.2, -9.8, -13.2), RED, INK, 0.7); },
  // 왼손에 든 꽹과리
  gong(g) { for (const [c, dx] of [['#c8402f', -1.2], ['#e0b23c', 0], ['#2f4d7e', 1.2]]) path(g, P(-HX - 0.6 + dx - 0.5, -21.2, -HX - 0.6 + dx + 0.5, -21.2, -HX - 1.8 + dx * 2, -27.6, -HX - 2.8 + dx * 2, -27.2), c, INK, 0.4); line(g, [-HX, -21, -HX - 0.6, -24.6], RED, 1.1); part(g, E(-HX - 0.6, -14.6, 7, 7), '#e2b24a', E(-HX + 1.8, -12.4, 6, 6), { hi: E(-HX - 3.4, -17.6, 2.2, 1.3), hic: '#fff3c0', lw: 1.2 }); curve(g, p => p.arc(-HX - 0.6, -14.6, 4.6, 0, PI * 2), '#a8802a', 0.8); curve(g, p => p.arc(-HX - 0.6, -14.6, 6.2, PI * 0.95, PI * 1.55), '#fffbe0', 1.1); ell(g, -HX - 0.6, -14.6, 1.3, 1.3, '#a8802a'); ell(g, -HX - 3.8, -18.6, 0.7, 0.7, '#ffffff'); },   // 꽹과리: 테의 반짝임과 손잡이에 매단 삼색 천
  cape(g, col = '#8a2a26') { part(g, p => { p.moveTo(-8, -31); p.quadraticCurveTo(-17.6, -20, -15.4, -3.4); p.lineTo(-10, -6.6); p.lineTo(-6, -2.4); p.lineTo(6, -2.4); p.lineTo(10, -6.6); p.lineTo(15.4, -3.4); p.quadraticCurveTo(17.6, -20, 8, -31); p.closePath(); }, col, P(6, -32, 18, -32, 18, 0, 9, 0)); },
  // 호면 등패: 붉은 옻칠 바탕에 범의 얼굴을 그린 큰 방패 (철벽 등패수)
  tigerShield(g) {
    const x = -HX - 0.6, y = -18, r = 13.6;
    part(g, E(x, y, r, r), '#8a2a26', E(x + 4, y + 3.6, r - 1.6, r - 1.6), { hi: E(x - 5, y - 6.4, 4, 2.2), lw: 1.5 }); curve(g, p => p.arc(x, y, r - 1.5, 0, TAU), '#e2b85a', 1.4);
    part(g, E(x, y + 0.4, 8, 7.4), '#e0a040', E(x + 2.2, y + 2, 6.4, 5.8), { lw: 1 });
    for (const s of [-1, 1]) { part(g, P(x + s * 3.6, y - 6.6, x + s * 7.6, y - 9.4, x + s * 7.4, y - 5), '#e0a040', null, { lw: 0.8 }); for (let k = 0; k < 2; k++) line(g, [x + s * (5.4 + k * 1.2), y - 3.4 + k * 2.6, x + s * (7.8 + k * 0.8), y - 2.6 + k * 2.8], INK, 1); }
    for (const dx of [-1.6, 0, 1.6]) line(g, [x + dx, y - 6.4, x + dx * 0.6, y - 4.2], INK, 0.9);
    for (const s of [-1, 1]) { ell(g, x + s * 3, y - 1.4, 2, 1.5, '#fff3c0', INK, 0.7); ell(g, x + s * 3, y - 1.4, 0.75, 1.1, INK); }
    path(g, P(x - 3.4, y + 2.8, x + 3.4, y + 2.8, x + 1.8, y + 5.8, x - 1.8, y + 5.8), '#5a1f1c', INK, 0.7); for (const s of [-1, 1]) poly(g, [x + s * 2.6, y + 2.8, x + s * 1.8, y + 5, x + s * 1, y + 2.8], WHITE, INK, 0.4);
    ell(g, x, y + 1.6, 1.2, 0.8, INK);
    for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; ell(g, x + Math.cos(a) * (r - 0.7), y + Math.sin(a) * (r - 0.7), 0.7, 0.7, '#e2b85a', INK, 0.3); }
  },
  // 돌격 등패: 가운데 쇠뿔이 앞으로 솟은 방패
  spikeShield(g) {
    const x = -HX - 0.4, y = -17;
    part(g, E(x, y, 11.6, 11.6), '#c8a060', E(x + 3.4, y + 3, 10, 10), { hi: E(x - 4, y - 5, 3.4, 1.8), lw: 1.3 }); curve(g, p => p.arc(x, y, 10.4, 0, TAU), '#8a2a26', 2.3);
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + 0.2; line(g, [x + Math.cos(a) * 4.2, y + Math.sin(a) * 4.2, x + Math.cos(a) * 9, y + Math.sin(a) * 9], '#9a7840', 0.8); }
    part(g, E(x, y, 4.2, 4.2), '#aeb6bd', E(x + 1.4, y + 1.4, 3.2, 3.2), { lw: 1 }); poly(g, [x - 1.6, y - 1.6, x - 10.6, y - 0.4, x - 1.6, y + 1.8], '#e4e8ea', INK, 0.8);
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; ell(g, x + Math.cos(a) * 10.4, y + Math.sin(a) * 10.4, 0.65, 0.65, '#e4e8ea', INK, 0.3); }
  },
  // 등에 꽂은 영기: 장대 끝의 세모 깃발 (col 바탕 — 여러 빛이면 오방기처럼 줄을 나눈다, 붉은 가장자리, 불꽃 술)
  flag(col, edge = RED) { return g => { line(g, [-5, -28, -9.4, -70], INK, 2.8); line(g, [-5, -28, -9.4, -70], WOODD, 1.5); const fp = p => { p.moveTo(-9.3, -69); p.quadraticCurveTo(-18, -66, -27, -64.6); p.quadraticCurveTo(-18, -60, -8.6, -55.6); p.closePath(); }, many = Array.isArray(col); part(g, fp, many ? col[0] : col, many ? null : P(-20, -66, -28, -66, -20, -57), { lw: 1 }); if (many) { g.save(); g.beginPath(); fp(g); g.clip(); col.forEach((c, i) => { g.fillStyle = c; g.fillRect(-28, -70 + i * 14.4 / col.length, 20, 14.4 / col.length + 0.2); }); g.restore(); g.beginPath(); fp(g); st(g, INK, 1); } for (let k = 0; k < 5; k++) { const t = k / 4, x = -10 - 16.4 * (1 - Math.abs(t - 0.5) * 2) * 0.9, y = -69 + 13.4 * t; poly(g, [x, y - 1, x - 2.2, y + 0.6, x, y + 1.6], edge, INK, 0.4); } curve(g, p => { p.moveTo(-9.3, -69); p.quadraticCurveTo(-18, -66, -27, -64.6); }, edge, 1.2); ell(g, -9.5, -70.6, 1.4, 1.4, '#e2b85a', INK, 0.5); }; },
  // 허리 뒤로 길게 나부끼는 띠 두 가닥 (몸이 날랜 병사)
  tails(col) { return g => { for (const [dy, l, c] of [[0, 1, col], [3, 0.84, dk(col, 0.2)]]) { const fn = p => { p.moveTo(-6, -21 + dy); p.bezierCurveTo(-15, -22 + dy, -20 * l, -14 + dy, -26 * l, -20 + dy); p.quadraticCurveTo(-31 * l, -24 + dy, -36 * l, -18 + dy); p.lineTo(-32.6 * l, -17.4 + dy); p.lineTo(-35 * l, -14.4 + dy); p.quadraticCurveTo(-30 * l, -19.6 + dy, -26 * l, -16.4 + dy); p.bezierCurveTo(-20 * l, -10.6 + dy, -14, -18 + dy, -6, -17.6 + dy); p.closePath(); }; path(g, fn, c, INK, 0.9); } line(g, [-12, -19.6, -20, -17], lt(col, 0.3), 0.7); }; },
  // 애기살의 통아: 허리에 찬 대나무 대롱 (짧은 화살을 이 안에 넣어 쏜다)
  tube(g) { g.save(); g.translate(-7.4, -15.6); g.rotate(-0.42); part(g, P(-1.6, -11, 1.6, -11, 1.6, 4, -1.6, 4), '#c9a86a', R(0.2, -11, 1.4, 15), { lw: 0.9 }); for (const y of [-8, -3, 1.6]) line(g, [-1.6, y, 1.6, y], WOODD, 0.8); ell(g, 0, -11, 1.6, 0.6, '#7a5a2c', INK, 0.5); g.restore(); },
  // 육량전 전동: 굵고 무거운 화살이 꽂힌 큰 가죽 전동
  bigQuiver(g) { g.save(); g.translate(8.8, -29.4); g.rotate(0.34); for (const [x, c] of [[-2.8, WHITE], [0, RED], [2.8, WHITE]]) { line(g, [x, -6, x, -16], INK, 2.4); line(g, [x, -6, x, -16], '#8a6a4a', 1.4); poly(g, [x - 2.3, -15, x, -20.6, x + 2.3, -15], c, INK, 0.7); } part(g, P(-4.8, -7.4, 4.8, -7.4, 4.2, 12, -4.2, 12), '#6b3a26', R(1, -8, 4.2, 21), { lw: 1.1 }); for (const y of [-4, 8]) line(g, [-4.6, y, 4.5, y], '#e2b85a', 1.3); part(g, E(0, 2, 2, 2.2), '#e2b85a', null, { lw: 0.6 }); g.restore(); },
  // 서리 · 불: 도사의 몸을 두른 부적 기운 (그림에 함께 굽는다)
  frost(g) { for (const [x, y, r] of [[-18, -42, 3.4], [-21, -26, 2.4], [-15, -11, 2.6], [19.6, -40, 2.2]]) { for (let k = 0; k < 3; k++) { const a = k * PI / 3 + 0.3, dx = Math.cos(a) * r, dy = Math.sin(a) * r; line(g, [x - dx, y - dy, x + dx, y + dy], '#5f9ac8', 2.2); line(g, [x - dx, y - dy, x + dx, y + dy], '#e8f8ff', 1); } ell(g, x, y, 0.8, 0.8, '#ffffff', '#5f9ac8', 0.4); } },
  fire(g) { for (const [x, y, k] of [[-18, -38, 1], [-20.6, -22, 0.8], [-15.6, -9, 0.72], [19.6, -42, 0.7]]) { const fl = p => { p.moveTo(x, y - 7.4 * k); p.quadraticCurveTo(x + 4.8 * k, y - 1 * k, x + 2.6 * k, y + 3 * k); p.quadraticCurveTo(x, y + 4.8 * k, x - 2.6 * k, y + 3 * k); p.quadraticCurveTo(x - 4.8 * k, y - 1 * k, x, y - 7.4 * k); }; part(g, fl, '#e0602a', null, { lw: 0.8 }); part(g, E(x, y + 1 * k, 1.7 * k, 2.6 * k), '#ffd06a', null, { lw: 0 }); } },
  // 신내림 무녀의 오방 띠: 몸을 휘감고 나부끼는 다섯 빛 천
  ribbons(g) { ['#c8402f', '#e0b23c', '#3f6b5c', '#f6efdc', '#2f4d7e'].forEach((c, i) => { const y = -30 + i * 2.4, fn = p => { p.moveTo(-9, y); p.bezierCurveTo(-18, y - 4 + i, -22, y + 8, -26 - i * 0.8, y + 4 + i * 2); }; curve(g, fn, INK, 2.8); curve(g, fn, c, 1.7); }); },
  // 범 가죽: 왼어깨에서 오른허리로 비스듬히 두른 줄무늬 가죽, 끝에 앞발이 늘어진다 (도리깨 장사)
  pelt(g) { const band = p => { p.moveTo(-11.2, -31.4); p.quadraticCurveTo(-8, -35.4, -4.6, -33.4); p.lineTo(11.6, -21.4); p.lineTo(10.4, -15.4); p.lineTo(4.6, -17.6); p.closePath(); }; part(g, band, '#d9963f', P(0, -30, 14, -20, 12, -14, 0, -20), { lw: 1.1, hi: P(-10.4, -31.6, -7.6, -34, -6, -32.6, -9, -30.4) }); g.save(); g.beginPath(); band(g); g.clip(); for (let k = 0; k < 6; k++) { const t = k / 5, x = -8 + 18 * t, y = -32.6 + 12.6 * t; path(g, P(x - 1.6, y - 2.6, x + 0.2, y - 2.8, x + 2.4, y + 3.6, x + 0.8, y + 3.4), '#2b2a30'); } g.restore(); part(g, p => { p.moveTo(9.8, -16); p.quadraticCurveTo(12.6, -12, 11, -9.4); p.quadraticCurveTo(8.6, -8.6, 7.6, -10.4); p.quadraticCurveTo(7.8, -13, 6.4, -16.4); p.closePath(); }, '#d9963f', null, { lw: 0.9 }); for (const x of [8.4, 9.6, 10.8]) ell(g, x, -9.4, 0.6, 0.5, '#f6efdc', INK, 0.3); },
};
// 모자 없이 뒤통수만 필요한 인형(망령 등)을 위해 내보낸다
export { HATS };

// ───────── 도깨비 ─────────
export function dokkaebi(g, o, sel) {
  const body = sel !== 'head', head = sel !== 'body', sk = o.skin, cloth = o.cloth || '#d8c9a3', bell = lt(sk, 0.3);   // 기본은 물들이지 않은 삼베
  if (body) {
    for (const s of [-1, 1]) {
      part(g, p => { p.moveTo(s * 1, -13); p.quadraticCurveTo(s * 11.4, -13.6, s * 10, -4.6); p.lineTo(s * 2.6, -4.2); p.closePath(); }, sk, s > 0 ? R(6.4, -14, 6, 11) : R(-4.4, -14, 3, 11), { lw: 1.1 });
      part(g, p => { p.moveTo(s * 1.4, -4.8); p.lineTo(s * 10, -5); p.quadraticCurveTo(s * 12.6, -2, s * 11.4, 1); p.lineTo(s * 1.6, 1); p.closePath(); }, sk, R(-13, -1, 26, 3), { lw: 1.1 });
      for (const dx of [0, 2.6, 5.2]) poly(g, [s * (5 + dx) - 0.9, 0.2, s * (5 + dx), 2.2, s * (5 + dx) + 0.9, 0.2], '#f3e7c8', INK, 0.5);
    }
    part(g, p => { p.moveTo(-9.6, -27.6); p.quadraticCurveTo(-13, -18, -10.6, -10.6); p.quadraticCurveTo(0, -7, 10.6, -10.6); p.quadraticCurveTo(13, -18, 9.6, -27.6); p.closePath(); }, sk, P(4.6, -29, 14, -29, 14, -6, 6, -6), { hi: E(-1.4, -17.4, 5.2, 5.6), hic: bell });
    ell(g, -0.6, -13.6, 0.7, 0.9, dk(sk, 0.4));
    // 삼베 잠방이: 무릎 위에서 끊긴 짧은 바지 (올이 보이게 세로줄을 긋는다)
    part(g, p => { p.moveTo(-11.2, -15.4); p.quadraticCurveTo(0, -12.6, 11.2, -15.4); p.lineTo(12.4, -5.6); p.lineTo(1.6, -4.8); p.lineTo(0, -8.4); p.lineTo(-1.6, -4.8); p.lineTo(-12.4, -5.6); p.closePath(); }, cloth, P(4.6, -17, 14, -17, 14, -3, 6, -3));
    for (const x of [-8.8, -5.4, 5.4, 8.8]) line(g, [x, -12.6, x + (x < 0 ? -0.4 : 0.4), -6.6], dk(cloth, 0.28), 0.6);
    rope(g, p => { p.moveTo(-11.2, -15.4); p.quadraticCurveTo(0, -12.6, 11.2, -15.4); }, '#d9c39a', 1.4);
    // 팔: 왼팔은 내리고 오른팔은 방망이를 쥐어 들었다
    part(g, p => { p.moveTo(-8.6, -27.4); p.quadraticCurveTo(-18.4, -28, -19.6, -20); p.lineTo(-13.6, -17.4); p.quadraticCurveTo(-12.6, -22, -9.6, -22.6); p.closePath(); }, sk, E(-12.4, -19.6, 3, 4));
    part(g, p => { p.moveTo(8.6, -27.4); p.quadraticCurveTo(18.6, -30, 20, -22.6); p.lineTo(14.4, -18.4); p.quadraticCurveTo(13, -22.6, 9.6, -22.6); p.closePath(); }, sk, R(15.6, -31, 6, 14));
    for (const [x, y] of [[-16.4, -18.8], [16.4, -21]]) { part(g, E(x, y, 4, 3.7), sk, E(x + 1.8, y + 1.6, 3.6, 3), { lw: 1.1 }); line(g, [x - 1.4, y + 0.6, x + 2.4, y - 0.6], dk(sk, 0.36), 0.7); }
    line(g, [-19.6, -22.8, -14.4, -25], OCHRE, 1.7); line(g, [14.6, -26, 19.8, -24.2], OCHRE, 1.7);
    if (o.vest) for (const s of [-1, 1]) part(g, p => { p.moveTo(s * 9.4, -27.8); p.lineTo(s * 3.6, -27.4); p.quadraticCurveTo(s * 4.4, -20, s * 6, -14.8); p.lineTo(s * 11.4, -14.6); p.quadraticCurveTo(s * 12.6, -21, s * 9.4, -27.8); p.closePath(); }, o.vest, s > 0 ? R(8, -29, 6, 16) : null, { lw: 1 });   // 삼베 등거리
    if (o.beads) for (let i = -3; i <= 3; i++) ell(g, i * 3, -24.6 + (9 - i * i) * 0.4, 1.6, 1.6, i % 2 ? RED : '#f3e7c8', INK, 0.5);
    if (o.item) o.item(g);
  }
  if (head) {
    // 둥근 귀 (뾰족한 귀는 요정·오크처럼 보인다)
    for (const s of [-1, 1]) { part(g, E(s * 13.4, -38.2, 3.4, 4.4, s * 0.2), sk, s > 0 ? E(15.4, -37, 2.4, 4) : null, { lw: 1.1 }); curve(g, p => p.arc(s * 13.6, -38, 1.8, s > 0 ? -1.2 : Math.PI - 1.6, s > 0 ? 1.6 : Math.PI + 1.2), dk(sk, 0.4), 0.8); }
    part(g, p => { p.moveTo(-12.6, -40.4); p.bezierCurveTo(-12.8, -53, 12.8, -53, 12.6, -40.4); p.bezierCurveTo(13.8, -32, 8.4, -25, 0, -24.6); p.bezierCurveTo(-8.4, -25, -13.8, -32, -12.6, -40.4); p.closePath(); }, sk, p => { p.moveTo(6.6, -54); p.lineTo(15, -54); p.lineTo(15, -22); p.lineTo(-2, -22); p.quadraticCurveTo(11.6, -30, 8.6, -44); p.closePath(); }, { k: 0.16, hi: E(-5.4, -46.4, 4, 2), hk: 0.2, lw: 1.3 });
    // 더벅머리: 정수리를 덮고 이마로 흘러내린 거친 생머리 (곱슬머리·가시 머리는 쓰지 않는다)
    { const hc = o.hair || '#2e2a33';
      part(g, p => { p.moveTo(-13.4, -38); p.bezierCurveTo(-15.6, -57.6, 15.6, -57.6, 13.4, -38); p.lineTo(11.2, -44.6); p.lineTo(9.6, -46.6); p.lineTo(7.4, -45.2); p.lineTo(5.6, -48.8); p.lineTo(3.2, -46.4); p.lineTo(0.8, -49.6); p.lineTo(-1.6, -46.6); p.lineTo(-4, -49); p.lineTo(-6.2, -45.6); p.lineTo(-8.2, -47.4); p.lineTo(-10, -45.2); p.lineTo(-11.6, -44.2); p.closePath(); }, hc, P(4, -58, 16, -58, 16, -36, 9, -44), { hi: p => { p.moveTo(-9, -52); p.quadraticCurveTo(-3, -55.6, 4, -54.6); p.quadraticCurveTo(-3, -53.6, -8, -50.6); p.closePath(); }, hic: lt(hc, 0.3), lw: 1.1 });
      for (const s2 of [-1, 1]) part(g, P(s2 * 13.4, -38.4, s2 * 11.4, -45, s2 * 14.6, -43.6, s2 * 15.2, -37.6), hc, null, { lw: 0.9 }); }
    const horn = (x, a) => { g.save(); g.translate(x, -51.4); g.rotate(a); part(g, p => { p.moveTo(-2.8, 1); p.quadraticCurveTo(-2.6, -8, 0.6, -13.4); p.quadraticCurveTo(3.4, -7, 2.8, 1); p.closePath(); }, '#f3e7c8', P(0.6, -14, 4, -14, 4, 2, 1.2, 2), { k: 0.18, lw: 1 }); for (const y of [-3, -6.6]) line(g, [-2.2, y, 2.4, y - 0.8], '#c9b98a', 0.7); g.restore(); };
    // 뿔은 달지 않는다. 대신 씨름꾼 두목은 상투를 틀고 머리띠를 맸다
    if (o.horns === 2) { horn(-6, -0.34); horn(6, 0.34); } else if (o.horns === 1) horn(0.4, 0.06);
    if (o.knot) { part(g, E(0.4, -58.6, 3.4, 4), o.hair || BLACK, E(2, -57.6, 2.6, 3.2), { lw: 1 }); rr(g, -2.6, -55.6, 6, 2.2, 1, RED, INK, 0.6); part(g, p => { p.moveTo(-12.6, -45.6); p.quadraticCurveTo(0, -49.6, 12.6, -45.6); p.lineTo(12.4, -42.6); p.quadraticCurveTo(0, -46.6, -12.4, -42.6); p.closePath(); }, '#f3ecdd', null, { lw: 0.9 }); part(g, P(11.6, -45, 17.6, -43, 16.6, -39.6, 12, -42.6), '#f3ecdd', null, { lw: 0.8 }); }
    // 부리부리한 눈과 굵은 눈썹
    if (o.blink) for (const s of [-1, 1]) curve(g, p => { p.moveTo(s * 1.6, -38.6); p.quadraticCurveTo(s * 5.4, -36, s * 9.2, -39.4); }, INK, 1.7);
    else for (const s of [-1, 1]) { g.save(); g.beginPath(); g.moveTo(s * 1.4, -39.6); g.quadraticCurveTo(s * 5.6, -44.4, s * 10, -41.6); g.quadraticCurveTo(s * 6, -34.6, s * 1.4, -39.6); g.closePath(); g.fillStyle = '#fff3b8'; g.fill(); g.clip(); ell(g, s * 5.2, -39.6, 1.7, 2, '#8a2a1c'); ell(g, s * 5.2, -39.5, 0.8, 1.1, '#15121a'); g.restore(); curve(g, p => { p.moveTo(s * 1.4, -39.6); p.quadraticCurveTo(s * 5.6, -44.4, s * 10, -41.6); p.quadraticCurveTo(s * 6, -34.6, s * 1.4, -39.6); }, INK, 1.1); }
    for (const s of [-1, 1]) path(g, P(s * 10.6, -45.6, s * 1.4, -44.6, s * 1.4, -42.6, s * 10.8, -43.2), o.hair || BLACK, INK, 0.7);   // 굵고 평평한 눈썹: 성난 얼굴보다 짓궂은 얼굴
    // 넓적한 매부리코 (콧대와 콧방울)
    curve(g, p => { p.moveTo(0.8, -40.4); p.quadraticCurveTo(-0.6, -37, -2.2, -35); }, dk(sk, 0.42), 1);
    part(g, p => { p.moveTo(-4.2, -33.6); p.quadraticCurveTo(-4.2, -36.4, -1.8, -35.8); p.quadraticCurveTo(0, -37.6, 1.8, -35.8); p.quadraticCurveTo(4.2, -36.4, 4.2, -33.6); p.quadraticCurveTo(0, -32, -4.2, -33.6); p.closePath(); }, lt(sk, 0.06), null, { lw: 0.9 });
    for (const s of [-1, 1]) curve(g, p => { p.moveTo(s * 1, -33.4); p.quadraticCurveTo(s * 2.4, -34.6, s * 3.4, -33.6); }, dk(sk, 0.5), 0.8);
    // 히죽 웃는 입: 위아래 이가 맞물린 초승달 웃음 (붉은 입술 띠를 그리지 않는다)
    path(g, p => { p.moveTo(-7.8, -32.2); p.quadraticCurveTo(0, -28.8, 7.8, -32.2); p.quadraticCurveTo(5.4, -27, 0, -26.8); p.quadraticCurveTo(-5.4, -27, -7.8, -32.2); p.closePath(); }, '#f6efe0', INK, 1);
    curve(g, p => { p.moveTo(-7, -31.2); p.quadraticCurveTo(0, -27.8, 7, -31.2); }, INK, 0.6); for (const x of [-3.4, 0, 3.4]) line(g, [x, -30.4 + Math.abs(x) * 0.12, x, -27.4 + Math.abs(x) * 0.1], INK, 0.5);
    for (const s of [-1, 1]) curve(g, p => { p.moveTo(s * 8.8, -34.2); p.quadraticCurveTo(s * 10.6, -32, s * 9.4, -29.6); }, dk(sk, 0.42), 0.9);   // 히죽 웃는 볼 주름 (엄니는 달지 않는다)
    if (o.warts) for (const [x, y] of [[-9.6, -46], [8.6, -47.4], [10.4, -30]]) ell(g, x, y, 0.9, 0.8, dk(sk, 0.3));
    // 쓰개: 패랭이(대나무 삿갓) · 벙거지(펠트 모자)
    if (o.hat === 'paeraeng') {   // 패랭이: 평평한 챙 위에 둥근 정수리 (원뿔 삿갓은 다른 나라 농립처럼 보인다)
      part(g, E(0, -45.4, 17.6, 3.8), '#d9b77a', E(1.6, -44, 16.4, 2.8), { k: 0.22, lw: 1.1 });
      part(g, p => { p.moveTo(-8.6, -46); p.bezierCurveTo(-9.4, -57.4, 9.4, -57.4, 8.6, -46); p.quadraticCurveTo(0, -44.6, -8.6, -46); p.closePath(); }, '#d9b77a', P(2, -57, 10, -57, 10, -45, 3, -45), { k: 0.2, hi: E(-3.4, -53, 2.6, 1.4), hk: 0.25, lw: 1.1 });
      for (const y of [-49.4, -52.6]) curve(g, p => { p.moveTo(-8, y); p.quadraticCurveTo(0, y + 1.2, 8, y); }, '#a8843c', 0.6);
      rope(g, p => { p.moveTo(-8.6, -47.4); p.quadraticCurveTo(0, -45.8, 8.6, -47.4); }, '#2f4d7e', 1.3); curve(g, p => { p.moveTo(-12, -44); p.quadraticCurveTo(-11, -33, -5, -27); }, '#7a4a2c', 0.8);
    }
    if (o.hat === 'beong') { part(g, E(0, -44.2, 17.4, 4.2), '#4a3a30', E(2, -42.6, 16, 3), { k: 0.24, lw: 1.1 }); part(g, p => { p.moveTo(-10.4, -44.4); p.bezierCurveTo(-11, -57, 11, -57, 10.4, -44.4); p.quadraticCurveTo(0, -42.4, -10.4, -44.4); p.closePath(); }, '#5a4636', P(3, -57, 12, -57, 12, -43, 4, -43), { k: 0.24, hi: E(-4, -52, 3, 1.6), hk: 0.2, lw: 1.1 }); rope(g, p => { p.moveTo(-10.2, -46.6); p.quadraticCurveTo(0, -44.4, 10.2, -46.6); }, RED, 1.2); }
    if (o.headItem) o.headItem(g);   // 머리에 쓴 다른 것 (감투 도깨비의 도깨비감투)
  }
}
export const DITEM = {
  lid(g) { part(g, E(-17, -18.4, 12, 12), '#3e3e49', E(-13.6, -15.4, 10.6, 10.6), { hi: E(-21.4, -23.4, 4, 2.2), hic: '#7a7a88', lw: 1.3 }); curve(g, p => p.arc(-17, -18.4, 8.4, 0, TAU), '#5e5e6c', 1.1); part(g, E(-17, -18.4, 3.2, 3.2), '#6a6a78', E(-16, -17.4, 2.6, 2.6), { lw: 1 }); },
  drum(g) { rope(g, p => { p.moveTo(-9, -26); p.quadraticCurveTo(0, -30, 9, -26); }, '#d9c39a', 1.2); part(g, p => p.rect(-11, -17, 22, 12.6), '#a8322a', R(4, -18, 8, 15)); part(g, E(0, -17, 11, 4.2), '#f3e7c8', E(3, -15.8, 9, 3.4), { k: 0.12 }); for (const x of [-7, 0, 7]) line(g, [x, -13, x, -5], OCHRE, 1.1); ell(g, 0, -4.6, 11, 2.6, '#8a2a26', INK, 1.1); path(g, p => p.arc(0, -17, 2.6, 0, PI), RED); path(g, p => p.arc(0, -17, 2.6, PI, TAU), INDIGO); },
  sling(g) { rope(g, p => { p.moveTo(16.4, -21); p.quadraticCurveTo(22, -30, 20.6, -36); }, '#8a6a4a', 1.1); rope(g, p => { p.moveTo(16.4, -21); p.quadraticCurveTo(26, -27, 24.4, -35); }, '#8a6a4a', 1.1); part(g, P(18.6, -38.6, 22, -41.6, 26.4, -39.4, 26.6, -35, 22.6, -32.6, 19, -34.6), '#a59f8f', P(23, -42, 28, -42, 28, -32, 23.6, -32), { hi: E(21, -38.6, 1.4, 0.8) }); },
};

// ───────── 불여우 ─────────
export function fox(g, o = {}) {
  const fur = o.fur || '#ecd3a8', tip = o.tip || '#fbf7ec', inner = '#8a5a34', deep = dk(fur, 0.34), sock = '#5a3a2a';   // 누런 여우, 꼬리 끝은 흰빛
  // 꼬리 다섯: 등 뒤에서 양옆으로 휘어 흐른다 (S 자로 굽고 끝은 흰 붓끝처럼 뾰족하다)
  // (구미호처럼 한쪽 — 등 뒤 왼편 — 으로 부채처럼 펼쳐 겹친다. 양옆으로 뻗으면 날개처럼 보인다)
  for (let i = 0; i < 5 && !o.noTail; i++) {
    const s = -1, k = Math.abs(i - 2);
    g.save(); g.translate(-3, -7); g.rotate(-1.28 + i * 0.25);
    const l = 31 - k * 1.6;
    part(g, p => { p.moveTo(-3, 0); p.bezierCurveTo(-9, -l * 0.3, s * 4 - 6, -l * 0.62, s * 5, -l); p.bezierCurveTo(s * 5 + 7, -l * 0.66, 9, -l * 0.3, 3, 0); p.closePath(); }, fur, p => { p.moveTo(0, 2); p.bezierCurveTo(6, -l * 0.3, s * 4 + 6, -l * 0.6, s * 5 + 4, -l); p.lineTo(12, -l); p.lineTo(12, 2); p.closePath(); }, { k: 0.18, lw: 1.1 });
    // 흰 꼬리 끝과 털 결
    part(g, p => { p.moveTo(s * 5 - 4.6, -l * 0.7); p.quadraticCurveTo(s * 5 - 1.6, -l * 0.82, s * 5, -l); p.quadraticCurveTo(s * 5 + 2.4, -l * 0.82, s * 5 + 4.4, -l * 0.7); p.quadraticCurveTo(s * 5, -l * 0.76, s * 5 - 4.6, -l * 0.7); p.closePath(); }, tip, null, { lw: 0.9 });
    curve(g, p => { p.moveTo(0, -l * 0.18); p.quadraticCurveTo(s * 2, -l * 0.42, s * 3.6, -l * 0.6); }, deep, 0.8);
    g.restore();
  }
  // 앉은 몸: 둥근 가슴과 양옆으로 불룩한 뒷다리, 앞에 모은 두 앞다리
  for (const s of [-1, 1]) part(g, E(s * 7.4, -6, 5, 6.2, s * 0.2), fur, E(s * 7.4 + 2, -4, 4.4, 5), { k: 0.22, lw: 1.1 });   // 뒷다리 허벅지
  part(g, p => { p.moveTo(-8, -4); p.bezierCurveTo(-10.6, -12, -8, -20, -4.6, -22); p.lineTo(4.6, -22); p.bezierCurveTo(8, -20, 10.6, -12, 8, -4); p.quadraticCurveTo(0, -1, -8, -4); p.closePath(); }, fur, P(2.6, -23, 11, -23, 11, 0, 3, 0), { k: 0.16, lw: 1.2 });
  // 흰 가슴털: 아래로 갈라진 털끝
  path(g, p => { p.moveTo(-4.4, -21); p.quadraticCurveTo(-6, -13, -3.4, -9); p.lineTo(-2, -11); p.lineTo(-0.6, -8); p.lineTo(0.8, -11); p.lineTo(2.2, -8.4); p.lineTo(3.6, -10.6); p.quadraticCurveTo(6, -13, 4.4, -21); p.closePath(); }, tip, INK, 0.8);
  // 앞다리: 검붉은 버선을 신은 듯한 발
  for (const s of [-1, 1]) {
    part(g, p => { p.moveTo(s * 1.2, -12); p.lineTo(s * 5.2, -12); p.lineTo(s * 5, -2.4); p.lineTo(s * 1.4, -2.4); p.closePath(); }, fur, s > 0 ? R(3, -13, 3, 11) : null, { k: 0.16, lw: 1 });
    part(g, p => { p.moveTo(s * 1.2, -5.4); p.lineTo(s * 5.2, -5.4); p.quadraticCurveTo(s * 6.4, 0.8, s * 3.2, 0.8); p.quadraticCurveTo(s * 0.4, 0.8, s * 1.2, -5.4); p.closePath(); }, sock, null, { lw: 1 });
    for (const dx of [2.4, 4]) line(g, [s * dx, -1.4, s * dx, 0.6], '#2a1a12', 0.5);
  }
  // 귀: 크고 뾰족, 등은 짙고 안은 검붉다
  for (const s of [-1, 1]) { part(g, P(s * 3.2, -33.4, s * 10.8, -46, s * 11.4, -30.6), deep, null, { lw: 1.1 }); path(g, P(s * 5.2, -33.6, s * 9.8, -41.6, s * 10, -32), inner); for (const yy of [-36, -34]) line(g, [s * 6.6, yy, s * 9, yy - 1.6], tip, 0.6); }
  // 얼굴: 세모꼴, 볼털이 양옆으로 삐죽하고 흰 주둥이가 앞으로 뾰족하다
  part(g, p => { p.moveTo(-10.6, -30); p.quadraticCurveTo(-9.6, -37.4, 0, -37.4); p.quadraticCurveTo(9.6, -37.4, 10.6, -30); p.lineTo(13.6, -26.6); p.lineTo(10, -26); p.lineTo(11.4, -22.8); p.lineTo(6.6, -23.4); p.quadraticCurveTo(3, -19, 0, -18); p.quadraticCurveTo(-3, -19, -6.6, -23.4); p.lineTo(-11.4, -22.8); p.lineTo(-10, -26); p.lineTo(-13.6, -26.6); p.closePath(); },
    fur, P(3, -38, 14, -38, 14, -17, 0.6, -17, 6, -24), { k: 0.14, hi: E(-4, -34.4, 3.4, 1.4), hic: lt(fur, 0.4) });
  path(g, p => { p.moveTo(-5.4, -26); p.quadraticCurveTo(-3, -22.4, 0, -18.6); p.quadraticCurveTo(3, -22.4, 5.4, -26); p.quadraticCurveTo(0, -24, -5.4, -26); p.closePath(); }, tip);   // 흰 주둥이
  // 이마의 붉은 무늬 한 점 (여우 요괴의 표식)
  path(g, p => { p.moveTo(0, -35.6); p.quadraticCurveTo(1.4, -33.4, 0, -31.6); p.quadraticCurveTo(-1.4, -33.4, 0, -35.6); p.closePath(); }, '#c8402f');
  // 가늘게 치켜뜬 눈 (눈매가 길게 빠진다)
  for (const s of [-1, 1]) {
    if (o.blink) curve(g, p => { p.moveTo(s * 7.4, -29.6); p.quadraticCurveTo(s * 4.8, -27.6, s * 2.2, -28.2); }, INK, 1.4);
    else { path(g, p => { p.moveTo(s * 7.8, -30.6); p.quadraticCurveTo(s * 4.8, -32, s * 2.2, -28); p.quadraticCurveTo(s * 5, -27.2, s * 7.8, -30.6); p.closePath(); }, '#f0c040', INK, 0.9); ell(g, s * 4.6, -29.2, 0.55, 1.3, INK); }
    curve(g, p => { p.moveTo(s * 7.8, -30.6); p.lineTo(s * 9.4, -31.6); }, INK, 0.9);   // 눈꼬리
  }
  ell(g, 0, -20.6, 1.5, 1.1, INK); curve(g, p => { p.moveTo(-2.2, -19.2); p.quadraticCurveTo(0, -18, 2.2, -19.2); }, INK, 0.8);
  for (const s of [-1, 1]) for (const dy of [-0.6, 0.8]) line(g, [s * 3.4, -21.6 + dy, s * 9, -22.6 + dy * 2], '#6a5a4a', 0.45);   // 수염
}
// 달아나는 여우: 오른쪽으로 내닫는 옆모습 (긴 주둥이, 뒤로 흐르는 꼬리, 앞뒤로 뻗은 다리)
export function foxRun(g, o = {}) {
  const fur = o.fur || '#ecd3a8', tip = o.tip || '#fbf7ec', far = dk(fur, 0.2), sock = '#6a4a34';
  part(g, p => { p.moveTo(-10, -17); p.quadraticCurveTo(-22, -27, -37, -23); p.quadraticCurveTo(-31, -15, -20, -13); p.quadraticCurveTo(-14, -12, -10, -13.4); p.closePath(); }, fur, P(-38, -18, -10, -15.6, -10, -11, -38, -11), { k: 0.14, lw: 1.1 });
  part(g, p => { p.moveTo(-29.6, -25.2); p.quadraticCurveTo(-34, -25, -37, -23); p.quadraticCurveTo(-33.6, -18.6, -28.4, -17); p.quadraticCurveTo(-27, -21, -29.6, -25.2); p.closePath(); }, tip, null, { lw: 0.9 });
  for (const pts of [[-11, -14.4, -7.6, -15, -18.4, -4.6, -22, -4.4], [8, -14.6, 11.4, -15.2, 21.4, -6.6, 18.4, -4.4]]) part(g, P(...pts), far, null, { lw: 1 });
  part(g, p => { p.moveTo(-13.4, -15); p.quadraticCurveTo(-12.4, -23.4, -2, -23); p.quadraticCurveTo(8, -22.4, 13, -20.4); p.quadraticCurveTo(15.4, -14.4, 10.4, -11.6); p.quadraticCurveTo(0, -10.2, -10, -11.2); p.quadraticCurveTo(-14, -12.2, -13.4, -15); p.closePath(); }, fur, P(-15, -14.6, 15, -14.6, 15, -9, -15, -9), { k: 0.14, lw: 1.2 });
  part(g, p => { p.moveTo(5.6, -12.6); p.quadraticCurveTo(10, -10.8, 13.4, -14.6); p.quadraticCurveTo(14.2, -10.4, 9, -10.4); p.closePath(); }, tip, null, { lw: 0.8 });
  part(g, P(-12.6, -15.4, -7.4, -14, -14.4, -3, -18.4, -2), fur, null, { lw: 1.1 });   // 뒷다리는 뒤로 차고
  part(g, P(6, -14.4, 10.6, -13.4, 22.6, -3.4, 19.4, -1.8), fur, null, { lw: 1.1 });   // 앞다리는 앞으로 뻗는다
  for (const [x, y, a] of [[-17.6, -2.2, -0.5], [21.6, -2.4, 0.6], [-21.2, -4.4, -0.5], [20.4, -5.4, 0.6]]) ell(g, x, y, 2.2, 1.4, sock, INK, 0.8, a);
  part(g, P(15, -26.6, 17.6, -33, 19.6, -26), far, null, { lw: 0.9 });
  part(g, p => { p.moveTo(10, -20); p.quadraticCurveTo(11.6, -27.4, 17, -27.4); p.quadraticCurveTo(21.4, -26.4, 28.6, -20.6); p.quadraticCurveTo(22.4, -17.4, 16, -17.2); p.quadraticCurveTo(11, -17.2, 10, -20); p.closePath(); }, fur, P(10, -19.4, 29, -19.4, 29, -16, 10, -16), { k: 0.12, lw: 1.2 });
  part(g, P(12.4, -25.6, 13.2, -33.6, 16.8, -26.8), fur, null, { lw: 1 }); path(g, P(13.6, -26.4, 14, -31, 15.8, -27), '#8a5a34');
  path(g, p => { p.moveTo(12, -18.6); p.quadraticCurveTo(17, -16.6, 22.6, -18.4); p.quadraticCurveTo(17, -15.6, 12, -18.6); p.closePath(); }, tip);
  ell(g, 28.4, -20.6, 1.2, 1, INK); line(g, [22.4, -18.8, 27, -19.4], INK, 0.8);
  if (o.blink) curve(g, p => { p.moveTo(17.2, -23); p.quadraticCurveTo(18.8, -22.2, 20.6, -23.6); }, INK, 1.2);
  else { path(g, P(17, -22.8, 19.4, -24.8, 21, -23.6, 19, -22.4), '#f6c84a', INK, 0.8); ell(g, 19.2, -23.4, 0.5, 0.9, INK); }
}
// ───────── 장승 ─────────
export function jangseung(g) {
  const wd = '#b08a5c';
  for (const x of [-8, 0, 8]) part(g, E(x, -1.4, 4.8, 2.8), '#8a6844', E(x + 1.4, -0.4, 4, 2), { lw: 1 });
  for (const x of [-11, 11]) { line(g, [x, -1, x + (x > 0 ? 3 : -3), -8], '#5f7a5a', 1.2); line(g, [x, -1, x, -9], '#5f7a5a', 1.2); }
  part(g, p => { p.moveTo(-9.8, -2); p.lineTo(-9, -51); p.lineTo(9, -51); p.lineTo(9.8, -2); p.closePath(); }, wd, P(3.6, -52, 11, -52, 11, -1, 4.6, -1), { hi: R(-8, -50, 2, 48), hk: 0.2, lw: 1.3 });
  for (const [x, y0, y1] of [[-5.6, -22, -4], [5.2, -20, -5], [0.2, -18, -8], [-2.6, -12, -3]]) curve(g, p => { p.moveTo(x, y0); p.quadraticCurveTo(x + 1.4, (y0 + y1) / 2, x + 0.4, y1); }, '#8a6844', 0.9);
  ell(g, 4.6, -12, 1.5, 2.2, '#8a6844', '#6f5234', 0.7);
  part(g, p => { p.moveTo(-12, -50); p.lineTo(12, -50); p.lineTo(9, -59.6); p.lineTo(3.2, -59.6); p.lineTo(2.6, -64.6); p.lineTo(-2.6, -64.6); p.lineTo(-3.2, -59.6); p.lineTo(-9, -59.6); p.closePath(); }, '#3a3238', P(3, -66, 13, -66, 13, -49, 4, -49), { hi: R(-8, -58.6, 5, 1.2), hic: '#5e5660' });
  for (const s of [-1, 1]) { const eye = p => { p.moveTo(s * 1.1, -41); p.quadraticCurveTo(s * 4.4, -46.4, s * 8.4, -43.4); p.quadraticCurveTo(s * 5.6, -37.4, s * 1.1, -41); p.closePath(); }; g.beginPath(); eye(g); g.fillStyle = '#f3ead2'; g.fill(); g.save(); g.clip(); ell(g, s * 4.5, -41.9, 1.7, 2, INK); g.fillStyle = 'rgba(58,50,56,0.3)'; g.fillRect(-10, -47, 20, 3.4); g.restore(); g.beginPath(); eye(g); st(g, INK, 1.2); path(g, P(s * 9.2, -49, s * 0.8, -45, s * 1.2, -42.8, s * 9.2, -46.4), '#3a3238'); }
  curve(g, p => { p.moveTo(0, -42.6); p.lineTo(-1.8, -35); p.lineTo(2, -35); }, dk(wd, 0.4), 1.3);
  part(g, p => p.rect(-7, -32.4, 14, 7.2), '#8a2a26', R(-7, -28, 14, 4), { shc: '#4a1216', lw: 1.1 }); for (const x of [-4.6, -1.6, 1.6, 4.6]) rr(g, x - 1.3, -31.6, 2.6, 5, 0.5, WHITE, INK, 0.6);
  for (const s of [-1, 1]) curve(g, p => { p.moveTo(s * 3.4, -37.4); p.quadraticCurveTo(s * 7, -36.4, s * 7.6, -33.4); }, dk(wd, 0.36), 0.9);
  for (const y of [-21, -16.4, -11.8]) rr(g, -2.2, y, 4.4, 3.6, 0.5, null, dk(wd, 0.36), 0.8);
}
// ───────── 도깨비불 ─────────
// 도깨비불: 위로 여러 갈래 흔들리는 푸른 불꽃 (둥근 물방울 꼴은 남의 나라 혼불처럼 보인다)
export function wisp(g, o = {}) {
  // 도깨비불: 푸른 불길 세 겹(바깥 쪽빛 → 가운데 하늘빛 → 속 흰빛)이 위로 너울대며 갈라지고, 아래로는 꼬리처럼 가늘게 끌린다
  const tongue = (k, col, lw) => part(g, p => {
    p.moveTo(0, -46 * k - 2 * (1 - k));
    p.bezierCurveTo(2.6 * k, -40 * k, 3.6 * k, -38 * k, 5 * k, -35.4 * k);
    p.bezierCurveTo(6.6 * k, -38.6 * k, 8.4 * k, -40.4 * k, 9.6 * k, -41.6 * k);
    p.bezierCurveTo(13.4 * k, -31 * k, 12 * k, -20 * k, 8.4 * k, -13 * k);
    p.bezierCurveTo(6 * k, -8.6 * k, 3.4 * k, -6.4 * k, 1.4, -3.4 + (1 - k) * -4);   // 아래로 끌리는 꼬리
    p.bezierCurveTo(-3 * k, -6 * k, -8 * k, -10 * k, -10.8 * k, -18 * k);
    p.bezierCurveTo(-12.4 * k, -25 * k, -10.4 * k, -32 * k, -7.6 * k, -38.4 * k);
    p.bezierCurveTo(-6.2 * k, -35.4 * k, -4.6 * k, -34.4 * k, -3.4 * k, -34 * k);
    p.bezierCurveTo(-3 * k, -38 * k, -1.6 * k, -42 * k, 0, -46 * k - 2 * (1 - k)); p.closePath();
  }, col, null, { lw, line: '#1a3f5c' });
  tongue(1, '#3f8fc8', 1.2);
  g.save(); g.translate(0, -1.6); tongue(0.82, '#7fd0ee', 0); g.restore();
  // 속의 흰 불심: 둥글게 빛나고 얼굴이 떠 있다
  part(g, p => { p.moveTo(0, -31); p.bezierCurveTo(5, -24, 7.6, -18.4, 5.8, -13.4); p.bezierCurveTo(3.8, -9, -3.8, -9, -5.8, -13.8); p.bezierCurveTo(-7.2, -18.6, -2.6, -23, 0, -31); p.closePath(); }, '#d6f4fd', null, { lw: 0, hi: E(-1.4, -16, 3, 3.6), hic: '#ffffff' });
  // 불 끝에서 갈라져 오르는 작은 불혀 두엇 (몸에 붙여 그려 따로 떨어진 거품처럼 보이지 않게)
  for (const [x, y, h, a] of [[-6.4, -37, 6, -0.4], [7.6, -40, 5, 0.3]]) { g.save(); g.translate(x, y); g.rotate(a); part(g, p => { p.moveTo(-1.6, 0); p.quadraticCurveTo(-1.4, -h * 0.6, 0.4, -h); p.quadraticCurveTo(1.6, -h * 0.5, 1.6, 0); p.closePath(); }, '#7fd0ee', null, { lw: 0.8, line: '#1a3f5c' }); g.restore(); }
  // 얼굴: 장난스럽게 치켜뜬 눈과 톱니 웃음
  if (o.blink) for (const s of [-1, 1]) curve(g, p => { p.moveTo(s * 1.4, -17.2); p.quadraticCurveTo(s * 3.4, -16.2, s * 5.2, -17.8); }, '#123650', 1.3);
  else for (const s of [-1, 1]) { path(g, p => { p.moveTo(s * 1.3, -16.4); p.quadraticCurveTo(s * 3.4, -21.4, s * 6.6, -21); p.quadraticCurveTo(s * 5, -15.6, s * 1.3, -16.4); p.closePath(); }, '#123650'); ell(g, s * 3.2, -18.6, 0.5, 0.5, '#e8fbff'); }
  curve(g, p => { p.moveTo(-2.8, -12.6); p.lineTo(-1.4, -11.2); p.lineTo(0, -12.6); p.lineTo(1.4, -11.2); p.lineTo(2.8, -12.6); }, '#1f4f6f', 1);
}
// ───────── 화차 ─────────
export function cart(g) {
  line(g, [-20, -9, -31, -4.6], INK, 4); line(g, [-20, -9, -31, -4.6], WOODD, 2.4);
  part(g, P(-17.6, -12.4, 17.6, -12.4, 15.4, -5.6, -15.4, -5.6), '#9a6a3c', R(-18, -8.6, 36, 4));
  g.save(); g.translate(0, -15); g.rotate(-0.14);
  part(g, p => p.rect(-14.6, -23, 29.2, 23), '#b98a55', P(6, -24, 16, -24, 16, 1, 8, 1), { hi: R(-13.6, -22, 27, 1.6), lw: 1.3 }); for (const x of [-14.6, 12.2]) rr(g, x, -23, 2.4, 23, 0.6, WOODD, INK, 0.7);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) { ell(g, -9.6 + c * 4.8, -18.6 + r * 4.8, 1.6, 1.6, '#2e2420'); ell(g, -10 + c * 4.8, -19, 0.5, 0.5, '#6a5a4a'); }
  for (const [x, y] of [[-9.6, -18.6], [0, -18.6], [9.6, -13.8], [-4.8, -9]]) { line(g, [x, y, x + 1.6, y - 9.6], INK, 2.2); line(g, [x, y, x + 1.6, y - 9.6], '#e9d9b0', 1.1); poly(g, [x - 0.4, y - 9.4, x + 1.8, y - 14.4, x + 3.4, y - 9], RED, INK, 0.7); }
  g.restore();
  for (const s of [-1, 1]) { part(g, E(s * 16, -7, 8.6, 8.6), WOODD, E(s * 16 + 2.4, -4.6, 7.4, 7.4)); part(g, E(s * 16, -7, 5.6, 5.6), '#d9c39a', null, { lw: 0.9 }); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; line(g, [s * 16, -7, s * 16 + Math.cos(a) * 5.6, -7 + Math.sin(a) * 5.6], WOODD, 1.2); } ell(g, s * 16, -7, 1.8, 1.8, '#3a2a22', INK, 0.6); }
}
// 쇠테를 두른 큰 바퀴 (승급한 화차)
function ironWheel(g, x, y, r, spokes = 8) {
  part(g, E(x, y, r, r), '#5a3a26', E(x + 2.4, y + 2.4, r - 1, r - 1)); curve(g, p => p.arc(x, y, r - 0.9, 0, TAU), '#4a4a55', 1.8);
  part(g, E(x, y, r - 2.8, r - 2.8), '#c9a874', null, { lw: 0.9 });
  for (let i = 0; i < spokes; i++) { const a = i / spokes * TAU; line(g, [x, y, x + Math.cos(a) * (r - 2.8), y + Math.sin(a) * (r - 2.8)], WOODD, 1.3); }
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + 0.2; ell(g, x + Math.cos(a) * (r - 0.9), y + Math.sin(a) * (r - 0.9), 0.6, 0.6, '#aeb6bd'); }
  part(g, E(x, y, 2.4, 2.4), '#4a4a55', null, { lw: 0.7 }); ell(g, x - 0.6, y - 0.6, 0.7, 0.7, '#aeb6bd');
}
// 신기전 화차: 백 구멍 신기전기를 가파르게 세우고, 약통을 단 신기전을 빽빽이 꽂았다. 뒤에 붉은 영기
export function cartRocket(g) {
  g.save(); g.translate(-19, 8); ITEM.flag('#c8402f', '#e0b23c')(g); g.restore();
  line(g, [-21, -10, -34, -4.6], INK, 4.6); line(g, [-21, -10, -34, -4.6], WOODD, 2.8);
  part(g, P(-19.6, -14, 19.6, -14, 17.4, -5.6, -17.4, -5.6), '#8a2a26', R(-20, -8.6, 40, 4), { hi: R(-19, -13.6, 38, 1.4) });
  for (const x of [-17, 15]) rr(g, x, -14, 2.6, 8.4, 0.6, '#e2b85a', INK, 0.6);
  // 받침대
  line(g, [8, -13, 4, -36], INK, 3.6); line(g, [8, -13, 4, -36], WOODD, 2);
  g.save(); g.translate(-1, -16); g.rotate(-0.5);
  part(g, P(-16, -32, 16, -32, 16, 0, -16, 0), '#b98a55', P(7, -33, 17, -33, 17, 1, 9, 1), { hi: R(-15, -31, 30, 1.6), lw: 1.4 });
  for (const x of [-16, 13.4]) rr(g, x, -32, 2.6, 32, 0.6, '#8a2a26', INK, 0.8);
  for (const y of [-32, -2.6]) rr(g, -16, y, 32, 2.6, 0.6, '#8a2a26', INK, 0.8);
  for (const [x, y] of [[-16, -32], [13.4, -32], [-16, -2.6], [13.4, -2.6]]) rr(g, x, y, 2.6, 2.6, 0.4, '#e2b85a', INK, 0.5);
  for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) { ell(g, -10.4 + c * 4.2, -27.6 + r * 4.6, 1.3, 1.3, '#2e2420'); ell(g, -10.7 + c * 4.2, -27.9 + r * 4.6, 0.4, 0.4, '#6a5a4a'); }
  for (const [x, y] of [[-10.4, -27.6], [-2, -27.6], [6.4, -27.6], [-6.2, -23], [2.2, -23], [10.6, -23], [-10.4, -18.4], [-2, -18.4], [6.4, -13.8], [-6.2, -9.2], [2.2, -9.2]]) {
    line(g, [x, y, x, y - 13], INK, 2.2); line(g, [x, y, x, y - 13], '#e9d9b0', 1.1);
    rr(g, x - 1.4, y - 11.6, 2.8, 4.6, 0.6, '#f3ead2', INK, 0.5); line(g, [x - 1.4, y - 9.6, x + 1.4, y - 9.6], RED, 0.9);
    poly(g, [x - 1.3, y - 12.6, x, y - 16.6, x + 1.3, y - 12.6], '#4a4a55', INK, 0.6);
  }
  g.restore();
  for (const s of [-1, 1]) ironWheel(g, s * 16.4, -7.6, 9.4);
}
// 총통 화차: 쇠테 두른 수레 위에 청동 총통 셋을 층층이 얹었다 (아래가 가장 크다)
export function cartBronze(g) {
  line(g, [-21, -10, -34, -4.6], INK, 4.6); line(g, [-21, -10, -34, -4.6], WOODD, 2.8);
  part(g, P(-19.6, -14.4, 19.6, -14.4, 17.4, -5.6, -17.4, -5.6), '#6b4a30', R(-20, -8.6, 40, 4), { hi: R(-19, -14, 38, 1.4) });
  for (const x of [-12, 0, 12]) rr(g, x - 1, -14.4, 2.2, 8.8, 0.4, '#4a4a55', INK, 0.5);
  // 화약 통과 꽂을대
  part(g, E(-17.6, -19.6, 4, 5.4), '#8a5a30', E(-16, -18.6, 3.2, 4.6), { lw: 1 }); for (const y of [-22.6, -16.6]) line(g, [-21.4, y, -13.8, y], '#4a4a55', 1);
  line(g, [-12, -14, -20, -42], INK, 2); line(g, [-12, -14, -20, -42], WOOD, 1.1); ell(g, -20, -42, 1.6, 1.2, '#e9d9b0', INK, 0.5);
  g.save(); g.translate(-3, -16); g.rotate(-0.2);
  const barrel = (y, L, r) => {
    rr(g, -10, y + r - 1, 8, 3, 0.6, WOODD, INK, 0.7);
    part(g, p => { p.moveTo(-14, y - r); p.lineTo(-14 + L, y - r * 0.82); p.lineTo(-14 + L, y + r * 0.82); p.lineTo(-14, y + r); p.closePath(); }, '#b8873a', p => { p.rect(-15, y + r * 0.2, L + 2, r); }, { hi: R(-12, y - r * 0.7, L - 4, r * 0.35), hic: '#f0d08a', lw: 1.1 });
    for (const t of [0.12, 0.42, 0.7]) rr(g, -14 + L * t - 0.9, y - r * (1 - t * 0.18) - 0.5, 1.8, r * 2 * (1 - t * 0.18) + 1, 0.4, '#8a6020', INK, 0.5);
    rr(g, -14 + L - 2.6, y - r - 0.4, 3.2, r * 2 + 0.8, 0.8, '#a87a2e', INK, 0.8); ell(g, -14 + L + 0.6, y, 0.9, r * 0.5, '#1e1a16', INK, 0.4);
    part(g, E(-15.4, y, 1.8, 1.8), '#8a6020', null, { lw: 0.7 });
    ell(g, -14 + L * 0.3, y - r - 0.6, 0.9, 0.7, '#3a2a22');
  };
  barrel(-2.4, 36, 4.8); barrel(-12, 31, 4.1); barrel(-20.4, 26, 3.4);
  g.restore();
  for (const s of [-1, 1]) ironWheel(g, s * 16.4, -7.6, 9.6, 10);
}
// ───────── 기마 무사 (옆모습 말 + 기수) ─────────
// 군마: 옆모습. 갈기·굴레·가슴걸이·안장·다래까지 갖췄다 (발 가운데가 원점, 오른쪽을 본다)
export function horse(g, o = {}) {
  const C = o.coat || '#9a6a44', D = o.mane || '#2e2a30', far = dk(C, 0.32), hoof = '#2a2630', sad = o.saddle || '#b8342a', tack = o.tack || '#b8342a', cd = dk(C, 0.36);
  // 꼬리
  part(g, p => { p.moveTo(-20.6, -31.4); p.bezierCurveTo(-32, -31, -33, -14, -28, -3.6); p.bezierCurveTo(-26, -10, -25, -19, -19.6, -25); p.closePath(); }, D, null, { lw: 1.1 });
  for (const k of [0.3, 0.7]) curve(g, p => { p.moveTo(-22 - k * 3, -29); p.bezierCurveTo(-28 - k * 2, -24, -28.6 - k, -14, -27.4 + k, -7.4); }, lt(D, 0.3), 0.7);
  const foreleg = (x, col, sh) => { part(g, p => { p.moveTo(x - 2.8, -20); p.lineTo(x - 2.1, -11.4); p.quadraticCurveTo(x - 2.8, -9.6, x - 1.9, -8); p.lineTo(x - 1.7, -3.2); p.lineTo(x + 2.1, -3.2); p.lineTo(x + 2.2, -8); p.quadraticCurveTo(x + 3.1, -9.8, x + 2.4, -11.6); p.lineTo(x + 3, -20); p.closePath(); }, col, sh ? R(x + 0.5, -21, 3, 19) : null, { lw: 1.1 }); part(g, P(x - 2.2, -3.4, x + 2.4, -3.4, x + 3.2, 0.6, x - 2.6, 0.6), hoof, null, { lw: 0.9 }); line(g, [x - 1.9, -3.5, x + 2.2, -3.5], lt(hoof, 0.3), 0.7); };
  const hindleg = (x, col, sh) => { part(g, p => { p.moveTo(x - 4.2, -22); p.quadraticCurveTo(x - 6.6, -13.6, x - 3, -10.6); p.lineTo(x - 2.4, -3.2); p.lineTo(x + 1.4, -3.2); p.lineTo(x + 1.2, -10.4); p.quadraticCurveTo(x + 3.4, -14, x + 4.2, -22); p.closePath(); }, col, sh ? P(x - 0.4, -23, x + 5, -23, x + 2, -2, x - 0.4, -2) : null, { lw: 1.1 }); part(g, P(x - 2.8, -3.4, x + 1.8, -3.4, x + 2.6, 0.6, x - 3.2, 0.6), hoof, null, { lw: 0.9 }); line(g, [x - 2.5, -3.5, x + 1.6, -3.5], lt(hoof, 0.3), 0.7); };
  hindleg(-10.4, far); foreleg(15.2, far);
  // 몸통: 둥근 엉덩이에서 등, 기갑, 가슴으로
  part(g, p => { p.moveTo(-21.4, -27); p.bezierCurveTo(-22.6, -36, -12, -36.8, -4, -34.8); p.bezierCurveTo(2, -33.8, 6.6, -34.6, 9.6, -37.6); p.lineTo(17, -31); p.bezierCurveTo(19.6, -25.6, 17.6, -18.6, 12.6, -16.6); p.bezierCurveTo(4, -13.6, -8, -13.8, -13, -16.2); p.bezierCurveTo(-19.6, -18, -22, -21.4, -21.4, -27); p.closePath(); }, C, p => { p.moveTo(-23, -22.6); p.quadraticCurveTo(0, -17.4, 20, -24); p.lineTo(20, -12); p.lineTo(-23, -12); p.closePath(); }, { hi: E(-12, -33, 6.4, 1.7, -0.1), hk: 0.22, lw: 1.3 });
  curve(g, p => { p.moveTo(-9.4, -32.4); p.quadraticCurveTo(-6.6, -25, -11.6, -19.4); }, cd, 0.8); curve(g, p => { p.moveTo(12.4, -31.4); p.quadraticCurveTo(9.6, -25.6, 12.6, -20); }, cd, 0.8);
  hindleg(-16, C, true); foreleg(9.4, C, true);
  // 목과 머리
  part(g, p => { p.moveTo(7.6, -36.8); p.bezierCurveTo(10.6, -44, 13.6, -50, 18, -55.4); p.lineTo(24.4, -51); p.bezierCurveTo(22, -45, 21.6, -38, 18, -29.4); p.lineTo(9.6, -30.4); p.closePath(); }, C, P(17.6, -47, 26, -52, 22, -28, 13.6, -29), { lw: 0 });
  curve(g, p => { p.moveTo(23.6, -47.6); p.bezierCurveTo(21.8, -43, 21.2, -37, 18.4, -30.4); }, INK, 1.3);
  const head = p => { p.moveTo(17, -55.8); p.quadraticCurveTo(21.6, -58.4, 25.4, -54.6); p.lineTo(34.4, -43.6); p.quadraticCurveTo(37, -40.2, 34.8, -37.2); p.quadraticCurveTo(32.6, -35, 29.6, -36.4); p.quadraticCurveTo(26, -38.4, 24.2, -42.8); p.quadraticCurveTo(22.4, -46.8, 19, -47.8); p.closePath(); };
  part(g, P(17.2, -55.6, 17.4, -62.4, 20.6, -57), far, null, { lw: 1 });
  g.beginPath(); head(g); g.fillStyle = C; g.fill(); g.save(); g.clip(); g.fillStyle = cd; g.beginPath(); g.moveTo(19, -47.6); g.quadraticCurveTo(24.6, -46, 26.4, -40.6); g.lineTo(31, -34); g.lineTo(18, -34); g.closePath(); g.globalAlpha = 0.5; g.fill(); g.globalAlpha = 1; ell(g, 35.4, -39, 4.4, 4.8, dk(C, 0.34)); g.fillStyle = lt(C, 0.26); g.beginPath(); g.moveTo(21.4, -56.4); g.lineTo(24.6, -54.6); g.lineTo(31.4, -46); g.lineTo(29.8, -45.6); g.closePath(); g.fill(); if (o.blaze) path(g, P(23.6, -55.4, 26, -53.6, 33.6, -43.4, 31.6, -43), WHITE); g.restore(); g.beginPath(); head(g); st(g, INK, 1.3);
  part(g, P(19.6, -56.4, 21.2, -63.6, 23.6, -57.2), C, P(21.4, -63, 23.8, -57, 21.6, -57), { lw: 1 }); line(g, [21, -61, 21.6, -57.6], cd, 0.7);
  ell(g, 25.6, -50.2, 1.3, 1.55, '#1e1a22'); ell(g, 25.2, -50.8, 0.42, 0.42, '#fff'); curve(g, p => { p.moveTo(23.8, -51.6); p.quadraticCurveTo(25.6, -52.6, 27.2, -51.2); }, INK, 0.8);
  ell(g, 34.5, -40.6, 0.75, 1.15, INK, null, 0, 0.5); curve(g, p => { p.moveTo(31.2, -37); p.quadraticCurveTo(33.4, -37.2, 35.2, -38.4); }, INK, 0.8);
  // 마갑: 비늘을 엮은 목·몸 가리개 (기창 돌격대). 아래 가장자리에 금빛 띠와 붉은 술
  if (o.barding) {
    const B = o.barding, bt = o.bardTrim || '#d6a640';
    const nk = p => { p.moveTo(9, -37.4); p.bezierCurveTo(11.8, -43.6, 14.6, -49, 18.4, -53.8); p.lineTo(23.2, -50.2); p.bezierCurveTo(21.4, -44.6, 20.8, -38, 18.2, -30.6); p.lineTo(9.6, -31.4); p.closePath(); };
    part(g, nk, B, P(17, -52, 25, -52, 21, -30, 14, -30), { lw: 1.1 }); g.save(); g.beginPath(); nk(g); g.clip(); armourPattern(g, 'lamellar', B, 8, -55, 24, -30); g.restore();
    const bd = p => { p.moveTo(-22.2, -26); p.bezierCurveTo(-23, -35.6, -12, -36.4, -4, -34.4); p.bezierCurveTo(2, -33.4, 6.6, -34.2, 9.6, -37.2); p.lineTo(17.6, -30.6); p.bezierCurveTo(20, -25.4, 18.8, -17.6, 15, -14.4); for (let i = 0; i <= 8; i++) { const x = 15 - i * 4.1; p.quadraticCurveTo(x - 2, -11.2, x - 4.1, -14 + (i === 8 ? -2 : 0)); } p.lineTo(-22.2, -26); p.closePath(); };
    part(g, bd, B, p => { p.moveTo(-24, -21.6); p.quadraticCurveTo(0, -16.4, 21, -23); p.lineTo(21, -10); p.lineTo(-24, -10); p.closePath(); }, { hi: E(-12, -33, 6.4, 1.6, -0.1), lw: 1.3 });
    g.save(); g.beginPath(); bd(g); g.clip(); armourPattern(g, 'lamellar', B, -23, -37, 20, -11); g.restore();
    curve(g, p => { p.moveTo(-21.6, -18.4); p.bezierCurveTo(-12, -14.4, 6, -14.2, 16, -16.4); }, bt, 1.6);
    for (let i = 0; i < 5; i++) { const x = 11 - i * 7.6; path(g, P(x - 1, -14.8, x + 1, -14.8, x + 1.6, -9.6, x - 1.6, -9.6), RED, INK, 0.6); ell(g, x, -15, 0.9, 0.9, bt, INK, 0.4); }
  }
  // 갈기와 앞머리
  part(g, p => { p.moveTo(18.6, -57); p.quadraticCurveTo(11.6, -55, 12.4, -49.4); p.lineTo(10, -49); p.quadraticCurveTo(7.6, -44.6, 9.2, -41.6); p.lineTo(6.6, -41.2); p.quadraticCurveTo(4.6, -37.6, 6.4, -34.2); p.lineTo(9.6, -36.6); p.bezierCurveTo(12, -43.6, 14.6, -49.6, 19, -54.6); p.closePath(); }, D, null, { lw: 1.1 });
  for (const [x0, y0, x1, y1] of [[16.4, -54, 13.4, -50], [13, -47.6, 10.6, -43.6], [10.4, -41, 8, -37]]) line(g, [x0, y0, x1, y1], lt(D, 0.3), 0.7);
  part(g, p => { p.moveTo(18.6, -57.6); p.quadraticCurveTo(24.4, -57.6, 26.4, -52); p.quadraticCurveTo(22.8, -54, 19.4, -53.4); p.closePath(); }, D, null, { lw: 1 });
  // 면갑: 말 얼굴을 덮는 쇠 가리개와 정수리의 붉은 술
  if (o.barding) { part(g, P(19.8, -56.6, 24.8, -55.2, 33.2, -44.6, 31.4, -42.6, 24, -49.4, 19.6, -52.6), o.chamfron || '#c9ced2', P(26, -53, 34, -44, 30, -42, 24, -50), { hi: P(21, -55.6, 23.6, -55, 30, -46.6, 29, -46), lw: 1.1 }); for (const [x, y] of [[22.4, -54], [26.6, -50.2], [30.4, -45.6]]) ell(g, x, y, 0.65, 0.65, o.bardTrim || '#d6a640', INK, 0.3); for (let k = 0; k < 5; k++) { const a = -2.2 + k * 0.28, fn = p => { p.moveTo(20.6, -58); p.quadraticCurveTo(20.6 + Math.cos(a) * 4, -58 + Math.sin(a) * 6, 20.6 + Math.cos(a) * 7.4, -58 + Math.sin(a) * 7.8); }; curve(g, fn, INK, 2.2); curve(g, fn, RED, 1.2); } }
  // 굴레와 고삐
  rope(g, p => { p.moveTo(30.8, -48); p.lineTo(27, -40.4); }, tack, 0.9); rope(g, p => { p.moveTo(20.6, -55); p.lineTo(28.6, -41.8); }, tack, 0.9);
  rope(g, p => { p.moveTo(28.4, -41.2); p.quadraticCurveTo(20, -32.6, 6, -37.4); }, tack, 0.9); ell(g, 28.4, -41.2, 1.4, 1.4, '#d6a640', INK, 0.6);
  // 가슴걸이와 붉은 상모, 밀치끈, 뱃대끈
  rope(g, p => { p.moveTo(6, -31.8); p.quadraticCurveTo(13, -26.6, 18.2, -28.4); }, tack, 1.1); part(g, p => { p.moveTo(14.4, -27); p.quadraticCurveTo(12.8, -22, 14.8, -20.4); p.lineTo(17.6, -20.6); p.quadraticCurveTo(18.6, -23, 16.6, -27.2); p.closePath(); }, RED, R(16, -28, 3, 8), { lw: 0.8 }); ell(g, 15.5, -27.2, 1.3, 1.1, '#d6a640', INK, 0.5);
  rope(g, p => { p.moveTo(-8, -33.6); p.quadraticCurveTo(-15, -33.4, -20.4, -30.6); }, tack, 1); rope(g, p => { p.moveTo(1, -22); p.lineTo(0.6, -14.8); }, '#3a2a26', 1.3);
  // 다래(안장 깔개)와 안장
  part(g, p => { p.moveTo(-9.6, -35); p.lineTo(8, -35.4); p.lineTo(9.6, -22.6); p.quadraticCurveTo(9.4, -20.4, 7, -20.2); p.lineTo(-9, -19.8); p.quadraticCurveTo(-11.4, -20, -11.4, -22.4); p.closePath(); }, sad, R(-12, -24.4, 22, 5), { hi: R(-10, -35.4, 18, 1.5), lw: 1.1 });
  curve(g, p => { p.moveTo(-8.4, -33); p.lineTo(-9.4, -22.6); p.lineTo(7.4, -22.4); p.lineTo(6.4, -33.4); }, '#d6a640', 0.9); for (const x of [-5, -1, 3]) ell(g, x, -28, 1, 1, '#d6a640', INK, 0.35);
  part(g, p => { p.moveTo(-10.2, -34.4); p.quadraticCurveTo(-10.6, -41, -6.4, -41.4); p.quadraticCurveTo(-5, -38, -4.4, -34.6); p.closePath(); }, '#5a3a26', null, { lw: 1 }); part(g, p => { p.moveTo(4, -35); p.quadraticCurveTo(5, -40.4, 8.4, -40.6); p.quadraticCurveTo(9.4, -37.6, 8.6, -34.8); p.closePath(); }, '#5a3a26', null, { lw: 1 });
  curve(g, p => { p.moveTo(-9.6, -37); p.quadraticCurveTo(-9, -40.2, -6.6, -40.4); }, '#d6a640', 0.8); curve(g, p => { p.moveTo(5, -37.4); p.quadraticCurveTo(6, -39.8, 8, -39.8); }, '#d6a640', 0.8);
}
export function boar(g, o = {}) {
  // 멧돼지: 어깨가 산처럼 솟고 엉덩이로 갈수록 낮아지는 쐐기꼴 몸, 등을 따라 곤두선 갈기, 굽은 엄니, 갈라진 발굽
  const Bc = '#6b5240', D = '#3e2e24', L2 = '#8a6c56', far = dk(Bc, 0.3);
  // 꼬리: 가늘게 말리고 끝에 털술
  curve(g, p => { p.moveTo(-20, -24); p.bezierCurveTo(-26, -25, -27, -31, -23, -32); p.quadraticCurveTo(-20, -32, -21.6, -29); }, INK, 2.6); curve(g, p => { p.moveTo(-20, -24); p.bezierCurveTo(-26, -25, -27, -31, -23, -32); p.quadraticCurveTo(-20, -32, -21.6, -29); }, Bc, 1.2);
  part(g, P(-23, -32, -26.6, -35.4, -24.6, -31, -27.4, -31.6), D, null, { lw: 0.8 });
  // 발굽 다리 하나: 위가 굵고 발목에서 가늘어지며, 끝은 두 갈래 발굽
  const leg = (x, col, thick, near) => {
    part(g, p => { p.moveTo(x - thick, -16); p.quadraticCurveTo(x - thick - 0.4, -9, x - 1.8, -4.4); p.lineTo(x + 2.2, -4.4); p.quadraticCurveTo(x + thick * 0.9, -10, x + thick, -16); p.closePath(); }, col, near ? R(x + 0.4, -17, thick + 1, 13) : null, { k: 0.22, lw: 1.1 });
    part(g, p => { p.moveTo(x - 2.4, -4.6); p.lineTo(x + 2.8, -4.6); p.lineTo(x + 3.4, 0.6); p.lineTo(x - 2.8, 0.6); p.closePath(); }, '#2a221e', null, { lw: 1 });
    line(g, [x + 0.3, -3.6, x + 0.3, 0.6], '#6a5a50', 0.8);   // 발굽의 갈라진 금
  };
  leg(-12, far, 3.6, false); leg(10, far, 3.2, false);
  // 몸통: 솟은 어깨 → 내려앉는 등 → 둥근 엉덩이, 배는 둥글게 처진다
  part(g, p => { p.moveTo(-21.4, -16); p.bezierCurveTo(-24, -24, -21, -30, -12, -31.4); p.bezierCurveTo(-4, -33, 2, -37.6, 9, -37); p.bezierCurveTo(16, -36, 19, -31, 20.6, -26); p.lineTo(20, -12.6); p.bezierCurveTo(12, -9, 2, -8.6, -6, -9.8); p.bezierCurveTo(-13, -10.6, -19, -11.6, -21.4, -16); p.closePath(); },
    Bc, p => { p.moveTo(-24, -18.6); p.bezierCurveTo(-8, -13.6, 8, -13.4, 22, -17); p.lineTo(22, -6); p.lineTo(-24, -6); p.closePath(); }, { hi: p => { p.moveTo(-16, -30); p.bezierCurveTo(-6, -31.6, 2, -35.6, 9, -35.4); p.lineTo(9, -33.4); p.bezierCurveTo(2, -33, -6, -29.4, -16, -27.8); p.closePath(); }, hic: L2, lw: 1.3 });
  // 거친 털 결: 몸 옆으로 비스듬히 눕는다
  for (const [x, y] of [[-16, -22], [-10, -18], [-4, -24], [2, -19], [8, -27], [12, -21], [-12, -27], [4, -30]]) curve(g, p => { p.moveTo(x, y); p.quadraticCurveTo(x - 1.6, y + 2.4, x - 3.6, y + 3.2); }, dk(Bc, 0.38), 0.9);
  for (const [x, y] of [[-8, -28], [0, -32], [10, -32]]) curve(g, p => { p.moveTo(x, y); p.quadraticCurveTo(x - 1.4, y + 2, x - 3, y + 2.6); }, L2, 0.8);
  // 등을 따라 곤두선 검은 갈기 (어깨에서 가장 길다)
  part(g, p => { p.moveTo(-16, -30.6); const sp = [[-13, -35.4], [-10, -32.4], [-7, -37.4], [-4, -33.6], [-0.6, -39.6], [2.4, -35.8], [5.6, -41.4], [8.4, -37.2], [11.6, -41], [13.6, -36], [16.6, -38], [17.6, -33.4]]; for (const [x, y] of sp) p.lineTo(x, y); p.bezierCurveTo(14, -35.4, 6, -36.6, 0, -34.6); p.bezierCurveTo(-6, -32.4, -12, -31.4, -16, -30.6); p.closePath(); }, D, null, { lw: 1 });
  // 가까운 다리
  leg(-15.6, Bc, 4.4, true); leg(6.6, Bc, 3.8, true);
  // 머리: 이마에서 길게 뻗은 주둥이, 끝에 둥근 코판
  part(g, p => { p.moveTo(13, -33); p.bezierCurveTo(18, -33, 24, -26, 29, -21.4); p.lineTo(30.4, -14); p.quadraticCurveTo(26, -10.4, 20, -10); p.bezierCurveTo(16, -10.4, 13, -14, 12.6, -20); p.closePath(); },
    Bc, p => { p.moveTo(12, -17); p.lineTo(31, -17.6); p.lineTo(31, -8); p.lineTo(12, -8); p.closePath(); }, { hi: E(18, -28, 3.6, 1.6, 0.6), hic: L2, lw: 1.3 });
  part(g, E(30.2, -17.6, 2.6, 4.2, -0.25), '#c98a7a', E(31.2, -16.4, 2, 3.2, -0.25), { lw: 1.1 }); for (const y of [-18.8, -16.2]) ell(g, 30.4, y, 0.6, 0.85, INK);   // 코판과 콧구멍
  for (const [x, y] of [[21, -25.4], [23.6, -23], [26, -20.6]]) curve(g, p => { p.moveTo(x - 1, y - 1.2); p.quadraticCurveTo(x + 0.4, y - 0.4, x + 0.2, y + 1.2); }, dk(Bc, 0.4), 0.8);   // 주둥이의 주름
  // 굽은 엄니: 아래턱 모서리에서 위로 휘어 올라간다
  part(g, p => { p.moveTo(22.6, -11.6); p.bezierCurveTo(26.4, -13, 27.6, -17.6, 25.6, -21.8); p.quadraticCurveTo(25.4, -17, 22.4, -14.4); p.closePath(); }, '#f6ecd0', null, { lw: 0.9 });
  // 귀: 뾰족하게 뒤로 젖혔다 (안쪽은 분홍 살)
  part(g, P(10.6, -31.6, 8.6, -40.4, 15.4, -33.4), Bc, null, { lw: 1 }); part(g, P(11.4, -32.6, 10.2, -38, 14, -33.6), '#c98a7a', null, { lw: 0 });
  // 성난 작은 눈과 눈썹
  if (o.blink) line(g, [16.4, -26.4, 20, -25.6], INK, 1.4); else { ell(g, 18.2, -26.2, 1.9, 1.6, '#f6c84a', INK, 0.8); ell(g, 18.5, -26, 0.7, 1.1, '#8a1f1c'); }
  line(g, [15, -29.6, 20.8, -27.4], INK, 1.7);
}
// ───────── 투석기 ─────────
export function catapult(g) {
  for (const s of [-1, 1]) { part(g, E(s * 15, -6, 7.8, 7.8), WOODD, E(s * 15 + 2.2, -4, 6.6, 6.6)); for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + 0.4; line(g, [s * 15, -6, s * 15 + Math.cos(a) * 7, -6 + Math.sin(a) * 7], '#5a3a26', 1.1); } ell(g, s * 15, -6, 2.1, 2.1, '#3a2a22', INK, 0.6); }
  part(g, p => p.rect(-19.6, -16.6, 39.2, 9), '#9a6a3c', R(-20, -11, 40, 4), { hi: R(-19, -16, 38, 1.4), lw: 1.3 });
  for (const s of [-1, 1]) part(g, P(s * 10.4, -15.4, s * 6.2, -31, s * 2.4, -31, s * 5.6, -15.4), '#b98a55', s > 0 ? P(7, -31, 11, -15, 8, -15) : null, { lw: 1.1 });
  part(g, p => p.rect(-9, -33.6, 18, 4.8), WOODD, R(-9, -31, 18, 2.4), { lw: 1.1 }); rope(g, p => { p.moveTo(-6, -31); p.lineTo(-7, -17); }, '#d9c39a', 1);
  part(g, E(0, -11.8, 4.8, 4.4), '#d9603f', E(1.4, -10.6, 4, 3.6), { lw: 1 }); for (const s of [-1, 1]) ell(g, s * 1.7, -12.2, 0.9, 1.1, INK); poly(g, [-1.1, -15.8, 0, -19.6, 1.1, -15.8], '#f3e7c8', INK, 0.7);
}
// ───────── 당산 할배: 목신 (두목) ─────────
export function mokshin(g) {
  const bark = '#8a6844', bd = '#6f5234';
  for (const x of [-16, -6, 6, 16]) part(g, p => { p.moveTo(x - 6.6, -1); p.quadraticCurveTo(x, -9, x + 6.6, -1); p.quadraticCurveTo(x, 2.6, x - 6.6, -1); p.closePath(); }, bd, null, { lw: 1.1 });
  for (const s of [-1, 1]) { rope(g, p => { p.moveTo(s * 10, -34); p.quadraticCurveTo(s * 21, -38, s * 23, -48); }, bark, 3); rope(g, p => { p.moveTo(s * 16, -37.6); p.quadraticCurveTo(s * 24, -33, s * 27, -37); }, bark, 1.8); }
  part(g, p => { p.moveTo(-14.6, -3); p.quadraticCurveTo(-9, -22, -11.4, -43); p.lineTo(11.4, -43); p.quadraticCurveTo(9, -22, 14.6, -3); p.quadraticCurveTo(0, 1, -14.6, -3); p.closePath(); }, bark, P(4, -44, 16, -44, 16, 0, 6, 0), { hi: P(-10.6, -42, -8.6, -42, -9.6, -8, -12.6, -6), hk: 0.16, lw: 1.4 });
  for (const [x, y0, y1, c] of [[-7.4, -38, -6, 1], [6.6, -36, -7, -1], [0.6, -15, -4, 1], [-3.6, -20, -9, -1], [9, -22, -10, 1]]) curve(g, p => { p.moveTo(x, y0); p.quadraticCurveTo(x + c * 2, (y0 + y1) / 2, x + c * 0.6, y1); }, bd, 1);
  ell(g, -8, -12, 1.6, 2.4, bd, '#4a3a26', 0.7);
  // 옹이 얼굴: 깊게 팬 눈에서 노란 빛이 샌다
  for (const s of [-1, 1]) { part(g, E(s * 5.2, -30.4, 3.9, 3.2, s * 0.25), '#2e2420', null, { lw: 1.1 }); ell(g, s * 5, -30.2, 2.3, 1.9, '#f0d264', null, 0, s * 0.25); ell(g, s * 4.8, -30, 1, 1.4, '#3a2a12'); path(g, P(s * 10, -35.6, s * 1.6, -33, s * 2, -31.4, s * 9.6, -33.4), '#4a3a26'); }
  part(g, p => { p.moveTo(-6.4, -24.4); p.lineTo(-3.2, -21.8); p.lineTo(0, -24.8); p.lineTo(3.2, -21.8); p.lineTo(6.4, -24.4); p.lineTo(4.2, -17.6); p.lineTo(-4.2, -17.6); p.closePath(); }, '#2e2420', null, { lw: 1 });
  // 금줄과 오색 천
  rope(g, p => { p.moveTo(-12.8, -14.6); p.quadraticCurveTo(0, -10.6, 12.8, -14.6); }, '#d9b77a', 2);
  [[-9.4, WHITE], [-5.2, RED], [-1, WHITE], [3.2, INDIGO], [7.4, OCHRE]].forEach(([x, c]) => rr(g, x, -13 + Math.abs(x) * 0.07, 2.6, 7.6, 0.5, c, INK, 0.6));
  for (const [x, y, rx] of [[-14, -51, 15], [13, -55, 14], [0, -64, 16], [-22, -44, 8], [22, -47, 8]]) { part(g, E(x, y, rx, rx * 0.48), TEAL, E(x + rx * 0.26, y + rx * 0.2, rx * 0.86, rx * 0.36), { hi: E(x - rx * 0.3, y - rx * 0.2, rx * 0.4, rx * 0.1), hic: '#6f9a86', lw: 1.2 }); for (let i = -1; i <= 1; i++) line(g, [x + i * rx * 0.4, y - rx * 0.3, x + i * rx * 0.44, y + rx * 0.14], '#2c4f44', 0.9); }
}
// ───────── 어둑시니 (두목) ─────────
export function eoduksini(g) {
  const D = '#2a2440', M = '#3d3560';
  g.globalAlpha = 0.28; for (const [x, y, r] of [[-14, -6, 9], [13, -4, 10], [0, -2, 12]]) ell(g, x, y, r, r * 0.5, '#6a5a9a'); g.globalAlpha = 1;
  for (const s of [-1, 1]) { rope(g, p => { p.moveTo(s * 11, -34); p.quadraticCurveTo(s * 25, -30, s * 21.6, -12); }, D, 4.8); for (const dx of [-3, 0, 3]) { line(g, [s * 21.6 + dx, -12.4, s * 21.6 + dx * 1.6, -4.6], INK, 2.4); line(g, [s * 21.6 + dx, -12.4, s * 21.6 + dx * 1.6, -4.6], '#e9e4d8', 1.2); } }
  part(g, p => {
    p.moveTo(-15.4, -2); p.lineTo(-11.6, -7.6); p.lineTo(-8, -0.6); p.lineTo(-4, -7); p.lineTo(0, 0.6); p.lineTo(4, -7); p.lineTo(8, -0.6); p.lineTo(11.6, -7.6); p.lineTo(15.4, -2);
    p.quadraticCurveTo(17.6, -30, 11.4, -44.4); p.lineTo(13.6, -56); p.lineTo(7.2, -51); p.lineTo(5.2, -61); p.lineTo(0, -53); p.lineTo(-5.2, -61); p.lineTo(-7.2, -51); p.lineTo(-13.6, -56); p.lineTo(-11.4, -44.4); p.quadraticCurveTo(-17.6, -30, -15.4, -2); p.closePath();
  }, D, P(4, -62, 18, -62, 18, 1, 6, 1), { shc: '#1c1830', hi: P(-12.6, -42, -10, -42, -12.6, -8, -15, -6), hic: M, lw: 1.4 });
  for (const [y, w] of [[-10, 8], [-18, 10], [-26, 10.6]]) curve(g, p => { p.moveTo(-w, y); p.quadraticCurveTo(0, y - 9, w, y); }, M, 1.5);
  part(g, p => { p.moveTo(-8.8, -41.4); p.quadraticCurveTo(-9.2, -50.4, 0, -50.4); p.quadraticCurveTo(9.2, -50.4, 8.8, -41.4); p.quadraticCurveTo(6.8, -30.4, 0, -29.4); p.quadraticCurveTo(-6.8, -30.4, -8.8, -41.4); p.closePath(); }, '#ece7da', P(3.6, -52, 10, -52, 10, -28, 0.6, -28, 6, -36), { k: 0.14, lw: 1.3 });
  for (const s of [-1, 1]) { part(g, p => { p.moveTo(s * 1.4, -41.6); p.quadraticCurveTo(s * 4.6, -46.4, s * 7.4, -41.8); p.quadraticCurveTo(s * 4.4, -39.6, s * 1.4, -41.6); p.closePath(); }, '#1c1830', null, { lw: 0.9 }); ell(g, s * 4.4, -42.2, 1.3, 1.5, '#ff5a3c'); ell(g, s * 4.4, -42.2, 0.5, 0.7, '#ffe9a0'); }
  part(g, p => { p.moveTo(-5.8, -36.8); p.lineTo(-3.8, -34.6); p.lineTo(-1.9, -36.8); p.lineTo(0, -34.6); p.lineTo(1.9, -36.8); p.lineTo(3.8, -34.6); p.lineTo(5.8, -36.8); p.quadraticCurveTo(0, -30.2, -5.8, -36.8); p.closePath(); }, '#2e2230', null, { lw: 0.9 });
  ell(g, 0, -46.6, 1.3, 1.5, '#e0503f', INK, 0.5); for (const s of [-1, 1]) line(g, [s * 6.4, -47.6, s * 7.6, -44.4], '#b9b3a2', 0.8);
}
// ───────── 허수아비 · 말뚝 · 군기 수레 ─────────
export function scarecrow(g) {
  line(g, [0, 4, 0, -30], INK, 3.8); line(g, [0, 4, 0, -30], '#8a6a3c', 2.1);
  line(g, [-19.6, -27, 19.6, -27], INK, 3.6); line(g, [-19.6, -27, 19.6, -27], '#8a6a3c', 1.9);
  part(g, p => { p.moveTo(-17.4, -31.4); p.lineTo(17.4, -31.4); p.lineTo(15.4, -22); p.lineTo(8.8, -24.4); p.lineTo(10.8, -6); p.lineTo(6, -9.4); p.lineTo(2.6, -4.4); p.lineTo(-1.6, -9.4); p.lineTo(-5.6, -4.4); p.lineTo(-10.8, -7.4); p.lineTo(-8.8, -24.4); p.lineTo(-15.4, -22); p.closePath(); }, '#d8cfb2', P(4, -32, 18, -32, 18, -3, 6, -3), { k: 0.16 });
  rr(g, -6.6, -19.4, 6.2, 6.2, 0.6, '#a84a32', INK, 0.8); for (const [x, y] of [[-6.6, -19.4], [-0.4, -13.2]]) line(g, [x - 0.8, y + 0.4, x + 0.8, y - 0.8], INK, 0.5); rr(g, 2, -14.4, 5.2, 5.2, 0.6, INDIGO, INK, 0.8);
  for (const s of [-1, 1]) for (const d of [-2.2, 0, 2.2]) line(g, [s * 17.4, -27 + d, s * 23, -27 + d * 2.3], '#d9b24a', 1.2);
  for (const x of [-7, -3.5, 0, 3.5, 7]) line(g, [x, -6, x * 1.25, -0.6], '#d9b24a', 1.2);
  part(g, E(0, -38, 7.6, 7.4), '#ecdcae', E(2.6, -36.4, 6.4, 6.2), { k: 0.14 }); for (const [a, b] of [[-4.4, -39.8], [-4.4, -38.2]]) line(g, [a, b, -1.6, b === -39.8 ? -38.2 : -39.8], INK, 1.1); ell(g, 3, -38.8, 1.1, 1.3, INK); line(g, [-3.2, -34, 3.8, -34.2], INK, 1); for (const x of [-1.8, 0.2, 2.2]) line(g, [x, -35, x, -33.2], INK, 0.5);
  g.save(); g.translate(0, 4.4); HATS.paeraeng(g); g.restore();
}
// 쓰러진 자리에 남는 것: 도깨비는 사람이 쓰다 버린 헌 물건으로, 망령은 이름 적힌 호패로 돌아간다
export const LEFTOVER = {
  // 몽당빗자루
  broom(g) { g.rotate(-0.5); line(g, [0, 0, 0, -13], INK, 3.6); line(g, [0, 0, 0, -13], '#b98a55', 2); part(g, p => { p.moveTo(-3, -1); p.lineTo(-6.4, 9); p.lineTo(-2.6, 8); p.lineTo(-1.4, 10.4); p.lineTo(1.2, 8.4); p.lineTo(3, 10.4); p.lineTo(6, 8.6); p.lineTo(3, -1); p.closePath(); }, '#d9b24a', P(0.6, -2, 7, -2, 7, 11, 1.6, 11), { lw: 1.1 }); for (const x of [-2, 0.4, 2.6]) line(g, [x * 0.5, 1, x * 1.5, 8], '#a8843c', 0.6); line(g, [-3.2, 1, 3.2, 1], RED, 1.4); },
  // 빨랫방망이
  bat(g) { g.rotate(0.9); part(g, p => { p.moveTo(-1.5, 8); p.lineTo(-1.5, 0); p.quadraticCurveTo(-4.2, -3, -3.6, -12); p.quadraticCurveTo(0, -14.6, 3.6, -12); p.quadraticCurveTo(4.2, -3, 1.5, 0); p.lineTo(1.5, 8); p.closePath(); }, WOOD, P(0.6, -15, 5, -15, 5, 9, 0.6, 9), { hi: R(-2.6, -11, 1, 9), hk: 0.24, lw: 1.1 }); line(g, [-1.5, 5, 1.5, 5.4], WOODD, 0.8); },
  // 짚신
  sandal(g) { g.rotate(0.3); part(g, E(0, 0, 8.6, 4.6), '#d9b77a', E(2.6, 1.6, 7, 3.6), { k: 0.18, lw: 1.1 }); for (const x of [-5, -2, 1, 4]) line(g, [x, -3.2, x + 0.6, 3.2], '#a8843c', 0.6); curve(g, p => { p.moveTo(-3.6, -3.6); p.quadraticCurveTo(1, -8.6, 6.4, -2.4); }, INK, 2.2); curve(g, p => { p.moveTo(-3.6, -3.6); p.quadraticCurveTo(1, -8.6, 6.4, -2.4); }, '#e6cc94', 1.1); },
  // 솥뚜껑
  lid(g) { part(g, E(0, -1, 10.6, 5), '#3a3a44', E(3.4, 1, 9, 4), { hi: E(-4, -2.8, 3.6, 1), hic: '#6e6e7c', lw: 1.2 }); curve(g, p => p.ellipse(0, -1, 6.4, 2.8, 0, 0, PI * 2), '#55555f', 0.8); part(g, E(0, -3.6, 2.4, 1.7), '#4a4a55', E(0.9, -3, 1.8, 1.2), { lw: 0.9 }); },
  // 부지깽이
  poker(g) { g.rotate(1.15); line(g, [0, 9, 0, -12], INK, 3.4); line(g, [0, 9, 0, -12], '#8a6a3c', 1.9); line(g, [0, -6, 0, -12], '#2b2a30', 2.1); ell(g, 0, -12, 1.4, 1.6, '#d9553f', INK, 0.6); },
  // 호패: 줄에 꿴 이름패
  hopae(g) { g.rotate(-0.25); curve(g, p => { p.moveTo(0, -9); p.quadraticCurveTo(7, -13, 9.6, -6); }, RED, 1); part(g, p => { p.moveTo(-3.6, -9.4); p.lineTo(3.6, -9.4); p.lineTo(3.6, 5.4); p.lineTo(-3.6, 5.4); p.closePath(); }, '#e3c890', R(0.6, -9.4, 3, 15), { k: 0.16, lw: 1.1 }); ell(g, 0, -7.2, 0.9, 0.9, INK); for (const y of [-3.6, -0.6, 2.4]) line(g, [-1.4, y, 1.4, y + 0.5], INK, 1); },
};
export function stakeLog(g) { g.save(); g.rotate(0.12); part(g, P(-5, 2, -5, -30, 0, -40, 5, -30, 5, 2), WOOD, P(1, -41, 6, -41, 6, 3, 1.6, 3), { hi: P(-4, -29, -2.6, -30, -2.6, 0, -4, 0), hk: 0.2, lw: 1.3 }); rr(g, -5.6, -14, 11.2, 3.4, 1, '#d9b77a', INK, 0.8); g.restore(); ell(g, 0, 2, 7, 2.6, '#8a6844', INK, 1); }
export function bannerCart(g) {
  line(g, [-22, -12, -34, -6], INK, 4.2); line(g, [-22, -12, -34, -6], WOODD, 2.6);
  line(g, [-6, -16, -6, -100], INK, 4.4); line(g, [-6, -16, -6, -100], '#7a3a2a', 2.6); poly(g, [-9, -100, -6, -108.6, -3, -100], OCHRE, INK, 0.9);
  part(g, p => { p.moveTo(-6, -98); p.lineTo(34, -95); p.quadraticCurveTo(29, -80, 34, -64); p.lineTo(-6, -61); p.closePath(); }, INDIGO, p => { p.moveTo(14, -100); p.quadraticCurveTo(20, -80, 16, -60); p.lineTo(36, -60); p.lineTo(36, -100); p.closePath(); }, { hi: P(-5, -96, 2, -95.6, 3, -64, -5, -63), hk: 0.14, lw: 1.4 });
  path(g, P(-6, -98, 34, -95, 33.2, -91.4, -6, -94.4), RED); path(g, P(-6, -61, 34, -64, 33.2, -67.6, -6, -64.6), RED);
  curve(g, p => { p.moveTo(-6, -98); p.lineTo(34, -95); p.quadraticCurveTo(29, -80, 34, -64); p.lineTo(-6, -61); }, INK, 1.4);
  part(g, E(13, -79.6, 9.4, 9.4), WHITE, E(15, -77.6, 8, 8), { k: 0.1, lw: 1 }); taegeuk(g, 13, -79.6, 6.9, -0.5, [RED, INDIGO, OCHRE], 0.8);   // 군기 가운데의 삼태극
  for (const y of [-58, -50]) line(g, [-6, y, -12, y + 6], OCHRE, 1.3);
  part(g, p => p.rect(-24, -20, 48, 10), '#9a6a3c', R(-24, -14.6, 48, 5), { hi: R(-23, -19.4, 46, 1.4), lw: 1.3 }); for (const x of [-18, -8, 2, 12]) line(g, [x, -19, x, -11], WOODD, 0.9);
  part(g, p => p.rect(4, -36, 18, 16), '#a8322a', R(15, -37, 8, 18)); part(g, E(13, -36, 9, 3.4), '#f3e7c8', E(15, -35, 7.6, 2.6), { k: 0.12, lw: 1.1 }); for (const x of [8, 13, 18]) line(g, [x, -32, x, -21], OCHRE, 1);
  for (const s of [-1, 1]) { part(g, E(s * 15, -8, 9.2, 9.2), WOODD, E(s * 15 + 2.6, -5.4, 8, 8)); part(g, E(s * 15, -8, 6, 6), '#d9c39a', null, { lw: 0.9 }); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; line(g, [s * 15, -8, s * 15 + Math.cos(a) * 6, -8 + Math.sin(a) * 6], WOODD, 1.2); } ell(g, s * 15, -8, 1.9, 1.9, '#3a2a22', INK, 0.6); }
}
