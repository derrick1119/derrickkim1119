// 그림 기호: 글자 대신 찍는 작은 그림. 도장·낙관에는 또렷한 그림으로, 힘을 줘야 하는 자리에는 붓으로 그린 그림으로 찍는다
// 기호 하나는 가로세로 100 칸(가운데가 원점, ±46 안)에 획·면·점 몇 개로 그린다. 같은 그림을 두 가지 붓으로 그린다:
//   또렷하게(도장) = 깨끗한 면과 선,  붓으로(brush) = 굵기가 변하는 붓 획, 마른 붓 자국, 우는 가장자리
// 한 번 그린 그림은 구워 두고 돌려 쓴다 (크기·색·붓마다 한 장)
import { TAU, INK, RED, INDIGO, OCHRE, makeCanvas } from './draw.js';
import { brushStroke, drawInk, MEOK } from './ink.js';

const PI = Math.PI;
const rng = seed => { let s = (Math.imul(seed | 0, 2654435761) ^ 0x9e3779b9) >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; };

// ── 길: 'M x,y L x,y Q cx,cy x,y C ax,ay bx,by x,y Z' 를 점의 줄로 편다 ──
function flatten(d) {
  const tk = d.match(/[MLQCZ]|-?[\d.]+(?:e-?\d+)?/g), pts = []; let i = 0, x = 0, y = 0, closed = false; const num = () => +tk[i++];
  while (i < tk.length) {
    const c = tk[i++];
    if (c === 'M' || c === 'L') { x = num(); y = num(); pts.push([x, y]); }
    else if (c === 'Q') { const cx = num(), cy = num(), ex = num(), ey = num(); for (let k = 1; k <= 10; k++) { const t = k / 10, u = 1 - t; pts.push([u * u * x + 2 * u * t * cx + t * t * ex, u * u * y + 2 * u * t * cy + t * t * ey]); } x = ex; y = ey; }
    else if (c === 'C') { const ax = num(), ay = num(), bx = num(), by = num(), ex = num(), ey = num(); for (let k = 1; k <= 14; k++) { const t = k / 14, u = 1 - t; pts.push([u * u * u * x + 3 * u * u * t * ax + 3 * u * t * t * bx + t * t * t * ex, u * u * u * y + 3 * u * u * t * ay + 3 * u * t * t * by + t * t * t * ey]); } x = ex; y = ey; }
    else if (c === 'Z') closed = true;
  }
  return { pts, closed };
}
// 점의 줄을 길이에 따라 고르게 다시 짚는다: at(t) = 길의 t(0~1) 지점
function along(pts) {
  const acc = [0]; for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = acc[acc.length - 1] || 1; let j = 1;
  return { L, at: t => { const s = Math.max(0, Math.min(1, t)) * L; if (s < acc[j - 1]) j = 1; while (j < pts.length - 1 && acc[j] < s) j++; const a = pts[j - 1], b = pts[j], k = (s - acc[j - 1]) / (acc[j] - acc[j - 1] || 1); return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]; } };
}
// 획의 굵기: 또렷한 그림 / 붓 그림
const PROF = {
  flat: () => 1,
  blade: t => (t < 0.7 ? 1 : 1 - 0.97 * Math.pow((t - 0.7) / 0.3, 1.5)),           // 칼날: 끝에서 뾰족해진다
  tail: t => 1 - 0.7 * Math.pow(t, 1.2),                                          // 눌러 대고 가늘게 빼는 획
  cut: t => 0.12 + 0.88 * Math.pow(Math.sin(Math.min(1, t * 1.04) * PI), 0.8),    // 가늘게 들어가 부풀었다 빠지는 베기
  grow: t => 0.3 + 0.7 * Math.pow(t, 0.8),                                        // 가늘게 시작해 굵어진다
};
const BPROF = {
  flat: t => (t < 0.07 ? 0.66 + 0.34 * t / 0.07 : 1 - 0.2 * Math.pow((t - 0.07) / 0.93, 2)),
  blade: t => (t < 0.07 ? 0.6 + 0.4 * t / 0.07 : 1 - 0.82 * Math.pow((t - 0.07) / 0.93, 1.7)),
  tail: t => (t < 0.1 ? 0.6 + 0.4 * Math.sin(t / 0.1 * PI / 2) : 1 - 0.68 * Math.pow((t - 0.1) / 0.9, 1.3)),
  cut: t => 0.16 + 0.84 * Math.pow(Math.sin(Math.min(1, t * 1.1) * PI), 0.7) * (1 - 0.2 * t),
  grow: t => 0.36 + 0.64 * Math.pow(t, 0.8),
};

// ── 붓: 기호를 그리는 도구. b = 붓 그림인가, fine = 잔손질을 넣을 만큼 큰가 ──
class Pen {
  constructor(g, col, b, seed, fine, u = 1) { this.g = g; this.col = col; this.b = b; this.seed = seed; this.fine = fine; this.u = u; this.m = [u, 0, 0, u, 0, 0]; this.ko = false; this.pad = 0; this.n = 0; }
  // (x, y) 로 옮기고 rot 만큼 돌리고 s 배 한 자리에서 그린다 (flip = 좌우 뒤집기)
  at(x, y, rot, s, fn, flip) { const m = this.m, c = Math.cos(rot) * s, n = Math.sin(rot) * s, f = flip ? -1 : 1; this.m = [m[0] * c * f + m[2] * n * f, m[1] * c * f + m[3] * n * f, m[2] * c - m[0] * n, m[3] * c - m[1] * n, m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]; fn(); this.m = m; }
  // 파내기: fn 이 그리는 것을 먼저 그린 그림에서 덜어 낸다
  k(fn) { const ko = this.ko; this.ko = true; fn(); this.ko = ko; }
  // 겹쳐 올리기: 둘레에 가는 틈을 파고 그 위에 그린다 (작은 도장과 붓 그림에서는 틈 없이. force 면 늘 판다)
  over(fn, gap = 3, force) { if (force || (this.fine && !this.b)) { const pad = this.pad; this.pad = gap * this.u; this.k(fn); this.pad = pad; } fn(); }
  sc() { const m = this.m; return Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])); }
  tf(d) { const f = typeof d === 'string' ? flatten(d) : d, m = this.m; return { closed: f.closed, pts: f.pts.map(p => [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]]) }; }
  ink() { const g = this.g; g.globalCompositeOperation = this.ko ? 'destination-out' : 'source-over'; g.fillStyle = g.strokeStyle = this.ko ? '#000' : this.col; g.globalAlpha = 1; return g; }
  trace(pts, closed) { const g = this.g; g.beginPath(); pts.forEach((p, i) => g[i ? 'lineTo' : 'moveTo'](p[0], p[1])); if (closed) g.closePath(); }
  // 가장자리가 우는 면 (붓 그림): 테두리를 잘게 짚어 조금씩 밀고 당긴다
  rough(pts, amp) {
    const R = rng(this.seed + this.n * 131), al = along(pts.concat([pts[0]])), N = Math.max(14, Math.round(al.L / 2.6)), ph = [R() * TAU, R() * TAU], out = [];
    for (let i = 0; i < N; i++) { const p = al.at(i / N), a = al.at((i - 0.5) / N), b = al.at((i + 0.5) / N); let nx = -(b[1] - a[1]), ny = b[0] - a[0]; const l = Math.hypot(nx, ny) || 1, d = amp * (0.55 * Math.sin(i * 0.47 + ph[0]) + 0.3 * Math.sin(i * 1.3 + ph[1]) + (R() - 0.5) * 0.7); out.push([p[0] + nx / l * d, p[1] + ny / l * d]); }
    return out;
  }
  // 면: 닫힌 길을 채운다
  f(d) {
    const g = this.ink(), { pts } = this.tf(d); this.n++;
    if (!this.b) { this.trace(pts, true); g.fill(); if (this.ko && this.pad) { g.lineJoin = 'round'; g.lineWidth = this.pad * 2; g.stroke(); } return; }
    const rp = this.rough(pts, this.ko ? 0.5 : 0.9); this.trace(rp, true); g.fill(); if (this.ko) { if (this.pad) { g.lineJoin = 'round'; g.lineWidth = this.pad * 2; g.stroke(); } return; }
    // 먹이 덜 묻은 마른 줄: 면 안에서만 비스듬히 긁어 낸다
    const R = rng(this.seed + this.n * 57), xs = rp.map(p => p[0]), ys = rp.map(p => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), dg = Math.hypot(x1 - x0, y1 - y0), ns = Math.min(7, Math.round(dg / 9));
    g.save(); g.clip(); g.globalCompositeOperation = 'destination-out'; g.lineCap = 'round'; const a = -0.5 + (R() - 0.5) * 0.3;
    for (let j = 0; j < ns; j++) { const cx = x0 + R() * (x1 - x0), cy = y0 + R() * (y1 - y0), l = dg * (0.2 + R() * 0.4); g.globalAlpha = 0.25 + R() * 0.5; g.lineWidth = 0.5 + R() * 1.1; g.beginPath(); g.moveTo(cx - Math.cos(a) * l, cy - Math.sin(a) * l); g.lineTo(cx + Math.cos(a) * l, cy + Math.sin(a) * l); g.stroke(); }
    g.restore();
  }
  // 획: 길을 따라 굵기 w 로 긋는다. prof = 굵기가 변하는 모양(flat·blade·tail·cut·grow), o.cap = 'butt' 면 끝을 반듯하게 자른다
  s(d, w, prof = 'flat', o = {}) {
    const g = this.ink(), { pts, closed } = this.tf(d), k = this.sc(); let W = w * k + (this.ko ? this.pad * 2 : 0); this.n++; if (closed) pts.push(pts[0]);
    if (this.b && !this.ko) {
      // 붓 획: 가는 획은 먹이 넉넉하게, 굵은 획은 꼬리에 마른 붓 자국을 남긴다
      const al = along(pts), thin = W < 9; W *= o.bw || 1.08;
      brushStroke(g, t => al.at(t), { w: W / 2, prof: BPROF[prof] || BPROF.flat, dry: o.dry === undefined ? (thin ? 0.86 : prof === 'flat' ? 0.74 : 0.6) : o.dry, seed: this.seed + this.n * 31, col: this.col, steps: Math.max(16, Math.min(96, Math.round(al.L / 2.2))), drops: o.drops === undefined ? (thin ? 0 : 3) : o.drops, streaks: thin ? 0 : undefined });
      g.globalAlpha = 1; return;
    }
    if (prof === 'flat') { g.lineWidth = W; g.lineCap = o.cap || 'round'; g.lineJoin = o.join || 'round'; g.miterLimit = 6; this.trace(pts, false); g.stroke(); return; }
    // 굵기가 변하는 획: 길 양쪽으로 굵기만큼 벌린 테두리를 채운다
    const al = along(pts), N = Math.max(10, Math.round(al.L / 2)), pf = PROF[prof], L = [], Rr = [];
    for (let i = 0; i <= N; i++) { const t = i / N, p = al.at(t), a = al.at(t - 0.02), b = al.at(t + 0.02); let nx = -(b[1] - a[1]), ny = b[0] - a[0]; const l = Math.hypot(nx, ny) || 1, h = pf(t) * W / 2; L.push([p[0] + nx / l * h, p[1] + ny / l * h]); Rr.push([p[0] - nx / l * h, p[1] - ny / l * h]); }
    this.trace(L.concat(Rr.reverse()), true); g.fill();
    if (o.cap !== 'butt') { const p = al.at(0), q = al.at(1); g.beginPath(); g.arc(p[0], p[1], pf(0) * W / 2, 0, TAU); g.fill(); g.beginPath(); g.arc(q[0], q[1], pf(1) * W / 2, 0, TAU); g.fill(); }
  }
  // 점: (x, y) 에 반지름 r 의 둥근 점 (ry 를 주면 길쭉한 점, rot 으로 기울인다)
  d(x, y, r, ry = r, rot = 0) { const pts = []; for (let i = 0; i < 28; i++) { const a = i / 28 * TAU, px = Math.cos(a) * r, py = Math.sin(a) * ry; pts.push([x + px * Math.cos(rot) - py * Math.sin(rot), y + px * Math.sin(rot) + py * Math.cos(rot)]); } this.f({ pts, closed: true }); }
  // 고리: (x, y) 를 중심으로 반지름 r, 굵기 w. a0 → a1 구간만 그을 수 있다. 붓으로는 한 붓에 돌려 긋고 끝을 다 닫지 않는다
  o(x, y, r, w, a0 = 0, a1 = TAU, o = {}) {
    const full = a1 - a0 >= TAU - 0.01, brush = this.b && !this.ko, pts = []; let s0 = a0, s1 = a1;
    if (full && brush) { const R = rng(this.seed + this.n * 17 + 5); s0 = 2 + R() * 0.8; s1 = s0 + TAU * 0.955; }
    const N = Math.max(8, Math.round((s1 - s0) * 9)); for (let i = 0; i <= N; i++) { const a = s0 + (s1 - s0) * i / N; pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
    if (full && !brush) { pts.pop(); this.s({ pts, closed: true }, w, 'flat', o); } else this.s({ pts, closed: false }, w, brush ? (full ? 'tail' : o.prof || 'flat') : o.prof || 'flat', Object.assign({ cap: full ? undefined : o.cap, dry: full ? 0.62 : undefined }, o));
  }
}

// ───────── 자주 쓰는 조각 ─────────
// 환도: 자루 끝 (ax, ay) 에서 칼끝 (bx, by) 까지. 살짝 휜 외날, 작고 둥근 코등이
function sword(p, ax, ay, bx, by, w = 9) {
  const L = Math.hypot(bx - ax, by - ay);
  p.at(ax, ay, Math.atan2(by - ay, bx - ax), 1, () => {
    p.d(1.5, 0, w * 0.5); p.s(`M2,0 L${L * 0.21},0`, w * 0.66, 'flat', { cap: 'butt' }); p.s(`M${L * 0.235},${-w * 1.05} L${L * 0.235},${w * 1.05}`, w * 0.58);   // 굵은 자루와 넓은 코등이: 작아도 칼로 읽힌다
    p.s(`M${L * 0.265},0 Q${L * 0.6},${-L * 0.07} ${L},${-L * 0.012}`, w * 0.88, 'blade', { bw: 1.3 });
  });
}
const FLAME = 'M2,-46 C4,-30 24,-18 24,6 C24,24 13,36 0,36 C-13,36 -24,25 -24,9 C-24,0 -20,-9 -14,-15 C-13,-8 -10,-3 -6,-2 C-9,-16 -6,-32 2,-46 Z', FLAME_IN = 'M1,5 C7,12 10,18 10,23 C10,29 5,32 0,32 C-5,32 -10,29 -10,23 C-10,17 -4,13 1,5 Z';
function flame(p, x, y, s) { p.at(x, y, 0, s, () => { p.f(FLAME); if (p.fine) p.k(() => p.f(FLAME_IN)); }); }
// 전공 등급은 매화 한 송이·두 송이·세 송이로 센다 (다섯 꽃잎에 가운데 꽃술)
function star(p, x, y, r, rot = 0) { for (let i = 0; i < 5; i++) { const a = -PI / 2 + rot + i * TAU / 5; p.d(x + Math.cos(a) * r * 0.58, y + Math.sin(a) * r * 0.58, r * 0.45); } p.d(x, y, r * 0.34); p.k(() => { p.d(x, y, r * 0.17); for (let i = 0; i < 5; i++) { const a = -PI / 2 + rot + i * TAU / 5; p.d(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5, r * 0.07); } }); }
function coin(p, x, y, r) { const h = r * 0.27; p.d(x, y, r); p.k(() => p.f(`M${x - h},${y - h} L${x + h},${y - h} L${x + h},${y + h} L${x - h},${y + h} Z`)); if (p.fine && !p.ko) p.k(() => p.o(x, y, r * 0.72, r * 0.07)); }
function axe(p) { p.s('M0,48 L0,-42', 6.5); p.f('M2,-36 C12,-36 22,-40 29,-49 C41,-36 41,-12 29,1 C22,-8 12,-12 2,-12 Z'); }
// 부챗살처럼 펼친 잎: (x, y) 에서 여러 각도로 뻗는다 (연꽃잎·깃털)
function spray(p, x, y, leaf, list, gap) { for (const [a, s] of list) p.over(() => p.at(x, y, a, s, () => p.f(leaf)), gap, true); }

// ───────── 기호 ─────────
const DEF = {
  // ── 노정 ──
  // 싸움: 엇갈린 환도 두 자루
  battle(p) { sword(p, -40, 40, 30, -44, 10); p.over(() => sword(p, 36, 36, -30, -40, 8.4)); },   // 크기·각도가 다른 두 자루 (닫기 'X' 와 다르게)
  // 강적: 엇갈린 칼 위로 타오르는 불꽃
  elite(p) { sword(p, -38, 46, 30, -22, 8.6); p.over(() => sword(p, 38, 46, -30, -22, 8.6)); p.over(() => flame(p, 0, -28, 0.42), 4, true); },   // 불꽃은 칼이 엇갈린 자리 위에 띄운다
    // 두목: 뿔 달린 도깨비 얼굴 (귀면) — 소뿔, 퉁방울눈, 삐죽한 갈기, 엄니
  boss(p) {   // 두목: 귀면와 — 둥근 윗변·평평한 아랫변의 막새 기와 안에 든 얼굴 (소용돌이 눈썹, 부릅뜬 눈, 이를 드러낸 넓은 입. 뿔·갈기는 없다)
    p.f('M-40,42 L-40,-4 C-40,-30 -22,-46 0,-46 C22,-46 40,-30 40,-4 L40,42 Z');
    p.k(() => {
      if (p.fine) p.s('M-33,35 L-33,-4 C-33,-24 -18,-39 0,-39 C18,-39 33,-24 33,-4 L33,35 Z', 2.4);   // 기와 테
      for (const s2 of [-1, 1]) { p.s(`M${s2 * 3},-11 C${s2 * 8},-25 ${s2 * 26},-26 ${s2 * 25},-13 C${s2 * 24},-6 ${s2 * 16},-7 ${s2 * 17},-12`, 4); if (p.fine) p.o(s2 * 12, 1, 6.6, 3); else p.d(s2 * 12, 1, 6); }
      p.f('M-22,14 Q0,9 22,14 L18,29 Q0,35 -18,29 Z'); p.d(-4.4, 8, 2.6); p.d(4.4, 8, 2.6);   // 넓은 입과 콧구멍
    });
    if (p.fine) for (const s2 of [-1, 1]) p.d(s2 * 12, 1, 2.8);
    for (const x of [-12, -4, 4, 12]) p.f(`M${x - 3},13.6 L${x},${Math.abs(x) > 8 ? 24 : 20} L${x + 3},13.6 Z`);
  },
// 보물: 납작한 뚜껑의 궤짝, 둥근 자물쇠
  treasure(p) {
    p.f('M-40,-31 L40,-31 Q44,-31 44,-27 L44,-13 L-44,-13 L-44,-27 Q-44,-31 -40,-31 Z'); p.f('M-40,-6 L40,-6 L40,31 L-40,31 Z'); p.f('M-40,30 L-27,30 L-29,40 L-40,40 Z'); p.f('M40,30 L27,30 L29,40 L40,40 Z');
    p.k(() => p.d(0, 9, 11)); p.d(0, 9, 5.6); p.f('M-4.4,-14 L4.4,-14 L4.4,0 L-4.4,0 Z');
  },
  // 장터: 엽전 꾸러미 (네모 구멍 엽전 두 닢)
  shop(p) { coin(p, 16, -17, 23); p.over(() => coin(p, -11, 12, 28), 4, true); },
  // 주막: 허리에 끈을 맨 호리병
  rest(p) {
    p.f('M-5.5,-36 L5.5,-36 C5.5,-30 5.5,-28 9,-26 C15,-22 16,-12 11,-5 C9,-2 10,0 13,2 C23,8 27,20 23,30 C19,40 9,45 0,45 C-9,45 -19,40 -23,30 C-27,20 -23,8 -13,2 C-10,0 -9,-2 -11,-5 C-16,-12 -15,-22 -9,-26 C-5.5,-28 -5.5,-30 -5.5,-36 Z');
    p.f('M-7,-47 L7,-47 L6,-39.5 L-6,-39.5 Z'); p.k(() => p.s('M-12,-2 Q0,2 12,-2', 3.2)); p.s('M12,-1 Q25,-3 27,10', 3.4); p.d(27.4, 13, 3.6);
  },
  // 갈림길: 두 갈래로 갈라지는 길
  fork(p) {
    p.s('M0,46 L0,14', 9.5, 'flat', { cap: 'butt' });
    for (const f of [false, true]) p.at(0, 0, 0, 1, () => { p.s('M0,22 C0,-2 -10,-12 -25,-23', 9.5, 'flat', { cap: 'butt' }); p.f('M-41,-36 L-14,-30 L-31,-9 Z'); }, f);
  },
  // ── 전공 등급: 붓으로 찍는 별 ──
  star1(p) { star(p, 0, 3, 45, 0.05); },
  star2(p) { star(p, -23, 8, 28, -0.1); star(p, 23, -6, 28, 0.12); },
  star3(p) { star(p, 0, -21, 26, 0.03); star(p, -26, 22, 24.5, -0.12); star(p, 26, 22, 24.5, 0.14); },
  // ── 싸움의 끝과 연출 ──
        // 이김: 고개 위로 떠오른 해 (봉우리 셋과 둥근 해, 발치의 물결 — 일월오봉도의 해와 봉우리)
  win(p) {
    p.d(0, -31, 14.5); p.f('M-47,35 L-47,27 L-31,1 L-19,19 L0,-11 L19,19 L31,1 L47,27 L47,35 Z');
    p.s('M-45,45 Q-34,40 -23,45 Q-11,50 0,45 Q11,40 23,45 Q34,50 45,45', 4.2);
  },
// 짐: 부러진 깃대와 찢어진 깃발
  lose(p) {
    p.s('M-27,47 L-27,10', 6.5, 'flat', { cap: 'butt' }); p.f('M-30.4,11 L-28,1 L-26,8 L-23.6,3 L-23.6,11 Z'); p.s('M-40,47 L-14,47', 5);
    p.s('M-21,-1 L33,-27', 6); p.d(35, -28, 4.6);
    p.f('M-7,-8 L30,-26 L35,3 L27,-5 L22,13 L13,0 L6,20 L-2,3 Z');
  },
  // 깨짐: 쩍 갈라진 금과 튀는 조각 (수레가 부서질 때)
  break(p) {
    p.s('M-9,-47 L8,-15 L-10,-2 L10,47', 10, 'cut', { join: 'miter' });
    for (const [a, b, c, d, w] of [[-15, -14, -45, -28, 7.5], [-19, 9, -46, 21, 7], [16, -9, 45, -25, 7.5], [19, 12, 46, 24, 7], [-3, -32, -25, -45, 5.5], [5, 28, 27, 44, 5.5]]) p.s(`M${a},${b} L${c},${d}`, w, 'tail', { drops: 2 });
  },
  // 벰: 엇갈려 그은 두 번의 칼질 (두목을 쓰러뜨릴 때)
  slay(p) { p.s('M-44,-37 Q2,-8 41,39', 18, 'cut', { drops: 6 }); p.s('M41,-39 Q4,-2 -42,39', 18, 'cut', { drops: 6 }); if (!p.b) { p.d(-33, 6, 3); p.d(34, 4, 2.6); p.d(2, -36, 2.4); } },
  // 합: 맞물린 두 고리 (두 영웅의 합격)
  combo(p) { p.o(-15, 0, 24, 9); p.over(() => p.o(15, 0, 24, 9), 3.2); if (p.fine && !p.b) { p.k(() => p.o(-15, 0, 24, 15.4, 0.5, 1.3, { cap: 'butt' })); p.o(-15, 0, 24, 9, 0.38, 1.42, { cap: 'butt' }); } },
  // 얻음: 붓으로 그은 맞음 표
  // 얻음: 끈을 졸라 맨 복주머니 (주머니에 챙겨 넣었다)
  get(p) {
    p.f('M-12,-16 C-36,-12 -44,14 -36,32 C-28,46 28,46 36,32 C44,14 36,-12 12,-16 Z');
    p.f('M-15,-15 L-18,-27 Q-10,-31 -5,-25 Q0,-32 5,-25 Q10,-31 18,-27 L15,-15 Z');
    p.k(() => { p.s('M-16,-15 Q0,-10 16,-15', 3.4); if (p.fine) for (const x of [-9, 0, 9]) p.s(`M${x},-12 L${x * 1.5},-2`, 1.8); });   // 졸라맨 주름
    for (const s2 of [-1, 1]) { p.s(`M${s2 * 13},-15 Q${s2 * 28},-14 ${s2 * 31},0`, 3.2); p.f(`M${s2 * 27},-1 L${s2 * 35},-1 L${s2 * 37},14 L${s2 * 25},14 Z`); }   // 늘어진 끈과 술
  },
  // 열림: 고리가 풀린 자물쇠
  open(p) {   // 열림: 솟을대문 — 가운데 지붕이 높고 양옆 행랑채 지붕은 낮다. 처마는 살짝만 들리고, 두 문짝이 활짝 열렸다
    p.f('M-35,-21 Q-27,-23 -23,-30 L23,-30 Q27,-23 35,-21 L31,-15 L-31,-15 Z'); p.s('M-24,-31 L24,-31', 4.6);
    for (const s2 of [-1, 1]) p.f(`M${s2 * 58},-4 Q${s2 * 52},-6 ${s2 * 49},-11 L${s2 * 31},-11 L${s2 * 31},-2 L${s2 * 56},0 Z`);
    p.f('M-31,-15 L-24,-15 L-24,44 L-31,44 Z'); p.f('M24,-15 L31,-15 L31,44 L24,44 Z');
    p.f('M-55,0 L-33,0 L-33,44 L-55,44 Z'); p.f('M33,0 L55,0 L55,44 L33,44 Z'); p.k(() => { p.f('M-49,11 L-39,11 L-39,23 L-49,23 Z'); p.f('M39,11 L49,11 L49,23 L39,23 Z'); });
    p.f('M-22,-11 L-8,-5 L-8,36 L-22,42 Z'); p.f('M22,-11 L8,-5 L8,36 L22,42 Z'); p.k(() => { p.o(-12, 18, 2.6, 1.2); p.o(12, 18, 2.6, 1.2); });   // 고리 문고리
  },
    // 은혜: 매듭을 지어 묶은 보따리
  perk(p) {
    p.f('M-30,43 C-43,27 -37,3 -16,-5 C-8,-8 8,-8 16,-5 C37,3 43,27 30,43 C16,47 -16,47 -30,43 Z');
    for (const f of [false, true]) p.at(0, 0, 0, 1, () => p.over(() => p.f('M-2,-7 C-12,-9 -27,-15 -38,-30 C-23,-31 -8,-24 0,-13 Z'), 2.4, true), f);
    p.over(() => p.d(0, -10, 7.6), 2.4, true); if (p.fine) p.k(() => { p.s('M-7,2 C-15,13 -20,26 -21,38', 2.4); p.s('M7,2 C15,13 20,26 21,38', 2.4); });
  },
// 씻김: 맑은 물 한 방울
  cleanse(p) { p.f('M0,-46 C10,-25 31,-5 31,16 C31,34 17,45 0,45 C-17,45 -31,34 -31,16 C-31,-5 -10,-25 0,-46 Z'); p.k(() => p.s('M-18,15 C-18,27 -9,35 2,35', 5)); },
    // 인연: 발톱 선 영물의 발자국
  bond(p) {
    p.f('M0,5 C12,5 28,17 28,30 C28,40 20,45 12,41 C8,39 4,44 0,44 C-4,44 -8,39 -12,41 C-20,45 -28,40 -28,30 C-28,17 -12,5 0,5 Z');
    for (const [x, y, r] of [[-30, 1, -0.5], [-12, -17, -0.16], [12, -17, 0.16], [30, 1, 0.5]]) p.at(x, y, r, 1, () => p.f('M0,9 C-8,9 -9.5,0 -6.5,-8 C-4.5,-14 -1.5,-20 0,-28 C1.5,-20 4.5,-14 6.5,-8 C9.5,0 8,9 0,9 Z'));
  },
// ── 영웅의 낙관: 손에 든 것 ──
    // 장군: 언월도
  glaive(p) {
    p.at(-6, 8, 0.6, 0.92, () => {
      p.s('M0,46 L0,-10', 6.2); p.s('M-8,-10.5 L8,-10.5', 4.8);
      p.f('M-4.5,-12 L5,-12 C24,-17 30,-42 16,-66 C16,-50 8,-41 -2,-41 L-16,-49 L-9,-34 C-6.5,-27 -5,-19 -4.5,-12 Z'); p.s('M-6,-5 Q-17,-2 -15,11', 3.8, 'tail');
    });
  },
// 검객: 나란히 든 쌍검
  twin(p) { sword(p, -38, 28, 14, -46, 8.4); p.over(() => sword(p, -14, 45, 41, -27, 8.4)); },
  // 명궁: 시위를 당긴 각궁과 화살
  bow(p) {
    p.at(-3, 3, -0.72, 1, () => {
      p.s('M-10,-46 C-21,-42 -17,-33 -6,-29 C17,-19 17,19 -6,29 C-17,33 -21,42 -10,46', 7, 'flat'); p.s('M-12,-45 L-25,0 L-12,45', 2.8);
      p.s('M-25,0 L30,0', 4.2); p.f('M46,0 L27,-8.6 L31,0 L27,8.6 Z'); p.f('M-36,-7.4 L-27,-7.4 L-20,0 L-27,7.4 L-36,7.4 L-30,0 Z');
    });
  },
  // 고승: 염주
  beads(p) {   // 염주: 굵은 알을 꿴 둥근 고리 (어미 구슬 하나가 크다)
    for (let i = 0; i < 12; i++) { const a = PI / 2 + i * TAU / 12; p.d(Math.cos(a) * 31, Math.sin(a) * 31, i === 0 ? 10.5 : 6.6); }
  },
    // 신선: 학의 깃으로 엮은 부채 (끝이 둥근 깃털 일곱 장, 긴 자루)
  fan(p) {
    const quill = () => { p.f('M0,0 C5,-12 12,-34 9.5,-50 C8.5,-59 3,-63 0,-63 C-3,-63 -8.5,-59 -9.5,-50 C-12,-34 -5,-12 0,0 Z'); if (p.fine) p.k(() => p.s('M0,-12 L0,-54', 1.7)); };
    for (const [a, s] of [[-1.26, 0.72], [1.26, 0.72], [-0.84, 0.86], [0.84, 0.86], [-0.42, 0.96], [0.42, 0.96], [0, 1]]) p.over(() => p.at(0, 14, a, s, quill), 2.2, true);
    p.over(() => p.s('M-9,16 L9,16', 5.4), 2, true); p.s('M0,18 L0,48', 6.4);
  },
  // 상쇠: 꽹과리와 채
  gong(p) {   // 꽹과리: 놋쇠 판(안에 테 한 줄)과 위에 맨 짧은 손잡이 고리, 앞으로 비스듬히 든 채 (늘어진 끈·술은 도화선처럼 보여 뺐다)
    p.d(-6, 4, 30); p.k(() => p.o(-6, 4, 20, p.fine ? 3 : 3.8));
    p.s('M-15,-25 Q-6,-44 3,-25', 4.4);
    p.over(() => { p.s('M14,46 L40,8', 5.6); p.d(42, 4, 8); }, 4, true);
  },
  // 두령: 엇갈린 쌍도끼
  axes(p) { p.at(-3, 5, 0.6, 0.9, () => axe(p)); p.over(() => p.at(3, 5, -0.6, 0.9, () => axe(p), true)); },
  // ── 패의 종류 ──
  // 공격: 날아가는 화살
  attack(p) { p.at(0, 0, -PI / 4, 1, () => { p.s('M-46,0 L30,0', 5.4); p.f('M52,0 L25,-12.5 L31,0 L25,12.5 Z'); p.f('M-52,-11 L-39,-11 L-28,0 L-39,11 L-52,11 L-43,0 Z'); }); },
  // 지원: 물 위에 핀 연꽃
  support(p) { spray(p, 0, 30, 'M0,0 C-14,-16 -14,-46 0,-70 C14,-46 14,-16 0,0 Z', [[-1.22, 0.76], [1.22, 0.76], [-0.62, 0.92], [0.62, 0.92], [0, 1]], 2.6); p.s('M-36,40 Q0,49 36,40', 5); },
  // 책략: 펼친 두루마리 (병법서)
  trick(p) {
    p.f('M-25,-19 L27,-19 L27,19 L-25,19 Z'); p.over(() => p.s('M-29,-32 L-29,32', 10.5), 2.4, true); p.over(() => p.s('M31,-28 L31,28', 8.5), 2.4, true);
    p.k(() => { p.s('M-14,-8 L19,-8', 3.2); p.s('M-14,1 L19,1', 3.2); p.s('M-14,10 L6,10', 3.2); });
  },
  // 영웅(영웅 패·영웅기): 삼지창 꼭지를 단 투구
  helm(p) {
    p.f('M-25,7 C-25,-22 -13,-33 0,-33 C13,-33 25,-22 25,7 Z'); p.s('M-32,10 Q0,5 32,10', 6.4); p.s('M0,-33 L0,-49', 4.2); p.s('M-7,-47 L-7,-41 L7,-41 L7,-47', 3.2, 'flat', { join: 'miter' });
    for (const f of [false, true]) p.at(0, 0, 0, 1, () => p.f('M-30,15 L-13,15 L-15,43 L-31,36 Z'), f); if (p.fine) p.k(() => p.s('M0,-30 L0,3', 2.4));
  },
  // 부정: 어지럽게 감기는 소용돌이 (잡념)
  curse(p) { const pts = []; for (let i = 0; i <= 72; i++) { const t = i / 72, a = 0.9 + t * TAU * 2.15, r = 2 + 39 * t; pts.push([Math.cos(a) * r, 2 + Math.sin(a) * r]); } p.s({ pts, closed: false }, 8.6, p.b ? 'tail' : 'flat', { dry: 0.7 }); },
  // ── 병력의 갈래 ──
  // 칼 (보병·무기 표시)
  forge(p) { p.f('M-44,-12 L30,-12 Q46,-12 46,-3 L22,0 L12,8 L12,20 L27,32 L-27,32 L-12,20 L-12,8 L-30,2 Z'); p.d(8, -30, 5.5); p.d(22, -38, 4.2); p.d(-6, -40, 3.6); },
  // 무당집: 손잡이에 방울이 층층이 달린 무당 방울
  shaman(p) {
    p.s('M0,46 L0,4', 8, 'flat', { cap: 'butt' }); p.f('M-9,6 L9,6 L6,14 L-6,14 Z');
    for (const [x, y, r] of [[0, -36, 9.5], [-13, -20, 9.5], [13, -20, 9.5], [-24, -3, 9], [0, -5, 9], [24, -3, 9]]) { p.d(x, y, r); p.k(() => p.s(`M${x - r * 0.45},${y + r * 0.2} L${x + r * 0.45},${y + r * 0.2}`, r * 0.26)); }
  },
  // 서당: 펼친 책과 붓
  seodang(p) {
    p.f('M-46,-4 L-4,-14 L-4,34 L-46,42 Z'); p.f('M4,-14 L46,-4 L46,42 L4,34 Z');
    p.k(() => { for (const y of [4, 14, 24]) { p.s(`M-38,${y + 2} L-12,${y - 4}`, 2.4); p.s(`M12,${y - 4} L38,${y + 2}`, 2.4); } });
    p.over(() => p.at(0, 0, -0.85, 1, () => { p.s('M-52,0 L22,0', 6.4); p.f('M22,-5.5 C34,-5 44,-2 50,0 C44,2 34,5 22,5.5 Z'); }), 4, true);
  },
  // 투전판: 부채꼴로 쥔 기다란 투전 석 장
  gamble(p) {
    for (const a of [-0.42, 0, 0.42]) p.over(() => p.at(0, 40, a, 1, () => { p.f('M-10,0 L10,0 L10,-82 L-10,-82 Z'); p.k(() => { p.d(0, -68, 3.6); p.d(0, -56, 3.6); p.s('M-5,-14 L5,-14', 2.4); }); }), 3.4, true);
  },
  // 의병 모집소: 엇갈린 죽창과 낫
  muster(p) {
    p.at(0, 0, -PI / 4 - 0.1, 1, () => { p.s('M-52,0 L30,0', 7); p.f('M30,-4.5 L54,0 L30,4.5 Z'); p.k(() => { for (const x of [-30, -8]) p.s(`M${x},-5 L${x},5`, 1.8); }); });
    p.over(() => p.at(0, 0, PI / 4 + 0.15, 1, () => { p.s('M-50,0 L-6,0', 6.6); p.f('M-8,-4 C8,-6 30,-2 40,-18 C42,-6 30,10 -8,4 Z'); }, true), 4, true);
  },
  // 숨은 길: 금줄 아래로 수풀 사이 좁은 길이 굽어든다
  hidden(p) {
    p.s('M-46,-26 Q0,-10 46,-26', 4.6);
    for (const x of [-26, 0, 26]) { const y = -18 + Math.abs(x) * 0.18; p.f(`M${x - 3},${y} L${x + 3},${y} Q${x + 4},${y + 12} ${x + 1},${y + 21} Q${x - 4},${y + 12} ${x - 3},${y} Z`); }   // 금줄에 끼운 고추
    p.s('M-4,46 C-22,34 20,22 2,8', 9, 'tail');
    for (const sx of [-1, 1]) p.over(() => { p.s(`M${sx * 40},46 L${sx * 34},20`, 4.6, 'tail'); p.s(`M${sx * 30},46 L${sx * 18},24`, 4, 'tail'); }, 3, true);
  },
  sword(p) { sword(p, -33, 37, 33, -41, 10.5); },
  // 창
  spear(p) { p.at(0, 0, -PI / 4, 1, () => { p.s('M-52,0 L26,0', 5.4); p.f('M54,0 C42,-6 33,-10 23,-8 L27,0 L23,8 C33,10 42,6 54,0 Z'); p.s('M17,-8 L17,8', 4.4); p.s('M12,2 Q4,9 8,19', 3.6, 'tail'); }); },
    // 방패 (등패): 가운데 꼭지와 둘레의 못
  shield(p) { p.d(0, 0, 41); p.k(() => { p.o(0, 0, 14, 4); if (p.fine) { p.o(0, 0, 34, 2.4); for (let i = 0; i < 8; i++) p.d(Math.cos(i * PI / 4) * 24.5, Math.sin(i * PI / 4) * 24.5, 2.9); } else for (let i = 0; i < 4; i++) p.d(Math.cos(i * PI / 2 + PI / 4) * 27, Math.sin(i * PI / 2 + PI / 4) * 27, 4.6); }); },
// 말 (기병)
  horse(p) { p.f('M-25,46 C-30,22 -23,-6 -8,-25 L-7,-46 L4,-31 C16,-27 26,-11 34,5 C40,13 40,22 34,26 C28,30 20,27 16,21 C10,14 4,14 0,20 C4,32 6,40 8,46 Z'); for (const [x, y, l] of [[-10, -26, 20], [-17, -12, 24], [-22, 2, 24], [-25, 16, 22], [-27, 30, 18]]) p.s(`M${x + 3},${y} Q${x - l * 0.5},${y - 4} ${x - l},${y + 8}`, 5.6, 'tail'); p.k(() => { p.d(12, -9, 3.2); p.s('M17,3 L31,20', 2.6); p.s('M17,3 L4,-4', 2.6); }); },
  // 불 (도술)
  flame(p) { flame(p, 0, 6, 1.1); },
  // 화포 (화차·총통)
  cannon(p) {   // 화차: 화살을 줄지어 꽂은 틀을 수레에 얹었다
    p.at(2, -14, -0.55, 1, () => { p.f('M-30,-15 L24,-15 L24,15 L-30,15 Z'); p.k(() => { for (const y of [-8, 0, 8]) for (const x of [-21, -10, 1, 12]) p.d(x, y, 2.5); }); for (const y of [-10, -3.4, 3.4, 10]) { p.s(`M24,${y} L41,${y}`, 2.4); p.f(`M40,${y - 3.4} L48,${y} L40,${y + 3.4} Z`); } });
    p.s('M-24,2 L-46,26', 5); p.over(() => { p.o(-2, 29, 16, 6.2); p.d(-2, 29, 4.6); for (let i = 0; i < 4; i++) { const a = 0.4 + i * PI / 4; p.s(`M${-2 - Math.cos(a) * 14.6},${29 - Math.sin(a) * 14.6} L${-2 + Math.cos(a) * 14.6},${29 + Math.sin(a) * 14.6}`, 2.6); } }, 3, true);
  },
};
export const SYMBOLS = Object.keys(DEF);
export const hasSymbol = id => DEF.hasOwnProperty(id);

// ───────── 굽기와 찍기 ─────────
const BOX = 128, CACHE = new Map();
function sprite(id, brush, col, q, halo, lw) {
  const key = `${id}|${brush ? 1 : 0}|${col}|${q}|${halo || ''}|${halo ? lw : ''}`; let c = CACHE.get(key);
  if (c) return c;
  if (CACHE.size > 220) CACHE.delete(CACHE.keys().next().value);
  if (halo) {
    // 둘레의 종이 빛 번짐: 그림의 그림자를 사방으로 조금씩 밀어 깔고 그 위에 그림을 얹는다
    const src = sprite(id, brush, col, q), sil = makeCanvas(src.width, src.height), sg = sil.getContext('2d'); sg.drawImage(src, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = halo; sg.fillRect(0, 0, sil.width, sil.height);
    c = makeCanvas(src.width, src.height); const g = c.getContext('2d'), r = lw * 50 * q;
    for (let i = 0; i < 20; i++) g.drawImage(sil, Math.cos(i / 20 * TAU) * r, Math.sin(i / 20 * TAU) * r); for (let i = 0; i < 10; i++) g.drawImage(sil, Math.cos(i / 10 * TAU) * r * 0.5, Math.sin(i / 10 * TAU) * r * 0.5);
    g.drawImage(src, 0, 0);
  } else {
    c = makeCanvas(BOX * q, BOX * q); const g = c.getContext('2d'), k = brush ? 2 : 1; let seed = 7; for (let i = 0; i < id.length; i++) seed = (seed * 31 + id.charCodeAt(i)) | 0;
    g.scale(q / k, q / k); g.translate(BOX / 2 * k, BOX / 2 * k); DEF[id](new Pen(g, col, brush, seed, q >= 1, k));
  }
  CACHE.set(key, c); return c;
}
// 기호 id 를 (x, y) 가운데에 크기 size(글자 크기처럼 한 변의 길이)로 찍는다
// o: { brush: 붓 그림, rot: 기울기, alpha: 투명도, halo: 둘레의 종이 빛 번짐 색, lw: 번짐의 굵기(크기에 대한 비율) }
export function symbol(g, id, x, y, size, col = INK, o = {}) {
  if (!DEF.hasOwnProperty(id) || size <= 0.5) return;
  const q = o.brush ? (size > 60 ? 3 : 1.5) : size > 120 ? 5 : size > 60 ? 2.5 : size > 30 ? 1.25 : 0.625, c = sprite(id, !!o.brush, col, q, o.halo || null, o.lw || 0.1), k = size / 100;
  g.save(); g.translate(x, y); if (o.rot) g.rotate(o.rot); if (o.alpha !== undefined) g.globalAlpha *= Math.max(0, o.alpha); g.drawImage(c, -BOX / 2 * k, -BOX / 2 * k, BOX * k, BOX * k); g.restore();
}
// 붓으로 그린 기호 하나. halo = 둘레의 종이 빛 번짐 (false 면 없음)
export function inkGlyph(g, id, x, y, size, o = {}) { symbol(g, id, x, y, size, o.col || MEOK, { brush: true, rot: o.rot, alpha: o.alpha, halo: o.halo === false ? null : o.halo || 'rgba(248,240,220,0.92)', lw: o.lw }); }
// 먹물 얼룩 위에 흰 붓으로 그린 기호: 싸움의 시작, 두목의 등장처럼 힘을 줘야 하는 자리
export function inkMark(g, id, x, y, size, o = {}) {
  const k = o.k === undefined ? 1 : o.k;   // 0→1: 얼룩이 먼저 떨어지고 그림이 찍힌다
  drawInk(g, 'blot', x, y, size / 118 * (0.7 + 0.3 * Math.min(1, k * 2.4)), o.rot || -0.2, Math.min(1, k * 3), o.ink || MEOK, o.v || 0);
  if (k > 0.2) { const q = Math.min(1, (k - 0.2) / 0.3), sc = 1.7 - 0.7 * q; inkGlyph(g, id, x, y, size * sc, { col: o.col || '#f6efdc', halo: false, alpha: q, rot: -0.05 }); }
}

// 삼태극: 붉은·푸른·누런 세 갈래가 맞물려 도는 무늬 (군기와 깃발의 가운데). n = 2 면 태극
export function taegeuk(g, x, y, r, rot = -0.5, cols = [RED, INDIGO, OCHRE], lw = 0.9) {
  const n = cols.length;
  for (let i = 0; i < n; i++) { const a = rot + i * TAU / n, b = a + TAU / n; g.beginPath(); g.moveTo(x, y); g.arc(x + Math.cos(a) * r / 2, y + Math.sin(a) * r / 2, r / 2, a + PI, a + TAU); g.arc(x, y, r, a, b); g.arc(x + Math.cos(b) * r / 2, y + Math.sin(b) * r / 2, r / 2, b, b - PI, true); g.closePath(); g.fillStyle = cols[i]; g.fill(); }
  if (lw) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.strokeStyle = INK; g.lineWidth = lw; g.stroke(); }
}
