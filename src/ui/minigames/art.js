// 미니게임 그림 공통 도구. 게임 본편의 2D 그림(UFO·지구인)을 그대로 빌려 쓴다(three.js 를 쓰지 않는다).
import { drawUfo, UFO_HALF_WIDTH } from '../../render/ufo.js';
import { drawWatcher } from '../../render/people.js';
import { TAU, FONT_DISPLAY, withAlpha, rrect, clamp } from '../../render/draw.js';
import { seededRng } from './score.js';

export const OL = '#11143a';

/**
 * 삐뽀의 UFO. hw = 화면에서의 반폭(px).
 * @param {{form?: number, t?: number, mood?: string, lit?: number, alpha?: number, tilt?: number}} o
 */
export function ufo(ctx, x, y, hw, o = {}) {
  const form = clamp(o.form ?? 0, 0, UFO_HALF_WIDTH.length - 1);
  const s = hw / UFO_HALF_WIDTH[form];
  ctx.save();
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  ctx.translate(x, y);
  if (o.tilt) ctx.rotate(o.tilt);
  ctx.scale(s, s);
  drawUfo(ctx, { form, t: o.t ?? 0, mood: o.mood || 'idle', lit: o.lit ?? 1, beam: o.beam ?? 0 });
  ctx.restore();
}

/** 지구인 한 명. (x, y) = 발밑, s = 배율. */
export function person(ctx, type, x, y, s, pose = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  drawWatcher(ctx, type, pose);
  ctx.restore();
}

/** 세로 그라데이션으로 사각형을 칠한다. stops = [[0, '#..'], [1, '#..']] */
export function vgrad(ctx, x, y, w, h, stops) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  for (const [k, c] of stops) g.addColorStop(k, c);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

const starCache = new Map();
/** 반짝이는 별들. area = 별이 뿌려지는 높이 비율(위에서부터). */
export function stars(ctx, w, h, t, { seed = 1, n = 60, area = 0.7, color = '#ffffff' } = {}) {
  const key = `${seed}:${n}`;
  let list = starCache.get(key);
  if (!list) {
    const rng = seededRng(seed);
    list = Array.from({ length: n }, () => ({ x: rng(), y: rng(), r: 0.6 + rng() * 1.4, p: rng() * TAU, s: 1 + rng() * 2 }));
    starCache.set(key, list);
  }
  ctx.fillStyle = color;
  for (const s of list) {
    ctx.globalAlpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.s + s.p));
    ctx.beginPath();
    ctx.arc(s.x * w, s.y * h * area, s.r, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** 가장자리를 어둡게. */
export function vignette(ctx, w, h, color = '#0a0d2a', alpha = 0.55) {
  const g = ctx.createRadialGradient(w / 2, h * 0.48, Math.min(w, h) * 0.35, w / 2, h * 0.5, Math.max(w, h) * 0.75);
  g.addColorStop(0, withAlpha(color, 0));
  g.addColorStop(1, withAlpha(color, alpha));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/**
 * 빛줄기·시선 원뿔. (x0,y0) 에서 r0 폭으로 시작해 (x1,y1) 에서 r1 폭이 된다.
 */
export function cone(ctx, x0, y0, x1, y1, r0, r1, color, alpha = 0.5) {
  const a = Math.atan2(y1 - y0, x1 - x0) + Math.PI / 2;
  const cx = Math.cos(a);
  const cy = Math.sin(a);
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, withAlpha(color, alpha));
  g.addColorStop(1, withAlpha(color, alpha * 0.15));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x0 + cx * r0, y0 + cy * r0);
  ctx.lineTo(x1 + cx * r1, y1 + cy * r1);
  ctx.arc(x1, y1, r1, a, a + Math.PI);
  ctx.lineTo(x0 - cx * r0, y0 - cy * r0);
  ctx.closePath();
  ctx.fill();
}

/** 외곽선 있는 굵은 글자(아래로 떨어지는 그림자 포함). */
export function bold(ctx, text, x, y, size, fill = '#ffffff', { align = 'center', lw } = {}) {
  ctx.font = `${size}px ${FONT_DISPLAY}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = lw ?? Math.max(3, size * 0.24);
  ctx.strokeStyle = OL;
  ctx.fillStyle = OL;
  ctx.fillText(text, x, y + size * 0.11);
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

/** 말풍선(동그라미 + 꼬리) 안에 글자 하나. */
export function bubble(ctx, x, y, text, { fill = '#ffffff', color = OL, size = 22, scale = 1 } = {}) {
  if (scale <= 0.01) return;
  const r = size * 0.78;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.beginPath();
  ctx.moveTo(-r * 0.35, r * 0.7);
  ctx.lineTo(-r * 0.15, r * 1.45);
  ctx.lineTo(r * 0.35, r * 0.75);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.strokeStyle = OL;
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.stroke();
  ctx.fill();
  ctx.font = `${size}px ${FONT_DISPLAY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, 0, size * 0.06);
  ctx.restore();
}

/** 알약 모양 이름표(외곽선 + 아래 받침). */
export function chip(ctx, text, x, y, { fill = '#7fd64b', size = 18, color = '#ffffff', scale = 1 } = {}) {
  ctx.save();
  ctx.font = `${size}px ${FONT_DISPLAY}`;
  const w = ctx.measureText(text).width + size * 1.3;
  const hh = size * 1.75;
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  rrect(ctx, -w / 2, -hh / 2 + 4, w, hh, hh / 2);
  ctx.fillStyle = OL;
  ctx.fill();
  rrect(ctx, -w / 2, -hh / 2, w, hh, hh / 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = OL;
  ctx.stroke();
  rrect(ctx, -w / 2 + 5, -hh / 2 + 3, w - 10, hh * 0.38, hh * 0.2);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fill();
  ctx.restore();
  bold(ctx, text, x, y - 1, size * scale, color);
}

/** 반짝이(네 갈래 별). */
export function twinkle(ctx, x, y, r, color = '#ffffff', alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const rr = i % 2 ? r * 0.28 : r;
    const a = (i * Math.PI) / 4;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** 앞쪽 위가 밝은 뭉게구름 한 덩이. blobs = [[x, y, r], ...] */
export function cloudBlob(ctx, blobs, { fill = '#ffffff', shade = '#c9d6f7', line = '#8a9bd8', lw = 3, alpha = 1 } = {}) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (lw > 0) {
    ctx.strokeStyle = line;
    ctx.lineWidth = lw * 2;
    for (const [x, y, r] of blobs) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.stroke();
    }
  }
  let top = Infinity;
  let bottom = -Infinity;
  for (const [, y, r] of blobs) {
    top = Math.min(top, y - r);
    bottom = Math.max(bottom, y + r);
  }
  const g = ctx.createLinearGradient(0, top, 0, bottom);
  g.addColorStop(0, fill);
  g.addColorStop(0.55, fill);
  g.addColorStop(1, shade);
  ctx.fillStyle = g;
  for (const [x, y, r] of blobs) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/** 화면 단위: 짧은 변. */
export const unitOf = (w, h) => Math.min(w, h * 0.62);
