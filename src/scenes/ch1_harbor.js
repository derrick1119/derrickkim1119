/* Chapter 1 「항구」 — arrival. One long walk, left to right and always upward:
   across the sea of cloud, onto the quay and into Mom's arms, up through a town where
   everyone is building for someone, into the house she kept ready, and on to the empty
   plot at the top of the hill. The camera follows; what the hand does is light the lamps:
   the ones standing out in the cloud sea, the one at each turning of the road, and his own. */
(function () {
  'use strict';
  const T = window.TYT, P = T.P, F = T.F, K = T.town;
  const TAU = Math.PI * 2;

  /* ---------- the lie of the land (world units; y grows downward) ---------- */
  const SEA = 652, PIER_Y = 640, QUAY = 520;
  const J1 = 1760, J2 = 2560;
  const gardenOn = () => T.gardenOn && T.director.cur !== T.scenes.harbor;   /* chapters 3 on: the tomato rack on the slope */
  const SEA_LAMP = -300;                           /* the lamp that stands off the end of the pier */
  const HOUSE = 3185, DOOR = 3085, STOP = 3800, PLOT = 4060;
  const K1 = [[520, 640], [900, 630], [1400, 606], [1760, 590], [1960, 650], [2200, 900], [2600, 1500], [7000, 1500]];
  const K2 = [[-4000, 900], [-60, 880], [60, 760], [360, 560], [760, 478], [1300, 446], [1760, 428], [2200, 410], [2560, 396], [2860, 470], [3100, 760], [3400, 1300], [7000, 1300]];
  const K3 = [[-4000, 900], [240, 860], [500, 560], [1000, 360], [1700, 290], [2200, 250], [2560, 214], [3020, 172], [3340, 166], [3600, 110], [3860, 24], [4260, 16], [4600, 130], [5100, 520], [7000, 900]];
  function interp(k, x) {
    if (x <= k[0][0]) return k[0][1];
    for (let i = 1; i < k.length; i++) {
      if (x <= k[i][0]) { const u = (x - k[i - 1][0]) / (k[i][0] - k[i - 1][0]); return k[i - 1][1] + (k[i][1] - k[i - 1][1]) * (1 - Math.cos(u * Math.PI)) / 2; }
    }
    return k[k.length - 1][1];
  }
  const bump = (x, c, w) => Math.exp(-((x - c) / w) * ((x - c) / w));
  const LEO_S = 150, MOM_S = 132;

  const S = (T.scenes.harbor = {
    spr: {}, ph: 'sail', cam: { x: 0, y: 450, z: 1 }, camK: 2.2,
    boat: { x: -1500 }, lamps: [], tolls: 0, bell: { k: 0 },
    wx: 0, nx: 0, wph: 0, nph: 0, moving: false, nmoving: false,
    d2: 0, d3: 0, a2: 0, a3: 0, join1: false, join2: false, snap: { k: 0, x: 0, y: 0 }, gate: [null, { k: 0 }, { k: 0 }], r2: 0, r3: 0,
    leo: {}, mom: {}, hug: { k: 0 }, cup: { k: 0 }, arms: { k: 0 }, lampDown: false,
    drag: null, idle: 0, noteI: 0,
    home: { open: 0 }, st: null, eat: { k: 0 }, ghost: { a: 0 }, ladle: { k: 0 }, marks: { n: 0, fresh: 0 }, stool: { k: 0 }, sweater: { a: 1, lift: 0 }, clap: { k: 0 },
    point: { k: 0 }, lamp: { planted: 0 }, rest: { k: 0 }, fare: { k: 0, touch: 0, rise: 0, orb: 0 }, momTo: null, momGone: false, dusk: 0,
    title: { a: 0 }, place: { a: 0 }, end: { a: 0 }, canLeave: false, hintA: { a: 0 },
    bram: { wave: 0, near: false }, post: { x: 2000, on: false, rang: false }, rosa: { k: 0, done: false }, kidWave: { k: 0 },
    things: { 1: [], 2: [], 3: [] }, banks: null,
  });
  const TALK = T.talk(S);
  S.TALK = TALK;

  const y1 = (x) => interp(K1, x);
  const y2 = (x) => interp(K2, x) + S.d2 * bump(x, J1, 230);
  const y3 = (x) => interp(K3, x) + S.d3 * bump(x, J2, 250);
  const hillOf = (x) => (x < J1 || !S.join1 ? 1 : x < J2 || !S.join2 ? 2 : 3);
  const groundAt = (x) => { if (x < QUAY) return PIER_Y; const h = hillOf(x); return h === 1 ? y1(x) : h === 2 ? y2(x) : y3(x); };
  const surf = (x) => SEA - Math.sin(x * 0.013 + T.time * 0.8) * 4;
  const HG = () => y3(HOUSE) + 2;                  /* Mom's doorstep */
  const UF = () => HG() - 186;                      /* her upstairs floor */
  /* her house is drawn a size up around its doorstep, so that people inside have room over their heads; the
     people keep their own size. Positions inside are in the house's own (unscaled) units: hs() maps them out */
  const HK = 1.18;
  const hs = (x, y) => [HOUSE + (x - HOUSE) * HK, HG() + (y - HG()) * HK];
  const toScreen = (wx, wy) => [(wx - S.cam.x) * S.cam.z, 450 + (wy - S.cam.y) * S.cam.z];
  const toWorld = (X, Y) => [X / S.cam.z + S.cam.x, (Y - 450) / S.cam.z + S.cam.y];
  S.toScreen = toScreen;

  /* ---------- build: bake the town ---------- */
  const C = { terra: '#c8623f', teal: '#3f7f86', must: '#d7a23c', plum: '#8a5578', slate: '#5d6f8a', rose: '#d98a8f' };
  S.build = function () {
    if (S.builtGen === T.gen && S.spr.mom) return;   /* baked art is good until the canvas changes size */
    S.builtGen = T.gen;
    const H = K.house, sp = (S.spr = {});
    sp.shed = H({ w: 150, h: 112, roofH: 62, roof: 'hip', wall: '#e9dcc0', roofC: C.teal, door: { x: -30, c: '#6b5a48' }, win: [[22, -84, 40, 44, 0]], seed: 11 });
    sp.post = H({ w: 176, h: 156, roofH: 84, roof: 'gable', wall: '#f6e9cc', roofC: C.terra, door: { x: -44, c: C.slate }, win: [[14, -116, 50, 58, 1, true]], sign: 'envelope', signX: 84, chim: 40, seed: 21 });
    sp.build1 = H({ w: 190, h: 152, roofH: 86, roof: 'gable', roofC: C.must, stage: 0.42, seed: 31 });
    sp.small = H({ w: 150, h: 138, roofH: 78, roof: 'hip', wall: '#f3e1c4', roofC: C.plum, door: { x: 36, c: C.terra }, win: [[-52, -106, 44, 52, 1, true]], chim: -30, seed: 41 });
    sp.t1 = H({ w: 140, h: 120, roofH: 70, roof: 'gable', wall: '#f6e9cc', roofC: C.slate, door: { x: -30, c: C.must }, win: [[14, -92, 40, 46, 1]], seed: 51 });
    sp.t2 = H({ w: 170, h: 130, roofH: 76, roof: 'hip', roofC: C.rose, stage: 0.7, seed: 61 });
    sp.t3 = H({ w: 150, h: 124, roofH: 72, roof: 'gable', wall: '#efe0c8', roofC: C.teal, door: { x: 30, c: C.plum }, win: [[-50, -96, 42, 48, 1, true]], chim: 30, seed: 71 });
    sp.rosa = H({ w: 210, h: 160, roofH: 88, roof: 'gable', wall: '#f8eccf', roofC: C.must, door: { x: -66, c: C.rose }, chim: -50, seed: 81 });
    sp.frame = H({ w: 180, h: 150, roofH: 84, roof: 'gable', roofC: C.terra, stage: 0.2, seed: 91 });
    sp.far1 = H({ w: 110, h: 90, roofH: 56, roof: 'gable', wall: '#f3e6cc', roofC: C.plum, win: [[-16, -66, 32, 36, 1]], seed: 101 }, 1);
    sp.far2 = H({ w: 120, h: 84, roofH: 52, roof: 'hip', wall: '#f3e6cc', roofC: C.terra, win: [[-40, -62, 30, 34, 1], [14, -62, 30, 34, 1]], seed: 111 }, 1);
    sp.far3 = H({ w: 104, h: 86, roofH: 56, roof: 'gable', roofC: C.teal, stage: 0.5, seed: 121 }, 1);
    sp.mom = H({ w: 300, h: 276, roofH: 156, roof: 'gable', wall: '#f8eed6', roofC: C.plum, door: { x: -100, c: C.teal }, win: [[20, -150, 54, 60, 1, true], [-34, -150, 0, 0, 0]].slice(0, 1), round: [0, -338], chim: 92, roses: true, seed: 131 }, 1.7);
    sp.slip = K.slip();
    sp.inside = T.bake(-190, -470, 380, 500, paintInside, 1.8);

    S.things = {
      1: [
        { x: 650, k: 'spr', s: 'shed' }, { x: 900, k: 'slip' }, { x: 1212, k: 'spr', s: 'post' }, { x: 1322, k: 'box' },
        { x: 1458, k: 'spr', s: 'build1' }, { x: 1458, k: 'builder' }, { x: 1648, k: 'spr', s: 'small' },
        { x: 572, k: 'lamp' }, { x: 1076, k: 'lamp' }, { x: 1348, k: 'lamp' }, { x: 1520, k: 'lamp' },   /* 1520: clear of build1's ladder; none at the gate, which has its own lantern */
        { x: 1384, k: 'tree', c: '#3f8076', s: 1 }, { x: 1576, k: 'tree', c: '#e0a94a', s: 0.9 },
        { x: J1 - 26, k: 'gate', n: 1 },
      ],
      2: [
        { x: 520, k: 'spr', s: 't1' }, { x: 1010, k: 'spr', s: 't2' }, { x: 1330, k: 'spr', s: 't3' },
        { x: 700, k: 'tree', c: '#3f8076', s: 0.8 }, { x: 1180, k: 'tree', c: '#e0a94a', s: 0.9 }, { x: 1500, k: 'tree', c: '#4f8f7a', s: 1 },
        { x: 2070, k: 'spr', s: 'rosa' }, { x: 2070, k: 'rosa' }, { x: 2340, k: 'spr', s: 'frame' }, { x: 2340, k: 'sitter' },
        { x: 1962, k: 'lamp' }, { x: 2190, k: 'lamp' },   /* none by the frame's ladder */
        { x: 1920, k: 'tree', c: '#e0a94a', s: 1 }, { x: 2228, k: 'tree', c: '#3f8076', s: 0.9 }, { x: 2700, k: 'tree', c: '#4f8f7a', s: 1.1 },
        { x: J2 - 26, k: 'gate', n: 2 },
      ],
      3: [
        { x: 1080, k: 'spr', s: 'far1' }, { x: 1420, k: 'spr', s: 'far3' }, { x: 1830, k: 'spr', s: 'far2' }, { x: 2280, k: 'spr', s: 'far1' },
        { x: 1240, k: 'tree', c: '#4f8f7a', s: 0.7 }, { x: 1650, k: 'tree', c: '#e0a94a', s: 0.7 }, { x: 2060, k: 'tree', c: '#3f8076', s: 0.8 },
        { x: 1150, k: 'lamp', s: 0.8 }, { x: 1900, k: 'lamp', s: 0.8 }, { x: 2350, k: 'lamp', s: 0.8 },
        { x: 2800, k: 'tree', c: '#3f8076', s: 1.1 }, { x: 2930, k: 'tree', c: '#e0a94a', s: 0.9 }, { x: 2990, k: 'lamp' },
        { x: HOUSE, k: 'home' },
        { x: 3400, k: 'roses' }, { x: 3470, k: 'roses' }, { x: 3540, k: 'roses' }, { x: 3600, k: 'arch' },
        { x: 3690, k: 'tree', c: '#4f8f7a', s: 1.2 },
        { x: PLOT, k: 'plot' },
        { x: 4420, k: 'tree', c: '#3f8076', s: 1 },
      ],
    };
    if (!S.banks) {
      S.banks = {
        far: K.makeBank(604, 80, 46, 86, 3, -3000, 9000), mid: K.makeBank(676, 70, 60, 110, 5, -3000, 7000),
        near: K.makeBank(806, 120, 70, 112, 7, -3000, 9000), front: K.makeBank(930, 80, 110, 170, 9, -3000, 10000),
      };
      const r = T.rng(77);
      S.wisps = Array.from({ length: 9 }, () => ({ x: -900 + r() * 2600, y: 120 + r() * 250, w: 180 + r() * 260, s: 3 + r() * 5 }));
      S.isles = [{ x: 260, w: 300, h: 70 }, { x: 760, w: 220, h: 46 }, { x: 1180, w: 360, h: 88 }, { x: -260, w: 240, h: 52 }];
    }
  };

  /* Mom's house, cut open. Local space: door-step level is y = 0, the upstairs floor is y = -186. */
  function paintInside(g) {
    const shell = P.poly([[-152, 6], [-152, -272], [-170, -268], [0, -436], [170, -268], [152, -272], [152, 6]]);
    g.save(); g.shadowColor = 'rgba(255,200,120,0.45)'; g.shadowBlur = 34; P.fill(g, shell, '#efe2c6'); g.restore();
    /* downstairs: the kitchen */
    const down = P.box(-140, -178, 280, 178, 0.5, 1);
    P.wash(g, down, '#e7c98f', [-140, -178, 280, 178], { seed: 3, n: 16, tone: 0.05, dir: Math.PI / 2, len: 90, wid: 18 });
    P.tint(g, down, -140, 0, 140, 0, [[0, 'rgba(110,70,60,0.26)'], [0.5, 'rgba(110,70,60,0)'], [1, 'rgba(255,225,170,0.2)']]);
    P.fill(g, P.box(-140, -10, 280, 12, 0.5, 4), '#a8794c');
    /* window onto the evening */
    P.fill(g, P.box(-30, -156, 72, 70, 0.5, 5), '#fff4dc');
    const sky = g.createLinearGradient(0, -150, 0, -92); sky.addColorStop(0, '#9fb0dc'); sky.addColorStop(1, '#ffd9a0');
    g.fillStyle = sky; g.fillRect(-24, -150, 60, 58);
    g.fillStyle = '#fff4dc'; g.fillRect(4, -150, 3, 58);
    P.fill(g, P.poly([[-30, -160], [42, -160], [42, -142], [28, -134], [6, -142], [-14, -134], [-30, -142]]), '#c9573f');
    /* shelf, jars, a plant */
    P.fill(g, P.box(58, -138, 78, 6, 0.4, 6), '#9a6b43');
    [[62, 16, 26, '#c98a4b'], [82, 14, 20, '#a9443a'], [100, 18, 32, '#e9dcc3']].forEach((j) => { P.fill(g, P.rr(j[0], -138 - j[2], j[1], j[2], 4), j[3]); P.fill(g, P.rr(j[0] - 1, -138 - j[2] - 4, j[1] + 2, 5, 2), '#7f5534'); });
    P.fill(g, P.poly([[122, -138], [136, -138], [134, -152], [124, -152]]), '#b9532f');
    g.strokeStyle = '#5d8a57'; g.lineWidth = 3; g.lineCap = 'round';
    [[-6, -16], [0, -22], [7, -15]].forEach((d) => { g.beginPath(); g.moveTo(129, -152); g.lineTo(129 + d[0], -152 + d[1]); g.stroke(); });
    /* a child's drawing, framed */
    P.fill(g, P.box(-104, -146, 44, 36, 0.4, 7), '#8a6846'); P.fill(g, P.box(-100, -142, 36, 28, 0.3, 8), '#fbf7ec');
    P.crayon(g, [[-96, -120], [-88, -134], [-80, -120]], '#c9573f', 2.2, 3); P.crayon(g, [[-76, -118], [-70, -130]], '#3f7fc2', 2.2, 4);
    /* range: oven below, pot above */
    P.fill(g, P.box(92, -80, 48, 72, 0.5, 9), '#eee6d2');
    P.fill(g, P.rr(98, -58, 36, 34, 4), '#3a3032');
    const ov = g.createRadialGradient(116, -40, 2, 116, -40, 22); ov.addColorStop(0, 'rgba(255,190,100,0.95)'); ov.addColorStop(1, 'rgba(255,140,60,0.1)');
    g.fillStyle = ov; g.fillRect(100, -56, 32, 30);
    P.fill(g, P.ellipse(116, -36, 11, 6), '#c98a4b');
    P.fill(g, P.rr(90, -84, 52, 6, 2), '#3a4648');
    P.fill(g, P.rr(100, -104, 32, 20, 5), '#2d6672'); P.fill(g, P.rr(96, -106, 40, 5, 2), '#e9dcc3');
    /* table, stools, rug, knitting */
    P.fill(g, P.ellipse(4, -2, 82, 7), '#8a5578');
    P.fill(g, P.box(-46, -68, 100, 8, 0.4, 10), '#a8794c');
    P.line(g, -38, -60, -42, -8, 6, '#8a6442'); P.line(g, 46, -60, 50, -8, 6, '#8a6442');
    [-70, 80].forEach((x) => { P.fill(g, P.box(x - 14, -42, 28, 6, 0.4, 11), '#b98a5a'); P.line(g, x - 10, -36, x - 13, -8, 4, '#8a6442'); P.line(g, x + 10, -36, x + 13, -8, 4, '#8a6442'); });
    P.fill(g, P.poly([[-116, -8], [-88, -8], [-92, -24], [-112, -24]]), '#b98a5a');
    P.fill(g, P.circle(-104, -27, 9), '#d7a23c'); P.fill(g, P.circle(-95, -25, 6), '#c9573f');
    P.line(g, -110, -30, -92, -44, 1.6, '#6b5a48'); P.line(g, -100, -30, -112, -44, 1.6, '#6b5a48');
    /* the floor between, with the hatch */
    P.fill(g, P.box(-140, -186, 280, 9, 0.4, 12), '#caa878');
    P.fill(g, P.box(-136, -187, 40, 11, 0, 13), '#e7c98f');
    /* upstairs: the room he had as a boy */
    const up = P.poly([[-140, -186], [-140, -268], [0, -424], [140, -268], [140, -186]]);
    P.wash(g, up, '#dcc5a8', [-140, -424, 280, 240], { seed: 14, n: 16, tone: 0.045, dir: Math.PI / 2, len: 90, wid: 18 });
    P.tint(g, up, -140, 0, 140, 0, [[0, 'rgba(90,70,100,0.26)'], [0.5, 'rgba(90,70,100,0)'], [1, 'rgba(255,225,170,0.18)']]);
    P.fill(g, P.box(-140, -194, 280, 9, 0.4, 15), '#b98a5a');
    P.fill(g, P.box(-136, -195, 40, 11, 0, 16), '#dcc5a8');
    P.fill(g, P.circle(0, -340, 22), '#fff4dc'); P.fill(g, P.circle(0, -340, 17), '#ffe0a8');
    g.fillStyle = '#fff4dc'; g.fillRect(-1.5, -357, 3, 34); g.fillRect(-17, -341.5, 34, 3);
    /* kite */
    P.fill(g, P.poly([[58, -322], [78, -292], [58, -250], [38, -292]]), '#c9573f');
    P.line(g, 58, -322, 58, -250, 1.6, '#f6e9cc'); P.line(g, 38, -292, 78, -292, 1.6, '#f6e9cc');
    g.strokeStyle = '#6b5a48'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(58, -250); g.bezierCurveTo(70, -236, 46, -226, 60, -210); g.stroke();
    [[64, -238, '#f1c04a'], [52, -226, '#3f7fc2'], [60, -214, '#f1c04a']].forEach((b) => P.fill(g, P.poly([[b[0] - 6, b[1] - 3], [b[0] + 6, b[1] + 3], [b[0] + 6, b[1] - 3], [b[0] - 6, b[1] + 3]]), b[2]));
    /* shelf with the toy boat */
    P.fill(g, P.box(-136, -262, 52, 5, 0.4, 17), '#9a6b43');
    P.fill(g, P.poly([[-128, -262], [-98, -262], [-104, -270], [-124, -270]]), '#3f7f86'); P.line(g, -112, -270, -112, -290, 1.6, '#6b5a48'); P.fill(g, P.poly([[-111, -289], [-111, -273], [-99, -273]]), '#f6e9cc');
    /* the post the heights are marked on, and her step-stool beside it */
    P.fill(g, P.box(-57, -372, 14, 180, 0.5, 18), '#b08e62');
    P.fill(g, P.box(-55, -372, 4, 180, 0, 19), '#c9a878');
    /* bed */
    P.fill(g, P.box(34, -204, 106, 12, 0.5, 20), '#8a6442'); P.fill(g, P.rr(132, -252, 9, 60, 3), '#8a6442'); P.fill(g, P.rr(33, -226, 8, 34, 3), '#8a6442');
    P.fill(g, P.rr(38, -224, 96, 20, 7), '#f6f0e0');
    P.fill(g, P.soft([[40, -206], [38, -226], [70, -232], [112, -228], [116, -206]]), '#d7a23c');
    P.fill(g, P.rr(112, -238, 22, 15, 6), '#fbf7ec');
    P.fill(g, P.rr(46, -196, 10, 5, 2), '#c9573f'); P.fill(g, P.rr(60, -196, 10, 5, 2), '#c9573f');
    /* toy chest */
    P.fill(g, P.box(-20, -212, 36, 18, 0.5, 21), '#3f7f86'); P.fill(g, P.box(-22, -216, 40, 6, 0.4, 22), '#2f6067');
    /* steep attic stairs along the left wall, and a handrail */
    P.fill(g, P.poly([[-6, 0], [-20, 0], [-146, -188], [-128, -188]]), '#8a6644');
    for (let i = 0; i < 9; i++) { const x = -20 - (i + 1) * 13.4, y = -(i + 1) * 20.8; P.fill(g, P.rr(x - 2, y - 2, 18, 6, 2), '#b99168'); P.fill(g, P.rr(x, y + 4, 14, 14.8, 1), '#9d7752'); }
    P.line(g, 4, -40, -122, -228, 3.4, '#7a5a3c'); P.line(g, 4, -40, 4, 0, 3, '#7a5a3c');
  }

  /* ---------- lifecycle ---------- */
  function reset() {
    const s = S;
    s.d2 = 0; s.d3 = 0;
    s.a2 = y1(J1) - interp(K2, J1);
    s.d2 = s.a2; s.a3 = y2(J2) - interp(K3, J2); s.d3 = s.a3;   /* the three hills are one road */
    s.join1 = false; s.join2 = false; s.snap.k = 0; s.gate[1].k = 0; s.gate[2].k = 0; s.r2 = 0; s.r3 = 0;
    s.fog = 1;   /* the harbour stays hidden in fog until the bell has been answered (seaLit clears it for later starts) */
    s.boat.x = -1500; s.lamps = [{ x: -1020, k: 0, ok: false, mist: 1 }, { x: SEA_LAMP, k: 0, ok: false, mist: 1 }]; s.game = null; s.tolls = 0; s.bell.k = 0;
    s.leo = { x: 0, y: PIER_Y, stand: 0, hop: 0, rise: 0, style: F.styles.leoBed, flip: false, lamp: false };
    s.mom = { x: 300, y: PIER_Y, flip: true, wave: 0 };
    s.wx = 60; s.nx = 130; s.wph = 0; s.nph = 0; s.moving = false; s.nmoving = false;
    s.hug.k = 0; s.cup.k = 0; s.arms.k = 0; s.lampDown = false; s.drag = null; s.idle = 0; s.noteI = 0;
    s.home.open = 0; s.st = null; s.eat.k = 0; s.ghost.a = 0; s.ladle.k = 0; s.marks.n = 0; s.marks.fresh = 0; s.stool.k = 0; s.sweater.a = 1; s.sweater.lift = 0; s.clap.k = 0;
    s.point.k = 0; s.lamp.planted = 0; s.rest.k = 0; s.fare.k = 0; s.fare.touch = 0; s.fare.rise = 0; s.fare.orb = 0; s.momTo = null; s.momGone = false; s.dusk = 0;
    s.title.a = 0; s.place.a = 0; s.end.a = 0; s.canLeave = false; s.hintA.a = 0;
    s.bram.wave = 0; s.bram.near = false; s.post.x = 2000; s.post.on = false; s.post.rang = false; s.rosa.k = 0; s.rosa.done = false; s.kidWave.k = 0;
    s.cam.x = -1240; s.cam.y = 450; s.cam.z = 1; s.camK = 2.2; s.placed = false;
    s.momHome = false; s.plotGo = false; s.running = false; s.sitting = false; s.climbing = false; s.nClimb = false; s.lDown = false; s.nDown = false;
    s.inWalk = null; s.flash = 0; s.wait = null; s.post.done = false; s.kidWave.done = false; s.lastStep = null;
    TALK.clear();
  }
  S.enter = function (args) {
    const k = S.clock, A = T.audio;
    S.hook = null;
    reset();
    const cp = args.cp || 'sea';
    T.state.chapter = 1; T.state.cp = cp;
    P.grainAmt = 0.15; P.vignette = 0.2; P.vignetteColor = '#4a3558';
    const atSea = cp === 'sea' || cp === 'quay';
    A.ambience(0.3, 0.3, atSea ? 0.55 : 0.2);
    A.bed(0, 0.12, atSea ? 'sea' : 'walk');
    const joinAll = () => { S.join1 = true; S.join2 = true; S.gate[1].k = 1; S.gate[2].k = 1; S.r2 = 9999; S.r3 = 9999; };
    const seaLit = () => { S.fog = 0; S.lamps.forEach((q) => { q.ok = true; q.k = 1; q.mist = 0; }); };
    if (cp === 'sea') {
      S.ph = 'sail';
      k.wait(1.2).then(() => k.tween(S.title, 'a', 1, 1.6)).then(() => k.wait(3.2)).then(() => k.tween(S.title, 'a', 0, 1.8));
      T.announce('1장, 항구. 작은 배가 구름바다를 건넌다. 병원 옷을 입은 레오가 배 안에서 두리번거린다.');
      k.wait(2.2).then(() => { if (S.ph === 'sail') TALK.say('leo', '…여긴 어디지?', { auto: 2.2, pass: true }); });
    } else if (cp === 'quay') {
      seaLit();
      S.boat.x = -560; S.tolls = 2; S.ph = 'sail';
    } else {
      seaLit();
      S.boat.x = -74; S.leo.lamp = true; S.mom.flip = false; S.lampDown = false;
      if (cp === 'street') { S.wx = 300; S.nx = 354; S.ph = 'walk'; }
      else if (cp === 'hills') { S.join1 = true; S.gate[1].k = 1; S.r2 = 9999; S.wx = J1 + 40; S.nx = S.wx + 54; S.ph = 'walk'; }
      else if (cp === 'house') { joinAll(); S.wx = 2880; S.nx = 2934; S.ph = 'walk'; }
      else if (cp === 'top') { joinAll(); S.leo.style = F.styles.leoHome; S.sweater.a = 0; S.wx = DOOR + 250; S.nx = S.wx + 54; S.ph = 'climb'; }
      camTarget(1);
    }
    S.cam.x = S.camT.x; S.cam.y = S.camT.y; S.cam.z = S.camT.z;
  };
  S.exit = function () { T.cursor('default'); };

  /* ---------- camera ---------- */
  S.camT = { x: 0, y: 450, z: 1 };
  function camTarget() {
    const c = S.camT, ph = S.ph;
    if (ph === 'sail' || ph === 'dock') { c.x = Math.min(S.boat.x + 260, 150); c.y = 450; c.z = 1; }
    else if (ph === 'meet') { c.x = 150; c.y = 452; c.z = 1.05; }
    else if (ph === 'hug') { c.x = S.mom.x - 14; c.y = 548; c.z = 1.6; }
    else if (ph === 'walk' || ph === 'climb' || ph === 'point') { c.x = S.wx + 170; c.y = groundAt(S.wx) - 190; c.z = 1; }
    else if (ph === 'home') {
      const up = S.st === 'beam' || S.st === 'marks' || S.st === 'sweater' || S.st === 'wear';
      if (S.st === 'marks') { const m = hs(HOUSE - 34, UF() - 104); c.x = m[0]; c.y = m[1]; c.z = 2.5 / HK; }
      else { c.x = HOUSE; c.y = HG() - (up ? 250 : 186) * HK; c.z = (up ? 1.7 : 1.5) / Math.sqrt(HK); }
    } else if (ph === 'plot') { c.x = PLOT - 60; c.y = groundAt(PLOT) - 200; c.z = 1; }
    else if (ph === 'end') { c.x = 3600; c.y = 50; c.z = 0.6; }
  }
  function camUpdate(dt) {
    camTarget();
    const c = S.cam, t = S.camT, k = 1 - Math.exp(-dt * S.camK);
    c.x += (t.x - c.x) * k; c.y += (t.y - c.y) * k; c.z += (t.z - c.z) * k;
  }

  /* ---------- the tune, a note at a time ---------- */
  function note(o) { T.audio.step(S.noteI++, Object.assign({ voice: 'box', vel: 0.38 }, o || {})); }
  function notes(n, o) { for (let i = 0; i < n; i++) note(Object.assign({ at: 0.2 + i * 0.36 }, o || {})); }

  /* ---------- sea ---------- */
  /* the lamps that stand out in the cloud sea: the boat waits in the mist until the next one is lit */
  const seaLamp = () => S.lamps.find((q) => !q.ok);
  function lightSea() {
    const s = seaLamp();
    if (!s || s.asked || S.ph !== 'sail' || S.boat.x < s.x - 340) return;
    s.asked = true; S.idle = 0;
    S.clock.tween(s, 'k', 1, 0.8, T.ease.out);
    T.audio.sfx('join');
    const open = () => { s.ok = true; S.clock.tween(s, 'mist', 0, 1.2); notes(3); T.announce('구름바다의 등불에 불이 들어오고, 배가 다시 나아간다.'); };
    if (s.x !== SEA_LAMP) { open(); return; }
    /* off the pier the harbour bell has something to ask first, and the lamps answer it */
    T.announce('항구의 종이 묻고, 부두의 등불 넷이 대답한다. 종이 울린 차례대로 등불을 누른다.');
    S.game = T.puzzle.bell({ rounds: [[0, 1, 2], [0, 1, 2, 3]], onRound: (r, n) => S.clock.tween(S, 'fog', 1 - (r / n) * 0.55, 1.8, T.ease.io) });
    T.audio.bed(null);
    S.game.begin(S.clock).then(() => { S.game = null; S.idle = 0; T.audio.bed(0, 0.12, 'sea'); open(); T.announce('안개가 걷히고 부두와 마을이 드러난다.'); S.clock.tween(S, 'fog', 0, 3.6, T.ease.io); });
  }
  function sail(dt) {
    const b = S.boat, k = S.clock, A = T.audio;
    const next = seaLamp();
    const stop = next ? next.x - 176 : -74;
    if (b.x < stop) b.x = Math.min(stop, b.x + 60 * dt);
    const th = [-900, -640, -330, -130];
    if (S.tolls < 4 && b.x > th[S.tolls]) { A.toll(S.tolls, 0.3 + S.tolls * 0.03); S.tolls++; S.bell.k = 1; k.tween(S.bell, 'k', 0, 3.2, T.ease.out); }
    if (!S.placed && b.x > -420) {
      S.placed = true;
      /* lamps, a pier, someone waiting: the story he made up */
      T.announce('마중 나루. 종이 울리고, 부두에 누군가 등불을 들고 서 있다. 레오가 배에서 엉거주춤 일어선다.');
      TALK.say('leo', '…설마.', { slow: true, auto: 2, pass: true });
      k.tween(S.leo, 'rise', 1, 0.6, T.ease.out).then(() => k.wait(1.5)).then(() => k.tween(S.leo, 'rise', 0, 0.7, T.ease.io)); k.tween(S.place, 'a', 1, 1.6).then(() => k.wait(3)).then(() => k.tween(S.place, 'a', 0, 1.8)); }
    if (b.x > -640) { const n = S.mom; if (n.x > 132) { n.x = Math.max(132, n.x - 52 * dt); S.nph += dt * 5.6; S.nmoving = true; } else { S.nmoving = false; n.wave = Math.min(1, n.wave + dt * 1.5); } }
    if (!next && b.x >= -74.5 && S.ph === 'sail') dock();
  }
  async function dock() {
    const k = S.clock, L = S.leo;
    S.ph = 'dock'; T.state.cp = 'quay';
    T.audio.sfx('door');
    await k.wait(0.7);
    await k.tween(L, 'stand', 1, 0.9, T.ease.io);
    L.lamp = true;
    await k.wait(0.3);
    await k.tween(L, 'hop', 1, 1.0, T.ease.io);
    S.wx = 52; L.x = 52;
    await k.wait(0.4);
    S.ph = 'meet'; S.idle = 0;
    TALK.say('leo', '…엄마?', { slow: true, auto: 2.6, pass: true });
  }

  /* ---------- the first embrace ---------- */
  S.meet = async function () {
    if (S.ph !== 'meet') return;
    const k = S.clock, A = T.audio, n = S.mom;
    S.ph = 'hug'; S.camK = 1.5;
    k.tween(S.hintA, 'a', 0, 0.3);
    S.lampDown = true;
    k.tween(S.arms, 'k', 1, 0.7, T.ease.out);
    S.running = true;
    while (S.wx < n.x - 37) { await k.wait(0.016); }
    S.running = false;
    A.bed(3, 0.15, 'walk');
    A.motif({ voice: 'felt', vel: 0.4, beat: 0.86 });
    k.tween(S.arms, 'k', 0, 0.5);
    await k.tween(S.hug, 'k', 1, 0.8, T.ease.out);
    await k.wait(2.2);
    await TALK.say('mom', '왜 이렇게 빨리 왔니.', { slow: true });
    await TALK.say('mom', '천천히 오라고 했는데.');
    /* she holds his face to look at him; he looks past her, at the lamps and the town */
    k.tween(S.hug, 'k', 0, 1, T.ease.io);
    await k.tween(S.cup, 'k', 1, 1.1, T.ease.io);
    /* what she told a seven-year-old so that he would not cry: she had not known either */
    await TALK.say('leo', '엄마… 그 말, 진짜였어?\n나 울지 말라고 한 말인 줄 알았는데.');
    await TALK.say('mom', '나도 그런 줄 알았지.\n와 보니 정말 있더구나.');
    /* who comes here: the ones who left a promise unkept. She is one of them; she does not say to whom */
    await TALK.say('mom', '여긴 마중 나루란다.\n못 지킨 약속이 있는 사람이 오는 데야.');
    await TALK.say('leo', '…나도 아나한테 똑같이 말하고 왔어.\n먼저 가서 다 해 놓겠다고.');
    await TALK.say('mom', '그럼 여기서 지키면 되지.\n엄마처럼.');
    await k.wait(0.9);
    await k.tween(S.cup, 'k', 0, 0.9, T.ease.io);
    S.lampDown = false; n.flip = false;
    A.bed(0, 0.13, 'walk'); A.ambience(0.3, 0.3, 0.25);
    await k.wait(0.5);
    S.camK = 1.4;
    S.ph = 'walk'; T.state.cp = 'street';
    k.wait(2.5).then(() => { S.camK = 2.2; });
  };

  /* ---------- walking, and the hills ---------- */
  function target() { return S.ph !== 'walk' ? 0 : !S.join1 ? 2 : !S.join2 ? 3 : 0; }
  const waitingAt = () => { const h = target(); return h && !S.moving && !S.nmoving && S.wx >= (h === 2 ? J1 : J2) - 104.5 ? h - 1 : 0; };
  /* Mom holds her lamp to the one at the turning, and the road ahead comes alight */
  function lightGate() {
    const n = waitingAt();
    if (!n) return;
    const k = S.clock, q = gateAt(n);
    S.idle = 0;
    if (n === 1) { S.join1 = true; T.state.cp = 'hills'; } else { S.join2 = true; T.state.cp = 'house'; }
    S.snap.x = q[0]; S.snap.y = q[1]; S.snap.k = 1;
    k.tween(S.snap, 'k', 0, 1.4, T.ease.out);
    k.tween(S.gate[n], 'k', 1, 0.6, T.ease.out);
    k.tween(S, n === 1 ? 'r2' : 'r3', 2400, 6, T.ease.out);
    T.audio.sfx('join'); notes(3);
    T.audio.bed(n === 1 ? 2 : 4, 0.13, 'walk');
    T.announce('길목의 등불에 불이 붙고, 언덕길을 따라 등불이 하나씩 켜진다.');
  }
  function walk(dt) {
    const A = T.audio;
    let limit;
    if (S.ph === 'walk') limit = !S.join1 ? J1 - 104 : !S.join2 ? J2 - 104 : DOOR - 52;
    else if (S.ph === 'climb') limit = STOP - 54;
    else if (S.ph === 'plot') limit = S.plotGo ? PLOT - 10 : S.wx;
    else limit = S.wx;
    const slope = (x) => Math.abs(groundAt(x + 8) - groundAt(x - 8)) / 16;
    S.moving = S.wx < limit - 0.5;
    if (S.moving) {
      const v = 80 / (1 + slope(S.wx) * 0.9);
      S.wx = Math.min(limit, S.wx + v * dt); S.wph += (v * dt) / 10.5;
      const st = Math.floor(S.wph / Math.PI);
      if (st !== S.lastStep) { S.lastStep = st; if (st % 2 === 0) A.sfx('step'); }
    }
    /* Mom leads, a lantern's length ahead, and waits when he falls behind */
    if (S.ph === 'walk' || S.ph === 'climb') {
      const nl = S.ph === 'walk' ? (!S.join1 ? J1 - 50 : !S.join2 ? J2 - 50 : DOOR) : STOP;
      const want = Math.min(nl, S.wx + 54);
      S.nmoving = S.nx < want - 0.5;
      if (S.nmoving) { const v = 86 / (1 + slope(S.nx) * 0.9); S.nx = Math.min(want, S.nx + v * dt); S.nph += (v * dt) / 9.4; }
      S.mom.flip = !S.nmoving && !S.moving && (S.ph === 'walk' && target() !== 0);
    }
    /* neighbours */
    const near = Math.abs(S.wx - 930) < 150;
    if (near && !S.bram.near) { S.bram.near = true; TALK.say('mom', '브램 선장은 배를 짓는단다.\n아내 태워 주마 했던 배를, 육십 년째.', { auto: 3.2 }); S.clock.tween(S.bram, 'wave', 1, 0.5).then(() => S.clock.wait(2.4)).then(() => S.clock.tween(S.bram, 'wave', 0, 0.6)); note(); }
    if (!S.post.on && !S.post.done && S.wx > 1010) S.post.on = true;
    if (S.post.on) {
      S.post.x -= 170 * dt;
      if (!S.post.rang && S.post.x - S.wx < 300) { S.post.rang = true; A.sfx('bike'); }
      if (S.post.x < 420) { S.post.on = false; S.post.done = true; }
    }
    if (!S.rosa.done && S.wx > 1930) { S.rosa.done = true; TALK.say('mom', '로사는 아들 담요를 뜬단다.\n다 못 뜨고 온 걸, 처음부터 다시.', { auto: 2.4 }); S.clock.tween(S.rosa, 'k', 1, 1.1, T.ease.io).then(() => { notes(4, { vel: 0.3 }); return S.clock.wait(2.2); }).then(() => S.clock.tween(S.rosa, 'k', 0, 1)); }
    if (!S.kidWave.done && S.wx > 2230) { S.kidWave.done = true; S.clock.tween(S.kidWave, 'k', 1, 0.5).then(() => S.clock.wait(2)).then(() => S.clock.tween(S.kidWave, 'k', 0, 0.6)); note(); }
    if (S.ph === 'walk' && S.join2 && S.wx >= DOOR - 52.5 && !S.nmoving) goHome();
    if (S.ph === 'climb' && S.wx >= STOP - 54.5 && !S.nmoving) pointOut();
  }

  /* ---------- Mom's house ---------- */
  const tap = (name) => new Promise((res) => { S.st = name; S.idle = 0; S.wait = res; });
  S.act = function () { if (S.wait) { const w = S.wait; S.wait = null; S.idle = 0; w(); } };
  async function goHome() {
    const k = S.clock, A = T.audio, L = S.leo, N = S.mom;
    S.ph = 'home'; S.st = 'enter'; S.camK = 1.3;
    L.x = S.wx; L.y = HG(); N.x = S.nx; N.y = HG(); N.flip = false;
    A.sfx('door');
    A.bed(1, 0.13, 'home'); A.ambience(0.24, 0.12);
    k.tween(S.home, 'open', 1, 1.8, T.ease.io);
    S.inWalk = { l: HOUSE - 34, n: HOUSE + 118 };
    await k.wait(2.6);
    T.announce('엄마의 부엌. 감자 수프가 끓고, 갓 구운 빵 냄새가 난다.');
    await tap('table');
    /* the meal: she ladles, he sits, and for a moment he is seven again */
    S.st = 'eat';
    A.motif({ voice: 'box', vel: 0.34, beat: 0.7 });
    await k.tween(S.ladle, 'k', 1, 1.6, T.ease.io);
    S.inWalk = { l: HOUSE - 70, n: HOUSE + 118 };
    await k.wait(0.9);
    S.sitting = true;
    k.tween(S.eat, 'k', 1, 0.8);
    await k.wait(1.4);
    k.tween(S.ghost, 'a', 1, 1.6, T.ease.io);
    notes(4, { vel: 0.3 });
    await k.wait(5.2);
    await k.tween(S.ghost, 'a', 0, 1.6, T.ease.io);
    /* her promise, kept at her own table; and his father, who kept all of his and so never came here */
    await TALK.say('mom', '먼저 가서 해 놓는다고 했잖니.', { slow: true });
    await TALK.say('leo', '…아빠가 끓여 주던 맛이야.');
    await TALK.say('mom', '알지. 소금은 늘 많이 넣더라.');
    await TALK.say('mom', '네 아빠는 여기 안 왔단다.\n너한테 한 약속, 다 지켰거든.');
    await TALK.say('mom', '그래서 곧장 저 너머로 갔지.\n거기서 엄마 기다릴 거야.');
    await TALK.say('leo', '…아빠답다.', { slow: true });
    await tap('stairs');
    /* up the ladder */
    S.st = 'up'; S.sitting = false; k.tween(S.eat, 'k', 0, 0.4);
    S.inWalk = { l: HOUSE - 16, n: HOUSE + 118 };
    await k.wait(1.5);
    S.inWalk = null; S.climbing = true; L.x = HOUSE - 16; L.flip = true;
    k.tween(L, 'x', HOUSE - 136, 3.4, T.ease.lin);
    await k.tween(L, 'y', UF(), 3.4, T.ease.lin);
    S.climbing = false;
    S.inWalk = { l: HOUSE - 4, n: HOUSE + 118 };
    T.announce('다락에는 어릴 적 방이 그대로 있다.');
    await k.wait(1.2);
    await tap('beam');
    /* the post where she kept guessing how tall he had grown */
    S.st = 'marks';
    S.inWalk = { l: HOUSE - 32, n: HOUSE - 16 };
    await k.wait(1.6);
    L.flip = false;
    S.inWalk = { l: HOUSE - 32, n: null }; S.nClimb = true; N.x = HOUSE - 16; N.flip = true;
    k.tween(N, 'x', HOUSE - 136, 3.6, T.ease.lin);
    await k.tween(N, 'y', UF(), 3.6, T.ease.lin);
    S.nClimb = false;
    S.inWalk = { l: HOUSE - 32, n: HOUSE - 78 };
    for (let i = 0; i < 19; i++) {
      await k.wait(i < 4 ? 0.42 : 0.2);
      S.marks.n = i + 1; A.scaleStep(i, { vel: i < 4 ? 0.34 : 0.24 });
    }
    await k.wait(0.9);
    await k.tween(S.stool, 'k', 1, 0.8, T.ease.io);
    await k.wait(0.5);
    A.sfx('chalk'); A.scaleStep(18, { vel: 0.44, voice: 'felt' });
    await k.tween(S.marks, 'fresh', 1, 0.5, T.ease.out);
    T.announce('엄마가 레오의 키를 새로 긋는다. 일곱 살에서 멈춘 눈금 위로, 해마다 어림해 그어 둔 눈금보다 조금 더 높다.');
    await k.wait(0.6);
    await TALK.say('mom', '해마다 이쯤 컸겠지 하고\n그어 봤단다.');
    await k.tween(S.stool, 'k', 0, 0.8, T.ease.io);
    await tap('sweater');
    /* the jumper she knitted to the size she guessed */
    S.st = 'wear';
    S.inWalk = { l: HOUSE + 30, n: HOUSE - 64 };
    await k.wait(1.2);
    await k.tween(S.sweater, 'lift', 1, 0.8, T.ease.io);
    A.promise();
    L.style = F.styles.leoHome; S.sweater.a = 0; S.flash = 1; k.tween(S, 'flash', 0, 0.9, T.ease.out);
    L.flip = true;
    k.tween(S.clap, 'k', 1, 0.4);
    await k.wait(2.4);
    k.tween(S.clap, 'k', 0, 0.4);
    /* down and out again: down the stairs the way they came up, facing the way they go, a tread at a time; Mom first */
    S.st = 'leave';
    S.inWalk = { l: HOUSE - 84, n: HOUSE - 136 };
    await k.wait(1.5);
    S.inWalk.n = null; N.x = HOUSE - 136; N.flip = false; S.nDown = true; S.nClimb = true;
    k.tween(N, 'x', HOUSE - 16, 3.8, T.ease.lin);
    k.tween(N, 'y', HG(), 3.8, T.ease.lin).then(() => { S.nClimb = false; S.nDown = false; if (S.inWalk) S.inWalk.n = HOUSE + 54; });
    await k.wait(1.3);
    S.inWalk.l = HOUSE - 136;
    await k.wait(1.0);
    S.inWalk.l = null; L.x = HOUSE - 136; L.flip = false; S.lDown = true; S.climbing = true;
    k.tween(L, 'x', HOUSE - 16, 3.6, T.ease.lin);
    await k.tween(L, 'y', HG(), 3.6, T.ease.lin);
    S.climbing = false; S.lDown = false;
    S.inWalk.l = HOUSE - 10;
    await k.wait(0.5);
    k.tween(S.home, 'open', 0, 1.8, T.ease.io);
    A.sfx('door');
    await k.wait(1.9);
    S.wx = L.x; S.nx = N.x; S.inWalk = null;
    S.camK = 1.4; S.ph = 'climb'; S.st = null; T.state.cp = 'top';
    A.bed(5, 0.13, 'walk'); A.ambience(0.3, 0.3, 0.1);
    k.wait(2.5).then(() => { S.camK = 2.2; });
  }
  function homeMove(dt) {
    const L = S.leo, N = S.mom, w = S.inWalk;
    if (!w) return;
    const go = (p, tx, v, ph) => {
      const d = tx - p.x;
      if (Math.abs(d) < 1) { p.x = tx; return false; }
      p.x += Math.sign(d) * Math.min(Math.abs(d), v * dt); p.flip = d < 0;
      S[ph] += dt * 7;
      return true;
    };
    S.moving = w.l == null ? false : go(L, w.l, 66, 'wph');
    S.nmoving = w.n == null ? false : go(N, w.n, 60, 'nph');
  }

  /* ---------- the top of the hill ---------- */
  async function pointOut() {
    const k = S.clock;
    S.ph = 'point';
    S.mom.flip = true;
    await k.wait(0.5);
    await k.tween(S.point, 'k', 1, 0.9, T.ease.out);
    await k.wait(0.6);
    await TALK.say('mom', '저기가 네 자리야.\n네 사람 오면 같이 살 데.', { slow: true });
    await TALK.say('leo', '…마당은 저쪽으로 내야겠다.');
    S.ph = 'plot'; S.idle = 0;
    k.tween(S.point, 'k', 0, 1.2, T.ease.io);
  }
  /* She came on ahead to build a house, to have something hot on the table, and to keep him a place.
     All three are done now, and a promise kept is a way across: she goes on to where his father is
     waiting, and from below it is a star falling. Before she goes she says what she said the first time. */
  async function farewell() {
    const k = S.clock, A = T.audio;
    S.momTo = PLOT - 74;
    while (S.momTo != null) await k.wait(0.05);
    S.mom.flip = false;
    await k.wait(0.6);
    await TALK.say('mom', '넓은 집 지어 놓고,\n따뜻한 밥 해 먹이고.');
    await TALK.say('mom', '이제 다 지켰구나.\n네 자리까지 봐 뒀으니, 마음 놓인다.', { slow: true });
    await k.wait(0.6);
    T.announce('엄마의 몸에서 빛이 번지기 시작한다. 지킨 약속이 건너갈 길이 된다.');
    A.promise();
    k.tween(S, 'dusk', 0.85, 4.5, T.ease.io);
    k.tween(S.fare, 'k', 1, 2.6, T.ease.io);
    await k.wait(1.4);
    k.tween(S.rest, 'k', 0, 1.1, T.ease.io);
    await TALK.say('leo', '…엄마?');
    await TALK.say('mom', '약속 다 지키면,\n저 너머로 건너갈 수 있단다.');
    await TALK.say('mom', '네 아빠, 거기서 여태\n혼자 기다렸잖니. 이번엔 엄마가 가야지.');
    await TALK.say('leo', '이제 겨우 다시 만났는데….', { slow: true });
    await k.tween(S.fare, 'touch', 1, 1.2, T.ease.io);
    await TALK.say('mom', '엄마는 또 먼저 가 있을게.\n아빠랑, 맛있는 거 해 놓고.');
    await TALK.say('mom', '그러니까 천천히 와.\n…아주 천천히.', { slow: true });
    await TALK.say('leo', '…응. 천천히 갈게.', { slow: true });
    await TALK.say('mom', '잘 컸다, 우리 아들.', { slow: true });
    k.tween(S.fare, 'touch', 0, 1.0, T.ease.io);
    /* she turns to light and goes up, and then across the sky as a falling star */
    T.announce('엄마가 빛이 되어 하늘로 오른다.');
    A.sfx('join');
    k.tween(S.fare, 'rise', 1, 2.2, T.ease.io);
    await k.wait(1.2);
    await k.tween(S.fare, 'orb', 1, 2.6, T.ease.in);
    S.momGone = true;
    const top = toScreen(S.nx, groundAt(S.nx) - 110 - 560);
    T.announce('별 하나가 하늘을 가로질러, 구름 아래 산 사람들의 하늘로 떨어진다.');
    const star = T.fx && T.fx.star ? T.fx.star.add({ from: top, to: [T.view.W / 2 - 40, 560], dur: 2.6 }) : Promise.resolve();
    notes(3, { voice: 'felt', vel: 0.32 });
    await star;
    await k.wait(1.4);
    await TALK.say('leo', '…잘 가, 엄마.', { slow: true });
    k.tween(S, 'dusk', 0.7, 3, T.ease.io);
    await k.wait(0.8);
    await k.tween(S.rest, 'k', 1, 1.3, T.ease.io);
    await k.wait(1.2);
  }
  S.claim = async function () {
    if (S.ph !== 'plot' || S.plotGo) return;
    const k = S.clock, A = T.audio;
    S.plotGo = true;
    k.tween(S.hintA, 'a', 0, 0.3);
    while (S.wx < PLOT - 11) await k.wait(0.05);
    await k.wait(0.6);
    /* he sets his lantern in the ground: a light is on at his place now */
    A.sfx('knock'); await k.wait(0.28); A.sfx('knock', 0.6);
    await k.tween(S.lamp, 'planted', 1, 0.9, T.ease.out);
    T.announce('레오가 배에서 가져온 등불을 빈 터에 꽂는다. 이제 여기에도 불이 켜졌다.');
    A.bed(7, 0.15, 'walk');
    A.theme({ beat: 0.9, vel: 0.5 });
    await k.wait(1.4);
    await k.tween(S.rest, 'k', 1, 1.3, T.ease.io);
    await k.wait(1.6);
    await farewell();
    S.camK = 0.34; S.ph = 'end';
    await k.wait(9);
    T.announce('1장 끝. 다음은 2장, 약속 목록.');
    await k.tween(S.end, 'a', 1, 2.2, T.ease.io);
    S.canLeave = true;
  };
  S.leave = function () {
    if (!S.canLeave || T.director.busy()) return;
    S.canLeave = false;
    T.audio.pad(null);
    T.director.go('ch2', { style: 'fade', color: '#fff6e6', out: 1.8, in: 1.6 });
  };

  /* ---------- input ---------- */
  const SPOT = {
    table: () => [HOUSE + 4, HG() - 70, 60], stairs: () => [HOUSE - 76, HG() - 110, 56],
    beam: () => [HOUSE - 50, UF() - 100, 56], sweater: () => [HOUSE + 78, UF() - 44, 44],
  };
  function spot() {
    if (S.ph === 'sail') { const s = seaLamp(); return s && !s.asked && S.boat.x >= s.x - 340 ? [s.x + 24, surf(s.x) - 96, 56] : null; }
    if (S.ph === 'walk') { const n = waitingAt(); if (n) { const q = gateAt(n); return [q[0], q[1], 48]; } return null; }
    if (S.ph === 'meet') return [S.mom.x, PIER_Y - 70, 70];
    if (S.ph === 'home' && S.wait && SPOT[S.st]) { const q = SPOT[S.st](); const m = hs(q[0], q[1]); return [m[0], m[1], q[2] * HK]; }
    if (S.ph === 'plot' && !S.plotGo) return [PLOT + 10, groundAt(PLOT) - 46, 70];
    return null;
  }
  function tapSpot() { if (S.ph === 'sail') lightSea(); else if (S.ph === 'walk') lightGate(); else if (S.ph === 'meet') S.meet(); else if (S.ph === 'plot') S.claim(); else S.act(); }
  const overEnd = (x, y) => Math.abs(x) < 170 && Math.abs(y - 806) < 40;
  S.pointer = function (type, x, y) {
    if (type === 'down' && TALK.tap()) return;
    if (S.game) { T.cursor('default'); S.game.pointer(type, x, y); return; }
    const sp = spot();
    if (sp) {
      const [sx, sy] = toScreen(sp[0], sp[1]);
      const over = Math.hypot(x - sx, y - sy) < sp[2] * S.cam.z + 26;
      T.cursor(over ? 'pointer' : 'default');
      if (type === 'down' && over) tapSpot();
      return;
    }
    if (S.ph === 'end') { const o = S.canLeave && overEnd(x, y); T.cursor(o ? 'pointer' : 'default'); if (type === 'down' && o) S.leave(); return; }
    T.cursor('default');
  };
  S.key = function (key) {
    const act = key === ' ' || key === 'Enter';
    if (act && TALK.tap()) return;
    if (S.game) return S.game.key(key);
    if (spot()) { if (!act) return false; tapSpot(); return; }
    if (S.ph === 'end') { if (act && S.canLeave) S.leave(); else return false; return; }
    return false;
  };

  S.update = function (dt) {
    S.idle += dt;
    if (S.game) S.game.update(dt);
    if (S.ph === 'sail') sail(dt);
    if (S.running) { const v = 120; S.wx = Math.min(S.mom.x - 36, S.wx + v * dt); S.wph += (v * dt) / 9; S.moving = true; } else if (S.ph === 'hug' || S.ph === 'meet' || S.ph === 'dock') S.moving = false;
    if (S.ph === 'walk' || S.ph === 'climb' || S.ph === 'plot') walk(dt);
    if (S.ph === 'home') homeMove(dt);
    if (S.momTo != null) {
      const d = S.momTo - S.nx;
      if (Math.abs(d) < 1) { S.nx = S.momTo; S.momTo = null; S.nmoving = false; }
      else { const v = 62; S.nx += Math.sign(d) * Math.min(Math.abs(d), v * dt); S.nph += (v * dt) / 9.4; S.nmoving = true; S.mom.flip = d < 0; }
    }
    if (S.momHome && S.nx > STOP - 190) { S.nx -= 30 * dt; S.nph += dt * 3.6; S.nmoving = true; S.mom.flip = true; } else if (S.momHome) { S.nmoving = false; S.mom.flip = false; }
    camUpdate(dt);
  };

  /* ---------- drawing: backdrop ---------- */
  function layer(g, d) {
    const c = S.cam, zd = 1 + (c.z - 1) * d, W = T.view.W;
    g.save(); g.translate(0, 450); g.scale(zd, zd); g.translate(-c.x * d, -450 - (c.y - 450) * d);
    return [c.x * d - W / 2 / zd - 60, c.x * d + W / 2 / zd + 60, 450 + (c.y - 450) * d - 450 / zd - 60, 450 + (c.y - 450) * d + 450 / zd + 60];
  }
  function bankFill(g, list, ox, bob, top, bot, y0, xa, xb) {
    if (P.cray) {   /* cloud banks: the white of the paper, shaded with the flat of a pink crayon */
      const path = K.bankPath(list, ox, bob, xa, xb, 1600);
      /* the line first, then the colour over its inner half: only the outline of the whole bank is left */
      g.save(); g.globalAlpha = 0.55; g.strokeStyle = '#c79aae'; g.lineWidth = 5; g.lineJoin = 'round'; g.stroke(path); g.restore();
      P.noEdge = true; g.fillStyle = top; g.fill(path); P.noEdge = false;
      g.save(); g.clip(path); g.globalAlpha = 0.5; g.fillStyle = P.crayonPat(bot).pat; g.fillRect(xa - 60, y0 + 40, xb - xa + 120, 1700);
      g.restore();
      return;
    }
    const gr = g.createLinearGradient(0, y0 - 150, 0, y0 + 220);
    gr.addColorStop(0, top); gr.addColorStop(1, bot);
    g.fillStyle = gr; g.fill(K.bankPath(list, ox, bob, xa, xb, 1600));
  }
  /* while his mother goes, the sunset goes too: the sky deepens to violet and the first stars come out,
     so that her light, and the star she becomes, are the brightest things in it */
  function duskSky(g) {
    const W = T.view.W, t = T.time, d = T.ease.io(S.dusk);
    const sk = g.createLinearGradient(0, 0, 0, 900);
    sk.addColorStop(0, '#1c2150'); sk.addColorStop(0.45, '#4a3f78'); sk.addColorStop(0.75, '#9c6f8e'); sk.addColorStop(1, '#d8a49a');
    g.save(); g.globalAlpha = 0.88 * d; g.fillStyle = sk; g.fillRect(-W / 2, 0, W, 900); g.restore();
    const r = T.rng(808);
    for (let i = 0; i < 70; i++) {
      const x = -W / 2 + r() * W, y = r() * 460, tw = 0.55 + 0.45 * Math.sin(t * (1 + r() * 2) + i);
      const a = d * tw * T.clamp((S.dusk - 0.2 - (i % 7) * 0.06) * 3) * (1 - y / 620);
      if (a > 0.01) { g.globalAlpha = a; P.fill(g, P.circle(x, y, 1.1 + (i % 5 === 0 ? 1 : 0)), '#fff6e0'); }
    }
    g.globalAlpha = 1;
  }
  function duskLand(g) {
    const W = T.view.W, d = T.ease.io(S.dusk);
    g.save(); g.globalCompositeOperation = 'multiply';
    g.fillStyle = T.rgba('#5c5a92', 0.55 * d); g.fillRect(-W / 2, 0, W, 900);
    g.restore();
    /* lights stay lights: his lantern on the plot, and her */
    layer(g, 1);
    const lx = PLOT + 44, ly = y3(lx) - 86;
    if (S.lamp.planted > 0.5) { P.glow(g, lx, ly, 170, '#ffd98a', 0.55 * d); P.glow(g, lx, ly, 26, '#fff6dc', 0.7 * d); }
    if (!S.momGone && S.fare.k > 0.01) {
      const gy = groundAt(S.nx), rise = T.ease.io(S.fare.rise), orb = T.ease.in(S.fare.orb);
      P.glow(g, S.nx, gy - 80, 120 + S.fare.k * 70, '#fff2c4', 0.5 * S.fare.k * d * (1 - rise));
      if (rise > 0.01) { const oy = gy - 110 - orb * 560, oa = 1 - T.smooth(T.clamp((orb - 0.85) / 0.15)); P.glow(g, S.nx, oy, 110, '#fff0c0', 0.75 * rise * oa * d); P.glow(g, S.nx, oy, 24, '#ffffff', 0.9 * rise * oa); }
    }
    g.restore();
  }
  function backdrop(g) {
    const V = T.view, W = V.W, t = T.time;
    const sky = g.createLinearGradient(0, 0, 0, 900);
    sky.addColorStop(0, '#8496cc'); sky.addColorStop(0.38, '#e9b9a4'); sky.addColorStop(0.7, '#ffdba6'); sky.addColorStop(1, '#fff0cc');
    g.fillStyle = sky; g.fillRect(-W / 2, 0, W, 900);
    if (S.hook && S.hook.sky) S.hook.sky(g);
    if (!S.hook && S.dusk > 0.003) duskSky(g);
    let r = layer(g, 0.05);
    P.glow(g, 430, 560, 620, '#fff2c4', 0.9); P.glow(g, 430, 560, 170, '#ffffff', 0.75);
    g.restore();
    r = layer(g, 0.1);
    g.lineCap = 'round';
    for (const w of S.wisps) {
      const x = ((w.x + t * w.s + 1600) % 3200) - 1000;
      g.strokeStyle = 'rgba(255,246,228,0.4)'; g.lineWidth = 9;
      g.beginPath(); g.moveTo(x, w.y); g.quadraticCurveTo(x + w.w / 2, w.y - 12, x + w.w, w.y + 4); g.stroke();
    }
    g.restore();
    /* the far plane of cloud, and islands other people sailed to */
    r = layer(g, 0.16);
    const fg = g.createLinearGradient(0, 590, 0, 900);
    fg.addColorStop(0, '#fff3dc'); fg.addColorStop(1, '#eec4be');
    for (const il of S.isles) {
      g.fillStyle = 'rgba(176,138,170,0.55)';
      g.beginPath(); g.moveTo(il.x - il.w / 2, 606); g.quadraticCurveTo(il.x - il.w * 0.1, 606 - il.h * 1.8, il.x + il.w / 2, 606); g.fill();
      P.glow(g, il.x - il.w * 0.1, 606 - il.h * 0.5, 20, '#ffe9a8', 0.8 * (0.7 + 0.3 * Math.sin(t * 2 + il.x)));
    }
    g.fillStyle = fg; g.fillRect(r[0], 606, r[1] - r[0], 1600);
    bankFill(g, S.banks.far, ((t * 3) % 110) - 700, Math.sin(t * 0.3) * 3, '#fff5e2', '#ecc2bc', 604, r[0], r[1]);
    g.restore();
  }

  /* ---------- drawing: land ---------- */
  function hillPath(g, fn, xa, xb, from) {
    const a = from == null ? xa : Math.max(xa, from);
    g.beginPath(); g.moveTo(a, 2400);
    for (let x = a; x < xb; x += 18) g.lineTo(x, fn(x));
    g.lineTo(xb, fn(xb)); g.lineTo(xb, 2400); g.closePath();
  }
  function hill(g, fn, xa, xb, color, shade, y0, from) {
    hillPath(g, fn, xa, xb, from);
    if (P.cray) {   /* one crayon, pressed harder lower down, and a drawn line along the ridge */
      g.fillStyle = color; g.fill();
      g.save(); g.clip();
      const sh = g.createLinearGradient(0, y0 + 60, 0, y0 + 620); sh.addColorStop(0, T.rgba(shade, 0)); sh.addColorStop(1, T.rgba(shade, 0.6));
      g.fillStyle = sh; g.fillRect(xa - 40, y0, xb - xa + 80, 1700); g.restore();
      g.strokeStyle = P.crayonPat(shade).edge; g.lineWidth = 3; g.lineCap = 'round'; g.globalAlpha = 0.6;
      g.beginPath();
      const a0 = from == null ? xa : Math.max(xa, from);
      for (let x = a0; x <= xb; x += 18) { const y = fn(x) + 1 + T.noise(x * 0.05, 3) * 1.6; if (x === a0) g.moveTo(x, y); else g.lineTo(x, y); }
      g.stroke(); g.globalAlpha = 1;
      return;
    }
    const gr = g.createLinearGradient(0, y0, 0, y0 + 560);
    gr.addColorStop(0, color); gr.addColorStop(1, shade);
    g.fillStyle = gr; g.fill();
    /* the lit edge */
    g.strokeStyle = T.rgba('#fff0c8', 0.34); g.lineWidth = 5; g.lineCap = 'round';
    g.beginPath();
    const a = from == null ? xa : Math.max(xa, from);
    for (let x = a; x <= xb; x += 18) { const y = fn(x) + 2; if (x === a) g.moveTo(x, y); else g.lineTo(x, y); }
    g.stroke();
  }
  function tufts(g, fn, seed, color, xa, xb, size) {
    const r = T.rng(seed);
    g.strokeStyle = color; g.lineCap = 'round';
    for (let i = 0; i < 420; i++) {
      const x = -400 + r() * 5600, d = 16 + r() * 150, s = size * (0.6 + r() * 0.8), lw = 2 + r() * 1.6;
      if (x < xa || x > xb) continue;
      const y = fn(x) + d;
      g.lineWidth = lw; g.globalAlpha = 0.42 * (1 - d / 190);
      g.beginPath(); g.moveTo(x - s, y); g.quadraticCurveTo(x, y - s * 1.3, x + s * 0.8, y - s * 0.2); g.stroke();
    }
    g.globalAlpha = 1;
  }

  /* the lamps up each road come on outward from its turning, once that turning's lamp is lit */
  const GATE_S = 1.3;
  const lampLit = (h, x) => (h === 1 ? 1 : T.clamp(((h === 2 ? S.r2 : S.r3) - Math.abs(x - (h === 2 ? J1 : J2))) / 90));
  const gateAt = (n) => { const x = (n === 1 ? J1 : J2) - 26, y = (n === 1 ? y1(x) : y2(x)) + 2; return [x + 16 * GATE_S, y - 74 * GATE_S]; };
  function drawThings(g, h, fn, xa, xb) {
    const t = T.time;
    for (const o of S.things[h]) {
      if (o.x < xa - 320 || o.x > xb + 320) continue;
      const y = fn(o.x);
      if (o.k === 'spr') T.blit(g, S.spr[o.s], o.x, y + 3);
      else if (o.k === 'lamp') K.lantern(g, o.x, y + 2, t, { s: o.s || 1, seed: o.x, lit: lampLit(h, o.x) });
      else if (o.k === 'gate') K.lantern(g, o.x, y + 2, t, { s: GATE_S, seed: o.x, lit: S.gate[o.n].k });
      else if (o.k === 'tree') { if (!(S.hook && o.x === 4420) && !(gardenOn() && o.x === 3690)) K.tree(g, o.x, y, o.s, o.c, null, null, Math.sin(t * 0.8 + o.x)); }   /* later on, the swing hangs where this one stood */
      else if (o.k === 'box') { P.fill(g, P.rr(o.x - 13, y - 58, 26, 34, 6), '#c9573f'); P.fill(g, P.rr(o.x - 8, y - 46, 16, 4, 2), '#3a3032'); P.line(g, o.x, y - 24, o.x, y + 2, 6, '#8a4a3a'); }
      else if (o.k === 'slip') { if (!(S.hook && S.hook.flags.bramGone)) drawSlip(g, o.x, y); }
      else if (o.k === 'builder') drawBuilder(g, o.x, y);
      else if (o.k === 'rosa') { if (!(S.hook && (T.rosaOut || S.hook.flags.rosaGone))) drawRosa(g, o.x, y); }   /* not at her window while she is out on the porch or the quay */
      else if (o.k === 'sitter') drawSitter(g, o.x, y);
      else if (o.k === 'roses') { if (!(gardenOn() && o.x === 3540)) K.bush(g, o.x, y + 2, 1.15, '#5f8f62', ['#e5758f', '#f09aac', '#d9546f', '#f6e0e0']); }
      else if (o.k === 'arch') { if (!gardenOn()) drawArch(g, o.x, y); }   /* the tomato rack (garden.js) stands here in the later chapters */
      else if (o.k === 'home') drawHome(g);
      else if (o.k === 'plot') { if (S.hook && S.hook.plot) S.hook.plot(g, o.x); else drawPlot(g, o.x); }
    }
  }
  function drawSlip(g, x, y) {
    const t = T.time;
    T.blit(g, S.spr.slip, x, y + 2);
    /* (no lamp of its own: the street lamp at 572 already stands by the first house) */
    /* Bram at the bow, driving one more nail */
    const wave = S.bram.wave, swing = wave > 0.1 ? 0 : Math.max(0, Math.sin(t * 5.6));
    const st = F.styles.bram, s = 142, bx = x + 232;
    const o = { x: bx, y: y - F.hipHeight(st, s), s, style: st, flip: wave < 0.5, lean: 0.08, face: { blush: 0.2, mouth: wave > 0.5 ? 'smile' : null } };
    o.armF = wave > 0.1 ? { a: 2.5 + Math.sin(t * 9) * 0.25, b: 0.3 } : { a: 1.2 + swing * 0.9, b: 0.8 - swing * 0.6 };
    o.armB = { a: 0.9, b: 0.5 };
    const j = F.person(g, o);
    if (wave < 0.1) { P.line(g, j.handF[0], j.handF[1], j.handF[0] - 6, j.handF[1] - 20, 3.4, '#8a6442'); P.fill(g, P.rr(j.handF[0] - 16, j.handF[1] - 27, 20, 9, 2), '#59636a'); }
    const strike = Math.floor((t * 5.6) / TAU);
    if (strike !== S.bram.last) { S.bram.last = strike; if (wave < 0.1 && Math.abs(S.cam.x - x) < 700 && (S.ph === 'walk')) T.audio.sfx('knock', (strike % 3) / 3); }
  }
  function drawBuilder(g, x, y) {
    const t = T.time, st = F.styles.villagerA, s = 138;
    const o = { x: x + 106, y: y - 96 - F.hipHeight(st, s) * 0.2, s, style: st, flip: true, lean: 0.1, legF: { foot: [6, 30] }, legB: { foot: [-4, 40] } };
    o.armF = { a: 1.5 + Math.sin(t * 3.1) * 0.5, b: 0.5 }; o.armB = { a: 1.0, b: 0.9 };
    const j = F.person(g, o);
    P.fill(g, P.rr(j.handF[0] - 12, j.handF[1] - 5, 12, 8, 2), '#f6e9cc');
  }
  function drawRosa(g, x, y) {
    /* the nursery window: a cot, a mobile, and a young mother hanging one more star */
    const t = T.time, wx = x + 4, wy = y - 132, k = T.ease.io(S.rosa.k);
    P.fill(g, P.box(wx - 6, wy - 6, 96, 86, 0.6, 3), '#fff4dc');
    g.save(); g.beginPath(); g.rect(wx, wy, 84, 74); g.clip();
    const pane = g.createLinearGradient(0, wy, 0, wy + 74); pane.addColorStop(0, '#ffe7b0'); pane.addColorStop(1, '#f6c98a');
    g.fillStyle = pane; g.fillRect(wx, wy, 84, 74);
    P.fill(g, P.rr(wx + 44, wy + 46, 38, 30, 4), '#fbf7ec');
    g.strokeStyle = '#d9c9a8'; g.lineWidth = 2; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(wx + 48 + i * 8, wy + 46); g.lineTo(wx + 48 + i * 8, wy + 74); g.stroke(); }
    const st = F.styles.rosa, s = 128;
    const o = { x: wx + 22, y: wy + 96, s, style: st, noLegs: true, lean: 0.04, headTilt: -0.12 - k * 0.14, face: { eye: k > 0.5 ? 'happy' : 'open', mouth: 'smile', blush: 0.25 } };
    o.armF = { a: T.lerp(0.5, 2.5, k), b: T.lerp(0.9, 0.2, k) }; o.armB = { a: 0.4, b: 0.8 };
    F.person(g, o);
    /* mobile */
    const mx = wx + 62, sp = t * (0.7 + k * 1.6);
    P.line(g, mx, wy, mx, wy + 10, 1.4, '#8a7a66');
    for (let i = 0; i < 3; i++) {
      const a = sp + (i * TAU) / 3, px = mx + Math.cos(a) * 15, py = wy + 22 + (i % 2) * 5;
      P.line(g, mx + Math.cos(a) * 15, wy + 10, px, py, 1, '#8a7a66');
      P.fill(g, P.circle(px, py + 3, 4), ['#f1c04a', '#7fb0c9', '#e58aa0'][i]);
    }
    if (k > 0.05) P.fill(g, P.circle(mx - 2, wy + 16 + (1 - k) * 20, 4.6), '#f1c04a');
    g.restore();
    g.fillStyle = '#fff4dc'; g.fillRect(wx + 41, wy, 3, 74);
    P.fill(g, P.box(wx - 10, wy + 77, 104, 7, 0.5, 4), '#e6d6b4');
    P.glow(g, wx + 42, wy + 37, 90, '#ffd98a', 0.25);
  }
  function drawSitter(g, x, y) {
    const t = T.time, st = F.styles.villagerB, s = 132, k = S.kidWave.k;
    const o = { x: x - 20, y: y - 154, s, style: st, sit: true, lean: 0.04, legF: { a: Math.PI / 2 - 0.1, b: Math.PI / 2 - 0.3 + Math.sin(t * 2.2) * 0.2 }, legB: { a: Math.PI / 2 - 0.2, b: Math.PI / 2 - 0.2 + Math.sin(t * 2.2 + 2) * 0.2 }, face: { mouth: 'smile', blush: 0.22 } };
    o.armF = k > 0.05 ? { a: 2.4 + Math.sin(t * 9) * 0.25, b: 0.3 } : { a: 0.6, b: 0.9 }; o.armB = { a: 0.5, b: 0.9 };
    F.person(g, o);
  }
  function drawArch(g, x, y) {
    g.strokeStyle = '#f6e9cc'; g.lineWidth = 6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x - 34, y + 2); g.lineTo(x - 34, y - 96); g.quadraticCurveTo(x, y - 142, x + 34, y3(x + 34) - 96); g.lineTo(x + 34, y3(x + 34) + 2); g.stroke();
    const r = T.rng(8);
    for (let i = 0; i < 16; i++) { const a = Math.PI + (i / 15) * Math.PI, px = x + Math.cos(a) * 36, py = y - 100 + Math.sin(a) * 34; P.fill(g, P.circle(px, py, 8 + r() * 4), '#5f8f62'); if (i % 2) P.fill(g, P.circle(px + 2, py - 2, 4.4), ['#e5758f', '#f09aac'][i % 4 > 1 ? 0 : 1]); }
  }
  function drawPlot(g, x) {
    /* four stakes and a string: someone marked this out and has kept it mown */
    const t = T.time, xa = x - 170, xb = x + 180;
    const stake = (sx, far) => { const y = y3(sx); P.line(g, sx, y + 4, sx, y - (far ? 30 : 40), far ? 4 : 5.5, far ? '#c9a878' : '#b08e62'); return [sx, y - (far ? 26 : 36)]; };
    const a = stake(xa + 26, true), b = stake(xb - 26, true), c = stake(xa, false), d = stake(xb, false);
    g.strokeStyle = 'rgba(246,233,204,0.85)'; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 6, b[0], b[1]); g.stroke();
    g.beginPath(); g.moveTo(c[0], c[1]); g.quadraticCurveTo((c[0] + d[0]) / 2, (c[1] + d[1]) / 2 + 9, d[0], d[1]); g.moveTo(a[0], a[1]); g.lineTo(c[0], c[1]); g.moveTo(b[0], b[1]); g.lineTo(d[0], d[1]); g.stroke();
    [c, d].forEach((q, i) => { const f = Math.sin(t * 3 + i) * 3; P.fill(g, P.poly([[q[0], q[1] - 2], [q[0] + 16 + f, q[1] + 2], [q[0], q[1] + 8]]), i ? '#d7a23c' : '#c9573f'); });
    /* long grass and a few flowers */
    const r = T.rng(19);
    g.lineCap = 'round';
    for (let i = 0; i < 60; i++) {
      const gx = xa - 60 + r() * 470, h = 12 + r() * 22, sw = Math.sin(t * 1.4 + i) * 4, y = y3(gx) + 3;
      g.strokeStyle = i % 3 ? '#6b9a72' : '#9ab86a'; g.lineWidth = 2 + r();
      g.beginPath(); g.moveTo(gx, y); g.quadraticCurveTo(gx + sw * 0.4, y - h * 0.6, gx + sw, y - h); g.stroke();
      if (i % 9 === 0) P.fill(g, P.circle(gx + sw, y - h, 3.6), ['#f6f0e0', '#f1c04a', '#e58aa0'][i % 3]);
    }
    /* his lantern */
    const lp = S.lamp.planted;
    if (lp > 0.01) {
      const lx = x + 44, y = y3(lx);
      P.line(g, lx, y + 6, lx, y - 84 * lp, 4.5, '#6f4a34');
      K.lantern(g, lx, y - 84 * lp - 2, t, { bare: true, s: 1.1, lit: 1, seed: 4 });
      P.glow(g, lx, y - 80, 150 * lp, '#ffe2a0', 0.35 * lp);
    }
  }

  /* ---------- drawing: Mom's house ---------- */
  function drawHome(g) {
    const t = T.time, open = S.home.open, hg = HG(), uf = hg - 186;
    g.save(); g.translate(HOUSE, hg); g.scale(HK, HK); g.translate(-HOUSE, -hg);
    if (open > 0.005) {
      T.blit(g, S.spr.inside, HOUSE, hg);
      /* pot and bread */
      for (let i = 0; i < 3; i++) { const life = (t * 0.25 + i * 0.33) % 1; P.glow(g, HOUSE + 116 + Math.sin(t + i * 2) * 6, hg - 110 - life * 46, 10 + life * 14, '#fff3dc', Math.sin(life * Math.PI) * 0.3); }
      const ld = S.ladle.k;
      if (ld > 0.5) {
        [[-32, '#f2ead8'], [34, '#f2ead8']].forEach((b, i) => { const bx = HOUSE + b[0], by = hg - 68; P.fill(g, P.poly([[bx - 12, by - 9], [bx + 12, by - 9], [bx + 8, by], [bx - 8, by]]), b[1]); P.fill(g, P.ellipse(bx, by - 9, 11, 3), '#e9cf8a'); P.glow(g, bx, by - 22 - ((t * 9 + i * 7) % 14), 9, '#fff3dc', 0.22); });
        P.fill(g, P.ellipse(HOUSE + 6, hg - 74, 15, 8), '#c98a4b'); P.fill(g, P.ellipse(HOUSE + 4, hg - 77, 9, 3), '#e0a86a');
      }
      /* height marks on the post */
      const px = HOUSE - 50, n = S.marks.n;
      const kidH = [84, 93, 101, 109], kidC = ['#c9573f', '#3f7fc2', '#5d9a57', '#e0a53c'];
      for (let i = 0; i < Math.min(n, 4); i++) { P.line(g, px - 6, uf - kidH[i], px + 7, uf - kidH[i], 2, '#4a3f3a'); P.fill(g, P.circle(px + 11, uf - kidH[i], 2.2), kidC[i]); }
      for (let i = 4; i < Math.min(n, 19); i++) { const hh = 114 + (i - 4) * 2.35; P.line(g, px - 4, uf - hh, px + 4, uf - hh, 1.2, 'rgba(90,80,74,0.75)'); }
      if (S.marks.fresh > 0.01) { P.line(g, px - 7, uf - 153.5, px - 7 + 15 * S.marks.fresh, uf - 153.5, 2.6, '#2f3b52'); }
      /* stool */
      P.fill(g, P.box(HOUSE - 92, uf - 24, 26, 5, 0.4, 5), '#b98a5a'); P.line(g, HOUSE - 88, uf - 19, HOUSE - 90, uf - 9, 3.4, '#8a6442'); P.line(g, HOUSE - 70, uf - 19, HOUSE - 68, uf - 9, 3.4, '#8a6442');
      /* folded jumper on the bed */
      if (S.sweater.a > 0.01) {
        const lift = S.sweater.lift, sx = HOUSE + 78 - lift * 40, sy = uf - 44 - lift * 50;
        P.fill(g, P.rr(sx - 17, sy - 9, 34, 14, 4), '#d7a23c'); P.fill(g, P.rr(sx - 17, sy - 3, 34, 3, 1), '#b8862c');
      }
      /* star lights along the rafters */
      for (let i = 0; i < 7; i++) { const u = 0.12 + i * 0.12, sx = HOUSE - 136 + u * 136, sy = uf - 84 - u * 150; P.glow(g, sx, sy, 12, '#ffe6a0', 0.5 + 0.3 * Math.sin(t * 2 + i * 1.7)); P.fill(g, P.circle(sx, sy, 2.2), '#fff3c8'); }
      if (S.ph === 'home') inside(g);
      P.glow(g, HOUSE, hg - 96, 190, '#ffcf8a', 0.16 * open);
    }
    if (open < 0.995) {
      g.save(); g.globalAlpha = 1 - open;
      T.blit(g, S.spr.mom, HOUSE, hg + 3);
      /* smoke */
      g.restore();
    }
    for (let i = 0; i < 4; i++) { const life = (t * 0.12 + i * 0.25) % 1; P.glow(g, HOUSE + 92 + Math.sin(t * 0.7 + i * 2) * (6 + life * 20) + life * 26, hg - 390 - life * 120, 16 + life * 26, '#fff6ea', Math.sin(life * Math.PI) * 0.34 * (1 - open * 0.6)); }
    g.restore();
  }
  function handLamp(g, hand, lit) { P.line(g, hand[0], hand[1], hand[0], hand[1] + 9, 1.6, '#5d5066'); K.lantern(g, hand[0], hand[1] + 16, T.time, { bare: true, s: 0.8, lit, seed: hand[0] > 0 ? 3 : 7 }); }

  function inside(g) {
    const t = T.time, L = S.leo, N = S.mom, hg = HG(), uf = hg - 186, st = S.st;
    const MOM_S = 132 / HK, LEO_S = 150 / HK;   /* drawn inside the house's transform: same size on screen as outdoors */
    const lUp = Math.abs(L.y - uf) < 2, nUp = Math.abs(N.y - uf) < 2;
    /* Mom */
    const ns = F.styles.mom, nh = F.hipHeight(ns, MOM_S);
    const stool = T.ease.io(S.stool.k);
    /* onto the step-stool: a foot up first, then her weight after it */
    const sk = S.stool.k, up1 = T.ease.io(T.clamp(sk / 0.4)), up2 = T.ease.io(T.clamp((sk - 0.4) / 0.6)), su = 2000 / MOM_S;
    const no = { x: N.x, y: N.y - nh - up2 * 20, s: MOM_S, style: ns, flip: N.flip, lean: 0.1, face: { blush: 0.2, mouth: 'smile' } };
    if (S.nClimb) stairPose(no, N.y, hg, MOM_S, S.nDown ? -1 : 1);
    else if (S.nmoving) no.walk = S.nph;
    else if (st === 'table' || st === 'enter') { no.flip = true; no.armF = { a: 1.25 + Math.sin(t * 2.4) * 0.12, b: 0.5 }; no.lean = 0.14; }   /* stirring the pot */
    else if (st === 'eat' || st === 'stairs') {
      no.flip = true; const ld = T.ease.io(S.ladle.k);
      no.armF = S.ladle.k < 1 ? { a: 1.3 - Math.sin(ld * Math.PI) * 0.7, b: 0.5 + Math.sin(ld * Math.PI) * 0.6 } : { a: 0.9, b: 1.5 };
      no.armB = { a: 0.8, b: 1.5 }; no.face.eye = S.ghost.a > 0.3 ? 'happy' : 'open';
    } else if (nUp && (st === 'marks' || st === 'sweater' || st === 'wear' || st === 'leave')) {
      no.flip = N.x > L.x;
      if (stool > 0.02) {
        no.x = T.lerp(N.x, HOUSE - 78, T.clamp(sk * 4)); no.flip = false; no.lean = 0.1 + 0.08 * Math.sin(T.clamp(sk) * Math.PI);
        no.legF = { foot: [6 + 3 * up1 * (1 - up2), 49 - su * up1 * (1 - up2)] };
        no.legB = { foot: [-2, up2 < 0.8 ? 49 + su * up2 : T.lerp(49 + su * 0.8, 49, (up2 - 0.8) / 0.2)] };
        no.armF = { hand: F.local(no, HOUSE - 52, uf - 152 + (1 - up2) * 50) }; no.headTilt = -0.3 * up2;
      }
      else if (S.clap.k > 0.05) { no.armF = { a: 1.35 + Math.sin(t * 16) * 0.16, b: 1.1 }; no.armB = { a: 1.2 - Math.sin(t * 16) * 0.16, b: 1.1 }; no.face.eye = 'happy'; }
      else { no.armF = { a: 0.5, b: 1.3 }; no.armB = { a: 0.4, b: 1.3 }; no.headTilt = -0.14; }
    }
    /* Leo */
    const ls = L.style, lh = F.hipHeight(ls, LEO_S);
    const lo = { x: L.x, y: L.y - lh, s: LEO_S, style: ls, flip: L.flip, face: { blush: 0.14, mouth: 'smile' } };
    const cyc = spoonCycle(t);
    let spoon = null;
    if (S.sitting) {
      const e = S.eat.k;
      lo.x = HOUSE - 70; lo.y = hg - 54; lo.flip = false; lo.sit = true;
      spoon = eatPose(lo, cyc.lift * e, cyc.dip * e, [HOUSE - 31, hg - 73], 13);
      lo.face.eye = cyc.chew && e > 0.5 ? 'closed' : 'open';
    } else if (S.climbing) stairPose(lo, L.y, hg, LEO_S, S.lDown ? -1 : 1);
    else if (S.moving) lo.walk = S.wph;
    else if (st === 'marks' && lUp) { lo.flip = false; lo.lean = -0.02; lo.headTilt = -0.04; }
    else if (st === 'wear') { lo.armF = { a: 1.2 + S.sweater.lift * 0.5, b: 0.9 }; }
    else if (st === 'table' || st === 'enter') { lo.headTilt = -0.12 + Math.sin(t * 0.7) * 0.06; }
    else if (lUp) { lo.headTilt = -0.16 + Math.sin(t * 0.6) * 0.08; }
    const boy = S.sitting ? T.ease.io(S.ghost.a) : 0;
    const man = () => { if (boy > 0.99) return; g.save(); g.globalAlpha = 1 - boy; const j = F.person(g, lo); if (spoon) drawSpoon(g, j, spoon); g.restore(); };
    if (N.x < L.x) { F.person(g, no); man(); } else { man(); F.person(g, no); }
    if (S.flash > 0.01) P.glow(g, L.x, L.y - 90, 120, '#ffe6a0', S.flash * 0.8);
    /* the boy he was, on the same stool, legs not reaching the floor */
    if (boy > 0.01) {
      const ks = F.styles.leoKid;
      const ko = { x: HOUSE - 70, y: hg - 56, s: 118 / HK, style: ks, sit: true,
        legF: { a: Math.PI / 2 - 0.1, b: Math.PI / 2 - 0.3 + Math.sin(t * 4) * 0.35 }, legB: { a: Math.PI / 2 - 0.2, b: Math.PI / 2 - 0.3 + Math.sin(t * 4 + Math.PI) * 0.35 },
        face: { eye: cyc.chew ? 'happy' : 'open', mouth: 'smile', blush: 0.3 } };
      const ksp = eatPose(ko, cyc.lift, cyc.dip, [HOUSE - 38, hg - 73], 10);
      g.save(); g.globalAlpha = boy;
      P.glow(g, ko.x + 4, ko.y - 34, 96, '#fff0c8', 0.42 * Math.sin(T.clamp(S.ghost.a) * Math.PI) + 0.12);
      drawSpoon(g, F.person(g, ko), ksp);
      g.restore();
    }
  }
  /* at the table: a spoonful every few seconds. lift 0 in the bowl … 1 at the lips; dip is the scoop; chew while it is in */
  function spoonCycle(t) {
    const u = (t / 2.9) % 1;
    const lift = u < 0.18 ? 0 : u < 0.45 ? T.smooth((u - 0.18) / 0.27) : u < 0.62 ? 1 : u < 0.86 ? 1 - T.smooth((u - 0.62) / 0.24) : 0;
    return { lift, dip: u < 0.18 ? Math.sin((u / 0.18) * Math.PI) : 0, chew: u > 0.47 && u < 0.62 };
  }
  /* the elbow stays down at his side and the forearm brings the spoon up; he leans to the bowl and sits up to eat.
     bowl: where the spoon goes in (world); sl: the spoon's length. Returns what drawSpoon needs. */
  function eatPose(o, lift, dip, bowl, sl) {
    const l = T.smooth(lift), arc = Math.sin(l * Math.PI);
    o.lean = T.lerp(0.24, 0.1, l); o.headTilt = T.lerp(0.14, 0.05, l);
    const m = F.mouth(o);
    let dx = T.lerp(0.62, -0.4, l), dy = T.lerp(0.78, -0.92, l);   /* tipped into the bowl … turned up to the lips */
    const n = Math.hypot(dx, dy); dx /= n; dy /= n;
    const tip = [T.lerp(bowl[0] + dip * 5, m[0] + 1, l) + arc * 7, T.lerp(bowl[1] + dip * 2.5, m[1] + 0.5, l) - arc * 4];
    o.armF = { hand: F.local(o, tip[0] - dx * sl, tip[1] - dy * sl), bend: 1 };
    o.armB = { hand: F.local(o, bowl[0] - 11 * (o.s / 150), bowl[1] - 1) };   /* the other hand steadies the bowl */
    return { dir: [dx, dy], sl };
  }
  function drawSpoon(g, j, sp) {
    const h = j.handF, d = sp.dir, L = sp.sl, k = L / 13;
    P.line(g, h[0] - d[0] * L * 0.28, h[1] - d[1] * L * 0.28, h[0] + d[0] * L * 0.8, h[1] + d[1] * L * 0.8, 1.9 * k, '#b98a5a');
    P.fill(g, P.ellipse(h[0] + d[0] * L, h[1] + d[1] * L, 3.4 * k, 2.1 * k, Math.atan2(d[1], d[0])), '#c99a68');
  }
  /* on the attic stairs, a tread at a time. The body glides along the flight; each foot is set down on a tread and
     lifted over the next one; a hand slides along the rail. dir 1 going up (facing the top, to the left),
     -1 coming down (facing the way he goes, down and to the right). */
  const TREAD = 20.8, RUN = 13.4, NSTEP = 186 / 20.8;
  function stairPose(o, footY, hg, s, dir) {
    const u = s / 100, p = (hg - footY) / TREAD, face = dir > 0 ? -1 : 1;
    const ends = T.smooth(T.clamp(Math.min(p, NSTEP - p) / 0.8));   /* 0 on the floor at either end, 1 on the flight */
    const TX = (n) => HOUSE - 13 - T.clamp(n, -1, 9.6) * RUN, TY = (n) => hg - T.clamp(n * TREAD, 0, 186);
    o.walk = null; o.flip = dir > 0;
    o.lean = T.lerp(0.06, dir > 0 ? 0.17 : -0.03, ends); o.headTilt = T.lerp(0, dir > 0 ? -0.1 : 0.2, ends);
    o.y = footY - (F.hipHeight(o.style, s) - 7.5 * u * ends) - Math.abs(Math.sin(p * Math.PI)) * 1.2 * u * ends;
    /* foot k steps on every other tread: k = 0 the even ones, k = 1 the odd ones */
    const foot = (k) => {
      const z = (p + 0.5 - k) / 2, n0 = Math.floor(z) * 2 + k, f = (z - Math.floor(z)) * 2;
      let x, y;
      if (f < 1) { x = TX(n0); y = TY(n0); }
      else {
        const e = T.smooth(T.clamp((f - 1.1) / 0.8));
        x = T.lerp(TX(n0), TX(n0 + 2), e); y = T.lerp(TY(n0), TY(n0 + 2), e) - Math.sin(e * Math.PI) * TREAD * 0.7;
      }
      const st = F.local(o, x, y - 3.2 * u);
      return [T.lerp(k ? -1 : 1, st[0], ends), T.lerp(48.8, st[1], ends)];
    };
    o.legF = { foot: foot(0) }; o.legB = { foot: foot(1) };
    const hx = o.x + face * 12 * u / 1.5, railY = hg - 40 + (hx - HOUSE - 4) * (188 / 126);
    const rest = F.local(o, o.x + face * 6 * u, o.y + 14 * u), rail = F.local(o, hx, railY);
    o.armF = { hand: [T.lerp(rest[0], rail[0], ends), T.lerp(rest[1], rail[1], ends)], bend: 1 };
    o.armB = { a: 0.2 + 0.18 * Math.sin(p * Math.PI), b: 0.45 };
  }

  /* a little girl on the crates at the land end of the pier, looking up at the clouds. As he comes past she
     looks down at him for a moment, and then up again */
  let kumoLook = 0;
  function cloudKid(g) {
    const st = F.styles.cloud, s = 96, t = T.time;
    const near = S.ph === 'walk' && S.wx > 330 && S.wx < 470 ? 1 : 0;
    kumoLook += (near - kumoLook) * 0.06;
    const o = { x: 468, y: PIER_Y - 38, s, style: st, flip: true, sit: true, lean: -0.08 + kumoLook * 0.12, headTilt: T.lerp(-0.42 + Math.sin(t * 0.5) * 0.04, 0.08, kumoLook), face: { blush: 0.22 } };
    o.legF = { a: Math.PI / 2 - 0.1, b: Math.PI / 2 - 0.3 + Math.sin(t * 1.6) * 0.18 }; o.legB = { a: Math.PI / 2 - 0.2, b: Math.PI / 2 - 0.25 + Math.sin(t * 1.6 + 2) * 0.18 };
    o.armF = { a: -0.2, b: 0.2 }; o.armB = { a: -0.3, b: 0.2 };   /* hands flat on the crate behind her */
    F.person(g, o);
  }
  /* ---------- drawing: people on the road ---------- */
  function people(g, h) {
    if (h === 1 && S.ph !== 'home') cloudKid(g);
    if (S.ph === 'home' || S.ph === 'sail') { if (S.ph === 'sail' && h === 1) pierMom(g); return; }
    const t = T.time, L = S.leo, N = S.mom;
    const ns = F.styles.mom, ls = L.style;
    const onPier = S.ph === 'dock' || S.ph === 'meet' || S.ph === 'hug';
    if (onPier) {
      if (h !== 1) return;
      const hug = T.ease.io(S.hug.k), cup = T.ease.io(S.cup.k), arms = S.arms.k;
      const lx = S.ph === 'dock' ? null : S.wx;
      /* Mom */
      const nh = F.hipHeight(ns, MOM_S);
      const no = { x: N.x, y: PIER_Y - nh, s: MOM_S, style: ns, flip: true, lean: 0.1 + hug * 0.16, headTilt: hug * 0.16 - cup * 0.3, face: { eye: hug > 0.5 ? 'closed' : 'open', mouth: cup > 0.4 ? 'smile' : null, blush: 0.22, tear: Math.max(hug, cup) * 0.8, tearY: (t * 2) % 3 } };
      const lhY = PIER_Y - F.hipHeight(ls, LEO_S);
      const headL = [(lx || 52) + 10, lhY - 72];
      if (hug > 0.02) { no.armF = { hand: F.local(no, T.lerp(N.x - 30, (lx || 0) - 12, hug), lhY - 50 + Math.sin(t * 5) * 3 * hug) }; no.armB = { hand: F.local(no, (lx || 0) - 6, lhY - 26) }; }
      else if (cup > 0.02) { no.armF = { hand: F.local(no, T.lerp(N.x - 20, headL[0] + 12, cup), T.lerp(PIER_Y - 60, headL[1] + 12, cup)) }; no.armB = { hand: F.local(no, T.lerp(N.x - 20, headL[0] - 4, cup), T.lerp(PIER_Y - 60, headL[1] + 16, cup)) }; }
      else if (arms > 0.02) { no.armF = { a: 1.1 + arms * 0.7, b: 0.2 }; no.armB = { a: 0.9 + arms * 0.6, b: 0.2 }; }
      else if (!S.lampDown) { no.armF = { a: 1.0 + N.wave * 0.9 + Math.sin(t * 3.5) * 0.14 * N.wave, b: 0.5 }; }
      no.skip = { armF: true };
      if (S.lampDown) K.lantern(g, N.x + 40, PIER_Y - 22, t, { bare: true, s: 0.8, seed: 3 });
      /* Leo */
      let lo = null;
      if (S.ph !== 'dock') {
        lo = { x: lx, y: lhY, s: LEO_S, style: ls, lean: 0.03 + hug * 0.08, headTilt: hug * 0.24 + cup * 0.2, face: { eye: hug > 0.5 ? 'closed' : 'open', mouth: cup > 0.5 ? 'smile' : null, blush: 0.14, tear: cup * 0.7, tearY: (t * 2) % 3 }, skip: { armF: true } };
        if (S.moving) { lo.walk = S.wph; lo.lean = 0.14; }
        if (hug > 0.02) { lo.armF = { hand: F.local(lo, T.lerp(lx + 10, N.x + 14, hug), T.lerp(lhY - 20, PIER_Y - nh - 40, hug)), bend: 1 }; lo.armB = { hand: F.local(lo, N.x + 8, PIER_Y - nh - 22) }; }
        else lo.armB = { a: 0.5, b: 0.5 };
        const j = F.person(g, lo);
        if (hug < 0.02) handLamp(g, j.handB, 1);
        else K.lantern(g, lx - 34, PIER_Y - 22, t, { bare: true, s: 0.8, seed: 7 });
      } else if (L.hop >= 0.4) boatLeo(g, true);
      F.person(g, no);
      if (lo) F.person(g, Object.assign({}, lo, { only: 'armF', skip: null }));
      const nj = F.person(g, Object.assign({}, no, { only: 'armF', skip: null }));
      if (!S.lampDown) handLamp(g, nj.handF, 1);
      return;
    }
    /* on the road */
    const who = [{ id: 'n', x: S.nx }, { id: 'l', x: S.wx }];
    const rest = T.ease.io(S.rest.k), pt = T.ease.io(S.point.k);
    for (const w of who) {
      if (hillOf(w.x) !== h) continue;
      const gy = groundAt(w.x);
      if (w.id === 'n') {
        if (S.momGone) continue;
        const fk = S.fare.k, rise = T.ease.io(S.fare.rise), touch = T.ease.io(S.fare.touch);
        const nh = F.hipHeight(ns, MOM_S);
        const o = { x: w.x, y: gy - nh, s: MOM_S, style: ns, flip: N.flip, lean: 0.1, face: { blush: 0.2, mouth: 'smile' }, skip: { armF: true } };
        if (S.nmoving) { o.walk = S.nph; o.lean = 0.14; }
        o.armF = { a: 0.95, b: 0.55 };
        if (pt > 0.02) { o.armB = { a: -(1.5 + Math.sin(t * 2) * 0.03) * pt, b: 0.1 }; o.headTilt = -0.1; }
        else if (!S.nmoving && !S.moving && target()) { o.armF = { a: 1.5 + Math.sin(t * 2) * 0.1, b: 0.4 }; o.headTilt = -0.15; }
        if (fk > 0.01) { o.headTilt = -0.16 * fk; o.face = { blush: 0.24, mouth: 'smile', eye: touch > 0.5 ? 'happy' : 'open', tear: 0.4 * fk }; }
        /* her hand on his cheek, the lantern in the other */
        if (touch > 0.01 && S.leoHead) { const hx = S.leoHead[0] - 8, hy = S.leoHead[1] + 10; o.armB = { hand: F.local(o, T.lerp(w.x + 20, hx, touch), T.lerp(gy - 70, hy, touch)), bend: 1 }; }
        if (fk > 0.01) {
          /* the light comes from inside her and spills out; motes go up off her like sparks off a fire */
          P.glow(g, w.x, gy - 86, 130 + fk * 80, '#fff6d8', 0.8 * fk * (1 - rise * 0.4));
          P.glow(g, w.x, gy - 70, 46 + fk * 20, '#ffffff', 0.5 * fk * (1 - rise));
          for (let i = 0; i < 16; i++) {
            const life = (t * 0.32 + i / 16) % 1, mx = w.x + Math.sin(i * 7.13) * 34 + Math.sin(t * 1.3 + i) * 8, my = gy - 16 - life * (190 + rise * 160) - i % 3 * 12;
            g.globalAlpha = fk * Math.sin(life * Math.PI) * 0.85;
            P.fill(g, P.circle(mx, my, 2.2 + (i % 4) * 0.6), '#fff6d8');
          }
          g.globalAlpha = 1;
        }
        g.save(); g.globalAlpha = 1 - rise;
        F.person(g, o);
        const j = F.person(g, Object.assign({}, o, { only: 'armF', skip: null }));
        handLamp(g, j.handF, 1);
        g.restore();
        if (rise > 0.01) {
          /* what is left of her is one light, rising */
          const orb = T.ease.in(S.fare.orb), oy = gy - 110 - orb * 560, oa = 1 - T.smooth(T.clamp((orb - 0.85) / 0.15));
          P.glow(g, w.x, oy, 70 + rise * 40, '#fff0c0', 0.9 * rise * oa);
          g.globalAlpha = rise * oa; P.fill(g, P.circle(w.x, oy, 5 + rise * 2), '#fffbee'); g.globalAlpha = 1;
        }
      } else {
        const lh = F.hipHeight(ls, LEO_S);
        const o = { x: w.x, y: gy - lh * (1 - rest * 0.8), s: LEO_S, style: ls, lean: 0.04, face: { blush: 0.14, mouth: 'smile' } };
        if (rest > 0.02) {
          o.flip = true; o.legF = { foot: [T.lerp(1, 21, rest), T.lerp(49, 10, rest)] }; o.legB = { foot: [T.lerp(-1, 16, rest), T.lerp(49, 11, rest)] };
          o.lean = -0.12 * rest; o.headTilt = -0.16 * rest; o.armF = { a: 0.75, b: 0.95 }; o.armB = { a: 0.7, b: 0.9 }; o.face.eye = rest > 0.8 ? 'happy' : 'open';
        } else if (S.moving) { o.walk = S.wph; o.lean = 0.1; o.armB = { a: 0.6, b: 0.5 }; }
        else { o.headTilt = -0.14 + Math.sin(t * 0.8) * 0.04; o.armB = { a: 0.6, b: 0.5 }; if (S.ph === 'plot' && S.plotGo) o.flip = S.lamp.planted > 0.5; }
        const tc = T.ease.io(S.fare.touch);
        if (tc > 0.01 && rest < 0.02) { o.lean = 0.04 + tc * 0.2; o.headTilt = 0.22 * tc; o.face.eye = tc > 0.6 ? 'closed' : 'open'; }   /* he stoops to her hand */
        const j = F.person(g, o);
        S.leoHead = j.head;
        if (S.lamp.planted < 0.01 && !(S.ph === 'plot' && S.plotGo && !S.moving)) handLamp(g, j.handB, 1);
      }
    }
  }
  function pierMom(g) {
    const N = S.mom, ns = F.styles.mom, t = T.time;
    if (S.boat.x < -1100) return;
    const o = { x: N.x, y: PIER_Y - F.hipHeight(ns, MOM_S), s: MOM_S, style: ns, flip: true, lean: 0.1, face: { blush: 0.2 }, skip: { armF: true } };
    if (S.nmoving) o.walk = S.nph;
    o.armF = { a: 1.0 + N.wave * 0.9 + Math.sin(t * 3.5) * 0.14 * N.wave, b: 0.5 };
    F.person(g, o);
    const j = F.person(g, Object.assign({}, o, { only: 'armF', skip: null }));
    handLamp(g, j.handF, 1);
  }
  function boatLeo(g, hop) {
    /* seated in the boat, then up and over onto the planks */
    const b = S.boat, L = S.leo, by = surf(b.x) - 34, ls = L.style, t = T.time;
    const stand = Math.max(T.ease.io(L.stand), 0.62 * (L.rise || 0)), hp = hop ? T.ease.io(L.hop) : 0;
    const lh = F.hipHeight(ls, LEO_S);
    const x0 = b.x - 10, y0 = by - 20 - stand * (lh - 30);
    const x = T.lerp(x0, 52, hp), y = T.lerp(y0, PIER_Y - lh, hp) - Math.sin(hp * Math.PI) * 30;
    /* at sea he does not know where he is: he keeps looking about, a hand on the gunwale */
    const lost = S.ph === 'sail' ? 1 - (L.rise || 0) : 0, look = Math.sin(t * 0.8) * 0.5 + Math.sin(t * 1.9) * 0.2;
    const o = { x, y, s: LEO_S, style: ls, noLegs: stand < 0.3, lean: 0.05 + 0.05 * (L.rise || 0), headTilt: -0.1 + lost * look * 0.34 - 0.16 * (L.rise || 0), flip: lost > 0.5 && Math.sin(t * 0.45) < -0.55, face: { blush: 0.14, mouth: S.ph === 'sail' ? ((L.rise || 0) > 0.3 ? 'open' : 'line') : undefined }, armF: { a: 0.9 - stand * 0.5, b: 0.9 - stand * 0.5 }, armB: { a: 0.6, b: 0.7 } };
    if (hp > 0.02 && hp < 0.98) o.walk = hp * 6;
    const j = F.person(g, o);
    if (L.lamp) handLamp(g, j.handB, 1);
  }
  function drawBoat(g) {
    const b = S.boat, t = T.time;
    const y = surf(b.x) - 34, tilt = Math.atan2(surf(b.x + 40) - surf(b.x - 40), 80) * 0.7 + Math.sin(t * 0.9) * 0.03;
    g.save(); g.translate(b.x, y); g.rotate(tilt);
    P.line(g, 26, -8, 26, -92, 3.5, '#6f4a34');
    if (!S.leo.lamp) { P.glow(g, 26, -98, 70, '#ffe6a0', 0.85); P.fill(g, P.rr(19, -108, 14, 18, 4), '#ffe9ae'); }
    g.restore();
    if (S.ph === 'sail') boatLeo(g, false); else if (S.ph === 'dock' && S.leo.hop < 0.4) boatLeo(g, true);
    g.save(); g.translate(b.x, y); g.rotate(tilt);
    P.fill(g, P.soft([[-66, -22], [66, -22], [84, -30], [70, 4], [44, 16], [-44, 16], [-70, 4]]), '#8a5a3b');
    P.fill(g, P.rr(-64, -24, 132, 7, 3), '#a8744c');
    g.restore();
  }
  function drawSeaLamps(g, xa, xb) {
    const t = T.time;
    for (const s of S.lamps) {
      if (s.x < xa - 400 || s.x > xb + 100) continue;
      const y = surf(s.x) + 34;
      K.lantern(g, s.x, y, t, { s: 1.5, lit: s.k, seed: s.x });
    }
  }
  /* the harbour in fog, until the bell has been answered: only the lamp off the pier shows through */
  function drawFog(g) {
    const W = T.view.W, t = T.time, f = S.fog;
    const a = toScreen(-330, 0)[0], b = toScreen(-130, 0)[0];
    if (a > W / 2) return;
    g.save();
    const gr = g.createLinearGradient(a, 0, b, 0);
    gr.addColorStop(0, 'rgba(250,244,240,0)'); gr.addColorStop(1, T.rgba('#f8f1ee', 0.96 * f));
    g.fillStyle = gr; const x0 = Math.max(a, -W / 2); g.fillRect(x0, 0, W / 2 - x0, 900);
    for (let i = 0; i < 16; i++) {
      const x = b - 60 + i * 120 + Math.sin(t * 0.22 + i * 1.3) * 46, y = 120 + ((i * 131) % 640) + Math.sin(t * 0.3 + i) * 20;
      if (x > W / 2 + 240) break;
      P.glow(g, x, y, 240, '#fffaf6', 0.45 * f, 'source-over');
    }
    g.restore();
  }
  /* until its lamp is lit, whoever is coming waits out in the mist */
  function drawSeaMist(g, xa, xb) {
    const t = T.time;
    for (const s of S.lamps) {
      const m = s.mist || 0;
      if (m < 0.01 || s.x < xa - 100 || s.x > xb + 600) continue;
      for (let i = 0; i < 5; i++) P.glow(g, s.x - 70 - i * 74 + Math.sin(t * 0.5 + i * 1.7) * 14, SEA - 64 - (i % 2) * 44, 128, '#fff6ea', 0.42 * m, 'source-over');
    }
  }
  function seaSurface(g, xa, xb) {
    const p = new Path2D();
    const a = Math.floor(xa / 58) * 58;
    for (let x = a; x <= xb + 58; x += 58) { const y = surf(x) + 20, rr = 44 + T.noise(x * 0.01, 3) * 8; p.moveTo(x + rr, y); p.arc(x, y, rr, 0, TAU); }
    p.rect(xa - 20, SEA + 30, xb - xa + 40, 1700);
    if (P.cray) {   /* chalk-white cloud, each puff with its own drawn curl */
      P.noEdge = true; g.fillStyle = '#fff8ee'; g.fill(p); P.noEdge = false;
      g.strokeStyle = '#c79aae'; g.lineWidth = 2.2; g.lineCap = 'round'; g.globalAlpha = 0.55;
      for (let x = a; x <= xb + 58; x += 58) { const y = surf(x) + 20, rr = 44 + T.noise(x * 0.01, 3) * 8; g.beginPath(); g.arc(x, y, rr, Math.PI * 1.12, Math.PI * 1.88); g.stroke(); }
      g.globalAlpha = 1;
      return;
    }
    const gr = g.createLinearGradient(0, SEA - 190, 0, SEA + 260);
    gr.addColorStop(0, '#fffaf0'); gr.addColorStop(0.5, '#fbe9da'); gr.addColorStop(1, '#e0aebb');
    g.fillStyle = gr; g.fill(p);
  }
  function drawPier(g) {
    const t = T.time;
    /* posts, then the deck */
    for (let x = 16; x <= QUAY; x += 84) { P.fill(g, P.box(x - 9, PIER_Y - 26, 18, 190, 0.8, x), '#8a6a58'); P.fill(g, P.box(x - 11, PIER_Y - 32, 22, 9, 0.6, x + 1), '#6f5346'); }
    P.fill(g, P.box(-14, PIER_Y, QUAY + 16, 15, 0.8, 2), '#b98f6a');
    P.fill(g, P.box(-14, PIER_Y + 13, QUAY + 16, 6, 0.6, 3), '#8f6d54');
    g.strokeStyle = 'rgba(80,50,40,0.28)'; g.lineWidth = 1.5;
    for (let x = 6; x < QUAY; x += 26) { g.beginPath(); g.moveTo(x, PIER_Y + 1); g.lineTo(x, PIER_Y + 14); g.stroke(); }
    /* the bell that rings when someone is coming */
    const bx = 420, sw = Math.sin(t * 5.2) * 0.34 * S.bell.k;
    P.line(g, bx - 30, PIER_Y, bx - 24, PIER_Y - 150, 8, '#7f5f52'); P.line(g, bx + 30, PIER_Y, bx + 24, PIER_Y - 150, 8, '#7f5f52');
    P.line(g, bx - 40, PIER_Y - 150, bx + 40, PIER_Y - 150, 9, '#6f5346');
    P.fill(g, P.poly([[bx - 46, PIER_Y - 152], [bx, PIER_Y - 178], [bx + 46, PIER_Y - 152]]), '#8a5578');
    g.save(); g.translate(bx, PIER_Y - 146); g.rotate(sw);
    P.fill(g, P.soft([[-6, 0], [-18, 34], [-24, 46], [24, 46], [18, 34], [6, 0]]), '#b07a2a');
    P.fill(g, P.rr(-25, 44, 50, 6, 3), '#b8862c');
    P.fill(g, P.circle(Math.sin(t * 5.2 + 1) * 8 * S.bell.k, 54, 5), '#8a6a2a');
    g.restore();
    if (S.bell.k > 0.02) P.glow(g, bx, PIER_Y - 110, 90 + (1 - S.bell.k) * 110, '#ffe6a0', S.bell.k * 0.5);
    /* lanterns on a line from the end post to the bell, crates, a coil of rope */
    P.line(g, 16, PIER_Y, 16, PIER_Y - 242, 6, '#7f5f52');
    const A0 = [16, PIER_Y - 240], B0 = [bx - 8, PIER_Y - 174], C0 = [(16 + bx) / 2, PIER_Y - 186];
    const at = (u) => [(1 - u) * (1 - u) * A0[0] + 2 * (1 - u) * u * C0[0] + u * u * B0[0], (1 - u) * (1 - u) * A0[1] + 2 * (1 - u) * u * C0[1] + u * u * B0[1]];
    g.strokeStyle = '#6f5346'; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(A0[0], A0[1]); g.quadraticCurveTo(C0[0], C0[1], B0[0], B0[1]); g.stroke();
    [0.2, 0.4, 0.6, 0.8].forEach((u, i) => { const q = at(u); K.lantern(g, q[0], q[1] + 8, t, { bare: true, s: 0.6, seed: i }); });
    P.fill(g, P.box(462, PIER_Y - 34, 40, 34, 0.8, 5), '#c79a62'); P.fill(g, P.box(476, PIER_Y - 58, 30, 24, 0.8, 6), '#b3864f');
    g.strokeStyle = '#d9c9a8'; g.lineWidth = 4; g.beginPath(); g.ellipse(250, PIER_Y - 4, 17, 5, 0, 0, TAU); g.stroke();
    if (!(S.hook && S.hook.flags.clearPier)) K.boat(g, 330, SEA - 6 + Math.sin(t * 0.8) * 3, 0.8, '#3f7f86', Math.sin(t * 0.8 + 1) * 0.03);   /* out of the way when the whole town is on the pier */
  }
  function drawPostman(g) {
    if (!S.post.on) return;
    const x = S.post.x, y = y1(x) + 9, t = T.time, st = F.styles.post, s = 140;
    K.bike(g, x, y + 1, 1.25, -t * 6);
    const o = { x: x + 12, y: y - 66, s, style: st, flip: true, lean: 0.34, legF: { foot: [8 + Math.cos(t * 6) * 6, 28 + Math.sin(t * 6) * 6] }, legB: { foot: [8 - Math.cos(t * 6) * 6, 28 - Math.sin(t * 6) * 6] }, armF: { hand: [20, -14] }, armB: { hand: [19, -12] }, face: { mouth: 'smile', blush: 0.2 } };
    F.person(g, o);
    P.fill(g, P.rr(x + 22, y - 62, 24, 20, 4), '#b98a5a');
  }

  /* ---------- drawing: the frame ---------- */
  S.draw = function (g) {
    const V = T.view, W = V.W, t = T.time;
    const who = S.hook ? S.hook.people : people;
    P.cray = P.look === 'crayon';
    if (P.cray) P.crayonize(g);
    backdrop(g);
    if (P.cray) {   /* the sky is the paper, coloured in with the side of the crayon */
      g.save();
      g.globalCompositeOperation = 'multiply'; g.fillStyle = P.paper(); g.fillRect(-W / 2, 0, W, 900);
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 0.2; g.fillStyle = P.crayonPat('#fff8e8').pat;
      g.scale(4.2, 1.5); g.fillRect(-W / 8.4, 0, W / 4.2, 600);
      g.restore();
    }
    /* cloud between here and the horizon */
    let r = layer(g, 0.55);
    bankFill(g, S.banks.mid, -((t * 6) % 118), Math.sin(t * 0.36 + 1) * 4, '#fff8ea', '#e6b6bc', 676, r[0], r[1]);
    g.restore();

    r = layer(g, 1);
    const xa = r[0], xb = r[1];
    hill(g, y3, xa, xb, '#8eaa86', '#5f8a86', -20);
    tufts(g, y3, 5, '#6d8f70', xa, xb, 10);
    drawThings(g, 3, y3, xa, xb);
    who(g, 3);

    hill(g, y2, xa, xb, '#c2ab63', '#93835e', 360);
    tufts(g, y2, 6, '#a08c4e', xa, xb, 11);
    drawThings(g, 2, y2, xa, xb);
    who(g, 2);

    drawSeaLamps(g, xa, xb);
    if (S.hook) { if (S.hook.beforeSea) S.hook.beforeSea(g, xa, xb); } else if (xa < 700) drawBoat(g);
    drawSeaMist(g, xa, xb);
    if (r[3] > SEA - 240) seaSurface(g, xa, xb);
    if (xa < 700) drawPier(g);
    if (xb > QUAY) {
      hill(g, y1, xa, xb, '#dba777', '#b7806a', 560, QUAY);
      if (xa < QUAY + 60) { P.fill(g, P.box(QUAY, PIER_Y, 30, 900, 0.8, 4), '#b98a70'); g.strokeStyle = 'rgba(90,60,60,0.22)'; g.lineWidth = 2; for (let y = PIER_Y + 30; y < PIER_Y + 420; y += 34) { g.beginPath(); g.moveTo(QUAY, y); g.lineTo(QUAY + 30, y + 2); g.stroke(); } }
      /* cobbles */
      g.strokeStyle = 'rgba(140,90,70,0.3)'; g.lineWidth = 2; g.lineCap = 'round';
      for (let x = Math.max(QUAY + 10, Math.floor(xa / 22) * 22); x < Math.min(xb, 1960); x += 22) { const y = y1(x) + 9 + ((x / 22) % 2) * 6; g.beginPath(); g.moveTo(x - 6, y); g.quadraticCurveTo(x, y - 4, x + 6, y); g.stroke(); }
      drawThings(g, 1, y1, xa, xb);
    }
    who(g, 1);
    drawPostman(g);

    if (S.snap.k > 0.01) P.glow(g, S.snap.x, S.snap.y, 60 + (1 - S.snap.k) * 170, '#fff3c8', S.snap.k * 0.9);
    g.restore();

    /* cloud lapping in front, low down */
    r = layer(g, 1.12);
    if (r[3] > 680) bankFill(g, S.banks.near, ((t * 10) % 118), Math.sin(t * 0.4 + 2) * 5, '#fffaf0', '#dcaabf', 806, r[0], r[1]);
    g.restore();
    r = layer(g, 1.3);
    if (r[3] > 760) bankFill(g, S.banks.front, -((t * 15) % 180), Math.sin(t * 0.45 + 3) * 6, '#fffdf7', '#cfa4c4', 930, r[0], r[1]);
    g.restore();

    if (S.fog > 0.004 && !S.hook) drawFog(g);   /* chapter 1 only; the later chapters borrow this town without its fog */

    /* the evening lays gold over everything */
    g.save(); g.globalCompositeOperation = 'soft-light';
    const warm = g.createLinearGradient(-W / 2, 0, W / 2, 0);
    warm.addColorStop(0, 'rgba(120,110,200,0.22)'); warm.addColorStop(0.5, 'rgba(255,200,130,0.1)'); warm.addColorStop(1, 'rgba(255,196,110,0.4)');
    g.fillStyle = warm; g.fillRect(-W / 2, 0, W, 900);
    g.restore();
    if (!S.hook && S.dusk > 0.003) duskLand(g);

    if (P.cray) {   /* everything sits on the same sheet */
      P.cray = false;
      g.save(); g.globalCompositeOperation = 'multiply'; g.globalAlpha = 0.55; g.fillStyle = P.paper(); g.fillRect(-W / 2, 0, W, 900); g.restore();
    }
    if (S.hook) { if (S.hook.screen) S.hook.screen(g); } else overlay(g);
  };

  function overlay(g) {
    const V = T.view, W = V.W, t = T.time;
    const sp = spot();
    if (sp && !TALK.cur && !S.game) { const [sx, sy] = toScreen(sp[0], sp[1]); P.beacon(g, sx, sy, sp[2] * S.cam.z * 0.8, t, 1, '#fff0c8'); }
    if (S.game) { P.cray = P.look === 'crayon'; if (P.cray) P.crayonize(g); S.game.draw(g, t); P.cray = false; }
    if (S.title.a > 0.01) {
      P.text(g, '1장', 0, 300, { font: 'serif', size: 26, track: 12, color: '#4a4468', alpha: 0.8 * S.title.a });
      P.text(g, '항구', 0, 430, { size: 150, color: '#3d3a5c', alpha: S.title.a, seed: 4 });
    }
    if (S.place.a > 0.01) {
      P.text(g, '마중 나루', 0, 236, { size: 104, color: '#3d3a5c', alpha: S.place.a, seed: 7 });
      P.text(g, 'WELCOME HARBOR', 0, 286, { font: 'serif', size: 19, track: 9, color: '#4a4468', alpha: 0.72 * S.place.a });
    }
    if (S.end.a > 0.01) {
      const a = S.end.a;
      const night = S.dusk > 0.3;   /* she went at dusk: the card is written on the evening sky */
      P.text(g, '1장 끝', 0, 150, { font: 'serif', size: 22, track: 10, color: night ? '#e9e2f2' : '#4a4468', alpha: 0.8 * a });
      P.text(g, '2장 「약속 목록」', 0, 222, { font: 'serif', size: 46, track: 4, color: night ? '#fff4e2' : '#3a3f5c', alpha: a, glow: night ? 'rgba(20,20,60,0.6)' : null });
      g.save(); g.globalAlpha = a; P.fill(g, P.rr(-150, 774, 300, 62, 31), 'rgba(58,63,92,0.78)'); g.restore();
      P.text(g, '이어서 보기', 0, 814, { font: 'serif', size: 26, color: '#fff6e4', alpha: a });
    }
    TALK.draw(g);
  }

  /* ---------- the town on loan ----------
     Later chapters play on this same hill. They borrow the world with their own cast and camera;
     nothing of chapter 1's own business (boat, embrace, the walk) is drawn while a hook is set. */
  /* layers baked for the world are baked in whichever look is chosen */
  const build0 = S.build;
  S.build = function () { P.cray = P.look === 'crayon'; try { build0(); } finally { P.cray = false; } };

  T.world = {
    S, K1, K2, K3,
    C: { SEA, PIER_Y, QUAY, J1, J2, HOUSE, DOOR, STOP, PLOT, LEO_S, MOM_S, SEA_LAMP },
    y1, y2, y3, groundAt, hillOf, surf, HG, toScreen, toWorld, layer, handLamp,
    cam: S.cam,
    /* hook: { people(g, hill), plot(g, x), beforeSea(g, xa, xb), sky(g), screen(g), flags: { bramGone } } */
    borrow(hook) {
      S.build();
      reset();
      S.join1 = true; S.join2 = true; S.gate[1].k = 1; S.gate[2].k = 1; S.r2 = 9999; S.r3 = 9999;
      S.lamps = [{ x: SEA_LAMP, k: 0, ok: true, mist: 0 }];   /* dark, and no one out there, until a chapter says otherwise */
      S.ph = 'lent';
      S.hook = Object.assign({ flags: {} }, hook);
      S.hook.flags = S.hook.flags || {};
    },
    draw(g) { S.draw(g); },
    bell: S.bell,
  };
})();
