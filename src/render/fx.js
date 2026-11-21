// 파티클과 화면 효과 (먹·종이 느낌)
import { TAU, INK, PAPER, FONT_B, text, poly, ell, st, drawSprite } from './draw.js';
import { drawInk, inkGlyph, MEOK } from './ink.js';

export class Fx {
  constructor() { this.p = []; this.shake = 0; this.flash = 0; this.flashCol = '#fff'; }
  add(o) { o.t = 0; this.p.push(o); return o; }
  clear() { this.p.length = 0; this.shake = 0; this.flash = 0; }
  // 행군할 때 바닥에 붙은 것들은 바닥과 함께 뒤로 흐른다
  shift(dx) { for (const p of this.p) if (p.ground) p.x -= dx; }
  update(dt) {
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 28);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 3.2);
    for (const p of this.p) { p.t += dt; if (p.vx) p.x += p.vx * dt; if (p.vy) p.y += p.vy * dt; if (p.g) p.vy += p.g * dt; if (p.drag) { const k = Math.exp(-p.drag * dt); p.vx *= k; p.vy *= k; } }
    if (this.p.length) this.p = this.p.filter(p => p.t < p.life);
  }
  burst(x, y, n, col, spd = 120, size = 3.2) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = spd * (0.4 + Math.random() * 0.8); this.add({ k: 'dot', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30, g: 260, life: 0.3 + Math.random() * 0.25, col, size: size * (0.6 + Math.random() * 0.7) }); } }
  puff(x, y, n = 4, col = PAPER, size = 9) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = 20 + Math.random() * 40; this.add({ k: 'puff', x: x + Math.cos(a) * 4, y: y + Math.sin(a) * 3, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.6 - 18, drag: 3, life: 0.35 + Math.random() * 0.25, col, size: size * (0.7 + Math.random() * 0.6) }); } }
  star(x, y, size = 16, col = '#f6d98a') { this.add({ k: 'star', x, y, life: 0.18, size, col, rot: Math.random() * TAU }); }
  ring(x, y, r, col = INK, life = 0.4, lw = 5) { this.add({ k: 'ring', ground: true, x, y, r, col, life, lw }); }
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
  stain(x, y, s = 0.7, life = 5, peak = 0.34) { this.ink('splat', x, y, { ground: true, s: s * 0.34, s1: s * 0.6, sx: (Math.random() < 0.5 ? -1 : 1) * 1.7, life, peak, in: 0.04, pow: 2.2, fast: true }); }
  // 바닥에 한 붓으로 그린 고리
  enso(x, y, s = 1, col = MEOK, life = 0.7) { this.ink('enso', x, y, { ground: true, s: s * 0.34, s1: s * 0.62, sx: 1.6, rot: 0, col, life, peak: 0.85, in: 0.1, fast: true }); }
  // 피어오르는 먹 연기
  wisp(x, y, n = 2) { for (let i = 0; i < n; i++) this.ink('wash', x + (Math.random() - 0.5) * 22, y + (Math.random() - 0.5) * 12, { vx: (Math.random() - 0.5) * 26, vy: -26 - Math.random() * 34, drag: 0.8, s: 0.07 + Math.random() * 0.04, s1: 0.17 + Math.random() * 0.09, life: 0.6 + Math.random() * 0.4, in: 0.15, peak: 0.6 }); }
  // 붓글씨 한 자: 크게 찍혔다가 자리를 잡고 스러진다
  glyph(x, y, ch, size = 96, col = MEOK, life = 1.1, o = {}) { this.add(Object.assign({ k: 'glyph', x, y, ch, size, col, life }, o)); }
  // 하늘에서 내리꽂는 벼락
  bolt(x, y, col = '#f0d264') { const pts = []; let px = x + (Math.random() - 0.5) * 60; for (let yy = y - 560; yy < y; yy += 56) { pts.push(px, yy); px += (x - px) * 0.35 + (Math.random() - 0.5) * 46; } pts.push(x, y); this.add({ k: 'bolt', x, y, pts, col, life: 0.32 }); }
  beam(x0, y0, x1, y1, col, life = 0.25, lw = 5) { this.add({ k: 'beam', x: x0, y: y0, x1, y1, col, life, lw }); }
  drawLayer(g, ground) {
    for (const p of this.p) {
      if (!!p.ground !== ground) continue;
      const k = p.t / p.life, a = 1 - k;
      switch (p.k) {
        case 'dot': g.globalAlpha = Math.min(1, a * 2); ell(g, p.x, p.y, p.size * (0.5 + a * 0.5), p.size * (0.5 + a * 0.5), p.col, INK, 1); break;
        case 'puff': g.globalAlpha = Math.min(1, a * 1.6); ell(g, p.x, p.y, p.size * (0.6 + k * 0.7), p.size * (0.6 + k * 0.7) * 0.85, p.col, INK, 1.2); break;
        case 'star': { const s = p.size * (0.5 + k * 0.9); g.globalAlpha = a; g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.beginPath(); for (let i = 0; i < 8; i++) { const an = i / 8 * TAU, r = i % 2 ? s * 0.35 : s; g[i ? 'lineTo' : 'moveTo'](Math.cos(an) * r, Math.sin(an) * r); } g.closePath(); g.fillStyle = p.col; g.fill(); st(g, INK, 1.4); g.restore(); break; }
        case 'ring': g.globalAlpha = a; g.beginPath(); g.ellipse(p.x, p.y, p.r * (0.3 + k * 0.7), p.r * (0.3 + k * 0.7) * 0.8, 0, 0, TAU); st(g, p.col, p.lw * a + 1); break;
        case 'text': g.globalAlpha = Math.min(1, a * 2.5); text(g, p.s, p.x, p.y, { size: p.size * (k < 0.15 ? 0.6 + k / 0.15 * 0.5 : 1.1 - Math.min(0.1, k - 0.15)), fill: p.col, font: FONT_B, stroke: PAPER, lw: p.big ? 7 : 5 }); break;
        case 'beam': g.globalAlpha = a; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x1, p.y1); st(g, INK, p.lw + 3); g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x1, p.y1); st(g, p.col, p.lw); break;
        case 'arrow': { const yy = p.y - (1 - k) * 260, xx = p.x - (1 - k) * 60; g.globalAlpha = Math.min(1, k * 4); g.beginPath(); g.moveTo(xx - 5, yy - 22); g.lineTo(xx, yy); st(g, INK, 3); break; }
        case 'stuck': g.globalAlpha = a; g.beginPath(); g.moveTo(p.x - 4, p.y - 15); g.lineTo(p.x, p.y); st(g, INK, 2.2); poly(g, [p.x - 6, p.y - 18, p.x - 4, p.y - 13, p.x - 1.6, p.y - 17], '#fbf7ec', INK, 0.8); break;
        case 'plus': { g.globalAlpha = Math.min(1, a * 2); const s = p.size; poly(g, [p.x - s * 0.3, p.y - s, p.x + s * 0.3, p.y - s, p.x + s * 0.3, p.y - s * 0.3, p.x + s, p.y - s * 0.3, p.x + s, p.y + s * 0.3, p.x + s * 0.3, p.y + s * 0.3, p.x + s * 0.3, p.y + s, p.x - s * 0.3, p.y + s, p.x - s * 0.3, p.y + s * 0.3, p.x - s, p.y + s * 0.3, p.x - s, p.y - s * 0.3, p.x - s * 0.3, p.y - s * 0.3], p.col || '#5fae6a', INK, 1.1); break; }
        case 'sprite': g.globalAlpha = a; drawSprite(g, p.spr, p.x, p.y, p.sx * (1 + k * 0.2), p.sy * (1 - k * 0.8), k * 0.5 * (p.sx < 0 ? -1 : 1), 1 - k * 0.5, true); break;
        case 'fall': { const h = (1 - k) * (1 - k) * 520; g.globalAlpha = 0.3; ell(g, p.x, p.y, p.size * k, p.size * k * 0.5, INK); const xx = p.x + h * 0.35, yy = p.y - h; g.globalAlpha = 0.85; g.beginPath(); g.moveTo(xx + p.size * 2.6, yy - p.size * 5); g.quadraticCurveTo(xx - p.size, yy - p.size, xx - p.size * 0.6, yy); g.lineTo(xx + p.size * 0.9, yy + p.size * 0.4); g.closePath(); g.fillStyle = p.tail; g.fill(); g.globalAlpha = 1; ell(g, xx, yy, p.size, p.size * 0.95, p.col, INK, 1.6); break; }
        case 'scrap': { g.globalAlpha = Math.min(1, a * 2.5); g.save(); g.translate(p.x, p.y); g.rotate(p.rot + p.vr * p.t); g.scale(1, Math.cos(p.t * 9 + p.rot)); poly(g, [-p.size, -p.size * 0.6, p.size * 0.8, -p.size * 0.8, p.size, p.size * 0.5, -p.size * 0.7, p.size * 0.7], p.col, INK, 0.9); g.restore(); break; }
        case 'slash': { const l = p.len * (0.55 + Math.min(1, k * 3.4) * 0.45); g.globalAlpha = 1; drawInk(g, 'slash', p.x, p.y, l / 54, p.ang, Math.min(1, a * 1.7), p.col, p.v, p.flip); break; }
        case 'ink': { const kin = p.in || 0.12, al = (k < kin ? k / kin : Math.pow(1 - (k - kin) / (1 - kin), p.pow || 1.4)) * (p.peak || 1), e = p.fast ? 1 - Math.pow(1 - Math.min(1, k * 6), 3) : 1 - Math.pow(1 - k, 3); g.globalAlpha = 1; drawInk(g, p.kind, p.x, p.y, p.s + (p.s1 - p.s) * e, p.rot || 0, al, p.col || MEOK, p.v || 0, p.sx || 1); break; }
        case 'glyph': { const q = Math.min(1, k / 0.13), sc = 1.6 - 0.6 * (1 - Math.pow(1 - q, 3)), al = k > 0.68 ? (1 - k) / 0.32 : Math.min(1, q * 1.6); g.globalAlpha = 1; inkGlyph(g, p.ch, p.x, p.y, p.size * sc, { col: p.col, alpha: al * (p.peak || 1), rot: p.rot === undefined ? -0.06 : p.rot, halo: p.halo }); break; }
        case 'bolt': { g.globalAlpha = Math.min(1, a * 1.6); g.beginPath(); g.moveTo(p.pts[0], p.pts[1]); for (let i = 2; i < p.pts.length; i += 2) g.lineTo(p.pts[i], p.pts[i + 1]); st(g, INK, 9); g.beginPath(); g.moveTo(p.pts[0], p.pts[1]); for (let i = 2; i < p.pts.length; i += 2) g.lineTo(p.pts[i], p.pts[i + 1]); st(g, p.col, 5); g.beginPath(); g.moveTo(p.pts[0], p.pts[1]); for (let i = 2; i < p.pts.length; i += 2) g.lineTo(p.pts[i], p.pts[i + 1]); st(g, '#fffbe6', 1.8); break; }
        case 'arc': { const h = Math.sin(k * Math.PI) * p.h; g.globalAlpha = 1; ell(g, p.x + (p.x1 - p.x) * k, p.y + (p.y1 - p.y) * k - h, p.size, p.size * 0.92, p.col, INK, 1.5); break; }
      }
    }
    g.globalAlpha = 1;
  }
}
