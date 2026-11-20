// 고갯길 지도: 갈림길에서 다음 칸을 고른다
import { W, H } from '../config.js';
import { TAU, INK, PAPER, RED, REDD, INDIGO, NAVY, TEAL, OCHRE, SUB, FONT_B, text, textBlock, ell, rr, line, st, clamp } from '../render/draw.js';
import { button, panel, brushTitle, seal, icon, C, tapped, ui } from '../ui/ui.js';
import { nav } from '../nav.js';
import { G, meta, openNodes, enterNode, lvlOf, countOf, cap, used, HARD_DESC } from '../state.js';
import { CHAPTERS } from '../data/stages.js';
import { BOSSES } from '../data/encounters.js';
import { UNITS } from '../data/units.js';
import { RELICS } from '../data/relics.js';
import { dimBackdrop } from './title.js';
import { portrait } from './battle.js';
import { sfx } from '../audio.js';

export const NODE = {
  battle: { ch: '전', col: INDIGO, name: '싸움' }, elite: { ch: '강', col: RED, name: '강적' }, event: { ch: '?', col: '#6a5a8a', name: '사건' },
  shop: { ch: '장', col: '#b8742a', name: '장터' }, rest: { ch: '주', col: '#2f6f5c', name: '주막' }, treasure: { ch: '보', col: '#b8862a', name: '보물' }, boss: { ch: '두', col: REDD, name: '두목' },
};
const pos = n => n.type === 'boss' ? { x: 360, y: 262 } : { x: 132 + n.c * 152 + Math.sin(n.id * 7.3) * 16, y: 1000 - n.r * 146 + Math.cos(n.id * 5.1) * 10 };

export class MapScene {
  constructor() { this.t = 0; this.roster = false; this.hit = {}; }
  frame(g, dt) {
    this.t += dt; const t = this.t, r = G.run, m = r.map, open = openNodes(), ch = CHAPTERS[r.ch];
    dimBackdrop(g, 0.78);
    brushTitle(g, 360, 74, 470, 76, ch.name, INDIGO, 38);
    for (let k = 0; k < 3; k++) icon.flag(g, 30 + k * 28, 152, 1.05, k < r.crowns ? RED : '#c9c2b0');
    panel(g, 530, 132, 174, 40, 'tag'); icon.coin(g, 554, 152, 12); text(g, `엽전 ${r.gold}`, 628, 153, { size: 20, maxW: 130 });
    text(g, r.hard ? `험로 ${r.hard}단계  ·  ${ch.sub}` : ch.sub, 360, 153, { size: 18, fill: SUB, weight: 400, maxW: 380 });
    // 길
    for (const n of m.nodes) for (const id of n.next) {
      const a = pos(n), b = pos(m.nodes[id]), walked = m.done.includes(n.id) && (m.done.includes(id) || m.cur === id), live = m.cur === n.id && m.done.includes(n.id);
      g.setLineDash(walked ? [] : [10, 9]); g.globalAlpha = walked || live ? 1 : 0.5; line(g, [a.x, a.y, b.x, b.y], walked ? RED : INK, walked ? 4 : 2.4); g.setLineDash([]); g.globalAlpha = 1;
    }
    // 칸
    for (const n of m.nodes) {
      const p = pos(n), v = NODE[n.type], can = open.includes(n.id); this.hit[n.id] = can ? p : null; const done = m.done.includes(n.id), boss = n.type === 'boss', s = boss ? 104 : 68, hs = s / 2 + 8;
      if (can && !this.left && tapped('n' + n.id, p.x - hs, p.y - hs, hs * 2, hs * 2) && !this.roster) { this.left = true; sfx('card'); nav.go(enterNode(n.id)); }
      if (can) { const k = 1 + Math.sin(t * 5) * 0.06; g.globalAlpha = 0.9; ell(g, p.x, p.y, hs * 1.12 * k, hs * 1.12 * k, 'rgba(217,164,65,0.28)', OCHRE, 3.4); g.globalAlpha = 1; }
      g.save(); if (!can && !done && n.id !== m.cur) g.globalAlpha = 0.72; if (done) g.globalAlpha = 0.45;
      if (boss) { ell(g, p.x, p.y, 56, 56, '#efd9cf', INK, 3.4); g.save(); g.beginPath(); g.arc(p.x, p.y, 54, 0, TAU); g.clip(); portrait(g, BOSSES[r.ch].key, p.x, p.y + 50, 0.52, t); g.restore(); }
      else seal(g, p.x, p.y, s, v.ch, v.col);
      g.restore();
      if (done) icon.check(g, p.x, p.y, 1.6, true);
      text(g, boss ? BOSSES[r.ch].name : v.name, p.x, p.y + s / 2 + 18, { size: boss ? 24 : 18, font: boss ? FONT_B : undefined, fill: can ? INK : SUB, stroke: PAPER, lw: 5 });
    }
    // 지금 서 있는 곳
    const cur = m.cur === null ? { x: 360, y: 1092 } : pos(m.nodes[m.cur]);
    portrait(g, r.hero, cur.x + (m.cur === null ? 0 : 40), cur.y + (m.cur === null ? 30 : 34) - Math.abs(Math.sin(t * 4)) * 5, 0.9, t);
    if (m.cur === null) text(g, '출발할 칸을 고르세요', 360, 1146, { size: 22, font: FONT_B, stroke: PAPER, lw: 6 });
    // 아래: 범례와 버튼
    const kinds = ['battle', 'elite', 'event', 'shop', 'rest', 'treasure'];
    kinds.forEach((k, i) => { const x = 40 + i * 110; seal(g, x + 14, 1190, 28, NODE[k].ch, NODE[k].col); text(g, NODE[k].name, x + 34, 1191, { size: 17, align: 'left', fill: SUB }); });
    if (button(g, 'army', 30, 1216, 320, 54, '군대 살피기', { style: 'paper', size: 26 })) this.roster = true;
    if (button(g, 'home', 370, 1216, 320, 54, '처음 화면으로', { style: 'paper', size: 26 })) nav.go('title');
    if (this.roster) this.drawRoster(g);
  }
  drawRoster(g) {
    const r = G.run;
    g.fillStyle = 'rgba(31,42,68,0.55)'; g.fillRect(0, 0, W, H);
    panel(g, 30, 110, 660, 1060);
    brushTitle(g, 360, 112, 300, 68, '우리 군대', INDIGO, 36);
    icon.sack(g, 70, 186, 0.95); text(g, `군량 ${used()} / ${cap()}   ·   이긴 싸움 ${r.wins}`, 92, 188, { size: 20, align: 'left', fill: SUB });
    r.squads.forEach((s, n) => { const x = 86 + (n % 6) * 104, y = 300 + Math.floor(n / 6) * 150, d = UNITS[s.type]; g.save(); if (!s.placed) g.globalAlpha = 0.5; portrait(g, s.type, x, y, d.hero ? 1.0 : 1.15, this.t); g.restore(); text(g, d.name, x, y + 20, { size: 15, maxW: 98 }); text(g, `Lv${lvlOf(s.type)} · ${countOf(s.type)}명`, x, y + 40, { size: 14, fill: SUB, weight: 400 }); });
    const y0 = 300 + Math.ceil(r.squads.length / 6) * 150 + 10;
    text(g, r.relics.length ? '지닌 보물' : '지닌 보물 없음', 60, y0, { size: 24, font: FONT_B, align: 'left' });
    const lh = Math.min(34, (1060 - (y0 - 110) - 130) / Math.max(1, r.relics.length));
    r.relics.forEach((id, n) => { const x = RELICS[id], y = y0 + 36 + n * lh; text(g, x.name, 60, y, { size: Math.min(19, lh * 0.6), align: 'left', fill: x.curse ? '#6a4a9a' : INK }); text(g, x.desc, 210, y, { size: Math.min(17, lh * 0.54), align: 'left', fill: SUB, weight: 400, maxW: 450 }); });
    if (button(g, 'close', 230, 1082, 260, 68, '닫기', { size: 30 })) this.roster = false;
  }
}
