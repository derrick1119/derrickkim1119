// 도트 전장: 배경 겹(하늘·산·들판)과 날씨, 인형 한 장을 2배로 찍는다 (화면 1280×720 = 도트 640×360)
import { tinted } from './px.js';
import { pxUnit, pxFlip } from './units.js';
import { pxField, drawPxWeather, prewarmPxField } from './field.js';
export { prewarmPxField };
import { PORTRAIT } from '../render/sprites.js';
import { GFX } from './gfx.js';

export const skyKey = a => (a.rain > 0.5 ? 'rain' : a.night > 0.5 ? 'night' : 'day');
// 배경: 낮 그림 위에 밤·비 그림을 겹쳐 서서히 바꾼다. sc = 행군으로 흐른 거리(화면 픽셀)
export function pxFieldDraw(g, theme, a, T, sc) {
  g.save(); g.imageSmoothingEnabled = false; g.scale(2, 2);
  const layers = (F, al) => { if (al <= 0.01) return; g.globalAlpha = Math.min(1, al); for (const L of F.layers) { const p = L.period, off = ((Math.round(sc * L.speed / 2) % p) + p) % p; for (let x = -off; x < 640; x += p) g.drawImage(L.img, x, L.y); } };
  layers(pxField(theme, 'day'), 1); layers(pxField(theme, 'night'), a.night); layers(pxField(theme, 'rain'), a.rain);
  g.globalAlpha = 1; drawPxWeather(g, theme, skyKey(a), T, false); g.restore();
}
export function pxWeatherFront(g, theme, a, T) { g.save(); g.imageSmoothingEnabled = false; g.scale(2, 2); drawPxWeather(g, theme, skyKey(a), T, true); g.restore(); }
// 큰 나무들: 인형들과 앞뒤를 맞추도록 목록에 넣는다 (화면 좌표)
export const pxTrees = theme => { const F = pxField(theme, 'day'); return { list: F.trees, period: F.period }; };
export function pxTree(g, p, x, a) { const X = Math.round(x / 2), Y = Math.round(p.y / 2); g.save(); g.imageSmoothingEnabled = false; g.globalAlpha *= a; g.drawImage(p.img, (X - p.ox) * 2, (Y - p.oy) * 2, p.img.width * 2, p.img.height * 2); g.restore(); }
// 발밑 그림자: 2픽셀 격자의 납작한 타원
export function pxShadow(g, x, y, rx, col = 'rgba(28,22,48,0.26)') {
  const X = Math.round(x / 2), Y = Math.round(y / 2), r = Math.max(3, Math.round(rx / 2)); g.fillStyle = col;
  g.fillRect((X - r + 2) * 2, (Y - 1) * 2, (r * 2 - 4) * 2, 2); g.fillRect((X - r) * 2, Y * 2, r * 4, 2); g.fillRect((X - r + 2) * 2, (Y + 1) * 2, (r * 2 - 4) * 2, 2);
}
// 인형 한 장: frame = 'stand' | 'step' | 'atk'. 돌려주는 값은 머리 꼭대기의 화면 y
export function pxBody(g, lookKey, wpn, x, y, dir, frame, fl, grow = 1) {
  const P = pxUnit(lookKey, wpn); let s = P[frame] || P.stand; if (dir < 0) s = pxFlip(s);
  const X = Math.round(x / 2), Y = Math.round(y / 2), q = 2 * grow, dx = Math.round(X * 2 - s.ox * q), dy = Math.round(Y * 2 - s.oy * q), w = s.w * q, h = s.h * q;
  g.imageSmoothingEnabled = false; g.drawImage(s.canvas(), dx, dy, w, h);
  if (fl > 0.02) { const a0 = g.globalAlpha; g.globalAlpha = a0 * Math.min(1, fl); g.drawImage(tinted(s, 0xffffff).canvas(), dx, dy, w, h); g.globalAlpha = a0; }
  return Y * 2 - P.h * q;
}
// 패·인형극·도감의 초상: 정수 배율로만 키운다
export function pxPortrait(g, lookKey, x, y, s, t = 0, bob = false, wpn) {
  const P = pxUnit(lookKey, wpn), sp = P.stand, n = Math.max(1, Math.round(s * 1.5)), yy = y - (bob ? Math.round(Math.abs(Math.sin(t * 5)) * 3 * s) : 0);
  g.save(); g.imageSmoothingEnabled = false; g.drawImage(sp.canvas(), Math.round(x - sp.ox * n), Math.round(yy - sp.oy * n), sp.w * n, sp.h * n); g.restore();
}
if (GFX.pixel) PORTRAIT.px = pxPortrait;
