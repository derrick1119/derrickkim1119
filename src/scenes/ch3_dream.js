/* Chapter 3 「꿈」 — three years on. Bram shows him how to saw; the frame goes up, and a storm
   brings it down in a night; in the morning the whole town comes up the hill with a rope. Rosa
   asks him to look in the lake with her, at the son she left as a baby, an old man now. Then the
   lake shows Ana worn out, and he spends the one dream he has on her. */
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
  /* rain across the screen, and lightning */
  function storm(g, S) {
    const s = S.storm || 0, V = T.view, W = V.W, t = T.time;
    if (s > 0.01) {
      g.save(); g.globalAlpha = s; g.strokeStyle = 'rgba(200,214,236,0.55)'; g.lineWidth = 1.8; g.beginPath();
      for (let i = 0; i < 160; i++) { const x = -W / 2 + ((i * 97 + t * 260) % (W + 200)) - 100, y = ((i * 211 + t * 900) % 1000) - 50; g.moveTo(x, y); g.lineTo(x - 14, y + 34); }
      g.stroke(); g.restore();
    }
    if (S.flash > 0.01) { g.fillStyle = T.rgba('#f4f6ff', S.flash * 0.85); g.fillRect(-W / 2, 0, W, 900); }
  }

  T.stage('ch3', {
    chapter: 3, title: ['3장', '꿈'], end: ['3장 끝', '4장 「이웃들」'], next: 'ch4', pad: 2,
    plot: { stage: 1, stones: 4, board: true, table: true },
    build() { T.scenes.kitchen.build(); T.scenes.home.build(); },
    onHill(g, h, S) { if (h === T.world.hillOf(T.plot.HX)) fallen(g, S); },
    after(g, S) { storm(g, S); },
    update(dt, S) { S.flash = Math.max(0, (S.flash || 0) - dt * 2.4); },
    script: async function (X) {
      const W = T.world, C = W.C, PL = T.plot, S = X.S, ps = S.ps, A = X.A, TALK = X.TALK;
      const [px, py] = X.place.plot();
      S.fallen = 0; S.storm = 0; S.flash = 0;
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
      await TALK.say('bram', '배 짓는 거나 집 짓는 거나, 나무 켜는 건 똑같아.\n밀 때 힘 주고, 당길 땐 쉬고.');
      T.announce('나무 켜기. 왼쪽과 오른쪽을 번갈아 눌러 통나무를 켠다.');
      await X.play(T.puzzle.saw({ logs: 2, strokes: 8 }));
      await TALK.say('bram', '손이 제법이야.');

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
      await X.wait(2.2);
      X.walk(bram, C.PLOT - 600, 80).then(() => { bram.hidden = true; });
      await X.wait(1.6);

      /* ---- that night, the storm ---- */
      X.bed(null);
      T.announce('그날 밤, 폭풍이 몰려온다.');
      X.tween(ps, 'night', 0.9, 3); X.tween(S, 'storm', 1, 3);
      A.ambience(0.5, 1, 0.4); A.sfx('wind');
      leo.x = PL.HX + 140; leo.flip = true;
      leo.pose = (o, a, t) => { o.headTilt = -0.2; o.lean = 0.2 + Math.sin(t * 3) * 0.04; o.armB = { a: 2.4, b: 0.6 }; };
      await X.wait(3.2);
      A.sfx('wind'); S.flash = 0.7; A.sfx('thunder');
      await X.wait(2.4);
      A.sfx('wind');
      await X.wait(1.2);
      S.flash = 1; A.sfx('thunder'); A.sfx('knock', 0); A.sfx('knock', 0.2);
      ps.stage = 1; S.fallen = 1;
      T.announce('번개가 친다. 집의 뼈대가 무너져 풀밭에 쓰러진다.');
      await X.wait(1.6);
      leo.pose = null;
      await X.walk(leo, PL.HX + 40, 40);
      X.tween(leo, 'sit', 1, 1.2);
      leo.pose = (o) => { o.headTilt = 0.4; o.face.eye = 'closed'; };
      await X.wait(1.6);
      await TALK.say('leo', '…삼 년을 지은 건데.', { slow: true });
      await X.wait(1.2);

      /* ---- morning: everyone, with a rope ---- */
      await X.dip(async () => { ps.night = 0; S.storm = 0; A.ambience(0.3, 0.3, 0.15); }, { color: '#fff6e6', out: 1.6, in: 1.6 });
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
      await X.play(T.puzzle.heave({ pulls: 3, crew: [F.styles.bram, F.styles.rosa, F.styles.mom, F.styles.villagerA, F.styles.kidA] }));
      S.fallen = 0; ps.stage = 2; crew[1].prop = null;
      A.sfx('knock', 0.4); X.notes(4);
      T.announce('뼈대가 다시 선다. 사람들이 손뼉을 친다.');
      const clap = (o, a, t) => { o.armF = { a: 1.35 + Math.sin(t * 16 + a.x) * 0.16, b: 1.1 }; o.armB = { a: 1.2 - Math.sin(t * 16 + a.x) * 0.16, b: 1.1 }; o.face.eye = 'happy'; };
      crew.forEach((a) => { a.pose = clap; });
      await X.wait(2.4);
      crew.forEach((a) => { a.pose = null; });
      await TALK.say('leo', '…고맙습니다.');
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
          { kind: 'who', id: 'rosa', style: F.styles.rosa, x: 330, at: [-265, 748], flip: false, lockFlip: false, ps: 340,
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
      await TALK.say('rosa', '저 담요… 백일 때 내가 떠 준 거야.');
      await TALK.say('rosa', '아직도 갖고 있었네.', { slow: true });
      await TALK.say('leo', '그 사람도 언젠가 오겠죠.');
      await TALK.say('rosa', '다 늙어서 오겠지.\n그래도 난 단번에 알아볼 거야.');
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
      await TALK.say('mom', '꿈으로 한 번은 다녀올 수 있단다.\n평생 딱 한 번이니, 꼭 필요한 날에 쓰렴.');
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
