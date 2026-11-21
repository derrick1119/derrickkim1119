// 얻는 순간의 연출: 얻은 것이 제자리(덱·보물·엽전·주머니)로 날아가고, 보물은 화면 가운데에 크게 한 번 보여 준다.
// 장면 맨 위에 그린다 (RunScene.frame 의 끝에서 juice.frame 을 부른다)
import { W, H } from '../config.js';
import { TAU, INK, FONT_B, text, ell, rr, poly, clamp, easeOutBack } from '../render/draw.js';
import { drawInk, MEOK, JU } from '../render/ink.js';
import { inkGlyph } from '../render/symbols.js';

// 날아가 닿는 자리
export const SPOT = { deck: [1186, 678], relic: [1096, 32], gold: [948, 32], pouch: [156, 690], morale: [118, 618] };
// 금빛: 가는 금선 여러 줄이 천천히 돌고 금박 가루가 흩날린다 (k = 0→1 퍼지는 정도, R = 바깥 반지름)
export function goldRays(g, x, y, t, k = 1, R = 180) {
  if (k <= 0) return; const a0 = g.globalAlpha;
  g.save(); g.translate(x, y); g.rotate(t * 0.22);
  for (let i = 0; i < 18; i++) { const a = i / 18 * TAU, r0 = R * 0.5, r1 = r0 + (R * (0.72 + 0.28 * ((i * 7) % 5) / 4) - r0) * k, c = Math.cos(a), sn = Math.sin(a); g.globalAlpha = a0 * (i % 2 ? 0.8 : 0.5); g.beginPath(); g.moveTo(c * r0, sn * r0); g.lineTo(c * r1, sn * r1); g.strokeStyle = i % 2 ? '#d6a640' : '#f0d99a'; g.lineWidth = i % 2 ? 2.2 : 1.2; g.lineCap = 'round'; g.stroke(); }
  g.restore(); g.globalAlpha = a0;
  for (let i = 0; i < 16; i++) { const a = i * 2.4 + t * 0.35, d = R * (0.56 + 0.5 * ((i * 37) % 100) / 100) * k, px = x + Math.cos(a) * d, py = y + Math.sin(a) * d * 0.9 - ((t * 16 + i * 9) % 28), r = 2.4 + (i % 3) * 0.9; g.globalAlpha = a0 * (0.55 + 0.4 * Math.sin(t * 5 + i)); poly(g, [px, py - r, px + r * 0.62, py, px, py + r, px - r * 0.62, py], '#f0d264', 'rgba(60,40,10,0.5)', 0.7); }
  g.globalAlpha = a0;
}
export const juice = {
  list: [], sparks: [], rings: [], show: null,
  clear() { this.list.length = 0; this.sparks.length = 0; this.rings.length = 0; this.show = null; },
  // 그림 하나를 (x0,y0) 에서 (x1,y1) 로 포물선을 그리며 날린다. draw(g, x, y, s, k) 가 그 그림을 그린다
  // hold: 떠나기 전에 제자리에서 잠깐(초) 보여 준다 — 무엇을 얻었는지 읽을 틈
  fly(o) { this.list.push(Object.assign({ t: -((o.delay || 0) + (o.hold || 0)), dur: 0.6, s0: 1, s1: 0.35, arc: 90 }, o)); },
  // 보물을 얻었다: 가운데에 크게 보여 준 뒤 보물 주머니로 날려 보낸다
  reveal(o) { this.show = Object.assign({ t: 0, dur: 1.7 }, o); },
  burst(x, y, col = '#f0d264', n = 9) { for (let i = 0; i < n; i++) { const a = i / n * TAU + Math.random(), v = 80 + Math.random() * 140; this.sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, t: 0, life: 0.35 + Math.random() * 0.25, col, r: 2.2 + Math.random() * 2.4 }); } this.rings.push({ x, y, t: 0, col }); },
  frame(g, dt) {
    g.save();
    // 보물을 얻는 순간
    const sh = this.show;
    if (sh) {
      sh.t += dt; const t = sh.t, k = clamp(t / 0.3, 0, 1), out = clamp((sh.dur - t) / 0.3, 0, 1), a = Math.min(k, out), e = easeOutBack(k);
      g.globalAlpha = a * 0.55; g.fillStyle = '#17151c'; g.fillRect(0, 0, W, H); g.globalAlpha = a;
      g.save(); g.beginPath(); g.rect(0, 100, W, H - 100); g.clip(); drawInk(g, 'blot', 640, 296, 2.1 * (0.8 + 0.2 * e), -0.3, 1, MEOK, 1); g.restore();
      goldRays(g, 640, 300, t, e, 178);
      ell(g, 640, 300, 86 * e, 86 * e, '#f6efdc', INK, 3); ell(g, 640, 300, 76 * e, 76 * e, null, 'rgba(201,150,46,0.9)', 1.6);
      sh.icon(g, 640, 300 - Math.sin(t * 4) * 4, 2.3 * e);
      inkGlyph(g, 'get', 768, 222, 76 * e, { col: JU, rot: 0.12, halo: 'rgba(248,240,220,0.95)' });
      text(g, sh.title || '보물을 얻었다', 640, 176, { size: 26, font: FONT_B, fill: '#f0d99a', stroke: '#14121a', lw: 6 });
      text(g, sh.name, 640, 424, { size: 40, font: FONT_B, fill: '#f6efdc', stroke: INK, lw: 7 });
      if (sh.desc) { rr(g, 340, 452, 600, 40, 9, 'rgba(248,240,220,0.96)', INK, 1.8); text(g, sh.desc, 640, 473, { size: 18, maxW: 570 }); }
      if (t >= sh.dur) { this.show = null; if (sh.to) this.fly({ draw: (gg, x, y, s) => sh.icon(gg, x, y, 2.3 * s), x0: 640, y0: 300, x1: sh.to[0], y1: sh.to[1], s1: 0.3, arc: 60 }); }
      g.globalAlpha = 1;
    }
    // 날아가는 것들: 먹 꼬리를 끌고 간다
    this.list = this.list.filter(f => {
      f.t += dt; if (f.t < 0) { if (f.hold && -f.t <= f.hold) { const q = clamp(1 + f.t / f.hold, 0, 1), pop = easeOutBack(Math.min(1, q * 3)); f.draw(g, f.x0, f.y0, f.s0 * pop, 0); } return true; }
      const at = q => { const e = q * q * (3 - 2 * q); return [f.x0 + (f.x1 - f.x0) * e, f.y0 + (f.y1 - f.y0) * e - Math.sin(q * Math.PI) * f.arc, f.s0 + (f.s1 - f.s0) * e]; };
      const k = clamp(f.t / f.dur, 0, 1), [x, y, s] = at(k);
      for (let j = 1; j <= 5; j++) { const q = k - j * 0.045; if (q <= 0) break; const p = at(q); g.globalAlpha = 0.34 * (1 - j / 6); ell(g, p[0], p[1], 9 * p[2] * (1 - j / 7), 9 * p[2] * (1 - j / 7), f.trail || MEOK); }
      g.globalAlpha = 1; f.draw(g, x, y, s, k);
      if (k >= 1) { this.burst(f.x1, f.y1, f.col || '#f0d264'); if (f.onArrive) f.onArrive(); return false; }
      return true;
    });
    // 닿은 자리에 튀는 불티와 고리
    this.rings = this.rings.filter(r => { r.t += dt; const k = r.t / 0.35; if (k >= 1) return false; g.globalAlpha = 1 - k; g.beginPath(); g.arc(r.x, r.y, 10 + k * 34, 0, TAU); g.strokeStyle = r.col; g.lineWidth = 3.4 * (1 - k) + 0.6; g.stroke(); return true; });
    this.sparks = this.sparks.filter(p => { p.t += dt; if (p.t >= p.life) return false; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 420 * dt; g.globalAlpha = 1 - p.t / p.life; ell(g, p.x, p.y, p.r, p.r, p.col, INK, 0.8); return true; });
    g.restore();
  },
};
