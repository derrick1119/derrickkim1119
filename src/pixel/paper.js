// 붓 그림(종이 그림) 한 장을 도트로: 반 크기로 고르게 줄이고, 색을 열여섯 가지로 줄이고, 둘레의 종이 테를 벗겨 먹선을 두른다
// 지형지물(바위·돌담·목책)·길가의 집·갈림길 푯말처럼 아직 따로 찍지 않은 것들에 쓴다
import { Spr, INK, lum } from './px.js';
import { downsample, medianCut, peelLight } from './units.js';
import { GFX } from './gfx.js';

const SS = 4, CACHE = new WeakMap();
const d2 = (a, b) => { const dr = ((a >> 16) & 255) - ((b >> 16) & 255), dg = ((a >> 8) & 255) - ((b >> 8) & 255), db = (a & 255) - (b & 255); return dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11; };
// spr: paperSprite 결과 { img, w, h, ox, oy } · k: 화면에서의 배율
export function pxPaperSpr(spr, k = 1) {
  let m = CACHE.get(spr); if (!m) CACHE.set(spr, m = new Map()); const key = Math.round(k * 100); let s = m.get(key); if (s) return s;
  const f = k / 2, cw = Math.max(SS, Math.ceil(spr.w * f) * SS), ch = Math.max(SS, Math.ceil(spr.h * f) * SS), cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
  const g = cv.getContext('2d'); g.drawImage(spr.img, 0, 0, cw, ch);
  const A = downsample(cv, f); peelLight(A, 2);
  const cols = []; for (const v of A.d) if (v !== -1) cols.push(v);
  if (cols.length) { const pal = medianCut(cols, 16).map(v => (lum(v) < 0.14 ? INK : v)), memo = new Map(); for (let i = 0; i < A.d.length; i++) { const v = A.d[i]; if (v === -1) continue; let q = memo.get(v); if (q === undefined) { let bd = 1e12; for (const p of pal) { const dd = d2(v, p); if (dd < bd) { bd = dd; q = p; } } memo.set(v, q); } A.d[i] = q; } }
  const t = new Spr(A.w, A.h, Math.round(spr.ox * f), Math.round(spr.oy * f)); t.d = A.d;
  s = t.outline(INK); m.set(key, s); return s;
}
// 2배 격자에 찍는다 (기울이거나 찌그러뜨리지 않는다)
export function pxPaper(g, spr, x, y, k = 1, flip = false) {
  const s = pxPaperSpr(spr, k), X = Math.round(x / 2), Y = Math.round(y / 2);
  g.save(); g.imageSmoothingEnabled = false;
  if (flip) { g.translate(X * 2, 0); g.scale(-1, 1); g.drawImage(s.canvas(), -s.ox * 2 - 2, (Y - s.oy) * 2, s.w * 2, s.h * 2); }
  else g.drawImage(s.canvas(), (X - s.ox) * 2, (Y - s.oy) * 2, s.w * 2, s.h * 2);
  g.restore();
}
// 붓으로 그리는 것(개울·갈림길 바닥)을 반 해상도 판에 그린 뒤 2배로 키워 도트처럼 보이게 한다
let LOW = null;
// 반 해상도 판에 그리는 동안 도트 인형(초상)은 판에 넣지 않고 줄 세워 두었다가, 판을 옮긴 뒤 제 해상도로 찍는다 (인형이 흐려지지 않게)
export const LOWQ = { on: false, main: null, q: [] };
export function lowres(g, fn) {
  if (LOWQ.on) { fn(g); return; }
  if (!LOW) { LOW = document.createElement('canvas'); LOW.width = 640; LOW.height = 360; }
  const l = LOW.getContext('2d'); l.setTransform(1, 0, 0, 1, 0, 0); l.globalAlpha = 1; l.clearRect(0, 0, 640, 360); l.save(); l.scale(0.5, 0.5);
  LOWQ.on = true; LOWQ.main = g; try { fn(l); } finally { LOWQ.on = false; l.restore(); }
  g.save(); g.imageSmoothingEnabled = false; g.drawImage(LOW, 0, 0, 1280, 720); g.restore();
  const q = LOWQ.q; LOWQ.q = []; for (const f of q) f();
}
// 도트일 때만 반 해상도로 (붓 그림이면 그대로)
export const art = (g, fn) => (GFX.pixel ? lowres(g, fn) : fn(g));
