// 파티클과 화면 효과 (먹·종이 느낌)
import { TAU, INK, PAPER, FONT_B, text, poly, ell, rr, st, line, drawSprite, makeCanvas } from './draw.js';
import { drawInk, MEOK } from './ink.js';
import { inkGlyph } from './symbols.js';

// 빛: 색마다 한 번 구운 둥근 빛 한 장을 더해 그린다 (매번 그라데이션을 만들지 않아 가볍다)
const GLOW = new Map();
function glowImg(col) {
  if (!/^#[0-9a-f]{6}$/i.test(col)) col = '#ffc870';
  let c = GLOW.get(col); if (c) return c;
  c = makeCanvas(64, 64); const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, col); gr.addColorStop(0.25, col + 'b0'); gr.addColorStop(0.6, col + '30'); gr.addColorStop(1, col + '00');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); GLOW.set(col, c); return c;
}
export function glow(g, x, y, r, col, a = 1) { if (a <= 0.01 || r <= 0) return; const op = g.globalCompositeOperation, ga = g.globalAlpha; g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.min(1, a); g.drawImage(glowImg(col), x - r, y - r, r * 2, r * 2); g.globalCompositeOperation = op; g.globalAlpha = ga; }
const easeOut = t => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

export class Fx {
  constructor() { this.p = []; this.shake = 0; this.flash = 0; this.flashCol = '#fff'; }
  add(o) { o.t = 0; this.p.push(o); return o; }
  clear() { this.p.length = 0; this.shake = 0; this.flash = 0; }
  // 행군할 때 바닥에 붙은 것들은 바닥과 함께 뒤로 흐른다
  shift(dx) { for (const p of this.p) if (p.ground) p.x -= dx; }
  update(dt) {
    this.clock = (this.clock || 0) + dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 28);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 3.2);
    for (const p of this.p) { p.t += dt; if (p.vx) p.x += p.vx * dt; if (p.vy) p.y += p.vy * dt; if (p.g) p.vy += p.g * dt; if (p.drag) { const k = Math.exp(-p.drag * dt); p.vx *= k; p.vy *= k; } }
    if (this.p.length) this.p = this.p.filter(p => p.t < p.life);
  }
  burst(x, y, n, col, spd = 120, size = 3.2) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = spd * (0.4 + Math.random() * 0.8); this.add({ k: 'dot', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30, g: 260, life: 0.3 + Math.random() * 0.25, col, size: size * (0.6 + Math.random() * 0.7) }); } }
  puff(x, y, n = 4, col = PAPER, size = 9) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = 20 + Math.random() * 40; this.add({ k: 'puff', x: x + Math.cos(a) * 4, y: y + Math.sin(a) * 3, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.6 - 18, drag: 3, life: 0.35 + Math.random() * 0.25, col, size: size * (0.7 + Math.random() * 0.6) }); } }
  // 옅은 빛 번짐: 종이 위라서 빛은 아껴 쓴다 (빛줄기 없이 부드러운 둥근 빛만)
  flare(x, y, size = 40, col = '#ffc870', life = 0.28) { this.add({ k: 'flare', x, y, size, col, life }); }
  // 타격 한 번: 먹 붓질 + 찢긴 종잇조각 + 먹 방울. 큰 타격에는 붉은 낙관이 탁 찍힌다
  hit(x, y, big = false, ink = MEOK, warm = '#ffc870') {
    this.slash(x, y, big ? 40 : 24, ink, -0.5 + (Math.random() - 0.5) * 1.2);
    this.chips(x, y, big ? 7 : 3, ['#fbf3df', '#efe2c4', '#e9d7b0'], big ? 240 : 160);
    if (big) { this.splat(x + (Math.random() - 0.5) * 8, y + 4, 0.34, ink, 0.5); this.flare(x, y, 30, warm, 0.2); const now = this.clock || 0; if (now - (this.lastSeal || -9) > 0.45) { this.lastSeal = now; this.add({ k: 'seal', x: x + 14, y: y - 18, life: 0.5, rot: (Math.random() - 0.5) * 0.4 }); } }
  }
  // 찢긴 종잇조각: 앞뒤 색이 다른 작은 종이가 돌며 떨어진다 (가장자리가 들쭉날쭉)
  chips(x, y, n, cols, spd = 160) { for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (Math.random() - 0.5) * 3.4, s = spd * (0.4 + Math.random() * 0.8), sz = 2.2 + Math.random() * 2.6; this.add({ k: 'chip', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, g: 520, drag: 1.2, life: 0.45 + Math.random() * 0.3, size: sz, col: cols[(Math.random() * cols.length) | 0], rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 22, pts: Array.from({ length: 7 }, (_, j) => { const an = j / 7 * TAU, r = sz * (0.55 + Math.random() * 0.6); return [Math.cos(an) * r, Math.sin(an) * r * 0.7]; }).flat() }); } }
  // 불티·꽃잎: 주황·붉은 종이 조각이 돌며 떠올랐다가 천천히 내려앉는다
  embers(x, y, n = 4, col = '#ff9a2e') { const cols = [col, '#e0503f', '#f6c454']; for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (Math.random() - 0.5) * 2, s = 50 + Math.random() * 90; this.add({ k: 'flake', x: x + (Math.random() - 0.5) * 10, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 60, drag: 2, life: 0.7 + Math.random() * 0.5, size: 3 + Math.random() * 2.2, col: cols[(Math.random() * 3) | 0], rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 16, sway: Math.random() * 9 }); } }
  // 반짝임 대신: 작은 색종이 조각 몇 장이 톡 튀어 오른다
  star(x, y, size = 16, col = '#f6d98a') { const n = size > 20 ? 7 : size > 12 ? 5 : 3, cols = [col.length === 7 ? col : '#f6d98a', '#fbf3df', '#e8a040']; for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (i / Math.max(1, n - 1) - 0.5) * 2.4, s = (40 + Math.random() * 50) * (size / 14); this.add({ k: 'flake', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 140, drag: 2.4, life: 0.45 + Math.random() * 0.25, size: 2.6 + size * 0.12, col: cols[i % 3], rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 20, sway: Math.random() * 9 }); } }
  // 붓으로 그린 둥근 고리가 퍼지고, 고리 둘레로 흙먼지가 인다
  ring(x, y, r, col = INK, life = 0.4, lw = 5) { this.add({ k: 'ring', ground: true, x, y, r, col, life, lw, a0: Math.random() * TAU, w: Array.from({ length: 6 }, () => 0.6 + Math.random() * 0.7) }); if (r >= 60) { const n = Math.min(10, Math.round(r / 22)); for (let i = 0; i < n; i++) { const an = i / n * TAU + Math.random() * 0.4, rr2 = r * 0.55; this.add({ k: 'puff', x: x + Math.cos(an) * rr2, y: y + Math.sin(an) * rr2 * 0.5, vx: Math.cos(an) * 60, vy: Math.sin(an) * 24 - 16, drag: 2.6, life: 0.4 + Math.random() * 0.2, col: '#e3d4b2', size: 8 + Math.random() * 6 }); } } }
  // 피해 숫자: 같은 자리에 잇달아 뜨면 겹쳐 쌓지 않고 한 숫자로 더한다
  num(x, y, amt, col = INK) {
    if (x < -20 || x > 1300) return; x = Math.min(1252, Math.max(28, x));   // 화면 밖에서 맞은 것은 적지 않고, 가장자리에서는 안쪽으로 민다
    for (const p of this.p) if (p.num && p.col === col && p.t < 0.4 && Math.abs(p.x - x) < 54 && Math.abs(p.y - y) < 44) { p.val += amt; p.s = String(Math.round(p.val)); p.size = Math.min(30, 20 + Math.sqrt(p.val) * 0.25); p.t = Math.min(p.t, 0.12); return; }
    // 다른 글과 겹치면 위로 비켜 띄운다
    for (let k2 = 0; k2 < 3; k2++) { if (!this.p.some(p => p.k === 'text' && p.t < p.life * 0.7 && Math.abs(p.x - x) < 46 && Math.abs(p.y - y) < 24)) break; y -= 26; }
    this.add({ k: 'text', num: true, val: amt, x: x + (Math.random() - 0.5) * 10, y, vy: -46, drag: 1.5, s: String(Math.round(amt)), col, size: 20, life: 0.8 });
  }
  txt(x, y, s, col = INK, size = 20, life = 0.8) { this.add({ k: 'text', x: x + (Math.random() - 0.5) * 10, y, vy: -46, drag: 1.5, s, col, size, life }); }
  // 종잇조각: 인형이 쓰러질 때 흩날린다
  scraps(x, y, n = 6, cols = [PAPER]) { for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.6, s = 60 + Math.random() * 120; this.add({ k: 'scrap', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 300, drag: 1.6, life: 0.6 + Math.random() * 0.5, size: 3 + Math.random() * 4, col: cols[(Math.random() * cols.length) | 0], rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 16 }); } }
  // 먹으로 그은 베기 자국
  slash(x, y, len = 26, col = INK, ang = Math.random() * TAU) { this.add({ k: 'slash', x, y, len, col, ang, life: 0.26, v: (Math.random() * 3) | 0, flip: Math.random() < 0.5 ? -1 : 1 }); }
  // 구운 먹 그림 한 장: s → s1 로 번지며 나타났다 스러진다 (kind = splat·enso·swash·wash …)
  ink(kind, x, y, o = {}) { return this.add(Object.assign({ k: 'ink', kind, x, y, s: 1, s1: o.s === undefined ? 1 : o.s, life: 0.5, v: (Math.random() * 3) | 0 }, o)); }
  // 튀는 먹물
  splat(x, y, s = 0.4, col = MEOK, life = 0.45) { this.ink('splat', x, y, { s: s * 0.45, s1: s, rot: Math.random() * TAU, col, life, in: 0.08 }); }
  // 바닥에 번져 남는 먹 자국 (납작하게 눕힌다)
  // 물 먹은 종이에 번진 옅은 먹 + 가운데 떨어진 진한 먹 한 방울
  stain(x, y, s = 0.7, life = 5, peak = 0.34) {
    this.ink('wash', x, y, { ground: true, s: s * 0.26, s1: s * 0.46, sx: 1.5, life, peak: Math.min(1, peak * 2), in: 0.04, pow: 2.2, fast: true });
    this.ink('splat', x + (Math.random() - 0.5) * 8, y + 1, { ground: true, s: s * 0.2, s1: s * 0.34, sx: (Math.random() < 0.5 ? -1 : 1) * 1.25, rot: (Math.random() - 0.5) * 0.6, life: life * 0.8, peak: peak * 0.95, in: 0.04, pow: 2.4, fast: true });
  }
  // 바닥에 한 붓으로 그린 고리
  enso(x, y, s = 1, col = MEOK, life = 0.7) { this.ink('enso', x, y, { ground: true, s: s * 0.34, s1: s * 0.62, sx: 1.6, rot: 0, col, life, peak: 0.85, in: 0.1, fast: true }); }
  // 피어오르는 먹 연기
  wisp(x, y, n = 2) { for (let i = 0; i < n; i++) this.ink('wash', x + (Math.random() - 0.5) * 22, y + (Math.random() - 0.5) * 12, { vx: (Math.random() - 0.5) * 26, vy: -26 - Math.random() * 34, drag: 0.8, s: 0.07 + Math.random() * 0.04, s1: 0.17 + Math.random() * 0.09, life: 0.6 + Math.random() * 0.4, in: 0.15, peak: 0.6 }); }
  // 붓으로 그린 그림 기호 하나 (ch = symbols.js 의 이름): 크게 찍혔다가 자리를 잡고 스러진다
  glyph(x, y, ch, size = 96, col = MEOK, life = 1.1, o = {}) { this.add(Object.assign({ k: 'glyph', x, y, ch, size, col, life }, o)); }
  // 하늘에서 내리꽂는 벼락
  bolt(x, y, col = '#f0d264') { const pts = []; let px = x + (Math.random() - 0.5) * 60; for (let yy = y - 560; yy < y; yy += 40) { pts.push(px, yy); px += (x - px) * 0.3 + (Math.random() - 0.5) * 40; } pts.push(x, y);
    const br = []; for (let j = 0; j < 3; j++) { const i = 2 + ((Math.random() * (pts.length / 2 - 4)) | 0), b0 = [pts[i * 2], pts[i * 2 + 1]], dir = Math.random() < 0.5 ? -1 : 1; let bx = b0[0], by = b0[1]; const q = [bx, by]; for (let n = 0; n < 3; n++) { bx += dir * (14 + Math.random() * 20); by += 18 + Math.random() * 20; q.push(bx, by); } br.push(q); }
    this.add({ k: 'bolt', x, y, pts, br, col, life: 0.36 }); this.stain(x, y + 2, 0.6, 3, 0.4); this.chips(x, y - 4, 5, ['#fbf3df', '#efe2c4'], 200); this.add({ k: 'puff', x, y: y - 4, vx: 0, vy: -20, drag: 2, life: 0.5, col: '#e3d4b2', size: 18 }); }
  beam(x0, y0, x1, y1, col, life = 0.25, lw = 5) { this.add({ k: 'beam', x: x0, y: y0, x1, y1, col, life, lw }); }
  drawLayer(g, ground) {
    // 두목의 외침 같은 큰 꼬리표는 피해 숫자·효과보다 나중에(위에) 그린다
    const list = ground ? this.p : this.p.filter(q => !q.big).concat(this.p.filter(q => q.big));
    for (const p of list) {
      if (!!p.ground !== ground) continue;
      const k = p.t / p.life, a = 1 - k;
      switch (p.k) {
        // 튀는 알갱이: 움직이는 쪽으로 늘어난 물방울 꼴 (가는 먹선)
        case 'dot': { g.globalAlpha = Math.min(1, a * 2); const sp = Math.hypot(p.vx || 0, p.vy || 0), an = Math.atan2(p.vy || 0, p.vx || 1), r = p.size * (0.5 + a * 0.5), st2 = 1 + Math.min(2.2, sp / 160); g.save(); g.translate(p.x, p.y); g.rotate(an); g.beginPath(); g.ellipse(-r * (st2 - 1) * 0.6, 0, r * st2, r * 0.8, 0, 0, TAU); g.fillStyle = p.col; g.fill(); st(g, 'rgba(38,42,54,0.6)', 0.7); g.restore(); break; }
        // 흙먼지: 테두리 없이 부드럽게 퍼지며 옅어진다
        case 'puff': { const r = p.size * (0.7 + easeOut(k) * 1.1); g.globalAlpha = Math.min(1, a * 1.4) * 0.8; const gr = g.createRadialGradient(p.x, p.y, r * 0.1, p.x, p.y, r); gr.addColorStop(0, p.col); gr.addColorStop(0.7, p.col + 'aa'); gr.addColorStop(1, p.col + '00'); g.fillStyle = gr; g.beginPath(); g.ellipse(p.x, p.y, r, r * 0.8, 0, 0, TAU); g.fill(); g.globalAlpha *= 0.35; g.beginPath(); g.ellipse(p.x + r * 0.1, p.y + r * 0.2, r * 0.8, r * 0.5, 0, 0, Math.PI); st(g, 'rgba(90,70,40,0.6)', 1); break; }
        case 'flare': { const e = easeOut(k * 2.4), al = k < 0.2 ? 1 : 1 - (k - 0.2) / 0.8; glow(g, p.x, p.y, p.size * (0.6 + e * 0.7), p.col, al * 0.4); break; }
        // 붉은 낙관: 큰 타격 자리에 네모난 도장이 탁 찍혔다가 바랜다
        case 'seal': { const q = Math.min(1, k / 0.12), sc = 1.5 - 0.5 * easeOut(q), al = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4, s2 = 11 * sc; g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.globalAlpha = al * 0.92; rr(g, -s2, -s2, s2 * 2, s2 * 2, 2.4, '#b8302a'); g.globalAlpha = al; rr(g, -s2 + 2.4, -s2 + 2.4, s2 * 2 - 4.8, s2 * 2 - 4.8, 1.4, null, '#f6e6d0', 1.3); g.beginPath(); g.moveTo(-s2 * 0.5, s2 * 0.45); g.lineTo(s2 * 0.5, -s2 * 0.45); g.moveTo(-s2 * 0.5, -s2 * 0.1); g.lineTo(s2 * 0.1, -s2 * 0.5); g.moveTo(-s2 * 0.1, s2 * 0.5); g.lineTo(s2 * 0.5, s2 * 0.1); st(g, '#f6e6d0', 1.6); g.restore(); break; }
        case 'flake': { const al = Math.min(1, a * 2.2); g.globalAlpha = al; g.save(); g.translate(p.x + Math.sin(p.t * 6 + p.sway) * 3, p.y); g.rotate(p.rot + p.vr * p.t); const f = Math.cos(p.t * 11 + p.sway); g.scale(1, Math.max(0.15, Math.abs(f))); poly(g, [-p.size, -p.size * 0.6, p.size, -p.size * 0.4, p.size * 0.7, p.size * 0.6, -p.size * 0.8, p.size * 0.5], f > 0 ? p.col : '#c9a070', 'rgba(59,36,22,0.55)', 0.5); g.restore(); break; }
        case 'chip': { g.globalAlpha = Math.min(1, a * 3); g.save(); g.translate(p.x, p.y); g.rotate(p.rot + p.vr * p.t); const f = Math.cos(p.t * 14 + p.rot); g.scale(1, Math.max(0.15, Math.abs(f))); poly(g, p.pts, f > 0 ? p.col : '#c9b98f', 'rgba(59,36,22,0.55)', 0.6); g.restore(); break; }

        case 'star': break;
        // 붓으로 그은 고리: 굵기가 고르지 않고 한쪽이 트였다. 퍼지다 느려지며 바랜다
        case 'ring': { const e = easeOut(k), rx = p.r * (0.25 + e * 0.75), ry = rx * 0.5, N = 40, sweep = TAU * 0.88; g.globalAlpha = Math.min(1, a * 1.5) * 0.85; g.fillStyle = p.col; g.beginPath();
          const pt = (i, side) => { const t = i / N, an = p.a0 + t * sweep, wi = p.w[Math.floor(t * 5.99)] * (0.3 + Math.sin(t * Math.PI) * 0.9) * p.lw * (0.5 + a * 0.6), rr2 = 1 + side * wi / rx; return [p.x + Math.cos(an) * rx * rr2, p.y + Math.sin(an) * ry * rr2]; };
          for (let i = 0; i <= N; i++) { const [px, py] = pt(i, 1); if (i) g.lineTo(px, py); else g.moveTo(px, py); } for (let i = N; i >= 0; i--) { const [px, py] = pt(i, -1); g.lineTo(px, py); } g.closePath(); g.fill(); break; }
        case 'text': g.globalAlpha = p.big ? Math.min(1, a * p.life / 0.3) : Math.min(1, a * 2.5);
          // 두목의 외침 같은 큰 글은 한지 꼬리표 위에 쓴다 (어떤 풍경 위에서도 읽힌다)
          if (p.big) { g.font = `400 24px ${FONT_B}`; const w = g.measureText(p.s).width + 30, x = Math.max(w / 2 + 8, Math.min(1272 - w / 2, p.x)), pop = k < 0.12 ? 0.7 + k / 0.12 * 0.3 : 1; g.save(); g.translate(x, p.y); g.scale(pop, pop); rr(g, -w / 2 + 2, -17, w, 38, 8, 'rgba(30,24,20,0.3)'); if (p.tail) { const ty = p.tail > 0 ? 18 : -20, d = p.tail > 0 ? 9 : -9; poly(g, [-8, ty, 8, ty, 0, ty + d], '#fbf3df', p.col, 2.6); } rr(g, -w / 2, -20, w, 38, 8, '#fbf3df', p.col, 2.6); text(g, p.s, 0, 0, { size: 24, fill: p.col, font: FONT_B }); g.restore(); break; }
          text(g, p.s, p.x, p.y, { size: p.size * (k < 0.15 ? 0.6 + k / 0.15 * 0.5 : 1.1 - Math.min(0.1, k - 0.15)), fill: p.col, font: FONT_B, stroke: PAPER, lw: p.big ? 7 : 5 }); break;
        case 'beam': { g.globalAlpha = a; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x1, p.y1); st(g, 'rgba(38,42,54,0.7)', p.lw + 2.4); g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x1, p.y1); st(g, p.col, p.lw); g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = a * 0.45; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x1, p.y1); st(g, p.col, p.lw * 3.4); g.globalAlpha = a; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x1, p.y1); st(g, '#fffaf0', Math.max(1, p.lw * 0.35)); g.restore(); break; }
        // 쏟아지는 화살: 깃과 촉이 있는 화살이 바람 자국을 끌며 내리꽂힌다
        case 'arrow': { const e = k * k, yy = p.y - (1 - e) * 260, xx = p.x - (1 - e) * 60, an = Math.atan2(260, 60); g.globalAlpha = Math.min(1, k * 4);
          const gr = g.createLinearGradient(xx - Math.cos(an) * 70, yy - Math.sin(an) * 70, xx, yy); gr.addColorStop(0, 'rgba(255,250,236,0)'); gr.addColorStop(1, 'rgba(255,250,236,0.8)'); g.strokeStyle = gr; g.lineWidth = 3.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(xx - Math.cos(an) * 70, yy - Math.sin(an) * 70); g.lineTo(xx - Math.cos(an) * 16, yy - Math.sin(an) * 16); g.stroke();
          g.save(); g.translate(xx, yy); g.rotate(an); line(g, [-22, 0, 0, 0], INK, 2.6); line(g, [-21, 0, -1, 0], '#d9c39a', 1); poly(g, [-24, -2.6, -18, 0, -24, 2.6], '#fbf7ec', INK, 0.7); poly(g, [-1, -2.2, 5, 0, -1, 2.2], '#e4e8ea', INK, 0.7); g.restore(); break; }
        case 'stuck': g.globalAlpha = a; g.beginPath(); g.moveTo(p.x - 4, p.y - 15); g.lineTo(p.x, p.y); st(g, INK, 2.2); poly(g, [p.x - 6, p.y - 18, p.x - 4, p.y - 13, p.x - 1.6, p.y - 17], '#fbf7ec', INK, 0.8); break;
        case 'plus': { g.globalAlpha = Math.min(1, a * 2); const s = p.size; glow(g, p.x, p.y, s * 3.2, p.col || '#5fae6a', a * 0.7); poly(g, [p.x - s * 0.3, p.y - s, p.x + s * 0.3, p.y - s, p.x + s * 0.3, p.y - s * 0.3, p.x + s, p.y - s * 0.3, p.x + s, p.y + s * 0.3, p.x + s * 0.3, p.y + s * 0.3, p.x + s * 0.3, p.y + s, p.x - s * 0.3, p.y + s, p.x - s * 0.3, p.y + s * 0.3, p.x - s, p.y + s * 0.3, p.x - s, p.y - s * 0.3, p.x - s * 0.3, p.y - s * 0.3], p.col || '#5fae6a', INK, 1.1); break; }
        case 'sprite': g.globalAlpha = a; drawSprite(g, p.spr, p.x, p.y, p.sx * (1 + k * 0.2), p.sy * (1 - k * 0.8), k * 0.5 * (p.sx < 0 ? -1 : 1), 1 - k * 0.5, true); break;
        // 떨어지는 불덩이: 붉은·주황·노란 종이를 겹쳐 오린 불꽃, 혀처럼 갈라진 꼬리, 먹 테두리
        case 'fall': { const h = (1 - k) * (1 - k) * 520, xx = p.x + h * 0.35, yy = p.y - h, sz = p.size; g.globalAlpha = 0.2 + k * 0.25; ell(g, p.x, p.y, sz * (0.6 + k), sz * (0.6 + k) * 0.45, INK); g.globalAlpha = 1;
          g.save(); g.translate(xx, yy); g.rotate(Math.atan2(-1, 0.35) + Math.PI / 2); const fl = Math.sin(p.t * 40) * 0.12;
          for (const [w, L, c] of [[1.25, 4.6, '#c8402f'], [0.95, 3.6, p.tail], [0.6, 2.5, '#f6c454']]) { g.beginPath(); g.moveTo(-sz * w, 0); g.quadraticCurveTo(-sz * w * 0.9, sz * L * 0.4, -sz * w * 0.35, sz * L * (0.75 + fl)); g.lineTo(-sz * w * 0.1, sz * L * 0.55); g.lineTo(sz * w * 0.15, sz * L * (1 - fl)); g.lineTo(sz * w * 0.35, sz * L * 0.6); g.quadraticCurveTo(sz * w * 0.9, sz * L * 0.4, sz * w, 0); g.arc(0, 0, sz * w, 0, Math.PI, true); g.closePath(); g.fillStyle = c; g.fill(); st(g, 'rgba(59,30,20,0.85)', 1.2); }
          g.restore(); glow(g, xx, yy, sz * 2.6, '#ff9a2e', 0.35); ell(g, xx, yy, sz * 0.62, sz * 0.6, '#fff0c0', 'rgba(59,30,20,0.85)', 1.1); break; }
        case 'scrap': { g.globalAlpha = Math.min(1, a * 2.5); g.save(); g.translate(p.x, p.y); g.rotate(p.rot + p.vr * p.t); g.scale(1, Math.cos(p.t * 9 + p.rot)); const f2 = Math.cos(p.t * 9 + p.rot); poly(g, [-p.size, -p.size * 0.6, p.size * 0.8, -p.size * 0.8, p.size, p.size * 0.5, -p.size * 0.7, p.size * 0.7], f2 > 0 ? p.col : '#cdbd94', 'rgba(38,42,54,0.7)', 0.8); g.restore(); break; }
        case 'slash': { const l = p.len * (0.55 + Math.min(1, k * 3.4) * 0.45); g.globalAlpha = 1; drawInk(g, 'slash', p.x, p.y, l / 54, p.ang, Math.min(1, a * 1.7), p.col, p.v, p.flip); break; }
        case 'ink': { const kin = p.in || 0.12, al = (k < kin ? k / kin : Math.pow(1 - (k - kin) / (1 - kin), p.pow || 1.4)) * (p.peak || 1), e = p.fast ? 1 - Math.pow(1 - Math.min(1, k * 6), 3) : 1 - Math.pow(1 - k, 3); g.globalAlpha = 1; drawInk(g, p.kind, p.x, p.y, p.s + (p.s1 - p.s) * e, p.rot || 0, al, p.col || MEOK, p.v || 0, p.sx || 1); break; }
        case 'glyph': { const q = Math.min(1, k / 0.13), sc = 1.6 - 0.6 * (1 - Math.pow(1 - q, 3)), al = k > 0.68 ? (1 - k) / 0.32 : Math.min(1, q * 1.6); g.globalAlpha = 1; inkGlyph(g, p.ch, p.x, p.y, p.size * sc, { col: p.col, alpha: al * (p.peak || 1), rot: p.rot === undefined ? -0.06 : p.rot, halo: p.halo }); break; }
        // 벼락: 위에서 아래로 가늘어지는 종이 오린 번개 (먹 테두리), 갈래 몇 줄. 번쩍임은 짧게
        case 'bolt': { const al = k < 0.12 ? 1 : Math.max(0, 1 - (k - 0.12) / 0.88) * (0.75 + 0.25 * Math.sin(p.t * 70));
          const ribbon = (pts, w0, w1) => { const n = pts.length / 2, L = [], Rr = []; for (let i = 0; i < n; i++) { const j0 = Math.max(0, i - 1), j1 = Math.min(n - 1, i + 1), dx = pts[j1 * 2] - pts[j0 * 2], dy = pts[j1 * 2 + 1] - pts[j0 * 2 + 1], l = Math.hypot(dx, dy) || 1, w = w0 + (w1 - w0) * i / (n - 1), jag = (i % 2 ? 1 : 0.6); L.push(pts[i * 2] - dy / l * w * jag, pts[i * 2 + 1] + dx / l * w * jag); Rr.push(pts[i * 2] + dy / l * w, pts[i * 2 + 1] - dx / l * w); } g.beginPath(); g.moveTo(L[0], L[1]); for (let i = 1; i < n; i++) g.lineTo(L[i * 2], L[i * 2 + 1]); for (let i = n - 1; i >= 0; i--) g.lineTo(Rr[i * 2], Rr[i * 2 + 1]); g.closePath(); g.fillStyle = p.col; g.fill(); st(g, 'rgba(38,30,40,0.9)', 1.6); };
          g.globalAlpha = al; for (const br of p.br || []) ribbon(br, 2.6, 0.6); ribbon(p.pts, 6.5, 2.2);
          g.globalAlpha = al * 0.9; g.beginPath(); g.moveTo(p.pts[0], p.pts[1]); for (let i = 2; i < p.pts.length; i += 2) g.lineTo(p.pts[i], p.pts[i + 1]); st(g, '#fffbe6', 1.4);
          if (k < 0.3) glow(g, p.x, p.y, 40, p.col, (0.3 - k) / 0.3 * 0.5); break; }
        case 'arc': { const h = Math.sin(k * Math.PI) * p.h; g.globalAlpha = 1; ell(g, p.x + (p.x1 - p.x) * k, p.y + (p.y1 - p.y) * k - h, p.size, p.size * 0.92, p.col, INK, 1.5); break; }
      }
    }
    g.globalAlpha = 1;
  }
}
