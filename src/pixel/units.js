// 도트 병사·요괴: 게임의 인형 차림(LOOKS)을 그대로 읽어 도트 인형을 만든다.
// - 사람·도깨비(doll · dok 차림)는 도트 틀(2등신 인형)에 옷·모자·얼굴·무기를 갈아 끼워 손으로 찍는다
// - 짐승·두목·수레·소품(body 그림)과 몸집이 아주 큰 두목 인형은 종이 그림을 작게 구워 색을 줄이고 먹선을 둘러 도트로 만든다
// 모든 판은 오른쪽을 보고, 먹선 한 겹 바깥에 흰 테 한 겹을 두른다. 발밑이 기준점(ox, oy)이다.
//
// pxUnit(lookKey, wpn) → { stand, step, atk, h, k }
//   wpn: 무기 id (data/weapons.js) — 들고 있는 무기를 바꾼다. 'none' 이면 맨손. 비우면 그 차림의 기본 무기.
//   stand 선 모습 · step 걷는 모습(다리를 벌리고 몸이 한 칸 내려간다) · atk 치는 모습
//   h 발밑에서 머리(모자) 꼭대기까지의 높이(논리 픽셀) · k 화면에 그릴 배율(화면 픽셀 / 논리 픽셀) = 2
// pxFlip(spr) → 좌우를 뒤집은 판 (기준점도 거울로: ox' = w - 1 - ox), 한 번 만들어 둔다
import { Spr, P, INK, mixc, lum } from './px.js';
import { LOOKS, getLook } from '../render/sprites.js';
import { ARMS as WARMS, WEAPONS as WDATA } from '../data/weapons.js';
import { doll as paperDoll, dokkaebi as paperDok } from '../render/figures.js';
import { BOSSES } from './bosses.js';

const WHITE_EDGE = 0xffffff;
export const PX_K = 2;
// 종이 그림 한 단위가 논리 픽셀 몇 칸인가 (종이 병사 ≈ 화면 66px → 도트 병사 ≈ 47 논리 픽셀이 되도록)
const PK = 0.75;

// ───────── 색띠: 아무 색이나 어두운 쪽은 푸른·보랏빛으로, 밝은 쪽은 노란빛으로 틀어 다섯 단을 만든다 ─────────
const hx = v => (typeof v === 'number' ? v : parseInt(String(v).slice(1, 7), 16));
function toHsl(c) { const r = ((c >> 16) & 255) / 255, g = ((c >> 8) & 255) / 255, b = (c & 255) / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0; if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; } return [h, s, l]; }
function fromHsl(h, s, l) { h = ((h % 1) + 1) % 1; s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l)); const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q, f = t => { t = ((t % 1) + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; }; return (Math.round(f(h + 1 / 3) * 255) << 16) | (Math.round(f(h) * 255) << 8) | Math.round(f(h - 1 / 3) * 255); }
const toward = (h, t, k) => { let d = t - h; if (d > 0.5) d -= 1; if (d < -0.5) d += 1; return h + d * k; };
const RAMPS = new Map(), RMAP = new Map();
function reg(r) { r.forEach((c, i) => { if (!RMAP.has(c)) RMAP.set(c, [r, i]); }); }
for (const k in P) reg(P[k]);
function ramp(col) {
  if (typeof col === 'string' && P[col]) return P[col];
  const v = hx(col); let r = RAMPS.get(v); if (r) return r;
  const [h, s, l] = toHsl(v), gray = s < 0.08;
  const dark = i => fromHsl(gray ? h : toward(h, 0.70, 0.07 * i), Math.min(1, s + (gray ? 0.04 : 0.08) * i), l - (l > 0.75 ? 0.15 : 0.12) * i);
  const light = i => fromHsl(gray ? h : toward(h, 0.14, 0.05 * i), s * (1 - 0.06 * i), l + (1 - l) * (l > 0.8 ? 0.45 : 0.3) * i);
  r = [dark(2), dark(1), v, light(1), light(2)]; RAMPS.set(v, r); reg(r); return r;
}
const c = (col, i = 2) => ramp(col)[i];
export { ramp, c, OSpr, like, shade, merge, part, plain, cropAll, edged, handTiger };

// ───────── 판: 시안의 좌표(인형 판 52×54, 발밑 22,49)를 그대로 쓰되 둘레에 여유를 둔 판 ─────────
class OSpr extends Spr {
  constructor(w, h, dx, dy) { super(w, h, 0, 0); this.dx = dx; this.dy = dy; }
  set(x, y, col) { return super.set(x + this.dx, y + this.dy, col); }
  get(x, y) { return super.get(x + this.dx, y + this.dy); }
}
const like = s => new OSpr(s.w, s.h, s.dx, s.dy);
// 빛은 왼쪽 위에서: 빛 받는 가장자리는 한 단 밝게, 그늘 가장자리는 한 단 어둡게 (판의 칸을 바로 다룬다)
function shade(s, dl = 1, dd = 1) {
  const w = s.w, h = s.h, d = s.d, o = new Int32Array(d), at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? -1 : d[y * w + x]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const col = d[y * w + x]; if (col === -1) continue; const r = RMAP.get(col); if (!r) continue;
    let lit = false, dk = false;
    for (let k = 1; k <= dl; k++) if (at(x, y - k) === -1 || at(x - k, y) === -1) lit = true;
    for (let k = 1; k <= dd; k++) if (at(x, y + k) === -1 || at(x + k, y) === -1) dk = true;
    if (dk) o[y * w + x] = r[0][Math.max(0, r[1] - 1)]; else if (lit) o[y * w + x] = r[0][Math.min(r[0].length - 1, r[1] + 1)];
  }
  s.d = o;
}
function merge(s, t) { for (let i = 0; i < t.d.length; i++) if (t.d[i] !== -1) s.d[i] = t.d[i]; }
function part(s, fn, dl = 1, dd = 1) { const t = like(s); fn(t); if (dl || dd) shade(t, dl, dd); merge(s, t); }
const plain = (s, ox, oy) => { const o = new Spr(s.w, s.h, ox, oy); o.d.set(s.d); return o; };
// 그림이 있는 곳만 남기고 자른다 (여러 판을 같은 상자로)
function cropAll(list, ox, oy, pad = 0) {
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1; const w = list[0].w;
  for (const s of list) for (let i = 0; i < s.d.length; i++) if (s.d[i] !== -1) { const x = i % w, y = (i / w) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return list.map(s => plain(s, ox, oy));
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(list[0].h - 1, Math.max(y1, oy) + pad);
  return list.map(s => { const o = new Spr(x1 - x0 + 1, y1 - y0 + 1, ox - x0, oy - y0); for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) o.d[(y - y0) * o.w + (x - x0)] = s.d[y * w + x]; return o; });
}
const edged = s => s.outline(INK).outline(WHITE_EDGE);

// 자주 쓰는 색
const BLACK = '#26242e', GOLD = '#d9a441', STEEL = '#aeb8c4', WOOD = '#8a5a30', RED = '#c8402f', CREAM = '#f1ead6', PAPERW = '#fbf7ec', ROPE = '#c9a86a', STRAW = '#d4a64a';
const HEAD = [[19, 24], [17, 26], [16, 27], [15, 28], [15, 28], [15, 28], [15, 28], [15, 28], [15, 28], [16, 27], [17, 26], [19, 24]];   // y 18..29

// ───────── 모자 ─────────
const HATS = {
  jeonrip(s, q) {   // 전립: 검은 벙거지, 금띠, 붉은 구슬·상모, (승급) 공작 깃
    part(s, t => { t.rows(11, [[19, 24], [18, 25], [17, 26], [17, 26], [17, 26], [17, 26]], c(BLACK)); t.rows(17, [[12, 31], [10, 33]], c(BLACK)); });
    s.hl(17, 26, 16, c(q.bandCol || GOLD)); s.set(17, 16, c(q.bandCol || GOLD, 3)); s.set(19, 12, c(BLACK, 4)); s.set(19, 13, c(BLACK, 3)); s.hl(12, 20, 17, c(BLACK, 3));
    s.rect(21, 9, 2, 2, c(RED, 3)); s.set(21, 9, c(RED, 4));
    if (q.plume === 'peacock') { for (const [x, y] of [[23, 9], [24, 8], [25, 7], [26, 5], [27, 4]]) s.set(x, y, c('#3f7a5c', 2)); part(s, t => t.ell(28, 2.5, 2, 2, c('#2f6a8a')), 1, 0); s.set(28, 2, c(GOLD, 3)); s.set(28, 3, c('#22385c')); }
    else for (const [x, y] of [[20, 10], [19, 11], [18, 12], [17, 13], [17, 14], [16, 15]]) s.set(x, y, c(q.plume || RED, 2));
  },
  gat(s) { part(s, t => { t.rows(8, [[19, 24], [18, 25], [18, 25], [18, 25], [18, 25], [18, 25], [18, 25], [18, 25], [18, 25]], c(BLACK)); t.rows(17, [[9, 34], [8, 35]], c(BLACK)); }); s.vl(19, 9, 15, c(BLACK, 4)); s.hl(10, 20, 17, c(BLACK, 3)); s.hl(18, 25, 16, c(BLACK, 0)); for (const [x, y] of [[15, 26], [16, 28], [17, 30], [28, 26], [27, 28], [26, 30]]) s.set(x, y, c(RED, 3)); },
  heukrip(s) { HATS.gat(s); },
  tugu(s, q) {   // 투구: 쇠(금)빛 투구, 드림, 붉은 상모
    const m = q.metal || GOLD, fl = q.flap || RED;
    part(s, t => { t.rect(14, 18, 3, 9, c(fl)); t.rect(27, 18, 3, 9, c(fl)); });
    for (const y of [20, 23, 26]) { s.set(15, y, c(m, 3)); s.set(28, y, c(m, 3)); }
    part(s, t => t.rows(10, [[19, 24], [17, 26], [16, 27], [16, 27], [16, 27], [16, 27], [16, 27], [15, 28]], c(m)), 1, 1);
    s.hl(15, 28, 18, c(m, 1)); s.hl(16, 27, 17, c(m, 3)); s.vl(18, 11, 15, c(m, 4)); s.vl(19, 11, 13, c(m, 3)); s.rect(21, 13, 2, 3, c(q.plume && q.plume !== 'peacock' ? q.plume : RED, 3));
    part(s, t => { t.rect(21, 7, 2, 3, c(m)); t.ell(21.5, 4, 4.5, 3.2, c(q.plume && q.plume !== 'peacock' ? q.plume : RED)); t.set(16, 6, c(q.plume && q.plume !== 'peacock' ? q.plume : RED)); t.set(27, 6, c(q.plume && q.plume !== 'peacock' ? q.plume : RED)); });
  },
  gokkal(s) {   // 고깔: 흰 고깔, 색동 띠, 종이꽃
    part(s, t => t.rows(8, [[21, 22], [20, 23], [20, 24], [19, 24], [18, 25], [17, 26], [16, 27], [15, 28], [15, 28], [15, 28], [14, 29], [14, 29]], c(PAPERW)));
    for (let x = 14; x <= 29; x++) s.set(x, 20, [c(RED), c(GOLD, 3), c('#2f4d7e'), c('#3f6b5c', 3)][((x - 14) >> 2) & 3]);
    s.rect(14, 16, 3, 3, c('#e87090')); s.set(15, 17, c(GOLD, 3)); s.rect(27, 15, 2, 2, c(GOLD, 3));
  },
  gokkal2(s) {   // 신내림 고깔: 더 높은 고깔과 큰 종이꽃
    part(s, t => t.rows(3, [[21, 22], [21, 22], [20, 23], [20, 23], [20, 24], [19, 24], [19, 25], [18, 25], [17, 26], [16, 27], [15, 28], [15, 28], [15, 28], [14, 29], [14, 29], [14, 29], [14, 29]], c(PAPERW)));
    for (let x = 14; x <= 29; x++) s.set(x, 20, [c(RED), c(GOLD, 3), c('#2f4d7e'), c('#3f6b5c', 3)][((x - 14) >> 2) & 3]);
    part(s, t => { t.ell(15, 13, 3, 3, c('#e87090')); t.ell(27, 11, 2.6, 2.6, c(RED)); t.ell(22, 8, 2, 2, c(GOLD, 3)); }, 1, 1); s.set(15, 13, c(GOLD, 4)); s.set(27, 11, c(GOLD, 4));
  },
  band(s, q) {   // 맨상투와 머리띠
    part(s, t => { t.rect(20, 13, 4, 4, c(q.hair || BLACK)); t.rows(17, [[18, 25], [16, 27], [15, 28]], c(q.hair || BLACK)); });
    const b = q.bandCol || RED; s.hl(20, 23, 16, c(b)); s.hl(15, 28, 20, c(b)); s.set(15, 20, c(b, 3)); s.set(14, 21, c(b)); s.set(13, 22, c(b, 1)); s.set(21, 13, c(q.hair || BLACK, 3));
  },
  paeraeng(s, q) {   // 패랭이
    part(s, t => { t.rows(12, [[19, 24], [18, 25], [17, 26], [17, 26], [17, 26]], c(STRAW)); t.rows(17, [[12, 31], [10, 33]], c(STRAW)); });
    s.hl(17, 26, 16, c(q.dok ? '#7a4f3a' : '#2f4d7e')); for (let x = 12; x <= 31; x += 3) s.set(x, 17, c(STRAW, 1)); s.set(19, 13, c(STRAW, 4));
  },
  beong(s) { part(s, t => { t.rows(12, [[18, 25], [17, 26], [16, 27], [16, 27], [16, 27]], c('#5a4a3a')); t.rows(17, [[13, 30], [12, 31]], c('#5a4a3a')); }); s.hl(16, 27, 16, c('#3a2a22')); s.set(18, 13, c('#5a4a3a', 4)); },
  satgat(s) { part(s, t => t.rows(8, [[21, 22], [20, 23], [18, 25], [17, 26], [15, 28], [13, 30], [12, 31], [10, 33], [9, 34], [8, 35]], c(STRAW)), 1, 1); for (let k = 0; k < 5; k++) s.line(21 + (k - 2), 9, 9 + k * 6, 17, c(STRAW, 1)); s.line(20, 9, 12, 15, c(STRAW, 4)); },
  jjok(s, q) {   // 쪽진 머리와 비녀
    const hc = q.hair || BLACK;
    part(s, t => { t.rows(17, [[18, 25], [16, 27], [15, 28], [15, 28]], c(hc)); t.ell(13.5, 24, 2.5, 2.5, c(hc)); });
    s.hl(9, 13, 23, c(GOLD, 3)); s.set(9, 23, c('#3f8a6a', 3)); s.vl(21, 17, 20, c(hc, 3)); s.hl(15, 28, 20, c(hc));
  },
  halmi(s, q) {   // 할미: 흰 쪽머리에 남빛 머릿수건
    HATS.jjok(s, Object.assign({}, q, { hair: q.hair || '#e2ddd2' }));
    part(s, t => t.rows(15, [[18, 25], [16, 27], [15, 28], [15, 28]], c('#55516a')), 1, 1); s.hl(16, 27, 18, c('#55516a', 1));
  },
  jokduri(s) {   // 족두리: 작은 검은 관에 칠보 구슬
    s.hl(15, 28, 20, c(BLACK)); part(s, t => { t.rows(17, [[18, 25], [16, 27], [15, 28]], c(BLACK)); t.rows(12, [[19, 24], [18, 25], [18, 25], [19, 24], [19, 24]], c('#1f1e3a')); }, 1, 1);
    for (const [x, y, k] of [[19, 13, RED], [22, 12, GOLD], [24, 14, '#3f8a9a'], [21, 15, PAPERW]]) s.set(x, y, c(k, 3)); s.set(21, 10, c(GOLD, 3)); s.set(21, 11, c(GOLD, 2));
  },
  yugeon(s) {   // 유건: 검은 베로 접은 선비 두건
    part(s, t => t.rows(11, [[18, 25], [17, 26], [16, 27], [16, 27], [15, 28], [15, 28], [15, 28], [15, 28], [15, 28]], c(BLACK)));
    s.vl(21, 11, 19, c(BLACK, 0)); s.hl(15, 28, 19, c(BLACK, 3)); s.set(18, 12, c(BLACK, 4)); s.vl(29, 19, 24, c(BLACK)); s.vl(30, 21, 25, c(BLACK, 1));
  },
  sage(s) {   // 도사의 높은 관(학창의 차림의 윤건)
    part(s, t => t.rows(6, [[19, 24], [18, 25], [18, 25], [18, 25], [17, 26], [17, 26], [17, 26], [16, 27], [16, 27], [16, 27], [15, 28], [15, 28], [15, 28]], c('#2b3450')));
    s.vl(21, 7, 18, c('#2b3450', 0)); s.hl(15, 28, 18, c('#2b3450', 3)); s.set(19, 8, c('#2b3450', 4)); s.rect(20, 14, 3, 2, c(GOLD, 3));
  },
  sangmo(s, q) {   // 상모: 벙거지 꼭대기에 돌아가는 긴 흰 끈 (상쇠)
    HATS.jeonrip(s, Object.assign({}, q, { plume: null }));
    for (let i = 0; i < 18; i++) { const x = 22 + i, y = Math.round(8 - Math.sin(i / 17 * Math.PI) * 6); s.set(x, y, c(PAPERW, 3)); s.set(x, y + 1, c(PAPERW, 1)); }
    s.rect(21, 7, 2, 3, c(GOLD, 3));
  },
  ikseon(s) {   // 익선관(염라): 검붉은 관에 금띠와 옥 장식 (날개는 달지 않는다)
    part(s, t => { t.rows(10, [[19, 24], [17, 26], [16, 27], [16, 27], [16, 27], [16, 27], [16, 27], [15, 28]], c('#2a1f2a')); t.ell(24, 10, 3, 3, c('#2a1f2a')); });
    s.hl(15, 28, 17, c(GOLD, 3)); s.hl(16, 27, 14, c(GOLD)); s.rect(21, 11, 2, 2, c('#5fae8a', 3));
  },
  fur(s) {   // 털벙거지 (사냥꾼)
    part(s, t => { t.rows(11, [[18, 25], [17, 26], [16, 27], [15, 28], [15, 28], [14, 29], [14, 29], [14, 29]], c('#7a5236')); }, 1, 1);
    for (let x = 14; x <= 29; x += 2) s.set(x, 18, c('#c9a87a', 3)); for (const [x, y] of [[17, 13], [20, 12], [24, 12], [27, 14]]) s.set(x, y, c('#c9a87a'));
  },
  wild(s, q) {   // 더벅머리 (도깨비·장사): 정수리를 덮고 이마로 흘러내린 거친 생머리
    const hc = q.hair || BLACK;
    part(s, t => { t.rows(14, [[19, 24], [17, 26], [16, 27], [15, 28], [14, 29], [14, 29], [14, 29], [14, 18], [14, 16]], c(hc)); for (const [x, y] of [[17, 13], [21, 12], [25, 13], [29, 18], [13, 19]]) t.set(x, y, c(hc)); });
    s.set(18, 16, c(hc, 3)); s.set(22, 15, c(hc, 3)); s.set(25, 16, c(hc, 3)); s.hl(19, 27, 21, c(hc)); s.set(20, 22, c(hc)); s.set(24, 22, c(hc));
  },
  bald(s, q) { s.set(18, 19, c(q.skin, 4)); s.set(19, 19, c(q.skin, 4)); },
};

// ───────── 무기: 손(hx, hy)에서 각도 a(0 = 앞, -π/2 = 위)로 뻗는다 ─────────
const dirv = a => [Math.cos(a), Math.sin(a)];
const P2 = (x, y) => [Math.round(x), Math.round(y)];
function shaft(s, hx, hy, a, back, fwd, col = WOOD) {
  const [dx, dy] = dirv(a), [x0, y0] = P2(hx - dx * back, hy - dy * back), [x1, y1] = P2(hx + dx * fwd, hy + dy * fwd);
  s.line(x0, y0, x1, y1, c(col, 1), 2); s.line(x0, y0, x1, y1, c(col, 3)); return [x1, y1];
}
function blade(s, hx, hy, a, len, o = {}) {
  const [dx, dy] = dirv(a), px = -dy, py = dx, col = o.col || STEEL;
  const [gx0, gy0] = P2(hx - dx * 3, hy - dy * 3); s.line(gx0, gy0, Math.round(hx), Math.round(hy), c(o.grip || '#3a2a26'), 2);
  for (let k = -2; k <= 2; k++) s.set(Math.round(hx + dx * 1.5 + px * k), Math.round(hy + dy * 1.5 + py * k), c(o.guard || GOLD, k < 0 ? 3 : 2));
  const [bx, by] = P2(hx + dx * 2, hy + dy * 2), [tx, ty] = P2(hx + dx * len, hy + dy * len);
  s.line(bx, by, tx, ty, c(col, 1), o.w || 2); s.line(Math.round(bx - px * 0.6), Math.round(by - py * 0.6), Math.round(tx - px * 0.6), Math.round(ty - py * 0.6), c(col, 4));
  s.set(Math.round(hx + dx * (len + 1)), Math.round(hy + dy * (len + 1)), c(col, 4));
  if (o.tassel) { s.set(Math.round(hx - dx * 4), Math.round(hy - dy * 4) + 1, c(o.tassel)); s.set(Math.round(hx - dx * 4), Math.round(hy - dy * 4) + 2, c(o.tassel, 1)); }
  return [tx, ty];
}
function spearHead(s, tx, ty, a, o = {}) {
  const [dx, dy] = dirv(a), px = -dy, py = dx, col = o.col || STEEL;
  part(s, t => t.poly([[tx + px * 2, ty + py * 2], [tx + dx * 7, ty + dy * 7], [tx - px * 2, ty - py * 2], [tx - dx * 1, ty - dy * 1]], c(col)), 1, 1);
  if (o.tassel !== false) for (let k = 0; k < 3; k++) { s.set(Math.round(tx - dx * 2 + px * (k - 1)), Math.round(ty - dy * 2 + py * (k - 1)) + 1, c(o.tassel || RED, k === 1 ? 3 : 2)); s.set(Math.round(tx - dx * 2 + px * (k - 1)), Math.round(ty - dy * 2 + py * (k - 1)) + 2, c(o.tassel || RED, 1)); }
}
function moon(s, tx, ty, a) {   // 언월도·협도: 자루 끝의 초승달 날 (등은 뒤로, 날은 앞으로 휜다)
  const [dx, dy] = dirv(a), px = -dy, py = dx, pts = [];
  for (let k = 0; k <= 10; k++) { const u = k / 10; pts.push([tx + dx * u * 12 + px * (Math.sin(u * Math.PI) * 4 + u * 1.5), ty + dy * u * 12 + py * (Math.sin(u * Math.PI) * 4 + u * 1.5)]); }
  for (let k = 10; k >= 0; k--) { const u = k / 10; pts.push([tx + dx * u * 12 - px * 1.5, ty + dy * u * 12 - py * 1.5]); }
  part(s, t => t.poly(pts, c(STEEL)), 1, 1); s.set(Math.round(tx + dx * 12), Math.round(ty + dy * 12), c(STEEL, 4));
  for (let k = -1; k <= 1; k++) s.set(Math.round(tx - dx + px * k * 2), Math.round(ty - dy + py * k * 2), c(GOLD, 3));
  s.set(Math.round(tx - dx * 2) , Math.round(ty - dy * 2) + 1, c(RED)); s.set(Math.round(tx - dx * 2), Math.round(ty - dy * 2) + 2, c(RED, 1));
}
function clubHead(s, tx, ty, a, col, o = {}) {
  const [dx, dy] = dirv(a); part(s, t => t.ell(tx + dx * 2, ty + dy * 2, o.r || 3, o.r || 3, c(col)), 1, 1);
  if (o.studs) for (const [ox, oy] of [[-2, -1], [1, -2], [2, 1], [-1, 2]]) s.set(Math.round(tx + dx * 2 + ox), Math.round(ty + dy * 2 + oy), c(o.studs, 4));
}
function talis(s, x, y, col, mark) { part(s, t => t.rect(x - 2, y - 4, 5, 8, c(col, 3)), 1, 1); for (const [ox, oy] of [[-1, -3], [0, -2], [-1, -1], [1, 0], [0, 1], [-1, 2]]) s.set(x + ox, y + oy, c(mark)); }
function sparkle(s, x, y, col) { for (const [ox, oy] of [[0, -3], [0, 3], [-3, 0], [3, 0], [-2, -2], [2, 2], [2, -2], [-2, 2]]) s.set(x + ox, y + oy, c(col, Math.abs(ox) + Math.abs(oy) > 3 ? 3 : 4)); }
const KIND = {
  hwando: 'sword', short: 'sword', rusty: 'sword', ungeom: 'sword', bujeokgeom: 'sword', ssangsudo: 'sword', sinkal: 'sword', twin: 'sword',
  axe: 'axe', bigaxe: 'axe', flail: 'flail', thresher: 'flail',
  spear: 'spear', jukjang: 'spear', galgori: 'spear', bamboo: 'spear', dangpa: 'spear', lance: 'spear',
  woldo: 'woldo', hyeopdo: 'woldo',
  mace: 'club', gombong: 'club', hongdukkae: 'club', club: 'club', ironclub: 'club', goldclub: 'club', stick: 'staff', staff: 'staff',
  bow: 'bow', firebow: 'bow', pyeonjeon: 'bow', greatbow: 'bow', sosingijeon: 'bow', crossbow: 'gun', gun: 'gun', seungja: 'gun',
  firetal: 'tal', icetal: 'tal', baramtal: 'tal', dokkaebital: 'tal', bolttal: 'tal',
  featherfan: 'fan', fans: 'fan', bells: 'bells', chae: 'gong', jing: 'gong', sogo: 'drum', yeomju: 'beads', bowl: 'bowl', sack: 'sack', arm: 'club',
};
const MODE_OF = { sword: 'slash', axe: 'slash', flail: 'slash', club: 'slash', spear: 'thrust', woldo: 'slash', bow: 'shoot', gun: 'shoot', tal: 'cast', fan: 'cast', staff: 'cast', bells: 'cast', gong: 'cast', drum: 'cast', beads: 'cast', bowl: 'cast', sack: 'none' };
// 무기마다 쉬는 손·치는 손의 자리와 그림. pose: 'rest' | 'atk'. 돌려주는 hand: 손을 그릴 자리와 팔의 모양
function weaponPose(w, pose, mode) {
  const atk = pose === 'atk';
  if (!w) return { hand: [30, 38], arm: 'down' };
  const k = KIND[w] || 'sword', m = mode || MODE_OF[k] || 'slash';
  if (atk && m === 'cast') return { hand: [30, 24], arm: 'up' };
  if (atk && m === 'thrust') return { hand: [33, 34], arm: 'fwd' };
  if (atk && m === 'shoot') return { hand: [34, 33], arm: 'fwd' };
  if (atk && m === 'slash') return { hand: [34, 32], arm: 'fwd' };
  if (k === 'spear' || k === 'woldo' || k === 'staff') return { hand: [31, 37], arm: 'down' };
  return { hand: [30, 38], arm: 'down' };
}
function drawWeapon(s, w, pose, hx, hy, q) {
  const atk = pose === 'atk', k = KIND[w] || 'sword';
  if (k === 'sword') {
    const len = w === 'ssangsudo' ? 21 : w === 'short' || w === 'sinkal' ? 11 : 16, col = w === 'rusty' ? '#9a7a5a' : w === 'bujeokgeom' ? '#c9d2dc' : STEEL;
    const a = atk ? 0.32 : -1.05; const [tx, ty] = blade(s, hx, hy, a, len, { col, tassel: w === 'hwando' || w === 'ungeom' ? RED : null, guard: w === 'rusty' ? '#6a4a2c' : GOLD });
    if (w === 'bujeokgeom') { s.rect(tx - 1, ty + 1, 2, 3, c('#ffd24a', 3)); s.set(tx - 1, ty + 2, c(RED)); }
    if (w === 'sinkal') for (let i = 0; i < 4; i++) s.vl(Math.round(hx) - 2 + i, Math.round(hy) + 1, Math.round(hy) + 3 + (i % 2), c([RED, '#ffd24a', '#2f4d7e', PAPERW][i], 3));
  } else if (k === 'axe') {
    const a = atk ? 0.15 : -1.15, [dx, dy] = dirv(a), [tx, ty] = shaft(s, hx, hy, a, 2, w === 'bigaxe' ? 14 : 10), px = -dy, py = dx;
    part(s, t => t.poly([[tx - dx * 4, ty - dy * 4], [tx, ty], [tx - px * 4 + dx * 1, ty - py * 4 + dy], [tx - px * 5 - dx * 4, ty - py * 5 - dy * 4]], c(STEEL)), 1, 1);
  } else if (k === 'flail') {
    const a = atk ? -0.25 : -1.25, [tx, ty] = shaft(s, hx, hy, a, 2, 8);
    const ex = atk ? tx + 7 : tx + 3, ey = atk ? ty + 3 : ty + 6; s.set(tx + 1, ty + 1, c(STEEL, 1)); s.set(Math.round((tx + ex) / 2), Math.round((ty + ey) / 2), c(STEEL, 1));
    s.line(Math.round((tx + ex) / 2), Math.round((ty + ey) / 2), ex, ey, c(w === 'thresher' ? '#5a5a66' : WOOD, 1), 2); if (w === 'thresher') s.set(ex, ey, c(STEEL, 4));
  } else if (k === 'spear') {
    const a = atk ? 0 : -Math.PI / 2, back = atk ? 9 : 11, fwd = atk ? 22 : 27, col = w === 'bamboo' || w === 'jukjang' ? '#6a8a4a' : WOOD;
    const [tx, ty] = shaft(s, hx, hy, a, back, fwd, col);
    if (w === 'dangpa') { const [dx, dy] = dirv(a), px = -dy, py = dx; spearHead(s, tx, ty, a, { tassel: false }); for (const sg of [-1, 1]) { s.line(Math.round(tx + px * sg * 3), Math.round(ty + py * sg * 3), Math.round(tx + px * sg * 3 + dx * 5), Math.round(ty + py * sg * 3 + dy * 5), c(STEEL, 3)); s.line(Math.round(tx), Math.round(ty), Math.round(tx + px * sg * 3), Math.round(ty + py * sg * 3), c(STEEL, 2)); } }
    else if (w === 'galgori') { spearHead(s, tx, ty, a); const [dx, dy] = dirv(a), px = -dy, py = dx; s.line(Math.round(tx + px * 3), Math.round(ty + py * 3), Math.round(tx + px * 3 - dx * 3), Math.round(ty + py * 3 - dy * 3), c(STEEL, 3)); }
    else { spearHead(s, tx, ty, a, { tassel: w === 'bamboo' ? false : RED }); if (w === 'bamboo') { const [dx, dy] = dirv(a), px = -dy, py = dx; for (let u = 6; u < 22; u += 4) for (const sg of [-1, 1]) s.set(Math.round(hx + dx * u + px * sg * 2), Math.round(hy + dy * u + py * sg * 2), c('#4f7a3a', 3)); } }
    if (w === 'lance') { const [dx, dy] = dirv(a), px = -dy, py = dx; part(s, t => t.poly([[tx - dx * 2, ty - dy * 2], [tx - dx * 2 + px * 6 + dx * 1, ty - dy * 2 + py * 6 + dy], [tx - dx * 6, ty - dy * 6]], c(RED)), 1, 1); }
  } else if (k === 'woldo') {
    const a = atk ? 0.05 : -Math.PI / 2, [tx, ty] = shaft(s, hx, hy, a, atk ? 9 : 11, atk ? 18 : 24); moon(s, tx, ty, a);
  } else if (k === 'club') {
    const col = w === 'ironclub' || w === 'mace' || w === 'arm' ? '#4e4f5c' : w === 'goldclub' ? GOLD : w === 'hongdukkae' ? '#c49a62' : WOOD;
    const a = atk ? 0.25 : -1.1, len = w === 'gombong' ? 14 : 9, [tx, ty] = shaft(s, hx, hy, a, 2, len, w === 'mace' ? '#7a5236' : col);
    if (w !== 'gombong') clubHead(s, tx, ty, a, col, { r: w === 'hongdukkae' ? 2.6 : 3.4, studs: w === 'ironclub' || w === 'goldclub' ? (w === 'goldclub' ? '#fff0a0' : STEEL) : w === 'club' ? '#e4bc78' : null });
  } else if (k === 'staff') {
    const a = atk ? -1.35 : -Math.PI / 2, [tx, ty] = shaft(s, hx, hy, a, 10, w === 'stick' ? 20 : 26, w === 'stick' ? '#6a4a2c' : '#8a6a3a');
    if (w === 'staff') { part(s, t => { t.ell(tx, ty - 2, 3, 3, c(GOLD)); }, 1, 1); s.set(tx, ty - 2, -1); s.set(tx - 3, ty, c(GOLD, 3)); s.set(tx + 3, ty, c(GOLD, 3)); s.set(tx - 3, ty + 1, c(GOLD, 2)); s.set(tx + 3, ty + 1, c(GOLD, 2)); }
    else { s.set(tx, ty - 1, c('#6a4a2c', 3)); s.set(tx + 1, ty - 2, c('#4f8a4a', 3)); }
    if (atk) sparkle(s, tx, ty - 4, '#fff0a0');
  } else if (k === 'bow') {
    const bx = atk ? hx + 3 : hx + 2, by = atk ? hy + 1 : hy - 3, top = by - 10, bot = by + 10, col = w === 'greatbow' ? '#5a3a26' : '#8a1c30';
    for (let y = top; y <= bot; y++) { const u = (y - top) / (bot - top), x = Math.round(bx + Math.sin(u * Math.PI) * (atk ? 4 : 5)); s.set(x, y, c(col, 1)); s.set(x + 1, y, c(col, 2)); s.set(x - 1, y, c(GOLD, 2)); }
    if (atk) { s.line(bx, top, hx - 5, by, c(PAPERW, 3)); s.line(bx, bot, hx - 5, by, c(PAPERW, 3)); s.line(hx - 6, by, bx + 9, by, c(WOOD, 3)); s.set(bx + 10, by, c(STEEL, 4)); s.set(bx + 9, by - 1, c(STEEL, 3)); s.set(hx - 6, by - 1, c(w === 'firebow' ? '#ffd24a' : RED, 3)); s.set(hx - 7, by, c(RED, 2)); if (w === 'firebow' || w === 'sosingijeon') { s.set(bx + 11, by, c('#ffd24a', 4)); s.set(bx + 11, by - 1, c('#ff9a2e', 3)); } }
    else { s.vl(bx - 1, top, bot, c(PAPERW, 3)); s.set(bx, top - 1, c(GOLD, 3)); s.set(bx, bot + 1, c(GOLD, 3)); }
  } else if (k === 'gun') {
    const a = atk ? 0 : -0.55, [dx, dy] = dirv(a), [x0, y0] = P2(hx - dx * 5, hy - dy * 5), [x1, y1] = P2(hx + dx * (w === 'crossbow' ? 9 : 15), hy + dy * (w === 'crossbow' ? 9 : 15));
    s.line(x0, y0, Math.round(hx + dx * 3), Math.round(hy + dy * 3), c(WOOD, 2), 2); s.line(Math.round(hx + dx * 2), Math.round(hy + dy * 2), x1, y1, c(w === 'crossbow' ? WOOD : '#4e4f5c', 2), w === 'crossbow' ? 2 : 1);
    if (w === 'crossbow') { const px = -dy, py = dx; s.line(Math.round(x1 - px * 5), Math.round(y1 - py * 5), Math.round(x1 + px * 5), Math.round(y1 + py * 5), c('#5a3a26', 2)); }
    if (atk && w !== 'crossbow') { s.set(x1 + 1, y1, c('#ffd24a', 4)); s.set(x1 + 2, y1 - 1, c('#ff9a2e', 3)); s.set(x1 + 2, y1 + 1, c('#ff9a2e', 3)); s.set(x1 + 3, y1, c('#ffd24a', 3)); }
  } else if (k === 'tal') {
    const TC = { firetal: ['#ffd24a', RED], icetal: ['#dceef8', '#3f7fb8'], baramtal: ['#d8ecb0', '#3f8a5a'], dokkaebital: ['#cfe4f8', '#2f4d9e'], bolttal: ['#fff0a0', '#6a3c94'] }[w] || ['#ffd24a', RED];
    const x = atk ? hx : hx + 2, y = atk ? hy - 5 : hy - 4; talis(s, x, y, TC[0], TC[1]); if (atk) sparkle(s, x, y - 7, TC[0]);
  } else if (k === 'fan') {
    const cols = w === 'featherfan' ? [PAPERW, '#dfe8ee', PAPERW, '#dfe8ee', PAPERW] : [RED, '#ffd24a', '#2f4d7e', PAPERW, '#3f8a6a'];
    const a0 = atk ? -2.6 : -1.9; for (let i = 0; i < 5; i++) { const a = a0 + i * 0.42; s.line(Math.round(hx), Math.round(hy), Math.round(hx + Math.cos(a) * 9), Math.round(hy + Math.sin(a) * 9), c(cols[i], 3), 2); } s.set(Math.round(hx), Math.round(hy), c(WOOD, 1));
  } else if (k === 'bells') { s.vl(hx, hy - 6, hy, c(WOOD, 2)); for (const [ox, oy] of [[-2, -8], [1, -9], [3, -7], [0, -6], [-2, -5]]) part(s, t => t.ell(hx + ox, hy + oy, 1.4, 1.4, c(GOLD)), 1, 1); if (atk) sparkle(s, hx, hy - 13, '#fff0a0'); }
  else if (k === 'gong') { const R2 = w === 'jing' ? 5 : 3.5, gx = atk ? hx + 1 : hx - 15, gy = atk ? hy - 4 : hy - 1; part(s, t => t.ell(gx, gy, R2, R2, c(GOLD)), 1, 2); s.set(gx, gy, c(GOLD, 4)); s.line(hx, hy, hx + 4, hy - 5, c(WOOD, 2)); s.set(hx + 4, hy - 6, c(RED, 3)); if (atk) sparkle(s, gx + 6, gy - 5, '#fff0a0'); }
  else if (k === 'drum') { const gx = hx - 15, gy = hy - 1; part(s, t => t.ell(gx, gy, 3.5, 4, c(PAPERW)), 1, 1); s.vl(gx - 3, gy - 3, gy + 3, c(RED)); s.vl(gx + 3, gy - 3, gy + 3, c('#2f4d7e')); s.line(hx, hy, hx + 3, hy - 6, c(WOOD, 2)); }
  else if (k === 'beads') { for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283; s.set(Math.round(hx + Math.cos(a) * 3), Math.round(hy + 4 + Math.sin(a) * 4), c(i % 3 ? '#5a3a26' : GOLD, 3)); } }
  else if (k === 'bowl') { part(s, t => { t.rows(hy - 3, [[hx - 3, hx + 3], [hx - 3, hx + 3], [hx - 2, hx + 2], [hx - 1, hx + 1]], c(PAPERW)); }, 1, 1); s.hl(hx - 2, hx + 2, hy - 4, c('#8fd3e8', 3)); if (atk) sparkle(s, hx, hy - 9, '#8fd3e8'); }
  else if (k === 'sack') { s.line(hx, hy - 6, 10, 26, c(WOOD, 2), 2); part(s, t => t.ell(9, 26, 6, 6, c(RED)), 1, 2); s.set(7, 23, c(GOLD, 4)); s.set(11, 25, c(GOLD, 3)); s.set(8, 28, c(GOLD, 3)); }
}

// ───────── 뒤에 메는 것 · 손에 드는 소품 ─────────
function quiver(s) { part(s, t => t.rect(11, 27, 4, 10, c('#7a4a2c'))); for (const x of [11, 13, 14]) { s.vl(x, 23, 26, c(WOOD, 3)); s.set(x, 22, c(PAPERW, 4)); s.set(x, 23, c(RED)); } }
function flagBack(s, col, cols) {   // 등에 꽂은 영기 (오방기는 여러 빛깔)
  s.vl(13, 8, 32, c(WOOD, 1)); s.set(13, 7, c(GOLD, 3));
  const cs = cols || [col]; part(s, t => { for (let y = 9; y <= 17; y++) t.hl(6 - (y > 14 ? 0 : 0), 12, y, c(cs[Math.min(cs.length - 1, ((y - 9) / 9 * cs.length) | 0)])); }, 1, 1);
  if (!cols) { s.set(9, 12, c(PAPERW, 4)); s.set(9, 13, c(PAPERW, 3)); s.set(10, 13, c(PAPERW, 3)); }
}
function cape(s, col) { part(s, t => t.rows(29, [[14, 29], [13, 30], [12, 31], [12, 31], [11, 32], [11, 32], [11, 32], [10, 33], [10, 33], [10, 33], [10, 33], [11, 32], [11, 33], [12, 33]], c(col, 1)), 0, 1); }
function tails(s, col, n = 3) {   // 여우 꼬리: 허리 뒤에서 위로 휘어 솟는 굵은 꼬리 여럿, 끝은 희다
  const ends = [[3, 24], [6, 15], [12, 9], [1, 31], [17, 6]];
  for (let i = n - 1; i >= 0; i--) { const [ex, ey] = ends[i], cx = 2, cy = 42;
    part(s, t => { for (let u = 0; u <= 20; u++) { const k = u / 20, x = (1 - k) * (1 - k) * 19 + 2 * (1 - k) * k * cx + k * k * ex, y = (1 - k) * (1 - k) * 41 + 2 * (1 - k) * k * cy + k * k * ey, r = 3.2 - k * 1.1; t.ell(x, y, r, r, c(k > 0.88 ? PAPERW : col, k > 0.88 ? 3 : 2)); } }, 1, 1); }
}
function shieldItem(s, kind, pose) {   // 등패: 왼손에 든다 (치는 모습이면 앞으로 내민다)
  const x = pose === 'atk' ? 30 : 31, y = 38, big = kind === 'big';
  const col = kind === 'lid' ? '#8a8478' : big ? '#6a737c' : STRAW;
  part(s, t => t.ell(x, y, big ? 8 : 7, big ? 9 : 7, c(col)), 1, 2);
  if (kind === 'lid') { s.rect(x - 1, y - 1, 3, 2, c('#5a5448')); s.hl(x - 5, x + 5, y + 2, c(col, 1)); }
  else if (big) { for (const [ox, oy] of [[-3, -2], [3, -2]]) { s.rect(x + ox - 1, y + oy - 1, 2, 2, c('#ffd24a', 3)); s.set(x + ox, y + oy, INK); } s.hl(x - 3, x + 3, y + 3, c(RED, 2)); for (let ox = -2; ox <= 2; ox += 2) s.set(x + ox, y + 4, c(PAPERW, 4)); }
  else { for (const r of [5, 3]) for (let a = 0; a < 24; a++) s.set(Math.round(x + Math.cos(a / 24 * 6.283) * r), Math.round(y + Math.sin(a / 24 * 6.283) * r), c(col, 1)); s.rect(x - 1, y - 1, 3, 3, c(RED)); s.set(x - 1, y - 1, c(GOLD, 4)); }
  if (kind === 'horn') { s.set(x - 4, y - 8, c(PAPERW, 3)); s.set(x - 5, y - 9, c(PAPERW, 4)); s.set(x + 4, y - 8, c(PAPERW, 3)); s.set(x + 5, y - 9, c(PAPERW, 4)); }
}

// ───────── 차림 읽기: 게임의 doll 차림을 도트 틀의 낱말로 ─────────
function specOf(key, d) {
  const o = d.doll || {}, dok = !!d.dok;
  if (dok) {
    const k = d.dok; return { dok: true, skin: k.skin, cloth: k.cloth || '#d8c9a3', vest: k.vest, hair: k.hair || '#2a2228', hat: k.hat || (k.knot ? 'band' : 'wild'), bandCol: k.knot ? RED : null, warts: k.warts, beads: k.beads, apron: k.apron, soot: k.soot, bulk: (d.scale || 1) > 1.02 ? 1 : 0, gamtu: !!k.headItem };
  }
  let st = 'soldier';
  if (o.ghost && o.tatter) st = 'ghost';
  else if (o.riding) st = 'soldier';
  else if (o.bareChest) st = 'bare';
  else if (o.goreum || (o.stripes && !o.legs) || ['jjok', 'halmi', 'gokkal', 'gokkal2', 'jokduri'].includes(o.hat)) st = 'hanbok';
  else if (!o.legs) st = 'robe';
  return Object.assign({}, o, { st, skin: o.skin || '#f3d6b2', top: o.top || o.robe, robe: o.robe, armorK: o.armor ? o.armor.kind : o.studs || o.breast ? 'dujeong' : null, armorC: o.armor ? o.armor.col : null, armorT: o.armor ? o.armor.trim : GOLD });
}

// ───────── 다리 (걷는 모습은 다리를 벌린다) ─────────
function legs(s, q, step) {
  const sh = c(q.shoe || '#2e2a33'), A = step ? -1 : 0, B = step ? 1 : 0;
  if (q.dok) {
    const sk = q.skin; part(s, t => { t.rect(17 + A, 41, 4, 6, c(sk)); t.rect(23 + B, 41, 4, 6, c(sk)); t.rect(16 + A, 46, 5, 2, c(sk)); t.rect(23 + B, 46, 5, 2, c(sk)); });
    for (const x of [16 + A, 18 + A, 25 + B, 27 + B]) s.set(x, 47, c(sk, 4));
    return;
  }
  if (q.st === 'ghost') { if (step) { s.set(17, 47, c(q.robe, 2)); } return; }
  if (q.st === 'robe' || q.st === 'hanbok') { s.rect(16 + A * 2, 46, 5, 2, sh); s.rect(23 + B * 2, 46, 5, 2, sh); s.set(16 + A * 2, 46, c(q.shoe || '#2e2a33', 4)); return; }
  const lc = q.st === 'bare' ? q.legs || '#d9cdb0' : q.legs || CREAM;
  part(s, t => { t.rect(17 + A, 38, 4, 8, c(lc)); t.rect(23 + B, 38, 4, 8, c(lc)); });
  if (q.st !== 'bare') { s.hl(17 + A, 20 + A, 44, c(lc, 1)); s.hl(23 + B, 26 + B, 44, c(lc, 1)); }   // 행전
  s.rect(16 + A, 46, 5, 2, sh); s.rect(23 + B, 46, 5, 2, sh); s.set(16 + A, 46, c(q.shoe || '#2e2a33', 4)); s.set(23 + B, 46, c(q.shoe || '#2e2a33', 4));
  if (q.armorK) { s.rect(17 + A, 42, 4, 2, c(q.bracer || '#4e4f5c')); s.rect(23 + B, 42, 4, 2, c(q.bracer || '#4e4f5c')); }
}

// ───────── 윗몸: 옷·팔·머리·모자·얼굴·무기 ─────────
function upper(s, q, w, pose, mode) {
  const atk = pose === 'atk', bulk = q.bulk ? 1 : 0, sk = q.skin, x0 = 16 - bulk, x1 = 27 + bulk, st = q.st;
  // 등 뒤
  if (q.under === 'tails') tails(s, q.tailCol || '#e8742c', q.tailN || 3);
  if (q.quiver) quiver(s);
  if (q.flag) flagBack(s, q.flag, q.flags);
  if (q.capeCol) cape(s, q.capeCol);
  if (w && KIND[w] === 'sack') drawWeapon(s, w, pose, 30, 38, q);
  if (q.dok) {
    // 도깨비: 맨살 윗몸, 삼베 잠방이, 새끼 띠
    part(s, t => t.rows(29, [[17, 26], [x0, x1], [x0, x1], [x0, x1], [x0, x1], [x0, x1], [x0, x1]], c(sk)), 1, 1);
    s.hl(19, 20, 32, c(sk, 1)); s.hl(23, 24, 32, c(sk, 1)); s.vl(21, 31, 34, c(sk, 1)); s.set(21, 35, c(sk, 0));
    if (q.vest) { part(s, t => { t.rect(x0, 29, 4, 7, c(q.vest)); t.rect(x1 - 3, 29, 4, 7, c(q.vest)); }, 1, 1); }
    if (q.apron) part(s, t => t.rect(18, 30, 8, 11, c(q.apron)), 1, 1);
    part(s, t => t.rows(36, [[x0, x1], [x0, x1], [x0, x1], [x0, x1], [x0, x1]], c(q.cloth)), 1, 1);
    s.vl(21, 38, 40, c(q.cloth, 0)); for (let x = x0; x <= x1; x++) s.set(x, 36, x % 2 ? c(ROPE, 3) : c(ROPE, 1)); s.vl(19, 37, 39, c(ROPE, 3));
    for (const [x, y] of [[x0 + 2, 38], [x1 - 3, 39]]) { s.set(x, y, c(q.cloth, 1)); s.set(x + 1, y, c(q.cloth, 3)); }
    if (q.warts) for (const [x, y] of [[18, 31], [25, 33], [20, 34]]) s.set(x, y, c(sk, 1));
    if (q.beads) for (let x = 18; x <= 25; x++) s.set(x, 29 + (x === 18 || x === 25 ? 0 : x === 19 || x === 24 ? 1 : 2), c(x % 2 ? '#5a3a26' : '#d9c8a0', 3));
  } else if (st === 'bare') {
    part(s, t => t.rows(29, [[17, 26], [x0, x1], [x0, x1], [x0, x1], [x0, x1], [x0, x1], [x0, x1], [x0, x1]], c(sk)), 1, 1);
    s.hl(19, 20, 32, c(sk, 1)); s.hl(23, 24, 32, c(sk, 1)); s.vl(21, 31, 34, c(sk, 1));
    if (q.strap) s.line(x0, 29, x1, 36, c(q.strap), 2);
    if (q.item === 'pelt') { part(s, t => t.rows(29, [[x0, 22], [x0, 21], [x0, 20], [x0, 19]], c('#d9963f')), 1, 1); for (const [x, y] of [[x0 + 1, 30], [x0 + 3, 31]]) s.set(x, y, c(BLACK)); }
    part(s, t => t.rows(36, [[x0, x1], [x0, x1]], c(q.sash || RED)), 1, 0); s.rect(21, 36, 2, 4, c(q.sash || RED, 3));
  } else if (st === 'hanbok') {
    const R = q.robe;
    part(s, t => t.rows(34, [[16, 27], [15, 28], [15, 28], [14, 29], [14, 29], [13, 30], [13, 30], [12, 31], [12, 31], [12, 31], [11, 32], [11, 32], [11, 32], [12, 31]], c(R)), 1, 2);
    if (q.hem) for (let x = 11; x <= 32; x++) if (s.get(x, 46) !== -1) s.set(x, 46, c(q.hem));
    s.vl(18, 37, 43, c(R, 1)); s.vl(24, 38, 44, c(R, 1)); s.vl(21, 36, 42, c(R, 3));
    part(s, t => t.rows(29, [[17, 26], [16, 27], [16, 27], [16, 27], [16, 27]], c(q.top)), 1, 1);
    if (q.vest) part(s, t => { t.rect(16, 29, 3, 7, c(q.vest)); t.rect(25, 29, 3, 7, c(q.vest)); }, 1, 1);
    const gc = q.git || RED; for (const [x, y] of [[19, 29], [20, 30], [21, 31], [24, 29], [23, 30], [22, 31]]) s.set(x, y, c(gc));
    const gr = q.goreum || RED; s.rect(21, 32, 2, 2, c(gr)); s.vl(21, 34, 38, c(gr)); s.vl(23, 34, 37, c(gr, 3));
  } else if (st === 'ghost') {
    const R = q.robe;
    part(s, t => t.rows(29, [[17, 26], [16, 27], [16, 27], [16, 27], [16, 27], [15, 28], [15, 28], [15, 28], [14, 29], [14, 29], [14, 29], [14, 29], [15, 28], [15, 28], [16, 27]], c(R)), 1, 2);
    for (const [x, y] of [[15, 44], [17, 45], [18, 46], [20, 44], [21, 46], [22, 47], [24, 45], [25, 46], [27, 44], [28, 43]]) { s.set(x, y, c(R)); s.set(x, y - 1, c(R)); }
    for (const [x, y] of [[16, 43], [19, 44], [23, 44], [26, 43]]) s.set(x, y, -1);
    s.vl(19, 36, 42, c(R, 1)); s.vl(24, 37, 43, c(R, 1));
    const gc = q.collar || PAPERW; for (const [x, y] of [[19, 29], [20, 30], [21, 31], [24, 29], [23, 30], [22, 31]]) s.set(x, y, c(gc, 3));
    if (q.stripes) for (let i = 0; i < q.stripes.length; i++) s.hl(16, 27, 33 + i, c(q.stripes[i]));
  } else {
    const long = st === 'robe', T = q.top, R = q.robe;
    part(s, t => { t.rows(29, [[17, 26], [x0, x1], [x0, x1], [x0, x1], [x0, x1], [x0, x1], [x0, x1], [x0, x1], [x0, x1]], c(T)); t.rows(38, long ? [[15, 28], [15, 28], [15, 28], [15, 28], [14, 29], [14, 29], [14, 29], [14, 29]] : [[15, 28], [15, 28], [15, 28], [15, 28]], c(R)); }, 1, 2);
    if (long) { s.vl(19, 39, 44, c(R, 1)); s.vl(24, 40, 45, c(R, 1)); s.vl(21, 38, 43, c(R, 3)); if (q.hem) s.hl(14, 29, 45, c(q.hem)); }
    else { s.vl(21, 38, 41, c(R, 1)); if (q.hem) s.hl(15, 28, 41, c(q.hem, 3)); }
    if (q.kwaeja) { part(s, t => { t.rect(x0, 29, 3, 13, c(q.kwaeja)); t.rect(x1 - 2, 29, 3, 13, c(q.kwaeja)); }, 1, 1); if (q.kwaejaLine) { s.vl(x0 + 2, 29, 41, c(q.kwaejaLine)); s.vl(x1 - 2, 29, 41, c(q.kwaejaLine)); } }
    if (q.vest) part(s, t => { t.rect(x0, 29, 4, 8, c(q.vest)); t.rect(x1 - 3, 29, 4, 8, c(q.vest)); if (!long) { t.rect(x0, 38, 3, 4, c(q.vest)); t.rect(x1 - 2, 38, 3, 4, c(q.vest)); } }, 1, 1);
    if (q.fur) { part(s, t => { t.rect(x0, 29, 4, 8, c('#8a6a4a')); t.rect(x1 - 3, 29, 4, 8, c('#8a6a4a')); }, 1, 1); for (let y = 30; y < 37; y += 2) { s.set(x0 + 1, y, c('#c9a87a', 3)); s.set(x1 - 1, y, c('#c9a87a', 3)); } }
    if (q.dots) for (const [x, y] of [[18, 40], [25, 41], [16, 43], [22, 44], [27, 44]]) if (long) s.set(x, y, c(q.dots, 3));
    if (q.crane) { s.set(18, 42, c(BLACK)); s.set(19, 41, c(PAPERW, 4)); s.set(20, 42, c(PAPERW, 4)); }
    // 갑옷: 두정갑(금징) · 쇠미늘(가로 미늘) · 사슬(촘촘한 점)
    if (q.armorK) {
      const ac = q.armorC || T, tr = q.armorT || GOLD;
      if (q.armorC) part(s, t => { t.rows(29, [[17, 26], [x0, x1], [x0, x1], [x0, x1], [x0, x1], [x0, x1], [x0, x1]], c(ac)); t.rows(38, q.armor && q.armor.short ? [[15, 28], [15, 28]] : [[15, 28], [15, 28], [15, 28], [15, 28]], c(ac)); }, 1, 2);
      const yEnd = q.armor && q.armor.short ? 39 : 41;
      if (q.armorK === 'dujeong') { for (let y = 31; y <= 34; y += 2) for (let x = 17 + (y % 4 === 1 ? 1 : 0); x <= 26; x += 2) s.set(x, y, c(tr, 3)); for (let x = 16; x <= 27; x += 2) s.set(x, 39, c(tr, 3)); }
      else if (q.armorK === 'lamellar') { for (let y = 30; y <= yEnd; y += 2) for (let x = x0; x <= x1; x++) if (s.get(x, y) !== -1) s.set(x, y, c(ac, (x + y) % 3 ? 1 : 3)); }
      else for (let y = 30; y <= yEnd; y++) for (let x = x0; x <= x1; x++) if (s.get(x, y) !== -1 && (x + y) % 2) s.set(x, y, c(ac, 3));
      s.hl(15, 28, yEnd, c(tr)); if (q.armor && q.armor.mirror || q.breast) { part(s, t => t.rect(20, 31, 4, 3, c(STEEL, 3)), 1, 1); s.set(21, 32, c(PAPERW, 4)); }
    }
    // 깃(동정)과 허리띠
    const gc = q.git || PAPERW; for (const [x, y] of [[19, 29], [20, 30], [21, 31], [22, 32], [24, 29], [23, 30], [22, 31]]) s.set(x, y, c(gc, q.git ? 2 : 3));
    if (q.collar) for (const [x, y] of [[19, 29], [24, 29]]) s.set(x, y, c(q.collar, 3));
    if (q.kasaya) { s.line(x0, 30, x1, 37, c(q.kasaya), 3); s.line(x0, 29, x1, 36, c(q.kasaya, 3)); }
    if (q.cross) for (let i = 0; i < q.cross.length; i++) s.line(x0, 29 + i, x1, 35 + i, c(q.cross[i]));
    if (q.strap) s.line(x0, 29, x1, 35, c('#5a3a26'));
    if (q.pelt) { part(s, t => t.rows(28, [[x0 - 1, 22], [x0 - 1, 21], [x0, 19], [x0, 18]], c('#c49a62')), 1, 1); s.set(x0, 29, c('#5a3a26')); }
    const sa = q.sash || GOLD; s.hl(x0, x1, 36, c(sa)); s.hl(x0, x1, 37, c(sa, 1)); s.set(x0, 36, c(sa, 3)); s.rect(20, 36, 3, 2, c(sa, 3)); s.vl(20, 38, 40, c(sa));
    if (q.beads) for (let x = 18; x <= 25; x++) s.set(x, 30 + (x === 18 || x === 25 ? 0 : 1), c(x % 2 ? '#5a3a26' : GOLD, 3));
    if (q.roundBadge) { part(s, t => t.ell(21.5, 32.5, 2.5, 2.5, c(q.roundBadge)), 1, 1); s.set(21, 32, c(PAPERW, 4)); }
    if (q.okdae) { s.hl(x0, x1, 36, c(GOLD, 3)); for (let x = x0 + 1; x < x1; x += 3) s.set(x, 36, c('#5fae8a', 3)); }
    if (q.pauldron) part(s, t => { t.ell(15, 30.5, 2.6, 2.2, c(q.pauldron)); t.ell(28, 30.5, 2.6, 2.2, c(q.pauldron)); }, 1, 1);
  }
  // 왼팔과 손 (방패를 들면 방패 뒤)
  const sleeve = st === 'bare' || q.dok ? sk : (q.sleeve || q.top), wide = st === 'hanbok' || st === 'robe';
  part(s, t => { t.rect(13 - bulk, 31, 3 + bulk, 6, c(sleeve)); if (wide) t.rect(12, 34, 4, 4, c(sleeve)); }, 1, 1);
  if (q.stripes && st === 'hanbok') for (let i = 0; i < q.stripes.length; i++) s.hl(12, 15, 33 + i, c(q.stripes[i]));
  part(s, t => t.rect(13 - bulk, 37, 3, 3, c(sk)), 1, 1);
  if (q.cuff) s.hl(12, 15, 36, c(q.cuff, 3)); if (q.bracer && st !== 'hanbok') s.hl(13 - bulk, 15, 36, c(q.bracer)); if (q.wrist) s.hl(13 - bulk, 15, 37, c(q.wrist));
  if (q.leftItem === 'bottle') { part(s, t => { t.rect(12, 37, 4, 5, c('#e4dccc')); t.rect(13, 35, 2, 2, c('#e4dccc')); }, 1, 1); s.set(13, 35, c(RED)); }
  if (q.leftItem === 'book') { part(s, t => t.rect(10, 35, 6, 7, c('#2a2a3a')), 1, 1); s.vl(13, 36, 40, c(PAPERW, 3)); }
  // 머리
  part(s, t => t.rows(18, HEAD, c(sk)), 1, 1);
  const hc = q.hair || (q.old ? '#e2ddd2' : BLACK);
  if (q.dok) { /* 도깨비 머리는 모자 자리에서 (wild) */ }
  else if (q.hat !== 'bald' && st !== 'bare' || (st === 'bare' && q.hat !== 'wild')) { const H2 = c(hc); s.rows(18, [[19, 24], [17, 26], [16, 27], [15, 28]], H2); s.vl(15, 21, 24, H2); s.vl(28, 21, 25, H2); s.vl(16, 21, 22, H2); if (q.longHair || st === 'ghost' && q.hat === 'jokduri') { s.vl(14, 22, 31, H2); s.vl(15, 24, 32, H2); s.vl(29, 22, 30, H2); } }
  if (q.dok) { s.rect(13, 22, 2, 3, c(sk)); s.set(13, 23, c(sk, 1)); s.rect(29, 22, 2, 3, c(sk)); s.set(30, 23, c(sk, 1)); }   // 둥근 귀
  const hat = q.dok ? (q.hat === 'band' ? 'band' : q.hat === 'paeraeng' || q.hat === 'beong' ? q.hat : 'wild') : q.hat;
  if (q.dok && hat !== 'wild') HATS.wild(s, Object.assign({}, q, { hair: q.hair }));
  if (hat && HATS[hat]) HATS[hat](s, q);
  if (q.gamtu) { part(s, t => t.rows(11, [[18, 25], [17, 26], [16, 27], [16, 27], [15, 28], [15, 28]], c('#2a2630'))); s.hl(15, 28, 16, c('#5a4a6a', 3)); }
  face(s, q);
  // 오른팔과 무기
  const wp = weaponPose(w, pose, mode), [hx, hy] = wp.hand;
  if (w && KIND[w] !== 'sack') drawWeapon(s, w, pose, hx, hy, q);
  part(s, t => { if (wp.arm === 'up') t.rect(28, 24, 3, 12, c(sleeve)); else if (wp.arm === 'fwd') { t.rect(28, 31, 3, 4, c(sleeve)); t.rect(30, hy - 1, hx - 30, 3, c(sleeve)); } else { t.rect(28, 31, 3 + bulk, 6, c(sleeve)); if (wide) t.rect(28, 34, 4, 4, c(sleeve)); } }, 1, 1);
  if (q.stripes && st === 'hanbok' && wp.arm === 'down') for (let i = 0; i < q.stripes.length; i++) s.hl(28, 31, 33 + i, c(q.stripes[i]));
  part(s, t => t.rect(hx - 1, hy - 1, 3, 3, c(sk)), 1, 1);
  if (q.cuff && wp.arm === 'down') s.hl(28, 31, 36, c(q.cuff, 3));
  if (q.bracer && wp.arm === 'down' && st !== 'hanbok') s.hl(28, 30 + bulk, 36, c(q.bracer));
  if (w && (WDATA[q.wpnId] || {}).hand === 'B' && KIND[w] === 'sword') blade(s, 14, 38, atk ? -2.6 : -2.1, 12, { col: STEEL });
  if (w && (WDATA[q.wpnId] || {}).hand === 'B' && KIND[w] === 'axe') { const [tx, ty] = shaft(s, 14, 38, -2.0, 2, 9); part(s, t => t.rect(tx - 3, ty - 1, 3, 4, c(STEEL)), 1, 1); }
  if (w && (WDATA[q.wpnId] || {}).hand === 'B' && KIND[w] === 'fan') { for (let i = 0; i < 5; i++) { const a = -2.9 + i * 0.35; s.line(14, 38, Math.round(14 + Math.cos(a) * 8), Math.round(38 + Math.sin(a) * 8), c([RED, '#ffd24a', '#2f4d7e', PAPERW, '#3f8a6a'][i], 3)); } }
  if (q.shield) shieldItem(s, q.shield, pose);
}

// ───────── 얼굴 ─────────
function face(s, q) {
  const sk = q.skin, K = INK, ec = q.iris ? c(q.iris) : K;
  s.hl(17, 27, 21, c(sk, 1));   // 모자·머리칼 아래 그늘
  if (q.dok) {   // 부리부리한 눈, 굵고 평평한 눈썹, 넓적한 코, 이를 맞물고 히죽 웃는 입 (엄니·뿔은 달지 않는다)
    s.rect(18, 22, 3, 3, c(PAPERW, 4)); s.rect(24, 22, 3, 3, c(PAPERW, 4)); s.rect(19, 23, 2, 2, K); s.rect(25, 23, 2, 2, K); s.set(19, 23, c('#ffd24a', 4)); s.set(25, 23, c('#ffd24a', 4));
    s.hl(17, 21, 21, c(q.hair || BLACK)); s.hl(23, 27, 21, c(q.hair || BLACK)); s.hl(17, 20, 20, c(q.hair || BLACK, 1)); s.hl(24, 27, 20, c(q.hair || BLACK, 1));
    s.rect(21, 24, 3, 2, c(sk, 1)); s.set(22, 24, c(sk, 3));
    s.hl(18, 26, 27, K); s.hl(19, 25, 28, c(PAPERW, 4)); s.set(18, 26, K); s.set(26, 26, K); s.hl(19, 25, 29, K); s.set(21, 28, c(PAPERW, 2)); s.set(23, 28, c(PAPERW, 2));
    if (q.soot) { s.set(17, 25, c('#3a3438')); s.set(26, 26, c('#3a3438')); }
    return;
  }
  const ey = 23, eyes = q.eyes || 'soft';
  for (const ex of [19, 25]) {
    if (eyes === 'closed') { s.hl(ex, ex + 1, 24, K); s.set(ex - 1, 23, K); }
    else if (eyes === 'smile') { s.set(ex - 1, 24, K); s.hl(ex, ex + 1, 23, K); s.set(ex + 2, 24, K); }
    else if (eyes === 'narrow' || eyes === 'heavy' || eyes === 'droop') { s.rect(ex, 24, 2, 1, ec); s.hl(ex - 1, ex + 2, 23, c(sk, 1)); if (eyes === 'heavy') s.hl(ex, ex + 1, 23, c(sk, 0)); }
    else if (eyes === 'sharp' || eyes === 'glare') { s.rect(ex, 23, 2, 2, ec); s.set(ex + (ex === 19 ? 1 : 0), 23, c(PAPERW, 4)); }
    else if (eyes === 'ghost') { s.rect(ex, ey, 2, 3, c('#22305e')); }
    else { s.rect(ex, ey, 2, 3, ec); s.set(ex, ey, c(PAPERW, 4)); if (q.lash) s.set(ex - 1, ey, K); }
  }
  const bc = c(q.browCol || (q.old ? '#cfc8b8' : q.hair || BLACK), q.browCol || q.old ? 2 : 1), br = q.brow || 'flat';
  if (br === 'stern' || br === 'thick' || br === 'bushy') { for (const [x, y] of [[18, 21], [19, 21], [20, 22], [21, 22], [27, 21], [26, 21], [25, 22], [24, 22]]) s.set(x, y, bc); if (br !== 'stern') { s.set(18, 22, bc); s.set(27, 22, bc); } }
  else if (br === 'worry') { s.set(18, 22, bc); s.set(19, 21, bc); s.set(20, 21, bc); s.set(27, 22, bc); s.set(26, 21, bc); s.set(25, 21, bc); }
  else if (br === 'arch' || br === 'old') { s.set(18, 22, bc); s.hl(19, 20, 21, bc); s.set(27, 22, bc); s.hl(25, 26, 21, bc); }
  else if (br === 'thin') { s.hl(19, 20, 21, bc); s.hl(25, 26, 21, bc); }
  else { s.hl(18, 20, 21, bc); s.hl(25, 27, 21, bc); }
  s.set(23, 25, c(sk, 1));
  if (q.lip || q.mouth === 'smile') { s.hl(16, 17, 26, c('#e87090', 3)); s.hl(27, 28, 26, c('#e87090', 3)); }
  const m = q.mouth, lip = q.lip ? c(q.lip) : c(RED, 0);
  if (m === 'smile') { s.set(21, 27, lip); s.hl(22, 23, 28, lip); s.set(24, 27, lip); }
  else if (m === 'grin') { s.hl(21, 24, 27, K); s.hl(21, 24, 28, c(PAPERW, 4)); s.set(20, 27, K); s.set(25, 27, K); }
  else if (m === 'grit') { s.hl(21, 24, 27, c(PAPERW, 4)); s.hl(21, 24, 28, K); }
  else if (m === 'frown') { s.hl(22, 23, 27, lip); s.set(21, 28, lip); s.set(24, 28, lip); }
  else if (m === 'smirk') { s.hl(21, 23, 27, lip); s.set(24, 26, lip); }
  else if (m !== false) s.hl(22, 23, 27, q.lip ? lip : c(sk, 0));
  if (q.scar) { s.set(26, 22, c(RED, 1)); s.set(27, 23, c(RED, 1)); s.set(26, 24, c(RED, 1)); }
  if (q.lines) { s.set(17, 25, c(sk, 1)); s.set(28, 25, c(sk, 1)); }
  const bd = q.beard; if (bd) {
    const bcol = c(q.beardCol || (q.old ? '#e2ddd2' : q.hair || BLACK), q.beardCol || q.old ? 3 : 1);
    if (bd === 'stubble') for (const [x, y] of [[18, 27], [20, 28], [22, 29], [24, 28], [26, 27], [21, 29], [23, 29]]) s.set(x, y, c(sk, 0));
    else if (bd === 'mustache') { s.hl(21, 24, 26, bcol); s.set(20, 27, bcol); s.set(25, 27, bcol); }
    else if (bd === 'goatee') { s.hl(21, 24, 26, bcol); s.rows(28, [[21, 23], [21, 23], [22, 22]], bcol); }
    else if (bd === 'long') { s.hl(21, 24, 26, bcol); s.rows(27, [[19, 25], [19, 25], [20, 24], [20, 24], [21, 23], [21, 23], [22, 22]], bcol); s.hl(22, 23, 27, c(RED, 0)); s.vl(21, 29, 32, c(q.beardCol || (q.old ? '#e2ddd2' : BLACK), q.beardCol || q.old ? 2 : 3)); }
    else { s.rows(25, [[16, 18], [16, 19], [16, 27], [17, 26], [18, 25], [19, 24]], bcol); s.hl(26, 27, 25, bcol); s.hl(25, 27, 26, bcol); s.hl(20, 24, 26, bcol); s.hl(22, 23, 27, c(RED, 0)); if (bd === 'wild') { s.set(16, 30, bcol); s.set(27, 30, bcol); s.rows(31, [[19, 24], [20, 23]], bcol); } }
  }
}

// ───────── 말 (기병): 오른쪽을 보는 말, 탄 사람은 그 위로 올린다 ─────────
function horse(s, o, step) {
  const C0 = o.coat || '#7a4a32', M = o.mane || '#2a1f22', A = step ? 1 : 0;
  part(s, t => { t.rect(10 - A, 38, 3, 11, c(C0, 1)); t.rect(29 + A, 38, 3, 11, c(C0, 1)); }, 0, 1);   // 뒷다리
  part(s, t => { t.ell(22, 33, 15, 7, c(C0)); t.poly([[31, 30], [38, 18], [44, 18], [46, 22], [41, 24], [36, 34]], c(C0)); t.rect(14 + A, 38, 3, 11, c(C0)); t.rect(33 - A, 38, 3, 11, c(C0)); }, 1, 2);
  for (const x of [14 + A, 33 - A, 10 - A, 29 + A]) s.rect(x, 48, 3, 1, c('#2a1f22'));
  part(s, t => { t.poly([[34, 18], [39, 15], [40, 19], [35, 28], [32, 28]], c(M)); t.poly([[8, 30], [4, 34], [3, 42], [6, 40], [8, 35]], c(M)); }, 1, 1);
  s.set(42, 20, INK); s.set(45, 23, c(C0, 0)); s.set(40, 15, c(C0)); s.set(41, 16, c(C0));
  if (o.barding) { part(s, t => t.rows(27, [[11, 33], [10, 34], [10, 34], [10, 34], [10, 34], [11, 33], [12, 32]], c(o.barding)), 1, 1); for (let x = 11; x <= 33; x += 2) s.set(x, 33, c(o.bardTrim || GOLD, 3)); }
  part(s, t => t.rect(17, 25, 10, 4, c(o.saddle || '#7a1f1c')), 1, 1); s.hl(17, 26, 29, c(o.tack || GOLD, 3));
  s.line(37, 22, 30, 27, c(o.tack || GOLD, 3)); if (o.chamfron) s.rect(42, 18, 3, 3, c(o.chamfron, 3));
}

// ───────── 차림마다 손볼 것 (함수로 적힌 소품·등짐을 도트 낱말로) ─────────
const EXTRA = {
  shield: { shield: 'round' }, br_cheolbyeok: { shield: 'big' }, br_dolgyeok: { shield: 'horn', flag: '#ffd24a' }, rshield: { shield: 'lid' },
  xbow: { quiver: true }, hunter: { quiver: true }, br_aegisal: { quiver: true, flag: '#2f4d7e' }, br_yungnyang: { quiver: true }, skelarcher: { quiver: true, wpn: 'bow' }, garcher: { quiver: true, wpn: 'bow' },
  commander: { capeCol: '#2f4d7e', flag: null }, br_ssanggeom: { flag: '#b8342a' }, br_jangchang: { flag: '#2f4d7e' }, br_masang: { flag: '#e0b23c' }, br_gichang: { capeCol: '#7a1f1c' },
  br_gutmu: { flag: RED, flags: [RED, '#ffd24a', PAPERW, '#3f6b5c', '#2f4d7e'] }, br_binggyeol: {}, br_sammae: {},
  jumo: { leftItem: 'bottle' }, scribe: { leftItem: 'book', wpn: null }, necro: { leftItem: 'book' }, reaper: {},
  foxlady: { under: 'tails', tailN: 3 }, foxhag: { under: 'tails', tailN: 2, tailCol: '#c8b89a' }, foxhalmi: { under: 'tails', tailN: 5, tailCol: '#ebe6da' },
  sangsoe: {}, archmage: {}, berserk: {}, br_dorikkae: { item: 'pelt' }, chief: { bulk: 1 }, dueok: { bulk: 1 }, orc: { bulk: 1 },
  yagwang: { wpn: null }, porter: {}, gamtu: {}, shaman: {},
};
const HORSES = {
  knight: { coat: '#7a4a32', mane: '#2a1f22', saddle: '#7a1f1c', tack: GOLD },
  br_gichang: { coat: '#3a2a26', mane: '#1a161c', saddle: '#7a1f1c', tack: '#d6a640', barding: '#5e6470', bardTrim: '#d6a640', chamfron: '#d9b24a' },
  br_masang: { coat: '#cfc8bc', mane: '#5a5a62', saddle: '#2f4d7e', tack: '#2f4d7e' },
};

// 차림의 기본 무기 (무기 id → 그림 종류의 이름)
function weaponOf(key, d, wpn, ex) {
  if (wpn === 'none') return [null, null];
  if (wpn) return [WDATA[wpn] ? WDATA[wpn].spr : wpn, wpn];
  if (ex && ex.wpn !== undefined) return [ex.wpn, ex.wpn];
  if (d.weapon && d.weapon !== 'none') return [d.weapon, d.weapon];
  if (d.weapon === 'none') return [null, null];
  const base = d.base || key, a = WARMS[base]; if (!a) return [null, null];
  const id = a.base; return [WDATA[id] ? WDATA[id].spr : id, id];
}

// ───────── 손으로 찍는 인형 ─────────
const PW = 76, PH = 66, DX = 8, DY = 10;   // 판 크기와 시안 좌표의 옮김 (발밑 = 시안 22,49)
function handDoll(key, wpn) {
  const d = LOOKS[key], ex = EXTRA[key] || {}, q = Object.assign(specOf(key, d), ex);
  const [w, wid] = weaponOf(key, d, wpn, ex); q.wpnId = wid;
  if (wpn === 'none') { q.shield = null; q.leftItem = null; }
  const mode = wid && WDATA[wid] ? WDATA[wid].mode : (d.hold && d.hold.mode) || null;
  const riding = !!(d.doll && d.doll.riding), hs = HORSES[key];
  const mk = () => new OSpr(PW + (riding ? 20 : 0), PH + (riding ? 18 : 0), DX + (riding ? 4 : 0), DY + (riding ? 2 : 0));
  const frame = (pose, step) => {
    if (riding) {
      const base = mk(), hz = new OSpr(base.w, base.h, base.dx, base.dy + 16), rd = mk();
      horse(hz, hs || HORSES.knight, step); merge(base, hz);
      upper(rd, q, w, pose, mode); const rider = rd;
      // 탄 사람: 다리 하나를 말 옆구리에 늘어뜨린다
      part(base, t => { t.rect(20, 38, 4, 6, c(q.legs || CREAM)); t.rect(20, 44, 5, 2, c(q.shoe || '#2e2a33')); }, 1, 1);
      merge(base, rider); return base;
    }
    const s = mk(); legs(s, q, step);
    if (step) { const u = mk(); upper(u, q, w, pose, mode); const sh = like(u); for (let i = u.w; i < u.d.length; i++) sh.d[i] = u.d[i - u.w]; merge(s, sh); }   // 걷는 모습: 윗몸이 한 칸 내려간다
    else upper(s, q, w, pose, mode);
    return s;
  };
  const fr = [frame('rest', false), frame('rest', true), frame('atk', false)];
  const ox = DX + 22 + (riding ? 4 : 0), oy = DY + 49 + (riding ? 2 + 16 : 0);
  const [a, b, cc] = cropAll(fr, ox, oy, 0).map(edged);
  return { stand: a, step: b, atk: cc };
}

// ───────── 종이 그림을 도트로 굽기 (짐승·두목·소품 · 아주 큰 두목 인형) ─────────
const SSAMP = 4;
function paperDraw(g, key, d) {
  const wrap = fn => (d.wide ? gg => { gg.save(); gg.scale(d.wide, 1); fn(gg); gg.restore(); } : fn);
  if (d.doll) {
    const q = d.doll, lift = q.lift || 0;
    wrap(gg => { if (q.under) q.under(gg); gg.save(); if (lift) gg.translate(0, -lift); paperDoll(gg, q, 'body'); gg.restore(); })(g);
    // 머리 그림도 발밑을 원점으로 그린다 (전장에서는 목을 축으로 까딱일 뿐)
    wrap(gg => { gg.save(); if (lift) gg.translate(0, -lift); paperDoll(gg, q, 'head'); gg.restore(); })(g);
  } else if (d.dok) {
    paperDok(g, d.dok, 'body'); paperDok(g, d.dok, 'head');
  } else wrap(d.body)(g);
}
// 무기 종이 그림(크림색 테두리가 둘린 것)을 손에 쥔 자리에
function paperWeapon(g, key, d) {
  if (!d.weapon || d.weapon === 'none' || !d.hold) return false;
  let L; try { L = getLook(key); } catch (e) { return false; } const sp = L.weapon; if (!sp) return false;
  g.save(); g.translate(d.hold.x, d.hold.y); g.rotate(d.hold.a || 0); g.drawImage(sp.img, -sp.ox, -sp.oy, sp.w, sp.h); g.restore(); return true;
}
// 큰 캔버스에 그린 그림을 SSAMP 칸씩 평균해 논리 픽셀로 (반 넘게 칠해진 칸만 남긴다)
export function downsample(cv, f) {
  const W0 = cv.width, H0 = cv.height, w = Math.floor(W0 / SSAMP), h = Math.floor(H0 / SSAMP), d = cv.getContext('2d').getImageData(0, 0, W0, H0).data, out = new Int32Array(w * h).fill(-1), al = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let r = 0, gg = 0, b = 0, a = 0;
    for (let j = 0; j < SSAMP; j++) for (let i = 0; i < SSAMP; i++) { const p = ((y * SSAMP + j) * W0 + x * SSAMP + i) * 4, aa = d[p + 3]; r += d[p] * aa; gg += d[p + 1] * aa; b += d[p + 2] * aa; a += aa; }
    al[y * w + x] = a / (SSAMP * SSAMP * 255);
    if (a / (SSAMP * SSAMP) >= 120) out[y * w + x] = (Math.round(r / a) << 16) | (Math.round(gg / a) << 8) | Math.round(b / a);
  }
  return { w, h, d: out, al };
}
// 색 줄이기: 중앙 자르기(median cut)로 n 가지
export function medianCut(cols, n) {
  let boxes = [cols];
  while (boxes.length < n) {
    let bi = -1, br = -1, bc = 0;
    boxes.forEach((bx, i) => { if (bx.length < 2) return; for (let ch = 0; ch < 3; ch++) { let mn = 255, mx = 0; for (const v of bx) { const q = (v >> (16 - ch * 8)) & 255; if (q < mn) mn = q; if (q > mx) mx = q; } if (mx - mn > br) { br = mx - mn; bi = i; bc = ch; } } });
    if (bi < 0 || br < 6) break;
    const bx = boxes[bi].slice().sort((p, q) => ((p >> (16 - bc * 8)) & 255) - ((q >> (16 - bc * 8)) & 255)), m = bx.length >> 1;
    boxes.splice(bi, 1, bx.slice(0, m), bx.slice(m));
  }
  return boxes.map(bx => { let r = 0, g = 0, b = 0; for (const v of bx) { r += (v >> 16) & 255; g += (v >> 8) & 255; b += v & 255; } const k = bx.length; return (Math.round(r / k) << 16) | (Math.round(g / k) << 8) | Math.round(b / k); });
}
const dist2 = (a, b) => { const dr = ((a >> 16) & 255) - ((b >> 16) & 255), dg = ((a >> 8) & 255) - ((b >> 8) & 255), db = (a & 255) - (b & 255); return dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11; };
function autoDoll(key, nColors = 16) {
  const d = LOOKS[key], f = PK * (d.scale || 1), BX0 = -170, BX1 = 170, BY0 = -260, BY1 = 60;
  const cw = Math.ceil((BX1 - BX0) * f) * SSAMP, ch = Math.ceil((BY1 - BY0) * f) * SSAMP;
  const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; const g = cv.getContext('2d');
  g.scale(f * SSAMP, f * SSAMP); g.translate(-BX0, -BY0); g.lineJoin = 'round';
  paperDraw(g, key, d);
  // 무기: 따로 그려 둘레의 크림색 종이 테두리를 벗긴 뒤 얹는다
  const wc = document.createElement('canvas'); wc.width = cw; wc.height = ch; const wg = wc.getContext('2d'); wg.scale(f * SSAMP, f * SSAMP); wg.translate(-BX0, -BY0);
  const hasW = paperWeapon(wg, key, d);
  const A = downsample(cv, f), w = A.w, h = A.h;
  if (hasW) { const B = downsample(wc, f); peelLight(B, 4); for (let i = 0; i < B.d.length; i++) if (B.d[i] !== -1) A.d[i] = B.d[i]; }
  // 외톨이 점 지우기 · 바늘구멍 메우기
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? -1 : A.d[y * w + x]);
  for (let pass = 0; pass < 2; pass++) { const nd = A.d.slice(); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = at(x, y), n = [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)].filter(u => u !== -1); if (v !== -1 && n.length <= 1) nd[y * w + x] = -1; else if (v === -1 && n.length >= 3) nd[y * w + x] = n[0]; } A.d = nd; }
  // 색을 줄이고, 아주 어두운 색은 먹으로
  const cols = []; for (const v of A.d) if (v !== -1) cols.push(v);
  const pal = medianCut(cols, nColors).map(v => (lum(v) < 0.14 ? INK : v)), memo = new Map();
  for (let i = 0; i < A.d.length; i++) { const v = A.d[i]; if (v === -1) continue; let m = memo.get(v); if (m === undefined) { let bd = 1e12; for (const p of pal) { const dd = dist2(v, p); if (dd < bd) { bd = dd; m = p; } } memo.set(v, m); } A.d[i] = m; }
  // 가장자리의 어두운 선은 벗긴다 (먹선은 둘레에 새로 두른다)
  { const nd = A.d.slice(); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = at(x, y); if (v === -1 || lum(v) > 0.3) continue; if (at(x - 1, y) === -1 || at(x + 1, y) === -1 || at(x, y - 1) === -1 || at(x, y + 1) === -1) nd[y * w + x] = -1; } A.d = nd; }
  const s = new Spr(w, h, 0, 0); s.d = A.d;
  const ox = Math.round(-BX0 * f), oy = Math.round(-BY0 * f);
  const [cr] = cropAll([s], ox, oy, 0);
  return edged(cr);
}
export function peelLight(B, n) {
  const w = B.w, h = B.h; for (let k = 0; k < n; k++) { const nd = B.d.slice(); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = B.d[y * w + x]; if (v === -1) continue; if (lum(v) < 0.22) continue; /* 무기의 먹선에서 멈춘다 */ const e = (xx, yy) => xx < 0 || yy < 0 || xx >= w || yy >= h || B.d[yy * w + xx] === -1; if (e(x - 1, y) || e(x + 1, y) || e(x, y - 1) || e(x, y + 1)) nd[y * w + x] = -1; } B.d = nd; }
}

// ───────── 손으로 찍는 큰 짐승: 범 (시안의 민화 범) ─────────
function handTiger(coat) {
  const s = new OSpr(104, 68, 0, 0), T = n => c(coat.coat, n), K = INK, B = c(coat.stripe), Wt = c(coat.belly || '#fffbe4', 3);
  part(s, t => { t.line(14, 34, 7, 30, T(2), 4); t.line(7, 30, 4, 20, T(2), 4); t.line(4, 20, 9, 11, T(2), 4); t.line(9, 11, 16, 8, T(2), 3); t.rect(15, 6, 5, 4, B); }, 1, 1);
  for (const [x, y] of [[5, 28], [3, 23], [4, 17], [8, 12]]) s.hl(x, x + 3, y, B);
  part(s, t => { t.rect(29, 44, 7, 16, T(1)); t.rect(28, 59, 10, 4, T(1)); t.rect(48, 44, 7, 16, T(1)); t.rect(48, 59, 10, 4, T(1)); }, 0, 1);
  part(s, t => { t.ell(40, 36, 17, 11, T(2)); t.ell(56, 35, 12, 14, T(2)); t.ell(25, 37, 13, 13, T(2)); }, 2, 2);
  part(s, t => t.ell(42, 46, 14, 3, Wt), 0, 0);
  for (const [x, y, len, w] of [[17, 26, 10, 4], [24, 24, 12, 4], [31, 25, 12, 4], [38, 25, 13, 4], [45, 24, 12, 4], [52, 22, 12, 4]]) s.poly([[x, y], [x + w, y], [x + w - 2, y + len], [x + 1, y + len - 2]], B);
  part(s, t => { t.ell(21, 42, 9, 10, T(2)); t.poly([[15, 46], [25, 46], [24, 60], [17, 60]], T(2)); t.rect(15, 59, 13, 4, T(2)); t.poly([[54, 40], [67, 40], [65, 60], [57, 60]], T(2)); t.rect(56, 59, 12, 4, T(2)); }, 1, 2);
  part(s, t => t.ell(60, 40, 4, 6, Wt), 0, 0);
  for (const [lx, w] of [[16, 9], [56, 9]]) { s.hl(lx, lx + 4, 46, B); s.hl(lx + w - 5, lx + w - 1, 50, B); s.hl(lx, lx + 3, 54, B); }
  for (const px of [16, 57]) { s.set(px + 3, 62, Wt); s.set(px + 6, 62, Wt); s.set(px + 9, 62, Wt); s.vl(px + 4, 60, 61, T(1)); s.vl(px + 7, 60, 61, T(1)); }
  part(s, t => { t.poly([[58, 17], [62, 8], [67, 15]], T(2)); t.poly([[77, 15], [82, 8], [86, 17]], T(2)); }, 1, 1);
  for (const [x, y] of [[62, 12], [62, 13], [63, 14], [82, 12], [82, 13], [81, 14]]) s.set(x, y, c('#e87090')); s.set(62, 9, B); s.set(82, 9, B);
  part(s, t => { t.ell(72, 28, 14.5, 13, T(2)); t.poly([[58, 30], [54, 35], [60, 36]], T(2)); t.poly([[86, 30], [90, 35], [84, 36]], T(2)); t.poly([[59, 34], [57, 39], [63, 38]], T(2)); t.poly([[85, 34], [87, 39], [81, 38]], T(2)); }, 2, 2);
  part(s, t => { t.ell(72, 34, 8, 5.5, Wt); t.ell(72, 38, 5, 3, Wt); }, 0, 1);
  s.rect(64, 19, 4, 2, c(PAPERW, 3)); s.rect(77, 19, 4, 2, c(PAPERW, 3));
  s.line(68, 15, 70, 19, B, 2); s.line(77, 15, 75, 19, B, 2); s.rect(72, 16, 2, 2, B);
  s.hl(58, 62, 27, B); s.hl(58, 61, 31, B); s.hl(83, 87, 27, B); s.hl(84, 87, 31, B);
  const eye = c(coat.eye || '#ffd24a', 3);
  for (const ex of [63, 76]) { s.rect(ex, 22, 6, 5, eye); s.hl(ex + 1, ex + 4, 21, K); s.set(ex, 22, K); s.set(ex + 5, 22, K); s.hl(ex, ex + 5, 27, K); s.rect(ex + 2, 22, 2, 5, K); s.set(ex + 1, 23, c(PAPERW, 4)); }
  s.line(61, 18, 68, 21, K, 2); s.line(84, 18, 77, 21, K, 2);
  s.rect(70, 30, 5, 3, c('#b03c68')); s.hl(70, 73, 30, c('#e87090')); s.vl(72, 33, 34, K);
  if (coat.roar !== false) { s.rect(66, 35, 13, 5, c('#4a1230')); s.hl(65, 79, 35, K); s.rect(70, 38, 5, 2, c('#e87090')); for (const fx of [66, 77]) { s.rect(fx, 36, 2, 3, c(PAPERW, 4)); s.set(fx + (fx < 70 ? 0 : 1), 39, c(PAPERW, 4)); } s.set(69, 36, c(PAPERW, 4)); s.set(75, 36, c(PAPERW, 4)); }
  else { s.hl(68, 76, 36, K); s.set(67, 35, K); s.set(77, 35, K); }
  for (const [x0, y0, x1, y1] of [[64, 32, 55, 30], [64, 34, 55, 35], [80, 32, 89, 30], [80, 34, 89, 35]]) s.line(x0, y0, x1, y1, c(PAPERW, 4));
  const [cr] = cropAll([plain(s, 50, 63)], 50, 63, 0); return cr;
}
// 범 두목은 몸집에 맞게 정수배로 키우지 않고, 손그림 범을 그대로(가장 큰 도트 범) 쓴다
const HAND_BODY = {
  tigerboss: () => edged(handTiger({ coat: '#e88420', stripe: '#241c22', eye: '#ffd34a' })),
  tigerboss_calm: () => edged(handTiger({ coat: '#e88420', stripe: '#241c22', eye: '#e8b85a', roar: false })),
  jangsan: () => edged(handTiger({ coat: '#f3efe6', stripe: '#9c968a', belly: '#ffffff', eye: '#e0503f' })),
  jangsan_calm: () => edged(handTiger({ coat: '#f3efe6', stripe: '#9c968a', belly: '#ffffff', eye: '#e8b85a', roar: false })),
};

// ───────── 바깥으로 내놓는 것 ─────────
const CACHE = new Map();
// 손으로 찍는 도트 틀에 맞는 차림인가 (몸집이 너무 큰 두목 인형·도깨비는 종이 그림을 굽는다)
const isHand = d => (d.doll || d.dok) && (d.scale || 1) <= 1.4;
export function pxUnit(lookKey, wpn) {
  const d = LOOKS[lookKey]; if (!d) throw new Error('unknown look ' + lookKey);
  const key = lookKey + '|' + (wpn || ''); let r = CACHE.get(key); if (r) return r;
  if (isHand(d)) { const f = handDoll(lookKey, wpn); r = { stand: f.stand, step: f.step, atk: f.atk }; }
  else {
    const base = wpn ? pxUnit(lookKey) : null;   // 큰 그림은 무기를 바꿔도 같은 판
    if (base) r = { stand: base.stand, step: base.step, atk: base.atk };
    else if (BOSSES[lookKey]) { const f = BOSSES[lookKey](); r = { stand: f[0], step: f[1] || f[0], atk: f[2] || f[0] }; }
    else { const s = HAND_BODY[lookKey] ? HAND_BODY[lookKey]() : autoDoll(lookKey); r = { stand: s, step: s, atk: s }; }
  }
  r.h = heightOf(r.stand); r.k = PX_K;
  CACHE.set(key, r); return r;
}
function heightOf(s) { for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) if (s.d[y * s.w + x] !== -1) return s.oy - y; return 0; }
const FLIP = new WeakMap();
export function pxFlip(spr) { let f = FLIP.get(spr); if (!f) { f = spr.flipped(); FLIP.set(spr, f); } return f; }
export const pxKeys = () => Object.keys(LOOKS);
// 비교용: 종이 그림을 그대로 구운 옛 판
const AUTO = new Map();
export const pxAuto = k => { let s = AUTO.get(k); if (!s) AUTO.set(k, s = autoDoll(k)); return s; };
export const pxHandBody = k => !!(BOSSES[k] || HAND_BODY[k]);
export const pxIsHand = key => isHand(LOOKS[key]);
