/**
 * 양치기 멍멍 — 캔버스 작은 아이콘 (C010 M1-6 ②, 🎨 C010 결정 2). 캔버스에 남던 그림 글자(🐑🌼🍀🚩💦🐾)를 그린다.
 * 24 격자 모양은 hud.ts ICON(DOM SVG)과 같다. 크기 z = 한 변 px, (x, y) = 가운데.
 */
export type IconKind = 'sheep' | 'black' | 'flower' | 'clover' | 'flag' | 'drop' | 'paw' | 'heart' | 'star';

const INK = '#7a3e1d';
const P: Record<string, Path2D> = {};
const path = (k: string, d: string) => (P[k] ??= new Path2D(d));

function circles(ctx: CanvasRenderingContext2D, cs: [number, number, number][], fill: string, stroke: string, lw: number) {
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lw;
  for (const [x, y, r] of cs) (ctx.beginPath(), ctx.arc(x, y, r, 0, Math.PI * 2), ctx.fill(), ctx.stroke());
}

export function drawIcon(ctx: CanvasRenderingContext2D, kind: IconKind, x: number, y: number, z: number) {
  ctx.save();
  ctx.translate(x - z / 2, y - z / 2);
  ctx.scale(z / 24, z / 24);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (kind === 'sheep' || kind === 'black') {
    const body = kind === 'sheep' ? '#fff6e4' : '#3a3234', line = kind === 'sheep' ? INK : '#17131a';
    circles(ctx, [[9, 12, 5], [14, 10, 5], [12, 15, 5]], body, line, 1.6);
    circles(ctx, [[18.5, 13, 3.3]], kind === 'sheep' ? '#3a3234' : '#17131a', line, 1.6);
    circles(ctx, [[19.3, 12.3, 0.9]], '#ffffff', '#ffffff', 0.1);
  } else if (kind === 'flower') {
    circles(ctx, [[12, 6.5, 3.4], [17.2, 10.3, 3.4], [15.2, 16.4, 3.4], [8.8, 16.4, 3.4], [6.8, 10.3, 3.4]], '#f7a8c6', INK, 1.2);
    circles(ctx, [[12, 11.8, 2.6]], '#ffc857', INK, 1.2);
  } else if (kind === 'clover') {
    ctx.strokeStyle = '#3d7a2a';
    ctx.lineWidth = 2;
    ctx.beginPath(), ctx.moveTo(12, 13), ctx.lineTo(13.5, 21), ctx.stroke();
    circles(ctx, [[12, 7.2, 3.8], [7.6, 12.6, 3.8], [16.4, 12.6, 3.8]], '#5fa83a', '#2f5e20', 1.2);
  } else if (kind === 'flag') {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath(), ctx.moveTo(6, 21), ctx.lineTo(6, 4), ctx.stroke();
    ctx.fillStyle = '#e8414f';
    ctx.lineWidth = 1.6;
    const f = path('flag', 'M6 4h11l-3 4 3 4H6z');
    ctx.fill(f), ctx.stroke(f);
  } else if (kind === 'drop') {
    // 💦 → 위가 뾰족한 물방울 둘 (r4 · r3)
    ctx.fillStyle = '#6cc4e8';
    ctx.strokeStyle = '#2b6c8a';
    ctx.lineWidth = 1.5;
    const d = path('drop', 'M9 5c3 4.2 5 6.6 5 9a5 5 0 0 1-10 0c0-2.4 2-4.8 5-9zM17.5 3c2.2 3.1 3.7 5 3.7 6.8a3.7 3.7 0 0 1-7.4 0c0-1.8 1.5-3.7 3.7-6.8z');
    ctx.fill(d), ctx.stroke(d);
  } else if (kind === 'paw') {
    // 🐾 → 발바닥 타원 10×8 + 발가락 넷
    ctx.fillStyle = '#fff6e4';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.beginPath(), ctx.ellipse(12, 16, 5, 4, 0, 0, Math.PI * 2), ctx.fill(), ctx.stroke();
    circles(ctx, [[6.5, 10.5, 2.1], [10, 7.2, 2.1], [14, 7.2, 2.1], [17.5, 10.5, 2.1]], '#fff6e4', INK, 1.5);
  } else if (kind === 'heart') {
    ctx.fillStyle = '#ff8fc8';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.4;
    const h = path('heart', 'M12 20.5 4.2 12.8A4.7 4.7 0 0 1 12 6.6a4.7 4.7 0 0 1 7.8 6.2z');
    ctx.fill(h), ctx.stroke(h);
  } else if (kind === 'star') {
    ctx.fillStyle = '#ffc857';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    const st = path('star', 'M12 2.6l2.9 6 6.5.9-4.7 4.6 1.1 6.5L12 17.5l-5.8 3.1 1.1-6.5L2.6 9.5l6.5-.9z');
    ctx.fill(st), ctx.stroke(st);
  }
  ctx.restore();
}
