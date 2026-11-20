// 원정 끝 (평정 / 실패) — 가로
import { W, H } from '../config.js';
import { INK, RED, INDIGO, SUB, FONT_B, text, rr } from '../render/draw.js';
import { button, panel, brushTitle, C } from '../ui/ui.js';
import { nav } from '../nav.js';
import { G, meta, save, settleRun } from '../state.js';
import { CHAPTERS } from '../data/stages.js';
import { CARDS, isUnit } from '../data/cards.js';
import { backdrop } from './title.js';
import { portrait } from '../render/sprites.js';
import { relicIcon } from '../render/icons.js';
import { cardFace } from '../ui/cards.js';

export class EndScene {
  constructor(a) { this.win = !!(a && a.win); this.t = 0; this.r = G.run; this.gain = settleRun(this.win); this.conf = Array.from({ length: 70 }, () => ({ x: Math.random() * W, y: -Math.random() * H, v: 90 + Math.random() * 140, c: [RED, INDIGO, '#d9a441', '#3f6b5c', '#fbf7ec'][(Math.random() * 5) | 0], p: Math.random() * 6 })); }
  frame(g, dt) {
    this.t += dt; const t = this.t, r = this.r, win = this.win;
    g.drawImage(backdrop(), 0, 0, W, H);
    if (!win) { g.fillStyle = 'rgba(31,42,68,0.42)'; g.fillRect(0, 0, W, H); }
    if (win) for (const c of this.conf) { c.y += c.v * dt; if (c.y > H) { c.y = -20; c.x = Math.random() * W; } g.save(); g.translate(c.x + Math.sin(t * 2 + c.p) * 20, c.y); g.rotate(t * 3 + c.p); rr(g, -7, -4, 14, 8, 1, c.c, INK, 1); g.restore(); }
    brushTitle(g, 640, 70, 520, 84, win ? '고개를 지켜냈다!' : '원정 실패', win ? INDIGO : '#5a5346', 48);
    text(g, win ? '어둑시니가 물러가고 고갯길에 아침이 밝았습니다' : `${CHAPTERS[Math.min(2, r ? r.ch : 0)].name} 에서 군기가 꺾였습니다`, 640, 144, { size: 22, stroke: '#ecdfc2', lw: 6, maxW: 900 });
    if (r) { portrait(g, r.hero, 250, 560 - (win ? Math.abs(Math.sin(t * 4)) * 12 : 0), 3.6, t); if (win) { portrait(g, 'sword', 110, 600, 2.0, t, true); portrait(g, 'priest', 410, 600, 2.0, t, true); } }
    panel(g, 520, 180, 720, 380);
    rr(g, 540, 198, 250, 46, 23, '#1f2a44', INK, 2.4); text(g, `공적 +${this.gain}  (모두 ${meta.merit})`, 665, 222, { size: 19, fill: '#f0d99a', maxW: 226 });
    if (r) {
      [['쌓은 전공', `${r.merit || 0}`], ['이긴 싸움', `${r.wins}`], ['물리친 요괴', `${r.kills}`], ['잃은 병사', `${r.lost}`]].forEach(([a, b], n) => { const x = 820 + (n % 2) * 200, y = 208 + Math.floor(n / 2) * 34; text(g, a, x, y, { size: 18, align: 'left', fill: SUB }); text(g, b, x + 180, y, { size: 24, font: FONT_B, align: 'right' }); });
      text(g, `덱 ${r.deck.length}장`, 544, 290, { size: 20, font: FONT_B, align: 'left' });
      const cw = Math.min(58, 680 / r.deck.length - 4); r.deck.slice().sort((a, b) => (isUnit(b) ? 1 : 0) - (isUnit(a) ? 1 : 0)).forEach((c, n) => cardFace(g, c, 544 + n * (cw + 4), 308, cw, cw * 1.32));
      text(g, r.relics.length ? `지닌 보물 ${r.relics.length}` : '지닌 보물 없음', 544, 420, { size: 20, font: FONT_B, align: 'left' });
      const rp = Math.min(46, 660 / Math.max(1, r.relics.length)); r.relics.forEach((id, n) => relicIcon(g, id, 568 + n * rp, 472, Math.min(0.8, rp / 44)));
    }
    if (t > 0.8 && button(g, 'home', 560, 586, 310, 90, '처음으로', { style: 'paper', size: 34 })) { G.run = null; save(); nav.go('title'); }
    if (t > 0.8 && button(g, 'meta', 890, 586, 310, 90, '공적 장부', { size: 34 })) { G.run = null; save(); nav.go('meta'); }
  }
}
