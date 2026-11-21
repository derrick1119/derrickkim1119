// 영물과 짐승 요괴 그림: 해태·까치·삼족오·호랑이·삽살개, 장산범·불가사리·그슨대
// 네발짐승은 옆모습(오른쪽을 본다)에 얼굴만 앞을 보는 민화풍. 발이 원점(0,0), 위쪽이 -y
import { TAU, INK, RED, ell, rr, poly, line, path } from './draw.js';
import { WHITE, STEEL, dk, lt, E, R, P, part, curve, rope } from './figures.js';

const PI = Math.PI;
const GOLD = '#d6a640';
// 네발짐승의 다리 한 짝: 발가락 금이 난 두툼한 발
const paw = (g, x, top, col, sh, w = 3.2) => {
  part(g, p => { p.moveTo(x - w, top); p.lineTo(x - w + 0.6, -3.4); p.quadraticCurveTo(x - w - 0.4, 0.7, x + 0.8, 0.7); p.lineTo(x + w + 1, 0.7); p.quadraticCurveTo(x + w + 1.4, -2.8, x + w - 0.4, -3.6); p.lineTo(x + w + 0.2, top); p.closePath(); }, col, sh ? R(x + 0.6, top - 1, w + 2, -top + 2) : null, { lw: 1.1 });
  for (const dx of [1.1, 2.9]) line(g, [x + dx, -1.6, x + dx, 0.5], INK, 0.6);
};

// ───────── 호랑이 · 장산범 ─────────
// o.coat/belly/stripe/eye 로 빛깔을 바꾸고, o.shag 면 온몸에 긴 털이 늘어진다(장산범), o.roar 면 입을 벌린다
export function tiger(g, o = {}) {
  const C = o.coat || '#e39233', B = o.belly || '#f8ecd0', S = o.stripe || '#2b2228', far = dk(C, 0.3), eye = o.eye || '#f6c84a';
  // 꼬리: 위로 말아 올렸다
  rope(g, p => { p.moveTo(-19.6, -25); p.bezierCurveTo(-31, -24, -35.6, -36, -28.4, -45); }, C, 3.6);
  for (const [x, y, a] of [[-27, -28.4, 0.6], [-32, -35.6, 0.1], [-30.4, -42, -0.7]]) { g.save(); g.translate(x, y); g.rotate(a); rr(g, -2.5, -0.95, 5, 1.9, 0.8, S); g.restore(); }
  ell(g, -28, -45.6, 2.5, 2.7, S, INK, 0.9);
  paw(g, -12, -17, far); paw(g, 12.6, -17, far);
  // 몸통
  part(g, p => { p.moveTo(-21, -14); p.bezierCurveTo(-25, -24, -21, -33, -9, -33.6); p.bezierCurveTo(0, -34.6, 8, -35.6, 15, -33); p.bezierCurveTo(21, -29, 21, -19, 16, -12.6); p.bezierCurveTo(6, -8.6, -10, -8.4, -21, -14); p.closePath(); }, C, p => { p.moveTo(-24, -17.4); p.quadraticCurveTo(0, -12, 22, -18); p.lineTo(22, -6); p.lineTo(-24, -6); p.closePath(); }, { hi: E(-6, -31.4, 9, 1.8), hk: 0.2, lw: 1.3 });
  path(g, p => { p.moveTo(-14, -11.4); p.quadraticCurveTo(0, -8.8, 14, -12.2); p.quadraticCurveTo(0, -14.6, -14, -11.4); p.closePath(); }, B);
  if (!o.plain) for (const [x, w, h] of [[-16, 2.2, 9], [-10.4, 2.5, 11.4], [-4.4, 2.3, 10.4], [1.8, 2.5, 11], [7.8, 2.1, 9]]) path(g, p => { p.moveTo(x - w, -33.2); p.quadraticCurveTo(x + 0.7, -27, x - 0.4, -33.2 + h); p.quadraticCurveTo(x + w * 0.4, -28, x + w, -33.6); p.closePath(); }, S);
  if (o.shag) { // 배 아래로 길게 늘어진 흰 털
    part(g, p => { p.moveTo(-21, -15); for (let x = -19; x <= 15; x += 4.2) { p.lineTo(x, -3.6 - ((x * 7) % 3)); p.lineTo(x + 2.1, -11); } p.lineTo(17, -14); p.quadraticCurveTo(0, -9, -21, -15); p.closePath(); }, C, R(-22, -8, 42, 6), { k: 0.14, lw: 1 });
    for (const x of [-16, -8, 0, 8]) curve(g, p => { p.moveTo(x, -27); p.quadraticCurveTo(x - 2, -21, x - 0.6, -15); }, dk(C, 0.2), 0.8);
  }
  paw(g, -17, -17, C, true); paw(g, 7, -17, C, true);
  if (!o.plain) for (const [x, y] of [[-17, -11.4], [-17, -7.4], [7, -11.4], [7, -7.4]]) line(g, [x - 2.5, y, x + 1.6, y + 0.9], S, 1.2);
  // 귀
  for (const s of [-1, 1]) { part(g, p => { p.moveTo(24 + s * 4.6, -40.4); p.quadraticCurveTo(24 + s * 9.6, -48.4, 24 + s * 11.4, -38.4); p.closePath(); }, C, null, { lw: 1.1 }); path(g, p => { p.moveTo(24 + s * 6.4, -40.6); p.quadraticCurveTo(24 + s * 9.2, -45, 24 + s * 9.8, -39.6); p.closePath(); }, o.shag ? '#e8b4a8' : S); }
  // 머리: 볼털이 삐죽한 둥근 얼굴
  part(g, p => { p.moveTo(13, -31); p.quadraticCurveTo(12.6, -41.6, 24, -41.8); p.quadraticCurveTo(35.4, -41.6, 35, -31); p.lineTo(37.4, -27.4); p.lineTo(33.6, -26.4); p.lineTo(34.8, -22.4); p.lineTo(30, -22.2); p.quadraticCurveTo(24, -18, 18, -22.2); p.lineTo(13.2, -22.4); p.lineTo(14.4, -26.4); p.lineTo(10.6, -27.4); p.closePath(); }, C, P(27.6, -43, 39, -43, 39, -17, 24, -17, 30, -28), { k: 0.14, lw: 1.3 });
  if (o.shag && !o.calm) for (const x of [15, 19, 23, 27, 31]) part(g, P(x - 1.6, -22.6, x + 0.4, -13.4 - ((x * 3) % 4), x + 2, -22.6), C, null, { lw: 0.9 });
  // 이마의 석 줄 무늬와 볼의 줄무늬
  if (!o.plain) { for (const [y, h] of [[-40.2, 1.5], [-38.5, 2], [-36.8, 1.4]]) curve(g, p => { p.moveTo(24 - h, y - 0.3); p.quadraticCurveTo(24, y + 0.7, 24 + h, y - 0.3); }, S, 0.95); for (const s of [-1, 1]) for (const y of [-30.4, -27.6]) line(g, [24 + s * 10.4, y, 24 + s * 7, y + 0.8], S, 1.1); }
  // 흰 주둥이
  part(g, p => { p.moveTo(18, -27.6); p.quadraticCurveTo(24, -31.8, 30, -27.6); p.quadraticCurveTo(31, -21.6, 24, -20.4); p.quadraticCurveTo(17, -21.6, 18, -27.6); p.closePath(); }, B, null, { lw: 0.8 });
  // 치켜 올라간 눈
  for (const s of [-1, 1]) {
    const ix = 24 + s * 2, ox = 24 + s * 8.2;
    if (o.blink) curve(g, p => { p.moveTo(ix, -32.6); p.quadraticCurveTo(24 + s * 5, -32, ox, -34.8); }, INK, 1.4);
    else { path(g, p => { p.moveTo(ix, -32.2); p.quadraticCurveTo(24 + s * 4.6, -37.4, ox, -35.6); p.quadraticCurveTo(24 + s * 5.8, -30.6, ix, -32.2); p.closePath(); }, eye, INK, 1); ell(g, 24 + s * 5, -33.8, 0.8, 1.9, INK); }
    line(g, [24 + s * 1.2, -34.6, 24 + s * 9, -38.4], INK, 2);
  }
  path(g, P(22.5, -28.6, 25.5, -28.6, 24, -26.4), '#c9584a', INK, 0.7);
  if (o.roar) { part(g, p => { p.moveTo(20, -25.4); p.quadraticCurveTo(24, -27, 28, -25.4); p.quadraticCurveTo(27.4, -20.4, 24, -20.4); p.quadraticCurveTo(20.6, -20.4, 20, -25.4); p.closePath(); }, '#7a1f1c', null, { lw: 0.9 }); for (const s of [-1, 1]) poly(g, [24 + s * 3, -25.4, 24 + s * 2.2, -22.4, 24 + s * 1.4, -25.6], WHITE, INK, 0.5); }
  else { line(g, [24, -26.4, 24, -25], INK, 0.8); curve(g, p => { p.moveTo(19.8, -23.2); p.quadraticCurveTo(22, -25.4, 24, -25); p.quadraticCurveTo(26, -25.4, 28.2, -23.2); }, INK, 1); if (!o.calm) for (const s of [-1, 1]) poly(g, [24 + s * 3.2, -24.6, 24 + s * 2.5, -21.8, 24 + s * 1.7, -24.8], WHITE, INK, 0.5); }
  for (const s of [-1, 1]) for (const dy of [-0.6, 1.4]) line(g, [24 + s * 5.6, -25 + dy, 24 + s * 12.4, -25.6 + dy * 2.2], INK, 0.5);
}

// ───────── 해태 ─────────
// 흰 몸에 비늘, 쪽빛 갈기와 불꽃 꼬리, 이마의 외뿔, 목에 건 방울
export function haetae(g, o = {}) {
  const C = '#ece6d4', M = '#3f5f8a', far = dk(C, 0.26), sc = dk(C, 0.3);
  // 불꽃처럼 솟은 꼬리
  part(g, p => { p.moveTo(-19, -22); p.bezierCurveTo(-29, -24, -31.6, -32, -27.4, -38.6); p.quadraticCurveTo(-33.6, -41, -32.4, -48.6); p.quadraticCurveTo(-27.6, -44.6, -24.6, -46.6); p.quadraticCurveTo(-25.4, -52.6, -19.6, -55.4); p.quadraticCurveTo(-20, -48, -16.4, -43.6); p.quadraticCurveTo(-13.6, -36, -16.6, -29); p.closePath(); }, M, p => { p.moveTo(-22, -56); p.lineTo(-14, -56); p.lineTo(-14, -22); p.lineTo(-22, -22); p.quadraticCurveTo(-18, -38, -22, -56); p.closePath(); }, { hi: P(-28.6, -40, -26.6, -32, -25, -39), lw: 1.2 });
  for (const [x0, y0, x1, y1] of [[-24, -30, -21.6, -40], [-20.4, -32, -19.4, -46]]) curve(g, p => { p.moveTo(x0, y0); p.quadraticCurveTo(x0 + 3, (y0 + y1) / 2, x1, y1); }, lt(M, 0.34), 0.9);
  paw(g, -11.6, -17, far, false, 3.8); paw(g, 13, -17, far, false, 3.8);
  // 몸통: 가슴이 떡 벌어졌다
  part(g, p => { p.moveTo(-21.6, -13.6); p.bezierCurveTo(-25.6, -24, -21.6, -33.6, -9, -34.6); p.bezierCurveTo(0, -35.6, 9, -37, 16, -34); p.bezierCurveTo(22.6, -29.6, 22, -18, 16.6, -12); p.bezierCurveTo(6, -8, -10, -8, -21.6, -13.6); p.closePath(); }, C, p => { p.moveTo(-25, -17); p.quadraticCurveTo(0, -11.6, 23, -18); p.lineTo(23, -6); p.lineTo(-25, -6); p.closePath(); }, { hi: E(-6, -32, 9.6, 1.9), hk: 0.3, lw: 1.3 });
  // 비늘: 줄을 엇갈려 반달로
  for (let r = 0; r < 3; r++) for (let x = -16 + (r % 2) * 2.6; x <= 8; x += 5.2) curve(g, p => p.arc(x, -30 + r * 5, 2.7, 0.12 * PI, 0.88 * PI), sc, 0.8);
  paw(g, -17, -17, C, true, 3.8); paw(g, 7, -17, C, true, 3.8);
  // 다리의 불꽃 털
  for (const x of [-17, 7]) part(g, p => { p.moveTo(x - 3.6, -16); p.quadraticCurveTo(x - 9, -17, x - 9.6, -23.6); p.quadraticCurveTo(x - 6.4, -21.4, x - 5.4, -23.6); p.quadraticCurveTo(x - 4.6, -19.6, x - 2.6, -19); p.closePath(); }, M, null, { lw: 1 });
  // 갈기: 얼굴을 둘러싼 고사리 무늬
  for (let i = 0; i < 9; i++) { const a = PI * 0.72 + i / 8 * PI * 1.56, x = 24.4 + Math.cos(a) * 11.6, y = -31 + Math.sin(a) * 11; part(g, E(x, y, 4.3, 4.3), M, E(x + 1.5, y + 1.5, 3.6, 3.6), { lw: 1.1 }); curve(g, p => p.arc(x, y, 2, a - 0.3, a + 2.6), lt(M, 0.36), 0.8); }
  // 외뿔
  part(g, p => { p.moveTo(21.6, -41); p.quadraticCurveTo(21.4, -50, 25.4, -55.4); p.quadraticCurveTo(28, -48.6, 27.2, -41); p.closePath(); }, '#f0dca0', P(25, -56, 29, -56, 29, -40, 25.6, -40), { k: 0.2, lw: 1 }); for (const y of [-45, -48.6]) line(g, [22.4, y, 26.8, y - 0.9], GOLD, 0.8);
  // 얼굴
  part(g, p => { p.moveTo(14.4, -31.4); p.bezierCurveTo(14, -41.4, 34.8, -41.4, 34.4, -31.4); p.bezierCurveTo(35, -24.4, 30, -20.6, 24.4, -20.6); p.bezierCurveTo(18.8, -20.6, 13.8, -24.4, 14.4, -31.4); p.closePath(); }, C, P(27.6, -43, 37, -43, 37, -19, 24, -19, 30, -28), { k: 0.16, lw: 1.3 });
  for (const s of [-1, 1]) {
    const ex = 24.4 + s * 4.6;
    // 굵은 눈썹과 부리부리한 눈
    part(g, p => { p.moveTo(24.4 + s * 1, -36); p.quadraticCurveTo(ex, -40.6, 24.4 + s * 9, -37.4); p.quadraticCurveTo(ex, -37.6, 24.4 + s * 1, -34.8); p.closePath(); }, M, null, { lw: 0.8 });
    if (o.blink) curve(g, p => { p.moveTo(ex - 2.6, -33); p.quadraticCurveTo(ex, -31.4, ex + 2.6, -33); }, INK, 1.4); else { ell(g, ex, -33.2, 2.7, 2.6, '#fffdf2', INK, 0.9); ell(g, ex + 0.3, -33, 1.3, 1.4, '#1c1a22'); ell(g, ex - 0.2, -33.6, 0.4, 0.4, '#fff'); }
  }
  // 넓적한 코와 이를 드러낸 입
  part(g, E(24.4, -28.6, 3.4, 2.1), '#c9a48a', E(25.2, -28, 2.8, 1.6), { lw: 0.9 }); for (const s of [-1, 1]) ell(g, 24.4 + s * 1.5, -28.4, 0.6, 0.75, INK);
  part(g, p => { p.moveTo(18, -26); p.quadraticCurveTo(24.4, -24.4, 30.8, -26); p.quadraticCurveTo(29.4, -21.6, 24.4, -21.6); p.quadraticCurveTo(19.4, -21.6, 18, -26); p.closePath(); }, '#8a2a26', null, { lw: 1 });
  path(g, p => { p.moveTo(19.4, -25.6); p.quadraticCurveTo(24.4, -24.2, 29.4, -25.6); p.lineTo(28.8, -23.8); p.quadraticCurveTo(24.4, -22.6, 20, -23.8); p.closePath(); }, WHITE, INK, 0.55); for (const x of [22, 24.4, 26.8]) line(g, [x, -24.8, x, -23.2], INK, 0.45);
  for (const s of [-1, 1]) poly(g, [24.4 + s * 5.4, -25.6, 24.4 + s * 4.6, -21.8, 24.4 + s * 3.6, -25.4], WHITE, INK, 0.6);
  // 붉은 목줄과 방울
  rope(g, p => { p.moveTo(12.6, -24.6); p.quadraticCurveTo(15.6, -17.4, 22.4, -17); }, RED, 1.6); part(g, E(17.2, -15.6, 3.1, 3.1), GOLD, E(18.2, -14.6, 2.6, 2.6), { hi: E(16.2, -16.8, 1, 0.7), lw: 1 }); line(g, [15.4, -14.8, 19, -14.8], '#8a5f1c', 0.8); ell(g, 17.2, -13.6, 0.6, 0.6, '#8a5f1c');
}

// ───────── 삽살개 ─────────
// 눈을 덮은 긴 털, 등 위로 말아 올린 꼬리
export function sapsal(g, o = {}) {
  const C = '#e3d6b8', D = '#b89f76', far = dk(C, 0.26);
  // 꼬리
  part(g, p => { p.moveTo(-13, -20); p.bezierCurveTo(-22, -22, -22.6, -33, -14.6, -34); p.quadraticCurveTo(-9.4, -33.6, -9.6, -29.6); p.quadraticCurveTo(-13.6, -30.6, -14.6, -27.4); p.quadraticCurveTo(-13.6, -24, -9.6, -24); p.closePath(); }, C, P(-14, -35, -8, -35, -8, -22, -12, -22), { k: 0.18, lw: 1.1 });
  for (const x of [-9.4, 9]) part(g, P(x - 2.6, -10, x - 3, 0.6, x + 3.4, 0.6, x + 2.8, -10), far, null, { lw: 1 });
  // 몸통: 아래로 털이 삐죽삐죽 늘어졌다
  part(g, p => { p.moveTo(-15.6, -11); p.bezierCurveTo(-18.6, -19, -14.6, -24.6, -5, -25); p.bezierCurveTo(2, -25.4, 8, -25.4, 12.6, -22.6); p.lineTo(13.6, -9.6); p.lineTo(10.6, -6); p.lineTo(8.4, -9.4); p.lineTo(5.6, -5.4); p.lineTo(3, -9.4); p.lineTo(0, -5); p.lineTo(-3, -9.4); p.lineTo(-6, -5.4); p.lineTo(-8.6, -9.6); p.lineTo(-12, -6); p.closePath(); }, C, p => { p.moveTo(-18, -13.6); p.quadraticCurveTo(0, -9.6, 15, -13.6); p.lineTo(15, -4); p.lineTo(-18, -4); p.closePath(); }, { hi: E(-3, -23.4, 7, 1.5), hk: 0.3, lw: 1.2 });
  for (const [x, y] of [[-10, -20], [-4, -17], [3, -20], [8, -16], [-7, -14]]) curve(g, p => { p.moveTo(x, y); p.quadraticCurveTo(x + 1.2, y + 3, x - 0.4, y + 5.6); }, D, 0.8);
  for (const x of [-13.4, 5]) { part(g, p => { p.moveTo(x - 2.8, -10); p.lineTo(x - 3.4, -1.6); p.quadraticCurveTo(x - 3.6, 0.7, x, 0.7); p.lineTo(x + 3.8, 0.7); p.quadraticCurveTo(x + 4, -1.6, x + 2.8, -2.4); p.lineTo(x + 3, -10); p.closePath(); }, C, R(x + 0.6, -11, 4, 12), { lw: 1 }); line(g, [x + 1.4, -1.2, x + 1.4, 0.5], INK, 0.5); }
  // 축 늘어진 귀와 털에 덮인 얼굴
  part(g, p => { p.moveTo(8.6, -28.6); p.quadraticCurveTo(4.4, -27, 5, -19.6); p.quadraticCurveTo(7.4, -17, 9.6, -20); p.closePath(); }, D, null, { lw: 1 });
  part(g, p => { p.moveTo(8.4, -22); p.bezierCurveTo(7.4, -31.6, 24.6, -32.6, 25, -23.6); p.lineTo(26.4, -18.6); p.lineTo(23.6, -19); p.lineTo(23.4, -14.4); p.lineTo(20.4, -16.6); p.lineTo(18.6, -12.6); p.lineTo(16, -16.4); p.lineTo(13, -13.4); p.lineTo(11.6, -17); p.lineTo(8.4, -15.6); p.closePath(); }, C, P(19, -33, 27, -33, 27, -12, 16, -12, 21, -22), { k: 0.16, lw: 1.2 });
  part(g, p => { p.moveTo(23.6, -29); p.quadraticCurveTo(27.6, -27.4, 26.4, -20); p.quadraticCurveTo(24, -18.6, 22.6, -21.6); p.closePath(); }, D, null, { lw: 1 });
  // 눈을 덮은 앞머리: 털 사이로 눈이 살짝 보인다
  if (!o.blink) for (const x of [13.4, 19.4]) ell(g, x, -23.4, 0.9, 1.1, '#1c1a22');
  for (const x of [10.6, 13.6, 16.6, 19.6, 22.4]) part(g, P(x - 1.7, -28.4, x - 0.6, -22.4 - ((x * 5) % 2), x + 1.6, -28.6), C, null, { lw: 0.8 });
  part(g, E(16.6, -19.4, 1.9, 1.4), '#2a2228', null, { lw: 0.6 }); ell(g, 16.1, -19.8, 0.5, 0.35, '#8a8794');
  part(g, p => { p.moveTo(15, -17); p.quadraticCurveTo(16.6, -13.6, 18.2, -17); p.closePath(); }, '#d9695a', null, { lw: 0.7 });
}

// ───────── 까치 (날아가는 옆모습) ─────────
export function magpie(g) {
  const K = '#23232e', G = '#2f4a6f';
  // 긴 꽁지
  part(g, P(-7, -27.4, -25.6, -32.6, -27, -29, -24.4, -27.6, -26, -25, -7, -23.4), K, P(-26, -28, -7, -25, -7, -23, -26, -24.6), { shc: G, lw: 1 });
  // 치켜든 날개: 끝 깃이 희다
  part(g, P(-4, -29.6, -8.6, -39.6, -13.4, -47.6, -7, -45, -4.4, -49.6, -0.6, -44, 2.4, -46.6, 4.4, -39.6, 5.6, -30), K, null, { lw: 1.1 });
  path(g, P(-6.4, -39.6, -10.4, -45.6, -6.6, -43.4, -4.4, -46.6, -1.6, -41.6, 1.6, -43.6, 2.6, -37.4), WHITE, INK, 0.6); line(g, [-3, -31.6, -1, -38], G, 1);
  // 몸: 검은 등, 흰 배
  part(g, p => { p.moveTo(-9, -25.4); p.quadraticCurveTo(-6, -32.4, 3, -31.4); p.quadraticCurveTo(9.6, -30.4, 10.4, -26); p.quadraticCurveTo(8, -20.6, 0, -20.2); p.quadraticCurveTo(-7, -20.6, -9, -25.4); p.closePath(); }, K, null, { hi: E(-1, -29.6, 5, 1.2), hic: G, lw: 1.1 });
  part(g, p => { p.moveTo(-6.4, -23); p.quadraticCurveTo(1, -19.4, 8.6, -23.6); p.quadraticCurveTo(2, -26, -6.4, -23); p.closePath(); }, WHITE, null, { lw: 0.7 });
  path(g, E(-1.4, -27.6, 3.4, 1.7, 0.3), WHITE, INK, 0.6);
  // 머리와 부리
  part(g, E(11.4, -29.6, 4.7, 4.5), K, E(12.6, -28.4, 4, 3.8), { shc: '#15151c', lw: 1.1 });
  poly(g, [15.4, -31, 21.6, -29, 15.4, -27.6], '#3a3a44', INK, 0.8);
  ell(g, 12.8, -30.4, 1.25, 1.25, '#f6f1e6', INK, 0.5); ell(g, 13.1, -30.3, 0.6, 0.6, '#15121a');
  for (const x of [-1, 2]) line(g, [x, -20.6, x - 1.6, -18], '#3a3a44', 0.9);
}

// ───────── 삼족오: 해를 등진 세 발 까마귀 ─────────
export function samjoko(g) {
  const K = '#1f1c26', G = '#3a3560', SUN = '#f0a53a';
  // 해와 그 둘레의 불꽃
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + 0.3; g.save(); g.translate(Math.cos(a) * 14.6, -30 + Math.sin(a) * 14.6); g.rotate(a + PI / 2); part(g, p => { p.moveTo(-2.4, 1); p.quadraticCurveTo(-2.2, -3.6, 1.4, -6.6); p.quadraticCurveTo(0.6, -3, 2.6, 1); p.closePath(); }, '#e0503f', null, { lw: 0.9 }); g.restore(); }
  part(g, E(0, -30, 14, 14), SUN, E(3.4, -26.6, 12.4, 12.4), { k: 0.14, hi: E(-5, -37, 5, 2.6), hic: '#fbe08a', lw: 1.3 }); curve(g, p => p.arc(0, -30, 11.4, 0, TAU), '#fbd98a', 0.9);
  // 꽁지깃
  for (const [x, a] of [[-5, 0.5], [-1.6, 0.14], [1.8, -0.2]]) { g.save(); g.translate(x, -24); g.rotate(a); part(g, P(-1.5, 0, -2.2, 8.6, 0, 10.4, 2.2, 8.6, 1.5, 0), K, null, { lw: 0.9 }); g.restore(); }
  // 양 날개
  for (const s of [-1, 1]) part(g, p => { p.moveTo(s * 2, -33.6); p.lineTo(s * 12, -43.6); p.lineTo(s * 19.6, -41.6); p.lineTo(s * 15.4, -38.6); p.lineTo(s * 19.4, -35.4); p.lineTo(s * 14, -33.6); p.lineTo(s * 16.4, -29.6); p.lineTo(s * 10, -29.4); p.lineTo(s * 3.6, -25.6); p.closePath(); }, K, s > 0 ? P(9, -44, 21, -44, 21, -28, 9, -28) : null, { shc: '#12101a', lw: 1.1 });
  for (const s of [-1, 1]) for (const [x, y] of [[8, -37.6], [10.4, -33.4]]) line(g, [s * 4, y + 4, s * x, y], G, 0.9);
  // 몸과 머리
  part(g, E(0, -28.6, 5.4, 7.4), K, E(1.6, -27, 4.4, 6.4), { shc: '#12101a', hi: E(-1.6, -32, 1.6, 2.6), hic: G, lw: 1.1 });
  part(g, E(2.6, -38, 4.3, 4.1), K, E(3.8, -37, 3.6, 3.4), { shc: '#12101a', lw: 1.1 });
  // 볏: 뒤로 말린 깃 하나
  curve(g, p => { p.moveTo(0.6, -41.4); p.quadraticCurveTo(-4.6, -46.6, -7.6, -42.4); p.quadraticCurveTo(-5.6, -42.6, -5, -41); }, INK, 2.4); curve(g, p => { p.moveTo(0.6, -41.4); p.quadraticCurveTo(-4.6, -46.6, -7.6, -42.4); p.quadraticCurveTo(-5.6, -42.6, -5, -41); }, K, 1.2);
  poly(g, [6, -39.6, 13, -37.8, 6, -36], GOLD, INK, 0.8); line(g, [6.4, -37.8, 11, -37.8], '#8a5f1c', 0.5);
  ell(g, 3.8, -38.6, 1.15, 1.15, '#e0503f', INK, 0.5); ell(g, 3.5, -38.9, 0.36, 0.36, '#fff');
  // 세 발
  for (const x of [-2.6, 0, 2.6]) { line(g, [x * 0.6, -21.6, x, -15.6], INK, 1.9); line(g, [x * 0.6, -21.6, x, -15.6], GOLD, 0.9); for (const dx of [-1.5, 0, 1.5]) line(g, [x, -15.6, x + dx, -13.6], GOLD, 0.8); }
}

// ───────── 불가사리: 쇠를 먹는 짐승 ─────────
// 곰 같은 몸에 코끼리 코, 등에는 쇠 바늘이 돋고 살갗 틈으로 불빛이 샌다
export function bulgasari(g, o = {}) {
  const C = '#5f5e70', D = '#3a3946', rust = '#9a6248', far = dk(C, 0.3);
  // 소 꼬리
  rope(g, p => { p.moveTo(-22, -27); p.quadraticCurveTo(-30, -24, -28.6, -13.6); }, C, 1.6); part(g, P(-30.6, -14.6, -26.6, -14.6, -27.6, -7.6, -29.8, -7.6), D, null, { lw: 0.9 });
  paw(g, -12, -18, far, false, 4.2); paw(g, 12, -18, far, false, 4.2);
  // 등에 돋은 쇠 바늘
  for (const [x, h, a] of [[-17, 9, -0.5], [-11, 12, -0.3], [-4.6, 13.4, -0.1], [2, 12.6, 0.1], [8.4, 10.6, 0.3], [14, 8, 0.5]]) { g.save(); g.translate(x, -36 + Math.abs(x) * 0.12); g.rotate(a); part(g, P(-2.4, 2, 0, -h, 2.4, 2), STEEL, P(0.4, -h, 3, 2, 0.6, 2), { k: 0.24, lw: 1 }); g.restore(); }
  // 몸통
  part(g, p => { p.moveTo(-23, -14); p.bezierCurveTo(-27.6, -26, -22, -37.6, -8, -38.4); p.bezierCurveTo(2, -39.4, 12, -39, 18, -34); p.bezierCurveTo(23.6, -28.6, 22.6, -17, 17, -11.6); p.bezierCurveTo(6, -7.4, -11, -7.6, -23, -14); p.closePath(); }, C, p => { p.moveTo(-27, -18); p.quadraticCurveTo(0, -12, 24, -19); p.lineTo(24, -5); p.lineTo(-27, -5); p.closePath(); }, { hi: E(-6, -35.4, 10.6, 2), hk: 0.24, lw: 1.3 });
  path(g, p => { p.moveTo(-15, -11.4); p.quadraticCurveTo(0, -8, 14, -12); p.quadraticCurveTo(0, -15, -15, -11.4); p.closePath(); }, rust);
  // 살갗의 쇠 비늘과 틈으로 새는 불빛
  for (let r = 0; r < 3; r++) for (let x = -17 + (r % 2) * 3; x <= 11; x += 6) part(g, P(x - 2.6, -32 + r * 6, x + 2.6, -32 + r * 6, x + 3.2, -28.6 + r * 6, x, -26.4 + r * 6, x - 3.2, -28.6 + r * 6), lt(C, 0.14), P(x, -32 + r * 6, x + 3.4, -32 + r * 6, x + 3.4, -26 + r * 6, x, -26 + r * 6), { k: 0.24, lw: 0.8 });
  for (const [x0, y0, x1, y1, x2, y2] of [[-19, -22, -15.6, -19, -17.6, -15], [-2, -14.6, 1.6, -17.6, 4.6, -14], [12.6, -27, 15.6, -23, 13.6, -19]]) { curve(g, p => { p.moveTo(x0, y0); p.lineTo(x1, y1); p.lineTo(x2, y2); }, '#ff9a2e', 1.5); curve(g, p => { p.moveTo(x0, y0); p.lineTo(x1, y1); p.lineTo(x2, y2); }, '#ffe08a', 0.6); }
  paw(g, -18, -18, C, true, 4.2); paw(g, 6, -18, C, true, 4.2);
  for (const x of [-18, 6]) for (const dx of [-2.6, 0.2, 3]) poly(g, [x + dx, 0.6, x + dx + 0.9, 3, x + dx + 1.8, 0.6], STEEL, INK, 0.5);
  // 소 귀와 머리
  part(g, p => { p.moveTo(17, -40); p.quadraticCurveTo(10.6, -46, 9.6, -38.6); p.quadraticCurveTo(13, -37, 16.6, -36.6); p.closePath(); }, C, null, { lw: 1.1 });
  part(g, p => { p.moveTo(14, -34); p.bezierCurveTo(14, -44, 33.6, -44.6, 34, -33.6); p.bezierCurveTo(34.4, -27.6, 30, -24, 24, -24); p.bezierCurveTo(18, -24, 14, -27.6, 14, -34); p.closePath(); }, C, P(27, -46, 36, -46, 36, -22, 23, -22, 29, -31), { k: 0.2, lw: 1.3 });
  // 코끼리 코: 아래로 늘어뜨렸다가 끝을 말아 올렸다
  part(g, p => { p.moveTo(20.6, -30); p.bezierCurveTo(20, -21, 22.6, -14.6, 28.6, -12.6); p.bezierCurveTo(33.6, -11.6, 35, -16.6, 31.6, -18.6); p.bezierCurveTo(30.6, -16, 28, -16.4, 27.4, -19.6); p.bezierCurveTo(26.6, -23.6, 27.6, -27, 27.4, -30); p.closePath(); }, C, p => { p.moveTo(24.6, -31); p.lineTo(36, -31); p.lineTo(36, -11); p.lineTo(26, -11); p.quadraticCurveTo(23.6, -20, 24.6, -31); p.closePath(); }, { k: 0.2, lw: 1.2 });
  for (const y of [-26.4, -23, -19.6]) curve(g, p => { p.moveTo(21, y); p.quadraticCurveTo(24, y + 1.4, 27.2, y + 0.4); }, D, 0.8);
  for (const s of [-1, 1]) part(g, p => { p.moveTo(24 + s * 5, -28.6); p.quadraticCurveTo(24 + s * 10.6, -26, 24 + s * 9.6, -20); p.quadraticCurveTo(24 + s * 6.6, -23.6, 24 + s * 4, -25.6); p.closePath(); }, '#f3e7c8', null, { lw: 0.9 });
  // 이글거리는 눈
  for (const s of [-1, 1]) { const ex = 24 + s * 5.2; if (o.blink) line(g, [ex - 2, -35, ex + 2, -35.4], INK, 1.4); else { path(g, p => { p.moveTo(ex - 2.6, -34.6); p.quadraticCurveTo(ex, -38, ex + 2.6, -35); p.quadraticCurveTo(ex, -33, ex - 2.6, -34.6); p.closePath(); }, '#ffb03a', INK, 0.9); ell(g, ex, -35.2, 0.8, 1.2, '#7a1f1c'); } line(g, [24 + s * 1.6, -37.6, 24 + s * 8.6, -39.4], INK, 1.6); }
}

// ───────── 그슨대: 올려다볼수록 커지는 그림자 ─────────
export function geuseundae(g) {
  const D = '#262234', M = '#6a62a0';
  g.globalAlpha = 0.3; ell(g, 0, -2, 13, 4.6, '#5a4f86'); g.globalAlpha = 1;
  // 땅까지 끌리는 긴 팔과 손가락
  for (const s of [-1, 1]) { rope(g, p => { p.moveTo(s * 5.6, -47); p.bezierCurveTo(s * 15.6, -44, s * 14, -24, s * 15.6, -9.6); }, D, 3.2); for (const dx of [-2.4, 0, 2.4]) { line(g, [s * 15.6 + dx * 0.5, -10, s * 15.6 + dx * 1.5, -1.6], INK, 2); line(g, [s * 15.6 + dx * 0.5, -10, s * 15.6 + dx * 1.5, -1.6], D, 0.9); } }
  // 길쭉한 몸: 아래는 연기처럼 풀어진다
  part(g, p => { p.moveTo(-8.6, -1); p.lineTo(-6.4, -6.6); p.lineTo(-4, -0.4); p.lineTo(-1.6, -6); p.lineTo(1, 0.4); p.lineTo(3.4, -6); p.lineTo(5.6, -0.6); p.lineTo(8.6, -6.6); p.bezierCurveTo(9.6, -30, 8, -44, 6.4, -52); p.quadraticCurveTo(0, -56.6, -6.4, -52); p.bezierCurveTo(-8, -44, -10.6, -30, -8.6, -1); p.closePath(); }, D, P(2, -58, 11, -58, 11, 1, 3, 1), { shc: '#15121c', hi: P(-7.4, -50, -5.6, -50, -7.6, -8, -9, -8), hic: M, lw: 1.3 });
  for (const y of [-14, -24, -34]) curve(g, p => { p.moveTo(-6, y); p.quadraticCurveTo(0, y - 6, 6.4, y); }, M, 1.2);
  // 헝클어진 머리와 작은 머리통
  part(g, p => { p.moveTo(-7, -54); p.lineTo(-10.6, -61.6); p.lineTo(-6, -60); p.lineTo(-6.4, -68.6); p.lineTo(-2.4, -63.6); p.lineTo(0.4, -70.6); p.lineTo(3, -63.4); p.lineTo(7.4, -67); p.lineTo(6.6, -60); p.lineTo(10.6, -60.6); p.lineTo(7, -54); p.quadraticCurveTo(0, -50, -7, -54); p.closePath(); }, D, P(2, -71, 11, -71, 11, -52, 3, -52), { shc: '#15121c', lw: 1.2 });
  part(g, p => { p.moveTo(-5.6, -58); p.quadraticCurveTo(-5.6, -63.6, 0, -63.6); p.quadraticCurveTo(5.6, -63.6, 5.6, -58); p.quadraticCurveTo(4.6, -51.6, 0, -51); p.quadraticCurveTo(-4.6, -51.6, -5.6, -58); p.closePath(); }, '#2e2a3c', P(2, -64, 6, -64, 6, -50, 0.6, -50, 3.6, -56), { shc: '#1c1826', lw: 1 });
  // 뻥 뚫린 흰 눈과 세로로 찢어진 입
  for (const s of [-1, 1]) { g.globalAlpha = 0.4; ell(g, s * 2.6, -58.6, 3.2, 3.4, '#cfe6f0'); g.globalAlpha = 1; ell(g, s * 2.6, -58.6, 2, 2.3, '#f6fbfc', INK, 0.7); ell(g, s * 2.6, -58.2, 0.55, 0.8, '#211e2b'); }
  part(g, E(0, -54, 1.1, 2), '#0e0c14', null, { lw: 0.6 });
}

// ───────── 도깨비가 든 것 ─────────
// 야광귀가 훔쳐 든 짚신 한 켤레
export function strawShoes(g) {
  const S = '#d9b96a';
  rope(g, p => { p.moveTo(-16.4, -19); p.lineTo(-18.6, -12.6); }, '#8a6a3c', 0.9);
  for (const [x, y, a] of [[-21.6, -9, 0.3], [-15.6, -8.6, -0.25]]) { g.save(); g.translate(x, y); g.rotate(a); part(g, E(0, 0, 3.3, 5.6), S, E(1.1, 1, 2.6, 4.8), { k: 0.2, lw: 1 }); for (const yy of [-2.6, 0, 2.6]) line(g, [-2.6, yy, 2.6, yy], '#a8873f', 0.7); curve(g, p => { p.moveTo(-2.4, -3.4); p.quadraticCurveTo(0, -6.6, 2.4, -3.4); }, '#8a6a3c', 0.9); g.restore(); }
}
