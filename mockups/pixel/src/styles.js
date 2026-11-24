// 도트를 찍는 방식 자체가 다른 버전들: 같은 싸움을 인물 비율·외곽선·음영·해상도·색 수를 바꿔 그린다
import { LW, LH, P, INK, Spr, txt, draw, bayer, rng, tinted, mixc } from './px.js';
import { look } from './sprites.js';
import { fr, ridge, UNITS } from './scenes.js';
import { TH, bake, rays, makeBattle, miniHud } from './variants.js';

const c = (n, i = 2) => P[n][i];
function part(s, fn, dl = 1, dd = 1) { const t = new Spr(s.w, s.h); fn(t); if (dl || dd) t.shade(dl, dd); s.blit(t, 0, 0); }

// ───────── 등신대 인형 (네 등신, 오른쪽을 본다). 판 44×68, 발밑 기준점 (20, 61) ─────────
const HEADT = [[18, 23], [17, 24], [16, 25], [16, 25], [16, 25], [16, 25], [16, 25], [16, 25], [17, 25], [17, 24], [18, 23]];   // y 16..26
const THATS = {
  jeonrip(s) { part(s, t => { t.rows(11, [[18, 23], [17, 24], [17, 24], [17, 24], [17, 24]], c('black', 1)); t.rows(16, [[11, 30], [10, 31]], c('black', 1)); });
    s.hl(17, 24, 15, c('gold', 2)); s.set(17, 15, c('gold', 3)); s.hl(12, 19, 16, c('black', 3)); s.rect(20, 9, 2, 2, c('red', 3)); for (const [x, y] of [[19, 10], [18, 11], [17, 12], [16, 13], [16, 14]]) s.set(x, y, c('red', 2)); },
  tugu(s) { part(s, t => t.rect(14, 19, 3, 9, c('red', 2))); for (const y of [21, 24]) s.set(15, y, c('gold', 3));
    part(s, t => t.rows(10, [[18, 23], [17, 24], [16, 25], [16, 25], [16, 25], [16, 25], [15, 26], [15, 26]], c('gold', 2)));
    s.hl(15, 26, 17, c('gold', 1)); s.vl(18, 11, 15, c('gold', 4)); s.rect(21, 13, 2, 2, c('red', 3));
    part(s, t => { t.rect(20, 7, 2, 3, c('gold', 2)); t.ell(20.5, 4, 4, 3, c('red', 2)); }); s.set(19, 2, c('red', 4)); },
  gat(s) { part(s, t => { t.rect(18, 7, 6, 9, c('black', 1)); t.rows(16, [[9, 32], [8, 33]], c('black', 1)); }); s.vl(19, 8, 14, c('black', 3)); s.hl(10, 20, 16, c('black', 3)); s.set(18, 25, c('red', 3)); s.set(19, 27, c('red', 3)); },
  gokkal(s) { part(s, t => t.rows(6, [[20, 21], [20, 21], [19, 22], [19, 22], [18, 23], [18, 23], [17, 24], [17, 24], [16, 25], [16, 25], [15, 26], [15, 26]], c('white', 3)));
    for (let x = 15; x <= 26; x++) s.set(x, 18, [c('red', 2), c('gold', 3), c('blue', 2), c('teal', 3)][((x - 15) / 3 | 0) & 3]); s.rect(15, 14, 2, 2, c('pink', 2)); },
  topknot(s, o) { part(s, t => { t.rect(19, 11, 3, 4, c('black', 1)); t.rows(15, [[18, 23], [17, 24], [16, 25]], c('black', 1)); }); s.hl(16, 25, 18, c(o.band || 'red', 2)); s.set(15, 19, c(o.band || 'red', 2)); s.set(15, 20, c(o.band || 'red', 1)); },
  paeraeng(s) { part(s, t => { t.rows(12, [[18, 23], [17, 24], [17, 24], [17, 24]], c('straw', 2)); t.rows(16, [[11, 30], [10, 31]], c('straw', 2)); }); s.hl(17, 24, 15, c('blue', 2)); for (let x = 12; x < 30; x += 3) s.set(x, 16, c('straw', 1)); },
  wild(s) { part(s, t => { t.rows(12, [[17, 24], [16, 25], [15, 26], [15, 26], [15, 26], [15, 17], [15, 16]], c('black', 1)); for (const [x, y] of [[16, 11], [19, 10], [19, 11], [22, 11], [25, 11], [14, 14], [27, 13]]) t.set(x, y, c('black', 1)); }); },
};
const TARMS = {
  sword(s) { s.line(28, 38, 33, 29, c('steel', 3)); s.line(33, 29, 35, 19, c('steel', 3)); s.line(29, 38, 34, 29, c('steel', 4)); s.line(34, 28, 36, 20, c('steel', 4)); s.rect(27, 38, 3, 1, c('gold', 3)); s.set(27, 41, c('wood', 1)); },
  woldo(s) { s.vl(30, 11, 61, c('wood', 2)); s.vl(31, 11, 61, c('wood', 1)); part(s, t => t.rows(1, [[31, 32], [30, 33], [30, 35], [30, 36], [30, 37], [30, 37], [30, 36], [30, 35], [30, 33], [30, 32]], c('steel', 3))); s.rect(29, 11, 4, 2, c('red', 2)); s.set(29, 13, c('red', 2)); s.set(32, 13, c('red', 3)); s.set(30, 14, c('red', 2)); },
  spear(s) { s.vl(30, 10, 61, c('wood', 2)); part(s, t => t.rows(3, [[30, 30], [30, 30], [29, 31], [29, 31], [29, 31], [30, 30], [30, 30]], c('steel', 3)), 1, 0); s.rect(29, 10, 3, 3, c('red', 2)); s.set(29, 13, c('red', 1)); },
  bow(s) { s.vl(33, 19, 43, c('white', 2)); for (let y = 18; y <= 44; y++) { const x = 33 + Math.round(5 * Math.sin((y - 18) / 26 * Math.PI)); s.set(x, y, c('red', 1)); s.set(x + 1, y, c('wood', 3)); } s.set(33, 18, c('gold', 3)); s.set(33, 44, c('gold', 3)); },
  shield(s) { part(s, t => t.ell(30, 43, 6, 7, c('straw', 2))); for (let a = 0; a < 6.3; a += 0.4) s.set(Math.round(30 + Math.cos(a) * 3.4), Math.round(43 + Math.sin(a) * 4.2), c('straw', 0)); s.rect(29, 42, 2, 2, c('red', 2)); },
  club(s) { part(s, t => t.line(28, 39, 35, 23, c('wood', 2), 3)); s.set(33, 27, c('gold', 3)); s.set(35, 24, c('gold', 3)); s.set(31, 32, c('wood', 0)); },
  fan(s) { part(s, t => t.poly([[28, 39], [32, 28], [38, 30], [38, 36]], c('white', 3)), 1, 0); s.line(28, 39, 33, 29, c('red', 2)); s.line(28, 39, 37, 32, c('blue', 2)); s.line(28, 39, 38, 35, c('gold', 3)); },
  talisman(s) { part(s, t => t.rect(31, 21, 5, 9, c('gold', 3)), 1, 0); for (const [x, y] of [[32, 23], [34, 24], [33, 26], [32, 28], [34, 27]]) s.set(x, y, c('red', 2)); },
};
function tall(o) {
  const s = new Spr(44, 68, 20, 61), st = o.style || 'soldier', sk = o.skin || 'skin', sb = o.skinBase === undefined ? 3 : o.skinBase, top = o.top || 'blue', B = o.bulk ? 2 : 0;
  const skc = c(sk, sb), skd = c(sk, sb - 1), skk = c(sk, Math.max(0, sb - 2)), armc = st === 'bare' ? skc : c(o.sleeve || top), out = o.pose === 'out';
  // 뒤: 망토·긴 머리·화살통·뒷팔
  if (o.cape) part(s, t => { for (let y = 29; y <= 54; y++) t.hl(11 - ((y - 29) / 7 | 0), 17, y, c(o.cape, 2)); }, 1, 2);
  if (o.longHair) part(s, t => t.rect(14, 18, 4, 21, c('black', 1)));
  if (o.arm === 'bow') { part(s, t => t.rect(11, 30, 3, 11, c('wood', 2))); s.set(11, 28, c('white', 3)); s.set(12, 27, c('white', 3)); s.set(13, 28, c('white', 3)); s.set(12, 29, c('red', 2)); }
  if (o.arm === 'shield') { s.line(12, 40, 8, 29, c('steel', 3)); s.line(13, 40, 9, 29, c('steel', 4)); }
  part(s, t => { if (st === 'robe') t.rect(10, 29, 5, 13, armc); else t.rect(12 - B, 29, 3 + B, 11, armc); });
  if (st !== 'robe') s.rect(12 - B, 40, 3 + B, 2, skd);
  // 다리와 신
  if (st === 'soldier' || st === 'armor') { part(s, t => { t.rect(15, 48, 4, 11, c(o.legs || 'white', 3)); t.rect(22, 48, 4, 11, c(o.legs || 'white', 3)); }); part(s, t => { t.rect(14, 59, 6, 3, c('black', 1)); t.rect(21, 59, 7, 3, c('black', 1)); }, 1, 0); }
  else if (st === 'bare') { part(s, t => { t.rect(15 - B, 46, 4 + B, 13, skc); t.rect(22, 46, 4 + B, 13, skc); }); s.rect(14 - B, 59, 6 + B, 3, skd); s.rect(21, 59, 7 + B, 3, skd); }
  else if (st === 'robe') part(s, t => { t.rect(14, 59, 6, 3, c('black', 1)); t.rect(22, 59, 6, 3, c('black', 1)); }, 1, 0);
  // 몸
  const TORSO = [[15, 25], [14, 26], [14, 26], [14, 26], [15, 26], [15, 25], [15, 25], [15, 25], [15, 25], [15, 25]], SKIRT = [[15, 25], [14, 26], [14, 26], [14, 27], [13, 27], [13, 27], [13, 28], [13, 28]];
  if (st === 'soldier' || st === 'armor') {
    part(s, t => { t.rows(28, TORSO, c(top)); t.rows(38, [[15, 25], [15, 25]], c(top)); t.rows(40, SKIRT, c(o.robe || top)); }, 1, 2);
    if (o.vest) { part(s, t => { t.rows(28, TORSO.map(([a, b]) => [a + 2, b - 2]), c(o.vest, 1)); t.rows(40, SKIRT.map(([a, b]) => [a + 1, b - 1]), c(o.vest, 1)); }, 1, 1); s.vl(20, 41, 47, c(o.robe || top, 1)); s.vl(21, 42, 47, c(o.robe || top, 2)); }
    if (st === 'armor') { for (let y = 29; y <= 46; y += 2) for (let x = 15 + (y & 2 ? 1 : 0); x <= 26; x += 2) if (s.get(x, y) !== -1) s.set(x, y, c('gold', 3)); part(s, t => { t.rect(12, 28, 4, 4, c('gold', 2)); t.rect(25, 28, 4, 4, c('gold', 2)); }); s.hl(13, 28, 47, c('gold', 2)); s.vl(20, 40, 47, c('red', 0)); }
    else { for (const [x, y] of [[19, 28], [20, 29], [21, 30], [22, 29], [23, 28]]) s.set(x, y, c('white', 4)); if (o.hem) s.hl(13, 28, 47, c(o.hem, 2)); }
    s.hl(15, 25, 38, c(o.sash || 'gold', 2)); s.hl(15, 25, 39, c(o.sash || 'gold', 1)); s.rect(22, 38, 2, 4, c(o.sash || 'gold', 3));
  } else if (st === 'robe') {
    part(s, t => { for (let i = 0; i <= 30; i++) t.hl(15 - (i / 8 | 0), 25 + (i / 8 | 0), 28 + i, c(top)); }, 1, 2);
    s.hl(12, 28, 58, c(o.hem || 'black', 1)); s.hl(12, 28, 57, c(o.hem || 'black', 2)); for (const [x, y] of [[19, 28], [20, 29], [21, 30], [22, 29], [23, 28]]) s.set(x, y, c('white', 4)); s.vl(21, 31, 56, c(top, 1)); s.hl(15, 25, 38, c(o.sash || 'black', 1)); s.hl(15, 25, 39, c(o.sash || 'black', 0));
  } else if (st === 'hanbok') {
    part(s, t => { for (let y = 34; y <= 60; y++) { const k = Math.min(7, (y - 34) / 3 | 0); t.hl(15 - k, 25 + k, y, c(o.robe || 'white', 3)); } }, 1, 2);
    for (const x of [14, 18, 23, 27]) s.vl(x, 44 + Math.abs(x - 20), 59, c(o.robe || 'white', 2)); s.hl(8, 32, 60, c(o.hem || 'blue', 2));
    part(s, t => t.rows(28, [[15, 25], [14, 26], [14, 26], [14, 26], [15, 25], [15, 25]], c(top, 3)), 1, 1);
    for (const [x, y] of [[19, 28], [20, 29], [21, 30], [22, 29], [23, 28]]) s.set(x, y, c('blue', 2)); s.vl(21, 31, 38, c('red', 2)); s.set(22, 32, c('red', 2)); s.set(22, 33, c('red', 3));
  } else if (st === 'bare') {
    part(s, t => t.rows(28, [[14 - B, 26 + B], [13 - B, 27 + B], [13 - B, 27 + B], [13 - B, 27 + B], [14 - B, 26 + B], [14 - B, 26 + B], [15 - B, 25 + B], [15 - B, 25 + B], [15, 25], [15, 25]], skc), 1, 2);
    s.hl(17, 19, 32, skd); s.hl(22, 24, 32, skd); s.set(20, 35, skk); s.vl(20, 29, 31, skd);
    part(s, t => t.rows(38, [[14 - B, 26 + B], [14 - B, 26 + B], [14 - B, 27 + B], [14 - B, 27 + B], [15 - B, 26 + B], [15, 26], [16, 25], [17, 23]], c('straw', 3)), 1, 1);
    for (const [x, y] of [[16, 40], [20, 39], [24, 41], [18, 43], [22, 43], [26, 39]]) { s.set(x, y, c('wood', 1)); s.set(x + 1, y, c('wood', 1)); }
  } else if (st === 'ghost') {
    part(s, t => { for (let y = 28; y <= 60; y++) { const k = y < 44 ? Math.min(2, (y - 28) / 6 | 0) : 2 - ((y - 44) / 3 | 0); const x0 = 15 - k + (y > 52 ? (y & 1) : 0), x1 = 25 + Math.min(2, k) - (y > 48 ? ((y - 48) / 3 | 0) : 0); if (x1 >= x0) t.hl(x0, x1, y, c(top, 2)); } t.rect(9, 54, 3, 2, c(top, 2)); t.rect(12, 58, 2, 2, c(top, 2)); }, 1, 2);
    for (const [x, y] of [[19, 28], [20, 29], [21, 30], [22, 29], [23, 28]]) s.set(x, y, c('white', 4));
  }
  // 머리와 얼굴
  part(s, t => t.rows(16, HEADT, skc)); s.set(18, 22, skd); s.hl(19, 22, 27, skd);
  if (st !== 'bare') s.rect(16, 18, 2, 6, c(o.hair || 'black', 1));
  const f = o.face || {};
  if (f.type === 'dok') { s.rect(20, 20, 2, 2, c('gold', 3)); s.set(21, 21, INK); s.rect(23, 20, 2, 2, c('gold', 3)); s.set(24, 21, INK); s.hl(19, 21, 19, INK); s.hl(23, 25, 19, INK); s.hl(20, 25, 24, INK); s.set(21, 24, c('white', 4)); s.set(24, 24, c('white', 4)); s.set(21, 23, c('white', 4)); s.set(24, 23, c('white', 4)); }
  else { s.vl(21, 21, 22, f.eye || INK); s.vl(24, 21, 22, f.eye || INK); if (f.brow) { s.hl(20, 21, 20, c('ink', 2)); s.hl(24, 25, 20, c('ink', 2)); } if (f.mouth !== false) s.set(23, 24, f.lip ? c('red', 2) : skk); if (f.blush) s.set(20, 23, c('pink', 3)); if (f.stache) s.hl(21, 25, 24, c('black', 1)); }
  if (o.beard) { const t = new Spr(s.w, s.h); t.rows(23, [[19, 25], [19, 25], [19, 25], [20, 24], [21, 23]], c(o.beard, 1)); t.set(22, 23, skc); t.set(23, 23, skc); s.blit(t, 0, 0); s.set(20, 26, c(o.beard, 3)); }
  if (o.hat && THATS[o.hat]) THATS[o.hat](s, o); else if (st !== 'bare') part(s, t => t.rows(16, [[18, 23], [17, 24], [16, 20]], c(o.hair || 'black', 1)), 1, 0);
  // 앞팔과 무기
  if (out) { part(s, t => t.rect(25, 30, 7, 3 + (st === 'robe' ? 3 : 0), armc)); if (o.arm && TARMS[o.arm]) TARMS[o.arm](s); s.rect(32, 30, 2, 3, skc); }
  else { if (o.arm && o.arm !== 'shield' && TARMS[o.arm]) TARMS[o.arm](s); part(s, t => { if (st === 'robe') t.rect(25, 29, 5, 12, armc); else t.rect(25, 29, 3 + B, 10, armc); });
    if (st === 'hanbok') { s.hl(25, 27, 35, c('red', 2)); s.hl(25, 27, 36, c('gold', 3)); s.hl(25, 27, 37, c('blue', 2)); }
    s.rect(26, 39 + (st === 'robe' ? 2 : 0), 3, 2, skc); if (o.arm === 'shield') TARMS.shield(s); }
  return s.outline();
}
const TALL = {
  commander: { style: 'armor', top: 'red', legs: 'black', hat: 'tugu', beard: 'black', face: { brow: true }, arm: 'woldo', cape: 'blue', sash: 'gold' },
  sword: { top: 'red', vest: 'black', robe: 'blue', legs: 'white', hat: 'jeonrip', sash: 'gold', hem: 'gold', face: { brow: true }, arm: 'sword' },
  archer: { top: 'white', vest: 'blue', robe: 'white', sleeve: 'white', hat: 'topknot', band: 'blue', sash: 'red', arm: 'bow', pose: 'out' },
  shield: { top: 'teal', hat: 'topknot', band: 'gold', sash: 'gold', face: { brow: true, stache: true }, arm: 'shield' },
  spear: { top: 'cream', vest: 'wood', robe: 'cream', hat: 'paeraeng', sash: 'red', arm: 'spear' },
  priest: { style: 'hanbok', top: 'white', robe: 'white', hat: 'gokkal', longHair: true, face: { blush: true, lip: true }, arm: 'fan' },
  wizard: { style: 'robe', top: 'steel', hat: 'gat', beard: 'black', face: { brow: true }, arm: 'talisman', pose: 'out' },
  goblin: { style: 'bare', skin: 'dok', skinBase: 2, hat: 'paeraeng', face: { type: 'dok' }, arm: 'club' },
  ogre: { style: 'bare', skin: 'dokb', skinBase: 2, hat: 'wild', bulk: 1, face: { type: 'dok' }, arm: 'club' },
  ghost: { style: 'ghost', skin: 'pale', skinBase: 3, top: 'pale', hat: 'jeonrip', hair: 'night', face: { eye: P.night[2], mouth: false }, arm: 'sword' },
};
const TC = new Map();
export const tallLook = k => { let s = TC.get(k); if (!s) { s = TALL[k] ? tall(TALL[k]) : look(k); if (['goblin', 'ogre', 'ghost'].includes(k)) s = s.flipped(); TC.set(k, s); } return s; };

// ───────── 외곽선을 다루는 세 가지 방식 (먹선이 둘린 판을 받아 바꾼 판을 돌려준다) ─────────
const CONV = new WeakMap();
const conv = (s, key, fn) => { let m = CONV.get(s); if (!m) CONV.set(s, m = new Map()); let o = m.get(key); if (!o) m.set(key, o = fn(s)); return o; };
const isEdge = (s, x, y) => s.get(x, y) === INK && (s.get(x - 1, y) === -1 || s.get(x + 1, y) === -1 || s.get(x, y - 1) === -1 || s.get(x, y + 1) === -1);
const N8 = [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
// 색선: 바깥 먹선을 안쪽 색의 어두운 빛으로 바꾼다 (빛 받는 쪽은 덜 어둡게)
export const selout = s0 => conv(s0, 'sel', s => { const o = new Spr(s.w, s.h, s.ox, s.oy); o.d.set(s.d);
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) { if (!isEdge(s, x, y)) continue; let col = -1; for (const [dx, dy] of N8) { const v = s.get(x + dx, y + dy); if (v !== -1 && v !== INK) { col = v; break; } } if (col === -1) continue; const lit = s.get(x, y - 1) === -1 || s.get(x - 1, y) === -1; o.set(x, y, mixc(col, 0x1b1425, lit ? 0.5 : 0.72)); }
  return o; });
// 선 없음: 바깥 먹선을 걷어 내고, 해 쪽 가장자리는 따뜻하게 그늘 쪽은 차게 물들인다
export const unline = s0 => conv(s0, 'un', s => { const o = new Spr(s.w, s.h, s.ox, s.oy); o.d.set(s.d);
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) if (isEdge(s, x, y)) o.set(x, y, -1);
  const r = new Spr(s.w, s.h, s.ox, s.oy); r.d.set(o.d);
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) { const v = o.get(x, y); if (v === -1) continue; if (o.get(x + 1, y) === -1 || o.get(x, y - 1) === -1) r.set(x, y, mixc(v, 0xffe8b4, 0.42)); else if (o.get(x - 1, y) === -1 || o.get(x, y + 1) === -1) r.set(x, y, mixc(v, 0x1c3850, 0.38)); else if (v === INK) r.set(x, y, 0x2c3048); }
  return r; });
// 종이인형: 흰 종이 테두리를 두르고 대나무 막대를 붙인다
export const papered = s0 => conv(s0, 'pap', s => { const b = s.outline(0xfff6e0).outline(0xfff6e0).outline(0xb09870), o = new Spr(b.w, b.h + 7, b.ox, b.oy); o.rect(b.ox - 1, b.oy - 4, 3, 11, 0xb09870); o.vl(b.ox, b.oy - 4, b.oy + 5, 0xe4bc78); o.blit(b, 0, 0); return o; });

// ───────── 선 없는 회화풍 배경: 디더 없이 물결치는 색면으로만 ─────────
function bakeSoft() {
  const s = new Spr(LW, LH), R = rng(21), SK = [0x34506c, 0x466a80, 0x648a94, 0x8caca4, 0xbccaac, 0xe8d8b0, 0xf8e6c0];
  for (let y = 0; y < 150; y++) for (let x = 0; x < LW; x++) { const v = (y + Math.sin(x * 0.021 + y * 0.06) * 3 + Math.sin(x * 0.006 + 1) * 5) / 19; s.set(x, y, SK[Math.max(0, Math.min(6, v | 0))]); }
  const sx = 470, sy = 66; for (let y = sy - 30; y < sy + 30; y++) for (let x = sx - 30; x < sx + 30; x++) { const d = Math.hypot(x - sx, y - sy); if (d < 13) s.set(x, y, 0xfffbe8); else if (d < 19) s.set(x, y, 0xfdf0cc); else if (d < 27) s.set(x, y, mixc(s.get(x, y), 0xfdf0cc, 0.4)); }
  for (const [cx, cy, w] of [[120, 52, 90], [330, 38, 60], [560, 60, 80], [420, 82, 50], [220, 86, 40]]) { const b0 = s.get(cx, cy); s.ell(cx, cy, w / 2, 3, mixc(b0, 0xfff0d8, 0.45)); s.ell(cx + 6, cy - 2, w / 3, 2, mixc(b0, 0xfff8e8, 0.75)); }
  const ML = [[100, 22, 0.017, 0.7, 0xa4bcb4, 0xc4d4bc], [112, 18, 0.027, 3.9, 0x7ea4a4, 0xa0c0ac], [124, 13, 0.039, 2.0, 0x54848c, 0x78a494], [134, 9, 0.055, 5.1, 0x386a72, 0x528878]];
  for (const [base, amp, f, ph, col, lit] of ML) for (let x = 0; x < LW; x++) { const y0 = Math.round(ridge(x, base, amp, f, ph)), slope = ridge(x + 3, base, amp, f, ph) - ridge(x - 3, base, amp, f, ph), hz = base + amp * 0.55 + Math.sin(x * 0.03 + ph) * 2; for (let y = y0; y < 152; y++) s.set(x, y, y > hz ? mixc(col, 0xdce6cc, 0.5) : y - y0 < (slope > 0.4 ? 6 : 1) ? lit : col); }
  const FB = [0xa4c48c, 0x7eae72, 0x5a9462, 0x3e7c58, 0x2c6450], fy = [144, 162, 198, 240, 270];
  for (let x = 0; x < LW; x++) for (let y = 144; y < LH; y++) { let k = 0; for (let i = 1; i < 5; i++) if (y > fy[i] + Math.sin(x * (0.02 + i * 0.007) + i * 2) * (3 + i)) k = i; s.set(x, y, FB[k]); }
  for (let x = 0; x < LW; x++) { const cy = 214 + Math.sin(x * 0.012 + 0.5) * 12, hw = 21 + Math.sin(x * 0.03) * 4 + Math.sin(x * 0.2) * 1.2; for (let y = Math.round(cy - hw); y < cy + hw; y++) { const d = (y - cy) / hw; s.set(x, y, d > 0.7 ? 0xb4aa88 : d < 0.1 && d > -0.6 ? 0xece0bc : 0xd8cca4); } }
  const isPath = v => v === 0xb4aa88 || v === 0xece0bc || v === 0xd8cca4;
  for (let i = 0; i < 260; i++) { const x = (R() * LW) | 0, y = 150 + ((R() * 132) | 0), v = s.get(x, y); if (isPath(v)) continue; const li = mixc(v, 0xe8f0b0, 0.4), dk = mixc(v, 0x1c3c48, 0.35); s.set(x, y, li); s.set(x + 1, y - 1, li); s.set(x - 1, y, dk); s.set(x, y + 1, dk); if (i % 9 === 0) { s.set(x + 2, y - 2, [0xffffff, 0xffd8e0, 0xffe890][i % 3]); } }
  for (const [x, y, w] of [[92, 170, 7], [402, 160, 6], [540, 268, 9], [26, 262, 10], [300, 276, 6]]) { s.ell(x, y, w, w * 0.55, 0x66787e); s.ell(x + 1, y - 1, w * 0.7, w * 0.3, 0x98aaa4); }
  return s;
}
// ───────── 종이인형 배경: 오려 붙인 색종이 겹 ─────────
function bakePaper() {
  const s = new Spr(LW, LH), R = rng(31), SH = 0x2a2036;
  s.rect(0, 0, LW, LH, 0xbcdcd8);
  const layer = (edge, col, y1 = LH) => { for (let x = 0; x < LW; x++) { const y0 = Math.round(edge(x)); for (let y = y0 - 3; y < y0; y++) s.set(x, y, mixc(s.get(x, y), SH, y === y0 - 1 ? 0.3 : 0.15)); s.set(x, y0, mixc(col, 0xffffff, 0.5)); for (let y = y0 + 1; y < y1; y++) s.set(x, y, col); } };
  const cut = (t, col) => { for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) if (t.get(x, y) !== -1 && s.get(x + 2, y + 3) !== -1) s.set(x + 2, y + 3, mixc(s.get(x + 2, y + 3), SH, 0.22)); for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) { const v = t.get(x, y); if (v !== -1) s.set(x, y, t.get(x, y - 1) === -1 || t.get(x - 1, y) === -1 ? mixc(v, 0xffffff, 0.5) : v); } };
  layer(x => 92 - Math.abs(Math.sin(x * 0.03)) * 9, 0xf6dcae, 150);
  { const t = new Spr(LW, LH); t.ell(470, 70, 17, 17, 0xffd66a); cut(t); }
  for (const [cx, cy, w] of [[110, 52, 60], [330, 40, 44], [570, 58, 52]]) { const t = new Spr(LW, LH); t.ell(cx, cy, w / 2, 5, 0xfff4dc); t.ell(cx - w / 5, cy - 5, w / 5, 6, 0xfff4dc); t.ell(cx + w / 7, cy - 7, w / 4, 7, 0xfff4dc); for (let x = cx - w; x < cx + w; x++) for (let y = cy + 3; y < cy + 12; y++) t.set(x, y, -1); cut(t); }
  layer(x => ridge(x, 100, 22, 0.019, 1.1), 0xa4c6ba, 152); layer(x => ridge(x, 114, 16, 0.031, 4.1), 0x6aa496, 152);
  { const t = new Spr(LW, LH), Wc = 0xf0e4c8, Rf = 0x3c4468; t.rect(252, 121, 108, 12, Wc); for (let x = 252; x < 360; x += 6) t.rect(x, 118, 3, 3, Wc); t.rect(292, 108, 24, 14, 0xe4d4b4); t.rect(300, 114, 8, 10, 0x4a3848); for (const [ry, hw] of [[107, 18], [99, 13]]) { t.hl(304 - hw, 304 + hw, ry, Rf); t.hl(304 - hw + 2, 304 + hw - 2, ry - 1, Rf); t.hl(304 - hw + 4, 304 + hw - 4, ry - 2, Rf); } t.rect(296, 100, 16, 6, 0xb8423c); cut(t); }
  layer(x => ridge(x, 128, 10, 0.045, 2.2), 0x3e7c70, 152);
  const FL = [[144, 0xb8d47c], [178, 0x98c468], [228, 0x78b05c], [264, 0x5e9a52]];
  FL.forEach(([y, col], i) => layer(x => y + Math.sin(x * (0.028 + i * 0.006) + i * 1.7) * (3 + i) - Math.abs(Math.sin(x * 0.11 + i)) * 2, col));
  { const t = new Spr(LW, LH); for (let x = 0; x < LW; x++) { const cy = 214 + Math.sin(x * 0.012 + 0.5) * 12, hw = 19 + Math.sin(x * 0.03) * 3; t.vl(x, Math.round(cy - hw), Math.round(cy + hw), 0xe8d29c); } cut(t); }
  for (let i = 0; i < 90; i++) { const x = (R() * LW) | 0, y = 152 + ((R() * 128) | 0), v = s.get(x, y); if (v === 0xe8d29c) continue; const d = mixc(v, 0x245838, 0.5); s.set(x, y - 2, d); s.hl(x - 1, x + 1, y - 1, d); s.hl(x - 2, x + 2, y, d); s.set(x - 1, y - 2, mixc(d, 0xffffff, 0.35)); }
  for (let i = 0; i < 1700; i++) { const x = (R() * LW) | 0, y = (R() * 284) | 0, k = R() < 0.5 ? 0xffffff : 0x5a4030, n = 1 + ((R() * 3) | 0); for (let j = 0; j < n; j++) { const v = s.get(x + j, y); if (v !== -1) s.set(x + j, y, mixc(v, k, 0.09)); } }
  return s;
}

// ───────── 1비트: 먹과 종이 두 색. 밝기를 다섯 단의 점 무늬로 ─────────
const PA = 0xffc4dee9, IN = 0xff25141b, L8 = v => ((v & 255) * 0.299 + ((v >> 8) & 255) * 0.587 + ((v >> 16) & 255) * 0.114) / 255;
function inkBg(g) { const im = g.getImageData(0, 0, LW, LH), u = new Uint32Array(im.data.buffer);
  for (let y = 0, i = 0; y < LH; y++) for (let x = 0; x < LW; x++, i++) u[i] = Math.min(1, Math.max(0, (L8(u[i]) - 0.2) / 0.52)) > bayer(x, y) ? PA : IN;
  g.putImageData(im, 0, 0); }
function inkFlat(g) { const im = g.getImageData(0, 0, LW, LH), u = new Uint32Array(im.data.buffer);
  for (let y = 0, i = 0; y < LH; y++) for (let x = 0; x < LW; x++, i++) { const v = u[i]; if (v === PA || v === IN) continue; const L = L8(v); u[i] = L < 0.4 ? IN : L < 0.6 ? ((x + y) & 1 ? PA : IN) : PA; }
  g.putImageData(im, 0, 0); }

// ───────── 큰 풍경 · 작은 병사 (320×180, 얼굴 없는 열한 픽셀 병사, 풍경이 주인공) ─────────
function tinyMan(o) {
  const s = new Spr(11, 15, 4, 14), K = 0x241c38, sk = o.skin || 0xf0c498, blk = 0x1a1826, gold = 0xe09a28, red = 0xc83232, straw = 0xd0a040, wood = 0x84522c, steel = 0xd4dce8;
  if (o.st === 'gown') { s.rect(3, 8, 3, 2, o.c); s.rows(10, [[2, 6], [2, 6], [1, 7], [1, 7]], o.c); }
  else if (o.st === 'ghost') { s.rect(3, 8, 3, 3, o.c); s.rows(11, [[3, 6], [3, 5], [4, 5]], o.c); }
  else { s.rect(3, 8, 3, 4, o.c); if (o.c2) s.hl(3, 5, 10, o.c2); s.vl(3, 12, 13, o.leg || K); s.vl(5, 12, 13, o.leg || K); }
  s.set(2, 9, o.c); s.set(6, 9, o.c); if (o.cape) s.vl(2, 8, 11, o.cape);
  s.rect(3, 5, 3, 3, sk);
  ({ jeonrip() { s.hl(2, 6, 4, blk); s.set(4, 3, blk); s.set(3, 3, red); }, tugu() { s.hl(3, 5, 4, gold); s.set(4, 3, gold); s.vl(4, 1, 2, red); }, gat() { s.hl(1, 7, 4, blk); s.rect(3, 2, 3, 2, blk); },
    gokkal() { s.set(4, 2, 0xffffff); s.hl(3, 5, 3, 0xffffff); s.hl(3, 5, 4, 0xffffff); }, topknot() { s.hl(3, 5, 4, blk); s.set(4, 3, blk); }, paeraeng() { s.hl(2, 6, 4, straw); s.set(4, 3, straw); }, wild() { s.hl(3, 5, 4, blk); s.set(3, 3, blk); s.set(5, 3, blk); s.set(2, 5, blk); } }[o.hat] || (() => 0))();
  ({ spear() { s.vl(7, 2, 13, wood); s.vl(7, 0, 1, steel); }, sword() { s.line(6, 9, 9, 5, steel); }, bow() { for (const [x, y] of [[7, 6], [8, 7], [8, 8], [8, 9], [7, 10]]) s.set(x, y, 0x8a1c30); }, woldo() { s.vl(8, 3, 13, wood); s.rect(8, 0, 2, 3, steel); },
    shield() { s.rect(6, 8, 2, 4, straw); s.set(6, 9, red); }, club() { s.line(6, 10, 9, 5, wood); s.set(9, 4, wood); s.set(8, 4, wood); }, fan() { s.set(7, 8, red); s.set(8, 7, gold); s.set(8, 8, 0x3c5cae); }, talisman() { s.vl(7, 7, 9, 0xffd24a); } }[o.arm] || (() => 0))();
  return s;
}
function tinyTiger() { const s = new Spr(28, 14, 14, 13), O = 0xe88420, D = 0x3a1c20, Wt = 0xfffbe4;
  s.line(4, 6, 1, 3, O); s.vl(1, 0, 3, O); s.set(1, 0, D); s.rect(4, 5, 15, 6, O); s.hl(6, 16, 10, Wt); for (const x of [6, 9, 12, 15]) s.vl(x, 5, 7, D);
  for (const x of [5, 8, 14, 17]) s.vl(x, 11, 12, x % 3 ? O : 0xa84818); s.rect(17, 2, 7, 7, O); s.set(17, 1, O); s.set(23, 1, O); s.rect(21, 6, 3, 2, Wt); s.set(22, 4, 0xffd24a); s.set(19, 4, 0xffd24a); s.hl(19, 21, 2, D); return s; }
const rim = s => { const o = new Spr(s.w, s.h, s.ox, s.oy); o.d.set(s.d); for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) { const v = s.get(x, y); if (v !== -1 && s.get(x + 1, y) === -1) o.set(x, y, mixc(v, 0xffe8a8, 0.55)); else if (v !== -1 && s.get(x - 1, y) === -1) o.set(x, y, mixc(v, 0x241c48, 0.3)); } return o; };
const TINY = {
  commander: { c: 0xc83232, c2: 0xffd24a, hat: 'tugu', arm: 'woldo', cape: 0x3c5cae }, sword: { c: 0xc83232, c2: 0xe09a28, leg: 0x3c4a94, hat: 'jeonrip', arm: 'sword' }, archer: { c: 0xe8ecf0, c2: 0x3c5cae, leg: 0x9aa2c0, hat: 'topknot', arm: 'bow' },
  shield: { c: 0x2e8c64, c2: 0xe09a28, hat: 'topknot', arm: 'shield' }, spear: { c: 0xe4cc98, c2: 0xc83232, leg: 0x7a5848, hat: 'paeraeng', arm: 'spear' }, priest: { st: 'gown', c: 0xf4f6f4, hat: 'gokkal', arm: 'fan' },
  wizard: { st: 'gown', c: 0x8c98b0, hat: 'gat', arm: 'talisman' }, blade: { c: 0x22305e, c2: 0xc83232, hat: 'paeraeng', arm: 'sword' },
  goblin: { c: 0xdc5c28, c2: 0xd0a040, leg: 0x983020, skin: 0xdc5c28, hat: 'paeraeng', arm: 'club' }, ogre: { c: 0x6a80c0, c2: 0xd0a040, leg: 0x3c4880, skin: 0x6a80c0, hat: 'wild', arm: 'club' }, ghost: { st: 'ghost', c: 0xd4e4ec, skin: 0xe4f2f4, hat: 'jeonrip', arm: 'sword' },
};
const TYC = new Map();
const tlook = k => { let s = TYC.get(k); if (!s) { s = k === 'tiger' ? tinyTiger() : tinyMan(TINY[k] || TINY.sword); if (['goblin', 'ogre', 'ghost', 'tiger'].includes(k)) s = s.flipped(); TYC.set(k, s = rim(s)); } return s; };
function bakeTiny() {
  const s = new Spr(320, 180), R = rng(5), SK = [0x2a3470, 0x3c4a94, 0x6c6cb4, 0xb884ac, 0xf0a488, 0xffd08c, 0xffeeb4], ys = [0, 30, 44, 56, 66, 76, 84, 92];
  for (let i = 0; i < 7; i++) { s.rect(0, ys[i], 320, ys[i + 1] - ys[i], SK[i]); if (i < 6) { s.hl(0, 319, ys[i + 1] - 2, SK[i + 1]); s.hl(0, 319, ys[i + 1] + 1, SK[i]); } }
  for (let i = 0; i < 26; i++) s.set((R() * 320) | 0, 15 + ((R() * 22) | 0), R() < 0.4 ? 0xffeeb4 : 0x6c6cb4);
  for (const [x, y, w, col] of [[30, 40, 54, 0x8c78b8], [120, 34, 36, 0x6c6cb4], [250, 46, 60, 0xd89cb0], [70, 60, 40, 0xf8c0a0], [280, 70, 36, 0xffe4c0]]) { s.hl(x, x + w, y, col); s.hl(x + 6, x + w - 8, y - 1, col); s.hl(x + 10, x + w + 6, y + 1, col); }
  { const sx = 236, sy = 66, r = 15; for (let y = sy - r; y <= sy + r; y++) { if ([70, 74, 77, 79].includes(y)) continue; const hw = Math.sqrt(r * r - (y - sy) ** 2); s.hl(Math.round(sx - hw), Math.round(sx + hw), y, y < 66 ? 0xfffbe4 : 0xfff0b8); } }
  for (const [base, amp, f, ph, col] of [[140, 26, 0.02, 1.3, 0x9c88c0], [158, 18, 0.034, 4.0, 0x6c64a8], [174, 12, 0.05, 2.2, 0x3c4478]]) for (let x = 0; x < 320; x++) for (let y = Math.round(ridge(x * 2, base, amp, f, ph) / 2); y < 94; y++) s.set(x, y, col);
  { const D = 0x2c3464; s.rect(126, 85, 64, 7, D); for (let x = 126; x < 190; x += 4) s.rect(x, 83, 2, 2, D); s.rect(150, 78, 16, 9, D); s.hl(144, 171, 77, D); s.hl(146, 169, 76, D); s.hl(149, 166, 75, D); s.hl(152, 163, 74, D); s.set(143, 76, D); s.set(172, 76, D); s.set(155, 82, 0xffd08c); s.set(160, 82, 0xffd08c); s.rect(157, 87, 2, 4, 0xffd08c); }
  const GB = [0xc4cc6c, 0x9cbc58, 0x78a84c, 0x5a9044], gy = [92, 97, 110, 126, 180];
  for (let i = 0; i < 4; i++) { s.rect(0, gy[i], 320, gy[i + 1] - gy[i], GB[i]); if (i < 3) { s.hl(0, 319, gy[i + 1] - 2, GB[i + 1]); s.hl(0, 319, gy[i + 1] + 1, GB[i]); } }
  for (let x = 200; x < 272; x++) { s.set(x, 92, 0xf4e8a0); if (x % 2) s.set(x, 93, 0xf4e8a0); }
  for (let x = 0; x < 320; x++) { const cy = 114 + Math.sin(x * 0.03 + 0.4) * 3; for (let y = Math.round(cy - 4); y <= cy + 4; y++) s.set(x, y, y > cy + 2 ? 0xb49860 : 0xdcc084); }
  for (let i = 0; i < 70; i++) { const x = (R() * 320) | 0, y = 96 + ((R() * 44) | 0), v = s.get(x, y); if (v === 0xdcc084 || v === 0xb49860) continue; s.set(x, y, 0x3c7440); s.set(x + 1, y - 1, 0x3c7440); if (i % 6 === 0) s.set(x, y - 1, 0xfff0b8); }
  const D = 0x161a38, pad = (cx, cy, rx, ry) => { s.ell(cx, cy, rx, ry * 0.7, D); for (let k = 0; k < 5; k++) s.ell(cx - rx * 0.7 + k * rx * 0.35, cy - ry * 0.5 - (k % 2) * 2, rx * 0.3, ry * 0.7, D); for (let k = 0; k < rx * 2; k += 2) s.vl(Math.round(cx - rx + k), Math.round(cy + ry * 0.4), Math.round(cy + ry * 0.4 + 1 + (k % 3)), D); };
  s.line(16, 142, 22, 100, D, 4); s.line(22, 100, 34, 62, D, 3); s.line(28, 84, 46, 74, D, 2); s.line(24, 96, 6, 82, D, 2); pad(36, 58, 22, 6); pad(50, 72, 14, 4); pad(6, 80, 13, 4); pad(22, 44, 14, 5);
  for (const x of [292, 304]) { s.rect(x, 104 + (x & 4), 6, 40, D); s.rect(x - 1, 100 + (x & 4), 8, 5, D); s.set(x + 1, 107 + (x & 4), 0xffd08c); s.set(x + 4, 107 + (x & 4), 0xffd08c); }
  for (let x = 0; x < 320; x++) { const e = Math.max(0, 1 - Math.min(x, 319 - x) / 90), h = Math.round((1 + R() * 5) * (0.3 + e)); if (R() < 0.8) s.vl(x, 142 - h, 142, D); }
  return s;
}
function tinyBattle() {
  let BG = null;
  return (g, t) => {
    if (!BG) BG = bakeTiny();
    g.save(); g.scale(2, 2); g.drawImage(BG.canvas(), 0, 0);
    for (let k = 0; k < 3; k++) { const x = (40 + k * 90 + t * (4 + k)) % 340 - 10, y = 34 + k * 9 + Math.sin(t + k) * 2, w = Math.sin(t * 6 + k) > 0; fr(g, x, y, 1, 1, 0x241c48); fr(g, x - 1, y - (w ? 1 : 0), 1, 1, 0x241c48); fr(g, x + 1, y - (w ? 1 : 0), 1, 1, 0x241c48); }
    const list = [];
    for (const [k, x, y, ph] of UNITS) { const n = k === 'commander' || k === 'tiger' ? 1 : 3; for (let i = 0; i < n; i++) { const [dx, dy] = [[0, 0], [-6, 2], [5, 4]][i]; list.push({ k, x: Math.round(x / 2 + dx), y: Math.round(99 + (y - 170) * 0.36 + dy), ph: ph + i * 0.7 }); } }
    list.sort((a, b) => a.y - b.y);
    for (const [x, y, col] of [[70, 104, 0xc83232], [100, 124, 0x3c5cae], [136, 100, 0xc83232]]) { fr(g, x, y - 18, 1, 18, 0x241c38); const w = Math.sin(t * 4 + x) > 0 ? 1 : 0; fr(g, x + 1, y - 18, 6, 4, col); fr(g, x + 5, y - 17 + w, 3, 4, col); fr(g, x + 1, y - 18, 6, 1, 0xffd24a); }
    for (const u of list) { const w = u.k === 'tiger' ? 26 : 9; fr(g, u.x - w, u.y - 1, w, 1, 'rgba(36,28,80,0.34)'); fr(g, u.x - 2, u.y - 1, 4, 1, 'rgba(36,28,80,0.3)'); }
    for (const u of list) { const sp = tlook(u.k), foe = ['goblin', 'ogre', 'ghost', 'tiger'].includes(u.k), hit = foe && Math.floor(t * 2 + u.ph) % 7 === 0 && (t * 2 + u.ph) % 1 < 0.15; draw(g, hit ? tinted(sp, 0xffffff) : sp, u.x, u.y + (Math.sin(t * 3.2 + u.ph * 2) > 0.3 ? -1 : 0)); }
    for (let k = 0; k < 12; k++) { const p = ((t * 0.8 + k * 0.083) % 1), x = 78 + (k % 4) * 5 + (112 + (k % 3) * 8) * p, y = 100 + (k % 5) * 3 - Math.sin(p * Math.PI) * (24 + (k % 3) * 4); fr(g, x, y, 2, 1, 0xfffbe4); fr(g, x - 1, y + (p < 0.5 ? 1 : -1), 1, 1, 0x84522c); }
    for (let k = 0; k < 8; k++) { const p = (t * 1.2 + k * 0.125) % 1; g.fillStyle = `rgba(244,224,176,${0.7 * (1 - p)})`; g.fillRect(Math.round(176 + (k % 4) * 9 + p * 3), Math.round(108 + (k % 3) * 9 - p * 5), 2, 1); }
    miniHud(g, null);
    g.restore();
  };
}

// 선 없는 회화풍 위에 얹는 것: 햇살, 흐르는 안개 띠, 떠다니는 빛 먼지
function softOver() { let RY = null; return (g, t) => { if (!RY) RY = rays({ sun: { x: 470, y: 66 } }); g.save(); g.globalAlpha = 0.3; g.drawImage(RY.canvas(), 0, 0); g.restore();
  for (let k = 0; k < 5; k++) { const y = 148 + k * 5, x0 = ((t * (3 + k) + k * 170) % (LW + 300)) - 300; g.fillStyle = `rgba(232,238,216,${0.2 - k * 0.025})`; g.fillRect(Math.round(x0), y, 300, 3); g.fillRect(Math.round(x0 + 30), y + 3, 220, 2); g.fillRect(Math.round(x0 + 340), y + 1, 200, 3); }
  for (let k = 0; k < 22; k++) { const x = (k * 71 + t * (4 + k % 4)) % 640, y = 60 + (k * 47) % 210 + Math.sin(t * 0.7 + k) * 6; if (Math.sin(t * 1.5 + k * 2.1) > -0.2) fr(g, x, y, 1, 1, 0xfff4d0); } }; }

export const STYLES = {
  chibi: { name: 'A 치비 · 먹선', draw: makeBattle({ theme: 'day' }) },
  tall: { name: 'B 등신대 · 색선', draw: makeBattle({ theme: 'dusk', spr: tallLook, fx: selout, gaugeDy: -18, cardDy: 12, portDy: 15 }) },
  soft: { name: 'C 선 없는 회화풍', draw: makeBattle({ theme: 'dusk', spr: tallLook, fx: unline, bg: bakeSoft, over: softOver(), gaugeDy: -18, cardDy: 12, portDy: 15 }) },
  tiny: { name: 'D 큰 풍경 · 작은 병사', draw: tinyBattle() },
  paper: { name: 'E 종이인형 도트', draw: makeBattle({ theme: 'day', fx: papered, bg: bakePaper, drop: true, gaugeDy: -6 }) },
  onebit: { name: 'F 1비트 목판', draw: makeBattle({ theme: 'day', mid: inkBg, after: inkFlat }) },
};
