// 첫 화면: 한지에 그린 고갯길 풍경과 제목
import { W, H } from '../config.js';
import { TAU, INK, PAPER, RED, INDIGO, OCHRE, SUB, FONT_B, text, ell, rr, poly, line, path, st, makeCanvas, rng } from '../render/draw.js';
import { button, iconBtn, icon, panel, seal, C } from '../ui/ui.js';
import { nav } from '../nav.js';
import { G, meta, save } from '../state.js';
import { STAGES } from '../data/stages.js';
import { audio, setMuted, sfx } from '../audio.js';
import { portrait } from './battle.js';

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
  const S = 2, c = makeCanvas(W * S, H * S), g = c.getContext('2d'); g.scale(S, S); const R = rng(77);
  g.fillStyle = '#ecdfc2'; g.fillRect(0, 0, W, H);
  ell(g, 520, 470, 92, 92, '#d9553f'); g.globalAlpha = 0.25; ell(g, 520, 470, 118, 118, '#d9553f'); g.globalAlpha = 1;
  [['#a9b4b4', 560, 150, 0.006, 0.55], ['#7f8f96', 640, 120, 0.009, 0.7], ['#5a6b74', 730, 96, 0.012, 0.85]].forEach(([col, yb, amp, f, a], n) => {
    g.globalAlpha = a; g.fillStyle = col; g.beginPath(); g.moveTo(0, 1280); for (let x = 0; x <= W; x += 20) { const gap = Math.exp(-Math.pow((x - 380) / (150 - n * 26), 2)) * amp * 0.75; g.lineTo(x, yb - Math.abs(Math.sin(x * f + n * 2.2)) * amp - Math.sin(x * 0.04 + n) * 8 + gap); } g.lineTo(W, 1280); g.closePath(); g.fill();
    g.globalAlpha = 1; const m = g.createLinearGradient(0, yb - 20, 0, yb + 90); m.addColorStop(0, 'rgba(236,223,194,0)'); m.addColorStop(1, 'rgba(236,223,194,0.92)'); g.fillStyle = m; g.fillRect(0, yb - 20, W, 110);
  });
  for (let i = 0; i < 22; i++) { g.globalAlpha = 0.4; g.fillStyle = R() < 0.5 ? '#a9b78f' : '#93a57f'; g.beginPath(); g.ellipse(R() * W, 860 + R() * 420, 90 + R() * 130, 46 + R() * 60, R() * 3, 0, TAU); g.fill(); }
  g.globalAlpha = 0.6; g.fillStyle = '#f3ead4'; for (let y = 760; y < 1300; y += 50) { g.beginPath(); g.ellipse(380 + Math.sin(y * 0.012) * 60 - (y - 760) * 0.05, y, 60 + (y - 760) * 0.22, 40, 0, 0, TAU); g.fill(); }
  g.globalAlpha = 1;
  for (let i = 0; i < 2400; i++) { const x = R() * W, y = R() * H, a = R() * TAU, l = 4 + R() * 12; g.globalAlpha = 0.13; g.strokeStyle = R() < 0.5 ? '#a89468' : '#ffffff'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  g.globalAlpha = 1;
  for (let i = 0; i < 60; i++) { const x = R() * W, y = 880 + R() * 380; line(g, [x - 3, y, x - 4.5, y - 7], '#5f7a5a', 1.3); line(g, [x, y, x, y - 9], '#5f7a5a', 1.3); line(g, [x + 3, y, x + 4.5, y - 7], '#5f7a5a', 1.3); }
  // 솟대
  line(g, [610, 900, 610, 760], INK, 5); line(g, [610, 900, 610, 760], '#7a5a40', 3); path(g, p => { p.moveTo(592, 758); p.quadraticCurveTo(610, 744, 632, 756); p.lineTo(642, 750); p.lineTo(634, 762); p.quadraticCurveTo(610, 770, 592, 758); }, '#3a3238', INK, 1.6);
  pineBig(g, 60, 1000, 1.5); pineBig(g, 676, 1090, 1.3, true); pineBig(g, 14, 1250, 1.2, true);
  bg = c; return c;
}
export function dimBackdrop(g, a = 0.72) { g.drawImage(backdrop(), 0, 0, W, H); g.fillStyle = `rgba(241,231,207,${a})`; g.fillRect(0, 0, W, H); }

export class TitleScene {
  constructor() { this.t = 0; this.confirm = false; }
  frame(g, dt) {
    this.t += dt; const t = this.t;
    g.drawImage(backdrop(), 0, 0, W, H);
    // 고개 너머에서 넘어오는 요괴들과 지키는 의병
    portrait(g, 'warchief', 548, 770 + Math.sin(t * 1.6) * 4, 1.25, t); portrait(g, 'goblin', 448, 800, 1.7, t, true); portrait(g, 'bomber', 648, 700 + Math.sin(t * 2.4) * 8, 1.6, t); portrait(g, 'rassassin', 470, 880, 1.5, t);
    portrait(g, 'xbow', 110, 930, 1.9, t); portrait(g, 'sword', 320, 950, 1.9, t); portrait(g, 'shield', 150, 1010, 2.0, t); portrait(g, 'commander', 244, 990, 2.0, t, true);
    // 제목
    const ty = 238 + Math.sin(t * 1.3) * 3;
    text(g, '도깨비', 300, ty - 58, { size: 150, font: FONT_B, fill: INK, stroke: '#ecdfc2', lw: 10 });
    text(g, '고개', 404, ty + 84, { size: 150, font: FONT_B, fill: INK, stroke: '#ecdfc2', lw: 10 });
    g.save(); g.translate(596, ty - 96); g.rotate(0.06); seal(g, 0, 0, 86, '진'); g.restore();
    text(g, '깃발을 들어 고개를 지켜라', 360, ty + 196, { size: 28, fill: SUB });
    const r = G.run;
    if (this.confirm) {
      g.fillStyle = 'rgba(31,42,68,0.55)'; g.fillRect(0, 0, W, H);
      panel(g, 80, 470, 560, 300);
      text(g, '새 원정을 시작할까요?', 360, 544, { size: 38, font: FONT_B });
      text(g, '진행 중인 원정 기록은 사라집니다.', 360, 598, { size: 22, fill: SUB, weight: 400 });
      if (button(g, 'no', 110, 660, 240, 78, '그만두기', { style: 'paper', size: 30 })) this.confirm = false;
      if (button(g, 'yes', 370, 660, 240, 78, '새로 시작', { style: 'red', size: 30 })) { G.run = null; save(); nav.go('hero'); }
      return;
    }
    if (r) {
      const stg = STAGES[Math.min(r.stage, STAGES.length - 1)];
      if (button(g, 'cont', 140, 1066, 440, 100, `이어하기  ${stg.id}`, { size: 46 })) nav.go(r.rewardPending ? 'reward' : 'battle');
      if (button(g, 'new', 210, 1184, 300, 66, '새 원정', { style: 'paper', size: 30 })) this.confirm = true;
    } else {
      const pulse = 1 + Math.sin(t * 4) * 0.012;
      g.save(); g.translate(360, 1130); g.scale(pulse, pulse); g.translate(-360, -1130);
      if (button(g, 'start', 150, 1074, 420, 112, '출  정', { size: 58 })) nav.go('hero');
      g.restore();
    }
    if (iconBtn(g, 'snd', 644, 1196, 60, 56, (gg, x, y) => icon.sound(gg, x - 3, y, !audio.muted))) { setMuted(!audio.muted); sfx('click'); }
    if (meta.best > 0) { panel(g, 16, 1206, 196, 40, 'tag'); text(g, `최고 기록 ${STAGES[Math.min(meta.best, STAGES.length) - 1].id}${meta.clears ? ` · 평정 ${meta.clears}` : ''}`, 114, 1227, { size: 17, maxW: 176 }); }
  }
}
