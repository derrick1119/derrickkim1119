/* Take Your Time — the hospital room. Late autumn; the hub of the prologue and the place of the last talk.
   Light is the only progress bar: every memory moves the window one step from dusk towards morning. */
(function () {
  'use strict';
  const T = window.TYT, P = T.P, F = T.F;
  const TAU = Math.PI * 2;

  /* palette stops: 0 dusk · 1 blue hour · 2 night · 3 small hours · 4 first light · 5 morning */
  const SKY_TOP = ['#7d86ab', '#3b4a78', '#141c38', '#1b2546', '#7c8fbd', '#9fc4e2'];
  const SKY_MID = ['#d59a93', '#7d6f9c', '#232d52', '#333e6c', '#e3a9a2', '#f0e2c8'];
  const SKY_LOW = ['#f6bf86', '#d99a84', '#3a4470', '#5c5f90', '#ffd3a0', '#ffe6b0'];
  const AMBIENT = ['#b9a8c2', '#8d93bd', '#5f6ba2', '#6a75aa', '#cbb4c2', '#ffe9c9'];
  const BEAM = ['#ffc58f', '#a9b6e2', '#93a8e8', '#9aace6', '#ffc9a8', '#ffd78a'];
  const BEAM_K = [0.52, 0.2, 0.24, 0.24, 0.5, 0.8];
  const LAMP_K = [0.5, 0.85, 1, 1, 0.42, 0];
  const STAR_K = [0, 0.3, 1, 0.8, 0.04, 0];
  const LEAVES_LEFT = [7, 6, 5, 4, 2, 1];

  const WIN = { x: -534, y: 125, w: 318, h: 432 };       /* the glass */
  const SPOT = {
    photo: { x: 428, y: 550, r: 56, scene: 'home' },
    book: { x: 64, y: 540, r: 54, scene: 'stew' },
    drawing: { x: 30, y: 330, r: 72, scene: 'swing' },
    leash: { x: -42, y: 612, r: 48, scene: 'walk' },
  };
  const ORDER = ['drawing', 'book', 'leash', 'photo'];
  const LEO = { x: 112, y: 612, s: 400 };
  const ANA = { x: -12, y: 670, s: 384 };
  const LILY = { x: 54, y: 654, s: 236 };
  const LILY_HAND = [78, 604];

  const S = (T.scenes.room = {
    L: {},
    tod: 0,            /* time of day, eased towards state.count */
    zoom: { k: 0, x: 0, y: 0 },
    mode: 'hub',       /* hub · card · final · hold */
    sel: null,
    hintA: 0,
    title: { a: 0 },
    dip: { a: 0 },
    card: { a: 0, flip: 0, write: 0, y: 0 },
    fam: { a: 0 },     /* Ana and Lily present */
    ana: { cry: 0, joy: 0, look: 0 },
    leo: { lean: 0, look: 0, reach: 0, speak: 0 },
    hold: { k: 0, on: false },
    lastLeaf: { fall: 0 },
    kb: 0,
    leaves: [],
    motes: [],
    frag: 0,
  });

  const TALK = T.talk(S);

  /* ---------- static geometry ---------- */
  function buildTree() {
    /* bare branches reaching across the window from the left */
    const r = T.rng(42), segs = [], tips = [];
    function grow(x, y, a, len, w, depth) {
      const steps = 4;
      let px = x, py = y;
      const pts = [[x, y]];
      for (let i = 0; i < steps; i++) {
        a += (r() - 0.5) * 0.38;
        px += Math.cos(a) * len / steps; py += Math.sin(a) * len / steps;
        pts.push([px, py]);
      }
      segs.push({ pts, w });
      if (depth <= 0 || w < 1.3) { tips.push([px, py]); return; }
      const kids = depth > 2 ? 2 : r() < 0.7 ? 2 : 1;
      for (let k = 0; k < kids; k++) grow(px, py, a + (k === 0 ? -1 : 1) * (0.3 + r() * 0.45), len * (0.62 + r() * 0.16), w * 0.62, depth - 1);
      if (r() < 0.5) { const m = pts[2]; grow(m[0], m[1], a + (r() < 0.5 ? -1 : 1) * (0.7 + r() * 0.3), len * 0.45, w * 0.45, depth - 2); }
    }
    grow(-600, 520, -0.62, 190, 15, 4);
    grow(-585, 600, -0.28, 150, 9, 3);
    S.tree = segs;
    const rr = T.rng(31);
    S.roofs = [];
    for (let x = WIN.x - 40; x < WIN.x + WIN.w + 40;) {
      const w = 44 + rr() * 60, h = 58 + rr() * 62, lights = [];
      for (let j = 0; j < 3; j++) if (rr() < 0.5) lights.push([8 + rr() * (w - 22), 10 + rr() * Math.max(4, h - 34), 0.35 + rr() * 0.5]);
      S.roofs.push({ x, w, h, lights });
      x += w;
    }
    /* leaves that are still holding on: choose tips inside the glass, spread out */
    const inside = tips.filter((p) => p[0] > WIN.x + 30 && p[0] < WIN.x + WIN.w - 24 && p[1] > WIN.y + 40 && p[1] < WIN.y + WIN.h - 110);
    inside.sort((a, b) => a[0] - b[0]);
    const pick = [];
    for (let i = 0; i < 7; i++) pick.push(inside[Math.floor(((i + 0.5) / 7) * inside.length)]);
    /* the one that stays to the end sits where the eye rests */
    pick.sort((a, b) => Math.abs(a[0] + 330) + Math.abs(a[1] - 300) - (Math.abs(b[0] + 330) + Math.abs(b[1] - 300)));
    S.held = pick.map((p, i) => ({ x: p[0], y: p[1], c: ['#d98a3d', '#c96a34', '#e0a03c', '#b9532f', '#d9933b', '#c97a2f', '#e3ab45'][i], seed: i * 3.1 }));
  }

  function blanketPts(flat) {
    const k = flat ? 0.3 : 1; /* how high the knees are */
    return [
      [154, 602], [124, 588 + (1 - k) * 4], [78, 590 - k * 32], [26, 590 - k * 46], [-24, 594 - k * 28], [-76, 606 - k * 4],
      [-128, 606 - k * 10], [-168, 612], [-198, 630], [-214, 664], [-208, 708],
      [-140, 716], [-64, 706], [18, 714], [98, 706], [168, 714], [190, 654], [178, 616],
    ];
  }

  S.build = function () {
    const V = T.view, x0 = -V.W / 2 - 50, w = V.W + 100;
    if (!S.tree) buildTree();
    if (S.builtGen === T.gen && S.L.back) return;
    S.builtGen = T.gen;

    /* ---- back wall, floor, window frame (glass left open) ---- */
    S.L.back = T.bake(x0, -30, w, 960, (g) => {
      P.wash(g, P.box(x0, -30, w, 760, 0, 1), '#cfd4ca', [x0, -30, w, 760], { seed: 11, len: 300, wid: 46, tone: 0.04, dir: Math.PI / 2, spread: 0.12 });
      /* lower wall and rail */
      P.wash(g, P.box(x0, 604, w, 110, 0, 2), '#bcc6bf', [x0, 604, w, 110], { seed: 12, len: 260, wid: 30, tone: 0.035 });
      P.fill(g, P.box(x0, 598, w, 9, 0.6, 3), '#a7b3ad');
      P.fill(g, P.box(x0, 700, w, 14, 0.6, 4), '#8d9a97');
      /* floor */
      P.wash(g, P.box(x0, 712, w, 230, 0, 5), '#a9ada2', [x0, 712, w, 230], { seed: 13, len: 380, wid: 26, tone: 0.045, spread: 0.05 });
      P.tint(g, P.box(x0, 712, w, 230, 0, 5), 0, 712, 0, 930, [[0, 'rgba(40,52,60,0.20)'], [0.2, 'rgba(40,52,60,0.02)'], [1, 'rgba(40,52,60,0.22)']]);
      /* soft corner shade on the wall */
      P.tint(g, P.box(x0, -30, w, 742, 0, 1), 0, -30, 0, 712, [[0, 'rgba(52,64,78,0.26)'], [0.3, 'rgba(52,64,78,0.05)'], [1, 'rgba(52,64,78,0.0)']]);

      /* medical strip over the bed */
      P.fill(g, P.rr(118, 388, 250, 22, 5), '#dfe2d8');
      P.fill(g, P.rr(118, 406, 250, 5, 2), '#b4bdb6');
      [[150, 399], [178, 399]].forEach((p) => P.fill(g, P.circle(p[0], p[1], 5), '#a3ada8'));
      P.fill(g, P.rr(322, 393, 26, 12, 3), '#c98f7c');

      /* IV stand, behind the bed */
      g.lineCap = 'round';
      P.line(g, 318, 236, 318, 700, 4.5, '#aab4b4');
      P.line(g, 296, 240, 340, 240, 4, '#aab4b4');
      P.line(g, 296, 240, 296, 250, 3, '#aab4b4');
      P.fill(g, P.rr(280, 250, 34, 58, 9), '#dfe9ea');
      P.fill(g, P.rr(284, 280, 26, 24, 6), '#c3dadd');
      P.line(g, 297, 308, 297, 330, 2, '#c9d6d6');
      P.fill(g, P.rr(292, 328, 10, 18, 3), '#dfe9ea');
      g.strokeStyle = '#d5e0e0'; g.lineWidth = 1.8;
      g.beginPath(); g.moveTo(297, 346); g.bezierCurveTo(300, 430, 262, 470, 250, 560); g.stroke();

      /* Lily's drawing, taped up where he can see it */
      g.save();
      g.translate(30, 330); g.rotate(-0.045);
      g.shadowColor = 'rgba(40,50,60,0.28)'; g.shadowBlur = 14; g.shadowOffsetY = 5;
      P.fill(g, P.box(-76, -57, 152, 114, 0.8, 21), '#fbf7ec');
      g.shadowColor = 'transparent';
      miniDrawing(g);
      g.fillStyle = 'rgba(236,222,170,0.82)';
      g.save(); g.translate(-66, -54); g.rotate(-0.5); g.fillRect(-15, -6, 30, 12); g.restore();
      g.save(); g.translate(66, -54); g.rotate(0.45); g.fillRect(-15, -6, 30, 12); g.restore();
      g.restore();

      /* window: sill shadow, frame, then cut the glass out */
      P.tint(g, P.box(-580, 575, 410, 60, 0, 6), 0, 575, 0, 635, [[0, 'rgba(50,60,72,0.30)'], [1, 'rgba(50,60,72,0)']]);
      P.fill(g, P.box(WIN.x - 16, WIN.y - 16, WIN.w + 32, WIN.h + 32, 0.7, 7), '#ebe6d8');
      P.tint(g, P.box(WIN.x - 16, WIN.y - 16, WIN.w + 32, WIN.h + 32, 0.7, 7), WIN.x - 16, 0, WIN.x + WIN.w + 16, 0, [[0, 'rgba(120,120,110,0.25)'], [0.5, 'rgba(120,120,110,0)'], [1, 'rgba(255,255,255,0.25)']]);
      g.save();
      g.globalCompositeOperation = 'destination-out';
      g.fillRect(WIN.x, WIN.y, WIN.w, WIN.h);
      g.restore();
      P.fill(g, P.box(WIN.x + WIN.w / 2 - 5, WIN.y, 10, WIN.h, 0.5, 8), '#e6e1d2');
      P.fill(g, P.box(WIN.x, WIN.y + 122, WIN.w, 10, 0.5, 9), '#e6e1d2');
      P.fill(g, P.box(WIN.x - 34, WIN.y + WIN.h + 6, WIN.w + 68, 19, 0.8, 10), '#e7e1d1');
      P.fill(g, P.box(WIN.x - 34, WIN.y + WIN.h + 21, WIN.w + 68, 5, 0.5, 14), '#c4bfae');
      /* curtain rod */
      P.line(g, WIN.x - 110, WIN.y - 34, WIN.x + WIN.w + 40, WIN.y - 34, 5, '#8e8779');
    });

    /* ---- bed ---- */
    S.L.bed = T.bake(-290, 380, 730, 440, (g) => {
      /* floor shadow */
      const sh = g.createRadialGradient(80, 782, 10, 80, 782, 380);
      sh.addColorStop(0, 'rgba(30,40,52,0.36)'); sh.addColorStop(1, 'rgba(30,40,52,0)');
      g.save(); g.translate(0, 782); g.scale(1, 0.13); g.translate(0, -782); g.fillStyle = sh; g.fillRect(-320, 400, 800, 760); g.restore();
      /* legs and wheels */
      [-164, 332].forEach((x) => {
        P.fill(g, P.rr(x - 6, 690, 12, 66, 3), '#9aa5a4');
        P.fill(g, P.circle(x, 764, 11), '#59636a');
        P.fill(g, P.circle(x, 764, 4), '#9aa5a4');
      });
      /* headboard and foot rail */
      P.fill(g, P.rr(350, 428, 24, 276, 10), '#d8d4c4');
      P.fill(g, P.rr(354, 432, 8, 268, 4), '#ece8da');
      P.fill(g, P.rr(-206, 584, 16, 118, 7), '#d8d4c4');
      /* frame */
      P.fill(g, P.rr(-198, 676, 564, 20, 7), '#b5bdb8');
      P.fill(g, P.rr(-198, 676, 564, 6, 3), '#c9d0ca');
      /* mattress: flat part, then the raised back */
      P.wash(g, P.rr(-194, 639, 552, 40, 12), '#f0ede2', [-194, 639, 552, 40], { seed: 31, n: 10, tone: 0.03 });
      const back = P.soft([[150, 676], [143, 658], [124, 648], [262, 482], [276, 486], [292, 508], [286, 520], [168, 664], [160, 678]]);
      P.wash(g, back, '#ebe7da', [120, 480, 180, 200], { seed: 32, n: 12, tone: 0.035, dir: -0.9 });
      P.tint(g, back, 150, 660, 280, 500, [[0, 'rgba(90,100,110,0.22)'], [1, 'rgba(90,100,110,0)']]);
      /* pillows */
      const pil = () => P.soft([[-84, -6], [-70, -30], [0, -36], [72, -30], [86, -4], [72, 22], [0, 28], [-70, 24]]);
      g.save();
      g.translate(236, 512); g.rotate(-0.89);
      g.shadowColor = 'rgba(60,70,84,0.3)'; g.shadowBlur = 12; g.shadowOffsetY = 4;
      P.fill(g, pil(), '#f8f5ec');
      g.shadowColor = 'transparent';
      P.tint(g, pil(), 0, -36, 0, 30, [[0, 'rgba(255,255,255,0.4)'], [0.55, 'rgba(255,255,255,0)'], [1, 'rgba(110,120,140,0.28)']]);
      g.restore();
    });

    const blanket = (flat, seed) => T.bake(-270, 480, 520, 300, (g) => {
      const pts = blanketPts(flat);
      const path = P.soft(pts);
      g.save();
      g.shadowColor = 'rgba(30,40,52,0.25)'; g.shadowBlur = 10; g.shadowOffsetY = 3;
      P.fill(g, path, '#7fa5a8');
      g.restore();
      P.wash(g, path, '#7fa5a8', [-215, 540, 410, 180], { seed, n: 40, tone: 0.06, len: 130, wid: 22, dir: 0.12 });
      P.tint(g, path, 0, 540, 0, 720, [[0, 'rgba(255,255,255,0.20)'], [0.4, 'rgba(255,255,255,0)'], [1, 'rgba(30,50,70,0.30)']]);
      /* turned-down sheet at the waist */
      g.save(); g.clip(path);
      P.fill(g, P.soft([[196, 590], [150, 592], [118, 584 + (flat ? 2 : 0)], [128, 640], [150, 720], [200, 720]]), '#f1eee3');
      P.fill(g, P.soft([[126, 588], [118, 584], [128, 640], [146, 716], [156, 716], [140, 640]]), '#d9d6c9');
      /* folds */
      g.globalAlpha = 0.2; g.lineCap = 'round';
      const k = flat ? 0.3 : 1;
      [[[30, 592 - k * 40], [10, 642], [18, 704]], [[-30, 598 - k * 22], [-54, 652], [-42, 706]], [[84, 594 - k * 26], [76, 652], [92, 706]], [[-120, 606], [-136, 660], [-128, 708]], [[-178, 622], [-190, 664], [-186, 704]]].forEach((f, i) => {
        P.strokePts(g, f, 7 - i, '#3f6470', true);
      });
      g.restore();
    });
    S.L.blanketUp = blanket(false, 41);
    S.L.blanketFlat = blanket(true, 43);

    /* ---- bedside cabinet (lamp and photo are drawn live) and the visitor's chair ---- */
    S.L.cab = T.bake(360, 560, 190, 250, (g) => {
      const sh = g.createRadialGradient(446, 782, 4, 446, 782, 110);
      sh.addColorStop(0, 'rgba(30,40,52,0.32)'); sh.addColorStop(1, 'rgba(30,40,52,0)');
      g.save(); g.translate(0, 782); g.scale(1, 0.14); g.translate(0, -782); g.fillStyle = sh; g.fillRect(300, 600, 300, 360); g.restore();
      P.wash(g, P.box(386, 600, 120, 176, 0.8, 51), '#c9b999', [386, 600, 120, 176], { seed: 52, n: 14, tone: 0.05, dir: Math.PI / 2, len: 90, wid: 14 });
      P.fill(g, P.box(380, 594, 132, 12, 0.6, 53), '#d9cbad');
      P.fill(g, P.box(396, 620, 100, 52, 0.6, 54), '#bfae8d');
      P.fill(g, P.box(396, 684, 100, 80, 0.6, 55), '#bfae8d');
      P.fill(g, P.rr(436, 640, 20, 6, 3), '#8d7c5e');
      P.fill(g, P.rr(436, 716, 20, 6, 3), '#8d7c5e');
      P.tint(g, P.box(386, 600, 120, 176, 0.8, 51), 386, 0, 506, 0, [[0, 'rgba(60,50,40,0.22)'], [0.4, 'rgba(60,50,40,0)'], [1, 'rgba(60,50,40,0.1)']]);
      /* a mug */
      P.fill(g, P.rr(386, 572, 20, 24, 4), '#e9e3d2');
      g.strokeStyle = '#e9e3d2'; g.lineWidth = 3.4; g.beginPath(); g.arc(407, 584, 6, -1.2, 1.2); g.stroke();
    });
    S.L.chair = T.bake(-110, 520, 240, 290, (g) => {
      const sh = g.createRadialGradient(-2, 782, 4, -2, 782, 100);
      sh.addColorStop(0, 'rgba(30,40,52,0.3)'); sh.addColorStop(1, 'rgba(30,40,52,0)');
      g.save(); g.translate(0, 782); g.scale(1, 0.14); g.translate(0, -782); g.fillStyle = sh; g.fillRect(-140, 640, 280, 300); g.restore();
      const wood = '#a67b54', dark = '#8a6442';
      P.fill(g, P.rough([[-58, 556], [-46, 554], [-40, 776], [-50, 776]], 0.8, 61), dark);          /* back post + rear leg */
      P.fill(g, P.rough([[34, 706], [44, 706], [48, 776], [39, 776]], 0.8, 62), dark);               /* front leg */
      P.fill(g, P.rough([[-56, 698], [48, 698], [50, 712], [-54, 712]], 0.8, 63), wood);             /* seat */
      P.fill(g, P.rough([[-62, 554], [-42, 552], [-41, 598], [-60, 600]], 0.8, 64), wood);           /* top rail */
      P.fill(g, P.rough([[-54, 742], [44, 742], [44, 749], [-54, 749]], 0.6, 65), dark);             /* stretcher */
    });

    /* ---- things at the edge of sight, close to the eye ---- */
    S.L.front = T.bake(x0, -30, w, 960, (g) => {
      const R = V.W / 2;
      const fold = (x, wd, seed) => {
        const pts = [];
        for (let y = -30; y <= 930; y += 60) pts.push([x + T.noise(y * 0.006, seed) * 26 + (y / 930) * wd * 0.2, y]);
        const poly = pts.concat([[R + 60, 930], [R + 60, -30]]);
        return P.soft(poly);
      };
      g.save();
      g.shadowColor = 'rgba(12,18,28,0.55)'; g.shadowBlur = 40;
      P.fill(g, fold(R - 70, 40, 71), '#27303d');
      g.restore();
      P.fill(g, fold(R - 34, 30, 72), '#1e2632');
      /* left: the edge of the doorway */
      const dg = g.createLinearGradient(-R - 10, 0, -R + 90, 0);
      dg.addColorStop(0, 'rgba(22,29,42,0.95)'); dg.addColorStop(0.45, 'rgba(22,29,42,0.6)'); dg.addColorStop(1, 'rgba(22,29,42,0)');
      g.fillStyle = dg; g.fillRect(-R - 50, -30, 150, 960);
    });
  };

  /* Lily's picture at thumbnail size: house, tree with a swing, four of them, a sun */
  function miniDrawing(g) {
    const c = (pts, col, w, seed) => P.crayon(g, pts, col, w, seed);
    P.scribble(g, P.box(-74, 30, 148, 26, 0, 1), [-74, 30, 148, 26], '#7fb069', { gap: 5, w: 4, seed: 4, ang: 0.1 });
    c([[-58, 30], [-58, 0], [-24, 0], [-24, 30]], '#e0a53c', 3.4, 5);
    c([[-64, 2], [-41, -22], [-18, 2]], '#c9573f', 3.8, 6);
    c([[-45, 30], [-45, 14], [-37, 14], [-37, 30]], '#8a5a3b', 2.6, 7);
    c([[30, 32], [30, -8], [29, -30]], '#8a5a3b', 4, 8);
    P.scribble(g, P.circle(32, -34, 20), [10, -56, 44, 44], '#5d9a57', { gap: 5, w: 4.4, seed: 9, ang: 0.8 });
    c([[30, -12], [56, -14]], '#8a5a3b', 3, 10);
    c([[46, -13], [45, 14]], '#555', 1.4, 11); c([[55, -14], [54, 14]], '#555', 1.4, 12);
    c([[43, 15], [57, 15]], '#c9573f', 3, 13);
    /* family */
    const stick = (x, h, col, seed) => {
      c([[x, 30], [x, 30 - h]], col, 2.6, seed);
      g.save(); g.globalCompositeOperation = 'multiply'; g.strokeStyle = '#3b3230'; g.globalAlpha = 0.7; g.lineWidth = 1.6;
      g.beginPath(); g.arc(x, 24 - h, 5, 0, TAU); g.stroke(); g.restore();
      c([[x - 6, 30 - h * 0.55], [x + 6, 30 - h * 0.55]], col, 2, seed + 1);
    };
    stick(-10, 26, '#d7a23c', 14); stick(4, 24, '#c9573f', 16); stick(15, 14, '#5b8fb0', 18);
    c([[-70, 26], [-62, 26]], '#b57c50', 4, 20);
    /* sun */
    P.scribble(g, P.circle(58, -40, 9), [48, -50, 20, 20], '#f0b93a', { gap: 4, w: 4, seed: 22 });
  }

  /* ---------- lifecycle ---------- */
  function seedAir() {
    if (!S.leaves.length) {
      const r = T.rng(5);
      for (let i = 0; i < 9; i++) S.leaves.push({ x: WIN.x + r() * WIN.w, y: WIN.y + r() * WIN.h, s: 5 + r() * 5, ph: r() * 9, v: 16 + r() * 16, c: ['#d98a3d', '#c96a34', '#e0a03c', '#b9532f'][i % 4] });
      for (let i = 0; i < 46; i++) S.motes.push({ x: -480 + r() * 760, y: 180 + r() * 600, ph: r() * 20, s: 1 + r() * 2.2 });
    }
  }
  S.enter = function (args) {
    const st = T.state;
    S.sel = null; TALK.clear();
    S.dip.a = 0; S.card.a = 0; S.card.flip = 0; S.card.write = 0;
    S.hold.k = 0; S.hold.on = false; S.lastLeaf.fall = 0;
    S.ana.cry = 0; S.ana.joy = 0; S.leo.lean = 0; S.leo.reach = 0; S.leo.look = 0;
    P.grainAmt = 0.11; P.vignette = 0.46; P.vignetteColor = '#0e1420';
    seedAir();
    S.title.a = 0; S.title.leaving = false;
    T.state.chapter = 0;
    if (args.title) {
      S.mode = 'title'; S.title.a = 1; S.tod = 0; S.fam.a = 0; S.zoom.k = 0;
    } else if (args.final) {
      S.mode = 'final'; S.tod = 5; S.fam.a = 1; S.zoom.k = 0;
      S.runFinal();
    } else {
      S.mode = 'hub';
      S.fam.a = 0;
      const from = args.from;
      const prev = Math.max(0, st.count - (from ? 1 : 0));
      S.tod = from ? prev : st.count;
      if (from) {
        const sp = SPOT[from];
        S.zoom.k = 1; S.zoom.x = sp.x; S.zoom.y = sp.y;
        S.clock.tween(S.zoom, 'k', 0, 2.4, T.ease.io3);
        S.clock.tween(S, 'tod', st.count, 5, T.ease.io);
        S.clock.wait(2.2).then(() => T.audio.fragment(st.count * 7 + 1));
      } else {
        S.zoom.k = 0;
      }
      S.hintA = 0;
      if (st.count === 0) S.clock.wait(2.5).then(() => S.clock.tween(S, 'hintA', 1, 1.2));
    }
    S.frag = 12;
    T.audio.pad(null);
    T.audio.ambience(0.5, 0.3);
  };
  /* a quiet row at the foot of the title: straight to any chapter */
  const CHAPTERS = [['1장', 'kitchen'], ['2장', 'ch2'], ['3장', 'ch3'], ['4장', 'ch4'], ['5장', 'ch5'], ['6장', 'ch6'], ['마지막 장', 'ch7']];
  const chapterX = (i) => (i - 3) * 100 + (i === 6 ? 22 : 0);
  const overChapter = (x, y) => { if (Math.abs(y - 842) > 28) return -1; for (let i = 0; i < CHAPTERS.length; i++) if (Math.abs(x - chapterX(i)) < (i === 6 ? 62 : 46)) return i; return -1; };
  S.skipToChapter = function (i) {
    const c = CHAPTERS[i || 0];
    if (S.mode !== 'title' || S.title.leaving || T.director.busy() || !c || !T.scenes[c[1]]) return;
    S.title.leaving = true;
    T.audio.unlock();
    T.director.go(c[1], { style: 'fade', color: '#0f1522', out: 1.4, in: 1.6 });
  };
  S.begin = function () {
    if (S.mode !== 'title' || S.title.leaving) return;
    const k = S.clock;
    S.title.leaving = true;
    T.audio.unlock();
    T.audio.ambience(0.5, 0.3);
    k.wait(0.5).then(() => T.audio.motif({ voice: 'felt', vel: 0.36, beat: 0.9 }));
    k.tween(S.title, 'a', 0, 2.2, T.ease.io).then(() => { S.mode = 'hub'; S.title.leaving = false; S.frag = 9; });
    k.wait(4.2).then(() => { if (T.state.count === 0 && !S.sel) k.tween(S, 'hintA', 1, 1.2); });
  };
  S.exit = function () { T.cursor('default'); };

  function allDone() { return T.state.count >= 4; }
  function openSpots() {
    if (S.mode !== 'hub') return [];
    if (allDone()) return T.state.together ? [] : ['photo'];
    return ORDER.filter((id) => !T.state.done[id]);
  }

  S.select = function (id) {
    if (S.sel || S.mode !== 'hub') return;
    const sp = SPOT[id];
    T.audio.sfx('touch');
    S.clock.tween(S, 'hintA', 0, 0.5);
    if (allDone()) { S.runCard(); return; }
    S.sel = id;
    S.zoom.x = sp.x; S.zoom.y = sp.y;
    S.clock.tween(S.zoom, 'k', 1, 1.5, T.ease.io3);
    S.clock.wait(0.75).then(() => {
      const [dx, dy] = T.par(0.2);
      T.director.go(sp.scene, { x: sp.x + dx, y: sp.y + dy, color: '#f3ead8', out: 1.25, in: 1.3 });
    });
  };

  /* the back of the photograph: the fifth promise, in her hand */
  S.runCard = async function () {
    const c = S.card, k = S.clock;
    S.mode = 'card';
    T.audio.sfx('paper');
    c.flip = 0; c.write = 0;
    await k.tween(c, 'a', 1, 1.3, T.ease.out3);
    await k.wait(1.5);
    T.audio.sfx('page');
    await k.tween(c, 'flip', 1, 1.1, T.ease.io);
    await k.wait(0.35);
    T.announce('사진 뒷면에 아나의 글씨. 우리, 같이 늙자.');
    k.tween(c, 'write', 1, 2.6, T.ease.lin);
    await k.wait(1.2);
    T.audio.motif({ voice: 'box', vel: 0.34, beat: 0.62 });
    await k.wait(2.2);
    c.ready = true;
    await Promise.race([new Promise((res) => (c.tap = res)), k.wait(9)]);
    c.ready = false; c.tap = null;
    T.state.together = true;
    await k.tween(c, 'a', 0, 1.1, T.ease.io);
    /* the night ends */
    await k.wait(0.5);
    k.tween(S, 'tod', 5, 7, T.ease.io);
    await k.wait(2.6);
    await k.tween(S.dip, 'a', 1, 1.6, T.ease.io);
    S.mode = 'final'; S.fam.a = 1; S.tod = 5;
    await k.wait(0.5);
    k.tween(S.dip, 'a', 0, 2.2, T.ease.io);
    S.runFinal();
  };

  S.runFinal = async function () {
    const k = S.clock, A = T.audio;
    A.ambience(0.4, 0.16);
    A.pad(0, 0.12);
    await k.wait(2.6);
    k.tween(S.leo, 'look', 1, 1.4);
    await k.wait(1.5);
    S.leo.speak = 1;
    await TALK.say('leo', '먼저 가서 넓은 집도 짓고,\n맛있는 것도 많이 해놓을게.');
    await TALK.say('leo', '당신 왔을 때\n같이 행복할 수 있게.');
    A.pad(3, 0.14);
    const p = TALK.say('leo', '그러니까…  천천히 와.', { slow: true });
    k.wait(1.5).then(() => A.motif({ voice: 'felt', vel: 0.42, beat: 0.8 }));
    await p;
    S.leo.speak = 0;
    /* she cries, and then she laughs */
    k.tween(S.ana, 'cry', 1, 1.2, T.ease.io);
    await k.wait(3.2);
    k.tween(S.ana, 'cry', 0, 1.3, T.ease.io);
    k.tween(S.ana, 'joy', 1, 1.6, T.ease.io);
    await k.wait(1.3);
    A.pad(5, 0.14);
    await TALK.say('ana', '약속했다.\n넓은 집, 맛있는 거.');
    await TALK.say('leo', '응, 약속.');
    await k.wait(0.6);
    S.mode = 'hold';
    k.tween(S, 'hintA', 1, 1);
  };

  S.takeHand = async function () {
    if (S.hold.on) return;
    const k = S.clock, A = T.audio;
    S.hold.on = true;
    k.tween(S, 'hintA', 0, 0.4);
    A.sfx('touch');
    await k.tween(S.leo, 'reach', 1, 1.5, T.ease.io);
    T.announce('레오가 잠든 릴리의 손을 쥔다.');
    A.pad(7, 0.2);
    A.theme({ beat: 0.92, vel: 0.5 });
    k.tween(S.hold, 'k', 1, 6.5, T.ease.in);
    await k.wait(1.6);
    k.tween(S.lastLeaf, 'fall', 1, 7, T.ease.lin);
    await k.wait(3.2);
    const [dx, dy] = T.par(0.2);
    T.director.go('ending', { x: LILY_HAND[0] + dx, y: LILY_HAND[1] + dy, color: '#fffaf0', out: 4.2, in: 0.01 });
  };

  /* ---------- input ---------- */
  function spotAt(x, y) {
    const [dx, dy] = T.par(0.2), [bx, by] = T.par(0.34);
    let best = null, bd = 1e9;
    for (const id of openSpots()) {
      const sp = SPOT[id];
      const ox = id === 'drawing' ? bx : dx, oy = id === 'drawing' ? by : dy;
      const d = Math.hypot(x - sp.x - ox, y - sp.y - oy);
      if (d < sp.r + 14 && d < bd) { bd = d; best = id; }
    }
    return best;
  }
  S.pointer = function (type, x, y) {
    if (S.mode === 'title') {
      T.cursor('pointer');
      const ci = overChapter(x, y);
      S.title.hover = ci;
      if (Math.abs(x) < 210 && Math.abs(y - 80) < 34) { if (type === 'down') T.restyle(P.look === 'crayon' ? 'plain' : 'crayon'); return; }
      if (type === 'down' && ci >= 0) S.skipToChapter(ci);
      else if (type === 'up' || type === 'down') S.begin();
    } else if (S.mode === 'hub') {
      const id = spotAt(x, y);
      T.cursor(id && !S.sel ? 'pointer' : 'default');
      if (type === 'down' && id) S.select(id);
    } else if (S.mode === 'card') {
      if (type === 'down' && S.card.tap) S.card.tap();
    } else if (S.mode === 'final') {
      if (type === 'down') TALK.tap();
    } else if (S.mode === 'hold') {
      const [dx, dy] = T.par(0.2);
      const near = Math.hypot(x - LILY_HAND[0] - dx, y - LILY_HAND[1] - dy) < 120;
      T.cursor(near && !S.hold.on ? 'pointer' : 'default');
      if (type === 'down' && near) S.takeHand();
    }
  };
  S.key = function (key) {
    const act = key === ' ' || key === 'Enter';
    if (S.mode === 'title') { if (act) S.begin(); else if (key >= '1' && key <= '7') S.skipToChapter(+key - 1); else if (key === 'g' || key === 'G') T.restyle(P.look === 'crayon' ? 'plain' : 'crayon'); else return false; }
    else if (S.mode === 'hub') {
      const open = openSpots();
      if (!open.length) return false;
      if (key === 'ArrowRight' || key === 'ArrowDown' || key === 'Tab') S.kb = (S.kb + 1) % open.length;
      else if (key === 'ArrowLeft' || key === 'ArrowUp') S.kb = (S.kb + open.length - 1) % open.length;
      else if (act) S.select(open[S.kb % open.length]);
      else return false;
      S.kbShow = true;
    } else if (S.mode === 'card') { if (act && S.card.tap) S.card.tap(); else return false; }
    else if (S.mode === 'final') { if (act) TALK.tap(); else return false; }
    else if (S.mode === 'hold') { if (act) S.takeHand(); else return false; }
  };

  S.update = function (dt) {
    for (const l of S.leaves) {
      l.y += l.v * dt; l.ph += dt;
      l.x += Math.sin(l.ph * 1.3) * 14 * dt + 5 * dt;
      if (l.y > WIN.y + WIN.h + 20) { l.y = WIN.y - 20; l.x = WIN.x + ((l.x * 7.3 + 91) % WIN.w + WIN.w) % WIN.w; }
    }
    if (S.mode === 'hub' && !S.sel) {
      S.frag -= dt;
      if (S.frag <= 0) { S.frag = 13 + (T.time % 5); T.audio.fragment(Math.floor(T.time)); }
    }
  };

  /* ---------- drawing ---------- */
  function drawOutside(g, tod, ox, oy) {
    const top = T.ramp(SKY_TOP, tod), mid = T.ramp(SKY_MID, tod), low = T.ramp(SKY_LOW, tod);
    g.save();
    g.beginPath(); g.rect(WIN.x + ox - 2, WIN.y + oy - 2, WIN.w + 4, WIN.h + 4); g.clip();
    const [px, py] = T.par(0.75);
    const gr = g.createLinearGradient(0, WIN.y, 0, WIN.y + WIN.h);
    gr.addColorStop(0, top); gr.addColorStop(0.55, mid); gr.addColorStop(0.92, low);
    g.fillStyle = gr; g.fillRect(WIN.x - 60, WIN.y - 40, WIN.w + 120, WIN.h + 80);
    /* stars */
    const sk = T.rampNum(STAR_K, tod);
    if (sk > 0.01) {
      const r = T.rng(77);
      g.fillStyle = '#f4f1ff';
      for (let i = 0; i < 46; i++) {
        const x = WIN.x + r() * WIN.w, y = WIN.y + r() * WIN.h * 0.72, s = 0.7 + r() * 1.4;
        g.globalAlpha = sk * (0.45 + 0.55 * Math.sin(T.time * (0.6 + r()) + i));
        g.beginPath(); g.arc(x + px * 0.5, y + py * 0.5, s, 0, TAU); g.fill();
      }
      g.globalAlpha = 1;
    }
    /* a soft sun or moon low in the pane */
    const dayK = T.clamp(1 - Math.abs(tod - 5) / 1.2) + T.clamp(1 - tod / 1.1) * 0.8;
    if (dayK > 0.01) P.glow(g, WIN.x + 250 + px, WIN.y + 372 + py, 190, T.ramp(SKY_LOW, tod), 0.75 * dayK, 'screen');
    const nightK = T.clamp(1 - Math.abs(tod - 2.5) / 1.4);
    if (nightK > 0.01) {
      P.glow(g, WIN.x + 236 + px, WIN.y + 86 + py, 80, '#dfe6ff', 0.5 * nightK);
      g.fillStyle = T.rgba('#f1f3ff', 0.92 * nightK);
      g.beginPath(); g.arc(WIN.x + 236 + px, WIN.y + 86 + py, 17, 0, TAU); g.fill();
    }
    /* roofs across the way */
    const roof = T.mix(top, '#161d2c', 0.62);
    const lit = T.rampNum(LAMP_K, tod);
    for (const b of S.roofs) {
      g.fillStyle = roof;
      g.fillRect(b.x + px, WIN.y + WIN.h - b.h + py, b.w + 1, b.h + 40);
      if (lit > 0.3) for (const l of b.lights) {
        g.fillStyle = T.rgba('#ffd592', l[2] * lit);
        g.fillRect(b.x + px + l[0], WIN.y + WIN.h - b.h + py + l[1], 7, 9);
      }
    }
    /* the tree */
    const bark = T.mix(top, '#141a26', 0.72);
    const [tx, ty] = T.par(0.55);
    g.strokeStyle = bark; g.lineCap = 'round'; g.lineJoin = 'round';
    for (const s of S.tree) {
      g.lineWidth = s.w;
      g.beginPath();
      s.pts.forEach((p, i) => (i ? g.lineTo(p[0] + tx, p[1] + ty) : g.moveTo(p[0] + tx, p[1] + ty)));
      g.stroke();
    }
    /* leaves still on the branch; they let go one by one as the night passes */
    const left = T.rampNum(LEAVES_LEFT, tod);
    const lightK = 0.45 + 0.55 * (1 - T.clamp(T.rampNum(LAMP_K, tod)));
    S.held.forEach((l, i) => {
      const a = T.clamp(left - i);
      if (a <= 0) return;
      let lx = l.x + tx, ly = l.y + ty, rot = Math.sin(T.time * 1.1 + l.seed) * 0.25 + 0.6;
      if (i === 0 && S.lastLeaf.fall > 0) {
        const f = S.lastLeaf.fall;
        ly += f * f * 330; lx += Math.sin(f * 9) * 26 + f * 30; rot += f * 7;
      }
      leaf(g, lx, ly, 9, rot, T.mix(l.c, bark, 1 - lightK), a);
    });
    /* leaves coming down outside */
    const fallK = 0.25 + 0.75 * lightK;
    for (const l of S.leaves) leaf(g, l.x + px, l.y + py, l.s, l.ph * 1.7, T.mix(l.c, bark, 1 - lightK), 0.85 * fallK);
    /* glass: a pale reflection */
    const gl = g.createLinearGradient(WIN.x, WIN.y, WIN.x + WIN.w, WIN.y + WIN.h);
    gl.addColorStop(0, 'rgba(255,255,255,0.10)'); gl.addColorStop(0.4, 'rgba(255,255,255,0.0)'); gl.addColorStop(1, 'rgba(255,255,255,0.05)');
    g.fillStyle = gl; g.fillRect(WIN.x - 60, WIN.y - 40, WIN.w + 120, WIN.h + 80);
    g.restore();
  }
  function leaf(g, x, y, s, rot, color, a) {
    g.save(); g.translate(x, y); g.rotate(rot); g.globalAlpha = a; g.fillStyle = color;
    g.beginPath(); g.moveTo(-s, 0); g.quadraticCurveTo(0, -s * 0.75, s, 0); g.quadraticCurveTo(0, s * 0.75, -s, 0); g.fill();
    g.restore();
  }

  function drawCurtain(g, tod, ox, oy) {
    const amb = T.ramp(AMBIENT, tod), sky = T.ramp(SKY_MID, tod);
    const base = T.mix(T.mix('#efe9da', amb, 0.55), sky, 0.22);
    const x0 = WIN.x - 104 + ox, x1 = WIN.x + 14 + ox, yT = WIN.y - 36 + oy, yB = WIN.y + WIN.h + 62 + oy;
    const t = T.time;
    const pts = [[x0, yT], [x1 + 8, yT]];
    for (let i = 1; i <= 8; i++) {
      const k = i / 8;
      pts.push([x1 + Math.sin(t * 0.55 + k * 3.1) * 7 * k + Math.sin(k * 9) * 5 - k * 14, yT + (yB - yT) * k]);
    }
    for (let i = 8; i >= 1; i--) {
      const k = i / 8;
      pts.push([x0 + Math.sin(t * 0.4 + k * 2) * 3 * k + k * 8, yT + (yB - yT) * k]);
    }
    const path = P.poly(pts);
    g.save();
    g.globalAlpha = 0.93; g.fillStyle = base; g.fill(path);
    g.clip(path);
    for (let i = 0; i < 6; i++) {
      const fx = x0 + 10 + i * 19 + Math.sin(t * 0.5 + i) * 2.5;
      const gr = g.createLinearGradient(fx - 9, 0, fx + 9, 0);
      gr.addColorStop(0, 'rgba(40,50,70,0)'); gr.addColorStop(0.5, 'rgba(40,50,70,0.17)'); gr.addColorStop(1, 'rgba(40,50,70,0)');
      g.fillStyle = gr; g.fillRect(fx - 9, yT, 18, yB - yT);
    }
    const lit = g.createLinearGradient(x0, 0, x1, 0);
    lit.addColorStop(0, 'rgba(255,255,255,0)'); lit.addColorStop(1, T.rgba(T.ramp(SKY_LOW, tod), 0.33));
    g.fillStyle = lit; g.fillRect(x0 - 10, yT, x1 - x0 + 30, yB - yT);
    g.restore();
  }

  function drawLamp(g, k) {
    /* on the cabinet, by the photo */
    P.fill(g, P.rr(473, 568, 26, 28, 6), '#8f8672');
    P.line(g, 486, 568, 486, 538, 4.5, '#8f8672');
    P.fill(g, P.poly([[462, 544], [510, 544], [500, 494], [472, 494]]), T.mix('#c9bfa6', '#ffe9b8', k));
  }
  function drawPhoto(g) {
    g.save();
    g.translate(428, 552); g.rotate(-0.06);
    P.fill(g, P.rr(-31, -42, 62, 86, 4), '#8a6846');
    P.fill(g, P.rr(-25, -36, 50, 74, 2), '#efe6d2');
    photoFace(g, 0.54);
    g.restore();
  }
  /* the picture itself: the two of them on the step of the first flat, moving day */
  function photoFace(g, s) {
    g.save(); g.scale(s, s);
    P.fill(g, P.rr(-44, -62, 88, 124, 2), '#c4b08a');
    P.fill(g, P.rr(-44, 28, 88, 34, 0), '#8f8168');
    P.fill(g, P.rr(-30, -44, 34, 72, 2), '#6f5b48');   /* door */
    P.fill(g, P.rr(16, -30, 22, 24, 2), '#e8d9a8');   /* lit window */
    P.fill(g, P.rr(14, 6, 26, 22, 2), '#b99466');     /* a box */
    F.person(g, { x: -12, y: 4, s: 56, style: F.styles.leo, face: { blush: 0 } });
    F.person(g, { x: 6, y: 6, s: 52, style: F.styles.ana, flip: true, face: { blush: 0 } });
    g.fillStyle = 'rgba(120,80,40,0.16)'; g.fillRect(-44, -62, 88, 124);
    g.restore();
  }

  function drawLeash(g, glow) {
    /* looped over the chair back: Bean's red lead */
    const sway = Math.sin(T.time * 0.9) * 2.5;
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = '#c4523f'; g.lineWidth = 5;
    g.beginPath();
    g.moveTo(-56, 566); g.bezierCurveTo(-74, 600, -60 + sway, 640, -44 + sway, 660);
    g.moveTo(-44, 562); g.bezierCurveTo(-24, 596, -30 + sway, 632, -44 + sway, 660);
    g.stroke();
    g.beginPath(); g.moveTo(-44 + sway, 660); g.quadraticCurveTo(-40 + sway * 1.4, 676, -34 + sway * 1.6, 688); g.stroke();
    g.strokeStyle = '#d9c27a'; g.lineWidth = 3;
    g.beginPath(); g.ellipse(-32 + sway * 1.7, 694, 5, 7, 0.3, 0, TAU); g.stroke();
  }

  function drawNotebook(g) {
    g.save();
    g.translate(64, 542); g.rotate(-0.44);
    P.fill(g, P.rr(-41, -27, 82, 56, 5), '#b8862c');
    P.fill(g, P.rr(-38, -30, 78, 54, 4), '#f6f0e0');
    P.fill(g, P.rr(-40, -32, 80, 54, 5), '#d7a23c');
    P.fill(g, P.rr(-40, -32, 12, 54, 4), '#b8862c');
    P.fill(g, P.rr(14, -32, 5, 54, 1), '#c9573f');
    P.fill(g, P.rr(-20, -18, 40, 15, 2), '#f3ead8');
    g.restore();
  }

  /* by morning the notebook is shut and under his hand: she will find it later */
  function drawNotebookShut(g) {
    g.save();
    g.translate(146, 598); g.rotate(-0.1);
    P.fill(g, P.rr(-38, -3, 76, 7, 2), '#b8862c');
    P.fill(g, P.rr(-35, -9, 72, 7, 2), '#f6f0e0');
    P.fill(g, P.rr(-38, -14, 76, 6, 3), '#d7a23c');
    P.fill(g, P.rr(14, -14, 5, 18, 1), '#c9573f');
    g.restore();
  }

  function drawLeo(g) {
    const t = T.time, st = T.state;
    const final = S.mode === 'final' || S.mode === 'hold';
    const breath = Math.sin(t * 1.25) * 0.012;
    const lean = -0.7 + breath + S.leo.reach * 0.2;
    const o = { x: LEO.x - S.leo.reach * 6, y: LEO.y, s: LEO.s, style: F.styles.leoBed, flip: true, noLegs: true, lean, face: { blush: 0.12 } };
    if (!final) {
      /* writing: the hand makes small marks; now and then he looks up at the window */
      const up = T.smooth(T.clamp(Math.sin(t * 0.21) * 4 - 2.6));
      const sel = S.sel;
      let tilt = 0.52 - up * 0.42;
      if (sel === 'drawing') tilt = -0.12; else if (sel === 'photo') tilt = 0.1;
      S.leoTilt = T.lerp(S.leoTilt == null ? tilt : S.leoTilt, tilt, 0.05);
      o.headTilt = S.leoTilt;
      const wx = 84 + Math.sin(t * 5.1) * 3 * (1 - up) + Math.sin(t * 0.6) * 6, wy = 548 + Math.cos(t * 6.3) * 2 * (1 - up);
      o.armF = { hand: F.local(o, wx, wy) };
      o.armB = { hand: F.local(o, 40, 520) };
      const j = F.person(g, o);
      /* pen */
      P.line(g, j.handF[0] - 3, j.handF[1] + 5, j.handF[0] - 15, j.handF[1] - 22, 3.2, '#2f3b52');
    } else {
      const look = S.leo.look, reach = S.leo.reach;
      o.headTilt = 0.34 - look * 0.14 + reach * 0.26 + Math.sin(t * 7) * 0.012 * S.leo.speak;
      const rest = [120, 590];
      const hx = T.lerp(rest[0], LILY_HAND[0] + 5, T.ease.io(reach)), hy = T.lerp(rest[1], LILY_HAND[1] - 4, T.ease.io(reach)) - Math.sin(reach * Math.PI) * 22;
      o.armF = { hand: F.local(o, hx, hy) };
      o.armB = { hand: F.local(o, 140, 586) };
      o.face.eye = reach > 0.6 ? 'closed' : 'open';
      o.face.mouth = 'smile';
      o.skip = { armF: true };
      F.person(g, o);
      S.leoPose = o;
    }
  }

  function drawFamily(g) {
    const t = T.time, a = S.fam.a;
    if (a <= 0.01) return;
    const cry = S.ana.cry, joy = S.ana.joy;
    const shake = Math.sin(t * 17) * 1.6 * cry + Math.sin(t * 11) * 1.4 * joy * (0.5 + 0.5 * Math.sin(t * 1.7));
    const ana = {
      x: ANA.x + shake * 0.5, y: ANA.y, s: ANA.s, style: F.styles.ana, sit: true,
      lean: 0.06 + cry * 0.2 - joy * 0.03, headTilt: 0.02 + cry * 0.5 - joy * 0.16,
      face: { eye: cry > 0.3 ? 'closed' : joy > 0.5 ? 'happy' : 'open', mouth: joy > 0.4 ? 'smile' : cry > 0.3 ? 'line' : null, tear: Math.max(cry, joy * 0.7) * 0.9, tearY: (t * 3) % 3, blush: 0.2 + joy * 0.2 },
      skip: { armF: true },
    };
    const breathe = Math.sin(t * 1.0) * 0.012;
    const lily = {
      x: LILY.x + shake * 0.3, y: LILY.y, s: LILY.s, style: F.styles.lily, sit: true,
      lean: -0.6 + breathe, headTilt: -0.2, headRot: -0.1,
      legF: { a: Math.PI / 2 - 0.25, b: Math.PI / 2 - 0.05 }, legB: { a: Math.PI / 2 - 0.36, b: Math.PI / 2 + 0.06 },
      face: { eye: 'closed', blush: 0.3 },
      armB: { a: 0.3, b: 0.4 },
    };
    lily.armF = { hand: F.local(lily, LILY_HAND[0], LILY_HAND[1]), bend: -1 };
    g.save();
    g.globalAlpha = a;
    const aj = F.person(g, ana);
    F.person(g, lily);
    /* her arm around the sleeping child; when she cries the hand comes up to her face */
    const hold = [LILY.x + 4, LILY.y - 26];
    const face = [aj.head[0] + 26, aj.head[1] + 16];
    const k = T.ease.io(cry);
    ana.only = 'armF'; ana.skip = null;
    ana.armF = { hand: F.local(ana, T.lerp(hold[0], face[0], k), T.lerp(hold[1], face[1], k)), bend: k > 0.5 ? -1 : 1 };
    F.person(g, ana);
    g.restore();
  }
  function drawLeoArm(g) {
    if (!S.leoPose) return;
    const o = Object.assign({}, S.leoPose, { only: 'armF', skip: null });
    F.person(g, o);
  }

  function lighting(g, tod, bx, by) {
    const V = T.view, W = V.W;
    const amb = T.ramp(AMBIENT, tod);
    const lk = T.rampNum(LAMP_K, tod);
    const [dx, dy] = T.par(0.2);
    const lx = 486 + dx, ly = 520 + dy;
    /* ambient: multiply everything but the glass; the dark is thinner round the lamp */
    g.save();
    g.globalCompositeOperation = 'multiply';
    const pool = g.createRadialGradient(lx, ly, 16, lx, ly, 600);
    pool.addColorStop(0, T.mix(amb, '#fff0d2', 0.96 * lk));
    pool.addColorStop(0.22, T.mix(amb, '#ffd6a0', 0.7 * lk));
    pool.addColorStop(0.6, T.mix(amb, '#e9b890', 0.22 * lk));
    pool.addColorStop(1, amb);
    g.fillStyle = pool;
    g.beginPath();
    g.rect(-W / 2 - 60, -40, W + 120, 1000);
    g.rect(WIN.x + bx, WIN.y + by, WIN.w, WIN.h);
    g.fill('evenodd');
    g.restore();
    /* the shaft from the window */
    const bk = T.rampNum(BEAM_K, tod), bc = T.ramp(BEAM, tod);
    if (bk > 0.01) {
      const shaft = () => {
        g.beginPath();
        g.moveTo(WIN.x + bx, WIN.y + by); g.lineTo(WIN.x + WIN.w + bx, WIN.y + by);
        g.lineTo(WIN.x + WIN.w + 600, 940); g.lineTo(WIN.x + 190, 940);
        g.closePath(); g.fill();
      };
      const grad = (a0, a1) => {
        const gr = g.createLinearGradient(WIN.x, WIN.y, WIN.x + 600, WIN.y + 780);
        gr.addColorStop(0, T.rgba(bc, a0)); gr.addColorStop(0.55, T.rgba(bc, a1)); gr.addColorStop(1, T.rgba(bc, 0));
        return gr;
      };
      g.save();
      g.globalCompositeOperation = 'overlay';
      g.fillStyle = grad(0.7 * bk, 0.4 * bk); shaft();
      g.globalCompositeOperation = 'screen';
      g.fillStyle = grad(0.3 * bk, 0.13 * bk); shaft();
      /* where it lands on the floor */
      const fl = g.createLinearGradient(0, 716, 0, 900);
      fl.addColorStop(0, T.rgba(bc, 0.42 * bk)); fl.addColorStop(1, T.rgba(bc, 0.1 * bk));
      g.fillStyle = fl;
      g.beginPath(); g.moveTo(-430, 722); g.lineTo(-150, 722); g.lineTo(60, 900); g.lineTo(-300, 900); g.closePath(); g.fill();
      g.restore();
      P.glow(g, WIN.x + WIN.w / 2 + bx, WIN.y + WIN.h / 2 + by, 420, bc, 0.22 * bk);
    }
    if (lk > 0.01) P.glow(g, lx, ly, 120, '#ffd9a0', 0.4 * lk);
  }

  function drawMotes(g, tod) {
    const k = T.clamp((tod - 4) / 1) * 0.9 + T.clamp(1 - tod) * 0.25;
    if (k <= 0.02) return;
    g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = '#fff3cf';
    for (const m of S.motes) {
      const x = m.x + Math.sin(T.time * 0.2 + m.ph) * 26, y = m.y + Math.cos(T.time * 0.13 + m.ph * 1.7) * 30;
      /* only inside the shaft */
      const u = (x - (WIN.x + (y - WIN.y) * 0.55)) / (WIN.w + (y - WIN.y) * 0.28);
      if (u < 0 || u > 1) continue;
      g.globalAlpha = k * (0.25 + 0.5 * Math.abs(Math.sin(T.time * 0.5 + m.ph))) * Math.sin(u * Math.PI);
      g.beginPath(); g.arc(x, y, m.s, 0, TAU); g.fill();
    }
    g.restore();
  }

  function drawCard(g) {
    const c = S.card;
    if (c.a <= 0.003) return;
    const V = T.view;
    g.save();
    g.fillStyle = T.rgba('#10151f', 0.6 * c.a);
    g.fillRect(-V.W / 2, 0, V.W, V.H);
    const k = T.ease.out3(T.clamp(c.a));
    const [dx, dy] = T.par(0.2);
    const cx = T.lerp(428 + dx, 0, k), cy = T.lerp(552 + dy, 440, k), sc = T.lerp(0.2, 1, k);
    const flip = Math.cos(c.flip * Math.PI);
    g.translate(cx, cy + Math.sin(T.time * 0.8) * 4 * k);
    g.rotate(T.lerp(-0.06, -0.025, k));
    g.scale(sc * Math.max(0.02, Math.abs(flip)), sc);
    g.globalAlpha = T.clamp(c.a * 3);
    g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 50; g.shadowOffsetY = 18;
    P.fill(g, P.rr(-190, -250, 380, 500, 6), '#f4ecda');
    g.shadowColor = 'transparent';
    if (flip > 0) {
      g.save(); g.translate(0, -18); photoFace(g, 3.5); g.restore();
      P.tint(g, P.rr(-154, -235, 308, 434, 2), -154, -235, 154, 199, [[0, 'rgba(255,255,255,0.22)'], [0.5, 'rgba(255,255,255,0)'], [1, 'rgba(60,40,20,0.2)']]);
    } else {
      /* the back: foxed paper, her handwriting */
      P.wash(g, P.rr(-190, -250, 380, 500, 6), '#efe5cf', [-190, -250, 380, 500], { seed: 91, n: 26, tone: 0.035, len: 200, wid: 40 });
      g.strokeStyle = 'rgba(120,96,70,0.18)'; g.lineWidth = 1.5;
      g.strokeRect(-166, -226, 332, 452);
      P.text(g, '우리,\n같이 늙자.', 0, -20, { size: 96, color: '#b54a36', k: c.write, seed: 4, lh: 1.25 });
      const sig = T.clamp(c.write * 3 - 2);
      if (sig > 0) { g.save(); g.globalAlpha *= 0.85; P.strokePts(g, P.trim([[36, 156], [58, 153], [84, 155]], T.clamp(sig * 2)), 2.6, '#b54a36', true); g.restore(); }
      P.text(g, '아나', 124, 168, { size: 46, color: '#b54a36', k: T.clamp(sig * 2 - 0.6), seed: 6, alpha: 0.85 });
    }
    g.restore();
    if (c.ready) T.continueDot(g, 0, 790, '#f3ead8');
  }
  /* The room as a picture for the mirror lake, forty-five years on: someone else in the bed,
     someone else in the chair. o: { tod, inBed(g), atChair(g) } */
  S.paintStill = function (g, o) {
    const tod = o.tod == null ? 5 : o.tod;
    seedAir();
    g.fillStyle = '#cfd4ca'; g.fillRect(-1100, -40, 2200, 1000);
    drawOutside(g, tod, 0, 0);
    T.blit(g, S.L.back);
    T.blit(g, S.L.bed);
    if (o.inBed) o.inBed(g);
    T.blit(g, S.L.blanketFlat);
    T.blit(g, S.L.cab);
    drawLamp(g, T.rampNum(LAMP_K, tod));
    T.blit(g, S.L.chair);
    if (o.atChair) o.atChair(g);
    lighting(g, tod, 0, 0);
    drawCurtain(g, tod, 0, 0);
  };
  S.SPOTS = { LEO, ANA, LILY, LILY_HAND };

  function drawTitle(g) {
    const V = T.view, W = V.W, a = S.title.a;
    g.fillStyle = T.rgba('#0f1522', 0.72 * a); g.fillRect(-W / 2, 0, W, V.H);
    const ta = T.clamp(a * 1.6 - 0.6);
    P.text(g, 'TAKE YOUR TIME', 0, 318, { font: 'serif', size: 25, track: 11, color: '#e9dcc0', alpha: 0.85 * ta });
    P.text(g, '천천히 와', 0, 470, { size: 178, color: '#f7eeda', alpha: ta, seed: 2, glow: 'rgba(255,214,150,0.35)' });
    if (!S.title.leaving) {
      const p = 0.55 + 0.45 * Math.sin(T.time * 2.2);
      P.text(g, '화면을 눌러 시작', 0, 742, { font: 'serif', size: 26, color: '#f3ead8', alpha: p * ta });
      P.text(g, '소리를 켜면 더 좋아요', 0, 782, { font: 'serif', size: 19, color: '#c9cfdb', alpha: 0.7 * ta });
      /* a trial: Welcome Harbor drawn in crayon */
      P.text(g, P.look === 'crayon' ? '그림체 시안: 크레용 (눌러서 끄기)' : '그림체 시안: 꺼짐 (눌러서 크레용으로)', 0, 86, { font: 'serif', size: 19, color: '#e9dcc0', alpha: 0.7 * ta });
      /* a quiet way straight to any chapter */
      P.text(g, '장 바로 가기', 0, 814, { font: 'serif', size: 15, track: 6, color: '#c9cfdb', alpha: 0.55 * ta });
      CHAPTERS.forEach((c, i) => {
        const x = chapterX(i), on = S.title.hover === i;
        P.text(g, c[0], x, 850, { font: 'serif', size: 21, color: on ? '#fff3d6' : '#e9dcc0', alpha: (on ? 1 : 0.78) * ta });
        if (on) { g.fillStyle = T.rgba('#fff3d6', 0.6 * ta); g.fillRect(x - 22, 861, 44, 1.2); }
      });
    }
  }

  S.draw = function (g) {
    const V = T.view, W = V.W, tod = S.tod, st = T.state;
    const final = S.mode === 'final' || S.mode === 'hold';
    const [bx, by] = T.par(0.34), [dx, dy] = T.par(0.2), [fx, fy] = T.par(-0.55);
    g.save();
    /* push in towards the touched thing */
    const z = 1 + T.ease.io(S.zoom.k) * 0.22 + S.hold.k * 0.06;
    const zx = final ? LILY_HAND[0] : S.zoom.x * 0.55, zy = final ? LILY_HAND[1] : 450 + (S.zoom.y - 450) * 0.55;
    g.translate(zx, zy); g.scale(z, z); g.translate(-zx, -zy);

    g.fillStyle = '#cfd4ca'; g.fillRect(-W / 2 - 60, -40, W + 120, 1000);
    drawOutside(g, tod, bx, by);
    T.blit(g, S.L.back, bx, by);

    g.save(); g.translate(dx, dy);
    T.blit(g, S.L.bed);
    drawLeo(g);
    T.blit(g, final ? S.L.blanketFlat : S.L.blanketUp);
    if (!final) drawNotebook(g); else drawNotebookShut(g);
    T.blit(g, S.L.cab);
    drawLamp(g, T.rampNum(LAMP_K, tod));
    drawPhoto(g);
    T.blit(g, S.L.chair);
    drawLeash(g);
    if (final) { drawFamily(g); drawLeoArm(g); }
    g.restore();

    lighting(g, tod, bx, by);
    drawCurtain(g, tod, bx, by);
    drawMotes(g, tod);

    /* emissive bits after the light pass */
    const lk = T.rampNum(LAMP_K, tod);
    if (lk > 0.02) P.glow(g, 486 + dx, 520 + dy, 50, '#fff0c8', 0.9 * lk);

    /* invitations to touch */
    if (S.mode === 'hub') {
      const open = openSpots();
      open.forEach((id, i) => {
        const sp = SPOT[id];
        const ox = id === 'drawing' ? bx : dx, oy = id === 'drawing' ? by : dy;
        const a = S.sel ? (S.sel === id ? 1 : 0.15) : 1;
        P.beacon(g, sp.x + ox, sp.y + oy, sp.r, T.time + i * 0.9, a * (1 - S.card.a), allDone() ? '#ffd9c2' : '#ffe2a8');
        if (S.kbShow && open[S.kb % open.length] === id && !S.sel) {
          g.strokeStyle = 'rgba(255,240,200,0.9)'; g.lineWidth = 2.5;
          g.beginPath(); g.arc(sp.x + ox, sp.y + oy, sp.r + 10, 0, TAU); g.stroke();
        }
      });
    } else if (S.mode === 'hold' && !S.hold.on) {
      P.beacon(g, LILY_HAND[0] + dx, LILY_HAND[1] + dy, 44, T.time, 1, '#fff0cf');
    }
    if (S.hold.k > 0) P.glow(g, LILY_HAND[0] + dx, LILY_HAND[1] + dy, 120 + S.hold.k * 900, '#fff6e0', 0.2 + S.hold.k * 0.8);

    T.blit(g, S.L.front, fx, 0);
    g.restore();

    if (S.hintA > 0.01) {
      const text = S.mode === 'hold' ? '릴리의 손을 잡아 주세요' : '빛나는 것을 만져 보세요';
      const gr = g.createLinearGradient(0, 760, 0, 900);
      gr.addColorStop(0, 'rgba(14,20,32,0)'); gr.addColorStop(1, T.rgba('#0e1420', 0.5 * S.hintA));
      g.fillStyle = gr; g.fillRect(-W / 2, 760, W, 140);
      P.text(g, text, 0, 850, { font: 'serif', size: 26, color: '#f3ead8', alpha: 0.9 * S.hintA });
    }
    TALK.draw(g);
    drawCard(g);
    if (S.title.a > 0.003) drawTitle(g);
    if (S.dip.a > 0.003) { g.fillStyle = T.rgba('#fff6e2', S.dip.a); g.fillRect(-W / 2, 0, W, V.H); }
  };
})();
