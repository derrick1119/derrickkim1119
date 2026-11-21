// 영웅 고르기 (가로): 위에는 영웅 일곱의 얼굴, 아래에는 고른 영웅의 고유기와 전용 패
import { W, H } from '../config.js';
import { TAU, INK, PAPER, RED, INDIGO, SUB, FONT_B, text, textBlock, ell, rr } from '../render/draw.js';
import { button, panel, brushTitle, seal, C, tapped } from '../ui/ui.js';
import { nav } from '../nav.js';
import { newRun, heroOpen, UNLOCKS, meta, HARD, save } from '../state.js';
import { UNITS, HEROES, HERO_SKILLS, HERO_COL, HERO_SEAL, HERO_TRAIT } from '../data/units.js';
import { MEOK } from '../render/ink.js';
import { inkGlyph } from '../render/symbols.js';
import { CARDS, starterDeck, isUnit } from '../data/cards.js';
import { dimBackdrop } from './title.js';
import { portrait } from '../render/sprites.js';
import { cardFace } from '../ui/cards.js';
import { sfx } from '../audio.js';
import { ART } from '../render/art.js';

const ROLE = { commander: '선봉 · 근접', blade: '자객 · 근접', hunter: '저격 · 원거리', bishop: '치유 · 지원', archmage: '도술 · 광역', sangsoe: '풍물 · 지원', chief: '버팀 · 근접' };
export class HeroScene {
  constructor() { this.t = 0; this.sel = 0; }
  frame(g, dt) {
    this.t += dt; dimBackdrop(g);
    brushTitle(g, 640, 44, 430, 60, '영웅을 고르세요', INDIGO, 36);
    // 영웅 일곱
    HEROES.forEach((id, i) => {
      const d = UNITS[id], x = 44 + i * 172, y = 84, w = 160, h = 150, on = this.sel === i, locked = !heroOpen(id);
      if (tapped('h' + i, x, y, w, h)) { this.sel = i; sfx('card'); }
      rr(g, x + 2, y + 4, w, h, 7, 'rgba(40,28,16,0.26)'); rr(g, x, y, w, h, 7, on ? '#fdf5d6' : PAPER, INK, 2.2);
      g.save(); g.beginPath(); g.rect(x + 4, y + 4, w - 8, 100); g.clip(); g.fillStyle = on ? '#f3e2b0' : '#ece0c2'; g.fillRect(x + 4, y + 4, w - 8, 100); g.fillStyle = 'rgba(140,160,120,0.55)'; g.fillRect(x + 4, y + 82, w - 8, 24);
      if (locked) g.globalAlpha = 0.5; portrait(g, id, x + w / 2 - 4, y + 100, 0.86, this.t, on); g.restore();
      g.fillStyle = INK; g.fillRect(x + 4, y + 104, w - 8, 1.6); g.fillStyle = HERO_COL[id]; g.fillRect(x + 4, y + 105.6, w - 8, 3);
      text(g, d.name, x + w / 2, y + 123, { size: 21, font: FONT_B, fill: locked ? SUB : INK }); text(g, locked ? `공적 ${UNLOCKS.find(u => u.id === id).cost}` : ROLE[id], x + w / 2, y + 141, { size: 14.5, fill: locked ? RED : '#5a4a3a' });
      const best = meta.heroBest && meta.heroBest[id]; if (best !== undefined && !locked) { rr(g, x + w - 62, y + 8, 54, 22, 5, '#2f6f5c', INK, 1.2); text(g, best > 0 ? `험로 ${best}` : '평정', x + w - 35, y + 19.5, { size: 13.5, fill: C.cream }); }
      if (on) rr(g, x - 3, y - 3, w + 6, h + 6, 9, null, RED, 4);
    });
    // 고른 영웅
    const id = HEROES[this.sel], d = UNITS[id], locked = !heroOpen(id), cards = Object.keys(CARDS).filter(k => CARDS[k].hero === id), col = HERO_COL[id];
    panel(g, 40, 248, 1200, 322);
    ell(g, 152, 408, 94, 94, '#efd9a8', INK, 2.4); ell(g, 152, 408, 87, 87, null, 'rgba(201,150,46,0.8)', 1.2);
    g.save(); g.beginPath(); g.arc(152, 408, 92, 0, TAU); g.clip(); g.fillStyle = 'rgba(140,160,120,0.6)'; g.fillRect(50, 452, 210, 60); portrait(g, id, 148, 484, 1.75, this.t, true); g.restore();
    // 이름 옆에 붓으로 그린 영웅의 낙관 그림을 옅게 깐다
    inkGlyph(g, HERO_SEAL[id], 648, 306, 104, { col: MEOK, alpha: 0.13, halo: false, rot: -0.06 });
    text(g, d.name, 272, 298, { size: 46, font: FONT_B, align: 'left' }); g.save(); g.translate(272 + g.measureText(d.name).width + 34, 292); g.rotate(-0.06); seal(g, 0, 0, 34, HERO_SEAL[id], col); g.restore();
    text(g, d.desc, 274, 336, { size: 19, align: 'left', fill: SUB, maxW: 440 });
    const sd = starterDeck(id), nu = sd.filter(c => CARDS[c.id].kind === 'unit').length, nt = sd.filter(c => !isUnit(c)).length;
    text(g, `체력 ${Math.round(d.hp * 2.2)}  ·  ${ROLE[id]}  ·  시작: 병력 ${nu} · 전술 패 ${nt}`, 274, 361, { size: 15.5, align: 'left', fill: '#4a4034', weight: 400, maxW: 444 });
    // 병법: 이 영웅이 이끌면 패를 얻고 쓰는 방식이 달라진다
    const tr = HERO_TRAIT[id]; rr(g, 270, 376, 448, 62, 6, '#fbf1cf', col, 1.8); rr(g, 270, 376, 7, 62, 3, col);
    text(g, `병법 · ${tr.name}`, 288, 392, { size: 18, font: FONT_B, align: 'left', fill: col }); text(g, tr.play, 706, 392, { size: 14.5, align: 'right', fill: '#5a4a3a', weight: 400, maxW: 250 });
    textBlock(g, tr.desc, 288, 412, 424, 17.5, { size: 14.5, align: 'left', weight: 400 });
    text(g, '자동 고유기', 274, 453, { size: 14.5, align: 'left', fill: col });
    HERO_SKILLS[id].forEach((sk, n) => {
      const yy = 464 + n * 33; rr(g, 270, yy, 448, 29, 5, '#fbf3df', 'rgba(38,42,54,0.5)', 1.1);
      ell(g, 286, yy + 14.5, 9, 9, col, INK, 1.1); text(g, String(n + 1), 286, yy + 15.5, { size: 12, font: FONT_B, fill: C.cream });
      text(g, sk.name, 302, yy + 15.5, { size: 16.5, font: FONT_B, align: 'left' }); text(g, sk.desc, 404, yy + 15.5, { size: 14.5, align: 'left', fill: '#4a4034', weight: 400, maxW: 308 });
    });
    cards.forEach((k, n) => cardFace(g, { id: k }, 748 + n * 242, 262, 222, 294));
    if (locked) { const cost = UNLOCKS.find(u => u.id === id).cost; rr(g, 60, 262, 184, 30, 6, '#8a2a26', INK, 1.6); text(g, `잠김 · 공적 ${cost}`, 152, 278, { size: 16, fill: C.cream }); if (button(g, 'meta', 840, 588, 400, 96, `공적 장부에서 열기 · ${cost}`, { style: 'paper', size: 28 })) nav.go('meta'); }
    else if (button(g, 'go', 840, 588, 400, 96, meta.hard ? `출정 · 험로 ${meta.hard}` : '출  정', { size: meta.hard ? 38 : 52 })) nav.go('prologue', { hero: id });
    if (button(g, 'back', 40, 598, 200, 76, '뒤로', { style: 'paper', size: 30 })) nav.go('title');
    // 험로를 한 번이라도 열었으면 여기서 바로 고른다 (평정할 때마다 한 단계씩 열린다). 아직이면 길잡이 글
    if (meta.hardMax > 0) {
      const lv = Math.min(meta.hard || 0, meta.hardMax), hd = HARD[lv];
      rr(g, 262, 600, 556, 78, 9, '#d9cdb0', INK, 2); rr(g, 262, 596, 556, 78, 9, '#fbf3df', INK, 2); rr(g, 262, 596, 8, 78, 4, lv ? RED : '#3f6b5c');
      if (button(g, 'h-', 282, 608, 54, 52, '◀', { style: 'paper', size: 22, disabled: lv <= 0 })) { meta.hard = Math.max(0, lv - 1); save(); sfx('card'); }
      if (button(g, 'h+', 752, 608, 54, 52, '▶', { style: 'paper', size: 22, disabled: lv >= meta.hardMax })) { meta.hard = Math.min(meta.hardMax, lv + 1); save(); sfx('card'); }
      text(g, lv ? `험로 ${lv}단계 · ${hd.name}` : '평탄한 길', 544, 620, { size: 23, font: FONT_B, fill: lv ? RED : INK, maxW: 390 });
      text(g, lv ? `${hd.desc}${lv > 1 ? ' (아래 단계 규칙도 모두)' : ''} · 공적 +${lv * 20}%` : `험로 규칙 없이 떠납니다 · 열린 길 ${meta.hardMax}단계`, 544, 652, { size: 14.5, fill: SUB, weight: 400, maxW: 396 });
    } else {
      text(g, '전술 패는 한 번 쓰면 사라집니다. 전장의 노획, 전리품, 장터, 주막에서 다시 채우세요.', 540, 626, { size: 15.5, fill: ART.illust ? '#d8d0f0' : SUB, weight: 400, maxW: 560 });
      text(g, '이끄는 영웅의 병법에 따라 패를 얻고 쓰는 방식이 달라집니다.', 540, 650, { size: 15.5, fill: ART.illust ? '#d8d0f0' : SUB, weight: 400, maxW: 560 });
    }
  }
}
