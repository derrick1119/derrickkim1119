// 즉시 모드 UI — 한지 판과 놋쇠 귀장식, 쪽빛 옻칠에 금선, 붉은 낙관
import { TAU, INK, PAPER, RED, REDD, INDIGO, NAVY, TEAL, OCHRE, SUB, FONT, FONT_B, st, fs, ell, rr, rrPath, poly, line, path, text, clamp, makeCanvas } from '../render/draw.js';
import { drawInk, MEOK } from '../render/ink.js';
import { symbol, hasSymbol } from '../render/symbols.js';

export const C = { paper: PAPER, tray: '#1f2a47', ink: INK, sub: SUB, navy: NAVY, indigo: INDIGO, red: RED, redD: REDD, gold: OCHRE, teal: TEAL, grey: '#a9a394', cream: '#fbf7ec', dim: '#a4afcc', gilt: '#e2b85a' };

// 입력 상태는 main.js 가 매 프레임 갱신한다
// layer/top: 겹침 화면(덱·군대 살피기)이 떠 있으면 그 아래 층의 버튼은 눌리지 않는다
export const ui = { inp: null, active: null, sfx: null, layer: 0, top: 0 };
export function inRect(p, x, y, w, h) { return p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h; }
export function tapped(id, x, y, w, h) {
  const i = ui.inp; let hit = false; if (ui.layer < ui.top) return false;
  if (i.pressed && inRect(i, x, y, w, h) && !ui.active) ui.active = id;
  if (i.released && ui.active === id && inRect(i, x, y, w, h) && !i.dragged) hit = true;
  return hit;
}
export function isDown(id, x, y, w, h) { return ui.layer >= ui.top && ui.active === id && ui.inp.down && inRect(ui.inp, x, y, w, h); }

// 자주 그리는 판은 한 번 그려 두고 다시 쓴다 (크기·모양이 같으면 같은 그림)
const CS = 2, baked = new Map();
function bake(g, key, x, y, w, h, pad, draw) {
  let c = baked.get(key);
  if (!c) { if (baked.size > 96) baked.delete(baked.keys().next().value); c = makeCanvas((w + pad * 2) * CS, (h + pad * 2) * CS); const cg = c.getContext('2d'); cg.scale(CS, CS); cg.translate(pad, pad); draw(cg); baked.set(key, c); }
  g.drawImage(c, x - pad, y - pad, c.width / CS, c.height / CS);
}
// 세로 그라데이션: 같은 자리·같은 색이면 만든 것을 다시 쓴다 (단추·판은 매 장면 같은 곳에 그려진다)
const GC = new WeakMap();
const vgrad = (g, y0, y1, a, b, mid) => {
  let m = GC.get(g); if (!m) { m = new Map(); GC.set(g, m); }
  const key = `${y0}|${y1}|${a}|${b}|${mid ? mid.join() : ''}`; let gr = m.get(key); if (gr) return gr;
  gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, a); if (mid) gr.addColorStop(mid[0], mid[1]); gr.addColorStop(1, b);
  if (m.size > 400) m.clear(); m.set(key, gr); return gr;
};
// 칠보문: 쪽빛 바탕에 옅게 깔리는 겹친 고리 무늬
function chilbo(g, w, h, a = 0.07) { const s = 17, r = s / Math.SQRT2; g.save(); g.beginPath(); g.rect(0, 0, w, h); g.clip(); g.strokeStyle = `rgba(226,184,90,${a})`; g.lineWidth = 0.9; for (let y = 0; y <= h + s; y += s) for (let x = 0; x <= w + s; x += s) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); } g.restore(); }
// 놋쇠 귀장식 (왼쪽 위 귀 기준, 뒤집어 네 귀에 박는다)
function corner(g) {
  path(g, p => { p.moveTo(4.4, 3); p.lineTo(27, 3); p.quadraticCurveTo(27, 9, 21, 9); p.lineTo(13.4, 9); p.quadraticCurveTo(9, 9, 9, 13.4); p.lineTo(9, 21); p.quadraticCurveTo(9, 27, 3, 27); p.lineTo(3, 4.4); p.quadraticCurveTo(3, 3, 4.4, 3); p.closePath(); }, '#d6a640', INK, 1.3);
  line(g, [5.4, 5, 24, 5], 'rgba(255,242,196,0.8)', 1); line(g, [5, 5.4, 5, 24], 'rgba(255,242,196,0.8)', 1);
  ell(g, 7.2, 7.2, 1.5, 1.5, '#8a5f1c'); ell(g, 20.4, 6.2, 1, 1, '#8a5f1c'); ell(g, 6.2, 20.4, 1, 1, '#8a5f1c');
}
// 옻칠 나무틀: 판 바깥으로 두르는 검붉은 테와 금선 (판 안쪽 자리는 그대로 둔다)
function lacquer(g, w, h, d = 7, r = 10) {
  for (const [k, a] of [[16, 0.07], [10, 0.1], [5, 0.14]]) rr(g, -d - k * 0.3, -d + k * 0.5, w + d * 2 + k * 0.6, h + d * 2 + k * 0.2, r + k * 0.3, `rgba(8,4,2,${a})`);
  rr(g, -d, -d, w + d * 2, h + d * 2, r, vgrad(g, -d, h + d, '#5a2e1c', '#24110a', [0.5, '#3a1d12']), INK, 2.2);
  g.fillStyle = 'rgba(255,214,170,0.14)'; rr(g, -d + 3, -d + 2, w + d * 2 - 6, 2.2, 1, 'rgba(255,214,170,0.22)');
  rr(g, -d + 3, -d + 3, w + d * 2 - 6, h + d * 2 - 6, r - 2, null, foil(g, -d, w + d), 1.6);
}
// 놋쇠 귀장식 (큰 것): 구름 모양으로 깎은 금속판에 못 셋과 새김 무늬
function bigCorner(g, s = 1) {
  g.save(); g.scale(s, s);
  path(g, p => { p.moveTo(-9, -9); p.lineTo(34, -9); p.quadraticCurveTo(38, -2, 30, 2); p.quadraticCurveTo(22, 4, 18, 0); p.quadraticCurveTo(10, -2, 6, 6); p.quadraticCurveTo(-2, 10, 0, 18); p.quadraticCurveTo(4, 22, 2, 30); p.quadraticCurveTo(-2, 38, -9, 34); p.closePath(); }, '#d8a944', INK, 1.5);
  g.save(); g.beginPath(); g.rect(-10, -10, 50, 50); g.clip(); g.fillStyle = 'rgba(255,244,200,0.55)'; g.beginPath(); g.moveTo(-8, -8); g.lineTo(32, -8); g.lineTo(28, -5); g.lineTo(-5, -5); g.lineTo(-5, 30); g.lineTo(-8, 32); g.closePath(); g.fill(); g.restore();
  path(g, p => { p.moveTo(4, -3); p.quadraticCurveTo(14, -6, 22, -3); }, null, 'rgba(110,70,14,0.75)', 1); path(g, p => { p.moveTo(-3, 4); p.quadraticCurveTo(-6, 14, -3, 22); }, null, 'rgba(110,70,14,0.75)', 1);
  for (const [x, y] of [[-3, -3], [27, -4], [-4, 27]]) { ell(g, x, y, 2.4, 2.4, '#9a6a1c', INK, 0.8); ell(g, x - 0.6, y - 0.7, 0.9, 0.9, 'rgba(255,246,210,0.9)'); }
  g.restore();
}
// 금빛 글자: 위는 밝은 금, 아래는 짙은 금. 먹 테두리와 옅은 빛무리
export function goldText(g, s, x, y, o = {}) {
  const size = o.size || 40, font = o.font || FONT_B, al = o.align || 'center';
  g.save(); g.font = `400 ${size}px ${font}`; g.textAlign = al; g.textBaseline = 'middle';
  let sc = 1; if (o.maxW) { const w = g.measureText(s).width; if (w > o.maxW) sc = o.maxW / w; }
  g.translate(x, y); g.scale(sc, 1);
  if (o.glow !== false) { g.shadowColor = o.glowCol || 'rgba(255,200,110,0.55)'; g.shadowBlur = size * 0.35; }
  g.lineJoin = 'round'; g.lineWidth = Math.max(2, size * 0.12); g.strokeStyle = o.stroke || '#2a160a'; g.strokeText(s, 0, size * 0.04);
  g.shadowBlur = 0; g.shadowColor = 'transparent';
  const gr = g.createLinearGradient(0, -size * 0.55, 0, size * 0.5); gr.addColorStop(0, '#fff7d6'); gr.addColorStop(0.42, '#f3cf72'); gr.addColorStop(0.55, '#d79a2e'); gr.addColorStop(1, '#f6d98a');
  g.fillStyle = o.fill || gr; g.fillText(s, 0, size * 0.04);
  g.restore();
}
// 빛줄기: 비스듬한 빛 띠가 판 위를 천천히 지나간다 (period 초마다 한 번)
export function shine(g, x, y, w, h, r, period = 4.2, a = 0.28, ph = 0) {
  const t = ((performance.now() / 1000 + ph) % period) / period, k = t * 1.6 - 0.3; if (k < -0.2 || k > 1.2) return;
  g.save(); g.beginPath(); rrPath(g, x, y, w, h, r); g.clip(); const cx = x + k * (w + h);
  const gr = g.createLinearGradient(cx - h, y, cx, y + h); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, `rgba(255,250,230,${a})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.beginPath(); g.moveTo(cx - h - 30, y + h); g.lineTo(cx - 30, y); g.lineTo(cx + 30, y); g.lineTo(cx - h + 30, y + h); g.closePath(); g.fill(); g.restore();
}
// 장식 가름선: 가운데 금빛 마름모와 양쪽으로 가늘어지는 금선
export function divider(g, x, y, w, col = '#c9962e') {
  const gr = g.createLinearGradient(x - w / 2, 0, x + w / 2, 0); gr.addColorStop(0, 'rgba(201,150,46,0)'); gr.addColorStop(0.5, col); gr.addColorStop(1, 'rgba(201,150,46,0)');
  g.fillStyle = gr; g.fillRect(x - w / 2, y - 0.8, w, 1.6); poly(g, [x - 7, y, x, y - 6, x + 7, y, x, y + 6], col, 'rgba(60,36,10,0.8)', 1); ell(g, x, y, 1.6, 1.6, '#fff4c8');
  for (const s of [-1, 1]) ell(g, x + s * 14, y, 2, 2, col);
}
function paperPanel(g, w, h) {
  if (w > 120 && h > 80) lacquer(g, w, h, w > 400 && h > 200 ? 9 : 7);
  rr(g, 3, 6, w, h, 7, 'rgba(40,28,16,0.26)'); rr(g, 0, 0, w, h, 7, vgrad(g, 0, h, '#fdf7e7', '#efe4c8', [0.55, PAPER]), INK, 2.6);
  let sd = (w * 3 + h) | 0; const R = () => { sd = (sd * 1664525 + 1013904223) >>> 0; return sd / 4294967296; };
  g.save(); g.beginPath(); rrPath(g, 1.5, 1.5, w - 3, h - 3, 6); g.clip(); g.lineWidth = 0.9; const n = Math.min(320, (w * h / 3000) | 0);
  for (let k = 0; k < n; k++) { const px = R() * w, py = R() * h, a = R() * TAU, l = 5 + R() * 12; g.strokeStyle = R() < 0.5 ? 'rgba(160,136,92,0.16)' : 'rgba(255,255,255,0.5)'; g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); g.stroke(); }
  // 큰 종이에는 귀퉁이에 먹이 옅게 번지고 먹물 몇 방울이 튀어 있다
  if (w > 260 && h > 180) {
    const k = Math.min(1.7, Math.max(0.8, h / 230)); drawInk(g, 'wash', w - 34 * k, h - 22 * k, k, 0, 0.2, MEOK, (w + h) % 3); drawInk(g, 'wash', 26 * k, 30 * k, k * 0.6, 0, 0.11, MEOK, (w * 7 + h) % 3);
    g.fillStyle = MEOK; for (let j = 0; j < 12; j++) { const a = Math.PI * (1 + R() * 0.5), d = (50 + R() * 150) * k; g.globalAlpha = 0.1 + R() * 0.22; g.beginPath(); g.arc(w - 20 + Math.cos(a) * d, h - 14 + Math.sin(a) * d * 0.7, 0.6 + R() * R() * 2.6, 0, TAU); g.fill(); } g.globalAlpha = 1;
  }
  rr(g, 0, 0, w, h, 7, null, 'rgba(150,118,66,0.13)', 16); g.restore();
  rr(g, 7, 7, w - 14, h - 14, 3.5, null, 'rgba(38,42,54,0.5)', 1.1); rr(g, 10, 10, w - 20, h - 20, 2.5, null, 'rgba(201,150,46,0.75)', 0.9);
  const big = w > 400 && h > 200, d = big ? 9 : 7;
  if (w > 150 && h > 110) for (const [cx, cy, sx, sy] of [[-d + 2, -d + 2, 1, 1], [w + d - 2, -d + 2, -1, 1], [-d + 2, h + d - 2, 1, -1], [w + d - 2, h + d - 2, -1, -1]]) { g.save(); g.translate(cx, cy); g.scale(sx, sy); bigCorner(g, big ? 1 : 0.72); g.restore(); }
  // 큰 판 위쪽 가운데: 금빛 매듭 장식
  if (big) { const cx = w / 2; rr(g, cx - 26, -d - 5, 52, 12, 5, vgrad(g, -d - 5, -d + 7, '#f3d27c', '#a8782a'), INK, 1.3); ell(g, cx, -d + 1, 7.5, 7.5, '#c8402f', INK, 1.3); ell(g, cx, -d + 1, 3.4, 3.4, '#f3d27c'); }
}
function navyPanel(g, w, h) {
  if (w > 120 && h > 80) lacquer(g, w, h, 6);
  rr(g, 3, 6, w, h, 9, 'rgba(40,28,16,0.26)'); rr(g, 0, 0, w, h, 9, vgrad(g, 0, h, '#2b3b60', '#18213a'), INK, 2.6);
  g.save(); g.beginPath(); rrPath(g, 1.5, 1.5, w - 3, h - 3, 8); g.clip(); chilbo(g, w, h); g.restore();
  rr(g, 6, 6, w - 12, h - 12, 5, null, 'rgba(226,184,90,0.8)', 1.2); rr(g, 9, 9, w - 18, h - 18, 3.5, null, 'rgba(226,184,90,0.3)', 0.8);
}
// 금박: 빛을 받아 결이 이는 금빛 (띠·단추·패의 테두리)
export const foil = (g, x0, x1) => { let m = GC.get(g); if (!m) { m = new Map(); GC.set(g, m); } const key = `foil|${x0}|${x1}`; let gr = m.get(key); if (gr) return gr; gr = g.createLinearGradient(x0, 0, x1, 0); [['#a87a24', 0], ['#f6dc8a', 0.18], ['#c9962e', 0.38], ['#fbe9a8', 0.6], ['#b8862a', 0.8], ['#f0d27a', 1]].forEach(([c, t]) => gr.addColorStop(t, c)); if (m.size > 400) m.clear(); m.set(key, gr); return gr; };
// 쪽빛 판에 깔린 한지 섬유 (옻칠 위로 비치는 종이 결)
function fibers(g, w, h, seed, a = 0.06) { let sd = seed | 0 || 7; const R = () => { sd = (sd * 1664525 + 1013904223) >>> 0; return sd / 4294967296; }; g.lineWidth = 0.8; for (let i = 0, n = (w * h / 900) | 0; i < n; i++) { const x = R() * w, y = R() * h, an = R() * TAU, l = 4 + R() * 10; g.strokeStyle = R() < 0.6 ? `rgba(255,240,210,${a})` : `rgba(0,0,0,${a * 0.8})`; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(an) * l, y + Math.sin(an) * l); g.stroke(); } }
// 단청 띠: 머리초처럼 초록·붉은·쪽빛·흰 칸이 번갈아 이어지는 가는 띠
function dancheong(g, x, y, w, h) {
  const cols = ['#2f6f5c', '#b8322a', '#f3e6c4', '#2f4d7e', '#d8a944'], bw = h * 1.6;
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  for (let i = 0, k = 0; x + i * bw < x + w; i++, k++) { g.fillStyle = cols[k % cols.length]; g.fillRect(x + i * bw, y, bw + 0.5, h); g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x + i * bw, y, bw, h * 0.3); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x + i * bw + bw - 1, y, 1, h); }
  g.restore(); g.fillStyle = 'rgba(20,10,6,0.8)'; g.fillRect(x, y - 0.6, w, 1.2); g.fillRect(x, y + h - 0.6, w, 1.2);
}
// 아래쪽 패 받침: 쪽빛 옻칠 판에 한지 결, 금박 띠와 붉은 선을 두른다
function trayPanel(g, w, h) {
  g.fillStyle = vgrad(g, 0, h, '#283558', '#131a2e', [0.14, '#1f2a47']); g.fillRect(0, 0, w, h); chilbo(g, w, h, 0.055); fibers(g, w, h, 11);
  g.fillStyle = vgrad(g, 0, 16, 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0)'); g.fillRect(0, 0, w, 16);
  g.fillStyle = INK; g.fillRect(0, -5, w, 6); g.fillStyle = foil(g, 0, w); g.fillRect(0, 0.6, w, 3.2); g.fillStyle = 'rgba(255,248,220,0.55)'; g.fillRect(0, 0.6, w, 0.8); dancheong(g, 0, 4.4, w, 5); g.fillStyle = foil(g, 0, w); g.fillRect(0, 9.4, w, 1.4);
}
// 머리 띠: 쪽빛 바탕, 아래 단에 겹고리(칠보) 띠와 금선 (회문 번개무늬는 중국풍으로 읽혀 쓰지 않는다)
function hudPanel(g, w, h) {
  g.fillStyle = vgrad(g, 0, h, '#2c3c62', '#1a2440'); g.fillRect(0, 0, w, h); chilbo(g, w, h, 0.05); fibers(g, w, h, 23);
  g.fillStyle = 'rgba(8,12,26,0.3)'; g.fillRect(0, h - 11, w, 11);
  g.save(); g.beginPath(); g.rect(0, h - 11, w, 11); g.clip(); g.strokeStyle = 'rgba(226,184,90,0.55)'; g.lineWidth = 1;
  for (let x = 0; x < w + 8; x += 7) { g.beginPath(); g.arc(x, h - 5.6, 4.6, 0, TAU); g.stroke(); }
  g.fillStyle = 'rgba(226,184,90,0.5)'; for (let x = 3.5; x < w; x += 7) { g.beginPath(); g.arc(x, h - 5.6, 0.9, 0, TAU); g.fill(); }
  g.restore();
  g.fillStyle = foil(g, 0, w); g.fillRect(0, h, w, 3.4); g.fillStyle = 'rgba(255,248,220,0.55)'; g.fillRect(0, h, w, 0.8); g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(0, h + 3.4, w, 1.4);
}
export function panel(g, x, y, w, h, style = 'paper') {
  if (style === 'paper') bake(g, `p:${w}:${h}`, x, y, w, h, 26, c => paperPanel(c, w, h));
  else if (style === 'navy') bake(g, `n:${w}:${h}`, x, y, w, h, 26, c => navyPanel(c, w, h));
  else if (style === 'tray') bake(g, `t:${w}:${h}`, x, y, w, h, 6, c => trayPanel(c, w, h));
  else if (style === 'hud') bake(g, `h:${w}:${h}`, x, y, w, h, 6, c => hudPanel(c, w, h));
  else if (style === 'tag') { const r = Math.min(h / 2, 8); rr(g, x + 1, y + 3, w, h, r, 'rgba(8,6,12,0.28)'); rr(g, x, y, w, h, r, vgrad(g, y, y + h, '#fffaee', '#e9dcbc'), INK, 1.8); rr(g, x + 2.6, y + 2.6, w - 5.2, h - 5.2, Math.max(1, r - 2.4), null, foil(g, x, x + w), 1.3); g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(x + r, y + 3.4, w - r * 2, 1.2); }
}
// [위, 아래, 옆면(두께), 글자, 장식선]
const BTN = {
  indigo: ['#40619a', '#27426f', '#16233f', C.cream, '#e2b85a'], red: ['#cc4a3b', '#9a2a22', '#5e1512', C.cream, '#f3c9a0'], paper: ['#fdf8ea', '#eadfc3', '#b5a888', INK, 'rgba(38,42,54,0.36)'],
  teal: ['#4f8270', '#325a4c', '#1c362d', C.cream, '#e2b85a'], wood: ['#5e3c25', '#3b2416', '#1e120a', C.cream, '#d6a640'], navy: ['#33456f', '#1c2745', '#0c1222', C.cream, '#e2b85a'], grey: ['#c4bfb0', '#a39d8d', '#7d7768', '#5a5346', 'rgba(90,83,70,0.45)'],
};
export function button(g, id, x, y, w, h, label, o = {}) {
  const name = o.style || 'indigo', sty = BTN[name], dis = !!o.disabled, light = name === 'paper' || name === 'grey';
  const hit = !dis && tapped(id, x, y, w, h), dn = !dis && isDown(id, x, y, w, h), off = dn ? 3 : 0;
  const r = o.r === undefined ? Math.min(11, h * 0.2) : Math.min(o.r, 12), yy = y + off, orn = w >= 220 && h >= 50;
  g.save(); if (dis) g.globalAlpha *= 0.55;
  for (const [d, a] of [[9, 0.08], [6, 0.11], [3, 0.14]]) rr(g, x - d * 0.4, y + 5 + d * 0.5, w + d * 0.8, h, r + d * 0.4, `rgba(10,8,20,${a})`);   // 바닥에 지는 부드러운 그림자 (흐림 효과 없이 겹쳐 그린다)
  rr(g, x, y + 5, w, h, r, sty[2], INK, 2.6);
  // 금속 테: 먹 테두리 → 금박 띠 → 옻칠 판
  rr(g, x, yy, w, h, r, light ? vgrad(g, yy, yy + h, '#f6e7bf', '#c9a45a') : foil(g, x, x + w), INK, 2.4);
  const ib = light ? 2.6 : 3.2; rr(g, x + ib, yy + ib, w - ib * 2, h - ib * 2, Math.max(2, r - ib), vgrad(g, yy, yy + h, sty[0], sty[1]), 'rgba(30,18,8,0.7)', 1.1);
  g.save(); g.beginPath(); rrPath(g, x + ib, yy + ib, w - ib * 2, h - ib * 2, Math.max(2, r - ib)); g.clip();
  // 윤기: 위쪽 절반에 둥근 빛, 아래에 옅은 그늘
  const gl = g.createLinearGradient(0, yy, 0, yy + h); gl.addColorStop(0, light ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.3)'); gl.addColorStop(0.45, 'rgba(255,255,255,0.04)'); gl.addColorStop(0.5, 'rgba(0,0,0,0)'); gl.addColorStop(1, 'rgba(0,0,0,0.2)'); g.fillStyle = gl; g.fillRect(x, yy, w, h);
  if (!light && h >= 44) { g.globalAlpha = 0.18; ell(g, x + w / 2, yy + h * 0.12, w * 0.42, h * 0.26, '#ffffff'); g.globalAlpha = 1; }
  g.restore();
  rr(g, x + ib + 3, yy + ib + 3, w - ib * 2 - 6, h - ib * 2 - 6, Math.max(2, r - ib - 3), null, light ? 'rgba(168,122,36,0.55)' : 'rgba(255,226,150,0.45)', 1);   // 가는 금선
  if (!light && !dis && w >= 200 && h >= 54) shine(g, x + ib, yy + ib, w - ib * 2, h - ib * 2, Math.max(2, r - ib), 4.6, 0.22, (x * 0.013) % 4);
  if (orn) for (const s of [-1, 1]) { const cx = x + w / 2 + s * (w / 2 - 24), cy = yy + h / 2, c4 = light ? '#a8782a' : '#f3d27c';
    // 구름 장식: 둥글게 말린 금빛 소용돌이 둘과 가는 꼬리
    g.beginPath(); g.arc(cx, cy, 5, 0, TAU); st(g, c4, 1.4); g.beginPath(); g.arc(cx - s * 2, cy - 1, 2.2, 0, TAU); g.fillStyle = c4; g.fill();
    g.beginPath(); g.arc(cx + s * 7, cy + 2.5, 3, Math.PI, TAU); st(g, c4, 1.2); line(g, [cx - s * 7, cy, cx - s * 18, cy], c4, 1.2); ell(g, cx - s * 20, cy, 1.4, 1.4, c4); }
  const size = o.size || Math.min(36, h * 0.46), tx = x + w / 2, ty = yy + h / 2 + 1, tw = w - (orn ? 78 : 22);
  if (!light) { text(g, label, tx, ty + 2, { size, font: o.font || FONT_B, fill: 'rgba(8,6,16,0.45)', maxW: tw }); text(g, label, tx, ty, { size, font: o.font || FONT_B, fill: vgrad(g, ty - size * 0.5, ty + size * 0.5, '#fffaf0', '#f3dca0'), maxW: tw }); }
  else text(g, label, tx, ty, { size, font: o.font || FONT_B, fill: sty[3], maxW: tw });
  g.restore();
  if (hit && ui.sfx) ui.sfx('click');
  return hit;
}
export function iconBtn(g, id, x, y, w, h, draw, o = {}) {
  const hit = tapped(id, x, y, w, h), dn = isDown(id, x, y, w, h), off = dn ? 2 : 0;
  rr(g, x, y + 3, w, h, 7, '#8a7a58', INK, 2.2); rr(g, x, y + off, w, h, 7, foil(g, x, x + w), INK, 2.2);
  rr(g, x + 2.6, y + 2.6 + off, w - 5.2, h - 5.2, 5, o.on ? vgrad(g, y, y + h, '#f8e6ac', '#e6c978') : vgrad(g, y, y + h, '#fffaee', '#e8dcbd'), 'rgba(60,36,10,0.6)', 1);
  g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(x + 7, y + 4.4 + off, w - 14, 1.4);
  draw(g, x + w / 2, y + h / 2 + off);
  if (hit && ui.sfx) ui.sfx('click');
  return hit;
}
export function bar(g, x, y, w, h, t, col, o = {}) {
  rr(g, x, y, w, h, h / 2, o.back || '#0d1424', 'rgba(20,22,34,0.42)', 1); const f = clamp(t, 0, 1);
  if (f > 0.01) {
    const fw = (w - 4) * f, fx = o.right ? x + 2 + (w - 4) * (1 - f) : x + 2, ih = h - 4;
    g.save(); g.beginPath(); rrPath(g, x + 2, y + 2, w - 4, ih, ih / 2); g.clip();
    g.fillStyle = col; g.fillRect(fx, y + 2, fw, ih); g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(fx, y + 2, fw, Math.max(1.4, ih * 0.34)); g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(fx, y + 2 + ih - Math.max(1.2, ih * 0.24), fw, ih);
    if (f < 0.995) { g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(o.right ? fx : fx + fw - 1.5, y + 2, 1.5, ih); }
    g.restore();
  }
}
// 붉은 도장: 테두리를 한 번 더 새긴 낙관. ch = 가운데에 새기는 그림 기호의 이름 (symbols.js. 기호가 아니면 글자로 찍는다 — 물음표)
export function seal(g, x, y, s, ch, col = RED, o = {}) {
  const dk = o.dark || 'rgba(30,20,20,0.55)', r = s * 0.14, x0 = x - s / 2, y0 = y - s / 2;
  rr(g, x0, y0, s, s, r, col, dk, Math.max(1.6, s * 0.03));
  if (s >= 22) { g.save(); g.beginPath(); rrPath(g, x0, y0, s, s, r); g.clip(); g.fillStyle = 'rgba(255,255,255,0.13)'; g.fillRect(x0, y0, s, s * 0.4); g.fillStyle = 'rgba(0,0,0,0.13)'; g.fillRect(x0, y0 + s * 0.84, s, s); g.restore(); }
  g.save(); g.globalAlpha *= 0.5; rr(g, x0 + s * 0.085, y0 + s * 0.085, s * 0.83, s * 0.83, s * 0.07, null, C.cream, Math.max(0.8, s * 0.026)); g.restore();
  if (hasSymbol(ch)) symbol(g, ch, x, y + (o.dy || 0), s * (o.k || 0.76), C.cream); else text(g, ch, x, y + s * 0.04 + (o.dy || 0), { size: s * (o.k || 0.6), font: FONT_B, fill: C.cream });
}
// 둥근 도장 자국: 두 겹 테 안에 그림 기호 하나
export function stamp(g, x, y, r, ch, col = RED, rot = -0.12) { g.save(); g.translate(x, y); g.rotate(rot); ell(g, 0, 0, r, r, 'rgba(251,247,236,0.82)', col, r * 0.1); ell(g, 0, 0, r * 0.82, r * 0.82, null, col, r * 0.04); if (hasSymbol(ch)) symbol(g, ch, 0, 0, r * 1.28, col); else text(g, ch, 0, r * 0.08, { size: r * 1.15, font: FONT_B, fill: col }); g.restore(); }
// 붓으로 한 번에 그은 제목 띠: 붓끝이 갈라지고 마른 붓 자국(비백)이 남는다
export function brushTitle(g, x, y, w, h, label, col = INDIGO, size = 40) {
  const L = x - w / 2 - 20, Rt = x + w / 2 + 20, t = y - h / 2, b = y + h / 2;
  const body = p => { p.moveTo(L + 10, t + 5); p.quadraticCurveTo(L - 7, y - 2, L + 6, b - 3); p.quadraticCurveTo(x, b + 3, Rt - 34, b - 2); p.lineTo(Rt - 3, b - 8); p.lineTo(Rt - 27, b - h * 0.24); p.lineTo(Rt + 9, y + 3); p.lineTo(Rt - 23, y - h * 0.1); p.lineTo(Rt + 2, t + h * 0.16); p.lineTo(Rt - 30, t + 3); p.quadraticCurveTo(x, t - 3, L + 10, t + 5); p.closePath(); };
  g.save(); g.translate(2.5, 4.5); g.globalAlpha *= 0.24; path(g, body, '#1a1420'); g.restore();
  path(g, body, col);
  g.save(); g.beginPath(); body(g); g.clip(); g.fillStyle = 'rgba(0,0,0,0.17)'; g.fillRect(L - 10, b - h * 0.2, Rt - L + 30, h); g.fillStyle = 'rgba(255,255,255,0.1)'; g.fillRect(L - 10, t - 4, Rt - L + 30, h * 0.2);
  g.globalAlpha *= 0.2; for (let i = 0; i < 5; i++) { const yy = t + h * (0.2 + i * 0.15); line(g, [Rt - 96 - ((i * 53) % 70), yy, Rt + 10, yy + (i % 2 ? 1.2 : -1)], '#fff', 1 + (i % 3) * 0.7); } g.restore();
  // 금박 가루와 금빛 테
  g.save(); g.beginPath(); body(g); g.clip(); let sd = (w * 13 + h) | 0; const R = () => { sd = (sd * 1664525 + 1013904223) >>> 0; return sd / 4294967296; };
  for (let i = 0; i < 46; i++) { const fx = L + R() * (Rt - L), fy = t + R() * h, fr = 0.6 + R() * 1.8; g.globalAlpha = 0.25 + R() * 0.5; g.fillStyle = R() < 0.5 ? '#f3d27c' : '#fff1c0'; g.fillRect(fx, fy, fr, fr * (0.6 + R())); } g.restore();
  g.save(); g.globalAlpha *= 0.9; g.beginPath(); body(g); st(g, foil(g, L, Rt), 1.6); g.restore();
  line(g, [x - w / 2 + 4, b - 9, x + w / 2 - 12, b - 10], '#e2b85a', 1.4);
  goldText(g, label, x, y + 1, { size, maxW: w - 20, glowCol: 'rgba(255,210,130,0.35)' });
}

// 옻칠 이름판: 검붉은 나무판에 금박 테와 놋쇠 못, 안에는 한지. col 이 있으면 한지 위쪽에 빛깔 띠
export function plaque(g, x, y, w, h, o = {}) {
  const d = o.down ? 3 : 0, yy = y + d;
  rr(g, x + 3, y + 7, w, h, 10, 'rgba(6,4,10,0.45)');
  const wg = g.createLinearGradient(0, yy, 0, yy + h); wg.addColorStop(0, '#6a3a22'); wg.addColorStop(0.5, '#4a2616'); wg.addColorStop(1, '#2c160c'); rr(g, x, yy, w, h, 10, wg, '#1a0c06', 2);
  rr(g, x + 3, yy + 3, w - 6, h - 6, 8, null, foil(g, x, x + w), 1.6);
  for (const [sx, sy] of [[x + 8, yy + 8], [x + w - 8, yy + 8], [x + 8, yy + h - 8], [x + w - 8, yy + h - 8]]) { ell(g, sx, sy, 3, 3, '#d8a944', '#3a200c', 0.9); ell(g, sx - 0.8, sy - 0.8, 1, 1, '#fff2c8'); }
  const pg = g.createLinearGradient(0, yy + 9, 0, yy + h - 9); pg.addColorStop(0, '#fbf5e4'); pg.addColorStop(1, '#ead9b4'); rr(g, x + 13, yy + 9, w - 26, h - 18, 5, pg, 'rgba(60,36,10,0.55)', 1);
  if (o.col) { g.save(); g.beginPath(); g.rect(x + 13, yy + 9, w - 26, 5); g.clip(); rr(g, x + 13, yy + 9, w - 26, h - 18, 5, o.col); g.restore(); }
  if (o.glow) { g.save(); g.globalAlpha = 0.5 + 0.3 * Math.sin(performance.now() / 300); rr(g, x - 3, yy - 3, w + 6, h + 6, 12, null, '#f3d27c', 2.4); g.restore(); }
  return yy;
}

// 두루마리: 한지 바탕에 옻칠 축, 축 끝엔 금 마개와 붉은 끈
export function scroll(g, x, y, w, h) {
  rr(g, x + 4, y + 7, w, h, 6, 'rgba(6,4,10,0.45)');
  const pg = g.createLinearGradient(0, y, 0, y + h); pg.addColorStop(0, '#fcf6e6'); pg.addColorStop(1, '#ecdcb8'); rr(g, x, y, w, h, 4, pg, '#5a4030', 1.8);
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.globalAlpha = 0.08; for (let i = 0; i < w * h / 600; i++) { const fx = x + ((i * 97) % w), fy = y + ((i * 53) % h); line(g, [fx, fy, fx + 8, fy + 2], i % 2 ? '#7a6040' : '#ffffff', 0.8); } g.restore();
  rr(g, x + 6, y + 6, w - 12, h - 12, 3, null, 'rgba(168,122,36,0.55)', 1);
  for (const ex of [x - 10, x + w - 4]) { const rg = g.createLinearGradient(ex, 0, ex + 14, 0); rg.addColorStop(0, '#2c160c'); rg.addColorStop(0.5, '#7a4428'); rg.addColorStop(1, '#2c160c'); rr(g, ex, y - 8, 14, h + 16, 6, rg, '#1a0c06', 1.4); for (const ey of [y - 12, y + h + 4]) rr(g, ex - 1, ey, 16, 8, 3, foil(g, ex, ex + 16), '#3a200c', 1); }
  line(g, [x - 3, y + h / 2, x - 16, y + h / 2 + 18], '#b8322a', 2.2); ell(g, x - 17, y + h / 2 + 22, 3, 5, '#b8322a', '#5a120c', 0.8);
}

// 걸린 현판: 짙은 옻칠 판에 금박 글자와 귀장식
export function hangSign(g, cx, y, label, o = {}) {
  const w = o.w || 300, h = o.h || 56, x = cx - w / 2;
  if (o.rope !== false) for (const s of [-1, 1]) line(g, [cx + s * (w * 0.32), y - 18, cx + s * (w * 0.32), y + 4], '#2a1a10', 2.2);
  rr(g, x + 3, y + 6, w, h, 8, 'rgba(6,4,10,0.5)');
  const wg = g.createLinearGradient(0, y, 0, y + h); wg.addColorStop(0, '#2a1a20'); wg.addColorStop(1, '#120a10'); rr(g, x, y, w, h, 8, wg, '#000', 2);
  rr(g, x + 4, y + 4, w - 8, h - 8, 6, null, foil(g, x, x + w), 2); rr(g, x + 8, y + 8, w - 16, h - 16, 4, null, 'rgba(243,210,124,0.35)', 1);
  for (const s of [-1, 1]) { const ex = cx + s * (w / 2 - 14); poly(g, [ex - 5, y + h / 2, ex, y + h / 2 - 5, ex + 5, y + h / 2, ex, y + h / 2 + 5], '#d8a944', '#3a200c', 0.8); }
  goldText(g, label, cx, y + h / 2 + 1, { size: o.size || 26, maxW: w - 60, glowCol: 'rgba(255,200,110,0.4)' });
}

// 말풍선: 인형 머리 위에 뜨는 한지 쪽지. (x, y) = 말하는 이의 머리 위, k = 0→1 로 톡 튀어나온다
export function bubble(g, x, y, s, k = 1) {
  g.save(); g.font = `700 16px ${FONT}`;
  const lines = []; let cur = ''; for (const w of s.split(' ')) { const t = cur ? cur + ' ' + w : w; if (cur && g.measureText(t).width > 250) { lines.push(cur); cur = w; } else cur = t; } lines.push(cur);
  const w = Math.max(...lines.map(l => g.measureText(l).width)) + 28, h = lines.length * 21 + 15, bx = clamp(x - w / 2, 10, 1270 - w), by = y - h - 11, tx = clamp(x, bx + 14, bx + w - 14);
  g.translate(tx, y); g.scale(k, k); g.translate(-tx, -y); g.globalAlpha *= Math.min(1, k * 1.4);
  const shape = (dx, dy) => { g.beginPath(); rrPath(g, bx + dx, by + dy, w, h, 9); g.moveTo(tx - 7 + dx, by + h - 1 + dy); g.lineTo(tx + dx, y + dy); g.lineTo(tx + 7 + dx, by + h - 1 + dy); g.closePath(); };
  shape(2, 3); g.fillStyle = 'rgba(40,28,16,0.24)'; g.fill();
  shape(0, 0); g.fillStyle = '#fdf8ea'; g.fill(); st(g, INK, 1.8); g.fillStyle = '#fdf8ea'; g.fillRect(tx - 5.6, by + h - 2.4, 11.2, 3);
  lines.forEach((l, i) => text(g, l, bx + w / 2, by + 18.5 + i * 21, { size: 16 }));
  g.restore();
}

export const icon = {
  banner(g, x, y, col, flip, s = 1) { line(g, [x, y + 26 * s, x, y - 26 * s], INK, 4.5 * s); line(g, [x, y + 26 * s, x, y - 26 * s], '#7a5a40', 2.4 * s); const d = (flip ? -1 : 1) * s; path(g, p => { p.moveTo(x, y - 24 * s); p.lineTo(x + d * 30, y - 22 * s); p.lineTo(x + d * 24, y - 12 * s); p.lineTo(x + d * 30, y - 2 * s); p.lineTo(x, y); p.closePath(); }, col, INK, 1.6 * s); },
  flag(g, x, y, s = 1, col = INDIGO) { line(g, [x, y + 12 * s, x, y - 14 * s], INK, 3.4 * s); line(g, [x, y + 12 * s, x, y - 14 * s], '#7a5a40', 1.8 * s); poly(g, [x, y - 14 * s, x + 15 * s, y - 10.5 * s, x, y - 6 * s], col, INK, 1.3 * s); },
  // 엽전: 둥근 테에 네모 구멍. 꺼진 것은 빈 자리로 그린다
  coin(g, x, y, r, on = true) {
    if (!on) { ell(g, x, y, r, r, 'rgba(6,10,22,0.45)', 'rgba(154,166,196,0.5)', Math.max(1, r * 0.09)); rr(g, x - r * 0.3, y - r * 0.3, r * 0.6, r * 0.6, 1, null, 'rgba(154,166,196,0.38)', 1); return; }
    const lw = Math.max(1.1, r * 0.1);
    ell(g, x, y, r, r, '#e4b54c', INK, lw);
    g.save(); g.beginPath(); g.arc(x, y, r - lw * 0.5, 0, TAU); g.clip(); g.fillStyle = 'rgba(128,74,10,0.3)'; g.beginPath(); g.rect(x - r, y - r, r * 2, r * 2); g.arc(x - r * 0.2, y - r * 0.24, r * 0.98, 0, TAU, true); g.fill('evenodd'); g.restore();
    if (r >= 9) ell(g, x, y, r * 0.74, r * 0.74, null, 'rgba(122,78,18,0.5)', Math.max(0.7, r * 0.06));
    rr(g, x - r * 0.3, y - r * 0.3, r * 0.6, r * 0.6, r * 0.06, '#6f4a14', INK, Math.max(0.7, r * 0.07));
    g.beginPath(); g.arc(x, y, r * 0.86, Math.PI * 1.06, Math.PI * 1.5); st(g, 'rgba(255,246,208,0.85)', Math.max(0.8, r * 0.09));
  },
  sack(g, x, y, s = 1) { path(g, p => { p.moveTo(x - 9 * s, y + 10 * s); p.quadraticCurveTo(x - 13 * s, y - 2 * s, x - 5 * s, y - 7 * s); p.lineTo(x + 5 * s, y - 7 * s); p.quadraticCurveTo(x + 13 * s, y - 2 * s, x + 9 * s, y + 10 * s); p.closePath(); }, '#d9c39a', INK, 1.5 * s); poly(g, [x - 5 * s, y - 7 * s, x - 7 * s, y - 13 * s, x + 7 * s, y - 13 * s, x + 5 * s, y - 7 * s], '#d9c39a', INK, 1.4 * s); line(g, [x - 5.5 * s, y - 7 * s, x + 5.5 * s, y - 7 * s], RED, 2 * s); },
  star(g, x, y, r, col = OCHRE) { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.46 : r; g[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * q, y + Math.sin(a) * q); } g.closePath(); fs(g, col, INK, Math.max(1, r * 0.14)); },
  menu(g, x, y) { for (const dy of [-8, 0, 8]) line(g, [x - 13, y + dy, x + 13, y + dy], INK, 3.4); },
  pause(g, x, y) { rr(g, x - 9, y - 11, 6.5, 22, 2, INK); rr(g, x + 2.5, y - 11, 6.5, 22, 2, INK); },
  sound(g, x, y, on = true) { poly(g, [x - 12, y - 5, x - 5, y - 5, x + 3, y - 12, x + 3, y + 12, x - 5, y + 5, x - 12, y + 5], INK); if (on) { g.beginPath(); g.arc(x + 4, y, 8, -0.8, 0.8); st(g, INK, 2.6); g.beginPath(); g.arc(x + 4, y, 13.5, -0.8, 0.8); st(g, INK, 2.6); } else { line(g, [x + 8, y - 6, x + 17, y + 6], RED, 3); line(g, [x + 17, y - 6, x + 8, y + 6], RED, 3); } },
  check(g, x, y, s, ok) { if (ok) line(g, [x - 8 * s, y, x - 2 * s, y + 7 * s, x + 9 * s, y - 8 * s], TEAL, 4 * s); else { line(g, [x - 7 * s, y - 7 * s, x + 7 * s, y + 7 * s], '#a9a394', 3.4 * s); line(g, [x + 7 * s, y - 7 * s, x - 7 * s, y + 7 * s], '#a9a394', 3.4 * s); } },
  heart(g, x, y, s) { path(g, p => { p.moveTo(x, y + 9 * s); p.bezierCurveTo(x - 15 * s, y - 2 * s, x - 9 * s, y - 13 * s, x, y - 5 * s); p.bezierCurveTo(x + 9 * s, y - 13 * s, x + 15 * s, y - 2 * s, x, y + 9 * s); }, RED, INK, 1.4 * s); },
  blade(g, x, y, s) { g.save(); g.translate(x, y); g.rotate(0.7); path(g, p => { p.moveTo(-2.4 * s, 4 * s); p.quadraticCurveTo(-1.5 * s, -8 * s, 4 * s, -15 * s); p.quadraticCurveTo(3 * s, -6 * s, 2.6 * s, 4 * s); p.closePath(); }, '#e4e8ea', INK, 1.3 * s); rr(g, -5 * s, 3.4 * s, 10 * s, 3 * s, 1, OCHRE, INK, 1.1 * s); line(g, [0, 6.5 * s, 0, 13 * s], '#5a3a26', 3 * s); g.restore(); },
  people(g, x, y, s, col = INDIGO) { ell(g, x, y - 6 * s, 5 * s, 5 * s, '#f1cfa4', INK, 1.3 * s); path(g, p => { p.moveTo(x - 8 * s, y + 10 * s); p.quadraticCurveTo(x - 7 * s, y - 1 * s, x, y - 1 * s); p.quadraticCurveTo(x + 7 * s, y - 1 * s, x + 8 * s, y + 10 * s); p.closePath(); }, col, INK, 1.3 * s); },
};
