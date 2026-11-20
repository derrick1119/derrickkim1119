// 본 장면(느린 시간) + HUD + 아래 띠 두 컷
const S = setup('scene', W, H);
const HERO = [198, 522], START = [196, 478], CORNER = [70, 370], END = [340, 116];
const along = t => [lerp(CORNER[0], END[0], t), lerp(CORNER[1], END[1], t)];
const TARGETS = [[.27, 'shield', .8], [.52, 'sword', .76], [.77, 'sword', .71]].map(([t, type, s]) => { const [x, y] = along(t); return { x, y: y + 34 * s, type, s }; });

// 1) 색이 빠진 세상(배경 + 겨누지 않은 적 + 전경) — 오프스크린에 그린 뒤 채도를 뺀다
const [wc, wx] = offscreen(W, H); X = wx;
drawWorld();
drawSoldier(48, 226, .6, 'sword', {});
drawSoldier(350, 338, .72, 'archer', { flip: -1, aim: .82 });
drawForeground();
const [cc, cx] = offscreen(W, H); X = cx; drawWorld(); drawForeground(); // 컬러판(벤 직후 컷용)

X = S;
let g;
X.save(); X.filter = 'saturate(.3) brightness(.98) contrast(1.02)'; X.drawImage(wc, 0, 0, W, H); X.restore();
X.save(); X.globalCompositeOperation = 'color';
g = X.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(58,84,140,.62)'); g.addColorStop(.35, 'rgba(78,104,150,.55)'); g.addColorStop(1, 'rgba(70,96,128,.5)');
X.fillStyle = g; X.fillRect(0, 0, W, H); X.restore();
X.save(); X.globalCompositeOperation = 'multiply'; X.fillStyle = 'rgba(176,192,222,.55)'; X.fillRect(0, 0, W, H); X.restore();
X.save(); X.globalCompositeOperation = 'screen';
g = X.createRadialGradient(250, 250, 10, 230, 290, 250); g.addColorStop(0, 'rgba(120,150,190,.42)'); g.addColorStop(1, 'rgba(120,150,190,0)');
X.fillStyle = g; X.fillRect(0, 0, W, H);
g = X.createRadialGradient(312, 86, 20, 312, 86, 170); g.addColorStop(0, 'rgba(200,215,240,.35)'); g.addColorStop(1, 'rgba(200,215,240,0)');
X.fillStyle = g; X.fillRect(0, 0, W, 300); X.restore();
g = X.createLinearGradient(0, RIDGE - 10, 0, RIDGE + 120); g.addColorStop(0, 'rgba(150,175,215,.30)'); g.addColorStop(1, 'rgba(150,175,215,0)');
X.save(); X.globalCompositeOperation = 'screen'; X.fillStyle = g; X.fillRect(0, RIDGE - 10, W, 130); X.restore();
g = X.createLinearGradient(0, 380, 0, H); g.addColorStop(0, 'rgba(16,26,52,0)'); g.addColorStop(1, 'rgba(16,26,52,.35)');
X.fillStyle = g; X.fillRect(0, 380, W, H - 380);
// 청회색 비네트 + 가장자리 청록 기운
g = X.createRadialGradient(200, 330, 150, 200, 330, 420);
g.addColorStop(0, 'rgba(20,40,70,0)'); g.addColorStop(1, 'rgba(14,30,56,.55)');
X.fillStyle = g; X.fillRect(0, 0, W, H);

X.save(); X.globalCompositeOperation = 'screen'; X.translate(HERO[0], HERO[1]); X.scale(1, .42);
g = X.createRadialGradient(0, 0, 4, 0, 0, 120); g.addColorStop(0, 'rgba(60,200,200,.5)'); g.addColorStop(1, 'rgba(60,200,200,0)');
X.fillStyle = g; X.fillRect(-130, -130, 260, 260); X.restore();
// 2) 멈춘 초침 다이얼(주인공 발밑)
X.save(); X.translate(HERO[0], HERO[1]);
for (let i = 0; i < 60; i++) {
  const a = i / 60 * TAU, big = i % 5 === 0, r0 = big ? .84 : .9;
  X.strokeStyle = `rgba(90,245,232,${big ? .55 : .3})`; X.lineWidth = big ? 1.6 : 1;
  X.beginPath(); X.moveTo(Math.cos(a) * 62 * r0, Math.sin(a) * 19 * r0); X.lineTo(Math.cos(a) * 62, Math.sin(a) * 19); X.stroke();
}
X.restore();

// 3) 위험: 궁수 조준 점선(빨강만)
{
  const a = [322, 318], b = [212, 470], n = 22;
  for (let i = 2; i <= n; i++) { const t = i / n; dot(lerp(a[0], b[0], t), lerp(a[1], b[1], t), 1.7, `rgba(255,70,70,${.35 + .65 * t})`); }
  X.save(); X.strokeStyle = '#ff4a4a'; X.lineWidth = 1.8; X.beginPath(); X.arc(b[0], b[1], 6.5, 0, TAU); X.stroke();
  for (let k = 0; k < 4; k++) { const an = k * Math.PI / 2 + .78; X.beginPath(); X.moveTo(b[0] + Math.cos(an) * 8.5, b[1] + Math.sin(an) * 8.5); X.lineTo(b[0] + Math.cos(an) * 12, b[1] + Math.sin(an) * 12); X.stroke(); }
  X.restore();
}

// 4) 겨눈 적 셋(색이 남음) — 레이어에 그린 뒤 청록 가장자리 빛
const [ec, ex] = offscreen(W, H); X = ex;
for (const e of [...TARGETS].sort((p, q) => p.y - q.y)) {
  X.strokeStyle = 'rgba(90,245,232,.75)'; X.lineWidth = 1.4; X.beginPath(); X.ellipse(e.x, e.y + 1, 25 * e.s, 6.5 * e.s, 0, 0, TAU); X.stroke();
  drawSoldier(e.x, e.y, e.s, e.type, { mouth: e.type === 'shield' ? 'o' : '' });
}
X = S; X.save(); X.shadowColor = 'rgba(110,255,240,.55)'; X.shadowBlur = 10; X.drawImage(ec, 0, 0, W, H); X.restore();

// 5) 그은 획: 손가락 떨림이 남은 붓선, 한 번 꺾임
function strokePath() {
  const pts = [];
  const seg = (a, b) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.ceil(L / 2); for (let i = 0; i < n; i++) pts.push([lerp(a[0], b[0], i / n), lerp(a[1], b[1], i / n)]); };
  seg(START, CORNER); seg(CORNER, END); pts.push(END);
  const out = pts.map((p, i) => { let x = 0, y = 0, c = 0; for (let k = -4; k <= 4; k++) { const q = pts[Math.max(0, Math.min(pts.length - 1, i + k))]; x += q[0]; y += q[1]; c++; } return [x / c, y / c]; });
  const T = tangents(out, false);
  return out.map((p, i) => { const w = Math.sin(i * .045) * 1.2 + Math.sin(i * .13) * .5; return [p[0] - T[i][1] * w, p[1] + T[i][0] * w]; });
}
const SP = strokePath();
X.save(); X.shadowColor = 'rgba(70,255,235,.95)'; X.shadowBlur = 16; taper(SP, 8, 'rgba(60,230,220,.45)', .05, .22); X.restore();
taper(SP, 4.6, '#43eadc', .05, .22);
taper(SP, 1.8, '#ffffff', .07, .28);

// 6) 주인공(색 + 청록 오라)
g = X.createRadialGradient(HERO[0], HERO[1] - 40, 4, HERO[0], HERO[1] - 40, 70);
g.addColorStop(0, 'rgba(80,240,225,.28)'); g.addColorStop(1, 'rgba(80,240,225,0)');
X.fillStyle = g; X.fillRect(HERO[0] - 80, HERO[1] - 120, 160, 140);
const [hc, hx] = offscreen(W, H); X = hx; drawHero(HERO[0], HERO[1], .84, -1, 'ready', { wave: 2 });
X = S; X.save(); X.shadowColor = 'rgba(110,255,240,.6)'; X.shadowBlur = 8; X.drawImage(hc, 0, 0, W, H); X.restore();

// 7) HUD: 얇은 게이지 + 별 칩
{
  const y = 16;
  X.fillStyle = 'rgba(10,18,40,.55)'; X.beginPath(); X.roundRect(12, y - 9, 208, 18, 9); X.fill();
  X.strokeStyle = 'rgba(255,255,255,.14)'; X.lineWidth = 1; X.stroke();
  X.fillStyle = 'rgba(255,255,255,.12)'; X.beginPath(); X.roundRect(34, y - 3, 178, 6, 3); X.fill();
  g = X.createLinearGradient(34, 0, 160, 0); g.addColorStop(0, '#22b8cc'); g.addColorStop(1, '#6ff5e6');
  X.save(); X.shadowColor = 'rgba(80,255,235,.8)'; X.shadowBlur = 6; X.fillStyle = g; X.beginPath(); X.roundRect(34, y - 3, 128, 6, 3); X.fill(); X.restore();
  X.fillStyle = 'rgba(255,255,255,.55)'; X.fillRect(36, y - 2.2, 122, 1.2);
  // 회중시계 아이콘
  cel(ell(23, y, 7, 7), { b: '#3fe9dc', s: '#169fa8', d: 1.6, w: 1.4 }); cel(ell(23, y - 8.2, 1.8, 1.4), { b: '#3fe9dc', w: 1 });
  dot(23, y, 4.4, '#0f2a44'); X.strokeStyle = '#bffff8'; X.lineWidth = 1.2; X.beginPath(); X.moveTo(23, y); X.lineTo(23, y - 3.2); X.moveTo(23, y); X.lineTo(25.2, y + .8); X.stroke();
  X.fillStyle = 'rgba(10,18,40,.55)'; X.beginPath(); X.roundRect(300, y - 10, 78, 20, 10); X.fill(); X.strokeStyle = 'rgba(255,255,255,.14)'; X.stroke();
  for (let i = 0; i < 3; i++) {
    const p = starPts(318 + i * 21, y + .5, 7.2, .5);
    if (i === 0) cel(p, { b: '#ffd35c', s: '#d8962c', d: 1.6, w: 1.3, h: [[315.5, y - 2, 1.6, 1, -.5]] });
    else { X.fillStyle = 'rgba(255,255,255,.08)'; X.fill(path(p)); X.strokeStyle = 'rgba(255,255,255,.35)'; X.lineWidth = 1.1; X.stroke(path(p)); }
  }
}

// ── 아래 띠 1: 벤 직후(시간이 돌아와 색이 돌아옴) ──
{
  const PW = 181, PH = 120, P1 = setup('p1', PW, PH); X = P1;
  X.save(); X.filter = 'blur(1.2px)'; X.drawImage(cc, 196 * 2, 110 * 2, 150 * 2, 99 * 2, -4, -4, PW + 8, PH + 8); X.restore();
  g = X.createLinearGradient(0, 0, 0, PH); g.addColorStop(0, 'rgba(10,10,30,.05)'); g.addColorStop(1, 'rgba(10,10,30,.3)'); X.fillStyle = g; X.fillRect(0, 0, PW, PH);
  const SX = 116, SY = 116, SS = .9;
  const [sc, sx] = offscreen(PW, PH); X = sx; drawSoldier(SX, SY, SS, 'sword', { mouth: 'o', noShadow: true });
  X = P1; oval(SX, SY, 24, 5, 'rgba(8,10,30,.35)');
  const a = -.32, d = [Math.cos(a), Math.sin(a)], nrm = [d[1], -d[0]], C = [SX, SY - 38 * SS];
  const halfP = (up, off = 0) => { const L = 400, q = up ? 1 : -1; const P = new Path2D(); const c0 = [C[0] + nrm[0] * off, C[1] + nrm[1] * off]; P.moveTo(c0[0] - d[0] * L, c0[1] - d[1] * L); P.lineTo(c0[0] + d[0] * L, c0[1] + d[1] * L); P.lineTo(c0[0] + d[0] * L + nrm[0] * L * q, c0[1] + d[1] * L + nrm[1] * L * q); P.lineTo(c0[0] - d[0] * L + nrm[0] * L * q, c0[1] - d[1] * L + nrm[1] * L * q); P.closePath(); return P; };
  const [kc, kx] = offscreen(PW, PH); kx.drawImage(sc, 0, 0, PW, PH); kx.globalCompositeOperation = 'source-in'; kx.fillStyle = '#ffe6bd'; kx.fillRect(0, 0, PW, PH);
  // 아랫부분 + 밝은 나무 단면
  X.save(); X.clip(halfP(false)); X.drawImage(sc, 0, 0, PW, PH); X.restore();
  X.save(); X.clip(halfP(false)); X.clip(halfP(true, -4.5)); X.drawImage(kc, 0, 0, PW, PH);
  X.strokeStyle = 'rgba(180,120,70,.6)'; X.lineWidth = .8; X.beginPath(); X.moveTo(C[0] - d[0] * 40 - nrm[0] * 2.4, C[1] - d[1] * 40 - nrm[1] * 2.4); X.lineTo(C[0] + d[0] * 40 - nrm[0] * 2.4, C[1] + d[1] * 40 - nrm[1] * 2.4); X.stroke(); X.restore();
  // 윗부분: 툭 떠오르며 옆으로 기울어짐
  const LIFT = 14;
  X.save(); X.translate(nrm[0] * LIFT + d[0] * 5, nrm[1] * LIFT + d[1] * 5); X.translate(C[0], C[1]); X.rotate(.2); X.translate(-C[0], -C[1]);
  X.clip(halfP(true)); X.drawImage(sc, 0, 0, PW, PH); X.restore();
  // 톱니·스프링 퐁 (틈에서 튀어나옴)
  const G = (k, m) => [C[0] + d[0] * k + nrm[0] * m, C[1] + d[1] * k + nrm[1] * m];
  const g1 = G(-20, 9), g2 = G(18, 12);
  cel(gearPts(g1[0], g1[1], 7.5, 8, .2), { b: '#e9b85a', s: '#a87a30', d: 1.6, w: 1.6, h: [[g1[0] + 2, g1[1] - 3, 2, 1, -.5]] }); dot(g1[0], g1[1], 2.2, '#5a3a20');
  cel(gearPts(g2[0], g2[1], 5.2, 7, .5), { b: '#c9d3de', s: '#8090a4', d: 1.2, w: 1.4 }); dot(g2[0], g2[1], 1.6, '#3a4456');
  const sp = []; for (let i = 0; i <= 60; i++) { const t = i / 60; const [x, y] = G(-2 + t * 8, 3 + t * 22); sp.push([x + Math.cos(t * TAU * 4) * 3.4, y + Math.sin(t * TAU * 4) * 1.3]); }
  taper(sp, 1.9, '#4e586a', .05, .05); taper(sp.map(p => [p[0] - .5, p[1] - .6]), .7, 'rgba(255,255,255,.8)', .1, .1);
  for (const an of [-2.2, -1.6, -1.0]) { const o = G(-20, 9); stroke([[o[0] + Math.cos(an) * 11, o[1] + Math.sin(an) * 11], [o[0] + Math.cos(an) * 15.5, o[1] + Math.sin(an) * 15.5]], 1.5, 'rgba(255,255,255,.85)', .2, .2); }
  // 절제된 칼빛 한 줄 — 틈 한가운데를 지나 화면 밖으로
  const sl = []; for (let i = 0; i <= 40; i++) { const t = i / 40; sl.push([C[0] + d[0] * lerp(-130, 90, t) + nrm[0] * 6, C[1] + d[1] * lerp(-130, 90, t) + nrm[1] * 6]); }
  X.save(); X.shadowColor = 'rgba(120,255,240,.9)'; X.shadowBlur = 7; taper(sl, 2.4, 'rgba(255,255,255,.96)', .5, .25); X.restore();
}

// ── 아래 띠 2: 초침 클로즈업 ──
{
  const PW = 181, PH = 120, P2 = setup('p2', PW, PH); X = P2;
  g = X.createRadialGradient(80, 50, 10, 90, 60, 140); g.addColorStop(0, '#2a7c8e'); g.addColorStop(.5, '#1d3f6e'); g.addColorStop(1, '#151d44');
  X.fillStyle = g; X.fillRect(0, 0, PW, PH);
  X.save(); X.translate(92, 66);
  for (let i = 0; i < 60; i++) { const an = i / 60 * TAU, big = i % 5 === 0; X.strokeStyle = `rgba(150,255,245,${big ? .35 : .16})`; X.lineWidth = big ? 2 : 1; X.beginPath(); X.moveTo(Math.cos(an) * (big ? 66 : 70), Math.sin(an) * (big ? 66 : 70)); X.lineTo(Math.cos(an) * 75, Math.sin(an) * 75); X.stroke(); }
  X.restore();
  INKS = .62;
  drawHero(104, 200, 1.78, -1, 'grin', { noSword: true, noShadow: true, wave: 3 });
  INKS = 1;
}
