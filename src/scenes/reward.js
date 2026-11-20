// 전리품 고르기
import { W, H } from '../config.js';
import { TAU, INK, PAPER, RED, INDIGO, NAVY, TEAL, OCHRE, SUB, FONT_B, text, textBlock, ell, rr, rrPath, clamp, easeOutBack } from '../render/draw.js';
import { button, panel, brushTitle, stamp, icon, C } from '../ui/ui.js';
import { nav } from '../nav.js';
import { G, save, rollRewards, describeReward, applyReward, autoPlace, lvlOf, cap } from '../state.js';
import { UNITS } from '../data/units.js';
import { STAGES, CHAPTERS } from '../data/stages.js';
import { dimBackdrop } from './title.js';
import { portrait } from './battle.js';
import { sfx } from '../audio.js';

const COL = { blue: INDIGO, green: TEAL, purple: '#b8742a', gold: RED };
const EXTRA_COST = [0, 40, 70];
export class RewardScene {
  constructor() {
    const r = this.r = G.run; if (!r.rewardPending) r.rewardPending = { boss: false };
    const p = this.p = r.rewardPending;
    if (!p.opts) { p.opts = rollRewards(p.boss); p.taken = []; p.rerolls = 0; save(); }
    this.t = 0;
  }
  frame(g, dt) {
    this.t += dt; const r = this.r, p = this.p, t = this.t;
    dimBackdrop(g);
    brushTitle(g, 360, 88, 400, 78, p.boss ? '두목의 전리품' : '전리품', INDIGO, 44);
    panel(g, 530, 150, 174, 40, 'tag'); icon.coin(g, 554, 170, 12); text(g, `엽전 ${r.gold}`, 628, 171, { size: 20, maxW: 130 });
    for (let k = 0; k < 3; k++) icon.flag(g, 30 + k * 28, 172, 1.05, k < r.crowns ? RED : '#c9c2b0');
    const picks = p.taken.length;
    text(g, picks === 0 ? '하나를 고르세요' : picks < 3 ? '엽전으로 더 가져갈 수 있습니다' : '모두 챙겼습니다', 360, 234, { size: 24, fill: SUB });
    p.opts.forEach((o, n) => {
      const d = describeReward(o), col = COL[d.col], x = 24 + n * 228, w = 216, h = 420, taken = p.taken.includes(n);
      const k = easeOutBack(clamp((t - n * 0.12) / 0.35, 0, 1)), y = 276 + (1 - k) * 60, cost = EXTRA_COST[Math.min(picks, 2)], afford = r.gold >= cost;
      g.save(); g.globalAlpha = clamp((t - n * 0.12) / 0.2, 0, 1) * (taken ? 0.55 : 1);
      rr(g, x + 3, y + 5, w, h, 6, 'rgba(50,36,20,0.22)'); rr(g, x, y, w, h, 6, PAPER, INK, 3);
      g.save(); g.beginPath(); rrPath(g, x + 2, y + 2, w - 4, 174, 5); g.clip(); g.fillStyle = '#efe4c9'; g.fillRect(x, y, w, 180); g.fillStyle = col; g.fillRect(x, y, w, 46); g.fillStyle = '#a9b78f'; g.globalAlpha *= 0.5; g.fillRect(x, y + 146, w, 34); g.restore();
      g.fillStyle = INK; g.fillRect(x + 2, y + 174, w - 4, 2.4);
      const cx = x + w / 2, cy = y + 116;
      if (o.kind === 'recruit' || o.kind === 'train' || o.kind === 'reinforce') { portrait(g, o.type, cx, cy + 48, 1.7, t + n, !taken); if (o.kind !== 'recruit') { ell(g, cx + 68, cy - 30, 19, 19, PAPER, INK, 2); text(g, o.kind === 'train' ? '↑' : '+', cx + 68, cy - 29, { size: 30, font: FONT_B, fill: TEAL }); } }
      else if (o.kind === 'relic') stamp(g, cx, cy + 2, 46, '보', '#b8742a', -0.1);
      else if (o.kind === 'hero') { portrait(g, r.hero, cx, cy + 50, 1.45, t, !taken); ell(g, cx + 68, cy - 30, 19, 19, PAPER, INK, 2); text(g, '↑', cx + 68, cy - 29, { size: 30, font: FONT_B, fill: RED }); }
      else icon.sack(g, cx, cy + 6, 3.4);
      text(g, d.title, cx, y + 25, { size: 26, font: FONT_B, fill: C.cream });
      text(g, d.name, cx, y + 208, { size: 24, font: FONT_B, maxW: w - 22 });
      textBlock(g, d.desc, cx, y + 244, w - 32, 25, { size: 17.5, fill: SUB, weight: 400 });
      g.restore();
      if (taken) stamp(g, cx, y + 352, 40, '득', RED, -0.14);
      else if (t > 0.6) {
        if (picks === 0) { if (button(g, 'pick' + n, x + 18, y + h - 82, w - 36, 62, '고르기', { size: 30 })) this.take(n, 0); }
        else if (button(g, 'pick' + n, x + 18, y + h - 82, w - 36, 62, `엽전 ${cost}`, { style: afford ? 'paper' : 'grey', size: 28 })) { if (afford) this.take(n, cost); else sfx('deny'); }
      }
    });
    // 군대 요약
    panel(g, 24, 724, 672, 190);
    text(g, '우리 군대', 46, 754, { size: 26, font: FONT_B, align: 'left' });
    icon.sack(g, 590, 752, 0.85); text(g, `군량 ${cap() + 1}`, 608, 754, { size: 19, align: 'left', fill: SUB });
    const sq = r.squads, per = Math.min(92, 640 / Math.max(1, sq.length));
    sq.forEach((s, n) => { const x = 46 + per * n + per / 2 - 6, y = 876; g.save(); if (!s.placed) g.globalAlpha = 0.5; portrait(g, s.type, x, y, UNITS[s.type].hero ? 1.05 : 1.2, t); g.restore(); rr(g, x - 22, y + 6, 44, 19, 4, NAVY); text(g, `Lv${lvlOf(s.type)}`, x, y + 16, { size: 13, fill: '#f0d99a' }); });
    // 다음 고개 미리보기
    const ns = STAGES[r.stage + 1];
    if (ns) {
      panel(g, 24, 932, 672, 152, 'navy');
      rr(g, 42, 950, 112, 32, 6, ns.boss ? RED : INDIGO, OCHRE, 1.2); text(g, ns.boss ? '두목' : '다음 고개', 98, 967, { size: 18, fill: C.cream });
      text(g, `${ns.id}  ${ns.name}`, 170, 967, { size: 26, font: FONT_B, fill: C.cream, align: 'left', maxW: 500 });
      [...new Set(ns.enemy.map(e => e[0]))].slice(0, 8).forEach((tp, n) => portrait(g, tp, 82 + n * 78, 1068, UNITS[tp].boss ? 0.5 : 1.05, t));
    }
    if (picks === 0) { const rc = 15 + p.rerolls * 10; if (button(g, 'reroll', 190, 1118, 340, 78, `다시 뽑기 · 엽전 ${rc}`, { style: r.gold >= rc ? 'paper' : 'grey', size: 28 })) { if (r.gold >= rc) { r.gold -= rc; p.rerolls++; p.opts = rollRewards(p.boss); this.t = 0; save(); sfx('card'); } else sfx('deny'); } }
    else if (button(g, 'next', 150, 1112, 420, 96, ns ? '다음 고개로' : '계속', { size: 44 })) this.next();
  }
  take(n, cost) { const r = this.r, p = this.p; r.gold -= cost; p.taken.push(n); applyReward(p.opts[n]); sfx(cost ? 'coin' : 'card'); save(); }
  next() { const r = this.r; r.stage++; r.rewardPending = null; for (const s of r.squads) if (!s.placed) autoPlace(s, 0); save(); nav.go('battle'); }
}
