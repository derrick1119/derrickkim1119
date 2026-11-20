/* Chapter 6 「다 지킨 약속」 — years thirty to forty-five. The house is finished and still
   empty. What she cooks for him on the day gets better every year, and one year it is a taste
   he does not know: now she is the one teaching. He crosses the list off, one line at a time,
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
      const serve = async (o) => {
        Object.assign(ps.food, { show: true, drop: 0, glow: 1, fill: 1, burnt: false, herb: false }, o);
        await X.tween(ps.food, 'drop', 1, 2.4, T.ease.out3);
        A.sfx('join');
        X.tween(ps.food, 'glow', 0, 2);
      };
      X.title();
      await X.wait(5.6);

      /* ---- the table, year after year ---- */
      X.age('아나, 66');
      T.announce('기일마다 식탁에 내려앉는 스튜가, 해마다 더 맛있어진다.');
      await serve({ color: '#b24c2b' });
      await X.tap(bowl);
      await bite(); ps.food.fill = 0.5;
      leo.mood = 'good'; await X.wait(1.5); leo.mood = null;
      await bite(); ps.food.fill = 0;
      await X.wait(0.6);

      await X.dip(async () => { ps.food.show = false; bean.x = PL.TABLE_X + 96; }, { out: 0.8, in: 1 });
      X.age('아나, 71');
      await serve({ color: '#bd5530' });
      await X.tap(bowl);
      await bite(); ps.food.fill = 0.5;
      leo.mood = 'laugh'; await X.wait(1.5); leo.mood = null;
      await bite(); ps.food.fill = 0;
      await X.wait(0.6);

      await X.dip(async () => { ps.food.show = false; bean.x = PL.TABLE_X + 118; }, { out: 0.8, in: 1 });
      X.age('아나, 76');
      await serve({ color: '#c8742f', herb: true });
      await X.tap(bowl);
      await bite(); ps.food.fill = 0.75;
      /* this is not his recipe any more */
      leo.mood = 'wonder';
      A.fragment(6);
      T.announce('올해의 스튜에서는 레오가 모르는 맛이 난다. 아나가 맛을 바꿨다.');
      await X.wait(2.2);
      await X.tap(bowl);
      await bite(); ps.food.fill = 0.45;
      leo.mood = 'laugh'; await X.wait(1.6); leo.mood = null;
      await X.card(notebook, {
        max: 18,
        run: async (c) => {
          T.announce('레오의 공책. 아나표 스튜. 토마토는 넉넉히. 불은 약하게, 오래오래. 처음 보는 풀 한 줌. 이번엔 내가 배운다.');
          for (let i = 0; i < 5; i++) { if (i === 4) await X.wait(0.8); A.sfx('crayon'); await X.tween(c, 'w', i + 1, i === 4 ? 1.5 : 0.9, lin); X.note(); await X.wait(0.2); }
        },
      });
      await bite(); ps.food.fill = 0.2; await bite(); ps.food.fill = 0;
      await X.wait(0.5);

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
      const lake = T.lake({ paint: T.vig.grand, leo: F.leoAt(3), mirror: 0.6, warm: true, leoFace: { eye: 'happy', old: true } });
      await X.view(lake, { color: '#1b2a40' });

      X.age('아나, 81');
      T.announce('호수. 여든이 넘은 아나가 손주들 사이에서 스튜를 젓으며 웃는다.');
      await X.wait(3);
      await X.tap(() => [40, 560, 130], { screen: true });
      if (!lake.rip.length || T.time - lake.rip[lake.rip.length - 1].t > 0.3) lake.touch(40, 560);
      X.notes(3, { voice: 'felt', vel: 0.3 });
      await X.wait(4);

      /* ---- the one that needs a night sky ---- */
      leo.x = PL.TREE_X - 30; leo.flip = false; ps.night = 1; bean.x = PL.TREE_X - 26; bean.flip = false;
      X.cam(px + 110, py + 6, 1); X.camSnap();
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
      leo.onSwing = true; leo.hill = 3; leo.x = PL.swingSeat(ps)[0] - 16;
      S.swinging = true;
      await X.wait(4.2);
      X.end();
    },
  });
})();
