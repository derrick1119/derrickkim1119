// 한지 전장(가로): 멀리 겹친 산, 끝없이 이어지는 고갯길, 길가에서 만나는 것들
import { TAU, INK, PAPER, RED, INDIGO, TEAL, OCHRE, st, fs, ell, rr, poly, line, path, text, FONT_B, makeCanvas, paperSprite, rng } from './draw.js';
import { W, H } from '../config.js';

export const THEMES = {
  pass: { paper: '#e9dec4', wash: ['#a9b78f', '#93a57f'], path: '#f1e8d2', fiber: '#9a8660', tuft: '#5f7a5a', mtn: ['#8a98a0', '#5f6f7a'], sky: '#efe6cf', pine: '#3f6b5c', pineD: '#2c4f44', pineL: '#6f9a86', stone: ['#b9b3a2', '#a59f8f'], flower: ['#f3c4c9', '#fbf7ec', '#f0d264'] },
  grove: { paper: '#dfd9bb', wash: ['#8fa87a', '#7a9670', '#9aae7a'], path: '#ece5c9', fiber: '#8a8658', tuft: '#4a6a4a', mtn: ['#7a9088', '#4f6a62'], sky: '#e6e3c8', pine: '#2f5f4c', pineD: '#1f4436', pineL: '#5f8f78', stone: ['#aeb0a0', '#959a8a'], flower: ['#f0d264', '#fbf7ec'] },
  dusk: { paper: '#c9cfd8', wash: ['#9aa6ba', '#8794ac', '#a8a2bc'], path: '#dadee4', fiber: '#7a8494', tuft: '#56607a', mtn: ['#6a7488', '#454f66'], sky: '#b9c0d0', pine: '#4a5a6c', pineD: '#333f4e', pineL: '#72849a', stone: ['#a9adb6', '#8e939e'], flower: ['#dfe8ee', '#b8a0e0'], night: true },
};
export const GW = 2560, FW = 1920, FAR_H = 150; // 바닥 한 장과 먼 산 한 장의 너비 (이어 붙여 끝없이 흐른다)
const TOP = 104; // 이 위는 먼 산이 비친다

function pine(g, x, y, s, T) {
  g.save(); g.translate(x, y); g.scale(s, s);
  const tr = p => { p.moveTo(-3, 0); p.bezierCurveTo(4, -22, -8, -40, 2, -62); };
  g.beginPath(); tr(g); st(g, INK, 7.5); g.beginPath(); tr(g); st(g, '#7a5a40', 5);
  for (const [cx, cy, rx] of [[-16, -44, 26], [14, -58, 24], [-2, -76, 22]]) { ell(g, cx, cy, rx, rx * 0.42, T.pine, INK, 1.4); for (let i = -2; i <= 2; i++) line(g, [cx + i * rx * 0.3, cy - rx * 0.3, cx + i * rx * 0.34, cy + rx * 0.1], T.pineD, 1.1); g.globalAlpha = 0.5; ell(g, cx - rx * 0.2, cy - rx * 0.16, rx * 0.5, rx * 0.12, T.pineL); g.globalAlpha = 1; }
  g.restore();
}

// 바닥: 한지 위에 번진 풀빛, 가운데로 이어지는 길, 위쪽 가장자리의 솔숲
export function makeGround(themeId, seed = 7) {
  const T = THEMES[themeId] || THEMES.pass, S = 1.25, c = makeCanvas(GW * S, H * S), g = c.getContext('2d'); g.scale(S, S);
  const R = rng(seed * 977 + 13), k = TAU / GW;
  // 이음매가 보이지 않게 가장자리에 걸친 것은 반대편에도 그린다
  const wrap = (x, r, fn) => { fn(x); if (x < r) fn(x + GW); if (x > GW - r) fn(x - GW); };
  const edge = g.createLinearGradient(0, TOP - 14, 0, TOP + 26); edge.addColorStop(0, T.paper + '00'); edge.addColorStop(1, T.paper);
  g.fillStyle = edge; g.fillRect(0, TOP - 14, GW, 40); g.fillStyle = T.paper; g.fillRect(0, TOP + 26, GW, H);
  for (let i = 0; i < 90; i++) { const x = R() * GW, y = 150 + R() * 520, rx = 70 + R() * 130, ry = 36 + R() * 60, rot = R() * 3, a = 0.3 + R() * 0.2, col = T.wash[(R() * T.wash.length) | 0]; wrap(x, 220, xx => { g.globalAlpha = a; g.fillStyle = col; g.beginPath(); g.ellipse(xx, y, rx, ry, rot, 0, TAU); g.fill(); }); }
  // 길: 가운데를 따라 구불구불 이어진다
  const ry = x => 344 + Math.sin(x * k * 3) * 26 + Math.sin(x * k * 7 + 1) * 10;
  g.globalAlpha = 0.5; g.fillStyle = T.path; for (let x = -60; x < GW + 60; x += 46) { g.beginPath(); g.ellipse(x, ry(x), 64, 86 + Math.sin(x * k * 5) * 14, 0, 0, TAU); g.fill(); }
  g.globalAlpha = 1;
  for (let i = 0; i < 70; i++) { const x = R() * GW, y = 150 + R() * 500, l = 90 + R() * 200, col = T.wash[(R() * T.wash.length) | 0], a = 0.16 + R() * 0.14, w = [0, 1, 2, 3, 4].map(() => [(R() - 0.5) * 16, 0.8 + R() * 0.2, (R() - 0.5) * 6, 1.6 + R() * 1.8]); wrap(x, 320, xx => { g.globalAlpha = a; w.forEach((q, n) => { g.beginPath(); g.moveTo(xx, y + n * 3.2); g.quadraticCurveTo(xx + l * 0.5, y + n * 3.2 + q[0], xx + l * q[1], y + n * 3.2 + q[2]); st(g, col, q[3]); }); }); }
  g.globalAlpha = 1;
  for (let x = 30; x < GW; x += 80 + R() * 40) { const y = ry(x) + (R() - 0.5) * 150; g.globalAlpha = 0.5; ell(g, x, y, 9 + R() * 8, 5 + R() * 3, T.stone[(R() * 2) | 0], INK + '88', 1); } g.globalAlpha = 1;
  // 한지 섬유
  for (let i = 0; i < 3600; i++) { const x = R() * GW, y = TOP + R() * (H - TOP), a = R() * TAU, l = 4 + R() * 10; g.globalAlpha = 0.15; g.strokeStyle = R() < 0.5 ? T.fiber : '#ffffff'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  g.globalAlpha = 1;
  for (let i = 0; i < 190; i++) { const x = R() * GW, y = 140 + R() * 540; line(g, [x - 3, y, x - 4.5, y - 6], T.tuft, 1.2); line(g, [x, y, x, y - 8], T.tuft, 1.2); line(g, [x + 3, y, x + 4.5, y - 6], T.tuft, 1.2); }
  for (let i = 0; i < 80; i++) { const x = R() * GW, y = 150 + R() * 520; for (let q = -3; q <= 3; q++) { g.beginPath(); g.moveTo(x + q * 2.2, y); g.quadraticCurveTo(x + q * 3.4, y - 7, x + q * 5.2 + (R() - 0.5) * 3, y - 10 - R() * 6); st(g, q % 2 ? T.tuft : T.pine, 1.1); } }
  for (let i = 0; i < 110; i++) { const x = R() * GW, y = 150 + R() * 520, col = T.flower[(R() * T.flower.length) | 0]; line(g, [x, y + 5, x, y], T.tuft, 1); for (let q = 0; q < 5; q++) { const a = q / 5 * TAU; ell(g, x + Math.cos(a) * 2.2, y + Math.sin(a) * 2.2, 1.5, 1.5, col, INK + '77', 0.5); } ell(g, x, y, 1, 1, OCHRE); }
  for (let i = 0; i < 100; i++) { const x = R() * GW, y = 140 + R() * 540; g.globalAlpha = 0.6; ell(g, x, y, 2.4 + R() * 3.4, 1.6 + R() * 1.8, T.stone[(R() * 2) | 0], INK + '99', 0.8); } g.globalAlpha = 1;
  for (let i = 0; i < 170; i++) { g.globalAlpha = 0.1 + R() * 0.14; ell(g, R() * GW, 130 + R() * 560, 0.8 + R() * 2.2, 0.8 + R() * 1.8, INK); } g.globalAlpha = 1;
  // 위쪽 가장자리의 솔숲과 바위
  for (let x = 70; x < GW - 60; x += 120 + R() * 110) { if (R() < 0.22) { const r = 14 + R() * 10, y = 124 + R() * 6; poly(g, [x - r, y, x - r * 0.8, y - r * 0.9, x - r * 0.2, y - r * 1.3, x + r * 0.6, y - r, x + r, y - r * 0.2, x + r * 0.8, y + 2], T.stone[1], INK, 1.5); line(g, [x - r * 0.4, y - r * 0.4, x, y - r, x + r * 0.4, y - r * 0.5], INK + '88', 1); } else pine(g, x, 124 + R() * 8, 0.8 + R() * 0.28, T); }
  return c;
}
// 먼 산: 바닥보다 천천히 흐른다
export function makeFar(themeId, seed = 7) {
  const T = THEMES[themeId] || THEMES.pass, S = 1.25, c = makeCanvas(FW * S, FAR_H * S), g = c.getContext('2d'); g.scale(S, S);
  const R = rng(seed * 331 + 5), k = TAU / FW;
  g.fillStyle = T.sky; g.fillRect(0, 0, FW, FAR_H);
  if (T.night) { for (let i = 0; i < 90; i++) { g.globalAlpha = 0.4 + R() * 0.5; ell(g, R() * FW, 60 + R() * 50, 0.8 + R() * 1.2, 0.8 + R() * 1.2, '#f4efdc'); } g.globalAlpha = 0.18; ell(g, 1300, 92, 44, 44, '#f4efdc'); g.globalAlpha = 0.9; ell(g, 1300, 92, 24, 24, '#f4efdc', INK, 1.4); g.globalAlpha = 1; }
  else { g.globalAlpha = 0.85; ell(g, 1340, 104, 26, 26, '#d9553f'); g.globalAlpha = 0.22; ell(g, 1340, 104, 38, 38, '#d9553f'); g.globalAlpha = 1; }
  T.mtn.forEach((col, n) => {
    const yb = 112 + n * 16, amp = 40 - n * 12, f = x => yb - Math.abs(Math.sin(x * k * (3 + n * 2) + n * 1.7 + seed)) * amp - Math.sin(x * k * 11 + n) * 5;
    g.globalAlpha = 0.55 + n * 0.15; g.fillStyle = col; g.beginPath(); g.moveTo(0, FAR_H); for (let x = 0; x <= FW; x += 16) g.lineTo(x, f(x)); g.lineTo(FW, FAR_H); g.closePath(); g.fill();
    g.globalAlpha = 0.35; g.beginPath(); for (let x = 0; x <= FW; x += 16) { if (x) g.lineTo(x, f(x)); else g.moveTo(x, f(x)); } st(g, INK, 1.2);
  });
  g.globalAlpha = 1;
  for (let i = 0; i < 9; i++) { const x = R() * FW, y = 112 + R() * 26, rx = 90 + R() * 130; const mg = g.createRadialGradient(x, y, 0, x, y, rx); mg.addColorStop(0, 'rgba(255,252,240,0.55)'); mg.addColorStop(1, 'rgba(255,252,240,0)'); for (const xx of [x, x - FW, x + FW]) { g.save(); g.translate(xx, y); g.scale(1, 0.2); g.translate(-x, -y); g.fillStyle = mg; g.fillRect(x - rx, y - rx, rx * 2, rx * 2); g.restore(); } }
  return c;
}
// 가장자리로 갈수록 바랜 종이 (흐르지 않는다)
const vcache = new Map();
export function vignette(night) {
  let c = vcache.get(!!night); if (c) return c;
  c = makeCanvas(W / 2, H / 2); const g = c.getContext('2d'), vg = g.createRadialGradient(W / 4, H / 4 + 20, 150, W / 4, H / 4 + 20, 420);
  vg.addColorStop(0, 'rgba(70,48,24,0)'); vg.addColorStop(1, night ? 'rgba(20,24,44,0.36)' : 'rgba(70,48,24,0.27)'); g.fillStyle = vg; g.fillRect(0, 0, W / 2, H / 2);
  vcache.set(!!night, c); return c;
}

// ── 길가에서 만나는 것들 (발 위치가 원점) ──
const WOOD = '#a9753f', WOODD = '#7a4a2c', STRAW = '#d9b24a', WHITE = '#fbf7ec';
const post = (g, x, h, lw = 3.4) => { line(g, [x, 0, x, -h], INK, lw + 1.6); line(g, [x, 0, x, -h], WOOD, lw); };
const STOPS = {
  rest(g) { // 주막: 초가지붕과 등불
    rr(g, -40, -40, 80, 40, 2, '#efe2c4', INK, 1.5); rr(g, -28, -32, 20, 32, 1, WOODD, INK, 1.2); for (const x of [6, 22]) { rr(g, x, -30, 12, 14, 1, '#f8f0dc', INK, 1); line(g, [x + 6, -30, x + 6, -16], INK, 0.8); line(g, [x, -23, x + 12, -23], INK, 0.8); }
    path(g, p => { p.moveTo(-52, -38); p.quadraticCurveTo(-30, -74, 0, -76); p.quadraticCurveTo(30, -74, 52, -38); p.quadraticCurveTo(0, -46, -52, -38); p.closePath(); }, STRAW, INK, 1.6); for (let i = -4; i <= 4; i++) line(g, [i * 9, -72 + Math.abs(i) * 4, i * 11, -42], '#b8944f', 1);
    post(g, 56, 62, 2.6); line(g, [56, -60, 70, -60], INK, 2.4); rr(g, 63, -58, 14, 20, 4, RED, INK, 1.2); text(g, '주', 70, -47.4, { size: 12, font: FONT_B, fill: WHITE });
    for (const [x, c] of [[-46, '#8a6248'], [-34, '#6b4a3a']]) { rr(g, x, -16, 11, 16, 4, c, INK, 1.1); rr(g, x + 1, -19, 9, 4, 1.5, c, INK, 1); }
  },
  shop(g) { // 장터: 줄무늬 차일과 좌판
    post(g, -38, 62, 2.6); post(g, 38, 62, 2.6);
    path(g, p => { p.moveTo(-50, -60); p.lineTo(50, -60); p.lineTo(56, -40); p.lineTo(-56, -40); p.closePath(); }, WHITE, INK, 1.5); for (let i = 0; i < 6; i++) if (i % 2 === 0) path(g, p => { const x0 = -50 + i * 16.7, x1 = x0 + 16.7; p.moveTo(x0, -60); p.lineTo(x1, -60); p.lineTo(-56 + (i + 1) * 18.7, -40); p.lineTo(-56 + i * 18.7, -40); p.closePath(); }, '#b8742a', INK, 0.8);
    for (let i = 0; i < 6; i++) { const x = -56 + i * 18.7; path(g, p => { p.moveTo(x, -40); p.quadraticCurveTo(x + 9.3, -30, x + 18.7, -40); p.closePath(); }, i % 2 ? WHITE : '#b8742a', INK, 0.9); }
    rr(g, -44, -22, 88, 8, 1.5, WOOD, INK, 1.3); for (const x of [-36, 32]) rr(g, x, -14, 5, 14, 1, WOODD, INK, 1);
    ell(g, -26, -26, 9, 6, '#6b4a3a', INK, 1.1); ell(g, -26, -29, 6, 2.6, '#d9553f', INK, 0.8); rr(g, -8, -34, 14, 12, 1.5, INDIGO, INK, 1.1); rr(g, 12, -30, 20, 8, 1, '#e3c890', INK, 1); for (const x of [16, 22, 28]) ell(g, x, -32, 3, 3, OCHRE, INK, 0.8);
  },
  event(g) { // 서낭당: 돌무더기와 오색 천을 맨 나무
    g.beginPath(); g.moveTo(22, 0); g.bezierCurveTo(26, -24, 14, -44, 26, -68); st(g, INK, 7); g.beginPath(); g.moveTo(22, 0); g.bezierCurveTo(26, -24, 14, -44, 26, -68); st(g, '#7a5a40', 4.6);
    for (const [x, y, rx] of [[10, -62, 22], [38, -72, 20], [24, -86, 18]]) ell(g, x, y, rx, rx * 0.44, TEAL, INK, 1.3);
    [[RED, -0.5], [OCHRE, -0.2], [WHITE, 0.1], [INDIGO, 0.4], ['#3f8a6a', 0.7]].forEach(([c, a], i) => { g.save(); g.translate(21, -44 + i * 2); g.rotate(a + 1.2); rr(g, 0, -1.6, 22 + i * 2, 3.4, 1, c, INK, 0.7); g.restore(); });
    for (const [x, y, rx, ry] of [[-22, -5, 22, 8], [-8, -4, 16, 7], [-24, -15, 16, 7], [-12, -14, 13, 6], [-20, -24, 11, 6], [-19, -32, 7, 5], [-19, -39, 4.4, 3.4]]) ell(g, x, y, rx, ry, (x + y) % 2 ? '#b9b3a2' : '#a59f8f', INK, 1.3);
  },
  treasure(g) { // 보물 상자
    rr(g, -24, -22, 48, 22, 2, WOODD, INK, 1.5); path(g, p => { p.moveTo(-26, -22); p.quadraticCurveTo(-26, -42, 0, -42); p.quadraticCurveTo(26, -42, 26, -22); p.closePath(); }, WOOD, INK, 1.5);
    for (const x of [-16, 16]) { rr(g, x - 3, -41, 6, 41, 1, OCHRE, INK, 1); } rr(g, -26, -25, 52, 5, 1, OCHRE, INK, 1); rr(g, -5, -27, 10, 11, 2, '#e6b93e', INK, 1.1); ell(g, 0, -21, 1.6, 2, INK);
    for (const [x, y] of [[-34, -50], [32, -54], [0, -58]]) { line(g, [x - 4, y, x + 4, y], OCHRE, 1.6); line(g, [x, y - 4, x, y + 4], OCHRE, 1.6); }
  },
  fork(g) { // 갈림길 푯말
    post(g, 0, 70, 3.2);
    path(g, p => { p.moveTo(-4, -66); p.lineTo(30, -66); p.lineTo(40, -57); p.lineTo(30, -48); p.lineTo(-4, -48); p.closePath(); }, '#e3c890', INK, 1.4); path(g, p => { p.moveTo(4, -42); p.lineTo(-30, -42); p.lineTo(-40, -33); p.lineTo(-30, -24); p.lineTo(4, -24); p.closePath(); }, '#d9b77a', INK, 1.4);
    line(g, [4, -57, 26, -57], INK, 1.3); line(g, [-26, -33, -4, -33], INK, 1.3); for (const x of [-12, 12]) ell(g, x, -1, 8, 3.4, TEAL, INK, 1);
  },
  boss(g) { // 두목의 깃대: 찢어진 붉은 기와 탈
    post(g, 0, 96, 3.6); poly(g, [-3, -96, 0, -106, 3, -96], '#f3e7c8', INK, 1);
    path(g, p => { p.moveTo(0, -94); p.lineTo(46, -90); p.lineTo(38, -78); p.lineTo(48, -66); p.lineTo(36, -56); p.lineTo(44, -44); p.lineTo(0, -40); p.closePath(); }, '#7a1f1c', INK, 1.5);
    ell(g, 19, -68, 11, 12, '#f3e7c8', INK, 1.2); for (const s of [-1, 1]) { ell(g, 19 + s * 4.4, -70, 2.6, 3, INK); poly(g, [19 + s * 5, -80, 19 + s * 9, -87, 19 + s * 9, -78], '#f3e7c8', INK, 0.9); } rr(g, 14, -63, 10, 4, 1, INK);
    for (const [x, y, rx, ry] of [[-16, -4, 14, 6], [12, -3, 12, 5], [-4, -10, 9, 5]]) ell(g, x, y, rx, ry, '#8e939e', INK, 1.2);
  },
  battle(g, elite) { // 요괴가 꽂아 둔 깃대
    post(g, 0, 64, 2.8); path(g, p => { p.moveTo(0, -62); p.lineTo(30, -58); p.lineTo(22, -50); p.lineTo(31, -42); p.lineTo(0, -38); p.closePath(); }, elite ? RED : '#d98a3e', INK, 1.3);
    ell(g, 11, -50, 4.4, 4.4, '#f3e7c8', INK, 0.9); for (const [x, rx] of [[-10, 10], [9, 8]]) ell(g, x, -3, rx, 4.4, '#a59f8f', INK, 1.1);
  },
  elite(g) { STOPS.battle(g, true); },
};
const scache = new Map();
export function stopSprite(kind) {
  let s = scache.get(kind); if (s) return s;
  s = paperSprite(STOPS[kind] || STOPS.battle, { w: 150, h: 130, ox: 75, oy: 116, bw: 2.4 });
  scache.set(kind, s); return s;
}
