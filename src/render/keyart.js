// 첫 화면 그림 '열두 고개': 달밤, 열두 겹 고갯마루가 보름달 아래로 겹겹이 물러나고, 등불 행렬이 고개를 넘어간다.
// 앞 벼랑에는 달빛을 등진 장수가 서고, 오른쪽 벼랑의 늙은 소나무 가지가 달을 가로지른다. 그 위에 금박 서예 제호.
// 정지한 것(하늘·달·겹산·벼랑·소나무·제호)은 한 번 굽고, 등불·안개·별·깃발·군사·반딧불만 매 장면 그린다
import { W, H } from '../config.js';
import { TAU, makeCanvas, rng, clamp } from './draw.js';
import { mix, rgba, dab, stroke, vgrad, pinePads, pal } from './painted.js';
import { FONT, FONT_B } from './draw.js';
import { symbol } from './symbols.js';

const S = 1.5;
const bake = (w, h, fn, s = S) => { const c = makeCanvas(w * s, h * s), g = c.getContext('2d'); g.scale(s, s); fn(g); return c; };
const ease = k => k * k * (3 - 2 * k);
export const KEY_INTRO = 3.2;
const MOON = [968, 196], MOON_R = 112;

// ── 열두 고개: 먼 것(0)부터 가까운 것(11)까지. 고개(안부)는 지그재그로 달 아래까지 이어진다
const N = 12;
const RIDGES = Array.from({ length: N }, (_, i) => {
  const t = i / (N - 1), R = rng(300 + i * 17);
  const base = 300 + 310 * Math.pow(t, 1.35), amp = 150 - 70 * t, side = i % 2 ? -1 : 1;
  const nx = 880 - 250 * t + side * (18 + 70 * t);
  const bumps = Array.from({ length: 6 }, () => [R() * W, (0.35 + R() * 0.65) * amp, (50 + R() * 90) * (0.7 + t * 1.6)]);
  const f = x => { let y = base - Math.max(...bumps.map(([c, h, w]) => h * Math.exp(-((x - c) / w) * ((x - c) / w)))) - amp * 0.35 - Math.sin(x * (0.01 + t * 0.006) + i) * amp * 0.12;
    y += (amp * 0.85) * Math.exp(-Math.pow((x - nx) / (60 + 120 * t), 2)); y += Math.abs(Math.sin(x * 0.045 + i * 2)) * amp * 0.08 * (1 - t); return y; };   // 안부: 능선이 움푹 내려앉은 고개
  return { i, t, base, amp, nx, ny: f(nx), f };
});
// 등불이 놓일 길: 앞 들판에서 시작해 고개마다 넘어간다 (가까운 고개 → 먼 고개)
const ROAD = (() => {
  const pts = [[520, 742, N], [560, 690, N]];
  for (let i = N - 1; i >= 0; i--) { const r = RIDGES[i]; pts.push([r.nx, r.ny + 2, i]); }
  return pts;
})();
const LAMPS = (() => {
  // 고개 사이의 낯(가까운 능선 위, 먼 능선 아래)을 가로질러 오르는 굽잇길: 보이는 낯 안에서만 등불을 단다
  const out = [], push = (x, y, ri) => { for (let m = ri + 1; m < N; m++) if (y > RIDGES[m].f(x) - 2) return; out.push({ x, y, d: clamp((y - 300) / 420, 0, 1), k: out.length }); };
  { const r = RIDGES[N - 1]; for (let q = 0; q <= 1; q += 0.08) { const x = 560 + (r.nx - 560) * q, y = 640 + (r.ny + 2 - 640) * q; if (y < r.f(x) + 2) continue; out.push({ x, y, d: 1, k: out.length }); } }
  for (let i = N - 2; i >= 0; i--) {
    const a = RIDGES[i + 1], b = RIDGES[i], n = Math.max(4, Math.round(Math.abs(b.nx - a.nx) / (8 + 10 * a.t)));
    for (let j = 1; j <= n; j++) { const q = j / n, x = a.nx + (b.nx - a.nx) * q; let y = a.ny + (b.ny - a.ny) * q; y = Math.min(y, a.f(x) - 3); y = Math.max(y, b.f(x) + 3); if (y > a.f(x) - 2) continue; push(x, y, i); }
  }
  return out;
})();

// 빛 한 점 (한 번 굽고 'lighter' 로 겹친다)
const GL = new Map();
function glowSpr(rgb) { let c = GL.get(rgb); if (c) return c; c = makeCanvas(64, 64); const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0.5, 32, 32, 32); gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(0.3, `rgba(${rgb},0.35)`); gr.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); GL.set(rgb, c); return c; }
const glow = (g, x, y, r, rgb, a) => { if (a <= 0.003) return; g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = a; g.drawImage(glowSpr(rgb), x - r, y - r, r * 2, r * 2); g.restore(); };

// ── 하늘과 달 ──
let SKY = null;
function sky() {
  if (SKY) return SKY;
  SKY = bake(W, H, g => {
    const R = rng(91);
    g.fillStyle = vgrad(g, 0, 520, [[0, '#070a1a'], [0.35, '#141a3a'], [0.7, '#2c3160'], [1, '#4e4a78']]); g.fillRect(0, 0, W, H);
    // 은하수처럼 비스듬히 흐르는 옅은 별무리
    for (let i = 0; i < 900; i++) { const u = R(), x = u * W, y = 40 + u * 180 + (R() - 0.5) * 140; dab(g, x, y, 0.5 + R() * 0.9, 0.5 + R() * 0.9, '#dfe4ff', 0.08 + R() * 0.22); }
    for (let i = 0; i < 260; i++) dab(g, R() * W, R() * 360, 0.5 + R() * 1.1, 0.5 + R() * 1.1, '#f4f0e0', 0.2 + R() * 0.5);
    // 달무리: 겹겹의 빛
    const [mx, my] = MOON; for (const [r, a] of [[520, 0.18], [300, 0.22], [190, 0.3]]) { const gr = g.createRadialGradient(mx, my, MOON_R * 0.8, mx, my, r); gr.addColorStop(0, `rgba(236,230,255,${a})`); gr.addColorStop(1, 'rgba(236,230,255,0)'); g.globalAlpha = 1; g.fillStyle = gr; g.fillRect(mx - r, my - r, r * 2, r * 2); }
    // 보름달: 따뜻한 상아빛, 가장자리가 살짝 어둡고 옅은 바다 무늬
    const md = g.createRadialGradient(mx - 30, my - 34, 10, mx, my, MOON_R); md.addColorStop(0, '#fffbea'); md.addColorStop(0.7, '#f6edcf'); md.addColorStop(1, '#e2d4ae');
    g.globalAlpha = 1; g.fillStyle = md; g.beginPath(); g.arc(mx, my, MOON_R, 0, TAU); g.fill();
    g.save(); g.beginPath(); g.arc(mx, my, MOON_R, 0, TAU); g.clip();
    for (const [dx, dy, rx, ry, a] of [[-38, -20, 34, 26, 0.16], [12, 22, 44, 30, 0.13], [44, -36, 22, 18, 0.12], [-20, 48, 26, 16, 0.1], [56, 30, 16, 12, 0.12], [-60, 14, 14, 20, 0.1]]) dab(g, mx + dx, my + dy, rx, ry, '#b9a982', a);
    for (let i = 0; i < 40; i++) { const a = R() * TAU, d = R() * MOON_R * 0.9; dab(g, mx + Math.cos(a) * d, my + Math.sin(a) * d, 1.5 + R() * 4, 1.2 + R() * 3, '#c8b890', 0.12); }
    g.restore(); g.globalAlpha = 1;
  });
  return SKY;
}
// 달을 가로지르는 띠구름 (구름문): 달빛을 받은 아래 가장자리가 밝다
function ribbon(g, x, y, w, h, R, lit) {
  const pts = []; for (let k = 0; k <= 10; k++) pts.push([x + (k / 10) * w, y + Math.sin(k * 0.9 + R() * 0.6) * h * 0.3]);
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const [px, py] of pts) g.lineTo(px, py - h * 0.5); for (let k = pts.length - 1; k >= 0; k--) g.lineTo(pts[k][0], pts[k][1] + h * 0.5); g.closePath();
  g.globalAlpha = 1; g.fillStyle = vgrad(g, y - h, y + h, [[0, 'rgba(40,46,86,0.0)'], [0.5, 'rgba(46,52,96,0.85)'], [1, 'rgba(36,40,80,0.4)']]); g.fill();
  for (const [px, py] of pts) dab(g, px, py + h * 0.38, w * 0.06, h * 0.12, lit, 0.5);
  // 끝이 동그랗게 말린 구름 머리
  const [ex, ey] = pts[pts.length - 1]; g.beginPath(); g.arc(ex, ey, h * 0.5, 0, TAU); g.fillStyle = 'rgba(46,52,96,0.85)'; g.fill(); g.beginPath(); g.arc(ex, ey, h * 0.3, -1, 2.6); g.strokeStyle = rgba(lit, 0.7); g.lineWidth = 1.6; g.stroke();
}
let CLOUDS = null;
function clouds() {
  if (CLOUDS) return CLOUDS;
  CLOUDS = [[520, 30, 300], [460, 24, 220]].map(([w, h, seed]) => bake(w + 40, h * 2 + 20, g => ribbon(g, 10, h + 10, w, h, rng(seed), '#c9cff0')));
  return CLOUDS;
}

// ── 열두 겹 산 (안개와 달빛 테, 고개를 넘는 길) ──
let RIDGE = null;
function ridges() {
  if (RIDGE) return RIDGE;
  RIDGE = bake(W, H, g => {
    const R = rng(4242), near = '#0b1024', far = '#8a93c2', haze = '#a3a9d0';
    for (const r of RIDGES) {
      const col = mix(far, near, Math.pow(r.t, 0.8)), y0 = r.base - r.amp * 1.6;
      g.beginPath(); g.moveTo(-10, H); for (let x = -10; x <= W + 10; x += 4) g.lineTo(x, r.f(x)); g.lineTo(W + 10, H); g.closePath();
      g.globalAlpha = 1; g.fillStyle = vgrad(g, y0, r.base + 120, [[0, mix(col, '#000010', 0.15)], [0.5, col], [1, mix(col, haze, 0.25 * (1 - r.t))]]); g.fill();
      // 산결: 비스듬한 마른 붓 자국
      g.save(); g.clip(); for (let k = 0; k < 120 + r.t * 200; k++) { const x = R() * W, yy = r.f(x) + 6 + R() * 50; stroke(g, [x, yy, x - 6 - R() * 10, yy + 14 + R() * 20], mix(col, '#000010', 0.3), 1.2, 0.12); } g.restore();
      // 달빛 테: 달 쪽 비탈일수록 밝다
      for (let x = -10; x <= W; x += 4) { const y = r.f(x), s2 = r.f(x + 4) - y, near2 = Math.exp(-Math.pow((x - MOON[0]) / 520, 2)); if (s2 > -0.2) stroke(g, [x, y + 0.6, x + 4, r.f(x + 4) + 0.6], '#dfe4ff', 1.2, (0.05 + 0.45 * near2) * (1 - r.t * 0.6)); }
      g.globalAlpha = 1;
      // 가까운 고개 능선의 솔 실루엣
      if (r.i >= 9) for (let k = 0; k < 10 + (r.i - 9) * 6; k++) { const x = R() * W; if (Math.abs(x - r.nx) < 60) continue; const y = r.f(x) + 2, z = 0.5 + r.t * 0.9 + R() * 0.4, dk2 = mix(col, '#000010', 0.4), lean = (R() - 0.5) * 8 * z; g.globalAlpha = 1; stroke(g, [x, y, x + lean * 0.4, y - 10 * z, x + lean, y - 20 * z], dk2, 2.2 * z);
        // 반송: 비스듬한 줄기 끝에 납작한 솔잎 덩이가 옆으로 엇갈려 얹힌다
        for (const [dx, dy, rx] of [[-7, -17, 9], [6, -21, 10], [0, -27, 7]]) { dab(g, x + lean + dx * z, y + dy * z, rx * z, 2.8 * z, dk2, 1); dab(g, x + lean + dx * z + 1.5 * z, y + (dy - 1.2) * z, rx * 0.6 * z, 1.2 * z, mix(col, '#c9d2ff', 0.12), 0.6); } }
      // 고개를 넘는 길: 안부에서 아래(앞)로 흘러내린다 (앞 겹 산이 아랫부분을 가린다)
      if (r.i < N - 1) { const q = RIDGES[r.i + 1]; g.globalAlpha = 1; stroke(g, [r.nx, r.ny + 1, (r.nx + q.nx) / 2 + (r.i % 2 ? 30 : -30) * r.t, (r.ny + q.ny) / 2 + 20, q.nx, q.ny + 30], mix(col, '#e8e0ff', 0.25 + 0.3 * (1 - r.t)), 1.2 + r.t * 3.2, 0.45); }
      // 겹 사이 안개
      const mh = 24 + r.t * 30; g.globalAlpha = 1; g.fillStyle = vgrad(g, r.base - mh, r.base + 10, [[0, rgba(haze, 0)], [1, rgba(haze, 0.35 * (1 - r.t * 0.7))]]); g.fillRect(0, r.base - mh, W, mh + 10);
    }
    // 고갯마루 끝, 달 아래 서낭당 돌무더기와 장대
    const top = RIDGES[0]; g.globalAlpha = 1; for (const [dx, dy, rr2] of [[-5, 0, 3.4], [2, 0, 3], [-1, -3, 2.6], [1, -5.6, 1.8]]) dab(g, top.nx + dx, top.ny + dy - 1, rr2, rr2 * 0.8, '#3a3f66', 1);
    stroke(g, [top.nx + 9, top.ny, top.nx + 9, top.ny - 16], '#2a2f50', 1.2); dab(g, top.nx + 11, top.ny - 16, 2.6, 1.2, '#2a2f50', 1);
  });
  return RIDGE;
}

// ── 앞 벼랑: 왼쪽은 장수가 선 바위턱, 오른쪽은 늙은 소나무가 뿌리내린 벼랑 ──
let FRONT = null;
function front() {
  if (FRONT) return FRONT;
  FRONT = bake(W, H, g => {
    const R = rng(77), rock = '#070914', rim = '#c9d2ff';
    // 오른쪽 벼랑
    const rf = x => 470 + 60 * Math.exp(-Math.pow((x - 1080) / 120, 2)) * -1 + (1280 - x) * 0.32 + Math.sin(x * 0.05) * 6;
    const rf2 = x => rf(x) + Math.max(0, 1010 - x) * 2.2;
    g.beginPath(); g.moveTo(880, H); for (let x = 880; x <= W + 10; x += 6) g.lineTo(x, Math.min(H, rf2(x))); g.lineTo(W + 10, H); g.closePath(); g.globalAlpha = 1; g.fillStyle = vgrad(g, 380, H, [[0, '#141a30'], [1, rock]]); g.fill();
    for (let x = 900; x < W; x += 5) if (rf2(x) < H - 4) stroke(g, [x, rf2(x), x + 5, rf2(x + 5)], rim, 1.6, 0.35);
    // 늙은 소나무: 벼랑에서 굽어 올라 달 앞을 가로지르는 가지
    const P = Object.assign({}, pal('dusk'), { leaf: ['#05070f', '#0b0f1e', '#1a2240'] });
    const trunk = [[1172, 700], [1140, 520], [1150, 452], [1176, 392], [1130, 330], [1060, 286], [970, 262], [880, 262], [800, 276]];
    const tw = k => 40 - k * 4.4, L2 = [], R2 = [];
    for (let k = 0; k < trunk.length; k++) { const [x0, y0] = trunk[Math.max(0, k - 1)], [x1, y1] = trunk[Math.min(trunk.length - 1, k + 1)], dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, w = tw(k) / 2; L2.push([trunk[k][0] - dy / l * w, trunk[k][1] + dx / l * w]); R2.push([trunk[k][0] + dy / l * w, trunk[k][1] - dx / l * w]); }
    g.globalAlpha = 1; g.beginPath(); g.moveTo(L2[0][0], L2[0][1]); for (const [x, y] of L2) g.lineTo(x, y); for (let k = R2.length - 1; k >= 0; k--) g.lineTo(R2[k][0], R2[k][1]); g.closePath(); g.fillStyle = '#05070e'; g.fill();
    for (let k = 1; k < R2.length - 1; k++) stroke(g, [R2[k][0], R2[k][1], R2[k + 1][0], R2[k + 1][1]], rim, 1.6, 0.4);
    for (let k = 0; k < 14; k++) { const q = k / 14, i2 = Math.floor(q * (trunk.length - 2)); const [x, y] = trunk[i2]; stroke(g, [x - 6, y + 4, x + 4, y - 2], '#1a2038', 1.2, 0.5); }
    stroke(g, [1176, 392, 1222, 334, 1266, 300], '#05070e', 13); stroke(g, [1130, 330, 1158, 262, 1204, 220], '#05070e', 10); stroke(g, [970, 262, 960, 226, 990, 206], '#05070e', 6);
    stroke(g, [1222, 334, 1266, 300], rim, 1.2, 0.35); stroke(g, [1158, 262, 1204, 220], rim, 1.2, 0.35);
    pinePads(g, [[870, 246, 78, 17], [800, 262, 50, 12], [990, 200, 60, 15], [1040, 240, 46, 12], [1206, 204, 62, 16], [1262, 290, 56, 14], [1110, 300, 40, 11], [930, 226, 40, 10]], P, R, 1.15); g.globalAlpha = 1;
    // 솔잎 가장자리의 달빛
    for (const [x, y, w] of [[880, 236, 70], [990, 223, 56], [1200, 196, 54]]) stroke(g, [x - w * 0.7, y, x, y - 6, x + w * 0.7, y], rim, 1.3, 0.35);
    // 왼쪽 바위턱
    const lf = x => 560 - 40 * Math.exp(-Math.pow((x - 240) / 110, 2)) + Math.max(0, x - 330) * 0.9 + Math.sin(x * 0.07) * 4;
    g.beginPath(); g.moveTo(-10, H); for (let x = -10; x <= 460; x += 5) g.lineTo(x, Math.min(H, lf(x))); g.lineTo(460, H); g.closePath(); g.globalAlpha = 1; g.fillStyle = vgrad(g, 480, H, [[0, '#121830'], [1, rock]]); g.fill();
    for (let x = 0; x < 440; x += 5) stroke(g, [x, lf(x), x + 5, lf(x + 5)], rim, 1.6, 0.3 * clamp((x - 60) / 200, 0.2, 1));
    // 맨 앞 둔덕: 달빛 테를 두르고 풀 실루엣이 선다 (아래쪽 빈 어둠을 채운다)
    const ff = x => 640 - 26 * Math.exp(-Math.pow((x - 300) / 260, 2)) - 18 * Math.exp(-Math.pow((x - 980) / 240, 2)) + Math.sin(x * 0.02) * 4;
    g.beginPath(); g.moveTo(-10, H); for (let x = -10; x <= W + 10; x += 6) g.lineTo(x, ff(x)); g.lineTo(W + 10, H); g.closePath(); g.globalAlpha = 1; g.fillStyle = vgrad(g, 600, H, [[0, '#0e1328'], [1, '#04060e']]); g.fill();
    for (let x = 0; x < W; x += 5) stroke(g, [x, ff(x), x + 5, ff(x + 5)], rim, 1.4, 0.18 + 0.25 * Math.exp(-Math.pow((x - MOON[0]) / 400, 2)));
    for (let i = 0; i < 140; i++) { const x = R() * W, y = ff(x) + 2, h2 = 8 + R() * 16; stroke(g, [x, y, x + (R() - 0.5) * 6, y - h2], '#05070f', 1.6); if (R() < 0.3) stroke(g, [x + 1, y - h2 * 0.6, x + 2, y - h2], rim, 0.8, 0.3); }
    // 아래쪽: 메뉴가 읽히도록 짙게 가라앉힌다
    g.globalAlpha = 1; g.fillStyle = vgrad(g, 560, H, [[0, 'rgba(4,6,14,0)'], [1, 'rgba(4,6,14,0.7)']]); g.fillRect(0, 560, W, 160);
    g.fillStyle = vgrad(g, 0, 140, [[0, 'rgba(4,6,14,0.55)'], [1, 'rgba(4,6,14,0)']]); g.fillRect(0, 0, W, 140);
  });
  return FRONT;
}

// ── 사람 그림자: 달빛을 등진 장수와 행군하는 군사들 ──
function hero(g, x, y, s, t) {
  const ink = '#04060e', rim = 'rgba(210,220,255,0.75)', wave = Math.sin(t * 2.2);
  g.save(); g.translate(x, y); g.scale(s, s);
  // 바람에 날리는 전포 자락 (뒤로)
  g.fillStyle = ink; g.beginPath(); g.moveTo(-8, -118); g.quadraticCurveTo(-46, -90 + wave * 4, -70, -40 + wave * 8); g.quadraticCurveTo(-54, -34, -60, -12 + wave * 6); g.quadraticCurveTo(-30, -30, -12, -40); g.closePath(); g.fill();
  // 다리와 갑옷 자락
  g.beginPath(); g.moveTo(-14, 0); g.lineTo(-10, -44); g.lineTo(-2, -44); g.lineTo(-4, 0); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(6, 0); g.lineTo(4, -44); g.lineTo(12, -44); g.lineTo(16, 0); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(-22, -40); g.lineTo(22, -40); g.lineTo(16, -76); g.lineTo(-16, -76); g.closePath(); g.fill();
  // 몸통과 어깨
  g.beginPath(); g.moveTo(-17, -74); g.quadraticCurveTo(-20, -112, -10, -122); g.lineTo(12, -122); g.quadraticCurveTo(22, -112, 18, -74); g.closePath(); g.fill();
  g.beginPath(); g.ellipse(-15, -116, 11, 8, -0.3, 0, TAU); g.fill(); g.beginPath(); g.ellipse(17, -116, 11, 8, 0.3, 0, TAU); g.fill();
  // 투구: 둥근 정수리에 차양, 꼭대기의 붉은 상모
  g.beginPath(); g.arc(2, -134, 11, 0, TAU); g.fill(); g.beginPath(); g.ellipse(2, -140, 14, 9, 0, Math.PI, TAU); g.fill(); g.fillRect(-14, -140, 32, 3.4);
  stroke(g, [2, -149, 2, -160], ink, 2.4); g.globalAlpha = 1; g.fillStyle = '#7a1c16'; g.beginPath(); g.moveTo(2, -160); g.quadraticCurveTo(-10 - wave * 3, -168, -20 - wave * 5, -160); g.quadraticCurveTo(-8, -158, 2, -156); g.closePath(); g.fill(); g.fillStyle = ink;
  // 언월도: 오른손에 세워 든 긴 자루와 초승달 날
  stroke(g, [26, 6, 24, -196], ink, 3.6); g.beginPath(); g.moveTo(24, -196); g.quadraticCurveTo(46, -214, 40, -244); g.quadraticCurveTo(30, -220, 20, -210); g.closePath(); g.fill();
  stroke(g, [16, -110, 25, -96], ink, 6);
  // 달빛 테 (오른쪽 가장자리)
  stroke(g, [17, -74, 20, -110, 26, -118], rim, 1.6, 0.8); stroke(g, [15, 0, 12, -44], rim, 1.2, 0.6); stroke(g, [12, -134, 13, -142], rim, 1.4, 0.8); stroke(g, [26, 4, 25.4, -190], rim, 1, 0.6); stroke(g, [40, -244, 46, -214, 26, -197], rim, 1.4, 0.9);
  g.restore(); g.globalAlpha = 1;
}
function soldier(g, x, y, s, t, kind, ph) {
  const ink = '#05070f', bob = Math.abs(Math.sin(t * 3.2 + ph)) * 2 * s, step = Math.sin(t * 3.2 + ph) * 3 * s;
  g.save(); g.translate(x, y - bob); g.fillStyle = ink;
  g.beginPath(); g.moveTo(-5 * s + step, bob); g.lineTo(-3 * s, -16 * s); g.lineTo(3 * s, -16 * s); g.lineTo(5 * s - step, bob); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(-8 * s, -14 * s); g.lineTo(8 * s, -14 * s); g.lineTo(5 * s, -36 * s); g.lineTo(-5 * s, -36 * s); g.closePath(); g.fill();
  g.beginPath(); g.arc(0, -41 * s, 4.6 * s, 0, TAU); g.fill();
  if (kind === 2) { g.beginPath(); g.ellipse(0, -44 * s, 9 * s, 2.2 * s, 0, 0, TAU); g.fill(); g.fillRect(-3 * s, -50 * s, 6 * s, 6 * s); }   // 갓 쓴 이
  else { g.beginPath(); g.ellipse(0, -45 * s, 6 * s, 4.4 * s, 0, Math.PI, TAU); g.fill(); }
  if (kind === 1) { stroke(g, [6 * s, -6 * s, 6 * s, -86 * s], ink, 1.4 * s + 0.6); const fw = Math.sin(t * 4 + ph); g.fillStyle = '#6e1a14'; g.beginPath(); g.moveTo(6 * s, -86 * s); g.quadraticCurveTo(18 * s, (-84 + fw * 3) * s, 28 * s, -80 * s); g.lineTo(6 * s, -70 * s); g.closePath(); g.fill(); }   // 깃발 든 이
  else stroke(g, [5 * s, -4 * s, 7 * s, -70 * s], ink, 1.2 * s + 0.5);   // 창
  stroke(g, [5 * s, -14 * s, 4 * s, -34 * s], 'rgba(200,212,255,0.55)', 0.9);
  g.restore();
}

// ── 제호: 금박 서예 '열두 고개' ──
let LOGO = null;
const LW = 640, LH = 270;
function logo() {
  if (LOGO) return LOGO;
  LOGO = bake(LW, LH, g => {
    const cx = LW / 2, cy = 118, size = 132;
    // 뒤에 깔린 먹 번짐 (밤하늘에서 글자를 띄운다)
    for (let i = 0; i < 60; i++) { const R = rng(i * 13 + 5); dab(g, cx + (R() - 0.5) * 460, cy + (R() - 0.5) * 80, 60 + R() * 90, 22 + R() * 30, '#03040a', 0.07); }
    g.globalAlpha = 1;
    // 제호 뒤를 가로지르는 굵은 먹 붓질: 갈라진 붓끝과 마른 붓 자국, 위 가장자리에 금빛
    { const R2 = rng(77), x0 = cx - 330, x1 = cx + 330, hh = x => { const u = clamp((x - x0) / (x1 - x0), 0, 1); return 50 * Math.pow(Math.sin(u * Math.PI), 0.55) * (1 + 0.08 * Math.sin(u * 23)); }, mid = x => cy - 2 + Math.sin((x - x0) / 140) * 5;
      // 몸통: 가운데가 굵고 양 끝으로 갈수록 가늘어지는 한 번의 붓질
      g.beginPath(); g.moveTo(x0, mid(x0)); for (let x = x0; x <= x1; x += 5) g.lineTo(x, mid(x) - hh(x)); for (let x = x1; x >= x0; x -= 5) g.lineTo(x, mid(x) + hh(x) * 0.9); g.closePath();
      g.globalAlpha = 0.62; g.fillStyle = '#06070e'; g.fill(); g.globalAlpha = 1;
      // 마른 붓 자국: 끝으로 갈수록 갈라진 털 자국
      for (let i = 0; i < 40; i++) { const y = cy - 44 + i * 2.3, a = R2() * 0.4 + 0.15, xs = x1 - 120 - R2() * 120; stroke(g, [xs, y + (R2() - 0.5) * 2, x1 + 20 + R2() * 40, y + (R2() - 0.5) * 6], '#06070e', 0.8 + R2() * 1.6, a); }
      for (let i = 0; i < 18; i++) { const y = cy - 30 + i * 3.2; stroke(g, [x0 - 20 - R2() * 30, y, x0 + 60 + R2() * 60, y + (R2() - 0.5) * 3], '#06070e', 0.8 + R2(), 0.25); }
      for (let x = x0 + 20; x < x1 - 20; x += 4) stroke(g, [x, mid(x) - hh(x) + 1, x + 4, mid(x + 4) - hh(x + 4) + 1], '#d8a944', 1.1, 0.5 * Math.pow(Math.sin((x - x0) / (x1 - x0) * Math.PI), 2));
      g.globalAlpha = 1; }
    g.font = `400 ${size}px ${FONT_B}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    // 바깥 빛무리 → 먹 테 → 금박 → 윗면 빛 → 금 가루
    g.save(); g.shadowColor = 'rgba(255,196,110,0.6)'; g.shadowBlur = 38; g.lineJoin = 'round'; g.lineWidth = 16; g.strokeStyle = '#1c0e06'; g.strokeText('열두 고개', cx, cy); g.restore();
    g.lineJoin = 'round'; g.lineWidth = 8; g.strokeStyle = '#3a200c'; g.strokeText('열두 고개', cx, cy);
    const gr = g.createLinearGradient(0, cy - size * 0.55, 0, cy + size * 0.5); gr.addColorStop(0, '#fffbe6'); gr.addColorStop(0.28, '#f8de8e'); gr.addColorStop(0.5, '#e0a540'); gr.addColorStop(0.56, '#b87a22'); gr.addColorStop(0.8, '#e9be62'); gr.addColorStop(1, '#fbe3a0');
    g.fillStyle = gr; g.fillText('열두 고개', cx, cy);
    g.save(); g.globalCompositeOperation = 'source-atop'; const R = rng(9); for (let i = 0; i < 400; i++) dab(g, cx + (R() - 0.5) * 520, cy + (R() - 0.5) * 140, 0.6 + R() * 1.4, 0.6 + R() * 1.4, R() < 0.5 ? '#fffbe0' : '#8a5a18', 0.5); g.restore(); g.globalAlpha = 1;
    g.save(); g.lineWidth = 1.6; g.strokeStyle = 'rgba(255,250,225,0.55)'; g.translate(0, -1.6); g.strokeText('열두 고개', cx, cy); g.restore();
    // 붉은 낙관
    g.save(); g.translate(cx + 268, cy + 40); g.rotate(-0.08); const sz = 46; g.fillStyle = '#b8322a'; g.strokeStyle = '#4a120c'; g.lineWidth = 2; g.beginPath(); g.roundRect(-sz / 2, -sz / 2, sz, sz, 6); g.fill(); g.stroke(); g.globalAlpha = 0.6; g.strokeStyle = '#ffe8d0'; g.lineWidth = 1.4; g.beginPath(); g.roundRect(-sz / 2 + 4, -sz / 2 + 4, sz - 8, sz - 8, 4); g.stroke(); g.globalAlpha = 1; symbol(g, 'boss', 0, 0, sz * 0.74, '#fff2e0'); g.restore();
    // 영문 부제와 금선
    const sub = 'T W E L V E   P A S S E S'; g.font = `600 17px ${FONT}`; const sw = g.measureText(sub).width;
    g.fillStyle = '#e9cf8c'; g.fillText(sub, cx, cy + 96);
    for (const s of [-1, 1]) { const x0 = cx + s * (sw / 2 + 18), x1 = cx + s * (sw / 2 + 130); const lg = g.createLinearGradient(x0, 0, x1, 0); lg.addColorStop(0, '#e9cf8c'); lg.addColorStop(1, 'rgba(233,207,140,0)'); g.fillStyle = lg; g.fillRect(Math.min(x0, x1), cy + 95, Math.abs(x1 - x0), 1.4); g.beginPath(); g.moveTo(x0, cy + 90); g.lineTo(x0 + s * 6, cy + 96); g.lineTo(x0, cy + 102); g.lineTo(x0 - s * 6, cy + 96); g.closePath(); g.fillStyle = '#e9cf8c'; g.fill(); }
  }, 2);
  return LOGO;
}

// 글자 모양 가리개: 제호와 같은 자리에 같은 크기로 글자만 굽는다
let MASK = null, SHN = null;
function letterMask() {
  if (MASK) return MASK;
  MASK = bake(LW, LH, g => { g.font = `400 132px ${FONT_B}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText('열두 고개', LW / 2, 118); g.lineWidth = 3; g.strokeStyle = '#fff'; g.strokeText('열두 고개', LW / 2, 118); }, 1);
  return MASK;
}
// 글자 위로만 지나가는 빛줄기와 금박의 반짝임
function letterShine(g, lx, ly, t) {
  const q = ((t - 2.4) % 5.2) / 1.4; if (!(q > 0 && q < 1)) return;
  if (!SHN) SHN = makeCanvas(LW, LH); const c = SHN.getContext('2d'); c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, LW, LH);
  const sx = -80 + q * (LW + 160), gr = c.createLinearGradient(sx - 60, 0, sx + 60, 0); gr.addColorStop(0, 'rgba(255,250,235,0)'); gr.addColorStop(0.5, 'rgba(255,250,235,0.85)'); gr.addColorStop(1, 'rgba(255,250,235,0)');
  c.fillStyle = gr; c.beginPath(); c.moveTo(sx - 40, LH); c.lineTo(sx + 20, 0); c.lineTo(sx + 80, 0); c.lineTo(sx + 20, LH); c.closePath(); c.fill();
  c.globalCompositeOperation = 'destination-in'; c.drawImage(letterMask(), 0, 0, LW, LH);
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.8; g.drawImage(SHN, lx, ly, LW, LH); g.restore();
}
// 금박 글자 위에 이따금 반짝이는 별빛
const GLINTS = [[-190, -30], [-70, 26], [40, -40], [150, 10], [230, -28], [-130, 40], [96, 44]];
function glints(g, lx, ly, t) {
  GLINTS.forEach(([dx, dy], i) => { const ph = (t * 0.7 + i * 0.37) % 2.6; if (ph > 0.5) return; const k = Math.sin(ph / 0.5 * Math.PI), x = lx + LW / 2 + dx, y = ly + 118 + dy, r = 10 * k;
    g.save(); g.globalCompositeOperation = 'lighter'; glow(g, x, y, 14 * k + 2, '255,240,200', 0.6 * k); g.globalAlpha = k; g.strokeStyle = '#fffbe8'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x - r, y); g.lineTo(x + r, y); g.moveTo(x, y - r); g.lineTo(x, y + r); g.stroke(); g.lineWidth = 0.9; g.beginPath(); g.moveTo(x - r * 0.45, y - r * 0.45); g.lineTo(x + r * 0.45, y + r * 0.45); g.moveTo(x + r * 0.45, y - r * 0.45); g.lineTo(x - r * 0.45, y + r * 0.45); g.stroke(); g.restore(); });
}
// 달 앞을 지나는 학 (날갯짓하는 먹 실루엣)
function crane(g, x, y, s, t) {
  const f = Math.sin(t * 5), ink = '#05060c';
  g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = ink; g.strokeStyle = ink;
  g.beginPath(); g.ellipse(0, 0, 14, 3.4, -0.1, 0, TAU); g.fill();
  g.lineWidth = 1.6; g.beginPath(); g.moveTo(12, -1); g.quadraticCurveTo(22, -4, 30, -2); g.stroke(); g.beginPath(); g.arc(30, -2, 2.2, 0, TAU); g.fill();
  g.lineWidth = 1.2; g.beginPath(); g.moveTo(-12, 1); g.lineTo(-28, 4); g.stroke();
  for (const side of [-1, 1]) { g.beginPath(); g.moveTo(-4, 0); g.quadraticCurveTo(-2, side * -2 - f * 14 * side, 6, -f * 20 - 6); g.quadraticCurveTo(10, -f * 10, 8, 0); g.closePath(); g.fill(); }
  g.restore();
}
// 군사 행렬: 앞 들판에서 첫 고개로 오르는 길 위에
const MARCH = Array.from({ length: 20 }, (_, k) => { const q = k / 19, x = 380 + q * 300, y = 606 - q * 70, s = 0.95 - q * 0.5; return { x, y, s, kind: k % 5 === 2 ? 1 : k % 7 === 4 ? 2 : 0, ph: k * 0.7, lamp: k % 4 === 1 }; });

// ── 한 장면 ──
export function drawKeyArt(g, t) {
  const fade = clamp(t / 1.2, 0, 1), [mx, my] = MOON;
  g.drawImage(sky(), 0, 0, W, H);
  // 별이 반짝인다
  for (let i = 0; i < 46; i++) { const x = (i * 241.7) % W, y = 20 + (i * 97.3) % 320, a = 0.4 + 0.6 * Math.abs(Math.sin(t * (0.7 + (i % 5) * 0.3) + i)); if (Math.hypot(x - mx, y - my) < MOON_R + 30) continue; dab(g, x, y, 1.1, 1.1, '#fffbe8', a * 0.85); if (i % 9 === 0) { stroke(g, [x - 4, y, x + 4, y], '#fffbe8', 0.6, a * 0.5); stroke(g, [x, y - 4, x, y + 4], '#fffbe8', 0.6, a * 0.5); } }
  // 가끔 별똥별
  { const q = (t % 9) / 1.1; if (q < 1) { const x = 240 + q * 260, y = 60 + q * 70; stroke(g, [x - 60, y - 16, x, y], '#fffbe8', 1.4, (1 - q) * 0.7); } }
  // 달빛이 숨 쉬듯
  glow(g, mx, my, 260 + Math.sin(t * 0.8) * 10, '210,215,255', 0.16);
  // 달에서 내리는 옅은 빛살 (천천히 돈다)
  g.save(); g.globalCompositeOperation = 'lighter'; g.translate(mx, my); g.rotate(Math.sin(t * 0.05) * 0.1);
  for (let k = 0; k < 9; k++) { const a = 0.6 + k * 0.28, len = 620, gr = g.createLinearGradient(0, 0, Math.cos(a) * len, Math.sin(a) * len); gr.addColorStop(0, 'rgba(200,210,255,0.09)'); gr.addColorStop(1, 'rgba(200,210,255,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a - 0.04) * len, Math.sin(a - 0.04) * len); g.lineTo(Math.cos(a + 0.04) * len, Math.sin(a + 0.04) * len); g.closePath(); g.fill(); }
  g.restore();
  // 학 두 마리가 달 앞을 천천히 가로지른다
  { const q = (t * 0.035) % 1, x0 = 1340 - q * 1100; crane(g, x0, 150 + Math.sin(q * 6) * 12, 0.9, t); crane(g, x0 + 70, 176 + Math.sin(q * 6 + 1) * 10, 0.7, t + 0.4); }
  // 달 앞을 지나는 띠구름
  { const [c1, c2] = clouds(); g.globalAlpha = 1; g.drawImage(c1, ((t * 6) % 1700) - 420 + 360, my + 30, c1.width / S, c1.height / S); g.drawImage(c2, 1500 - ((t * 4) % 1900), my - 90, c2.width / S, c2.height / S); }
  g.globalAlpha = 1; g.drawImage(ridges(), 0, 0, W, H);
  // 산허리를 흐르는 안개
  for (let k = 0; k < 5; k++) { const y = 360 + k * 48, x = ((t * (6 + k * 3) + k * 400) % 1800) - 300; dab(g, x, y, 380, 18 + k * 4, '#aab0d8', 0.07); dab(g, x - 900, y + 10, 300, 14 + k * 4, '#aab0d8', 0.06); }
  // 등불 행렬: 아래에서부터 하나씩 켜지며 고개를 넘는다
  const lit = clamp((t - 0.8) / 2.2, 0, 1) * LAMPS.length;
  for (const l of LAMPS) { if (l.k > lit) continue; const fl = 0.75 + 0.25 * Math.sin(t * 7 + l.k * 1.7), s = 0.5 + (1 - l.d) * 1.6; glow(g, l.x, l.y - 2, 10 * s + 4, '255,170,80', 0.55 * fl); dab(g, l.x, l.y - 2, 1.4 * s, 1.8 * s, '#ffd08a', 0.95); }
  // 고갯마루 너머로 넘어가는 등불의 마지막 반짝임
  { const top = RIDGES[0]; glow(g, top.nx, top.ny - 4, 26 + Math.sin(t * 3) * 3, '255,190,110', 0.4 * clamp((t - 2.6) / 0.6, 0, 1)); }
  // 고개 사이 숲에 숨은 도깨비불
  for (let k = 0; k < 7; k++) { const r = RIDGES[4 + k], x = (r.nx + (k % 2 ? 140 : -150) + Math.sin(t * 0.6 + k) * 18), y = r.f(x) + 18 + Math.sin(t * 1.3 + k) * 6, a = 0.35 + 0.3 * Math.sin(t * 2 + k * 2); glow(g, x, y, 14, '120,220,200', a * 0.6); dab(g, x, y, 1.8, 2.4, '#c8fff0', a); }
  g.globalAlpha = 1; g.drawImage(front(), 0, 0, W, H);
  // 행군하는 군사들 (멀수록 작게). 등불을 든 이도 있다
  for (let k = MARCH.length - 1; k >= 0; k--) { const m = MARCH[k], walk = (t * 6) % 60; const x = m.x + (walk / 60) * 12 * m.s; soldier(g, x, m.y, m.s, t, m.kind, m.ph); if (m.lamp) { glow(g, x - 8 * m.s, m.y - 26 * m.s, 16 * m.s + 6, '255,170,80', 0.6); dab(g, x - 8 * m.s, m.y - 26 * m.s, 2.2 * m.s, 3 * m.s, '#ffd08a', 1); } }
  // 바위턱 위의 장수
  g.globalAlpha = 1; hero(g, 230, 534, 1.15, t);
  // 오른쪽 벼랑에 꽂은 군기 (바람에 펄럭인다)
  { const px = 1190, py = 520, ink = '#05070f'; stroke(g, [px, py, px - 4, py - 210], ink, 5); g.fillStyle = '#1a2752'; g.beginPath(); g.moveTo(px - 4, py - 206); for (let k = 0; k <= 10; k++) { const q = k / 10; g.lineTo(px - 4 - q * 120, py - 206 + Math.sin(t * 3 - q * 4) * 8 * q + q * 6); } for (let k = 10; k >= 0; k--) { const q = k / 10; g.lineTo(px - 4 - q * 120, py - 150 + Math.sin(t * 3 - q * 4 + 0.4) * 8 * q + q * 10); } g.closePath(); g.fill(); g.strokeStyle = 'rgba(200,212,255,0.4)'; g.lineWidth = 1.2; g.stroke();
    const fx = px - 60, fy = py - 178 + Math.sin(t * 3 - 2) * 4; g.globalAlpha = 0.9; g.fillStyle = '#b8322a'; g.beginPath(); g.arc(fx, fy, 14, Math.PI * 0.5, Math.PI * 1.5); g.fill(); g.fillStyle = '#2f4d9e'; g.beginPath(); g.arc(fx, fy, 14, -Math.PI * 0.5, Math.PI * 0.5); g.fill(); g.fillStyle = '#b8322a'; g.beginPath(); g.arc(fx, fy - 7, 7, 0, TAU); g.fill(); g.fillStyle = '#2f4d9e'; g.beginPath(); g.arc(fx, fy + 7, 7, 0, TAU); g.fill(); g.globalAlpha = 1; }
  g.globalAlpha = 1;
  // 반딧불과 떠도는 꽃잎
  for (let i = 0; i < 18; i++) { const ph = i * 2.7, x = (i * 151 + Math.sin(t * 0.4 + ph) * 60) % W, y = 420 + ((i * 67) % 250) + Math.sin(t * 0.9 + ph) * 16, a = clamp(Math.sin(t * 1.3 + ph), 0, 1); glow(g, x, y, 8, '255,230,150', a * 0.5); dab(g, x, y, 1.3, 1.3, '#fff4c0', a); }
  for (let i = 0; i < 14; i++) { const ph = i * 1.9, x = W - ((t * (22 + i * 3) + i * 180) % (W + 200)) + 100, y = 120 + ((t * (14 + i) + i * 90) % 560), r = 2.2 + (i % 3); dab(g, x, y, r, r * 0.55, i % 2 ? '#f0d264' : '#fbe9a0', 0.75, t * 2 + ph); }
  g.globalAlpha = 1;
  // 제호: 먹 번짐 속에서 금박이 번져 나온다
  const lk = clamp((t - 1.2) / 1.2, 0, 1);
  if (lk > 0) {
    const L = logo(), lx = 470 - LW / 2, ly = 34;
    glow(g, 470, 150, 300, '255,196,110', 0.12 * lk);
    g.save(); g.beginPath(); g.rect(lx - 20, ly - 20, (LW + 40) * ease(lk), LH + 40); g.clip(); g.globalAlpha = Math.min(1, lk * 1.6); g.drawImage(L, lx, ly, LW, LH); g.restore();
    // 금박 글자 위로만 지나가는 빛줄기와 반짝임
    if (lk >= 1) { letterShine(g, lx, ly, t); glints(g, lx, ly, t); }
    g.globalAlpha = clamp((t - 2.2) / 0.6, 0, 1); g.font = `400 21px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(4,6,14,0.7)'; g.fillText('긴 밤을 걷으러 가는 열두 옛이야기', 471, ly + 258); g.fillStyle = '#e8e2f6'; g.fillText('긴 밤을 걷으러 가는 열두 옛이야기', 470, ly + 256); g.globalAlpha = 1;
  }
  g.globalAlpha = 1;
  // 앞 둔덕 위로 깔리는 안개와 출정 단추 뒤의 따뜻한 불빛
  for (let k = 0; k < 3; k++) { const x = ((t * (8 + k * 4) + k * 520) % 1900) - 300; dab(g, x, 612 + k * 10, 420, 16, '#aab0d8', 0.08); }
  glow(g, 640, 660, 220 + Math.sin(t * 2) * 10, '255,170,90', 0.16 * clamp((t - 2.8) / 0.6, 0, 1));
  g.globalAlpha = 1;
  // 가장자리를 눌러 가운데로 시선을 모은다
  { const vg = g.createRadialGradient(W / 2, H * 0.42, 260, W / 2, H * 0.5, 820); vg.addColorStop(0, 'rgba(0,0,8,0)'); vg.addColorStop(1, 'rgba(0,0,8,0.55)'); g.fillStyle = vg; g.fillRect(0, 0, W, H); }
  if (fade < 1) { g.fillStyle = `rgba(0,0,0,${1 - ease(fade)})`; g.fillRect(0, 0, W, H); }
}

// 메뉴 화면들의 배경: 같은 달밤 고갯마루를 어둡게 가라앉혀 깐다 (제호·인물 없이, 안개와 등불·반딧불만 움직인다)
export function drawVista(g, t, dim = 0.5) {
  g.globalAlpha = 1; g.drawImage(sky(), 0, 0, W, H);
  glow(g, MOON[0], MOON[1], 250, '210,215,255', 0.14);
  g.globalAlpha = 1; g.drawImage(ridges(), 0, 0, W, H);
  for (let k = 0; k < 4; k++) { const y = 380 + k * 56, x = ((t * (5 + k * 3) + k * 400) % 1800) - 300; dab(g, x, y, 380, 18 + k * 4, '#aab0d8', 0.07); }
  for (const l of LAMPS) { const fl = 0.75 + 0.25 * Math.sin(t * 7 + l.k * 1.7), s = 0.5 + (1 - l.d) * 1.6; glow(g, l.x, l.y - 2, 10 * s + 4, '255,170,80', 0.5 * fl); }
  g.globalAlpha = 1; g.drawImage(front(), 0, 0, W, H);
  for (let i = 0; i < 14; i++) { const ph = i * 2.7, x = (i * 151 + Math.sin(t * 0.4 + ph) * 60) % W, y = 300 + ((i * 67) % 380) + Math.sin(t * 0.9 + ph) * 16, a = clamp(Math.sin(t * 1.3 + ph), 0, 1); glow(g, x, y, 8, '255,230,150', a * 0.45); }
  g.globalAlpha = 1; g.fillStyle = `rgba(6,8,20,${dim})`; g.fillRect(0, 0, W, H);
  const vg = g.createRadialGradient(W / 2, H / 2, 280, W / 2, H / 2, 820); vg.addColorStop(0, 'rgba(0,0,8,0)'); vg.addColorStop(1, 'rgba(0,0,8,0.6)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
}
