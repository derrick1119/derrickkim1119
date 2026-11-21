/* Chapter 2 「약속 목록」 — one year on. He writes the list down; what she cooked for him on the
   day arrives, too salty, and he eats all of it; the lake shows her for the first time;
   and he sets the first stones of the house. */
(function () {
  'use strict';
  const T = window.TYT, P = T.P, F = T.F;

  T.stage('ch2', {
    chapter: 2, title: ['2장', '약속 목록'], end: ['2장 끝', '3장 「꿈」'], next: 'ch3', pad: 0,
    plot: { stage: 0, table: true },
    build() { T.scenes.kitchen.build(); },
    script: async function (X) {
      const W = T.world, C = W.C, PL = T.plot, S = X.S, ps = S.ps, A = X.A, lin = T.ease.lin;
      const [px, py] = X.place.plot();
      X.cam(px, py, 1); X.camSnap();
      const leo = X.actor('leo', { x: C.PLOT + 4, style: F.leoAt(0), flip: true, sit: 1 });
      /* thinking it over, a stick of charcoal in his hand */
      leo.pose = (o, a, t) => {
        if (a.chair) {
          const bite = T.ease.io(a.bite || 0), bx = PL.TABLE_X - 16, by = W.y3(PL.TABLE_X) - 66;
          o.lean = 0.12; o.armF = { hand: F.local(o, T.lerp(bx, a.x + 16, bite), T.lerp(by, o.y - 62, bite)), bend: -1 }; o.armB = { hand: F.local(o, bx - 12, by + 6) };
          if (a.mood === 'salt') { o.face.eye = 'closed'; o.face.mouth = 'open'; o.headTilt = Math.sin(t * 16) * 0.1; }
          else if (a.mood === 'laugh') { o.face.eye = 'happy'; o.face.mouth = 'open'; o.y += Math.sin(t * 13) * 1.6; }
          else if (a.mood === 'cry') { o.face.eye = 'closed'; o.face.tear = 0.9; o.face.tearY = (t * 2) % 3; o.headTilt = 0.2; }
        } else if (a.sit > 0.5) o.headTilt = -0.1 + Math.sin(t * 0.6) * 0.06;
      };
      X.title();
      await X.wait(5.6);

      /* the list */
      await X.tap(() => [leo.x, W.groundAt(leo.x) - 50, 60]);
      await X.card(PL.boardCard, {
        init: { cross: [0, 0, 0, 0, 0] }, max: 20,
        run: async (c) => {
          T.announce('약속. ' + PL.PROMISES.join(', '));
          for (let i = 0; i < 5; i++) {
            if (i === 4) await X.wait(0.9);
            A.sfx('crayon');
            await X.tween(c, 'w', i + 1, i === 4 ? 1.8 : 0.95, lin);
            X.note();
            await X.wait(0.25);
          }
        },
      });
      X.tween(leo, 'sit', 0, 0.7);
      await X.wait(0.7);
      await X.walk(leo, PL.BOARD_X + 30);
      A.sfx('knock'); await X.wait(0.3); A.sfx('knock', 0.6);
      ps.board = true;
      await X.wait(1.2);

      /* the first anniversary: what she made for him comes down on to his table */
      ps.food.show = true; ps.food.drop = 0; ps.food.glow = 1; ps.food.burnt = true; ps.food.color = '#a8452a';
      X.bed(2, 0.13, 'home');
      T.announce('첫 기일. 아나가 차린 음식이 레오의 식탁에 내려앉는다.');
      await X.tween(ps.food, 'drop', 1, 2.8, T.ease.out3);
      A.sfx('join');
      X.tween(ps.food, 'glow', 0, 2);
      await X.TALK.say('leo', '오늘이… 내 기일이구나.\n아나가 차린 밥상이야.');
      leo.flip = false;
      await X.walk(leo, PL.TABLE_X - 66);
      leo.flip = false; leo.chair = 1;
      const bowl = () => [PL.TABLE_X - 16, W.y3(PL.TABLE_X) - 64, 44];
      const bite = async () => { await X.tween(leo, 'bite', 1, 0.5); X.note({ voice: 'pluck', vel: 0.4 }); await X.wait(0.25); await X.tween(leo, 'bite', 0, 0.45); };
      await X.tap(bowl);
      await bite();
      ps.food.fill = 0.78;
      leo.mood = 'salt'; await X.wait(1.5);          /* far too salty */
      leo.mood = 'laugh'; await X.wait(1.8);         /* of course it is */
      leo.mood = null;
      for (let i = 0; i < 3; i++) { await X.tap(bowl); await bite(); ps.food.fill = [0.5, 0.25, 0][i]; }
      leo.mood = 'cry';
      T.announce('너무 짜다. 레오는 웃다가 울고, 한 그릇을 다 먹는다.');
      await X.wait(2.8);
      leo.mood = null;

      /* Nana takes him to the lake */
      const nana = X.actor('nana', { x: C.PLOT - 470, style: F.styles.nana, s: C.NANA_S, lamp: true, lampHand: 'F', lean: 0.1 });
      await X.walk(nana, PL.TABLE_X - 170, 78);
      nana.pose = (o, a, t) => { o.armB = { a: 1.6 + Math.sin(t * 5) * 0.3, b: 0.4 }; };
      await X.wait(1.4);
      await X.TALK.say('nana', '보고 싶으면 따라오너라.');
      nana.pose = null; leo.chair = 0;
      X.walk(nana, C.PLOT + 420, 80);
      await X.wait(0.5);
      X.walk(leo, C.PLOT + 380, 80);
      await X.wait(1.6);
      const lake = T.lake({ paint: T.vig.floor, leo: F.leoAt(0), nana: true });
      await X.view(lake, { color: '#1b2a40' });
      T.announce('거울 호수. 물결이 일어 비친 모습이 고리마다 어긋나 있다. 고리를 눌러 돌려 맞춘다.');
      await X.TALK.say('nana', '이 호수엔 두고 온 사람들이 비친단다.\n볼 수는 있어도, 닿지는 않아.');
      await lake.calm({ start: [3, 6] });
      X.age('아나, 37');
      T.announce('거울 호수. 부엌 바닥에 주저앉아 공책을 끌어안은 아나가 비친다.');
      await X.wait(3.2);
      /* he reaches for her, and the picture breaks into rings */
      await X.tap(() => [40, 560, 130], { screen: true });
      if (!lake.rip.length || T.time - lake.rip[lake.rip.length - 1].t > 0.3) lake.touch(40, 560);
      await X.tween(lake.reach, 'k', 1, 0.8);
      await X.wait(2.6);
      await X.tween(lake.reach, 'k', 0, 1);
      await X.wait(1.4);

      /* back on the hill: the first stones */
      leo.x = PL.HX - 200; leo.flip = false; ps.food.show = false;
      S.actors = S.actors.filter((a) => a !== nana);
      await X.view(null, { color: '#1b2a40' });
      X.bed(4, 0.13, 'walk');
      await X.tap(() => [PL.SX[0], W.y3(PL.SX[0]) - 8, 40]);
      await X.walk(leo, PL.SX[0] - 34, 84);
      leo.flip = false;
      /* four holes, four stones: which goes where, so that the house will sit level */
      T.announce('주춧돌 놓기. 구덩이 깊이와 돌 높이가 저마다 다르다. 네 돌의 머리가 모두 수평 줄에 닿게 놓는다.');
      await X.play(T.puzzle.stones({ depth: [1, 3, 0, 2] }));
      for (let i = 0; i < 4; i++) {
        X.walk(leo, PL.SX[i] - 34, 110);
        A.sfx('knock', i / 4); ps.stones = i + 1; X.note();
        await X.wait(0.5);
      }
      ps.stage = 1;
      T.announce('레오가 집터에 주춧돌 네 개를 놓는다.');
      A.motif({ voice: 'felt', vel: 0.36, beat: 0.8 });
      await X.walk(leo, PL.HX + 150);
      leo.flip = true;
      await X.tween(leo, 'sit', 1, 1);
      await X.wait(3);
      X.end();
    },
  });
})();
