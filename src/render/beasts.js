// 영물과 짐승 요괴 그림: 해태·까치·삼족오·호랑이·삽살개, 장산범·불가사리·그슨대
// 그리고 새 요괴: 물귀신·달걀귀신·아귀·영노·묘두사·왕지네·강철이·밤박쥐 (사람꼴인 손각시·창귀·여우 할미·감투 도깨비의 소품도)
// 네발짐승은 옆모습(오른쪽을 본다)에 얼굴만 앞을 보는 민화풍. 발이 원점(0,0), 위쪽이 -y
import { TAU, INK, RED, ell, rr, poly, line, path } from './draw.js';
import { WHITE, STEEL, HX, HATS, dk, lt, E, R, P, part, curve, rope } from './figures.js';

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
  // 몸통: 어깨가 솟고 허리가 잘록한 범의 몸 (ky·dy: 엎드리면 몸을 낮고 길게 — 그림을 눌러 찌그러뜨리지 않고 모양을 새로 잡는다)
  const body = (ky = 1, dy = 0) => {
  const Y = y => y * ky + dy;
  part(g, p => { p.moveTo(-21.4, Y(-15)); p.bezierCurveTo(-25.4, Y(-22), -24.4, Y(-31.6), -14, Y(-33.8)); p.bezierCurveTo(-7, Y(-34.8), -1, Y(-33), 4, Y(-34.4)); p.bezierCurveTo(9, Y(-36.8), 15, Y(-36.2), 17.6, Y(-32)); p.bezierCurveTo(21, Y(-27), 20.6, Y(-18), 16.4, Y(-13)); p.bezierCurveTo(10, Y(-9.6), 2, Y(-10.4), -4, Y(-11.6)); p.bezierCurveTo(-9, Y(-12.6), -13, Y(-11.4), -16, Y(-12)); p.quadraticCurveTo(-20, Y(-12.4), -21.4, Y(-15)); p.closePath(); },
    C, p => { p.moveTo(-26, Y(-19)); p.bezierCurveTo(-10, Y(-14.6), 6, Y(-15.4), 22, Y(-20)); p.lineTo(22, Y(-6)); p.lineTo(-26, Y(-6)); p.closePath(); }, { hi: p => { p.moveTo(-18, Y(-32.4)); p.bezierCurveTo(-8, Y(-34), 4, Y(-32), 13, Y(-35)); p.lineTo(13, Y(-33)); p.bezierCurveTo(4, Y(-30), -8, Y(-31.6), -18, Y(-30)); p.closePath(); }, hk: 0.24, lw: 1.3 });
  // 흰 배털: 아래 가장자리를 따라 털끝이 삐죽하다
  path(g, p => { p.moveTo(-15, Y(-12.4)); p.lineTo(-12.6, Y(-10.6)); p.lineTo(-10.4, Y(-12)); p.bezierCurveTo(-4, Y(-11), 4, Y(-9.4), 9.6, Y(-10.4)); p.lineTo(12, Y(-9)); p.lineTo(13.6, Y(-11.4)); p.lineTo(16, Y(-13.4)); p.bezierCurveTo(8, Y(-14.2), -6, Y(-14.6), -15, Y(-12.4)); p.closePath(); }, B);
  // 줄무늬: 등에서 배로 휘어 내리며 가늘어지는 붓 자국, 몇 줄은 끝이 두 갈래로 갈라진다 (어깨·엉덩이는 둥근 결을 따라)
  if (!o.plain) {
    const stripe = (x, y0, len, lean, w, fork) => {
      path(g, p => { p.moveTo(x - w, Y(y0)); p.bezierCurveTo(x - w * 0.6 + lean * 0.4, Y(y0 + len * 0.45), x + lean - w * 0.2, Y(y0 + len * 0.8), x + lean, Y(y0 + len)); p.bezierCurveTo(x + lean + w * 0.15, Y(y0 + len * 0.7), x + w * 0.5 + lean * 0.3, Y(y0 + len * 0.4), x + w, Y(y0 - 0.4)); p.closePath(); }, S);
      if (fork) path(g, p => { const fx = x + lean * 0.45, fy = y0 + len * 0.45; p.moveTo(fx, Y(fy)); p.quadraticCurveTo(fx + 2.4, Y(fy + 2), fx + 3.4, Y(fy + 4.6)); p.quadraticCurveTo(fx + 1.6, Y(fy + 2.8), fx - 0.6, Y(fy + 1.4)); p.closePath(); }, S);
    };
    for (const [x, y0, len, lean, w, fk] of [[-19.6, -30, 9, 1.6, 1.4, false], [-15, -33.2, 12, 2.2, 1.9, true], [-9.6, -34.2, 13, 1.4, 2, false], [-4, -33.6, 12, 1.8, 1.9, true], [1.6, -34.2, 13, 1.2, 2.1, false], [7.4, -35.6, 12, 1.4, 2, true], [12.6, -35.4, 9, 2, 1.7, false]]) stripe(x, y0, len, lean, w, fk);
    for (const [x, y] of [[-20.2, -22], [-17.4, -18.6]]) curve(g, p => { p.moveTo(x, Y(y)); p.quadraticCurveTo(x + 2.6, Y(y - 1.4), x + 4, Y(y + 0.6)); }, S, 1.4);   // 엉덩이의 둥근 결
  }
  if (o.shag && !o.lie) { // 배 아래로 길게 늘어진 흰 털 (엎드리면 땅에 깔려 안 보인다)
    part(g, p => { p.moveTo(-21, -15); for (let x = -19; x <= 15; x += 4.2) { p.lineTo(x, -3.6 - ((x * 7) % 3)); p.lineTo(x + 2.1, -11); } p.lineTo(17, -14); p.quadraticCurveTo(0, -9, -21, -15); p.closePath(); }, C, R(-22, -8, 42, 6), { k: 0.14, lw: 1 });
    for (const x of [-16, -8, 0, 8]) curve(g, p => { p.moveTo(x, -27); p.quadraticCurveTo(x - 2, -21, x - 0.6, -15); }, dk(C, 0.2), 0.8);
  }
  };
  const head = () => {
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
    else { const oy = o.calm ? -34.4 : -35.6; path(g, p => { p.moveTo(ix, -32.2); p.quadraticCurveTo(24 + s * 4.6, o.calm ? -36.6 : -37.4, ox, oy); p.quadraticCurveTo(24 + s * 5.8, -30.6, ix, -32.2); p.closePath(); }, eye, INK, 1); ell(g, 24 + s * 5, -33.8, 0.8, 1.9, INK); }
    if (o.calm) curve(g, p => { p.moveTo(24 + s * 1.8, -36.4); p.quadraticCurveTo(24 + s * 5, -38.2, 24 + s * 8.6, -36.8); }, INK, 1.5); else line(g, [24 + s * 1.2, -34.6, 24 + s * 9, -38.4], INK, 2);   // 순한 범은 둥근 눈썹
  }
  path(g, P(22.5, -28.6, 25.5, -28.6, 24, -26.4), '#c9584a', INK, 0.7);
  if (o.roar) { part(g, p => { p.moveTo(20, -25.4); p.quadraticCurveTo(24, -27, 28, -25.4); p.quadraticCurveTo(27.4, -20.4, 24, -20.4); p.quadraticCurveTo(20.6, -20.4, 20, -25.4); p.closePath(); }, '#7a1f1c', null, { lw: 0.9 }); for (const s of [-1, 1]) poly(g, [24 + s * 3, -25.4, 24 + s * 2.2, -22.4, 24 + s * 1.4, -25.6], WHITE, INK, 0.5); }
  else { line(g, [24, -26.4, 24, -25], INK, 0.8); curve(g, p => { p.moveTo(19.8, -23.2); p.quadraticCurveTo(22, -25.4, 24, -25); p.quadraticCurveTo(26, -25.4, 28.2, -23.2); }, INK, 1); if (!o.calm) for (const s of [-1, 1]) poly(g, [24 + s * 3.2, -24.6, 24 + s * 2.5, -21.8, 24 + s * 1.7, -24.8], WHITE, INK, 0.5); }
  for (const s of [-1, 1]) for (const dy of [-0.6, 1.4]) line(g, [24 + s * 5.6, -25 + dy, 24 + s * 12.4, -25.6 + dy * 2.2], INK, 0.5);
  };
  if (o.lie) {   // 엎드림·잠: 배를 땅에 대고 앞다리를 앞으로 뻗어 턱을 괸다. 잠들면 꼬리를 앞으로 감는다
    rope(g, p => { p.moveTo(-20, -8); p.bezierCurveTo(-32, -6, -35, 0.6, -24, 1.4); if (o.blink) p.bezierCurveTo(-12, 2.4, -2, 3, 8, 1.2); }, C, 3.6);
    for (const [x, y] of (o.blink ? [[-30, -2.6], [-18, 1.8], [-6, 2.6]] : [[-30, -2.6], [-27, 0.6]])) { g.save(); g.translate(x, y); g.rotate(1.3); rr(g, -2.5, -0.95, 5, 1.9, 0.8, S); g.restore(); }
    if (o.blink) ell(g, 8.4, 1.2, 2.5, 2.2, S, INK, 0.9);
    for (const [dy, col] of [[-2.4, far], [0, C]]) part(g, p => { p.moveTo(6, dy - 7); p.lineTo(31, dy - 4.4); p.quadraticCurveTo(35.6, dy - 3.4, 35, dy + 0.6); p.lineTo(6, dy + 0.6); p.closePath(); }, col, null, { lw: 1.1 });
    for (const dx of [31.6, 33.4]) line(g, [dx, -1.4, dx, 0.5], INK, 0.6);
    body(0.8, 8.6);   // 엎드린 몸은 낮고 길게 따로 잡는다 (그림을 눌러 찌그러뜨리지 않는다)
    part(g, E(-14.6, -7.2, 8, 6), C, E(-12, -4, 8, 4), { k: 0.18, lw: 1.1 }); if (!o.plain) for (const a of [-0.6, 0, 0.6]) { g.save(); g.translate(-14.6 + Math.sin(a) * 5, -7.2 - Math.cos(a) * 3); g.rotate(a); rr(g, -0.9, -2.4, 1.8, 4.2, 0.8, S); g.restore(); }
    part(g, p => { p.moveTo(-10, -3.6); p.lineTo(-2.6, -3.4); p.quadraticCurveTo(0.6, -1.6, -0.6, 0.6); p.lineTo(-10, 0.6); p.closePath(); }, C, null, { lw: 1 });
    g.save(); g.translate(5, 16.6); head(); g.restore();
    return;
  }
  // 꼬리: 위로 말아 올렸다 (마디마다 검은 고리, 끝은 검다)
  rope(g, p => { p.moveTo(-19.6, -25); p.bezierCurveTo(-31, -24, -35.6, -36, -28.4, -45); }, C, 3.6);
  for (const [x, y, a] of [[-27, -28.4, 0.6], [-32, -35.6, 0.1], [-30.4, -42, -0.7]]) { g.save(); g.translate(x, y); g.rotate(a); rr(g, -2.5, -0.95, 5, 1.9, 0.8, S); g.restore(); }
  ell(g, -28, -45.6, 2.5, 2.7, S, INK, 0.9);
  // 다리: 앞다리는 곧고 굵게, 뒷다리는 넓적다리가 불룩하고 발목이 뒤로 꺾인다. 발은 둥글고 두툼하다
  const toes = (x) => { for (const dx of [-1.4, 0.8, 3]) line(g, [x + dx, -1.8, x + dx, 0.6], INK, 0.6); };
  const foreLeg = (x, col, near) => {
    // 어깨에서 둥글게 내려와 팔꿈치에서 한 번 굵어지는 앞다리 (위 끝이 네모나게 잘리지 않게)
    part(g, p => { p.moveTo(x - 4.6, -22); p.bezierCurveTo(x - 6, -27, x + 5, -28.4, x + 5.6, -22.4); p.bezierCurveTo(x + 6, -17, x + 4.2, -11, x + 3.4, -3.8); p.quadraticCurveTo(x + 6, -1.6, x + 4.6, 0.8); p.lineTo(x, 0.8); p.quadraticCurveTo(x - 4.8, 0.8, x - 3.4, -3.6); p.bezierCurveTo(x - 4.4, -9, x - 5.4, -15, x - 4.6, -22); p.closePath(); }, col, near ? R(x + 1.6, -28, 5, 28) : null, { k: 0.2, lw: 1.1 });
    toes(x); if (near && !o.plain) for (const y of [-14.6, -10.6]) curve(g, p => { p.moveTo(x - 3.4, y); p.quadraticCurveTo(x - 1, y - 0.6, x + 1.4, y + 0.6); }, S, 1.2);
  };
  const hindLeg = (x, col, near) => {
    part(g, p => { p.moveTo(x - 4, -24); p.bezierCurveTo(x - 9, -18, x - 7.6, -10, x - 4, -7.6); p.lineTo(x - 3.6, -3.6); p.quadraticCurveTo(x - 5, 0.8, x, 0.8); p.lineTo(x + 4.6, 0.8); p.quadraticCurveTo(x + 6, -1.6, x + 3.6, -3.8); p.quadraticCurveTo(x + 3, -7, x + 2.4, -8.6); p.bezierCurveTo(x + 6, -12, x + 7, -19, x + 5, -25); p.closePath(); }, col, near ? R(x + 0.6, -26, 7, 26) : null, { k: 0.2, lw: 1.1 });
    toes(x); if (near && !o.plain) for (const [y, w] of [[-19, 4.6], [-15.4, 4], [-6.2, 3]]) curve(g, p => { p.moveTo(x - w, y); p.quadraticCurveTo(x - w * 0.2, y - 0.8, x + w * 0.4, y + 0.6); }, S, 1.2);
  };
  hindLeg(-13, far, false); foreLeg(12.6, far, false);
  body();
  hindLeg(-17.4, C, true); foreLeg(7.6, C, true);
  head();
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
  // 등에 빽빽이 돋은 긴 쇠 바늘
  for (const [x, h, a] of [[-20, 9, -0.7], [-17, 12.6, -0.5], [-11, 16, -0.3], [-4.6, 17.6, -0.1], [2, 16.6, 0.1], [8.4, 14, 0.3], [14, 10.6, 0.5]]) { g.save(); g.translate(x, -36 + Math.abs(x) * 0.12); g.rotate(a); part(g, P(-2.4, 2, 0, -h, 2.4, 2), STEEL, P(0.4, -h, 3, 2, 0.6, 2), { k: 0.24, lw: 1 }); g.restore(); }
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
  // 짧은 코: 맥처럼 뭉툭하게 내민 쇠 주둥이 (길게 늘어뜨리면 코끼리로 읽힌다)
  part(g, p => { p.moveTo(20.6, -30); p.bezierCurveTo(20.2, -25, 21.6, -21, 25.6, -20.4); p.bezierCurveTo(29, -20, 30, -22.6, 29, -24.6); p.bezierCurveTo(28, -26.6, 27.4, -28, 27.4, -30); p.closePath(); }, C, null, { lw: 1.1 });
  for (const y of [-27, -23.6]) curve(g, p => { p.moveTo(21, y); p.quadraticCurveTo(24, y + 1.4, 27.4, y + 0.4); }, D, 0.8);   // 쇠 고리 마디
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
  // 작은 머리통 (가시 같은 머리털은 서양 괴물처럼 보여 쓰지 않는다)
  part(g, p => { p.moveTo(-5.6, -58); p.quadraticCurveTo(-5.6, -63.6, 0, -63.6); p.quadraticCurveTo(5.6, -63.6, 5.6, -58); p.quadraticCurveTo(4.6, -51.6, 0, -51); p.quadraticCurveTo(-4.6, -51.6, -5.6, -58); p.closePath(); }, '#2e2a3c', P(2, -64, 6, -64, 6, -50, 0.6, -50, 3.6, -56), { shc: '#1c1826', lw: 1 });
  // 뻥 뚫린 흰 눈과 세로로 찢어진 입
  // 그늘 속에서 가늘게 빛나는 눈
  for (const s of [-1, 1]) ell(g, s * 2.6, -57.8, 1.7, 0.9, '#e8f0ff', INK, 0.5);
  part(g, E(0, -54, 1.1, 2), '#0e0c14', null, { lw: 0.6 });
  // 해진 검은 갓: 테 끝이 찢어져 너덜너덜하다
  part(g, p => { p.moveTo(-15, -61); p.lineTo(-12, -59.6); p.lineTo(-10.6, -61.2); p.lineTo(-7, -59.4); p.quadraticCurveTo(0, -58.6, 7, -59.4); p.lineTo(10, -61.4); p.lineTo(12.4, -59.8); p.lineTo(15, -61); p.quadraticCurveTo(0, -64.4, -15, -61); p.closePath(); }, '#1c1826', null, { lw: 1 });
  part(g, p => { p.moveTo(-4.4, -61.8); p.lineTo(-3.8, -69.6); p.quadraticCurveTo(0, -71, 3.8, -69.6); p.lineTo(4.4, -61.8); p.quadraticCurveTo(0, -60.8, -4.4, -61.8); p.closePath(); }, '#262234', R(0.6, -71, 4, 10), { lw: 1 });
}

// ───────── 도깨비가 든 것 ─────────
// 야광귀가 훔쳐 든 짚신 한 켤레
export function strawShoes(g) {
  const S = '#d9b96a';
  rope(g, p => { p.moveTo(-16.4, -19); p.lineTo(-18.6, -12.6); }, '#8a6a3c', 0.9);
  for (const [x, y, a] of [[-21.6, -9, 0.3], [-15.6, -8.6, -0.25]]) { g.save(); g.translate(x, y); g.rotate(a); part(g, E(0, 0, 3.3, 5.6), S, E(1.1, 1, 2.6, 4.8), { k: 0.2, lw: 1 }); for (const yy of [-2.6, 0, 2.6]) line(g, [-2.6, yy, 2.6, yy], '#a8873f', 0.7); curve(g, p => { p.moveTo(-2.4, -3.4); p.quadraticCurveTo(0, -6.6, 2.4, -3.4); }, '#8a6a3c', 0.9); g.restore(); }
}

// ═════════ 새 요괴 (사람꼴은 sprites.js 에서 doll 로, 나머지는 여기서 한 장으로) ═════════
const PALE = '#e9eff0';
// 작은 물방울
const drop = (g, x, y, s = 1, c = '#8fb6c8') => path(g, p => { p.moveTo(x, y - 2.2 * s); p.quadraticCurveTo(x + 1.5 * s, y, x, y + 1.1 * s); p.quadraticCurveTo(x - 1.5 * s, y, x, y - 2.2 * s); p.closePath(); }, c, INK, 0.5);

// ───────── 물귀신: 물속에서 반쯤 솟아 두 팔을 뻗는 젖은 귀신 (저고리와 치마, 머리에 감긴 물풀) ─────────
export function mulgwisin(g) {
  const SK = '#c4d2d6', H = '#171a22', J = '#56697f', robe = '#c9d4d8';
  // 발밑의 물결
  g.globalAlpha = 0.55; ell(g, 0, -1, 18, 4.8, '#5f8296'); g.globalAlpha = 1;
  for (const [r, a] of [[17, 0.8], [12.6, 0.6]]) { g.globalAlpha = a; curve(g, p => p.ellipse(0, -1.2, r, r * 0.27, 0, 0, TAU), '#d6e8ee', 1); g.globalAlpha = 1; }
  // 젖은 머리: 뒤로 빗어 넘기고 한 가닥으로 땋아 어깨 앞으로 늘어뜨렸다 (끝에 붉은 댕기)
  part(g, p => { p.moveTo(-8.4, -46); p.quadraticCurveTo(-10.4, -40, -8.8, -35.6); p.lineTo(8.8, -35.6); p.quadraticCurveTo(10.4, -40, 8.4, -46); p.closePath(); }, H, null, { lw: 1 });
  for (let k = 0; k < 6; k++) { const by = -36 + k * 2.6, bx = -7.6 - Math.sin(k * 0.6) * 0.8; part(g, p => p.ellipse(bx, by, 2.1, 1.7, 0.5 * (k % 2 ? 1 : -1), 0, TAU), H, null, { lw: 0.8 }); }
  path(g, P(-9.4, -21.6, -5.8, -21.6, -6.4, -16.4, -8.2, -18.6, -9.8, -16.2), '#b8322a', INK, 0.7);
  // 물에 잠긴 치마: 아랫자락이 물결에 풀려 너덜너덜하다
  part(g, p => { p.moveTo(-10, -25); p.quadraticCurveTo(-13.6, -14, -14.4, -3); for (let x = -14.4; x < 14.4; x += 4.8) p.quadraticCurveTo(x + 2.4, -1.6, x + 4.8, -3); p.lineTo(14.4, -3); p.quadraticCurveTo(13.6, -14, 10, -25); p.closePath(); }, robe, P(3, -26, 16, -26, 16, 0, 5, 0), { hi: P(-9, -24, -6, -24, -9, -6, -12.6, -6), hk: 0.2 });
  for (const x of [-7, -2.4, 3, 7.4]) curve(g, p => { p.moveTo(x * 0.9, -23); p.quadraticCurveTo(x - 0.6, -14, x * 1.1, -5); }, dk(robe, 0.3), 0.8);
  // 빛바랜 쪽빛 저고리와 흰 동정, 늘어진 고름
  part(g, p => { p.moveTo(-8.6, -33.6); p.quadraticCurveTo(-11, -28, -10.6, -24); p.quadraticCurveTo(0, -22.4, 10.6, -24); p.quadraticCurveTo(11, -28, 8.6, -33.6); p.quadraticCurveTo(0, -35.4, -8.6, -33.6); p.closePath(); }, J, P(3, -36, 12, -36, 12, -22, 4, -22), { hi: P(-8, -33, -5.6, -33.6, -8.6, -25, -10, -25), hk: 0.2 });
  path(g, P(4.6, -34, 2, -33.6, -3.4, -25.4, -1, -24.6), dk(J, 0.25), INK, 0.6); path(g, P(-4.6, -34, -2, -33.6, 3.6, -25.6, 1.2, -24.8), dk(J, 0.25), INK, 0.6); line(g, [-3.4, -33.6, 2.6, -25.6], '#eef4f4', 1.2);
  path(g, P(1.6, -26.6, 4.4, -27, 3.4, -18.6, 1.8, -19.2), '#8a4a4a', INK, 0.6); path(g, P(1.4, -26.6, -0.8, -25.6, -0.6, -20.6, 1.2, -21), '#8a4a4a', INK, 0.6);
  // 앞으로 뻗은 두 팔과 앙상한 손가락
  for (const s of [-1, 1]) {
    part(g, p => { p.moveTo(s * 7.6, -32.4); p.quadraticCurveTo(s * 13.4, -29, s * 13.6, -18.6); p.lineTo(s * 10.6, -18.2); p.quadraticCurveTo(s * 10.4, -25, s * 8.6, -26.4); p.closePath(); }, J, s > 0 ? R(15, -33, 8, 12) : null, { lw: 1.1 });
    path(g, P(s * 13.6, -18.6, s * 10.6, -18.2, s * 10.6, -19.8, s * 13.6, -20.2), '#eef4f4', INK, 0.6);
    part(g, E(s * 12.2, -16.2, 2.4, 2.4), SK, E(s * 13, -15.4, 2, 1.8), { lw: 0.9 });
    
    drop(g, s * 12.4, -11.6, 0.9);
  }
  // 목과 얼굴: 물에 불은 푸르스름한 얼굴, 퀭한 눈, 파리한 입술
  path(g, P(-2.4, -35.4, 2.4, -35.4, 2.8, -32.6, -2.8, -32.6), dk(SK, 0.16), INK, 0.8);
  part(g, p => { p.moveTo(-7.6, -44.6); p.bezierCurveTo(-7.6, -53, 7.6, -53, 7.6, -44.6); p.bezierCurveTo(7.6, -39, 4.4, -35.4, 0, -35.2); p.bezierCurveTo(-4.4, -35.4, -7.6, -39, -7.6, -44.6); p.closePath(); }, SK, P(2.6, -54, 9, -54, 9, -34, 0, -34), { shc: '#a8bac0', lw: 1.2 });
  for (const s of [-1, 1]) { path(g, p => { p.moveTo(s * 1.2, -43.6); p.quadraticCurveTo(s * 3.6, -45.6, s * 5.8, -43.4); p.quadraticCurveTo(s * 3.6, -41.8, s * 1.2, -43.6); p.closePath(); }, '#262d48', null); ell(g, s * 3.5, -43.6, 0.5, 0.5, '#d6e8ee'); g.globalAlpha = 0.35; ell(g, s * 3.6, -41.2, 2.6, 1.1, '#5a6a8a'); g.globalAlpha = 1; }
  ell(g, 0, -38.2, 1.5, 0.9, '#4a5868', INK, 0.5);
  // 가르마를 타고 귀 뒤로 넘긴 젖은 머리 (얼굴을 가리지 않는다)
  for (const s of [-1, 1]) part(g, p => { p.moveTo(0, -52.6); p.quadraticCurveTo(s * 9.4, -52.6, s * 8.8, -44); p.lineTo(s * 7.4, -41.2); p.quadraticCurveTo(s * 6.6, -47.4, 0, -49.8); p.closePath(); }, H, null, { hi: P(s * 2, -51.6, s * 5, -51.4, s * 3, -49.6), hic: '#3a3f52', lw: 1 });
  // 머리에 감긴 물풀
  rope(g, p => { p.moveTo(-7.6, -50); p.quadraticCurveTo(-10.6, -46, -9.2, -41); }, '#5a6a3a', 1.1);
  rope(g, p => { p.moveTo(5.6, -51.6); p.quadraticCurveTo(9.6, -50, 9.8, -46); }, '#6a7a44', 0.9);
  for (const [x, y] of [[-9.6, -29], [9.4, -29.6], [-1, -15.6], [6, -17]]) drop(g, x, y, 0.8);
}

// ───────── 달걀귀신: 눈도 코도 입도 없는 하얀 달걀 얼굴 ─────────
export function dalgyal(g) {
  g.globalAlpha = 0.28; ell(g, 0, -1.6, 12, 3.6, '#7a86a8'); g.globalAlpha = 1;
  // 뒤로 빗어 쪽 찐 머리와 비녀 (풀어 헤친 머리가 아니다 — 우리 옛이야기의 달걀귀신)
  part(g, p => p.ellipse(0, -35.4, 6.6, 3.6, 0, 0, TAU), '#1d1d26', null, { lw: 1 }); line(g, [-10.4, -36.2, 10.4, -34.8], INK, 2.4); line(g, [-10.4, -36.2, 10.4, -34.8], '#d8c27a', 1.2); ell(g, 10.6, -34.8, 1.4, 1.4, '#c8402f', INK, 0.6);
  // 소복: 발끝이 땅에 닿지 않고 연기처럼 흩어진다
  const W2 = '#f4f1ea';
  part(g, p => { p.moveTo(-9.4, -32.6); p.quadraticCurveTo(-13.6, -18, -12.4, -5); p.quadraticCurveTo(-9, -2.4, -6, -5.6); p.quadraticCurveTo(-3, -1.6, 0, -5.4); p.quadraticCurveTo(3, -1.6, 6, -5.6); p.quadraticCurveTo(9, -2.4, 12.4, -5); p.quadraticCurveTo(13.6, -18, 9.4, -32.6); p.quadraticCurveTo(0, -35, -9.4, -32.6); p.closePath(); }, W2, P(3, -36, 15, -36, 15, -1, 4, -1), { shc: '#cfd2dc', hi: P(-8.6, -32, -6, -32, -10, -7, -12, -7), hk: 0.3 });
  for (const x of [-6.6, -2.2, 2.4, 6.6]) curve(g, p => { p.moveTo(x * 0.8, -31); p.quadraticCurveTo(x, -18, x * 1.1, -6.6); }, '#cfd2dc', 0.8);
  path(g, P(-4.8, -33, -1.6, -33, 3.6, -24, 1.2, -23), '#e6e3dc', INK, 0.7); line(g, [-3.6, -32.6, 2.6, -24.2], WHITE, 1);
  // 축 늘어진 소매
  for (const s of [-1, 1]) part(g, p => { p.moveTo(s * 7.8, -31.6); p.quadraticCurveTo(s * 15.6, -29, s * 15.4, -18); p.lineTo(s * 13.4, -14.6); p.lineTo(s * 9.6, -18.6); p.quadraticCurveTo(s * 10, -24.6, s * 7.6, -26.6); p.closePath(); }, W2, s > 0 ? R(12, -32, 6, 20) : null, { shc: '#cfd2dc', lw: 1.1 });
  // 목과 달걀 얼굴: 아무것도 없이 매끈하다
  path(g, P(-2.6, -35, 2.6, -35, 2.2, -32, -2.2, -32), '#e4e2da', INK, 0.8);
  part(g, p => p.ellipse(0, -45.2, 8.4, 10.6, 0, 0, TAU), '#fbf9f3', p => p.ellipse(3.4, -42, 7.6, 10, 0, 0, TAU), { shc: '#dcdbd4', hi: E(-3.4, -49.6, 2.6, 3.6), hic: '#ffffff', lw: 1.3 });
  // 이마를 가른 가르마
  part(g, p => { p.moveTo(-8.2, -47); p.quadraticCurveTo(-7, -55.6, 0, -55.8); p.quadraticCurveTo(7, -55.6, 8.2, -47); p.quadraticCurveTo(5, -52, 0.4, -52.6); p.quadraticCurveTo(-5, -52, -8.2, -47); p.closePath(); }, '#1d1d26', null, { lw: 0.9 });
  g.globalAlpha = 0.5; ell(g, 0, -45.6, 3.4, 2, '#e6e4de'); g.globalAlpha = 1;
}

// ───────── 아귀: 배는 산만 하고 목은 바늘만 한, 굶주림이 끝나지 않는 귀신 ─────────
export function agwi(g) {
  const S = '#b4aa96', SD = '#8a8070', B = '#3a3430';
  g.globalAlpha = 0.3; ell(g, 0, -1, 12, 3.4, '#4a4a5a'); g.globalAlpha = 1;
  // 옹이 진 무릎의 마른 다리와 휜 발
  for (const s of [-1, 1]) { rope(g, p => { p.moveTo(s * 4, -15); p.lineTo(s * 6.4, -8.6); p.lineTo(s * 5, -1.4); }, S, 1.7); ell(g, s * 6.2, -8.6, 1.5, 1.4, S, INK, 0.7); part(g, p => { p.moveTo(s * 4.2, -2); p.lineTo(s * 9.6, -1.6); p.lineTo(s * 9.8, 0.6); p.lineTo(s * 3.8, 0.6); p.closePath(); }, S, null, { lw: 0.9 }); }
  // 너덜너덜한 허리 두르개
  part(g, p => { p.moveTo(-10.4, -17.4); p.lineTo(10.4, -17.4); p.lineTo(9.4, -11); p.lineTo(6.6, -13.4); p.lineTo(4.4, -9.6); p.lineTo(1.6, -12.6); p.lineTo(-1.4, -9.4); p.lineTo(-4.4, -12.8); p.lineTo(-7, -9.8); p.lineTo(-9.6, -12.4); p.closePath(); }, '#7a6a56', P(3, -18, 12, -18, 12, -8, 4, -8), { lw: 1 });
  // 앙상한 가슴 (빗장뼈와 갈비뼈) 아래로 북처럼 부푼 배
  part(g, p => { p.moveTo(-7.4, -35); p.quadraticCurveTo(-9.6, -31, -9, -27); p.lineTo(9, -27); p.quadraticCurveTo(9.6, -31, 7.4, -35); p.quadraticCurveTo(0, -36.4, -7.4, -35); p.closePath(); }, S, R(3, -37, 8, 11), { shc: SD });
  for (const s of [-1, 1]) { curve(g, p => { p.moveTo(s * 1.4, -34.4); p.quadraticCurveTo(s * 4.6, -35.4, s * 7.4, -34); }, SD, 0.9); for (const y of [-32, -29.8]) curve(g, p => { p.moveTo(s * 1.6, y); p.quadraticCurveTo(s * 5, y - 1, s * 8, y + 0.6); }, SD, 0.7); }
  part(g, p => { p.moveTo(-8.6, -28); p.quadraticCurveTo(-15.6, -26, -14, -19); p.quadraticCurveTo(-11.6, -13.4, 0, -13.4); p.quadraticCurveTo(11.6, -13.4, 14, -19); p.quadraticCurveTo(15.6, -26, 8.6, -28); p.quadraticCurveTo(0, -29.4, -8.6, -28); p.closePath(); }, S, E(6, -18.6, 10, 7), { shc: SD, hi: E(-5.6, -22.6, 4.4, 3), hk: 0.3 });
  ell(g, 0.6, -18.8, 1, 1.3, SD); for (const x of [-8, 8]) curve(g, p => { p.moveTo(x, -25); p.quadraticCurveTo(x * 1.15, -21, x * 0.95, -16.6); }, SD, 0.6);
  // 가느다란 팔과 갈퀴 같은 긴 손톱
  for (const s of [-1, 1]) { rope(g, p => { p.moveTo(s * 7.6, -33.6); p.lineTo(s * 13.4, -27.6); p.lineTo(s * 15.4, -18.6); }, S, 1.4); ell(g, s * 13.4, -27.6, 1.2, 1.2, S, INK, 0.6); for (const a of [-0.45, 0, 0.45]) line(g, [s * 15.4, -18.6, s * (15.4 + Math.sin(a) * 3), -18.6 + Math.cos(a) * 4.6], INK, 1.1); }
  // 바늘 같은 목
  line(g, [0, -35.6, 0, -40], INK, 2.6); line(g, [0, -35.6, 0, -40], S, 1.2);
  // 해골처럼 여윈 얼굴: 움푹 꺼진 눈자위, 튀어나온 광대, 바늘구멍 같은 입과 흐르는 침
  part(g, p => { p.moveTo(-8.4, -48.6); p.bezierCurveTo(-8.8, -58.6, 8.8, -58.6, 8.4, -48.6); p.bezierCurveTo(8.4, -44, 4.6, -40, 0, -39.6); p.bezierCurveTo(-4.6, -40, -8.4, -44, -8.4, -48.6); p.closePath(); }, S, P(3, -59, 10, -59, 10, -39, 1, -39), { shc: SD, hi: E(-3.6, -54, 3, 1.8), hk: 0.3, lw: 1.2 });
  for (const s of [-1, 1]) { ell(g, s * 3.6, -48.6, 2.8, 2.4, B, INK, 0.6); ell(g, s * 3.6, -48.4, 0.6, 0.6, '#f0d870'); line(g, [s * 1, -51.8, s * 6.6, -51], INK, 1.3); curve(g, p => { p.moveTo(s * 5.6, -45.2); p.quadraticCurveTo(s * 4.2, -43.4, s * 2.4, -43.6); }, SD, 0.8); }
  curve(g, p => p.arc(0, -42, 0.9, 0, TAU), INK, 1); path(g, p => { p.moveTo(0.4, -41); p.quadraticCurveTo(1.4, -38.6, 0.6, -37.6); p.quadraticCurveTo(-0.2, -38.6, 0.4, -41); p.closePath(); }, '#cfe0e6', INK, 0.4);
  // 듬성듬성 남은 머리털
  for (const [x, a] of [[-6.4, -0.9], [-3.4, -0.4], [0.4, 0.1], [3.6, 0.5], [6.6, 0.9]]) curve(g, p => { p.moveTo(x, -56.2 + Math.abs(x) * 0.25); p.quadraticCurveTo(x + Math.sin(a) * 3, -59 + Math.abs(x) * 0.3, x + Math.sin(a) * 5.4, -58 + Math.abs(x) * 0.6); }, '#3a3632', 1);
  for (const s of [-1, 1]) curve(g, p => { p.moveTo(s * 8.2, -50); p.quadraticCurveTo(s * 10.4, -45, s * 9.6, -39); }, '#3a3632', 0.9);
}

// ───────── 영노: 탈판에서 무엇이든 받아먹는 큰 입의 괴물 (삼베 너울을 뒤집어쓴 탈) ─────────
export function yeongno(g) {
  const C = '#3a3f5a', F = '#2f5a66', M = '#c8402f';
  g.globalAlpha = 0.3; ell(g, 0, -1, 17, 4, '#3a3040'); g.globalAlpha = 1;
  // 발: 짚신을 신은 큰 두 발
  for (const s of [-1, 1]) part(g, E(s * 7.4, -1.6, 5.4, 2.6), '#d9b96a', E(s * 7.4 + 1.6, -0.8, 4.4, 1.8), { k: 0.2, lw: 1 });
  // 너울 몸통: 어깨에서 발목까지 덮어쓴 삼베 술. 아랫단이 들쭉날쭉하다
  const cloak = p => { p.moveTo(-12, -40); p.bezierCurveTo(-18, -38, -20, -28, -19, -18); p.quadraticCurveTo(-19.6, -10, -17.6, -4); for (let x = -17.6, i = 0; x < 17.6; x += 2.9, i++) p.lineTo(x + 1.45, -4 + (i % 2 ? 2.4 : -0.8) + (i % 3 === 0 ? 0.8 : 0)); p.lineTo(17.6, -4); p.quadraticCurveTo(19.6, -10, 19, -18); p.bezierCurveTo(20, -28, 18, -38, 12, -40); p.quadraticCurveTo(0, -42.6, -12, -40); p.closePath(); };
  part(g, cloak, C, P(5, -44, 22, -44, 22, 0, 8, 0), { shc: dk(C, 0.28), hi: P(-12, -39, -8, -40, -14, -8, -17, -8), hk: 0.16, lw: 1.3 });
  g.save(); g.beginPath(); cloak(g); g.clip();
  for (let x = -17; x <= 17; x += 2.4) curve(g, p => { p.moveTo(x * 0.7, -38); p.quadraticCurveTo(x * 0.95, -22, x, -2); }, (Math.round(x / 2.4) % 2) ? dk(C, 0.3) : lt(C, 0.12), 0.7);
  g.restore();
  // 허리에 두른 붉은 띠와 늘어진 매듭
  part(g, p => { p.moveTo(-18.4, -22.6); p.quadraticCurveTo(0, -19.6, 18.4, -22.6); p.lineTo(18.6, -18.8); p.quadraticCurveTo(0, -15.8, -18.6, -18.8); p.closePath(); }, M, P(6, -24, 20, -24, 20, -15, 6, -15), { lw: 1 });
  path(g, P(4, -19, 7.4, -19.4, 6, -10.6, 3.6, -11.6), dk(M, 0.15), INK, 0.7);
  // 너울 소매 밖으로 내민 두 손: 갈퀴 같은 손톱
  for (const s of [-1, 1]) { part(g, E(s * 19.6, -25.6, 4, 3.4), '#7a8a8a', E(s * 20.6, -24.6, 3.4, 2.6), { lw: 1 }); for (const dx of [-1.8, 0, 1.8]) poly(g, [s * 19.6 + dx - 0.8, -23, s * 19.6 + dx, -19.6, s * 19.6 + dx + 0.8, -23], '#f3e7c8', INK, 0.5); }
  // 탈: 넓적한 얼굴에 부리부리한 눈, 귀밑까지 찢어진 입과 늘어진 혀
  part(g, p => { p.moveTo(-14, -52); p.bezierCurveTo(-15.6, -66, 15.6, -66, 14, -52); p.bezierCurveTo(15, -42, 9, -36.6, 0, -36.4); p.bezierCurveTo(-9, -36.6, -15, -42, -14, -52); p.closePath(); }, F, p => { p.moveTo(6, -66); p.lineTo(18, -66); p.lineTo(18, -34); p.lineTo(2, -34); p.quadraticCurveTo(12, -44, 6, -66); p.closePath(); }, { hi: E(-6, -59, 4.6, 2.4), hk: 0.24, lw: 1.3 });
  // 짚으로 엮은 덥수룩한 갈기 (탈 둘레로 늘어진다)
  for (let i = 0; i < 13; i++) { const a = -3.0 + i * 0.25, x = Math.cos(a) * 15, y = -52 + Math.sin(a) * 12.4, k = 4 + (i % 2) * 1.6; rope(g, p => { p.moveTo(x * 0.9, y * 0.99 + 0.6); p.quadraticCurveTo(x * 1.08, y - k * 0.4, x * 1.12 + Math.cos(a) * k * 0.4, y + Math.sin(a) * k); }, '#d9b96a', 1.2); }
  for (const s of [-1, 1]) { path(g, P(s * 11.6, -58.6, s * 2.4, -57.6, s * 2.4, -55.4, s * 11.8, -55.4), '#1d1c22', INK, 0.6);
    part(g, E(s * 6.6, -51.6, 3.9, 3.6), '#fff3b8', null, { lw: 1 }); ell(g, s * 6.4, -51.4, 1.6, 1.8, '#8a1f1c'); ell(g, s * 6.2, -51.6, 0.7, 0.9, INK); ell(g, s * 5.6, -52.6, 0.6, 0.6, '#ffffff'); }
  part(g, E(0, -46.6, 2.6, 2), dk(F, 0.25), null, { lw: 0.9 });
  path(g, p => { p.moveTo(-11, -44); p.quadraticCurveTo(0, -40.4, 11, -44); p.quadraticCurveTo(8.6, -36.6, 0, -36.8); p.quadraticCurveTo(-8.6, -36.6, -11, -44); p.closePath(); }, '#3a1418', INK, 1.1);
  for (const x of [-7.4, -4, -0.6, 2.8, 6.2]) poly(g, [x, -42.4 + Math.abs(x) * 0.1, x + 1.6, -42.6 + Math.abs(x) * 0.1, x + 0.8, -40.2], '#f6efe0', INK, 0.4);
  part(g, p => { p.moveTo(-2.4, -38.6); p.quadraticCurveTo(-3, -32, 0.6, -30.6); p.quadraticCurveTo(3.4, -32, 2.6, -38.6); p.closePath(); }, M, E(1.4, -33, 1.6, 3), { lw: 0.9 });
}

// ───────── 묘두사: 고양이 머리를 한 뱀 (옆모습, 오른쪽을 본다) ─────────
export function myodusa(g) {
  const C = '#c89a5a', B = '#5a3a24', BL = '#efe0b8';
  g.globalAlpha = 0.3; ell(g, -6, -1, 22, 3.6, '#3a3040'); g.globalAlpha = 1;
  // 땅에 깔린 굵은 몸통이 S 자로 굽이치다 고개를 쳐든다
  const body = p => { p.moveTo(-30, -2); p.bezierCurveTo(-24, -12.6, -14, -4.6, -6, -9.4); p.bezierCurveTo(2, -14, 6.4, -15, 7.6, -25); p.lineTo(18, -24); p.bezierCurveTo(17.6, -7, 6, 0.4, -4, 0.8); p.bezierCurveTo(-14, 1.8, -22, 1, -30, -2); p.closePath(); };
  part(g, body, C, p => { p.moveTo(-30, 0.4); p.bezierCurveTo(-20, 2.4, -8, 1.6, 0, 0); p.bezierCurveTo(10, -3.4, 17, -12, 18.6, -24); p.lineTo(22, -24); p.lineTo(22, 4); p.lineTo(-30, 4); p.closePath(); }, { hi: P(-24, -8, -14, -6, -14, -4.6, -24, -6.4), hk: 0.24, lw: 1.3 });
  // 얼룩 띠와 배비늘
  g.save(); g.beginPath(); body(g); g.clip();
  for (const [x, y, a] of [[-24, -4, 0.5], [-17, -3, 0.1], [-9, -5, -0.3], [-1, -7.6, -0.6], [5.6, -12.6, -0.9], [11, -19.6, -1.2]]) { g.save(); g.translate(x, y); g.rotate(a); rr(g, -1.6, -8, 3.2, 13, 1.2, B); g.restore(); }
  g.restore();
  curve(g, p => { p.moveTo(-28, -0.6); p.bezierCurveTo(-18, 1.4, -6, 1, 2, -2); p.bezierCurveTo(9, -5.6, 14.6, -12, 16.4, -22); }, BL, 1.8);
  // 꼬리 끝
  part(g, p => { p.moveTo(-30, -2); p.quadraticCurveTo(-36, -3.4, -38.6, -8.6); p.quadraticCurveTo(-34, -1.6, -30, 0.6); p.closePath(); }, C, null, { lw: 1 });
  // 고양이 머리: 뾰족한 두 귀, 세로로 갈라진 눈동자, 수염
  part(g, E(14.4, -30.4, 8.6, 7.4), C, E(17, -28, 7.4, 6), { hi: E(11, -34, 2.8, 1.6), hk: 0.26, lw: 1.3 });
  for (const [x, a] of [[9.6, -0.5], [17.6, 0.35]]) { g.save(); g.translate(x, -35.6); g.rotate(a); part(g, P(-3.4, 1, 0, -7, 3.4, 1), C, null, { lw: 1.1 }); path(g, P(-1.8, 0.6, 0, -4.6, 1.8, 0.6), '#e8a0a0'); g.restore(); }
  for (const [x, w] of [[12.6, 3.2], [15.4, 2.8]]) line(g, [x, -37.4, x + 0.4, -35.4 + w * 0.2], B, 1.1);   // 이마의 줄무늬
  for (const s of [-1, 1]) { const ex = 14.4 + s * 3.4; path(g, p => { p.moveTo(ex - 2.2, -31.2); p.quadraticCurveTo(ex, -34.2, ex + 2.2, -31.2); p.quadraticCurveTo(ex, -29.2, ex - 2.2, -31.2); p.closePath(); }, '#d9e05a', INK, 0.8); ell(g, ex, -31.4, 0.45, 1.5, INK); }
  path(g, P(17.6, -27.6, 19.6, -27.6, 18.6, -26.2), '#e88a8a', INK, 0.5);
  for (const [dy, a] of [[-0.6, -0.2], [0.6, 0.05], [1.8, 0.25]]) line(g, [19.6, -26.6 + dy, 19.6 + Math.cos(a) * 6.6, -26.6 + dy + Math.sin(a) * 6.6], '#3a2a20', 0.5);
  for (const x of [16.8, 19]) poly(g, [x - 0.7, -24.8, x, -22.4, x + 0.7, -24.8], WHITE, INK, 0.4);
}

// ───────── 왕지네 · 새끼 지네: 마디마다 다리가 돋친 붉은 지네 (옆모습) ─────────
export function centipede(g, o = {}) {
  const k = o.small ? 0.6 : 1, n = o.small ? 5 : 9, C = '#8a2e1e', L = '#e0a040';
  g.save(); g.scale(k, k);
  g.globalAlpha = 0.3; ell(g, -2, -1, 34, 3.6, '#3a3040'); g.globalAlpha = 1;
  const seg = i => { const t = i / (n - 1), x = -34 + t * 58, y = -10 - Math.sin(t * Math.PI * 1.4 + 0.3) * 6 - t * 6; return [x, y]; };
  // 다리: 마디마다 한 쌍씩 땅을 딛는다
  for (let i = 0; i < n; i++) { const [x, y] = seg(i); for (const s of [-1, 1]) { const fx = x + s * 2.6; rope(g, p => { p.moveTo(x, y + 2); p.quadraticCurveTo(fx + s * 2, y + 4, fx + s * 1.4, 0); }, L, 0.9); } }
  // 마디: 꼬리부터 머리 쪽으로 겹쳐 그린다
  for (let i = 0; i < n; i++) { const [x, y] = seg(i), r = 4.6 + Math.sin(i / (n - 1) * Math.PI) * 1.4; part(g, E(x, y, r * 1.12, r), i % 2 ? C : dk(C, 0.1), E(x + 1.6, y + 1.6, r, r * 0.8), { hi: E(x - 1.4, y - 2, r * 0.5, r * 0.3), hk: 0.3, lw: 1.1 }); line(g, [x - r * 0.2, y - r * 0.9, x - r * 0.2, y + r * 0.9], '#2a1410', 0.7); }
  // 꼬리 집게
  const [tx, ty] = seg(0); for (const s of [-1, 1]) rope(g, p => { p.moveTo(tx - 4, ty); p.quadraticCurveTo(tx - 9, ty + s * 3, tx - 11, ty + s * 1); }, '#2b2228', 0.9);
  // 머리: 검은 턱집게와 휘어진 더듬이
  const [hx, hy] = seg(n - 1);
  part(g, E(hx + 5, hy - 0.6, 5.4, 4.6), '#2b2228', E(hx + 6.6, hy + 1, 4.4, 3.4), { hi: E(hx + 3.4, hy - 2.6, 2, 1.2), hic: '#5a4a50', lw: 1.1 });
  for (const s of [-1, 1]) rope(g, p => { p.moveTo(hx + 7, hy - 3); p.bezierCurveTo(hx + 10, hy - 12, hx + 16, hy - 13 + s * 2, hx + 19, hy - 9 + s * 3); }, '#5a2a20', 0.8);
  for (const s of [-1, 1]) path(g, p => { p.moveTo(hx + 8.6, hy + s * 1.2); p.quadraticCurveTo(hx + 14, hy + s * 1.8 + 1, hx + 13.4, hy + s * 4.6 + 1); p.quadraticCurveTo(hx + 11.6, hy + s * 2.4 + 1, hx + 8.4, hy + s * 2.8); p.closePath(); }, '#d9a040', INK, 0.7);
  ell(g, hx + 7.4, hy - 1.8, 1.1, 1.1, '#ffd34a', INK, 0.5);
  g.restore();
}

// ───────── 강철이: 지나는 곳마다 가뭄이 드는 불짐승 (옆모습) ─────────
// 세 겹 불혀: 바깥 붉은빛 → 주황 → 속 노랑, 끝이 휘어 너울댄다 (강철이의 갈기·꼬리)
function fireTongue(g, x, y, h, a = 0, w = 0.34, bend = -0.3) {
  g.save(); g.translate(x, y); g.rotate(a);
  const t = (k, c, lw) => part(g, p => { const hh = h * k, ww = h * w * k; p.moveTo(0, 0.12 * hh); p.bezierCurveTo(-ww * 1.25, -hh * 0.18, -ww * 0.55, -hh * 0.62, bend * hh * 0.6, -hh); p.bezierCurveTo(ww * 0.25 + bend * hh * 0.2, -hh * 0.66, ww * 1.2, -hh * 0.3, ww * 0.7, 0); p.quadraticCurveTo(ww * 0.2, hh * 0.14, 0, 0.12 * hh); p.closePath(); }, c, null, { lw, line: '#4a1208' });
  t(1, '#c8361f', 0.9); t(0.74, '#ff8a2a', 0); t(0.46, '#ffd24a', 0);
  g.restore();
}
export function gangcheori(g) {
  const C = '#2e2622', CF = '#231d1a', E2 = '#ff8a3a', Y = '#ffd36a';
  // 불꽃 꼬리: 엉덩이에서 뒤로 흩날린다
  for (const [a, l] of [[-0.2, 17], [-0.55, 22], [-0.9, 19], [-1.25, 14]]) fireTongue(g, -19, -29, l, a - 0.5, 0.32, -0.35);
  // 다리: 마디가 꺾인 마른 네 다리와 검은 굽 (먼 쪽 다리는 어둡게)
  const hind = (x, col) => { part(g, p => { p.moveTo(x - 4, -27); p.quadraticCurveTo(x - 7, -20, x - 4.6, -12.6); p.lineTo(x - 1.6, -2.4); p.lineTo(x + 1.6, -2.4); p.lineTo(x - 0.8, -12.4); p.quadraticCurveTo(x + 1.4, -19, x + 3, -26); p.closePath(); }, col, null, { lw: 1 }); rr(g, x - 2.6, -3, 5, 3, 1, '#151010', INK, 0.8); };
  const fore = (x, col) => { part(g, p => { p.moveTo(x - 2.8, -24); p.lineTo(x - 2, -12.6); p.lineTo(x - 1.4, -2.4); p.lineTo(x + 1.8, -2.4); p.lineTo(x + 1.2, -12.6); p.lineTo(x + 2.6, -24); p.closePath(); }, col, null, { lw: 1 }); ell(g, x - 0.4, -12.6, 1.6, 1.4, col, INK, 0.7); rr(g, x - 2, -3, 5, 3, 1, '#151010', INK, 0.8); };
  hind(-12, CF); fore(15, CF);
  // 몸통: 등은 굽고 배는 홀쭉하다. 갈라진 살갗 틈으로 불빛이 샌다
  const body = p => { p.moveTo(-20, -27); p.bezierCurveTo(-21, -35, -12, -36.6, -2, -35); p.bezierCurveTo(8, -34, 15, -36, 19, -31); p.bezierCurveTo(22, -26, 20, -21, 15, -20); p.bezierCurveTo(8, -19.6, 2, -22, -4, -21.6); p.bezierCurveTo(-12, -21, -19, -20, -20, -27); p.closePath(); };
  part(g, body, C, p => { p.moveTo(-22, -24); p.bezierCurveTo(-10, -18, 6, -22, 22, -25); p.lineTo(22, -16); p.lineTo(-22, -16); p.closePath(); }, { hi: P(-14, -35, 8, -35, 8, -33.4, -14, -33.6), hic: '#4a3a32', lw: 1.3 });
  g.save(); g.beginPath(); body(g); g.clip();
  for (const pts of [[-15, -33, -12.6, -29.4, -14, -25.6, -12.4, -23], [-12.6, -29.4, -9.4, -28.4], [-3, -34.6, -1.4, -30.4, -3.6, -26.6, -2, -23], [-1.4, -30.4, 1.6, -29.6, 3, -27], [8, -34, 6.4, -30, 8.6, -26.4], [15, -31.6, 13, -27.6, 15.6, -24]]) { line(g, pts, E2, 1.5); line(g, pts, Y, 0.55); }
  g.restore();
  hind(-16, C); fore(11, C);
  // 목과 머리: 휘어 오른 목, 긴 주둥이, 이글거리는 눈, 콧김 연기
  part(g, p => { p.moveTo(11, -32); p.bezierCurveTo(13, -40, 18, -45, 23, -46.6); p.lineTo(28, -41); p.bezierCurveTo(23, -38, 21, -32, 20, -24); p.closePath(); }, C, P(20, -46, 30, -46, 30, -24, 20, -24), { shc: CF, lw: 1.2 });
  part(g, p => { p.moveTo(21, -48); p.quadraticCurveTo(28.6, -51, 36.6, -44.6); p.quadraticCurveTo(39, -41, 36, -39.4); p.quadraticCurveTo(29, -38.6, 24, -40.4); p.quadraticCurveTo(19.4, -43.6, 21, -48); p.closePath(); }, C, P(24, -42, 39, -42, 39, -37, 24, -37), { shc: CF, hi: E(25, -47.6, 3, 1.2), hic: '#4a3a32', lw: 1.2 });
  ell(g, 27.6, -44.8, 1.9, 1.4, Y, INK, 0.6); ell(g, 28, -44.8, 0.7, 0.9, '#7a1f1c');
  line(g, [31.6, -40.4, 36.4, -40.6], E2, 0.9); ell(g, 36.4, -43.4, 0.6, 0.6, INK);
  part(g, P(23.4, -48.6, 24.6, -54.6, 27.4, -48.4), C, null, { lw: 0.9 });
  g.save(); g.globalAlpha = 0.55; g.lineCap = 'round'; g.beginPath(); g.moveTo(37, -43.4); g.bezierCurveTo(40, -45, 41, -42, 43.6, -44.4); g.bezierCurveTo(45.6, -46.4, 44, -48.6, 46.4, -49.4); g.strokeStyle = '#b8a8a0'; g.lineWidth = 2.6; g.stroke(); g.strokeStyle = '#e6dcd4'; g.lineWidth = 1.1; g.stroke(); g.restore();
  // 목덜미와 등을 따라 타오르는 갈기
  for (let i = 7; i >= 0; i--) { const t = i / 7, x = 20 - t * 32, y = -45 + t * 10.6 + Math.sin(t * 3) * 1.4, h = 8 + (i % 2) * 2.6 + (1 - t) * 3; fireTongue(g, x, y + 1, h, -0.75 + t * 0.1, 0.3, -0.38); }
}

// ───────── 밤박쥐: 날개를 활짝 편 박쥐 (떼로 날아온다) ─────────
export function bat(g, o = {}) {
  const C = '#3a3440', M = '#5a4a62', y0 = -26;
  g.globalAlpha = 0.22; ell(g, 0, -1, 9, 2.6, '#2a2430'); g.globalAlpha = 1;
  // 날개: 손가락 뼈 사이로 막이 물결지게 늘어진다
  for (const s of [-1, 1]) {
    const up = o.blink ? 4 : 0;
    part(g, p => { p.moveTo(s * 3, y0 - 2); p.quadraticCurveTo(s * 10, y0 - 11 + up, s * 20, y0 - 8 + up); p.quadraticCurveTo(s * 18.4, y0 - 2, s * 19, y0 + 3); p.quadraticCurveTo(s * 15.6, y0 + 0.6, s * 13.4, y0 + 4.4); p.quadraticCurveTo(s * 10.6, y0 + 1.6, s * 7.6, y0 + 4.6); p.quadraticCurveTo(s * 5.6, y0 + 2, s * 3, y0 + 3); p.closePath(); }, M, s > 0 ? P(10, y0 - 10, 22, y0 - 10, 22, y0 + 6, 10, y0 + 6) : null, { lw: 1.1 });
    for (const [x2, y2] of [[19, y0 + 3], [13.4, y0 + 4.4], [7.6, y0 + 4.6]]) line(g, [s * 6, y0 - 4.4 + up * 0.5, s * x2, y2], dk(M, 0.35), 0.7);
    line(g, [s * 3, y0 - 2, s * 10, y0 - 9.4 + up, s * 20, y0 - 8 + up], INK, 1.1);
  }
  // 몸과 머리: 뾰족한 두 귀와 붉은 눈, 작은 송곳니
  part(g, E(0, y0 + 1, 4.2, 6.2), C, E(1.4, y0 + 2, 3.4, 5), { hi: E(-1.4, y0 - 1.6, 1.4, 2), hic: '#5a5460', lw: 1 });
  part(g, E(0, y0 - 6.4, 4, 3.6), C, null, { lw: 1 });
  for (const s of [-1, 1]) { part(g, P(s * 1.4, y0 - 8.6, s * 3.8, y0 - 14, s * 4.2, y0 - 7.4), C, null, { lw: 0.9 }); ell(g, s * 1.6, y0 - 6.6, 0.9, 0.9, '#ff4a3a', INK, 0.4); poly(g, [s * 0.9 - 0.5, y0 - 4.2, s * 0.9, y0 - 2.6, s * 0.9 + 0.5, y0 - 4.2], WHITE, INK, 0.3); }
  for (const s of [-1, 1]) line(g, [s * 1.6, y0 + 6.6, s * 2.4, y0 + 9], INK, 0.9);
}

// ───────── 사람꼴 요괴의 소품 ─────────
// 여우 할미: 치마 밑으로 삐져나온 꼬리 하나
export function foxTailOne(g) { g.save(); g.translate(-6, -3); g.rotate(-1.2); part(g, p => { p.moveTo(-2.4, 0); p.bezierCurveTo(-7, -8, -6, -17, 0, -23); p.bezierCurveTo(6, -17, 7, -8, 2.4, 0); p.closePath(); }, '#d9a050', null, { lw: 1 }); part(g, p => { p.moveTo(-3.2, -16); p.quadraticCurveTo(0, -18.6, 0, -23); p.quadraticCurveTo(0, -18.6, 3.2, -16); p.quadraticCurveTo(0, -14.6, -3.2, -16); p.closePath(); }, WHITE, null, { lw: 0.8 }); g.restore(); }
// 여우 할미의 옹이진 지팡이
export function caneItem(g) { rope(g, p => { p.moveTo(HX + 1.6, -26); p.quadraticCurveTo(HX + 3.4, -12, HX + 2.6, 1); }, '#8a6a3c', 1.6); part(g, E(HX + 1.2, -27, 2.6, 2.2), '#7a5a30', null, { lw: 0.9 }); }
// 창귀: 사람을 꾀어내는 흐릿한 등롱
export function lureLamp(g) {
  line(g, [HX, -18, HX + 4, -10], INK, 1.2);
  g.globalAlpha = 0.35; ell(g, HX + 4.6, -5.6, 7, 7, '#ffe0a0'); g.globalAlpha = 1;
  part(g, p => { p.moveTo(HX + 1.4, -9.6); p.quadraticCurveTo(HX + 4.6, -11, HX + 7.8, -9.6); p.quadraticCurveTo(HX + 9.4, -5.4, HX + 7.8, -1.6); p.quadraticCurveTo(HX + 4.6, -0.4, HX + 1.4, -1.6); p.quadraticCurveTo(HX - 0.2, -5.4, HX + 1.4, -9.6); p.closePath(); }, '#f3e2b0', E(HX + 6, -4.6, 2.6, 4.4), { shc: '#e0c080', lw: 1 });
  for (const y of [-7, -4]) curve(g, p => { p.moveTo(HX + 0.8, y); p.quadraticCurveTo(HX + 4.6, y + 0.8, HX + 8.4, y); }, '#b8322a', 0.7);
}
// 감투 도깨비: 머리 위의 해진 도깨비감투 (쓰면 모습이 감춰진다)
export function gamtuCap(g) {
  part(g, p => { p.moveTo(-11.6, -48.6); p.bezierCurveTo(-12.6, -61, 12.6, -61, 11.6, -48.6); p.quadraticCurveTo(0, -46, -11.6, -48.6); p.closePath(); }, '#24222a', P(3, -62, 13, -62, 13, -46, 4, -46), { hi: E(-4.6, -56, 3.4, 1.6), hic: '#4a4652', lw: 1.2 });
  curve(g, p => { p.moveTo(-11.4, -50.4); p.quadraticCurveTo(0, -47.6, 11.4, -50.4); }, '#4a4652', 1.4);
  rr(g, 4.4, -57, 4.4, 3.4, 0.6, '#5a4a3a', INK, 0.6); for (const x of [5.2, 6.6, 8]) line(g, [x, -57.6, x, -53], INK, 0.4);   // 기운 자리
  part(g, E(-0.6, -59.2, 2.4, 1.6), '#24222a', null, { lw: 0.9 });   // 꼭지
}
// 손각시: 혼례 족두리와 연지곤지 (모자 자리에 그린다)
HATS.jokduri = (g, o) => {
  if (HATS.jjok) HATS.jjok(g, o);
  for (const [x, y] of [[-5.2, -38.6], [5.2, -38.6], [0, -46.6]]) ell(g, x, y, x ? 1.0 : 0.8, x ? 1.0 : 0.8, '#d8352a');
  part(g, P(-6.6, -52.6, -4.4, -57.6, 4.4, -57.6, 6.6, -52.6, 4.6, -51.4, -4.6, -51.4), '#1f1e26', P(1, -58, 7, -58, 7, -51, 2, -51), { hi: R(-4, -57, 2, 5), hic: '#4a4652', lw: 1 });
  for (const [x, c] of [[-3.4, '#c8402f'], [0, '#e0b23c'], [3.4, '#2f4d7e']]) ell(g, x, -54.6, 1.1, 1.1, c, INK, 0.4);
  line(g, [0, -57.6, 0, -60.6], INK, 0.8); ell(g, 0, -61.2, 1.4, 1.4, '#e0b23c', INK, 0.5);
  for (const s of [-1, 1]) { line(g, [s * 6.2, -52.6, s * 7.6, -46], '#e0b23c', 0.7); ell(g, s * 7.6, -45.6, 0.8, 0.8, '#c8402f', INK, 0.3); }
};
