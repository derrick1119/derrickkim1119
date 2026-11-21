// 병종 인형 스프라이트 — 몸 한 장 + (사람·도깨비는) 머리 한 장 + 손에 든 무기 한 장. 그림은 figures.js
import { TAU, INK, PAPER, RED, INDIGO, TEAL, OCHRE, SKIN, st, fs, ell, rr, poly, line, path, paperSprite, drawSprite } from './draw.js';
import { WEAPONS as WDATA, ARMS } from '../data/weapons.js';
import { doll, dokkaebi, ITEM, DITEM, fox, jangseung, wisp, cart, horse, LEFTOVER, boar, catapult, mokshin, eoduksini, scarecrow, stakeLog, bannerCart, part, dk, lt, E, R, P, curve, rope, WHITE, BLACK, STEEL, IRON, WOOD, WOODD, HX, HY } from './figures.js';
import { tiger, haetae, sapsal, magpie, samjoko, bulgasari, geuseundae, strawShoes } from './beasts.js';

// ───────────── 무기 (원점 = 손잡이, 위쪽을 향함) ─────────────
const STEELD = '#aab4ba', BRASS = '#c9962e';
// 자루: 먹선 + 나뭇결 빛
const shaft = (g, y0, y1, col = '#8a5a34', lw = 1.9) => { line(g, [0, y0, 0, y1], INK, lw + 1.6); line(g, [0, y0, 0, y1], col, lw); line(g, [-lw * 0.26, y0 - 1.5, -lw * 0.26, y1 + 1.5], lt(col, 0.34), lw * 0.3); };
const band = (g, y, w = 5, h = 2.4, col = OCHRE) => part(g, R(-w / 2, y, w, h), col, R(0.3, y, w, h), { lw: 0.8 });
// 유소·삭모: 술 장식
const tassel = (g, x, y, l, col = RED, a = 0) => { g.save(); g.translate(x, y); g.rotate(a); part(g, p => { p.moveTo(-1, 0); p.quadraticCurveTo(-4.4, l * 0.5, -2.6, l); p.lineTo(2.2, l * 0.92); p.quadraticCurveTo(3.4, l * 0.4, 1, 0); p.closePath(); }, col, P(0.4, 0, 4, 0, 4, l, 0.8, l), { lw: 0.8 }); for (const x2 of [-1.2, 0.6]) line(g, [x2, l * 0.3, x2 - 0.5, l * 0.9], dk(col, 0.34), 0.5); ell(g, 0, 0, 1.3, 1.1, OCHRE, INK, 0.5); g.restore(); };
const hilt = (g, y0, y1, col = '#3a2a26') => { part(g, R(-1.6, y0, 3.2, y1 - y0), col, R(0.2, y0, 1.6, y1 - y0), { lw: 0.9 }); for (let y = y0 + 1.1; y < y1 - 0.8; y += 1.8) line(g, [-1.5, y, 1.5, y + 0.9], lt(col, 0.36), 0.5); };
const guard = (g, y, w = 7.6, col = OCHRE) => part(g, E(0, y, w / 2, 1.6), col, E(0.9, y + 0.5, w / 2 - 0.6, 1.1), { hi: E(-1.3, y - 0.5, 1.4, 0.4), lw: 0.9 });
// 칼날: 등 쪽은 어둡게, 날 쪽은 흰 빛
const blade = (g, fn, back, edge, col = '#dfe5e8') => part(g, fn, col, back, { shc: STEELD, hi: edge, hic: '#ffffff', lw: 1.1 });
const WEAPONS = {
  hwando(g, o = {}) {
    blade(g, p => { p.moveTo(-1.6, -4.4); p.quadraticCurveTo(-0.9, -17, 4.8, -31.4); p.quadraticCurveTo(3.8, -16, 1.9, -4.4); p.closePath(); }, p => { p.moveTo(-2, -4); p.quadraticCurveTo(-1.2, -17, 4.8, -32); p.quadraticCurveTo(0.6, -18, 0, -4); p.closePath(); }, p => { p.moveTo(1.5, -5); p.quadraticCurveTo(3.2, -16, 4.6, -30); p.quadraticCurveTo(2.6, -16, 1, -5); p.closePath(); });
    curve(g, p => { p.moveTo(0, -6); p.quadraticCurveTo(0.6, -16, 3, -24); }, '#8a959c', 0.6);
    guard(g, -4.6); hilt(g, -3.4, 4, o.wrap || '#3a2a26'); ell(g, 0, 4.9, 1.7, 1.4, OCHRE, INK, 0.7); tassel(g, 0.4, 6, 5, o.tas || RED, 0.2);
  },
  short(g) { blade(g, P(-1.8, -4, -1.4, -15.6, 0, -19, 1.4, -15.6, 1.8, -4), P(-2, -4, -1.6, -16, 0, -19.4, 0, -4), P(0.9, -5, 0.9, -15, 0.3, -17.4, 0.3, -5)); guard(g, -4.4, 6.6, '#7a4a2c'); hilt(g, -3.2, 3.8); },
  rusty(g) { g.globalAlpha = 0.92; blade(g, p => { p.moveTo(-1.6, -4.4); p.quadraticCurveTo(-0.9, -16, 4.6, -28); p.lineTo(2.8, -23.4); p.lineTo(3.6, -19.6); p.lineTo(2.4, -15); p.lineTo(2.9, -11.6); p.quadraticCurveTo(2.2, -8, 1.9, -4.4); p.closePath(); }, P(-2, -4, -1, -17, 1, -17, 0, -4), null, '#b9c8cc'); for (const [x, y] of [[0.4, -9], [1.2, -17], [0, -22]]) ell(g, x, y, 0.9, 0.7, '#8a6a4a'); guard(g, -4.6, 7, '#8a8f8a'); hilt(g, -3.4, 3.6, '#4a4a55'); g.globalAlpha = 1; },
  spear(g) {
    shaft(g, 12, -32); for (const s of [-1, 1]) part(g, p => { p.moveTo(s * 0.6, -29.4); p.quadraticCurveTo(s * 6.4, -27.6, s * 4.6, -20.4); p.quadraticCurveTo(s * 2.4, -24.6, s * 0.6, -25.4); p.closePath(); }, RED, s > 0 ? P(2, -30, 7, -30, 7, -20, 3, -20) : null, { lw: 0.8 });
    band(g, -32.6, 4.6, 2.6); blade(g, P(-2.9, -33, 0, -46, 2.9, -33, 0, -31), P(-3, -33, 0, -46.4, 0, -31), P(1.5, -33.4, 0.5, -42, 0.5, -32.4)); line(g, [0, -44, 0, -32], '#8a959c', 0.6); band(g, 9.6, 4.4, 2.6, IRON);
  },
  lance(g) {
    shaft(g, 14, -38); part(g, p => { p.moveTo(0.8, -37.6); p.lineTo(11.6, -34.4); p.quadraticCurveTo(8.6, -32.6, 9.6, -30.4); p.lineTo(0.8, -29.6); p.closePath(); }, RED, P(5, -38, 12, -38, 12, -29, 6, -29), { lw: 0.9 }); line(g, [1.4, -36.6, 9.4, -34.2], OCHRE, 0.8);
    band(g, -38.8, 4.6, 2.6); blade(g, P(-2.9, -39.2, 0, -52, 2.9, -39.2, 0, -37.2), P(-3, -39, 0, -52.4, 0, -37), P(1.5, -39.6, 0.5, -48, 0.5, -38.6)); band(g, 11.4, 4.4, 2.6, IRON);
  },
  woldo(g) {
    shaft(g, 20, -30, '#7a3a2a', 2); for (const y of [8, -6]) band(g, y, 4.6, 1.8);
    blade(g, p => { p.moveTo(-1.2, -29); p.quadraticCurveTo(13.6, -34, 9, -50); p.quadraticCurveTo(7.6, -44.4, 4.6, -43.4); p.lineTo(5, -40.6); p.quadraticCurveTo(1.6, -40.4, -1.8, -43); p.closePath(); }, p => { p.moveTo(-2, -29); p.lineTo(-2, -44); p.quadraticCurveTo(2, -40, 5, -40); p.quadraticCurveTo(3, -33, 0, -29); p.closePath(); }, p => { p.moveTo(3, -31); p.quadraticCurveTo(11.6, -35, 8.8, -48); p.quadraticCurveTo(9.4, -36, 2, -32.4); p.closePath(); });
    ell(g, 2.2, -36.4, 1, 1, '#f8f0dc', INK, 0.5); part(g, P(-3.4, -30.4, 3.4, -30.4, 2.6, -27.2, -2.6, -27.2), BRASS, P(0.4, -31, 4, -31, 3, -27), { lw: 0.8 });
    tassel(g, -2.2, -27.6, 7, RED, 0.5);
  },
  club(g) {
    part(g, p => { p.moveTo(-1.7, 4.6); p.quadraticCurveTo(-2.4, -10, -5.2, -24); p.quadraticCurveTo(-4.6, -31, 0.6, -31); p.quadraticCurveTo(5.6, -30, 5, -23); p.quadraticCurveTo(2.6, -10, 1.7, 4.6); p.closePath(); }, WOOD, p => { p.moveTo(1, -32); p.lineTo(7, -32); p.lineTo(3, 5); p.lineTo(0.4, 5); p.closePath(); }, { hi: P(-3.6, -26, -2.4, -26, -1.2, -6, -1.8, -6), hk: 0.22 });
    for (const [x, y] of [[-1.4, -22], [1.9, -18], [-0.9, -13], [2.2, -26], [-2.6, -27]]) { ell(g, x, y, 1.3, 1.3, '#3a2a22', INK, 0.4); ell(g, x - 0.4, y - 0.4, 0.4, 0.4, '#8a6a4a'); }
    for (const y of [-2, 1]) line(g, [-1.7, y, 1.7, y + 0.6], '#d9c39a', 1);
  },
  ironclub(g) {
    part(g, p => { p.moveTo(-1.8, 5.6); p.quadraticCurveTo(-2.6, -12, -5.4, -27); p.quadraticCurveTo(-4.6, -34, 0, -34); p.quadraticCurveTo(4.6, -34, 5.4, -27); p.quadraticCurveTo(2.6, -12, 1.8, 5.6); p.closePath(); }, IRON, P(1, -35, 7, -35, 3, 6, 0.4, 6), { hi: P(-3.8, -29, -2.6, -29, -1.2, -6, -1.8, -6), hic: '#7a7a88' });
    for (const [x, y, sg] of [[-5, -24, -1], [5, -24, 1], [-4.2, -15, -1], [4.2, -15, 1], [-3.2, -7, -1], [3.2, -7, 1]]) part(g, P(x, y - 2.2, x + sg * 4.8, y, x, y + 2.2), '#c9cdd2', null, { lw: 0.7 }); part(g, P(-2.2, -33, 0, -38.4, 2.2, -33), '#c9cdd2', null, { lw: 0.7 });
    for (const y of [-1, 2.2]) line(g, [-1.8, y, 1.8, y + 0.5], BRASS, 1.1);
  },
  mace(g) {
    shaft(g, 6, -14, '#5a3a26', 2.1); band(g, 3, 4.4, 2, BRASS); rope(g, p => { p.moveTo(0, 6); p.quadraticCurveTo(-4.6, 10, -1.6, 12.6); }, RED, 0.9);
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; part(g, P(Math.cos(a - 0.32) * 5.2, -19.5 + Math.sin(a - 0.32) * 5.2, Math.cos(a) * 9.6, -19.5 + Math.sin(a) * 9.6, Math.cos(a + 0.32) * 5.2, -19.5 + Math.sin(a + 0.32) * 5.2), '#9a9aa6', null, { lw: 0.7 }); }
    part(g, E(0, -19.5, 6.4, 6.4), IRON, E(1.8, -17.8, 5.4, 5.4), { hi: E(-2.2, -21.8, 2, 1.2), hic: '#8a8a98', lw: 1.2 }); ell(g, 0, -19.5, 1.3, 1.3, '#9a9aa6', INK, 0.5);
  },
  stick(g) { shaft(g, 3, -12, '#d9b77a', 1.5); part(g, E(0, -14.2, 2.6, 2.8), WHITE, E(0.8, -13.6, 2, 2.2), { k: 0.14, lw: 0.9 }); line(g, [-1.4, -11.6, 1.4, -11.6], RED, 0.9); },
  arm(g) { part(g, R(-2.2, -30, 4.4, 34), '#b98a55', R(0.4, -30, 2, 34), { lw: 1.2 }); for (const y of [-22, -10, 0]) line(g, [-2.2, y, 2.2, y], '#7a4a2c', 0.8); part(g, p => { p.moveTo(-7, -30); p.quadraticCurveTo(-7, -37, 0, -37); p.quadraticCurveTo(7, -37, 7, -30); p.closePath(); }, WOODD, P(1, -38, 8, -38, 8, -29, 2, -29), { lw: 1.1 }); part(g, E(0, -38, 5.2, 4.8), '#a59f8f', E(1.6, -36.8, 4.2, 3.8), { hi: E(-1.8, -39.8, 1.6, 0.9), lw: 1.1 }); },
  none() {},
  // ── 갈아 끼우는 무기 ──
  twin(g) { blade(g, p => { p.moveTo(-1.3, -4); p.quadraticCurveTo(-0.6, -13, 3.8, -24); p.quadraticCurveTo(3, -12, 1.6, -4); p.closePath(); }, p => { p.moveTo(-2, -4); p.quadraticCurveTo(-1, -13, 3.8, -24.4); p.quadraticCurveTo(0.4, -13, 0, -4); p.closePath(); }, p => { p.moveTo(1.2, -5); p.quadraticCurveTo(2.6, -12, 3.6, -22.6); p.quadraticCurveTo(2, -12, 0.8, -5); p.closePath(); }); guard(g, -4.2, 6.4); hilt(g, -3, 3.8, '#7a1f1c'); ell(g, 0, 4.6, 1.5, 1.2, OCHRE, INK, 0.6); },
  axe(g) {
    shaft(g, 7, -23, WOOD, 1.9); band(g, 4, 4.4, 2, IRON);
    part(g, p => { p.moveTo(-1.6, -24.6); p.quadraticCurveTo(8, -28.4, 12, -21.6); p.quadraticCurveTo(13.4, -14.4, 8.8, -9); p.quadraticCurveTo(5, -13.6, -1.6, -12.6); p.closePath(); }, '#6e727c', p => { p.moveTo(-2, -18); p.quadraticCurveTo(6, -17, 9, -9); p.lineTo(-2, -9); p.closePath(); }, { hi: p => { p.moveTo(8.6, -25.4); p.quadraticCurveTo(13.6, -18, 9, -9.4); p.quadraticCurveTo(11, -18, 7.4, -24.4); p.closePath(); }, hic: '#eef2f4' });
    band(g, -25, 4.6, 2.6, IRON);
  },
  flail(g) { shaft(g, 7, -20, WOOD, 1.9); band(g, -22, 4.4, 2.8, IRON); for (const [x, y] of [[1.7, -23.6], [3.5, -25.2], [5.3, -26.6]]) { ell(g, x, y, 1.3, 1.1, null, INK, 1.7); ell(g, x, y, 1.3, 1.1, null, '#9a9aa6', 0.8); } g.save(); g.translate(6.4, -26.8); g.rotate(2.5); part(g, R(-2.1, -15.4, 4.2, 15.4), WOODD, R(0.3, -15.4, 2, 15.4), { lw: 1.1 }); for (const y of [-13, -8.4, -3.8]) band(g, y, 5.2, 1.9, IRON); g.restore(); },
  dangpa(g) {
    shaft(g, 12, -30); band(g, -31, 4.6, 2.6);
    for (const s of [-1, 1]) { const c = p => { p.moveTo(0, -30); p.quadraticCurveTo(s * 8.6, -30.6, s * 7.4, -42); }; curve(g, c, INK, 3.4); curve(g, c, '#dfe5e8', 1.8); part(g, P(s * 6.2, -41, s * 7.6, -45.4, s * 8.8, -41), '#dfe5e8', null, { lw: 0.8 }); }
    blade(g, P(-2.4, -31, 0, -47.4, 2.4, -31), P(-2.6, -31, 0, -47.8, 0, -31), P(1.2, -31.6, 0.4, -43, 0.4, -31.6)); tassel(g, -0.6, -27.6, 7, RED, 0.5);
  },
  hyeopdo(g) {
    shaft(g, 16, -24, '#5a3a2a', 1.9); for (const y of [4, 10]) band(g, y, 4.4, 1.6);
    blade(g, p => { p.moveTo(-1.8, -24.6); p.quadraticCurveTo(-2.2, -39, 5.6, -49); p.quadraticCurveTo(6.2, -36, 2.2, -24.6); p.closePath(); }, p => { p.moveTo(-2.4, -24); p.quadraticCurveTo(-2.6, -39, 5.6, -49.6); p.quadraticCurveTo(0.6, -38, 0.2, -24); p.closePath(); }, p => { p.moveTo(1.9, -25.6); p.quadraticCurveTo(5.4, -36, 5.4, -47); p.quadraticCurveTo(3.8, -36, 1.2, -25.6); p.closePath(); });
    guard(g, -24.6, 7); tassel(g, -1, -22.4, 6.6, RED, 0.4);
  },
  bigaxe(g) {
    shaft(g, 10, -30, WOODD, 2.2); band(g, 6, 4.8, 2, BRASS);
    for (const s of [-1, 1]) part(g, p => { p.moveTo(s * 0.8, -29.6); p.quadraticCurveTo(s * 9.4, -35, s * 14, -27.4); p.quadraticCurveTo(s * 15.6, -20, s * 11.8, -12.6); p.quadraticCurveTo(s * 6, -18.2, s * 0.8, -17); p.closePath(); }, '#6e727c', p => { p.moveTo(s * 0.8, -23); p.quadraticCurveTo(s * 8, -22, s * 12, -12); p.lineTo(s * 0.8, -12); p.closePath(); }, { hi: p => { p.moveTo(s * 10.4, -31.4); p.quadraticCurveTo(s * 15.8, -24, s * 12, -13.2); p.quadraticCurveTo(s * 13.4, -23, s * 9.4, -30); p.closePath(); }, hic: '#eef2f4' });
    part(g, R(-2.5, -30.4, 5, 14.4), IRON, R(0.4, -30.4, 2.2, 14.4), { lw: 0.9 }); part(g, P(-1.9, -30.4, 0, -36.4, 1.9, -30.4), '#dfe5e8', null, { lw: 0.8 });
  },
  thresher(g) { shaft(g, 9, -24, WOODD, 2.1); band(g, -26.4, 4.6, 3, IRON); for (const [x, y] of [[-1.7, -27.8], [-3.3, -29.6], [-4.9, -31.2]]) { ell(g, x, y, 1.4, 1.2, null, INK, 1.8); ell(g, x, y, 1.4, 1.2, null, '#9a9aa6', 0.8); } g.save(); g.translate(-6, -31.6); g.rotate(-2.3); part(g, R(-2.5, -17.4, 5, 17.4), IRON, R(0.4, -17.4, 2.2, 17.4), { hi: R(-1.9, -16.4, 0.9, 15), hic: '#7a7a88', lw: 1.1 }); for (const [x, y, sg] of [[-2.5, -13, -1], [2.5, -13, 1], [-2.5, -7, -1], [2.5, -7, 1]]) part(g, P(x, y - 1.7, x + sg * 3.8, y, x, y + 1.7), '#c9cdd2', null, { lw: 0.6 }); g.restore(); },
  // 각궁: 뿔과 나무를 겹친 짧은 활
  bow(g, o = {}) {
    const c = p => { p.moveTo(5.2, -19.4); p.bezierCurveTo(0.6, -18.6, -7, -10, -2.2, 0); p.bezierCurveTo(-7, 10, 0.6, 18.6, 5.2, 19.4); };
    curve(g, c, INK, 3.9); curve(g, c, o.wood || '#8a4f2c', 2.3); curve(g, p => { p.moveTo(4, -18.6); p.bezierCurveTo(0.4, -17.4, -5.4, -10, -1.4, -1); }, lt(o.wood || '#8a4f2c', 0.4), 0.7);
    for (const y of [-19.4, 19.4]) part(g, P(4.2, y - (y < 0 ? 0.4 : 2.2), 7.4, y - (y < 0 ? 2.4 : -0.4), 6.4, y + (y < 0 ? 1.8 : -1.8)), o.tip || '#3a2a26', null, { lw: 0.7 });
    line(g, [6.2, -19.6, 6.2, 19.6], '#fbf7ec', 0.8); for (const y of [-12.6, 12.6]) line(g, [-3.4, y, 0.8, y + (y < 0 ? -1.9 : 1.9)], o.wrap || OCHRE, 1.5);
    part(g, R(-3.6, -3.2, 3.2, 6.4), o.grip || '#7a1f1c', R(-2, -3.2, 1.6, 6.4), { lw: 0.8 });
    if (o.extra) o.extra(g); part(g, E(-0.8, 0, 3.1, 3), SKIN, E(0.4, 1.2, 2.6, 2.2), { lw: 1.1 });
  },
  firebow(g) { WEAPONS.bow(g, { wood: '#a8322a', wrap: '#2b2a30', tip: OCHRE, extra: gg => { for (const y of [-19.4, 19.4]) { part(gg, p => { p.moveTo(6, y - 5); p.quadraticCurveTo(10.4, y - 1, 7.6, y + 3); p.quadraticCurveTo(6, y + 4.2, 4.4, y + 3); p.quadraticCurveTo(2, y - 0.4, 6, y - 5); p.closePath(); }, '#ff9a2e', null, { lw: 0.8 }); ell(gg, 6, y + 0.8, 1.2, 1.5, '#ffe9a0'); } } }); },
  pyeonjeon(g) { WEAPONS.bow(g, { wood: '#3a3238', wrap: RED, tip: BRASS, extra: gg => { gg.save(); gg.translate(1.6, 0); gg.rotate(1.5708); part(gg, R(-1.9, -11.6, 3.8, 17), '#d9b77a', R(0.2, -11.6, 1.7, 17), { lw: 0.9 }); for (const y of [-7.6, -2.6, 2.4]) line(gg, [-1.9, y, 1.9, y], '#8a6a3c', 0.8); gg.restore(); } }); },
  greatbow(g) { g.save(); g.scale(1.1, 1.1); WEAPONS.bow(g, { wood: '#5a3a2a', wrap: RED, tip: BRASS, grip: '#2b2a30' }); g.restore(); },
  // 꽹과리 채: 끝에 삼색 천을 단 나무 채
  chae(g) { line(g, [0, 3, -4.6, 10], RED, 1.2); line(g, [0, 3, 0.6, 11], OCHRE, 1.2); line(g, [0, 3, 4.6, 9.4], INDIGO, 1.2); shaft(g, 4, -15, '#d9b77a', 1.5); part(g, E(0, -17.4, 3.1, 3.3), WOODD, E(1, -16.6, 2.4, 2.6), { hi: E(-1, -18.6, 0.9, 0.6), lw: 1 }); band(g, 1.6, 3.6, 1.8, OCHRE); },
  crossbow(g) {
    part(g, P(-2.2, -20.4, 2.2, -20.4, 2.6, 6, 1, 8.4, -1, 8.4, -2.6, 6), WOOD, R(0.3, -21, 3, 30), { hi: R(-1.7, -19, 0.8, 23), hk: 0.22, lw: 1.1 });
    const c = p => { p.moveTo(-12, -9.4); p.quadraticCurveTo(0, -21.4, 12, -9.4); }; curve(g, c, INK, 3.8); curve(g, c, '#5a3a26', 2.2); line(g, [-12, -9.4, 0, -5.6, 12, -9.4], '#fbf7ec', 0.8);
    line(g, [0, -5.6, 0, -22.4], INK, 2.2); line(g, [0, -5.6, 0, -22.4], '#e9d9b0', 1.1); part(g, P(-1.6, -22, 0, -26.6, 1.6, -22), '#dfe5e8', null, { lw: 0.7 }); band(g, -4.8, 5.6, 2.6, IRON); band(g, -17.6, 5, 2, BRASS);
  },
  gun(g) {
    part(g, R(-1.5, -35, 3, 31), IRON, R(0.2, -35, 1.4, 31), { hi: R(-1.1, -34, 0.6, 29), hic: '#8a8a98', lw: 1 });
    part(g, p => { p.moveTo(-2.4, -15); p.lineTo(2.4, -15); p.lineTo(2.8, 2); p.quadraticCurveTo(5.8, 7.4, 3.6, 12); p.lineTo(-1.8, 11.4); p.quadraticCurveTo(-1.4, 5, -2.8, 2); p.closePath(); }, WOODD, p => { p.moveTo(0.4, -16); p.lineTo(4, -16); p.lineTo(6, 12); p.lineTo(1.2, 12); p.closePath(); }, { hi: P(-1.9, -14, -1.1, -14, -1.4, 1, -2.2, 1), hk: 0.24, lw: 1.1 });
    for (const y of [-28, -20, -11]) band(g, y, 4, 1.7, BRASS);
    curve(g, p => { p.moveTo(2.2, -9); p.quadraticCurveTo(6.8, -11.4, 4.8, -4.6); }, INK, 2.2); curve(g, p => { p.moveTo(2.2, -9); p.quadraticCurveTo(6.8, -11.4, 4.8, -4.6); }, IRON, 1.1); rope(g, p => { p.moveTo(4.8, -4.6); p.quadraticCurveTo(7.4, 0, 4.6, 3); }, '#d9c39a', 0.8); ell(g, 4.8, -4.4, 1.1, 1.1, '#ff9a2e', INK, 0.4);
  },
  // 부적: 괴황지에 주사로 쓴 부적
  firetal(g, o = {}) {
    const paper = o.paper || '#f0d264', ic = o.inkc || '#b8342a';
    g.save(); g.rotate(0.06);
    part(g, p => { p.moveTo(-4, -22); p.lineTo(4, -22); p.lineTo(4, -4.6); p.lineTo(2.4, -3.4); p.lineTo(0.8, -4.8); p.lineTo(-0.8, -3.4); p.lineTo(-2.4, -4.8); p.lineTo(-4, -3.6); p.closePath(); }, paper, P(1, -23, 5, -23, 5, -3, 1.6, -3), { k: 0.12, lw: 1 });
    rr(g, -2.9, -20.8, 5.8, 15, 0.4, null, ic, 0.55); ell(g, 0, -19, 1.1, 1.1, null, ic, 0.7);
    g.beginPath(); if (o.bolt) { g.moveTo(1.4, -17); g.lineTo(-1.6, -12.4); g.lineTo(0.8, -11.8); g.lineTo(-1.4, -6.8); } else { g.moveTo(-1.7, -16.6); g.lineTo(1.7, -15); g.lineTo(-1.7, -12.8); g.lineTo(1.7, -10.6); g.lineTo(-1.2, -8.6); g.lineTo(0.6, -7); } st(g, ic, 1.1);
    g.restore();
  },
  icetal(g) { WEAPONS.firetal(g, { paper: '#d6eef6', inkc: INDIGO }); for (const [x, y] of [[-5.8, -18], [5.6, -10]]) for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI; line(g, [x - Math.cos(a) * 2, y - Math.sin(a) * 2, x + Math.cos(a) * 2, y + Math.sin(a) * 2], '#6fb6d6', 0.9); } },
  bolttal(g) { WEAPONS.firetal(g, { paper: '#f3ecff', inkc: '#6a4a9a', bolt: true }); part(g, P(4.8, -21, 7.4, -17, 5.6, -16.4, 7.8, -11.6, 5.2, -15, 6.6, -15.4), OCHRE, null, { lw: 0.6 }); },
  featherfan(g) { for (let i = -2; i <= 2; i++) { g.save(); g.rotate(i * 0.3); part(g, p => { p.moveTo(-1.9, 0); p.quadraticCurveTo(-3.6, -9, 0, -16); p.quadraticCurveTo(3.6, -9, 1.9, 0); p.closePath(); }, WHITE, P(0.2, -17, 4, -17, 4, 1, 0.6, 1), { k: 0.12, lw: 0.8 }); line(g, [0, -1, 0, -13.6], '#a9b8bc', 0.6); for (const y of [-5, -8.6]) { line(g, [0, y, -1.7, y - 1.6], '#c9d4d6', 0.5); line(g, [0, y, 1.7, y - 1.6], '#c9d4d6', 0.5); } g.restore(); } part(g, R(-1.5, -1, 3, 7.4), WOODD, R(0.2, -1, 1.4, 7.4), { lw: 0.8 }); ell(g, 0, 0.4, 2.1, 2.1, OCHRE, INK, 0.7); tassel(g, 0, 6.6, 4.6, RED, 0); },
  fans(g) {
    const cols = [RED, OCHRE, INDIGO, TEAL, RED], a0 = -Math.PI * 0.5 - 0.95;
    for (let i = 0; i < 5; i++) part(g, p => { p.moveTo(0, 0); p.arc(0, 0, 12.4, a0 + i * 0.38, a0 + (i + 1) * 0.38); p.closePath(); }, cols[i], p => { p.moveTo(0, 0); p.arc(0, 0, 13, a0 + (i + 0.55) * 0.38, a0 + (i + 1) * 0.38); p.closePath(); }, { lw: 0.8 });
    curve(g, p => p.arc(0, 0, 12.4, a0, a0 + 1.9), '#fbf7ec', 1.5); curve(g, p => p.arc(0, 0, 12.4, a0, a0 + 1.9), INK, 0.5); curve(g, p => p.arc(0, 0, 5, a0, a0 + 1.9), 'rgba(38,42,54,0.5)', 0.6);
    ell(g, 0, 0, 1.7, 1.7, OCHRE, INK, 0.7); line(g, [0, 1, -1.5, 7.6], RED, 1); line(g, [0, 1, 1.7, 6.8], INDIGO, 1);
  },
  staff(g) { shaft(g, 20.4, -33, '#8a6a3c', 1.9); band(g, -33.6, 4.6, 2.4, BRASS); const ring = (x, y, r, lw) => { curve(g, p => p.arc(x, y, r, 0, TAU), INK, lw + 1.5); curve(g, p => p.arc(x, y, r, 0, TAU), '#e6b93e', lw); curve(g, p => p.arc(x, y, r, 3.6, 5), '#fff3c0', lw * 0.5); }; ring(0.4, -38.6, 4.8, 1.7); for (const s of [-1, 1]) { ring(0.4 + s * 4.8, -34.4, 2, 1); ring(0.4 + s * 3.2, -31, 1.6, 0.9); } },
  bells(g) { shaft(g, 5, -12, WOODD, 1.7); line(g, [0, -4, -5, 4.4], RED, 1.3); line(g, [0, -4, 4.6, 5.2], INDIGO, 1.3); line(g, [0, -4, -1, 7.4], OCHRE, 1.3); for (const [x, y] of [[-4.6, -13], [4.6, -13], [0, -11.4], [-3.2, -20.6], [3.4, -20.4], [0, -17.8]]) { part(g, E(x, y, 2.7, 2.7), '#e6b93e', E(x + 0.9, y + 0.9, 2.1, 2.1), { hi: E(x - 0.9, y - 1, 0.8, 0.5), hic: '#fff3c0', lw: 0.9 }); line(g, [x - 1.4, y + 1, x + 1.4, y + 1], INK, 0.6); } },
  bowl(g) { for (const [a, l] of [[-0.5, 15], [0.1, 18], [0.6, 14]]) { g.save(); g.translate(0, -7); g.rotate(a); line(g, [0, 0, 0, -l], '#3f6b5c', 1.2); for (let y = -4; y > -l; y -= 3.6) { ell(g, -1.8, y, 1.9, 0.9, '#5f9a6a', INK, 0.5, 0.6); ell(g, 1.8, y - 1.6, 1.9, 0.9, '#5f9a6a', INK, 0.5, -0.6); } g.restore(); } part(g, p => { p.moveTo(-7.6, -7.4); p.quadraticCurveTo(-6.8, 1.4, 0, 1.4); p.quadraticCurveTo(6.8, 1.4, 7.6, -7.4); p.closePath(); }, WHITE, P(1.6, -8, 8, -8, 8, 2, 2.6, 2), { k: 0.12, lw: 1.1 }); part(g, E(0, -7.4, 7.6, 2.3), '#bfe3ee', E(1.6, -6.8, 5.6, 1.5), { k: 0.14, lw: 1 }); line(g, [-5.2, -2.6, 5.2, -2.6], INDIGO, 0.9); rr(g, -3, 1.2, 6, 1.9, 0.6, WHITE, INK, 0.8); },
};

// ───────────── 병종별 외형 ─────────────
// doll = 사람 인형 옵션, dok = 도깨비 옵션, body = 한 장짜리 그림 (blinkBody 가 있으면 눈 감은 그림도 굽는다)
const hold = (a, mode, x, y) => ({ x: x === undefined ? HX : x, y: y === undefined ? HY : y, a, mode: mode || 'slash' });
const DK = (o, extra) => Object.assign({ dok: o, weapon: 'club', hold: hold(0.35, 'slash', 16.4, -21), h: 64, neck: 27 }, extra);
const CREAM = '#f1ead6';
// 장산범: 흰 털이 길게 늘어진 범. 눈이 붉고 입을 벌리고 있다
const JANGSAN = { coat: '#f3efe6', belly: '#ffffff', stripe: '#c9c3b6', eye: '#e0503f', shag: true, roar: true };
const GHOST = { robe: '#c5d9df', top: '#b3ccd4', collar: '#eef6f8', git: '#9ab6c0', cuff: '#eef6f8', skin: '#e9f0f1', pale: true, tatter: true, ghost: true, eyes: 'ghost', mouth: 'frown', hair: '#5a6a72' };
export const LOOKS = {
  // 아군
  sword: { doll: { robe: INDIGO, top: '#2f2d38', sleeve: '#b8342a', git: '#1f1e26', legs: CREAM, sash: OCHRE, hem: '#22385c', hat: 'jeonrip', brow: 'stern', eyes: 'sharp', mouth: 'flat' }, hold: hold(0.3), h: 63 },
  shield: { doll: { robe: TEAL, top: '#4f8270', legs: CREAM, sash: OCHRE, hem: '#2c4f44', hat: 'band', skin: '#e4bb8e', jaw: 'square', eyes: 'round', brow: 'flat', nose: 'broad', mouth: 'grit', item: ITEM.shield }, hold: hold(0.25), h: 60 },
  spear: { doll: { robe: '#efe6d0', top: '#f6efdc', vest: '#9a5a3c', git: '#7a4a2c', legs: '#e3d9bf', shoe: '#c9a86a', sash: INDIGO, hat: 'paeraeng', skin: '#e8c093', jaw: 'round', eyes: 'droop', brow: 'worry', mouth: 'flat', beard: 'stubble' }, hold: hold(0.1, 'thrust'), h: 60 },
  knight: { doll: { riding: true, lift: 25.5, under: g => { g.save(); g.translate(3, 0); g.scale(1.35, 1.35); horse(g); g.restore(); }, robe: '#a84a32', top: '#b8553a', legs: '#3a3640', studs: true, pauldron: '#aeb6bd', sash: OCHRE, hem: OCHRE, hat: 'tugu', metal: '#aeb6bd', jaw: 'square', brow: 'thick', eyes: 'calm', beard: 'mustache', mouth: 'flat' }, hold: hold(0.18, 'thrust', HX, HY - 25.5), h: 96, w: 150, ox: 64, scale: 0.86 },
  xbow: { doll: { robe: '#f3ecdd', top: '#f6f0e2', vest: INDIGO, git: '#22385c', legs: CREAM, sash: RED, hat: 'band', bandCol: INDIGO, jaw: 'slim', brow: 'thin', eyes: 'calm', mouth: 'flat', back: ITEM.quiver }, hold: hold(0, 'shoot'), h: 60 },
  wizard: { doll: { robe: '#8fa6b8', top: '#9db3c4', git: '#5f7890', sash: BLACK, hem: '#5f7890', dots: '#dfe8ee', hat: 'yugeon', beard: 'goatee', skin: '#f3d6b2', jaw: 'long', brow: 'arch', eyes: 'heavy', mouth: 'flat' }, hold: hold(0, 'cast'), h: 64 },
  priest: { doll: { robe: WHITE, top: '#fffaf0', git: RED, stripes: [RED, OCHRE, INDIGO], goreum: RED, sash: RED, hem: RED, hat: 'gokkal', skin: '#f6dcc0', jaw: 'round', brow: 'thin', eyes: 'soft', lash: true, lip: '#b8443a', mouth: 'flat' }, hold: hold(0, 'cast'), h: 66 },
  cannon: { body: cart, weapon: 'none', hold: hold(0, 'shoot'), h: 46, still: true },
  berserk: { doll: { robe: '#6b5a44', legs: '#d9cdb0', bare: true, bareChest: true, sash: RED, hem: '#4a3d2e', hat: 'band', bandCol: RED, skin: '#dcae80', jaw: 'square', brow: 'bushy', eyes: 'glare', nose: 'broad', beard: 'short', mouth: 'grit', scar: true }, hold: hold(0.4), wide: 1.16, h: 60 },
  // 영웅
  commander: { doll: { robe: '#8a2a26', top: '#b8342a', studs: true, pauldron: '#d9b24a', git: '#7a1f1c', legs: '#2f2d38', sash: OCHRE, hem: OCHRE, hat: 'tugu', beard: 'full', jaw: 'square', brow: 'thick', eyes: 'calm', bags: true, mouth: 'flat', back: g => ITEM.cape(g, '#1f2a44') }, hold: hold(0.22), scale: 1.3, hero: true, h: 70 },
  bishop: { doll: { robe: '#9a9a92', top: '#a8a8a0', git: '#7a7a72', kasaya: '#a8442f', beads: true, hem: '#7a7a72', hat: 'bald', jaw: 'round', brow: 'old', browCol: '#7a7a72', eyes: 'closed', lines: true, mouth: 'smile' }, hold: hold(0, 'cast'), scale: 1.3, hero: true, h: 58 },
  archmage: { doll: { robe: WHITE, top: '#fffaf0', git: '#8fb6c8', sash: '#8fb6c8', hem: '#8fb6c8', hat: 'sage', beard: 'long', jaw: 'long', brow: 'old', old: true, eyes: 'narrow', lines: true, mouth: 'smile', item: ITEM.gourd, under: ITEM.cloud, lift: 3 }, hold: hold(0, 'cast', HX, HY - 3), scale: 1.3, hero: true, h: 64, float: true },
  blade: { doll: { robe: '#3a3f58', top: '#2f3348', git: '#1f2130', collar: '#b8342a', cuff: '#b8342a', legs: '#2a2c38', sash: '#b8342a', hem: '#b8342a', hat: 'satgat', skin: '#f3d6b2', jaw: 'slim', brow: 'thin', eyes: 'sharp', lash: true, lip: '#a8443a', mouth: 'flat', item: ITEM.braid }, hold: hold(0.3), scale: 1.3, hero: true, h: 66 },
  hunter: { doll: { robe: '#6b5a3c', top: '#7a6844', vest: '#d9963f', pelt: true, git: '#4a3d2e', legs: '#d9cdb0', shoe: '#5a4030', sash: '#4a3d2e', hem: '#4a3d2e', hat: 'fur', skin: '#e4bb8e', jaw: 'square', brow: 'flat', eyes: 'round', beard: 'stubble', mouth: 'smirk', back: ITEM.quiver }, hold: hold(0, 'shoot'), scale: 1.3, hero: true, h: 64 },
  sangsoe: { doll: { robe: '#f6efdc', top: '#fffaf0', vest: INDIGO, git: '#22385c', legs: CREAM, sash: OCHRE, hem: '#22385c', cross: [RED, OCHRE], hat: 'sangmo', skin: '#e8c093', jaw: 'round', brow: 'arch', eyes: 'smile', mouth: 'grin', item: ITEM.gong }, hold: hold(0.4, 'cast'), scale: 1.3, hero: true, h: 68 },
  chief: { doll: { robe: '#5a4a3a', top: '#6b4a3a', vest: '#8a6a4a', fur: true, bare: true, git: '#3a2a22', legs: '#3a3640', sash: '#8a2a26', hem: '#3a2a22', wrist: '#3a2a22', hat: 'wild', hair: '#3a2a26', skin: '#d9a878', jaw: 'square', brow: 'bushy', eyes: 'glare', nose: 'broad', beard: 'wild', scar: true }, hold: hold(0.4), wide: 1.16, scale: 1.3, hero: true, h: 62 },
  // 영물
  magpie: { body: magpie, weapon: 'none', hold: hold(0, 'bite'), h: 50, float: true, scale: 1.0 },
  sapsal: { body: sapsal, blinkBody: g => sapsal(g, { blink: true }), weapon: 'none', hold: hold(0, 'bite'), h: 36, scale: 0.98 },
  haetae: { body: haetae, blinkBody: g => haetae(g, { blink: true }), weapon: 'none', hold: hold(0, 'bite'), h: 58, w: 130, ox: 62, scale: 1.12 },
  samjoko: { body: samjoko, weapon: 'none', hold: hold(0, 'none'), h: 54, float: true, scale: 1.1 },
  tiger: { body: tiger, blinkBody: g => tiger(g, { blink: true }), weapon: 'none', hold: hold(0, 'bite'), h: 50, w: 130, ox: 62, scale: 1.08 },
  decoy: { body: scarecrow, weapon: 'none', hold: hold(0, 'none'), h: 54, still: true },
  stake: { body: stakeLog, weapon: 'none', hold: hold(0, 'none'), h: 40, still: true },
  banner: { body: bannerCart, weapon: 'none', hold: hold(0, 'none'), h: 104, still: true, scale: 1.1 },
  // 요괴
  goblin: DK({ skin: '#d9603f' }, { scale: 0.78 }),
  orc: DK({ skin: '#4f9a8a', cloth: '#d98a3e', warts: true }, { scale: 1.04 }),
  garcher: DK({ skin: '#d9963f', cloth: '#8a4f3a', item: DITEM.sling }, { weapon: 'none', hold: hold(0, 'shoot'), scale: 0.8 }),
  rshield: DK({ skin: '#8a64a8', cloth: '#d9c39a', item: DITEM.lid, warts: true }, { scale: 1.0 }),
  rassassin: { body: fox, blinkBody: g => fox(g, { blink: true }), weapon: 'none', hold: hold(0, 'bite'), h: 46 },
  treant: { body: jangseung, weapon: 'none', hold: hold(0, 'bite'), h: 68, scale: 1.2, still: true },
  sapling: { body: jangseung, weapon: 'none', hold: hold(0, 'bite'), h: 68, scale: 0.66 },
  bomber: { body: wisp, blinkBody: g => wisp(g, { blink: true }), weapon: 'none', hold: hold(0, 'none'), h: 46, float: true, border: '#e8f8fd' },
  wolf: { body: boar, blinkBody: g => boar(g, { blink: true }), weapon: 'none', hold: hold(0, 'bite'), h: 42, w: 130, ox: 62, scale: 1.05 },
  shaman: DK({ skin: '#d0688a', cloth: '#3f6b5c', item: DITEM.drum }, { weapon: 'stick', hold: hold(0.5, 'cast', 16.4, -21) }),
  skel: { doll: Object.assign({}, GHOST, { hat: 'jeonrip', plain: true }), weapon: 'rusty', hold: hold(0.3), float: true, border: '#e6f3f7', h: 63 },
  skelarcher: { doll: Object.assign({}, GHOST, { hat: 'band', bandCol: '#c5d9df', item: ITEM.bow }), weapon: 'none', hold: hold(0, 'shoot'), float: true, border: '#e6f3f7', h: 60 },
  catapult: { body: catapult, weapon: 'arm', hold: hold(-0.9, 'lob', 0, -17), h: 50, scale: 1.15, still: true },
  necro: { doll: { robe: '#2b2a31', top: '#35343c', git: '#6b6470', collar: '#c9c2d0', cuff: '#c9c2d0', sash: '#6b6470', skin: '#e6e3d8', pale: true, hat: 'gat', brow: 'stern', eyes: 'sharp', mouth: 'frown', iris: '#7a1f1c', item: ITEM.scroll }, weapon: 'none', hold: hold(0, 'cast'), scale: 1.12, h: 66 },
  dueok: DK({ skin: '#8a8294', cloth: '#3a2a2e', horns: 2, warts: true, beads: true, hair: '#8a2f24' }, { weapon: 'ironclub', scale: 1.28 }),
  yagwang: DK({ skin: '#cfd98a', cloth: '#3a3550', item: strawShoes, hair: '#4a4a66' }, { weapon: 'none', hold: hold(0, 'bite'), scale: 0.72 }),
  bulga: { body: bulgasari, blinkBody: g => bulgasari(g, { blink: true }), weapon: 'none', hold: hold(0, 'bite'), h: 54, w: 136, ox: 64, scale: 1.3 },
  jangsan: { body: g => tiger(g, JANGSAN), blinkBody: g => tiger(g, Object.assign({ blink: true }, JANGSAN)), weapon: 'none', hold: hold(0, 'bite'), h: 50, w: 130, ox: 62, scale: 1.16 },
  geuseun: { body: geuseundae, weapon: 'none', hold: hold(0, 'bite'), h: 72, scale: 1.2, float: true, border: '#dcd6f2' },
  // 두목
  warchief: DK({ skin: '#3f6f9f', horns: 2, beads: true, warts: true }, { weapon: 'ironclub', scale: 2.0, boss: true, h: 66 }),
  elder: { body: mokshin, weapon: 'none', hold: hold(0, 'bite'), h: 72, scale: 2.2, boss: true, still: true },
  skelking: { body: eoduksini, weapon: 'none', hold: hold(0, 'bite'), h: 62, scale: 2.1, boss: true, float: true },
};

export const UNIT_SCALE = 1.1;
const cache = new Map();
// 머리는 작은 종이에 따로 굽는다 (고개 까딱임·눈 깜빡임)
const HEAD = { w: 74, h: 68, ox: 37, oy: 80, bw: 1.7 };
export function getLook(type) {
  let L = cache.get(type); if (L) return L;
  const d = LOOKS[type]; if (!d) throw new Error('unknown look ' + type);
  const lift = d.doll && d.doll.lift || 0, o = { w: d.w || 110, ox: d.ox || 55, h: 132, oy: 114, border: d.border }, ho = Object.assign({ border: d.border }, HEAD, { oy: HEAD.oy + lift });
  const wrap = fn => d.wide ? g => { g.scale(d.wide, 1); fn(g); } : fn;
  let front, head = null, blink = null, frontBlink = null;
  if (d.doll) {
    const q = d.doll, up = g => { if (q.lift) g.translate(0, -q.lift); };
    front = paperSprite(wrap(g => { if (q.under) q.under(g); up(g); doll(g, q, 'body'); }), o);
    head = paperSprite(wrap(g => { up(g); doll(g, q, 'head'); }), ho);
    if (q.eyes !== 'closed' && q.eyes !== 'ghost') blink = paperSprite(wrap(g => { up(g); doll(g, Object.assign({}, q, { blink: true }), 'head'); }), ho);
  } else if (d.dok) {
    front = paperSprite(g => dokkaebi(g, d.dok, 'body'), o); head = paperSprite(g => dokkaebi(g, d.dok, 'head'), ho); blink = paperSprite(g => dokkaebi(g, Object.assign({}, d.dok, { blink: true }), 'head'), ho);
  } else { front = paperSprite(wrap(d.body), o); if (d.blinkBody) frontBlink = paperSprite(wrap(d.blinkBody), o); }
  const weapon = d.weapon && d.weapon !== 'none' ? paperSprite(WEAPONS[d.weapon], { w: 60, h: 90, ox: 30, oy: 62, border: d.border }) : null;
  L = { front, back: front, head, blink, frontBlink, neck: (d.neck || 33) + lift, weapon, hold: d.hold, scale: (d.scale || 1) * UNIT_SCALE, h: d.h || 60, hero: !!d.hero, boss: !!d.boss, float: !!d.float, still: !!d.still };
  cache.set(type, L); return L;
}
// 지금 눈을 깜빡일 때인가 (인형마다 박자가 조금씩 다르다)
export const blinking = (t, id = 0) => ((t * 0.9 + id * 0.37) % 3.3) < 0.12;
// 갈아 끼우는 무기: 그림 한 장 + 쥐는 법 (data/weapons.js 의 a·mode·hand)
const wcache = new Map();
export function getWeapon(wid) {
  let w = wcache.get(wid); if (w) return w;
  const d = WDATA[wid]; if (!d) return null;
  w = { spr: paperSprite(WEAPONS[d.spr] || WEAPONS.hwando, { w: 64, h: 104, ox: 32, oy: 66 }), a: d.a || 0, mode: d.mode || 'slash', hand: d.hand || 'R', cast: d.cast === undefined ? 0.95 : d.cast };
  wcache.set(wid, w); return w;
}
const lcache = new Map();
export function leftover(kind) { let s = lcache.get(kind); if (!s) { s = paperSprite(LEFTOVER[kind] || LEFTOVER.broom, { w: 44, h: 44, ox: 22, oy: 24, bw: 1.6 }); lcache.set(kind, s); } return s; }
export const baseWeapon = type => (ARMS[type] ? ARMS[type].base : null);
export function preloadLooks() { for (const k of Object.keys(LOOKS)) getLook(k); for (const k of Object.keys(WDATA)) getWeapon(k); }

// 인형 초상 (패·정보창용): 몸 + 머리 + 손에 든 무기
export function portrait(g, type, x, y, s, t = 0, bob = false, wpn) {
  const L = getLook(type), k = s * L.scale, yy = y - (bob ? Math.abs(Math.sin(t * 5)) * 3 * s : 0), h = L.hold, bl = t > 0 && blinking(t, type.length);
  drawSprite(g, bl && L.frontBlink ? L.frontBlink : L.front, x, yy, k, k);
  if (L.head) drawSprite(g, bl && L.blink ? L.blink : L.head, x, yy + (bob ? Math.sin(t * 5) * 0.5 * s : 0), k, k);
  const W = getWeapon(wpn || baseWeapon(type));
  if (W) {
    if (W.hand === 'L') drawSprite(g, W.spr, x + (-h.x - 2) * k, yy + h.y * k, k, k, W.a);
    else if (W.hand === 'C') drawSprite(g, W.spr, x + h.x * 0.42 * k, yy + (h.y - 1.5) * k, k, k, W.a);
    else { drawSprite(g, W.spr, x + h.x * k, yy + h.y * k, k, k, W.a); if (W.hand === 'B') drawSprite(g, W.spr, x - h.x * k, yy + h.y * k, -k, k, -W.a); }
  } else if (L.weapon) drawSprite(g, L.weapon, x + h.x * k, yy + h.y * k, k, k, h.a);
}
// 무기 그림만 (보관함·전리품용). [그림 중심까지의 거리, 길이] 로 칸 가운데에 비슷한 크기로 맞춘다
const ICON = { chae: [6, 26], hwando: [12, 34], twin: [10, 28], axe: [9, 34], flail: [12, 40], spear: [16, 56], lance: [18, 64], dangpa: [17, 58], hyeopdo: [16, 64], woldo: [14, 68], mace: [11, 34], bigaxe: [12, 45], thresher: [15, 52], crossbow: [8, 34], gun: [11, 46], firetal: [12.5, 20], icetal: [12.5, 20], bolttal: [12.5, 20], featherfan: [5, 24], fans: [3, 22], staff: [11, 62], bells: [8, 30], bowl: [10, 28] };
export function weaponIcon(g, wid, x, y, s = 1) {
  const W = getWeapon(wid), d = WDATA[wid]; if (!W) return;
  if (W.hand === 'L') { drawSprite(g, W.spr, x + 2 * s, y, s * 1.6, s * 1.6, 0.5); return; }
  const [c, span] = ICON[d.spr] || [12, 34], k = s * Math.min(2.7, 62 / span), rot = d.spr === 'fans' || d.spr === 'bowl' || d.spr === 'featherfan' ? 0 : 0.6;
  drawSprite(g, W.spr, x - Math.sin(rot) * c * k, y + Math.cos(rot) * c * k, k, k, rot);
}
