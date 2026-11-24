/* The last chapter 「마중」, and the epilogue. The lake shows her saying it to Lily, and Lily saying it back;
   the bell rings; he walks down to the harbour, old, lamp in hand, the way he has for every boat, and this
   time it is her. The little one in the pink hat turns out to be theirs: Lily's twin, who went on ahead before
   she was born, and has kept her promise to her sister from here all along. When the white boat comes for her
   she chooses to stay, to be the one who meets Lily. They walk home past everything he built; he cooks; at
   night the aurora comes out over the hill; they knit the story blanket, Ana tells him what she promised Lily,
   they set the first stone of Lily's room, and at the list on the gate he crosses off the aurora and leaves
   growing old together to be kept slowly. Then the three of them say it to Lily. */
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
    plot: { stage: 4, stones: 4, board: true, cross: [1, 1, 0, 1, 0], table: true, tree: 1, swing: 1, swingW: 1, garden: 1, patch: 3, fruit: 1, season: 'late autumn' },   /* she comes in late autumn, as he did */
    flags: { bramGone: true, rosaGone: true },
    build() { T.scenes.kitchen.build(); T.scenes.room.build(); T.scenes.stew.build(); },
    exit() { T.scenes.stew.plain = false; T.scenes.stew.cast = null; },
    update(dt, S) {
      if (S.track) S.camT.x = S.track.a.x + S.track.dx;
      if (S.swinging) S.ps.swingA = Math.sin(T.time * 1.2) * 0.4;
      /* the aurora he hung over the hill comes out once it is dark, a curtain at a time */
      if (S.aur) { const n = Math.floor(T.clamp(S.aur.k) * S.aur.pts.length); while (S.ps.aurora.length < n) S.ps.aurora.push(S.aur.pts[S.ps.aurora.length]); }
    },
    onHill(g, h, S) {
      if (h === 1 && S.lampDown != null) K.lantern(g, S.lampDown, T.world.C.PIER_Y - 22, T.time, { bare: true, s: 0.85, lit: 1, seed: 3 });
      if (h === 1 && S.cLamp != null) K.lantern(g, S.cLamp, T.world.C.PIER_Y - 14, T.time, { bare: true, s: 0.55, lit: 1, seed: 6 });
      if (h === 3 && S.mem) memories(g, S.mem);
    },
    script: async function (X) {
      const W = T.world, C = W.C, PL = T.plot, S = X.S, ps = S.ps, A = X.A, TALK = X.TALK, PIER = C.PIER_Y;
      const [, py] = X.place.plot(), [qx, qy] = X.place.quay();
      S.track = null; S.swinging = false; S.lampDown = null; S.cLamp = null; S.mem = null; S.aur = null;

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
      /* what he said to his mother on the quay, forty-five years ago */
      await TALK.say('lily', '…응. 천천히 갈게.', { slow: true });
      await X.wait(2.2);
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
      /* and 구름이, with her little lamp held out for whoever is coming */
      const cloud = X.cloudKid({ x: 254, chair: 0, lamp: true, lampHand: 'F', look: true });
      cloud.still = 0; cloud.kept = 0;
      cloud.pose = (q, a, t) => {
        const k = T.ease.io(a.still);
        q.headTilt = a.look ? T.lerp(0.04, 0, k) : -0.38 + Math.sin(t * 0.5) * 0.04;
        if (a.down) q.headTilt += 0.22;   /* down past the boat, to where the cloud sea goes on below */
        if (a.hold) { q.armF = { hand: F.local(q, (ana.x + a.x) / 2, W.groundAt(a.x) - 44) }; return; }   /* walking with Ana, her hand in Ana's */
        if (a.lay) { q.lean = 0.36; q.headTilt = 0.2; q.armF = { hand: F.local(q, PL.ROOM_X + 4, W.y3(PL.ROOM_X) - 10) }; q.armB = { hand: F.local(q, PL.ROOM_X + 10, W.y3(PL.ROOM_X) - 6) }; return; }
        if (a.family) {   /* between them, a hand in each of theirs */
          q.armF = { hand: F.local(q, (leo.x + a.x) / 2, W.groundAt(a.x) - 44) }; q.armB = { hand: F.local(q, (ana.x + a.x) / 2, W.groundAt(a.x) - 44) };
          q.headTilt = -0.08; q.face.eye = 'happy'; q.face.mouth = 'smile'; return;
        }
        if (a.point) { q.armF = { a: 2.45, b: 0.12 }; q.headTilt = -0.46; q.face.mouth = 'open'; return; }   /* sitting in the grass: up there */
        if (a.lamp) q.armF = { a: T.lerp(a.held ? 1.9 : 0.2, 0.15, k), b: T.lerp(0.5, 0.05, k) };
        if (a.happy) { q.face.eye = 'happy'; q.face.mouth = 'smile'; } else if (k > 0.5) { q.face.eye = 'open'; q.face.mouth = 'line'; }
      };
      cloud.prop = (g, j, o, a) => { if (a.kept > 0.01) P.glow(g, j.head[0], j.head[1] - 10, 90, '#fff2c8', 0.4 * a.kept); };
      /* Leo: the lamp held up for the boat; the cap off; a hand in hers, or on her shoulder */
      leo.raise = 0; leo.doff = 0; ana.pet = 0; bean.jump = 0;
      leo.pose = (o, a, t) => {
        if (a.hand) { const mx = (ana.x + leo.x) / 2, my = W.groundAt(mx) - 58; o.armB = { hand: F.local(o, mx, my) }; o.lean = 0.1; return; }
        if (a.family) { o.armB = { hand: F.local(o, (cloud.x + leo.x) / 2, W.groundAt(leo.x) - 44) }; o.armF = { a: 0.3, b: 0.5 }; o.lean = 0.1; o.headTilt = -0.06; o.face.eye = 'happy'; return; }
        if (a.lamp && a.raise > 0.01) { const k = T.ease.io(a.raise); o.armF = { a: T.lerp(0.1, 1.55, k) + Math.sin(t * 13) * 0.03 * k, b: T.lerp(0.3, 0.1, k) }; o.headTilt = (o.headTilt || 0) - 0.08 * k; }
        const d = a.doff;
        if (d > 0 && d < 1) { const k = Math.sin(d * Math.PI); o.armF = { hand: F.local(o, T.lerp(a.x - 14, a.x - 4, k), T.lerp(o.y - 6, o.y - 96, k)), bend: 1 }; }
        else if (d >= 1) o.armF = { a: 0.35, b: 1.3 };   /* the cap held to his chest */
        if (a.shoulder) {   /* a hand on her shoulder, wherever it is as she kneels and holds the little one */
          const sj = ana.lastO ? F.joints(ana.lastO).shoulder : [ana.x + 4, W.groundAt(ana.x) - 76];
          o.armB = { hand: F.local(o, sj[0], sj[1] - 2) };
        }
        o.face.tear = a.wet || 0; o.face.tearY = (t * 2) % 3;
        if (a.smile) { o.face.eye = 'happy'; o.face.mouth = 'smile'; }
      };
      leo.prop = (g, j, o, a) => { if (a.doff >= 0.5 && !a.hand && !a.family) { g.save(); g.translate(j.handF[0], j.handF[1] + 4); g.rotate(-0.3); P.fill(g, P.soft([[-12, 4], [-11, -6], [0, -11], [11, -6], [12, 4]]), '#d7a23c'); P.fill(g, P.rr(-13, 2, 26, 6, 3), '#e4b85a'); g.restore(); } };
      /* Ana on the quay: laughing at him through tears, then bending to Bean */
      const beanHead = () => [bean.x + (bean.flip ? -36 : 36), W.groundAt(bean.x) - 56 - (bean.jump || 0)];
      ana.pose = (o, a, t) => {
        o.headTilt = -0.12; o.face.tear = a.wet || 0; o.face.tearY = (t * 2) % 3;
        if (a.laugh) { o.face.eye = 'happy'; o.face.mouth = 'smile'; }
        const pk = T.ease.io(a.pet || 0);
        if (pk > 0.01) { const h = beanHead(); o.lean = (o.lean || 0) + 0.36 * pk; o.headTilt = T.lerp(o.headTilt, 0.34, pk); o.face.eye = 'happy'; o.face.mouth = 'smile'; o.armF = { hand: F.local(o, T.lerp(a.x + (a.flip ? -12 : 12), h[0], pk), T.lerp(o.y + 16, h[1], pk)) }; }
      };
      X.cam(leo.x - 50, 548, 1.5); X.camSnap();
      S.track = { a: leo, dx: -50 };
      await X.view(null, { color: '#1b2a40', out: 1.6, in: 2.2 });
      X.bed(0, 0.11, 'still'); A.ambience(0.3, 0.3, 0.5);
      T.announce('레오가 등불을 들고 항구로 걸어 내려간다. 느린 걸음, 굽은 등. 이제야 그가 얼마나 늙었는지 보인다.');
      X.walk(bean, 210, 44);
      await X.walk(leo, 132, 40);
      S.track = null;
      X.cam(qx - 60, qy, 1.05, 0.9);
      T.announce('부두 끝은 안개뿐이다. 바다 등불이 꺼진 채 서 있다.');
      const pressed = X.seaLamp({ rounds: [[0, 1, 2, 3], [0, 1, 2, 3, 2, 1]], beat: 1.05, shuffle: true });
      const arrived = X.sail(boat, -74, 46);
      await pressed;
      /* the mist parts: one small boat, and someone in it with white hair */
      cloud.held = true;   /* she holds her lamp up for the boat, the way she always does */
      X.bed(null); S.bedNow = null;   /* nothing now but the sea */
      T.announce('안개가 걷힌다. 작은 배 한 척이 천천히 들어온다. 배에 백발의 여자가 앉아 있다.');
      await X.wait(2);
      X.cam(-30, 540, 1.25, 0.5);
      X.tween(ana, 'stand', 1, 1.8, T.ease.io);   /* she has seen him: she gets up in the boat */
      await X.wait(1.4);
      X.tween(leo, 'raise', 1, 1.6, T.ease.io);   /* his lamp goes up, as it has for every boat; this time his hand shakes */
      A.note({ m: 76, vel: 0.2, voice: 'glass', dur: 2.4 });
      await X.wait(1.4);
      await TALK.say('leo', '…아나.', { slow: true });
      await arrived;
      S.camK = 2;
      await X.wait(0.5);
      /* he lowers the lamp and sets it down at his feet */
      await X.tween(leo, 'raise', 0, 1.1, T.ease.io);
      leo.lamp = false; S.lampDown = leo.x + 34;
      await X.land(ana, 30);
      T.announce('아나가 부두에 내린다. 몇 걸음 떨어져, 둘이 서로를 본다.');
      X.tween(cloud, 'still', 1, 2.4, T.ease.io);   /* the little lamp sinks; she stands quite still, looking */
      X.cam(84, 548, 1.55, 1.1);
      await X.wait(2.4);
      /* he takes his cap off: all of it white */
      X.tween(leo, 'doff', 1, 1.5, T.ease.lin);
      await X.wait(0.75);
      leo.style = F.leoBare();
      await X.wait(1.6);
      ana.laugh = true; ana.wet = 0.7;
      await TALK.say('ana', '…당신, 왜 이렇게 늙었어?');
      await X.wait(0.5);
      await TALK.say('leo', '같이 늙자며.', { slow: true });
      leo.wet = 0.6; ana.laugh = false; ana.wet = 0.85;
      await X.walk(ana, leo.x - 58, 34);
      await X.wait(0.8);
      await X.tap(() => [(ana.x + leo.x) / 2, PIER - 78, 56]);
      ana.z = 1;
      X.gesture(leo, 'hug', { with: ana, hold: true, in: 1.4, out: 1.2 });   /* both: arms round each other, rocking a little */
      X.gesture(ana, 'cry', { hands: 'none', hold: true, in: 1.8, out: 2.6 });   /* and she sobs into his shoulder */
      await X.wait(1.4);
      T.announce('두 사람이 끌어안는다. 오래도록 아무 말이 없다.');
      bean.sit = 1;
      X.sail(boat, -1500, 20);   /* the boat that brought her goes back out into the mist */
      X.cam((ana.x + leo.x) / 2, 560, 1.95, 0.35);
      await X.wait(6.5);           /* the long quiet */
      A.theme({ voice: 'felt', vel: 0.36, beat: 0.74, left: true });
      X.ungesture(ana, 'cry');   /* the sobbing eases; they go on holding each other */
      await X.wait(2.4);
      /* what he told her in the hospital, forty-five years ago, the other way round */
      await TALK.say('leo', '…천천히 왔네.', { slow: true });
      await TALK.say('ana', '천천히 오라며.');
      await TALK.say('leo', '응.\n…고마워, 천천히 와 줘서.', { slow: true });
      await X.wait(0.8);
      await TALK.say('leo', '집 지어 놨어. 마당도 있어.\n스튜도 끓여 놨고.');
      /* what he asked his own mother on this quay, and what she told him */
      await TALK.say('ana', '…그 말, 진짜였어?', { slow: true });
      await TALK.say('leo', '나도 몰랐어.\n와 보니까 정말 있더라.');
      await X.wait(0.6);

      /* ---- Bean has waited as long as anyone ---- */
      await X.ungesture(leo, 'hug');
      ana.wet = 0.4; leo.wet = 0.3;
      X.cam(70, 548, 1.6, 0.8);
      bean.sit = 0; bean.wag = 1; bean.wagRate = 16; bean.z = 2; bean.run = 0.4;
      A.sfx('bark');
      await X.walk(bean, 20, 110);
      bean.run = 0; bean.flip = false;
      ana.flip = true;   /* she turns round to him */
      X.tween(ana, 'pet', 1, 0.9, T.ease.io);
      for (let i = 0; i < 2; i++) { await X.tween(bean, 'jump', 10, 0.16, T.ease.out); await X.tween(bean, 'jump', 0, 0.16, T.ease.in); }
      await TALK.say('ana', '…빈?\n너도 여기 있었구나.', { slow: true });
      await X.wait(0.6);
      bean.sit = 1; bean.wagRate = 10;
      await X.tween(ana, 'pet', 0, 0.8, T.ease.io);
      ana.flip = false;
      /* the ones who waited with him */
      X.cam(200, 520, 1.2, 0.8);
      await X.walk(folk[0], 196, 60);
      folk[0].flip = true;
      await TALK.say('v1', '어서 와요.\n종만 울리면 이 양반이 제일 먼저 내려왔어요.');
      await TALK.say('ana', '…매번요?');
      await TALK.say('v3', '매번요. 사십오 년을.');
      const hello = (o, a, t) => { o.armF = { a: 2.4 + Math.sin(t * 9 + a.x) * 0.25, b: 0.3 }; o.face.eye = 'happy'; };
      folk.slice(1).forEach((a) => { a.pose = hello; });
      await TALK.say('v2', '얘기 많이 들었어요!');
      await TALK.say('ana', '…이 사람, 혼자가 아니었네요.');
      folk.forEach((a) => { a.pose = null; });
      await X.wait(0.8);

      /* ---- the little one with the lamp ----
         Ana sees the hat she knitted, twice over, for two babies; one of them never came out into the world */
      [384, 424, 456, 496].forEach((x, i) => X.walk(folk[i], x, 60).then(() => { folk[i].flip = true; }));   /* the neighbours step back up the quay */
      leo.flip = false; ana.wet = 0;
      bean.sit = 0; X.walk(bean, 112, 50).then(() => { bean.flip = false; bean.sit = 1; });
      ana.pose = (o) => { o.headTilt = 0.08; o.face.eye = 'open'; o.face.mouth = 'line'; };
      X.cam(180, 540, 1.4, 0.8);
      T.announce('아나의 눈이 등불을 든 작은 아이에게 가 멈춘다. 아이가 쓴 작은 분홍 털모자.');
      await X.wait(1.6);
      await TALK.say('ana', '…그 모자.', { slow: true });
      X.cam(cloud.x - 30, 560, 1.9, 0.7);
      X.walk(leo, cloud.x + 52, 34).then(() => { leo.flip = true; });   /* he comes round to the little one's other side */
      await X.walk(ana, cloud.x - 44, 34);
      /* she goes down on one knee in front of her (the back foot back, the front foot forward, then down) */
      ana.pose = (o, a, t) => {
        o.lean = 0.08;
        o.face.eye = a.wet > 0.5 ? 'happy' : 'open'; o.face.mouth = a.wet > 0.5 ? 'smile' : 'line'; o.face.tear = a.wet || 0; o.face.tearY = (t * 2) % 3;
        if (a.wet > 0.5) { o.face.well = 0.8; o.face.roll = t / 1.9; o.face.rollA = 0.8; }   /* smiling, and the tears coming */
      };
      await X.gesture(ana, 'kneel', { with: cloud, hold: true, in: 1.7, out: 1.4 });
      X.gesture(ana, 'hand-on-head', { with: cloud, hold: true, in: 1.1, face: false, partnerOpts: { face: false } });   /* a hand on the hat */
      A.note({ m: 76, vel: 0.22, voice: 'glass', dur: 1.2 });
      await X.wait(1.4);
      await TALK.say('ana', '…이 모자, 어디서 났니?');
      await TALK.say('cloud', '몰라.\n처음부터 쓰고 있었어.');
      await X.wait(0.8);

      /* ---- what the hat remembers: a night fifty-one years ago ---- */
      const mem = T.twins();
      A.theme({ voice: 'hum', vel: 0.3, beat: 0.92, left: true, at: 1.2 });   /* she used to hum it to the two of them */
      await X.view(mem, { color: '#f3ead8', out: 1.6, in: 2 });
      X.age('아나, 30');
      T.announce('기억. 쉰한 해 전의 밤, 작은 침실. 배가 부른 아나가 레오와 침대 끝에 앉아 사진 한 장을 들여다본다. 탁자 위에는 똑같은 분홍 털모자 둘. 하나는 아직 바늘에 걸려 있다.');
      await X.wait(3.4);
      X.tween(mem.close, 'k', 1, 1.8, T.ease.io);
      T.announce('초음파 사진. 까만 바탕에, 작은 아기 둘이 서로를 향해 웅크리고 있다.');
      await X.wait(2.4);
      X.tween(mem.shine, 'k', 1, 1.6);
      await TALK.say('ana', '둘이 사이좋게,\n서로 아껴 주고 지켜 주렴.', { slow: true });
      X.tween(mem.shine, 'k', 0, 1.2);
      await X.tween(mem.close, 'k', 0, 1.4, T.ease.io);
      X.tween(mem.belly, 'k', 1, 1.2, T.ease.io);
      X.tween(mem.lean, 'k', 1, 0.8);
      await TALK.say('leo', '…오늘만 열 번째야.');
      await TALK.say('ana', '날마다 할 거야.');
      await X.wait(1.8);
      await X.view(null, { color: '#f3ead8', out: 1.6, in: 1.8 });

      /* ---- back on the quay: the little one is looking up at her, head on one side ---- */
      X.cam(cloud.x - 24, 566, 2.2); X.camSnap();
      A.theme({ voice: 'felt', vel: 0.24, beat: 0.9, left: true, at: 0.6 });
      await X.wait(1.4);
      await TALK.say('cloud', '…아줌마 목소리, 알아.', { slow: true });
      await TALK.say('cloud', '둘이 사이좋게,\n서로 아껴 주고 지켜 주렴.', { slow: true });
      ana.wet = 0.9;
      await X.wait(1.2);
      await TALK.say('ana', '…릴리 동생이구나.\n우리 둘째.', { slow: true });
      await X.wait(1);
      leo.wet = 0.5;
      await TALK.say('leo', '…릴리 모자랑 똑같다고만 생각했는데.', { slow: true });
      await TALK.say('ana', '둘이 쓰라고 똑같이 두 개 떴었어.\n하나는… 당신 몰래 서랍에 넣어 두고.');
      await X.wait(0.6);
      /* who she is, said to her, plainly and gently */
      await TALK.say('ana', '너는 릴리랑 같이\n엄마 배 속에 있었어.');
      await TALK.say('ana', '그런데 세상에 나오기 전에,\n너 혼자 먼저 왔구나.', { slow: true });
      await TALK.say('leo', '…내가 오기 전부터,\n여기서 기다리고 있었구나.', { slow: true });
      await X.wait(0.6);
      /* what she has been asking since the year Bram went: and he said they would find it together */
      await TALK.say('cloud', '…그럼 내 약속은 뭐야?');
      await TALK.say('leo', '…찾았네.\n언니랑 서로 지켜 주는 거.');
      await TALK.say('leo', '…호수에서 릴리 옆에 있던 게,\n너였구나.', { slow: true });
      await TALK.say('ana', '릴리, 잘 컸어.\n무서울 땐 누가 손 잡아 준다고 했지.');
      await TALK.say('ana', '…네가 지켜 줬구나.', { slow: true });
      /* and with that, the promise she could not keep is kept: from here, all along */
      A.promise();
      T.announce('구름이에게 빛이 내려앉는다. 지키지 못한 약속이 지켜졌다. 등불 없는 하얀 배가 부두 끝으로 미끄러져 와서 기다린다.');
      X.ungesture(ana, 'hand-on-head');
      X.tween(cloud, 'kept', 1, 1.2).then(() => X.tween(cloud, 'kept', 0.25, 2.4));
      const white = X.boat({ x: -760, hull: '#e9e2d6', lamp: false, riders: [] });
      X.cam(70, 540, 1.5, 0.7);
      await X.sail(white, -74, 110);
      await X.wait(1);
      cloud.flip = true;   /* she turns and looks at it a while; it has come for her */
      await X.wait(1.6);
      await TALK.say('cloud', '…하얀 배.');
      await TALK.say('leo', '너 데리러 온 거야.\n다 지켰으니까.');
      await X.wait(0.8);
      await TALK.say('cloud', '…언니는?');
      await TALK.say('ana', '언니는 아직 저 아래 있어.\n천천히 오라고 했어.');
      await X.wait(0.8);
      /* she takes her lamp to the end of the quay, the way she has for every boat, and looks a long while:
         at the boat, and then down, to where the ones who come are coming from */
      cloud.z = 3; ana.flip = true;
      X.cam(30, 556, 1.9, 0.5);
      bean.sit = 0; X.walk(bean, 108, 34).then(() => { bean.flip = true; bean.sit = 1; });   /* Bean goes with her */
      await X.walk(cloud, 46, 40);
      cloud.flip = true; cloud.held = true;
      X.tween(cloud, 'still', 0, 1.1, T.ease.io);
      T.announce('구름이가 등불을 들고 부두 끝에 선다. 하얀 배를 한참 보다가, 구름바다 저 아래를 내려다본다.');
      await X.wait(2.6);
      cloud.down = true;
      await X.wait(1.8);
      await TALK.say('cloud', '처음 오면, 다들 무서워하잖아.', { slow: true });
      await X.wait(0.6);
      cloud.down = false; cloud.held = false;
      X.tween(cloud, 'still', 1, 0.9, T.ease.io);
      await X.walk(cloud, ana.x - 40, 40);
      cloud.flip = false;
      X.cam(ana.x - 10, 566, 2.1, 0.7);
      await X.wait(0.6);
      await TALK.say('cloud', '언니 올 때도,\n내가 손 잡아 줄래.');
      await TALK.say('ana', '…한참 걸릴 텐데.', { slow: true });
      cloud.happy = true;
      await TALK.say('cloud', '괜찮아.\n기다리는 건 잘해.');
      await X.walk(leo, ana.x + 36, 30);
      leo.flip = true; leo.smile = true;
      await TALK.say('leo', '…아빠도 잘해.', { slow: true });
      await X.wait(0.6);
      await TALK.say('cloud', '언니 올 때까지,\n여기서 같이 기다릴래.');
      /* she sets her little lamp down on the boards, and Ana holds her */
      cloud.lamp = false; S.cLamp = cloud.x - 24;
      ana.z = 1; cloud.z = 2; leo.shoulder = true;
      await X.gesture(ana, 'hug', { with: cloud, hold: true, in: 1.3 });   /* Ana holds her, and she holds on */
      A.motif({ voice: 'box', vel: 0.34, beat: 0.74 });
      T.announce('아나가 아이를 꼭 끌어안는다. 레오가 아나의 어깨에 손을 얹는다. 빈 하얀 배가 안개 속으로 돌아간다.');
      X.sail(white, -1500, 22);
      await X.wait(4.2);

      /* ---- home ---- */
      const homeWalk = (o, a) => {   /* Leo's hand in one of hers, the little one's in the other */
        if (a.hand) { const mx = (ana.x + leo.x) / 2; o.armF = { hand: F.local(o, mx, W.groundAt(mx) - 58) }; }
        if (cloud.hold) o.armB = { hand: F.local(o, (ana.x + cloud.x) / 2, W.groundAt(ana.x) - 44) };
      };
      await X.dip(async () => {
        S.actors = S.actors.filter((a) => !folk.includes(a)); S.boats = []; S.lampDown = null; S.cLamp = null;
        leo.go = ana.go = bean.go = cloud.go = null; leo.moving = ana.moving = bean.moving = cloud.moving = false;
        T.gesture.clear(ana); T.gesture.clear(cloud); T.gesture.clear(leo);
        ana.wet = 0; leo.shoulder = false; leo.smile = false; leo.wet = 0;
        cloud.happy = false; cloud.kept = 0; cloud.down = false; bean.z = 0; bean.wagRate = null; bean.wag = 0.4;
        leo.hand = ana.hand = true; leo.flip = ana.flip = cloud.flip = false; bean.sit = 0;
        cloud.hold = true; cloud.look = true; cloud.prop = null; cloud.z = 0;
        ana.pose = homeWalk;
        leo.x = PL.BOARD_X - 300; ana.x = leo.x - 44; bean.x = leo.x + 90; cloud.x = ana.x - 38;
        S.mem = { house: 0, table: 0, swing: 0, ps };
        X.follow(leo, 90); X.camSnap();
      }, { out: 1.2, in: 1.6 });
      T.announce('셋이 손을 잡고 언덕을 오른다. 레오가 지은 것들 위로, 옛 기억이 분필과 크레용 선으로 겹친다.');
      X.walk(bean, PL.HX + 156, 88).then(() => { bean.flip = true; bean.sit = 1; });
      X.walk(cloud, PL.BOARD_X - 54, 58);
      X.walk(ana, PL.BOARD_X - 16, 58);
      await X.walk(leo, PL.BOARD_X + 28, 58);
      /* the tomato beds on the slope: a promise to a child, kept first thing */
      leo.hand = ana.hand = false; cloud.hold = false; cloud.look = false;
      leo.flip = true; ana.flip = true;
      ana.pose = (o) => { o.headTilt = 0.1; o.face.eye = 'open'; };
      await TALK.say('ana', '…토마토네?');
      await TALK.say('leo', '피피라는 꼬마랑 같이 키웠어.\n당신 오면 제일 먼저 얘기해 주기로 했거든.');
      ana.pose = (o) => { o.headTilt = -0.06; o.face.eye = 'happy'; };
      await TALK.say('ana', '그럼 오늘 밤에 다 들려줘.\n천천히.');
      ana.pose = homeWalk;
      X.bed(4, 0.13, 'walk');
      leo.hand = ana.hand = true; cloud.hold = true; leo.flip = ana.flip = false;
      X.tween(S.mem, 'house', 1, 3.4, T.ease.lin);
      X.walk(cloud, PL.HX - 30, 54);
      X.walk(ana, PL.HX + 28, 54);
      X.walk(leo, PL.HX + 72, 54).then(() => { leo.hand = ana.hand = false; cloud.hold = false; });
      await X.wait(3.2);
      X.cam(PL.HX + 150, py + 6, 1, 0.8);
      await X.tween(S.mem, 'table', 1, 2.2, T.ease.lin);
      await X.tween(S.mem, 'swing', 1, 2.4, T.ease.lin);
      ana.pose = (o) => { o.headTilt = -0.2; o.armF = { a: 1.3, b: 0.4 }; o.face.eye = 'happy'; };
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

      /* ---- epilogue: night, the swing, and what is in the sky ---- */
      ps.night = 1; ps.aurora.length = 0;
      const AUR = [];
      for (let i = 0; i < 96; i++) AUR.push([-470 + i * 9.6 + T.noise(i * 0.7, 3) * 14, 176 + Math.sin(i * 0.085) * 56 + T.noise(i * 0.31, 8) * 16]);
      S.aur = { pts: AUR, k: 0 };
      leo.pose = (o, a, t) => {
        if (a.onSwing) { PL.sitOnSwing(o, ps, -1); o.face.eye = 'happy'; o.headTilt = -0.1; }
        else if (a.lay) { o.lean = 0.3; o.armF = { hand: F.local(o, PL.ROOM_X - 8, W.y3(PL.ROOM_X) - 14) }; o.armB = { hand: F.local(o, PL.ROOM_X - 2, W.y3(PL.ROOM_X) - 8) }; }
        else if (a.family) { o.armB = { hand: F.local(o, (cloud.x + leo.x) / 2, W.groundAt(leo.x) - 44) }; o.lean = 0.1; o.headTilt = -0.08; o.face.eye = 'happy'; }
      };
      ana.pose = (o, a, t) => {
        if (a.onSwing) { PL.sitOnSwing(o, ps, 1); o.face.eye = a.look ? 'open' : 'happy'; o.headTilt = a.look ? 0.14 : -0.1; if (a.up) { o.headTilt = -0.34; o.face.eye = 'open'; } if (a.look) o.armF = { a: 1.5, b: 0.2 }; }
        else if (a.lay) { o.lean = 0.3; o.armF = { hand: F.local(o, PL.ROOM_X + 8, W.y3(PL.ROOM_X) - 14) }; o.armB = { hand: F.local(o, PL.ROOM_X + 2, W.y3(PL.ROOM_X) - 8) }; }
        else if (a.family) { o.armF = { hand: F.local(o, (cloud.x + ana.x) / 2, W.groundAt(ana.x) - 44) }; o.headTilt = -0.08; o.face.eye = 'happy'; }
      };
      leo.prop = null; leo.onSwing = ana.onSwing = true; leo.hill = ana.hill = 3; ana.z = 1;
      leo.x = PL.swingSeat(ps)[0] - 24; ana.x = leo.x + 48;
      bean.x = PL.TREE_X - 150; bean.flip = false; bean.sit = 1; ps.spot = [PL.swingSeat(ps)[0]];
      cloud.go = null; cloud.moving = false; cloud.hold = false; cloud.x = PL.TREE_X - 58; cloud.flip = false; cloud.sit = 1; cloud.look = false;   /* in the grass by the tree, face to the sky */
      S.swinging = true;
      X.cam(PL.TREE_X + 10, py + 52, 1.5); X.camSnap();
      await X.view(null, { color: '#161d2a', out: 1.6, in: 2.2 });
      X.bed(5, 0.14, 'night');
      T.announce('밤. 둘이 앉게 넓힌 그네에 레오와 아나가 나란히 앉아 있다. 구름이는 빈 곁 풀밭에 앉아 늘 그렇듯 하늘을 본다.');
      await X.wait(3.4);
      /* the one who is always looking up sees it first */
      cloud.point = true;
      await TALK.say('cloud', '…저기.');
      X.tween(S.aur, 'k', 1, 6.5, T.ease.io);
      X.notes(3, { voice: 'glass', vel: 0.26 });
      T.announce('언덕 위 하늘 끝에서 오로라가 번져 나온다.');
      ana.up = true;
      await X.wait(3.8);
      cloud.point = false;
      await TALK.say('ana', '…오로라네.', { slow: true });
      ana.up = false;
      await TALK.say('leo', '같이 보자고 했잖아.');
      /* the evening walk with Bean, when they painted it on the sky with their fingers */
      ana.look = true;
      await TALK.say('ana', '빈이랑 언덕에서\n손가락으로 그렸던 거….');
      ana.look = false;
      await TALK.say('leo', '여긴, 그린 게 하늘에 남아.');
      A.motif({ voice: 'felt', vel: 0.32, beat: 0.86 });
      ana.up = true;
      await X.wait(3.6);
      ana.up = false;
      /* the yarn he has been keeping for her: a stripe for every story, in the order it happened */
      await TALK.say('leo', '당신 오면 같이 뜨려고\n실 모아 뒀어.');
      ana.look = true;
      await TALK.say('ana', '당신이 뜨개질을 해?');
      ana.look = false;
      await TALK.say('leo', '45년이면 배워.\n한 줄에 이야기 하나씩 해 줄게.');
      T.announce('이야기 담요. 아나가 처음부터 들려 달라고 한다. 그 일이 있었던 차례대로 실을 골라 한 줄씩 뜬다.');
      await X.play(T.puzzle.story({
        items: [{ name: '주춧돌', c: '#a9a39a', icon: 'stone' }, { name: '당신 소원', c: '#b8d88a', icon: 'firefly' }, { name: '빈이 온 날', c: '#f2ede4', icon: 'dog' }, { name: '지붕', c: '#e0b04a', icon: 'roof' },
          { name: '릴리 결혼식', c: '#f1b6c6', icon: 'bouquet' }, { name: '빨간 토마토', c: '#d9584a', icon: 'tomato' }, { name: '오로라', c: '#7fd8b0', icon: 'aurora' }],
        order: [3, 0, 5, 1, 6, 2, 4],
      }));
      ana.look = true;
      await TALK.say('ana', '…다 듣는 데 한참 걸리겠다.');
      ana.look = false;
      await TALK.say('leo', '괜찮아.\n이제 시간 많잖아.');
      await X.wait(0.8);
      /* what she brought with her: the promise she made Lily an hour ago, the one he once made her */
      ana.look = true;
      await TALK.say('ana', '레오.\n나도 릴리한테 약속하고 왔어.', { slow: true });
      await TALK.say('ana', '먼저 가서, 아빠랑\n맛있는 거 해 놓겠다고.');
      ana.look = false;
      await TALK.say('leo', '…나도 당신한테 그랬지.', { slow: true });
      await TALK.say('leo', '그럼 같이 지키자.\n릴리 올 때까지.');
      cloud.happy = true;
      await TALK.say('cloud', '…나도.');
      await TALK.say('leo', '방 하나 비워 뒀어.\n당신이 정하라고.');
      ana.look = true;
      await TALK.say('ana', '그럼 거긴 우리 둘째 방.');
      await TALK.say('ana', '릴리 방도 만들어야겠다.');
      ana.look = false;
      X.cam(PL.ROOM_X + 50, py + 50, 1.4, 0.9);
      await X.tap(() => [PL.ROOM_X, W.y3(PL.ROOM_X) - 10, 44]);
      S.swinging = false; ps.swingA = 0;
      leo.onSwing = ana.onSwing = false; leo.hill = ana.hill = null;
      leo.x = PL.TREE_X + 20; ana.x = PL.TREE_X + 44;
      bean.sit = 0; X.walk(bean, PL.ROOM_X + 128, 84).then(() => { bean.flip = true; bean.sit = 1; });
      cloud.sit = 0; cloud.look = true; X.walk(cloud, PL.ROOM_X - 2, 50).then(() => { cloud.flip = false; });
      X.walk(ana, PL.ROOM_X + 34, 62);
      await X.walk(leo, PL.ROOM_X - 34, 62);
      leo.flip = false; ana.flip = true; cloud.z = 2;
      leo.lay = ana.lay = cloud.lay = true;
      X.tween(cloud, 'sit', 0.5, 0.7); X.tween(leo, 'sit', 0.5, 0.7); await X.tween(ana, 'sit', 0.5, 0.7);
      A.sfx('knock'); X.note();
      await X.tween(ps, 'room2', 1, 1.6);
      T.announce('셋이 함께, 릴리의 방이 될 자리의 첫 주춧돌을 놓는다.');
      leo.lay = ana.lay = cloud.lay = false;
      X.tween(cloud, 'sit', 0, 0.8); X.tween(leo, 'sit', 0, 0.8); await X.tween(ana, 'sit', 0, 0.8);

      /* ---- the list on the gate, last of all ----
         they step back from the new stone to look at it, the house beyond it, and the list on the gate, which
         he nailed up where it can be seen from anywhere on the plot */
      const FX = PL.ROOM_X + 32;   /* just past the stone, out of the lantern's glare */
      bean.sit = 0; X.walk(bean, PL.ROOM_X + 168, 60).then(() => { bean.flip = true; bean.sit = 1; });
      X.cam(PL.HX + 50, py + 50, 1.35, 0.6);
      X.walk(leo, FX, 40);
      X.walk(cloud, FX + 36, 40);
      await X.walk(ana, FX + 72, 40);
      leo.flip = ana.flip = cloud.flip = true; ps.spot = null;
      T.announce('대문 옆의 약속 목록이 보인다. 아나가 그쪽을 본다.');
      await X.tap(() => [PL.BOARD_X, W.y3(PL.BOARD_X) - 74, 44]);
      await X.card(PL.boardCard, {
        init: { w: 5, cross: [1, 1, 0, 1, 0], glow: 0 }, max: 12,
        run: async (c) => {
          T.announce('약속 목록. 마당 있는 넓은 집, 평생 밥해주기, 릴리의 그네에 줄이 그어져 있다. 오로라 보러 가기와 같이 늙기가 남았다.');
          await X.wait(0.8);
          await TALK.say('ana', '…이걸 다 지켰어?');
          await TALK.say('leo', '혼자 할 수 있는 건 다.');
          await TALK.say('leo', '이건, 오늘 지켰고.');
          c.ready = true; await X.any(); c.ready = false;
          A.sfx('crayon');
          await X.tween(c.cross, 2, 1, 1.1, T.ease.lin);
          ps.cross[2] = 1;
          T.announce('오로라 보러 가기에 줄을 긋는다.');
          A.promise();
          await X.wait(1);
          X.tween(c, 'glow', 0.9, 1.2);
          await TALK.say('ana', '…이건?');
          await TALK.say('leo', '이건 이제부터.');
          await TALK.say('ana', '그럼, 천천히 지키자.', { slow: true });
        },
      });
      /* and they look out to the sea of cloud, where the boats come in, a child between them */
      leo.family = ana.family = cloud.family = true;
      X.cam(FX - 30, py + 64, 1.8, 0.5);
      await X.wait(2.2);
      await TALK.say('all', '천천히 와.', { slow: true });
      X.bed(null);
      A.theme({ voice: 'box', vel: 0.36, beat: 0.66, left: true });
      await X.wait(3.2);
      X.end();
    },
  });
})();
