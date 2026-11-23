// 장면이 바뀔 때: 인형극 무대의 막이 양옆에서 닫혔다가 새 마당 위에서 다시 열린다.
// 쪽물 들인 무명 휘장(주름이 진 두꺼운 막) · 위의 가림막(색동 띠와 오방색 술) · 다 닫히면 가운데에 금빛 매듭이 내려온다.
import { TAU, INK, makeCanvas, line, ell, path, rr } from './draw.js';

const OBANG = ['#c8402f', '#2f4d7e', '#e0b23c', '#f6efdc', '#2b2a30'], SAEK = ['#c8402f', '#e0b23c', '#3f6b5c', '#f6efdc', '#2f4d7e', '#d98aa0'];
let TEX = null;
// 휘장 한 폭의 주름 결: 세로로 밝고 어두운 골이 번갈아 지고, 아래로 갈수록 조금 짙다 (한 번만 굽는다)
function curtainTex(W, H) {
  if (TEX && TEX.H === H) return TEX.c;
  const w = 720, c = makeCanvas(w, H), g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, w, 0), n = 11;
  for (let i = 0; i <= n; i++) { const t = i / n; gr.addColorStop(Math.min(1, t), i % 2 ? '#1a2646' : '#33497c'); if (i < n) gr.addColorStop(Math.min(1, t + 0.5 / n), '#26375f'); }
  g.fillStyle = gr; g.fillRect(0, 0, w, H);
  const v = g.createLinearGradient(0, 0, 0, H); v.addColorStop(0, 'rgba(255,255,255,0.06)'); v.addColorStop(0.6, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.28)'); g.fillStyle = v; g.fillRect(0, 0, w, H);
  // 무명의 결: 세로로 가는 실 자국을 옅게
  for (let i = 0; i < 260; i++) { const x = Math.random() * w; g.globalAlpha = 0.03 + Math.random() * 0.04; g.fillStyle = Math.random() < 0.5 ? '#ffffff' : '#000000'; g.fillRect(x, 0, 1, H); } g.globalAlpha = 1;
  // 아랫단 위의 금실 구름무늬
  g.strokeStyle = 'rgba(214,166,64,0.55)'; g.lineWidth = 2;
  for (let x = 40; x < w; x += 120) { const y = H - 66; g.beginPath(); g.arc(x, y, 12, Math.PI * 0.9, Math.PI * 2.1); g.stroke(); g.beginPath(); g.arc(x + 20, y + 2, 9, Math.PI * 1.0, Math.PI * 2.2); g.stroke(); g.beginPath(); g.arc(x - 18, y + 4, 7, Math.PI * 1.1, Math.PI * 2.0); g.stroke(); g.beginPath(); g.moveTo(x - 30, y + 8); g.quadraticCurveTo(x, y + 16, x + 34, y + 8); g.stroke(); }
  // 아랫단: 금실로 두른 띠
  g.fillStyle = '#c9962e'; g.fillRect(0, H - 34, w, 5); g.fillStyle = '#7a5a1c'; g.fillRect(0, H - 29, w, 2); g.fillStyle = '#8a2a26'; g.fillRect(0, H - 27, w, 9); g.fillStyle = '#c9962e'; g.fillRect(0, H - 18, w, 3);
  TEX = { c, H }; return c;
}
// k: 0(열림) → 1(닫힘). T: 시각(휘장이 살짝 흔들린다)
export function stageWipe(g, k, W, H, T = 0) {
  if (k <= 0) return;
  const e = k * k * (3 - 2 * k), half = W / 2 + 26, cw = half * e, tex = curtainTex(W, H), vh = 62, vy = -vh * (1 - Math.min(1, e * 1.6));
  g.save();
  // 막 뒤 무대는 어두워진다
  g.fillStyle = `rgba(8,6,14,${0.45 * e})`; g.fillRect(0, 0, W, H);
  for (const s of [-1, 1]) {
    const edge = s < 0 ? 0 : W, inner = edge - s * cw, wob = y => Math.sin(y * 0.018 + T * 2 + s) * 7 * (1 - e * 0.6) + Math.sin(y * 0.05 + T * 3) * 2;
    // 그림자: 막 안쪽 가장자리 아래로 진 짙은 그늘
    g.save(); g.globalAlpha = 0.45 * e; g.fillStyle = '#000'; g.beginPath(); g.moveTo(edge, 0); for (let y = 0; y <= H; y += 24) g.lineTo(inner + wob(y) + s * 14, y); g.lineTo(edge, H); g.closePath(); g.fill(); g.restore();
    // 휘장: 주름 결을 안쪽 가장자리에 붙여 함께 움직인다
    g.save(); g.beginPath(); g.moveTo(edge, 0); for (let y = 0; y <= H; y += 18) g.lineTo(inner + wob(y), y); g.lineTo(edge, H); g.closePath(); g.clip();
    const tx = s < 0 ? inner - 720 : inner; for (let ox = tx; s < 0 ? ox + 720 > -10 : ox < W + 10; ox += s < 0 ? -720 : 720) g.drawImage(tex, ox, 0);
    // 안쪽 가장자리의 볕: 겹쳐 접힌 단이 빛을 받는다
    const lg = g.createLinearGradient(inner, 0, inner + s * 60, 0); lg.addColorStop(0, 'rgba(160,190,240,0.25)'); lg.addColorStop(1, 'rgba(160,190,240,0)'); g.fillStyle = lg; g.fillRect(Math.min(inner, inner + s * 60), 0, 60, H);
    g.restore();
    // 안쪽 가장자리의 금실 단
    g.save(); g.lineJoin = 'round'; g.beginPath(); for (let y = 0; y <= H; y += 18) { const x = inner + wob(y) - s * 3; y ? g.lineTo(x, y) : g.moveTo(x, y); } g.strokeStyle = '#2a1a10'; g.lineWidth = 7; g.stroke(); g.strokeStyle = '#d6a640'; g.lineWidth = 4; g.stroke(); g.strokeStyle = 'rgba(255,240,200,0.6)'; g.lineWidth = 1.2; g.stroke(); g.restore();
  }
  // 위의 가림막: 짙은 쪽빛 단에 색동 띠, 오방색 술
  g.save(); g.translate(0, vy);
  rr(g, -10, -8, W + 20, vh + 8, 3, '#1c2948', INK, 2); g.fillStyle = 'rgba(201,214,240,0.14)'; g.fillRect(-6, -4, W + 12, 6);
  { const bw = 22, by = vh - 16, m = Math.ceil((W + 20) / bw); for (let i = 0; i < m; i++) { g.fillStyle = SAEK[i % SAEK.length]; g.fillRect(-10 + i * bw, by, bw, 10); } g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(-10, by + 8, W + 20, 2); }
  const n = 15; for (let i = 0; i < n; i++) { const cx = W * (i + 0.5) / n, cy = vh - 4, sw = Math.sin(T * 2.4 + i) * 2.4, col = OBANG[i % 3]; line(g, [cx, cy, cx + sw * 0.3, cy + 9], INK, 2.4); ell(g, cx + sw * 0.4, cy + 12, 4.4, 4.4, col, INK, 1.2); path(g, p => { p.moveTo(cx - 4 + sw * 0.4, cy + 14); p.lineTo(cx - 5 + sw, cy + 34); p.lineTo(cx + 5 + sw, cy + 34); p.lineTo(cx + 4 + sw * 0.4, cy + 14); p.closePath(); }, col, INK, 1); }
  g.restore();
  // 다 닫히면: 막 가운데로 무대 조명이 모이고, 금빛 매듭과 술이 내려와 막간을 알린다
  const kk = Math.max(0, (e - 0.82) / 0.18);
  if (kk > 0) { g.save(); g.globalCompositeOperation = 'lighter'; const sp = g.createRadialGradient(W / 2, H * 0.42, 20, W / 2, H * 0.42, W * 0.42); sp.addColorStop(0, `rgba(255,214,150,${0.16 * kk})`); sp.addColorStop(1, 'rgba(255,214,150,0)'); g.fillStyle = sp; g.fillRect(0, 0, W, H); g.restore(); }
  if (kk > 0) { const cx = W / 2, y0 = vh + vy, drop = 70 * (1 - (1 - kk) * (1 - kk)); g.save(); g.globalAlpha = kk;
    line(g, [cx, y0, cx, y0 + drop], INK, 3.4); line(g, [cx, y0, cx, y0 + drop], '#c9962e', 1.8);
    const ky = y0 + drop + 18; for (const [dx, dy, r] of [[0, -10, 9], [-11, 0, 8], [11, 0, 8], [0, 10, 9]]) { ell(g, cx + dx, ky + dy, r, r, '#b8322a', INK, 1.4); ell(g, cx + dx - r * 0.3, ky + dy - r * 0.3, r * 0.35, r * 0.35, 'rgba(255,220,200,0.5)'); }
    ell(g, cx, ky, 7, 7, '#e0b23c', INK, 1.4);
    for (let j = -3; j <= 3; j++) { const sw = Math.sin(T * 3 + j) * 1.4; line(g, [cx + j * 2.2, ky + 18, cx + j * 3.2 + sw, ky + 64], j % 2 ? '#e0b23c' : '#c8402f', 2.4); }
    g.restore(); }
  g.restore();
}
