// 원정 끝 (평정 / 실패) — 가로
import { bgm } from '../audio.js';
import { W, H } from '../config.js';
import { INK, RED, INDIGO, TEAL, SUB, FONT_B, text, textBlock, rr } from '../render/draw.js';
import { button, panel, brushTitle, C } from '../ui/ui.js';
import { nav } from '../nav.js';
import { G, meta, save, settleRun, BEASTS, has, deedCount, noteDeed, HARD } from '../state.js';
import { UNITS } from '../data/units.js';
import { chapterOf } from '../data/stages.js';
import { CARDS, isUnit } from '../data/cards.js';
import { ENDING, EPILOGUE, DEFEAT, endingPlay, defeatPlay } from '../data/story.js';
import { Play } from '../ui/theater.js';
import { drawVista } from '../render/keyart.js';
import { portrait } from '../render/sprites.js';
import { relicIcon } from '../render/icons.js';
import { cardFace } from '../ui/cards.js';
import { inkMark } from '../render/symbols.js';

export class EndScene {
  constructor(a) { this.win = !!(a && a.win); this.t = 0; this.r = G.run; this.gain = settleRun(this.win); this.fresh = noteDeed();
    // 끝 이야기: 이긴 밤에는 그 영웅만의 끝, 진 밤에는 장승 앞에서 깨어나는 장면을 인형극으로 먼저 보여 준다
    const hero = this.r ? this.r.hero : 'commander'; this.play = new Play({ beats: this.win ? endingPlay(hero) : defeatPlay(hero), title: this.win ? `${UNITS[hero].name} 이야기 · 끝` : '홀린 밤', onDone: () => { this.play = null; this.t = 0; } }); this.conf = Array.from({ length: 70 }, () => ({ x: Math.random() * W, y: -Math.random() * H, v: 90 + Math.random() * 140, c: [RED, INDIGO, '#d9a441', '#3f6b5c', '#fbf7ec'][(Math.random() * 5) | 0], p: Math.random() * 6 })); }
  frame(g, dt) {
    bgm('story');
    if (this.play) { this.play.frame(g, dt); return; }
    this.t += dt; const t = this.t, r = this.r, win = this.win;
    drawVista(g, t, win ? 0.28 : 0.5);   // 첫 화면과 같은 달밤 고갯마루 (진 밤은 더 어둡게)
    if (win) { g.save(); g.globalCompositeOperation = 'lighter'; const sp = g.createRadialGradient(250, 520, 20, 250, 520, 420); sp.addColorStop(0, 'rgba(255,210,140,0.3)'); sp.addColorStop(1, 'rgba(255,210,140,0)'); g.fillStyle = sp; g.fillRect(0, 100, 700, 620); g.restore(); }
    if (win) for (const c of this.conf) { c.y += c.v * dt; if (c.y > H) { c.y = -20; c.x = Math.random() * W; } if (c.y > 92 && c.y < 190 && c.x > 300 && c.x < 980) continue;   // 이야기 글 위로는 지나가지 않는다
      g.save(); g.translate(c.x + Math.sin(t * 2 + c.p) * 20, c.y); g.rotate(t * 3 + c.p); rr(g, -7, -4, 14, 8, 1, c.c, INK, 1); g.restore(); }
    brushTitle(g, 640, 54, 520, 76, win ? '고개를 넘었다' : '도깨비에 홀린 밤', win ? INDIGO : '#5a5346', 44);
    // 원정의 끝을 알리는 그림: 이기면 높이 세운 깃발, 지면 부러진 깃발
    inkMark(g, win ? 'win' : 'lose', 310, 64, 86, { k: (t - 0.25) / 0.5, col: win ? '#f6efdc' : '#f3b9a6', v: win ? 0 : 2 });
    // 이긴 밤에는 영웅의 후일담, 진 밤에는 장승 앞에서 깨어난다
    const tale = win ? ENDING + '\n' + (r && EPILOGUE[r.hero] || '') : (r ? `${chapterOf(r.ch).name}에서 길을 잃었습니다.\n` : '') + DEFEAT;
    textBlock(g, tale, 640, 112, 1100, 25, { size: 18.5, stroke: 'rgba(8,8,20,0.75)', lw: 5, fill: '#f3e6c4' });
    if (r) { portrait(g, r.hero, 250, 590 - (win ? Math.abs(Math.sin(t * 4)) * 10 : 0), 3.2, t); if (win) { portrait(g, 'sword', 110, 620, 1.9, t, true); portrait(g, 'priest', 410, 620, 1.9, t, true); } else portrait(g, 'treant', 420, 620, 1.5, 0); }
    panel(g, 520, 198, 720, 364);
    panel(g, 540, 214, 250, 46, 'navy'); text(g, `공적 +${this.gain}  (모두 ${meta.merit})`, 665, 238, { size: 19, fill: '#f0d99a', maxW: 226 });
    if (r) {
      [['쌓은 전공', `${r.merit || 0}`], ['이긴 싸움', `${r.wins}`], ['물리친 요괴', `${r.kills}`], ['잃은 병사', `${r.lost}`]].forEach(([a, b], n) => { const x = 820 + (n % 2) * 200, y = 224 + Math.floor(n / 2) * 32; text(g, a, x, y, { size: 18, align: 'left', fill: SUB }); text(g, b, x + 180, y, { size: 24, font: FONT_B, align: 'right' }); });
      text(g, `덱 ${r.deck.length}장`, 544, 296, { size: 20, font: FONT_B, align: 'left' });
      const cw = Math.min(58, 680 / r.deck.length - 4); r.deck.slice().sort((a, b) => (isUnit(b) ? 1 : 0) - (isUnit(a) ? 1 : 0)).forEach((c, n) => cardFace(g, c, 544 + n * (cw + 4), 312, cw, cw * 1.32));
      text(g, r.relics.length ? `지닌 보물 ${r.relics.length}` : '지닌 보물 없음', 544, 424, { size: 20, font: FONT_B, align: 'left' });
      const rp = Math.min(46, 660 / Math.max(1, r.relics.length)); r.relics.forEach((id, n) => relicIcon(g, id, 568 + n * rp, 476, Math.min(0.8, rp / 44)));
      // 평정해서 새 험로가 열렸으면 알린다: 다음 원정은 한 단계 더 험한 길로 갈 수 있다
      if (r.newHard) { const k = Math.min(1, Math.max(0, (t - 0.9) / 0.35)), hd = HARD[r.newHard]; g.save(); g.globalAlpha = k; rr(g, 800, 400, 422, 46, 8, '#2f6f5c', INK, 2); rr(g, 804, 404, 414, 38, 5, null, 'rgba(240,217,154,0.8)', 1.2); text(g, `새 험로가 열렸다 · ${r.newHard}단계 ${hd.name}`, 1011, 424, { size: 20, font: FONT_B, fill: '#f6efdc', maxW: 396 }); g.restore(); }
    }
    // 다음에 맺을 영물의 인연 하나: 가장 가까운 것을 짚어 준다
    const nb = BEASTS.filter(b => !has(b.id)).sort((a, b) => deedCount(b) / b.need - deedCount(a) / a.need)[0];
    if (this.fresh.length) { text(g, `새로 맺은 인연 · ${this.fresh.map(b => UNITS[b.id].name).join(' · ')}`, 544, 532, { size: 18, font: FONT_B, align: 'left', fill: TEAL }); text(g, '다음 원정부터 전리품과 장터에 나옵니다', 880, 533, { size: 16, align: 'left', fill: SUB, weight: 400, maxW: 340 }); }
    else if (nb) { text(g, `다음 인연 · ${UNITS[nb.id].name}`, 544, 532, { size: 18, font: FONT_B, align: 'left', fill: TEAL }); text(g, `${nb.how}  (${Math.min(nb.need, deedCount(nb))} / ${nb.need})`, 716, 533, { size: 16, align: 'left', fill: SUB, weight: 400, maxW: 500 }); }
    if (t > 0.8 && button(g, 'home', 560, 586, 310, 90, '처음으로', { style: 'paper', size: 34 })) { G.run = null; save(); nav.go('title'); }
    if (t > 0.8 && button(g, 'meta', 890, 586, 310, 90, '공적 장부', { size: 34 })) { G.run = null; save(); nav.go('meta'); }
  }
}
