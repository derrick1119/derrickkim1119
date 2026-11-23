// 들판의 갈림길: 행군하던 길이 화면 속에서 두세 갈래로 갈라지고, 갈래 끝에 그곳(장터·주막·대장간·싸움터 …)이 선다.
// 따로 화면을 띄우지 않고 지도 위에서 길 끝을 눌러 고른다 (scenes/run.js 의 forkPick). 바닥과 함께 흐르므로 지나오면 뒤로 사라진다.
// 좌표: 갈림목이 (0, JY) 인 지역 좌표. 화면에서는 갈림목이 x = wx - scroll 에 선다.
import { VIEW, MID_Y } from '../config.js';
import { TAU, INK, makeCanvas, rng, paperSprite } from './draw.js';
import { pal, dab, stroke, mix, tuft } from './painted.js';

export const FORK_JX = 600;          // 갈림길에 닿았을 때 갈림목이 서는 화면 x
const JY = MID_Y, X0 = -520, X1 = 640, Y0 = VIEW.y0 - 10, Y1 = VIEW.y1 + 16, S = 1.5;
export const LM_K = 0.8;            // 갈래 끝 그림(장소)의 크기

// 갈래들: 위 · (가운데) · 아래, 그리고 가끔 오른쪽 아래 수풀로 숨은 길
export function forkLayout(st) {
  const keys = ['a'].concat(st.c ? ['c'] : [], ['b']), three = keys.length === 3;
  // 세 갈래는 위·아래 갈래를 앞으로 당기고 가운데를 멀리 보내 이름표가 겹치지 않게 엇갈려 세운다
  const spots = three ? [[250, 262], [470, 372], [270, 504]] : [[300, 268], [330, 486]];
  const out = keys.map((k, i) => ({ k, type: st[k].type, lx: spots[i][0], ly: spots[i][1] }));
  if (st.h) out.push({ k: 'h', type: 'hidden', lx: 560, ly: VIEW.y1 - 16, hidden: true });
  for (const e of out) e.pts = curve(e);
  return out;
}
// 갈림목에서 갈래 끝으로 휘어 가는 길 (3차 곡선을 고르게 나눈 점들)
function curve(e) {
  const ex = e.lx - (e.hidden ? 20 : 34), ey = e.ly + 6, p = [[0, JY], [e.hidden ? 120 : Math.min(150, ex * 0.4), JY + (e.hidden ? 40 : 0)], [ex - (e.hidden ? 160 : Math.min(210, ex * 0.5)), ey], [ex, ey]], out = [];
  for (let i = 0; i <= 60; i++) { const t = i / 60, u = 1 - t; out.push([u * u * u * p[0][0] + 3 * u * u * t * p[1][0] + 3 * u * t * t * p[2][0] + t * t * t * p[3][0], u * u * u * p[0][1] + 3 * u * u * t * p[1][1] + 3 * u * t * t * p[2][1] + t * t * t * p[3][1]]); }
  return out;
}
// 멀수록(위쪽일수록) 길이 가늘다
const persp = y => 0.74 + 0.36 * (y - VIEW.y0) / (VIEW.y1 - VIEW.y0);

// 붓으로 칠한 흙길 한 갈래: 그늘 · 바탕 · 밝은 가운데 · 수레바퀴 자국 · 길섶의 풀
function paintPath(g, pts, w0, w1, P, R, o = {}) {
  // 눈 덮인 고개에서도 길이 보이도록 흙빛을 섞는다
  const lt = mix(P.sand[0], '#c9a874', 0.4), dk = mix(P.sand[1], '#8a6a42', 0.5), edge = mix(dk, '#3a2a18', 0.5), n = pts.length;
  for (let pass = 0; pass < 3; pass++) for (let i = 0; i < n; i++) {
    const [x, y] = pts[i], t = i / (n - 1), w = (w0 + (w1 - w0) * t) * persp(y), a = (o.fade ? o.fade(x) : 1) * (o.alpha || 1);
    if (a <= 0.01) continue;
    if (pass === 0) dab(g, x + (R() - 0.5) * 3, y + w * 0.1, w * 0.62, w * 0.27, edge, 0.16 * a);
    else if (pass === 1) dab(g, x + (R() - 0.5) * 4, y + (R() - 0.5) * 2, w * 0.54, w * 0.22, dk, 0.34 * a);
    else dab(g, x + (R() - 0.5) * 6, y + (R() - 0.5) * 2, w * 0.34, w * 0.12, lt, 0.26 * a, (R() - 0.5) * 0.3);
  }
  // 수레바퀴 자국 두 줄
  if (!o.thin) for (const s of [-1, 1]) { const q = []; for (let i = 0; i < n; i += 3) { const [x, y] = pts[i], w = (w0 + (w1 - w0) * i / (n - 1)) * persp(y); q.push(x, y + s * w * 0.12); } stroke(g, q, edge, 1.2, 0.22 * (o.alpha || 1)); }
  // 길섶: 가장자리를 풀이 덮는다
  for (let i = 2; i < n; i += o.thin ? 3 : 5) { const [x, y] = pts[i], w = (w0 + (w1 - w0) * i / (n - 1)) * persp(y), a = o.fade ? o.fade(x) : 1; if (a < 0.3) continue; for (const s of [-1, 1]) if (R() < 0.75) tuft(g, x + (R() - 0.5) * 8, y + s * w * 0.26 + 3, 0.7 + R() * 0.4, P, R, P.grass[R() < 0.5 ? 0 : 2]); }
  // 자갈
  for (let i = 0; i < n; i += 4) { if (R() < 0.5) continue; const [x, y] = pts[i]; dab(g, x + (R() - 0.5) * 14, y + (R() - 0.5) * 6, 1.6 + R() * 1.6, 1.1 + R(), mix(P.rock ? P.rock[0] : '#a9a394', '#ffffff', 0.2), 0.7); }
  g.globalAlpha = 1;
}
// 갈림길 바닥 그림 한 장 (한 번만 굽는다)
export function forkArt(theme, st, seed = 7) {
  const P = pal(theme), R = rng(seed), ends = forkLayout(st), w = X1 - X0, h = Y1 - Y0;
  const c = makeCanvas(w * S, h * S), g = c.getContext('2d'); g.scale(S, S); g.translate(-X0, -Y0);
  // 뒤에서 이어 오는 길: 왼쪽 끝은 들판에 스며든다
  const trunk = []; for (let x = X0; x <= 0; x += 8) trunk.push([x, JY]);
  paintPath(g, trunk, 54, 52, P, R, { fade: x => Math.min(1, Math.max(0, (x - X0) / 260)) });
  for (const e of ends) paintPath(g, e.pts, e.hidden ? 20 : 50, e.hidden ? 12 : 34, P, R, e.hidden ? { thin: true, alpha: 0.6 } : {});
  // 갈래 끝: 들어서는 마당 (밟아 다진 흙)
  for (const e of ends) if (!e.hidden) for (let i = 0; i < 26; i++) dab(g, e.lx + (R() - 0.5) * 70, e.ly + 4 + (R() - 0.5) * 16, 10 + R() * 12, 4 + R() * 4, P.sand[R() < 0.5 ? 0 : 1], 0.16);
  g.globalAlpha = 1;
  return { img: c, w, h, x0: X0, y0: Y0, ends, thicket: st.h ? thicketSprite() : null };
}
// 숨은 길 끝의 수풀: 어둠 속에 두 눈이 번득이고 도깨비불이 떠 있다
let TH = null;
function thicketSprite() {
  if (TH) return TH;
  TH = paperSprite(g => {
    const R = rng(91);
    for (let i = 0; i < 70; i++) { const a = R() * Math.PI, d = 20 + R() * 40; dab(g, Math.cos(a) * d * 1.2, -Math.sin(a) * d * 0.9 - 8, 10 + R() * 12, 8 + R() * 9, ['#1e3426', '#2c4a34', '#3e5e44'][(R() * 3) | 0], 0.95); }
    for (let i = 0; i < 26; i++) { const x = (R() - 0.5) * 100; stroke(g, [x, -4, x + (R() - 0.5) * 10, -26 - R() * 24], '#456c4a', 1.6, 0.9); }
    dab(g, 2, -30, 18, 12, '#0c120e', 0.9);
    for (const s of [-1, 1]) { dab(g, 2 + s * 7, -32, 3.2, 2, '#f3d264', 1); dab(g, 2 + s * 7, -32, 1.2, 1.4, '#3a2a10', 1); }
    g.globalAlpha = 1; g.fillStyle = '#9fe0f0'; g.beginPath(); g.ellipse(-34, -62, 5, 7, 0, 0, TAU); g.fill(); g.fillStyle = '#e8f8ff'; g.beginPath(); g.ellipse(-34, -61, 2.4, 3.4, 0, 0, TAU); g.fill();
  }, { w: 170, h: 120, ox: 85, oy: 104, bw: 2 });
  return TH;
}
// 고르는 동안: 마우스가 올라간 갈래는 금빛으로 밝히고, 고른 갈래에는 발자국이 갈림목에서 끝까지 찍혀 나간다
export function drawForkGlow(g, f, ox, T) {
  for (const e of f.art.ends) {
    const on = f.hover === e.k || f.pick === e.k; if (!on) continue;
    const pts = e.pts.map(([x, y]) => [x + ox, y]), a = f.pick ? 1 : 0.65 + 0.2 * Math.sin(T * 5);
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round';
    for (const [lw, al] of [[30, 0.1], [18, 0.16], [8, 0.22]]) { g.strokeStyle = `rgba(255,214,120,${al * a})`; g.lineWidth = lw * persp(pts[pts.length - 1][1]); g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); }
    g.restore();
    // 발자국: 고르면 갈림목에서 끝까지 차례로 찍힌다. 마우스만 올리면 앞으로 흐르는 점선
    const n = pts.length, upto = f.pick ? Math.min(1, f.pickT / 0.6) : 1;
    for (let i = 3; i < n - 2; i += 4) {
      const t = i / (n - 1); if (t > upto) break;
      const [x, y] = pts[i], [x2, y2] = pts[i + 1], ang = Math.atan2(y2 - y, x2 - x), side = (i / 4) % 2 ? 1 : -1, ph = f.pick ? 1 : (Math.sin(T * 6 - i * 0.4) + 1) / 2;
      g.save(); g.translate(x - Math.sin(ang) * side * 5, y + Math.cos(ang) * side * 5); g.rotate(ang); g.globalAlpha = (f.pick ? 0.85 : 0.35 + 0.4 * ph);
      g.fillStyle = f.pick ? '#f0c85a' : '#fff1c2'; g.beginPath(); g.ellipse(0, 0, 4.2, 2.2, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(4.6, 0, 1.6, 1.8, 0, 0, TAU); g.fill(); g.restore();
    }
  }
}
