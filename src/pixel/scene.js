// 붓으로 구운 장면 그림(1280×720)을 도트로: 반으로 줄이고, 색을 쉰 가지 남짓으로 줄여 띠를 지게 한다 (번짐·그러데이션이 도트의 색 계단이 된다)
import { medianCut } from './units.js';
import { GFX } from './gfx.js';

const CACHE = new WeakMap();
const d2 = (a, b) => { const dr = ((a >> 16) & 255) - ((b >> 16) & 255), dg = ((a >> 8) & 255) - ((b >> 8) & 255), db = (a & 255) - (b & 255); return dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11; };
export function pxScene(cv, n = 56) {
  let o = CACHE.get(cv); if (o) return o;
  const w = 640, h = 360; o = document.createElement('canvas'); o.width = w; o.height = h; const g = o.getContext('2d');
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(cv, 0, 0, w, h);
  const im = g.getImageData(0, 0, w, h), u = new Uint32Array(im.data.buffer), cols = [];
  for (let i = 0; i < u.length; i += 3) { const v = u[i]; cols.push(((v & 255) << 16) | (v & 0xff00) | ((v >> 16) & 255)); }
  const pal = medianCut(cols, n), memo = new Map();
  for (let i = 0; i < u.length; i++) { const v = u[i], a = v >>> 24; if (a < 128) { u[i] = 0; continue; } const c = ((v & 255) << 16) | (v & 0xff00) | ((v >> 16) & 255); let q = memo.get(c); if (q === undefined) { let bd = 1e12; for (const p of pal) { const dd = d2(c, p); if (dd < bd) { bd = dd; q = p; } } memo.set(c, q); } u[i] = 0xff000000 | ((q & 255) << 16) | (q & 0xff00) | ((q >> 16) & 255); }
  // 외톨이 점 지우기: 네 이웃이 모두 같은 색인데 혼자 다르면 그 색으로
  const v2 = u.slice(); for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x, l = v2[i - 1]; if (v2[i] !== l && l === v2[i + 1] && l === v2[i - w] && l === v2[i + w]) u[i] = l; }
  g.putImageData(im, 0, 0); CACHE.set(cv, o); return o;
}
// 장면 그림을 화면에 깐다 (도트면 도트판으로)
export function drawScene(g, cv, W = 1280, H = 720) { if (!GFX.pixel) { g.drawImage(cv, 0, 0, W, H); return; } g.save(); g.imageSmoothingEnabled = false; g.drawImage(pxScene(cv), 0, 0, W, H); g.restore(); }
