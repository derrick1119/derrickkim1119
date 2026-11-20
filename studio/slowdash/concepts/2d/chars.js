// 캐릭터: 주인공 '초침'(꼬마 닌자) · 적 '태엽 병정' 3종
const HC = {
  navy: '#2e3c74', navyS: '#1e2852', navyD: '#151c3c', rim: '#62efe4',
  skin: '#ffe3cc', skinS: '#f4b79c', blush: 'rgba(255,112,128,.5)',
  scarf: '#2fd8cb', scarfS: '#159fa8', scarfD: '#0e7486', scarfL: '#c6fff6',
  band: '#4a5c99', bandS: '#34437a', gold: '#ffd35c', goldS: '#d89a2c',
  wrap: '#d4dcf2', wrapS: '#a3aed0', blade: '#f2f9ff', bladeS: '#a8c4de',
};

function heroScarfTails(wave = 0) {
  const t1 = ribbon([[-14, -52], [-32, -62], [-50, -55 + wave], [-68, -66], [-90, -61 - wave]], t => 14 * (1 - t * 0.55), 9);
  const t2 = ribbon([[-14, -47], [-30, -42], [-45, -31], [-62, -37 + wave], [-82, -27]], t => 12.5 * (1 - t * 0.55), 9);
  for (const [t, ctrl] of [[t2, [[-24, -42], [-42, -34], [-60, -36]]], [t1, [[-26, -58], [-46, -56], [-66, -64]]]]) {
    cel(t, { b: HC.scarf, s: HC.scarfS, d: 3.2, r: HC.scarfL, dr: 1, w: 2.2 });
    stroke(ctrl, 1.3, 'rgba(14,90,110,.55)', .4, .6);
  }
}

function heroEye(cx, cy, rx, ry, lx, ly, closedSmile = false) {
  if (closedSmile) { stroke([[cx - rx, cy + 1], [cx, cy - ry * 0.55], [cx + rx, cy + 1]], 2.6, INK, .2, .2); return; }
  const p = ell(cx, cy, rx, ry, 0, 36);
  X.save(); X.fillStyle = '#191b42'; X.fill(path(p)); X.clip(path(p));
  const g = X.createLinearGradient(0, cy - ry, 0, cy + ry); g.addColorStop(0, '#1a2a5e'); g.addColorStop(.55, '#1f7f9a'); g.addColorStop(1, '#5fe6dc');
  X.fillStyle = g; X.beginPath(); X.ellipse(cx + lx, cy + ly + ry * .12, rx * .86, ry * .82, 0, 0, TAU); X.fill();
  dot(cx + lx, cy + ly - ry * .05, rx * .42, '#0d0f2a');
  oval(cx + lx * .4 - rx * .28, cy - ry * .4, rx * .46, ry * .34, '#fff', -0.3);
  dot(cx + lx * .5 + rx * .36, cy + ry * .42, rx * .2, 'rgba(255,255,255,.9)');
  X.restore();
  // 윗눈꺼풀 붓선
  const lid = []; for (let i = 0; i <= 12; i++) { const a = Math.PI * (1.08 + i / 12 * 0.86); lid.push([cx + Math.cos(a) * (rx + .5), cy + Math.sin(a) * (ry + .4)]); }
  taper(lid, 2.4 * INKS, INK, .25, .15);
}

function heroHead(expr = 'ready') {
  const hood = spline([[2, -104], [21, -100], [33, -87], [35, -71], [30, -57], [17, -48], [0, -46], [-18, -49], [-30, -60], [-33, -76], [-27, -92], [-14, -102]]);
  const face = spline([[-12, -84], [6, -87], [24, -84], [31, -73], [29, -60], [19, -52], [5, -50], [-8, -53], [-15, -62], [-17, -74]]);
  const band = spline([[-34, -80], [-18, -90], [2, -94], [22, -92], [35, -85], [36, -77], [22, -83], [3, -85], [-17, -82], [-33, -71]]);
  cel(hood, {
    b: HC.navy, s: HC.navyS, d: 5, ss: 1.04, r: HC.rim, dr: 1.3, w: 2.6,
    f: () => { // 두건 위 천 주름
      stroke([[-24, -94], [-30, -80], [-29, -66]], 1.6, 'rgba(10,14,40,.45)', .3, .5);
      oval(14, -97, 7, 3, 'rgba(160,190,255,.35)', 0.35);
    }
  });
  X.save(); X.clip(path(hood));
  cel(face, { b: HC.skin, s: HC.skinS, d: 2.6, ss: 1.02, w: 1.9, lost: .35 });
  // 두건 그림자가 이마에 드리움
  X.save(); X.clip(path(face)); X.fillStyle = 'rgba(205,120,120,.28)'; X.beginPath(); X.ellipse(8, -86, 28, 6, 0, 0, TAU); X.fill(); X.restore();
  cel(band, { b: HC.band, s: HC.bandS, d: 2.4, r: '#8fb4ff', dr: .9, w: 2.0 });
  X.restore();
  // 매듭(뒤통수)
  cel(ell(-33, -77, 4.2, 3.6, 0.4), { b: HC.band, s: HC.bandS, d: 1.5, w: 1.6 });
  // 금빛 회중시계 문양
  cel(ell(12, -88, 5.6, 5.4), { b: HC.gold, s: HC.goldS, d: 1.6, h: [[10, -90.5, 1.8, 1.1, -0.5]], w: 1.6 });
  cel(ell(12, -88, 3.4, 3.3), { b: '#fff7df', w: 0 });
  cel(ell(12, -94.3, 1.6, 1.2), { b: HC.gold, s: HC.goldS, d: .6, w: 1.0 });
  stroke([[12, -88], [12, -90.6]], 0.9, INK, 0, .3); stroke([[12, -88], [14.2, -87.2]], 0.9, INK, 0, .3);
  // 얼굴
  const lk = expr === 'grin' ? [0.2, -0.3] : [1.1, -1.3];
  if (expr === 'grin') {
    heroEye(-1.5, -69.5, 5.8, 8, ...lk); heroEye(18.5, -69.5, 5.1, 7.7, ...lk);
    stroke([[-8, -79.5], [-2, -81], [4, -79.8]], 2.2, INK, .3, .3);
    stroke([[14, -80], [19.5, -81.2], [25, -79.6]], 2.0, INK, .3, .3);
    const m = spline([[3, -59], [10, -58.2], [17, -59.6], [14.5, -54.2], [9.5, -52.6], [5.2, -54.6]]);
    cel(m, { b: '#7a2238', w: 1.5, f: () => { oval(10, -52.5, 4.4, 2.6, '#ff8fa0'); X.fillStyle = '#fff'; X.beginPath(); X.moveTo(13, -58.6); X.lineTo(15.2, -58.9); X.lineTo(14.2, -56.6); X.closePath(); X.fill(); } });
  } else {
    heroEye(-1.5, -69, 5.6, 7.8, ...lk); heroEye(18.5, -69, 4.9, 7.5, ...lk);
    // 결의에 찬 눈썹(안쪽이 내려감)
    stroke([[-8, -80.5], [-1.5, -79.2], [4.5, -77.2]], 2.4, INK, .2, .35);
    stroke([[13.5, -77.3], [19, -79.4], [25, -80]], 2.2, INK, .35, .2);
    stroke([[5, -57.8], [9.5, -56.6], [14.5, -58.4]], 1.7, INK, .25, .25);
    stroke([[14.1, -58.6], [15.4, -59.8]], 1.1, INK, .1, .4);
  }
  oval(-9.5, -60.5, 4.2, 2.5, HC.blush); oval(27, -61, 2.8, 2.2, HC.blush);
  stroke([[-11.5, -61], [-10.2, -62.4]], .8, 'rgba(255,255,255,.7)', 0, 0);
}

function heroSword() {
  const hx = 31, hy = -40, a = -0.68, c = Math.cos(a), s = Math.sin(a);
  const P = (u, v) => [hx + c * u - s * v, hy + s * u + c * v];
  // 손잡이 + 시곗바늘 꼬리 고리
  cel(capsule([P(-12, 0), P(2, 0)], 3.6), { b: '#262a4a', w: 1.4 });
  cel(ell(...P(-14, 0), 3.4, 3.4), { b: HC.gold, s: HC.goldS, d: 1, w: 1.4 });
  dot(...P(-14, 0), 1.3, '#262a4a');
  // 날: 초침 모양(가늘고 길게, 끝이 뾰족)
  const bl = [P(4, -2.3), P(14, -2.8), P(34, -1.2), P(44, 0, 1), P(34, 1.2), P(14, 2.8), P(4, 2.3)];
  cel(spline(bl.map(q => [q[0], q[1], 1]), true, 4, .2), { b: HC.blade, s: HC.bladeS, d: 1.6, w: 1.6, r: HC.rim, dr: .7 });
  stroke([P(7, -.6), P(30, -.4)], 1.0, 'rgba(255,255,255,.95)', .2, .6);
  cel(ell(...P(4.5, 0), 2.8, 4.6, a), { b: HC.gold, s: HC.goldS, d: 1, w: 1.4 });
}

function drawHero(x, y, sc, flip = 1, expr = 'ready', opt = {}) {
  X.save(); X.translate(x, y); X.scale(sc * flip, sc); const oLX = LX; LX *= flip;
  if (!opt.noShadow) oval(-2, 1, 36, 7, 'rgba(8,10,30,.35)');
  heroScarfTails(opt.wave || 0);
  // 뒷다리·뒷팔
  const legB = capsule([[-6, -25], [-17, -14], [-27, -7]], 12, 10);
  cel(legB, { b: HC.navy, s: HC.navyS, d: 3, r: HC.rim, dr: 1, w: 2.2 });
  X.save(); X.clip(path(legB)); X.fillStyle = HC.wrapS; X.beginPath(); X.moveTo(-20, -18); X.lineTo(-11, -9); X.lineTo(-24, 6); X.lineTo(-36, -4); X.fill();
  stroke([[-19, -15], [-15, -10]], 1, 'rgba(60,70,110,.6)', .2, .2); X.restore();
  cel(spline([[-38, -5], [-30, -10], [-22, -7], [-23, 0], [-36, 1]]), { b: '#232a4c', s: '#151a33', d: 2, w: 2 });
  const armB = capsule([[-10, -46], [-20, -43], [-27, -36]], 10, 8.5);
  cel(armB, { b: HC.navyS, s: HC.navyD, d: 2.5, w: 2.1 });
  cel(ell(-28.5, -35, 5, 4.8), { b: HC.skin, s: HC.skinS, d: 1.6, w: 1.8 });
  // 몸통
  const torso = spline([[-13, -53], [8, -54], [18, -44], [18, -31], [10, -23], [-6, -22], [-16, -28], [-19, -41]]);
  cel(torso, {
    b: HC.navy, s: HC.navyS, d: 4.5, r: HC.rim, dr: 1.2, w: 2.4, f: () => {
      X.fillStyle = '#20264a'; X.beginPath(); X.moveTo(-22, -35); X.quadraticCurveTo(0, -29, 22, -36); X.lineTo(22, -28); X.quadraticCurveTo(0, -22, -22, -28); X.fill();
      stroke([[-20, -35], [0, -29.6], [21, -35.5]], .9, 'rgba(140,160,230,.45)', .2, .2);
      stroke([[2, -48], [6, -40], [5, -34]], 1.3, 'rgba(10,14,40,.5)', .3, .5);
    }
  });
  cel(spline([[-15, -32], [-10, -35], [-7, -30], [-11, -26]]), { b: '#d4dcf2', s: '#9aa6cc', d: 1.2, w: 1.4 });
  // 앞다리
  const legF = capsule([[7, -26], [18, -16], [19, -5]], 12, 10);
  cel(legF, { b: HC.navy, s: HC.navyS, d: 3, r: HC.rim, dr: 1, w: 2.3 });
  X.save(); X.clip(path(legF)); X.fillStyle = HC.wrap; X.fillRect(10, -13, 16, 12); X.fillStyle = HC.wrapS; X.fillRect(10, -6, 16, 5);
  stroke([[13, -11], [24, -12]], .9, 'rgba(60,70,110,.5)', .1, .1); stroke([[13, -7], [24, -8]], .9, 'rgba(60,70,110,.5)', .1, .1); X.restore();
  cel(spline([[11, -6], [21, -9], [30, -5], [30, 1], [12, 1]]), { b: '#232a4c', s: '#151a33', d: 2, w: 2.2, h: [[24, -6.5, 3, 1.2, -.2, 'rgba(160,180,255,.5)']] });
  // 목도리 고리
  const ring = spline([[-20, -55], [-4, -59], [13, -58], [22, -53], [20, -45], [5, -42], [-12, -43], [-22, -48]]);
  cel(ring, { b: HC.scarf, s: HC.scarfS, d: 3.4, r: HC.scarfL, dr: 1, w: 2.3, f: () => { stroke([[-14, -50], [0, -48.5], [14, -50]], 1.2, 'rgba(14,90,110,.55)', .3, .3); oval(9, -56, 6, 1.6, 'rgba(230,255,252,.75)', -.1); } });
  // 머리
  heroHead(expr);
  // 앞팔 + 칼
  if (!opt.noSword) heroSword();
  const armF = capsule([[9, -47], [20, -44], [27, -40]], 10, 8.5);
  cel(armF, { b: HC.navy, s: HC.navyS, d: 3, r: HC.rim, dr: 1, w: 2.2 });
  cel(ell(30.5, -40, 5.4, 5.2), { b: HC.skin, s: HC.skinS, d: 1.8, w: 1.9, h: [[31.5, -42.5, 1.6, 1, 0, 'rgba(255,255,255,.7)']] });
  LX = oLX; X.restore();
}

// ── 태엽 병정 ──
const SOL = {
  sword: { hat: '#dc4a40', hatS: '#a3303b', jac: '#f3e4c4', jacS: '#cfb388', pants: '#56416c', pantsS: '#3c2c50' },
  archer: { hat: '#53aa5c', hatS: '#357848', jac: '#a9c46c', jacS: '#7d9a4a', pants: '#5c4636', pantsS: '#3f2f25' },
  shield: { hat: '#b9c4d0', hatS: '#7f8ea2', jac: '#9c79c4', jacS: '#73569c', pants: '#4a3a5e', pantsS: '#33273f' },
};
const WOOD = { b: '#f5d2a6', s: '#d9a573', r: '#fff3df' };
const BRONZE = { b: '#cf9055', s: '#94603a', h: '#ffe0b0' };

function windKey(cx, cy, ang, k = 1.2) { // 등 뒤 태엽 열쇠: 보이는 줄기 + 구멍 뚫린 두 날개
  const c = Math.cos(ang) * k, s = Math.sin(ang) * k, P = (u, v) => [cx + c * u - s * v, cy + s * u + c * v];
  cel(capsule([P(-26, 0), P(-4, 0)], 4.2), { b: BRONZE.b, s: BRONZE.s, d: 1.4, w: 1.8, h: [[...P(-14, -1), 5, .7, ang, 'rgba(255,235,200,.8)']] });
  cel(ell(...P(-9, 0), 3.4 * k, 3.4 * k), { b: BRONZE.b, s: BRONZE.s, d: 1, w: 1.6 });
  // 두 날개(둥근 고리) — 하나의 매끈한 땅콩 모양
  const pea = spline([P(-2, -3), P(-1, -10), P(5, -15), P(12, -13), P(13, -6), P(9, 0), P(13, 6), P(12, 13), P(5, 15), P(-1, 10), P(-2, 3)]);
  cel(pea, { b: BRONZE.b, s: BRONZE.s, d: 2.4, r: '#ffdcae', dr: .9, w: 2.1, h: [[...P(4, -11), 2.4, 1.2, ang + .6, 'rgba(255,244,220,.95)'], [...P(4, 11), 1.6, .9, ang - .6, 'rgba(255,244,220,.7)']] });
  for (const v of [-8, 8]) { cel(ell(...P(6, v), 2.8 * k, 2.6 * k), { b: '#6e4426', w: 1.1, lost: .6 }); }
}

function drawSoldier(x, y, sc, type = 'sword', o = {}) {
  const C = SOL[type], fl = o.flip || 1;
  X.save(); X.translate(x, y); X.scale(sc * fl, sc); const oLX = LX; LX *= fl;
  if (!o.noShadow) oval(0, 1, 23, 5.5, 'rgba(8,10,30,.32)');
  windKey(-29, -80, -2.3);
  // 다리
  const lg1 = capsule([[-7, -22], [-7.5, -6]], 9), lg2 = capsule([[7, -22], [8, -9]], 9);
  for (const l of [lg1, lg2]) cel(l, { b: C.pants, s: C.pantsS, d: 2, w: 2 });
  cel(ell(-8, -3, 7, 4.6), { b: '#2c2236', s: '#1a1422', d: 1.6, w: 1.9, h: [[-10, -5, 2.4, 1, 0, 'rgba(255,255,255,.45)']] });
  cel(ell(9, -6, 7, 4.6), { b: '#2c2236', s: '#1a1422', d: 1.6, w: 1.9, h: [[7, -8, 2.4, 1, 0, 'rgba(255,255,255,.45)']] });
  // 왼팔(내린 팔)
  if (type !== 'shield') {
    cel(capsule([[-15, -44], [-21, -35], [-20, -27]], 7.5, 7), { b: C.jac, s: C.jacS, d: 2, w: 2 });
    cel(ell(-20, -26, 4.4, 4.2), { b: WOOD.b, s: WOOD.s, d: 1.4, w: 1.7 });
  }
  // 몸통(나무 인형 통)
  const torso = spline([[-14, -48], [0, -51], [14, -48], [18, -35], [17, -22], [9, -17], [-9, -17], [-17, -22], [-18, -35]]);
  cel(torso, {
    b: C.jac, s: C.jacS, d: 4, ss: 1.04, r: WOOD.r, dr: 1, w: 2.3, f: () => {
      X.fillStyle = '#5a3a2a'; X.fillRect(-20, -28, 40, 5.5);
      X.fillStyle = 'rgba(255,255,255,.18)'; X.fillRect(-20, -28, 40, 1.3);
      cel(spline([[-3, -29], [3, -29], [3, -21.5], [-3, -21.5]].map(q => [...q, 1]), true, 3), { b: '#e8c25e', s: '#b88a35', d: 1, w: 1 });
      if (type === 'sword') { X.fillStyle = '#fff8ea'; X.beginPath(); X.moveTo(-14, -48); X.lineTo(-9, -49); X.lineTo(14, -27); X.lineTo(9, -27); X.fill(); }
      for (const by of [-42, -35]) cel(ell(type === 'sword' ? -6 : 0, by, 1.8, 1.8), { b: '#e8c25e', s: '#b88a35', d: .6, w: .9 });
    }
  });
  // 머리(옻칠한 나무 공)
  const head = ell(0, -63, 16.5, 15.5);
  cel(head, { b: WOOD.b, s: WOOD.s, d: 4, ss: 1.03, r: WOOD.r, dr: 1.2, w: 2.3, h: [[7.5, -71, 4.4, 2.4, -0.6], [10.5, -67.5, 1.2, 1.2, 0]] });
  // 단추 눈 + 볼터치 + 입
  const ey = -62;
  for (const ex of [-6, 6]) { cel(ell(ex, ey, 3.2, 3.6), { b: '#1f1830', w: 0 }); dot(ex + 1, ey - 1.3, 1.15, '#fff'); dot(ex - 1, ey + 1.3, .5, 'rgba(255,255,255,.7)'); }
  oval(-10.5, -56.5, 3.3, 2.6, 'rgba(255,110,110,.62)'); oval(10.5, -56.5, 3.3, 2.6, 'rgba(255,110,110,.62)');
  if (o.mouth === 'o') cel(ell(0, -54.6, 1.8, 2.2), { b: '#5a2030', w: 1 });
  else stroke([[-2.8, -56], [0, -54], [2.8, -56]], 1.4, INK, .2, .2);
  // 모자
  if (type === 'sword') {
    const hat = spline([[-12, -73], [-13, -87], [-10, -96], [0, -98.5], [10, -96], [13, -87], [12, -73], [0, -71]]);
    cel(hat, { b: C.hat, s: C.hatS, d: 3.5, r: '#ffb3a0', dr: 1, w: 2.2, h: [[6, -92, 1.8, 4, .15, 'rgba(255,220,210,.6)']], f: () => { X.fillStyle = '#e8c25e'; X.fillRect(-15, -79, 30, 5); X.fillStyle = '#b88a35'; X.fillRect(-15, -75.5, 30, 1.6); } });
    cel(ell(0, -101, 4.6, 4.3), { b: '#fffaf0', s: '#d9d2c4', d: 1.4, w: 1.7 });
  } else if (type === 'archer') {
    const hat = spline([[-16, -71], [-8, -83], [-1, -97], [5, -108, 1], [7, -95], [11, -83], [17, -71], [0, -68]]);
    cel(hat, { b: C.hat, s: C.hatS, d: 3.5, r: '#c6ffb0', dr: 1, w: 2.2, h: [[5, -86, 1.5, 5, .2, 'rgba(230,255,220,.55)']] });
    cel(ell(5, -108.5, 3, 3), { b: '#f3e4c4', s: '#cfb388', d: 1, w: 1.5 });
  } else {
    cel(capsule([[-13, -75], [-32, -82]], 4.4), { b: '#3b2c26', s: '#241a16', d: 1, w: 1.8 });
    const pot = spline([[-17, -69], [-16, -80], [-8, -86.5], [0, -87.5], [8, -86.5], [16, -80], [17, -69], [0, -67]]);
    cel(pot, { b: C.hat, s: C.hatS, d: 3.5, r: '#ffffff', dr: .9, w: 2.2, h: [[7, -82, 4.5, 1.8, -.4]] });
    cel(spline([[-19, -71], [0, -73.5], [19, -71], [19, -67], [0, -69.5], [-19, -67]]), { b: '#d4dce6', s: '#8e9cb0', d: 1.2, w: 1.7 });
  }
  // 무기
  if (type === 'sword') {
    const a = -1.2, c = Math.cos(a), s = Math.sin(a), P = (u, v) => [23 + c * u - s * v, -52 + s * u + c * v];
    const bl = spline([P(3, -3), P(24, -3.2), P(30, 0, 1), P(24, 3.2), P(3, 3)].map(q => [q[0], q[1], q[2] || 0]), true, 5, .35);
    cel(bl, { b: '#ecc287', s: '#b98c56', d: 1.6, w: 1.9, h: [[...P(15, -1.2), 6, .9, a, 'rgba(255,248,230,.85)']] });
    cel(capsule([P(1, -7), P(1, 7)], 3.6), { b: '#8a5a3a', s: '#5c3a24', d: 1, w: 1.6 });
    cel(capsule([[14, -45], [20, -48], [23, -52]], 7.5, 7), { b: C.jac, s: C.jacS, d: 2, w: 2 });
    cel(ell(23.5, -52.5, 4.4, 4.2), { b: WOOD.b, s: WOOD.s, d: 1.4, w: 1.7 });
  } else if (type === 'archer') {
    X.save(); X.translate(14, -44); X.rotate(o.aim || 0); X.translate(-14, 44);
    cel(capsule([[14, -44], [21, -38], [25, -34]], 7.5, 7), { b: C.jac, s: C.jacS, d: 2, w: 2 });
    const bow = []; for (let i = 0; i <= 16; i++) { const t = i / 16, a = -1.1 + t * 2.2; bow.push([26 + Math.cos(a) * 15, -34 + Math.sin(a) * 15]); }
    const bowCl = bow.map(q => [q[0], q[1]]);
    const pts = capsule([bowCl[0], bowCl[8], bowCl[16]], 3.6, 3.6);
    cel(pts, { b: '#c8874e', s: '#8d5a33', d: 1.2, w: 1.7 });
    stroke([bowCl[0], [20, -34], bowCl[16]], .9, 'rgba(255,255,255,.85)', 0, 0);
    cel(capsule([[18, -34], [44, -34]], 2.4), { b: '#f3e4c4', s: '#cfb388', d: .8, w: 1.4 });
    cel(spline([[44, -38.5], [49, -38], [50, -34], [49, -30], [44, -29.5]]), { b: '#7a6aa0', s: '#54467a', d: 1, w: 1.6 });
    cel(ell(24.5, -34, 4.4, 4.2), { b: WOOD.b, s: WOOD.s, d: 1.4, w: 1.7 });
    X.restore();
  } else {
    const lid = ell(1, -35, 21.5, 19.5);
    cel(lid, { b: '#c7d1dc', s: '#8a98ab', d: 4, r: '#ffffff', dr: 1, w: 2.4, h: [[-7, -44, 7, 2.6, -.5], [11, -27, 2, 1, -.5, 'rgba(255,255,255,.6)']] });
    X.save(); ink(ell(1, -35, 15.5, 14), 1.4, 'rgba(70,82,104,.75)', .5); X.restore();
    cel(ell(1, -35.5, 5.2, 4.4), { b: '#3b2c26', s: '#241a16', d: 1.3, w: 1.8, h: [[-.5, -37.5, 1.8, .9, 0, 'rgba(255,255,255,.5)']] });
    cel(ell(-20, -32, 4.4, 4.2), { b: WOOD.b, s: WOOD.s, d: 1.4, w: 1.7 });
  }
  LX = oLX; X.restore();
}
