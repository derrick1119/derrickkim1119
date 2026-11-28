// 싸움터 소품: 목책, 군기, 북, 장승, 돌탑, 꽂힌 화살, 깨진 방패, 그을린 자국, 도깨비불, 마른 나무, 연기, 먼 성곽
import { rng, mk, sheet, felt, stitch, tone } from './felt.js';
import { wash } from './scene.js';

const TAU = Math.PI * 2;
const RR = (x0, y0, w, h, r) => x => x.roundRect(x0, y0, w, h, r);
function stamp(g, S, x, y, scale = 1) { const k = scale / S.res; g.drawImage(S.c, x - S.ox * k, y - S.oy * k, S.c.width * k, S.c.height * k); }
function woodGrad(g, x, w, col) { const gr = g.createLinearGradient(x - w / 2, 0, x + w / 2, 0); gr.addColorStop(0, tone(col, -0.14)); gr.addColorStop(0.4, tone(col, 0.1)); gr.addColorStop(1, tone(col, -0.2)); return gr; }
function shadowEll(g, x, y, rx, ry, a = 0.4) { const gr = g.createRadialGradient(x, y, 0, x, y, rx); gr.addColorStop(0, `rgba(30,24,10,${a})`); gr.addColorStop(1, 'rgba(30,24,10,0)'); g.save(); g.fillStyle = gr; g.translate(x, y); g.scale(1, ry / rx); g.beginPath(); g.arc(0, 0, rx, 0, TAU); g.fill(); g.restore(); }

// 목책: 끝을 깎은 통나무를 새끼줄로 엮었다
export function palisade(g, pts, seed, s = 1) {
  const R = rng(seed), logs = [];
  for (let i = 0; i < pts.length - 1; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1], n = Math.ceil(Math.hypot(bx - ax, by - ay) / (9 * s)); for (let k = 0; k < n; k++) { const t = k / n; logs.push([ax + (bx - ax) * t, ay + (by - ay) * t]); } }
  logs.sort((p, q) => p[1] - q[1]);
  for (const [x, y] of logs) shadowEll(g, x + 4 * s, y, 10 * s, 3 * s, 0.35);
  // 흙 둔덕
  g.save(); g.fillStyle = '#8a6a48'; g.filter = 'blur(2px)'; g.beginPath(); logs.forEach(([x, y], i) => i ? g.lineTo(x, y + 2 * s) : g.moveTo(x, y + 2 * s)); g.lineWidth = 9 * s; g.strokeStyle = '#7d5e3e'; g.stroke(); g.restore();
  const ropeA = [], ropeB = [];
  for (const [x, y] of logs) {
    const h = (44 + R() * 14) * s, w = (8 + R() * 2) * s, col = ['#8a5a36', '#7a4e2e', '#94643c'][(R() * 3) | 0], lean = (R() - 0.5) * 2 * s;
    g.save(); g.shadowColor = 'rgba(30,14,4,0.4)'; g.shadowBlur = 4 * s; g.shadowOffsetX = 2 * s;
    g.fillStyle = woodGrad(g, x, w, col); g.beginPath(); g.moveTo(x - w / 2, y); g.lineTo(x - w / 2 + lean, y - h); g.lineTo(x + lean, y - h - 9 * s); g.lineTo(x + w / 2 + lean, y - h); g.lineTo(x + w / 2, y); g.closePath(); g.fill(); g.restore();
    g.save(); g.fillStyle = '#d9b98a'; g.beginPath(); g.moveTo(x - w / 2 + lean, y - h); g.lineTo(x + lean, y - h - 9 * s); g.lineTo(x + lean - w * 0.1, y - h + 1); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(40,20,8,0.4)'; g.lineWidth = 0.7; for (let k = 0; k < 4; k++) { const yy = y - R() * h; g.beginPath(); g.moveTo(x - w / 2 + 1, yy); g.quadraticCurveTo(x, yy - 2, x + w / 2 - 1, yy + 1); g.stroke(); } g.restore();
    ropeA.push([x + lean * 0.3, y - h * 0.3]); ropeB.push([x + lean * 0.7, y - h * 0.68]);
  }
  for (const rope of [ropeA, ropeB]) { g.save(); g.strokeStyle = '#c8a874'; g.lineWidth = 2.4 * s; g.shadowColor = 'rgba(30,14,4,0.35)'; g.shadowBlur = 2; g.shadowOffsetY = 1; g.beginPath(); rope.forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b)); g.stroke(); g.shadowColor = 'transparent'; g.setLineDash([2 * s, 2 * s]); g.strokeStyle = '#8a6a3e'; g.lineWidth = 1 * s; g.stroke(); g.restore(); }
}

// 군기: 펠트 깃발 + 불꽃 테두리(화염각), 깃대 끝에 붉은 술
const flagCache = new Map();
function flagSprite(col, edge, mark, seed, wave) {
  const key = [col, edge, mark, seed, wave].join(); if (flagCache.has(key)) return flagCache.get(key);
  const S = sheet(90, 170, 3, 0.96), R = rng(seed), top = -138, bot = -82, len = 56, wv = t => Math.sin(t * 5 + wave) * 3 * t;
  const cloth = x => { x.moveTo(3, top); for (let i = 0; i <= 10; i++) { const t = i / 10; x.lineTo(3 + len * t, top + wv(t) - t * 2); } for (let i = 0; i <= 10; i++) { const t = 1 - i / 10; x.lineTo(3 + len * t, bot + wv(t) + t * 6); } x.closePath(); };
  // 불꽃 테두리
  felt(S, x => { x.moveTo(3, top - 3); for (let i = 0; i <= 12; i++) { const t = i / 12; x.lineTo(3 + (len + 7) * t, top - 3 + wv(t) - t * 2 + (i % 2 ? -5 : 0)); } for (let i = 0; i <= 8; i++) { const t = i / 8; x.lineTo(3 + len + 7 + (i % 2 ? 6 : 0), top + (bot - top + 6) * t + wv(1)); } for (let i = 0; i <= 12; i++) { const t = 1 - i / 12; x.lineTo(3 + (len + 7) * t, bot + 4 + wv(t) + t * 6 + (i % 2 ? 6 : 0)); } x.closePath(); }, edge, { fuzz: 0.5 });
  felt(S, cloth, col, { fuzz: 0.5, lo: 0.3 });
  if (mark === 'ring') { felt(S, x => x.arc(3 + len * 0.5, (top + bot) / 2 + wv(0.5) + 2, 12, 0, TAU), edge, { fuzz: 0.4, sha: 0.2 }); felt(S, x => x.arc(3 + len * 0.5, (top + bot) / 2 + wv(0.5) + 2, 7, 0, TAU), col, { fuzz: 0.4, shadow: false }); }
  if (mark === 'flame') felt(S, x => { const cx = 3 + len * 0.5, cy = (top + bot) / 2 + wv(0.5) + 4; x.moveTo(cx, cy - 16); x.quadraticCurveTo(cx + 12, cy - 2, cx + 6, cy + 10); x.quadraticCurveTo(cx, cy + 4, cx - 6, cy + 10); x.quadraticCurveTo(cx - 12, cy - 2, cx, cy - 16); }, edge, { fuzz: 0.4, sha: 0.2 });
  stitch(S, [[6, top + 4], [3 + len - 2, top + 3 + wv(1)]], 'rgba(255,240,210,0.6)', 0.6, 2);
  // 깃대
  const g = S.g; g.save(); g.setTransform(S.res, 0, 0, S.res, S.ox, S.oy);
  g.fillStyle = woodGrad(g, 0, 3.4, '#6a3d22'); g.shadowColor = 'rgba(30,14,4,0.4)'; g.shadowBlur = 3; g.shadowOffsetX = 1.5; g.fillRect(-1.7, -150, 3.4, 150); g.shadowColor = 'transparent';
  const gp = g.createLinearGradient(-3, -162, 3, -150); gp.addColorStop(0, '#f6dc94'); gp.addColorStop(1, '#9c6e22'); g.fillStyle = gp; g.beginPath(); g.moveTo(0, -164); g.lineTo(3, -152); g.lineTo(-3, -152); g.closePath(); g.fill();
  g.restore();
  felt(S, x => { x.moveTo(-4, -152); x.quadraticCurveTo(0, -156, 4, -152); x.quadraticCurveTo(6, -142, 0, -138); x.quadraticCurveTo(-6, -142, -4, -152); }, '#c8362e', { fuzz: 1.6, dens: 0.08 });
  flagCache.set(key, S); return S;
}
export function banner(g, x, y, s, col, edge, mark, seed, wave = 0) { shadowEll(g, x + 6, y, 14 * s, 4 * s); stamp(g, flagSprite(col, edge, mark, seed, wave), x, y, s); }

// 북: 붉은 통에 쇠못, 나무 받침
export function drum(g, x, y, s) {
  const S = sheet(80, 80, 3, 0.95);
  const gg = S.g; gg.save(); gg.setTransform(S.res, 0, 0, S.res, S.ox, S.oy); gg.lineCap = 'round'; gg.lineWidth = 3.2;
  for (const [a, b, c, d] of [[-22, 0, -10, -36], [22, 0, 10, -36], [-16, -12, 16, -12]]) { gg.strokeStyle = woodGrad(gg, (a + c) / 2, 4, '#6a3d22'); gg.beginPath(); gg.moveTo(a, b); gg.lineTo(c, d); gg.stroke(); }
  gg.restore();
  felt(S, x => { x.moveTo(-20, -60); x.quadraticCurveTo(0, -64, 20, -60); x.quadraticCurveTo(25, -42, 20, -24); x.quadraticCurveTo(0, -20, -20, -24); x.quadraticCurveTo(-25, -42, -20, -60); }, '#b8352d', { lo: 0.42 });
  felt(S, x => x.ellipse(-20, -42, 5.5, 18, 0, 0, TAU), '#f1e3c6', { fuzz: 0.3, hi: 0.4 });
  felt(S, RR(-18, -45, 36, 6, 2), '#2c5578', { fuzz: 0.3, shadow: false });
  const g2 = S.g; g2.save(); g2.setTransform(S.res, 0, 0, S.res, S.ox, S.oy);
  for (let k = 0; k < 7; k++) { const t = k / 6, yy = -59 + t * 34; for (const xx of [-17, 17]) { const gr = g2.createRadialGradient(xx - 0.4, yy - 0.4, 0, xx, yy, 1.4); gr.addColorStop(0, '#fff2bd'); gr.addColorStop(1, '#8c6018'); g2.fillStyle = gr; g2.beginPath(); g2.arc(xx, yy, 1.3, 0, TAU); g2.fill(); } }
  g2.strokeStyle = woodGrad(g2, 22, 3, '#7a4e2e'); g2.lineWidth = 2.6; g2.beginPath(); g2.moveTo(14, -10); g2.lineTo(30, -30); g2.stroke(); g2.fillStyle = '#c8362e'; g2.beginPath(); g2.arc(30, -31, 3, 0, TAU); g2.fill();
  g2.restore();
  shadowEll(g, x, y, 30 * s, 7 * s); stamp(g, S, x, y, s);
}

// 장승: 왕방울 눈에 이를 드러낸 나무 수호신, 몸에 한글로 이름
export function jangseung(g, x, y, s, label, hat = '#2a2521') {
  const S = sheet(50, 140, 3, 0.96), gg = S.g;
  gg.save(); gg.setTransform(S.res, 0, 0, S.res, S.ox, S.oy);
  const body = () => { gg.beginPath(); gg.moveTo(-10, 0); gg.quadraticCurveTo(-12, -60, -13, -96); gg.quadraticCurveTo(-14, -112, 0, -114); gg.quadraticCurveTo(14, -112, 13, -96); gg.quadraticCurveTo(12, -60, 10, 0); gg.closePath(); };
  gg.shadowColor = 'rgba(30,14,4,0.45)'; gg.shadowBlur = 5; gg.shadowOffsetX = 2; gg.fillStyle = woodGrad(gg, 0, 26, '#8d7a62'); body(); gg.fill(); gg.shadowColor = 'transparent';
  gg.save(); body(); gg.clip(); gg.strokeStyle = 'rgba(50,36,24,0.45)'; gg.lineWidth = 0.6; const R = rng(label.length * 13); for (let k = 0; k < 26; k++) { const xx = -12 + R() * 24; gg.beginPath(); gg.moveTo(xx, -R() * 30); gg.lineTo(xx + (R() - 0.5) * 2, -40 - R() * 70); gg.stroke(); } gg.restore();
  // 얼굴
  gg.fillStyle = '#f2ead8'; for (const ex of [-6, 6]) { gg.beginPath(); gg.arc(ex, -92, 5, 0, TAU); gg.fill(); }
  gg.fillStyle = '#1e1812'; for (const ex of [-6, 6]) { gg.beginPath(); gg.arc(ex + 0.6, -91.5, 2.6, 0, TAU); gg.fill(); }
  gg.strokeStyle = '#3a2a1c'; gg.lineWidth = 1.6; gg.beginPath(); gg.moveTo(-11, -99); gg.quadraticCurveTo(-6, -103, -1, -98); gg.moveTo(1, -98); gg.quadraticCurveTo(6, -103, 11, -99); gg.stroke();
  gg.fillStyle = '#a8705a'; gg.beginPath(); gg.ellipse(0, -84, 3.4, 4.2, 0, 0, TAU); gg.fill();
  gg.fillStyle = '#3a1e18'; gg.beginPath(); gg.roundRect(-8, -78, 16, 7, 3); gg.fill(); gg.fillStyle = '#f2ead8'; for (let k = 0; k < 4; k++) gg.fillRect(-6.5 + k * 3.5, -77.5, 2.6, 2.6); gg.fillRect(-7, -73.5, 2.4, 2.6); gg.fillRect(4.6, -73.5, 2.4, 2.6);
  // 이름 (세로 한글)
  gg.fillStyle = '#2a1d14'; gg.font = "400 8.5px 'Yeon Sung', serif"; gg.textAlign = 'center'; gg.textBaseline = 'middle';
  [...label].forEach((ch, i) => gg.fillText(ch, 0, -60 + i * 10.5));
  gg.restore();
  felt(S, x => { x.moveTo(-15, -108); x.quadraticCurveTo(-14, -126, 0, -128); x.quadraticCurveTo(14, -126, 15, -108); x.closePath(); }, hat, { fuzz: 0.5 });
  felt(S, RR(-18, -110, 36, 4.5, 2), hat, { fuzz: 0.4 });
  shadowEll(g, x + 6, y, 18 * s, 5 * s); stamp(g, S, x, y, s);
}

// 돌탑: 납작한 돌을 쌓아 올린 서낭 돌무더기
export function cairn(g, x, y, s, seed) {
  const R = rng(seed); shadowEll(g, x + 4, y, 26 * s, 6 * s);
  let yy = y, w = 24 * s;
  for (let k = 0; k < 7; k++) { const h = (6 + R() * 3) * s, c = ['#a9a49b', '#8f8a82', '#b7b1a5', '#9c968c'][(R() * 4) | 0], ox = (R() - 0.5) * 3 * s;
    const gr = g.createLinearGradient(0, yy - h, 0, yy); gr.addColorStop(0, tone(c, 0.12)); gr.addColorStop(1, tone(c, -0.16));
    g.save(); g.shadowColor = 'rgba(20,14,8,0.4)'; g.shadowBlur = 3; g.shadowOffsetY = 1.5; g.fillStyle = gr; g.beginPath(); g.ellipse(x + ox, yy - h / 2, w / 2, h / 2, 0, 0, TAU); g.fill(); g.restore();
    for (let q = 0; q < w * 1.5; q++) { g.fillStyle = `rgba(${R() < 0.5 ? '40,36,30' : '240,236,226'},${0.25 * R() + 0.1})`; g.fillRect(x + ox + (R() - 0.5) * w * 0.9, yy - h * R(), 0.8, 0.8); }
    yy -= h * 0.82; w *= 0.84; }
}

// 꽂힌 화살 무리
export function arrows(g, x, y, n, s, seed, lean = 0.35) {
  const R = rng(seed);
  for (let k = 0; k < n; k++) {
    const px = x + (R() - 0.5) * 50 * s, py = y + (R() - 0.5) * 16 * s, a = -Math.PI / 2 + lean + (R() - 0.5) * 0.5, l = (26 + R() * 8) * s, ex = px + Math.cos(a) * l, ey = py + Math.sin(a) * l;
    shadowEll(g, px + 6 * s, py + 1, 8 * s, 2 * s, 0.3);
    g.save(); g.fillStyle = 'rgba(110,80,50,0.6)'; g.beginPath(); g.ellipse(px, py, 3 * s, 1.2 * s, 0, 0, TAU); g.fill();
    g.strokeStyle = '#7a5332'; g.lineWidth = 1.6 * s; g.lineCap = 'round'; g.shadowColor = 'rgba(30,14,4,0.35)'; g.shadowBlur = 2; g.shadowOffsetX = 1; g.beginPath(); g.moveTo(px, py); g.lineTo(ex, ey); g.stroke(); g.shadowColor = 'transparent';
    const nx = Math.cos(a), ny = Math.sin(a), qx = -ny, qy = nx;
    for (const d of [-1, 1]) { g.fillStyle = k % 3 ? '#f3eee2' : '#c8362e'; g.beginPath(); g.moveTo(ex - nx * 1 * s, ey - ny * 1 * s); g.lineTo(ex - nx * 8 * s + qx * d * 3.4 * s, ey - ny * 8 * s + qy * d * 3.4 * s); g.lineTo(ex - nx * 9 * s, ey - ny * 9 * s); g.closePath(); g.fill(); }
    g.restore();
  }
}

// 깨진 등패(둥근 등나무 방패)
export function shield(g, x, y, r, rot, seed) {
  const R = rng(seed); shadowEll(g, x + 3, y + 2, r * 1.2, r * 0.4, 0.45);
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(1, 0.55);
  const path = () => { g.beginPath(); g.moveTo(0, 0); for (let k = 0; k <= 24; k++) { const a = -0.4 + k / 24 * (TAU - 1.1); g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.lineTo(r * 0.3, -r * 0.1); g.closePath(); };
  const gr = g.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r); gr.addColorStop(0, '#a8744a'); gr.addColorStop(1, '#5e3a22');
  g.shadowColor = 'rgba(30,14,4,0.45)'; g.shadowBlur = 4; g.fillStyle = gr; path(); g.fill(); g.shadowColor = 'transparent'; g.save(); path(); g.clip();
  g.strokeStyle = 'rgba(40,20,8,0.55)'; g.lineWidth = 1; for (let x = -r; x < r; x += r * 0.28) { g.beginPath(); g.moveTo(x, -r); g.lineTo(x + (R() - 0.5) * 2, r); g.stroke(); }
  g.strokeStyle = 'rgba(255,225,180,0.18)'; g.lineWidth = 0.6; for (let x = -r + 2; x < r; x += r * 0.28) { g.beginPath(); g.moveTo(x, -r); g.lineTo(x, r); g.stroke(); }
  g.restore();
  g.strokeStyle = '#6a7078'; g.lineWidth = 3; path(); g.stroke(); g.strokeStyle = 'rgba(230,235,240,0.5)'; g.lineWidth = 1; path(); g.stroke();
  for (let k = 0; k < 10; k++) { const a2 = -0.4 + k / 9 * (TAU - 1.1); g.fillStyle = '#c9a046'; g.beginPath(); g.arc(Math.cos(a2) * r * 0.82, Math.sin(a2) * r * 0.82, 1.3, 0, TAU); g.fill(); }
  const bg = g.createRadialGradient(-r * 0.06, -r * 0.06, 0, 0, 0, r * 0.22); bg.addColorStop(0, '#f6e2a0'); bg.addColorStop(1, '#8a6218'); g.fillStyle = bg; g.beginPath(); g.arc(0, 0, r * 0.2, 0, TAU); g.fill();
  g.restore();
}

// 그을린 자국과 잿불
export function scorch(g, x, y, rx, ry, seed) {
  const R = rng(seed);
  g.save(); const gr = g.createRadialGradient(x, y, 0, x, y, rx); gr.addColorStop(0, 'rgba(36,26,18,0.75)'); gr.addColorStop(0.6, 'rgba(60,44,28,0.45)'); gr.addColorStop(1, 'rgba(60,44,28,0)');
  g.translate(x, y); g.scale(1, ry / rx); g.translate(-x, -y); g.fillStyle = gr; g.beginPath(); g.arc(x, y, rx, 0, TAU); g.fill(); g.restore();
  for (let k = 0; k < rx * 0.8; k++) { const a = R() * TAU, m = Math.sqrt(R()) * 0.7, px = x + Math.cos(a) * rx * m, py = y + Math.sin(a) * ry * m; g.fillStyle = R() < 0.3 ? `rgba(255,${120 + R() * 80 | 0},60,${0.6 + R() * 0.4})` : `rgba(20,14,10,${0.4 + R() * 0.4})`; g.beginPath(); g.arc(px, py, 0.6 + R() * 1.4, 0, TAU); g.fill(); }
  g.save(); g.globalCompositeOperation = 'screen'; const gl = g.createRadialGradient(x, y, 0, x, y, rx * 0.5); gl.addColorStop(0, 'rgba(255,120,40,0.25)'); gl.addColorStop(1, 'rgba(255,120,40,0)'); g.fillStyle = gl; g.beginPath(); g.arc(x, y, rx * 0.5, 0, TAU); g.fill(); g.restore();
}

// 도깨비불: 푸른 혼불
export function wisp(g, x, y, s, seed) {
  const R = rng(seed);
  g.save(); g.globalCompositeOperation = 'screen';
  const gl = g.createRadialGradient(x, y, 0, x, y, 60 * s); gl.addColorStop(0, 'rgba(120,230,220,0.6)'); gl.addColorStop(0.4, 'rgba(70,170,200,0.18)'); gl.addColorStop(1, 'rgba(40,120,180,0)'); g.fillStyle = gl; g.beginPath(); g.arc(x, y, 60 * s, 0, TAU); g.fill();
  g.restore();
  s *= 1.5;
  const flame = (sc, c0, c1) => { const gr = g.createRadialGradient(x, y + 4 * s * sc, 0, x, y, 14 * s * sc); gr.addColorStop(0, c0); gr.addColorStop(1, c1); g.fillStyle = gr; g.beginPath(); g.moveTo(x, y - 22 * s * sc); g.bezierCurveTo(x + 6 * s * sc, y - 12 * s * sc, x + 12 * s * sc, y - 2 * s * sc, x + 9 * s * sc, y + 6 * s * sc); g.bezierCurveTo(x + 6 * s * sc, y + 12 * s * sc, x - 6 * s * sc, y + 12 * s * sc, x - 9 * s * sc, y + 6 * s * sc); g.bezierCurveTo(x - 12 * s * sc, y - 2 * s * sc, x - 4 * s * sc, y - 10 * s * sc, x, y - 22 * s * sc); g.fill(); };
  g.save(); g.filter = 'blur(1px)';
  for (const [dx, sc, rot] of [[-5, 0.7, -0.35], [6, 0.62, 0.4]]) { g.save(); g.translate(x + dx * s, y + 4 * s); g.rotate(rot); g.translate(-x, -y); flame(sc, 'rgba(140,240,235,0.8)', 'rgba(40,130,190,0.45)'); g.restore(); }
  flame(1, 'rgba(160,250,240,0.95)', 'rgba(50,150,200,0.55)'); g.filter = 'none'; flame(0.5, 'rgba(255,255,255,0.95)', 'rgba(150,240,235,0.8)'); g.restore();
  for (let k = 0; k < 6; k++) { g.fillStyle = `rgba(170,250,240,${0.4 + R() * 0.5})`; g.beginPath(); g.arc(x + (R() - 0.5) * 30 * s, y - 10 * s - R() * 30 * s, 0.8 + R() * 1.4, 0, TAU); g.fill(); }
}

// 마른 나무: 잎 없이 비틀린 가지
export function deadTree(g, x, y, s, seed) {
  const R = rng(seed); shadowEll(g, x + 8, y, 30 * s, 6 * s);
  const branch = (bx, by, a, len, w, d) => {
    const ex = bx + Math.cos(a) * len, ey = by + Math.sin(a) * len, mx = (bx + ex) / 2 + (R() - 0.5) * len * 0.3, my = (by + ey) / 2 + (R() - 0.5) * len * 0.2;
    g.strokeStyle = woodGrad(g, bx, w * 2, '#4a382c'); g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(mx, my, ex, ey); g.stroke();
    if (d > 0) { const n = 2 + (R() < 0.4); for (let k = 0; k < n; k++) branch(ex, ey, a + (R() - 0.5) * 1.3 + (k - (n - 1) / 2) * 0.6, len * (0.55 + R() * 0.2), w * 0.62, d - 1); }
  };
  g.save(); g.shadowColor = 'rgba(20,10,4,0.4)'; g.shadowBlur = 4; g.shadowOffsetX = 2; branch(x, y, -Math.PI / 2 + (R() - 0.5) * 0.3, 56 * s, 9 * s, 4); g.restore();
}

// 연기 기둥: 회갈색 수채 번짐이 피어오른다
export function smoke(g, x, y, h, s, seed, drift = 0.35) {
  const R = rng(seed);
  for (let k = 0; k < 14; k++) { const t = k / 13, px = x + t * h * drift + (R() - 0.5) * 12, py = y - t * h, r = (16 + t * 46) * s; wash(g, px, py, r, r * 0.8, k < 4 ? '#4a423e' : '#7a726c', 0.85 * (1 - t * 0.7), seed * 7 + k); }
}

// 먼 성곽: 여장이 이어진 돌성 + 작은 군기
export function fortWall(g, x0, x1, y, h, seed) {
  const R = rng(seed);
  const top = []; for (let x = x0, k = 0; x <= x1; x += 11, k++) { const yy = y - h + Math.sin(k * 0.4) * 3; top.push([x, yy - (k % 2 ? 0 : 7)]); top.push([x + 11, yy - (k % 2 ? 0 : 7)]); }
  g.save(); g.shadowColor = 'rgba(20,14,8,0.35)'; g.shadowBlur = 8; g.shadowOffsetY = 3;
  const gr = g.createLinearGradient(0, y - h - 8, 0, y); gr.addColorStop(0, '#ddd3c1'); gr.addColorStop(1, '#a99d88');
  g.fillStyle = gr; g.beginPath(); g.moveTo(x0, y); top.forEach(([a, b]) => g.lineTo(a, b)); g.lineTo(x1 + 11, y); g.closePath(); g.fill(); g.restore();
  g.save(); g.beginPath(); g.moveTo(x0, y); top.forEach(([a, b]) => g.lineTo(a, b)); g.lineTo(x1 + 11, y); g.closePath(); g.clip();
  g.strokeStyle = 'rgba(90,76,60,0.45)'; g.lineWidth = 0.7;
  for (let yy = y - 4, r = 0; yy > y - h - 8; yy -= 5, r++) { g.beginPath(); g.moveTo(x0, yy); g.lineTo(x1 + 11, yy); g.stroke(); for (let xx = x0 + (r % 2) * 5; xx < x1 + 11; xx += 10 + R() * 3) { g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx, yy - 5); g.stroke(); } }
  g.fillStyle = 'rgba(40,30,24,0.6)'; for (let x = x0 + 5; x < x1; x += 22) g.fillRect(x, y - h + 2, 2, 3);
  g.restore();
  g.strokeStyle = 'rgba(214,170,80,0.8)'; g.lineWidth = 1; g.beginPath(); top.forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b)); g.stroke();
}

// 부러진 창: 자루와 날이 따로 뒹군다
export function brokenSpear(g, x, y, len, rot, seed) {
  const R = rng(seed); shadowEll(g, x, y + 2, len * 0.6, 4, 0.35);
  g.save(); g.translate(x, y); g.rotate(rot); g.lineCap = 'round';
  g.strokeStyle = woodGrad(g, 0, 4, '#7a4e2e'); g.lineWidth = 3; g.shadowColor = 'rgba(30,14,4,0.4)'; g.shadowBlur = 3; g.shadowOffsetY = 1.5;
  g.beginPath(); g.moveTo(-len / 2, 0); g.lineTo(-2, 0); g.stroke();
  g.fillStyle = '#d9b98a'; g.beginPath(); g.moveTo(-2, -1.6); g.lineTo(2, -0.4); g.lineTo(-1, 0.6); g.lineTo(1.5, 1.6); g.lineTo(-2, 1.6); g.fill();
  g.rotate(0.25 + R() * 0.3); g.translate(10, 2);
  g.strokeStyle = woodGrad(g, 0, 4, '#7a4e2e'); g.beginPath(); g.moveTo(0, 0); g.lineTo(len * 0.35, 0); g.stroke();
  const sg = g.createLinearGradient(len * 0.35, -3, len * 0.35 + 14, 3); sg.addColorStop(0, '#f4f2ea'); sg.addColorStop(1, '#5d646c');
  g.fillStyle = sg; g.beginPath(); g.moveTo(len * 0.35, -3); g.lineTo(len * 0.35 + 15, 0); g.lineTo(len * 0.35, 3); g.closePath(); g.fill();
  g.fillStyle = '#c8362e'; g.beginPath(); g.arc(len * 0.35 - 1, 0, 3.4, 0, TAU); g.fill();
  g.restore();
}
// 떨어진 도깨비 방망이
export function club(g, x, y, s, rot) {
  shadowEll(g, x, y + 3, 26 * s, 5 * s, 0.4);
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  const gr = g.createLinearGradient(0, -8, 0, 8); gr.addColorStop(0, '#9b6a3c'); gr.addColorStop(1, '#4b2e18');
  g.fillStyle = gr; g.shadowColor = 'rgba(30,14,4,0.4)'; g.shadowBlur = 4; g.shadowOffsetY = 2;
  g.beginPath(); g.moveTo(-26, -2.5); g.lineTo(18, -8); g.quadraticCurveTo(28, 0, 18, 8); g.lineTo(-26, 2.5); g.closePath(); g.fill(); g.shadowColor = 'transparent';
  for (let k = 0; k < 7; k++) { const t = k / 6, xx = -8 + t * 26, ww = 3 + t * 5; const bg = g.createRadialGradient(xx - 0.4, (k % 2 ? 1 : -1) * ww * 0.5 - 0.4, 0, xx, (k % 2 ? 1 : -1) * ww * 0.5, 1.5); bg.addColorStop(0, '#fff2bd'); bg.addColorStop(1, '#7c5517'); g.fillStyle = bg; g.beginPath(); g.arc(xx, (k % 2 ? 1 : -1) * ww * 0.5, 1.5, 0, TAU); g.fill(); }
  g.restore();
}
// 화톳불: 장작 위로 타오르는 불
export function fire(g, x, y, s, seed) {
  const R = rng(seed);
  g.save(); g.globalCompositeOperation = 'screen'; const gl = g.createRadialGradient(x, y - 14 * s, 0, x, y - 14 * s, 80 * s); gl.addColorStop(0, 'rgba(255,170,80,0.55)'); gl.addColorStop(0.5, 'rgba(255,120,40,0.15)'); gl.addColorStop(1, 'rgba(255,120,40,0)'); g.fillStyle = gl; g.beginPath(); g.arc(x, y - 14 * s, 80 * s, 0, TAU); g.fill(); g.restore();
  shadowEll(g, x, y + 2, 24 * s, 6 * s, 0.5);
  g.save(); g.lineCap = 'round'; for (const [a, l] of [[-0.35, 22], [0.4, 22], [0.05, 20]]) { g.strokeStyle = woodGrad(g, x, 5 * s, '#5a3420'); g.lineWidth = 5 * s; g.beginPath(); g.moveTo(x - Math.cos(a) * l * s, y - Math.sin(a) * 3 * s); g.lineTo(x + Math.cos(a) * l * s, y + Math.sin(a) * 3 * s - 2 * s); g.stroke(); } g.restore();
  const tongue = (dx, h, w, c0, c1) => { const gr = g.createLinearGradient(0, y - h, 0, y); gr.addColorStop(0, c0); gr.addColorStop(1, c1); g.fillStyle = gr; g.beginPath(); g.moveTo(x + dx - w, y - 2 * s); g.bezierCurveTo(x + dx - w, y - h * 0.5, x + dx - w * 0.2, y - h * 0.7, x + dx + w * 0.3, y - h); g.bezierCurveTo(x + dx + w * 0.2, y - h * 0.6, x + dx + w, y - h * 0.4, x + dx + w, y - 2 * s); g.closePath(); g.fill(); };
  g.save(); g.filter = 'blur(0.6px)';
  for (let k = 0; k < 5; k++) tongue((R() - 0.5) * 20 * s, (26 + R() * 22) * s, (6 + R() * 5) * s, 'rgba(230,70,40,0.9)', 'rgba(250,140,50,0.95)');
  for (let k = 0; k < 4; k++) tongue((R() - 0.5) * 12 * s, (16 + R() * 12) * s, (4 + R() * 3) * s, 'rgba(255,200,90,0.95)', 'rgba(255,240,180,1)');
  g.restore();
  for (let k = 0; k < 10; k++) { g.fillStyle = `rgba(255,${150 + R() * 90 | 0},60,${0.5 + R() * 0.5})`; g.beginPath(); g.arc(x + (R() - 0.5) * 40 * s, y - 30 * s - R() * 50 * s, 0.8 + R() * 1.2, 0, TAU); g.fill(); }
}
// 짓밟힌 진흙과 발자국
export function mud(g, x, y, rx, ry, seed) {
  const R = rng(seed);
  wash(g, x, y, rx, ry, '#7a5a3a', 0.75, seed + 300);
  wash(g, x + rx * 0.1, y, rx * 0.6, ry * 0.6, '#5e4430', 0.5, seed + 301);
  for (let k = 0; k < rx * 0.4; k++) { const px = x + (R() - 0.5) * rx * 1.4, py = y + (R() - 0.5) * ry * 1.2, a = (R() - 0.5) * 0.6; g.save(); g.translate(px, py); g.rotate(a); g.fillStyle = 'rgba(50,34,22,0.45)'; g.beginPath(); g.ellipse(0, 0, 3.4, 1.6, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(6, 2.6, 3.4, 1.6, 0, 0, TAU); g.fill(); g.restore(); }
}
