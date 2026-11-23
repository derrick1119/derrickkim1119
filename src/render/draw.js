// 캔버스 그리기 공통 도구와 색. 그림은 전부 코드로 그린다(이미지 파일 없음).
//
// 그림 문법(낮의 3D 카툰):
//   · 빛은 왼쪽 위에서 온다. 면은 밝은 쪽(왼쪽 위) → 기본색 → 그늘(오른쪽 아래)로 넘어간다.
//   · 외곽선은 검정이 아니라 그 면 색을 어둡게 한 같은 계열의 가는 선(1.5~2.2px).
//   · 동그란 것은 ball(), 나머지 면은 shade() 로 칠한다. 반짝임은 gloss(), 바닥 그림자는 groundShadow().
//   · 순수한 검정·회색을 쓰지 않는다. 그늘은 차가운 남색 쪽으로 어두워진다(tone 이 알아서 한다).
// C 는 예전 UI·효과용 색, P 는 새 그림의 팔레트다.

export const TAU = Math.PI * 2;

export const C = {
  ink: '#1f2350',
  inkSoft: '#4a5288',
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
  cloud: '#ffffff',
};

/** 낮의 3D 카툰 팔레트(컨셉 아트 기준). 그림 모듈은 이 색을 기본으로 쓴다. */
export const P = {
  ink: '#1f2350', // 눈동자·입·글자
  white: '#ffffff',
  cream: '#fff4dc',
  // 피부(밝은 → 어두운)
  skin: ['#ffd9bd', '#f2bd94', '#d39a6c', '#a8714c'],
  cheek: '#ff8f8f',
  hairBrown: '#7a4a2e',
  hairDark: '#3a2a2a',
  hairBlond: '#f0c25a',
  // 하늘·구름
  skyTop: '#3d6fd8',
  sky: '#64a2f2',
  skyLow: '#c4e6ff',
  cloud: '#ffffff',
  cloudShade: '#b8c6f2',
  // 땅·식물
  grass: '#93d34f',
  grassDark: '#57a33c',
  leaf: '#3f8f3e',
  leafLight: '#7fcb4a',
  leafDark: '#2a6634',
  soil: '#b97f4e',
  sand: '#f1d9a0',
  wood: '#b07843',
  woodDark: '#734727',
  hay: '#f2c75a',
  // 물
  sea: '#2f74c8',
  seaLight: '#6fb6f2',
  pond: '#3f86e0',
  // 건물
  barn: '#d2483c',
  roof: '#8f4a34',
  roofOrange: '#e0773b',
  roofBlue: '#4f6fc2',
  wall: '#fbeed2',
  stone: '#c9c3d8',
  // UFO
  hull: '#3c4569',
  hullLight: '#93a0cf',
  hullDark: '#1f2543',
  glow: '#5ff0ff',
  glowSoft: '#c6fdff',
  glass: '#9fe8ff',
  alien: '#a6e3cf',
  // 강조색
  red: '#e2483c',
  orange: '#ff9a3c',
  yellow: '#ffd23f',
  green: '#5cbf5a',
  teal: '#2fb5a6',
  blue: '#3f6fd0',
  navy: '#2b3a78',
  purple: '#8a6ad8',
  pink: '#ff8fb0',
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
export const FONT_BODY = '"Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", system-ui, sans-serif';

// ───────── 낮의 3D 카툰 도구 ─────────

const SHADOW_TINT = [27, 29, 74]; // 그늘은 차가운 남색 쪽으로
const LIGHT_TINT = [255, 252, 240]; // 빛은 살짝 따뜻한 흰색 쪽으로
const toneCache = new Map();

/**
 * 색의 밝기를 바꾼다. amt > 0 밝게(따뜻한 흰색 쪽), amt < 0 어둡게(남색 쪽). -1..1
 * @returns {string} '#rrggbb'
 */
export function tone(hex, amt) {
  const key = `${hex}${amt}`;
  let v = toneCache.get(key);
  if (v) return v;
  const n = parseInt(hex.slice(1), 16);
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  // 어둡게 할 때는 제 색을 유지한 채 낮추고 남색을 조금 섞는다(피부·나무가 잿빛이 되지 않게).
  const to = amt >= 0 ? LIGHT_TINT : rgb.map((c, i) => c * 0.22 + SHADOW_TINT[i] * 0.3);
  const k = Math.min(Math.abs(amt), 1);
  v = `#${rgb
    .map((c, i) => Math.round(c + (to[i] - c) * k)
      .toString(16)
      .padStart(2, '0'))
    .join('')}`;
  if (toneCache.size < 4000) toneCache.set(key, v);
  return v;
}

/** 같은 계열의 외곽선 색. */
export const edge = (hex, k = 0.55) => tone(hex, -k);

/**
 * 방금 만든 경로를 입체로 칠한다: (x0,y0) 쪽이 밝고 (x1,y1) 쪽이 어둡다.
 * 보통 왼쪽 위 → 오른쪽 아래로 준다.
 * @param {{lw?: number, light?: number, dark?: number, line?: string|null}} [o]
 *        lw 외곽선 굵기(0 이면 없음), light/dark 밝은 쪽·어두운 쪽 세기, line 외곽선 색(기본은 같은 계열)
 */
export function shade(ctx, base, x0, y0, x1, y1, o = {}) {
  const { lw = 2, light = 0.22, dark = 0.2, line: lineColor } = o;
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, tone(base, light));
  g.addColorStop(0.5, base);
  g.addColorStop(1, tone(base, -dark));
  ctx.fillStyle = g;
  ctx.fill();
  if (lw > 0) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = lineColor || edge(base);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  }
}

/** 공처럼 둥근 면: 왼쪽 위에 빛, 오른쪽 아래에 그늘. 경로도 함께 만든다. */
export function ball(ctx, x, y, r, base, o = {}) {
  const { lw = 2, light = 0.4, dark = 0.28, line: lineColor } = o;
  ctx.beginPath();
  ctx.arc(x, y, Math.max(r, 0.01), 0, TAU);
  const g = ctx.createRadialGradient(x - r * 0.38, y - r * 0.42, r * 0.05, x, y, r * 1.05);
  g.addColorStop(0, tone(base, light));
  g.addColorStop(0.55, base);
  g.addColorStop(1, tone(base, -dark));
  ctx.fillStyle = g;
  ctx.fill();
  if (lw > 0) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = lineColor || edge(base);
    ctx.stroke();
  }
}

/** 왼쪽 위의 반짝임(흰 타원). */
export function gloss(ctx, x, y, rx, ry, rot = -0.5, alpha = 0.7) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(rx, 0.01), Math.max(ry, 0.01), rot, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** 땅에 떨어지는 부드러운 그림자. */
export function groundShadow(ctx, x, y, rx, ry, alpha = 0.22) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, 0.01));
  g.addColorStop(0, `rgba(27,29,74,${alpha})`);
  g.addColorStop(1, 'rgba(27,29,74,0)');
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, Math.max(ry, 0.01) / Math.max(rx, 0.01));
  ctx.translate(-x, -y);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, Math.max(rx, 0.01), 0, TAU);
  ctx.fill();
  ctx.restore();
}

/**
 * 뭉게구름(낮 하늘용): 아래쪽이 푸르스름하게 그늘지고 위쪽이 밝다. 외곽선 없음.
 * blobs = [[x, y, r], ...]
 */
export function cumulus(ctx, blobs, { base = P.cloud, shadeColor = P.cloudShade, alpha = 1 } = {}) {
  if (!blobs.length) return;
  let top = Infinity;
  let bottom = -Infinity;
  for (const [, y, r] of blobs) {
    top = Math.min(top, y - r);
    bottom = Math.max(bottom, y + r);
  }
  ctx.save();
  ctx.globalAlpha *= alpha;
  const g = ctx.createLinearGradient(0, top, 0, bottom);
  g.addColorStop(0, base);
  g.addColorStop(0.55, base);
  g.addColorStop(1, shadeColor);
  ctx.fillStyle = g;
  ctx.beginPath();
  for (const [x, y, r] of blobs) {
    ctx.moveTo(x + r, y);
    ctx.arc(x, y, r, 0, TAU);
  }
  ctx.fill();
  ctx.restore();
}
