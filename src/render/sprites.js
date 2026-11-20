// 병종 인형 스프라이트 — 몸 한 장 + (사람·도깨비는) 머리 한 장 + 손에 든 무기 한 장. 그림은 figures.js
import { TAU, INK, PAPER, RED, INDIGO, TEAL, OCHRE, SKIN, st, fs, ell, rr, poly, line, path, paperSprite, drawSprite } from './draw.js';
import { WEAPONS as WDATA, ARMS } from '../data/weapons.js';
import { doll, dokkaebi, ITEM, DITEM, fox, jangseung, wisp, cart, horseman, boar, catapult, mokshin, eoduksini, scarecrow, stakeLog, bannerCart, WHITE, BLACK, STEEL, IRON, WOOD, WOODD, HX, HY } from './figures.js';

// ───────────── 무기 (원점 = 손잡이, 위쪽을 향함) ─────────────
const WEAPONS = {
  hwando(g) { path(g, p => { p.moveTo(-1.4, -3); p.quadraticCurveTo(-0.6, -16, 4.6, -29); p.quadraticCurveTo(3.4, -15, 1.7, -3); p.closePath(); }, STEEL, INK, 1.1); rr(g, -3.3, -4.4, 6.6, 2.2, 1, OCHRE, INK, 0.9); line(g, [0, -2, 0, 4.6], '#5a3a26', 2.2); },
  short(g) { poly(g, [-1.7, -3, -1.3, -15.5, 0, -18.5, 1.3, -15.5, 1.7, -3], STEEL, INK, 1); rr(g, -3.1, -4.4, 6.2, 2.1, 1, '#5a3a26', INK, 0.9); line(g, [0, -2, 0, 4], '#5a3a26', 2.1); },
  rusty(g) { g.globalAlpha = 0.9; path(g, p => { p.moveTo(-1.4, -3); p.quadraticCurveTo(-0.6, -16, 4.6, -27); p.lineTo(2.6, -22); p.lineTo(3.4, -18); p.quadraticCurveTo(2.6, -10, 1.7, -3); p.closePath(); }, '#b9c8cc', INK, 1.1); rr(g, -3.3, -4.4, 6.6, 2.2, 1, '#8a8f8a', INK, 0.9); g.globalAlpha = 1; },
  spear(g) { line(g, [0, 12, 0, -34], INK, 3.2); line(g, [0, 12, 0, -34], '#8a5a34', 1.7); path(g, p => { p.moveTo(-0.8, -30); p.quadraticCurveTo(-5.6, -27, -4, -21.5); p.quadraticCurveTo(-1.8, -25, 0.8, -26); p.closePath(); }, RED, INK, 0.8); poly(g, [-2.5, -33.5, 0, -44, 2.5, -33.5, 0, -31.4], STEEL, INK, 1); },
  lance(g) { line(g, [0, 14, 0, -40], INK, 3.2); line(g, [0, 14, 0, -40], '#8a5a34', 1.7); poly(g, [0.8, -37, 10, -34, 0.8, -30], RED, INK, 0.9); poly(g, [-2.5, -39.5, 0, -50, 2.5, -39.5, 0, -37.4], STEEL, INK, 1); },
  woldo(g) { line(g, [0, 20, 0, -32], INK, 3.2); line(g, [0, 20, 0, -32], '#7a3a2a', 1.7); path(g, p => { p.moveTo(-0.6, -29); p.quadraticCurveTo(12, -34, 8, -48); p.quadraticCurveTo(4.5, -40, -1, -42); p.closePath(); }, STEEL, INK, 1.2); path(g, p => { p.moveTo(0, -28); p.quadraticCurveTo(-5, -24, -3.5, -19); p.quadraticCurveTo(-1, -23, 1.6, -24); p.closePath(); }, RED, INK, 0.9); },
  club(g) { path(g, p => { p.moveTo(-1.5, 4); p.lineTo(-4.4, -24.5); p.quadraticCurveTo(0, -29, 4.4, -24.5); p.lineTo(1.5, 4); p.closePath(); }, WOOD, INK, 1.2); for (const [x, y] of [[-1.6, -21], [1.8, -17.4], [-0.8, -13]]) ell(g, x, y, 1.1, 1.1, '#3a2a22'); },
  ironclub(g) { path(g, p => { p.moveTo(-1.6, 5); p.lineTo(-4.8, -27); p.quadraticCurveTo(0, -32, 4.8, -27); p.lineTo(1.6, 5); p.closePath(); }, IRON, INK, 1.2); for (const [x, y, s] of [[-4.6, -22, -1], [4.6, -22, 1], [-4, -14, -1], [4, -14, 1], [0, -30.5, 0]]) poly(g, s ? [x, y - 2, x + s * 4.4, y, x, y + 2] : [-2, y, 0, y - 4.4, 2, y], '#c9cdd2', INK, 0.7); },
  mace(g) { line(g, [0, 6, 0, -14], INK, 3.4); line(g, [0, 6, 0, -14], '#5a3a26', 1.9); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; poly(g, [Math.cos(a - 0.3) * 5, -19.5 + Math.sin(a - 0.3) * 5, Math.cos(a) * 9, -19.5 + Math.sin(a) * 9, Math.cos(a + 0.3) * 5, -19.5 + Math.sin(a + 0.3) * 5], '#8a8a96', INK, 0.7); } ell(g, 0, -19.5, 6.2, 6.2, IRON, INK, 1.2); g.globalAlpha = 0.35; ell(g, -2, -21.6, 2, 1.2, '#fff'); g.globalAlpha = 1; },
  stick(g) { line(g, [0, 3, 0, -13], INK, 3); line(g, [0, 3, 0, -13], '#d9b77a', 1.6); ell(g, 0, -14.5, 2.4, 2.4, WHITE, INK, 0.9); },
  arm(g) { rr(g, -2, -30, 4, 34, 1.6, '#b98a55', INK, 1.2); rr(g, -6.4, -35, 12.8, 7, 2.4, WOODD, INK, 1.1); ell(g, 0, -36.5, 5, 4.6, '#a59f8f', INK, 1.1); },
  none() {},
  // ── 갈아 끼우는 무기 ──
  twin(g) { path(g, p => { p.moveTo(-1.2, -3); p.quadraticCurveTo(-0.4, -13, 3.6, -23); p.quadraticCurveTo(2.8, -12, 1.5, -3); p.closePath(); }, STEEL, INK, 1.1); rr(g, -2.9, -4.4, 5.8, 2.2, 1, RED, INK, 0.9); line(g, [0, -2, 0, 4.2], '#2b2a30', 2.2); },
  axe(g) { line(g, [0, 7, 0, -22], INK, 3.2); line(g, [0, 7, 0, -22], WOOD, 1.7); path(g, p => { p.moveTo(-0.8, -23.5); p.quadraticCurveTo(8, -27, 11.5, -20.5); p.quadraticCurveTo(12.5, -14, 8.5, -9.5); p.quadraticCurveTo(5, -13.5, -0.8, -12.5); p.closePath(); }, STEEL, INK, 1.1); g.globalAlpha = 0.5; line(g, [9.4, -20, 9.8, -12.4], '#fff', 1); g.globalAlpha = 1; rr(g, -2, -24.5, 4, 3, 0.8, IRON, INK, 0.8); },
  flail(g) { line(g, [0, 7, 0, -20], INK, 3.2); line(g, [0, 7, 0, -20], WOOD, 1.7); rr(g, -1.9, -22, 3.8, 3, 0.8, IRON, INK, 0.8); for (const [x, y] of [[1.6, -23.6], [3.4, -25.2], [5.2, -26.4]]) ell(g, x, y, 1.1, 1.1, null, INK, 0.9); g.save(); g.translate(6.4, -26.6); g.rotate(2.5); rr(g, -2, -15, 4, 15, 1.4, WOODD, INK, 1.1); for (const y of [-12.5, -8, -3.5]) rr(g, -2.5, y, 5, 1.8, 0.5, IRON, INK, 0.6); g.restore(); },
  dangpa(g) { line(g, [0, 12, 0, -32], INK, 3.2); line(g, [0, 12, 0, -32], '#8a5a34', 1.7); for (const s of [-1, 1]) { g.beginPath(); g.moveTo(0, -30); g.quadraticCurveTo(s * 8, -31, s * 7, -41); st(g, INK, 3.2); g.beginPath(); g.moveTo(0, -30); g.quadraticCurveTo(s * 8, -31, s * 7, -41); st(g, STEEL, 1.7); } poly(g, [-2.2, -31, 0, -46, 2.2, -31], STEEL, INK, 1); path(g, p => { p.moveTo(-0.6, -27); p.quadraticCurveTo(-5.4, -24, -4, -19); p.quadraticCurveTo(-1.6, -22.5, 0.8, -23.4); p.closePath(); }, RED, INK, 0.8); },
  hyeopdo(g) { line(g, [0, 16, 0, -26], INK, 3.2); line(g, [0, 16, 0, -26], '#5a3a2a', 1.7); path(g, p => { p.moveTo(-1.6, -24); p.quadraticCurveTo(-2, -38, 5.4, -48); p.quadraticCurveTo(6, -36, 2, -24); p.closePath(); }, STEEL, INK, 1.1); g.globalAlpha = 0.5; line(g, [0.2, -27, 3.6, -42], '#fff', 0.9); g.globalAlpha = 1; rr(g, -3, -25.6, 6, 2.4, 1, OCHRE, INK, 0.9); for (const d of [-1.2, 0.6]) line(g, [d, -22.5, d - 2.6, -16], RED, 1.1); },
  bigaxe(g) { line(g, [0, 10, 0, -30], INK, 3.6); line(g, [0, 10, 0, -30], WOODD, 2); for (const s of [-1, 1]) path(g, p => { p.moveTo(s * 0.8, -29); p.quadraticCurveTo(s * 9, -34, s * 13.5, -27); p.quadraticCurveTo(s * 15, -20, s * 11.5, -13); p.quadraticCurveTo(s * 6, -18, s * 0.8, -17); p.closePath(); }, STEEL, INK, 1.2); rr(g, -2.4, -30, 4.8, 14, 1, IRON, INK, 0.9); poly(g, [-1.8, -30, 0, -35.5, 1.8, -30], STEEL, INK, 0.8); },
  thresher(g) { line(g, [0, 9, 0, -24], INK, 3.4); line(g, [0, 9, 0, -24], WOODD, 1.9); rr(g, -2, -26, 4, 3, 0.8, IRON, INK, 0.8); for (const [x, y] of [[-1.6, -27.6], [-3.2, -29.4], [-4.8, -31]]) ell(g, x, y, 1.2, 1.2, null, INK, 0.9); g.save(); g.translate(-6, -31.4); g.rotate(-2.3); rr(g, -2.4, -17, 4.8, 17, 1.6, IRON, INK, 1.1); for (const [x, y, sg] of [[-2.4, -13, -1], [2.4, -13, 1], [-2.4, -7, -1], [2.4, -7, 1]]) poly(g, [x, y - 1.6, x + sg * 3.6, y, x, y + 1.6], '#c9cdd2', INK, 0.6); g.restore(); },
  bow(g, o = {}) { const c = p => { p.moveTo(4.5, -18.5); p.bezierCurveTo(-0.5, -16.5, -6.5, -9.5, -2, 0); p.bezierCurveTo(-6.5, 9.5, -0.5, 16.5, 4.5, 18.5); }; g.beginPath(); c(g); st(g, INK, 3.6); g.beginPath(); c(g); st(g, o.wood || '#8a4f2c', 2); line(g, [4.5, -18.5, 4.5, 18.5], WHITE, 0.8); for (const y of [-12, 12]) line(g, [-2.6, y, 1.2, y + (y < 0 ? -1.6 : 1.6)], o.wrap || OCHRE, 1.4); if (o.extra) o.extra(g); ell(g, -0.6, 0, 3, 3, SKIN, INK, 1.1); },
  firebow(g) { WEAPONS.bow(g, { wood: '#a8322a', wrap: '#2b2a30', extra: gg => { for (const y of [-18.5, 18.5]) { path(gg, p => { p.moveTo(4.5, y - 4.4); p.quadraticCurveTo(8.4, y - 1, 6, y + 2.6); p.quadraticCurveTo(4.5, y + 3.6, 3, y + 2.6); p.quadraticCurveTo(1, y - 0.4, 4.5, y - 4.4); }, '#ff9a2e', INK, 0.8); ell(gg, 4.5, y + 0.8, 1.1, 1.3, '#ffe9a0'); } } }); },
  pyeonjeon(g) { WEAPONS.bow(g, { wood: '#3a3238', wrap: RED, extra: gg => { gg.save(); gg.translate(1.4, 0); gg.rotate(1.5708); rr(gg, -1.8, -11, 3.6, 16, 1.4, '#d9b77a', INK, 0.9); for (const y of [-7, -2]) line(gg, [-1.8, y, 1.8, y], '#8a6a3c', 0.8); gg.restore(); } }); },
  crossbow(g) { rr(g, -2, -20, 4, 28, 1.4, WOOD, INK, 1.1); g.beginPath(); g.moveTo(-11.5, -9.5); g.quadraticCurveTo(0, -20.5, 11.5, -9.5); st(g, INK, 3.6); g.beginPath(); g.moveTo(-11.5, -9.5); g.quadraticCurveTo(0, -20.5, 11.5, -9.5); st(g, '#5a3a26', 2); line(g, [-11.5, -9.5, 0, -6, 11.5, -9.5], WHITE, 0.8); line(g, [0, -6, 0, -22], '#e9d9b0', 1.2); poly(g, [-1.5, -21.5, 0, -25.5, 1.5, -21.5], STEEL, INK, 0.7); rr(g, -2.6, -4.6, 5.2, 2.6, 0.8, IRON, INK, 0.7); },
  gun(g) { rr(g, -1.3, -34, 2.6, 30, 1, IRON, INK, 1); path(g, p => { p.moveTo(-2.2, -14); p.lineTo(2.2, -14); p.lineTo(2.6, 2); p.quadraticCurveTo(5.4, 7, 3.4, 11.5); p.lineTo(-1.6, 11); p.quadraticCurveTo(-1.4, 5, -2.6, 2); p.closePath(); }, WOODD, INK, 1.1); for (const y of [-27, -19]) rr(g, -1.9, y, 3.8, 1.6, 0.4, OCHRE, INK, 0.5); g.beginPath(); g.moveTo(2, -9); g.quadraticCurveTo(6.4, -11, 4.6, -5); st(g, RED, 1.2); ell(g, 4.6, -4.6, 0.9, 0.9, '#ff9a2e'); },
  firetal(g, o = {}) { g.save(); g.rotate(0.06); rr(g, -3.8, -21, 7.6, 17, 0.8, o.paper || '#f0d264', INK, 1); g.beginPath(); if (o.bolt) { g.moveTo(1.4, -19); g.lineTo(-1.6, -13.4); g.lineTo(0.8, -12.8); g.lineTo(-1.4, -6.4); } else { g.moveTo(-1.8, -18.4); g.lineTo(1.8, -16.2); g.lineTo(-1.8, -13.6); g.lineTo(1.8, -11); g.lineTo(0, -7.4); } st(g, o.inkc || RED, 1.2); ell(g, 0, -5.8, 0.9, 0.9, o.inkc || RED); g.restore(); },
  icetal(g) { WEAPONS.firetal(g, { paper: '#d6eef6', inkc: INDIGO }); for (const [x, y] of [[-5.6, -18], [5.4, -10]]) { line(g, [x - 1.8, y, x + 1.8, y], '#8fd3e8', 1); line(g, [x, y - 1.8, x, y + 1.8], '#8fd3e8', 1); } },
  bolttal(g) { WEAPONS.firetal(g, { paper: '#f3ecff', inkc: '#6a4a9a', bolt: true }); line(g, [4.6, -20, 6.8, -16.4, 5, -15.6, 7.2, -11.6], OCHRE, 1.1); },
  featherfan(g) { for (let i = -2; i <= 2; i++) { g.save(); g.rotate(i * 0.3); path(g, p => { p.moveTo(-1.8, 0); p.quadraticCurveTo(-3.4, -9, 0, -15.5); p.quadraticCurveTo(3.4, -9, 1.8, 0); p.closePath(); }, WHITE, INK, 0.8); line(g, [0, -1, 0, -13], '#b9c8cc', 0.6); g.restore(); } rr(g, -1.4, -1, 2.8, 7, 1, WOODD, INK, 0.8); ell(g, 0, 0.4, 2, 2, OCHRE, INK, 0.7); },
  fans(g) { const cols = [RED, OCHRE, INDIGO, TEAL, RED]; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 12, -Math.PI * 0.5 - 0.95 + i * 0.38, -Math.PI * 0.5 - 0.95 + (i + 1) * 0.38); g.closePath(); fs(g, cols[i], INK, 0.8); } g.beginPath(); g.arc(0, 0, 9, -Math.PI * 0.5 - 0.95, -Math.PI * 0.5 + 0.95); st(g, 'rgba(251,247,236,0.6)', 0.8); ell(g, 0, 0, 1.6, 1.6, OCHRE, INK, 0.7); line(g, [0, 1, -1.4, 7], RED, 1); line(g, [0, 1, 1.6, 6.4], INDIGO, 1); },
  staff(g) { line(g, [0.5, 20.4, 0.9, -33.6], INK, 3.2); line(g, [0.5, 20.4, 0.9, -33.6], '#8a6a3c', 1.7); g.beginPath(); g.arc(0.9, -37.6, 4.6, 0, TAU); st(g, INK, 3); g.beginPath(); g.arc(0.9, -37.6, 4.6, 0, TAU); st(g, OCHRE, 1.6); for (const s of [-1, 1]) { g.beginPath(); g.arc(0.9 + s * 4.6, -33.6, 2, 0, TAU); st(g, INK, 2.2); g.beginPath(); g.arc(0.9 + s * 4.6, -33.6, 2, 0, TAU); st(g, OCHRE, 1); } },
  bells(g) { line(g, [0, 5, 0, -12], INK, 3); line(g, [0, 5, 0, -12], WOODD, 1.6); line(g, [0, -4, -5, 4], RED, 1.2); line(g, [0, -4, 4.4, 5], INDIGO, 1.2); line(g, [0, -4, -1, 7], OCHRE, 1.2); for (const [x, y] of [[-4.4, -13], [4.4, -13], [0, -17.6], [-3, -20.6], [3.2, -20.4], [0, -11.6]]) { ell(g, x, y, 2.5, 2.5, '#e6b93e', INK, 0.9); line(g, [x - 1.2, y + 0.9, x + 1.2, y + 0.9], INK, 0.6); } g.globalAlpha = 0.5; ell(g, -1, -18.6, 0.9, 0.6, '#fff'); g.globalAlpha = 1; },
  bowl(g) { for (const [a, l] of [[-0.5, 15], [0.1, 18], [0.6, 14]]) { g.save(); g.translate(0, -7); g.rotate(a); line(g, [0, 0, 0, -l], '#3f6b5c', 1.2); for (let y = -4; y > -l; y -= 3.6) { ell(g, -1.8, y, 1.9, 0.9, '#5f9a6a', INK, 0.5, 0.6); ell(g, 1.8, y - 1.6, 1.9, 0.9, '#5f9a6a', INK, 0.5, -0.6); } g.restore(); } path(g, p => { p.moveTo(-7.4, -7.4); p.quadraticCurveTo(-6.6, 1.2, 0, 1.2); p.quadraticCurveTo(6.6, 1.2, 7.4, -7.4); p.closePath(); }, WHITE, INK, 1.1); ell(g, 0, -7.4, 7.4, 2.2, '#bfe3ee', INK, 1); line(g, [-5, -2.6, 5, -2.6], INDIGO, 0.9); rr(g, -3, 1, 6, 1.8, 0.6, WHITE, INK, 0.8); },
};

// ───────────── 병종별 외형 ─────────────
// doll = 사람 인형 옵션, dok = 도깨비 옵션, body = 한 장짜리 그림 (blinkBody 가 있으면 눈 감은 그림도 굽는다)
const hold = (a, mode, x, y) => ({ x: x === undefined ? HX : x, y: y === undefined ? HY : y, a, mode: mode || 'slash' });
const DK = (o, extra) => Object.assign({ dok: o, weapon: 'club', hold: hold(0.35, 'slash', 16.4, -21), h: 64, neck: 27 }, extra);
const CREAM = '#f1ead6';
const GHOST = { robe: '#c5d9df', top: '#b3ccd4', collar: '#eef6f8', git: '#9ab6c0', cuff: '#eef6f8', skin: '#e9f0f1', pale: true, tatter: true, ghost: true, eyes: 'ghost', mouth: 'o', hair: '#5a6a72' };
export const LOOKS = {
  // 아군
  sword: { doll: { robe: INDIGO, top: '#2f2d38', sleeve: '#b8342a', git: '#1f1e26', legs: CREAM, sash: OCHRE, hem: '#22385c', hat: 'jeonrip', brow: 'stern', mouth: 'flat' }, hold: hold(0.3), h: 63 },
  shield: { doll: { robe: TEAL, top: '#4f8270', legs: CREAM, sash: OCHRE, hem: '#2c4f44', hat: 'band', brow: 'stern', mouth: 'grit', item: ITEM.shield }, hold: hold(0.25), h: 60 },
  spear: { doll: { robe: '#efe6d0', top: '#f6efdc', vest: '#9a5a3c', git: '#7a4a2c', legs: '#e3d9bf', shoe: '#c9a86a', sash: INDIGO, hat: 'paeraeng', brow: 'soft', mouth: 'flat' }, hold: hold(0.1, 'thrust'), h: 60 },
  knight: { body: g => { g.scale(1.12, 1.12); horseman(g, gg => doll(gg, { robe: '#a84a32', top: '#b8553a', studs: true, pauldron: '#aeb6bd', sash: OCHRE, hat: 'tugu', metal: '#aeb6bd', brow: 'stern', mouth: 'flat' })); }, hold: hold(0.42, 'thrust', 9.4, -43.6), h: 82, w: 130, ox: 62 },
  xbow: { doll: { robe: '#f3ecdd', top: '#f6f0e2', vest: INDIGO, git: '#22385c', legs: CREAM, sash: RED, hat: 'band', bandCol: INDIGO, brow: 'soft', eyes: 'sharp', mouth: 'flat', back: ITEM.quiver }, hold: hold(0, 'shoot'), h: 60 },
  wizard: { doll: { robe: '#8fa6b8', top: '#9db3c4', git: '#5f7890', sash: BLACK, hem: '#5f7890', dots: '#dfe8ee', hat: 'yugeon', beard: 'goatee', brow: 'soft', eyes: 'sharp', mouth: 'flat' }, hold: hold(0, 'cast'), h: 64 },
  priest: { doll: { robe: WHITE, top: '#fffaf0', git: RED, stripes: [RED, OCHRE, INDIGO], goreum: RED, sash: RED, hem: RED, hat: 'gokkal', brow: 'soft', mouth: 'smile', iris: '#3a2a3a' }, hold: hold(0, 'cast'), h: 66 },
  cannon: { body: cart, weapon: 'none', hold: hold(0, 'shoot'), h: 46, still: true },
  berserk: { doll: { robe: '#6b5a44', legs: '#d9cdb0', bare: true, bareChest: true, sash: RED, hem: '#4a3d2e', hat: 'band', bandCol: RED, brow: 'thick', beard: 'short', mouth: 'grit', scar: true }, hold: hold(0.4), wide: 1.16, h: 60 },
  // 영웅
  commander: { doll: { robe: '#8a2a26', top: '#b8342a', studs: true, pauldron: '#d9b24a', git: '#7a1f1c', legs: '#2f2d38', sash: OCHRE, hem: OCHRE, hat: 'tugu', beard: 'full', brow: 'thick', mouth: 'flat', back: g => ITEM.cape(g, '#1f2a44') }, hold: hold(0.22), scale: 1.3, hero: true, h: 70 },
  bishop: { doll: { robe: '#9a9a92', top: '#a8a8a0', git: '#7a7a72', kasaya: '#a8442f', beads: true, hem: '#7a7a72', hat: 'bald', brow: 'old', browCol: '#7a7a72', eyes: 'closed', mouth: 'smile' }, hold: hold(0, 'cast'), scale: 1.3, hero: true, h: 58 },
  archmage: { doll: { robe: WHITE, top: '#fffaf0', git: '#8fb6c8', sash: '#8fb6c8', hem: '#8fb6c8', hat: 'sage', beard: 'long', brow: 'old', old: true, mouth: 'smile', item: ITEM.gourd, under: ITEM.cloud, lift: 3 }, hold: hold(0, 'cast', HX, HY - 3), scale: 1.3, hero: true, h: 64, float: true },
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
  const o = { w: d.w || 110, ox: d.ox || 55, h: 132, oy: 114, border: d.border }, ho = Object.assign({ border: d.border }, HEAD);
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
  L = { front, back: front, head, blink, frontBlink, neck: d.neck || 33, weapon, hold: d.hold, scale: (d.scale || 1) * UNIT_SCALE, h: d.h || 60, hero: !!d.hero, boss: !!d.boss, float: !!d.float, still: !!d.still };
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
const ICON = { hwando: [12, 34], twin: [10, 28], axe: [9, 34], flail: [12, 40], spear: [16, 56], lance: [18, 64], dangpa: [17, 58], hyeopdo: [16, 64], woldo: [14, 68], mace: [11, 34], bigaxe: [12, 45], thresher: [15, 52], crossbow: [8, 34], gun: [11, 46], firetal: [12.5, 20], icetal: [12.5, 20], bolttal: [12.5, 20], featherfan: [5, 24], fans: [3, 22], staff: [11, 62], bells: [8, 30], bowl: [10, 28] };
export function weaponIcon(g, wid, x, y, s = 1) {
  const W = getWeapon(wid), d = WDATA[wid]; if (!W) return;
  if (W.hand === 'L') { drawSprite(g, W.spr, x + 2 * s, y, s * 1.6, s * 1.6, 0.5); return; }
  const [c, span] = ICON[d.spr] || [12, 34], k = s * Math.min(2.7, 62 / span), rot = d.spr === 'fans' || d.spr === 'bowl' || d.spr === 'featherfan' ? 0 : 0.6;
  drawSprite(g, W.spr, x - Math.sin(rot) * c * k, y + Math.cos(rot) * c * k, k, k, rot);
}
