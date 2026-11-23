// 영웅 전용 패(data/cards_hero.js)의 아이콘 — icons.js 의 조각(k)을 넘겨받아 같은 종이 오림 그림체로 그린다 (가운데가 원점, 대략 ±22 안)
import { TAU, INK, RED, REDD, INDIGO, NAVY, TEAL, OCHRE, SKIN, st, ell, rr, poly, line, path } from './draw.js';

export function heroArt(k) {
  const { WHITE, BLACK, STEEL, IRON, GREY, WOOD, WOODD, GOLD, BRASS, FLAME, GLOW, STRAW, LEAF, LEAFD, PURPLE, ICE, WATER, cord, flame, arrow, coin, rays, spark, cloud, tassel, taegeuk } = k;
  const PI = Math.PI, PINK = '#f3b4c0', PINKL = '#f8d4dc', PLUM = '#d9566e';
  // 작은 깃발 (장대 + 삼각기)
  const flag = (g, x, y, h, col, a = 0, s = 1) => { g.save(); g.translate(x, y); g.rotate(a); g.scale(s, s); line(g, [0, 0, 0, -h], INK, 2.6); line(g, [0, 0, 0, -h], WOODD, 1.3); poly(g, [0, -h, 11, -h + 3.4, 0, -h + 7.4], col, INK, 0.9); g.restore(); };
  // 칼 한 자루 (자루 아래, 칼끝 위)
  const blade = (g, x, y, a, l, col = STEEL) => { g.save(); g.translate(x, y); g.rotate(a); path(g, p => { p.moveTo(-1.6, 1); p.quadraticCurveTo(-1, -l * 0.5, 2.6, -l); p.quadraticCurveTo(2.4, -l * 0.5, 1.7, 1); p.closePath(); }, col, INK, 1.1); g.globalAlpha = 0.6; line(g, [0.6, -2, 1.8, -l * 0.8], '#fff', 0.8); g.globalAlpha = 1; rr(g, -3.4, 0.6, 6.8, 2.4, 1, GOLD, INK, 0.8); line(g, [0, 3, 0, 9.4], INK, 3.2); line(g, [0, 3, 0, 9.4], '#7a1f1c', 1.7); g.restore(); };
  // 매화 한 송이 (꽃잎 다섯)
  const plum = (g, x, y, r, a = 0) => { for (let i = 0; i < 5; i++) { const q = a + i / 5 * TAU; ell(g, x + Math.cos(q) * r * 0.62, y + Math.sin(q) * r * 0.62, r * 0.5, r * 0.5, PINK, INK, 0.7); } ell(g, x, y, r * 0.3, r * 0.3, GOLD, INK, 0.5); };
  // 소리 물결
  const waves = (g, x, y, r0, n, a0, a1, col = INK, lw = 1.3) => { for (let i = 0; i < n; i++) { g.beginPath(); g.arc(x, y, r0 + i * 4.4, a0, a1); st(g, col, lw); } };
  // 초록 십자 (회복)
  const plus = (g, x, y, s, col = LEAF) => { rr(g, x - s, y - s * 0.34, s * 2, s * 0.68, 0.6, col, INK, 0.7); rr(g, x - s * 0.34, y - s, s * 0.68, s * 2, 0.6, col, INK, 0.7); };
  const A = {};
  // ───── 장군 ─────
  A.jindagi = g => { // 진 다지기: 날개처럼 벌린 다섯 부대와 가운데 깃발
    g.globalAlpha = 0.25; ell(g, 0, 15, 20, 4, INK); g.globalAlpha = 1;
    g.setLineDash([2.4, 2.2]); g.beginPath(); g.moveTo(-17, -10); g.quadraticCurveTo(-8, 10, 0, 12); g.quadraticCurveTo(8, 10, 17, -10); st(g, INK, 1.2); g.setLineDash([]);
    for (const [x, y] of [[-17, -10], [-10, 5], [10, 5], [17, -10]]) { ell(g, x, y, 4.4, 4.4, INDIGO, INK, 1.1); ell(g, x - 1.2, y - 1.4, 1.4, 1.1, 'rgba(255,255,255,0.6)'); }
    flag(g, 0, 14, 28, RED); ell(g, 0, 12.6, 5.4, 2, BRASS, INK, 0.9); spark(g, 13, -19, 3.4);
  };
  A.gisin = g => { // 깃발 신호: 엇걸어 흔드는 붉은 기와 푸른 기
    for (const [s, col] of [[-1, RED], [1, INDIGO]]) { g.save(); g.scale(s, 1); g.rotate(-0.42); line(g, [0, 22, 0, -20], INK, 3.2); line(g, [0, 22, 0, -20], WOOD, 1.7); poly(g, [-1.6, -20, 0, -24, 1.6, -20], GOLD, INK, 0.8);
      path(g, p => { p.moveTo(0, -19); p.quadraticCurveTo(9, -22, 18, -17); p.quadraticCurveTo(14, -11, 18, -5); p.quadraticCurveTo(9, -9, 0, -6); p.closePath(); }, col, INK, 1.2); line(g, [0, -16, 15, -15], 'rgba(255,255,255,0.4)', 1); g.restore(); }
    for (const a of [-2.5, -1.57, -0.64]) line(g, [Math.cos(a) * 20, 6 + Math.sin(a) * 20, Math.cos(a) * 24, 6 + Math.sin(a) * 24], INK, 1.4);
  };
  A.dokjeon = g => { // 독전: 장군의 투구와 붉은 술, 둘레에 회복 십자
    rays(g, 0, 2, 16, 21, 9, GOLD, 1.5, -PI * 0.95, PI * 0.9);
    path(g, p => { p.moveTo(-13, 8); p.quadraticCurveTo(-13, -11, 0, -11); p.quadraticCurveTo(13, -11, 13, 8); p.closePath(); }, '#5a5f6a', INK, 1.4);
    path(g, p => { p.moveTo(-13, 6); p.lineTo(13, 6); p.lineTo(15, 12); p.lineTo(-15, 12); p.closePath(); }, '#7a3a2a', INK, 1.2); for (const x of [-9, -3, 3, 9]) ell(g, x, 9, 1, 1, GOLD, INK, 0.4);
    rr(g, -1.6, -17, 3.2, 7, 1, GOLD, INK, 0.9); path(g, p => { p.moveTo(0, -17); p.quadraticCurveTo(-8, -21, -10, -12); p.quadraticCurveTo(-4, -16, 0, -14); p.closePath(); }, RED, INK, 0.9);
    g.globalAlpha = 0.35; ell(g, -6, -4, 3, 5, '#fff'); g.globalAlpha = 1; plus(g, -16, 15, 3.6); plus(g, 16, 14, 3.2);
  };
  A.jaejip = g => { // 재집결: 다시 일으켜 세운 깃발과 감아 도는 화살표
    cord(g, p => { p.arc(0, 2, 16, PI * 0.15, PI * 1.6); }, WHITE, 2.2); poly(g, [-3, -17.6, 5, -14.2, -2.4, -9.8], WHITE, INK, 1);
    flag(g, -2, 16, 26, RED, 0.08); ell(g, -2, 15.4, 6, 2.2, BRASS, INK, 0.9);
    for (const [x, y] of [[12, 12], [15, 5]]) ell(g, x, y, 3, 3, INDIGO, INK, 1);
  };
  A.dolmyeong = g => { // 돌격 명령: 달려드는 말 머리와 언월도
    for (const y of [-6, 1, 8]) line(g, [-22, y, -14, y], INK, 1.3);
    path(g, p => { p.moveTo(-10, 18); p.quadraticCurveTo(-12, 2, -4, -8); p.quadraticCurveTo(2, -16, 12, -13); p.quadraticCurveTo(18, -11, 17, -6); p.quadraticCurveTo(11, -5, 6, -1); p.quadraticCurveTo(4, 8, 8, 18); p.closePath(); }, '#8a5a3a', INK, 1.3);
    path(g, p => { p.moveTo(-4, -8); p.quadraticCurveTo(-10, -4, -12, 6); p.quadraticCurveTo(-8, -2, -2, -4); p.closePath(); }, BLACK); ell(g, 7, -10, 1.4, 1.4, INK); poly(g, [-1, -12, 1, -19, 3, -12], '#8a5a3a', INK, 0.9);
    line(g, [-3, -5, 9, -11], RED, 1.6); line(g, [9, -11, 15, -7], RED, 1.6);
    g.save(); g.translate(14, 6); g.rotate(0.5); line(g, [0, 14, 0, -10], INK, 3); line(g, [0, 14, 0, -10], '#7a3a2a', 1.6); path(g, p => { p.moveTo(-1, -10); p.quadraticCurveTo(8, -13, 5, -22); p.quadraticCurveTo(2, -16, -2, -17); p.closePath(); }, STEEL, INK, 1.1); g.restore();
  };
  A.chonggong = g => { // 총공격: 붉은 해 앞에 셋 엇건 창과 깃발
    rays(g, 0, -2, 14, 22, 12, GOLD, 1.8); ell(g, 0, -2, 12, 12, '#d9553f', INK, 1.3); ell(g, -3, -5, 4, 3, 'rgba(255,255,255,0.35)');
    for (const a of [-0.55, 0, 0.55]) { g.save(); g.translate(0, 20); g.rotate(a); line(g, [0, 0, 0, -36], INK, 3); line(g, [0, 0, 0, -36], WOOD, 1.6); poly(g, [-2.4, -35, 0, -42, 2.4, -35], STEEL, INK, 0.9); rr(g, -1.6, -35, 3.2, 2.2, 0.6, RED, INK, 0.5); g.restore(); }
    spark(g, -17, -17, 3.2); spark(g, 17, -18, 2.6);
  };
  // ───── 검객 ─────
  A.baldo = g => { // 발도: 칼집에서 빠져나오는 칼날
    g.save(); g.rotate(-0.75); rr(g, -3, -2, 6, 26, 2.6, BLACK, INK, 1.2); for (const y of [4, 14]) rr(g, -3.4, y, 6.8, 2.2, 0.8, GOLD, INK, 0.6); rr(g, -4.6, -3.6, 9.2, 2.6, 1, GOLD, INK, 0.9);
    path(g, p => { p.moveTo(-1.7, -3.6); p.quadraticCurveTo(-1, -14, 2.6, -24); p.quadraticCurveTo(2.4, -14, 1.7, -3.6); p.closePath(); }, STEEL, INK, 1.1); g.globalAlpha = 0.7; line(g, [0.5, -6, 1.8, -20], '#fff', 0.8); g.globalAlpha = 1; g.restore();
    spark(g, -4, -7, 5, '#fffbe6'); for (const [x, y] of [[-14, -14], [-6, -19], [6, 4]]) line(g, [x, y, x - 3, y - 3], INK, 1.2);
  };
  A.geurimja = g => { // 그림자 베기: 어둠 속을 가르는 보랏빛 칼자국
    g.globalAlpha = 0.85; ell(g, 2, 4, 15, 15, '#3a3248', INK, 1.1); g.globalAlpha = 1;
    path(g, p => { p.moveTo(-20, 16); p.quadraticCurveTo(0, 6, 20, -18); p.quadraticCurveTo(4, 2, -20, 16); p.closePath(); }, '#b9a6e0', INK, 1.1);
    path(g, p => { p.moveTo(-14, 13); p.quadraticCurveTo(2, 5, 16, -13); p.quadraticCurveTo(3, 3, -14, 13); p.closePath(); }, WHITE);
    for (const [x, y] of [[-4, -6], [6, 9]]) { ell(g, x, y, 1.6, 1.1, '#f0d264', INK, 0.5); } spark(g, 15, -17, 3.4, '#e8dcff');
  };
  A.kalbaram = g => { // 칼바람: 휘도는 바람에 실린 세 자루 칼
    cord(g, p => { p.arc(0, 0, 17, -0.4, PI * 1.25); }, '#dfe6ee', 2); cord(g, p => { p.arc(0, 0, 10, PI * 0.5, PI * 2.1); }, '#eef3f4', 1.8);
    for (let i = 0; i < 3; i++) { const a = i / 3 * TAU - 0.5; blade(g, Math.cos(a) * 12, Math.sin(a) * 12, a + PI * 0.9, 13); }
    ell(g, 0, 0, 3, 3, GOLD, INK, 0.8);
  };
  A.yeonhwan = g => { // 연환검: 잇달아 그은 칼빛 셋
    for (const [dx, dy, s] of [[-8, 9, 0.8], [0, 0, 0.95], [8, -9, 1.1]]) { g.save(); g.translate(dx, dy); g.scale(s, s); path(g, p => { p.moveTo(-12, 5); p.quadraticCurveTo(0, -8, 13, -4); p.quadraticCurveTo(0, -3, -12, 5); p.closePath(); }, WHITE, INK, 1); g.restore(); }
    blade(g, 12, 8, 0.75, 16); spark(g, -16, -14, 3.4, '#fffbe6'); spark(g, 18, -18, 2.6, '#fffbe6');
  };
  A.muyeong = g => { // 무영보: 흐려지며 앞질러 가는 짚신 발자국
    for (const [x, y, a, al] of [[-14, 14, -0.3, 0.3], [-6, 4, -0.3, 0.5], [3, -5, -0.3, 0.75]]) { g.globalAlpha = al; ell(g, x, y, 3, 5.2, '#8a6a4a', INK, 0.8, a); for (const d of [-2, 0, 2]) line(g, [x - 2, y + d, x + 2, y + d], 'rgba(38,42,54,0.5)', 0.5); g.globalAlpha = 1; }
    g.save(); g.translate(11, -10); g.rotate(-0.3); path(g, p => { p.moveTo(-5, 9); p.quadraticCurveTo(-6.4, -6, 0, -10); p.quadraticCurveTo(6.4, -6, 5, 9); p.quadraticCurveTo(0, 11.6, -5, 9); p.closePath(); }, STRAW, INK, 1.2);
    for (let y = -6; y < 9; y += 3) line(g, [-4.4, y, 4.4, y], '#a8884a', 0.7); cord(g, p => { p.moveTo(-4, -3); p.quadraticCurveTo(0, -8, 4, -3); }, '#d9b77a', 1.2); g.restore();
    for (const y of [-14, -8]) line(g, [-20, y, -10, y + 3], INK, 1.2);
  };
  A.nakhwa = g => { // 낙화검: 매화 꽃잎이 흩날리는 가운데 내리꽂는 칼
    blade(g, 0, -15, PI, 24);
    plum(g, -13, -10, 6.4, 0.3); plum(g, 13, -2, 5.4, 1.2); plum(g, -8, 13, 4.6, 0.8);
    for (const [x, y, a] of [[15, 14, 0.4], [-18, 3, 1.4], [8, -18, 2.2], [18, -14, 0.9]]) { g.save(); g.translate(x, y); g.rotate(a); ell(g, 0, 0, 2.6, 1.6, PINKL, INK, 0.6); g.restore(); }
  };
  // ───── 명궁 ─────
  A.sandeot = g => { // 사냥 덫: 안쪽으로 이를 세운 쇠덫 고리와 말뚝 사슬
    g.globalAlpha = 0.2; ell(g, -2, 13, 19, 4, INK); g.globalAlpha = 1;
    for (const s of [-1, 1]) { rr(g, s > 0 ? 9 : -21, -1.6, 12, 3.2, 1.4, IRON, INK, 0.9); ell(g, s * 19, 0, 2.4, 4, GREY, INK, 0.8); }
    ell(g, -2, 0, 13, 11, null, INK, 4.4); ell(g, -2, 0, 13, 11, null, GREY, 2.4);
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, cx = -2 + Math.cos(a) * 12, cy = Math.sin(a) * 10; poly(g, [cx + Math.cos(a + 1.57) * 1.8, cy + Math.sin(a + 1.57) * 1.6, -2 + Math.cos(a) * 6.4, Math.sin(a) * 5.2, cx - Math.cos(a + 1.57) * 1.8, cy - Math.sin(a + 1.57) * 1.6], STEEL, INK, 0.6); }
    ell(g, -2, 0, 3.4, 3, '#b98a55', INK, 0.9);
    for (let i = 0; i < 3; i++) ell(g, 10 + i * 2.6, 10 + i * 2.6, 1.9, 1.4, null, INK, 1.1); line(g, [19, 21, 19, 13], INK, 3.6); line(g, [19, 21, 19, 13], WOOD, 2); poly(g, [17, 13, 19, 9.6, 21, 13], WOODD, INK, 0.8);
  };
  A.uneun = g => { // 우는 화살: 구멍 뚫린 소리통 화살촉과 퍼지는 소리
    g.save(); g.rotate(0.8); line(g, [0, 20, 0, -8], INK, 2.8); line(g, [0, 20, 0, -8], '#e9d9b0', 1.3); poly(g, [-2.6, 20, 0, 17, 2.6, 20, 2.6, 25, 0, 22.4, -2.6, 25], WHITE, INK, 0.8);
    ell(g, 0, -12, 4.4, 6, WOOD, INK, 1.1); for (const y of [-14, -10]) ell(g, -1.4, y, 0.9, 0.9, INK); poly(g, [-2, -17.4, 0, -22, 2, -17.4], STEEL, INK, 0.8); g.restore();
    waves(g, -10, -10, 5, 3, PI * 0.8, PI * 1.5, INK, 1.2); waves(g, -10, -10, 5, 3, PI * 1.8, PI * 2.2, INK, 1.2);
  };
  A.mori = g => { // 몰이: 사방에서 가운데로 몰아드는 화살 표
    ell(g, 0, 0, 7, 7, RED, INK, 1.2); ell(g, 0, 0, 3, 3, WHITE, INK, 0.8);
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + 0.3, x0 = Math.cos(a) * 21, y0 = Math.sin(a) * 21, x1 = Math.cos(a) * 11, y1 = Math.sin(a) * 11; line(g, [x0, y0, x1, y1], INK, 2.6); line(g, [x0, y0, x1, y1], STRAW, 1.2); const nx = -Math.sin(a), ny = Math.cos(a); poly(g, [x1 + nx * 2.6, y1 + ny * 2.6, x1 - Math.cos(a) * 4, y1 - Math.sin(a) * 4, x1 - nx * 2.6, y1 - ny * 2.6], STRAW, INK, 0.8); }
  };
  A.jeogyeok = g => { // 저격: 멀리 작은 과녁을 꿰뚫는 한 발
    ell(g, 12, -12, 7, 7, WHITE, INK, 1.1); ell(g, 12, -12, 4.4, 4.4, RED, INK, 0.8); ell(g, 12, -12, 1.8, 1.8, WHITE);
    for (const [x, y] of [[-20, 9], [-17, 15], [-12, 19]]) line(g, [x, y, x + 7, y - 7], 'rgba(38,42,54,0.55)', 1.1);
    arrow(g, -12, 12, PI * 0.25, 30); spark(g, 19, -19, 3.2, '#fffbe6');
  };
  A.sanyangpan = g => { // 사냥판: 말뚝에 걸어 펼친 그물
    for (const x of [-17, 17]) { line(g, [x, 20, x, -16], INK, 3.8); line(g, [x, 20, x, -16], WOOD, 2.2); poly(g, [x - 2, -16, x, -20, x + 2, -16], WOODD, INK, 0.8); }
    g.beginPath(); for (let i = 0; i <= 4; i++) { const y = -12 + i * 6.4; g.moveTo(-17, y); g.quadraticCurveTo(0, y + 4, 17, y); } for (let i = 0; i <= 5; i++) { const x = -17 + i * 6.8; g.moveTo(x, -12); g.lineTo(x + (x * 0.05), 14); } st(g, INK, 1.6);
    g.beginPath(); for (let i = 0; i <= 4; i++) { const y = -12 + i * 6.4; g.moveTo(-17, y); g.quadraticCurveTo(0, y + 4, 17, y); } for (let i = 0; i <= 5; i++) { const x = -17 + i * 6.8; g.moveTo(x, -12); g.lineTo(x + (x * 0.05), 14); } st(g, '#d9b77a', 0.8);
    ell(g, 0, 3, 5, 5, RED, INK, 1); ell(g, 0, 3, 2, 2, WHITE);
  };
  A.baekbal = g => { // 백발백중: 한가운데 몰려 꽂힌 화살 셋
    rays(g, 0, 4, 18, 22, 10, GOLD, 1.4);
    ell(g, 0, 4, 16, 16, WHITE, INK, 1.3); ell(g, 0, 4, 11.4, 11.4, RED, INK, 0.9); ell(g, 0, 4, 7, 7, WHITE, INK, 0.9); ell(g, 0, 4, 3, 3, RED, INK, 0.8);
    for (const a of [0.55, 0.85, 1.15]) { g.save(); g.translate(Math.cos(a) * 1.2, 4 - Math.sin(a) * 1.2); g.rotate(a); line(g, [0, 0, 0, -22], INK, 2.6); line(g, [0, 0, 0, -22], '#e9d9b0', 1.2); poly(g, [-2.4, -16, 0, -18.4, 2.4, -16, 2.4, -22.4, 0, -20, -2.4, -22.4], WHITE, INK, 0.7); g.restore(); }
  };
  // ───── 고승 ─────
  A.hapjang = g => { // 합장: 모은 두 손과 은은한 빛무리
    g.globalAlpha = 0.5; ell(g, 0, -2, 18, 18, '#fbe9b8'); g.globalAlpha = 1; rays(g, 0, -2, 15, 20, 9, GOLD, 1.2, -PI * 0.95, PI * 0.9);
    for (const s of [-1, 1]) path(g, p => { p.moveTo(0, 16); p.quadraticCurveTo(s * 10, 12, s * 8, -2); p.quadraticCurveTo(s * 6, -14, 0, -18); p.closePath(); }, SKIN, INK, 1.2);
    line(g, [0, -17, 0, 15], INK, 1); for (const s of [-1, 1]) for (const y of [-8, -2, 4]) line(g, [s * 3.4, y, s * 6.6, y + 1.2], 'rgba(38,42,54,0.45)', 0.7);
    for (const s of [-1, 1]) path(g, p => { p.moveTo(s * 1, 12); p.lineTo(s * 9, 8); p.lineTo(s * 17, 20); p.lineTo(s * 4, 21); p.closePath(); }, '#8a8a96', INK, 1.1);
    for (let i = 0; i < 7; i++) ell(g, -6 + i * 2, 16 + Math.sin(i / 6 * PI) * 4, 1.3, 1.3, '#5a3a20', INK, 0.4);
  };
  A.moktak = g => { // 죽비 소리: 갈라진 대나무 죽비와 맑은 소리
    g.save(); g.rotate(-0.5); for (const dx of [-2.2, 2.2]) rr(g, dx - 2, -18, 4, 26, 1.6, '#c9b56a', INK, 1.1); rr(g, -4.6, 8, 9.2, 13, 2, '#a8924a', INK, 1.2); for (const y of [12, 16]) line(g, [-4.6, y, 4.6, y], '#6a5a2a', 1); line(g, [0, -18, 0, 8], INK, 0.9); g.restore();
    waves(g, 6, -6, 6, 3, -PI * 0.55, PI * 0.15, INK, 1.3); spark(g, 17, 12, 3, '#fffbe6');
  };
  A.geumgang = g => { // 금강 결계: 연꽃 무늬 놋쇠 방패와 빛살
    rays(g, 0, 0, 17, 22, 12, GOLD, 1.4);
    ell(g, 0, 0, 16, 16, BRASS, INK, 1.4); ell(g, 0, 0, 12.6, 12.6, GOLD, INK, 1); g.globalAlpha = 0.35; ell(g, -5, -6, 5, 3, '#fff'); g.globalAlpha = 1;
    for (const [a, l] of [[-1, 8], [1, 8], [-0.5, 9.6], [0.5, 9.6], [0, 10.6]]) { g.save(); g.translate(0, 7); g.rotate(a); path(g, p => { p.moveTo(0, 0); p.quadraticCurveTo(-3.6, -l * 0.55, 0, -l); p.quadraticCurveTo(3.6, -l * 0.55, 0, 0); }, a ? PINK : PINKL, INK, 0.8); g.restore(); }
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; ell(g, Math.cos(a) * 14.2, Math.sin(a) * 14.2, 0.9, 0.9, '#fff4d0', INK, 0.4); }
  };
  A.yeondeung = g => { // 연등: 꽃잎을 겹겹이 붙인 연꽃 등과 술
    line(g, [0, -22, 0, -13], INK, 1.3); ell(g, 0, -22, 1.8, 1.8, GOLD, INK, 0.6);
    g.globalAlpha = 0.35; ell(g, 0, 0, 20, 18, '#ffd98a'); g.globalAlpha = 1;
    for (const [y, r, n, col] of [[6, 14, 9, PLUM], [0, 12, 8, PINK], [-6, 9, 7, PINKL]]) for (let i = 0; i < n; i++) { const a = PI + (i + 0.5) / n * PI; g.save(); g.translate(Math.cos(a) * r * 0.86, y + Math.sin(a) * r * 0.3); g.rotate(a + PI / 2); path(g, p => { p.moveTo(0, 0); p.quadraticCurveTo(-3.4, -5, 0, -9); p.quadraticCurveTo(3.4, -5, 0, 0); }, col, INK, 0.7); g.restore(); }
    ell(g, 0, 8, 13, 4, LEAF, INK, 1); tassel(g, 0, 11, 9, RED);
  };
  A.gongdeok = g => { // 공덕: 쌀과 엽전이 담긴 바리때
    for (const [x, y] of [[-12, -12], [11, -15], [0, -19]]) spark(g, x, y, 2.8);
    path(g, p => { p.moveTo(-17, -2); p.quadraticCurveTo(-16, 16, 0, 16); p.quadraticCurveTo(16, 16, 17, -2); p.closePath(); }, '#5a3a26', INK, 1.4); g.globalAlpha = 0.3; ell(g, -8, 6, 3, 6, '#fff'); g.globalAlpha = 1;
    ell(g, 0, -2, 17, 4.6, '#f3ead2', INK, 1.2); for (let i = 0; i < 9; i++) ell(g, -11 + (i % 5) * 5.4, -3 + Math.floor(i / 5) * 2.2, 1.4, 0.9, WHITE, 'rgba(38,42,54,0.4)', 0.4);
    coin(g, 6, -6, 4.2); coin(g, -5, -7, 3.6);
  };
  A.jabi = g => { // 대자대비: 활짝 핀 큰 연꽃과 둥근 빛
    rays(g, 0, 2, 17, 23, 16, GOLD, 1.5); g.globalAlpha = 0.45; ell(g, 0, 0, 17, 17, '#fbe9b8'); g.globalAlpha = 1;
    for (const [a, l, col] of [[-1.3, 13, PLUM], [1.3, 13, PLUM], [-0.85, 15, PINK], [0.85, 15, PINK], [-0.4, 17, PINKL], [0.4, 17, PINKL], [0, 18, WHITE]]) { g.save(); g.translate(0, 12); g.rotate(a); path(g, p => { p.moveTo(0, 0); p.quadraticCurveTo(-6, -l * 0.55, 0, -l); p.quadraticCurveTo(6, -l * 0.55, 0, 0); }, col, INK, 1); g.restore(); }
    ell(g, 0, 13, 16, 3.6, LEAF, INK, 1.1); ell(g, 0, 10, 3.4, 2, GOLD, INK, 0.7);
  };
  // ───── 신선 ─────
  A.baram = g => { // 바람 부채: 신선의 깃털 부채와 휘도는 바람
    cord(g, p => { p.moveTo(-21, 12); p.bezierCurveTo(-12, 4, -6, 18, 4, 10); }, '#eef3f4', 1.8); cord(g, p => { p.moveTo(-20, 19); p.quadraticCurveTo(-8, 13, 2, 18); }, '#dfe6ee', 1.6);
    g.save(); g.translate(6, -2); g.rotate(0.45);
    for (let i = -3; i <= 3; i++) { g.save(); g.rotate(i * 0.2); path(g, p => { p.moveTo(0, 6); p.quadraticCurveTo(-4.6, -6, 0, -19); p.quadraticCurveTo(4.6, -6, 0, 6); }, i % 2 ? WHITE : '#e8e2d2', INK, 0.9); line(g, [0, 4, 0, -16], 'rgba(38,42,54,0.45)', 0.6); g.restore(); }
    rr(g, -3, 4, 6, 4, 1.4, GOLD, INK, 0.9); line(g, [0, 8, 0, 20], INK, 3.4); line(g, [0, 8, 0, 20], '#7a4a2c', 1.8); tassel(g, 0, 20, 5, RED); g.restore();
  };
  A.ure = g => { // 우레: 먹구름에서 땅을 두드리는 두 줄기 번개
    cloud(g, 0, -13, 1.35, '#5a5470'); g.globalAlpha = 0.3; ell(g, -6, -16, 6, 2, '#fff'); g.globalAlpha = 1;
    poly(g, [-6, -6, -13, 5, -8, 5, -12, 18, -2, 1, -7, 1, -2, -6], '#f0d264', INK, 1.1); poly(g, [8, -6, 2, 5, 7, 5, 4, 17, 13, 1, 8, 1, 12, -6], '#fffbe6', INK, 1.1);
    for (const [x, r] of [[-12, 5], [4, 6]]) { g.beginPath(); g.ellipse(x, 19, r, 1.8, 0, 0, TAU); st(g, INK, 1); }
  };
  A.seorit = g => { // 서릿발: 땅에서 솟는 얼음 기둥
    g.globalAlpha = 0.25; ell(g, 0, 16, 21, 4.4, '#7fb6d0'); g.globalAlpha = 1;
    for (const [x, h, w, a] of [[-12, 18, 5, -0.2], [-3, 28, 6.4, -0.05], [7, 22, 5.6, 0.12], [15, 13, 4.4, 0.3]]) { g.save(); g.translate(x, 16); g.rotate(a); poly(g, [-w, 0, -w * 0.6, -h * 0.7, 0, -h, w * 0.6, -h * 0.7, w, 0], ICE, INK, 1.1); poly(g, [-w * 0.2, -2, 0, -h + 3, w * 0.3, -2], '#e8f8ff'); g.restore(); }
    spark(g, -17, -10, 3, '#e8f8ff'); spark(g, 16, -14, 2.4, '#e8f8ff');
  };
  A.dungap = g => { // 둔갑: 반은 웃고 반은 어둠에 잠긴 탈
    path(g, p => { p.moveTo(0, -19); p.quadraticCurveTo(-17, -17, -16, 2); p.quadraticCurveTo(-14, 18, 0, 19); p.quadraticCurveTo(14, 18, 16, 2); p.quadraticCurveTo(17, -17, 0, -19); p.closePath(); }, '#efe0bf', INK, 1.4);
    g.save(); g.beginPath(); g.rect(0, -22, 24, 44); g.clip(); path(g, p => { p.moveTo(0, -19); p.quadraticCurveTo(17, -17, 16, 2); p.quadraticCurveTo(14, 18, 0, 19); p.closePath(); }, '#4a3a62'); g.restore(); line(g, [0, -19, 0, 19], INK, 1);
    g.beginPath(); g.arc(-7, -3, 4, PI * 1.1, PI * 1.9); st(g, INK, 1.6); g.beginPath(); g.arc(7, -3, 4, PI * 1.1, PI * 1.9); st(g, GOLD, 1.6);
    g.beginPath(); g.arc(0, 4, 9, 0.25, PI - 0.25); st(g, INK, 1.6); ell(g, -10, 5, 2.4, 1.4, '#e89a8a');
    cord(g, p => { p.moveTo(16, -14); p.bezierCurveTo(24, -18, 22, -6, 17, -7); }, PURPLE, 1.4);
  };
  A.bulsae = g => { // 불새: 불꽃 꼬리를 끌며 날아오르는 새
    for (const [dx, dy, r] of [[-12, 12, 5], [-7, 15, 4], [-16, 6, 4]]) flame(g, dx, dy, r * 0.9);
    path(g, p => { p.moveTo(-10, 8); p.quadraticCurveTo(-2, 2, 6, -4); p.quadraticCurveTo(12, -8, 16, -6); p.quadraticCurveTo(14, -2, 8, 2); p.quadraticCurveTo(2, 8, -10, 8); p.closePath(); }, FLAME, INK, 1.2);
    for (const s of [-1, 1]) path(g, p => { p.moveTo(2, -1); p.quadraticCurveTo(-6 + s * 2, -14 - s * 2, -16, -18 + s * 6); p.quadraticCurveTo(-4, -8, 2, -1); p.closePath(); }, s > 0 ? '#d9553f' : GLOW, INK, 1.1);
    poly(g, [16, -6, 21, -5, 16, -3], GOLD, INK, 0.8); ell(g, 12, -6, 1, 1, INK); spark(g, 18, -17, 3);
  };
  A.byeolttong = g => { // 별똥비: 꼬리를 끌며 떨어지는 별 셋
    for (const [x, y, s] of [[10, 10, 1.15], [-9, 2, 0.9], [4, -12, 0.7]]) { g.save(); g.translate(x, y); g.scale(s, s); path(g, p => { p.moveTo(2, -2); p.quadraticCurveTo(-10, -12, -22, -20); p.quadraticCurveTo(-8, -6, -2, 2); p.closePath(); }, GLOW, INK, 0.9); spark(g, 0, 0, 6.4, '#f0d264'); g.restore(); }
    for (const [x, y] of [[-18, 16], [17, -16], [-4, 18]]) ell(g, x, y, 1.2, 1.2, '#fffbe6', INK, 0.5);
  };
  // ───── 상쇠 ─────
  A.jajinmori = g => { // 자진모리: 꽹과리와 잦은 가락
    ell(g, -3, 2, 15, 15, BRASS, INK, 1.4); ell(g, -3, 2, 11, 11, GOLD, INK, 1); ell(g, -6, -2, 4, 2.6, 'rgba(255,255,255,0.45)');
    tassel(g, -3, -13, 8, RED); g.save(); g.translate(13, -6); g.rotate(0.7); line(g, [0, 10, 0, -10], INK, 3); line(g, [0, 10, 0, -10], WOOD, 1.6); ell(g, 0, -11, 3.4, 3.4, '#8a4f2c', INK, 1); g.restore();
    for (let i = 0; i < 4; i++) line(g, [13 + i * 2, 8 + i * 3.4, 18 + i * 2, 6 + i * 3.4], INK, 1.2);
  };
  A.hwimori = g => { // 휘모리: 징과 크게 퍼지는 울림
    waves(g, 0, 0, 17, 2, 0, TAU, 'rgba(38,42,54,0.6)', 1.1);
    ell(g, 0, 0, 14, 14, '#c9962e', INK, 1.4); ell(g, 0, 0, 10, 10, null, '#8a6a20', 1); ell(g, 0, 0, 4, 4, '#e6b93e', INK, 0.8); ell(g, -5, -5, 4, 2.4, 'rgba(255,255,255,0.4)');
    g.save(); g.translate(13, 12); g.rotate(-0.8); line(g, [0, 10, 0, -6], INK, 3.2); line(g, [0, 10, 0, -6], WOOD, 1.8); ell(g, 0, -8, 4.4, 4.4, '#e8dcc0', INK, 1.1); g.restore();
  };
  A.gilnori = g => { // 길놀이: 꿩 깃을 꽂은 농기와 오색 띠
    line(g, [-6, 22, -6, -18], INK, 3.4); line(g, [-6, 22, -6, -18], WOOD, 1.9);
    for (const [a, col] of [[-0.5, '#5a7a4a'], [-0.2, '#8a5a2a'], [0.15, '#5a7a4a']]) { g.save(); g.translate(-6, -18); g.rotate(a); path(g, p => { p.moveTo(0, 0); p.quadraticCurveTo(-2, -4, 0, -7); p.quadraticCurveTo(2, -4, 0, 0); }, col, INK, 0.7); g.restore(); }
    path(g, p => { p.moveTo(-6, -14); p.lineTo(14, -14); p.lineTo(14, 12); p.quadraticCurveTo(4, 8, -6, 12); p.closePath(); }, WHITE, INK, 1.2);
    for (const [y, col] of [[-12, RED], [-7, '#e0b23c'], [-2, LEAFD], [3, INDIGO]]) rr(g, -6, y, 20, 3, 0, col);
    g.beginPath(); g.moveTo(-6, -14); g.lineTo(14, -14); g.lineTo(14, 12); g.quadraticCurveTo(4, 8, -6, 12); st(g, INK, 1.2);
    for (const x of [16, 19]) cord(g, p => { p.moveTo(14, -12); p.quadraticCurveTo(x + 2, 0, x, 12); }, RED, 1);
  };
  A.sangmo = g => { // 상모 돌리기: 부포 달린 전립과 휘도는 둥근 자취
    g.setLineDash([3, 2.6]); g.beginPath(); g.ellipse(0, -10, 20, 7, -0.15, 0, TAU); st(g, INK, 1.4); g.setLineDash([]);
    ell(g, 0, 6, 16, 4.4, '#2e2c35', INK, 1.2); path(g, p => { p.moveTo(-8, 6); p.quadraticCurveTo(-8, -6, 0, -6); p.quadraticCurveTo(8, -6, 8, 6); p.closePath(); }, '#38363f', INK, 1.2); line(g, [-8, 3, 8, 3], GOLD, 1.4);
    line(g, [0, -6, 0, -12], INK, 1.6); ell(g, 0, -14, 4.6, 4, WHITE, INK, 1); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; line(g, [Math.cos(a) * 2, -14 + Math.sin(a) * 2, Math.cos(a) * 5.4, -14 + Math.sin(a) * 4.6], 'rgba(38,42,54,0.4)', 0.6); }
    for (const [x, y, c] of [[-19, -14, RED], [18, -6, INDIGO]]) spark(g, x, y, 3, c);
  };
  A.sinpuri = g => { // 신명풀이: 가운데서 터져 나오는 오색 띠
    const cols = [RED, '#e0b23c', LEAFD, WHITE, INDIGO];
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU, col = cols[i % 5]; cord(g, p => { p.moveTo(0, 0); p.quadraticCurveTo(Math.cos(a + 0.5) * 12, Math.sin(a + 0.5) * 12, Math.cos(a) * 21, Math.sin(a) * 21); }, col, 1.8); }
    ell(g, 0, 0, 6, 6, GOLD, INK, 1.1); taegeuk(g, 0, 0, 4);
  };
  A.hanmadang = g => { // 한마당: 멍석 둘레에 선 오색 깃발과 금빛
    rays(g, 0, -4, 15, 22, 12, GOLD, 1.4);
    ell(g, 0, 10, 20, 7, '#c9a86a', INK, 1.3); for (let i = 1; i < 4; i++) { g.beginPath(); g.ellipse(0, 10, 20 - i * 5, 7 - i * 1.75, 0, 0, TAU); st(g, '#a8884a', 0.7); }
    for (const [x, col, a] of [[-15, RED, -0.15], [-7, '#e0b23c', -0.05], [1, LEAFD, 0], [9, INDIGO, 0.05], [16, WHITE, 0.15]]) flag(g, x, 10, 22, col, a, 0.85);
    ell(g, 0, 7, 3.6, 3.6, '#2e2c35', INK, 0.9);
  };
  // ───── 두령 ─────
  A.hotong = g => { // 호통: 나각을 불어 쩌렁쩌렁 울리는 소리
    g.save(); g.translate(-4, 2); g.rotate(-0.3);
    path(g, p => { p.moveTo(-16, 2); p.quadraticCurveTo(-6, -12, 10, -8); p.quadraticCurveTo(16, -3, 10, 6); p.quadraticCurveTo(-4, 10, -16, 2); p.closePath(); }, '#f3e2c0', INK, 1.3);
    for (const x of [-8, -2, 4]) { g.beginPath(); g.arc(x, -1, 5, PI * 1.2, PI * 1.9); st(g, '#c9a86a', 0.9); } ell(g, 12, -1, 3, 6.4, '#e8b89a', INK, 1); rr(g, -20, -1, 5, 4, 1.4, '#8a4f2c', INK, 0.9); g.restore();
    waves(g, 10, 0, 8, 3, -PI * 0.42, PI * 0.42, RED, 1.6);
  };
  A.dokki = g => { // 도끼 던지기: 휘돌며 날아가는 도끼
    for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(0, 0, 18 - i * 0, PI * (0.9 + i * 0.12), PI * (1.15 + i * 0.12)); st(g, INK, 1.2 - i * 0.3); }
    g.save(); g.translate(2, 2); g.rotate(-0.9); line(g, [0, 16, 0, -12], INK, 3.6); line(g, [0, 16, 0, -12], WOOD, 2);
    path(g, p => { p.moveTo(-1.6, -14); p.quadraticCurveTo(10, -19, 14, -10); p.quadraticCurveTo(15, -2, 10, 4); p.quadraticCurveTo(6, -2, -1.6, -1); p.closePath(); }, '#6e727c', INK, 1.2); g.beginPath(); g.moveTo(10.4, -15); g.quadraticCurveTo(15.6, -7, 10.4, 2.4); st(g, STEEL, 1.4); g.restore();
    spark(g, 17, -16, 3.2, '#fffbe6');
  };
  A.uihyeong = g => { // 의형제: 맞잡은 두 손과 흰 머리띠
    cord(g, p => { p.moveTo(-20, -12); p.quadraticCurveTo(0, -20, 20, -12); }, WHITE, 2.6); for (const s of [-1, 1]) cord(g, p => { p.moveTo(s * 20, -12); p.quadraticCurveTo(s * 22, -4, s * 18, 0); }, WHITE, 1.8);
    for (const s of [-1, 1]) { path(g, p => { p.moveTo(s * 21, 16); p.lineTo(s * 12, 2); p.lineTo(s * 4, 6); p.lineTo(s * 10, 18); p.closePath(); }, s < 0 ? '#e8dcc0' : '#c9b48a', INK, 1.1); }
    rr(g, -9, -1, 18, 12, 5, SKIN, INK, 1.3); for (const x of [-4.6, -0.6, 3.4]) line(g, [x, 0, x, 6], 'rgba(38,42,54,0.5)', 0.9); rr(g, -12, 1, 8, 5, 2.4, SKIN, INK, 1);
  };
  A.ttuksim = g => { // 뚝심: 쇠띠 두른 두툼한 나무 방패, 찍힌 자국과 회복 잎
    path(g, p => { p.moveTo(-15, -16); p.lineTo(15, -16); p.quadraticCurveTo(17, 4, 0, 20); p.quadraticCurveTo(-17, 4, -15, -16); p.closePath(); }, '#9a6a3a', INK, 1.5);
    for (const y of [-9, 3]) { rr(g, -16, y, 32, 3.6, 0.6, IRON, INK, 0.9); for (const x of [-11, 0, 11]) ell(g, x, y + 1.8, 0.9, 0.9, '#c9cdd2', INK, 0.4); }
    for (const [x, y, a] of [[-6, -3, 0.6], [7, 10, -0.5]]) { g.save(); g.translate(x, y); g.rotate(a); poly(g, [-4, 0, 0, -1, 4, 0, 0, 1.4], '#5a3a20'); g.restore(); }
    for (const s of [-1, 1]) path(g, p => { p.moveTo(14, -12); p.quadraticCurveTo(14 + s * 5, -18, 18, -22); p.quadraticCurveTo(18 - s * 1, -15, 14, -12); }, LEAF, INK, 0.8);
  };
  A.teolgi = g => { // 털어 가기: 엽전이 쏟아지는 주머니
    path(g, p => { p.moveTo(-6, -10); p.quadraticCurveTo(-18, -2, -14, 10); p.quadraticCurveTo(-8, 18, 4, 14); p.quadraticCurveTo(12, 8, 6, -10); p.closePath(); }, '#8a2a26', INK, 1.3);
    rr(g, -8, -14, 16, 5, 2, '#a8322a', INK, 1.1); cord(g, p => { p.moveTo(-6, -11); p.quadraticCurveTo(0, -8, 6, -11); }, GOLD, 1.2);
    g.globalAlpha = 0.3; ell(g, -9, 2, 3, 6, '#fff'); g.globalAlpha = 1; for (let i = 0; i < 4; i++) { const a = PI * 0.25 + i * 0.4; ell(g, -4 + Math.cos(a) * 6, 4 + Math.sin(a) * 6, 1.6, 1.6, '#e0b23c', INK, 0.5); }
    for (const [x, y, r] of [[12, 4, 4.4], [17, 12, 4], [9, 15, 3.6], [18, -4, 3.2]]) coin(g, x, y, r);
  };
  A.dongwon = g => { // 산채 총동원: 횃불 밝힌 목책 문과 깃발
    path(g, p => { p.moveTo(-22, 2); p.lineTo(-12, -12); p.lineTo(-4, -6); p.lineTo(4, -15); p.lineTo(13, -6); p.lineTo(22, 0); p.lineTo(22, 4); p.lineTo(-22, 4); p.closePath(); }, LEAFD, INK, 1.2);
    for (let i = 0; i < 9; i++) { const x = -20 + i * 5; poly(g, [x - 2.2, 20, x - 2.2, 2, x, -1.6, x + 2.2, 2, x + 2.2, 20], WOOD, INK, 0.9); }
    rr(g, -7, 6, 14, 14, 1, '#3a2a20', INK, 1.2); line(g, [0, 6, 0, 20], '#5a3a26', 1); cord(g, p => { p.moveTo(-21, 9); p.lineTo(21, 9); }, '#d9b77a', 1.2);
    for (const x of [-12, 12]) { line(g, [x, 3, x, -6], INK, 2.4); line(g, [x, 3, x, -6], WOODD, 1.2); flame(g, x, -9, 3.6); }
    flag(g, 4, -8, 14, '#d9963f', 0.05, 0.9);
  };
  return A;
}
