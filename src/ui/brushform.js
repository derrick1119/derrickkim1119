// 붓으로 진 치기: 싸움터의 빈 땅을 끌면 먹붓 한 획이 그어지고, 손을 떼면 부대들이 그 획을 따라 선다.
// - 획은 빠르게 그을수록 가늘고, 처음은 붓을 눌러 둥글게 번지고, 끝은 마른 붓(비백)으로 갈라진다
// - 부대는 획을 고르게 나눈 자리에 하나씩 선다: 근접·돌격 부대는 요괴 쪽(오른쪽) 자리, 활·도술·치유 부대는 뒤쪽 자리를 먼저 맡는다
// - 부대 안의 인형들은 그 자리에서 획의 결(방향)을 따라 한 줄(많으면 두 줄)로 늘어선다
// - 획의 끝이 처음 가까이로 돌아오면 둥근 진: 부대가 둘레에 서고 영웅이 가운데로 간다
// 선 모양은 진형(data/formations.js)이 그대로 읽는다: 세로 한 획이면 일자진, 양 끝을 앞으로 휘면 학익진 …
import { VIEW } from '../config.js';
import { TAU, FONT_B, text, clamp } from '../render/draw.js';
import { UNITS } from '../data/units.js';

const INKC = '20,18,28';
export const BRUSH_MIN = 70;   // 이보다 짧은 획은 진을 치지 않는다 (잘못 누른 것)

export class Brush {
  constructor(x, y, t) { this.pts = [{ x, y, t, w: 0 }]; this.len = 0; this.done = false; this.fade = 0; this.marks = []; this.seed = (Math.random() * 1e6) | 0; this.add(x, y, t); }
  add(x, y, t) {
    x = clamp(x, VIEW.x0 + 16, VIEW.x1 - 16); y = clamp(y, VIEW.y0 + 6, VIEW.y1 - 8);
    const p = this.pts[this.pts.length - 1], d = Math.hypot(x - p.x, y - p.y); if (d < 5 && this.pts.length > 1) return;
    const v = d / Math.max(0.008, t - p.t), w = clamp(20 - v * 0.010, 7, 20);
    // 굵기는 부드럽게 따라간다 (붓이 갑자기 굵어지거나 가늘어지지 않게)
    const pw = this.pts.length > 1 ? p.w : w; this.pts.push({ x, y, t, w: pw + (w - pw) * 0.35 }); this.len += d;
  }
  center() { const P = this.pts; return P.reduce((a, q) => ({ x: a.x + q.x / P.length, y: a.y + q.y / P.length }), { x: 0, y: 0 }); }
  get closed() { const a = this.pts[0], b = this.pts[this.pts.length - 1]; return this.len > 260 && Math.hypot(a.x - b.x, a.y - b.y) < 70; }
  // 획 위를 길이로 고르게 나눈 점 n 개 (열린 획은 양 끝을 포함, 닫힌 획은 둘레를 고르게)
  sample(n) {
    const P = this.pts, cum = [0]; for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i].x - P[i - 1].x, P[i].y - P[i - 1].y));
    const L = cum[cum.length - 1] || 1, closed = this.closed, out = [];
    const at = s => { let i = 1; while (i < cum.length - 1 && cum[i] < s) i++; const a = P[i - 1], b = P[i] || a, k = cum[i] - cum[i - 1] ? (s - cum[i - 1]) / (cum[i] - cum[i - 1]) : 0; return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, ang: Math.atan2(b.y - a.y, b.x - a.x) }; };
    for (let i = 0; i < n; i++) { const f = closed ? (i + 0.5) / n : n === 1 ? 0.5 : i / (n - 1); out.push(at(clamp(f, 0, 1) * L)); }
    return out;
  }
  // 먹붓 한 획: 젖은 번짐 → 몸통 → 가운데 짙은 먹 → 붓털 결(비백) → 꺾인 자리의 먹 고임 → 끝의 마른 붓. k: 남은 먹(사라질 때 1 → 0)
  draw(g, T, k = 1) {
    const P = this.pts; if (P.length < 2 || k <= 0) return;
    const n = P.length, R = mulberry(this.seed), s1 = R() * 9, s2 = R() * 9, tail = Math.max(4, Math.round(n * 0.28)), side = [];
    for (let i = 0; i < n; i++) {
      const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)], ang = Math.atan2(b.y - a.y, b.x - a.x), nx = -Math.sin(ang), ny = Math.cos(ang);
      // 붓을 누르는 힘이 조금씩 흔들린다 · 처음은 눌러 둥글게 · 끝으로 갈수록 가늘게 빠진다
      const press = 0.84 + 0.14 * Math.sin(i * 0.31 + s1) + 0.07 * Math.sin(i * 0.93 + s2), head = i < 5 ? 1.3 - i * 0.06 : 1, end = i > n - tail ? Math.max(0.12, (n - 1 - i) / tail) ** 0.8 : 1;
      side.push({ x: P[i].x, y: P[i].y, nx, ny, ang, w: P[i].w * 0.5 * press * head * end });
    }
    const body = (kw, off = 0) => { g.beginPath(); side.forEach((q, i) => { const x = q.x + q.nx * (q.w * kw + off), y = q.y + q.ny * (q.w * kw + off); i ? g.lineTo(x, y) : g.moveTo(x, y); }); for (let i = n - 1; i >= 0; i--) { const q = side[i]; g.lineTo(q.x - q.nx * (q.w * kw - off), q.y - q.ny * (q.w * kw - off)); } g.closePath(); };
    g.save(); g.lineJoin = 'round'; g.lineCap = 'round'; g.fillStyle = `rgb(${INKC})`;
    // 1) 젖은 먹이 흙에 번진 자국: 넓고 옅게 두 번
    g.globalAlpha = 0.09 * k; body(1.9); g.fill(); g.globalAlpha = 0.12 * k; body(1.35, 0.8); g.fill();
    // 2) 몸통 · 3) 가운데로 모인 짙은 먹
    g.globalAlpha = 0.78 * k; body(1); g.fill();
    g.globalAlpha = 0.5 * k; body(0.55); g.fill();
    // 처음 눌린 자리: 둥근 먹 덩이와 살짝 번진 테
    const q0 = side[0]; g.globalAlpha = 0.85 * k; g.beginPath(); g.ellipse(q0.x - Math.cos(q0.ang) * q0.w * 0.2, q0.y - Math.sin(q0.ang) * q0.w * 0.2, q0.w * 1.15, q0.w * 1.0, q0.ang, 0, TAU); g.fill();
    g.globalAlpha = 0.12 * k; g.beginPath(); g.ellipse(q0.x, q0.y, q0.w * 1.8, q0.w * 1.5, q0.ang, 0, TAU); g.fill();
    // 4) 붓털 결: 몸통 안으로 흰 종이가 비치는 가는 줄 (끝으로 갈수록 많아진다 — 비백)
    g.strokeStyle = 'rgba(246,238,220,0.9)';
    for (let q = 0; q < 6; q++) { const off = (R() * 2 - 1) * 0.75, from = (R() * n * 0.5) | 0; g.lineWidth = 0.7 + R() * 1.1; g.globalAlpha = (0.16 + R() * 0.16) * k; g.beginPath(); let on = false;
      for (let i = from; i < n; i++) { const qq = side[i], late = i > n - tail; if (R() < (late ? 0.06 : 0.14)) { on = false; continue; } if (!late && R() < 0.05) break; const x = qq.x + qq.nx * qq.w * off, y = qq.y + qq.ny * qq.w * off; if (!on) { g.moveTo(x, y); on = true; } else g.lineTo(x, y); } g.stroke(); }
    // 5) 꺾인 자리: 붓이 멈칫한 곳에 먹이 고인다
    for (let i = 2; i < n - 2; i++) { const d = Math.abs(((side[i + 2].ang - side[i - 2].ang + Math.PI * 3) % TAU) - Math.PI); if (d > 0.55) { g.globalAlpha = 0.35 * k; g.beginPath(); g.ellipse(side[i].x, side[i].y, side[i].w * 1.05, side[i].w * 0.9, side[i].ang, 0, TAU); g.fill(); i += 3; } }
    // 6) 끝의 마른 붓: 털이 갈라져 가는 줄 여럿으로 흩어진다
    g.strokeStyle = `rgb(${INKC})`;
    for (let q = 0; q < 9; q++) { const off = (q / 8 - 0.5) * 2.1 * (0.8 + R() * 0.3); g.lineWidth = 0.8 + R() * 1.5; g.globalAlpha = (0.55 + R() * 0.35) * k; g.beginPath(); let on = false;
      for (let i = Math.max(0, n - tail - 3); i < n; i++) { const qq = side[i], ww = Math.max(qq.w, P[i].w * 0.22); if (R() < 0.1 + (i - (n - tail)) / tail * 0.3) { on = false; continue; } const x = qq.x + qq.nx * ww * off, y = qq.y + qq.ny * ww * off; if (!on) { g.moveTo(x, y); on = true; } else g.lineTo(x, y); } g.stroke(); }
    // 먹 튄 자국 몇 점
    for (let q = 0; q < 6; q++) { const qq = side[(R() * n) | 0], d = qq.w + 5 + R() * 12, sg = R() < 0.5 ? -1 : 1; g.globalAlpha = (0.35 + R() * 0.4) * k; g.beginPath(); g.arc(qq.x + qq.nx * d * sg, qq.y + qq.ny * d * sg, 0.8 + R() * 2, 0, TAU); g.fill(); }
    g.restore();
  }
}
// 작은 결정적 난수 (같은 획은 매번 같은 결로 그린다)
function mulberry(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// 어떤 부대가 앞에 서야 하나: 1 = 맨 앞(근접·돌격·방패), -1 = 맨 뒤(활·도술·치유)
export function frontness(sq) { const d = sq.def || UNITS[sq.type] || {}; if (d.heal) return -1; if (d.range > 0) return -0.8; if (d.charge || d.mounted || d.shield) return 1; return 0.7; }
// 부대마다 획 위 자리를 정한다: 옮겨 가는 거리 + 앞뒤 자리 맞춤이 가장 작은 짝. 부대는 많아야 열둘 남짓이라 바꿔 보기로 충분하다
export function planBrush(squads, brush, snap) {
  const n = squads.length; if (!n) return [];
  // 바위·담장 위 자리는 가장 가까운 빈 땅으로 옮긴다
  // 둥근 진은 영웅(가운데)에서 너무 멀지 않게 둘레를 조금 당긴다 (방원진이 서는 거리 안으로)
  const c = brush.closed ? brush.center() : null, pull = p => { if (!c) return p; const dx = p.x - c.x, dy = p.y - c.y, d = Math.hypot(dx, dy) || 1, k = d > 140 ? 140 / d : d < 70 ? 70 / d : 1; return { x: c.x + dx * k, y: c.y + dy * k, ang: p.ang }; };
  const spots = brush.sample(n).map(pull).map(p => { if (!snap) return p; const [x, y] = snap(p.x, p.y); return { x, y, ang: p.ang }; }), mx = spots.reduce((a, p) => a + p.x, 0) / n, sx = Math.max(60, Math.max(...spots.map(p => Math.abs(p.x - mx))));
  const cost = (sq, p) => Math.hypot(sq.cx - p.x, sq.cy - p.y) * 0.6 + 140 * Math.abs(frontness(sq) - clamp((p.x - mx) / sx, -1, 1)) * (sx > 70 ? 1 : 0.3);
  // 처음 짝: 앞에 설 부대부터 가장 앞쪽 자리를 고른다
  const order = squads.map((q, i) => i).sort((a, b) => frontness(squads[b]) - frontness(squads[a])), used = new Set(), pick = new Array(n);
  for (const i of order) { let best = -1, bc = 1e9; for (let j = 0; j < n; j++) if (!used.has(j)) { const c = cost(squads[i], spots[j]); if (c < bc) { bc = c; best = j; } } used.add(best); pick[i] = best; }
  // 두 부대의 자리를 바꿔서 나아지면 바꾼다
  for (let it = 0; it < 40; it++) { let better = false; for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) { const now = cost(squads[a], spots[pick[a]]) + cost(squads[b], spots[pick[b]]), sw = cost(squads[a], spots[pick[b]]) + cost(squads[b], spots[pick[a]]); if (sw < now - 0.5) { const t = pick[a]; pick[a] = pick[b]; pick[b] = t; better = true; } } if (!better) break; }
  const gap = brush.len / Math.max(1, brush.closed ? n : n - 1);
  return squads.map((sq, i) => ({ sq, ...spots[pick[i]], gap }));
}
// 부대 안의 인형 자리: 획의 결을 따라 한 줄로, 많으면 앞뒤 두 줄로 (줄 사이 간격은 획 위 자리 간격에 맞춘다)
export function lineSlots(n, ang, gap) {
  const rows = n > 5 ? 2 : 1, per = Math.ceil(n / rows), sp = clamp(gap * 0.8 / Math.max(1, per - 1), 18, 30), tx = Math.cos(ang), ty = Math.sin(ang), nx = -ty, ny = tx, out = [];
  for (let i = 0; i < n; i++) { const r = rows > 1 ? (i % 2) : 0, c = rows > 1 ? (i >> 1) : i, cnt = rows > 1 ? (r ? Math.floor(n / 2) : Math.ceil(n / 2)) : n, along = (c - (cnt - 1) / 2) * sp + (r ? sp * 0.5 : 0), across = rows > 1 ? (r ? 14 : -14) : 0;
    out.push({ dx: tx * along + nx * across, dy: ty * along + ny * across }); }
  return out;
}
// 진을 친다: 부대마다 자리로 옮기고, 인형들은 획의 결을 따라 늘어선다. 닫힌 획이면 영웅이 가운데로
export function applyBrush(b, brush) {
  const sq = b.formSquads(), plan = planBrush(sq, brush, (x, y) => b.spot(x, y));
  for (const p of plan) {
    const alive = p.sq.units.filter(u => !u.dead), sl = lineSlots(alive.length, p.ang, p.gap);
    // 가로로 긋던 획이면 결을 세로로 돌리지 않는다: 인형들의 앞뒤 순서는 오른쪽(요괴 쪽)이 앞
    alive.sort((u, v) => (u.x - v.x) * Math.cos(p.ang) + (u.y - v.y) * Math.sin(p.ang)).forEach((u, i) => { u.slot.dx = sl[i].dx; u.slot.dy = sl[i].dy; });
    b.orderMove(p.sq, p.x, p.y);
  }
  let hero = null;
  if (brush.closed) { const hq = b.squads.find(q => q.team === 0 && q.hero && q.alive > 0); if (hq) { const c = brush.center(); b.orderMove(hq, c.x, c.y); hero = c; } }
  return { plan, hero };
}
// 그리는 동안: 부대가 설 자리를 옅은 먹점으로 미리 보여 준다
export function drawBrushPreview(g, b, brush, T) {
  const sq = b.formSquads(); if (!sq.length || brush.len < BRUSH_MIN * 0.6) return;
  const plan = planBrush(sq, brush, (x, y) => b.spot(x, y)), ok = brush.len >= BRUSH_MIN;
  g.save();
  for (const p of plan) { g.globalAlpha = ok ? 0.75 : 0.35; g.strokeStyle = 'rgba(250,244,228,0.95)'; g.lineWidth = 3; g.beginPath(); g.ellipse(p.x, p.y + 4, 15, 7, 0, 0, TAU); g.stroke(); g.strokeStyle = `rgb(${INKC})`; g.lineWidth = 1.4; g.stroke(); }
  g.globalAlpha = 1; const last = brush.pts[brush.pts.length - 1];
  text(g, !ok ? '조금 더 길게 그으세요' : brush.closed ? `둥근 진 · 부대 ${sq.length} · 영웅은 가운데` : `이 획을 따라 진을 친다 · 부대 ${sq.length}`, clamp(last.x, 200, 1080), clamp(last.y - 46, 150, 520), { size: 20, font: FONT_B, fill: '#fbf3df', stroke: `rgba(${INKC},0.9)`, lw: 6 });
  g.restore();
}
