/* Chapter 2 「약속 목록」 — one year on. He writes the list down; Bram brings stones up the hill and
   tells him what he promised his wife; Pipi shows him the stars she joins up for her father, and a star
   falls. On the anniversary Bram takes him to the lake, as his mother asked before she went: there he sees
   Ana for the first time, making his stew, too salty. What he does on the bank falls on her kitchen as a
   shadow; he cannot touch her. Bram tells him how a scent, a sound and a light make a way into a dream.
   Back on the hill, he wants the house up for her, and the two of them set the first stones. */
(function () {
  'use strict';
  const T = window.TYT, P = T.P, F = T.F;

  T.stage('ch2', {
    chapter: 2, title: ['2장', '약속 목록'], end: ['2장 끝', '3장 「꿈」'], next: 'ch3', pad: 0,
    plot: { stage: 0, table: true, season: 'late autumn' },   /* a few days after he came: the same late autumn as the hospital room */
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
      X.age('며칠 뒤');
      await X.wait(3.2);

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
      await X.TALK.say('leo', '집부터 짓자.\n마당 있는 걸로.');

      /* Captain Bram, with a handcart: no one carries stone up this hill alone */
      const bram = X.actor('bram', { x: C.PLOT - 560, style: F.styles.bram, s: 144, lean: 0.12 });
      bram.cart = { stones: 4 };   /* round stones off the beach, already in the cart */
      bram.pose = (o, a) => { const hx = a.x + (a.flip ? -30 : 30); o.armF = { hand: F.local(o, hx, W.groundAt(hx) - 52) }; o.armB = { hand: F.local(o, hx - (a.flip ? -6 : 6), W.groundAt(hx) - 48) }; o.lean = 0.16; };
      bram.prop = (g, j, o, a) => { if (!a.cart) return; const d = a.flip ? -1 : 1, cx = a.x + d * 70, gy = W.groundAt(cx); P.line(g, a.x + d * 30, gy - 50, cx - d * 20, gy - 34, 4, '#6f4a34'); P.fill(g, P.rr(cx - 34, gy - 50, 68, 28, 5), '#8a5a3b'); P.fill(g, P.circle(cx, gy - 12, 12), '#5a3d28'); P.fill(g, P.circle(cx, gy - 12, 4), '#c9a070'); for (let i = 0; i < a.cart.stones; i++) P.fill(g, P.ellipse(cx - 21 + i * 14, gy - 54 - (i % 2) * 3, 11, 9), '#b3ada4'); };
      leo.flip = true;
      T.announce('브램 선장이 둥근 돌을 실은 수레를 끌고 언덕을 올라온다.');
      await X.walk(bram, PL.HX - 250, 70);
      bram.flip = false;
      await X.TALK.say('bram', '바닷가 둥근 돌이야.\n주춧돌로는 그만이지.');
      await X.TALK.say('leo', '…이걸 혼자 끌고 오셨어요?');
      await X.TALK.say('bram', '여기서 집 지은 사람 치고\n돌을 혼자 올린 사람은 없네.');
      /* the stones come off the cart onto the plot */
      await X.dip(async () => {
        bram.pose = null; bram.prop = null; if (bram.cart) bram.cart.stones = 0;
        A.sfx('knock', 0.2); A.sfx('knock', 0.6);
      }, { out: 0.8, in: 1 });
      T.announce('둥근 돌 네 개가 집터에 내려졌다. 둘이 돌에 걸터앉아 숨을 고른다.');
      /* sitting on the stones they brought up: two of them, set down on the flat by the stakes a talking distance apart */
      const SEAT = [PL.HX - 84, PL.HX + 48];
      const onStone = (o, a) => {
        if (a.sit < 0.02) return;
        const u = a.s / 100, k = a.sit, hip = T.lerp(F.hipHeight(a.style, a.s), 30 * a.s / 150, k);
        o.y = W.groundAt(a.x) - hip;
        o.legF = { foot: [T.lerp(1, 19, k), hip / u - 3.2] }; o.legB = { foot: [T.lerp(-1, 14, k), hip / u - 2.8] };
        o.lean = 0.08 + 0.08 * k; o.armF = { a: 0.8 * k, b: 0.95 * k }; o.armB = { a: 0.65 * k, b: 0.9 * k };   /* forearms on his knees */
      };
      ps.seats = SEAT.slice();
      await Promise.all([X.walk(bram, SEAT[0], 80), X.walk(leo, SEAT[1], 80)]);
      bram.flip = false; leo.flip = true; bram.pose = onStone; leo.pose = onStone;
      X.tween(leo, 'sit', 1, 0.8); bram.sit = 0; X.tween(bram, 'sit', 1, 0.8);
      await X.wait(1);
      await X.TALK.say('leo', '배는 다 돼 가요?');
      await X.TALK.say('bram', '다 돼도 못 띄우지.\n마르타가 와야 띄우는 배라.');
      await X.TALK.say('bram', '약속했거든. 내 배 생기면\n제일 먼저 태워 주겠다고.');
      await X.TALK.say('bram', '남의 배로 나갔다가,\n그길로 못 돌아왔지. 서른둘에.');
      await X.TALK.say('leo', '…육십 년이나요?');
      await X.TALK.say('bram', '기다리는 동안 손이 놀면,\n마음이 먼저 지치거든.');
      await X.TALK.say('bram', '자네도 뭐든 지어. 천천히.', { slow: true });
      /* a child comes up the far side of the hill, slows down when she sees them, and stops a little way off;
         a smaller one trails after her and sits down in the grass with her face to the sky */
      const pipi = X.actor('kid', { x: PL.HX + 820, style: F.styles.kidA, s: 100, flip: true });
      const cloud = X.actor('cloud', { x: PL.HX + 900, style: F.styles.cloud, s: 94, flip: true });
      T.announce('언덕 건너편에서 아이 둘이 올라온다.');
      const pipiIn = X.walk(pipi, PL.HX + 420, 96);
      X.walk(cloud, PL.HX + 372, 70).then(() => { cloud.flip = true; X.tween(cloud, 'sit', 1, 0.6); cloud.pose = (o, a, t) => { if (a.sit < 0.5) return; o.headTilt = -0.4 + Math.sin(t * 0.5) * 0.04; o.lean = -0.16; o.armF = { a: -0.3, b: 0.2 }; o.armB = { a: -0.4, b: 0.2 }; }; });
      await X.wait(1.2);
      leo.flip = false;
      await pipiIn;
      await X.wait(0.4);
      await X.walk(pipi, PL.HX + 260, 54);   /* the last few steps, slowly */
      pipi.flip = true;
      pipi.pose = (o, a, t) => { if (a.moving) return; o.headTilt = -0.2 + Math.sin(t * 2) * 0.05; o.armF = { a: 0.3, b: 1.6 }; };
      await X.wait(0.5);
      await X.TALK.say('kid', '아저씨 집 지어?\n나 그거 봐도 돼?');
      await X.TALK.say('leo', '…넌 누구니?');
      await X.TALK.say('kid', '피피. 일곱 살 때 왔어.\n엄마 아빠 기다려.');
      await X.TALK.say('bram', '피피도 여기 온 지 꽤 됐지.\n한 오 년 됐나.');
      await X.TALK.say('kid', '아저씨는 누구 기다려?');
      await X.TALK.say('leo', '아나. 내 아내.');
      await X.TALK.say('kid', '아줌마 오면 뭐 해 줄 거야?');
      await X.TALK.say('leo', '집 다 지어 놓고… 스튜 끓여 줘야지.');
      await X.TALK.say('leo', '내가 끓이면 맨날 짜다면서,\n그래도 다 먹었거든.');
      await X.TALK.say('kid', '그럼 나랑 같이 기다리면 되겠다.\n심심하지 않게.');
      await X.TALK.say('leo', '그래. 약속.');
      await X.wait(0.4);
      await X.TALK.say('leo', '…저 애는?');
      await X.TALK.say('kid', '구름이.\n맨날 구름만 봐서 구름이야.');
      await X.TALK.say('cloud', '저 구름 봐.\n둘이 손 잡고 있어.');
      /* he looks up too, for a while */
      const look0 = leo.pose;
      leo.pose = (o, a, t) => { if (look0) look0(o, a, t); o.headTilt = -0.34; };
      await X.wait(2.2);
      leo.pose = look0;
      X.tween(bram, 'sit', 0, 0.6);
      X.walk(bram, C.PLOT - 600, 70).then(() => { bram.hidden = true; });
      /* ---- that night on the quay: what you do while you wait ---- */
      await X.TALK.say('kid', '오늘 밤에 부두 가자.\n내가 만든 별자리 보여 줄게.');
      await X.TALK.say('kid', '아빠 오면 보여 주기로 했거든.\n아저씨가 먼저 찾아봐.');
      await X.dip(async () => { ps.night = 0.9; }, { color: '#141b36', out: 1, in: 0.6 });
      T.announce('그날 밤, 부두. 피피가 기다리면서 이어 둔 별자리를 종이에 그려 보이고, 레오가 하늘에서 찾는다. 갈수록 별이 많아지고, 마지막 별자리는 기울어져 있다.');
      await X.play(T.puzzle.stars({ rounds: [
        { name: '집', pts: [[-50, 40], [50, 40], [50, -10], [0, -60], [-50, -10]], edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [4, 2]], at: [180, 330], scale: 1.3, filler: 10 },
        { name: '배', pts: [[-70, 0], [70, 0], [-45, 30], [45, 30], [0, 0], [0, -80]], edges: [[0, 2], [2, 3], [3, 1], [1, 4], [4, 0], [4, 5], [5, 1]], at: [-150, 300], scale: 1.25, filler: 18 },
        { name: '아나의 냄비', pts: [[-60, -10], [60, -10], [45, 40], [-45, 40], [-88, -18], [88, -18], [0, -70]], edges: [[4, 0], [0, 1], [1, 5], [1, 2], [2, 3], [3, 0], [0, 6], [6, 1]], at: [250, 350], scale: 1.15, rot: 0.5, filler: 24 },
      ] }));
      await X.TALK.say('kid', '마지막 건 아까 만든 거야.\n아저씨 주려고. 스튜 냄비.');
      await X.TALK.say('leo', '…그 냄비 앞에서\n아나가 제일 잘 웃었어.');
      await X.wait(1.2);
      T.announce('구름바다 위로 별 하나가 길게 떨어진다. 구름 아래, 사람 사는 세상 쪽으로.');
      await X.star({ dur: 2.2 });
      await X.wait(1.4);
      await X.TALK.say('kid', '별똥별이다.\n누가 건너갔나 봐.');
      await X.TALK.say('leo', '…엄마 갈 때도, 저랬어.', { slow: true });
      await X.TALK.say('kid', '저 아래서 저거 보고 소원 빌면,\n여기 바다에 작은 빛으로 떨어진대.');
      await X.TALK.say('leo', '…아나도 봤을까.', { slow: true });
      /* the children go home to bed; the year goes round */
      await X.dip(async () => { ps.night = 0; leo.sit = 0; ps.seats = null; S.actors = S.actors.filter((a) => a !== pipi && a !== cloud); }, { color: '#141b36', out: 0.8, in: 1.2 });
      await X.wait(0.8);
      await X.years(0, 1, { age: 37 });
      await X.wait(0.6);

      /* a year to the day. Bram comes up with a lamp: his mother asked him to, before she went */
      bram.hidden = false; bram.x = C.PLOT - 470; bram.lamp = true; bram.lampHand = 'F'; bram.pose = null; bram.prop = null; bram.cart = null; bram.sit = 0;
      X.bed(2, 0.13, 'home');
      await X.walk(bram, leo.x - 130, 78);
      leo.flip = true; bram.flip = false;
      await X.wait(0.6);
      await X.TALK.say('bram', '오늘로 꼭 일 년이지?');
      await X.TALK.say('leo', '…어떻게 아셨어요?');
      await X.TALK.say('bram', '자네 어머니가 부탁해 뒀네.\n일 년 되는 날, 호수에 데려가 달라고.');
      await X.TALK.say('leo', '…엄마가요? 언제요?');
      await X.TALK.say('bram', '자네 오기 전부터. 아들 오면\n자긴 오래 못 있을 거라고.');
      await X.TALK.say('bram', '첫해엔 보는 게 더 아플 거라고.\n…따라오게.');
      X.walk(bram, C.PLOT + 420, 80);
      await X.wait(0.5);
      X.walk(leo, C.PLOT + 380, 96);
      await X.wait(1.4);
      /* the lake: her kitchen in the water, and on the bank the things he has to lend it */
      const lake = T.lake({
        paint: T.vig.first, leo: F.leoAt(0), mom: F.styles.bram, shore: true, leoFace: {},
        things: [{ kind: 'lamp', x: 96, to: -300 }, { kind: 'pot', x: -250, to: 17 }, { kind: 'leo', x: 340, to: 183 }],
      });
      await X.view(lake, { color: '#1b2a40' });
      T.announce('거울 호수. 물속에 아나의 부엌이 비친다. 아나가 레오의 공책을 펴 놓고, 레오가 서던 자리에서 스튜를 끓인다.');
      await X.TALK.say('bram', '이 호수엔 두고 온 사람이 비치네.\n그 사람이 우릴 생각할 때면.');
      await X.TALK.say('bram', '나도 여기서 마르타를 육십 년 봤지.\n…곱게도 늙더군.');
      await X.TALK.say('bram', '손은 못 대도, 여기서 한 일은\n저기 그림자로 떨어지네.');
      await X.TALK.say('bram', '등불을 비추면 저 창이 밝아지고,\n자네가 서면 저 부엌에도 자네 그림자가 서지.');
      /* (the lake-help puzzle appears from chapter 4; here the 물그림자 does the same work) ch2, Ana's rainy kitchen: his lamp's shadow lights her dark window (the 물그림자 below already does this; a fuller help puzzle can replace or follow it) */
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
      await X.TALK.say('leo', '조금만 넣으랬더니…\n두 번이나 넣었네.');
      await X.TALK.say('leo', '나도 저렇게 끓여 볼래.\n아나가 끓이는 그대로.');
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
      await X.TALK.say('leo', '이렇게 가까이 보이는데…\n닿지는 않는구나.', { slow: true });
      /* but something does come up out of the water: the steam of her pot */
      lake.wisp = 1;
      T.announce('물속 부엌에서 스튜 김 한 줄기가 물 위로 피어오른다.');
      await X.TALK.say('bram', '저 김, 담아 두게.\n아나 씨가 아는 냄새니까.');
      await X.tap(() => [17, 120, 70], { screen: true });
      lake.wisp = 0;
      await X.gift('scent', [17, 120]);
      await X.tween(lake.reach, 'k', 0, 1);
      await X.TALK.say('leo', '…이걸로 뭘 하는데요?');
      await X.TALK.say('bram', '그 사람이 아는 냄새 하나, 아는 소리 하나,\n길을 비춰 줄 빛 하나.');
      await X.TALK.say('bram', '셋이 다 모이면, 그 사람 꿈에\n딱 한 번 다녀올 수 있네.');
      await X.TALK.say('leo', '꿈에서는… 닿아요?');
      await X.TALK.say('bram', '손도 잡고, 말도 하지.\n깨고 나면 꿈인 줄 알겠지만.');
      await X.TALK.say('bram', '나 다녀온 날, 마르타가\n웃으면서 깨더군. 여기서 다 봤지.', { slow: true });
      await X.wait(0.8);

      /* back on the hill, the next morning: he has seen her alone in that kitchen, and he wants the house up */
      leo.x = PL.HX - 20; leo.flip = false; leo.chair = 0;
      bram.x = PL.HX + 170; bram.flip = true; bram.lamp = false; bram.go = null; bram.moving = false;
      await X.view(null, { color: '#1b2a40' });
      X.bed(4, 0.13, 'walk');
      T.announce('이튿날 아침, 언덕. 브램이 올려다 둔 둥근 돌 네 개가 집터 옆에 놓여 있다.');
      X.age('이튿날 아침');
      await X.wait(0.8);
      await X.TALK.say('leo', '아나가 그 부엌에 혼자 있는 걸 보니까….');
      await X.TALK.say('leo', '빨리 짓고 싶어요.\n아나 오면 바로 들어올 집.');
      await X.TALK.say('bram', '그럼 돌부터 놓세.\n주춧돌이 기울면 집이 다 기울어.');
      await X.TALK.say('bram', '구덩이마다 깊이가 달라.\n돌 머리가 한 줄로 맞게 놓게.');
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
      bram.flip = true;
      await X.TALK.say('bram', '됐네. 이제 뭘 올려도\n안 기울어.');
      await X.TALK.say('leo', '다음은 기둥이네요.');
      X.walk(bram, C.PLOT - 600, 70).then(() => { bram.hidden = true; });
      await X.wait(1.2);
      await X.walk(leo, PL.HX + 150);
      leo.flip = true;
      await X.tween(leo, 'sit', 1, 1);
      await X.wait(3);
      X.end();
    },
  });
})();
