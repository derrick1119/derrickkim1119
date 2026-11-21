/* Chapter 2 「약속 목록」 — one year on. He writes the list down; his mother takes him to the lake,
   where he sees her for the first time: making his stew, too salty. He lends her kitchen what he
   has on his bank (물그림자), salts his own to match, and cannot touch her. Then the first stones. */
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
      leo.pose = (o, a, t) => { if (a.sit > 0.5) o.headTilt = -0.1 + Math.sin(t * 0.6) * 0.06; };
      X.title();
      await X.wait(4.4);

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
      await X.wait(0.9);

      /* a year to the day. His mother comes for him: there is a place where he can see her */
      const mom = X.actor('mom', { x: C.PLOT - 470, style: F.styles.mom, s: C.MOM_S, lamp: true, lampHand: 'F', lean: 0.1 });
      X.bed(2, 0.13, 'home');
      await X.walk(mom, leo.x - 120, 100);
      leo.flip = true;
      mom.pose = (o, a, t) => { o.armB = { a: 1.6 + Math.sin(t * 5) * 0.3, b: 0.4 }; };
      await X.wait(0.9);
      await X.TALK.say('mom', '오늘로 꼭 일 년이구나.\n보고 싶으면 따라오렴.');
      mom.pose = null;
      X.walk(mom, C.PLOT + 420, 96);
      await X.wait(0.5);
      X.walk(leo, C.PLOT + 380, 96);
      await X.wait(1.4);
      /* the lake: her kitchen in the water, and on the bank the things he has to lend it */
      const lake = T.lake({
        paint: T.vig.first, leo: F.leoAt(0), mom: true, shore: true, leoFace: {},
        things: [{ kind: 'lamp', x: 96, to: -300 }, { kind: 'pot', x: -250, to: 17 }, { kind: 'leo', x: 340, to: 183 }],
      });
      await X.view(lake, { color: '#1b2a40' });
      X.age('아나, 37');
      T.announce('거울 호수. 물속에 아나의 부엌이 비친다. 아나가 레오의 공책을 펴 놓고, 레오가 서던 자리에서 스튜를 끓인다.');
      await X.TALK.say('mom', '이 호수엔 두고 온 사람들이 비친단다.\n나도 여기서, 네가 크는 걸 다 봤지.');
      T.announce('물그림자 맞추기. 물가의 등불과 냄비와 레오를 좌우로 옮기면 물속에 그림자가 진다. 등불은 비 오는 창에, 냄비는 아나의 냄비에, 레오는 조리대의 빈자리에 겹친다. 숫자 키로 고르고 좌우 화살표로 옮긴다.');
      await lake.rhyme();
      T.announce('세 그림자가 제자리를 찾는다. 물결이 멎고, 잠깐, 한 부엌에 두 사람이 있다.');
      X.notes(3, { voice: 'felt', vel: 0.3 });
      await X.wait(1.8);
      /* she salts it, and salts it again */
      lake.beat = 1;
      for (let i = 0; i < 2; i++) { lake.salt.k = 0; A.sfx('step'); await X.tween(lake.salt, 'k', 0.97, 0.95, lin); lake.salt.k = 0; await X.wait(0.3); }
      T.announce('아나가 소금을 넣는다. 한 번, 그리고 한 번 더. 레오의 냄비를 눌러 똑같이 넣는다.');
      /* and so does he, to have it the way she is having it */
      lake.beat = 1.5; lake.note = '아나가 한 대로, 레오의 냄비에도 소금을 두 번 넣어 주세요';
      const hisPot = () => [17, 186, 56];
      for (let i = 0; i < 2; i++) { await X.tap(hisPot, { screen: true }); lake.salt.k = 0; A.sfx('step'); await X.tween(lake.salt, 'k', 0.97, 0.8, lin); lake.salt.k = 0; X.note({ voice: 'pluck', vel: 0.36 }); }
      lake.note = null;
      await X.wait(0.4);
      /* the taste, on both sides of the water at once */
      lake.beat = 2;
      await X.tween(lake.sip, 'k', 1, 1.0);
      lake.leoFace = { eye: 'closed', mouth: 'open' };
      A.sfx('knock', 0.2);
      T.announce('둘이 같이 맛을 본다. 너무 짜다. 물 이쪽과 저쪽에서 똑같이 얼굴을 찌푸린다.');
      await X.wait(1.7);
      lake.beat = 3; lake.leoFace = { eye: 'happy', mouth: 'open' };
      X.tween(lake.sip, 'k', 0, 0.8);
      X.notes(3, { voice: 'pluck', vel: 0.34 });
      await X.TALK.say('leo', '소금을 두 번 넣었네.');
      await X.wait(0.8);
      /* and then she looks at the place on the counter she used to watch him from */
      lake.beat = 4; lake.leoFace = { mouth: 'line' };
      await X.wait(1.2);
      X.tween(lake.tear, 'k', 1, 2);
      X.tween(lake.part, 'k', 0.86, 2.2);   /* to her, the seat is empty */
      T.announce('웃음이 멎는다. 아나가 조리대의 빈자리를 본다.');
      await X.wait(2.4);
      /* he reaches for her, and the picture breaks into rings */
      await X.tap(() => [156, 338, 74], { screen: true });
      if (!lake.rip.length || T.time - lake.rip[lake.rip.length - 1].t > 0.3) lake.touch(156, 338);
      X.tween(lake.part, 'k', 1, 0.7); X.tween(lake.gone, 'k', 1, 1.3);
      await X.tween(lake.reach, 'k', 1, 0.8);
      await X.wait(1.6);
      await X.TALK.say('mom', '볼 수는 있어도, 닿지는 않아.', { slow: true });
      await X.tween(lake.reach, 'k', 0, 1);
      await X.wait(0.8);

      /* back on the hill: the first stones */
      leo.x = PL.HX - 200; leo.flip = false; leo.chair = 0;
      S.actors = S.actors.filter((a) => a !== mom);
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
