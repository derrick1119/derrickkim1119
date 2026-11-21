/* Chapter 6 「다 지킨 약속」 — years thirty to forty-five. The house is finished and still
   empty. Every year, on the day, he makes the stew the way he has watched her make it in the
   lake; it gets better every year, and one year she puts in something he does not know: now she
   is the one teaching. He crosses the list off, one line at a time,
   until a single line is left that cannot be kept alone. */
(function () {
  'use strict';
  const T = window.TYT, P = T.P, F = T.F;

  /* his notebook, this time */
  function notebook(g, c) {
    const V = T.view;
    if (c.a <= 0.003) return;
    g.save();
    g.fillStyle = T.rgba('#141a2c', 0.55 * c.a); g.fillRect(-V.W / 2, 0, V.W, V.H);
    const k = T.ease.out3(T.clamp(c.a));
    g.translate(0, 450 + (1 - k) * 60 + Math.sin(T.time * 0.8) * 3); g.rotate(-0.02);
    g.globalAlpha = T.clamp(c.a * 2.5);
    g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 44; g.shadowOffsetY = 16;
    P.fill(g, P.rr(-276, -326, 552, 652, 16), '#d7a23c');
    g.shadowColor = 'transparent';
    P.fill(g, P.rr(-276, -326, 46, 652, 16), '#b8862c');
    P.fill(g, P.rr(-246, -310, 508, 620, 6), '#fbf4e2');
    g.strokeStyle = 'rgba(93,125,163,0.22)'; g.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) { const y = -128 + i * 86; g.beginPath(); g.moveTo(-214, y); g.lineTo(232, y); g.stroke(); }
    g.strokeStyle = 'rgba(201,87,63,0.3)'; g.beginPath(); g.moveTo(-190, -300); g.lineTo(-190, 300); g.stroke();
    P.text(g, '아나표 스튜', 14, -216, { size: 78, color: '#b54a36', k: T.clamp(c.w), seed: 3 });
    ['토마토는 넉넉히', '불은 약하게, 오래오래', '처음 보는 풀 한 줌'].forEach((s, i) => P.text(g, s, 14, -146 + i * 86, { size: 56, color: '#33405c', k: T.clamp(c.w - 1 - i), seed: 5 + i }));
    P.text(g, '이번엔 내가 배운다', 14, 222, { size: 62, color: '#3f6f9a', k: T.clamp(c.w - 4), seed: 11 });
    g.restore();
  }

  T.stage('ch6', {
    chapter: 6, title: ['6장', '다 지킨 약속'], end: ['6장 끝', '마지막 장 「마중」'], next: 'ch7', pad: 2, nextColor: '#161d2a',
    plot: { stage: 4, stones: 4, board: true, table: true, tree: 1, swing: 1, swingW: 1, garden: 1 },
    flags: { bramGone: true },
    build() { T.scenes.kitchen.build(); },
    update(dt, S) { if (S.swinging) S.ps.swingA = Math.sin(T.time * 1.3) * 0.45; },
    script: async function (X) {
      const W = T.world, C = W.C, PL = T.plot, S = X.S, ps = S.ps, A = X.A, lin = T.ease.lin;
      const [px, py] = X.place.plot();
      X.cam(px + 60, py, 1); X.camSnap();
      S.swinging = false;
      const leo = X.actor('leo', { x: PL.TABLE_X - 66, style: F.leoAt(3), chair: 1, face: { old: true } });
      const bean = X.actor('bean', { dog: true, s: 220, x: PL.TABLE_X + 118, sit: 1, wag: 0.5, flip: true });
      const bx = PL.TABLE_X - 16, bowlY = () => W.y3(PL.TABLE_X) - 66;
      leo.pose = (o, a, t) => {
        if (a.onSwing) { PL.sitOnSwing(o, ps, -1); o.face.eye = 'happy'; o.headTilt = -0.16; return; }
        if (!a.chair) return;
        const bite = T.ease.io(a.bite || 0), by = bowlY();
        o.lean = 0.12; o.armF = { hand: F.local(o, T.lerp(bx, a.x + 16, bite), T.lerp(by, o.y - 62, bite)), bend: -1 }; o.armB = { hand: F.local(o, bx - 12, by + 6) };
        if (a.mood === 'good') { o.face.eye = 'happy'; o.headTilt = Math.sin(t * 5) * 0.08; }
        else if (a.mood === 'wonder') { o.face.eye = 'open'; o.face.mouth = 'line'; o.headTilt = -0.16; o.lean = 0.04; }
        else if (a.mood === 'laugh') { o.face.eye = 'happy'; o.face.mouth = 'open'; o.y += Math.sin(t * 13) * 1.4; }
      };
      const bowl = () => [bx, bowlY() + 2, 44];
      const bite = async () => { await X.tween(leo, 'bite', 1, 0.5); X.note({ voice: 'pluck', vel: 0.4 }); await X.wait(0.25); await X.tween(leo, 'bite', 0, 0.45); };
      /* he ladles out his own: made the way he watched her make it */
      const serve = async (o) => {
        Object.assign(ps.food, { show: true, drop: 0, fall: 16, glow: 0, fill: 1, burnt: false, herb: false }, o);
        await X.tween(ps.food, 'drop', 1, 0.7, T.ease.out3);
        A.sfx('knock', 0.5);
      };
      X.title();
      await X.wait(4.4);

      /* ---- the table, year after year: he cooks what he has watched her cook ---- */
      const stove = () => { const q = W.toScreen(PL.TABLE_X + 100, W.y3(PL.TABLE_X + 100) - 62); return [q[0], q[1], S.cam.z * 0.8]; };
      const cookYear = async (o) => {
        X.cam(PL.TABLE_X - 30, py + 20, 1.15);
        leo.chair = 0; leo.x = PL.TABLE_X + 30; leo.flip = false; bean.x = PL.HX + 120; bean.flip = false;
        await X.play(T.puzzle.cook(Object.assign({ at: stove }, o)));
        ps.food.show = true; ps.food.drop = 1; ps.food.fall = 0; ps.food.fill = 1; ps.food.glow = 0.6; X.tween(ps.food, 'glow', 0, 2);
        leo.x = PL.TABLE_X - 66; leo.chair = 1;
      };
      await X.years(25, 30, { age: 66 });
      T.announce('해마다 그날이면, 레오는 호수에서 본 대로 아나의 스튜를 끓인다. 처음엔 차례만 지키면 된다.');
      await X.TALK.say('leo', '감자, 당근, 양파, 토마토.\n아나가 넣던 차례 그대로.');
      await cookYear({ steps: ['potato', 'carrot', 'onion', 'tomato'], caption: '아나가 넣던 차례대로 재료를 눌러 넣으세요' });
      await X.tap(bowl);
      await bite(); ps.food.fill = 0.5;
      leo.mood = 'good'; await X.wait(1.3); leo.mood = null;
      await bite(); ps.food.fill = 0;
      await X.wait(0.5);

      await X.dip(async () => { ps.food.show = false; bean.x = PL.TABLE_X + 96; }, { out: 0.7, in: 0.9 });
      await X.years(30, 35, { age: 71 });
      T.announce('호수에서 보니, 아나는 토마토를 넣은 뒤 불을 줄이고 한참을 기다렸다가 소금을 친다.');
      await X.TALK.say('leo', '불은 약하게, 오래오래.\n그다음에 소금 조금.');
      await cookYear({ steps: ['onion', 'potato', 'carrot', 'tomato', 'salt'], heat: true, caption: '토마토 다음엔 불을 눌러 약하게 줄이고, 뭉근히 끓으면 소금을 넣으세요' });
      await X.tap(bowl);
      await bite(); ps.food.fill = 0.5;
      leo.mood = 'laugh'; await X.wait(1.3); leo.mood = null;
      await bite(); ps.food.fill = 0;
      await X.wait(0.5);

      await X.dip(async () => { ps.food.show = false; bean.x = PL.TABLE_X + 118; }, { out: 0.7, in: 0.9 });
      await X.years(35, 40, { age: 76 });
      /* this year she put in something that is not in his notebook */
      await cookYear({ steps: ['onion', 'potato', 'carrot', 'tomato', 'salt'], heat: true, caption: '작년처럼 끓여 보세요' });
      await X.tap(bowl);
      await bite(); ps.food.fill = 0.75;
      leo.mood = 'wonder';
      A.fragment(6);
      T.announce('호수 속 아나의 스튜는 빛깔이 다르다. 레오의 공책에 없는 풀이 들어갔다.');
      await X.TALK.say('leo', '…올해는 뭘 넣은 거지? 내 공책엔 없는 건데.');
      leo.mood = null;
      T.announce('아나의 맛 찾기. 네 가지 풀 가운데 둘을 골라, 호수에 비친 아나의 스튜와 견주어 본다.');
      await X.play(T.puzzle.taste({ answer: [0, 2] }));
      await X.card(notebook, {
        max: 18,
        run: async (c) => {
          T.announce('레오의 공책. 아나표 스튜. 토마토는 넉넉히. 불은 약하게, 오래오래. 처음 보는 풀 한 줌. 이번엔 내가 배운다.');
          for (let i = 0; i < 5; i++) { if (i === 4) await X.wait(0.8); A.sfx('crayon'); await X.tween(c, 'w', i + 1, i === 4 ? 1.5 : 0.9, lin); X.note(); await X.wait(0.2); }
        },
      });
      ps.food.show = false;
      T.announce('이번엔 처음 보는 풀까지. 그 풀은 맨 마지막, 불을 끄기 직전에 넣는다.');
      await cookYear({ steps: ['onion', 'potato', 'carrot', 'tomato', 'salt', 'herb'], pantry: ['potato', 'carrot', 'herb', 'onion', 'tomato', 'salt'], heat: true, caption: '공책대로 끓이고, 처음 보는 풀은 맨 마지막에 넣으세요' });
      ps.food.herb = true; ps.food.color = '#c8742f';
      await X.tap(bowl);
      await bite(); ps.food.fill = 0.45;
      leo.mood = 'laugh'; await X.wait(1.4); leo.mood = null;
      await bite(); ps.food.fill = 0.2; await bite(); ps.food.fill = 0;
      await X.wait(0.5);

      /* ---- Pipi's mother: Pipi has been seven for forty years; her father is still alive ---- */
      const keep = S.actors;
      let pipi, pm, qleo;
      await X.dip(async () => {
        ps.food.show = false; leo.chair = 0;
        S.actors = []; S.boats = [];
        const [qx, qy] = X.place.quay(); X.cam(qx, qy, 1.05); X.camSnap();
        qleo = X.actor('leo', { x: 330, style: F.leoAt(3), flip: true, face: { old: true } });
        pipi = X.actor('kid', { x: 250, style: F.styles.kidA, s: 100, flip: true });
        pipi.pose = (o, a, t) => { if (!a.moving && !a.hug) o.y -= Math.abs(Math.sin(t * 5)) * 4; };
        pm = X.actor('pmom', { style: F.styles.villagerB, s: 128, lean: 0.14, face: { old: true } });
        S.b1 = X.boat({ x: -880, riders: [pm] });
      });
      X.bed(1, 0.13, 'sea');
      X.toll(1); await X.wait(1.2);
      await X.TALK.say('kid', '레오 아저씨, 종이 울렸어!\n이번엔 우리 엄마야. 꼭 그래.');
      await X.TALK.say('leo', '그래. 등불 켜 드리자.');
      const pressed = X.seaLamp({ rounds: [[1, 2, 0, 3], [3, 1, 2, 0]], shuffle: true });
      X.sail(S.b1, -74, 62);
      await pressed;
      await new Promise((res) => { const iv = () => (S.b1.x >= -74.5 ? res() : X.wait(0.2).then(iv)); iv(); });
      A.sfx('door');
      await X.land(pm, 30);
      T.announce('배에서 백발의 할머니가 내린다. 피피가 달려간다.');
      await X.TALK.say('kid', '엄마!');
      pipi.hug = { k: 0 }; pm.hug = pipi.hug;
      pipi.pose = (o) => T.embrace(o, pipi, pm, pipi.hug.k, true);
      pm.pose = (o) => { T.embrace(o, pm, pipi, pipi.hug.k); o.lean += 0.2 * pipi.hug.k; };
      pipi.armOver = true; pm.z = 1;
      await X.walk(pipi, pm.x + 30, 180);
      pipi.flip = true;
      await X.tween(pipi.hug, 'k', 1, 0.7, T.ease.out);
      A.motif({ voice: 'box', vel: 0.36, beat: 0.7 });
      await X.wait(1.2);
      await X.TALK.say('pmom', '…우리 피피, 그대로구나.', { slow: true });
      await X.TALK.say('kid', '아빠는?');
      await X.TALK.say('pmom', '아빠는 아직이야.\n손주들 다 키우고, 천천히 오실 거야.');
      await X.TALK.say('kid', '그럼 이제 엄마랑 같이 기다리면 되겠다.');
      await X.TALK.say('kid', '나 그동안 레오 아저씨 집 짓는 거 도왔다?\n뼈대도 당기고, 지붕도 올리고.');
      await X.TALK.say('pmom', '…고맙습니다.\n우리 애 곁에 있어 주셔서.');
      await X.TALK.say('leo', '제가 도움을 받았는걸요.');
      await X.wait(1.4);
      await X.dip(async () => {
        S.actors = keep; S.boats = [];
        X.cam(px + 60, py, 1); X.camSnap();
      }, { out: 1, in: 1.2 });
      X.bed(4, 0.13, 'home');

      /* ---- the list ---- */
      const board = () => [PL.BOARD_X, W.y3(PL.BOARD_X) - 74, 44];
      await X.tap(board);
      leo.chair = 0; ps.food.show = false;
      X.cam(px - 40, py, 1);
      await X.walk(leo, PL.BOARD_X + 34, 84);
      leo.flip = true;
      const crossOff = async (c, i) => { c.ready = true; await X.any(); c.ready = false; A.sfx('crayon'); await X.tween(c.cross, i, 1, 0.7, lin); ps.cross[i] = 1; X.note(); await X.wait(0.35); };
      await X.card(PL.boardCard, {
        init: { w: 5, cross: [0, 0, 0, 0, 0] }, max: 12,
        run: async (c) => {
          T.announce('약속 목록. 마당 있는 넓은 집, 평생 밥해주기, 릴리의 그네에 줄을 긋는다.');
          await X.wait(0.6);
          await crossOff(c, 0); await crossOff(c, 1); await crossOff(c, 3);
        },
      });

      /* ---- the lake ---- */
      X.walk(leo, PL.BOARD_X - 260, 84);
      await X.wait(1.2);
      await X.years(40, 45, { age: 81 });
      const lake = T.lake({
        paint: T.vig.grand, leo: F.leoAt(3), shore: true, leoFace: { eye: 'happy', old: true },
        rhText: '등불은 창에, 냄비는 아나의 화구에, 레오는 늘 앉던 조리대에. 좌우로 끌어 점선에 맞춰 보세요',
        things: [{ kind: 'lamp', x: 300, at: [-428, 300] }, { kind: 'pot', x: -250, at: [24, 548] }, { kind: 'leo', x: 120, at: [-330, 588], flip: false, lockFlip: false }],
      });
      await X.view(lake, { color: '#1b2a40' });
      X.age('아나, 81');
      T.announce('거울 호수. 여든한 살의 아나가 손주들에게 스튜 끓이는 법을 가르친다. 레오의 공책이 펼쳐져 있다.');
      T.announce('물그림자 맞추기. 등불은 창에, 냄비는 아나의 냄비에, 레오는 조리대의 그 자리에.');
      await lake.rhyme();
      await X.wait(1.2);
      lake.beat = 1; lake.note = '아나가 스튜를 젓는다. 레오의 냄비를 눌러 같이 저어 주세요';
      for (let i = 0; i < 3; i++) { await X.tap(() => [lake.things[1].x, 186, 56], { screen: true }); A.sfx('bubble', i / 3); X.note({ voice: 'pluck', vel: 0.34 }); await X.wait(0.4); }
      lake.note = null;
      await X.wait(0.6);
      lake.beat = 2;
      T.announce('아나가 조리대의 그 자리를 돌아본다. 이번에는 웃는다.');
      X.notes(3, { voice: 'felt', vel: 0.32 });
      await X.wait(2.4);
      await X.TALK.say('leo', '…이번엔 웃네.', { slow: true });
      await X.tap(() => [40, 560, 130], { screen: true });
      if (!lake.rip.length || T.time - lake.rip[lake.rip.length - 1].t > 0.3) lake.touch(40, 560);
      X.notes(3, { voice: 'felt', vel: 0.3 });
      await X.wait(4);

      /* ---- the one that needs a night sky ---- */
      leo.x = PL.TREE_X - 30; leo.flip = false; ps.night = 1; bean.x = PL.BOARD_X - 70; bean.flip = false; ps.spot = [PL.TREE_X - 30];
      X.cam(px + 150, py + 44, 1.25); X.camSnap();
      await X.view(null, { color: '#1b2a40' });
      X.bed(5, 0.14, 'night');
      leo.pose2 = 1;
      const look = leo.pose;
      leo.pose = (o, a, t) => { if (a.onSwing) return look(o, a, t); o.headTilt = -0.3; if (S.paintG) o.armF = { a: 2.5 + Math.sin(t * 2.2) * 0.3, b: 0.2 }; };
      T.announce('밤. 언덕 위 하늘에 손가락으로 오로라를 건다.');
      await X.wait(1.2);
      await X.paint({ goal: 2600 });
      A.promise();
      await X.wait(2.2);
      await X.card(PL.boardCard, {
        init: { w: 5, cross: [1, 1, 0, 1, 0], glow: 0 }, max: 12,
        run: async (c) => {
          await X.wait(0.6);
          await crossOff(c, 2);
          T.announce('남은 줄은 하나. 같이 늙기.');
          await X.wait(0.5);
          await X.tween(c, 'glow', 0.9, 1.8);
          A.motif({ voice: 'felt', vel: 0.36, beat: 0.82 });
        },
      });
      /* he keeps the other half of the swing free */
      await X.walk(leo, PL.TREE_X + 70, 60);
      leo.onSwing = true; leo.hill = 3; leo.x = PL.swingSeat(ps)[0] - 16; ps.spot = [leo.x];
      S.swinging = true;
      await X.wait(4.2);
      X.end();
    },
  });
})();
