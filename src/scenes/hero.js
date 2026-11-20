// 영웅 고르기
import { W, H } from '../config.js';
import { TAU, INK, PAPER, RED, INDIGO, SUB, FONT_B, text, textBlock, ell, rr } from '../render/draw.js';
import { button, panel, brushTitle, seal, C, tapped } from '../ui/ui.js';
import { nav } from '../nav.js';
import { newRun, heroOpen, UNLOCKS, meta } from '../state.js';
import { UNITS, HEROES } from '../data/units.js';
import { CARDS, KIND, starterDeck } from '../data/cards.js';
import { dimBackdrop } from './title.js';
import { portrait } from './battle.js';
import { cardIcon } from '../render/icons.js';
import { sfx } from '../audio.js';

export class HeroScene {
  constructor() { this.t = 0; this.sel = 0; }
  frame(g, dt) {
    this.t += dt; dimBackdrop(g);
    brushTitle(g, 360, 92, 430, 76, '영웅을 고르세요', INDIGO, 42);
    text(g, '영웅마다 전용 패 두 장을 들고 시작합니다 (기본 패 7장 + 전용 2장)', 360, 164, { size: 20, fill: SUB, weight: 400, maxW: 660 });
    HEROES.forEach((id, i) => {
      const d = UNITS[id], cards = Object.values(CARDS).filter(c => c.hero === id), y = 208 + i * 286, on = this.sel === i;
      const locked = !heroOpen(id);
      if (tapped('h' + i, 40, y, 640, 266)) { if (locked) sfx('deny'); else { this.sel = i; sfx('card'); } }
      panel(g, 40, y, 640, 266);
      if (on) { rr(g, 36, y - 4, 648, 274, 9, null, RED, 5); }
      ell(g, 150, y + 132, 86, 86, on ? '#efd9a8' : '#e9dec4', INK, 2.4); g.save(); g.beginPath(); g.arc(150, y + 132, 84, 0, TAU); g.clip(); g.fillStyle = '#a9b78f'; g.globalAlpha = 0.5; g.fillRect(60, y + 170, 180, 60); g.globalAlpha = 1; portrait(g, id, 148, y + 204, 1.75, this.t, on); g.restore();
      text(g, d.name, 264, y + 50, { size: 44, font: FONT_B, align: 'left' });
      text(g, d.desc, 266, y + 94, { size: 21, align: 'left', fill: SUB });
      rr(g, 260, y + 118, 398, 126, 5, on ? '#fbf3df' : '#efe4c9', INK, 1.6);
      cards.forEach((c, n) => { const yy = y + 150 + n * 60; rr(g, 268, yy - 24, 48, 48, 7, '#f3e3c0', KIND.hero.col, 1.8); cardIcon(g, c.id, 292, yy, 0.86); ell(g, 272, yy - 20, 12, 12, '#d9a441', INK, 1.6); text(g, String(c.cost), 272, yy - 19, { size: 16, font: FONT_B }); text(g, c.name, 326, yy - 13, { size: 22, font: FONT_B, align: 'left' }); text(g, c.desc(c.v), 326, yy + 13, { size: 15, align: 'left', weight: 400, fill: SUB, maxW: 322 }); });
      if (locked) { rr(g, 40, y, 640, 266, 6, 'rgba(241,231,207,0.78)'); rr(g, 190, y + 96, 340, 74, 37, '#1f2a44', INK, 3); text(g, `공적 장부에서 열기 · 공적 ${UNLOCKS.find(u => u.id === id).cost}`, 360, y + 134, { size: 21, fill: C.cream, maxW: 310 }); }
    });
    if (button(g, 'go', 250, 1102, 430, 106, meta.hard ? `출정 · 험로 ${meta.hard}` : '출  정', { size: meta.hard ? 40 : 54 })) { newRun(HEROES[this.sel]); nav.go('map'); }
    if (button(g, 'back', 40, 1116, 180, 80, '뒤로', { style: 'paper', size: 30 })) nav.go('title');
  }
}
