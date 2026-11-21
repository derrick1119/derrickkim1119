// 일러스트 그림체 시험판: 남보라 밤하늘의 보름달, 소용돌이 구름(운문), 궁궐 지붕과 등롱, 돌길,
// 금빛으로 빛나는 칼·화살 궤적과 푸른 도깨비불. (ART.illust 일 때만 쓴다 — render/art.js)
import { TAU, makeCanvas, rng, ell, rr, poly, line, path } from './draw.js';
import { W, H } from '../config.js';

export const ILL_FAR_H = 200;
const rgba = (c, a) => `rgba(${parseInt(c.slice(1, 3), 16)},${parseInt(c.slice(3, 5), 16)},${parseInt(c.slice(5, 7), 16)},${a})`;
export const ILL = { gold: '#ffbf4a', goldCore: '#fff1c4', foe: '#ff5a48', wisp: '#7fb2ff', wisp2: '#b48cff', ink: '#1b1526' };

// ── 하늘의 것들 ──
export function moon(g, x, y, r) {
  const gl = g.createRadialGradient(x, y, r * 0.7, x, y, r * 3.4); gl.addColorStop(0, 'rgba(255,236,190,0.42)'); gl.addColorStop(0.35, 'rgba(214,196,255,0.14)'); gl.addColorStop(1, 'rgba(200,190,255,0)'); g.fillStyle = gl; g.fillRect(x - r * 3.4, y - r * 3.4, r * 6.8, r * 6.8);
  const d = g.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r); d.addColorStop(0, '#fffaea'); d.addColorStop(1, '#efd8a2'); ell(g, x, y, r, r, d);
  g.globalAlpha = 0.15; for (const [dx, dy, cr] of [[-0.32, -0.2, 0.22], [0.24, 0.08, 0.17], [0.04, 0.4, 0.12], [-0.18, 0.3, 0.09], [0.36, -0.3, 0.1], [-0.02, -0.46, 0.07]]) ell(g, x + dx * r, y + dy * r, cr * r, cr * r * 0.9, '#b09460'); g.globalAlpha = 1;
}
// 단풍잎 한 장: 다섯 갈래로 뾰족하게 갈라진 잎과 짧은 잎자루
export function mapleLeaf(g, x, y, s, a, col, edge) {
  g.save(); g.translate(x, y); g.rotate(a); g.scale(s, s);
  g.beginPath(); for (const [an, l, wd] of [[-90, 10, 3.4], [-36, 8.4, 3], [-144, 8.4, 3], [18, 5.4, 2.2], [162, 5.4, 2.2]]) { const r = an * Math.PI / 180, cx = Math.cos(r), cy = Math.sin(r), px = -cy, py = cx; g.moveTo(0, 0); g.quadraticCurveTo(cx * l * 0.5 + px * wd, cy * l * 0.5 + py * wd, cx * l, cy * l); g.quadraticCurveTo(cx * l * 0.5 - px * wd, cy * l * 0.5 - py * wd, 0, 0); }
  g.fillStyle = col; g.fill(); if (edge) { g.strokeStyle = edge; g.lineWidth = 0.7 / s; g.stroke(); }
  g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 6); g.strokeStyle = edge || col; g.lineWidth = 1.1; g.stroke();
  g.restore();
}
function spiral(g, x, y, r, col, lw) { g.beginPath(); for (let i = 0; i <= 36; i++) { const t = i / 36, a = -Math.PI * 0.6 + t * TAU * 1.5, rr2 = r * (1 - t * 0.82); const px = x + Math.cos(a) * rr2, py = y + Math.sin(a) * rr2 * 0.8; if (i) g.lineTo(px, py); else g.moveTo(px, py); } g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.stroke(); }
// 운문: 아래가 납작하고 위로 덩이가 솟은 구름, 덩이마다 소용돌이와 빛 테
export function cloud(g, x, y, s, fill, rim, light, R = Math.random) {
  g.save(); g.translate(x, y); g.scale(s, s);
  const blobs = [[-46, 8, 18], [-24, -4, 24], [2, -10, 26], [28, -2, 21], [50, 8, 15]].map(([bx, by, r]) => [bx + (R() - 0.5) * 6, by + (R() - 0.5) * 4, r * (0.9 + R() * 0.2)]);
  g.beginPath(); for (const [bx, by, r] of blobs) { g.moveTo(bx + r, by); g.arc(bx, by, r, 0, TAU); } g.rect(-60, 4, 122, 14); g.fillStyle = fill; g.fill();
  for (const [bx, by, r] of blobs) { g.beginPath(); g.arc(bx, by, r, Math.PI * 1.06, Math.PI * 1.94); g.strokeStyle = rim; g.lineWidth = 2.6; g.lineCap = 'round'; g.stroke(); }
  for (const [bx, by, r] of blobs.slice(1, 4)) spiral(g, bx + r * 0.08, by + r * 0.08, r * 0.6, light, 1.8);
  // 꼬리처럼 말려 나간 끝
  g.beginPath(); g.moveTo(58, 14); g.quadraticCurveTo(84, 16, 92, 4); g.quadraticCurveTo(96, -6, 86, -6); g.strokeStyle = rim; g.lineWidth = 2.6; g.stroke();
  g.restore();
}
// 청사초롱: 붉은 몸통 위아래에 푸른 단, 아래로 술
export function lantern(g, x, y, s = 1, t = 0) {
  const fl = 0.85 + 0.15 * Math.sin(t * 7 + x);
  const gl = g.createRadialGradient(x, y, 2, x, y, 60 * s); gl.addColorStop(0, `rgba(255,200,110,${0.5 * fl})`); gl.addColorStop(1, 'rgba(255,170,80,0)'); g.fillStyle = gl; g.fillRect(x - 60 * s, y - 60 * s, 120 * s, 120 * s);
  rr(g, x - 9 * s, y - 15 * s, 18 * s, 6 * s, 2 * s, '#2f4d8a', ILL.ink, 1.2); rr(g, x - 9 * s, y + 9 * s, 18 * s, 6 * s, 2 * s, '#2f4d8a', ILL.ink, 1.2);
  rr(g, x - 10 * s, y - 10 * s, 20 * s, 20 * s, 5 * s, `rgb(${Math.round(220 * fl)},${Math.round(80 * fl)},${Math.round(60 * fl)})`, ILL.ink, 1.2);
  g.globalAlpha = 0.55; rr(g, x - 6 * s, y - 8 * s, 12 * s, 16 * s, 4 * s, '#ffd88a'); g.globalAlpha = 1;
  line(g, [x, y + 15 * s, x, y + 24 * s], '#c83a2a', 2 * s); poly(g, [x - 3 * s, y + 22 * s, x + 3 * s, y + 22 * s, x + 4 * s, y + 32 * s, x - 4 * s, y + 32 * s], '#c83a2a');
}
// 기와지붕: 처마 끝이 살짝 들리고 용마루가 곧은 팔작지붕 (y = 처마선, x = 가운데)
function roof(g, x, y, w, h, col, edge) {
  const e = w * 0.1;
  path(g, p => { p.moveTo(x - w / 2 - e, y - h * 0.28); p.quadraticCurveTo(x - w / 2 + e * 0.2, y + h * 0.04, x - w * 0.3, y); p.lineTo(x + w * 0.3, y); p.quadraticCurveTo(x + w / 2 - e * 0.2, y + h * 0.04, x + w / 2 + e, y - h * 0.28); p.quadraticCurveTo(x + w * 0.38, y - h * 0.4, x + w * 0.26, y - h); p.lineTo(x - w * 0.26, y - h); p.quadraticCurveTo(x - w * 0.38, y - h * 0.4, x - w / 2 - e, y - h * 0.28); p.closePath(); }, col);
  rr(g, x - w * 0.28, y - h - 3, w * 0.56, 5, 2, col);
  if (edge) { g.beginPath(); g.moveTo(x - w / 2 - e, y - h * 0.28); g.quadraticCurveTo(x - w * 0.38, y - h * 0.4, x - w * 0.26, y - h); g.lineTo(x + w * 0.26, y - h); g.quadraticCurveTo(x + w * 0.38, y - h * 0.4, x + w / 2 + e, y - h * 0.28); g.strokeStyle = edge; g.lineWidth = 1.6; g.stroke(); }
}
// 전각 한 채: 기단, 붉은 기둥, 불 켜진 창살, 기와지붕
export function hall(g, x, y, w, h, R = Math.random, o = {}) {
  const wallH = h * 0.42, roofH = h * 0.46, n = Math.max(3, Math.round(w / 34));
  rr(g, x - w * 0.5, y - 7, w, 7, 1, o.base || '#2a2442');
  g.fillStyle = o.wall || '#2b2442'; g.fillRect(x - w * 0.4, y - 7 - wallH, w * 0.8, wallH);
  for (let i = 0; i < n; i++) {
    const cw = w * 0.8 / n, px = x - w * 0.4 + (i + 0.5) * cw, lit = R() < 0.72;
    if (lit) { const gl = g.createRadialGradient(px, y - 7 - wallH * 0.5, 1, px, y - 7 - wallH * 0.5, cw); gl.addColorStop(0, 'rgba(255,190,100,0.45)'); gl.addColorStop(1, 'rgba(255,170,80,0)'); g.fillStyle = gl; g.fillRect(px - cw, y - 7 - wallH - cw * 0.5, cw * 2, wallH + cw); }
    g.fillStyle = lit ? '#ffc76a' : '#3a3254'; g.fillRect(px - cw * 0.34, y - 7 - wallH * 0.86, cw * 0.68, wallH * 0.72);
    if (lit && cw > 14) { g.fillStyle = 'rgba(120,60,30,0.55)'; for (let k = 1; k < 3; k++) g.fillRect(px - cw * 0.34 + cw * 0.68 * k / 3 - 0.6, y - 7 - wallH * 0.86, 1.2, wallH * 0.72); g.fillRect(px - cw * 0.34, y - 7 - wallH * 0.5, cw * 0.68, 1.2); }
  }
  for (let i = 0; i <= n; i++) { const px = x - w * 0.4 + i * w * 0.8 / n; g.fillStyle = '#7a2a30'; g.fillRect(px - 2, y - 7 - wallH, 4, wallH); }
  g.fillStyle = '#3f5a78'; g.fillRect(x - w * 0.42, y - 9 - wallH, w * 0.84, 4);   // 단청 띠
  roof(g, x, y - 7 - wallH, w * 1.12, roofH, o.roof || '#1d1930', o.edge || 'rgba(190,180,230,0.45)');
}
function ridge(g, R, y0, amp, col, w) { const ph = [R() * TAU, R() * TAU, R() * TAU]; path(g, p => { p.moveTo(0, ILL_FAR_H + 40); for (let x = 0; x <= w; x += 12) { const u = x / w * TAU; p.lineTo(x, y0 + Math.sin(u * 2 + ph[0]) * amp * 0.7 + Math.sin(u * 5 + ph[1]) * amp * 0.4 + Math.sin(u * 13 + ph[2]) * amp * 0.2); } p.lineTo(w, ILL_FAR_H + 40); p.closePath(); }, col); }   // 끝과 끝이 이어지는 능선

// ── 싸움터의 먼 하늘 (가로 FW, 행군할 때 느리게 흐른다) ──
export function illustFar(FW, seed) {
  const c = makeCanvas(FW, ILL_FAR_H), g = c.getContext('2d'), R = rng(seed * 7 + 3);
  const sk = g.createLinearGradient(0, 0, 0, ILL_FAR_H); sk.addColorStop(0, '#16132c'); sk.addColorStop(0.42, '#2e2956'); sk.addColorStop(0.78, '#5f5790'); sk.addColorStop(1, '#8a81b2'); g.fillStyle = sk; g.fillRect(0, 0, FW, ILL_FAR_H);
  for (let i = 0; i < 140; i++) { g.globalAlpha = 0.3 + R() * 0.6; ell(g, R() * FW, R() * 120, 0.6 + R() * 1.1, 0.6 + R() * 1.1, '#f2eeff'); } g.globalAlpha = 1;
  moon(g, FW * 0.7, 96, 46);
  for (let i = 0; i < 9; i++) { const cx = (i + R() * 0.6) * FW / 9, cy = 84 + R() * 44, cs = 0.62 + R() * 0.38, seedC = R() * 1e6; for (const dx of [0, -FW, FW]) if (cx + dx > -140 && cx + dx < FW + 140) cloud(g, cx + dx, cy, cs, '#3d3769', '#8f86c4', '#b6acdf', rng(seedC)); }   // 가장자리에 걸친 구름은 반대편에도
  ridge(g, R, 150, 22, '#3b3662', FW);
  for (const [x, w, h] of [[FW * 0.18, 130, 66], [FW * 0.24, 80, 44], [FW * 0.58, 170, 80], [FW * 0.88, 110, 56]]) hall(g, x, 176, w, h, R);
  ridge(g, R, 178, 14, '#2c2848', FW);
  const mi = g.createLinearGradient(0, 150, 0, ILL_FAR_H); mi.addColorStop(0, 'rgba(190,180,230,0)'); mi.addColorStop(1, 'rgba(190,180,230,0.55)'); g.fillStyle = mi; g.fillRect(0, 150, FW, ILL_FAR_H - 150);
  return c;
}
// ── 싸움터의 바닥 (가로 GW): 달빛 아래 보랏빛 흙, 구불구불한 돌길, 안개, 바위와 풀, 떨어진 단풍잎 ──
export function illustGround(GW, seed) {
  const c = makeCanvas(GW, H), g = c.getContext('2d'), R = rng(seed * 13 + 5);
  const wrap = (x, m, fn) => { fn(x); if (x < m) fn(x + GW); if (x > GW - m) fn(x - GW); };   // 가장자리에 걸친 것은 반대편에도 그려 끝과 끝을 잇는다
  const bg = g.createLinearGradient(0, 140, 0, 570); bg.addColorStop(0, 'rgba(110,102,150,0)'); bg.addColorStop(0.1, '#6a6391'); bg.addColorStop(0.5, '#716a96'); bg.addColorStop(1, '#4c456c'); g.fillStyle = bg; g.fillRect(0, 140, GW, H - 140);
  for (let i = 0; i < 160; i++) { const x = R() * GW, y = 170 + R() * 400, rx = 30 + R() * 90, al = 0.05 + R() * 0.07, col = R() < 0.5 ? '#a49cc6' : '#4e4870'; g.globalAlpha = al; wrap(x, rx, xx => ell(g, xx, y, rx, rx * 0.32, col)); } g.globalAlpha = 1;
  // 돌길: 가운데를 따라 구불구불, 판석마다 달빛 테
  const ry = x => 348 + Math.sin(x / GW * TAU * 3 + seed) * 46 + Math.sin(x / GW * TAU * 11) * 10, hw = 62;   // 바닥 한 장의 끝과 끝이 이어지도록 주기를 맞춘다
  path(g, p => { p.moveTo(0, ry(0) - hw - 8); for (let x = 0; x <= GW; x += 20) p.lineTo(x, ry(x) - hw - 8); for (let x = GW; x >= 0; x -= 20) p.lineTo(x, ry(x) + hw + 8); p.closePath(); }, 'rgba(60,54,86,0.35)');
  path(g, p => { p.moveTo(0, ry(0) - hw); for (let x = 0; x <= GW; x += 20) p.lineTo(x, ry(x) - hw); for (let x = GW; x >= 0; x -= 20) p.lineTo(x, ry(x) + hw); p.closePath(); }, '#66608a');   // 다져진 흙길
  for (let i = 0; i < GW * 0.13; i++) {   // 크기와 모양이 제각각인 둥근 돌을 흙길에 박아 놓았다
    const x0 = R() * GW, dy = (R() * 2 - 1) * (hw - 10), r = 9 + R() * 12, n = 7, off = [], col = ['#7c759e', '#767098', '#837da4', '#716a93'][(R() * 4) | 0];
    for (let k = 0; k < n; k++) { const an = k / n * TAU + R() * 0.4, rr2 = r * (0.78 + R() * 0.3); off.push(Math.cos(an) * rr2, Math.sin(an) * rr2 * 0.62); }
    wrap(x0, 30, x => { const y = ry(x0) + dy; poly(g, off.map((v, k) => v + (k % 2 ? y : x)), col, 'rgba(36,30,56,0.5)', 1.1); g.globalAlpha = 0.3; g.beginPath(); g.ellipse(x - r * 0.1, y - r * 0.2, r * 0.6, r * 0.3, 0, Math.PI * 1.1, Math.PI * 1.9); g.strokeStyle = '#d4cdee'; g.lineWidth = 1.3; g.stroke(); g.globalAlpha = 1; });
  }
  // 길섶의 풀과 바위, 떨어진 단풍잎
  const tuft = (x0, y, s) => { const bl = []; for (let i = 0; i < 6; i++) bl.push([-Math.PI / 2 + (i - 2.5) * 0.24 + (R() - 0.5) * 0.2, (8 + R() * 8) * s]); wrap(x0, 20, x => bl.forEach(([a, l], i) => line(g, [x, y, x + Math.cos(a) * l, y + Math.sin(a) * l], i % 2 ? '#2e3b52' : '#3b4c64', 2 * s))); };
  for (let i = 0; i < 260; i++) { const x = R() * GW, y = 170 + R() * 390; if (Math.abs(y - ry(x)) < hw + 4) continue; tuft(x, y, 0.7 + R() * 0.7); }
  for (let i = 0; i < 34; i++) { const x = 40 + R() * (GW - 80), y = 180 + R() * 370, r = 7 + R() * 12; if (Math.abs(y - ry(x)) < hw + 10) continue; ell(g, x + 3, y + r * 0.4, r * 1.1, r * 0.35, 'rgba(30,24,48,0.35)'); path(g, p => { p.moveTo(x - r, y + r * 0.3); p.quadraticCurveTo(x - r, y - r * 0.6, x, y - r * 0.7); p.quadraticCurveTo(x + r * 0.9, y - r * 0.6, x + r, y + r * 0.3); p.closePath(); }, '#6a6388', ILL.ink, 1.4); line(g, [x - r * 0.6, y - r * 0.4, x + r * 0.2, y - r * 0.62], '#b2acd0', 1.6); }
  for (let i = 0; i < 110; i++) mapleLeaf(g, 12 + R() * (GW - 24), 180 + R() * 380, 0.55 + R() * 0.4, R() * TAU, ['#a83a34', '#c0563a', '#7a2a34', '#b86a34'][(R() * 4) | 0]);
  // 안개 자락
  for (let i = 0; i < 26; i++) { const x0 = R() * GW, y = 170 + R() * 380; wrap(x0, 140, x => { const gl = g.createRadialGradient(x, y, 4, x, y, 140); gl.addColorStop(0, 'rgba(214,206,240,0.16)'); gl.addColorStop(1, 'rgba(214,206,240,0)'); g.fillStyle = gl; g.save(); g.translate(x, y); g.scale(1, 0.32); g.translate(-x, -y); g.fillRect(x - 140, y - 140, 280, 280); g.restore(); }); }
  // 위쪽 끝은 먼 산의 안개로 스민다
  const top = g.createLinearGradient(0, 140, 0, 200); top.addColorStop(0, 'rgba(176,168,214,0)'); top.addColorStop(1, 'rgba(176,168,214,0.35)'); g.fillStyle = top; g.fillRect(0, 140, GW, 60);
  // 아래 가장자리: 패 놓는 자리 위로 고개를 내민 검푸른 덤불
  for (let x0 = 0; x0 < GW; x0 += 40 + R() * 50) { const y = 560 + R() * 12, r = 16 + R() * 22; wrap(x0, 60, x => { ell(g, x, y, r * 1.4, r, '#211c33'); g.globalAlpha = 0.6; g.beginPath(); g.arc(x, y, r * 1.1, Math.PI * 1.15, Math.PI * 1.7); g.strokeStyle = '#5a5288'; g.lineWidth = 2; g.stroke(); g.globalAlpha = 1; }); }
  return c;
}
// 화면 왼쪽 위를 감싸는 단풍 가지와 걸린 청사초롱 (싸움터와 첫 화면에서 함께 쓴다)
export function mapleBranch(g, x, y, s, t = 0, R = rng(11)) {
  g.save(); g.translate(x, y); g.scale(s, s);
  const br = p => { p.moveTo(-20, -10); p.bezierCurveTo(60, 6, 130, 4, 230, 34); };
  g.beginPath(); br(g); g.strokeStyle = '#241d33'; g.lineWidth = 11; g.lineCap = 'round'; g.stroke(); g.beginPath(); br(g); g.strokeStyle = '#3d3352'; g.lineWidth = 4; g.stroke();
  for (const [x0, y0, x1, y1] of [[60, 4, 92, 40], [120, 12, 150, -18], [170, 22, 206, 60], [96, 8, 84, -22]]) { line(g, [x0, y0, x1, y1], '#241d33', 4); }
  const leaf = (lx, ly, ls, a, col) => mapleLeaf(g, lx, ly, ls * 1.25, a, col, ILL.ink);
  for (const [cx, cy, n] of [[30, -6, 9], [92, 40, 10], [150, -18, 10], [206, 60, 9], [84, -22, 7], [230, 34, 8]]) for (let i = 0; i < n; i++) leaf(cx + (R() - 0.5) * 46, cy + (R() - 0.5) * 30, 0.8 + R() * 0.5, R() * TAU, ['#b8423a', '#d0603a', '#8a2f3a', '#e08a4a', '#a63a3a'][(R() * 5) | 0]);
  line(g, [126, 10, 126, 52], '#1b1526', 1.4); lantern(g, 126, 70, 1.1, t);
  g.restore();
}
// 떠도는 도깨비불과 금빛 티끌
export function drawWisps(g, list, T, dt, area) {
  for (const w of list) {
    w.x += (Math.sin(T * 0.6 + w.ph) * 10 - 6) * dt; w.y += Math.cos(T * 0.8 + w.ph) * 8 * dt - 4 * dt;
    if (w.x < area.x0 - 20) w.x = area.x1 + 10; if (w.y < area.y0) w.y = area.y1;
    const fl = 0.7 + 0.3 * Math.sin(T * 5 + w.ph), r = w.s * fl;
    g.save(); g.globalCompositeOperation = 'lighter';
    const gl = g.createRadialGradient(w.x, w.y, 0.5, w.x, w.y, r * 5); gl.addColorStop(0, rgba(w.col, 0.55)); gl.addColorStop(1, rgba(w.col, 0)); g.fillStyle = gl; g.fillRect(w.x - r * 5, w.y - r * 5, r * 10, r * 10);
    if (w.flame) { path(g, p => { p.moveTo(w.x, w.y - r * 3.4); p.quadraticCurveTo(w.x + r * 1.6, w.y - r * 0.6, w.x, w.y + r); p.quadraticCurveTo(w.x - r * 1.6, w.y - r * 0.6, w.x, w.y - r * 3.4); }, rgba(w.col, 0.8)); }
    ell(g, w.x, w.y, r * 0.6, r * 0.6, '#f4f0ff'); g.restore();
  }
}
// 빛나는 칼 궤적: 가운데가 굵고 양끝이 가늘어지는 빛의 띠 (cx, cy = 손, R = 반지름, a0→a1 = 휘두른 각)
export function glowTrail(g, cx, cy, R, a0, a1, w, alpha, col = ILL.gold) {
  const d = a1 - a0; if (Math.abs(d) < 0.06 || alpha <= 0.02) return;
  const n = 14, pr = t => Math.sin(Math.PI * Math.min(1, t * 1.15)) * (0.4 + 0.6 * t);
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
  for (const [wm, a, c] of [[2.6, 0.2, col === ILL.gold ? '#ff8a2a' : col], [1.25, 0.42, col], [0.42, 0.95, ILL.goldCore]]) {
    g.strokeStyle = c; g.globalAlpha = alpha * a;
    for (let i = 0; i < n; i++) { const t0 = i / n, t1 = (i + 1) / n; g.beginPath(); g.arc(cx, cy, R, a0 + d * t0, a0 + d * t1, d < 0); g.lineWidth = Math.max(0.5, w * wm * pr((t0 + t1) / 2)); g.stroke(); }
  }
  g.restore();
}
export function glowStreak(g, x0, y0, x1, y1, w, alpha, col = ILL.gold) {
  if (alpha <= 0.02) return;
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
  for (const [wm, a, c] of [[2.8, 0.22, col === ILL.gold ? '#ff8a2a' : col], [1.2, 0.45, col], [0.4, 0.95, ILL.goldCore]]) { g.globalAlpha = alpha * a; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.strokeStyle = c; g.lineWidth = w * wm; g.stroke(); }
  g.restore();
}
// 빛나는 점 (구슬·부적·도깨비불): 가산 합성의 둥근 빛
export function glowDot(g, x, y, r, col, alpha = 1) {
  if (alpha <= 0.02 || r <= 0) return;
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.min(1, alpha);
  const gr = g.createRadialGradient(x, y, 0, x, y, r * 2.2); gr.addColorStop(0, col); gr.addColorStop(0.35, col + '88'); gr.addColorStop(1, col + '00');
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r * 2.2, 0, Math.PI * 2); g.fill(); g.restore();
}
// 밤빛 보정: 싸움터 전체를 달빛의 남보라로 눌러 주고, 달 쪽에서 옅은 빛을 비춘다
export function nightGrade(g, x, y, w, h, k = 1) {
  g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = `rgba(160,148,210,${0.72 * k})`; g.fillRect(x, y, w, h);
  g.globalCompositeOperation = 'screen'; const gl = g.createRadialGradient(x + w * 0.78, y - 40, 20, x + w * 0.78, y - 40, w * 0.7); gl.addColorStop(0, `rgba(255,232,190,${0.16 * k})`); gl.addColorStop(1, 'rgba(255,232,190,0)'); g.fillStyle = gl; g.fillRect(x, y, w, h);
  g.restore();
}

// ── 첫 화면 대표 그림 (1280×720) ──
let key = null;
export function illustKeyArt() {
  if (key) return key;
  const S = 1.5, c = makeCanvas(W * S, H * S), g = c.getContext('2d'); g.scale(S, S); const R = rng(91);
  const sk = g.createLinearGradient(0, 0, 0, H); sk.addColorStop(0, '#120f26'); sk.addColorStop(0.45, '#2c2753'); sk.addColorStop(0.7, '#5a5288'); sk.addColorStop(1, '#3a3458'); g.fillStyle = sk; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 220; i++) { g.globalAlpha = 0.3 + R() * 0.6; ell(g, R() * W, R() * 360, 0.6 + R() * 1.2, 0.6 + R() * 1.2, '#f2eeff'); } g.globalAlpha = 1;
  moon(g, 760, 190, 112);
  // 겹겹의 먼 산
  const ridgeK = (y0, amp, col) => path(g, p => { p.moveTo(0, H); let y = y0; for (let x = 0; x <= W; x += 20) { y += (R() - 0.5) * amp; y = Math.max(y0 - amp * 2, Math.min(y0 + amp, y)); p.lineTo(x, y); } p.lineTo(W, H); p.closePath(); }, col);
  ridgeK(400, 18, '#3e3966');
  for (let i = 0; i < 7; i++) cloud(g, 80 + i * 190 + R() * 60, 280 + R() * 120, 1.1 + R() * 0.5, '#4a4378', '#958cc8', '#bdb3e4', R);
  ridgeK(450, 14, '#312c52');
  // 오른쪽 언덕 위 궁궐
  path(g, p => { p.moveTo(820, H); p.quadraticCurveTo(900, 420, 1280, 380); p.lineTo(1280, H); p.closePath(); }, '#2a2546');
  hall(g, 1000, 452, 220, 110, R); hall(g, 1180, 420, 190, 100, R); hall(g, 900, 470, 120, 64, R);
  for (const [lx, ly] of [[960, 470], [1060, 470], [1130, 440], [1240, 440]]) lantern(g, lx, ly - 30, 0.8);
  // 앞의 구름 띠
  for (let i = 0; i < 5; i++) cloud(g, 40 + i * 300 + R() * 80, 500 + R() * 40, 1.4 + R() * 0.4, '#5a5290', '#a8a0d8', '#cfc6ee', R);
  // 돌길: 아래에서 오른쪽 위로
  path(g, p => { p.moveTo(300, H); p.quadraticCurveTo(620, 600, 820, 560); p.lineTo(980, 560); p.quadraticCurveTo(860, 620, 900, H); p.closePath(); }, '#6e6792');
  for (let i = 0; i < 60; i++) { const t = R(), y = 560 + t * 160, xl = 820 - t * 520 + (1 - t) * 0, xr = 980 - t * 80; const x = xl + R() * (xr - xl), sw = 16 + t * 40, sh = 8 + t * 16; poly(g, [x, y, x + sw, y, x + sw * 0.96, y + sh, x + sw * 0.04, y + sh], ['#a59ec0', '#9790b4', '#aea7c8'][(R() * 3) | 0], '#4c4668', 1.2); }
  // 안개
  for (let i = 0; i < 18; i++) { const x = R() * W, y = 420 + R() * 260; const gl = g.createRadialGradient(x, y, 4, x, y, 200); gl.addColorStop(0, 'rgba(214,206,240,0.18)'); gl.addColorStop(1, 'rgba(214,206,240,0)'); g.fillStyle = gl; g.save(); g.translate(x, y); g.scale(1, 0.3); g.translate(-x, -y); g.fillRect(x - 200, y - 200, 400, 400); g.restore(); }
  // 왼쪽 위 단풍 가지와 청사초롱, 아래 앞쪽의 검은 수풀
  mapleBranch(g, -10, 30, 1.7, 0, R);
  for (let x = 0; x < W; x += 50 + R() * 60) { const y = 700 + R() * 20, r = 30 + R() * 40; ell(g, x, y, r * 1.5, r, '#1a1529'); g.globalAlpha = 0.55; g.beginPath(); g.arc(x, y, r * 1.2, Math.PI * 1.15, Math.PI * 1.7); g.strokeStyle = '#5a5288'; g.lineWidth = 2.4; g.stroke(); g.globalAlpha = 1; }
  key = c; return c;
}
