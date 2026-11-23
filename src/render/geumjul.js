// 금줄: 왼새끼로 꼰 짚 새끼줄. 꼰 결이 비스듬히 보이고 지푸라기 끝이 삐죽삐죽 나온다.
// 사이사이에 빨간 고추 · 검은 숯 · 솔가지를 끼우고, 곧은 흰 한지 오리를 드문드문 꽂는다 (지그재그로 접은 종이는 쓰지 않는다)
import { TAU, INK } from './draw.js';

const STRAW = '#c9a862', STRAW_L = '#e6d29a', STRAW_D = '#8a6a32';
// 끼우는 것 하나 (원점 = 새끼줄에 끼운 자리, 아래로 늘어진다). k: 크기
export function hangItem(g, kind, k = 1) {
  g.save(); g.scale(k, k); g.lineJoin = 'round'; g.lineCap = 'round';
  // 끼운 자리를 감은 짚 한 가닥
  g.strokeStyle = STRAW_D; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-3, -1); g.lineTo(3, 1.5); g.stroke();
  if (kind === 'pepper') {   // 말린 빨간 고추: 초록 꼭지에서 가늘게 휘어 내려온다
    g.fillStyle = '#b8281c'; g.beginPath(); g.moveTo(-2.6, 2); g.quadraticCurveTo(-3.4, 12, 1.5, 20); g.quadraticCurveTo(2.4, 12, 2.6, 2); g.closePath(); g.fill(); g.strokeStyle = 'rgba(40,10,8,0.8)'; g.lineWidth = 0.8; g.stroke();
    g.strokeStyle = 'rgba(255,170,140,0.6)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(-1.2, 4); g.quadraticCurveTo(-1.6, 11, 0.6, 16); g.stroke();
    g.fillStyle = '#3f6b2a'; g.beginPath(); g.ellipse(0, 2, 3, 1.8, 0, 0, TAU); g.fill(); g.strokeStyle = '#3f6b2a'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, 1); g.lineTo(0.6, -1.5); g.stroke();
  } else if (kind === 'charcoal') {   // 숯: 모가 난 검은 덩이. 깎인 면마다 잿빛이 조금씩 다르고 잔금이 갔다
    g.fillStyle = '#161414'; g.beginPath(); g.moveTo(-3.4, 1.6); g.lineTo(2.8, 0.8); g.lineTo(5.4, 5.2); g.lineTo(4, 9.8); g.lineTo(1.2, 13); g.lineTo(-3.8, 11.4); g.lineTo(-5.6, 6.4); g.closePath(); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.9)'; g.lineWidth = 0.8; g.stroke();
    g.fillStyle = '#3a3638'; g.beginPath(); g.moveTo(-3.4, 1.6); g.lineTo(2.8, 0.8); g.lineTo(1.4, 5.6); g.lineTo(-4.2, 5); g.closePath(); g.fill();
    g.fillStyle = '#262324'; g.beginPath(); g.moveTo(1.4, 5.6); g.lineTo(5.4, 5.2); g.lineTo(4, 9.8); g.lineTo(0.4, 9); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(120,116,120,0.75)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(-2, 7); g.lineTo(-0.4, 10.6); g.moveTo(2.6, 3); g.lineTo(3.4, 4.4); g.stroke();
    g.fillStyle = 'rgba(160,156,160,0.8)'; for (const [x, y] of [[-1, 3], [3.4, 7.4], [-2.6, 9.6]]) { g.beginPath(); g.arc(x, y, 0.5, 0, TAU); g.fill(); }
  } else if (kind === 'pine') {   // 솔가지: 짧은 가지에 바늘잎 다발
    g.strokeStyle = '#5a3a1e'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(0, 1); g.lineTo(1.5, 14); g.stroke();
    g.strokeStyle = '#2f5a32'; g.lineWidth = 1; for (let i = 0; i < 9; i++) { const y = 3 + i * 1.3, sd = i % 2 ? 1 : -1; g.beginPath(); g.moveTo(0.2 + y * 0.1, y); g.lineTo(0.2 + y * 0.1 + sd * (5 - i * 0.25), y + 3); g.stroke(); }
    g.strokeStyle = '#4f7c46'; g.lineWidth = 0.7; for (let i = 0; i < 5; i++) { const y = 4 + i * 2.2; g.beginPath(); g.moveTo(0.6 + y * 0.1, y); g.lineTo(2.4 + y * 0.1, y + 4); g.stroke(); }
  } else {   // 흰 한지 오리: 곧게 늘어진 종이 한 가닥
    g.fillStyle = '#fbf7ec'; g.beginPath(); g.moveTo(-1.8, 1); g.lineTo(1.8, 1); g.lineTo(2.2, 17); g.lineTo(-1.4, 17.6); g.closePath(); g.fill(); g.strokeStyle = 'rgba(60,50,40,0.6)'; g.lineWidth = 0.7; g.stroke();
  }
  g.restore();
}
const ORDER = ['pepper', 'charcoal', 'pine', 'pepper', 'paper', 'charcoal', 'pepper', 'pine'];
// 금줄 한 줄: (x0,y0)→(x1,y1), 가운데가 sag 만큼 처진다. n: 끼운 것 수, t: 바람에 살랑임, o.k 굵기·크기, o.items 끼울 차례
export function geumjul(g, x0, y0, x1, y1, sag, t = 0, n = 6, o = {}) {
  const k = o.k || 1, at = q => [x0 + (x1 - x0) * q, y0 + (y1 - y0) * q + Math.sin(q * Math.PI) * sag], N = Math.max(16, Math.round(Math.hypot(x1 - x0, y1 - y0) / (5 * k)));
  g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
  const line = (lw, col, dy = 0) => { g.beginPath(); for (let i = 0; i <= N; i++) { const [x, y] = at(i / N); if (i) g.lineTo(x, y + dy); else g.moveTo(x, y + dy); } g.strokeStyle = col; g.lineWidth = lw; g.stroke(); };
  line(7 * k, INK); line(5 * k, STRAW); line(1.4 * k, STRAW_L, -1.2 * k);
  // 왼새끼의 꼰 결: 한쪽으로 기운 짧은 빗금이 촘촘히
  g.strokeStyle = STRAW_D; g.lineWidth = 1.1 * k;
  for (let i = 0; i < N; i++) { const [x, y] = at((i + 0.5) / N), [xa, ya] = at(Math.min(1, (i + 1) / N)), [xb, yb] = at(i / N), a = Math.atan2(ya - yb, xa - xb), nx = -Math.sin(a), ny = Math.cos(a); g.beginPath(); g.moveTo(x - nx * 2.3 * k - Math.cos(a) * 1.6 * k, y - ny * 2.3 * k - Math.sin(a) * 1.6 * k); g.lineTo(x + nx * 2.3 * k + Math.cos(a) * 1.6 * k, y + ny * 2.3 * k + Math.sin(a) * 1.6 * k); g.stroke(); }
  // 삐져나온 지푸라기
  g.strokeStyle = STRAW_L; g.lineWidth = 0.8 * k;
  for (let i = 1; i < N; i += 2) { const [x, y] = at(i / N), a = (i * 2.399) % TAU, l = (3 + (i * 7 % 5)) * k; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l * 0.8); g.stroke(); }
  // 끼운 것들
  const items = o.items || ORDER;
  for (let i = 1; i <= n; i++) { const [x, y] = at(i / (n + 1)), sw = Math.sin(t * 2 + i * 1.7) * 0.1; g.save(); g.translate(x, y + 1.5 * k); g.rotate(sw); hangItem(g, items[(i - 1) % items.length], k); g.restore(); }
  g.restore();
}
