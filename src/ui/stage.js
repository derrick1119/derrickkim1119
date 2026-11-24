// 인형극 무대의 틀: 장소 장면(장터·주막·대장간·무당집 …)을 무대 안쪽에 내건 걸개그림으로 삼는다.
// 위에는 단청 들보와 붉은 휘장·오방색 술, 양옆엔 석간주 기둥과 걷어 묶은 쪽빛 막, 아래엔 무대 앞판과 발치 등잔,
// 그 앞에는 구경꾼들의 뒷모습(갓·상투·댕기·쪽진 머리·아이)이 등불 빛에 테두리만 밝게 앉아 있다.
// 그리는 차례: 장면 → 인형(stagePuppet) → stageFront → 단추·이름판 → (막이 걷히는 동안만) stageCurtain
import { W, H } from '../config.js';
import { TAU, makeCanvas, clamp } from '../render/draw.js';
import { puppet } from './theater.js';
import { GFX } from '../pixel/gfx.js';
import { pxStageFront, pxStageCurtain, pxRod } from '../pixel/stage.js';

export const APRON = 688;                      // 무대 앞판 윗면: 막대 인형의 막대는 이 뒤로 내려간다
export const OPEN_T = 0.6;                     // 막이 걷히는 데 걸리는 시간
const S = 1.5, PIL = 22, LIN = 30, TIE = 404;  // 기둥 너비 · 들보 높이 · 막을 묶은 높이
const CLOTH = '#2f426b', CLOTHD = '#18223c', CLOTHL = '#5a74a8', GOLD = '#d6a640', GOLDL = '#f3d27a';
const OBANG = ['#c8402f', '#2f4d7e', '#e0b23c', '#f6efdc', '#3f6b5c'];
const SAEK = ['#c8402f', '#e0b23c', '#3f6b5c', '#f6efdc', '#2f4d7e', '#d98aa0'];
const ease = k => k * k * (3 - 2 * k);
export const openOf = t => ease(clamp(t / OPEN_T, 0, 1));

// ── 한 번 굽는 틀: 무대 앞판 · 기둥 · 들보 · 휘장 ──
let FR = null;
function frameArt() {
  if (FR) return FR;
  const c = makeCanvas(W * S, H * S), g = c.getContext('2d'); g.scale(S, S);
  apronBoard(g);
  for (const x of [0, W - PIL]) pillar(g, x);
  valance(g);
  lintel(g);
  FR = c; return c;
}
// 무대 앞판: 윗전에 빛이 맺히고, 앞면엔 붉은·푸른 마름모 단청과 놋쇠 못
function apronBoard(g) {
  const y = APRON, gr = g.createLinearGradient(0, y, 0, H);
  gr.addColorStop(0, '#7a4a2c'); gr.addColorStop(0.25, '#5a3420'); gr.addColorStop(1, '#2a160c');
  g.fillStyle = gr; g.fillRect(0, y, W, H - y);
  g.fillStyle = '#1a0e08'; g.fillRect(0, y - 1, W, 2);
  g.fillStyle = '#c08a52'; g.fillRect(0, y + 1, W, 2.4);                     // 윗전에 맺힌 빛
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, y + 6, W, 1.4);
  const n = 22;
  for (let i = 0; i < n; i++) {
    const cx = (i + 0.5) * W / n, cy = y + 19;
    g.fillStyle = 'rgba(20,10,6,0.55)'; dia(g, cx, cy + 1, 15, 8.4);
    g.fillStyle = i % 2 ? '#3f6b5c' : '#8a2a26'; dia(g, cx, cy, 14, 7.6);
    g.fillStyle = 'rgba(246,239,220,0.8)'; dia(g, cx, cy, 6, 3.2);
    g.fillStyle = i % 2 ? '#e0b23c' : '#2f4d7e'; dia(g, cx, cy, 3.4, 1.9);
    if (i < n - 1) { const sx = (i + 1) * W / n; g.fillStyle = '#e0b860'; g.beginPath(); g.arc(sx, cy, 2.2, 0, TAU); g.fill(); g.fillStyle = 'rgba(40,20,8,0.6)'; g.beginPath(); g.arc(sx + 0.6, cy + 0.6, 1, 0, TAU); g.fill(); }
  }
}
const dia = (g, x, y, rx, ry) => { g.beginPath(); g.moveTo(x - rx, y); g.lineTo(x, y - ry); g.lineTo(x + rx, y); g.lineTo(x, y + ry); g.closePath(); g.fill(); };
// 석간주 칠한 둥근 기둥: 가운데가 밝고 가장자리가 어둡다. 머리에는 단청 띠(주의초)
function pillar(g, x) {
  const gr = g.createLinearGradient(x, 0, x + PIL, 0);
  gr.addColorStop(0, '#3a140e'); gr.addColorStop(0.35, '#8a3a2a'); gr.addColorStop(0.55, '#a24a34'); gr.addColorStop(1, '#3a140e');
  g.fillStyle = gr; g.fillRect(x, 0, PIL, APRON);
  g.fillStyle = 'rgba(255,220,180,0.25)'; g.fillRect(x + PIL * 0.42, LIN + 50, 2, APRON - LIN - 60);
  g.fillStyle = '#140806'; g.fillRect(x - 0.5, 0, 1.2, APRON); g.fillRect(x + PIL - 0.7, 0, 1.2, APRON);
  // 주의초: 초록 · 흰 분선 · 붉은 띠 · 쪽빛 · 노랑 꽃잎 줄
  const bands = [['#3f7a6a', 12], ['#f6efdc', 2], ['#c8402f', 7], ['#f6efdc', 2], ['#2f4d7e', 8], ['#e0b23c', 4], ['#f6efdc', 2], ['#3f7a6a', 6]];
  let y = LIN; for (const [col, h] of bands) { g.fillStyle = col; g.fillRect(x, y, PIL, h); y += h; }
  for (let k = 0; k < 3; k++) { g.fillStyle = k === 1 ? '#c8402f' : '#e0b23c'; g.beginPath(); g.ellipse(x + PIL / 2, LIN + 26 + k * 0.2, 3.4, 5.5, 0, 0, TAU); g.fill(); }
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x, y, PIL, 5);
}
// 휘장: 들보 아래로 늘어진 붉은 비단 열두 자락. 금실 테두리, 자락 사이마다 매듭과 오방색 술
function valance(g) {
  const n = 12, top = LIN - 2, hang = LIN + 14, dip = LIN + 30, sw = W / n;
  const shape = () => { g.beginPath(); g.moveTo(0, top); g.lineTo(W, top); g.lineTo(W, hang); for (let i = n - 1; i >= 0; i--) { const x0 = (i + 1) * sw, x1 = i * sw; g.quadraticCurveTo((x0 + x1) / 2, dip + 14, x1, hang); } g.closePath(); };
  g.save(); g.shadowColor = 'rgba(0,0,0,0.55)'; g.shadowBlur = 14; g.shadowOffsetY = 6; shape(); g.fillStyle = '#6a1822'; g.fill(); g.restore();
  const gr = g.createLinearGradient(0, top, 0, dip + 8); gr.addColorStop(0, '#5a121c'); gr.addColorStop(0.5, '#9a2a34'); gr.addColorStop(1, '#6a1822');
  shape(); g.fillStyle = gr; g.fill();
  // 자락마다 주름 (가운데로 모인다)
  for (let i = 0; i < n; i++) {
    const x0 = i * sw, mx = x0 + sw / 2;
    for (let k = 1; k < 5; k++) { const fx = x0 + sw * k / 5, d = 1 - Math.abs(fx - mx) / (sw / 2), by = hang + (dip - hang + 7) * d; g.strokeStyle = 'rgba(30,4,10,0.45)'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(fx, top + 4); g.quadraticCurveTo((fx + mx) / 2, (top + by) / 2, fx + (mx - fx) * 0.15, by - 2); g.stroke(); g.strokeStyle = 'rgba(255,170,170,0.16)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(fx + 3, top + 4); g.quadraticCurveTo((fx + mx) / 2 + 3, (top + by) / 2, fx + (mx - fx) * 0.15 + 3, by - 3); g.stroke(); }
  }
  // 금실 테두리
  g.beginPath(); g.moveTo(0, hang); for (let i = 0; i < n; i++) { const x0 = i * sw, x1 = (i + 1) * sw; g.quadraticCurveTo((x0 + x1) / 2, dip + 14, x1, hang); }
  g.strokeStyle = '#2a1006'; g.lineWidth = 5; g.stroke(); g.strokeStyle = GOLD; g.lineWidth = 3; g.stroke(); g.strokeStyle = 'rgba(255,240,190,0.7)'; g.lineWidth = 1; g.stroke();
  // 위쪽 색동 띠
  { const bw = 16, by = top + 2, m = Math.ceil(W / bw); for (let i = 0; i < m; i++) { g.fillStyle = SAEK[i % SAEK.length]; g.fillRect(i * bw, by, bw, 5); } g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, by + 5, W, 1.5); }
  // 매듭과 술
  for (let i = 1; i < n; i++) {
    const x = i * sw, col = OBANG[i % 4 === 3 ? 4 : i % 4], y = hang;
    g.strokeStyle = '#2a1006'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(x, y - 2); g.lineTo(x, y + 8); g.stroke();
    g.fillStyle = '#2a1006'; dia(g, x, y + 12, 6.4, 6.4); g.fillStyle = col; dia(g, x, y + 12, 5, 5); g.fillStyle = 'rgba(255,255,255,0.35)'; dia(g, x - 1.4, y + 10.6, 1.8, 1.8);
    g.fillStyle = GOLD; g.fillRect(x - 3, y + 17, 6, 3);
    const tl = 20; g.fillStyle = '#2a1006'; g.beginPath(); g.moveTo(x - 4.4, y + 19); g.lineTo(x + 4.4, y + 19); g.lineTo(x + 6, y + 20 + tl); g.lineTo(x - 6, y + 20 + tl); g.closePath(); g.fill();
    g.fillStyle = col; g.beginPath(); g.moveTo(x - 3.4, y + 20); g.lineTo(x + 3.4, y + 20); g.lineTo(x + 4.8, y + 19 + tl); g.lineTo(x - 4.8, y + 19 + tl); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 0.8; for (const dx of [-2.4, 0, 2.4]) { g.beginPath(); g.moveTo(x + dx * 0.7, y + 22); g.lineTo(x + dx, y + 18 + tl); g.stroke(); }
  }
}
// 단청 들보: 뇌록 바탕에 먹선과 흰 분선, 사이사이 머리초(연꽃과 양옆으로 번지는 휘)
function lintel(g) {
  const gr = g.createLinearGradient(0, 0, 0, LIN); gr.addColorStop(0, '#5a9a86'); gr.addColorStop(0.45, '#3a7564'); gr.addColorStop(1, '#1f4238');
  g.fillStyle = gr; g.fillRect(0, 0, W, LIN);
  g.fillStyle = '#0e1a16'; g.fillRect(0, LIN - 2, W, 2.4); g.fillRect(0, 0, W, 1.6);
  g.fillStyle = 'rgba(246,239,220,0.9)'; g.fillRect(0, 3.4, W, 1.2); g.fillRect(0, LIN - 5, W, 1.2);
  const cy = LIN / 2;
  for (let x = 106; x < W; x += 214) {
    for (const s of [-1, 1]) {
      ['#1e3a6a', '#2f5a9e', '#6f96d0', '#b8cdee', '#f6efdc'].forEach((col, k) => { g.fillStyle = col; g.beginPath(); g.ellipse(x + s * (17 + k * 5.4), cy, 3, 9.2 - k * 0.3, 0, 0, TAU); g.fill(); });
      ['#8a1f1c', '#c8402f', '#ec8a76', '#f6efdc'].forEach((col, k) => { g.fillStyle = col; g.beginPath(); g.ellipse(x + s * (48 + k * 5), cy, 2.6, 8 - k * 0.3, 0, 0, TAU); g.fill(); });
      g.fillStyle = '#e0b23c'; g.beginPath(); g.ellipse(x + s * 72, cy, 2.4, 6, 0, 0, TAU); g.fill();
    }
    for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; g.fillStyle = '#c8402f'; g.beginPath(); g.ellipse(x + Math.cos(a) * 7.6, cy + Math.sin(a) * 7.6, 4.2, 2.6, a, 0, TAU); g.fill(); }
    g.fillStyle = '#f6efdc'; g.beginPath(); g.arc(x, cy, 6.8, 0, TAU); g.fill();
    g.fillStyle = '#e0b23c'; g.beginPath(); g.arc(x, cy, 4.6, 0, TAU); g.fill();
    g.fillStyle = '#3f7a6a'; g.beginPath(); g.arc(x, cy, 1.9, 0, TAU); g.fill();
  }
  // 들보 아래로 드리운 그늘
  const sh = g.createLinearGradient(0, LIN, 0, LIN + 10); sh.addColorStop(0, 'rgba(0,0,0,0.45)'); sh.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sh; g.fillRect(0, LIN, W, 10);
}

// ── 막: 쪽물 들인 무명. open 0 = 가운데에서 맞닿음 → 1 = 양옆으로 걷어 오방색 끈으로 묶음 ──
const gathered = y => y < TIE ? 44 + 58 * Math.pow(1 - clamp((y - LIN) / (TIE - LIN), 0, 1), 1.5) : 44 + 40 * Math.sqrt(clamp((y - TIE) / (APRON - TIE), 0, 1));
function curtain(g, side, e, t) {
  const ix = y => { const gx = gathered(y), w0 = W / 2 + 8, base = w0 + (gx - w0) * e, sway = Math.sin(y * 0.018 + t * 1.2 + side) * (2 + 6 * (1 - e)) * (1 - Math.abs(e - 0.5)); return base + sway; };
  const X = x => side < 0 ? x : W - x, ys = []; for (let y = LIN - 4; y <= APRON + 2; y += 12) ys.push(y); ys[ys.length - 1] = APRON + 2;
  // 바탕: 바깥은 어둡고 안쪽 끝은 무대 불빛에 밝다
  const wMax = Math.max(...ys.map(ix)), gr = g.createLinearGradient(X(PIL - 4), 0, X(wMax), 0);
  gr.addColorStop(0, CLOTHD); gr.addColorStop(0.55, CLOTH); gr.addColorStop(0.92, CLOTHL); gr.addColorStop(1, '#2a3a60');
  g.beginPath(); g.moveTo(X(PIL - 4), LIN - 4); for (const y of ys) g.lineTo(X(ix(y)), y); g.lineTo(X(PIL - 4), APRON + 2); g.closePath(); g.fillStyle = gr; g.fill();
  // 주름: 안쪽 끝을 따라 휘는 골과 등
  for (let j = 1; j < 7; j++) {
    const q = j / 7, fx = y => PIL - 4 + (ix(y) - PIL + 4) * q;
    g.beginPath(); ys.forEach((y, i) => i ? g.lineTo(X(fx(y)), y) : g.moveTo(X(fx(y)), y)); g.strokeStyle = 'rgba(8,12,28,0.55)'; g.lineWidth = 4 + 3 * e; g.stroke();
    g.beginPath(); ys.forEach((y, i) => i ? g.lineTo(X(fx(y) + 5), y) : g.moveTo(X(fx(y) + 5), y)); g.strokeStyle = 'rgba(170,196,240,0.16)'; g.lineWidth = 2; g.stroke();
  }
  // 아랫단의 색동 띠
  { g.save(); g.beginPath(); g.moveTo(X(PIL - 4), APRON - 20); g.lineTo(X(ix(APRON - 20)), APRON - 20); g.lineTo(X(ix(APRON)), APRON); g.lineTo(X(PIL - 4), APRON); g.closePath(); g.clip(); const x0 = Math.min(X(PIL - 4), X(ix(APRON))), x1 = Math.max(X(PIL - 4), X(ix(APRON))); for (let k = 0, x = x0; x < x1; x += 10, k++) { g.fillStyle = SAEK[k % SAEK.length]; g.fillRect(x, APRON - 20, 10, 20); } g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x0, APRON - 20, x1 - x0, 2); g.restore(); }
  // 안쪽 끝의 금실 단
  g.beginPath(); ys.forEach((y, i) => i ? g.lineTo(X(ix(y)), y) : g.moveTo(X(ix(y)), y)); g.strokeStyle = '#120a04'; g.lineWidth = 6; g.stroke(); g.strokeStyle = GOLD; g.lineWidth = 3.4; g.stroke(); g.strokeStyle = 'rgba(255,244,200,0.6)'; g.lineWidth = 1; g.stroke();
  // 묶은 끈: 막이 다 걷힐 즈음 나타난다
  const k = clamp((e - 0.88) / 0.12, 0, 1);
  if (k > 0) {
    g.save(); g.globalAlpha = k; const tx = ix(TIE) + 4, y = TIE;
    g.lineCap = 'round'; g.strokeStyle = '#2a0a06'; g.lineWidth = 8; g.beginPath(); g.moveTo(X(PIL - 2), y - 10); g.quadraticCurveTo(X((PIL + tx) / 2), y + 6, X(tx), y - 2); g.stroke();
    g.strokeStyle = '#c8402f'; g.lineWidth = 5; g.stroke(); g.strokeStyle = '#e0b23c'; g.lineWidth = 1.6; g.setLineDash([4, 5]); g.stroke(); g.setLineDash([]);
    // 매듭과 술
    const kx = X(tx - 2), ky = y + 2; g.fillStyle = '#2a0a06'; dia(g, kx, ky, 9, 9); g.fillStyle = '#2f4d7e'; dia(g, kx, ky, 7, 7); g.fillStyle = '#e0b23c'; dia(g, kx, ky, 3, 3);
    const sw = Math.sin(t * 1.6 + side) * 3;
    g.fillStyle = '#2a0a06'; g.beginPath(); g.moveTo(kx - 5, ky + 8); g.lineTo(kx + 5, ky + 8); g.lineTo(kx + 8 + sw, ky + 40); g.lineTo(kx - 8 + sw, ky + 40); g.closePath(); g.fill();
    g.fillStyle = '#c8402f'; g.beginPath(); g.moveTo(kx - 4, ky + 9); g.lineTo(kx + 4, ky + 9); g.lineTo(kx + 6.6 + sw, ky + 39); g.lineTo(kx - 6.6 + sw, ky + 39); g.closePath(); g.fill();
    g.fillStyle = GOLDL; g.fillRect(kx - 4, ky + 8, 8, 3);
    g.restore();
  }
}

// ── 구경꾼의 뒷모습 ──
// kind: 0 갓 쓴 어른 · 1 댕기 머리 아이 · 2 수건 쓴 아낙 · 3 상투 튼 사내 · 4 패랭이 쓴 장돌뱅이 · 5 쪽진 머리에 비녀 꽂은 아낙
const SIL = '#0f0a10', SIL2 = '#1c141c', RIM = 'rgba(255,214,150,0.92)';
function viewer(g, x, y, s, kind, t, hop) {
  const ph = x * 0.137, bob = Math.sin(t * 1.25 + ph) * 1.3 - hop * Math.abs(Math.sin(t * 9 + ph)) * 12, tilt = Math.sin(t * 0.42 + ph * 1.7) * 0.05 + hop * Math.sin(t * 7 + ph) * 0.08, br = 1 + Math.sin(t * 1.25 + ph) * 0.012;
  const small = kind === 1;
  g.save(); g.translate(x, y + bob); g.scale(s, s * br);
  // 어깨와 등: 아래는 화면 밖으로
  g.fillStyle = SIL; g.beginPath(); const sw = small ? 22 : 30; g.moveTo(-sw - 6, 60); g.quadraticCurveTo(-sw - 4, -4, -8, -10); g.lineTo(8, -10); g.quadraticCurveTo(sw + 4, -4, sw + 6, 60); g.closePath(); g.fill();
  g.strokeStyle = RIM; g.lineWidth = 1.3; g.beginPath(); g.moveTo(-sw + 2, 6); g.quadraticCurveTo(-sw + 4, -6, -9, -9); g.stroke(); g.beginPath(); g.moveTo(sw - 2, 6); g.quadraticCurveTo(sw - 4, -6, 9, -9); g.stroke();
  g.rotate(tilt);
  const hr = small ? 10.5 : 12.5, hy = -22;
  g.fillStyle = SIL; g.fillRect(-5, hy + 6, 10, 10);
  if (kind === 1) { g.beginPath(); g.moveTo(-3, hy + 2); g.quadraticCurveTo(-6, hy + 26, -2, hy + 44); g.lineTo(3, hy + 44); g.quadraticCurveTo(0, hy + 26, 3, hy + 2); g.closePath(); g.fill(); g.fillStyle = '#7a1c1a'; g.beginPath(); g.moveTo(-4, hy + 42); g.lineTo(5, hy + 42); g.lineTo(7, hy + 54); g.lineTo(0.5, hy + 50); g.lineTo(-6, hy + 54); g.closePath(); g.fill(); g.fillStyle = SIL; }
  g.beginPath(); g.ellipse(0, hy, hr, hr * 1.06, 0, 0, TAU); g.fill();
  // 머리 꼴
  if (kind === 0) {   // 갓: 넓은 양태와 높은 대우, 갓끈
    g.fillStyle = SIL2; g.beginPath(); g.ellipse(0, hy - 9, 25, 5, 0, 0, TAU); g.fill(); g.fillStyle = SIL;
    g.beginPath(); g.moveTo(-8, hy - 9); g.lineTo(-7, hy - 25); g.quadraticCurveTo(0, hy - 28, 7, hy - 25); g.lineTo(8, hy - 9); g.closePath(); g.fill();
    g.strokeStyle = RIM; g.lineWidth = 1.25; g.beginPath(); g.ellipse(0, hy - 9, 25, 5, 0, Math.PI * 1.08, Math.PI * 1.92); g.stroke(); g.beginPath(); g.moveTo(-7, hy - 24); g.quadraticCurveTo(0, hy - 27.5, 7, hy - 24); g.stroke();
    g.fillStyle = 'rgba(255,210,150,0.5)'; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(-13 + k * 0.6, hy - 2 + k * 4.4, 1.1, 0, TAU); g.fill(); }
  } else if (kind === 2) {   // 수건: 머리를 감싸고 뒤에서 묶었다
    g.fillStyle = '#3a3238'; g.beginPath(); g.ellipse(0, hy - 4, hr + 1.6, hr * 0.8, 0, Math.PI * 1.02, Math.PI * 1.98); g.lineTo(hr, hy + 2); g.lineTo(-hr, hy + 2); g.closePath(); g.fill();
    g.beginPath(); g.ellipse(0, hy + 2, 5, 3.4, 0, 0, TAU); g.fill(); g.beginPath(); g.moveTo(-2, hy + 3); g.lineTo(-7, hy + 14); g.lineTo(-1, hy + 12); g.closePath(); g.fill(); g.beginPath(); g.moveTo(2, hy + 3); g.lineTo(6, hy + 15); g.lineTo(0, hy + 12); g.closePath(); g.fill();
    g.strokeStyle = RIM; g.lineWidth = 1.25; g.beginPath(); g.ellipse(0, hy - 4, hr + 1.6, hr * 0.8, 0, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
  } else if (kind === 3) {   // 상투와 동곳, 망건
    g.beginPath(); g.ellipse(0, hy - hr - 3, 5.4, 6.4, 0, 0, TAU); g.fill(); g.strokeStyle = 'rgba(255,214,150,0.7)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-8, hy - hr - 4); g.lineTo(8, hy - hr - 2); g.stroke();
    g.fillStyle = '#251c24'; g.fillRect(-hr, hy - 6, hr * 2, 4);
    g.strokeStyle = RIM; g.lineWidth = 1.25; g.beginPath(); g.arc(0, hy, hr, -2.5, -0.64); g.stroke(); g.beginPath(); g.arc(0, hy - hr - 3, 5.4, -2.6, -0.5); g.stroke();
  } else if (kind === 4) {   // 패랭이: 대오리로 엮은 둥근 대우에 갓보다 좁은 양태, 옆에 목화송이 (장돌뱅이)
    g.fillStyle = SIL2; g.beginPath(); g.ellipse(0, hy - 7, 19, 4.4, 0, 0, TAU); g.fill(); g.fillStyle = SIL;
    g.beginPath(); g.moveTo(-10.5, hy - 7); g.quadraticCurveTo(-11, hy - 20, 0, hy - 21); g.quadraticCurveTo(11, hy - 20, 10.5, hy - 7); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(255,214,150,0.35)'; g.lineWidth = 0.9; for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(k * 3.6, hy - 8); g.quadraticCurveTo(k * 3.2, hy - 16, k * 2, hy - 20); g.stroke(); }
    g.strokeStyle = RIM; g.lineWidth = 1.25; g.beginPath(); g.ellipse(0, hy - 7, 19, 4.4, 0, Math.PI * 1.08, Math.PI * 1.92); g.stroke(); g.beginPath(); g.moveTo(-10, hy - 10); g.quadraticCurveTo(-10, hy - 20, 0, hy - 20.5); g.quadraticCurveTo(10, hy - 20, 10, hy - 10); g.stroke();
    g.fillStyle = 'rgba(244,236,220,0.9)'; g.beginPath(); g.arc(11, hy - 12, 3.2, 0, TAU); g.fill(); g.beginPath(); g.arc(13.4, hy - 9.6, 2.4, 0, TAU); g.fill();
  } else if (kind === 5) {   // 쪽진 머리: 뒤통수 아래 둥근 쪽에 비녀가 가로로
    g.beginPath(); g.ellipse(0, hy + 7, 8, 6, 0, 0, TAU); g.fill(); g.strokeStyle = 'rgba(232,210,160,0.85)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-15, hy + 6); g.lineTo(15, hy + 7); g.stroke(); g.fillStyle = 'rgba(232,210,160,0.85)'; g.beginPath(); g.arc(15.5, hy + 7, 2, 0, TAU); g.fill();
    g.strokeStyle = RIM; g.lineWidth = 1.25; g.beginPath(); g.arc(0, hy, hr, -2.6, -0.54); g.stroke();
  } else { g.strokeStyle = RIM; g.lineWidth = 1.25; g.beginPath(); g.arc(0, hy, hr, -2.6, -0.54); g.stroke(); }
  g.restore();
}
// 기본 자리: 왼쪽 아래 떠나는 단추와 오른쪽 아래 이름판 사이에 두 줄로 둘러앉는다 [x, 크기, 머리 꼴, 아래로 내림]
// 뒷줄은 작게, 앞줄은 크게 (앞줄이 나중에 그려져 뒷줄을 가린다)
export const SEATS = [
  [372, 1.5, 5, -8], [470, 1.42, 1, -10], [566, 1.55, 3, -8], [676, 1.4, 4, -12], [772, 1.55, 2, -8], [862, 1.46, 0, -10],
  [330, 1.95, 0, 14], [424, 1.85, 3, 18], [522, 2.0, 5, 16], [624, 2.1, 0, 14], [724, 1.8, 1, 20], [822, 2.0, 3, 16],
];

// 무대 앞쪽: 들보 아래 그늘 · 발치 불빛 · (다 걷힌) 막 · 틀 · 등잔 · 구경꾼
// o.open 막이 걷힌 정도 · o.seats 구경꾼 자리 · o.lamps 등잔 x 들 · o.hop 구경꾼이 들썩이는 정도(0~1) · o.dim 가장자리 어둡게
export function stageFront(g, t, o = {}) {
  if (GFX.pixel) { pxStageFront(g, t, Object.assign({}, o, { seats: o.seats || SEATS })); return; }
  const open = o.open === undefined ? 1 : o.open;
  // 무대 안쪽 가장자리를 눌러 가운데로 시선을 모은다
  { const vg = g.createRadialGradient(W / 2, H * 0.5, 320, W / 2, H * 0.52, 800); vg.addColorStop(0, 'rgba(6,4,10,0)'); vg.addColorStop(1, `rgba(6,4,10,${o.dim === undefined ? 0.4 : o.dim})`); g.fillStyle = vg; g.fillRect(0, 0, W, H); }
  { const sh = g.createLinearGradient(0, LIN, 0, LIN + 90); sh.addColorStop(0, 'rgba(8,4,10,0.42)'); sh.addColorStop(1, 'rgba(8,4,10,0)'); g.fillStyle = sh; g.fillRect(0, LIN, W, 90); }
  // 발치 등불이 무대 아래쪽을 데운다
  { g.save(); g.globalCompositeOperation = 'lighter'; const fl = 0.9 + 0.1 * Math.sin(t * 5.3) * Math.sin(t * 3.1), gl = g.createLinearGradient(0, APRON, 0, APRON - 150); gl.addColorStop(0, `rgba(255,180,100,${0.2 * fl})`); gl.addColorStop(1, 'rgba(255,180,100,0)'); g.fillStyle = gl; g.fillRect(PIL, APRON - 150, W - PIL * 2, 150); g.restore(); }
  if (open >= 1) for (const s of [-1, 1]) curtain(g, s, 1, t);
  g.drawImage(frameArt(), 0, 0, W, H);
  for (const x of o.lamps || [336, 866]) lamp(g, x, APRON + 1, t);
  // 구경꾼 뒤로 번지는 무대 빛 (실루엣이 또렷해진다)
  const seats = o.seats || SEATS;
  { g.save(); g.globalCompositeOperation = 'lighter'; for (const [x, s] of seats) { const gr = g.createRadialGradient(x, APRON - 6, 4, x, APRON - 6, 70 * s); gr.addColorStop(0, 'rgba(255,190,120,0.16)'); gr.addColorStop(1, 'rgba(255,190,120,0)'); g.fillStyle = gr; g.fillRect(x - 70 * s, APRON - 76 * s, 140 * s, 140 * s); } g.restore(); }
  for (const [x, s, kind, dy] of seats) viewer(g, x, 716 + (dy || 0), s, kind, t, o.hop || 0);
}
// 막이 걷히는 동안: 단추·이름판까지 모두 덮는 막과 그 위의 틀
export function stageCurtain(g, t, open) {
  if (open >= 1) return;
  if (GFX.pixel) { pxStageCurtain(g, t, open); return; }
  for (const s of [-1, 1]) curtain(g, s, open, t);
  g.drawImage(frameArt(), 0, 0, W, H);
  // 막 사이로 새는 빛
  if (open < 0.2) { g.save(); g.globalCompositeOperation = 'lighter'; const a = 0.4 * (1 - open / 0.2), gr = g.createLinearGradient(W / 2 - 30, 0, W / 2 + 30, 0); gr.addColorStop(0, 'rgba(255,210,140,0)'); gr.addColorStop(0.5, `rgba(255,210,140,${a})`); gr.addColorStop(1, 'rgba(255,210,140,0)'); g.fillStyle = gr; g.fillRect(W / 2 - 30, LIN, 60, APRON - LIN); g.restore(); }
}
// 무대 앞판 위 놋쇠 등잔: 심지 불이 흔들리고 둘레를 데운다
function lamp(g, x, y, t) {
  const f = 0.85 + 0.15 * Math.sin(t * 11 + x) * Math.sin(t * 6.7 + x * 0.3), fh = 11 * f;
  g.save(); g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(x, y - 10, 1, x, y - 10, 46); gr.addColorStop(0, `rgba(255,200,120,${0.5 * f})`); gr.addColorStop(1, 'rgba(255,200,120,0)'); g.fillStyle = gr; g.fillRect(x - 46, y - 56, 92, 92); g.restore();
  g.fillStyle = '#2a1608'; g.beginPath(); g.ellipse(x, y - 1, 11, 4, 0, 0, TAU); g.fill(); g.fillStyle = '#c89a4a'; g.beginPath(); g.ellipse(x, y - 2, 9.6, 3, 0, 0, TAU); g.fill(); g.fillStyle = '#6a4418'; g.beginPath(); g.ellipse(x, y - 2.6, 6.6, 1.6, 0, 0, TAU); g.fill();
  g.fillStyle = '#ff9a3a'; g.beginPath(); g.moveTo(x - 3.2, y - 3); g.quadraticCurveTo(x - 3.6, y - 3 - fh * 0.6, x + Math.sin(t * 9 + x) * 1.2, y - 3 - fh); g.quadraticCurveTo(x + 3.6, y - 3 - fh * 0.6, x + 3.2, y - 3); g.closePath(); g.fill();
  g.fillStyle = '#fff2b8'; g.beginPath(); g.ellipse(x, y - 6, 1.6, 3.4 * f, 0, 0, TAU); g.fill();
}
// 따로 그린 인형(선비 …)을 받친 막대: (x, y) 몸통에서 무대 앞판 뒤로
export function stageRod(g, x, y, s = 1, t = 0) {
  const bx = x + Math.sin(t * 2.1 + x * 0.031) * 1.5, by = APRON + 24;
  if (GFX.pixel) { pxRod(g, x, y, bx, by); return; }
  g.save(); g.lineCap = 'round';
  g.strokeStyle = '#262a36'; g.lineWidth = 4.4 * s; g.beginPath(); g.moveTo(x, y); g.lineTo(bx, by); g.stroke();
  g.strokeStyle = '#9a7440'; g.lineWidth = 2.4 * s; g.stroke();
  g.strokeStyle = 'rgba(255,230,180,0.35)'; g.lineWidth = 0.9 * s; g.beginPath(); g.moveTo(x - 0.8 * s, y + 6 * s); g.lineTo(bx - 0.8 * s, by); g.stroke();
  g.restore();
}
// 막대 인형: 숨 쉬듯 살짝 오르내리고, 막대는 무대 앞판 뒤로 내려간다
export function stagePuppet(g, type, x, y, s, t, o = {}) {
  const b = Math.sin(t * 2.1 + x * 0.031) * 2.2 * (s / 1.7);
  puppet(g, type, x, y + b, s, t, Object.assign({ rodTo: APRON + 24 }, o));
}
