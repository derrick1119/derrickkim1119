// 빌드 축의 패(data/cards_axis.js)와 새 보물(data/relics.js)의 아이콘 — icons.js 와 같은 종이 오림 그림체 (가운데가 원점, 대략 ±22 안)
// 전설 보물은 금빛 빛살(legend), 두목 보물은 검붉은 매듭(bossKnot)을 함께 그린다
import { TAU, INK, PAPER, RED, REDD, INDIGO, NAVY, TEAL, OCHRE, SKIN, st, ell, rr, poly, line, path } from './draw.js';
import { WHITE, BLACK, STEEL, IRON, GREY, WOOD, WOODD, GOLD, BRASS, FLAME, GLOW, STONE, STRAW, LEAF, LEAFD, PURPLE, ICE, WATER, PI, cord, flame, arrow, coin, rays, spark, cloud, paperTal, rattan, tassel, taegeuk, book } from './icons.js';

const BLUEF = '#5fb6d9', BLUEG = '#d6f3fb', ONGGI = '#8a5a34', BAMBOO = '#7fae5a', BAMBOOD = '#4f7a3a', CRIMSON = '#7a1f1c', ROSE = '#e08aa0';
// 전설: 뒤에 번지는 금빛과 빛살 (먼저 그린다)
const legend = g => { g.save(); g.globalAlpha = 0.32; ell(g, 0, 0, 23, 23, GLOW); g.restore(); rays(g, 0, 0, 19, 25, 12, GOLD, 1.5, PI / 12); };
// 두목 보물: 오른쪽 아래의 검붉은 매듭 (마지막에 그린다)
const bossKnot = g => { g.save(); g.translate(17, 13); g.rotate(PI / 4); rr(g, -3, -3, 6, 6, 1.2, CRIMSON, INK, 0.9); g.restore(); path(g, p => { p.moveTo(15.6, 16); p.lineTo(14, 23); p.lineTo(20, 23); p.lineTo(18.4, 16); p.closePath(); }, CRIMSON, INK, 0.8); };
// 대나무 한 줄기 (마디와 잎)
const bamboo = (g, x0, y0, x1, y1, w = 3.4, tip) => {
  line(g, [x0, y0, x1, y1], INK, w + 1.6); line(g, [x0, y0, x1, y1], BAMBOO, w); const n = 4;
  for (let i = 1; i < n; i++) { const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t, a = Math.atan2(y1 - y0, x1 - x0) + PI / 2; line(g, [x - Math.cos(a) * w * 0.7, y - Math.sin(a) * w * 0.7, x + Math.cos(a) * w * 0.7, y + Math.sin(a) * w * 0.7], BAMBOOD, 1); }
  if (tip) { const a = Math.atan2(y1 - y0, x1 - x0); poly(g, [x1 + Math.cos(a + PI / 2) * w * 0.6, y1 + Math.sin(a + PI / 2) * w * 0.6, x1 + Math.cos(a) * 6, y1 + Math.sin(a) * 6, x1 - Math.cos(a + PI / 2) * w * 0.6, y1 - Math.sin(a + PI / 2) * w * 0.6], '#c9d98a', INK, 0.8); }
};
const leaf = (g, x, y, a, l, col = BAMBOO) => { g.save(); g.translate(x, y); g.rotate(a); path(g, p => { p.moveTo(0, 0); p.quadraticCurveTo(l * 0.5, -l * 0.22, l, 0); p.quadraticCurveTo(l * 0.5, l * 0.22, 0, 0); p.closePath(); }, col, INK, 0.8); g.restore(); };
// 도깨비불: 혀가 셋 갈라진 푸른 불 (물방울처럼 보이지 않게 끝이 갈라지고 흔들린다)
const wisp = (g, x, y, r, c1 = BLUEF, c2 = BLUEG) => {
  path(g, p => { p.moveTo(x - r, y + r * 0.2); p.quadraticCurveTo(x - r * 1.3, y - r * 0.9, x - r * 0.7, y - r * 1.6); p.quadraticCurveTo(x - r * 0.55, y - r * 0.9, x - r * 0.15, y - r * 1.0); p.quadraticCurveTo(x - r * 0.3, y - r * 2.1, x + r * 0.25, y - r * 2.6); p.quadraticCurveTo(x + r * 0.35, y - r * 1.4, x + r * 0.6, y - r * 1.2); p.quadraticCurveTo(x + r * 0.9, y - r * 1.6, x + r * 1.15, y - r * 1.9); p.quadraticCurveTo(x + r * 1.4, y - r * 0.5, x + r, y + r * 0.2); p.quadraticCurveTo(x, y + r * 1.3, x - r, y + r * 0.2); p.closePath(); }, c1, INK, 1.1);
  path(g, p => { p.moveTo(x - r * 0.5, y + r * 0.1); p.quadraticCurveTo(x - r * 0.6, y - r * 0.7, x, y - r * 1.3); p.quadraticCurveTo(x + r * 0.6, y - r * 0.7, x + r * 0.5, y + r * 0.1); p.quadraticCurveTo(x, y + r * 0.7, x - r * 0.5, y + r * 0.1); p.closePath(); }, c2);
  ell(g, x - r * 0.15, y - r * 0.25, r * 0.18, r * 0.3, '#fff');
};
// 옹기 항아리
const jar = (g, x, y, s, col = ONGGI) => { path(g, p => { p.moveTo(x - 7 * s, y - 12 * s); p.quadraticCurveTo(x - 17 * s, y - 6 * s, x - 13 * s, y + 8 * s); p.quadraticCurveTo(x - 10 * s, y + 14 * s, x, y + 14 * s); p.quadraticCurveTo(x + 10 * s, y + 14 * s, x + 13 * s, y + 8 * s); p.quadraticCurveTo(x + 17 * s, y - 6 * s, x + 7 * s, y - 12 * s); p.closePath(); }, col, INK, 1.3); rr(g, x - 8 * s, y - 15 * s, 16 * s, 4 * s, 1.5 * s, col, INK, 1.1); g.globalAlpha = 0.3; ell(g, x - 6 * s, y - 3 * s, 3 * s, 6 * s, '#fff'); g.globalAlpha = 1; line(g, [x - 12 * s, y + 2 * s, x + 12 * s, y + 2 * s], 'rgba(38,42,54,0.35)', 1); };
// 놋쇠 꽹과리
const gongS = (g, x, y, r) => { ell(g, x, y, r, r, BRASS, INK, 1.3); ell(g, x, y, r * 0.72, r * 0.72, GOLD, null); ell(g, x - r * 0.25, y - r * 0.25, r * 0.22, r * 0.14, 'rgba(255,255,255,0.6)'); };
// 작은 말 머리 (옆모습, 오른쪽을 본다)
const horseHead = (g, x, y, s, col = '#8a5a34', mane = BLACK) => {
  path(g, p => { p.moveTo(x - 8 * s, y + 14 * s); p.quadraticCurveTo(x - 10 * s, y - 4 * s, x - 2 * s, y - 12 * s); p.lineTo(x + 1 * s, y - 17 * s); p.lineTo(x + 3 * s, y - 11 * s); p.quadraticCurveTo(x + 10 * s, y - 8 * s, x + 14 * s, y + 1 * s); p.quadraticCurveTo(x + 15 * s, y + 5 * s, x + 11 * s, y + 6 * s); p.quadraticCurveTo(x + 4 * s, y + 4 * s, x + 2 * s, y + 6 * s); p.quadraticCurveTo(x + 2 * s, y + 12 * s, x + 4 * s, y + 14 * s); p.closePath(); }, col, INK, 1.3);
  path(g, p => { p.moveTo(x - 2 * s, y - 12 * s); p.quadraticCurveTo(x - 12 * s, y - 6 * s, x - 9 * s, y + 13 * s); p.lineTo(x - 6 * s, y + 13 * s); p.quadraticCurveTo(x - 8 * s, y - 3 * s, x - 1 * s, y - 9 * s); p.closePath(); }, mane, INK, 0.9);
  ell(g, x + 4 * s, y - 5 * s, 1.5 * s, 1.5 * s, INK); ell(g, x + 12 * s, y + 2.6 * s, 0.9 * s, 0.9 * s, INK);
};
// 화염각을 두른 깃발 (조선 군기의 불꽃 가장자리)
const flameFlag = (g, x, y, w, h, field, edge) => {
  path(g, p => { p.moveTo(x, y); p.lineTo(x + w, y); for (let i = 0; i < 4; i++) { const yy = y + (i + 0.5) * h / 4; p.lineTo(x + w + 4, yy); p.lineTo(x + w, y + (i + 1) * h / 4); } p.lineTo(x, y + h); p.closePath(); }, edge, INK, 1.1);
  rr(g, x, y + 2, w - 2, h - 4, 0.5, field, INK, 0.9);
};
// 손으로 든 꼬챙이 같은 막대 (자루)
const pole = (g, x0, y0, x1, y1, col = WOODD, w = 2.4) => { line(g, [x0, y0, x1, y1], INK, w + 1.6); line(g, [x0, y0, x1, y1], col, w); };

// ───────── 빌드 축의 패 ─────────
export const AXIS_CARD_ART = {
  // 사격진
  pyeonjeon(g) { // 편전 세례: 대롱(통아)에서 튀어나가는 짧은 화살 셋
    g.save(); g.translate(-8, 9); g.rotate(-PI / 4); rr(g, -14, -3.4, 22, 6.8, 3.2, '#c9a06a', INK, 1.2); line(g, [-12, 0, 6, 0], '#8a6a3a', 1); for (const x of [-9, -1]) line(g, [x, -3.4, x, 3.4], '#7a4a2c', 1.2); g.restore();
    cord(g, p => { p.moveTo(-17, 14); p.quadraticCurveTo(-22, 20, -15, 21); }, RED, 1.1);
    for (const [x, y] of [[-1, -1], [7, -9], [11, 2]]) arrow(g, x, y, PI / 4, 11, { head: '#d9dde0' });
    for (const [x, y] of [[-6, -9], [2, -17]]) line(g, [x, y, x - 5, y + 5], INK, 1);
  },
  hwasal(g) { // 화살 보급: 붉은 끈으로 묶은 화살 다발
    for (const [x, a] of [[-6, -0.2], [-3, -0.08], [0, 0], [3, 0.08], [6, 0.2]]) arrow(g, x, 18, a, 34);
    rr(g, -9, 4, 18, 5, 1.5, RED, INK, 1); line(g, [0, 9, -4, 15], RED, 1.6); line(g, [0, 9, 4, 15], RED, 1.6);
    spark(g, 15, -10, 3.4); spark(g, -15, -4, 2.6);
  },
  sadae(g) { // 사대 세우기: 활터 정자의 처마와 세워 둔 활
    path(g, p => { p.moveTo(-21, -8); p.quadraticCurveTo(-12, -11, -9, -17); p.lineTo(9, -17); p.quadraticCurveTo(12, -11, 21, -8); p.quadraticCurveTo(10, -9, 0, -9); p.quadraticCurveTo(-10, -9, -21, -8); p.closePath(); }, '#5a5346', INK, 1.2);
    rr(g, -10, -17.6, 20, 2, 1, '#3f6b5c'); for (const x of [-13, 11]) rr(g, x, -9, 3, 24, 0.6, '#a8322a', INK, 1); rr(g, -17, 14, 34, 4, 1, STONE, INK, 1);
    g.beginPath(); g.moveTo(-3, -5); g.quadraticCurveTo(6, 4, -3, 12); st(g, INK, 3.2); g.beginPath(); g.moveTo(-3, -5); g.quadraticCurveTo(6, 4, -3, 12); st(g, '#4a3a2a', 1.8); line(g, [-3, -5, -3, 12], '#e9e2cf', 0.8);
    arrow(g, 6, 12, 0, 16);
  },
  cheonbo(g) { // 천보총: 긴 총신과 개머리, 총구의 불
    g.save(); g.rotate(-0.42);
    path(g, p => { p.moveTo(-22, 2); p.lineTo(-12, -2); p.lineTo(-4, -2); p.lineTo(-4, 3); p.lineTo(-13, 4); p.lineTo(-21, 8); p.closePath(); }, WOODD, INK, 1.2);
    rr(g, -6, -3.2, 28, 3.8, 1.4, IRON, INK, 1.1); for (const x of [-1, 8, 16]) rr(g, x, -3.8, 1.6, 5, 0.4, BRASS, INK, 0.6); line(g, [-6, -1.4, 20, -1.4], 'rgba(255,255,255,0.3)', 0.8);
    cord(g, p => { p.moveTo(-9, 3); p.quadraticCurveTo(-8, 10, -3, 8); }, RED, 1); g.restore();
    flame(g, 20, -12, 4.2); for (const [x, y, r] of [[13, -20, 3.4], [21, -21, 2.6]]) ell(g, x, y, r, r * 0.8, '#d9d4c8', INK, 0.9);
  },
  // 돌격
  nabal(g) { // 나발 돌격: 길게 뻗은 놋쇠 나발과 울림
    path(g, p => { p.moveTo(-20, -2); p.lineTo(4, -3); p.quadraticCurveTo(12, -4, 16, -10); p.lineTo(16, 10); p.quadraticCurveTo(12, 4, 4, 3); p.lineTo(-20, 2); p.closePath(); }, GOLD, INK, 1.3);
    rr(g, -21, -2.6, 4, 5.2, 1, BRASS, INK, 0.9); for (const x of [-10, -2]) rr(g, x, -3.4, 2, 6.8, 0.6, BRASS, INK, 0.7); ell(g, 16, 0, 2.4, 10, '#a07a24', INK, 1);
    tassel(g, -8, 3, 10); for (const r of [6, 10]) { g.beginPath(); g.arc(17, 0, r, -0.8, 0.8); st(g, INK, 1.3); }
  },
  malbal(g) { // 말발굽: 땅에 깊게 찍힌 말굽 자국 둘과 튀는 흙, 내리찍는 굽
    ell(g, 0, 10, 21, 9, '#c9a878', INK, 1.3); for (const [x0, y0, x1, y1] of [[-14, 8, -20, 4], [12, 13, 19, 16], [-2, 16, 2, 19]]) line(g, [x0, y0, x1, y1], 'rgba(38,42,54,0.55)', 1.1);
    for (const [x, y, a] of [[-8, 9, -0.2], [7, 11, 0.15]]) { g.save(); g.translate(x, y); g.rotate(a); path(g, p => { p.moveTo(-6, 4); p.quadraticCurveTo(-7, -5, 0, -5); p.quadraticCurveTo(7, -5, 6, 4); p.lineTo(3, 4); p.quadraticCurveTo(4, -2, 0, -2); p.quadraticCurveTo(-4, -2, -3, 4); p.closePath(); }, '#4a3a2a', INK, 0.9); g.restore(); }
    g.save(); g.translate(4, -12); g.rotate(-0.35); rr(g, -4, -14, 8, 12, 2, '#8a5a34', INK, 1.1); path(g, p => { p.moveTo(-5, -3); p.lineTo(-7, 2); p.lineTo(-3, 0); p.lineTo(0, 3); p.lineTo(3, 0); p.lineTo(7, 2); p.lineTo(5, -3); p.closePath(); }, '#f0e2c0', INK, 0.9); path(g, p => { p.moveTo(-6, 1); p.lineTo(6, 1); p.lineTo(7, 7); p.quadraticCurveTo(0, 9, -7, 7); p.closePath(); }, '#2b2a30', INK, 1.1); g.restore();
    for (const [x, y] of [[-12, -10], [-15, -4], [16, -14]]) line(g, [x, y, x + 4, y - 4], INK, 1.3); for (const [x, y, r] of [[-17, 2, 2.6], [19, 4, 2.4], [-4, 0, 1.8]]) ell(g, x, y, r, r * 0.8, '#d9c9a0', INK, 0.8);
  },
  gimamb(g) { // 기마 매복: 수풀 뒤에서 고개를 내민 군마와 창끝
    pole(g, 8, 6, 15, -21, WOODD, 1.8); poly(g, [15, -21, 13, -27, 18, -22], STEEL, INK, 0.9); line(g, [13, -18, 17, -17], RED, 2);
    horseHead(g, -2, -2, 0.9); rr(g, -4, -18, 2.6, 6, 1, RED, INK, 0.7);
    for (const [x, r] of [[-15, 8], [-5, 9], [6, 8.6], [15, 7.4]]) ell(g, x, 14, r, r * 0.7, LEAF, INK, 1.2); for (const [x, y] of [[-14, 10], [-4, 9], [7, 10]]) line(g, [x, y, x + 2, y - 3], LEAFD, 1);
  },
  seonbong(g) { // 선봉 함성: 붉은 상모 단 투구와 앞으로 뻗는 기운
    rays(g, 0, -2, 17, 22, 7, RED, 1.8, -PI * 0.95, PI * 0.9);
    path(g, p => { p.moveTo(-12, 6); p.quadraticCurveTo(-13, -12, 0, -13); p.quadraticCurveTo(13, -12, 12, 6); p.closePath(); }, IRON, INK, 1.3); for (const x of [-6, 0, 6]) line(g, [x, -12, x * 1.4, 5], 'rgba(255,255,255,0.25)', 1);
    rr(g, -16, 5, 32, 4, 1.6, BLACK, INK, 1); rr(g, -2, -18, 4, 6, 1, BRASS, INK, 0.8); path(g, p => { p.moveTo(0, -18); p.quadraticCurveTo(-8, -22, -5, -14); p.quadraticCurveTo(0, -17, 0, -18); p.closePath(); }, RED, INK, 0.8);
    for (const y of [12, 17]) line(g, [-6, y, 8, y], INK, 1.3); poly(g, [8, 10, 13, 14.5, 8, 19], RED, INK, 0.8);
  },
  // 진지
  nokgak(g) { // 녹각 목책: 사슴뿔처럼 엇갈려 뻗은 뾰족한 가지 방책
    for (const [x, a] of [[-12, -0.5], [-12, 0.5], [0, -0.5], [0, 0.5], [12, -0.5], [12, 0.5]]) { g.save(); g.translate(x, 4); g.rotate(a); rr(g, -1.8, -18, 3.6, 24, 1, WOOD, INK, 1); poly(g, [-1.8, -18, 0, -23, 1.8, -18], '#e9d9b0', INK, 0.8); g.restore(); }
    rr(g, -20, 3, 40, 5.6, 2.4, WOODD, INK, 1.3); for (const x of [-14, -2, 10]) line(g, [x, 3.6, x + 3, 8], 'rgba(38,42,54,0.4)', 0.9);
    for (const [x, y] of [[-17, -8], [17, -8]]) { line(g, [x, y, x + (x < 0 ? -4 : 4), y - 5], INK, 2.6); line(g, [x, y, x + (x < 0 ? -4 : 4), y - 5], '#c9a06a', 1.4); }
  },
  deungpae(g) { // 등패 겹치기: 겹쳐 세운 등패 셋, 둘레의 가시
    for (const [x, y] of [[-10, 4], [10, 4], [0, -3]]) { rattan(g, x, y, 11); for (let i = 0; i < 6; i++) { const a = -PI * 0.95 + i / 5 * PI * 0.9; poly(g, [x + Math.cos(a - 0.12) * 10.6, y + Math.sin(a - 0.12) * 10.6, x + Math.cos(a) * 14, y + Math.sin(a) * 14, x + Math.cos(a + 0.12) * 10.6, y + Math.sin(a + 0.12) * 10.6], STEEL, INK, 0.7); } }
  },
  sasu(g) { // 사수하라: 성가퀴 위에 꽂은 깃발과 되살아나는 잎
    pole(g, 4, -2, 4, -24, WOODD, 1.6); poly(g, [4, -24, 18, -20, 4, -15], RED, INK, 1);
    for (const x of [-18, -8, 2, 12]) rr(g, x, -6, 7, 7, 0.6, STONE, INK, 1); rr(g, -19, 0, 38, 18, 1, '#b9b2a0', INK, 1.3);
    for (const [y, o] of [[6, 0], [12, 5]]) for (let x = -19 + o; x < 18; x += 10) line(g, [x, y, x + 8, y], 'rgba(38,42,54,0.35)', 0.9); for (let x = -14; x < 19; x += 10) line(g, [x, 0, x, 6], 'rgba(38,42,54,0.35)', 0.9);
    leaf(g, -15, -10, -2.2, 9, LEAF); leaf(g, -15, -10, -1.0, 8, LEAF);
  },
  hamjeong(g) { // 함정 구덩이: 뾰족한 말뚝이 박힌 구덩이와 덮었던 풀
    ell(g, 0, 6, 20, 10, '#3a2e26', INK, 1.4); ell(g, 0, 8, 16, 7, '#24201c');
    for (const x of [-10, -4, 2, 8]) { rr(g, x - 1.3, -2, 2.6, 12, 0.6, WOOD, INK, 0.8); poly(g, [x - 1.3, -2, x, -7, x + 1.3, -2], '#e9d9b0', INK, 0.7); }
    for (const [x, a] of [[-19, -0.6], [-13, -0.3], [14, 0.3], [19, 0.6]]) { g.save(); g.translate(x, 3); g.rotate(a); for (const d of [-2, 0, 2]) line(g, [d, 0, d * 1.6, -8], LEAFD, 1.2); g.restore(); }
    line(g, [-8, -12, 9, -16], STRAW, 2.4); line(g, [-6, -16, 10, -12], STRAW, 2.2);
  },
  // 화약
  hwajeon(g) { // 화전 일제: 틀에서 비스듬히 솟구치는 불화살 셋과 연기 꼬리
    for (const [x, y] of [[-12, 6], [-4, 9], [4, 12]]) { arrow(g, x, y, PI * 0.3, 20, { fire: true, shaft: '#c98a5a', fletch: '#f3c9a0' }); g.globalAlpha = 0.5; ell(g, x - 4, y + 4, 3.2, 2.4, '#d9d4c8'); g.globalAlpha = 1; }
    g.save(); g.translate(-6, 15); g.rotate(-0.3); rr(g, -14, -3, 24, 7, 1.5, WOODD, INK, 1.2); for (const x of [-10, -4, 2]) ell(g, x, 0.4, 1.6, 1.6, '#2a1a10'); g.restore();
  },
  chongtong(g) { // 총통 포격: 바퀴 달린 큰 총통과 날아가는 포탄
    g.save(); g.translate(-6, 6); g.rotate(-0.5); rr(g, -14, -6, 26, 12, 5, '#b8862a', INK, 1.4); for (const x of [-8, -1, 6]) rr(g, x, -6.6, 2.4, 13.2, 0.8, '#8a5f1c', INK, 0.7); rr(g, 11, -7, 4, 14, 1.4, GOLD, INK, 1); ell(g, -14, 0, 2.6, 4, '#8a5f1c', INK, 0.9); g.restore();
    for (const x of [-12, 2]) { ell(g, x, 14, 5.4, 5.4, WOOD, INK, 1.2); ell(g, x, 14, 1.6, 1.6, IRON); }
    for (let i = 0; i < 4; i++) ell(g, 6 + i * 3.4, -8 - i * 3, 0.9, 0.9, INK); ell(g, 19, -19, 3.6, 3.6, IRON, INK, 1); rays(g, 19, -19, 5, 8, 6, FLAME, 1.4);
  },
  yeonmak(g) { // 연막: 연기 단지에서 피어오르는 잿빛 구름
    path(g, p => { p.moveTo(-8, 8); p.quadraticCurveTo(-12, 20, 0, 20); p.quadraticCurveTo(12, 20, 8, 8); p.closePath(); }, '#6a5a4a', INK, 1.3); rr(g, -6, 5, 12, 4, 1.4, '#4a3a2a', INK, 1); line(g, [0, 5, 2, 1], INK, 1.2); flame(g, 2.6, -0.6, 2.2);
    cloud(g, -6, -9, 1.0, '#c6c2bc'); cloud(g, 7, -15, 0.9, '#d9d4cc'); cloud(g, 10, -2, 0.7, '#b9b4ac');
  },
  // 도술
  eoreum(g) { // 얼음 부적: 서리 낀 부적과 눈송이
    paperTal(g, -5, 2, 18, 34, '#dff1f7', BLUEF);
    for (const [x, y, r] of [[11, -11, 6.4], [13, 9, 4.2]]) { for (let i = 0; i < 3; i++) { const a = i / 3 * PI; line(g, [x - Math.cos(a) * r, y - Math.sin(a) * r, x + Math.cos(a) * r, y + Math.sin(a) * r], INK, 2.4); line(g, [x - Math.cos(a) * r, y - Math.sin(a) * r, x + Math.cos(a) * r, y + Math.sin(a) * r], ICE, 1.2); } ell(g, x, y, 1.4, 1.4, WHITE, INK, 0.6); }
    for (const [x, y] of [[-15, 17], [3, 19]]) poly(g, [x - 2, y, x, y - 5, x + 2, y], ICE, INK, 0.7);
  },
  byeorak(g) { // 벼락 부적: 구름에서 내려친 번개가 부적을 꿰뚫는다
    paperTal(g, 4, 6, 18, 30, WHITE, INDIGO); cloud(g, -6, -15, 0.95, '#7c8296');
    poly(g, [-4, -10, -12, 2, -6, 2, -11, 16, 2, -2, -4, -2, 1, -10], '#f0d264', INK, 1.2); spark(g, -14, 12, 2.8); spark(g, 16, -12, 2.4);
  },
  dungapbu(g) { // 둔갑 부적: 연기 소용돌이로 사라지는 부적과 나뭇잎
    g.save(); g.rotate(-0.2); paperTal(g, -7, 2, 16, 30, '#f3e7c8', PURPLE); g.restore();
    for (const r of [5, 9, 13]) { g.beginPath(); g.arc(9, -2, r, -PI * 0.2, PI * 1.1); st(g, INK, 2.6); g.beginPath(); g.arc(9, -2, r, -PI * 0.2, PI * 1.1); st(g, '#cbbfdc', 1.4); }
    leaf(g, 6, -18, -0.6, 10, LEAF); leaf(g, 14, 12, 0.5, 9, LEAFD);
  },
  bujeokbi(g) { // 부적 비: 쏟아지는 부적들과 땅의 불꽃
    for (const [x, y, a] of [[-12, -12, -0.3], [2, -16, 0.15], [13, -6, 0.35], [-4, 0, -0.1]]) { g.save(); g.translate(x, y); g.rotate(a); paperTal(g, 0, 0, 9, 15, '#f0d264', RED); g.restore(); }
    for (const [x, r] of [[-12, 4], [1, 5.2], [13, 4]]) flame(g, x, 17, r);
  },
  // 굿
  ssitgim(g) { // 씻김굿: 매듭 지은 긴 흰 베와 정화수
    cord(g, p => { p.moveTo(-20, -16); p.bezierCurveTo(-4, -22, -10, -2, 4, -6); p.bezierCurveTo(16, -10, 10, 8, 20, 4); }, WHITE, 4);
    for (const [x, y] of [[-8, -12], [8, -5]]) { ell(g, x, y, 3.4, 2.8, WHITE, INK, 1); line(g, [x - 1.6, y + 2, x - 3, y + 6], INK, 1); }
    path(g, p => { p.moveTo(-10, 8); p.quadraticCurveTo(-9, 18, 0, 18); p.quadraticCurveTo(9, 18, 10, 8); p.closePath(); }, WHITE, INK, 1.2); ell(g, 0, 8, 10, 3, WATER, INK, 1);
    for (const [x, y] of [[-14, 4], [14, 12], [-17, 14]]) path(g, p => { p.moveTo(x, y - 3); p.quadraticCurveTo(x + 2, y, x, y + 1.6); p.quadraticCurveTo(x - 2, y, x, y - 3); }, WATER, INK, 0.7);
  },
  jangdan(g) { // 신명 장단: 꽹과리와 채, 퍼지는 장단
    cord(g, p => { p.moveTo(-6, -14); p.quadraticCurveTo(-12, -18, -16, -12); }, RED, 1.2); gongS(g, -4, 0, 13); ell(g, -4, 0, 4, 4, null, 'rgba(38,42,54,0.3)', 1);
    g.save(); g.translate(12, -2); g.rotate(0.7); rr(g, -1.4, -2, 2.8, 20, 1, WOOD, INK, 1); ell(g, 0, -4, 3.6, 3.6, '#e9d9b0', INK, 1); g.restore();
    for (const r of [17, 21]) { g.beginPath(); g.arc(-4, 0, r, PI * 0.55, PI * 1.2); st(g, INK, 1.3); } spark(g, 15, -14, 3); spark(g, 18, 12, 2.4);
  },
  jakdu(g) { // 작두굿: 작두날 위의 오색 천과 기운
    rays(g, 0, -4, 16, 21, 7, GOLD, 1.4, -PI * 0.95, PI * 0.9);
    rr(g, -18, 10, 36, 8, 2, WOODD, INK, 1.3); for (const x of [-12, 10]) rr(g, x, 6, 4, 5, 1, IRON, INK, 0.9);
    path(g, p => { p.moveTo(-14, 7); p.quadraticCurveTo(0, 3, 16, 6); p.lineTo(16, 9); p.quadraticCurveTo(0, 8, -14, 10); p.closePath(); }, STEEL, INK, 1.2); line(g, [-12, 7.6, 14, 6.6], '#fff', 0.8);
    for (const [x, c] of [[-8, RED], [-3, GOLD], [2, '#2f4d7e'], [7, LEAF]]) path(g, p => { p.moveTo(x, 4); p.quadraticCurveTo(x + 3, -6, x - 1, -15); p.lineTo(x + 2, -15); p.quadraticCurveTo(x + 6, -6, x + 3, 4); p.closePath(); }, c, INK, 0.8);
  },
  ogu(g) { // 오구굿: 연꽃 등과 넋을 감싸는 보호의 고리
    g.setLineDash([3, 3]); g.beginPath(); g.arc(0, 0, 21, 0, TAU); st(g, TEAL, 1.6); g.setLineDash([]);
    g.save(); g.globalAlpha = 0.4; ell(g, 0, -2, 12, 12, GLOW); g.restore();
    for (const [a, c] of [[-1.2, ROSE], [-0.6, '#f3b6c4'], [0, ROSE], [0.6, '#f3b6c4'], [1.2, ROSE]]) { g.save(); g.translate(0, 6); g.rotate(a); path(g, p => { p.moveTo(0, 0); p.quadraticCurveTo(-6, -8, 0, -16); p.quadraticCurveTo(6, -8, 0, 0); p.closePath(); }, c, INK, 1); g.restore(); }
    ell(g, 0, 8, 10, 3.4, LEAF, INK, 1); flame(g, 0, -2, 2.6);
  },
  // 의병
  jukchang(g) { // 죽창 의병: 끝을 비스듬히 자른 대나무 창 셋
    bamboo(g, -14, 20, -4, -20, 3.2, true); bamboo(g, 0, 20, 2, -21, 3.2, true); bamboo(g, 14, 20, 8, -20, 3.2, true);
    rr(g, -12, 6, 24, 5, 2, WHITE, INK, 0.9); line(g, [10, 9, 16, 14], WHITE, 2.4);
  },
  gyeorui(g) { // 의병 결의: 부딪는 막걸리 사발 셋
    for (const [x, y, a] of [[-10, 6, -0.35], [10, 6, 0.35], [0, -4, 0]]) { g.save(); g.translate(x, y); g.rotate(a); path(g, p => { p.moveTo(-8, -4); p.quadraticCurveTo(-7, 6, 0, 6); p.quadraticCurveTo(7, 6, 8, -4); p.closePath(); }, '#e9e2cf', INK, 1.2); ell(g, 0, -4, 8, 2.4, '#f6f1e2', INK, 1); rr(g, -3, 6, 6, 2, 0.6, '#d9cfb6', INK, 0.8); g.restore(); }
    for (const [x, y] of [[-5, -12], [5, -12], [0, -16], [-9, -6], [9, -6]]) ell(g, x, y, 1.6, 1.6, '#f6f1e2', INK, 0.6); spark(g, 0, -20, 3);
  },
  gwolgi(g) { // 고을 궐기: 초가지붕 뒤로 치켜든 횃불들
    for (const [x, a] of [[-12, -0.3], [0, 0], [12, 0.3]]) { g.save(); g.translate(x, 8); g.rotate(a); rr(g, -1.4, -20, 2.8, 20, 1, WOODD, INK, 0.9); rr(g, -2.4, -22, 4.8, 4, 1, STRAW, INK, 0.8); flame(g, 0, -25, 4); g.restore(); }
    path(g, p => { p.moveTo(-21, 12); p.quadraticCurveTo(-16, 2, 0, 1); p.quadraticCurveTo(16, 2, 21, 12); p.closePath(); }, STRAW, INK, 1.3); for (const x of [-12, -4, 4, 12]) line(g, [x, 4, x * 1.1, 11], 'rgba(122,74,44,0.6)', 1);
    rr(g, -14, 12, 28, 8, 0.6, '#e9dcb8', INK, 1.1); rr(g, -4, 13, 7, 7, 0.5, '#5a4030', INK, 0.8);
  },
  // 도깨비 거래
  bangmang(g) { // 도깨비 방망이: 울퉁불퉁한 방망이와 푸른 도깨비불
    wisp(g, 14, -12, 5);
    g.save(); g.rotate(-0.62); path(g, p => { p.moveTo(-3, 20); p.lineTo(-4, 4); p.quadraticCurveTo(-8, -16, 0, -22); p.quadraticCurveTo(8, -16, 4, 4); p.lineTo(3, 20); p.closePath(); }, '#9a6a3a', INK, 1.4);
    for (const [x, y, r] of [[-4, -12, 2.8], [3, -16, 2.6], [4, -6, 2.6], [-3, -2, 2.4], [0, -20, 2]]) ell(g, x, y, r, r, '#b88a4a', INK, 0.9); rr(g, -3.6, 12, 7.2, 3, 1, RED, INK, 0.7); g.restore();
    for (const [x0, y0, x1, y1] of [[-14, 16, -20, 20], [-10, 20, -12, 24]]) line(g, [x0, y0, x1, y1], INK, 1.3); spark(g, -16, 8, 3);
  },
  ttukttak(g) { // 금 나와라 뚝딱: 작은 방망이를 두드리자 쏟아지는 엽전과 금덩이
    g.save(); g.translate(-8, -6); g.rotate(-0.9); rr(g, -1.6, 0, 3.2, 14, 1, '#9a6a3a', INK, 1); ell(g, 0, -2, 5, 6.4, '#b88a4a', INK, 1.1); g.restore();
    for (const [x, y, r] of [[4, 4, 5.4], [12, 12, 4.6], [-2, 14, 4.4], [15, 0, 3.6]]) coin(g, x, y, r);
    poly(g, [6, -6, 12, -9, 16, -5, 12, -2], GOLD, INK, 1); spark(g, 8, -14, 3.4); spark(g, 18, -12, 2.4); spark(g, -16, 8, 2.4);
  },
  dokkaebibul(g) { // 도깨비불 놀이: 둥실 떠다니는 푸른 불 셋
    for (const [x, y, r] of [[-9, 8, 6.4], [10, -2, 5.2], [3, 18, 3.8]]) { g.save(); g.globalAlpha = 0.35; ell(g, x, y - r * 0.6, r * 1.8, r * 1.8, BLUEG); g.restore(); wisp(g, x, y, r); }
    for (const [x, y] of [[-18, -12], [17, 8], [-4, -18]]) ell(g, x, y, 1.4, 1.4, BLUEG, INK, 0.5);
  },
  holim(g) { // 홀림: 빨아들이는 보랏빛 소용돌이
    g.beginPath(); for (let i = 0; i <= 60; i++) { const a = i / 60 * TAU * 2.4, r = 2 + i / 60 * 18; const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? g.lineTo(x, y) : g.moveTo(x, y); } st(g, INK, 3.4); g.beginPath(); for (let i = 0; i <= 60; i++) { const a = i / 60 * TAU * 2.4, r = 2 + i / 60 * 18; const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? g.lineTo(x, y) : g.moveTo(x, y); } st(g, '#9a7ac8', 1.8);
    for (const a of [0.3, 2.4, 4.4]) { const x = Math.cos(a) * 22, y = Math.sin(a) * 22; g.save(); g.translate(x, y); g.rotate(a + PI); poly(g, [0, -3, 6, 0, 0, 3], PURPLE, INK, 0.8); g.restore(); }
    ell(g, 0, 0, 2.6, 2.6, '#e6dcf2', INK, 0.8);
  },
  aekmagi(g) { // 액막이: 흰 실타래로 감은 북어
    g.save(); g.rotate(-0.25);
    path(g, p => { p.moveTo(-20, 0); p.quadraticCurveTo(-14, -7, 4, -6); p.quadraticCurveTo(12, -6, 15, -3); p.lineTo(22, -8); p.lineTo(20, 0); p.lineTo(22, 8); p.lineTo(15, 3); p.quadraticCurveTo(12, 6, 4, 6); p.quadraticCurveTo(-14, 7, -20, 0); p.closePath(); }, '#c9b089', INK, 1.3);
    ell(g, -15, -1.4, 1.6, 1.6, INK); line(g, [-20, 0, -14, 2], INK, 1); for (const x of [-6, 0, 6]) line(g, [x, -5, x + 2, 5], 'rgba(122,74,44,0.45)', 0.9);
    for (const x of [-4, -1, 2]) { line(g, [x, -7, x + 1, 7], INK, 2.6); line(g, [x, -7, x + 1, 7], WHITE, 1.4); }
    g.restore(); cord(g, p => { p.moveTo(-1, -8); p.quadraticCurveTo(0, -16, 4, -21); }, RED, 1.1);
  },
};

// ───────── 새 보물 ─────────
export const AXIS_RELIC_ART = {
  // 사격진
  gakgung(g) { // 각궁: 크게 휜 검은 뿔활, 줌통의 금빛 감개
    g.beginPath(); g.moveTo(-3, -22); g.bezierCurveTo(-14, -18, 12, -8, 2, 0); g.bezierCurveTo(12, 8, -14, 18, -3, 22); st(g, INK, 4.6); g.beginPath(); g.moveTo(-3, -22); g.bezierCurveTo(-14, -18, 12, -8, 2, 0); g.bezierCurveTo(12, 8, -14, 18, -3, 22); st(g, '#2b2a30', 2.8);
    line(g, [-3, -22, -3, 22], '#e9e2cf', 0.9); rr(g, 0, -3.6, 5, 7.2, 1, GOLD, INK, 1); for (const y of [-22, 22]) ell(g, -3, y, 1.6, 1.6, '#c9a06a', INK, 0.7);
    for (const [y, a] of [[-11, -0.4], [11, 0.4]]) { g.save(); g.translate(4, y); g.rotate(a); rr(g, -1.4, -3, 2.8, 6, 0.8, '#c9a06a', INK, 0.6); g.restore(); }
    arrow(g, -10, 16, 0.12, 30);
  },
  pyeonjeontong(g) { // 편전 통아: 반으로 가른 대롱 속의 짧은 화살, 손목 끈
    g.save(); g.rotate(-0.45); rr(g, -20, -5, 36, 10, 4.6, '#c9a06a', INK, 1.3); rr(g, -18, -2.4, 32, 4.8, 2.4, '#7a5a34'); arrow(g, -10, 0, PI / 2, 16, { head: '#d9dde0' }); for (const x of [-14, 6]) line(g, [x, -5, x, 5], WOODD, 1.4); g.restore();
    cord(g, p => { p.moveTo(-15, 8); p.bezierCurveTo(-22, 16, -8, 22, -6, 14); }, RED, 1.2);
  },
  singung(g) { // 신궁의 깍지 (전설): 금빛 깍지와 시위에 건 화살
    legend(g); g.beginPath(); g.arc(-26, 0, 30, -0.75, 0.75); st(g, INK, 3.8); g.beginPath(); g.arc(-26, 0, 30, -0.75, 0.75); st(g, '#2b2a30', 2.2);
    line(g, [-6, -20, -10, 0, -6, 20], '#e9e2cf', 1);
    g.save(); g.rotate(-0.35); path(g, p => { p.moveTo(-6, 5); p.quadraticCurveTo(-9, -6, 1, -7); p.quadraticCurveTo(8, -7, 9, -1); p.lineTo(16, -11); p.quadraticCurveTo(18, -9, 16, -5); p.lineTo(10, 6); p.quadraticCurveTo(6, 13, 0, 12); p.quadraticCurveTo(-5, 12, -6, 5); p.closePath(); }, GOLD, INK, 1.3); ell(g, 1, 2.6, 5, 5.4, '#fff6d0', INK, 1); g.restore();
    arrow(g, -12, 0, PI / 2, 30, { fletch: GOLD });
  },
  // 돌격
  malgap(g) { // 말 갑옷: 쇠미늘 마면갑을 쓴 군마
    horseHead(g, -2, 0, 1.15, '#8a5a34');
    path(g, p => { p.moveTo(-1, -12); p.lineTo(5, -14); p.quadraticCurveTo(13, -10, 15, 0); p.lineTo(11, 4); p.quadraticCurveTo(6, 1, 2, 2); p.closePath(); }, IRON, INK, 1.2); for (const [x, y] of [[4, -10], [8, -7], [11, -3], [6, -4]]) ell(g, x, y, 1.1, 1.1, STEEL);
    for (const y of [4, 9, 14]) { g.beginPath(); g.moveTo(-10, y); g.quadraticCurveTo(-4, y + 3, 1, y); st(g, INK, 3); g.beginPath(); g.moveTo(-10, y); g.quadraticCurveTo(-4, y + 3, 1, y); st(g, '#9a9aa6', 1.8); }
    rr(g, -1, -22, 3, 6, 1, RED, INK, 0.8);
  },
  chungjang(g) { // 충장 깃발: 화염각 두른 노란 영기와 붉은 삭모
    pole(g, -12, 22, -12, -18, WOODD, 2); poly(g, [-12, -18, -14.6, -24, -9.4, -24], STEEL, INK, 0.8); path(g, p => { p.moveTo(-12, -18); p.quadraticCurveTo(-20, -18, -18, -10); p.quadraticCurveTo(-15, -15, -12, -15); p.closePath(); }, RED, INK, 0.9);
    flameFlag(g, -11, -14, 26, 22, GOLD, RED); flame(g, 1, -0.4, 5, RED, '#f6c26a');
  },
  cheollima(g) { // 천리마 고삐 (전설): 금빛 고삐를 맨 날랜 말과 바람 자국
    legend(g); horseHead(g, 2, 0, 1.05, '#f3e7c8', '#c9a06a');
    for (const [x0, y0, x1, y1] of [[2, -6, 15, 1], [15, 1, 3, 5]]) { line(g, [x0, y0, x1, y1], INK, 3); line(g, [x0, y0, x1, y1], GOLD, 1.6); }
    cord(g, p => { p.moveTo(3, 5); p.quadraticCurveTo(-6, 14, -16, 10); }, GOLD, 1.6); for (const y of [-14, -6, 2]) line(g, [-23, y, -14, y], INK, 1.4);
  },
  // 진지
  seongdol(g) { // 성벽 돌: 크고 작게 다듬어 쌓은 성돌
    for (const [x, y, w, h, c] of [[-20, 6, 16, 12, '#b9b2a0'], [-3, 6, 22, 12, '#a59f8f'], [-16, -6, 22, 11, '#c9c2b0'], [7, -6, 13, 11, '#b0aa98'], [-8, -17, 18, 10, '#bdb6a4']]) { rr(g, x, y, w, h, 2.4, c, INK, 1.3); line(g, [x + 3, y + 3, x + w - 5, y + 2], 'rgba(255,255,255,0.35)', 1); }
    for (const [x, y] of [[-12, 12], [6, 10], [-6, -2]]) ell(g, x, y, 1.2, 0.8, 'rgba(38,42,54,0.4)');
  },
  sanseong(g) { // 산성 지도: 산줄기를 따라 두른 성벽을 그린 지도
    rr(g, -19, -16, 38, 32, 2, '#f3e6c4', INK, 1.3); rr(g, -21, -18, 5, 36, 2.4, WOODD, INK, 1); rr(g, 16, -18, 5, 36, 2.4, WOODD, INK, 1);
    path(g, p => { p.moveTo(-14, 10); p.lineTo(-6, -6); p.lineTo(0, 2); p.lineTo(6, -10); p.lineTo(13, 10); p.closePath(); }, '#9ab48a', INK, 1); path(g, p => { p.moveTo(-4, 6); p.lineTo(3, -4); p.lineTo(10, 6); p.closePath(); }, '#7a9a6a', INK, 0.8);
    g.setLineDash([2.4, 1.8]); g.beginPath(); g.ellipse(1, 1, 12, 9, 0, 0, TAU); st(g, RED, 1.5); g.setLineDash([]); ell(g, 1, -8, 1.8, 1.8, RED, INK, 0.6);
  },
  cheorong(g) { // 철옹성 (전설): 쇠못 박은 성문과 성가퀴
    legend(g); for (const x of [-18, -8, 2, 12]) rr(g, x, -16, 7, 6, 0.6, '#9a9aa6', INK, 1); rr(g, -19, -10, 38, 28, 1, '#8a8a96', INK, 1.4);
    path(g, p => { p.moveTo(-9, 18); p.lineTo(-9, 2); p.quadraticCurveTo(0, -8, 9, 2); p.lineTo(9, 18); p.closePath(); }, IRON, INK, 1.3); line(g, [0, -3, 0, 18], INK, 1.2);
    for (const x of [-5, 4]) for (const y of [4, 10, 15]) ell(g, x, y, 1.3, 1.3, GOLD, INK, 0.5); for (const [y, o] of [[-4, 0], [4, 6]]) for (let x = -19 + o; x < 18; x += 12) if (Math.abs(x + 3) > 12) line(g, [x, y, x + 9, y], 'rgba(38,42,54,0.4)', 0.9);
  },
  // 화약
  yeomcho(g) { // 염초 단지: 흰 염초 알갱이가 소복한 옹기
    jar(g, 0, 4, 1.05); path(g, p => { p.moveTo(-8, -12); p.quadraticCurveTo(0, -22, 8, -12); p.closePath(); }, '#f6f3ea', INK, 1); for (const [x, y] of [[-3, -15], [2, -17], [4, -13], [-5, -12]]) poly(g, [x - 1.6, y + 1, x, y - 1.6, x + 1.6, y + 1], WHITE, INK, 0.5);
    rr(g, -9, 0, 18, 8, 1, '#f3e6c4', INK, 0.9); for (const x of [-5, 0, 5]) ell(g, x, 4, 1.4, 1.4, INK); spark(g, 15, -14, 3); spark(g, -16, -10, 2.4);
  },
  posu(g) { // 포수 장부: 총통 그림을 붙인 장부와 화승 심지
    book(g, -2, 2, 30, 36, '#5a4a3a'); rr(g, -12, -11, 20, 22, 1.5, '#f3e6c4', INK, 0.9);
    g.save(); g.translate(-2, 0); g.rotate(-0.4); rr(g, -7, -3, 14, 6, 2.6, '#b8862a', INK, 1); rr(g, 6, -3.6, 2, 7.2, 0.8, GOLD, INK, 0.7); g.restore(); ell(g, -6, 6, 2.6, 2.6, WOOD, INK, 0.8); ell(g, 3, 6, 2.6, 2.6, WOOD, INK, 0.8);
    cord(g, p => { p.moveTo(14, -10); p.bezierCurveTo(22, -4, 14, 6, 20, 14); }, '#c9a06a', 1.2); flame(g, 20, 16, 2.4);
  },
  singijeon(g) { // 신기전 설계도 (전설): 펼친 설계도 위로 솟는 화약 화살
    legend(g); rr(g, -18, -2, 32, 20, 1.5, '#e8eef4', INK, 1.2); for (let x = -15; x < 12; x += 5) line(g, [x, 0, x, 16], 'rgba(47,77,126,0.3)', 0.7); for (let y = 3; y < 17; y += 5) line(g, [-16, y, 12, y], 'rgba(47,77,126,0.3)', 0.7);
    for (const x of [-12, -6, 0]) { line(g, [x, 14, x + 8, 4], '#2f4d7e', 1); rr(g, x + 5, 4, 3, 4, 0.6, '#2f4d7e'); }
    for (const [x, y] of [[4, -2], [10, 2], [14, -6]]) { g.save(); g.translate(x, y); g.rotate(PI * 0.22); line(g, [0, 0, 0, -20], INK, 2.6); line(g, [0, 0, 0, -20], '#c98a5a', 1.3); rr(g, -2.4, -16, 4.8, 8, 1.2, RED, INK, 0.8); poly(g, [-2, -20, 0, -25, 2, -20], STEEL, INK, 0.8); g.restore(); flame(g, x - 1, y + 3, 2.4); }
  },
  // 도술
  meokbyeoru(g) { // 먹과 벼루: 먹물 고인 벼루와 먹, 붓
    rr(g, -18, -4, 30, 20, 3, '#35343b', INK, 1.4); rr(g, -15, -1, 20, 14, 2, '#4a4a55'); ell(g, -6, 9, 7, 3, '#1c1b20'); g.globalAlpha = 0.4; ell(g, -9, 8, 2.6, 0.8, '#fff'); g.globalAlpha = 1;
    g.save(); g.translate(9, -10); g.rotate(0.5); rr(g, -3, -9, 6, 16, 1, '#2b2a30', INK, 1.1); rr(g, -2.4, -6, 4.8, 4, 0.5, GOLD); g.restore();
    line(g, [-16, -18, 4, -8], WOOD, 2.6); poly(g, [4, -9.6, 11, -5.6, 4.2, -6], INK, INK, 0.6);
  },
  obangbuchae(g) { // 오방 부채: 다섯 빛깔로 칠한 무당의 접부채
    const cols = ['#2f4d7e', RED, GOLD, WHITE, BLACK];
    for (let i = 0; i < 5; i++) { const a0 = -PI * 0.92 + i * PI * 0.168, a1 = a0 + PI * 0.168; path(g, p => { p.moveTo(0, 14); p.arc(0, 14, 26, a0, a1); p.closePath(); }, cols[i], INK, 1.1); }
    g.beginPath(); g.arc(0, 14, 9, -PI * 0.92, -PI * 0.08); st(g, INK, 1); ell(g, 0, 14, 2.4, 2.4, BRASS, INK, 0.9); tassel(g, 0, 16, 8);
  },
  horibyeong(g) { // 도사의 호리병 (전설): 끈을 맨 호리병에서 피어나는 기운
    legend(g);
    path(g, p => { p.moveTo(-3, -11); p.quadraticCurveTo(-9, -12, -7, -4); p.quadraticCurveTo(-14, 2, -12, 10); p.quadraticCurveTo(-9, 18, 0, 18); p.quadraticCurveTo(9, 18, 12, 10); p.quadraticCurveTo(14, 2, 7, -4); p.quadraticCurveTo(9, -12, 3, -11); p.closePath(); }, '#d9b24a', INK, 1.4);
    rr(g, -3, -15, 6, 5, 1.4, WOODD, INK, 1); rr(g, -7, -5, 14, 3, 1.2, RED, INK, 0.8); g.globalAlpha = 0.35; ell(g, -5, 7, 3, 6, '#fff'); g.globalAlpha = 1;
    for (const [x, d] of [[-2, 1], [3, -1]]) { g.beginPath(); g.moveTo(x, -15); g.bezierCurveTo(x + 6 * d, -18, x - 6 * d, -21, x + 3 * d, -25); st(g, INK, 2.6); g.beginPath(); g.moveTo(x, -15); g.bezierCurveTo(x + 6 * d, -18, x - 6 * d, -21, x + 3 * d, -25); st(g, '#cbbfdc', 1.4); }
  },
  // 굿
  janggu(g) { // 장구: 허리 잘록한 북통, 양쪽의 큰 가죽면과 붉고 푸른 조임줄
    for (const s of [-1, 1]) path(g, p => { p.moveTo(s * 15, -13); p.quadraticCurveTo(s * 7, -6, s * 2.6, -3); p.lineTo(s * 2.6, 3); p.quadraticCurveTo(s * 7, 6, s * 15, 13); p.closePath(); }, '#a8322a', INK, 1.3);
    rr(g, -3.6, -3.4, 7.2, 6.8, 1, '#7a4a2c', INK, 1);
    for (let i = 0; i < 6; i++) { const y = -11 + i * 4.4; line(g, [-15, y, 15, -y * 0.5], i % 2 ? '#2f4d7e' : '#e6b93e', 1); }
    for (const s of [-1, 1]) { ell(g, s * 16, 0, 5.4, 15, '#f3e7c8', INK, 1.3); ell(g, s * 16, 0, 3.2, 11, null, 'rgba(122,74,44,0.5)', 1); }
    line(g, [6, -21, 20, -16], WOOD, 2); ell(g, 5, -21.4, 2, 2, WOOD, INK, 0.7);
  },
  obanggi(g) { // 오방기: 다섯 빛깔 깃발 묶음
    const cols = [['#2f4d7e', -14], [RED, -7], [GOLD, 0], [WHITE, 7], [BLACK, 14]];
    for (const [c, x] of cols) { const a = x * 0.025; g.save(); g.translate(0, 20); g.rotate(a); pole(g, 0, 0, 0, -36, WOODD, 1.4); poly(g, [0, -36, 9, -33, 0, -27], c, INK, 0.9); g.restore(); }
    rr(g, -6, 12, 12, 4, 1.4, RED, INK, 0.9);
  },
  singal(g) { // 신칼 (전설): 오색 천을 단 무당의 칼 한 쌍
    legend(g);
    for (const s of [-1, 1]) { g.save(); g.translate(s * 6, 6); g.rotate(s * 0.5); path(g, p => { p.moveTo(-2.4, 0); p.lineTo(-2.4, -18); p.quadraticCurveTo(0, -24, 2.4, -18); p.lineTo(2.4, 0); p.closePath(); }, STEEL, INK, 1.2); line(g, [0, -2, 0, -19], '#fff', 0.8); rr(g, -4, 0, 8, 3, 1, BRASS, INK, 0.8); rr(g, -1.6, 3, 3.2, 6, 0.8, WOODD, INK, 0.8);
      for (const [dx, c] of [[-2, RED], [0, GOLD], [2, '#2f4d7e']]) path(g, p => { p.moveTo(dx, 9); p.quadraticCurveTo(dx + s * 4, 15, dx - s * 2, 20); p.lineTo(dx - s * 0.6, 20); p.quadraticCurveTo(dx + s * 5, 15, dx + 1, 9); p.closePath(); }, c, INK, 0.6); g.restore(); }
  },
  // 의병
  daesup(g) { // 대나무 숲: 곧게 선 대나무 줄기와 잎
    for (const [x, h] of [[-12, 40], [-3, 44], [7, 38], [15, 32]]) bamboo(g, x, 22, x + 1, 22 - h, 3.4);
    for (const [x, y, a] of [[-12, -12, -2.6], [-3, -18, -0.6], [-3, -8, -2.5], [7, -10, -0.5], [15, -4, -2.6], [15, 2, -0.4]]) leaf(g, x, y, a, 11, LEAF);
  },
  hyangyak(g) { // 향약 문서: 실로 맨 마을 약속 책과 볏단
    book(g, -5, 2, 26, 34, '#8a6a3a'); rr(g, -12, -10, 14, 18, 1, '#f3e6c4', INK, 0.8); for (const y of [-6, -2, 2]) line(g, [-10, y, 0, y], INK, 0.9);
    for (const a of [-0.3, -0.1, 0.1, 0.3]) { g.save(); g.translate(13, 18); g.rotate(a); line(g, [0, 0, 0, -26], INK, 2.4); line(g, [0, 0, 0, -26], STRAW, 1.2); for (const y of [-22, -18, -14]) ell(g, 1.6, y, 1.6, 2.4, GOLD, INK, 0.5); g.restore(); }
    rr(g, 9, 6, 8, 3, 1, RED, INK, 0.8);
  },
  hongui(g) { // 붉은 옷 의병장 (전설): 붉은 도포와 검은 갓
    legend(g);
    path(g, p => { p.moveTo(-7, -6); p.lineTo(-17, 0); p.lineTo(-19, 8); p.lineTo(-13, 9); p.lineTo(-11, 4); p.lineTo(-11, 20); p.lineTo(11, 20); p.lineTo(11, 4); p.lineTo(13, 9); p.lineTo(19, 8); p.lineTo(17, 0); p.lineTo(7, -6); p.closePath(); }, '#c8402f', INK, 1.4);
    path(g, p => { p.moveTo(-6, -6); p.lineTo(4, 8); p.lineTo(7, -6); p.closePath(); }, WHITE, INK, 1); line(g, [-2, 6, 8, 6], '#2f4d7e', 1.8); line(g, [3, 6, 5, 14], '#2f4d7e', 1.4);
    ell(g, 0, -15, 15, 3.2, BLACK, INK, 1.2); rr(g, -6, -24, 12, 9, 3, BLACK, INK, 1.2); g.globalAlpha = 0.35; ell(g, -4, -16, 6, 1, '#fff'); g.globalAlpha = 1;
  },
  // 도깨비 거래
  hangari(g) { // 부정 먹는 항아리: 보랏빛 기운을 빨아들이는 옹기
    jar(g, 0, 6, 1.0, '#5a4a3a');
    for (const [x, d] of [[-14, 1], [0, -1], [14, -1]]) { g.beginPath(); g.moveTo(x, -22); g.bezierCurveTo(x + 6 * d, -18, x * 0.3, -14, 0, -10); st(g, INK, 2.8); g.beginPath(); g.moveTo(x, -22); g.bezierCurveTo(x + 6 * d, -18, x * 0.3, -14, 0, -10); st(g, PURPLE, 1.4); }
    ell(g, 0, -9.6, 6, 1.6, '#1c1b20'); spark(g, -17, 4, 2.6, '#e6dcf2'); spark(g, 17, 0, 2.2, '#e6dcf2');
  },
  yakjo(g) { // 도깨비와의 약조: 붉은 지장을 찍은 약조문과 푸른 불
    g.save(); g.rotate(0.08); rr(g, -16, -18, 28, 36, 1.5, '#efe4c9', INK, 1.3); for (const y of [-12, -7, -2, 3]) line(g, [-12, y, 7, y], INK, 0.9); g.restore();
    ell(g, 2, 11, 5, 6, RED, INK, 0.9); for (const r of [1.4, 2.8, 4.2]) { g.beginPath(); g.ellipse(2, 11, r, r * 1.2, 0, 0, TAU); st(g, '#f3c9a0', 0.6); }
    wisp(g, 15, -8, 4.6);
  },
  heuksal(g) { // 흉살 부적: 검은 종이에 붉게 그은 부적과 가시
    paperTal(g, 0, 0, 20, 38, '#3a3440', RED);
    for (const [x, y, a] of [[-15, -12, -0.6], [15, -6, 0.6], [-14, 12, -2.4], [14, 14, 2.4]]) { g.save(); g.translate(x, y); g.rotate(a); poly(g, [-2, 3, 0, -6, 2, 3], '#5a5346', INK, 0.8); g.restore(); }
  },
  dokkaebiwang(g) { // 도깨비 왕의 감투 (전설): 금띠 두른 높은 감투와 푸른 불꽃
    legend(g);
    path(g, p => { p.moveTo(-14, 14); p.lineTo(-14, 2); p.quadraticCurveTo(-14, -8, -7, -10); p.lineTo(-7, -17); p.quadraticCurveTo(0, -22, 7, -17); p.lineTo(7, -10); p.quadraticCurveTo(14, -8, 14, 2); p.lineTo(14, 14); p.quadraticCurveTo(0, 18, -14, 14); p.closePath(); }, '#1f1e24', INK, 1.4);
    path(g, p => { p.moveTo(-14, 8); p.quadraticCurveTo(0, 12, 14, 8); p.lineTo(14, 13); p.quadraticCurveTo(0, 17, -14, 13); p.closePath(); }, GOLD, INK, 1); for (const x of [-8, 0, 8]) ell(g, x, 11.6, 1.6, 1.6, BLUEF, INK, 0.6);
    for (const x of [-9, -3, 3, 9]) line(g, [x, -6, x + 1, 7], 'rgba(255,255,255,0.12)', 0.9); wisp(g, 0, -18, 4);
  },
  // 두루 쓰는 보물
  bokjori(g) { // 복조리: 붉은 실로 묶은 조리 한 쌍
    for (const s of [-1, 1]) { g.save(); g.translate(s * 7, 2); g.rotate(s * 0.35);
      path(g, p => { p.moveTo(-8, 2); p.quadraticCurveTo(-9, 14, 0, 15); p.quadraticCurveTo(9, 14, 8, 2); p.lineTo(1.6, -6); p.lineTo(-1.6, -6); p.closePath(); }, STRAW, INK, 1.2);
      for (let i = -2; i <= 2; i++) line(g, [i * 3, 13, i * 0.6, -4], 'rgba(122,74,44,0.55)', 0.8); for (const y of [4, 9]) line(g, [-8, y, 8, y], 'rgba(122,74,44,0.55)', 0.8); rr(g, -1.6, -20, 3.2, 15, 1, '#c9a06a', INK, 0.9); g.restore(); }
    rr(g, -6, -10, 12, 4, 1.4, RED, INK, 0.9); line(g, [0, -6, -2, 0], RED, 1.4);
  },
  jeoul(g) { // 놋 저울: 대저울의 막대와 접시, 저울추
    line(g, [-20, -10, 18, -14], INK, 3.6); line(g, [-20, -10, 18, -14], BRASS, 2); for (const x of [-6, 0, 6, 12]) line(g, [x, -12.6 - x * 0.1, x, -10 - x * 0.1], INK, 0.8);
    cord(g, p => { p.moveTo(-4, -12); p.lineTo(-4, -22); }, '#c9a06a', 1); ell(g, -4, -22, 2, 2, BRASS, INK, 0.8);
    for (const x of [-20, -13]) line(g, [-16, -10, x, 6], INK, 0.9); path(g, p => { p.moveTo(-24, 6); p.quadraticCurveTo(-16, 14, -8, 6); p.closePath(); }, BRASS, INK, 1.2); coin(g, -16, 3, 3.6);
    line(g, [12, -13, 12, 0], INK, 0.9); path(g, p => { p.moveTo(9, 0); p.lineTo(15, 0); p.lineTo(16, 9); p.lineTo(8, 9); p.closePath(); }, IRON, INK, 1.1);
  },
  beopgo(g) { // 법고: 받침대에 올린 절의 큰북(단청 빛 북통)과 북채
    for (const x of [-15, 15]) { line(g, [x, 6, x * 1.2, 20], INK, 3); line(g, [x, 6, x * 1.2, 20], WOODD, 1.6); }
    rr(g, -17, -14, 34, 24, 4, '#3f6b5c', INK, 1.4); for (const y of [-12, 6]) rr(g, -15, y, 30, 3, 1, '#a8322a', INK, 0.6); ell(g, -17, -2, 4, 12, '#f3e7c8', INK, 1.1); ell(g, 17, -2, 4, 12, '#f3e7c8', INK, 1.1);
    for (const y of [-11, 7]) for (let x = -12; x <= 12; x += 4) ell(g, x, y, 0.9, 0.9, GOLD, INK, 0.4);
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; path(g, p => { p.moveTo(0, -2); p.quadraticCurveTo(Math.cos(a - 0.4) * 6, -2 + Math.sin(a - 0.4) * 6, Math.cos(a) * 7, -2 + Math.sin(a) * 7); p.quadraticCurveTo(Math.cos(a + 0.4) * 6, -2 + Math.sin(a + 0.4) * 6, 0, -2); }, GOLD, INK, 0.6); }
    line(g, [14, -20, 22, -12], WOOD, 2.2); ell(g, 13, -21, 2.4, 2.4, '#e9d9b0', INK, 0.8);
  },
  sansin(g) { // 산신 그림: 산과 소나무, 웅크린 범을 그린 족자
    rr(g, -15, -20, 30, 38, 1, '#f3e6c4', INK, 1.3); rr(g, -17, -22, 34, 4, 1.6, WOODD, INK, 1); rr(g, -17, 17, 34, 4, 1.6, WOODD, INK, 1); line(g, [-6, -22, 0, -26, 6, -22], INK, 0.9);
    path(g, p => { p.moveTo(-13, 0); p.lineTo(-6, -14); p.lineTo(0, -6); p.lineTo(6, -16); p.lineTo(13, 0); p.closePath(); }, '#9ab48a', INK, 0.9);
    path(g, p => { p.moveTo(-9, 12); p.quadraticCurveTo(-10, 4, -2, 4); p.quadraticCurveTo(6, 3, 8, 8); p.quadraticCurveTo(11, 7, 11, 10); p.lineTo(9, 13); p.closePath(); }, '#e08a3a', INK, 1); for (const x of [-5, -1, 3]) line(g, [x, 4.6, x + 1, 9], INK, 1); ell(g, 8.6, 8, 0.8, 0.8, INK);
    line(g, [-12, 2, -10, -8], WOODD, 1.6); ell(g, -10, -9, 4, 2, LEAFD, INK, 0.7);
  },
  pungdeung(g) { // 풍등: 불을 품고 떠오르는 흰 종이 등
    g.save(); g.globalAlpha = 0.4; ell(g, 0, -2, 16, 18, GLOW); g.restore();
    path(g, p => { p.moveTo(-11, 10); p.quadraticCurveTo(-15, -6, -9, -16); p.quadraticCurveTo(0, -22, 9, -16); p.quadraticCurveTo(15, -6, 11, 10); p.closePath(); }, '#fff3d6', INK, 1.3);
    for (const x of [-5, 0, 5]) line(g, [x * 1.4, -19, x * 2, 9], 'rgba(185,130,60,0.45)', 0.9); rr(g, -11, 9, 22, 2.6, 1, WOOD, INK, 0.9);
    flame(g, 0, 15, 3.2); for (const [x, y] of [[-16, 18], [15, 20], [-18, -12], [17, -16]]) spark(g, x, y, 2.2);
  },
  daejanggi(g) { // 대장기: 화염각 두른 쪽빛 큰 깃발과 금빛 삼지창
    pole(g, -15, 22, -15, -18, WOODD, 2.2); poly(g, [-15, -18, -18, -24, -15, -21, -12, -24], STEEL, INK, 0.8); path(g, p => { p.moveTo(-15, -18); p.quadraticCurveTo(-23, -16, -21, -8); p.quadraticCurveTo(-18, -14, -15, -14); p.closePath(); }, RED, INK, 0.9);
    flameFlag(g, -14, -15, 30, 28, '#2f4d7e', RED);
    line(g, [1, 9, 1, -8], GOLD, 1.8); for (const dx of [-4, 4]) { g.beginPath(); g.moveTo(1, -2); g.quadraticCurveTo(1 + dx, -2, 1 + dx, -8); st(g, GOLD, 1.6); } poly(g, [-1.4, -8, 1, -12, 3.4, -8], GOLD);
  },
  norigae(g) { // 칠보 노리개: 매듭에 단 칠보 장식과 술 셋
    ell(g, 0, -18, 3, 3, RED, INK, 0.9); line(g, [0, -15, 0, -10], RED, 1.6);
    path(g, p => { p.moveTo(-10, -10); p.lineTo(10, -10); p.lineTo(6, -3); p.lineTo(-6, -3); p.closePath(); }, '#2f6f5c', INK, 1); ell(g, 0, -6.6, 2.4, 2.4, GOLD, INK, 0.6);
    for (const [x, c] of [[-8, RED], [0, '#2f4d7e'], [8, GOLD]]) { line(g, [x * 0.6, -3, x, 3], INK, 1); ell(g, x, 5, 3.4, 3.4, c === GOLD ? '#e08aa0' : '#8fd3c8', INK, 0.9); ell(g, x, 5, 1.4, 1.4, WHITE); tassel(g, x, 8, 13, c); }
  },
  // 두목 보물
  b_yeougusul(g) { // 여우 구슬: 꼬리가 감싼 빛나는 구슬
    path(g, p => { p.moveTo(-18, 14); p.bezierCurveTo(-24, -6, -6, -22, 10, -18); p.bezierCurveTo(-2, -14, -14, -4, -10, 12); p.closePath(); }, '#f3c98a', INK, 1.2); path(g, p => { p.moveTo(10, -18); p.quadraticCurveTo(14, -19, 16, -16); p.quadraticCurveTo(12, -15, 8, -15); p.closePath(); }, WHITE, INK, 0.8);
    g.save(); g.globalAlpha = 0.45; ell(g, 3, 4, 13, 13, '#e6f6ff'); g.restore(); ell(g, 3, 4, 9, 9, '#f2fbff', INK, 1.3); g.beginPath(); g.arc(3, 4, 5, 0.4, 3.6); st(g, '#8fb6d9', 1.4); ell(g, 0, 1, 2, 1.2, '#fff');
    bossKnot(g);
  },
  b_cheoltoe(g) { // 두억시니의 철퇴: 쇠테와 못을 박은 큰 몽둥이
    g.save(); g.rotate(0.6); path(g, p => { p.moveTo(-2.6, 22); p.lineTo(-3, 2); p.quadraticCurveTo(-10, -18, 0, -24); p.quadraticCurveTo(10, -18, 3, 2); p.lineTo(2.6, 22); p.closePath(); }, '#5a4030', INK, 1.4);
    for (const y of [-14, -4]) rr(g, -7, y, 14, 3, 1, IRON, INK, 0.9); for (const [x, y] of [[-6, -9], [6, -9], [0, -19], [-5, 0], [5, 0]]) poly(g, [x - 1.6, y, x + (x > 0 ? 3.4 : x < 0 ? -3.4 : 0), y - (x ? 0.4 : 3.4), x + 1.6, y], STEEL, INK, 0.6); g.restore();
    for (const [x0, y0, x1, y1] of [[-16, -2, -21, -6], [-14, 4, -20, 6]]) line(g, [x0, y0, x1, y1], CRIMSON, 1.6); bossKnot(g);
  },
  b_beonggeoji(g) { // 김서방의 벙거지: 둥근 챙의 털벙거지와 붉은 상모
    ell(g, 0, 6, 20, 5.4, '#2b2a30', INK, 1.3); path(g, p => { p.moveTo(-11, 5); p.quadraticCurveTo(-12, -12, 0, -12); p.quadraticCurveTo(12, -12, 11, 5); p.closePath(); }, '#35343b', INK, 1.3);
    rr(g, -11, 1, 22, 4, 1.4, '#2f4d7e', INK, 0.9); g.globalAlpha = 0.3; for (const x of [-6, -1, 4]) line(g, [x, -9, x + 1, 1], '#fff', 0.8); g.globalAlpha = 1;
    rr(g, -1.6, -16, 3.2, 4, 1, BRASS, INK, 0.7); path(g, p => { p.moveTo(0, -16); p.quadraticCurveTo(-10, -24, -14, -14); p.quadraticCurveTo(-6, -18, 0, -15); p.closePath(); }, RED, INK, 0.9);
    bossKnot(g);
  },
  b_beomsuyeom(g) { // 범의 수염: 줄무늬 범 뺨에서 뻗은 흰 수염
    path(g, p => { p.moveTo(-20, -10); p.quadraticCurveTo(-4, -18, 2, -4); p.quadraticCurveTo(4, 8, -8, 14); p.quadraticCurveTo(-18, 14, -20, 4); p.closePath(); }, '#e08a3a', INK, 1.3);
    for (const [x0, y0, x1, y1] of [[-14, -12, -10, -6], [-6, -14, -4, -8], [-16, 6, -10, 4], [-8, 12, -5, 7]]) line(g, [x0, y0, x1, y1], INK, 2); ell(g, -4, 2, 5, 4, WHITE, INK, 0.9); ell(g, 0, 0, 2, 1.6, '#5a3a2a', INK, 0.6);
    for (const [y, a] of [[-2, -0.18], [2, 0], [6, 0.18]]) { g.beginPath(); g.moveTo(2, y); g.quadraticCurveTo(12, y + a * 20 - 2, 22, y + a * 40); st(g, INK, 2.4); g.beginPath(); g.moveTo(2, y); g.quadraticCurveTo(12, y + a * 20 - 2, 22, y + a * 40); st(g, WHITE, 1.2); }
    bossKnot(g);
  },
  b_jeoljong(g) { // 절의 종: 들보에 매단 범종 — 둥근 어깨, 음통, 젖꼭지 무늬와 연꽃 당좌
    rr(g, -18, -24, 36, 4, 1.4, WOODD, INK, 1); cord(g, p => { p.moveTo(-1, -20); p.lineTo(-1, -16); }, IRON, 1.4); rr(g, 2, -19, 3, 5, 1, '#5a7a5a', INK, 0.8);
    path(g, p => { p.moveTo(-11, -9); p.quadraticCurveTo(-11, -16, 0, -16); p.quadraticCurveTo(11, -16, 11, -9); p.quadraticCurveTo(12, 4, 16, 14); p.lineTo(-16, 14); p.quadraticCurveTo(-12, 4, -11, -9); p.closePath(); }, '#6a8a6a', INK, 1.4);
    line(g, [-11, -8, 11, -8], 'rgba(38,42,54,0.5)', 1); rr(g, -16, 10, 32, 4, 1.2, '#5a7a5a', INK, 0.9); g.globalAlpha = 0.3; line(g, [-7, -12, -9, 8], '#fff', 1.6); g.globalAlpha = 1;
    for (const x of [-9, 4]) { rr(g, x, -6, 5, 6, 0.6, '#5a7a5a', INK, 0.7); for (const [dx, dy] of [[1.3, 1.5], [3.7, 1.5], [1.3, 4.4], [3.7, 4.4]]) ell(g, x + dx, -6 + dy, 0.8, 0.8, '#b9d2b0'); }
    ell(g, 0, 5, 2.6, 2.6, '#b9d2b0', INK, 0.8); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; ell(g, Math.cos(a) * 4, 5 + Math.sin(a) * 4, 1.1, 1.1, '#b9d2b0', INK, 0.4); }
    bossKnot(g);
  },
  b_ppuri(g) { // 당산나무 뿌리: 고추와 숯을 끼운 금줄을 두른 굵은 뿌리
    path(g, p => { p.moveTo(-6, -22); p.quadraticCurveTo(-9, -6, -18, 6); p.quadraticCurveTo(-22, 12, -16, 16); p.lineTo(-10, 10); p.quadraticCurveTo(-6, 18, -2, 20); p.lineTo(2, 12); p.quadraticCurveTo(8, 20, 16, 18); p.lineTo(12, 10); p.quadraticCurveTo(20, 8, 20, 2); p.quadraticCurveTo(10, 4, 6, -4); p.quadraticCurveTo(6, -14, 8, -22); p.closePath(); }, '#6a4a30', INK, 1.4);
    for (const [x0, y0, x1, y1] of [[-3, -16, -4, -4], [3, -12, 2, 2]]) line(g, [x0, y0, x1, y1], 'rgba(38,42,54,0.4)', 1);
    cord(g, p => { p.moveTo(-14, -6); p.quadraticCurveTo(0, -1, 16, -6); }, STRAW, 1.6);
    for (const [x, y, k] of [[-9, -3, 0], [-3, -1.6, 1], [3, -1.6, 0], [9, -3, 1]]) { if (k) path(g, p => { p.moveTo(x, y); p.quadraticCurveTo(x + 3, y + 5, x - 0.4, y + 10); p.quadraticCurveTo(x - 1.4, y + 5, x, y); }, RED, INK, 0.7); else rr(g, x - 2, y, 4, 4, 0.8, '#2b2a30', INK, 0.6); }
    bossKnot(g);
  },
  b_soetjogak(g) { // 불가사리 쇳조각: 녹슨 날카로운 쇳조각과 바늘
    poly(g, [-14, 12, -18, -2, -8, -10, -4, -22, 6, -12, 16, -16, 12, -2, 18, 8, 4, 16], '#6a6a78', INK, 1.4);
    poly(g, [-6, 4, -2, -8, 6, -4, 8, 6], '#8a8a96', null); for (const [x, y, r] of [[-9, 6, 2.6], [8, -6, 2], [2, 10, 1.8]]) ell(g, x, y, r, r * 0.7, '#a0603a'); line(g, [-6, -14, -2, -6], 'rgba(255,255,255,0.4)', 1);
    line(g, [-20, 20, 2, 18], INK, 1.8); line(g, [-20, 20, 2, 18], STEEL, 0.8); ell(g, -18, 19.8, 1.2, 0.8, null, INK, 0.6);
    bossKnot(g);
  },
  b_cheoyongtal(g) { // 처용탈: 붉은 얼굴, 꽃을 꽂은 사모의 탈
    path(g, p => { p.moveTo(-12, -12); p.quadraticCurveTo(-15, 6, -9, 14); p.quadraticCurveTo(0, 20, 9, 14); p.quadraticCurveTo(15, 6, 12, -12); p.closePath(); }, '#b8402f', INK, 1.4);
    for (const s of [-1, 1]) { ell(g, s * 14, 0, 3.6, 6, '#b8402f', INK, 1.1); ell(g, s * 14, 7, 1.8, 1.8, GOLD, INK, 0.6); path(g, p => { p.moveTo(s * 9, -6); p.quadraticCurveTo(s * 5, -9, s * 2, -6); }, null, INK, 2.2); ell(g, s * 5.4, -2, 2.2, 1.4, WHITE, INK, 0.8); }
    path(g, p => { p.moveTo(-6, 7); p.quadraticCurveTo(0, 12, 6, 7); p.quadraticCurveTo(0, 9, -6, 7); p.closePath(); }, WHITE, INK, 1); ell(g, 0, 2, 2.2, 3, '#a0302a', INK, 0.8);
    rr(g, -13, -18, 26, 7, 2, BLACK, INK, 1.1); for (const [x, c] of [[-8, ROSE], [0, '#f3d27c'], [8, ROSE]]) { ell(g, x, -21, 3.6, 3.6, c, INK, 0.8); ell(g, x, -21, 1.2, 1.2, GOLD); }
    bossKnot(g);
  },
  b_yeouiju(g) { // 여의주 조각: 불길이 감도는 깨진 구슬
    for (const [x, y, r] of [[-14, -6, 4], [12, -14, 3.6], [15, 6, 3.4]]) flame(g, x, y, r, '#ff8a4a', GLOW);
    path(g, p => { p.arc(-1, 3, 13, PI * 0.35, PI * 1.6); p.lineTo(2, -6); p.lineTo(-2, 0); p.lineTo(3, 6); p.lineTo(-1, 12); p.closePath(); }, '#d6f0ff', INK, 1.4);
    path(g, p => { p.moveTo(6, -9); p.lineTo(12, -2); p.lineTo(9, 9); p.lineTo(5, 4); p.lineTo(8, -2); p.closePath(); }, '#bfe3ee', INK, 1.1); ell(g, -6, -2, 3, 2, '#fff');
    bossKnot(g);
  },
  b_deungjan(g) { // 어둑시니의 등잔: 받침 위 등잔에서 피어나는 검보랏빛 불
    rr(g, -10, 16, 20, 4, 1.4, WOODD, INK, 1.1); rr(g, -1.6, -2, 3.2, 18, 1, WOODD, INK, 1); path(g, p => { p.moveTo(-9, -2); p.quadraticCurveTo(0, 4, 9, -2); p.closePath(); }, '#8a6a4a', INK, 1.1);
    path(g, p => { p.moveTo(0, -24); p.quadraticCurveTo(9, -14, 5, -6); p.quadraticCurveTo(0, -2, -5, -6); p.quadraticCurveTo(-9, -14, 0, -24); p.closePath(); }, '#3a2a4a', INK, 1.2); path(g, p => { p.moveTo(0, -16); p.quadraticCurveTo(4, -10, 2, -7); p.quadraticCurveTo(0, -5, -2, -7); p.quadraticCurveTo(-4, -10, 0, -16); p.closePath(); }, '#9a7ac8');
    for (const [x, y, r] of [[-12, -16, 4], [12, -10, 3.4]]) { g.globalAlpha = 0.6; ell(g, x, y, r, r * 0.8, '#5a4a6a'); g.globalAlpha = 1; }
    bossKnot(g);
  },
  b_myeongbu(g) { // 명부 한 장: 붉은 테 두른 검은 명부 쪽과 꺾인 붓
    g.save(); g.rotate(-0.1); rr(g, -15, -19, 28, 36, 1, '#2b2a30', INK, 1.3); rr(g, -13, -17, 24, 32, 0.6, null, '#a8322a', 1.2); for (const x of [-8, -3, 2, 7]) line(g, [x, -13, x, 10], 'rgba(243,230,196,0.75)', 1.2); g.restore();
    line(g, [6, 18, 12, 6], WOOD, 2.4); line(g, [14, 4, 20, -10], WOOD, 2.4); poly(g, [19, -10, 22, -16, 22, -9], INK); for (const [x, y] of [[13, 5], [12, 7]]) ell(g, x, y, 0.9, 0.9, WOODD);
    bossKnot(g);
  },
  b_eopgyeong(g) { // 업경대 조각: 놋쇠 테가 남은 깨진 거울 조각
    path(g, p => { p.arc(0, 0, 19, -PI * 0.9, PI * 0.15); p.lineTo(6, 6); p.lineTo(-2, -2); p.lineTo(-8, 4); p.lineTo(-18, -2); p.closePath(); }, BRASS, INK, 1.4);
    path(g, p => { p.arc(0, 0, 15, -PI * 0.88, PI * 0.12); p.lineTo(5, 3); p.lineTo(-2, -4); p.lineTo(-8, 1); p.lineTo(-14, -3); p.closePath(); }, '#cfe3e8', INK, 1);
    for (const [x0, y0, x1, y1] of [[-2, -4, 4, -12], [4, -12, 2, -15], [4, -12, 10, -10]]) line(g, [x0, y0, x1, y1], INK, 0.9); g.globalAlpha = 0.6; line(g, [-10, -8, -4, -12], '#fff', 1.6); g.globalAlpha = 1;
    for (let i = 0; i < 5; i++) { const a = -PI * 0.85 + i * 0.22; ell(g, Math.cos(a) * 17, Math.sin(a) * 17, 1, 1, GOLD, INK, 0.4); }
    bossKnot(g);
  },
};
