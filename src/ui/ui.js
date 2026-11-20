// 즉시 모드 UI — 한지 패널, 먹 테두리, 붉은 도장(낙관) 버튼
import { TAU, INK, PAPER, RED, REDD, INDIGO, NAVY, TEAL, OCHRE, SUB, FONT, FONT_B, st, fs, ell, rr, rrPath, poly, line, path, text, clamp } from '../render/draw.js';

export const C = { paper: PAPER, tray: '#f1e7cf', ink: INK, sub: SUB, navy: NAVY, indigo: INDIGO, red: RED, redD: REDD, gold: OCHRE, teal: TEAL, grey: '#a9a394', cream: '#fbf7ec' };

// 입력 상태는 main.js 가 매 프레임 갱신한다
export const ui = { inp: null, active: null, sfx: null };
export function inRect(p, x, y, w, h) { return p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h; }
export function tapped(id, x, y, w, h) {
  const i = ui.inp; let hit = false;
  if (i.pressed && inRect(i, x, y, w, h) && !ui.active) ui.active = id;
  if (i.released && ui.active === id && inRect(i, x, y, w, h) && !i.dragged) hit = true;
  return hit;
}
export function isDown(id, x, y, w, h) { return ui.active === id && ui.inp.down && inRect(ui.inp, x, y, w, h); }

export function panel(g, x, y, w, h, style = 'paper') {
  if (style === 'paper') { rr(g, x + 3, y + 5, w, h, 6, 'rgba(50,36,20,0.22)'); rr(g, x, y, w, h, 6, PAPER, INK, 3); rr(g, x + 8, y + 8, w - 16, h - 16, 3, null, INK + '66', 1.2); }
  else if (style === 'navy') { rr(g, x + 3, y + 5, w, h, 10, 'rgba(50,36,20,0.22)'); rr(g, x, y, w, h, 10, NAVY, INK, 3); rr(g, x + 6, y + 6, w - 12, h - 12, 6, null, OCHRE + 'aa', 1.2); }
  else if (style === 'tray') { g.fillStyle = C.tray; g.fillRect(x, y, w, h); g.fillStyle = INK; g.fillRect(x, y - 4, w, 5); g.fillStyle = OCHRE; g.fillRect(x, y + 3, w, 2); }
  else if (style === 'tag') { rr(g, x, y, w, h, h / 2, PAPER, INK, 1.8); }
}
const BTN = { indigo: [INDIGO, '#223a61', C.cream, OCHRE], red: ['#b8382a', REDD, C.cream, '#f3c9a0'], paper: [PAPER, '#d9cdb0', INK, INK + '55'], teal: [TEAL, '#2a4a3f', C.cream, OCHRE], navy: [NAVY, '#101828', C.cream, OCHRE], grey: ['#b9b3a2', '#8f897a', '#5a5346', '#8f897a'] };
export function button(g, id, x, y, w, h, label, o = {}) {
  const sty = BTN[o.style || 'indigo'], dis = !!o.disabled;
  const hit = !dis && tapped(id, x, y, w, h), dn = !dis && isDown(id, x, y, w, h), off = dn ? 3 : 0;
  const r = o.r === undefined ? h / 2 : o.r;
  g.save(); if (dis) g.globalAlpha = 0.55;
  rr(g, x, y + 5, w, h, r, sty[1], INK, 3); rr(g, x, y + off, w, h, r, sty[0], INK, 3);
  rr(g, x + 7, y + 7 + off, w - 14, h - 14, Math.max(2, r - 7), null, sty[3], 1.3);
  const size = o.size || Math.min(36, h * 0.46);
  text(g, label, x + w / 2, y + h / 2 + off + 1, { size, font: o.font || FONT_B, fill: sty[2], maxW: w - 26 });
  g.restore();
  if (hit && ui.sfx) ui.sfx('click');
  return hit;
}
export function iconBtn(g, id, x, y, w, h, draw, o = {}) {
  const hit = tapped(id, x, y, w, h), dn = isDown(id, x, y, w, h), off = dn ? 2 : 0;
  rr(g, x, y + 3, w, h, 8, '#d9cdb0', INK, 2.4); rr(g, x, y + off, w, h, 8, o.on ? '#f0d99a' : PAPER, INK, 2.4);
  draw(g, x + w / 2, y + h / 2 + off);
  if (hit && ui.sfx) ui.sfx('click');
  return hit;
}
export function bar(g, x, y, w, h, t, col, o = {}) {
  rr(g, x, y, w, h, h / 2, o.back || '#101828'); const f = clamp(t, 0, 1);
  if (f > 0.01) { g.save(); g.beginPath(); rrPath(g, x + 2, y + 2, w - 4, h - 4, (h - 4) / 2); g.clip(); g.fillStyle = col; if (o.right) g.fillRect(x + 2 + (w - 4) * (1 - f), y + 2, (w - 4) * f, h - 4); else g.fillRect(x + 2, y + 2, (w - 4) * f, h - 4); g.restore(); }
}
// 붉은 도장: 스킬 버튼·등급 도장에 쓴다
export function seal(g, x, y, s, ch, col = RED, o = {}) {
  const dk = o.dark || 'rgba(30,20,20,0.55)';
  rr(g, x - s / 2, y - s / 2, s, s, s * 0.16, col, dk, Math.max(2, s * 0.03));
  g.save(); g.globalAlpha *= 0.28; rr(g, x - s / 2 + s * 0.05, y - s / 2 + s * 0.05, s * 0.9, s * 0.9, s * 0.12, null, C.cream, 1.5); g.restore();
  text(g, ch, x, y + s * 0.04 + (o.dy || 0), { size: s * (o.k || 0.62), font: FONT_B, fill: C.cream });
}
export function stamp(g, x, y, r, ch, col = RED, rot = -0.12) { g.save(); g.translate(x, y); g.rotate(rot); ell(g, 0, 0, r, r, null, col, r * 0.1); ell(g, 0, 0, r * 0.82, r * 0.82, null, col, r * 0.04); text(g, ch, 0, r * 0.08, { size: r * 1.15, font: FONT_B, fill: col }); g.restore(); }
// 붓으로 그은 듯한 제목 띠
export function brushTitle(g, x, y, w, h, label, col = INDIGO, size = 40) {
  path(g, p => { p.moveTo(x - w / 2 - 14, y - h / 2 + 5); p.lineTo(x + w / 2 + 6, y - h / 2); p.lineTo(x + w / 2 + 18, y - h * 0.1); p.lineTo(x + w / 2 + 8, y + h / 2 - 3); p.lineTo(x - w / 2 - 4, y + h / 2); p.lineTo(x - w / 2 - 20, y + h * 0.14); p.closePath(); }, col, INK, 3);
  line(g, [x - w / 2, y + h / 2 - 8, x + w / 2, y + h / 2 - 10], OCHRE, 1.5);
  text(g, label, x, y + 1, { size, font: FONT_B, fill: C.cream, maxW: w - 20 });
}

export const icon = {
  banner(g, x, y, col, flip, s = 1) { line(g, [x, y + 26 * s, x, y - 26 * s], INK, 4.5 * s); line(g, [x, y + 26 * s, x, y - 26 * s], '#7a5a40', 2.4 * s); const d = (flip ? -1 : 1) * s; path(g, p => { p.moveTo(x, y - 24 * s); p.lineTo(x + d * 30, y - 22 * s); p.lineTo(x + d * 24, y - 12 * s); p.lineTo(x + d * 30, y - 2 * s); p.lineTo(x, y); p.closePath(); }, col, INK, 1.6 * s); },
  flag(g, x, y, s = 1, col = INDIGO) { line(g, [x, y + 12 * s, x, y - 14 * s], INK, 3.4 * s); line(g, [x, y + 12 * s, x, y - 14 * s], '#7a5a40', 1.8 * s); poly(g, [x, y - 14 * s, x + 15 * s, y - 10.5 * s, x, y - 6 * s], col, INK, 1.3 * s); },
  coin(g, x, y, r, on = true) { ell(g, x, y, r, r, on ? OCHRE : '#c9bfa6', INK, Math.max(1.2, r * 0.11)); rr(g, x - r * 0.34, y - r * 0.34, r * 0.68, r * 0.68, 1, on ? '#8a5f1c' : '#a99f86'); },
  sack(g, x, y, s = 1) { path(g, p => { p.moveTo(x - 9 * s, y + 10 * s); p.quadraticCurveTo(x - 13 * s, y - 2 * s, x - 5 * s, y - 7 * s); p.lineTo(x + 5 * s, y - 7 * s); p.quadraticCurveTo(x + 13 * s, y - 2 * s, x + 9 * s, y + 10 * s); p.closePath(); }, '#d9c39a', INK, 1.5 * s); poly(g, [x - 5 * s, y - 7 * s, x - 7 * s, y - 13 * s, x + 7 * s, y - 13 * s, x + 5 * s, y - 7 * s], '#d9c39a', INK, 1.4 * s); line(g, [x - 5.5 * s, y - 7 * s, x + 5.5 * s, y - 7 * s], RED, 2 * s); },
  star(g, x, y, r, col = OCHRE) { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.46 : r; g[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * q, y + Math.sin(a) * q); } g.closePath(); fs(g, col, INK, Math.max(1, r * 0.14)); },
  menu(g, x, y) { for (const dy of [-8, 0, 8]) line(g, [x - 13, y + dy, x + 13, y + dy], INK, 3.4); },
  pause(g, x, y) { rr(g, x - 9, y - 11, 6.5, 22, 2, INK); rr(g, x + 2.5, y - 11, 6.5, 22, 2, INK); },
  sound(g, x, y, on = true) { poly(g, [x - 12, y - 5, x - 5, y - 5, x + 3, y - 12, x + 3, y + 12, x - 5, y + 5, x - 12, y + 5], INK); if (on) { g.beginPath(); g.arc(x + 4, y, 8, -0.8, 0.8); st(g, INK, 2.6); g.beginPath(); g.arc(x + 4, y, 13.5, -0.8, 0.8); st(g, INK, 2.6); } else { line(g, [x + 8, y - 6, x + 17, y + 6], RED, 3); line(g, [x + 17, y - 6, x + 8, y + 6], RED, 3); } },
  check(g, x, y, s, ok) { if (ok) line(g, [x - 8 * s, y, x - 2 * s, y + 7 * s, x + 9 * s, y - 8 * s], TEAL, 4 * s); else { line(g, [x - 7 * s, y - 7 * s, x + 7 * s, y + 7 * s], '#a9a394', 3.4 * s); line(g, [x + 7 * s, y - 7 * s, x - 7 * s, y + 7 * s], '#a9a394', 3.4 * s); } },
  heart(g, x, y, s) { path(g, p => { p.moveTo(x, y + 9 * s); p.bezierCurveTo(x - 15 * s, y - 2 * s, x - 9 * s, y - 13 * s, x, y - 5 * s); p.bezierCurveTo(x + 9 * s, y - 13 * s, x + 15 * s, y - 2 * s, x, y + 9 * s); }, RED, INK, 1.4 * s); },
  blade(g, x, y, s) { g.save(); g.translate(x, y); g.rotate(0.7); path(g, p => { p.moveTo(-2.4 * s, 4 * s); p.quadraticCurveTo(-1.5 * s, -8 * s, 4 * s, -15 * s); p.quadraticCurveTo(3 * s, -6 * s, 2.6 * s, 4 * s); p.closePath(); }, '#e4e8ea', INK, 1.3 * s); rr(g, -5 * s, 3.4 * s, 10 * s, 3 * s, 1, OCHRE, INK, 1.1 * s); line(g, [0, 6.5 * s, 0, 13 * s], '#5a3a26', 3 * s); g.restore(); },
  people(g, x, y, s, col = INDIGO) { ell(g, x, y - 6 * s, 5 * s, 5 * s, '#f1cfa4', INK, 1.3 * s); path(g, p => { p.moveTo(x - 8 * s, y + 10 * s); p.quadraticCurveTo(x - 7 * s, y - 1 * s, x, y - 1 * s); p.quadraticCurveTo(x + 7 * s, y - 1 * s, x + 8 * s, y + 10 * s); p.closePath(); }, col, INK, 1.3 * s); },
};
