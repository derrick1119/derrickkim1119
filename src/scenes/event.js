// 사건·주막: 선택지를 고르고 결과를 본다
import { W, H } from '../config.js';
import { TAU, INK, PAPER, RED, INDIGO, TEAL, OCHRE, SUB, FONT_B, text, textBlock, ell, rr } from '../render/draw.js';
import { ui, button, panel, brushTitle, icon, C, tapped, isDown } from '../ui/ui.js';
import { DeckView } from '../ui/cards.js';
import { cardName, CARDS } from '../data/cards.js';
import { RELICS } from '../data/relics.js';
import { WEAPONS } from '../data/weapons.js';
import { cardIcon, relicIcon } from '../render/icons.js';
import { weaponIcon } from '../render/sprites.js';

// 결과 문장에 나온 보물·무기·패 이름을 찾아 아이콘을 곁들인다
function resultIcon(s) {
  const m = /(보물|부정|무기|패 강화:|패) \[([^\]]+?)\+?\]/.exec(s); if (!m) return null;
  const name = m[2], find = (tbl) => Object.keys(tbl).find(k => tbl[k].name === name);
  if (m[1] === '보물' || m[1] === '부정') { const id = find(RELICS); return id ? (g, x, y) => relicIcon(g, id, x, y, 0.8) : null; }
  if (m[1] === '무기') { const id = find(WEAPONS); return id ? (g, x, y) => weaponIcon(g, id, x, y, 0.62) : null; }
  const id = find(CARDS); return id ? (g, x, y) => cardIcon(g, id, x, y, 0.8) : null;
}
import { nav } from '../nav.js';
import { G, save, finishNode, upgradeCard } from '../state.js';
import { eventView } from '../data/events.js';
import { dimBackdrop } from './title.js';
import { portrait } from './battle.js';
import { UNITS } from '../data/units.js';
import { sfx } from '../audio.js';

export class EventScene {
  constructor() { this.t = 0; this.r = G.run; this.p = this.r.pending; this.v = eventView(this.p); this.result = this.p.result || null; this.rest = this.p.id === 'rest'; }
  frame(g, dt) {
    this.t += dt; const r = this.r, v = this.v, t = this.t; ui.top = this.over ? 1 : 0;
    dimBackdrop(g, 0.8);
    brushTitle(g, 360, 92, 420, 78, v.title, this.rest ? '#2f6f5c' : '#6a5a8a', 44);
    for (let k = 0; k < 3; k++) icon.flag(g, 30 + k * 28, 172, 1.05, k < r.crowns ? RED : '#c9c2b0');
    panel(g, 530, 152, 174, 40, 'tag'); icon.coin(g, 554, 172, 12); text(g, `엽전 ${r.gold}`, 628, 173, { size: 20, maxW: 130 });
    ell(g, 360, 320, 104, 104, '#efe2c4', INK, 3); g.save(); g.beginPath(); g.arc(360, 320, 102, 0, TAU); g.clip(); g.fillStyle = '#a9b78f'; g.globalAlpha = 0.5; g.fillRect(250, 370, 220, 60); g.globalAlpha = 1; portrait(g, v.art, 360, 404, UNITS[v.art].hero ? 1.9 : 2.2, t, true); g.restore();
    panel(g, 40, 446, 640, this.result ? Math.min(520, 150 + Math.ceil(this.result[0].length / 24) * 32 + (this.result.length - 1) * 62) : 176);
    if (!this.result) {
      textBlock(g, v.text, 360, 492, 580, 30, { size: 21, weight: 400 });
      v.choices.forEach((c, n) => {
        const y = 648 + n * 122, lack = c.cost && r.gold < c.cost;
        if (!lack && tapped('c' + n, 40, y, 640, 106)) { sfx('card'); if (c.deck) this.over = new DeckView({ mode: c.deck, onClose: () => { this.over = null; }, onPick: k => { const before = cardName(r.deck[k]), card = upgradeCard(k); this.over = null; if (!card) return; this.result = [c.story, `패 강화: [${before}] → [${cardName(card)}]`]; this.p.result = this.result; save(); } }); else { this.result = c.pick(); this.p.result = this.result; save(); } }
        const dn = !lack && isDown('c' + n, 40, y, 640, 106);
        g.save(); if (lack) g.globalAlpha = 0.5;
        rr(g, 40, y + 5, 640, 106, 12, '#d9cdb0', INK, 2.6); rr(g, 40, y + (dn ? 3 : 0), 640, 106, 12, PAPER, INK, 2.6);
        text(g, c.label, 66, y + 36 + (dn ? 3 : 0), { size: 30, font: FONT_B, align: 'left', maxW: 590 });
        text(g, lack ? `${c.desc}  (엽전 부족)` : c.desc, 68, y + 76 + (dn ? 3 : 0), { size: 18, align: 'left', fill: lack ? RED : SUB, weight: 400, maxW: 590 });
        g.restore();
      });
    } else {
      const n = textBlock(g, this.result[0], 360, 500, 580, 32, { size: 23, weight: 400 });
      this.result.slice(1).forEach((s, i) => { const bad = /-\d|부정 \[/.test(s) && !/씻겨/.test(s); const y = 500 + n * 32 + 40 + i * 62; const ic = resultIcon(s); rr(g, 70, y - 26, 580, 52, 8, bad ? '#efd9cf' : '#dfe8d4', INK, 1.6); if (ic) { ic(g, 102, y); text(g, s, 386, y + 1, { size: 20, fill: bad ? RED : TEAL, maxW: 500 }); } else text(g, s, 360, y + 1, { size: 20, fill: bad ? RED : TEAL, maxW: 550 }); });
      if (this.t > 0.2 && !this.left && button(g, 'go', 190, 990, 340, 84, '길을 떠난다', { size: 38 })) { this.left = true; finishNode(); nav.go('map'); }
    }
    if (this.over) this.over.frame(g, dt);
  }
}
