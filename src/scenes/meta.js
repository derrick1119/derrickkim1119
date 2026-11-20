// 공적 장부: 원정에서 쌓은 공적으로 영웅·병력·출발 혜택을 연다 (가로)
import { W, H } from '../config.js';
import { INK, PAPER, RED, INDIGO, TEAL, OCHRE, SUB, FONT_B, text, rr } from '../render/draw.js';
import { button, panel, brushTitle, stamp, C } from '../ui/ui.js';
import { nav } from '../nav.js';
import { meta, save, UNLOCKS, has, buyUnlock, HARD_DESC } from '../state.js';
import { dimBackdrop } from './title.js';
import { portrait } from '../render/sprites.js';
import { sfx } from '../audio.js';

export class MetaScene {
  constructor() { this.t = 0; }
  frame(g, dt) {
    this.t += dt; dimBackdrop(g, 0.82);
    brushTitle(g, 250, 48, 360, 66, '공적 장부', INDIGO, 38);
    text(g, `쌓인 공적 ${meta.merit}`, 520, 44, { size: 30, font: FONT_B, align: 'left' });
    text(g, '원정이 끝날 때마다 전공 등급과 물리친 두목만큼 공적이 쌓입니다', 520, 78, { size: 16, fill: SUB, weight: 400, align: 'left', maxW: 700 });
    UNLOCKS.forEach((u, n) => {
      const x = 30 + (n % 2) * 620, y = 108 + Math.floor(n / 2) * 90, w = 600, h = 82, open = has(u.id), afford = meta.merit >= u.cost;
      rr(g, x, y + 4, w, h, 6, 'rgba(50,36,20,0.2)'); rr(g, x, y, w, h, 6, open ? '#e6efdc' : PAPER, INK, 2.4);
      if (u.unit) { rr(g, x + 9, y + 8, 78, 66, 5, '#efe4c9', INK, 1.2); g.save(); g.beginPath(); g.rect(x + 10, y + 9, 76, 64); g.clip(); portrait(g, u.unit, x + 47, y + 72, 0.8, this.t); g.restore(); } else stamp(g, x + 48, y + 41, 25, '혜', '#b8742a', -0.1);
      text(g, u.name, x + 102, y + 30, { size: 23, font: FONT_B, align: 'left' }); text(g, u.desc, x + 104, y + 58, { size: 15.5, align: 'left', fill: SUB, weight: 400, maxW: 320 });
      if (open) stamp(g, x + w - 70, y + 41, 27, '열', TEAL, -0.12);
      else if (button(g, 'u' + n, x + w - 164, y + 15, 150, 50, `공적 ${u.cost}`, { style: afford ? 'indigo' : 'grey', size: 23 })) { if (buyUnlock(u.id)) sfx('star'); else sfx('deny'); }
    });
    const y = 572; panel(g, 30, y, 900, 110);
    if ((meta.hardMax || 0) > 0) {
      text(g, `험로 ${meta.hard || 0}단계`, 64, y + 40, { size: 28, font: FONT_B, align: 'left' }); text(g, (meta.hard ? HARD_DESC[meta.hard] + ' · 공적 +' + meta.hard * 25 + '%' : '보통 길'), 64, y + 76, { size: 17, align: 'left', fill: SUB, weight: 400, maxW: 500 });
      if (button(g, 'h-', 660, y + 26, 120, 58, '쉽게', { style: 'paper', size: 23 })) { meta.hard = Math.max(0, (meta.hard || 0) - 1); save(); }
      if (button(g, 'h+', 794, y + 26, 120, 58, '험하게', { style: 'paper', size: 23 })) { meta.hard = Math.min(meta.hardMax, (meta.hard || 0) + 1); save(); }
    } else { text(g, '험로', 64, y + 40, { size: 28, font: FONT_B, align: 'left', fill: SUB }); text(g, '세 고개를 모두 넘으면 더 험한 길이 열립니다', 64, y + 76, { size: 17, align: 'left', fill: SUB, weight: 400 }); }
    if (button(g, 'back', 960, y + 12, 290, 86, '돌아가기', { style: 'paper', size: 32 })) nav.go('title');
  }
}
