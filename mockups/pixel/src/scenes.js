// 도트 시안의 네 장면: 전투 · 인형극 무대(주막) · 타이틀 · 인형 도감
import { LW, LH, P, INK, Spr, css, txt, wrap, draw, bayer, rng, logo, textW, tinted } from './px.js';
import { look, LOOKS, jangseung, bannerCart, pine, sansuyu, rock, tuft, lantern } from './sprites.js';

export const C = (n, i = 2) => P[n][i];
export const fr = (g, x, y, w, h, col) => { g.fillStyle = typeof col === 'number' ? css(col) : col; g.fillRect(x | 0, y | 0, w | 0, h | 0); };
// 도트 판: 먹 테 · 금 테 · 안쪽 빛과 그늘
export function panel(g, x, y, w, h, o = {}) {
  const fill = o.fill === undefined ? C('ink', 2) : o.fill, edge = o.edge === undefined ? C('gold', 2) : o.edge;
  fr(g, x + 1, y, w - 2, h, INK); fr(g, x, y + 1, w, h - 2, INK); fr(g, x + 1, y + 1, w - 2, h - 2, edge); fr(g, x + 2, y + 2, w - 4, h - 4, fill);
  if (o.hi !== undefined) fr(g, x + 2, y + 2, w - 4, 1, o.hi); if (o.lo !== undefined) fr(g, x + 2, y + h - 3, w - 4, 1, o.lo);
  if (o.corner !== false) for (const [cx, cy] of [[x + 1, y + 1], [x + w - 3, y + 1], [x + 1, y + h - 3], [x + w - 3, y + h - 3]]) fr(g, cx, cy, 2, 2, C('gold', 4));
}
export function button(g, x, y, w, h, label, ramp, f = 'b') {
  fr(g, x + 1, y, w - 2, h, INK); fr(g, x, y + 1, w, h - 2, INK); fr(g, x + 1, y + 1, w - 2, h - 2, C(ramp, 2)); fr(g, x + 1, y + 1, w - 2, 2, C(ramp, 3)); fr(g, x + 1, y + h - 4, w - 2, 3, C(ramp, 1)); fr(g, x + 2, y + 1, w - 4, 1, C(ramp, 4));
  txt(g, label, x + w / 2, y + (h - 11) / 2, { f, a: 'c', c: C('cream', 4), sh: C(ramp, 0) });
}
// 단청 띠: 작은 색 조각이 되풀이된다
export function dancheong(g, x, y, w, h = 4) { const cols = [C('teal', 2), C('red', 2), C('gold', 3), C('blue', 2), C('white', 3), C('red', 2)]; fr(g, x, y, w, h, C('teal', 1)); for (let i = 0; i * 6 < w; i++) { fr(g, x + i * 6, y + 1, 4, h - 2, cols[i % cols.length]); fr(g, x + i * 6 + 1, y + 1, 1, 1, C('white', 4)); } fr(g, x, y, w, 1, INK); fr(g, x, y + h - 1, w, 1, INK); }
export const coin = (g, x, y, on = true) => { fr(g, x + 2, y, 7, 11, INK); fr(g, x, y + 2, 11, 7, INK); fr(g, x + 1, y + 1, 9, 9, INK); fr(g, x + 2, y + 1, 7, 9, on ? C('gold', 3) : C('night', 2)); fr(g, x + 1, y + 2, 9, 7, on ? C('gold', 3) : C('night', 2)); if (on) { fr(g, x + 2, y + 1, 4, 1, C('gold', 4)); fr(g, x + 1, y + 2, 1, 3, C('gold', 4)); fr(g, x + 5, y + 9, 4, 1, C('gold', 1)); fr(g, x + 9, y + 5, 1, 4, C('gold', 1)); } fr(g, x + 4, y + 4, 3, 3, on ? C('gold', 0) : INK); if (on) fr(g, x + 4, y + 4, 3, 1, INK); };

// ── 풍경을 굽는 도구 ──
export const ridge = (x, base, amp, f, ph) => base - amp * (0.55 * Math.sin(x * f + ph) + 0.3 * Math.sin(x * f * 2.3 + ph * 1.7) + 0.15 * Math.sin(x * f * 5.1 + ph * 0.6));
export function mountains(s, base, amp, f, ph, col, lit, haze, yEnd, o = {}) {
  const R = rng((ph * 1000) | 0 || 7);
  for (let x = 0; x < s.w; x++) {
    const y0 = Math.round(ridge(x, base, amp, f, ph)), up = ridge(x + 1, base, amp, f, ph) < ridge(x, base, amp, f, ph) - 0.05;
    for (let y = y0; y < yEnd; y++) {
      const d = y - y0; let c = col;
      if (up && d < 7 && bayer(x, y) > d / 7) c = lit; else if (!up && d < 3 && bayer(x, y) > 0.7) c = lit;
      const hz = (y - (yEnd - (o.mist || 14))) / (o.mist || 14); if (hz > 0 && bayer(x, y) < hz) c = haze;
      s.set(x, y, c);
    }
    if (o.trees && R() < o.trees) { const h = 2 + ((R() * 3) | 0); for (let k = 0; k < h; k++) s.hl(x - (k >> 1), x + (k >> 1), y0 - h + k + 1, o.treeCol); }
  }
}
export function cloud(s, cx, cy, w, cols, seed) { const R = rng(seed); const t = new Spr(s.w, s.h); for (let k = 0; k < w / 5; k++) { const x = cx + (R() - 0.5) * w, r = 3 + R() * 8 * (1 - Math.abs(x - cx) / w * 1.6); t.ell(x, cy - r * 0.6, r * 1.7, Math.max(2, r), cols[1]); } for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) { if (t.get(x, y) === -1) continue; if (y > cy) { t.set(x, y, -1); continue; } s.set(x, y, t.get(x, y - 1) === -1 || t.get(x, y - 2) === -1 ? cols[2] : y >= cy - 1 ? cols[0] : cols[1]); } }
export function stamp(s, spr, x, y) { s.blit(spr, Math.round(x) - spr.ox, Math.round(y) - spr.oy); }

// ───────── 1. 전투: variants.js 에서 테마별로 굽고 그린다 ─────────
export const UNITS = [
  // [종류, x, y, 흔들림 위상]
  ['commander', 246, 216, 0], ['sword', 300, 186, 1], ['sword', 322, 194, 2], ['sword', 296, 204, 3], ['sword', 318, 212, 0.5],
  ['shield', 342, 236, 1.5], ['shield', 358, 250, 2.5], ['shield', 336, 258, 0.2],
  ['archer', 160, 176, 2], ['archer', 182, 184, 3], ['archer', 154, 194, 0.7], ['archer', 176, 202, 1.2],
  ['priest', 112, 232, 1], ['priest', 134, 244, 2.2], ['priest', 108, 256, 0.4],
  ['spear', 232, 256, 3], ['spear', 254, 266, 1.8], ['spear', 210, 268, 0.9],
  ['wizard', 96, 196, 2.6],
  ['goblin', 388, 184, 0.3], ['goblin', 410, 192, 1.3], ['goblin', 392, 204, 2.3], ['goblin', 418, 212, 3.3], ['goblin', 396, 250, 1.1], ['goblin', 420, 262, 2.1], ['goblin', 440, 246, 0.6],
  ['ogre', 476, 196, 1.7], ['ogre', 500, 214, 2.7], ['ogre', 474, 228, 0.1], ['ghost', 520, 262, 2.9], ['ghost', 544, 250, 1.4],
  ['tiger', 574, 226, 0],
];
const ICONS = {};
export function icon(kind) {
  if (ICONS[kind]) return ICONS[kind]; const s = new Spr(26, 24, 13, 12);
  if (kind === 'arrows') { for (const [x, d] of [[5, 0], [11, 3], [17, 1], [22, 4]]) { s.line(x, 3 + d, x - 3, 17 + d, C('wood', 3)); s.set(x - 3, 18 + d, C('steel', 4)); s.set(x - 3, 19 + d, C('steel', 3)); s.set(x - 4, 18 + d, C('steel', 2)); s.set(x, 2 + d, C('red', 2)); s.set(x + 1, 3 + d, C('red', 3)); s.set(x - 1, 2 + d, C('white', 4)); } }
  else if (kind === 'drum') { const t = new Spr(26, 24); t.ell(13, 12, 9, 9, C('red', 2)); t.shade(1, 2); s.blit(t, 0, 0); s.ell(13, 12, 6, 6, C('cream', 3)); for (let y = 7; y <= 17; y++) for (let x = 8; x <= 18; x++) if (Math.hypot(x - 13, y - 12) < 3.6) s.set(x, y, y < 12 - Math.sin((x - 13) / 3.5 * 1.57) * 1.6 ? C('red', 2) : C('blue', 2)); for (const a of [0.6, 2.5, 3.8, 5.6]) s.set(Math.round(13 + Math.cos(a) * 9), Math.round(12 + Math.sin(a) * 9), C('gold', 4)); s.line(21, 2, 24, 8, C('wood', 3)); s.rect(20, 1, 2, 2, C('cream', 4)); }
  else if (kind === 'bolt') { const t = new Spr(26, 24); t.ell(12, 7, 9, 4, C('purple', 2)); t.ell(8, 8, 5, 4, C('purple', 2)); t.ell(17, 8, 6, 4, C('purple', 2)); t.shade(1, 1); s.blit(t, 0, 0); s.poly([[13, 9], [16, 9], [13, 15], [16, 15], [10, 23], [12, 16], [9, 16]], C('gold', 4)); s.line(13, 10, 11, 16, C('white', 4)); }
  ICONS[kind] = s.outline(); return ICONS[kind];
}
export function card(g, x, y, o) {
  const band = { unit: 'blue', atk: 'red', sup: 'teal' }[o.kind], w = 56, h = 70;
  fr(g, x + 2, y + 3, w, h, 'rgba(10,8,20,0.45)');
  fr(g, x + 1, y, w - 2, h, INK); fr(g, x, y + 1, w, h - 2, INK); fr(g, x + 1, y + 1, w - 2, h - 2, o.dim ? C('cream', 1) : C('cream', 3)); fr(g, x + 1, y + h - 4, w - 2, 3, C('cream', 1)); fr(g, x + 2, y + 14, w - 4, 40, o.dim ? C('cream', 0) : C('cream', 2));
  fr(g, x + 1, y + 1, w - 2, 13, C(band, 2)); fr(g, x + 1, y + 1, w - 2, 1, C(band, 3)); fr(g, x + 1, y + 12, w - 2, 2, C(band, 1)); fr(g, x + 1, y + 14, w - 2, 1, INK);
  // 그림 칸
  g.save(); g.beginPath(); g.rect(x + 2, y + 15, w - 4, 39); g.clip();
  if (o.spr) { fr(g, x + 2, y + 44, w - 4, 10, C('grass', 3)); fr(g, x + 2, y + 44, w - 4, 1, C('grass', 4)); draw(g, look(o.spr), x + 26, y + 52); } else { for (let r = 15; r > 0; r -= 5) { g.fillStyle = css(C(band, 3)); g.globalAlpha = 0.18; g.beginPath(); g.arc(x + 28, y + 34, r, 0, 7); g.fill(); } g.globalAlpha = 1; draw(g, icon(o.icon), x + 28, y + 34); }
  g.restore(); fr(g, x + 1, y + 54, w - 2, 1, INK);
  txt(g, o.name, x + w / 2 + 4, y + 3, { f: 9, a: 'c', c: C('cream', 4), sh: C(band, 0) });
  txt(g, { unit: '병력', atk: '공격', sup: '지원' }[o.kind], x + w / 2, y + 57, { f: 9, a: 'c', c: C(band, 1) });
  // 사기 값 엽전
  fr(g, x - 3, y - 5, 11, 15, INK); fr(g, x - 5, y - 3, 15, 11, INK); fr(g, x - 4, y - 4, 13, 13, INK); fr(g, x - 3, y - 4, 11, 13, C('gold', 3)); fr(g, x - 4, y - 3, 13, 11, C('gold', 3)); fr(g, x - 3, y - 4, 11, 2, C('gold', 4)); fr(g, x - 3, y + 7, 11, 2, C('gold', 1)); txt(g, o.cost, x + 3, y - 4, { f: 'b', a: 'c', c: INK });
  if (o.sel) { fr(g, x - 1, y - 1, w + 2, 1, C('gold', 4)); fr(g, x - 1, y + h, w + 2, 1, C('gold', 4)); fr(g, x - 1, y, 1, h, C('gold', 4)); fr(g, x + w, y, 1, h, C('gold', 4)); }
}
export function hud(g, t) {
  // 위 띠
  fr(g, 0, 0, LW, 24, C('night', 1)); fr(g, 0, 0, LW, 1, C('night', 3)); dancheong(g, 0, 22, LW, 4);
  fr(g, 5, 3, 17, 17, INK); fr(g, 6, 4, 15, 15, C('blue', 2)); g.save(); g.beginPath(); g.rect(6, 4, 15, 15); g.clip(); draw(g, look('commander'), 13, 44); g.restore();
  txt(g, '남은 병력', 26, 3, { f: 9, c: C('cream', 2) }); txt(g, '전장 19 · 대기 패 6', 26, 13, { f: 9, c: C('cream', 4) });
  txt(g, '첫째 고개', 172, 6, { f: 'b', c: C('gold', 4), sh: INK });
  // 길: 지나온 곳과 갈 곳
  fr(g, 232, 11, 214, 2, C('night', 3)); fr(g, 232, 11, 80, 2, C('gold', 3));
  const stops = [['blue'], ['gold'], ['blue'], ['red'], ['teal'], ['red']];
  stops.forEach(([rc], i) => { const x = 232 + i * 40, cur = i === 2; fr(g, x - 1, 4, 14, 15, INK); fr(g, x, 5, 12, 13, C(rc, i < 2 ? 1 : 2)); fr(g, x, 5, 12, 1, C(rc, 3)); const sy = 7;
    if (i === 1) txt(g, '?', x + 6, 6, { f: 'b', a: 'c', c: C('cream', 3) }); else if (i === 4) { fr(g, x + 4, sy + 1, 4, 2, C('cream', 4)); fr(g, x + 3, sy + 3, 6, 6, C('cream', 4)); fr(g, x + 5, sy, 2, 1, C('cream', 4)); fr(g, x + 4, sy + 5, 4, 1, C('teal', 1)); } else if (i === 5) { fr(g, x + 3, sy, 6, 6, C('cream', 4)); fr(g, x + 4, sy + 6, 4, 2, C('cream', 4)); fr(g, x + 4, sy + 2, 1, 2, INK); fr(g, x + 7, sy + 2, 1, 2, INK); fr(g, x + 5, sy + 7, 1, 1, INK); fr(g, x + 7, sy + 7, 1, 1, INK); } else { for (let q = 0; q < 8; q++) { fr(g, x + 2 + q, sy + q, 1, 1, C('cream', 4)); fr(g, x + 9 - q, sy + q, 1, 1, C('cream', 4)); } fr(g, x + 2, sy + 6, 2, 1, C('gold', 3)); fr(g, x + 8, sy + 6, 2, 1, C('gold', 3)); }
    if (cur) { const b = Math.floor(t * 2) % 2; fr(g, x - 2, 3, 16, 1, C('gold', 4)); fr(g, x - 2, 19, 16, 1, C('gold', 4)); fr(g, x - 2, 3, 1, 17, C('gold', 4)); fr(g, x + 13, 3, 1, 17, C('gold', 4)); fr(g, x + 4, 0 - b, 4, 2, C('gold', 4)); } });
  panel(g, 486, 3, 62, 17, { fill: C('cream', 3), edge: C('gold', 1), corner: false }); coin(g, 490, 6); txt(g, '150', 543, 6, { f: 'b', a: 'r', c: INK });
  panel(g, 552, 3, 34, 17, { fill: C('cream', 3), edge: C('gold', 1), corner: false }); txt(g, '×1', 569, 6, { f: 'b', a: 'c', c: INK });
  panel(g, 590, 3, 44, 17, { fill: C('cream', 3), edge: C('gold', 1), corner: false }); for (const y of [7, 11, 15]) fr(g, 603, y, 18, 2, INK);
  // 아래 띠: 사기 · 손패 · 명령
  fr(g, 0, 284, LW, 76, C('night', 1)); dancheong(g, 0, 282, LW, 4); fr(g, 0, 286, LW, 1, C('night', 3));
  txt(g, '사기', 8, 292, { f: 'b', c: C('cream', 4), sh: INK }); txt(g, '7 / 10', 118, 293, { f: 9, a: 'r', c: C('gold', 4) });
  for (let i = 0; i < 10; i++) coin(g, 8 + (i % 5) * 23, 307 + Math.floor(i / 5) * 14, i < 7);
  txt(g, '무리 격파 +2', 8, 336, { f: 9, c: C('cream', 2) }); txt(g, '부대 6/7', 118, 336, { f: 9, a: 'r', c: C('cream', 3) }); txt(g, '전술 주머니 4/9', 8, 347, { f: 9, c: C('cream', 1) });
  const hand = [{ kind: 'atk', name: '화살비', cost: 3, icon: 'arrows' }, { kind: 'unit', name: '궁수', cost: 2, spr: 'archer' }, { kind: 'sup', name: '진군의 북', cost: 2, icon: 'drum', sel: true }, { kind: 'unit', name: '무녀', cost: 2, spr: 'priest' }, { kind: 'atk', name: '벼락', cost: 2, icon: 'bolt' }];
  hand.forEach((c0, i) => card(g, 136 + i * 62, 289 - (c0.sel ? 6 : 0), c0));
  button(g, 452, 291, 88, 28, '전군 대기', 'blue'); button(g, 546, 291, 88, 28, '전군 돌격', 'red');
  panel(g, 452, 325, 88, 26, { fill: C('cream', 3), edge: C('gold', 1), corner: false }); txt(g, '패 갈기 · 사기 1', 496, 333, { f: 9, a: 'c', c: INK });
  panel(g, 546, 325, 88, 26, { fill: C('cream', 3), edge: C('gold', 1), corner: false }); txt(g, '덱 21장', 590, 332, { f: 'b', a: 'c', c: INK });
}

// ───────── 2. 인형극 무대: 달밤의 주막 (모든 것이 2배 큰 픽셀) ─────────
let STAGE = null;
function bakeStage() {
  const W2 = 320, H2 = 180, s = new Spr(W2, H2), R = rng(5);
  // 걸개그림: 달밤
  s.vgrad(0, 0, W2, 96, [0x0e1230, 0x182250, 0x283878, 0x4458a0, 0x7080b8]);
  for (let i = 0; i < 46; i++) s.set(12 + ((R() * 296) | 0), 26 + ((R() * 52) | 0), R() < 0.3 ? 0xfff6c8 : 0x8c98d0);
  for (let y = 26; y < 76; y++) for (let x = 204; x < 262; x++) { const d = Math.hypot(x - 234, y - 50); if (d < 15) s.set(x, y, Math.hypot(x - 229, y - 46) < 4 || Math.hypot(x - 240, y - 55) < 2.5 ? 0xe8dca0 : 0xfff6c8); else if (d < 22 && bayer(x, y) > (d - 15) / 7) s.set(x, y, 0x5c70b0); }
  mountains(s, 82, 12, 0.04, 2.0, 0x26386c, 0x3c5290, 0x4c64a0, 100, { mist: 10 });
  mountains(s, 92, 8, 0.07, 5.0, 0x162450, 0x26386c, 0x2c4078, 104, { mist: 6, trees: 0.25, treeCol: 0x0e1838 });
  // 마당
  s.vgrad(0, 100, W2, 30, [0x4c4468, 0x5c5070, 0x6c5c70, 0x54486c]);
  for (let i = 0; i < 90; i++) { const x = (R() * W2) | 0, y = 102 + ((R() * 26) | 0); s.hl(x, x + 1 + ((R() * 2) | 0), y, R() < 0.5 ? 0x7c6c7c : 0x40385c); }
  // 초가: 흙벽·기둥·띠살문·볏짚 지붕
  { const x0 = 44, y0 = 62, w = 96, h = 44; const t = new Spr(W2, H2); t.rect(x0, y0, w, h, 0xc8b490); t.shade(0, 0); s.blit(t, 0, 0);
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if ((x * 7 + y * 13) % 17 === 0) s.set(x, y, 0xb09c80);
    for (const x of [x0, x0 + 30, x0 + 66, x0 + w - 3]) s.rect(x, y0, 3, h, 0x54301e); s.rect(x0, y0 + h - 4, w, 4, 0x6c5a5c); s.hl(x0, x0 + w - 1, y0 + h - 4, 0x8c7c7c);
    // 불 켜진 띠살문
    s.rect(x0 + 36, y0 + 12, 26, 28, 0xffd88c); for (let x = x0 + 38; x < x0 + 62; x += 3) s.vl(x, y0 + 12, y0 + 39, 0xa86c2c); for (const y of [y0 + 15, y0 + 25, y0 + 36]) s.hl(x0 + 36, x0 + 61, y, 0xa86c2c); s.rect(x0 + 35, y0 + 11, 28, 1, 0x54301e); s.vl(x0 + 49, y0 + 12, y0 + 39, 0x54301e);
    s.rect(x0 + 72, y0 + 16, 16, 14, 0xffe4a0); for (let x = x0 + 74; x < x0 + 88; x += 3) s.vl(x, y0 + 16, y0 + 29, 0xa86c2c); s.hl(x0 + 72, x0 + 87, y0 + 22, 0xa86c2c);
    // 지붕
    const rf = new Spr(W2, H2); rf.rows(y0 - 20, [[x0 + 22, x0 + w - 24], [x0 + 12, x0 + w - 14], [x0 + 5, x0 + w - 7], [x0, x0 + w - 2], [x0 - 4, x0 + w + 2], [x0 - 7, x0 + w + 5], [x0 - 9, x0 + w + 7], [x0 - 10, x0 + w + 8], [x0 - 11, x0 + w + 9], [x0 - 12, x0 + w + 10], [x0 - 12, x0 + w + 10], [x0 - 13, x0 + w + 11], [x0 - 13, x0 + w + 11], [x0 - 13, x0 + w + 11], [x0 - 14, x0 + w + 12], [x0 - 14, x0 + w + 12], [x0 - 14, x0 + w + 12], [x0 - 14, x0 + w + 12], [x0 - 13, x0 + w + 11], [x0 - 12, x0 + w + 10], [x0 - 10, x0 + w + 8]], C('straw', 2)); rf.shade(2, 2); s.blit(rf, 0, 0);
    for (let x = x0 - 12; x < x0 + w + 10; x += 5) { s.vl(x, y0 - 12 + ((x * 3) % 4), y0 - 1, C('straw', 1)); s.set(x + 2, y0 - 14 + (x % 5), C('straw', 4)); } for (let x = x0 - 12; x < x0 + w + 10; x += 2) s.set(x, y0 + (x % 3 ? 0 : 1), C('straw', 1));
    for (let x = x0 + 6; x < x0 + w - 6; x += 12) { s.line(x, y0 - 19, x + 4, y0 - 14, C('straw', 0)); s.line(x + 8, y0 - 19, x + 4, y0 - 14, C('straw', 0)); }
  }
  // 평상과 술상, 장독대
  { const t = new Spr(W2, H2); t.rect(176, 108, 56, 6, 0x84522c); t.shade(1, 1); s.blit(t, 0, 0); for (const x of [178, 228]) s.rect(x, 114, 3, 8, 0x54301e); for (let x = 184; x < 230; x += 8) s.vl(x, 108, 113, 0x54301e);
    s.rect(196, 102, 18, 2, 0x54301e); s.vl(198, 104, 107, 0x54301e); s.vl(211, 104, 107, 0x54301e); s.rect(200, 98, 4, 4, 0xe4e8e0); s.set(201, 97, 0xe4e8e0); s.rect(206, 100, 3, 2, 0xe4e8e0); s.rect(210, 100, 3, 2, 0xe4e8e0);
    for (const [x, y, r] of [[262, 112, 9], [280, 116, 7], [248, 118, 6], [294, 120, 5]]) { const j = new Spr(W2, H2); j.ell(x, y, r * 0.8, r, 0x54301e); j.rect(x - r * 0.5, y - r - 1, r, 2, 0x54301e); j.shade(1, 2); s.blit(j, 0, 0); s.set(Math.round(x - r * 0.4), Math.round(y - r * 0.4), 0xb8844a); s.hl(Math.round(x - r * 0.5), Math.round(x + r * 0.5), Math.round(y - r - 2), 0x2a161c); } }
  // 감나무 가지와 감
  s.line(320, 30, 288, 40, 0x2a161c, 2); s.line(296, 38, 280, 50, 0x2a161c); s.line(304, 36, 300, 54, 0x2a161c); for (const [x, y] of [[280, 52], [300, 56], [290, 44], [310, 46]]) { s.rect(x - 1, y, 3, 3, 0xec6a3c); s.set(x - 1, y, 0xffa860); s.set(x, y - 1, 0x22583c); }
  return s;
}
// 구경꾼 뒷모습 한 사람 (갓·상투·댕기·쪽·패랭이): 어깨는 짙은 쪽빛, 머리는 더 짙게, 무대 불빛을 받은 테만 밝다
function crowd(kind, far) {
  const s = new Spr(44, 44, 22, 44), body = far ? 0x1a2048 : 0x232a5c, head = far ? 0x10142e : 0x141836, rim = far ? 0x6c6c98 : 0xe4b878, rim2 = far ? 0x343c70 : 0x5a5a94;
  s.rows(26, [[13, 30], [10, 33], [8, 35], [6, 37], [5, 38], [4, 39], [4, 39], [3, 40], [3, 40], [3, 40], [3, 40], [3, 40], [3, 40], [3, 40], [3, 40], [3, 40], [3, 40], [3, 40]], body);
  const top = new Spr(44, 44); top.ell(22, 18, 8, 9, head);
  if (kind === 0) { top.rows(2, [[18, 25], [17, 26], [17, 26], [17, 26], [17, 26], [17, 26], [17, 26], [17, 26]], head); top.rows(10, [[6, 37], [4, 39], [7, 36]], head); }
  else if (kind === 1) { top.rect(20, 5, 4, 6, head); top.rect(19, 4, 6, 3, head); }
  else if (kind === 2) { top.rows(26, [[20, 23], [20, 23], [20, 23], [20, 23], [20, 23], [21, 23], [21, 22], [21, 22], [20, 23], [20, 23]], head); }
  else if (kind === 3) { top.ell(22, 25, 5, 3.5, head); }
  else { top.rows(5, [[19, 24], [18, 25], [18, 25], [18, 25], [18, 25]], 0x4a3c34); top.rows(10, [[8, 35], [6, 37]], 0x4a3c34); }
  s.blit(top, 0, 0);
  const o = new Spr(44, 44, 22, 44); o.blit(s, 0, 0);
  for (let y = 0; y < 44; y++) for (let x = 0; x < 44; x++) { const c0 = s.get(x, y); if (c0 === -1 || s.get(x, y - 1) !== -1) continue; o.set(x, y, c0 === body ? rim2 : (kind === 4 && y < 12 ? 0xf0cc68 : rim)); }
  if (kind === 1) { o.hl(15, 29, 12, 0x3c5cae); o.set(15, 12, 0x6c9ce0); } if (kind === 2) o.rect(20, 34, 4, 2, 0xc83232); if (kind === 3) { o.hl(15, 29, 25, 0xe09a28); o.set(14, 25, 0x74c878); }
  return o;
}
function stage(g, t) {
  if (!STAGE) STAGE = { bg: bakeStage(), crowd: [0, 1, 2, 3, 4].map(k => crowd(k, false)), far: [0, 1, 2, 3, 4].map(k => crowd(k, true)), lan: [lantern('red'), lantern('blue')], hero: look('commander'), jumo: look('jumo') };
  const S = STAGE; g.save(); g.scale(2, 2);
  g.drawImage(S.bg.canvas(), 0, 0);
  // 초롱과 불빛 (띠로 번지는 빛)
  const fl = Math.sin(t * 7) > 0.6 ? 1 : 0;
  for (const [x, y, k] of [[158, 40, 0], [30, 46, 1]]) { fr(g, x, 24, 1, y - 24, 0x2a161c); g.fillStyle = 'rgba(255,200,120,0.10)'; for (const r of [26 + fl, 18, 11]) { g.beginPath(); g.arc(x, y + 9, r, 0, 7); g.fill(); } draw(g, S.lan[k], x, y); }
  // 막대 인형들
  const rod = (x, y) => { fr(g, x, y - 2, 2, 20, 0x54301e); fr(g, x, y - 2, 1, 20, 0xb8844a); };
  const hb = Math.sin(t * 2.4) > 0 ? -1 : 0, jb = Math.sin(t * 6) > 0 ? -1 : 0;
  rod(120, 124); rod(190, 124);
  fr(g, 110, 123, 22, 2, 'rgba(10,8,30,0.4)'); fr(g, 180, 123, 22, 2, 'rgba(10,8,30,0.4)');
  draw(g, S.hero, 120, 124 + hb); draw(g, S.jumo, 190, 124 + jb);
  // 무대 틀: 기둥 · 막(세로 주름) · 들보 · 휘장 · 앞판
  for (const x of [0, 310]) { fr(g, x, 0, 10, 140, 0x8a1c30); fr(g, x + 1, 0, 2, 140, 0xc83232); fr(g, x + 8, 0, 2, 140, 0x4a1230); }
  const fold = [0x26346e, 0x3c5cae, 0x6c9ce0, 0x3c5cae, 0x26346e, 0x161a40];
  for (const sd of [0, 1]) for (let y = 14; y < 128; y++) { const k = (y - 14) / 114, tie = Math.abs(k - 0.5), wd = Math.round(11 + tie * 22 + (k > 0.5 ? (k - 0.5) * 6 : 0)); for (let i = 0; i < wd; i++) { const x = sd ? 309 - i : 10 + i; fr(g, x, y, 1, 1, i === wd - 1 ? 0x161a40 : fold[Math.floor(i * 6 / wd * 2 + (tie < 0.06 ? 3 : 0)) % 6]); } }
  for (const x of [20, 298]) { fr(g, x - 2, 69, 6, 4, C('gold', 3)); fr(g, x - 2, 69, 6, 1, C('gold', 4)); fr(g, x, 73, 2, 9, C('red', 2)); fr(g, x - 1, 82, 4, 4, C('gold', 3)); fr(g, x - 1, 86, 1, 3, C('gold', 2)); fr(g, x + 2, 86, 1, 3, C('gold', 2)); }
  fr(g, 0, 0, 320, 14, C('teal', 1)); fr(g, 0, 0, 320, 1, INK); fr(g, 0, 13, 320, 1, INK);
  for (let x = 0; x < 320; x += 16) { fr(g, x + 2, 3, 12, 8, C('teal', 2)); fr(g, x + 4, 4, 8, 6, [C('red', 2), C('blue', 2), C('gold', 3)][(x >> 4) % 3]); fr(g, x + 6, 5, 4, 4, C('white', 3)); fr(g, x + 7, 6, 2, 2, C('red', 3)); fr(g, x, 2, 1, 10, C('gold', 3)); }
  for (let x = 10; x < 310; x += 20) { for (let i = 0; i < 20; i++) { const h = Math.round(7 - Math.abs(i - 9.5) * 0.45 + 4); fr(g, x + i, 14, 1, h, i < 2 || i > 17 ? 0x4a1230 : (i + 1) % 5 === 0 ? 0x8a1c30 : 0xc83232); fr(g, x + i, 14 + h, 1, 1, C('gold', 3)); } fr(g, x + 9, 26, 2, 5, [C('gold', 3), C('blue', 3), C('teal', 3), C('white', 3), C('red', 3)][(x / 20 | 0) % 5]); }
  fr(g, 0, 128, 320, 14, 0x54301e); fr(g, 0, 128, 320, 1, 0xb8844a); fr(g, 0, 141, 320, 1, INK);
  for (const x of [22, 298]) { for (let i = 0; i < 4; i++) fr(g, x - i, 131 + i, 1 + i * 2, 1, C('red', 2)); for (let i = 0; i < 4; i++) fr(g, x - 3 + i, 135 + i, 7 - i * 2, 1, C('red', 2)); fr(g, x, 134, 1, 2, C('gold', 4)); }
  // 대사: 무대 앞판에 건 두루마리
  panel(g, 40, 126, 240, 17, { fill: C('cream', 3), edge: C('wood', 1), corner: false }); fr(g, 37, 124, 4, 21, 0x54301e); fr(g, 279, 124, 4, 21, 0x54301e); fr(g, 37, 124, 4, 1, C('gold', 3)); fr(g, 279, 124, 4, 1, C('gold', 3));
  const full = '어서 오시오, 장군! 국밥 한 그릇 드시게.', n = Math.min(full.length, Math.floor((t % 9) * 14));
  txt(g, '주모', 46, 130, { f: 9, c: C('red', 2) }); fr(g, 68, 129, 1, 11, C('cream', 1)); txt(g, full.slice(0, n), 73, 130, { f: 9, c: INK });
  if (n >= full.length && Math.floor(t * 2) % 2) { fr(g, 270, 133, 5, 2, C('red', 2)); fr(g, 271, 135, 3, 1, C('red', 2)); fr(g, 272, 136, 1, 1, C('red', 2)); }
  // 고를 것: 나무패 셋
  [['국밥 · 병사 치료', 'teal'], ['옛이야기 듣기', 'blue'], ['조련 · 패 +1단', 'red']].forEach(([s2, r], i) => { const sel = i === Math.floor(t / 1.5) % 3, x = 214 - (sel ? 3 : 0), y = 68 + i * 19; fr(g, 222, y - 3, 1, 3, 0x2a161c); fr(g, 298, y - 3, 1, 3, 0x2a161c); panel(g, x, y, 93, 16, { fill: sel ? C('cream', 4) : C('cream', 2), edge: C(r, 2), corner: false }); fr(g, x + 2, y + 2, 3, 12, C(r, 2)); txt(g, s2, x + 8, y + 4, { f: 9, c: INK }); if (sel) { fr(g, x - 7, y + 6, 4, 3, C('gold', 4)); fr(g, x - 4, y + 5, 1, 5, C('gold', 4)); fr(g, x - 3, y + 7, 1, 1, C('gold', 4)); } });
  // 구경꾼: 뒷줄은 옅고 작게, 앞줄은 크게
  fr(g, 0, 142, 320, 38, 0x0c0e24);
  [[26, 1], [62, 3], [98, 0], [136, 4], [172, 2], [206, 1], [242, 0], [276, 3], [306, 2]].forEach(([x, k], i) => draw(g, S.far[k], x, 187 + (i % 2) * 2 + (Math.sin(t * 1.5 + i * 1.3) > 0.9 ? -1 : 0)));
  [[8, 3], [50, 0], [92, 2], [134, 1], [176, 4], [220, 3], [262, 0], [304, 2]].forEach(([x, k], i) => draw(g, S.crowd[k], x, 201 + (i % 3) + (Math.sin(t * 1.2 + i * 2.1) > 0.9 ? -1 : 0)));
  g.restore();
  // 현판
  panel(g, 262, 1, 116, 24, { fill: C('ink', 1), edge: C('gold', 2) }); txt(g, '주  막', 320, 6, { f: 'b', a: 'c', c: C('gold', 4), sh: INK });
}

// ───────── 3. 타이틀: 달밤의 열두 고개 ─────────
let TITLE = null;
function bakeTitle() {
  const s = new Spr(LW, LH), R = rng(21);
  s.vgrad(0, 0, LW, 250, [0x080a20, 0x0e1434, 0x162050, 0x243470, 0x3c5098, 0x6478b8, 0x98a4d0]);
  for (let i = 0; i < 150; i++) { const x = (R() * LW) | 0, y = (R() * 170) | 0; s.set(x, y, R() < 0.25 ? 0xfff6c8 : R() < 0.5 ? 0x8c98d0 : 0x4c5c98); if (R() < 0.06) { s.set(x - 1, y, 0x8c98d0); s.set(x + 1, y, 0x8c98d0); s.set(x, y - 1, 0x8c98d0); s.set(x, y + 1, 0x8c98d0); } }
  // 달
  for (let y = 30; y < 170; y++) for (let x = 390; x < 560; x++) { const d = Math.hypot(x - 474, y - 96); if (d < 44) { const cr = Math.hypot(x - 460, y - 84) < 9 || Math.hypot(x - 490, y - 110) < 6 || Math.hypot(x - 486, y - 78) < 4; s.set(x, y, cr ? 0xe8dca0 : d > 41 ? 0xfff0b0 : 0xfffadc); } else if (d < 52 && bayer(x, y) > (d - 44) / 8) s.set(x, y, 0x6478b8); else if (d < 66 && bayer(x, y) > 0.5 + (d - 52) / 28) s.set(x, y, 0x3c5098); }
  cloud(s, 430, 124, 150, [0x1a2658, 0x2c3c7c, 0x6478b8], 4); cloud(s, 140, 70, 120, [0x141c48, 0x243470, 0x4c64a8], 6);
  // 열두 고개: 멀수록 옅고 가까울수록 짙은 능선 열두 겹
  const cols = [0x8090c4, 0x7080b8, 0x6070ac, 0x5062a0, 0x445694, 0x3a4a88, 0x30407a, 0x28366c, 0x202c5e, 0x1a2450, 0x141c42, 0x0e1434];
  for (let k = 0; k < 12; k++) { const base = 176 + k * 13, lit = cols[Math.max(0, k - 2)]; mountains(s, base, 20 - k * 0.8, 0.012 + k * 0.004, k * 2.7 + 1, cols[k], lit, k < 11 ? cols[Math.min(11, k + 1)] : 0x0e1434, LH, { mist: 8, trees: k > 6 ? 0.2 : 0, treeCol: cols[Math.min(11, k + 1)] }); }
  return s;
}
function title(g, t) {
  if (!TITLE) TITLE = { bg: bakeTitle(), logo: logo('열두 고개', 92, "'Yeon Sung'", [0xfff6a8, 0xffd24a, 0xe09a28, 0xc8641c], { hi: 0xffffff, lo: 0x8a3c14, ol: 0x2a0e18, ol2: 0x0a0c20 }), js: jangseung(0), js2: jangseung(1), pine: pine(4), cart: bannerCart() };
  const T = TITLE; g.drawImage(T.bg.canvas(), 0, 0);
  // 고갯마루의 행렬 (그림자 인형들)
  const march = (k, x, y) => { const s = look(k), d = tinted(s, 0x0a0c20); draw(g, d, x, y + (Math.sin(t * 5 + x) > 0 ? -1 : 0)); };
  { const y = 300; g.fillStyle = css(0x0a0c20); g.beginPath(); g.moveTo(0, 360); for (let x = 0; x <= 640; x += 4) g.lineTo(x, Math.round(y + Math.sin(x * 0.011 + 1) * 10 + Math.sin(x * 0.04) * 2)); g.lineTo(640, 360); g.fill(); }
  const gy = x => Math.round(300 + Math.sin(x * 0.011 + 1) * 10 + Math.sin(x * 0.04) * 2);
  draw(g, tinted(T.cart, 0x0a0c20), 262, gy(262) + 2); for (const [k, x] of [['commander', 312], ['sword', 340], ['sword', 362], ['archer', 386], ['priest', 410], ['spear', 434], ['wizard', 460]]) march(k, x, gy(x) + 1);
  { const lx = 301, ly2 = gy(312) - 36, f2 = Math.sin(t * 8) > 0 ? 1 : 0; g.fillStyle = 'rgba(255,190,100,0.16)'; for (const r of [14 + f2, 8]) { g.beginPath(); g.arc(lx + 1, ly2 + 2, r, 0, 7); g.fill(); } fr(g, lx, ly2, 3, 5, C('gold', 3)); fr(g, lx + 1, ly2 + 1, 1, 2, C('gold', 4)); } draw(g, tinted(T.js, 0x0a0c20), 560, gy(560) + 2); draw(g, tinted(T.js2, 0x0a0c20), 590, gy(590) + 2);
  // 솟대
  fr(g, 620, gy(620) - 60, 2, 62, 0x0a0c20); fr(g, 614, gy(620) - 63, 10, 3, 0x0a0c20); fr(g, 624, gy(620) - 65, 3, 2, 0x0a0c20); fr(g, 611, gy(620) - 62, 3, 1, 0x0a0c20);
  // 도깨비불
  for (let k = 0; k < 7; k++) { const x = 330 + k * 44 + Math.sin(t * 0.7 + k * 2) * 10, y = 232 + (k % 3) * 22 + Math.sin(t * 1.3 + k) * 5, f = Math.sin(t * 9 + k * 3) > 0 ? 1 : 0; g.fillStyle = 'rgba(120,200,255,0.14)'; g.beginPath(); g.arc(x, y, 9 + f, 0, 7); g.fill(); fr(g, x - 2, y - 2, 4, 5, C('blue', 3)); fr(g, x - 1, y - 4 - f, 2, 3, C('blue', 3)); fr(g, x - 1, y - 1, 2, 3, C('blue', 4)); fr(g, x, y, 1, 1, 0xffffff); }
  // 제호
  const ly = 48 + Math.round(Math.sin(t * 1.2) * 1.5); g.drawImage(tinted(T.logo, 0x060818).canvas(), 46, ly + 3); g.drawImage(T.logo.canvas(), 44, ly);
  txt(g, '설화 인형극 전술', 66, ly + 128, { f: 'b', c: 0xe4ecff, sh: 0x0a0c20 }); fr(g, 50, ly + 133, 10, 2, C('gold', 3)); fr(g, 66 + textW('설화 인형극 전술', 'b') + 6, ly + 133, 10, 2, C('gold', 3));
  // 차림표
  ['새 원정', '이어 하기', '도감', '설정'].forEach((s2, i) => { const sel = i === 0, y = 212 + i * 21; if (sel) { panel(g, 56, y - 4, 112, 20, { fill: C('red', 1), edge: C('gold', 3) }); const b = Math.floor(t * 3) % 2; fr(g, 44 + b, y + 2, 2, 7, C('gold', 4)); fr(g, 46 + b, y + 3, 2, 5, C('gold', 4)); fr(g, 48 + b, y + 4, 2, 3, C('gold', 4)); } txt(g, s2, 112, y, { f: sel ? 'b' : 11, a: 'c', c: sel ? C('cream', 4) : 0xc8d4f4, sh: 0x0a0c20 }); });
  txt(g, '오늘의 원정 · 명궁 · 큰 장날 · 붉은 달', 632, 342, { f: 9, a: 'r', c: 0x8c98d0 }); txt(g, '도트 시안 v0.1', 8, 346, { f: 9, c: 0x4c5c98 });
}

// ───────── 4. 인형 도감 ─────────
const NAMES = { commander: '장군', sword: '환도 무사', archer: '궁수', shield: '등패수', spear: '창병', priest: '무녀', wizard: '도사', blade: '검객', goblin: '도깨비 졸개', ogre: '푸른 도깨비', ghost: '망령 병사', tiger: '고개 호랑이' };
function sheet(g, t) {
  fr(g, 0, 0, LW, LH, C('night', 1)); for (let y = 0; y < LH; y += 4) for (let x = (y % 8 ? 2 : 0); x < LW; x += 8) fr(g, x, y, 1, 1, C('night', 2));
  dancheong(g, 0, 22, LW, 4); txt(g, '인형 도감 · 도트 시안', 320, 5, { f: 'b', a: 'c', c: C('gold', 4), sh: INK });
  const keys = Object.keys(NAMES);
  keys.forEach((k, i) => {
    const big = k === 'tiger', col = i % 7, row = Math.floor(i / 7), x = 12 + col * 89 + (big ? 0 : 0), y = 34 + row * 158, w = big ? 172 : 83;
    if (big) { panel(g, 368, 192, 264, 152, { fill: C('ink', 2), edge: C('red', 1) }); fr(g, 370, 300, 260, 22, C('grass', 1)); fr(g, 370, 300, 260, 1, C('grass', 2)); g.save(); g.translate(506, 316); g.scale(2, 2); draw(g, look(k), 0, Math.sin(t * 3) > 0.3 ? -1 : 0); g.restore(); txt(g, NAMES[k] + ' · 두목', 500, 326, { f: 'b', a: 'c', c: C('gold', 4), sh: INK }); return; }
    panel(g, x, y, w, 152, { fill: C('ink', 2), edge: i > 7 ? C('red', 1) : C('gold', 1) }); fr(g, x + 2, y + 108, w - 4, 22, C('grass', 1)); fr(g, x + 2, y + 108, w - 4, 1, C('grass', 2));
    g.save(); g.translate(x + w / 2 + (i > 7 ? 4 : -4), y + 124); g.scale(2, 2); draw(g, look(k), 0, Math.sin(t * 3 + i) > 0.3 ? -1 : 0); g.restore();
    txt(g, NAMES[k], x + w / 2, y + 134, { f: 'b', a: 'c', c: C('cream', 4), sh: INK });
  });
}
export const SCENES = { stage: { name: '인형극 무대 · 주막', draw: stage }, title: { name: '타이틀', draw: title }, sheet: { name: '인형 도감', draw: sheet } };
