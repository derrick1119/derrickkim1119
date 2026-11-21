// 전술 패와 보물의 아이콘 — 인형과 같은 종이 오림 그림체 (가운데가 원점, 대략 ±22 안에 그린다)
import { TAU, INK, PAPER, RED, REDD, INDIGO, NAVY, TEAL, OCHRE, SKIN, FONT_B, st, fs, ell, rr, poly, line, path, text, paperSprite, drawSprite } from './draw.js';
import { symbol } from './symbols.js';

const WHITE = '#fbf7ec', BLACK = '#2b2a30', STEEL = '#e4e8ea', IRON = '#4a4a55', GREY = '#8a8a96', WOOD = '#a9753f', WOODD = '#7a4a2c', GOLD = '#e6b93e', BRASS = '#c9962e', FLAME = '#ff9a2e', GLOW = '#ffe9a0', STONE = '#a59f8f', STRAW = '#d9b24a', LEAF = '#5f9a6a', LEAFD = '#3f6b5c', PURPLE = '#6a4a9a', ICE = '#8fd3e8', WATER = '#bfe3ee';
const PI = Math.PI;

// ───────── 자주 쓰는 조각 ─────────
// 먹선을 두른 굵은 줄 (끈·밧줄·연기)
const cord = (g, fn, col, lw = 1.6) => { g.beginPath(); fn(g); st(g, INK, lw + 1.6); g.beginPath(); fn(g); st(g, col, lw); };
const flame = (g, x, y, r, c1 = FLAME, c2 = GLOW) => {
  path(g, p => { p.moveTo(x, y - r * 1.7); p.quadraticCurveTo(x + r * 1.25, y - r * 0.4, x + r * 0.8, y + r * 0.6); p.quadraticCurveTo(x, y + r * 1.2, x - r * 0.8, y + r * 0.6); p.quadraticCurveTo(x - r * 1.3, y - r * 0.2, x - r * 0.35, y - r * 0.75); p.quadraticCurveTo(x - r * 0.1, y - r * 1.2, x, y - r * 1.7); }, c1, INK, 1);
  path(g, p => { p.moveTo(x, y - r * 0.7); p.quadraticCurveTo(x + r * 0.55, y, x + r * 0.35, y + r * 0.45); p.quadraticCurveTo(x, y + r * 0.7, x - r * 0.35, y + r * 0.4); p.quadraticCurveTo(x - r * 0.5, y - r * 0.1, x, y - r * 0.7); }, c2);
};
// 꼬리에서 a 방향(0 = 위)으로 날아가는 화살
const arrow = (g, x, y, a, l, o = {}) => {
  g.save(); g.translate(x, y); g.rotate(a);
  line(g, [0, 0, 0, -l], INK, 2.8); line(g, [0, 0, 0, -l], o.shaft || '#e9d9b0', 1.3);
  poly(g, [-2.4, 0.5, 0, -2.6, 2.4, 0.5, 2.4, 5.6, 0, 3, -2.4, 5.6], o.fletch || WHITE, INK, 0.8);
  if (o.fire) flame(g, 0, -l - 2, 4.6); else poly(g, [-2.8, -l + 0.6, 0, -l - 6.4, 2.8, -l + 0.6], o.head || STEEL, INK, 0.9);
  g.restore();
};
const coin = (g, x, y, r, on = true) => { ell(g, x, y, r, r, on ? OCHRE : '#b9b3a2', INK, 1.1); rr(g, x - r * 0.34, y - r * 0.34, r * 0.68, r * 0.68, 0.5, on ? '#8a5f1c' : '#7a766a', INK, 0.5); };
const rays = (g, x, y, r0, r1, n, col, lw = 1.4, a0 = 0, arc = TAU) => { for (let i = 0; i < n; i++) { const a = a0 + (n > 1 ? i / (arc === TAU ? n : n - 1) : 0) * arc; line(g, [x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a) * r1, y + Math.sin(a) * r1], col, lw); } };
const spark = (g, x, y, r, col = GLOW) => { poly(g, [x, y - r, x + r * 0.28, y - r * 0.28, x + r, y, x + r * 0.28, y + r * 0.28, x, y + r, x - r * 0.28, y + r * 0.28, x - r, y, x - r * 0.28, y - r * 0.28], col, INK, 0.7); };
const cloud = (g, x, y, s, fill = '#eef3f4', sc = INK) => { for (const [dx, dy, r] of [[-9, 1, 6], [-2, -3, 7.5], [6, -1, 6.5], [11, 2, 4.6]]) ell(g, x + dx * s, y + dy * s, r * s, r * s * 0.8, fill, sc, 1.1); rr(g, x - 12 * s, y, 24 * s, 6 * s, 3 * s, fill); line(g, [x - 13 * s, y + 6 * s, x + 14 * s, y + 6 * s], sc, 1.1); };
const paperTal = (g, x, y, w, h, paper, glyph, bolt) => {
  rr(g, x - w / 2, y - h / 2, w, h, 1, paper, INK, 1.2); rr(g, x - w / 2 + 1.6, y - h / 2 + 1.6, w - 3.2, h - 3.2, 0.5, null, glyph + '88', 0.7);
  g.beginPath(); const u = h / 20;
  if (bolt) { g.moveTo(x + 2.6, y - 7 * u); g.lineTo(x - 2.6, y - 0.6 * u); g.lineTo(x + 1.4, y + 0.2 * u); g.lineTo(x - 2.2, y + 7 * u); }
  else { g.moveTo(x - 3, y - 6.5 * u); g.lineTo(x + 3, y - 4.5 * u); g.lineTo(x - 3, y - 1.6 * u); g.lineTo(x + 3, y + 1.2 * u); g.lineTo(x - 2, y + 4 * u); g.lineTo(x + 1.4, y + 6.6 * u); }
  st(g, glyph, 1.5);
};
// 등나무 방패(등패)
const rattan = (g, x, y, r, boss = RED) => { ell(g, x, y, r, r, '#cda766', INK, 1.3); for (const k of [0.74, 0.46]) { g.beginPath(); g.arc(x, y, r * k, 0, TAU); st(g, '#a17f45', 1); } for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; line(g, [x + Math.cos(a) * r * 0.46, y + Math.sin(a) * r * 0.46, x + Math.cos(a) * r * 0.95, y + Math.sin(a) * r * 0.95], '#a17f45', 0.8); } ell(g, x, y, r * 0.3, r * 0.3, boss, INK, 1); };
const tassel = (g, x, y, l, col = RED) => { ell(g, x, y, 1.7, 1.7, GOLD, INK, 0.7); path(g, p => { p.moveTo(x - 1.6, y + 1.2); p.lineTo(x - 2.6, y + l); p.lineTo(x + 2.6, y + l); p.lineTo(x + 1.6, y + 1.2); p.closePath(); }, col, INK, 0.8); line(g, [x, y + 3, x, y + l - 0.6], 'rgba(38,42,54,0.35)', 0.6); };
const taegeuk = (g, x, y, r) => { ell(g, x, y, r, r, RED, INK, 0.9); path(g, p => { p.arc(x, y, r, 0, PI); p.arc(x - r / 2, y, r / 2, PI, 0, true); p.arc(x + r / 2, y, r / 2, PI, 0); p.closePath(); }, INDIGO); g.beginPath(); g.arc(x, y, r, 0, TAU); st(g, INK, 0.9); };
// 책 한 권 (오침 제본)
const book = (g, x, y, w, h, cover, label = WHITE) => { rr(g, x - w / 2 + 1.6, y - h / 2 + 1.6, w, h, 1, '#efe4c9', INK, 1); rr(g, x - w / 2, y - h / 2, w, h, 1, cover, INK, 1.2); for (let i = 0; i < 5; i++) { const yy = y - h / 2 + 2.4 + i * (h - 4.8) / 4; line(g, [x - w / 2, yy, x - w / 2 + 3, yy], WHITE, 0.9); } line(g, [x - w / 2 + 3, y - h / 2 + 1, x - w / 2 + 3, y + h / 2 - 1], WHITE, 0.7); rr(g, x + w / 2 - 7.5, y - h / 2 + 2.4, 5, h * 0.62, 0.5, label, INK, 0.8); };

// ───────── 전술 패 ─────────
export const CARD_ART = {
  sling(g) { // 돌팔매
    cord(g, p => { p.moveTo(-15, 13); p.quadraticCurveTo(-13, -2, -1, -5); }, '#b98a55'); cord(g, p => { p.moveTo(-15, 13); p.quadraticCurveTo(-2, 14, 4, 0); }, '#b98a55');
    ell(g, 2, -3, 5.6, 3.4, WOODD, INK, 1.1, -0.7); ell(g, -15, 13, 3.2, 3.2, SKIN, INK, 1.1);
    for (const [x, y, l] of [[-2, -15, 6], [2, -18, 7], [-5, -11, 4]]) line(g, [x, y, x + l, y - l * 0.55], INK, 1.2);
    path(g, p => { p.moveTo(8, -12); p.lineTo(12, -18); p.lineTo(19, -16); p.lineTo(20, -9); p.lineTo(14, -5); p.lineTo(8, -8); p.closePath(); }, STONE, INK, 1.3); line(g, [12, -15, 15, -11, 18, -12], 'rgba(38,42,54,0.5)', 0.9); g.globalAlpha = 0.5; ell(g, 12.4, -14.4, 2.2, 1.2, '#fff', null, 0, -0.5); g.globalAlpha = 1;
  },
  rain(g) { // 화살비
    for (const [x, y] of [[5, -21], [15, -15], [-5, -15], [11, -3]]) arrow(g, x, y, PI + 0.3, 21);
    for (const x of [-15, -4, 6]) line(g, [x - 3, 19, x + 3, 19], INK, 1.1);
  },
  firerain(g) { // 불화살 세례
    for (const [x, y] of [[4, -21], [15, -13], [-5, -13]]) arrow(g, x, y, PI + 0.3, 20, { fire: true, shaft: '#c98a5a', fletch: '#f3c9a0' });
    flame(g, 9, 14, 4, FLAME, GLOW); flame(g, -13, 17, 3, '#ffb84a', GLOW);
  },
  thunder(g) { // 벼락
    cloud(g, -1, -14, 1.25, '#7c8296'); g.globalAlpha = 0.3; ell(g, -5, -17, 5, 2, '#fff'); g.globalAlpha = 1;
    poly(g, [3, -7, -8, 6, -1.5, 6, -7, 21, 9, 1, 2.4, 1, 8, -7], '#f0d264', INK, 1.3); line(g, [2, -4, -3, 4], '#fffbe6', 1.2);
    spark(g, 14, 9, 3.4); spark(g, -15, 12, 2.6);
  },
  volley(g) { // 총통 일제사격
    for (const [dy, k] of [[9, 0.86], [-2, 1]]) { g.save(); g.translate(-3, dy); g.rotate(-0.42); g.scale(k, k);
      rr(g, -19, -2.6, 9, 5.2, 2, WOODD, INK, 1.1); rr(g, -12, -5, 24, 10, 2.6, '#b8862a', INK, 1.3); for (const x of [-8, -1, 6]) rr(g, x, -5.8, 2.2, 11.6, 0.7, '#8a5f1c', INK, 0.7); rr(g, 10.5, -6.4, 3.6, 12.8, 1.2, GOLD, INK, 1); g.globalAlpha = 0.4; line(g, [-10, -3, 8, -3], '#fff', 1); g.globalAlpha = 1; g.restore(); }
    flame(g, 15, -13, 5.4); rays(g, 14, -12, 9, 13, 5, INK, 1.2, -PI * 0.75, PI * 0.9);
    ell(g, 6, -19, 3.4, 2.8, '#d9d4c8', INK, 0.9); ell(g, 19, -3, 2.8, 2.4, '#d9d4c8', INK, 0.9);
  },
  caltrop(g) { // 마름쇠
    const cal = (x, y, s) => { for (const [dx, dy, l] of [[0, -1, 10], [-0.9, 0.42, 9.5], [0.9, 0.42, 9.5], [0.12, 1, 5.4]]) { const nx = -dy, ny = dx; poly(g, [x + nx * 1.9 * s, y + ny * 1.9 * s, x + dx * l * s, y + dy * l * s, x - nx * 1.9 * s, y - ny * 1.9 * s], GREY, INK, 1); line(g, [x, y, x + dx * l * s * 0.7, y + dy * l * s * 0.7], STEEL, 0.8); } ell(g, x, y, 2.2 * s, 2.2 * s, IRON, INK, 0.9); };
    g.globalAlpha = 0.2; ell(g, 0, 14, 19, 4.6, INK); g.globalAlpha = 1;
    cal(-9, 7, 0.9); cal(10, 9, 0.8); cal(1, -6, 1.15);
  },
  heal(g) { // 약손
    rays(g, 0, -1, 17, 21, 9, LEAF, 1.5, -PI * 0.95, PI * 0.9);
    for (const [x, h] of [[-8.6, 10], [-4.3, 13], [0.1, 14], [4.5, 11.5]]) rr(g, x, -2 - h, 4, h + 5, 2, SKIN, INK, 1.1);
    g.save(); g.translate(9.5, 3); g.rotate(0.75); rr(g, -2.2, -9, 4.4, 12, 2.2, SKIN, INK, 1.1); g.restore();
    rr(g, -9.4, -3, 18.8, 17, 6, SKIN, INK, 1.2); g.fillStyle = SKIN; g.fillRect(-8, -5, 16, 5); rr(g, -8, 13, 16, 6, 1.5, INDIGO, INK, 1.1); line(g, [-8, 14.6, 8, 14.6], WHITE, 1.2);
    for (const s of [-1, 1]) path(g, p => { p.moveTo(0, 8.6); p.quadraticCurveTo(s * 7, 6, s * 5.4, -0.6); p.quadraticCurveTo(s * 0.6, 2, 0, 8.6); }, LEAF, INK, 0.9); line(g, [0, 9.4, 0, 3], LEAFD, 0.9);
  },
  grail(g) { // 정화 굿
    rays(g, 0, 2, 13, 20, 7, BRASS, 1.6, -PI * 0.92, PI * 0.84); spark(g, -14, -14, 3); spark(g, 13, -16, 2.6); spark(g, 0, -19, 3.4);
    rr(g, -15, 12, 30, 3.4, 1, WOODD, INK, 1); for (const x of [-11, 9]) rr(g, x, 15, 2.4, 5, 0.6, WOODD, INK, 0.9);
    path(g, p => { p.moveTo(-10.5, 0.5); p.quadraticCurveTo(-9.6, 11.6, 0, 11.6); p.quadraticCurveTo(9.6, 11.6, 10.5, 0.5); p.closePath(); }, WHITE, INK, 1.2); ell(g, 0, 0.5, 10.5, 3.2, WATER, INK, 1.1); line(g, [-7.6, 6, 7.6, 6], INDIGO, 1); g.globalAlpha = 0.6; ell(g, -3, 0, 3.4, 0.9, '#fff'); g.globalAlpha = 1;
  },
  wall(g) { // 방패 진
    rattan(g, -12, -2, 9, INDIGO); rattan(g, 12, -2, 9, INDIGO); rattan(g, 0, 3, 12.5);
    for (const x of [-12, 0, 12]) line(g, [x, -20, x, -13], INK, 1.3); poly(g, [0, -20, 6, -18, 0, -16], RED, INK, 0.8);
  },
  horn(g) { // 진군의 북
    for (const s of [-1, 1]) { g.save(); g.rotate(s * 0.62); line(g, [0, 19, 0, -19], INK, 3.6); line(g, [0, 19, 0, -19], WOOD, 2); ell(g, 0, -19, 2.8, 2.8, WHITE, INK, 1); g.restore(); }
    ell(g, 0, 2, 14.5, 14.5, '#a8322a', INK, 1.4); ell(g, 0, 2, 11.4, 11.4, '#f3e7c8', INK, 1.1); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; ell(g, Math.cos(a) * 13, 2 + Math.sin(a) * 13, 1, 1, GOLD, INK, 0.5); }
    taegeuk(g, 0, 2, 5.4);
    for (const s of [-1, 1]) for (const r of [18, 21.5]) { g.beginPath(); g.arc(0, 2, r, s > 0 ? -0.5 : PI - 0.5, s > 0 ? 0.5 : PI + 0.5); st(g, INK, 1.2); }
  },
  cry(g) { // 함성
    rays(g, 0, -6, 15, 21, 7, RED, 1.8, -PI * 0.95, PI * 0.9);
    path(g, p => { p.moveTo(-6, 20); p.lineTo(-7.4, 6); p.lineTo(7.4, 6); p.lineTo(6, 20); p.closePath(); }, INDIGO, INK, 1.2); line(g, [-7, 8.4, 7, 8.4], WHITE, 1.6);
    rr(g, -8.6, -9, 17.2, 16, 5, SKIN, INK, 1.3); for (const x of [-4.3, 0, 4.3]) line(g, [x, -8.4, x, -1.4], 'rgba(38,42,54,0.55)', 1); rr(g, -10.4, -3, 13, 6.4, 3, SKIN, INK, 1.1);
  },
  ambush(g) { // 매복
    g.save(); g.translate(7, -4); g.rotate(0.5); path(g, p => { p.moveTo(-1.6, 2); p.quadraticCurveTo(-0.8, -10, 4, -19); p.quadraticCurveTo(3.2, -9, 1.9, 2); p.closePath(); }, STEEL, INK, 1.1); g.restore(); spark(g, 19, -19, 3.2, '#fffbe6');
    for (const [x, y, r] of [[-11, 8, 9], [10, 9, 9], [0, 1, 11.5], [-7, -4, 7], [7, -3, 6.5]]) ell(g, x, y, r, r * 0.86, LEAFD, INK, 1.2);
    for (const [x, y, r] of [[-12, 5, 4], [3, -3, 5], [11, 6, 3.6]]) { g.globalAlpha = 0.5; ell(g, x, y, r, r * 0.6, LEAF); g.globalAlpha = 1; }
    rr(g, -7.6, 3, 15.2, 5.6, 2.6, BLACK, INK, 0.9); for (const s of [-1, 1]) { path(g, p => { p.moveTo(s * 1.2, 6.4); p.quadraticCurveTo(s * 3.4, 3.6, s * 6, 4.6); p.quadraticCurveTo(s * 4, 7.6, s * 1.2, 6.4); p.closePath(); }, WHITE); ell(g, s * 3.5, 5.6, 0.9, 1, INK); }
    for (const x of [-15, -5, 5, 15]) line(g, [x, 17, x + 1.6, 13], LEAFD, 1.3);
  },
  archers(g) { // 원군 궁수
    line(g, [-15, 20, -15, -20], INK, 3); line(g, [-15, 20, -15, -20], WOODD, 1.5); poly(g, [-15, -20, -1, -17, -6, -13.5, -1, -10, -15, -9], INDIGO, INK, 1);
    g.save(); g.translate(4, 4); g.rotate(0.5);
    const c = p => { p.moveTo(-9, -16); p.bezierCurveTo(4, -15, 12, -7, 5, 0); p.bezierCurveTo(12, 7, 4, 15, -9, 16); }; cord(g, c, '#8a4f2c', 2.2); line(g, [-9, -16, -9, 16], WHITE, 0.9);
    line(g, [-9, 0, 15, 0], INK, 2.6); line(g, [-9, 0, 15, 0], '#e9d9b0', 1.2); poly(g, [14, -2.8, 20.5, 0, 14, 2.8], STEEL, INK, 0.9); poly(g, [-9, -2.2, -6, 0, -9, 2.2, -13, 2.2, -10.6, 0, -13, -2.2], WHITE, INK, 0.7);
    g.restore();
  },
  stakes(g) { // 목책 세우기
    g.globalAlpha = 0.2; ell(g, 0, 17, 21, 4.4, INK); g.globalAlpha = 1;
    for (const [x, a, h] of [[-15, -0.16, 30], [-5, 0.1, 34], [5, -0.08, 33], [15, 0.14, 30]]) { g.save(); g.translate(x, 17); g.rotate(a); poly(g, [-3.6, 0, -3.6, -h + 8, 0, -h, 3.6, -h + 8, 3.6, 0], WOOD, INK, 1.2); line(g, [-1.2, -4, -1.2, -h + 10], 'rgba(122,74,44,0.6)', 0.9); g.restore(); }
    cord(g, p => { p.moveTo(-20, 3); p.quadraticCurveTo(0, 7, 20, 2); }, '#d9b77a', 1.8); cord(g, p => { p.moveTo(-19, -7); p.quadraticCurveTo(0, -3, 19, -8); }, '#d9b77a', 1.8);
  },
  scout(g) { // 척후
    for (const [x, y, a] of [[-15, 15, 0.5], [-7, 9, 0.5], [-13, 3, 0.5]]) { g.globalAlpha = 0.55; ell(g, x, y, 2.4, 4, '#8a6a4a', INK, 0.8, a); g.globalAlpha = 1; }
    g.save(); g.translate(3, -2); g.rotate(-0.6); rr(g, -17, -4.4, 14, 8.8, 2, BRASS, INK, 1.2); rr(g, -4, -5.6, 13, 11.2, 2, '#8a5f1c', INK, 1.2); rr(g, 8, -7, 10, 14, 2, BRASS, INK, 1.3); ell(g, 18, 0, 2.4, 7, WATER, INK, 1.1); for (const x of [-4, 8]) rr(g, x - 1, -6.4, 2.4, 12.8, 0.8, GOLD, INK, 0.6); g.globalAlpha = 0.5; line(g, [-14, -2.4, 14, -3.4], '#fff', 1); g.globalAlpha = 1; g.restore();
    rays(g, 19, -14, 5, 10, 3, INK, 1.3, -PI * 0.55, PI * 0.5); spark(g, -12, -15, 3, '#fffbe6');
  },
  torch(g) { // 횃불
    rays(g, 2, -9, 15, 21, 7, FLAME, 1.6, -PI * 0.95, PI * 0.9);
    g.save(); g.rotate(0.22); line(g, [0, 22, 0, -2], INK, 4.6); line(g, [0, 22, 0, -2], WOODD, 2.8); rr(g, -4.4, -6, 8.8, 9, 2, '#3a3238', INK, 1.1); for (const y of [-3, 0]) line(g, [-4.4, y, 4.4, y], '#d9b77a', 0.9); g.restore();
    flame(g, 1, -12, 8.4); flame(g, -5, -9, 3.4, '#ffb84a'); ell(g, 9, -22, 1.2, 1.2, FLAME, INK, 0.5); ell(g, -9, -20, 1, 1, FLAME, INK, 0.5);
  },
  decoy(g) { // 허수아비
    line(g, [0, 21, 0, -6], INK, 3.4); line(g, [0, 21, 0, -6], WOOD, 1.8); line(g, [-17, -3, 17, -3], INK, 3.2); line(g, [-17, -3, 17, -3], WOOD, 1.7);
    path(g, p => { p.moveTo(-15, -7); p.lineTo(15, -7); p.lineTo(13.4, 1.6); p.lineTo(7.6, -0.4); p.lineTo(9.4, 14); p.lineTo(5, 11); p.lineTo(1.6, 15.4); p.lineTo(-2, 11); p.lineTo(-5.6, 15); p.lineTo(-9.4, 12.4); p.lineTo(-7.6, -0.4); p.lineTo(-13.4, 1.6); p.closePath(); }, '#d8cfb2', INK, 1.2);
    rr(g, -5.6, 2.4, 5, 5, 0.5, '#a84a32', INK, 0.8); rr(g, 1.6, 6, 4.2, 4.2, 0.5, INDIGO, INK, 0.8);
    for (const s of [-1, 1]) for (const d of [-1.6, 0, 1.6]) line(g, [s * 15, -3 + d, s * 20, -3 + d * 2.2], STRAW, 1.1);
    ell(g, 0, -12, 6.2, 6, '#ecdcae', INK, 1.2); line(g, [-3.6, -13.4, -1.4, -12], INK, 1); line(g, [-3.6, -12, -1.4, -13.4], INK, 1); ell(g, 2.6, -12.6, 0.9, 1.1, INK); line(g, [-2.6, -8.8, 3, -9], INK, 0.9); for (const x of [-1.4, 0.2, 1.8]) line(g, [x, -9.6, x, -8.2], INK, 0.5);
    ell(g, 0, -17.4, 11, 3, '#d9b77a', INK, 1.1); path(g, p => { p.moveTo(-5, -17.6); p.quadraticCurveTo(-5, -23.6, 0, -23.6); p.quadraticCurveTo(5, -23.6, 5, -17.6); p.closePath(); }, '#e3c890', INK, 1.1);
  },
  strike(g) { // 언월 강타
    path(g, p => { p.moveTo(-19, -3); p.quadraticCurveTo(-2, -24, 20, -10); p.quadraticCurveTo(0, -15, -19, -3); p.closePath(); }, WHITE, INK, 1.1);
    g.save(); g.rotate(0.6); line(g, [0, 23, 0, -6], INK, 3.6); line(g, [0, 23, 0, -6], '#7a3a2a', 2); rr(g, -3.2, -7.6, 6.4, 3, 1, GOLD, INK, 0.9);
    path(g, p => { p.moveTo(-1.6, -7); p.quadraticCurveTo(13, -11, 9, -27); p.quadraticCurveTo(4.6, -18, -2.4, -19.6); p.closePath(); }, STEEL, INK, 1.3); g.globalAlpha = 0.6; line(g, [5.4, -12, 7.4, -21], '#fff', 1); g.globalAlpha = 1;
    path(g, p => { p.moveTo(-1.4, -5); p.quadraticCurveTo(-7.6, -2, -6, 4.6); p.quadraticCurveTo(-2.6, 0, 1.2, -1); p.closePath(); }, RED, INK, 0.9); g.restore();
    for (const [x, y] of [[-14, 10], [-9, 15]]) line(g, [x, y, x - 5, y + 3], INK, 1.3);
  },
  flash(g) { // 일섬: 한 줄기 칼빛
    path(g, p => { p.moveTo(-21, 13); p.quadraticCurveTo(-4, -4, 21, -15); p.quadraticCurveTo(0, 2, -21, 13); p.closePath(); }, WHITE, INK, 1.1);
    for (const [x, y, l] of [[-15, -4, 9], [-9, -12, 7], [8, 9, 9]]) line(g, [x, y, x - l, y + l * 0.62], INK, 1.2);
    g.save(); g.translate(2, 3); g.rotate(1.02); path(g, p => { p.moveTo(-1.7, 2); p.quadraticCurveTo(-0.9, -12, 4.4, -24); p.quadraticCurveTo(3.4, -11, 2, 2); p.closePath(); }, STEEL, INK, 1.2); g.globalAlpha = 0.7; line(g, [1.2, -3, 3.2, -19], '#fff', 0.9); g.globalAlpha = 1; rr(g, -3.8, 1.6, 7.6, 2.6, 1, GOLD, INK, 0.9); line(g, [0, 4.4, 0, 12], INK, 3.4); line(g, [0, 4.4, 0, 12], '#7a1f1c', 1.9); g.restore();
    spark(g, 18, -17, 4.4, '#fffbe6');
  },
  veil(g) { // 안개 걸음: 안개 속의 삿갓
    cloud(g, -6, 9, 1.1, '#dfe6ee'); 
    path(g, p => { p.moveTo(-13, -3); p.quadraticCurveTo(-6, -11, 1, -17); p.quadraticCurveTo(8, -11, 15, -3); p.quadraticCurveTo(1, 0.6, -13, -3); p.closePath(); }, '#d9b77a', INK, 1.2); for (const x of [-8, -3, 5, 10]) line(g, [1 + (x - 1) * 0.1, -16, x, -3.4], '#a8884a', 0.6);
    g.globalAlpha = 0.85; path(g, p => { p.moveTo(-6, -1); p.quadraticCurveTo(-7, 6, 1, 7); p.quadraticCurveTo(9, 6, 8, -1); p.closePath(); }, '#3a3f58', INK, 1); g.globalAlpha = 1;
    cloud(g, 7, 13, 0.95, '#eef3f4'); cloud(g, -12, 16, 0.7, '#eef3f4'); spark(g, 16, -14, 3.2, '#fffbe6');
  },
  mark(g) { // 표적: 화살이 꽂힌 과녁
    ell(g, -2, 3, 16, 16, WHITE, INK, 1.3); ell(g, -2, 3, 11.4, 11.4, RED, INK, 0.9); ell(g, -2, 3, 7, 7, WHITE, INK, 0.9); ell(g, -2, 3, 3, 3, RED, INK, 0.8);
    for (const a of [0, PI / 2, PI, PI * 1.5]) line(g, [-2 + Math.cos(a) * 16, 3 + Math.sin(a) * 16, -2 + Math.cos(a) * 20.6, 3 + Math.sin(a) * 20.6], INK, 1.6);
    g.save(); g.translate(-2, 3); g.rotate(0.86); line(g, [0, 0, 0, -25], INK, 2.8); line(g, [0, 0, 0, -25], '#e9d9b0', 1.3); poly(g, [-2.6, -19, 0, -21.6, 2.6, -19, 2.6, -25.6, 0, -23, -2.6, -25.6], WHITE, INK, 0.8); g.restore();
  },
  snare(g) { // 올가미: 말뚝에 맨 올가미
    line(g, [12, 20, 12, -2], INK, 4.4); line(g, [12, 20, 12, -2], WOOD, 2.6); poly(g, [9.6, -2, 12, -7.6, 14.4, -2], WOODD, INK, 0.9);
    cord(g, p => { p.ellipse(-5, 6, 13.6, 8.6, -0.2, 0, TAU); }, '#d9b77a', 2); cord(g, p => { p.moveTo(7.4, 2); p.quadraticCurveTo(10, 4, 12, 7); }, '#d9b77a', 2);
    for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; line(g, [-5 + Math.cos(a) * 12.6, 6 + Math.sin(a) * 8 - 0.8, -5 + Math.cos(a) * 14.4, 6 + Math.sin(a) * 9.2 + 0.6], '#a8884a', 0.7); }
    ell(g, 7.6, 2.2, 2.4, 2.2, '#b98a55', INK, 0.9);
    for (const [x, y] of [[-12, -9], [-3, -13], [6, -11]]) { line(g, [x, y, x - 1.6, y - 5], LEAFD, 1.2); line(g, [x, y, x + 1.8, y - 4.4], LEAFD, 1.2); }
  },
  pangut(g) { // 판굿: 상모 끝에서 휘도는 긴 종이 띠
    cord(g, p => { p.moveTo(3, -9); p.bezierCurveTo(24, -24, 26, 8, 6, 12); p.bezierCurveTo(-14, 16, -24, 0, -12, -10); p.bezierCurveTo(-4, -17, 8, -4, -2, 2); }, WHITE, 2.6);
    ell(g, 0, -6, 9.6, 2.9, '#2e2c35', INK, 1.1); path(g, p => { p.moveTo(-5, -6.6); p.quadraticCurveTo(-5, -14.6, 0, -14.6); p.quadraticCurveTo(5, -14.6, 5, -6.6); p.closePath(); }, '#38363f', INK, 1.1); line(g, [-4.8, -8, 4.8, -8], GOLD, 1.3);
    line(g, [0, -14.6, 2, -18], INK, 1.8); ell(g, 3, -9, 1.3, 1.3, GOLD, INK, 0.6);
    for (const [x, y, c] of [[-17, 15, RED], [15, 17, INDIGO], [19, -16, GOLD]]) spark(g, x, y, 3.2, c);
  },
  deong(g) { // 덩더쿵: 장구
    for (const s of [-1, 1]) { g.beginPath(); g.arc(s * 15, 0, 6, s > 0 ? -0.9 : PI - 0.9, s > 0 ? 0.9 : PI + 0.9); st(g, INK, 1.5); g.beginPath(); g.arc(s * 16, 0, 10, s > 0 ? -0.8 : PI - 0.8, s > 0 ? 0.8 : PI + 0.8); st(g, INK, 1.5); }
    path(g, p => { p.moveTo(-10, -9); p.quadraticCurveTo(0, -2, 10, -9); p.lineTo(10, 9); p.quadraticCurveTo(0, 2, -10, 9); p.closePath(); }, '#b8342a', INK, 1.3);
    for (const [x, y0, y1] of [[-6, -6.6, 6.6], [0, -5, 5], [6, -6.6, 6.6]]) line(g, [x, y0, x, y1], '#7a1f1c', 0.8);
    for (const s of [-1, 1]) { ell(g, s * 10, 0, 3.4, 10.6, '#f3e7c8', INK, 1.3); ell(g, s * 10, 0, 1.6, 6.4, null, '#c9bfa6', 0.8); }
    for (let i = -1; i <= 1; i++) { line(g, [-10, -9.4 + (i + 1) * 0.2, 10, 9.4 - (1 - i) * 0.2 - (i + 1) * 9.2], GOLD, 0.8); }
    line(g, [-10, -10, 10, -10], WHITE, 1); line(g, [-10, 10, 10, 10], WHITE, 1);
    g.save(); g.translate(5, -16); g.rotate(0.9); line(g, [0, 0, 0, -11], INK, 2.6); line(g, [0, 0, 0, -11], '#d9b77a', 1.3); ell(g, 0, -12, 2, 2, WOODD, INK, 0.8); g.restore();
  },
  bulwark(g) { // 버티기: 엇걸어 버틴 쌍도끼
    for (const s of [-1, 1]) { g.save(); g.scale(s, 1); g.rotate(0.6); line(g, [0, 22, 0, -12], INK, 4); line(g, [0, 22, 0, -12], WOOD, 2.2); path(g, p => { p.moveTo(-1.6, -14); p.quadraticCurveTo(9, -18.6, 13.6, -11); p.quadraticCurveTo(15, -3, 10, 3); p.quadraticCurveTo(6, -2, -1.6, -1); p.closePath(); }, '#6e727c', INK, 1.2); path(g, p => { p.moveTo(9.6, -15); p.quadraticCurveTo(15.4, -8, 10.4, 2); p.quadraticCurveTo(12.4, -8, 8.4, -14); p.closePath(); }, STEEL); rr(g, -2.4, -15, 4.8, 3, 1, IRON, INK, 0.8); g.restore(); }
    ell(g, 0, 4, 5.4, 5.4, '#d9963f', INK, 1.2); for (const x of [-2.6, 0, 2.6]) poly(g, [x - 0.8, 0.4, x + 0.8, 0.4, x, 6.6], BLACK);
    for (const a of [-2.3, -1.57, -0.84]) line(g, [Math.cos(a) * 17, -6 + Math.sin(a) * 17, Math.cos(a) * 22, -6 + Math.sin(a) * 22], INK, 1.5);
  },
  raid(g) { // 산채 패거리: 산마루 너머로 솟은 깃발과 철퇴
    line(g, [-2, 12, -2, -21], INK, 3.2); line(g, [-2, 12, -2, -21], WOOD, 1.7); path(g, p => { p.moveTo(-2, -20); p.lineTo(15, -17); p.lineTo(10, -11.6); p.lineTo(15.6, -6); p.lineTo(-2, -4); p.closePath(); }, '#d9963f', INK, 1.2); for (const x of [2.4, 6.6, 10.4]) poly(g, [x - 1, -18, x + 1, -17.6, x - 0.4, -6.4], BLACK);
    for (const [x, a] of [[-13, -0.35], [11, 0.4]]) { g.save(); g.translate(x, 8); g.rotate(a); line(g, [0, 6, 0, -9], INK, 3); line(g, [0, 6, 0, -9], '#5a3a26', 1.6); for (let i = 0; i < 6; i++) { const q = i / 6 * TAU; poly(g, [Math.cos(q - 0.4) * 3.6, -13 + Math.sin(q - 0.4) * 3.6, Math.cos(q) * 7, -13 + Math.sin(q) * 7, Math.cos(q + 0.4) * 3.6, -13 + Math.sin(q + 0.4) * 3.6], GREY, INK, 0.6); } ell(g, 0, -13, 4.6, 4.6, IRON, INK, 1); g.restore(); }
    path(g, p => { p.moveTo(-22, 20); p.lineTo(-12, 6); p.lineTo(-5, 12); p.lineTo(3, 3); p.lineTo(12, 13); p.lineTo(17, 8); p.lineTo(22, 20); p.closePath(); }, LEAFD, INK, 1.3); line(g, [-12, 6, -9, 12], '#2c4f44', 0.9); line(g, [3, 3, 5.4, 10], '#2c4f44', 0.9);
  },
  order(g) { // 호령
    g.save(); g.rotate(-0.16); line(g, [-11, 22, -11, -19], INK, 3.4); line(g, [-11, 22, -11, -19], '#7a3a2a', 1.8); poly(g, [-13.4, -19, -11, -24.6, -8.6, -19], GOLD, INK, 0.9);
    path(g, p => { p.moveTo(-11, -18); p.lineTo(17, -15); p.quadraticCurveTo(13, -7, 17, 2); p.lineTo(-11, 4); p.closePath(); }, INDIGO, INK, 1.3);
    path(g, p => { p.moveTo(-11, -18); p.lineTo(17, -15); p.lineTo(16.4, -12.2); p.lineTo(-11, -15); p.closePath(); }, RED); path(g, p => { p.moveTo(-11, 4); p.lineTo(17, 2); p.lineTo(16.2, -0.8); p.lineTo(-11, 1); p.closePath(); }, RED); g.beginPath(); g.moveTo(-11, -18); g.lineTo(17, -15); g.quadraticCurveTo(13, -7, 17, 2); g.lineTo(-11, 4); st(g, INK, 1.3);
    ell(g, 2, -6.8, 6.4, 6.4, WHITE, INK, 1); taegeuk(g, 2, -6.8, 4.6);
    tassel(g, -11, 7, 9); g.restore();
  },
  sanctuary(g) { // 법력 결계
    path(g, p => { p.moveTo(-20, 12); p.quadraticCurveTo(-20, -21, 0, -21); p.quadraticCurveTo(20, -21, 20, 12); p.closePath(); }, 'rgba(160,205,235,0.5)', '#3f6f9f', 1.5);
    g.beginPath(); g.moveTo(-14.6, 9); g.quadraticCurveTo(-14.6, -15, 0, -15.6); st(g, 'rgba(255,255,255,0.8)', 1.4); spark(g, 11, -11, 3, '#fffbe6');
    for (const [a, l] of [[-1.05, 11], [1.05, 11], [-0.55, 13], [0.55, 13], [0, 14.5]]) { g.save(); g.translate(0, 14); g.rotate(a); path(g, p => { p.moveTo(0, 0); p.quadraticCurveTo(-5, -l * 0.55, 0, -l); p.quadraticCurveTo(5, -l * 0.55, 0, 0); }, a ? '#f3b4c0' : '#f8d4dc', INK, 1); g.restore(); }
    ell(g, 0, 14.6, 12, 3, LEAF, INK, 1.1); ell(g, 0, 11.6, 3, 1.8, GOLD, INK, 0.7);
  },
  sutra(g) { // 독경
    path(g, p => { p.moveTo(-4, 9); p.quadraticCurveTo(-7, 17, -1, 19); p.quadraticCurveTo(5, 19.5, 5.4, 10); p.closePath(); }, WOODD, INK, 1.2);
    ell(g, -1, -1, 14, 12, WOOD, INK, 1.4); g.globalAlpha = 0.35; ell(g, -6, -6, 5, 2.6, '#fff', null, 0, -0.5); g.globalAlpha = 1;
    path(g, p => { p.moveTo(-12, 1); p.quadraticCurveTo(-2, 5.6, 9, 1); p.quadraticCurveTo(-2, 2.6, -12, 1); p.closePath(); }, BLACK, INK, 0.9); ell(g, 10.6, 0.4, 2, 2, BLACK);
    g.save(); g.translate(13, -12); g.rotate(0.85); line(g, [0, 8, 0, -8], INK, 3); line(g, [0, 8, 0, -8], '#d9b77a', 1.6); ell(g, 0, -9, 3, 3.4, '#8a4f2c', INK, 1); g.restore();
    for (const [x, y] of [[-16, -15], [-10, -19]]) { g.beginPath(); g.arc(x, y, 3.4, PI * 0.9, PI * 1.9); st(g, INK, 1.2); }
  },
  meteor(g) { // 불벼락
    path(g, p => { p.moveTo(21, -22); p.quadraticCurveTo(4, -19, -13, -1); p.lineTo(1, 12); p.quadraticCurveTo(17, -4, 21, -22); p.closePath(); }, FLAME, INK, 1.2);
    path(g, p => { p.moveTo(17, -17); p.quadraticCurveTo(5, -13, -8, 1); p.lineTo(-1, 8); p.quadraticCurveTo(12, -5, 17, -17); p.closePath(); }, GLOW);
    ell(g, -6, 7, 10.5, 10, '#d9553f', INK, 1.4); ell(g, -7.4, 5.4, 6, 5.6, FLAME); ell(g, -8.4, 4.4, 2.8, 2.6, GLOW);
    poly(g, [9, 6, 15, 9, 12, 11, 18, 17, 10, 13.6, 12.6, 11.6], '#f0d264', INK, 0.9); for (const [x, y] of [[-19, -6], [-15, -13], [3, 19]]) line(g, [x, y, x - 3.4, y + 3.4], INK, 1.2);
  },
  blink(g) { // 축지법
    for (const [y, l] of [[-9, 11], [-2, 15], [5, 10]]) line(g, [-21, y, -21 + l, y], INK, 1.3);
    for (const [x, y, a] of [[-6, 15, -0.3], [3, 10, -0.3]]) { g.globalAlpha = 0.55; ell(g, x, y, 2.6, 4.2, '#8a6a4a', INK, 0.8, a + PI / 2); g.globalAlpha = 1; }
    cloud(g, 5, -5, 1.2, '#eef3f4'); g.beginPath(); g.arc(4, -6, 4.6, PI * 0.3, PI * 2.1); st(g, INK, 1.2); g.beginPath(); g.arc(4, -6, 1.8, PI * 1.2, PI * 2.6); st(g, INK, 1.1);
    path(g, p => { p.moveTo(18, -1); p.quadraticCurveTo(22, 5, 15, 8); p.quadraticCurveTo(18, 4, 14.6, 1); p.closePath(); }, '#eef3f4', INK, 1); spark(g, 16, -17, 3, ICE);
  },
  doubt(g) { // 잡념
    cloud(g, -1, -3, 1.45, '#cfc6dc'); for (const [x, y, r] of [[-9, 15, 2.6], [-14, 19, 1.5]]) ell(g, x, y, r, r, '#cfc6dc', INK, 1);
    g.beginPath(); g.moveTo(-10, -2); g.bezierCurveTo(-4, -12, 2, 6, -2, -4); g.bezierCurveTo(-5, -11, 9, -10, 5, -2); g.bezierCurveTo(1, 5, 12, 3, 9, -5); st(g, PURPLE, 1.6);
    ell(g, 13, -17, 1.2, 1.2, PURPLE); line(g, [16.6, -21, 18, -15], PURPLE, 1.6); ell(g, 18.6, -11.6, 1, 1, PURPLE);
  },
};

// ───────── 그 밖의 표시 ─────────
export const MISC_ART = {
  burn(g) { // 패 태우기
    g.save(); g.rotate(-0.16); rr(g, -11, -15, 22, 31, 2.4, PAPER, INK, 1.4); rr(g, -11, -15, 22, 7, 2, INDIGO, INK, 1); rr(g, -6, -3, 12, 11, 1.6, '#d9cdb0', INK, 0.9);
    path(g, p => { p.moveTo(-11, 9); p.lineTo(-7, 5.6); p.lineTo(-3, 10); p.lineTo(2, 4.6); p.lineTo(6, 9.6); p.lineTo(11, 6); p.lineTo(11, 16); p.lineTo(-11, 16); p.closePath(); }, BLACK); g.restore();
    flame(g, -6, 10, 6.4); flame(g, 6, 8, 7.6); flame(g, 0, 15, 5, '#ffb84a');
    for (const [x, y] of [[-14, -17], [15, -12], [10, -21]]) ell(g, x, y, 1.2, 1.2, FLAME, INK, 0.5);
  },
};

// ───────── 보물 ─────────
export const RELIC_ART = {
  drum(g) { // 큰북
    for (const s of [-1, 1]) { line(g, [s * 6, 8, s * 13, 21], INK, 3.4); line(g, [s * 6, 8, s * 13, 21], WOODD, 1.8); } line(g, [-11, 15, 11, 15], INK, 3); line(g, [-11, 15, 11, 15], WOODD, 1.5);
    path(g, p => { p.moveTo(-12, -12); p.quadraticCurveTo(-18, 0, -12, 11); p.lineTo(12, 11); p.quadraticCurveTo(18, 0, 12, -12); p.closePath(); }, '#a8322a', INK, 1.4);
    for (const x of [-9, 0, 9]) { g.beginPath(); g.moveTo(x, -9); g.quadraticCurveTo(x * 1.35, 0, x, 10); st(g, 'rgba(38,42,54,0.4)', 0.9); }
    ell(g, 0, -12, 12, 4.2, '#f3e7c8', INK, 1.3); for (let i = 0; i < 9; i++) ell(g, -12 + i * 3, -7.2 + Math.abs(i - 4) * -0.5, 0.9, 0.9, GOLD, INK, 0.4);
    g.save(); g.translate(0, -12); g.scale(1, 0.36); taegeuk(g, 0, 0, 5); g.restore();
    g.save(); g.translate(13, -16); g.rotate(0.9); line(g, [0, 8, 0, -7], INK, 3); line(g, [0, 8, 0, -7], '#d9b77a', 1.6); ell(g, 0, -8, 2.6, 2.6, WHITE, INK, 0.9); g.restore();
  },
  banner(g) { // 장군기
    line(g, [-13, 22, -13, -19], INK, 3.6); line(g, [-13, 22, -13, -19], '#7a3a2a', 2); poly(g, [-15.6, -19, -13, -25, -10.4, -19], GOLD, INK, 0.9);
    path(g, p => { p.moveTo(-13, -17); p.lineTo(16, -17); p.lineTo(16, 5); p.lineTo(11.4, 1.4); p.lineTo(6.8, 5); p.lineTo(2.2, 1.4); p.lineTo(-2.4, 5); p.lineTo(-7, 1.4); p.lineTo(-13, 5); p.closePath(); }, '#b8342a', INK, 1.3);
    rr(g, -10.6, -14.6, 24.2, 13, 0.5, null, GOLD, 1.2); ell(g, 1.6, -8, 5.4, 5.4, GOLD, INK, 1); poly(g, [1.6, -12, 2.9, -9, 5.6, -8.8, 3.5, -6.8, 4.2, -4, 1.6, -5.6, -1, -4, -0.3, -6.8, -2.4, -8.8, 0.3, -9], '#b8342a');
    tassel(g, -13, 8, 9, GOLD);
  },
  horseshoe(g) { // 무쇠 편자
    path(g, p => { p.moveTo(-15, 15); p.lineTo(-16, -1); p.quadraticCurveTo(-16, -18, 0, -18); p.quadraticCurveTo(16, -18, 16, -1); p.lineTo(15, 15); p.lineTo(8, 15); p.lineTo(8.6, -1); p.quadraticCurveTo(8.6, -10.4, 0, -10.4); p.quadraticCurveTo(-8.6, -10.4, -8.6, -1); p.lineTo(-8, 15); p.closePath(); }, GREY, INK, 1.4);
    for (const [x, y] of [[-12, 9], [-12.4, 0], [-9.4, -9], [0, -14.2], [9.4, -9], [12.4, 0], [12, 9]]) rr(g, x - 1.3, y - 1.3, 2.6, 2.6, 0.5, IRON, INK, 0.5);
    g.globalAlpha = 0.5; g.beginPath(); g.arc(0, -1, 14, PI * 1.1, PI * 1.5); st(g, '#fff', 1.3); g.globalAlpha = 1;
  },
  grail(g) { // 정화수 사발
    for (const [a, l] of [[-0.55, 19], [0.05, 23], [0.6, 17]]) { g.save(); g.translate(0, 0); g.rotate(a); line(g, [0, 0, 0, -l], LEAFD, 1.3); for (let y = -5; y > -l; y -= 4.2) { ell(g, -2.2, y, 2.4, 1.1, LEAF, INK, 0.6, 0.6); ell(g, 2.2, y - 2, 2.4, 1.1, LEAF, INK, 0.6, -0.6); } g.restore(); }
    path(g, p => { p.moveTo(-14, 0); p.quadraticCurveTo(-12.6, 15, 0, 15); p.quadraticCurveTo(12.6, 15, 14, 0); p.closePath(); }, WHITE, INK, 1.3); ell(g, 0, 0, 14, 4.2, WATER, INK, 1.2); line(g, [-10.4, 7.4, 10.4, 7.4], INDIGO, 1.1); line(g, [-8.6, 10, 8.6, 10], INDIGO, 0.7); rr(g, -5.4, 14.6, 10.8, 3, 1, WHITE, INK, 1);
    g.globalAlpha = 0.6; ell(g, -4.6, -0.6, 4, 1, '#fff'); g.globalAlpha = 1;
  },
  firearrow(g) { // 불화살
    g.save(); g.rotate(0.72); line(g, [0, 21, 0, -10], INK, 3); line(g, [0, 21, 0, -10], '#c98a5a', 1.5); poly(g, [-3, 16, 0, 12.6, 3, 16, 3, 22, 0, 19, -3, 22], WHITE, INK, 0.9); rr(g, -2.6, -11, 5.2, 8, 1.6, WOODD, INK, 0.9); for (const y of [-9, -6]) line(g, [-2.6, y, 2.6, y], '#d9b77a', 0.8);
    flame(g, 0, -16, 7.4); g.restore();
    for (const [x, y] of [[-12, -15], [-17, -6]]) flame(g, x, y, 2.2, '#ffb84a');
  },
  goldhorn(g) { // 금장 북채
    for (const [s, r] of [[-1, 0.62], [1, 0.62]]) { g.save(); g.rotate(s * r); line(g, [0, 20, 0, -17], INK, 4.2); line(g, [0, 20, 0, -17], '#8a4f2c', 2.6); for (const y of [12, 5, -10]) rr(g, -2.4, y, 4.8, 2.6, 0.8, GOLD, INK, 0.7); ell(g, 0, -19, 3.8, 4.2, GOLD, INK, 1.1); g.globalAlpha = 0.6; ell(g, -1, -20.4, 1.2, 1, '#fff'); g.globalAlpha = 1; g.restore(); }
    tassel(g, -12.4, 17, 6, RED); tassel(g, 12.4, 17, 6, INDIGO);
  },
  band(g) { // 풍물패 — 상모
    cord(g, p => { p.moveTo(2, -14); p.bezierCurveTo(26, -26, 24, 6, 6, -2); p.bezierCurveTo(-10, -9, -24, 2, -16, 14); p.bezierCurveTo(-11, 21, -2, 19, -3, 13); }, WHITE, 2.4);
    ell(g, 0, 10, 16, 4.6, BLACK, INK, 1.2); path(g, p => { p.moveTo(-8, 9.6); p.quadraticCurveTo(-8, -3, 0, -3); p.quadraticCurveTo(8, -3, 8, 9.6); p.closePath(); }, '#35343b', INK, 1.2); line(g, [-8, 7.4, 8, 7.4], RED, 1.6);
    line(g, [0, -3, 2, -14], INK, 1.6); ell(g, 2, -14, 1.8, 1.8, GOLD, INK, 0.7); for (const [x, c] of [[-13, RED], [13, OCHRE]]) ell(g, x, 13.4, 3, 2.6, c, INK, 0.8);
  },
  plate(g) { // 두정갑
    path(g, p => { p.moveTo(-8, -19); p.lineTo(-17, -15); p.lineTo(-19, -3); p.lineTo(-12.4, -2); p.lineTo(-13.4, 19); p.lineTo(13.4, 19); p.lineTo(12.4, -2); p.lineTo(19, -3); p.lineTo(17, -15); p.lineTo(8, -19); p.quadraticCurveTo(0, -12, -8, -19); p.closePath(); }, '#a8322a', INK, 1.4);
    line(g, [0, -15, 0, 19], 'rgba(38,42,54,0.5)', 1); for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) { const x = -8.4 + c * 5.6 + (c > 1 ? 0 : 0), y = -8 + r * 6; if (Math.abs(x) < 1) continue; ell(g, x, y, 1.15, 1.15, GOLD, INK, 0.45); }
    for (const s of [-1, 1]) { ell(g, s * 15.6, -10, 1, 1, GOLD, INK, 0.4); ell(g, s * 15, -5.6, 1, 1, GOLD, INK, 0.4); } path(g, p => { p.moveTo(-13.2, 15); p.lineTo(13.2, 15); p.lineTo(13.4, 19); p.lineTo(-13.4, 19); p.closePath(); }, GOLD, INK, 0.9);
    path(g, p => { p.moveTo(-8, -19); p.quadraticCurveTo(0, -12, 8, -19); p.lineTo(5.4, -19.6); p.quadraticCurveTo(0, -15, -5.4, -19.6); p.closePath(); }, WHITE, INK, 0.8);
  },
  feather(g) { // 뿔 깍지
    g.save(); g.rotate(-0.35); path(g, p => { p.moveTo(-9, 7); p.quadraticCurveTo(-13, -8, 0, -9); p.quadraticCurveTo(10, -9, 11, -1); p.lineTo(21, -15); p.quadraticCurveTo(24, -13, 21, -8); p.lineTo(13, 8); p.quadraticCurveTo(8, 17, 0, 16); p.quadraticCurveTo(-7, 15.6, -9, 7); p.closePath(); }, '#e9dcb8', INK, 1.4);
    ell(g, 1, 3.6, 6.6, 7.2, PAPER, INK, 1.2); g.globalAlpha = 0.35; for (const k of [0, 1, 2]) { g.beginPath(); g.moveTo(12 + k * 2.4, -1 - k * 3); g.lineTo(15 + k * 2.4, 1 - k * 3); st(g, WOODD, 1); } g.globalAlpha = 1; g.restore();
    cord(g, p => { p.moveTo(-11, 10); p.quadraticCurveTo(-19, 14, -14, 21); }, RED, 1.3);
  },
  censer(g) { // 약탕기
    for (const [x, d] of [[-5, 1], [3, -1]]) { g.beginPath(); g.moveTo(x, -12); g.bezierCurveTo(x + 5 * d, -15, x - 5 * d, -19, x + 2 * d, -23); st(g, INK, 1.3); }
    line(g, [11, -1, 23, -7], INK, 4.4); line(g, [11, -1, 23, -7], WOODD, 2.6);
    path(g, p => { p.moveTo(-15, 2); p.quadraticCurveTo(-16, 18, 0, 18); p.quadraticCurveTo(16, 18, 15, 2); p.quadraticCurveTo(15, -6, 0, -6); p.quadraticCurveTo(-15, -6, -15, 2); p.closePath(); }, '#6b4a3a', INK, 1.4);
    rr(g, -12, -9.4, 24, 4.4, 1.6, '#8a6248', INK, 1.1); ell(g, 0, -11, 2.6, 2, '#8a6248', INK, 1); path(g, p => { p.moveTo(-15.4, 2); p.lineTo(-20.6, -1.6); p.lineTo(-19.6, 3.6); p.closePath(); }, '#6b4a3a', INK, 1.1);
    rr(g, -6.4, 2, 12.8, 9.4, 1, WHITE, INK, 0.9); line(g, [0, 10.2, 0, 4.6], LEAFD, 0.9); for (const [x, y, r] of [[-2.3, 7.6, 0.75], [2.3, 7.6, -0.75], [-2, 5.2, 0.6], [2, 5.2, -0.6], [0, 3.9, 0]]) ell(g, x, y, 1, 2, LEAFD, null, 0, r);   // 약초 한 줄기 g.globalAlpha = 0.3; ell(g, -8.6, -1, 2, 4, '#fff', null, 0, 0.4); g.globalAlpha = 1;
  },
  crest(g) { // 호랑이 가죽
    path(g, p => { p.moveTo(-5, -20); p.lineTo(5, -20); p.lineTo(7, -12); p.lineTo(20, -17); p.lineTo(18, -7); p.lineTo(10, -3); p.lineTo(11, 7); p.lineTo(20, 13); p.lineTo(17, 20); p.lineTo(6, 15); p.lineTo(3, 23); p.lineTo(-3, 23); p.lineTo(-6, 15); p.lineTo(-17, 20); p.lineTo(-20, 13); p.lineTo(-11, 7); p.lineTo(-10, -3); p.lineTo(-18, -7); p.lineTo(-20, -17); p.lineTo(-7, -12); p.closePath(); }, '#e69a3c', INK, 1.4);
    path(g, p => { p.moveTo(-4, -8); p.quadraticCurveTo(0, -5, 4, -8); p.lineTo(5, 12); p.quadraticCurveTo(0, 15, -5, 12); p.closePath(); }, '#f6e2b8');
    for (const [x, y, w, a] of [[-8, -5, 5, 0.3], [8, -5, 5, -0.3], [-9, 2, 5.6, 0.15], [9, 2, 5.6, -0.15], [-8, 9, 5, -0.2], [8, 9, 5, 0.2], [-14, -13, 4.4, 0.9], [14, -13, 4.4, -0.9], [-14.6, 15, 4.4, -0.8], [14.6, 15, 4.4, 0.8], [0, 18, 3, 0]]) { g.save(); g.translate(x, y); g.rotate(a); poly(g, [-w / 2, -1.2, w / 2, 0, -w / 2, 1.2], BLACK); g.restore(); }
    for (const s of [-1, 1]) { ell(g, s * 4.6, -21, 2.4, 2.2, '#e69a3c', INK, 1); poly(g, [s * 0.9, -15, s * 3.8, -17, s * 3.6, -14.8], '#f6e2b8', INK, 0.6); ell(g, s * 2.7, -15.5, 0.6, 0.8, INK); line(g, [s * 0.6, -16.2, s * 4.2, -18], INK, 1); } poly(g, [-1.4, -12.6, 1.4, -12.6, 0, -10.6], '#c9705a', INK, 0.6);
  },
  sack(g) { // 엽전 꾸러미
    cord(g, p => { p.moveTo(-17, -17); p.quadraticCurveTo(-4, -6, 0, 0); p.quadraticCurveTo(6, 8, 16, 18); }, RED, 1.4);
    for (let i = 0; i < 6; i++) { const x = -11 + i * 4.6, y = -11 + i * 4.6; g.save(); g.translate(x, y); g.rotate(-0.78); g.scale(0.5, 1); coin(g, 0, 0, 8.4); g.restore(); }
    coin(g, 12, -11, 7); g.globalAlpha = 0.5; ell(g, 10, -13.6, 2, 1, '#fff'); g.globalAlpha = 1; tassel(g, 17, 18.6, 5, RED);
  },
  oath(g) { // 결사의 맹세
    g.save(); g.rotate(-0.12); rr(g, -13, -17, 26, 34, 1, PAPER, INK, 1.3); for (const x of [8, 4.4, 0.8]) for (let y = -13; y < 4; y += 3.4) line(g, [x, y, x, y + 2], 'rgba(38,42,54,0.55)', 1.2);
    for (const [x, y] of [[-6, 6], [-3, 4.4], [0, 4.2], [3, 5.4]]) ell(g, x, y, 1.3, 2.8, RED, null, 0, 0); ell(g, -1.4, 11, 5.4, 4.6, RED); ell(g, -8.4, 11, 1.6, 2.6, RED, null, 0, 0.9);
    rr(g, -15, -19.6, 30, 4, 1.6, WOODD, INK, 1); rr(g, -15, 15.6, 30, 4, 1.6, WOODD, INK, 1); g.restore();
  },
  vanguard(g) { // 선봉 깃발
    g.save(); g.rotate(0.2); line(g, [-9, 23, -9, -15], INK, 3.4); line(g, [-9, 23, -9, -15], WOOD, 1.8); poly(g, [-11.6, -14, -9, -25, -6.4, -14], STEEL, INK, 1);
    path(g, p => { p.moveTo(-9, -13); p.quadraticCurveTo(6, -14, 21, -5); p.quadraticCurveTo(6, -1, -9, 5); p.closePath(); }, INDIGO, INK, 1.3); path(g, p => { p.moveTo(-9, -13); p.quadraticCurveTo(6, -14, 21, -5); p.lineTo(16.6, -4.6); p.quadraticCurveTo(4, -10.6, -9, -10); p.closePath(); }, GOLD, INK, 0.7);
    ell(g, -2, -4.4, 3.6, 3.6, WHITE, INK, 0.9); ell(g, -2, -4.4, 1.5, 1.5, RED); path(g, p => { p.moveTo(-8, -13.6); p.quadraticCurveTo(-15, -11, -13.4, -4.6); p.quadraticCurveTo(-10.4, -9, -8, -9.6); p.closePath(); }, RED, INK, 0.8); g.restore();
    for (const [y, l] of [[8, 9], [13, 6]]) line(g, [8, y, 8 + l, y - 1.5], INK, 1.2);
  },
  powder(g) { // 화약 비법
    cord(g, p => { p.moveTo(4, -15); p.quadraticCurveTo(12, -22, 17, -16); }, '#d9b77a', 1.2); spark(g, 18, -15.6, 4.4, FLAME); ell(g, 18, -15.6, 1.4, 1.4, GLOW);
    path(g, p => { p.moveTo(-6, -10); p.quadraticCurveTo(-18, -6, -17, 7); p.quadraticCurveTo(-16, 20, -2, 20); p.quadraticCurveTo(13, 20, 13, 7); p.quadraticCurveTo(13, -6, 2, -10); p.closePath(); }, '#3a3238', INK, 1.4);
    rr(g, -6, -14.6, 9, 5.6, 1.6, WOODD, INK, 1.1); rr(g, -10, 0, 16, 11.6, 1, RED, INK, 1); symbol(g, 'flame', -2, 5.6, 10.5, GLOW);
    g.globalAlpha = 0.3; ell(g, -10.6, -2, 2.4, 4.6, '#fff', null, 0, 0.5); g.globalAlpha = 1; cord(g, p => { p.moveTo(-15, 14); p.quadraticCurveTo(-21, 18, -17, 22); }, RED, 1.1);
  },
  amulet(g) { // 수호 부적
    g.save(); g.rotate(0.1); paperTal(g, 0, -2, 20, 34, '#f0d264', RED); ell(g, 0, -15.4, 1.6, 1.6, PAPER, INK, 0.8); g.restore();
    cord(g, p => { p.moveTo(1.6, -17); p.quadraticCurveTo(8, -24, 14, -19); }, RED, 1.2); tassel(g, -1.4, 15.4, 7.6, RED);
  },
  ginseng(g) { // 산삼
    line(g, [0, -8, 0, -16], LEAFD, 1.6); for (const [a, l] of [[-1.2, 9], [-0.4, 10], [0.4, 10], [1.2, 9]]) { g.save(); g.translate(0, -15.6); g.rotate(a); path(g, p => { p.moveTo(0, 0); p.quadraticCurveTo(-3.6, -l * 0.5, 0, -l); p.quadraticCurveTo(3.6, -l * 0.5, 0, 0); }, LEAF, INK, 0.9); g.restore(); } for (const [x, y] of [[-1.6, -17], [1.6, -18], [0, -20]]) ell(g, x, y, 1.5, 1.5, RED, INK, 0.5);
    path(g, p => { p.moveTo(-4.4, -8); p.quadraticCurveTo(-7, 0, -5, 6); p.quadraticCurveTo(-11, 12, -13, 21); p.quadraticCurveTo(-7, 15, -2.6, 11.6); p.quadraticCurveTo(-1, 16, -0.6, 23); p.quadraticCurveTo(2, 16, 2.6, 11.6); p.quadraticCurveTo(7, 15, 14, 19); p.quadraticCurveTo(10, 11, 5, 6); p.quadraticCurveTo(7, 0, 4.4, -8); p.quadraticCurveTo(0, -10.6, -4.4, -8); p.closePath(); }, '#e8cf9a', INK, 1.3);
    for (const y of [-3.6, 0.4, 4.4]) { g.beginPath(); g.moveTo(-4.6, y); g.quadraticCurveTo(0, y + 1.6, 4.6, y); st(g, 'rgba(122,74,44,0.6)', 0.9); }
    for (const s of [-1, 1]) cord(g, p => { p.moveTo(s * 5.4, -1); p.quadraticCurveTo(s * 13, -3, s * 15, 4); }, '#e8cf9a', 1.3);
    path(g, p => { p.moveTo(-5.6, -8.4); p.lineTo(5.6, -8.4); p.lineTo(5, -5.6); p.lineTo(-5, -5.6); p.closePath(); }, RED, INK, 0.8); poly(g, [3.6, -7, 9.6, -10, 8.6, -4.4], RED, INK, 0.8);
  },
  gamtu(g) { // 도깨비 감투
    g.setLineDash([2.4, 3]); g.beginPath(); g.arc(0, 0, 21, 0, TAU); st(g, PURPLE, 1.3); g.setLineDash([]); spark(g, -17, -13, 3.4, '#e6dcf2'); spark(g, 17, 9, 2.6, '#e6dcf2');
    path(g, p => { p.moveTo(-13, 12); p.lineTo(-13, 1); p.quadraticCurveTo(-13, -9, -6, -10); p.lineTo(-6, -15); p.quadraticCurveTo(0, -20, 6, -15); p.lineTo(6, -10); p.quadraticCurveTo(13, -9, 13, 1); p.lineTo(13, 12); p.quadraticCurveTo(0, 15.6, -13, 12); p.closePath(); }, '#35343b', INK, 1.4);
    line(g, [-6, -10, 6, -10], 'rgba(255,255,255,0.3)', 1); for (const x of [-8, -3, 2, 7]) line(g, [x, -6, x + 1, 11], 'rgba(255,255,255,0.14)', 0.9); path(g, p => { p.moveTo(-13, 8); p.quadraticCurveTo(0, 11.6, 13, 8); p.lineTo(13, 12); p.quadraticCurveTo(0, 15.6, -13, 12); p.closePath(); }, PURPLE, INK, 0.9);
    for (const s of [-1, 1]) poly(g, [s * 3, -16.6, s * 5.6, -23, s * 6.4, -15.4], '#f3e7c8', INK, 0.9);
  },
  obsidian(g) { // 흑요 부적
    cord(g, p => { p.moveTo(-10, -22); p.quadraticCurveTo(0, -12, 0, -11); p.quadraticCurveTo(0, -12, 10, -22); }, RED, 1.3); ell(g, 0, -12.6, 2.4, 2.4, GOLD, INK, 0.8);
    poly(g, [0, -10, 11, -2, 8, 13, 0, 20, -8, 13, -11, -2], '#2a2440', INK, 1.4); poly(g, [0, -10, 11, -2, 2, 1], '#4a4370'); poly(g, [0, -10, -11, -2, -3, 2, 2, 1], '#3a3358'); poly(g, [2, 1, 11, -2, 8, 13, 0, 20], '#231d38');
    line(g, [0, -10, 2, 1, 0, 20], 'rgba(255,255,255,0.22)', 0.8); line(g, [-11, -2, -3, 2, 2, 1, 11, -2], 'rgba(255,255,255,0.22)', 0.8); g.globalAlpha = 0.75; poly(g, [-5.4, -3.6, -2, -6.4, -3, -1.4], '#fff'); g.globalAlpha = 1;
  },
  sotdae(g) { // 솟대
    line(g, [0, 23, 0, -9], INK, 3.6); line(g, [0, 23, 0, -9], WOOD, 2); for (const y of [4, 12]) line(g, [-1.6, y, 1.6, y + 1.4], WOODD, 0.9);
    line(g, [-8, 14, 8, 10], INK, 3); line(g, [-8, 14, 8, 10], WOOD, 1.5); for (const [x, c] of [[-6, WHITE], [-2, RED], [3, WHITE], [7, INDIGO]]) rr(g, x - 1, 12 - x * 0.25, 2, 7, 0.4, c, INK, 0.5);
    path(g, p => { p.moveTo(-14, -9); p.quadraticCurveTo(-7, -17, 4, -13.6); p.quadraticCurveTo(6, -21, 12, -20); p.quadraticCurveTo(15.4, -19.6, 15, -17); p.lineTo(21, -16); p.lineTo(15, -14.4); p.quadraticCurveTo(13, -8, 5, -7); p.quadraticCurveTo(-6, -5.6, -14, -9); p.closePath(); }, '#3a3238', INK, 1.3);
    ell(g, 12, -17.6, 0.9, 0.9, WHITE); g.beginPath(); g.moveTo(-8, -10); g.quadraticCurveTo(-1, -9, 3, -11.6); st(g, 'rgba(255,255,255,0.3)', 1);
  },
  pill(g) { // 청심환
    path(g, p => { p.moveTo(-19, 9); p.lineTo(-11, -5); p.lineTo(13, -7); p.lineTo(20, 8); p.lineTo(10, 19); p.lineTo(-10, 20); p.closePath(); }, PAPER, INK, 1.3); line(g, [-11, -5, -5, 8, -10, 20], 'rgba(38,42,54,0.3)', 0.9); line(g, [13, -7, 7, 8, 10, 19], 'rgba(38,42,54,0.3)', 0.9); line(g, [-5, 8, 7, 8], 'rgba(38,42,54,0.3)', 0.9);
    ell(g, 0, 1, 10.6, 10.6, GOLD, INK, 1.4); g.beginPath(); g.arc(0, 1, 7.6, 0, TAU); st(g, '#b8862a', 0.9); symbol(g, 'cleanse', 0, 1, 10.5, REDD);
    g.globalAlpha = 0.6; ell(g, -4.6, -4.6, 3, 1.5, '#fff', null, 0, -0.6); g.globalAlpha = 1; spark(g, 14, -15, 3.4, '#fffbe6'); spark(g, -15, -12, 2.4, '#fffbe6');
  },
  gong(g) { // 놋쇠 징
    line(g, [-17, -19, 17, -19], INK, 3.6); line(g, [-17, -19, 17, -19], WOODD, 2); for (const s of [-1, 1]) cord(g, p => { p.moveTo(s * 7, -19); p.lineTo(s * 6, -9); }, RED, 1.1);
    ell(g, 0, 3, 15.4, 15.4, BRASS, INK, 1.5); ell(g, 0, 3, 11.6, 11.6, GOLD, INK, 1); ell(g, 0, 3, 4.6, 4.6, BRASS, INK, 0.9); g.globalAlpha = 0.5; g.beginPath(); g.arc(0, 3, 13.4, PI * 1.05, PI * 1.5); st(g, '#fff', 1.4); g.globalAlpha = 1;
    g.save(); g.translate(16, 13); g.rotate(-0.7); line(g, [0, 9, 0, -6], INK, 3); line(g, [0, 9, 0, -6], WOOD, 1.6); ell(g, 0, -7.6, 3.8, 3.4, RED, INK, 1); g.restore();
  },
  hopae(g) { // 호패 꾸러미
    ell(g, 0, -17, 4, 4, null, INK, 2.6); ell(g, 0, -17, 4, 4, null, RED, 1.2);
    for (const [a, c] of [[-0.5, '#b98a55'], [0.5, '#c9a06a'], [0, '#e3c890']]) { g.save(); g.translate(0, -14); g.rotate(a); rr(g, -5.6, 2, 11.2, 29, 2, c, INK, 1.2); ell(g, 0, 5.6, 1.3, 1.3, PAPER, INK, 0.6); if (!a) { for (const y of [11, 15.4, 19.8, 24.2]) rr(g, -1.3, y, 2.6, 2.8, 0.4, 'rgba(38,42,54,0.6)'); } g.restore(); }
    tassel(g, 0, 17.6, 5.6, RED);
  },
  yut(g) { // 윷가락
    [[-13, -0.25, 1], [-4.4, 0.1, 0], [4.4, -0.08, 1], [13, 0.28, 1]].forEach(([x, a, flat]) => { g.save(); g.translate(x, 0); g.rotate(a); rr(g, -3.8, -19, 7.6, 38, 3.8, flat ? '#f0dfb8' : '#8a5a34', INK, 1.3); if (flat) { for (const y of [-10, 0, 10]) { line(g, [-2.2, y - 2.2, 2.2, y + 2.2], INK, 1); line(g, [2.2, y - 2.2, -2.2, y + 2.2], INK, 1); } } else { g.globalAlpha = 0.35; line(g, [-1.4, -15, -1.4, 15], '#fff', 1.2); g.globalAlpha = 1; } g.restore(); });
  },
  tactics(g) { // 병법서
    g.save(); g.rotate(-0.14); book(g, 3, 4, 26, 32, '#3f5f8a'); g.restore(); g.save(); g.rotate(0.1); book(g, -2, -1, 26, 32, INDIGO); for (const y of [-11.4, -7.6, -3.8]) rr(g, 5.8, y, 2.6, 2.6, 0.3, 'rgba(38,42,54,0.7)');
    ell(g, -4, 2, 6, 6, null, GOLD, 1.3); line(g, [-8, 6, 0, -2], GOLD, 1.3); line(g, [0, 6, -8, -2], GOLD, 1.3); g.restore();
  },
  kkokdu(g) { // 꼭두 인형
    rr(g, -9, 17, 18, 4.6, 1.4, WOODD, INK, 1.1);
    path(g, p => { p.moveTo(-7.6, 17); p.quadraticCurveTo(-10, 3, -6, -5); p.lineTo(6, -5); p.quadraticCurveTo(10, 3, 7.6, 17); p.closePath(); }, '#3f8a6a', INK, 1.3); path(g, p => { p.moveTo(-4, -5); p.lineTo(0, 2); p.lineTo(4, -5); p.closePath(); }, GOLD, INK, 0.8); rr(g, -8.6, 5, 17.2, 3.4, 0.6, RED, INK, 0.8);
    for (const s of [-1, 1]) { path(g, p => { p.moveTo(s * 6, -4); p.quadraticCurveTo(s * 15, -3, s * 15, 6); p.lineTo(s * 10, 6.6); p.quadraticCurveTo(s * 10, 1, s * 6.6, 1); p.closePath(); }, RED, INK, 1.1); ell(g, s * 12.6, 7.4, 2.2, 2.2, SKIN, INK, 0.8); }
    ell(g, 0, -11, 7.4, 7, '#f3dcc0', INK, 1.3); for (const s of [-1, 1]) { line(g, [s * 1.4, -10.6, s * 4.4, -11.4], INK, 1.2); line(g, [s * 1.2, -12.8, s * 4.6, -13.6], INK, 0.8); } line(g, [0, -10.4, -0.5, -8.6], '#b98a6a', 0.8); line(g, [-1.5, -7, 1.5, -7], REDD, 1);
    path(g, p => { p.moveTo(-7.6, -13); p.quadraticCurveTo(-7, -19.6, 0, -19.6); p.quadraticCurveTo(7, -19.6, 7.6, -13); p.quadraticCurveTo(0, -16, -7.6, -13); p.closePath(); }, BLACK, INK, 1); rr(g, -3, -24.4, 6, 5.6, 1.2, INDIGO, INK, 0.9); ell(g, 0, -21.4, 1.2, 1.2, GOLD);
  },
  knife(g) { // 은장도
    g.save(); g.rotate(0.78);
    path(g, p => { p.moveTo(-3, -4); p.quadraticCurveTo(-3.6, -15, 2.6, -24); p.quadraticCurveTo(4.4, -14, 3, -4); p.closePath(); }, STEEL, INK, 1.2); g.globalAlpha = 0.7; line(g, [-0.6, -6, 1.4, -19], '#fff', 0.9); g.globalAlpha = 1;
    rr(g, -4.4, -5.6, 8.8, 3.4, 1, GOLD, INK, 0.9); rr(g, -3.6, -2.4, 7.2, 17, 2.4, '#c9cdd2', INK, 1.2); for (const y of [1.6, 6, 10.4]) { ell(g, 0, y, 1.5, 1.5, null, INK, 0.7); } rr(g, -4, 13.6, 8, 3, 1, GOLD, INK, 0.8); ell(g, 0, 18.4, 2, 2, null, INK, 1.6); ell(g, 0, 18.4, 2, 2, null, GOLD, 0.8);
    g.restore(); cord(g, p => { p.moveTo(-14, 13); p.quadraticCurveTo(-19, 8, -17, 3); }, RED, 1.2); tassel(g, -17, 3, 6.6, RED);
  },
  pouch(g) { // 복주머니
    path(g, p => { p.moveTo(-8, -9); p.quadraticCurveTo(-21, 1, -15, 14); p.quadraticCurveTo(-10, 21, 0, 21); p.quadraticCurveTo(10, 21, 15, 14); p.quadraticCurveTo(21, 1, 8, -9); p.closePath(); }, '#c8402f', INK, 1.4);
    path(g, p => { p.moveTo(-9, -9); p.lineTo(-12, -17); p.lineTo(-5, -14.6); p.lineTo(0, -19); p.lineTo(5, -14.6); p.lineTo(12, -17); p.lineTo(9, -9); p.quadraticCurveTo(0, -5.6, -9, -9); p.closePath(); }, '#d9553f', INK, 1.2);
    cord(g, p => { p.moveTo(-9, -9.6); p.quadraticCurveTo(0, -6.4, 9, -9.6); }, GOLD, 1.5); for (const s of [-1, 1]) { cord(g, p => { p.moveTo(s * 5, -8.6); p.quadraticCurveTo(s * 13, -8, s * 14.6, -1); }, GOLD, 1.1); tassel(g, s * 14.6, -0.6, 6, s < 0 ? INDIGO : TEAL); }
    ell(g, 0, 7, 7.4, 7.4, GOLD, INK, 1); for (let i = 0; i < 5; i++) { const a = -PI / 2 + i * TAU / 5; ell(g, Math.cos(a) * 3.3, 7 + Math.sin(a) * 3.3, 2.1, 2.1, REDD); } ell(g, 0, 7, 1.3, 1.3, GLOW);   // 매화 한 송이 g.globalAlpha = 0.3; ell(g, -10.6, 3, 2, 5, '#fff', null, 0, 0.4); g.globalAlpha = 1;
  },
  twin(g) { // 쌍검술 비급
    book(g, 0, 1, 30, 36, '#7a2f2a');
    for (const s of [-1, 1]) { g.save(); g.translate(-1.6, 3); g.rotate(s * 0.62); path(g, p => { p.moveTo(-1.5, 3); p.quadraticCurveTo(-0.8, -8, 3.4, -15); p.quadraticCurveTo(2.6, -7, 1.6, 3); p.closePath(); }, STEEL, INK, 1); rr(g, -3, 2.4, 6, 2, 0.8, GOLD, INK, 0.7); line(g, [0, 4.4, 0, 9.6], BLACK, 2); g.restore(); }
  },
  bigshield(g) { // 큰 등패
    rattan(g, 0, 0, 20.6, '#b8342a'); for (const s of [-1, 1]) { ell(g, s * 6.4, -3.6, 3.4, 3, WHITE, INK, 0.9); ell(g, s * 6, -3.2, 1.4, 1.6, INK); line(g, [s * 10.4, -8.6, s * 3, -6.6], INK, 1.6); }
    path(g, p => { p.moveTo(-7, 8); p.quadraticCurveTo(0, 5.4, 7, 8); p.quadraticCurveTo(4, 13.6, 0, 13.6); p.quadraticCurveTo(-4, 13.6, -7, 8); p.closePath(); }, REDD, INK, 0.9); for (const s of [-1, 1]) poly(g, [s * 5, 8, s * 3.4, 11.6, s * 1.8, 7.6], WHITE, INK, 0.6);
  },
  longspear(g) { // 장창
    g.save(); g.rotate(0.72); line(g, [0, 26, 0, -8], INK, 3.6); line(g, [0, 26, 0, -8], '#8a5a34', 2);
    path(g, p => { p.moveTo(-1.6, -7); p.quadraticCurveTo(-11, -4, -9, 6); p.quadraticCurveTo(-4.4, 0, 1.6, -1.6); p.closePath(); }, RED, INK, 1); path(g, p => { p.moveTo(1.6, -7); p.quadraticCurveTo(10, -3, 8, 5); p.quadraticCurveTo(4.4, 0, -1, -1.6); p.closePath(); }, '#d9553f', INK, 1);
    rr(g, -3, -10, 6, 3.4, 1, GOLD, INK, 0.9); poly(g, [-4.6, -10, 0, -27, 4.6, -10, 0, -7], STEEL, INK, 1.3); line(g, [0, -24, 0, -9], 'rgba(38,42,54,0.4)', 0.8); g.globalAlpha = 0.7; line(g, [-1.6, -12, -0.4, -21], '#fff', 0.9); g.globalAlpha = 1; g.restore();
  },
  bridle(g) { // 황소 고삐
    for (const r of [15.6, 11.4, 7.2]) { g.beginPath(); g.ellipse(-2, 5, r, r * 0.62, -0.2, 0, TAU); st(g, INK, 4.4); g.beginPath(); g.ellipse(-2, 5, r, r * 0.62, -0.2, 0, TAU); st(g, '#c9a06a', 2.6); }
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; line(g, [-2 + Math.cos(a) * 14.4, 5 + Math.sin(a) * 9, -2 + Math.cos(a + 0.2) * 16.6, 5 + Math.sin(a + 0.2) * 10.4], 'rgba(122,74,44,0.7)', 0.9); }
    cord(g, p => { p.moveTo(9, -3); p.quadraticCurveTo(15, -10, 11, -14); }, '#c9a06a', 2.4);
    g.beginPath(); g.arc(8, -16, 5.6, PI * 0.15, PI * 1.85); st(g, INK, 4.2); g.beginPath(); g.arc(8, -16, 5.6, PI * 0.15, PI * 1.85); st(g, WOOD, 2.4); for (const a of [0.15, 1.85]) ell(g, 8 + Math.cos(PI * a) * 5.6, -16 + Math.sin(PI * a) * 5.6, 1.7, 1.7, RED, INK, 0.7);
  },
  quiver(g) { // 큰 전통
    g.save(); g.rotate(0.3);
    for (const [x, c] of [[-6, WHITE], [-2, RED], [2, WHITE], [6, INDIGO]]) { line(g, [x, -8, x * 1.25, -19], INK, 2.4); line(g, [x, -8, x * 1.25, -19], '#e9d9b0', 1.1); poly(g, [x * 1.25 - 2.2, -17, x * 1.25, -24.6, x * 1.25 + 2.2, -17], c, INK, 0.8); }
    path(g, p => { p.moveTo(-9, -9); p.lineTo(9, -9); p.lineTo(7, 19); p.quadraticCurveTo(0, 23, -7, 19); p.closePath(); }, WOODD, INK, 1.4); rr(g, -9.6, -10.6, 19.2, 4.6, 1.4, GOLD, INK, 1); rr(g, -8.4, 5, 16.8, 3.4, 0.8, GOLD, INK, 0.9);
    ell(g, 0, -1.6, 4, 4, RED, INK, 0.9); g.globalAlpha = 0.3; line(g, [-5.6, -4, -4.6, 16], '#fff', 1.4); g.globalAlpha = 1; g.restore();
    cord(g, p => { p.moveTo(-11, -4); p.quadraticCurveTo(-20, 4, -12, 15); }, RED, 1.3);
  },
  thunder(g) { // 번개 부적
    g.save(); g.rotate(-0.1); paperTal(g, 0, 0, 20, 36, '#f3ecff', PURPLE, true); g.restore();
    poly(g, [14, -20, 9, -10, 13, -10, 8, 0, 18, -13, 14, -13, 18, -20], '#f0d264', INK, 0.9); spark(g, -15, 12, 3, '#e6dcf2'); for (const [x, y] of [[-16, -12], [15, 9]]) line(g, [x, y, x + 3, y + 4], PURPLE, 1.3);
  },
  bell(g) { // 굿 방울
    line(g, [0, 23, 0, 0], INK, 3.6); line(g, [0, 23, 0, 0], WOODD, 2); rr(g, -2.6, 12, 5.2, 3, 0.8, GOLD, INK, 0.7);
    for (const [x, c] of [[-1, RED], [1, INDIGO]]) cord(g, p => { p.moveTo(0, 6); p.quadraticCurveTo(x * 12, 9, x * 13, 20); }, c, 1.3); cord(g, p => { p.moveTo(0, 6); p.quadraticCurveTo(4, 13, 3, 21); }, OCHRE, 1.1);
    for (const [x, y, r] of [[-9.6, -2, 4.6], [9.6, -2, 4.6], [0, -1, 4.6], [-6.4, -11, 4.8], [6.4, -11, 4.8], [0, -18.4, 4.6]]) { ell(g, x, y, r, r, GOLD, INK, 1.1); line(g, [x - r * 0.55, y + r * 0.3, x + r * 0.55, y + r * 0.3], INK, 0.9); ell(g, x, y + r * 0.3, 0.8, 0.8, INK); g.globalAlpha = 0.6; ell(g, x - r * 0.35, y - r * 0.4, r * 0.3, r * 0.18, '#fff'); g.globalAlpha = 1; }
  },
  fuse(g) { // 긴 심지
    for (const r of [15, 10.4, 5.8]) { g.beginPath(); g.ellipse(-3, 6, r, r * 0.7, 0, 0, TAU); st(g, INK, 3.8); g.beginPath(); g.ellipse(-3, 6, r, r * 0.7, 0, 0, TAU); st(g, '#d9b77a', 2.1); }
    for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; ell(g, -3 + Math.cos(a) * 15, 6 + Math.sin(a) * 10.5, 0.7, 0.7, WOODD); }
    cord(g, p => { p.moveTo(10, -1); p.bezierCurveTo(18, -6, 6, -12, 13, -18); }, '#d9b77a', 2.1); flame(g, 13.6, -20, 3.6); rays(g, 13.6, -20, 6.4, 9.6, 5, INK, 1.1, -PI * 0.9, PI * 0.8);
  },
  ironmace(g) { // 무쇠 철퇴
    g.save(); g.rotate(0.7); line(g, [0, 24, 0, -4], INK, 4); line(g, [0, 24, 0, -4], '#5a3a26', 2.4); for (const y of [8, 14]) rr(g, -2.4, y, 4.8, 2, 0.6, GOLD, INK, 0.6); ell(g, 0, 24, 2.4, 2.4, GOLD, INK, 0.8);
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; poly(g, [Math.cos(a - 0.3) * 8.4, -9 + Math.sin(a - 0.3) * 8.4, Math.cos(a) * 14.6, -9 + Math.sin(a) * 14.6, Math.cos(a + 0.3) * 8.4, -9 + Math.sin(a + 0.3) * 8.4], GREY, INK, 0.9); }
    ell(g, 0, -9, 9.8, 9.8, IRON, INK, 1.4); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + 0.4; poly(g, [Math.cos(a) * 4.6 - 1.6, -9 + Math.sin(a) * 4.6, Math.cos(a) * 4.6, -9 + Math.sin(a) * 4.6 - 1.8, Math.cos(a) * 4.6 + 1.6, -9 + Math.sin(a) * 4.6, Math.cos(a) * 4.6, -9 + Math.sin(a) * 4.6 + 1.8], '#c9cdd2', INK, 0.5); }
    g.globalAlpha = 0.4; ell(g, -3.6, -13, 3, 1.6, '#fff', null, 0, -0.6); g.globalAlpha = 1; g.restore();
  },
  // ── 부정 ──
  c_trick(g) { // 도깨비 장난
    for (const s of [-1, 1]) path(g, p => { p.moveTo(s * 5, -13); p.quadraticCurveTo(s * 11, -19, s * 10, -25); p.quadraticCurveTo(s * 4, -20, s * 1.6, -14); p.closePath(); }, '#f3e7c8', INK, 1.1);
    path(g, p => { p.moveTo(-15, -6); p.lineTo(-18, -14); p.lineTo(-11, -12); p.lineTo(-9, -17); p.lineTo(-4, -13.6); p.lineTo(0, -17); p.lineTo(4, -13.6); p.lineTo(9, -17); p.lineTo(11, -12); p.lineTo(18, -14); p.lineTo(15, -6); p.closePath(); }, BLACK, INK, 1);
    path(g, p => { p.moveTo(-15, -7); p.quadraticCurveTo(-18, 6, -11, 14); p.quadraticCurveTo(0, 21, 11, 14); p.quadraticCurveTo(18, 6, 15, -7); p.quadraticCurveTo(0, -11, -15, -7); p.closePath(); }, '#8a64a8', INK, 1.4);
    for (const s of [-1, 1]) { path(g, p => { p.moveTo(s * 2.2, 0.6); p.quadraticCurveTo(s * 6, -4.6, s * 10.6, -3.4); p.quadraticCurveTo(s * 7.6, 2.6, s * 2.2, 0.6); p.closePath(); }, '#f6e9a8', INK, 1); ell(g, s * 6, -0.8, 1.2, 1.5, INK); line(g, [s * 11.6, -7.6, s * 2, -3], INK, 1.9); }
    path(g, p => { p.moveTo(-8.6, 6.6); p.quadraticCurveTo(0, 4, 8.6, 6.6); p.quadraticCurveTo(6, 13.4, 0, 13.4); p.quadraticCurveTo(-6, 13.4, -8.6, 6.6); p.closePath(); }, REDD, INK, 1);
    for (const x of [-4.4, -1.4, 1.6]) rr(g, x, 6, 2.8, 2.6, 0.4, WHITE, INK, 0.5); for (const s of [-1, 1]) { poly(g, [s * 7.4, 6.2, s * 5.8, 11.4, s * 4.2, 6], WHITE, INK, 0.6); poly(g, [s * 5.6, 13, s * 4.4, 8.6, s * 3, 13.2], WHITE, INK, 0.6); }
  },
  c_luck(g) { // 액운
    g.save(); g.rotate(-0.12); g.globalAlpha = 0.9; path(g, p => { p.arc(-1.6, 3, 14, PI * 0.56, PI * 1.56); p.lineTo(-3, -4); p.lineTo(-0.4, 1); p.lineTo(-3.6, 7); p.closePath(); }, '#8f897a', INK, 1.3); g.restore();
    g.save(); g.translate(3, 0); g.rotate(0.2); path(g, p => { p.arc(-1, 3, 14, -PI * 0.44, PI * 0.56); p.lineTo(-2.6, 7); p.lineTo(0.6, 1); p.lineTo(-2, -4); p.closePath(); }, '#a39c8a', INK, 1.3); g.restore();
    rr(g, -6, -1.6, 4, 9, 0.5, '#5a5346', INK, 0.7); rr(g, 2.6, -2.4, 4, 9, 0.5, '#5a5346', INK, 0.7);
    for (const [x, d] of [[-10, 1], [0, -1], [10, 1]]) { g.beginPath(); g.moveTo(x, -13); g.bezierCurveTo(x + 5 * d, -16, x - 5 * d, -20, x + 2 * d, -24); st(g, INK, 2.8); g.beginPath(); g.moveTo(x, -13); g.bezierCurveTo(x + 5 * d, -16, x - 5 * d, -20, x + 2 * d, -24); st(g, PURPLE, 1.4); }
  },
  c_fog(g) { // 눈먼 안개
    cloud(g, 2, -12, 1.2, '#d6d2dc'); cloud(g, -6, 10, 1.1, '#c6c2d0');
    path(g, p => { p.moveTo(-14, -1); p.quadraticCurveTo(0, -11, 14, -1); p.quadraticCurveTo(0, 9, -14, -1); p.closePath(); }, WHITE, INK, 1.3); g.beginPath(); g.moveTo(-10.6, -0.4); g.quadraticCurveTo(0, 6, 10.6, -0.4); st(g, INK, 2); for (const x of [-7, -2.4, 2.4, 7]) line(g, [x, 2.6 - Math.abs(x) * 0.12, x * 1.16, 6 - Math.abs(x) * 0.14], INK, 1.2);
    for (const [y, x0, x1] of [[18, -18, -6], [-21, 6, 19]]) line(g, [x0, y, x1, y], '#8f8aa0', 1.6);
  },
  c_chill(g) { // 으스스한 한기
    path(g, p => { p.moveTo(-2, -23); p.bezierCurveTo(4, -15, 14, -11, 12, 2); p.bezierCurveTo(11, 12, 5, 17, -1, 17); p.bezierCurveTo(-9, 17, -14, 10, -13, 1); p.bezierCurveTo(-12.4, -5, -8, -6, -7, -12); p.bezierCurveTo(-4, -9, -3, -16, -2, -23); p.closePath(); }, '#5fb6d9', INK, 1.4);
    path(g, p => { p.moveTo(-1, -6); p.bezierCurveTo(4, 0, 6.6, 5, 5, 9.6); p.bezierCurveTo(3, 13.6, -4, 13.6, -6, 9); p.bezierCurveTo(-7.4, 4.6, -3, 1, -1, -6); p.closePath(); }, '#d6f3fb');
    for (const s of [-1, 1]) path(g, p => { p.moveTo(s * 1 - 0.6, 7); p.quadraticCurveTo(s * 3 - 0.6, 2.4, s * 5.8 - 0.6, 3); p.quadraticCurveTo(s * 4.4 - 0.6, 8, s * 1 - 0.6, 7); p.closePath(); }, '#123650'); line(g, [-3, 10.6, -1.4, 11.6, 0.2, 10.6, 1.8, 11.6], '#1f4f6f', 0.9);
    for (const [x, y, r] of [[16, -15, 4.6], [-16, -12, 3.4], [17, 14, 3.2]]) { for (let i = 0; i < 3; i++) { const a = i / 3 * PI; line(g, [x - Math.cos(a) * r, y - Math.sin(a) * r, x + Math.cos(a) * r, y + Math.sin(a) * r], INK, 2.2); line(g, [x - Math.cos(a) * r, y - Math.sin(a) * r, x + Math.cos(a) * r, y + Math.sin(a) * r], '#dff4fb', 1); } }
    cord(g, p => { p.moveTo(-9, 20); p.quadraticCurveTo(0, 23, 9, 20); }, ICE, 1.2);
  },
};

// ───────── 종이 오림으로 굽기 ─────────
const cache = new Map();
function iconSprite(kind, id) {
  const key = kind + ':' + id; let s = cache.get(key); if (s) return s;
  const art = (kind === 'card' ? CARD_ART : kind === 'misc' ? MISC_ART : RELIC_ART)[id];
  s = paperSprite(art || (g => { ell(g, 0, 0, 14, 14, '#d9cdb0', INK, 1.4); text(g, '?', 0, 1, { size: 18, font: FONT_B }); }), { w: 68, h: 68, ox: 34, oy: 34, bw: 2.2, border: kind === 'relic' && id.startsWith('c_') ? '#ebe2f4' : PAPER });
  cache.set(key, s); return s;
}
// s = 1 이면 한 변이 약 50 인 아이콘
export function cardIcon(g, id, x, y, s = 1, rot = 0) { drawSprite(g, iconSprite('card', id), x, y, s, s, rot); }
export function relicIcon(g, id, x, y, s = 1, rot = 0) { drawSprite(g, iconSprite('relic', id), x, y, s, s, rot); }
export function miscIcon(g, id, x, y, s = 1, rot = 0) { drawSprite(g, iconSprite('misc', id), x, y, s, s, rot); }
// 시작을 늦추지 않도록 아이콘은 첫 화면이 뜬 뒤 몇 장씩 나눠 굽는다 (그 전에 필요하면 그때 바로 굽는다)
export function warmIcons() {
  const todo = [...Object.keys(CARD_ART).map(k => ['card', k]), ...Object.keys(RELIC_ART).map(k => ['relic', k]), ...Object.keys(MISC_ART).map(k => ['misc', k])];
  const step = () => { for (let n = 0; n < 2 && todo.length; n++) iconSprite(...todo.shift()); if (todo.length) setTimeout(step, 40); };
  setTimeout(step, 500);
}
