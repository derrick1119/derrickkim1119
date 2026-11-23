/* Take Your Time — figures: a small cut-paper puppet rig (side view) for the family, and Bean.
   Local space: origin at the hip, +x is the way the figure faces, y is down, 100 units ≈ a standing adult. */
(function () {
  'use strict';
  const T = window.TYT;
  const F = (T.F = {});
  const TAU = Math.PI * 2, d2r = Math.PI / 180;

  F.styles = {
    leo: { skin: '#e7b793', hair: '#3a2b25', hairStyle: 'short', top: '#d7a23c', bottom: '#4b5669', shoe: '#33291f' },
    leoBed: { skin: '#e9c0a2', hair: '#3a2b25', hairStyle: 'beanie', beanie: '#d7a23c', top: '#c5d3da', stripe: '#9fb4c2', bottom: '#c5d3da', shoe: '#33291f' },
    ana: { skin: '#f0c7a9', hair: '#2a2024', hairStyle: 'bob', top: '#c9573f', bottom: '#e9dcc3', skirt: 30, shoe: '#5a3a2e' },
    lily: { skin: '#f3ccb0', hair: '#3b2a23', hairStyle: 'apple', tie: '#c9573f', top: '#7fb0c9', bottom: '#7fb0c9', skirt: 17, shoe: '#c9573f', kid: true },
    /* chapter one */
    anaBlack: { skin: '#f0c7a9', hair: '#2a2024', hairStyle: 'bob', top: '#2f2b35', bottom: '#2f2b35', skirt: 30, shoe: '#221d24' },
    leoHome: { skin: '#e9c0a2', hair: '#3a2b25', hairStyle: 'beanie', beanie: '#d7a23c', top: '#eee3d0', scarf: '#c9443a', bottom: '#4b5669', shoe: '#33291f' },
    leoKid: { skin: '#f0c4a6', hair: '#3a2b25', hairStyle: 'short', top: '#d7a23c', bottom: '#4b5669', shoe: '#33291f', kid: true },
    /* his mother: she has been here since he was seven, and has let herself grow old watching him */
    mom: { skin: '#eec3a6', hair: '#a59a94', hairStyle: 'bun', top: '#7b5a86', scarf: '#e9dcc3', bottom: '#3f6b70', skirt: 34, shoe: '#4a3530' },
    bram: { skin: '#e2ad88', hair: '#f3efe6', hairStyle: 'short', beard: '#f3efe6', cap: '#2f4460', top: '#2f4460', bottom: '#6b5a48', shoe: '#33291f' },
    rosa: { skin: '#f1c8aa', hair: '#6b3f2a', hairStyle: 'bob', top: '#e9b93a', bottom: '#e9b93a', skirt: 26, shoe: '#5a3a2e' },
    post: { skin: '#e7b793', hair: '#3a2b25', hairStyle: 'short', cap: '#3f6b8a', top: '#3f6b8a', bottom: '#2f4460', shoe: '#33291f' },
    villagerA: { skin: '#e7b793', hair: '#8a8a8a', hairStyle: 'short', top: '#6f9a8a', bottom: '#5a4a44', shoe: '#33291f' },
    villagerB: { skin: '#f0c7a9', hair: '#c9c2b4', hairStyle: 'bun', top: '#c9805a', bottom: '#5d6f8a', skirt: 28, shoe: '#4a3530' },
    /* the later chapters */
    bramWife: { skin: '#eec3a6', hair: '#f6f2ea', hairStyle: 'bun', top: '#b98aa4', scarf: '#f6e9cc', bottom: '#6b5a78', skirt: 34, shoe: '#4a3530' },
    rosaSon: { skin: '#e2ad88', hair: '#f3efe6', hairStyle: 'short', top: '#8a8f9a', bottom: '#4b5669', shoe: '#33291f' },
    villagerC: { skin: '#e2ad88', hair: '#5a4a44', hairStyle: 'short', top: '#8a5578', bottom: '#4b5669', shoe: '#33291f' },
    groom: { skin: '#e7b793', hair: '#3a2b25', hairStyle: 'short', top: '#4b5669', bottom: '#4b5669', shoe: '#221d24' },
    kidA: { skin: '#f3ccb0', hair: '#3b2a23', hairStyle: 'short', top: '#d7a23c', bottom: '#4b5669', shoe: '#33291f', kid: true },
    kidB: { skin: '#f0c4a6', hair: '#6b3f2a', hairStyle: 'apple', tie: '#f1c04a', top: '#c9573f', bottom: '#c9573f', skirt: 16, shoe: '#5a3a2e', kid: true },
    kidC: { skin: '#f3ccb0', hair: '#2a2024', hairStyle: 'short', top: '#7fb0c9', bottom: '#5d6f8a', shoe: '#33291f', kid: true },
    /* the little one who watches the clouds: about six, and always in her small knitted hat */
    cloud: { skin: '#f4d0b8', hair: '#3b2a23', hairStyle: 'bob', top: '#e3e6f3', bottom: '#e3e6f3', skirt: 16, shoe: '#8f7f9e', kid: true, knit: '#e2909c' },
  };
  /* a small knitted hat, rose, with a cream bobble (worn as style.knit) */
  F.KNIT = '#e2909c';
  /* Leo in Welcome Harbor, k = 0 (as he arrived) … 4 (white). The beanie hides most of it. */
  F.leoAt = function (k) {
    const u = T.clamp(k / 4);
    return Object.assign({}, F.styles.leoHome, { hair: T.mix('#3a2b25', '#f3efe6', u), skin: T.mix('#e9c0a2', '#e2b497', u) });
  };
  F.leoBare = function () { return Object.assign({}, F.styles.leoHome, { hairStyle: 'short', hair: '#f3efe6', skin: '#e2b497' }); };
  /* Ana and Lily in the living world, by age */
  F.anaAt = function (age, o) {
    const u = T.clamp((age - 44) / 34);
    return Object.assign({}, F.styles.ana, { hair: T.mix('#2a2024', '#f3efe8', u), skin: T.mix('#f0c7a9', '#ecc1a6', u) }, o || {});
  };
  F.lilyAt = function (age, o) {
    if (age < 13) return Object.assign({}, F.styles.lily, o || {});
    const u = T.clamp((age - 38) / 30);
    return Object.assign({ skin: '#f3ccb0', hair: T.mix('#3b2a23', '#d9d2c6', u), hairStyle: 'bob', top: '#7fb0c9', bottom: '#5d8fb0', skirt: 28, shoe: '#c9573f' }, o || {});
  };

  const ADULT = { thigh: 25, shin: 25, torso: 32, sh: 26, neck: 10, R: 8.4, ua: 15.5, fa: 14.5, legW: 7.4, armW: 5.4, torsoW: 16.5, hand: 3 };
  const KID = { thigh: 14.5, shin: 14.5, torso: 21, sh: 18, neck: 12, R: 11, ua: 10, fa: 9.5, legW: 6.4, armW: 5, torsoW: 15, hand: 2.9 };

  function ik(ax, ay, tx, ty, l1, l2, bend) {
    let dx = tx - ax, dy = ty - ay, d = Math.hypot(dx, dy) || 0.001;
    const max = l1 + l2 - 0.02, min = Math.abs(l1 - l2) + 0.02;
    if (d > max) { dx *= max / d; dy *= max / d; d = max; }
    if (d < min) { dx *= min / d; dy *= min / d; d = min; }
    const a = Math.atan2(dy, dx);
    const A = Math.acos(T.clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
    const ea = a + A * bend;
    return [ax + Math.cos(ea) * l1, ay + Math.sin(ea) * l1, ax + dx, ay + dy];
  }
  function limb(g, pts, w, color) {
    g.strokeStyle = color; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(pts[0], pts[1]); g.lineTo(pts[2], pts[3]); g.lineTo(pts[4], pts[5]); g.stroke();
  }

  /* The head, facing +x: forehead, the bridge and tip of the nose, lips, chin, jaw, the back of the skull.
     ft is how far the features stand out: 1 for a grown face, less for a child's. */
  function headPath(g, R, ft) {
    g.beginPath();
    g.moveTo(-R * 0.1, -R * 1.02);
    g.quadraticCurveTo(R * 0.74, -R * 1.02, R * 0.9, -R * 0.3);
    g.quadraticCurveTo(R * 0.93, -R * 0.06, R * (0.92 + 0.28 * ft), R * 0.2);
    g.quadraticCurveTo(R * (0.94 + 0.12 * ft), R * 0.35, R * 0.86, R * 0.37);
    g.quadraticCurveTo(R * 0.97, R * 0.64, R * (0.64 + 0.1 * ft), R * (0.93 + 0.05 * ft));
    g.quadraticCurveTo(R * 0.2, R * 1.12, -R * 0.5, R * 0.8);
    g.quadraticCurveTo(-R * 1.06, R * 0.5, -R * 1.02, -R * 0.12);
    g.quadraticCurveTo(-R * 0.98, -R * 1.02, -R * 0.1, -R * 1.02);
    g.closePath();
  }
  function hairPath(g, style, R, st) {
    const d = Math.PI / 180;
    g.beginPath();
    if (style === 'short') {
      g.arc(0, 0, R + 0.9, -38 * d, 168 * d, true);
      g.quadraticCurveTo(-R * 0.55, R * 0.35, -R * 0.2, -R * 0.1);
      g.quadraticCurveTo(R * 0.25, -R * 0.42, R * 0.84, -R * 0.52);
      g.closePath();
    } else if (style === 'bob') {
      g.arc(0, 0, R + 1.7, -26 * d, 178 * d, true);
      g.quadraticCurveTo(-R - 2.4, R * 0.9, -R * 0.55, R + 2.6);
      g.quadraticCurveTo(R * 0.02, R + 2.2, R * 0.05, R * 0.25);
      g.quadraticCurveTo(R * 0.12, -R * 0.28, R * 0.98, -R * 0.36);
      g.closePath();
    } else if (style === 'apple') {
      g.arc(0, 0, R + 1, -34 * d, 172 * d, true);
      g.quadraticCurveTo(-R * 0.75, R * 0.6, -R * 0.15, R * 0.15);
      g.quadraticCurveTo(R * 0.2, -R * 0.4, R * 0.86, -R * 0.5);
      g.closePath();
    } else if (style === 'beanie') {
      g.arc(0, 0, R + 1.5, -34 * d, 176 * d, true);   /* worn back off the brow */
      g.closePath();
    } else if (style === 'bun') {
      g.arc(0, 0, R + 1.1, -30 * d, 172 * d, true);
      g.quadraticCurveTo(-R * 0.7, R * 0.5, -R * 0.2, R * 0.05);
      g.quadraticCurveTo(R * 0.25, -R * 0.38, R * 0.88, -R * 0.46);
      g.closePath();
    }
  }

  /* Draws a person. Returns world positions of the joints props attach to. */
  F.person = function (g, o) {
    const st = o.style, K = st.kid ? KID : ADULT;
    const u = (o.s || 240) / 100, sx = o.flip ? -1 : 1;
    const lean = o.lean || 0;
    const only = o.only || null, skip = o.skip || {};
    const dark = (c) => T.shade(c, -0.13);
    /* torso axis: straight up, tipped toward +x by `lean` */
    const ax = Math.sin(lean), ay = -Math.cos(lean);
    const hip = [0, 0];
    const shd = [ax * K.sh, ay * K.sh];
    const nk = [ax * K.torso, ay * K.torso];
    const ha = lean * 0.55 + (o.headTilt || 0);
    const head = [nk[0] + Math.sin(ha) * K.neck + (o.headDx || 0), nk[1] - Math.cos(ha) * K.neck + (o.headDy || 0)];

    function arm(spec, side) {
      const s0 = [shd[0] + (side === 'B' ? -1.2 : 1.2), shd[1] + 1.5];
      if (spec && spec.hand) {
        const r = ik(s0[0], s0[1], spec.hand[0], spec.hand[1], K.ua, K.fa, spec.bend == null ? 1 : spec.bend);
        return [s0[0], s0[1], r[0], r[1], r[2], r[3]];
      }
      const a = spec ? spec.a || 0 : 0, b = spec ? spec.b || 0 : 0.12;
      const t1 = Math.PI / 2 - a - lean * 0.3, t2 = t1 - b;
      const ex = s0[0] + Math.cos(t1) * K.ua, ey = s0[1] + Math.sin(t1) * K.ua;
      return [s0[0], s0[1], ex, ey, ex + Math.cos(t2) * K.fa, ey + Math.sin(t2) * K.fa];
    }
    function leg(spec, side) {
      const h0 = [hip[0] + (side === 'B' ? -1 : 1), hip[1]];
      if (spec && spec.foot) {
        const r = ik(h0[0], h0[1], spec.foot[0], spec.foot[1], K.thigh, K.shin, -1);
        return [h0[0], h0[1], r[0], r[1], r[2], r[3]];
      }
      const a = spec ? spec.a || 0 : 0, b = spec ? spec.b || 0 : 0;
      const t1 = Math.PI / 2 - a, t2 = t1 + b;
      const kx = h0[0] + Math.cos(t1) * K.thigh, ky = h0[1] + Math.sin(t1) * K.thigh;
      return [h0[0], h0[1], kx, ky, kx + Math.cos(t2) * K.shin, ky + Math.sin(t2) * K.shin];
    }

    let legF = o.legF, legB = o.legB, armF = o.armF, armB = o.armB, bob = 0;
    if (o.walk != null) {
      const ph = o.walk, L = K.thigh + K.shin, stride = st.kid ? 7 : 10.5, liftH = st.kid ? 3.5 : 5;
      const foot = (p) => [Math.cos(p) * stride, L - 1.2 - Math.max(0, -Math.sin(p)) * liftH];
      legF = legF || { foot: foot(ph) };
      legB = legB || { foot: foot(ph + Math.PI) };
      armF = armF || { a: -Math.cos(ph) * 0.42, b: 0.28 };
      armB = armB || { a: Math.cos(ph) * 0.42, b: 0.28 };
      bob = -Math.abs(Math.sin(ph)) * 1.1;
    } else if (o.sit) {
      legF = legF || { a: Math.PI / 2 - 0.06, b: Math.PI / 2 - 0.12 };
      legB = legB || { a: Math.PI / 2 - 0.16, b: Math.PI / 2 - 0.02 };
    }
    const lf = leg(legF, 'F'), lb = leg(legB, 'B');
    const af = arm(armF, 'F'), ab = arm(armB, 'B');

    g.save();
    g.translate(o.x, o.y + bob * u);
    g.scale(sx * u, u);
    const drawArm = (a, color) => {
      limb(g, a, K.armW, color);
      const an = Math.atan2(a[5] - a[3], a[4] - a[2]), cx = Math.cos(an), cy = Math.sin(an);
      g.strokeStyle = T.shade(color, -0.12); g.lineWidth = K.armW + 0.5; g.lineCap = 'butt';   /* cuff */
      g.beginPath(); g.moveTo(a[4] - cx * 2.8, a[5] - cy * 2.8); g.lineTo(a[4] - cx * 1.3, a[5] - cy * 1.3); g.stroke();
      g.fillStyle = st.skin;
      g.beginPath(); g.ellipse(a[4] + cx * 1.1, a[5] + cy * 1.1, K.hand * 1.3, K.hand * 0.98, an, 0, TAU); g.fill();
      g.beginPath(); g.arc(a[4] + cx * 0.5 - cy * K.hand * 0.8, a[5] + cy * 0.5 + cx * K.hand * 0.8, K.hand * 0.5, 0, TAU); g.fill();   /* thumb */
    };
    const drawLeg = (l, color) => {
      limb(g, l, K.legW, st.skirt ? st.skin : color);
      if (!o.noShoes) {
        const x = l[4], y = l[5], f = K.legW / 7.6;
        g.fillStyle = st.shoe;
        g.beginPath(); g.moveTo(x - 3.3 * f, y + 3.2); g.lineTo(x - 3.5 * f, y - 0.4); g.quadraticCurveTo(x - 1 * f, y - 2.6, x + 1.8 * f, y - 1.2);
        g.quadraticCurveTo(x + 7 * f, y - 0.5, x + 7.2 * f, y + 3.2); g.closePath(); g.fill();
        g.strokeStyle = T.shade(st.shoe, T.hex(st.shoe)[0] > 150 ? -0.25 : -0.4); g.lineWidth = 1; g.lineCap = 'round';
        g.beginPath(); g.moveTo(x - 3.2 * f, y + 3.2); g.lineTo(x + 7.1 * f, y + 3.2); g.stroke();
      }
    };

    if (only === 'armF') { drawArm(af, st.top); g.restore(); return out(); }

    if (!skip.armB) drawArm(ab, dark(st.top));
    if (!o.noLegs) {
      drawLeg(lb, dark(st.bottom));
      drawLeg(lf, st.bottom);
    }
    /* skirt / dress: hangs from the waist along the mean direction of the thighs */
    if (st.skirt && !o.noLegs) {
      const mx = (lf[2] + lb[2]) / 2, my = (lf[3] + lb[3]) / 2;
      const d = Math.hypot(mx, my) || 1, dx = mx / d, dy = my / d;
      const len = st.skirt, w0 = K.torsoW * 0.5, w1 = K.torsoW * 0.5 + len * 0.26;
      const nx = -dy, ny = dx;
      /* seated, the cloth lies along the top of the thigh and only hangs on the under side */
      const flat = Math.abs(dx);
      const up0 = T.lerp(w0, K.legW * 0.62, flat), up1 = T.lerp(w1, K.legW * 0.66, flat);
      const a0 = ny < 0 ? up0 : w0, a1 = ny < 0 ? up1 : w1, b0 = ny < 0 ? w0 : up0, b1 = ny < 0 ? w1 : up1;
      const wx = ax * 5, wy = ay * 5, hx = dx * len, hy = dy * len;
      g.fillStyle = st.bottom;
      g.beginPath();
      g.moveTo(wx + nx * a0, wy + ny * a0);
      g.lineTo(wx - nx * b0, wy - ny * b0);
      g.lineTo(hx - nx * b1, hy - ny * b1);
      g.quadraticCurveTo(dx * (len + 2.5), dy * (len + 2.5), hx + nx * a1, hy + ny * a1);
      g.closePath(); g.fill();
      g.strokeStyle = T.shade(st.bottom, 0.16); g.lineWidth = 1.1; g.lineCap = 'round';
      g.beginPath(); g.moveTo(hx - nx * b1 * 0.92 - dx * 1.6, hy - ny * b1 * 0.92 - dy * 1.6);
      g.quadraticCurveTo(dx * (len + 0.9), dy * (len + 0.9), hx + nx * a1 * 0.92 - dx * 1.6, hy + ny * a1 * 0.92 - dy * 1.6); g.stroke();
    } else if (!o.noLegs) {
      g.fillStyle = st.bottom; g.beginPath(); g.arc(0, 0, K.torsoW * 0.47, 0, TAU); g.fill();
    }
    /* torso */
    {
      const ws = K.torsoW / 17, ts = K.torso / 30, belly = st.kid ? 0.3 : st.belly == null ? 0.4 : st.belly;
      const at = (t, w) => [ax * t * ts - ay * w * ws, ay * t * ts + ax * w * ws];   /* t up the spine, w out to the front (+) or back (-) */
      const body = T.P.soft([at(-3.6, -6.2), at(4, -8.4), at(14, -8.5), at(22, -8.9), at(28.4, -7.5), at(31.3, -3.2),
        at(31.3, 3.4), at(28.4, 7.7), at(20, 8.8), at(11, 8.5 + belly), at(3, 8.2 + belly * 0.6), at(-3.6, 6)]);
      g.fillStyle = st.top; g.fill(body);
      g.save(); g.clip(body);
      g.strokeStyle = 'rgba(30,24,48,0.1)'; g.lineWidth = 6.5 * ws; g.lineCap = 'butt';   /* the far side falls away */
      let q = at(-5, -7), r2 = at(33, -7); g.beginPath(); g.moveTo(q[0], q[1]); g.lineTo(r2[0], r2[1]); g.stroke();
      g.strokeStyle = dark(st.top); g.lineWidth = 1.5;                                    /* hem */
      q = at(-0.6, -10); r2 = at(-0.6, 11); g.beginPath(); g.moveTo(q[0], q[1]); g.lineTo(r2[0], r2[1]); g.stroke();
      g.restore();
      g.fillStyle = dark(st.top);                                                         /* collar */
      g.beginPath(); g.ellipse(nk[0] + ax * 0.4, nk[1] + ay * 0.4, 4.3 * ws, 1.7, lean, 0, TAU); g.fill();
    }
    if (st.stripe) {
      g.strokeStyle = st.stripe; g.lineWidth = 1.1; g.lineCap = 'butt';
      for (let i = 0; i < 5; i++) {
        const k = 2 + i * 4.6, w = K.torsoW * 0.42;
        g.beginPath(); g.moveTo(ax * k - ay * w, ay * k + ax * w); g.lineTo(ax * k + ay * w, ay * k - ax * w); g.stroke();
      }
    }
    if (st.scarf) {
      g.strokeStyle = st.scarf; g.lineWidth = 5.4; g.lineCap = 'round';
      g.beginPath(); g.moveTo(nk[0] - 4.2, nk[1] + 2.2); g.lineTo(nk[0] + 4.6, nk[1] + 2.6); g.stroke();
      if (st.scarf === '#c9443a' || st.scarfTail) {   /* a long scarf: its end lifts and drifts behind him */
        const tt = T.time + (o.x || 0) * 0.01, w1 = Math.sin(tt * 2.1) * 2.4, w2 = Math.sin(tt * 2.6 + 1) * 3.4;
        g.lineWidth = 4.2;
        g.beginPath(); g.moveTo(nk[0] - 3, nk[1] + 3); g.quadraticCurveTo(nk[0] - 10, nk[1] + 5 + w1, nk[0] - 17, nk[1] + 2 + w2); g.stroke();
        g.lineWidth = 3.4; g.strokeStyle = T.shade(st.scarf, -0.12);
        g.beginPath(); g.moveTo(nk[0] - 2, nk[1] + 4); g.quadraticCurveTo(nk[0] - 8, nk[1] + 10 + w1 * 0.6, nk[0] - 13, nk[1] + 9 + w2 * 0.8); g.stroke();
      }
    }
    /* neck + head */
    g.strokeStyle = T.shade(st.skin, -0.09); g.lineWidth = 4.6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(nk[0], nk[1] + 1); g.lineTo(head[0], head[1]); g.stroke();
    g.save();
    g.translate(head[0], head[1]);
    g.rotate(ha + (o.headRot || 0));
    const R = K.R, face = o.face || {};
    if (st.hairStyle === 'apple' && !st.knit) { /* little fountain ponytail (tucked under a hat when there is one) */
      g.fillStyle = st.hair;
      g.beginPath(); g.ellipse(-R * 0.35, -R - 4.2, 2.6, 5.4, -0.5 + (o.hairSway || 0), 0, TAU); g.fill();
      g.fillStyle = st.tie; g.beginPath(); g.arc(-R * 0.22, -R - 0.4, 1.9, 0, TAU); g.fill();
    }
    if (st.hairStyle === 'bun') { g.fillStyle = st.hair; g.beginPath(); g.arc(-R * 0.92, -R * 0.62, R * 0.46, 0, TAU); g.fill(); }
    g.fillStyle = st.skin;
    headPath(g, R, st.kid ? 0.5 : 1); g.fill();
    g.fillStyle = T.shade(st.skin, -0.1);   /* ear */
    g.beginPath(); g.ellipse(-R * 0.2, R * 0.14, R * 0.17, R * 0.25, 0.25, 0, TAU); g.fill();
    if (st.beard) {
      g.fillStyle = st.beard;
      g.beginPath(); g.moveTo(-R * 0.5, R * 0.3); g.quadraticCurveTo(R * 0.1, R * 1.75, R * 0.95, R * 0.42);
      g.quadraticCurveTo(R * 0.4, R * 0.5, R * 0.2, R * 0.12); g.closePath(); g.fill();
    }
    if (face.blush !== 0) {
      g.fillStyle = T.rgba('#e2725b', face.blush == null ? 0.22 : face.blush);
      g.beginPath(); g.ellipse(R * 0.4, R * 0.42, R * 0.3, R * 0.22, 0.2, 0, TAU); g.fill();
    }
    g.strokeStyle = '#2b2024'; g.fillStyle = '#2b2024'; g.lineWidth = 0.9; g.lineCap = 'round';
    const ex = R * 0.47, ey = -R * 0.06;
    /* everyone blinks, each to their own clock */
    const bs = ((st.hair || '#000000').charCodeAt(1) * 7 + (st.top || '#000000').charCodeAt(2) * 3) % 17;
    const blink = (T.time * 0.34 + bs * 0.059) % 1 > 0.958;
    const sad = face.eye === 'closed' || face.eye === 'sad' || face.tear > 0.3;
    if (face.eye === 'closed' || (blink && face.eye !== 'happy')) { g.beginPath(); g.moveTo(ex - 1.7, ey - 0.2); g.quadraticCurveTo(ex, ey + 1.2, ex + 1.7, ey - 0.1); g.stroke(); }
    else if (face.eye === 'happy') { g.beginPath(); g.moveTo(ex - 1.8, ey + 0.7); g.quadraticCurveTo(ex, ey - 1.5, ex + 1.8, ey + 0.6); g.stroke(); }
    else if (face.eye === 'sad') {
      /* looking down, the lid heavy and drooping toward the temple */
      g.beginPath(); g.ellipse(ex + 0.1, ey + 0.55, 0.95, 0.8, 0, 0, Math.PI); g.fill();
      g.lineWidth = 0.95; g.beginPath(); g.moveTo(ex - 1.9, ey + 0.55); g.quadraticCurveTo(ex - 0.1, ey - 0.35, ex + 1.75, ey + 0.05); g.stroke(); g.lineWidth = 0.9;
    }
    else {
      g.beginPath(); g.ellipse(ex, ey, 1.02, 1.36, 0, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(ex + 0.38, ey - 0.5, 0.36, 0, TAU); g.fill();
      g.fillStyle = '#2b2024';
      g.lineWidth = 0.7; g.beginPath(); g.moveTo(ex - 1.8, ey - 0.9); g.quadraticCurveTo(ex - 0.2, ey - 2.0, ex + 1.7, ey - 1.0); g.stroke(); g.lineWidth = 0.9;   /* lid */
    }
    /* the brow says more than the eye does */
    g.strokeStyle = T.shade(st.hair || '#3a2b25', T.hex(st.hair || '#3a2b25')[0] > 190 ? -0.3 : -0.05); g.lineWidth = 0.85;
    const by = ey - (face.eye === 'happy' ? 4.1 : 3.5);
    g.beginPath(); g.moveTo(ex - 2.1, by + (sad ? 0.9 : 0.3)); g.quadraticCurveTo(ex, by - (sad ? 0.1 : 0.7), ex + 2.0, by + (sad ? -0.7 : 0.25)); g.stroke();
    g.strokeStyle = '#2b2024'; g.lineWidth = 0.9;
    if (face.old) { g.lineWidth = 0.6; g.beginPath(); g.moveTo(ex - 2.6, ey - 1.6); g.lineTo(ex - 4.4, ey - 2.6); g.moveTo(ex - 2.8, ey + 0.4); g.lineTo(ex - 4.8, ey + 0.8); g.moveTo(ex + 0.4, ey + 3.4); g.lineTo(ex + 2.6, ey + 4.2); g.stroke(); g.lineWidth = 0.9; }
    g.strokeStyle = '#7a3438'; g.lineWidth = 0.85;
    if (face.mouth === 'smile') { g.beginPath(); g.moveTo(R * 0.9, R * 0.6); g.quadraticCurveTo(R * 0.7, R * 0.72, R * 0.5, R * 0.5); g.stroke(); }
    else if (face.mouth === 'open') { g.fillStyle = '#7a3438'; g.beginPath(); g.moveTo(R * 0.9, R * 0.56); g.quadraticCurveTo(R * 0.74, R * 0.98, R * 0.5, R * 0.54); g.quadraticCurveTo(R * 0.7, R * 0.62, R * 0.9, R * 0.56); g.fill(); g.fillStyle = '#2b2024'; }
    else if (face.mouth === 'line') { g.beginPath(); g.moveTo(R * 0.9, R * 0.62); g.lineTo(R * 0.58, R * 0.62); g.stroke(); }
    else if (face.mouth === 'frown') { g.beginPath(); g.moveTo(R * 0.9, R * 0.66); g.quadraticCurveTo(R * 0.74, R * 0.57, R * 0.54, R * 0.72); g.stroke(); }
    g.strokeStyle = '#2b2024'; g.lineWidth = 0.9;
    if (face.tear > 0.45) {   /* the wet track down the cheek */
      g.strokeStyle = T.rgba('#d2ebf8', (face.tear - 0.45) * 0.9); g.lineWidth = 0.7;
      g.beginPath(); g.moveTo(ex + 0.5, ey + 1.6); g.quadraticCurveTo(ex + 1.1, ey + 3.6, ex + 0.7, ey + 6.2); g.stroke();
      g.strokeStyle = '#2b2024'; g.lineWidth = 0.9;
    }
    if (face.tear) {
      g.fillStyle = T.rgba('#bfe0f2', face.tear);
      g.beginPath(); g.ellipse(ex + 0.6, ey + 3.2 + (face.tearY || 0), 0.9, 1.5, 0, 0, TAU); g.fill();
    }
    if (st.hairStyle === 'beanie' && st.hair) {
      /* short hair under the hat, cropped close at the back down to the nape. It stays inside the line
         of the head, so nothing sticks out behind the beanie */
      g.save();
      g.beginPath(); g.arc(0, 0, R + 0.4, 0, TAU); g.clip();
      g.fillStyle = st.hair;
      g.beginPath();
      g.moveTo(-R * 1.3, -R * 0.2); g.lineTo(-R * 0.3, -R * 0.36); g.lineTo(-R * 0.38, R * 0.0);
      g.quadraticCurveTo(-R * 0.46, R * 0.5, -R * 0.66, R * 0.66);
      g.quadraticCurveTo(-R * 0.86, R * 0.74, -R * 1.3, R * 0.6);
      g.closePath(); g.fill();
      g.restore();
    }
    g.fillStyle = st.hairStyle === 'beanie' ? st.beanie : st.hair;
    hairPath(g, st.hairStyle, R, st);
    g.fill();
    if (st.hairStyle !== 'beanie' && st.hair) {   /* a few strands, so it is hair and not a cap */
      g.save(); hairPath(g, st.hairStyle, R, st); g.clip();
      g.strokeStyle = T.shade(st.hair, T.hex(st.hair)[0] > 150 ? -0.12 : 0.16); g.lineWidth = 0.6; g.globalAlpha *= 0.32;
      for (let i = 0; i < 2; i++) { g.beginPath(); g.arc(R * 0.7, R * 1.3, R * (1.75 + i * 0.42), -148 * d2r, -96 * d2r); g.stroke(); }
      g.restore();
    }
    if (st.glasses) {
      g.strokeStyle = '#6b5a48'; g.lineWidth = 0.8;
      g.beginPath(); g.arc(ex, ey + 0.2, 2.5, 0, TAU); g.stroke();
      g.beginPath(); g.moveTo(ex - 2.5, ey); g.lineTo(-R * 0.6, ey - 0.8); g.stroke();
    }
    if (st.cap) {
      g.fillStyle = st.cap;
      g.beginPath(); g.arc(0, -R * 0.12, R + 1.2, -168 * d2r, -12 * d2r, false); g.closePath(); g.fill();
      g.beginPath(); g.ellipse(R * 0.9, -R * 0.36, R * 0.6, R * 0.16, 0.12, 0, TAU); g.fill();
    }
    if (st.hairStyle === 'beanie') {
      g.strokeStyle = T.shade(st.beanie, 0.16); g.lineWidth = 3.6; g.lineCap = 'round';
      const d = Math.PI / 180, r1 = R + 1.5;
      g.beginPath(); g.moveTo(Math.cos(-34 * d) * r1, Math.sin(-34 * d) * r1); g.lineTo(Math.cos(176 * d) * r1, Math.sin(176 * d) * r1); g.stroke();
    }
    if (st.knit) {
      /* a knitted hat pulled down to the brow: a soft dome, a ribbed turn-up, a bobble on top */
      const r1 = R + 1.8, a0 = -18 * d2r, a1 = 196 * d2r;
      const fx = Math.cos(a0) * r1, fy = Math.sin(a0) * r1, bx = Math.cos(a1) * r1, by = Math.sin(a1) * r1;
      g.fillStyle = st.knit;
      g.beginPath(); g.moveTo(fx, fy);
      g.bezierCurveTo(R * 1.02, -R * 1.18, R * 0.2, -R * 1.62, -R * 0.42, -R * 1.42);
      g.bezierCurveTo(-R * 1.12, -R * 1.14, -R * 1.24, -R * 0.42, bx, by);
      g.closePath(); g.fill();
      g.save(); g.clip();   /* a few rows of stitches */
      g.strokeStyle = T.shade(st.knit, -0.12); g.lineWidth = 0.55; g.globalAlpha *= 0.7;
      for (let i = 0; i < 4; i++) { const yy = -R * 0.5 - i * R * 0.22; g.beginPath(); for (let k = -6; k <= 6; k++) { const xx = k * R * 0.2; g.lineTo(xx, yy + (k % 2 ? 0.9 : 0)); } g.stroke(); }
      g.restore();
      g.strokeStyle = T.shade(st.knit, -0.08); g.lineWidth = 3.4; g.lineCap = 'round';
      g.beginPath(); g.moveTo(fx + 0.4, fy + 0.6); g.quadraticCurveTo(-R * 0.2, -R * 0.42, bx, by + 0.4); g.stroke();
      g.strokeStyle = T.shade(st.knit, -0.22); g.lineWidth = 0.6;
      for (let k = 0; k < 7; k++) { const u2 = (k + 0.5) / 7, px = T.lerp(fx, bx, u2), py = T.lerp(fy, by, u2) - Math.sin(u2 * Math.PI) * R * 0.28; g.beginPath(); g.moveTo(px, py - 1.4); g.lineTo(px, py + 1.4); g.stroke(); }
      g.fillStyle = '#fbf1e2';
      g.beginPath(); g.arc(-R * 0.38, -R * 1.5, 2.7, 0, TAU); g.fill();
      g.fillStyle = 'rgba(160,120,110,0.25)'; g.beginPath(); g.arc(-R * 0.3, -R * 1.42, 1.5, 0, TAU); g.fill();
    }
    g.restore();
    if (!skip.armF) drawArm(af, st.top);
    g.restore();
    return out();

    function out() {
      const W = (p) => [o.x + sx * u * p[0], o.y + u * (p[1] + bob)];
      return {
        handF: W([af[4], af[5]]), handB: W([ab[4], ab[5]]), elbowF: W([af[2], af[3]]),
        head: W(head), shoulder: W(shd), neck: W(nk), footF: W([lf[4], lf[5]]), footB: W([lb[4], lb[5]]),
        kneeF: W([lf[2], lf[3]]), hip: [o.x, o.y + u * bob], u, sx,
        R: K.R * u,
      };
    }
  };
  /* world → the figure's local units, for aiming hands at things */
  F.local = function (o, wx, wy) {
    const u = (o.s || 240) / 100, sx = o.flip ? -1 : 1;
    return [(wx - o.x) / (sx * u), (wy - o.y) / u];
  };
  /* where the mouth is, in the world, for a figure drawn with these options (spoons and cups go here) */
  F.mouth = function (o) {
    const K = o.style.kid ? KID : ADULT, u = (o.s || 240) / 100, sx = o.flip ? -1 : 1, lean = o.lean || 0;
    const ax = Math.sin(lean), ay = -Math.cos(lean), ha = lean * 0.55 + (o.headTilt || 0), hr = ha + (o.headRot || 0);
    const hx = ax * K.torso + Math.sin(ha) * K.neck + (o.headDx || 0), hy = ay * K.torso - Math.cos(ha) * K.neck + (o.headDy || 0);
    const mx = K.R * 0.72, my = K.R * 0.6;
    const px = hx + mx * Math.cos(hr) - my * Math.sin(hr), py = hy + mx * Math.sin(hr) + my * Math.cos(hr);
    return [o.x + sx * u * px, o.y + u * py];
  };
  F.hipHeight = function (style, s) { const K = style.kid ? KID : ADULT; return ((K.thigh + K.shin + 1.6) * (s || 240)) / 100; };

  /* Bean. Origin on the ground under the middle of the body; 100 units = adult height. */
  F.dog = function (g, o) {
    const u = (o.s || 240) / 100, sx = o.flip ? -1 : 1;
    const ph = o.walk == null ? null : o.walk;
    const run = ph == null ? 0 : o.run || 0;   /* 0 a trot … 1 a bounding run: front pair and back pair together, off the ground at full stretch */
    const wag = o.wag || 0, sit = o.sit || 0;
    const sc = o.tintAll || (o.shadow ? '#101c33' : null);
    const body = sc || '#f8f4ec', patch = sc || '#eadfcc', dark = sc || '#e6ddcf';
    g.save();
    g.translate(o.x, o.y);
    if (o.rot) g.rotate(o.rot);
    g.scale(sx * u, u);
    const bob = ph == null ? 0 : -Math.abs(Math.sin(ph * 2)) * 0.6 * (1 - run) - Math.max(0, Math.sin(ph * 2)) * 5.2 * run;
    g.translate(0, bob);
    if (run) g.rotate(-Math.cos(ph * 2) * 0.07 * run);   /* the back rounds as the legs gather, and flattens as they reach */
    /* sitting drops the rear and lifts the chest */
    const rear = [-9, -15 + sit * 8.5], chest = [9, -16 - sit * 2.5];
    const legLen = 13;
    const lg = (x, y, a, color, len) => {
      g.strokeStyle = color; g.lineWidth = 3.6; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.sin(a) * len, Math.min(-1.2 - bob, y + Math.cos(a) * len)); g.stroke();
    };
    const sw = (k) => (ph == null ? 0 : Math.sin(ph * 2 + k) * (0.55 + 0.4 * run));
    /* which part of the stride each leg is in: a trot pairs them across, a run pairs front with front */
    const LP = run > 0.5 ? { fr: Math.PI + 0.5, ff: 0.5, nr: Math.PI, nf: 0 } : { fr: Math.PI, ff: 0, nr: 0, nf: Math.PI };
    /* far legs */
    lg(rear[0] + 1.5, rear[1] + 3, sw(LP.fr) + sit * 1.15, dark, legLen * (1 - sit * 0.3));
    lg(chest[0] - 1, chest[1] + 3, sw(LP.ff), dark, legLen + sit * 2.5);
    /* tail */
    g.strokeStyle = body; g.lineWidth = 3; g.lineCap = 'round';
    g.save(); g.translate(rear[0] - 5, rear[1] - 3); g.rotate(wag * 0.5 - 0.15 - run * 0.75);
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-5, -4, -4.5, -11); g.stroke();
    g.restore();
    /* body */
    g.strokeStyle = body; g.lineWidth = 13.5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(rear[0], rear[1]); g.lineTo(chest[0], chest[1]); g.stroke();
    g.fillStyle = patch; g.beginPath(); g.ellipse((rear[0] + chest[0]) / 2 - 2, (rear[1] + chest[1]) / 2 - 3.4, 6, 3.4, -sit * 0.4, 0, TAU); g.fill();
    /* near legs */
    lg(rear[0] - 1.5, rear[1] + 3, sw(LP.nr) + sit * 1.15, body, legLen * (1 - sit * 0.3));
    lg(chest[0] + 2, chest[1] + 3, sw(LP.nf), body, legLen + sit * 2.5);
    /* head */
    const hx = chest[0] + 8.5, hy = chest[1] - 9.5 + (o.headDy || 0);
    g.save(); g.translate(hx, hy); g.rotate(o.headTilt || 0);
    g.fillStyle = body;
    g.beginPath(); g.arc(0, 0, 7.4, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(6.6, 2, 5, 3.7, 0.1, 0, TAU); g.fill();
    g.fillStyle = '#2b2024';
    g.beginPath(); g.arc(10.9, 0.8, 1.5, 0, TAU); g.fill();
    g.beginPath(); g.arc(2.6, -1.8, 0.95, 0, TAU); g.fill();
    g.fillStyle = patch;
    g.beginPath(); g.ellipse(-3.4, 0.6 + Math.abs(bob) * 0.8, 3.5, 6.6, 0.32 + wag * 0.05, 0, TAU); g.fill();
    g.restore();
    /* collar */
    const cx = chest[0] + 4.6, cy = chest[1] - 3.2;
    g.strokeStyle = '#c4523f'; g.lineWidth = 2.6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(cx - 1.2, cy - 5.4); g.lineTo(cx + 1.6, cy + 5); g.stroke();
    g.fillStyle = '#e3b64f'; g.beginPath(); g.arc(cx + 1.9, cy + 5.6, 1.3, 0, TAU); g.fill();
    g.restore();
    /* where the lead clips on (the ring under the collar), and the head, carried through the same turn as the drawing */
    const cr = Math.cos(o.rot || 0), sr = Math.sin(o.rot || 0);
    const out = (lx, ly) => { const px = sx * u * lx, py = u * (ly + bob); return [o.x + px * cr - py * sr, o.y + px * sr + py * cr]; };
    return { collar: out(cx + 1.9, cy + 5.6), head: out(hx, hy) };
  };

  /* a leash hangs like a little catenary between a hand and a collar */
  F.leash = function (g, a, b, slack = 26, w = 3, color = '#c4523f') {
    g.strokeStyle = color; g.lineWidth = w; g.lineCap = 'round';
    g.beginPath(); g.moveTo(a[0], a[1]);
    g.quadraticCurveTo((a[0] + b[0]) / 2, Math.max(a[1], b[1]) + slack, b[0], b[1]);
    g.stroke();
  };

  /* the painted look: each figure is drawn on its own sheet, given a little volume (light on the side the scene's
     light is on, plum shadow on the other), and then laid on the picture */
  const flat = F.person;
  let sheet = null;
  F.person = function (g, o) {
    if (!(T.artOn && T.artOn()) || T.artLite || !g.getTransform || g.canvas !== T.canvas || o.flatLook) return flat(g, o);
    const m = g.getTransform(), s = o.s || 150;
    const bx0 = o.x - s * 0.85, by0 = o.y - s * 0.9, bx1 = o.x + s * 0.85, by1 = o.y + s * 0.62;   /* the figure's own extent, with room for arms */
    const xs = [], ys = [];
    for (const [x, y] of [[bx0, by0], [bx1, by0], [bx0, by1], [bx1, by1]]) { xs.push(m.a * x + m.c * y + m.e); ys.push(m.b * x + m.d * y + m.f); }
    const rx = Math.floor(Math.min(...xs)), ry = Math.floor(Math.min(...ys)), rw = Math.ceil(Math.max(...xs)) - rx, rh = Math.ceil(Math.max(...ys)) - ry;
    if (rw <= 0 || rh <= 0 || rw * rh > 6e6) return flat(g, o);
    if (!sheet) sheet = document.createElement('canvas');
    if (sheet.width < rw || sheet.height < rh) { sheet.width = Math.max(sheet.width, rw); sheet.height = Math.max(sheet.height, rh); }
    const sg = sheet.getContext('2d');
    sg.setTransform(1, 0, 0, 1, 0, 0); sg.globalAlpha = 1; sg.globalCompositeOperation = 'source-over'; sg.clearRect(0, 0, rw, rh);
    sg.setTransform(m.a, m.b, m.c, m.d, m.e - rx, m.f - ry);
    const j = flat(sg, o);
    const cur = T.director && T.director.cur, Ld = (cur && cur.lightDir) || [-0.55, -0.83], cx = o.x, cy = o.y - s * 0.35, R = s * 0.8;
    sg.globalCompositeOperation = 'source-atop';
    const gr = sg.createLinearGradient(cx + Ld[0] * R, cy + Ld[1] * R, cx - Ld[0] * R, cy - Ld[1] * R);
    gr.addColorStop(0, 'rgba(255,228,192,0.34)'); gr.addColorStop(0.42, 'rgba(255,228,192,0)'); gr.addColorStop(0.58, 'rgba(76,44,104,0)'); gr.addColorStop(1, 'rgba(76,44,104,0.38)');
    sg.fillStyle = gr; sg.fillRect(bx0, by0, bx1 - bx0, by1 - by0);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(sheet, 0, 0, rw, rh, rx, ry, rw, rh); g.restore();
    return j;
  };
})();
