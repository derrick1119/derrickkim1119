// 행군 도중 전장 위에 뜨는 화면들: 겹침 화면의 뼈대, 전리품, 이야기 한 장면, 주막의 선택지.
// 장터·주막·갈림길·보물 터는 places.js, 길 위의 사건은 roadevent.js 가 그 장소를 통째로 그린다
import { W, H } from '../config.js';
import { TAU, INK, PAPER, RED, INDIGO, TEAL, SUB, FONT_B, text, textBlock, ell, rr, rrPath, clamp, easeOutBack, st } from '../render/draw.js';
import { ui, tapped, button, panel, brushTitle, stamp, icon, C, foil, shine } from './ui.js';
import { cardFace, DeckView } from './cards.js';
import { G, save, openReward, rollRewards, describeReward, applyReward, canUp, act } from '../state.js';
import { CARDS, isUnit } from '../data/cards.js';
import { RELICS } from '../data/relics.js';
import { WEAPONS, setOf, setProgress } from '../data/weapons.js';
import { UNITS } from '../data/units.js';
import { portrait, weaponIcon, getLook } from '../render/sprites.js';
import { cardIcon, relicIcon, miscIcon } from '../render/icons.js';
import { sfx } from '../audio.js';
import { juice, SPOT, goldRays } from './juice.js';
import { stopSprite } from '../render/terrain.js';
import { drawSprite } from '../render/draw.js';

export const COL = { blue: INDIGO, green: TEAL, purple: '#5a4a8a', gold: '#b8742a', red: '#7a1f1c' };
// 몇 장 묶음인지 알리는 딱지
const packTag = (g, x, y, n, s = 1) => { if (!(n > 1)) return; rr(g, x - 25 * s, y - 14 * s, 50 * s, 28 * s, 7 * s, RED, INK, 1.8); text(g, '×' + n, x, y + 1, { size: 20 * s, font: FONT_B, fill: C.cream }); };
// 보급 꾸러미: 든 패의 그림을 부채처럼 펼친다
// 보급 꾸러미의 패 그림: 셋이면 가운데를 맞춘 삼각(위 둘 · 아래 하나), 둘이면 나란히, 넷이면 네모로
const SUPPLY_AT = { 1: [[0, 0]], 2: [[-1, 0], [1, 0]], 3: [[-1, -1], [1, -1], [0, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]] };
export const supplyArt = (g, ids, x, y, s) => { const at = SUPPLY_AT[Math.min(4, ids.length)] || SUPPLY_AT[4]; ids.slice(0, 4).forEach((id, k) => { const [ax, ay] = at[k]; cardIcon(g, id, x + ax * 24 * s, y + ay * 22 * s, 0.7 * s, ax * 0.08); }); };
const dim = (g, a = 0.55) => { g.fillStyle = `rgba(31,42,68,${a})`; g.fillRect(0, 0, W, H); };
// 겹침 화면의 뼈대: 그 위에 덱 살피기 같은 화면(sub)이 한 겹 더 뜰 수 있다
export class Overlay {
  constructor() { this.t = 0; this.sub = null; }
  frame(g, dt) { this.t += dt; const L = ui.layer; ui.layer = L + 1; try { this.draw(g, dt); if (this.sub) this.sub.frame(g, dt); } finally { ui.layer = L; } }
  deck(o) { this.sub = new DeckView(Object.assign({ onClose: () => { this.sub = null; } }, o)); }
}
// 조련할 패: 그 패 인물의 얼굴을 둥근 틀에 담고, 곁에 조련 그림과 'N단 → N+1단' 을 둔다
function trainArt(g, unit, lv, cx, cy, t) {
  const mx = cx - 46, my = cy - 2, r = 40;
  ell(g, mx + 2, my + 3, r, r, 'rgba(50,36,20,0.25)'); ell(g, mx, my, r, r, '#efe3c4', INK, 2.2);
  g.save(); g.beginPath(); g.arc(mx, my, r - 2, 0, Math.PI * 2); g.clip(); portrait(g, unit, mx, my + 52, 1.15, t, false); g.restore();
  g.beginPath(); g.arc(mx, my, r, 0, Math.PI * 2); st(g, INK, 2.2);
  miscIcon(g, 'train', cx + 42, cy - 8, 1.7);
  rr(g, cx - 6, cy + 40, 104, 28, 14, TEAL, INK, 1.6); text(g, `${lv} → ${lv + 1}단`, cx + 46, cy + 54.5, { size: 17, font: FONT_B, fill: C.cream });
}
// 패가 아닌 선택지(보물·무기·조련 …)를 패와 같은 크기의 종이 한 장으로
function tile(g, d, x, y, w, h, t) {
  const col = COL[d.col] || INDIGO;
  rr(g, x + 2, y + 4, w, h, 8, 'rgba(50,36,20,0.28)'); rr(g, x, y, w, h, 8, PAPER, INK, 2.4);
  g.save(); g.beginPath(); rrPath(g, x + 1.5, y + 1.5, w - 3, h - 3, 7); g.clip(); g.fillStyle = col; g.fillRect(x, y, w, 46); g.fillStyle = INK; g.fillRect(x, y + 46, w, 2); { const rg = g.createRadialGradient(x + w / 2, y + 112, 6, x + w / 2, y + 112, 92); rg.addColorStop(0, col + '33'); rg.addColorStop(1, col + '00'); g.fillStyle = rg; g.fillRect(x, y + 48, w, 150); } g.restore();
  text(g, d.title, x + w / 2, y + 24, { size: 26, font: FONT_B, fill: C.cream });
  const cx = x + w / 2, cy = y + 112;
  if (d.misc === 'supply') supplyArt(g, d.ids, cx, cy, 1.45); else if (d.relic) relicIcon(g, d.relic, cx, cy, 1.9, Math.sin(t * 2 + x) * 0.04); else if (d.weapon) weaponIcon(g, d.weapon, cx, cy, 1.35); else if (d.misc === 'burn') miscIcon(g, 'burn', cx, cy, 1.8); else if (d.misc === 'train') miscIcon(g, 'train', cx, cy + 4, 2.3); else if (d.misc === 'trainOne') trainArt(g, d.unit, d.lv, cx, cy, t); else { icon.people(g, cx - 22, cy + 4, 2.6); icon.people(g, cx + 22, cy + 4, 2.6, RED); text(g, '+1', cx, cy - 34, { size: 28, font: FONT_B, fill: TEAL }); }
  if (d.weapon) setTag(g, d.weapon, cx, y + 168);
  text(g, d.name, cx, y + 196, { size: 23, font: FONT_B, maxW: w - 20 });
  textBlock(g, d.desc, cx, y + 228, w - 26, 22, { size: 15.5, fill: '#4a4034', weight: 400, maxH: h - 236 });
}
// 무기 세트 딱지: 세트 빛깔의 작은 띠에 '세트 · 이름' (덱에 이미 끼운 같은 세트 수도 함께)
export function setTag(g, wid, cx, cy) {
  const S = setOf(wid); if (!S) return;
  const p = G.run ? setProgress(G.run.deck).find(q => q.set === S) : null, s = `세트 · ${S.name}${p ? `  ${p.n}/3` : ''}`;
  g.font = `400 13px ${FONT_B}`; const w = g.measureText(s).width + 20;
  rr(g, cx - w / 2, cy - 10, w, 20, 10, S.col, INK, 1.1); text(g, s, cx, cy + 0.5, { size: 13, font: FONT_B, fill: C.cream });
}

// ───────── 전리품: 셋 중 하나 ─────────
export class RewardOverlay extends Overlay {
  constructor(o) { super(); this.kind = o.kind; this.onDone = o.onDone; this.p = openReward(o.kind); this.taken = -1; this.doneT = 0; }
  finish() { if (this.left) return; this.left = true; this.onDone(); }
  draw(g, dt) {
    // 보물 상자는 먼저 덜컹거리다 뚜껑이 열리고, 그 빛 속에서 고를 것들이 올라온다
    const lead = this.kind === 'treasure' ? 1.15 : 0, r = G.run, p = this.p, t = Math.max(0, this.t - lead - (lead ? 0.24 : 0)), done = this.taken !== -1;
    if (this.scene) this.scene(g, dt); else {   // 보물 칸은 제 풍경(장면)을 깔고, 전리품은 전장 위를 어둡게 덮고 가운데에 금빛 빛무리를 띄운다
      dim(g, 0.8);
      g.save(); g.globalCompositeOperation = 'lighter'; const sp = g.createRadialGradient(640, 280, 40, 640, 280, 560); sp.addColorStop(0, 'rgba(255,200,120,0.22)'); sp.addColorStop(1, 'rgba(255,200,120,0)'); g.fillStyle = sp; g.fillRect(0, 0, W, H); g.restore();
      // 부드러운 빛살: 가운데에서 천천히 도는 옅은 쐐기들
      g.save(); g.globalCompositeOperation = 'lighter'; g.translate(640, 300); g.rotate(this.t * 0.05); for (let k = 0; k < 12; k++) { g.rotate(TAU / 12); const bg2 = g.createLinearGradient(0, 0, 0, -620); bg2.addColorStop(0, 'rgba(255,220,150,0.07)'); bg2.addColorStop(1, 'rgba(255,220,150,0)'); g.fillStyle = bg2; g.beginPath(); g.moveTo(0, 0); g.lineTo(-60, -620); g.lineTo(60, -620); g.closePath(); g.fill(); } g.restore();
    }
    brushTitle(g, 640, 34, 420, 62, { battle: '전리품', elite: '강적의 전리품', boss: '두목의 전리품', treasure: '보물 상자' }[this.kind] || '전리품', this.kind === 'treasure' ? '#b8862a' : INDIGO, 36);
    if (lead && this.t < lead + 0.3 && !this.ownChest) {
      const q = this.t / lead, pop = clamp((this.t - lead * 0.72) / 0.3, 0, 1), fade = 1 - clamp((this.t - lead) / 0.28, 0, 1);
      g.save(); g.globalAlpha = fade; g.translate(640, 372);
      if (pop > 0) { const gl = g.createRadialGradient(0, -34, 2, 0, -34, Math.max(14, 170 * pop)); gl.addColorStop(0, 'rgba(255,236,170,0.75)'); gl.addColorStop(0.55, 'rgba(240,210,100,0.28)'); gl.addColorStop(1, 'rgba(240,210,100,0)'); g.fillStyle = gl; g.fillRect(-190, -224, 380, 380); goldRays(g, 0, -34, this.t, pop, 190); }
      const sh = q < 0.72 ? Math.sin(this.t * 38) * 0.05 * (0.3 + q) : 0; g.rotate(sh); const sc = 2.5 + 0.5 * easeOutBack(pop); drawSprite(g, stopSprite('treasure'), 0, 40, sc, sc * (1 + 0.06 * Math.sin(this.t * 38) * (q < 0.72 ? 1 : 0)));
      g.restore(); if (!this.popped && pop > 0) { this.popped = true; sfx('star'); juice.burst(640, 330, '#f0d264', 16); }
    }
    if (this.t < lead) { brushTitle(g, 640, 34, 420, 62, '보물 상자', '#b8862a', 36); text(g, '무엇이 들었을까…', 640, 82, { size: 20, fill: C.cream }); return; }
    text(g, done ? '챙겼습니다' : lead && t <= 0 ? '무엇이 들었을까…' : '하나를 고르세요', 640, 82, { size: 20, fill: C.cream });
    panel(g, 1070, 76, 180, 40, 'tag'); icon.coin(g, 1094, 96, 12); text(g, `엽전 ${r.gold}`, 1170, 97, { size: 20, maxW: 130 });
    p.opts.forEach((o, n) => {
      const d = describeReward(o), w = 224, h = 316, k = easeOutBack(clamp((t - n * 0.1) / (this.rise ? 0.5 : 0.32), 0, 1)), x = this.rise ? 528 + (n * 264 - 264) * Math.min(1, k) : 264 + n * 264, y = this.rise ? 118 + (1 - k) * 420 : 118 + (1 - k) * 50, mine = this.taken === n;   // rise: 열린 상자에서 떠올라 제자리로 퍼진다
      // 고를 것 뒤의 금빛 후광 (숨 쉬듯)
      if (!done && t - n * 0.1 > 0) { g.save(); g.globalCompositeOperation = 'lighter'; const hx = x + w / 2, hy = y + h / 2, ha = 0.18 + 0.06 * Math.sin(this.t * 2.4 + n); const hg = g.createRadialGradient(hx, hy, 40, hx, hy, 220); hg.addColorStop(0, `rgba(255,210,130,${ha})`); hg.addColorStop(1, 'rgba(255,210,130,0)'); g.fillStyle = hg; g.fillRect(hx - 230, hy - 230, 460, 460); g.restore(); }
      g.save(); g.globalAlpha = t - n * 0.1 > 0 ? 1 : 0;   // 비치지 않게, 불투명한 채로 미끄러져 들어온다
      rr(g, x - 5, y - (d.card && o.kind !== 'card' ? 30 : 5), w + 10, h + (d.card && o.kind !== 'card' ? 35 : 10), 12, null, foil(g, x, x + w), 2.4);
      if (d.card) { cardFace(g, d.card, x, y, w, h); packTag(g, x + w - 30, y + 62, d.n); if (o.kind !== 'card') { rr(g, x + 36, y - 25, 152, 27, 13, COL[d.col], INK, 1.6); text(g, d.title, x + 112, y - 11, { size: 17, fill: C.cream }); } } else tile(g, d, x, y, w, h, t);
      g.restore();
      if (done && !mine) rr(g, x - 3, y - (d.card && o.kind !== 'card' ? 27 : 3), w + 6, h + (d.card && o.kind !== 'card' ? 30 : 6), 9, 'rgba(24,28,44,0.62)');
      if (mine && !d.relic) stamp(g, x + 46, y + 150, 36, 'get', RED, -0.14);   // 보물은 가운데 공개 연출에 얻음 표가 찍힌다
      else if (!done && t > 0.45 && button(g, 'rw' + n, x + 12, y + h + 12, w - 24, 54, '고르기', { size: 27 })) {
        this.taken = n; applyReward(o); r.pending = null; save(); sfx('card');
        // 고른 것이 제자리로 날아간다: 패는 덱으로, 보물은 크게 한 번 보여 준 뒤 보물 주머니로
        const cx = x + w / 2, cy = y + h / 2;
        if (d.relic) juice.reveal({ icon: (gg, px, py, s) => relicIcon(gg, d.relic, px, py, s), name: d.name, desc: d.desc, to: SPOT.relic });
        else if (d.card) for (let q = 0; q < (d.n || 1); q++) juice.fly({ draw: (gg, px, py, s) => cardFace(gg, d.card, px - 56 * s, py - 79 * s, 112 * s, 158 * s), x0: cx, y0: cy, x1: SPOT.deck[0], y1: SPOT.deck[1], s0: 1.3, s1: 0.3, delay: q * 0.13, arc: 40 });
        else if (d.weapon) juice.fly({ draw: (gg, px, py, s) => weaponIcon(gg, d.weapon, px, py, 1.6 * s), x0: cx, y0: cy - 40, x1: SPOT.deck[0], y1: SPOT.deck[1], s1: 0.4, arc: 40 });
        else juice.burst(cx, cy - 40, '#f0d264', 14);
        if (o.kind === 'weapon') this.deck({ weapon: o.id, onClose: () => { this.sub = null; this.finish(); } });
      }
    });
    if (!done && t > 0.5) {   // 고를 것들이 다 놓인 뒤에 단추가 뜬다
      const rc = p.free > 0 ? 0 : 15 + p.rerolls * 10;
      const two = this.kind === 'treasure' || this.kind === 'boss', bx = two ? 128 : 0;   // 단추가 둘뿐이면 가운데로 모은다
      if (button(g, 'reroll', 264 + bx, 520, 240, 54, rc ? `다시 뽑기 · 엽전 ${rc}` : '다시 뽑기 · 무료', { style: r.gold >= rc ? 'paper' : 'grey', size: 21 })) { if (r.gold >= rc) { r.gold -= rc; if (p.free > 0) p.free--; else p.rerolls++; p.opts = rollRewards(this.kind); this.t = 0; save(); sfx('card'); } else sfx('deny'); }
      if (button(g, 'rwdeck', 520 + bx, 520, 240, 54, `병사 명부 · ${r.deck.length}`, { style: 'paper', size: 21 })) this.deck({});
      if (this.kind !== 'treasure' && this.kind !== 'boss' && button(g, 'skip', 776, 520, 240, 54, '건너뛴다 · 엽전 +15', { style: 'paper', size: 21 })) { this.taken = -2; r.gold += 15; r.pending = null; save(); sfx('coin'); }
    } else if (done && !this.sub) { this.doneT += dt; if (this.doneT > 0.7) this.finish(); }
  }
}

// ───────── 결과 한 줄 (사건·주막·장터가 함께 쓴다) ─────────
export function resultIcon(s) {
  const m = /(보물|부정|무기|패 강화:|명부에|병력 패|패) \[([^\]]+?)\+?\]/.exec(s); if (!m) return null;
  const name = m[2], find = tbl => Object.keys(tbl).find(k => tbl[k].name === name);
  if (m[1] === '보물' || m[1] === '부정') { const id = find(RELICS); return id ? (g, x, y) => relicIcon(g, id, x, y, 0.74) : null; }
  if (m[1] === '무기') { const id = find(WEAPONS); return id ? (g, x, y) => weaponIcon(g, id, x, y, 0.56) : null; }
  if (m[1] === '명부 병력') { const id = Object.keys(UNITS).find(k => UNITS[k].name === name); return id ? (g, x, y) => portrait(g, id, x, y + 20, 0.62) : null; }
  const id = Object.keys(CARDS).find(k => !isUnit({ id: k }) && CARDS[k].name === name); return id ? (g, x, y) => cardIcon(g, id, x, y, 0.74) : null;
}
// 결과 한 줄이 손해인지 가리는 낱말
// 얻은 물건(무기·보물·패)은 설명에 '-30%' 같은 글이 섞여 있어도 얻은 것이다
// 고개의 풍경 → 작은 무대의 걸개그림
export const BAD = /-\d|부정 \[|잡념/, GOOD = /씻겨|사라졌|^(무기|보물|패|병력 패|명부에|조련|패 강화)/;
// ───────── 이야기 한 장면: 두목의 사연, 영웅의 인연 (한 줄씩 눌러 넘긴다) ─────────
// lines: [[말하는 이(병종 id) 또는 null(해설), 글], …]
export class StoryOverlay extends Overlay {
  constructor(o) { super(); this.lines = o.lines; this.onDone = o.onDone; this.col = o.col || INDIGO; this.i = 0; this.pt = 0; }
  next() { if (this.left) return; if (this.i < this.lines.length - 1) { this.i++; this.pt = 0; sfx('card'); } else { this.left = true; this.onDone(); } }
  draw(g, dt) {
    const [who, s] = this.lines[this.i], k = clamp(this.pt / 0.22, 0, 1), t = this.t; this.pt += dt;
    dim(g, 0.78);
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

// ───────── 주막의 선택지 ─────────
export function restChoices() {
  const r = G.run;
  return [
    { id: 'rest', label: '푹 쉰다', desc: '다음 싸움 사기 +4로 시작', pick: () => ['뜨끈한 국밥에 다들 기운을 차렸습니다.', act.morale(4)] },
    // 수련: 병력·영웅 패는 +1단(조련), 전술 패는 강화판(+)으로 — 덱에서 하나를 고른다
    r.deck.some(c => canUp(c)) ? { id: 'train', label: '수련한다', desc: '병사 하나 +1단', deck: 'up', filter: c => canUp(c), story: '주막 마당에서 밤새 합을 맞추고 병법을 가다듬었습니다.' } : null,
    { id: 'feast', label: '잔치를 벌인다', cost: 90, desc: '엽전 90 → 병력 둘 +1단', pick: () => { act.gold(-90); return ['고기와 술이 돌자 사기가 하늘을 찌릅니다.', act.train(), act.train()]; } },
  ].filter(Boolean);
}
