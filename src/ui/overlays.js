// 행군 도중 전장 위에 뜨는 화면들: 전리품, 장터, 사건·주막, 갈림길 (장면을 바꾸지 않고 그 자리에서 고른다)
import { W, H } from '../config.js';
import { TAU, INK, PAPER, RED, INDIGO, NAVY, TEAL, OCHRE, SUB, FONT_B, text, textBlock, ell, rr, rrPath, clamp, easeOutBack } from '../render/draw.js';
import { ui, tapped, isDown, button, panel, brushTitle, seal, stamp, icon, C } from './ui.js';
import { cardFace, DeckView } from './cards.js';
import { G, save, STOP, forkDesc, openReward, rollRewards, describeReward, applyReward, buyItem, upgradeCard, removeCard, canUp, act } from '../state.js';
import { CARDS, KIND, cardName, isUnit } from '../data/cards.js';
import { RELICS } from '../data/relics.js';
import { WEAPONS } from '../data/weapons.js';
import { UNITS } from '../data/units.js';
import { portrait, weaponIcon, getLook } from '../render/sprites.js';
import { cardIcon, relicIcon, miscIcon } from '../render/icons.js';
import { sfx } from '../audio.js';

const COL = { blue: INDIGO, green: TEAL, purple: '#5a4a8a', gold: '#b8742a', red: '#7a1f1c' };
// 몇 장 묶음인지 알리는 딱지
const packTag = (g, x, y, n, s = 1) => { if (!(n > 1)) return; rr(g, x - 25 * s, y - 14 * s, 50 * s, 28 * s, 7 * s, RED, INK, 1.8); text(g, '×' + n, x, y + 1, { size: 20 * s, font: FONT_B, fill: C.cream }); };
// 보급 꾸러미: 든 패의 그림을 부채처럼 펼친다
const supplyArt = (g, ids, x, y, s) => ids.forEach((id, k) => { const sx = k % 2 ? 1 : -1, sy = k > 1 ? 1 : -1; cardIcon(g, id, x + sx * 23 * s, y + sy * 26 * s, 0.7 * s, sx * 0.07); });
const dim = (g, a = 0.55) => { g.fillStyle = `rgba(31,42,68,${a})`; g.fillRect(0, 0, W, H); };
// 겹침 화면의 뼈대: 그 위에 덱 살피기 같은 화면(sub)이 한 겹 더 뜰 수 있다
class Overlay {
  constructor() { this.t = 0; this.sub = null; }
  frame(g, dt) { this.t += dt; const L = ui.layer; ui.layer = L + 1; try { this.draw(g, dt); if (this.sub) this.sub.frame(g, dt); } finally { ui.layer = L; } }
  deck(o) { this.sub = new DeckView(Object.assign({ onClose: () => { this.sub = null; } }, o)); }
}
// 패가 아닌 선택지(보물·무기·조련 …)를 패와 같은 크기의 종이 한 장으로
function tile(g, d, x, y, w, h, t) {
  const col = COL[d.col] || INDIGO;
  rr(g, x + 2, y + 4, w, h, 8, 'rgba(50,36,20,0.28)'); rr(g, x, y, w, h, 8, PAPER, INK, 2.4);
  g.save(); g.beginPath(); rrPath(g, x + 1.5, y + 1.5, w - 3, h - 3, 7); g.clip(); g.fillStyle = col; g.fillRect(x, y, w, 46); g.fillStyle = INK; g.fillRect(x, y + 46, w, 2); g.globalAlpha = 0.14; ell(g, x + w / 2, y + 112, 80, 58, col); g.restore();
  text(g, d.title, x + w / 2, y + 24, { size: 26, font: FONT_B, fill: C.cream });
  const cx = x + w / 2, cy = y + 112;
  if (d.misc === 'supply') supplyArt(g, d.ids, cx, cy, 1.45); else if (d.relic) relicIcon(g, d.relic, cx, cy, 1.9, Math.sin(t * 2 + x) * 0.04); else if (d.weapon) weaponIcon(g, d.weapon, cx, cy, 1.35); else if (d.misc === 'burn') miscIcon(g, 'burn', cx, cy, 1.8); else if (d.misc === 'train') { portrait(g, 'sword', cx, cy + 44, 1.35, t, true); ell(g, cx + 50, cy - 30, 17, 17, PAPER, INK, 2); text(g, '↑', cx + 50, cy - 29, { size: 26, font: FONT_B, fill: TEAL }); } else { icon.people(g, cx - 22, cy + 4, 2.6); icon.people(g, cx + 22, cy + 4, 2.6, RED); text(g, '+1', cx, cy - 34, { size: 28, font: FONT_B, fill: TEAL }); }
  text(g, d.name, cx, y + 196, { size: 23, font: FONT_B, maxW: w - 20 });
  textBlock(g, d.desc, cx, y + 228, w - 26, 22, { size: 15.5, fill: SUB, weight: 400 });
}

// ───────── 전리품: 셋 중 하나 ─────────
export class RewardOverlay extends Overlay {
  constructor(o) { super(); this.kind = o.kind; this.onDone = o.onDone; this.p = openReward(o.kind); this.taken = -1; this.doneT = 0; }
  finish() { if (this.left) return; this.left = true; this.onDone(); }
  draw(g, dt) {
    const r = G.run, p = this.p, t = this.t, done = this.taken !== -1;
    dim(g, 0.6);
    brushTitle(g, 640, 34, 420, 62, { battle: '전리품', elite: '강적의 전리품', boss: '두목의 전리품', treasure: '보물 상자' }[this.kind] || '전리품', this.kind === 'treasure' ? '#b8862a' : INDIGO, 36);
    text(g, done ? '챙겼습니다' : '하나를 고르세요', 640, 94, { size: 20, fill: C.cream });
    panel(g, 1070, 26, 180, 40, 'tag'); icon.coin(g, 1094, 46, 12); text(g, `엽전 ${r.gold}`, 1170, 47, { size: 20, maxW: 130 });
    p.opts.forEach((o, n) => {
      const d = describeReward(o), w = 224, h = 316, x = 264 + n * 264, k = easeOutBack(clamp((t - n * 0.1) / 0.32, 0, 1)), y = 118 + (1 - k) * 50, mine = this.taken === n;
      g.save(); g.globalAlpha = clamp((t - n * 0.1) / 0.2, 0, 1) * (done && !mine ? 0.35 : 1);
      if (d.card) { cardFace(g, d.card, x, y, w, h); packTag(g, x + w - 30, y + 62, d.n); if (o.kind !== 'card') { rr(g, x + 36, y - 14, 152, 28, 14, COL[d.col], INK, 1.6); text(g, d.title, x + 112, y + 1, { size: 17, fill: C.cream }); } } else tile(g, d, x, y, w, h, t);
      g.restore();
      if (mine) stamp(g, x + w / 2, y + 250, 40, '得', RED, -0.14);
      else if (!done && t > 0.45 && button(g, 'rw' + n, x + 12, y + h + 12, w - 24, 54, '고르기', { size: 27 })) {
        this.taken = n; applyReward(o); r.pending = null; save(); sfx('card');
        if (o.kind === 'weapon') this.deck({ weapon: o.id, onClose: () => { this.sub = null; this.finish(); } });
      }
    });
    if (!done) {
      const rc = p.free > 0 ? 0 : 15 + p.rerolls * 10;
      if (button(g, 'reroll', 264, 520, 240, 54, rc ? `다시 뽑기 · 엽전 ${rc}` : '다시 뽑기 · 무료', { style: r.gold >= rc ? 'paper' : 'grey', size: 21 })) { if (r.gold >= rc) { r.gold -= rc; if (p.free > 0) p.free--; else p.rerolls++; p.opts = rollRewards(this.kind); this.t = 0; save(); sfx('card'); } else sfx('deny'); }
      if (button(g, 'rwdeck', 520, 520, 240, 54, `덱 살피기 · ${r.deck.length}장`, { style: 'paper', size: 21 })) this.deck({});
      if (this.kind !== 'treasure' && this.kind !== 'boss' && button(g, 'skip', 776, 520, 240, 54, '건너뛴다 · 엽전 +15', { style: 'paper', size: 21 })) { this.taken = -2; r.gold += 15; r.pending = null; save(); sfx('coin'); }
    } else if (!this.sub) { this.doneT += dt; if (this.doneT > 0.55) this.finish(); }
  }
}

// ───────── 장터 ─────────
export class ShopOverlay extends Overlay {
  constructor(o) { super(); this.items = o.items; this.onDone = o.onDone; this.msg = ''; this.msgT = 0; }
  draw(g, dt) {
    const r = G.run, t = this.t; if (this.msgT > 0) this.msgT -= dt;
    dim(g, 0.62);
    brushTitle(g, 640, 34, 300, 62, '장터', '#b8742a', 38);
    panel(g, 1070, 26, 180, 40, 'tag'); icon.coin(g, 1094, 46, 12); text(g, `엽전 ${r.gold}`, 1170, 47, { size: 20, maxW: 130 });
    this.items.forEach((it, n) => {
      const d = describeReward(it), card = it.kind === 'card', col = card ? KIND[CARDS[it.id].kind].col : COL[d.col] || INDIGO, w = 286, h = 232, x = 50 + (n % 4) * 298, y = 86 + Math.floor(n / 4) * 244, afford = r.gold >= it.price;
      g.save(); if (it.sold) g.globalAlpha = 0.45;
      rr(g, x + 3, y + 5, w, h, 6, 'rgba(50,36,20,0.24)'); rr(g, x, y, w, h, 6, PAPER, INK, 2.6);
      g.save(); g.beginPath(); rrPath(g, x + 2, y + 2, w - 4, 32, 5); g.clip(); g.fillStyle = col; g.fillRect(x, y, w, 34); g.restore(); text(g, d.title, x + w / 2, y + 19, { size: 20, font: FONT_B, fill: C.cream });
      if (card) { cardFace(g, it, x + 10, y + 42, 96, 124); packTag(g, x + 88, y + 152, d.n, 0.8); }
      else { rr(g, x + 10, y + 42, 96, 124, 5, '#efe4c9', INK, 1.4); const cx = x + 58, cy = y + 104; if (d.misc === 'supply') supplyArt(g, d.ids, cx, cy, 1); else if (d.relic) { relicIcon(g, d.relic, cx, cy, 1.5); if (it.kind === 'cleanse') stamp(g, cx + 26, cy + 38, 15, '淨', TEAL, -0.1); } else if (d.weapon) weaponIcon(g, d.weapon, cx, cy, 0.95); else if (d.misc === 'burn') miscIcon(g, 'burn', cx, cy, 1.5); else { g.save(); g.beginPath(); g.rect(x + 11, y + 43, 94, 122); g.clip(); portrait(g, 'spear', cx, cy + 50, 1.2, t, !it.sold); g.restore(); ell(g, cx + 30, cy - 40, 13, 13, PAPER, INK, 1.6); text(g, '↑', cx + 30, cy - 39, { size: 20, font: FONT_B, fill: TEAL }); } }
      text(g, d.name, x + 116, y + 58, { size: 19, font: FONT_B, align: 'left', maxW: w - 126 });
      textBlock(g, d.desc.split('\n').join(' · '), x + 116, y + 84, w - 128, 19.5, { size: 14, align: 'left', fill: SUB, weight: 400 });
      g.restore();
      if (it.sold) stamp(g, x + w - 52, y + h - 30, 22, '得', RED, -0.14);
      else if (button(g, 'buy' + n, x + 10, y + h - 54, w - 20, 44, `엽전 ${it.price}`, { style: afford ? 'indigo' : 'grey', size: 22 })) this.buy(it);
    });
    if (button(g, 'shdeck', 50, 590, 280, 62, `덱 살피기 · ${r.deck.length}장`, { style: 'paper', size: 24 })) this.deck({});
    if (!this.left && button(g, 'leave', 480, 584, 320, 72, '장터를 떠난다', { size: 30 })) { this.left = true; this.onDone(); }
    if (this.msgT > 0) { g.globalAlpha = Math.min(1, this.msgT * 3); rr(g, 830, 596, 400, 46, 9, PAPER, INK, 2.2); rr(g, 833.4, 599.4, 393.2, 39.2, 6, null, 'rgba(201,150,46,0.7)', 0.9); text(g, this.msg, 1030, 620, { size: 17, maxW: 380 }); g.globalAlpha = 1; }
  }
  say(s) { this.msg = s; this.msgT = 2.6; }
  buy(it) {
    const r = G.run; if (r.gold < it.price) { sfx('deny'); return; }
    if (it.kind === 'burn') this.deck({ mode: 'burn', onPick: uid => { const c = removeCard(uid); this.sub = null; if (!c) return; buyItem(it); this.say(`[${cardName(c)}] 을(를) 태웠습니다`); sfx('coin'); } });
    else if (it.kind === 'trainPick') this.deck({ mode: 'up', title: '조련장', filter: isUnit, onPick: uid => { const c = upgradeCard(uid); this.sub = null; if (!c) return; buyItem(it); this.say(`[${cardName(c)}] 조련 완료`); sfx('coin'); } });
    else if (buyItem(it)) { sfx('coin'); if (it.kind === 'weapon') this.deck({ weapon: it.id }); }
  }
}

// ───────── 사건·주막: 글과 선택지 ─────────
// choices: [{ label, desc, cost, pick() → [이야기, 결과…] } | { label, desc, deck:'up', filter, story }]
function resultIcon(s) {
  const m = /(보물|부정|무기|패 강화:|병력 패|패) \[([^\]]+?)\+?\]/.exec(s); if (!m) return null;
  const name = m[2], find = tbl => Object.keys(tbl).find(k => tbl[k].name === name);
  if (m[1] === '보물' || m[1] === '부정') { const id = find(RELICS); return id ? (g, x, y) => relicIcon(g, id, x, y, 0.74) : null; }
  if (m[1] === '무기') { const id = find(WEAPONS); return id ? (g, x, y) => weaponIcon(g, id, x, y, 0.56) : null; }
  if (m[1] === '병력 패') { const id = Object.keys(UNITS).find(k => UNITS[k].name === name); return id ? (g, x, y) => portrait(g, id, x, y + 20, 0.62) : null; }
  const id = Object.keys(CARDS).find(k => !isUnit({ id: k }) && CARDS[k].name === name); return id ? (g, x, y) => cardIcon(g, id, x, y, 0.74) : null;
}
export class ChoiceOverlay extends Overlay {
  constructor(o) { super(); Object.assign(this, { title: o.title, art: o.art, body: o.text, choices: o.choices, onDone: o.onDone, col: o.col || '#6a5a8a', tale: o.tale || null, result: null }); }
  draw(g) {
    const r = G.run, t = this.t;
    dim(g, 0.6);
    panel(g, 60, 70, 1160, 580);
    brushTitle(g, 330, 76, 360, 62, this.title, this.col, 34);
    ell(g, 330, 270, 112, 112, '#efe2c4', INK, 3); g.save(); g.beginPath(); g.arc(330, 270, 110, 0, TAU); g.clip(); g.fillStyle = '#a9b78f'; g.globalAlpha = 0.5; g.fillRect(210, 326, 240, 60); g.globalAlpha = 1; portrait(g, this.art, 330, 360, UNITS[this.art].hero || UNITS[this.art].boss ? 1.9 : 2.3, t, true); g.restore();
    textBlock(g, this.result ? this.result[0] : this.body, 330, 424, 480, 27, { size: 19, weight: 400 });
    // 주막에서 듣는 옛이야기 한 토막
    if (this.tale && !this.result) {
      const tl = this.tale.tale; rr(g, 84, 486, 492, 146, 7, '#fbf3df', 'rgba(38,42,54,0.5)', 1.3); rr(g, 84, 486, 6, 146, 3, this.col);
      text(g, `「${tl.title}」`, 104, 506, { size: 19, font: FONT_B, align: 'left' }); if (this.tale.fresh) { rr(g, 430, 494, 134, 24, 5, this.col); text(g, `이야기책 ${this.tale.n} / ${this.tale.of}`, 497, 507, { size: 13, fill: C.cream }); }
      textBlock(g, tl.s, 104, 532, 456, 21.5, { size: 15, align: 'left', weight: 400, fill: SUB });
    }
    panel(g, 1040, 84, 164, 38, 'tag'); icon.coin(g, 1062, 103, 11); text(g, `엽전 ${r.gold}`, 1132, 104, { size: 18, maxW: 110 });
    if (!this.result) {
      const n = this.choices.length, ch = Math.min(104, 440 / n), y0 = 140;
      this.choices.forEach((c, k) => {
        const y = y0 + k * (ch + 8), lack = c.cost && r.gold < c.cost;
        if (!lack && tapped('ch' + k, 620, y, 580, ch)) { sfx('card'); if (c.deck) this.deck({ mode: c.deck, filter: c.filter, title: c.label, onPick: uid => { const before = cardName(r.deck.find(q => q.uid === uid)), card = upgradeCard(uid); this.sub = null; if (!card) return; this.result = [c.story, `${isUnit(card) ? '조련' : '패 강화'}: [${before}] → [${cardName(card)}]`]; save(); } }); else { this.result = c.pick(); save(); } }
        const dn = !lack && isDown('ch' + k, 620, y, 580, ch), o = dn ? 3 : 0;
        g.save(); if (lack) g.globalAlpha = 0.5;
        rr(g, 620, y + 5, 580, ch, 12, '#d9cdb0', INK, 2.4); rr(g, 620, y + o, 580, ch, 12, c.hero ? '#fbf1cf' : PAPER, INK, 2.4);
        // 영웅이 있을 때만 열리는 갈래
        if (c.hero) { rr(g, 623.4, y + 3.4 + o, 573.2, ch - 6.8, 9, null, '#c9962e', 1.5); g.save(); g.beginPath(); g.rect(1120, y + 4 + o, 74, ch - 8); g.clip(); portrait(g, c.hero, 1158, y + ch + 14 + o, 1.25 * 1.43 / getLook(c.hero).scale); g.restore(); }
        text(g, c.label, 644, y + ch * 0.34 + o, { size: Math.min(27, ch * 0.3), font: FONT_B, align: 'left', maxW: c.hero ? 470 : 530 });
        text(g, lack ? `${c.desc}  (엽전 부족)` : c.desc, 646, y + ch * 0.7 + o, { size: Math.min(17, ch * 0.19), align: 'left', fill: lack ? RED : SUB, weight: 400, maxW: 530 });
        g.restore();
      });
    } else {
      this.result.slice(1).forEach((s, i) => { const bad = /-\d|부정 \[|잡념/.test(s) && !/씻겨|사라졌/.test(s), y = 190 + i * 66, ic = resultIcon(s); rr(g, 620, y - 26, 580, 54, 8, bad ? '#efd9cf' : '#dfe8d4', INK, 1.6); if (ic) { ic(g, 652, y); text(g, s, 930, y + 1, { size: 18, fill: bad ? RED : TEAL, maxW: 500 }); } else text(g, s, 910, y + 1, { size: 18, fill: bad ? RED : TEAL, maxW: 550 }); });
      if (this.result.length < 2) text(g, '별일 없이 지나갑니다', 910, 200, { size: 20, fill: SUB });
      if (!this.left && button(g, 'go', 740, 540, 340, 76, '길을 떠난다', { size: 34 })) { this.left = true; this.onDone(); }
    }
  }
}

// ───────── 이야기 한 장면: 두목의 사연, 영웅의 인연 (한 줄씩 눌러 넘긴다) ─────────
// lines: [[말하는 이(병종 id) 또는 null(해설), 글], …]
export class StoryOverlay extends Overlay {
  constructor(o) { super(); this.lines = o.lines; this.onDone = o.onDone; this.col = o.col || INDIGO; this.i = 0; this.pt = 0; }
  next() { if (this.left) return; if (this.i < this.lines.length - 1) { this.i++; this.pt = 0; sfx('card'); } else { this.left = true; this.onDone(); } }
  draw(g, dt) {
    const [who, s] = this.lines[this.i], k = clamp(this.pt / 0.22, 0, 1), t = this.t; this.pt += dt;
    dim(g, 0.6);
    if (!this.left && button(g, 'stskip', 1090, 596, 150, 50, '건너뛰기', { style: 'paper', size: 20 })) { this.left = true; this.onDone(); return; }
    const x = 170, y = 372, w = 940, h = 176;
    if (who) {
      const L = getLook(who), d = UNITS[who], ps = 2.2 * 1.1 / L.scale * (L.boss ? 1.7 : L.hero ? 1.3 : 1);
      panel(g, x, y, w, h);
      ell(g, x + 104, y + 62, 96, 96, '#efe2c4', INK, 3); ell(g, x + 104, y + 62, 89, 89, null, 'rgba(201,150,46,0.8)', 1.2);
      g.save(); g.beginPath(); g.arc(x + 104, y + 62, 94, 0, TAU); g.clip(); g.fillStyle = 'rgba(140,160,120,0.55)'; g.fillRect(x, y + 104, 220, 70); portrait(g, who, x + 100, y + 142, ps, t, true); g.restore();
      brushTitle(g, x + 330, y + 4, 180, 44, d.name, d.side ? '#7a1f1c' : this.col, 26);
      g.save(); g.globalAlpha = k; textBlock(g, s, x + 232, y + 74, 660, 34, { size: 24, align: 'left' }); g.restore();
    } else {
      panel(g, x, y, w, h);
      g.save(); g.globalAlpha = k; const n = s.split('\n').length; textBlock(g, s, 640, y + h / 2 - (n - 1) * 19 + 2, 860, 38, { size: 25, font: FONT_B }); g.restore();
    }
    for (let n = 0; n < this.lines.length; n++) ell(g, 640 + (n - (this.lines.length - 1) / 2) * 16, y + h + 20, 4, 4, n === this.i ? C.cream : 'rgba(251,247,236,0.35)');
    if (this.pt > 0.5) { g.globalAlpha = 0.55 + Math.sin(t * 5) * 0.3; text(g, '▼', x + w - 34, y + h - 26, { size: 18, fill: SUB }); g.globalAlpha = 1; }
    if (this.pt > 0.2 && tapped('story', 0, 0, W, H)) this.next();
  }
}

// ───────── 갈림길: 길가 푯말 둘 중 하나 ─────────
export class ForkOverlay extends Overlay {
  constructor(o) { super(); this.a = o.a; this.b = o.b; this.onPick = o.onPick; }
  draw(g) {
    const t = this.t;
    dim(g, 0.35);
    brushTitle(g, 640, 120, 360, 62, '갈림길', '#5a5346', 36);
    text(g, '어느 길로 갈까요?', 640, 180, { size: 22, fill: C.cream, stroke: INK, lw: 4 });
    [['a', this.a, 220], ['b', this.b, 680]].forEach(([key, st, x], n) => {
      const v = STOP[st.type], w = 380, h = 250, k = easeOutBack(clamp((t - n * 0.12) / 0.3, 0, 1)), y = 214 + (1 - k) * 40;
      if (!this.left && t > 0.35 && tapped('fork' + key, x, y, w, h)) { this.left = true; sfx('card'); this.onPick(key); }
      const dn = isDown('fork' + key, x, y, w, h) ? 3 : 0;
      g.save(); g.globalAlpha = clamp((t - n * 0.12) / 0.2, 0, 1);
      rr(g, x, y + 6, w, h, 14, '#d9cdb0', INK, 3); rr(g, x, y + dn, w, h, 14, PAPER, INK, 3); rr(g, x + 9, y + 9 + dn, w - 18, h - 18, 8, null, v.col + '88', 1.6);
      seal(g, x + w / 2, y + 78 + dn, 84, v.ch, v.col); text(g, v.name, x + w / 2, y + 152 + dn, { size: 34, font: FONT_B });
      textBlock(g, forkDesc(st.type), x + w / 2, y + 194 + dn, w - 50, 24, { size: 17, fill: SUB, weight: 400 });
      text(g, n ? '오른쪽 길 ▶' : '◀ 왼쪽 길', x + w / 2, y + h - 22 + dn, { size: 15, fill: v.col });
      g.restore();
    });
  }
}

// ───────── 주막의 선택지 ─────────
export function restChoices() {
  const r = G.run;
  return [
    { label: '쉬어 간다', desc: r.flags < 3 ? '깃발 +1' : '깃발이 가득 — 대신 엽전 +40', pick: () => ['뜨끈한 국밥 한 그릇에 기운을 차렸습니다.', act.flag(1)] },
    r.deck.some(c => isUnit(c) && canUp(c)) ? { label: '조련한다', desc: '병력·영웅 패 한 장을 골라 Lv +1 (체력·공격력 +20%)', deck: 'up', filter: isUnit, story: '주막 마당에서 밤새 합을 맞췄습니다.' } : null,
    { label: '보급을 받는다', desc: '전술 패 넉 장을 얻는다 (돌팔매·화살비·약손·북·척후 가운데)', pick: () => ['주모가 싸 준 꾸러미를 풀었습니다. 떠돌이 장꾼들이 두고 간 것도 섞여 있습니다.', act.supply(4)] },
    r.deck.some(c => !isUnit(c) && canUp(c)) ? { label: '전술을 익힌다', desc: '전술 패 한 종류를 골라 익힌다 — 가진 것과 앞으로 얻는 것이 모두 강화판(+)', deck: 'up', filter: c => !isUnit(c), story: '등잔불 아래에서 밤새 병법을 가다듬었습니다.' } : null,
    { label: '잔치를 벌인다', cost: 90, desc: '엽전 90 → 깃발 +1 그리고 무작위 병력 패 Lv +1', pick: () => { act.gold(-90); return ['고기와 술이 돌자 사기가 하늘을 찌릅니다.', act.flag(1), act.train()]; } },
  ].filter(Boolean);
}
