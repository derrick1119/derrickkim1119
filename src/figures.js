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
    leoHome: { skin: '#e9c0a2', hair: '#3a2b25', hairStyle: 'beanie', beanie: '#d7a23c', top: '#d7a23c', bottom: '#4b5669', shoe: '#33291f' },
    leoKid: { skin: '#f0c4a6', hair: '#3a2b25', hairStyle: 'short', top: '#d7a23c', bottom: '#4b5669', shoe: '#33291f', kid: true },
    nana: { skin: '#eec3a6', hair: '#f3efe6', hairStyle: 'bun', glasses: true, top: '#7b5a86', scarf: '#e9dcc3', bottom: '#3f6b70', skirt: 34, shoe: '#4a3530' },
    bram: { skin: '#e2ad88', hair: '#f3efe6', hairStyle: 'short', beard: '#f3efe6', cap: '#2f4460', top: '#2f4460', bottom: '#6b5a48', shoe: '#33291f' },
    rosa: { skin: '#f1c8aa', hair: '#6b3f2a', hairStyle: 'bob', top: '#e9b93a', bottom: '#e9b93a', skirt: 26, shoe: '#5a3a2e' },
    post: { skin: '#e7b793', hair: '#3a2b25', hairStyle: 'short', cap: '#3f6b8a', top: '#3f6b8a', bottom: '#2f4460', shoe: '#33291f' },
    villagerA: { skin: '#e7b793', hair: '#8a8a8a', hairStyle: 'short', top: '#6f9a8a', bottom: '#5a4a44', shoe: '#33291f' },
    villagerB: { skin: '#f0c7a9', hair: '#c9c2b4', hairStyle: 'bun', top: '#c9805a', bottom: '#5d6f8a', skirt: 28, shoe: '#4a3530' },
  };

  const ADULT = { thigh: 24, shin: 24, torso: 30, sh: 26, neck: 11, R: 9.5, ua: 15, fa: 14, legW: 7.6, armW: 5.6, torsoW: 17, hand: 3.1 };
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
      g.arc(0, 0, R + 1.5, -20 * d, 176 * d, true);
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
      g.fillStyle = st.skin; g.beginPath(); g.arc(a[4], a[5], K.hand, 0, TAU); g.fill();
    };
    const drawLeg = (l, color) => {
      limb(g, l, K.legW, st.skirt ? st.skin : color);
      if (!o.noShoes) {
        g.fillStyle = st.shoe;
        g.beginPath(); g.ellipse(l[4] + 2.4, l[5] + 1.2, K.legW * 0.82, K.legW * 0.46, 0, 0, TAU); g.fill();
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
    } else if (!o.noLegs) {
      g.fillStyle = st.bottom; g.beginPath(); g.arc(0, 0, K.torsoW * 0.47, 0, TAU); g.fill();
    }
    /* torso */
    g.strokeStyle = st.top; g.lineWidth = K.torsoW; g.lineCap = 'round';
    g.beginPath(); g.moveTo(ax * 3, ay * 3); g.lineTo(shd[0] - ax * 2.5, shd[1] - ay * 2.5); g.stroke();
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
    }
    /* neck + head */
    g.strokeStyle = st.skin; g.lineWidth = 5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(nk[0], nk[1] + 1); g.lineTo(head[0], head[1]); g.stroke();
    g.save();
    g.translate(head[0], head[1]);
    g.rotate(ha + (o.headRot || 0));
    const R = K.R, face = o.face || {};
    if (st.hairStyle === 'apple') { /* little fountain ponytail */
      g.fillStyle = st.hair;
      g.beginPath(); g.ellipse(-R * 0.35, -R - 4.2, 2.6, 5.4, -0.5 + (o.hairSway || 0), 0, TAU); g.fill();
      g.fillStyle = st.tie; g.beginPath(); g.arc(-R * 0.22, -R - 0.4, 1.9, 0, TAU); g.fill();
    }
    if (st.hairStyle === 'bun') { g.fillStyle = st.hair; g.beginPath(); g.arc(-R * 0.92, -R * 0.62, R * 0.46, 0, TAU); g.fill(); }
    g.fillStyle = st.skin;
    g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
    g.beginPath(); g.arc(R - 0.2, 1.3, 1.75, 0, TAU); g.fill(); /* nose */
    if (st.beard) {
      g.fillStyle = st.beard;
      g.beginPath(); g.moveTo(-R * 0.5, R * 0.3); g.quadraticCurveTo(R * 0.1, R * 1.75, R * 0.95, R * 0.42);
      g.quadraticCurveTo(R * 0.4, R * 0.5, R * 0.2, R * 0.12); g.closePath(); g.fill();
    }
    if (face.blush !== 0) {
      g.fillStyle = T.rgba('#e2725b', face.blush == null ? 0.22 : face.blush);
      g.beginPath(); g.arc(R * 0.42, R * 0.4, R * 0.27, 0, TAU); g.fill();
    }
    g.strokeStyle = '#2b2024'; g.fillStyle = '#2b2024'; g.lineWidth = 0.9; g.lineCap = 'round';
    const ex = R * 0.47, ey = -R * 0.06;
    if (face.eye === 'closed') { g.beginPath(); g.arc(ex, ey - 0.4, 1.5, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); }
    else if (face.eye === 'happy') { g.beginPath(); g.arc(ex, ey + 0.9, 1.5, 1.15 * Math.PI, 1.85 * Math.PI); g.stroke(); }
    else { g.beginPath(); g.arc(ex, ey, 0.95, 0, TAU); g.fill(); }
    if (face.mouth === 'smile') { g.beginPath(); g.arc(R * 0.5, R * 0.36, 2.3, 0.18 * Math.PI, 0.72 * Math.PI); g.stroke(); }
    else if (face.mouth === 'open') { g.beginPath(); g.ellipse(R * 0.66, R * 0.52, 1.3, 1.7, 0, 0, TAU); g.fill(); }
    else if (face.mouth === 'line') { g.beginPath(); g.moveTo(R * 0.5, R * 0.52); g.lineTo(R * 0.8, R * 0.5); g.stroke(); }
    if (face.tear) {
      g.fillStyle = T.rgba('#bfe0f2', face.tear);
      g.beginPath(); g.ellipse(ex + 0.6, ey + 3.2 + (face.tearY || 0), 0.9, 1.5, 0, 0, TAU); g.fill();
    }
    g.fillStyle = st.hairStyle === 'beanie' ? st.beanie : st.hair;
    hairPath(g, st.hairStyle, R, st);
    g.fill();
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
      g.beginPath(); g.moveTo(Math.cos(-20 * d) * r1, Math.sin(-20 * d) * r1); g.lineTo(Math.cos(176 * d) * r1, Math.sin(176 * d) * r1); g.stroke();
      g.fillStyle = st.hair; /* a little hair at the nape */
      g.beginPath(); g.ellipse(-R * 0.72, R * 0.42, 2.2, 3.2, 0.5, 0, TAU); g.fill();
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
  F.hipHeight = function (style, s) { const K = style.kid ? KID : ADULT; return ((K.thigh + K.shin + 1.6) * (s || 240)) / 100; };

  /* Bean. Origin on the ground under the middle of the body; 100 units = adult height. */
  F.dog = function (g, o) {
    const u = (o.s || 240) / 100, sx = o.flip ? -1 : 1;
    const ph = o.walk == null ? null : o.walk;
    const wag = o.wag || 0, sit = o.sit || 0;
    const body = '#f2e7d3', patch = '#b57c50', dark = '#e0d2ba';
    g.save();
    g.translate(o.x, o.y);
    if (o.rot) g.rotate(o.rot);
    g.scale(sx * u, u);
    const bob = ph == null ? 0 : -Math.abs(Math.sin(ph * 2)) * 0.6;
    g.translate(0, bob);
    /* sitting drops the rear and lifts the chest */
    const rear = [-9, -15 + sit * 8.5], chest = [9, -16 - sit * 2.5];
    const legLen = 13;
    const lg = (x, y, a, color, len) => {
      g.strokeStyle = color; g.lineWidth = 3.6; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.sin(a) * len, Math.min(-1.2 - bob, y + Math.cos(a) * len)); g.stroke();
    };
    const sw = (k) => (ph == null ? 0 : Math.sin(ph * 2 + k) * 0.55);
    /* far legs */
    lg(rear[0] + 1.5, rear[1] + 3, sw(Math.PI) + sit * 1.15, dark, legLen * (1 - sit * 0.3));
    lg(chest[0] - 1, chest[1] + 3, sw(0), dark, legLen + sit * 2.5);
    /* tail */
    g.strokeStyle = body; g.lineWidth = 3; g.lineCap = 'round';
    g.save(); g.translate(rear[0] - 5, rear[1] - 3); g.rotate(wag * 0.5 - 0.15);
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-5, -4, -4.5, -11); g.stroke();
    g.restore();
    /* body */
    g.strokeStyle = body; g.lineWidth = 13.5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(rear[0], rear[1]); g.lineTo(chest[0], chest[1]); g.stroke();
    g.fillStyle = patch; g.beginPath(); g.ellipse((rear[0] + chest[0]) / 2 - 2, (rear[1] + chest[1]) / 2 - 3.4, 6, 3.4, -sit * 0.4, 0, TAU); g.fill();
    /* near legs */
    lg(rear[0] - 1.5, rear[1] + 3, sw(0) + sit * 1.15, body, legLen * (1 - sit * 0.3));
    lg(chest[0] + 2, chest[1] + 3, sw(Math.PI), body, legLen + sit * 2.5);
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
    return { collar: [o.x + sx * u * (cx - 0.6), o.y + u * (cy - 4.6 + bob)], head: [o.x + sx * u * hx, o.y + u * (hy + bob)] };
  };

  /* a leash hangs like a little catenary between a hand and a collar */
  F.leash = function (g, a, b, slack = 26, w = 3, color = '#c4523f') {
    g.strokeStyle = color; g.lineWidth = w; g.lineCap = 'round';
    g.beginPath(); g.moveTo(a[0], a[1]);
    g.quadraticCurveTo((a[0] + b[0]) / 2, Math.max(a[1], b[1]) + slack, b[0], b[1]);
    g.stroke();
  };
})();
