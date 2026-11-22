// 한지 전장(가로): 멀리 겹친 산, 끝없이 이어지는 고갯길, 길가에서 만나는 것들
import { TAU, INK, PAPER, RED, INDIGO, TEAL, OCHRE, st, fs, ell, rr, rrPath, poly, line, path, makeCanvas, paperSprite, rng } from './draw.js';
import { part, dk, lt, E, R as RC, P, curve, rope } from './figures.js';
import { symbol } from './symbols.js';
import { W, H } from '../config.js';

export const THEMES = {
  pass: { paper: '#e9dec4', wash: ['#a9b78f', '#93a57f'], path: '#f1e8d2', fiber: '#9a8660', tuft: '#5f7a5a', mtn: ['#8a98a0', '#5f6f7a'], sky: '#efe6cf', pine: '#3f6b5c', pineD: '#2c4f44', pineL: '#6f9a86', stone: ['#b9b3a2', '#a59f8f'], flower: ['#f3c4c9', '#fbf7ec', '#f0d264'], bark: '#a0623f' },
  grove: { paper: '#dfd9bb', wash: ['#8fa87a', '#7a9670', '#9aae7a'], path: '#ece5c9', fiber: '#8a8658', tuft: '#4a6a4a', mtn: ['#7a9088', '#4f6a62'], sky: '#e6e3c8', pine: '#2f5f4c', pineD: '#1f4436', pineL: '#5f8f78', stone: ['#aeb0a0', '#959a8a'], flower: ['#f0d264', '#fbf7ec'], bark: '#8a5a3c' },
  dusk: { paper: '#c9cfd8', wash: ['#9aa6ba', '#8794ac', '#a8a2bc'], path: '#dadee4', fiber: '#7a8494', tuft: '#56607a', mtn: ['#6a7488', '#454f66'], sky: '#b9c0d0', pine: '#4a5a6c', pineD: '#333f4e', pineL: '#72849a', stone: ['#a9adb6', '#8e939e'], flower: ['#dfe8ee', '#b8a0e0'], bark: '#6f5a60', night: true },
  // 고개마다의 풍경: 단풍 든 바윗길 · 눈 고개 · 안개 낀 절터 · 불탄 대장간 마을 · 비구름 낀 용소 · 저승길
  autumn: { paper: '#ead9bd', wash: ['#c9a36a', '#b98a55', '#c9884f'], path: '#f2e6cf', fiber: '#9a7a50', tuft: '#8a6a3a', mtn: ['#a08a7a', '#7a6258'], sky: '#f0e2c8', pine: '#b5562e', pineD: '#8a3d22', pineL: '#d98a4a', stone: ['#b9ad9a', '#a39682'], flower: ['#e8a03c', '#c8402f', '#f0d264'], bark: '#7a4a32' },
  snow: { paper: '#eef0ee', wash: ['#d7dfe2', '#c6d0d6', '#e3e8e8'], path: '#f7f8f6', fiber: '#a9b4ba', tuft: '#8a9aa0', mtn: ['#a9b6c0', '#7f8e9a'], sky: '#e9edf0', pine: '#4f6f6a', pineD: '#365450', pineL: '#dfe9ea', stone: ['#c3c8cc', '#a9b0b6'], flower: ['#ffffff', '#dfe8ee'], bark: '#6f5a50' },
  mist: { paper: '#dcdccb', wash: ['#a3b09a', '#93a392', '#b3b9a3'], path: '#e9e8d8', fiber: '#8a8a72', tuft: '#5f705f', mtn: ['#8f9a98', '#6a7876'], sky: '#e2e3d6', pine: '#4a6a5c', pineD: '#324c42', pineL: '#7f9c8c', stone: ['#b3b3a6', '#9a9c90'], flower: ['#e9e6d2', '#c9d6c0'], bark: '#76604a', mark: 'temple' },
  ember: { paper: '#e2d3bd', wash: ['#b59a80', '#a3866e', '#8f7866'], path: '#efe2cc', fiber: '#8a6f58', tuft: '#6f5a48', mtn: ['#8f7f78', '#66585a'], sky: '#ecdcc6', pine: '#5a5046', pineD: '#3d362f', pineL: '#8a7a68', stone: ['#9a938c', '#7f7872'], flower: ['#ff9a2e', '#c8402f'], bark: '#4a3a30', mark: 'forge' },
  storm: { paper: '#cfd6d6', wash: ['#8fa6a8', '#7d989c', '#9fb0aa'], path: '#dde3e0', fiber: '#788a8c', tuft: '#4f6a6c', mtn: ['#6f8088', '#4a5c66'], sky: '#c3ccd0', pine: '#3f5f62', pineD: '#2c4648', pineL: '#6f8f90', stone: ['#a3acae', '#8a9496'], flower: ['#cfe3e6', '#8fd3e8'], bark: '#5f5750', noSun: true },
  under: { paper: '#cdc3d0', wash: ['#9a8aa8', '#86789a', '#a88a9a'], path: '#ddd5de', fiber: '#7a6c84', tuft: '#5a4a66', mtn: ['#6a5c7a', '#463c58'], sky: '#b9aec4', pine: '#5a4660', pineD: '#3d2f44', pineL: '#86708c', stone: ['#a59fae', '#8a8496'], flower: ['#c8402f', '#e06a5a', '#dfe8ee'], bark: '#5a4650', night: true },
};
export const GW = 2560, FW = 1920, FAR_H = 150; // 바닥 한 장과 먼 산 한 장의 너비 (이어 붙여 끝없이 흐른다)
const TOP = 104; // 이 위는 먼 산이 비친다

const rgba = (c, a) => `rgba(${parseInt(c.slice(1, 3), 16)},${parseInt(c.slice(3, 5), 16)},${parseInt(c.slice(5, 7), 16)},${a})`;

// ── 풍경을 이루는 것들: 소나무·덤불·바위·풀포기 ──
// 구름처럼 층진 잎 뭉치 (솔잎·활엽 모두 이 꼴에서 나온다)
const tuft = (cx, cy, rx, ry) => p => {
  p.moveTo(cx - rx, cy + ry * 0.3);
  p.quadraticCurveTo(cx - rx * 1.06, cy - ry * 0.6, cx - rx * 0.52, cy - ry * 0.7);
  p.quadraticCurveTo(cx - rx * 0.34, cy - ry * 1.22, cx + rx * 0.1, cy - ry * 0.96);
  p.quadraticCurveTo(cx + rx * 0.52, cy - ry * 1.16, cx + rx * 0.68, cy - ry * 0.56);
  p.quadraticCurveTo(cx + rx * 1.1, cy - ry * 0.42, cx + rx, cy + ry * 0.3);
  p.quadraticCurveTo(cx + rx * 0.5, cy + ry * 0.72, cx + rx * 0.06, cy + ry * 0.44);
  p.quadraticCurveTo(cx - rx * 0.46, cy + ry * 0.74, cx - rx, cy + ry * 0.3);
  p.closePath();
};
export function clump(g, cx, cy, rx, ry, col, colD, colL, needle) {
  part(g, tuft(cx, cy, rx, ry), col, E(cx + rx * 0.1, cy + ry * 0.86, rx * 1.2, ry * 0.68), { shc: colD, lw: 1.3 });
  g.save(); g.globalAlpha *= 0.72; ell(g, cx - rx * 0.4, cy - ry * 0.58, rx * 0.32, ry * 0.2, colL, null, 0, -0.15); ell(g, cx + rx * 0.2, cy - ry * 0.8, rx * 0.27, ry * 0.16, colL); g.restore();
  if (needle) for (let i = -3; i <= 3; i++) line(g, [cx + i * rx * 0.25, cy + ry * 0.1, cx + i * rx * 0.31, cy - ry * 0.34], colD, 0.8);
  else for (const [dx, dy] of [[-0.45, 0.05], [0.05, -0.22], [0.5, 0.06]]) curve(g, p => { p.moveTo(cx + (dx - 0.13) * rx, cy + dy * ry + 1.2); p.quadraticCurveTo(cx + dx * rx, cy + dy * ry - 2.2, cx + (dx + 0.13) * rx, cy + dy * ry + 1.2); }, colD, 0.8);
}
// 소나무: 붉은 줄기가 굽이치고 솔잎이 층층이 얹힌다
export function pine(g, x, y, s, T, flip) {
  g.save(); g.translate(x, y); g.scale(s * (flip ? -1 : 1), s);
  const bark = T.bark || '#a0623f', q = [];
  for (let i = 0; i <= 10; i++) { const t = i / 10, u = 1 - t; q.push([u * u * u * -3 + 3 * u * u * t * 5 + 3 * u * t * t * -9 + t * t * t * 2, 3 * u * u * t * -22 + 3 * u * t * t * -40 + t * t * t * -62, 4.4 - t * 2.6]); }
  const trunk = p => { p.moveTo(q[0][0] - q[0][2] - 2.4, 1); for (const a of q) p.lineTo(a[0] - a[2], a[1]); for (let i = 10; i >= 0; i--) p.lineTo(q[i][0] + q[i][2], q[i][1]); p.lineTo(q[0][0] + q[0][2] + 2.4, 1); p.closePath(); };
  part(g, trunk, bark, p => { p.moveTo(q[0][0] + 1, 2); for (const a of q) p.lineTo(a[0] + a[2] * 0.2, a[1]); p.lineTo(24, -62); p.lineTo(24, 2); p.closePath(); }, { k: 0.3, lw: 1.4 });
  for (let i = 1; i < 9; i++) { const a = q[i]; curve(g, p => { p.moveTo(a[0] - a[2] * 0.75, a[1] + 1.6); p.quadraticCurveTo(a[0] - a[2] * 0.1, a[1] - 1.6, a[0] + a[2] * 0.5, a[1] + 1); }, dk(bark, 0.45), 0.7); }
  line(g, [1, 2, 3, 4].flatMap(i => [q[i][0] - q[i][2] * 0.5, q[i][1]]), lt(bark, 0.4), 0.8);
  rope(g, p => { p.moveTo(q[5][0], q[5][1]); p.quadraticCurveTo(-9, -37, -15, -41); }, bark, 1.7);
  rope(g, p => { p.moveTo(q[7][0], q[7][1]); p.quadraticCurveTo(7, -50, 12, -54); }, bark, 1.5);
  for (const [cx, cy, rx] of [[-17, -44, 25], [14, -58, 23], [-3, -76, 21]]) clump(g, cx, cy, rx, rx * 0.46, T.pine, T.pineD, T.pineL, true);
  g.restore();
}
export function bush(g, x, y, s, T) {
  g.save(); g.translate(x, y); g.scale(s, s);
  part(g, p => { p.moveTo(-14, 0); p.quadraticCurveTo(-18, -9, -9.6, -10.4); p.quadraticCurveTo(-6, -18.6, 2, -14.4); p.quadraticCurveTo(10.6, -17.4, 11.4, -8.4); p.quadraticCurveTo(18, -6, 14, 0); p.closePath(); }, T.tuft, E(3, 0.6, 17, 6.4), { k: 0.26, lw: 1.2 });
  g.globalAlpha *= 0.7; ell(g, -5, -11, 4.2, 1.9, lt(T.tuft, 0.34)); ell(g, 5, -12, 3, 1.5, lt(T.tuft, 0.34)); g.globalAlpha /= 0.7;
  for (const [bx, by] of [[-8, -4.6], [1, -7.6], [7.4, -4.4]]) curve(g, p => { p.moveTo(bx - 2.2, by + 1.2); p.quadraticCurveTo(bx, by - 2.2, bx + 2.2, by + 1.2); }, dk(T.tuft, 0.4), 0.7);
  g.restore();
}
// 바위: 빛 받는 면과 그늘진 면이 갈린다
export function boulder(g, x, y, r, T) {
  g.save(); g.translate(x, y);
  part(g, P(-r, r * 0.3, -r * 0.88, -r * 0.55, -r * 0.3, -r * 1.2, r * 0.5, -r * 1.02, r, -r * 0.22, r * 0.82, r * 0.34, -r * 0.5, r * 0.44), T.stone[0],
    P(r * 0.12, -r * 0.5, r * 0.5, -r * 1.1, r * 1.1, -r * 0.3, r, r * 0.5, -r * 0.5, r * 0.5, -r * 0.22, r * 0.04), { shc: dk(T.stone[1], 0.14), hi: P(-r * 0.9, -r * 0.6, -r * 0.3, -r * 1.24, r * 0.06, -r * 1.12, -r * 0.42, -r * 0.72), hk: 0.42, lw: 1.5 });
  line(g, [-r * 0.3, -r * 1.2, -r * 0.1, -r * 0.56, r * 0.12, -r * 0.5, -r * 0.22, r * 0.04], INK + '77', 1); line(g, [r * 0.12, -r * 0.5, r * 0.5, -r * 1.02], INK + '55', 0.9);
  for (const [a, b2] of [[-0.62, -0.2], [0.5, -0.1]]) line(g, [r * a, r * b2, r * (a + 0.14), r * (b2 + 0.16)], INK + '55', 0.8);
  g.restore();
}
export const stone = (g, x, y, rx, ry, col, lw = 1.3) => part(g, E(x, y, rx, ry), col, E(x + rx * 0.45, y + ry * 0.7, rx, ry), { k: 0.24, hi: E(x - rx * 0.3, y - ry * 0.45, rx * 0.42, ry * 0.24), hk: 0.36, lw });
export function grassTuft(g, x, y, s, col, R) {
  g.save(); g.globalAlpha *= 0.14; ell(g, x + 1, y + 0.6, 7 * s, 1.8 * s, INK); g.restore();
  const d = dk(col, 0.25);
  for (let q = -3; q <= 3; q++) { const h = (8 + R() * 7) * s; g.beginPath(); g.moveTo(x + q * 1.7 * s, y); g.quadraticCurveTo(x + q * 2.4 * s, y - h * 0.6, x + q * 4 * s + (R() - 0.5) * 3 * s, y - h); st(g, q % 2 ? col : d, 1.15 * s); }
}

// 고개의 표지: 길가에 드문드문 선 것들 — 옛 절터의 석탑·석등, 불탄 대장간 마을의 그을린 기둥과 모루
const LANDMARK = {
  temple(g, alt) {
    const S = '#b9b6a8', D = '#8f8c80';
    if (alt) { // 석등
      part(g, P(-9, 0, -6, -5, 6, -5, 9, 0), S, RC(0, -5, 9, 5), { lw: 1 }); part(g, RC(-2.6, -18, 5.2, 13), S, RC(0.4, -18, 2.2, 13), { lw: 1 });
      part(g, RC(-6.6, -27, 13.2, 9), S, RC(1, -27, 5.6, 9), { lw: 1 }); rr(g, -2.6, -25, 5.2, 5.4, 0.8, '#3a3640'); ell(g, 0, -22.2, 1.5, 1.8, '#ffd98a');
      part(g, P(-10.6, -27, 0, -35, 10.6, -27), D, P(0, -35, 10.6, -27, 0, -27), { lw: 1 }); ell(g, 0, -36, 1.8, 1.8, S, INK, 0.8); return;
    }
    // 삼층 석탑
    part(g, RC(-13, -4, 26, 4), D, RC(0, -4, 13, 4), { lw: 1 });
    [[11, -4, 9], [8.6, -17, 8], [6.4, -29, 7]].forEach(([w, y, h]) => { part(g, RC(-w * 0.7, y - h, w * 1.4, h), S, RC(w * 0.1, y - h, w * 0.6, h), { lw: 1 }); part(g, P(-w - 3, y - h, -w + 1, y - h - 4, w - 1, y - h - 4, w + 3, y - h), D, P(0, y - h - 4, w - 1, y - h - 4, w + 3, y - h, 0, y - h), { lw: 1 }); });
    line(g, [0, -40, 0, -49], INK, 2.2); line(g, [0, -40, 0, -49], S, 1); ell(g, 0, -43.6, 2.2, 1.6, S, INK, 0.8);
  },
  forge(g, alt) {
    const C = '#3a322e', A = '#5a5046';
    if (alt) { // 모루와 그루터기
      part(g, RC(-7, -9, 14, 9), '#6f5a48', RC(0, -9, 7, 9), { lw: 1 }); part(g, p => { p.moveTo(-12, -18); p.lineTo(10, -18); p.lineTo(15, -15); p.lineTo(6, -13); p.lineTo(5, -9); p.lineTo(-5, -9); p.lineTo(-6, -13); p.lineTo(-12, -14); p.closePath(); }, '#4a4a55', RC(0, -18, 15, 9), { lw: 1.1 }); return;
    }
    // 돌을 쌓은 대장간 화덕과 굴뚝, 아궁이에 남은 불씨 (두 기둥에 들보를 얹은 폐허는 남의 나라 문처럼 보여 쓰지 않는다)
    part(g, RC(4.6, -36, 6.4, 16), '#6a5a50', RC(8, -36, 3, 16), { lw: 1.1 }); rr(g, 3.8, -37.4, 8, 2.6, 0.8, '#5a4c44', INK, 0.9);
    part(g, p => { p.moveTo(-17, 0); p.quadraticCurveTo(-18, -23, 0, -25); p.quadraticCurveTo(18, -23, 17, 0); p.closePath(); }, '#7a6a5e', RC(3, -27, 16, 27), { lw: 1.3 });
    for (const [y, n] of [[-6, 5], [-12.4, 4], [-18.6, 3]]) for (let i = 0; i < n; i++) { const w = 30 - (6 - n) * 6, x0 = -w / 2 + i * w / n + 1; rr(g, x0, y - 2.6, w / n - 2, 4.6, 1.6, null, 'rgba(38,42,54,0.35)', 0.8); }
    path(g, p => { p.moveTo(-6, 0); p.lineTo(-6, -7); p.quadraticCurveTo(0, -13.4, 6, -7); p.lineTo(6, 0); p.closePath(); }, '#2b2a30', INK, 1);
    ell(g, 0, -2.6, 3.6, 2, '#ff9a2e'); ell(g, 0, -3, 1.8, 1, '#ffd27a');
    g.globalAlpha = 0.45; for (const [x, y, r] of [[8, -41, 3.4], [10.6, -46.6, 4.2], [8.4, -53, 5]]) ell(g, x, y, r, r * 0.8, '#c9c2b8'); g.globalAlpha = 1;
    for (const [x, y] of [[-14, -2], [14, -3], [20, -1.4]]) { ell(g, x, y, 2.4, 1.6, '#2b2a30'); ell(g, x, y - 0.6, 1, 0.8, '#ff9a2e'); }
  },
};
// 바닥: 한지 위에 번진 풀빛, 가운데로 이어지는 흙길, 위쪽 가장자리의 솔숲
export function makeGround(themeId, seed = 7) {
  const T = THEMES[themeId] || THEMES.pass, S = 1.25, c = makeCanvas(GW * S, H * S), g = c.getContext('2d'); g.scale(S, S);
  const R = rng(seed * 977 + 13), k = TAU / GW, pick = a => a[(R() * a.length) | 0];
  // 이음매가 보이지 않게 가장자리에 걸친 것은 반대편에도 그린다
  const wrap = (x, r, fn) => { fn(x); if (x < r) fn(x + GW); if (x > GW - r) fn(x - GW); };
  const edge = g.createLinearGradient(0, TOP - 14, 0, TOP + 26); edge.addColorStop(0, T.paper + '00'); edge.addColorStop(1, T.paper);
  g.fillStyle = edge; g.fillRect(0, TOP - 14, GW, 40); g.fillStyle = T.paper; g.fillRect(0, TOP + 26, GW, H);
  // 번진 풀빛: 가운데는 옅고 가장자리에 물이 고인 듯 짙다
  for (let i = 0; i < 110; i++) {
    const x = R() * GW, y = 150 + R() * 540, rx = 100 + R() * 170, ry = rx * (0.3 + R() * 0.26), rot = (R() - 0.5) * 0.5, a = 0.22 + R() * 0.18, col = pick(T.wash);
    wrap(x, 260, xx => { g.save(); g.translate(xx, y); g.rotate(rot); g.scale(1, ry / rx); const gr = g.createRadialGradient(0, 0, rx * 0.2, 0, 0, rx); gr.addColorStop(0, rgba(col, a * 0.7)); gr.addColorStop(0.72, rgba(col, a)); gr.addColorStop(0.88, rgba(col, a * 0.85)); gr.addColorStop(1, rgba(col, 0)); g.fillStyle = gr; g.fillRect(-rx, -rx, rx * 2, rx * 2); g.restore(); });
  }
  // 흙길: 가운데를 따라 구불구불 이어진다
  const ry = x => 344 + Math.sin(x * k * 3) * 26 + Math.sin(x * k * 7 + 1) * 10, hw = x => 58 + Math.sin(x * k * 9 + 2) * 9 + Math.sin(x * k * 17) * 4;
  const onRoad = (x, y) => Math.abs(y - ry(x) - 3) < hw(x) - 6;
  const road = (grow, a) => { g.globalAlpha = a; g.fillStyle = T.path; g.beginPath(); g.moveTo(-20, ry(-20) - hw(-20) - grow); for (let x = 0; x <= GW + 20; x += 20) g.lineTo(x, ry(x) - hw(x) - grow); for (let x = GW + 20; x >= -20; x -= 20) g.lineTo(x, ry(x) + hw(x) * 1.12 + grow); g.closePath(); g.fill(); };
  for (let i = 0; i < 10; i++) road(27 - i * 3, 0.07);
  // 길섶: 붓으로 끊어 그은 선, 수레바퀴 자국
  for (const sgn of [-1, 1]) for (let x = 0; x < GW;) { const l = 40 + R() * 90; if (R() < 0.62) { g.globalAlpha = 0.16 + R() * 0.16; g.beginPath(); for (let xx = x; xx <= x + l; xx += 10) { const yy = ry(xx) + sgn * (hw(xx) * (sgn > 0 ? 1.12 : 1) + 2) + Math.sin(xx * 0.3) * 0.8; if (xx === x) g.moveTo(xx, yy); else g.lineTo(xx, yy); } st(g, T.fiber, 1.2 + R() * 1.4); } x += l + 14 + R() * 40; }
  for (const off of [-17, 19]) for (let x = 0; x < GW;) { const l = 60 + R() * 140; g.globalAlpha = 0.1 + R() * 0.09; g.beginPath(); for (let xx = x; xx <= x + l; xx += 12) { const yy = ry(xx) + off; if (xx === x) g.moveTo(xx, yy); else g.lineTo(xx, yy); } st(g, T.fiber, 2.4); x += l + 20 + R() * 70; }
  // 붓질 자국
  for (let i = 0; i < 46; i++) { const x = R() * GW, y = 150 + R() * 500, l = 90 + R() * 200, col = pick(T.wash), a = 0.1 + R() * 0.1, w = [0, 1, 2, 3, 4].map(() => [(R() - 0.5) * 16, 0.8 + R() * 0.2, (R() - 0.5) * 6, 1.6 + R() * 1.8]); wrap(x, 320, xx => { g.globalAlpha = a; w.forEach((q, n) => { g.beginPath(); g.moveTo(xx, y + n * 3.2); g.quadraticCurveTo(xx + l * 0.5, y + n * 3.2 + q[0], xx + l * q[1], y + n * 3.2 + q[2]); st(g, col, q[3]); }); }); }
  g.globalAlpha = 1;
  // 한지 섬유
  for (let i = 0; i < 3600; i++) { const x = R() * GW, y = TOP + R() * (H - TOP), a = R() * TAU, l = 4 + R() * 10; g.globalAlpha = 0.15; g.strokeStyle = R() < 0.5 ? T.fiber : '#ffffff'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  // 태점: 먹을 찍어 놓은 듯한 풀 그늘
  for (let i = 0; i < 64; i++) { const x = 20 + R() * (GW - 40), y = 140 + R() * 420; g.globalAlpha = 0.13 + R() * 0.12; for (let j = 0; j < 5; j++) ell(g, x + (R() - 0.5) * 24, y + (R() - 0.5) * 8, 1.6 + R() * 1.6, 0.9 + R() * 0.7, T.pineD, null, 0, -0.3); }
  g.globalAlpha = 1;
  // 길 위의 잔돌, 풀포기, 들꽃
  for (let x = 30; x < GW - 20; x += 60 + R() * 60) { const y = ry(x) + (R() - 0.5) * 90; g.globalAlpha = 0.7; stone(g, x, y, 2.4 + R() * 3, 1.6 + R() * 1.6, pick(T.stone), 0.8); } g.globalAlpha = 1;
  for (let i = 0; i < 190; i++) { const x = 14 + R() * (GW - 28), y = 140 + R() * 420, s = 0.7 + R() * 0.5; if (onRoad(x, y) && R() < 0.8) continue; grassTuft(g, x, y, s, pick([T.tuft, T.tuft, T.pine]), R); }
  for (let i = 0; i < 70; i++) {
    const x0 = 14 + R() * (GW - 28), y0 = 150 + R() * 400, col = pick(T.flower), n = 1 + ((R() * 3) | 0); if (onRoad(x0, y0)) continue;
    for (let j = 0; j < n; j++) { const x = x0 + (R() - 0.5) * 18, y = y0 + (R() - 0.5) * 9; line(g, [x, y + 6, x + 0.6, y], T.tuft, 1); ell(g, x - 2.2, y + 4, 2.2, 0.9, T.tuft, null, 0, 0.5); for (let q = 0; q < 5; q++) { const a = q / 5 * TAU - 0.3; ell(g, x + Math.cos(a) * 2.3, y + Math.sin(a) * 2.3, 1.6, 1.6, col, rgba(INK, 0.45), 0.5); } ell(g, x, y, 1.1, 1.1, OCHRE); }
  }
  for (let i = 0; i < 70; i++) { const x = 14 + R() * (GW - 28), y = 140 + R() * 420, rx = 2.6 + R() * 4, ry2 = 1.8 + R() * 2.2; g.globalAlpha = 0.14; ell(g, x + 1.4, y + 1.6, rx, ry2 * 0.8, INK); g.globalAlpha = 0.88; stone(g, x, y, rx, ry2, pick(T.stone), 0.8); }
  for (let i = 0; i < 150; i++) { g.globalAlpha = 0.1 + R() * 0.12; ell(g, R() * GW, 130 + R() * 560, 0.8 + R() * 2, 0.8 + R() * 1.6, INK); }
  // 위쪽 가장자리: 안개에 잠긴 먼 솔숲, 그 앞의 소나무·바위·덤불
  for (let x = 34; x < GW - 34; x += 56 + R() * 60) { g.globalAlpha = 0.42 + R() * 0.16; pine(g, x, 111 + R() * 5, 0.5 + R() * 0.14, T, R() < 0.5); }
  g.globalAlpha = 1;
  const mist = g.createLinearGradient(0, 88, 0, 132); mist.addColorStop(0, rgba(T.paper, 0)); mist.addColorStop(0.62, rgba(T.paper, 0.66)); mist.addColorStop(1, rgba(T.paper, 0)); g.fillStyle = mist; g.fillRect(0, 88, GW, 44);
  const items = []; for (let x = 70, n = 0; x < GW - 60; x += 105 + R() * 105, n++) { const r = R(); items.push({ x, y: 124 + R() * 9, kind: T.mark && n % 3 === 1 ? T.mark : r < 0.2 ? 'rock' : r < 0.38 ? 'bush' : 'pine', s: 0.8 + R() * 0.3, f: R() < 0.5, r: 13 + R() * 10 }); }
  items.sort((a, b) => a.y - b.y);
  for (const it of items) {
    g.globalAlpha = 0.15; ell(g, it.x + 5, it.y + 1.5, it.kind === 'pine' ? 24 * it.s : it.r * 1.25, it.kind === 'pine' ? 4.6 : 3.6, INK); g.globalAlpha = 1;
    if (it.kind === 'pine') pine(g, it.x, it.y, it.s, T, it.f); else if (it.kind === 'bush') bush(g, it.x, it.y, 0.9 + it.s * 0.5, T); else if (LANDMARK[it.kind]) { g.save(); g.translate(it.x, it.y + 2); g.scale(it.s * (it.f ? -1.25 : 1.25), it.s * 1.25); LANDMARK[it.kind](g, it.r > 18); g.restore(); } else boulder(g, it.x, it.y - it.r * 0.3, it.r, T);
    grassTuft(g, it.x + (it.f ? 12 : -12), it.y + 3, 0.8, T.tuft, R);
  }
  // 아래쪽 가장자리: 패 놓는 자리 위로 고개를 내민 풀과 덤불
  for (let x = 40; x < GW - 40; x += 70 + R() * 120) { const r = R(), y = 566 + R() * 9; if (r < 0.3) bush(g, x, y, 1.1 + R() * 0.4, T); else if (r < 0.44) boulder(g, x, y - 3, 9 + R() * 6, T); else grassTuft(g, x, y, 1.5 + R() * 0.6, pick([T.tuft, T.pine]), R); }
  return c;
}
// 먼 산: 바닥보다 천천히 흐른다. 능선은 짙고 산허리는 안개에 풀린다
export function makeFar(themeId, seed = 7) {
  const T = THEMES[themeId] || THEMES.pass, S = 1.25, c = makeCanvas(FW * S, FAR_H * S), g = c.getContext('2d'); g.scale(S, S);
  const R = rng(seed * 331 + 5), k = TAU / FW, haze = lt(T.sky, 0.45);
  const sk = g.createLinearGradient(0, 56, 0, FAR_H); sk.addColorStop(0, T.sky); sk.addColorStop(1, haze); g.fillStyle = sk; g.fillRect(0, 0, FW, FAR_H);
  const glow = (x, y, r, col, a) => { const gr = g.createRadialGradient(x, y, r * 0.3, x, y, r); gr.addColorStop(0, rgba(col, a)); gr.addColorStop(1, rgba(col, 0)); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); };
  if (T.night) {
    for (let i = 0; i < 90; i++) { g.globalAlpha = 0.4 + R() * 0.5; ell(g, R() * FW, 60 + R() * 50, 0.8 + R() * 1.2, 0.8 + R() * 1.2, '#f4efdc'); } g.globalAlpha = 1;
    glow(1300, 86, 76, '#f4efdc', 0.42); part(g, E(1300, 86, 21, 21), '#f4efdc', E(1309, 93, 21, 21), { shc: '#dcd8c6', line: rgba(INK, 0.55), lw: 1.2 }); g.globalAlpha = 0.22; for (const [x, y, r] of [[1292, 80, 4], [1304, 90, 3], [1296, 94, 2.2]]) ell(g, x, y, r, r * 0.8, '#b9b6a8'); g.globalAlpha = 1;
  } else if (!T.noSun) { glow(1340, 88, 70, '#e8b04a', 0.3); ell(g, 1340, 88, 21, 21, '#efc46a'); g.globalAlpha = 0.45; ell(g, 1334, 82, 12, 9, '#fbe6b0', null, 0, -0.5); g.globalAlpha = 1; }
  // 구름
  const cloud = (x, y, w) => { const h = w * 0.16; path(g, p => { p.moveTo(x - w / 2, y); p.quadraticCurveTo(x - w * 0.5, y - h * 0.9, x - w * 0.28, y - h * 0.8); p.quadraticCurveTo(x - w * 0.2, y - h * 1.9, x + w * 0.02, y - h * 1.3); p.quadraticCurveTo(x + w * 0.16, y - h * 1.8, x + w * 0.26, y - h * 0.9); p.quadraticCurveTo(x + w * 0.5, y - h, x + w / 2, y); p.closePath(); }, T.night ? 'rgba(214,220,236,0.42)' : 'rgba(255,252,242,0.82)', rgba(INK, 0.16), 1); line(g, [x - w * 0.3, y - h * 0.36, x + w * 0.2, y - h * 0.36], rgba(INK, 0.1), 0.8); };
  for (let i = 0; i < 7; i++) { const x = R() * FW, y = 78 + R() * 14, w = 70 + R() * 80; for (const xx of [x, x - FW, x + FW]) cloud(xx, y, w); }
  if (!T.night) for (let i = 0; i < 3; i++) { const x0 = 100 + R() * (FW - 200), y0 = 72 + R() * 10; for (let j = 0; j < 3; j++) { const x = x0 + j * 13 + R() * 4, y = y0 + (j % 2) * 5; curve(g, p => { p.moveTo(x - 3.4, y - 1.4); p.quadraticCurveTo(x - 1.4, y - 2.4, x, y); p.quadraticCurveTo(x + 1.4, y - 2.4, x + 3.4, y - 1.4); }, rgba(INK, 0.5), 0.9); } }
  [[lt(T.mtn[0], 0.4), 104, 30, 2, 0.62], [T.mtn[0], 114, 40, 3, 0.8], [T.mtn[1], 130, 32, 5, 0.95]].forEach(([col, yb, amp, fq, a], n) => {
    const f = x => yb - Math.abs(Math.sin(x * k * fq + n * 1.7 + seed)) * amp - Math.max(0, Math.sin(x * k * (fq * 2 + 1) + n * 2.3)) * amp * 0.3 - Math.sin(x * k * 11 + n) * 4;
    const shape = () => { g.beginPath(); g.moveTo(0, FAR_H); for (let x = 0; x <= FW; x += 8) g.lineTo(x, f(x)); g.lineTo(FW, FAR_H); g.closePath(); };
    const gr = g.createLinearGradient(0, yb - amp * 1.3, 0, yb + 14); gr.addColorStop(0, rgba(dk(col, 0.12), a)); gr.addColorStop(0.55, rgba(col, a * 0.92)); gr.addColorStop(1, rgba(lt(col, 0.5), a * 0.55));
    shape(); g.fillStyle = gr; g.fill();
    // 산주름
    g.save(); shape(); g.clip(); g.globalAlpha = 0.16; const cd = dk(col, 0.42);
    for (let x = 0; x < FW; x += 14 + R() * 18) { const y = f(x); line(g, [x, y + 2, x - 4 - R() * 6, y + 12 + R() * 12], cd, 1); if (R() < 0.5) line(g, [x + 3, y + 3, x + 8 + R() * 5, y + 12 + R() * 10], cd, 0.8); }
    g.restore();
    // 능선에 선 솔
    if (n) { g.globalAlpha = 0.3 + n * 0.1; for (let x = 6; x < FW - 4; x += 9 + R() * 16) { const y = f(x), h = 3 + R() * 3; line(g, [x, y + 1, x, y - h], cd, 0.9); ell(g, x, y - h, 2.2 + R() * 1.4, 1.2, cd); } }
    g.globalAlpha = 0.3; g.beginPath(); for (let x = 0; x <= FW; x += 8) { if (x) g.lineTo(x, f(x)); else g.moveTo(x, f(x)); } st(g, INK, 1.1); g.globalAlpha = 1;
    const m = g.createLinearGradient(0, yb - 8, 0, yb + 18); m.addColorStop(0, rgba(haze, 0)); m.addColorStop(1, rgba(haze, 0.75)); g.fillStyle = m; g.fillRect(0, yb - 8, FW, 26);
  });
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
const WOOD = '#a9753f', WOODD = '#7a4a2c', STRAW = '#dcb64e', WHITE = '#fbf7ec', BRASS = '#d9a441', BONE = '#f3e7c8', GREY = ['#b9b3a2', '#a59f8f'];
const SR = () => rng(31);
const post = (g, x, h, lw = 3.4) => { line(g, [x, 0, x, -h], INK, lw + 1.6); line(g, [x, 0, x, -h], WOOD, lw); line(g, [x - lw * 0.22, -2, x - lw * 0.22, -h + 2], lt(WOOD, 0.36), lw * 0.28); };
const jar = (g, x, y, s, col) => { part(g, p => { p.moveTo(x - 3.4 * s, y - 15 * s); p.bezierCurveTo(x - 8.6 * s, y - 13 * s, x - 7.6 * s, y - s, x - 4 * s, y); p.lineTo(x + 4 * s, y); p.bezierCurveTo(x + 7.6 * s, y - s, x + 8.6 * s, y - 13 * s, x + 3.4 * s, y - 15 * s); p.closePath(); }, col, RC(x + 1.4 * s, y - 16 * s, 8 * s, 17 * s), { k: 0.28, hi: E(x - 3.7 * s, y - 9 * s, 1.1 * s, 3.6 * s), lw: 1.1 }); part(g, E(x, y - 15.4 * s, 4.4 * s, 1.5 * s), dk(col, 0.12), null, { lw: 1 }); };
const glint = (g, x, y, r) => { line(g, [x - r, y, x + r, y], BRASS, 1.5); line(g, [x, y - r, x, y + r], BRASS, 1.5); ell(g, x, y, r * 0.32, r * 0.32, '#fff6d0'); };
const STOPS = {
  rest(g) { // 주막: 초가지붕 아래 띠살문, 장대 끝에 매단 용수
    part(g, RC(-42, -6, 84, 6), GREY[0], RC(-42, -3, 84, 3), { lw: 1.1 }); for (const x of [-22, 4, 26]) line(g, [x, -6, x, 0], rgba(INK, 0.5), 0.8);
    part(g, RC(-40, -40, 80, 34), '#efe2c4', RC(-40, -40, 80, 9), { k: 0.24, lw: 1.5 });
    for (const x of [-40, -8, 36]) part(g, RC(x, -40, 4, 34), WOODD, RC(x + 2.2, -40, 1.8, 34), { lw: 0.9 });
    part(g, RC(-31, -33, 19, 27), '#fbf4e2', RC(-31, -33, 19, 4.5), { k: 0.16, line: WOODD, lw: 1.2 }); for (let x = -27.2; x < -13; x += 3.8) line(g, [x, -33, x, -6], WOODD, 0.6); for (const y of [-28, -26, -20.5, -18.5, -13, -11]) line(g, [-31, y, -12, y], WOODD, 0.6);
    part(g, RC(2, -31, 28, 15), '#fbf4e2', RC(2, -31, 28, 3.6), { k: 0.16, line: WOODD, lw: 1.2 }); for (let x = 6; x < 30; x += 4) line(g, [x, -31, x, -16], WOODD, 0.6); line(g, [2, -23.5, 30, -23.5], WOODD, 0.6);
    const roof = p => { p.moveTo(-54, -37); p.quadraticCurveTo(-32, -72, 0, -76); p.quadraticCurveTo(32, -72, 54, -37); p.quadraticCurveTo(28, -44, 0, -44); p.quadraticCurveTo(-28, -44, -54, -37); p.closePath(); };
    part(g, roof, STRAW, p => { p.moveTo(-60, -34); p.quadraticCurveTo(0, -60, 60, -34); p.lineTo(60, -30); p.lineTo(-60, -30); p.closePath(); }, { shc: '#b98f3a', hi: p => { p.moveTo(-32, -60); p.quadraticCurveTo(-12, -75, 12, -74.6); p.quadraticCurveTo(-10, -70, -30, -57); p.closePath(); }, lw: 1.6 });
    for (let i = -5; i <= 5; i++) curve(g, p => { p.moveTo(i * 6, -74 + Math.abs(i) * 2.2); p.quadraticCurveTo(i * 8.6, -60, i * 10.2, -42 - (5 - Math.abs(i)) * 0.4); }, '#a8843c', 0.8);
    rope(g, p => { p.moveTo(-22, -70.4); p.quadraticCurveTo(0, -80, 22, -70.4); }, '#e9cc78', 2.2); for (let x = -18; x <= 18; x += 6) line(g, [x - 1, -74.6 + Math.abs(x) * 0.16, x + 1, -72.2 + Math.abs(x) * 0.16], '#a8843c', 0.7);
    post(g, 56, 62, 2.6); line(g, [56, -60, 71, -60], INK, 2.6); line(g, [56, -60, 71, -60], WOODD, 1.2);
    // 용수: 대나무로 엮은 술거르개를 장대 끝에 거꾸로 매단다 (주막의 표식)
    line(g, [70, -60, 70, -55], INK, 1.3);
    const yong = p => { p.moveTo(64.6, -53.6); p.quadraticCurveTo(70, -57.8, 75.4, -53.6); p.lineTo(77.2, -35.6); p.quadraticCurveTo(70, -33.4, 62.8, -35.6); p.closePath(); };
    part(g, yong, '#d9b46a', RC(71, -58, 8, 25), { k: 0.24, hi: P(64.8, -51.6, 66.6, -52.6, 65.8, -37, 64, -37), hk: 0.25, lw: 1.3 });
    g.save(); g.beginPath(); yong(g); g.clip(); for (let i = -7; i < 8; i++) { line(g, [62 + i * 2.8, -58, 69 + i * 2.8, -32], '#a8843c', 0.6); line(g, [78 - i * 2.8, -58, 71 - i * 2.8, -32], '#a8843c', 0.6); } g.restore();
    for (const y of [-48, -41]) { const w2 = 5.6 + (y + 54) * 0.1; curve(g, p => { p.moveTo(70 - w2, y); p.quadraticCurveTo(70, y + 1.8, 70 + w2, y); }, '#8a6a3c', 1.4); }
    ell(g, 70, -35.4, 7.2, 1.7, '#6a4a2c', INK, 1);
    jar(g, -52, 0, 1, '#6b4a3a'); jar(g, -41.4, 1, 0.76, '#8a6248'); grassTuft(g, 44, 1, 0.7, TEAL, SR());
  },
  shop(g) { // 장터 좌판: 줄무늬 차일 아래 늘어놓은 물건
    post(g, -40, 62, 2.6); post(g, 40, 62, 2.6);
    const top = P(-50, -62, 50, -62, 57, -42, -57, -42);
    g.beginPath(); top(g); g.fillStyle = WHITE; g.fill(); g.save(); g.clip(); for (let i = 0; i < 6; i += 2) poly(g, [-50 + i * 16.7, -62, -50 + (i + 1) * 16.7, -62, -57 + (i + 1) * 19, -42, -57 + i * 19, -42], '#b8742a'); g.fillStyle = 'rgba(40,24,30,0.17)'; g.fillRect(-60, -47.6, 120, 6); g.fillStyle = 'rgba(255,246,222,0.3)'; g.fillRect(-60, -62, 120, 3.6); g.restore(); g.beginPath(); top(g); st(g, INK, 1.5);
    for (let i = 0; i < 6; i++) { const x = -57 + i * 19, col = i % 2 ? WHITE : '#b8742a'; part(g, p => { p.moveTo(x, -42); p.quadraticCurveTo(x + 9.5, -30, x + 19, -42); p.closePath(); }, col, RC(x + 10.6, -42, 9, 12), { k: 0.18, lw: 1 }); }
    part(g, RC(-46, -23, 92, 8), WOOD, RC(-46, -18.6, 92, 4), { hi: RC(-46, -23, 92, 1.5), lw: 1.3 }); for (const x of [-38, 33]) part(g, RC(x, -15, 5, 15), WOODD, RC(x + 2.6, -15, 2.4, 15), { lw: 1 }); line(g, [-33, -5, 33, -5], INK, 3); line(g, [-33, -5, 33, -5], WOODD, 1.6);
    jar(g, -31, -23, 0.76, '#6b4a3a');
    for (const [x, c] of [[-17, INDIGO], [-10, RED], [-3, '#3f8a6a']]) { part(g, RC(x, -35, 6, 12), c, RC(x + 3.2, -35, 2.8, 12), { lw: 1 }); ell(g, x + 3, -35, 3, 1.3, lt(c, 0.34), INK, 0.7); }
    for (const [x, y] of [[20, -29.4], [26.4, -29.8], [23.2, -33]]) part(g, E(x, y, 3.3, 3.3), '#d9553f', E(x + 1.5, y + 1.5, 3, 3), { hi: E(x - 1, y - 1.2, 0.9, 0.6), lw: 0.8 });
    part(g, P(13, -28.4, 33.6, -28.4, 31, -23, 15.6, -23), '#d9b77a', RC(24, -29, 11, 7), { lw: 1 }); for (let x = 17; x < 31; x += 3.4) line(g, [x, -27.8, x - 0.5, -23.4], '#a8843c', 0.6);
    line(g, [8, -42, 8, -36], INK, 0.8); for (let y = -35; y < -25; y += 2.6) ell(g, 8, y, 2.6, 1.3, BRASS, INK, 0.6);
  },
  event(g) { // 서낭당: 오색 천을 두른 당산나무와 돌무더기
    const bark = '#7a5a40';
    part(g, p => { p.moveTo(12, 0); p.bezierCurveTo(19, -22, 13, -40, 20, -62); p.lineTo(29, -62); p.bezierCurveTo(27, -40, 35, -22, 36, 0); p.closePath(); }, bark, p => { p.moveTo(25, 2); p.bezierCurveTo(26, -22, 22, -40, 26, -64); p.lineTo(40, -64); p.lineTo(40, 2); p.closePath(); }, { k: 0.3, lw: 1.5 });
    for (const y of [-12, -25, -50]) curve(g, p => { p.moveTo(18, y); p.quadraticCurveTo(22, y - 3, 25, y + 1); }, dk(bark, 0.45), 0.8);
    rope(g, p => { p.moveTo(22, -56); p.quadraticCurveTo(10, -62, 4, -68); }, bark, 2.4); rope(g, p => { p.moveTo(27, -58); p.quadraticCurveTo(38, -66, 46, -70); }, bark, 2.2);
    for (const [x, y, rx] of [[2, -71, 20], [46, -75, 19], [24, -85, 24], [9, -94, 16], [38, -96, 15]]) clump(g, x, y, rx, rx * 0.6, TEAL, dk(TEAL, 0.3), lt(TEAL, 0.32));
    rope(g, p => { p.moveTo(16.4, -37); p.quadraticCurveTo(24, -32, 31.6, -38); }, '#e3c890', 2);
    [[RED, 17.5, 16, -0.25], [OCHRE, 21, 19, -0.1], [WHITE, 24.5, 17, 0.05], [INDIGO, 28, 20, 0.16], ['#3f8a6a', 31, 15, 0.3]].forEach(([c, x, l, a]) => { g.save(); g.translate(x, -35); g.rotate(a); part(g, p => { p.moveTo(-1.7, 0); p.lineTo(1.7, 0); p.quadraticCurveTo(2.6, l * 0.5, 1.2, l); p.lineTo(-2, l - 1.4); p.quadraticCurveTo(-0.8, l * 0.5, -1.7, 0); p.closePath(); }, c, RC(0.2, 0, 3, l + 1), { lw: 0.8 }); g.restore(); });
    [[-24, -5, 21, 7.6, 0], [-6, -4, 15, 6.6, 1], [-27, -15, 15, 6.6, 1], [-12, -14, 13, 6, 0], [-21, -24, 11, 5.6, 1], [-20, -32, 7.4, 4.6, 0], [-20, -39, 4.6, 3.4, 1]].forEach(([x, y, rx, ry, n]) => stone(g, x, y, rx, ry, GREY[n]));
    grassTuft(g, 42, 1, 0.8, TEAL, SR());
  },
  treasure(g) { // 보물 함: 놋쇠 장석을 댄 반닫이. 물고기 자물쇠에 붉은 술을 달았다
    const gem = (x, y, r) => part(g, P(x, y - r, x + r * 0.62, y, x, y + r, x - r * 0.62, y), '#f0d264', null, { lw: 0.8 });
    for (const x of [-22, 22]) part(g, RC(x - 4.4, -3.4, 8.8, 3.4), dk(WOODD, 0.25), null, { lw: 1 });
    part(g, RC(-28, -30, 56, 27), WOODD, RC(0, -30, 28, 27), { k: 0.18, lw: 1.5 });
    for (const y of [-21, -12.4]) line(g, [-27, y, 27, y + 0.5], dk(WOODD, 0.28), 0.6);
    part(g, RC(-30.4, -37.4, 60.8, 8.4), WOOD, RC(0, -37.4, 30.4, 8.4), { k: 0.2, hi: RC(-30.4, -37.4, 60.8, 1.8), lw: 1.5 });
    // 귀장식과 경첩
    for (const s of [-1, 1]) { part(g, P(s * 28, -29, s * 17.6, -29, s * 28, -19.6), BRASS, null, { lw: 0.9 }); part(g, P(s * 28, -3, s * 17.6, -3, s * 28, -12.4), BRASS, null, { lw: 0.9 }); ell(g, s * 25, -26.4, 0.9, 0.9, dk(BRASS, 0.45)); ell(g, s * 25, -5.6, 0.9, 0.9, dk(BRASS, 0.45)); }
    for (const x of [-15, 15]) { part(g, RC(x - 2.5, -36.6, 5, 14), BRASS, RC(x, -36.6, 2.5, 14), { lw: 0.9 }); for (const y of [-33.6, -26]) ell(g, x, y, 0.85, 0.85, dk(BRASS, 0.45)); }
    // 앞바탕과 물고기 자물쇠
    part(g, E(0, -20, 7.8, 7.8), BRASS, E(1.8, -18.8, 5.8, 5.8), { lw: 1.1 });
    part(g, p => { p.moveTo(-5.4, -20); p.quadraticCurveTo(-1.2, -24.6, 3, -20); p.quadraticCurveTo(-1.2, -15.4, -5.4, -20); p.closePath(); }, '#e6b93e', null, { lw: 0.9 }); part(g, P(2.6, -20, 6.2, -23.2, 6.2, -16.8), '#e6b93e', null, { lw: 0.9 }); ell(g, -2.8, -20.7, 0.65, 0.65, INK);
    // 자물쇠에 단 붉은 술
    line(g, [6.2, -20, 8.4, -14], INK, 1.6); line(g, [6.2, -20, 8.4, -14], RED, 0.9); part(g, P(6.8, -14.4, 10.2, -14.4, 10.8, -6.4, 6.2, -6.4), RED, null, { lw: 0.9 });
    gem(-37, -46, 3.6); gem(36, -52, 3); gem(20, -60, 2.4);
  },
  fork(g) { // 갈림길 푯말
    post(g, 0, 72, 3.4); part(g, P(-3.6, -72, 0, -78.4, 3.6, -72), WOODD, null, { lw: 1 });
    const board = (pts, col, y0, sgn) => { part(g, P(...pts), col, RC(-46, y0 + 14.4, 92, 6), { k: 0.2, hi: RC(-46, y0, 92, 1.7), lw: 1.4 }); for (const x of [8, 16, 23]) line(g, [sgn * x - 1.6, y0 + 9.5, sgn * x + 1.6, y0 + 9.5], INK, 1.5); line(g, [sgn * 28, y0 + 9.5, sgn * 34, y0 + 9.5], INK, 1.3); line(g, [sgn * 31.4, y0 + 7, sgn * 34, y0 + 9.5, sgn * 31.4, y0 + 12], INK, 1.3); ell(g, -sgn * 1.4, y0 + 9.5, 1.1, 1.1, '#5a5a66', INK, 0.5); };
    board([-5, -67, 30, -67, 41, -57.5, 30, -48, -5, -48], '#e3c890', -67, 1); board([5, -43, -30, -43, -41, -33.5, -30, -24, 5, -24], '#d9b77a', -43, -1);
    stone(g, 9, -1.6, 6.4, 3.4, GREY[1], 1.1); const R = SR(); grassTuft(g, -11, 1, 0.9, TEAL, R); grassTuft(g, 16, 2, 0.7, TEAL, R);
  },
  boss(g) { // 두목의 깃대: 찢긴 붉은 기와 귀면
    post(g, 0, 98, 3.6); part(g, P(-3.4, -98, 0, -109, 3.4, -98), BONE, P(0, -109, 3.6, -98, 0, -98), { lw: 1 });
    const col = '#8a2420';
    part(g, P(0, -94, 46, -90, 38, -78, 48, -66, 36, -56, 44, -44, 0, -40), col, P(0, -60, 50, -58, 50, -38, 0, -38), { k: 0.3, hi: P(0, -94, 46, -90, 44, -87, 0, -90.4), hk: 0.22, lw: 1.5 });
    for (const x of [13, 31]) curve(g, p => { p.moveTo(x, -91.6); p.quadraticCurveTo(x - 3, -66, x + 1, -42.6); }, dk(col, 0.42), 0.8);
    symbol(g, 'boss', 22, -67, 24, BONE);   // 깃발의 귀면
    part(g, p => { p.moveTo(-3, -97); p.quadraticCurveTo(-9, -92, -6.4, -84); p.lineTo(-1, -85.4); p.quadraticCurveTo(-0.4, -92, 0, -97); p.closePath(); }, RED, null, { lw: 0.9 });
    stone(g, -16, -4, 14, 6, '#8e939e', 1.2); stone(g, 12, -3, 12, 5, '#a9adb6', 1.2); stone(g, -4, -10, 9, 5, '#8e939e', 1.2);
  },
  battle(g, elite) { // 요괴가 꽂아 둔 깃대
    post(g, 0, 66, 2.8); part(g, P(-2.6, -66, 0, -73, 2.6, -66), BONE, null, { lw: 0.9 });
    const col = elite ? '#b8322a' : '#d98a3e';
    part(g, P(0, -63, 31, -59, 23, -51, 32, -43, 0, -39), col, P(0, -50, 34, -50, 34, -38, 0, -38), { k: 0.26, hi: P(0, -63, 31, -59, 29.4, -57, 0, -60.4), hk: 0.24, lw: 1.3 });
    curve(g, p => { p.moveTo(12, -60.6); p.quadraticCurveTo(10, -50, 13, -41.2); }, dk(col, 0.42), 0.7);
    symbol(g, elite ? 'elite' : 'battle', 13, -51, 15, BONE);   // 깃발의 표
    stone(g, -10, -3, 10, 4.6, GREY[1], 1.1); stone(g, 9, -2.6, 8, 4.2, GREY[0], 1.1);
  },
  elite(g) { STOPS.battle(g, true); },
};
const scache = new Map();
export function stopSprite(kind) {
  let s = scache.get(kind); if (s) return s;
  s = paperSprite(STOPS[kind] || STOPS.battle, { w: 176, h: 138, ox: 88, oy: 122, bw: 2.4 });
  scache.set(kind, s); return s;
}

// ── 싸움터의 지형: 종이 무대 장치처럼 세워진다 (원점 = 밑동 가운데) ──
const ocache = new Map();
export function obstacleSprite(o, themeId) {
  const T = THEMES[themeId] || THEMES.pass, key = themeId + ':' + o.kind + ':' + (o.h || o.r || 0) + ':' + (o.v || 0);
  let s = ocache.get(key); if (s) return s;
  const R = rng((o.v || 1) * 131 + (o.h || o.r || 3));
  if (o.kind === 'wall') s = paperSprite(g => { // 돌담: 엇갈려 쌓은 돌
    for (let y = -6, r = 0; y > -o.h - 4; y -= 11.5, r++) for (const dx of r % 2 ? [-9.6, 4] : [-4, 9.6]) stone(g, dx + (R() - 0.5) * 2.4, y, 9.8 + R() * 2.2, 7.3, T.stone[(R() * 2) | 0]);
    stone(g, 0, -o.h - 5, 12, 7.4, T.stone[0]); ell(g, -9, -1.4, 7, 2.6, T.pine, INK, 0.9); grassTuft(g, 10, 1, 0.7, T.tuft, R);
  }, { w: 70, h: o.h + 50, ox: 35, oy: o.h + 34, bw: 2 });
  else if (o.kind === 'barricade') s = paperSprite(g => { // 목책: 엇갈려 박은 통나무
    line(g, [0, -4, 0, -o.h], INK, 3.6); line(g, [0, -4, 0, -o.h], '#d9b77a', 2);
    for (let y = -2, i = 0; y > -o.h; y -= 12, i++) { g.save(); g.translate(0, y); g.rotate(i % 2 ? 0.2 : -0.2); part(g, P(-3.6, 2, -3.6, -21, 0, -30, 3.6, -21, 3.6, 2), '#b98a55', P(0.6, -31, 4.4, -31, 4.4, 3, 0.6, 3), { k: 0.26, hi: P(-2.9, -20, -1.7, -21.6, -1.7, 0, -2.9, 0), hk: 0.26, lw: 1.2 }); poly(g, [-1.5, -25.2, 0, -29.4, 1.5, -25.2], '#ecd9a8'); for (const yy of [-7, -13]) line(g, [-3.6, yy, 3.6, yy + 0.8], '#e9d9b0', 1.1); g.restore(); }
  }, { w: 60, h: o.h + 60, ox: 30, oy: o.h + 44, bw: 2 });
  else if (o.kind === 'rock') s = paperSprite(g => { const r = o.r; boulder(g, 0, 0, r, T); ell(g, -r * 0.56, r * 0.28, r * 0.34, r * 0.15, T.pine, INK, 1); g.globalAlpha = 0.8; ell(g, -r * 0.5, -r * 0.86, r * 0.2, r * 0.09, T.pineL, null, 0, -0.7); g.globalAlpha = 1; grassTuft(g, r * 0.66, r * 0.4, 0.5 + r * 0.02, T.tuft, R); }, { w: o.r * 2 + 30, h: o.r * 2.4 + 26, ox: o.r + 14, oy: o.r * 1.5 + 13, bw: 2 });
  else if (o.kind === 'tree') s = paperSprite(g => { pine(g, 0, 8, 1.05, T); grassTuft(g, -9, 9, 0.7, T.tuft, R); }, { w: 104, h: 126, ox: 52, oy: 108, bw: 2 });
  else if (o.kind === 'pillar') s = paperSprite(g => { for (let i = 0; i < 5; i++) stone(g, (R() - 0.5) * 2, 4 - i * 12, 21 - i * 3.5, 8.4 - i * 0.8, T.stone[i % 2], 1.4); }, { w: 64, h: 84, ox: 32, oy: 66, bw: 2 });
  else s = paperSprite(() => {}, { w: 8, h: 8, ox: 4, oy: 4, border: null, shadow: false });
  ocache.set(key, s); return s;
}
// 장애물이 서는 자리 (y 정렬과 그리기에 쓴다)
export const obstacleBase = o => o.w ? { x: o.x + o.w / 2, y: o.y + o.h } : { x: o.x, y: o.y + (o.kind === 'tree' ? 0 : o.r * 0.5) };
// 개울과 다리, 여울의 디딤돌 (바닥에 깔린다)
const RIV = {};
export function drawRiver(g, ter, themeId, T, k) {
  const C = THEMES[themeId] || THEMES.pass, rv = ter.river; if (!rv) return;
  const q = RIV[themeId] || (RIV[themeId] = (w => ({ water: w, deep: dk(w, 0.3), pale: lt(w, 0.5), bank: rgba(dk(C.wash[0], 0.35), 0.4) }))(C.night ? '#7f94ba' : themeId === 'grove' ? '#8fb9bf' : '#9cc0cf'));
  const y0 = 96, y1 = 566, lx = y => rv.x + Math.sin(y * 0.04) * 4, rx = y => rv.x + rv.w + Math.sin(y * 0.035 + 2) * 4;
  const band = d => { g.beginPath(); g.moveTo(lx(y0) - d, y0); for (let y = y0; y <= y1; y += 30) g.lineTo(lx(y) - d, y); for (let y = y1; y >= y0; y -= 30) g.lineTo(rx(y) + d, y); g.closePath(); };
  g.save(); g.globalAlpha = k;
  band(6); g.fillStyle = q.bank; g.fill();
  const gr = g.createLinearGradient(rv.x, 0, rv.x + rv.w, 0); gr.addColorStop(0, q.pale); gr.addColorStop(0.28, q.water); gr.addColorStop(0.72, q.water); gr.addColorStop(1, q.deep);
  band(0); g.fillStyle = gr; g.fill(); st(g, INK, 1.8);
  g.save(); band(0); g.clip();
  g.beginPath(); for (let y = y0; y <= y1; y += 30) g[y === y0 ? 'moveTo' : 'lineTo'](lx(y) + 5, y); st(g, 'rgba(255,255,255,0.5)', 1.6);
  g.beginPath(); for (let y = y0; y <= y1; y += 30) g[y === y0 ? 'moveTo' : 'lineTo'](rx(y) - 5, y); st(g, 'rgba(30,40,70,0.2)', 2.2);
  for (let i = 0; i < 22; i++) { const y = y0 + ((i * 47 + T * 26) % (y1 - y0)), x = rv.x + 8 + ((i * 31) % (rv.w - 22)); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 5, y + 6, x, y + 13); st(g, i % 3 ? q.deep : 'rgba(255,255,255,0.7)', i % 3 ? 1.3 : 1.1); }
  g.restore();
  for (const b of ter.bridges || []) {
    g.fillStyle = 'rgba(30,40,60,0.2)'; g.fillRect(b.x + 2, b.y + b.h - 5, b.w - 4, 7);
    part(g, p => rrPath(p, b.x - 5, b.y + 8, b.w + 10, b.h - 16, 3), '#a57a4c', RC(b.x - 6, b.y + b.h * 0.6, b.w + 12, b.h), { k: 0.14, lw: 1.6 });
    for (let x = b.x + 3, i = 0; x < b.x + b.w; x += 11, i++) { line(g, [x, b.y + 10, x, b.y + b.h - 10], '#6f4c2c', 1.1); if (i % 2) { g.fillStyle = 'rgba(255,240,210,0.13)'; g.fillRect(x, b.y + 10, 11, b.h - 20); } }
    for (const yy of [b.y + 3, b.y + b.h - 10]) { part(g, p => rrPath(p, b.x - 9, yy, b.w + 18, 7, 3), '#7a5a40', RC(b.x - 9, yy + 3.6, b.w + 18, 4), { hi: RC(b.x - 6, yy + 1, b.w + 12, 1.2), hk: 0.26, lw: 1.4 }); for (const xx of [b.x - 8, b.x + b.w + 2]) part(g, p => rrPath(p, xx, yy - 2.5, 6, 12, 2), '#5f4430', RC(xx + 3, yy - 2.5, 3, 12), { lw: 1.2 }); }
  }
  for (const f of ter.slow || []) for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { const x = f.x + 14 + i * (f.w - 28) / 2 + (j ? 5 : -5), y = f.y + 16 + j * (f.h - 32); ell(g, x, y + 1.4, 13, 8.6, null, 'rgba(255,255,255,0.45)', 1.2); stone(g, x, y, 11, 7.4, C.stone[(i + j) % 2]); }
  g.restore();
}
