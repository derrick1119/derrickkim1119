// 승급: 4단에 오른 병력 패가 두 갈래 중 하나를 고른다. 갈래마다 새 이름·무기·싸우는 방식이 생긴다 (data/branches.js)
// 왼쪽에 지금의 패, 오른쪽에 두 갈래의 무대(그 갈래의 인형과 무기, 빌드 축, 바뀌는 수치)가 선다
import { W, H } from '../config.js';
import { TAU, INK, FONT_B, text, textBlock, ell, rr, clamp, easeOutBack } from '../render/draw.js';
import { button, panel, brushTitle, goldText, foil, shine, stamp, C } from './ui.js';
import { cardFace } from './cards.js';
import { Overlay } from './overlays.js';
import { G, save, unitStats, pendingPromos, promote } from '../state.js';
import { CARDS, cardName } from '../data/cards.js';
import { UNITS } from '../data/units.js';
import { BRANCHES, AXES, branchOf } from '../data/branches.js';
import { portrait } from '../render/sprites.js';
import { symbol } from '../render/symbols.js';
import { sfx } from '../audio.js';
import { juice } from './juice.js';

const PX = [330, 800], PY = 120, PW = 440, PH = 520;
const BIG = { knight: 1.75, cannon: 1.75 };
export class PromoOverlay extends Overlay {
  constructor(o) { super(); this.onDone = o.onDone; this.list = pendingPromos().map(c => c.uid); this.total = this.list.length; this.i = 0; this.picked = null; this.pt = 0; }
  get card() { const uid = this.list[this.i]; return G.run.deck.find(c => c.uid === uid) || null; }
  choose(B) { const c = this.card; if (!c || this.picked) return; if (!promote(c.uid, B.id)) return; this.picked = B.id; this.pt = 0; sfx('star'); const n = BRANCHES[B.type].indexOf(B); juice.burst(PX[n] + PW / 2, PY + 200, '#f0d264', 18); }
  next() { this.picked = null; this.i++; this.t = 0; while (this.i < this.list.length && !this.card) this.i++; if (this.i >= this.list.length) { if (!this.left) { this.left = true; save(); this.onDone(); } } }
  draw(g, dt) {
    const c = this.card; if (!c) { this.next(); return; }
    const t = this.t, type = CARDS[c.id].unit, brs = BRANCHES[type], k = easeOutBack(clamp(t / 0.4, 0, 1));
    if (this.picked) { this.pt += dt; if (this.pt > 1.1) { this.next(); return; } }
    // 바탕: 어둡게 덮고 가운데에 금빛 빛무리, 천천히 도는 빛살
    g.fillStyle = 'rgba(10,8,18,0.86)'; g.fillRect(0, 0, W, H);
    g.save(); g.globalCompositeOperation = 'lighter'; const sp = g.createRadialGradient(640, 330, 40, 640, 330, 620); sp.addColorStop(0, 'rgba(255,200,120,0.2)'); sp.addColorStop(1, 'rgba(255,200,120,0)'); g.fillStyle = sp; g.fillRect(0, 0, W, H);
    g.translate(640, 360); g.rotate(t * 0.04); for (let q = 0; q < 14; q++) { g.rotate(TAU / 14); const bg = g.createLinearGradient(0, 0, 0, -700); bg.addColorStop(0, 'rgba(255,220,150,0.06)'); bg.addColorStop(1, 'rgba(255,220,150,0)'); g.fillStyle = bg; g.beginPath(); g.moveTo(0, 0); g.lineTo(-70, -700); g.lineTo(70, -700); g.closePath(); g.fill(); } g.restore();
    brushTitle(g, 640, 48, 380, 62, '승급', '#8a2a26', 38);
    text(g, `4단에 오른 병력이 갈래를 고릅니다${this.total > 1 ? `  (${this.i + 1} / ${this.total})` : ''}`, 640, 96, { size: 18, fill: '#e8dcc0' });
    // 지금의 패
    g.save(); g.globalAlpha = Math.min(1, t * 3); cardFace(g, c, 58, 190, 230, 318); g.restore();
    text(g, UNITS[type].name, 173, 534, { size: 20, font: FONT_B, fill: '#f3e6c4' });
    text(g, '두 갈래 중 하나로', 173, 560, { size: 15, fill: '#cbb894' });
    // 두 갈래의 무대
    brs.forEach((B, n) => {
      const x = PX[n], y = PY + (1 - k) * 30 + (n ? 0 : 0), on = this.picked === B.id, off = this.picked && !on, ax = AXES[B.axis] || AXES.wall, cx = x + PW / 2;
      g.save(); g.globalAlpha = clamp((t - n * 0.08) / 0.3, 0, 1) * (off ? 0.35 : 1);
      if (on) { g.save(); g.globalCompositeOperation = 'lighter'; const hg = g.createRadialGradient(cx, y + PH / 2, 60, cx, y + PH / 2, 360); hg.addColorStop(0, 'rgba(255,210,130,0.35)'); hg.addColorStop(1, 'rgba(255,210,130,0)'); g.fillStyle = hg; g.fillRect(x - 120, y - 120, PW + 240, PH + 240); g.restore(); }
      panel(g, x, y, PW, PH);
      // 머리띠: 옻칠 바탕에 금박 이름, 오른쪽에 빌드 축
      rr(g, x + 16, y + 16, PW - 32, 56, 8, '#2a1418', '#000', 1.6); rr(g, x + 19, y + 19, PW - 38, 50, 6, null, foil(g, x, x + PW), 1.4);
      goldText(g, B.name, x + 34, y + 45, { size: 30, align: 'left', maxW: 230, glow: false });
      rr(g, x + PW - 132, y + 30, 100, 28, 6, ax.col, '#000', 1.2); symbol(g, ax.sym, x + PW - 114, y + 44, 18, C.cream); text(g, ax.name, x + PW - 72, y + 45, { size: 16, font: FONT_B, fill: C.cream });
      // 무대: 축 빛깔의 하늘 아래 그 갈래의 인형이 새 무기를 들고 선다
      const sx = x + 16, sy = y + 80, sw = PW - 32, sh = 196;
      g.save(); rr(g, sx, sy, sw, sh, 6, null); g.beginPath(); g.rect(sx, sy, sw, sh); g.clip();
      const sk = g.createLinearGradient(0, sy, 0, sy + sh); sk.addColorStop(0, ax.col); sk.addColorStop(1, '#f3e2b0'); g.globalAlpha *= 0.9; g.fillStyle = sk; g.fillRect(sx, sy, sw, sh); g.globalAlpha = off ? 0.35 : 1;
      g.save(); g.globalAlpha *= 0.22; g.translate(cx, sy + sh); for (let q = 0; q < 9; q++) { g.rotate(0.35); g.fillStyle = '#fff4d0'; g.fillRect(-3, -sh * 1.4, 6, sh * 1.4); } g.restore();
      g.fillStyle = 'rgba(60,70,40,0.35)'; g.fillRect(sx, sy + sh - 34, sw, 34); ell(g, cx, sy + sh - 20, 80, 10, 'rgba(20,14,8,0.35)');
      portrait(g, type, cx, sy + sh - 18 + (on ? -Math.abs(Math.sin(this.pt * 9)) * 10 : 0), BIG[type] || 2.15, t, true, c.wpn || B.arm || undefined);
      g.restore(); rr(g, sx, sy, sw, sh, 6, null, '#2a1a10', 2);
      // 설명과 효과
      text(g, B.desc, cx, y + 302, { size: 21, font: FONT_B, fill: '#3a2a1a', maxW: PW - 50 });
      const lines = B.tip.split(', ');
      lines.forEach((ln, q) => { const ly = y + 330 + q * 26; rr(g, x + 40, ly - 4, 8, 8, 1.5, ax.col); text(g, ln, x + 58, ly + 1, { size: 17, align: 'left', fill: '#2a2620', maxW: PW - 86 }); });
      // 바뀌는 수치
      const a = unitStats(type, c.lv || 1, c.wpn), b = unitStats(type, c.lv || 1, c.wpn, B.id), heal = !!UNITS[type].heal;
      const st2 = (lab, p, q) => `${lab} ${p}${p !== q ? ' → ' + q : ''}`;
      rr(g, x + 30, y + 418, PW - 60, 30, 6, 'rgba(60,40,20,0.08)', 'rgba(60,40,20,0.25)', 1);
      text(g, `${st2('체력', a.hp, b.hp)}  ·  ${st2(heal ? '치유' : '공격', a.atk, b.atk)}`, cx, y + 434, { size: 16, fill: '#5a4030', maxW: PW - 80 });
      g.restore();
      if (!this.picked && t > 0.45 && button(g, 'pr' + n, x + 40, y + PH - 66, PW - 80, 52, '이 길로 승급', { style: 'red', size: 22 })) this.choose(B);
      if (on) { const q = clamp(this.pt / 0.3, 0, 1); g.save(); g.globalAlpha = q; stamp(g, x + PW - 70, y + PH - 92, 40 * (1.6 - 0.6 * q), 'get', '#b8322a', -0.16); g.restore(); shine(g, x, y, PW, PH, 10, 1.2, 0.3); }
    });
  }
}
