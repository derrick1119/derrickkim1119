/* 데이 & 나이트 — 그림
 * 인물도 소품도 모두 캔버스에 단순한 도형으로 직접 그린다. 그림 파일은 쓰지 않는다.
 */
(function (root) {
  'use strict';
  const DN = (root.DN = root.DN || {});
  const U = DN.U;
  const TAU = Math.PI * 2;
  const Art = (DN.Art = {});

  /* ───────── 쌍둥이 (그리고 잊힌 셋째) ─────────
   * 컨셉 아트의 인상만 남겨 단순한 도형으로 그린다:
   * 발목까지 흐르는 긴 물결 머리, 민소매에 층진 치마, 허리의 리본, 맨발.
   * 데이는 눈을 뜨고 있고, 나이트는 눈을 감고 고개를 조금 숙인다. 나이트의 치맛단은 해져 있다. */
  Art.ready = true;
  Art.load = () => Promise.resolve();

  const TWIN = {
    day:   { hair: '#f2ede3', hair2: '#dcd4c6', dress: '#f4eddd', dress2: '#e2d7c3', inner: '#d3c7b4', ribbon: '#3a3531', skin: '#f4ddcc', eye: '#6f5a34', closed: false, torn: false },
    night: { hair: '#2f2a31', hair2: '#1d1a21', dress: '#4b454c', dress2: '#39343b', inner: '#9ca6b2', ribbon: '#bdb9b4', skin: '#f0dacc', eye: '#2a2428', closed: true, torn: true },
    dusk:  { hair: '#b99fca', hair2: '#9a80b4', dress: '#efc0b4', dress2: '#dba0a4', inner: '#c98aa0', ribbon: '#6b4b7a', skin: '#f3dccd', eye: '#5a3f66', closed: false, torn: false },
  };

  /**
   * (x, y) = 발 위치. opt: h 키, dir(1 오른쪽, -1 왼쪽), phase 걸음 위상, moving 0..1, t, alpha,
   *   variant('dusk' = 황혼), hold(등불을 앞으로 든 팔)
   * 손 위치(등불 거는 곳)를 돌려준다.
   */
  Art.girl = function (ctx, who, x, y, opt) {
    opt = opt || {};
    const P = TWIN[opt.variant === 'dusk' ? 'dusk' : who] || TWIN.day;
    const h = opt.h || 104, k = h / 104, dir = opt.dir || 1;
    const mv = opt.moving || 0, ph = opt.phase || 0, t = opt.t || 0;
    const seed = who === 'day' ? 0 : 2.1;
    const bob = -Math.abs(Math.cos(ph)) * 1.8 * mv + Math.sin(t * 1.5 + seed) * 0.5;
    const sw = Math.sin(ph) * mv;                        // 걸음
    const w1 = Math.sin(t * 1.3 + seed) * 2 - mv * 3;    // 머리카락과 치맛자락의 일렁임
    const w2 = Math.sin(t * 1.7 + seed + 1) * 2.4 - mv * 5;
    const w3 = Math.sin(t * 1.1 + seed + 2) * 3 - mv * 7;
    const nod = P.closed ? 3 : 0;                         // 나이트는 고개를 숙인다
    const hold = opt.hold ? 1 : 0;
    ctx.save();
    if (opt.alpha !== undefined) ctx.globalAlpha *= opt.alpha;
    ctx.translate(x, y + bob);
    ctx.scale(dir * k, k);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';

    // 뒤로 흐르는 머리카락
    ctx.fillStyle = P.hair2;
    ctx.beginPath();
    ctx.moveTo(3, -98 + nod);
    ctx.bezierCurveTo(-13, -101 + nod, -19, -88, -15, -74);
    ctx.bezierCurveTo(-28 + w1, -62, -12 + w1, -52, -24 + w2, -40);
    ctx.bezierCurveTo(-35 + w2, -28, -16 + w3, -22, -26 + w3, -6);
    ctx.bezierCurveTo(-13 + w3, -9, -7 + w2, -22, -9 + w1, -36);
    ctx.bezierCurveTo(-3, -50, -5, -64, -1, -76);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = P.hair;
    ctx.beginPath();
    ctx.moveTo(1, -97 + nod);
    ctx.bezierCurveTo(-11, -99 + nod, -15, -88, -12, -75);
    ctx.bezierCurveTo(-21 + w1, -63, -9 + w1, -52, -18 + w2, -40);
    ctx.bezierCurveTo(-25 + w2, -29, -13 + w3, -24, -18 + w3, -14);
    ctx.bezierCurveTo(-9 + w2, -20, -4 + w1, -34, -6, -48);
    ctx.bezierCurveTo(-2, -58, -3, -68, 0, -77);
    ctx.closePath(); ctx.fill();

    // 다리와 맨발
    ctx.strokeStyle = P.skin; ctx.lineWidth = 3;
    for (const [hx, s] of [[-2, -1], [3, 1]]) {
      const fx = hx + s * sw * 9, lift = Math.max(0, s * Math.cos(ph)) * 3 * mv;
      ctx.beginPath(); ctx.moveTo(hx, -30); ctx.quadraticCurveTo(hx + s * sw * 3, -16, fx, -2.5 - lift); ctx.stroke();
      ctx.fillStyle = P.skin;
      ctx.beginPath(); ctx.ellipse(fx + 2.4, -1.6 - lift, 3.6, 1.7, 0, 0, TAU); ctx.fill();
    }

    // 치마: 뒤가 길고 앞이 짧은 두 겹
    const hemB = -17 + Math.sin(t * 1.6 + seed) * 0.8, hemF = -27;
    const hem = (x0, y0, x1, y1, n, amp) => {            // 해진 치맛단(나이트) 또는 물결 단(데이)
      for (let i = 1; i <= n; i++) {
        const u = i / n, px = x0 + (x1 - x0) * u, py = y0 + (y1 - y0) * u;
        if (P.torn) ctx.lineTo(px - (x1 - x0) / n * 0.5, py + (i % 2 ? amp : amp * 0.3));
        else ctx.quadraticCurveTo(px - (x1 - x0) / n * 0.5, py + amp, px, py);
        if (P.torn) ctx.lineTo(px, py);
      }
    };
    ctx.fillStyle = P.inner;                              // 안감
    ctx.beginPath(); ctx.moveTo(-9, -52); ctx.lineTo(-19 + w2 * 0.5, hemB + 3);
    hem(-19 + w2 * 0.5, hemB + 3, 11, hemF + 5, 5, 4); ctx.lineTo(7, -52); ctx.closePath(); ctx.fill();
    ctx.fillStyle = P.dress2;                             // 아랫단
    ctx.beginPath(); ctx.moveTo(-8, -56); ctx.quadraticCurveTo(-17, -40, -21 + w2 * 0.6, hemB - 3);
    hem(-21 + w2 * 0.6, hemB - 3, 14, hemF, 6, 4.5); ctx.quadraticCurveTo(11, -42, 8, -56); ctx.closePath(); ctx.fill();
    ctx.fillStyle = P.dress;                              // 윗단
    ctx.beginPath(); ctx.moveTo(-7, -58); ctx.quadraticCurveTo(-14, -46, -16 + w1 * 0.5, -31);
    hem(-16 + w1 * 0.5, -31, 12, -36, 5, 3.5); ctx.quadraticCurveTo(9, -47, 7, -58); ctx.closePath(); ctx.fill();

    // 뒤쪽 팔
    ctx.strokeStyle = P.skin; ctx.lineWidth = 3.4;
    ctx.beginPath(); ctx.moveTo(-5, -70); ctx.quadraticCurveTo(-9 - sw * 2, -58, -7 - sw * 5, -47); ctx.stroke();
    // 몸통 (민소매)
    ctx.fillStyle = P.dress;
    ctx.beginPath(); ctx.moveTo(-7, -72); ctx.quadraticCurveTo(0, -75, 6, -72); ctx.lineTo(7.5, -56); ctx.lineTo(-7.5, -56); ctx.closePath(); ctx.fill();
    // 리본
    ctx.fillStyle = P.ribbon;
    ctx.fillRect(-7.6, -58.6, 15.2, 2.6);
    ctx.beginPath(); ctx.moveTo(4, -57.3); ctx.lineTo(8.6, -60.6); ctx.lineTo(8.6, -54); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(4, -57.3); ctx.lineTo(0, -60.2); ctx.lineTo(0, -54.4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = P.ribbon; ctx.lineWidth = 1.7;
    ctx.beginPath(); ctx.moveTo(4, -57); ctx.quadraticCurveTo(3 + w1 * 0.4, -46, 5 + w1 * 0.6, -37); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(5, -57); ctx.quadraticCurveTo(8 + w1 * 0.4, -47, 9 + w1 * 0.7, -40); ctx.stroke();

    // 목과 얼굴
    ctx.strokeStyle = P.skin; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(1, -74); ctx.lineTo(2, -78 + nod * 0.4); ctx.stroke();
    ctx.fillStyle = P.skin;
    ctx.beginPath(); ctx.ellipse(3, -86 + nod, 9.6, 10.6, 0, 0, TAU); ctx.fill();
    // 눈과 볼
    if (P.closed) {
      ctx.strokeStyle = P.eye; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.arc(8, -85.5 + nod, 2.6, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    } else {
      const blink = Math.sin(t * 0.8 + seed * 3) > 0.985 ? 0.15 : 1;
      ctx.fillStyle = P.eye;
      ctx.beginPath(); ctx.ellipse(8, -85 + nod, 1.25, 2 * blink, 0, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = 'rgba(232,150,130,0.3)';
    ctx.beginPath(); ctx.ellipse(7.6, -80.5 + nod, 2.6, 1.5, 0, 0, TAU); ctx.fill();
    // 앞머리와 옆머리
    ctx.fillStyle = P.hair;
    ctx.beginPath();
    ctx.moveTo(-9, -82 + nod);
    ctx.bezierCurveTo(-12, -100 + nod, 11, -102 + nod, 13, -88 + nod);
    ctx.bezierCurveTo(9, -93 + nod, 5, -93 + nod, 1, -89 + nod);
    ctx.bezierCurveTo(1, -80, -2 + w1 * 0.3, -70, -4 + w1 * 0.5, -60);
    ctx.bezierCurveTo(-8, -66, -9, -74, -9, -82 + nod);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = P.hair2; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(3, -98 + nod); ctx.quadraticCurveTo(6, -94 + nod, 5, -91 + nod); ctx.stroke();

    // 앞쪽 팔 (등불을 들면 앞으로 내민다)
    const ax = hold ? 14 : 8 + sw * 5, ay = hold ? -57 : -47;
    ctx.strokeStyle = P.skin; ctx.lineWidth = 3.4;
    ctx.beginPath(); ctx.moveTo(5, -70); ctx.quadraticCurveTo(hold ? 9 : 9 + sw * 2, -61, ax, ay); ctx.stroke();
    ctx.restore();
    return { x: x + dir * k * ax, y: y + bob + k * ay };
  };

  /* ───────── 등불 ───────── */
  Art.lantern = function (ctx, hx, hy, on, t, sway) {
    const a = Math.sin(t * 2.1) * 0.08 + (sway || 0);
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(a);
    ctx.strokeStyle = 'rgba(60,46,36,0.9)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 7); ctx.stroke();
    // 틀
    ctx.fillStyle = '#4a3a2c';
    ctx.beginPath(); ctx.moveTo(-4, 7); ctx.lineTo(4, 7); ctx.lineTo(3, 9); ctx.lineTo(-3, 9); ctx.closePath(); ctx.fill();
    ctx.fillStyle = on ? 'rgba(255,238,170,0.95)' : 'rgba(150,160,170,0.5)';
    ctx.beginPath(); ctx.moveTo(-4, 9); ctx.lineTo(4, 9); ctx.lineTo(5, 19); ctx.lineTo(-5, 19); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#4a3a2c'; ctx.lineWidth = 1.1; ctx.stroke();
    ctx.fillStyle = '#4a3a2c'; ctx.fillRect(-5.5, 19, 11, 2);
    if (on) {
      ctx.fillStyle = '#fff8dc';
      ctx.beginPath(); ctx.arc(0, 14, 2.2 + Math.sin(t * 7) * 0.3, 0, TAU); ctx.fill();
    }
    ctx.restore();
    // 등불 중심의 세계 좌표
    return { x: hx - Math.sin(a) * 14, y: hy + Math.cos(a) * 14 };
  };

  /* ───────── 사람 (하리, 등대지기, 기억 속 아이) ───────── */
  const FOLK = {
    hari:   { h: 70, cloak: '#d6a03c', trim: '#a8742a', hair: '#4a3324', scarf: '#b4503a', skin: '#f2d9c5', boots: '#5a4030' },
    child:  { h: 62, cloak: '#8fa3b8', trim: '#6b7f96', hair: '#2e2a30', scarf: '#8fa3b8', skin: '#e9d6cc', boots: '#6b6170' },
    keeper: { h: 92, cloak: '#35506b', trim: '#22384e', hair: '#e8e4dc', scarf: '#c9b28a', skin: '#e8c9b0', boots: '#2e2a2a' },
  };
  /**
   * opt: who('hari'|'child'|'keeper'), dir, phase, moving, t, pole(점등 막대), shiver, tint(env)
   * 손 위치를 돌려준다.
   */
  Art.folk = function (ctx, x, y, opt) {
    opt = opt || {};
    const P = FOLK[opt.who || 'hari'];
    const k = P.h / 70;
    const dir = opt.dir || 1;
    const mv = opt.moving || 0;
    const ph = opt.phase || 0;
    const sh = opt.tint || ((c) => c);
    const jit = opt.shiver ? Math.sin((opt.t || 0) * 38) * 0.7 : 0;
    const bob = -Math.abs(Math.cos(ph)) * 1.6 * mv;
    const ink = 'rgba(52,40,34,0.75)';
    ctx.save();
    if (opt.alpha !== undefined) ctx.globalAlpha *= opt.alpha;
    ctx.translate(x + jit, y + bob);
    ctx.scale(dir * k, k);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // 다리
    const sw = Math.sin(ph) * 5 * mv;
    ctx.strokeStyle = sh(P.boots); ctx.lineWidth = 3.4;
    ctx.beginPath(); ctx.moveTo(-3.5, -15); ctx.lineTo(-3.5 - sw, -2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(3.5, -15); ctx.lineTo(3.5 + sw, -2); ctx.stroke();
    ctx.fillStyle = sh(P.boots);
    ctx.beginPath(); ctx.ellipse(-2.5 - sw, -1.5, 4, 2.2, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(4.5 + sw, -1.5, 4, 2.2, 0, 0, TAU); ctx.fill();
    // 망토
    ctx.fillStyle = sh(P.cloak);
    ctx.beginPath();
    ctx.moveTo(-7, -44);
    ctx.quadraticCurveTo(-15, -28, -14, -13);
    ctx.quadraticCurveTo(0, -9, 14, -13);
    ctx.quadraticCurveTo(14, -30, 7, -44);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = ink; ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = sh(P.trim); ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(-13.5, -15.5); ctx.quadraticCurveTo(0, -11.5, 13.5, -15.5); ctx.stroke();
    // 목도리
    ctx.fillStyle = sh(P.scarf);
    ctx.beginPath(); ctx.ellipse(0, -43, 8.5, 3.6, 0, 0, TAU); ctx.fill();
    if (opt.who !== 'child') {
      const fl = Math.sin((opt.t || 0) * 3 + ph) * 2;
      ctx.beginPath(); ctx.moveTo(-6, -43); ctx.quadraticCurveTo(-14, -40 + fl, -17, -33 + fl); ctx.lineTo(-13, -32 + fl); ctx.quadraticCurveTo(-10, -38, -4, -40); ctx.fill();
    }
    // 머리
    ctx.fillStyle = sh(P.skin);
    ctx.beginPath(); ctx.arc(0.5, -55, 11.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = ink; ctx.lineWidth = 0.9; ctx.stroke();
    ctx.fillStyle = sh(P.hair);
    if (opt.who === 'keeper') {
      // 털모자 + 수염
      ctx.beginPath(); ctx.arc(0.5, -58, 12, Math.PI, TAU); ctx.lineTo(12.5, -56); ctx.lineTo(-11.5, -56); ctx.closePath();
      ctx.fillStyle = sh('#7a3b32'); ctx.fill();
      ctx.fillStyle = sh(P.hair);
      ctx.beginPath(); ctx.moveTo(-3, -50); ctx.quadraticCurveTo(4, -36, 11, -50); ctx.quadraticCurveTo(4, -46, -3, -50); ctx.fill();
    } else {
      // 단발
      ctx.beginPath();
      ctx.moveTo(-11.5, -52); ctx.quadraticCurveTo(-13, -70, 1, -67.5); ctx.quadraticCurveTo(13, -67, 12, -56);
      ctx.quadraticCurveTo(7, -61, 2, -62); ctx.quadraticCurveTo(-4, -60, -6, -52); ctx.quadraticCurveTo(-8, -46, -11.5, -46);
      ctx.closePath(); ctx.fill();
    }
    // 눈, 볼
    ctx.fillStyle = 'rgba(40,30,28,0.9)';
    ctx.beginPath(); ctx.ellipse(4, -54, 1.2, 1.8, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(9, -54, 1.1, 1.7, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(226,130,110,0.35)';
    ctx.beginPath(); ctx.ellipse(6.5, -50, 2.6, 1.6, 0, 0, TAU); ctx.fill();
    // 팔 + 점등 막대
    ctx.strokeStyle = sh(P.cloak); ctx.lineWidth = 3.2;
    ctx.beginPath(); ctx.moveTo(6, -38); ctx.lineTo(11, -29); ctx.stroke();
    if (opt.pole) {
      ctx.strokeStyle = sh('#6a4e36'); ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(12, -4); ctx.lineTo(10, -86); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(10, -86); ctx.quadraticCurveTo(15, -92, 16, -84); ctx.stroke();
    }
    ctx.restore();
    return { x: x + dir * 11 * k, y: y + bob - 29 * k };
  };

  /* ───────── 빛 정령 ───────── */
  const SPIRIT = {
    hearth:     { core: '#fff1c2', glow: [255, 140, 60], r: 15, name: '화롯불' },
    lighthouse: { core: '#ffffff', glow: [255, 236, 170], r: 16, name: '등대' },
    neon:       { core: '#ffe6ff', glow: [255, 80, 200], r: 14, name: '네온' },
    street:     { core: '#fff0cc', glow: [255, 176, 84], r: 14, name: '가로등' },
    hospital:   { core: '#f4fff4', glow: [150, 232, 190], r: 13, name: '야간등' },
    ember:      { core: '#fff6d8', glow: [255, 196, 90], r: 9, name: '첫 불씨' },
  };
  Art.SPIRIT = SPIRIT;
  /** opt: scale, tired(0..1), alpha, face(1/-1) */
  Art.spirit = function (ctx, kind, x, y, t, opt) {
    opt = opt || {};
    const S = SPIRIT[kind];
    const sc = opt.scale || 1;
    const tired = opt.tired === undefined ? 0.6 : opt.tired;
    const r = S.r * sc;
    const fl = Math.sin(t * (kind === 'neon' ? 23 : 5) + x) * (kind === 'neon' ? 0.12 : 0.05);
    const bobY = Math.sin(t * 1.7 + x * 0.01) * 3 * (1 - tired * 0.6);
    const g = S.glow;
    ctx.save();
    if (opt.alpha !== undefined) ctx.globalAlpha *= opt.alpha;
    ctx.translate(x, y + bobY);
    // 후광
    const dim = 1 - tired * 0.45 + fl;
    ctx.globalCompositeOperation = 'lighter';
    let gr = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 4.2);
    gr.addColorStop(0, `rgba(${g[0]},${g[1]},${g[2]},${0.5 * dim})`);
    gr.addColorStop(0.4, `rgba(${g[0]},${g[1]},${g[2]},${0.16 * dim})`);
    gr.addColorStop(1, `rgba(${g[0]},${g[1]},${g[2]},0)`);
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, r * 4.2, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    // 몸
    ctx.fillStyle = `rgba(${g[0]},${g[1]},${g[2]},0.92)`;
    ctx.beginPath();
    if (kind === 'hearth' || kind === 'ember') {
      const w = Math.sin(t * 6 + x) * r * 0.14;
      ctx.moveTo(0, r);
      ctx.bezierCurveTo(-r * 1.25, r, -r * 1.1, -r * 0.3, -r * 0.25 + w, -r * 1.55);
      ctx.bezierCurveTo(r * 0.1, -r * 0.6, r * 1.2, -r * 0.2, 0, r);
    } else if (kind === 'hospital') {
      const q = r * 0.55;
      ctx.moveTo(-q, -r); ctx.lineTo(q, -r); ctx.lineTo(q, -q); ctx.lineTo(r, -q); ctx.lineTo(r, q); ctx.lineTo(q, q);
      ctx.lineTo(q, r); ctx.lineTo(-q, r); ctx.lineTo(-q, q); ctx.lineTo(-r, q); ctx.lineTo(-r, -q); ctx.lineTo(-q, -q); ctx.closePath();
    } else {
      ctx.arc(0, 0, r, 0, TAU);
    }
    ctx.fill();
    gr = ctx.createRadialGradient(0, r * 0.1, 0, 0, 0, r);
    gr.addColorStop(0, S.core); gr.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, r * 0.95, 0, TAU); ctx.fill();
    // 종류별 장식
    ctx.lineCap = 'round';
    if (kind === 'lighthouse') {
      ctx.globalCompositeOperation = 'lighter';
      const a = t * 0.6;
      for (let i = 0; i < 2; i++) {
        const b = a + i * Math.PI;
        ctx.fillStyle = `rgba(255,240,190,${0.13 * dim})`;
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(b - 0.16) * r * 5, Math.sin(b - 0.16) * r * 1.6);
        ctx.lineTo(Math.cos(b + 0.16) * r * 5, Math.sin(b + 0.16) * r * 1.6);
        ctx.closePath(); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    } else if (kind === 'neon') {
      ctx.strokeStyle = `rgba(120,240,255,${0.75 + fl * 2})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, r + 4, 0.4, 2.6); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, r + 4, 3.6, 5.8); ctx.stroke();
    } else if (kind === 'street') {
      ctx.strokeStyle = 'rgba(70,60,56,0.85)'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(-r * 0.8, -r * 0.85); ctx.quadraticCurveTo(0, -r * 1.7, r * 0.8, -r * 0.85); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -r * 1.3); ctx.lineTo(0, -r * 1.75); ctx.stroke();
    } else if (kind === 'ember') {
      ctx.fillStyle = 'rgba(255,220,140,0.8)';
      for (let i = 0; i < 4; i++) {
        const p = (t * 0.5 + i * 0.25) % 1;
        ctx.globalAlpha = (opt.alpha === undefined ? 1 : opt.alpha) * (1 - p);
        ctx.beginPath(); ctx.arc(Math.sin(i * 2.4 + t) * r * 0.9, -r - p * r * 3.2, 1.2, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = opt.alpha === undefined ? 1 : opt.alpha;
    }
    // 얼굴: 지칠수록 눈이 감긴다
    const f = opt.face || 1;
    ctx.fillStyle = 'rgba(70,45,30,0.85)'; ctx.strokeStyle = 'rgba(70,45,30,0.85)'; ctx.lineWidth = 1.3;
    const ey = r * 0.05, ex = r * 0.36, open = Math.max(0.12, 1 - tired);
    const blink = (Math.sin(t * 0.9 + x) > 0.985) ? 0.1 : 1;
    for (const sx of [-ex, ex]) {
      ctx.beginPath(); ctx.ellipse(sx + f * r * 0.1, ey, r * 0.1, r * 0.17 * open * blink + 0.4, 0, 0, TAU); ctx.fill();
    }
    if (tired > 0.5) {
      ctx.beginPath(); ctx.arc(f * r * 0.1, r * 0.52, r * 0.14, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(f * r * 0.1, r * 0.3, r * 0.16, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
    }
    ctx.restore();
  };

  /* ───────── 그을음 ───────── */
  /** opt: awake 0..1 (깨어 있는 정도), fade 0..1 (흩어지는 정도), seed */
  Art.soot = function (ctx, x, y, r, t, opt) {
    opt = opt || {};
    const awake = opt.awake === undefined ? 1 : opt.awake;
    const fade = opt.fade || 0;
    const seed = opt.seed || 1;
    if (fade >= 1) return;
    ctx.save();
    ctx.translate(x, y);
    const R = r * (0.55 + 0.45 * awake) * (1 + fade * 0.9);
    ctx.globalAlpha *= (1 - fade) * (0.5 + 0.5 * awake);
    // 뭉게뭉게한 덩어리
    for (let layer = 0; layer < 3; layer++) {
      const rr = R * (1 - layer * 0.2);
      ctx.fillStyle = opt.eater ? ['rgba(60,24,40,0.5)', 'rgba(48,16,34,0.75)', 'rgba(30,8,22,0.92)'][layer]
        : ['rgba(26,20,26,0.55)', 'rgba(20,15,22,0.75)', 'rgba(12,9,14,0.92)'][layer];
      ctx.beginPath();
      const n = 44;
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * TAU;
        const wob = 1 + 0.16 * Math.sin(a * 5 + t * (1.4 + layer * 0.5) + seed) + 0.1 * Math.sin(a * 9 - t * 2.1 + seed * 2);
        const px = Math.cos(a) * rr * wob * 1.12, py = -rr * 0.86 + Math.sin(a) * rr * wob * 0.9;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill();
    }
    // 피어오르는 검댕
    ctx.fillStyle = 'rgba(16,12,18,0.7)';
    for (let i = 0; i < 7; i++) {
      const p = ((t * 0.32 + i * 0.143 + seed * 0.37) % 1);
      const px = Math.sin(i * 12.9 + seed) * R * 0.9 + Math.sin(t + i) * 4;
      ctx.globalAlpha = (1 - fade) * (1 - p) * 0.7 * (0.4 + 0.6 * awake);
      ctx.beginPath(); ctx.arc(px, -R * 1.2 - p * R * 1.3, 2.2 + (1 - p) * 2.2, 0, TAU); ctx.fill();
    }
    // 눈
    if (awake > 0.25 && fade < 0.4) {
      ctx.globalAlpha = (1 - fade * 2.5) * U.clamp((awake - 0.25) * 2, 0, 1);
      const bl = (Math.sin(t * 1.3 + seed * 5) > 0.96) ? 0.15 : 1;
      const look = Math.sin(t * 0.7 + seed) * 1.5;
      for (const sx of [-R * 0.3, R * 0.3]) {
        ctx.fillStyle = opt.eater ? 'rgba(255,196,120,0.98)' : 'rgba(244,236,200,0.95)';
        ctx.beginPath(); ctx.ellipse(sx, -R * 0.95, R * 0.13, R * 0.17 * bl, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#120c12';
        ctx.beginPath(); ctx.arc(sx + look, -R * 0.93, R * 0.055, 0, TAU); ctx.fill();
      }
    }
    ctx.restore();
  };

  /* ───────── 소품 ───────── */
  const INK = 'rgba(54,42,36,0.7)';

  function wobblyRect(ctx, x, y, w, h, k) {
    ctx.beginPath();
    ctx.moveTo(x - k, y); ctx.lineTo(x + w + k, y + k * 0.4);
    ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h);
    ctx.closePath();
  }

  const PROP = {};

  PROP.tree = function (ctx, e, p) {
    const s = p.s || 1, rnd = U.rng(p.seed || 7);
    const sway = Math.sin(e.t * 0.9 + (p.seed || 0)) * 1.5;
    ctx.strokeStyle = e.shade('#6b5140'); ctx.lineWidth = 3 * s; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 2); ctx.quadraticCurveTo(2 * s, -18 * s, sway * 0.4, -34 * s); ctx.stroke();
    const cols = p.autumn ? ['#c98a4a', '#d9a55a', '#b8683c'] : ['#6f9a62', '#86ad6e', '#5b8556'];
    for (let i = 0; i < 4; i++) {
      const a = rnd() * TAU, d = rnd() * 9 * s;
      ctx.fillStyle = e.shade(cols[i % 3], 0.92);
      ctx.beginPath(); ctx.arc(Math.cos(a) * d + sway, -44 * s + Math.sin(a) * d * 0.8, (13 + rnd() * 6) * s, 0, TAU); ctx.fill();
    }
    ctx.strokeStyle = e.ink(0.28); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(sway, -44 * s, 19 * s, -2.6, -0.3); ctx.stroke();
  };

  PROP.pine = function (ctx, e, p) {
    const s = p.s || 1;
    ctx.fillStyle = e.shade('#5a4636'); ctx.fillRect(-1.6 * s, -12 * s, 3.2 * s, 14 * s);
    for (let i = 0; i < 3; i++) {
      const w = (17 - i * 4) * s, y0 = (-10 - i * 15) * s;
      ctx.fillStyle = e.shade(['#4f7a5c', '#5b8766', '#6a9472'][i], 0.95);
      ctx.beginPath(); ctx.moveTo(-w, y0); ctx.lineTo(0, y0 - 24 * s); ctx.lineTo(w, y0); ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = e.ink(0.25); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-17 * s, -10 * s); ctx.lineTo(0, -64 * s); ctx.lineTo(17 * s, -10 * s); ctx.stroke();
  };

  PROP.house = function (ctx, e, p) {
    const s = p.s || 1, w = (p.w || 46) * s, h = (p.h || 30) * s;
    const wall = p.wall || '#efe2c8', roof = p.roof || '#b4664a';
    ctx.fillStyle = e.shade(wall);
    wobblyRect(ctx, -w / 2, -h, w, h + 4, 1); ctx.fill();
    ctx.strokeStyle = e.ink(0.4); ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = e.shade(roof);
    ctx.beginPath(); ctx.moveTo(-w / 2 - 6 * s, -h + 1); ctx.lineTo(-w * 0.12, -h - 20 * s); ctx.lineTo(w * 0.3, -h - 19 * s); ctx.lineTo(w / 2 + 6 * s, -h + 1); ctx.closePath();
    ctx.fill(); ctx.stroke();
    if (p.chimney !== false) {
      ctx.fillStyle = e.shade('#8a6a5a'); ctx.fillRect(w * 0.14, -h - 27 * s, 7 * s, 13 * s);
    }
    // 문과 창 — 불 없는 밤에는 캄캄하다
    ctx.fillStyle = e.shade('#6b4c38'); ctx.fillRect(-w * 0.34, -15 * s, 9 * s, 17 * s);
    const lit = e.lit(p);
    ctx.fillStyle = lit ? 'rgba(255,214,130,0.95)' : e.shade('#3c3d52', 0.9);
    ctx.fillRect(w * 0.06, -h + 8 * s, 11 * s, 10 * s);
    ctx.strokeStyle = e.ink(0.45); ctx.strokeRect(w * 0.06, -h + 8 * s, 11 * s, 10 * s);
    if (lit) e.glow(ctx, w * 0.06 + 5.5 * s, -h + 13 * s, 34 * s, [255, 190, 100], 0.5);
  };

  PROP.lamp = function (ctx, e, p) {
    const s = p.s || 1, h = 52 * s;
    ctx.strokeStyle = e.shade('#3f3a3c'); ctx.lineWidth = 2.4 * s; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(0, -h); ctx.stroke();
    ctx.lineWidth = 1.4 * s;
    ctx.beginPath(); ctx.moveTo(-5 * s, -h + 2); ctx.lineTo(5 * s, -h + 2); ctx.stroke();
    const lit = e.lit(p);
    ctx.fillStyle = lit ? 'rgba(255,226,150,0.95)' : e.shade('#8f97a3', 0.75);
    ctx.beginPath(); ctx.moveTo(-4.5 * s, -h); ctx.lineTo(4.5 * s, -h); ctx.lineTo(6 * s, -h - 11 * s); ctx.lineTo(-6 * s, -h - 11 * s); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = e.shade('#3f3a3c'); ctx.lineWidth = 1.1; ctx.stroke();
    ctx.fillStyle = e.shade('#3f3a3c');
    ctx.beginPath(); ctx.moveTo(-7 * s, -h - 11 * s); ctx.lineTo(0, -h - 17 * s); ctx.lineTo(7 * s, -h - 11 * s); ctx.closePath(); ctx.fill();
    if (lit) e.glow(ctx, 0, -h - 6 * s, 60 * s, [255, 200, 110], 0.6);
  };

  PROP.fence = function (ctx, e, p) {
    const n = p.n || 5;
    ctx.strokeStyle = e.shade('#8a7460'); ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const x = i * 11, y = e.gy(i * 11);
      ctx.beginPath(); ctx.moveTo(x, y + 2); ctx.lineTo(x + 0.6, y - 11); ctx.stroke();
      if (i < n - 1) { ctx.beginPath(); ctx.moveTo(x, y - 7); ctx.lineTo(x + 11, e.gy((i + 1) * 11) - 7); ctx.stroke(); }
    }
  };

  function chair(ctx, e, x, y, s, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = e.shade(col || '#7a5a44'); ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(-7, -30); ctx.stroke();           // 등받이 기둥
    ctx.beginPath(); ctx.moveTo(-7, -14); ctx.lineTo(8, -14); ctx.lineTo(8, 0); ctx.stroke(); // 앉는 곳 + 앞다리
    ctx.beginPath(); ctx.moveTo(-7, -26); ctx.lineTo(-7, -30); ctx.stroke();
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-7, -22); ctx.lineTo(-3, -22); ctx.stroke();
    ctx.restore();
  }
  PROP.chairs = function (ctx, e, p) {
    const gap = p.gap || 34;
    for (let i = 0; i < 3; i++) {
      const x = (i - 1) * gap;
      const third = typeof p.third === 'string' ? e.flags[p.third] : p.third;
      const faded = i === 1 && !third;        // 가운데 의자는 오래 비어 빛이 바랬다
      ctx.save();
      if (faded) ctx.globalAlpha *= 0.55;
      chair(ctx, e, x, e.gy(x), p.s || 1.15, faded ? '#9a8a80' : '#7a5a44');
      ctx.restore();
    }
  };

  PROP.column = function (ctx, e, p) {
    const s = p.s || 1, h = (p.h || 90) * s, w = 15 * s;
    ctx.fillStyle = e.shade('#f4ede0', 0.96);
    ctx.fillRect(-w / 2, -h, w, h + 6);
    ctx.fillRect(-w / 2 - 4 * s, -h - 6 * s, w + 8 * s, 7 * s);
    if (!p.broken) ctx.fillRect(-w / 2 - 6 * s, -h - 11 * s, w + 12 * s, 6 * s);
    ctx.strokeStyle = e.ink(0.16); ctx.lineWidth = 1;
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * 4 * s, -h + 2); ctx.lineTo(i * 4 * s, 4); ctx.stroke(); }
    if (p.broken) {
      ctx.fillStyle = e.shade('#f4ede0', 0.96);
      ctx.beginPath(); ctx.moveTo(-w / 2, -h - 6 * s); ctx.lineTo(-2 * s, -h - 15 * s); ctx.lineTo(3 * s, -h - 8 * s); ctx.lineTo(w / 2, -h - 12 * s); ctx.lineTo(w / 2, -h - 5 * s); ctx.closePath(); ctx.fill();
    }
  };

  PROP.arch = function (ctx, e, p) {
    const s = p.s || 1, w = 70 * s, h = 96 * s;
    ctx.strokeStyle = e.shade('#f4ede0', 0.95); ctx.lineWidth = 11 * s; ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.moveTo(-w / 2, 6); ctx.lineTo(-w / 2, -h + w / 2);
    ctx.arc(0, -h + w / 2, w / 2, Math.PI, 0); ctx.lineTo(w / 2, e.gy(w / 2) + 6); ctx.stroke();
    ctx.strokeStyle = e.ink(0.14); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, -h + w / 2, w / 2 - 5.5 * s, Math.PI, 0); ctx.stroke();
  };

  PROP.sign = function (ctx, e, p) {
    ctx.strokeStyle = e.shade('#7a6250'); ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(0, -30); ctx.stroke();
    ctx.fillStyle = e.shade('#c9ac84');
    ctx.beginPath(); ctx.moveTo(-3, -34); ctx.lineTo(20, -34); ctx.lineTo(26, -28); ctx.lineTo(20, -22); ctx.lineTo(-3, -22); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = e.ink(0.35); ctx.lineWidth = 1; ctx.stroke();
  };

  PROP.woodpile = function (ctx, e) {
    for (let r = 0; r < 3; r++) for (let i = 0; i < 4 - r; i++) {
      ctx.fillStyle = e.shade(['#a9805c', '#8f6a4a', '#b8916a'][(r + i) % 3]);
      ctx.beginPath(); ctx.arc(-10 + i * 7 + r * 3.5, -4 - r * 6, 3.6, 0, TAU); ctx.fill();
      ctx.strokeStyle = e.ink(0.3); ctx.lineWidth = 0.8; ctx.stroke();
    }
  };

  /* 마을 한가운데의 큰 화로 */
  PROP.hearth = function (ctx, e, p) {
    ctx.fillStyle = e.shade('#8d8478');
    ctx.beginPath(); ctx.ellipse(0, -3, 34, 9, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = e.ink(0.4); ctx.lineWidth = 1; ctx.stroke();
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = e.shade(['#a59b8c', '#978d80', '#b3a999'][i % 3]);
      ctx.beginPath(); ctx.ellipse(-27 + i * 9, -6 - Math.sin(i * 1.1) * 1.5, 6, 4.6, 0, 0, TAU); ctx.fill(); ctx.stroke();
    }
    // 재
    ctx.fillStyle = e.shade('#5d5860');
    ctx.beginPath(); ctx.moveTo(-20, -8); ctx.quadraticCurveTo(-4, -22, 10, -11); ctx.quadraticCurveTo(18, -9, 22, -8); ctx.closePath(); ctx.fill();
    // 지붕 기둥
    ctx.strokeStyle = e.shade('#6a5040'); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-36, 0); ctx.lineTo(-36, -62); ctx.moveTo(36, 0); ctx.lineTo(36, -62); ctx.stroke();
    ctx.fillStyle = e.shade('#9a5a44');
    ctx.beginPath(); ctx.moveTo(-48, -60); ctx.lineTo(0, -84); ctx.lineTo(48, -60); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = e.ink(0.4); ctx.lineWidth = 1; ctx.stroke();
    if (e.lit(p)) {
      const f = Math.sin(e.t * 9) * 2;
      ctx.fillStyle = 'rgba(255,170,70,0.95)';
      ctx.beginPath(); ctx.moveTo(-9, -10); ctx.quadraticCurveTo(-8, -26, f, -36 - f); ctx.quadraticCurveTo(9, -24, 9, -10); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,236,170,0.95)';
      ctx.beginPath(); ctx.moveTo(-4, -10); ctx.quadraticCurveTo(-3, -18, f * 0.5, -25); ctx.quadraticCurveTo(4, -18, 4, -10); ctx.closePath(); ctx.fill();
      e.glow(ctx, 0, -20, 130, [255, 160, 70], 0.7);
    }
  };

  /* 빛을 되비추는 오래된 종 */
  /* 빛을 모아 되비추는 종 (사물로 놓인다: 원점이 종의 한가운데) */
  PROP.bell = function (ctx, e, p) {
    const sw = Math.sin(e.t * 1.3) * 0.05;
    ctx.save(); ctx.translate(0, -18); ctx.rotate(sw);
    ctx.strokeStyle = e.shade('#6a5040'); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(0, 2); ctx.stroke();
    ctx.fillStyle = p.on ? '#ffe9a8' : e.shade('#d7a85a', 0.98);
    ctx.beginPath(); ctx.moveTo(-5, 2); ctx.quadraticCurveTo(-6, 18, -14, 31); ctx.lineTo(14, 31); ctx.quadraticCurveTo(6, 18, 5, 2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = e.ink(0.45); ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = 'rgba(255,250,225,0.8)';
    ctx.beginPath(); ctx.ellipse(-3, 19, 2.2, 8, 0.2, 0, TAU); ctx.fill();
    ctx.restore();
    if (p.on) e.glow(ctx, 0, 0, 60, [255, 226, 150], 0.7);
  };
  /* 종을 매단 틀 */
  PROP.belfry = function (ctx, e, p) {
    const h = p.h || 250;
    ctx.strokeStyle = e.shade('#6a5040'); ctx.lineWidth = 3.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-22, 3); ctx.lineTo(-16, -h - 26); ctx.lineTo(16, -h - 26); ctx.lineTo(22, e.gy(22) + 3); ctx.stroke();
    ctx.lineWidth = 2;
    for (let y = -40; y > -h; y -= 60) { ctx.beginPath(); ctx.moveTo(-21, y); ctx.lineTo(20, y - 30); ctx.stroke(); }
  };
  /* 배의 놋쇠 반사등 */
  PROP.reflector = function (ctx, e, p) {
    ctx.fillStyle = p.on ? '#fff0b8' : e.shade('#c9a25a');
    ctx.beginPath(); ctx.arc(0, 0, 13, 0.25 * Math.PI, 1.75 * Math.PI); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = e.ink(0.45); ctx.lineWidth = 1; ctx.stroke();
    if (p.on) e.glow(ctx, 0, 0, 54, [255, 226, 150], 0.7);
  };
  PROP.mast = function (ctx, e, p) {
    const h = p.h || 240;
    ctx.strokeStyle = e.shade('#5a4636'); ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 3); ctx.lineTo(0, -h); ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-34, -h * 0.72); ctx.lineTo(34, -h * 0.72); ctx.moveTo(-22, -h * 0.94); ctx.lineTo(22, -h * 0.94); ctx.stroke();
    ctx.strokeStyle = e.ink(0.25); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-34, -h * 0.72); ctx.lineTo(0, -h); ctx.lineTo(34, -h * 0.72); ctx.stroke();
  };

  PROP.lighthouse = function (ctx, e, p) {
    const s = p.s || 1, h = 150 * s;
    ctx.fillStyle = e.shade('#f1ebe0');
    ctx.beginPath(); ctx.moveTo(-17 * s, 4); ctx.lineTo(-10 * s, -h); ctx.lineTo(10 * s, -h); ctx.lineTo(17 * s, 4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = e.ink(0.4); ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = e.shade('#b9523f');
    for (const [a, b] of [[0.2, 0.36], [0.56, 0.72]]) {
      const ya = -h * a, yb = -h * b, wa = (17 - 7 * a) * s, wb = (17 - 7 * b) * s;
      ctx.beginPath(); ctx.moveTo(-wa, ya); ctx.lineTo(-wb, yb); ctx.lineTo(wb, yb); ctx.lineTo(wa, ya); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = e.shade('#3c4350'); ctx.fillRect(-14 * s, -h - 3 * s, 28 * s, 4 * s);
    const lit = e.lit(p);
    ctx.fillStyle = lit ? 'rgba(255,240,180,0.95)' : e.shade('#93a0ad', 0.7);
    ctx.fillRect(-8 * s, -h - 19 * s, 16 * s, 16 * s);
    ctx.strokeStyle = e.shade('#3c4350'); ctx.lineWidth = 1.2; ctx.strokeRect(-8 * s, -h - 19 * s, 16 * s, 16 * s);
    ctx.fillStyle = e.shade('#b9523f');
    ctx.beginPath(); ctx.moveTo(-11 * s, -h - 19 * s); ctx.lineTo(0, -h - 32 * s); ctx.lineTo(11 * s, -h - 19 * s); ctx.closePath(); ctx.fill();
    if (lit) {
      e.glow(ctx, 0, -h - 11 * s, 120 * s, [255, 230, 150], 0.7);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const a = Math.sin(e.t * 0.5) * 0.25;
      ctx.fillStyle = 'rgba(255,238,170,0.16)';
      ctx.beginPath(); ctx.moveTo(0, -h - 11 * s); ctx.lineTo(-520, -h - 11 * s - 70 + a * 200); ctx.lineTo(-520, -h - 11 * s + 50 + a * 200); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  };

  PROP.boat = function (ctx, e, p) {
    const s = p.s || 1, rock = Math.sin(e.t * 1.2 + (p.seed || 0)) * 0.06;
    ctx.save(); ctx.translate(0, 2); ctx.rotate(rock); ctx.scale(s * (p.dir || 1), s);
    ctx.fillStyle = e.shade(p.hull || '#8a5a44');
    ctx.beginPath(); ctx.moveTo(-26, -9); ctx.lineTo(28, -9); ctx.quadraticCurveTo(22, 5, 10, 5); ctx.lineTo(-16, 5); ctx.quadraticCurveTo(-23, 3, -26, -9); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = e.ink(0.45); ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = e.shade('#5a4636'); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-2, -9); ctx.lineTo(-2, -50); ctx.stroke();
    ctx.fillStyle = e.shade(p.sail || '#efe6d2', 0.95);
    ctx.beginPath(); ctx.moveTo(0, -48); ctx.quadraticCurveTo(22, -30, 20, -13); ctx.lineTo(0, -13); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = e.ink(0.3); ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = e.shade('#d8cdb6', 0.9);
    ctx.beginPath(); ctx.moveTo(-4, -44); ctx.lineTo(-17, -13); ctx.lineTo(-4, -13); ctx.closePath(); ctx.fill();
    // 뱃머리 등 (꺼져 있다)
    ctx.fillStyle = p.home ? 'rgba(210,225,255,0.95)' : e.shade('#7b8794', 0.8);
    ctx.beginPath(); ctx.arc(24, -14, 2.6, 0, TAU); ctx.fill();
    ctx.restore();
  };

  PROP.pier = function (ctx, e, p) {
    const w = p.w || 120;
    ctx.fillStyle = e.shade('#8a6e56');
    ctx.fillRect(0, -9, w, 5);
    ctx.strokeStyle = e.ink(0.35); ctx.lineWidth = 1; ctx.strokeRect(0, -9, w, 5);
    ctx.strokeStyle = e.shade('#5f4a3a'); ctx.lineWidth = 3.2;
    for (let x = 6; x < w; x += 26) { ctx.beginPath(); ctx.moveTo(x, -4); ctx.lineTo(x, 26); ctx.stroke(); }
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(w - 5, -9); ctx.lineTo(w - 5, -20); ctx.stroke();
  };

  PROP.crate = function (ctx, e, p) {
    const s = p.s || 1;
    ctx.fillStyle = e.shade('#b08c62'); ctx.fillRect(-9 * s, -16 * s, 18 * s, 17 * s);
    ctx.strokeStyle = e.ink(0.4); ctx.lineWidth = 1; ctx.strokeRect(-9 * s, -16 * s, 18 * s, 17 * s);
    ctx.beginPath(); ctx.moveTo(-9 * s, -16 * s); ctx.lineTo(9 * s, 1 * s); ctx.stroke();
  };

  /* 도시 지붕 위 */
  PROP.tank = function (ctx, e, p) {
    const s = p.s || 1;
    ctx.strokeStyle = e.shade('#4a4650'); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-9 * s, 0); ctx.lineTo(-7 * s, -12 * s); ctx.moveTo(9 * s, 0); ctx.lineTo(7 * s, -12 * s); ctx.stroke();
    ctx.fillStyle = e.shade('#8c7a6a'); ctx.fillRect(-10 * s, -32 * s, 20 * s, 21 * s);
    ctx.strokeStyle = e.ink(0.4); ctx.lineWidth = 1; ctx.strokeRect(-10 * s, -32 * s, 20 * s, 21 * s);
    ctx.fillStyle = e.shade('#6e6058');
    ctx.beginPath(); ctx.moveTo(-12 * s, -32 * s); ctx.lineTo(0, -41 * s); ctx.lineTo(12 * s, -32 * s); ctx.closePath(); ctx.fill();
  };
  PROP.antenna = function (ctx, e, p) {
    const s = p.s || 1;
    ctx.strokeStyle = e.shade('#3c3a44'); ctx.lineWidth = 1.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -40 * s);
    for (let i = 0; i < 3; i++) { ctx.moveTo(-8 * s + i * 2, (-22 - i * 6) * s); ctx.lineTo(8 * s - i * 2, (-22 - i * 6) * s); }
    ctx.stroke();
  };
  PROP.neon = function (ctx, e, p) {
    const w = p.w || 64, h = 26, lit = e.lit(p);
    ctx.strokeStyle = e.shade('#3c3a44'); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-w / 2 + 8, 0); ctx.lineTo(-w / 2 + 8, -12); ctx.moveTo(w / 2 - 8, 0); ctx.lineTo(w / 2 - 8, -12); ctx.stroke();
    ctx.fillStyle = e.shade('#2c2a38', 0.92); ctx.fillRect(-w / 2, -12 - h, w, h);
    const col = lit ? (p.col || '#ff5ac8') : e.shade('#6a6878');
    ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    const y0 = -12 - h / 2;
    for (let i = 0; i < 4; i++) {
      const x = -w / 2 + 10 + i * ((w - 20) / 3.4);
      ctx.moveTo(x, y0 + 6); ctx.lineTo(x, y0 - 6); ctx.lineTo(x + 6, y0 - 1); ctx.lineTo(x + 3, y0 + 6);
    }
    ctx.stroke();
    if (lit) e.glow(ctx, 0, y0, w, U.rgb(p.col || '#ff5ac8'), 0.6);
  };
  PROP.streetlight = function (ctx, e, p) {
    const s = p.s || 1, h = 62 * s, lit = e.lit(p);
    ctx.strokeStyle = e.shade('#3a3842'); ctx.lineWidth = 2.6 * s; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(0, -h + 8 * s); ctx.quadraticCurveTo(0, -h, 12 * s, -h); ctx.stroke();
    ctx.fillStyle = lit ? 'rgba(255,214,140,0.96)' : e.shade('#868a94', 0.8);
    ctx.beginPath(); ctx.ellipse(15 * s, -h + 2 * s, 6 * s, 3.2 * s, 0, 0, TAU); ctx.fill();
    if (lit) e.glow(ctx, 15 * s, -h + 4 * s, 70 * s, [255, 190, 100], 0.6);
  };
  PROP.cross = function (ctx, e, p) {
    const lit = e.lit(p);
    ctx.fillStyle = e.shade('#e9e6df'); ctx.fillRect(-15, -34, 30, 30);
    ctx.strokeStyle = e.ink(0.35); ctx.lineWidth = 1; ctx.strokeRect(-15, -34, 30, 30);
    ctx.fillStyle = lit ? '#6fdcae' : e.shade('#7f9c90');
    ctx.fillRect(-4, -30, 8, 22); ctx.fillRect(-11, -23, 22, 8);
    ctx.fillStyle = e.shade('#3a3842'); ctx.fillRect(-2, -4, 4, 6);
    if (lit) e.glow(ctx, 0, -19, 60, [130, 230, 180], 0.55);
  };

  /* 동굴 */
  PROP.crystal = function (ctx, e, p) {
    const s = p.s || 1, col = p.col || '#9fb6e8';
    for (const [dx, h, w, a] of [[-7, 20, 5, -0.25], [0, 32, 6.5, 0], [8, 18, 4.5, 0.3]]) {
      ctx.save(); ctx.translate(dx * s, 2); ctx.rotate(a);
      ctx.fillStyle = e.shade(col, 0.85);
      ctx.beginPath(); ctx.moveTo(-w * s, 0); ctx.lineTo(-w * s * 0.8, -h * s * 0.75); ctx.lineTo(0, -h * s); ctx.lineTo(w * s * 0.8, -h * s * 0.75); ctx.lineTo(w * s, 0); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, -h * s); ctx.lineTo(0, 0); ctx.stroke();
      ctx.restore();
    }
  };
  PROP.stalagmite = function (ctx, e, p) {
    const s = p.s || 1, h = (p.h || 40) * s;
    ctx.fillStyle = e.shade('#6b5a58');
    ctx.beginPath(); ctx.moveTo(-10 * s, 3); ctx.quadraticCurveTo(-3 * s, -h * 0.5, 0, -h); ctx.quadraticCurveTo(3 * s, -h * 0.5, 11 * s, 3); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = e.ink(0.3); ctx.lineWidth = 1; ctx.stroke();
  };

  /* 밤의 영역: 하늘에 걸린 빼앗긴 빛 */
  PROP.hung = function (ctx, e, p) {
    const len = p.len || 120, col = U.rgb(p.col || '#ffd08a');
    const sw = Math.sin(e.t * 0.8 + (p.seed || 0)) * 5;
    const fl = 0.5 + 0.3 * Math.sin(e.t * (3 + (p.seed || 0) % 3) + (p.seed || 0)) + (Math.sin(e.t * 17 + (p.seed || 0)) > 0.92 ? -0.4 : 0);
    ctx.strokeStyle = 'rgba(200,205,235,0.25)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, -len - 400); ctx.quadraticCurveTo(sw * 0.3, -len * 0.5 - 100, sw, -len); ctx.stroke();
    ctx.fillStyle = U.css(col, 0.35 + fl * 0.5);
    ctx.beginPath(); ctx.arc(sw, -len + 5, 5, 0, TAU); ctx.fill();
    e.glow(ctx, sw, -len + 5, 44, col, 0.25 + fl * 0.35);
  };

  /* 기억 조각 */
  PROP.shard = function (ctx, e, p) {
    const bob = Math.sin(e.t * 1.6 + (p.seed || 0)) * 4, rot = Math.sin(e.t * 0.8 + (p.seed || 0)) * 0.3;
    ctx.save(); ctx.translate(0, bob); ctx.rotate(rot);
    e.glow(ctx, 0, 0, 46, [255, 214, 150], 0.55);
    ctx.fillStyle = 'rgba(255,232,180,0.9)';
    ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(7, -2); ctx.lineTo(3, 10); ctx.lineTo(-6, 6); ctx.lineTo(-7, -4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
  };

  /* 황혼의 단서: 보랏빛으로 일렁이는 흔적 */
  PROP.clue = function (ctx, e, p) {
    const pulse = 0.6 + 0.4 * Math.sin(e.t * 2.2 + (p.seed || 0));
    e.glow(ctx, 0, -(p.dy || 26), 30 + pulse * 10, [196, 140, 230], 0.35 + pulse * 0.25);
    ctx.fillStyle = `rgba(236,214,255,${0.6 + pulse * 0.35})`;
    for (let i = 0; i < 3; i++) {
      const a = e.t * 0.9 + i * 2.1, r = 9 + i * 3;
      ctx.beginPath(); ctx.arc(Math.cos(a) * r, -(p.dy || 26) + Math.sin(a) * r * 0.6, 1.5, 0, TAU); ctx.fill();
    }
  };

  /* 골목 위의 광고판 (꼭대기에 멈춘 시계) */
  PROP.billboard = function (ctx, e) {
    ctx.strokeStyle = e.shade('#3a3842'); ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-52, 8); ctx.lineTo(-52, 360); ctx.moveTo(52, 8); ctx.lineTo(52, 360); ctx.stroke();
    ctx.fillStyle = e.shade('#2c2a38', 0.92); ctx.fillRect(-60, 12, 120, 62);
    ctx.strokeStyle = e.shade('#6a6878'); ctx.lineWidth = 2;
    ctx.beginPath(); for (let i = 0; i < 4; i++) { const x = -40 + i * 26; ctx.moveTo(x, 58); ctx.lineTo(x, 30); ctx.lineTo(x + 10, 44); } ctx.stroke();
    ctx.fillStyle = e.shade('#e6e0d2');
    ctx.beginPath(); ctx.arc(0, -20, 15, 0, TAU); ctx.fill();
    ctx.strokeStyle = e.shade('#3a3842'); ctx.lineWidth = 2; ctx.stroke();
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(-9, -16); ctx.moveTo(0, -20); ctx.lineTo(0, -31); ctx.stroke();
  };
  PROP.none = function () {};

  /* 등불을 거는 고리 */
  PROP.hook = function (ctx, e, p) {
    const pulse = 0.5 + 0.5 * Math.sin(e.t * 2.6 + (p.seed || 0));
    ctx.strokeStyle = e.shade('#4a4038'); ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(0, -5); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 5, -0.5 * Math.PI, 1.1 * Math.PI); ctx.stroke();
    if (p.active && !p.held) {
      ctx.strokeStyle = `rgba(255,236,180,${0.35 + pulse * 0.45})`; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(0, 0, 11 + pulse * 3, 0, TAU); ctx.stroke();
    }
  };
  /* 황혼에만 드러나는 것이 숨어 있는 자리의 희미한 반짝임 */
  PROP.glint = function (ctx, e, p) {
    const tw = Math.max(0, Math.sin(e.t * 1.7 + (p.seed || 0) * 0.37));
    const c = p.violet ? '214,170,255' : '255,232,190';
    ctx.strokeStyle = `rgba(${c},${0.15 + tw * 0.55})`; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
    const r = 3 + tw * 4;
    ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.moveTo(0, -r); ctx.lineTo(0, r); ctx.stroke();
  };
  /* 등 기둥 (고리를 다는 곳) */
  PROP.post = function (ctx, e, p) {
    const h = p.h || 70;
    ctx.strokeStyle = e.shade('#4a4038'); ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 3); ctx.lineTo(0, -h - 14); ctx.stroke();
    ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(0, -h - 14); ctx.quadraticCurveTo(0, -h - 26, (p.arm || 0) * 0.5, -h - 24); ctx.lineTo(p.arm || 0, -h - 12); ctx.stroke();
  };
  /* 다리지기의 오두막 창 */
  PROP.hut = function (ctx, e, p) {
    PROP.house(ctx, e, Object.assign({ w: 50, h: 32, roof: '#7f6a52' }, p));
  };

  /* 눈길을 끄는 반짝임 (누를 수 있는 것 위에) */
  PROP.spark = function (ctx, e, p) {
    const pulse = 0.5 + 0.5 * Math.sin(e.t * 3 + (p.seed || 0));
    const col = p.col || [255, 240, 190];
    e.glow(ctx, 0, -(p.dy || 30), 20 + pulse * 8, col, 0.45);
    ctx.strokeStyle = `rgba(255,252,235,${0.5 + pulse * 0.5})`; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
    const y = -(p.dy || 30), r = 5 + pulse * 3;
    ctx.beginPath(); ctx.moveTo(-r, y); ctx.lineTo(r, y); ctx.moveTo(0, y - r); ctx.lineTo(0, y + r); ctx.stroke();
  };

  /* 길을 막는 것들 */
  PROP.rocks = function (ctx, e, p) {
    const w = p.w || 80, rnd = U.rng(p.seed || 3);
    const n = Math.max(4, Math.round(w / 15));
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + (i + 0.5) * (w / n) + (rnd() - 0.5) * 6;
      const r = 13 + rnd() * 12, up = (i % 2) * (9 + rnd() * 16);
      const y = e.gy(x) - up - r * 0.4;
      ctx.fillStyle = e.shade(['#a7a096', '#958e86', '#b5ada2'][i % 3]);
      ctx.beginPath();
      ctx.moveTo(x - r, y + r * 0.7); ctx.lineTo(x - r * 0.7, y - r * 0.5); ctx.lineTo(x - r * 0.1, y - r * 0.85);
      ctx.lineTo(x + r * 0.75, y - r * 0.45); ctx.lineTo(x + r, y + r * 0.7); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = e.ink(0.4); ctx.lineWidth = 1; ctx.stroke();
    }
  };
  PROP.bramble = function (ctx, e, p) {
    const w = p.w || 80, rnd = U.rng(p.seed || 5);
    ctx.lineCap = 'round';
    for (let i = 0; i < 16; i++) {
      const x = -w / 2 + rnd() * w, y0 = e.gy(x) + 3, hgt = 16 + rnd() * 30, bend = (rnd() - 0.5) * 34;
      ctx.strokeStyle = e.shade(['#5b4a3c', '#6d5a48', '#4a5a44'][i % 3]); ctx.lineWidth = 1.6 + rnd();
      ctx.beginPath(); ctx.moveTo(x, y0); ctx.quadraticCurveTo(x + bend, y0 - hgt * 0.7, x + bend * 0.4, y0 - hgt); ctx.stroke();
      ctx.lineWidth = 1;
      for (let k = 0; k < 3; k++) {
        const t = 0.3 + k * 0.25, tx = x + bend * t * 0.9, ty = y0 - hgt * t;
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx + (k % 2 ? 5 : -5), ty - 4); ctx.stroke();
      }
    }
  };
  /* 동굴 어귀 */
  PROP.cavehole = function (ctx, e) {
    ctx.fillStyle = e.shade('#6d665e');
    ctx.beginPath(); ctx.moveTo(-170, 8); ctx.quadraticCurveTo(-150, -150, -20, -176); ctx.quadraticCurveTo(110, -160, 150, 8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = e.ink(0.35); ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = 'rgba(14,10,16,0.92)';
    ctx.beginPath(); ctx.moveTo(-84, 8); ctx.quadraticCurveTo(-78, -104, -6, -112); ctx.quadraticCurveTo(66, -100, 76, 8); ctx.closePath(); ctx.fill();
  };

  /* 멈춰 선 차들 */
  PROP.cars = function (ctx, e, p) {
    const w = p.w || 120, n = Math.max(2, Math.round(w / 62));
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + (i + 0.5) * (w / n), y = e.gy(x) + 1;
      ctx.fillStyle = e.shade(['#8a5a52', '#56708a', '#8a8468'][i % 3]);
      ctx.beginPath();
      ctx.moveTo(x - 27, y - 5); ctx.lineTo(x - 26, y - 15); ctx.lineTo(x - 15, y - 17); ctx.lineTo(x - 9, y - 28);
      ctx.lineTo(x + 11, y - 28); ctx.lineTo(x + 18, y - 17); ctx.lineTo(x + 27, y - 15); ctx.lineTo(x + 27, y - 5); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = e.ink(0.4); ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = e.shade('#2e3040', 0.9);
      ctx.fillRect(x - 7, y - 25, 7, 8); ctx.fillRect(x + 2, y - 25, 8, 8);
      ctx.fillStyle = e.shade('#26242c');
      ctx.beginPath(); ctx.arc(x - 15, y - 4, 5, 0, TAU); ctx.arc(x + 16, y - 4, 5, 0, TAU); ctx.fill();
    }
  };
  /* 해시계 */
  PROP.sundial = function (ctx, e) {
    ctx.fillStyle = e.shade('#b9b0a2');
    ctx.fillRect(-6, -22, 12, 24);
    ctx.beginPath(); ctx.ellipse(0, -24, 19, 6, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = e.ink(0.4); ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = e.shade('#7a7268');
    ctx.beginPath(); ctx.moveTo(-2, -25); ctx.lineTo(9, -25); ctx.lineTo(-2, -42); ctx.closePath(); ctx.fill();
  };
  /* 지하철 입구 */
  PROP.subway = function (ctx, e) {
    ctx.fillStyle = e.shade('#2a2832'); ctx.fillRect(-34, -30, 68, 32);
    ctx.fillStyle = e.shade('#55525e'); ctx.fillRect(-40, -38, 80, 9);
    ctx.strokeStyle = e.ink(0.4); ctx.lineWidth = 1; ctx.strokeRect(-40, -38, 80, 9);
    ctx.strokeStyle = e.shade('#77747e'); ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-30 + i * 3, -22 + i * 5); ctx.lineTo(30 - i * 3, -22 + i * 5); ctx.stroke(); }
    ctx.fillStyle = e.shade('#c9c4b6'); ctx.fillRect(-12, -52, 24, 12);
    ctx.fillStyle = e.shade('#3a3842'); ctx.fillRect(-1, -40, 2, 4);
  };
  /* 멈춘 시계탑 */
  PROP.clock = function (ctx, e) {
    ctx.strokeStyle = e.shade('#3a3842'); ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(0, -58); ctx.stroke();
    ctx.fillStyle = e.shade('#e6e0d2');
    ctx.beginPath(); ctx.arc(0, -70, 14, 0, TAU); ctx.fill();
    ctx.strokeStyle = e.shade('#3a3842'); ctx.lineWidth = 2; ctx.stroke();
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(0, -70); ctx.lineTo(-8, -66); ctx.moveTo(0, -70); ctx.lineTo(0, -80); ctx.stroke();
  };

  /* 등불을 올려 두는 돌 받침 */
  PROP.stand = function (ctx, e) {
    ctx.fillStyle = e.shade('#b5ada2');
    ctx.beginPath(); ctx.moveTo(-17, 3); ctx.lineTo(-12, -8); ctx.lineTo(12, -8); ctx.lineTo(17, 3); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = e.ink(0.4); ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = e.shade('#e9d6a8', 0.9); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(0, -3, 4, 0, TAU); ctx.stroke();
  };

  PROP.lonetree = function (ctx, e, p) {
    const s = p.s || 1;
    ctx.strokeStyle = e.shade('#4a3a40'); ctx.lineCap = 'round';
    const br = (x0, y0, a, len, w, depth) => {
      const x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len;
      ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      if (depth > 0) {
        const sw = Math.sin(e.t * 0.7 + depth) * 0.03;
        br(x1, y1, a - 0.45 + sw, len * 0.72, w * 0.68, depth - 1);
        br(x1, y1, a + 0.38 + sw, len * 0.7, w * 0.66, depth - 1);
      }
    };
    br(0, 4, -Math.PI / 2 - 0.08, 44 * s, 5 * s, 4);
  };

  Art.prop = function (ctx, type, e, p) {
    const fn = PROP[type];
    if (fn) fn(ctx, e, p || {});
  };
  Art.hasProp = (type) => !!PROP[type];

  /* ───────── 하늘의 것들 ───────── */
  Art.star = function (ctx, x, y, r, a, t) {
    const tw = 0.75 + 0.25 * Math.sin(t * 2.3 + x * 0.1);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 5);
    g.addColorStop(0, `rgba(225,232,255,${0.7 * a * tw})`);
    g.addColorStop(1, 'rgba(225,232,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 5, 0, TAU); ctx.fill();
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.beginPath();
    const R = r * 2.4 * tw, q = r * 0.42;
    ctx.moveTo(x, y - R); ctx.lineTo(x + q, y - q); ctx.lineTo(x + R, y); ctx.lineTo(x + q, y + q);
    ctx.lineTo(x, y + R); ctx.lineTo(x - q, y + q); ctx.lineTo(x - R, y); ctx.lineTo(x - q, y - q);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  };

  /* 종이결: 한 번 만들어 화면 전체에 곱해 준다 */
  Art.paper = function () {
    if (Art._paper) return Art._paper;
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const x = c.getContext('2d');
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, 512, 512);
    const rnd = U.rng(20261120);
    for (let i = 0; i < 2600; i++) {
      const g = 150 + rnd() * 80;
      x.fillStyle = `rgba(${g},${g * 0.96},${g * 0.9},${0.05 + rnd() * 0.08})`;
      x.beginPath(); x.arc(rnd() * 512, rnd() * 512, 0.6 + rnd() * 2.6, 0, TAU); x.fill();
    }
    x.lineWidth = 0.7;
    for (let i = 0; i < 520; i++) {
      const px = rnd() * 512, py = rnd() * 512, a = rnd() * TAU, len = 6 + rnd() * 26;
      x.strokeStyle = `rgba(120,105,90,${0.03 + rnd() * 0.05})`;
      x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a) * len * 0.5 + rnd() * 6 - 3, py + Math.sin(a) * len * 0.5 + rnd() * 6 - 3, px + Math.cos(a) * len, py + Math.sin(a) * len); x.stroke();
    }
    for (let i = 0; i < 26; i++) {
      const px = rnd() * 512, py = rnd() * 512, r = 40 + rnd() * 90;
      const g = x.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, `rgba(160,140,115,${0.05 + rnd() * 0.05})`); g.addColorStop(1, 'rgba(160,140,115,0)');
      x.fillStyle = g; x.fillRect(px - r, py - r, r * 2, r * 2);
    }
    return (Art._paper = c);
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
