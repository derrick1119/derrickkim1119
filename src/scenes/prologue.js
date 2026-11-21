// 출정 프롤로그: 한지 두루마리 몇 장 (눌러서 넘기고, 건너뛸 수 있다). 첫 장은 영웅의 한마디
import { W, H } from '../config.js';
import { INK, INDIGO, SUB, FONT_B, text, textBlock, ell, rr, clamp, easeOutBack } from '../render/draw.js';
import { button, panel, brushTitle, seal, tapped, C } from '../ui/ui.js';
import { nav } from '../nav.js';
import { newRun } from '../state.js';
import { UNITS, HERO_COL, HERO_SEAL } from '../data/units.js';
import { PROLOGUE, PROLOGUE_HERO } from '../data/story.js';
import { dimBackdrop } from './title.js';
import { portrait, getLook } from '../render/sprites.js';
import { sfx } from '../audio.js';

export class PrologueScene {
  constructor(a) { this.hero = (a && a.hero) || 'commander'; this.t = 0; this.pt = 0; this.i = 0; this.pages = [{ art: [this.hero], s: PROLOGUE_HERO[this.hero], who: this.hero }, ...PROLOGUE]; }
  go() { if (this.left) return; this.left = true; newRun(this.hero); nav.go('run'); }
  next() { if (this.i < this.pages.length - 1) { this.i++; this.pt = 0; sfx('card'); } else this.go(); }
  frame(g, dt) {
    this.t += dt; this.pt += dt; const t = this.t, p = this.pages[this.i], k = clamp(this.pt / 0.35, 0, 1);
    dimBackdrop(g, 0.5);
    brushTitle(g, 640, 52, 300, 58, '도깨비 고개', INDIGO, 34);
    if (!this.left && button(g, 'skip', 1080, 624, 160, 56, '건너뛰기', { style: 'paper', size: 22 })) { this.go(); return; }
    // 두루마리: 양 끝의 축과 한지
    const x = 170, y = 150, w = 940, h = 420;
    g.save(); g.globalAlpha = 0.6 + 0.4 * k; g.translate(0, (1 - easeOutBack(k)) * 14);
    panel(g, x, y, w, h);
    for (const ex of [x - 10, x + w - 8]) { rr(g, ex, y - 14, 18, h + 28, 5, '#7a4a2c', INK, 2); rr(g, ex + 3, y - 10, 4, h + 20, 2, 'rgba(255,240,210,0.3)'); for (const ey of [y - 20, y + h + 8]) rr(g, ex - 3, ey, 24, 12, 4, '#d6a640', INK, 1.6); }
    // 그림
    const n = p.art.length, gy = y + 228;
    g.save(); g.globalAlpha *= 0.5; ell(g, 640, gy - 2, 150 + n * 110, 20, 'rgba(140,160,120,0.9)'); g.restore();
    p.art.forEach((a, m) => { const L = getLook(a), big = p.who === a, s = (big ? 1.95 : 1.7) * 1.1 / L.scale * (L.hero ? 1.3 : a === 'banner' ? 1.05 : a === 'treant' ? 1.15 : 1); portrait(g, a, 640 + (m - (n - 1) / 2) * 190 - (big ? 10 : 0), gy, s, t, big); });
    if (p.who) { g.save(); g.translate(640 + 150, y + 60); g.rotate(0.06); seal(g, 0, 0, 44, HERO_SEAL[p.who], HERO_COL[p.who]); g.restore(); text(g, UNITS[p.who].name, 640 + 150, y + 104, { size: 20, font: FONT_B }); }
    g.fillStyle = 'rgba(38,42,54,0.35)'; g.fillRect(x + 60, y + 262, w - 120, 1.2);
    const rows = p.s.split('\n').length; g.globalAlpha *= k; textBlock(g, p.s, 640, y + 340 - (rows - 1) * 20, w - 120, 40, { size: 26, font: FONT_B });
    g.restore();
    for (let m = 0; m < this.pages.length; m++) ell(g, 640 + (m - (this.pages.length - 1) / 2) * 18, y + h + 34, 4.6, 4.6, m === this.i ? INK : 'rgba(38,42,54,0.25)');
    if (this.pt > 0.6) { g.globalAlpha = 0.82 + Math.sin(t * 5) * 0.18; rr(g, 510, 634, 260, 32, 16, 'rgba(248,240,220,0.9)', 'rgba(38,42,54,0.4)', 1.2); text(g, '화면을 누르면 넘어갑니다', 640, 651, { size: 17, fill: INK }); g.globalAlpha = 1; }
    if (!this.left && this.pt > 0.25 && tapped('pro', 0, 0, W, H)) this.next();
  }
  key(k) { if (k === ' ' || k === 'Enter') this.next(); else if (k === 'Escape') this.go(); }
}
