// 패 그림(병력·영웅·전술), 덱 살피기(무기 끼우기 포함), 보물 살피기 — 가로 화면
import { W, H } from '../config.js';
import { TAU, INK, PAPER, RED, INDIGO, NAVY, TEAL, OCHRE, SUB, FONT_B, text, textBlock, ell, rr, rrPath, line, poly, st, clamp } from '../render/draw.js';
import { ui, tapped, button, panel, brushTitle, seal, icon, C } from './ui.js';
import { CARDS, KIND, cardVals, cardCost, cardName, isUnit } from '../data/cards.js';
import { WEAPONS, ARMS, CLS_NAME, canEquip } from '../data/weapons.js';
import { UNITS } from '../data/units.js';
import { RELICS } from '../data/relics.js';
import { G, unitStats, equip, canUp, weaponOf } from '../state.js';
import { portrait, weaponIcon } from '../render/sprites.js';
import { cardIcon, relicIcon } from '../render/icons.js';
import { sfx } from '../audio.js';

const SCALED = ['dmg', 'tick', 'burn', 'dps', 'hp', 'barrier'];
// 패 설명 (P 를 주면 원정 깊이에 따라 커지는 수치를 반영한다)
export function cardText(c, P = 1) {
  const d = CARDS[c.id];
  if (isUnit(c)) { const u = UNITS[d.unit], s = unitStats(d.unit, c.lv || 1, c.wpn); return `체력 ${s.hp} · ${u.heal ? '치유' : '공격'} ${s.atk} · ${s.n}명\n${u.tip}`; }
  const v = cardVals(c); if (P !== 1) for (const k of SCALED) if (v[k]) v[k] = Math.round(v[k] * P); return d.desc(v);
}

// 패 한 장. o: { cost, dim, P, free, text }
export function cardFace(g, c, x, y, w, h, o = {}) {
  const d = CARDS[c.id], k = KIND[d.kind], col = k.col, unit = isUnit(c), big = h >= 240, mini = w < 96, r = Math.max(5, w * 0.06), hh = big ? 46 : mini ? h * 0.16 : Math.max(26, h * 0.2), gilt = c.up || (c.lv || 1) > 1;
  g.save(); if (o.dim) g.globalAlpha *= 0.45;
  rr(g, x + 2, y + 4, w, h, r, 'rgba(40,28,16,0.3)');
  const pg = g.createLinearGradient(0, y, 0, y + h); pg.addColorStop(0, gilt ? '#fdf5d6' : '#fdf8ea'); pg.addColorStop(1, gilt ? '#f2e0ac' : '#eee3c7');
  rr(g, x, y, w, h, r, pg, INK, 2.4);
  g.save(); g.beginPath(); rrPath(g, x + 1.5, y + 1.5, w - 3, h - 3, r - 1); g.clip();
  // 머리띠: 종류 색 위에 빛과 그늘, 아래로 먹선과 금선
  g.fillStyle = col; g.fillRect(x, y, w, hh); g.fillStyle = 'rgba(255,255,255,0.16)'; g.fillRect(x, y, w, hh * 0.34); g.fillStyle = 'rgba(0,0,0,0.14)'; g.fillRect(x, y + hh * 0.74, w, hh * 0.26);
  g.fillStyle = INK; g.fillRect(x, y + hh, w, 1.8); g.fillStyle = 'rgba(201,150,46,0.9)'; g.fillRect(x, y + hh + 1.8, w, 1.2);
  // 그림 칸: 옅은 먹 번짐 위에 아이콘(전술) 또는 인형(병력·영웅)
  const ah = big ? 120 : h - hh - (mini ? 4 : 24), cy = y + hh + (big ? 66 : ah / 2 + 2), cx = x + w / 2, ss = big ? 82 : Math.min(w * (mini ? 0.56 : 0.46), ah * 0.78);
  const wg = g.createRadialGradient(cx, cy, ss * 0.1, cx, cy, ss * 1.1); wg.addColorStop(0, col + '3c'); wg.addColorStop(1, col + '00'); g.fillStyle = wg; g.fillRect(x, y + hh + 3, w, ah + 24);
  if (unit) {
    const gy = cy + ss * 0.42, gg = g.createLinearGradient(0, gy, 0, gy + ss * 0.7); gg.addColorStop(0, 'rgba(140,160,120,0.8)'); gg.addColorStop(1, 'rgba(140,160,120,0.2)'); g.fillStyle = gg; g.fillRect(x, gy, w, ah); g.fillStyle = 'rgba(38,42,54,0.22)'; g.fillRect(x, gy, w, 1);
    const L = d.unit === 'knight' || d.unit === 'cannon' ? 0.82 : 1; portrait(g, d.unit, cx, cy + ss * 0.62, ss / (d.kind === 'lead' ? 66 : 54) * L, 0, false, c.wpn);
  }
  g.restore();
  if (!unit) { g.setLineDash([3, 5]); g.beginPath(); g.arc(cx, cy, ss * 0.74, 0, TAU); st(g, col + '99', 1.2); g.setLineDash([]); cardIcon(g, c.id, cx, cy + (big ? 2 : 1), ss / (mini ? 36 : 40)); if (big) { g.save(); g.translate(x + w - 30, y + hh + 108); g.rotate(-0.08); seal(g, 0, 0, 27, d.ch, col); g.restore(); } }
  if (!mini) { const nx = x + w / 2 + (big ? 0 : 9), ny = y + hh / 2 + 1, no = { size: big ? 27 : Math.min(19, hh * 0.62), font: FONT_B, maxW: w - (big ? 60 : 44) }; text(g, cardName(c), nx, ny + 1.4, { ...no, fill: 'rgba(8,10,24,0.32)' }); text(g, cardName(c), nx, ny, { ...no, fill: C.cream }); }
  else if (unit && (c.lv || 1) > 1) { rr(g, x + w - 26, y + h - 17, 23, 14, 3, NAVY); text(g, 'Lv' + c.lv, x + w - 14.5, y + h - 9.6, { size: 10, fill: '#f0d99a' }); }
  if (big) {
    rr(g, x + w / 2 - 34, y + hh + 132, 68, 24, 5, null, col, 1.4); text(g, k.name, x + w / 2, y + hh + 145, { size: 15, fill: col });
    textBlock(g, o.text || cardText(c, o.P || 1), x + w / 2, y + hh + (unit ? 174 : 178), w - (unit ? 18 : 24), unit ? 19 : 22, { size: unit ? 13.5 : 16.5, fill: SUB, weight: 400 });
  } else if (!mini) { const ky = y + h - 13; text(g, k.name, x + w / 2, ky, { size: 13, fill: col }); for (const sg of [-1, 1]) { line(g, [x + w / 2 + sg * 22, ky, x + w / 2 + sg * (w / 2 - 12), ky], col + '77', 1); ell(g, x + w / 2 + sg * 22, ky, 1.3, 1.3, col + 'aa'); } }
  rr(g, x + 3.5, y + 3.5, w - 7, h - 7, r - 2, null, gilt ? '#c9962e' : 'rgba(38,42,54,0.16)', gilt ? 1.6 : 0.9);
  if (c.wpn && !mini) { ell(g, x + w - 13, y + hh + 13, 9, 9, RED, INK, 1.2); text(g, '무', x + w - 13, y + hh + 14, { size: 11, fill: C.cream }); }
  // 비용 엽전
  const cost = o.cost === undefined ? cardCost(c) : o.cost, cr = big ? 19 : mini ? Math.max(9, w * 0.15) : 14, ccx = x + cr - 3, ccy = y + cr - 3;
  ell(g, ccx + 0.6, ccy + 1.8, cr, cr, 'rgba(30,20,10,0.3)'); ell(g, ccx, ccy, cr, cr, o.free ? '#9bd07a' : '#e4b54c', INK, 2);
  ell(g, ccx, ccy, cr * 0.76, cr * 0.76, null, o.free ? 'rgba(40,90,30,0.4)' : 'rgba(122,78,18,0.45)', Math.max(0.8, cr * 0.07));
  g.beginPath(); g.arc(ccx, ccy, cr * 0.87, Math.PI * 1.06, Math.PI * 1.5); st(g, 'rgba(255,250,220,0.85)', Math.max(0.9, cr * 0.09));
  text(g, String(cost), ccx, ccy + 1, { size: cr * 1.25, font: FONT_B, fill: INK, stroke: o.free ? '#d6f0c0' : '#f6dc9a', lw: 3 });
  g.restore();
}
// 패 뒷면 (더미·빈 자리)
export function cardBack(g, x, y, w, h) {
  const r = Math.max(3, w * 0.06), m = Math.max(2.4, w * 0.07), gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#3d5080'); gr.addColorStop(1, '#1f2a47');
  rr(g, x + 2, y + 3, w, h, r, 'rgba(10,8,6,0.3)'); rr(g, x, y, w, h, r, gr, '#0c1120', 2); rr(g, x + m, y + m, w - m * 2, h - m * 2, Math.max(1, r - m * 0.6), null, 'rgba(226,184,90,0.85)', 1.1);
  g.save(); g.translate(x + w / 2, y + h / 2); g.rotate(Math.PI / 4); const q = Math.min(w, h) * 0.2; rr(g, -q, -q, q * 2, q * 2, 2, null, '#e2b85a', 1.4); rr(g, -q * 0.5, -q * 0.5, q, q, 1, 'rgba(226,184,90,0.6)'); g.restore();
}
export function weaponTile(g, id, wid, x, y, w, h, o = {}) {
  const d = WEAPONS[wid], hit = !o.dim && tapped(id, x, y, w, h);
  g.save(); if (o.dim) g.globalAlpha *= 0.4;
  rr(g, x + 2, y + 3, w, h, 6, 'rgba(50,36,20,0.2)'); rr(g, x, y, w, h, 6, o.on ? '#fbf1cf' : PAPER, o.on ? RED : INK, o.on ? 3.2 : 2);
  g.save(); g.beginPath(); g.rect(x + 2, y + 2, w - 4, h - 24); g.clip(); g.globalAlpha *= 0.5; ell(g, x + w / 2, y + (h - 22) / 2, w * 0.36, (h - 22) * 0.36, '#e9dec4'); g.globalAlpha /= 0.5; weaponIcon(g, wid, x + w / 2, y + (h - 22) / 2 + 2, Math.min(0.9, w / 100)); g.restore();
  text(g, d.name, x + w / 2, y + h - 12, { size: 14, maxW: w - 6, fill: d.base ? SUB : INK });
  if (o.tag) { rr(g, x + 4, y + 4, 36, 17, 4, o.on ? RED : NAVY); text(g, o.tag, x + 22, y + 13, { size: 11.5, fill: C.cream }); }
  g.restore();
  return hit;
}

// ───────── 덱 살피기 ─────────
// mode: view(구경·무기 끼우기) / up(강화·조련할 패 고르기) / burn(없앨 패 고르기).  filter 로 고를 수 있는 패를 좁힌다
const ORDER = { lead: 0, unit: 1, hero: 2, attack: 3, support: 4, tactic: 5, curse: 6 };
export class DeckView {
  constructor(o = {}) { this.mode = o.mode || 'view'; this.onPick = o.onPick; this.onClose = o.onClose; this.onChange = o.onChange; this.filter = o.filter; this.t = 0; this.P = o.P || 1; this.title = o.title; this.sel = o.uid || null; this.hint = o.weapon || null; if (this.hint) { const fit = G.run.deck.filter(c => isUnit(c) && canEquip(CARDS[c.id].unit, this.hint)); const best = fit.find(c => !c.wpn && WEAPONS[ARMS[CARDS[c.id].unit].base].cls === WEAPONS[this.hint].cls && CARDS[c.id].kind === 'unit') || fit.find(c => !c.wpn) || fit[0]; if (best) this.sel = best.uid; } }
  can(c) { if (this.filter && !this.filter(c)) return false; return this.mode === 'up' ? canUp(c) : this.mode === 'burn' ? G.run.deck.length > 6 && CARDS[c.id].kind !== 'lead' : true; }
  frame(g, dt) { const L = ui.layer; ui.layer = L + 1; try { this.draw(g, dt); } finally { ui.layer = L; } }
  draw(g, dt) {
    this.t += dt; const r = G.run, deck = r.deck, mode = this.mode;
    g.fillStyle = 'rgba(31,42,68,0.62)'; g.fillRect(0, 0, W, H);
    panel(g, 30, 24, 1220, 672);
    brushTitle(g, 300, 30, 300, 60, this.title || (mode === 'up' ? '패 다듬기' : mode === 'burn' ? '패 태우기' : '덱 살피기'), mode === 'burn' ? '#7a1f1c' : INDIGO, 32);
    text(g, mode === 'up' ? '강화(전술)·조련(병력)할 패를 고르세요' : mode === 'burn' ? '덱에서 없앨 패를 고르세요' : `모두 ${deck.length}장 · 병력 패를 고르면 무기를 바꿔 끼울 수 있습니다`, 480, 62, { size: 17, fill: SUB, weight: 400, align: 'left', maxW: 400 });
    const list = deck.slice().sort((a, b) => ORDER[CARDS[a.id].kind] - ORDER[CARDS[b.id].kind] || cardCost(a) - cardCost(b) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    if (!this.sel || !deck.some(c => c.uid === this.sel)) this.sel = (list.find(c => this.can(c)) || list[0]).uid;
    const small = deck.length > 28, cols = small ? 9 : 7, cw = small ? 80 : 104, chh = small ? 104 : 136, gap = 8, x0 = 56, y0 = 100;
    list.forEach((c, k) => {
      const x = x0 + (k % cols) * (cw + gap), y = y0 + Math.floor(k / cols) * (chh + gap), ok = this.can(c), on = c.uid === this.sel;
      if (on) rr(g, x - 4, y - 4, cw + 8, chh + 8, 10, null, RED, 4);
      cardFace(g, c, x, y, cw, chh, { dim: !ok });
      if (tapped('dk' + c.uid, x, y, cw, chh)) { this.sel = c.uid; sfx('click'); }
    });
    // 오른쪽: 고른 패 크게 + 할 수 있는 일
    const c = deck.find(q => q.uid === this.sel), ok = this.can(c), px = 866;
    rr(g, px, 96, 364, 520, 6, '#f3ead2', INK, 1.8);
    const after = mode === 'up' && ok ? (isUnit(c) ? Object.assign({}, c, { lv: (c.lv || 1) + 1 }) : { id: c.id, up: true }) : null;
    cardFace(g, after || c, px + 80, 108, 204, 300, { P: this.P });
    if (after) { rr(g, px + 100, 392, 164, 26, 13, INDIGO, INK, 1.4); text(g, isUnit(c) ? '조련 후' : '강화 후', px + 182, 406, { size: 15, fill: C.cream }); }
    if (mode === 'view') {
      if (isUnit(c)) this.weapons(g, r, c, px);
      else { text(g, '무기 보관함', px + 16, 438, { size: 19, font: FONT_B, align: 'left' }); if (!r.items.length) text(g, '무기는 전리품·장터·대장간에서 얻습니다', px + 16, 470, { size: 15, align: 'left', fill: SUB, weight: 400 }); r.items.slice(0, 8).forEach((wid, k) => weaponTile(g, 'wi' + k, wid, px + 14 + (k % 4) * 85, 456 + Math.floor(k / 4) * 78, 80, 72, { dim: true })); }
      if (button(g, 'dkclose', px + 62, 628, 240, 54, '닫기', { size: 26 })) { if (this.onClose) this.onClose(); }
      return;
    }
    const act = mode === 'up' ? (isUnit(c) ? '조련한다' : '강화한다') : '태운다';
    if (!ok) text(g, mode === 'up' ? '더 다듬을 수 없는 패입니다' : CARDS[c.id].kind === 'lead' ? '영웅 패는 태울 수 없습니다' : '덱은 6장보다 적어질 수 없습니다', px + 182, 470, { size: 18, fill: RED, maxW: 330 });
    else { textBlock(g, mode === 'up' ? (isUnit(c) ? '이 패의 부대 체력과 공격력이 20% 오릅니다.' : '수치가 오른 강화판(+)으로 바뀝니다.') : '이 패가 덱에서 사라집니다. 끼운 무기는 보관함으로 돌아갑니다.', px + 182, 452, 320, 24, { size: 16, fill: SUB, weight: 400 }); if (button(g, 'dkok', px + 62, 520, 240, 64, act, { style: mode === 'up' ? 'indigo' : 'red', size: 30 })) { sfx('card'); if (this.onPick) this.onPick(c.uid); return; } }
    if (button(g, 'dkno', px + 62, 628, 240, 54, '그만두기', { style: 'paper', size: 24 })) { if (this.onClose) this.onClose(); }
  }
  weapons(g, r, c, px) {
    const type = CARDS[c.id].unit, arm = ARMS[type], cur = weaponOf(c);
    if (!arm) { text(g, '무기를 바꿀 수 없는 병종입니다', px + 182, 470, { size: 17, fill: SUB, weight: 400 }); return; }
    text(g, `${CLS_NAME[WEAPONS[cur].cls]} · ${WEAPONS[cur].name}`, px + 16, 432, { size: 18, font: FONT_B, align: 'left', fill: INDIGO }); text(g, WEAPONS[cur].desc, px + 16, 454, { size: 14, align: 'left', fill: SUB, weight: 400, maxW: 334 });
    const slots = [{ wid: cur, on: true }]; if (c.wpn) slots.push({ wid: arm.base, base: true });
    r.items.forEach(wid => { if (canEquip(type, wid)) slots.push({ wid }); }); r.items.forEach(wid => { if (!canEquip(type, wid)) slots.push({ wid, dim: true }); });
    slots.slice(0, 8).forEach((o, k) => {
      if (weaponTile(g, 'wt' + k, o.wid, px + 14 + (k % 4) * 85, 470 + Math.floor(k / 4) * 76, 80, 70, { on: o.on, dim: o.dim, tag: o.on ? '장착' : o.base ? '기본' : o.wid === this.hint ? '새것' : '' }) && !o.on) { equip(c.uid, o.base ? null : o.wid); sfx('place'); if (this.onChange) this.onChange(); }
    });
    if (slots.length > 8) text(g, `+${slots.length - 8}`, px + 350, 432, { size: 14, fill: SUB, align: 'right' });
  }
}

// ───────── 보물 살피기 ─────────
export class RelicView {
  constructor(o = {}) { this.onClose = o.onClose; }
  frame(g, dt) { const L = ui.layer; ui.layer = L + 1; try { this.draw(g); } finally { ui.layer = L; } }
  draw(g) {
    const r = G.run, n = r.relics.length, cols = n > 9 ? 3 : 2, cw = 1160 / cols, rows = Math.ceil(n / cols), lh = Math.min(62, 500 / Math.max(1, rows));
    g.fillStyle = 'rgba(31,42,68,0.62)'; g.fillRect(0, 0, W, H);
    panel(g, 30, 24, 1220, 672); brushTitle(g, 640, 30, 300, 60, '지닌 보물', '#b8742a', 32);
    if (!n) text(g, '아직 지닌 보물이 없습니다', 640, 330, { size: 24, fill: SUB });
    r.relics.forEach((id, k) => {
      const x = RELICS[id], px = 60 + (k % cols) * cw, y = 126 + Math.floor(k / cols) * lh;
      rr(g, px, y - lh / 2 + 3, cw - 12, lh - 6, 6, x.curse ? '#efe6f4' : '#f6edd6', INK + '55', 1.2); relicIcon(g, id, px + 32, y, Math.min(0.92, lh / 60));
      text(g, x.name, px + 66, y - (lh > 44 ? 10 : 0), { size: Math.min(19, lh * 0.36), font: FONT_B, align: 'left', fill: x.curse ? '#6a4a9a' : INK, maxW: lh > 44 ? cw - 90 : 120 });
      text(g, x.desc, px + (lh > 44 ? 66 : 196), y + (lh > 44 ? 13 : 0), { size: Math.min(15, lh * 0.3), align: 'left', fill: SUB, weight: 400, maxW: cw - (lh > 44 ? 90 : 220) });
    });
    if (button(g, 'rvclose', 520, 634, 240, 52, '닫기', { size: 26 })) { if (this.onClose) this.onClose(); }
  }
}
