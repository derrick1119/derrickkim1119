// 영웅 고르기 (가로)
import { W, H } from '../config.js';
import { TAU, INK, PAPER, RED, INDIGO, SUB, FONT_B, text, textBlock, ell, rr } from '../render/draw.js';
import { button, panel, brushTitle, C, tapped } from '../ui/ui.js';
import { nav } from '../nav.js';
import { newRun, heroOpen, UNLOCKS, meta } from '../state.js';
import { UNITS, HEROES } from '../data/units.js';
import { CARDS, KIND } from '../data/cards.js';
import { dimBackdrop } from './title.js';
import { portrait } from '../render/sprites.js';
import { cardIcon } from '../render/icons.js';
import { sfx } from '../audio.js';

export class HeroScene {
  constructor() { this.t = 0; this.sel = 0; }
  frame(g, dt) {
    this.t += dt; dimBackdrop(g);
    brushTitle(g, 640, 50, 430, 66, '영웅을 고르세요', INDIGO, 38);
    text(g, '영웅도 패입니다 — 영웅 패 한 장과 전용 영웅기 두 장을 들고 떠납니다 (병력 5 · 전술 5 포함 13장)', 640, 106, { size: 18, fill: SUB, weight: 400, maxW: 1100 });
    HEROES.forEach((id, i) => {
      const d = UNITS[id], cards = Object.values(CARDS).filter(c => c.hero === id), x = 40 + i * 404, y = 132, w = 392, h = 420, on = this.sel === i, locked = !heroOpen(id);
      if (tapped('h' + i, x, y, w, h)) { if (locked) sfx('deny'); else { this.sel = i; sfx('card'); } }
      panel(g, x, y, w, h); if (on) rr(g, x - 4, y - 4, w + 8, h + 8, 9, null, RED, 5);
      ell(g, x + 104, y + 106, 78, 78, on ? '#efd9a8' : '#e9dec4', INK, 2.4); g.save(); g.beginPath(); g.arc(x + 104, y + 106, 76, 0, TAU); g.clip(); g.fillStyle = '#a9b78f'; g.globalAlpha = 0.5; g.fillRect(x + 20, y + 142, 170, 50); g.globalAlpha = 1; portrait(g, id, x + 102, y + 172, 1.6, this.t, on); g.restore();
      text(g, d.name, x + 200, y + 74, { size: 44, font: FONT_B, align: 'left' });
      text(g, d.desc, x + 202, y + 118, { size: 18, align: 'left', fill: SUB, maxW: 176 });
      text(g, `체력 ${Math.round(d.hp * 2.2)} · 패 비용 4`, x + 202, y + 148, { size: 15, align: 'left', fill: SUB, weight: 400, maxW: 176 });
      cards.forEach((c, n) => { const yy = y + 236 + n * 86; rr(g, x + 18, yy - 36, w - 36, 76, 6, on ? '#fbf3df' : '#efe4c9', INK, 1.4); rr(g, x + 26, yy - 28, 60, 60, 7, '#f3e3c0', KIND.hero.col, 1.8); cardIcon(g, c.id, x + 56, yy + 2, 1.05); ell(g, x + 32, yy - 24, 12, 12, '#d9a441', INK, 1.6); text(g, String(c.cost), x + 32, yy - 23, { size: 16, font: FONT_B }); text(g, c.name, x + 98, yy - 14, { size: 22, font: FONT_B, align: 'left' }); textBlock(g, c.desc(c.v), x + 98, yy + 10, w - 130, 18, { size: 14, align: 'left', weight: 400, fill: SUB }); });
      if (locked) { rr(g, x, y, w, h, 6, 'rgba(241,231,207,0.78)'); rr(g, x + 36, y + 172, w - 72, 70, 35, '#1f2a44', INK, 3); text(g, `공적 장부에서 열기 · 공적 ${UNLOCKS.find(u => u.id === id).cost}`, x + w / 2, y + 208, { size: 19, fill: C.cream, maxW: w - 100 }); }
    });
    if (button(g, 'go', 840, 584, 400, 100, meta.hard ? `출정 · 험로 ${meta.hard}` : '출  정', { size: meta.hard ? 38 : 52 })) { newRun(HEROES[this.sel]); nav.go('run'); }
    if (button(g, 'back', 40, 596, 200, 76, '뒤로', { style: 'paper', size: 30 })) nav.go('title');
    text(g, '부대가 전멸하면 패는 덱으로 돌아오지만 군기 수레가 깎입니다. 군기를 지키며 세 고개를 넘으세요.', 540, 634, { size: 16, fill: SUB, weight: 400, maxW: 560 });
  }
}
