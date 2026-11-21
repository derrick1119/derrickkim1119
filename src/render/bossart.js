// 고개마다의 두목과 소품 그림: 구미호의 꼬리, 구렁이·이무기, 역신, 염라대왕의 면류관, 종·여의주·업경대
// (인형 좌표: 발밑이 y = 0, 머리가 y ≈ -45. 다른 인형 그림과 같은 종이 오림 방식)
import { TAU, INK, RED, OCHRE, ell, rr, line, path, poly } from './draw.js';
import { part, curve, rope, E, R, P, dk, lt, fox, HATS, WHITE, WOOD, WOODD } from './figures.js';

const BRASS = '#c9962e', BRONZE = '#6f8a78', BRONZED = '#4f6a5c';

// ── 구미호: 여우 몸에 꼬리 n 개 (끝이 붉다). 꼬리 수마다 그림을 따로 굽는다 ──
export function gumiho(g, o = {}) {
  const n = o.tails === undefined ? 9 : o.tails, fur = '#f8f3ea';
  for (let i = 0; i < n; i++) {
    const a = (i - (n - 1) / 2) * (n > 6 ? 0.34 : 0.4), far = Math.abs(i - (n - 1) / 2) > 2;
    g.save(); g.translate(0, -9); g.rotate(a);
    part(g, p => { p.moveTo(-3, 0); p.bezierCurveTo(-10, -14, -8.4, -30, 0, -40); p.bezierCurveTo(8.4, -30, 10, -14, 3, 0); p.closePath(); }, far ? dk(fur, 0.08) : fur, P(0.6, -42, 11, -42, 11, 1, 1.6, 1), { k: 0.1, lw: 1.1 });
    part(g, p => { p.moveTo(-4.6, -27); p.quadraticCurveTo(-1.6, -32, 0, -40); p.quadraticCurveTo(1.6, -32, 4.6, -27); p.quadraticCurveTo(0, -30.6, -4.6, -27); p.closePath(); }, '#c8402f', null, { lw: 0.8 });
    g.restore();
  }
  fox(g, Object.assign({ noTail: true }, o));
  // 이마의 붉은 점과 목의 구슬 (여우 구슬)
  ell(g, 0, -18.2, 2.3, 2.3, '#8fd3e8', INK, 0.8); ell(g, -0.7, -18.9, 0.8, 0.8, '#eef9ff');
}

// ── 구렁이 / 이무기: 똬리 튼 몸 위로 목을 세웠다. imugi 는 뿔과 수염, 등지느러미가 돋았다 ──
export function serpent(g, o = {}) {
  const C = o.imugi ? '#3f6f8a' : '#6e7f3c', B = o.imugi ? '#cfe3e6' : '#dcc98a', S = o.imugi ? '#27485c' : '#3d4a22';
  const ring = (x, y, rx, ry) => {
    part(g, E(x, y, rx, ry), C, E(x + rx * 0.3, y + ry * 0.5, rx, ry), { k: 0.24, lw: 1.3 });
    part(g, p => { p.ellipse(x, y + ry * 0.42, rx * 0.82, ry * 0.46, 0, 0, Math.PI); }, B, null, { lw: 0.8 });
    for (let i = -2; i <= 2; i++) poly(g, [x + i * rx * 0.34, y - ry * 0.72, x + i * rx * 0.34 + rx * 0.1, y - ry * 0.3, x + i * rx * 0.34, y + ry * 0.06, x + i * rx * 0.34 - rx * 0.1, y - ry * 0.3], S);
  };
  // 꼬리 끝
  rope(g, p => { p.moveTo(17, -4); p.quadraticCurveTo(29, -6, 27, -17); }, C, 3.4);
  ring(0, -6.5, 21, 8.6); ring(-1, -17, 16.6, 7.4); ring(1, -26.4, 12, 6);
  // 세운 목
  const neck = p => { p.moveTo(3, -29); p.bezierCurveTo(13, -38, 9, -50, -3, -52); };
  curve(g, neck, INK, 12.6); curve(g, neck, C, 10); curve(g, p => { p.moveTo(5.4, -31); p.bezierCurveTo(13.6, -39, 10.6, -47.6, 1, -50.6); }, B, 3.4);
  if (o.imugi) for (const [x, y, a] of [[10.6, -36.6, 0.9], [11, -43.6, 0.3], [6.6, -50.4, -0.5]]) { g.save(); g.translate(x, y); g.rotate(a); poly(g, [-2.4, 0, 0, -6.4, 2.4, 0], '#8fd3e8', INK, 0.9); g.restore(); }
  // 머리
  part(g, p => { p.moveTo(2.6, -47.4); p.quadraticCurveTo(1.6, -58.6, -8.6, -59); p.quadraticCurveTo(-19, -58.6, -21.6, -52.4); p.quadraticCurveTo(-19.6, -47, -9, -46.4); p.quadraticCurveTo(-2, -45.6, 2.6, -47.4); p.closePath(); }, C, P(-22, -51.6, 3, -51.6, 3, -45, -22, -45), { k: 0.22, lw: 1.3 });
  part(g, p => { p.moveTo(-20.6, -51); p.quadraticCurveTo(-12, -49.4, -3, -49.6); p.quadraticCurveTo(-10, -45.8, -19.6, -47.6); p.closePath(); }, B, null, { lw: 0.8 });
  if (o.blink) curve(g, p => { p.moveTo(-13.4, -54.4); p.lineTo(-8.6, -53.6); }, INK, 1.5);
  else { part(g, p => { p.moveTo(-14.4, -54.6); p.quadraticCurveTo(-11, -57.6, -7.6, -54); p.quadraticCurveTo(-11, -52.6, -14.4, -54.6); p.closePath(); }, '#f6c84a', null, { lw: 0.9 }); ell(g, -11, -54.6, 0.75, 1.5, INK); }
  line(g, [-15.4, -56.6, -7, -55.6], S, 1.5); ell(g, -19.4, -53.6, 0.7, 0.5, INK);
  // 갈라진 혀
  curve(g, p => { p.moveTo(-21, -50.4); p.lineTo(-26.4, -49.4); p.lineTo(-29.6, -51.6); }, RED, 1.2); curve(g, p => { p.moveTo(-26.4, -49.4); p.lineTo(-29.6, -47.6); }, RED, 1.2);
  if (o.imugi) {
    for (const s of [0, 1]) { rope(g, p => { p.moveTo(-6 + s * 4, -58.4); p.quadraticCurveTo(-3 + s * 5, -66, 2 + s * 5, -67.6); }, '#e9dfc4', 1.8); rope(g, p => { p.moveTo(-2.4 + s * 4.4, -63.6); p.lineTo(-5 + s * 4, -67); }, '#e9dfc4', 1.2); }
    curve(g, p => { p.moveTo(-19.6, -50); p.quadraticCurveTo(-25, -42, -21, -37); }, '#e9dfc4', 1.1); curve(g, p => { p.moveTo(-16.6, -48.6); p.quadraticCurveTo(-18, -41, -13, -38.6); }, '#e9dfc4', 1.1);
  }
}

// ── 역신: 얽은 자국이 난 탈 같은 얼굴에 긴 소매를 늘어뜨린 병 귀신 ──
export function plagueSpirit(g, o = {}) {
  const C = '#55604a', D = '#39422f', F = '#e6dfc6';
  g.globalAlpha = 0.3; for (const [x, y, r] of [[-15, -5, 9], [14, -4, 10], [0, -1, 13]]) ell(g, x, y, r, r * 0.45, '#8aa45a'); g.globalAlpha = 1;
  // 늘어진 소매
  for (const s of [-1, 1]) part(g, p => { p.moveTo(s * 8, -33); p.quadraticCurveTo(s * 23, -31, s * 22.6, -15); p.lineTo(s * 25, -3); p.lineTo(s * 19.6, -7.6); p.lineTo(s * 17, -2); p.lineTo(s * 14.6, -12); p.quadraticCurveTo(s * 13, -22, s * 7, -24); p.closePath(); }, C, s > 0 ? P(15, -34, 26, -34, 26, 0, 17, 0) : null, { k: 0.26, lw: 1.2 });
  // 해진 도포
  part(g, p => { p.moveTo(-12.6, -2); p.lineTo(-9, -6.4); p.lineTo(-5.6, -1); p.lineTo(-1.6, -6); p.lineTo(2, -0.6); p.lineTo(6, -6.4); p.lineTo(9.6, -1.6); p.lineTo(13, -5); p.quadraticCurveTo(13.6, -24, 9.6, -36); p.lineTo(-9.6, -36); p.quadraticCurveTo(-13.6, -24, -12.6, -2); p.closePath(); }, C, P(3, -37, 15, -37, 15, 0, 5, 0), { k: 0.24, lw: 1.3 });
  line(g, [-6, -34, 5, -22], D, 1.4); line(g, [5, -22, -4, -8], D, 1); for (const y of [-16, -10]) rr(g, -3, y, 6, 2.2, 1, '#8a2a26', INK, 0.6);
  // 탈 같은 얼굴
  part(g, p => { p.moveTo(-9.6, -42); p.quadraticCurveTo(-10.6, -54.6, 0, -54.6); p.quadraticCurveTo(10.6, -54.6, 9.6, -42); p.quadraticCurveTo(7.4, -32.6, 0, -31.6); p.quadraticCurveTo(-7.4, -32.6, -9.6, -42); p.closePath(); }, F, P(3.6, -56, 12, -56, 12, -30, 0.6, -30, 6, -38), { k: 0.16, lw: 1.3 });
  for (const [x, y, r] of [[-6, -37.6, 1.1], [-3.4, -34.6, 0.9], [5.6, -36.4, 1.2], [7, -41, 0.8], [-7.4, -43, 0.9], [2.6, -50.6, 0.9], [-4.4, -50.4, 1]]) ell(g, x, y, r, r, '#b0473a');
  for (const s of [-1, 1]) { if (o.blink) curve(g, p => { p.moveTo(s * 2, -44.4); p.lineTo(s * 7, -45.6); }, INK, 1.4); else { part(g, p => { p.moveTo(s * 1.6, -44); p.quadraticCurveTo(s * 4.6, -48.6, s * 7.6, -45.6); p.quadraticCurveTo(s * 4.6, -42.6, s * 1.6, -44); p.closePath(); }, '#2a2a22', null, { lw: 0.8 }); ell(g, s * 4.6, -45.2, 1.1, 1.3, '#b8d95a'); } line(g, [s * 1.4, -48, s * 7.6, -50.4], INK, 1.5); }
  curve(g, p => { p.moveTo(-5, -38.4); p.quadraticCurveTo(0, -35, 5, -38.4); }, INK, 1.2); for (const x of [-2.4, 0, 2.4]) line(g, [x, -37.4, x, -36], INK, 0.7);
  // 헝클어진 머리
  for (const [x, a] of [[-8, -0.7], [-4, -0.3], [0, 0], [4, 0.3], [8, 0.7]]) { g.save(); g.translate(x, -53); g.rotate(a); part(g, P(-2, 0, 0, -9, 2, 0), '#2b2a30', null, { lw: 0.9 }); g.restore(); }
}

// ── 염라대왕의 면류관: 검은 평천판에 구슬 줄을 늘어뜨렸다 (인형의 모자로 쓴다) ──
HATS.myeonryu = g => {
  part(g, R(-7.4, -57, 14.8, 7.6), '#24232a', R(1.6, -57, 6, 7.6), { lw: 1.1 }); rr(g, -7.8, -51.4, 15.6, 2.6, 1, BRASS, INK, 0.8);
  g.save(); g.translate(0, -58.6); g.rotate(-0.06);
  part(g, R(-17.6, -2.6, 35.2, 4.2), '#1f1e25', R(-17.6, -0.2, 35.2, 2), { lw: 1.2 }); rr(g, -17.6, -2.6, 35.2, 1.2, 0.5, BRASS);
  for (const x of [-15, -11, -7, 7, 11, 15]) { line(g, [x, 1.6, x, 11], '#3a3640', 0.6); for (let k = 0; k < 3; k++) ell(g, x, 4 + k * 3, 1.05, 1.05, [RED, '#f6efdc', '#3f8a6a'][k], INK, 0.4); }
  g.restore();
  for (const s of [-1, 1]) line(g, [s * 7.6, -49.6, s * 6, -37], '#8a2a26', 1);
};

// ── 소품 ──
// 종: 나무 틀에 건 범종과 당목
export function bell(g) {
  for (const x of [-21, 21]) { part(g, R(x - 2.6, -62, 5.2, 62), WOODD, R(x + 0.4, -62, 2.2, 62), { lw: 1.2 }); part(g, R(x - 5, -3, 10, 4), dk(WOODD, 0.2), null, { lw: 1 }); }
  part(g, R(-26, -66, 52, 5.6), WOOD, R(-26, -63, 52, 2.6), { lw: 1.2 }); part(g, P(-29, -66, 0, -75, 29, -66), '#3a3640', P(0, -75, 29, -66, 0, -66), { lw: 1.2 });
  line(g, [0, -60.6, 0, -55], INK, 2.2); ell(g, 0, -55.6, 3, 2.2, BRONZED, INK, 1);
  part(g, p => { p.moveTo(-9.6, -53); p.quadraticCurveTo(-14.6, -36, -15.6, -17); p.lineTo(15.6, -17); p.quadraticCurveTo(14.6, -36, 9.6, -53); p.quadraticCurveTo(0, -56.6, -9.6, -53); p.closePath(); }, BRONZE, P(3, -57, 17, -57, 17, -16, 5, -16), { k: 0.24, hi: P(-11.6, -48, -9.6, -48, -12, -20, -14, -20), hk: 0.3, lw: 1.4 });
  rr(g, -16.6, -19.6, 33.2, 4, 1.4, BRONZED, INK, 1); for (const y of [-47, -43.6]) curve(g, p => { p.moveTo(-10.6, y); p.quadraticCurveTo(0, y + 2.6, 10.6, y); }, BRONZED, 1);
  ell(g, 0, -31, 4.6, 4.6, lt(BRONZE, 0.3), INK, 1); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; line(g, [Math.cos(a) * 1.6, -31 + Math.sin(a) * 1.6, Math.cos(a) * 4, -31 + Math.sin(a) * 4], BRONZED, 0.7); }
  // 당목 (종을 치는 통나무)
  line(g, [-21, -62, -27, -34], '#d9c39a', 1); line(g, [-21, -62, -33, -34], '#d9c39a', 1); part(g, R(-38, -36.6, 20, 6), WOOD, R(-38, -33.6, 20, 3), { lw: 1.1 }); rr(g, -19.6, -37.2, 2.6, 7.2, 1, BRASS, INK, 0.7);
}
// 여의주: 불꽃에 싸인 푸른 구슬
export function pearl(g) {
  for (const [a, l] of [[-0.7, 15], [0, 20], [0.7, 15], [-1.5, 10], [1.5, 10]]) { g.save(); g.translate(0, -24); g.rotate(a); part(g, p => { p.moveTo(-4, -8); p.quadraticCurveTo(-5, -8 - l * 0.6, 1.6, -9 - l); p.quadraticCurveTo(1, -8 - l * 0.5, 4, -8); p.closePath(); }, '#ffb347', null, { lw: 1 }); g.restore(); }
  g.globalAlpha = 0.35; ell(g, 0, -24, 15, 15, '#bfe9f6'); g.globalAlpha = 1;
  part(g, E(0, -24, 10.6, 10.6), '#4fb3d9', E(3.4, -21, 9, 9), { k: 0.24, hi: E(-3.6, -28, 3.4, 2.4), hic: '#eefaff', lw: 1.4 });
  curve(g, p => { p.moveTo(-5.6, -20); p.quadraticCurveTo(0, -15.6, 6, -21); }, '#bfe9f6', 1);
}
// 업경대: 불꽃 무늬 틀에 건 둥근 거울
export function mirror(g) {
  part(g, P(-13, 0, -9, -8, 9, -8, 13, 0), '#7a1f1c', P(0, -8, 9, -8, 13, 0, 0, 0), { lw: 1.2 }); part(g, R(-2.6, -22, 5.2, 14), '#7a1f1c', R(0.4, -22, 2.2, 14), { lw: 1.1 }); rr(g, -6, -10.6, 12, 3.2, 1.2, BRASS, INK, 0.8);
  for (let i = 0; i < 9; i++) { const a = -2.2 + i / 8 * 4.4; g.save(); g.translate(Math.sin(a) * 17, -38 - Math.cos(a) * 17); g.rotate(a); poly(g, [-3.2, 0, 0, -8, 3.2, 0], i % 2 ? '#ff9a2e' : '#c8402f', INK, 0.9); g.restore(); }
  part(g, E(0, -38, 17.6, 17.6), '#7a1f1c', E(4, -34, 16, 16), { lw: 1.4 }); ell(g, 0, -38, 14.6, 14.6, BRASS, INK, 1);
  part(g, E(0, -38, 12.4, 12.4), '#dfe8ea', E(4, -34, 11, 11), { k: 0.14, hi: P(-9, -44, -4, -48, 4, -32, -1, -29), hic: '#ffffff', lw: 1 });
}
