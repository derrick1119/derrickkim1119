/* Chapter 3 「꿈」 — three years on. Bram shows him how to saw and warns that the season of storms is
   coming; the frame goes up just in time, and the first storm brings it down in a night. In the morning
   the whole town comes up the hill with a rope, and Pipi gives him a light she found on the beach. Rosa
   asks him to look in the lake with her, at the son she left as a baby with his blanket unfinished, an
   old man now. Then the lake shows Ana worn out, and he spends the one dream he has on her. */
(function () {
  'use strict';
  const T = window.TYT, P = T.P, F = T.F;

  /* the frame, blown down into the grass */
  function fallen(g, S) {
    const W = T.world, PL = T.plot, k = S.fallen || 0;
    if (k < 0.01) return;
    const x0 = PL.HX - 150, y = W.y3(PL.HX);
    g.save(); g.globalAlpha = k;
    [[0, 6, 250, -0.05], [30, 2, 230, 0.08], [-20, 10, 200, -0.12], [140, 4, 180, 0.4], [60, 12, 160, -0.3]].forEach((b) => {
      g.save(); g.translate(x0 + b[0], y + b[1] - 6); g.rotate(b[3]); P.fill(g, P.rr(0, -7, b[2], 13, 4), '#b98a5a'); P.fill(g, P.rr(0, -7, b[2], 4, 2), '#d1a676'); g.restore();
    });
    g.restore();
  }
  /* ---------- the storm ----------
     S.wind (0..1) comes first, then S.dark (cloud cover), then S.storm (rain: a drizzle at 0.15, a downpour at 1).
     S.gust wanders on its own; S.flash and S.bolt are the lightning; S.impact the spray when the frame hits the grass. */
  const hash = (i, k) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };
  const wrap = (x, a, b) => a + ((((x - a) % (b - a)) + (b - a)) % (b - a));
  /* storm cloud across the sky, behind the hills (screen space) */
  function clouds(g, S) {
    const d = S.dark || 0, V = T.view, W = V.W;
    if (d < 0.01) return;
    g.save();
    g.fillStyle = T.rgba('#2c3348', 0.5 * d); g.fillRect(-W / 2, 0, W, 900);
    for (let i = 0; i < 14; i++) {
      const depth = 0.4 + hash(i, 1) * 0.6, w = 260 + hash(i, 2) * 320, h = 80 + hash(i, 3) * 90;
      const x = wrap(-W / 2 + hash(i, 4) * (W + 900) - (S.cloudDX || 0) * depth, -W / 2 - 450, W / 2 + 450), y = 30 + hash(i, 5) * 300;
      const col = T.mix('#323a52', '#5e6684', hash(i, 6) * 0.7 + (S.flash || 0) * 0.3);
      for (let k = 0; k < 4; k++) {
        const cx = x + (k - 1.5) * w * 0.26, cy = y + Math.sin(k * 2.1 + i) * h * 0.18, r = h * (0.62 + 0.3 * hash(i, 7 + k));
        const gr = g.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
        gr.addColorStop(0, T.rgba(col, 0.85 * d * (0.55 + 0.45 * depth))); gr.addColorStop(1, T.rgba(col, 0));
        g.fillStyle = gr; g.fillRect(cx - r, cy - r, r * 2, r * 2);
      }
    }
    g.restore();
  }
  /* rain in three depths, slanting with the wind; leaves first; splashes where it lands; lightning (screen space) */
  const LAYERS = [
    { n: 300, len: 13, w: 1, a: 0.26, v: 640, par: 0.55, c: '#aebbd2' },
    { n: 220, len: 26, w: 1.4, a: 0.38, v: 980, par: 0.85, c: '#c3cde0' },
    { n: 80, len: 50, w: 2.1, a: 0.46, v: 1400, par: 1.2, c: '#d6deec' },
  ];
  function storm(g, S) {
    const s = S.storm || 0, wind = S.wind || 0, gust = S.gust || 0, V = T.view, W = V.W, t = T.time, Wd = T.world;
    /* the whole scene goes dim, grey and blue under the cloud; the evening glow low in the sky is put out */
    if ((S.dark || 0) > 0.01) {
      const d = S.dark, c = Wd.S.cam, zd = 1 + (c.z - 1) * 0.05;
      const gx = (430 - c.x * 0.05) * zd, gy = 450 + (110 - (c.y - 450) * 0.05) * zd, gr = 640 * zd;   /* where the backdrop paints its glow */
      g.save();
      g.globalCompositeOperation = 'saturation'; g.fillStyle = T.rgba('#808080', 0.45 * d); g.fillRect(-W / 2, 0, W, 900);
      g.globalCompositeOperation = 'multiply'; g.fillStyle = T.mix('#ffffff', '#66708f', 0.6 * d); g.fillRect(-W / 2, 0, W, 900);
      const sun = g.createRadialGradient(gx, gy, 20, gx, gy, gr);
      sun.addColorStop(0, T.mix('#ffffff', '#5f6886', 0.7 * d)); sun.addColorStop(1, '#ffffff');
      g.fillStyle = sun; g.fillRect(-W / 2, 0, W, 900);
      g.restore();
      const top = g.createLinearGradient(0, 0, 0, 520); top.addColorStop(0, T.rgba('#161b2a', 0.45 * S.dark)); top.addColorStop(1, T.rgba('#161b2a', 0));
      g.fillStyle = top; g.fillRect(-W / 2, 0, W, 520);
    }
    /* leaves and bits of grass, torn off and carried across */
    if (wind > 0.02) {
      for (let i = 0; i < 30; i++) {
        if (i / 30 > wind) break;
        const sp = 0.6 + hash(i, 11) * 0.8, x = wrap(W / 2 - hash(i, 12) * (W + 200) - (S.leafDX || 0) * sp, -W / 2 - 60, W / 2 + 60);
        const y = 140 + hash(i, 13) * 620 + Math.sin(t * (1.2 + sp) + i) * 40 + Math.sin(x * 0.01 + i) * 24, rot = t * (3 + 4 * sp) * (i % 2 ? 1 : -1) + i;
        g.save(); g.globalAlpha = 0.85 * Math.min(1, wind * 1.6);
        g.translate(x, y); g.rotate(rot); g.scale(1, 0.35 + 0.65 * Math.abs(Math.sin(t * (2 + sp) + i)));   /* tumbling */
        g.fillStyle = ['#c98a4b', '#e0a94a', '#8a9a5b', '#b9532f', '#6b8f5a'][i % 5];
        g.beginPath(); g.ellipse(0, 0, 6 + sp * 3, 2.6 + sp, 0, 0, Math.PI * 2); g.fill();
        g.restore();
      }
    }
    if (s > 0.01) {
      const slant = 0.16 + 0.34 * wind * (0.55 + 0.6 * gust);   /* sideways per unit of fall */
      const fade = Math.min(1, s * 2.2), many = Math.pow(s, 0.75);
      g.save(); g.lineCap = 'round';
      for (const L of LAYERS) {
        const n = Math.floor(L.n * many), len = L.len * (0.45 + 0.55 * s);
        const dl = Math.hypot(slant, 1), ux = -slant / dl, uy = 1 / dl;
        g.strokeStyle = L.c; g.lineWidth = L.w;
        for (let i = 0; i < n; i++) {
          const r1 = hash(i, L.n), r2 = hash(i, L.n + 1), r3 = hash(i, L.n + 2), r4 = hash(i, L.n + 3);
          const v = L.v * (0.85 + 0.3 * r3), y = ((r2 * 1100 + t * v) % 1100) - 100;
          const x = wrap(-W / 2 + r1 * (W + 400) - (S.rainDX || 0) * L.par - y * slant, -W / 2 - 200, W / 2 + 200);
          const sheet = 0.65 + 0.35 * Math.sin(x * 0.0045 + t * 1.6 + L.par * 3);   /* the rain comes in sheets */
          g.globalAlpha = L.a * fade * sheet * (0.6 + 0.4 * r4);
          const l = len * (0.7 + 0.6 * r4);
          g.beginPath(); g.moveTo(x, y); g.lineTo(x + ux * l, y + uy * l); g.stroke();
        }
      }
      /* where it lands: little crowns and rings along the ground, and a haze of spray low down */
      const nS = Math.floor(70 * many);
      g.strokeStyle = '#dfe6f2'; g.fillStyle = '#e6ecf6';
      for (let j = 0; j < nS; j++) {
        const per = 0.32 + hash(j, 21) * 0.3, tt = t + hash(j, 22) * per, cyc = Math.floor(tt / per), age = (tt % per) / per;
        const sx = -W / 2 + hash(j, cyc + 30) * W, wx = Wd.toWorld(sx, 450)[0], sy = Wd.toScreen(wx, Wd.groundAt(wx))[1] + 3 + hash(j, cyc + 31) * 26;
        if (sy > 900 || sy < 0) continue;
        g.globalAlpha = (1 - age) * 0.55 * fade;
        g.lineWidth = 1.2;
        g.beginPath(); g.ellipse(sx, sy, 2 + age * 11, 0.8 + age * 2.6, 0, 0, Math.PI * 2); g.stroke();
        if (age < 0.5) { const h = Math.sin(age * 2 * Math.PI) * 7; g.fillRect(sx - 2 - age * 9, sy - h - 1, 1.6, 1.6); g.fillRect(sx + 1 + age * 9, sy - h * 0.8 - 1, 1.6, 1.6); }
      }
      g.globalAlpha = 1;
      const haze = g.createLinearGradient(0, 560, 0, 900); haze.addColorStop(0, 'rgba(190,200,222,0)'); haze.addColorStop(1, T.rgba('#bec8de', 0.18 * s));
      g.fillStyle = haze; g.fillRect(-W / 2, 560, W, 340);
      g.restore();
    }
    /* the frame hitting the wet grass */
    if ((S.impact || 0) > 0.01) {
      const k = 1 - S.impact, PL = T.plot, z = Wd.S.cam.z;
      g.save(); g.fillStyle = '#e6ecf6';
      for (let i = 0; i < 26; i++) {
        const wx = PL.HX - 150 + hash(i, 41) * 300, base = Wd.toScreen(wx, Wd.y3(wx));
        const vx = (hash(i, 42) - 0.5) * 60, vy = 40 + hash(i, 43) * 50;
        g.globalAlpha = S.impact * 0.8;
        g.fillRect(base[0] + vx * k * z, base[1] - (vy * k - 90 * k * k) * z, 2.2, 2.2);
      }
      g.restore();
    }
    if (S.flash > 0.01) { g.fillStyle = T.rgba('#f4f6ff', S.flash * 0.85); g.fillRect(-W / 2, 0, W, 900); }
    /* lightning: a crooked line from the cloud down toward the hill, and drawn over the white of it */
    const b = S.bolt;
    if (b && b.k > 0.01) {
      const x0 = Wd.toScreen(b.wx, 0)[0], r = T.rng(b.seed);
      const pts = [[x0 + (r() - 0.5) * 120, -10]];
      for (let i = 1; i <= 11; i++) pts.push([pts[i - 1][0] + (r() - 0.5) * 70, -10 + i * (b.to || 470) / 11]);
      g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
      const path = (w, c, a) => { g.strokeStyle = c; g.lineWidth = w; g.globalAlpha = a; g.beginPath(); pts.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.stroke(); };
      path(14, '#a9b8ff', 0.25 * b.k); path(5, '#e8ecff', 0.7 * b.k); path(2, '#ffffff', b.k);
      const br = pts[4]; g.globalAlpha = 0.6 * b.k; g.strokeStyle = '#f0f2ff'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(br[0], br[1]); g.lineTo(br[0] + 40, br[1] + 50); g.lineTo(br[0] + 30, br[1] + 96); g.stroke();
      g.restore();
    }
  }
  /* Leo through the storm. S.mood: look (the sky) · brace (in the rain) · flinch · stare · broken */
  function stormPose(S) {
    return (o, a, t) => {
      const m = S.mood, gust = S.gust || 0, u = a.s / 100, f = a.flip ? -1 : 1;
      if (m === 'broken' && a.sit > 0.3) {
        /* sunk down by what is left of it: knees up, arms round them, head down on them, crying */
        const cry = S.cry || 0, sob = Math.pow(Math.max(0, Math.sin(t * 4.2)), 2) * cry;
        o.lean = 0.44 + sob * 0.05; o.headTilt = 0.58 + sob * 0.06; o.headDy = 1.2;
        o.armF = { hand: [23, -2 + sob * 1.5] }; o.armB = { hand: [21, 1 + sob] };
        o.face.eye = sob > 0.8 ? 'closed' : 'sad'; o.face.mouth = 'frown'; o.face.blush = 0.3;
        o.face.tear = 0.95 * cry; o.face.tearY = (t * 1.7) % 3.6;
        return;
      }
      if (a.moving && m !== 'stare' && m !== 'broken') { o.headTilt = -0.14; return; }   /* walking out, an eye on the sky */
      if (m === 'stare' || m === 'broken') {
        o.headTilt = 0.16; o.lean = a.moving ? 0.08 : 0.03;
        if (!a.moving) { o.armF = { a: 0.08, b: 0.12 }; o.armB = { a: 0.04, b: 0.12 }; }
        o.face.eye = 'sad'; o.face.mouth = 'line'; o.face.tear = 0.3 * (S.cry || 0);
        return;
      }
      if (m === 'flinch') { o.lean = -0.14; o.headTilt = -0.08; o.armF = { a: 2.2, b: 1.0 }; o.armB = { a: 1.9, b: 0.9 }; o.face.eye = 'open'; o.face.mouth = 'open'; return; }
      if (m === 'brace') {
        /* head down into it, an arm up against the rain, the other hand holding his collar shut */
        o.lean = 0.14 + gust * 0.08; o.headTilt = 0.2 + gust * 0.05;
        o.armF = { hand: F.local(o, o.x + f * u * 13, o.y - u * 45), bend: 1 };
        o.armB = { hand: F.local(o, o.x + f * u * 7, o.y - u * 28) };
        o.face.eye = 'closed'; o.face.mouth = 'line';
        return;
      }
      /* look: the wind getting up, his hand on his hat, watching the sky */
      o.lean = 0.02 + gust * 0.05 * (S.wind || 0); o.headTilt = -0.24 + Math.sin(t * 0.9) * 0.04;
      o.armF = { hand: F.local(o, o.x + f * u * 4, o.y - u * 50), bend: 1 }; o.armB = { a: 0.3, b: 0.4 };
      o.face.mouth = null;
    };
  }

  T.stage('ch3', {
    chapter: 3, title: ['3장', '꿈'], end: ['3장 끝', '4장 「이웃들」'], next: 'ch4', pad: 2,
    plot: { stage: 1, stones: 4, board: true, table: true },
    build() { T.scenes.kitchen.build(); T.scenes.home.build(); },
    onHill(g, h, S) { if (h === T.world.hillOf(T.plot.HX)) fallen(g, S); },
    sky(g, S) { clouds(g, S); },
    after(g, S) { storm(g, S); },
    update(dt, S) {
      S.flash = Math.max(0, (S.flash || 0) - dt * 2.4);
      if (S.bolt) S.bolt.k = Math.max(0, S.bolt.k - dt * 3.2);
      const w = S.wind || 0, t = T.time;
      S.gust = T.clamp(0.5 + 0.5 * T.noise(t * 0.45, 7) + 0.25 * T.noise(t * 1.7, 9));
      S.rainDX = (S.rainDX || 0) + dt * 260 * w * (0.5 + S.gust);
      S.leafDX = (S.leafDX || 0) + dt * (160 + 420 * S.gust) * w;
      S.cloudDX = (S.cloudDX || 0) + dt * (14 + 46 * w);
      const ps = S.ps;
      if (ps) {
        ps.overcast = S.dark || 0;
        if (!S.collapse && ps.stage === 2) ps.sway = w > 0.01 ? w * (0.012 + 0.03 * S.gust) * Math.sin(t * 3.3) + w * w * 0.012 * S.gust : 0;
      }
    },
    script: async function (X) {
      const W = T.world, C = W.C, PL = T.plot, S = X.S, ps = S.ps, A = X.A, TALK = X.TALK;
      const [px, py] = X.place.plot();
      S.fallen = 0; S.storm = 0; S.flash = 0;
      T.state.dream = Object.assign({ scent: true }, T.state.dream || {});
      /* the scent came up out of the lake in chapter 2 */
      X.cam(px, py, 1); X.camSnap();
      const leo = X.actor('leo', { x: PL.HX + 30, style: F.leoAt(0) });
      leo.pose = (o, a, t) => { if (!a.moving && !a.push && !a.sit) { o.armF = { a: 1.3 + Math.sin(t * 2.4) * 0.3, b: 0.4 }; o.headTilt = 0.1; } };
      X.title();
      await X.wait(4.2);
      await X.years(1, 3, { age: 39 });

      /* ---- the saw ---- */
      const bram = X.actor('bram', { x: C.PLOT - 560, style: F.styles.bram, s: 144, lean: 0.08 });
      bram.prop = (g, j) => { g.save(); g.translate(j.handF[0], j.handF[1]); g.rotate(-0.5); P.fill(g, P.rr(-70, -8, 150, 16, 7), '#b98a5a'); g.restore(); };
      await X.walk(bram, PL.HX - 200, 74);
      bram.flip = false; bram.prop = null; leo.pose = null; leo.flip = true;
      await TALK.say('bram', '기둥 될 나무는 바다에서 건져 왔네.');
      await TALK.say('bram', '곧 바람 철이야.\n그 전에 뼈대는 세워 둬야지.');
      await TALK.say('bram', '배 짓는 거나 집 짓는 거나, 나무 켜는 건 똑같아.\n밀 때 힘 주고, 당길 땐 쉬고.');
      T.announce('나무 켜기. 왼쪽과 오른쪽을 번갈아 눌러 통나무를 켠다.');
      /* the sawing place is down the slope from the plot: he walks over to the log, and Bram turns to watch */
      const SAW = PL.HX - 340;
      X.cam(SAW - 30, W.groundAt(SAW) - 190, 1.25);
      await X.walk(leo, SAW - 118, 120);
      leo.flip = false; bram.flip = true;
      await X.play(T.puzzle.saw({ logs: 2, strokes: 8, leo, at: SAW }));
      X.cam(px, py, 1);
      await TALK.say('bram', '손이 제법이야.');
      /* and in return, a hand with his boat */
      await TALK.say('bram', '그 손 좀 빌리세.\n배 판자 휘는 건 혼자선 어려워.');
      const SLIP = 900;
      await X.dip(async () => { leo.x = SLIP - 172; leo.flip = true; leo.pose = (o) => { o.armF = { a: 1.05, b: 0.35 }; o.armB = { a: 0.9, b: 0.35 }; o.lean = 0.16; }; bram.x = SLIP + 150; bram.flip = true; X.cam(SLIP, W.groundAt(SLIP) - 170, 1.15); X.camSnap(); });
      T.announce('브램의 배터. 판자를 김에 쬐어 휘어서 배의 늑골에 두른다. 판자마다 알맞은 때가 더 짧아진다.');
      await X.play(T.puzzle.steam({ at: () => { const q = W.toScreen(SLIP, W.groundAt(SLIP) - 70); return [q[0], q[1], S.cam.z * 0.9]; }, bands: [[0.48, 0.82, 0.34], [0.55, 0.8, 0.4], [0.6, 0.78, 0.46]] }));
      await TALK.say('bram', '마르타 오는 날,\n이 배 띄우는 것 좀 거들어 주게.');
      await TALK.say('leo', '네. 꼭요.');
      await X.dip(async () => { leo.x = PL.HX + 30; bram.x = PL.HX - 200; bram.flip = false; X.cam(px, py, 1); X.camSnap(); });

      /* ---- the frame ---- */
      const push = (o) => { o.armF = { a: 1.9, b: 0.3 }; o.armB = { a: 1.7, b: 0.3 }; o.lean = 0.2; };
      T.announce('뼈대 세우기. 풀밭에 놓인 나무 일곱 개를, 서로 받쳐 주는 차례대로 세운다.');
      await X.tap(() => [PL.HX, W.y3(PL.HX) - 30, 60]);
      leo.x = PL.HX - 150; leo.flip = false; bram.x = PL.HX + 160; bram.flip = true;
      leo.pose = push; bram.pose = push;
      await X.play(T.puzzle.frame());
      for (let i = 0; i < 3; i++) { A.sfx('knock', i / 3); X.note(); X.tween(ps, 'raise', (i + 1) / 3, 0.5, T.ease.out); await X.wait(0.55); }
      ps.stage = 2; ps.raise = 0; leo.pose = null; bram.pose = null;
      T.announce('집의 뼈대가 선다.');
      A.motif({ voice: 'box', vel: 0.36, beat: 0.7 });
      await X.wait(1.2);
      await TALK.say('bram', '바람 오기 전에 섰으니,\n됐다.');
      await X.wait(0.6);
      X.walk(bram, C.PLOT - 600, 80).then(() => { bram.hidden = true; });
      await X.wait(1.6);

      /* ---- Pipi's seeds: the first garden, on the slope below the plot ---- */
      const kid0 = X.actor('kid', { x: C.PLOT - 640, style: F.styles.kidA, s: 100 });
      kid0.pose = (o, a, t) => { if (!a.moving) { o.armF = { a: 1.4 + Math.sin(t * 6) * 0.2, b: 0.6 }; o.face.eye = 'happy'; } };
      await X.walk(kid0, PL.HX - 110, 110);
      leo.flip = true;
      await TALK.say('kid', '아저씨, 토마토 씨앗.\n엄마랑 베란다에서 키우던 거야.');
      await TALK.say('kid', '빨간 거 열리면 엄마 주기로 했는데…\n그 전에 내가 여기 왔어.');
      await TALK.say('leo', '그럼 여기서 키우자.\n엄마 오시면 드리게.');
      const GZ = T.puzzle;
      await X.dip(async () => {
        kid0.pose = null;
        ps.site = true;   /* he has cleared the slope for it */
        leo.x = GZ.PATCH_X + 230; leo.flip = true; kid0.x = GZ.PATCH_X + 275; kid0.flip = true;
        const q = GZ.patchCam(); X.cam(q[0], q[1], GZ.PATCH_Z); X.camSnap();
      });
      await TALK.say('leo', '빗물을 받아서,\n고랑마다 나눠 주면 돼.');
      T.announce('텃밭 물길 내기. 판자를 눌러 기울이고, 물통을 눌러 빗물을 붓는다. 고랑마다 팻말의 물방울 수만큼만 들어가야 한다.');
      await X.play(GZ.trough({ which: 0 }));
      ps.patch = 1; ps.fruit = 0.35;
      A.sfx('star', 0.4);
      await TALK.say('kid', '싹 났다!\n아저씨, 이거 언제 빨개져?');
      await TALK.say('leo', '여름 한 번 지나면.\n…기다리는 건 우리가 잘하잖아.');
      await TALK.say('kid', '바람이 차가워졌다.\n엄마가 이러면 비 온댔는데.');
      await X.dip(async () => { leo.x = PL.HX + 30; leo.flip = false; kid0.hidden = true; X.cam(px, py, 1); X.camSnap(); });

      /* ---- that night, the storm ----
         it comes on the way storms do: the wind first, then the cloud and the dark, a few drops, the rain,
         thunder a long way off, and then the one that is not far off at all */
      X.bed(null);
      T.announce('그날 밤, 폭풍이 몰려온다.');
      S.mood = 'look'; S.cry = 0; S.wind = 0; S.dark = 0; S.storm = 0;
      S.gradeK = () => 1 - 0.8 * (S.dark || 0);   /* no warm evening light or drifting motes under storm cloud */
      leo.pose = stormPose(S);
      X.tween(ps, 'night', 0.45, 5); X.tween(S, 'wind', 0.45, 4);
      A.ambience(0.34, 0.6, 0.08); A.sfx('wind');
      await X.walk(leo, PL.HX + 260, 70);
      leo.flip = true;
      await X.wait(2.2);
      A.sfx('wind');
      X.tween(S, 'dark', 1, 6); X.tween(ps, 'night', 0.82, 6); X.tween(S, 'wind', 0.7, 5);
      await X.wait(3);
      X.tween(S, 'storm', 0.16, 3, T.ease.lin);   /* the first drops */
      await X.wait(3.4);
      A.ambience(0.5, 1, 0.4); A.sfx('wind');
      X.tween(S, 'storm', 0.55, 3.5); X.tween(S, 'wind', 0.85, 3);
      S.mood = 'brace';
      await X.wait(2.8);
      S.flash = 0.3; S.bolt = { k: 0.6, wx: PL.HX - 900, seed: 3, to: 330 };   /* far off */
      X.wait(0.9).then(() => A.sfx('thunder'));
      X.tween(S, 'storm', 1, 3); X.tween(S, 'wind', 1, 3);
      await X.wait(3.4);
      A.sfx('wind');
      await X.wait(1.8);
      /* the strike, close: the frame goes over */
      S.bolt = { k: 1, wx: PL.HX - 40, seed: 9, to: 470 }; S.flash = 0.8; A.sfx('thunder');
      await X.wait(0.25);
      A.sfx('knock', 0); A.sfx('knock', 0.2);
      S.mood = 'flinch'; S.collapse = true; ps.stage = 1; ps.raise = 1;
      T.announce('번개가 친다. 집의 뼈대가 무너져 풀밭에 쓰러진다.');
      X.tween(ps, 'sway', 0.9, 1.1, T.ease.in);
      X.wait(0.75).then(() => X.tween(S, 'fallen', 1, 0.35));
      await X.tween(ps, 'raise', 0, 1.1, T.ease.in);
      ps.sway = 0; S.collapse = false; S.impact = 1; X.tween(S, 'impact', 0, 0.8, T.ease.lin); A.sfx('knock', 0.4);
      await X.wait(1.1);
      S.mood = 'stare';
      /* past its worst: the rain eases a little and the cloud thins enough to see him by his own lantern */
      X.tween(S, 'storm', 0.72, 4); X.tween(S, 'wind', 0.6, 4); X.tween(S, 'dark', 0.55, 6); X.tween(ps, 'night', 0.66, 6);
      await X.wait(1.6);
      await X.walk(leo, PL.HX + 160, 34);
      ps.spot = [PL.HX + 160];
      /* he sits down where he is, and it comes out of him */
      X.tween(leo, 'sit', 1, 1.6);
      S.mood = 'broken'; X.tween(S, 'cry', 1, 2.4);
      X.cam(PL.HX + 130, W.y3(PL.HX + 160) - 70, 2.1, 0.7);
      await X.wait(3.6);
      await TALK.say('leo', '…삼 년을 지은 건데.', { slow: true });
      await X.wait(1.2);
      await TALK.say('leo', '아나 오면,\n비라도 안 맞게 하려고….', { slow: true });
      await X.wait(2);

      /* ---- morning: everyone, with a rope ---- */
      await X.dip(async () => { ps.night = 0; S.storm = 0; S.wind = 0; S.dark = 0; S.cry = 0.2; S.bolt = null; ps.sway = 0; ps.overcast = 0; ps.spot = null; X.cam(px, py, 1, 2); X.camSnap(); A.ambience(0.3, 0.3, 0.15); }, { color: '#fff6e6', out: 1.6, in: 1.6 });
      X.bed(0, 0.13, 'walk');
      T.announce('아침. 비가 그쳤다. 언덕 아래에서 사람들이 올라온다.');
      const crew = [
        X.actor('mom', { x: C.PLOT - 600, style: F.styles.mom, s: C.MOM_S, lean: 0.1 }),
        X.actor('bram2', { x: C.PLOT - 680, style: F.styles.bram, s: 144, lean: 0.08 }),
        X.actor('rosa', { x: C.PLOT - 760, style: F.styles.rosa, s: 138 }),
        X.actor('v1', { x: C.PLOT - 840, style: F.styles.villagerA, s: 142 }),
        X.actor('kid', { x: C.PLOT - 900, style: F.styles.kidA, s: 100 }),
      ];
      crew[1].prop = (g, j) => { g.save(); g.translate(j.handF[0], j.handF[1] + 6); g.strokeStyle = '#e6d6b0'; g.lineWidth = 4; for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(0, 0, 14 - i * 2, 20 - i * 3, 0.3, 0, Math.PI * 2); g.stroke(); } g.restore(); };
      crew.forEach((a, i) => X.walk(a, PL.HX - 160 - i * 62, 82 + i * 4));
      await X.wait(4.2);
      leo.pose = null; X.tween(leo, 'sit', 0, 0.8); leo.flip = true;
      await X.wait(1.2);
      await TALK.say('rosa', '밤새 바람이 엄청났지.');
      await TALK.say('bram', '줄 가져왔네.\n혼자 끙끙대지 말고.');
      await TALK.say('kid', '나도 당길래!');
      await TALK.say('mom', '다 같이 하면 금방이야.');
      T.announce('다 같이 당기기. 하나, 둘, 셋 구령의 셋에 맞춰 눌러 다 함께 줄을 당긴다.');
      /* everyone takes the rope, in a line down the hill from the fallen frame */
      const pullers = [leo].concat(crew);
      crew[1].prop = null;
      await X.dip(async () => { pullers.forEach((a, i) => { a.go = null; a.moving = false; a.sit = 0; a.x = PL.HX + 190 + i * 62; }); X.cam(PL.HX + 200, py + 10, 1.0); }, { out: 0.6, in: 0.8 });
      await X.play(T.puzzle.heave({ pulls: 3, crew: pullers, top: () => [PL.HX, W.y3(PL.HX) - 30 - 200 * Math.max(0.05, ps.raise)], raise: (k) => { ps.raise = Math.max(0.02, k); S.fallen = T.clamp(1 - k * 1.5); } }));
      S.fallen = 0; ps.stage = 2; ps.raise = 0; X.cam(px, py, 1);
      A.sfx('knock', 0.4); X.notes(4);
      T.announce('뼈대가 다시 선다. 사람들이 손뼉을 친다.');
      const clap = (o, a, t) => { o.armF = { a: 1.35 + Math.sin(t * 16 + a.x) * 0.16, b: 1.1 }; o.armB = { a: 1.2 - Math.sin(t * 16 + a.x) * 0.16, b: 1.1 }; o.face.eye = 'happy'; };
      crew.forEach((a) => { a.pose = clap; });
      await X.wait(2.4);
      crew.forEach((a) => { a.pose = null; });
      await TALK.say('leo', '…고맙습니다.');
      await TALK.say('kid', '아저씨, 이거.\n바닷가에서 주운 빛이야.');
      await TALK.say('kid', '누가 별똥별 보고 빈 소원이래.\n어두운 데 갈 때 써.');
      await X.gift('light', [0, 520]);
      await TALK.say('rosa', '고마우면 나랑 호수 좀 같이 가 줘.\n오늘은 혼자 보기가 좀 그래서.');

      /* ---- Rosa's son ---- */
      X.walk(crew[2], C.PLOT + 420, 84);
      await X.wait(0.4);
      X.walk(leo, C.PLOT + 380, 84);
      await X.wait(1.6);
      const lake = T.lake({
        paint: T.vig.rosa, leo: F.leoAt(0), shore: true, cover: { k: 0 },
        rhText: '로사는 요람 옆 빈 걸상에, 실바구니는 요람 발치에, 등불은 어두운 창에. 좌우로 끌어 점선에 맞춰 보세요',
        things: [
          { kind: 'lamp', id: 'lamp', x: 60, at: [-410, 300] },
          { kind: 'who', id: 'rosa', style: F.styles.rosa, x: 330, at: [-265, 748], flip: false, lockFlip: false, turn: false, ps: 340,
            prop: (g, j, lo, t, L) => { if (L.lit.rosa < 0.5) return; const k = L.hum || 0, a = Math.sin(t * (k > 0 ? 9 : 3)) * 0.2; g.save(); g.translate(j.handF[0], j.handF[1]); P.line(g, -14, -14 - a * 10, 14, 10, 2.4, '#c9c3ba'); P.line(g, 14, -14 + a * 10, -14, 10, 2.4, '#c9c3ba'); P.fill(g, P.rr(-12, 4, 24, 12, 3), '#e9c45a'); g.restore(); } },
          { kind: 'yarn', id: 'yarn', x: -300, at: [-36, 804],
            bank: (g, x) => { P.fill(g, P.rr(x - 26, 196, 52, 32, 8), '#a57d58'); for (let i = 0; i < 3; i++) P.fill(g, P.circle(x - 14 + i * 14, 194 - (i % 2) * 6, 11), ['#e9c45a', '#c9573f', '#7fb0c9'][i]); },
            ghost: (g, x, dy, near, lit) => { if (lit > 0.97) return; g.globalAlpha = (0.4 + 0.3 * near) * (1 - lit); P.fill(g, P.circle(x, dy - 4, 14), '#101c33'); P.line(g, x - 8, dy - 18, x + 8, dy + 6, 2.4, '#101c33'); } },
        ],
      });
      await X.view(lake, { color: '#1b2a40' });
      X.age('로사의 아들, 72');
      T.announce('거울 호수. 늙은 남자가 안락의자에서 졸고 있다. 요람에는 아기가 잠들어 있다. 벽에는 젊은 로사의 사진.');
      await TALK.say('rosa', '백일도 못 넘기고 두고 왔어.\n그 애가 벌써 할아버지가 됐네.');
      T.announce('물그림자 맞추기. 로사는 빈 의자에, 실바구니는 요람 옆에, 등불은 창에.');
      await lake.rhyme();
      await X.wait(1.2);
      /* the baby wakes, and he rocks the cradle */
      lake.beat = 1; A.sfx('step');
      T.announce('아기가 깬다. 할아버지가 요람을 흔든다.');
      await X.wait(2.2);
      await TALK.say('rosa', '아이고, 울지 마라….');
      lake.beat = 2; lake.note = '그가 자장가를 흥얼거린다. 로사를 눌러 같이 흥얼거려 주세요';
      const rosaAt = () => [lake.things[1].x, 150, 64];
      for (let i = 0; i < 4; i++) { await X.tap(rosaAt, { screen: true }); lake.hum = 1; X.note({ voice: 'felt', vel: 0.4 }); await X.wait(0.6); lake.hum = 0; }
      lake.note = null;
      lake.beat = 3;
      T.announce('아기가 잠든다. 그가 낡은 담요를 꺼내 아기를 덮어 준다.');
      await X.wait(1.4);
      await X.tween(lake.cover, 'k', 1, 1.8);
      lake.beat = 4;
      await X.wait(0.6);
      await TALK.say('rosa', '저 담요… 백일 날 덮어 주려던 거야.\n끝도 못 맺고 왔는데.');
      await TALK.say('rosa', '아직도 덮어 주고 있네.', { slow: true });
      await TALK.say('rosa', '그 애 오면, 다 뜬 걸로 덮어 줄 거야.\n다 늙어서 오겠지만.');
      await TALK.say('rosa', '그래도 난 단번에 알아볼 거야.');
      await TALK.say('rosa', '이거 가져가. 저 자장가 한 소절.');
      await TALK.say('leo', '…아나도 릴리 재울 때 이 노래 불렀어요.');
      await X.gift('sound', [lake.things[1].x, 160]);
      await TALK.say('rosa', '처음부터 다시 뜨는데,\n저 줄무늬가 자꾸 헷갈려.');
      await TALK.say('leo', '같이 떠요. 제가 같이 봐 둘게요.');
      await X.wait(0.8);

      /* ---- Ana ---- */
      const lake2 = T.lake({ paint: T.vig.tired, leo: F.leoAt(0), mom: true, i: 0 });
      await X.view(lake2, { color: '#1b2a40' });
      await TALK.say('mom', '너도 아나 보고 가렴.');
      T.announce('호수에 물결이 인다. 고리 셋을 눌러 돌려 비친 모습을 맞춘다.');
      await lake2.calm({ start: [2, 5, 7] });
      X.age('아나, 39');
      T.announce('호수에 비친 아나는 지쳐 있다. 늦게까지 이어지는 일, 잠든 아이, 혼자 보내는 밤.');
      await X.wait(2.6);
      let sent = false;
      S.trayHold = true; X.tween(S.tray, 'a', 1, 0.5);
      await TALK.say('mom', '아는 냄새, 아는 소리,\n길을 비출 빛. 다 모였구나.');
      await TALK.say('mom', '쓰고 나면 또 모으면 돼.\n오늘이 쓸 날이구나.');
      S.trayHold = false; X.tween(S.tray, 'a', 0, 1.2); X.spendDream();
      const dreamt = lake2.offerMote().then(() => { sent = true; });
      for (let i = 0; i < 3 && !sent; i++) {
        if (i > 0) { await X.tween(lake2.fade, 'a', 0, 0.7); lake2.i = i; lake2.amp = 1; await X.tween(lake2.fade, 'a', 1, 0.9); X.note({ voice: 'felt', vel: 0.3 }); }
        if (i < 2) await Promise.race([dreamt, X.tap(() => [60, 560, 140], { screen: true })]);
        else await dreamt;
        X.clearSpot();
      }
      await dreamt;
      A.sfx('whoosh');
      T.announce('레오가 아껴 둔 꿈을 호수에 띄운다. 빛이 물속으로, 잠든 아나에게로 가라앉는다.');
      await X.wait(0.8);

      /* ---- the dream ---- */
      const D = T.dream();
      await X.view(D, { color: '#1b2440', out: 1.2, in: 0.4 });
      T.announce('꿈. 빛이 소용돌이치며 가라앉고, 둘이 처음 살던 좁은 집이 물 위에 뜬 것처럼 흔들린다.');
      A.sfx('whoosh');
      await X.tween(D.fall, 'k', 1, 3.6, T.ease.lin);
      await X.wait(0.8);
      T.announce('꿈속의 방. 컵, 공책, 사진, 시계, 화분이 공중에 떠 있다. 하나씩 눌러 제자리로 돌린다.');
      await D.gather();
      X.tween(D.settle, 'k', 1, 2);
      await X.wait(0.6);
      await X.tap(D.spot, { screen: true });
      X.tween(D, 'enterA', 1, 0.8);
      await X.tween(D.near, 'k', 1, 3.2, T.ease.io);
      await X.wait(0.6);
      await TALK.say('ana', '혼자서는 못 하겠어.');
      await X.tween(D.lift, 'k', 1, 1.2);
      await TALK.say('leo', '할 수 있어.');
      await TALK.say('leo', '릴리랑 맛있는 거 많이 먹고, 많이 웃고,\n그 얘기 나중에 다 들려줘.');
      X.tween(D.chalk, 'k', 1, 6, T.ease.lin);
      for (let i = 0; i < 6; i++) X.wait(i * 0.9).then(() => A.sfx('chalk', i / 6));
      await TALK.say('leo', '그 말, 진짜였어.\n나 거기서 집 짓고 있어.');
      A.motif({ voice: 'felt', vel: 0.42, beat: 0.8 });
      await TALK.say('leo', '천천히 와.', { slow: true });
      await X.tween(D.lean, 'k', 1, 1.6);
      await X.wait(3);

      /* ---- the next morning ---- */
      const lake3 = T.lake({ paint: T.vig.morning, leo: F.leoAt(0), warm: true, leoFace: { mouth: 'smile', eye: 'happy' } });
      await X.view(lake3, { color: '#fff6e6', out: 1.8, in: 1.6 });
      T.announce('다음 날 아침. 아나가 릴리의 머리를 묶어 주며 오랜만에 웃는다.');
      X.bed(0, 0.13, 'walk');
      X.notes(4, { vel: 0.3 });
      await X.wait(6.5);

      /* ---- back on the hill ---- */
      S.actors = S.actors.filter((a) => a === leo);
      leo.x = PL.HX - 120; leo.flip = false; leo.sit = 0; leo.pose = null;
      await X.view(null, { color: '#fff6e6' });
      leo.pose = (o, a, t) => { o.armF = { a: 1.3 + Math.sin(t * 2.4) * 0.3, b: 0.4 }; o.headTilt = -0.1; o.face.eye = 'happy'; };
      T.announce('언덕 위, 다시 선 뼈대.');
      A.motif({ voice: 'box', vel: 0.36, beat: 0.7 });
      await X.wait(3);
      X.end();
    },
  });
})();
