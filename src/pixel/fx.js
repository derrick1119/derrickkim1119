// 도트 전투 효과: 불티·흙먼지·베기·화살·불덩이·벼락·고리·표시 원·상태 표시·체력 띠를 2배 격자에 또렷하게 찍는다
// 모든 좌표는 화면 픽셀(1280×720)로 받아 도트 칸(640×360)으로 반올림한다. 자주 쓰는 모양은 한 번 구워 둔다
import { Spr, INK as PINK, bayer, mixc, lum } from './px.js';
import { text, FONT_B, PAPER, INK, RED } from '../render/draw.js';
import { pxUnit, pxFlip } from './units.js';
import { lowres } from './paper.js';
import { inkGlyph } from '../render/symbols.js';

const TAU = Math.PI * 2;
export const LX = v => Math.round(v / 2);
// '#rrggbb' · 'rgba(r,g,b,a)' · 정수 → 정수 색
export function toInt(c) {
  if (typeof c === 'number') return c;
  if (!c) return 0xffffff;
  if (c[0] === '#') { if (c.length === 4) return parseInt(c[1] + c[1] + c[2] + c[2] + c[3] + c[3], 16); return parseInt(c.slice(1, 7), 16); }
  const m = /rgba?\(([^)]+)\)/.exec(c); if (m) { const [r, g, b] = m[1].split(',').map(Number); return (r << 16) | (g << 8) | b; }
  return 0xffffff;
}
const css = c => '#' + (c >>> 0).toString(16).padStart(6, '0');
const ICOL = 0x1b1425, CREAM = 0xfbf3df;
// 도트 칸 하나 단위로 네모 칠하기
export function rect(g, X, Y, w, h, col) { g.fillStyle = typeof col === 'number' ? css(col) : col; g.fillRect(X * 2, Y * 2, w * 2, h * 2); }
// 구운 그림을 도트 칸 (X, Y) 에 기준점을 맞춰 찍는다
export function blit(g, s, X, Y) { g.drawImage(s.canvas(), (X - s.ox) * 2, (Y - s.oy) * 2, s.w * 2, s.h * 2); }
const CACHE = new Map();
function baked(key, fn) { let s = CACHE.get(key); if (!s) { if (CACHE.size > 900) CACHE.clear(); s = fn(); CACHE.set(key, s); } return s; }
// 브레젠험 선: 도트 칸 좌표, th = 굵기(칸)
export function line(g, X0, Y0, X1, Y1, col, th = 1) {
  g.fillStyle = typeof col === 'number' ? css(col) : col; X0 |= 0; Y0 |= 0; X1 |= 0; Y1 |= 0;
  const dx = Math.abs(X1 - X0), dy = -Math.abs(Y1 - Y0), sx = X0 < X1 ? 1 : -1, sy = Y0 < Y1 ? 1 : -1, o = (th - 1) >> 1; let e = dx + dy, n = 0;
  for (;;) { g.fillRect((X0 - o) * 2, (Y0 - o) * 2, th * 2, th * 2); if ((X0 === X1 && Y0 === Y1) || ++n > 2000) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; X0 += sx; } if (e2 <= dx) { e += dx; Y0 += sy; } }
}
// 꺾인 선 (화면 좌표 목록 [x0, y0, x1, y1, …])
export function polyline(g, pts, col, th = 1) { for (let i = 0; i + 3 < pts.length; i += 2) line(g, LX(pts[i]), LX(pts[i + 1]), LX(pts[i + 2]), LX(pts[i + 3]), col, th); }

// ── 타원: 테두리 점(각도 순)과 속을 채운 판 ──
const RING = new Map();
function ringPts(rx, ry) {
  rx = Math.max(1, rx | 0); ry = Math.max(1, ry | 0); const key = rx + ':' + ry; let p = RING.get(key); if (p) return p;
  const inside = (x, y) => (x * x) / (rx * rx + rx * 0.8) + (y * y) / (ry * ry + ry * 0.8) <= 1; p = [];
  for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) if (inside(x, y) && (!inside(x + 1, y) || !inside(x - 1, y) || !inside(x, y + 1) || !inside(x, y - 1))) p.push([x, y, Math.atan2(y / ry, x / rx)]);
  p.sort((a, b) => a[2] - b[2]); if (RING.size > 400) RING.clear(); RING.set(key, p); return p;
}
// 테두리 고리: dash = [켜짐, 꺼짐] (점 개수), off = 흐름, sweep/a0 = 트인 고리
export function ring(g, cx, cy, rx, ry, col, o = {}) {
  const P = ringPts(rx, ry), X = LX(cx), Y = LX(cy), n = P.length, d = o.dash, per = d ? d[0] + d[1] : 0, off = o.off || 0;
  g.fillStyle = typeof col === 'number' ? css(col) : col;
  for (let i = 0; i < n; i++) {
    const [x, y, a] = P[i];
    if (d && ((i + Math.floor(off)) % per + per) % per >= d[0]) continue;
    if (o.sweep !== undefined) { let r = (a - o.a0) % TAU; if (r < 0) r += TAU; if (r > o.sweep) continue; }
    g.fillRect((X + x) * 2, (Y + y) * 2, 2, 2);
  }
}
// 속이 찬 타원 판: pat = 'solid' | 'check'(반반 체크) | 'dot'(성긴 점)
export function disc(rx, ry, col, pat = 'solid') {
  rx = Math.max(1, Math.round(rx)); ry = Math.max(1, Math.round(ry));
  return baked('d' + rx + ':' + ry + ':' + col + pat, () => {
    const s = new Spr(rx * 2 + 1, ry * 2 + 1, rx, ry);
    for (let y = -ry; y <= ry; y++) { const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry + ry * 0.8)))); for (let x = -hw; x <= hw; x++) { const X = x + rx, Y = y + ry; if (pat === 'check' && (X + Y) & 1) continue; if (pat === 'dot' && bayer(X, Y) > 0.26) continue; s.set(X, Y, col); } }
    return s;
  });
}
export function fillEll(g, cx, cy, rx, ry, col, pat = 'solid') { blit(g, disc(LX(rx), LX(ry), toInt(col), pat), LX(cx), LX(cy)); }

// ── 숫자 글꼴 (5×7): 피해 숫자·표시 원의 '!' ──
const GLY = {
  0: ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'], 1: ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'], 2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  3: ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'], 4: ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'], 5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  6: ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'], 7: ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'], 8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  9: ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'], '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'], '-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
  x: ['.....', '.....', '#...#', '.#.#.', '..#..', '.#.#.', '#...#'], '×': ['.....', '.....', '#...#', '.#.#.', '..#..', '.#.#.', '#...#'], '%': ['##..#', '##.#.', '...#.', '..#..', '.#...', '.#.##', '#..##'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'], '!': ['.##', '.##', '.##', '.##', '.##', '...', '.##'], ' ': ['...', '...', '...', '...', '...', '...', '...'],
};
export const isNumText = s => /^[0-9+\-x×%.! ]+$/.test(s);
// 글씨 한 줄을 구운 판으로 (속 색 + 먹 테 + 오른쪽 아래 그림자)
export function numSpr(s, fill, edge = ICOL, sc = 1) {
  return baked('n' + s + ':' + fill + ':' + edge + ':' + sc, () => {
    const gs = [...s].map(ch => GLY[ch] || GLY[' ']), w = gs.reduce((a, q) => a + q[0].length + 1, -1) * sc, h = 7 * sc, t = new Spr(w + 4, h + 4, 0, 0);
    let x0 = 2; for (const q of gs) { for (let y = 0; y < 7; y++) for (let x = 0; x < q[y].length; x++) if (q[y][x] === '#') t.rect(x0 + x * sc, 2 + y * sc, sc, sc, fill); x0 += (q[0].length + 1) * sc; }
    for (let y = 0; y < t.h; y++) for (let x = 0; x < t.w; x++) if (t.get(x, y) === fill) t.set(x, y + 1, t.get(x, y + 1) === fill ? fill : mixc(fill, 0x000000, 0.45));   // 아래 두께
    const o = t.outline(edge); o.ox = Math.round(o.w / 2); o.oy = Math.round(o.h / 2); return o;
  });
}

// ── 구운 작은 그림들 ──
const SPARK = () => baked('spark', () => { const s = new Spr(5, 5, 2, 2); s.set(2, 0, 0xfff6c8); s.set(2, 4, 0xfff6c8); s.set(0, 2, 0xfff6c8); s.set(4, 2, 0xfff6c8); s.rect(1, 1, 3, 3, 0xffe890); s.set(2, 2, 0xffffff); return s; });
function starSpr(col) { return baked('st' + col, () => { const s = new Spr(7, 7, 3, 3); for (const [x, y] of [[3, 0], [3, 1], [0, 3], [1, 3], [5, 3], [6, 3], [3, 5], [3, 6], [2, 2], [4, 2], [2, 4], [4, 4]]) s.set(x, y, col); s.rect(2, 3, 3, 1, col); s.rect(3, 2, 1, 3, col); s.set(3, 3, 0xffffff); return s.outline(ICOL); }); }
function plusSpr(col) { return baked('pl' + col, () => { const s = new Spr(7, 7, 3, 3); s.rect(2, 0, 3, 7, col); s.rect(0, 2, 7, 3, col); s.rect(3, 1, 1, 5, mixc(col, 0xffffff, 0.45)); s.rect(1, 3, 5, 1, mixc(col, 0xffffff, 0.45)); return s.outline(ICOL); }); }
function flameSpr(f) { return baked('fl' + f, () => { const s = new Spr(7, 10, 3, 9), O = 0xff9a2e, Y = 0xffd860, R = 0xd8442c; const rows = f ? [[3, 3], [2, 3], [2, 4], [1, 4], [1, 5], [1, 5], [1, 5], [1, 5], [2, 4]] : [[3, 3], [3, 4], [2, 4], [2, 4], [1, 5], [1, 5], [1, 5], [1, 5], [2, 4]]; rows.forEach(([a, b], i) => s.hl(a, b, i, i < 2 ? Y : i < 5 ? O : R)); s.vl(3, 4, 7, Y); s.set(3, 8, 0xfff6c8); return s.outline(ICOL); }); }
function sealSpr() { return baked('seal', () => { const s = new Spr(14, 14, 7, 7), R = 0xb02a24, C = 0xf3dfc8; s.rect(0, 0, 14, 14, R); for (const [x, y] of [[0, 0], [13, 0], [0, 13], [13, 13], [5, 0], [13, 6], [8, 13], [0, 9]]) s.set(x, y, -1); s.hl(2, 11, 2, C); s.hl(2, 11, 11, C); s.vl(2, 2, 11, C); s.vl(11, 2, 11, C); s.set(6, 2, R); s.set(11, 8, R); // 불꽃 무늬
  for (const [x, y] of [[7, 4], [6, 5], [7, 5], [6, 6], [7, 6], [8, 6], [5, 7], [6, 7], [8, 7], [5, 8], [6, 8], [7, 8], [8, 8], [6, 9], [7, 9]]) s.set(x, y, C); return s; }); }
function ballSpr(r, col, hi) { return baked('b' + r + col, () => { const s = new Spr(r * 2 + 1, r * 2 + 1, r, r); for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) s.set(x + r, y + r, (x + 1) * (x + 1) + (y + 1) * (y + 1) <= (r * 0.45) ** 2 ? hi : x + y > r * 0.6 ? mixc(col, 0x201830, 0.35) : col); return s.outline(ICOL); }); }
// 흙먼지 덩이: 가운데가 짙고 가장자리는 점 무늬로 풀린다
function puffSpr(r, col) { return baked('pf' + r + ':' + col, () => { const s = new Spr(r * 2 + 1, r * 2 + 1, r, r), hi = mixc(col, 0xffffff, 0.35), lo = mixc(col, 0x403020, 0.25); for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) { const d = Math.sqrt(x * x + y * y * 1.3) / r; if (d > 1) continue; if (d > 0.62 && bayer(x + r, y + r) > (1 - d) * 2.4) continue; s.set(x + r, y + r, y < -r * 0.25 && d < 0.75 ? hi : y > r * 0.3 ? lo : col); } return s; }); }
// 둥근 빛: 세 겹의 동심 원 (더해 그린다)
function glowSpr(r, col) { return baked('gl' + r + ':' + col, () => { const s = new Spr(r * 2 + 1, r * 2 + 1, r, r); for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) { const d = Math.sqrt(x * x + y * y) / r; if (d > 1) continue; if (d > 0.66) { if ((x + y) & 1) s.set(x + r, y + r, mixc(col, 0, 0.55)); } else if (d > 0.36) s.set(x + r, y + r, mixc(col, 0, 0.3)); else s.set(x + r, y + r, col); } return s; }); }
export function glowPx(g, x, y, r, col, a = 1) { if (a <= 0.02 || r < 2) return; const q = Math.min(48, Math.round(r / 2)), op = g.globalCompositeOperation, ga = g.globalAlpha; g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.min(1, a) * ga; blit(g, glowSpr(q, toInt(col)), LX(x), LX(y)); g.globalCompositeOperation = op; g.globalAlpha = ga; }

// 베기: 흰 심지에 금빛(또는 색) 테를 두른 초승달 (각도는 16 갈래로 나눠 굽는다)
function slashSpr(len, ang, flip, col) {
  const L = Math.max(8, Math.min(40, Math.round(len / 2 / 4) * 4)), A = ((Math.round(ang / TAU * 16) % 16) + 16) % 16, ck = toInt(col), dark = lum(ck) < 0.3, edge = dark ? 0xf0c860 : ck;
  return baked('sl' + L + ':' + A + ':' + flip + ':' + edge, () => {
    const R = L * 0.62, W = Math.ceil(L * 1.2) + 6, s = new Spr(W, W, W >> 1, W >> 1), a0 = A / 16 * TAU, cx = W >> 1, cy = W >> 1;
    const N = Math.ceil(R * 2.4); for (let i = 0; i <= N; i++) { const t = i / N, an = a0 + (t - 0.5) * 2.1 * flip, th = Math.sin(t * Math.PI) * Math.max(1.5, L * 0.12), ox = Math.cos(a0) * R * -0.55, oy = Math.sin(a0) * R * -0.55;
      for (let d = 0; d <= th; d += 0.5) { const rr = R - d, x = Math.round(cx + ox + Math.cos(an) * rr), y = Math.round(cy + oy + Math.sin(an) * rr); s.set(x, y, d < th * 0.45 ? 0xffffff : edge); } }
    return s.outline(ICOL);
  });
}
// 화살 한 개 (도트 칸 좌표, 각도): 쇠 촉 · 나무 살 · 흰 깃 (앞뒤에 바람 점)
export function arrow(g, X, Y, a, len = 11, o = {}) {
  const c = Math.cos(a), s = Math.sin(a), nx = -s, ny = c, pt = (d, w) => [Math.round(X - c * d + nx * w), Math.round(Y - s * d + ny * w)];
  if (o.trail !== false) for (let i = 0; i < 3; i++) { const [x, y] = pt(len + 4 + i * 4, 0); rect(g, x, y, 1, 1, `rgba(255,250,236,${0.5 - i * 0.15})`); }
  for (let d = 0; d <= len; d++) { const [x, y] = pt(d, 0); rect(g, x, y, 1, 1, d < 2 ? '#e4e8ea' : '#b8844a'); }
  { const [x, y] = pt(-1, 0); rect(g, x, y, 1, 1, '#ffffff'); }
  for (const w of [-1, 1]) for (let d = len - 2; d <= len; d++) { const [x, y] = pt(d, w); rect(g, x, y, 1, 1, o.fire ? '#ff9a2e' : d === len ? '#c8402f' : '#fbf7ec'); }
  if (o.fire) { const f = Math.floor(o.T * 18) % 2; for (let i = 0; i < 3; i++) { const [x, y] = pt(-1 - i, (i + f) % 2 ? 1 : -1); rect(g, x, y, 1, 1, i ? '#ff9a2e' : '#ffd860'); } }
}
// 번개: 금빛 몸에 흰 심지, 먹 테 (도트 칸 좌표 꺾은 선)
function boltLine(g, pts, w0, w1, al) {
  const n = pts.length / 2, seg = (i, th, col) => line(g, LX(pts[i * 2]), LX(pts[i * 2 + 1]), LX(pts[i * 2 + 2]), LX(pts[i * 2 + 3]), col, th);
  for (let i = 0; i < n - 1; i++) { const th = Math.max(1, Math.round(w0 + (w1 - w0) * i / (n - 1))); seg(i, th + 2, ICOL); }
  for (let i = 0; i < n - 1; i++) { const th = Math.max(1, Math.round(w0 + (w1 - w0) * i / (n - 1))); seg(i, th, '#f0d264'); if (th > 1) seg(i, Math.max(1, th - 2), '#fffbe6'); }
}
const easeOut = t => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

// ── 효과 한 겹 (Fx.drawLayer 의 도트판) ──
export function pxLayer(fx, g, ground, nums = true) {
  const P = fx.p, list = ground ? P : P.filter(q => q.k !== 'text').concat(P.filter(q => q.k === 'text' && !q.big && !(nums === false && q.num)), P.filter(q => q.big));
  g.save(); g.imageSmoothingEnabled = false;
  for (const p of list) {
    if (!!p.ground !== ground) continue;
    const k = p.t / p.life, a = 1 - k, X = LX(p.x), Y = LX(p.y);
    switch (p.k) {
      case 'dot': { g.globalAlpha = Math.min(1, a * 2); const c = toInt(p.col), sz = p.size > 3.2 ? 2 : 1; rect(g, X, Y, sz, sz, c); rect(g, LX(p.x - (p.vx || 0) * 0.025), LX(p.y - (p.vy || 0) * 0.025), 1, 1, mixc(c, 0x201830, 0.4)); break; }
      case 'puff': { const r = Math.max(2, Math.round(p.size * (0.7 + easeOut(k) * 1.1) / 2)); g.globalAlpha = Math.min(1, a * 1.4) * 0.85; blit(g, puffSpr(Math.min(24, r), toInt(p.col)), X, Y); break; }
      case 'flare': { const e = easeOut(k * 2.4), al = k < 0.2 ? 1 : 1 - (k - 0.2) / 0.8; g.globalAlpha = 1; glowPx(g, p.x, p.y, p.size * (0.6 + e * 0.7), p.col, al * 0.5); break; }
      case 'seal': { g.globalAlpha = (k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4) * 0.95; const s = sealSpr(); if (k < 0.1) { const c = s.canvas(); g.drawImage(c, (X - 10) * 2, (Y - 10) * 2, 40, 40); } else blit(g, s, X, Y); break; }
      case 'flake': case 'chip': case 'scrap': { g.globalAlpha = Math.min(1, a * 2.5); const c = toInt(p.col), f = Math.cos(p.t * 11 + (p.sway || p.rot || 0)), xx = p.k === 'flake' ? X + Math.round(Math.sin(p.t * 6 + (p.sway || 0)) * 1.5) : X, big = (p.size || 4) > 5.5;
        if (Math.abs(f) < 0.35) rect(g, xx, Y, big ? 3 : 2, 1, mixc(c, 0x302018, 0.35)); else if (f > 0) { rect(g, xx, Y, big ? 3 : 2, 2, c); rect(g, xx, Y + 2, big ? 3 : 2, 1, mixc(c, 0x302018, 0.4)); } else { rect(g, xx, Y, 2, big ? 3 : 2, mixc(c, 0x806040, 0.25)); rect(g, xx + 2, Y, 1, big ? 3 : 2, mixc(c, 0x302018, 0.45)); }
        break; }
      case 'star': break;
      case 'ring': { const e = easeOut(k), rx = Math.max(3, LX(p.r * (0.25 + e * 0.75))), ry = Math.max(2, Math.round(rx * 0.5)), c = toInt(p.col), dark = lum(c) < 0.3; g.globalAlpha = Math.min(1, a * 1.5) * 0.9;
        ring(g, p.x, p.y, rx + 1, ry + 1, dark ? ICOL : mixc(c, 0x201830, 0.4), { sweep: TAU * 0.88, a0: p.a0 }); ring(g, p.x, p.y, rx, ry, dark ? '#f0d8a0' : c, { sweep: TAU * 0.88, a0: p.a0 }); if (p.lw > 5) ring(g, p.x, p.y, rx - 1, Math.max(1, ry - 1), dark ? '#f0d8a0' : c, { sweep: TAU * 0.88, a0: p.a0 }); break; }
      case 'text': {
        const al = p.big ? Math.min(1, a * p.life / 0.3) : Math.min(1, a * 2.5); g.globalAlpha = al;
        if (p.big) { g.font = `400 24px ${FONT_B}`; const w = Math.ceil((g.measureText(p.s).width + 30) / 2), x = Math.max(w + 4, Math.min(636 - w, X)), y = Y; plaque(g, x - w, y - 10, w * 2, 19, toInt(p.col)); if (p.tail) { const ty = p.tail > 0 ? y + 9 : y - 11; for (let i = 0; i < 4; i++) rect(g, x - 3 + i, ty + (p.tail > 0 ? i : -i), 7 - i * 2, 1, i === 0 ? '#fbf3df' : css(toInt(p.col))); } text(g, p.s, x * 2, y * 2, { size: 24, fill: p.col, font: FONT_B }); break; }
        if (isNumText(p.s)) { const c = toInt(p.col), fill = lum(c) < 0.3 ? 0xffffff : c, edge = lum(c) < 0.3 ? 0x8a1c30 : ICOL, pop = k < 0.12 ? -2 : 0; blit(g, numSpr(p.s, fill, edge, (p.size || 20) >= 26 ? 2 : 1), X, Y + pop); }
        else text(g, p.s, p.x, p.y, { size: p.size * (k < 0.15 ? 0.6 + k / 0.15 * 0.5 : 1.1 - Math.min(0.1, k - 0.15)), fill: p.col, font: FONT_B, stroke: PAPER, lw: 5 });
        break; }
      case 'beam': { g.globalAlpha = a; const th = Math.max(1, Math.round(p.lw / 2)), X1 = LX(p.x1), Y1 = LX(p.y1); line(g, X, Y, X1, Y1, ICOL, th + 2); line(g, X, Y, X1, Y1, p.col, th); if (th > 1) line(g, X, Y, X1, Y1, '#fffaf0', 1); break; }
      case 'arrow': { const e = k * k, yy = p.y - (1 - e) * 260, xx = p.x - (1 - e) * 60; g.globalAlpha = Math.min(1, k * 4); arrow(g, LX(xx), LX(yy), Math.atan2(260, 60), 11); break; }
      case 'stuck': { g.globalAlpha = a; arrow(g, X, Y, Math.atan2(15, 4), 7, { trail: false }); break; }
      case 'plus': { g.globalAlpha = Math.min(1, a * 2); const c = toInt(p.col || '#5fae6a'); glowPx(g, p.x, p.y, p.size * 3.2, c, a * 0.5); blit(g, plusSpr(c), X, Y); break; }
      case 'sprite': { if (!p.pxk) break; let s; try { s = pxUnit(p.pxk).stand; } catch (e) { break; } if (p.sx < 0) s = pxFlip(s); g.globalAlpha = a * a; g.drawImage(s.canvas(), (X - s.ox) * 2, (Y - s.oy - Math.round(k * 6)) * 2, s.w * 2, s.h * 2); g.globalAlpha = a * a * 0.6; blit(g, tintW(s), X, Y - Math.round(k * 6)); break; }
      case 'fall': { const h = (1 - k) * (1 - k) * 520, xx = p.x + h * 0.35, yy = p.y - h, sz = Math.max(4, Math.round(p.size / 2)); g.globalAlpha = 0.25 + k * 0.3; fillEll(g, p.x, p.y, p.size * (0.6 + k), p.size * (0.6 + k) * 0.45, ICOL, 'check'); g.globalAlpha = 1;
        for (let i = 1; i < 6; i++) { const t2 = i * 0.045; rect(g, LX(xx + i * 12 * 0.35 * 1.6), LX(yy - i * 12 * 1.6) , Math.max(1, 3 - (i >> 1)), Math.max(1, 3 - (i >> 1)), i < 3 ? '#ffd860' : i < 5 ? '#ff9a2e' : '#c8402f'); }
        glowPx(g, xx, yy, p.size * 3, '#ff9a2e', 0.55); blit(g, ballSpr(sz, 0xff9a2e, 0xfff6c8), LX(xx), LX(yy)); break; }
      case 'slash': { g.globalAlpha = Math.min(1, a * 1.8); blit(g, slashSpr(p.len * (0.55 + Math.min(1, k * 3.4) * 0.45), p.ang, p.flip || 1, p.col), X, Y); break; }
      case 'ink': inkPx(g, p, k); break;
      case 'glyph': { const q = Math.min(1, k / 0.13), sc = 1.6 - 0.6 * (1 - Math.pow(1 - q, 3)), al = k > 0.68 ? (1 - k) / 0.32 : Math.min(1, q * 1.6); g.globalAlpha = 1; lowres(g, l => { inkGlyph(l, p.ch, p.x, p.y, p.size * sc, { col: p.col, alpha: al * (p.peak || 1), rot: p.rot === undefined ? -0.06 : p.rot, halo: p.halo }); }); g.imageSmoothingEnabled = false; break; }
      case 'bolt': { const al = k < 0.12 ? 1 : Math.max(0, 1 - (k - 0.12) / 0.88) * (Math.sin(p.t * 70) > -0.3 ? 1 : 0.55); g.globalAlpha = al; for (const br of p.br || []) boltLine(g, br, 1, 1, al); boltLine(g, p.pts, 5, 1, al); if (k < 0.16) { glowPx(g, p.x, p.y, 70, '#fff0b0', (0.16 - k) / 0.16 * 0.8); g.globalAlpha = al; fillEll(g, p.x, p.y, 26 * (1 - k * 3), 9 * (1 - k * 3), '#fff8d6'); } break; }
      case 'arc': { const h = Math.sin(k * Math.PI) * p.h; g.globalAlpha = 1; blit(g, ballSpr(Math.max(2, Math.round(p.size / 2)), toInt(p.col), 0xffffff), LX(p.x + (p.x1 - p.x) * k), LX(p.y + (p.y1 - p.y) * k - h)); break; }
    }
  }
  g.restore();
}
const TW = new WeakMap();
function tintW(s) { let t = TW.get(s); if (!t) { t = new Spr(s.w, s.h, s.ox, s.oy); for (let i = 0; i < s.d.length; i++) if (s.d[i] !== -1) t.d[i] = 0xffffff; TW.set(s, t); } return t; }
// 먹 그림(튀는 먹물·번진 자국·고리·붓 휘두름)의 도트판
function blobSpr(r, col, seed) { return baked('bl' + r + ':' + col + ':' + seed, () => { const W = r * 4 + 3, s = new Spr(W, W, W >> 1, W >> 1); let st = seed * 9301 + 49297; const R = () => ((st = (st * 9301 + 49297) % 233280) / 233280); const blobs = [[0, 0, r]]; for (let i = 0; i < 4; i++) { const a = R() * TAU, d = r * (0.5 + R() * 0.6); blobs.push([Math.cos(a) * d, Math.sin(a) * d * 0.8, r * (0.35 + R() * 0.3)]); } for (let i = 0; i < 5; i++) { const a = R() * TAU, d = r * (1.3 + R() * 0.6); blobs.push([Math.cos(a) * d, Math.sin(a) * d * 0.8, 0.8 + R() * 0.8]); }
  for (const [bx, by, br] of blobs) for (let y = -Math.ceil(br); y <= br; y++) for (let x = -Math.ceil(br); x <= br; x++) if (x * x + y * y <= br * br + 0.5) s.set(Math.round((W >> 1) + bx + x), Math.round((W >> 1) + by + y), col); return s; }); }
function inkPx(g, p, k) {
  const kin = p.in || 0.12, al = (k < kin ? k / kin : Math.pow(1 - (k - kin) / (1 - kin), p.pow || 1.4)) * (p.peak || 1), e = p.fast ? 1 - Math.pow(1 - Math.min(1, k * 6), 3) : 1 - Math.pow(1 - k, 3), s = p.s + (p.s1 - p.s) * e, c = toInt(p.col || '#17151c'), X = LX(p.x), Y = LX(p.y);
  g.globalAlpha = Math.min(1, al);
  if (p.kind === 'splat') blit(g, blobSpr(Math.max(1, Math.min(20, Math.round(s * 12))), c, p.v || 0), X, Y);
  else if (p.kind === 'wash') blit(g, disc(Math.max(2, Math.round(s * 34 * Math.abs(p.sx || 1))), Math.max(1, Math.round(s * 20)), c, 'check'), X, Y);
  else if (p.kind === 'enso') { const rx = Math.max(3, Math.round(s * 46 * Math.abs(p.sx || 1))), ry = Math.max(2, Math.round(s * 28)); ring(g, p.x, p.y, rx + 1, ry + 1, ICOL); ring(g, p.x, p.y, rx, ry, c === 0x17151c ? '#f0d8a0' : css(c)); }
  else blit(g, slashSpr(s * 120, p.rot || 0, 1, css(c)), X, Y);   // swash 따위: 크게 휘두른 초승달
}
// 한지 꼬리표 판 (도트 칸 좌표): 크림 바탕, 먹 테, 안쪽 색 테
export function plaque(g, X, Y, w, h, col) {
  rect(g, X + 1, Y + 1, w, h, 'rgba(20,14,24,0.35)'); rect(g, X, Y, w, h, ICOL); rect(g, X + 1, Y + 1, w - 2, h - 2, CREAM); rect(g, X + 1, Y + h - 2, w - 2, 1, 0xe4d2a8);
  rect(g, X + 1, Y + 1, w - 2, 1, col); rect(g, X + 1, Y + 1, 1, h - 2, col); rect(g, X + w - 2, Y + 1, 1, h - 2, col); rect(g, X + 1, Y + h - 2, w - 2, 1, col);
}
// 화면 좌표로 받는 꼬리표 (글씨 크기 17)
export function tagPx(g, x, y, s, col) { g.font = `400 17px ${FONT_B}`; const w = Math.ceil((g.measureText(s).width + 22) / 2), X = LX(x) - (w >> 1), Y = LX(y) - 7; plaque(g, X, Y, w, 14, toInt(col)); text(g, s, X * 2 + w, Y * 2 + 15, { size: 17, font: FONT_B, fill: col }); }

// ── 띠: 체력 · 기력 (도트 칸) ──
export function barPx(g, x, y, w, k, col, o = {}) {
  const X = LX(x), Y = LX(y), W = Math.max(6, Math.round(w / 2)), h = o.h || 2, f = Math.round((W - 2) * Math.max(0, Math.min(1, k)));
  rect(g, X - 1, Y - 1, W + 2, h + 2, ICOL); rect(g, X, Y, W, h, o.back || 0x3a2e44); if (f > 0) { rect(g, X, Y, f, h, col); rect(g, X, Y, f, 1, mixc(toInt(col), 0xffffff, 0.4)); }
  if (o.ready) rect(g, X, Y, W, h, 'rgba(255,243,176,0.55)');
}

// ── 표시 원 (두목의 수 · 우리 편 수) ──
export function telePx(g, z, col, T) {
  const k = Math.max(0, Math.min(1, z.t / z.delay)), r = Math.max(4, LX(z.r)), c = toInt(col), X = LX(z.x), Y = LX(z.y);
  const a0 = g.globalAlpha; g.globalAlpha = a0 * 0.5; blit(g, disc(r, r, c, 'dot'), X, Y);
  if (k > 0.05) { g.globalAlpha = a0 * 0.32; blit(g, disc(Math.max(1, Math.round(r * k)), Math.max(1, Math.round(r * k)), c, 'solid'), X, Y); }
  g.globalAlpha = a0; ring(g, z.x, z.y, r + 1, r + 1, ICOL); ring(g, z.x, z.y, r, r, c, { dash: [7, 4], off: -T * 22 }); ring(g, z.x, z.y, r - 1, r - 1, c, { dash: [7, 4], off: -T * 22 });
  if (z.ally) { for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + T * 1.5; line(g, X + Math.round(Math.cos(a) * r * 0.25), Y + Math.round(Math.sin(a) * r * 0.25), X + Math.round(Math.cos(a) * r * 0.55), Y + Math.round(Math.sin(a) * r * 0.55), c, 2); } blit(g, disc(2, 2, c), X, Y); }
  else { const bob = Math.sin(T * 14) > 0 ? -1 : 0; blit(g, numSpr('!', c, CREAM, 3), X, Y + bob); }
}

// ── 휘두름: 치는 그림으로 바뀐 순간 무기 쪽에 남는 자국 ──
export function swingPx(g, mode, x, y, dir, ap, h, team, a) {
  const X = LX(x), Y = LX(y), hy = Y - Math.round(h * 0.45);
  if (mode === 'slash' || mode === 'bite') { if (ap < 0.25 || ap > 0.8) return; const q = (ap - 0.25) / 0.55; g.globalAlpha = a * (q < 0.3 ? 1 : 1 - (q - 0.3) / 0.7); blit(g, slashSpr(mode === 'bite' ? 38 : 50, dir > 0 ? 0.1 : Math.PI - 0.1, dir, team === 0 ? '#f0c860' : '#e4826a'), X + dir * 9, hy); }
  else if (mode === 'thrust') { if (ap > 0.55) return; const q = ap / 0.55; g.globalAlpha = a * (1 - q); const x0 = X + dir * 10, L = 6 + Math.round(10 * Math.min(1, q * 3)); rect(g, dir > 0 ? x0 : x0 - L, hy + 2, L, 1, '#fffbe6'); rect(g, dir > 0 ? x0 + 2 : x0 - L + 2, hy + 1, L - 4, 1, 'rgba(255,251,230,0.5)'); rect(g, dir > 0 ? x0 + 2 : x0 - L + 2, hy + 3, L - 4, 1, 'rgba(255,251,230,0.5)'); }
  else if (mode === 'shoot') { if (ap > 0.3) return; g.globalAlpha = a * (1 - ap / 0.3); blit(g, SPARK(), X + dir * 12, hy); }
  else if (mode === 'cast') { if (ap > 0.7) return; g.globalAlpha = a * Math.sin(ap / 0.7 * Math.PI); blit(g, starSpr(0xfff0a0), X + dir * 8, hy - 8 - Math.round(ap * 6)); }
  g.globalAlpha = a;
}
export { starSpr, plusSpr, flameSpr, SPARK, ballSpr, glowSpr, ICOL, CREAM };
