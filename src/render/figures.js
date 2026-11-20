// 인형 그림: 사람과 도깨비는 몸과 머리를 따로 오린 관절 종이 인형, 그 밖의 요괴·탈것은 한 장
// 모든 그림은 발이 원점(0,0), 위쪽이 -y. 셀 음영(오른쪽 아래 그늘 + 왼쪽 위 빛)과 먹선으로 그린다
import { TAU, INK, RED, INDIGO, TEAL, OCHRE, SKIN, st, ell, rr, poly, line, path } from './draw.js';

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

// ───────── 얼굴 ─────────
// 가늘고 긴 눈매: 붓으로 그은 윗눈꺼풀이 눈꼬리에서 살짝 올라가고, 먹빛 눈동자는 눈꺼풀에 반쯤 가린다
function eyes(g, o, cx, cy) {
  const kind = o.eyes || 'calm';
  for (const s of [-1, 1]) {
    const xi = s * (cx - 2.5), xo = s * (cx + 2.7);
    if (o.blink || kind === 'closed') { curve(g, p => { p.moveTo(xi, cy + 0.2); p.quadraticCurveTo(s * cx, cy + 1.5, xo, cy - 0.3); }, INK, 1.3); line(g, [xo, cy - 0.3, xo + s * 0.9, cy - 0.8], INK, 0.9); continue; }
    if (kind === 'ghost') { part(g, p => { p.moveTo(xi, cy + 1); p.quadraticCurveTo(s * cx, cy - 3.1, xo, cy - 1.7); p.quadraticCurveTo(s * (cx + 0.8), cy + 2.6, xi, cy + 1); p.closePath(); }, '#262d48', null, { lw: 0 }); ell(g, s * (cx + 0.3), cy - 0.2, 0.75, 0.85, '#bfe9f5'); continue; }
    const up = kind === 'sharp' ? 1.0 : kind === 'soft' ? 0.35 : 0.65, open = kind === 'sharp' ? 1.6 : kind === 'soft' ? 2.2 : 1.9, yo = cy - up;
    const top = p => { p.moveTo(xi, cy + 0.45); p.quadraticCurveTo(s * (cx - 0.3), cy - open, xo, yo); };
    g.beginPath(); top(g); g.quadraticCurveTo(s * (cx + 0.5), cy + open * 0.6, xi, cy + 0.45); g.closePath(); g.fillStyle = '#f6f0e2'; g.fill();
    g.save(); g.clip(); ell(g, s * (cx + 0.15), cy - 0.2, 1.5, 1.6, o.iris || '#2a2026'); ell(g, s * (cx + 0.15) - 0.45, cy - 0.75, 0.4, 0.4, 'rgba(255,255,255,0.8)'); g.restore();
    curve(g, top, INK, 1.45); line(g, [xo, yo, xo + s * 1.15, yo - 0.55], INK, 1);
    g.globalAlpha *= 0.5; curve(g, p => { p.moveTo(s * (cx - 1.3), cy + 1.1); p.quadraticCurveTo(s * (cx + 0.7), cy + open * 0.6, xo - s * 0.4, yo + 0.9); }, INK, 0.6); g.globalAlpha /= 0.5;
  }
}
// 눈썹: 붓을 눌렀다 빼듯 안쪽이 굵고 꼬리가 가늘다
function brow(g, s, x0, y0, x1, y1, w, col, arch = 0.9) {
  path(g, p => { p.moveTo(s * x0, y0 - w * 0.55); p.quadraticCurveTo(s * (x0 + x1) / 2, (y0 + y1) / 2 - arch - w * 0.5, s * x1, y1); p.quadraticCurveTo(s * (x0 + x1) / 2, (y0 + y1) / 2 - arch + w * 0.5, s * x0, y0 + w * 0.55); p.closePath(); }, col);
}
function face(g, o, skin) {
  const cy = -41.2;
  if (o.pale) { g.globalAlpha = 0.4; for (const s of [-1, 1]) ell(g, s * 3.7, cy + 0.3, 3.8, 3.4, '#4a4a6a'); g.globalAlpha = 1; }
  eyes(g, o, 3.75, cy);
  const b = o.brow || 'calm', bc = o.browCol || (o.old ? WHITE : INK);
  for (const s of [-1, 1]) {
    if (b === 'stern') brow(g, s, 1.2, -43.9, 7, -46.3, 1.5, bc, 0.5);
    else if (b === 'thick') brow(g, s, 1, -43.8, 7.4, -46.6, 2.3, bc, 0.6);
    else if (b === 'old') { path(g, p => { p.moveTo(s * 1.2, -44.8); p.quadraticCurveTo(s * 5, -47.6, s * 8.6, -43.6); p.quadraticCurveTo(s * 5, -45.4, s * 1.2, -43.6); p.closePath(); }, bc, INK, 0.5); }
    else if (b === 'soft') brow(g, s, 1.5, -45, 6.8, -45.2, 1.1, bc, 1.1);
    else brow(g, s, 1.3, -44.6, 7, -45.7, 1.3, bc, 0.8);
  }
  // 콧날과 콧방울
  curve(g, p => { p.moveTo(0.5, -41.4); p.quadraticCurveTo(1.5, -39, 0.9, -37.9); p.quadraticCurveTo(0.2, -37.4, -0.6, -37.8); }, dk(skin, 0.42), 0.85);
  // 입: 굳게 다문 입이 기본
  const m = o.mouth || 'flat', mc = '#7a3a30';
  if (m === 'smile') curve(g, p => { p.moveTo(-2, -35.9); p.quadraticCurveTo(0, -35.1, 2, -35.9); }, mc, 1);
  else if (m === 'flat') { curve(g, p => { p.moveTo(-2, -35.6); p.quadraticCurveTo(0, -35.9, 2, -35.6); }, mc, 1.1); line(g, [-0.7, -34.5, 0.7, -34.5], dk(skin, 0.3), 0.6); }
  else if (m === 'frown') curve(g, p => { p.moveTo(-2.1, -35.2); p.quadraticCurveTo(0, -36.5, 2.1, -35.2); }, mc, 1.1);
  else if (m === 'grit') { rr(g, -2.5, -36.8, 5, 2.1, 0.5, WHITE, INK, 0.7); line(g, [0, -36.8, 0, -34.7], INK, 0.5); for (const x of [-1.25, 1.25]) line(g, [x, -36.8, x, -34.7], INK, 0.4); }
  else if (m === 'o') ell(g, 0, -35.6, 1.4, 1.8, '#5a2a26', INK, 0.7);
  // 수염
  const bd = o.beard, hc = o.beardCol || o.hair || BLACK;
  if (bd === 'long') { part(g, p => { p.moveTo(-5.6, -38.4); p.quadraticCurveTo(-7, -27, -2.6, -19.6); p.quadraticCurveTo(0, -16.4, 2.6, -19.6); p.quadraticCurveTo(7, -27, 5.6, -38.4); p.quadraticCurveTo(3, -34.6, 0, -35.6); p.quadraticCurveTo(-3, -34.6, -5.6, -38.4); p.closePath(); }, WHITE, P(1, -40, 8, -40, 8, -16, 2.6, -16), { k: 0.12, lw: 1 }); for (const x of [-2.6, 0, 2.6]) line(g, [x, -32, x * 0.7, -21], '#c9d0d2', 0.7); for (const s of [-1, 1]) curve(g, p => { p.moveTo(s * 0.5, -36.9); p.quadraticCurveTo(s * 3.6, -37.2, s * 5.6, -32.6); }, WHITE, 1.5); }
  else if (bd === 'full') { part(g, p => { p.moveTo(-8.2, -40.4); p.quadraticCurveTo(-8.6, -32.4, -4, -29.4); p.quadraticCurveTo(0, -27.6, 4, -29.4); p.quadraticCurveTo(8.6, -32.4, 8.2, -40.4); p.quadraticCurveTo(6, -35, 2.6, -37.3); p.quadraticCurveTo(0, -34.4, -2.6, -37.3); p.quadraticCurveTo(-6, -35, -8.2, -40.4); p.closePath(); }, hc, P(2, -42, 9, -42, 9, -27, 3, -27), { lw: 1 }); for (const x of [-4.6, -1.6, 1.6, 4.6]) line(g, [x, -33.4, x * 0.9, -30], '#4a4852', 0.6); curve(g, p => { p.moveTo(-1.7, -35.5); p.quadraticCurveTo(0, -35.9, 1.7, -35.5); }, '#b87a6a', 0.9); }
  else if (bd === 'short') { path(g, p => { p.moveTo(-3.6, -34.8); p.quadraticCurveTo(0, -30.2, 3.6, -34.8); p.quadraticCurveTo(0, -33.2, -3.6, -34.8); p.closePath(); }, hc, INK, 0.8); for (const s of [-1, 1]) brow(g, s, 0.4, -37, 4.4, -35.4, 1.2, hc, -0.3); }
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
    g.globalAlpha = 0.78; part(g, E(0, -48.6, 16.6, 4.4), '#1f1e25', E(6, -47, 13, 3.4)); g.globalAlpha = 0.9;
    part(g, p => { p.moveTo(-5.6, -49.4); p.lineTo(-5, -61.6); p.quadraticCurveTo(0, -63, 5, -61.6); p.lineTo(5.6, -49.4); p.quadraticCurveTo(0, -47.6, -5.6, -49.4); p.closePath(); }, '#24232a', P(1.6, -64, 7, -64, 7, -47, 2.4, -47), { hi: R(-4, -60.6, 1.2, 10) }); g.globalAlpha = 1;
    for (const s of [-1, 1]) line(g, [s * 7.6, -46.4, s * 5.2, -35.6], INK, 0.9); ell(g, 0, -33.6, 1.2, 1.2, '#c9962e', INK, 0.5);
  },
  // 투구: 드림과 간주가 달린 장수의 투구
  tugu(g, o) {
    const m = o.metal || '#d9b24a', fl = o.flap || '#b8342a';
    for (const s of [-1, 1]) { part(g, p => { p.moveTo(s * 6.6, -48); p.lineTo(s * 11.6, -47); p.lineTo(s * 11.2, -35); p.lineTo(s * 7.6, -37); p.closePath(); }, fl, s > 0 ? R(9, -49, 4, 16) : null); for (const y of [-44.6, -41.4, -38.4]) ell(g, s * 9.6, y, 0.85, 0.85, OCHRE, INK, 0.35); }
    part(g, p => { p.moveTo(-9.2, -47.2); p.bezierCurveTo(-9.4, -60.4, 9.4, -60.4, 9.2, -47.2); p.quadraticCurveTo(0, -50, -9.2, -47.2); p.closePath(); }, m, P(3, -62, 11, -62, 11, -46, 4.4, -46), { hi: E(-4.4, -55, 1.8, 3.6) });
    line(g, [0, -59.6, 0, -49.2], dk(m, 0.35), 0.9); for (const s of [-1, 1]) curve(g, p => { p.moveTo(s * 5, -58); p.quadraticCurveTo(s * 6.6, -53, s * 6, -48.6); }, dk(m, 0.35), 0.7);
    part(g, p => { p.moveTo(-9.6, -47); p.quadraticCurveTo(0, -50.2, 9.6, -47); p.lineTo(9, -44.8); p.quadraticCurveTo(0, -48, -9, -44.8); p.closePath(); }, '#8a5f1c', null); path(g, P(-1.6, -48.6, 0, -45.4, 1.6, -48.6), OCHRE, INK, 0.6);
    rr(g, -1.1, -66, 2.2, 6.6, 0.8, m, INK, 0.9); for (const s of [-1, 1]) curve(g, p => { p.moveTo(0, -64); p.quadraticCurveTo(s * 3.6, -64, s * 3.4, -67.6); }, INK, 1.8);
    path(g, p => { p.moveTo(0, -65.4); p.quadraticCurveTo(-8.4, -69, -7.2, -60.6); p.quadraticCurveTo(-2.6, -64.2, 0, -62); p.quadraticCurveTo(2.6, -64.2, 7.2, -60.6); p.quadraticCurveTo(8.4, -69, 0, -65.4); }, RED, INK, 0.9);
  },
  // 고깔
  gokkal(g) {
    part(g, p => { p.moveTo(-10.2, -47.4); p.lineTo(0, -65.4); p.lineTo(10.2, -47.4); p.quadraticCurveTo(0, -50.6, -10.2, -47.4); p.closePath(); }, WHITE, P(0.6, -66, 11, -66, 11, -46, 2.6, -47), { k: 0.13 });
    line(g, [0, -65.4, 0.6, -49.4], '#b9b3a2', 0.9); curve(g, p => { p.moveTo(-10.2, -47.4); p.quadraticCurveTo(0, -50.6, 10.2, -47.4); }, RED, 1.3);
    for (const s of [-1, 1]) { path(g, p => { p.moveTo(s * 9.4, -47.6); p.quadraticCurveTo(s * 13.6, -44, s * 11.6, -38.6); p.quadraticCurveTo(s * 9.6, -43, s * 8.2, -46.4); p.closePath(); }, WHITE, INK, 0.8); }
  },
  // 상투와 머리띠
  band(g, o) {
    const hair = o.hair || BLACK;
    part(g, E(0, -55.4, 3.4, 3.6), hair, E(1.6, -54.6, 2.6, 3)); line(g, [-2.6, -53, 2.6, -53], o.bandCol || WHITE, 1.2);
    part(g, p => { p.moveTo(-9.2, -46.2); p.bezierCurveTo(-9.4, -55.4, 9.4, -55.4, 9.2, -46.2); p.quadraticCurveTo(0, -49.6, -9.2, -46.2); p.closePath(); }, hair, P(2.6, -56, 10, -56, 10, -45, 4, -45), { hi: E(-4, -52, 2.4, 1) });
    part(g, p => { p.moveTo(-9.3, -47.4); p.quadraticCurveTo(0, -50.9, 9.3, -47.4); p.lineTo(9.2, -44.9); p.quadraticCurveTo(0, -48.4, -9.2, -44.9); p.closePath(); }, o.bandCol || WHITE, P(3, -52, 10, -52, 10, -44, 4, -44), { lw: 0.9 });
    path(g, p => { p.moveTo(8.8, -46.4); p.quadraticCurveTo(13.6, -45.4, 12.6, -39.4); p.quadraticCurveTo(10.6, -43, 8.8, -44.4); p.closePath(); }, o.bandCol || WHITE, INK, 0.8);
  },
  // 유건: 유생의 검은 건
  yugeon(g) {
    part(g, p => { p.moveTo(-9, -46.6); p.lineTo(-9.8, -59.6); p.lineTo(-4.4, -55); p.lineTo(0, -62.4); p.lineTo(4.4, -55); p.lineTo(9.8, -59.6); p.lineTo(9, -46.6); p.quadraticCurveTo(0, -49.8, -9, -46.6); p.closePath(); }, '#2b2a31', P(1.6, -64, 11, -64, 11, -45, 3, -45), { hi: P(-8.6, -57.6, -5, -54.4, -6.6, -49, -8.4, -48.4) });
    curve(g, p => { p.moveTo(-9, -48.6); p.quadraticCurveTo(0, -51.8, 9, -48.6); }, '#5a5866', 1); for (const s of [-1, 1]) line(g, [s * 7.6, -45.6, s * 6, -38], INK, 0.8);
  },
  // 삭발
  bald(g) { g.globalAlpha = 0.55; ell(g, -3.2, -49, 3.2, 1.6, '#fffaf0', null, 0, -0.4); g.globalAlpha = 1; for (const [x, y] of [[-1.3, -51.6], [1.3, -51.6], [0, -50.2]]) ell(g, x, y, 0.55, 0.55, '#b8584a'); },
  // 신선: 흰 머리를 틀어 올리고 금비녀를 꽂았다
  sage(g) {
    part(g, E(0, -56.6, 4, 3.8), WHITE, E(1.8, -55.8, 3, 3), { k: 0.12 }); line(g, [-6, -56.8, 6, -56.4], OCHRE, 1.8); ell(g, 6.4, -56.4, 1.3, 1.3, '#3f8a6a', INK, 0.5);
    part(g, p => { p.moveTo(-9.2, -45.8); p.bezierCurveTo(-9.4, -55.6, 9.4, -55.6, 9.2, -45.8); p.quadraticCurveTo(5, -50.4, 0, -48.4); p.quadraticCurveTo(-5, -50.4, -9.2, -45.8); p.closePath(); }, WHITE, P(2.6, -56, 10, -56, 10, -45, 4, -46), { k: 0.12 });
    for (const s of [-1, 1]) path(g, p => { p.moveTo(s * 8.6, -46.4); p.quadraticCurveTo(s * 11.6, -40, s * 9.4, -33); p.quadraticCurveTo(s * 8, -39, s * 7.6, -44); p.closePath(); }, WHITE, INK, 0.8);
  },
  // 족두리 대신: 쪽진 머리에 비녀 (무녀의 고깔 안쪽)
  none() {},
};

// ───────── 사람 인형 ─────────
// sel: 'body' 몸만 / 'head' 머리만 / 없으면 한 장에 모두
export function doll(g, o, sel) {
  const body = sel !== 'head', head = sel !== 'body';
  const skin = o.skin || SKIN, robe = o.robe, top = o.top || robe, sl = o.sleeve || top, long = !o.legs, hem = long ? -2.2 : -9.6, fl = long ? 15 : 13.4;
  if (o.ghost) g.globalAlpha = 0.92;
  if (body) {
    if (o.back) o.back(g);
    // 다리와 신
    if (!long) for (const s of [-1, 1]) part(g, p => { p.moveTo(s * 0.6, -12); p.quadraticCurveTo(s * 10.6, -12.4, s * 9.2, -4.4); p.lineTo(s * 2.4, -4); p.closePath(); }, o.legs, s > 0 ? R(5.6, -13, 6, 10) : R(-4, -13, 3.2, 10), { lw: 1.1 });
    if (!o.tatter) for (const s of [-1, 1]) { part(g, p => { p.moveTo(s * 1.6, -5); p.lineTo(s * 9.2, -5.2); p.quadraticCurveTo(s * 11.2, -1.4, s * 10.2, 1.2); p.lineTo(s * 1.8, 1.2); p.closePath(); }, o.shoe || '#2e2a33', R(-12, -1.2, 24, 3), { hi: s < 0 ? E(-7.4, -3.4, 1.6, 0.8) : null }); line(g, [s * 2.2, 1.3, s * 10, 1.3], '#e9dec4', 0.9); }
    // 아랫자락
    part(g, p => {
      p.moveTo(-9.8, -21.6); p.lineTo(9.8, -21.6); p.quadraticCurveTo(fl - 1.4, (hem - 21.6) / 2 - 2, fl, hem);
      if (o.tatter) { for (let i = 1; i < 8; i++) p.lineTo(fl - fl * 2 * i / 8, hem + (i % 2 ? 3.4 : -1.6)); p.lineTo(-fl, hem); } else p.quadraticCurveTo(0, hem + 4, -fl, hem);
      p.quadraticCurveTo(-fl + 1.4, (hem - 21.6) / 2 - 2, -9.8, -21.6); p.closePath();
    }, robe, P(4, -22, 18, -22, 18, 5, 8.6, 5), { hi: P(-8.4, -21, -6.4, -21, -10.6, hem + 1, -13.4, hem) , hk: 0.16 });
    const pc = dk(robe, 0.34); for (const [a, b] of [[-5.2, -9], [-1.2, -2.4], [3, 5], [6.6, 10.4]]) line(g, [a, -20.4, b * fl / 15, hem + 2], pc, 0.8);
    if (o.hem && !o.tatter) path(g, p => { p.moveTo(-fl, hem); p.quadraticCurveTo(0, hem + 4, fl, hem); p.lineTo(fl - 0.9, hem - 2.7); p.quadraticCurveTo(0, hem + 1.2, -fl + 0.9, hem - 2.7); p.closePath(); }, o.hem, INK, 0.8);
    if (o.dots) for (const [x, y] of [[-7, -12], [6.4, -8], [-2, -6], [9.6, -15], [-10.4, -6], [2.6, -15]]) ell(g, x * fl / 15, y, 0.9, 0.9, o.dots);
    // 팔
    for (const s of [-1, 1]) {
      if (o.bare) {
        part(g, p => { p.moveTo(s * 7.4, -31.6); p.quadraticCurveTo(s * 16, -33, s * 18.2, -26); p.quadraticCurveTo(s * 20, -21.6, s * 18.2, -17.6); p.lineTo(s * 12.4, -17.2); p.quadraticCurveTo(s * 12.8, -22.4, s * 8.6, -25); p.closePath(); }, skin, s > 0 ? R(16.4, -34, 5, 18) : E(-11, -21.6, 2.6, 5));
        curve(g, p => p.arc(s * 13.6, -27.6, 2.8, s > 0 ? 0.5 : PI - 2.4, s > 0 ? 2.4 : PI - 0.5), dk(skin, 0.34), 0.9);
        rr(g, s * 15.3 - 3.6, -21.6, 7.2, 2.6, 0.8, o.wrist || '#7a4a2c', INK, 0.8);
      } else {
        part(g, p => { p.moveTo(s * 7.2, -31.8); p.quadraticCurveTo(s * 16.8, -31.8, s * 18.8, -24.6); p.lineTo(s * 19, -19.6); p.lineTo(s * 12.2, -17); p.quadraticCurveTo(s * 11.6, -23, s * 8.2, -25.4); p.closePath(); }, sl, s > 0 ? P(15, -33, 21, -33, 21, -15, 15.8, -16.6) : E(-10.6, -21, 2.8, 5), { hi: s < 0 ? P(-9, -31.4, -12.6, -31, -17, -27, -16, -25.6) : null, hk: 0.18 });
        curve(g, p => { p.moveTo(s * 10.4, -29.6); p.quadraticCurveTo(s * 12.8, -26, s * 13.2, -22.6); }, dk(sl, 0.32), 0.8);
        if (o.stripes) o.stripes.forEach((c, i) => line(g, [s * (13 + i * 1.7), -30.4 + i * 2.6, s * (12.7 + i * 1.9), -22.4 + i * 0.6], c, 1.9));
        path(g, P(s * 18.9, -22.5, s * 19, -19.6, s * 12.2, -17, s * 12, -19.9), o.cuff || WHITE, INK, 0.8);
      }
    }
    // 목
    path(g, p => { p.moveTo(-3.2, -35.4); p.lineTo(3.2, -35.4); p.lineTo(3.8, -31.2); p.quadraticCurveTo(0, -29.4, -3.8, -31.2); p.closePath(); }, dk(skin, 0.16), INK, 0.9);
    // 몸통
    const chest = o.bareChest ? skin : top;
    part(g, p => { p.moveTo(-8.4, -31.9); p.quadraticCurveTo(-4, -32.8, -3.4, -31.6); p.quadraticCurveTo(0, -29.6, 3.4, -31.6); p.quadraticCurveTo(4, -32.8, 8.4, -31.9); p.lineTo(10.2, -20.4); p.lineTo(-10.2, -20.4); p.closePath(); }, chest, P(4.4, -34, 12, -34, 12, -19, 5.6, -19));
    if (o.bareChest) { curve(g, p => { p.moveTo(-6.4, -27.4); p.quadraticCurveTo(-3, -25.4, 0, -27); p.quadraticCurveTo(3, -25.4, 6.4, -27.4); }, dk(skin, 0.36), 0.9); line(g, [0, -27, 0, -22], dk(skin, 0.3), 0.7); path(g, P(-8.6, -31.8, -5.6, -32, 6.6, -20.6, 3.6, -20.6), o.strap || '#7a4a2c', INK, 0.8); }
    else {
      if (o.vest) for (const s of [-1, 1]) part(g, P(s * 8.4, -31.9, s * 3.4, -31.4, s * 4.8, -20.4, s * 10.2, -20.4), o.vest, s > 0 ? R(7, -33, 5, 14) : null, { lw: 0.9 });
      // 깃과 동정
      const git = o.git || dk(top, 0.32);
      path(g, P(5.8, -32.3, 2.8, -32, -3.6, -22.4, -1, -21.2), git, INK, 0.7);
      path(g, P(-5.8, -32.3, -2.8, -32, 4, -22.8, 1.5, -21.4), git, INK, 0.7); line(g, [-4.5, -31.9, 2.4, -22.6], o.collar || WHITE, 1.3);
      if (o.goreum) { path(g, P(2.2, -24, 5.6, -24.6, 4.6, -15, 2.6, -15.6), o.goreum, INK, 0.7); path(g, P(2, -24, -0.6, -22.6, -0.4, -17.6, 1.6, -18), o.goreum, INK, 0.7); ell(g, 2.2, -24, 1.3, 1.1, o.goreum, INK, 0.6); }
      if (o.kasaya) { part(g, p => { p.moveTo(-8.4, -31.8); p.lineTo(-3.4, -32.4); p.lineTo(10.4, -20.4); p.lineTo(4, -20.4); p.closePath(); }, o.kasaya, P(2, -26, 11, -19, 11, -22), { lw: 0.9 }); for (const k of [0.3, 0.62]) line(g, [-8.4 + 12.4 * k + 1.4, -31.8 + 11.4 * k - 1.2, -8.4 + 12.4 * k - 1.6, -31.8 + 11.4 * k + 1.4], OCHRE, 0.7); }
      if (o.studs) for (const [x, y] of [[-6.4, -27.6], [-6.8, -23.6], [6.4, -27.6], [6.8, -23.6], [-3.4, -25.4], [3.6, -25.4]]) ell(g, x, y, 0.95, 0.95, OCHRE, INK, 0.35);
      if (o.pauldron) for (const s of [-1, 1]) { part(g, p => { p.moveTo(s * 5.6, -32.6); p.quadraticCurveTo(s * 13, -35.6, s * 16.4, -29.4); p.quadraticCurveTo(s * 12, -29.6, s * 7, -27.6); p.closePath(); }, o.pauldron, s > 0 ? R(12, -36, 5, 9) : null, { hi: s < 0 ? E(-10, -32, 2.6, 1) : null }); ell(g, s * 10.6, -31, 0.9, 0.9, OCHRE, INK, 0.35); }
    }
    if (o.beads) for (let i = -4; i <= 4; i++) ell(g, i * 1.7, -30.4 + (16 - i * i) * 0.34, 1.15, 1.15, i % 2 ? '#7a4a2c' : '#9a6a3c', INK, 0.45);
    // 허리띠
    if (o.sash) {
      path(g, P(1.6, -19.4, 3.4, -10.6, 6.4, -11.8, 5.2, -19.6), o.sash, INK, 0.8); path(g, P(4.6, -19.6, 7.8, -12.4, 9.6, -14, 7, -19.8), dk(o.sash, 0.16), INK, 0.8);
      part(g, p => { p.moveTo(-10.3, -22.8); p.quadraticCurveTo(0, -20.6, 10.3, -22.8); p.lineTo(10.7, -18.9); p.quadraticCurveTo(0, -16.7, -10.7, -18.9); p.closePath(); }, o.sash, P(4.6, -24, 12, -24, 12, -16, 5.6, -16), { hi: P(-9.6, -22.4, -4, -21.4, -4.2, -20.6, -9.8, -21.6) });
      ell(g, 4.2, -19.3, 2.1, 1.9, o.sash, INK, 0.8);
    }
    // 손
    for (const s of [-1, 1]) { part(g, E(s * HX, -18.2, 3.3, 3.1), skin, E(s * HX + 1.6, -16.6, 3, 2.4), { lw: 1.1 }); ell(g, s * 13.3, -19.7, 1.35, 1.7, skin, INK, 0.8, s * 0.5); line(g, [s * 16.4, -17.2, s * 17.6, -18.5], dk(skin, 0.38), 0.7); }
    if (o.item) o.item(g);
  }
  if (head) {
    // 머리는 목을 축으로 조금 줄인다 (어른스러운 비례)
    g.save(); g.translate(0, -33.2); g.scale(0.92, 0.94); g.translate(0, 33.2);
    const hair = o.hair || BLACK;
    if (o.hat !== 'bald' && !o.noHair) ell(g, 0, -43.6, 9.9, 9.6, o.hat === 'sage' ? WHITE : hair, INK, 1.1);
    for (const s of [-1, 1]) { ell(g, s * 9.1, -41.8, 1.9, 2.7, skin, INK, 0.9); curve(g, p => p.arc(s * 9.2, -41.8, 1, s > 0 ? -1.2 : PI - 1.2 + 1.2, s > 0 ? 1.2 : PI + 1.2), dk(skin, 0.36), 0.6); }
    part(g, p => { p.moveTo(-8.8, -45.4); p.bezierCurveTo(-8.8, -54.8, 8.8, -54.8, 8.8, -45.4); p.bezierCurveTo(8.9, -39.4, 5, -33.2, 0, -32.6); p.bezierCurveTo(-5, -33.2, -8.9, -39.4, -8.8, -45.4); p.closePath(); }, skin, p => { p.moveTo(4.6, -56); p.lineTo(12, -56); p.lineTo(12, -30); p.lineTo(-1, -30); p.quadraticCurveTo(8.4, -36.4, 6, -48); p.closePath(); }, { k: 0.1, lw: 1.25 });
    // 모자 그늘이 이마에 진다
    if (o.hat && o.hat !== 'bald' && o.hat !== 'sage') { g.globalAlpha = 0.16; path(g, p => { p.moveTo(-8.6, -47.4); p.quadraticCurveTo(0, -50, 8.6, -47.4); p.lineTo(8.8, -44.4); p.quadraticCurveTo(0, -47, -8.8, -44.4); p.closePath(); }, '#1e1830'); g.globalAlpha = 1; }
    face(g, o, skin);
    if (o.hat) HATS[o.hat](g, o);
    g.restore();
  }
  g.globalAlpha = 1;
}

// ───────── 손에 든 소품·등에 멘 것 (몸 그림에 포함) ─────────
export const ITEM = {
  shield(g) {
    part(g, E(-HX, -16.8, 11, 11), '#cda766', E(-HX + 3.6, -13.6, 9.6, 9.6), { hi: E(-HX - 4, -21.4, 3.6, 2), lw: 1.3 });
    for (const r of [8.2, 5.2]) curve(g, p => p.arc(-HX, -16.8, r, 0, TAU), '#9a7840', 1); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; line(g, [-HX + Math.cos(a) * 5.2, -16.8 + Math.sin(a) * 5.2, -HX + Math.cos(a) * 10.4, -16.8 + Math.sin(a) * 10.4], '#9a7840', 0.75); }
    part(g, E(-HX, -16.8, 3.4, 3.4), RED, E(-HX + 1.2, -15.6, 2.6, 2.6), { hi: E(-HX - 1, -17.8, 1, 0.7), lw: 1 });
  },
  quiver(g) { g.save(); g.translate(8.6, -30); g.rotate(0.36); for (const [x, c] of [[-1.9, WHITE], [0.4, RED], [2.5, WHITE]]) { line(g, [x, -6, x, -13], '#8a6a4a', 1); poly(g, [x - 1.5, -12.4, x, -16.4, x + 1.5, -12.4], c, INK, 0.7); } part(g, p => p.roundRect ? p.roundRect(-3.3, -6.4, 6.6, 17, 2) : p.rect(-3.3, -6.4, 6.6, 17), WOODD, R(0.6, -7, 3, 18)); rr(g, -3.6, -6.8, 7.2, 2.4, 0.8, OCHRE, INK, 0.7); g.restore(); },
  scroll(g) { part(g, p => p.rect(11.4, -29, 9, 13), '#8a2a26', R(16, -30, 5, 15)); rr(g, 13.2, -27, 5.4, 6, 0.6, WHITE, INK, 0.7); for (const y of [-25.6, -24, -22.4]) line(g, [14.2, y, 17.6, y], INK, 0.5); ell(g, HX, -17.4, 3.2, 3, '#e6e3d8', INK, 1.1); },
  gourd(g) { part(g, E(9.4, -14.6, 3.8, 4.6), '#b8742a', E(10.8, -13.4, 2.8, 3.6)); part(g, E(9.4, -20, 2.2, 2.2), '#b8742a', E(10.2, -19.4, 1.6, 1.6), { lw: 1 }); line(g, [9.4, -22, 9.2, -23.6], WOODD, 1.4); curve(g, p => { p.moveTo(7.6, -18); p.quadraticCurveTo(5, -19.6, 5.6, -21.6); }, RED, 0.9); },
  bow(g) { const c = p => { p.moveTo(-13, -37); p.bezierCurveTo(-18.6, -35, -24.6, -28, -20, -18.4); p.bezierCurveTo(-24.6, -9, -18.6, -2, -13, 0); }; curve(g, c, INK, 3.6); curve(g, c, '#8a4f2c', 2); line(g, [-13, -37, -13, 0], WHITE, 0.8); for (const y of [-30, -7]) line(g, [-20.6, y, -17, y + (y < -18 ? -1.6 : 1.6)], OCHRE, 1.4); ell(g, -17.6, HY, 3.2, 3, SKIN, INK, 1.1); },
  cloud(g) { for (const [x, y, r] of [[-13, -1, 6.6], [-4.6, 0.6, 7.8], [5, 0.6, 7.8], [13.4, -1, 6.6]]) part(g, E(x, y, r, r * 0.62), '#f2f6f6', E(x + 2, y + 2.4, r, r * 0.5), { k: 0.14, lw: 1 }); rr(g, -13, -4.4, 26, 5, 2, '#f2f6f6'); for (const [x, s] of [[-9, 1], [6, -1]]) curve(g, p => p.arc(x, 0.4, 2.6, s > 0 ? 0.4 : 1, s > 0 ? 3.6 : 4.4), '#b9c8cc', 0.9); },
  cape(g, col = '#8a2a26') { part(g, p => { p.moveTo(-8, -31); p.quadraticCurveTo(-17.6, -20, -15.4, -3.4); p.lineTo(-10, -6.6); p.lineTo(-6, -2.4); p.lineTo(6, -2.4); p.lineTo(10, -6.6); p.lineTo(15.4, -3.4); p.quadraticCurveTo(17.6, -20, 8, -31); p.closePath(); }, col, P(6, -32, 18, -32, 18, 0, 9, 0)); },
};
// 모자 없이 뒤통수만 필요한 인형(망령 등)을 위해 내보낸다
export { HATS };

// ───────── 도깨비 ─────────
export function dokkaebi(g, o, sel) {
  const body = sel !== 'head', head = sel !== 'body', sk = o.skin, cloth = o.cloth || '#e6aa3e', bell = lt(sk, 0.3);
  if (body) {
    for (const s of [-1, 1]) {
      part(g, p => { p.moveTo(s * 1, -13); p.quadraticCurveTo(s * 11.4, -13.6, s * 10, -4.6); p.lineTo(s * 2.6, -4.2); p.closePath(); }, sk, s > 0 ? R(6.4, -14, 6, 11) : R(-4.4, -14, 3, 11), { lw: 1.1 });
      part(g, p => { p.moveTo(s * 1.4, -4.8); p.lineTo(s * 10, -5); p.quadraticCurveTo(s * 12.6, -2, s * 11.4, 1); p.lineTo(s * 1.6, 1); p.closePath(); }, sk, R(-13, -1, 26, 3), { lw: 1.1 });
      for (const dx of [0, 2.6, 5.2]) poly(g, [s * (5 + dx) - 0.9, 0.2, s * (5 + dx), 2.2, s * (5 + dx) + 0.9, 0.2], '#f3e7c8', INK, 0.5);
    }
    part(g, p => { p.moveTo(-9.6, -27.6); p.quadraticCurveTo(-13, -18, -10.6, -10.6); p.quadraticCurveTo(0, -7, 10.6, -10.6); p.quadraticCurveTo(13, -18, 9.6, -27.6); p.closePath(); }, sk, P(4.6, -29, 14, -29, 14, -6, 6, -6), { hi: E(-1.4, -17.4, 5.2, 5.6), hic: bell });
    ell(g, -0.6, -13.6, 0.7, 0.9, dk(sk, 0.4));
    part(g, p => { p.moveTo(-11.2, -15.4); p.quadraticCurveTo(0, -12.6, 11.2, -15.4); p.lineTo(12.6, -8.4); p.lineTo(8.6, -4.6); p.lineTo(4.6, -8); p.lineTo(0, -3.6); p.lineTo(-4.6, -8); p.lineTo(-8.6, -4.6); p.lineTo(-12.6, -8.4); p.closePath(); }, cloth, P(4.6, -17, 14, -17, 14, -3, 6, -3));
    for (const x of [-8.6, -4.2, 1, 5.6, 9.6]) poly(g, [x - 1.5, -13.6 + Math.abs(x) * 0.1, x + 1.5, -13.4 + Math.abs(x) * 0.1, x + 0.3, -8.2], '#2b2a30');
    rope(g, p => { p.moveTo(-11.2, -15.4); p.quadraticCurveTo(0, -12.6, 11.2, -15.4); }, '#d9c39a', 1.4);
    // 팔: 왼팔은 내리고 오른팔은 방망이를 쥐어 들었다
    part(g, p => { p.moveTo(-8.6, -27.4); p.quadraticCurveTo(-18.4, -28, -19.6, -20); p.lineTo(-13.6, -17.4); p.quadraticCurveTo(-12.6, -22, -9.6, -22.6); p.closePath(); }, sk, E(-12.4, -19.6, 3, 4));
    part(g, p => { p.moveTo(8.6, -27.4); p.quadraticCurveTo(18.6, -30, 20, -22.6); p.lineTo(14.4, -18.4); p.quadraticCurveTo(13, -22.6, 9.6, -22.6); p.closePath(); }, sk, R(15.6, -31, 6, 14));
    for (const [x, y] of [[-16.4, -18.8], [16.4, -21]]) { part(g, E(x, y, 4, 3.7), sk, E(x + 1.8, y + 1.6, 3.6, 3), { lw: 1.1 }); line(g, [x - 1.4, y + 0.6, x + 2.4, y - 0.6], dk(sk, 0.36), 0.7); }
    line(g, [-19.6, -22.8, -14.4, -25], OCHRE, 1.7); line(g, [14.6, -26, 19.8, -24.2], OCHRE, 1.7);
    if (o.beads) for (let i = -3; i <= 3; i++) ell(g, i * 3, -24.6 + (9 - i * i) * 0.4, 1.6, 1.6, i % 2 ? RED : '#f3e7c8', INK, 0.5);
    if (o.item) o.item(g);
  }
  if (head) {
    for (const s of [-1, 1]) { part(g, P(s * 11, -39, s * 19.4, -45.6, s * 13.4, -32.4), sk, s > 0 ? P(15, -46, 20, -46, 14, -32) : null, { lw: 1.1 }); line(g, [s * 12.6, -38, s * 16.6, -42.4], dk(sk, 0.4), 0.8); }
    ell(g, -16.4, -36.4, 1.7, 1.7, null, OCHRE, 1.3);
    part(g, p => { p.moveTo(-12.6, -40.4); p.bezierCurveTo(-12.8, -53, 12.8, -53, 12.6, -40.4); p.bezierCurveTo(13.8, -32, 8.4, -25, 0, -24.6); p.bezierCurveTo(-8.4, -25, -13.8, -32, -12.6, -40.4); p.closePath(); }, sk, p => { p.moveTo(6.6, -54); p.lineTo(15, -54); p.lineTo(15, -22); p.lineTo(-2, -22); p.quadraticCurveTo(11.6, -30, 8.6, -44); p.closePath(); }, { k: 0.16, hi: E(-5.4, -46.4, 4, 2), hk: 0.2, lw: 1.3 });
    // 삐죽삐죽한 머리털과 뿔
    part(g, p => { p.moveTo(-12.8, -41); p.lineTo(-16.4, -50.6); p.lineTo(-10.4, -48); p.lineTo(-11, -57); p.lineTo(-5.2, -52); p.lineTo(-2.8, -58.6); p.lineTo(1.6, -52); p.lineTo(5.6, -58); p.lineTo(8.2, -50.6); p.lineTo(14.6, -53.4); p.lineTo(12.8, -41); p.quadraticCurveTo(7, -47.4, 0, -46.2); p.quadraticCurveTo(-7, -47.4, -12.8, -41); p.closePath(); }, o.hair || BLACK, P(4, -60, 16, -60, 16, -40, 8, -44), { hi: P(-10.4, -55, -9, -50, -7.4, -51.4), hic: '#5a5866', lw: 1.1 });
    const horn = (x, a) => { g.save(); g.translate(x, -51.4); g.rotate(a); part(g, p => { p.moveTo(-2.8, 1); p.quadraticCurveTo(-2.6, -8, 0.6, -13.4); p.quadraticCurveTo(3.4, -7, 2.8, 1); p.closePath(); }, '#f3e7c8', P(0.6, -14, 4, -14, 4, 2, 1.2, 2), { k: 0.18, lw: 1 }); for (const y of [-3, -6.6]) line(g, [-2.2, y, 2.4, y - 0.8], '#c9b98a', 0.7); g.restore(); };
    if (o.horns === 2) { horn(-6, -0.34); horn(6, 0.34); } else horn(0.4, 0.06);
    // 부리부리한 눈과 굵은 눈썹
    if (o.blink) for (const s of [-1, 1]) curve(g, p => { p.moveTo(s * 1.6, -38.6); p.quadraticCurveTo(s * 5.4, -36, s * 9.2, -39.4); }, INK, 1.7);
    else for (const s of [-1, 1]) { g.save(); g.beginPath(); g.moveTo(s * 1.4, -39.6); g.quadraticCurveTo(s * 5.6, -44.4, s * 10, -41.6); g.quadraticCurveTo(s * 6, -34.6, s * 1.4, -39.6); g.closePath(); g.fillStyle = '#fff3b8'; g.fill(); g.clip(); ell(g, s * 5.2, -39.6, 1.7, 2, '#8a2a1c'); ell(g, s * 5.2, -39.5, 0.8, 1.1, '#15121a'); g.restore(); curve(g, p => { p.moveTo(s * 1.4, -39.6); p.quadraticCurveTo(s * 5.6, -44.4, s * 10, -41.6); p.quadraticCurveTo(s * 6, -34.6, s * 1.4, -39.6); }, INK, 1.1); }
    for (const s of [-1, 1]) path(g, P(s * 10.6, -45.4, s * 1.2, -42, s * 1.6, -39.8, s * 10.8, -42.6), o.hair || BLACK, INK, 0.7);
    part(g, E(0, -34.4, 2.9, 2.1), dk(sk, 0.24), null, { lw: 0.9 }); for (const s of [-1, 1]) ell(g, s * 1.2, -34.2, 0.55, 0.75, INK);
    g.globalAlpha = 0.35; for (const s of [-1, 1]) ell(g, s * 9.6, -34, 2.4, 1.5, '#ffd9c0'); g.globalAlpha = 1;
    // 씩 웃는 입과 엄니
    part(g, p => { p.moveTo(-8.4, -31.6); p.quadraticCurveTo(0, -29, 8.4, -31.6); p.quadraticCurveTo(6.4, -25.6, 0, -25.6); p.quadraticCurveTo(-6.4, -25.6, -8.4, -31.6); p.closePath(); }, '#7a1f1c', R(-9, -28, 18, 4), { shc: '#4a1216', lw: 1.1 });
    path(g, p => { p.moveTo(-6.4, -30.9); p.quadraticCurveTo(0, -28.6, 6.4, -30.9); p.lineTo(5.6, -29); p.quadraticCurveTo(0, -27, -5.6, -29); p.closePath(); }, WHITE, INK, 0.6); for (const x of [-3, 0, 3]) line(g, [x, -29.8 + Math.abs(x) * 0.1, x, -27.6 + Math.abs(x) * 0.12], INK, 0.5);
    for (const s of [-1, 1]) poly(g, [s * 7.6, -28.4, s * 6.6, -34.4, s * 4.6, -28], WHITE, INK, 0.8);
    if (o.warts) for (const [x, y] of [[-9.6, -46], [8.6, -47.4], [10.4, -30]]) ell(g, x, y, 0.9, 0.8, dk(sk, 0.3));
  }
}
export const DITEM = {
  lid(g) { part(g, E(-17, -18.4, 12, 12), '#3e3e49', E(-13.6, -15.4, 10.6, 10.6), { hi: E(-21.4, -23.4, 4, 2.2), hic: '#7a7a88', lw: 1.3 }); curve(g, p => p.arc(-17, -18.4, 8.4, 0, TAU), '#5e5e6c', 1.1); part(g, E(-17, -18.4, 3.2, 3.2), '#6a6a78', E(-16, -17.4, 2.6, 2.6), { lw: 1 }); },
  drum(g) { rope(g, p => { p.moveTo(-9, -26); p.quadraticCurveTo(0, -30, 9, -26); }, '#d9c39a', 1.2); part(g, p => p.rect(-11, -17, 22, 12.6), '#a8322a', R(4, -18, 8, 15)); part(g, E(0, -17, 11, 4.2), '#f3e7c8', E(3, -15.8, 9, 3.4), { k: 0.12 }); for (const x of [-7, 0, 7]) line(g, [x, -13, x, -5], OCHRE, 1.1); ell(g, 0, -4.6, 11, 2.6, '#8a2a26', INK, 1.1); path(g, p => p.arc(0, -17, 2.6, 0, PI), RED); path(g, p => p.arc(0, -17, 2.6, PI, TAU), INDIGO); },
  sling(g) { rope(g, p => { p.moveTo(16.4, -21); p.quadraticCurveTo(22, -30, 20.6, -36); }, '#8a6a4a', 1.1); rope(g, p => { p.moveTo(16.4, -21); p.quadraticCurveTo(26, -27, 24.4, -35); }, '#8a6a4a', 1.1); part(g, P(18.6, -38.6, 22, -41.6, 26.4, -39.4, 26.6, -35, 22.6, -32.6, 19, -34.6), '#a59f8f', P(23, -42, 28, -42, 28, -32, 23.6, -32), { hi: E(21, -38.6, 1.4, 0.8) }); },
};

// ───────── 불여우 ─────────
export function fox(g, o = {}) {
  const fur = '#f8f3ea', tip = '#8fd3e8';
  for (let i = -2; i <= 2; i++) { g.save(); g.translate(0, -9); g.rotate(i * 0.44); part(g, p => { p.moveTo(-2.6, 0); p.quadraticCurveTo(-8, -18, 0, -32); p.quadraticCurveTo(8, -18, 2.6, 0); p.closePath(); }, fur, P(0.4, -34, 9, -34, 9, 1, 1.2, 1), { k: 0.1, lw: 1.1 }); part(g, p => { p.moveTo(-3.4, -22); p.quadraticCurveTo(-1, -25.6, 0, -32); p.quadraticCurveTo(1, -25.6, 3.4, -22); p.quadraticCurveTo(0, -24.6, -3.4, -22); p.closePath(); }, tip, null, { lw: 0.8 }); g.restore(); }
  part(g, p => { p.moveTo(-8.6, -3); p.quadraticCurveTo(-10.6, -16, -5, -21); p.lineTo(5, -21); p.quadraticCurveTo(10.6, -16, 8.6, -3); p.quadraticCurveTo(0, 0.6, -8.6, -3); p.closePath(); }, fur, P(2.6, -22, 11, -22, 11, 1, 4, 1), { k: 0.1 });
  for (const s of [-1, 1]) { part(g, E(s * 4.6, -1.4, 3.4, 2.4), fur, E(s * 4.6 + 1, -0.6, 3, 1.8), { k: 0.1, lw: 1 }); line(g, [s * 4.6, -0.4, s * 4.6, 0.8], '#b9b3a2', 0.6); }
  for (const y of [-9, -13]) curve(g, p => { p.moveTo(-2, y); p.quadraticCurveTo(0, y + 1.6, 2, y); }, '#d9d2c2', 0.8);
  for (const s of [-1, 1]) { part(g, P(s * 3.4, -33, s * 10.4, -43.6, s * 10.6, -29.6), fur, s > 0 ? P(7.6, -44, 11, -44, 11, -29, 8.6, -30) : null, { k: 0.1, lw: 1.1 }); path(g, P(s * 5.6, -33.4, s * 9.2, -39.6, s * 9.2, -31.6), '#e98a7a'); }
  part(g, p => { p.moveTo(-10.4, -29); p.quadraticCurveTo(-9.6, -36.6, 0, -36.6); p.quadraticCurveTo(9.6, -36.6, 10.4, -29); p.quadraticCurveTo(6.6, -20.6, 0, -18.4); p.quadraticCurveTo(-6.6, -20.6, -10.4, -29); p.closePath(); }, fur, P(3, -38, 12, -38, 12, -17, 0.6, -17, 6, -24), { k: 0.1 });
  for (const s of [-1, 1]) { curve(g, p => { p.moveTo(s * 10.2, -28.4); p.lineTo(s * 12.6, -26.4); }, INK, 0.9); if (o.blink) curve(g, p => { p.moveTo(s * 7, -29); p.quadraticCurveTo(s * 4.6, -27.4, s * 2.4, -28); }, INK, 1.4); else { path(g, p => { p.moveTo(s * 7.2, -29.6); p.quadraticCurveTo(s * 4.6, -31.6, s * 2.2, -27.6); p.quadraticCurveTo(s * 4.8, -26.4, s * 7.2, -29.6); p.closePath(); }, '#f6c84a', INK, 0.9); ell(g, s * 4.5, -28.8, 0.7, 1.6, INK); } line(g, [s * 7.8, -30.8, s * 5.2, -31.6], RED, 1.3); }
  path(g, P(-1.8, -34.4, 0, -31.4, 1.8, -34.4), RED); ell(g, 0, -21, 1.5, 1.1, INK); curve(g, p => { p.moveTo(-2.4, -19.6); p.quadraticCurveTo(0, -18.4, 2.4, -19.6); }, INK, 0.8);
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
export function wisp(g, o = {}) {
  g.globalAlpha = 0.3; ell(g, 0, -22, 15, 18, '#bfe9f5'); g.globalAlpha = 1;
  part(g, p => { p.moveTo(0, -42); p.bezierCurveTo(4.4, -33, 12.6, -29, 10.6, -17); p.bezierCurveTo(9.6, -9.6, 4.4, -6.4, 0, -6.4); p.bezierCurveTo(-6.4, -6.4, -11.6, -11.6, -10.6, -19); p.bezierCurveTo(-10, -24.4, -6.4, -25.4, -5.4, -31); p.bezierCurveTo(-2.2, -28.6, -1, -35, 0, -42); p.closePath(); }, '#4fa9d6', P(3, -44, 13, -44, 13, -5, 5, -5), { k: 0.18 });
  part(g, p => { p.moveTo(0, -30); p.bezierCurveTo(4.6, -23.6, 7.4, -18.4, 5.6, -13.4); p.bezierCurveTo(3.6, -9.2, -3.6, -9.2, -5.6, -14); p.bezierCurveTo(-7, -18.6, -2.4, -22.4, 0, -30); p.closePath(); }, '#bfe9f5', null, { lw: 0, hi: E(-1, -15, 3, 3.6), hic: '#f2fcff' });
  if (o.blink) for (const s of [-1, 1]) line(g, [s * 1.6, -17.2, s * 5, -17.8], INK, 1.3);
  else for (const s of [-1, 1]) path(g, p => { p.moveTo(s * 1.3, -16.4); p.quadraticCurveTo(s * 3.4, -21.4, s * 6.6, -21); p.quadraticCurveTo(s * 5, -15.6, s * 1.3, -16.4); p.closePath(); }, '#123650');
  curve(g, p => { p.moveTo(-2.4, -12.4); p.lineTo(-0.8, -11.4); p.lineTo(0.8, -12.4); p.lineTo(2.4, -11.4); }, '#1f4f6f', 0.9);
  for (const [x, y, r] of [[-12, -34, 1.6], [11, -37, 1.2], [13, -9, 1.3]]) ell(g, x, y, r, r * 1.3, '#8fd3e8', INK, 0.6);
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
// ───────── 기마 무사 (옆모습 말 + 기수) ─────────
export function horseman(g, rider) {
  const Bc = '#9a6a44', D = '#2e2a30';
  part(g, p => { p.moveTo(-16.4, -25); p.quadraticCurveTo(-27, -19, -23.4, -3.6); p.quadraticCurveTo(-19, -13, -14, -19.6); p.closePath(); }, D, P(-22, -10, -18, -18, -16, -10), { shc: '#4a4650', lw: 1 });
  for (const [x, b] of [[-12, 1], [9, 1]]) { part(g, p => { p.moveTo(x - 2.4, -16); p.lineTo(x - 1.6, -3); p.lineTo(x + 2, -3); p.lineTo(x + 2.4, -16); p.closePath(); }, dk(Bc, 0.24), null, { lw: 1 }); rr(g, x - 2.2, -3, 4.6, 3.2, 1, D, INK, 0.7); }
  part(g, p => { p.moveTo(-17, -22); p.bezierCurveTo(-17.6, -33, 15, -33, 16.6, -24); p.bezierCurveTo(18, -13.6, -15.6, -11, -17, -22); p.closePath(); }, Bc, p => { p.moveTo(-18, -17.6); p.quadraticCurveTo(0, -14, 18, -19.6); p.lineTo(18, -9); p.lineTo(-18, -9); p.closePath(); }, { hi: E(-6, -27.6, 7, 1.8), hk: 0.2, lw: 1.3 });
  for (const x of [-7, 13.4]) { part(g, p => { p.moveTo(x - 2.4, -17); p.quadraticCurveTo(x - 3.2, -9, x - 1.8, -3); p.lineTo(x + 2, -3); p.quadraticCurveTo(x + 2.8, -9, x + 2.4, -17); p.closePath(); }, Bc, R(x + 0.4, -18, 3, 16), { lw: 1.1 }); rr(g, x - 2.4, -3, 5, 3.4, 1, D, INK, 0.8); }
  part(g, p => { p.moveTo(7.6, -27); p.lineTo(13.6, -43); p.quadraticCurveTo(22.6, -47.6, 27.6, -39); p.lineTo(26.6, -33.4); p.quadraticCurveTo(23, -31.6, 20, -32.4); p.lineTo(16.6, -22.6); p.closePath(); }, Bc, P(18, -34, 28, -40, 28, -30, 17, -22), { lw: 1.3 });
  part(g, p => { p.moveTo(8.6, -28); p.quadraticCurveTo(7.6, -39.6, 14, -45.2); p.lineTo(17, -41.6); p.quadraticCurveTo(12.4, -36, 13, -27.6); p.closePath(); }, D, null, { lw: 0.9 });
  poly(g, [15, -44.4, 17, -50.4, 19.6, -44.6], Bc, INK, 1); ell(g, 21.6, -40.2, 1.2, 1.5, INK); ell(g, 21.2, -40.6, 0.4, 0.4, '#fff'); ell(g, 26.2, -36.6, 0.7, 0.9, INK);
  line(g, [18.6, -35, 26.6, -37], RED, 1.3); curve(g, p => { p.moveTo(19, -35); p.quadraticCurveTo(10, -30, 3, -31); }, RED, 1.1);
  part(g, P(-10, -30.6, 7.4, -30.6, 9, -19, -11.6, -19), '#b8342a', R(-12, -22.6, 22, 4), { lw: 1.1 }); line(g, [-11.2, -20.8, 8.8, -20.8], OCHRE, 1.4); for (const x of [-7, -1, 5]) ell(g, x, -25.6, 1.1, 1.1, OCHRE, INK, 0.4);
  if (rider) { g.save(); g.translate(-3, -25.6); g.scale(0.76, 0.76); rider(g); g.restore(); }
}
// ───────── 멧돼지 ─────────
export function boar(g, o = {}) {
  const Bc = '#6b5240', D = '#4a372a';
  curve(g, p => { p.moveTo(-19, -19); p.quadraticCurveTo(-27, -22, -23.6, -30); }, INK, 2.8); curve(g, p => { p.moveTo(-19, -19); p.quadraticCurveTo(-27, -22, -23.6, -30); }, Bc, 1.4);
  for (const x of [-12, 8]) { rr(g, x - 2.1, -11, 4.2, 10, 1.4, dk(D, 0.2), INK, 1); rr(g, x - 2.3, -2.4, 4.6, 2.8, 1, BLACK); }
  part(g, p => { p.moveTo(-20.4, -12); p.quadraticCurveTo(-23, -29, -8, -32); p.quadraticCurveTo(8.6, -34, 17.6, -27); p.quadraticCurveTo(27, -22.6, 28, -14); p.quadraticCurveTo(24.6, -8, 16, -7.6); p.quadraticCurveTo(0, -4.6, -20.4, -12); p.closePath(); }, Bc, p => { p.moveTo(-21, -14); p.quadraticCurveTo(0, -9, 29, -16); p.lineTo(29, -3); p.lineTo(-21, -3); p.closePath(); }, { hi: E(-4, -28.4, 9, 2), hk: 0.16, lw: 1.3 });
  for (const x of [-6, 13]) { rr(g, x - 2.1, -11, 4.2, 10, 1.4, D, INK, 1); rr(g, x - 2.3, -2.4, 4.6, 2.8, 1, BLACK); }
  part(g, p => { p.moveTo(-17.6, -27.4); p.lineTo(-14, -35); p.lineTo(-10, -30.6); p.lineTo(-6, -37.4); p.lineTo(-2, -32); p.lineTo(3, -38); p.lineTo(6, -31.6); p.lineTo(11, -35.4); p.lineTo(13.6, -29); p.quadraticCurveTo(0, -32, -17.6, -27.4); p.closePath(); }, D, null, { lw: 1 });
  for (const [x, y] of [[-12, -20], [-4, -16], [4, -20], [-8, -24], [10, -16]]) line(g, [x, y, x + 3, y + 1.4], dk(Bc, 0.36), 0.8);
  part(g, E(26.6, -14.6, 3.4, 4.2), '#c98a7a', E(27.4, -13.4, 2.8, 3.4), { lw: 1.1 }); for (const y of [-15.8, -13.2]) ell(g, 27, y, 0.7, 0.9, INK);
  part(g, p => { p.moveTo(19, -10.4); p.quadraticCurveTo(22.6, -17.4, 26, -19.6); p.quadraticCurveTo(23.6, -14, 21.8, -9.6); p.closePath(); }, '#f6ecd0', null, { lw: 0.9 });
  if (o.blink) line(g, [15.6, -20.6, 19.6, -20.2], INK, 1.5); else { ell(g, 17.6, -20.8, 2, 1.8, '#f6c84a', INK, 0.8); ell(g, 17.9, -20.6, 0.8, 1.2, '#8a1f1c'); }
  line(g, [14.2, -24.8, 20, -22.8], INK, 1.7); poly(g, [8.6, -27.6, 10.4, -34, 13.6, -28], Bc, INK, 1); poly(g, [10, -28.6, 10.8, -32, 12.4, -28.6], '#c98a7a');
}
// ───────── 투석기 ─────────
export function catapult(g) {
  for (const s of [-1, 1]) { part(g, E(s * 15, -6, 7.8, 7.8), WOODD, E(s * 15 + 2.2, -4, 6.6, 6.6)); for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + 0.4; line(g, [s * 15, -6, s * 15 + Math.cos(a) * 7, -6 + Math.sin(a) * 7], '#5a3a26', 1.1); } ell(g, s * 15, -6, 2.1, 2.1, '#3a2a22', INK, 0.6); }
  part(g, p => p.rect(-19.6, -16.6, 39.2, 9), '#9a6a3c', R(-20, -11, 40, 4), { hi: R(-19, -16, 38, 1.4), lw: 1.3 });
  for (const s of [-1, 1]) part(g, P(s * 10.4, -15.4, s * 6.2, -31, s * 2.4, -31, s * 5.6, -15.4), '#b98a55', s > 0 ? P(7, -31, 11, -15, 8, -15) : null, { lw: 1.1 });
  part(g, p => p.rect(-9, -33.6, 18, 4.8), WOODD, R(-9, -31, 18, 2.4), { lw: 1.1 }); rope(g, p => { p.moveTo(-6, -31); p.lineTo(-7, -17); }, '#d9c39a', 1);
  part(g, E(0, -11.8, 4.8, 4.4), '#d9603f', E(1.4, -10.6, 4, 3.6), { lw: 1 }); for (const s of [-1, 1]) ell(g, s * 1.7, -12.2, 0.9, 1.1, INK); poly(g, [-1.1, -15.8, 0, -19.6, 1.1, -15.8], '#f3e7c8', INK, 0.7);
}
// ───────── 당산 목신 (두목) ─────────
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
export function stakeLog(g) { g.save(); g.rotate(0.12); part(g, P(-5, 2, -5, -30, 0, -40, 5, -30, 5, 2), WOOD, P(1, -41, 6, -41, 6, 3, 1.6, 3), { hi: P(-4, -29, -2.6, -30, -2.6, 0, -4, 0), hk: 0.2, lw: 1.3 }); rr(g, -5.6, -14, 11.2, 3.4, 1, '#d9b77a', INK, 0.8); g.restore(); ell(g, 0, 2, 7, 2.6, '#8a6844', INK, 1); }
export function bannerCart(g) {
  line(g, [-22, -12, -34, -6], INK, 4.2); line(g, [-22, -12, -34, -6], WOODD, 2.6);
  line(g, [-6, -16, -6, -100], INK, 4.4); line(g, [-6, -16, -6, -100], '#7a3a2a', 2.6); poly(g, [-9, -100, -6, -108.6, -3, -100], OCHRE, INK, 0.9);
  part(g, p => { p.moveTo(-6, -98); p.lineTo(34, -95); p.quadraticCurveTo(29, -80, 34, -64); p.lineTo(-6, -61); p.closePath(); }, INDIGO, p => { p.moveTo(14, -100); p.quadraticCurveTo(20, -80, 16, -60); p.lineTo(36, -60); p.lineTo(36, -100); p.closePath(); }, { hi: P(-5, -96, 2, -95.6, 3, -64, -5, -63), hk: 0.14, lw: 1.4 });
  path(g, P(-6, -98, 34, -95, 33.2, -91.4, -6, -94.4), RED); path(g, P(-6, -61, 34, -64, 33.2, -67.6, -6, -64.6), RED);
  curve(g, p => { p.moveTo(-6, -98); p.lineTo(34, -95); p.quadraticCurveTo(29, -80, 34, -64); p.lineTo(-6, -61); }, INK, 1.4);
  part(g, E(13, -79.6, 9.4, 9.4), WHITE, E(15, -77.6, 8, 8), { k: 0.1, lw: 1 }); g.fillStyle = RED; g.font = "400 13px 'Yeon Sung', serif"; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('군', 13, -78.8);
  for (const y of [-58, -50]) line(g, [-6, y, -12, y + 6], OCHRE, 1.3);
  part(g, p => p.rect(-24, -20, 48, 10), '#9a6a3c', R(-24, -14.6, 48, 5), { hi: R(-23, -19.4, 46, 1.4), lw: 1.3 }); for (const x of [-18, -8, 2, 12]) line(g, [x, -19, x, -11], WOODD, 0.9);
  part(g, p => p.rect(4, -36, 18, 16), '#a8322a', R(15, -37, 8, 18)); part(g, E(13, -36, 9, 3.4), '#f3e7c8', E(15, -35, 7.6, 2.6), { k: 0.12, lw: 1.1 }); for (const x of [8, 13, 18]) line(g, [x, -32, x, -21], OCHRE, 1);
  for (const s of [-1, 1]) { part(g, E(s * 15, -8, 9.2, 9.2), WOODD, E(s * 15 + 2.6, -5.4, 8, 8)); part(g, E(s * 15, -8, 6, 6), '#d9c39a', null, { lw: 0.9 }); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; line(g, [s * 15, -8, s * 15 + Math.cos(a) * 6, -8 + Math.sin(a) * 6], WOODD, 1.2); } ell(g, s * 15, -8, 1.9, 1.9, '#3a2a22', INK, 0.6); }
}
