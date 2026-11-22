// 첫 화면: 한지에 그린 고갯길 풍경과 제목 (가로)
import { W, H } from '../config.js';
import { TAU, INK, PAPER, RED, INDIGO, OCHRE, SUB, FONT_B, text, ell, rr, poly, line, path, st, makeCanvas, rng } from '../render/draw.js';
import { button, iconBtn, icon, panel, seal, C } from '../ui/ui.js';
import { nav } from '../nav.js';
import { G, meta, save } from '../state.js';
import { chapterOf } from '../data/stages.js';
import { audio, setMuted, sfx } from '../audio.js';
import { portrait } from '../render/sprites.js';
import { THEMES, pine, bush, boulder, grassTuft } from '../render/terrain.js';
import { part, dk, lt, R as RC, curve } from '../render/figures.js';

let bg = null;
const rgba = (c, a) => `rgba(${parseInt(c.slice(1, 3), 16)},${parseInt(c.slice(3, 5), 16)},${parseInt(c.slice(5, 7), 16)},${a})`;
// 여러 장면이 함께 쓰는 배경: 붉은 해, 안개에 잠긴 겹산, 고갯마루의 솔
export function backdrop() {
  if (bg) return bg;
  const S = 1.5, c = makeCanvas(W * S, H * S), g = c.getContext('2d'); g.scale(S, S); const R = rng(77), T = THEMES.pass, SKY = '#ecdfc2';
  const sk = g.createLinearGradient(0, 0, 0, 520); sk.addColorStop(0, '#e6d6b4'); sk.addColorStop(0.5, SKY); sk.addColorStop(1, '#f3ead2'); g.fillStyle = sk; g.fillRect(0, 0, W, H);
  // 해와 해무리
  const halo = g.createRadialGradient(900, 250, 60, 900, 250, 210); halo.addColorStop(0, 'rgba(232,176,74,0.32)'); halo.addColorStop(1, 'rgba(232,176,74,0)'); g.fillStyle = halo; g.fillRect(690, 40, 420, 420);
  g.globalAlpha = 0.35; ell(g, 900, 250, 92, 92, '#f6dc9a'); g.globalAlpha = 1; ell(g, 900, 250, 74, 74, '#efc46a');   // 옅은 금빛 해 (붉은 원판 하나는 남의 나라 깃발처럼 읽힌다)
  // 구름
  const cloud = (x, y, w) => { const h = w * 0.15; path(g, p => { p.moveTo(x - w / 2, y); p.quadraticCurveTo(x - w * 0.5, y - h * 0.9, x - w * 0.28, y - h * 0.8); p.quadraticCurveTo(x - w * 0.2, y - h * 1.9, x + w * 0.02, y - h * 1.3); p.quadraticCurveTo(x + w * 0.16, y - h * 1.8, x + w * 0.26, y - h * 0.9); p.quadraticCurveTo(x + w * 0.5, y - h, x + w / 2, y); p.closePath(); }, 'rgba(255,252,242,0.8)', rgba(INK, 0.16), 1.2); line(g, [x - w * 0.3, y - h * 0.36, x + w * 0.22, y - h * 0.36], rgba(INK, 0.1), 1); };
  cloud(1010, 300, 210); cloud(730, 196, 150); cloud(1180, 150, 170); cloud(610, 330, 120);
  for (const [x0, y0] of [[690, 120], [1060, 96]]) for (let j = 0; j < 4; j++) { const x = x0 + j * 20 + R() * 6, y = y0 + (j % 2) * 9 + R() * 4; curve(g, p => { p.moveTo(x - 6, y - 2.6); p.quadraticCurveTo(x - 2.4, y - 4.4, x, y); p.quadraticCurveTo(x + 2.4, y - 4.4, x + 6, y - 2.6); }, rgba(INK, 0.55), 1.4); }
  // 겹산: 능선은 짙고 산허리는 안개에 풀린다
  [['#b3bcba', 330, 120, 0.004, 0.6], ['#8696a0', 392, 100, 0.006, 0.78], ['#5d707c', 452, 80, 0.008, 0.92]].forEach(([col, yb, amp, f, a], n) => {
    const fy = x => yb - Math.abs(Math.sin(x * f + n * 2.2)) * amp - Math.max(0, Math.sin(x * f * 2.3 + n * 1.3)) * amp * 0.28 - Math.sin(x * 0.03 + n) * 7 + Math.exp(-Math.pow((x - 760) / (220 - n * 36), 2)) * amp * 0.75;
    const shape = () => { g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 10) g.lineTo(x, fy(x)); g.lineTo(W, H); g.closePath(); };
    const gr = g.createLinearGradient(0, yb - amp, 0, yb + 70); gr.addColorStop(0, rgba(dk(col, 0.14), a)); gr.addColorStop(0.5, rgba(col, a * 0.9)); gr.addColorStop(1, rgba(lt(col, 0.5), a * 0.5)); shape(); g.fillStyle = gr; g.fill();
    g.save(); shape(); g.clip(); const cd = dk(col, 0.42); g.globalAlpha = 0.17;
    for (let x = 0; x < W; x += 16 + R() * 20) { const y = fy(x); line(g, [x, y + 3, x - 8 - R() * 12, y + 26 + R() * 30], cd, 1.4); if (R() < 0.6) line(g, [x + 5, y + 5, x + 14 + R() * 10, y + 24 + R() * 24], cd, 1.1); }
    g.restore();
    g.globalAlpha = 0.2 + n * 0.08; for (let x = 8; x < W; x += 5 + R() * 34) { const y = fy(x), h = 3 + R() * 4 + n * 1.5; line(g, [x, y + 1, x, y - h], cd, 1); ell(g, x - 0.6, y - h, 2.4 + R() * 1.8 + n * 0.6, 1.2 + n * 0.2, cd); if (R() < 0.5) ell(g, x + 1.6, y - h * 0.45, 2 + n * 0.6, 1, cd); }
    g.globalAlpha = 0.32; g.beginPath(); for (let x = 0; x <= W; x += 10) { if (x) g.lineTo(x, fy(x)); else g.moveTo(x, fy(x)); } st(g, INK, 1.4); g.globalAlpha = 1;
    const m = g.createLinearGradient(0, yb - 24, 0, yb + 84); m.addColorStop(0, 'rgba(240,230,205,0)'); m.addColorStop(1, 'rgba(240,230,205,0.94)'); g.fillStyle = m; g.fillRect(0, yb - 24, W, 108);
  });
  // 고갯마루: 번진 풀빛과 흙길
  for (let i = 0; i < 34; i++) { const x = R() * W, y = 510 + R() * 230, rx = 130 + R() * 170, ry = rx * (0.24 + R() * 0.2), col = R() < 0.5 ? '#a9b78f' : '#93a57f', a = 0.3 + R() * 0.2; g.save(); g.translate(x, y); g.rotate((R() - 0.5) * 0.4); g.scale(1, ry / rx); const gr = g.createRadialGradient(0, 0, rx * 0.2, 0, 0, rx); gr.addColorStop(0, rgba(col, a * 0.7)); gr.addColorStop(0.72, rgba(col, a)); gr.addColorStop(1, rgba(col, 0)); g.fillStyle = gr; g.fillRect(-rx, -rx, rx * 2, rx * 2); g.restore(); }
  const ry = x => 612 + Math.sin(x * 0.01) * 24 - (x - 520) * 0.12, hw = x => 30 + (1320 - x) * 0.022;
  const tp = x => Math.min(1, Math.max(0, (x - 400) / 260));   // 왼쪽 끝은 풀밭으로 스며든다
  for (let i = 0; i < 9; i++) { const gw = 24 - i * 3; g.globalAlpha = 0.085; g.fillStyle = '#f6eedb'; g.beginPath(); g.moveTo(400, ry(400)); for (let x = 420; x <= 1330; x += 20) g.lineTo(x, ry(x) - (hw(x) + gw) * tp(x)); for (let x = 1330; x >= 420; x -= 20) g.lineTo(x, ry(x) + (hw(x) + gw) * tp(x)); g.closePath(); g.fill(); }
  g.globalAlpha = 1;
  for (let i = 0; i < 3200; i++) { const x = R() * W, y = R() * H, a = R() * TAU, l = 4 + R() * 12; g.globalAlpha = 0.13; g.strokeStyle = R() < 0.5 ? '#a89468' : '#ffffff'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  for (let i = 0; i < 26; i++) { const x = R() * W, y = 520 + R() * 190; g.globalAlpha = 0.14 + R() * 0.12; for (let j = 0; j < 5; j++) ell(g, x + (R() - 0.5) * 26, y + (R() - 0.5) * 8, 2 + R() * 2, 1.1 + R() * 0.8, T.pineD, null, 0, -0.3); }
  g.globalAlpha = 1;
  for (let i = 0; i < 80; i++) grassTuft(g, R() * W, 512 + R() * 200, 0.8 + R() * 0.7, R() < 0.7 ? '#5f7a5a' : T.pine, R);
  for (let i = 0; i < 16; i++) { const x = R() * W, y = 520 + R() * 190, col = ['#f3c4c9', '#fbf7ec', '#f0d264'][(R() * 3) | 0]; line(g, [x, y + 7, x + 0.6, y], '#5f7a5a', 1.1); for (let q = 0; q < 5; q++) { const a = q / 5 * TAU - 0.3; ell(g, x + Math.cos(a) * 2.6, y + Math.sin(a) * 2.6, 1.8, 1.8, col, rgba(INK, 0.45), 0.6); } ell(g, x, y, 1.2, 1.2, OCHRE); }
  // 솟대
  line(g, [1090, 520, 1090, 400], INK, 5.4); line(g, [1090, 520, 1090, 400], '#7a5a40', 3.2); line(g, [1089, 516, 1089, 404], '#a8805c', 0.9);
  part(g, p => { p.moveTo(1072, 398); p.quadraticCurveTo(1090, 384, 1112, 396); p.lineTo(1122, 390); p.lineTo(1114, 402); p.quadraticCurveTo(1090, 410, 1072, 398); p.closePath(); }, '#3a3238', RC(1060, 399, 70, 14), { k: 0.3, lw: 1.6 }); line(g, [1072, 398, 1064, 396], INK, 1.8);
  // 앞쪽 솔과 바위, 덤불
  g.globalAlpha = 0.5; pine(g, 150, 520, 1.1, T, true); pine(g, 896, 494, 0.8, T); g.globalAlpha = 1;
  const far = g.createLinearGradient(0, 440, 0, 530); far.addColorStop(0, 'rgba(240,230,205,0)'); far.addColorStop(0.6, 'rgba(240,230,205,0.5)'); far.addColorStop(1, 'rgba(240,230,205,0)'); g.fillStyle = far; g.fillRect(0, 440, W, 90);
  boulder(g, 560, 700, 30, T); bush(g, 500, 716, 2.2, T); bush(g, 1120, 712, 2.4, T); boulder(g, 1040, 716, 22, T);
  pine(g, 40, 580, 3, T); pine(g, 1252, 610, 2.8, T, true); pine(g, 1182, 742, 2.4, T);
  grassTuft(g, 96, 584, 2, '#5f7a5a', R); grassTuft(g, 1200, 616, 2, '#5f7a5a', R);
  bg = c; return c;
}
export function dimBackdrop(g, a = 0.72) { g.drawImage(backdrop(), 0, 0, W, H); g.fillStyle = `rgba(241,231,207,${a})`; g.fillRect(0, 0, W, H); }

export class TitleScene {
  constructor() { this.t = 0; this.confirm = false; this.petals = Array.from({ length: 26 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: 3 + Math.random() * 3, v: 24 + Math.random() * 30, ph: Math.random() * 9 })); }
  frame(g, dt) {
    this.t += dt; const t = this.t;
    g.drawImage(backdrop(), 0, 0, W, H);
    // 고개를 지키는 의병과 넘어오는 요괴들
    portrait(g, 'xbow', 640, 566, 1.7, t); portrait(g, 'shield', 706, 620, 1.8, t); portrait(g, 'sword', 800, 590, 1.7, t); portrait(g, 'commander', 760, 660, 1.9, t, true);
    portrait(g, 'bomber', 1010, 470 + Math.sin(t * 2.4) * 8, 1.5, t); portrait(g, 'goblin', 960, 600, 1.6, t, true); portrait(g, 'rassassin', 1010, 680, 1.4, t); portrait(g, 'warchief', 1120, 640 + Math.sin(t * 1.6) * 4, 1.2, t);
    for (const p of this.petals) { p.x -= (p.v + Math.sin(t * 1.3 + p.ph) * 12) * dt; p.y += (p.v * 0.5 + Math.cos(t * 1.7 + p.ph) * 10) * dt; if (p.x < -12 || p.y > H + 12) { p.x = W + 12 + Math.random() * 80; p.y = Math.random() * H * 0.8; } g.save(); g.globalAlpha = 0.85; g.translate(p.x, p.y); g.rotate(t * 1.6 + p.ph); g.scale(1, 0.35 + 0.65 * Math.abs(Math.sin(t * 2.2 + p.ph))); ell(g, 0, 0, p.s * 1.25, p.s * 0.7, p.ph > 4.5 ? '#f3c4c9' : '#fbf1ee', 'rgba(38,42,54,0.4)', 0.7); g.restore(); }
    // 제목
    const ty = 150 + Math.sin(t * 1.3) * 3;
    text(g, '도깨비', 250, ty, { size: 132, font: FONT_B, fill: INK, stroke: '#ecdfc2', lw: 10 });
    text(g, '고개', 400, ty + 128, { size: 132, font: FONT_B, fill: INK, stroke: '#ecdfc2', lw: 10 });
    g.save(); g.translate(520, ty - 34); g.rotate(0.06); seal(g, 0, 0, 78, 'boss'); g.restore();   // 제목 옆의 낙관: 도깨비 얼굴
    text(g, '열두 고개, 열두 옛이야기 — 긴 밤을 걷으러 가는 길', 372, ty + 232, { size: 22, fill: SUB, stroke: '#ecdfc2', lw: 5 });
    const r = G.run;
    if (this.confirm) {
      g.fillStyle = 'rgba(31,42,68,0.55)'; g.fillRect(0, 0, W, H);
      panel(g, 360, 210, 560, 300);
      text(g, '새 원정을 시작할까요?', 640, 284, { size: 38, font: FONT_B });
      text(g, '진행 중인 원정 기록은 사라집니다.', 640, 338, { size: 22, fill: SUB, weight: 400 });
      if (button(g, 'no', 390, 400, 240, 78, '그만두기', { style: 'paper', size: 30 })) this.confirm = false;
      if (button(g, 'yes', 650, 400, 240, 78, '새로 시작', { style: 'red', size: 30 })) { G.run = null; save(); nav.go('hero'); }
      return;
    }
    if (r) {
      if (button(g, 'cont', 120, 458, 400, 92, `이어하기 · ${chapterOf(r.ch).short}`, { size: 38 })) nav.go('run');
      if (button(g, 'new', 120, 572, 192, 60, '새 원정', { style: 'paper', size: 26 })) this.confirm = true;
      if (button(g, 'meta', 328, 572, 192, 60, '공적 장부', { style: 'paper', size: 26 })) nav.go('meta');
    } else {
      const pulse = 1 + Math.sin(t * 4) * 0.012;
      g.save(); g.translate(320, 506); g.scale(pulse, pulse); g.translate(-320, -506);
      if (button(g, 'start', 120, 454, 400, 104, '출  정', { size: 56 })) nav.go('hero');
      g.restore();
      if (button(g, 'meta', 190, 576, 260, 58, `공적 장부${meta.merit ? ' · ' + meta.merit : ''}`, { style: 'paper', size: 25 })) nav.go('meta');
    }
    if (iconBtn(g, 'snd', 1204, 648, 60, 56, (gg, x, y) => icon.sound(gg, x - 3, y, !audio.muted))) { setMuted(!audio.muted); sfx('click'); }
    if (meta.best > 0) { panel(g, 16, 16, 230, 40, 'tag'); text(g, meta.clears ? `평정 ${meta.clears}회` : `최고 기록 · ${chapterOf(Math.floor((meta.best - 1) / 6)).short}`, 131, 37, { size: 17, maxW: 210 }); }
  }
}
