/* Take Your Time — the memory Ana carries onto the quay in the last chapter.
   A night fifty-one years before: their bedroom, a lamp, two small pink hats on the table, one of them still on
   its needles, and the first picture of the two of them, black and white, that she cannot stop looking at.
   Painted on warm paper inside a torn edge, like the memories of the prologue.
   T.twins() is a view for X.view. Its beats are tweened by the chapter:
     V.close.k  the photograph comes up close (0 in her hands … 1 held up in the middle of the picture)
     V.shine.k  a little light on the two small shapes
     V.belly.k  her hand goes from the photograph to her belly
     V.lean.k   he leans his head against hers, laughing */
(function () {
  'use strict';
  const T = window.TYT, P = T.P, F = T.F;
  const TAU = Math.PI * 2;
  const FLOOR = 770, SEAT = 690, INSET = 58;
  const LAMP = [-262, 520];                 /* the bedside lamp, on the little table in front of them */
  const ANA = { x: -22, s: 318 }, LEO = { x: 66, s: 332 };
  const ZM = 1.42, ZC = [-150, 556];        /* looked at from close to: this world point is the middle of the screen */

  /* the two small ones as the machine draws them: a big head, a curled body, buds for hands */
  function little(g, x, y, dir, a) {
    g.save(); g.translate(x, y); g.scale(dir * 1.45, 1.45); g.globalAlpha *= a;
    const c = '#cfccc6';
    P.fill(g, P.soft([[-14, 2], [-12, -8], [-2, -10], [8, -2], [10, 10], [2, 18], [-10, 16]]), c);   /* the body, curled */
    P.fill(g, P.circle(9, -11, 10.5), c);                    /* the head, bent down to it */
    P.fill(g, P.ellipse(15, 3, 4.6, 2.6, 0.4), c);           /* a hand, reaching forward */
    P.fill(g, P.ellipse(6, 17, 5.4, 3, 0.1), c);             /* knees, drawn up */
    g.globalAlpha *= 0.6;
    P.fill(g, P.circle(11, -14, 4.6), '#f6f4f0');             /* the brightest bit, the way bone shows */
    P.fill(g, P.ellipse(-6, 0, 3, 7, 0.3), '#f0eee8');         /* and the little spine */
    g.restore();
  }
  /* the print itself: w × h, centred on the origin */
  function scan(g, w, h, t, shine) {
    P.fill(g, P.rr(-w / 2, -h / 2, w, h, 5), '#f3f0ea');
    const ix = -w / 2 + 14, iy = -h / 2 + 14, iw = w - 28, ih = h - 58;
    P.fill(g, P.rr(ix, iy, iw, ih, 3), '#0c0c0e');
    /* the machine's small print along the top */
    g.fillStyle = 'rgba(214,214,214,0.55)';
    [[0, 46], [52, 22], [80, 34]].forEach((q) => g.fillRect(ix + 12 + q[0], iy + 10, q[1], 4));
    [[0, 30], [36, 40]].forEach((q) => g.fillRect(ix + 12 + q[0], iy + 19, q[1], 4));
    [[0, 26], [32, 18]].forEach((q) => g.fillRect(ix + iw - 74 + q[0], iy + 10, q[1], 4));
    /* the fan of the scan */
    const ax = 0, ay = iy + 20, R = ih - 28, a0 = Math.PI / 2 - 0.66, a1 = Math.PI / 2 + 0.66;
    g.save();
    g.beginPath(); g.moveTo(ax, ay); g.arc(ax, ay, R, a0, a1); g.closePath(); g.clip();
    const fan = g.createRadialGradient(ax, ay, 10, ax, ay, R);
    fan.addColorStop(0, '#4a4a4c'); fan.addColorStop(0.5, '#323234'); fan.addColorStop(1, '#1c1c1e');
    g.fillStyle = fan; g.fillRect(ix, iy, iw, ih);
    const r = T.rng(37);
    for (let i = 0; i < 700; i++) {
      const ang = a0 + r() * (a1 - a0), d = Math.sqrt(r()) * R, s = 0.8 + r() * 1.8;
      g.fillStyle = T.rgba(r() < 0.5 ? '#9a9a9a' : '#5e5e60', 0.18 + r() * 0.34);
      g.fillRect(ax + Math.cos(ang) * d, ay + Math.sin(ang) * d, s, s * 0.7);
    }
    /* two dark rooms side by side, a thin wall between, and one small someone in each */
    const sy = ay + R * 0.64, sa = [ax - 56, sy], sb = [ax + 56, sy + 3];
    [sa, sb].forEach((q, i) => {
      const gr = g.createRadialGradient(q[0], q[1], 6, q[0], q[1], 60);
      gr.addColorStop(0, '#060607'); gr.addColorStop(0.78, '#0a0a0b'); gr.addColorStop(1, 'rgba(10,10,11,0)');
      g.fillStyle = gr; g.beginPath(); g.ellipse(q[0], q[1], 62 - i * 2, 54, 0, 0, TAU); g.fill();
    });
    g.strokeStyle = 'rgba(200,200,200,0.5)'; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(ax + 1, sy - 56); g.quadraticCurveTo(ax - 5, sy, ax + 2, sy + 54); g.stroke();
    if (shine > 0.01) { P.glow(g, sa[0] + 6, sa[1], 50, '#fff3dc', 0.32 * shine); P.glow(g, sb[0] - 6, sb[1], 50, '#fff3dc', 0.32 * shine); }
    little(g, sa[0] - 2, sa[1] + 2, 1, 1);
    little(g, sb[0] + 2, sb[1] + 1, -1, 1);
    g.restore();
    g.strokeStyle = 'rgba(190,190,190,0.35)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(ax, ay); g.arc(ax, ay, R, a0, a1); g.closePath(); g.stroke();
    /* the depth scale down the side, and the two letters the machine puts on twins */
    for (let i = 0; i < 9; i++) g.fillRect(ix + iw - 16, iy + 34 + i * ((ih - 50) / 8), i % 2 ? 4 : 8, 1.4);
    P.text(g, 'A', sa[0] - 44, sa[1] - 36, { font: 'serif', size: 15, color: '#e8e8e8', alpha: 0.85 });
    P.text(g, 'B', sb[0] + 44, sb[1] - 36, { font: 'serif', size: 15, color: '#e8e8e8', alpha: 0.85 });
    /* a sheen across the glossy paper */
    const sh = g.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(0.42, 'rgba(255,255,255,0)'); sh.addColorStop(0.5, 'rgba(255,255,255,0.1)'); sh.addColorStop(0.58, 'rgba(255,255,255,0)');
    g.fillStyle = sh; g.fillRect(ix, iy, iw, ih);
    /* and in the white under it, in her pen, two small hearts */
    const heart = (x, y, s) => P.strokePts(g, [[x, y + 5 * s], [x - 6 * s, y - 1 * s], [x - 4 * s, y - 5 * s], [x, y - 3 * s], [x + 4 * s, y - 5 * s], [x + 6 * s, y - 1 * s], [x, y + 5 * s]], 1.8, '#c9573f', true);
    heart(w / 2 - 54, h / 2 - 22, 1.3); heart(w / 2 - 34, h / 2 - 21, 1.3);
  }

  T.twins = function () {
    const V = { dark: false, quiet: true, close: { k: 0 }, shine: { k: 0 }, belly: { k: 0 }, lean: { k: 0 }, L: null, gen: -1, frame: null };

    V.build = function () {
      const Vw = T.view, W = Vw.W, x0 = -W / 2 - 20, w = W + 40;
      V.gen = T.gen;
      V.frame = P.paperFrame(23, INSET);
      V.L = T.bake(x0, 0, w, 900, (g) => {
        /* the wall, warm in the lamplight, and the faintest stripe in the paper */
        P.wash(g, P.box(x0, 0, w, FLOOR, 0, 1), '#dcc39c', [x0, 0, w, FLOOR], { seed: 5, len: 260, wid: 44, tone: 0.05, dir: Math.PI / 2, spread: 0.12 });
        g.fillStyle = 'rgba(140,96,60,0.07)';
        for (let x = Math.floor(x0 / 52) * 52; x < x0 + w; x += 52) g.fillRect(x, 0, 14, FLOOR);
        P.tint(g, P.box(x0, 0, w, FLOOR, 0, 1), 0, 0, 0, FLOOR, [[0, 'rgba(90,60,40,0.3)'], [0.5, 'rgba(90,60,40,0.05)'], [1, 'rgba(90,60,40,0.12)']]);
        /* skirting and boards */
        P.fill(g, P.box(x0, FLOOR - 16, w, 18, 0.5, 6), '#b48a62');
        P.wash(g, P.box(x0, FLOOR, w, 900 - FLOOR, 0, 7), '#a67a55', [x0, FLOOR, w, 130], { seed: 8, len: 300, wid: 14, tone: 0.06, spread: 0.04 });
        g.strokeStyle = 'rgba(80,50,30,0.22)'; g.lineWidth = 1.5;
        for (let x = Math.floor(x0 / 140) * 140; x < x0 + w; x += 140) { g.beginPath(); g.moveTo(x, FLOOR); g.lineTo(x - 50, 900); g.stroke(); }
        /* the window: a night with a thin moon, and two small clouds very close together */
        const wx = -650, wy = 262, ww = 240, wh = 250;
        P.fill(g, P.box(wx - 14, wy - 14, ww + 28, wh + 28, 0.6, 9), '#efe3cc');
        const sky = g.createLinearGradient(0, wy, 0, wy + wh);
        sky.addColorStop(0, '#1e2748'); sky.addColorStop(1, '#46537e');
        g.fillStyle = sky; g.fillRect(wx, wy, ww, wh);
        const rs = T.rng(12);
        for (let i = 0; i < 14; i++) P.fill(g, P.circle(wx + 10 + rs() * (ww - 20), wy + 10 + rs() * wh * 0.5, 1 + rs() * 1.3), T.rgba('#fff6e0', 0.5 + rs() * 0.4));
        P.fill(g, P.circle(wx + ww * 0.74, wy + 52, 18), '#f6efd8'); P.fill(g, P.circle(wx + ww * 0.74 + 8, wy + 47, 16), '#212b4e');
        const puff = (cx, cy, s, dir) => { g.save(); g.globalAlpha = 0.55; g.translate(cx, cy); g.scale(s * dir, s);
          [[-18, 2, 13], [-4, -6, 15], [12, -1, 12], [22, 5, 8], [-26, 7, 7]].forEach((q) => P.fill(g, P.circle(q[0], q[1], q[2]), '#c9cfe6'));
          P.fill(g, P.rr(-32, 4, 62, 12, 6), '#c9cfe6'); g.restore(); };
        puff(wx + 40, wy + 184, 0.62, 1); puff(wx + 80, wy + 181, 0.56, -1);   /* two small clouds, one reaching for the other */
        g.fillStyle = '#efe3cc'; g.fillRect(wx + ww / 2 - 4, wy, 8, wh); g.fillRect(wx, wy + wh / 2 - 4, ww, 8);
        P.fill(g, P.box(wx - 26, wy + wh + 8, ww + 52, 14, 0.5, 10), '#e9dcc3');
        /* curtains, tied back */
        P.fill(g, P.soft([[wx - 40, wy - 30], [wx + 16, wy - 30], [wx + 4, wy + 150], [wx + 22, wy + wh + 30], [wx - 44, wy + wh + 34], [wx - 34, wy + 150]]), '#d99a8a');
        P.fill(g, P.soft([[wx + ww - 16, wy - 30], [wx + ww + 40, wy - 30], [wx + ww + 34, wy + 150], [wx + ww + 44, wy + wh + 34], [wx + ww - 22, wy + wh + 30], [wx + ww - 4, wy + 150]]), '#d99a8a');
        P.line(g, wx - 60, wy - 32, wx + ww + 60, wy - 32, 6, '#9a6b48');
        /* a picture on the wall: the two of them on moving day */
        g.save(); g.translate(250, 352); g.rotate(0.02);
        P.fill(g, P.rr(-46, -58, 92, 116, 4), '#8a6846'); P.fill(g, P.rr(-38, -50, 76, 100, 2), '#c4b08a');
        P.fill(g, P.rr(-38, 18, 76, 32, 0), '#8f8168'); P.fill(g, P.rr(-26, -34, 24, 52, 2), '#6f5b48');
        F.person(g, { x: -6, y: 20, s: 42, style: F.styles.leo, flatLook: true, face: { blush: 0 } }); F.person(g, { x: 10, y: 21, s: 39, style: F.styles.ana, flip: true, flatLook: true, face: { blush: 0 } });
        g.restore();
        /* the bed, its foot towards us: a wooden frame, the mattress, the quilt she made, two pillows */
        const bx0 = -110, bx1 = 420, top = SEAT - 4;
        P.fill(g, P.box(bx1 - 30, top - 190, 40, 190 + (FLOOR - top), 0.6, 11), '#9a6b48');      /* headboard */
        P.fill(g, P.rr(bx1 - 34, top - 200, 48, 16, 6), '#8a5d3e');
        P.line(g, bx0 + 14, top + 52, bx0 + 14, FLOOR, 9, '#8a5d3e'); P.line(g, bx1 - 40, top + 52, bx1 - 40, FLOOR, 9, '#8a5d3e');
        P.fill(g, P.box(bx0, top + 30, bx1 - bx0 - 10, 30, 0.6, 12), '#9a6b48');                  /* frame */
        P.fill(g, P.rr(bx0 + 4, top - 8, bx1 - bx0 - 36, 42, 12), '#f4efe6');                        /* mattress */
        P.fill(g, P.soft([[bx0 + 120, top - 10], [bx1 - 150, top - 16], [bx1 - 40, top - 8], [bx1 - 34, top + 40], [bx0 + 130, top + 44], [bx0 + 108, top + 18]]), '#e3a593');   /* the quilt */
        g.strokeStyle = 'rgba(160,80,60,0.35)'; g.lineWidth = 1.6;
        for (let i = 0; i < 4; i++) { const x = bx0 + 170 + i * 58; g.beginPath(); g.moveTo(x, top - 10); g.lineTo(x - 4, top + 40); g.stroke(); }
        P.fill(g, P.soft([[bx1 - 150, top - 12], [bx1 - 146, top - 40], [bx1 - 80, top - 46], [bx1 - 44, top - 34], [bx1 - 46, top - 10]]), '#fbf7ef');
        P.fill(g, P.soft([[bx1 - 120, top - 30], [bx1 - 112, top - 58], [bx1 - 58, top - 62], [bx1 - 38, top - 46], [bx1 - 44, top - 26]]), '#f6f0e6');
        /* the little table in front of them, the lamp, and the knitting */
        const tx = LAMP[0], ty = 616;
        P.fill(g, P.box(tx - 70, ty, 140, 14, 0.5, 13), '#a57d58');
        P.line(g, tx - 58, ty + 12, tx - 62, FLOOR, 7, '#8a6442'); P.line(g, tx + 58, ty + 12, tx + 62, FLOOR, 7, '#8a6442');
        P.fill(g, P.rr(tx - 14, ty - 18, 28, 18, 5), '#8f8672'); P.line(g, tx, ty - 18, tx, LAMP[1] + 24, 4, '#8f8672');
        P.fill(g, P.poly([[tx - 40, LAMP[1] + 26], [tx + 40, LAMP[1] + 26], [tx + 28, LAMP[1] - 22], [tx - 28, LAMP[1] - 22]]), '#f3dfae');
        /* one hat finished, with its bobble; the other on two needles, the ball of wool beside it */
        const hat = (x, y, s, done) => {
          g.save(); g.translate(x, y); g.scale(s, s);
          P.fill(g, P.soft([[-17, 2], [-15, -12], [-6, -20], [6, -20], [15, -12], [17, 2]]), done ? F.KNIT : T.shade(F.KNIT, 0.06));
          P.fill(g, P.rr(-18, -2, 36, 8, 4), T.shade(F.KNIT, -0.1));
          g.strokeStyle = T.shade(F.KNIT, -0.2); g.lineWidth = 0.8;
          for (let k = -14; k <= 14; k += 4) { g.beginPath(); g.moveTo(k, -1); g.lineTo(k, 5); g.stroke(); }
          if (done) P.fill(g, P.circle(0, -22, 5.2), '#fbf1e2');
          g.restore();
        };
        hat(tx - 36, ty - 2, 1.05, true);
        hat(tx + 28, ty - 2, 1.05, false);
        P.line(g, tx + 6, ty - 26, tx + 46, ty - 4, 2.2, '#c9b28a'); P.line(g, tx + 48, ty - 28, tx + 14, ty - 2, 2.2, '#c9b28a');
        P.fill(g, P.circle(tx + 62, ty - 9, 10), F.KNIT);
        g.strokeStyle = T.shade(F.KNIT, -0.18); g.lineWidth = 1; g.beginPath(); g.arc(tx + 62, ty - 9, 7, 0.4, 2.6); g.stroke();
      }, ZM);
    };
    V.enter = function () { if (!V.L || V.gen !== T.gen) V.build(); };

    /* the picture is looked at from close to: world → screen is a zoom on the two of them and the lamp */
    const toScr = (x, y) => [(x - ZC[0]) * ZM, (y - ZC[1]) * ZM + 450];
    /* where the photograph is on the screen: in her hands, or held up close. [x, y, scale, rotation] */
    function photoAt(hands) {
      const k = T.ease.io(V.close.k), h = toScr(hands[0], hands[1]);
      return [T.lerp(h[0], -250, k), T.lerp(h[1], 318, k), T.lerp(0.085 * ZM, 1, k), T.lerp(-0.32, -0.035, k)];
    }

    V.draw = function (g, t) {
      const W = T.view.W;
      if (!V.L || V.gen !== T.gen) V.build();
      g.fillStyle = '#f3ead8'; g.fillRect(-W / 2, 0, W, 900);
      g.save(); g.translate(0, 450); g.scale(ZM, ZM); g.translate(-ZC[0], -ZC[1]);
      T.blit(g, V.L);
      /* the lamp, breathing a little */
      P.glow(g, LAMP[0], LAMP[1], 300 * (1 + Math.sin(t * 7) * 0.01), '#ffd9a0', 0.42);
      P.glow(g, LAMP[0], LAMP[1], 70, '#fff2cc', 0.6);
      const bk = T.ease.io(V.belly.k), lk = T.ease.io(V.lean.k), br = Math.sin(t * 1.1) * 0.01;
      /* him, sitting close behind her, looking down over her shoulder */
      const leo = { x: LEO.x, y: SEAT - 10, s: LEO.s, style: F.styles.leo, flip: true, sit: true, lean: 0.2 + lk * 0.08 + br, headTilt: 0.34 + lk * 0.1,
        face: { eye: lk > 0.4 ? 'happy' : 'open', mouth: 'smile', blush: 0.2 } };
      leo.legF = { a: Math.PI / 2 - 0.12, b: Math.PI / 2 - 0.1 }; leo.legB = { a: Math.PI / 2 - 0.2, b: Math.PI / 2 - 0.04 };
      const ana = { x: ANA.x, y: SEAT - 6, s: ANA.s, style: F.anaAt(30, { belly: 11 }), flip: true, sit: true, lean: 0.1 + br - bk * 0.04, headTilt: 0.3 + bk * 0.1 - lk * 0.08,
        face: { eye: lk > 0.4 ? 'happy' : 'open', mouth: 'smile', blush: 0.26 } };
      ana.legF = { a: Math.PI / 2 - 0.1, b: Math.PI / 2 - 0.12 }; ana.legB = { a: Math.PI / 2 - 0.18, b: Math.PI / 2 - 0.06 };
      /* his arm round her, his other hand on the bed */
      leo.armF = { hand: F.local(leo, ANA.x - 4, SEAT - 104) };
      leo.armB = { hand: F.local(leo, LEO.x - 30, SEAT - 4) };
      /* the photograph in her hands; then one hand goes to her belly */
      const hands = [ANA.x - 76 + bk * 4, SEAT - 92 + bk * 14];
      const belly = [ANA.x - 54, SEAT - 44];
      ana.armB = { hand: F.local(ana, hands[0] + 8, hands[1] + 8) };
      ana.armF = { hand: F.local(ana, T.lerp(hands[0] - 6, belly[0], bk), T.lerp(hands[1] + 4, belly[1], bk) - Math.sin(bk * Math.PI) * 10), bend: 1 };
      F.person(g, leo);
      F.person(g, ana);
      g.save(); g.translate(hands[0], hands[1]); g.rotate(-0.32 + bk * 0.2); g.scale(0.085, 0.085); scan(g, 460, 340, t, 0); g.restore();
      /* dust in the lamplight */
      const rd = T.rng(9);
      for (let i = 0; i < 14; i++) { const ph2 = rd() * TAU, x = LAMP[0] - 160 + rd() * 360 + Math.sin(t * 0.3 + ph2) * 20, y = 300 + ((rd() * 400 - t * 9 * (0.5 + rd())) % 400 + 400) % 400; P.glow(g, x, y, 4, '#fff3dc', 0.3 + 0.2 * Math.sin(t + ph2)); }
      g.restore();
      /* the colour of remembering: warm in the middle, browning to the edges */
      g.save(); g.globalCompositeOperation = 'multiply';
      const gr = g.createRadialGradient(-60, 430, 80, -60, 430, 900);
      gr.addColorStop(0, '#fff6e6'); gr.addColorStop(0.55, '#f2dcbc'); gr.addColorStop(1, '#caa47c');
      g.fillStyle = gr; g.fillRect(-W / 2, 0, W, 900); g.restore();
      /* held up close: the room dims a little behind it */
      if (V.close.k >= 0.02) {
        const k = T.ease.io(V.close.k), ph = photoAt(hands);
        g.fillStyle = T.rgba('#2a1e16', 0.48 * k); g.fillRect(-W / 2, 0, W, 900);
        g.save(); g.translate(ph[0], ph[1] + Math.sin(t * 0.9) * 2 * k); g.rotate(ph[3]); g.scale(ph[2], ph[2]);
        g.shadowColor = 'rgba(20,12,6,0.5)'; g.shadowBlur = 40; g.shadowOffsetY = 14;
        P.fill(g, P.rr(-230, -170, 460, 340, 5), '#f3f0ea');
        g.shadowColor = 'transparent';
        scan(g, 460, 340, t, T.ease.io(V.shine.k));
        g.restore();
      }
      P.drawFrame(g, V.frame);
    };
    return V;
  };
})();
