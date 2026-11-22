// 먹과 붓: 붓으로 그은 획, 튄 먹물, 먹 번짐. (붓으로 그린 그림 기호는 symbols.js 가 이 붓 획으로 그린다)
// 획의 모양은 씨앗(seed)으로 정해지고, 한 번 구운 그림을 돌려 쓴다 (전투 중에 매 프레임 다시 그리지 않는다)
import { TAU } from './draw.js';

export const MEOK = '#17151c';   // 진한 먹
export const JU = '#b8301f';     // 주묵(붉은 먹)

const rng = seed => { let s = (Math.imul(seed | 0, 2654435761) ^ 0x9e3779b9) >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; };
const hash = (a, b) => { let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

// ── 붓 한 획: 중심선 P(t) 를 따라 굵기 prof(t)·w 로 긋는다 ──
// 먹이 넉넉한 앞쪽은 면으로, 뒤로 갈수록 붓털이 갈라져 마른 자국(비백)이 남고, 붓을 뗀 자리에 먹물이 튄다
export function brushStroke(g, P, o) {
  const R = rng(o.seed || 1), w = o.w, prof = o.prof, N = o.steps || 48, dry = o.dry === undefined ? 0.5 : o.dry;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, p = P(t), a = P(Math.max(0, t - 0.012)), b = P(Math.min(1, t + 0.012));
    let nx = -(b[1] - a[1]), ny = b[0] - a[0]; const l = Math.hypot(nx, ny) || 1;
    pts.push([p[0], p[1], nx / l, ny / l, prof(t) * w]);
  }
  g.fillStyle = o.col; g.strokeStyle = o.col; g.lineCap = 'round'; g.lineJoin = 'round';
  // 1) 몸통: 가장자리가 살짝 우는 면. 마른 구간에 들어서면 빠르게 가늘어진다
  const end = Math.min(N, Math.round(N * (dry + (1 - dry) * 0.4))), edge = [];
  for (let i = 0; i <= end; i++) { const t = i / N, thin = t > dry ? 1 - (t - dry) / ((end / N) - dry + 1e-6) * 0.7 : 1; edge.push([pts[i][4] * thin * (1 + (R() - 0.5) * 0.14), pts[i][4] * thin * (1 + (R() - 0.5) * 0.14)]); }
  g.beginPath();
  for (let i = 0; i <= end; i++) { const p = pts[i]; g[i ? 'lineTo' : 'moveTo'](p[0] + p[2] * edge[i][0], p[1] + p[3] * edge[i][0]); }
  for (let i = end; i >= 0; i--) { const p = pts[i]; g.lineTo(p[0] - p[2] * edge[i][1], p[1] - p[3] * edge[i][1]); }
  g.closePath(); g.fill();
  // 붓을 꾹 눌러 댄 머리: 둥글게 맺힌다
  { const p = pts[0], q = pts[2], r0 = p[4] * 1.04, ang = Math.atan2(q[1] - p[1], q[0] - p[0]); g.beginPath(); for (let i = 0; i <= 20; i++) { const a = ang + Math.PI / 2 + i / 20 * Math.PI, rr = r0 * (1 + (R() - 0.5) * 0.12); g[i ? 'lineTo' : 'moveTo'](p[0] + Math.cos(a) * rr * 0.8 + Math.cos(ang) * r0 * 0.1, p[1] + Math.sin(a) * rr); } g.closePath(); g.fill(); }
  // 2) 붓털 한 올 한 올: 끝으로 갈수록 드문드문 끊긴다
  const nb = o.n || Math.max(8, Math.round(w * 1.15));
  for (let j = 0; j < nb; j++) {
    const u = ((j + 0.5) / nb * 2 - 1) * 0.97 + (R() - 0.5) * 0.1, i0 = Math.round(R() * 0.05 * N), i1 = Math.round(Math.min(1, dry + (1 - dry) * (0.3 + R() * 0.8) * (1 - Math.abs(u) * 0.2)) * N);
    g.lineWidth = Math.max(0.7, (w * 2 / nb) * (0.55 + R() * 0.95)); g.globalAlpha = 0.5 + R() * 0.5;
    const wob = o.wob || 0, wf = 3 + R() * 7, wp = R() * TAU;   // 붓털 한 올의 흔들림
    const gap = R() < 0.6; let on = true, next = dry * (0.7 + R() * 0.5), pen = false;
    g.beginPath();
    for (let i = i0; i <= i1; i++) {
      const t = i / N, p = pts[i];
      if (gap && t > next) { on = !on; next = t + (on ? 0.05 + R() * 0.15 : 0.012 + R() * 0.05); }
      if (!on) { pen = false; continue; }
      const uu = u + (wob ? Math.sin(t * wf + wp) * wob * Math.min(1, t * 2) : 0), x = p[0] + p[2] * p[4] * uu, y = p[1] + p[3] * p[4] * uu;
      if (pen) g.lineTo(x, y); else { g.moveTo(x, y); pen = true; }
    }
    g.stroke();
  }
  g.globalAlpha = 1;
  // 3) 몸통 안의 마른 줄: 먹이 덜 묻은 자리를 긁어 낸다
  g.save(); g.globalCompositeOperation = 'destination-out';
  const ns = o.streaks === undefined ? Math.round(w * 0.55) : o.streaks;
  for (let j = 0; j < ns; j++) {
    const u = (R() * 2 - 1) * 0.82, i0 = Math.round(dry * (0.3 + R() * 0.7) * N), i1 = Math.min(N, i0 + Math.round((0.12 + R() * 0.5) * N));
    g.lineWidth = 0.6 + R() * (w > 20 ? 2.2 : 1.3); g.globalAlpha = 0.3 + R() * 0.55; g.beginPath();
    for (let i = i0; i <= i1; i++) { const p = pts[i]; g[i === i0 ? 'moveTo' : 'lineTo'](p[0] + p[2] * p[4] * u, p[1] + p[3] * p[4] * u); }
    g.stroke();
  }
  g.restore();
  // 4) 붓을 뗀 쪽으로 튄 먹물
  const m = o.drops === undefined ? 7 : o.drops, a = pts[N], b = pts[N - 3], dx = a[0] - b[0], dy = a[1] - b[1], l = Math.hypot(dx, dy) || 1, ang = Math.atan2(dy, dx);
  for (let j = 0; j < m; j++) {
    const d = w * (0.5 + R() * 3.4), sp = (R() - 0.5) * 1.2, cx = a[0] + (dx / l * Math.cos(sp) - dy / l * Math.sin(sp)) * d, cy = a[1] + (dx / l * Math.sin(sp) + dy / l * Math.cos(sp)) * d, r = Math.max(0.6, w * (0.03 + R() * R() * 0.17));
    g.globalAlpha = 0.55 + R() * 0.45; g.beginPath(); g.ellipse(cx, cy, r * (1 + R() * 0.9), r, ang + sp, 0, TAU); g.fill();
  }
  g.globalAlpha = 1;
}

// 떨어진 먹물: 울퉁불퉁한 얼룩에서 가시가 뻗고 방울이 흩어진다
function splat(g, R0, seed, col, spikes = 1) {
  const R = rng(seed); g.fillStyle = col;
  const ph = [R() * TAU, R() * TAU, R() * TAU], am = [0.14 + R() * 0.1, 0.09 + R() * 0.08, 0.04 + R() * 0.05];
  g.beginPath();
  for (let i = 0; i <= 72; i++) { const a = i / 72 * TAU, r = R0 * (1 + am[0] * Math.sin(a * 3 + ph[0]) + am[1] * Math.sin(a * 5 + ph[1]) + am[2] * Math.sin(a * 9 + ph[2])); g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r * 0.94); }
  g.closePath(); g.fill();
  const ns = Math.round((6 + R() * 5) * spikes);
  for (let j = 0; j < ns; j++) {
    const a = R() * TAU, len = R0 * (1.15 + R() * R() * (spikes < 1 ? 0.7 : 1.7)), bw = R0 * (0.05 + R() * 0.09), ca = Math.cos(a), sa = Math.sin(a);
    g.beginPath(); g.moveTo(ca * R0 * 0.7 - sa * bw, sa * R0 * 0.7 + ca * bw); g.quadraticCurveTo(ca * len * 0.72, sa * len * 0.72, ca * len, sa * len); g.quadraticCurveTo(ca * len * 0.72, sa * len * 0.72, ca * R0 * 0.7 + sa * bw, sa * R0 * 0.7 - ca * bw); g.closePath(); g.fill();
    if (R() < 0.7) { const d = len * (1.06 + R() * 0.35); g.beginPath(); g.arc(ca * d, sa * d, R0 * (0.04 + R() * 0.09), 0, TAU); g.fill(); }
  }
  const nd = 10 + ((R() * 9) | 0);
  for (let j = 0; j < nd; j++) { const a = R() * TAU, d = R0 * (1.3 + R() * 2), r = R0 * (0.02 + R() * R() * 0.11); g.globalAlpha = 0.6 + R() * 0.4; g.beginPath(); g.arc(Math.cos(a) * d, Math.sin(a) * d, r, 0, TAU); g.fill(); }
  g.globalAlpha = 1;
}

// 물 먹은 종이에 번진 먹: 옅은 얼룩이 겹치고 가장자리에 마른 테가 남는다
// 먹 번짐: 들쭉날쭉한 번짐 몇 겹. 물이 마르며 가장자리에 먹이 모여 테가 진다 (흐릿한 얼룩이 아니라 경계가 보인다)
function wash(g, R0, seed, col) {
  const R = rng(seed);
  for (let j = 0; j < 5; j++) {
    const a = R() * TAU, d = R0 * R() * 0.36, r = R0 * (0.42 + R() * 0.42), cx = Math.cos(a) * d, cy = Math.sin(a) * d * 0.85, N = 22, ph = R() * 9;
    const shape = () => { g.beginPath(); for (let i = 0; i <= N; i++) { const an = i / N * TAU, rr = r * (0.86 + 0.14 * Math.sin(an * 3 + ph) + 0.06 * Math.sin(an * 7 + ph * 2)); const x = cx + Math.cos(an) * rr, y = cy + Math.sin(an) * rr; if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.closePath(); };
    shape(); g.fillStyle = rgba(col, 0.13); g.fill();
    g.save(); shape(); g.clip(); const gr = g.createRadialGradient(cx, cy, r * 0.5, cx, cy, r); gr.addColorStop(0, rgba(col, 0)); gr.addColorStop(1, rgba(col, 0.16)); g.fillStyle = gr; g.fillRect(cx - r, cy - r, r * 2, r * 2); g.restore();
    shape(); g.strokeStyle = rgba(col, 0.28); g.lineWidth = Math.max(1.2, R0 * 0.018); g.stroke();
  }
}

const prof = {
  // 꾹 눌러 시작해 길게 빼는 획
  press: t => (t < 0.1 ? 0.55 + 0.45 * Math.sin(t / 0.1 * Math.PI / 2) : 1 - 0.55 * Math.pow((t - 0.1) / 0.9, 1.5)),
  // 가늘게 들어가 가운데가 부풀고 날카롭게 빠지는 베기
  cut: t => 0.14 + 0.86 * Math.pow(Math.sin(Math.min(1, t * 1.12) * Math.PI), 0.7) * (1 - 0.25 * t),
  // 한 번에 죽 그은 굵은 띠
  band: t => (t < 0.06 ? 0.6 + 0.4 * t / 0.06 : 1 - 0.3 * Math.pow((t - 0.06) / 0.94, 2)),
};
// 구워 두는 그림들: [가로, 세로, 그리기(g, 씨앗, 색)]
const KIND = {
  // 베기 자국: 왼쪽에서 오른쪽으로, 위로 볼록한 초승달 (길이 약 120)
  slash: [250, 130, (g, s, col) => brushStroke(g, t => { const a = -Math.PI / 2 - 0.86 + 1.72 * t; return [Math.cos(a) * 80, 58 + Math.sin(a) * 80]; }, { w: 15, prof: prof.cut, dry: 0.42, seed: s, col, drops: 6 })],
  // 제목 아래에 죽 그은 마른 붓 자국 (길이 약 500)
  swash: [640, 150, (g, s, col) => brushStroke(g, t => [-250 + 500 * t, 7 * Math.sin(t * 3.1 - 0.5) - 3 * t], { w: 36, prof: prof.band, dry: 0.34, seed: s, col, steps: 72, drops: 9 })],
  // 한 붓에 그린 둥근 고리 (반지름 80, 다 닫지 않는다)
  enso: [250, 250, (g, s, col) => brushStroke(g, t => { const a = 2.2 + t * 5.75; return [Math.cos(a) * 80 * (1 + 0.03 * Math.sin(t * 5)), Math.sin(a) * 80]; }, { w: 11, prof: prof.press, dry: 0.5, seed: s, col, steps: 84, drops: 5 })],
  splat: [250, 250, (g, s, col) => splat(g, 32, s, col)],
  // 글자를 올릴 만큼 넓고 둥근 먹 자국
  blot: [270, 270, (g, s, col) => splat(g, 74, s, col, 0.55)],
  // 글자를 얹는 굵은 먹 띠: 왼쪽 삼분의 이가 먹으로 꽉 찬다
  bar: [640, 160, (g, s, col) => brushStroke(g, t => [-250 + 500 * t, 5 * Math.sin(t * 2.6 - 0.3) - 2 * t], { w: 42, prof: prof.band, dry: 0.6, seed: s, col, steps: 72, drops: 8, streaks: 9 })],
  wash: [270, 270, (g, s, col) => wash(g, 112, s, col)],
};
const CACHE = new Map(), SS = 2;
function sprite(kind, col, v) {
  const key = kind + col + v; let sp = CACHE.get(key);
  if (!sp) {
    const [w, h, draw] = KIND[kind], c = document.createElement('canvas'); c.width = w * SS; c.height = h * SS;
    const g = c.getContext('2d'); g.scale(SS, SS); g.translate(w / 2, h / 2); draw(g, 11 + v * 37 + kind.length * 101, col);
    sp = { c, w, h }; CACHE.set(key, sp);
  }
  return sp;
}
// 구운 먹 그림을 (x, y) 가운데에 놓는다. s = 크기, rot = 기울기, v = 모양 번호(0~2), sx = 가로 배율(음수면 뒤집기)
export function drawInk(g, kind, x, y, s = 1, rot = 0, alpha = 1, col = MEOK, v = 0, sx = 1) {
  if (alpha <= 0.01) return; const sp = sprite(kind, col, v);
  g.save(); g.translate(x, y); if (rot) g.rotate(rot); g.scale(s * sx, s); g.globalAlpha *= alpha; g.drawImage(sp.c, -sp.w / 2, -sp.h / 2, sp.w, sp.h); g.restore();
}
// ── 전투 중에 바로 그리는 것들 (구울 수 없는 모양) ──
// 무기가 지나간 자리에 남는 먹 자국: (cx, cy) 를 중심으로 a0 → a1 로 휘두른 호. 무기 쪽(a1)이 굵고 꼬리는 마른 붓 자국
export function inkTrail(g, cx, cy, R, a0, a1, w, alpha, col = MEOK, seed = 0) {
  const d = a1 - a0; if (Math.abs(d) < 0.06 || alpha <= 0.02) return;
  const n = 12, pr = t => (t < 0.8 ? 0.1 + 0.9 * Math.pow(t / 0.8, 1.2) : 1 - 0.55 * Math.pow((t - 0.8) / 0.2, 2));
  g.save(); g.fillStyle = col; g.strokeStyle = col; g.lineCap = 'round'; g.globalAlpha *= alpha * 0.86;
  g.beginPath();
  for (let i = 0; i <= n; i++) { const t = i / n, a = a0 + d * t, r = R + w * pr(t) * 0.55; g[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
  for (let i = n; i >= 0; i--) { const t = i / n, a = a0 + d * t, r = R - w * pr(t) * 0.45; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
  g.closePath(); g.save(); g.globalAlpha *= 0.8; g.lineJoin = 'round'; g.strokeStyle = '#fbf7ec'; g.lineWidth = Math.max(1.4, w * 0.3); g.stroke(); g.restore(); g.fill();
  // 꼬리로 흩어지는 붓털 자국
  for (let j = 0; j < 4; j++) {
    const rr = R + (j - 1.5) * w * 0.3 + (hash(seed, j) - 0.5) * w * 0.2, s0 = a0 - d * (0.1 + hash(seed, j + 9) * 0.32), e0 = a0 + d * (0.2 + hash(seed, j + 5) * 0.3);
    g.lineWidth = Math.max(0.7, w * (0.07 + hash(seed, j + 3) * 0.08)); g.beginPath(); g.arc(cx, cy, rr, Math.min(s0, e0), Math.max(s0, e0)); g.stroke();
  }
  // 날 끝에 스치는 흰 빛 한 줄
  g.globalAlpha *= 0.8; g.strokeStyle = '#fffdf2'; g.lineWidth = Math.max(0.8, w * 0.11); g.beginPath(); const h0 = a0 + d * 0.5, h1 = a0 + d * 0.97; g.arc(cx, cy, R + w * 0.32, Math.min(h0, h1), Math.max(h0, h1)); g.stroke();
  g.restore();
}
// 찌르거나 쏜 방향으로 뻗는 짧은 먹 자국: (x0, y0) 에서 가늘게 시작해 (x1, y1) 쪽이 굵다
export function inkStreak(g, x0, y0, x1, y1, w, alpha, col = MEOK) {
  if (alpha <= 0.02) return; const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  g.save(); g.globalAlpha *= alpha * 0.84; g.fillStyle = col; g.beginPath();
  g.moveTo(x0, y0); g.quadraticCurveTo(x0 + dx * 0.6 + nx * w * 0.5, y0 + dy * 0.6 + ny * w * 0.5, x1 + nx * w * 0.2, y1 + ny * w * 0.2); g.lineTo(x1 + dx / l * w * 0.8, y1 + dy / l * w * 0.8); g.lineTo(x1 - nx * w * 0.2, y1 - ny * w * 0.2); g.quadraticCurveTo(x0 + dx * 0.6 - nx * w * 0.5, y0 + dy * 0.6 - ny * w * 0.5, x0, y0); g.closePath(); g.fill();
  g.strokeStyle = col; g.lineCap = 'round'; g.lineWidth = Math.max(0.7, w * 0.16); g.beginPath(); g.moveTo(x0 - dx * 0.25 + nx * w * 0.3, y0 - dy * 0.25 + ny * w * 0.3); g.lineTo(x0 + dx * 0.3 + nx * w * 0.3, y0 + dy * 0.3 + ny * w * 0.3); g.moveTo(x0 - dx * 0.4 - nx * w * 0.28, y0 - dy * 0.4 - ny * w * 0.28); g.lineTo(x0 + dx * 0.2 - nx * w * 0.28, y0 + dy * 0.2 - ny * w * 0.28); g.stroke();
  g.globalAlpha *= 0.85; g.strokeStyle = '#fffdf2'; g.lineWidth = Math.max(0.8, w * 0.2); g.beginPath(); g.moveTo(x0 + dx * 0.45, y0 + dy * 0.45); g.lineTo(x1, y1); g.stroke();
  g.restore();
}
// 장면이 바뀔 때 화면을 쓸고 지나가는 먹: k = 0(없음) → 1(다 덮음). dir > 0 이면 왼쪽에서 덮어 오고, dir < 0 이면 오른쪽으로 걷힌다
// 화면 너비보다 긴 붓 자국 여섯 줄이 저마다 조금씩 어긋나게 지나간다. 붓 자국은 머리가 굵고 꼬리가 갈라지며(비백) 먹물이 튄다.
// 진한 먹(농묵) 둘레에는 옅은 먹(담묵)이 한 겹 먼저 번진다. 빠르게 지나가는 큰 그림이라 1배로 굽는다
const WIPES = [];
function wipeStroke(v) {
  if (!WIPES[v]) {
    const w = 1900, h = 250, c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.translate(w / 2, h / 2);
    brushStroke(g, t => [-850 + 1700 * t, 15 * Math.sin(t * 2.6 + v * 1.7) + 6 * Math.sin(t * 7.3 + v) - 6 * t], { w: 92, prof: prof.band, dry: 0.7, seed: 301 + v * 53, col: MEOK, steps: 130, drops: 12, streaks: 18, n: 64, wob: 0.07 });
    WIPES[v] = c;
  }
  return WIPES[v];
}
export function inkWipe(g, k, dir, W, H) {
  if (k <= 0) return; const bands = 6, gap = H / bands;
  g.save();
  for (let i = 0; i < bands; i++) {
    const q = Math.max(0, Math.min(1, k * 1.22 - hash(i, 3) * 0.22)), e = q * q * (3 - 2 * q), cy = gap * (i + 0.5) + (hash(i, 9) - 0.5) * 16, rot = (hash(i, 5) - 0.5) * 0.05 - 0.02, sp = wipeStroke(i % 3);
    // 덮을 때는 갈라진 꼬리가 앞서 나가고, 걷힐 때는 붓 자국을 뒤집어 갈라진 꼬리가 뒤에 남는다
    const flip = dir > 0 ? 1 : -1, cx = dir > 0 ? -900 + 1740 * e : 440 + 1760 * (1 - e);
    for (const [dx, sy, a] of [[130, 1.34, 0.13], [62, 1.16, 0.26], [0, 1, 1]]) { g.save(); g.translate(cx + dx * flip, cy); g.rotate(rot * flip); g.scale(flip, sy * gap / 142); g.globalAlpha = a; g.drawImage(sp, -950, -125); g.restore(); }
  }
  // 다 덮인 순간에는 빈틈없이 먹빛
  if (k > 0.86) { g.globalAlpha = (k - 0.86) / 0.14; g.fillStyle = MEOK; g.fillRect(0, 0, W, H); }
  g.restore();
}
