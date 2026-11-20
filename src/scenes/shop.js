// 장터: 엽전으로 부대·보물·조련·전술 패·무기를 사고, 필요 없는 패를 태운다
import { W, H } from '../config.js';
import { TAU, INK, PAPER, RED, INDIGO, TEAL, OCHRE, SUB, FONT_B, text, textBlock, ell, rr, rrPath } from '../render/draw.js';
import { ui, button, panel, brushTitle, stamp, icon, C } from '../ui/ui.js';
import { nav } from '../nav.js';
import { G, save, describeReward, buyItem, removeCard, finishNode, cap, used } from '../state.js';
import { KIND, CARDS, cardName } from '../data/cards.js';
import { dimBackdrop } from './title.js';
import { portrait, weaponIcon } from '../render/sprites.js';
import { cardFace, DeckView, ArmyView } from '../ui/cards.js';
import { sfx } from '../audio.js';

const COL = { blue: INDIGO, green: TEAL, purple: '#b8742a', gold: RED };
export class ShopScene {
  constructor() { this.t = 0; this.r = G.run; this.items = this.r.pending.items; this.over = null; this.msg = ''; this.msgT = 0; }
  burn(n) {
    const r = this.r, it = this.items[n]; if (r.gold < it.price) { sfx('deny'); return; }
    this.over = new DeckView({ mode: 'burn', onClose: () => { this.over = null; }, onPick: k => { const c = removeCard(k); this.over = null; if (!c) return; buyItem(n); this.msg = `[${cardName(c)}] 을(를) 태웠습니다`; this.msgT = 2.4; sfx('coin'); } });
  }
  frame(g, dt) {
    this.t += dt; const r = this.r, t = this.t, items = this.items; ui.top = this.over ? 1 : 0; if (this.msgT > 0) this.msgT -= dt;
    dimBackdrop(g, 0.8);
    brushTitle(g, 360, 84, 360, 76, '장터', '#b8742a', 46);
    panel(g, 510, 142, 194, 44, 'tag'); icon.coin(g, 536, 164, 13); text(g, `엽전 ${r.gold}`, 618, 165, { size: 22, maxW: 140 });
    icon.sack(g, 34, 162, 0.95); text(g, `군량 ${used()} / ${cap()}`, 54, 165, { size: 20, align: 'left', fill: SUB });
    items.forEach((it, n) => {
      const d = describeReward(it), card = it.kind === 'card', col = card ? KIND[CARDS[it.id].kind].col : COL[d.col], w = 326, h = 208, x = 24 + (n % 2) * 346, y = 204 + Math.floor(n / 2) * 216, afford = r.gold >= it.price;
      g.save(); if (it.sold) g.globalAlpha = 0.5;
      rr(g, x + 3, y + 5, w, h, 6, 'rgba(50,36,20,0.22)'); rr(g, x, y, w, h, 6, PAPER, INK, 2.6);
      g.save(); g.beginPath(); rrPath(g, x + 2, y + 2, w - 4, 34, 5); g.clip(); g.fillStyle = col; g.fillRect(x, y, w, 36); g.restore(); text(g, d.title, x + w / 2, y + 20, { size: 21, font: FONT_B, fill: C.cream });
      if (card) cardFace(g, it, x + 12, y + 44, 84, 104);
      else {
        rr(g, x + 12, y + 44, 84, 104, 5, '#efe4c9', INK, 1.4); g.save(); g.beginPath(); g.rect(x + 13, y + 45, 82, 102); g.clip();
        if (it.kind === 'recruit' || it.kind === 'train' || it.kind === 'reinforce') portrait(g, it.type, x + 54, y + 138, 1.15, t + n, !it.sold); else if (it.kind === 'relic') stamp(g, x + 54, y + 96, 32, '보', '#b8742a', -0.1); else if (it.kind === 'cleanse') stamp(g, x + 54, y + 96, 32, '정', TEAL, -0.1); else if (it.kind === 'weapon') weaponIcon(g, it.id, x + 54, y + 98, 0.92); else if (it.kind === 'burn') stamp(g, x + 54, y + 96, 32, '화', '#7a1f1c', -0.1); else icon.sack(g, x + 54, y + 100, 2.4);
        g.restore();
      }
      text(g, d.name, x + 108, y + 60, { size: 20, font: FONT_B, align: 'left', maxW: w - 120 });
      textBlock(g, d.desc.split('\n').join(' · '), x + 108, y + 86, w - 120, 20, { size: 14.5, align: 'left', fill: SUB, weight: 400 });
      g.restore();
      if (it.sold) stamp(g, x + w - 60, y + h - 34, 26, '득', RED, -0.14);
      else if (button(g, 'buy' + n, x + 12, y + h - 54, w - 24, 44, `엽전 ${it.price}`, { style: afford ? 'indigo' : 'grey', size: 23 })) { if (this.left) return; if (it.kind === 'burn') this.burn(n); else if (buyItem(n)) { sfx('coin'); if (it.kind === 'weapon') { this.msg = '[군대 · 무기] 에서 새 무기를 끼울 수 있습니다'; this.msgT = 3; } } else sfx('deny'); }
    });
    if (button(g, 'army', 24, 1108, 160, 80, '군대 · 무기', { style: 'paper', size: 24 })) this.over = new ArmyView({ onClose: () => { this.over = null; } });
    if (button(g, 'deck', 536, 1108, 160, 80, `패 ${r.deck.length}장`, { style: 'paper', size: 24 })) this.over = new DeckView({ onClose: () => { this.over = null; } });
    if (!this.left && button(g, 'leave', 200, 1104, 320, 88, '장터를 떠난다', { size: 34 })) { this.left = true; finishNode(); nav.go('map'); }
    if (this.msgT > 0) { g.globalAlpha = Math.min(1, this.msgT * 3); rr(g, 60, 1216, 600, 46, 23, PAPER, INK, 2.2); text(g, this.msg, 360, 1240, { size: 19, maxW: 570 }); g.globalAlpha = 1; }
    if (this.over) this.over.frame(g, dt);
  }
}
