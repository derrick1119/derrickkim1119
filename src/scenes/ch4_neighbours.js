/* Chapter 4 「이웃들」 — years five to fifteen. Bean comes, not by boat but down the rainbow bridge,
   and the lake shows the girl he left: walking home from school in the rain with his collar, then on the
   back step. Pipi meets Bean, and Bean meets the tomatoes. Bram asks Leo to look with him at the wife he
   left at thirty-two; a year later she comes, he takes her out on his own boat as he promised, and the two
   of them cross. Rosa's baby arrives with white hair, and she wraps him in the blanket she has finished.
   That night the lake shows Ana her first grey hair, and his own face beside it. */
(function () {
  'use strict';
  const T = window.TYT, P = T.P, F = T.F;

  const wave = (o, a, t) => { o.armF = { a: 2.4 + Math.sin(t * 9 + a.x) * 0.25, b: 0.3 }; o.face.eye = 'happy'; };
  const cane = (g, j, o) => { const gy = T.world.groundAt(o.x); P.line(g, j.handF[0], j.handF[1], j.handF[0] + (o.flip ? -8 : 8), gy, 3, '#6b4f52'); };
  /* the rainbow bridge, from out of the sky to the end of the pier; Bean runs down it */
  const RB = [[-760, -40], [-560, 160], [-40, 420]];   /* start, control, landing (world, on the quay's hill) */
  const rbAt = (u) => { const a = RB[0], c = RB[1], b = RB[2], v = 1 - u; return [v * v * a[0] + 2 * v * u * c[0] + u * u * b[0], v * v * a[1] + 2 * v * u * c[1] + u * u * b[1]]; };
  function rainbow(g, S) {
    const r = S.rb;
    if (!r || r.a < 0.01) return;
    const t = T.time, W = T.world;
    W.layer(g, 1);
    g.save(); g.globalAlpha = r.a * 0.75; g.lineCap = 'round';
    ['#e98a8a', '#f0b26a', '#f2dc7a', '#9fcf86', '#86b8de', '#a796d8'].forEach((c, i) => {
      g.strokeStyle = c; g.lineWidth = 9; g.beginPath();
      const off = (i - 2.5) * 9, a = RB[0], c2 = RB[1], b = RB[2];
      g.moveTo(a[0] + off, a[1] - off); g.quadraticCurveTo(c2[0] + off, c2[1] - off, b[0] + off * 0.3, b[1] - off * 0.3); g.stroke();
    });
    g.restore();
    P.glow(g, RB[2][0], RB[2][1], 90, '#fff6e0', 0.5 * r.a);
    if (r.run > 0 && r.run < 1) {
      const u = r.run, q = rbAt(u), q2 = rbAt(Math.min(1, u + 0.02)), rot = Math.atan2(q2[1] - q[1], q2[0] - q[0]);
      for (let i = 0; i < 6; i++) P.glow(g, q[0] - Math.cos(rot) * i * 18, q[1] - Math.sin(rot) * i * 18 - 10, 14 - i * 2, '#fff6e0', 0.6 - i * 0.09);
      F.dog(g, { x: q[0], y: q[1] - 4, s: 220, walk: t * 18, rot: rot * 0.8, wag: Math.sin(t * 20), flip: false });
    }
    g.restore();
  }

  T.stage('ch4', {
    chapter: 4, title: ['4장', '이웃들'], end: ['4장 끝', '5장 「꽃길」'], next: 'ch5', pad: 1, nextColor: '#fff6e6',
    plot: { stage: 2, stones: 4, board: true, table: true, tree: 0.1, patch: 1, fruit: 0.3 },
    build() { T.scenes.kitchen.build(); },
    onHill(g, h, S) {
      if (h !== 1 || !S.rope) return;
      const b = S.rope.boat, y = T.world.surf(b.x) - 34;
      g.strokeStyle = '#d9c9a8'; g.lineWidth = 3; g.lineCap = 'round';
      g.beginPath(); g.moveTo(b.x + 196, y - 70); g.quadraticCurveTo((b.x + 212) / 2 + 16, T.world.C.PIER_Y + 10, 16, T.world.C.PIER_Y - 28); g.stroke();
    },
    after(g, S) { rainbow(g, S); },
    script: async function (X) {
      const W = T.world, C = W.C, PL = T.plot, S = X.S, ps = S.ps, A = X.A, TALK = X.TALK;
      const PIER = C.PIER_Y;
      const [px, py] = X.place.plot();
      S.rb = { a: 0, run: 0 }; RB[2][1] = C.PIER_Y - 2;
      X.cam(px, py, 1); X.camSnap();
      let leo = X.actor('leo', { x: PL.HX + 150, style: F.leoAt(0), flip: true });
      leo.pose = (o, a, t) => { if (!a.moving) { const sw = Math.max(0, Math.sin(t * 5.6)); o.armF = { a: 1.2 + sw * 0.9, b: 0.8 - sw * 0.6 }; } };
      X.title();
      await X.wait(4.2);
      await X.years(3, 5, { age: 41, during: (d) => X.tween(ps, 'tree', 0.25, d) });

      /* ---- a rainbow over the cloud sea ---- */
      let mom = X.actor('mom', { x: PL.HX - 120, style: F.styles.mom, s: C.MOM_S, lean: 0.1 });
      await X.wait(1.4);
      A.sfx('star', 0.2); A.sfx('star', 0.6);
      leo.pose = null; leo.flip = true; mom.flip = true;
      T.announce('구름바다 위로 무지개가 선다. 하늘에서 부두 끝까지.');
      await TALK.say('mom', '저건… 무지개 다리구나.');
      await TALK.say('mom', '짐승들은 배를 안 타고,\n저리로 달려온단다.');
      X.walk(leo, PL.HX - 420, 110);
      await X.wait(1.4);
      const crowd = [];
      /* to the quay, and the years that go by before the next time */
      const quay = async (from, to, set) => {
        await X.dip(async () => {
          S.actors = []; S.boats = []; S.rope = null; crowd.length = 0;
          if (S.view) { S.view = null; if (S.bedNow) A.bed(S.bedNow[0], S.bedNow[1], S.bedNow[2]); }   /* coming away from the lake */
          const [qx, qy] = X.place.quay(); X.cam(qx, qy, 1.05); X.camSnap();
          set();
        });
        if (to > from) await X.years(from, to, { age: 36 + to });
      };
      let bean;
      await quay(5, 5, () => {
        leo = X.actor('leo', { x: 420, style: F.leoAt(0), flip: true });
        mom = X.actor('mom', { x: 360, style: F.styles.mom, s: C.MOM_S, lamp: true, lampHand: 'F', lean: 0.1, flip: true });
        S.rb.a = 1;
      });
      X.walk(leo, 200, 110);
      await X.wait(1.2);
      /* down he comes */
      A.sfx('whoosh');
      await X.tween(S.rb, 'run', 1, 3.2, T.ease.in);
      bean = X.actor('bean', { dog: true, s: 220, x: RB[2][0] + 20, wag: 1, wagRate: 18 });
      A.sfx('bark'); X.tween(S.rb, 'a', 0, 3);
      T.announce('무지개를 타고 늙은 강아지 한 마리가 달려 내려온다. 빈이다.');
      await X.walk(bean, 30, 260);
      bean.flip = false;
      await X.wait(0.4);
      /* he looks back up the hill at his bare frame */
      leo.pose = (o) => { o.armF = { a: 2.7, b: 2.2 }; o.headTilt = -0.1; }; leo.flip = false;
      await X.wait(1.2);
      leo.flip = true;
      await TALK.say('leo', '아직 집도 다 못 지었는데….');
      await TALK.say('mom', '저 애는 집 보러 온 게 아니라\n너 보러 온 거야.');
      leo.pose = null;
      await X.tap(() => [bean.x, PIER - 30, 56]);
      leo.sit = 0.5;
      leo.pose = (o) => { o.armF = { hand: F.local(o, bean.x + 26, PIER - 34) }; o.armB = { hand: F.local(o, bean.x + 20, PIER - 20) }; o.lean = 0.3; o.face.eye = bean.x > 150 ? 'happy' : 'open'; };
      await X.walk(bean, leo.x - 46, 150);
      X.notes(4); A.sfx('bark', 0.5);
      for (let i = 0; i < 5; i++) { await X.tween(bean, 'jump', 14, 0.16, T.ease.out); await X.tween(bean, 'jump', 0, 0.16, T.ease.in); }
      T.announce('빈이 달려와 레오 품에 안긴다.');
      await X.wait(1.6);
      await TALK.say('leo', '빈… 너 왜 이렇게 늙었어.');
      await TALK.say('mom', '빈도 두고 온 사람이 있지.\n가 보자.');

      /* ---- Bean's lake: Lily walking home from school in the rain, then on the back step with his collar ---- */
      const lakeB = T.lake({
        paint: T.vig.lilyBean, leo: F.leoAt(0), mom: true, shore: true,
        rhText: '빈은 릴리 옆 늘 앉던 계단에, 공은 풀밭에, 등불은 꺼진 현관 등에. 좌우로 끌어 점선에 맞춰 보세요',
        things: [
          { kind: 'dog', id: 'bean', x: -330, at: [140, 634], flip: false, lockFlip: false, ps: 300 },
          { kind: 'ball', id: 'ball', x: 320, at: [-150, 700],
            bank: (g, x) => { P.fill(g, P.circle(x, 212, 15), '#e3b64f'); P.line(g, x - 12, 206, x + 12, 218, 2, '#c99a2a'); },
            ghost: (g, x, dy, near, lit) => { if (lit > 0.97) return; g.globalAlpha = (0.4 + 0.3 * near) * (1 - lit); P.fill(g, P.circle(x, dy - 4, 13), '#101c33'); } },
          { kind: 'lamp', id: 'lamp', x: -60, at: [383, 380] },
        ],
      });
      await X.view(lakeB, { color: '#1b2a40' });
      X.age('릴리, 11');
      T.announce('거울 호수. 비 오는 하굣길, 릴리가 빈의 목걸이를 손에 감고 혼자 걷는다.');
      await TALK.say('leo', '빈이 날마다\n마중 나가던 길이야.');
      /* SLOT: lake-help puzzle — Lily walking home in the rain; Bean's reflection walks beside her */
      await TALK.say('leo', '…오늘도 데려다주는구나, 빈.', { slow: true });
      await X.wait(0.8);
      T.announce('집에 온 릴리가 뒷마당 계단에 주저앉아 목걸이를 끌어안는다. 밥그릇은 아직 그대로다.');
      T.announce('물그림자 맞추기. 빈은 릴리 옆에, 공은 풀밭에, 등불은 현관 등에.');
      await lakeB.rhyme();
      await X.wait(1.2);
      lakeB.beat = 1;
      T.announce('릴리가 휘파람을 분다. 빈을 부르던 소리.');
      for (let i = 0; i < 2; i++) { A.note({ m: 84 + i * 3, vel: 0.24, voice: 'glass', dur: 0.6 }); await X.wait(0.5); }
      lakeB.note = '릴리가 빈을 부른다. 물가의 빈을 눌러 대답해 주세요';
      const beanOn = () => { const q = lakeB.things[0]; return [q.x, 200, 60]; };
      for (let i = 0; i < 2; i++) {
        await X.tap(beanOn, { screen: true });
        A.sfx('bark', i / 2); const q = lakeB.things[0];
        await X.tween(q, 'jump', 18, 0.14, T.ease.out); await X.tween(q, 'jump', 0, 0.16, T.ease.in);
        if (i === 0) { A.note({ m: 84, vel: 0.24, voice: 'glass', dur: 0.6 }); await X.wait(0.4); A.note({ m: 87, vel: 0.24, voice: 'glass', dur: 0.6 }); }
      }
      lakeB.note = null;
      await X.wait(0.6);
      lakeB.beat = 2;
      T.announce('릴리가 눈물을 닦으며 웃는다. 목걸이를 꼭 쥔다.');
      X.notes(3, { voice: 'felt', vel: 0.3 });
      await X.wait(2.2);
      await TALK.say('leo', '…옆에 있는 거, 알았나 봐.', { slow: true });
      await X.wait(0.6);

      /* ---- back up the hill: Pipi meets Bean ---- */
      S.actors = [];
      leo = X.actor('leo', { x: PL.HX + 90, style: F.leoAt(0), flip: true });
      bean = X.actor('bean', { dog: true, s: 220, x: PL.HX + 150, sit: 1, wag: 0.6, flip: true });
      X.cam(px, py, 1); X.camSnap();
      await X.view(null, { color: '#1b2a40' });
      X.bed(3, 0.13, 'walk');
      const pipi = X.actor('kid', { x: PL.HX - 640, style: F.styles.kidA, s: 100 });
      await X.walk(pipi, PL.HX - 250, 130);
      pipi.pose = (o, a, t) => { o.lean = 0.2; o.face.eye = 'happy'; o.armF = { a: 2.6, b: 2.4 }; o.y += Math.sin(t * 9) * 1.5; };
      bean.sit = 0; A.sfx('bark');
      await TALK.say('kid', '강아지다!\n아저씨 강아지야?');
      await TALK.say('leo', '빈이야.\n우리 릴리 강아지.');
      await X.walk(bean, PL.HX - 196, 150);   /* he goes to her */
      pipi.pose = (o, a, t) => { o.armF = { hand: F.local(o, bean.x, W.groundAt(bean.x) - 30) }; o.lean = 0.3; o.face.eye = 'happy'; };
      bean.sit = 1; bean.wag = 1; bean.wagRate = 16;
      T.announce('피피가 빈을 쓰다듬는다. 빈이 꼬리를 세차게 흔든다.');
      await X.wait(1.4);

      /* ---- the second garden: a bed more, and a dog who has never met wet earth ---- */
      await TALK.say('kid', '아저씨, 올해는 고랑 하나 더 파자.\n작년엔 까치가 다 먹었잖아.');
      await TALK.say('leo', '그래. 물길도 하나 더 내고.');
      const GZ = T.puzzle;
      await X.dip(async () => {
        pipi.pose = null; bean.wagRate = null;
        leo.x = GZ.PATCH_X + 230; leo.flip = true; pipi.x = GZ.PATCH_X + 275; pipi.flip = true; bean.x = GZ.PATCH_X + 330; bean.flip = true; bean.sit = 1;
        ps.patchHide = true;
        const q = GZ.patchCam(); X.cam(q[0], q[1], GZ.PATCH_Z); X.camSnap();
      });
      T.announce('텃밭 물길 내기. 고랑이 셋으로 늘었다. 뾰족한 갈림판은 물을 반씩 나눈다.');
      await X.play(GZ.trough({ which: 1 }));
      ps.patch = 2; ps.fruit = 0.5; ps.patchHide = false;
      bean.sit = 0; A.sfx('bark');
      T.announce('젖은 흙 냄새에 빈이 고랑으로 뛰어든다.');
      await X.walk(bean, GZ.PATCH_X - 40, 170);
      for (let i = 0; i < 4; i++) { A.sfx('step'); await X.tween(bean, 'jump', 10, 0.16, T.ease.out); await X.tween(bean, 'jump', 0, 0.16, T.ease.in); }
      ps.fruit = 0.15;
      await TALK.say('kid', '빈! 그거 내 토마토야!');
      await TALK.say('leo', '…내년엔 울타리부터 치자.');
      await X.dip(async () => { leo.x = PL.HX + 90; bean.x = PL.HX + 150; bean.sit = 1; pipi.x = PL.HX - 250; X.cam(px, py, 1); X.camSnap(); });
      /* walls, year after year, with a dog under his feet */
      await X.years(5, 9, { age: 45, during: (d) => { X.tween(ps, 'tree', 0.4, d); X.wait(d * 0.5).then(() => { ps.stage = 3; A.sfx('knock', 0.5); }); } });

      /* ---- Rosa's porch: the new blanket, from memory ---- */
      const PORCH = 2070;
      let rosa0;
      await X.dip(async () => {
        S.actors = S.actors.filter((a2) => a2 !== pipi);
        leo.x = PORCH + 80; leo.flip = true; leo.pose = null; bean.x = PORCH + 140; bean.sit = 1;
        rosa0 = X.actor('rosa', { x: PORCH - 30, style: F.styles.rosa, s: 138, sit: 1 });
        X.cam(PORCH, W.groundAt(PORCH) - 180, 1.15); X.camSnap();
      });
      await TALK.say('rosa', '그 애 담요 줄무늬, 기억나?\n난 자꾸 순서가 헷갈려.');
      T.announce('로사의 담요 뜨기. 호수에서 본 옛 담요의 줄무늬가 잠깐 보였다가 사라진다. 기억한 차례대로 실을 골라 뜬다.');
      await X.play(T.puzzle.knit({ at: () => { const q = W.toScreen(PORCH, W.groundAt(PORCH) - 120); return [q[0], q[1] + 60, S.cam.z * 0.85]; }, rounds: [[0, 1, 2, 1], [2, 0, 3, 1, 0, 2]], show: 3 }));
      await TALK.say('rosa', '됐다. 이제 그 애만 오면 돼.');
      await X.dip(async () => { S.actors = S.actors.filter((a2) => a2 !== rosa0); leo.x = PL.HX + 90; bean.x = PL.HX + 150; X.cam(px, py, 1); X.camSnap(); });

      /* ---- Bram's wife, in the lake ---- */
      let bram = X.actor('bram', { x: C.PLOT - 560, style: F.styles.bram, s: 144, lean: 0.08 });
      await X.walk(bram, PL.HX - 200, 74);
      bram.flip = false; leo.flip = true;
      await TALK.say('bram', '자네, 나랑 호수 좀 같이 가 주겠나.');
      await TALK.say('bram', '오늘이 그 사람 생일이야.');
      X.walk(bram, C.PLOT + 420, 84); await X.wait(0.4); X.walk(leo, C.PLOT + 380, 84); X.walk(bean, C.PLOT + 330, 90);
      await X.wait(1.6);
      const lakeW = T.lake({
        paint: T.vig.bramWife, leo: F.leoAt(0), shore: true,
        rhText: '브램은 마르타 옆 빈 의자에, 배는 옛 배 곁 창턱에, 등불은 꺼진 등대에. 좌우로 끌어 점선에 맞춰 보세요',
        things: [
          { kind: 'who', id: 'bram', style: F.styles.bram, x: 320, at: [148, 734], ps: 300,
            prop: (g, j, lo, t, L) => { if (L.lit.bram < 0.5) return; const k = L.knock ? Math.sin(L.knock * Math.PI) : 0; g.save(); g.translate(j.handF[0], j.handF[1]); g.rotate(-0.6 - k * 0.8); P.line(g, 0, 0, 0, -22, 3, '#8a6442'); P.fill(g, P.rr(-8, -30, 16, 10, 3), '#6f4a34'); g.restore(); } },
          { kind: 'boat', id: 'boat', x: -330, at: [-150, 484],
            bank: (g, x) => { P.line(g, x - 30, 228, x - 22, 204, 4, '#8a6442'); P.line(g, x + 30, 228, x + 22, 204, 4, '#8a6442'); g.save(); g.translate(x, 200); P.fill(g, P.soft([[-42, -14], [42, -14], [52, -20], [42, 6], [-42, 6], [-52, -20]]), '#b07a4a'); P.line(g, 0, -14, 0, -60, 3, '#6f4a34'); g.restore(); },
            ghost: (g, x, dy, near, lit) => { if (lit > 0.97) return; g.globalAlpha = (0.4 + 0.3 * near) * (1 - lit); P.fill(g, P.soft([[x - 26, dy - 8], [x + 26, dy - 8], [x + 30, dy - 10], [x + 24, dy + 3], [x - 24, dy + 3], [x - 30, dy - 10]]), '#101c33'); P.line(g, x, dy - 8, x, dy - 38, 2, '#101c33'); } },
          { kind: 'lamp', id: 'lamp', x: 120, at: [-367, 262] },
        ],
      });
      await X.view(lakeW, { color: '#1b2a40' });
      X.age('마르타, 98');
      T.announce('거울 호수. 바다가 보이는 방, 창가 의자에 아주 늙은 여인이 앉아 있다. 창턱에는 작은 나무배 하나. 옆의 빈 의자.');
      await TALK.say('bram', '서른둘에 두고 왔는데,\n벌써 아흔여덟이야.');
      T.announce('물그림자 맞추기. 브램은 빈 의자에, 배는 창턱에, 등불은 먼 등대에.');
      await lakeW.rhyme();
      await X.wait(1.2);
      lakeW.beat = 1;
      T.announce('마르타가 노래를 흥얼거리며 의자 팔걸이를 두드린다.');
      await X.wait(1.6);
      await TALK.say('bram', '저 노래…\n배 띄울 때마다 불러 주던 거야.');
      lakeW.note = '마르타의 박자에 맞춰, 브램을 눌러 배를 두드려 주세요';
      const bramOn = () => { const q = lakeW.things[0]; return [q.x, 160, 64]; };
      for (let i = 0; i < 3; i++) { await X.tap(bramOn, { screen: true }); A.sfx('knock', 0.3 + i * 0.2); X.note({ voice: 'box', vel: 0.36 }); lakeW.knock = 0; await X.tween(lakeW, 'knock', 1, 0.32, T.ease.lin); lakeW.knock = 0; }
      lakeW.note = null;
      lakeW.beat = 2;
      T.announce('마르타가 창턱의 배에 손을 얹은 채 잠이 든다. 웃고 있다.');
      X.notes(3, { voice: 'felt', vel: 0.3 });
      await X.wait(2.4);
      await TALK.say('bram', '…곧 오겠구먼.');
      await TALK.say('bram', '이번엔 내 배로\n태워 줘야지.', { slow: true });
      await TALK.say('leo', '밧줄은 제가 풀게요.');

      /* ---- a year on: Captain Bram's wife, and she is in no hurry now either ---- */
      let wife;
      await quay(9, 10, () => {
        bram = X.actor('bram', { x: 96, style: F.styles.bram, s: 144, flip: true, lean: 0.06 });
        bram.pose = (o, a, t) => { if (!a.moving && !a.boat) { o.armF = { a: -0.5, b: -0.3 }; o.armB = { a: -0.5, b: -0.3 }; o.y += Math.sin(t * 2.4) * 1.5; } };
        leo = X.actor('leo', { x: 392, style: F.leoAt(0), flip: true });
        bean = X.actor('bean', { dog: true, s: 220, x: 440, sit: 1, flip: true, wag: 0.6 });
        mom = X.actor('mom', { x: 322, style: F.styles.mom, s: C.MOM_S, lamp: true, lampHand: 'F', lean: 0.1, flip: true });
        crowd.push(X.actor('v1', { x: 486, style: F.styles.villagerA, s: 142, flip: true }), X.actor('v2', { x: 268, style: F.styles.villagerB, s: 134, flip: true }), X.actor('v3', { x: 222, style: F.styles.rosa, s: 138, flip: true }));
        wife = X.actor('wife', { style: F.styles.bramWife, s: 106, lean: 0.24, face: { old: true } });
        S.b1 = X.boat({ x: -900, riders: [wife] });
      });
      X.toll(2);
      await TALK.say('mom', '누가 오는구나.\n네가 대답해 주렴. 길 잃지 않게.');
      const pressed = X.seaLamp({ rounds: [[0, 1, 2, 3], [2, 1, 3, 0, 1]] });
      X.sail(S.b1, -74, 30);
      await pressed;
      await new Promise((res) => { const iv = () => (S.b1.x >= -74.5 ? res() : X.wait(0.2).then(iv)); iv(); });
      A.sfx('door');
      X.walk(bram, 62, 50);
      await X.land(wife, 24);
      wife.prop = cane;
      bram.pose = (o) => { o.armF = { hand: F.local(o, wife.x + 14, PIER - 62) }; o.lean = 0.14; };
      await X.wait(1.4);
      bram.flip = false;
      await TALK.say('bram', '그 사람은 원래 뭐든 천천히 했어.');
      bram.flip = true;
      await TALK.say('wife', '…손이 다 거칠어졌네요.');
      await TALK.say('bram', '약속했잖아.\n내 배 생기면 제일 먼저 태워 준다고.');
      await X.wait(0.8);
      /* his boat goes into the water for the first time, with her in it */
      await X.dip(async () => {
        W.S.hook.flags.bramGone = true;
        S.boats = [];
        const big = X.boat({ x: -236, big: true, riders: [] });
        bram.boat = big; bram.seat = -70; bram.stand = 1; bram.hop = 0; bram.flip = true; big.riders.push(bram);
        wife.boat = big; wife.seat = 40; wife.stand = 0; wife.hop = 0; wife.flip = true; wife.prop = null; big.riders.push(wife);
        bram.pose = (o) => { o.armF = { a: 1.1, b: 0.4 }; };
        S.rope = { boat: big }; S.big = big; W.S.hook.flags.clearPier = true;
        X.cam(60, 452, 1);
      }, { out: 0.8, in: 1 });
      T.announce('브램 선장의 배가 처음으로 물에 떴다. 아흔아홉 살 마르타가 타고 있다.');
      await X.tap(() => [16, PIER - 30, 50]);
      T.announce('밧줄 풀기. 말뚝 셋에 감긴 밧줄을, 감긴 차례의 거꾸로 푼다.');
      await X.play(T.puzzle.rope({ order: [0, 2, 1, 0, 2] }));
      S.rope = null;
      await TALK.say('wife', '바다가 이렇게 넓었네요.', { slow: true });
      await TALK.say('bram', '고맙네, 레오.\n이제 둘이 건너가네.');
      T.announce('브램과 마르타가 구름바다 너머로 건너간다.');
      A.sfx('whoosh'); X.bed(3, 0.14, 'walk'); A.theme({ voice: 'box', vel: 0.3, beat: 0.62, left: false });
      X.sail(S.big, -1500, 54);
      [leo, mom].concat(crowd).forEach((a) => { a.pose = wave; });
      bram.pose = wave; wife.pose = (o, a, t) => { o.armF = { a: 2.0 + Math.sin(t * 5) * 0.2, b: 0.3 }; };
      for (let i = 0; i < 4; i++) { await X.tween(bean, 'jump', 12, 0.18, T.ease.out); await X.tween(bean, 'jump', 0, 0.18, T.ease.in); await X.wait(0.5); }
      X.cam(-240, 452, 1, 0.5);
      await X.wait(3.6);
      /* SLOT: shooting star — ch4, as Bram and Marta's boat goes beyond the cloud sea, a star falls down through the clouds into the living world */
      T.announce('배가 구름바다 너머로 사라지고, 별 하나가 구름 아래로 떨어진다.');
      A.sfx('star', 0.8);
      await X.wait(2.4);

      /* ---- Rosa's baby ---- */
      let rosa, son;
      await quay(10, 15, () => {
        S.camK = 2;
        rosa = X.actor('rosa', { x: 110, style: F.styles.rosa, s: 140, flip: true });
        rosa.pose = (o, a, t) => { if (!a.hug) { o.armF = { hand: [10, -14] }; o.armB = { hand: [8, -10] }; o.y += Math.abs(Math.sin(t * 4)) * -3; } };
        rosa.prop = (g, j, o, a) => { if (!a.hug) P.fill(g, P.rr(j.handF[0] - 12, j.handF[1] - 6, 26, 16, 5), '#e9c45a'); };
        leo = X.actor('leo', { x: 392, style: F.leoAt(0), flip: true });
        bean = X.actor('bean', { dog: true, s: 220, x: 440, sit: 1, flip: true, wag: 0.6 });
        mom = X.actor('mom', { x: 322, style: F.styles.mom, s: C.MOM_S, lamp: true, lampHand: 'F', lean: 0.1, flip: true });
        son = X.actor('son', { style: F.styles.rosaSon, s: 144, lean: 0.16, face: { old: true } });
        S.b1 = X.boat({ x: -820, riders: [son] });
      });
      X.toll(3);
      await TALK.say('rosa', '오늘은 꼭 그 애일 것 같아.', { auto: 2.4 });
      await X.sail(S.b1, -74, 76);
      A.sfx('door');
      await X.land(son, 40);
      son.prop = cane;
      await X.wait(0.9);
      /* she does not stop to wonder */
      rosa.hug = { k: 0 }; son.hug = rosa.hug; son.prop = null;
      rosa.pose = (o) => T.embrace(o, rosa, son, rosa.hug.k);
      son.pose = (o) => { T.embrace(o, son, rosa, rosa.hug.k, true); o.lean += 0.26 * rosa.hug.k; };
      son.armOver = true; rosa.z = 1;
      await X.walk(rosa, son.x + 34, 150);
      rosa.flip = true;
      await X.tween(rosa.hug, 'k', 1, 0.7, T.ease.out);
      A.motif({ voice: 'box', vel: 0.36, beat: 0.7 });
      await X.wait(1.4);
      await TALK.say('rosa', '우리 아기.', { slow: true });
      await TALK.say('son', '…엄마?');
      T.announce('로사가 다 뜬 담요를 늙은 아들의 어깨에 둘러 준다.');
      await TALK.say('rosa', '이제야 다 떴다.', { slow: true });
      await X.wait(0.8);

      /* ---- that night ---- */
      const lake = T.lake({ paint: T.vig.gray, leo: F.leoAt(0), found: { k: 0 }, mirror: 0.25, leoFace: {} });
      await X.view(lake, { color: '#1b2a40' });
      T.announce('밤의 호수. 이번에는 바깥 고리를 돌리면 안쪽 고리가 함께 돈다.');
      await lake.calm({ start: [1, 3, 6], couple: true });
      X.age('아나, 51');
      T.announce('그날 밤, 호수. 아나의 머리에 첫 흰머리가 비친다.');
      await X.wait(2.6);
      await X.tween(lake.found, 'k', 1, 1.5);
      X.note({ voice: 'felt', vel: 0.34 });
      await X.wait(3);
      /* and beside her picture, his own face, which has not changed in fifteen years */
      X.tween(lake.fade, 'a', 0.45, 2);
      await X.tween(lake, 'mirror', 0.9, 2);
      await TALK.say('leo', '같이 늙자고 했는데.');
      const Wv = T.view.W;
      await X.tap(() => [-Wv / 2 + 350, 340, 70], { screen: true });
      lake.touch(-Wv / 2 + 350, 340);
      await X.wait(1.2);
      lake.leo = F.leoAt(1);
      T.announce('레오는 그 옆에 비친 자기 얼굴을 오래 본다.');
      X.notes(3, { voice: 'felt', vel: 0.3 });
      await X.wait(1.6);
      await TALK.say('leo', '…그럼 나도, 여기서 같이 늙을게.', { slow: true });
      await X.wait(4.5);
      X.end();
    },
  });
})();
