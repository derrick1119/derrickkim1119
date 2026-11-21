/* The last chapter 「마중」, and the epilogue. The lake shows her saying it to Lily; the bell
   rings; he walks down to the harbour, old, and she steps off the boat. They walk home past
   everything he built, he cooks, and at night they set the first stone of one more room. */
(function () {
  'use strict';
  const T = window.TYT, P = T.P, F = T.F, K = T.town;
  const TAU = Math.PI * 2;

  /* the kitchen he built, played on the stage of the first one */
  function kitchen() {
    const St = T.scenes.stew;
    return {
      dark: false, mood: 'home', chord: 1,
      enter() { St.restage({ leo: F.leoBare(), ana: F.anaAt(81) }); },
      draw(g) { St.draw(g); },
    };
  }

  /* what the things on the hill were, before they were things: chalk on a floor, crayon on paper */
  function memories(g, m) {
    const PL = T.plot, y3 = T.world.y3;
    if (m.house > 0.01) {
      const x = PL.HX, y = y3(x) + 3, k = m.house, c = '#fffdf2';
      P.chalk(g, [[x - 132, y], [x - 132, y - 158], [x - 156, y - 158], [x - 96, y - 252], [x + 96, y - 252], [x + 156, y - 158], [x + 132, y - 158], [x + 132, y]], T.clamp(k * 1.6), c, 3.4, 3);
      P.chalk(g, [[x + 52, y], [x + 52, y - 96], [x + 98, y - 96], [x + 98, y]], T.clamp(k * 2 - 0.7), c, 3, 5);
      P.chalk(g, [[x - 124, y - 150], [x - 124, y - 82], [x - 66, y - 82], [x - 66, y - 150], [x - 124, y - 150]], T.clamp(k * 2 - 0.9), c, 3, 7);
      P.text(g, '우리 집', x - 6, y - 286, { size: 50, color: c, alpha: 0.95, k: T.clamp(k * 2 - 1), seed: 4 });
    }
    if (m.table > 0.01) {
      const x = PL.TABLE_X, y = y3(x) - 60, k = m.table, c = '#e2703a';
      P.crayon(g, [[x - 34, y - 22], [x - 28, y + 2], [x + 28, y + 2], [x + 34, y - 22], [x - 34, y - 22]], c, 5, 3, T.clamp(k * 1.5));
      [-22, -6, 10].forEach((dx, i) => P.crayon(g, [[x + dx, y - 34], [x + dx - 7, y - 50], [x + dx + 5, y - 64], [x + dx - 3, y - 80]], '#c9573f', 4, 5 + i, T.clamp(k * 2 - 0.6 - i * 0.2)));
    }
    if (m.swing > 0.01) {
      const q = PL.swingSeat(m.ps), x = q[0] + q[2] * 0.25, y = q[1], k = m.swing, c = '#3f6f9a';
      const pts = []; for (let i = 0; i <= 14; i++) { const a = (i / 14) * TAU; pts.push([x + Math.cos(a) * 12, y - 58 + Math.sin(a) * 12]); }
      P.crayon(g, pts, c, 4.5, 2, T.clamp(k * 2));
      P.crayon(g, [[x, y - 46], [x, y - 12], [x - 14, y + 16]], c, 4.5, 4, T.clamp(k * 2 - 0.4));
      P.crayon(g, [[x, y - 12], [x + 12, y + 18]], c, 4.5, 6, T.clamp(k * 2 - 0.7));
      P.crayon(g, [[x - 16, y - 46], [x, y - 36], [x + 16, y - 48]], c, 4.5, 8, T.clamp(k * 2 - 0.9));
      P.crayon(g, [[x - 12, y - 66], [x - 22, y - 60]], '#c9573f', 4, 9, T.clamp(k * 2 - 1)); P.crayon(g, [[x + 12, y - 66], [x + 22, y - 60]], '#c9573f', 4, 10, T.clamp(k * 2 - 1));
    }
  }

  T.stage('ch7', {
    chapter: 7, title: ['마지막 장', '마중'], end: ['끝', '천천히 와', 'TAKE YOUR TIME'], endHand: true, endDim: 0.93, pad: 4, mood: 'still',
    plot: { stage: 4, stones: 4, board: true, cross: [1, 1, 1, 1, 0], table: true, tree: 1, swing: 1, swingW: 1, garden: 1 },
    flags: { bramGone: true },
    build() { T.scenes.kitchen.build(); T.scenes.room.build(); T.scenes.stew.build(); },
    exit() { T.scenes.stew.plain = false; T.scenes.stew.cast = null; },
    update(dt, S) {
      if (S.track) S.camT.x = S.track.a.x + S.track.dx;
      if (S.swinging) S.ps.swingA = Math.sin(T.time * 1.2) * 0.4;
    },
    onHill(g, h, S) {
      if (h === 1 && S.lampDown != null) K.lantern(g, S.lampDown, T.world.C.PIER_Y - 22, T.time, { bare: true, s: 0.85, lit: 1, seed: 3 });
      if (h === 3 && S.mem) memories(g, S.mem);
    },
    script: async function (X) {
      const W = T.world, C = W.C, PL = T.plot, S = X.S, ps = S.ps, A = X.A, TALK = X.TALK, PIER = C.PIER_Y;
      const [px, py] = X.place.plot(), [qx, qy] = X.place.quay();
      S.track = null; S.swinging = false; S.lampDown = null; S.mem = null;

      /* ---- the lake, the last time ---- */
      const lake = T.lake({ paint: T.vig.bed, leo: F.leoAt(4), said: { k: 0 }, mirror: 0.5, leoFace: { old: true }, fade: { a: 0 } });
      S.view = lake;
      X.title();
      await X.wait(4.6);
      await X.tween(lake.fade, 'a', 1, 2.6);
      X.age('아나, 81');
      T.announce('호수. 병상에 누운 아나가 쉰 살이 넘은 릴리의 손을 잡고 있다.');
      await X.wait(3.4);
      await TALK.say('ana', '엄마 먼저 가서, 아빠랑 맛있는 거 해놓을게.');
      X.tween(lake.said, 'k', 0.7, 2.4);
      await TALK.say('ana', '그러니까 천천히 와.', { slow: true });
      A.motif({ voice: 'felt', vel: 0.4, beat: 0.86 });
      await X.tween(lake.said, 'k', 1, 2.2);
      await X.wait(2.6);
      /* the water goes dark */
      X.bed(null);
      await X.tween(lake.fade, 'a', 0, 3.6);
      await X.wait(1.4);
      for (let i = 0; i < 4; i++) { X.toll(i, 0.5); await X.wait(1.5); }
      T.announce('종이 울린다.');
      await X.wait(0.6);

      /* ---- the harbour ---- */
      const leo = X.actor('leo', { x: 540, style: F.leoAt(4), flip: true, lamp: true, lampHand: 'F', lean: 0.13, face: { old: true } });
      const bean = X.actor('bean', { dog: true, s: 220, x: 610, flip: true, wag: 0.4 });
      const ana = X.actor('ana', { style: F.anaAt(81), s: 142, lean: 0.07, face: { old: true } });
      const boat = X.boat({ x: -900, riders: [ana] });
      /* everyone who waited with him is on the quay too */
      const folk = [
        X.actor('v1', { x: 300, style: F.styles.villagerA, s: 142, lamp: true, lampHand: 'F', flip: true }),
        X.actor('v2', { x: 356, style: F.styles.villagerB, s: 134, flip: true }),
        X.actor('kid2', { x: 400, style: F.styles.kidB, s: 100, flip: true }),
        X.actor('v3', { x: 456, style: F.styles.villagerC, s: 142, flip: true }),
      ];
      X.cam(leo.x - 50, 548, 1.5); X.camSnap();
      S.track = { a: leo, dx: -50 };
      await X.view(null, { color: '#1b2a40', out: 1.6, in: 2.2 });
      X.bed(0, 0.11, 'still'); A.ambience(0.3, 0.3, 0.5);
      T.announce('레오가 등불을 들고 항구로 걸어 내려간다. 느린 걸음, 굽은 등. 이제야 그가 얼마나 늙었는지 보인다.');
      X.walk(bean, 210, 44);
      await X.walk(leo, 132, 40);
      S.track = null;
      X.cam(qx - 60, qy, 1.05, 0.9);
      const pressed = X.seaLamp({ rounds: [[0, 1, 2, 3], [0, 1, 2, 3, 2, 1]], beat: 1.05, shuffle: true });
      const arrived = X.sail(boat, -74, 56);
      await pressed;
      await arrived;
      S.camK = 2;
      /* he sets the lamp down, and takes off his cap */
      leo.lamp = false; S.lampDown = leo.x + 34;
      leo.doff = 0; leo.hug = { k: 0 }; ana.hug = { k: 0 };
      leo.pose = (o, a, t) => {
        if (a.hand) { const mx = (ana.x + leo.x) / 2, my = W.groundAt(mx) - 58; o.armB = { hand: F.local(o, mx, my) }; o.lean = 0.1; return; }
        const d = a.doff;
        if (d > 0 && d < 1) { const k = Math.sin(d * Math.PI); o.armF = { hand: F.local(o, T.lerp(a.x - 14, a.x - 4, k), T.lerp(o.y - 6, o.y - 96, k)), bend: 1 }; }
        else if (d >= 1) o.armF = { a: 0.35, b: 1.3 };
        o.face.tear = a.wet || 0; o.face.tearY = (t * 2) % 3;
        T.embrace(o, leo, ana, a.hug.k, true);
      };
      leo.prop = (g, j, o, a) => { if (a.doff >= 0.5 && !a.hand) { g.save(); g.translate(j.handF[0], j.handF[1] + 4); g.rotate(-0.3); P.fill(g, P.soft([[-12, 4], [-11, -6], [0, -11], [11, -6], [12, 4]]), '#d7a23c'); P.fill(g, P.rr(-13, 2, 26, 6, 3), '#e4b85a'); g.restore(); } };
      await X.land(ana, 30);
      T.announce('배에서 백발의 아나가 내린다.');
      X.cam(84, 548, 1.55, 1.1);
      await X.wait(1);
      X.tween(leo, 'doff', 1, 1.5, T.ease.lin);
      await X.wait(0.75);
      leo.style = F.leoBare();
      await X.wait(1.6);
      ana.pose = (o, a, t) => {
        if (a.hand) { const mx = (ana.x + leo.x) / 2, my = W.groundAt(mx) - 58; o.armF = { hand: F.local(o, mx, my) }; return; }
        o.headTilt = -0.12; o.face.tear = a.wet || 0; o.face.tearY = (t * 2) % 3;
        T.embrace(o, ana, leo, a.hug.k);
      };
      await X.tap(() => [ana.x, PIER - 70, 60]);
      await X.walk(ana, leo.x - 58, 38);
      await X.wait(1.2);
      await TALK.say('ana', '…당신, 왜 이렇게 늙었어?');
      await X.wait(0.5);
      await TALK.say('leo', '같이 늙자며.', { slow: true });
      ana.wet = 0.8; leo.wet = 0.6;
      await X.tap(() => [(ana.x + leo.x) / 2, PIER - 78, 56]);
      leo.armOver = true; ana.z = 1;
      await X.tween(ana.hug, 'k', 1, 1.1, T.ease.out);
      X.tween(leo.hug, 'k', 1, 1.1, T.ease.out);
      T.announce('두 사람이 끌어안는다. 긴 침묵.');
      X.bed(null);
      bean.sit = 1;
      await X.wait(7.5);          /* the long quiet */
      A.theme({ voice: 'felt', vel: 0.36, beat: 0.74, left: true });
      await X.wait(2.5);
      await TALK.say('leo', '기다리는 동안… 당신을 위해서 참 많은 걸 했어.', { slow: true });
      /* the ones who waited with him */
      X.cam(200, 520, 1.2, 0.8);
      await X.walk(folk[0], 196, 60);
      folk[0].flip = true;
      await TALK.say('v1', '어서 와요.\n천천히 오셨네.');
      await TALK.say('ana', '…다들 이 사람을 아세요?');
      const hello = (o, a, t) => { o.armF = { a: 2.4 + Math.sin(t * 9 + a.x) * 0.25, b: 0.3 }; o.face.eye = 'happy'; };
      folk.slice(1).forEach((a) => { a.pose = hello; });
      await TALK.say('v2', '얘기 많이 들었어요!');
      await TALK.say('v3', '집 짓는 거,\n우리가 다 봤지.');
      await TALK.say('ana', '…이 사람, 혼자가 아니었네요.');
      folk.forEach((a) => { a.pose = null; });
      await X.wait(0.8);

      /* ---- home ---- */
      await X.tween(ana.hug, 'k', 0, 0.9); leo.hug.k = 0; leo.armOver = false; ana.wet = 0; leo.wet = 0;
      leo.hand = ana.hand = true; leo.flip = ana.flip = false; bean.sit = 0;
      X.cam(qx + 150, qy, 1.05, 0.7);
      X.walk(bean, 700, 96); X.walk(ana, 560, 58); X.walk(leo, 604, 58);
      await X.wait(5.2);
      await X.dip(async () => {
        S.actors = S.actors.filter((a) => !folk.includes(a));
        leo.go = ana.go = bean.go = null; leo.moving = ana.moving = bean.moving = false;
        leo.x = PL.BOARD_X - 300; ana.x = leo.x - 44; bean.x = leo.x + 90;
        S.mem = { house: 0, table: 0, swing: 0, ps };
        X.follow(leo, 90); X.camSnap();
      }, { out: 1.2, in: 1.6 });
      T.announce('둘이 손을 잡고 언덕을 오른다. 레오가 지은 것들 위로, 옛 기억이 분필과 크레용 선으로 겹친다.');
      X.walk(bean, PL.HX + 156, 88).then(() => { bean.flip = true; bean.sit = 1; });
      X.walk(ana, PL.BOARD_X - 16, 58);
      await X.walk(leo, PL.BOARD_X + 28, 58);
      /* one line was left on the list */
      leo.hand = ana.hand = false; leo.flip = true;
      await X.tap(() => [PL.BOARD_X, W.y3(PL.BOARD_X) - 74, 44]);
      await X.card(PL.boardCard, {
        init: { w: 5, cross: [1, 1, 1, 1, 0], glow: 0.9 }, max: 12,
        run: async (c) => {
          await X.wait(0.6);
          c.ready = true; await X.any(); c.ready = false;
          A.sfx('crayon'); X.tween(c, 'glow', 0, 1.2);
          await X.tween(c.cross, 4, 1, 1.1, T.ease.lin);
          ps.cross[4] = 1;
          T.announce('마지막 줄, 같이 늙기에 줄을 긋는다.');
          A.promise();
          await X.wait(0.8);
        },
      });
      X.bed(4, 0.13, 'walk');
      leo.hand = ana.hand = true; leo.flip = ana.flip = false;
      X.tween(S.mem, 'house', 1, 3.4, T.ease.lin);
      X.walk(ana, PL.HX + 28, 54);
      X.walk(leo, PL.HX + 72, 54).then(() => { leo.hand = ana.hand = false; });
      await X.wait(3.2);
      X.cam(PL.HX + 150, py + 6, 1, 0.8);
      await X.tween(S.mem, 'table', 1, 2.2, T.ease.lin);
      await X.tween(S.mem, 'swing', 1, 2.4, T.ease.lin);
      ana.pose = (o, a, t) => { o.headTilt = -0.2; o.armF = { a: 1.3, b: 0.4 }; o.face.eye = 'happy'; };
      X.notes(4, { voice: 'box', vel: 0.3 });
      await X.wait(3.6);

      /* ---- the kitchen ---- */
      const St = T.scenes.stew, kv = kitchen();
      await X.view(kv, { out: 1.4, in: 1.6 });
      S.mem = null; ps.table = false;
      T.announce('레오가 지은 넓은 부엌. 레오가 스튜를 끓이고, 아나가 조리대에 앉아 맛을 본다.');
      await X.wait(4.2);
      await X.tween(St.taste, 'k', 1, 1.2, T.ease.io);
      A.sfx('bubble');
      await X.wait(1.3);
      await TALK.say('ana', '내가 끓인 게 더 맛있는데?');
      await X.wait(0.3);
      await TALK.say('leo', '알아. 45년 동안 따라 끓였어.');
      X.tween(St.joy, 'k', 1, 0.7, T.ease.out);
      X.tween(St.taste, 'k', 0, 1.2, T.ease.io);
      X.notes(5, { voice: 'box', vel: 0.34 });
      await X.wait(4.6);

      /* ---- epilogue: night, the swing ---- */
      ps.night = 1;
      for (let i = 0; i < 96; i++) ps.aurora.push([-470 + i * 9.6 + T.noise(i * 0.7, 3) * 14, 176 + Math.sin(i * 0.085) * 56 + T.noise(i * 0.31, 8) * 16]);
      leo.pose = (o, a, t) => { if (a.onSwing) { PL.sitOnSwing(o, ps, -1); o.face.eye = 'happy'; o.headTilt = -0.1; } else if (a.lay) { o.lean = 0.3; o.armF = { hand: F.local(o, PL.ROOM_X - 8, W.y3(PL.ROOM_X) - 14) }; o.armB = { hand: F.local(o, PL.ROOM_X - 2, W.y3(PL.ROOM_X) - 8) }; } };
      ana.pose = (o, a, t) => { if (a.onSwing) { PL.sitOnSwing(o, ps, 1); o.face.eye = a.look ? 'open' : 'happy'; o.headTilt = a.look ? 0.14 : -0.1; if (a.look) o.armF = { a: 1.5, b: 0.2 }; } else if (a.lay) { o.lean = 0.3; o.armF = { hand: F.local(o, PL.ROOM_X + 8, W.y3(PL.ROOM_X) - 14) }; o.armB = { hand: F.local(o, PL.ROOM_X + 2, W.y3(PL.ROOM_X) - 8) }; } };
      leo.prop = null; leo.onSwing = ana.onSwing = true; leo.hill = ana.hill = 3; ana.z = 1;
      leo.x = PL.swingSeat(ps)[0] - 24; ana.x = leo.x + 48;
      bean.x = PL.TREE_X - 150; bean.flip = false; bean.sit = 1; ps.spot = [PL.swingSeat(ps)[0]];
      S.swinging = true;
      X.cam(PL.TREE_X + 10, py + 52, 1.5); X.camSnap();
      await X.view(null, { color: '#161d2a', out: 1.6, in: 2.2 });
      X.bed(5, 0.14, 'night');
      T.announce('밤. 오로라 아래, 둘이 앉게 넓힌 그네에 레오와 아나가 나란히 앉아 있다.');
      await X.wait(4.4);
      ana.look = true;
      await TALK.say('ana', '릴리 방도 만들어야지.');
      ana.look = false;
      X.cam(PL.ROOM_X + 50, py + 50, 1.4, 0.9);
      await X.tap(() => [PL.ROOM_X, W.y3(PL.ROOM_X) - 10, 44]);
      S.swinging = false; ps.swingA = 0;
      leo.onSwing = ana.onSwing = false; leo.hill = ana.hill = null;
      leo.x = PL.TREE_X + 20; ana.x = PL.TREE_X + 44;
      bean.sit = 0; X.walk(bean, PL.ROOM_X + 128, 84).then(() => { bean.flip = true; bean.sit = 1; });
      X.walk(ana, PL.ROOM_X + 34, 62);
      await X.walk(leo, PL.ROOM_X - 34, 62);
      leo.flip = false; ana.flip = true;
      leo.lay = ana.lay = true;
      X.tween(leo, 'sit', 0.5, 0.7); await X.tween(ana, 'sit', 0.5, 0.7);
      A.sfx('knock'); X.note();
      await X.tween(ps, 'room2', 1, 1.6);
      T.announce('둘이 함께, 릴리의 방이 될 자리의 첫 주춧돌을 놓는다.');
      leo.lay = ana.lay = false;
      X.tween(leo, 'sit', 0, 0.8); await X.tween(ana, 'sit', 0, 0.8);
      /* and they turn to the sea, where boats come from */
      X.walk(ana, PL.ROOM_X + 76, 40);
      await X.walk(leo, PL.ROOM_X + 36, 40);
      leo.flip = ana.flip = true; leo.hand = ana.hand = false; ps.spot = [PL.ROOM_X + 56];
      ana.pose = (o, a, t) => { o.armB = { hand: F.local(o, (ana.x + leo.x) / 2, W.groundAt(ana.x) - 58) }; o.headTilt = -0.1; o.face.eye = 'happy'; };
      leo.pose = (o, a, t) => { o.armF = { hand: F.local(o, (ana.x + leo.x) / 2, W.groundAt(leo.x) - 58) }; o.headTilt = -0.1; o.face.eye = 'happy'; };
      X.cam(PL.ROOM_X + 24, py + 56, 1.45, 0.6);
      await X.wait(1.8);
      await TALK.say('both', '천천히 와.', { slow: true });
      X.bed(null);
      A.theme({ voice: 'box', vel: 0.36, beat: 0.66, left: true });
      await X.wait(3.2);
      X.end();
    },
  });
})();
