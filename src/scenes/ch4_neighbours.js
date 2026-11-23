/* Chapter 4 「이웃들」 — years five to fifteen. It opens on the headland at dusk, where Rosa, who has looked out
   for him since his mother went on, shows him the cloud whale that goes by once in ten years; 구름이 is there too,
   sitting in the grass, watching the calf, and while it goes by Rosa tells him what little anyone knows of her.
   Bean comes, not by boat but down the rainbow bridge, and the lake shows the girl he left: walking home from
   school in the rain with his collar, then on the back step, where the shadows of Bean and of 구름이 sit down beside her.
   Pipi meets Bean, and Bean meets the tomatoes. Years on, Leo finds Rosa on her porch unpicking the blanket again
   and sits down to knit it with her, from the stripes they saw in the lake. Bram asks Leo to look with him at the
   wife he left at thirty-two; a year later she comes, he takes her out on his own boat as he promised, and the two
   of them cross, and 구름이 wonders who she is waiting for. Five years after that the bell rings for an old man,
   and Rosa knows him as he steps off the boat: her baby, who grew up with one photograph of her and promised
   himself he would see her face. Leo runs up for the blanket, she puts it round him, and with both promises kept
   a white boat comes for them; Leo answers the bell backwards to see them off, with her yarn in his hand. That
   night he takes 구름이 to the lake to look for her someone. It shows Ana, with her first white hair, and his own
   face beside it. */
(function () {
  'use strict';
  const T = window.TYT, P = T.P, F = T.F, K = T.town;

  const wave = (o, a, t) => { o.armF = { a: 2.4 + Math.sin(t * 9 + a.x) * 0.25, b: 0.3 }; o.face.eye = 'happy'; };
  const cane = (g, j, o) => { const gy = T.world.groundAt(o.x); P.line(g, j.handF[0], j.handF[1], j.handF[0] + (o.flip ? -8 : 8), gy, 3, '#6b4f52'); };
  /* Rosa's blanket: the yarns of the knitting puzzle, in the stripes of the old one */
  const YARN = ['#e9c45a', '#c9573f', '#7fb0c9', '#f6efe0'], STRIPES = [2, 0, 3, 1, 0, 2];
  function blanket(g, x, y, w, h, n) {
    const k = n || STRIPES.length, sh = h / k;
    for (let i = 0; i < k; i++) { g.fillStyle = YARN[STRIPES[i % STRIPES.length]]; g.fillRect(x - w / 2, y - h / 2 + i * sh, w, sh + 0.6); }
    g.strokeStyle = 'rgba(90,60,40,0.2)'; g.lineWidth = 1;
    for (let i = 1; i < 5; i++) { g.beginPath(); g.moveTo(x - w / 2 + (i * w) / 5, y - h / 2); g.lineTo(x - w / 2 + (i * w) / 5, y + h / 2); g.stroke(); }
  }
  /* a skein of her yarn, held in a hand */
  function skein(g, x, y) {
    P.fill(g, P.ellipse(x, y, 9, 5.5, -0.2), YARN[0]);
    g.strokeStyle = 'rgba(150,100,30,0.45)'; g.lineWidth = 0.9;
    for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(x - 7 + i * 1.5, y - 4); g.quadraticCurveTo(x + i * 2.5, y, x - 5 + i * 3.5, y + 4.5); g.stroke(); }
    P.fill(g, P.rr(x - 2, y - 6, 4, 12, 2), YARN[1]);
  }
  /* the blanket round someone's shoulders and down his back (j: the joints a figure was drawn with) */
  function shawl(g, j, a) {
    if (a < 0.01) return;
    const u = j.u, sx = j.sx, n = j.neck, h = j.hip, bk = -sx;
    const path = P.soft([[n[0] + sx * 6 * u, n[1] + 2 * u], [n[0] + bk * 5 * u, n[1] - 2 * u], [n[0] + bk * 12 * u, n[1] + 7 * u], [h[0] + bk * 13 * u, h[1] - 1 * u],
      [h[0] + bk * 3 * u, h[1] - 5 * u], [n[0] + sx * 3 * u, n[1] + 18 * u], [n[0] + sx * 10 * u, n[1] + 12 * u]]);
    g.save(); g.globalAlpha *= a;
    g.save(); g.clip(path);
    const top = n[1] - 4 * u, sh = (h[1] - top) / STRIPES.length;
    for (let i = 0; i < STRIPES.length; i++) { g.fillStyle = YARN[STRIPES[i]]; g.fillRect(Math.min(n[0], h[0]) - 30 * u, top + i * sh, 60 * u, sh + 0.8); }
    g.restore();
    g.strokeStyle = 'rgba(90,60,40,0.3)'; g.lineWidth = 1.2; g.stroke(path);
    g.restore();
  }
  /* the rainbow bridge, from out of the sky to the end of the pier; Bean runs down it */
  const RB = [[-760, -40], [-560, 160], [-40, 420]];   /* start, control, landing (world, on the quay's hill) */
  const rbAt = (u) => { const a = RB[0], c = RB[1], b = RB[2], v = 1 - u; return [v * v * a[0] + 2 * v * u * c[0] + u * u * b[0], v * v * a[1] + 2 * v * u * c[1] + u * u * b[1]]; };
  /* distance along the bridge → the curve's parameter, so that he runs at an even pace all the way down */
  let rbTab = null;
  const rbMeasure = () => { const tab = [0]; let L = 0, p = rbAt(0); for (let i = 1; i <= 240; i++) { const q = rbAt(i / 240); L += Math.hypot(q[0] - p[0], q[1] - p[1]); tab.push(L); p = q; } rbTab = tab; return L; };
  const rbU = (d) => { const tab = rbTab; let lo = 0, hi = tab.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (tab[m] < d) lo = m; else hi = m; } const k = T.clamp((d - tab[lo]) / ((tab[hi] - tab[lo]) || 1)); return (lo + k) / (tab.length - 1); };
  const STRIDE = 18.5;   /* distance per half-stride of his run: one bound every 2πx this */
  function rainbow(g, S) {
    const r = S.rb;
    if (!r || r.a < 0.01) return;
    const t = T.time, W = T.world;
    W.layer(g, 1);
    g.save(); g.globalAlpha = r.a * 0.75; g.lineCap = 'round';
    ['#e98a8a', '#f0b26a', '#f2dc7a', '#9fcf86', '#86b8de', '#a796d8'].forEach((c, i) => {
      g.strokeStyle = c; g.lineWidth = 9; g.beginPath();
      const off = (i - 2.5) * 9, a = RB[0], c2 = RB[1], b = RB[2];
      g.moveTo(a[0] + off, a[1] - off); g.quadraticCurveTo(c2[0] + off, c2[1] - off, b[0] + off * 0.3, b[1] - off * 0.3); g.stroke();
    });
    g.restore();
    P.glow(g, RB[2][0], RB[2][1], 90, '#fff6e0', 0.5 * r.a);
    if (rbTab && r.d > 0 && r.d < r.L) {
      /* he runs it, bounding, with the bridge's own slope under his feet, levelling out as he reaches the pier */
      const u = rbU(r.d), q = rbAt(u), q2 = rbAt(Math.min(1, u + 0.01)), q0 = rbAt(Math.max(0, u - 0.01));
      const slope = Math.atan2(q2[1] - q0[1], q2[0] - q0[0]), rot = slope * 0.85 * T.clamp((r.L - r.d) / 60);
      for (let i = 0; i < 6; i++) P.glow(g, q[0] - Math.cos(slope) * (i * 18 + 10), q[1] - Math.sin(slope) * (i * 18 + 10) - 10, 14 - i * 2, '#fff6e0', 0.5 - i * 0.075);
      F.dog(g, { x: q[0], y: q[1] - 2, s: 220, walk: r.d / STRIDE, run: 1, rot, wag: Math.sin(t * 16) * 0.6, flip: false });
    }
    g.restore();
  }

  T.stage('ch4', {
    chapter: 4, title: ['4장', '이웃들'], end: ['4장 끝', '5장 「꽃길」'], next: 'ch5', pad: 1, nextColor: '#fff6e6',
    plot: { stage: 2, stones: 4, board: true, table: true, tree: 0.1, patch: 1, fruit: 0.3 },
    build() { T.scenes.kitchen.build(); },
    onHill(g, h, S) {
      if (h !== 1) return;
      /* the lamp Rosa set down on the boards when she saw who it was */
      if (S.lampDown != null) K.lantern(g, S.lampDown, T.world.C.PIER_Y - 22, T.time, { bare: true, s: 0.8, seed: 3 });
      if (!S.rope) return;
      const b = S.rope.boat, y = T.world.surf(b.x) - 34;
      g.strokeStyle = '#d9c9a8'; g.lineWidth = 3; g.lineCap = 'round';
      g.beginPath(); g.moveTo(b.x + 196, y - 70); g.quadraticCurveTo((b.x + 212) / 2 + 16, T.world.C.PIER_Y + 10, 16, T.world.C.PIER_Y - 28); g.stroke();
    },
    after(g, S) { rainbow(g, S); },
    script: async function (X) {
      const W = T.world, C = W.C, PL = T.plot, S = X.S, ps = S.ps, A = X.A, TALK = X.TALK;
      const PIER = C.PIER_Y;
      const [px, py] = X.place.plot();
      S.rb = { a: 0, d: 0, L: 1 }; RB[2][1] = C.PIER_Y - 2; S.rb.L = rbMeasure(); S.lampDown = null;
      X.cam(px, py, 1); X.camSnap();
      let leo = X.actor('leo', { x: PL.HX + 150, style: F.leoAt(0), flip: true });
      leo.pose = (o, a, t) => { if (!a.moving) { const sw = Math.max(0, Math.sin(t * 5.6)); o.armF = { a: 1.2 + sw * 0.9, b: 0.8 - sw * 0.6 }; } };
      X.title();
      await X.wait(4.2);
      /* ---- an evening on the headland with Rosa, who has kept an eye on him since his mother went on:
         the whale that comes by once in ten years. 구름이 has come to see it too, and sits in the grass a little
         way off; she has eyes only for the calf ---- */
      const wh = T.place('whales', { dusk: 0.08, actors: [
        { id: 'rosa', style: F.styles.rosa, s: 138, at: 'leo', dx: -74, lean: 0.06, face: { mouth: 'smile' } },
        { id: 'leo', style: F.leoAt(0), at: 'leo', face: { mouth: 'smile' } },
        { id: 'cloud', style: F.styles.cloud, s: 96, at: 'leo', dx: 150, sit: true, face: { blush: 0.24 },
          pose: (q, t) => { q.lean = 0.14; q.headTilt = -0.1 + Math.sin(t * 0.5) * 0.03; q.legF = { foot: [13, 9] }; q.legB = { foot: [10, 10] }; q.armF = { hand: [12, -4] }; q.armB = { hand: [10, -2] }; } },
      ] });
      await X.years(3, 5, { age: 41, during: (d) => X.tween(ps, 'tree', 0.25, d) });
      wh.pass({ from: 0.14, dur: 96 });
      /* however long they talk, the whales are still in sight: past the middle they slow, they do not stop */
      let onHead = true;
      (async () => { while (onHead) { const w = wh.wh; if (w.k > 0.72 && w.dur < 420) w.dur *= 1.03; await X.wait(0.25); } })();
      await X.view(wh, { color: '#fff6e6', out: 1.4, in: 1.8 });
      T.announce('해 질 녘, 언덕 끝. 구름바다 저편에서 커다란 구름 고래가 새끼를 데리고 천천히 헤엄쳐 온다. 낮고 길게 노래한다. 조금 떨어진 풀밭에 구름이가 무릎을 안고 앉아 있다.');
      X.tween(wh.sun, 'k', 0.5, 80);
      let guide = X.actor('rosa', { x: PL.HX - 120, style: F.styles.rosa, s: 138, lean: 0.06 });   /* back on the hill, she is with him */
      leo.pose = null;
      await X.wait(3.6);
      await TALK.say('rosa', '십 년에 한 번 지나가는 고래야.\n난 여기서 일곱 번째 보네.');
      await TALK.say('rosa', '네 엄마는 저걸 세 번 보면서\n널 기다렸어.');
      /* she sings, and the calf, in sight now behind her, answers */
      await X.wait(1.2);
      while (wh.wh.k < 0.34) await X.wait(0.2);
      wh.wh.song = wh.t + 0.05;
      await X.wait(4);
      T.announce('어미 고래가 길게 노래하자, 새끼가 높은 소리로 대답한다.');
      await TALK.say('cloud', '엄마가 부르면,\n아기가 대답해.', { slow: true });
      const wl = wh.actor('leo');
      wl.pose = (q) => { q.flip = false; q.headTilt = 0.06; };   /* he looks over at her */
      await X.wait(1.2);
      await TALK.say('rosa', '지난번 고래 때도 저기 있었어.\n그때도 새끼만 보더라.');
      await TALK.say('leo', '구름이는… 언제부터 여기 있었어요?');
      await TALK.say('rosa', '언제 왔는지 아무도 몰라.\n어느 날 아침에 보니 부두 끝 상자에 앉아 있더라.');
      await TALK.say('rosa', '누굴 기다리냐고 물어도 몰라.\n그냥 저렇게 하늘만 봐.');
      await TALK.say('leo', '…혼자 기다리기엔, 너무 작네요.');
      await TALK.say('rosa', '그러니까 다들 한 번씩 들여다봐 주는 거지.\n너도 그래 줘.');
      wl.pose = null;   /* and back to the whales */
      await X.wait(4.5);
      await X.view(null, { color: '#fff6e6', out: 1.4, in: 1.4 });
      onHead = false;

      /* ---- a rainbow over the cloud sea ---- */
      await X.wait(1.4);
      A.sfx('star', 0.2); A.sfx('star', 0.6);
      leo.pose = null; leo.flip = true; guide.flip = true;
      T.announce('구름바다 위로 무지개가 선다. 하늘에서 부두 끝까지.');
      await TALK.say('rosa', '저건… 무지개 다리네.');
      await TALK.say('rosa', '짐승들은 배를 안 타고,\n저리로 달려온단다.');
      X.walk(leo, PL.HX - 420, 110);
      await X.wait(1.4);
      const crowd = [];
      /* to the quay, and the years that go by before the next time */
      const quay = async (from, to, set) => {
        await X.dip(async () => {
          S.actors = []; S.boats = []; S.rope = null; S.lampDown = null; crowd.length = 0;
          if (S.view) { S.view = null; if (S.bedNow) A.bed(S.bedNow[0], S.bedNow[1], S.bedNow[2]); }   /* coming away from the lake */
          const [qx, qy] = X.place.quay(); X.cam(qx, qy, 1.05); X.camSnap();
          set();
        });
        if (to > from) await X.years(from, to, { age: 36 + to });
      };
      let bean, kumo;
      await quay(5, 5, () => {
        leo = X.actor('leo', { x: 420, style: F.leoAt(0), flip: true });
        guide = X.actor('rosa', { x: 352, style: F.styles.rosa, s: 138, lean: 0.06, flip: true });
        kumo = X.cloudKid();   /* already looking up at it */
        S.rb.a = 1;
      });
      X.walk(leo, 200, 110);
      await X.wait(1.2);
      /* down he comes: running, not sliding, a bound at a time all the way down the curve of it */
      A.sfx('whoosh');
      await X.tween(S.rb, 'd', S.rb.L, S.rb.L / 150, T.ease.lin);
      bean = X.actor('bean', { dog: true, s: 220, x: RB[2][0], wag: 1, wagRate: 18, run: 1, stride: STRIDE, ph: S.rb.L / STRIDE });
      S.rb.d = 0;
      A.sfx('bark'); X.tween(S.rb, 'a', 0, 3);
      T.announce('무지개를 타고 늙은 강아지 한 마리가 달려 내려온다. 빈이다.');
      await X.walk(bean, 70, 150);   /* and on along the pier */
      bean.flip = false;
      await X.wait(0.4);
      /* he looks back up the hill at his bare frame */
      leo.pose = (o) => { o.armF = { a: 2.7, b: 2.2 }; o.headTilt = -0.1; }; leo.flip = false;
      await X.wait(1.2);
      leo.flip = true;
      await TALK.say('leo', '아직 집도 다 못 지었는데….');
      await TALK.say('rosa', '저 애는 집 보러 온 게 아니라\n너 보러 온 거야.');
      leo.pose = null;
      await X.tap(() => [bean.x, PIER - 30, 56]);
      leo.sit = 0.5;
      leo.pose = (o) => { o.armF = { hand: F.local(o, bean.x + 26, PIER - 34) }; o.armB = { hand: F.local(o, bean.x + 20, PIER - 20) }; o.lean = 0.3; o.face.eye = bean.x > 150 ? 'happy' : 'open'; };
      await X.walk(bean, leo.x - 46, 150);
      X.notes(4); A.sfx('bark', 0.5);
      kumo.look = true; kumo.face = { eye: 'happy', mouth: 'smile' };   /* the little one on the crates looks down from the sky at that */
      for (let i = 0; i < 5; i++) { await X.tween(bean, 'jump', 14, 0.16, T.ease.out); await X.tween(bean, 'jump', 0, 0.16, T.ease.in); }
      bean.run = 0; bean.stride = null;   /* an old dog's trot from here on */
      T.announce('빈이 달려와 레오 품에 안긴다. 상자 위의 구름이가 그쪽을 내려다본다.');
      await X.wait(1.6);
      await TALK.say('leo', '빈… 너 왜 이렇게 늙었어.');
      await TALK.say('leo', '…그럼 릴리는,\n이제 혼자 걷겠구나.', { slow: true });
      await TALK.say('rosa', '빈도 두고 온 사람이 있지.\n가 보자.');
      /* off to the lake; the little one gets down off her crates and comes along behind */
      leo.sit = 0; leo.pose = null;
      X.walk(leo, 900, 110); X.walk(guide, 860, 100); X.walk(bean, 960, 120);
      await X.wait(0.9);
      kumo.chair = 0; kumo.look = true; X.walk(kumo, 800, 80);
      await X.wait(1.2);

      /* ---- Bean's lake: Lily walking home from school in the rain, then on the back step with his collar ---- */
      const lakeB = T.lake({
        paint: T.vig.lilyBean, leo: F.leoAt(0), mom: F.styles.rosa, shore: true,
        rhText: '빈은 릴리 발치 늘 앉던 자리에, 공은 풀밭에, 등불은 꺼진 현관 등에, 구름이는 릴리 옆 계단에. 좌우로 끌어 점선에 맞춰 보세요',
        things: [
          { kind: 'dog', id: 'bean', x: -330, at: [140, 634], flip: false, lockFlip: false, ps: 300 },
          { kind: 'ball', id: 'ball', x: 300, at: [-150, 700],
            bank: (g, x) => { P.fill(g, P.circle(x, 212, 15), '#e3b64f'); P.line(g, x - 12, 206, x + 12, 218, 2, '#c99a2a'); },
            ghost: (g, x, dy, near, lit) => { if (lit > 0.97) return; g.globalAlpha = (0.4 + 0.3 * near) * (1 - lit); P.fill(g, P.circle(x, dy - 4, 13), '#101c33'); } },
          { kind: 'lamp', id: 'lamp', x: -60, at: [383, 380] },
          /* the one who walked the bank with him: her shadow sits down on the step, the other side of Lily */
          { kind: 'who', id: 'cloud', style: F.styles.cloud, x: 440, at: [336, 622], ps: 236, bs: 108, flip: true, lockFlip: true, face: { blush: 0.24 },
            pose: (o, t, L, inPic) => { if (!inPic) return; o.lean = 0.1; o.headTilt = 0.18; o.legF = { a: Math.PI / 2 - 0.1, b: Math.PI / 2 - 0.05 }; o.legB = { a: Math.PI / 2 - 0.22, b: Math.PI / 2 }; o.armF = { a: 0.62, b: 0.9 }; o.armB = { a: 0.5, b: 0.85 }; } },
        ],
      });
      const help = T.lakeHelp({ level: 1, leoAge: 1, who: F.lilyAt(11, { knit: F.KNIT }), friend: F.styles.cloud });
      await X.view(help, { color: '#1b2a40' });
      X.age('릴리, 11');
      T.announce('거울 호수. 비 오는 하굣길, 릴리가 빈의 목걸이를 손에 감고 혼자 걷는다. 물가에는 구름이도 와 있다.');
      await TALK.say('leo', '빈이 날마다\n마중 나가던 길이야.');
      /* at the school gate she will not start off into the dark, and whispers to someone who is not there */
      help.fright(true);
      await X.wait(1.4);
      await TALK.say('lily', '…거기 있지?', { slow: true });
      help.call();
      T.announce('물가를 걷던 구름이가 릴리 위쪽 물가로 가서 물속을 내려다본다.');
      await X.wait(2.8);
      help.fright(false);
      await help.done();
      await X.wait(1.2);
      await TALK.say('leo', '…오늘도 데려다주는구나, 빈.', { slow: true });
      await X.view(lakeB, { color: '#1b2a40', out: 0.9, in: 1 });
      await X.wait(0.8);
      T.announce('집에 온 릴리가 뒷마당 계단에 주저앉아 목걸이를 끌어안는다. 밥그릇은 아직 그대로다. 구름이도 물가에 서서 들여다본다.');
      T.announce('물그림자 맞추기. 빈은 릴리 발치에, 공은 풀밭에, 등불은 현관 등에, 구름이는 릴리 옆 계단에.');
      await lakeB.rhyme();
      await X.wait(1.2);
      lakeB.beat = 1;
      T.announce('릴리가 휘파람을 분다. 빈을 부르던 소리.');
      for (let i = 0; i < 2; i++) { A.note({ m: 84 + i * 3, vel: 0.24, voice: 'glass', dur: 0.6 }); await X.wait(0.5); }
      lakeB.note = '릴리가 빈을 부른다. 물가의 빈을 눌러 대답해 주세요';
      const beanOn = () => { const q = lakeB.things[0]; return [q.x, 200, 60]; };
      for (let i = 0; i < 2; i++) {
        await X.tap(beanOn, { screen: true });
        A.sfx('bark', i / 2); const q = lakeB.things[0];
        await X.tween(q, 'jump', 18, 0.14, T.ease.out); await X.tween(q, 'jump', 0, 0.16, T.ease.in);
        if (i === 0) { A.note({ m: 84, vel: 0.24, voice: 'glass', dur: 0.6 }); await X.wait(0.4); A.note({ m: 87, vel: 0.24, voice: 'glass', dur: 0.6 }); }
      }
      lakeB.note = null;
      await X.wait(0.6);
      lakeB.beat = 2;
      T.announce('릴리가 눈물을 닦으며 웃는다. 목걸이를 꼭 쥔다.');
      X.notes(3, { voice: 'felt', vel: 0.3 });
      await X.wait(2.2);
      await TALK.say('leo', '…옆에 있는 거, 알았나 봐.', { slow: true });
      await X.wait(0.6);

      /* ---- back up the hill: Pipi meets Bean ---- */
      S.actors = [];
      leo = X.actor('leo', { x: PL.HX + 90, style: F.leoAt(0), flip: true });
      bean = X.actor('bean', { dog: true, s: 220, x: PL.HX + 150, sit: 1, wag: 0.6, flip: true });
      X.cam(px, py, 1); X.camSnap();
      await X.view(null, { color: '#1b2a40' });
      X.bed(3, 0.13, 'walk');
      const pipi = X.actor('kid', { x: PL.HX - 640, style: F.styles.kidA, s: 100 });
      await X.walk(pipi, PL.HX - 250, 130);
      pipi.pose = (o, a, t) => { o.lean = 0.2; o.face.eye = 'happy'; o.armF = { a: 2.6, b: 2.4 }; o.y += Math.sin(t * 9) * 1.5; };
      bean.sit = 0; A.sfx('bark');
      await TALK.say('kid', '강아지다!\n아저씨 강아지야?');
      await TALK.say('leo', '빈이야.\n우리 릴리 강아지.');
      await X.walk(bean, PL.HX - 196, 150);   /* he goes to her */
      pipi.pose = (o, a, t) => { o.armF = { hand: F.local(o, bean.x, W.groundAt(bean.x) - 30) }; o.lean = 0.3; o.face.eye = 'happy'; };
      bean.sit = 1; bean.wag = 1; bean.wagRate = 16;
      T.announce('피피가 빈을 쓰다듬는다. 빈이 꼬리를 세차게 흔든다.');
      await X.wait(1.4);

      /* ---- the second garden: a bed more, and a dog who has never met wet earth ---- */
      await TALK.say('kid', '아저씨, 올해는 고랑 하나 더 파자.\n작년엔 까치가 다 먹었잖아.');
      await TALK.say('leo', '그래. 물길도 하나 더 내고.');
      const GZ = T.puzzle;
      await X.dip(async () => {
        pipi.pose = null; bean.wagRate = null;
        leo.x = GZ.PATCH_X + 230; leo.flip = true; pipi.x = GZ.PATCH_X + 275; pipi.flip = true; bean.x = GZ.PATCH_X + 330; bean.flip = true; bean.sit = 1;
        ps.patchHide = true;
        const q = GZ.patchCam(); X.cam(q[0], q[1], GZ.PATCH_Z); X.camSnap();
      });
      T.announce('텃밭 물길 내기. 고랑이 셋으로 늘었다. 뾰족한 갈림판은 물을 반씩 나눈다.');
      await X.play(GZ.trough({ which: 1 }));
      ps.patch = 2; ps.fruit = 0.5; ps.patchHide = false;
      bean.sit = 0; A.sfx('bark');
      T.announce('젖은 흙 냄새에 빈이 고랑으로 뛰어든다.');
      await X.walk(bean, GZ.PATCH_X - 40, 170);
      for (let i = 0; i < 4; i++) { A.sfx('step'); await X.tween(bean, 'jump', 10, 0.16, T.ease.out); await X.tween(bean, 'jump', 0, 0.16, T.ease.in); }
      ps.fruit = 0.15;
      await TALK.say('kid', '빈! 그거 내 토마토야!');
      await TALK.say('leo', '…내년엔 울타리부터 치자.');
      await X.dip(async () => { leo.x = PL.HX + 90; bean.x = PL.HX + 150; bean.sit = 1; pipi.x = PL.HX - 250; X.cam(px, py, 1); X.camSnap(); });
      /* walls, year after year, with a dog under his feet */
      await X.years(5, 9, { age: 45, during: (d) => { X.tween(ps, 'tree', 0.4, d); X.wait(d * 0.5).then(() => { ps.stage = 3; A.sfx('knock', 0.5); }); } });

      /* ---- Rosa's porch: on his way down into the town he finds her pulling the blanket out again ---- */
      const PORCH = 2070;
      let rosa0;
      await X.dip(async () => {
        S.actors = S.actors.filter((a2) => a2 !== pipi);
        leo.x = PORCH + 640; leo.flip = true; leo.pose = null; bean.x = PORCH + 700; bean.sit = 0;
        rosa0 = X.actor('rosa', { x: PORCH - 30, style: F.styles.rosa, s: 138, sit: 1, unpick: 1, face: { mouth: 'line' } });
        /* her knitting on her lap: unpicking, the yarn pulled up off it in kinks, or knitting on */
        rosa0.pose = (o, a, t) => {
          o.headTilt = 0.3; o.armB = { hand: [18, -7] };
          if (a.unpick) { const p = 0.5 + 0.5 * Math.sin(t * 2.4); o.armF = { hand: [23 + p * 5, -11 - p * 15] }; }
          else o.armF = { hand: [22, -9 + Math.sin(t * 8) * 1.2] };
        };
        rosa0.prop = (g, j, o, a, t) => {
          const sx = o.flip ? -1 : 1, kx = j.handB[0] + sx * 7, ky = j.handB[1] + 1, gy = W.groundAt(a.x);
          P.fill(g, P.circle(a.x - sx * 34, gy - 10, 10), YARN[a.done ? 3 : 2]);   /* the ball beside her */
          blanket(g, kx, ky, a.done ? 40 : 24, a.done ? 22 : 9, a.done ? 6 : 2);
          P.line(g, kx - 16, ky - 7, kx + 16, ky - 3, 2, '#c9c3ba'); P.line(g, kx - 14, ky - 2, kx + 17, ky - 8, 2, '#c9c3ba');
          g.strokeStyle = YARN[2]; g.lineWidth = 1.6; g.lineCap = 'round'; g.beginPath(); g.moveTo(a.x - sx * 34, gy - 14); g.quadraticCurveTo(a.x - sx * 10, gy - 2, kx - sx * 10, ky + 4); g.stroke();
          if (a.unpick) {   /* the row she is pulling out, still kinked from the needles */
            const hx = j.handF[0], hy = j.handF[1], n = 9; g.beginPath(); g.moveTo(kx + sx * 6, ky - 4);
            for (let i = 1; i <= n; i++) { const u = i / n; g.lineTo(T.lerp(kx + sx * 6, hx, u) + (i % 2 ? 2 : -2), T.lerp(ky - 4, hy, u)); }
            g.stroke();
          }
        };
        X.cam(PORCH + 20, W.groundAt(PORCH) - 180, 1.15); X.camSnap();
      });
      T.announce('로사의 집 앞. 로사가 무릎 위의 뜨개를 한 줄씩 다시 풀고 있다. 언덕에서 내려오던 레오가 걸음을 멈춘다.');
      X.walk(bean, PORCH + 215, 90);
      const toPorch = X.walk(leo, PORCH + 74, 84);
      await X.wait(2.4);
      rosa0.face = { eye: 'closed', mouth: 'line' };
      await TALK.say('rosa', '휴… 또 틀렸네.');
      rosa0.face = { mouth: 'line' };
      await toPorch;
      leo.flip = true; bean.sit = 1;
      await TALK.say('leo', '또 푸세요?');
      await TALK.say('rosa', '몇 해째 이래.\n줄무늬 차례가 자꾸 헷갈려서.');
      /* he sits down on the step with her, as he said he would */
      await X.tween(leo, 'sit', 1, 0.8, T.ease.io);
      await TALK.say('leo', '같이 봐 둔다고 했잖아요.');
      rosa0.face = { mouth: 'smile' };
      await TALK.say('rosa', '…그랬지.\n그때 호수에서 같이 본 줄무늬, 기억나?');
      await TALK.say('leo', '네. 다 기억해요.');
      rosa0.unpick = 0;
      T.announce('로사의 담요 뜨기. 호수에서 본 옛 담요의 줄무늬가 잠깐 보였다가 사라진다. 기억한 차례대로 실을 골라 뜬다.');
      await X.play(T.puzzle.knit({ at: () => { const q = W.toScreen(PORCH, W.groundAt(PORCH) - 120); return [q[0], q[1] + 60, S.cam.z * 0.85]; }, rounds: [[0, 1, 2, 1], [2, 0, 3, 1, 0, 2]], show: 3 }));
      rosa0.done = true;
      await X.wait(0.6);
      await TALK.say('rosa', '됐다.\n이제 그 애는 천천히 와도 돼.', { slow: true });
      await X.wait(0.6);
      await X.dip(async () => { S.actors = S.actors.filter((a2) => a2 !== rosa0); leo.sit = 0; leo.x = PL.HX + 90; leo.flip = true; bean.x = PL.HX + 150; bean.sit = 1; X.cam(px, py, 1); X.camSnap(); });

      /* ---- Bram's wife, in the lake ---- */
      let bram = X.actor('bram', { x: C.PLOT - 560, style: F.styles.bram, s: 144, lean: 0.08 });
      await X.walk(bram, PL.HX - 200, 74);
      bram.flip = false; leo.flip = true;
      await TALK.say('bram', '자네, 나랑 호수 좀 같이 가 주겠나.');
      await TALK.say('bram', '오늘이 그 사람 생일이야.');
      X.walk(bram, C.PLOT + 420, 84); await X.wait(0.4); X.walk(leo, C.PLOT + 380, 84); X.walk(bean, C.PLOT + 330, 90);
      await X.wait(1.6);
      const lakeW = T.lake({
        paint: T.vig.bramWife, leo: F.leoAt(0), shore: true,
        rhText: '브램은 마르타 옆 빈 의자에, 배는 옛 배 곁 창턱에, 등불은 꺼진 등대에. 좌우로 끌어 점선에 맞춰 보세요',
        things: [
          /* on the visitor's chair: a tall one, so he sits well back on the seat with his knees down, feet to the floor */
          { kind: 'who', id: 'bram', style: F.styles.bram, x: 320, at: [150, 660], ps: 350,
            pose: (o, t, L, inPic) => { if (!inPic) return; o.lean = 0.1; o.headTilt = 0.06; o.legF = { a: Math.PI / 2 - 0.8, b: Math.PI / 2 - 0.8 }; o.legB = { a: Math.PI / 2 - 0.9, b: Math.PI / 2 - 0.84 }; o.armF = { hand: [14, 8] }; o.armB = { hand: [11, 9] }; },   /* hands on his knees */
            prop: (g, j, lo, t, L) => { if (L.lit.bram < 0.5) return; const k = L.knock ? Math.sin(L.knock * Math.PI) : 0; g.save(); g.translate(j.handF[0], j.handF[1]); g.rotate(-0.6 - k * 0.8); P.line(g, 0, 0, 0, -22, 3, '#8a6442'); P.fill(g, P.rr(-8, -30, 16, 10, 3), '#6f4a34'); g.restore(); } },
          { kind: 'boat', id: 'boat', x: -330, at: [-150, 484],
            bank: (g, x) => { P.line(g, x - 30, 228, x - 22, 204, 4, '#8a6442'); P.line(g, x + 30, 228, x + 22, 204, 4, '#8a6442'); g.save(); g.translate(x, 200); P.fill(g, P.soft([[-42, -14], [42, -14], [52, -20], [42, 6], [-42, 6], [-52, -20]]), '#b07a4a'); P.line(g, 0, -14, 0, -60, 3, '#6f4a34'); g.restore(); },
            ghost: (g, x, dy, near, lit) => { if (lit > 0.97) return; g.globalAlpha = (0.4 + 0.3 * near) * (1 - lit); P.fill(g, P.soft([[x - 26, dy - 8], [x + 26, dy - 8], [x + 30, dy - 10], [x + 24, dy + 3], [x - 24, dy + 3], [x - 30, dy - 10]]), '#101c33'); P.line(g, x, dy - 8, x, dy - 38, 2, '#101c33'); } },
          { kind: 'lamp', id: 'lamp', x: 120, at: [-367, 262] },
        ],
      });
      await X.view(lakeW, { color: '#1b2a40' });
      X.age('마르타, 98');
      T.announce('거울 호수. 바다가 보이는 방, 창가 의자에 아주 늙은 여인이 앉아 있다. 창턱에는 작은 나무배 하나. 옆의 빈 의자.');
      await TALK.say('bram', '서른둘에 두고 왔는데,\n벌써 아흔여덟이야.');
      T.announce('물그림자 맞추기. 브램은 빈 의자에, 배는 창턱에, 등불은 먼 등대에.');
      await lakeW.rhyme();
      await X.wait(1.2);
      lakeW.beat = 1;
      T.announce('마르타가 노래를 흥얼거리며 의자 팔걸이를 두드린다.');
      await X.wait(1.6);
      await TALK.say('bram', '저 노래…\n배 띄울 때마다 불러 주던 거야.');
      lakeW.note = '마르타의 박자에 맞춰, 브램을 눌러 배를 두드려 주세요';
      const bramOn = () => { const q = lakeW.things[0]; return [q.x, 160, 64]; };
      for (let i = 0; i < 3; i++) { await X.tap(bramOn, { screen: true }); A.sfx('knock', 0.3 + i * 0.2); X.note({ voice: 'box', vel: 0.36 }); lakeW.knock = 0; await X.tween(lakeW, 'knock', 1, 0.32, T.ease.lin); lakeW.knock = 0; }
      lakeW.note = null;
      lakeW.beat = 2;
      T.announce('마르타가 창턱의 배에 손을 얹은 채 잠이 든다. 웃고 있다.');
      X.notes(3, { voice: 'felt', vel: 0.3 });
      await X.wait(2.4);
      await TALK.say('bram', '…곧 오겠구먼.');
      await TALK.say('bram', '이번엔 내 배로\n태워 줘야지.', { slow: true });
      await TALK.say('leo', '밧줄은 제가 풀게요.');

      /* ---- a year on: Captain Bram's wife, and she is in no hurry now either ---- */
      let wife, cloud;
      await quay(9, 10, () => {
        cloud = X.cloudKid({ x: 166, chair: 0, flip: true, lamp: true, lampHand: 'F', look: true });   /* a little lamp of her own, for whoever is coming */
        bram = X.actor('bram', { x: 96, style: F.styles.bram, s: 144, flip: true, lean: 0.06 });
        bram.pose = (o, a, t) => { if (!a.moving && !a.boat) { o.armF = { a: -0.5, b: -0.3 }; o.armB = { a: -0.5, b: -0.3 }; o.y += Math.sin(t * 2.4) * 1.5; } };
        leo = X.actor('leo', { x: 392, style: F.leoAt(0), flip: true });
        bean = X.actor('bean', { dog: true, s: 220, x: 440, sit: 1, flip: true, wag: 0.6 });
        crowd.push(X.actor('v1', { x: 486, style: F.styles.villagerA, s: 142, flip: true }), X.actor('v2', { x: 268, style: F.styles.villagerB, s: 134, flip: true }), X.actor('rosa', { x: 322, style: F.styles.rosa, s: 138, flip: true, lamp: true, lampHand: 'F' }), cloud);
        wife = X.actor('wife', { style: F.styles.bramWife, s: 106, lean: 0.24, face: { old: true } });
        S.b1 = X.boat({ x: -900, riders: [wife] });
      });
      X.toll(2);
      await TALK.say('rosa', '누가 오는구나.\n레오, 네가 대답해 줘. 길 잃지 않게.');
      const pressed = X.seaLamp({ rounds: [[0, 1, 2, 3], [2, 1, 3, 0, 1]] });
      X.sail(S.b1, -74, 30);
      await pressed;
      cloud.pose = (q, a, t) => { q.headTilt = 0.02; q.armF = { a: 1.9 + Math.sin(t * 2) * 0.06, b: 0.5 }; };   /* she holds her lamp up for the boat */
      await new Promise((res) => { const iv = () => (S.b1.x >= -74.5 ? res() : X.wait(0.2).then(iv)); iv(); });
      A.sfx('door');
      X.walk(bram, 62, 50);
      await X.land(wife, 24);
      wife.prop = cane;
      bram.pose = (o) => { o.armF = { hand: F.local(o, wife.x + 14, PIER - 62) }; o.lean = 0.14; };
      await X.wait(1.4);
      bram.flip = true;
      await TALK.say('wife', '…손이 다 거칠어졌네요.');
      await TALK.say('bram', '약속했잖아.\n당신 태울 배, 내 손으로 만들었어.');
      await TALK.say('wife', '나도 약속했잖아요.\n당신 배, 제일 먼저 타 주겠다고.');
      await X.wait(0.8);
      /* his boat goes into the water for the first time, with her in it */
      await X.dip(async () => {
        W.S.hook.flags.bramGone = true;
        S.boats = [];
        const big = X.boat({ x: -236, big: true, riders: [] });
        bram.boat = big; bram.seat = -70; bram.stand = 1; bram.hop = 0; bram.flip = true; big.riders.push(bram);
        wife.boat = big; wife.seat = 40; wife.stand = 0; wife.hop = 0; wife.flip = true; wife.prop = null; big.riders.push(wife);
        bram.pose = (o) => { o.armF = { a: 1.1, b: 0.4 }; };
        S.rope = { boat: big }; S.big = big; W.S.hook.flags.clearPier = true;
        X.cam(60, 452, 1);
      }, { out: 0.8, in: 1 });
      T.announce('브램 선장의 배가 처음으로 물에 떴다. 아흔아홉 살 마르타가 타고 있다.');
      await X.tap(() => [16, PIER - 30, 50]);
      T.announce('밧줄 풀기. 말뚝 셋에 감긴 밧줄을, 감긴 차례의 거꾸로 푼다.');
      await X.play(T.puzzle.rope({ order: [0, 2, 1, 0, 2] }));
      S.rope = null;
      await TALK.say('wife', '바다가 이렇게 넓었네요.', { slow: true });
      await TALK.say('bram', '고맙네, 레오.\n이제 둘이 건너가네.');
      T.announce('브램과 마르타가 구름바다 너머로 건너간다.');
      A.sfx('whoosh'); X.bed(3, 0.14, 'walk'); A.theme({ voice: 'box', vel: 0.3, beat: 0.62, left: false });
      X.sail(S.big, -1500, 54);
      [leo].concat(crowd).forEach((a) => { a.pose = wave; });
      bram.pose = wave; wife.pose = (o, a, t) => { o.armF = { a: 2.0 + Math.sin(t * 5) * 0.2, b: 0.3 }; };
      for (let i = 0; i < 4; i++) { await X.tween(bean, 'jump', 12, 0.18, T.ease.out); await X.tween(bean, 'jump', 0, 0.18, T.ease.in); await X.wait(0.5); }
      X.cam(-240, 452, 1, 0.5);
      await X.wait(2.6);
      T.announce('구름바다 끝, 빛의 폭포. 브램과 마르타의 배가 빛을 거슬러 저 너머로 오른다. 별 하나가 구름 아래 산 사람들의 하늘로 떨어진다.');
      await X.crossing([{ style: F.styles.bram, s: 144 }, { style: F.styles.bramWife, s: 106 }], { leoAge: 1, also: X.seeOff() });
      /* the neighbours go back up into the town; the little one is still looking out to where they went */
      [leo].concat(crowd).forEach((a) => { a.pose = null; });
      crowd.filter((a) => a !== cloud).forEach((a, i) => X.walk(a, 720 + i * 50, 70).then(() => { a.hidden = true; }));
      cloud.pose = (q) => { q.headTilt = -0.06; };
      X.cam(150, 470, 1.3, 0.8);
      await X.wait(2.4);
      await TALK.say('cloud', '다들 기다리던 사람이 오네.\n…나는 누굴 기다리지?', { slow: true });
      await X.walk(leo, cloud.x + 46, 60);
      leo.flip = true;
      leo.pose = (q) => { q.armF = { hand: F.local(q, cloud.x + 6, PIER - 70) }; q.headTilt = 0.12; };   /* a hand on her head, and nothing said */
      await X.wait(2.6);

      /* ---- five years on, the bell, and Rosa goes down with her lamp as she does for every boat. The old man who
         steps off it has only ever seen her in a photograph; as a boy he promised himself he would see her face ---- */
      let rosa, son;
      await quay(10, 15, () => {
        S.camK = 2;
        cloud = X.cloudKid({ lamp: true, lampHand: 'F', look: true });   /* on her crates, a lamp for whoever is coming */
        rosa = X.actor('rosa', { x: 990, style: F.styles.rosa, s: 140, flip: true, lamp: true, lampHand: 'F' });
        leo = X.actor('leo', { x: 1060, style: F.leoAt(0), flip: true });
        bean = X.actor('bean', { dog: true, s: 220, x: 1110, flip: true, wag: 0.6 });
        son = X.actor('son', { style: F.styles.rosaSon, s: 144, lean: 0.16, face: { old: true } });
        S.b1 = X.boat({ x: -820, riders: [son] });
      });
      X.toll(3);
      T.announce('종이 울린다. 로사가 등불을 들고 부두로 내려온다. 레오와 빈이 뒤따른다.');
      const down = X.walk(rosa, 120, 120); X.walk(leo, 300, 120); X.walk(bean, 352, 130).then(() => { bean.sit = 1; });
      await X.wait(2.2);
      await TALK.say('rosa', '누가 또 오는구나.\n먼 길 왔을 텐데.');
      await down;
      rosa.pose = (o) => { o.armF = { a: 1.5, b: 0.4 }; o.headTilt = -0.04; };   /* her lamp up, for the boat */
      await X.sail(S.b1, -74, 76);
      A.sfx('door');
      await X.land(son, 40);
      son.prop = cane;
      X.sail(S.b1, -1500, 40).then(() => { S.b1.hidden = true; });   /* the boat that brought him goes back out, empty */
      await X.wait(0.8);
      /* she holds the light up to his face; then she knows him */
      rosa.pose = (o) => { o.armF = { a: 1.75, b: 0.2 }; o.lean = 0.1; o.headTilt = 0.02; };
      await X.wait(1.6);
      A.note({ m: 76, vel: 0.22, voice: 'glass', dur: 1.2 });
      rosa.lamp = false; S.lampDown = rosa.x - 22;
      rosa.pose = (o) => { const m = F.mouth(o); o.armF = { hand: F.local(o, m[0] + (o.flip ? 5 : -5), m[1] + 4) }; o.face.eye = 'open'; o.face.mouth = 'line'; };   /* a hand to her mouth */
      T.announce('로사가 등불을 내려놓는다. 배에서 내린 백발 노인의 얼굴을 알아본다.');
      await X.wait(1.4);
      rosa.hug = { k: 0 }; son.hug = rosa.hug; son.prop = null;
      rosa.pose = (o) => T.embrace(o, rosa, son, rosa.hug.k);
      son.pose = (o) => { T.embrace(o, son, rosa, rosa.hug.k, true); o.lean += 0.26 * rosa.hug.k; };
      son.armOver = true; rosa.z = 1;
      await X.walk(rosa, son.x + 34, 150);
      rosa.flip = true;
      await X.tween(rosa.hug, 'k', 1, 0.7, T.ease.out);
      A.motif({ voice: 'box', vel: 0.36, beat: 0.7 });
      await X.wait(1.4);
      await TALK.say('rosa', '우리 아기.', { slow: true });
      await TALK.say('son', '…엄마?\n사진으로만 봤는데.');
      await TALK.say('son', '어릴 때 약속했거든요.\n언젠가 엄마 얼굴, 꼭 한 번 보겠다고.');
      await X.tween(rosa.hug, 'k', 0.55, 0.8, T.ease.io);   /* she holds him off a little, so that he can */
      son.face = { old: true, eye: 'happy', mouth: 'smile', tear: 0.7 };
      await TALK.say('rosa', '그래. 실컷 봐.');
      /* Leo knows where it is: up the hill and back, with the blanket over his arms */
      await X.wait(0.6);
      T.announce('레오가 말없이 언덕길을 올라간다.');
      X.walk(bean, 960, 130); X.walk(leo, 960, 130);
      await X.wait(1.8);
      await X.dip(async () => {
        leo.go = bean.go = null; leo.moving = bean.moving = false;
        leo.x = 330; leo.flip = true; bean.x = 380; bean.flip = true; bean.sit = 1;
        leo.carry = 'blanket';
        leo.pose = (o) => { if (leo.carry !== 'blanket') return; o.armF = { hand: [17, -16] }; o.armB = { hand: [15, -12] }; };
        leo.prop = (g, j) => {
          if (leo.carry === 'blanket') { const cx = (j.handF[0] + j.handB[0]) / 2, cy = (j.handF[1] + j.handB[1]) / 2 - 4; blanket(g, cx, cy, 34, 16); }
          else if (leo.carry === 'yarn') skein(g, j.handB[0], j.handB[1] + 3);
        };
      }, { out: 0.9, hold: 0.9, in: 1 });
      T.announce('레오가 다 뜬 담요를 안고 돌아온다.');
      await X.walk(leo, son.x + 100, 70);
      leo.flip = true;
      await X.wait(0.4);
      /* and Rosa puts it round her boy's shoulders */
      son.wrap = 0; leo.carry = null;
      son.prop = (g, j, o, a) => shawl(g, j, a.wrap || 0);
      X.tween(rosa.hug, 'k', 1, 0.9, T.ease.io);
      await X.tween(son, 'wrap', 1, 1.2, T.ease.io);
      T.announce('로사가 다 뜬 담요를 늙은 아들의 어깨에 둘러 준다.');
      await X.wait(0.6);
      await TALK.say('rosa', '이제야 덮어 준다.', { slow: true });
      await X.wait(0.8);
      /* his promise and hers, both kept on the boards of the pier: a white boat with no lamp comes in for them */
      A.promise();
      T.announce('두 사람의 약속이 다 지켜졌다. 등불 없는 하얀 배가 구름바다에서 미끄러져 온다.');
      const white = X.boat({ x: -900, hull: '#e9e2d6', lamp: false, riders: [] });
      const moored = X.sail(white, -74, 60);
      X.cam(120, 452, 1.1, 0.6);
      await X.wait(2.4);
      /* she lets him go, and turns to Leo with something from her apron pocket */
      await X.tween(rosa.hug, 'k', 0, 0.8, T.ease.io);
      son.armOver = false; son.pose = null; rosa.z = 0; son.face = { old: true, mouth: 'smile' };
      rosa.flip = false; await X.walk(rosa, son.x + 46, 40);
      rosa.gift = true;
      rosa.pose = (o) => { if (rosa.gift) o.armF = { hand: F.local(o, leo.x - 30, PIER - 72) }; };
      rosa.prop = (g, j) => { if (rosa.gift) skein(g, j.handF[0], j.handF[1] + 3); };
      await TALK.say('rosa', '레오야, 이거.');
      leo.pose = (o) => { if (rosa.gift) o.armB = { hand: F.local(o, leo.x - 30, PIER - 70) }; };
      await X.wait(0.8);
      rosa.gift = false; rosa.pose = null; leo.pose = null; leo.carry = 'yarn';
      T.announce('로사가 실 한 타래를 건넨다.');
      await TALK.say('rosa', '아나 오면 같이 떠.\n한 줄에 얘기 하나씩 하면서.');
      await TALK.say('leo', '…네. 코 하나 안 빠뜨리고요.');
      await TALK.say('rosa', '네 엄마 만나면 전할게.\n아들, 잘 지내더라고.', { slow: true });
      await moored;
      /* the two of them step down into it */
      for (const [a, seat] of [[son, -8], [rosa, -36]]) { await X.walk(a, 24, 56); if (a === son) son.prop = (g, j) => shawl(g, j, 1); await X.board(a, white, seat); a.flip = true; }
      X.toll(3); await X.wait(0.8);
      await TALK.say('rosa', '이번엔 보내는 길이네.\n레오, 네가 대답해 줘.');
      T.announce('배웅. 종이 울린 차례를 거꾸로, 마지막 등불부터 대답한다.');
      await X.play(T.puzzle.bell({ rounds: [[0, 1, 2], [0, 2, 1, 3]], reverse: true }));
      const bye = (o, a2, t) => { o.armF = { a: 2.2 + Math.sin(t * 4 + a2.x) * 0.2, b: 0.3 }; };
      [rosa, son, leo].forEach((a) => { a.pose = bye; });
      X.sail(white, -1500, 34);
      T.announce('하얀 배가 구름바다 너머로 멀어진다.');
      X.cam(-260, 452, 1, 0.4);
      await X.wait(3);
      T.announce('빛의 폭포. 로사와 아들의 배가 빛을 거슬러 오른다. 별 하나가 구름 아래로 떨어진다.');
      W.S.hook.flags.rosaGone = true;
      await X.crossing([{ style: F.styles.rosa, s: 138 }, { style: F.styles.rosaSon, s: 144 }], { leoAge: 1, also: X.seeOff() });
      /* the quay again, and the two who are left on it; the little one is still looking out to where they went */
      leo.pose = null; white.hidden = true;
      X.cam(320, 452, 1.15, 0.6);
      cloud.lamp = false; cloud.look = true; cloud.face = { mouth: 'line' };   /* her lamp put by, her hands in her lap */
      await X.wait(2.4);
      T.announce('구름이가 배가 사라진 쪽을 오래 본다.');
      /* he remembers what she asked, the year the captain went, and comes round and crouches by her crates */
      await X.walk(leo, cloud.x + 70, 60);
      leo.flip = true; cloud.flip = false;
      await X.tween(leo, 'sit', 0.5, 0.6, T.ease.io);
      X.tween(ps, 'night', 0.4, 5);
      await TALK.say('leo', '구름아, 오늘 밤에 호수 가 볼래?\n네 사람 찾으러.');
      cloud.face = { mouth: 'smile' };
      await TALK.say('cloud', '…나한테도 있어?', { slow: true });
      await TALK.say('leo', '그럼. 여기서 기다리는 사람은\n다 두고 온 사람이 있어.');
      await X.wait(0.6);

      /* ---- that night, the lake, with her beside him on the bank ---- */
      const strand = { k: 0 }, glint = { k: 0 };
      const lake = T.lake({
        paint: T.vig.gray, leo: F.leoAt(0), found: { k: 0 }, mirror: 0.25, leoFace: {}, kid: F.styles.cloud, kidDx: 100, kidDy: 10,   /* close beside him */
        /* the white hair: first a glint at the back of his head, under the beanie, then in his fingers */
        leoPose: (lo) => {
          const k = T.ease.io(strand.k);
          if (k < 0.01) return;
          const m = F.mouth(lo), sx = lo.flip ? -1 : 1, R = 8.4 * (lo.s / 100), hx = m[0] - sx * 0.72 * R, hy = m[1] - 0.6 * R;   /* the middle of his head */
          const a = T.clamp(k * 2), b = T.clamp(k * 2 - 1);
          const tx = T.lerp(T.lerp(lo.x + sx * 1.6 * R, hx - sx * 0.5 * R, a), hx + sx * 1.9 * R, b), ty = T.lerp(T.lerp(lo.y - 0.7 * R, hy + 0.2 * R, a), hy + 0.75 * R, b);
          lo.armF = { hand: F.local(lo, tx, ty) };
          lo.headTilt = 0.26 - 0.16 * b;
        },
        leoProp: (g, j, lo, t) => {
          const R = j.R, sx = j.sx, gk = glint.k, k = strand.k;
          g.save(); g.lineCap = 'round';
          if (k < 0.55 && gk > 0.01) {
            const x0 = j.head[0] - sx * 0.62 * R, y0 = j.head[1] + 0.12 * R;
            g.strokeStyle = T.rgba('#fbf8f0', gk); g.lineWidth = Math.max(1.2, R * 0.09);
            g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x0 - sx * 0.3 * R, y0 + 0.2 * R, x0 - sx * 0.2 * R, y0 + 0.55 * R); g.stroke();
            P.glow(g, x0 - sx * 0.2 * R, y0 + 0.4 * R, R * 0.7, '#fff8e8', 0.5 * gk * (0.6 + 0.4 * Math.sin(t * 3)));
          } else if (k >= 0.55) {
            const x0 = j.handF[0], y0 = j.handF[1] - R * 0.15;
            g.strokeStyle = '#fbf8f0'; g.lineWidth = Math.max(1.2, R * 0.09);
            g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x0 + sx * 0.4 * R, y0 - 0.5 * R, x0 + sx * 0.15 * R, y0 - 0.9 * R); g.stroke();
            P.glow(g, x0 + sx * 0.2 * R, y0 - 0.5 * R, R * 0.6, '#fff8e8', 0.35);
          }
          g.restore();
        },
      });
      await X.view(lake, { color: '#1b2a40' });
      T.announce('그날 밤, 호수. 레오와 구름이가 나란히 물가에 앉는다. 물결이 일어 비친 모습이 흩어져 있다. 바깥 고리를 돌리면 안쪽 고리가 함께 돈다.');
      await lake.calm({ start: [1, 3, 6], couple: true });
      X.age('아나, 51');
      T.announce('물에 비친 것은 아나의 부엌이다. 아나가 스튜를 젓고, 스무 살 릴리가 조리대에 걸터앉아 있다.');
      await X.wait(1.6);
      await TALK.say('leo', '…아나네.', { slow: true });
      await TALK.say('leo', '미안. 네 사람 찾으러 왔는데,\n내가 옆에 있어서 그런가 봐.');
      await TALK.say('cloud', '괜찮아.\n…이 아줌마, 따뜻하다.', { slow: true });
      await TALK.say('leo', '그치. 아나는 원래 그래.');
      await X.wait(0.8);
      /* she stops stirring, and draws one white hair out to look at */
      T.announce('아나가 머리카락 한 올을 뽑아 들여다본다. 흰머리다. 그러고는 웃는다.');
      await X.tween(lake.found, 'k', 1, 1.5);
      X.note({ voice: 'felt', vel: 0.34 });
      await X.wait(1.4);
      await TALK.say('cloud', '아줌마 머리에… 하얀 거.');
      await TALK.say('leo', '…첫 흰머리네.', { slow: true });
      await X.wait(0.8);
      await TALK.say('leo', '같이 늙자고 했는데.');
      /* and beside her picture, his own face, plainer as the water stills */
      X.tween(lake.fade, 'a', 0.55, 2);
      await X.tween(lake, 'mirror', 0.9, 2);
      const Wv = T.view.W;
      await X.tap(() => [-Wv / 2 + 350, 340, 70], { screen: true });
      lake.touch(-Wv / 2 + 350, 340);
      await X.wait(1.4);
      lake.leo = F.leoAt(1);
      T.announce('물이 가라앉자, 비친 레오의 머리에도 하얀 한 올이 보인다.');
      await X.tween(glint, 'k', 1, 1.2);
      await X.wait(1.2);
      await X.tween(strand, 'k', 1, 2.2, T.ease.lin);
      T.announce('레오가 그 한 올을 뽑아, 아나처럼 들여다본다.');
      X.notes(3, { voice: 'felt', vel: 0.3 });
      lake.leoFace = { mouth: 'smile' };
      await X.wait(1.2);
      await TALK.say('leo', '…나도 하나 났네.', { slow: true });
      await X.wait(4.5);
      X.end();
    },
  });
})();
