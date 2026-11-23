// 원정 두루마리: 한 원정의 영웅·결과·덱·보물·씨앗을 그림 한 장(1200×630)으로 남긴다. 끝 화면에서 내려받아 나눈다
import { INK, SUB, FONT_B, text, rr, ell, makeCanvas } from '../render/draw.js';
import { goldText, foil } from './ui.js';
import { cardFace } from './cards.js';
import { relicIcon } from '../render/icons.js';
import { portrait } from '../render/sprites.js';
import { drawVista } from '../render/keyart.js';
import { UNITS, HERO_COL } from '../data/units.js';
import { CARDS, isUnit } from '../data/cards.js';
import { chapterOf, N_CH } from '../data/stages.js';
import { VOWS, DAILY_RULES } from '../data/progress.js';
import { HARD, seedCode } from '../state.js';

export function drawScroll(r, win) {
  const c = makeCanvas(1200, 630), g = c.getContext('2d'), col = HERO_COL[r.hero] || '#8a2a26';
  // 달밤 고갯마루를 바탕으로 한지 두루마리를 펼친다 (양 끝에 나무 축)
  g.save(); g.scale(1200 / 1280, 630 / 720); drawVista(g, 6, 0.45); g.restore();
  rr(g, 40, 34, 1120, 562, 14, 'rgba(0,0,0,0.45)');
  const pg = g.createLinearGradient(0, 30, 0, 590); pg.addColorStop(0, '#fbf3df'); pg.addColorStop(1, '#ecdfbf'); rr(g, 46, 30, 1108, 560, 10, pg, INK, 2.4);
  rr(g, 52, 36, 1096, 548, 8, null, foil(g, 46, 1154), 1.6);
  for (const x of [30, 1158]) { rr(g, x, 20, 14, 590, 6, '#6a3e22', INK, 2); ell(g, x + 7, 20, 11, 8, '#8a5a30', INK, 1.6); ell(g, x + 7, 610, 11, 8, '#8a5a30', INK, 1.6); }
  // 머리: 제호와 결과
  goldText(g, '열두 고개 · 원정 두루마리', 600, 74, { size: 34, glow: false });
  const res = r.endless ? `끝없는 고개 ${r.endlessN || 0}개 더` : win ? (r.trueEnd ? '열세 번째 고개까지' : '열두 고개 평정') : `${chapterOf(r.ch).name}에서 쓰러짐`;
  text(g, res, 600, 114, { size: 28, font: FONT_B, fill: win || r.endless ? '#8a2a26' : '#4a4034' });
  const d = new Date(); text(g, `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일${r.gain ? ` · 얻은 공적 ${r.gain + (r.featMerit || 0)}` : ''}`, 1128, 60, { size: 14, align: 'right', fill: SUB });
  // 왼쪽: 영웅 초상과 조건
  ell(g, 176, 250, 96, 96, '#efd9a8', INK, 2.4); ell(g, 176, 250, 89, 89, null, col, 2.4);
  g.save(); g.beginPath(); g.arc(176, 250, 94, 0, Math.PI * 2); g.clip(); g.fillStyle = 'rgba(140,160,120,0.55)'; g.fillRect(70, 290, 220, 70); portrait(g, r.hero, 172, 330, 1.8, 0, false); g.restore();
  text(g, UNITS[r.hero].name, 176, 372, { size: 28, font: FONT_B });
  const tags = [r.daily ? `오늘의 원정 ${r.daily.date}` : r.hard ? `험로 ${r.hard} · ${HARD[r.hard].name}` : '평탄한 길'].concat((r.vows || []).map(k => '서약 · ' + VOWS[k].name), r.daily ? r.daily.rules.map(k => DAILY_RULES[k].name) : []);
  tags.slice(0, 5).forEach((s, n) => { rr(g, 76, 396 + n * 30, 200, 24, 12, 'rgba(138,42,38,0.1)', 'rgba(138,42,38,0.45)', 1); text(g, s, 176, 408.5 + n * 30, { size: 13.5, fill: '#6a2a26', maxW: 188 }); });
  // 가운데·오른쪽: 기록, 덱, 보물
  const stats = [['넘은 고개', `${Math.min(r.ch, N_CH)}${r.endless ? ' + ' + (r.endlessN || 0) : ''}`], ['이긴 싸움', r.wins], ['물리친 요괴', r.kills], ['잃은 병사', r.lost], ['쌓은 전공', r.merit || 0]];
  stats.forEach(([a, b], n) => { const x = 330 + n * 162; rr(g, x, 146, 150, 56, 8, 'rgba(60,40,20,0.06)', 'rgba(60,40,20,0.3)', 1); text(g, a, x + 75, 163, { size: 14, fill: SUB }); text(g, String(b), x + 75, 187, { size: 22, font: FONT_B }); });
  const grp = []; for (const q of r.deck.slice().sort((a, b) => (isUnit(b) ? 1 : 0) - (isUnit(a) ? 1 : 0))) { const key = q.id + ':' + (q.lv || 1) + ':' + (q.up ? 1 : 0) + ':' + (q.br || ''); const e = grp.find(x => x.key === key); if (e) e.n++; else grp.push({ key, c: q, n: 1 }); }
  text(g, `덱 ${r.deck.length}장`, 330, 228, { size: 18, font: FONT_B, align: 'left' });
  const per = 10, cw = 74, ch = 98; grp.slice(0, per * 2).forEach((q, n) => { const x = 330 + (n % per) * (cw + 6), y = 244 + Math.floor(n / per) * (ch + 10); cardFace(g, q.c, x, y, cw, ch); if (q.n > 1) { rr(g, x + cw - 22, y - 6, 26, 16, 5, '#a8322a', INK, 1.2); text(g, '×' + q.n, x + cw - 9, y + 2, { size: 12, font: FONT_B, fill: '#fbf7ec' }); } });
  const ry = 244 + Math.min(2, Math.ceil(grp.length / per)) * (ch + 10) + 16;
  text(g, r.relics.length ? `보물 ${r.relics.length}` : '보물 없음', 330, ry, { size: 18, font: FONT_B, align: 'left' });
  const rp = Math.min(60, 790 / Math.max(1, r.relics.length)); r.relics.forEach((id, n) => relicIcon(g, id, 360 + n * rp, ry + 40, Math.min(0.95, rp / 60)));
  // 아래: 씨앗 글자 (영웅 고르기의 '씨앗'에 넣으면 같은 길을 걷는다)
  if (r.seed != null) { rr(g, 870, 540, 260, 36, 8, '#2a1418', INK, 1.6); text(g, `씨앗 ${seedCode(r.seed)}`, 1000, 558.5, { size: 18, font: FONT_B, fill: '#f0d99a' }); text(g, '이 씨앗으로 같은 길을 걸을 수 있습니다', 860, 558, { size: 13, align: 'right', fill: SUB }); }
  return c;
}
// 내려받기: 파일 이름에 영웅과 씨앗을 넣는다
export function saveScroll(r, win) {
  try { const c = drawScroll(r, win), a = document.createElement('a'); a.download = `열두고개-${UNITS[r.hero].name}-${r.seed != null ? seedCode(r.seed) : 'run'}.png`; a.href = c.toDataURL('image/png'); document.body.appendChild(a); a.click(); a.remove(); return true; } catch (e) { return false; }
}
