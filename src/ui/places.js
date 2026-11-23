// 길 위의 장소들: 장터 · 주막 · 갈림길 · 보물 터. 버튼만 띄우는 대신 그 장소를 종이 인형극 무대처럼 통째로 그린다.
// 정지한 그림(하늘·집·진열대·평상)은 한 번 굽고, 물건·인형·불빛·김만 매 장면 그린다
import { W, H } from '../config.js';
import { TAU, INK, PAPER, RED, INDIGO, TEAL, OCHRE, SUB, FONT, FONT_B, text, textBlock, ell, rr, poly, line, path, st, makeCanvas, rng, clamp, easeOutBack } from '../render/draw.js';
import { part, curve, P, R as RECT, E, dk, lt } from '../render/figures.js';
import { THEMES, padPine, grassTuft, paperFlower } from '../render/terrain.js';
import { button, icon, panel, stamp, seal, tapped, isDown, C } from './ui.js';
import { cardFace } from './cards.js';
import { Overlay, RewardOverlay, COL, supplyArt, resultIcon, BAD, GOOD } from './overlays.js';
import { G, save, describeReward, buyItem, upgradeCard, removeCard, STOP, forkDesc } from '../state.js';
import { cardName, isUnit } from '../data/cards.js';
import { weaponIcon, portrait } from '../render/sprites.js';
import { relicIcon, miscIcon } from '../render/icons.js';
import { puppet } from './theater.js';
import { sfx } from '../audio.js';
import { juice, SPOT, goldRays } from './juice.js';

const S = 1.5;
const bakeScene = fn => { const c = makeCanvas(W * S, H * S), g = c.getContext('2d'); g.scale(S, S); fn(g); return c; };
const fibers = (g, x, y, w, h, n, R, a = 0.1, cols = ['#a08860', '#ffffff']) => { for (let i = 0; i < n; i++) { const fx = x + R() * w, fy = y + R() * h, an = R() * TAU, l = 3 + R() * 9; g.globalAlpha = a; line(g, [fx, fy, fx + Math.cos(an) * l, fy + Math.sin(an) * l], cols[i % 2], 0.8); } g.globalAlpha = 1; };
const ridgeFill = (g, f, col, y0, o = {}) => { g.save(); g.shadowColor = o.sh || 'rgba(70,50,30,0.35)'; g.shadowBlur = 14; g.shadowOffsetY = -4; g.beginPath(); g.moveTo(-10, H); for (let x = -10; x <= W + 10; x += 8) g.lineTo(x, f(x)); g.lineTo(W + 10, H); g.closePath(); g.fillStyle = col; g.fill(); g.restore(); g.beginPath(); for (let x = -10; x <= W + 10; x += 8) { if (x === -10) g.moveTo(x, f(x)); else g.lineTo(x, f(x)); } g.globalAlpha = o.rim || 0.6; st(g, o.rimCol || '#fbf3df', 1.6); g.globalAlpha = 1; };
// 빛 한 점 (한 번 굽고 'lighter' 로 겹친다)
const GLOW = new Map();
function glowSpr(rgb) { let c = GLOW.get(rgb); if (c) return c; c = makeCanvas(64, 64); const cg = c.getContext('2d'), gr = cg.createRadialGradient(32, 32, 0.5, 32, 32, 32); gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(0.35, `rgba(${rgb},0.3)`); gr.addColorStop(1, `rgba(${rgb},0)`); cg.fillStyle = gr; cg.fillRect(0, 0, 64, 64); GLOW.set(rgb, c); return c; }
export const glow = (g, x, y, r, rgb, a) => { if (a <= 0.003) return; g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = a; g.drawImage(glowSpr(rgb), x - r, y - r, r * 2, r * 2); g.restore(); };
// 청사초롱 (위는 쪽빛, 아래는 붉은 비단)
export function chorong(g, x, y, s, lit = 1) {
  line(g, [x, y - 10 * s, x, y], '#2a2024', 1.2 * s); rr(g, x - 6 * s, y, 12 * s, 3 * s, 1.2 * s, '#2a2024');
  const bh = 17 * s, cy = y + 3 * s + bh / 2, sh = p => { p.moveTo(x - 6.6 * s, y + 3 * s); p.quadraticCurveTo(x - 8.4 * s, cy, x - 6.6 * s, y + 3 * s + bh); p.lineTo(x + 6.6 * s, y + 3 * s + bh); p.quadraticCurveTo(x + 8.4 * s, cy, x + 6.6 * s, y + 3 * s); p.closePath(); };
  path(g, sh, lit ? '#e0412f' : '#7a2420', 'rgba(10,8,8,0.7)', 0.9 * s);
  g.save(); g.beginPath(); g.rect(x - 9 * s, y + 3 * s, 18 * s, bh * 0.42); g.clip(); path(g, sh, lit ? '#3d6fd6' : '#24345e', 'rgba(10,8,8,0.7)', 0.9 * s); g.restore();
  rr(g, x - 5 * s, y + 3 * s + bh, 10 * s, 2.4 * s, 1 * s, '#2a2024'); line(g, [x, y + 5.4 * s + bh, x, y + 12 * s + bh], '#c8402f', 1.4 * s);
}
// 종이 구름 (아래가 평평하다)
function cloud(g, x, y, w, col) { const b = [[-0.36, 0.2], [-0.14, 0.34], [0.1, 0.27], [0.32, 0.17]], sh = p => { p.moveTo(x - w * 0.5, y); for (const [dx, r] of b) p.arc(x + dx * w, y - r * w * 0.42, r * w * 0.5, Math.PI, 0); p.lineTo(x + w * 0.5, y); p.closePath(); }; g.save(); g.shadowColor = 'rgba(120,100,70,0.22)'; g.shadowBlur = 8; g.shadowOffsetY = 3; g.beginPath(); sh(g); g.fillStyle = col; g.fill(); g.restore(); g.beginPath(); sh(g); g.globalAlpha = 0.5; st(g, '#fffaf0', 1.2); g.globalAlpha = 1; }
// 초가 / 기와집 한 채 (뒷골목 풍경)
function house(g, x, y, w, kind, R) {
  const wall = '#e9dcbc', post = '#7a5236';
  part(g, RECT(x, y - 46, w, 46), wall, RECT(x + w * 0.66, y - 46, w * 0.34, 46), { lw: 1.2 });
  for (const px of [x + 4, x + w - 10]) rr(g, px, y - 48, 6, 48, 1, post);
  rr(g, x + w * 0.3, y - 36, w * 0.3, 22, 1.5, '#f3e9cf', INK, 1); line(g, [x + w * 0.45, y - 36, x + w * 0.45, y - 14], 'rgba(60,40,20,0.5)', 0.8); line(g, [x + w * 0.3, y - 25, x + w * 0.6, y - 25], 'rgba(60,40,20,0.5)', 0.8);
  if (kind) { part(g, p => { p.moveTo(x - 14, y - 40); p.quadraticCurveTo(x + w * 0.5, y - 92, x + w + 14, y - 40); p.quadraticCurveTo(x + w * 0.5, y - 50, x - 14, y - 40); p.closePath(); }, '#c9a66a', p => { p.moveTo(x - 14, y - 40); p.quadraticCurveTo(x + w * 0.5, y - 60, x + w + 14, y - 40); p.quadraticCurveTo(x + w * 0.5, y - 50, x - 14, y - 40); p.closePath(); }, { lw: 1.2 }); for (let k = 0; k < 6; k++) { const xx = x + k * w / 5; curve(g, p => { p.moveTo(xx - 8, y - 46); p.quadraticCurveTo(xx, y - 66 - R() * 8, xx + 8, y - 80 + Math.abs(xx - x - w / 2) * 0.3); }, 'rgba(120,90,40,0.45)', 0.9); } }
  else { part(g, p => { p.moveTo(x - 18, y - 40); p.quadraticCurveTo(x - 6, y - 50, x + 6, y - 66); p.lineTo(x + w - 6, y - 66); p.quadraticCurveTo(x + w + 6, y - 50, x + w + 18, y - 40); p.quadraticCurveTo(x + w * 0.5, y - 47, x - 18, y - 40); p.closePath(); }, '#5e6472', p => { p.moveTo(x - 18, y - 40); p.quadraticCurveTo(x + w * 0.5, y - 47, x + w + 18, y - 40); p.lineTo(x + w + 6, y - 50); p.quadraticCurveTo(x + w * 0.5, y - 54, x - 6, y - 50); p.closePath(); }, { lw: 1.2 }); for (let k = 1; k < 8; k++) line(g, [x + k * w / 8, y - 65, x + k * w / 8 + (k - 4) * 1.6, y - 45], 'rgba(255,255,255,0.18)', 1); rr(g, x + 4, y - 70, w - 8, 5, 2, '#4a505c'); }
}

// ═════════════════════════ 장터 ═════════════════════════
// 차양을 친 가판대: 뒤의 발과 선반에는 패를 받침대에 세우고, 앞의 멍석에는 보따리·보물·무기를 늘어놓는다. 물건마다 나무 값표가 달린다
const SHELF_Y = 296, COUNTER_Y = 486, COLS = [400, 612, 824, 1036];
let MBG = null;
function marketBG() {
  if (MBG) return MBG;
  MBG = bakeScene(g => {
    const R = rng(515);
    const sky = g.createLinearGradient(0, 0, 0, 340); sky.addColorStop(0, '#e2d0a6'); sky.addColorStop(1, '#f5ebd5'); g.fillStyle = sky; g.fillRect(0, 0, W, 360);
    { const gr = g.createRadialGradient(1100, 96, 20, 1100, 96, 190); gr.addColorStop(0, 'rgba(255,214,140,0.45)'); gr.addColorStop(1, 'rgba(255,214,140,0)'); g.fillStyle = gr; g.fillRect(880, 0, 400, 300); ell(g, 1100, 96, 34, 34, '#f2cf7e'); }
    cloud(g, 300, 120, 170, '#fbf5e6'); cloud(g, 820, 92, 120, '#fbf5e6');
    ridgeFill(g, x => 262 - 50 * Math.exp(-(((x - 200) / 160) ** 2)) - 40 * Math.exp(-(((x - 1080) / 190) ** 2)) - 22 * Math.sin(x * 0.01), '#bcc3a3', 0);
    ridgeFill(g, x => 296 - 28 * Math.exp(-(((x - 640) / 260) ** 2)) - 8 * Math.sin(x * 0.02 + 1), '#a7b18f', 0);
    // 뒷골목: 초가와 기와집, 오방색 깃발
    for (let i = 0; i < 9; i++) { const x = -40 + i * 158 + R() * 20; house(g, x, 344, 100 + R() * 22, i % 3 !== 1, R); }
    ['#c8402f', '#2f4d7e', '#e0b23c', '#3f6b5c', '#c8402f'].forEach((col, k) => { const x = 60 + k * 300 + (k % 2) * 40; line(g, [x, 344, x, 236], INK, 3); line(g, [x, 344, x, 236], '#8a5a30', 1.6); path(g, P(x, 238, x + 34, 248, x, 260), col, INK, 1); });
    // 땅: 다져진 흙길
    const gd = g.createLinearGradient(0, 340, 0, H); gd.addColorStop(0, '#dcc59a'); gd.addColorStop(1, '#c9ab7c'); g.fillStyle = gd; g.fillRect(0, 340, W, H - 340);
    fibers(g, 0, 344, W, H - 344, 900, R, 0.1, ['#8a6a40', '#fff6e0']);
    for (let i = 0; i < 40; i++) { const x = R() * W, y = 360 + R() * 340; ell(g, x, y, 2 + R() * 3, 1.2 + R() * 2, 'rgba(120,96,64,0.35)'); }
    // 등불 줄 (차양 위로 늘어진 새끼줄에 청사초롱)
    const ly = x => 20 + 24 * Math.sin(Math.PI * x / W);
    g.beginPath(); for (let x = 0; x <= W; x += 16) { if (!x) g.moveTo(x, ly(x)); else g.lineTo(x, ly(x)); } st(g, '#5a4030', 2);
    for (const x of [110, 320, 530, 750, 960, 1170]) { { const gr = g.createRadialGradient(x, ly(x) + 22, 1, x, ly(x) + 22, 40); gr.addColorStop(0, 'rgba(255,200,120,0.35)'); gr.addColorStop(1, 'rgba(255,200,120,0)'); g.fillStyle = gr; g.fillRect(x - 40, ly(x) - 18, 80, 80); } chorong(g, x, ly(x) + 6, 1.15); }
    // 가판대 기둥
    for (const x of [232, 718, 1204]) { rr(g, x - 7, 70, 14, 540, 3, '#8a5a30', INK, 1.4); g.fillStyle = 'rgba(255,230,190,0.25)'; g.fillRect(x - 4, 74, 3, 530); }
    // 발: 대를 엮어 친 가림막 (위는 둘둘 말려 있다)
    part(g, RECT(254, 154, 948, 146), '#d9c28c', null, { lw: 1.4 }); g.save(); g.beginPath(); g.rect(254, 154, 948, 146); g.clip(); for (let x = 256; x < 1202; x += 5) line(g, [x, 154, x, 300], 'rgba(150,118,60,0.35)', 1); for (const y of [184, 272]) line(g, [254, y, 1202, y], 'rgba(90,60,30,0.6)', 1.4); g.restore();
    rr(g, 248, 146, 960, 12, 6, '#c9ae74', INK, 1.2); for (const x of [300, 720, 1150]) { line(g, [x, 140, x, 160], '#5a4030', 2); }
    // 차양: 무명을 펼치고 아래에 쪽빛 단과 물결 끝단
    const ax0 = 214, ax1 = 1222, ay0 = 70, ay1 = 118, wave = (p, cont) => { if (cont) p.lineTo(ax1, ay1); else p.moveTo(ax1, ay1); for (let x = ax1; x > ax0; x -= 72) { const x2 = Math.max(ax0, x - 72); p.quadraticCurveTo((x + x2) / 2, ay1 + 26, x2, ay1); } };
    part(g, p => { p.moveTo(ax0, ay0); p.lineTo(ax1, ay0); wave(p, true); p.closePath(); }, '#efe4c8', p => { p.moveTo(ax0, ay1 - 16); p.lineTo(ax1, ay1 - 16); wave(p, true); p.closePath(); }, { shc: '#2f4d7e', lw: 1.6 });
    g.save(); g.beginPath(); g.moveTo(ax0, ay0); g.lineTo(ax1, ay0); wave(g, true); g.closePath(); g.clip(); for (let x = ax0 + 36; x < ax1; x += 72) { const gr = g.createLinearGradient(x - 20, 0, x + 20, 0); gr.addColorStop(0, 'rgba(120,90,50,0)'); gr.addColorStop(0.5, 'rgba(120,90,50,0.16)'); gr.addColorStop(1, 'rgba(120,90,50,0)'); g.fillStyle = gr; g.fillRect(x - 20, ay0, 40, 80); } g.restore();
    g.beginPath(); wave(g); st(g, '#c8402f', 2.2);
    rr(g, ax0 - 16, ay0 - 12, ax1 - ax0 + 32, 14, 4, '#6a4428', INK, 1.6);
    // 선반: 두꺼운 널빤지와 받침
    for (const x of [300, 718, 1150]) poly(g, [x - 14, 310, x + 14, 310, x, 338], '#6a4428', INK, 1.2);
    rr(g, 252, SHELF_Y, 952, 15, 3, '#8a5a30', INK, 1.6); g.fillStyle = 'rgba(255,230,190,0.3)'; g.fillRect(256, SHELF_Y + 2, 944, 3);
    // 앞 진열대: 멍석 깐 윗면과 나무 앞판 (오방색 마름모 장식)
    part(g, P(244, 468, 1212, 468, 1230, 500, 226, 500), '#d6bd78', null, { lw: 1.6 });
    g.save(); g.beginPath(); P(244, 468, 1212, 468, 1230, 500, 226, 500)(g); g.clip(); for (let x = 220; x < 1240; x += 9) line(g, [x, 468, x + 10, 500], 'rgba(140,110,50,0.35)', 1); for (let x = 220; x < 1240; x += 9) line(g, [x + 10, 468, x, 500], 'rgba(255,240,200,0.25)', 0.8); g.restore();
    rr(g, 220, 496, 1016, 10, 3, '#8a5a30', INK, 1.4);
    part(g, RECT(226, 504, 1004, 98), '#7a4a2c', RECT(226, 584, 1004, 18), { lw: 1.6 }); for (let x = 226 + 84; x < 1230; x += 84) line(g, [x, 506, x, 600], 'rgba(40,24,14,0.6)', 1.4);
    for (let i = 0; i < 12; i++) { const cx = 268 + i * 84; poly(g, [cx - 10, 552, cx, 541, cx + 10, 552, cx, 563], i % 2 ? '#3f6b5c' : '#8a2a26', 'rgba(30,20,10,0.5)', 1); ell(g, cx, 552, 2.6, 2.6, '#d6a640'); }
    g.save(); g.globalAlpha = 0.35; g.fillStyle = '#2a1a10'; g.beginPath(); g.ellipse(728, 608, 520, 12, 0, 0, TAU); g.fill(); g.restore();
    // 간판: 왼쪽 기둥에 매단 나무판 '장터'
    line(g, [196, 58, 172, 186], '#5a4030', 2); line(g, [196, 58, 216, 186], '#5a4030', 2);
    rr(g, 156, 184, 76, 156, 6, '#6a4428', INK, 2); rr(g, 164, 192, 60, 140, 3, '#f1e6c8', 'rgba(60,40,20,0.5)', 1.2);
    text(g, '장', 194, 232, { size: 40, font: FONT_B }); text(g, '터', 194, 284, { size: 40, font: FONT_B }); icon.coin(g, 194, 318, 9);
    // 앞쪽 소쿠리 (무와 배추)
    ell(g, 86, 690, 60, 14, 'rgba(40,24,14,0.3)'); part(g, p => { p.moveTo(30, 660); p.quadraticCurveTo(86, 712, 142, 660); p.closePath(); }, '#c9a058', null, { lw: 1.4 }); for (let i = 0; i < 5; i++) line(g, [40 + i * 22, 664, 50 + i * 18, 690], 'rgba(110,80,30,0.5)', 1);
    for (const [x, y, col] of [[62, 650, '#f3ecdd'], [92, 646, '#a9c48a'], [118, 652, '#f3ecdd']]) { ell(g, x, y, 13, 11, col, INK, 1.2); line(g, [x, y - 10, x - 4, y - 24], '#5f8a4a', 3); line(g, [x, y - 10, x + 5, y - 22], '#5f8a4a', 3); }
  });
  return MBG;
}

// 물건 하나 그리기 (원점 = 바닥 가운데). 받침대 위의 패 · 방석 위의 보물 · 걸이에 얹은 무기 · 보따리 · 조련 기둥
function good(g, it, d, x, y, row, t) {
  if (row === 0) {
    // 패: 작은 나무 받침대에 기대 세운다
    poly(g, [x - 30, y, x - 24, y - 20, x + 24, y - 20, x + 30, y], '#6a4428', INK, 1.2);
    g.save(); g.translate(x, y - 18); g.rotate(-0.02); cardFace(g, it.kind === 'card' ? it : d.card || it, -44, -116, 88, 114); g.restore();
    return;
  }
  if (d.relic) { ell(g, x + 3, y - 2, 46, 10, 'rgba(40,24,14,0.3)'); part(g, E(x, y - 14, 44, 16), '#a8322a', E(x + 6, y - 8, 40, 12), { lw: 1.4 }); for (const a of [0.8, 2.3, 3.9, 5.4]) ell(g, x + Math.cos(a) * 40, y - 14 + Math.sin(a) * 13, 3, 3, '#e0b23c', INK, 0.8); relicIcon(g, d.relic, x, y - 52, 1.45, Math.sin(t * 2 + x) * 0.04); if (it.kind === 'cleanse') stamp(g, x + 28, y - 30, 15, 'cleanse', TEAL, -0.1); return; }
  if (d.weapon) { for (const dx of [-34, 34]) { rr(g, x + dx - 4, y - 56, 8, 56, 2, '#6a4428', INK, 1.2); } rr(g, x - 44, y - 58, 88, 8, 3, '#8a5a30', INK, 1.2); g.save(); g.translate(x, y - 58); g.rotate(-0.95); weaponIcon(g, d.weapon, 0, 0, 0.92); g.restore(); return; }
  if (d.misc === 'supply') { ell(g, x + 3, y - 2, 46, 10, 'rgba(40,24,14,0.3)'); part(g, p => { p.moveTo(x - 46, y - 4); p.quadraticCurveTo(x - 50, y - 50, x - 10, y - 58); p.lineTo(x + 10, y - 58); p.quadraticCurveTo(x + 50, y - 50, x + 46, y - 4); p.closePath(); }, '#2f4d7e', E(x + 18, y - 26, 26, 30), { lw: 1.4 }); for (let i = 0; i < 6; i++) ell(g, x - 30 + i * 12, y - 30 + (i % 2) * 10, 2.4, 2.4, '#efe4c8'); part(g, p => { p.moveTo(x - 10, y - 58); p.lineTo(x - 22, y - 76); p.lineTo(x - 4, y - 66); p.lineTo(x + 6, y - 80); p.lineTo(x + 10, y - 58); p.closePath(); }, '#2f4d7e', null, { lw: 1.2 }); for (const [dx, rot, col] of [[-12, -0.3, '#efe4c8'], [2, 0.05, '#f6eedb'], [15, 0.35, '#efe4c8']]) { g.save(); g.translate(x + dx, y - 56); g.rotate(rot); rr(g, -8, -22, 16, 22, 2, col, INK, 1); rr(g, -8, -22, 16, 5, 2, '#5a4a8a'); g.restore(); } return; }
  // 조련장 (나무 기둥 그림) · 그 밖
  rr(g, x - 30, y - 10, 60, 10, 3, '#6a4428', INK, 1.2); miscIcon(g, d.misc === 'train' ? 'train' : d.misc || 'burn', x, y - 46, 1.6);
}
// 나무 값표 (끈에 매달려 흔들린다)
// 나무 값표: 위에 물건 이름, 아래에 값
function priceTag(g, x, y, price, ok, sold, t, name) {
  const sw = Math.sin(t * 1.7 + x * 0.05) * 0.04, w = 132, h = 50;
  line(g, [x, y - 12, x, y], '#5a4030', 1.4);
  g.save(); g.translate(x, y); g.rotate(sw); rr(g, -w / 2 + 2, 3, w, h, 6, 'rgba(40,24,14,0.3)'); rr(g, -w / 2, 0, w, h, 6, sold ? '#b5a689' : '#f1e6c8', '#5a4030', 1.8); ell(g, 0, 5, 2.2, 2.2, '#5a4030');
  text(g, name, 0, 17, { size: 16, font: FONT_B, fill: '#3a2a1a', maxW: w - 14 });
  if (sold) text(g, '팔림', 0, 37, { size: 17, font: FONT_B, fill: '#5a4a3a' }); else { g.font = `400 18px ${FONT_B}`; const pw = g.measureText(String(price)).width; icon.coin(g, -pw / 2 - 6, 37, 8); text(g, String(price), 8, 37.5, { size: 18, font: FONT_B, fill: ok ? INK : RED }); }
  g.restore();
}
export class MarketOverlay extends Overlay {
  constructor(o) { super(); this.items = o.items; this.onDone = o.onDone; this.sel = -1; this.line = '어서 오시오! 천천히 골라 보시오.'; this.lineT = 0; this.bought = 0; }
  spots() {
    // 패는 뒤 선반에, 나머지는 앞 진열대에
    const cards = [], rest = []; this.items.forEach((it, i) => (it.kind === 'card' ? cards : rest).push(i));
    const place = (list, row) => list.map((i, k) => ({ i, row, x: list.length <= 4 ? COLS[k] : 400 + k * (636 / (list.length - 1)), y: row ? COUNTER_Y : SHELF_Y - 2 }));
    return place(cards.slice(0, 5), 0).concat(place(rest.concat(cards.slice(5)), 1));
  }
  say(s) { this.line = s; this.lineT = 0; }
  draw(g, dt) {
    const r = G.run, t = this.t; this.lineT += dt;
    g.drawImage(marketBG(), 0, 0, W, H);
    // 장사꾼: 진열대 왼쪽에서 손님을 부른다
    g.save(); g.globalAlpha = 0.35; ell(g, 164, 602, 40, 8, '#2a1a10'); g.restore(); puppet(g, 'merchant', 160, 600, 1.75, t, { act: this.lineT < 1.4 ? 'talk' : 'idle', face: 1, noStick: true });
    const sp = this.spots();
    for (const s of sp) {
      const it = this.items[s.i], d = describeReward(it), sel = this.sel === s.i, lift = sel ? -8 - Math.sin(t * 4) * 2 : 0, hw = s.row ? 70 : 54, top = s.row ? s.y - 104 : s.y - 160;
      if (!this.left && tapped('mk' + s.i, s.x - hw, top, hw * 2, s.y - top + 46)) { this.sel = s.i; sfx('card'); this.say(it.sold ? '그건 이미 팔렸소.' : `${d.name}! 좋은 물건이오.`); }
      g.save(); if (it.sold) g.globalAlpha = 0.45;
      if (sel) glow(g, s.x, s.y - (s.row ? 40 : 70), 90, '255,226,150', 0.5 + 0.15 * Math.sin(t * 5));
      g.translate(0, lift); good(g, it, d, s.x, s.y, s.row, t); g.restore();
      if (it.sold) stamp(g, s.x + 26, s.y - (s.row ? 40 : 76), 24, 'get', RED, -0.14);
      priceTag(g, s.x, s.row ? s.y + 26 : s.y + 26, it.price, r.gold >= it.price, it.sold, t, d.name);
    }
    // 장사꾼의 말
    { const k = clamp(this.lineT / 0.25, 0, 1); g.save(); g.globalAlpha = k; g.font = `400 18px ${FONT_B}`; const w = Math.min(330, g.measureText(this.line).width + 34), bx = 34, by = 352; rr(g, bx, by, w, 42, 12, '#fffaf0', INK, 2); poly(g, [bx + 70, by + 40, bx + 92, by + 40, bx + 76, by + 60], '#fffaf0'); line(g, [bx + 70, by + 41, bx + 76, by + 60, bx + 92, by + 41], INK, 2); text(g, this.line, bx + w / 2, by + 21, { size: 18, font: FONT_B, maxW: w - 20 }); g.restore(); }
    // 엽전 주머니
    panel(g, 1078, 14, 186, 48, 'tag'); icon.coin(g, 1104, 38, 13); text(g, `엽전 ${r.gold}`, 1180, 39, { size: 22, font: FONT_B, maxW: 140 });
    if (button(g, 'mkdeck', 14, 12, 220, 52, `덱 살피기 · ${r.deck.length}장`, { style: 'wood', size: 21 })) this.deck({});
    // 고른 물건: 아래 한지 두루마리에 이름과 쓰임, 사기 단추
    const it = this.items[this.sel];
    if (it) {
      const d = describeReward(it), ok = r.gold >= it.price, x = 290, y = 612, w = 690, h = 98;
      rr(g, x + 3, y + 5, w, h, 8, 'rgba(40,24,14,0.35)'); rr(g, x, y, w, h, 8, '#f6eedb', '#5a4030', 2.2); rr(g, x - 10, y - 4, 14, h + 8, 6, '#8a5a30', INK, 1.4); rr(g, x + w - 4, y - 4, 14, h + 8, 6, '#8a5a30', INK, 1.4);
      rr(g, x + 22, y + 12, 94, 24, 6, COL[d.col] || INDIGO); text(g, d.title, x + 69, y + 24.5, { size: 14.5, fill: C.cream, maxW: 86 });
      text(g, d.name, x + 128, y + 25, { size: 22, font: FONT_B, align: 'left', maxW: 330 });
      textBlock(g, d.desc.split('\n').join(' · '), x + 22, y + 56, 440, 22, { size: 17, align: 'left', fill: '#3a3026', weight: 400 });
      if (it.sold) stamp(g, x + w - 110, y + h / 2, 30, 'get', RED, -0.12);
      else if (button(g, 'mkbuy', x + w - 210, y + 18, 190, 62, `사기 · 엽전 ${it.price}`, { style: ok ? 'red' : 'grey', size: 22 })) this.buy(it, d);
    } else { const bob = Math.sin(t * 3) * 2; rr(g, 433, 631 + bob, 414, 54, 8, 'rgba(40,24,14,0.3)'); rr(g, 430, 626 + bob, 414, 54, 8, '#f6eedb', '#5a4030', 2); rr(g, 420, 622 + bob, 14, 62, 6, '#8a5a30', INK, 1.4); rr(g, 840, 622 + bob, 14, 62, 6, '#8a5a30', INK, 1.4); text(g, '물건을 눌러 살펴보세요', 637, 654 + bob, { size: 22, font: FONT_B, fill: INK }); }
    if (!this.left && button(g, 'mkleave', 1004, 632, 262, 66, '장터를 떠난다', { size: 27 })) { this.left = true; this.say('또 오시오!'); sfx('click'); this.onDone(); }
  }
  buy(it, d) {
    const r = G.run, s = this.spots().find(q => q.i === this.items.indexOf(it)) || { x: 640, y: 400 };
    if (r.gold < it.price) { sfx('deny'); this.say('엽전이 모자라오.'); return; }
    if (it.kind === 'burn') this.deck({ mode: 'burn', onPick: uid => { const c = removeCard(uid); this.sub = null; if (!c) return; buyItem(it); this.say(`[${cardName(c)}] 을(를) 태웠소.`); sfx('coin'); } });
    else if (it.kind === 'trainPick') this.deck({ mode: 'up', title: '조련장', filter: isUnit, onPick: uid => { const c = upgradeCard(uid); this.sub = null; if (!c) return; buyItem(it); this.say(`[${cardName(c)}] 조련 완료!`); sfx('coin'); } });
    else if (buyItem(it)) {
      sfx('coin'); this.say(['잘 골랐소!', '좋은 데 쓰시오.', '덤으로 웃음 하나 얹었소!'][this.bought++ % 3]);
      for (let q = 0; q < 4; q++) juice.fly({ draw: (gg, px, py, k) => icon.coin(gg, px, py, 12 * k, true), x0: 1104, y0: 38, x1: s.x, y1: s.y - 40, s0: 0.9, s1: 0.7, arc: 30, delay: q * 0.05, dur: 0.4 });
      if (d.relic && it.kind === 'relic') juice.reveal({ icon: (gg, px, py, k) => relicIcon(gg, d.relic, px, py, k), name: d.name, desc: d.desc, to: SPOT.relic, title: '보물을 샀다' });
      else if (it.kind === 'card') juice.fly({ draw: (gg, px, py, k) => cardFace(gg, it, px - 44 * k, py - 57 * k, 88 * k, 114 * k), x0: s.x, y0: s.y - 80, x1: SPOT.deck[0], y1: SPOT.deck[1], s0: 1.2, s1: 0.3, arc: 40, delay: 0.2 });
      else juice.burst(s.x, s.y - 40, '#f0d264', 12);
      if (it.kind === 'weapon') this.deck({ weapon: it.id });
    }
  }
}

// ═════════════════════════ 주막 ═════════════════════════
// 달밤의 초가 주막: 창호지에 불빛이 새고, 장대에 용수가 걸리고, 가마솥에서 김이 오른다.
// 평상 위의 국밥·보따리·병법서와 마당의 목인·술상을 눌러 고른다. 주모는 가마솥 곁에서 이 고개의 옛이야기를 들려준다
let TBG = null;
function tavernBG() {
  if (TBG) return TBG;
  TBG = bakeScene(g => {
    const R = rng(808);
    const sky = g.createLinearGradient(0, 0, 0, 360); sky.addColorStop(0, '#11172f'); sky.addColorStop(0.7, '#2a2a52'); sky.addColorStop(1, '#4a3e62'); g.fillStyle = sky; g.fillRect(0, 0, W, 380);
    for (let i = 0; i < 90; i++) { g.globalAlpha = 0.3 + R() * 0.6; const r = 0.5 + R() * 1.2; ell(g, R() * W, R() * 230, r, r, '#f6efdc'); } g.globalAlpha = 1;
    { const mx = 1150, my = 86; const gr = g.createRadialGradient(mx, my, 30, mx, my, 170); gr.addColorStop(0, 'rgba(255,236,190,0.3)'); gr.addColorStop(1, 'rgba(255,236,190,0)'); g.fillStyle = gr; g.fillRect(mx - 170, my - 170, 340, 340); g.save(); g.shadowColor = 'rgba(255,230,170,0.8)'; g.shadowBlur = 24; ell(g, mx, my, 40, 40, '#fbf0cf'); g.restore(); }
    ridgeFill(g, x => 300 - 60 * Math.exp(-(((x - 260) / 220) ** 2)) - 30 * Math.sin(x * 0.006 + 1), '#252c4a', 0, { sh: 'rgba(0,0,10,0.5)', rim: 0.3, rimCol: '#c9c6e0' });
    // 땅: 밤의 마당
    const gd = g.createLinearGradient(0, 380, 0, H); gd.addColorStop(0, '#3a3244'); gd.addColorStop(1, '#2a2430'); g.fillStyle = gd; g.fillRect(0, 380, W, H - 380);
    fibers(g, 0, 384, W, H - 384, 700, R, 0.08, ['#8a7a90', '#000008']);
    // 싸리 울타리 (왼쪽 뒤)
    for (let x = 0; x < 470; x += 7) { const h = 58 + Math.sin(x * 0.3) * 6 + R() * 6; line(g, [x, 404, x + (R() - 0.5) * 3, 404 - h], R() < 0.5 ? '#4a3a30' : '#5a4636', 2.2); }
    line(g, [0, 372, 470, 372], '#3a2c24', 3); line(g, [0, 392, 470, 392], '#3a2c24', 3);
    // 감나무 (왼쪽): 굽은 줄기와 가지, 주홍빛 감
    path(g, p => { p.moveTo(110, 410); p.quadraticCurveTo(96, 330, 130, 250); p.quadraticCurveTo(150, 200, 120, 150); p.lineTo(138, 148); p.quadraticCurveTo(170, 210, 150, 260); p.quadraticCurveTo(128, 330, 140, 410); p.closePath(); }, '#3a2a24', INK, 1.4);
    for (const [x0, y0, x1, y1] of [[130, 250, 40, 190], [140, 210, 250, 150], [128, 170, 60, 110], [134, 160, 200, 90], [150, 260, 260, 236]]) { line(g, [x0, y0, x1, y1], INK, 6); line(g, [x0, y0, x1, y1], '#3a2a24', 4); }
    for (let i = 0; i < 26; i++) { const x = 40 + R() * 230, y = 90 + R() * 160; ell(g, x, y, 7, 4, '#2a4038', null, 0, R() * 3); }
    for (let i = 0; i < 14; i++) { const x = 50 + R() * 210, y = 100 + R() * 150; ell(g, x, y, 6.5, 6, '#e07a2a', INK, 1); ell(g, x - 2, y - 2, 2, 1.6, 'rgba(255,220,160,0.7)'); line(g, [x - 3, y - 6, x + 3, y - 6], '#2a4038', 2); }
    // 초가 주막
    const bx0 = 486, bx1 = 1236, base = 384;
    part(g, RECT(bx0 - 6, base, bx1 - bx0 + 12, 22), '#7c7468', RECT(bx0 - 6, base + 14, bx1 - bx0 + 12, 8), { lw: 1.4 }); for (let x = bx0 + 40; x < bx1; x += 60) line(g, [x, base + 2, x, base + 20], 'rgba(20,16,14,0.5)', 1.2);
    // 벽과 기둥
    part(g, RECT(bx0, 236, bx1 - bx0, base - 236), '#d9c399', RECT(bx0, 330, bx1 - bx0, base - 330), { shc: '#5a3c26', lw: 1.4 });
    const pillars = [bx0 + 6, 680, 870, 1050, bx1 - 14];
    // 창호지 창 둘 (불빛)과 문
    for (const [x0, w] of [[700, 150], [884, 150]]) { rr(g, x0, 254, w, 70, 2, '#f6d68a', '#3a2418', 3); g.save(); g.globalAlpha = 0.55; for (let k = 1; k < 6; k++) line(g, [x0 + k * w / 6, 256, x0 + k * w / 6, 322], '#8a5a30', 1.4); for (let k = 1; k < 3; k++) line(g, [x0 + 2, 254 + k * 23, x0 + w - 2, 254 + k * 23], '#8a5a30', 1.4); g.restore(); }
    rr(g, 520, 250, 140, 128, 2, '#6a4428', '#2a1a10', 2.4); g.save(); g.globalAlpha = 0.6; for (let k = 1; k < 4; k++) line(g, [520 + k * 35, 252, 520 + k * 35, 376], '#3a2414', 1.4); for (let k = 1; k < 5; k++) line(g, [522, 250 + k * 26, 658, 250 + k * 26], '#3a2414', 1.4); g.restore();
    rr(g, 1070, 254, 146, 70, 2, '#4a3a30', '#2a1a10', 2.4);
    for (const x of pillars) { rr(g, x, 232, 14, base - 232, 2, '#7a4a2c', INK, 1.4); g.fillStyle = 'rgba(255,220,170,0.2)'; g.fillRect(x + 3, 236, 3, base - 240); }
    // 툇마루
    part(g, RECT(bx0 + 10, 350, bx1 - bx0 - 20, 12), '#9a6a3c', RECT(bx0 + 10, 358, bx1 - bx0 - 20, 4), { lw: 1.4 }); for (let x = bx0 + 60; x < bx1 - 40; x += 120) rr(g, x, 362, 10, 22, 1, '#6a4428', INK, 1);
    // 초가지붕: 둥글게 부풀고 새끼줄을 그물처럼 얽었다
    const roof = p => { p.moveTo(bx0 - 46, 246); p.quadraticCurveTo(bx0 - 30, 160, bx0 + 70, 140); p.lineTo(bx1 - 70, 140); p.quadraticCurveTo(bx1 + 30, 160, bx1 + 46, 246); p.quadraticCurveTo((bx0 + bx1) / 2, 268, bx0 - 46, 246); p.closePath(); };
    part(g, roof, '#c9a66a', p => { p.moveTo(bx0 - 46, 246); p.quadraticCurveTo((bx0 + bx1) / 2, 268, bx1 + 46, 246); p.lineTo(bx1 + 40, 222); p.quadraticCurveTo((bx0 + bx1) / 2, 240, bx0 - 40, 222); p.closePath(); }, { hi: p => { p.moveTo(bx0 + 70, 142); p.lineTo(bx1 - 70, 142); p.lineTo(bx1 - 80, 158); p.lineTo(bx0 + 80, 158); p.closePath(); }, hk: 0.2, lw: 1.8 });
    g.save(); g.beginPath(); roof(g); g.clip();
    for (let i = 0; i < 160; i++) { const x = bx0 - 40 + R() * (bx1 - bx0 + 80), y = 150 + R() * 110; line(g, [x, y, x + (R() - 0.5) * 6, y + 10 + R() * 10], 'rgba(120,90,40,0.4)', 1); }
    for (let x = bx0 - 120; x < bx1 + 120; x += 46) { line(g, [x, 140, x + 120, 268], 'rgba(90,64,30,0.6)', 1.4); line(g, [x + 120, 140, x, 268], 'rgba(90,64,30,0.6)', 1.4); }
    g.restore();
    curve(g, p => { p.moveTo(bx0 - 46, 246); p.quadraticCurveTo((bx0 + bx1) / 2, 268, bx1 + 46, 246); }, '#8a6a3a', 2.4);
    for (let x = bx0 - 40; x < bx1 + 40; x += 9) line(g, [x, 247 + Math.sin((x - bx0) / (bx1 - bx0) * Math.PI) * 18, x + 1, 256 + Math.sin((x - bx0) / (bx1 - bx0) * Math.PI) * 18], 'rgba(120,90,40,0.6)', 1.2);
    // 창의 불빛이 마당에 고인다
    for (const x of [775, 959]) { const gr = g.createRadialGradient(x, 420, 10, x, 420, 170); gr.addColorStop(0, 'rgba(255,200,120,0.28)'); gr.addColorStop(1, 'rgba(255,200,120,0)'); g.fillStyle = gr; g.fillRect(x - 170, 330, 340, 260); }
    // 용수 간판: 대나무 장대 끝에 대로 엮은 용수와 붉은 헝겊을 매단다 (주막이라는 표시)
    line(g, [458, 410, 452, 120], INK, 6); line(g, [458, 410, 452, 120], '#9a8a4a', 3.6); for (let y = 140; y < 400; y += 34) line(g, [449, y, 458, y], '#6a5a2a', 1.4);
    line(g, [452, 124, 392, 132], INK, 4.4); line(g, [452, 124, 392, 132], '#9a8a4a', 2.4); line(g, [396, 132, 396, 146], '#5a4030', 1.6);
    part(g, p => { p.moveTo(384, 146); p.lineTo(408, 146); p.lineTo(416, 232); p.quadraticCurveTo(396, 242, 376, 232); p.closePath(); }, '#c9a65a', RECT(398, 146, 20, 96), { lw: 1.4 }); for (let y = 156; y < 232; y += 9) line(g, [384 - (y - 146) * 0.09, y, 408 + (y - 146) * 0.09, y + 2], 'rgba(110,80,30,0.6)', 1); for (let k = 0; k < 4; k++) line(g, [389 + k * 5, 148, 383 + k * 9, 236], 'rgba(110,80,30,0.45)', 0.9);
    path(g, P(404, 232, 412, 232, 418, 270, 408, 266), '#c8402f', INK, 1);
    // 장독대 (오른쪽 앞)
    part(g, RECT(1076, 436, 196, 18), '#7c7468', null, { lw: 1.4 });
    for (const [x, s] of [[1110, 1.1], [1160, 1.3], [1216, 1.15], [1134, 0.7], [1246, 0.75]]) { const y = 438; part(g, p => { p.moveTo(x - 14 * s, y); p.quadraticCurveTo(x - 26 * s, y - 26 * s, x - 14 * s, y - 44 * s); p.lineTo(x + 14 * s, y - 44 * s); p.quadraticCurveTo(x + 26 * s, y - 26 * s, x + 14 * s, y); p.closePath(); }, '#5a3420', E(x + 10 * s, y - 22 * s, 12 * s, 22 * s), { hi: E(x - 9 * s, y - 28 * s, 3 * s, 9 * s), hk: 0.4, lw: 1.4 }); part(g, E(x, y - 46 * s, 15 * s, 5 * s), '#4a2a18', null, { lw: 1.2 }); }
    // 아궁이 화덕과 가마솥 받침 (불과 김은 매 장면)
    part(g, p => { p.moveTo(560, 452); p.lineTo(560, 418); p.quadraticCurveTo(600, 400, 640, 418); p.lineTo(640, 452); p.closePath(); }, '#7c7468', null, { lw: 1.4 }); for (const [x, y] of [[572, 428], [598, 418], [622, 428], [578, 444], [618, 444]]) ell(g, x, y, 9, 6, 'rgba(60,50,44,0.5)');
    ell(g, 600, 446, 16, 8, '#1a0e08');
    // 평상
    part(g, P(70, 512, 740, 512, 760, 548, 50, 548), '#a2703e', null, { lw: 1.8 }); for (let x = 90; x < 740; x += 46) line(g, [x, 513, x - 8, 547], 'rgba(60,36,20,0.5)', 1.2);
    part(g, RECT(50, 548, 710, 16), '#7a4a2c', null, { lw: 1.6 }); for (const x of [64, 400, 736]) rr(g, x - 7, 564, 14, 34, 2, '#5a3820', INK, 1.4);
    g.save(); g.globalAlpha = 0.4; ell(g, 400, 604, 380, 14, '#0a0610'); g.restore();
  });
  return TBG;
}
// 고르는 물건들 (원점 = 바닥 가운데)
// 이름판에 쓰는 짧은 쓰임
const SHORT = { rest: '다음 싸움 사기 +4', supply: '기본 전술 패 석 장', study: '전술 패 하나를 강화(+)', train: '병력·영웅 패 +1단', feast: '엽전 90 → 병력 패 둘 +1단' };
const TAV_SPOT = { rest: [200, 518], supply: [410, 518], study: [618, 518], train: [880, 592], feast: [1100, 598] };
const PLAQUE_X = { rest: 190, supply: 415, study: 640, train: 865, feast: 1090 };   // 이름판은 고르게 늘어선다
function tavernThing(g, id, x, y, t, on) {
  if (id === 'rest') { // 소반 위 국밥 한 그릇, 김이 오른다
    rr(g, x - 6, y - 22, 12, 22, 2, '#6a4428', INK, 1.2); part(g, E(x, y - 26, 46, 11), '#8a5a30', null, { lw: 1.4 });
    part(g, p => { p.moveTo(x - 26, y - 36); p.quadraticCurveTo(x - 24, y - 16, x, y - 16); p.quadraticCurveTo(x + 24, y - 16, x + 26, y - 36); p.closePath(); }, '#efe6cf', null, { lw: 1.4 }); ell(g, x, y - 36, 26, 7, '#c98a4a', INK, 1.2); ell(g, x - 8, y - 37, 5, 2, '#f3ecdd'); ell(g, x + 7, y - 36, 4, 2, '#7a9a5a');
    for (let k = 0; k < 3; k++) { const ph = t * 1.4 + k * 2.1, a = 0.35 * (0.5 + 0.5 * Math.sin(ph)); g.globalAlpha = a; curve(g, p => { const sx = x - 10 + k * 10; p.moveTo(sx, y - 46); p.quadraticCurveTo(sx - 8 + Math.sin(ph) * 4, y - 62, sx + 2, y - 76); p.quadraticCurveTo(sx + 10, y - 88, sx + 2, y - 100); }, '#f6efe0', 2.4); } g.globalAlpha = 1;
  } else if (id === 'supply') { // 주모가 싸 준 보따리
    part(g, p => { p.moveTo(x - 40, y - 4); p.quadraticCurveTo(x - 44, y - 44, x - 8, y - 50); p.lineTo(x + 8, y - 50); p.quadraticCurveTo(x + 44, y - 44, x + 40, y - 4); p.closePath(); }, '#a8322a', E(x + 16, y - 24, 22, 26), { lw: 1.4 }); for (let i = 0; i < 6; i++) ell(g, x - 26 + i * 10, y - 26 + (i % 2) * 9, 2.2, 2.2, '#f3dca0');
    part(g, p => { p.moveTo(x - 8, y - 50); p.lineTo(x - 20, y - 68); p.lineTo(x - 2, y - 58); p.lineTo(x + 8, y - 72); p.lineTo(x + 8, y - 50); p.closePath(); }, '#a8322a', null, { lw: 1.2 });
  } else if (id === 'study') { // 등잔불 아래 병법서
    for (let k = 0; k < 3; k++) rr(g, x - 34 + k * 2, y - 12 - k * 10, 50, 10, 2, ['#2f4d7e', '#8a2a26', '#3f6b5c'][k], INK, 1.2); rr(g, x - 30, y - 40, 44, 6, 1, '#efe6cf', INK, 0.8);
    rr(g, x + 26, y - 8, 22, 8, 2, '#6a4428', INK, 1); line(g, [x + 37, y - 8, x + 37, y - 46], '#6a4428', 3); ell(g, x + 37, y - 48, 9, 4, '#8a6a4a', INK, 1); const f = 1 + Math.sin(t * 11) * 0.08; path(g, p => { p.moveTo(x + 37, y - 66 * f); p.quadraticCurveTo(x + 44, y - 54, x + 37, y - 50); p.quadraticCurveTo(x + 30, y - 54, x + 37, y - 66 * f); }, '#ffc85a', '#e0702a', 1); glow(g, x + 37, y - 58, 46, '255,200,120', 0.55);
  } else if (id === 'train') { // 짚을 감은 목인
    ell(g, x + 4, y + 2, 34, 8, 'rgba(10,6,16,0.4)'); rr(g, x - 9, y - 120, 18, 120, 3, '#8a5a30', INK, 1.4); rr(g, x - 40, y - 96, 80, 9, 3, '#6a4428', INK, 1.4); rr(g, x - 34, y - 64, 68, 8, 3, '#6a4428', INK, 1.4);
    for (const yy of [y - 112, y - 82, y - 40]) { rr(g, x - 12, yy, 24, 14, 3, '#d9b24a', INK, 1.1); for (const dx of [-6, 0, 6]) line(g, [x + dx, yy + 2, x + dx + 1, yy + 12], 'rgba(110,80,30,0.6)', 0.8); }
    g.save(); g.translate(x + 30, y - 10); g.rotate(-0.4); rr(g, -3, -70, 6, 70, 2, '#e2c48c', INK, 1.1); rr(g, -7, -2, 14, 4, 1, '#6a4428', INK, 0.9); g.restore();
  } else if (id === 'feast') { // 술상: 호리병과 잔, 전 한 접시, 떡
    ell(g, x + 4, y + 2, 66, 10, 'rgba(10,6,16,0.4)'); for (const dx of [-46, 46]) rr(g, x + dx - 5, y - 30, 10, 30, 2, '#5a3820', INK, 1.2); part(g, RECT(x - 62, y - 40, 124, 12), '#8a2a26', RECT(x - 62, y - 32, 124, 4), { lw: 1.4 });
    part(g, p => { p.moveTo(x - 30, y - 40); p.quadraticCurveTo(x - 46, y - 56, x - 34, y - 70); p.quadraticCurveTo(x - 40, y - 82, x - 32, y - 92); p.lineTo(x - 26, y - 92); p.quadraticCurveTo(x - 18, y - 82, x - 24, y - 70); p.quadraticCurveTo(x - 12, y - 56, x - 28, y - 40); p.closePath(); }, '#efe6cf', null, { lw: 1.3 }); line(g, [x - 30, y - 74, x - 28, y - 74], '#2f4d7e', 3);
    for (const dx of [-6, 8]) part(g, P(x + dx - 5, y - 52, x + dx + 5, y - 52, x + dx + 3, y - 40, x + dx - 3, y - 40), '#efe6cf', null, { lw: 1 });
    part(g, E(x + 34, y - 44, 20, 6), '#efe6cf', null, { lw: 1.1 }); for (const [dx, dy] of [[-8, -2], [4, -3], [12, 0]]) ell(g, x + 34 + dx, y - 46 + dy, 6, 3, '#d9a04a', INK, 0.8);
  }
  if (!on) { g.save(); g.globalAlpha = 0.5; ell(g, x, y - 40, 50, 46, 'rgba(20,16,24,0.5)'); g.restore(); }
}
export class TavernOverlay extends Overlay {
  constructor(o) { super(); this.tale = o.tale || null; this.choices = o.choices; this.onDone = o.onDone; this.result = null; this.hover = null; }
  get by() { const m = {}; for (const c of this.choices) m[c.id] = c; return m; }
  pick(c) {
    const r = G.run;
    if (c.deck) this.deck({ mode: c.deck, filter: c.filter, title: c.label, onPick: uid => { const before = cardName(r.deck.find(q => q.uid === uid)), card = upgradeCard(uid); this.sub = null; if (!card) return; this.result = [c.story, `${isUnit(card) ? '조련' : '패 강화'}: [${before}] → [${cardName(card)}]`]; this.rt = 0; save(); } });
    else { this.result = c.pick(); this.rt = 0; save(); }
  }
  draw(g, dt) {
    const r = G.run, t = this.t, by = this.by; if (this.result) this.rt = (this.rt || 0) + dt;
    g.drawImage(tavernBG(), 0, 0, W, H);
    // 창호지 불빛이 살짝 일렁인다
    glow(g, 775, 289, 130, '255,200,120', 0.22 + 0.04 * Math.sin(t * 2.3)); glow(g, 959, 289, 130, '255,200,120', 0.22 + 0.04 * Math.sin(t * 2.7 + 1));
    // 아궁이 불과 가마솥, 김
    { const f = 0.8 + 0.2 * Math.sin(t * 13) * Math.sin(t * 7.1); glow(g, 600, 446, 50, '255,140,60', 0.7 * f); for (let k = 0; k < 3; k++) path(g, p => { const x = 590 + k * 10, h = (16 + k * 4) * (0.8 + 0.3 * Math.sin(t * 9 + k)); p.moveTo(x - 6, 452); p.quadraticCurveTo(x - 4, 452 - h * 0.6, x, 452 - h); p.quadraticCurveTo(x + 4, 452 - h * 0.6, x + 6, 452); p.closePath(); }, ['#ff9a2e', '#ffc85a', '#ff7a2e'][k]);
      part(g, p => { p.moveTo(566, 418); p.quadraticCurveTo(568, 446, 600, 448); p.quadraticCurveTo(632, 446, 634, 418); p.closePath(); }, '#1e1c22', null, { lw: 1.6 }); part(g, E(600, 416, 38, 9), '#2a2830', null, { lw: 1.4 }); ell(g, 600, 408, 8, 4, '#3a3840', INK, 1);
      for (let k = 0; k < 4; k++) { const ph = t * 0.8 + k * 1.6, yy = 400 - ((t * 22 + k * 30) % 120), a = 0.3 * (1 - (400 - yy) / 120); g.globalAlpha = Math.max(0, a); ell(g, 594 + k * 6 + Math.sin(ph) * 10, yy, 12 + (400 - yy) * 0.12, 7 + (400 - yy) * 0.06, '#d9d6e6'); } g.globalAlpha = 1; }
    // 주모와 영웅
    const tl = this.tale && this.tale.tale, li = tl ? Math.floor(t / 3.6) % tl.lines.length : 0;
    puppet(g, 'jumo', 690, 448, 1.6, t, { act: !this.result && tl ? 'talk' : 'idle', face: 1, noStick: true });
    puppet(g, r.hero, 838, 452, 1.6, t, { act: this.result ? (this.rt < 0.4 ? 'tremble' : 'hop') : 'idle', face: -1, noStick: true });
    // 반딧불
    for (let i = 0; i < 12; i++) { const ph = i * 2.3, x = 60 + ((i * 113) % 1160) + Math.sin(t * 0.6 + ph) * 26, y = 330 + ((i * 47) % 160) + Math.sin(t * 1.1 + ph) * 12, a = clamp(Math.sin(t * 1.6 + ph), 0, 1); g.globalAlpha = a * 0.9; ell(g, x, y, 1.6, 1.6, '#fff2b0'); g.globalAlpha = 1; glow(g, x, y, 8, '255,230,140', a * 0.35); }
    // 고르는 것들과 이름판
    const order = ['rest', 'supply', 'study', 'train', 'feast'];
    for (const id of order) {
      const c = by[id], [x, y] = TAV_SPOT[id], lack = c && c.cost && r.gold < c.cost, on = !!c && !lack, sel = this.hover === id;
      const hitY = id === 'train' ? y - 130 : y - 90, qx = PLAQUE_X[id], hx = Math.min(x, qx) - 98, hw = 196 + Math.abs(x - qx);
      if (!this.result && !this.left && on && tapped('tv' + id, hx, hitY, hw, 690 - hitY)) { this.hover = id; sfx('card'); this.pick(c); }
      const dn = on && !this.result && isDown('tv' + id, hx, hitY, hw, 690 - hitY);
      if (on && !this.result) glow(g, x, y - 46, 80, '255,220,150', 0.16 + 0.1 * Math.sin(t * 3 + x));
      g.save(); if (dn) g.translate(0, -5); tavernThing(g, id, x, y, t, on && !this.result); g.restore();
      // 나무 이름판
      const px = qx - 98, py = 612, pw = 196, ph = 70;
      g.save(); if (!on || this.result) g.globalAlpha = 0.6;
      rr(g, px + 3, py + 5, pw, ph, 8, 'rgba(10,6,16,0.45)'); rr(g, px, py + (dn ? 3 : 0), pw, ph, 8, '#8a5a30', '#2a1a10', 2); rr(g, px + 6, py + 6 + (dn ? 3 : 0), pw - 12, ph - 12, 5, '#f1e6c8', 'rgba(60,40,20,0.5)', 1);
      const lab = c ? c.label : ({ rest: '푹 쉰다', supply: '보급을 받는다', study: '전술을 익힌다', train: '조련한다', feast: '잔치를 벌인다' })[id];
      text(g, lab, qx, py + 25 + (dn ? 3 : 0), { size: 20, font: FONT_B, maxW: pw - 24 });
      text(g, !c ? '고를 패가 없다' : lack ? `엽전 ${c.cost} 부족` : SHORT[id], qx, py + 50 + (dn ? 3 : 0), { size: 16, fill: lack || !c ? RED : '#4a3a2a', maxW: pw - 16, weight: 400 });
      g.restore();
    }
    // 주모의 옛이야기: 말풍선 한 마디씩
    if (tl && !this.result) {
      const x = 470, y = 24, w = 580, h = 126;
      rr(g, x + 3, y + 5, w, h, 16, 'rgba(10,6,16,0.4)'); rr(g, x, y, w, h, 16, '#fffaf0', INK, 2.2); poly(g, [x + 190, y + h - 2, x + 222, y + h - 2, x + 214, y + h + 26], '#fffaf0'); line(g, [x + 190, y + h - 1, x + 214, y + h + 26, x + 222, y + h - 1], INK, 2.2);
      rr(g, x + 18, y + 14, 210, 26, 6, '#2f6f5c'); text(g, `옛이야기 〈${tl.title}〉`, x + 123, y + 27.5, { size: 15, fill: C.cream, maxW: 200 });
      if (this.tale.fresh) { rr(g, x + w - 148, y + 14, 130, 26, 6, '#b8742a'); text(g, `이야기책 ${this.tale.n}/${this.tale.of}`, x + w - 83, y + 27.5, { size: 13.5, fill: C.cream }); }
      g.globalAlpha = clamp((t % 3.6) / 0.3, 0, 1); textBlock(g, tl.lines[li], x + w / 2, y + 62, w - 50, 26, { size: 18.5, font: FONT_B }); g.globalAlpha = 1;
      for (let m = 0; m < tl.lines.length; m++) ell(g, x + w / 2 + (m - (tl.lines.length - 1) / 2) * 16, y + h - 12, 4, 4, m === li ? '#2f6f5c' : 'rgba(38,42,54,0.22)');
    }
    // 고른 뒤: 한지 두루마리에 결과
    if (this.result) {
      const k = clamp(this.rt / 0.3, 0, 1), rows = this.result.slice(1), x = 330, y = 120, w = 620, h = 120 + rows.length * 62;
      g.save(); g.globalAlpha = k; g.translate(0, (1 - k) * 16);
      rr(g, x + 4, y + 6, w, h, 10, 'rgba(10,6,16,0.45)'); rr(g, x, y, w, h, 10, '#f6eedb', '#5a4030', 2.4); rr(g, x - 12, y - 6, 16, h + 12, 7, '#8a5a30', INK, 1.4); rr(g, x + w - 4, y - 6, 16, h + 12, 7, '#8a5a30', INK, 1.4);
      textBlock(g, this.result[0], x + w / 2, y + 38, w - 60, 26, { size: 19.5, font: FONT_B });
      rows.forEach((s, i) => { const no = BAD.test(s) && !GOOD.test(s), yy = y + 92 + i * 62, ic = resultIcon(s); rr(g, x + 30, yy - 24, w - 60, 50, 8, no ? '#efd9cf' : '#dfe8d4', INK, 1.6); rr(g, x + 30, yy - 24, 7, 50, 3, no ? RED : TEAL); if (ic) { ic(g, x + 68, yy + 1); text(g, s, x + w / 2 + 20, yy + 1, { size: 19, fill: no ? RED : TEAL, maxW: w - 160 }); } else text(g, s, x + w / 2, yy + 1, { size: 19, fill: no ? RED : TEAL, maxW: w - 100 }); });
      g.restore();
      if (!this.said) { this.said = true; sfx('star'); }
      if (!this.left && this.rt > 0.6 && button(g, 'tvgo', 490, y + h + 16, 300, 66, '길을 떠난다', { size: 30 })) { this.left = true; this.onDone(); }
    }
    panel(g, 1078, 14, 186, 48, 'tag'); icon.coin(g, 1104, 38, 13); text(g, `엽전 ${r.gold}`, 1180, 39, { size: 22, font: FONT_B, maxW: 140 });
    if (button(g, 'tvdeck', 14, 12, 220, 52, `덱 살피기 · ${r.deck.length}장`, { style: 'wood', size: 21 })) this.deck({});
  }
}

// ═════════════════════════ 갈림길 ═════════════════════════
// 들판에서 길이 둘로 갈라진다. 갈래목에는 돌무더기와 나무 이정표가 서서 양쪽 길끝을 가리키고, 길끝마다 그곳(장터·주막·보물·강적…)이 보인다
let FBG = null;
const FORK_AT = [640, 468], ENDS = [[250, 318], [1030, 318]];
function forkBG() {
  if (FBG) return FBG;
  FBG = bakeScene(g => {
    const R = rng(4040), T = THEMES.pass;
    const sky = g.createLinearGradient(0, 0, 0, 300); sky.addColorStop(0, '#dcd2b4'); sky.addColorStop(1, '#f2ead6'); g.fillStyle = sky; g.fillRect(0, 0, W, 320);
    cloud(g, 240, 104, 160, '#fbf5e6'); cloud(g, 900, 80, 130, '#fbf5e6'); cloud(g, 1140, 140, 100, '#fbf5e6');
    ridgeFill(g, x => 230 - 70 * Math.exp(-(((x - 300) / 170) ** 2)) - 90 * Math.exp(-(((x - 980) / 200) ** 2)) - 10 * Math.sin(x * 0.02), '#a9b4a2', 0);
    ridgeFill(g, x => 282 - 40 * Math.exp(-(((x - 640) / 260) ** 2)) - 12 * Math.sin(x * 0.015 + 2), '#9dab86', 0);
    const fd = x => 318 + 8 * Math.sin(x * 0.012);
    ridgeFill(g, fd, '#bfc996', 0);
    const gd = g.createLinearGradient(0, 320, 0, H); gd.addColorStop(0, 'rgba(255,250,230,0)'); gd.addColorStop(1, 'rgba(110,120,70,0.25)'); g.fillStyle = gd; g.fillRect(0, 320, W, H - 320);
    fibers(g, 0, 320, W, H - 320, 800, R, 0.1, ['#6a7a40', '#fffbe8']);
    for (let i = 0; i < 70; i++) { const x = R() * W, y = 340 + R() * 370; grassTuft(g, x, y, 0.8 + R() * 0.8, R() < 0.6 ? '#7a8a52' : '#5f7a4a', R); }
    // 길: 아래 넓게 들어와 갈래목에서 둘로 나뉘어 멀어진다
    const road = (pts, w0, w1) => { const L = [], Rr = []; for (let i = 0; i < pts.length; i++) { const [x, y] = pts[i], [ax, ay] = pts[Math.max(0, i - 1)], [bx, by] = pts[Math.min(pts.length - 1, i + 1)], dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1, w = (w0 + (w1 - w0) * i / (pts.length - 1)) / 2; L.push([x - dy / l * w, y + dx / l * w]); Rr.push([x + dy / l * w, y - dx / l * w]); } g.beginPath(); g.moveTo(L[0][0], L[0][1]); for (const [x, y] of L) g.lineTo(x, y); for (let i = Rr.length - 1; i >= 0; i--) g.lineTo(Rr[i][0], Rr[i][1]); g.closePath(); g.save(); g.shadowColor = 'rgba(80,60,30,0.35)'; g.shadowBlur = 6; g.shadowOffsetY = 2; g.fillStyle = '#e3cf9e'; g.fill(); g.restore(); g.save(); g.clip(); fibers(g, 0, 300, W, H - 300, 300, R, 0.14, ['#a08050', '#fffaf0']); g.restore(); g.beginPath(); for (const [x, y] of L) g.lineTo(x, y); st(g, 'rgba(110,84,50,0.5)', 1.4); g.beginPath(); for (const [x, y] of Rr) g.lineTo(x, y); st(g, 'rgba(110,84,50,0.5)', 1.4); };
    const bez = (p0, p1, p2, n = 24) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, a = (1 - t) * (1 - t), b = 2 * t * (1 - t), c = t * t; return [a * p0[0] + b * p1[0] + c * p2[0], a * p0[1] + b * p1[1] + c * p2[1]]; });
    road(bez([640, 740], [640, 560], FORK_AT), 300, 110);
    road(bez(FORK_AT, [420, 430], ENDS[0]), 100, 26); road(bez(FORK_AT, [860, 430], ENDS[1]), 100, 26);
    // 들꽃과 솔, 바위
    for (const [x, y, s, f] of [[90, 380, 0.9, false], [150, 400, 0.6, true], [1190, 390, 0.85, true], [1120, 410, 0.6, false], [470, 340, 0.5, false], [820, 336, 0.46, true]]) padPine(g, x, y, s, T, f);
    for (let i = 0; i < 16; i++) { const x = R() < 0.5 ? 30 + R() * 360 : 900 + R() * 350, y = 560 + R() * 140; paperFlower(g, x, y, 1.1 + R() * 0.5, R() < 0.5 ? '#f3e9cf' : '#e2c47c', '#5f7a4a', R); }
    // 갈래목의 서낭 돌무더기
    const [fx, fy] = FORK_AT; for (const [dx, dy, r] of [[-30, 10, 14], [-10, 12, 16], [12, 10, 14], [30, 12, 12], [-20, -4, 12], [2, -6, 13], [20, -4, 11], [-8, -18, 10], [10, -18, 9], [0, -30, 8]]) ell(g, fx + dx, fy + dy, r, r * 0.75, ['#a59f8f', '#b8b1a0', '#958f80'][(dx + 40) % 3], INK, 1.1);
  });
  return FBG;
}
// 이정표의 화살판 (dir = -1 왼쪽, 1 오른쪽)
function arrowBoard(g, x, y, dir, v, press, t) {
  const w = 214, h = 64, x0 = dir < 0 ? x - w : x, tip = dir < 0 ? x0 - 30 : x0 + w + 30, sw = Math.sin(t * 1.3 + dir) * 0.012;
  g.save(); g.translate(x, y); g.rotate(sw); g.translate(-x, -y + (press ? 3 : 0));
  const sh = p => { if (dir < 0) { p.moveTo(x0 + w, y - h / 2); p.lineTo(x0, y - h / 2); p.lineTo(tip, y); p.lineTo(x0, y + h / 2); p.lineTo(x0 + w, y + h / 2); } else { p.moveTo(x0, y - h / 2); p.lineTo(x0 + w, y - h / 2); p.lineTo(tip, y); p.lineTo(x0 + w, y + h / 2); p.lineTo(x0, y + h / 2); } p.closePath(); };
  g.save(); g.shadowColor = 'rgba(40,24,14,0.45)'; g.shadowBlur = 8; g.shadowOffsetY = 5; path(g, sh, '#8a5a30'); g.restore(); path(g, sh, '#8a5a30', '#2a1a10', 2.2);
  g.save(); g.beginPath(); sh(g); g.clip(); for (let k = 0; k < 6; k++) line(g, [x0 - 40, y - h / 2 + 8 + k * 10, x0 + w + 40, y - h / 2 + 10 + k * 10], 'rgba(60,36,20,0.3)', 1); g.restore();
  const cx = x0 + w / 2 + dir * -4; rr(g, cx - 92, y - 24, 184, 48, 5, '#f1e6c8', 'rgba(60,40,20,0.5)', 1.2);
  seal(g, cx - 64, y, 36, v.ch, v.col); text(g, v.name, cx + 18, y + 1, { size: 28, font: FONT_B, fill: v.col });
  g.restore();
}
export class ForkScene extends Overlay {
  constructor(o) { super(); this.a = o.a; this.b = o.b; this.onPick = o.onPick; this.go = null; }
  draw(g, dt) {
    const t = this.t, r = G.run, k = clamp(t / 0.4, 0, 1);
    g.drawImage(forkBG(), 0, 0, W, H);
    // 길끝마다 그곳이 서 있다
    [this.a, this.b].forEach((st, n) => { const [x, y] = ENDS[n]; g.save(); g.globalAlpha = clamp((t - 0.2 - n * 0.1) / 0.4, 0, 1); drawSpriteSafe(g, st.type, x, y + 6, 0.95); g.restore(); });
    // 이정표: 기둥과 두 화살판
    const [fx, fy] = FORK_AT;
    rr(g, fx - 8, 188, 16, fy - 188 - 6, 3, '#7a4a2c', INK, 1.6); g.fillStyle = 'rgba(255,230,190,0.3)'; g.fillRect(fx - 5, 192, 3, fy - 200); part(g, P(fx - 10, 188, fx + 10, 188, fx, 172), '#6a4428', null, { lw: 1.4 });
    const pick = key => { if (this.left) return; this.left = true; this.go = { key, t: 0 }; sfx('card'); };
    [['a', this.a, -1, 236], ['b', this.b, 1, 318]].forEach(([key, st, dir, y], n) => {
      const v = STOP[st.type], bx = dir < 0 ? fx - 214 - 30 : fx, hit = tapped('fk' + key, dir < 0 ? fx - 274 : fx, y - 34, 274, 68), dn = isDown('fk' + key, dir < 0 ? fx - 274 : fx, y - 34, 274, 68);
      if (t > 0.4 && hit) pick(key);
      g.save(); g.globalAlpha = clamp((t - n * 0.12) / 0.3, 0, 1); arrowBoard(g, fx + (dir < 0 ? -4 : 4), y, dir, v, dn || (this.go && this.go.key === key), t); g.restore();
      // 아래 설명판 (누르면 그 길로)
      const px = n ? 812 : 64, py = 540, pw = 404, ph = 122, hit2 = tapped('fd' + key, px, py, pw, ph), dn2 = isDown('fd' + key, px, py, pw, ph);
      if (t > 0.4 && hit2) pick(key);
      g.save(); g.globalAlpha = clamp((t - 0.2 - n * 0.12) / 0.3, 0, 1); g.translate(0, dn2 ? 3 : 0);
      rr(g, px + 3, py + 6, pw, ph, 10, 'rgba(40,24,14,0.3)'); rr(g, px, py, pw, ph, 10, '#f6eedb', '#5a4030', 2.2); rr(g, px, py, 10, ph, 5, v.col);
      seal(g, px + 58, py + ph / 2, 62, v.ch, v.col); text(g, v.name, px + 104, py + 34, { size: 28, font: FONT_B, align: 'left', fill: v.col });
      textBlock(g, forkDesc(st.type), px + 104, py + 70, pw - 120, 22, { size: 16, align: 'left', fill: '#4a4034', weight: 400 });
      text(g, n ? '오른쪽 길 ▶' : '◀ 왼쪽 길', px + pw - 18, py + 32, { size: 15, font: FONT_B, align: 'right', fill: '#8a6a4a' });
      g.restore();
    });
    // 영웅이 갈래목 앞에서 두리번거린다
    const look = Math.sin(t * 0.9) > 0 ? 1 : -1;
    g.save(); g.globalAlpha = 0.35; ell(g, 640, 652, 40, 8, '#2a1a10'); g.restore();
    puppet(g, r.hero, 640, 648, 1.7, t, { act: this.go ? 'hop' : 'idle', face: this.go ? (this.go.key === 'a' ? -1 : 1) : look, noStick: true });
    { g.save(); g.globalAlpha = k; rr(g, 498, 16, 284, 56, 10, '#8a5a30', '#2a1a10', 2); rr(g, 506, 23, 268, 42, 6, '#f1e6c8', 'rgba(60,40,20,0.5)', 1); text(g, '갈림길 · 어느 길로?', 640, 45, { size: 24, font: FONT_B }); g.restore(); }
    if (this.go) { this.go.t += dt; if (this.go.t > 0.45 && !this.go.done) { this.go.done = true; this.onPick(this.go.key); } }
  }
}
// ═════════════════════════ 보물 터 ═════════════════════════
// 달밤, 오래된 당산나무 아래. 금줄 두른 나무와 마을 어귀의 장승 한 쌍이 지켜보는 가운데 구덩이에서 보물 함을 파낸다.
// 함이 덜컹거리다 열리면 빛기둥이 솟고, 고를 것들이 그 빛을 타고 떠올라 제자리로 퍼진다 (고르는 규칙은 전리품과 같다)
let TRBG = null;
function jangseung(g, x, y, h, male, R) {
  const w = 54, top = y - h, face = top + 30;
  g.save(); g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 10; g.shadowOffsetX = -6; rr(g, x - w / 2, top, w, h, 14, '#7a5a3e'); g.restore();
  rr(g, x - w / 2, top, w, h, 14, '#7a5a3e', INK, 2.2);
  for (let i = 0; i < 9; i++) { const gx = x - w / 2 + 6 + R() * (w - 12); line(g, [gx, top + 90 + R() * 30, gx + (R() - 0.5) * 4, y - 10], 'rgba(40,24,14,0.4)', 1); }
  g.fillStyle = 'rgba(220,230,255,0.16)'; g.fillRect(x + w / 2 - 12, top + 14, 6, h - 24);   // 오른쪽에서 비치는 달빛
  // 모자: 대장군은 높은 관, 여장군은 둥근 족두리
  if (male) { part(g, p => { p.moveTo(x - 26, top + 6); p.lineTo(x - 24, top - 22); p.quadraticCurveTo(x, top - 44, x + 24, top - 22); p.lineTo(x + 26, top + 6); p.closePath(); }, '#1e1c22', null, { lw: 2 }); for (const s of [-1, 1]) part(g, E(x + s * 40, top - 14, 17, 6, s * -0.25), '#1e1c22', null, { lw: 1.8 }); rr(g, x - 30, top + 2, 60, 9, 3, '#2a2830', INK, 1.8); line(g, [x - 22, top - 14, x + 22, top - 14], 'rgba(200,180,120,0.5)', 1.4); }   // 관모: 둥근 모정에 양 날개
  else { part(g, E(x, top - 2, 30, 18), '#3a2a50', null, { lw: 2 }); rr(g, x - 34, top + 6, 68, 9, 4, '#3a2a50', INK, 2); ell(g, x, top - 18, 6, 6, RED, INK, 1.2); }
  // 얼굴: 부릅뜬 눈, 주먹코, 송곳니 드러낸 웃음 (먹과 붉은 칠)
  for (const s of [-1, 1]) { path(g, p => { p.moveTo(x + s * 22, face + 4); p.quadraticCurveTo(x + s * 12, face - 6, x + s * 3, face + 2); }, null, INK, 3.4); ell(g, x + s * 12, face + 16, 9.5, 8.5, '#f3ead6', INK, 1.8); ell(g, x + s * 11, face + 17, 3.6, 3.6, INK); }
  part(g, p => { p.moveTo(x - 5, face + 18); p.lineTo(x - 7, face + 38); p.quadraticCurveTo(x, face + 44, x + 7, face + 38); p.lineTo(x + 5, face + 18); p.closePath(); }, '#9a6a48', null, { lw: 1.6 });
  rr(g, x - 17, face + 50, 34, 13, 5, male ? '#b8402f' : '#c8584a', INK, 1.8); for (const dx of [-8, 0, 8]) line(g, [x + dx, face + 51, x + dx, face + 62], 'rgba(30,20,10,0.5)', 1); for (const s of [-1, 1]) poly(g, [x + s * 13, face + 50, x + s * 9, face + 50, x + s * 11, face + 43], '#f3ead6', INK, 1);
  if (male) for (let i = 0; i < 7; i++) line(g, [x - 14 + i * 4.6, face + 66, x - 16 + i * 5.2, face + 84 + (i % 2) * 6], INK, 1.6);   // 수염
  // 몸에 새긴 이름 (위에서 아래로)
  const nm = male ? '천하대장군' : '지하여장군'; [...nm].forEach((ch, i) => text(g, ch, x, face + 110 + i * 25, { size: 21, font: FONT_B, fill: '#1e1610' }));
}
function treasureBG() {
  if (TRBG) return TRBG;
  TRBG = bakeScene(g => {
    const R = rng(8080);
    const sky = g.createLinearGradient(0, 0, 0, 470); sky.addColorStop(0, '#121a2c'); sky.addColorStop(1, '#25333c'); g.fillStyle = sky; g.fillRect(0, 0, W, 480);
    for (let i = 0; i < 80; i++) { const x = R() * W, y = R() * 360, r = 0.5 + R() * 1.2; g.globalAlpha = 0.2 + R() * 0.5; ell(g, x, y, r, r, '#f6efdc'); } g.globalAlpha = 1;
    // 보름달
    { const mx = 1180, my = 214, gr = g.createRadialGradient(mx, my, 10, mx, my, 150); gr.addColorStop(0, 'rgba(255,246,210,0.4)'); gr.addColorStop(1, 'rgba(255,246,210,0)'); g.fillStyle = gr; g.fillRect(mx - 150, my - 150, 300, 300); ell(g, mx, my, 38, 38, '#fbf1cf', 'rgba(38,42,54,0.4)', 1.2); g.globalAlpha = 0.14; ell(g, mx - 10, my - 8, 10, 8, '#b9a878'); ell(g, mx + 12, my + 10, 7, 6, '#b9a878'); g.globalAlpha = 1; }
    ridgeFill(g, x => 400 - 60 * Math.exp(-(((x - 760) / 220) ** 2)) - 30 * Math.exp(-(((x - 1100) / 160) ** 2)) - 8 * Math.sin(x * 0.02), '#1d2a32', 0, { rim: 0.18, rimCol: '#c9d6f0', sh: 'rgba(0,0,0,0.3)' });
    ridgeFill(g, x => 452 - 20 * Math.exp(-(((x - 560) / 260) ** 2)) - 6 * Math.sin(x * 0.03 + 1), '#25352e', 0, { rim: 0.2, rimCol: '#c9d6f0', sh: 'rgba(0,0,0,0.3)' });
    // 땅: 달빛 아래 풀밭
    const gd = g.createLinearGradient(0, 460, 0, H); gd.addColorStop(0, '#34402c'); gd.addColorStop(1, '#1e2419'); g.fillStyle = gd; g.fillRect(0, 466, W, H - 466);
    fibers(g, 0, 470, W, H - 470, 500, R, 0.1, ['#6a7a50', '#c9d6b0']);
    for (let i = 0; i < 50; i++) grassTuft(g, R() * W, 490 + R() * 230, 0.8 + R() * 0.8, R() < 0.6 ? '#4a5a36' : '#3d5030', R);
    // 당산나무: 굵은 둥치에 금줄을 두르고, 가지에는 오색 천을 매달았다
    path(g, p => { p.moveTo(96, 724); p.quadraticCurveTo(150, 640, 168, 520); p.quadraticCurveTo(176, 420, 150, 330); p.lineTo(206, 300); p.quadraticCurveTo(230, 420, 246, 520); p.quadraticCurveTo(262, 640, 330, 724); p.closePath(); }, '#4a3a30', INK, 2.4);
    for (let i = 0; i < 10; i++) { const x0 = 160 + i * 8; line(g, [x0, 330 + i * 6, x0 - 6 + R() * 12, 700], 'rgba(20,12,8,0.35)', 1.4); }
        for (const [x1, y1, x2, y2, w] of [[160, 360, 40, 230, 22], [196, 340, 330, 210, 20], [180, 320, 200, 150, 18], [150, 300, 90, 160, 14], [220, 300, 400, 260, 12]]) { line(g, [x1, y1, x2, y2], INK, w + 4); line(g, [x1, y1, x2, y2], '#4a3a30', w); }
    for (let i = 0; i < 34; i++) { const a = R() * TAU, d = R(), x = 200 + Math.cos(a) * 240 * d, y = 160 + Math.sin(a) * 120 * d - 20, r = 40 + R() * 46; ell(g, x, y, r, r * 0.72, i % 3 ? '#2a4436' : '#24392e', 'rgba(10,16,12,0.6)', 1.6); }
    for (let i = 0; i < 18; i++) { const a = -0.9 + R() * 1.4, x = 200 + Math.cos(a) * (180 + R() * 70), y = 150 + Math.sin(a) * 110; g.globalAlpha = 0.35; ell(g, x, y, 20 + R() * 16, 8 + R() * 6, '#5a7a62'); } g.globalAlpha = 1;
    [[70, 270, RED], [110, 300, '#e0b23c'], [300, 270, '#2f4d7e'], [350, 262, '#f6efdc'], [260, 290, '#3f8a6a'], [40, 250, '#f6efdc']].forEach(([x, y, c], i) => { line(g, [x, y - 8, x, y], INK, 1.2); path(g, p => { p.moveTo(x - 5, y); p.quadraticCurveTo(x - 7 + (i % 2) * 6, y + 30, x - 3, y + 58); p.lineTo(x + 4, y + 56); p.quadraticCurveTo(x + 2 + (i % 2) * 6, y + 28, x + 5, y); p.closePath(); }, c, INK, 1.2); });
    // 금줄: 새끼줄에 흰 종이 술을 끼웠다
    path(g, p => { p.moveTo(156, 500); p.quadraticCurveTo(206, 528, 256, 500); }, null, INK, 8); path(g, p => { p.moveTo(156, 500); p.quadraticCurveTo(206, 528, 256, 500); }, null, '#c9a862', 5);
    for (let i = 0; i < 5; i++) { const x = 168 + i * 19, y = 506 + Math.sin((i + 0.5) / 5 * Math.PI) * 10; path(g, p => { p.moveTo(x - 4, y); p.lineTo(x + 4, y); p.lineTo(x + 4, y + 9); p.lineTo(x - 2, y + 9); p.lineTo(x - 2, y + 18); p.lineTo(x + 4, y + 18); p.lineTo(x + 4, y + 26); p.lineTo(x - 4, y + 26); p.closePath(); }, '#f6efdc', INK, 1); }
    // 마을 어귀의 장승 한 쌍
    jangseung(g, 1080, 640, 300, true, R); jangseung(g, 1196, 664, 270, false, R);
    // 파낸 구덩이와 흙더미, 꽂아 둔 삽
    { const gr = g.createRadialGradient(640, 676, 10, 640, 676, 200); gr.addColorStop(0, '#0e0c08'); gr.addColorStop(1, '#2a2418'); g.fillStyle = gr; g.beginPath(); g.ellipse(640, 676, 196, 38, 0, 0, TAU); g.fill(); st(g, 'rgba(10,8,4,0.8)', 2); }
    for (const [x, y, rx, ry] of [[930, 668, 70, 30], [980, 680, 50, 22], [880, 682, 46, 18], [452, 682, 40, 14]]) ell(g, x, y, rx, ry, '#5a4630', INK, 1.6);
    fibers(g, 860, 640, 180, 60, 60, R, 0.25, ['#2a2010', '#a08860']);
    line(g, [966, 586, 946, 650], INK, 7); line(g, [966, 586, 946, 650], '#a9753f', 4.4); rr(g, 956, 578, 22, 10, 4, '#a9753f', INK, 1.6);
    part(g, p => { p.moveTo(934, 644); p.lineTo(960, 650); p.lineTo(956, 686); p.quadraticCurveTo(940, 694, 926, 682); p.closePath(); }, '#8a8f96', null, { lw: 1.6 });
  });
  return TRBG;
}
export class TreasureScene extends RewardOverlay {
  constructor(o) { super(Object.assign({ kind: 'treasure' }, o)); this.ownChest = true; this.rise = true; this.scene = g => this.grove(g); }
  grove(g) {
    const t = this.t, lead = 1.15, q = t / lead, pop = clamp((t - lead * 0.72) / 0.3, 0, 1), m = clamp((t - lead) / 0.55, 0, 1), e = m * m * (3 - 2 * m);
    g.drawImage(treasureBG(), 0, 0, W, H);
    // 반딧불
    for (let i = 0; i < 14; i++) { const ph = i * 2.1, x = 40 + ((i * 131) % 1200) + Math.sin(t * 0.5 + ph) * 30, y = 360 + ((i * 59) % 240) + Math.sin(t * 0.9 + ph) * 14, a = clamp(Math.sin(t * 1.4 + ph), 0, 1); g.globalAlpha = a * 0.9; ell(g, x, y, 1.7, 1.7, '#fff2b0'); g.globalAlpha = 1; glow(g, x, y, 9, '255,230,140', a * 0.35); }
    // 보물 함: 가운데에서 덜컹거리다 열리고, 구덩이로 내려앉아 빛기둥을 올린다
    const cx = 640, cy = 470 + (676 - 470) * e, sc = 2.5 + (1.7 - 2.5) * e;
    if (pop > 0) {
      const pul = 0.85 + 0.15 * Math.sin(t * 2.4);
      if (m > 0) { const bm = g.createLinearGradient(0, 80, 0, cy - 40); bm.addColorStop(0, 'rgba(255,230,150,0)'); bm.addColorStop(1, `rgba(255,230,150,${0.22 * e * pul})`); g.fillStyle = bm; g.beginPath(); g.moveTo(cx - 70, cy - 40); g.lineTo(cx - 300, 80); g.lineTo(cx + 300, 80); g.lineTo(cx + 70, cy - 40); g.closePath(); g.fill(); }
      glow(g, cx, cy - 34 * sc / 2.5, 190 * (0.6 + 0.4 * pop), '255,220,120', 0.55 * pul); goldRays(g, cx, cy - 34 * sc / 2.5, t, pop * (1 - 0.5 * e), 190 - 60 * e);
    }
    const sh = q < 0.72 ? Math.sin(t * 38) * 0.05 * (0.3 + q) : 0;
    g.save(); g.translate(cx, cy); g.rotate(sh); const ps = sc + 0.5 * easeOutBack(pop) * (1 - e), by = 40 * sc / 2.5, top = by - 37.4 * ps;
    // 열린 뚜껑: 함 뒤로 젖혀 세운다
    if (pop > 0) { const lk = Math.min(1, pop * 1.4); g.save(); g.translate(0, top + 2 * ps); g.scale(1, lk); rr(g, -31 * ps, -24 * ps, 62 * ps, 24 * ps, 4 * ps, '#7a4a2c', INK, 1.6); rr(g, -27 * ps, -20 * ps, 54 * ps, 16 * ps, 3 * ps, '#5a3420'); for (const x of [-15, 15]) rr(g, (x - 2.5) * ps, -24 * ps, 5 * ps, 24 * ps, 1.4 * ps, '#d6a640', INK, 0.9); g.restore(); }
    drawSprite(g, stopSprite('treasure'), 0, by, ps, ps * (1 + (q < 0.72 ? 0.06 * Math.sin(t * 38) : 0)));
    // 함 안에 가득한 엽전과 구슬
    if (pop > 0) { g.globalAlpha = Math.min(1, pop * 2); ell(g, 0, top + 4 * ps, 29 * ps, 7 * ps, '#e9c04a', INK, 1.4); for (let i = 0; i < 9; i++) { const ax = (i - 4) * 6 * ps, ay = top + (1 - Math.abs(i - 4) / 4) * -4 * ps + 2 * ps; ell(g, ax, ay, 3.4 * ps, 2.2 * ps, i % 3 ? '#f0d264' : '#fff0a8', 'rgba(90,60,10,0.7)', 1); } ell(g, -8 * ps, top - 2 * ps, 3 * ps, 3 * ps, '#c8402f', INK, 1); ell(g, 10 * ps, top - 1 * ps, 2.6 * ps, 2.6 * ps, '#3d6fd6', INK, 1); g.globalAlpha = 1; }
    g.restore();
    if (!this.popped && pop > 0) { this.popped = true; sfx('star'); juice.burst(cx, cy - 40, '#f0d264', 16); }
  }
}
import { stopSprite } from '../render/terrain.js';
import { drawSprite } from '../render/draw.js';
function drawSpriteSafe(g, type, x, y, s) { try { drawSprite(g, stopSprite(type), x, y, s, s); } catch (e) { /* 그림이 없으면 건너뛴다 */ } }
