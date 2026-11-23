// 첫 화면 '열두 고개': 인형극 무대 위에 오린 종이로 세운 달밤의 고갯길.
// 막이 걷히면 들보 뒤에서 현판이 내려와 붓글씨가 써지고, 막대 인형들이 양옆에서 들어오고,
// 고갯길을 따라 청사초롱 열두 개가 아래에서부터 하나씩 켜진다.
// 정지한 그림(극장·하늘·산·길)은 한 번 구워 두고, 움직이는 것(등불·도깨비불·인형·현판·막)만 매 장면 그린다
import { W, H } from '../config.js';
import { TAU, INK, FONT, FONT_B, text, ell, rr, poly, line, path, st, makeCanvas, rng, clamp, easeOutBack } from './draw.js';
import { THEMES, padPine, grassTuft, paperFlower } from './terrain.js';
import { taegeuk } from './symbols.js';
import { drawFrame, puppet } from '../ui/theater.js';
import { seal } from '../ui/ui.js';

// 무대 안쪽(막이 걷히면 보이는 곳)과 앞판(인형의 막대를 가리는 나무판)의 윗면
export const STAGE = { x: 130, y: 92, w: 1020, h: 508 };
const APRON = 578, S = 1.5;
const ease = k => k * k * (3 - 2 * k);
// 고갯길: 앞마당에서 갈지자로 올라가 오른쪽 고갯마루에 닿는다
const ROAD = [[210, 592], [360, 568], [520, 552], [664, 534], [568, 508], [470, 490], [612, 466], [760, 452], [872, 432], [800, 414], [900, 399], [952, 386]];
const PASS = ROAD[ROAD.length - 1];
const depth = y => clamp((y - 380) / 210, 0, 1);
// 길의 가운뎃줄을 4px 간격으로 (굽이마다 이차 곡선)
const CENTER = (() => { const pts = []; for (let i = 0; i < ROAD.length - 1; i++) { const [x0, y0] = ROAD[i], [x1, y1] = ROAD[i + 1], mx = (x0 + x1) / 2 + (i % 2 ? 5 : -5), my = (y0 + y1) / 2, n = Math.max(4, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 4)); for (let k = i ? 1 : 0; k <= n; k++) { const f = k / n, a = (1 - f) * (1 - f), b = 2 * f * (1 - f), c = f * f; pts.push({ x: a * x0 + b * mx + c * x1, y: a * y0 + b * my + c * y1, seg: i }); } } return pts; })();
// 등불 열두 개: 보이는 길을 따라 고르게, 서로 44px 넘게 떨어지게 (인형들 뒤는 비운다)
const LAMPS = (() => {
  const ok = q => !(q.x < 580 && q.y > 440);
  for (let gap = 52; gap > 20; gap -= 2) {
    const out = []; let acc = 0;
    for (let i = 1; i < CENTER.length && out.length < 12; i++) { const q = CENTER[i]; acc += Math.hypot(q.x - CENTER[i - 1].x, q.y - CENTER[i - 1].y); if (!ok(q) || acc < gap) continue; if (out.some(o => Math.hypot(o.cx - q.x, o.cy - q.y) < gap)) continue; const side = out.length % 2 ? 1 : -1; out.push({ cx: q.x, cy: q.y, x: q.x + side * (4 + 5 * depth(q.y)), y: q.y - 1 }); acc = 0; }
    if (out.length >= 12) return out;
  }
  return [];
})();
// 종이 한 겹: 그림자 → 종이 → 아래로 짙어지는 결 → 달빛 받은 가장자리 → 아랫자락의 안개
function paperLayer(g, shape, col, o = {}) {
  g.save(); g.shadowColor = 'rgba(8,10,25,0.6)'; g.shadowBlur = 12; g.shadowOffsetY = -5; g.beginPath(); shape(g); g.fillStyle = col; g.fill(); g.restore();
  g.save(); g.beginPath(); shape(g); g.clip(); const gr = g.createLinearGradient(0, o.top, 0, o.bot); gr.addColorStop(0, 'rgba(255,240,220,0.07)'); gr.addColorStop(1, 'rgba(0,0,12,0.3)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const R = rng(o.seed || 5); for (let i = 0; i < 300; i++) { const x = R() * W, y = o.top + R() * (o.bot - o.top), a = R() * TAU, l = 3 + R() * 8; g.globalAlpha = 0.07; g.strokeStyle = R() < 0.5 ? '#ffffff' : '#000010'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  if (o.fog) { const m = g.createLinearGradient(0, o.fog - 34, 0, o.fog + 34); m.addColorStop(0, 'rgba(170,180,230,0)'); m.addColorStop(0.5, 'rgba(170,180,230,0.12)'); m.addColorStop(1, 'rgba(170,180,230,0)'); g.globalAlpha = 1; g.fillStyle = m; g.fillRect(0, o.fog - 34, W, 68); }
  g.restore();
  g.save(); g.beginPath(); o.edge(g); g.globalAlpha = o.rimA || 0.5; st(g, '#ece0c4', 1.8); g.restore();
}
const X0 = STAGE.x - 20, X1 = STAGE.x + STAGE.w + 20;
const ridge = f => p => { p.moveTo(X0, H); for (let x = X0; x <= X1; x += 6) p.lineTo(x, f(x)); p.lineTo(X1, H); p.closePath(); };
const ridgeEdge = f => p => { p.moveTo(X0, f(X0)); for (let x = X0; x <= X1; x += 6) p.lineTo(x, f(x)); };
const peaks = (list, base) => x => base - Math.max(...list.map(([c, h, w]) => h * Math.exp(-((x - c) / w) * ((x - c) / w))));
// 구름문: 둥근 덩이 두세 개가 겹친 굵은 띠가 길게 흐르다 끝이 동그랗게 말린다 (흰 테를 두른 오린 종이)
function ribbonCloud(g, x, y, w, col, flip) {
  g.save(); g.translate(x, y); if (flip) g.scale(-1, 1);
  const body = p => { p.moveTo(-w * 0.5, 8); p.quadraticCurveTo(-w * 0.46, -6, -w * 0.3, -4); p.quadraticCurveTo(-w * 0.24, -18, -w * 0.06, -14); p.quadraticCurveTo(w * 0.04, -26, w * 0.2, -18); p.quadraticCurveTo(w * 0.32, -24, w * 0.4, -14); p.quadraticCurveTo(w * 0.56, -12, w * 0.52, 0); p.quadraticCurveTo(w * 0.5, 9, w * 0.38, 9); p.closePath(); };
  g.save(); g.shadowColor = 'rgba(0,0,14,0.5)'; g.shadowBlur = 8; g.shadowOffsetY = 3; g.beginPath(); body(g); g.fillStyle = col; g.fill(); g.restore();
  g.save(); g.beginPath(); body(g); g.clip(); g.fillStyle = 'rgba(10,10,30,0.22)'; g.fillRect(-w, 0, w * 2, 12); g.restore();
  g.beginPath(); body(g); g.globalAlpha = 0.65; st(g, '#efe2c4', 1.4);
  // 덩이 사이의 말린 금과 오른쪽 끝의 소용돌이
  g.beginPath(); g.arc(-w * 0.16, -4, 7, Math.PI * 1.1, Math.PI * 1.9); st(g, '#efe2c4', 1.1); g.beginPath(); g.arc(w * 0.12, -8, 8, Math.PI * 1.1, Math.PI * 1.9); st(g, '#efe2c4', 1.1);
  g.beginPath(); g.arc(w * 0.44, -3, 6.4, -0.3, Math.PI * 1.5); st(g, '#efe2c4', 1.3); g.beginPath(); g.arc(w * 0.445, -2.4, 2.8, 0, Math.PI * 1.6); st(g, '#efe2c4', 1.1);
  g.globalAlpha = 1; g.restore();
}
// 길: 앞은 넓고 고갯마루로 갈수록 가늘어진다 (from~to 굽이만, 하나의 띠로 칠한다)
function roadPart(g, from, to) {
  const pts = CENTER.filter(q => q.seg >= from && q.seg < to); if (pts.length < 2) return;
  const L = [], Rr = [];
  pts.forEach((q, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1, w = (5 + 13 * depth(q.y)) / 2; L.push([q.x - dy / l * w, q.y + dx / l * w]); Rr.push([q.x + dy / l * w, q.y - dx / l * w]); });
  const shape = p => { p.moveTo(L[0][0], L[0][1]); for (const [x, y] of L) p.lineTo(x, y); for (let i = Rr.length - 1; i >= 0; i--) p.lineTo(Rr[i][0], Rr[i][1]); p.closePath(); };
  g.save(); g.shadowColor = 'rgba(6,8,18,0.5)'; g.shadowBlur = 4; g.shadowOffsetY = 2; g.beginPath(); shape(g); g.fillStyle = 'rgba(205,187,142,0.55)'; g.fill(); g.restore();
  g.beginPath(); shape(g); st(g, 'rgba(30,20,10,0.35)', 1);
}

let BACK = null;
// 구운 그림: 극장 어둠 + 무대 안의 달밤 고갯길 (막·틀·인형·등불은 따로)
export function titleBack() {
  if (BACK) return BACK;
  const c = makeCanvas(W * S, H * S), g = c.getContext('2d'); g.scale(S, S); const R = rng(1207), T = Object.assign({}, THEMES.dusk || THEMES.pass, { night: true });
  // 극장: 짙은 어둠, 무대 쪽이 따뜻하게 밝다
  const hall = g.createRadialGradient(640, 360, 120, 640, 380, 820); hall.addColorStop(0, '#2a2232'); hall.addColorStop(0.6, '#15121c'); hall.addColorStop(1, '#08070c'); g.fillStyle = hall; g.fillRect(0, 0, W, H);
  const fl = g.createLinearGradient(0, 600, 0, H); fl.addColorStop(0, '#3a2618'); fl.addColorStop(1, '#170e09'); g.fillStyle = fl; g.fillRect(0, 610, W, H - 610);
  for (let x = -40; x < W + 40; x += 92) { const k = (x - 640) * 0.5; line(g, [640 + (x - 640) * 0.72, 612, x + k * 0.6, H], 'rgba(0,0,0,0.35)', 1.6); }
  for (let i = 0; i < 160; i++) { const x = R() * W, y = 616 + R() * 104; g.globalAlpha = 0.12; line(g, [x, y, x + 20 + R() * 40, y + (R() - 0.5) * 2], '#b07a44', 1); } g.globalAlpha = 1;
  // ── 무대 안: 달밤 ──
  const { x: sx, y: sy, w: sw, h: sh } = STAGE;
  g.save(); g.beginPath(); g.rect(sx, sy, sw, sh); g.clip();
  const sky = g.createLinearGradient(0, sy, 0, 430); sky.addColorStop(0, '#0d1430'); sky.addColorStop(0.45, '#1c2752'); sky.addColorStop(0.85, '#3a3a66'); sky.addColorStop(1, '#5e5478'); g.fillStyle = sky; g.fillRect(sx, sy, sw, sh);
  for (let i = 0; i < 130; i++) { const x = sx + R() * sw, y = sy + R() * 240, r = 0.5 + R() * 1.2; g.globalAlpha = 0.3 + R() * 0.55; ell(g, x, y, r, r, '#f6efdc'); } g.globalAlpha = 1;
  for (const [x, y, r] of [[250, 150, 5], [1110, 300, 4], [200, 260, 3.4], [760, 120, 3.6]]) { g.globalAlpha = 0.75; line(g, [x - r, y, x + r, y], '#fff6dc', 1); line(g, [x, y - r, x, y + r], '#fff6dc', 1); g.globalAlpha = 1; }
  // 달: 은은한 달무리 (현판보다 밝게 빛나 시선을 끈다)
  const mx = 1018, my = 206, mr = 62;
  for (const [r, a] of [[240, 0.12], [150, 0.18], [96, 0.26]]) { const gr = g.createRadialGradient(mx, my, mr * 0.8, mx, my, r); gr.addColorStop(0, `rgba(255,236,190,${a})`); gr.addColorStop(1, 'rgba(255,236,190,0)'); g.fillStyle = gr; g.fillRect(mx - r, my - r, r * 2, r * 2); }
  g.save(); g.shadowColor = 'rgba(255,230,170,0.85)'; g.shadowBlur = 34; ell(g, mx, my, mr, mr, '#fff4d4'); g.restore();
  g.save(); g.beginPath(); g.arc(mx, my, mr, 0, TAU); g.clip(); const mg = g.createRadialGradient(mx - 20, my - 22, 8, mx, my, mr); mg.addColorStop(0, '#fffdf2'); mg.addColorStop(1, '#f0dfae'); g.fillStyle = mg; g.fillRect(mx - mr, my - mr, mr * 2, mr * 2);
  g.restore();
  // 구름문
  ribbonCloud(g, 1050, 262, 210, '#4a5284', false); ribbonCloud(g, 270, 196, 170, '#3a4274', true); ribbonCloud(g, 700, 150, 120, '#353d6c', false);
  // 먼 산줄기
  const fA = x => peaks([[180, 90, 130], [420, 60, 120], [700, 70, 160], [1130, 110, 130], [900, 50, 100]], 352)(x) + Math.sin(x * 0.05) * 2;
  paperLayer(g, ridge(fA), '#5a5f92', { top: 250, bot: 420, seed: 11, rimA: 0.35, edge: ridgeEdge(fA), fog: 400 });
  // 큰 산: 오른쪽에 고갯마루(안부)가 있다
  const fB = x => peaks([[200, 170, 140], [520, 118, 170], [800, 150, 130], [1110, 205, 120]], 432)(x) + Math.sin(x * 0.04) * 2.4;
  paperLayer(g, ridge(fB), '#3c4778', { top: 260, bot: 520, seed: 12, rimA: 0.55, edge: ridgeEdge(fB), fog: 470 });
  for (const [x, s, f] of [[160, 0.42, false], [205, 0.5, true], [262, 0.38, false], [740, 0.4, true], [800, 0.46, false], [1080, 0.42, true], [1130, 0.5, false]]) { g.globalAlpha = 0.85; padPine(g, x, fB(x) + 8, s, T, f); g.globalAlpha = 1; }
  // 길의 위쪽 반 (큰 산 비탈) — 앞산 능선이 아랫부분을 가린다
  roadPart(g, 4, ROAD.length - 1);
  // 고갯마루: 서낭나무(오색 천을 감은 늙은 나무)와 돌무더기, 솟대
  const [px, py] = PASS;
  for (const [dx, dy, r] of [[-26, 3, 10], [-12, 4, 11], [2, 3, 10], [-20, -8, 8], [-6, -9, 9], [-13, -19, 7]]) ell(g, px + dx, py + dy, r, r * 0.75, '#8c8a96', 'rgba(10,10,20,0.6)', 1);
  path(g, p => { p.moveTo(px + 30, py + 4); p.quadraticCurveTo(px + 24, py - 30, px + 34, py - 58); p.lineTo(px + 42, py - 58); p.quadraticCurveTo(px + 34, py - 30, px + 42, py + 4); p.closePath(); }, '#3a2e2a', 'rgba(230,220,200,0.5)', 1);
  { const lumps = [[38, -78, 20], [20, -72, 15], [56, -70, 16], [30, -94, 14], [48, -92, 13], [12, -84, 10], [64, -84, 11], [40, -104, 9], [26, -60, 9], [52, -58, 10]]; for (const [dx, dy, r] of lumps) ell(g, px + dx, py + dy, r, r * 0.78, '#1b2838'); g.save(); g.globalAlpha = 0.45; for (const [dx, dy, r] of lumps) { g.beginPath(); g.ellipse(px + dx, py + dy, r, r * 0.78, 0, -1.2, 0.5); st(g, '#a9b6e6', 1.4); } g.restore(); }
  line(g, [px + 22, py - 40, px + 50, py - 44], '#d9c79a', 1.6);
  line(g, [px - 40, py + 4, px - 40, py - 66], INK, 3.4); line(g, [px - 40, py + 4, px - 40, py - 66], '#8a6a4c', 1.8);
  path(g, p => { p.moveTo(px - 50, py - 68); p.quadraticCurveTo(px - 40, py - 76, px - 28, py - 69); p.lineTo(px - 22, py - 73); p.lineTo(px - 27, py - 66); p.quadraticCurveTo(px - 40, py - 63, px - 50, py - 68); p.closePath(); }, '#2b2830', 'rgba(240,230,200,0.6)', 0.8);
  // 앞산(작은 언덕 셋)
  const fC = x => peaks([[290, 74, 170], [700, 46, 210], [1060, 66, 150]], 528)(x) + Math.sin(x * 0.06) * 1.6;
  paperLayer(g, ridge(fC), '#263a52', { top: 440, bot: 600, seed: 13, rimA: 0.5, edge: ridgeEdge(fC), fog: 560 });
  roadPart(g, 0, 5);
  // 앞마당(무대 바닥)
  const fD = x => 570 + Math.sin(x * 0.02) * 4 + Math.sin(x * 0.061) * 2;
  paperLayer(g, ridge(fD), '#172636', { top: 560, bot: 610, seed: 14, rimA: 0.45, edge: ridgeEdge(fD) });
  for (let i = 0; i < 26; i++) { const x = sx + 10 + R() * (sw - 20); grassTuft(g, x, fD(x) + 8 + R() * 10, 0.9 + R() * 0.6, R() < 0.6 ? '#3e5a52' : '#2f4a46', R); }
  for (let i = 0; i < 9; i++) { const x = R() < 0.5 ? sx + 20 + R() * 120 : sx + sw - 140 + R() * 120; paperFlower(g, x, 586 + R() * 6, 1.1 + R() * 0.5, R() < 0.5 ? '#d9cfb4' : '#c9ad6c', '#3e5a52', R); }
  const vg = g.createRadialGradient(640, 330, 260, 640, 360, 700); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,12,0.5)'); g.fillStyle = vg; g.fillRect(sx, sy, sw, sh);
  g.restore();
  BACK = c; return c;
}

// ── 한 번만 굽고 다시 쓰는 것들 (매 장면 그라데이션·흐림 필터를 새로 만들지 않는다) ──
const bake = (w, h, fn) => { const c = makeCanvas(w * 2, h * 2), cg = c.getContext('2d'); cg.scale(2, 2); fn(cg); return c; };
const GL = new Map();
// 둥근 빛 한 점 (가운데 col, 가장자리로 사라진다). 'lighter' 로 겹쳐 그린다
function glowSpr(col, mid = 0.35) { const key = col + mid; let c = GL.get(key); if (c) return c; c = makeCanvas(64, 64); const cg = c.getContext('2d'), gr = cg.createRadialGradient(32, 32, 0.5, 32, 32, 32); gr.addColorStop(0, `rgba(${col},1)`); gr.addColorStop(mid, `rgba(${col},0.32)`); gr.addColorStop(1, `rgba(${col},0)`); cg.fillStyle = gr; cg.fillRect(0, 0, 64, 64); GL.set(key, c); return c; }
const spot = (g, img, x, y, rx, ry, a) => { if (a <= 0.002) return; g.globalAlpha = a; g.drawImage(img, x - rx, y - ry, rx * 2, ry * 2); };
let SHADOW = null;
const shadowSpr = () => SHADOW || (SHADOW = bake(64, 20, cg => { const gr = cg.createRadialGradient(32, 10, 1, 32, 10, 32); gr.addColorStop(0, 'rgba(0,0,8,0.85)'); gr.addColorStop(1, 'rgba(0,0,8,0)'); cg.fillStyle = gr; cg.save(); cg.translate(32, 10); cg.scale(1, 0.3); cg.translate(-32, -10); cg.fillRect(0, -22, 64, 64); cg.restore(); }));
let WFG = null;
// 청사초롱: 위는 쪽빛, 아래는 붉은 비단. lit 0→1 로 켜진다. 켜지면 둘레와 길바닥에 따뜻한 빛이 고인다
function lantern(g, x, y, s, lit, t, i) {
  const fl = lit > 0 ? 0.92 + 0.08 * Math.sin(t * 9 + i * 1.7) * Math.sin(t * 5.3 + i) : 0, lx = x + 8 * s, ly = y - 30 * s, bh = 17 * s, cyy = ly + 3 * s + bh * 0.5;
  if (lit > 0) {
    g.save(); g.globalCompositeOperation = 'lighter';
    spot(g, glowSpr('255,184,92', 0.5), x + 4 * s, y + 1, 36 * s * fl, 13.7 * s * fl, 0.28 * lit);
    spot(g, glowSpr('255,190,110', 0.4), lx, cyy, 34 * s * fl, 34 * s * fl, 0.45 * lit);
    g.restore();
  }
  line(g, [x, y, x, y - 32 * s], '#140f0c', 3 * s); line(g, [x, y, x, y - 32 * s], '#5a4030', 1.4 * s); line(g, [x - 1 * s, y - 31 * s, x + 9 * s, y - 31 * s], '#140f0c', 2.2 * s);
  line(g, [lx, ly - 2 * s, lx, ly + 1 * s], '#140f0c', 1.2 * s);
  rr(g, lx - 6 * s, ly, 12 * s, 3 * s, 1.2 * s, '#2a2024', '#0a0808', 0.8 * s);
  const on = lit > 0.3, shape = p => { p.moveTo(lx - 6.6 * s, ly + 3 * s); p.quadraticCurveTo(lx - 8.4 * s, cyy, lx - 6.6 * s, ly + 3 * s + bh); p.lineTo(lx + 6.6 * s, ly + 3 * s + bh); p.quadraticCurveTo(lx + 8.4 * s, cyy, lx + 6.6 * s, ly + 3 * s); p.closePath(); };
  path(g, shape, on ? '#e0412f' : '#5a1e1a', 'rgba(10,8,8,0.75)', 0.9 * s);
  g.save(); g.beginPath(); g.rect(lx - 9 * s, ly + 3 * s, 18 * s, bh * 0.42); g.clip(); path(g, shape, on ? '#3d6fd6' : '#1f2e55', 'rgba(10,8,8,0.75)', 0.9 * s); g.restore();
  if (on) { g.save(); g.globalCompositeOperation = 'lighter'; spot(g, glowSpr('255,233,176', 0.5), lx, cyy + 1 * s, 7 * s, 7 * s, 0.9 * lit * fl); g.restore(); }
  rr(g, lx - 5 * s, ly + 3 * s + bh, 10 * s, 2.4 * s, 1 * s, '#2a2024', '#0a0808', 0.6 * s);
  line(g, [lx, ly + 5.4 * s + bh, lx, ly + 12 * s + bh], '#c8402f', 1.6 * s);
  if (lit > 0 && lit < 1) { g.save(); g.globalCompositeOperation = 'lighter'; const fr = 26 * s * (1.4 - 0.4 * lit); spot(g, glowSpr('255,240,200', 0.3), lx, cyy, fr, fr, 0.7 * (1 - lit)); g.restore(); }
}
// 도깨비불: 푸른빛 불꽃이 둥실 떠서 흔들리고 깜빡인다 (끝이 갈라져 너울대는 불혀, 아래로 옅은 꼬리)
function wisp(g, x, y, s, t, a) {
  g.save(); g.globalCompositeOperation = 'lighter'; spot(g, glowSpr('110,230,215', 0.3), x, y, 30 * s, 30 * s, 0.26 * a); g.restore();
  g.save(); g.globalAlpha = a; g.translate(x, y); g.rotate(Math.sin(t * 6) * 0.1); g.scale(s * 1.35, s * 1.35);
  const w1 = Math.sin(t * 9) * 1.6, w2 = Math.sin(t * 7.3 + 1) * 1.4;
  const outer = p => { p.moveTo(0.5, 7); p.quadraticCurveTo(-7.5, 6, -6, -2); p.quadraticCurveTo(-5.4, -6, -3.4, -8 + w2); p.quadraticCurveTo(-2.6, -4, -1, -5); p.quadraticCurveTo(-0.5, -11, 1 + w1, -15); p.quadraticCurveTo(2.6, -9, 4.4, -7); p.quadraticCurveTo(6.6, -4, 6.4, 0); p.quadraticCurveTo(6.4, 6.4, 0.5, 7); p.closePath(); };
  if (!WFG) { WFG = g.createLinearGradient(0, -15, 0, 7); WFG.addColorStop(0, '#2bb3a8'); WFG.addColorStop(0.55, '#7ff3e0'); WFG.addColorStop(1, '#c6fbf2'); } const fg = WFG;
  g.beginPath(); outer(g); g.fillStyle = fg; g.fill(); g.lineWidth = 0.8; g.strokeStyle = 'rgba(220,255,250,0.75)'; g.stroke();
  g.beginPath(); g.moveTo(0.4, 5); g.quadraticCurveTo(-3.4, 4, -2.6, -0.5); g.quadraticCurveTo(-1.4, -3, 0.6 + w1 * 0.5, -7); g.quadraticCurveTo(3.2, -2, 2.8, 1); g.quadraticCurveTo(2.8, 4.6, 0.4, 5); g.closePath(); g.fillStyle = '#effffb'; g.fill();
  g.restore();
}
// 현판의 붓글씨: 먹 번짐 + 금박 가루. 글꼴이 다 읽힌 뒤에 한 번 굽는다
let TITLE = null;
const IW = 460, IH = 120;
function titleInk() {
  if (TITLE) return TITLE;
  const ready = typeof document === 'undefined' || !document.fonts || document.fonts.check(`100px 'Yeon Sung'`);
  const K = 2, c = makeCanvas(IW * K, IH * K), g = c.getContext('2d'); g.scale(K, K);
  g.font = `400 100px ${FONT_B}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.save(); g.shadowColor = 'rgba(40,24,20,0.45)'; g.shadowBlur = 5; g.fillStyle = '#18141a'; g.fillText('열두 고개', IW / 2, IH / 2 + 6); g.restore();
  g.fillStyle = '#141216'; g.fillText('열두 고개', IW / 2, IH / 2 + 6);
  // 먹이 엷게 남은 붓끝: 획 안쪽을 아주 옅게 밝힌다 (긁힌 자국처럼 보이지 않게 넓고 흐리게)
  g.save(); g.globalCompositeOperation = 'source-atop'; const R = rng(4242); for (let i = 0; i < 18; i++) { const x = R() * IW, y = 20 + R() * 80, w = 30 + R() * 50; g.globalAlpha = 0.07; g.fillStyle = '#8a7a70'; g.fillRect(x, y, w, 2 + R() * 3); } g.restore();
  for (let i = 0; i < 60; i++) { g.globalAlpha = 0.6 + R() * 0.4; const x = 10 + R() * (IW - 20), y = 8 + R() * (IH - 16), r = 0.5 + R() * 1.3; ell(g, x, y, r, r * (0.6 + R() * 0.4), R() < 0.7 ? '#cfa042' : '#f0cf78'); }
  g.globalAlpha = 1;
  if (!ready) return c;
  TITLE = c; return c;
}
// 현판: 짙은 나무틀, 금테와 모서리 장식, 한지 바탕. 아래 틀에 영문 이름. rev = 글씨가 써지는 정도(0~1), st2 = 낙관
const PW = 488, PH = 156;
function plaque(g, cx, cy, rev, sealK) {
  if (PLQ) { g.drawImage(PLQ, cx - PW / 2 - 44, cy - PH / 2 - 44, PW + 88, PH + 88); return; }
  if (rev >= 1 && sealK >= 1 && TITLE) { PLQ = bake(PW + 88, PH + 88, cg => plaqueDraw(cg, PW / 2 + 44, PH / 2 + 44, 1, 1)); return plaque(g, cx, cy, rev, sealK); }
  plaqueDraw(g, cx, cy, rev, sealK);
}
function plaqueDraw(g, cx, cy, rev, sealK) {
  const w = PW, h = PH, x = cx - w / 2, y = cy - h / 2;
  g.save(); g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 22; g.shadowOffsetY = 10; rr(g, x, y, w, h, 9, '#3a2114'); g.restore();
  const wg = g.createLinearGradient(0, y, 0, y + h); wg.addColorStop(0, '#6a3c22'); wg.addColorStop(0.5, '#4a2a18'); wg.addColorStop(1, '#2e1a10'); rr(g, x, y, w, h, 9, wg, '#140c08', 2.4);
  for (let i = 0; i < 22; i++) { const yy = y + 6 + i * (h - 12) / 22; g.globalAlpha = 0.1; line(g, [x + 6, yy, x + w - 6, yy + Math.sin(i) * 2], '#c08050', 1); } g.globalAlpha = 1;
  rr(g, x + 8, y + 8, w - 16, h - 16, 6, null, '#d6a640', 2.4);
  const px = x + 20, py = y + 18, pw = w - 40, ph = h - 46, pg = g.createLinearGradient(0, py, 0, py + ph); pg.addColorStop(0, '#efe4c8'); pg.addColorStop(1, '#cdbf9e'); rr(g, px, py, pw, ph, 3, pg, 'rgba(60,40,20,0.6)', 1.2);
  const R = rng(77); for (let i = 0; i < 90; i++) { const fx = px + R() * pw, fy = py + R() * ph, a = R() * TAU, l = 4 + R() * 10; g.globalAlpha = 0.12; line(g, [fx, fy, fx + Math.cos(a) * l, fy + Math.sin(a) * l], R() < 0.5 ? '#a08860' : '#fff8e8', 0.8); } g.globalAlpha = 1;
  for (const [sx2, sy2] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const ox = cx + sx2 * (w / 2 - 10), oy = cy + sy2 * (h / 2 - 10); path(g, p => { p.moveTo(ox, oy); p.lineTo(ox - sx2 * 26, oy); p.quadraticCurveTo(ox - sx2 * 19, oy - sy2 * 7, ox - sx2 * 12, oy - sy2 * 12); p.quadraticCurveTo(ox - sx2 * 7, oy - sy2 * 19, ox, oy - sy2 * 26); p.closePath(); }, '#d9ad4c', '#5a3a10', 1.1); ell(g, ox - sx2 * 8, oy - sy2 * 8, 2.4, 2.4, '#fbe7a6', '#5a3a10', 0.8); }
  // 아래 틀의 영문 이름 (금빛, 자간을 넓게)
  g.save(); g.font = `700 14px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#c9a95a'; if ('letterSpacing' in g) g.letterSpacing = '6px'; g.fillText('TWELVE  PASSES', cx + 3, y + h - 15); g.restore();
  // 붓글씨: 왼쪽에서 오른쪽으로 붓이 지나가듯 드러난다
  const ink = titleInk();
  if (rev > 0) { const ix = cx - IW / 2 - 8, iy = py + ph / 2 - IH / 2 - 6; g.save(); g.beginPath(); g.rect(ix, iy, IW * clamp(rev, 0, 1), IH); g.clip(); g.drawImage(ink, ix, iy, IW, IH); g.restore(); }
  // 낙관: 붉은 도장 (도깨비 얼굴 그림), 찍히듯 1.08 → 1
  if (sealK > 0) { const sc = 1 + 0.08 * (1 - sealK); g.save(); g.globalAlpha = clamp(sealK * 1.5, 0, 1); g.translate(cx + w / 2 - 58, py + ph - 24); g.rotate(-0.06); g.scale(sc, sc); seal(g, 0, 0, 34, 'boss'); g.restore(); }
}
// 현판을 매단 끈 (들보 뒤에서 내려온다)과 아래로 늘어진 매듭
function cords(g, cx, cy, t) {
  for (const dx of [-180, 180]) { line(g, [cx + dx * 0.92, 60, cx + dx, cy - PH / 2 + 4], '#2a1810', 4.2); line(g, [cx + dx * 0.92, 60, cx + dx, cy - PH / 2 + 4], '#c8402f', 2.2); }
  for (const [dx, col] of [[-210, '#2f4d7e'], [210, '#c8402f']]) { const x = cx + dx, y = cy + PH / 2 - 14, sw = Math.sin(t * 1.6 + dx) * 2; line(g, [x, y, x + sw, y + 12], '#1a1210', 2); ell(g, x + sw, y + 15, 5, 5, '#e0b23c', '#5a3a10', 1); path(g, p => { p.moveTo(x + sw - 5, y + 19); p.lineTo(x + sw + 5, y + 19); p.lineTo(x + sw * 1.6 + 7, y + 46); p.lineTo(x + sw * 1.6 - 7, y + 46); p.closePath(); }, col, 'rgba(0,0,0,0.5)', 1); for (let q = -2; q <= 2; q++) line(g, [x + sw + q * 2.2, y + 22, x + sw * 1.6 + q * 2.8, y + 45], 'rgba(255,255,255,0.18)', 0.8); }
}
// 들보: 단청 무늬 띠와 가운데 삼태극
function lintel(g) {
  if (!LIN) LIN = bake(W, 92, cg => lintelDraw(cg));
  g.drawImage(LIN, 0, 0, W, 92);
}
function lintelDraw(g) {
  const x = 84, y = 34, w = W - 168, h = 46;
  g.save(); g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 16; g.shadowOffsetY = 6; rr(g, x, y, w, h, 6, '#2c5a4e'); g.restore();
  rr(g, x, y, w, h, 6, '#2c5a4e', '#0e1a16', 2.4);
  g.save(); g.beginPath(); g.rect(x + 3, y + 3, w - 6, h - 6); g.clip();
  g.fillStyle = '#b8322a'; g.fillRect(x, y + 5, w, 5); g.fillRect(x, y + h - 10, w, 5); g.fillStyle = '#f3ead2'; g.fillRect(x, y + 10, w, 2); g.fillRect(x, y + h - 12, w, 2);
  for (let i = 0; i < 15; i++) { const cx = x + 40 + i * (w - 80) / 14; if (Math.abs(cx - 640) < 70) continue; for (let q = 0; q < 8; q++) { const a = q / 8 * TAU; ell(g, cx + Math.cos(a) * 9, y + h / 2 + Math.sin(a) * 9, 5.4, 5.4, q % 2 ? '#e8b84a' : '#f3ead2', '#0e1a16', 0.8); } ell(g, cx, y + h / 2, 7, 7, '#c8402f', '#0e1a16', 1); ell(g, cx, y + h / 2, 3, 3, '#2f4d7e'); }
  g.restore();
  rr(g, x - 6, y - 8, w + 12, 10, 3, '#3a2114', '#140c08', 1.6); line(g, [x - 4, y - 2, x + w + 4, y - 2], '#d6a640', 1.4);
  ell(g, 640, y + h / 2, 30, 30, '#3a2114', '#140c08', 2); ell(g, 640, y + h / 2, 25, 25, '#f3ead2', '#d6a640', 2); taegeuk(g, 640, y + h / 2, 20, -0.5, ['#c8402f', '#2f4d7e', '#e0b23c'], 1);
}
// 무대 위로 떨어지는 부드러운 빛줄기 (여러 겹을 겹쳐 가장자리를 흐리게, 아래로 갈수록 엷게)
let BEAMS = null, AUD = null, LIN = null, PLQ = null, TAG = null;
function beams(g, t, k) {
  if (k <= 0) return;
  if (!BEAMS) BEAMS = bake(W, 610, cg => { const gr = cg.createLinearGradient(0, 0, 0, 600); gr.addColorStop(0, 'rgba(255,226,170,0.035)'); gr.addColorStop(1, 'rgba(255,226,170,0)'); cg.fillStyle = gr; for (const [x0, x1] of [[330, 470], [950, 820]]) for (const wd of [60, 110, 160, 210]) { cg.beginPath(); cg.moveTo(x0 - wd * 0.12, 0); cg.lineTo(x0 + wd * 0.12, 0); cg.lineTo(x1 + wd, 600); cg.lineTo(x1 - wd, 600); cg.closePath(); cg.fill(); } });
  g.save(); g.globalCompositeOperation = 'screen'; g.globalAlpha = k; g.drawImage(BEAMS, 0, 0, W, 610); g.restore();
  for (let i = 0; i < 24; i++) { const ph = i * 7.3, x = (i % 2 ? 430 : 870) + Math.sin(t * 0.3 + ph) * 110, y = ((ph * 37 + t * 14) % 520) + 60, a = (0.2 + 0.2 * Math.sin(t * 2 + ph)) * k; g.globalAlpha = a; ell(g, x, y, 1.2, 1.2, '#ffe9bf'); }
  g.globalAlpha = 1;
}
// 관객석: 두 줄 사람들의 뒷모습 (어깨·상투·갓). 뒷줄은 작고 옅게, 무대 빛이 윗가장자리에 비친다
function audience(g) {
  if (!AUD) AUD = bake(W, 120, cg => { cg.translate(0, -600); audienceDraw(cg); });
  g.drawImage(AUD, 0, 600, W, 120);
}
function audienceDraw(g) {
  const R = rng(9);
  const one = (x, y, s, col, rim) => {
    const hat = R() < 0.55;
    path(g, p => { p.moveTo(x - 46 * s, y + 10); p.quadraticCurveTo(x - 44 * s, y - 34 * s, x - 14 * s, y - 40 * s); p.lineTo(x + 14 * s, y - 40 * s); p.quadraticCurveTo(x + 44 * s, y - 34 * s, x + 46 * s, y + 10); p.closePath(); }, col);
    ell(g, x, y - 58 * s, 15 * s, 18 * s, col);
    if (hat) { path(g, p => { p.moveTo(x - 10 * s, y - 70 * s); p.lineTo(x - 8 * s, y - 86 * s); p.quadraticCurveTo(x, y - 89 * s, x + 8 * s, y - 86 * s); p.lineTo(x + 10 * s, y - 70 * s); p.closePath(); }, col); g.globalAlpha = 0.8; ell(g, x, y - 70 * s, 26 * s, 5.2 * s, '#16131c'); g.globalAlpha = rim; g.beginPath(); g.ellipse(x, y - 70 * s, 26 * s, 5.2 * s, 0, 0.15, Math.PI - 0.15); st(g, '#ffc478', 1); line(g, [x - 8 * s, y - 86 * s, x + 8 * s, y - 86 * s], '#ffc478', 1.3); g.globalAlpha = 1; }
    else { ell(g, x, y - 78 * s, 6 * s, 7 * s, col); g.globalAlpha = rim; g.beginPath(); g.arc(x, y - 58 * s, 15 * s, Math.PI * 1.15, Math.PI * 1.85); st(g, '#ffc478', 1.5); g.globalAlpha = 1; }
    g.globalAlpha = rim; g.beginPath(); g.moveTo(x - 40 * s, y - 28 * s); g.quadraticCurveTo(x - 30 * s, y - 38 * s, x - 14 * s, y - 40 * s); st(g, '#ffc478', 1.5); g.globalAlpha = 1;
  };
  for (let i = 0; i < 16; i++) { const x = 60 + i * 80 + (R() - 0.5) * 20; if (x > 420 && x < 860) continue; one(x, 732, 0.8, '#0d0b12', 0.25); }
  for (let i = 0; i < 15; i++) { const x = 30 + i * 88 + (R() - 0.5) * 24; if (x > 400 && x < 880) continue; one(x, 760, 0.98 + R() * 0.16, '#040306', 0.35); }
}
// 막대 인형 하나: 앞판까지 내려가는 막대와 바닥 그림자를 곁들인다
function stickPuppet(g, type, x, y, s, t, face) {
  g.globalAlpha = 0.45; g.drawImage(shadowSpr(), x + 6 - 30 * s, y + 4 - 9 * s, 60 * s, 18 * s); g.globalAlpha = 1;
  line(g, [x, y - 6, x + 1, APRON + 30], '#1a0f08', 4.4); line(g, [x, y - 6, x + 1, APRON + 30], '#3a2416', 3);
  g.save(); g.translate(x, y); g.rotate(Math.sin(t * 1.9 + x) * 0.026); g.translate(-x, -y);
  puppet(g, type, x, y, s, t, { act: 'idle', face, noStick: true });
  g.restore();
}

let FOOT = null;
export const INTRO_END = 3.5;
// 한 장면: t = 첫 화면이 뜬 뒤 흐른 초
export function drawTitleScene(g, t) {
  g.drawImage(titleBack(), 0, 0, W, H);
  const open = clamp((t - 0.35) / 1.25, 0, 1), sx = STAGE.x, sy = STAGE.y;
  g.save(); g.beginPath(); g.rect(sx, sy, STAGE.w, STAGE.h); g.clip();
  // 청사초롱: 1.6초부터 0.12초마다 하나씩
  LAMPS.forEach((p, i) => { const lit = clamp((t - 1.6 - i * 0.12) / 0.3, 0, 1), s = 0.72 + depth(p.y) * 0.62; lantern(g, p.x, p.y, s * (lit > 0 && lit < 1 ? 1 + 0.2 * Math.sin(lit * Math.PI) : 1), lit, t, i); });
  // 도깨비불
  [[1010, 440, 1.2], [1100, 505, 1.3], [1128, 398, 0.75], [870, 470, 0.9], [760, 392, 0.6], [940, 372, 0.7], [250, 470, 0.85]].forEach(([x, y, s], k) => { const a = clamp((t - 1.2 - k * 0.08) / 0.8, 0, 1) * (0.6 + 0.4 * (0.5 + 0.5 * Math.sin(t * 3.1 + k * 1.9))); wisp(g, x + Math.sin(t * 0.6 + k) * 12, y + Math.sin(t * 1.1 + k * 2) * 8, s, t + k, a); });
  // 반딧불
  for (let i = 0; i < 16; i++) { const ph = i * 2.1, x = sx + 60 + ((i * 131) % 900) + Math.sin(t * 0.5 + ph) * 30, y = 300 + ((i * 67) % 240) + Math.sin(t * 0.9 + ph) * 16, a = clamp(Math.sin(t * 1.7 + ph), 0, 1) * clamp((t - 2) / 1, 0, 1); g.globalAlpha = a * 0.85; ell(g, x, y, 1.5, 1.5, '#fff2b0'); g.globalAlpha = a * 0.22; ell(g, x, y, 5, 5, '#ffe08a'); }
  g.globalAlpha = 1;
  // 막대 인형: 영웅들은 왼쪽에서, 도깨비들은 오른쪽에서 미끄러져 들어온다
  const F = 560, slide = (k, dir) => (1 - ease(clamp((t - 1.0 - k * 0.08) / 0.7, 0, 1))) * 420 * dir;
  stickPuppet(g, 'banner', 232 + slide(0, -1), F + 6, 1.0, t, 1);
  [['commander', 318, 1.22], ['hunter', 384, 1.18], ['blade', 448, 1.18], ['bishop', 512, 1.18]].forEach(([u, x, s], k) => stickPuppet(g, u, x + slide(k + 1, -1), F + Math.sin(t * 2.6 + k) * 2, s, t + k, 1));
  [['goblin', 770, 1.44, -1], ['warchief', 930, 1.26, -1], ['shaman', 1046, 1.3, -1]].forEach(([u, x, s, f], k) => stickPuppet(g, u, x + slide(k + 5, 1), F + Math.sin(t * 2.2 + k * 1.4) * 3, s, t + k * 2, f));
  { const [px, py] = PASS; ['#c8402f', '#2f4d7e', '#e0b23c', '#f3ead2', '#3f6b5c'].forEach((col, k) => { const x = px + 25 + k * 5.6, y = py - 41 - k * 0.6, sw = Math.sin(t * 2.2 + k * 1.3) * 2.4; path(g, p => { p.moveTo(x - 1.5, y); p.lineTo(x + 1.5, y); p.lineTo(x + 1.5 + sw, y + 16); p.lineTo(x - 1.5 + sw, y + 16); p.closePath(); }, col, 'rgba(0,0,0,0.35)', 0.5); }); }
  // 발치 조명 (무대 안에서만)
  if (!FOOT) FOOT = bake(STAGE.w, 94, cg => { const fg = cg.createLinearGradient(0, 94, 0, 0); fg.addColorStop(0, 'rgba(255,190,110,0.24)'); fg.addColorStop(1, 'rgba(255,190,110,0)'); cg.fillStyle = fg; cg.fillRect(0, 0, STAGE.w, 94); });
  g.save(); g.globalCompositeOperation = 'screen'; g.globalAlpha = open; g.drawImage(FOOT, sx, APRON - 90, STAGE.w, 94); g.restore();
  g.restore();
  // 현판: 들보 뒤에서 줄에 매달려 내려와 살짝 흔들리다 멎는다 (막보다 먼저 그려 막·들보 뒤에 걸린다)
  const drop = clamp((t - 1.0) / 0.7, 0, 1), cy = -70 + 296 * easeOutBack(drop);
  if (drop > 0) {
    const sw = drop >= 1 ? Math.sin(t * 0.9) * 0.006 : (1 - drop) * 0.04;
    g.save(); g.translate(640, 60); g.rotate(sw); g.translate(-640, -60);
    cords(g, 640, cy, t);
    plaque(g, 640, cy, clamp((t - 1.75) / 0.5, 0, 1), clamp((t - 2.3) / 0.2, 0, 1));
    g.restore();
    const k = clamp((t - 2.5) / 0.5, 0, 1);
    if (k > 0) { if (!TAG && (typeof document === 'undefined' || !document.fonts || document.fonts.check(`18px 'Yeon Sung'`))) TAG = bake(420, 40, cg => { cg.shadowColor = 'rgba(0,0,0,0.85)'; cg.shadowBlur = 8; text(cg, '긴 밤을 걷으러 가는 열두 옛이야기', 210, 20, { size: 18, font: FONT_B, fill: '#efe4c8' }); }); g.globalAlpha = k; if (TAG) g.drawImage(TAG, 430, cy + PH / 2 + 6, 420, 40); else text(g, '긴 밤을 걷으러 가는 열두 옛이야기', 640, cy + PH / 2 + 26, { size: 18, font: FONT_B, fill: '#efe4c8' }); g.globalAlpha = 1; }
  }
  // 무대 틀과 막, 들보
  drawFrame(g, sx, sy, STAGE.w, STAGE.h, open, t);
  lintel(g);
  beams(g, t, clamp((t - 0.8) / 1.2, 0, 1));
  audience(g);
}
