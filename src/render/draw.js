// 캔버스 그리기 공통 도구와 색. 그림은 전부 코드로 그린다(이미지 파일 없음).
// 그림 문법: 평평한 면 + 굵은 남보라 외곽선 + 작은 하이라이트.

export const TAU = Math.PI * 2;

export const C = {
  ink: '#2b1d4f',
  inkSoft: '#4a3a7a',
  cream: '#fff3d6',
  creamShade: '#f0d6a3',
  mint: '#6fdcbf',
  mintDark: '#3fae93',
  lemon: '#ffd84a',
  lemonSoft: '#fff2ae',
  coral: '#ff6b5e',
  coralDark: '#d94a45',
  pink: '#ff9db5',
  lilac: '#b79cff',
  lilacDark: '#8f74e0',
  aqua: '#bdf0ff',
  white: '#ffffff',
  cloud: '#f4f0ff',
};

export const clamp = (v, a = 0, b = 1) => Math.min(Math.max(v, a), b);
export const lerp = (a, b, t) => a + (b - a) * t;
export const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
export const easeIn = (t) => Math.pow(clamp(t), 2.2);
export const easeInOut = (t) => {
  const x = clamp(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
/** 끝에서 살짝 튕기는 감속. */
export const easeBack = (t) => {
  const x = clamp(t) - 1;
  return 1 + x * x * (2.6 * x + 1.6);
};

/** 방금 만든 경로를 칠하고 외곽선을 긋는다. */
export function paint(ctx, fill, lw = 2.5, stroke = C.ink) {
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (lw > 0) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = stroke;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  }
}

export function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(r, 0), 0, TAU);
}

export function ellipse(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(rx, 0), Math.max(ry, 0), rot, 0, TAU);
}

export function rrect(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, rad);
    return;
  }
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

export function poly(ctx, pts, close = true) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (close) ctx.closePath();
}

export function line(ctx, x1, y1, x2, y2, color = C.ink, lw = 2.5) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineWidth = lw;
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.stroke();
}

/** 부드러운 빛 번짐(그림자 블러보다 훨씬 싸다). */
export function glow(ctx, x, y, r, color, alpha = 0.5) {
  if (r <= 0 || alpha <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, withAlpha(color, alpha));
  g.addColorStop(1, withAlpha(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

const alphaCache = new Map();
/** '#rrggbb' → 'rgba(r,g,b,a)' */
export function withAlpha(hex, a) {
  const key = hex + (Math.round(a * 100) / 100).toFixed(2);
  let v = alphaCache.get(key);
  if (!v) {
    const n = parseInt(hex.slice(1), 16);
    v = `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.round(a * 100) / 100})`;
    if (alphaCache.size < 2000) alphaCache.set(key, v);
  }
  return v;
}

/** 두 '#rrggbb' 색을 섞는다. */
export function mix(a, b, t) {
  const x = parseInt(a.slice(1), 16);
  const y = parseInt(b.slice(1), 16);
  const ch = (shift) => Math.round(lerp((x >> shift) & 255, (y >> shift) & 255, clamp(t)));
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

/** 꼭짓점 n 개짜리 별. */
export function star(ctx, x, y, outer, inner, n = 5, rot = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = rot + (i * Math.PI) / n;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/** 뭉게구름: 외곽선을 먼저 굵게 긋고 속을 덮어 한 덩어리처럼 보이게 한다. */
export function puffs(ctx, blobs, fill, lw = 2.5, stroke = C.ink) {
  if (lw > 0) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw * 2;
    for (const [x, y, r] of blobs) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.stroke();
    }
  }
  ctx.fillStyle = fill;
  for (const [x, y, r] of blobs) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
}

/** 외곽선이 있는 글자. */
export function label(ctx, text, x, y, { size = 16, fill = C.lemon, stroke = C.ink, lw = 4, font = 'display', align = 'center' } = {}) {
  ctx.font = `${size}px ${font === 'display' ? FONT_DISPLAY : FONT_BODY}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  if (lw > 0) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = stroke;
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

export const FONT_DISPLAY = '"Bagel Fat One", "Jua", "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif';
export const FONT_BODY = '"Gowun Dodum", "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", system-ui, sans-serif';
