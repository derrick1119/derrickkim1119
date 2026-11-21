/* Chapter 3 「꿈」 — three years on. The lake shows her worn out. He has one dream to send,
   and the player decides which evening to send it on. It takes them back to their first flat. */
(function () {
  'use strict';
  const T = window.TYT, P = T.P, F = T.F;

  T.stage('ch3', {
    chapter: 3, title: ['3장', '꿈'], end: ['3장 끝', '4장 「이웃들」'], next: 'ch4', pad: 2,
    plot: { stage: 1, stones: 4, board: true, table: true },
    build() { T.scenes.kitchen.build(); T.scenes.home.build(); },
    script: async function (X) {
      const W = T.world, C = W.C, PL = T.plot, S = X.S, ps = S.ps, A = X.A;
      const [px, py] = X.place.plot();
      X.cam(px, py, 1); X.camSnap();
      const leo = X.actor('leo', { x: PL.HX + 30, style: F.leoAt(0) });
      const nana = X.actor('nana', { x: PL.HX - 150, style: F.styles.nana, s: C.NANA_S, lamp: true, lampHand: 'F', lean: 0.1 });
      /* measuring up the first beam */
      leo.pose = (o, a, t) => { if (!a.moving && !a.push) { o.armF = { a: 1.3 + Math.sin(t * 2.4) * 0.3, b: 0.4 }; o.headTilt = 0.1; } };
      X.title();
      await X.wait(5.6);

      /* to the lake */
      leo.pose = null;
      X.walk(nana, C.PLOT + 420, 80);
      await X.wait(0.4);
      X.walk(leo, C.PLOT + 380, 80);
      await X.wait(1.7);
      const lake = T.lake({ paint: T.vig.tired, leo: F.leoAt(0), nana: true, i: 0 });
      await X.view(lake, { color: '#1b2a40' });
      T.announce('호수에 물결이 인다. 고리 셋을 눌러 돌려 비친 모습을 맞춘다.');
      await lake.calm({ start: [2, 5, 7] });
      X.age('아나, 39');
      T.announce('호수에 비친 아나는 지쳐 있다. 늦게까지 이어지는 일, 잠든 아이, 혼자 보내는 밤.');
      await X.wait(2.6);
      /* He has one dream to give. Tap the water to see another evening; carry the light to the water to use it. */
      let sent = false;
      await X.TALK.say('nana', '꿈으로 한 번은 다녀올 수 있단다.\n평생 딱 한 번이니, 꼭 필요한 날에 쓰렴.');
      const dreamt = lake.offerMote().then(() => { sent = true; });
      for (let i = 0; i < 3 && !sent; i++) {
        if (i > 0) { await X.tween(lake.fade, 'a', 0, 0.7); lake.i = i; lake.amp = 1; await X.tween(lake.fade, 'a', 1, 0.9); X.note({ voice: 'felt', vel: 0.3 }); }
        if (i < 2) await Promise.race([dreamt, X.tap(() => [60, 560, 140], { screen: true })]);
        else await dreamt;
        X.clearSpot();
      }
      await dreamt;
      A.sfx('whoosh');
      T.announce('레오가 아껴 둔 꿈을 호수에 띄운다.');
      await X.wait(0.8);

      /* the dream */
      const D = T.dream();
      await X.view(D, { color: '#f6f0ff', out: 1.6, in: 1.8 });
      T.announce('꿈. 둘이 처음 살던 좁은 집. 아나가 혼자 앉아 있다.');
      await X.wait(1.6);
      await X.tap(D.spot, { screen: true });
      X.tween(D, 'enterA', 1, 0.8);
      await X.tween(D.near, 'k', 1, 3.2, T.ease.io);
      await X.wait(0.6);
      await X.TALK.say('ana', '혼자서는 못 하겠어.');
      await X.tween(D.lift, 'k', 1, 1.2);
      await X.TALK.say('leo', '할 수 있어.');
      await X.TALK.say('leo', '릴리랑 맛있는 거 많이 먹고, 많이 웃고,\n그 얘기 나중에 다 들려줘.');
      X.tween(D.chalk, 'k', 1, 6, T.ease.lin);
      for (let i = 0; i < 6; i++) X.wait(i * 0.9).then(() => A.sfx('chalk', i / 6));
      await X.TALK.say('leo', '나 거기서 집 짓고 있어.');
      A.motif({ voice: 'felt', vel: 0.42, beat: 0.8 });
      await X.TALK.say('leo', '천천히 와.', { slow: true });
      await X.tween(D.lean, 'k', 1, 1.6);
      await X.wait(3);

      /* the next morning */
      const lake2 = T.lake({ paint: T.vig.morning, leo: F.leoAt(0), warm: true, leoFace: { mouth: 'smile', eye: 'happy' } });
      await X.view(lake2, { color: '#fff6e6', out: 1.8, in: 1.6 });
      T.announce('다음 날 아침. 아나가 릴리의 머리를 묶어 주며 오랜만에 웃는다.');
      X.bed(0, 0.13, 'walk');
      X.notes(4, { vel: 0.3 });
      await X.wait(6.5);

      /* back on the hill: up goes the frame */
      leo.x = PL.HX - 150; leo.flip = false; nana.x = PL.HX + 160; nana.flip = true; nana.lamp = false;
      const push = (o, a, t) => { o.armF = { a: 1.9, b: 0.3 }; o.armB = { a: 1.7, b: 0.3 }; o.lean = 0.2; };
      await X.view(null, { color: '#fff6e6' });
      leo.pose = push; nana.pose = push; leo.push = true;
      /* the timber is cut and lying in the grass: what goes up first? */
      T.announce('뼈대 세우기. 풀밭에 놓인 나무 일곱 개를, 서로 받쳐 주는 차례대로 세운다.');
      await X.tap(() => [PL.HX, W.y3(PL.HX) - 30, 60]);
      await X.play(T.puzzle.frame());
      for (let i = 0; i < 3; i++) { A.sfx('knock', i / 3); X.note(); X.tween(ps, 'raise', (i + 1) / 3, 0.5, T.ease.out); await X.wait(0.55); }
      ps.stage = 2; ps.raise = 0;
      leo.pose = null; nana.pose = (o, a, t) => { o.armF = { a: 1.35 + Math.sin(t * 16) * 0.16, b: 1.1 }; o.armB = { a: 1.2 - Math.sin(t * 16) * 0.16, b: 1.1 }; o.face.eye = 'happy'; };
      T.announce('집의 뼈대가 선다.');
      A.motif({ voice: 'box', vel: 0.36, beat: 0.7 });
      await X.wait(3.4);
      X.end();
    },
  });
})();
