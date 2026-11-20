// 배경: 하늘 → 달 → 먼 시계탑 → 먼 지붕 → 가까운 집 → 놀이 지붕(기와) → 전경 장식
const W = 390, H = 593, RIDGE = 186;

function cloud(x, y, s, col, colS) {
  const p = spline([[-40, 8], [-34, -4], [-20, -8], [-12, -20], [4, -22], [16, -12], [28, -14], [40, -2], [44, 8]].map(q => [x + q[0] * s, y + q[1] * s]).concat([[x + 44 * s, y + 9 * s, 1], [x - 40 * s, y + 9 * s, 1]]), true, 8);
  X.save(); X.fill(path(p));
  cel(p, { b: col, s: colS, d: 3 * s, w: 0, lt: 'rgba(255,240,220,.35)', dl: 1.5 });
  X.restore();
}

function house(x, base, w, h, roofH, wall, wallS, roof, roofS, kind, R, lit = 0.6) {
  const top = base - h;
  // 벽
  const wallP = [[x, base], [x, top], [x + w, top], [x + w, base]];
  cel(wallP, { b: wall, s: wallS, d: w * 0.18, ss: 1, w: 1.8, lost: .4 });
  X.save(); X.clip(path(wallP)); X.fillStyle = 'rgba(20,10,40,.3)'; X.fillRect(x, top, w, 5); X.restore();
  // 창문
  const cols = Math.max(1, Math.round(w / 22)), rows = Math.max(1, Math.round(h / 24));
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (R() > lit) continue;
    const wx = x + (c + 0.5) * w / cols, wy = top + 10 + r * 22;
    if (wy > base - 6) continue;
    X.save(); X.shadowColor = 'rgba(255,190,90,.9)'; X.shadowBlur = 8;
    const wp = spline([[wx - 4.5, wy + 6, 1], [wx - 4.5, wy - 2], [wx, wy - 6.5], [wx + 4.5, wy - 2], [wx + 4.5, wy + 6, 1]], true, 5);
    X.fillStyle = '#ffd283'; X.fill(path(wp)); X.restore();
    X.save(); X.clip(path(wp)); X.fillStyle = '#ffb05a'; X.fillRect(wx - 6, wy + 2, 12, 6); X.restore();
    X.strokeStyle = 'rgba(80,40,30,.7)'; X.lineWidth = .9; X.beginPath(); X.moveTo(wx, wy - 6); X.lineTo(wx, wy + 6); X.moveTo(wx - 4.5, wy + 1); X.lineTo(wx + 4.5, wy + 1); X.stroke();
    ink(wp, 1.4, 'rgba(30,20,40,.8)', .5);
  }
  // 지붕
  let rp;
  if (kind === 0) rp = [[x - 5, top + 2, 1], [x + w / 2, top - roofH, 1], [x + w + 5, top + 2, 1]];
  else if (kind === 1) rp = [[x - 5, top + 2, 1], [x + w * .1, top - roofH * .5], [x + w / 2, top - roofH], [x + w * .9, top - roofH * .5], [x + w + 5, top + 2, 1]];
  else rp = [[x - 4, top + 2, 1], [x - 2, top - roofH * .6, 1], [x + w / 2, top - roofH, 1], [x + w + 2, top - roofH * .6, 1], [x + w + 4, top + 2, 1]];
  const roofP = spline(rp, true, 8, .5);
  cel(roofP, { b: roof, s: roofS, d: w * 0.12, ss: 1, w: 2, r: 'rgba(255,200,150,.5)', dr: 1, f: () => {
    X.strokeStyle = 'rgba(20,10,40,.28)'; X.lineWidth = .9;
    for (let yy = top - roofH + 6, r = 0; yy < top + 2; yy += 5, r++) { X.beginPath(); for (let xx = x - 6 + (r % 2) * 3; xx < x + w + 6; xx += 6) { X.moveTo(xx + 6, yy); X.arc(xx + 3, yy, 3, 0, Math.PI); } X.stroke(); }
  } });
  // 지붕 끝 장식 공
  if (kind !== 1) cel(ell(x + w / 2, top - roofH - 2, 2.6, 2.6), { b: '#f0c860', s: '#b58a3a', d: .8, w: 1.2 });
}

function clockTower(cx) {
  const top = 48, base = 210, w = 62;
  // 몸통
  const body = [[cx - w / 2, base], [cx - w / 2 + 2, top + 30], [cx + w / 2 - 2, top + 30], [cx + w / 2, base]];
  cel(body, { b: '#8a7fb0', s: '#5f5688', d: 14, ss: 1, w: 2, r: 'rgba(255,230,190,.5)', dr: 1.2 });
  X.save(); X.clip(path(body));
  X.fillStyle = 'rgba(60,50,100,.25)'; for (let y = top + 44; y < base; y += 9) X.fillRect(cx - w / 2, y, w, 1.2);
  X.restore();
  // 처마
  cel(spline([[cx - w / 2 - 8, top + 32, 1], [cx - w / 2 - 6, top + 24, 1], [cx + w / 2 + 6, top + 24, 1], [cx + w / 2 + 8, top + 32, 1]], true, 4), { b: '#5f5688', s: '#463f6a', d: 3, w: 2 });
  // 뾰족 지붕
  const roof = spline([[cx - w / 2 - 4, top + 25, 1], [cx - w * .28, top + 2], [cx - 4, top - 34], [cx, top - 44, 1], [cx + 4, top - 34], [cx + w * .28, top + 2], [cx + w / 2 + 4, top + 25, 1]], true, 8);
  cel(roof, { b: '#6b5aa0', s: '#4a3d78', d: 10, ss: 1, w: 2.2, r: 'rgba(255,220,180,.55)', dr: 1.2, h: [[cx + 8, top - 6, 2, 10, .25, 'rgba(255,255,255,.25)']] });
  cel(ell(cx, top - 46, 3.4, 3.4), { b: '#f0c860', s: '#b58a3a', d: 1, w: 1.4 });
  // 시계판(빛남)
  const fy = top + 62;
  X.save(); X.shadowColor = 'rgba(255,220,140,.95)'; X.shadowBlur = 22; dot(cx, fy, 21, '#fff2cc'); X.restore();
  cel(ell(cx, fy, 21, 21), { b: '#fff4d6', s: '#f0d39a', d: 3, w: 2.4, f: () => { const g = X.createRadialGradient(cx - 4, fy - 6, 2, cx, fy, 22); g.addColorStop(0, 'rgba(255,255,255,.8)'); g.addColorStop(1, 'rgba(255,255,255,0)'); X.fillStyle = g; X.fillRect(cx - 22, fy - 22, 44, 44); } });
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; const r0 = i % 3 ? 16 : 14.5; stroke([[cx + Math.cos(a) * r0, fy + Math.sin(a) * r0], [cx + Math.cos(a) * 18.4, fy + Math.sin(a) * 18.4]], i % 3 ? 1.1 : 1.8, '#6a4e3a', 0, 0); }
  stroke([[cx, fy], [cx + Math.cos(-2.2) * 10, fy + Math.sin(-2.2) * 10]], 2.4, '#3a2a2a', 0, .4);
  stroke([[cx, fy], [cx + Math.cos(-0.4) * 14, fy + Math.sin(-0.4) * 14]], 1.8, '#3a2a2a', 0, .4);
  stroke([[cx - Math.cos(1.05) * 4, fy - Math.sin(1.05) * 4], [cx + Math.cos(1.05) * 17, fy + Math.sin(1.05) * 17]], .9, '#c0392b', 0, .2);
  dot(cx, fy, 1.8, '#3a2a2a');
}

function tileRows() {
  const rows = []; let y = RIDGE + 6, h = 11.5;
  while (y < H + 20) { rows.push({ y, h }); y += h; h *= 1.047; }
  return rows;
}

function drawWorld(opt = {}) {
  const R = mkR(11);
  // 하늘
  let g = X.createLinearGradient(0, 0, 0, RIDGE + 20);
  g.addColorStop(0, '#26306a'); g.addColorStop(.45, '#4a5aa0'); g.addColorStop(.8, '#8f8cc4'); g.addColorStop(1, '#e7b9b0');
  X.fillStyle = g; X.fillRect(0, 0, W, RIDGE + 20);
  for (let i = 0; i < 34; i++) { const x = R() * W, y = R() * 140, r = R() * 1.1 + .3; dot(x, y, r, `rgba(255,250,230,${.35 + R() * .5})`); }
  // 달
  const mx = 312, my = 86;
  g = X.createRadialGradient(mx, my, 20, mx, my, 130); g.addColorStop(0, 'rgba(255,240,200,.55)'); g.addColorStop(1, 'rgba(255,240,200,0)');
  X.fillStyle = g; X.fillRect(0, 0, W, 260);
  cel(ell(mx, my, 33, 33), { b: '#fff6dc', s: '#f1dcaa', d: 6, w: 0, h: [] });
  oval(mx - 10, my + 6, 7, 5, 'rgba(225,200,150,.35)'); oval(mx + 9, my - 10, 4.5, 3.5, 'rgba(225,200,150,.3)'); oval(mx + 12, my + 12, 3, 2.4, 'rgba(225,200,150,.3)');
  // 구름(만화 구름 띠)
  cloud(58, 132, 1.25, '#a49cd0', '#7f78b0');
  cloud(250, 150, 1.0, '#b4a8d6', '#8c84ba');
  cloud(372, 120, 0.8, '#b4a8d6', '#8c84ba');
  // 먼 시계탑
  X.filter = 'blur(.45px)';
  clockTower(96);
  // 먼 지붕 실루엣
  const fr = mkR(5);
  X.save();
  for (let x = -20; x < W + 20;) {
    const w = 24 + fr() * 22, h = 14 + fr() * 26, base = RIDGE - 4;
    const p = [[x, base], [x, base - h], [x + w / 2, base - h - 10 - fr() * 8], [x + w, base - h], [x + w, base]];
    X.fillStyle = '#6d6aa6'; X.fill(path(p));
    X.fillStyle = 'rgba(255,220,180,.35)'; X.beginPath(); X.moveTo(p[2][0], p[2][1]); X.lineTo(p[3][0], p[3][1]); X.lineTo(p[3][0] - 2, p[3][1] + 2); X.lineTo(p[2][0], p[2][1] + 2.5); X.fill();
    if (fr() < .7) dot(x + w * (.3 + fr() * .4), base - h + 8 + fr() * 6, 1.5, 'rgba(255,214,140,.85)');
    x += w - 2;
  }
  X.restore();
  // 가까운 집들
  const hr = mkR(23);
  const hs = [
    [-14, 64, 46, 22, '#7fb6c9', '#5a8aa6', '#b4566a', '#7f3550', 0],
    [158, 52, 40, 20, '#f0b866', '#c48848', '#5b4a8a', '#3d3168', 1],
    [206, 46, 54, 18, '#e98f7b', '#b8645a', '#3f5a8a', '#2b3f68', 2],
    [262, 58, 34, 24, '#b9a3dc', '#8c76b4', '#b4566a', '#7f3550', 0],
    [326, 70, 48, 20, '#86c5a4', '#5f9a7e', '#5b4a8a', '#3d3168', 1],
  ];
  for (const [x, w, h, rh, a, b, c, d, k] of hs) {
    if (k !== 1 && hr() < 1) { cel([[x + w * .7, RIDGE - h - rh + 4], [x + w * .7, RIDGE - h - rh - 14], [x + w * .7 + 9, RIDGE - h - rh - 14], [x + w * .7 + 9, RIDGE - h - rh + 8]], { b: '#9a6a5a', s: '#6e4a44', d: 3, ss: 1, w: 1.6 }); }
    house(x, RIDGE + 2, w, h, rh, a, b, c, d, k, hr, .7);
  }
  // 깃발 줄(번팅)
  const bx0 = 128, by0 = 104, bx1 = 262, by1 = 120;
  const sag = t => [lerp(bx0, bx1, t), lerp(by0, by1, t) + Math.sin(t * Math.PI) * 18];
  const bl = []; for (let i = 0; i <= 20; i++) bl.push(sag(i / 20));
  taper(bl, 1, 'rgba(40,30,60,.8)', 0, 0, .9);
  const fc = ['#ffd35c', '#e2525c', '#2fd8cb', '#ffffff', '#b38be0'];
  for (let i = 1; i < 10; i++) { const [x, y] = sag(i / 10); const p = spline([[x - 4, y, 1], [x + 4, y, 1], [x + .5, y + 9, 1]], true, 3, .2); cel(p, { b: fc[i % 5], s: 'rgba(0,0,0,.2)', d: 1.5, w: 1.1 }); }

  X.filter = 'none';
  // ── 놀이 지붕(기와) ──
  const rows = tileRows();
  const TR = mkR(3);
  X.fillStyle = '#7a3f45'; X.fillRect(0, RIDGE, W, H - RIDGE);
  for (let ri = rows.length - 1; ri >= 0; ri--) {
    const { y, h } = rows[ri], tw = h * 2.05, off = (ri % 2) * tw / 2;
    // 윗줄이 아랫줄에 드리우는 그림자
    X.fillStyle = 'rgba(40,10,30,.26)';
    for (let x = -tw + off; x < W + tw; x += tw) { X.beginPath(); X.ellipse(x + tw / 2, y + h * .95, tw * .5, h * .55, 0, 0, Math.PI); X.fill(); }
    for (let x = -tw + off; x < W + tw; x += tw) {
      const v = TR();
      const base = v < .18 ? '#c45e55' : v < .3 ? '#d98a5f' : '#cf6c58';
      const p = new Path2D(); p.moveTo(x + 1, y - h * .4); p.lineTo(x + 1, y + h * .35);
      p.ellipse(x + tw / 2, y + h * .35, tw / 2 - 1, h * .55, 0, Math.PI, 0, true);
      p.lineTo(x + tw - 1, y - h * .4); p.closePath();
      const gg = X.createLinearGradient(0, y - h * .4, 0, y + h * .9);
      gg.addColorStop(0, '#8e4249'); gg.addColorStop(.5, base); gg.addColorStop(1, base);
      X.fillStyle = gg; X.fill(p);
      // 오른쪽 위 달빛 반사
      X.save(); X.clip(p); X.fillStyle = 'rgba(255,215,190,.13)'; X.beginPath(); X.ellipse(x + tw * .7, y + h * .2, tw * .16, h * .5, 0, 0, TAU); X.fill(); X.restore();
      // 테두리 붓선(아래쪽 굵게)
      const arc = []; for (let i = 0; i <= 12; i++) { const a = Math.PI - i / 12 * Math.PI; arc.push([x + tw / 2 + Math.cos(a) * (tw / 2 - 1), y + h * .35 + Math.sin(a) * h * .55]); }
      taper(arc, Math.min(1.8, h * .1), 'rgba(60,15,30,.5)', .45, .45);
    }
  }
  // 용마루(지붕 꼭대기)
  const rg = [[-10, RIDGE - 5], [W + 10, RIDGE - 5], [W + 10, RIDGE + 8], [-10, RIDGE + 8]];
  cel(rg, { b: '#a8505a', s: '#76343f', d: 5, ss: 1, w: 2.2, f: () => { X.fillStyle = 'rgba(255,220,200,.35)'; X.fillRect(-10, RIDGE - 5, W + 20, 2.2); } });
  for (let x = 8; x < W; x += 26) cel(ell(x, RIDGE + 1.5, 6.2, 6), { b: '#b85a62', s: '#80384a', d: 2, w: 1.7, h: [[x + 2, RIDGE - 1.5, 1.8, 1, 0, 'rgba(255,220,210,.6)']] });

  // 오른쪽 굴뚝(궁수 자리)
  const cx = 352, ct = 338;
  oval(cx + 2, ct + 66, 34, 8, 'rgba(30,10,30,.35)');
  cel([[cx - 22, ct + 66], [cx - 22, ct], [cx + 24, ct], [cx + 24, ct + 66]], {
    b: '#b56b5a', s: '#844a44', d: 12, ss: 1, w: 2.4, f: () => {
      for (let yy = ct + 8, r = 0; yy < ct + 66; yy += 10, r++) for (let xx = cx - 22 + (r % 2) * 8; xx < cx + 24; xx += 16) { X.fillStyle = 'rgba(70,25,30,.35)'; X.fillRect(xx, yy, 15, 1.3); X.fillRect(xx + 14, yy - 9, 1.3, 9); }
    }
  });
  cel([[cx - 27, ct + 8], [cx - 27, ct - 4], [cx + 29, ct - 4], [cx + 29, ct + 8]], { b: '#8f5048', s: '#6a3838', d: 4, ss: 1, w: 2.2, f: () => { X.fillStyle = 'rgba(255,210,190,.35)'; X.fillRect(cx - 27, ct - 4, 56, 2); } });

  // 지붕 위 달빛 웅덩이 + 비네트
  X.save(); X.globalCompositeOperation = 'soft-light';
  g = X.createRadialGradient(205, 330, 30, 205, 330, 260); g.addColorStop(0, 'rgba(255,240,220,.75)'); g.addColorStop(1, 'rgba(255,240,220,0)');
  X.fillStyle = g; X.fillRect(0, RIDGE, W, H - RIDGE); X.restore();
  g = X.createLinearGradient(0, RIDGE, 0, RIDGE + 60); g.addColorStop(0, 'rgba(30,20,60,.35)'); g.addColorStop(1, 'rgba(30,20,60,0)');
  X.fillStyle = g; X.fillRect(0, RIDGE + 8, W, 60);
}

function puffCloud(list, base, shade, inkc) {
  const U = (dx = 0, dy = 0, dr = 0) => { const P = new Path2D(); for (const [x, y, r] of list) { P.moveTo(x + dx + r + dr, y + dy); P.arc(x + dx, y + dy, r + dr, 0, TAU); } return P; };
  X.fillStyle = inkc; X.fill(U(-LX * .6, -LY * .6, 1.3));
  X.fillStyle = base; X.fill(U());
  X.save(); X.clip(U()); X.fillStyle = shade; X.fill(U()); X.fillStyle = base; X.fill(U(LX * 2.6, LY * 2.6, .4));
  X.fillStyle = 'rgba(255,255,255,.7)'; for (const [x, y, r] of list) { X.beginPath(); X.ellipse(x + r * .35, y - r * .45, r * .3, r * .16, -.5, 0, TAU); X.fill(); }
  X.restore();
}

// 전경 장식: 왼쪽 아래 굴뚝 단지 + 멈춘 연기, 오른쪽 아래 바람개비
function drawForeground(frozen = true) {
  X.save();
  const bx = 22, by = 590;
  // 멈춘 연기: 외곽선 없이 부드럽게, 위로 갈수록 옅게
  const puffs = [[bx - 2, by - 62, 7], [bx + 4, by - 74, 8.5], [bx + 14, by - 88, 9.5], [bx + 27, by - 100, 8], [bx + 39, by - 108, 6], [bx + 49, by - 112, 4]];
  puffs.forEach(([x, y, r], i) => {
    const gg = X.createRadialGradient(x - r * .3, y - r * .4, r * .1, x, y, r * 1.1);
    gg.addColorStop(0, `rgba(245,244,255,${.85 - i * .1})`); gg.addColorStop(.7, `rgba(205,202,230,${.75 - i * .1})`); gg.addColorStop(1, `rgba(170,168,205,${.0})`);
    X.fillStyle = gg; X.beginPath(); X.arc(x, y, r * 1.12, 0, TAU); X.fill();
  });
  stroke([[bx + 5, by - 80], [bx + 11, by - 89], [bx + 18, by - 86]], 1, 'rgba(130,120,170,.5)', .3, .3);
  X.filter = 'blur(.6px)';
  for (const [x, w, h] of [[bx - 22, 30, 50], [bx + 10, 23, 33]]) {
    const body = spline([[x + 2, H + 6, 1], [x + 4, by - h + 6, 1], [x + w / 2, by - h + 8], [x + w - 4, by - h + 6, 1], [x + w - 2, H + 6, 1]], true, 6);
    cel(body, { b: '#5a3440', s: '#3a2030', d: 8, ss: 1, w: 2.4, r: 'rgba(255,200,180,.75)', dr: 1.6, f: () => { X.fillStyle = 'rgba(30,10,20,.35)'; for (let yy = by - h + 16; yy < H; yy += 9) X.fillRect(x, yy, w, 1.4); } });
    const lip = spline([[x - 3, by - h + 9, 1], [x - 4, by - h - 1], [x + w / 2, by - h - 4], [x + w + 4, by - h - 1], [x + w + 3, by - h + 9, 1]], true, 6);
    cel(lip, { b: '#7a4650', s: '#4e2a36', d: 3, w: 2.2, r: 'rgba(255,210,190,.8)', dr: 1.2 });
    oval(x + w / 2, by - h - 1, w / 2 - 1, 2.6, '#1e1018');
  }
  X.filter = 'none';
  // 바람개비(장난감 마을)
  const px = 368, py = 486;
  X.filter = 'blur(.5px)';
  cel(capsule([[px, py], [px + 3, H + 8]], 5.5), { b: '#e8d6b0', s: '#a88e68', d: 1.8, w: 2.2, r: 'rgba(255,240,210,.8)', dr: 1 });
  const pc = ['#2fd8cb', '#ffd35c', '#e2525c', '#b38be0'];
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * TAU + .3, c = Math.cos(a), s = Math.sin(a), P = (u, v) => [px + c * u - s * v, py + s * u + c * v];
    cel(spline([P(1, 1), P(22, -4), P(30, 4, 1), P(24, 12), P(8, 6)], true, 6, .45), { b: pc[i], s: 'rgba(0,0,0,.28)', d: 3, w: 2.2, h: [[...P(18, -1), 4, 1.3, a, 'rgba(255,255,255,.5)']] });
  }
  cel(ell(px, py, 4.5, 4.5), { b: '#fff4d6', s: '#c8b088', d: 1.4, w: 1.8 });
  X.filter = 'none';
  X.restore();
}
