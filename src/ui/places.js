// 길 위의 장소들: 장터 · 주막 · 갈림길 · 보물 터. 버튼만 띄우는 대신 그 장소를 종이 인형극 무대처럼 통째로 그린다.
// 정지한 그림(하늘·집·진열대·평상)은 한 번 굽고, 물건·인형·불빛·김만 매 장면 그린다. 그 장면을 걸개그림 삼아 단청 무대틀·막·구경꾼을 두른다 (stage.js)
import { W, H } from '../config.js';
import { TAU, INK, PAPER, RED, INDIGO, TEAL, OCHRE, SUB, FONT, FONT_B, text, textBlock, ell, rr, rrPath, poly, line, path, st, makeCanvas, rng, clamp, easeOutBack } from '../render/draw.js';
import { part, curve, P, R as RECT, E, dk, lt } from '../render/figures.js';
import { THEMES, padPine, grassTuft, paperFlower } from '../render/terrain.js';
import { button, icon, panel, stamp, seal, tapped, isDown, C, foil, goldText, shine, plaque, scroll, hangSign, brushTitle } from './ui.js';
export { plaque, scroll, hangSign };
import { cardFace } from './cards.js';
import { Overlay, RewardOverlay, COL, supplyArt, resultIcon, BAD, GOOD, setTag } from './overlays.js';
import { G, save, describeReward, buyItem, upgradeCard, removeCard, STOP, forkDesc, act, canTemper, temper } from '../state.js';
import { cardName, isUnit } from '../data/cards.js';
import { weaponIcon, portrait } from '../render/sprites.js';
import { WEAPONS, setOf } from '../data/weapons.js';
import { relicIcon, miscIcon } from '../render/icons.js';
import { puppet } from './theater.js';
import { stageFront, stageCurtain, stagePuppet, openOf } from './stage.js';
import { drawChest, ChestFX } from './chest.js';
import { RELICS } from '../data/relics.js';
import { pal as PAL, mix as MIX, vgrad as VG, dab as DAB, mountain as MOUNT, cloud as PCLOUD, tuft as PTUFT, umbrellaPine as PPINE, bloomTree as PBLOOM, rock as PROCK, stroke as PSTROKE } from '../render/painted.js';
import { sfx } from '../audio.js';
import { juice, SPOT, goldRays } from './juice.js';

const S = 1.5;
// 무대 앞 구경꾼 자리 [x, 크기, 머리 꼴, 아래로 내림]: 장소마다 단추·이름판을 피해 앉는다
const MARKET_SEATS = [[74, 1.55, 5, -6], [176, 1.45, 1, -8], [278, 1.5, 3, -6], [34, 1.9, 0, 16], [128, 2.0, 3, 14], [228, 1.85, 4, 20], [330, 1.95, 0, 16]];
const TAVERN_SEATS = [[96, 1.5, 5, -8], [196, 1.42, 1, -10], [300, 1.55, 3, -8], [404, 1.45, 2, -10], [510, 1.55, 0, -8], [612, 1.4, 4, -12], [712, 1.5, 5, -8], [810, 1.46, 3, -10],
  [52, 1.95, 0, 14], [150, 1.85, 3, 18], [250, 2.0, 2, 16], [352, 1.9, 0, 14], [456, 1.8, 1, 20], [556, 2.05, 3, 14], [660, 1.9, 5, 16], [760, 2.0, 0, 14], [856, 1.8, 4, 20]];
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
// ── 장소들이 함께 쓰는 꾸밈 ──
// 떠도는 빛 먼지 (볕이나 등불 속에서)
export function motes(g, t, x, y, w, h, n = 24, rgb = '255,236,190', a = 0.6) {
  for (let i = 0; i < n; i++) { const ph = i * 1.37, px = x + ((i * 173.3 + Math.sin(t * 0.3 + ph) * 40 + t * (6 + (i % 5) * 2)) % w), py = y + ((i * 91.7 + Math.sin(t * 0.5 + ph * 2) * 20 - t * (3 + i % 3)) % h + h) % h, k = 0.5 + 0.5 * Math.sin(t * 1.7 + ph);
    g.globalAlpha = a * k; ell(g, px, py, 1.4, 1.4, `rgb(${rgb})`); glow(g, px, py, 6, rgb, a * k * 0.4); }
  g.globalAlpha = 1;
}
// 비스듬히 내리는 빛살
export function beams(g, x, y, len, ang, n, t, rgb = '255,230,180', a = 0.1) {
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) { const w = 30 + ((i * 37) % 50), ox = x + i * 70, k = a * (0.6 + 0.4 * Math.sin(t * 0.6 + i * 1.3)); const gr = g.createLinearGradient(ox, y, ox + Math.cos(ang) * len, y + Math.sin(ang) * len); gr.addColorStop(0, `rgba(${rgb},${k})`); gr.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = gr;
    g.beginPath(); g.moveTo(ox, y); g.lineTo(ox + w, y); g.lineTo(ox + w + Math.cos(ang) * len, y + Math.sin(ang) * len); g.lineTo(ox + Math.cos(ang) * len - w * 0.4, y + Math.sin(ang) * len); g.closePath(); g.fill(); }
  g.restore();
}
// 장터 뒷골목을 지나가는 사람 그림자 (흰옷에 갓 · 봇짐 · 물동이)
function walker(g, x, y, s, ph, dir, kind) {
  const step = Math.sin(ph * 2) * 3 * s, bob = Math.abs(Math.sin(ph * 2)) * 1.6 * s, ink = 'rgba(60,52,48,0.55)', cloth = 'rgba(232,226,210,0.75)';
  g.save(); g.translate(x, y - bob); g.scale(dir, 1);
  line(g, [-3 * s + step, 0, -2 * s, -14 * s], ink, 3 * s); line(g, [3 * s - step, 0, 2 * s, -14 * s], ink, 3 * s);
  path(g, p => { p.moveTo(-8 * s, -12 * s); p.lineTo(8 * s, -12 * s); p.lineTo(6 * s, -36 * s); p.lineTo(-6 * s, -36 * s); p.closePath(); }, cloth, ink, 1);
  ell(g, 0, -41 * s, 5 * s, 5 * s, 'rgba(220,190,160,0.8)', ink, 1);
  if (kind === 0) { ell(g, 0, -45 * s, 10 * s, 2.4 * s, 'rgba(30,26,30,0.8)'); rr(g, -3.5 * s, -52 * s, 7 * s, 7 * s, 1.5, 'rgba(30,26,30,0.8)'); }
  else if (kind === 1) rr(g, -16 * s, -38 * s, 12 * s, 20 * s, 3, 'rgba(150,110,70,0.8)', ink, 1);
  else { ell(g, 0, -50 * s, 8 * s, 5 * s, 'rgba(120,100,90,0.8)', ink, 1); }
  g.restore();
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
  // 보급: 조각보로 싼 꾸러미, 매듭 틈으로 전술 패 석 장이 삐져나온다
  if (d.misc === 'supply') { bojagi(g, x, y, 1.05, rng(7), (gg, cx, cy) => { for (const [dx, rot, col] of [[-16, -0.35, '#efe4c8'], [0, 0.05, '#f6eedb'], [16, 0.4, '#efe4c8']]) { gg.save(); gg.translate(cx + dx, cy + 8); gg.rotate(rot); rr(gg, -9, -26, 18, 26, 2, col, INK, 1); rr(gg, -9, -26, 18, 6, 2, '#5a4a8a'); gg.restore(); } }); return; }
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
    // 뒷골목을 오가는 장꾼들 (갓 쓴 이, 봇짐 진 이, 물동이 인 이)
    for (let i = 0; i < 5; i++) { const sp = 18 + i * 5, dir = i % 2 ? 1 : -1, x = dir > 0 ? ((t * sp + i * 300) % 1500) - 110 : 1390 - ((t * sp + i * 300) % 1500), y = 348 + (i % 3) * 5; walker(g, x, y, 0.62 + (i % 3) * 0.05, t * 3 + i, dir, i % 3); }
    beams(g, 820, 150, 520, 2.1, 5, t, '255,236,190', 0.08);
    // 장사꾼: 진열대 왼쪽에서 손님을 부른다
    g.save(); g.globalAlpha = 0.35; ell(g, 164, 602, 40, 8, '#2a1a10'); g.restore(); stagePuppet(g, 'merchant', 160, 600, 1.75, t, { act: this.lineT < 1.4 ? 'talk' : 'idle', face: 1 });
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
    motes(g, t, 240, 150, 980, 460, 26, '255,240,200', 0.5);
    for (const x of [320, 530, 750, 960]) glow(g, x, 48, 40 + Math.sin(t * 3 + x) * 3, '255,170,90', 0.25);
    // 인형극 무대: 장터 그림은 걸개그림, 앞에는 구경꾼
    stageFront(g, t, { open: openOf(t), seats: MARKET_SEATS, lamps: [300, 990] });
    // 장사꾼의 말
    { const k = clamp(this.lineT / 0.25, 0, 1); g.save(); g.globalAlpha = k; g.font = `400 18px ${FONT_B}`; const w = Math.min(330, g.measureText(this.line).width + 34), bx = 34, by = 352; rr(g, bx, by, w, 42, 12, '#fffaf0', INK, 2); poly(g, [bx + 70, by + 40, bx + 92, by + 40, bx + 76, by + 60], '#fffaf0'); line(g, [bx + 70, by + 41, bx + 76, by + 60, bx + 92, by + 41], INK, 2); text(g, this.line, bx + w / 2, by + 21, { size: 18, font: FONT_B, maxW: w - 20 }); g.restore(); }
    // 고른 물건: 아래 한지 두루마리에 이름과 쓰임, 사기 단추
    const it = this.items[this.sel];
    if (it) {
      const d = describeReward(it), ok = r.gold >= it.price, x = 290, y = 612, w = 690, h = 98;
      scroll(g, x, y, w, h);
      rr(g, x + 22, y + 12, 94, 24, 6, COL[d.col] || INDIGO); text(g, d.title, x + 69, y + 24.5, { size: 14.5, fill: C.cream, maxW: 86 });
      text(g, d.name, x + 128, y + 25, { size: 22, font: FONT_B, align: 'left', maxW: 330 });
      if (d.weapon && setOf(d.weapon)) setTag(g, d.weapon, x + 392, y + 25);
      textBlock(g, d.desc.split('\n').join(' · '), x + 22, y + 56, 440, 22, { size: 17, align: 'left', fill: '#3a3026', weight: 400 });
      if (it.sold) stamp(g, x + w - 110, y + h / 2, 30, 'get', RED, -0.12);
      else if (button(g, 'mkbuy', x + w - 210, y + 18, 190, 62, `사기 · 엽전 ${it.price}`, { style: ok ? 'red' : 'grey', size: 22 })) this.buy(it, d);
    } else { const bob = Math.sin(t * 3) * 2; scroll(g, 430, 628 + bob, 414, 52); text(g, '물건을 눌러 살펴보세요', 637, 655 + bob, { size: 22, font: FONT_B, fill: INK }); }
    if (!this.left && button(g, 'mkleave', 1004, 632, 262, 66, '장터를 떠난다', { size: 27 })) { this.left = true; this.say('또 오시오!'); sfx('click'); this.onDone(); }
    stageCurtain(g, t, openOf(t));
    // 엽전 주머니와 덱 단추는 막보다 위에
    panel(g, 1078, 14, 186, 48, 'tag'); icon.coin(g, 1104, 38, 13); text(g, `엽전 ${r.gold}`, 1180, 39, { size: 22, font: FONT_B, maxW: 140 });
    if (button(g, 'mkdeck', 14, 12, 220, 52, `덱 살피기 · ${r.deck.length}장`, { style: 'wood', size: 21 })) this.deck({});
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
  // 붓으로 칠한 달밤의 주막: 하늘·달·겹산 → 감나무와 싸리 울타리 → 초가(이엉 결·용마름·처마 짚 술) → 창호지 너머 술손님 그림자 → 마당의 평상·장독대·아궁이
  TBG = bakeScene(g => {
    const R = rng(808), S2 = PSTROKE;
    // 하늘과 달
    g.fillStyle = VG(g, 0, 420, [[0, '#0a0e22'], [0.55, '#1d2244'], [1, '#3a3558']]); g.fillRect(0, 0, W, 430);
    for (let i = 0; i < 180; i++) DAB(g, R() * W, R() * 300, 0.5 + R() * 1.1, 0.5 + R() * 1.1, '#f4f0e0', 0.2 + R() * 0.6);
    { const mx = 1150, my = 86; for (const [r, a] of [[260, 0.14], [150, 0.22]]) { const gr = g.createRadialGradient(mx, my, 36, mx, my, r); gr.addColorStop(0, `rgba(255,240,205,${a})`); gr.addColorStop(1, 'rgba(255,240,205,0)'); g.globalAlpha = 1; g.fillStyle = gr; g.fillRect(mx - r, my - r, r * 2, r * 2); }
      const md = g.createRadialGradient(mx - 12, my - 14, 4, mx, my, 40); md.addColorStop(0, '#fffbea'); md.addColorStop(1, '#e8dab4'); g.fillStyle = md; g.beginPath(); g.arc(mx, my, 40, 0, TAU); g.fill();
      for (const [dx, dy, rx] of [[-12, -6, 10], [8, 10, 12], [14, -14, 6]]) DAB(g, mx + dx, my + dy, rx, rx * 0.8, '#bfae86', 0.18); }
    for (const [x, y, w] of [[300, 70, 300], [800, 46, 240], [1010, 160, 200]]) { for (let k = 0; k < 14; k++) DAB(g, x + (k - 7) * w * 0.07, y + Math.sin(k * 1.3) * 3, w * 0.14, w * 0.022, '#2e3460', 0.35); for (let k = 0; k < 10; k++) DAB(g, x + (k - 5) * w * 0.08, y + 4 + Math.sin(k) * 2, w * 0.1, w * 0.01, '#9a9cc8', 0.25); }
    MOUNT(g, x => 300 - 70 * Math.exp(-(((x - 260) / 240) ** 2)) - 44 * Math.exp(-(((x - 900) / 260) ** 2)) - 8 * Math.sin(x * 0.02), W, 360, '#283052', '#3a3a62', R, { h: 120, n: 140, mist: 46 });
    MOUNT(g, x => 350 - 30 * Math.exp(-(((x - 120) / 200) ** 2)) - 22 * Math.sin(x * 0.008 + 1), W, 392, '#1c2238', '#3a3558', R, { h: 60, n: 100, mist: 30 });
    // 마당: 밟혀 다져진 흙, 따뜻한 빛이 고이는 자리
    g.globalAlpha = 1; g.fillStyle = VG(g, 380, H, [[0, '#3e3340'], [1, '#221a24']]); g.fillRect(0, 382, W, H - 382);
    for (let i = 0; i < 2200; i++) { const x = R() * W, y = 386 + R() * 334; DAB(g, x, y, 3 + R() * 12, 1 + R() * 3, R() < 0.5 ? '#54444e' : '#2a2028', 0.25); }
    for (let i = 0; i < 160; i++) { const x = R() * W, y = 392 + R() * 320; DAB(g, x + 0.8, y + 1, 2.2, 1.2, '#140e14', 0.4); DAB(g, x, y, 1.8, 1.1, '#6a5c66', 0.7); }
    for (let i = 0; i < 70; i++) { const x = R() < 0.5 ? R() * 120 : 1160 + R() * 120, y = 400 + R() * 300; PTUFT(g, x, y, 0.9 + R() * 0.8, { grass: ['#3e4a3c', '#55624a', '#2a3428'] }, R); }
    // 싸리 울타리 (왼쪽 뒤): 가는 싸리 가지에 달빛 테
    for (let x = 0; x < 470; x += 6) { const h = 62 + Math.sin(x * 0.3) * 6 + R() * 8; S2(g, [x, 406, x + (R() - 0.5) * 4, 406 - h], R() < 0.5 ? '#3e3028' : '#4e3c30', 2); if (R() < 0.4) S2(g, [x + 1, 404 - h * 0.5, x + 1, 406 - h], '#a8a4c8', 0.8, 0.35); }
    for (const y of [372, 394]) { S2(g, [0, y, 470, y + 2], '#2a1e18', 3.4); S2(g, [0, y - 1, 470, y + 1], '#6a5040', 1, 0.6); }
    // 감나무: 굽은 줄기, 붓 자국 잎, 달빛을 받는 주홍 감
    { g.globalAlpha = 1; g.fillStyle = VG(g, 140, 410, [[0, '#2e2420'], [1, '#1a1412']]); g.beginPath(); g.moveTo(102, 412); g.quadraticCurveTo(90, 330, 126, 250); g.quadraticCurveTo(146, 200, 118, 150); g.lineTo(140, 148); g.quadraticCurveTo(172, 210, 152, 262); g.quadraticCurveTo(130, 330, 146, 412); g.closePath(); g.fill();
      for (let k = 0; k < 10; k++) S2(g, [112 + k * 3, 400 - k * 20, 116 + k * 3, 380 - k * 20], '#0e0a08', 1, 0.5); S2(g, [140, 380, 148, 260, 140, 160], '#8a86a8', 1.2, 0.35);
      for (const [x0, y0, x1, y1, w] of [[130, 250, 40, 190, 7], [140, 210, 250, 150, 6], [128, 170, 60, 110, 5], [134, 160, 200, 90, 5], [150, 262, 270, 232, 5], [60, 110, 30, 80, 3], [200, 90, 240, 66, 3]]) S2(g, [x0, y0, (x0 + x1) / 2 + 6, (y0 + y1) / 2 - 8, x1, y1], '#241c18', w);
      for (let i = 0; i < 240; i++) { const a = R() * TAU, d = Math.sqrt(R()), x = 150 + Math.cos(a) * 120 * d, y = 170 + Math.sin(a) * 80 * d; DAB(g, x, y, 4 + R() * 6, 2 + R() * 3, R() < 0.6 ? '#1e3028' : '#2e4434', 0.75, R() * 3); }
      for (let i = 0; i < 40; i++) { const a = -0.3 - R() * 2.4, x = 150 + Math.cos(a) * 110, y = 170 + Math.sin(a) * 70; DAB(g, x, y, 3 + R() * 4, 1.4 + R() * 2, '#5f7a6a', 0.5); }
      for (let i = 0; i < 22; i++) { const x = 50 + R() * 210, y = 96 + R() * 150; DAB(g, x, y, 7, 6.4, '#d96a22', 1); DAB(g, x + 1.5, y + 1.5, 5, 4.4, '#a8461a', 0.6); DAB(g, x - 2.4, y - 2.2, 2.2, 1.6, '#ffd8a0', 0.85); S2(g, [x - 3, y - 6, x + 3, y - 6], '#1e3028', 2); } }
    // 초가 주막
    const bx0 = 486, bx1 = 1236, base = 384;
    // 돌 기단
    g.globalAlpha = 1; g.fillStyle = '#4a4248'; g.fillRect(bx0 - 8, base, bx1 - bx0 + 16, 24);
    for (let x = bx0 - 4; x < bx1 + 4;) { const w = 26 + R() * 22; PROCK(g, x + w / 2, base + 22, w, 14 + R() * 8, { rock: ['#8a8290', '#4a4250'], grass: ['#3e4a3c', '#55624a', '#2a3428'] }, R); x += w - 2; }
    // 흙벽과 나무 뼈대
    g.fillStyle = VG(g, 236, base, [[0, '#d8c093'], [1, '#a88a62']]); g.fillRect(bx0, 236, bx1 - bx0, base - 236);
    for (let i = 0; i < 500; i++) { const x = bx0 + R() * (bx1 - bx0), y = 240 + R() * (base - 244); DAB(g, x, y, 2 + R() * 6, 1 + R() * 2, R() < 0.5 ? '#c4a878' : '#e8d4aa', 0.35); }
    const post = (x, y0, y1, w = 14) => { g.globalAlpha = 1; g.fillStyle = VG(g, y0, y1, [[0, '#6e4428'], [1, '#3a2216']]); g.fillRect(x, y0, w, y1 - y0); S2(g, [x + w * 0.3, y0 + 4, x + w * 0.3, y1 - 4], '#9a6a44', 1.4, 0.5); for (let k = 0; k < 4; k++) S2(g, [x + 2 + R() * (w - 4), y0 + R() * (y1 - y0), x + 2 + R() * (w - 4), y0 + R() * (y1 - y0) + 20], '#2a1810', 0.8, 0.5); };
    for (const x of [bx0 + 4, 676, 866, 1052, bx1 - 18]) post(x, 232, base);
    for (const y of [236, 334]) { g.fillStyle = VG(g, y, y + 10, [[0, '#7a4c2e'], [1, '#3e2418']]); g.fillRect(bx0, y, bx1 - bx0, 10); S2(g, [bx0, y + 2, bx1, y + 2], '#a87850', 1, 0.5); }
    // 창호지 창 둘: 따뜻한 등불빛과 띠살, 그 너머 술손님 그림자
    for (const [x0, w, n] of [[700, 150, 0], [884, 150, 1]]) {
      const wg = g.createRadialGradient(x0 + w / 2, 290, 10, x0 + w / 2, 290, 110); wg.addColorStop(0, '#ffeab4'); wg.addColorStop(1, '#e6b064'); g.globalAlpha = 1; g.fillStyle = wg; g.fillRect(x0, 252, w, 74);
      // 그림자: 갓 쓴 손님이 잔을 들고, 맞은편 손님이 고개를 숙인다
      g.fillStyle = 'rgba(90,50,24,0.55)'; const sx = x0 + (n ? 44 : 104);
      g.beginPath(); g.ellipse(sx, 300, 12, 13, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(sx, 289, 20, 4, 0, 0, TAU); g.fill(); g.fillRect(sx - 6, 279, 12, 10); g.beginPath(); g.moveTo(sx - 22, 326); g.quadraticCurveTo(sx - 20, 306, sx, 304); g.quadraticCurveTo(sx + 20, 306, sx + 22, 326); g.fill();
      if (n) { g.beginPath(); g.ellipse(sx + 22, 306, 4, 6, 0.4, 0, TAU); g.fill(); g.fillRect(sx + 14, 310, 10, 4); } else { g.beginPath(); g.ellipse(x0 + 42, 306, 11, 12, 0.3, 0, TAU); g.fill(); g.beginPath(); g.moveTo(x0 + 20, 326); g.quadraticCurveTo(x0 + 26, 312, x0 + 46, 312); g.quadraticCurveTo(x0 + 62, 316, x0 + 64, 326); g.fill(); }
      g.globalAlpha = 0.7; for (let k = 1; k < 10; k++) S2(g, [x0 + k * w / 10, 253, x0 + k * w / 10, 325], '#7a4a26', 1.1); for (const yy of [268, 290, 312]) { S2(g, [x0, yy, x0 + w, yy], '#7a4a26', 1.1); S2(g, [x0, yy + 4, x0 + w, yy + 4], '#7a4a26', 1.1); }
      g.globalAlpha = 1; g.strokeStyle = '#3a2216'; g.lineWidth = 4; g.strokeRect(x0, 252, w, 74);
    }
    // 판자문: 반쯤 열려 안쪽 불빛이 새어 나온다
    { g.globalAlpha = 1; const ig = g.createLinearGradient(520, 0, 660, 0); ig.addColorStop(0, '#ffd890'); ig.addColorStop(1, '#c88a40'); g.fillStyle = ig; g.fillRect(520, 250, 140, 128);
      g.fillStyle = 'rgba(120,70,30,0.5)'; g.fillRect(560, 300, 60, 78); g.fillStyle = VG(g, 250, 378, [[0, '#6a4228'], [1, '#3e2416']]); g.fillRect(520, 250, 74, 128); for (let k = 1; k < 4; k++) S2(g, [520 + k * 18.5, 252, 520 + k * 18.5, 376], '#2a1810', 1.2, 0.7); S2(g, [524, 290, 590, 290], '#2a1810', 2); S2(g, [524, 340, 590, 340], '#2a1810', 2); DAB(g, 586, 314, 2.4, 2.4, '#c8a048', 1);
      g.strokeStyle = '#2e1a10'; g.lineWidth = 5; g.strokeRect(518, 248, 144, 132); }
    // 오른쪽 덧문 닫힌 방
    { g.globalAlpha = 1; g.fillStyle = VG(g, 254, 324, [[0, '#4a3628'], [1, '#2e2018']]); g.fillRect(1070, 254, 146, 70); for (let k = 1; k < 6; k++) S2(g, [1070 + k * 24, 256, 1070 + k * 24, 322], '#1a100a', 1.2, 0.7); g.strokeStyle = '#2e1a10'; g.lineWidth = 4; g.strokeRect(1070, 254, 146, 70); }
    // 벽에 매단 마늘 타래와 시래기
    for (let k = 0; k < 7; k++) { const y = 248 + k * 10; DAB(g, 1238 - 4, y, 6, 5, '#f0e6d0', 1); DAB(g, 1238 - 6, y - 1, 2, 2, '#ffffff', 0.7); } S2(g, [1234, 244, 1234, 318], '#8a7040', 1.6);
    // 툇마루
    { g.globalAlpha = 1; g.fillStyle = VG(g, 348, 364, [[0, '#a8743e'], [1, '#6e4628']]); g.fillRect(bx0 + 10, 348, bx1 - bx0 - 20, 14); for (let x = bx0 + 14; x < bx1 - 14; x += 38) S2(g, [x, 349, x, 361], '#4a2c18', 1, 0.7); S2(g, [bx0 + 10, 349, bx1 - 10, 349], '#e0b07a', 1.2, 0.6);
      for (let x = bx0 + 60; x < bx1 - 40; x += 120) { g.fillStyle = '#4a2c18'; g.fillRect(x, 362, 10, 22); } }
    // 초가지붕: 짚 결을 수없이 겹쳐 칠하고, 새끼줄 그물, 처마 끝 짚 술, 위의 용마름과 달빛 테
    const roof = p => { p.moveTo(bx0 - 50, 246); p.quadraticCurveTo(bx0 - 32, 156, bx0 + 70, 136); p.lineTo(bx1 - 70, 136); p.quadraticCurveTo(bx1 + 32, 156, bx1 + 50, 246); p.quadraticCurveTo((bx0 + bx1) / 2, 270, bx0 - 50, 246); p.closePath(); };
    g.globalAlpha = 1; g.beginPath(); roof(g); g.fillStyle = VG(g, 136, 270, [[0, '#d8b46c'], [0.6, '#b08a4a'], [1, '#6e5228']]); g.fill();
    g.save(); g.beginPath(); roof(g); g.clip();
    for (let i = 0; i < 2600; i++) { const x = bx0 - 50 + R() * (bx1 - bx0 + 100), y = 136 + R() * 134, l = 6 + R() * 12, c = R(); S2(g, [x, y, x + (x - (bx0 + bx1) / 2) * 0.01 + (R() - 0.5) * 3, y + l], c < 0.4 ? '#8a6830' : c < 0.75 ? '#e2c27e' : '#6a4c22', 0.9 + R() * 0.6, 0.45); }
    for (let x = bx0 - 160; x < bx1 + 160; x += 44) { S2(g, [x, 136, x + 70, 200, x + 130, 270], '#5a4020', 1.6, 0.5); S2(g, [x + 130, 136, x + 60, 200, x, 270], '#5a4020', 1.6, 0.5); }
    { const sh = g.createLinearGradient(0, 220, 0, 272); sh.addColorStop(0, 'rgba(40,24,10,0)'); sh.addColorStop(1, 'rgba(40,24,10,0.55)'); g.fillStyle = sh; g.fillRect(bx0 - 60, 220, bx1 - bx0 + 120, 60); }
    g.restore();
    // 용마름: 지붕 꼭대기를 덮은 엮은 짚
    { g.globalAlpha = 1; g.fillStyle = '#c8a462'; g.fillRect(bx0 + 70, 130, bx1 - bx0 - 140, 12); for (let x = bx0 + 72; x < bx1 - 72; x += 8) { S2(g, [x, 131, x + 6, 141], '#7a5a2a', 1.4, 0.8); S2(g, [x + 6, 131, x, 141], '#e8cc8a', 0.9, 0.6); } }
    // 처마 끝 짚 술과 달빛 테
    for (let x = bx0 - 46; x < bx1 + 46; x += 4) { const yb = 246 + Math.sin(clamp((x - bx0 + 50) / (bx1 - bx0 + 100), 0, 1) * Math.PI) * 22; S2(g, [x, yb - 4, x + (R() - 0.5) * 2, yb + 6 + R() * 6], R() < 0.5 ? '#8a6a34' : '#b8925a', 1.2, 0.9); }
    { g.beginPath(); for (let x = bx0 + 70; x <= bx1 + 20; x += 6) { const u = (x - (bx1 - 70)) / 100, y = x < bx1 - 70 ? 136 : 136 + Math.max(0, u) * Math.max(0, u) * 100; if (x === bx0 + 70) g.moveTo(x, y); else g.lineTo(x, y); } g.globalAlpha = 0.5; g.strokeStyle = '#d8dcff'; g.lineWidth = 1.6; g.stroke(); g.globalAlpha = 1; }
    // 처마에 매단 붉은 고추 줄
    for (const [cx, n] of [[640, 9], [1012, 7]]) { const top = 262; S2(g, [cx, top - 8, cx, top + n * 9], '#6a5030', 1.4); for (let k = 0; k < n; k++) { const y = top + k * 9; DAB(g, cx - 4, y, 6, 2.2, '#c02a1a', 1, 0.5); DAB(g, cx + 4, y + 4, 6, 2.2, '#a82014', 1, -0.5); DAB(g, cx - 5, y - 1, 2, 0.8, '#ff8a6a', 0.8, 0.5); } }
    // 굴뚝 (오른쪽 끝, 돌과 흙)
    for (let k = 0; k < 6; k++) PROCK(g, 1262 + (k % 2) * 3, 384 - k * 14, 26, 14, { rock: ['#7a7280', '#4a4250'], grass: ['#3e4a3c', '#55624a', '#2a3428'] }, R);
    // 창과 문의 불빛이 마당에 고인다
    for (const [x, y, r, a] of [[775, 420, 190, 0.26], [959, 420, 190, 0.26], [590, 410, 160, 0.2]]) { const gr = g.createRadialGradient(x, y, 10, x, y, r); gr.addColorStop(0, `rgba(255,196,120,${a})`); gr.addColorStop(1, 'rgba(255,196,120,0)'); g.globalAlpha = 1; g.fillStyle = gr; g.fillRect(x - r, y - r * 0.6, r * 2, r * 1.6); }
    // 용수 간판: 대나무 장대 끝에 대로 엮은 용수와 붉은 헝겊
    { g.globalAlpha = 1; for (let y = 120; y < 410; y += 30) { g.fillStyle = VG(g, y, y + 30, [[0, '#a89a52'], [1, '#6a6028']]); g.fillRect(450, y, 8, 29); S2(g, [449, y + 29, 459, y + 29], '#3a3418', 1.6); } S2(g, [452, 124, 392, 132], '#6a6028', 3.4);
      const yg = g.createLinearGradient(376, 0, 416, 0); yg.addColorStop(0, '#8a6a30'); yg.addColorStop(0.5, '#e0c072'); yg.addColorStop(1, '#8a6a30'); g.fillStyle = yg; g.beginPath(); g.moveTo(384, 146); g.lineTo(408, 146); g.lineTo(416, 232); g.quadraticCurveTo(396, 244, 376, 232); g.closePath(); g.fill();
      for (let y = 152; y < 236; y += 7) S2(g, [382 - (y - 146) * 0.09, y, 410 + (y - 146) * 0.07, y + 2], '#6a4c20', 1, 0.8); for (let x = 382; x < 414; x += 6) S2(g, [x, 148, x + (x - 396) * 0.1, 236], '#5a3c18', 0.8, 0.5);
      S2(g, [396, 132, 396, 146], '#3a2a18', 1.6); g.fillStyle = '#c8302a'; g.beginPath(); g.moveTo(404, 234); g.quadraticCurveTo(420, 252, 414, 276); g.lineTo(406, 270); g.quadraticCurveTo(410, 250, 398, 238); g.closePath(); g.fill(); }
    // 장작더미 (아궁이 왼쪽)
    for (let k = 0; k < 12; k++) { const row = Math.floor(k / 4), cx = 506 + (k % 4) * 15 + (row % 2) * 7, cy = 446 - row * 12; g.globalAlpha = 1; g.fillStyle = VG(g, cy - 6, cy + 6, [[0, '#5a3a22'], [1, '#2e1c10']]); g.fillRect(cx - 30, cy - 6, 30, 12); S2(g, [cx - 28, cy - 3, cx - 4, cy - 3], '#7a5434', 0.8, 0.7); DAB(g, cx, cy, 6.6, 6, '#3e2616', 1); DAB(g, cx, cy, 5.4, 5, '#d0a874', 1); g.beginPath(); g.arc(cx, cy, 3.2, 0, TAU); g.strokeStyle = '#a07a48'; g.lineWidth = 0.8; g.stroke(); DAB(g, cx, cy, 1, 1, '#7a5434', 1); }
    // 아궁이: 둥근 돌로 쌓은 화덕 (불과 가마솥은 매 장면)
    for (const [dx, dy, w] of [[-36, 4, 26], [36, 4, 26], [-30, -18, 24], [30, -18, 24], [-14, -30, 22], [14, -30, 22], [0, -34, 18]]) PROCK(g, 600 + dx, 452 + dy, w, w * 0.7, { rock: ['#7a7280', '#3e3640'], grass: ['#3e4a3c', '#55624a', '#2a3428'] }, R);
    DAB(g, 600, 446, 18, 9, '#140a08', 1);
    // 장독대: 돌 단 위 옹기 (유약의 윤기)
    { g.globalAlpha = 1; g.fillStyle = '#5a5258'; g.fillRect(1076, 436, 196, 18); for (let x = 1078; x < 1270; x += 24) PROCK(g, x + 12, 456, 24, 10, { rock: ['#8a8290', '#4a4250'], grass: ['#3e4a3c', '#55624a', '#2a3428'] }, R);
      for (const [x, s] of [[1110, 1.1], [1160, 1.3], [1216, 1.15], [1134, 0.7], [1246, 0.75]]) { const y = 438; DAB(g, x, y + 1, 18 * s, 4 * s, '#140e10', 0.6);
        g.fillStyle = VG(g, y - 44 * s, y, [[0, '#6a3a22'], [0.6, '#4a2414'], [1, '#2a140c']]); g.beginPath(); g.moveTo(x - 12 * s, y); g.quadraticCurveTo(x - 26 * s, y - 24 * s, x - 13 * s, y - 42 * s); g.lineTo(x + 13 * s, y - 42 * s); g.quadraticCurveTo(x + 26 * s, y - 24 * s, x + 12 * s, y); g.closePath(); g.fill();
        S2(g, [x - 12 * s, y - 34 * s, x - 16 * s, y - 14 * s], '#e8c8a0', 2 * s, 0.45); DAB(g, x, y - 43 * s, 15 * s, 4 * s, '#3a2014', 1); DAB(g, x - 3 * s, y - 45 * s, 8 * s, 1.6 * s, '#a87a5a', 0.6); } }
    // 평상: 판자에 왕골 돗자리를 깔았다
    { g.globalAlpha = 1; g.fillStyle = '#5a3820'; for (const x of [64, 400, 736]) g.fillRect(x - 7, 560, 14, 40); g.fillStyle = VG(g, 548, 566, [[0, '#8a5a30'], [1, '#5a3820']]); g.fillRect(50, 548, 710, 16); S2(g, [50, 549, 760, 549], '#c08a58', 1.2, 0.7);
      g.beginPath(); g.moveTo(70, 512); g.lineTo(740, 512); g.lineTo(760, 548); g.lineTo(50, 548); g.closePath(); g.fillStyle = VG(g, 512, 548, [[0, '#d8bf82'], [1, '#b09656']]); g.fill();
      g.save(); g.clip(); for (let x = 40; x < 780; x += 5) S2(g, [x, 512, x - 10, 548], '#9a7c44', 0.8, 0.5); for (let y = 515; y < 548; y += 4) S2(g, [40, y, 780, y], '#e8d098', 0.6, 0.35); g.restore();
      g.strokeStyle = '#6a3a22'; g.lineWidth = 3; g.beginPath(); g.moveTo(70, 512); g.lineTo(740, 512); g.lineTo(760, 548); g.lineTo(50, 548); g.closePath(); g.stroke();
      DAB(g, 405, 606, 380, 14, '#0a0610', 0.4); }
    // 가장자리를 어둡게
    g.globalAlpha = 1; const vg = g.createRadialGradient(W / 2, H * 0.55, 300, W / 2, H * 0.55, 820); vg.addColorStop(0, 'rgba(0,0,10,0)'); vg.addColorStop(1, 'rgba(0,0,10,0.5)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  });
  return TBG;
}
// 이름판에 쓰는 짧은 쓰임
const SHORT = { rest: '다음 싸움 사기 +4', train: '패 하나 +1단 · 전술 강화', feast: '엽전 90 → 병력 패 둘 +1단' };
// 조각보 보따리: 여러 빛깔 천 조각을 이어 붙인 보자기로 싸서, 위에서 두 귀를 묶었다
export function bojagi(g, x, y, s = 1, R = rng(31), peek = null) {
  const cols = ['#b8322a', '#2f4d7e', '#e0b23c', '#3f6b5c', '#f3e6c4', '#c8587a', '#5a3a6a'];
  DAB(g, x + 3 * s, y, 48 * s, 9 * s, '#0a0610', 0.4);
  const body = p => { p.moveTo(x - 44 * s, y - 2 * s); p.quadraticCurveTo(x - 50 * s, y - 40 * s, x - 18 * s, y - 50 * s); p.lineTo(x + 18 * s, y - 50 * s); p.quadraticCurveTo(x + 50 * s, y - 40 * s, x + 44 * s, y - 2 * s); p.quadraticCurveTo(x, y + 6 * s, x - 44 * s, y - 2 * s); p.closePath(); };
  if (peek) peek(g, x, y - 52 * s);   // 보자기 틈으로 삐져나온 것들 (장터의 패 묶음)
  g.save(); g.beginPath(); body(g); g.clip();
  const cw = 16 * s; for (let gx = x - 52 * s, i = 0; gx < x + 52 * s; gx += cw, i++) for (let gy = y - 56 * s, j = 0; gy < y + 8 * s; gy += cw * 0.8, j++) { g.globalAlpha = 1; g.fillStyle = cols[(i * 3 + j * 5) % cols.length]; g.fillRect(gx, gy, cw + 0.5, cw * 0.8 + 0.5); g.strokeStyle = 'rgba(250,240,220,0.55)'; g.lineWidth = 0.8; g.setLineDash([2, 2]); g.strokeRect(gx + 1, gy + 1, cw - 2, cw * 0.8 - 2); g.setLineDash([]); }
  // 둥근 몸통의 그늘과 빛, 접힌 주름
  const sh = g.createRadialGradient(x - 16 * s, y - 34 * s, 4 * s, x, y - 20 * s, 60 * s); sh.addColorStop(0, 'rgba(255,255,255,0.25)'); sh.addColorStop(0.6, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.45)'); g.fillStyle = sh; g.fillRect(x - 60 * s, y - 60 * s, 120 * s, 70 * s);
  for (const [a, b] of [[-30, -46], [26, -46], [-4, -48]]) PSTROKE(g, [x + a * s, y + b * s, x + a * 0.6 * s, y - 14 * s], 'rgba(40,20,10,0.4)', 1.4 * s);
  g.restore();
  g.beginPath(); body(g); g.globalAlpha = 1; g.strokeStyle = '#2a1810'; g.lineWidth = 1.6; g.stroke();
  // 묶은 매듭과 두 귀
  g.fillStyle = '#b8322a'; g.beginPath(); g.moveTo(x - 6 * s, y - 50 * s); g.quadraticCurveTo(x - 30 * s, y - 70 * s, x - 22 * s, y - 80 * s); g.quadraticCurveTo(x - 10 * s, y - 70 * s, x, y - 54 * s); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#2f4d7e'; g.beginPath(); g.moveTo(x + 6 * s, y - 50 * s); g.quadraticCurveTo(x + 32 * s, y - 66 * s, x + 26 * s, y - 78 * s); g.quadraticCurveTo(x + 12 * s, y - 68 * s, x, y - 54 * s); g.closePath(); g.fill(); g.stroke();
  DAB(g, x, y - 53 * s, 9 * s, 7 * s, '#e0b23c', 1); g.beginPath(); g.ellipse(x, y - 53 * s, 9 * s, 7 * s, 0, 0, TAU); g.stroke(); PSTROKE(g, [x - 5 * s, y - 55 * s, x + 4 * s, y - 51 * s], '#8a6a1c', 1.2 * s);
  g.globalAlpha = 1;
}
// 평상 위 살림살이 (원점 = 바닥 가운데): 조각보 보따리 · 실로 맨 병법서와 등잔
function tavernThing(g, id, x, y, t, on) {
  const S2 = PSTROKE;
  if (id === 'supply') bojagi(g, x, y, 0.9);
  else if (id === 'study') { // 실로 맨 병법서 묶음과 등잔
    for (let k = 0; k < 3; k++) { const by = y - 10 - k * 11, c = ['#2f4d7e', '#8a2a26', '#3f6b5c'][k]; g.globalAlpha = 1; g.fillStyle = '#efe6cf'; g.fillRect(x - 32 + k * 2, by - 1, 52, 11); g.fillStyle = c; g.fillRect(x - 34 + k * 2, by, 52, 9); for (let q = 0; q < 4; q++) S2(g, [x - 30 + k * 2 + q * 4, by, x - 30 + k * 2 + q * 4, by + 9], '#f3e6c4', 0.8); }
    g.fillStyle = '#efe6cf'; g.fillRect(x - 26, y - 44, 40, 5); S2(g, [x - 20, y - 42, x + 8, y - 42], '#2a2a30', 0.8, 0.6);
    g.fillStyle = '#5a3820'; g.fillRect(x + 28, y - 8, 20, 8); S2(g, [x + 38, y - 8, x + 38, y - 46], '#5a3820', 3); DAB(g, x + 38, y - 48, 9, 3.4, '#8a6a4a', 1);
    const f = 1 + Math.sin(t * 11) * 0.08; glow(g, x + 38, y - 58, 28, '255,200,110', 0.5); DAB(g, x + 38, y - 56 * f, 3.4, 7 * f, '#ffb040', 1); DAB(g, x + 38, y - 54, 1.6, 3.6, '#fff4c0', 1);
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
    // 처마에 매단 청사초롱과 굴뚝 연기
    for (const [lx, ly] of [[868, 262], [1150, 258]]) { glow(g, lx, ly + 22, 46 + Math.sin(t * 3 + lx) * 3, '255,170,90', 0.4); line(g, [lx, ly - 8, lx, ly], '#2a1a10', 1.2); chorong(g, lx, ly, 2); }
    for (let k = 0; k < 6; k++) { const q = ((t * 0.12 + k / 6) % 1), sx = 1266 + Math.sin(q * 6 + k) * 8 - q * 30, sy = 300 - q * 180; g.globalAlpha = 0.22 * (1 - q); ell(g, sx, sy, 10 + q * 30, 7 + q * 18, '#b8b4c8'); } g.globalAlpha = 1;
    // 주모와 영웅
    const tl = this.tale && this.tale.tale, li = tl ? Math.floor(t / 3.6) % tl.lines.length : 0;
    stagePuppet(g, 'jumo', 690, 448, 1.6, t, { act: !this.result && tl ? 'talk' : 'idle', face: 1, rodSkip: [506, 552] });
    stagePuppet(g, r.hero, 852, 452, 1.6, t, { act: this.result ? (this.rt < 0.4 ? 'tremble' : 'hop') : 'idle', face: -1 });
    // 반딧불
    for (let i = 0; i < 12; i++) { const ph = i * 2.3, x = 60 + ((i * 113) % 1160) + Math.sin(t * 0.6 + ph) * 26, y = 330 + ((i * 47) % 160) + Math.sin(t * 1.1 + ph) * 12, a = clamp(Math.sin(t * 1.6 + ph), 0, 1); g.globalAlpha = a * 0.9; ell(g, x, y, 1.6, 1.6, '#fff2b0'); g.globalAlpha = 1; glow(g, x, y, 8, '255,230,140', a * 0.35); }
    // 평상 위 살림살이 (고르지 않는다)
    tavernThing(g, 'supply', 190, 518, t, true); tavernThing(g, 'study', 360, 518, t, true);
    // 인형극 무대: 달밤 주막 그림은 걸개그림, 앞에는 구경꾼
    stageFront(g, t, { open: openOf(t), seats: TAVERN_SEATS, lamps: [120, 470, 860], hop: this.result ? clamp(1 - this.rt / 1.6, 0, 1) * 0.7 : 0 });
    // 고를 것: 오른쪽 아래에 옻칠 이름판 셋을 세로로 가지런히
    const order = ['rest', 'train', 'feast'], pw = 340, ph = 76, px = W - pw - 26;
    order.forEach((id, n) => {
      const c = by[id], lack = c && c.cost && r.gold < c.cost, on = !!c && !lack, py = 452 + n * (ph + 10);
      if (!this.result && !this.left && on && tapped('tv' + id, px, py, pw, ph)) { this.hover = id; sfx('card'); this.pick(c); }
      const dn = on && !this.result && isDown('tv' + id, px, py, pw, ph);
      g.save(); if (!on || this.result) g.globalAlpha = 0.6;
      const yy = plaque(g, px, py, pw, ph, { down: dn, glow: on && !this.result && !this.left });
      const lab = c ? c.label : ({ rest: '푹 쉰다', train: '수련한다', feast: '잔치를 벌인다' })[id];
      text(g, lab, px + 30, yy + 31, { size: 23, font: FONT_B, align: 'left', maxW: pw - 60 });
      text(g, !c ? '고를 패가 없다' : lack ? `엽전 ${c.cost} 부족` : SHORT[id], px + 31, yy + 55, { size: 16, align: 'left', fill: lack || !c ? RED : '#4a3a2a', maxW: pw - 60, weight: 400 });
      if (on && !this.result) text(g, '▶', px + pw - 30, yy + ph / 2 + 1, { size: 16, fill: '#8a5a2c' });
      g.restore();
    });
    // 주모의 옛이야기: 말풍선 한 마디씩
    if (tl && !this.result) {
      // 주모 머리 바로 위에 뜨는 말풍선 (꼬리가 아래로 주모를 가리킨다)
      const x = 410, y = 190, w = 560, h = 124, tx = 690;
      rr(g, x + 3, y + 5, w, h, 16, 'rgba(10,6,16,0.45)'); poly(g, [tx - 16, y + h - 2, tx + 16, y + h - 2, tx, y + h + 24], '#fffaf0'); line(g, [tx - 16, y + h - 1, tx, y + h + 24, tx + 16, y + h - 1], INK, 2.2); rr(g, x, y, w, h, 16, '#fffaf0', INK, 2.2); rr(g, x + 4, y + 4, w - 8, h - 8, 13, null, 'rgba(201,150,46,0.6)', 1.2); g.fillStyle = '#fffaf0'; g.fillRect(tx - 14, y + h - 4, 28, 5);
      rr(g, x + 18, y + 14, 210, 26, 6, '#2f6f5c'); text(g, `옛이야기 〈${tl.title}〉`, x + 123, y + 27.5, { size: 15, fill: C.cream, maxW: 200 });
      if (this.tale.fresh) { rr(g, x + w - 148, y + 14, 130, 26, 6, '#b8742a'); text(g, `이야기책 ${this.tale.n}/${this.tale.of}`, x + w - 83, y + 27.5, { size: 13.5, fill: C.cream }); }
      { g.font = `400 19px ${FONT_B}`; const two = g.measureText(tl.lines[li]).width > w - 50; g.globalAlpha = clamp((t % 3.6) / 0.3, 0, 1); textBlock(g, tl.lines[li], x + w / 2, y + (two ? 60 : 72), w - 50, 25, { size: 19, font: FONT_B }); g.globalAlpha = 1; }   // 한 줄이면 가운데, 두 줄이면 조금 위에서
      for (let m = 0; m < tl.lines.length; m++) ell(g, x + w / 2 + (m - (tl.lines.length - 1) / 2) * 16, y + h - 12, 4, 4, m === li ? '#2f6f5c' : 'rgba(38,42,54,0.22)');
    }
    // 고른 뒤: 한지 두루마리에 결과
    if (this.result) {
      const k = clamp(this.rt / 0.3, 0, 1), rows = this.result.slice(1), x = 330, y = 120, w = 620, h = 120 + rows.length * 62;
      g.save(); g.globalAlpha = k; g.translate(0, (1 - k) * 16);
      scroll(g, x, y, w, h);
      textBlock(g, this.result[0], x + w / 2, y + 38, w - 60, 26, { size: 19.5, font: FONT_B });
      rows.forEach((s, i) => { const no = BAD.test(s) && !GOOD.test(s), yy = y + 92 + i * 62, ic = resultIcon(s); rr(g, x + 30, yy - 24, w - 60, 50, 8, no ? '#efd9cf' : '#dfe8d4', INK, 1.6); rr(g, x + 30, yy - 24, 7, 50, 3, no ? RED : TEAL); if (ic) { ic(g, x + 68, yy + 1); text(g, s, x + w / 2 + 20, yy + 1, { size: 19, fill: no ? RED : TEAL, maxW: w - 160 }); } else text(g, s, x + w / 2, yy + 1, { size: 19, fill: no ? RED : TEAL, maxW: w - 100 }); });
      g.restore();
      if (!this.said) { this.said = true; sfx('star'); }
      if (!this.left && this.rt > 0.6 && button(g, 'tvgo', 490, y + h + 16, 300, 66, '길을 떠난다', { size: 30 })) { this.left = true; this.onDone(); }
    }
    stageCurtain(g, t, openOf(t));
    panel(g, 1078, 14, 186, 48, 'tag'); icon.coin(g, 1104, 38, 13); text(g, `엽전 ${r.gold}`, 1180, 39, { size: 22, font: FONT_B, maxW: 140 });
    if (button(g, 'tvdeck', 14, 12, 220, 52, `덱 살피기 · ${r.deck.length}장`, { style: 'wood', size: 21 })) this.deck({});
  }
}

// (갈림길은 따로 화면을 띄우지 않고 행군하는 들판 위에서 고른다: render/forkmap.js · scenes/run.js 의 drawFork)
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
    // 느티나무 잎: 잎 뭉치마다 그늘진 아래 → 몸통 → 달빛 받은 위 가장자리 순으로 붓 자국을 겹친다
    { const clumps = Array.from({ length: 22 }, () => { const a = R() * TAU, d = Math.sqrt(R()); return [200 + Math.cos(a) * 250 * d, 150 + Math.sin(a) * 125 * d - 20, 46 + R() * 40]; }).sort((p, q) => p[1] - q[1]);
      for (const [cx, cy, r] of clumps) DAB(g, cx + 4, cy + r * 0.2, r * 1.05, r * 0.7, '#121f1a', 0.9);
      for (const [cx, cy, r] of clumps) { for (let k = 0; k < r * 0.9; k++) { const a = R() * TAU, d = Math.sqrt(R()) * r; DAB(g, cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.66, 5 + R() * 9, 3 + R() * 5, R() < 0.5 ? '#223a2e' : '#2c4838', 0.75); } }
      for (const [cx, cy, r] of clumps) for (let k = 0; k < r * 0.5; k++) { const a = -Math.PI * (0.15 + R() * 0.55), d = r * (0.55 + R() * 0.45); DAB(g, cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.62, 3 + R() * 6, 1.6 + R() * 3, R() < 0.5 ? '#5f8a6c' : '#7fa88a', 0.55); }
      g.globalAlpha = 1; }
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
// 보물 함 열기 (인형극 무대의 한 마당): 막이 걷힘 → 객석 불이 꺼지고 한 줄기 빛이 함에 떨어짐 → 북소리에 맞춰 함이 덜컹거리며
// 자물쇠가 달아오르고 틈새로 빛이 샘 (점점 빨리) → 뚜껑이 터지듯 열리며 번쩍, 화면이 확 다가섬, 빛살·충격파·엽전·오방색 종이꽃·금빛 구름무늬
// → 고를 것들이 빛나는 패가 되어 함에서 솟아 제자리로 퍼진다 (귀한 것일수록 더 밝게). 아무 데나 누르면 바로 연다. 고르는 규칙은 전리품과 같다
const TR_HIT = [1.02, 1.38, 1.66, 1.88, 2.04, 2.16, 2.25, 2.32], TR_BURST = 2.42, TR_LEAD = 1.15;
const TR_CH0 = [640, 566, 2.05], TR_CH1 = [640, 682, 0.9];   // 함 자리와 크기: 열기 전 (무대 한가운데) → 연 뒤 (무대 앞쪽)
const TR_SEATS = [[58, 1.55, 5, -8], [156, 1.45, 1, -10], [258, 1.5, 3, -8], [1020, 1.5, 2, -8], [1122, 1.45, 4, -10], [1224, 1.55, 0, -8],
  [100, 2.0, 0, 14], [204, 1.9, 3, 18], [314, 1.85, 5, 16], [966, 1.9, 1, 18], [1070, 2.05, 3, 14], [1178, 1.95, 0, 16]];
// 귀한 정도: 전설 3 · 두목 2 · 축 보물 1.5 · 그 밖 1
const tierOf = o => { const x = o.kind === 'relic' && RELICS[o.id]; return x ? (x.legend ? 3 : x.boss ? 2 : x.axis ? 1.5 : 1) : 1; };
const TIER_RGB = { 1: '255,214,140', 1.5: '255,190,90', 2: '255,92,76', 3: '255,240,190' };   // 보물 · 축 보물 · 두목(붉은 빛) · 전설(오방색)
// 오방색을 차례로 물들인다 (청 → 적 → 황 → 백 → 흑 대신 짙은 쪽빛)
const OB_RGB = [[70, 130, 230], [230, 80, 60], [250, 210, 90], [255, 250, 235], [90, 200, 150]];
const obangCycle = q => { const n = OB_RGB.length, i = Math.floor(((q % n) + n) % n), f = (((q % n) + n) % n) - i, a = OB_RGB[i], b = OB_RGB[(i + 1) % n]; return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * f)).join(',')})`; };
export class TreasureScene extends RewardOverlay {
  constructor(o) { super(Object.assign({ kind: 'treasure' }, o)); this.ownChest = true; this.rise = true; this.scene = g => this.grove(g); this.ct = 0; this.bt = -1; this.rb = -1; this.hits = 0; this.fx = new ChestFX(); }
  // 함의 지금 모습
  chest() {
    const ct = this.ct, bt = this.bt;
    if (bt < 0) {
      // 덜컹: 북소리마다 튀어 오르고 기우뚱, 뚜껑이 살짝 들려 빛이 샌다. 터지기 직전에는 움츠린다
      let dy = 0, rot = 0, lid = 0, kick = 0;
      TR_HIT.forEach((h, i) => { const q = (ct - h) / 0.17; if (q >= 0 && q < 1) { const k = Math.sin(Math.PI * q); dy = -k * (7 + i * 2.4); rot = k * (i % 2 ? 1 : -1) * (0.035 + i * 0.008); lid = k * (0.05 + i * 0.022); kick = 1 - q; } });
      const heat = clamp((ct - 1.0) / 1.35, 0, 1), pre = clamp((ct - (TR_BURST - 0.1)) / 0.1, 0, 1);
      return { x: TR_CH0[0], y: TR_CH0[1] + dy, s: TR_CH0[2], rot, lid, lock: heat, leak: clamp((ct - 1.15) / 1.1, 0, 1) * 0.5 + kick * (0.25 + 0.6 * heat), glow: 0, sx: 1 + 0.07 * pre, sy: 1 - 0.09 * pre, kick };
    }
    const pop = clamp(bt / 0.3, 0, 1), m = clamp((bt - 0.3) / 0.65, 0, 1), e = m * m * (3 - 2 * m), bounce = Math.sin(Math.PI * clamp(bt / 0.22, 0, 1));
    const s = (TR_CH0[2] + (TR_CH1[2] - TR_CH0[2]) * e) * (1 + 0.1 * bounce), y = TR_CH0[1] + (TR_CH1[1] - TR_CH0[1]) * e;
    return { x: TR_CH0[0], y, s, rot: 0, lid: 1.72 * easeOutBack(pop), lock: 0, leak: 0, glow: 1, sx: 1 - 0.05 * bounce, sy: 1 + 0.08 * bounce, lockOff: true, kick: 0 };
  }
  // 뚜껑을 터뜨린다 (처음 열 때) / 다시 뽑으면 함에서 새 보물이 다시 솟는다
  pop(first) {
    this.t = TR_LEAD;
    if (first) {
      this.ct = Math.max(this.ct, TR_BURST); this.bt = 0; this.hits = TR_HIT.length;
      const mouth = TR_CH0[1] - 70 * TR_CH0[2];
      this.fx.burst(640, mouth, 1); this.fx.lock(640, TR_CH0[1] - 52 * TR_CH0[2]);
      sfx('boom'); sfx('bless'); sfx('star'); sfx('coin');
    } else { const c = this.chest(); this.rb = 0; this.fx.burst(640, c.y - 70 * c.s, 0.4); sfx('star'); sfx('coin'); }
  }
  draw(g, dt) {
    this.ct += dt;
    if (this.bt < 0) {
      this.t = 0;   // 함이 열릴 때까지 전리품 시간은 멈춰 둔다
      while (this.hits < TR_HIT.length && this.ct >= TR_HIT[this.hits]) { this.hits++; sfx('thud'); if (this.hits > 3) sfx('clang'); }
      if (this.ct >= TR_BURST || (this.ct > 0.15 && tapped('trskip', 0, 0, W, H))) this.pop(true);
    } else { this.bt += dt; if (this.rb >= 0) this.rb += dt; if (this.t < TR_LEAD) this.pop(false); }
    this.fx.update(dt);
    if (this.bt < 0) {
      this.grove(g);
      stageCurtain(g, this.ct, openOf(this.ct));
      brushTitle(g, 640, 34, 420, 62, '보물 상자', '#b8862a', 36); text(g, '무엇이 들었을까…', 640, 82, { size: 20, fill: C.cream });
      if (this.ct > 0.9) { g.save(); g.globalAlpha = 0.55 + 0.25 * Math.sin(this.ct * 4); text(g, '눌러서 바로 열기', 640, 664, { size: 17, font: FONT_B, fill: '#f6e8c4', stroke: 'rgba(10,6,4,0.8)', lw: 4 }); g.restore(); }
    } else {
      super.draw(g, dt);
      // 터지는 순간이 지나면 날리는 종이꽃·엽전은 패와 단추 뒤로 지나간다 (패 설명·단추 글씨를 덮지 않게)
      g.save(); if (this.bt > 0.7) { g.beginPath(); g.rect(0, 0, W, H); g.rect(250, 104, 780, 400); g.rect(380, 514, 520, 68); g.clip('evenodd'); }
      this.fx.drawFront(g); g.restore();
      // 번쩍: 터지는 순간 화면이 하얗게, 다시 뽑을 때는 살짝
      if (this.bt < 0.42) { const q = this.bt / 0.42; g.fillStyle = `rgba(255,250,232,${0.92 * (1 - q) ** 2})`; g.fillRect(0, 0, W, H); }
      if (this.rb >= 0 && this.rb < 0.3) { const q = this.rb / 0.3; g.fillStyle = `rgba(255,246,220,${0.4 * (1 - q) ** 2})`; g.fillRect(0, 0, W, H); }
    }
  }
  grove(g) {
    const t = this.ct, bt = this.bt, c = this.chest(), mouth = c.y - 70 * c.s;
    // 카메라: 덜컹일 때 살짝 흔들리고, 터지는 순간 확 다가섰다가 돌아온다
    let z = 1, sx = 0, sy = 0;
    if (bt >= 0) { const k = (1 - clamp(bt / 0.55, 0, 1)) ** 2; z = 1 + 0.075 * k; sx = Math.sin(bt * 63) * 9 * k; sy = Math.cos(bt * 51) * 6 * k; }
    else if (c.kick > 0) { sx = Math.sin(t * 80) * 2.4 * c.kick; sy = c.kick * 1.5; }
    g.save(); g.translate(640 + sx, 430 + sy); g.scale(z, z); g.translate(-640, -430);
    g.drawImage(treasureBG(), 0, 0, W, H);
    // 반딧불
    for (let i = 0; i < 14; i++) { const ph = i * 2.1, x = 40 + ((i * 131) % 1200) + Math.sin(t * 0.5 + ph) * 30, y = 360 + ((i * 59) % 240) + Math.sin(t * 0.9 + ph) * 14, a = clamp(Math.sin(t * 1.4 + ph), 0, 1); g.globalAlpha = a * 0.9; ell(g, x, y, 1.7, 1.7, '#fff2b0'); g.globalAlpha = 1; glow(g, x, y, 9, '255,230,140', a * 0.35); }
    // 무대 틀과 구경꾼: 함이 터지면 구경꾼들이 들썩인다
    stageFront(g, t, { open: openOf(t), seats: TR_SEATS, lamps: [420, 860], hop: bt >= 0 ? clamp(1 - (bt - 0.1) / 1.8, 0, 1) : 0 });
    // 객석 불이 꺼진다 (무대 틀까지 함께)
    const dim = bt >= 0 ? 0.62 - 0.28 * clamp(bt / 1.0, 0, 1) : 0.62 * clamp((t - 0.45) / 0.45, 0, 1);
    g.fillStyle = `rgba(4,4,14,${dim})`; g.fillRect(-80, -80, W + 160, H + 160);
    // 위에서 떨어지는 한 줄기 빛
    const spot = bt >= 0 ? 1 - 0.55 * clamp(bt / 0.7, 0, 1) : clamp((t - 0.72) / 0.28, 0, 1);
    if (spot > 0) this.spot(g, c.x, c.y, spot, t);
    // 터진 뒤: 함에서 솟는 빛기둥과 천천히 도는 빛살
    if (bt >= 0) {
      const a = 0.1 + 0.4 * (1 - clamp(bt / 1.2, 0, 1)) + (this.rb >= 0 ? 0.3 * clamp(1 - this.rb / 0.8, 0, 1) : 0), wide = 70 * c.s;   // 다시 뽑으면 빛살이 한 번 더 솟는다
      g.save(); g.globalCompositeOperation = 'lighter';
      const col = g.createLinearGradient(0, 0, 0, mouth); col.addColorStop(0, 'rgba(255,236,170,0)'); col.addColorStop(1, `rgba(255,236,170,${a * 1.3})`);
      g.fillStyle = col; g.beginPath(); g.moveTo(c.x - wide, mouth); g.lineTo(c.x - wide * 2.2, 0); g.lineTo(c.x + wide * 2.2, 0); g.lineTo(c.x + wide, mouth); g.closePath(); g.fill();
      g.translate(c.x, mouth); g.rotate(t * 0.12);
      for (let k = 0; k < 18; k++) { g.rotate(TAU / 18); const len = 760, w = k % 2 ? 26 : 52, gr = g.createLinearGradient(0, 0, 0, -len); gr.addColorStop(0, `rgba(255,${k % 2 ? 250 : 226},${k % 2 ? 230 : 150},${a * (k % 2 ? 0.55 : 0.8)})`); gr.addColorStop(1, 'rgba(255,226,150,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(-3, 0); g.lineTo(-w, -len); g.lineTo(w, -len); g.lineTo(3, 0); g.closePath(); g.fill(); }
      g.restore();
      glow(g, c.x, mouth, 230 * (0.7 + 0.3 * (1 - clamp(bt / 0.6, 0, 1))), '255,226,150', 0.5 + 0.3 * (1 - clamp(bt, 0, 1)));
    } else if (c.lock > 0) glow(g, c.x, c.y - 40 * c.s, 120 + 90 * c.lock, '255,200,110', 0.25 * c.lock);
    this.fx.drawBack(g);
    drawChest(g, c.x, c.y, c.s, { lid: c.lid, glow: c.glow, lock: c.lock, lockOff: c.lockOff, leak: c.leak, rot: c.rot, sx: c.sx, sy: c.sy, t });
    g.restore();
    if (bt >= 0) this.auras(g, c, mouth);
  }
  // 한 줄기 빛: 들보에서 함 쪽으로 퍼지는 원뿔과 바닥에 고인 빛, 그 속을 떠도는 먼지
  spot(g, x, y, a, t) {
    const top = 30, wt = 44, wb = 250;
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const [k, al] of [[1.25, 0.1], [1, 0.22]]) { const gr = g.createLinearGradient(0, top, 0, y); gr.addColorStop(0, `rgba(255,244,214,${al * 1.6 * a})`); gr.addColorStop(1, `rgba(255,236,190,${al * 0.5 * a})`); g.fillStyle = gr; g.beginPath(); g.moveTo(x - wt * k, top); g.lineTo(x + wt * k, top); g.lineTo(x + wb * k, y + 10); g.lineTo(x - wb * k, y + 10); g.closePath(); g.fill(); }
    g.save(); g.translate(x, y + 4); g.scale(1, 0.2); const pr = g.createRadialGradient(0, 0, 10, 0, 0, wb * 1.1); pr.addColorStop(0, `rgba(255,240,200,${0.55 * a})`); pr.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = pr; g.fillRect(-wb * 1.2, -wb * 1.2, wb * 2.4, wb * 2.4); g.restore();
    for (let i = 0; i < 26; i++) { const q = ((t * 0.05 + i * 0.137) % 1), yy = top + 20 + q * (y - top - 40), half = wt + (wb - wt) * (yy - top) / (y - top), xx = x + Math.sin(i * 2.7 + t * 0.4) * half * 0.85, al = Math.sin(q * Math.PI) * 0.7 * a; g.fillStyle = `rgba(255,246,220,${al})`; g.fillRect(xx, yy, 1.8, 1.8); }
    g.restore();
  }
  // 고를 것들 뒤의 빛: 함에서 솟는 동안 빛 꼬리를 끌고, 자리에 앉으면 귀한 정도만큼 빛난다 (전설은 오색 빛살)
  auras(g, c, mouth) {
    const tc = this.t - TR_LEAD - 0.24, done = this.taken !== -1;
    this.p.opts.forEach((o, n) => {
      const q = tc - n * 0.1; if (q <= 0 || (done && this.taken !== n)) return;
      const k = easeOutBack(clamp(q / 0.5, 0, 1)), cx = 528 + (n * 264 - 264) * Math.min(1, k) + 112, cy = 118 + (1 - k) * 420 + 158, tier = tierOf(o), rgb = TIER_RGB[tier];
      g.save(); g.globalCompositeOperation = 'lighter';
      if (q < 0.7) { const a = 0.5 * (1 - q / 0.7), gr = g.createLinearGradient(c.x, mouth, cx, cy); gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`); g.strokeStyle = gr; g.lineCap = 'round'; g.lineWidth = 60 * (1 - q / 0.7) + 6; g.beginPath(); g.moveTo(c.x, mouth); g.quadraticCurveTo((c.x + cx) / 2, (mouth + cy) / 2 + 60, cx, cy); g.stroke(); }
      const in1 = clamp(q / 0.4, 0, 1), pul = 0.85 + 0.15 * Math.sin(this.ct * 3 + n * 1.7), r = 150 + 60 * tier, a = (0.1 + 0.1 * tier) * pul * in1;
      // 패 둘레의 빛 테: 귀할수록 굵고 넓게 번진다. 전설은 오방색이 돌아가며 물든다
      { const x = cx - 112, y = cy - 158, col = tier >= 3 ? obangCycle(this.ct * 0.8 + n) : `rgb(${rgb})`;
        g.save(); g.shadowColor = col; g.shadowBlur = 16 + tier * 12; g.strokeStyle = col; g.globalAlpha = Math.min(1, (0.3 + 0.2 * tier) * pul * in1); g.lineWidth = 3 + tier * 2.2;
        g.beginPath(); rrPath(g, x - 7, y - 7, 238, 330, 14); g.stroke(); g.stroke(); g.restore(); }
      const gr = g.createRadialGradient(cx, cy, 30, cx, cy, r); gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = gr; g.fillRect(cx - r, cy - r, r * 2, r * 2);
      if (tier >= 2) {   // 두목·전설: 패 뒤에서 빛살이 돈다 (전설은 오방색)
        g.save(); g.translate(cx, cy); g.rotate(this.ct * (tier >= 3 ? 0.35 : 0.2) + n); const m = tier >= 3 ? 15 : 10, len = r * (tier >= 3 ? 1.5 : 1.25), tw = tier >= 3 ? 30 : 22, al = tier >= 3 ? 0.55 : 0.4;
        for (let j = 0; j < m; j++) { g.rotate(TAU / m); const col = tier >= 3 ? ['255,110,90', '110,160,255', '255,220,110', '255,255,240', '120,230,160'][j % 5] : rgb, rg = g.createLinearGradient(0, 0, 0, -len); rg.addColorStop(0, `rgba(${col},${al * in1 * pul})`); rg.addColorStop(0.45, `rgba(${col},${al * 0.6 * in1 * pul})`); rg.addColorStop(1, `rgba(${col},0)`); g.fillStyle = rg; g.beginPath(); g.moveTo(-6, 0); g.lineTo(-tw, -len); g.lineTo(tw, -len); g.lineTo(6, 0); g.closePath(); g.fill(); }
        g.restore();
      }
      // 반짝이: 패 둘레에서 별빛이 돋았다 진다
      const ns = Math.round(3 + tier * 3);
      for (let j = 0; j < ns; j++) { const ph = (this.ct * 0.9 + j / ns + n * 0.31) % 1, ang = j * 2.39 + n, sx = cx + Math.cos(ang) * (120 + (j % 3) * 14), sy = cy + Math.sin(ang) * (168 + (j % 2) * 12), sa = Math.sin(ph * Math.PI) * in1, sz = (5 + tier * 2) * sa; if (sz < 0.5) continue; g.fillStyle = `rgba(255,248,220,${sa})`; g.beginPath(); g.ellipse(sx, sy, sz, sz * 0.18, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(sx, sy, sz * 0.18, sz, 0, 0, TAU); g.fill(); }
      g.restore();
    });
  }
}
// ═════════════════════════ 대장간 ═════════════════════════
// 저녁 무렵의 산골 대장간. 왼쪽엔 숯불이 이글거리는 돌 화덕과 풀무, 벽엔 집게·망치, 오른쪽엔 무기 걸이.
// 가운데 모루에서 대장장이가 쇠를 두드릴 때마다 불티가 튄다. 고를 것은 오른쪽 아래 옻칠 이름판 셋 (여러 번 들러도 하나씩 한 번)
let FGBG = null;
function forgeBG() {
  if (FGBG) return FGBG;
  FGBG = bakeScene(g => {
    const R = rng(1717), S2 = PSTROKE;
    // 돌벽: 어둑한 흙벽에 박힌 돌, 위로 갈수록 그을음
    g.globalAlpha = 1; g.fillStyle = VG(g, 0, 440, [[0, '#1a1210'], [0.5, '#3a2a22'], [1, '#4a382c']]); g.fillRect(0, 0, W, 450);
    for (let i = 0; i < 160; i++) { const x = R() * W, y = 40 + R() * 400, w = 26 + R() * 40; DAB(g, x, y, w / 2, w / 4, R() < 0.5 ? '#5a4636' : '#4a3a2e', 0.55); DAB(g, x - w * 0.15, y - w * 0.1, w * 0.3, w * 0.08, '#7a6450', 0.25); }
    g.globalAlpha = 1; g.fillStyle = VG(g, 0, 200, [[0, 'rgba(0,0,0,0.6)'], [1, 'rgba(0,0,0,0)']]); g.fillRect(0, 0, W, 200);
    // 기둥과 들보
    for (const x of [470, 940]) { g.globalAlpha = 1; g.fillStyle = VG(g, 0, 450, [[0, '#2a1a10'], [1, '#5a3a22']]); g.fillRect(x - 12, 0, 24, 450); S2(g, [x - 5, 10, x - 5, 440], '#8a6040', 1.4, 0.5); }
    g.globalAlpha = 1; g.fillStyle = VG(g, 40, 70, [[0, '#4a2e1a'], [1, '#2a1a10']]); g.fillRect(0, 44, W, 26); S2(g, [0, 47, W, 47], '#9a6a44', 1.2, 0.5);
    // 바닥: 다져진 흙, 화덕 불빛이 번진다
    g.globalAlpha = 1; g.fillStyle = VG(g, 440, H, [[0, '#4a3628'], [1, '#2a1e18']]); g.fillRect(0, 440, W, H - 440);
    for (let i = 0; i < 1800; i++) { const x = R() * W, y = 446 + R() * 280; DAB(g, x, y, 3 + R() * 12, 1 + R() * 2.5, R() < 0.5 ? '#5a4434' : '#2a1e18', 0.3); }
    { g.globalAlpha = 1; const gr = g.createRadialGradient(230, 400, 20, 230, 400, 520); gr.addColorStop(0, 'rgba(255,140,60,0.35)'); gr.addColorStop(1, 'rgba(255,140,60,0)'); g.fillStyle = gr; g.fillRect(0, 100, 900, 620); }
    // 돌 화덕과 굴뚝
    for (let y = 0; y < 190; y += 22) for (let x = 230 - 70 + (y / 22 % 2) * 12; x < 300; x += 28) PROCK(g, x, 200 - y, 30, 20, { rock: ['#7a6a60', '#3a302a'], grass: ['#3e4a3c', '#55624a', '#2a3428'] }, R);
    for (let y = 0; y < 220; y += 24) for (let x = 60 + (y / 24 % 2) * 14; x < 400; x += 32) PROCK(g, x, 470 - y, 34, 22, { rock: ['#8a7a6c', '#4a3e36'], grass: ['#3e4a3c', '#55624a', '#2a3428'] }, R);
    g.globalAlpha = 1; g.fillStyle = '#120806'; g.beginPath(); g.moveTo(120, 450); g.lineTo(120, 360); g.quadraticCurveTo(230, 290, 340, 360); g.lineTo(340, 450); g.closePath(); g.fill();
    // 풀무 (화덕 오른쪽)
    g.globalAlpha = 1; g.fillStyle = VG(g, 380, 450, [[0, '#7a5232'], [1, '#4a3020']]); g.beginPath(); g.moveTo(400, 450); g.lineTo(400, 390); g.quadraticCurveTo(440, 372, 480, 390); g.lineTo(480, 450); g.closePath(); g.fill(); S2(g, [400, 410, 480, 410], '#2a1810', 2); S2(g, [440, 380, 440, 340, 470, 330], '#6a4428', 5);
    // 벽에 걸린 연장: 집게·망치·부지깽이
    S2(g, [560, 120, 780, 120], '#2a1810', 4);
    for (const [x, kind] of [[590, 'tong'], [640, 'ham'], [690, 'tong'], [740, 'ham']]) { S2(g, [x, 120, x, 128], '#1a1008', 2); if (kind === 'tong') { S2(g, [x - 4, 128, x - 8, 230], '#3a3a44', 4); S2(g, [x + 4, 128, x + 8, 230], '#3a3a44', 4); S2(g, [x - 3, 130, x - 7, 228], '#8a8a96', 1, 0.6); } else { S2(g, [x, 128, x, 220], '#6a4428', 5); rr(g, x - 16, 212, 32, 18, 3, '#3a3a44', INK, 1.4); S2(g, [x - 14, 214, x + 14, 214], '#9a9aa6', 1.2, 0.7); } }
    // 무기 걸이 (오른쪽 벽)
    { g.globalAlpha = 1; g.fillStyle = VG(g, 150, 170, [[0, '#6a4428'], [1, '#3a2414']]); g.fillRect(990, 150, 250, 16); g.fillRect(990, 330, 250, 16);
      for (const [x, id, s, rot] of [[1020, 'spear', 1.5, -1.57], [1070, 'woldo', 1.4, -1.57], [1120, 'dangpa', 1.4, -1.57], [1170, 'hyeopdo', 1.4, -1.57]]) { g.save(); g.translate(x, 250); g.rotate(rot); weaponIcon(g, id, 0, 0, s); g.restore(); }
      for (const [x, id] of [[1030, 'twin'], [1100, 'axe'], [1180, 'flail']]) weaponIcon(g, id, x, 395, 1.1); }
    // 숫돌·물통 (오른쪽 앞)
    { g.globalAlpha = 1; g.fillStyle = VG(g, 560, 610, [[0, '#6a4a30'], [1, '#3a2818']]); g.fillRect(780, 560, 120, 50); g.globalAlpha = 1; g.fillStyle = '#2a3a48'; g.fillRect(786, 562, 108, 10); S2(g, [788, 564, 890, 564], '#6a8aa8', 1.2, 0.6); for (const x of [790, 880]) { g.fillStyle = '#2a1a10'; g.fillRect(x, 608, 10, 20); } }
    // 모루와 나무 밑동
    { g.globalAlpha = 1; g.fillStyle = VG(g, 520, 600, [[0, '#6a4a30'], [1, '#3a2818']]); g.beginPath(); g.ellipse(660, 600, 52, 14, 0, 0, TAU); g.fill(); g.fillRect(608, 548, 104, 52); g.beginPath(); g.ellipse(660, 548, 52, 14, 0, 0, TAU); g.fillStyle = '#8a6a48'; g.fill(); for (let k = 1; k < 4; k++) { g.beginPath(); g.ellipse(660, 548, 52 * k / 4, 14 * k / 4, 0, 0, TAU); g.strokeStyle = 'rgba(60,40,20,0.6)'; g.lineWidth = 1; g.stroke(); }
      const an = p => { p.moveTo(600, 506); p.lineTo(700, 506); p.quadraticCurveTo(730, 506, 738, 516); p.lineTo(690, 522); p.lineTo(680, 532); p.lineTo(686, 546); p.lineTo(634, 546); p.lineTo(640, 532); p.lineTo(628, 520); p.lineTo(600, 516); p.closePath(); };
      g.beginPath(); an(g); g.globalAlpha = 1; g.fillStyle = VG(g, 500, 546, [[0, '#5a5a66'], [1, '#22222a']]); g.fill(); g.strokeStyle = '#0a0a10'; g.lineWidth = 2; g.stroke(); S2(g, [604, 508, 700, 508], '#c8c8d4', 1.6, 0.8); }
    DAB(g, 640, 640, 300, 16, '#0a0606', 0.35);
    // 가장자리를 어둡게
    const vg = g.createRadialGradient(W / 2, H * 0.55, 300, W / 2, H * 0.55, 820); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)'); g.globalAlpha = 1; g.fillStyle = vg; g.fillRect(0, 0, W, H);
  });
  return FGBG;
}
const FORGE_ACT = [
  { id: 'temper', label: '무기 벼리기', cost: 40, sub: '병력 패 하나 · 공격 +20%, 체력 +10%' },
  { id: 'buy', label: '무기 사기', cost: 70, sub: '대장장이가 아끼는 무기 하나' },
  { id: 'sell', label: '쇠붙이 팔기', cost: 0, sub: '보관함의 무기 하나 → 엽전 +35' },
];
export class ForgeScene extends Overlay {
  constructor(o) { super(); this.onDone = o.onDone; this.done = {}; this.line = '쇠는 달았을 때 두드려야지! 무얼 해 드릴까?'; this.lineT = 0; this.res = null; this.resT = 0; }
  say(s) { this.line = s; this.lineT = 0; }
  can(a) { const r = G.run; if (this.done[a.id]) return false; if (a.cost && r.gold < a.cost) return false; if (a.id === 'temper') return r.deck.some(canTemper); if (a.id === 'sell') return r.items.length > 0; return true; }
  act(a) {
    const r = G.run; sfx('card');
    if (a.id === 'temper') this.deck({ mode: 'temper', title: '무기 벼리기', onPick: uid => { const c = temper(uid); this.sub = null; if (!c) return; r.gold -= a.cost; this.done.temper = 1; save(); sfx('star'); this.strike = 1.2; this.say('좋은 쇠가 됐소! 이제 요괴 가죽도 뚫릴 게요.'); this.res = [`[${cardName(c)}] 의 무기를 벼렸습니다`, '공격 +20% · 체력 +10%']; this.resT = 0; } });
    else if (a.id === 'buy') { r.gold -= a.cost; const s = act.weapon(); this.done.buy = 1; save(); sfx('coin'); this.strike = 1.2; this.say('이건 내 자랑이오. 잘 쓰시오.'); this.res = ['대장장이가 무기 하나를 내줍니다', s]; this.resT = 0; }
    else if (a.id === 'sell') { const w = r.items.pop(); r.gold += 35; this.done.sell = 1; save(); sfx('coin'); this.say('녹여서 보습이라도 만들지.'); this.res = [`[${WEAPONS[w] ? WEAPONS[w].name : '무기'}] 를 팔았습니다`, '엽전 +35']; this.resT = 0; }
  }
  draw(g, dt) {
    const r = G.run, t = this.t; this.lineT += dt; if (this.strike > 0) this.strike -= dt;
    g.drawImage(forgeBG(), 0, 0, W, H);
    // 화덕 숯불: 일렁이는 빛과 불꽃, 솟는 불티
    { const f = 0.8 + 0.2 * Math.sin(t * 11) * Math.sin(t * 6.3); glow(g, 230, 400, 180, '255,130,50', 0.5 * f); glow(g, 230, 420, 70, '255,200,100', 0.7 * f);
      for (let k = 0; k < 6; k++) { const x = 160 + k * 26, h = (30 + (k % 3) * 12) * (0.8 + 0.3 * Math.sin(t * 9 + k * 2)); path(g, p => { p.moveTo(x - 12, 452); p.quadraticCurveTo(x - 8, 452 - h * 0.6, x, 452 - h); p.quadraticCurveTo(x + 8, 452 - h * 0.6, x + 12, 452); p.closePath(); }, ['#ff7a2e', '#ffb040', '#ff9a2e'][k % 3]); }
      for (let k = 0; k < 14; k++) { const q = ((t * 0.5 + k / 14) % 1), x = 230 + Math.sin(k * 3 + t) * 60 * q, y = 420 - q * 330; g.globalAlpha = 1 - q; ell(g, x, y, 1.6, 1.6, '#ffd070'); } g.globalAlpha = 1; }
    // 대장장이와 영웅
    const beat = (t % 0.9) / 0.9, hit = beat < 0.12;
    stagePuppet(g, 'berserk', 560, 548, 1.75, t, { act: hit ? 'shake' : 'idle', face: 1 });
    stagePuppet(g, r.hero, 812, 552, 1.7, t, { act: this.strike > 0 ? 'hop' : 'idle', face: -1 });
    // 모루 위 달군 쇠와 불티
    { const heat = 0.6 + 0.4 * Math.sin(t * 3); rr(g, 640, 500, 46, 7, 3, `rgb(255,${140 + heat * 60},${60 + heat * 40})`, '#3a1a08', 1); glow(g, 662, 503, 40, '255,150,60', 0.5 * heat);
      const n = hit || this.strike > 0 ? 14 : 0; for (let k = 0; k < n; k++) { const a = -Math.PI * (0.15 + Math.random() * 0.7), d = 20 + Math.random() * 60; ell(g, 662 + Math.cos(a) * d, 500 + Math.sin(a) * d * 0.8, 1.8, 1.8, '#ffe080'); } if (hit) glow(g, 662, 500, 70, '255,220,140', 0.6); }
    // 물통의 김
    for (let k = 0; k < 4; k++) { const q = ((t * 0.3 + k / 4) % 1); g.globalAlpha = 0.2 * (1 - q); ell(g, 840 + Math.sin(q * 6 + k) * 10, 556 - q * 90, 14 + q * 26, 8 + q * 12, '#d8d4dc'); } g.globalAlpha = 1;
    motes(g, t, 0, 60, 900, 500, 20, '255,190,120', 0.45);
    // 인형극 무대: 대장간 그림은 걸개그림, 앞에는 구경꾼
    stageFront(g, t, { open: openOf(t), hop: this.strike > 0 ? Math.min(1, this.strike) * 0.6 : 0 });
    // 대장장이의 말
    { const k = clamp(this.lineT / 0.25, 0, 1); g.save(); g.globalAlpha = k; g.font = `400 18px ${FONT_B}`; const w = Math.min(420, g.measureText(this.line).width + 36), bx = 420, by = 352; rr(g, bx + 3, by + 4, w, 44, 12, 'rgba(0,0,0,0.4)'); rr(g, bx, by, w, 44, 12, '#fffaf0', INK, 2); poly(g, [bx + 110, by + 42, bx + 134, by + 42, bx + 128, by + 64], '#fffaf0'); line(g, [bx + 110, by + 43, bx + 128, by + 64, bx + 134, by + 43], INK, 2); text(g, this.line, bx + w / 2, by + 23, { size: 18, font: FONT_B, maxW: w - 24 }); g.restore(); }
    // 고를 것: 오른쪽 아래 옻칠 이름판 셋
    const pw = 360, ph = 76, px = W - pw - 26;
    FORGE_ACT.forEach((a, n) => {
      const py = 452 + n * (ph + 10), on = this.can(a), done = !!this.done[a.id];
      if (!this.left && !this.sub && on && tapped('fg' + a.id, px, py, pw, ph)) this.act(a);
      const dn = on && isDown('fg' + a.id, px, py, pw, ph);
      g.save(); if (!on) g.globalAlpha = 0.6;
      const yy = plaque(g, px, py, pw, ph, { down: dn, glow: on && !this.left });
      text(g, a.label + (a.cost ? ` · 엽전 ${a.cost}` : ''), px + 30, yy + 31, { size: 22, font: FONT_B, align: 'left', maxW: pw - 70 });
      const why = done ? '이번에는 했습니다' : a.cost && r.gold < a.cost ? `엽전 ${a.cost} 부족` : a.id === 'sell' && !r.items.length ? '보관함에 무기가 없다' : a.id === 'temper' && !r.deck.some(canTemper) ? '벼릴 패가 없다' : a.sub;
      text(g, why, px + 31, yy + 55, { size: 15.5, align: 'left', fill: on ? '#4a3a2a' : RED, maxW: pw - 60, weight: 400 });
      if (on) text(g, '▶', px + pw - 30, yy + ph / 2 + 1, { size: 16, fill: '#8a5a2c' });
      g.restore();
    });
    if (!this.left && button(g, 'fgleave', 30, 640, 280, 62, '대장간을 떠난다', { size: 26 })) { this.left = true; sfx('click'); this.onDone(); }
    // 한 일의 결과: 위쪽 두루마리에 잠깐
    if (this.res) { this.resT += dt; const k = clamp(this.resT / 0.25, 0, 1) * clamp((2.6 - this.resT) / 0.4, 0, 1); if (this.resT > 2.6) this.res = null; else if (k > 0) { g.save(); g.globalAlpha = k; scroll(g, 410, 96, 460, 92); text(g, this.res[0], 640, 128, { size: 19, font: FONT_B, maxW: 420 }); text(g, this.res[1], 640, 160, { size: 17, fill: TEAL, maxW: 420 }); g.restore(); } }
    stageCurtain(g, t, openOf(t));
    // 현판·엽전·덱 단추는 막보다 위에
    hangSign(g, 640, 8, '대장간', { w: 240, h: 50, size: 26, rope: false });
    panel(g, 1078, 14, 186, 48, 'tag'); icon.coin(g, 1104, 38, 13); text(g, `엽전 ${r.gold}`, 1180, 39, { size: 22, font: FONT_B, maxW: 140 });
    if (button(g, 'fgdeck', 14, 12, 220, 52, `덱 살피기 · ${r.deck.length}장`, { style: 'wood', size: 21 })) this.deck({});
  }
}
import { stopSprite } from '../render/terrain.js';
import { drawSprite } from '../render/draw.js';
function drawSpriteSafe(g, type, x, y, s) { try { drawSprite(g, stopSprite(type), x, y, s, s); } catch (e) { /* 그림이 없으면 건너뛴다 */ } }
