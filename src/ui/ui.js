// 즉시 모드 UI — 한지 판과 놋쇠 귀장식, 쪽빛 옻칠에 금선, 붉은 낙관
import { TAU, INK, PAPER, RED, REDD, INDIGO, NAVY, TEAL, OCHRE, SUB, FONT, FONT_B, st, fs, ell, rr, rrPath, poly, line, path, text, clamp, makeCanvas } from '../render/draw.js';

export const C = { paper: PAPER, tray: '#1f2a47', ink: INK, sub: SUB, navy: NAVY, indigo: INDIGO, red: RED, redD: REDD, gold: OCHRE, teal: TEAL, grey: '#a9a394', cream: '#fbf7ec', dim: '#a4afcc', gilt: '#e2b85a' };

// 입력 상태는 main.js 가 매 프레임 갱신한다
// layer/top: 겹침 화면(덱·군대 살피기)이 떠 있으면 그 아래 층의 버튼은 눌리지 않는다
export const ui = { inp: null, active: null, sfx: null, layer: 0, top: 0 };
export function inRect(p, x, y, w, h) { return p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h; }
export function tapped(id, x, y, w, h) {
  const i = ui.inp; let hit = false; if (ui.layer < ui.top) return false;
  if (i.pressed && inRect(i, x, y, w, h) && !ui.active) ui.active = id;
  if (i.released && ui.active === id && inRect(i, x, y, w, h) && !i.dragged) hit = true;
  return hit;
}
export function isDown(id, x, y, w, h) { return ui.layer >= ui.top && ui.active === id && ui.inp.down && inRect(ui.inp, x, y, w, h); }

// 자주 그리는 판은 한 번 그려 두고 다시 쓴다 (크기·모양이 같으면 같은 그림)
const CS = 2, baked = new Map();
function bake(g, key, x, y, w, h, pad, draw) {
  let c = baked.get(key);
  if (!c) { if (baked.size > 96) baked.delete(baked.keys().next().value); c = makeCanvas((w + pad * 2) * CS, (h + pad * 2) * CS); const cg = c.getContext('2d'); cg.scale(CS, CS); cg.translate(pad, pad); draw(cg); baked.set(key, c); }
  g.drawImage(c, x - pad, y - pad, c.width / CS, c.height / CS);
}
const vgrad = (g, y0, y1, a, b, mid) => { const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, a); if (mid) gr.addColorStop(mid[0], mid[1]); gr.addColorStop(1, b); return gr; };
// 칠보문: 쪽빛 바탕에 옅게 깔리는 겹친 고리 무늬
function chilbo(g, w, h, a = 0.07) { const s = 17, r = s / Math.SQRT2; g.save(); g.beginPath(); g.rect(0, 0, w, h); g.clip(); g.strokeStyle = `rgba(226,184,90,${a})`; g.lineWidth = 0.9; for (let y = 0; y <= h + s; y += s) for (let x = 0; x <= w + s; x += s) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); } g.restore(); }
// 놋쇠 귀장식 (왼쪽 위 귀 기준, 뒤집어 네 귀에 박는다)
function corner(g) {
  path(g, p => { p.moveTo(4.4, 3); p.lineTo(27, 3); p.quadraticCurveTo(27, 9, 21, 9); p.lineTo(13.4, 9); p.quadraticCurveTo(9, 9, 9, 13.4); p.lineTo(9, 21); p.quadraticCurveTo(9, 27, 3, 27); p.lineTo(3, 4.4); p.quadraticCurveTo(3, 3, 4.4, 3); p.closePath(); }, '#d6a640', INK, 1.3);
  line(g, [5.4, 5, 24, 5], 'rgba(255,242,196,0.8)', 1); line(g, [5, 5.4, 5, 24], 'rgba(255,242,196,0.8)', 1);
  ell(g, 7.2, 7.2, 1.5, 1.5, '#8a5f1c'); ell(g, 20.4, 6.2, 1, 1, '#8a5f1c'); ell(g, 6.2, 20.4, 1, 1, '#8a5f1c');
}
function paperPanel(g, w, h) {
  rr(g, 3, 6, w, h, 7, 'rgba(40,28,16,0.26)'); rr(g, 0, 0, w, h, 7, vgrad(g, 0, h, '#fdf7e7', '#efe4c8', [0.55, PAPER]), INK, 2.6);
  let sd = (w * 3 + h) | 0; const R = () => { sd = (sd * 1664525 + 1013904223) >>> 0; return sd / 4294967296; };
  g.save(); g.beginPath(); rrPath(g, 1.5, 1.5, w - 3, h - 3, 6); g.clip(); g.lineWidth = 0.9; const n = Math.min(320, (w * h / 3000) | 0);
  for (let k = 0; k < n; k++) { const px = R() * w, py = R() * h, a = R() * TAU, l = 5 + R() * 12; g.strokeStyle = R() < 0.5 ? 'rgba(160,136,92,0.16)' : 'rgba(255,255,255,0.5)'; g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); g.stroke(); }
  rr(g, 0, 0, w, h, 7, null, 'rgba(150,118,66,0.13)', 16); g.restore();
  rr(g, 7, 7, w - 14, h - 14, 3.5, null, 'rgba(38,42,54,0.5)', 1.1); rr(g, 10, 10, w - 20, h - 20, 2.5, null, 'rgba(201,150,46,0.75)', 0.9);
  if (w > 150 && h > 110) for (const [cx, cy, sx, sy] of [[0, 0, 1, 1], [w, 0, -1, 1], [0, h, 1, -1], [w, h, -1, -1]]) { g.save(); g.translate(cx, cy); g.scale(sx, sy); corner(g); g.restore(); }
}
function navyPanel(g, w, h) {
  rr(g, 3, 6, w, h, 9, 'rgba(40,28,16,0.26)'); rr(g, 0, 0, w, h, 9, vgrad(g, 0, h, '#2b3b60', '#18213a'), INK, 2.6);
  g.save(); g.beginPath(); rrPath(g, 1.5, 1.5, w - 3, h - 3, 8); g.clip(); chilbo(g, w, h); g.restore();
  rr(g, 6, 6, w - 12, h - 12, 5, null, 'rgba(226,184,90,0.8)', 1.2); rr(g, 9, 9, w - 18, h - 18, 3.5, null, 'rgba(226,184,90,0.3)', 0.8);
}
// 아래쪽 패 받침: 쪽빛 옻칠 판에 금선과 붉은 선을 두른다
function trayPanel(g, w, h) {
  g.fillStyle = vgrad(g, 0, h, '#283558', '#131a2e', [0.14, '#1f2a47']); g.fillRect(0, 0, w, h); chilbo(g, w, h, 0.055);
  g.fillStyle = vgrad(g, 0, 16, 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0)'); g.fillRect(0, 0, w, 16);
  g.fillStyle = INK; g.fillRect(0, -5, w, 6); g.fillStyle = '#e2b85a'; g.fillRect(0, 1, w, 2.2); g.fillStyle = 'rgba(200,64,47,0.95)'; g.fillRect(0, 5.2, w, 1.3);
}
// 머리 띠: 쪽빛 바탕, 아래 단에 회문(번개무늬)과 금선
function hudPanel(g, w, h) {
  g.fillStyle = vgrad(g, 0, h, '#2c3c62', '#1a2440'); g.fillRect(0, 0, w, h); chilbo(g, w, h, 0.05);
  g.fillStyle = 'rgba(8,12,26,0.3)'; g.fillRect(0, h - 11, w, 11);
  g.strokeStyle = 'rgba(226,184,90,0.5)'; g.lineWidth = 1; g.lineJoin = 'miter'; g.beginPath();
  for (let x = 2; x < w; x += 15) { g.moveTo(x, h - 2.5); g.lineTo(x, h - 9); g.lineTo(x + 11, h - 9); g.lineTo(x + 11, h - 4.6); g.lineTo(x + 4, h - 4.6); g.lineTo(x + 4, h - 6.8); g.lineTo(x + 7.6, h - 6.8); }
  g.stroke();
  g.fillStyle = '#e2b85a'; g.fillRect(0, h, w, 3); g.fillStyle = 'rgba(120,34,26,0.9)'; g.fillRect(0, h + 3, w, 1.4);
}
export function panel(g, x, y, w, h, style = 'paper') {
  if (style === 'paper') bake(g, `p:${w}:${h}`, x, y, w, h, 10, c => paperPanel(c, w, h));
  else if (style === 'navy') bake(g, `n:${w}:${h}`, x, y, w, h, 10, c => navyPanel(c, w, h));
  else if (style === 'tray') bake(g, `t:${w}:${h}`, x, y, w, h, 6, c => trayPanel(c, w, h));
  else if (style === 'hud') bake(g, `h:${w}:${h}`, x, y, w, h, 6, c => hudPanel(c, w, h));
  else if (style === 'tag') { const r = Math.min(h / 2, 8); rr(g, x, y, w, h, r, vgrad(g, y, y + h, '#fdf8ea', '#ede2c6'), INK, 1.8); rr(g, x + 2.8, y + 2.8, w - 5.6, h - 5.6, Math.max(1, r - 2.6), null, 'rgba(38,42,54,0.17)', 0.9); }
}
// [위, 아래, 옆면(두께), 글자, 장식선]
const BTN = {
  indigo: ['#40619a', '#27426f', '#16233f', C.cream, '#e2b85a'], red: ['#cc4a3b', '#9a2a22', '#5e1512', C.cream, '#f3c9a0'], paper: ['#fdf8ea', '#eadfc3', '#b5a888', INK, 'rgba(38,42,54,0.36)'],
  teal: ['#4f8270', '#325a4c', '#1c362d', C.cream, '#e2b85a'], navy: ['#33456f', '#1c2745', '#0c1222', C.cream, '#e2b85a'], grey: ['#c4bfb0', '#a39d8d', '#7d7768', '#5a5346', 'rgba(90,83,70,0.45)'],
};
export function button(g, id, x, y, w, h, label, o = {}) {
  const name = o.style || 'indigo', sty = BTN[name], dis = !!o.disabled, light = name === 'paper' || name === 'grey';
  const hit = !dis && tapped(id, x, y, w, h), dn = !dis && isDown(id, x, y, w, h), off = dn ? 3 : 0;
  const r = o.r === undefined ? Math.min(11, h * 0.2) : Math.min(o.r, 12), yy = y + off, orn = w >= 220 && h >= 50;
  g.save(); if (dis) g.globalAlpha *= 0.55;
  rr(g, x, y + 5, w, h, r, sty[2], INK, 2.6); rr(g, x, yy, w, h, r, vgrad(g, yy, yy + h, sty[0], sty[1]), INK, 2.6);
  g.save(); g.beginPath(); rrPath(g, x + 1.6, yy + 1.6, w - 3.2, h - 3.2, Math.max(1, r - 1.4)); g.clip(); g.fillStyle = light ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.16)'; g.fillRect(x, yy, w, Math.max(3, h * 0.1)); g.fillStyle = 'rgba(0,0,0,0.1)'; g.fillRect(x, yy + h - Math.max(3, h * 0.1), w, h); g.restore();
  rr(g, x + 5, yy + 5, w - 10, h - 10, Math.max(2, r - 4), null, sty[4], 1.2);
  if (orn) for (const s of [-1, 1]) { const cx = x + w / 2 + s * (w / 2 - 22), cy = yy + h / 2; poly(g, [cx - 5, cy, cx, cy - 5, cx + 5, cy, cx, cy + 5], null, sty[4], 1.2); poly(g, [cx - 2, cy, cx, cy - 2, cx + 2, cy, cx, cy + 2], sty[4]); line(g, [cx - s * 8, cy, cx - s * 15, cy], sty[4], 1.1); }
  const size = o.size || Math.min(36, h * 0.46), tx = x + w / 2, ty = yy + h / 2 + 1, tw = w - (orn ? 78 : 22);
  if (!light) text(g, label, tx, ty + 1.8, { size, font: o.font || FONT_B, fill: 'rgba(8,10,24,0.34)', maxW: tw });
  text(g, label, tx, ty, { size, font: o.font || FONT_B, fill: sty[3], maxW: tw });
  g.restore();
  if (hit && ui.sfx) ui.sfx('click');
  return hit;
}
export function iconBtn(g, id, x, y, w, h, draw, o = {}) {
  const hit = tapped(id, x, y, w, h), dn = isDown(id, x, y, w, h), off = dn ? 2 : 0;
  rr(g, x, y + 3, w, h, 7, '#b5a888', INK, 2.2); rr(g, x, y + off, w, h, 7, o.on ? vgrad(g, y, y + h, '#f8e6ac', '#e6c978') : vgrad(g, y, y + h, '#fdf8ea', '#eadfc3'), INK, 2.2);
  rr(g, x + 3.4, y + 3.4 + off, w - 6.8, h - 6.8, 4.4, null, 'rgba(38,42,54,0.2)', 0.9);
  draw(g, x + w / 2, y + h / 2 + off);
  if (hit && ui.sfx) ui.sfx('click');
  return hit;
}
export function bar(g, x, y, w, h, t, col, o = {}) {
  rr(g, x, y, w, h, h / 2, o.back || '#0d1424', 'rgba(20,22,34,0.42)', 1); const f = clamp(t, 0, 1);
  if (f > 0.01) {
    const fw = (w - 4) * f, fx = o.right ? x + 2 + (w - 4) * (1 - f) : x + 2, ih = h - 4;
    g.save(); g.beginPath(); rrPath(g, x + 2, y + 2, w - 4, ih, ih / 2); g.clip();
    g.fillStyle = col; g.fillRect(fx, y + 2, fw, ih); g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(fx, y + 2, fw, Math.max(1.4, ih * 0.34)); g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(fx, y + 2 + ih - Math.max(1.2, ih * 0.24), fw, ih);
    if (f < 0.995) { g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(o.right ? fx : fx + fw - 1.5, y + 2, 1.5, ih); }
    g.restore();
  }
}
// 붉은 도장: 테두리를 한 번 더 새긴 낙관
export function seal(g, x, y, s, ch, col = RED, o = {}) {
  const dk = o.dark || 'rgba(30,20,20,0.55)', r = s * 0.14, x0 = x - s / 2, y0 = y - s / 2;
  rr(g, x0, y0, s, s, r, col, dk, Math.max(1.6, s * 0.03));
  if (s >= 22) { g.save(); g.beginPath(); rrPath(g, x0, y0, s, s, r); g.clip(); g.fillStyle = 'rgba(255,255,255,0.13)'; g.fillRect(x0, y0, s, s * 0.4); g.fillStyle = 'rgba(0,0,0,0.13)'; g.fillRect(x0, y0 + s * 0.84, s, s); g.restore(); }
  g.save(); g.globalAlpha *= 0.5; rr(g, x0 + s * 0.085, y0 + s * 0.085, s * 0.83, s * 0.83, s * 0.07, null, C.cream, Math.max(0.8, s * 0.026)); g.restore();
  text(g, ch, x, y + s * 0.04 + (o.dy || 0), { size: s * (o.k || 0.6), font: FONT_B, fill: C.cream });
}
export function stamp(g, x, y, r, ch, col = RED, rot = -0.12) { g.save(); g.translate(x, y); g.rotate(rot); ell(g, 0, 0, r, r, 'rgba(251,247,236,0.82)', col, r * 0.1); ell(g, 0, 0, r * 0.82, r * 0.82, null, col, r * 0.04); text(g, ch, 0, r * 0.08, { size: r * 1.15, font: FONT_B, fill: col }); g.restore(); }
// 붓으로 한 번에 그은 제목 띠: 붓끝이 갈라지고 마른 붓 자국(비백)이 남는다
export function brushTitle(g, x, y, w, h, label, col = INDIGO, size = 40) {
  const L = x - w / 2 - 20, Rt = x + w / 2 + 20, t = y - h / 2, b = y + h / 2;
  const body = p => { p.moveTo(L + 10, t + 5); p.quadraticCurveTo(L - 7, y - 2, L + 6, b - 3); p.quadraticCurveTo(x, b + 3, Rt - 34, b - 2); p.lineTo(Rt - 3, b - 8); p.lineTo(Rt - 27, b - h * 0.24); p.lineTo(Rt + 9, y + 3); p.lineTo(Rt - 23, y - h * 0.1); p.lineTo(Rt + 2, t + h * 0.16); p.lineTo(Rt - 30, t + 3); p.quadraticCurveTo(x, t - 3, L + 10, t + 5); p.closePath(); };
  g.save(); g.translate(2.5, 4.5); g.globalAlpha *= 0.24; path(g, body, '#1a1420'); g.restore();
  path(g, body, col);
  g.save(); g.beginPath(); body(g); g.clip(); g.fillStyle = 'rgba(0,0,0,0.17)'; g.fillRect(L - 10, b - h * 0.2, Rt - L + 30, h); g.fillStyle = 'rgba(255,255,255,0.1)'; g.fillRect(L - 10, t - 4, Rt - L + 30, h * 0.2);
  g.globalAlpha *= 0.2; for (let i = 0; i < 5; i++) { const yy = t + h * (0.2 + i * 0.15); line(g, [Rt - 96 - ((i * 53) % 70), yy, Rt + 10, yy + (i % 2 ? 1.2 : -1)], '#fff', 1 + (i % 3) * 0.7); } g.restore();
  line(g, [x - w / 2 + 4, b - 9, x + w / 2 - 12, b - 10], '#e2b85a', 1.4);
  text(g, label, x, y + 2.6, { size, font: FONT_B, fill: 'rgba(8,10,24,0.32)', maxW: w - 20 }); text(g, label, x, y + 1, { size, font: FONT_B, fill: C.cream, maxW: w - 20 });
}

export const icon = {
  banner(g, x, y, col, flip, s = 1) { line(g, [x, y + 26 * s, x, y - 26 * s], INK, 4.5 * s); line(g, [x, y + 26 * s, x, y - 26 * s], '#7a5a40', 2.4 * s); const d = (flip ? -1 : 1) * s; path(g, p => { p.moveTo(x, y - 24 * s); p.lineTo(x + d * 30, y - 22 * s); p.lineTo(x + d * 24, y - 12 * s); p.lineTo(x + d * 30, y - 2 * s); p.lineTo(x, y); p.closePath(); }, col, INK, 1.6 * s); },
  flag(g, x, y, s = 1, col = INDIGO) { line(g, [x, y + 12 * s, x, y - 14 * s], INK, 3.4 * s); line(g, [x, y + 12 * s, x, y - 14 * s], '#7a5a40', 1.8 * s); poly(g, [x, y - 14 * s, x + 15 * s, y - 10.5 * s, x, y - 6 * s], col, INK, 1.3 * s); },
  // 엽전: 둥근 테에 네모 구멍. 꺼진 것은 빈 자리로 그린다
  coin(g, x, y, r, on = true) {
    if (!on) { ell(g, x, y, r, r, 'rgba(6,10,22,0.45)', 'rgba(154,166,196,0.5)', Math.max(1, r * 0.09)); rr(g, x - r * 0.3, y - r * 0.3, r * 0.6, r * 0.6, 1, null, 'rgba(154,166,196,0.38)', 1); return; }
    const lw = Math.max(1.1, r * 0.1);
    ell(g, x, y, r, r, '#e4b54c', INK, lw);
    g.save(); g.beginPath(); g.arc(x, y, r - lw * 0.5, 0, TAU); g.clip(); g.fillStyle = 'rgba(128,74,10,0.3)'; g.beginPath(); g.rect(x - r, y - r, r * 2, r * 2); g.arc(x - r * 0.2, y - r * 0.24, r * 0.98, 0, TAU, true); g.fill('evenodd'); g.restore();
    if (r >= 9) ell(g, x, y, r * 0.74, r * 0.74, null, 'rgba(122,78,18,0.5)', Math.max(0.7, r * 0.06));
    rr(g, x - r * 0.3, y - r * 0.3, r * 0.6, r * 0.6, r * 0.06, '#6f4a14', INK, Math.max(0.7, r * 0.07));
    g.beginPath(); g.arc(x, y, r * 0.86, Math.PI * 1.06, Math.PI * 1.5); st(g, 'rgba(255,246,208,0.85)', Math.max(0.8, r * 0.09));
  },
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
