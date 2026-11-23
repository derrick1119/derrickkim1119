// 또 다른 두목들과 그 소품의 그림 (인형 좌표: 발밑이 y = 0, 사람 머리가 y ≈ -45. 네발짐승은 머리가 +x 쪽)
// 사람꼴은 figures.js 의 관절 인형(doll)·도깨비(dokkaebi)를 그대로 쓰고 소품만 더한다. 짐승꼴은 같은 종이 오림 방식으로 따로 그린다
import { TAU, INK, RED, OCHRE, ell, rr, line, path, poly } from './draw.js';
import { part, curve, rope, E, R, P, dk, lt, HATS, WHITE, BLACK, WOOD, WOODD, doll, dokkaebi, HX } from './figures.js';
import { strawShoes } from './beasts.js';

const BRASS = '#c9962e';
const FIRE1 = '#ff9a2e', FIRE2 = '#f0c23a';
// 불꽃 한 줄기 (밑동 x,y · 높이 h · 기울기 a)
const flame = (g, x, y, h, a = 0, w = 0.36, c1 = FIRE1, c2 = FIRE2) => {
  g.save(); g.translate(x, y); g.rotate(a);
  part(g, p => { p.moveTo(0, -h); p.quadraticCurveTo(h * w * 1.2, -h * 0.45, h * w * 0.7, 0); p.quadraticCurveTo(0, h * 0.18, -h * w * 0.7, 0); p.quadraticCurveTo(-h * w * 1.2, -h * 0.45, 0, -h); p.closePath(); }, c1, null, { lw: 0.9 });
  part(g, p => { p.moveTo(0, -h * 0.62); p.quadraticCurveTo(h * w * 0.6, -h * 0.25, h * w * 0.34, 0); p.quadraticCurveTo(0, h * 0.08, -h * w * 0.34, 0); p.quadraticCurveTo(-h * w * 0.6, -h * 0.25, 0, -h * 0.62); p.closePath(); }, c2, null, { lw: 0 });
  g.restore();
};

// ───────── ① 여우 할미: 흰 쪽머리에 나무 비녀, 굽은 지팡이, 등에 진 보따리, 치마 밑으로 삐져나온 꼬리 다섯 ─────────
HATS.halmi = g => {
  const W2 = '#ebe6da';
  part(g, p => { p.moveTo(-10.4, -40.6); p.quadraticCurveTo(-11.4, -55.4, 0, -55.4); p.quadraticCurveTo(11.4, -55.4, 10.4, -40.6); p.quadraticCurveTo(6, -48.6, 0, -49.4); p.quadraticCurveTo(-6, -48.6, -10.4, -40.6); p.closePath(); }, W2, P(2, -56, 12, -56, 12, -40, 6, -46), { k: 0.14, lw: 1.1 });
  line(g, [0, -55, 0, -49.6], '#b9b2a2', 0.7); for (const x of [-5, 5]) curve(g, p => { p.moveTo(x * 0.4, -54); p.quadraticCurveTo(x * 1.4, -51, x * 1.7, -45); }, '#c9c2b2', 0.5);
  line(g, [-17.6, -28.4, -11.6, -29.4], INK, 2.4); line(g, [-17.6, -28.4, -11.6, -29.4], '#8a5a34', 1.2); line(g, [11.6, -29.4, 15.6, -28.8], INK, 2.4); line(g, [11.6, -29.4, 15.6, -28.8], '#8a5a34', 1.2);
};
function halmiTails(g) {
  for (const [a, x, l] of [[-1.0, -5, 38], [-0.66, -4, 46], [-0.34, -2, 42], [0.42, 3, 38], [0.78, 5, 32]]) {
    g.save(); g.translate(x, -10); g.rotate(a);
    part(g, p => { p.moveTo(-3, 0); p.bezierCurveTo(-9, -l * 0.36, -8, -l * 0.74, 0, -l); p.bezierCurveTo(8, -l * 0.74, 9, -l * 0.36, 3, 0); p.closePath(); }, '#d8ae6a', P(1, -l, 10, -l, 10, 1, 2, 1), { k: 0.12, lw: 1.1 });
    part(g, p => { p.moveTo(-4.2, -l * 0.68); p.quadraticCurveTo(0, -l * 0.8, 0, -l); p.quadraticCurveTo(0, -l * 0.8, 4.2, -l * 0.68); p.quadraticCurveTo(0, -l * 0.76, -4.2, -l * 0.68); p.closePath(); }, '#fbf7ec', null, { lw: 0.8 });
    g.restore();
  }
}
function halmiBundle(g) {   // 등에 진 쪽빛 보따리 (왼 어깨 위로 매듭이 보인다)
  part(g, p => { p.moveTo(-16, -38); p.quadraticCurveTo(-18, -48, -9, -50); p.quadraticCurveTo(1, -51, 4, -44); p.quadraticCurveTo(6, -38, -1, -34); p.closePath(); }, '#2f4d7e', E(-2, -40, 7, 6), { k: 0.2, lw: 1.1 });
  for (const [x, y] of [[-12, -44], [-6, -47], [-2, -41], [-9, -39]]) ell(g, x, y, 0.9, 0.9, '#e9e2cf');
  part(g, P(-12, -50.6, -8.6, -55, -6.4, -50.6), '#2f4d7e', null, { lw: 0.9 }); part(g, P(-6.4, -50.6, -3, -54, -2.6, -49.8), '#26406a', null, { lw: 0.9 });
}
function cane(g) {   // 오른손에 쥔 굽은 지팡이
  line(g, [HX + 1.4, -24, HX + 3.6, 2], INK, 3.2); line(g, [HX + 1.4, -24, HX + 3.6, 2], '#8a5a34', 1.7);
  curve(g, p => { p.moveTo(HX + 1.4, -24); p.quadraticCurveTo(HX - 0.6, -30.6, HX - 5, -28.6); }, INK, 3.2); curve(g, p => { p.moveTo(HX + 1.4, -24); p.quadraticCurveTo(HX - 0.6, -30.6, HX - 5, -28.6); }, '#9a6a3c', 1.7);
}
const HALMI = { robe: '#6c677c', top: '#ece4d2', git: '#8a2a26', goreum: '#8a2a26', hem: '#55516a', collar: '#fbf7ec', hat: 'halmi', hair: '#ebe6da', skin: '#ecd0b0', jaw: 'round', brow: 'old', browCol: '#cfc8b8', eyes: 'sharp', lines: true, mouth: 'smirk', item: cane, under: halmiTails, back: halmiBundle };

// ───────── ② 외눈 도깨비: 잿빛 바위 살빛, 이마 한가운데의 큰 눈 하나, 왼손에 든 바윗덩이 ─────────
const OENUN = { skin: '#8d8274', cloth: '#5a4a3a', vest: '#6a5848', warts: true, hair: '#3a2a22' };
function rockInHand(g) { part(g, P(-22.6, -22, -18, -27.6, -11.6, -25.4, -10.6, -18.6, -15.4, -14.6, -21.6, -16), '#9a8e80', P(-15, -27, -10, -27, -10, -14, -15, -14), { k: 0.24, hi: E(-19, -23, 2, 1.2), lw: 1.2 }); line(g, [-18, -21, -14.6, -19.4], '#6f665a', 0.8); }
function oneEye(g, o) {
  const sk = o.skin;
  // 두 눈과 눈썹 자리를 살빛으로 덮고 (오른쪽은 그늘), 이마 한가운데에 큰 눈 하나와 굵은 외눈썹
  part(g, p => { p.moveTo(-11.8, -46.8); p.quadraticCurveTo(0, -49.4, 11.8, -46.8); p.lineTo(12, -36.6); p.quadraticCurveTo(0, -34.8, -12, -36.6); p.closePath(); }, sk, R(6.6, -50, 7, 16), { lw: 0 });
  if (o.blink) { curve(g, p => { p.moveTo(-6.4, -40.6); p.quadraticCurveTo(0, -37.4, 6.4, -40.6); }, INK, 1.9); line(g, [-6.4, -40.6, -7.6, -41.6], INK, 1.1); }
  else {
    g.save(); g.beginPath(); g.moveTo(-7, -40.4); g.quadraticCurveTo(0, -46.6, 7, -40.4); g.quadraticCurveTo(0, -35.6, -7, -40.4); g.closePath(); g.fillStyle = '#fff3b8'; g.fill(); g.clip();
    ell(g, 0, -40.6, 3.1, 3.4, '#8a2a1c'); ell(g, 0, -40.5, 1.4, 1.9, '#151216'); ell(g, -1, -41.6, 0.8, 0.8, '#fff'); g.restore();
    curve(g, p => { p.moveTo(-7, -40.4); p.quadraticCurveTo(0, -46.6, 7, -40.4); }, INK, 1.7); curve(g, p => { p.moveTo(-7, -40.4); p.quadraticCurveTo(0, -35.6, 7, -40.4); }, INK, 1);
  }
  path(g, p => { p.moveTo(-10.6, -45.8); p.quadraticCurveTo(0, -49.6, 10.6, -45.8); p.lineTo(10, -43.8); p.quadraticCurveTo(0, -47, -10, -43.8); p.closePath(); }, o.hair || BLACK, INK, 0.8);
}
const oenun = (g, o = {}) => { const q = Object.assign({ item: rockInHand }, OENUN, o); dokkaebi(g, q, 'body'); dokkaebi(g, q, 'head'); oneEye(g, q); };

// ───────── ③ 두두리: 붉은 구릿빛 도깨비 대장 / 땅에 꽂은 도깨비 방망이 ─────────
const DUDURI = { skin: '#4f7a7a', cloth: '#8a2a26', vest: '#6a1f1c', knot: true, beads: true, warts: true, hair: '#2a2228' };
// 도깨비 방망이: 울퉁불퉁 혹이 돋은 나무 방망이에 붉은 술 (손에 드는 무기 그림)
export function goldclub(g) {
  const W2 = '#9a6438';
  part(g, p => { p.moveTo(-1.8, 5.6); p.quadraticCurveTo(-2.4, -10, -5.8, -25); p.quadraticCurveTo(-5.2, -35, 0, -35.4); p.quadraticCurveTo(5.2, -35, 5.8, -25); p.quadraticCurveTo(2.4, -10, 1.8, 5.6); p.closePath(); }, W2, P(1, -36, 7, -36, 3, 6, 0.4, 6), { hi: P(-4, -29, -2.8, -29, -1.2, -6, -1.8, -6), hk: 0.22 });
  for (const [x, y, r] of [[-4.4, -27, 2], [3.6, -29.6, 1.8], [-2.6, -20.4, 1.6], [3.4, -21.6, 1.7], [0.4, -32.2, 1.6], [-0.2, -25, 1.4]]) part(g, E(x, y, r, r), lt(W2, 0.12), E(x + 0.6, y + 0.6, r * 0.8, r * 0.7), { k: 0.24, lw: 0.8 });
  for (const y of [-1, 2.2]) line(g, [-1.8, y, 1.8, y + 0.5], '#d9c39a', 1.1);
  part(g, p => { p.moveTo(-0.6, 5.4); p.quadraticCurveTo(-3.6, 10, -2, 15); p.lineTo(2.4, 14.4); p.quadraticCurveTo(3, 9.6, 0.8, 5.4); p.closePath(); }, RED, null, { lw: 0.8 });
}
export function dokbang(g) {
  part(g, p => { p.moveTo(-22, 0); p.quadraticCurveTo(-14, -9, 0, -9); p.quadraticCurveTo(14, -9, 22, 0); p.closePath(); }, '#8a6a48', E(6, -2, 14, 5), { k: 0.2, lw: 1.2 });   // 흙더미
  for (const [x, y] of [[-14, -3], [-7, -6.6], [9, -5], [15, -2.4], [2, -2]]) { part(g, E(x, y, 3.4, 1.5), '#e6b84a', E(x + 0.8, y + 0.6, 3, 1), { k: 0.22, lw: 0.8 }); ell(g, x, y, 0.9, 0.5, '#8a6a2a'); }   // 쏟아진 엽전
  g.save(); g.translate(0, -6); g.scale(1.55, 1.55); g.rotate(-0.08); goldclub(g); g.restore();
  for (const [x, y] of [[-12, -46], [11, -40], [-8, -24], [13, -58]]) { line(g, [x - 2.6, y, x + 2.6, y], '#fff3b0', 1.2); line(g, [x, y - 2.6, x, y + 2.6], '#fff3b0', 1.2); }
}

// ───────── ④ 불개: 숯빛 털에 불꽃 갈기와 불꼬리, 이글거리는 눈 (머리가 오른쪽) ─────────
export function bulgae(g, o = {}) {
  const C = '#3a2c30', D = '#251c22', E1 = '#8a3a22', far = dk(C, 0.3);
  // 불꼬리
  for (const [a, h] of [[-1.1, 22], [-0.7, 26], [-0.3, 20]]) flame(g, -24, -26, h, a);
  rope(g, p => { p.moveTo(-20, -27); p.quadraticCurveTo(-25, -28, -26, -31); }, C, 3);
  const leg = (x, col) => { part(g, p => { p.moveTo(x - 4.6, -15); p.quadraticCurveTo(x - 5.2, -7, x - 3.4, -4); p.lineTo(x - 3.8, -0.6); p.lineTo(x + 4.6, -0.6); p.quadraticCurveTo(x + 4, -2.6, x + 2.4, -4); p.quadraticCurveTo(x + 4.2, -9, x + 4.4, -15); p.closePath(); }, col, R(x + 1, -15, 4, 15), { lw: 1.2 }); for (const dx of [-2, 0.6, 3.2]) line(g, [x + dx, -0.6, x + dx, 1.2], INK, 0.8); };
  leg(-14, far); leg(10, far);
  g.save(); g.translate(0, 7);
  // 몸통
  part(g, p => { p.moveTo(-22, -24); p.bezierCurveTo(-24, -34, -14, -37, -4, -36); p.bezierCurveTo(6, -35.4, 13, -37, 18, -33); p.bezierCurveTo(22, -27, 19, -18, 13, -16.4); p.bezierCurveTo(2, -13.6, -12, -14, -19, -17.6); p.quadraticCurveTo(-22, -20, -22, -24); p.closePath(); }, C, P(-24, -23, 22, -23, 22, -12, -24, -12), { k: 0.24, hi: P(-18, -33, 8, -34.6, 8, -32.6, -18, -31), hic: '#5a4248', lw: 1.3 });
  for (const [x, y] of [[-14, -24], [-6, -28], [2, -23], [-10, -19.6], [8, -27]]) curve(g, p => { p.moveTo(x, y); p.quadraticCurveTo(x + 2, y + 1.6, x + 4, y + 0.6); }, E1, 1);   // 털 틈의 불빛
  g.restore(); leg(-18, C); leg(6, C); g.save(); g.translate(0, 7);
  // 등과 목을 따라 타오르는 갈기
  for (const [x, y, h, a] of [[-16, -35, 9, -0.5], [-9, -36.4, 11, -0.3], [-2, -36.6, 12, -0.2], [5, -36.2, 13, 0], [11, -38, 14, 0.15], [15.6, -42, 13, 0.35], [19.6, -46, 11, 0.5]]) flame(g, x, y, h, a);
  // 목과 머리
  part(g, p => { p.moveTo(12, -36); p.quadraticCurveTo(16, -46, 22, -48.6); p.lineTo(27, -42); p.quadraticCurveTo(24, -33, 18, -26); p.closePath(); }, C, P(20, -48, 28, -42, 22, -27, 18, -27), { k: 0.24, lw: 0 });
  part(g, p => { p.moveTo(18.6, -50.4); p.quadraticCurveTo(24, -54.6, 29.6, -50.6); p.lineTo(38, -44); p.quadraticCurveTo(40.4, -40.6, 37.6, -38.4); p.lineTo(31.6, -37.6); p.quadraticCurveTo(26, -37.6, 22.4, -40); p.quadraticCurveTo(18, -43.6, 18.6, -50.4); p.closePath(); }, C, P(24, -44, 41, -44, 41, -36, 22, -36), { k: 0.26, hi: E(23.6, -49, 3, 1.4), hic: '#5a4248', lw: 1.3 });
  for (const s of [0, 1]) part(g, P(20.6 + s * 4, -50.6 + s, 21.6 + s * 4.6, -58.6 + s, 26 + s * 4, -51.4 + s), s ? C : far, null, { lw: 1 });   // 쫑긋한 귀
  ell(g, 39, -41.6, 1.6, 1.3, '#151216');   // 코
  // 벌린 입과 송곳니
  path(g, p => { p.moveTo(31, -38.6); p.lineTo(39, -38.8); p.quadraticCurveTo(36.6, -34.6, 31.6, -35.6); p.closePath(); }, '#7a1f1c', INK, 0.9);
  for (const x of [33, 37]) poly(g, [x - 0.8, -38.6, x, -36.4, x + 0.8, -38.6], WHITE, INK, 0.5);
  if (o.blink) line(g, [27, -46, 31, -45.6], INK, 1.5);
  else { path(g, p => { p.moveTo(26.6, -45.4); p.quadraticCurveTo(29, -48.6, 32, -46); p.quadraticCurveTo(29.4, -44, 26.6, -45.4); p.closePath(); }, FIRE2, INK, 0.9); ell(g, 29.4, -45.8, 0.8, 1.2, '#7a1f1c'); }
  line(g, [26, -48.4, 31.6, -47.8], INK, 1.3);
  g.restore();
}

// ───────── ⑤ 지네 왕: 붉은 마디가 S 꼴로 치켜든 큰 지네 / 은혜 갚은 두꺼비 ─────────
export function jine(g, o = {}) {
  const C = '#5e2a22', S = '#a8402a', LEG = '#d9a441', HEAD = '#8a2a1c';
  // 마디 자리: 꼬리(왼쪽 아래)에서 머리(오른쪽 위)로
  const seg = [[-30, -6, 5.6], [-24, -7, 6.4], [-17, -8, 7], [-10, -9.6, 7.6], [-3, -11.6, 8], [4, -14, 8.2], [10, -18, 8.2], [14, -24, 8], [16.6, -31, 7.6], [18, -38, 7.2], [19, -45, 6.8]];
  for (let i = 0; i < seg.length; i++) { const [x, y, r] = seg[i], [nx, ny] = seg[Math.min(seg.length - 1, i + 1)], a = Math.atan2(ny - y, nx - x) + Math.PI / 2;
    for (const s of [-1, 1]) { const lx = x + Math.cos(a) * r * s, ly = y + Math.sin(a) * r * s * 0.6; const fx = lx + Math.cos(a) * 6 * s + (s < 0 ? -2 : 2), fy = Math.min(1, ly + 9); curve(g, p => { p.moveTo(lx, ly); p.quadraticCurveTo(lx + Math.cos(a) * 5 * s, ly - 3, fx, fy); }, INK, 2.6); curve(g, p => { p.moveTo(lx, ly); p.quadraticCurveTo(lx + Math.cos(a) * 5 * s, ly - 3, fx, fy); }, LEG, 1.3); } }
  for (let i = 0; i < seg.length; i++) { const [x, y, r] = seg[i], [nx, ny] = seg[Math.min(seg.length - 1, i + 1)], [px, py] = seg[Math.max(0, i - 1)], a = Math.atan2(ny - py, nx - px);
    g.save(); g.translate(x, y); g.rotate(a);
    part(g, p => { if (p.roundRect) p.roundRect(-r * 0.62, -r, r * 1.24, r * 2, r * 0.5); else p.rect(-r * 0.62, -r, r * 1.24, r * 2); }, C, R(-r, 0.2 * r, r * 2, r), { k: 0.24, hi: R(-r * 0.5, -r * 0.86, r, r * 0.4), hic: lt(C, 0.3), lw: 1.2 });
    line(g, [-r * 0.62, -r * 0.35, r * 0.62, -r * 0.35], S, 1.2); g.restore(); }
  // 머리: 납작한 붉은 머리, 휘어진 독니 둘, 더듬이
  part(g, p => { p.moveTo(13, -48); p.quadraticCurveTo(14, -56, 20.6, -56.4); p.quadraticCurveTo(28, -56, 28.6, -49.6); p.quadraticCurveTo(28, -45, 21, -44.6); p.quadraticCurveTo(14, -44.6, 13, -48); p.closePath(); }, HEAD, P(20, -57, 30, -57, 30, -44, 21, -44), { k: 0.22, hi: E(17.6, -53, 2.6, 1.2), lw: 1.3 });
  for (const [x0, y0, x1, y1, x2, y2] of [[19, -56, 15, -64, 8, -66], [24, -56, 26, -64, 33, -67]]) { curve(g, p => { p.moveTo(x0, y0); p.quadraticCurveTo(x1, y1, x2, y2); }, INK, 2.4); curve(g, p => { p.moveTo(x0, y0); p.quadraticCurveTo(x1, y1, x2, y2); }, LEG, 1.1); }
  for (const s of [-1, 1]) { const bx = 20.6 + s * 4.6; curve(g, p => { p.moveTo(bx, -45); p.quadraticCurveTo(bx + s * 6, -42, bx + s * 2, -36.6); }, INK, 3.2); curve(g, p => { p.moveTo(bx, -45); p.quadraticCurveTo(bx + s * 6, -42, bx + s * 2, -36.6); }, '#2b2a30', 1.8); }
  for (const s of [-1, 1]) { if (o.blink) line(g, [20.6 + s * 4.4 - 1.4, -50.6, 20.6 + s * 4.4 + 1.4, -50.6], INK, 1.2); else { ell(g, 20.6 + s * 4.4, -50.8, 1.7, 1.5, FIRE2, INK, 0.8); ell(g, 20.6 + s * 4.4, -50.8, 0.6, 0.9, INK); } }
}
export function toad(g, o = {}) {
  const C = '#7d7a46', D = '#5a5a32', B = '#d9cf9a';
  for (const s of [-1, 1]) part(g, p => { p.moveTo(s * 6, -4); p.quadraticCurveTo(s * 16, -6, s * 15, 0.6); p.lineTo(s * 6, 0.6); p.closePath(); }, D, null, { lw: 1.1 });
  part(g, p => { p.moveTo(-14, -3); p.bezierCurveTo(-16, -15, -9, -21, 0, -21); p.bezierCurveTo(9, -21, 16, -15, 14, -3); p.quadraticCurveTo(0, 1, -14, -3); p.closePath(); }, C, P(4, -22, 18, -22, 18, 2, 6, 2), { k: 0.22, lw: 1.3 });
  part(g, p => { p.moveTo(-8, -2.6); p.quadraticCurveTo(0, -9, 8, -2.6); p.quadraticCurveTo(0, 0, -8, -2.6); p.closePath(); }, B, null, { lw: 0.8 });
  for (const [x, y, r] of [[-8, -12, 1.4], [-3, -16, 1.2], [5, -14, 1.5], [9, -9, 1.1], [-10, -7, 1], [1, -10, 1]]) part(g, E(x, y, r, r * 0.9), lt(C, 0.16), null, { lw: 0.6 });
  for (const s of [-1, 1]) { part(g, E(s * 6.4, -20, 3.6, 3.4), C, null, { lw: 1 }); if (o.blink) line(g, [s * 6.4 - 2, -20, s * 6.4 + 2, -20], INK, 1.2); else { ell(g, s * 6.4, -20.4, 2.4, 2.2, '#e8b84a', INK, 0.7); rr(g, s * 6.4 - 1.6, -21, 3.2, 1, 0.5, INK); } }
  curve(g, p => { p.moveTo(-6, -9.6); p.quadraticCurveTo(0, -7, 6, -9.6); }, INK, 1);
  for (const s of [-1, 1]) part(g, p => { p.moveTo(s * 9, -6); p.quadraticCurveTo(s * 11, -1, s * 8, 0.6); p.lineTo(s * 12, 0.6); p.quadraticCurveTo(s * 13, -3, s * 11, -7); p.closePath(); }, C, null, { lw: 1 });
}

// ───────── ⑥ 지하국 대적: 털 조끼를 걸친 거한에 머리가 셋 (가운데가 우두머리) ─────────
const DJ = { robe: '#3a3036', top: '#4a3a32', legs: '#2f2a30', bare: true, fur: true, git: '#2a2226', sash: '#7a1f1c', hem: '#2a2226', wrist: '#2a2226', skin: '#b8957c', hat: 'wild', hair: '#2a2226' };
const DJH = [Object.assign({}, DJ, { jaw: 'square', brow: 'bushy', eyes: 'glare', beard: 'wild', mouth: 'frown' }), Object.assign({}, DJ, { jaw: 'round', brow: 'thick', eyes: 'sharp', mouth: 'grin', beard: 'stubble' }), Object.assign({}, DJ, { jaw: 'long', brow: 'stern', eyes: 'heavy', mouth: 'grit', beard: 'goatee' })];
function headAt(g, o, x, y, k, a) { g.save(); g.translate(x, y); g.rotate(a); g.scale(k, k); g.translate(0, 33.2); doll(g, o, 'head'); g.restore(); }
export function daejeok(g, o = {}) {
  const bl = o.blink ? { blink: true } : {};
  doll(g, Object.assign({}, DJ, { item: g2 => { line(g2, [-HX, -18, -HX - 4, 2], INK, 3.4); line(g2, [-HX, -18, -HX - 4, 2], '#6a4a30', 2); } }), 'body');   // 왼손에 짚은 쇠지팡이 대신 굵은 몽둥이
  headAt(g, Object.assign({}, DJH[1], bl), -14.6, -31, 0.8, -0.5);
  headAt(g, Object.assign({}, DJH[2], bl), 14.6, -31, 0.8, 0.5);
  headAt(g, Object.assign({}, DJH[0], bl), 0, -32.6, 1.04, 0);
}

// ───────── ⑦ 강철이: 쇳빛 비늘의 네발짐승, 등과 목을 따라 타오르는 불갈기, 불꼬리, 짧은 뿔 (머리가 오른쪽) ─────────
export function gangcheol(g, o = {}) {
  const C = '#4d5b70', D = '#2f394a', B = '#c9a46a', far = dk(C, 0.3);
  for (const [a, h] of [[-1.3, 18], [-0.9, 24], [-0.5, 20]]) flame(g, -27, -30, h, a);
  rope(g, p => { p.moveTo(-20, -26); p.quadraticCurveTo(-27, -26, -28, -31); }, C, 3.2);
  const leg = (x, col) => { part(g, p => { p.moveTo(x - 5, -15); p.quadraticCurveTo(x - 6, -7, x - 4.4, -4); p.lineTo(x - 5, -0.6); p.lineTo(x + 5.4, -0.6); p.lineTo(x + 3.8, -4); p.quadraticCurveTo(x + 5.4, -9, x + 5.2, -15); p.closePath(); }, col, R(x + 1, -15, 5, 15), { lw: 1.2 }); for (const dx of [-3, 0.4, 3.8]) poly(g, [x + dx - 1, -0.6, x + dx, 2, x + dx + 1, -0.6], '#e9e2cf', INK, 0.5); };
  leg(-14, far); leg(11, far);
  g.save(); g.translate(0, 6);
  part(g, p => { p.moveTo(-23, -22); p.bezierCurveTo(-26, -34, -16, -39, -4, -38.4); p.bezierCurveTo(7, -38, 15, -39, 20, -34); p.bezierCurveTo(24, -28, 21, -18, 14, -15.4); p.bezierCurveTo(2, -12.4, -12, -12.6, -20, -16.6); p.quadraticCurveTo(-23, -18.6, -23, -22); p.closePath(); }, C, P(-25, -22, 24, -22, 24, -10, -25, -10), { k: 0.26, hi: P(-19, -35, 9, -36.4, 9, -34.4, -19, -33), lw: 1.3 });
  part(g, p => { p.moveTo(-16, -14.6); p.quadraticCurveTo(0, -11, 14, -15); p.quadraticCurveTo(0, -18.4, -16, -14.6); p.closePath(); }, B, null, { lw: 0.8 });   // 배
  for (let r = 0; r < 3; r++) for (let x = -18 + (r % 2) * 3.4; x <= 14; x += 6.8) part(g, p => { p.moveTo(x - 3, -33 + r * 5.6); p.quadraticCurveTo(x, -30 + r * 5.6, x + 3, -33 + r * 5.6); p.quadraticCurveTo(x, -27.4 + r * 5.6, x - 3, -33 + r * 5.6); p.closePath(); }, lt(C, 0.12), null, { lw: 0.6 });   // 비늘
  for (const [x0, y0, x1, y1] of [[-12, -20, -8, -22], [4, -19, 8, -21.6]]) curve(g, p => { p.moveTo(x0, y0); p.lineTo(x1, y1); }, FIRE1, 1.4);   // 비늘 틈 불빛
  g.restore(); leg(-19, C); leg(6, C); g.save(); g.translate(0, 6);
  for (const [x, y, h, a] of [[-17, -37, 10, -0.5], [-10, -38.6, 12, -0.3], [-3, -39, 14, -0.15], [4, -38.6, 15, 0], [10.6, -39.6, 15, 0.12], [15.6, -43, 14, 0.3], [19.6, -47.6, 12, 0.48]]) flame(g, x, y, h, a);
  part(g, p => { p.moveTo(12, -37); p.quadraticCurveTo(16, -47, 22, -50); p.lineTo(28, -43); p.quadraticCurveTo(25, -33, 18, -26); p.closePath(); }, C, P(21, -49, 29, -43, 22, -27, 18, -27), { k: 0.26, lw: 0 });
  // 머리: 뭉툭한 주둥이, 짧은 쇠뿔 둘, 콧김
  part(g, p => { p.moveTo(18.6, -52); p.quadraticCurveTo(25, -56.6, 31, -52); p.lineTo(39.4, -45.6); p.quadraticCurveTo(42, -41, 38.6, -38.6); p.lineTo(31, -37.6); p.quadraticCurveTo(25, -37.6, 21.6, -41); p.quadraticCurveTo(17.4, -45, 18.6, -52); p.closePath(); }, C, P(24, -45, 43, -45, 43, -36, 22, -36), { k: 0.28, hi: E(24, -50.6, 3.4, 1.4), lw: 1.3 });
  for (const [x, a, l] of [[21.6, -1.0, 13], [25.6, -0.75, 11]]) { g.save(); g.translate(x, -53); g.rotate(a); part(g, p => { p.moveTo(-2.2, 1); p.quadraticCurveTo(-2.6, -l * 0.6, 1.6, -l); p.quadraticCurveTo(0.6, -l * 0.5, 2.4, 1); p.closePath(); }, '#c9cfd6', P(0.6, -l, 3, -l, 3, 1, 1, 1), { k: 0.24, lw: 1.1 }); for (const k of [0.3, 0.55]) line(g, [-1.8, -l * k, 2, -l * k - 0.6], '#8a939c', 0.6); g.restore(); }
  path(g, p => { p.moveTo(32, -39); p.lineTo(40, -39.6); p.quadraticCurveTo(38, -35.4, 32.6, -36.2); p.closePath(); }, '#5a1f1c', INK, 0.9); for (const x of [34, 37.6]) poly(g, [x - 0.8, -39.2, x, -37.2, x + 0.8, -39.4], WHITE, INK, 0.5);
  ell(g, 40.6, -42.6, 1.1, 0.9, INK); g.globalAlpha = 0.6; for (const [x, y, r] of [[44, -44, 2.4], [47, -46, 1.8]]) ell(g, x, y, r, r, '#e9e2cf'); g.globalAlpha = 1;
  if (o.blink) line(g, [27, -47.4, 31.4, -47], INK, 1.5);
  else { path(g, p => { p.moveTo(26.6, -46.8); p.quadraticCurveTo(29.2, -50.4, 32.4, -47.4); p.quadraticCurveTo(29.4, -45.4, 26.6, -46.8); p.closePath(); }, FIRE2, INK, 0.9); ell(g, 29.6, -47.2, 0.8, 1.2, '#7a1f1c'); }
  line(g, [25.6, -50, 32, -49.2], INK, 1.4);
  for (const s of [0, 1]) curve(g, p => { p.moveTo(38 - s * 3, -38.6); p.quadraticCurveTo(41 - s * 3, -33, 37 - s * 4, -28); }, FIRE2, 1.2);   // 불수염
  g.restore();
}

// ───────── ⑧ 앙괭이 대장: 짚신 보따리를 멘 야광귀의 우두머리 / 구멍 촘촘한 체 ─────────
const ANG = { skin: '#a3a6ab', cloth: '#3a3550', hair: '#4a4a66', warts: true, item: strawShoes };
function shoeSack(g) {
  part(g, p => { p.moveTo(-6, -24); p.quadraticCurveTo(-22, -26, -21, -42); p.quadraticCurveTo(-18, -54, -6, -52); p.quadraticCurveTo(4, -50, 3, -38); p.quadraticCurveTo(2, -28, -6, -24); p.closePath(); }, '#c9b894', E(-4, -36, 8, 12), { k: 0.18, lw: 1.2 });
  for (const [x, y, a] of [[-15, -52, -0.6], [-8, -55, 0.1], [-1, -51, 0.6]]) { g.save(); g.translate(x, y); g.rotate(a); part(g, p => { p.moveTo(-2.6, 3); p.quadraticCurveTo(-3.4, -5, 0, -6.4); p.quadraticCurveTo(3.4, -5, 2.6, 3); p.closePath(); }, '#d9b77a', null, { lw: 0.9 }); for (const yy of [-3, 0]) line(g, [-2.2, yy, 2.2, yy], '#a8884a', 0.6); g.restore(); }
  rope(g, p => { p.moveTo(-12, -50); p.quadraticCurveTo(-4, -46, 4, -38); }, '#d9c39a', 1.2);
}
const anggwaeng = (g, o = {}) => { const q = Object.assign({}, ANG, o); shoeSack(g); dokkaebi(g, q, 'body'); dokkaebi(g, q, 'head'); };
export function sieve(g) {
  for (const x of [-15, 15]) { line(g, [x, 0, x * 0.4, -58], INK, 3.6); line(g, [x, 0, x * 0.4, -58], '#a9753f', 2); }
  line(g, [-9, -56, 9, -56], INK, 3.4); line(g, [-9, -56, 9, -56], '#a9753f', 1.8); rope(g, p => { p.moveTo(0, -56); p.lineTo(0, -47); }, '#d9c39a', 1);
  part(g, E(0, -32, 17, 17), '#c9a46a', E(4, -28, 15, 15), { k: 0.2, lw: 1.4 }); part(g, E(0, -32, 13.6, 13.6), '#efe3c4', null, { lw: 1 });
  g.save(); g.beginPath(); g.arc(0, -32, 13.2, 0, TAU); g.clip(); for (let i = -14; i <= 14; i += 2.6) { line(g, [i, -46, i, -18], '#a8884a', 0.6); line(g, [-14, -32 + i, 14, -32 + i], '#a8884a', 0.6); } g.restore();
  ell(g, 0, -32, 13.6, 13.6, null, '#8a6a3a', 1.2);
}

// ───────── ⑨ 용마: 물빛 비늘이 돋은 흰 말, 물결 갈기와 지느러미 꼬리 (안장 없음, 머리가 오른쪽) / 물회오리 ─────────
export function yongma(g, o = {}) {
  const C = '#e3ebee', D = '#3f7fb8', far = dk(C, 0.26), cd = dk(C, 0.3), hoof = '#2a2630';
  // 지느러미 꼬리
  part(g, p => { p.moveTo(-20.6, -31.4); p.bezierCurveTo(-34, -33, -38, -20, -32, -6); p.bezierCurveTo(-30, -14, -27, -20, -19.6, -25); p.closePath(); }, D, null, { lw: 1.1 });
  for (const k of [0.3, 0.6]) curve(g, p => { p.moveTo(-22 - k * 4, -30); p.bezierCurveTo(-30 - k * 2, -26, -32 + k * 2, -16, -30 + k * 3, -9); }, lt(D, 0.4), 0.8);
  const foreleg = (x, col) => { part(g, p => { p.moveTo(x - 2.8, -20); p.lineTo(x - 2.1, -11.4); p.quadraticCurveTo(x - 2.8, -9.6, x - 1.9, -8); p.lineTo(x - 1.7, -3.2); p.lineTo(x + 2.1, -3.2); p.lineTo(x + 2.2, -8); p.quadraticCurveTo(x + 3.1, -9.8, x + 2.3, -11.6); p.lineTo(x + 2.9, -20); p.closePath(); }, col, R(x + 0.4, -20, 3, 17), { lw: 1.1 }); rr(g, x - 2.2, -3.6, 4.6, 3.6, 1, hoof, INK, 0.9); for (const dy of [-12, -16]) curve(g, p => { p.moveTo(x - 1.6, dy); p.quadraticCurveTo(x, dy + 1.4, x + 1.8, dy); }, D, 0.6); };
  const hindleg = (x, col) => { part(g, p => { p.moveTo(x - 4.2, -22); p.quadraticCurveTo(x - 6.6, -13.6, x - 3, -10.6); p.lineTo(x - 2.4, -3.2); p.lineTo(x + 1.4, -3.2); p.lineTo(x + 1.2, -10.4); p.quadraticCurveTo(x + 3.4, -14, x + 4.2, -22); p.closePath(); }, col, R(x, -22, 4.4, 19), { lw: 1.1 }); rr(g, x - 2.8, -3.6, 4.6, 3.6, 1, hoof, INK, 0.9); };
  hindleg(-10.4, far); foreleg(15.2, far);
  part(g, p => { p.moveTo(-21.4, -27); p.bezierCurveTo(-22.6, -36, -12, -36.8, -4, -34.8); p.bezierCurveTo(2, -33.8, 6.6, -34.6, 9.6, -37.6); p.lineTo(17, -31); p.bezierCurveTo(19.6, -25.6, 17.6, -18.6, 12.6, -16.6); p.bezierCurveTo(4, -13.6, -8, -13.8, -16, -16.4); p.quadraticCurveTo(-21, -19, -21.4, -27); p.closePath(); }, C, P(-22, -24, 20, -24, 20, -12, -22, -12), { k: 0.24, hi: P(-18, -34, 6, -34, 6, -32, -18, -32), lw: 1.3 });
  for (let r = 0; r < 2; r++) for (let x = -16 + r * 3; x <= 8; x += 6) curve(g, p => { p.moveTo(x - 2.6, -27 + r * 5); p.quadraticCurveTo(x, -24.4 + r * 5, x + 2.6, -27 + r * 5); }, '#9ec3d8', 0.9);   // 물빛 비늘
  // 등의 작은 날개 (용마의 깃): 물결 무늬 깃 셋
  for (const [x, y, a] of [[-6, -36, -0.9], [-2, -37, -0.6], [2, -37.4, -0.3]]) { g.save(); g.translate(x, y); g.rotate(a); part(g, p => { p.moveTo(0, 0); p.quadraticCurveTo(-4, -8, 0, -15); p.quadraticCurveTo(3, -8, 2.6, 0); p.closePath(); }, '#cfe3ee', null, { lw: 0.9 }); g.restore(); }
  hindleg(-16, C); foreleg(9.4, C);
  part(g, p => { p.moveTo(7.6, -36.8); p.bezierCurveTo(10.6, -44, 13.6, -50, 18, -55.4); p.lineTo(24.4, -51); p.bezierCurveTo(22, -45, 21.6, -38, 18, -29.4); p.lineTo(9.6, -30.4); p.closePath(); }, C, P(17.6, -47, 26, -52, 22, -28, 13.6, -29), { lw: 0 });
  curve(g, p => { p.moveTo(23.6, -47.6); p.bezierCurveTo(21.8, -43, 21.2, -37, 18.4, -30.4); }, INK, 1.3);
  const head = p => { p.moveTo(17, -55.8); p.quadraticCurveTo(21.6, -58.4, 25.4, -54.6); p.lineTo(34.4, -43.6); p.quadraticCurveTo(37, -40.2, 34.8, -37.2); p.quadraticCurveTo(32.6, -35, 29.6, -36.4); p.quadraticCurveTo(26, -38.4, 24.2, -42.8); p.quadraticCurveTo(22.4, -46.8, 19, -47.8); p.closePath(); };
  part(g, head, C, P(24, -46, 38, -46, 38, -34, 22, -34), { k: 0.26, lw: 1.3 });
  part(g, P(19.6, -56.4, 21.2, -63.6, 23.6, -57.2), C, null, { lw: 1 });
  // 이마의 작은 뿔 하나와 수염
  g.save(); g.translate(22.4, -57.6); g.rotate(0.35); part(g, p => { p.moveTo(-1.4, 1); p.quadraticCurveTo(-1, -4, 0.6, -6.6); p.quadraticCurveTo(2, -3.6, 1.6, 1); p.closePath(); }, '#cfe3ee', null, { lw: 0.9 }); g.restore();
  curve(g, p => { p.moveTo(33.6, -38.6); p.quadraticCurveTo(36, -33, 33, -29); }, D, 1.1);
  if (o.blink) line(g, [24.6, -50.6, 27.4, -50.2], INK, 1.3); else { ell(g, 25.6, -50.2, 1.4, 1.6, '#1e1a22'); ell(g, 25.2, -50.8, 0.45, 0.45, '#fff'); }
  ell(g, 34.5, -40.6, 0.75, 1.15, INK);
  // 물결 갈기
  for (const [x, y, a] of [[18.6, -57, -0.5], [15.6, -52, -0.7], [13, -47, -0.8], [10.6, -42, -0.9], [8.6, -37.4, -1]]) { g.save(); g.translate(x, y); g.rotate(a); part(g, p => { p.moveTo(0, 0); p.quadraticCurveTo(-3.4, -5, -1, -10); p.quadraticCurveTo(-4.6, -4, 2.4, 1); p.closePath(); }, D, null, { lw: 1 }); curve(g, p => { p.moveTo(-0.6, -1); p.quadraticCurveTo(-2.4, -4.6, -1, -8); }, lt(D, 0.45), 0.6); g.restore(); }
}
export function whirl(g, o = {}) {
  g.globalAlpha = 0.3; ell(g, 0, -22, 15, 24, '#bfe3f2'); g.globalAlpha = 1;
  for (let i = 0; i < 5; i++) { const y = -4 - i * 9, w = 6 + i * 2.6; part(g, p => { p.ellipse(0, y, w, 3.6, 0, 0, TAU); }, i % 2 ? '#5f9fc8' : '#8fc3e0', null, { lw: 1 }); curve(g, p => { p.ellipse(0, y, w, 3.6, 0, Math.PI * 0.1, Math.PI * 0.9); }, '#eef8fc', 1); }
  for (const s of [-1, 1]) { if (o.blink) line(g, [s * 2.6 - 1.4, -30, s * 2.6 + 1.4, -30], INK, 1.2); else ell(g, s * 2.6, -30, 1.2, 1.5, '#123650'); }
  for (const [x, y] of [[-12, -38], [11, -30], [-9, -14], [12, -10]]) ell(g, x, y, 1.4, 1.8, '#bfe3f2', INK, 0.6);
}

// ───────── ⑩ 달걀귀신: 검은 두루마기에 눈·코·입 없는 매끈한 달걀 얼굴 (껍데기가 깨지면 속의 작은 얼굴이 내다본다) ─────────
const DGB = { robe: '#2e2d38', top: '#3a3946', git: '#55546a', collar: '#d9d4e2', cuff: '#d9d4e2', sash: '#55546a', hem: '#55546a', skin: '#e9e4f0', tatter: true, ghost: true };
export function dalgyal(g, o = {}) {
  doll(g, DGB, 'body');
  const crack = !!o.crack;
  part(g, p => { p.moveTo(0, -66); p.bezierCurveTo(11, -66, 14, -48, 12.6, -40); p.bezierCurveTo(11.4, -33, 6, -30.4, 0, -30.4); p.bezierCurveTo(-6, -30.4, -11.4, -33, -12.6, -40); p.bezierCurveTo(-14, -48, -11, -66, 0, -66); p.closePath(); }, '#f6f2e6', P(4, -68, 16, -68, 16, -28, 2, -28, 8, -44), { k: 0.12, hi: E(-5, -57, 3, 5), hic: '#ffffff', lw: 1.3 });
  if (crack) {
    path(g, p => { p.moveTo(-12, -46); p.lineTo(-7, -49); p.lineTo(-4, -45); p.lineTo(1, -50); p.lineTo(4, -46); p.lineTo(9, -50); p.lineTo(12.6, -46.6); p.lineTo(12.2, -40); p.quadraticCurveTo(0, -36, -12.4, -40); p.closePath(); }, '#2a2630', INK, 1);
    for (const s of [-1, 1]) { ell(g, s * 3.6, -42, 1.6, 1.9, '#f6f2e6'); ell(g, s * 3.6, -41.6, 0.8, 1.1, INK); }   // 속에서 내다보는 작은 눈
    curve(g, p => { p.moveTo(-6, -55); p.lineTo(-3, -52); p.lineTo(-5, -50); }, INK, 0.8); curve(g, p => { p.moveTo(6, -58); p.lineTo(4, -54); p.lineTo(6.6, -52); }, INK, 0.8);
  }
}

// ───────── ⑪ 강림 도령: 쪽빛 철릭에 전립, 붉은 포승줄 ─────────
function redRope(g) {   // 왼손에 감아 쥔 붉은 포승줄과 늘어뜨린 끝
  for (const r of [5.6, 4.2]) curve(g, p => p.ellipse(-HX, -15.6, r, r * 0.8, 0.2, 0, TAU), INK, 2.6);
  for (const r of [5.6, 4.2]) curve(g, p => p.ellipse(-HX, -15.6, r, r * 0.8, 0.2, 0, TAU), '#b8322a', 1.4);
  rope(g, p => { p.moveTo(-HX + 3, -12); p.quadraticCurveTo(-HX + 5, -4, -HX + 1, 1); }, '#b8322a', 1.2);
  rr(g, 10.6, -28.6, 7, 10, 0.8, '#8a2a26', INK, 0.8); rr(g, 12, -27, 4.2, 6.4, 0.5, '#f3ecdd', INK, 0.5);   // 허리에 찬 붉은 패
}
const GANGRIM = { robe: '#28304a', top: '#323a5a', git: '#8a2a26', collar: '#f3ecdd', cuff: '#8a2a26', sash: '#8a2a26', hem: '#8a2a26', legs: '#24283a', hat: 'jeonrip', skin: '#efd0a8', jaw: 'slim', brow: 'stern', eyes: 'sharp', mouth: 'flat', item: redRope };

// ───────── ⑫ 무장승: 삼베옷의 거인, 등에 진 지게와 나뭇단, 흰 수염 ─────────
function jige(g) {
  for (const x of [-12, 8]) { line(g, [x, -62, x - 2, -4], INK, 3.8); line(g, [x, -62, x - 2, -4], '#9a6a3c', 2.2); }
  for (const y of [-52, -40, -26]) { line(g, [-12.6, y, 8.6, y + 1], INK, 3.2); line(g, [-12.6, y, 8.6, y + 1], '#9a6a3c', 1.7); }
  for (let i = 0; i < 6; i++) { const y = -70 + i * 2.6; line(g, [-20 + (i % 2) * 2, y, 14 - (i % 3), y - 1], INK, 3.6); line(g, [-20 + (i % 2) * 2, y, 14 - (i % 3), y - 1], i % 2 ? '#8a6a44' : '#a9814f', 2.2); }   // 나뭇단
  rope(g, p => { p.moveTo(-14, -67); p.quadraticCurveTo(-3, -61, 12, -66); }, '#d9c39a', 1.1);
}
const MUJANG = { robe: '#cfc6b0', top: '#ddd4be', git: '#8a7a5a', legs: '#a89c84', bare: true, sash: '#5a4a3a', hem: '#a89c84', wrist: '#5a4a3a', skin: '#c48c68', hat: 'band', bandCol: '#5a4a3a', hair: '#e2ddd2', beard: 'long', beardCol: '#e2ddd2', jaw: 'square', brow: 'bushy', browCol: '#e2ddd2', eyes: 'glare', mouth: 'frown', lines: true, back: jige };

// ───────── 인형 등록 (sprites.js 의 LOOKS 에 합쳐진다) ─────────
const hold = (a, mode, x, y) => ({ x: x === undefined ? HX : x, y: y === undefined ? -18.4 : y, a, mode: mode || 'slash' });
export const ALT_LOOKS = {
  foxhalmi: { doll: HALMI, weapon: 'none', hold: hold(0, 'cast'), scale: 1.95, boss: true, h: 64 },
  oenun: { body: g => oenun(g), blinkBody: g => oenun(g, { blink: true }), weapon: 'ironclub', hold: hold(0.35, 'slash', 16.4, -21), h: 66, scale: 2.15, boss: true },
  duduri: { dok: DUDURI, weapon: 'goldclub', hold: hold(0.35, 'slash', 16.4, -21), h: 66, neck: 27, scale: 2.05, boss: true },
  dokbang: { body: dokbang, weapon: 'none', hold: hold(0, 'bite'), h: 70, scale: 1.3, still: true },
  bulgae: { body: g => bulgae(g), blinkBody: g => bulgae(g, { blink: true }), weapon: 'none', hold: hold(0, 'bite'), h: 56, w: 130, ox: 62, scale: 1.95, boss: true },
  jine: { body: g => jine(g), blinkBody: g => jine(g, { blink: true }), weapon: 'none', hold: hold(0, 'bite'), h: 64, w: 130, ox: 62, scale: 2.0, boss: true },
  toad: { body: g => toad(g), blinkBody: g => toad(g, { blink: true }), weapon: 'none', hold: hold(0, 'bite'), h: 26, scale: 1.5, still: true },
  daejeok: { body: g => daejeok(g), blinkBody: g => daejeok(g, { blink: true }), weapon: 'none', hold: hold(0, 'cast'), h: 66, scale: 2.2, boss: true },
  gangcheol: { body: g => gangcheol(g), blinkBody: g => gangcheol(g, { blink: true }), weapon: 'none', hold: hold(0, 'bite'), h: 58, w: 136, ox: 64, scale: 2.0, boss: true },
  anggwaeng: { body: g => anggwaeng(g), blinkBody: g => anggwaeng(g, { blink: true }), weapon: 'none', hold: hold(0, 'bite'), h: 60, scale: 1.85, boss: true },
  sieve: { body: sieve, weapon: 'none', hold: hold(0, 'bite'), h: 60, scale: 1.3, still: true },
  yongma: { body: g => yongma(g), blinkBody: g => yongma(g, { blink: true }), weapon: 'none', hold: hold(0, 'bite'), h: 62, w: 130, ox: 62, scale: 2.05, boss: true },
  whirl: { body: g => whirl(g), blinkBody: g => whirl(g, { blink: true }), weapon: 'none', hold: hold(0, 'none'), h: 46, float: true, border: '#e8f8fd', scale: 1.1 },
  dalgyal: { body: g => dalgyal(g), weapon: 'none', hold: hold(0, 'cast'), h: 68, scale: 2.1, boss: true, float: true },
  dalgyal_crack: { body: g => dalgyal(g, { crack: true }), weapon: 'none', hold: hold(0, 'cast'), h: 68, scale: 2.1, boss: true, float: true },
  gangrim: { doll: GANGRIM, weapon: 'none', hold: hold(0, 'cast'), scale: 1.95, boss: true, h: 64 },
  mujang: { doll: MUJANG, weapon: 'none', hold: hold(0, 'cast'), scale: 2.35, boss: true, h: 74 },
};
export const ALT_WEAPONS = { goldclub };
