// 보물 함 열기 연출: 인형극 무대 한가운데의 나전칠기 함과, 뚜껑이 터지듯 열릴 때의 빛살·충격파·엽전·오방색 종이꽃·금빛 구름무늬.
// 함은 앞에서 조금 내려다본 모습으로 그린다: 몸통 앞면, 뚜껑(앞면·윗면·안쪽 비단), 뚜껑이 뒤 경첩을 축으로 젖혀진다
import { TAU, clamp } from '../render/draw.js';

const BW = 60, BH = 64, D = 56, F = 24, K = 0.25;   // 몸통 반너비 · 몸통 높이 · 깊이 · 뚜껑 앞면 높이 · 내려다보는 기울기
const LAC = ['#9a3020', '#6e1c12', '#3a0c08'];      // 주칠: 위 · 가운데 · 아래
const BRASS = (g, y0, y1) => { const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, '#fbe7a0'); gr.addColorStop(0.45, '#d9a548'); gr.addColorStop(1, '#8a5a1c'); return gr; };
const BR_EDGE = '#3a2208';
export const OBANG5 = ['#c8402f', '#2f4d7e', '#e0b23c', '#f6efdc', '#2b2a30', '#3f8a6a', '#d98aa0'];

// 뚜껑 위 한 점 (경첩 기준 dd: 앞쪽이 음수, dh: 위쪽) 을 θ 만큼 젖혔을 때의 화면 y
const lidY = (dd, dh, th) => { const c = Math.cos(th), s = Math.sin(th), d2 = dd * c + dh * s, h2 = dh * c - dd * s; return -(BH + h2) - K * (D + d2); };
const sharp = (g, x0, y0, x1, y1, fill, stroke, lw) => { g.beginPath(); g.rect(x0, Math.min(y0, y1), x1 - x0, Math.abs(y1 - y0)); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } };
// 나전: 전복 껍데기처럼 빛깔이 도는 자개 꽃잎
function pearl(g, x, y, rx, ry, rot, a = 0.95) {
  const gr = g.createLinearGradient(x - rx, y - ry, x + rx, y + ry); gr.addColorStop(0, '#f4fbff'); gr.addColorStop(0.4, '#e6d6ff'); gr.addColorStop(0.7, '#cff5ea'); gr.addColorStop(1, '#fff2d8');
  g.save(); g.globalAlpha *= a; g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, TAU); g.fill(); g.restore();
}
// 자개 모란: 겹겹이 핀 탐스러운 꽃(바깥 여덟 잎 · 안쪽 여섯 잎 · 금빛 꽃술)과 양옆의 잎 — 나전칠기의 모란당초 무늬
function peony(g, x, y, r) {
  for (const sx of [-1, 1]) pearl(g, x + sx * r * 1.55, y + r * 0.35, r * 0.75, r * 0.32, sx * 0.5, 0.7);
  for (let k = 0; k < 8; k++) { const a = k / 8 * TAU + 0.2; pearl(g, x + Math.cos(a) * r * 0.86, y + Math.sin(a) * r * 0.7, r * 0.58, r * 0.42, a, 0.78); }
  for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + 0.5; pearl(g, x + Math.cos(a) * r * 0.45, y + Math.sin(a) * r * 0.36 - r * 0.08, r * 0.42, r * 0.33, a, 0.95); }
  g.fillStyle = '#f0c860'; for (const [dx, dy] of [[0, -0.1], [-0.18, 0.06], [0.18, 0.06]]) { g.beginPath(); g.arc(x + dx * r, y + dy * r, r * 0.13, 0, TAU); g.fill(); }
}
function rivet(g, x, y, r = 1.6) { g.fillStyle = BR_EDGE; g.beginPath(); g.arc(x + 0.3, y + 0.4, r, 0, TAU); g.fill(); g.fillStyle = '#fbe7a0'; g.beginPath(); g.arc(x, y, r * 0.8, 0, TAU); g.fill(); }
// 모서리 장석 (ㄱ 자 놋쇠판)
function corner(g, x, y, sx, sy) {
  g.beginPath(); g.moveTo(x, y); g.lineTo(x + sx * 18, y); g.lineTo(x + sx * 18, y + sy * 5); g.lineTo(x + sx * 5, y + sy * 5); g.lineTo(x + sx * 5, y + sy * 18); g.lineTo(x, y + sy * 18); g.closePath();
  g.fillStyle = BRASS(g, Math.min(y, y + sy * 18), Math.max(y, y + sy * 18)); g.fill(); g.strokeStyle = BR_EDGE; g.lineWidth = 1.1; g.stroke();
  rivet(g, x + sx * 2.6, y + sy * 2.6, 1.3); rivet(g, x + sx * 14, y + sy * 2.6, 1.1); rivet(g, x + sx * 2.6, y + sy * 14, 1.1);
}

// (x, y) = 몸통 앞면 아래 가운데. o: lid 뚜껑 각도(0 닫힘 ~ 1.8) · glow 함 속 빛 · lock 자물쇠 달아오름 · lockOff 자물쇠 없음 · leak 틈새 빛 · t · sx·sy 찌그러짐
export function drawChest(g, x, y, s, o = {}) {
  const th = o.lid || 0, glow = o.glow || 0, t = o.t || 0;
  g.save(); g.translate(x, y); g.rotate(o.rot || 0); g.scale(s * (o.sx || 1), s * (o.sy || 1));
  // 바닥 그림자
  g.fillStyle = 'rgba(0,0,0,0.5)'; g.beginPath(); g.ellipse(0, 3, BW + 14, 10, 0, 0, TAU); g.fill();
  const back = th > Math.PI / 2;
  if (back) lid(g, th, glow, t);
  // 열린 입: 안쪽 벽과, 빛 속에 가득한 엽전·구슬
  if (th > 0.02) {
    const y0 = -BH, y1 = -BH - K * D;
    sharp(g, -BW, y1, BW, y0, '#1a0a06');
    if (glow > 0) {
      g.save(); g.beginPath(); g.rect(-BW, y1, BW * 2, y0 - y1); g.clip();
      const gr = g.createRadialGradient(0, y0 - 4, 2, 0, y0 - 4, BW * 1.1); gr.addColorStop(0, `rgba(255,252,230,${glow})`); gr.addColorStop(0.5, `rgba(255,214,110,${glow * 0.9})`); gr.addColorStop(1, `rgba(200,120,40,${glow * 0.6})`); g.fillStyle = gr; g.fillRect(-BW, y1, BW * 2, y0 - y1);
      // 쌓인 엽전과 구슬
      for (let i = 0; i < 16; i++) { const cx = -BW + 8 + (i * 37 % 104), cy = y0 - 3 - (i % 3) * 3.4; g.fillStyle = i % 4 ? '#f0c850' : '#fff0a8'; g.beginPath(); g.ellipse(cx, cy, 6, 2.4, 0, 0, TAU); g.fill(); g.strokeStyle = 'rgba(120,70,10,0.6)'; g.lineWidth = 0.7; g.stroke(); }
      for (const [cx, cy, col] of [[-22, y0 - 8, '#e04848'], [16, y0 - 9, '#4a8ae0'], [36, y0 - 6, '#4ac08a'], [-40, y0 - 5, '#d070e0']]) { g.fillStyle = col; g.beginPath(); g.arc(cx, cy, 3.4, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.arc(cx - 1, cy - 1.2, 1.1, 0, TAU); g.fill(); }
      g.restore();
    }
    // 몸통 윗전 (놋쇠 테)
    g.fillStyle = BRASS(g, y0 - 2, y0 + 2); g.fillRect(-BW, y0 - 1.6, BW * 2, 3.2);
    g.fillStyle = '#4a1a10'; g.fillRect(-BW, y1, 3, y0 - y1); g.fillRect(BW - 3, y1, 3, y0 - y1);
  }
  body(g, t);
  if (!back) lid(g, th, glow, t);
  // 틈새 빛: 뚜껑과 몸통 사이 줄, 그리고 새어 나가는 빛줄기
  const leak = o.leak || 0;
  if (leak > 0 && th < 0.6) {
    const gy = lidY(-D, 0, th), y0 = -BH;
    g.save(); g.globalCompositeOperation = 'lighter';
    g.fillStyle = `rgba(255,246,208,${Math.min(1, leak * 1.2)})`; g.fillRect(-BW, Math.min(gy, y0) - 1.2, BW * 2, Math.abs(gy - y0) + 2.4);
    const lg = g.createLinearGradient(0, y0 - 18, 0, y0 + 18); lg.addColorStop(0, 'rgba(255,220,140,0)'); lg.addColorStop(0.5, `rgba(255,220,140,${0.55 * leak})`); lg.addColorStop(1, 'rgba(255,220,140,0)'); g.fillStyle = lg; g.fillRect(-BW - 10, y0 - 18, BW * 2 + 20, 36);
    for (let k = 0; k < 9; k++) {
      const bx = -BW + 8 + k * (BW * 2 - 16) / 8, a = -Math.PI / 2 + (bx / BW) * 0.9 + Math.sin(t * 7 + k * 2.3) * 0.08, len = (50 + 40 * Math.abs(Math.sin(k * 1.7 + t * 3))) * (0.6 + leak), w = 3 + (k % 3) * 1.6;
      const ex = bx + Math.cos(a) * len, ey = y0 + Math.sin(a) * len, gr = g.createLinearGradient(bx, y0, ex, ey); gr.addColorStop(0, `rgba(255,236,170,${0.5 * leak})`); gr.addColorStop(1, 'rgba(255,236,170,0)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(bx - w * 0.3, y0); g.lineTo(ex - Math.sin(a) * w, ey + Math.cos(a) * w); g.lineTo(ex + Math.sin(a) * w, ey - Math.cos(a) * w); g.lineTo(bx + w * 0.3, y0); g.closePath(); g.fill();
    }
    g.restore();
  }
  if (!o.lockOff && th < 0.5) lock(g, o.lock || 0, t);
  g.restore();
}
// 몸통 앞면: 주칠 바탕, 오목한 판에 자개 모란과 넝쿨, 네 모서리 장석, 아래 받침과 발
function body(g, t) {
  const gr = g.createLinearGradient(0, -BH, 0, 0); gr.addColorStop(0, LAC[0]); gr.addColorStop(0.5, LAC[1]); gr.addColorStop(1, LAC[2]);
  sharp(g, -BW, -BH, BW, 0, gr, '#1a0604', 1.6);
  // 옻칠 윤기: 비스듬한 빛 한 줄기가 천천히 지나간다
  { g.save(); g.beginPath(); g.rect(-BW, -BH, BW * 2, BH); g.clip(); const sx = ((t * 40) % 260) - 130; const sh = g.createLinearGradient(sx - 30, 0, sx + 30, 0); sh.addColorStop(0, 'rgba(255,240,220,0)'); sh.addColorStop(0.5, 'rgba(255,240,220,0.14)'); sh.addColorStop(1, 'rgba(255,240,220,0)'); g.fillStyle = sh; g.beginPath(); g.moveTo(sx - 40, 0); g.lineTo(sx + 10, -BH); g.lineTo(sx + 50, -BH); g.lineTo(sx, 0); g.closePath(); g.fill(); g.restore(); }
  // 오목한 판
  g.strokeStyle = 'rgba(20,4,2,0.7)'; g.lineWidth = 1.6; g.strokeRect(-BW + 9, -BH + 13, BW * 2 - 18, BH - 24);
  g.strokeStyle = 'rgba(255,190,150,0.22)'; g.lineWidth = 1; g.strokeRect(-BW + 10.5, -BH + 14.5, BW * 2 - 21, BH - 27);
  // 자개: 넝쿨 줄기와 모란
  g.strokeStyle = 'rgba(232,240,255,0.75)'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(-44, -16); g.quadraticCurveTo(-30, -36, -12, -22); g.quadraticCurveTo(2, -12, 14, -24); g.quadraticCurveTo(28, -38, 44, -20); g.stroke();
  for (const [cx, cy, a] of [[-26, -29, 0.6], [6, -18, -0.4], [32, -31, 0.3], [-40, -19, -0.8]]) pearl(g, cx, cy, 4.2, 1.8, a, 0.85);
  peony(g, -14, -24, 5.6); peony(g, 26, -23, 6.2); peony(g, -40, -30, 3.8);
  // 아래 받침과 발
  g.fillStyle = BRASS(g, -6, 0); g.fillRect(-BW, -5, BW * 2, 5); g.strokeStyle = BR_EDGE; g.lineWidth = 1; g.strokeRect(-BW, -5, BW * 2, 5);
  for (let k = -4; k <= 4; k++) rivet(g, k * 13, -2.5, 1);
  for (const sx of [-1, 1]) { g.fillStyle = '#2a0c06'; g.fillRect(sx * (BW - 10) - 6, 0, 12, 4); }
  corner(g, -BW, -BH, 1, 1); corner(g, BW, -BH, -1, 1); corner(g, -BW, -5, 1, -1); corner(g, BW, -5, -1, -1);
}
// 뚜껑: 안쪽은 붉은 비단(열리면 함 속 빛을 받는다), 윗면과 앞면은 주칠에 놋쇠 테
function lid(g, th, glow, t) {
  const c = Math.cos(th), s = Math.sin(th);
  const under = s - K * c > 0, top = -s + K * c > 0, front = c + K * s > 0;
  if (under) {
    const y0 = lidY(0, 0, th), y1 = lidY(-D, 0, th), gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, glow > 0 ? '#e8806a' : '#8a1f24'); gr.addColorStop(1, '#5a1016');
    sharp(g, -BW, y0, BW, y1, gr, '#1a0604', 1.4);
    g.strokeStyle = 'rgba(240,200,110,0.8)'; g.lineWidth = 1.2; g.strokeRect(-BW + 6, Math.min(y0, y1) + 4, BW * 2 - 12, Math.max(0, Math.abs(y1 - y0) - 8));
    if (glow > 0 && Math.abs(y1 - y0) > 12) { g.save(); g.globalCompositeOperation = 'lighter'; const lg = g.createLinearGradient(0, y0, 0, y1); lg.addColorStop(0, `rgba(255,220,150,${0.6 * glow})`); lg.addColorStop(1, 'rgba(255,220,150,0)'); g.fillStyle = lg; g.fillRect(-BW, Math.min(y0, y1), BW * 2, Math.abs(y1 - y0)); g.restore();
      // 비단에 수놓은 금실 구름
      g.strokeStyle = 'rgba(250,214,120,0.75)'; g.lineWidth = 1.2; const my = (y0 + y1) / 2; for (const sx of [-1, 1]) { g.beginPath(); g.arc(sx * 24, my, 7, 0, Math.PI * 1.6); g.stroke(); g.beginPath(); g.moveTo(sx * 24 + 7, my); g.quadraticCurveTo(sx * 38, my + 8, sx * 46, my - 2); g.stroke(); } }
  }
  if (top) {
    const y0 = lidY(0, F, th), y1 = lidY(-D, F, th), gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, '#5a160e'); gr.addColorStop(1, '#a8402a');
    sharp(g, -BW, y0, BW, y1, gr, '#1a0604', 1.4);
    g.fillStyle = 'rgba(255,220,190,0.18)'; g.fillRect(-BW + 4, Math.min(y0, y1) + 2, BW * 2 - 8, 2);
    for (let k = -3; k <= 3; k++) pearl(g, k * 15, (y0 + y1) / 2, 3.2, 1.3, 0, 0.8);
    g.fillStyle = BRASS(g, y1 - 1, y1 + 1); g.fillRect(-BW, y1 - 1.4, BW * 2, 2.8);
  }
  if (front) {
    const y0 = lidY(-D, 0, th), y1 = lidY(-D, F, th), hgt = Math.abs(y0 - y1);
    if (hgt > 0.6) {
      const ya = Math.min(y0, y1), gr = g.createLinearGradient(0, ya, 0, ya + hgt); gr.addColorStop(0, LAC[0]); gr.addColorStop(1, LAC[1]);
      sharp(g, -BW, y0, BW, y1, gr, '#1a0604', 1.4);
      if (hgt > 8) {
        g.fillStyle = BRASS(g, ya, ya + 3); g.fillRect(-BW, ya, BW * 2, 2.6); g.fillRect(-BW, ya + hgt - 2.6, BW * 2, 2.6);
        g.save(); g.translate(0, ya); g.scale(1, hgt / F);
        for (let k = -2; k <= 2; k++) if (k) peony(g, k * 20, F / 2, 3.2);
        corner(g, -BW, 0, 1, 1); corner(g, BW, 0, -1, 1);
        g.restore();
      }
    }
  }
}
// 나비 장석과 자물쇠: 달아오르면 흰 금빛으로 빛난다
function lock(g, heat, t) {
  const cy = -BH + 9;
  if (heat > 0) { g.save(); g.globalCompositeOperation = 'lighter'; const r = 22 + 26 * heat, gr = g.createRadialGradient(0, cy, 1, 0, cy, r); gr.addColorStop(0, `rgba(255,240,180,${0.85 * heat})`); gr.addColorStop(1, 'rgba(255,200,100,0)'); g.fillStyle = gr; g.fillRect(-r, cy - r, r * 2, r * 2); g.restore(); }
  // 나비 장석
  g.save(); g.translate(0, cy);
  const plate = BRASS(g, -10, 10);
  for (const sx of [-1, 1]) { g.fillStyle = plate; g.strokeStyle = BR_EDGE; g.lineWidth = 1; g.beginPath(); g.ellipse(sx * 9, -4, 9.5, 6.5, sx * 0.45, 0, TAU); g.fill(); g.stroke(); g.beginPath(); g.ellipse(sx * 7.5, 6, 7, 5, -sx * 0.45, 0, TAU); g.fill(); g.stroke(); g.strokeStyle = 'rgba(90,50,10,0.6)'; g.lineWidth = 0.7; g.beginPath(); g.ellipse(sx * 9, -4, 5.4, 3.4, sx * 0.45, 0, TAU); g.stroke(); }
  g.fillStyle = plate; g.beginPath(); g.ellipse(0, 1, 3.2, 10, 0, 0, TAU); g.fill(); g.strokeStyle = BR_EDGE; g.stroke();
  // 걸쇠와 자물쇠 (가로로 긴 통)
  g.fillStyle = BRASS(g, -12, 0); g.fillRect(-3.4, -12, 6.8, 12); g.strokeStyle = BR_EDGE; g.strokeRect(-3.4, -12, 6.8, 12);
  const hot = heat > 0 ? `rgb(255,${Math.round(214 + 40 * heat)},${Math.round(120 + 120 * heat)})` : null;
  g.beginPath(); g.moveTo(-15, -1); g.lineTo(15, -1); g.arc(15, 3.5, 4.5, -Math.PI / 2, Math.PI / 2); g.lineTo(-15, 8); g.arc(-15, 3.5, 4.5, Math.PI / 2, Math.PI * 1.5); g.closePath();
  g.fillStyle = hot || BRASS(g, -1, 8); g.fill(); g.strokeStyle = BR_EDGE; g.lineWidth = 1.2; g.stroke();
  g.fillStyle = 'rgba(255,255,240,0.55)'; g.fillRect(-13, 0, 26, 1.4);
  g.fillStyle = heat > 0.5 ? '#fff8d0' : '#3a2208'; g.fillRect(-1, 2, 2, 4);
  g.restore();
}
// 떨어져 나간 자물쇠 (파편으로 날아간다)
export function lockPiece(g, x, y, s, rot) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  g.beginPath(); g.moveTo(-15, -4.5); g.lineTo(15, -4.5); g.arc(15, 0, 4.5, -Math.PI / 2, Math.PI / 2); g.lineTo(-15, 4.5); g.arc(-15, 0, 4.5, Math.PI / 2, Math.PI * 1.5); g.closePath();
  g.fillStyle = BRASS(g, -5, 5); g.fill(); g.strokeStyle = BR_EDGE; g.lineWidth = 1.2; g.stroke();
  g.strokeStyle = '#d9a548'; g.lineWidth = 2.4; g.beginPath(); g.arc(0, -5, 8, Math.PI, TAU); g.stroke();
  g.restore();
}

// ── 터지는 순간의 꾸밈: 엽전 · 종이꽃 · 불티 · 충격파 · 금빛 구름무늬 ──
export class ChestFX {
  constructor() { this.p = []; this.rings = []; this.clouds = []; }
  burst(x, y, k = 1) {
    const R = Math.random;
    // 엽전: 위로 부채꼴로 솟구쳐 화면 높이까지 오르고, 무겁게 떨어지며 사라진다
    for (let i = 0; i < Math.round(46 * k); i++) { const a = -Math.PI / 2 + (R() - 0.5) * 2.7, v = 540 + R() * 620; this.p.push({ kind: 'coin', x: x + (R() - 0.5) * 70, y, vx: Math.cos(a) * v * 0.95, vy: Math.sin(a) * v, g: 1350, spin: R() * TAU, sv: 7 + R() * 9, r: 8 + R() * 4, life: 1.35 + R() * 0.6, age: 0 }); }
    // 무거운 엽전 꾸러미: 양옆으로 크게 휘어 무대 끝까지 날아간다
    for (let i = 0; i < Math.round(8 * k); i++) { const sd = i % 2 ? 1 : -1, a = -Math.PI / 2 + sd * (0.75 + R() * 0.45), v = 820 + R() * 380; this.p.push({ kind: 'coin', x: x + sd * 20, y: y - 6, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 1100, spin: R() * TAU, sv: 4 + R() * 4, r: 12 + R() * 4, life: 1.6 + R() * 0.4, age: 0 }); }
    // 오방색 종이꽃: 넓게 흩뿌려져 바람을 타고 천천히 내려앉는다
    for (let i = 0; i < Math.round(130 * k); i++) { const a = -Math.PI / 2 + (R() - 0.5) * 3.0, v = 520 + R() * 820; this.p.push({ kind: 'paper', x: x + (R() - 0.5) * 80, y: y - 10, vx: Math.cos(a) * v * 1.15, vy: Math.sin(a) * v, col: OBANG5[i % OBANG5.length], w: 5 + R() * 6, h: 9 + R() * 8, rot: R() * TAU, rv: (R() - 0.5) * 9, flip: R() * TAU, fv: 5 + R() * 8, sway: R() * TAU, life: 2.4 + R() * 1.2, age: 0 }); }
    for (let i = 0; i < Math.round(56 * k); i++) { const a = R() * TAU, v = 320 + R() * 760; this.p.push({ kind: 'spark', x, y: y - 20, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.8 - 180, life: 0.5 + R() * 0.6, age: 0 }); }
    this.rings.push({ x, y, age: 0, life: 0.7, r1: 760 * k, w: 28 }, { x, y: y - 50, age: -0.07, life: 0.6, r1: 430 * k, w: 13, round: true });
    const n = Math.round(6 * k); for (let i = 0; i < n; i++) { const a = -Math.PI * (0.06 + 0.88 * i / Math.max(1, n - 1)) + (R() - 0.5) * 0.12; this.clouds.push({ x, y: y - 40, a, age: -i * 0.03, life: 1.5, d: 230 + R() * 150, s: 1.05 + R() * 0.4, dir: Math.cos(a) > 0 ? 1 : -1 }); }
  }
  lock(x, y) { this.p.push({ kind: 'lock', x, y, vx: 200 + Math.random() * 70, vy: -620, g: 1700, spin: 0, sv: 13, life: 1.05, age: 0 }); }
  update(dt) {
    for (const p of this.p) {
      p.age += dt;
      if (p.kind === 'paper') { p.vx *= Math.exp(-2.4 * dt); p.vy = (p.vy + 520 * dt) * Math.exp(-3.2 * dt); p.x += (p.vx + Math.sin(p.age * 3.2 + p.sway) * 46) * dt; p.y += p.vy * dt; p.rot += p.rv * dt; p.flip += p.fv * dt; }   // 종이는 바람을 타고 천천히 내려앉는다
      else if (p.kind === 'spark') { p.vx *= Math.max(0, 1 - 2.6 * dt); p.vy = p.vy * Math.max(0, 1 - 2.6 * dt) + 420 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
      else { p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.spin += p.sv * dt; }
    }
    this.p = this.p.filter(p => p.age < p.life && p.y < 900 && (p.kind !== 'lock' || p.y < 620));
    for (const r of this.rings) r.age += dt; this.rings = this.rings.filter(r => r.age < r.life);
    for (const c of this.clouds) c.age += dt; this.clouds = this.clouds.filter(c => c.age < c.life);
  }
  // 고를 것들 뒤에 그린다: 충격파와 금빛 구름무늬
  drawBack(g) {
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const r of this.rings) {
      if (r.age < 0) continue; const q = r.age / r.life, e = 1 - (1 - q) ** 3, rad = r.r1 * e, a = (1 - q) ** 1.6;
      // 번진 빛 고리 (안쪽이 밝고 바깥으로 흐려진다)
      g.save(); g.translate(r.x, r.y); if (!r.round) g.scale(1, 0.3);
      const w = r.w * 2.4 * (1 - q) + 8, gr = g.createRadialGradient(0, 0, Math.max(0, rad - w), 0, 0, rad + w * 0.5);
      gr.addColorStop(0, 'rgba(255,236,180,0)'); gr.addColorStop(0.62, `rgba(255,236,180,${0.5 * a})`); gr.addColorStop(0.8, `rgba(255,252,236,${0.75 * a})`); gr.addColorStop(1, 'rgba(255,236,180,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rad + w * 0.5, 0, TAU); g.arc(0, 0, Math.max(0, rad - w), 0, TAU, true); g.fill(); g.restore();
    }
    g.restore();
    for (const c of this.clouds) {
      if (c.age < 0) continue; const q = c.age / c.life, e = 1 - (1 - Math.min(1, q * 1.6)) ** 3, draw = Math.min(1, q * 4.5), fade = q < 0.6 ? 1 : 1 - (q - 0.6) / 0.4;
      const cx = c.x + Math.cos(c.a) * c.d * e, cy = c.y + Math.sin(c.a) * c.d * e * 0.8;
      g.save(); g.translate(cx, cy); g.scale(c.s * (0.6 + 0.4 * e) * c.dir, c.s * (0.6 + 0.4 * e)); g.rotate(c.a * 0.3); g.globalAlpha = fade;
      cloudScroll(g, draw); g.restore();
    }
  }
  // 함 앞에 그린다 (고를 것들보다는 뒤): 엽전 · 종이꽃 · 불티 · 자물쇠
  drawFront(g) {
    for (const p of this.p) {
      const fade = clamp((p.life - p.age) / 0.5, 0, 1);
      if (p.kind === 'coin') coin(g, p.x, p.y, p.r * (0.7 + 0.3 * fade), p.spin, fade);
      // 떨어져 나간 자물쇠: 빙글 돌며 떨어지고, 무대 앞판 높이(구경꾼 머리)에 닿기 전에 사라진다
      else if (p.kind === 'lock') { const a = clamp((p.life - p.age) / 0.35, 0, 1) * clamp((600 - p.y) / 60, 0, 1); if (a > 0) { g.save(); g.globalAlpha = a; lockPiece(g, p.x, p.y, 1.6, p.spin); g.restore(); } }
      else if (p.kind === 'paper') {
        g.save(); g.globalAlpha = fade; g.translate(p.x, p.y); g.rotate(p.rot); const f = Math.cos(p.flip); g.scale(1, Math.abs(f) < 0.15 ? 0.15 * Math.sign(f || 1) : f);
        g.fillStyle = p.col; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); g.fillStyle = f > 0 ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.25)'; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * 0.35); g.restore();
      }
    }
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    for (const p of this.p) if (p.kind === 'spark') { const a = clamp(1 - p.age / p.life, 0, 1); g.strokeStyle = `rgba(255,${200 + Math.round(55 * a)},${120 + Math.round(100 * a)},${a})`; g.lineWidth = 2.6 * a + 0.6; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035); g.stroke(); }
    g.restore();
  }
}
// 엽전: 가운데 네모 구멍, 돌면서 납작해진다
export function coin(g, x, y, r, spin, a = 1) {
  const f = Math.cos(spin), rx = Math.max(1.2, r * Math.abs(f));
  g.save(); g.globalAlpha *= a; g.translate(x, y);
  const gr = g.createLinearGradient(-rx, -r, rx, r); gr.addColorStop(0, '#fff3b0'); gr.addColorStop(0.5, f > 0 ? '#e4b44a' : '#c8922e'); gr.addColorStop(1, '#8a5a1c');
  g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, rx, r, 0, 0, TAU); g.fill(); g.strokeStyle = '#5a3a10'; g.lineWidth = 1.1; g.stroke();
  if (rx > 3) { const h = r * 0.34, hx = h * rx / r; g.fillStyle = '#3a2208'; g.fillRect(-hx, -h, hx * 2, h * 2); g.strokeStyle = 'rgba(255,240,190,0.6)'; g.lineWidth = 0.8; g.beginPath(); g.ellipse(0, 0, rx * 0.72, r * 0.72, 0, 0, TAU); g.stroke(); }
  g.restore();
}
// 상서로운 구름무늬(운문): 구름머리는 세 송이가 겹쳐 안으로 말려 든 소용돌이(가운데가 가장 크다), 그 밑을 받치는 밑선,
// 왼쪽 아래로 길게 흘러 나가며 가늘어지는 꼬리. 꼬리 → 밑선 → 세 송이 차례로 붓을 놀리듯 그려진다
const CLOUD = (() => {
  const curl = (cx, cy, R, a0, dir, turns, n = 26) => { const o = []; for (let i = 0; i <= n; i++) { const v = i / n, a = a0 + dir * v * turns * TAU, r = R * (1 - 0.78 * v); o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return o; };
  const tail = []; for (let i = 0; i <= 24; i++) { const v = i / 24; tail.push([-30 - 78 * v, 15 + 8 * v + Math.sin(v * Math.PI * 1.6) * 7]); }
  tail.reverse();   // 꼬리 끝에서 구름머리 쪽으로 그어 온다
  const base = []; for (let i = 0; i <= 16; i++) { const v = i / 16; base.push([-30 + 62 * v, 16 + Math.sin(v * Math.PI) * 4]); }
  return [
    { pts: tail, w: 5.2, from: 0, to: 0.3 },
    { pts: base, w: 4.4, from: 0.18, to: 0.45 },
    { pts: curl(-23, 3, 14, Math.PI * 0.55, 1, 1.15), w: 5.6, from: 0.3, to: 0.7 },
    { pts: curl(1, -8, 18, Math.PI * 0.8, 1, 1.2), w: 6.4, from: 0.42, to: 0.85 },
    { pts: curl(26, 4, 13, Math.PI * 0.45, -1, 1.15), w: 5.4, from: 0.55, to: 1 },
  ];
})();
function brush(g, pts, n, wmax, col, extra) {
  g.strokeStyle = col; g.lineCap = 'round';
  for (let i = 0; i < n - 1; i++) { const u = i / (pts.length - 1), w = wmax * (0.22 + 0.78 * Math.sin(Math.PI * Math.min(1, u * 1.15))); g.lineWidth = w + extra; g.beginPath(); g.moveTo(pts[i][0], pts[i][1]); g.lineTo(pts[i + 1][0], pts[i + 1][1]); g.stroke(); }
}
function cloudScroll(g, draw) {
  for (const pass of [['rgba(80,44,8,0.8)', 3.4, 1], ['#f3cf6a', 0, 1], ['rgba(255,252,226,0.95)', 0, 0.3]])
    for (const st of CLOUD) { const k = clamp((draw - st.from) / (st.to - st.from), 0, 1), n = Math.floor(st.pts.length * k); if (n > 1) brush(g, st.pts, n, st.w * pass[2], pass[0], pass[1]); }
}
