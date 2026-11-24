// 손으로 찍는 큰 두목·짐승·영물·소품: 종이 그림을 줄여 굽던 것을 도트 인형과 같은 솜씨로 다시 찍는다.
// 모두 오른쪽을 보고, 먹선과 흰 테는 units.js 의 edged 가 두른다. 판마다 [서기, 걷기, 치기] 세 장을 돌려준다.
import { INK, mixc } from './px.js';
import { c, OSpr, part, merge, like, shade, cropAll, edged } from './units.js';

const POSES = ['stand', 'step', 'atk'];
// 판 하나에 세 모습을 그리고, 같은 상자로 잘라 먹선·흰 테를 두른다. (ox, oy) = 발밑
function make(W, H, ox, oy, draw) { const fr = POSES.map(p => { const s = new OSpr(W, H, 0, 0); draw(s, p); return s; }); return cropAll(fr, ox, oy, 0).map(edged); }
const R = Math.round;
// 겹친 부분을 가르는 속 테: 조각 가장자리를 그 색의 어두운 빛으로
function lay(s, fn, o = {}) {
  const t = like(s); fn(t); if (o.dl !== 0 || o.dd !== 0) shade(t, o.dl === undefined ? 1 : o.dl, o.dd === undefined ? 1 : o.dd);
  if (o.edge !== false) { const w = t.w, h = t.h, d = t.d, n = new Int32Array(d); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = d[y * w + x]; if (v === -1) continue; const e = (xx, yy) => xx < 0 || yy < 0 || xx >= w || yy >= h || d[yy * w + xx] === -1; if (e(x - 1, y) || e(x + 1, y) || e(x, y - 1) || e(x, y + 1)) n[y * w + x] = o.edgeCol !== undefined ? o.edgeCol : mixc(v, 0x1b1425, 0.55); } t.d = n; }
  merge(s, t);
}
// 굵기가 바뀌는 줄기 (꼬리·목·뿌리): 점들을 따라 동그라미를 찍는다
function tube(t, pts, r0, r1, col, colTip, tip = 0) {
  let L = 0; const seg = []; for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); L += d; }
  let acc = 0; for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], n = Math.max(1, Math.ceil(seg[i - 1] * 2)); for (let k = 0; k <= n; k++) { const q = k / n, u = (acc + seg[i - 1] * q) / L, r = r0 + (r1 - r0) * u; t.ell(x0 + (x1 - x0) * q, y0 + (y1 - y0) * q, r, r, colTip !== undefined && u > 1 - tip ? colTip : col); } acc += seg[i - 1]; }
}
// 굽은 줄 (두 끝과 휜 정도)
const bend = (x0, y0, x1, y1, b, n = 8) => Array.from({ length: n + 1 }, (_, i) => { const q = i / n, nx = -(y1 - y0), ny = x1 - x0, l = Math.hypot(nx, ny) || 1; return [x0 + (x1 - x0) * q + nx / l * Math.sin(q * Math.PI) * b, y0 + (y1 - y0) * q + ny / l * Math.sin(q * Math.PI) * b]; });
const dots = (s, list, col) => { for (const [x, y] of list) s.set(x, y, col); };
// 눈: 흰자 없는 작은 눈 (색, 동공)
function eye(s, x, y, col, w = 3, h = 2, glare = false) { s.rect(x, y, w, h, col); s.set(x + w - 1, y + h - 1, INK); if (h > 2) s.rect(x + w - 2, y + 1, 1, h - 1, INK); s.set(x, y, mixc(col, 0xffffff, 0.6)); if (glare) s.hl(x - 1, x + w, y - 1, INK); }

// 불꽃 한 송이 (아래가 둥글고 위가 갈라져 흔들린다)
function flame(s, x, y, col, h = 8, ph = 0) {
  lay(s, t => { t.ell(x, y, h * 0.42, h * 0.38, c(col, 2)); t.poly([[x - h * 0.4, y - 1], [x - h * 0.15 + ph, y - h], [x + h * 0.05, y - h * 0.45], [x + h * 0.25 - ph, y - h * 0.85], [x + h * 0.42, y - 1]], c(col, 2)); }, { edgeCol: c(col, 0) });
  lay(s, t => { t.ell(x, y, h * 0.2, h * 0.2, c(col, 4)); t.poly([[x - h * 0.15, y], [x + ph * 0.5, y - h * 0.55], [x + h * 0.15, y]], c(col, 4)); }, { dl: 0, dd: 0, edge: false });
}
// ───────── 여우: 구미호(꼬리 n 개) · 둔갑한 여우 ─────────
const FOX = { fur: '#e3952f', belly: '#fbf3e2', dark: '#7a3c1c', tip: '#fffaf0' };
function fox(n, fake = false) {
  return make(96, 84, 64, 78, (s, p) => {
    const atk = p === 'atk', sw = p === 'step' ? 1 : 0, hx = atk ? 3 : 0;
    // 꼬리: 뒤에서 위로 부채처럼 편다
    const N = Math.max(n, 0);
    for (let i = 0; i < N; i++) {
      const u = N === 1 ? 0.5 : i / (N - 1), a = (-172 + u * 98 + (sw ? 5 : 0) + (atk ? -4 : 0)) * Math.PI / 180, L = 30 + (i % 2) * 4, bx = 56, by = 66;
      const ex = bx + Math.cos(a) * L, ey = by + Math.sin(a) * L;
      lay(s, t => tube(t, bend(bx, by, ex, ey, (i % 2 ? 5 : -5) * (u < 0.5 ? 1 : -1), 10), 3, 5.2, c(FOX.fur, i % 2 ? 1 : 2), c(FOX.tip, 2), 0.24));
    }
    // 여우불: 꼬리 끝 위로 떠도는 푸른 불
    if (n >= 9 && !fake) for (const [i, [x, y]] of [[20, 28], [34, 16], [52, 12]].entries()) flame(s, x, y + (sw && i % 2 ? -1 : 0), '#4aa8e8', 10, (i + sw) % 2 ? 1 : -1);
    // 몸: 앉은 엉덩이와 앞다리
    lay(s, t => { t.ell(64, 66, 14, 11, c(FOX.fur)); t.ell(64, 52, 10, 12, c(FOX.fur)); });
    lay(s, t => t.ell(64 + hx * 0.3, 52, 6, 10, c(FOX.belly)), { dd: 0, edge: false });
    lay(s, t => { t.rect(57, 54, 5, 22, c(FOX.fur, 3)); t.rect(66, 54, 5, 22, c(FOX.fur, 3)); }, { dl: 1, dd: 1 });
    for (const x of [57, 66]) { s.rect(x, 73, 5, 3, c(FOX.dark)); s.set(x + 1, 75, c(FOX.dark, 0)); s.set(x + 3, 75, c(FOX.dark, 0)); }
    // 목에 건 구슬
    if (!fake) { s.hl(59, 69, 47, c('#d9a441', 3)); s.set(58, 46, c('#d9a441', 3)); s.set(70, 46, c('#d9a441', 3)); lay(s, t => t.ell(64, 51, 3, 3, c('#9cd8f0', 3)), { edgeCol: c('#3a6a9a', 1) }); s.set(63, 50, 0xffffff); }
    // 머리
    const X = 64 + hx, Y = 32 - (sw ? 1 : 0);
    lay(s, t => { t.poly([[X - 12, Y + 2], [X - 9, Y - 15], [X - 3, Y - 5]], c(FOX.fur)); t.poly([[X + 12, Y + 2], [X + 9, Y - 15], [X + 3, Y - 5]], c(FOX.fur)); });
    s.poly([[X - 9, Y], [X - 8, Y - 10], [X - 5, Y - 4]], c(FOX.dark, 1)); s.poly([[X + 9, Y], [X + 8, Y - 10], [X + 5, Y - 4]], c(FOX.dark, 1));
    lay(s, t => { t.ell(X, Y + 2, 12, 9, c(FOX.fur)); t.poly([[X - 14, Y + 6], [X - 6, Y + 2], [X - 8, Y + 9]], c(FOX.fur)); t.poly([[X + 14, Y + 6], [X + 6, Y + 2], [X + 8, Y + 9]], c(FOX.fur)); });
    lay(s, t => { t.poly([[X - 8, Y + 4], [X + 8, Y + 4], [X, Y + 13]], c(FOX.belly)); }, { dl: 0, dd: 0, edge: false });
    s.rect(X - 1, Y + 11, 3, 2, INK);
    if (!fake) s.rect(X, Y - 4, 1, 3, c(RED, 2));
    const ec = atk ? c('#ff5a3a', 3) : c('#ffd24a', 3);
    for (const ex of [X - 7, X + 3]) { s.rect(ex, Y + 1, 4, 2, ec); s.hl(ex - 1, ex + 4, Y, INK); s.set(ex + (ex < X ? 3 : 0), Y + 2, INK); s.vl(ex + (ex < X ? 2 : 1), Y + 1, Y + 2, INK); }
    if (atk) { s.rect(X - 4, Y + 13, 9, 3, c('#4a1230')); s.hl(X - 4, X + 4, Y + 13, c(PAPER, 3)); s.set(X - 3, Y + 14, c(PAPER, 3)); s.set(X + 3, Y + 14, c(PAPER, 3)); }
    else { s.set(X - 2, Y + 14, INK); s.set(X + 2, Y + 14, INK); s.hl(X - 1, X + 1, Y + 15, INK); }
  });
}
const RED = '#c8402f', PAPER = '#fbf7ec', GOLD = '#d9a441', BLACK = '#26242e';

// ───────── 구렁이 · 이무기: 똬리를 틀고 고개를 든 뱀 ─────────
function snake(o) {
  const k = o.k || 1, Z = v => R(v * k), W = Z(110), H = Z(110), OX = Z(50), OY = Z(102);
  return make(W, H, OX, OY, (s, p) => {
    const atk = p === 'atk', sl = p === 'step' ? 1 : 0, body = o.body, belly = o.belly;
    // 꼬리 끝
    lay(s, t => tube(t, [[Z(76), Z(96)], [Z(88), Z(92)], [Z(96 + sl * 2), Z(84)], [Z(98 + sl * 2), Z(78)]], Z(5), 1.2, c(body)));
    // 똬리 세 겹 (아래가 크다)
    for (const [cx, cy, rx, ry] of [[50, 92, 33, 9], [48, 81, 27, 8.5], [46, 71, 20, 8]]) {
      const X = Z(cx + (cy === 81 ? sl : 0)), Y = Z(cy);
      lay(s, t => t.ell(X, Y, Z(rx), Z(ry), c(body)), { dl: 2, dd: 2 });
      lay(s, t => { for (let x = -rx + 4; x < rx - 3; x++) { const yy = Y + Z(ry * 0.45 * Math.sqrt(Math.max(0, 1 - (x / rx) ** 2))); t.vl(X + Z(x), yy, yy + Z(2), c(belly)); } }, { dl: 0, dd: 0, edge: false });
      for (let x = -rx + 6; x < rx - 6; x += 7) { const xx = X + Z(x), yy = Y - Z(ry * 0.35); s.poly([[xx - Z(2), yy], [xx, yy - Z(2.5)], [xx + Z(2), yy], [xx, yy + Z(2.5)]], c(o.mark)); }
    }
    // 등지느러미 (이무기)
    const neck = atk ? [[Z(44), Z(66)], [Z(36), Z(52)], [Z(42), Z(38)], [Z(58), Z(32)], [Z(74), Z(34)]] : [[Z(44), Z(66)], [Z(34), Z(52)], [Z(36), Z(36)], [Z(46), Z(24)], [Z(58), Z(20)]];
    if (o.fin) lay(s, t => { for (let i = 0; i < neck.length - 1; i++) { const [x0, y0] = neck[i], [x1, y1] = neck[i + 1]; for (let q = 0; q < 1; q += 0.34) { const x = x0 + (x1 - x0) * q - Z(7), y = y0 + (y1 - y0) * q - Z(2); t.poly([[x, y + Z(4)], [x - Z(5), y - Z(5)], [x + Z(3), y + Z(1)]], c(o.fin, 3)); } } }, { edgeCol: c(o.fin, 1) });
    // 목
    lay(s, t => tube(t, neck, Z(8), Z(6.2), c(body)), { dl: 2, dd: 2 });
    lay(s, t => { for (let i = 0; i < neck.length - 1; i++) { const [x0, y0] = neck[i], [x1, y1] = neck[i + 1]; for (let q = 0; q <= 1; q += 0.1) t.ell(x0 + (x1 - x0) * q + Z(4), y0 + (y1 - y0) * q + Z(2), Z(2.6), Z(2.6), c(belly)); } }, { dl: 0, dd: 1, edge: false });
    for (let i = 1; i < neck.length - 1; i++) { const [x, y] = neck[i]; s.poly([[x - Z(2), y], [x, y - Z(2.5)], [x + Z(2), y], [x, y + Z(2.5)]], c(o.mark)); }
    // 머리: 오른쪽을 본다
    const [hx, hy] = neck[neck.length - 1], X = hx + Z(6), Y = hy;
    lay(s, t => { t.ell(X, Y, Z(10), Z(6.5), c(body)); t.ell(X + Z(7), Y + Z(1), Z(5), Z(4.5), c(body)); }, { dl: 2, dd: 1 });
    lay(s, t => t.ell(X + Z(4), Y + Z(4), Z(8), Z(2.2), c(belly)), { dl: 0, dd: 0, edge: false });
    if (o.horn) { lay(s, t => { t.poly([[X - Z(4), Y - Z(5)], [X - Z(7), Y - Z(12)], [X - Z(1), Y - Z(6)]], c(o.horn)); t.poly([[X + Z(1), Y - Z(6)], [X, Y - Z(12)], [X + Z(4), Y - Z(6)]], c(o.horn)); }); }
    eye(s, X + Z(3), Y - Z(3), c(o.eye, 3), Z(3), Z(2), true);
    s.set(X + Z(10), Y - Z(2), INK);
    if (atk) { lay(s, t => t.poly([[X + Z(4), Y + Z(2)], [X + Z(15), Y + Z(1)], [X + Z(14), Y + Z(9)], [X + Z(4), Y + Z(6)]], c('#8a1c30')), { dl: 0, dd: 0, edgeCol: INK }); s.vl(X + Z(13), Y + Z(2), Y + Z(4), c(PAPER, 3)); s.vl(X + Z(11), Y + Z(6), Y + Z(8), c(PAPER, 3)); }
    // 혀
    const tx = X + Z(atk ? 15 : 12), ty = Y + Z(atk ? 5 : 2); s.hl(tx, tx + Z(5), ty, c(RED, 3)); s.set(tx + Z(6), ty - 1, c(RED, 3)); s.set(tx + Z(6), ty + 1, c(RED, 3)); s.set(tx + Z(7), ty - 2, c(RED, 3)); s.set(tx + Z(7), ty + 2, c(RED, 3));
  });
}

// ───────── 불가사리 두목: 쇠를 먹는 짐승, 쇠비늘과 등가시, 몸속의 불빛 ─────────
function bulga(o = {}) {
  const k = o.k || 1, Z = v => R(v * k);
  return make(Z(118), Z(96), Z(52), Z(88), (s, p) => {
    const atk = p === 'atk', st = p === 'step' ? 2 : 0, iron = o.iron || '#535866', plate = o.plate || '#727a88';
    // 꼬리
    lay(s, t => tube(t, [[Z(18), Z(52)], [Z(10), Z(58)], [Z(8), Z(70)]], Z(3), Z(2), c(iron))); lay(s, t => t.ell(Z(8), Z(72), Z(3), Z(4), c(iron, 1)));
    // 뒤 다리 (어둡게)
    for (const [x, d] of [[34, st], [72, -st]]) lay(s, t => { t.rect(Z(x + d), Z(62), Z(10), Z(24), c(iron, 1)); t.rect(Z(x + d - 1), Z(84), Z(12), Z(4), c(iron, 1)); });
    // 등가시
    for (let i = 0; i < 9; i++) { const x = Z(22 + i * 7.5), h = Z(i % 2 ? 10 : 15), y = Z(34 + Math.abs(i - 4) * 1.4); lay(s, t => t.poly([[x - Z(3), y + Z(2)], [x + Z(1), y - h], [x + Z(3), y + Z(2)]], c('#c8ccd6', 3)), { edgeCol: c('#8890a0', 1) }); }
    // 몸통
    lay(s, t => t.ell(Z(50), Z(54), Z(36), Z(21), c(iron)), { dl: 2, dd: 2 });
    // 쇠비늘: 엇갈린 방패꼴
    for (let r = 0; r < 4; r++) for (let i = 0; i < 8; i++) { const x = Z(22 + i * 8 + (r % 2) * 4), y = Z(40 + r * 7); if (((x - Z(50)) / Z(34)) ** 2 + ((y - Z(54)) / Z(19)) ** 2 > 0.85) continue; lay(s, t => t.poly([[x - Z(3), y - Z(2)], [x + Z(3), y - Z(2)], [x + Z(3), y + Z(2)], [x, y + Z(4)], [x - Z(3), y + Z(2)]], c(plate)), { dl: 1, dd: 1 }); s.set(x, y - Z(1), c(plate, 4)); }
    // 몸속 불빛 (갈라진 틈)
    for (const [x, y] of [[30, 58], [52, 64], [64, 52]]) { s.line(Z(x), Z(y), Z(x + 4), Z(y - 4), c('#ff9a3a', 3), 2); s.line(Z(x + 4), Z(y - 4), Z(x + 8), Z(y), c('#ff9a3a', 3), 2); s.set(Z(x + 4), Z(y - 4), c('#fff0a0', 3)); }
    s.hl(Z(26), Z(74), Z(72), c('#c85a1a', 2)); s.hl(Z(30), Z(70), Z(73), c('#ff9a3a', 3));
    // 앞 다리
    for (const [x, d] of [[22, -st], [60, st]]) { lay(s, t => { t.rect(Z(x + d), Z(62), Z(12), Z(24), c(iron)); t.rect(Z(x + d - 1), Z(84), Z(14), Z(4), c(iron)); }); for (let q = 0; q < 3; q++) s.rect(Z(x + d + q * 4), Z(87), Z(2), Z(2), c('#e8e4d8', 3)); }
    // 머리: 짧은 코를 내린 둥근 머리
    const X = Z(88 + (atk ? 4 : 0)), Y = Z(46 + (atk ? 4 : 0));
    lay(s, t => { t.ell(X, Y, Z(15), Z(13), c(iron)); t.poly([[X - Z(10), Y - Z(10)], [X - Z(6), Y - Z(18)], [X - Z(2), Y - Z(11)]], c(iron)); }, { dl: 2, dd: 2 });
    lay(s, t => tube(t, [[X + Z(10), Y + Z(2)], [X + Z(15), Y + Z(8)], [X + Z(15), Y + Z(16)], [X + Z(12), Y + Z(18)]], Z(5), Z(3), c(iron)), { dl: 1, dd: 1 });
    for (let q = 0; q < 4; q++) s.hl(X + Z(12), X + Z(17), Y + Z(6 + q * 3), c(iron, 1));
    eye(s, X - Z(2), Y - Z(4), c('#ff5a3a', 3), Z(4), Z(3), true); eye(s, X + Z(7), Y - Z(4), c('#ff5a3a', 3), Z(3), Z(3), true);
    if (atk) { lay(s, t => t.ell(X + Z(5), Y + Z(10), Z(5), Z(3), c('#4a1230')), { dl: 0, dd: 0, edgeCol: INK }); s.rect(X + Z(3), Y + Z(9), Z(4), Z(2), c('#ff9a3a', 3)); }
  });
}

// ───────── 역신(마마 귀신): 날개 달린 관모, 곰보 얼굴, 남빛 단령 ─────────
function plague() {
  return make(96, 116, 48, 110, (s, p) => {
    const atk = p === 'atk', sw = p === 'step' ? 1 : 0, robe = '#2e3f72';
    // 둘레를 도는 붉은 마마 구슬
    const orbs = [[16, 50], [80, 46], [12, 80], [84, 78], [24, 102], [74, 104]];
    for (const [i, [x, y]] of orbs.entries()) { const dx = atk ? (x < 48 ? 4 : -4) : 0, yy = y + (sw ? (i % 2 ? -2 : 2) : 0), r = atk ? 3.5 : 2.6; lay(s, t => t.ell(x + dx, yy, r, r, c('#d83a32', 3)), { edgeCol: c('#8a1c30', 1) }); s.set(x + dx - 1, yy - 1, c(PAPER, 3)); }
    // 단령: 넓은 소매를 앞에 모았다
    lay(s, t => { t.rows(56, Array.from({ length: 48 }, (_, i) => [33 - Math.min(10, i >> 2), 63 + Math.min(10, i >> 2)]), c(robe)); }, { dl: 1, dd: 2 });
    for (let x = 23; x <= 73; x += 3) if ((x * 7) % 5 < 3) s.vl(x, 101 + (x % 2), 103, -1);   // 밑단이 흩어진다 (떠 있다)
    lay(s, t => { t.ell(30, 76, 10, 14, c(robe)); t.ell(66, 76, 10, 14, c(robe)); }, { dl: 1, dd: 2 });
    lay(s, t => t.rect(38, 80, 20, 8, c(robe, 1)), { dl: 0, dd: 1 });   // 맞잡은 소매
    s.hl(38, 57, 64, c('#d9a441', 3)); for (let x = 39; x <= 57; x += 4) s.rect(x, 65, 2, 2, c('#d9a441', 3));
    lay(s, t => t.rect(41, 52, 14, 10, c('#2a3a6a')), { dl: 0, dd: 0, edgeCol: c('#d9a441', 3) });
    s.rect(43, 54, 10, 6, c('#4a6aa8')); s.line(44, 58, 49, 55, c(PAPER, 3)); s.line(49, 55, 52, 57, c(PAPER, 3)); s.set(47, 56, c(RED, 3));   // 흉배의 학
    for (const [x, y] of [[35, 48], [61, 48]]) s.line(x, y, 48, 52, c(PAPER, 2));   // 깃
    // 얼굴: 창백하고 붉은 곰보
    lay(s, t => t.ell(48, 34, 13, 14, c('#e2e8da')), { dl: 1, dd: 2 });
    dots(s, [[40, 30], [55, 28], [43, 40], [52, 41], [57, 36], [39, 36], [48, 27]], c('#d83a32', 3));
    for (const ex of [39, 51]) { lay(s, t => t.ell(ex + 3, 33, 3.5, 2.5, c('#ffcf3a', 3)), { dl: 0, dd: 0, edgeCol: INK }); s.rect(ex + 3, 32, 2, 3, INK); s.line(ex - 1, 29 + (ex < 48 ? 0 : 1), ex + 6, 28 + (ex < 48 ? 1 : 0), INK); }
    s.vl(48, 34, 38, c('#b8c0b0')); s.hl(44, 52, 42, c('#8a1c30')); s.hl(45, 51, 43, c('#c8403a')); if (atk) { s.rect(45, 43, 7, 3, c('#4a1230')); }
    s.hl(43, 46, 46, INK); s.hl(50, 53, 46, INK);   // 가는 수염
    // 사모: 둥근 모체와 양옆으로 뻗은 날개
    lay(s, t => { t.rows(14, [[42, 54], [40, 56], [39, 57], [38, 58], [38, 58], [37, 59], [37, 59], [36, 60], [36, 60], [35, 61]], c(BLACK)); }, { dl: 1, dd: 1 });
    lay(s, t => { t.rect(16, 18, 20, 4, c(BLACK)); t.ell(16, 20, 3, 3, c(BLACK)); t.rect(60, 18, 20, 4, c(BLACK)); t.ell(80, 20, 3, 3, c(BLACK)); }, { dl: 1, dd: 1 });
    s.hl(36, 60, 22, c(BLACK, 4));
  });
}

// ───────── 저승사자: 검은 갓과 도포, 붉은 갓끈 구슬, 포승과 명부 ─────────
function reaper() {
  return make(78, 104, 38, 96, (s, p) => {
    const atk = p === 'atk', sw = p === 'step' ? 1 : 0, robe = '#26242e';
    // 도포
    lay(s, t => t.rows(48, Array.from({ length: 46 }, (_, i) => [28 - Math.min(9, i >> 2), 48 + Math.min(9, i >> 2)]), c(robe)), { dl: 1, dd: 2 });
    s.vl(38, 50, 92, c(robe, 0)); s.hl(19, 57, 92, c('#5a1f2a')); s.hl(19, 57, 93, c('#5a1f2a', 1));
    lay(s, t => { t.ell(23, 66, 8, 13, c(robe)); t.ell(53, 66, 8, 13, c(robe)); }, { dl: 1, dd: 2 });
    s.hl(26, 50, 62, c('#5a1f2a', 2)); s.hl(26, 50, 63, c('#5a1f2a', 1));   // 붉은 띠
    // 왼손: 붉은 포승 다발
    const rx = 20 - (atk ? 3 : 0), ry = 78 + sw;
    lay(s, t => { t.ell(rx, ry, 7, 7, c('#c8302a')); }, { dl: 1, dd: 1 }); lay(s, t => t.ell(rx, ry, 3, 3, -1), { edge: false, dl: 0, dd: 0 });
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; s.set(R(rx + Math.cos(a) * 5), R(ry + Math.sin(a) * 5), c('#ff6a5a', 3)); }
    s.vl(rx, ry + 7, ry + 15, c('#c8302a')); s.rect(rx - 1, ry + 14, 3, 3, c('#d9a441', 3));
    // 오른손: 명부 (펼쳐 든다)
    const bx = atk ? 56 : 52, by = atk ? 60 : 70;
    lay(s, t => t.rect(bx, by, 12, 15, c('#8a1c30')), { dl: 1, dd: 1 }); s.rect(bx + 2, by + 2, 8, 10, c(PAPER, 3)); for (let q = 0; q < 4; q++) s.hl(bx + 3, bx + 8, by + 3 + q * 2, c(BLACK));
    s.rect(bx - 3, by + 6, 4, 4, c('#c8c8c0', 3));
    // 얼굴: 잿빛
    lay(s, t => t.ell(38, 34, 11, 12, c('#c4c8cc')), { dl: 1, dd: 2 });
    eye(s, 32, 33, c('#6a1c2a', 3), 3, 2, true); eye(s, 41, 33, c('#6a1c2a', 3), 3, 2, true);
    s.hl(35, 41, 41, INK); s.set(34, 42, INK); s.set(42, 42, INK);
    s.hl(30, 33, 31, c(BLACK)); s.hl(43, 46, 31, c(BLACK));
    // 갓끈 구슬
    for (let i = 0; i < 9; i++) { s.set(28 + R(i * 0.6), 40 + i * 2, c('#c8302a', i % 2 ? 2 : 3)); s.set(48 - R(i * 0.6), 40 + i * 2, c('#c8302a', i % 2 ? 2 : 3)); }
    s.rect(37, 58, 3, 4, c('#c8302a', 3));
    // 갓: 높은 대우와 넓은 양태
    lay(s, t => { t.rect(31, 6, 14, 17, c(BLACK)); t.rows(22, [[20, 56], [16, 60], [17, 59]], c(BLACK)); }, { dl: 1, dd: 1 });
    s.vl(32, 7, 21, c(BLACK, 4)); s.hl(31, 44, 20, c('#5a1f2a', 2));
  });
}

// ───────── 염라대왕: 붉은 곤룡포와 금띠, 검은 관(날개 없이), 수염, 흰 홀 ─────────
function yeomra() {
  return make(90, 116, 42, 108, (s, p) => {
    const atk = p === 'atk', sw = p === 'step' ? 1 : 0, robe = '#a8302a';
    lay(s, t => t.rows(58, Array.from({ length: 46 }, (_, i) => [28 - Math.min(10, i >> 2), 56 + Math.min(10, i >> 2)]), c(robe)), { dl: 1, dd: 2 });
    s.hl(18, 66, 101, c('#d9a441', 3)); for (let x = 19; x < 66; x += 4) { s.set(x, 99, c('#d9a441', 3)); s.set(x + 1, 98, c('#d9a441', 3)); s.set(x + 2, 99, c('#d9a441', 3)); }
    s.vl(42, 60, 100, c(robe, 0));
    // 어깨의 둥근 용보
    lay(s, t => { t.ell(24, 66, 9, 11, c(robe)); t.ell(60, 66, 9, 11, c(robe)); }, { dl: 1, dd: 2 });
    for (const x of [24, 60]) { lay(s, t => t.ell(x, 62, 4, 4, c('#d9a441', 3)), { edgeCol: c('#8a5a20', 2) }); s.set(x, 62, c(RED, 3)); }
    s.rect(29, 74, 27, 4, c('#2a1f2a')); for (let x = 31; x < 55; x += 5) s.rect(x, 75, 3, 2, c(PAPER, 3));   // 옥대
    // 손
    lay(s, t => { t.ell(18, 82, 4, 4, c('#f0c898')); t.ell(66 + (atk ? 2 : 0), 78, 4, 4, c('#f0c898')); });
    // 홀: 흰 상아 판 (치는 모습이면 치켜든다)
    if (atk) lay(s, t => { t.line(66, 76, 80, 50, c('#f6f0e0', 3), 6); }, { dl: 1, dd: 1 }); else lay(s, t => t.line(66, 80, 72, 52, c('#f6f0e0', 3), 6), { dl: 1, dd: 1 });
    // 얼굴과 검은 수염
    lay(s, t => t.ell(42, 38, 13, 13, c('#f0c898')), { dl: 1, dd: 2 });
    lay(s, t => { t.rows(40, [[30, 54], [29, 55], [30, 54], [31, 53], [32, 52], [33, 51], [35, 49], [37, 47], [39, 45]], c(BLACK)); }, { dl: 1, dd: 1 });
    for (let x = 33; x <= 51; x += 3) s.vl(x, 43, 46, c(BLACK, 3));
    lay(s, t => t.rect(36, 41, 12, 3, c('#f0c898')), { dl: 0, dd: 0, edge: false }); s.hl(38, 46, 42, c('#8a1c30'));
    s.rect(32, 32, 6, 2, c(BLACK)); s.rect(46, 32, 6, 2, c(BLACK)); s.set(31, 31, c(BLACK)); s.set(52, 31, c(BLACK));   // 치켜 뜬 눈썹
    for (const ex of [32, 46]) { lay(s, t => t.ell(ex + 3, 36, 3.5, 2.5, c(PAPER, 4)), { dl: 0, dd: 0, edgeCol: INK }); s.rect(ex + 3, 35, 2, 3, atk ? c('#d83a1a', 3) : INK); }
    s.set(42, 38, c('#c8906a')); s.set(42, 39, c('#c8906a'));
    // 관: 검붉은 관에 금띠 둘과 옥 장식 (날개는 달지 않는다)
    lay(s, t => { t.rows(12, [[36, 48], [33, 51], [31, 53], [30, 54], [30, 54], [30, 54], [30, 54], [30, 54], [29, 55], [29, 55], [29, 55], [29, 55], [30, 54]], c('#2a1f2a')); }, { dl: 1, dd: 1 });
    s.hl(30, 54, 16, c('#d9a441', 3)); s.hl(29, 55, 22, c('#d9a441', 3)); s.hl(29, 55, 23, c('#d9a441', 2));
    lay(s, t => t.ell(42, 19, 3, 3, c('#5fbe8a', 3)), { edgeCol: c('#2a6a4a', 1) }); s.set(41, 18, c(PAPER, 3));
    if (sw) s.set(42, 11, c('#d9a441', 3));
  });
}

// ───────── 여우 할미: 흰 머릿수건, 회색 치마저고리, 지팡이, 치마 밑으로 삐져나온 여우 꼬리 ─────────
function foxhalmi() {
  return make(104, 98, 54, 88, (s, p) => {
    const atk = p === 'atk', sw = p === 'step' ? 1 : 0;
    // 꼬리 넷: 치마 양옆 아래로
    for (const [x0, y0, x1, y1, b] of [[40, 80, 14, 70, 6], [42, 84, 20, 86, -4], [68, 80, 94, 70, -6], [66, 84, 88, 86, 4]]) lay(s, t => tube(t, bend(x0, y0, x1 + (sw ? 2 : 0) * Math.sign(x1 - 54), y1 - (atk ? 6 : 0), b, 8), 3.5, 6, c(FOX.fur, 2), c(FOX.tip, 2), 0.16));
    // 치마
    lay(s, t => t.rows(58, Array.from({ length: 30 }, (_, i) => [42 - Math.min(10, i >> 1), 66 + Math.min(10, i >> 1)]), c('#7c7a88')), { dl: 1, dd: 2 });
    for (const x of [40, 48, 56, 64, 72]) s.vl(x, 64 + Math.abs(x - 56) / 3, 86, c('#7c7a88', 1));
    // 저고리와 고름
    lay(s, t => { t.rows(46, [[43, 65], [42, 66], [41, 67], [41, 67], [41, 67], [41, 67], [42, 66], [42, 66], [42, 66], [42, 66], [43, 65], [43, 65], [43, 65]], c('#e8e2d2')); }, { dl: 1, dd: 1 });
    lay(s, t => { t.rect(36, 48, 7, 14, c('#e8e2d2')); t.rect(65, 48, 7, 14, c('#e8e2d2')); }, { dl: 1, dd: 1 });
    s.hl(36, 42, 58, c('#8a5a3a')); s.hl(65, 71, 58, c('#8a5a3a'));
    s.line(50, 48, 55, 54, c('#a8302a', 2)); s.line(55, 54, 52, 62, c('#a8302a', 2), 2); s.line(55, 54, 58, 60, c('#a8302a', 2));
    // 손과 지팡이
    lay(s, t => { t.ell(39, 63, 3, 3, c('#e8c098')); t.ell(70, 63, 3, 3, c('#e8c098')); });
    const sx = atk ? 78 : 74; lay(s, t => t.line(sx, 54 - (atk ? 8 : 0), sx + 2, 88, c('#8a5a30'), 2)); lay(s, t => t.ell(sx, 52 - (atk ? 8 : 0), 3, 2, c('#8a5a30')));
    // 얼굴: 주름진 할미, 여우 눈매
    lay(s, t => t.ell(54, 34, 11, 12, c('#ecc8a0')), { dl: 1, dd: 2 });
    for (const ex of [46, 57]) { s.rect(ex, 33, 5, 2, c(atk ? '#ff5a3a' : '#e0a020', 3)); s.hl(ex - 1, ex + 5, 32, INK); s.set(ex + (ex < 54 ? 4 : 0), 31, INK); s.rect(ex + 2, 33, 1, 2, INK); }
    s.hl(51, 57, 40, c('#8a3a2a')); s.set(50, 39, c('#8a3a2a')); s.set(58, 39, c('#8a3a2a')); dots(s, [[47, 37], [61, 37], [52, 28], [56, 28]], c('#c89a78'));
    // 흰 머릿수건
    lay(s, t => { t.rows(20, [[47, 61], [44, 64], [43, 65], [42, 66], [42, 66], [41, 67], [41, 47], [41, 45], [41, 44], [41, 44], [42, 44]], c('#f4f0e6')); t.rows(20, [null, null, null, null, null, null, [62, 67], [64, 67], [65, 67], [65, 67], [65, 66]], c('#f4f0e6')); }, { dl: 1, dd: 1 });
    s.hl(44, 64, 26, c('#d8d2c2'));
  });
}


// ───────── 큰 도깨비 두목: 큰 머리, 부리부리한 눈, 활짝 웃는 이, 짚 허리띠, 방망이 ─────────
function bigDok(o) {
  return make(100, 108, 40, 100, (s, p) => {
    const atk = p === 'atk', st = p === 'step', sk = o.skin, B = st ? 1 : 0;
    // 등에 진 것 (앙괭이의 자루)
    if (o.sack) lay(s, t => t.ell(16, 60, 11, 14, c('#c8b48a')), { dl: 1, dd: 2 });
    // 다리와 발톱
    for (const [x, lift] of [[27, st ? 2 : 0], [42, 0]]) { lay(s, t => { t.rect(x, 82 - lift, 10, 14, c(sk)); t.rect(x - 1, 93 - lift, 12, 4, c(sk)); }); for (let q = 0; q < 3; q++) s.set(x + q * 4, 97 - lift, c(PAPER, 3)); }
    // 바지(잠방이)
    lay(s, t => t.rows(70 + B, [[24, 54], [23, 55], [23, 55], [23, 55], [23, 55], [23, 55], [23, 38], [23, 38], [23, 37], [41, 55], [41, 55]].map((v, i) => i > 8 ? v : v), c(o.pants)), { dl: 1, dd: 2 });
    lay(s, t => t.rows(76 + B, [[41, 55], [41, 55], [41, 55], [41, 54], [42, 54], [42, 54]], c(o.pants)), { dl: 0, dd: 1 });
    if (o.patch) { s.rect(27, 74 + B, 6, 5, c(o.pants, 3)); s.hl(27, 32, 74 + B, c(o.pants, 1)); s.vl(27, 74 + B, 78 + B, c(o.pants, 1)); }
    // 몸통
    lay(s, t => t.rows(54 + B, Array.from({ length: 17 }, (_, i) => [25 - (i < 4 ? i >> 1 : 2), 52 + (i < 4 ? i >> 1 : 2)]), c(o.vest ? o.vest : sk)), { dl: 1, dd: 2 });
    if (o.vest) { lay(s, t => t.rows(53 + B, Array.from({ length: 17 }, (_, i) => [34 - (i >> 3), 42 + (i >> 3)]), c(sk)), { dl: 0, dd: 1 }); if (o.spots) for (const [x, y] of [[24, 58], [29, 64], [51, 60], [47, 67], [26, 68]]) s.rect(x, y + B, 2, 2, c(o.vest, 0)); }
    else { s.hl(30, 35, 58 + B, c(sk, 1)); s.hl(42, 47, 58 + B, c(sk, 1)); s.set(38, 64 + B, c(sk, 1)); }
    // 새끼줄 허리띠와 매듭
    s.hl(21, 57, 70 + B, c('#d4b06a', 3)); s.hl(21, 57, 71 + B, c('#a8823a')); for (let x = 22; x < 57; x += 3) s.set(x, 70 + B, c('#a8823a'));
    s.vl(44, 72 + B, 77 + B, c('#d4b06a', 3)); s.vl(46, 72 + B, 76 + B, c('#d4b06a', 3));
    // 뒷팔과 왼손에 든 것
    lay(s, t => { t.ell(17, 62 + B, 6, 10, c(sk)); t.ell(15, 73 + B, 5, 5, c(sk)); }, { dl: 1, dd: 2 });
    if (o.bracelet) { s.hl(11, 20, 69 + B, c('#e0b23c', 3)); s.hl(11, 20, 70 + B, c('#e0b23c')); }
    if (o.rock) lay(s, t => t.poly([[4, 70], [10, 64], [20, 66], [22, 76], [14, 82], [5, 79]], c('#8890a0')), { dl: 1, dd: 2 });
    if (o.shoes) { lay(s, t => { t.ell(11, 82, 4, 7, c('#d4b06a')); t.ell(18, 84, 4, 7, c('#d4b06a')); }, { dl: 1, dd: 1 }); s.vl(15, 74, 80, c('#a8823a')); }
    // 방망이: 서기·걷기는 어깨에 메고, 치기는 앞으로 내려친다
    const hx = atk ? 64 : 58, hy = atk ? 62 : 56, tx = atk ? 94 : 72, ty = atk ? 52 : 10;
    lay(s, t => tube(t, [[hx - (tx - hx) * 0.12, hy - (ty - hy) * 0.12], [hx, hy], [hx + (tx - hx) * 0.5, hy + (ty - hy) * 0.5], [tx, ty]], 2.6, 7, c(o.club || '#8a5a30')), { dl: 1, dd: 2 });
    for (const q of [0.12, 0.2]) { const x = R(hx + (tx - hx) * q), y = R(hy + (ty - hy) * q); s.line(x - 3, y, x + 3, y, c('#e8d8a8', 3)); }
    if (o.studs) for (const q of [0.62, 0.74, 0.86, 0.95]) { const x = R(hx + (tx - hx) * q), y = R(hy + (ty - hy) * q); s.rect(x - 4, y, 2, 2, c('#5a3a20')); s.rect(x + 2, y - 1, 2, 2, c('#5a3a20')); }
    else { const x = R(hx + (tx - hx) * 0.8), y = R(hy + (ty - hy) * 0.8); s.ell(x, y, 2, 2, c(o.club || '#8a5a30', 1)); s.set(x, y, c(o.club || '#8a5a30', 3)); }
    // 앞팔
    lay(s, t => { t.line(55, 56 + B, hx, hy, c(sk), 7); t.ell(hx, hy, 5, 5, c(sk)); }, { dl: 1, dd: 2 });
    if (o.bracelet) s.hl(hx - 4, hx + 3, hy + 4, c('#e0b23c', 3));
    // 머리
    const X = 38, Y = 34 + B;
    lay(s, t => { t.ell(X - 21, Y + 3, 4, 5, c(sk)); t.ell(X + 21, Y + 3, 4, 5, c(sk)); }, { dl: 1, dd: 1 });
    lay(s, t => t.ell(X, Y, 21, 19, c(sk)), { dl: 2, dd: 2 });
    // 머리털: 이마를 덮는 곧은 머리 (붉은 머리도)
    lay(s, t => t.rows(Y - 19, [[X - 8, X + 8], [X - 12, X + 12], [X - 15, X + 15], [X - 17, X + 17], [X - 19, X + 19], [X - 20, X + 20], [X - 21, X + 21], [X - 21, X + 21], [X - 21, X - 15], [X - 21, X - 17]], c(o.hair || BLACK)), { dl: 1, dd: 1 });
    for (let x = X - 16; x <= X + 16; x += 4) s.vl(x, Y - 13, Y - 11, c(o.hair || BLACK, 0));
    if (o.band) { s.hl(X - 21, X + 21, Y - 10, c(o.band, 3)); s.hl(X - 21, X + 21, Y - 9, c(o.band, 2)); s.rect(X - 25, Y - 11, 4, 3, c(o.band, 3)); s.set(X - 26, Y - 8, c(o.band)); }
    if (o.topknot) { lay(s, t => t.ell(X, Y - 23, 5, 5, c(BLACK))); s.hl(X - 3, X + 3, Y - 18, c(RED, 3)); s.set(X - 2, Y - 25, c(BLACK, 4)); }
    if (o.shoesHat) { lay(s, t => { t.ell(X - 9, Y - 22, 6, 4, c('#d4b06a')); t.ell(X + 7, Y - 24, 7, 4, c('#d4b06a')); }, { dl: 1, dd: 1 }); for (let x = X + 1; x < X + 13; x += 2) s.set(x, Y - 24, c('#a8823a')); }
    // 눈썹·눈·코·입
    const bc = o.brow || BLACK;
    if (o.oneEye) { lay(s, t => t.ell(X, Y - 1, 6, 5, c('#ffd24a', 3)), { dl: 0, dd: 0, edgeCol: INK }); s.rect(X - 1, Y - 3, 3, 4, c('#b83a1a')); s.rect(X, Y - 2, 1, 2, INK); s.set(X - 3, Y - 3, c(PAPER, 4)); s.hl(X - 7, X + 7, Y - 7, c(bc)); s.hl(X - 6, X + 6, Y - 8, c(bc)); }
    else for (const ex of [X - 13, X + 4]) { lay(s, t => t.ell(ex + 4, Y, 4.5, 4, c('#ffd24a', 3)), { dl: 0, dd: 0, edgeCol: INK }); s.rect(ex + 4, Y - 2, 4, 4, c(atk ? '#d83a1a' : '#8a3a1a')); s.rect(ex + 5, Y - 1, 2, 2, INK); s.set(ex + 2, Y - 2, c(PAPER, 4)); s.hl(ex - 1, ex + 9, Y - 6, c(bc)); s.hl(ex + (ex < X ? 0 : 1), ex + 8, Y - 7, c(bc)); }
    lay(s, t => t.ell(X, Y + 5, 4, 3, c(sk)), { dl: 1, dd: 1 }); s.set(X - 2, Y + 6, c(sk, 0)); s.set(X + 2, Y + 6, c(sk, 0));
    lay(s, t => t.rows(Y + 9, [[X - 14, X + 14], [X - 14, X + 14], [X - 13, X + 13], [X - 12, X + 12], [X - 10, X + 10], [X - 7, X + 7]], c('#4a1230')), { dl: 0, dd: 0, edgeCol: INK });
    for (let x = X - 13; x <= X + 12; x += 3) { s.rect(x, Y + 9, 2, 2, c(PAPER, 3)); } for (let x = X - 10; x <= X + 9; x += 3) s.rect(x, Y + 13, 2, 1, c(PAPER, 3));
    if (atk) s.rect(X - 3, Y + 11, 6, 1, c('#e87090'));
  });
}

// ───────── 어둑시니: 어둠이 뭉친 털북숭이 그림자, 흰 탈 같은 얼굴, 긴 흰 발톱 ─────────
function eoduk() {
  return make(100, 108, 46, 102, (s, p) => {
    const atk = p === 'atk', sw = p === 'step' ? 1 : 0, D = '#2c2448';
    // 몸: 아래로 갈수록 퍼지는 그림자, 밑단은 들쭉날쭉
    lay(s, t => { t.rows(30, Array.from({ length: 66 }, (_, i) => [32 - Math.min(18, R(i * 0.42)), 60 + Math.min(18, R(i * 0.42))]), c(D)); for (let x = 14; x < 79; x += 6) t.poly([[x, 95], [x + 3, 101 + (x % 12 ? 0 : 2)], [x + 6, 95]], c(D)); }, { dl: 1, dd: 2 });
    // 머리 위 들쭉날쭉한 털 갈기
    lay(s, t => { for (const [x, h] of [[28, 14], [36, 20], [46, 24], [56, 20], [64, 14]]) t.poly([[x - 6, 34], [x, 34 - h], [x + 6, 34]], c(D)); }, { dl: 1, dd: 1 });
    // 몸에 감긴 어둠의 소용돌이
    for (const [x, y] of [[28, 60], [62, 66], [40, 80], [58, 46]]) { for (let a = 0; a < 5.5; a += 0.5) s.set(R(x + Math.cos(a + sw) * (1 + a * 0.6)), R(y + Math.sin(a + sw) * (1 + a * 0.6)), c('#6a5aa8', 3)); }
    // 팔: 양옆으로 늘어뜨리고 긴 흰 발톱 (치기면 벌린다)
    const ax = atk ? 8 : 0;
    for (const sd of [-1, 1]) { const x0 = 46 + sd * 22, x1 = 46 + sd * (32 + ax); lay(s, t => tube(t, [[x0, 46], [x1, 64], [x1 + sd * 2, 80]], 6, 4.5, c(D)), { dl: 1, dd: 2 }); for (let q = 0; q < 3; q++) lay(s, t => t.line(x1 + sd * (q * 3 - 2), 82, x1 + sd * (q * 3), 94, c('#e8e4f0', 3), 2), { dl: 0, dd: 0 }); }
    // 흰 탈 얼굴과 붉은 세 눈
    lay(s, t => t.ell(46, 38, 14, 16, c('#f2eef4')), { dl: 1, dd: 2 });
    lay(s, t => t.ell(46, 27, 2.5, 2.5, c('#d83a32', 3)), { dl: 0, dd: 0, edgeCol: c('#8a1c30', 1) });
    for (const ex of [37, 50]) { lay(s, t => t.ell(ex + 2, 34, 3.5, 3, c(atk ? '#ff3a2a' : '#d83a32', 3)), { dl: 0, dd: 0, edgeCol: INK }); s.rect(ex + 1, 33, 2, 2, c('#ffe0a0', 4)); }
    const my = 42; lay(s, t => { t.rows(my, [[36, 56], [36, 56], [37, 55], [38, 54], [40, 52]], c('#4a1230')); }, { dl: 0, dd: 0, edgeCol: INK }); for (let x = 37; x < 55; x += 4) { s.poly([[x, my], [x + 2, my + 3], [x + 4, my]], c(PAPER, 3)); s.poly([[x + 2, my + 5], [x + 4, my + 2], [x + 6, my + 5]], c(PAPER, 3)); }
  });
}

// ───────── 당산나무 어르신: 얼굴 있는 큰 줄기, 금줄과 오색 천, 소나무 갓 ─────────
function elder() {
  return make(112, 130, 54, 124, (s, p) => {
    const atk = p === 'atk', sw = p === 'step' ? 1 : 0, bark = '#8a5a34', pine = '#2f6a54';
    // 뿌리
    lay(s, t => { t.poly([[30, 124], [40, 108], [48, 124]], c(bark, 1)); t.poly([[62, 124], [70, 108], [80, 124]], c(bark, 1)); t.poly([[20, 124], [36, 116], [40, 124]], c(bark, 1)); t.poly([[72, 124], [78, 116], [90, 124]], c(bark, 1)); });
    // 가지 (팔): 치기면 휘두른다
    lay(s, t => { tube(t, bend(36, 58, 14, 34 - (atk ? 8 : 0), -6), 4, 2.5, c(bark)); tube(t, bend(72, 58, 96 + (atk ? 6 : 0), 34 - (atk ? 4 : 0), 6), 4, 2.5, c(bark)); }, { dl: 1, dd: 1 });
    // 줄기
    lay(s, t => t.rows(40, Array.from({ length: 80 }, (_, i) => [36 - (i > 60 ? (i - 60) >> 1 : 0), 72 + (i > 60 ? (i - 60) >> 1 : 0)]), c(bark)), { dl: 2, dd: 3 });
    for (const x of [40, 46, 52, 61, 67]) for (let y = 44 + (x % 7); y < 116; y += 9) s.vl(x, y, y + 5, c(bark, 1));
    // 얼굴: 노란 눈, 왕관꼴 입
    for (const ex of [44, 58]) { lay(s, t => t.ell(ex + 2, 66, 5, 5, c('#ffd24a', 3)), { dl: 0, dd: 0, edgeCol: c('#3a2418') }); s.rect(ex + 1, 65 - sw, 3, 3, INK); s.hl(ex - 3, ex + 7, 59, c(bark, 0)); s.hl(ex - 2, ex + 6, 58, c(bark, 0)); }
    const my = atk ? 76 : 78; s.poly([[46, my], [49, my - 4], [52, my], [54, my - 5], [56, my], [59, my - 4], [62, my], [60, my + 7], [48, my + 7]], c('#2a1a14')); if (atk) s.rect(49, my + 2, 10, 3, c('#4a1230'));
    // 금줄과 오색 천
    s.hl(34, 74, 90, c('#d4b06a', 3)); s.hl(34, 74, 91, c('#a8823a')); for (let x = 35; x < 74; x += 3) s.set(x, 90, c('#a8823a'));
    const cols = [PAPER, RED, PAPER, '#2f4d7e', '#e0b23c', '#3f8a6a'];
    cols.forEach((col, i) => { const x = 40 + i * 6, l = 10 + (i % 2) * 3 + (sw && i % 2 ? 1 : 0); lay(s, t => t.rect(x, 92, 4, l, c(col, col === PAPER ? 3 : 2)), { dl: 1, dd: 1 }); });
    // 소나무 갓: 층층이 퍼진 솔잎 덩이
    const pads = [[54, 18, 22, 8], [32, 26, 16, 7], [78, 26, 16, 7], [44, 34, 14, 6], [68, 34, 14, 6], [20, 36, 10, 5], [92, 36, 10, 5]];
    lay(s, t => { tube(t, [[54, 40], [54, 22]], 3, 2, c(bark)); tube(t, [[44, 42], [30, 28]], 2.5, 1.5, c(bark)); tube(t, [[64, 42], [80, 28]], 2.5, 1.5, c(bark)); });
    for (const [x, y, rx, ry] of pads) { lay(s, t => t.ell(x + (sw ? 1 : 0), y, rx, ry, c(pine)), { dl: 2, dd: 2 }); for (let q = -rx + 3; q < rx - 2; q += 4) s.vl(x + q, y - 1, y + 1, c(pine, 1)); }
  });
}

// ───────── 네발짐승 틀: 개·말·범·해태 (오른쪽을 본다). k 로 크기를 바꾼다 ─────────
function beast(o) {
  const k = o.k || 1, Z = v => R(v * k), M = o.margin || 0;
  return make(Z(120) + M * 2, Z(96) + M, Z(52) + M, Z(86) + M, (s0, p) => {
    const s = s0, X = v => Z(v) + M, Y = v => Z(v) + M, atk = p === 'atk', st = p === 'step' ? 1 : 0, body = o.body, lg = o.leg || o.body, thin = o.type === 'horse';
    const P = { atk, st, X, Y, Z, k };
    if (o.back) o.back(s, P);
    // 꼬리
    if (o.tail !== false) lay(s, t => tube(t, o.tailPts ? o.tailPts.map(([a, b]) => [X(a), Y(b)]) : [[X(22), Y(46)], [X(12), Y(40)], [X(8), Y(30)], [X(10 + st * 2), Y(22)]], Z(o.tailR0 || 3), Z(o.tailR1 || 2), c(o.tailCol || body)), { dl: 1, dd: 1 });
    // 뒤쪽 다리 (어둡게)
    const leg = (x, d, far) => { const w = thin ? 6 : 8; lay(s, t => { t.rect(X(x + d), Y(52), Z(w), Z(24), c(lg, far ? 1 : 2)); t.rect(X(x + d - (thin ? 0 : 1)), Y(74), Z(w + (thin ? 0 : 2)), Z(4), c(o.hoof || lg, far ? 0 : 1)); }); if (o.claws && !far) for (let q = 0; q < 3; q++) s.set(X(x + d) + q * Z(3), Y(78), c(PAPER, 3)); };
    const sd = atk ? 3 : st ? 3 : 0;
    leg(30, -sd, true); leg(78, sd, true);
    // 몸통과 가슴
    lay(s, t => { t.ell(X(50), Y(46), Z(30), Z(15), c(body)); t.ell(X(76), Y(44), Z(11), Z(14), c(body)); t.ell(X(24), Y(46), Z(12), Z(13), c(body)); }, { dl: 2, dd: 2 });
    if (o.belly) lay(s, t => t.ell(X(50), Y(56), Z(22), Z(4), c(o.belly)), { dl: 0, dd: 0, edge: false });
    if (o.mid) o.mid(s, P);
    leg(22, sd, false); leg(70, -sd + (atk ? 4 : 0), false);
    // 목과 머리
    const hd = atk ? [6, 6] : [0, 0], HX = 92 + hd[0], HY = 22 + hd[1] + (st ? 1 : 0) + (o.hy || 0);
    if (o.headFn) { lay(s, t => tube(t, [[X(74), Y(40)], [X(82), Y(30)], [X(HX - 4), Y(HY)]], Z(10), Z(8), c(body)), { dl: 2, dd: 2 }); o.headFn(s, P, HX, HY); }
    else if (o.type === 'horse') {
      lay(s, t => tube(t, [[X(72), Y(40)], [X(80), Y(26)], [X(HX - 6), Y(HY - 6)]], Z(9), Z(6.5), c(body)), { dl: 2, dd: 2 });
      lay(s, t => { t.poly([[X(HX - 9), Y(HY - 10)], [X(HX - 2), Y(HY - 12)], [X(HX + 12), Y(HY + 4)], [X(HX + 12), Y(HY + 9)], [X(HX + 6), Y(HY + 11)], [X(HX - 8), Y(HY)]], c(body)); t.poly([[X(HX - 6), Y(HY - 10)], [X(HX - 4), Y(HY - 19)], [X(HX), Y(HY - 11)]], c(body)); }, { dl: 2, dd: 2 });
      s.rect(X(HX + 8), Y(HY + 5), Z(2), Z(2), c(body, 0)); eye(s, X(HX - 1), Y(HY - 5), c(o.eye || BLACK, 3), Math.max(2, Z(3)), Math.max(2, Z(2.5)));
    } else {
      lay(s, t => tube(t, [[X(74), Y(40)], [X(82), Y(30)], [X(HX - 4), Y(HY)]], Z(10), Z(8), c(body)), { dl: 2, dd: 2 });
      const ear = o.ear || 'point';
      lay(s, t => { if (ear === 'point') { t.poly([[X(HX - 8), Y(HY - 6)], [X(HX - 5), Y(HY - 18)], [X(HX), Y(HY - 8)]], c(body)); t.poly([[X(HX - 2), Y(HY - 7)], [X(HX + 2), Y(HY - 17)], [X(HX + 5), Y(HY - 6)]], c(body)); } else { t.ell(X(HX - 7), Y(HY - 9), Z(4), Z(4), c(body)); t.ell(X(HX + 3), Y(HY - 10), Z(4), Z(4), c(body)); } }, { dl: 1, dd: 1 });
      lay(s, t => { t.ell(X(HX), Y(HY), Z(11), Z(10), c(body)); t.rows(Y(HY - 2), Array.from({ length: Z(o.snout || 9) }, (_, i) => [X(HX + 4), X(HX + (o.muzzle || 16)) - (i < 2 ? 2 - i : 0)]), c(o.muzzleCol || body)); }, { dl: 2, dd: 2 });
      s.rect(X(HX + (o.muzzle || 16)) - Z(3), Y(HY - 2), Z(3), Z(3), INK);
      if (o.ear === 'point') { s.poly([[X(HX - 7), Y(HY - 7)], [X(HX - 5), Y(HY - 14)], [X(HX - 2), Y(HY - 8)]], c(o.earIn || body, 0)); }
      eye(s, X(HX + 1), Y(HY - 4), c(o.eye || '#ffd24a', 3), Math.max(3, Z(4)), Math.max(2, Z(3)), true);
      const my = Y(HY + (o.snout || 9) - 3);
      if (atk || o.open) { lay(s, t => t.poly([[X(HX + 3), my - Z(1)], [X(HX + (o.muzzle || 16)), my], [X(HX + (o.muzzle || 16)) - Z(2), my + Z(7)], [X(HX + 4), my + Z(3)]], c('#6a1a2a')), { dl: 0, dd: 0, edgeCol: INK }); for (const q of [0.35, 0.75]) { const x = R(X(HX + 3) + (X(HX + (o.muzzle || 16)) - X(HX + 3)) * q); s.vl(x, my, my + Z(2), c(PAPER, 3)); } }
      else s.hl(X(HX + 5), X(HX + (o.muzzle || 16)) - 1, my, INK);
    }
    if (o.front) o.front(s, P, HX, HY);
  });
}

// 등과 꼬리에 타오르는 불 갈기
const fireMane = (n, x0, x1, y0, y1, h0, h1) => (s, P) => { for (let i = 0; i < n; i++) { const q = i / (n - 1), x = P.X(x0 + (x1 - x0) * q), y = P.Y(y0 + (y1 - y0) * q), h = P.Z(h0 + (h1 - h0) * q) + (P.st && i % 2 ? 2 : 0); flame(s, x, y, i % 3 ? '#f08a2a' : '#ffb43a', h, (i + (P.st ? 1 : 0)) % 2 ? 1 : -1); } };

// ───────── 지네 왕: 고개를 쳐든 마디 몸, 노란 다리, 붉은 머리와 더듬이 ─────────
function centipede(o = {}) {
  const k = o.k || 1, Z = v => R(v * k);
  return make(Z(116), Z(112), Z(56), Z(104), (s, p) => {
    const atk = p === 'atk', st = p === 'step' ? 1 : 0, seg = o.body || '#7a3a2c', legc = o.leg || '#d9a441';
    const pts = []; for (let i = 0; i < 12; i++) { const q = i / 11; pts.push([Z(12 + q * 66 + (atk ? q * q * 14 : 0)), Z(98 - Math.pow(q, 2.2) * 66 - (atk ? q * q * 4 : 0))]); }
    // 다리: 마디마다 양쪽
    pts.forEach(([x, y], i) => { const ph = (i + st) % 2 ? 2 : -2; lay(s, t => { t.line(x, y, x - Z(10), y + Z(12) + ph, c(legc), 2); t.line(x, y, x + Z(10), y + Z(12) - ph, c(legc), 2); }, { dl: 0, dd: 0, edgeCol: c(legc, 0) }); });
    // 마디
    for (let i = 0; i < pts.length - 1; i++) { const [x, y] = pts[i], r = Z(6.5 + i * 0.25); lay(s, t => t.ell(x, y, r, r * 0.9, c(seg, i % 2 ? 2 : 1)), { dl: 1, dd: 1 }); s.hl(x - r + 2, x + r - 2, y - R(r * 0.4), c(seg, 3)); }
    // 머리와 독니
    const [hx, hy] = pts[pts.length - 1];
    lay(s, t => { t.ell(hx, hy, Z(9), Z(8), c('#a8302a')); }, { dl: 2, dd: 2 });
    for (const sd of [-1, 1]) lay(s, t => tube(t, [[hx + sd * Z(4), hy - Z(6)], [hx + sd * Z(8), hy - Z(18)], [hx + sd * Z(14 + st), hy - Z(28)]], Math.max(1, Z(1.4)), 1, c(legc)), { dl: 0, dd: 0 });
    for (const ex of [-5, 2]) { s.rect(hx + Z(ex), hy - Z(3), Z(3), Z(3), c('#ffd24a', 3)); s.set(hx + Z(ex) + Z(2), hy - Z(1), INK); }
    for (const sd of [-1, 1]) lay(s, t => tube(t, bend(hx + sd * Z(4), hy + Z(6), hx + sd * Z(atk ? 8 : 4), hy + Z(atk ? 15 : 12), sd * 3, 5), Math.max(1, Z(1.8)), 1, c('#e8e0c8', 3)), { dl: 0, dd: 0 });
  });
}

// ───────── 대적: 머리 셋 달린 도적 두목, 구레나룻, 노란 머리띠, 쇠테 두른 몽둥이 ─────────
function threeHead() {
  return make(108, 112, 54, 104, (s, p) => {
    const atk = p === 'atk', B = p === 'step' ? 1 : 0, sk = '#c88a5a', cloth = '#2e2a30';
    for (const [x, lift] of [[42, B ? 2 : 0], [57, 0]]) { lay(s, t => { t.rect(x, 86 - lift, 10, 12, c(cloth)); t.rect(x - 1, 96 - lift, 12, 4, c('#1a1820')); }); }
    lay(s, t => t.rows(56, Array.from({ length: 32 }, (_, i) => [36 - Math.min(4, i >> 2), 72 + Math.min(4, i >> 2)]), c(cloth)), { dl: 1, dd: 2 });
    for (let x = 33; x < 76; x += 4) s.poly([[x, 87], [x + 2, 90], [x + 4, 87]], c('#d9a441', 3));
    s.rect(36, 70, 36, 5, c('#a8302a')); s.hl(36, 71, 70, c('#a8302a', 3)); lay(s, t => t.rect(52, 74, 5, 9, c('#a8302a')), { dl: 0, dd: 1 }); s.rect(53, 76, 3, 3, c('#d9a441', 3));
    lay(s, t => t.rows(56, Array.from({ length: 12 }, (_, i) => [50 - (i >> 1), 58 + (i >> 1)]), c(sk)), { dl: 0, dd: 1 });   // 드러난 가슴
    // 팔: 왼쪽은 몽둥이를 짚고, 오른쪽은 주먹
    lay(s, t => { t.ell(31, 66, 6, 10, c(sk)); t.ell(78, 66, 6, 10, c(sk)); t.ell(28, 76, 5, 5, c(sk)); t.ell(81 + (atk ? 3 : 0), 76, 5, 5, c(sk)); }, { dl: 1, dd: 2 });
    for (const x of [24, 75]) s.hl(x, x + 9, 72, c('#4a4a55', 3));
    const cx = atk ? 20 : 26; lay(s, t => tube(t, atk ? [[30, 78], [16, 60], [6, 40]] : [[cx, 102], [cx + 1, 76], [cx + 2, 50]], 3.5, 3, c('#7a4a28')), { dl: 1, dd: 1 });
    for (const q of (atk ? [[22, 68], [12, 52]] : [[cx, 92], [cx + 1, 62]])) s.hl(q[0] - 3, q[0] + 4, q[1], c('#8a96a6', 3));
    // 머리 셋: 가운데가 크고 양옆이 작다
    const head = (x, y, r, main) => {
      lay(s, t => t.ell(x, y, r, r, c(sk)), { dl: 1, dd: 2 });
      lay(s, t => { for (let i = 0; i < 7; i++) { const a = Math.PI * (1.05 + i * 0.15); t.poly([[x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6], [x + Math.cos(a) * r * 1.45, y + Math.sin(a) * r * 1.45], [x + Math.cos(a + 0.15) * r * 0.9, y + Math.sin(a + 0.15) * r * 0.9]], c(BLACK)); } t.rows(y - r, [[x - r * 0.7, x + r * 0.7], [x - r * 0.9, x + r * 0.9], [x - r, x + r], [x - r, x + r]].map(v => v.map(R)), c(BLACK)); }, { dl: 1, dd: 1 });
      s.hl(R(x - r), R(x + r), R(y - r + 4), c('#e0b23c', 3)); s.hl(R(x - r), R(x + r), R(y - r + 5), c('#e0b23c', 2));
      const ew = main ? 4 : 2; if (main) { s.hl(R(x - r * 0.6), R(x - 2), R(y - 4), c(BLACK)); s.hl(R(x + 2), R(x + r * 0.6), R(y - 4), c(BLACK)); } eye(s, R(x - r * 0.55), R(y - 2), c(PAPER, 4), ew, main ? 3 : 2); eye(s, R(x + r * 0.2), R(y - 2), c(PAPER, 4), ew, main ? 3 : 2); if (main) { s.rect(R(x - r * 0.55) + 2, R(y - 2), 2, 3, c('#3a2418')); s.rect(R(x + r * 0.2) + 2, R(y - 2), 2, 3, c('#3a2418')); }
      if (main) { lay(s, t => { t.rows(y + 4, [[x - r, x - 4], [x - r, x - 3], [x - r + 1, x + r - 1], [x - r + 2, x + r - 2], [x - r + 3, x + r - 3], [x - r + 5, x + r - 5], [x - r + 7, x + r - 7], [x - 2, x + 2]].map(v => v.map(R)), c('#2a2028')); t.rows(y + 4, [[x + 4, x + r], [x + 3, x + r]].map(v => v.map(R)), c('#2a2028')); }, { dl: 1, dd: 1 }); s.hl(x - 3, x + 3, y + 3, c('#2a2028')); s.hl(x - 2, x + 2, y + 6, atk ? c('#4a1230') : c('#8a3a2a')); if (atk) s.hl(x - 2, x + 2, y + 7, c('#4a1230')); for (let q = x - 8; q <= x + 8; q += 3) s.vl(q, y + 9, y + 12, c('#4a3a44')); }
      else { s.hl(R(x - 2), R(x + 2), R(y + r * 0.5), c('#8a3a2a')); }
    };
    head(34, 50 + B, 9, false); head(76, 50 + B, 9, false); head(55, 34 + B, 14, true);
  });
}

// ───────── 달걀 귀신 왕: 눈·코·입 없는 흰 달걀 머리, 검은 도포, 흰 장갑 ─────────
function eggKing(crack) {
  return make(76, 116, 38, 110, (s, p) => {
    const atk = p === 'atk', sw = p === 'step' ? 1 : 0, robe = '#33323e';
    lay(s, t => t.rows(58, Array.from({ length: 44 }, (_, i) => [27 - Math.min(8, i >> 2), 49 + Math.min(8, i >> 2)]), c(robe)), { dl: 1, dd: 2 });
    for (let x = 19; x < 58; x += 5) s.poly([[x, 100], [x + 2, 104 + (x % 10 ? 0 : 1)], [x + 5, 100]], c(robe, 1));
    s.line(30, 58, 44, 74, c('#c8c4cc', 3)); s.line(46, 58, 32, 74, c(robe, 0));
    s.rect(27, 72, 23, 4, c('#6a6874')); lay(s, t => t.rect(36, 76, 4, 10, c('#a8302a')), { dl: 0, dd: 1 }); s.rect(35, 75, 6, 3, c('#a8302a', 3));
    const ax = atk ? 6 : 0; lay(s, t => { t.ell(20, 68, 7, 11, c(robe)); t.ell(56 + ax, 66 - ax, 7, 11, c(robe)); }, { dl: 1, dd: 2 });
    lay(s, t => { t.ell(18, 80, 4.5, 4, c('#e8e4ee', 3)); t.ell(58 + ax, 78 - ax * 1.5, 4.5, 4, c('#e8e4ee', 3)); });
    // 달걀 머리 (빛이 어린다)
    lay(s, t => t.ell(38, 30 + sw, 15, 21, c('#f4f1ea', 3)), { dl: 2, dd: 3 });
    s.vl(29, 18 + sw, 28 + sw, c(PAPER, 4)); s.vl(30, 15 + sw, 19 + sw, c(PAPER, 4));
    if (crack) { s.line(40, 12, 36, 22, c('#8a8478')); s.line(36, 22, 42, 30, c('#8a8478')); s.line(42, 30, 38, 40, c('#8a8478')); s.line(36, 22, 30, 25, c('#8a8478')); s.rect(38, 30, 3, 3, c('#ffd24a', 3)); }
  });
}

// ───────── 강림 도령: 공작 깃 꽂은 전립, 남빛 철릭에 붉은 띠, 붉은 포승과 흰 패 ─────────
function gangrim() {
  return make(78, 122, 38, 114, (s, p) => {
    const atk = p === 'atk', B = p === 'step' ? 1 : 0, robe = '#26345e';
    for (const [x, lift] of [[29, B ? 2 : 0], [40, 0]]) lay(s, t => { t.rect(x, 96 - lift, 8, 12, c('#2a2830')); t.rect(x - 1, 106 - lift, 10, 4, c('#1a1820')); });
    lay(s, t => t.rows(62, Array.from({ length: 36 }, (_, i) => [27 - Math.min(7, i >> 2), 51 + Math.min(7, i >> 2)]), c(robe)), { dl: 1, dd: 2 });
    for (let x = 20; x < 58; x += 2) s.vl(x, 84, 97, c(robe, x % 4 ? 1 : 2));
    s.hl(19, 58, 97, c('#a8302a', 3)); for (let x = 20; x < 58; x += 4) s.poly([[x, 97], [x + 2, 95], [x + 4, 97]], c('#d9a441', 3));
    s.rect(26, 78, 27, 5, c('#a8302a')); s.hl(26, 52, 78, c('#a8302a', 3));
    lay(s, t => { t.ell(23, 72, 6, 11, c(robe)); t.ell(55, 72, 6, 11, c(robe)); }, { dl: 1, dd: 2 });
    lay(s, t => { t.ell(20, 84, 4, 4, c('#f0cca0')); t.ell(58 + (atk ? 3 : 0), 82, 4, 4, c('#f0cca0')); });
    // 포승과 흰 패
    const rx = atk ? 64 : 16, ry = atk ? 70 : 92; lay(s, t => t.ell(rx, ry, 7, 7, c('#c8302a')), { dl: 1, dd: 1 }); lay(s, t => t.ell(rx, ry, 3, 3, -1), { edge: false, dl: 0, dd: 0 }); s.vl(rx + 1, ry + 7, ry + 16, c('#c8302a'));
    if (!atk) { lay(s, t => t.rect(58, 70, 8, 12, c(PAPER, 3)), { dl: 1, dd: 1, edgeCol: c('#8a1c30') }); s.rect(60, 73, 4, 6, c('#8a1c30')); }
    // 얼굴: 곧은 눈매의 젊은 저승차사
    lay(s, t => t.ell(39, 46, 11, 12, c('#f0cca0')), { dl: 1, dd: 2 });
    s.hl(32, 36, 43, c(BLACK)); s.hl(42, 46, 43, c(BLACK)); eye(s, 33, 45, c(BLACK, 2), 3, 2); eye(s, 43, 45, c(BLACK, 2), 3, 2); s.hl(37, 41, 53, c('#a84a3a'));
    lay(s, t => { t.rect(28, 36, 4, 14, c(BLACK)); t.rect(46, 36, 4, 14, c(BLACK)); }, { dl: 0, dd: 1 });
    // 전립: 검은 벙거지, 금띠, 붉은 상모, 공작 깃
    lay(s, t => { t.rows(24, [[34, 44], [32, 46], [31, 47], [30, 48], [30, 48], [30, 48], [30, 48], [30, 48], [30, 48]], c(BLACK)); t.rows(33, [[20, 58], [18, 60], [19, 59]], c(BLACK)); }, { dl: 1, dd: 1 });
    s.hl(30, 48, 31, c('#d9a441', 3)); lay(s, t => t.ell(39, 21, 3, 3, c('#d9a441', 3)));
    lay(s, t => { t.poly([[40, 22], [47, 12], [52, 20]], c('#c8302a', 2)); }, { dl: 1, dd: 1 });
    lay(s, t => tube(t, [[42, 21], [48, 10], [54, 2]], 1.5, 2.5, c('#3f7a5c')), { dl: 0, dd: 0 }); lay(s, t => t.ell(54, 3, 3, 3, c('#2f6a8a')), { edgeCol: c('#d9a441', 3) }); s.set(54, 3, c('#d9a441', 3));
  });
}

// ───────── 무장 할아범(지게 진 장사): 흰 수염, 흰 머릿수건, 굵은 팔, 떡 바구니 얹은 높은 지게 ─────────
function mujang() {
  return make(92, 162, 44, 154, (s, p) => {
    const atk = p === 'atk', B = p === 'step' ? 1 : 0, sk = '#d89a6a', wood = '#a87a48';
    // 지게: 등 뒤로 높이 솟은 두 다리와 위에 얹은 소쿠리
    lay(s, t => { t.rect(22, 12, 4, 142, c(wood)); t.rect(61, 12, 4, 142, c(wood)); t.rect(22, 16, 43, 3, c(wood)); t.rect(22, 64, 43, 3, c(wood)); }, { dl: 1, dd: 1 });
    for (const [x, y] of [[22, 4], [32, 2], [42, 1], [52, 2], [62, 4], [27, -2], [37, -4], [47, -4], [57, -2], [42, -9]]) lay(s, t => t.ell(x + 2, y + 12, 6, 4.5, c('#f0d8a0')), { dl: 1, dd: 1 });
    lay(s, t => { t.rows(14, [[12, 76], [12, 76], [13, 75], [15, 73], [18, 70], [21, 67]], c('#c8a46a')); }, { dl: 1, dd: 1 });
    for (let x = 14; x < 75; x += 3) s.vl(x, 15, 18, c('#a8823a'));
    // 다리와 짚신
    for (const [x, lift] of [[33, B ? 2 : 0], [46, 0]]) lay(s, t => { t.rect(x, 136 - lift, 9, 14, c('#e8e0cc')); t.rect(x - 1, 148 - lift, 11, 4, c('#c8a46a')); });
    // 잠방이·저고리
    lay(s, t => t.rows(104, Array.from({ length: 34 }, (_, i) => [31 - Math.min(3, i >> 3), 57 + Math.min(3, i >> 3)]), c('#ece4d0')), { dl: 1, dd: 2 });
    s.hl(29, 59, 118, c('#8a5a30')); s.hl(29, 59, 119, c('#8a5a30', 1)); lay(s, t => t.rect(42, 120, 4, 10, c('#a8302a')), { dl: 0, dd: 1 });
    for (let x = 30; x < 58; x += 4) s.poly([[x, 137], [x + 2, 134], [x + 4, 137]], c('#5a4a3a'));
    // 굵은 팔 (지게 끈을 잡는다 / 치기면 주먹을 내민다)
    lay(s, t => { t.ell(25, 108, 7, 13, c(sk)); t.ell(63 + (atk ? 6 : 0), 106 - (atk ? 4 : 0), 7, 13, c(sk)); t.ell(24, 122, 6, 6, c(sk)); t.ell(66 + (atk ? 10 : 0), 118 - (atk ? 8 : 0), 6, 6, c(sk)); }, { dl: 1, dd: 2 });
    s.vl(27, 64, 104, c('#7a5a3a')); s.vl(61, 64, 100, c('#7a5a3a'));
    // 얼굴, 흰 눈썹·수염
    lay(s, t => t.ell(44, 84, 13, 13, c(sk)), { dl: 1, dd: 2 });
    lay(s, t => t.rows(86, [[32, 56], [33, 55], [34, 54], [35, 53], [36, 52], [37, 51], [38, 50], [39, 49], [40, 48], [41, 47], [42, 46], [43, 45], [43, 45], [44, 44]], c('#f6f2ea', 3)), { dl: 1, dd: 1 });
    for (let x = 36; x < 53; x += 3) s.vl(x, 90, 94, c('#d8d0c4'));
    s.hl(36, 41, 79, c(PAPER, 3)); s.hl(47, 52, 79, c(PAPER, 3)); eye(s, 37, 81, c(BLACK, 2), 3, 2); eye(s, 47, 81, c(BLACK, 2), 3, 2);
    s.hl(39, 49, 87, c('#a84a3a')); s.set(44, 84, c(sk, 0));
    // 흰 머릿수건과 상투
    lay(s, t => { t.rows(68, [[36, 52], [33, 55], [31, 57], [31, 57], [31, 57], [31, 57]], c('#ece8e0')); t.ell(44, 65, 4, 4, c('#ece8e0')); }, { dl: 1, dd: 1 }); s.hl(31, 57, 73, c('#c8c0b4'));
  });
}

// ───────── 도깨비 방망이: 홀로 선 혹 달린 방망이 (두목의 소품) ─────────
function dokbang() {
  return make(52, 86, 24, 80, (s, p) => {
    const atk = p === 'atk', sw = p === 'step' ? 1 : 0;
    lay(s, t => { t.ell(24, 78, 14, 4, c('#6a4428')); t.rect(12, 74, 25, 4, c('#6a4428')); }, { dl: 1, dd: 1 });
    for (let x = 14; x < 36; x += 5) s.rect(x, 75, 2, 2, c('#d9a441', 3));
    lay(s, t => tube(t, [[24, 76], [24, 60], [25, 36], [26, 16]], 3, 9, c('#8a5a30')), { dl: 2, dd: 2 });
    for (const [x, y] of [[18, 24], [30, 20], [20, 36], [31, 34], [26, 12], [17, 14]]) lay(s, t => t.ell(x, y, 3, 3, c('#7a4a28')), { dl: 1, dd: 1 });
    s.hl(20, 28, 64, c('#e8d8a8', 3)); s.hl(20, 28, 68, c('#e8d8a8', 3)); lay(s, t => t.rect(23, 76, 3, 8, c('#a8302a')), { dl: 0, dd: 0 });
    for (const [x, y] of [[40, 10 + sw], [8, 30 - sw], [42, 40]]) { s.set(x, y, c('#fff6a8', 4)); s.set(x - 1, y, c('#fff6a8', 3)); s.set(x + 1, y, c('#fff6a8', 3)); s.set(x, y - 1, c('#fff6a8', 3)); s.set(x, y + 1, c('#fff6a8', 3)); }
    if (atk) for (let a = 0; a < 6.3; a += 0.8) s.set(R(26 + Math.cos(a) * 16), R(24 + Math.sin(a) * 18), c('#fff6a8', 4));
  });
}

// ───────── 작은 영물·짐승 ─────────
// 까치: 꼬리를 길게 뻗고 날개를 치는 검은 새, 흰 배와 흰 날개깃
function magpie() {
  return make(44, 44, 22, 40, (s, p) => {
    const up = p !== 'step', atk = p === 'atk', bx = atk ? 3 : 0, K2 = '#1e2236';
    lay(s, t => { t.poly([[4, 22], [16, 17], [20, 21], [6, 26]], c('#2a3a6a')); t.hl(3, 8, 24, c('#2a3a6a', 3)); }, { dl: 1, dd: 1 });
    lay(s, t => t.ell(22 + bx, 21, 9, 6, c(K2)), { dl: 1, dd: 1 });
    lay(s, t => t.ell(23 + bx, 24, 5, 3, c(PAPER, 3)), { dl: 0, dd: 1, edge: false });
    if (up) lay(s, t => { t.poly([[16 + bx, 18], [12 + bx, 4], [18 + bx, 6], [24 + bx, 18]], c(K2)); t.poly([[13 + bx, 6], [16 + bx, 2], [19 + bx, 7], [16 + bx, 10]], c(PAPER, 3)); }, { dl: 1, dd: 1 });
    else lay(s, t => { t.poly([[16 + bx, 22], [10 + bx, 34], [16 + bx, 33], [24 + bx, 23]], c(K2)); t.poly([[10 + bx, 33], [12 + bx, 29], [16 + bx, 31]], c(PAPER, 3)); }, { dl: 1, dd: 1 });
    lay(s, t => t.ell(31 + bx, 17, 5, 5, c(K2)), { dl: 1, dd: 1 }); s.set(32 + bx, 16, c(PAPER, 4)); s.set(33 + bx, 16, INK);
    s.poly([[35 + bx, 17], [40 + bx + (atk ? 2 : 0), 18], [35 + bx, 19]], c('#3a3a44'));
    s.vl(21 + bx, 27, 30, c('#3a3a44')); s.vl(24 + bx, 27, 30, c('#3a3a44'));
  });
}
// 삼족오: 해 바퀴를 등진 세 발 까마귀
function samjoko() {
  return make(44, 50, 18, 46, (s, p) => {
    const atk = p === 'atk', fl = p === 'step' ? 1 : 0;
    for (let a = 0; a < 12; a++) { const q = a / 12 * Math.PI * 2 + fl * 0.26, r0 = 13, r1 = 17 + (a % 2) * 2; lay(s, t => t.poly([[18 + Math.cos(q - 0.2) * r0, 22 + Math.sin(q - 0.2) * r0], [18 + Math.cos(q) * r1, 22 + Math.sin(q) * r1], [18 + Math.cos(q + 0.2) * r0, 22 + Math.sin(q + 0.2) * r0]], c('#e8503a', 3)), { dl: 0, dd: 0 }); }
    lay(s, t => t.ell(18, 22, 14, 14, c('#f0b83a', 3)), { dl: 1, dd: 2 });
    const K2 = '#1c1a2e', wy = atk ? -3 : 0;
    lay(s, t => { t.poly([[4, 16 + wy], [16, 18], [12, 26], [2, 22 + wy]], c(K2)); t.poly([[32, 16 + wy], [20, 18], [24, 26], [34, 22 + wy]], c(K2)); }, { dl: 1, dd: 1 });
    lay(s, t => { t.ell(18, 23, 6, 8, c(K2)); t.ell(18, 13, 4, 4, c(K2)); t.poly([[14, 30], [18, 36], [22, 30]], c(K2)); }, { dl: 1, dd: 1 });
    s.set(19, 12, c('#ff3a2a', 3)); s.poly([[21, 13], [26 + (atk ? 2 : 0), 14], [21, 15]], c('#f0b83a', 4));
    for (const x of [15, 18, 21]) s.vl(x, 36, 40, c('#f0b83a', 2));
  });
}
// 청삽사리: 눈을 덮는 긴 털, 검푸른 털, 붉은 목줄과 방울
function sapsal() {
  return make(52, 38, 20, 34, (s, p) => {
    const atk = p === 'atk', st = p === 'step' ? 2 : 0, F = '#3e4a62', L = '#9aa4ba', hx = atk ? 3 : 0;
    lay(s, t => tube(t, [[9, 16], [4, 11], [5, 5], [10, 4]], 3.2, 2.4, c(F)), { dl: 1, dd: 1 }); s.set(5, 6, c(L, 3)); s.set(9, 4, c(L, 3));
    for (const [x, d] of [[10, st], [26, -st]]) lay(s, t => t.rect(x + d, 26, 5, 6, c(F, 1)));
    lay(s, t => { t.ell(20, 19, 14, 9, c(F)); for (let x = 7; x <= 33; x += 3) t.poly([[x, 24], [x + 1.5, 29 + (x % 2)], [x + 3, 24]], c(F)); }, { dl: 1, dd: 2 });
    for (let x = 9; x < 33; x += 3) s.line(x, 13 + (x % 2), x - 1, 24, c(F, x % 2 ? 1 : 3));
    for (const [x, d] of [[13, -st], [29, st]]) { lay(s, t => t.rect(x + d, 27, 5, 6, c(F))); s.set(x + d + 1, 32, c(F, 0)); s.set(x + d + 3, 32, c(F, 0)); }
    lay(s, t => { t.ell(35 + hx, 15, 9, 9, c(F)); t.poly([[28 + hx, 12], [26 + hx, 24], [31 + hx, 20]], c(F)); }, { dl: 1, dd: 2 });
    lay(s, t => t.rows(16, [[39 + hx, 46 + hx], [39 + hx, 47 + hx], [39 + hx, 47 + hx], [40 + hx, 46 + hx]], c(L)), { dl: 1, dd: 1 }); s.rect(45 + hx, 15, 3, 2, INK);
    lay(s, t => { t.rows(7, [[31 + hx, 39 + hx], [29 + hx, 42 + hx], [28 + hx, 43 + hx], [28 + hx, 44 + hx], [29 + hx, 44 + hx]], c(L)); for (let x = 29; x < 44; x += 2) t.vl(x + hx, 12, 14 + (x % 3), c(L)); }, { dl: 1, dd: 1 });
    for (let x = 30; x < 44; x += 3) s.vl(x + hx, 9, 12, c(L, 1));
    s.set(36 + hx, 14, c('#ffd24a', 3)); s.set(41 + hx, 14, c('#ffd24a', 3));
    s.hl(28 + hx, 33 + hx, 22, c(RED, 3)); lay(s, t => t.ell(31 + hx, 25, 1.6, 1.6, c('#e0b23c', 3)), { dl: 0, dd: 1 });
    if (atk) { s.rect(41 + hx, 20, 5, 2, c('#6a1a2a')); s.rect(43 + hx, 22, 2, 2, c('#e87090', 3)); } else s.rect(43 + hx, 20, 2, 2, c('#e87090', 3));
  });
}
// 해태: 흰 비늘 몸, 푸른 곱슬 갈기와 꼬리, 금빛 외뿔, 목에 단 방울
function haetae() {
  return make(72, 56, 30, 52, (s, p) => {
    const atk = p === 'atk', st = p === 'step' ? 2 : 0, Wb = '#e8e6e0', Bl = '#3a5a9a', hx = atk ? 3 : 0;
    lay(s, t => { tube(t, [[10, 22], [5, 14], [7, 6]], 4, 3, c(Bl)); t.ell(8, 6, 4, 4, c(Bl)); }, { dl: 1, dd: 1 }); for (const [x, y] of [[8, 6], [5, 14]]) s.set(x, y, c(Bl, 4));
    for (const [x, d] of [[12, st], [38, -st]]) lay(s, t => { t.rect(x + d, 32, 7, 16, c('#c8c6c0', 1)); t.rect(x + d - 1, 46, 9, 3, c('#a8a6a0', 1)); });
    lay(s, t => t.ell(26, 28, 18, 11, c(Wb)), { dl: 2, dd: 2 });
    for (let r = 0; r < 3; r++) for (let x = 12 + (r % 2) * 3; x < 40; x += 6) s.poly([[x, 22 + r * 5], [x + 3, 25 + r * 5], [x + 6, 22 + r * 5]], c(Wb, 1));
    for (let x = 12; x < 40; x += 5) lay(s, t => t.ell(x, 17, 2.5, 2.5, c(Bl)), { dl: 1, dd: 1 });
    for (const [x, d] of [[16, -st], [42, st]]) { lay(s, t => { t.rect(x + d, 32, 7, 16, c('#d8d6d0')); t.rect(x + d - 1, 46, 9, 3, c('#c0beb8')); }); for (let q = 0; q < 3; q++) s.set(x + d + q * 3, 48, c(PAPER, 4)); }
    // 머리: 곱슬 갈기
    for (let a = 0; a < 10; a++) { const q = a / 10 * Math.PI * 2; lay(s, t => t.ell(50 + hx + Math.cos(q) * 11, 20 + Math.sin(q) * 11, 4, 4, c(Bl)), { dl: 1, dd: 1 }); }
    for (let a = 0; a < 10; a++) { const q = a / 10 * Math.PI * 2; s.set(R(50 + hx + Math.cos(q) * 11), R(20 + Math.sin(q) * 11), c(Bl, 4)); }
    lay(s, t => t.ell(50 + hx, 20, 9, 9, c('#f0e8d8')), { dl: 1, dd: 2 });
    lay(s, t => t.poly([[48 + hx, 9], [51 + hx, -2], [53 + hx, 9]], c('#e0b23c', 3)), { dl: 1, dd: 1 }); s.hl(49 + hx, 52 + hx, 5, c('#a8823a')); s.hl(49 + hx, 52 + hx, 2, c('#a8823a'));
    for (const ex of [44, 52]) { lay(s, t => t.ell(ex + hx + 2, 17, 3, 3, c('#ffd24a', 3)), { dl: 0, dd: 0, edgeCol: INK }); s.rect(ex + hx + 2, 16, 2, 2, INK); }
    s.rect(49 + hx, 21, 3, 2, c('#5a4a4a'));
    lay(s, t => t.rect(45 + hx, 24, 11, atk ? 5 : 3, c('#8a1c30')), { dl: 0, dd: 0, edgeCol: INK }); for (let x = 46; x < 56; x += 2) s.set(x + hx, 24, c(PAPER, 4));
    lay(s, t => t.ell(48, 32, 3, 3, c('#e0b23c', 3)), { edgeCol: c('#8a5a20') }); s.hl(40, 54, 29, c(RED, 2));
  });
}
// 범 (작은 범 적): 줄무늬 주황 범, 오른쪽을 본다
function smallTiger() {
  return beast({ k: 0.56, headFn: (s, P, HX, HY) => catHead(s, P.X(HX + 2), P.Y(HY + 2), v => R(v * 0.62), { coat: '#e88420', stripe: '#241c22' }, P.atk), body: '#e88420', leg: '#e88420', belly: '#fff2d8', claws: true, ear: 'round', eye: '#ffd24a', muzzle: 14, muzzleCol: '#fff2d8', tailPts: [[22, 44], [10, 40], [6, 28], [10, 20]], tailR0: 3.5, tailR1: 3,
    mid: (s, P) => { for (const x of [26, 34, 42, 50, 58, 66]) { s.line(P.X(x), P.Y(33), P.X(x - 2), P.Y(44), c('#241c22'), 2); } },
    front: (s, P, HX, HY) => { s.hl(P.X(HX - 4), P.X(HX + 2), P.Y(HY - 8), c('#241c22')); s.hl(P.X(HX - 3), P.X(HX + 1), P.Y(HY - 6), c('#241c22')); } });
}
// 멧돼지: 등갈기, 엄니, 분홍 코
function boar() {
  return beast({ k: 0.5, hy: 12, body: '#6a4a36', leg: '#4a3426', hoof: '#2a1e18', ear: 'point', eye: '#ffb43a', muzzle: 18, snout: 11, tailPts: [[22, 44], [14, 40], [12, 34]], tailR0: 2, tailR1: 1.6,
    back: (s, P) => { for (let x = 24; x < 82; x += 7) lay(s, t => t.poly([[P.X(x), P.Y(34)], [P.X(x + 4), P.Y(24)], [P.X(x + 8), P.Y(34)]], c('#3a2a20')), { dl: 1, dd: 0 }); },
    front: (s, P, HX, HY) => { lay(s, t => t.ell(P.X(HX + 17), P.Y(HY + 2), P.Z(4), P.Z(5), c('#e8a0a0')), { dl: 0, dd: 1 }); s.set(P.X(HX + 17), P.Y(HY + 1), INK); s.set(P.X(HX + 17), P.Y(HY + 3), INK); lay(s, t => t.poly([[P.X(HX + 9), P.Y(HY + 6)], [P.X(HX + 13), P.Y(HY - 2)], [P.X(HX + 12), P.Y(HY + 7)]], c(PAPER, 3)), { dl: 0, dd: 0 }); } });
}
// 여우 (작은): 앉은 여우와 꼬리 여럿 / 달리는 여우
function smallFox(n, col) {
  return make(48, 42, 26, 38, (s, p) => {
    const atk = p === 'atk', sw = p === 'step' ? 1 : 0, F = col;
    for (let i = 0; i < n; i++) { const u = n === 1 ? 0.5 : i / (n - 1), a = (-175 + u * 85 + sw * 6) * Math.PI / 180, ex = 22 + Math.cos(a) * 16, ey = 32 + Math.sin(a) * 16; lay(s, t => tube(t, bend(22, 32, ex, ey, i % 2 ? 2 : -2, 6), 2, 3.2, c(F, i % 2 ? 1 : 2), c(PAPER, 3), 0.3)); }
    lay(s, t => { t.ell(26, 31, 8, 6, c(F)); t.ell(26, 24, 5, 7, c(F)); }, { dl: 1, dd: 2 });
    lay(s, t => t.ell(26, 25, 3, 5, c(PAPER, 3)), { dl: 0, dd: 0, edge: false });
    lay(s, t => { t.rect(22, 26, 3, 11, c(F, 3)); t.rect(28, 26, 3, 11, c(F, 3)); }); s.rect(22, 35, 3, 2, c('#6a3a2a')); s.rect(28, 35, 3, 2, c('#6a3a2a'));
    const X = 26 + (atk ? 2 : 0), Y = 13;
    lay(s, t => { t.poly([[X - 7, Y + 1], [X - 5, Y - 9], [X - 1, Y - 3]], c(F)); t.poly([[X + 7, Y + 1], [X + 5, Y - 9], [X + 1, Y - 3]], c(F)); t.ell(X, Y + 2, 7, 5, c(F)); t.poly([[X - 8, Y + 4], [X - 3, Y + 1], [X - 4, Y + 6]], c(F)); t.poly([[X + 8, Y + 4], [X + 3, Y + 1], [X + 4, Y + 6]], c(F)); }, { dl: 1, dd: 1 });
    s.poly([[X - 4, Y + 3], [X + 4, Y + 3], [X, Y + 8]], c(PAPER, 3)); s.set(X, Y + 7, INK);
    s.hl(X - 4, X - 2, Y + 1, INK); s.hl(X + 2, X + 4, Y + 1, INK); s.set(X - 3, Y + 2, c(atk ? '#ff5a3a' : '#ffd24a', 3)); s.set(X + 3, Y + 2, c(atk ? '#ff5a3a' : '#ffd24a', 3)); s.set(X, Y - 2, c(RED, 3));
  });
}
function foxRun() {
  return make(58, 32, 30, 28, (s, p) => {
    const st = p === 'step', atk = p === 'atk', F = '#e8d6b0';
    lay(s, t => tube(t, [[16, 14], [8, 12], [2, 14]], 3, 4.5, c(F), c(PAPER, 3), 0.4));
    lay(s, t => t.ell(28, 14, 13, 5, c(F)), { dl: 1, dd: 2 });
    const lg = st ? [[20, 18, 14, 26], [36, 18, 44, 26]] : [[20, 18, 24, 27], [36, 18, 32, 27]];
    for (const [x0, y0, x1, y1] of lg) { lay(s, t => t.line(x0, y0, x1, y1, c(F, 1), 2)); s.rect(x1 - 1, y1, 3, 2, c('#6a3a2a')); }
    const X = 44 + (atk ? 3 : 0);
    lay(s, t => { t.ell(X, 10, 6, 4, c(F)); t.poly([[X + 3, 8], [X + 12, 11], [X + 3, 13]], c(F)); t.poly([[X - 4, 8], [X - 3, 0], [X + 1, 7]], c(F)); }, { dl: 1, dd: 1 });
    s.hl(X + 1, X + 3, 9, INK); s.set(X + 12, 11, INK);
  });
}
// 지네: 기어가는 마디 몸 (n 마디, 크기 r)
function crawler(n, r, o = {}) {
  const W = R(n * r * 1.6 + r * 5), H = R(r * 4 + 4);
  return make(W, H, R(W / 2), H - 2, (s, p) => {
    const st = p === 'step' ? 1 : 0, atk = p === 'atk', seg = o.body || '#8a3428', legc = o.leg || '#d9a441', base = H - 3 - r * 0.4;
    const xs = Array.from({ length: n }, (_, i) => 2 + r + i * r * 1.6);
    xs.forEach((x, i) => { const y = R(base - r * 0.9 + Math.sin(i * 1.1 + st) * 0.6); for (const sd of [-1, 1]) s.line(R(x), y + R(r * 0.5), R(x + sd * r * 0.5 + ((i + st) % 2 ? 1 : -1)), H - 3, c(legc, 2)); });
    xs.forEach((x, i) => { const y = R(base - r * 0.9 + Math.sin(i * 1.1 + st) * 0.6); lay(s, t => t.ell(R(x), y, r, r * 0.85, c(seg, i % 2 ? 2 : 1)), { dl: 1, dd: 1 }); s.hl(R(x - r * 0.5), R(x + r * 0.5), y - R(r * 0.5), c(seg, 3)); });
    const hx = R(xs[n - 1] + r * 1.4 + (atk ? r * 0.6 : 0)), hy = R(base - r * 1.1 - (atk ? r * 0.4 : 0));
    lay(s, t => t.ell(hx, hy, r * 1.05, r * 0.9, c('#3a2228')), { dl: 1, dd: 1 });
    s.set(hx + 1, hy - 1, c('#ffd24a', 3)); for (const sd of [-1, 1]) s.line(hx + 1, hy + sd, hx + R(r * 1.6), hy + sd * R(r * 0.8) - R(r * 0.6), c(legc, 3));
    s.line(hx - 1, hy - R(r * 0.6), hx - R(r * 0.4), hy - R(r * 1.8), c(legc, 3)); s.line(hx + 1, hy - R(r * 0.6), hx + R(r * 0.8), hy - R(r * 1.8), c(legc, 3));
  });
}
// 묘두사: 고양이 머리를 단 얼룩 뱀
function myodusa() {
  return make(52, 40, 26, 36, (s, p) => {
    const st = p === 'step' ? 1 : 0, atk = p === 'atk', B = '#c89a5a';
    const pts = [[4, 32], [12, 34 - st], [22, 33], [32, 31 + st], [38, 24], [40, 16]];
    if (atk) pts[5] = [44, 18];
    lay(s, t => tube(t, pts, 2, 4.2, c(B)), { dl: 1, dd: 2 });
    for (let i = 1; i < pts.length - 1; i++) { const [x, y] = pts[i]; s.line(x - 1, y - 3, x + 1, y + 3, c('#5a3a22'), 2); }
    const [hx, hy] = pts[5];
    lay(s, t => { t.ell(hx, hy - 3, 7, 6, c(B)); t.poly([[hx - 6, hy - 6], [hx - 5, hy - 15], [hx - 1, hy - 8]], c(B)); t.poly([[hx + 6, hy - 6], [hx + 5, hy - 15], [hx + 1, hy - 8]], c(B)); }, { dl: 1, dd: 2 });
    s.set(hx - 5, hy - 12, c('#e87090', 3)); s.set(hx + 5, hy - 12, c('#e87090', 3));
    for (const ex of [hx - 4, hx + 2]) { s.rect(ex, hy - 5, 2, 2, c('#a8e84a', 3)); s.set(ex + 1, hy - 5, INK); }
    s.set(hx, hy - 1, c('#e87090', 3)); s.hl(hx + 4, hx + 9, hy - 1, c(PAPER, 3)); s.hl(hx + 4, hx + 9, hy + 1, c(PAPER, 3)); if (atk) s.rect(hx - 2, hy, 4, 2, c('#6a1a2a'));
  });
}
// 박쥐
function bat() {
  return make(34, 30, 17, 28, (s, p) => {
    const up = p !== 'step', atk = p === 'atk', B = '#5a4a7a', y = 12;
    lay(s, t => { if (up) { t.poly([[15, y], [2, y - 8], [4, y - 2], [1, y + 2], [6, y + 2], [8, y + 6], [15, y + 4]], c(B)); t.poly([[19, y], [32, y - 8], [30, y - 2], [33, y + 2], [28, y + 2], [26, y + 6], [19, y + 4]], c(B)); } else { t.poly([[15, y], [3, y + 6], [6, y + 8], [9, y + 12], [15, y + 6]], c(B)); t.poly([[19, y], [31, y + 6], [28, y + 8], [25, y + 12], [19, y + 6]], c(B)); } }, { dl: 1, dd: 1 });
    lay(s, t => { t.ell(17, y + 2, 4, 5, c('#2e2840')); t.poly([[14, y - 2], [14, y - 7], [16, y - 3]], c('#2e2840')); t.poly([[20, y - 2], [20, y - 7], [18, y - 3]], c('#2e2840')); }, { dl: 1, dd: 1 });
    s.set(15, y, c('#ff3a2a', 3)); s.set(19, y, c('#ff3a2a', 3)); if (atk) { s.set(16, y + 3, c(PAPER, 4)); s.set(18, y + 3, c(PAPER, 4)); }
  });
}
// 두꺼비: 금빛 눈, 사마귀 돋은 등
function toad() {
  return make(54, 36, 25, 32, (s, p) => {
    const atk = p === 'atk', st = p === 'step' ? 1 : 0, G = '#6a7a3a';
    lay(s, t => { t.ell(25, 22 - st, 20, 11, c(G)); t.ell(8, 28, 6, 3, c(G)); t.ell(42, 28, 6, 3, c(G)); }, { dl: 2, dd: 2 });
    lay(s, t => t.ell(25, 27 - st, 14, 4, c('#d8d09a')), { dl: 0, dd: 0, edge: false });
    for (const [x, y] of [[14, 16], [20, 13], [32, 14], [36, 20], [12, 22], [28, 19]]) { s.rect(x, y - st, 2, 2, c(G, 3)); s.set(x + 1, y + 1 - st, c(G, 1)); }
    for (const ex of [16, 31]) { lay(s, t => t.ell(ex + 2, 11 - st, 4, 3.5, c('#e0b23c', 3)), { dl: 0, dd: 0, edgeCol: INK }); s.hl(ex, ex + 4, 11 - st, INK); }
    if (atk) lay(s, t => t.ell(25, 22, 10, 3, c('#8a1c30')), { dl: 0, dd: 0, edgeCol: INK }); else { s.hl(16, 34, 21 - st, INK); s.set(15, 20 - st, INK); s.set(35, 20 - st, INK); }
    for (const x of [4, 44]) for (let q = 0; q < 3; q++) s.set(x + q * 2, 31, c(G, 1));
  });
}
// 회오리: 푸른 바람 깔때기, 나뭇잎, 웃는 얼굴
function whirl() {
  return make(36, 50, 17, 46, (s, p) => {
    const ph = p === 'step' ? 2 : 0, atk = p === 'atk';
    lay(s, t => { for (let y = 2; y < 40; y++) { const w = 15 - y * 0.32 + Math.sin(y * 0.5 + ph) * 1.2, x = 17 + Math.sin(y * 0.22 + ph) * 2; t.hl(R(x - w), R(x + w), y, c('#cfe8f4', 3)); } }, { dl: 1, dd: 2 });
    for (let y = 4; y < 40; y += 5) { const w = 15 - y * 0.32, x = 17 + Math.sin(y * 0.22 + ph) * 2; s.hl(R(x - w + 1), R(x + w * 0.4), y + (ph ? 1 : 0), c('#6aa8d8', 2)); }
    for (const [x, y] of [[8, 10], [26, 18], [12, 30]]) { s.rect(x + ph, y, 2, 1, c('#8aa84a', 3)); s.set(x + ph + 1, y + 1, c('#6a8a3a')); }
    s.rect(13, 18, 2, 2, INK); s.rect(20, 18, 2, 2, INK); if (atk) s.rect(15, 22, 5, 2, INK); else { s.set(14, 22, INK); s.hl(15, 19, 23, INK); s.set(20, 22, INK); }
  });
}
// 도깨비불(폭탄): 얼굴 달린 푸른 불덩이
function wisp() {
  return make(26, 42, 13, 38, (s, p) => {
    const ph = p === 'step' ? 1 : -1, atk = p === 'atk';
    flame(s, 13, 24, '#4aa8e8', atk ? 26 : 22, ph * 2);
    s.rect(9, 22, 2, 2, INK); s.rect(15, 22, 2, 2, INK); s.hl(8, 10, 20, INK); s.hl(16, 18, 20, INK);
    if (atk) s.rect(10, 26, 6, 2, INK); else { s.set(10, 26, INK); s.set(11, 27, INK); s.set(12, 26, INK); s.set(13, 27, INK); s.set(14, 26, INK); s.set(15, 27, INK); }
  });
}

// ───────── 귀신들 ─────────
// 그슨대: 갓 쓴 키 큰 그림자, 늘어진 긴 팔과 발톱
function geuseun() {
  return make(46, 74, 22, 70, (s, p) => {
    const atk = p === 'atk', sw = p === 'step' ? 1 : 0, D = '#2a2638';
    lay(s, t => t.rows(18, Array.from({ length: 46 }, (_, i) => [16 - (i >> 3), 28 + (i >> 3)]), c(D)), { dl: 1, dd: 2 });
    for (let x = 10; x < 34; x += 4) s.poly([[x, 63], [x + 2, 67 + (x % 8 ? 0 : 1)], [x + 4, 63]], c(D));
    for (const y of [32, 40, 48]) s.line(17, y + sw, 27, y - 2 + sw, c('#7a6ab8', 3));
    for (const sd of [-1, 1]) { const x = 22 + sd * 9, x1 = 22 + sd * (12 + (atk ? 5 : 0)); lay(s, t => tube(t, [[x, 22], [x1, 40], [x1, 56]], 2.5, 2, c(D)), { dl: 1, dd: 1 }); for (let q = -1; q <= 1; q++) s.line(x1 + q * 2, 57, x1 + q * 2 + sd, 62, c('#d8d4e4', 3)); }
    lay(s, t => t.ell(22, 14, 6, 6, c('#3a3448')), { dl: 1, dd: 1 }); s.hl(19, 20, 13, c(PAPER, 4)); s.hl(24, 25, 13, c(PAPER, 4)); s.vl(22, 16, 18, c('#1a1622'));
    lay(s, t => { t.rect(18, 1, 8, 9, c(BLACK)); t.rows(9, [[9, 35], [8, 36]], c(BLACK)); }, { dl: 1, dd: 1 });
  });
}
// 물귀신: 젖은 긴 머리, 창백한 얼굴, 회청 저고리와 물 흐르는 흰 치마
function mulgwi() {
  return make(36, 50, 18, 46, (s, p) => {
    const atk = p === 'atk', sw = p === 'step' ? 1 : 0;
    lay(s, t => t.rows(26, Array.from({ length: 16 }, (_, i) => [11 - (i >> 2), 25 + (i >> 2)]), c('#e8eef2')), { dl: 1, dd: 2 });
    for (const x of [10, 15, 20, 25]) s.vl(x, 30 + (x % 3), 41, c('#b8c8d8'));
    for (const [x, y] of [[12, 34 + sw], [22, 37 - sw], [17, 40]]) { s.set(x, y, c('#6aa8d8', 3)); s.set(x, y + 1, c('#6aa8d8', 2)); }
    s.hl(6, 30, 42, c('#9cc8e0', 3)); s.hl(4, 32, 43, c('#9cc8e0', 2));
    lay(s, t => t.rows(18, [[12, 24], [11, 25], [11, 25], [11, 25], [11, 25], [12, 24], [12, 24], [12, 24]], c('#5a6a8a')), { dl: 1, dd: 1 });
    s.line(15, 18, 18, 22, c(PAPER, 3)); lay(s, t => t.rect(17, 21, 2, 6, c('#a8302a')), { dl: 0, dd: 0 });
    const ax = atk ? 4 : 0; lay(s, t => { t.ell(9 - ax, 24, 2.5, 5, c('#5a6a8a')); t.ell(27 + ax, 24, 2.5, 5, c('#5a6a8a')); t.ell(9 - ax, 30, 2, 2, c('#c8d4dc')); t.ell(27 + ax, 30, 2, 2, c('#c8d4dc')); });
    lay(s, t => { t.rows(5, Array.from({ length: 21 }, (_, i) => [10 - (i > 12 ? 1 : 0), 26 + (i > 12 ? 1 : 0)]), c('#1e2028')); for (let x = 9; x < 28; x += 3) t.vl(x, 26, 27 + (x % 2), c('#1e2028')); }, { dl: 1, dd: 1 });
    lay(s, t => t.ell(18, 12, 6.5, 7.5, c('#c8d4dc')), { dl: 1, dd: 1 });
    s.hl(14, 16, 10, INK); s.hl(20, 22, 10, INK); s.set(15, 11, c('#2a3a5a')); s.set(21, 11, c('#2a3a5a')); s.rect(17, 14, 2, atk ? 3 : 2, c('#2a2a3a'));
    lay(s, t => t.rows(3, [[13, 23], [11, 25], [10, 26], [10, 15], [10, 13]], c('#1e2028')), { dl: 1, dd: 0 });
  });
}
// 달걀귀신 (작은): 흰 소복, 얼굴 없는 달걀 얼굴, 검은 머리, 막대
function egg() {
  return make(32, 50, 15, 46, (s, p) => {
    const atk = p === 'atk', sw = p === 'step' ? 1 : 0;
    lay(s, t => t.rows(20, Array.from({ length: 20 }, (_, i) => [8 - (i >> 2), 22 + (i >> 2)]), c('#f0ece4')), { dl: 1, dd: 2 });
    for (let x = 4; x < 27; x += 4) s.poly([[x, 39], [x + 2, 42], [x + 4, 39]], c('#f0ece4', 1));
    s.line(12, 20, 17, 30, c('#d8d0c4')); lay(s, t => { t.ell(5, 28, 3, 6, c('#f0ece4')); t.ell(25, 28, 3, 6, c('#f0ece4')); });
    const ty = atk ? 15 : 18; s.line(2, ty, 28, ty + (atk ? -4 : 0), c('#d9a441', 3)); s.set(28, ty + (atk ? -4 : 0), c(RED, 3));
    lay(s, t => t.ell(15, 10 + sw, 7, 9, c('#fbf8f2')), { dl: 1, dd: 2 });
    lay(s, t => t.rows(1 + sw, [[11, 19], [9, 21], [8, 22], [8, 11], [8, 10]], c('#1e2028')), { dl: 1, dd: 0 });
  });
}
// 아귀: 가는 팔다리, 부푼 배, 퀭한 눈
function agwi() {
  return make(34, 52, 16, 48, (s, p) => {
    const atk = p === 'atk', st = p === 'step' ? 1 : 0, sk = '#a89a7a';
    for (const [x, d] of [[11, st], [19, -st]]) { lay(s, t => t.rect(x + d, 34, 3, 11, c(sk)), { dl: 1, dd: 0 }); s.rect(x + d - 1, 44, 5, 2, c(sk, 1)); }
    lay(s, t => t.ell(16, 28, 9, 8, c(sk)), { dl: 2, dd: 2 });
    lay(s, t => t.rows(33, [[7, 25], [8, 24], [9, 23]], c('#6a5a46')), { dl: 0, dd: 1 }); for (let x = 8; x < 25; x += 3) s.set(x, 36, -1);
    lay(s, t => t.rect(13, 16, 7, 6, c(sk)), { dl: 1, dd: 1 }); for (const y of [17, 19]) s.hl(13, 19, y, c(sk, 1));
    const ax = atk ? 4 : 0; lay(s, t => { t.line(12, 18, 6 - ax, 28, c(sk), 2); t.line(20, 18, 26 + ax, 28, c(sk), 2); });
    for (const x of [6 - ax, 26 + ax]) { s.set(x - 1, 29, c(sk, 1)); s.set(x, 30, c(sk, 1)); s.set(x + 1, 29, c(sk, 1)); }
    lay(s, t => t.ell(16, 10, 6, 6, c(sk)), { dl: 1, dd: 2 });
    for (const ex of [12, 18]) { lay(s, t => t.ell(ex + 1, 9, 2, 2, c('#3a2e22')), { dl: 0, dd: 0, edge: false }); s.set(ex + 1, 9, c('#ffd24a', 3)); }
    s.vl(16, 13, atk ? 16 : 14, INK); for (const x of [12, 15, 18, 21]) s.set(x, 4, c(sk, 1));
  });
}
// 영노: 금빛 뻗친 머리, 푸른 얼굴, 큰 눈과 송곳니, 혀, 검은 줄무늬 옷과 붉은 띠
function yeongno() {
  return make(48, 68, 22, 64, (s, p) => {
    const atk = p === 'atk', B = p === 'step' ? 1 : 0, sk = '#3a7a7a';
    lay(s, t => t.rows(36 + B, Array.from({ length: 24 }, (_, i) => [10 - (i >> 3), 34 + (i >> 3)]), c('#33344a')), { dl: 1, dd: 2 });
    for (let x = 11; x < 34; x += 3) s.vl(x, 40 + B, 58, c('#33344a', 1)); s.rect(9, 46 + B, 27, 3, c('#c8302a')); lay(s, t => t.rect(26, 48 + B, 3, 7, c('#c8302a')), { dl: 0, dd: 1 });
    for (const x of [13, 27]) s.rect(x, 59, 6, 3, c('#d9a441', 3));
    const ax = atk ? 4 : 0; lay(s, t => { t.ell(7 - ax, 44, 4, 6, c('#33344a')); t.ell(37 + ax, 44, 4, 6, c('#33344a')); t.ell(7 - ax, 50, 3, 3, c(sk)); t.ell(37 + ax, 50, 3, 3, c(sk)); });
    for (const x of [7 - ax, 37 + ax]) for (let q = -1; q <= 1; q++) s.set(x + q * 2, 54, c(PAPER, 3));
    for (let a = 0; a < 13; a++) { const q = Math.PI * (1.05 + a * 0.075), x0 = 22 + Math.cos(q) * 12, y0 = 22 + Math.sin(q) * 12, x1 = 22 + Math.cos(q) * 20, y1 = 22 + Math.sin(q) * 20; lay(s, t => tube(t, [[x0, y0], [x1, y1]], 1.8, 1, c('#e0b23c', 3)), { dl: 0, dd: 0 }); }
    lay(s, t => t.ell(22, 24 + B, 13, 12, c(sk)), { dl: 1, dd: 2 });
    for (const ex of [14, 24]) { lay(s, t => t.ell(ex + 3, 21 + B, 3.5, 3.5, c(PAPER, 4)), { dl: 0, dd: 0, edgeCol: INK }); s.rect(ex + 3, 21 + B, 2, 2, c('#c8302a', 3)); s.set(ex + 4, 22 + B, INK); }
    s.rect(20, 26 + B, 4, 2, c(sk, 0));
    lay(s, t => t.rows(29 + B, [[13, 31], [14, 30], [15, 29]], c('#4a1230')), { dl: 0, dd: 0, edgeCol: INK }); for (const x of [14, 29]) { s.vl(x, 29 + B, 31 + B, c(PAPER, 4)); }
    lay(s, t => t.rect(20, 31 + B, 4, atk ? 6 : 4, c('#e8503a')), { dl: 0, dd: 1 });
  });
}
// 걸어 다니는 장승: 검은 관, 부릅뜬 눈, 이를 드러낸 입, 나뭇결 (작은 묘목 장승도)
function jangseungWalk(k) {
  const Z = v => R(v * k);
  return make(Z(34), Z(68), Z(16), Z(64), (s, p) => {
    const atk = p === 'atk', st = p === 'step' ? 1 : 0, wood = '#b0804a';
    for (const [x, d] of [[8, st], [18, -st]]) lay(s, t => t.rect(Z(x) + d, Z(58), Z(6), Z(6), c('#6a4428')));
    lay(s, t => t.rect(Z(5), Z(12), Z(22), Z(48), c(wood)), { dl: 1, dd: 2 });
    for (const x of [8, 13, 19, 24]) for (let y = 30 + (x % 5); y < 58; y += 8) s.vl(Z(x), Z(y), Z(y + 4), c(wood, 1));
    lay(s, t => { t.rect(Z(8), Z(4), Z(16), Z(8), c(BLACK)); t.rect(Z(3), Z(11), Z(26), Z(3), c(BLACK)); }, { dl: 1, dd: 1 });
    for (const ex of [8, 18]) { lay(s, t => t.ell(Z(ex + 3), Z(19), Z(3.5), Z(2.5), c(PAPER, 4)), { dl: 0, dd: 0, edgeCol: INK }); s.rect(Z(ex + 3), Z(18), Math.max(1, Z(2)), Math.max(1, Z(2)), INK); s.line(Z(ex), Z(15), Z(ex + 6), Z(ex < 12 ? 17 : 15), INK, Math.max(1, Z(1.2))); }
    s.vl(Z(16), Z(21), Z(26), c(wood, 0));
    lay(s, t => t.rect(Z(9), Z(27), Z(14), Z(atk ? 7 : 5), c('#3a1a14')), { dl: 0, dd: 0, edgeCol: INK }); for (let x = 10; x < 22; x += 3) s.rect(Z(x), Z(28), Math.max(1, Z(2)), Math.max(1, Z(atk ? 5 : 3)), c(PAPER, 4));
  });
}
// 허수아비: 패랭이, 짚 머리, 기운 옷과 십자 막대
function decoy() {
  return make(40, 50, 18, 46, (s, p) => {
    const sw = p === 'step' ? 1 : 0;
    lay(s, t => t.rect(17, 24, 3, 22, c('#8a5a30')), { dl: 1, dd: 1 });
    lay(s, t => t.rect(2, 21, 32, 3, c('#8a5a30')), { dl: 1, dd: 1 });
    for (const x of [1, 34]) for (let q = 0; q < 4; q++) s.line(x + (x < 10 ? 0 : 1), 22, x + (x < 10 ? -2 : 3), 18 + q * 2 + sw, c('#e0b84a', 3));
    lay(s, t => t.rows(20, Array.from({ length: 16 }, (_, i) => [11 - (i >> 2), 25 + (i >> 2)]), c('#d8ccaa')), { dl: 1, dd: 2 });
    s.rect(12, 26, 4, 4, c('#c8302a')); s.rect(20, 30, 4, 3, c('#2f4d7e')); for (const x of [9, 14, 19, 24]) s.vl(x, 36, 38, c('#e0b84a', 3));
    lay(s, t => t.ell(18, 15, 6, 6, c('#e0b84a', 3)), { dl: 1, dd: 1 }); for (const x of [14, 17, 20, 23]) s.vl(x, 11, 19, c('#c8983a'));
    s.set(16, 15, INK); s.set(20, 15, INK); s.hl(16, 20, 18, c('#8a5a30'));
    lay(s, t => { t.rows(6, [[14, 22], [13, 23]], c('#d4a64a')); t.rows(8, [[7, 29], [6, 30]], c('#d4a64a')); }, { dl: 1, dd: 1 }); s.hl(13, 23, 7, c('#2f4d7e'));
  });
}
function stake() {
  return make(16, 38, 7, 34, (s, p) => {
    lay(s, t => { t.rect(4, 8, 7, 26, c('#8a5a30')); t.poly([[4, 8], [7, 1], [10, 8]], c('#8a5a30')); }, { dl: 1, dd: 2 });
    s.hl(4, 10, 22, c('#d8c08a', 3)); s.hl(4, 10, 24, c('#d8c08a', 3)); s.vl(6, 10, 20, c('#8a5a30', 1));
  });
}

// ───────── 수레·소품 ─────────
// 바퀴 (살 여섯, 쇠테)
function wheel(s, x, y, r, rot = 0, rim = '#6a4428', hub = '#d9a441', iron = false) {
  lay(s, t => t.ell(x, y, r, r, c(rim)), { dl: 1, dd: 1 }); lay(s, t => t.ell(x, y, r - 2.2, r - 2.2, -1), { edge: false, dl: 0, dd: 0 });
  if (iron) for (let a = 0; a < 6.3; a += 0.7) s.set(R(x + Math.cos(a) * (r - 0.6)), R(y + Math.sin(a) * (r - 0.6)), c('#9aa4b0', 3));
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI + rot; s.line(R(x - Math.cos(a) * (r - 2)), R(y - Math.sin(a) * (r - 2)), R(x + Math.cos(a) * (r - 2)), R(y + Math.sin(a) * (r - 2)), c(rim, 1)); }
  lay(s, t => t.ell(x, y, 2, 2, c(hub, 3)), { dl: 0, dd: 1 });
}
// 깃발 수레: 우리 군의 깃대 (청색 군기에 삼태극, 붉은 테) 와 북 실은 수레
function bannerCart() {
  return make(66, 98, 30, 92, (s, p) => {
    const wv = p === 'step' ? 1 : 0, atk = p === 'atk';
    lay(s, t => t.line(2, 82, 14, 76, c('#6a4428'), 3), { dl: 1, dd: 1 });
    lay(s, t => t.rect(10, 70, 44, 8, c('#8a5a30')), { dl: 1, dd: 2 }); for (let x = 12; x < 54; x += 6) s.vl(x, 71, 76, c('#8a5a30', 1));
    // 북
    lay(s, t => t.rect(34, 50, 16, 20, c('#c8302a')), { dl: 1, dd: 2 }); for (let x = 36; x < 50; x += 3) s.vl(x, 52, 68, c('#a8202a'));
    lay(s, t => t.ell(42, 50, 8, 3, c('#f0e6cc')), { dl: 1, dd: 0 }); s.hl(34, 49, 54, c('#d9a441', 3)); s.hl(34, 49, 66, c('#d9a441', 3));
    // 깃대와 군기
    lay(s, t => t.rect(17, 6, 3, 66, c('#7a4a28')), { dl: 1, dd: 1 }); lay(s, t => t.poly([[16, 7], [18, 0], [21, 7]], c('#d9a441', 3)), { dl: 1, dd: 1 });
    const fy = 10, sag = wv ? 1 : 0;
    lay(s, t => t.poly([[20, fy], [56, fy + 2 + sag], [55, fy + 30 + sag], [20, fy + 28]], c('#2f4d8e')), { dl: 1, dd: 2 });
    s.line(20, fy + 1, 56, fy + 3 + sag, c('#c8302a', 3)); s.line(20, fy + 2, 56, fy + 4 + sag, c('#c8302a', 2)); s.line(20, fy + 27, 55, fy + 29 + sag, c('#c8302a', 3)); s.line(20, fy + 26, 55, fy + 28 + sag, c('#c8302a', 2));
    // 삼태극: 붉은·푸른·노란 세 갈래
    const cx = 38, cy = fy + 15 + (sag ? 1 : 0); lay(s, t => t.ell(cx, cy, 7, 7, c(PAPER, 4)), { dl: 0, dd: 0, edgeCol: c('#1a2440') });
    for (let y = -5; y <= 5; y++) for (let x = -5; x <= 5; x++) { if (x * x + y * y > 26) continue; const a = Math.atan2(y, x) + Math.hypot(x, y) * 0.32, q = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2); s.set(cx + x, cy + y, q < 2.1 ? c('#c8302a', 3) : q < 4.2 ? c('#2f4d8e', 3) : c('#e0b23c', 3)); }
    for (const [x, y] of [[19, 46], [19, 52]]) s.line(x, y, x + 4, y - 4, c('#d9a441', 3));
    wheel(s, 18, 80, 9, wv * 0.3); wheel(s, 46, 80, 9, wv * 0.3);
    if (atk) for (let k = 0; k < 3; k++) s.line(52 + k * 3, 48 - k * 2, 56 + k * 3, 44 - k * 3, c(PAPER, 4));
  });
}
// 화차 (신기전 · 총통) · 포 수레 · 투석기
function hwacha(kind) {
  return make(66, 60, 30, 54, (s, p) => {
    const atk = p === 'atk', rt = p === 'step' ? 0.3 : 0;
    lay(s, t => t.line(2, 46, 14, 40, c('#6a4428'), 3), { dl: 1, dd: 1 });
    lay(s, t => t.rect(10, 36, 44, 7, c(kind === 'rocket' ? '#8a2a26' : '#8a5a30')), { dl: 1, dd: 2 });
    if (kind === 'rocket') {
      lay(s, t => t.poly([[20, 38], [28, 8], [52, 14], [46, 40]], c('#8a5a30')), { dl: 1, dd: 2 });
      for (let r = 0; r < 5; r++) for (let q = 0; q < 5; q++) s.rect(25 + q * 5 + R(r * -1.2), 14 + r * 5, 2, 2, c('#3a2418'));
      for (let q = 0; q < 6; q++) { const x = 28 + q * 4, y = atk && q % 2 ? 0 : 4; lay(s, t => t.line(x, y + 12, x + 4, y, c(PAPER, 3), 1), { dl: 0, dd: 0 }); s.rect(x + 3, y - 2, 2, 3, c('#3a3a44')); s.set(x + 1, y + 8, c(RED, 3)); }
      lay(s, t => t.poly([[22, 6], [22, -2], [12, 2]], c('#c8302a')), { dl: 0, dd: 1 }); s.vl(22, -2, 10, c('#6a4428'));
      if (atk) flame(s, 36, 44, '#f08a2a', 8, 1);
    } else if (kind === 'bronze') {
      for (let q = 0; q < 3; q++) { const y = 30 - q * 7, x = 14 + q * 3; lay(s, t => { t.rect(x, y, 30, 6, c('#c8963a')); t.ell(x + 30, y + 3, 2, 3, c('#c8963a')); }, { dl: 1, dd: 2 }); for (const bx of [x + 6, x + 16, x + 26]) s.vl(bx, y, y + 5, c('#8a5a20')); s.rect(x + 31, y + 2, 2, 2, INK); }
      if (atk) for (let k = 0; k < 3; k++) lay(s, t => t.ell(52 + k * 4, 14 - k * 2, 3 + k, 3 + k, c('#e8e4dc', 3)), { dl: 0, dd: 1 });
    } else if (kind === 'cannon') {
      lay(s, t => { t.rect(18, 22, 26, 14, c('#8a5a30')); }, { dl: 1, dd: 2 });
      for (let r = 0; r < 3; r++) for (let q = 0; q < 5; q++) s.rect(21 + q * 5, 25 + r * 4, 2, 2, c('#3a2418'));
      for (const x of [22, 30, 38]) { lay(s, t => t.line(x, 22, x + 2, 14 - (atk ? 4 : 0), c(PAPER, 3), 1), { dl: 0, dd: 0 }); s.poly([[x, 15 - (atk ? 4 : 0)], [x + 2, 10 - (atk ? 4 : 0)], [x + 4, 15 - (atk ? 4 : 0)]], c(RED, 3)); }
    }
    wheel(s, 20, 46, 8, rt, '#6a4428', '#d9a441', kind !== 'cannon'); wheel(s, 46, 46, 8, rt, '#6a4428', '#d9a441', kind !== 'cannon');
  });
}
function catapult() {
  return make(60, 50, 31, 46, (s, p) => {
    const atk = p === 'atk', fr = '#8a5a30';
    lay(s, t => { t.rect(10, 30, 40, 7, c(fr)); t.poly([[28, 30], [34, 14], [40, 14], [46, 30]], c(fr)); }, { dl: 1, dd: 2 });
    lay(s, t => t.ell(37, 15, 2, 2, c('#3a3a44')), { dl: 0, dd: 0 });
    const ax = atk ? [52, 2] : [10, 6];
    lay(s, t => t.line(40, 26, ax[0], ax[1], c('#a87a48'), 3), { dl: 1, dd: 1 });
    lay(s, t => t.ell(ax[0], ax[1], 4.5, 4.5, c('#8890a0')), { dl: 1, dd: 2 });
    for (const x of [14, 46]) s.rect(x, 32, 3, 3, c('#3a3a44'));
    wheel(s, 18, 40, 7); wheel(s, 42, 40, 7);
  });
}
// 범종 걸이: 기와 지붕, 기둥, 푸른 동종과 당목
function bellFrame() {
  return make(70, 80, 35, 76, (s, p) => {
    const atk = p === 'atk', sw = p === 'step' ? 1 : 0, wood = '#8a5a30';
    lay(s, t => { t.rect(12, 14, 4, 62, c(wood)); t.rect(56, 14, 4, 62, c(wood)); t.rect(10, 72, 8, 4, c(wood, 1)); t.rect(54, 72, 8, 4, c(wood, 1)); t.rect(8, 12, 56, 5, c(wood)); }, { dl: 1, dd: 2 });
    lay(s, t => t.poly([[4, 12], [36, 1], [68, 12]], c('#3a3a4a')), { dl: 1, dd: 1 }); s.hl(6, 66, 11, c('#3a3a4a', 3));
    lay(s, t => t.rect(34, 17, 3, 6, c('#3a3a44')));
    lay(s, t => { t.rows(22, Array.from({ length: 28 }, (_, i) => [26 - (i >> 2), 46 + (i >> 2)]), c('#5a8a74')); t.rect(19, 48, 34, 4, c('#5a8a74')); }, { dl: 2, dd: 2 });
    for (const y of [27, 44]) s.hl(23, 49, y, c('#5a8a74', 1)); lay(s, t => t.ell(36, 37, 4, 4, c('#7aaa90', 3)), { dl: 0, dd: 0, edgeCol: c('#3a6a54') }); s.set(36, 37, c('#3a6a54'));
    const bx = atk ? 12 : 4; lay(s, t => { t.rect(bx, 36, 18, 5, c('#a87a48')); t.rect(bx + 16, 36, 3, 5, c('#d9a441', 3)); }, { dl: 1, dd: 1 }); s.line(bx + 2, 36, 14, 18 + sw, c('#d8c08a', 3));
  });
}
// 나무 우리: 지붕판, 창살, 갇힌 사람 그림자, 새끼줄 매듭
function cage() {
  return make(70, 72, 35, 68, (s, p) => {
    const sw = p === 'step' ? 1 : 0, wood = '#8a5a30';
    lay(s, t => { t.ell(36, 22 + sw, 7, 7, c(BLACK)); t.rows(28, Array.from({ length: 34 }, (_, i) => [28 - (i >> 2), 44 + (i >> 2)]), c('#e8e4d8')); }, { dl: 1, dd: 1 });
    lay(s, t => t.ell(36, 24 + sw, 5, 6, c('#f0cca0')), { dl: 1, dd: 1 }); s.set(34, 24 + sw, INK); s.set(38, 24 + sw, INK);
    for (const x of [8, 20, 32, 44, 56]) lay(s, t => t.rect(x + 2, 12, 4, 54, c(wood)), { dl: 1, dd: 1 });
    lay(s, t => { t.poly([[4, 12], [8, 6], [64, 6], [68, 12]], c(wood)); t.rect(6, 62, 60, 6, c(wood)); }, { dl: 1, dd: 2 });
    for (const [x, y] of [[22, 26], [46, 26], [22, 52], [46, 52]]) { s.line(x - 3, y - 3, x + 3, y + 3, c('#d8c08a', 3), 2); s.line(x + 3, y - 3, x - 3, y + 3, c('#d8c08a', 3), 2); }
  });
}
// 여의주: 불꽃에 싸인 푸른 구슬
function pearl() {
  return make(48, 68, 23, 64, (s, p) => {
    const atk = p === 'atk', ph = p === 'step' ? 1 : -1;
    for (const [x, y, h] of [[12, 28, 16], [34, 28, 16], [23, 22, 22], [16, 22, 12], [30, 22, 12]]) flame(s, x, y, '#f0a83a', h + (atk ? 4 : 0), ph);
    lay(s, t => t.ell(23, 34, 12, 12, c('#3a8ad0')), { dl: 2, dd: 3 });
    lay(s, t => t.ell(19, 29, 4, 3, c('#d8f0ff', 3)), { dl: 0, dd: 0, edge: false }); s.hl(18, 28, 40, c('#2a5a9a')); s.set(17, 39, c('#2a5a9a')); s.set(29, 39, c('#2a5a9a'));
  });
}
// 업경대: 불꽃 테 두른 둥근 거울과 받침
function mirror() {
  return make(58, 74, 27, 70, (s, p) => {
    const atk = p === 'atk', ph = p === 'step' ? 1 : 0;
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2 + ph * 0.26, r0 = 16, r1 = 23; lay(s, t => t.poly([[27 + Math.cos(a - 0.22) * r0, 28 + Math.sin(a - 0.22) * r0], [27 + Math.cos(a) * r1, 28 + Math.sin(a) * r1], [27 + Math.cos(a + 0.22) * r0, 28 + Math.sin(a + 0.22) * r0]], c(k % 2 ? '#f0a83a' : '#e8503a', 3)), { dl: 0, dd: 1 }); }
    lay(s, t => t.ell(27, 28, 17, 17, c('#8a1c30')), { dl: 1, dd: 2 }); lay(s, t => t.ell(27, 28, 13, 13, c('#d9a441', 3)), { dl: 0, dd: 1 });
    lay(s, t => t.ell(27, 28, 11, 11, c(atk ? '#fff6d8' : '#d8e0ec', 3)), { dl: 1, dd: 2, edge: false }); s.line(21, 24, 29, 18, c(PAPER, 4), 2); s.line(23, 30, 31, 24, c(PAPER, 4));
    lay(s, t => { t.rect(25, 45, 5, 14, c('#8a1c30')); t.rect(24, 56, 7, 3, c('#d9a441', 3)); t.poly([[16, 70], [20, 59], [34, 59], [38, 70]], c('#8a1c30')); }, { dl: 1, dd: 2 });
  });
}
// 체 (대나무 받침에 건 체)
function sieve() {
  return make(42, 68, 20, 64, (s, p) => {
    const sw = p === 'step' ? 1 : 0, wood = '#a87a48';
    lay(s, t => { t.line(10, 64, 16, 8, c(wood), 3); t.line(30, 64, 24, 8, c(wood), 3); t.rect(11, 8, 18, 3, c(wood)); }, { dl: 1, dd: 1 });
    lay(s, t => t.ell(20, 32 + sw, 15, 15, c('#b8864a')), { dl: 1, dd: 2 }); lay(s, t => t.ell(20, 32 + sw, 12, 12, c('#e8d09a', 3)), { dl: 0, dd: 1 });
    for (let k = -10; k <= 10; k += 3) { s.line(20 + k, 22 + sw, 20 + k, 42 + sw, c('#c8a46a')); s.line(10, 32 + k + sw, 30, 32 + k + sw, c('#c8a46a')); }
    lay(s, t => t.ell(20, 32 + sw, 12, 12, -1), { edge: false, dl: 0, dd: 0 }); for (let k = -10; k <= 10; k += 3) for (let q = -10; q <= 10; q += 3) if (k * k + q * q < 130) s.set(20 + k, 32 + q + sw, c('#c8a46a', 1));
    s.vl(20, 11, 17 + sw, c('#d8c08a', 3));
  });
}
// 앞을 보는 범 얼굴 (작은 범·누운 범)
function catHead(s, X, Y, Z, o, atk) {
  const T = n => c(o.coat, n), B = c(o.stripe), Wt = c(o.belly || '#fff6e0', 3), m = v => Math.max(1, Z(v));
  lay(s, t => { t.poly([[X - Z(12), Y - Z(6)], [X - Z(10), Y - Z(16)], [X - Z(3), Y - Z(9)]], T(2)); t.poly([[X + Z(12), Y - Z(6)], [X + Z(10), Y - Z(16)], [X + Z(3), Y - Z(9)]], T(2)); t.ell(X, Y, Z(13), Z(11), T(2)); t.poly([[X - Z(15), Y + Z(2)], [X - Z(9), Y - Z(2)], [X - Z(10), Y + Z(7)]], T(2)); t.poly([[X + Z(15), Y + Z(2)], [X + Z(9), Y - Z(2)], [X + Z(10), Y + Z(7)]], T(2)); }, { dl: 2, dd: 2 });
  s.set(X - Z(10), Y - Z(12), c('#e87090', 3)); s.set(X + Z(10), Y - Z(12), c('#e87090', 3));
  lay(s, t => t.ell(X, Y + Z(5), Z(8), Z(5), Wt), { dl: 0, dd: 1 });
  for (const sx of [-1, 1]) { s.hl(X + sx * Z(9), X + sx * Z(13), Y - Z(1), B); s.hl(X + sx * Z(10), X + sx * Z(14), Y + Z(2), B); }
  s.hl(X - Z(2), X + Z(2), Y - Z(9), B); s.hl(X - Z(1), X + Z(1), Y - Z(7), B); s.set(X - Z(5), Y - Z(8), B); s.set(X + Z(5), Y - Z(8), B);
  for (const ex of [X - Z(8), X + Z(3)]) { if (o.sleep) s.hl(ex, ex + m(5), Y - Z(2), INK); else { s.rect(ex, Y - Z(4), Math.max(3, Z(5)), Math.max(2, Z(3)), c(o.eye || '#ffd24a', 3)); s.rect(ex + m(2), Y - Z(4), m(1.5), Math.max(2, Z(3)), INK); s.hl(ex - 1, ex + Math.max(3, Z(5)), Y - Z(4) - 1, INK); } }
  s.rect(X - m(1.5), Y + Z(2), Math.max(2, Z(3)), m(2), c('#e87090', 3));
  if (atk) { s.rect(X - Z(4), Y + Z(5), Math.max(3, Z(8)), Math.max(2, Z(4)), c('#4a1230')); s.vl(X - Z(3), Y + Z(5), Y + Z(7), c(PAPER, 4)); s.vl(X + Z(3), Y + Z(5), Y + Z(7), c(PAPER, 4)); } else { s.hl(X - Z(3), X + Z(3), Y + Z(7), INK); s.set(X, Y + Z(5), INK); }
}
// 엎드린 범 · 잠든 범: 손으로 찍은 범의 몸을 눕혀 다시 찍는다
function lyingTiger(o) {
  const k = o.k || 1, Z = v => R(v * k);
  return make(Z(114), Z(52), Z(50), Z(46), (s, p) => {
    const sw = p === 'step' ? 1 : 0, T = n => c(o.coat, n), B = c(o.stripe), Wt = c(o.belly || '#fff6e0', 3);
    lay(s, t => tube(t, [[Z(14), Z(36)], [Z(6), Z(40)], [Z(10 + sw), Z(46)], [Z(30), Z(46)]], Z(3.5), Z(3), T(2)), { dl: 1, dd: 1 });
    lay(s, t => { t.ell(Z(46), Z(32), Z(34), Z(12), T(2)); t.ell(Z(24), Z(32), Z(12), Z(12), T(2)); }, { dl: 2, dd: 2 });
    lay(s, t => t.ell(Z(48), Z(42), Z(28), Z(3), Wt), { dl: 0, dd: 0, edge: false });
    for (let x = 20; x < 76; x += 7) s.poly([[Z(x), Z(20 + (x % 3))], [Z(x + 3), Z(20 + (x % 3))], [Z(x + 1), Z(34)]], B);
    lay(s, t => { t.ell(Z(22), Z(36), Z(8), Z(7), T(2)); t.rect(Z(66), Z(40), Z(22), Z(6), T(2)); }, { dl: 1, dd: 2 }); for (const x of [20, 24]) s.vl(Z(x), Z(33), Z(38), B);
    for (let q = 0; q < 3; q++) s.set(Z(84 + q * 2), Z(45), c(PAPER, 4));
    catHead(s, Z(94), Z(26), Z, o, false);
  });
}

export const BOSSES = {
  gumiho: () => fox(9), foxfake: () => fox(0, true),
  serpent: () => snake({ k: 1, body: '#8a7a3a', belly: '#e0cc90', mark: '#4a3a1e', eye: '#ffd24a' }),
  imugi: () => snake({ k: 1.22, body: '#3a6a8a', belly: '#a8d0d8', mark: '#22405a', eye: '#bfe8ff', fin: '#9cd0e8', horn: '#e8e0c8' }),
  bulgaboss: () => bulga(), plague: () => plague(), reaper: () => reaper(), yeomra: () => yeomra(), foxhalmi: () => foxhalmi(),
};
for (let n = 1; n < 9; n++) BOSSES['gumiho' + n] = () => fox(n);
Object.assign(BOSSES, {
  warchief: () => bigDok({ skin: '#4a6aa8', hair: BLACK, band: '#eeeae0', topknot: true, pants: '#d8ccaa', patch: true, bracelet: true }),
  dueokboss: () => bigDok({ skin: '#6e6c80', hair: '#a8302a', brow: '#a8302a', pants: '#4a3a34', patch: true, bracelet: true }),
  duduri: () => bigDok({ skin: '#3f7c7a', hair: BLACK, band: '#eeeae0', topknot: true, pants: '#4a3a34', vest: '#7a5236', spots: true, studs: true, bracelet: true }),
  oenun: () => bigDok({ skin: '#857c70', hair: '#3a3430', pants: '#5a4a3a', vest: '#5a4a3a', oneEye: true, rock: true, patch: true }),
  anggwaeng: () => bigDok({ skin: '#6c7690', hair: '#3a3a4a', pants: '#3a3e58', shoes: true, shoesHat: true, sack: true, bracelet: true }),
  skelking: () => eoduk(), elder: () => elder(),
  bulgae: () => beast({ k: 1.45, body: '#2c2630', leg: '#24202a', claws: true, ear: 'point', eye: '#ffb43a', muzzle: 18, front: (s, P, HX, HY) => { lay(s, t => t.ell(P.X(HX + 19), P.Y(HY + 4), P.Z(6), P.Z(6), c('#ffd860', 3)), { edgeCol: c('#c88a1a', 2) }); s.set(P.X(HX + 17), P.Y(HY + 2), c(PAPER, 4)); for (const [x, y] of [[40, 44], [58, 50], [26, 50], [70, 40]]) { for (let a = 0; a < 5; a += 0.6) s.set(P.X(x) + R(Math.cos(a) * (1 + a * 0.7)), P.Y(y) + R(Math.sin(a) * (1 + a * 0.7)), c('#ff7a2a', 3)); } }, back: fireMane(11, 22, 84, 32, 14, 9, 12), tailPts: [[22, 44], [12, 38], [6, 26], [8, 16]], tailR0: 3, tailR1: 2, mid: (s, P) => flame(s, P.X(8), P.Y(16), '#f08a2a', P.Z(16), P.st ? 1 : -1) }),
  gangcheolwang: () => beast({ k: 1.25, type: 'horse', body: '#3a4664', hoof: '#1a1e2a', eye: '#ffb43a', back: fireMane(9, 26, 80, 30, 6, 8, 11), tailPts: [[22, 44], [12, 40], [6, 32], [4, 24]], tailCol: '#f08a2a', mid: (s, P) => { for (let r = 0; r < 3; r++) for (let x = 28; x < 70; x += 6) s.poly([[P.X(x), P.Y(40 + r * 5)], [P.X(x + 3), P.Y(43 + r * 5)], [P.X(x + 6), P.Y(40 + r * 5)]], c('#2a3450')); }, front: (s, P, HX, HY) => { lay(s, t => { t.poly([[P.X(HX - 6), P.Y(HY - 14)], [P.X(HX - 10), P.Y(HY - 24)], [P.X(HX - 2), P.Y(HY - 15)]], c('#c8ccd6', 3)); t.poly([[P.X(HX - 2), P.Y(HY - 14)], [P.X(HX - 3), P.Y(HY - 25)], [P.X(HX + 2), P.Y(HY - 14)]], c('#c8ccd6', 3)); }); lay(s, t => { t.line(P.X(HX + 6), P.Y(HY + 8), P.X(HX + 9), P.Y(HY + 18), c('#e8c040', 3), 2); t.line(P.X(HX + 9), P.Y(HY + 8), P.X(HX + 12), P.Y(HY + 17), c('#e8c040', 3), 2); }, { dl: 0, dd: 0 }); for (let q = 0; q < 4; q++) lay(s, t => t.ell(P.X(HX + 16 + q * 4), P.Y(HY + 2 - q * 2), P.Z(2 + q * 0.6), P.Z(2 + q * 0.6), c('#e8e4dc', 3)), { dl: 0, dd: 1 }); } }),
  yongma: () => beast({ k: 1.05, type: 'horse', body: '#e4ecf4', hoof: '#3a4a6a', eye: '#1a2440', margin: 8, tailPts: [[22, 44], [12, 44], [6, 54], [4, 64]], tailR0: 4, tailR1: 2.5, tailCol: '#4a8ad0', mid: (s, P) => { for (let r = 0; r < 4; r++) for (let x = 30 + (r % 2) * 3; x < 72; x += 6) s.hl(P.X(x), P.X(x + 3), P.Y(38 + r * 5), c('#9cc0e0', 3)); }, back: (s, P) => { const up = P.st ? 6 : 0; lay(s, t => t.poly([[P.X(46), P.Y(38)], [P.X(56), P.Y(30)], [P.X(50), P.Y(12 - up)], [P.X(38), P.Y(0 - up)], [P.X(24), P.Y(-4 - up)], [P.X(28), P.Y(6 - up)], [P.X(22), P.Y(10 - up)], [P.X(30), P.Y(18 - up)], [P.X(26), P.Y(24 - up * 0.5)], [P.X(38), P.Y(30)]], c('#c8dcf0', 3)), { edgeCol: c('#5a7ab0', 1) }); for (let i = 0; i < 4; i++) s.line(P.X(48), P.Y(32), P.X(26 + i * 6), P.Y(-2 + i * 7 - up * (1 - i / 4)), c('#8aaad8', 2)); for (let i = 0; i < 3; i++) s.hl(P.X(36 + i * 4), P.X(44 + i * 3), P.Y(8 + i * 6 - up * 0.6), c(PAPER, 4)); }, front: (s, P, HX, HY) => { lay(s, t => { for (let i = 0; i < 6; i++) t.poly([[P.X(HX - 10 - i * 2), P.Y(HY - 8 + i * 5)], [P.X(HX - 18 - i * 2), P.Y(HY - 14 + i * 5)], [P.X(HX - 12 - i * 2), P.Y(HY - 2 + i * 5)]], c('#3a7ac8')); }, { edgeCol: c('#22508a') }); lay(s, t => tube(t, [[P.X(HX + 10), P.Y(HY + 9)], [P.X(HX + 13), P.Y(HY + 16)], [P.X(HX + 11), P.Y(HY + 22)]], 1.2, 1, c('#3a7ac8')), { dl: 0, dd: 0 }); } }),
  jinewang: () => centipede({ k: 1 }), daejeok: () => threeHead(), dalgyalwang: () => eggKing(false), dalgyalwang_crack: () => eggKing(true), gangrim: () => gangrim(), mujang: () => mujang(), dokbang: () => dokbang(),
});
Object.assign(BOSSES, {
  magpie, samjoko, sapsal, haetae, tiger: smallTiger, wolf: boar, rassassin: () => smallFox(5, '#efe2c8'), foxrun: foxRun,
  jine: () => crawler(9, 4, {}), jinebit: () => crawler(6, 2.5, {}), myodusa, bat, toad, whirl, bomber: wisp,
  bulga: () => bulga({ k: 0.62 }),
  gangcheol: () => beast({ k: 0.62, type: 'horse', body: '#2a2630', hoof: '#14121a', eye: '#ffb43a', back: fireMane(7, 26, 80, 30, 8, 7, 10), tailPts: [[22, 44], [12, 40], [6, 32], [4, 24]], tailCol: '#f08a2a', mid: (s, P) => { for (const [x, y] of [[34, 40], [48, 46], [62, 40]]) { s.line(P.X(x), P.Y(y), P.X(x + 4), P.Y(y - 4), c('#ff9a3a', 3)); s.line(P.X(x + 4), P.Y(y - 4), P.X(x + 6), P.Y(y + 2), c('#ff9a3a', 3)); } } }),
});
Object.assign(BOSSES, { geuseun, mulgwi, dalgyal: egg, agwi, yeongno, treant: () => jangseungWalk(1), sapling: () => jangseungWalk(0.56), decoy, stake });
const TTEOK = { coat: '#e88420', stripe: '#241c22' }, JANGSAN = { coat: '#f3efe6', stripe: '#9c968a', belly: '#ffffff' };
Object.assign(BOSSES, {
  banner: bannerCart, br_singijeon: () => hwacha('rocket'), br_chongtong: () => hwacha('bronze'), cannon: () => hwacha('cannon'), catapult,
  bell: bellFrame, cage, pearl, mirror, sieve,
  tigerboss_lie: () => lyingTiger(Object.assign({ k: 1 }, TTEOK)), tigerboss_sleep: () => lyingTiger(Object.assign({ k: 1, sleep: true }, TTEOK)),
  jangsan_lie: () => lyingTiger(Object.assign({ k: 0.62 }, JANGSAN)), jangsan_sleep: () => lyingTiger(Object.assign({ k: 0.62, sleep: true }, JANGSAN)),
});
