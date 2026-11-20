// 전술 패 그림, 덱 살피기, 군대·무기 살피기 (여러 장면이 함께 쓰는 겹침 화면)
import { W, H } from '../config.js';
import { TAU, INK, PAPER, RED, INDIGO, NAVY, TEAL, OCHRE, SUB, FONT_B, text, textBlock, ell, rr, rrPath, line, poly, st, clamp } from '../render/draw.js';
import { ui, tapped, button, panel, brushTitle, seal, icon, C } from './ui.js';
import { CARDS, KIND, cardVals, cardCost, cardName } from '../data/cards.js';
import { WEAPONS, ARMS, CLS_NAME, canEquip } from '../data/weapons.js';
import { UNITS } from '../data/units.js';
import { RELICS } from '../data/relics.js';
import { G, lvlOf, countOf, cap, used, unitStats, equip } from '../state.js';
import { portrait, weaponIcon } from '../render/sprites.js';
import { cardIcon, relicIcon } from '../render/icons.js';
import { sfx } from '../audio.js';

const SCALED = ['dmg', 'tick', 'burn', 'dps', 'hp', 'barrier'];
// 패 설명 (P 를 주면 원정 깊이에 따라 커지는 수치를 반영한다)
export function cardText(c, P = 1) { const v = cardVals(c); if (P !== 1) for (const k of SCALED) if (v[k]) v[k] = Math.round(v[k] * P); return CARDS[c.id].desc(v); }

// 패 한 장. o: { cost, dim, desc(설명 표시), P, lift }
export function cardFace(g, c, x, y, w, h, o = {}) {
  const d = CARDS[c.id], k = KIND[d.kind], col = k.col, big = h >= 240, mini = w < 100, r = Math.max(5, w * 0.06), hh = big ? 46 : mini ? h * 0.16 : Math.max(26, h * 0.2);
  g.save(); if (o.dim) g.globalAlpha *= 0.45;
  rr(g, x + 2, y + 4, w, h, r, 'rgba(50,36,20,0.28)');
  rr(g, x, y, w, h, r, c.up ? '#fbf1cf' : PAPER, INK, 2.4);
  g.save(); g.beginPath(); rrPath(g, x + 1.5, y + 1.5, w - 3, h - 3, r - 1); g.clip();
  g.fillStyle = col; g.fillRect(x, y, w, hh); g.fillStyle = INK; g.fillRect(x, y + hh, w, 2);
  g.globalAlpha *= 0.16; for (let i = -1; i < w / 14 + 1; i++) { poly(g, [x + i * 14, y + hh, x + i * 14 + 7, y + hh - 6, x + i * 14 + 14, y + hh], '#fff'); } g.globalAlpha /= 0.16;
  // 그림 칸: 옅은 먹 번짐 위에 도장
  const ah = big ? 120 : h - hh - (mini ? 4 : 24), cy = y + hh + (big ? 66 : ah / 2 + 2), cx = x + w / 2, ss = big ? 82 : Math.min(w * (mini ? 0.56 : 0.46), ah * 0.78);
  g.globalAlpha *= 0.14; ell(g, cx, cy, ss * 0.95, ss * 0.72, col); g.globalAlpha /= 0.14;
  g.restore();
  g.setLineDash([3, 5]); g.beginPath(); g.arc(cx, cy, ss * 0.74, 0, TAU); st(g, col + '99', 1.2); g.setLineDash([]);
  cardIcon(g, c.id, cx, cy + (big ? 2 : 1), ss / (mini ? 36 : 40));
  // 큰 패에는 낙관처럼 작은 도장을 곁들인다
  if (big) { g.save(); g.translate(x + w - 30, y + hh + 108); g.rotate(-0.08); seal(g, 0, 0, 27, d.ch, col); g.restore(); }
  if (!mini) text(g, cardName(c), x + w / 2 + (big ? 0 : 9), y + hh / 2 + 1, { size: big ? 27 : Math.min(19, hh * 0.62), font: FONT_B, fill: C.cream, maxW: w - (big ? 60 : 44) });
  if (big) {
    rr(g, x + w / 2 - 34, y + hh + 132, 68, 24, 12, null, col, 1.4); text(g, k.name, x + w / 2, y + hh + 145, { size: 15, fill: col });
    textBlock(g, o.text || cardText(c, o.P || 1), x + w / 2, y + hh + 180, w - 26, 23, { size: 16.5, fill: SUB, weight: 400 });
  } else if (!mini) text(g, k.name, x + w / 2, y + h - 13, { size: 13, fill: col });
  if (c.up) { rr(g, x + 3.5, y + 3.5, w - 7, h - 7, r - 2, null, '#c9962e', 1.6); }
  // 비용 엽전
  const cost = o.cost === undefined ? cardCost(c) : o.cost, cr = big ? 19 : mini ? Math.max(9, w * 0.15) : 14;
  ell(g, x + cr - 3, y + cr - 3, cr, cr, o.free ? '#9bd07a' : OCHRE, INK, 2); rr(g, x + cr - 3 - cr * 0.32, y + cr - 3 - cr * 0.32, cr * 0.64, cr * 0.64, 1, 'rgba(120,80,20,0.35)');
  text(g, String(cost), x + cr - 3, y + cr - 2, { size: cr * 1.25, font: FONT_B, fill: INK, stroke: '#f6dc9a', lw: 3 });
  g.restore();
}
// 패 뒷면 (더미·빈 자리)
export function cardBack(g, x, y, w, h) {
  const r = Math.max(5, w * 0.06);
  rr(g, x + 2, y + 3, w, h, r, 'rgba(50,36,20,0.22)'); rr(g, x, y, w, h, r, NAVY, INK, 2.2); rr(g, x + 5, y + 5, w - 10, h - 10, r - 2, null, OCHRE + 'aa', 1.2);
  g.save(); g.translate(x + w / 2, y + h / 2); g.rotate(Math.PI / 4); const q = Math.min(w, h) * 0.2; rr(g, -q, -q, q * 2, q * 2, 2, null, OCHRE, 1.6); rr(g, -q * 0.5, -q * 0.5, q, q, 1, OCHRE + '88'); g.restore();
}

// ───────── 덱 살피기 ─────────
// mode: view(구경) / up(강화할 패 고르기) / burn(없앨 패 고르기)
const ORDER = { hero: 0, attack: 1, support: 2, tactic: 3, curse: 4 };
export class DeckView {
  constructor(o = {}) { this.mode = o.mode || 'view'; this.onPick = o.onPick; this.onClose = o.onClose; this.sel = -1; this.t = 0; this.P = o.P || 1; this.title = o.title; }
  can(c) { return this.mode === 'up' ? !c.up && CARDS[c.id].kind !== 'curse' : this.mode === 'burn' ? G.run.deck.length > 4 : true; }
  frame(g, dt) { const L = ui.layer; ui.layer = 1; try { this.draw(g, dt); } finally { ui.layer = L; } }
  draw(g, dt) {
    this.t += dt; const deck = G.run.deck, i = ui.inp, mode = this.mode;
    g.fillStyle = 'rgba(31,42,68,0.6)'; g.fillRect(0, 0, W, H);
    panel(g, 30, 110, 660, 1060);
    brushTitle(g, 360, 112, 320, 68, this.title || (mode === 'up' ? '패 강화' : mode === 'burn' ? '패 태우기' : '전술 패'), mode === 'burn' ? '#7a1f1c' : INDIGO, 36);
    text(g, mode === 'up' ? '강화할 패를 고르세요' : mode === 'burn' ? '덱에서 없앨 패를 고르세요' : `모두 ${deck.length}장  ·  싸움에서는 손에 4장을 들고, 쓰면 새로 뽑습니다`, 360, 186, { size: 18, fill: SUB, weight: 400, maxW: 600 });
    const idx = deck.map((c, n) => n).sort((a, b) => ORDER[CARDS[deck[a].id].kind] - ORDER[CARDS[deck[b].id].kind] || cardCost(deck[a]) - cardCost(deck[b]) || (deck[a].id < deck[b].id ? -1 : deck[a].id > deck[b].id ? 1 : 0));
    const small = deck.length > 25, cols = small ? 6 : 5, cw = small ? 96 : 116, chh = small ? 122 : 150, gx = small ? 10 : 10, gy = small ? 8 : 10, x0 = 360 - (cols * cw + (cols - 1) * gx) / 2, y0 = 214;
    idx.forEach((n, k) => {
      const c = deck[n], x = x0 + (k % cols) * (cw + gx), y = y0 + Math.floor(k / cols) * (chh + gy), ok = this.can(c);
      cardFace(g, c, x, y, cw, chh, { dim: !ok });
      if (this.sel < 0 && tapped('dk' + n, x, y, cw, chh)) { this.sel = n; this.fresh = true; sfx('click'); }
    });
    if (this.sel < 0) { if (button(g, 'dkclose', 230, 1086, 260, 64, mode === 'view' ? '닫기' : '그만두기', { style: mode === 'view' ? 'indigo' : 'paper', size: 28 })) { if (this.onClose) this.onClose(); } return; }
    // 크게 보기
    const c = deck[this.sel], ok = this.can(c);
    g.fillStyle = 'rgba(31,42,68,0.72)'; g.fillRect(0, 0, W, H);
    if (mode === 'up' && ok) { cardFace(g, c, 110, 420, 224, 316, { P: this.P }); cardFace(g, { id: c.id, up: true }, 386, 420, 224, 316, { P: this.P }); poly(g, [344, 562, 344, 594, 376, 578], OCHRE, INK, 2); text(g, '지금', 222, 392, { size: 22, fill: C.cream }); text(g, '강화 후', 498, 392, { size: 22, fill: '#f0d99a' }); }
    else cardFace(g, c, 248, 420, 224, 316, { P: this.P });
    if (mode === 'view') { text(g, '아무 곳이나 누르면 닫힙니다', 360, 790, { size: 20, fill: C.cream, weight: 400 }); if (i.released && !this.fresh) this.sel = -1; this.fresh = false; return; }
    if (!ok) text(g, mode === 'up' ? '더 강화할 수 없는 패입니다' : '덱은 4장보다 적어질 수 없습니다', 360, 790, { size: 22, fill: '#f3c9a0' });
    if (ok && button(g, 'dkok', 370, 840, 240, 76, mode === 'up' ? '강화한다' : '태운다', { style: mode === 'up' ? 'indigo' : 'red', size: 32 })) { const n = this.sel; this.sel = -1; sfx('card'); if (this.onPick) this.onPick(n); return; }
    if (button(g, 'dkno', ok ? 110 : 240, 840, 240, 76, '다른 패 보기', { style: 'paper', size: 28 })) this.sel = -1;
  }
}

// ───────── 군대·무기 살피기 ─────────
export function weaponTile(g, id, wid, x, y, w, h, o = {}) {
  const d = WEAPONS[wid], hit = !o.dim && tapped(id, x, y, w, h);
  g.save(); if (o.dim) g.globalAlpha *= 0.4;
  rr(g, x + 2, y + 3, w, h, 6, 'rgba(50,36,20,0.2)'); rr(g, x, y, w, h, 6, o.on ? '#fbf1cf' : PAPER, o.on ? RED : INK, o.on ? 3.2 : 2);
  g.save(); g.beginPath(); g.rect(x + 2, y + 2, w - 4, h - 26); g.clip(); g.globalAlpha *= 0.5; ell(g, x + w / 2, y + (h - 24) / 2, w * 0.36, (h - 24) * 0.36, '#e9dec4'); g.globalAlpha /= 0.5; weaponIcon(g, wid, x + w / 2, y + (h - 24) / 2 + 2, Math.min(1, w / 100)); g.restore();
  text(g, d.name, x + w / 2, y + h - 13, { size: 15, maxW: w - 8, fill: d.base ? SUB : INK });
  if (o.tag) { rr(g, x + 4, y + 4, 40, 19, 4, o.on ? RED : NAVY); text(g, o.tag, x + 24, y + 14, { size: 12.5, fill: C.cream }); }
  g.restore();
  return hit;
}
export class ArmyView {
  constructor(o = {}) { const r = G.run; this.onClose = o.onClose; this.onChange = o.onChange; this.tab = o.tab || 0; this.t = 0; const fit = o.weapon ? r.squads.filter(s => canEquip(s.type, o.weapon)) : [], cls = o.weapon ? WEAPONS[o.weapon].cls : '';
    // 새 무기는 그 무기를 본업으로 쓰는 부대부터 권한다
    const best = fit.find(s => !s.wpn && !UNITS[s.type].hero && WEAPONS[ARMS[s.type].base].cls === cls) || fit.find(s => !s.wpn && !UNITS[s.type].hero) || fit.find(s => !s.wpn) || fit[0];
    this.sel = o.uid || (best || r.squads[0]).uid; this.hint = o.weapon || null; }
  frame(g, dt) { const L = ui.layer; ui.layer = 1; try { this.draw(g, dt); } finally { ui.layer = L; } }
  draw(g, dt) {
    this.t += dt; const r = G.run, t = this.t;
    g.fillStyle = 'rgba(31,42,68,0.6)'; g.fillRect(0, 0, W, H);
    panel(g, 30, 110, 660, 1060);
    brushTitle(g, 360, 112, 300, 68, '우리 군대', INDIGO, 36);
    icon.sack(g, 66, 188, 0.9); text(g, `군량 ${used()} / ${cap()}  ·  이긴 싸움 ${r.wins}`, 86, 190, { size: 18, align: 'left', fill: SUB });
    ['부대 · 무기', `보물 ${r.relics.length}`].forEach((s, n) => { if (button(g, 'tab' + n, 398 + n * 138, 168, 130, 42, s, { style: this.tab === n ? 'navy' : 'paper', size: 19, r: 8 })) this.tab = n; });
    if (this.tab === 1) {
      text(g, r.relics.length ? '지닌 보물' : '지닌 보물이 없습니다', 60, 250, { size: 24, font: FONT_B, align: 'left' });
      const lh = Math.min(62, 800 / Math.max(1, r.relics.length)), two = lh >= 46;
      r.relics.forEach((id, n) => {
        const x = RELICS[id], y = 300 + n * lh;
        if (two) rr(g, 50, y - lh / 2 + 3, 620, lh - 6, 6, x.curse ? '#efe6f4' : '#f6edd6', INK + '55', 1.2);
        relicIcon(g, id, 84, y, Math.min(0.94, lh / 60));
        if (two) { text(g, x.name, 122, y - 10, { size: 20, font: FONT_B, align: 'left', fill: x.curse ? '#6a4a9a' : INK }); text(g, x.desc, 122, y + 13, { size: 15.5, align: 'left', fill: SUB, weight: 400, maxW: 530 }); }
        else { text(g, x.name, 112, y, { size: Math.min(19, lh * 0.5), align: 'left', fill: x.curse ? '#6a4a9a' : INK, maxW: 130 }); text(g, x.desc, 250, y, { size: Math.min(16, lh * 0.44), align: 'left', fill: SUB, weight: 400, maxW: 414 }); }
      });
    } else this.drawArmy(g, r, t);
    if (button(g, 'armyclose', 230, 1092, 260, 62, '닫기', { size: 28 })) { if (this.onClose) this.onClose(); }
  }
  drawArmy(g, r, t) {
    const per = r.squads.length > 12 ? 7 : 6, pw = 624 / per;
    r.squads.forEach((s, n) => {
      const x = 48 + (n % per) * pw + pw / 2, y = 318 + Math.floor(n / per) * 122, d = UNITS[s.type], on = s.uid === this.sel;
      if (tapped('sq' + s.uid, x - pw / 2 + 2, y - 78, pw - 4, 118)) { this.sel = s.uid; sfx('click'); }
      if (on) rr(g, x - pw / 2 + 3, y - 80, pw - 6, 120, 8, '#f6e6b8', RED, 2.6);
      g.save(); g.beginPath(); g.rect(x - pw / 2 + 4, y - 96, pw - 8, 104); g.clip(); if (!s.placed) g.globalAlpha = 0.5; portrait(g, s.type, x, y, d.hero ? 0.92 : per > 6 ? 0.95 : 1.08, t + n, on, s.wpn); g.restore();
      text(g, d.name, x, y + 16, { size: 14.5, maxW: pw - 8 }); text(g, `Lv${lvlOf(s.type)} · ${countOf(s.type)}명`, x, y + 33, { size: 12.5, fill: SUB, weight: 400 });
      if (s.wpn) { ell(g, x + pw / 2 - 16, y - 66, 9, 9, RED, INK, 1.4); text(g, '무', x + pw / 2 - 16, y - 65, { size: 11, fill: C.cream }); }
    });
    const s = r.squads.find(q => q.uid === this.sel) || r.squads[0], d = UNITS[s.type], arm = ARMS[s.type], cur = s.wpn || (arm ? arm.base : null);
    const y0 = 318 + Math.ceil(r.squads.length / per) * 122 - 68, bh = 168;
    rr(g, 50, y0, 620, bh, 6, '#f3ead2', INK, 1.8);
    rr(g, 62, y0 + 12, 110, bh - 24, 5, '#dbe3ea', INK, 1.4); g.save(); g.beginPath(); g.rect(63, y0 + 13, 108, bh - 26); g.clip(); portrait(g, s.type, 117, y0 + bh - 26, d.hero ? 1.45 : 1.8, t, true, s.wpn); g.restore();
    const stt = unitStats(s.type, lvlOf(s.type), s.wpn);
    text(g, d.name, 188, y0 + 30, { size: 28, font: FONT_B, align: 'left' });
    text(g, `Lv${lvlOf(s.type)}  ·  ${d.role}  ·  체력 ${stt.hp}  ·  ${d.heal ? '치유' : '공격'} ${stt.atk}  ·  ${stt.as.toFixed(1)}초마다`, 188, y0 + 62, { size: 16, align: 'left', fill: SUB, maxW: 470 });
    if (cur) { rr(g, 188, y0 + 80, 470, 72, 5, PAPER, INK, 1.2); text(g, `${CLS_NAME[WEAPONS[cur].cls]} · ${WEAPONS[cur].name}`, 200, y0 + 100, { size: 19, font: FONT_B, align: 'left', fill: INDIGO }); textBlock(g, WEAPONS[cur].desc, 200, y0 + 126, 448, 20, { size: 15.5, align: 'left', weight: 400, fill: SUB }); }
    else text(g, '무기를 바꿀 수 없는 병종입니다', 188, y0 + 112, { size: 18, align: 'left', fill: SUB, weight: 400 });
    // 무기 칸: 지금 든 것, 기본 무기, 보관함
    const y1 = y0 + bh + 16;
    text(g, '무기 바꾸기', 54, y1 + 12, { size: 22, font: FONT_B, align: 'left' });
    text(g, r.items.length ? `보관함 ${r.items.length}개 — 칸을 누르면 바꿔 듭니다` : '무기는 전리품·장터·대장간에서 얻습니다', 180, y1 + 13, { size: 16, align: 'left', fill: SUB, weight: 400, maxW: 480 });
    const slots = []; if (cur) slots.push({ wid: cur, on: true }); if (arm && s.wpn) slots.push({ wid: arm.base, base: true });
    r.items.forEach((wid, n) => { if (canEquip(s.type, wid)) slots.push({ wid, n }); }); r.items.forEach((wid, n) => { if (!canEquip(s.type, wid)) slots.push({ wid, n, dim: true }); });
    const tw = 98, th = 104, room = Math.max(1, Math.floor((1078 - (y1 + 30)) / (th + 8))), max = room * 6;
    slots.slice(0, max).forEach((o, k) => {
      const x = 54 + (k % 6) * (tw + 5), y = y1 + 30 + Math.floor(k / 6) * (th + 8);
      if (weaponTile(g, 'wt' + k, o.wid, x, y, tw, th, { on: o.on, dim: o.dim, tag: o.on ? '장착' : o.base ? '기본' : o.wid === this.hint ? '새것' : '' })) {
        if (o.on) return; equip(s.uid, o.base ? null : o.wid); sfx('place'); if (this.onChange) this.onChange();
      }
    });
    if (y1 + 30 + Math.ceil(Math.min(slots.length, max) / 6) * (th + 8) < 1030) text(g, '같은 병종이라도 부대마다 다른 무기를 들 수 있습니다 · 쓰던 무기는 보관함으로 돌아갑니다', 360, 1062, { size: 15.5, fill: SUB, weight: 400, maxW: 610 });
    if (slots.length > max) text(g, `+${slots.length - max}`, 660, y1 + 12, { size: 16, fill: SUB, align: 'right' });
  }
}
