// 아래 띠 가운데: 대기 병사. 하나를 누르면 붓에 그 병사의 먹이 묻는다 (전장에 그은 획을 따라 선다)
// '진형' 을 고르면 붓은 이미 선 병사들의 자리만 바꾼다. '알아서' 는 획 앞쪽엔 근접, 뒤쪽엔 활·치유를 고른다
import { INK, FONT_B, text, rr, ell, clamp } from '../render/draw.js';
import { CARDS, cardName } from '../data/cards.js';
import { TIER, tierOf } from '../sim/battle.js';
import { portrait, lookOf } from '../render/sprites.js';
import { inkKey } from './brushform.js';
import { icon, tapped, inRect, C } from './ui.js';
import { sfx } from '../audio.js';

export const TIER_COL = { common: '#7a6a52', rare: '#2f6f9e', epic: '#7a3fa0', legend: '#c8901e' };
const RANK = ['legend', 'epic', 'rare', 'common'];
// 대기 병사를 병종·갈래마다 한 칸으로 묶는다
export function reserveGroups(b) {
  const grp = new Map();
  for (const e of b.roster) { const k = inkKey(e.c); const q = grp.get(k) || { key: k, c: e.c, left: 0, max: 0 }; q.left += e.left; q.max += e.max; if ((e.c.lv || 1) > (q.c.lv || 1)) q.c = e.c; grp.set(k, q); }
  return [...grp.values()].sort((p, q) => RANK.indexOf(tierOf(p.c)) - RANK.indexOf(tierOf(q.c)) || q.left - p.left);
}
// 붓이 지금 무엇을 그리나: 'form'(진형) · 'auto'(알아서 부르기) · 갈래 열쇠
export function inkMode(s, b) {
  if (s.ink && s.ink !== 'form' && s.ink !== 'auto' && !reserveGroups(b).some(q => q.key === s.ink && q.left > 0)) s.ink = null;
  if (!s.ink) s.ink = b.reserveN() > 0 ? 'auto' : 'form';
  if (s.ink === 'auto' && b.reserveN() === 0) s.ink = 'form';
  return s.ink;
}
export function drawReserve(s, g, b, i, x, y, w, h, live) {
  const mode = inkMode(s, b), list = reserveGroups(b), cost = b.callCost();
  rr(g, x, y, w, h, 10, 'rgba(10,14,28,0.45)', 'rgba(154,166,196,0.35)', 1.2);
  text(g, '붓에 먹을 묻힌다', x + 12, y + 13, { size: 15, font: FONT_B, fill: C.gilt, align: 'left' });
  const how = mode === 'form' ? '그은 획을 따라 선 병사들이 진을 친다' : b.waveOn ? `그은 획을 따라 병사가 선다 · 한 명당 사기 ${cost}` : '그은 획을 따라 병사가 선다 · 준비 중엔 공짜';
  text(g, how, x + 132, y + 13.5, { size: 12.5, fill: 'rgba(240,226,196,0.75)', align: 'left', weight: 400, maxW: w - 144 });
  const cy = y + 26, ch = h - 34;
  // 진형 붓 · 알아서
  const tool = (id, k, label, sub, draw) => {
    const cx = x + 10 + k * 70, on = mode === id, ok = id === 'form' || b.reserveN() > 0;
    rr(g, cx, cy, 64, ch, 8, on ? '#f6e7bd' : ok ? '#e8dcbc' : 'rgba(232,220,188,0.35)', on ? '#e2b85a' : 'rgba(40,28,20,0.6)', on ? 3 : 1.2);
    draw(cx + 32, cy + 38, ok); text(g, label, cx + 32, cy + ch - 26, { size: 15, font: FONT_B, fill: ok ? INK : '#8a8474' }); text(g, sub, cx + 32, cy + ch - 10, { size: 11, fill: ok ? '#5a4a3a' : '#8a8474', weight: 400 });
    if (live && ok && tapped('ink' + id, cx, cy, 64, ch)) { s.ink = id; sfx('click'); }
  };
  tool('form', 0, '진형', '자리 바꾸기', (px, py) => { for (let q = 0; q < 3; q++) ell(g, px - 14 + q * 14, py + (q === 1 ? -6 : 4), 5, 5, '#2f4d7e', INK, 1); });
  tool('auto', 1, '알아서', '골고루', (px, py, ok) => { g.globalAlpha = ok ? 1 : 0.4; icon.people(g, px, py, 1.1, '#2f4d7e'); g.globalAlpha = 1; });
  // 병종마다 한 칸
  const ax = x + 10 + 2 * 70 + 6, room = x + w - 10 - ax, cw = Math.min(62, room / Math.max(1, list.length)), shown = list.slice(0, Math.floor(room / Math.max(36, cw)));
  shown.forEach((q, k) => {
    const cx = ax + k * cw, tier = tierOf(q.c), col = TIER_COL[tier], on = mode === q.key, left = q.left;
    rr(g, cx, cy, cw - 4, ch, 8, on ? '#f6e7bd' : left ? '#efe3c4' : 'rgba(239,227,196,0.3)', on ? '#e2b85a' : col, on ? 3 : tier === 'common' ? 1.2 : 2.4); rr(g, cx, cy, cw - 4, 6, 3, col);
    g.save(); g.beginPath(); g.rect(cx + 1, cy + 6, cw - 6, ch - 24); g.clip(); g.globalAlpha = left ? 1 : 0.3; portrait(g, lookOf(CARDS[q.c.id].unit, q.c.br), cx + (cw - 4) / 2, cy + ch - 22, 0.9, s.T, on); g.restore();
    rr(g, cx + cw - 28, cy + 9, 24, 17, 6, left ? col : '#6a6470'); text(g, '×' + left, cx + cw - 16, cy + 17.5, { size: 12, fill: '#fff8e6' });
    text(g, cardName(q.c).replace(/ \d+단$/, ''), cx + (cw - 4) / 2, cy + ch - 10, { size: 11.5, fill: left ? INK : '#8a8474', maxW: cw - 8 });
    if (live && tapped('rs' + k, cx, cy, cw - 4, ch)) { if (left) { s.ink = on ? 'auto' : q.key; sfx('click'); } else { sfx('deny'); s.toast(`${cardName(q.c)} — 이번 싸움에 더 부를 병사가 없습니다 (쓰러진 병사는 싸움이 끝나면 돌아온다)`, 2.6); } }
  });
}
