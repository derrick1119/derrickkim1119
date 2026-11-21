// 공적 장부: 원정에서 쌓은 공적으로 영웅·병력·출발 혜택을 연다 (가로)
import { W, H } from '../config.js';
import { INK, PAPER, RED, INDIGO, TEAL, OCHRE, SUB, FONT_B, text, textBlock, rr } from '../render/draw.js';
import { button, panel, brushTitle, stamp, bar, tapped, C } from '../ui/ui.js';
import { UNITS } from '../data/units.js';
import { TALES } from '../data/story.js';
import { CHAPTERS } from '../data/stages.js';
import { nav } from '../nav.js';
import { meta, save, UNLOCKS, has, buyUnlock, HARD_DESC, BEASTS, deedCount, noteDeed } from '../state.js';
import { dimBackdrop } from './title.js';
import { portrait } from '../render/sprites.js';
import { sfx } from '../audio.js';

export class MetaScene {
  constructor() { this.t = 0; this.book = false; this.beasts = false; this.sel = 0; noteDeed(); }
  // 영물의 인연: 원정에서 쌓은 공으로 영물이 합류한다. 아직 못 만난 영물도 무엇을 하면 되는지 보인다
  drawBeasts(g) {
    brushTitle(g, 250, 48, 360, 66, '영물의 인연', TEAL, 38);
    text(g, `인연을 맺은 영물 ${BEASTS.filter(b => has(b.id)).length} / ${BEASTS.length}`, 520, 44, { size: 30, font: FONT_B, align: 'left' });
    text(g, '원정을 거듭하며 공을 쌓으면 영물이 군대에 합류합니다. 한 번 맺은 인연은 다음 원정에도 이어집니다', 520, 78, { size: 16, fill: SUB, weight: 400, align: 'left', maxW: 720 });
    BEASTS.forEach((b, n) => {
      const x = 30, y = 108 + n * 93, w = 1220, h = 85, open = has(b.id), u = UNITS[b.id], cnt = Math.min(b.need, deedCount(b));
      rr(g, x, y + 4, w, h, 6, 'rgba(50,36,20,0.2)'); rr(g, x, y, w, h, 6, open ? '#e6efdc' : PAPER, INK, 2.4);
      rr(g, x + 9, y + 8, 96, 69, 5, '#efe4c9', INK, 1.2); g.save(); g.beginPath(); g.rect(x + 10, y + 9, 94, 67); g.clip(); if (!open) g.globalAlpha = 0.4; portrait(g, b.id, x + 57, y + 72, 0.82, open ? this.t : 0); g.restore();
      text(g, u.name, x + 122, y + 29, { size: 26, font: FONT_B, align: 'left' }); text(g, `${u.role} · ${u.desc}`, x + 124, y + 60, { size: 15.5, align: 'left', fill: SUB, weight: 400, maxW: 330 });
      text(g, b.how, x + 480, y + 28, { size: 19, font: FONT_B, align: 'left', fill: open ? TEAL : INK, maxW: 470 }); text(g, b.lore, x + 482, y + 58, { size: 15, align: 'left', fill: SUB, weight: 400, maxW: 470 });
      if (open) stamp(g, x + w - 76, y + 42, 28, '緣', TEAL, -0.12);
      else { bar(g, x + w - 250, y + 34, 150, 16, cnt / b.need, TEAL); text(g, `${cnt} / ${b.need}`, x + w - 54, y + 43, { size: 21, font: FONT_B }); }
    });
    if (button(g, 'beastback', 960, 584, 290, 86, '장부로', { style: 'paper', size: 32 })) this.beasts = false;
  }
  // 이야기책: 주막에서 들은 옛이야기를 다시 읽는다
  drawBook(g) {
    const got = meta.tales || [];
    brushTitle(g, 250, 48, 360, 66, '이야기책', '#2f6f5c', 38);
    text(g, `들은 이야기 ${got.length} / ${TALES.length}`, 520, 44, { size: 30, font: FONT_B, align: 'left' });
    text(g, '원정 중 주막에 들를 때마다 주모가 한 토막씩 들려줍니다', 520, 78, { size: 16, fill: SUB, weight: 400, align: 'left' });
    panel(g, 30, 108, 420, 574); panel(g, 470, 108, 780, 464);
    TALES.forEach((t, n) => {
      const y = 126 + n * 35 + Math.floor(n / 5) * 9, has = got.includes(t.id), on = this.sel === n;
      if (tapped('tale' + n, 46, y, 388, 32)) this.sel = n;
      rr(g, 46, y, 388, 32, 5, on ? '#f6e3a8' : has ? '#fbf3df' : '#ebe2cc', on ? '#c9962e' : 'rgba(38,42,54,0.35)', on ? 2 : 1);
      text(g, has ? t.title : '· · ·', 66, y + 17, { size: 18, font: FONT_B, align: 'left', fill: has ? INK : '#a9a394' }); text(g, CHAPTERS[t.ch].short, 420, y + 17, { size: 12.5, align: 'right', fill: SUB, weight: 400 });
    });
    const t = TALES[this.sel], has = got.includes(t.id);
    if (has) {
      text(g, t.title, 860, 190, { size: 40, font: FONT_B }); g.fillStyle = 'rgba(201,150,46,0.8)'; g.fillRect(700, 226, 320, 1.6);
      textBlock(g, t.s, 860, 290, 700, 44, { size: 23 });
      text(g, `— ${CHAPTERS[t.ch].name} 의 주막에서`, 1210, 530, { size: 15, align: 'right', fill: SUB, weight: 400 });
    } else { stamp(g, 860, 300, 46, '?', '#a9a394', -0.1); text(g, '아직 듣지 못한 이야기입니다', 860, 384, { size: 24, font: FONT_B, fill: SUB }); text(g, `${CHAPTERS[t.ch].name} 의 주막에 들러 보세요`, 860, 420, { size: 17, fill: SUB, weight: 400 }); }
    if (button(g, 'bookback', 960, 584, 290, 86, '장부로', { style: 'paper', size: 32 })) this.book = false;
  }
  frame(g, dt) {
    this.t += dt; dimBackdrop(g, 0.82);
    if (this.book) { this.drawBook(g); return; }
    if (this.beasts) { this.drawBeasts(g); return; }
    if (button(g, 'book', 1046, 22, 204, 62, `이야기책 ${(meta.tales || []).length}/${TALES.length}`, { style: 'teal', size: 21 })) { this.book = true; return; }
    if (button(g, 'beasts', 830, 22, 204, 62, `영물 ${BEASTS.filter(b => has(b.id)).length}/${BEASTS.length}`, { style: 'teal', size: 21 })) { this.beasts = true; return; }
    brushTitle(g, 250, 48, 360, 66, '공적 장부', INDIGO, 38);
    text(g, `쌓인 공적 ${meta.merit}`, 520, 44, { size: 30, font: FONT_B, align: 'left' });
    text(g, '원정이 끝날 때마다 공적이 쌓입니다', 520, 78, { size: 16, fill: SUB, weight: 400, align: 'left', maxW: 290 });
    UNLOCKS.forEach((u, n) => {
      const x = 30 + (n % 2) * 620, y = 108 + Math.floor(n / 2) * 90, w = 600, h = 82, open = has(u.id), afford = meta.merit >= u.cost;
      rr(g, x, y + 4, w, h, 6, 'rgba(50,36,20,0.2)'); rr(g, x, y, w, h, 6, open ? '#e6efdc' : PAPER, INK, 2.4);
      if (u.unit) { rr(g, x + 9, y + 8, 78, 66, 5, '#efe4c9', INK, 1.2); g.save(); g.beginPath(); g.rect(x + 10, y + 9, 76, 64); g.clip(); portrait(g, u.unit, x + 47, y + 72, 0.8, this.t); g.restore(); } else stamp(g, x + 48, y + 41, 25, '惠', '#b8742a', -0.1);
      text(g, u.name, x + 102, y + 30, { size: 23, font: FONT_B, align: 'left' }); text(g, u.desc, x + 104, y + 58, { size: 15.5, align: 'left', fill: SUB, weight: 400, maxW: 320 });
      if (open) stamp(g, x + w - 70, y + 41, 27, '開', TEAL, -0.12);
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
