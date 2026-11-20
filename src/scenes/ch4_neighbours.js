/* Chapter 4 「이웃들」 — years five to fifteen. The bell rings for other people, and he goes down
   to the quay each time and watches what a reunion is: a dog who came for him and not the house,
   a wife who took fifty years, a baby who arrives with white hair. That night the lake shows him
   her first grey hair, and his own face beside it. */
(function () {
  'use strict';
  const T = window.TYT, P = T.P, F = T.F;

  const wave = (o, a, t) => { o.armF = { a: 2.4 + Math.sin(t * 9 + a.x) * 0.25, b: 0.3 }; o.face.eye = 'happy'; };
  const cane = (g, j, o) => { const gy = T.world.groundAt(o.x); P.line(g, j.handF[0], j.handF[1], j.handF[0] + (o.flip ? -8 : 8), gy, 3, '#6b4f52'); };

  T.stage('ch4', {
    chapter: 4, title: ['4장', '이웃들'], end: ['4장 끝', '5장 「꽃길」'], next: 'ch5', pad: 1, nextColor: '#fff6e6',
    plot: { stage: 2, stones: 4, board: true, table: true, tree: 0.25 },
    build() { T.scenes.kitchen.build(); },
    onHill(g, h, S) {
      if (h !== 1 || !S.rope) return;
      const b = S.rope.boat, y = T.world.surf(b.x) - 34;
      g.strokeStyle = '#d9c9a8'; g.lineWidth = 3; g.lineCap = 'round';
      g.beginPath(); g.moveTo(b.x + 196, y - 70); g.quadraticCurveTo((b.x + 212) / 2 + 16, T.world.C.PIER_Y + 10, 16, T.world.C.PIER_Y - 28); g.stroke();
    },
    script: async function (X) {
      const W = T.world, C = W.C, PL = T.plot, S = X.S, ps = S.ps, A = X.A;
      const PIER = C.PIER_Y;
      const [px, py] = X.place.plot();
      X.cam(px, py, 1); X.camSnap();
      let leo = X.actor('leo', { x: PL.HX + 150, style: F.leoAt(0), flip: true });
      leo.pose = (o, a, t) => { if (!a.moving) { const sw = Math.max(0, Math.sin(t * 5.6)); o.armF = { a: 1.2 + sw * 0.9, b: 0.8 - sw * 0.6 }; } };
      X.title();
      await X.wait(5.4);

      /* ---- the bell: someone is coming, and he has nothing ready ---- */
      X.toll(0); await X.wait(1.6); X.toll(1);
      leo.pose = null;
      await X.wait(1.2);
      X.walk(leo, PL.HX - 420, 96);
      await X.wait(1.6);
      const crowd = [];
      const quay = async (age, set) => {
        await X.dip(async () => {
          S.actors = []; S.boats = []; S.rope = null; crowd.length = 0;
          const [qx, qy] = X.place.quay(); X.cam(qx, qy, 1.05); X.camSnap();
          set();
        });
        X.age(age);
      };
      let nana, bean;
      await quay('아나, 41', () => {
        leo = X.actor('leo', { x: 620, style: F.leoAt(0), flip: true });
        nana = X.actor('nana', { x: 300, style: F.styles.nana, s: C.NANA_S, lamp: true, lampHand: 'F', lean: 0.1, flip: true });
        bean = X.actor('bean', { dog: true, s: 220, wag: 1 });
        S.b1 = X.boat({ x: -760, riders: [bean] }); bean.seat = 34;
      });
      X.walk(leo, 250, 110);
      await X.sail(S.b1, -74, 84);
      T.announce('배 위에 늙은 강아지 한 마리. 빈이다.');
      A.sfx('door');
      await X.land(bean, 70);
      bean.flip = false; bean.wagRate = 16;
      await X.wait(0.5);
      /* he looks back up the hill at his bare frame */
      leo.pose = (o, a, t) => { o.armF = { a: 2.7, b: 2.2 }; o.headTilt = -0.1; }; leo.flip = false;
      await X.wait(1.5);
      leo.flip = true;
      await X.TALK.say('nana', '저 애는 집 보러 온 게 아니라\n너 보러 온 거야.');
      leo.pose = null;
      await X.tap(() => [bean.x, PIER - 30, 56]);
      leo.sit = 0.5;
      leo.pose = (o, a, t) => { o.armF = { hand: F.local(o, bean.x + 26, PIER - 34) }; o.armB = { hand: F.local(o, bean.x + 20, PIER - 20) }; o.lean = 0.3; o.face.eye = bean.x > 150 ? 'happy' : 'open'; };
      await X.walk(bean, leo.x - 46, 150);
      X.notes(4);
      for (let i = 0; i < 5; i++) { await X.tween(bean, 'jump', 14, 0.16, T.ease.out); await X.tween(bean, 'jump', 0, 0.16, T.ease.in); }
      T.announce('빈이 달려와 레오 품에 안긴다.');
      await X.wait(2.2);

      /* ---- Captain Bram's wife: fifty years, and she is in no hurry now either ---- */
      let bram, wife;
      await quay('아나, 46', () => {
        bram = X.actor('bram', { x: 96, style: F.styles.bram, s: 144, flip: true, lean: 0.06 });
        bram.pose = (o, a, t) => { if (!a.moving && !a.boat) { o.armF = { a: -0.5, b: -0.3 }; o.armB = { a: -0.5, b: -0.3 }; o.y += Math.sin(t * 2.4) * 1.5; } };
        leo = X.actor('leo', { x: 392, style: F.leoAt(0), flip: true });
        bean = X.actor('bean', { dog: true, s: 220, x: 440, sit: 1, flip: true, wag: 0.6 });
        nana = X.actor('nana', { x: 322, style: F.styles.nana, s: C.NANA_S, lamp: true, lampHand: 'F', lean: 0.1, flip: true });
        crowd.push(X.actor('v1', { x: 486, style: F.styles.villagerA, s: 142, flip: true }), X.actor('v2', { x: 268, style: F.styles.villagerB, s: 134, flip: true }), X.actor('v3', { x: 222, style: F.styles.rosa, s: 138, flip: true }));
        wife = X.actor('wife', { style: F.styles.bramWife, s: 106, lean: 0.24, face: { old: true } });
        S.b1 = X.boat({ x: -900, riders: [wife] });
      });
      X.toll(2);
      const pressed = X.swell(-470);
      X.sail(S.b1, -74, 30);
      await pressed;
      await new Promise((res) => { const iv = () => (S.b1.x >= -74.5 ? res() : X.wait(0.2).then(iv)); iv(); });
      A.sfx('door');
      X.walk(bram, 62, 50);
      await X.land(wife, 24);
      wife.prop = cane;
      bram.pose = (o, a, t) => { o.armF = { hand: F.local(o, wife.x + 14, PIER - 62) }; o.lean = 0.14; };
      await X.wait(1.4);
      bram.flip = false;
      await X.TALK.say('bram', '그 사람은 원래 뭐든 천천히 했어.');
      bram.flip = true;
      await X.wait(0.8);
      /* his boat goes into the water for the first time, with her in it */
      await X.dip(async () => {
        W.S.hook.flags.bramGone = true;
        S.boats = [];
        const big = X.boat({ x: -236, big: true, riders: [] });
        bram.boat = big; bram.seat = -70; bram.stand = 1; bram.hop = 0; bram.flip = true; big.riders.push(bram);
        wife.boat = big; wife.seat = 40; wife.stand = 0; wife.hop = 0; wife.flip = true; wife.prop = null; big.riders.push(wife);
        bram.pose = (o, a, t) => { o.armF = { a: 1.1, b: 0.4 }; };
        S.rope = { boat: big }; S.big = big;
        X.cam(60, 452, 1);
      }, { out: 0.8, in: 1 });
      T.announce('브램 선장의 배가 처음으로 물에 떴다. 아흔아홉 살 아내가 타고 있다.');
      await X.tap(() => [16, PIER - 30, 50]);
      S.rope = null;
      A.sfx('whoosh'); A.pad(3, 0.16); A.theme({ voice: 'box', vel: 0.3, beat: 0.62, left: false });
      X.sail(S.big, -1500, 54);
      [leo, nana].concat(crowd).forEach((a) => { a.pose = wave; });
      bram.pose = wave; wife.pose = (o, a, t) => { o.armF = { a: 2.0 + Math.sin(t * 5) * 0.2, b: 0.3 }; };
      for (let i = 0; i < 4; i++) { await X.tween(bean, 'jump', 12, 0.18, T.ease.out); await X.tween(bean, 'jump', 0, 0.18, T.ease.in); await X.wait(0.5); }
      X.cam(-240, 452, 1, 0.5);
      await X.wait(6);

      /* ---- Rosa's baby ---- */
      let rosa, son;
      await quay('아나, 51', () => {
        S.camK = 2;
        rosa = X.actor('rosa', { x: 110, style: F.styles.rosa, s: 140, flip: true });
        rosa.pose = (o, a, t) => { if (!a.hug) { o.armF = { hand: [10, -14] }; o.armB = { hand: [8, -10] }; o.y += Math.abs(Math.sin(t * 4)) * -3; } };
        rosa.prop = (g, j, o, a) => { if (!a.hug) P.fill(g, P.rr(j.handF[0] - 12, j.handF[1] - 6, 26, 16, 5), '#fbf7ec'); };
        leo = X.actor('leo', { x: 392, style: F.leoAt(0), flip: true });
        bean = X.actor('bean', { dog: true, s: 220, x: 440, sit: 1, flip: true, wag: 0.6 });
        nana = X.actor('nana', { x: 322, style: F.styles.nana, s: C.NANA_S, lamp: true, lampHand: 'F', lean: 0.1, flip: true });
        son = X.actor('son', { style: F.styles.rosaSon, s: 144, lean: 0.16, face: { old: true } });
        S.b1 = X.boat({ x: -820, riders: [son] });
      });
      X.toll(3);
      await X.sail(S.b1, -74, 76);
      A.sfx('door');
      await X.land(son, 40);
      son.prop = cane;
      await X.wait(0.9);
      /* she does not stop to wonder */
      rosa.hug = { k: 0 }; son.hug = rosa.hug; son.prop = null;
      rosa.pose = (o, a, t) => T.embrace(o, rosa, son, rosa.hug.k);
      son.pose = (o, a, t) => { T.embrace(o, son, rosa, rosa.hug.k, true); o.lean += 0.26 * rosa.hug.k; };
      son.armOver = true; rosa.z = 1;
      await X.walk(rosa, son.x + 34, 150);
      rosa.flip = true;
      await X.tween(rosa.hug, 'k', 1, 0.7, T.ease.out);
      A.motif({ voice: 'box', vel: 0.36, beat: 0.7 });
      await X.wait(1.4);
      await X.TALK.say('rosa', '우리 아기.', { slow: true });
      await X.wait(2.4);

      /* ---- that night ---- */
      const lake = T.lake({ paint: T.vig.gray, leo: F.leoAt(0), found: { k: 0 }, mirror: 0.25, leoFace: {} });
      await X.view(lake, { color: '#1b2a40' });
      A.pad(4, 0.14);
      T.announce('그날 밤, 호수. 아나의 머리에 첫 흰머리가 비친다.');
      await X.wait(2.6);
      await X.tween(lake.found, 'k', 1, 1.5);
      X.note({ voice: 'felt', vel: 0.34 });
      await X.wait(3);
      /* and beside her picture, his own face, which has not changed in fifteen years */
      X.tween(lake.fade, 'a', 0.45, 2);
      await X.tween(lake, 'mirror', 0.9, 2);
      const Wv = T.view.W;
      await X.tap(() => [-Wv / 2 + 350, 340, 70], { screen: true });
      lake.touch(-Wv / 2 + 350, 340);
      await X.wait(1.2);
      lake.leo = F.leoAt(1);
      T.announce('레오는 그 옆에 비친 자기 얼굴을 오래 본다.');
      X.notes(3, { voice: 'felt', vel: 0.3 });
      await X.wait(4.5);
      X.end();
    },
  });
})();
