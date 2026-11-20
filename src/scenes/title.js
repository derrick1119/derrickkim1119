// 첫 화면: 한지에 그린 고갯길 풍경과 제목 (가로)
import { W, H } from '../config.js';
import { TAU, INK, PAPER, RED, INDIGO, OCHRE, SUB, FONT_B, text, ell, rr, poly, line, path, st, makeCanvas, rng } from '../render/draw.js';
import { button, iconBtn, icon, panel, seal, C } from '../ui/ui.js';
import { nav } from '../nav.js';
import { G, meta, save } from '../state.js';
import { CHAPTERS } from '../data/stages.js';
import { audio, setMuted, sfx } from '../audio.js';
import { portrait } from '../render/sprites.js';

let bg = null;
function pineBig(g, x, y, s, flip) {
  g.save(); g.translate(x, y); g.scale(s * (flip ? -1 : 1), s);
  const tr = p => { p.moveTo(-4, 0); p.bezierCurveTo(8, -40, -14, -80, 6, -130); };
  g.beginPath(); tr(g); st(g, INK, 13); g.beginPath(); tr(g); st(g, '#7a5a40', 9.5);
  for (const [cx, cy, rx] of [[-34, -84, 46], [30, -108, 44], [-10, -142, 42], [26, -160, 30]]) { ell(g, cx, cy, rx, rx * 0.4, '#3f6b5c', INK, 2); for (let i = -2; i <= 2; i++) line(g, [cx + i * rx * 0.3, cy - rx * 0.28, cx + i * rx * 0.34, cy + rx * 0.08], '#2c4f44', 1.5); g.globalAlpha = 0.5; ell(g, cx - rx * 0.2, cy - rx * 0.15, rx * 0.5, rx * 0.11, '#6f9a86'); g.globalAlpha = 1; }
  g.restore();
}
// 여러 장면이 함께 쓰는 배경
export function backdrop() {
  if (bg) return bg;
  const S = 1.5, c = makeCanvas(W * S, H * S), g = c.getContext('2d'); g.scale(S, S); const R = rng(77);
  g.fillStyle = '#ecdfc2'; g.fillRect(0, 0, W, H);
  ell(g, 900, 250, 78, 78, '#d9553f'); g.globalAlpha = 0.25; ell(g, 900, 250, 102, 102, '#d9553f'); g.globalAlpha = 1;
  [['#a9b4b4', 330, 120, 0.004, 0.55], ['#7f8f96', 390, 96, 0.006, 0.7], ['#5a6b74', 450, 76, 0.008, 0.85]].forEach(([col, yb, amp, f, a], n) => {
    g.globalAlpha = a; g.fillStyle = col; g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 20) { const gap = Math.exp(-Math.pow((x - 760) / (220 - n * 36), 2)) * amp * 0.75; g.lineTo(x, yb - Math.abs(Math.sin(x * f + n * 2.2)) * amp - Math.sin(x * 0.03 + n) * 8 + gap); } g.lineTo(W, H); g.closePath(); g.fill();
    g.globalAlpha = 1; const m = g.createLinearGradient(0, yb - 20, 0, yb + 80); m.addColorStop(0, 'rgba(236,223,194,0)'); m.addColorStop(1, 'rgba(236,223,194,0.92)'); g.fillStyle = m; g.fillRect(0, yb - 20, W, 100);
  });
  for (let i = 0; i < 30; i++) { g.globalAlpha = 0.4; g.fillStyle = R() < 0.5 ? '#a9b78f' : '#93a57f'; g.beginPath(); g.ellipse(R() * W, 500 + R() * 240, 110 + R() * 150, 40 + R() * 50, R() * 3, 0, TAU); g.fill(); }
  g.globalAlpha = 0.6; g.fillStyle = '#f3ead4'; for (let x = 520; x < 1320; x += 46) { g.beginPath(); g.ellipse(x, 610 + Math.sin(x * 0.01) * 26 - (x - 520) * 0.12, 60, 34 + (1320 - x) * 0.02, 0, 0, TAU); g.fill(); }
  g.globalAlpha = 1;
  for (let i = 0; i < 3200; i++) { const x = R() * W, y = R() * H, a = R() * TAU, l = 4 + R() * 12; g.globalAlpha = 0.13; g.strokeStyle = R() < 0.5 ? '#a89468' : '#ffffff'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  g.globalAlpha = 1;
  for (let i = 0; i < 90; i++) { const x = R() * W, y = 510 + R() * 200; line(g, [x - 3, y, x - 4.5, y - 7], '#5f7a5a', 1.3); line(g, [x, y, x, y - 9], '#5f7a5a', 1.3); line(g, [x + 3, y, x + 4.5, y - 7], '#5f7a5a', 1.3); }
  // 솟대
  line(g, [1090, 520, 1090, 400], INK, 5); line(g, [1090, 520, 1090, 400], '#7a5a40', 3); path(g, p => { p.moveTo(1072, 398); p.quadraticCurveTo(1090, 384, 1112, 396); p.lineTo(1122, 390); p.lineTo(1114, 402); p.quadraticCurveTo(1090, 410, 1072, 398); }, '#3a3238', INK, 1.6);
  pineBig(g, 40, 560, 1.5); pineBig(g, 1250, 600, 1.4, true); pineBig(g, 1180, 730, 1.2);
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
    g.save(); g.translate(520, ty - 34); g.rotate(0.06); seal(g, 0, 0, 78, '진'); g.restore();
    text(g, '패를 뽑아 군대를 세우고, 고개를 넘어 지켜라', 372, ty + 232, { size: 22, fill: SUB, stroke: '#ecdfc2', lw: 5 });
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
      if (button(g, 'cont', 120, 458, 400, 92, `이어하기 · ${CHAPTERS[Math.min(2, r.ch)].short}`, { size: 38 })) nav.go('run');
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
    if (meta.best > 0) { panel(g, 16, 16, 230, 40, 'tag'); text(g, meta.clears ? `평정 ${meta.clears}회` : `최고 기록 · ${CHAPTERS[Math.min(2, Math.floor((meta.best - 1) / 7))].short}`, 131, 37, { size: 17, maxW: 210 }); }
  }
}
