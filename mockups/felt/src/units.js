// 펠트 인형들: 모두 오른쪽을 본다 (적은 그릴 때 뒤집는다)
import { sheet, felt, bead, prop, stitch, tone } from './felt.js';

const TAU = Math.PI * 2;
const E = (cx, cy, rx, ry, rot = 0) => x => x.ellipse(cx, cy, rx, ry, rot, 0, TAU);
const RR = (x0, y0, w, h, r) => x => x.roundRect(x0, y0, w, h, r);
// 점들을 부드럽게 잇는 닫힌 경로
const P = pts => x => { const n = pts.length, m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; let s = m(pts[n - 1], pts[0]); x.moveTo(s[0], s[1]); for (let i = 0; i < n; i++) { const q = m(pts[i], pts[(i + 1) % n]); x.quadraticCurveTo(pts[i][0], pts[i][1], q[0], q[1]); } x.closePath(); };
// 날카로운 꼭짓점 그대로
const L = pts => x => { pts.forEach(([a, b], i) => i ? x.lineTo(a, b) : x.moveTo(a, b)); x.closePath(); };

const SKIN = '#f0caa2', BLUSH = '#e79b8f', INKC = '#25201c';
function cheeks(S, x1, y1, x2, y2) { felt(S, E(x1, y1, 3.6, 2.2), BLUSH, { shadow: false, alpha: 0.55, fuzz: 0.4, hi: 0.1, lo: 0.1 }); if (x2 != null) felt(S, E(x2, y2, 3, 2), BLUSH, { shadow: false, alpha: 0.5, fuzz: 0.4, hi: 0.1, lo: 0.1 }); }
function smile(S, x, y, w = 2.6) { prop(S, g => { g.strokeStyle = '#5a2e22'; g.lineWidth = 0.9; g.lineCap = 'round'; g.beginPath(); g.arc(x, y - w * 0.6, w, 0.35, Math.PI - 0.35); g.stroke(); }); }
function wood(g, x0, y0, x1, y1, w, col = '#8a5a33') {
  const gr = g.createLinearGradient(x0 - w, y0, x0 + w, y0); gr.addColorStop(0, tone(col, -0.12)); gr.addColorStop(0.45, tone(col, 0.12)); gr.addColorStop(1, tone(col, -0.16));
  g.strokeStyle = gr; g.lineWidth = w; g.lineCap = 'round'; g.shadowColor = 'rgba(30,14,4,0.35)'; g.shadowBlur = 3; g.shadowOffsetY = 1.5; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.shadowColor = 'transparent';
  g.strokeStyle = 'rgba(255,230,190,0.25)'; g.lineWidth = w * 0.25; g.beginPath(); g.moveTo(x0 - w * 0.2, y0); g.lineTo(x1 - w * 0.2, y1); g.stroke();
}
function steel(g, pts) {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const gr = g.createLinearGradient(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)); gr.addColorStop(0, '#f4f2ea'); gr.addColorStop(0.5, '#a9afb4'); gr.addColorStop(1, '#5d646c');
  g.fillStyle = gr; g.shadowColor = 'rgba(20,10,4,0.4)'; g.shadowBlur = 3; g.shadowOffsetY = 1; g.beginPath(); pts.forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b)); g.closePath(); g.fill(); g.shadowColor = 'transparent';
  g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 0.5; g.stroke();
}
function goldBead(g, x, y, r) { const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.4, 0, x, y, r); gr.addColorStop(0, '#fff2bd'); gr.addColorStop(0.5, '#d8a640'); gr.addColorStop(1, '#7c5517'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }

// 전립: 검은 털모자, 넓은 챙, 꼭대기에 술
function jeollip(S, col, tassel, y = -86) {
  felt(S, P([[-13, y - 1], [-11, y - 13], [-4, y - 18], [4, y - 18], [11, y - 13], [13, y - 1]]), col, { fuzz: 0.7 });
  felt(S, E(1, y, 28, 6.5), col, { fuzz: 0.6, ly: 0.1 });
  felt(S, RR(-12, y - 5, 25, 3.6, 1.6), tone(col, 0.05), { shadow: false, fuzz: 0.3 });
  felt(S, P([[-5, y - 17], [5, y - 17], [9, y - 25], [3, y - 30], [-3, y - 30], [-8, y - 25]]), tassel, { fuzz: 1.8, dens: 0.09, fib: 1.4 });
  prop(S, g => { goldBead(g, 0, y - 17.5, 2.2);  });
}
function face(S, hx = 0, hy = -73, r = 18.5) {
  felt(S, E(hx - 14, hy + 1, 4, 5), SKIN, { fuzz: 0.4 });
  felt(S, E(hx, hy, r, r * 0.96), SKIN, { fuzz: 0.5, lx: 0.4, hi: 0.3 });
  bead(S, hx + 5, hy + 1, 2.5); bead(S, hx + 13.5, hy + 1.6, 2.3);
  cheeks(S, hx + 2, hy + 8, hx + 15, hy + 8.5); smile(S, hx + 10, hy + 11, 2.2);
}

function soldier(res, o) {
  const S = sheet(90, 160, res, 0.9), robe = o.robe;
  felt(S, E(-7, -4, 7.5, 5), '#2a2622', { fuzz: 0.4 }); felt(S, E(8, -4, 7.5, 5), '#2a2622', { fuzz: 0.4 });
  felt(S, P([[-13, -24], [13, -24], [14, -7], [-14, -7]]), '#ebe3d2', { fuzz: 0.5 });
  if (o.quiver) { felt(S, P([[-20, -66], [-12, -70], [-6, -30], [-14, -26]]), '#7a4b2a'); for (let k = 0; k < 3; k++) felt(S, P([[-19 + k * 3, -70], [-15 + k * 3, -82], [-13 + k * 3, -70]]), '#f2ede2', { fuzz: 1.3 }); }
  felt(S, E(-13, -45, 6, 11.5, 0.35), tone(robe, -0.06));
  felt(S, P([[-11, -59], [11, -59], [16, -40], [23, -13], [0, -9], [-23, -13], [-16, -40]]), robe, { lo: 0.42 });
  stitch(S, [[3, -56], [6, -40], [9, -12]]);
  felt(S, P([[-9, -59], [-3, -59], [7, -45], [3, -43]]), '#f4efe4', { fuzz: 0.4, sha: 0.2 });
  felt(S, RR(-16, -42, 32, 6, 3), o.belt || '#b4332b', { fuzz: 0.5 });
  prop(S, g => goldBead(g, 4, -39, 2.2));
  face(S);
  felt(S, P([[-18, -74], [-16, -84], [-6, -90], [-10, -80], [-12, -66]]), '#1d1916', { fuzz: 0.9 });
  jeollip(S, o.hat || '#2a2521', o.tassel || '#c33a2f');
  if (o.spear) prop(S, g => { wood(g, 18, -6, 25, -138, 2.6); steel(g, [[24, -137], [27.5, -148], [26.5, -158], [24.2, -164], [22.6, -157], [22.2, -147]]); });
  if (o.spear) felt(S, P([[20, -132], [28, -132], [30, -122], [24, -116], [19, -122]]), '#c8362e', { fuzz: 1.6, dens: 0.08 });
  if (o.bow) prop(S, g => {
    g.strokeStyle = '#3b2416'; g.lineWidth = 3; g.lineCap = 'round'; g.shadowColor = 'rgba(30,14,4,0.35)'; g.shadowBlur = 3; g.shadowOffsetY = 1.5;
    g.beginPath(); g.moveTo(28, -84); g.quadraticCurveTo(22, -78, 26, -70); g.quadraticCurveTo(34, -52, 26, -34); g.quadraticCurveTo(22, -26, 28, -20); g.stroke();
    g.shadowColor = 'transparent'; g.strokeStyle = '#d9b77a'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(27, -78); g.quadraticCurveTo(32, -52, 27, -26); g.stroke();
    g.strokeStyle = 'rgba(250,245,230,0.9)'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(28, -84); g.lineTo(28, -20); g.stroke();
  });
  felt(S, E(12, -45, 6, 11.5, -0.45), robe);
  felt(S, E(18, -37, 4.6, 4.6), SKIN, { fuzz: 0.4 });
  return S;
}

function hero(res) {
  const S = sheet(110, 190, res, 0.9), red = '#a83128';
  felt(S, P([[-14, -64], [-30, -40], [-34, -10], [-18, -12], [-8, -50]]), '#27457a', { lo: 0.45 });
  felt(S, E(-8, -4, 8, 5.5), '#2a2622', { fuzz: 0.4 }); felt(S, E(9, -4, 8, 5.5), '#2a2622', { fuzz: 0.4 });
  felt(S, P([[-14, -26], [14, -26], [15, -7], [-15, -7]]), '#2f4f86');
  felt(S, E(-14, -47, 7, 12, 0.35), '#2f4f86');
  felt(S, P([[-13, -62], [13, -62], [19, -42], [25, -12], [0, -8], [-25, -12], [-19, -42]]), red, { lo: 0.45 });
  prop(S, g => { for (let r = 0; r < 5; r++) for (let c = -2; c <= 2; c++) { const y = -52 + r * 8.5, w = 7 + r * 1.6; goldBead(g, c * w * 0.55 + (r % 2) * 1.5, y, 1.25); } });
  felt(S, RR(-18, -43, 36, 6.5, 3), '#2a2a2e'); prop(S, g => goldBead(g, 0, -39.7, 2.6));
  felt(S, P([[-10, -63], [10, -63], [12, -55], [-12, -55]]), '#27457a', { sha: 0.2 });
  face(S, 0, -76, 18.5);
  felt(S, P([[8, -66], [12, -68], [17, -66], [16, -64.5], [12, -66], [9, -64.5]]), '#2a211c', { fuzz: 0.5, shadow: false });
  // 투구: 둥근 쇠 투구, 금띠, 뒤로 늘어진 붉은 술, 목가리개
  felt(S, P([[-20, -82], [-22, -64], [-14, -52], [-10, -70], [-12, -82]]), '#27457a', { fuzz: 0.5 });
  prop(S, g => { for (let k = 0; k < 3; k++) goldBead(g, -18 + k * 2, -74 + k * 7, 1.2); });
  felt(S, P([[-18, -84], [-16, -98], [-6, -106], [6, -106], [16, -98], [18, -84]]), '#3d424c', { hi: 0.45 });
  felt(S, RR(-19, -88, 38, 5.5, 2.5), '#c79b3c', { hi: 0.5, fuzz: 0.2 });
  felt(S, P([[-6, -103], [-18, -100], [-28, -88], [-30, -76], [-22, -84], [-10, -96]]), '#c8362e', { fuzz: 2, dens: 0.09, fib: 1.5 });
  prop(S, g => { g.fillStyle = '#d6aa48'; g.beginPath(); g.moveTo(-2, -105); g.lineTo(0, -122); g.lineTo(2, -105); g.fill(); goldBead(g, 0, -106, 3); goldBead(g, 0, -121.5, 1.6); });
  felt(S, E(26, -82, 2, 1.4), '#3d424c', { shadow: false });
  prop(S, g => { wood(g, 20, -2, 27, -132, 3, '#6a3d22'); steel(g, [[25, -128], [36, -136], [43, -150], [40, -164], [34, -170], [31, -156], [26, -142], [24, -132]]); g.fillStyle = '#c8a34a'; g.fillRect(23, -130, 5, 4); });
  felt(S, E(14, -48, 7, 12, -0.45), '#2f4f86');
  felt(S, E(20, -39, 5, 5), SKIN, { fuzz: 0.4 });
  return S;
}

function dokkaebi(res, o = {}) {
  const S = sheet(110, 170, res, 0.9), skin = o.skin || '#6d93a0';
  felt(S, E(-9, -4, 9, 5.5), tone(skin, -0.12), { fuzz: 0.5 }); felt(S, E(10, -4, 9, 5.5), tone(skin, -0.12), { fuzz: 0.5 });
  felt(S, P([[-19, -36], [19, -36], [21, -8], [3, -9], [0, -16], [-3, -9], [-21, -8]]), '#8b7a5f', { lo: 0.4 });
  felt(S, RR(-15, -24, 9, 8, 2), '#a8946e', { shadow: false, fuzz: 0.4 }); stitch(S, [[-15, -24], [-6, -24], [-6, -16], [-15, -16], [-15, -24]], 'rgba(60,40,20,0.7)', 0.5, 1.4);
  felt(S, E(-18, -48, 7, 12, 0.4), skin);
  felt(S, E(0, -48, 21, 19), skin, { lo: 0.4 });
  felt(S, P([[-17, -64], [-5, -66], [-1, -36], [-19, -38]]), '#4b3a2c');
  felt(S, P([[6, -66], [17, -60], [19, -38], [7, -36]]), '#4b3a2c');
  felt(S, E(0, -40, 9, 7), tone(skin, 0.08), { shadow: false, fuzz: 0.3 });
  // 머리
  felt(S, L([[-26, -62], [-33, -70], [-27, -76], [-34, -84], [-25, -90], [-28, -100], [-16, -99], [-12, -110], [-3, -102], [4, -112], [10, -101], [20, -106], [20, -96], [29, -94], [24, -86], [12, -90], [0, -92], [-12, -88], [-20, -78]]), '#2b231d', { fuzz: 2.4, dens: 0.09, fib: 1.5 });
  felt(S, E(1, -72, 24, 21), skin, { fuzz: 0.5, hi: 0.3 });
  felt(S, L([[4, -91], [10, -112], [15, -90]]), '#efe0c0', { fuzz: 0.3, hi: 0.5 });
  prop(S, g => { g.strokeStyle = 'rgba(120,90,50,0.6)'; g.lineWidth = 0.6; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(6 + k * 1.2, -96 - k * 5); g.lineTo(13.5 - k * 0.8, -95 - k * 5); g.stroke(); } });
  felt(S, E(7, -74, 6.5, 7), '#f6f1e6', { fuzz: 0.3, sha: 0.2 }); felt(S, E(20, -73, 5.6, 6.4), '#f6f1e6', { fuzz: 0.3, sha: 0.2 });
  bead(S, 8.5, -73, 3.4); bead(S, 21, -72, 3);
  felt(S, P([[1, -84], [12, -83], [13, -80], [2, -80]]), '#2b231d', { fuzz: 1.2, shadow: false }); felt(S, P([[16, -82], [25, -81], [25, -78], [16, -79]]), '#2b231d', { fuzz: 1.2, shadow: false });
  felt(S, E(16, -64, 5, 4), tone(skin, 0.06), { fuzz: 0.3 });
  felt(S, P([[4, -58], [22, -58], [19, -51], [8, -51]]), '#4a1f1c', { fuzz: 0.2, shadow: false });
  felt(S, L([[7, -51.5], [9, -56], [11, -51.5]]), '#fbf6ea', { fuzz: 0, shadow: false }); felt(S, L([[16, -51.5], [18, -56], [20, -51.5]]), '#fbf6ea', { fuzz: 0, shadow: false });
  cheeks(S, 0, -62, 24, -62);
  prop(S, g => {
    g.save(); g.translate(29, -32); g.rotate(0.45);
    const gr = g.createLinearGradient(-8, 0, 8, 0); gr.addColorStop(0, '#5b3a20'); gr.addColorStop(0.5, '#9b6a3c'); gr.addColorStop(1, '#4b2e18');
    g.fillStyle = gr; g.shadowColor = 'rgba(30,14,4,0.4)'; g.shadowBlur = 4; g.shadowOffsetY = 2;
    g.beginPath(); g.moveTo(-2.5, 6); g.lineTo(-8, -46); g.quadraticCurveTo(0, -56, 8, -46); g.lineTo(2.5, 6); g.closePath(); g.fill(); g.shadowColor = 'transparent';
    for (let k = 0; k < 9; k++) { const t = k / 8, y = -10 - t * 34, w = 3 + t * 5; goldBead(g, (k % 2 ? 1 : -1) * w * 0.55, y, 1.3); }
    g.restore();
  });
  felt(S, E(21, -42, 6.5, 11, -0.95), skin);
  felt(S, E(28, -34, 5.5, 5.5), skin, { fuzz: 0.4 });
  return S;
}

function tiger(res) {
  const S = sheet(130, 110, res, 0.9), fur = '#d98432', cream = '#f5e7cf', blk = '#231c17';
  felt(S, P([[-30, -30], [-44, -44], [-50, -58], [-44, -60], [-38, -48], [-26, -36]]), fur, { fuzz: 1.1 });
  for (const [x, y] of [[-42, -47], [-46, -55]]) felt(S, E(x, y, 3.4, 1.4, 0.9), blk, { shadow: false, fuzz: 0.6 });
  felt(S, E(-22, -10, 6, 10), tone(fur, -0.06)); felt(S, E(10, -10, 6, 10), tone(fur, -0.06));
  felt(S, E(-4, -28, 32, 18), fur, { lo: 0.4 });
  felt(S, E(-2, -17, 22, 7), cream, { shadow: false, fuzz: 0.6 });
  for (const [x, y, a] of [[-24, -38, 0.3], [-14, -42, 0.15], [-4, -44, 0], [6, -43, -0.1], [-30, -28, 0.6], [14, -38, -0.25]]) felt(S, L([[x - 2.2, y - 3], [x + 2.2, y - 3], [x + 0.6 + Math.sin(a) * 9, y + 9], [x - 0.4 + Math.sin(a) * 9, y + 9.5]]), blk, { shadow: false, fuzz: 0.5, rim: 0.8 });
  felt(S, E(-16, -8, 6.5, 9), fur); felt(S, E(16, -8, 6.5, 9), fur);
  felt(S, E(-16, -1, 6.5, 3.5), cream, { shadow: false }); felt(S, E(16, -1, 6.5, 3.5), cream, { shadow: false });
  felt(S, E(18, -55, 6, 6), fur); felt(S, E(40, -55, 6, 6), fur);
  felt(S, E(18, -54, 3, 3), cream, { shadow: false }); felt(S, E(40, -54, 3, 3), cream, { shadow: false });
  felt(S, E(29, -40, 19, 17), fur, { hi: 0.35 });
  for (const [x, y, a] of [[24, -54, 0.2], [30, -55, 0], [36, -54, -0.2]]) felt(S, E(x, y, 1.6, 4.5, a), blk, { shadow: false, fuzz: 0.5 });
  felt(S, E(13, -38, 2, 5, 0.9), blk, { shadow: false }); felt(S, E(15, -31, 2, 4.5, 0.9), blk, { shadow: false });
  felt(S, E(35, -32, 11, 8), cream, { shadow: false, fuzz: 0.6 });
  bead(S, 25, -43, 2.6); bead(S, 39, -43, 2.4);
  felt(S, P([[36, -38], [42, -38], [39, -34]]), '#3a2622', { shadow: false, fuzz: 0.2 });
  smile(S, 37, -30, 2.4);
  cheeks(S, 24, -35);
  return S;
}

const MAKERS = {
  hero: r => hero(r),
  spear: r => soldier(r, { robe: '#34548c', spear: true }),
  archer: r => soldier(r, { robe: '#3f6c4e', bow: true, quiver: true, hat: '#3a2c22', tassel: '#2f5aa0', belt: '#d0a245' }),
  dok: r => dokkaebi(r),
  dokR: r => dokkaebi(r, { skin: '#b0634c' }),
  tiger: r => tiger(r),
};
const cache = new Map();
export function unit(kind, res) {
  const k = kind + '@' + res; if (!cache.has(k)) cache.set(k, MAKERS[kind](res));
  return cache.get(k);
}
// 무대 위에 세운다: (x,y)=발 위치, h=화면에서의 단위 크기 배율
export function place(g, kind, x, y, scale, flip = false, res = 4) {
  const S = unit(kind, res), k = scale / S.res;
  g.save(); g.translate(x, y); if (flip) g.scale(-1, 1);
  // 바닥 그림자
  const sw = (kind === 'tiger' ? 44 : 26) * scale;
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, sw); gr.addColorStop(0, 'rgba(30,24,10,0.45)'); gr.addColorStop(1, 'rgba(30,24,10,0)');
  g.fillStyle = gr; g.save(); g.scale(1, 0.32); g.beginPath(); g.arc(0, 0, sw, 0, TAU); g.fill(); g.restore();
  g.drawImage(S.c, -S.ox * k, -S.oy * k, S.c.width * k, S.c.height * k);
  g.restore();
}
