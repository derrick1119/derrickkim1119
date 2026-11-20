// 종이 인형 병종 스프라이트 — 앞모습 한 장 + (필요하면) 손에 든 무기 한 장
import { TAU, INK, PAPER, RED, INDIGO, TEAL, OCHRE, SKIN, st, fs, ell, rr, poly, line, path, paperSprite, drawSprite } from './draw.js';
import { WEAPONS as WDATA, ARMS } from '../data/weapons.js';

const WHITE = '#fbf7ec', BLACK = '#2b2a30', STEEL = '#e4e8ea', IRON = '#4a4a55', WOOD = '#a9753f', WOODD = '#7a4a2c';
const HX = 15.5, HY = -18.4; // 인형의 손 위치

// ───────────── 모자 ─────────────
const HATS = {
  jeonrip(g, o) {
    path(g, p => { p.moveTo(-6.8, -45.5); p.quadraticCurveTo(-6.5, -54.5, 0, -54.5); p.quadraticCurveTo(6.5, -54.5, 6.8, -45.5); p.closePath(); }, BLACK, INK, 1.2);
    ell(g, 0, -45.8, 12.8, 3.5, '#35343b', INK, 1.2); line(g, [-6.5, -47.2, 6.5, -47.2], OCHRE, 1.3);
    if (o.plain) return;
    ell(g, 0, -55.4, 2.2, 2.2, RED, INK, 1); line(g, [1.5, -54.5, 9.5, -50, 10.5, -44], RED, 1.2); ell(g, 10.5, -43, 1.5, 1.5, OCHRE, INK, 0.8);
  },
  paeraeng(g) {
    path(g, p => { p.moveTo(-6, -45.6); p.quadraticCurveTo(-6, -53.6, 0, -53.6); p.quadraticCurveTo(6, -53.6, 6, -45.6); p.closePath(); }, '#e3c890', INK, 1.2);
    ell(g, 0, -45.8, 12.4, 3.4, '#d9b77a', INK, 1.2); line(g, [-5.8, -47.2, 5.8, -47.2], BLACK, 1.2);
    for (const x of [-8, -3, 3, 8]) line(g, [x, -47.6, x * 1.12, -44], '#b8944f', 0.7);
  },
  gat(g) {
    g.globalAlpha = 0.86; rr(g, -5.2, -57, 10.4, 12, 1.5, '#1d1c22', INK, 1.1); g.globalAlpha = 0.72; ell(g, 0, -45.6, 15.5, 4, '#1d1c22', INK, 1.1); g.globalAlpha = 1;
    line(g, [-6.5, -44, -4.5, -35.5], INK, 0.9); line(g, [6.5, -44, 4.5, -35.5], INK, 0.9);
  },
  tugu(g, o) {
    const m = o.metal || '#d9b24a';
    for (const s of [-1, 1]) path(g, p => { p.moveTo(s * 6, -45); p.lineTo(s * 10.5, -44); p.lineTo(s * 10, -34); p.lineTo(s * 6.5, -35.5); p.closePath(); }, o.flap || RED, INK, 1.1);
    path(g, p => { p.moveTo(-8.2, -44); p.quadraticCurveTo(-8, -54.5, 0, -54.5); p.quadraticCurveTo(8, -54.5, 8.2, -44); p.quadraticCurveTo(0, -46.5, -8.2, -44); p.closePath(); }, m, INK, 1.2);
    line(g, [0, -54, 0, -45.5], INK + '99', 0.9); rr(g, -1, -60, 2, 6, 0.8, m, INK, 0.9);
    path(g, p => { p.moveTo(0, -60); p.quadraticCurveTo(-7, -63, -6, -56); p.quadraticCurveTo(-2, -59, 0, -57.5); p.quadraticCurveTo(2, -59, 6, -56); p.quadraticCurveTo(7, -63, 0, -60); }, RED, INK, 1);
  },
  gokkal(g) { poly(g, [-9, -45.5, 0, -61, 9, -45.5, 0, -47.5], WHITE, INK, 1.2); line(g, [0, -61, 0, -47.5], INK + '88', 0.9); },
  band(g, o) {
    path(g, p => { p.moveTo(-7.4, -42.5); p.quadraticCurveTo(-7, -49.5, 0, -49.5); p.quadraticCurveTo(7, -49.5, 7.4, -42.5); p.quadraticCurveTo(0, -45.5, -7.4, -42.5); p.closePath(); }, o.hair || BLACK, INK, 1.1); ell(g, 0, -51.5, 3, 2.8, o.hair || BLACK, INK, 1.1);
    path(g, p => { p.moveTo(-7.5, -44.6); p.quadraticCurveTo(0, -47.4, 7.5, -44.6); p.lineTo(7.4, -42.6); p.quadraticCurveTo(0, -45.4, -7.4, -42.6); p.closePath(); }, o.bandCol || WHITE, INK, 0.9);
  },
  yugeon(g) { poly(g, [-7.4, -45, -8, -56.5, -3.6, -52.6, 0, -59, 3.6, -52.6, 8, -56.5, 7.4, -45], BLACK, INK, 1.2); line(g, [-7.2, -47, 7.2, -47], '#5a5866', 1); },
  bald(g) { g.globalAlpha = 0.5; ell(g, -2.6, -45.4, 2.6, 1.4, '#fff7e6', null, 0, -0.4); g.globalAlpha = 1; ell(g, 0, -43.2, 0.9, 0.9, RED); },
  sage(g) {
    path(g, p => { p.moveTo(-7.4, -42.5); p.quadraticCurveTo(-7, -49.5, 0, -49.5); p.quadraticCurveTo(7, -49.5, 7.4, -42.5); p.quadraticCurveTo(0, -45.5, -7.4, -42.5); p.closePath(); }, WHITE, INK, 1.1);
    ell(g, 0, -52, 3.4, 3.2, WHITE, INK, 1.1); line(g, [-5, -52, 5, -52], OCHRE, 1.6);
    line(g, [-6.4, -43, -2, -42], WHITE, 1.8); line(g, [6.4, -43, 2, -42], WHITE, 1.8);
  },
};

// ───────────── 사람 인형 ─────────────
function doll(g, o) {
  const robe = o.robe, sl = o.sleeve || robe, skin = o.skin || SKIN;
  if (o.back) o.back(g);
  if (!o.tatter) for (const s of [-1, 1]) path(g, p => { p.moveTo(s * 2.2, -1.6); p.quadraticCurveTo(s * 3, 2.8, s * 8.6, 1.5); p.quadraticCurveTo(s * 9.2, -1.4, s * 5, -2.6); p.closePath(); }, o.shoe || '#3a3238', INK, 1);
  for (const s of [-1, 1]) {
    if (o.bare) ell(g, s * 12.4, -25, 3.6, 7.6, skin, INK, 1.1, s * -0.5);
    else { path(g, p => { p.moveTo(s * 7, -33.5); p.quadraticCurveTo(s * 17.5, -31, s * 18, -19.5); p.lineTo(s * 12, -17); p.quadraticCurveTo(s * 10, -24, s * 6, -26); p.closePath(); }, sl, INK, 1.2); line(g, [s * 12.4, -17.6, s * 17.6, -19.8], o.cuff || WHITE, 1.7); g.globalAlpha = 0.2; line(g, [s * 9.6, -30.4, s * 12.6, -22], INK, 0.9); g.globalAlpha = 1; if (o.stripes) o.stripes.forEach((c, i) => line(g, [s * (13 + i * 1.6), -29 + i * 3.2, s * (11.5 + i * 1.5), -19.5 + i * 0.8], c, 1.8)); }
  }
  path(g, p => {
    p.moveTo(-7.5, -34); p.lineTo(7.5, -34); p.quadraticCurveTo(10, -18, 15.5, -3);
    if (o.tatter) { p.lineTo(11, -6.5); p.lineTo(7.5, -1); p.lineTo(4, -6); p.lineTo(0, 0.5); p.lineTo(-4, -6); p.lineTo(-7.5, -1); p.lineTo(-11, -6.5); p.lineTo(-15.5, -3); } else p.quadraticCurveTo(0, 1.8, -15.5, -3);
    p.quadraticCurveTo(-10, -18, -7.5, -34); p.closePath();
  }, robe, INK, 1.25);
  g.globalAlpha = 0.2; line(g, [-3.2, -15, -6.2, -3], INK, 1); line(g, [4.8, -14, 7.6, -3.2], INK, 1); line(g, [0.8, -9, 1, -0.8], INK, 0.9); g.globalAlpha = 1;
  if (o.hem && !o.tatter) path(g, p => { p.moveTo(-15.5, -3); p.quadraticCurveTo(0, 1.8, 15.5, -3); p.lineTo(14.5, -5.8); p.quadraticCurveTo(0, -1.2, -14.5, -5.8); p.closePath(); }, o.hem, INK, 0.9);
  if (o.dots) for (const [x, y] of [[-7, -12], [6.5, -9], [-2, -7], [9.5, -15], [-10.5, -6.5], [2.5, -15]]) ell(g, x, y, 0.9, 0.9, o.dots);
  if (o.vest) for (const s of [-1, 1]) path(g, p => { p.moveTo(s * 7.5, -34); p.lineTo(s * 3, -34); p.lineTo(s * 4.5, -3.5); p.quadraticCurveTo(s * 10, -2.5, s * 15.5, -3); p.quadraticCurveTo(s * 10, -18, s * 7.5, -34); p.closePath(); }, o.vest, INK, 1);
  path(g, p => { p.moveTo(-5.4, -34.2); p.lineTo(1.4, -25); p.lineTo(5.4, -34.2); p.lineTo(3.2, -34.2); p.lineTo(1.2, -29); p.lineTo(-3.2, -34.2); p.closePath(); }, o.collar || WHITE, INK, 0.85);
  if (o.kasaya) path(g, p => { p.moveTo(-7.6, -33.6); p.lineTo(-2.6, -34); p.lineTo(11.6, -12.5); p.lineTo(9.4, -17.4); p.lineTo(8.6, -22.5); p.closePath(); p.moveTo(-7.6, -33.6); p.lineTo(8.6, -22.5); }, o.kasaya, INK, 1);
  if (o.studs) for (const [x, y] of [[-5, -14], [5, -14], [0, -10], [-8, -8], [8, -8], [-3, -6], [3, -6]]) ell(g, x, y, 1, 1, OCHRE);
  if (o.sash) { path(g, p => { p.moveTo(-9.3, -23.2); p.quadraticCurveTo(0, -21, 9.3, -23.2); p.lineTo(10, -19.4); p.quadraticCurveTo(0, -17.2, -10, -19.4); p.closePath(); }, o.sash, INK, 1); path(g, p => { p.moveTo(2, -19.6); p.lineTo(3.6, -10.5); p.lineTo(6.6, -11.5); p.lineTo(5.4, -19.8); p.closePath(); }, o.sash, INK, 0.85); }
  if (o.beads) for (let i = -3; i <= 3; i++) ell(g, i * 1.9, -30.6 + (9 - i * i) * 0.42, 1.15, 1.15, '#7a4a2c', INK, 0.5);
  ell(g, -HX, HY, 3, 3, skin, INK, 1.1); ell(g, HX, HY, 3, 3, skin, INK, 1.1);
  if (!o.pale && o.hat !== 'bald') for (const s of [-1, 1]) ell(g, s * 7, -42, 1.5, 3, o.hat === 'sage' ? WHITE : o.hair || BLACK, INK, 0.7);
  g.globalAlpha = 0.18; ell(g, 0, -33.6, 5, 1.6, INK); g.globalAlpha = 1;
  ell(g, 0, -41, 7.6, 7.4, skin, INK, 1.25);
  if (o.pale) { g.globalAlpha = 0.4; ell(g, -2.8, -40, 2.5, 2.3, '#4a4a6a'); ell(g, 2.8, -40, 2.5, 2.3, '#4a4a6a'); g.globalAlpha = 1; }
  else { g.globalAlpha = 0.5; ell(g, -4.9, -38.2, 1.7, 1.05, '#e98a6a'); ell(g, 4.9, -38.2, 1.7, 1.05, '#e98a6a'); g.globalAlpha = 1; }
  ell(g, -2.8, -40.4, 0.95, 1.3, INK); ell(g, 2.8, -40.4, 0.95, 1.3, INK); ell(g, -2.5, -40.9, 0.32, 0.32, '#fff'); ell(g, 3.1, -40.9, 0.32, 0.32, '#fff');
  if (!o.beard) line(g, [-1.3, -36.9, 0, -36.4, 1.3, -36.9], '#8a4a3a', 0.8);
  if (o.brow) { line(g, [-5, -43.2, -1.4, -42.2], INK, 1.2); line(g, [5, -43.2, 1.4, -42.2], INK, 1.2); }
  if (o.beard === 'long') path(g, p => { p.moveTo(-4.8, -38); p.quadraticCurveTo(-5.4, -28, 0, -21.5); p.quadraticCurveTo(5.4, -28, 4.8, -38); p.quadraticCurveTo(0, -35.4, -4.8, -38); }, WHITE, INK, 0.9);
  else if (o.beard) path(g, p => { p.moveTo(-4.2, -37.4); p.quadraticCurveTo(0, -28.5, 4.2, -37.4); p.quadraticCurveTo(0, -35.6, -4.2, -37.4); }, o.beard, INK, 0.9);
  if (o.hat) HATS[o.hat](g, o);
  if (o.item) o.item(g);
}

// 손에 고정된 소품 (몸 그림에 포함)
const ITEM = {
  shield(g) { ell(g, -HX, -17, 10.5, 10.5, '#cda766', INK, 1.25); g.beginPath(); g.arc(-HX, -17, 7.6, 0, TAU); st(g, '#a17f45', 1.1); g.beginPath(); g.arc(-HX, -17, 4.6, 0, TAU); st(g, '#a17f45', 1.1); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; line(g, [-HX + Math.cos(a) * 4.6, -17 + Math.sin(a) * 4.6, -HX + Math.cos(a) * 10, -17 + Math.sin(a) * 10], '#a17f45', 0.8); } ell(g, -HX, -17, 3.2, 3.2, RED, INK, 1); },
  bow(g) { const c = p => { p.moveTo(-13, -37); p.bezierCurveTo(-18, -35, -24, -28, -19.5, -18.5); p.bezierCurveTo(-24, -9, -18, -2, -13, 0); }; g.beginPath(); c(g); st(g, INK, 3.4); g.beginPath(); c(g); st(g, '#8a4f2c', 1.8); line(g, [-13, -37, -13, 0], WHITE, 0.8); ell(g, -17.5, HY, 3, 3, SKIN, INK, 1.1); },
  quiver(g) { g.save(); g.translate(8, -30); g.rotate(0.35); rr(g, -3, -6, 6, 16, 2, WOODD, INK, 1.1); for (const x of [-1.8, 0.4, 2.4]) { line(g, [x, -6, x, -12], '#8a6a4a', 1); poly(g, [x - 1.4, -12, x, -15.5, x + 1.4, -12], WHITE, INK, 0.7); } g.restore(); },
  fans(g) { for (const s of [-1, 1]) { g.save(); g.translate(s * 16, -20); g.rotate(s * 0.5); const cols = [RED, OCHRE, INDIGO, TEAL, RED]; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 11.5, -Math.PI * 0.5 - 0.95 + i * 0.38, -Math.PI * 0.5 - 0.95 + (i + 1) * 0.38); g.closePath(); fs(g, cols[i], INK, 0.8); } g.restore(); ell(g, s * HX, HY, 3, 3, SKIN, INK, 1.1); } },
  scroll(g) { rr(g, 11.5, -28, 8.5, 12, 1.4, '#a8322a', INK, 1.1); rr(g, 13.2, -26, 5, 5.5, 0.6, WHITE, INK, 0.7); ell(g, HX, -17.6, 3, 3, '#e6e3d8', INK, 1.1); },
  talisman(g) { g.save(); g.translate(16.5, -28); g.rotate(0.2); rr(g, -3.6, -10, 7.2, 16, 0.8, '#f0d264', INK, 1); g.beginPath(); g.moveTo(-1.6, -7); g.lineTo(1.6, -5); g.lineTo(-1.6, -2.4); g.lineTo(1.6, 0); g.lineTo(0, 3.4); st(g, RED, 1.1); g.restore(); ell(g, HX, HY, 3, 3, SKIN, INK, 1.1); },
  ringstaff(g) { line(g, [16, 2, 16.4, -52], INK, 3.2); line(g, [16, 2, 16.4, -52], '#8a6a3c', 1.7); g.beginPath(); g.arc(16.4, -56, 4.6, 0, TAU); st(g, INK, 3); g.beginPath(); g.arc(16.4, -56, 4.6, 0, TAU); st(g, OCHRE, 1.6); for (const s of [-1, 1]) { g.beginPath(); g.arc(16.4 + s * 4.6, -52, 2, 0, TAU); st(g, INK, 2.2); g.beginPath(); g.arc(16.4 + s * 4.6, -52, 2, 0, TAU); st(g, OCHRE, 1); } ell(g, HX, HY, 3, 3, SKIN, INK, 1.1); },
  feather(g) { g.save(); g.translate(-16.5, -20); g.rotate(-0.4); for (let i = -2; i <= 2; i++) { g.save(); g.rotate(i * 0.3); path(g, p => { p.moveTo(-1.8, 0); p.quadraticCurveTo(-3.4, -9, 0, -15); p.quadraticCurveTo(3.4, -9, 1.8, 0); p.closePath(); }, WHITE, INK, 0.8); g.restore(); } g.restore(); ell(g, -HX, HY, 3, 3, SKIN, INK, 1.1); ell(g, 9, -15.5, 3.6, 4.4, '#b8742a', INK, 1); ell(g, 9, -20.6, 2, 2, '#b8742a', INK, 1); },
  cloud(g) { for (const [x, y, r] of [[-12, -1, 6.5], [-4, 0.5, 7.5], [5, 0.5, 7.5], [13, -1, 6.5]]) ell(g, x, y, r, r * 0.62, '#eef3f4', INK, 1); rr(g, -13, -4.5, 26, 5, 2, '#eef3f4'); },
};

// ───────────── 도깨비 ─────────────
function dokkaebi(g, o) {
  const sk = o.skin;
  ell(g, -6.5, -2.4, 4.4, 3, sk, INK, 1.1); ell(g, 6.5, -2.4, 4.4, 3, sk, INK, 1.1);
  path(g, p => { p.moveTo(-13.5, -6); p.quadraticCurveTo(-16.5, -22, -12.5, -34); p.quadraticCurveTo(-8, -45.5, 0, -45.5); p.quadraticCurveTo(8, -45.5, 12.5, -34); p.quadraticCurveTo(16.5, -22, 13.5, -6); p.quadraticCurveTo(0, -2, -13.5, -6); p.closePath(); }, sk, INK, 1.3);
  path(g, p => { p.moveTo(-14, -12.5); p.quadraticCurveTo(0, -9.5, 14, -12.5); p.lineTo(13.4, -5.6); p.lineTo(8, -2.6); p.lineTo(4, -5.6); p.lineTo(0, -2); p.lineTo(-4, -5.6); p.lineTo(-8, -2.6); p.lineTo(-13.4, -5.6); p.closePath(); }, o.cloth || '#e6aa3e', INK, 1.1);
  for (const x of [-9, -3, 3.5, 9.5]) poly(g, [x - 1.4, -11.2, x + 1.4, -11, x + 0.2, -6.4], BLACK);
  g.globalAlpha = 0.16; for (const [x, y, r] of [[-9, -18, 2.6], [8.5, -27, 2.2], [10, -16, 1.8], [-10.5, -28, 1.6]]) ell(g, x, y, r, r * 0.85, INK); g.globalAlpha = 0.22; ell(g, 0, -15.5, 7.5, 3.4, '#fff7e0'); g.globalAlpha = 1;
  for (const s of [-1, 1]) for (const dx of [-2.2, 0, 2.2]) poly(g, [s * 6.5 + dx - 0.9, -0.4, s * 6.5 + dx, 1.6, s * 6.5 + dx + 0.9, -0.4], '#f3e7c8', INK, 0.5);
  for (const s of [-1, 1]) poly(g, [s * 11.6, -34.5, s * 18.4, -39.5, s * 14, -28.5], sk, INK, 1.1);
  ell(g, -16, -20, 3.8, 5.4, sk, INK, 1.1, 0.3); ell(g, 16.4, -21, 3.8, 5.4, sk, INK, 1.1, -0.3);
  line(g, [-18.6, -22.6, -14, -24.8], OCHRE, 1.6); line(g, [14.2, -25.6, 18.8, -23.6], OCHRE, 1.6);
  path(g, p => { p.moveTo(-12, -35); p.lineTo(-15.5, -43); p.lineTo(-9.5, -41.5); p.lineTo(-10, -49); p.lineTo(-4.5, -45.5); p.lineTo(-2, -50.5); p.lineTo(2, -45.5); p.lineTo(5, -50); p.lineTo(8, -44); p.lineTo(13.5, -45.5); p.lineTo(12, -35); p.quadraticCurveTo(0, -42, -12, -35); p.closePath(); }, o.hair || BLACK, INK, 1.1);
  if (o.horns === 2) for (const s of [-1, 1]) path(g, p => { p.moveTo(s * 4, -46); p.quadraticCurveTo(s * 9, -52, s * 8, -58); p.quadraticCurveTo(s * 3, -53, s * 1, -47); p.closePath(); }, '#f3e7c8', INK, 1.1);
  else path(g, p => { p.moveTo(-2.6, -46.5); p.quadraticCurveTo(0, -55, 1.6, -57.5); p.quadraticCurveTo(3.4, -52, 2.8, -46.5); p.closePath(); }, '#f3e7c8', INK, 1.1);
  ell(g, -5, -31, 3.8, 3.6, WHITE, INK, 1.1); ell(g, 5, -31, 3.8, 3.6, WHITE, INK, 1.1); ell(g, -4.2, -30.6, 1.4, 1.6, INK); ell(g, 4.2, -30.6, 1.4, 1.6, INK);
  line(g, [-9.5, -36.2, -2, -33.8], INK, 1.9); line(g, [9.5, -36.2, 2, -33.8], INK, 1.9);
  ell(g, 0, -26.6, 2.3, 1.7, 'rgba(60,20,20,0.3)', INK, 0.8); g.globalAlpha = 0.3; ell(g, -9.4, -26, 2.2, 1.4, '#ffd9c0'); ell(g, 9.4, -26, 2.2, 1.4, '#ffd9c0'); g.globalAlpha = 1;
  path(g, p => { p.moveTo(-7.5, -23.5); p.quadraticCurveTo(0, -21, 7.5, -23.5); p.quadraticCurveTo(5.6, -16.8, 0, -16.8); p.quadraticCurveTo(-5.6, -16.8, -7.5, -23.5); p.closePath(); }, '#7a1f1c', INK, 1.1);
  poly(g, [-5.4, -22.6, -3.6, -18.4, -1.8, -22], WHITE, INK, 0.7); poly(g, [5.4, -22.6, 3.6, -18.4, 1.8, -22], WHITE, INK, 0.7);
  if (o.beads) for (let i = -3; i <= 3; i++) ell(g, i * 3.2, -13.8 - (9 - i * i) * 0.12, 1.5, 1.5, i % 2 ? RED : '#f3e7c8', INK, 0.6);
  if (o.item) o.item(g);
}
const DITEM = {
  lid(g) { ell(g, -16, -18, 11.5, 11.5, '#3a3a44', INK, 1.3); g.beginPath(); g.arc(-16, -18, 8, 0, TAU); st(g, '#5a5a66', 1.1); ell(g, -16, -18, 3, 3, '#5a5a66', INK, 1); g.globalAlpha = 0.35; ell(g, -19.5, -22.5, 3.4, 1.8, '#fff', null, 0, -0.6); g.globalAlpha = 1; },
  drum(g) { rr(g, -11, -16, 22, 12.5, 4, '#a8322a', INK, 1.2); ell(g, 0, -16, 11, 4.2, '#f3e7c8', INK, 1.2); for (const x of [-7, 0, 7]) line(g, [x, -12, x, -4.6], OCHRE, 1.1); path(g, p => { p.arc(0, -16, 2.6, 0, Math.PI); }, RED); path(g, p => { p.arc(0, -16, 2.6, Math.PI, TAU); }, INDIGO); },
  sling(g) { line(g, [16.4, -21, 21, -34, 25, -27], '#7a5a40', 1.3); ell(g, 21, -36, 3.4, 3, '#a59f8f', INK, 1.1); },
};

function fox(g) {
  for (let i = -2; i <= 2; i++) { g.save(); g.translate(0, -9); g.rotate(i * 0.42); path(g, p => { p.moveTo(-2.4, 0); p.quadraticCurveTo(-7, -18, 0, -30); p.quadraticCurveTo(7, -18, 2.4, 0); p.closePath(); }, '#f6f1e6', INK, 1.1); path(g, p => { p.moveTo(-2.6, -22); p.quadraticCurveTo(0, -33, 0, -30); p.quadraticCurveTo(0, -33, 2.6, -22); p.quadraticCurveTo(0, -25, -2.6, -22); p.closePath(); }, '#8fd3e8', INK, 0.8); g.restore(); }
  ell(g, 0, -11, 9, 11, '#f6f1e6', INK, 1.2); ell(g, -4.5, -1.8, 3.2, 2.2, '#f6f1e6', INK, 1); ell(g, 4.5, -1.8, 3.2, 2.2, '#f6f1e6', INK, 1);
  for (const s of [-1, 1]) { poly(g, [s * 3.4, -32, s * 9.5, -41.5, s * 9.8, -29], '#f6f1e6', INK, 1.1); poly(g, [s * 5.4, -32.5, s * 8.6, -38, s * 8.6, -31], '#e48a7a'); }
  path(g, p => { p.moveTo(-10, -28); p.quadraticCurveTo(-9, -35, 0, -35); p.quadraticCurveTo(9, -35, 10, -28); p.quadraticCurveTo(6, -20.5, 0, -18.5); p.quadraticCurveTo(-6, -20.5, -10, -28); p.closePath(); }, '#f6f1e6', INK, 1.2);
  line(g, [-6.6, -28.4, -2.4, -27], INK, 1.4); line(g, [6.6, -28.4, 2.4, -27], INK, 1.4); line(g, [-7.4, -29.4, -5.6, -28.8], RED, 1.3); line(g, [7.4, -29.4, 5.6, -28.8], RED, 1.3);
  poly(g, [-1.6, -33, 0, -30.4, 1.6, -33], RED); ell(g, 0, -20.6, 1.4, 1.1, INK);
}
function jangseung(g) {
  for (const x of [-7, 0, 7]) ell(g, x, -1.6, 4.4, 2.6, '#8a6844', INK, 1);
  path(g, p => { p.moveTo(-9.5, -2); p.lineTo(-8.6, -50); p.lineTo(8.6, -50); p.lineTo(9.5, -2); p.closePath(); }, '#b08a5c', INK, 1.3);
  line(g, [-5.5, -22, -6, -4], '#8a6844', 0.9); line(g, [5, -20, 5.6, -5], '#8a6844', 0.9); line(g, [0, -18, 0.4, -8], '#8a6844', 0.9);
  path(g, p => { p.moveTo(-11.5, -49); p.lineTo(11.5, -49); p.lineTo(8.5, -58.5); p.lineTo(3, -58.5); p.lineTo(2.4, -63); p.lineTo(-2.4, -63); p.lineTo(-3, -58.5); p.lineTo(-8.5, -58.5); p.closePath(); }, '#3a3238', INK, 1.2);
  ell(g, -4, -41, 3.6, 3.9, WHITE, INK, 1.1); ell(g, 4, -41, 3.6, 3.9, WHITE, INK, 1.1); ell(g, -3.6, -40.6, 1.5, 1.7, INK); ell(g, 3.6, -40.6, 1.5, 1.7, INK);
  line(g, [-8, -46.5, -1.4, -44.6], INK, 1.8); line(g, [8, -46.5, 1.4, -44.6], INK, 1.8); line(g, [0, -42, -1.6, -34.5, 1.8, -34.5], INK, 1.2);
  rr(g, -6.6, -31.5, 13.2, 6.6, 1.6, '#a8322a', INK, 1.1); for (const x of [-4.4, -1.5, 1.5, 4.4]) rr(g, x - 1.2, -30.6, 2.4, 4.6, 0.5, WHITE, INK, 0.6);
  g.globalAlpha = 0.6; ell(g, -6.4, -36, 1.6, 1.2, RED); ell(g, 6.4, -36, 1.6, 1.2, RED); g.globalAlpha = 1;
}
function wisp(g) {
  path(g, p => { p.moveTo(0, -40); p.bezierCurveTo(4, -32, 12, -28, 10, -17); p.bezierCurveTo(9, -10, 4, -7, 0, -7); p.bezierCurveTo(-6, -7, -11, -12, -10, -19); p.bezierCurveTo(-9.5, -24, -6, -25, -5, -30); p.bezierCurveTo(-2, -28, -1, -34, 0, -40); p.closePath(); }, '#5fb6d9', INK, 1.2);
  path(g, p => { p.moveTo(0, -26); p.bezierCurveTo(4, -21, 6, -17, 4.5, -13); p.bezierCurveTo(3, -9.6, -3, -9.6, -4.5, -13.5); p.bezierCurveTo(-5.6, -17, -2, -20, 0, -26); p.closePath(); }, '#d6f3fb');
  line(g, [-5.6, -19.4, -1.6, -17.4], INK, 1.5); line(g, [5.6, -19.4, 1.6, -17.4], INK, 1.5); ell(g, -3, -16, 1, 1.3, INK); ell(g, 3, -16, 1, 1.3, INK);
}
function cart(g) {
  line(g, [-20, -9, -30, -5], WOODD, 2.6);
  path(g, p => { p.moveTo(-17, -12); p.lineTo(17, -12); p.lineTo(15, -6); p.lineTo(-15, -6); p.closePath(); }, '#9a6a3c', INK, 1.2);
  g.save(); g.translate(0, -15); g.rotate(-0.12); rr(g, -14, -22, 28, 22, 2, '#b98a55', INK, 1.25);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) ell(g, -10 + c * 5, -18 + r * 4.8, 1.5, 1.5, '#3a2a22');
  for (const [x, y] of [[-10, -18], [0, -18], [10, -13.2], [-5, -8.4]]) { line(g, [x, y, x + 1.5, y - 9], '#e9d9b0', 1.3); poly(g, [x - 0.4, y - 9, x + 1.6, y - 13.5, x + 3.2, y - 8.6], RED, INK, 0.7); }
  g.restore();
  for (const s of [-1, 1]) { ell(g, s * 16, -7, 8.2, 8.2, WOODD, INK, 1.3); ell(g, s * 16, -7, 5.4, 5.4, '#d9c39a', INK, 0.9); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; line(g, [s * 16, -7, s * 16 + Math.cos(a) * 5.4, -7 + Math.sin(a) * 5.4], WOODD, 1.1); } ell(g, s * 16, -7, 1.6, 1.6, '#3a2a22'); }
}
// 옆모습 말 + 기수
function horseman(g) {
  const B = '#9a6a44';
  path(g, p => { p.moveTo(-16, -24); p.quadraticCurveTo(-25, -18, -22, -5); p.quadraticCurveTo(-18, -14, -14, -19); p.closePath(); }, BLACK, INK, 1);
  for (const x of [-12, -6, 8, 13]) { rr(g, x - 1.7, -15, 3.4, 13.5, 1.4, B, INK, 1); rr(g, x - 2.1, -2.6, 4.2, 2.8, 1, BLACK); }
  ell(g, 0, -21, 17, 9.6, B, INK, 1.25);
  path(g, p => { p.moveTo(8, -26); p.lineTo(14.5, -42); p.quadraticCurveTo(23, -45, 26.5, -37.5); p.lineTo(25, -32.5); p.lineTo(19.5, -32); p.lineTo(16, -22); p.closePath(); }, B, INK, 1.25);
  path(g, p => { p.moveTo(9, -27); p.quadraticCurveTo(8, -38, 14.5, -43.5); p.lineTo(17, -40.5); p.quadraticCurveTo(12.5, -35, 13, -27); p.closePath(); }, BLACK, INK, 0.9);
  poly(g, [15.6, -43, 17.4, -48.6, 19.6, -43.4], B, INK, 0.9); ell(g, 21.4, -39.4, 1.1, 1.3, INK); line(g, [19, -34.6, 25.4, -36], RED, 1.2);
  path(g, p => { p.moveTo(-9.5, -29.5); p.lineTo(7, -29.5); p.lineTo(8.5, -19); p.lineTo(-11, -19); p.closePath(); }, RED, INK, 1.1); line(g, [-10.6, -20.6, 8.2, -20.6], OCHRE, 1.3);
  g.save(); g.translate(-4, -25); g.scale(0.74, 0.74); doll(g, { robe: '#a84a32', studs: true, sash: OCHRE, hat: 'tugu', metal: '#aeb6bd' }); g.restore();
}
function boar(g) {
  const B = '#6b5240', D = '#4a372a';
  g.beginPath(); g.moveTo(-19, -19); g.quadraticCurveTo(-26, -22, -23, -29); st(g, INK, 2.6); g.beginPath(); g.moveTo(-19, -19); g.quadraticCurveTo(-26, -22, -23, -29); st(g, B, 1.3);
  for (const x of [-12, -6, 7, 12]) { rr(g, x - 2, -11, 4, 10, 1.4, D, INK, 1); rr(g, x - 2.2, -2.4, 4.4, 2.6, 1, BLACK); }
  path(g, p => { p.moveTo(-20, -12); p.quadraticCurveTo(-22, -28, -8, -31); p.quadraticCurveTo(8, -33, 17, -26); p.quadraticCurveTo(26, -22, 27, -14); p.quadraticCurveTo(24, -8.5, 16, -8); p.quadraticCurveTo(0, -5, -20, -12); p.closePath(); }, B, INK, 1.3);
  path(g, p => { p.moveTo(-17, -27); p.lineTo(-14, -34); p.lineTo(-10, -30); p.lineTo(-6, -36.5); p.lineTo(-2, -31.5); p.lineTo(3, -37); p.lineTo(6, -31); p.lineTo(11, -34.5); p.lineTo(13, -28.6); p.quadraticCurveTo(0, -31.6, -17, -27); p.closePath(); }, D, INK, 1);
  ell(g, 26, -14.5, 3.2, 4, '#c98a7a', INK, 1.1); ell(g, 26.4, -15.6, 0.7, 0.9, INK); ell(g, 26.4, -13, 0.7, 0.9, INK);
  for (const y of [-10.6]) { path(g, p => { p.moveTo(19, y); p.quadraticCurveTo(22.5, y - 6.5, 25.5, y - 8.6); p.quadraticCurveTo(23.4, y - 3.4, 21.6, y + 0.6); p.closePath(); }, '#f3e7c8', INK, 0.9); }
  ell(g, 17.4, -20.6, 1.8, 1.6, '#e23a2f', INK, 0.8); line(g, [14.4, -24.4, 19.6, -22.6], INK, 1.5); poly(g, [9, -27, 10.6, -33, 13.6, -27.6], B, INK, 1);
}
function catapult(g) {
  for (const s of [-1, 1]) { ell(g, s * 15, -6, 7.4, 7.4, WOODD, INK, 1.3); ell(g, s * 15, -6, 2, 2, '#3a2a22'); for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + 0.4; line(g, [s * 15, -6, s * 15 + Math.cos(a) * 7, -6 + Math.sin(a) * 7], '#5a3a26', 1); } }
  rr(g, -19, -16, 38, 8.5, 2, '#9a6a3c', INK, 1.25);
  poly(g, [-10, -15, -6, -30, -2.4, -30, -5.4, -15], '#b98a55', INK, 1.1); poly(g, [10, -15, 6, -30, 2.4, -30, 5.4, -15], '#b98a55', INK, 1.1); rr(g, -8.5, -32.5, 17, 4.4, 1.4, WOODD, INK, 1.1);
  ell(g, 0, -11.6, 4.6, 4.2, '#d9603f', INK, 1); ell(g, -1.6, -12, 0.9, 1, INK); ell(g, 1.6, -12, 0.9, 1, INK); poly(g, [-1, -15.6, 0, -19, 1, -15.6], '#f3e7c8', INK, 0.7);
}
function mokshin(g) {
  for (const x of [-15, -6, 6, 15]) ell(g, x, -2, 6.4, 3.4, BROWN_D, INK, 1.1);
  path(g, p => { p.moveTo(-14, -3); p.quadraticCurveTo(-9, -22, -11, -42); p.lineTo(11, -42); p.quadraticCurveTo(9, -22, 14, -3); p.closePath(); }, '#8a6844', INK, 1.3);
  line(g, [-7, -38, -8.5, -6], BROWN_D, 0.9); line(g, [6.5, -36, 8.4, -7], BROWN_D, 0.9); line(g, [0.5, -14, 1, -5], BROWN_D, 0.9);
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 10, -34); g.quadraticCurveTo(s * 20, -38, s * 22, -47); st(g, INK, 4.8); g.beginPath(); g.moveTo(s * 10, -34); g.quadraticCurveTo(s * 20, -38, s * 22, -47); st(g, '#8a6844', 2.8); ell(g, s * 23, -50, 7.5, 3.6, TEAL, INK, 1.1); }
  ell(g, -5, -30, 3.3, 2.6, '#f0d264', INK, 1.1, 0.25); ell(g, 5, -30, 3.3, 2.6, '#f0d264', INK, 1.1, -0.25); ell(g, -4.6, -29.8, 1.1, 1.5, INK); ell(g, 4.6, -29.8, 1.1, 1.5, INK);
  line(g, [-9, -34.6, -2, -32.4], INK, 1.9); line(g, [9, -34.6, 2, -32.4], INK, 1.9);
  path(g, p => { p.moveTo(-6, -24); p.lineTo(-3, -21.6); p.lineTo(0, -24.4); p.lineTo(3, -21.6); p.lineTo(6, -24); p.lineTo(4, -18); p.lineTo(-4, -18); p.closePath(); }, '#3a2a22', INK, 1);
  g.beginPath(); g.moveTo(-12.4, -14); g.quadraticCurveTo(0, -10.5, 12.4, -14); st(g, INK, 3.4); g.beginPath(); g.moveTo(-12.4, -14); g.quadraticCurveTo(0, -10.5, 12.4, -14); st(g, '#d9b77a', 1.9);
  [[-9, WHITE], [-5, RED], [-1, WHITE], [3, INDIGO], [7, OCHRE]].forEach(([x, c]) => rr(g, x, -13 + Math.abs(x) * 0.06, 2.4, 7, 0.5, c, INK, 0.6));
  for (const [x, y, rx] of [[-13, -50, 14], [12, -54, 13], [0, -63, 15]]) { ell(g, x, y, rx, rx * 0.46, TEAL, INK, 1.2); for (let i = -1; i <= 1; i++) line(g, [x + i * rx * 0.4, y - rx * 0.3, x + i * rx * 0.44, y + rx * 0.14], '#2c4f44', 0.9); }
}
const BROWN_D = '#7a5a40';
function eoduksini(g) {
  const D = '#2a2440', M = '#3d3560';
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 11, -34); g.quadraticCurveTo(s * 24, -30, s * 21, -12); st(g, INK, 6.4); g.beginPath(); g.moveTo(s * 11, -34); g.quadraticCurveTo(s * 24, -30, s * 21, -12); st(g, D, 4.6); for (const dx of [-2.6, 0, 2.6]) line(g, [s * 21 + dx, -12, s * 21 + dx * 1.5, -6], '#e9e4d8', 1.3); }
  path(g, p => {
    p.moveTo(-15, -2); p.lineTo(-11.5, -7); p.lineTo(-8, -1); p.lineTo(-4, -6.5); p.lineTo(0, 0); p.lineTo(4, -6.5); p.lineTo(8, -1); p.lineTo(11.5, -7); p.lineTo(15, -2);
    p.quadraticCurveTo(17, -30, 11, -44); p.lineTo(13, -55); p.lineTo(7, -50.5); p.lineTo(5, -60); p.lineTo(0, -52.5); p.lineTo(-5, -60); p.lineTo(-7, -50.5); p.lineTo(-13, -55); p.lineTo(-11, -44); p.quadraticCurveTo(-17, -30, -15, -2); p.closePath();
  }, D, INK, 1.3);
  g.beginPath(); g.moveTo(-8, -10); g.quadraticCurveTo(0, -20, 8, -10); st(g, M, 1.6); g.beginPath(); g.moveTo(-10, -18); g.quadraticCurveTo(0, -27, 10, -18); st(g, M, 1.4);
  path(g, p => { p.moveTo(-8.6, -41); p.quadraticCurveTo(-9, -49.5, 0, -49.5); p.quadraticCurveTo(9, -49.5, 8.6, -41); p.quadraticCurveTo(6.6, -30.5, 0, -29.5); p.quadraticCurveTo(-6.6, -30.5, -8.6, -41); p.closePath(); }, '#e9e4d8', INK, 1.2);
  for (const s of [-1, 1]) path(g, p => { p.moveTo(s * 1.6, -41.4); p.quadraticCurveTo(s * 4.6, -45.4, s * 7, -41.6); p.quadraticCurveTo(s * 4.4, -42.6, s * 1.6, -41.4); p.closePath(); }, '#e0503f', INK, 0.8);
  path(g, p => { p.moveTo(-5.6, -36.6); p.lineTo(-3.6, -34.6); p.lineTo(-1.8, -36.6); p.lineTo(0, -34.6); p.lineTo(1.8, -36.6); p.lineTo(3.6, -34.6); p.lineTo(5.6, -36.6); p.quadraticCurveTo(0, -30.6, -5.6, -36.6); p.closePath(); }, '#3a2a36', INK, 0.9);
  ell(g, 0, -46.4, 1.2, 1.4, '#e0503f');
}
function scarecrow(g) {
  line(g, [0, 4, 0, -30], INK, 3.6); line(g, [0, 4, 0, -30], '#8a6a3c', 2);
  line(g, [-19, -27, 19, -27], INK, 3.4); line(g, [-19, -27, 19, -27], '#8a6a3c', 1.8);
  path(g, p => { p.moveTo(-17, -31); p.lineTo(17, -31); p.lineTo(15, -22); p.lineTo(8.5, -24); p.lineTo(10.5, -6); p.lineTo(6, -9); p.lineTo(2.5, -4.5); p.lineTo(-1.5, -9); p.lineTo(-5.5, -4.5); p.lineTo(-10.5, -7); p.lineTo(-8.5, -24); p.lineTo(-15, -22); p.closePath(); }, '#d8cfb2', INK, 1.2);
  rr(g, -6.5, -19, 6, 6, 0.6, '#a84a32', INK, 0.8); rr(g, 2, -14, 5, 5, 0.6, INDIGO, INK, 0.8); line(g, [-5, -17, -2, -15], INK, 0.6);
  for (const s of [-1, 1]) for (const d of [-2, 0, 2]) line(g, [s * 17, -27 + d, s * 22.5, -27 + d * 2.2], '#d9b24a', 1.1);
  for (const x of [-7, -3.5, 0, 3.5, 7]) line(g, [x, -6, x * 1.2, -1], '#d9b24a', 1.1);
  ell(g, 0, -38, 7.4, 7.2, '#ecdcae', INK, 1.2); line(g, [-4.2, -39.5, -1.6, -38.2], INK, 1.1); line(g, [-4.2, -38.2, -1.6, -39.5], INK, 1.1); ell(g, 3, -38.8, 1, 1.2, INK); g.beginPath(); g.moveTo(-3, -34.6); g.quadraticCurveTo(0, -32.4, 3.4, -34.8); st(g, INK, 1); line(g, [-6, -35, -7.4, -31.5], '#d9b24a', 1); line(g, [6, -35, 7.4, -31.5], '#d9b24a', 1);
  HATS.paeraeng(g);
}
// 군기 수레: 행군의 중심. 큰 깃발과 북을 실었다
function bannerCart(g) {
  line(g, [-22, -12, -34, -6], WOODD, 2.8);
  line(g, [-6, -16, -6, -100], INK, 4.4); line(g, [-6, -16, -6, -100], '#7a3a2a', 2.6); poly(g, [-9, -100, -6, -108, -3, -100], OCHRE, INK, 0.9);
  path(g, p => { p.moveTo(-6, -98); p.lineTo(34, -95); p.quadraticCurveTo(29, -80, 34, -64); p.lineTo(-6, -61); p.closePath(); }, INDIGO, INK, 1.4);
  path(g, p => { p.moveTo(-6, -98); p.lineTo(34, -95); p.lineTo(33.2, -91.4); p.lineTo(-6, -94.4); p.closePath(); }, RED); path(g, p => { p.moveTo(-6, -61); p.lineTo(34, -64); p.lineTo(33.2, -67.6); p.lineTo(-6, -64.6); p.closePath(); }, RED);
  g.beginPath(); g.moveTo(-6, -98); g.lineTo(34, -95); g.quadraticCurveTo(29, -80, 34, -64); g.lineTo(-6, -61); st(g, INK, 1.4);
  ell(g, 13, -79.6, 9.4, 9.4, WHITE, INK, 1); g.fillStyle = RED; g.font = "400 13px 'Yeon Sung', serif"; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('군', 13, -78.8);
  for (const y of [-58, -50]) line(g, [-6, y, -12, y + 6], OCHRE, 1.3);
  rr(g, -24, -20, 48, 10, 2.4, '#9a6a3c', INK, 1.3); for (const x of [-18, -8, 2, 12]) line(g, [x, -19, x, -11], WOODD, 0.9);
  rr(g, 4, -36, 18, 16, 4, '#a8322a', INK, 1.2); ell(g, 13, -36, 9, 3.4, '#f3e7c8', INK, 1.1); for (const x of [8, 13, 18]) line(g, [x, -32, x, -21], OCHRE, 1);
  for (const s of [-1, 1]) { ell(g, s * 15, -8, 9, 9, WOODD, INK, 1.3); ell(g, s * 15, -8, 6, 6, '#d9c39a', INK, 0.9); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; line(g, [s * 15, -8, s * 15 + Math.cos(a) * 6, -8 + Math.sin(a) * 6], WOODD, 1.1); } ell(g, s * 15, -8, 1.8, 1.8, '#3a2a22'); }
}
function stakeLog(g) { g.save(); g.rotate(0.12); poly(g, [-5, 2, -5, -30, 0, -40, 5, -30, 5, 2], WOOD, INK, 1.3); line(g, [-1.6, -4, -1.6, -28], 'rgba(122,74,44,0.6)', 1); rr(g, -5.6, -14, 11.2, 3.4, 1, '#d9b77a', INK, 0.8); g.restore(); ell(g, 0, 2, 7, 2.6, '#8a6844', INK, 1); }
function ghostDoll(o) { return g => { g.globalAlpha = 0.9; doll(g, Object.assign({ robe: '#c5d9df', collar: '#eef6f8', skin: '#e9f0f1', pale: true, tatter: true, hat: 'jeonrip', plain: true }, o)); g.globalAlpha = 1; }; }

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
const hold = (a, mode, x, y) => ({ x: x === undefined ? HX : x, y: y === undefined ? HY : y, a, mode: mode || 'slash' });
const dk = (o, w) => ({ body: g => dokkaebi(g, o), weapon: w || 'club', hold: hold(0.35, 'slash', 16.4, -21), h: 56 });
export const LOOKS = {
  // 아군
  sword: { body: g => doll(g, { robe: INDIGO, sash: RED, hat: 'jeonrip', hem: '#22385c' }), hold: hold(0.3) },
  shield: { body: g => doll(g, { robe: TEAL, sash: OCHRE, hat: 'band', hem: '#2c4f44', item: ITEM.shield }), hold: hold(0.25) },
  spear: { body: g => doll(g, { robe: '#9a5a3c', sash: INDIGO, hat: 'paeraeng', hem: '#6f3f2a' }), hold: hold(0.1, 'thrust') },
  knight: { body: g => { g.scale(1.12, 1.12); horseman(g); }, hold: hold(0.42, 'thrust', 8.6, -43), h: 76, w: 130, ox: 62 },
  xbow: { body: g => doll(g, { robe: '#f3ecdd', vest: INDIGO, sash: RED, hat: 'band', back: ITEM.quiver }), hold: hold(0, 'shoot') },
  wizard: { body: g => doll(g, { robe: '#8fa6b8', sash: BLACK, hat: 'yugeon', beard: BLACK, hem: '#5f7890', dots: '#dfe8ee' }), hold: hold(0, 'cast') },
  priest: { body: g => doll(g, { robe: WHITE, stripes: [RED, OCHRE, INDIGO], sash: RED, hat: 'gokkal', hem: RED }), hold: hold(0, 'cast') },
  cannon: { body: cart, weapon: 'none', hold: hold(0, 'shoot'), h: 46, still: true },
  berserk: { body: g => doll(g, { robe: '#6b5a44', bare: true, sash: RED, hat: 'band', bandCol: RED, brow: true, beard: BLACK, hem: '#4a3d2e' }), hold: hold(0.4), wide: 1.14 },
  // 영웅
  commander: { body: g => doll(g, { robe: '#b8342a', studs: true, sash: OCHRE, hat: 'tugu', beard: BLACK, brow: true, hem: OCHRE }), hold: hold(0.22), scale: 1.3, hero: true, h: 64 },
  bishop: { body: g => doll(g, { robe: '#9a9a92', kasaya: '#a8442f', beads: true, hat: 'bald', hem: '#7a7a72' }), hold: hold(0, 'cast'), scale: 1.3, hero: true, h: 62 },
  archmage: { body: g => { ITEM.cloud(g); g.save(); g.translate(0, -3); doll(g, { robe: WHITE, sash: '#8fb6c8', beard: 'long', hat: 'sage', hem: '#8fb6c8', item: gg => { ell(gg, 9, -15.5, 3.6, 4.4, '#b8742a', INK, 1); ell(gg, 9, -20.6, 2, 2, '#b8742a', INK, 1); } }); g.restore(); }, hold: hold(0, 'cast', HX, HY - 3), scale: 1.3, hero: true, h: 62, float: true },
  decoy: { body: scarecrow, weapon: 'none', hold: hold(0, 'none'), h: 54, still: true },
  stake: { body: stakeLog, weapon: 'none', hold: hold(0, 'none'), h: 40, still: true },
  banner: { body: bannerCart, weapon: 'none', hold: hold(0, 'none'), h: 104, still: true, scale: 1.1 },
  // 적군
  goblin: Object.assign(dk({ skin: '#d9603f' }), { scale: 0.8 }),
  orc: Object.assign(dk({ skin: '#4f9a8a', cloth: '#d98a3e' }), { scale: 1.06 }),
  garcher: { body: g => dokkaebi(g, { skin: '#d9963f', cloth: '#8a4f3a', item: DITEM.sling }), weapon: 'none', hold: hold(0, 'shoot'), scale: 0.8, h: 56 },
  rshield: Object.assign(dk({ skin: '#8a64a8', cloth: '#d9c39a', item: DITEM.lid }), { scale: 1.02 }),
  rassassin: { body: fox, weapon: 'none', hold: hold(0, 'bite'), h: 44 },
  treant: { body: jangseung, weapon: 'none', hold: hold(0, 'bite'), h: 66, scale: 1.2, still: true },
  sapling: { body: jangseung, weapon: 'none', hold: hold(0, 'bite'), h: 66, scale: 0.66 },
  bomber: { body: wisp, weapon: 'none', hold: hold(0, 'none'), h: 44, float: true, border: '#e8f8fd' },
  wolf: { body: boar, weapon: 'none', hold: hold(0, 'bite'), h: 40, w: 130, ox: 62, scale: 1.05 },
  shaman: { body: g => dokkaebi(g, { skin: '#d0688a', cloth: '#3f6b5c', item: DITEM.drum }), weapon: 'stick', hold: hold(0.5, 'cast', 16.4, -21), h: 56 },
  skel: { body: ghostDoll({}), weapon: 'rusty', hold: hold(0.3), float: true, border: '#e6f3f7' },
  skelarcher: { body: ghostDoll({ hat: 'band', hair: '#5a6a72', bandCol: '#c5d9df', item: ITEM.bow }), weapon: 'none', hold: hold(0, 'shoot'), float: true, border: '#e6f3f7' },
  catapult: { body: catapult, weapon: 'arm', hold: hold(-0.9, 'lob', 0, -17), h: 50, scale: 1.15, still: true },
  necro: { body: g => doll(g, { robe: BLACK, sash: '#6b6470', skin: '#e6e3d8', pale: true, hat: 'gat', item: ITEM.scroll }), weapon: 'none', hold: hold(0, 'cast'), scale: 1.12 },
  // 보스
  warchief: Object.assign(dk({ skin: '#3f6f9f', horns: 2, beads: true }, 'ironclub'), { scale: 2.0, boss: true }),
  elder: { body: mokshin, weapon: 'none', hold: hold(0, 'bite'), h: 72, scale: 2.2, boss: true, still: true },
  skelking: { body: eoduksini, weapon: 'none', hold: hold(0, 'bite'), h: 62, scale: 2.1, boss: true, float: true },
};

export const UNIT_SCALE = 1.1;
const cache = new Map();
export function getLook(type) {
  let L = cache.get(type); if (L) return L;
  const d = LOOKS[type]; if (!d) throw new Error('unknown look ' + type);
  const o = { w: d.w || 110, ox: d.ox || 55, h: 128, oy: 112, border: d.border };
  const front = paperSprite(d.wide ? g => { g.scale(d.wide, 1); d.body(g); } : d.body, o);
  const weapon = d.weapon && d.weapon !== 'none' ? paperSprite(WEAPONS[d.weapon], { w: 60, h: 90, ox: 30, oy: 62, border: d.border }) : null;
  L = { front, back: front, weapon, hold: d.hold, scale: (d.scale || 1) * UNIT_SCALE, h: d.h || 58, hero: !!d.hero, boss: !!d.boss, float: !!d.float, still: !!d.still };
  cache.set(type, L); return L;
}
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

// 인형 초상 (패·정보창·지도용): 몸 + 손에 든 무기
export function portrait(g, type, x, y, s, t = 0, bob = false, wpn) {
  const L = getLook(type), k = s * L.scale, yy = y - (bob ? Math.abs(Math.sin(t * 5)) * 3 * s : 0), h = L.hold;
  drawSprite(g, L.front, x, yy, k, k);
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
