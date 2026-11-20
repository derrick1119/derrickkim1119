// 전리품 고르기 (싸움·강적·두목·보물 상자): 군대 전리품 하나 → 전술 패 한 장
import { W, H } from '../config.js';
import { INK, PAPER, RED, INDIGO, NAVY, TEAL, OCHRE, SUB, FONT_B, text, textBlock, ell, rr, rrPath, clamp, easeOutBack } from '../render/draw.js';
import { ui, button, panel, brushTitle, stamp, icon, C, tapped } from '../ui/ui.js';
import { nav } from '../nav.js';
import { G, save, has, rollRewards, rollCards, describeReward, applyReward, addCard, finishNode, lvlOf, cap } from '../state.js';
import { UNITS } from '../data/units.js';
import { RELICS } from '../data/relics.js';
import { dimBackdrop } from './title.js';
import { portrait, weaponIcon } from '../render/sprites.js';
import { cardFace, DeckView, ArmyView } from '../ui/cards.js';
import { relicIcon } from '../render/icons.js';
import { sfx } from '../audio.js';

const COL = { blue: INDIGO, green: TEAL, purple: '#b8742a', gold: RED };
const TITLE = { battle: '전리품', elite: '강적의 전리품', boss: '두목의 전리품', treasure: '보물 상자' };
export class RewardScene {
  constructor() {
    const r = this.r = G.run, p = this.p = r.rewardPending || (r.rewardPending = { kind: 'battle' });
    if (!p.opts) { p.opts = rollRewards(p.kind); p.taken = -1; p.rerolls = 0; p.free = has('p_reroll') ? 1 : 0; save(); }
    if (p.cards === undefined) { p.cards = p.kind === 'treasure' ? null : rollCards(p.kind); p.card = -1; p.step = 0; save(); }
    this.t = 0; this.over = null;
  }
  leave() { if (this.left) return; this.left = true; const ended = finishNode(); nav.go(ended ? 'end' : 'map', ended ? { win: true } : undefined); }
  frame(g, dt) {
    this.t += dt; const r = this.r, p = this.p; ui.top = this.over ? 1 : 0;
    dimBackdrop(g);
    panel(g, 530, 150, 174, 40, 'tag'); icon.coin(g, 554, 170, 12); text(g, `엽전 ${r.gold}`, 628, 171, { size: 20, maxW: 130 });
    for (let k = 0; k < 3; k++) icon.flag(g, 30 + k * 28, 172, 1.05, k < r.crowns ? RED : '#c9c2b0');
    if (p.step === 1 && p.cards) this.cardStep(g, r, p); else this.lootStep(g, r, p);
    if (this.over) this.over.frame(g, dt);
  }
  lootStep(g, r, p) {
    const t = this.t, done = p.taken >= 0;
    brushTitle(g, 360, 88, 420, 78, TITLE[p.kind] || '전리품', p.kind === 'treasure' ? '#b8862a' : INDIGO, 44);
    text(g, done ? (p.kind === 'boss' && r.ch < 2 ? '고개를 넘었습니다 — 깃발 하나를 되찾습니다' : '챙겼습니다') : '하나를 고르세요', 360, 234, { size: 24, fill: SUB });
    p.opts.forEach((o, n) => {
      const d = describeReward(o), col = COL[d.col], x = 24 + n * 228, w = 216, h = 420, taken = p.taken === n;
      const k = easeOutBack(clamp((t - n * 0.12) / 0.35, 0, 1)), y = 276 + (1 - k) * 60;
      g.save(); g.globalAlpha = clamp((t - n * 0.12) / 0.2, 0, 1) * (done && !taken ? 0.4 : 1);
      rr(g, x + 3, y + 5, w, h, 6, 'rgba(50,36,20,0.22)'); rr(g, x, y, w, h, 6, PAPER, INK, 3);
      g.save(); g.beginPath(); rrPath(g, x + 2, y + 2, w - 4, 174, 5); g.clip(); g.fillStyle = '#efe4c9'; g.fillRect(x, y, w, 180); g.fillStyle = col; g.fillRect(x, y, w, 46); g.fillStyle = '#a9b78f'; g.globalAlpha *= 0.5; g.fillRect(x, y + 146, w, 34); g.restore();
      g.fillStyle = INK; g.fillRect(x + 2, y + 174, w - 4, 2.4);
      const cx = x + w / 2, cy = y + 116;
      if (o.kind === 'recruit' || o.kind === 'train' || o.kind === 'reinforce') { portrait(g, o.type, cx, cy + 48, 1.7, t + n, !done); if (o.kind !== 'recruit') { ell(g, cx + 68, cy - 30, 19, 19, PAPER, INK, 2); text(g, o.kind === 'train' ? '↑' : '+', cx + 68, cy - 29, { size: 30, font: FONT_B, fill: TEAL }); } }
      else if (o.kind === 'relic') { g.save(); g.globalAlpha *= 0.6; ell(g, cx, cy + 4, 56, 44, PAPER, INK + '55', 1.2); g.restore(); relicIcon(g, o.id, cx, cy + 3, 2.1, Math.sin(t * 2 + n) * 0.04); }
      else if (o.kind === 'weapon') { g.save(); g.globalAlpha *= 0.6; ell(g, cx, cy + 4, 58, 44, PAPER, INK + '55', 1.2); g.restore(); weaponIcon(g, o.id, cx, cy + 4, 1.5); }
      else if (o.kind === 'hero') { portrait(g, r.hero, cx, cy + 50, 1.45, t, !done); ell(g, cx + 68, cy - 30, 19, 19, PAPER, INK, 2); text(g, '↑', cx + 68, cy - 29, { size: 30, font: FONT_B, fill: RED }); }
      else icon.sack(g, cx, cy + 6, 3.4);
      text(g, d.title, cx, y + 25, { size: 26, font: FONT_B, fill: C.cream });
      text(g, d.name, cx, y + 208, { size: 24, font: FONT_B, maxW: w - 22 });
      textBlock(g, d.desc, cx, y + 244, w - 32, 25, { size: 17.5, fill: SUB, weight: 400 });
      g.restore();
      if (taken) stamp(g, cx, y + 352, 40, '득', RED, -0.14);
      else if (!done && t > 0.6 && button(g, 'pick' + n, x + 18, y + h - 82, w - 36, 62, '고르기', { size: 30 })) { p.taken = n; applyReward(o); sfx('card'); save(); }
    });
    panel(g, 24, 724, 672, 190);
    text(g, '우리 군대', 46, 754, { size: 26, font: FONT_B, align: 'left' });
    icon.sack(g, 590, 752, 0.85); text(g, `군량 ${cap()}`, 608, 754, { size: 19, align: 'left', fill: SUB });
    const sq = r.squads, per = Math.min(92, 640 / Math.max(1, sq.length));
    sq.forEach((s, n) => { const x = 46 + per * n + per / 2 - 6, y = 876; g.save(); if (!s.placed) g.globalAlpha = 0.5; portrait(g, s.type, x, y, UNITS[s.type].hero ? 1.05 : 1.2, t, false, s.wpn); g.restore(); rr(g, x - 22, y + 6, 44, 19, 4, NAVY); text(g, `Lv${lvlOf(s.type)}`, x, y + 16, { size: 13, fill: '#f0d99a' }); });
    panel(g, 24, 932, 672, 152, 'navy');
    text(g, r.relics.length ? `지닌 보물 · ${r.relics.length}` : '지닌 보물 없음', 46, 962, { size: 22, font: FONT_B, fill: C.cream, align: 'left' });
    if (r.relics.length) {
      text(g, '눌러서 자세히 보기', 674, 963, { size: 15, fill: '#a9b6d0', align: 'right', weight: 400 });
      const pitch = Math.min(78, 632 / r.relics.length), named = pitch >= 68;
      r.relics.forEach((id, k) => { const x = 44 + pitch * (k + 0.5); relicIcon(g, id, x, named ? 1012 : 1026, Math.min(0.92, pitch / 46)); if (named) text(g, RELICS[id].name, x, 1056, { size: 13.5, fill: '#f0d99a', weight: 400, maxW: pitch - 4 }); });
      if (!this.over && tapped('relics', 24, 932, 672, 152)) this.over = new ArmyView({ tab: 1, onClose: () => { this.over = null; } });
    }
    if (!done) { const rc = p.free > 0 ? 0 : 15 + p.rerolls * 10; if (button(g, 'reroll', 190, 1118, 340, 78, rc ? `다시 뽑기 · 엽전 ${rc}` : '다시 뽑기 · 무료', { style: r.gold >= rc ? 'paper' : 'grey', size: 28 })) { if (r.gold >= rc) { r.gold -= rc; if (p.free > 0) p.free--; else p.rerolls++; p.opts = rollRewards(p.kind); this.t = 0; save(); sfx('card'); } else sfx('deny'); } return; }
    const got = p.opts[p.taken], wpn = got && got.kind === 'weapon';
    if (button(g, 'army', 30, 1118, wpn ? 300 : 200, 84, wpn ? '바로 끼우기' : '군대 · 무기', { style: wpn ? 'teal' : 'paper', size: wpn ? 32 : 26 })) this.over = new ArmyView({ weapon: wpn ? got.id : null, onClose: () => { this.over = null; } });
    const nx = wpn ? 346 : 246, nw = 690 - nx;
    if (p.cards) { if (button(g, 'next', nx, 1112, nw, 96, '전술 패 고르기', { size: 38 })) { p.step = 1; this.t = 0; save(); } }
    else if (button(g, 'next', nx, 1112, nw, 96, '길을 떠난다', { size: 40 })) this.leave();
  }
  cardStep(g, r, p) {
    const t = this.t, done = p.card !== -1;
    brushTitle(g, 360, 88, 420, 78, '전술 패', '#b8742a', 44);
    text(g, done ? (p.card === -2 ? '패를 받지 않았습니다' : '덱에 넣었습니다') : '덱에 넣을 패를 하나 고르세요 — 건너뛰어도 됩니다', 360, 234, { size: 22, fill: SUB, maxW: 660 });
    p.cards.forEach((c, n) => {
      const x = 24 + n * 228, w = 216, h = 330, taken = p.card === n, k = easeOutBack(clamp((t - n * 0.1) / 0.35, 0, 1)), y = 280 + (1 - k) * 60;
      g.save(); g.globalAlpha = clamp((t - n * 0.1) / 0.2, 0, 1) * (done && !taken ? 0.4 : 1); cardFace(g, c, x, y, w, h); g.restore();
      if (taken) stamp(g, x + w / 2, y + 250, 40, '득', RED, -0.14);
      else if (!done && t > 0.5 && button(g, 'cpick' + n, x + 18, y + h + 14, w - 36, 60, '고르기', { size: 30 })) { p.card = n; addCard(c.id, c.up); sfx('card'); save(); }
    });
    // 지금 덱
    panel(g, 24, 724, 672, 330);
    text(g, `지금 덱 · ${r.deck.length}장`, 46, 756, { size: 26, font: FONT_B, align: 'left' });
    text(g, '싸움에서는 손에 4장을 들고, 쓴 자리는 덱에서 새로 뽑습니다', 674, 758, { size: 15.5, align: 'right', fill: SUB, weight: 400, maxW: 400 });
    const n = r.deck.length, cols = Math.max(7, Math.ceil(n / 2)), cw = Math.min(84, (640 - (cols - 1) * 6) / cols), chh = Math.min(118, cw * 1.36);
    r.deck.forEach((c, k) => cardFace(g, c, 40 + (k % cols) * (cw + 6), 786 + Math.floor(k / cols) * (chh + 10), cw, chh));
    if (button(g, 'deck', 30, 1118, 200, 84, '덱 살피기', { style: 'paper', size: 26 })) this.over = new DeckView({ onClose: () => { this.over = null; } });
    if (!done) { if (button(g, 'skip', 246, 1112, 444, 96, '받지 않고 건너뛴다', { style: 'paper', size: 32 })) { p.card = -2; save(); } }
    else if (button(g, 'next', 246, 1112, 444, 96, '길을 떠난다', { size: 40 })) this.leave();
  }
}
