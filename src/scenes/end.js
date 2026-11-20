// 원정 끝 (평정 / 실패)
import { W, H } from '../config.js';
import { INK, RED, INDIGO, SUB, FONT_B, text, rr } from '../render/draw.js';
import { button, panel, brushTitle, C } from '../ui/ui.js';
import { nav } from '../nav.js';
import { G, meta, save, settleRun } from '../state.js';
import { CHAPTERS } from '../data/stages.js';
import { UNITS } from '../data/units.js';
import { RELICS } from '../data/relics.js';
import { backdrop } from './title.js';
import { portrait } from './battle.js';
import { relicIcon } from '../render/icons.js';

export class EndScene {
  constructor(a) { this.win = !!(a && a.win); this.t = 0; this.r = G.run; this.gain = settleRun(this.win); this.conf = Array.from({ length: 60 }, () => ({ x: Math.random() * W, y: -Math.random() * H, v: 90 + Math.random() * 140, c: [RED, INDIGO, '#d9a441', '#3f6b5c', '#fbf7ec'][(Math.random() * 5) | 0], p: Math.random() * 6 })); }
  frame(g, dt) {
    this.t += dt; const t = this.t, r = this.r, win = this.win;
    g.drawImage(backdrop(), 0, 0, W, H);
    if (!win) { g.fillStyle = 'rgba(31,42,68,0.42)'; g.fillRect(0, 0, W, H); }
    if (win) for (const c of this.conf) { c.y += c.v * dt; if (c.y > H) { c.y = -20; c.x = Math.random() * W; } g.save(); g.translate(c.x + Math.sin(t * 2 + c.p) * 20, c.y); g.rotate(t * 3 + c.p); rr(g, -7, -4, 14, 8, 1, c.c, INK, 1); g.restore(); }
    brushTitle(g, 360, 150, 500, 96, win ? '고개를 지켜냈다!' : '원정 실패', win ? INDIGO : '#5a5346', 52);
    text(g, win ? '어둑시니가 물러가고 고갯길에 아침이 밝았습니다' : `${CHAPTERS[Math.min(2, r ? r.ch : 0)].name} 에서 쓰러졌습니다`, 360, 244, { size: 24, stroke: '#ecdfc2', lw: 6, maxW: 660 });
    rr(g, 230, 276, 260, 50, 25, '#1f2a44', INK, 2.4); text(g, `공적 +${this.gain}  (모두 ${meta.merit})`, 360, 302, { size: 21, fill: '#f0d99a', maxW: 236 });
    if (r) { portrait(g, r.hero, 360, 640 - (win ? Math.abs(Math.sin(t * 4)) * 12 : 0), 3.4, t); if (win) { portrait(g, 'sword', 200, 660, 2.2, t, true); portrait(g, 'priest', 524, 660, 2.2, t, true); } }
    panel(g, 60, 760, 600, 300);
    if (r) {
      [['쌓은 전공', `${r.merit || 0}`], ['물리친 요괴', `${r.kills}`], ['잃은 병사', `${r.lost}`], ['지닌 보물', `${r.relics.length}개`]].forEach(([a, b], n) => { const x = 100 + (n % 2) * 280, y = 810 + Math.floor(n / 2) * 50; text(g, a, x, y, { size: 22, align: 'left', fill: SUB }); text(g, b, x + 230, y, { size: 30, font: FONT_B, align: 'right' }); });
      const sq = r.squads.slice(0, 10), per = 560 / sq.length;
      sq.forEach((s, n) => portrait(g, s.type, 86 + per * n + per / 2, 1004, UNITS[s.type].hero ? 0.95 : 1.1, t));
      const rp = Math.min(40, 540 / Math.max(1, r.relics.length)); r.relics.forEach((id, n) => relicIcon(g, id, 360 + (n - (r.relics.length - 1) / 2) * rp, 1034, Math.min(0.64, rp / 40)));
    }
    if (t > 0.8 && button(g, 'home', 60, 1100, 290, 96, '처음으로', { style: 'paper', size: 34 })) { G.run = null; save(); nav.go('title'); }
    if (t > 0.8 && button(g, 'meta', 370, 1100, 290, 96, '공적 장부', { size: 34 })) { G.run = null; save(); nav.go('meta'); }
  }
}
