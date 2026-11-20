// 공적 장부: 원정에서 쌓은 공적으로 영웅·병종·출발 혜택을 연다
import { W, H } from '../config.js';
import { INK, PAPER, RED, INDIGO, TEAL, OCHRE, SUB, FONT_B, text, rr } from '../render/draw.js';
import { button, panel, brushTitle, stamp, C } from '../ui/ui.js';
import { nav } from '../nav.js';
import { meta, save, UNLOCKS, has, buyUnlock, HARD_DESC } from '../state.js';
import { dimBackdrop } from './title.js';
import { portrait } from './battle.js';
import { sfx } from '../audio.js';

export class MetaScene {
  constructor() { this.t = 0; }
  frame(g, dt) {
    this.t += dt; dimBackdrop(g, 0.82);
    brushTitle(g, 360, 84, 380, 76, '공적 장부', INDIGO, 42);
    text(g, `쌓인 공적 ${meta.merit}`, 360, 156, { size: 30, font: FONT_B });
    text(g, '원정이 끝날 때마다 전공 등급과 물리친 두목만큼 공적이 쌓입니다', 360, 194, { size: 17, fill: SUB, weight: 400, maxW: 660 });
    UNLOCKS.forEach((u, n) => {
      const y = 226 + n * 100, open = has(u.id), afford = meta.merit >= u.cost;
      rr(g, 30, y + 4, 660, 90, 6, 'rgba(50,36,20,0.2)'); rr(g, 30, y, 660, 90, 6, open ? '#e6efdc' : PAPER, INK, 2.4);
      if (u.unit) { rr(g, 40, y + 8, 74, 74, 5, '#efe4c9', INK, 1.2); g.save(); g.beginPath(); g.rect(41, y + 9, 72, 72); g.clip(); portrait(g, u.unit, 77, y + 80, 0.95, this.t); g.restore(); } else stamp(g, 77, y + 45, 28, '혜', '#b8742a', -0.1);
      text(g, u.name, 130, y + 32, { size: 25, font: FONT_B, align: 'left' }); text(g, u.desc, 132, y + 64, { size: 17, align: 'left', fill: SUB, weight: 400, maxW: 370 });
      if (open) stamp(g, 610, y + 45, 30, '열', TEAL, -0.12);
      else if (button(g, 'u' + n, 520, y + 18, 156, 54, `공적 ${u.cost}`, { style: afford ? 'indigo' : 'grey', size: 24 })) { if (buyUnlock(u.id)) sfx('star'); else sfx('deny'); }
    });
    const y = 1040; panel(g, 30, y, 660, 96);
    if ((meta.hardMax || 0) > 0) {
      text(g, `험로 ${meta.hard || 0}단계`, 60, y + 34, { size: 26, font: FONT_B, align: 'left' }); text(g, (meta.hard ? HARD_DESC[meta.hard] + ' · 공적 +' + meta.hard * 25 + '%' : '보통 길'), 60, y + 66, { size: 17, align: 'left', fill: SUB, weight: 400, maxW: 380 });
      if (button(g, 'h-', 470, y + 20, 90, 56, '쉽게', { style: 'paper', size: 22 })) { meta.hard = Math.max(0, (meta.hard || 0) - 1); save(); }
      if (button(g, 'h+', 580, y + 20, 90, 56, '험하게', { style: 'paper', size: 22 })) { meta.hard = Math.min(meta.hardMax, (meta.hard || 0) + 1); save(); }
    } else { text(g, '험로', 60, y + 34, { size: 26, font: FONT_B, align: 'left', fill: SUB }); text(g, '세 고개를 모두 지켜내면 더 험한 길이 열립니다', 60, y + 66, { size: 17, align: 'left', fill: SUB, weight: 400 }); }
    if (button(g, 'back', 230, 1166, 260, 76, '돌아가기', { style: 'paper', size: 30 })) nav.go('title');
  }
}
