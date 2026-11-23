/* Chapter 6 「다 지킨 약속」 — years twenty-five to forty-five. The house is finished and still
   empty. Every year, on the anniversary of his death, Ana makes his stew and he makes it with her,
   the way he watches her make it in the lake; one year she puts in something he does not know: now she
   is the one teaching. Rosa's son keeps the dance he owed his wife, and the three of them cross; Pipi
   gives her mother the tomato, shows her father the stars, and the three of them cross. He crosses off the
   house, the cooking and the swing; the two lines left need Ana. He paints an aurora to practise. */
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
    plot: { stage: 4, stones: 4, board: true, table: true, tree: 1, swing: 1, swingW: 1, garden: 1, patch: 2, fruit: 1 },
    flags: { bramGone: true, rosaGone: false },
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
      /* the quay, for the ones who come and the ones who go on */
      const quay = (more) => X.dip(async () => {
        ps.food.show = false; leo.chair = 0;
        S.actors = []; S.boats = [];
        const [qx, qy] = X.place.quay(); X.cam(qx, qy, 1.05); X.camSnap();
        more();
      });
      const home = () => X.dip(async () => { S.actors = keep0; S.boats = []; ps.night = 0; X.cam(px + 60, py, 1); X.camSnap(); }, { out: 1, in: 1.2 });
      const keep0 = S.actors;
      const bite = async () => { await X.tween(leo, 'bite', 1, 0.5); X.note({ voice: 'pluck', vel: 0.4 }); await X.wait(0.25); await X.tween(leo, 'bite', 0, 0.45); };
      /* he ladles out his own: made the way he watched her make it */
      const serve = async (o) => {
        Object.assign(ps.food, { show: true, drop: 0, fall: 16, glow: 0, fill: 1, burnt: false, herb: false }, o);
        await X.tween(ps.food, 'drop', 1, 0.7, T.ease.out3);
        A.sfx('knock', 0.5);
      };
      const TALK = X.TALK;
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
      T.announce('해마다 레오의 기일이면, 아나는 레오의 스튜를 끓인다. 레오는 호수에서 보며 똑같이 따라 끓인다. 처음엔 차례만 지키면 된다.');
      await X.TALK.say('leo', '해마다 내 기일이면,\n아나는 이 스튜를 끓여.');
      await X.TALK.say('leo', '그래서 나도 같이 끓여.\n아나가 넣는 차례 그대로.');
      await cookYear({ steps: ['potato', 'carrot', 'onion', 'tomato'], caption: '아나가 넣던 차례대로 재료를 눌러 넣으세요' });
      await X.tap(bowl);
      await bite(); ps.food.fill = 0.5;
      leo.mood = 'good'; await X.wait(1.3); leo.mood = null;
      await bite(); ps.food.fill = 0;
      await X.wait(0.5);

      /* ---- Rosa's daughter-in-law comes; with her, the three of them have no one left to wait for ---- */
      let rosa, son, dil, qleo0;
      X.toll(0);
      await quay(() => {
        qleo0 = X.actor('leo', { x: 390, style: F.leoAt(3), flip: true, face: { old: true } });
        X.actor('bean', { dog: true, s: 220, x: 450, sit: 1, flip: true, wag: 0.4 });
        rosa = X.actor('rosa', { x: 200, style: F.styles.rosa, s: 138, flip: true });
        son = X.actor('son', { x: 270, style: F.styles.rosaSon, s: 144, lean: 0.14, flip: true, face: { old: true } });
        dil = X.actor('dil', { style: Object.assign({}, F.styles.villagerB, { top: '#9a7fb0', hair: '#e8e4dc' }), s: 130, lean: 0.14, face: { old: true } });
        S.b1 = X.boat({ x: -880, riders: [dil] });
        X.cloudKid({ x: 548, chair: 0, lamp: true, lampHand: 'F', look: true });
      });
      X.bed(1, 0.13, 'sea');
      X.toll(1); await X.wait(1);
      await TALK.say('son', '제 사람은 제가 맞을게요.\n등불도 제가 켜고요.');
      T.announce('로사의 아들이 바다 등불을 켠다. 배 한 척이 들어온다.');
      A.sfx('star', 0.5);
      await X.sail(S.b1, -74, 70);
      A.sfx('door');
      await X.land(dil, 40);
      son.hug = { k: 0 }; dil.hug = son.hug;
      son.pose = (o) => T.embrace(o, son, dil, son.hug.k, true);
      dil.pose = (o) => T.embrace(o, dil, son, son.hug.k);
      await X.walk(son, 96, 70);
      await X.tween(son.hug, 'k', 1, 0.8, T.ease.out);
      A.motif({ voice: 'box', vel: 0.34, beat: 0.7 });
      await TALK.say('dil', '…당신, 하나도 안 변했네.');
      await TALK.say('son', '변했지. 당신 기다리느라 목이 다 빠졌어.');
      /* what he owed her: the dance at a wedding too poor for music */
      await TALK.say('son', '춤 한 곡 빚졌잖아.\n결혼식 날 못 춘 거.');
      await TALK.say('dil', '…그걸 여태 기억해요?');
      son.pose = (o, a2, t) => { T.embrace(o, son, dil, son.hug.k, true); o.x += Math.sin(t * 1.1) * 7; o.lean += Math.sin(t * 1.1) * 0.05; };
      dil.pose = (o, a2, t) => { T.embrace(o, dil, son, son.hug.k); o.x += Math.sin(t * 1.1) * 7; o.lean -= Math.sin(t * 1.1) * 0.04; };
      A.motif({ voice: 'felt', vel: 0.26, beat: 1.1 });
      T.announce('둘이 끌어안은 채 천천히 몸을 흔든다. 음악도 없이.');
      await X.wait(3.2);
      await TALK.say('rosa', '이제 다 왔다.\n우리도 건너가자.');
      await X.wait(0.8);
      son.pose = null; dil.pose = null;
      /* the same evening: a white boat, and the bell Leo promised to ring */
      S.b2 = X.boat({ x: -74, hull: '#e9e2d6', lamp: false, riders: [] });   /* moored at the pier's end */
      await TALK.say('rosa', '레오. 이거.');
      T.announce('로사가 실 한 타래를 건넨다.');
      await TALK.say('rosa', '아나 오면 같이 떠.\n이번엔 네가 가르쳐 줘.');
      await TALK.say('leo', '…네. 코 하나 안 빠뜨리고요.');
      for (const [a, seat] of [[rosa, -40], [son, -14], [dil, 12]]) { await X.walk(a, 24, 56); await X.board(a, S.b2, seat); a.flip = true; }
      X.toll(3); await X.wait(0.8);
      T.announce('배웅. 종이 울린 차례를 거꾸로 대답한다. 이번에는 대답하는 사이 등불이 자리를 바꾼다.');
      await X.play(T.puzzle.bell({ rounds: [[1, 3, 0], [2, 0, 3, 1]], reverse: true, shuffle: true }));
      const wave = (o, a2, t) => { o.armF = { a: 2.2 + Math.sin(t * 4 + a2.x) * 0.2, b: 0.3 }; };
      [rosa, son, dil, qleo0].forEach((a) => { a.pose = wave; });
      X.sail(S.b2, -1500, 34);
      T.announce('하얀 배가 구름바다 너머로 멀어진다.');
      X.cam(-260, 452, 1, 0.4);
      await X.wait(3);
      T.announce('빛의 폭포. 로사네 셋의 배가 빛을 거슬러 오른다. 별 하나가 구름 아래로 떨어진다.');
      T.world.S.hook.flags.rosaGone = true;
      await X.crossing([{ style: F.styles.rosa, s: 138 }, { style: F.styles.rosaSon, s: 144 }, { style: Object.assign({}, F.styles.villagerB, { top: '#9a7fb0', hair: '#e8e4dc' }), s: 130 }], { leoAge: 3, also: X.seeOff() });
      await home();

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

      /* ---- the garden, grown to five beds, and a fence round it this time ---- */
      const GZ = T.puzzle;
      let pipi0;
      await X.dip(async () => {
        ps.food.show = false; leo.chair = 0;
        leo.x = GZ.PATCH_X + 230; leo.flip = true; bean.x = GZ.PATCH_X + 330; bean.flip = true; bean.sit = 1;
        pipi0 = X.actor('kid', { x: GZ.PATCH_X + 275, style: F.styles.kidA, s: 100, flip: true });
        ps.patchHide = true;
        const q = GZ.patchCam(); X.cam(q[0], q[1], GZ.PATCH_Z); X.camSnap();
      });
      await TALK.say('kid', '올해는 고랑 다섯 개!\n울타리도 쳤으니까 빈은 못 들어와.');
      await TALK.say('leo', '물은 여덟 바가지.\n두 바가지 먹는 고랑이 셋이야.');
      T.announce('텃밭 물길 내기. 고랑이 다섯으로 늘었다. 갈림판이 셋, 기울일 판자가 넷. 물통의 빗물은 고랑들이 먹을 만큼뿐이다.');
      await X.play(GZ.trough({ which: 2 }));
      ps.patch = 3; ps.fruit = 1; ps.patchHide = false;
      A.sfx('star', 0.6);
      await TALK.say('kid', '빨개졌다! 진짜 빨개졌어!');
      await TALK.say('kid', '제일 빨간 건 엄마 거야.');
      await X.dip(async () => { S.actors.splice(S.actors.indexOf(pipi0), 1); leo.x = PL.TABLE_X - 66; leo.chair = 1; bean.x = PL.TABLE_X + 118; bean.flip = true; X.cam(px + 60, py, 1); X.camSnap(); });

      /* ---- an evening in the lake: Ana walking home in the rain, and what he can do from the shore ---- */
      const way = T.lakeHelp({ level: 3, who: { style: F.anaAt(73), s: 150 }, name: '아나', home: F.lilyAt(43), leoAge: 3, friend: { style: F.styles.cloud, beside: false } });
      await X.view(way, { color: '#1b2a40' });
      X.age('아나, 73');
      T.announce('거울 호수. 비 오는 저녁, 장바구니를 든 아나가 혼자 집으로 걷는다. 릴리가 문 앞에서 기다린다.');
      await TALK.say('leo', '…또 우산 없이 나갔구나.', { slow: true });
      await way.done();
      await X.wait(1.2);
      await X.view(null, { color: '#1b2a40' });

      await X.dip(async () => { ps.food.show = false; bean.x = PL.TABLE_X + 118; }, { out: 0.7, in: 0.9 });
      await X.years(35, 40, { age: 76 });
      /* this year she put in something that is not in his notebook */
      await cookYear({ steps: ['onion', 'potato', 'carrot', 'tomato', 'salt'], heat: true, caption: '작년처럼 끓여 보세요' });
      await X.tap(bowl);
      await bite(); ps.food.fill = 0.75;
      leo.mood = 'wonder';
      A.fragment(6);
      T.announce('호수 속 아나의 스튜는 빛깔이 다르다. 레오의 공책에 없는 풀이 들어갔다.');
      await X.TALK.say('leo', '호수 속 아나 스튜, 올해는 빛깔이 달라.\n…내 공책엔 없는 걸 넣었네.');
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
        X.cloudKid({ lamp: true, lampHand: 'F', look: true });
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
      await X.TALK.say('kid', '엄마, 이거. 내가 키운 토마토.\n레오 아저씨랑 같이.');
      T.announce('피피가 주머니에서 빨간 토마토를 꺼내 엄마 손에 쥐여 준다.');
      await X.TALK.say('pmom', '…베란다에서 키우던 거, 기억하는구나.');
      await X.TALK.say('kid', '빨간 거 열리면 준다고 했잖아.');
      await X.TALK.say('kid', '아빠는 아직 멀었지?\n괜찮아. 기다리는 건 내가 잘해.');
      await X.TALK.say('pmom', '…다 컸네, 우리 피피.', { slow: true });
      await X.TALK.say('kid', '집 짓는 것도 도왔다?\n뼈대도 당기고, 지붕도 올리고.');
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
      await TALK.say('leo', '다 해 놨어.\n이제 당신만 오면 돼.');

      /* ---- Pipi's father, at last; and then nobody is left for them to wait for ---- */
      const ov = T.place ? T.place('overlook', { leoAge: 3 }) : null;
      if (ov) { ov.sun.k = 0.4; await X.view(ov, { color: '#fff6e6' }); T.announce('구름 위 벤치. 늙은 레오와 빈이 저무는 구름바다를 본다.'); X.tween(ov.sun, 'k', 1, 7); }
      await X.years(40, 43, { age: 79 });
      if (ov) await X.view(null, { color: '#1b2440' });
      let pipi2, pm2, pd, qleo2, cloud;
      X.toll(0);
      await quay(() => {
        cloud = X.cloudKid({ x: 548, chair: 0, lamp: true, lampHand: 'F', look: true });
        qleo2 = X.actor('leo', { x: 420, style: F.leoAt(3), flip: true, face: { old: true } });
        X.actor('bean', { dog: true, s: 220, x: 480, sit: 1, flip: true, wag: 0.4 });
        pm2 = X.actor('pmom', { x: 330, style: F.styles.villagerB, s: 128, lean: 0.14, flip: true, face: { old: true } });
        pipi2 = X.actor('kid', { x: 240, style: F.styles.kidA, s: 100, flip: true });
        pipi2.pose = (o, a, t) => { if (!a.moving && !a.hug) o.y -= Math.abs(Math.sin(t * 5)) * 4; };
        pd = X.actor('pdad', { style: Object.assign({}, F.styles.villagerA, { top: '#6f8fa8' }), s: 140, lean: 0.16, face: { old: true } });
        S.b1 = X.boat({ x: -880, riders: [pd] });
      });
      X.bed(1, 0.13, 'sea');
      X.toll(1); await X.wait(1);
      await TALK.say('kid', '이번엔 내가 켤래.\n아저씨가 가르쳐 준 대로.');
      T.announce('피피가 혼자 바다 등불을 켠다. 배 한 척이 들어온다.');
      A.sfx('star', 0.3); await X.wait(0.4); A.sfx('star', 0.6); await X.wait(0.4); A.sfx('star', 0.9);
      await X.sail(S.b1, -74, 70);
      A.sfx('door');
      await X.land(pd, 30);
      T.announce('배에서 허리가 굽은 할아버지가 내린다. 피피의 아빠다.');
      await TALK.say('kid', '아빠!');
      pipi2.hug = { k: 0 }; pd.hug = pipi2.hug;
      pipi2.pose = (o) => T.embrace(o, pipi2, pd, pipi2.hug.k, true);
      pd.pose = (o) => { T.embrace(o, pd, pipi2, pipi2.hug.k); o.lean += 0.24 * pipi2.hug.k; };
      pipi2.armOver = true; pd.z = 1;
      await X.walk(pipi2, pd.x + 30, 180);
      pipi2.flip = true;
      await X.tween(pipi2.hug, 'k', 1, 0.7, T.ease.out);
      A.motif({ voice: 'box', vel: 0.36, beat: 0.7 });
      await TALK.say('pdad', '피피야….\n아빠가 너무 늦었지.', { slow: true });
      await TALK.say('kid', '아니. 천천히 와서 좋았어.\n엄마가 아빠 얘기 다 해 줬어.');
      await X.walk(pm2, pd.x + 70, 60);
      await TALK.say('pmom', '이제 다 모였네.');
      await TALK.say('kid', '아빠, 밤 되면 보여 줄 거 있어.\n기다리면서 만든 별자리.');
      await X.wait(0.6);
      pipi2.pose = null; pd.pose = null; pipi2.hug = null;
      /* her promise to her father: the stars she joined up while she waited */
      await X.dip(async () => { ps.night = 0.9; }, { color: '#141b36', out: 1, in: 0.6 });
      T.announce('그날 밤, 부두. 피피가 아빠에게 기다리면서 만든 별자리를 하나씩 짚어 보인다.');
      await X.play(T.puzzle.stars({ rounds: [
        { name: '토마토', pts: [[0, -46], [44, -20], [44, 26], [0, 50], [-44, 26], [-44, -20], [0, -84]], edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [0, 6]], at: [160, 320], scale: 1.25, filler: 14 },
        { name: '별똥별', pts: [[0, -50], [48, -16], [29, 40], [-29, 40], [-48, -16], [-118, -58], [-176, -92]], edges: [[0, 2], [2, 4], [4, 1], [1, 3], [3, 0], [4, 5], [5, 6]], at: [-120, 330], scale: 1.2, rot: -0.2, filler: 20 },
      ] }));
      await TALK.say('pdad', '…이걸 다 우리 피피가?', { slow: true });
      await TALK.say('kid', '응. 아빠 보여 주기로 했잖아.');
      await X.wait(0.8);
      await X.walk(pipi2, qleo2.x - 50, 160);
      await TALK.say('kid', '아저씨. 우리 이제 건너가야 된대.');
      await TALK.say('leo', '그래. 다 왔으니까.');
      await TALK.say('kid', '아저씨는 혼자서도 기다릴 수 있어?');
      await TALK.say('leo', '빈도 있고, 토마토도 있고.\n…그리고 아나가 오잖아.');
      await TALK.say('kid', '아나 아줌마 오면, 내 얘기 해 줘.\n토마토 같이 키운 거.');
      await TALK.say('leo', '응. 제일 먼저 할게.');
      S.b2 = X.boat({ x: -74, hull: '#e9e2d6', lamp: false, riders: [] });   /* moored at the pier's end */
      for (const [a, seat] of [[pd, -40], [pm2, -14], [pipi2, 12]]) { await X.walk(a, 24, 62); await X.board(a, S.b2, seat); a.flip = true; }
      T.announce('하얀 배. 이번엔 종을 치지 않는다. 피피가 손을 흔든다. 레오를 눌러 손을 흔들어 준다.');
      pipi2.pose = (o, a2, t) => { o.armF = { a: 2.4 + Math.sin(t * 7) * 0.3, b: 0.2 }; o.face.eye = 'happy'; };
      await X.tap(() => [qleo2.x, W.groundAt(qleo2.x) - 90, 60]);
      qleo2.pose = (o, a2, t) => { o.armF = { a: 2.3 + Math.sin(t * 4) * 0.2, b: 0.3 }; };
      X.sail(S.b2, -1500, 34);
      X.cam(-260, 452, 1, 0.4);
      await X.wait(3);
      T.announce('빛의 폭포. 피피네 셋의 배가 빛을 거슬러 오른다. 피피가 끝까지 손을 흔든다. 별 하나가 구름 아래로 길게 떨어진다.');
      await X.crossing([{ style: Object.assign({}, F.styles.villagerA, { top: '#6f8fa8' }), s: 140 }, { style: F.styles.villagerB, s: 128 }, { style: F.styles.kidA, s: 100 }], { leoAge: 3, color: '#141b36', also: X.seeOff() });
      qleo2.pose = null;
      X.cam(...X.place.quay(), 1.05, 0.5);
      await X.wait(1.4);
      await TALK.say('leo', '…이제 피피네도 갔네, 빈.', { slow: true });
      A.sfx('bark');
      await X.wait(1.2);
      /* and the smallest one is still at the end of the quay, her lamp put out, looking at the sea */
      cloud.lamp = false; cloud.look = false;
      X.cam(470, 500, 1.4, 0.8);
      await X.wait(1.2);
      await TALK.say('cloud', '다 지키고 가는데,\n나는 아직도 몰라.');
      const qbean = S.actors.find((a) => a.id === 'bean');
      if (qbean) { qbean.sit = 0; X.walk(qbean, 372, 70).then(() => { qbean.flip = false; qbean.sit = 1; }); }
      await X.walk(qleo2, cloud.x - 44, 50);
      qleo2.flip = false;
      qleo2.pose = (q) => { q.headTilt = 0.14; q.lean = 0.1; };
      await X.wait(0.6);
      await TALK.say('leo', '그럼 나랑 같이 찾아보자.\n심심하지 않게.');
      cloud.look = true;
      cloud.face = { eye: 'happy', mouth: 'smile' };
      A.motif({ voice: 'box', vel: 0.3, beat: 0.7 });
      await X.wait(2.2);
      await home();
      X.bed(4, 0.13, 'home');

      /* ---- the lake ---- */
      X.walk(leo, PL.BOARD_X - 260, 84);
      await X.wait(1.2);
      await X.years(43, 45, { age: 81 });
      const lake = T.lake({
        paint: T.vig.grand, leo: F.leoAt(3), shore: true, leoFace: { eye: 'happy', old: true },
        rhText: '등불은 창에, 냄비는 아나의 화구에, 레오는 아나가 앉던 조리대 자리에. 좌우로 끌어 점선에 맞춰 보세요',
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
      await TALK.say('leo', '당신 오면, 같이 보자.');
      A.motif({ voice: 'felt', vel: 0.36, beat: 0.82 });
      await X.wait(2.2);
      /* he keeps the other half of the swing free */
      await X.walk(leo, PL.TREE_X + 70, 60);
      leo.onSwing = true; leo.hill = 3; leo.x = PL.swingSeat(ps)[0] - 16; ps.spot = [leo.x];
      S.swinging = true;
      await X.wait(4.2);
      X.end();
    },
  });
})();
