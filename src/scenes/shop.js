// 장터: 엽전으로 부대·보물·조련을 산다
import { W, H } from '../config.js';
import { TAU, INK, PAPER, RED, INDIGO, TEAL, OCHRE, SUB, FONT_B, text, textBlock, ell, rr, rrPath } from '../render/draw.js';
import { button, panel, brushTitle, stamp, icon, C } from '../ui/ui.js';
import { nav } from '../nav.js';
import { G, save, describeReward, buyItem, finishNode, cap, used } from '../state.js';
import { dimBackdrop } from './title.js';
import { portrait } from './battle.js';
import { sfx } from '../audio.js';

const COL = { blue: INDIGO, green: TEAL, purple: '#b8742a', gold: RED };
export class ShopScene {
  constructor() { this.t = 0; this.r = G.run; this.items = this.r.pending.items; }
  frame(g, dt) {
    this.t += dt; const r = this.r, t = this.t, items = this.items;
    dimBackdrop(g, 0.8);
    brushTitle(g, 360, 88, 360, 78, '장터', '#b8742a', 46);
    panel(g, 510, 150, 194, 44, 'tag'); icon.coin(g, 536, 172, 13); text(g, `엽전 ${r.gold}`, 618, 173, { size: 22, maxW: 140 });
    icon.sack(g, 34, 170, 0.95); text(g, `군량 ${used()} / ${cap()}`, 54, 173, { size: 20, align: 'left', fill: SUB });
    text(g, '필요한 것을 골라 사세요', 360, 232, { size: 22, fill: SUB, weight: 400 });
    items.forEach((it, n) => {
      const d = describeReward(it), col = COL[d.col], w = 326, h = 256, x = 24 + (n % 2) * 346, y = 268 + Math.floor(n / 2) * 272, afford = r.gold >= it.price;
      g.save(); if (it.sold) g.globalAlpha = 0.5;
      rr(g, x + 3, y + 5, w, h, 6, 'rgba(50,36,20,0.22)'); rr(g, x, y, w, h, 6, PAPER, INK, 2.6);
      g.save(); g.beginPath(); rrPath(g, x + 2, y + 2, w - 4, 40, 5); g.clip(); g.fillStyle = col; g.fillRect(x, y, w, 42); g.restore(); text(g, d.title, x + w / 2, y + 23, { size: 22, font: FONT_B, fill: C.cream });
      rr(g, x + 12, y + 54, 96, 112, 5, '#efe4c9', INK, 1.4); g.save(); g.beginPath(); g.rect(x + 13, y + 55, 94, 110); g.clip();
      if (it.kind === 'recruit' || it.kind === 'train' || it.kind === 'reinforce') portrait(g, it.type, x + 60, y + 156, 1.25, t + n, !it.sold); else if (it.kind === 'relic') stamp(g, x + 60, y + 110, 34, '보', '#b8742a', -0.1); else if (it.kind === 'cleanse') stamp(g, x + 60, y + 110, 34, '정', TEAL, -0.1); else icon.sack(g, x + 60, y + 114, 2.6);
      g.restore();
      text(g, d.name, x + 120, y + 74, { size: 21, font: FONT_B, align: 'left', maxW: w - 132 });
      textBlock(g, d.desc.split('\n').join(' '), x + 120, y + 104, w - 134, 22, { size: 15.5, align: 'left', fill: SUB, weight: 400 });
      g.restore();
      if (it.sold) stamp(g, x + w - 70, y + h - 44, 30, '득', RED, -0.14);
      else if (button(g, 'buy' + n, x + 14, y + h - 70, w - 28, 56, `엽전 ${it.price}`, { style: afford ? 'indigo' : 'grey', size: 26 })) { if (!this.left && buyItem(n)) sfx('coin'); else sfx('deny'); }
    });
    if (!this.left && button(g, 'leave', 190, 1118, 340, 84, '장터를 떠난다', { style: 'paper', size: 34 })) { this.left = true; finishNode(); nav.go('map'); }
  }
}
