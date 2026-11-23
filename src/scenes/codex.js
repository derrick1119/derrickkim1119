// 도감: 물리친 요괴, 지녀 본 보물, 쥐어 본 패를 모아 본다 (아직 못 만난 것은 먹 그림자로)
// 요괴는 싸움에서 처음 쓰러뜨릴 때, 보물·패는 원정에서 처음 얻을 때 적힌다 (state.js 의 seeFoe·noteCodex)
import { TAU, INK, SUB, FONT_B, text, textBlock, rr, ell } from '../render/draw.js';
import { button, panel, brushTitle, goldText, tapped, foil, shine, C } from '../ui/ui.js';
import { nav } from '../nav.js';
import { meta } from '../state.js';
import { UNITS } from '../data/units.js';
import { RELICS } from '../data/relics.js';
import { CARDS, cardName } from '../data/cards.js';
import { AXES } from '../data/branches.js';
import { portrait } from '../render/sprites.js';
import { relicIcon } from '../render/icons.js';
import { cardFace } from '../ui/cards.js';
import { dimBackdrop } from './title.js';
import { sfx, bgm } from '../audio.js';

const FOES = Object.keys(UNITS).filter(k => UNITS[k].side === 1 && !UNITS[k].prop && UNITS[k].role !== '소품' && UNITS[k].name).sort((a, b) => (UNITS[a].boss ? 1 : 0) - (UNITS[b].boss ? 1 : 0));
const RELIC_IDS = Object.keys(RELICS).sort((a, b) => (RELICS[a].curse ? 1 : 0) - (RELICS[b].curse ? 1 : 0));
const KIND_ORDER = { unit: 0, attack: 1, tactic: 2, support: 3, hero: 4, lead: 5 };
const CARD_IDS = Object.keys(CARDS).filter(id => CARDS[id].kind !== 'curse').sort((a, b) => KIND_ORDER[CARDS[a].kind] - KIND_ORDER[CARDS[b].kind]);
// 그리드: 열 수, 칸 간격, 칸 크기
const TABS = [
  { id: 'foe', name: '요괴', list: FOES, cols: 9, px: 82, py: 140, w: 77, h: 130 },
  { id: 'relic', name: '보물', list: RELIC_IDS, cols: 10, px: 75, py: 86, w: 68, h: 80 },
  { id: 'card', name: '패', list: CARD_IDS, cols: 11, px: 68, py: 90, w: 60, h: 78 },
];
// 요괴 초상의 크기 보정: 거대한 것과 두목은 작게
const FK = id => UNITS[id].boss ? 0.42 : UNITS[id].large ? 0.62 : 0.82;
const seen = (tab, id) => !!(meta.codex && meta.codex[tab] && meta.codex[tab][id]);
const dark = g => { g.filter = 'brightness(0) opacity(0.5)'; };

export class CodexScene {
  constructor(a) { this.t = 0; this.tab = (a && a.tab) || 0; this.sel = 0; }
  frame(g, dt) {
    bgm('rest'); this.t += dt; dimBackdrop(g, 0.84);
    const T = TABS[this.tab], got = T.list.filter(id => seen(T.id, id)).length, all = TABS.reduce((a, q) => a + q.list.length, 0), gotAll = TABS.reduce((a, q) => a + q.list.filter(id => seen(q.id, id)).length, 0);
    brushTitle(g, 210, 48, 300, 66, '도감', '#6a3a2a', 40);
    goldText(g, `모은 것 ${gotAll} / ${all}`, 390, 44, { size: 30, align: 'left', glow: false });
    text(g, '요괴는 처음 물리칠 때, 보물과 패는 처음 얻을 때 적힙니다', 390, 78, { size: 15.5, fill: '#d9ccae', weight: 400, align: 'left', maxW: 400 });
    TABS.forEach((q, n) => { const n2 = q.list.filter(id => seen(q.id, id)).length; if (button(g, 'tab' + n, 806 + n * 150, 22, 140, 62, `${q.name} ${n2}/${q.list.length}`, { style: n === this.tab ? 'red' : 'wood', size: 19 }) && n !== this.tab) { this.tab = n; this.sel = 0; sfx('card'); } });
    // 왼쪽: 그리드
    panel(g, 26, 100, 780, 590);
    // 칸이 넘치면 쪽을 넘긴다 (패가 많다)
    const per = T.cols * (Math.floor((554 - T.h) / T.py) + 1), pages = Math.ceil(T.list.length / per), pg = Math.min(pages - 1, Math.floor(this.sel / per));   // 고른 칸이 든 쪽
    if (pages > 1) { for (const [dir, x] of [[-1, 340], [1, 470]]) { const off = dir < 0 ? pg <= 0 : pg >= pages - 1; if (button(g, 'cpg' + dir, x, 650, 46, 34, dir < 0 ? '◀' : '▶', { style: 'paper', size: 16, disabled: off }) && !off) { this.sel = (pg + dir) * per; sfx('card'); } } text(g, `${pg + 1} / ${pages}`, 431, 667, { size: 17, font: FONT_B, fill: '#5a4a3a' }); }
    T.list.slice(pg * per, pg * per + per).forEach((id, k) => {
      const n = pg * per + k, x = 44 + (k % T.cols) * T.px, y = 118 + Math.floor(k / T.cols) * T.py, on = this.sel === n, ok = seen(T.id, id);
      if (tapped('cx' + n, x, y, T.w, T.h)) { this.sel = n; sfx('card'); }
      if (T.id === 'card') { if (ok) cardFace(g, { id }, x, y, T.w, T.h); else cardBack(g, x, y, T.w, T.h); }
      else {
        rr(g, x + 1, y + 3, T.w, T.h, 7, 'rgba(0,0,0,0.3)'); rr(g, x, y, T.w, T.h, 7, ok ? '#f6ecd2' : '#d9d0bc', INK, 1.4);
        g.save(); g.beginPath(); g.rect(x + 2, y + 2, T.w - 4, T.h - 4); g.clip();
        if (T.id === 'foe') { const u = UNITS[id]; if (u.boss && ok) { g.fillStyle = 'rgba(138,42,38,0.18)'; g.fillRect(x, y, T.w, T.h); } if (!ok) dark(g); portrait(g, id, x + T.w / 2, y + T.h - 26, FK(id), 0); g.filter = 'none'; }
        else { const R = RELICS[id]; if (R.curse && ok) { g.fillStyle = 'rgba(90,40,90,0.16)'; g.fillRect(x, y, T.w, T.h); } if (!ok) dark(g); relicIcon(g, id, x + T.w / 2, y + T.h / 2 - (ok ? 6 : 0), 0.95); g.filter = 'none'; }
        g.restore();
        if (T.id === 'foe') text(g, ok ? UNITS[id].name : '· · ·', x + T.w / 2, y + T.h - 12, { size: 13, font: FONT_B, fill: ok ? INK : '#8a8274', maxW: T.w - 6 });
        else if (ok) text(g, RELICS[id].name, x + T.w / 2, y + T.h - 11, { size: 12.5, font: FONT_B, fill: INK, maxW: T.w - 4 });
      }
      if (on) { rr(g, x - 3, y - 3, T.w + 6, T.h + 6, 9, null, '#f3d27c', 3); shine(g, x, y, T.w, T.h, 7, 3.2, 0.2); }
    });
    // 오른쪽: 고른 것의 자세한 모습
    panel(g, 826, 100, 428, 494);
    const id = T.list[this.sel], ok = seen(T.id, id), cx = 1040;
    if (T.id === 'foe') {
      const u = UNITS[id]; rr(g, 850, 124, 380, 220, 8, '#efe2bf', INK, 1.6);
      g.save(); g.beginPath(); g.rect(852, 126, 376, 216); g.clip(); const sk = g.createLinearGradient(0, 126, 0, 342); sk.addColorStop(0, ok ? (u.boss ? '#6a2a2a' : '#3a4a6a') : '#3a3640'); sk.addColorStop(1, '#efe2bf'); g.fillStyle = sk; g.fillRect(852, 126, 376, 216);
      g.fillStyle = 'rgba(40,50,30,0.3)'; g.fillRect(852, 312, 376, 30); ell(g, cx, 326, 70, 9, 'rgba(20,14,8,0.35)'); if (!ok) dark(g); portrait(g, id, cx, 324, FK(id) * 2.1, this.t, ok); g.filter = 'none'; g.restore();
      if (ok) { goldText(g, u.name, cx, 376, { size: 32, glow: false }); text(g, `${u.boss ? '두목' : u.role}`, cx, 408, { size: 16, fill: '#8a2a26', font: FONT_B }); text(g, u.desc || '', cx, 436, { size: 17, fill: '#3a2a1a', maxW: 380 }); textBlock(g, u.tip || '', cx, 470, 380, 22, { size: 15.5, fill: '#4a4034', weight: 400 }); rr(g, 870, 540, 340, 34, 8, 'rgba(60,40,20,0.08)', 'rgba(60,40,20,0.25)', 1); text(g, `체력 ${Math.round(u.hp * 2.2)}  ·  ${u.heal ? '치유' : '공격'} ${Math.round(u.atk || u.heal || 0)}  ·  ${u.range > 0 ? '원거리' : '근접'}${u.n > 1 ? `  ·  무리 ${u.n}` : ''}`, cx, 557, { size: 15.5, fill: '#5a4030', maxW: 320 }); }
      else unknown(g, cx, '아직 물리치지 못한 요괴입니다');
    } else if (T.id === 'relic') {
      const R = RELICS[id]; ell(g, cx, 230, 92, 92, ok ? '#2a1a20' : '#3a3640', INK, 2); ell(g, cx, 230, 86, 86, null, foil(g, cx - 90, cx + 90), 2);
      if (ok) { g.save(); g.globalCompositeOperation = 'lighter'; const hg = g.createRadialGradient(cx, 230, 10, cx, 230, 90); hg.addColorStop(0, 'rgba(255,210,130,0.35)'); hg.addColorStop(1, 'rgba(255,210,130,0)'); g.fillStyle = hg; g.fillRect(cx - 92, 138, 184, 184); g.restore(); }
      if (!ok) dark(g); relicIcon(g, id, cx, 230, 2.2, Math.sin(this.t) * 0.05); g.filter = 'none';
      if (ok) { goldText(g, R.name, cx, 362, { size: 30, glow: false }); const ax = R.axis && AXES[R.axis]; text(g, R.curse ? '부정' : ax ? `빌드 축 · ${ax.name}` : R.req ? `${UNITS[R.req].name} 전용` : '보물', cx, 396, { size: 16, font: FONT_B, fill: R.curse ? '#6a3a7a' : ax ? ax.col : '#8a6a3a' }); textBlock(g, R.desc, cx, 436, 380, 24, { size: 17, fill: '#3a2a1a' }); }
      else unknown(g, cx, '아직 얻지 못한 보물입니다');
    } else {
      if (ok) { cardFace(g, { id }, cx - 111, 118, 222, 294); const d = CARDS[id]; text(g, d.kind === 'lead' ? '영웅 패' : d.kind === 'unit' ? (UNITS[d.unit].beast ? '영물 패' : '병력 패') : d.hero ? `${UNITS[d.hero].name} 영웅기${d.mastery ? ` · 숙련 ${d.mastery}` : ''}` : d.axis ? `전술 패 · ${AXES[d.axis].name}` : '전술 패', cx, 446, { size: 18, font: FONT_B, fill: '#5a4a3a' }); }
      else { cardBack(g, cx - 111, 118, 222, 294); unknown(g, cx, '아직 쥐어 보지 못한 패입니다', 448); }
    }
    if (button(g, 'back', 964, 606, 290, 84, '장부로', { style: 'paper', size: 32 })) nav.go('meta');
  }
}
function cardBack(g, x, y, w, h) {
  rr(g, x + 1, y + 3, w, h, Math.max(5, w * 0.06), 'rgba(0,0,0,0.3)'); rr(g, x, y, w, h, Math.max(5, w * 0.06), '#3a2228', INK, 1.6); rr(g, x + w * 0.08, y + w * 0.08, w * 0.84, h - w * 0.16, Math.max(3, w * 0.04), null, 'rgba(240,210,124,0.45)', 1);
  g.save(); g.translate(x + w / 2, y + h / 2); g.rotate(Math.PI / 4); const q = w * 0.18; rr(g, -q, -q, q * 2, q * 2, 2, null, 'rgba(240,210,124,0.5)', 1.2); g.restore();
  text(g, '?', x + w / 2, y + h / 2 + 1, { size: w * 0.24, font: FONT_B, fill: 'rgba(240,210,124,0.7)' });
}
function unknown(g, cx, s, y = 376) { goldText(g, '?  ?  ?', cx, y, { size: 30, glow: false }); text(g, s, cx, y + 44, { size: 17, fill: SUB }); }

// 공적 장부의 도감 단추에 적는 수
export const codexCount = () => ({ got: TABS.reduce((a, q) => a + q.list.filter(id => seen(q.id, id)).length, 0), all: TABS.reduce((a, q) => a + q.list.length, 0) });
