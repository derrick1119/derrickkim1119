// 도트 화면 띠·판·단추·패 (화면 1280×720 위에 2픽셀 격자로 찍는다 = 도트 640×360)
// 시안(mockups/pixel/src/scenes.js)의 panel·button·card·hud·dancheong·coin 을 게임의 크기와 자리에 맞춘다
import { P, css, Spr } from './px.js';

export const H2 = v => Math.round(v / 2) * 2;   // 2픽셀 격자에 맞춘다
export const PC = (n, i = 2) => css(P[n][i]);
export const PINK = css(P.ink[1]), PINK0 = css(P.ink[0]);
// 색 섞기 (css #rrggbb 또는 rgba 는 그대로 둔다)
const toInt = c => (typeof c === 'number' ? c : /^#[0-9a-f]{6}$/i.test(c) ? parseInt(c.slice(1), 16) : null);
export function mix(a, b, k) { const x = toInt(a), y = toInt(b); if (x === null || y === null) return a; const r = ((x >> 16) & 255) * (1 - k) + ((y >> 16) & 255) * k, g = ((x >> 8) & 255) * (1 - k) + ((y >> 8) & 255) * k, bl = (x & 255) * (1 - k) + (y & 255) * k; return css((Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(bl)); }
export const lighten = (c, k = 0.3) => mix(c, '#fff6d8', k), darken = (c, k = 0.35) => mix(c, '#1b1425', k);

// 칸 하나 (격자에 맞춰)
export function F(g, x, y, w, h, col) { if (w <= 0 || h <= 0) return; const X = H2(x), Y = H2(y), X1 = H2(x + w), Y1 = H2(y + h); if (X1 <= X || Y1 <= Y) return; g.fillStyle = col; g.fillRect(X, Y, X1 - X, Y1 - Y); }
// 귀를 한 칸 깎은 네모 (먹 테두리용)
export function notch(g, x, y, w, h, col, d = 2) { F(g, x + d, y, w - d * 2, h, col); F(g, x, y + d, w, h - d * 2, col); }
// 기본 판: 먹 테 → 테 빛깔 → 안쪽. hi/lo = 안쪽 위아래의 빛·그늘 줄
export function box(g, x, y, w, h, o = {}) {
  const ink = o.ink || PINK, edge = o.edge, fill = o.fill || PC('cream', 3);
  if (o.shadow !== false) { g.save(); g.globalAlpha *= o.shadowA || 0.32; notch(g, x + 4, y + 6, w, h, '#0a0614'); g.restore(); }
  notch(g, x, y, w, h, ink);
  let i = 2; if (edge) { F(g, x + 2, y + 2, w - 4, h - 4, edge); i = 4; if (o.edge2) { F(g, x + 4, y + 4, w - 8, h - 8, o.edge2); i = 6; } }
  F(g, x + i, y + i, w - i * 2, h - i * 2, fill);
  if (o.hi) F(g, x + i, y + i, w - i * 2, 2, o.hi);
  if (o.lo) F(g, x + i, y + h - i - (o.loH || 2), w - i * 2, o.loH || 2, o.lo);
  if (o.studs) for (const [cx, cy] of [[x + 2, y + 2], [x + w - 6, y + 2], [x + 2, y + h - 6], [x + w - 6, y + h - 6]]) { F(g, cx, cy, 4, 4, o.studs); F(g, cx, cy, 2, 2, PC('gold', 4)); }
  return i;
}
// 단청 띠: 초록·붉은·금·쪽·흰 칸이 되풀이된다 (시안과 같은 무늬를 2배로)
export function dancheong(g, x, y, w, h = 8) {
  const cols = [PC('teal', 2), PC('red', 2), PC('gold', 3), PC('blue', 2), PC('white', 3), PC('red', 2)];
  F(g, x, y, w, h, PC('teal', 1));
  for (let i = 0; i * 12 < w; i++) { F(g, x + i * 12, y + 2, 8, h - 4, cols[i % cols.length]); F(g, x + i * 12 + 2, y + 2, 2, 2, PC('white', 4)); }
  F(g, x, y, w, 2, PINK); F(g, x, y + h - 2, w, 2, PINK);
}
// 금박 줄 (위 밝게)
export function giltLine(g, x, y, w) { F(g, x, y, w, 2, PC('gold', 3)); F(g, x, y + 2, w, 2, PC('gold', 1)); }

// ── 판 ──
export function panel(g, x, y, w, h, style) {
  if (style === 'tag') { box(g, x, y, w, h, { edge: PC('gold', 1), fill: PC('cream', 3), hi: PC('cream', 4), lo: PC('cream', 2), shadowA: 0.25 }); return; }
  if (style === 'hud') {
    F(g, x, y, w, h, PC('night', 1)); F(g, x, y, w, 2, PC('night', 3));
    for (let k = 4; k < w; k += 8) F(g, x + k, y + h - 12, 2, 2, PC('night', 2));
    dancheong(g, x, y + h - 4, w, 8); F(g, x, y + h + 4, w, 2, 'rgba(0,0,0,0.45)');
    return;
  }
  if (style === 'tray') {
    F(g, x, y, w, h, PC('night', 1)); dancheong(g, x, y - 2, w, 8); F(g, x, y + 6, w, 2, PC('night', 3));
    for (let k = 6; k < w; k += 8) F(g, x + k, y + h - 6, 2, 2, PC('night', 2));
    return;
  }
  const big = w > 400 && h > 200, mid = w > 120 && h > 80;
  if (style === 'navy') {
    box(g, x, y, w, h, { edge: mid ? PC('gold', 2) : PC('gold', 1), edge2: mid ? PC('night', 0) : null, fill: PC('night', 2), hi: PC('night', 3), lo: PC('night', 1), studs: mid ? PC('gold', 3) : null });
    return;
  }
  // 한지 판: 큰 것은 나무틀(밤빛)에 금줄을 두르고, 위 가운데에 매듭 장식
  if (big || mid) {
    const d = big ? 10 : 6;
    box(g, x - d, y - d, w + d * 2, h + d * 2, { edge: PC('wood', 2), edge2: PC('wood', 1), fill: PC('wood', 1), shadowA: 0.4 });
    F(g, x - d + 4, y - d + 4, w + d * 2 - 8, 2, PC('wood', 3));
    notch(g, x - 2, y - 2, w + 4, h + 4, PC('gold', 2)); F(g, x - 2, y - 2, w + 4, 2, PC('gold', 3));
    F(g, x, y, w, h, PINK); F(g, x + 2, y + 2, w - 4, h - 4, PC('cream', 3)); F(g, x + 2, y + 2, w - 4, 2, PC('cream', 4)); F(g, x + 2, y + h - 4, w - 4, 2, PC('cream', 2));
    // 안쪽 가는 금선과 귀 장식
    F(g, x + 8, y + 8, w - 16, 2, PC('gold', 2)); F(g, x + 8, y + h - 10, w - 16, 2, PC('gold', 2)); F(g, x + 8, y + 8, 2, h - 16, PC('gold', 2)); F(g, x + w - 10, y + 8, 2, h - 16, PC('gold', 2));
    for (const [cx, cy] of [[x - d, y - d], [x + w + d - 12, y - d], [x - d, y + h + d - 12], [x + w + d - 12, y + h + d - 12]]) { notch(g, cx, cy, 12, 12, PINK); F(g, cx + 2, cy + 2, 8, 8, PC('gold', 3)); F(g, cx + 2, cy + 2, 8, 2, PC('gold', 4)); F(g, cx + 4, cy + 4, 4, 4, PC('gold', 1)); }
    if (big) { const cx = x + w / 2; notch(g, cx - 30, y - d - 6, 60, 14, PINK); F(g, cx - 28, y - d - 4, 56, 10, PC('gold', 3)); F(g, cx - 28, y - d - 4, 56, 2, PC('gold', 4)); notch(g, cx - 8, y - d - 8, 16, 18, PINK); F(g, cx - 6, y - d - 6, 12, 14, PC('red', 2)); F(g, cx - 6, y - d - 6, 12, 2, PC('red', 3)); F(g, cx - 2, y - d - 2, 4, 4, PC('gold', 4)); }
    return;
  }
  box(g, x, y, w, h, { edge: PC('gold', 1), fill: PC('cream', 3), hi: PC('cream', 4), lo: PC('cream', 2) });
}

// ── 단추 ──  [빛깔 띠 이름, 글자색]
export const BTN = { indigo: ['blue'], red: ['red'], paper: ['cream'], teal: ['teal'], wood: ['wood'], navy: ['night'], grey: ['stone'] };
export function buttonFace(g, x, y, w, h, name, down) {
  const rp = (BTN[name] || BTN.indigo)[0], light = name === 'paper' || name === 'grey', off = down ? 4 : 0, yy = y + off;
  const c = i => PC(rp, light ? Math.min(4, i + 1) : i);
  g.save(); g.globalAlpha *= 0.32; notch(g, x + 2, y + 10, w, h, '#0a0614'); g.restore();
  notch(g, x, y + 6, w, h, PINK); F(g, x + 2, y + 6, w - 4, h - 2, light ? PC(rp, 1) : PC(rp, 0));   // 단추의 두께
  notch(g, x, yy, w, h, PINK);
  F(g, x + 2, yy + 2, w - 4, h - 4, c(2)); F(g, x + 2, yy + 2, w - 4, 4, c(3)); F(g, x + 4, yy + 2, w - 8, 2, c(4)); F(g, x + 2, yy + h - 8, w - 4, 6, c(1));
  if (w >= 200 && h >= 50) for (const sx of [x + 6, x + w - 12]) { F(g, sx, yy + h / 2 - 4, 6, 6, PC('gold', 3)); F(g, sx, yy + h / 2 - 4, 6, 2, PC('gold', 4)); }
  return { yy, light, ink: light ? PINK : PC('cream', 4), shadow: light ? null : PC(rp, 0) };
}
export function iconFace(g, x, y, w, h, on, down) {
  const off = down ? 2 : 0; notch(g, x, y + 4, w, h, PINK); F(g, x + 2, y + 4, w - 4, h - 2, PC('gold', 0));
  box(g, x, y + off, w, h, { shadow: false, edge: PC('gold', 1), fill: on ? PC('gold', 3) : PC('cream', 3), hi: on ? PC('gold', 4) : PC('cream', 4), lo: on ? PC('gold', 2) : PC('cream', 2) });
}
export function barFace(g, x, y, w, h, t, col, o = {}) {
  notch(g, x - 2, y - 2, w + 4, h + 4, PINK); F(g, x, y, w, h, o.back || PC('night', 1));
  const f = Math.max(0, Math.min(1, t)); if (f <= 0.005) return;
  const fw = H2(w * f), fx = o.right ? x + w - fw : x; F(g, fx, y, fw, h, col); F(g, fx, y, fw, 2, 'rgba(255,255,255,0.35)'); if (h >= 8) F(g, fx, y + h - 2, fw, 2, 'rgba(0,0,0,0.2)');
}
// 원판 (격자에 맞춘 줄들로)
export function disc(g, cx, cy, r, col) { g.fillStyle = col; const R = Math.max(1, Math.round(r / 2)), X = H2(cx), Y = H2(cy); for (let j = -R; j < R; j++) { const yy = j + 0.5, hw = Math.round(Math.sqrt(Math.max(0, R * R - yy * yy))); if (hw > 0) g.fillRect(X - hw * 2, Y + j * 2, hw * 4, 2); } }
export function ring(g, cx, cy, r, col, th = 2) { const R = Math.max(1, Math.round(r / 2)), X = H2(cx), Y = H2(cy), T = Math.max(1, Math.round(th / 2)); g.fillStyle = col; for (let j = -R; j < R; j++) { const yy = j + 0.5, ho = Math.round(Math.sqrt(Math.max(0, R * R - yy * yy))), hi = R - T > 0 ? Math.round(Math.sqrt(Math.max(0, (R - T) * (R - T) - yy * yy))) : 0; if (ho <= 0) continue; if (hi <= 0) g.fillRect(X - ho * 2, Y + j * 2, ho * 4, 2); else { g.fillRect(X - ho * 2, Y + j * 2, (ho - hi) * 2, 2); g.fillRect(X + hi * 2, Y + j * 2, (ho - hi) * 2, 2); } } }

// ── 엽전: 지름이 같으면 한 번 구운 것을 다시 쓴다 ──
const COIN = new Map();
function coinSpr(n, kind) {
  const key = n + kind; let s = COIN.get(key); if (s) return s;
  s = new Spr(n + 2, n + 2); const c = (n + 1) / 2, r = n / 2, on = kind !== 'off', green = kind === 'green';
  const body = green ? 0x9bd07a : on ? P.gold[3] : P.night[2], hi = green ? 0xd6f0c0 : on ? P.gold[4] : P.night[3], lo = green ? 0x4c9040 : on ? P.gold[1] : P.night[1];
  for (let y = 0; y < n + 2; y++) for (let x = 0; x < n + 2; x++) { const d = Math.hypot(x - c, y - c); if (d < r + 0.6) s.set(x, y, P.ink[1]); if (d < r - 0.45) { const a = Math.atan2(y - c, x - c); s.set(x, y, d > r - 1.6 && a > -2.8 && a < -1.2 ? hi : d > r - 1.6 && a > 0.4 && a < 1.9 ? lo : body); } }
  const h = Math.max(1, Math.round(n / 6)), q = Math.round(c - h / 2);
  if (n >= 9) for (let y = q - 1; y <= q + h; y++) for (let x = q - 1; x <= q + h; x++) s.set(x, y, on ? lo : P.ink[1]);
  for (let y = q; y < q + h; y++) for (let x = q; x < q + h; x++) s.set(x, y, on ? (green ? 0x2c5c30 : P.gold[0]) : P.ink[1]);
  if (on && n >= 11) { for (let a = -2.6; a < -1.6; a += 0.12) s.set(Math.round(c + Math.cos(a) * (r - 2.2)), Math.round(c + Math.sin(a) * (r - 2.2)), P.white[4]); }
  COIN.set(key, s); return s;
}
// r = 화면에서의 반지름 (원래 그림과 같은 뜻)
export function coin(g, x, y, r, kind = 'on') { const n = Math.max(5, Math.round(r) | 1), s = coinSpr(n, kind), c = s.canvas(); g.save(); g.imageSmoothingEnabled = false; g.drawImage(c, H2(x) - (s.w - 1), H2(y) - (s.h - 1), s.w * 2, s.h * 2); g.restore(); }

// ── 큰 제목 띠: 끝을 제비꼬리로 자른 띠 ──
export function ribbon(g, x, y, w, h, col) {
  const L = x - w / 2 - 20, Rt = x + w / 2 + 20, t = y - h / 2, hi = lighten(col, 0.28), lo = darken(col, 0.32), ink = PINK;
  g.save(); g.globalAlpha *= 0.3; F(g, L + 4, t + 8, Rt - L, h, '#0a0614'); g.restore();
  // 몸통 (먹 테) + 양 끝 제비꼬리
  F(g, L + 8, t, Rt - L - 16, h, ink);
  for (let k = 0; k < h; k += 2) { const e = Math.abs(k - h / 2 + 1) / (h / 2), cut = H2(14 - e * 14); F(g, L - 2 + cut, t + k, 12 - cut + 2, 2, ink); F(g, Rt - 12, t + k, 14 - cut, 2, ink); }
  F(g, L + 10, t + 2, Rt - L - 20, h - 4, col);
  for (let k = 2; k < h - 2; k += 2) { const e = Math.abs(k - h / 2 + 1) / (h / 2), cut = H2(14 - e * 14); F(g, L + cut, t + k, 10 - cut + 2, 2, darken(col, 0.18)); F(g, Rt - 10, t + k, 12 - cut, 2, darken(col, 0.18)); }
  F(g, L + 10, t + 2, Rt - L - 20, 4, hi); F(g, L + 10, t + h - 8, Rt - L - 20, 6, lo);
  F(g, L + 14, t + h - 12, Rt - L - 28, 2, PC('gold', 3));
  for (let i = 0; i < 18; i++) { const fx = L + 16 + ((i * 97) % (Rt - L - 32)), fy = t + 6 + ((i * 53) % Math.max(4, h - 16)); F(g, fx, fy, 2, 2, i % 3 ? 'rgba(255,240,190,0.35)' : 'rgba(255,255,255,0.25)'); }
}
// ── 나무 이름판 ──
export function plaqueFace(g, x, y, w, h, o = {}) {
  const d = o.down ? 4 : 0, yy = y + d;
  box(g, x, yy, w, h, { edge: PC('wood', 2), edge2: PC('wood', 1), fill: PC('wood', 1), shadowA: 0.4 });
  F(g, x + 6, yy + 6, w - 12, 2, PC('gold', 2)); F(g, x + 6, yy + h - 8, w - 12, 2, PC('gold', 1));
  for (const [sx, sy] of [[x + 6, yy + 6], [x + w - 12, yy + 6], [x + 6, yy + h - 12], [x + w - 12, yy + h - 12]]) { F(g, sx, sy, 6, 6, PINK); F(g, sx + 2, sy + 2, 2, 2, PC('gold', 4)); }
  notch(g, x + 12, yy + 10, w - 24, h - 20, PINK); F(g, x + 14, yy + 12, w - 28, h - 24, PC('cream', 3)); F(g, x + 14, yy + 12, w - 28, 2, PC('cream', 4)); F(g, x + 14, yy + h - 14, w - 28, 2, PC('cream', 2));
  if (o.col) F(g, x + 14, yy + 12, w - 28, 6, o.col);
  if (o.glow && Math.sin(performance.now() / 300) > -0.2) { F(g, x - 4, yy - 4, w + 8, 2, PC('gold', 4)); F(g, x - 4, yy + h + 2, w + 8, 2, PC('gold', 4)); F(g, x - 4, yy - 4, 2, h + 8, PC('gold', 4)); F(g, x + w + 2, yy - 4, 2, h + 8, PC('gold', 4)); }
  return yy;
}
// ── 두루마리 ──
export function scrollFace(g, x, y, w, h) {
  box(g, x, y, w, h, { fill: PC('cream', 3), hi: PC('cream', 4), lo: PC('cream', 2), shadowA: 0.35 });
  F(g, x + 8, y + 8, w - 16, 2, PC('gold', 2)); F(g, x + 8, y + h - 10, w - 16, 2, PC('gold', 2));
  for (const ex of [x - 12, x + w - 4]) { notch(g, ex, y - 10, 16, h + 20, PINK); F(g, ex + 2, y - 8, 12, h + 16, PC('wood', 2)); F(g, ex + 4, y - 8, 4, h + 16, PC('wood', 3)); F(g, ex + 10, y - 8, 2, h + 16, PC('wood', 1));
    for (const ey of [y - 14, y + h + 6]) { notch(g, ex - 2, ey, 20, 10, PINK); F(g, ex, ey + 2, 16, 6, PC('gold', 3)); F(g, ex, ey + 2, 16, 2, PC('gold', 4)); } }
  F(g, x - 6, y + h / 2, 2, 18, PC('red', 2)); notch(g, x - 10, y + h / 2 + 16, 10, 12, PC('red', 1)); F(g, x - 8, y + h / 2 + 18, 6, 6, PC('red', 2));
}
// ── 걸린 현판 ──
export function signFace(g, cx, y, w, h, rope) {
  const x = cx - w / 2;
  if (rope !== false) for (const s of [-1, 1]) F(g, cx + s * w * 0.32, y - 18, 2, 22, PC('wood', 0));
  box(g, x, y, w, h, { edge: PC('gold', 2), edge2: PC('black', 0), fill: PC('black', 1), hi: PC('black', 2), shadowA: 0.45 });
  F(g, x + 8, y + 8, w - 16, 2, PC('gold', 1)); F(g, x + 8, y + h - 10, w - 16, 2, PC('gold', 1));
  for (const s of [-1, 1]) { const ex = cx + s * (w / 2 - 14); F(g, ex - 2, y + h / 2 - 4, 4, 8, PC('gold', 3)); F(g, ex - 4, y + h / 2 - 2, 8, 4, PC('gold', 3)); }
}
// ── 말풍선 ──
export function bubbleFace(g, bx, by, w, h, tx, ty) {
  g.save(); g.globalAlpha *= 0.28; notch(g, bx + 4, by + 6, w, h, '#0a0614'); g.restore();
  notch(g, bx, by, w, h, PINK); F(g, bx + 2, by + 2, w - 4, h - 4, '#fdf8ea'); F(g, bx + 2, by + h - 4, w - 4, 2, PC('cream', 3));
  // 꼬리: 계단처럼 좁아진다
  const n = Math.max(2, H2(ty - (by + h)) / 2); for (let k = 0; k < n; k++) { const hw = H2(Math.max(2, 8 - k * 8 / n)); F(g, tx - hw - 2, by + h - 2 + k * 2, hw * 2 + 4, 2, PINK); F(g, tx - hw, by + h - 2 + k * 2, hw * 2, 2, '#fdf8ea'); }
}
// ── 가름선 ──
export function dividerFace(g, x, y, w, col) {
  F(g, x - w / 2 + 12, y - 1, w - 24, 2, col || PC('gold', 2)); for (const s of [-1, 1]) { F(g, x + s * (w / 2 - 8) - 2, y - 1, 4, 2, col || PC('gold', 2)); F(g, x + s * 16 - 2, y - 2, 4, 4, col || PC('gold', 3)); }
  F(g, x - 2, y - 8, 4, 16, PINK); F(g, x - 6, y - 4, 12, 8, PINK); F(g, x - 2, y - 6, 4, 12, PC('gold', 3)); F(g, x - 4, y - 2, 8, 4, PC('gold', 3)); F(g, x - 2, y - 2, 2, 2, PC('gold', 4));
}
// ── 둥근 도장 / 네모 낙관 ──
export function stampFace(g, x, y, r, col) { disc(g, x, y, r, 'rgba(251,247,236,0.85)'); ring(g, x, y, r, col, Math.max(2, r * 0.14)); ring(g, x, y, r * 0.78, col, 2); }
export function sealFace(g, x, y, s, col) {
  const x0 = x - s / 2, y0 = y - s / 2; notch(g, x0, y0, s, s, PINK); F(g, x0 + 2, y0 + 2, s - 4, s - 4, col);
  if (s >= 22) { F(g, x0 + 2, y0 + 2, s - 4, 2, lighten(col, 0.25)); F(g, x0 + 2, y0 + s - 4, s - 4, 2, darken(col, 0.3)); }
  const m = Math.max(4, H2(s * 0.1)); g.save(); g.globalAlpha *= 0.55; F(g, x0 + m, y0 + m, s - m * 2, 2, '#fbf7ec'); F(g, x0 + m, y0 + s - m - 2, s - m * 2, 2, '#fbf7ec'); F(g, x0 + m, y0 + m, 2, s - m * 2, '#fbf7ec'); F(g, x0 + s - m - 2, y0 + m, 2, s - m * 2, '#fbf7ec'); g.restore();
}
