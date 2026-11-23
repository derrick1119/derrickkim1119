// 영웅 고르기 (가로): 위에는 영웅 일곱의 얼굴, 아래에는 고른 영웅의 고유기와 전용 패
import { W, H } from '../config.js';
import { TAU, INK, PAPER, RED, INDIGO, SUB, FONT_B, text, textBlock, ell, rr, poly } from '../render/draw.js';
import { button, panel, brushTitle, seal, C, tapped, foil, goldText, shine, ui } from '../ui/ui.js';
import { nav } from '../nav.js';
import { newRun, heroOpen, UNLOCKS, meta, HARD, save, parseSeed, seedCode } from '../state.js';
import { HERO_TRAIT2, MASTERY_XP, MASTERY_GIFT, masteryLv, VOWS, vowBonus } from '../data/progress.js';
import { UNITS, HEROES, HERO_SKILLS, HERO_COL, HERO_SEAL, HERO_TRAIT } from '../data/units.js';
import { MEOK } from '../render/ink.js';
import { inkGlyph } from '../render/symbols.js';
import { CARDS, starterDeck, isUnit } from '../data/cards.js';
import { dimBackdrop } from './title.js';
import { portrait } from '../render/sprites.js';
import { cardFace } from '../ui/cards.js';
import { sfx, bgm } from '../audio.js';

const vgrad2 = (g, y0, y1) => { const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, '#2a1810'); gr.addColorStop(1, '#140a06'); return gr; };
const ROLE = { commander: '선봉 · 근접', blade: '자객 · 근접', hunter: '저격 · 원거리', bishop: '치유 · 지원', archmage: '도술 · 광역', sangsoe: '풍물 · 지원', chief: '버팀 · 근접' };
export class HeroScene {
  constructor() { this.t = 0; this.sel = 0; }
  frame(g, dt) {
    bgm('title');
    this.t += dt; dimBackdrop(g); ui.top = this.vowOpen ? 1 : 0;   // 서약 판이 떠 있으면 아래 단추는 눌리지 않는다
    brushTitle(g, 640, 44, 430, 60, '영웅을 고르세요', INDIGO, 36);
    // 씨앗: 두루마리에 적힌 글자를 넣으면 그 원정과 같은 길을 걷는다
    text(g, this.seed != null ? '누르면 씨앗을 뺀다' : '같은 길 다시 걷기', 1086, 38, { size: 14, fill: '#cbb894', align: 'right' });
    if (button(g, 'seed', 1096, 16, 150, 44, this.seed != null ? `씨앗 ${seedCode(this.seed)} ✕` : '씨앗 넣기', { style: this.seed != null ? 'red' : 'wood', size: this.seed != null ? 14 : 18 })) {
      if (this.seed != null) this.seed = null; else { const s = typeof prompt === 'function' ? prompt('두루마리에 적힌 씨앗 글자를 넣으세요 (예: 222-2E3T)') : null, n = parseSeed(s); if (n != null) { this.seed = n; sfx('star'); } else if (s) sfx('deny'); } }
    // 영웅 일곱
    HEROES.forEach((id, i) => {
      const d = UNITS[id], x = 44 + i * 172, y = 74, w = 160, h = 158, on = this.sel === i, locked = !heroOpen(id);
      if (tapped('h' + i, x, y, w, h)) { this.sel = i; sfx('card'); }
      // 옻칠 액자: 금테 안에 영웅의 빛깔로 물든 하늘, 고른 영웅은 빛살과 함께 살짝 떠오른다
      const lift = on ? -4 : 0, yy = y + lift, col = HERO_COL[id];
      if (on) { g.save(); g.globalCompositeOperation = 'lighter'; const gl = g.createRadialGradient(x + w / 2, yy + 60, 10, x + w / 2, yy + 60, 120); gl.addColorStop(0, 'rgba(255,210,130,0.45)'); gl.addColorStop(1, 'rgba(255,210,130,0)'); g.fillStyle = gl; g.fillRect(x - 40, yy - 40, w + 80, h + 80); g.restore(); }
      rr(g, x + 2, yy + 6, w, h, 9, 'rgba(0,0,0,0.45)'); rr(g, x, yy, w, h, 9, foil(g, x, x + w), INK, 2.2);
      rr(g, x + 4, yy + 4, w - 8, h - 8, 7, '#1a1016', 'rgba(40,20,8,0.8)', 1);
      g.save(); g.beginPath(); g.rect(x + 6, yy + 6, w - 12, 100); g.clip();
      const sk = g.createLinearGradient(0, yy + 6, 0, yy + 106); sk.addColorStop(0, locked ? '#2a2630' : col); sk.addColorStop(1, locked ? '#4a4450' : '#f3e2b0'); g.globalAlpha = on ? 1 : 0.8; g.fillStyle = sk; g.fillRect(x + 6, yy + 6, w - 12, 100); g.globalAlpha = 1;
      if (on) { g.save(); g.globalAlpha = 0.25; g.translate(x + w / 2, yy + 106); for (let k = 0; k < 9; k++) { g.rotate(0.35); g.fillStyle = '#fff4d0'; g.fillRect(-2, -120, 4, 120); } g.restore(); }
      g.fillStyle = 'rgba(30,40,30,0.35)'; g.fillRect(x + 6, yy + 88, w - 12, 18);
      if (locked) { g.globalAlpha = 0.45; g.filter = 'grayscale(1) brightness(0.6)'; } portrait(g, id, x + w / 2 - 4, yy + 104, 0.86, this.t, on); g.filter = 'none'; g.globalAlpha = 1; g.restore();
      g.fillStyle = foil(g, x, x + w); g.fillRect(x + 6, yy + 104, w - 12, 2.4);
      g.fillStyle = vgrad2(g, yy + 106, yy + h - 4); g.fillRect(x + 6, yy + 106.4, w - 12, h - 112);
      if (on) goldText(g, d.name, x + w / 2, yy + 125, { size: 22, glow: false }); else text(g, d.name, x + w / 2, yy + 125, { size: 21, font: FONT_B, fill: locked ? '#8a8070' : '#f3e6c4' });
      text(g, locked ? `공적 ${UNLOCKS.find(u => u.id === id).cost}` : ROLE[id], x + w / 2, yy + 145, { size: 15, fill: locked ? '#e07a66' : '#cbb894' });
      if (locked) seal(g, x + w - 24, yy + 24, 26, '?', '#5a5346');
      const best = meta.heroBest && meta.heroBest[id]; if (best !== undefined && !locked) { rr(g, x + w - 62, yy + 10, 54, 22, 5, '#2f6f5c', INK, 1.2); text(g, best > 0 ? `험로 ${best}` : '평정', x + w - 35, yy + 21.5, { size: 13.5, fill: C.cream }); }
      // 숙련: 다섯 개의 매듭 (명장은 이름 둘레가 금빛)
      if (!locked) { const ml = masteryLv(meta.heroXp && meta.heroXp[id]); rr(g, x + 8, yy + 9, 70, 18, 9, 'rgba(16,10,12,0.72)', 'rgba(240,210,124,0.55)', 1); for (let k = 0; k < 5; k++) { const px = x + 19 + k * 12.5, py = yy + 18; g.save(); g.translate(px, py); g.rotate(Math.PI / 4); rr(g, -4.4, -4.4, 8.8, 8.8, 1.4, k < ml ? '#f6cf5a' : 'rgba(70,60,50,0.9)', k < ml ? '#2a1606' : 'rgba(240,217,154,0.45)', 1.3); g.restore(); } if (ml >= 5) rr(g, x + 1, yy + 1, w - 2, h - 2, 8, null, 'rgba(255,214,120,0.85)', 1.6); }
      if (on) { rr(g, x - 3, yy - 3, w + 6, h + 6, 11, null, '#f3d27c', 3); shine(g, x, yy, w, h, 9, 3.6, 0.25); }
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
    // 숙련 2부터 두 번째 병법을 고를 수 있다: 병법 상자 머리의 두 이름표를 눌러 바꾼다
    const xp = (meta.heroXp && meta.heroXp[id]) || 0, ml = masteryLv(xp), canAlt = !locked && ml >= 2, alt = canAlt && !!(meta.alt && meta.alt[id]), tr = alt ? HERO_TRAIT2[id] : HERO_TRAIT[id];
    rr(g, 270, 376, 448, 62, 6, '#fbf1cf', col, 1.8); rr(g, 270, 376, 7, 62, 3, col);
    text(g, `병법 · ${tr.name}`, 288, 392, { size: 18, font: FONT_B, align: 'left', fill: col });
    if (canAlt) [HERO_TRAIT[id], HERO_TRAIT2[id]].forEach((q, n) => { const bx = 508 + n * 102, on2 = (n === 1) === alt; rr(g, bx, 380, 98, 24, 12, on2 ? col : 'rgba(60,40,20,0.08)', on2 ? INK : 'rgba(60,40,20,0.35)', 1.2); text(g, (on2 ? '✓ ' : '') + q.name, bx + 49, 392.5, { size: 13, font: FONT_B, fill: on2 ? C.cream : '#5a4a3a', maxW: 92 }); if (!on2 && tapped('alt' + n, bx, 380, 98, 24)) { if (!meta.alt) meta.alt = {}; meta.alt[id] = n === 1; save(); sfx('card'); } });
    else text(g, ml >= 2 || locked ? tr.play : '숙련 2에 두 번째 병법', 706, 392, { size: 14.5, align: 'right', fill: '#5a4a3a', weight: 400, maxW: 250 });
    textBlock(g, tr.desc, 288, 412, 424, 17.5, { size: 14.5, align: 'left', weight: 400 });
    // 숙련 띠: 초상 아래, 다음 숙련까지의 매듭과 그때 받는 것
    if (!locked) { const nx = MASTERY_XP[ml], px0 = MASTERY_XP[ml - 1], k = ml >= 5 ? 1 : (xp - px0) / (nx - px0);
      rr(g, 64, 516, 178, 40, 8, '#2a1418', INK, 1.6); rr(g, 67, 519, 172, 34, 6, null, foil(g, 64, 242), 1.1);
      text(g, `숙련 ${ml}${ml >= 5 ? ' · 명장' : ''}`, 78, 530, { size: 15, font: FONT_B, align: 'left', fill: ml >= 5 ? '#f6d27a' : C.cream });
      rr(g, 150, 525, 82, 9, 4, 'rgba(0,0,0,0.5)'); if (k > 0) rr(g, 150, 525, 82 * Math.min(1, k), 9, 4, '#e0b050');
      text(g, ml >= 5 ? '모든 숙련을 마쳤다' : `다음 · ${MASTERY_GIFT[ml + 1]}`, 153, 545, { size: 11.5, fill: '#d9c9a0', maxW: 168 }); }
    text(g, '자동 고유기', 274, 453, { size: 14.5, align: 'left', fill: col });
    HERO_SKILLS[id].forEach((sk, n) => {
      const yy = 464 + n * 33; rr(g, 270, yy, 448, 29, 5, '#fbf3df', 'rgba(38,42,54,0.5)', 1.1);
      ell(g, 286, yy + 14.5, 9, 9, col, INK, 1.1); text(g, String(n + 1), 286, yy + 15.5, { size: 12, font: FONT_B, fill: C.cream });
      text(g, sk.name, 302, yy + 15.5, { size: 16.5, font: FONT_B, align: 'left' }); text(g, sk.desc, 404, yy + 15.5, { size: 14.5, align: 'left', fill: '#4a4034', weight: 400, maxW: 308 });
    });
    // 영웅 패 여덟 장: 두 장씩 넘겨 본다 (양옆 놋쇠 단추, 아래 네 점). 숙련이 모자란 패는 흐리게 '숙련 N에 열림'
    if (this.cpgHero !== id) { this.cpgHero = id; this.cpg = 0; }
    const pages = Math.ceil(cards.length / 2), pg = Math.min(this.cpg || 0, pages - 1);
    cards.slice(pg * 2, pg * 2 + 2).forEach((k, n) => { const cx = 764 + n * 230, need = CARDS[k].mastery || 0, shut = need > ml || (locked && need);
      cardFace(g, { id: k }, cx, 260, 222, 294, { dim: shut });
      if (need && shut) { const ry = 396; rr(g, cx + 10, ry, 202, 30, 6, 'rgba(42,20,24,0.92)', INK, 1.4); rr(g, cx + 13, ry + 3, 196, 24, 4, null, foil(g, cx, cx + 222), 1); text(g, `숙련 ${need}에 열림`, cx + 111, ry + 15.5, { size: 15.5, font: FONT_B, fill: '#f0d99a' }); }
      else if (need) { rr(g, cx + 150, 312, 62, 22, 11, '#2f6f5c', INK, 1.2); text(g, `숙련 ${need}`, cx + 181, 323.5, { size: 13, font: FONT_B, fill: C.cream }); } });
    if (pages > 1) {
      for (const [dir, x] of [[-1, 742], [1, 1220]]) { const off = dir < 0 ? pg <= 0 : pg >= pages - 1; g.save(); if (off) g.globalAlpha = 0.35;
        const bx = dir < 0 ? 752 : 1214, by = 399; ell(g, bx + 1, by + 3, 17, 17, 'rgba(0,0,0,0.3)'); ell(g, bx, by, 17, 17, foil(g, bx - 17, bx + 17), INK, 1.6); ell(g, bx, by, 13, 13, '#2a1418'); poly(g, dir < 0 ? [bx + 3, by - 7, bx - 5, by, bx + 3, by + 7] : [bx - 3, by - 7, bx + 5, by, bx - 3, by + 7], '#f0d264', INK, 0.8); g.restore();
        if (!off && tapped('cpg' + dir, bx - 22, by - 22, 44, 44)) { this.cpg = pg + dir; sfx('card'); } }
      for (let q = 0; q < pages; q++) { const px = 985 + (q - (pages - 1) / 2) * 24, on = q === pg; g.save(); g.translate(px, 556); g.rotate(Math.PI / 4); rr(g, -5, -5, 10, 10, 1.6, on ? '#f0c85a' : 'rgba(60,40,20,0.25)', on ? '#5a3a10' : 'rgba(60,40,20,0.45)', 1); g.restore(); if (tapped('cpd' + q, px - 9, 553, 18, 18)) { this.cpg = q; sfx('card'); } }
    }
    if (locked) { const cost = UNLOCKS.find(u => u.id === id).cost; rr(g, 60, 262, 184, 30, 6, '#8a2a26', INK, 1.6); text(g, `잠김 · 공적 ${cost}`, 152, 278, { size: 16, fill: C.cream }); if (button(g, 'meta', 840, 588, 400, 96, `공적 장부에서 열기 · ${cost}`, { style: 'paper', size: 28 })) nav.go('meta'); }
    else if (button(g, 'go', 840, 588, 400, 96, meta.hard ? `출정 · 험로 ${meta.hard}` : '출  정', { size: meta.hard ? 38 : 52, style: 'red' })) nav.go('prologue', { hero: id, seed: this.seed });
    if (button(g, 'back', 40, 598, 200, 76, '뒤로', { style: 'paper', size: 30 })) nav.go('title');
    // 험로를 한 번이라도 열었으면 여기서 바로 고른다 (평정할 때마다 한 단계씩 열린다). 아직이면 길잡이 글
    if (meta.hardMax > 0) {
      // 평정을 한 번 하면 오른쪽에 서약 단추가 선다 (험로 판은 그만큼 좁아진다)
      const lv = Math.min(meta.hard || 0, meta.hardMax), hd = HARD[lv], vw = meta.clears > 0, pw = vw ? 430 : 556, cx = 262 + pw / 2;
      rr(g, 262, 600, pw, 78, 9, '#d9cdb0', INK, 2); rr(g, 262, 596, pw, 78, 9, '#fbf3df', INK, 2); rr(g, 262, 596, 8, 78, 4, lv ? RED : '#3f6b5c');
      if (button(g, 'h-', 280, 608, 50, 52, '◀', { style: 'paper', size: 22, disabled: lv <= 0 })) { meta.hard = Math.max(0, lv - 1); save(); sfx('card'); }
      if (button(g, 'h+', 262 + pw - 68, 608, 50, 52, '▶', { style: 'paper', size: 22, disabled: lv >= meta.hardMax })) { meta.hard = Math.min(meta.hardMax, lv + 1); save(); sfx('card'); }
      if (vw) { const sel = Object.keys(meta.vowSel || {}).filter(k => meta.vowSel[k] && VOWS[k]), b = vowBonus(sel); if (button(g, 'vow', 704, 596, 124, 78, b ? `서약 +${b}%` : '서약', { style: 'wood', size: b ? 19 : 22 })) { this.vowOpen = true; sfx('card'); } if (sel.length) { ell(g, 820, 600, 13, 13, '#b8322a', INK, 1.4); text(g, String(sel.length), 820, 601, { size: 14, font: FONT_B, fill: C.cream }); } }
      text(g, lv ? `험로 ${lv}단계 · ${hd.name}` : '평탄한 길', cx, 620, { size: 23, font: FONT_B, fill: lv ? RED : INK, maxW: pw - 160 });
      text(g, lv ? `${hd.desc}${lv > 1 && !vw ? ' (이전 단계 규칙 포함)' : ''} · 공적 +${lv * 20}%` : `험로 규칙 없이 떠납니다 · 열린 길 ${meta.hardMax}단계`, cx, 652, { size: 14.5, fill: SUB, weight: 400, maxW: pw - 150 });
    } else {
      text(g, '전술 패는 쓰면 사라집니다. 길에서 다시 채우세요.', 540, 626, { size: 16, fill: '#d9ccae', weight: 400, maxW: 560 });
      text(g, '영웅마다 병법이 다릅니다.', 540, 650, { size: 16, fill: '#d9ccae', weight: 400, maxW: 560 });
    }
    if (this.vowOpen) { ui.layer = 1; this.drawVows(g); ui.layer = 0; }
  }
  // 서약: 스스로 지는 짐. 고른 만큼 공적을 더 받는다 (오늘의 원정에는 걸리지 않는다)
  drawVows(g) {
    const sel = meta.vowSel || (meta.vowSel = {}), keys = Object.keys(VOWS);
    g.fillStyle = 'rgba(8,6,14,0.82)'; g.fillRect(0, 0, W, H);
    panel(g, 200, 70, 880, 580); goldText(g, '서약', 640, 116, { size: 40 });
    text(g, '스스로 짐을 지고 떠나면 공적을 더 받습니다. 여러 개를 함께 걸 수 있습니다.', 640, 154, { size: 16, fill: SUB, weight: 400 });
    keys.forEach((k, n) => {
      const V = VOWS[k], x = 236 + (n % 2) * 410, y = 182 + Math.floor(n / 2) * 92, on = !!sel[k];
      if (tapped('vw' + k, x, y, 396, 80)) { sel[k] = !on; save(); sfx(on ? 'card' : 'star'); }
      rr(g, x + 2, y + 4, 396, 80, 9, 'rgba(0,0,0,0.3)'); rr(g, x, y, 396, 80, 9, on ? '#f6dccf' : '#fbf3df', on ? '#8a2a26' : INK, on ? 2.6 : 1.6); rr(g, x, y, 8, 80, 4, on ? '#8a2a26' : '#b8a888');
      ell(g, x + 34, y + 40, 15, 15, on ? '#8a2a26' : '#efe4c9', INK, 1.6); if (on) text(g, '✓', x + 34, y + 41, { size: 18, font: FONT_B, fill: C.cream });
      text(g, V.name, x + 60, y + 28, { size: 21, font: FONT_B, align: 'left', fill: on ? '#8a2a26' : INK }); text(g, V.desc, x + 60, y + 56, { size: 15, align: 'left', fill: '#4a4034', weight: 400, maxW: 250 });
      text(g, `+${V.bonus}%`, x + 380, y + 28, { size: 20, font: FONT_B, align: 'right', fill: '#8a5a10' });
    });
    const b = vowBonus(keys.filter(k => sel[k]));
    text(g, b ? `서약으로 공적 +${b}%` : '서약 없이 떠납니다', 640, 610, { size: 22, font: FONT_B, fill: b ? '#8a2a26' : SUB });
    if (button(g, 'vwclear', 236, 584, 170, 54, '모두 풀기', { style: 'paper', size: 20, disabled: !b })) { meta.vowSel = {}; save(); }
    if (button(g, 'vwok', 846, 580, 200, 60, '이대로 걸기', { style: 'red', size: 28 })) { this.vowOpen = false; sfx('card'); }
  }
}
