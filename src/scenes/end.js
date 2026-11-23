// 원정 끝 (평정 / 실패) — 가로
import { bgm } from '../audio.js';
import { W, H } from '../config.js';
import { INK, RED, INDIGO, TEAL, SUB, FONT_B, text, textBlock, rr, ell } from '../render/draw.js';
import { button, panel, brushTitle, C, foil } from '../ui/ui.js';
import { nav } from '../nav.js';
import { G, meta, save, settleRun, BEASTS, has, deedCount, noteDeed, HARD, goEndless, seedCode } from '../state.js';
import { UNITS } from '../data/units.js';
import { chapterOf } from '../data/stages.js';
import { CARDS, isUnit } from '../data/cards.js';
import { ENDING, EPILOGUE, DEFEAT, endingPlay, defeatPlay, trueEndPlay } from '../data/story.js';
import { MASTERY_XP, MASTERY_GIFT } from '../data/progress.js';
import { goldText } from '../ui/ui.js';
import { Play } from '../ui/theater.js';
import { drawVista } from '../render/keyart.js';
import { portrait } from '../render/sprites.js';
import { relicIcon } from '../render/icons.js';
import { cardFace } from '../ui/cards.js';
import { inkMark } from '../render/symbols.js';
import { saveScroll } from '../ui/scroll.js';

export class EndScene {
  constructor(a) { this.win = !!(a && a.win); this.t = 0; this.r = G.run; this.gain = settleRun(this.win); this.fresh = noteDeed();
    // 끝 이야기: 이긴 밤에는 그 영웅만의 끝, 진 밤에는 장승 앞에서 깨어나는 장면을 인형극으로 먼저 보여 준다
    const hero = this.r ? this.r.hero : 'commander'; const te = this.win && this.r && this.r.trueEnd; this.play = new Play({ beats: te ? endingPlay(hero).slice(0, -1).concat(trueEndPlay(hero)) : this.win ? endingPlay(hero) : defeatPlay(hero), title: te ? '열세 번째 고개' : this.win ? `${UNITS[hero].name} 이야기 · 끝` : '홀린 밤', onDone: () => { this.play = null; this.t = 0; } }); this.conf = Array.from({ length: 70 }, () => ({ x: Math.random() * W, y: -Math.random() * H, v: 90 + Math.random() * 140, c: [RED, INDIGO, '#d9a441', '#3f6b5c', '#fbf7ec'][(Math.random() * 5) | 0], p: Math.random() * 6 })); }
  frame(g, dt) {
    bgm('story');
    if (this.play) { this.play.frame(g, dt); return; }
    this.t += dt; const t = this.t, r = this.r, win = this.win;
    drawVista(g, t, win ? 0.28 : 0.5);   // 첫 화면과 같은 달밤 고갯마루 (진 밤은 더 어둡게)
    if (win) { g.save(); g.globalCompositeOperation = 'lighter'; const sp = g.createRadialGradient(250, 520, 20, 250, 520, 420); sp.addColorStop(0, 'rgba(255,210,140,0.3)'); sp.addColorStop(1, 'rgba(255,210,140,0)'); g.fillStyle = sp; g.fillRect(0, 100, 700, 620); g.restore(); }
    if (win) for (const c of this.conf) { c.y += c.v * dt; if (c.y > H) { c.y = -20; c.x = Math.random() * W; } if (c.y > 92 && c.y < 190 && c.x > 300 && c.x < 980) continue;   // 이야기 글 위로는 지나가지 않는다
      g.save(); g.translate(c.x + Math.sin(t * 2 + c.p) * 20, c.y); g.rotate(t * 3 + c.p); rr(g, -7, -4, 14, 8, 1, c.c, INK, 1); g.restore(); }
    const te = win && r && r.trueEnd, en = r && r.endless; brushTitle(g, 640, 54, te ? 600 : 520, 76, en ? '끝없는 고개' : te ? '열세 번째 고개를 넘었다' : win ? '고개를 넘었다' : '도깨비에 홀린 밤', en ? '#6a2a4a' : te ? '#8a5a10' : win ? INDIGO : '#5a5346', te ? 40 : 44);
    // 원정의 끝을 알리는 그림: 이기면 높이 세운 깃발, 지면 부러진 깃발
    // 금테 두른 옻칠 메달 위에 원정의 끝 그림
    { const mk = Math.min(1, Math.max(0, (t - 0.15) / 0.4)); g.save(); g.globalAlpha = mk; ell(g, 312, 68, 58, 58, 'rgba(0,0,0,0.4)'); ell(g, 310, 64, 56, 56, foil(g, 254, 366), INK, 2); ell(g, 310, 64, 49, 49, win ? '#2b3b60' : '#3a2a30', 'rgba(40,20,8,0.8)', 1.2); ell(g, 310, 64, 44, 44, null, 'rgba(243,210,124,0.5)', 1); g.restore(); }
    inkMark(g, win ? 'win' : 'lose', 310, 64, 70, { k: (t - 0.25) / 0.5, col: win ? '#f6efdc' : '#f3b9a6', v: win ? 0 : 2 });
    // 이긴 밤에는 영웅의 후일담, 진 밤에는 장승 앞에서 깨어난다
    const tale = en ? `열두 고개 너머로 고개 ${r.endlessN || 0}개를 더 넘었습니다.${(r.endlessN || 0) > (r.endlessBest || 0) ? ' 가장 멀리 갔습니다!' : ` (가장 멀리 ${r.endlessBest || 0})`}\n${chapterOf(r.ch).name}에서 긴 밤이 다시 내려앉았습니다.` : te ? '주막의 여우가 건넨 등불을 들고 내려왔습니다.\n이제 마을에서는 밤마다 열두 고개 이야기를 들려줍니다.' : win ? ENDING + '\n' + (r && EPILOGUE[r.hero] || '') : (r ? `${chapterOf(r.ch).name}에서 길을 잃었습니다.\n` : '') + DEFEAT;
    textBlock(g, tale, 640, 112, 1100, 25, { size: 18.5, stroke: 'rgba(8,8,20,0.75)', lw: 5, fill: '#f3e6c4' });
    if (r) { portrait(g, r.hero, 250, 596 - (win ? Math.abs(Math.sin(t * 4)) * 10 : 0), 3.0, t); if (win) { portrait(g, 'sword', 110, 620, 1.9, t, true); portrait(g, 'priest', 410, 620, 1.9, t, true); } else portrait(g, 'treant', 420, 620, 1.5, 0); }
    // 왼쪽 위: 영웅 숙련, 새로 열린 것, 오늘의 원정 점수
    if (r && r.xp) { const rows = [], k = Math.min(1, Math.max(0, (t - 0.5) / 0.4)), up = r.lvTo > r.lvFrom, xp = (meta.heroXp || {})[r.hero] || 0;
      if (up) rows.push([`숙련 ${r.lvTo} 달성 · ${MASTERY_GIFT[r.lvTo]}`, '#f6d27a']); else if (r.lvTo < 5) rows.push([`다음 숙련까지 ${MASTERY_XP[r.lvTo] - xp}`, '#d9c9a0']);
      if (r.opened && r.opened.length) rows.push([`새로 열림: ${r.opened.map(o => o.name.replace(' · ', ' ')).join(', ')}`, '#9fe0c8']);
      if (r.newFoes) rows.push([`도감에 새로 적힌 요괴 ${r.newFoes}`, '#e6d2a6']);
      if (r.daily) rows.push([`오늘의 원정 ${r.score}점${r.score > r.bestBefore ? ' · 오늘 최고!' : ` (최고 ${r.bestBefore})`}`, '#f3c0a0']);
      const bh = 50 + rows.length * 26; g.save(); g.globalAlpha = k; g.translate(0, win ? -40 : -10);
      rr(g, 44, 204, 448, bh, 10, 'rgba(26,14,18,0.86)', INK, 2); rr(g, 48, 208, 440, bh - 8, 8, null, foil(g, 44, 492), 1.3);
      const pk = (xp - MASTERY_XP[r.lvTo - 1]) / Math.max(1, (MASTERY_XP[r.lvTo] || xp) - MASTERY_XP[r.lvTo - 1]);
      text(g, `${UNITS[r.hero].name} 숙련 ${r.lvTo}`, 66, 229, { size: 19, font: FONT_B, align: 'left', fill: C.cream }); text(g, `숙련 +${r.xp}`, 470, 229, { size: 16, font: FONT_B, align: 'right', fill: '#f0d264' });
      if (r.lvTo >= 5 && !up) text(g, '숙련 최고 단계', 300, 229, { size: 15, fill: '#f6d27a' }); else { rr(g, 200, 223, 190, 11, 5, 'rgba(0,0,0,0.55)'); rr(g, 200, 223, 190 * (r.lvTo >= 5 ? 1 : Math.min(1, pk * k)), 11, 5, '#e0b050'); }
      rows.forEach(([s2, col], n) => text(g, s2, 66, 258 + n * 26, { size: 16, align: 'left', fill: col, maxW: 410 }));
      g.restore(); }
    // 원정 두루마리: 이번 원정을 그림 한 장으로 내려받는다 (씨앗 글자가 함께 적힌다)
    if (r && t > 0.8) { if (button(g, 'scroll', 1060, 150, 176, 42, '두루마리 저장', { style: 'wood', size: 17 })) { this.saved = saveScroll(r, win) ? 2.4 : -2.4; } if (r.seed != null) text(g, `씨앗 ${seedCode(r.seed)}`, 1050, 171, { size: 14, align: 'right', fill: '#e6d2a6' }); if (this.saved) { this.saved += this.saved > 0 ? -1 / 60 : 1 / 60; text(g, this.saved > 0 ? '내려받았습니다' : '저장하지 못했습니다', 1148, 206, { size: 13, fill: this.saved > 0 ? '#9fe0c8' : '#f3b9a6' }); if (Math.abs(this.saved) < 0.05) this.saved = 0; } }
    panel(g, 520, 198, 720, 364);
    panel(g, 540, 214, 250, 46, 'navy'); text(g, `공적 +${this.gain} · 쌓인 공적 ${meta.merit}`, 665, 238, { size: 19, fill: '#f0d99a', maxW: 226 });
    if (r) {
      [['쌓은 전공', `${r.merit || 0}`], ['이긴 싸움', `${r.wins}`], ['물리친 요괴', `${r.kills}`], ['잃은 병사', `${r.lost}`]].forEach(([a, b], n) => { const x = 820 + (n % 2) * 200, y = 224 + Math.floor(n / 2) * 32; text(g, a, x, y, { size: 18, align: 'left', fill: SUB }); text(g, b, x + 180, y, { size: 24, font: FONT_B, align: 'right' }); });
      text(g, `덱 ${r.deck.length}장`, 544, 296, { size: 20, font: FONT_B, align: 'left' });
      // 같은 패는 한 장으로 묶어 ×N 을 달고, 많으면 두 줄로 (넘치는 것은 '+N')
      const grp = []; for (const c of r.deck.slice().sort((a, b) => (isUnit(b) ? 1 : 0) - (isUnit(a) ? 1 : 0))) { const key = c.id + ':' + (c.lv || 1) + ':' + (c.up ? 1 : 0); const q = grp.find(x => x.key === key); if (q) q.n++; else grp.push({ key, c, n: 1 }); }
      const per = grp.length <= 11 ? 11 : 16, cw = grp.length <= 11 ? 58 : 38, ch = cw * 1.32, rows = Math.min(2, Math.ceil(grp.length / per));
      grp.slice(0, per * rows).forEach((q, n) => { const x = 544 + (n % per) * (cw + 4), y = 312 + Math.floor(n / per) * (ch + 6); cardFace(g, q.c, x, y, cw, ch); if (q.n > 1) { rr(g, x + cw - 22, y - 6, 26, 16, 5, RED, INK, 1.2); text(g, '×' + q.n, x + cw - 9, y + 2, { size: 12, font: FONT_B, fill: C.cream }); } });
      if (grp.length > per * rows) text(g, `+${grp.length - per * rows}`, 544 + per * (cw + 4) + 6, 312 + ch, { size: 16, font: FONT_B, align: 'left', fill: '#5a4a3a' });
      text(g, r.relics.length ? `지닌 보물 ${r.relics.length}` : '지닌 보물 없음', 544, 424 + (grp.length > 11 ? 24 : 0), { size: 20, font: FONT_B, align: 'left' });
      const rp = Math.min(46, 660 / Math.max(1, r.relics.length)); r.relics.forEach((id, n) => relicIcon(g, id, 568 + n * rp, 476 + (grp.length > 11 ? 16 : 0), Math.min(0.8, rp / 44)));
      // 평정해서 새 험로가 열렸으면 알린다: 다음 원정은 한 단계 더 험한 길로 갈 수 있다
      if (r.newHard) { const k = Math.min(1, Math.max(0, (t - 0.9) / 0.35)), hd = HARD[r.newHard]; g.save(); g.globalAlpha = k; rr(g, 800, 268, 422, 36, 8, '#2f6f5c', INK, 2); rr(g, 803, 271, 416, 30, 5, null, 'rgba(240,217,154,0.8)', 1.2); text(g, `새 험로가 열렸다 · ${r.newHard}단계 ${hd.name}`, 1011, 286.5, { size: 18, font: FONT_B, fill: '#f6efdc', maxW: 396 }); g.restore(); }
    }
    // 다음에 맺을 영물의 인연 하나: 가장 가까운 것을 짚어 준다
    const nb = BEASTS.filter(b => !has(b.id)).sort((a, b) => deedCount(b) / b.need - deedCount(a) / a.need)[0];
    if (this.fresh.length) { text(g, `새로 맺은 인연 · ${this.fresh.map(b => UNITS[b.id].name).join(' · ')}`, 544, 532, { size: 18, font: FONT_B, align: 'left', fill: TEAL }); text(g, '다음 원정부터 전리품과 장터에 나옵니다', 880, 533, { size: 16, align: 'left', fill: SUB, weight: 400, maxW: 340 }); }
    else if (nb) { text(g, `다음 인연 · ${UNITS[nb.id].name}`, 544, 532, { size: 18, font: FONT_B, align: 'left', fill: TEAL }); text(g, `${nb.how}  (${Math.min(nb.need, deedCount(nb))} / ${nb.need})`, 716, 533, { size: 16, align: 'left', fill: SUB, weight: 400, maxW: 500 }); }
    // 평정한 밤에는 끝없는 고개로 그대로 이어 갈 수 있다 (오늘의 원정은 빼고)
    const endless = win && r && r.done && !r.daily && !r.endless, bw = endless ? 214 : 310;
    if (endless && t > 0.8 && button(g, 'endless', 548, 586, 214, 90, '끝없는 고개로', { style: 'red', size: 25 })) { if (goEndless()) nav.go('run'); return; }
    if (t > 0.8 && button(g, 'home', endless ? 774 : 560, 586, bw, 90, '처음으로', { style: 'paper', size: endless ? 28 : 34 })) { G.run = null; save(); nav.go('title'); }
    if (t > 0.8 && button(g, 'meta', endless ? 1000 : 890, 586, endless ? 222 : 310, 90, '공적 장부', { size: endless ? 28 : 34 })) { G.run = null; save(); nav.go('meta'); }
  }
}
