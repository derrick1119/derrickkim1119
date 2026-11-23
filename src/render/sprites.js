// 병종 인형 스프라이트 — 몸 한 장 + (사람·도깨비는) 머리 한 장 + 손에 든 무기 한 장. 그림은 figures.js
import { TAU, INK, PAPER, RED, INDIGO, TEAL, OCHRE, SKIN, st, fs, ell, rr, poly, line, path, paperSprite, drawSprite } from './draw.js';
import { WEAPONS as WDATA, ARMS } from '../data/weapons.js';
import { doll, dokkaebi, ITEM, DITEM, fox, foxRun, jangseung, wisp, cart, cartRocket, cartBronze, horse, LEFTOVER, boar, catapult, mokshin, eoduksini, scarecrow, stakeLog, bannerCart, part, dk, lt, E, R, P, curve, rope, WHITE, BLACK, STEEL, IRON, WOOD, WOODD, HX, HY } from './figures.js';
import { tiger, haetae, sapsal, magpie, samjoko, bulgasari, geuseundae, strawShoes } from './beasts.js';
import { mulgwisin, dalgyal, agwi, yeongno, myodusa, centipede, gangcheori, bat, foxTailOne, caneItem, lureLamp, gamtuCap } from './beasts.js';
import { gumiho, serpent, plagueSpirit, bell, pearl, mirror, bottleItem, foxTails } from './bossart.js';
import { ALT_LOOKS, ALT_WEAPONS } from './bossart2.js';

// 요괴가 끌고 가던 나무 우리: 안에 흰 옷 입은 마을 사람이 웅크려 있다 (부수면 의병으로 합류한다)
function cage(g) {
  const WD = '#8a5a30', WL = '#b07a44';
  ell(g, 0, 2, 34, 6, 'rgba(60,40,20,0.25)');
  // 안의 사람: 흰 저고리, 상투, 걱정스러운 얼굴
  part(g, p => { p.moveTo(-12, -2); p.quadraticCurveTo(-14, -26, 0, -30); p.quadraticCurveTo(14, -26, 12, -2); p.closePath(); }, '#f3ecdc', E(6, -12, 8, 12), { lw: 1.3 });
  line(g, [-6, -24, 0, -16, 6, -24], 'rgba(60,50,40,0.5)', 1);
  ell(g, 0, -38, 9.6, 10.4, SKIN, INK, 1.3); part(g, p => { p.moveTo(-10, -40); p.quadraticCurveTo(-9, -50, 0, -50); p.quadraticCurveTo(9, -50, 10, -40); p.quadraticCurveTo(4, -45, -10, -40); p.closePath(); }, '#2b2a30', null, { lw: 1 }); ell(g, 0, -52, 3.4, 3.4, '#2b2a30', INK, 0.9);
  ell(g, -3.4, -38, 1.2, 1.5, INK); ell(g, 3.4, -38, 1.2, 1.5, INK); line(g, [-5.4, -42.6, -2, -41.4], INK, 1); line(g, [5.4, -42.6, 2, -41.4], INK, 1); line(g, [-2.4, -33, 2.4, -33.6], INK, 1);
  // 우리: 바닥 나무, 기둥 여섯, 지붕 들보, 묶은 새끼줄
  part(g, p => p.rect(-30, -6, 60, 8), WD, R(-30, -1, 60, 3), { lw: 1.4 });
  for (const x of [-27, -16, -5.5, 5.5, 16, 27]) { rr(g, x - 2.2, -60, 4.4, 56, 1.4, x === -27 || x === 27 ? WD : WL, INK, 1.2); }
  part(g, p => { p.moveTo(-34, -60); p.lineTo(34, -60); p.lineTo(30, -68); p.lineTo(-30, -68); p.closePath(); }, WD, R(-34, -62, 68, 2), { hi: R(-30, -67, 60, 2), lw: 1.4 });
  for (const x of [-16, 16]) for (const y of [-46, -20]) { line(g, [x - 4, y - 3, x + 4, y + 3], '#d9b77a', 1.6); line(g, [x - 4, y + 3, x + 4, y - 3], '#c9a46a', 1.2); }
}

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
  // 보물 짐꾼의 보따리: 어깨에 멘 막대 끝에 매단 불룩한 비단 보따리, 틈으로 엽전이 비친다
  sack(g) {
    g.translate(0, 10);
    line(g, [0, 4, 2, -40], INK, 3.6); line(g, [0, 4, 2, -40], '#8a5a30', 2);
    part(g, p => { p.moveTo(-10, -40); p.quadraticCurveTo(-17, -56, -4, -62); p.quadraticCurveTo(2, -66, 8, -62); p.quadraticCurveTo(20, -55, 13, -40); p.quadraticCurveTo(2, -34, -10, -40); p.closePath(); }, '#b8322a', E(6, -48, 7, 9), { hi: E(-6, -54, 3, 5), hk: 0.3, lw: 1.4 });
    for (const [x, y] of [[-3, -50], [5, -56], [10, -47]]) { g.save(); g.translate(x, y); g.rotate(0.4); g.scale(1, 0.6); ell(g, 0, 0, 3.4, 3.4, '#e9c04f', INK, 0.8); rr(g, -0.9, -0.9, 1.8, 1.8, 0.2, '#7a5a20'); g.restore(); }
    part(g, p => { p.moveTo(-1, -63); p.lineTo(-6, -70); p.lineTo(1, -67); p.lineTo(7, -71); p.lineTo(4, -63); p.closePath(); }, '#d9b24a', null, { lw: 1 });
  },
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
    for (const [x, y, sg] of [[-3.6, -22, -1], [3.8, -15, 1]]) part(g, P(x, y - 1.4, x + sg * 3.4, y - 3.6, x + sg * 3.2, y - 1.6, x, y + 1), WOOD, null, { lw: 0.8 });   // 잘린 곁가지
    for (const [x, y] of [[0.8, -26], [-0.6, -16]]) { ell(g, x, y, 1.7, 1.1, null, '#5a3a26', 0.8); ell(g, x, y, 0.5, 0.4, '#5a3a26'); }   // 옹이
    for (const y of [-2, 1]) line(g, [-1.7, y, 1.7, y + 0.6], '#d9c39a', 1);
  },
  ironclub(g) { // 두목의 큰 방망이: 옹이가 박힌 나무 방망이 (쇠 가시는 달지 않는다)
    const W2 = '#8a5a34';
    for (const [x, y, sg] of [[-4.6, -24, -1], [4, -15, 1]]) part(g, P(x, y - 1.8, x + sg * 4.6, y - 4.6, x + sg * 4.2, y - 1.8, x, y + 1.4), W2, null, { lw: 0.9 });   // 잘린 곁가지
    part(g, p => { p.moveTo(-1.8, 5.6); p.quadraticCurveTo(-2.6, -12, -5.4, -27); p.quadraticCurveTo(-4.6, -34, 0, -34); p.quadraticCurveTo(4.6, -34, 5.4, -27); p.quadraticCurveTo(2.6, -12, 1.8, 5.6); p.closePath(); }, W2, P(1, -35, 7, -35, 3, 6, 0.4, 6), { hi: P(-3.8, -29, -2.6, -29, -1.2, -6, -1.8, -6), hk: 0.22 });
    for (const [x, y, rx, ry] of [[1.8, -28, 1.5, 2.6], [-1.6, -18.6, 1, 1.7]]) { ell(g, x, y, rx, ry, null, '#4a2e1c', 0.9); ell(g, x, y, rx * 0.35, ry * 0.35, '#4a2e1c'); }   // 결을 따라 길쭉한 옹이
    for (const dx of [-0.6, 2.6]) curve(g, p => { p.moveTo(dx, -32); p.quadraticCurveTo(dx - 1.6, -18, dx * 0.4, -4); }, '#6a4428', 0.6);   // 나뭇결
    for (const y of [-1, 2.2]) line(g, [-1.8, y, 1.8, y + 0.5], '#d9c39a', 1.1);
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
    const wd = o.wood || '#8a4f2c', X = 3.2;   // 활등 전체를 손 쪽으로 옮겨 줌통이 손에 맞게
    // 활등: 줌통(가운데)에서 위아래로 매끈하게 휘고, 끝의 고자(귀)가 바깥으로 젖혀진다 — 가운데가 잘록하지 않다
    const c = p => { p.moveTo(X + 0.2, -22.2); p.quadraticCurveTo(X + 3, -20.8, X + 4.6, -18.4); p.bezierCurveTo(X + 1.4, -12.6, X - 4.8, -7.4, X - 4.8, 0); p.bezierCurveTo(X - 4.8, 7.4, X + 1.4, 12.6, X + 4.6, 18.4); p.quadraticCurveTo(X + 3, 20.8, X + 0.2, 22.2); };
    curve(g, c, INK, 4.2); curve(g, c, wd, 2.6);
    // 뿔(검은 띠)을 댄 안쪽과 볕 받는 바깥 결
    curve(g, p => { p.moveTo(X + 3.6, -17.6); p.bezierCurveTo(X + 0.6, -12, X - 3.8, -7, X - 3.9, -1.4); }, '#2b2228', 0.8); curve(g, p => { p.moveTo(X + 3.6, 17.6); p.bezierCurveTo(X + 0.6, 12, X - 3.8, 7, X - 3.9, 1.4); }, '#2b2228', 0.8);
    curve(g, p => { p.moveTo(X + 3.4, -19.6); p.bezierCurveTo(X - 0.4, -13.4, X - 5.6, -8, X - 5.6, -1); }, lt(wd, 0.45), 0.6);
    // 고자 끝의 뿔 장식과 시위
    for (const sg of [-1, 1]) part(g, E(X + 0.4, sg * 22.2, 1.4, 1), o.tip || '#3a2a26', null, { lw: 0.6 });
    line(g, [X + 4.6, -18.4, X + 4.6, 18.4], '#fbf7ec', 0.8);
    for (const y of [-11.4, 11.4]) line(g, [X - 2.6, y, X + 0.4, y + (y < 0 ? -2.2 : 2.2)], o.wrap || OCHRE, 1.5);
    part(g, R(X - 6.4, -3.4, 3.4, 6.8), o.grip || '#7a1f1c', R(X - 4.6, -3.4, 1.6, 6.8), { lw: 0.8 }); for (const y of [-2, 0, 2]) line(g, [X - 6.4, y, X - 3, y], dk(o.grip || '#7a1f1c', 0.3), 0.4);
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
  // ── 더한 무기 열여섯: 조선의 칼·창·둔기·총통·부적·무구 ──
  // 쌍수도: 두 손으로 쥐는 긴 칼, 긴 손잡이와 넓은 코등이
  ssangsudo(g) {
    blade(g, p => { p.moveTo(-1.9, -4.6); p.quadraticCurveTo(-1.2, -26, 4.2, -49.4); p.quadraticCurveTo(4, -26, 2.2, -4.6); p.closePath(); }, p => { p.moveTo(-2.3, -4.2); p.quadraticCurveTo(-1.6, -26, 4.2, -50); p.quadraticCurveTo(0.6, -27, 0.1, -4.2); p.closePath(); }, p => { p.moveTo(1.7, -5.4); p.quadraticCurveTo(3.4, -26, 4, -47.6); p.quadraticCurveTo(2.6, -26, 1.1, -5.4); p.closePath(); });
    curve(g, p => { p.moveTo(0.2, -7); p.quadraticCurveTo(0.8, -24, 2.8, -38); }, '#8a959c', 0.6);
    guard(g, -4.9, 9.6); hilt(g, -3.6, 11.4, '#2b2a30'); band(g, 3.4, 3.8, 1.4, OCHRE); ell(g, 0, 12.4, 1.9, 1.5, OCHRE, INK, 0.7); tassel(g, 0.4, 13.4, 6, RED, 0.25);
  },
  // 운검: 임금을 지키던 칼 — 붉은 칠 손잡이, 금빛 코등이와 고리, 노란 술
  ungeom(g) {
    WEAPONS.hwando(g, { wrap: '#a8322a', tas: '#e0b23c' });
    for (const y of [-1.6, 1.8]) band(g, y, 3.8, 1.2, '#e6b93e');
    part(g, E(0, -4.7, 4.8, 2), '#e6b93e', E(1, -4.1, 3.8, 1.3), { hi: E(-1.7, -5.3, 1.5, 0.5), hic: '#fff3c0', lw: 0.9 });
    for (const s of [-1, 1]) ell(g, s * 3.2, -4.7, 0.8, 0.8, '#b8322a', INK, 0.4);
  },
  // 부적검: 칼날에 노란 부적을 감고 붉은 실로 묶었다
  bujeokgeom(g) {
    WEAPONS.hwando(g, { wrap: '#3a2a26', tas: '#e0b23c' });
    g.save(); g.translate(2.4, -13.4); g.rotate(0.16);
    part(g, P(-2.6, -6.4, 2.6, -6.4, 2.6, 6, 1.3, 7.4, 0, 6.2, -1.3, 7.4, -2.6, 6), '#f0d264', P(0.6, -6.4, 2.6, -6.4, 2.6, 6, 1.3, 7.4), { k: 0.12, lw: 0.8 });
    rr(g, -1.8, -5, 3.6, 10, 0.3, null, '#b8342a', 0.45); g.beginPath(); g.moveTo(-1.1, -3.4); g.lineTo(1.1, -2); g.lineTo(-1.1, -0.2); g.lineTo(1.1, 1.6); g.lineTo(-0.8, 3.2); st(g, '#b8342a', 0.8);
    g.restore(); line(g, [-0.6, -8.8, 4.4, -7.6], '#b8342a', 1); line(g, [-0.2, -18.6, 4, -18.8], '#b8342a', 0.9);
  },
  // 낭선: 가지를 남겨 둔 대나무 끝에 쇠 날, 가지 끝마다 댓잎
  bamboo(g) {
    const BAM = '#6f8f3a', BAMD = '#4f6a2a';
    line(g, [0, 12, 0, -40], INK, 4); line(g, [0, 12, 0, -40], BAM, 2.4); line(g, [-0.6, 10, -0.6, -38], lt(BAM, 0.35), 0.6);
    for (const y of [6, -4, -14, -24, -34]) line(g, [-1.9, y, 1.9, y], BAMD, 1.2);
    for (const [y, sg, l] of [[-11, 1, 7], [-16, -1, 9], [-22, 1, 10], [-28, -1, 9], [-33, 1, 8]]) { const c = p => { p.moveTo(0, y); p.quadraticCurveTo(sg * l * 0.6, y - 2, sg * l, y - 6); }; curve(g, c, INK, 2.2); curve(g, c, BAMD, 1.1); part(g, E(sg * (l + 1.4), y - 7.2, 2.4, 0.9, sg * -0.6), '#7aa04a', E(sg * (l + 1.8), y - 6.8, 1.6, 0.5, sg * -0.6), { lw: 0.5 }); }
    band(g, -40.6, 4, 2.2, IRON);
    blade(g, P(-2.2, -41, 0, -51, 2.2, -41), P(-2.4, -41, 0, -51.4, 0, -41), P(1, -41.6, 0.4, -48, 0.4, -41.6));
  },
  // 죽장창: 아주 긴 대나무 자루, 작은 잎사귀 날과 붉은 삭모
  jukjang(g) {
    const BAM = '#c9b06a';
    line(g, [0, 16, 0, -50], INK, 3.6); line(g, [0, 16, 0, -50], BAM, 2); line(g, [-0.5, 14, -0.5, -48], lt(BAM, 0.35), 0.5);
    for (const y of [8, -4, -16, -28, -40]) line(g, [-1.6, y, 1.6, y], dk(BAM, 0.3), 1.1);
    band(g, -50.4, 3.8, 2.2, IRON); blade(g, P(-2.2, -50.6, 0, -61, 2.2, -50.6, 0, -49.6), P(-2.3, -50.6, 0, -61.4, 0, -49.6), P(1, -51, 0.4, -58, 0.4, -50.6));
    tassel(g, -0.4, -48.4, 6.4, RED, 0.45); band(g, 13.6, 3.8, 2.2, IRON);
  },
  // 갈고리창: 창날 아래 한쪽으로 휘어 내린 쇠 갈고리
  galgori(g) {
    shaft(g, 12, -34, '#7a4a2c', 1.9); band(g, -35, 4.6, 2.4, IRON);
    const hk = p => { p.moveTo(0.6, -37.6); p.quadraticCurveTo(9.6, -38.6, 9.2, -31.2); p.quadraticCurveTo(8.8, -28, 6, -29.2); };
    curve(g, hk, INK, 3.8); curve(g, hk, '#c9cdd2', 2.1); curve(g, p => { p.moveTo(2.4, -38.4); p.quadraticCurveTo(8.2, -38.6, 8.6, -33); }, '#ffffff', 0.6);
    blade(g, P(-2.6, -35.4, 0, -48.6, 2.6, -35.4, 0, -33.6), P(-2.7, -35.4, 0, -49, 0, -33.6), P(1.3, -36, 0.4, -45, 0.4, -35)); line(g, [0, -46, 0, -36], '#8a959c', 0.5);
    tassel(g, -0.6, -31.6, 6.6, RED, 0.5); band(g, 9.6, 4.4, 2.4, IRON);
  },
  // 곤봉: 두 끝에 쇠를 씌운 긴 박달나무 몽둥이, 끝에는 쇠못을 박았다
  gombong(g) {
    shaft(g, 12, -38, '#6a4428', 2.5);
    for (const y of [-39, 9.6]) part(g, R(-2.5, y, 5, 3.8), IRON, R(0.4, y, 2.2, 3.8), { hi: R(-2, y + 0.4, 0.8, 3), hic: '#8a8a98', lw: 0.9 });
    for (let y = -35; y < -22; y += 3.2) { ell(g, -1.2, y, 0.7, 0.7, '#9a9aa6', INK, 0.4); ell(g, 1.2, y + 1.6, 0.7, 0.7, '#9a9aa6', INK, 0.4); }
    part(g, E(0, -40, 2.7, 1.5), '#9a9aa6', null, { lw: 0.7 }); for (const y of [-2, 1.4]) line(g, [-2, y, 2, y + 0.6], '#d9c39a', 1.1);
  },
  // 홍두깨: 다듬이질하던 굵은 박달나무 방망이
  hongdukkae(g) {
    part(g, p => { p.moveTo(-1.7, 5); p.lineTo(-1.7, -4); p.quadraticCurveTo(-4.8, -6, -4.8, -12); p.lineTo(-4.5, -32); p.quadraticCurveTo(-4.4, -36.4, 0, -36.4); p.quadraticCurveTo(4.4, -36.4, 4.5, -32); p.lineTo(4.8, -12); p.quadraticCurveTo(4.8, -6, 1.7, -4); p.lineTo(1.7, 5); p.closePath(); }, '#b07a44', P(1.2, -37, 6, -37, 6, -6, 2, 5, 1.2, 5), { hi: R(-3.6, -32, 1.3, 22), hk: 0.26, lw: 1.1 });
    for (const dx of [-1.6, 1.4]) curve(g, p => { p.moveTo(dx, -34.6); p.quadraticCurveTo(dx + 0.7, -22, dx, -8); }, '#8a5a30', 0.6);
    part(g, E(0, -35.4, 4.3, 1.3), '#c99a5e', null, { lw: 0.7 }); ell(g, 0.6, -35.4, 1.4, 0.4, null, '#8a5a30', 0.5);
    for (const y of [0, 3]) line(g, [-1.7, y, 1.7, y + 0.5], '#e8d4a8', 1);
  },
  // 승자총통: 마디 진 청동 총신을 나무 자루에 꽂았다, 심지 구멍에 불씨
  seungja(g) {
    const BR = '#8a6a2e';
    shaft(g, 14, -4, '#7a4a2c', 2.1);
    part(g, P(-2.5, -6, -1.9, -34, 1.9, -34, 2.5, -6), BR, R(0.3, -34, 2.4, 28), { hi: R(-1.5, -33, 0.7, 26), hic: '#d9b46a', lw: 1 });
    for (const y of [-34.6, -27.4, -20.6, -13.8]) part(g, R(-2.8, y, 5.6, 2), '#a8843e', R(0.6, y, 2.2, 2), { hi: R(-2.4, y + 0.3, 1, 1.2), hic: '#e6c47a', lw: 0.7 });
    part(g, E(0, -5.2, 3.6, 2.6), BR, E(1, -4.6, 2.7, 1.9), { lw: 0.9 }); ell(g, 0, -35.2, 1.6, 0.7, '#2b2a30');
    ell(g, 1.5, -9.4, 0.8, 0.8, '#2b2a30'); rope(g, p => { p.moveTo(1.8, -9.2); p.quadraticCurveTo(6, -6, 4.2, -1.4); }, '#d9c39a', 0.8); ell(g, 4.2, -1.2, 1.1, 1.1, '#ff9a2e', INK, 0.4); ell(g, 4.2, -1.2, 0.5, 0.5, '#ffe9a0');
  },
  // 소신기전: 활에 화약통을 단 불화살을 먹였다
  sosingijeon(g) {
    WEAPONS.bow(g, { wood: '#6a3a2a', wrap: OCHRE, tip: BRASS, extra: gg => {
      line(gg, [7.4, 0, -19, 0], INK, 2.3); line(gg, [7.4, 0, -19, 0], '#e9d9b0', 1.1);
      part(gg, P(-19, -1.7, -23.6, 0, -19, 1.7), '#dfe5e8', null, { lw: 0.7 });
      part(gg, R(-17.4, -2.5, 8, 5), '#b8322a', R(-17.4, 0.2, 8, 2.3), { hi: R(-16.8, -2.1, 6.8, 0.8), lw: 0.9 }); line(gg, [-13.4, -2.5, -13.4, 2.5], OCHRE, 0.8);
      line(gg, [-9.4, 0.4, -6.8, 2.6], '#2b2a30', 0.6); ell(gg, -6.6, 2.8, 1, 1, '#ff9a2e'); ell(gg, -6.6, 2.8, 0.45, 0.45, '#ffe9a0');
      for (const sg of [-1, 1]) part(gg, P(4.6, 0, 8.6, sg * 2.8, 6.8, 0), WHITE, null, { lw: 0.5 });
    } });
  },
  // 바람 부적: 연둣빛 종이에 회오리 무늬
  baramtal(g) {
    WEAPONS.firetal(g, { paper: '#dff0d0', inkc: '#3f6b5c' });
    for (const [x, y, r] of [[-6.6, -17, 2.6], [6.4, -9.6, 2.2]]) { curve(g, p => p.arc(x, y, r, 0.3, 4.9), '#5f9a7a', 0.9); curve(g, p => p.arc(x + 0.4, y + 0.2, r * 0.45, 0.6, 4.4), '#5f9a7a', 0.7); }
  },
  // 도깨비불 부적: 부적 끝에 푸른 도깨비불이 붙었다
  dokkaebital(g) {
    WEAPONS.firetal(g, { paper: '#e8e2f6', inkc: '#2f4d7e' });
    part(g, p => { p.moveTo(0.4, -32); p.quadraticCurveTo(4, -28, 2.6, -24.2); p.quadraticCurveTo(0.2, -22.2, -2.4, -24.2); p.quadraticCurveTo(-3.6, -27.4, -0.6, -29.6); p.quadraticCurveTo(-0.4, -27.6, 0.4, -32); p.closePath(); }, '#6fc8ee', null, { lw: 0.7 });
    ell(g, 0, -25.4, 1.2, 1.6, '#e8fbff');
  },
  // 신칼: 짧은 칼날, 붉은 손잡이 끝에 흰 종이 술을 길게 늘어뜨렸다
  sinkal(g) {
    for (const [dx, l, a] of [[-2.4, 16, 0.26], [-0.8, 18.4, 0.1], [0.8, 17, -0.06], [2.4, 15, -0.22]]) { g.save(); g.translate(dx * 0.4, 4.2); g.rotate(a); part(g, p => { p.moveTo(-1.1, 0); p.quadraticCurveTo(-1.7, l * 0.5, -0.6, l); p.lineTo(1.1, l); p.quadraticCurveTo(0.4, l * 0.5, 1.1, 0); p.closePath(); }, WHITE, P(0.2, 0, 1.2, 0, 1.2, l, 0.4, l), { k: 0.1, lw: 0.6 }); for (let y = 3; y < l; y += 3.4) line(g, [-0.9, y, 0.9, y + 0.4], 'rgba(60,50,40,0.25)', 0.4); g.restore(); }
    blade(g, P(-1.9, -4, -1.6, -18, 0, -23, 1.6, -18, 1.9, -4), P(-2.1, -4, -1.8, -18.4, 0, -23.4, 0, -4), P(0.9, -5, 0.9, -17.4, 0.3, -20.6, 0.3, -5));
    line(g, [0, -6, 0, -18], '#8a959c', 0.5); guard(g, -4.4, 6.2, '#e6b93e'); hilt(g, -3.2, 4.2, '#a8322a');
  },
  // 염주: 손에 건 백팔 알 염주 한 줄, 아래 큰 알과 붉은 술
  yeomju(g) {
    const n = 22; for (let i = 0; i < n; i++) { const a = i / n * TAU, x = Math.sin(a) * 8.4, y = -12.6 - Math.cos(a) * 11; part(g, E(x, y, 1.85, 1.85), '#6a3a22', E(x + 0.5, y + 0.5, 1.3, 1.3), { hi: E(x - 0.6, y - 0.6, 0.6, 0.4), hic: '#c98a5a', lw: 0.6 }); }
    part(g, E(0, -0.8, 2.7, 2.7), '#3a2a26', E(0.8, 0, 1.9, 1.9), { hi: E(-0.9, -1.6, 0.8, 0.5), hic: '#8a6a5a', lw: 0.8 }); tassel(g, 0, 1.6, 7.6, RED, 0);
  },
  // 징: 붉은 끈에 매단 놋쇠 징과 헝겊을 감은 징채
  jing(g) {
    rope(g, p => { p.moveTo(0, 1); p.quadraticCurveTo(-2.4, -2.6, -1, -5.4); }, RED, 1.1);
    part(g, E(0, -16.6, 11.6, 11.6), '#c9962e', E(2.4, -14.4, 10, 10), { hi: E(-4.2, -21.2, 4, 2.2), hic: '#f8e3a0', lw: 1.3 });
    curve(g, p => p.arc(0, -16.6, 9.2, 0, TAU), '#8a6a1e', 0.9); part(g, E(0, -16.6, 3.7, 3.7), '#b8862a', E(0.8, -15.8, 2.9, 2.9), { hi: E(-1, -17.8, 1.2, 0.7), hic: '#f8e3a0', lw: 0.9 });
    g.save(); g.translate(9.4, -1.6); g.rotate(-0.62); shaft(g, 6, -12, '#d9b77a', 1.4); part(g, E(0, -14.4, 3.3, 3.7), '#f3ecdc', E(0.8, -13.8, 2.5, 2.9), { lw: 0.9 }); line(g, [-3, -14, 3, -14.6], RED, 0.7); g.restore();
  },
  // 소고: 붉은 테 두른 작은 손북, 가운데 삼태극, 자루 끝에 오색 천
  sogo(g) {
    for (const [c, dx] of [[RED, -2.2], [OCHRE, 0], [INDIGO, 2.2]]) line(g, [0, 7, dx * 2.2, 14], c, 1.2);
    shaft(g, 7, -6, '#8a5a30', 1.6); band(g, -6.8, 3.6, 1.6, OCHRE);
    part(g, E(0, -16, 10.2, 10.2), '#b8322a', E(2, -14.4, 8.6, 8.6), { lw: 1.2 }); part(g, E(0, -16, 8, 8), '#f3ead2', E(1.4, -15, 6.6, 6.6), { k: 0.12, lw: 0.9 });
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; ell(g, Math.cos(a) * 9.1, -16 + Math.sin(a) * 9.1, 0.7, 0.7, '#e6b93e'); }
    for (const [c, a] of [[RED, -1.57], [INDIGO, -1.57 + TAU / 3], ['#e0b23c', -1.57 + TAU * 2 / 3]]) part(g, p => { p.moveTo(0, -16); p.arc(0, -16, 4.8, a, a + TAU / 3); p.quadraticCurveTo(Math.cos(a + TAU / 3) * 1.6, -16 + Math.sin(a + TAU / 3) * 1.6, 0, -16); p.closePath(); }, c, null, { lw: 0.5 });
  },
};

// ───────────── 병종별 외형 ─────────────
// doll = 사람 인형 옵션, dok = 도깨비 옵션, body = 한 장짜리 그림 (blinkBody 가 있으면 눈 감은 그림도 굽는다)
const hold = (a, mode, x, y) => ({ x: x === undefined ? HX : x, y: y === undefined ? HY : y, a, mode: mode || 'slash' });
const DK = (o, extra) => Object.assign({ dok: o, weapon: 'club', hold: hold(0.35, 'slash', 16.4, -21), h: 64, neck: 27 }, extra);
const CREAM = '#f1ead6';
// 장산범: 흰 털이 길게 늘어진 범. 눈이 붉고 입을 벌리고 있다
const TTEOK = { coat: '#d07a26', stripe: '#241c22', eye: '#ffd34a', roar: true };
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
  priest: { doll: { robe: WHITE, top: '#fffaf0', git: RED, stripes: [RED, OCHRE, INDIGO], goreum: RED, sash: RED, hem: RED, hat: 'gokkal', skin: '#f6dcc0', jaw: 'round', brow: 'thin', eyes: 'soft', lip: '#b8443a', mouth: 'smile' }, hold: hold(0, 'cast'), h: 66 },
  cannon: { body: cart, weapon: 'none', hold: hold(0, 'shoot'), h: 46, still: true },
  berserk: { doll: { robe: '#6b5a44', legs: '#d9cdb0', bare: true, bareChest: true, sash: RED, hem: '#4a3d2e', hat: 'band', bandCol: RED, skin: '#dcae80', jaw: 'square', brow: 'bushy', eyes: 'glare', nose: 'broad', beard: 'short', mouth: 'grit', scar: true }, hold: hold(0.4), wide: 1.16, h: 60 },
  // 영웅
  commander: { doll: { robe: '#8a2a26', top: '#b8342a', studs: true, pauldron: '#d9b24a', git: '#7a1f1c', legs: '#2f2d38', sash: OCHRE, hem: OCHRE, hat: 'tugu', beard: 'full', jaw: 'square', brow: 'thick', eyes: 'calm', bags: true, mouth: 'flat', back: g => ITEM.cape(g, '#1f2a44') }, hold: hold(0.22), scale: 1.3, hero: true, h: 70 },
  bishop: { doll: { robe: '#9a9a92', top: '#a8a8a0', git: '#7a7a72', kasaya: '#a8442f', beads: true, hem: '#7a7a72', hat: 'bald', jaw: 'round', brow: 'old', browCol: '#7a7a72', eyes: 'closed', lines: true, mouth: 'smile' }, hold: hold(0, 'cast'), scale: 1.3, hero: true, h: 58 },
  archmage: { doll: { robe: WHITE, top: '#fffaf0', git: '#8fb6c8', sash: '#8fb6c8', hem: '#8fb6c8', hat: 'sage', beard: 'long', jaw: 'long', brow: 'old', old: true, eyes: 'narrow', lines: true, mouth: 'smile', item: ITEM.gourd, under: ITEM.cloud, lift: 3 }, hold: hold(0, 'cast', HX, HY - 3), scale: 1.3, hero: true, h: 64, float: true },
  blade: { doll: { robe: '#3a3f58', top: '#2f3348', git: '#1f2130', collar: '#b8342a', cuff: '#b8342a', legs: '#2a2c38', sash: '#b8342a', hem: '#b8342a', hat: 'satgat', skin: '#f3d6b2', jaw: 'slim', brow: 'thin', eyes: 'sharp', lash: true, lip: '#a8443a', mouth: 'flat', item: ITEM.braid }, hold: hold(0.3), scale: 1.3, hero: true, h: 66 },
  hunter: { doll: { robe: '#6b5a3c', top: '#7a6844', vest: '#d9963f', pelt: true, git: '#4a3d2e', legs: '#d9cdb0', shoe: '#5a4030', sash: '#4a3d2e', hem: '#4a3d2e', hat: 'fur', skin: '#e4bb8e', jaw: 'square', brow: 'thick', eyes: 'calm', beard: 'stubble', mouth: 'flat', back: ITEM.quiver }, hold: hold(0, 'shoot'), scale: 1.3, hero: true, h: 64 },
  sangsoe: { doll: { robe: '#f6efdc', top: '#fffaf0', vest: INDIGO, git: '#22385c', legs: CREAM, sash: OCHRE, hem: '#22385c', cross: [RED, OCHRE], hat: 'sangmo', skin: '#e8c093', jaw: 'round', brow: 'arch', eyes: 'smile', mouth: 'grin', item: ITEM.gong }, hold: hold(0.4, 'cast'), scale: 1.3, hero: true, h: 68 },
  chief: { doll: { robe: '#5a4a3a', top: '#6b4a3a', vest: '#8a6a4a', fur: true, bare: true, git: '#3a2a22', legs: '#3a3640', sash: '#8a2a26', hem: '#3a2a22', wrist: '#3a2a22', hat: 'wild', hair: '#3a2a26', skin: '#d9a878', jaw: 'square', brow: 'bushy', eyes: 'glare', nose: 'broad', beard: 'wild', scar: true }, hold: hold(0.4), wide: 1.16, scale: 1.3, hero: true, h: 62 },
  // 영물
  magpie: { body: magpie, weapon: 'none', hold: hold(0, 'bite'), h: 50, float: true, scale: 1.0 },
  sapsal: { body: sapsal, blinkBody: g => sapsal(g, { blink: true }), weapon: 'none', hold: hold(0, 'bite'), h: 36, scale: 0.98 },
  haetae: { body: haetae, blinkBody: g => haetae(g, { blink: true }), weapon: 'none', hold: hold(0, 'bite'), h: 58, w: 130, ox: 62, scale: 1.12 },
  samjoko: { body: samjoko, weapon: 'none', hold: hold(0, 'none'), h: 54, float: true, scale: 1.1 },
  tiger: { body: tiger, blinkBody: g => tiger(g, { blink: true }), weapon: 'none', hold: hold(0, 'bite'), h: 50, w: 130, ox: 62, scale: 1.08 },
  militia: { doll: { robe: '#efe9da', top: '#f6f1e4', git: '#d8cfba', legs: '#e8e1cf', shoe: '#c9a86a', sash: '#b8322a', hem: '#d8cfba', hat: 'band', bandCol: '#f6f1e4', skin: '#e2b888', jaw: 'round', brow: 'stern', eyes: 'sharp', mouth: 'flat', beard: 'stubble' }, hold: hold(0.1, 'thrust'), h: 60 },
  decoy: { body: scarecrow, weapon: 'none', hold: hold(0, 'none'), h: 54, still: true },
  stake: { body: stakeLog, weapon: 'none', hold: hold(0, 'none'), h: 40, still: true },
  banner: { body: bannerCart, weapon: 'none', hold: hold(0, 'none'), h: 104, still: true, scale: 1.1 },
  // 요괴
  // 도깨비 살빛은 사람 살빛이 아닌 벽돌빛·이끼 낀 황토·잿빛·쪽빛 회색으로 (초록·보라는 서양 오크처럼, 갈색 살에 곱슬머리는 사람을 희화화한 것처럼 보인다)
  // 패랭이·벙거지·상투·삼베 등거리를 걸친다
  goblin: DK({ skin: '#c8643f', hat: 'paeraeng' }, { scale: 0.78 }),
  porter: DK({ skin: '#b8703f', hat: 'paeraeng' }, { scale: 0.86, weapon: 'sack', hold: hold(-0.25, 'none', 15, -22) }),
  orc: DK({ skin: '#7d8597', cloth: '#b98a55', warts: true, knot: true }, { scale: 1.04 }),
  garcher: DK({ skin: '#a89a58', cloth: '#7a4f3a', item: DITEM.sling, hat: 'beong' }, { weapon: 'none', hold: hold(0, 'shoot'), scale: 0.8 }),
  rshield: DK({ skin: '#909497', cloth: '#d9c39a', item: DITEM.lid, warts: true, vest: '#cdbb92', hair: '#4a3a34' }, { scale: 1.0 }),
  rassassin: { body: fox, blinkBody: g => fox(g, { blink: true }), weapon: 'none', hold: hold(0, 'bite'), h: 46 },
  foxrun: { body: foxRun, blinkBody: g => foxRun(g, { blink: true }), weapon: 'none', hold: hold(0, 'bite'), h: 34 },   // 사건에서 꼬리를 밟혀 달아나는 여우
  treant: { body: jangseung, weapon: 'none', hold: hold(0, 'bite'), h: 68, scale: 1.2, still: true },
  sapling: { body: jangseung, weapon: 'none', hold: hold(0, 'bite'), h: 68, scale: 0.66 },
  bomber: { body: wisp, blinkBody: g => wisp(g, { blink: true }), weapon: 'none', hold: hold(0, 'none'), h: 46, float: true, border: '#e8f8fd' },
  wolf: { body: boar, blinkBody: g => boar(g, { blink: true }), weapon: 'none', hold: hold(0, 'bite'), h: 42, w: 130, ox: 62, scale: 1.05 },
  shaman: DK({ skin: '#6a7fa0', cloth: '#3f6b5c', item: DITEM.drum, vest: '#3f6b5c', hair: '#5a3a2a' }, { weapon: 'stick', hold: hold(0.5, 'cast', 16.4, -21) }),
  skel: { doll: Object.assign({}, GHOST, { hat: 'jeonrip', plain: true }), weapon: 'rusty', hold: hold(0.3), float: true, border: '#e6f3f7', h: 63 },
  skelarcher: { doll: Object.assign({}, GHOST, { hat: 'band', bandCol: '#c5d9df', item: ITEM.bow }), weapon: 'none', hold: hold(0, 'shoot'), float: true, border: '#e6f3f7', h: 60 },
  catapult: { body: catapult, weapon: 'arm', hold: hold(-0.9, 'lob', 0, -17), h: 50, scale: 1.15, still: true },
  necro: { doll: { robe: '#2b2a31', top: '#35343c', git: '#6b6470', collar: '#c9c2d0', cuff: '#c9c2d0', sash: '#6b6470', skin: '#e6e3d8', pale: true, hat: 'gat', brow: 'stern', eyes: 'sharp', mouth: 'frown', iris: '#7a1f1c', item: ITEM.scroll }, weapon: 'none', hold: hold(0, 'cast'), scale: 1.12, h: 66 },
  dueok: DK({ skin: '#8a8294', cloth: '#3a2a2e', warts: true, beads: true, hair: '#8a2f24' }, { weapon: 'ironclub', scale: 1.28 }),
  yagwang: DK({ skin: '#b8b88a', cloth: '#3a3550', item: strawShoes, hair: '#4a4a66' }, { weapon: 'none', hold: hold(0, 'bite'), scale: 0.72 }),
  bulga: { body: bulgasari, blinkBody: g => bulgasari(g, { blink: true }), weapon: 'none', hold: hold(0, 'bite'), h: 54, w: 136, ox: 64, scale: 1.3 },
  jangsan: { body: g => tiger(g, JANGSAN), blinkBody: g => tiger(g, Object.assign({ blink: true }, JANGSAN)), weapon: 'none', hold: hold(0, 'bite'), h: 50, w: 130, ox: 62, scale: 1.16 },
  geuseun: { body: geuseundae, weapon: 'none', hold: hold(0, 'bite'), h: 72, scale: 1.2, float: true, border: '#dcd6f2' },
  // 새 요괴: 감투 도깨비(도깨비감투를 쓴 도깨비) · 손각시(혼례복의 처녀 귀신) · 창귀(범의 앞잡이가 된 넋) · 여우 할미(할미로 둔갑한 여우)
  gamtu: DK({ skin: '#9fa69a', cloth: '#4a4652', vest: '#3a3640', hair: '#2a2630', warts: true, headItem: gamtuCap }, { scale: 0.92 }),
  songaksi: { doll: Object.assign({}, GHOST, { robe: '#2f6a52', top: '#3f7a5c', sleeve: '#3f7a5c', stripes: [RED, OCHRE, INDIGO, '#f6efdc'], git: '#c8402f', collar: '#f6efdc', cuff: '#f6efdc', hem: '#c8402f', hat: 'jokduri', hair: '#1f1e26', skin: '#efe9e4', eyes: 'heavy', brow: 'thin', lip: '#c8402f', mouth: 'flat' }), weapon: 'none', hold: hold(0, 'cast'), float: true, border: '#eef6f8', h: 64 },
  changgwi: { doll: Object.assign({}, GHOST, { robe: '#c8c2b0', top: '#d6d0be', git: '#8a7a5a', collar: '#e9e4d6', cuff: '#e9e4d6', pelt: true, hat: 'band', bandCol: '#8a6a3c', mouth: 'smirk', item: lureLamp }), weapon: 'none', hold: hold(0, 'cast'), float: true, border: '#eef6f8', h: 62 },
  foxhag: { doll: { robe: '#7a6a58', top: '#e6dcc6', git: '#5a4a3a', goreum: '#8a2a26', hem: '#5a4a3a', hat: 'jjok', hair: '#e2ddd2', skin: '#e8cfae', jaw: 'long', brow: 'old', old: true, lines: true, eyes: 'narrow', mouth: 'smirk', item: caneItem, under: foxTailOne }, weapon: 'none', hold: hold(0, 'bite'), h: 62 },
  mulgwi: { body: mulgwisin, weapon: 'none', hold: hold(0, 'bite'), h: 52, float: true, border: '#e6f3f7' },
  dalgyal: { body: dalgyal, weapon: 'none', hold: hold(0, 'bite'), h: 58, float: true, border: '#f3f6fa' },
  agwi: { body: agwi, weapon: 'none', hold: hold(0, 'bite'), h: 62, border: '#e6eef2' },
  yeongno: { body: yeongno, weapon: 'none', hold: hold(0, 'bite'), h: 66, scale: 1.08 },
  myodusa: { body: myodusa, weapon: 'none', hold: hold(0, 'bite'), h: 36, w: 120, ox: 60 },
  jine: { body: centipede, weapon: 'none', hold: hold(0, 'bite'), h: 30, w: 130, ox: 66, scale: 1.1 },
  jinebit: { body: g => centipede(g, { small: true }), weapon: 'none', hold: hold(0, 'bite'), h: 20, w: 90, ox: 45 },
  gangcheol: { body: gangcheori, weapon: 'none', hold: hold(0, 'bite'), h: 54, w: 136, ox: 62, scale: 1.12 },
  bat: { body: bat, blinkBody: g => bat(g, { blink: true }), weapon: 'none', hold: hold(0, 'bite'), h: 40, float: true, scale: 0.86 },
  // 두목
  warchief: DK({ skin: '#4f6a8a', knot: true, beads: true, warts: true }, { weapon: 'ironclub', scale: 2.0, boss: true, h: 66 }),
  elder: { body: mokshin, weapon: 'none', hold: hold(0, 'bite'), h: 72, scale: 2.2, boss: true, still: true },
  skelking: { body: eoduksini, weapon: 'none', hold: hold(0, 'bite'), h: 62, scale: 2.1, boss: true, float: true },
  // 고개마다의 두목 (그림은 bossart.js). 구미호는 남은 꼬리 수마다 그림이 따로 있다: gumiho(아홉) · gumiho8 … gumiho1
  gumiho: { body: g => gumiho(g), blinkBody: g => gumiho(g, { blink: true }), weapon: 'none', hold: hold(0, 'bite'), h: 46, scale: 2.0, boss: true },
  foxfake: { body: g => gumiho(g, { tails: 0 }), weapon: 'none', hold: hold(0, 'bite'), h: 46, scale: 2.0 },
  dueokboss: DK({ skin: '#7a7488', cloth: '#3a2a2e', warts: true, beads: true, hair: '#8a2f24' }, { weapon: 'ironclub', scale: 2.1, boss: true, h: 66 }),
  tigerboss: { body: g => tiger(g, TTEOK), blinkBody: g => tiger(g, Object.assign({ blink: true }, TTEOK)), weapon: 'none', hold: hold(0, 'bite'), h: 50, w: 130, ox: 62, scale: 1.9, boss: true },
  serpent: { body: g => serpent(g), blinkBody: g => serpent(g, { blink: true }), weapon: 'none', hold: hold(0, 'bite'), h: 62, scale: 2.0, boss: true },
  imugi: { body: g => serpent(g, { imugi: true }), blinkBody: g => serpent(g, { imugi: true, blink: true }), weapon: 'none', hold: hold(0, 'bite'), h: 68, scale: 2.3, boss: true },
  bulgaboss: { body: bulgasari, blinkBody: g => bulgasari(g, { blink: true }), weapon: 'none', hold: hold(0, 'bite'), h: 54, w: 136, ox: 64, scale: 2.1, boss: true },
  plague: { body: g => plagueSpirit(g), blinkBody: g => plagueSpirit(g, { blink: true }), weapon: 'none', hold: hold(0, 'cast'), h: 60, scale: 2.0, boss: true, float: true },
  reaper: { doll: { robe: '#24232a', top: '#2e2d35', git: '#8a2a26', collar: '#c9c2d0', cuff: '#c9c2d0', sash: '#8a2a26', hem: '#8a2a26', skin: '#e6e3d8', pale: true, hat: 'gat', brow: 'stern', eyes: 'sharp', mouth: 'frown', iris: '#7a1f1c', item: ITEM.scroll }, weapon: 'none', hold: hold(0, 'cast'), scale: 1.9, boss: true, h: 66 },
  scribe: { doll: { robe: '#2b2a31', top: '#35343c', git: '#6b6470', collar: '#c9c2d0', cuff: '#c9c2d0', sash: '#6b6470', skin: '#e6e3d8', pale: true, hat: 'gat', brow: 'stern', eyes: 'sharp', mouth: 'frown', iris: '#7a1f1c', item: ITEM.scroll }, weapon: 'none', hold: hold(0, 'cast'), scale: 1.25, h: 66, still: true },
  yeomra: { doll: { robe: '#7a1f1c', top: '#8a2a26', git: '#d9b24a', collar: '#f3ecdd', cuff: '#d9b24a', sash: OCHRE, hem: '#d9b24a', studs: true, skin: '#e9d2b0', hat: 'myeonryu', beard: 'full', jaw: 'square', brow: 'bushy', eyes: 'glare', mouth: 'frown', item: ITEM.scroll }, weapon: 'none', hold: hold(0, 'cast'), scale: 2.25, boss: true, h: 70 },
  // 주막의 주모(손님을 맞는 웃는 얼굴), 여우 고개의 고운 여인(꾀는 듯한 옅은 웃음, 치마 밑으로 꼬리가 보인다)
  // 장터의 장사꾼: 패랭이를 쓰고 무명 저고리에 쪽빛 띠를 맨 너털웃음의 아저씨
  merchant: { doll: { robe: '#8a6a44', top: '#efe6cf', git: '#5a4030', sash: '#2f4d7e', hem: '#6a4e30', hat: 'paeraeng', beard: 'goatee', skin: '#efcfa6', jaw: 'round', brow: 'arch', eyes: 'soft', mouth: 'smile' }, weapon: 'none', hold: hold(0, 'cast'), h: 62 },
  jumo: { doll: { robe: '#4f6a8a', top: '#f3ecdd', git: '#8a2a26', goreum: '#8a2a26', hem: '#3a5270', hat: 'jjok', skin: '#f3d6b2', jaw: 'round', brow: 'thin', eyes: 'soft', lip: '#b8443a', mouth: 'smile', item: bottleItem }, weapon: 'none', hold: hold(0, 'cast'), h: 62 },
  foxlady: { doll: { robe: '#b8342a', top: '#e8c86a', git: '#7a1f1c', goreum: '#7a1f1c', hem: '#8a2a26', hat: 'jjok', skin: '#f6dcc0', jaw: 'slim', brow: 'thin', eyes: 'sharp', lash: true, lip: '#b8443a', mouth: 'smirk', under: foxTails }, weapon: 'none', hold: hold(0, 'cast'), h: 62 },
  bell: { body: bell, weapon: 'none', hold: hold(0, 'bite'), h: 76, scale: 1.25, still: true },
  cage: { body: cage, weapon: 'none', hold: hold(0, 'none'), h: 70, scale: 1.2, still: true },
  pearl: { body: pearl, weapon: 'none', hold: hold(0, 'bite'), h: 46, scale: 1.5, still: true, float: true },
  mirror: { body: mirror, weapon: 'none', hold: hold(0, 'bite'), h: 58, scale: 1.4, still: true },
};

// 또 다른 두목들과 그 소품 (그림은 bossart2.js)
Object.assign(LOOKS, ALT_LOOKS); Object.assign(WEAPONS, ALT_WEAPONS);

export const UNIT_SCALE = 1.1;
const cache = new Map();
// 머리는 작은 종이에 따로 굽는다 (고개 까딱임·눈 깜빡임)
const HEAD = { w: 74, h: 68, ox: 37, oy: 80, bw: 1.7 };
// 인형극에서 엎드리거나 잠든 범은 이빨을 드러내지 않는다
LOOKS.tigerboss_calm = Object.assign({}, LOOKS.tigerboss, { body: g => tiger(g, Object.assign({}, TTEOK, { roar: false, blink: true, calm: true })), blinkBody: null });
LOOKS.jangsan_calm = Object.assign({}, LOOKS.jangsan, { body: g => tiger(g, Object.assign({}, JANGSAN, { roar: false, blink: true, calm: true })), blinkBody: null });
// 엎드린 범(눈을 뜨고 순하게)과 잠든 범(꼬리를 앞으로 감고): 인형극의 'bow'·'sleep'
for (const [k, base, o] of [['tigerboss', LOOKS.tigerboss, TTEOK], ['jangsan', LOOKS.jangsan, JANGSAN]]) {
  const q = Object.assign({}, o, { roar: false, calm: true, lie: true, eye: '#e8b85a' });   // 순해진 범은 붉은 눈빛을 거둔다
  LOOKS[k + '_lie'] = Object.assign({}, base, { body: g => tiger(g, q), blinkBody: g => tiger(g, Object.assign({ blink: true }, q)), h: 30 });
  LOOKS[k + '_sleep'] = Object.assign({}, base, { body: g => tiger(g, Object.assign({ blink: true }, q)), blinkBody: null, h: 30 });
}
for (let n = 1; n < 9; n++) LOOKS['gumiho' + n] = Object.assign({}, LOOKS.gumiho, { body: g => gumiho(g, { tails: n }), blinkBody: g => gumiho(g, { tails: n, blink: true }) });
// ───────────── 승급한 병사의 모습 (data/branches.js 의 갈래마다 하나) ─────────────
// 밑 병종의 인형에 갑옷·투구·깃·소품을 더한다. 승급하면 더 단단하고 화려해 보이고, 같은 병종의 두 갈래는 색과 갑옷이 서로 다르다
// 조선 군영의 차림: 두정갑(징 박은 갑옷)·경번갑(사슬)·쇠미늘, 투구의 붉은 상모, 전립의 공작 깃, 등에 꽂은 영기
const GOLD = '#e2b85a';
const brLook = (base, o, extra = {}) => Object.assign({}, LOOKS[base], { base, scale: (LOOKS[base].scale || 1) * (extra.k || 1.07) }, extra, o ? { doll: Object.assign({}, LOOKS[base].doll, o) } : {});
const BR_LOOKS = {
  // 쌍검수: 붉은 치마에 검은 저고리, 금징 박은 붉은 전복, 공작 깃 꽂은 전립. 허리 뒤로 붉은 띠가 길게 나부낀다 (날랜 칼잡이)
  ssanggeom: brLook('sword', { robe: '#8a2a26', top: '#26252e', sleeve: '#26252e', vest: '#b8342a', studs: true, git: '#1f1e26', collar: WHITE, cuff: '#b8342a', legs: '#2f2d38', sash: '#1f1e26', hem: GOLD, bracer: '#2b2a30', hat: 'jeonrip', plume: 'peacock', rank: 1, brow: 'stern', eyes: 'sharp', mouth: 'grit', scar: true, back: ITEM.tails('#c8402f') }),
  // 본국검수: 쪽빛 두정갑에 가슴 호심경, 은빛 투구와 붉은 상모, 어깨 갑옷과 토시 (굳게 버티는 정예 검수)
  bonguk: brLook('sword', { robe: '#22385c', top: '#2a3a66', sleeve: '#2a3a66', legs: '#2f2d38', cuff: GOLD, sash: GOLD, hem: GOLD, armor: { kind: 'dujeong', col: '#2a3a66', trim: GOLD, mirror: true }, pauldron: '#c9ced2', bracer: '#c9ced2', hat: 'tugu', metal: '#c9ced2', flap: '#2a3a66', plume: RED, rank: 2, brow: 'thick', eyes: 'calm', beard: 'mustache', mouth: 'flat' }),
  // 철벽 등패수: 쇠미늘 갑옷과 쇠 투구, 범 얼굴을 그린 큰 등패 (움직이는 성벽)
  cheolbyeok: brLook('shield', { robe: '#3a4a52', top: '#4a5a62', sleeve: '#4a5a62', legs: '#2f2d38', cuff: '#8a2a26', sash: '#8a2a26', hem: '#8a2a26', armor: { kind: 'lamellar', col: '#7d8790', trim: '#8a2a26' }, pauldron: '#6a737c', bracer: '#6a737c', hat: 'tugu', metal: '#8d969c', flap: '#5a1f1c', plume: RED, rank: 2, eyes: 'calm', brow: 'flat', beard: 'short', mouth: 'grit', item: ITEM.tigerShield }, { k: 1.1 }),
  // 돌격 등패수: 붉은 옷에 짧은 사슬 갑옷, 쇠뿔 달린 등패, 등에 노란 영기. 붉은 머리띠를 질끈 동였다
  dolgyeok: brLook('shield', { robe: '#9a3a2a', top: '#b8553a', sleeve: '#b8553a', legs: CREAM, cuff: WHITE, sash: '#2b2a30', hem: '#5a1f1c', armor: { kind: 'mail', col: '#6a7880', trim: RED, short: true }, bracer: '#7a4a2c', hat: 'band', bandCol: RED, rank: 1, eyes: 'glare', brow: 'bushy', mouth: 'grit', item: ITEM.spikeShield, back: ITEM.flag('#e0b23c') }),
  // 장창수: 붉은 두정갑, 붉은 깃 꽂은 전립, 등에 푸른 영기 (창진의 맨 앞줄)
  jangchang: brLook('spear', { robe: '#7a1f1c', top: '#8a2a26', sleeve: '#8a2a26', vest: null, git: '#5a1f1c', legs: '#2f2d38', shoe: null, cuff: GOLD, sash: GOLD, hem: GOLD, armor: { kind: 'dujeong', col: '#8a2a26', trim: GOLD }, bracer: '#7a4a2c', hat: 'jeonrip', plume: RED, rank: 2, eyes: 'calm', brow: 'stern', beard: 'mustache', mouth: 'flat', back: ITEM.flag('#2f4d7e') }),
  // 낭선수: 푸른 옷에 사슬 갑옷, 녹색 드림의 작은 투구 (원앙진에서 대창으로 묶는 병사)
  nangseon: brLook('spear', { robe: '#3f6b5c', top: '#4f7a6a', sleeve: '#4f7a6a', vest: null, git: '#2c4f44', legs: '#e3d9bf', shoe: null, cuff: CREAM, sash: '#2c4f44', hem: '#2c4f44', armor: { kind: 'mail', col: '#7d8790', trim: '#2c4f44', short: true }, bracer: '#8d969c', hat: 'tugu', metal: '#8d969c', flap: '#3f6b5c', rank: 1, eyes: 'calm', brow: 'stern', beard: 'stubble', mouth: 'flat' }),
  // 기창 돌격대: 비늘 마갑을 입힌 흑마, 붉은 두정갑에 금빛 투구와 붉은 상모, 붉은 망토 (가장 무거운 기병)
  gichang: brLook('knight', { robe: '#8a2a26', top: '#a8302a', sleeve: '#a8302a', legs: '#2b2a30', studs: false, sash: GOLD, hem: GOLD, armor: { kind: 'dujeong', col: '#a8302a', trim: GOLD, mirror: true }, pauldron: '#d9b24a', bracer: '#d9b24a', hat: 'tugu', metal: '#d9b24a', flap: '#7a1f1c', plume: RED, rank: 3, back: g => ITEM.cape(g, '#5a1f1c'),
    under: g => { g.save(); g.translate(3, 0); g.scale(1.35, 1.35); horse(g, { coat: '#3a2a26', mane: '#1a161c', saddle: '#7a1f1c', tack: '#d6a640', barding: '#5e6470', bardTrim: '#d6a640', chamfron: '#d9b24a' }); g.restore(); } }, { k: 1.05 }),
  // 마상편곤수: 얼룩 백마, 쪽빛 옷에 사슬 갑옷, 공작 깃 꽂은 전립과 검푸른 망토 (말 위에서 편곤을 휘두른다)
  masang: brLook('knight', { robe: '#22385c', top: '#2f4d7e', sleeve: '#2f4d7e', legs: '#2a2c38', studs: false, sash: '#e0b23c', hem: '#e0b23c', armor: { kind: 'mail', col: '#7d8790', trim: '#22385c' }, pauldron: null, bracer: '#8d969c', hat: 'jeonrip', plume: 'peacock', rank: 2, beard: 'goatee', back: g => ITEM.cape(g, '#1f2a44'),
    under: g => { g.save(); g.translate(3, 0); g.scale(1.35, 1.35); horse(g, { coat: '#cfc8bc', mane: '#5a5a62', saddle: '#2f4d7e', tack: '#2f4d7e', blaze: false }); g.restore(); } }, { k: 1.05 }),
  // 애기살 사수: 흰 저고리에 쪽빛 전복, 푸른 깃 꽂은 전립, 허리에 통아와 가죽 팔찌 (멀리 쏘는 명사수)
  aegisal: brLook('xbow', { robe: '#22385c', top: '#f6f0e2', vest: '#2f4d7e', git: GOLD, legs: CREAM, sash: GOLD, hem: GOLD, bracer: '#7a4a2c', hat: 'jeonrip', plume: '#2f4d7e', rank: 1, eyes: 'sharp', brow: 'thin', mouth: 'flat', item: ITEM.tube }),
  // 육량전 사수: 밤빛 두정갑에 쇠 투구와 흰 상모, 굵은 화살을 꽂은 큰 전동 (무거운 화살을 쏘는 장사)
  yungnyang: brLook('xbow', { robe: '#5a3a26', top: '#6b3a26', sleeve: '#6b3a26', vest: null, legs: '#3a3640', cuff: GOLD, sash: GOLD, hem: GOLD, armor: { kind: 'dujeong', col: '#6b3a26', trim: GOLD }, pauldron: '#8a6a4a', bracer: '#8a6a4a', hat: 'tugu', metal: '#a8a8a0', flap: '#6b3a26', plume: '#f3ead2', rank: 2, jaw: 'square', brow: 'thick', eyes: 'calm', beard: 'full', mouth: 'flat', back: ITEM.bigQuiver }),
  // 빙결 도사: 서릿빛 도포에 흑립, 흰 수염, 몸을 두른 눈꽃 (얼음 부적의 노도사)
  binggyeol: brLook('wizard', { robe: '#dfeef4', top: '#eef6f8', git: '#5f9ac8', collar: WHITE, sash: '#5f9ac8', hem: '#5f9ac8', dots: '#9cc8e4', hat: 'gat', hair: '#d8dde0', beard: 'long', brow: 'arch', browCol: '#8a9aa6', eyes: 'narrow', rank: 2, back: ITEM.frost }),
  // 삼매 도사: 진홍 도포에 금빛 띠를 어깨에 걸치고, 몸을 두른 삼매진화 (불의 도사)
  sammae: brLook('wizard', { robe: '#7a1f1c', top: '#a8302a', git: '#e0b23c', collar: '#f6efdc', sash: '#2b2a30', hem: '#e0b23c', dots: '#f0a040', cross: ['#e0b23c'], hat: 'yugeon', eyes: 'glare', brow: 'arch', rank: 2, back: ITEM.fire }),
  // 굿무녀: 장군거리 차림. 붉은 동다리에 검푸른 쾌자, 공작 깃 꽂은 전립, 등에 오방기
  gutmu: brLook('priest', { robe: '#2f4d7e', top: '#c8402f', sleeve: '#c8402f', stripes: [GOLD, '#3f6b5c', WHITE], vest: '#1f2a44', git: GOLD, goreum: GOLD, sash: '#e0b23c', hem: GOLD, hat: 'jeonrip', plume: 'peacock', rank: 1, back: ITEM.flag(['#c8402f', '#e0b23c', '#f6efdc', '#3f6b5c', '#2f4d7e'], '#e0b23c') }),
  // 신내림 무녀: 높은 종이 고깔에 큰 종이꽃, 오방 띠가 몸을 휘감는다. 신이 내려 눈을 감았다
  sinnaerim: brLook('priest', { robe: WHITE, top: '#fffaf0', stripes: ['#c8402f', '#e0b23c', '#3f6b5c', '#2f4d7e'], git: '#2f4d7e', goreum: RED, sash: RED, hem: '#2f4d7e', hat: 'gokkal2', eyes: 'closed', mouth: 'flat', rank: 2, item: ITEM.ribbons }),
  // 신기전 화차: 백 구멍 신기전기를 가파르게 세우고 약통 단 불화살을 빽빽이 꽂았다
  singijeon: brLook('cannon', null, { body: cartRocket, h: 54 }),
  // 총통 화차: 쇠테 두른 수레에 청동 총통 셋을 층층이 얹었다
  chongtong: brLook('cannon', null, { body: cartBronze, h: 50 }),
  // 도리깨 장사: 봉두난발에 범 가죽 띠를 비스듬히 두르고 쇠 팔목을 찼다 (짐승 같은 장사)
  dorikkae: brLook('berserk', { robe: '#7a5236', legs: '#c9bd9f', sash: '#8a2a26', hem: '#d9963f', hat: 'wild', hair: '#2b2a30', skin: '#d39e70', beard: 'full', eyes: 'glare', brow: 'bushy', wrist: '#4a4a55', strap: '#5a3a26', item: ITEM.pelt }, { wide: 1.2, k: 1.08 }),
  // 철갑 장사: 검은 쇠미늘 갑옷을 껴입고 호심경, 쇠 투구에 붉은 상모 (걸어 다니는 쇳덩이)
  cheolgap: brLook('berserk', { robe: '#2b2a30', top: '#3a3a44', sleeve: '#3a3a44', legs: '#2b2a30', bare: false, bareChest: false, cuff: '#8a2a26', sash: '#8a2a26', hem: '#8a2a26', armor: { kind: 'lamellar', col: '#4e4f5c', trim: '#8a2a26', mirror: true }, pauldron: '#5e5e6c', bracer: '#5e5e6c', hat: 'tugu', metal: '#5e5e6c', flap: '#3a3a44', plume: RED, beard: 'full', rank: 3 }, { wide: 1.2, k: 1.1 }),
};
for (const [id, L] of Object.entries(BR_LOOKS)) { delete L.k; LOOKS['br_' + id] = L; }
// 패·부대의 모습: 승급한 갈래가 있으면 그 갈래의 인형, 없으면 병종의 인형
export const lookOf = (type, br) => (br && LOOKS['br_' + br] && LOOKS['br_' + br].base === type ? 'br_' + br : type);
export function getLook(type) {
  let L = cache.get(type); if (L) return L;
  const d = LOOKS[type]; if (!d) throw new Error('unknown look ' + type);
  const lift = d.doll && d.doll.lift || 0, o = { w: d.w || 110, ox: d.ox || 55, h: d.ch || 132, oy: d.oy || 114, border: d.border, bw: d.bw, shadow: d.noShadow ? false : undefined }, ho = Object.assign({ border: d.border }, HEAD, { oy: HEAD.oy + lift });
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
  L = { gshadow: d.gshadow || null, front, back: front, head, blink, frontBlink, neck: (d.neck || 33) + lift, weapon, hold: d.hold, scale: (d.scale || 1) * UNIT_SCALE, h: d.h || 60, hero: !!d.hero, boss: !!d.boss, float: !!d.float, still: !!d.still };
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
export function portrait(g, type, x, y, s, t = 0, bob = false, wpn, shut = false) {
  const L = getLook(type), k = s * L.scale, yy = y - (bob ? Math.abs(Math.sin(t * 5)) * 3 * s : 0), h = L.hold, bl = shut || (t > 0 && blinking(t, type.length));
  drawSprite(g, bl && L.frontBlink ? L.frontBlink : L.front, x, yy, k, k);
  if (L.head) drawSprite(g, bl && L.blink ? L.blink : L.head, x, yy + (bob ? Math.sin(t * 5) * 0.5 * s : 0), k, k);
  const W = wpn === 'none' ? null : getWeapon(wpn || baseWeapon(LOOKS[type] && LOOKS[type].base || type));   // 'none' = 빈손 (인형극에서 쓴다)
  if (W) {
    if (W.hand === 'L') drawSprite(g, W.spr, x + (h.x + 3) * k, yy + (h.y - 1) * k, -k, k, -W.a); // 활은 보는 쪽(앞)으로 내밀어 든다 — 싸움터의 인형과 같다
    else if (W.hand === 'C') drawSprite(g, W.spr, x + h.x * 0.42 * k, yy + (h.y - 1.5) * k, k, k, W.a);
    else { drawSprite(g, W.spr, x + h.x * k, yy + h.y * k, k, k, W.a); if (W.hand === 'B') drawSprite(g, W.spr, x - h.x * k, yy + h.y * k, -k, k, -W.a); }
  } else if (L.weapon && wpn !== 'none') drawSprite(g, L.weapon, x + h.x * k, yy + h.y * k, k, k, h.a);
}
// 무기 그림만 (보관함·전리품용). [그림 중심까지의 거리, 길이] 로 칸 가운데에 비슷한 크기로 맞춘다
const ICON = { chae: [6, 26], hwando: [12, 34], twin: [10, 28], axe: [9, 34], flail: [12, 40], spear: [16, 56], lance: [18, 64], dangpa: [17, 58], hyeopdo: [16, 64], woldo: [14, 68], mace: [11, 34], bigaxe: [12, 45], thresher: [15, 52], crossbow: [8, 34], gun: [11, 46], firetal: [12.5, 20], icetal: [12.5, 20], bolttal: [12.5, 20], featherfan: [5, 24], fans: [3, 22], staff: [11, 62], bells: [8, 30], bowl: [10, 28],
  ssangsudo: [15, 68], ungeom: [12, 34], bujeokgeom: [12, 34], bamboo: [19, 64], jukjang: [22, 77], galgori: [18, 61], gombong: [14, 55], hongdukkae: [15, 42], seungja: [10.5, 49], baramtal: [12.5, 22], dokkaebital: [14, 26], sinkal: [1, 44], yeomju: [8, 35], jing: [13, 34], sogo: [6, 40] };
export function weaponIcon(g, wid, x, y, s = 1) {
  const W = getWeapon(wid), d = WDATA[wid]; if (!W) return;
  if (W.hand === 'L') { drawSprite(g, W.spr, x + 2 * s, y, s * 1.6, s * 1.6, 0.5); return; }
  const [c, span] = ICON[d.spr] || [12, 34], k = s * Math.min(2.7, 62 / span), rot = d.spr === 'fans' || d.spr === 'bowl' || d.spr === 'featherfan' ? 0 : 0.6;
  drawSprite(g, W.spr, x - Math.sin(rot) * c * k, y + Math.cos(rot) * c * k, k, k, rot);
}
