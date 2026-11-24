/* Chapter 4 「이웃들」 — years five to fifteen. It opens on the headland at dusk, where Rosa, who has looked out
   for him since his mother went on, shows him the cloud whale that goes by once in ten years; 구름이 is there too,
   sitting in the grass, watching the calf, and while it goes by Rosa tells him what little anyone knows of her.
   Bean comes, not by boat but down the rainbow bridge, and the lake (the one visit of this chapter) shows the girl
   he left: walking home from school in the rain with his collar, then on the back step, where the shadows of Bean
   and of 구름이 sit down with her, and her mother comes out and sits between them. Pipi meets Bean, and Bean meets
   the tomatoes. Years on, Leo finds Rosa on her porch unpicking the blanket again and sits down to knit it with
   her, from the stripes they saw in the lake. Bram comes by: it is his wife's birthday, and on the side of the boat
   he has been building for her they knock out the tune she sang at every launching. A year later she comes, he
   takes her out on his own boat as he promised, and the two of them cross, and 구름이 wonders who she is waiting
   for. Five years after that the bell rings for an old man, and Rosa knows him as he steps off the boat: her baby,
   who grew up with one photograph of her and promised it he would see her face. Leo runs up for the blanket, she
   puts it round him, and with both promises kept a white boat comes for them; Leo answers the bell backwards to
   see them off, with her yarn in his hand. The chapter ends on the quay at dusk, with 구름이, and a first white
   hair. */
(function () {
  'use strict';
  const T = window.TYT, P = T.P, F = T.F, K = T.town;
  const TAU = Math.PI * 2;

  const cane = (g, j, o) => { const gy = T.world.groundAt(o.x); P.line(g, j.handF[0], j.handF[1], j.handF[0] + (o.flip ? -8 : 8), gy, 3, '#6b4f52'); };
  /* Rosa's blanket: the yarns of the knitting puzzle, in the stripes of the old one (pictures.js paints the same) */
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
  /* what they saw in the lake six years before (chapter 3), cut out round, for the knitting: round 0 the blanket
     folded across her son's knees (four stripes show), round 1 the same blanket spread over the cradle (all six).
     Painted on a sheet of its own, so that the picture's own alphas do not undo the fade */
  let peekC = null;
  function peekLake(g, r, t) {
    const R = 122, cx = -190, cy = -150, px = 2, z = 1.62, fx = r ? -131 : 210, fy = r ? 756 : 732;
    if (!peekC) { peekC = document.createElement('canvas'); peekC.width = peekC.height = 2 * R * px; }
    const pg = peekC.getContext('2d');
    pg.setTransform(1, 0, 0, 1, 0, 0); pg.globalAlpha = 1; pg.globalCompositeOperation = 'source-over'; pg.clearRect(0, 0, peekC.width, peekC.height);
    pg.save(); pg.beginPath(); pg.arc(R * px, R * px, R * px, 0, TAU); pg.clip();
    pg.translate(R * px, R * px); pg.scale(z * px, z * px); pg.translate(-fx, -fy);
    T.vig.rosa(pg, t, { lit: { lamp: 1, yarn: 1, rosa: 1 }, beat: r ? 4 : 0, cover: { k: r ? 1 : 0 } });
    pg.restore();
    pg.globalCompositeOperation = 'source-atop'; pg.fillStyle = 'rgba(40,70,112,0.12)'; pg.fillRect(0, 0, peekC.width, peekC.height);   /* the lake's cool water over it */
    g.drawImage(peekC, cx - R, cy - R, 2 * R, 2 * R);
    g.save(); g.strokeStyle = 'rgba(223,238,255,0.8)'; g.lineWidth = 4; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.stroke();
    g.strokeStyle = 'rgba(223,238,255,0.3)'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, R + 9 + Math.sin(t * 2) * 2, 0, TAU); g.stroke(); g.restore();
  }
  /* little notes going up from someone humming */
  function hummed(g, x, y, t) {
    for (let i = 0; i < 3; i++) {
      const life = (t * 0.55 + i / 3) % 1;
      g.save(); g.globalAlpha = 0.75 * Math.sin(life * Math.PI); g.translate(x + i * 9 + Math.sin(t * 2 + i) * 4, y - life * 46);
      P.fill(g, P.ellipse(0, 0, 3.6, 2.8, -0.3), '#5a4a6a'); P.line(g, 3, 0, 3, -10, 1.3, '#5a4a6a'); g.restore();
    }
  }
  /* how far the 'kneel' gesture has let the hip down (gestures.js, anchored at the hip), so that hands aimed at
     something in the world before it is laid over the pose still come out there */
  const kneelDrop = (o, k) => ((o.s || 150) / 100) * (23.75 * T.smooth(T.clamp((k - 0.4) / 0.6)) + 1.2 * Math.sin(T.clamp(k / 0.5) * Math.PI));
  /* a hair pulled from under the edge of his cap and brought round in front of his eyes to look at
     (k 0..1, driven by the scene: by 0.45 the hand is there, from 0.55 it comes forward) */
  if (T.gesture && T.pose && !T.gesture.defs['pluck-hair']) T.gesture.def('pluck-hair', {
    in: 0.01, out: 0.9, dur: Infinity, curve: (x) => x,
    pose(o, k, t) {
      const a = T.smooth(T.clamp(k / 0.45)), b = T.smooth(T.clamp((k - 0.55) / 0.45));
      o.headTilt = (o.headTilt || 0) + 0.12 * b;
      const H = T.pose.headPoint, at = H(o, 'ear', -0.35, 0.3), look = H(o, 'eye', 2.1, 0.75);
      T.pose.reach(o, 'F', [T.lerp(at[0], look[0], b), T.lerp(at[1], look[1], b) - Math.sin(b * Math.PI) * 6], a);
      if (b > 0.5) o.face = Object.assign({}, o.face, { eye: 'open', mouth: 'smile' });
    },
  });

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
  /* the evening the chapter ends on: the sky over the quay going to rose and violet (S.eve 0..1) */
  function eveSky(g, S) {
    const e = S.eve || 0;
    if (e < 0.01) return;
    const W = T.view.W, sk = g.createLinearGradient(0, 0, 0, 900);
    sk.addColorStop(0, '#2e3270'); sk.addColorStop(0.38, '#6e5590'); sk.addColorStop(0.68, '#d9848a'); sk.addColorStop(0.9, '#f4b483');
    g.save(); g.globalAlpha = 0.72 * T.ease.io(e); g.fillStyle = sk; g.fillRect(-W / 2, 0, W, 900); g.restore();
  }
  const EVE = {};

  T.stage('ch4', {
    chapter: 4, title: ['4장', '이웃들'], end: ['4장 끝', '5장 「꽃길」'], next: 'ch5', pad: 1, nextColor: '#fff6e6',
    endDim: 0.42,   /* the card comes up over the evening sky: a veil under it, and light ink */
    plot: { stage: 2, stones: 4, board: true, table: true, tree: 0.1, patch: 1, fruit: 0.3, season: 'spring' },
    build() { T.scenes.kitchen.build(); },
    sky(g, S) { eveSky(g, S); },
    onHill(g, h, S) {
      if (h !== 1) return;
      /* the lamp Rosa set down on the boards when she saw who it was */
      if (S.lampDown != null) K.lantern(g, S.lampDown, T.world.C.PIER_Y - 22, T.time, { bare: true, s: 0.8, seed: 3 });
      if (!S.rope) return;
      /* the big boat's line, made fast to the bollard at the end of the pier: lifted off it, it flies to the boat */
      const R = S.rope, b = R.boat, y = T.world.surf(b.x) - 34, PY = T.world.C.PIER_Y, lift = T.ease.io(R.lift || 0), fly = T.ease.io(R.fly || 0);
      const BX = 58, bow = [b.x + 196, y - 70], post = [BX, PY - 28 - 74 * lift];
      const end = [T.lerp(post[0], bow[0] - 40, fly), T.lerp(post[1], bow[1] + 30, fly) - Math.sin(fly * Math.PI) * 50];
      P.fill(g, P.rr(BX - 8, PY - 40, 16, 40, 5), '#6f4a34'); P.fill(g, P.rr(BX - 11, PY - 44, 22, 8, 4), '#8a6442');   /* the bollard */
      g.strokeStyle = '#d9c9a8'; g.lineWidth = 3; g.lineCap = 'round';
      g.beginPath(); g.moveTo(bow[0], bow[1]); g.quadraticCurveTo((bow[0] + end[0]) / 2 + 16, PY + 10 - 30 * lift - 40 * fly, end[0], end[1]); g.stroke();
      if (fly < 0.98) { g.beginPath(); g.ellipse(end[0], end[1] + 2, 12, 4.5, 0, 0, TAU); g.stroke(); }   /* the loop */
    },
    after(g, S) { rainbow(g, S); },
    script: async function (X) {
      const W = T.world, C = W.C, PL = T.plot, S = X.S, ps = S.ps, A = X.A, TALK = X.TALK;
      const PIER = C.PIER_Y;
      const [px, py] = X.place.plot();
      S.rb = { a: 0, d: 0, L: 1 }; RB[2][1] = C.PIER_Y - 2; S.rb.L = rbMeasure(); S.lampDown = null; S.eve = 0; S.lookAs = null; S.rope = null;
      A.surface(null);
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
      await X.years(3, 5, { age: 41, season: 'summer', during: (d) => X.tween(ps, 'tree', 0.25, d) });
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
      await TALK.say('rosa', '언제 왔는지 아무도 몰라.\n어느 날 보니 부두 끝에 앉아 있더라.');
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
      /* to the quay (boards underfoot), and the years that go by before the next time */
      const quay = async (from, to, set) => {
        await X.dip(async () => {
          S.actors = []; S.boats = []; S.rope = null; S.lampDown = null; crowd.length = 0;
          if (S.view) { S.view = null; if (S.bedNow) A.bed(S.bedNow[0], S.bedNow[1], S.bedNow[2]); }   /* coming away from the lake */
          const [qx, qy] = X.place.quay(); X.cam(qx, qy, 1.05); X.camSnap();
          A.surface('wood');
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
      /* down on one knee on the boards, his arms open for him */
      leo.kneelK = 0;
      X.gesture(leo, 'kneel', { k: () => leo.kneelK, face: false });
      leo.pose = (o) => {
        const d = kneelDrop(o, leo.kneelK), near = bean.x > leo.x - 120;
        o.armF = { hand: F.local(o, near ? bean.x + 26 : leo.x - 46, (near ? PIER - 34 : PIER - 70) - d) };
        o.armB = { hand: F.local(o, near ? bean.x + 20 : leo.x - 36, (near ? PIER - 20 : PIER - 58) - d) };
        o.face.eye = near ? 'open' : 'happy';
      };
      X.tween(leo, 'kneelK', 1, 1.5, T.ease.lin);
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
      /* he gets up; off to the lake, and the little one gets down off her crates and comes along behind */
      await X.tween(leo, 'kneelK', 0, 1.1, T.ease.lin);
      X.ungesture(leo, 'kneel'); leo.pose = null;
      X.walk(leo, 900, 110); X.walk(guide, 860, 100); X.walk(bean, 960, 120);
      await X.wait(0.9);
      kumo.chair = 0; kumo.look = true; X.walk(kumo, 800, 80);
      await X.wait(1.2);

      /* ---- the lake, the one time in this chapter: Lily walking home from school in the rain, then on the back
         step with his collar, and her mother coming out to her ---- */
      const lakeB = T.lake({
        paint: T.vig.lilyBean, leo: F.leoAt(0), mom: F.styles.rosa, shore: true, ana: { k: 0 },
        rhText: '빈은 릴리 발치 늘 앉던 자리에, 공은 풀밭에, 등불은 꺼진 현관 등에, 구름이는 릴리 옆 계단에. 좌우로 끌어 점선에 맞춰 보세요',
        things: [
          { kind: 'dog', id: 'bean', x: -330, at: [140, 634], flip: false, lockFlip: false, ps: 300 },
          { kind: 'ball', id: 'ball', x: 300, at: [-150, 700],
            bank: (g, x) => { P.fill(g, P.circle(x, 212, 15), '#e3b64f'); P.line(g, x - 12, 206, x + 12, 218, 2, '#c99a2a'); },
            ghost: (g, x, dy, near, lit) => { if (lit > 0.97) return; g.globalAlpha = (0.4 + 0.3 * near) * (1 - lit); P.fill(g, P.circle(x, dy - 4, 13), '#101c33'); } },
          { kind: 'lamp', id: 'lamp', x: -60, at: [383, 380] },
          /* the one who walked the bank with him: her shadow sits down on the step, a little way along from Lily,
             with room between them (where, later, her mother sits) */
          { kind: 'who', id: 'cloud', style: F.styles.cloud, x: 440, at: [414, 622], ps: 236, bs: 108, flip: true, lockFlip: true, face: { blush: 0.24 },
            pose: (o, t, L, inPic) => {
              if (!inPic) return;
              const lean = L.beat >= 3 && L.ana ? T.smooth(T.clamp((L.ana.k - 0.7) / 0.3)) : 0;   /* she leans in toward the warmth beside her */
              o.lean = 0.1 + 0.12 * lean; o.headTilt = 0.18 + 0.14 * lean; o.legF = { a: Math.PI / 2 - 0.1, b: Math.PI / 2 - 0.05 }; o.legB = { a: Math.PI / 2 - 0.22, b: Math.PI / 2 }; o.armF = { a: 0.62, b: 0.9 }; o.armB = { a: 0.5, b: 0.85 };
              if (lean > 0.5) o.face = Object.assign({}, o.face, { eye: 'happy', mouth: 'smile' });
            } },
        ],
      });
      const help = T.lakeHelp({ level: 1, leoAge: 1, who: F.lilyAt(11, { knit: F.KNIT }), friend: F.styles.cloud });
      A.surface(null);
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
      lakeB.note = '릴리가 빈을 불러요. 물가의 빈을 눌러 대답해 주세요';
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
      await X.wait(2.6);   /* (no word from him here: her laugh says it, and her mother is at the door) */
      /* the back door opens: Ana comes out and sits down on the step, between the girl and the little shadow, and
         puts an arm round her. Up over the yard, two small clouds hold hands. The water comes a little closer */
      await X.wait(0.8);
      lakeB.beat = 3;
      X.vcam(80, 486, 1.12, 3.4);   /* (no further right than this at this zoom, or the edge of the water shows) */
      T.announce('뒷문이 열리고 아나가 나온다. 릴리 곁 계단에 앉아 어깨를 감싸 안는다. 저녁 하늘에 작은 구름 둘이 손을 잡고 떠 있다.');
      await X.tween(lakeB.ana, 'k', 1, 4.4, T.ease.lin);
      X.notes(2, { voice: 'felt', vel: 0.26 });
      await X.wait(1.4);
      await TALK.say('lily', '…아까 누가 손 잡아 줬어.', { slow: true });
      await X.wait(1.2);
      await TALK.say('cloud', '…이 아줌마, 따뜻하다.', { slow: true });
      await TALK.say('leo', '그치. 아나는 원래 그래.');
      await X.wait(1.4);

      /* ---- back up the hill: Pipi meets Bean ---- */
      S.actors = [];
      leo = X.actor('leo', { x: PL.HX + 90, style: F.leoAt(0), flip: true });
      bean = X.actor('bean', { dog: true, s: 220, x: PL.HX + 150, sit: 1, wag: 0.6, flip: true });
      X.cam(px, py, 1); X.camSnap();
      await X.view(null, { color: '#1b2a40' });
      A.surface(null);
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
      await X.years(5, 9, { age: 45, season: 'autumn', during: (d) => { X.tween(ps, 'tree', 0.4, d); X.wait(d * 0.5).then(() => { ps.stage = 3; A.sfx('knock', 0.5); }); } });

      /* ---- Rosa's porch: on his way down into the town he finds her pulling the blanket out again ---- */
      const PORCH = 2070;
      let rosa0;
      await X.dip(async () => {
        S.actors = S.actors.filter((a2) => a2 !== pipi);
        leo.x = PORCH + 640; leo.flip = true; leo.pose = null; bean.x = PORCH + 700; bean.sit = 0;
        rosa0 = X.actor('rosa', { x: PORCH - 30, style: F.styles.rosa, s: 138, sit: 1, unpick: 1, spread: 0, face: { mouth: 'line' } });
        /* her knitting on her lap: unpicking, the yarn pulled up off it in kinks, or knitting on; at the end she
           holds it up by its two corners to see it whole */
        rosa0.pose = (o, a, t) => {
          const sp = T.ease.io(a.spread || 0);
          o.headTilt = 0.3 - 0.36 * sp; o.armB = { hand: [18 - 12 * sp, -7 - 27 * sp] };
          if (sp > 0.01) o.armF = { hand: [24 + 22 * sp, -9 - 27 * sp] };
          else if (a.unpick) { const p = 0.5 + 0.5 * Math.sin(t * 2.4); o.armF = { hand: [23 + p * 5, -11 - p * 15] }; }
          else o.armF = { hand: [22, -9 + Math.sin(t * 8) * 1.2] };
          if (sp > 0.5) o.face = Object.assign({}, o.face, { eye: 'happy', mouth: 'smile' });
        };
        rosa0.prop = (g, j, o, a, t) => {
          const sx = o.flip ? -1 : 1, gy = W.groundAt(a.x), sp = T.ease.io(a.spread || 0);
          P.fill(g, P.circle(a.x - sx * 34, gy - 10, 10), YARN[a.done ? 3 : 2]);   /* the ball beside her */
          if (sp > 0.01) {   /* held up by the corners, hanging down over her knees */
            const l = j.handB, r = j.handF, w = Math.abs(r[0] - l[0]) + 14, h = T.lerp(22, 50, sp);
            blanket(g, (l[0] + r[0]) / 2, Math.min(l[1], r[1]) + h / 2 - 2, w, h, 6);
            return;
          }
          const kx = j.handB[0] + sx * 7, ky = j.handB[1] + 1;
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
      await TALK.say('leo', '제가 봐 둔다고 했잖아요.');
      rosa0.face = { mouth: 'smile' };
      await TALK.say('rosa', '…그랬지.\n그때 호수에서 같이 본 줄무늬, 기억나?');
      await TALK.say('leo', '네. 다 기억해요.');
      rosa0.unpick = 0;
      T.announce('로사의 담요 뜨기. 호수에서 본 옛 담요가 잠깐 보였다가 사라진다. 처음엔 그 애 무릎에 접혀 있던 모습, 다음엔 요람에 펼쳐 덮인 모습. 기억한 줄무늬 차례대로 실을 골라 뜬다.');
      await X.play(T.puzzle.knit({
        at: () => { const q = W.toScreen(PORCH, W.groundAt(PORCH) - 120); return [q[0], q[1] + 60, S.cam.z * 0.85]; },
        rounds: [[2, 0, 3, 1], [2, 0, 3, 1, 0, 2]], show: [4, 3], peek: peekLake,
        wrong: '로사: "아이고, 나랑 똑같이 헷갈리네." 담요를 한 번 더 봐요',
      }));
      rosa0.done = true;
      /* she holds it up, the whole of it, and looks */
      await X.tween(rosa0, 'spread', 1, 1.2, T.ease.io);
      A.note({ m: 77, vel: 0.22, voice: 'glass', dur: 1.6 });
      await X.wait(1.0);
      await TALK.say('rosa', '됐다.\n이제 그 애는 천천히 와도 돼.', { slow: true });
      await X.tween(rosa0, 'spread', 0, 1.0, T.ease.io);

      /* ---- Bram comes along the street looking for him: it is his wife's birthday, and he would like company at
         the boat he has been building for her ---- */
      let bram = X.actor('bram', { x: PORCH - 620, style: F.styles.bram, s: 144, lean: 0.08 });
      await X.walk(bram, PORCH - 118, 80);
      bram.flip = false;
      await X.tween(leo, 'sit', 0, 0.6, T.ease.io);
      leo.flip = true;
      await TALK.say('bram', '자네, 나랑 배터 좀 같이 가 주겠나.\n오늘이 그 사람 생일이야.');
      const SLIP = 900, GUN = W.groundAt(SLIP) - 121;   /* the slip, and the side of the boat on it, where they sit */
      const seat = (a) => { a.chair = 1; a.chairH = W.groundAt(a.x) - (GUN - 2) - 12 * (a.s / 150); };
      await X.dip(async () => {
        S.actors = S.actors.filter((a2) => a2 !== rosa0);
        W.S.hook.flags.bramOut = true;   /* the town's own Bram at the bow steps out of the picture: this one is him */
        bram.x = SLIP - 6; bram.flip = true; seat(bram); bram.knock = 0; bram.hum = false;
        leo.x = SLIP - 92; leo.flip = true; seat(leo); leo.knock = 0;
        bean.x = SLIP - 176; bean.flip = true; bean.sit = 1;
        /* his mallet in one hand, the other flat on the gunwale; Leo's knuckles */
        bram.pose = (o, a) => {
          const up = 1 - (a.knock || 0);
          o.armF = { hand: F.local(o, a.x - 30, GUN - 4 - up * 20) }; o.armB = { hand: F.local(o, a.x + 18, GUN + 2) };
          o.headTilt = a.hum ? -0.1 : 0.06;
          if (a.hum) o.face = Object.assign({}, o.face, { eye: 'closed', mouth: 'open' });
        };
        bram.prop = (g, j, o, a, t) => {
          const k = a.knock || 0;
          g.save(); g.translate(j.handF[0], j.handF[1]); g.rotate(-1.1 - k * 0.5); P.line(g, 0, 0, 0, -20, 3, '#8a6442'); P.fill(g, P.rr(-8, -28, 16, 10, 3), '#6f4a34'); g.restore();
          if (a.hum) hummed(g, j.head[0] - 16, j.head[1] - 22, t);
        };
        leo.pose = (o, a) => { const up = 1 - (a.knock || 0); o.armF = { hand: F.local(o, a.x - 26, GUN - 4 - up * 16) }; o.armB = { hand: F.local(o, a.x + 16, GUN + 2) }; o.headTilt = 0.08; };
        X.cam(SLIP - 70, GUN - 24, 1.45); X.camSnap();
      });
      T.announce('브램의 배터. 거의 다 지은 큰 배가 받침대 위에 있다. 브램과 레오가 뱃전에 나란히 걸터앉아 바다 쪽을 본다.');
      const knock = async (who, i) => { who.knock = 0; await X.tween(who, 'knock', 1, 0.13, T.ease.in); A.sfx('knock', 0.25 + 0.25 * i); X.tween(who, 'knock', 0, 0.32, T.ease.out); };
      await X.wait(1.2);
      await TALK.say('bram', '서른둘에 두고 왔는데,\n올해 아흔여덟이야.');
      /* he hums it, and knocks the time out on the gunwale */
      bram.hum = true;
      for (let i = 0; i < 3; i++) { X.note({ voice: 'hum', vel: 0.32 }); await knock(bram, i); await X.wait(0.48); }
      await X.wait(0.4);
      await TALK.say('bram', '마르타가 배 띄울 때마다\n불러 주던 노래야.');
      /* and Leo knocks along with him, the same three */
      T.announce('브램이 흥얼거리며 뱃전을 두드린다. 레오도 같은 박자로 세 번 두드린다.');
      for (let i = 0; i < 3; i++) {
        await X.tap(() => [leo.x - 26, GUN - 6, 34]);
        X.note({ voice: 'hum', vel: 0.32 }); knock(bram, i); await knock(leo, i);
      }
      bram.hum = false;
      await X.wait(0.6);
      bram.face = { mouth: 'smile', eye: 'happy' };
      await TALK.say('bram', '언제가 되든,\n제일 먼저 태워 줄 거야.', { slow: true });
      await TALK.say('leo', '밧줄은 제가 풀게요.');
      await X.wait(0.6);

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
      /* the boat waits out in the mist for the lamp on the sea: one light, and the way is open */
      await TALK.say('rosa', '누가 오는구나.\n레오, 등불 좀 켜 줘.');
      const lit = X.seaLamp();
      X.sail(S.b1, -74, 30);
      await lit;
      cloud.pose = (q, a, t) => { q.headTilt = 0.02; q.armF = { a: 1.9 + Math.sin(t * 2) * 0.06, b: 0.5 }; };   /* she holds her lamp up for the boat */
      await new Promise((res) => { const iv = () => (S.b1.x >= -74.5 ? res() : X.wait(0.2).then(iv)); iv(); });
      A.sfx('door');
      X.walk(bram, 62, 50);
      await X.land(wife, 24);
      wife.prop = cane;
      bram.pose = (o) => { o.armF = { hand: F.local(o, wife.x + 14, PIER - 62) }; o.lean = 0.14; };
      X.age('마르타, 99');
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
        S.rope = { boat: big, lift: 0, fly: 0 }; S.big = big; W.S.hook.flags.clearPier = true;
        X.cam(60, 452, 1);
      }, { out: 0.8, in: 1 });
      T.announce('브램 선장의 배가 처음으로 물에 떴다. 아흔아홉 살 마르타가 타고 있다. 밧줄은 아직 부두 끝 말뚝에 걸려 있다.');
      /* he said he would cast them off: to the bollard, and the loop lifted off it in one long pull */
      await X.walk(leo, 92, 96);
      leo.flip = true;
      leo.sit = 0.6;   /* down to the bollard; he straightens as the loop comes up off it */
      leo.pose = (o) => { const r = S.rope, lift = r ? T.ease.io(r.lift) : 0; o.lean = 0.32 - 0.24 * lift; o.armF = { hand: F.local(o, 58, PIER - 30 - 74 * lift) }; o.armB = { hand: F.local(o, 66, PIER - 26 - 74 * lift) }; };
      T.announce('밧줄 풀기. 말뚝에 걸린 고리를 위로 길게 끌어 벗긴다.');
      await X.drag({
        axis: 'y', sign: -1, dist: 230,
        on: (p) => { S.rope.lift = p; leo.sit = 0.6 * (1 - T.ease.io(p)); },
        hint: () => { const a = W.toScreen(58, PIER - 30), b = W.toScreen(58, PIER - 170); return [a, b]; },
      });
      A.sfx('whoosh'); leo.sit = 0; leo.pose = (o) => { o.armF = { a: 2.3, b: 0.5 }; };
      await X.tween(S.rope, 'fly', 1, 0.9, T.ease.io);
      S.rope = null; leo.pose = null;
      await X.wait(0.4);
      await TALK.say('wife', '바다가 이렇게 넓었네요.', { slow: true });
      await TALK.say('bram', '고맙네, 레오.\n이제 둘이 건너가네.');
      T.announce('브램과 마르타가 구름바다 너머로 건너간다.');
      A.score('farewell');
      A.sfx('whoosh'); X.bed(3, 0.14, 'walk'); A.theme({ voice: 'box', vel: 0.3, beat: 0.62, left: false });
      X.sail(S.big, -1500, 54);
      const wavers = [leo].concat(crowd.filter((a) => a !== cloud));
      wavers.forEach((a) => X.gesture(a, 'wave', { hold: true }));
      X.gesture(cloud, 'wave', { hold: true, arm: 'B', style: 'soft' });   /* her lamp in the other hand */
      X.gesture(bram, 'wave', { hold: true, style: 'slow' }); X.gesture(wife, 'wave', { hold: true, style: 'soft' });
      for (let i = 0; i < 4; i++) { await X.tween(bean, 'jump', 12, 0.18, T.ease.out); await X.tween(bean, 'jump', 0, 0.18, T.ease.in); await X.wait(0.5); }
      X.cam(-240, 452, 1, 0.5);
      await X.wait(2.6);
      T.announce('구름바다 위에서 브램과 마르타의 배가 빛으로 물든다. 배가 구름을 떠나고, 둘은 하나의 빛이 되어 하늘로 오른다.');
      await X.crossing([{ style: F.styles.bram, s: 144 }, { style: F.styles.bramWife, s: 106 }], { leoAge: 1, also: X.seeOff() });
      A.score(null);
      /* the neighbours go back up into the town; the little one is still looking out to where they went */
      wavers.concat([cloud]).forEach((a) => { X.ungesture(a, 'wave'); a.pose = null; });
      crowd.filter((a) => a !== cloud).forEach((a, i) => X.walk(a, 720 + i * 50, 70).then(() => { a.hidden = true; }));
      cloud.pose = (q) => { q.headTilt = -0.06; };
      X.cam(150, 470, 1.3, 0.8);
      await X.wait(2.4);
      await TALK.say('cloud', '다들 기다리던 사람이 오네.\n…나는 누굴 기다리지?', { slow: true });
      await X.walk(leo, cloud.x + 40, 60);
      leo.flip = true; cloud.pose = null;
      X.gesture(leo, 'hand-on-head', { with: cloud, hold: true, in: 1.1 });   /* a hand on her hat, and nothing said */
      await X.wait(3.2);
      await X.ungesture(leo, 'hand-on-head');

      /* ---- five years on, the bell, and Rosa goes down with her lamp as she does for every boat. The old man who
         steps off it has only ever seen her in a photograph; looking at it, as a boy, he promised he would see her
         face. This is the one the chapter has been keeping its breath for ---- */
      let rosa, son;
      await quay(10, 15, () => {
        X.season('winter');   /* a winter boat: she has a blanket to put round him */
        S.camK = 2;
        cloud = X.cloudKid({ lamp: true, lampHand: 'F', look: true });   /* on her crates, a lamp for whoever is coming */
        rosa = X.actor('rosa', { x: 990, style: F.styles.rosa, s: 140, flip: true, lamp: true, lampHand: 'F' });
        leo = X.actor('leo', { x: 1060, style: F.leoAt(0), flip: true });
        bean = X.actor('bean', { dog: true, s: 220, x: 1110, flip: true, wag: 0.6 });
        son = X.actor('son', { style: F.styles.rosaSon, s: 144, lean: 0.16, face: { old: true } });
        S.b1 = X.boat({ x: -820, riders: [son] });
      });
      /* S1: the bell, and the walk down */
      X.toll(3);
      T.announce('종이 울린다. 로사가 등불을 들고 부두로 내려온다. 레오와 빈이 뒤따른다.');
      const down = X.walk(rosa, 140, 120); X.walk(leo, 300, 120); X.walk(bean, 352, 130).then(() => { bean.sit = 1; });
      await X.wait(2.2);
      await TALK.say('rosa', '누가 또 오는구나.\n먼 길 왔을 텐데.');
      await down;
      rosa.pose = (o) => { o.armF = { a: 1.5, b: 0.4 }; o.headTilt = -0.04; };   /* her lamp up, for the boat */
      /* S2: the boat in, and nothing but the sea */
      X.hush();
      X.cam(70, PIER - 150, 1.3, 0.8);
      await X.sail(S.b1, -74, 76);
      A.sfx('door');
      await X.land(son, 36);
      son.prop = cane;
      X.sail(S.b1, -1500, 40).then(() => { S.b1.hidden = true; });   /* the boat that brought him goes back out, empty */
      await X.wait(0.8);
      /* S3: she holds the light up to his face; then she knows him, and sets the lamp down */
      X.cam((rosa.x + son.x) / 2, PIER - 124, 1.7, 1.1);
      rosa.pose = (o) => { o.armF = { a: 1.75, b: 0.2 }; o.lean = 0.1; o.headTilt = 0.02; };
      await X.wait(2.0);
      A.note({ m: 76, vel: 0.22, voice: 'glass', dur: 1.6 });
      rosa.lamp = false; S.lampDown = rosa.x - 22;
      rosa.pose = (o) => { const m = F.mouth(o); o.armF = { hand: F.local(o, m[0] + (o.flip ? 5 : -5), m[1] + 4) }; };   /* a hand to her mouth */
      rosa.face = { eye: 'wide', brow: 'up', mouth: 'line' };
      T.announce('로사가 등불을 내려놓는다. 배에서 내린 백발 노인의 얼굴을 알아본다.');
      await X.wait(1.6);
      /* S4: she goes to him and holds him, his head on her shoulder, the old man held like a baby */
      rosa.pose = null; rosa.face = {}; son.prop = null; son.face = { old: true };
      await X.walk(rosa, son.x + 58, 110);
      rosa.flip = true; rosa.z = 1;
      A.score('reunion');
      X.gesture(rosa, 'hug', { with: son, hold: true, role: 'high', in: 1.2, face: 'smileTears', partnerFace: 'smileTears' });
      await X.wait(0.6);
      A.motif({ voice: 'box', vel: 0.36, beat: 0.7 });
      X.cam((rosa.x + son.x) / 2, PIER - 120, 1.95, 0.4);
      await X.wait(1.8);
      await TALK.say('rosa', '우리 아기.', { slow: true });
      await TALK.say('son', '…엄마?\n사진으로만 봤는데.');
      await TALK.say('son', '사진 보면서 약속했거든요.\n언젠가 엄마 얼굴, 꼭 한 번 보겠다고.');
      /* S5: she holds him off a little, a hand on his cheek, so that he can */
      await X.ungesture(rosa, 'hug');
      rosa.keepFlip = true; await X.walk(rosa, son.x + 70, 24); rosa.keepFlip = false; rosa.flip = true;   /* half a step back, still facing him */
      son.face = { old: true, eye: 'open', well: 0.9, mouth: 'wobble', tremble: 0.3, blush: 0.3 };
      X.gesture(rosa, 'cheek', { with: son, hold: true, face: 'smileTears', partnerOpts: { cover: true, face: false } });
      await X.wait(1.4);
      await TALK.say('rosa', '그래. 실컷 봐.');
      await X.wait(1.0);
      /* S6: Leo knows where it is: up the hill and back, with the blanket over his arms */
      X.bed(3, 0.12, 'walk');
      T.announce('레오가 말없이 언덕길을 올라간다.');
      X.cam(320, 452, 1.15, 0.6);
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
      X.cam(110, PIER - 136, 1.5, 1.0);
      await X.walk(leo, son.x + 118, 70);
      leo.flip = true;
      await X.wait(0.4);
      /* S7: and Rosa puts it round her boy's shoulders */
      await X.ungesture(rosa, 'cheek');
      X.tween(son, 'lean', 0.08, 0.8, T.ease.io);   /* he stands as straight as he can, for her */
      await X.walk(rosa, son.x + 62, 30); rosa.flip = true;
      son.wrap = 0; leo.carry = null;
      son.prop = (g, j, o, a) => shawl(g, j, a.wrap || 0);
      rosa.pose = (o) => { const k = T.ease.io(son.wrap || 0), n = son.j ? son.j.neck : [son.x, PIER - 110]; o.armF = { hand: F.local(o, n[0] - 8, n[1] + 8 - 8 * (1 - k)) }; o.armB = { hand: F.local(o, n[0] + 10, n[1] + 10) }; o.lean = 0.16; };
      await X.tween(son, 'wrap', 1, 1.6, T.ease.io);
      T.announce('로사가 다 뜬 담요를 늙은 아들의 어깨에 둘러 준다.');
      rosa.pose = null;
      X.gesture(rosa, 'hug', { with: son, hold: true, role: 'high', in: 1.0, face: 'gentle', partnerFace: 'gentle' });
      await X.wait(1.2);
      await TALK.say('rosa', '이제야 덮어 준다.', { slow: true });
      await X.wait(0.8);
      /* his promise and hers, both kept on the boards of the pier: a white boat with no lamp comes in for them */
      A.promise();
      T.announce('두 사람의 약속이 다 지켜졌다. 등불 없는 하얀 배가 구름바다에서 미끄러져 온다.');
      const white = X.boat({ x: -900, hull: '#e9e2d6', lamp: false, riders: [] });
      const moored = X.sail(white, -74, 60);
      X.cam(120, 452, 1.1, 0.6);
      await X.wait(2.4);
      /* S8: she lets him go, and turns to Leo with something from her apron pocket */
      await X.ungesture(rosa, 'hug');
      son.pose = null; rosa.z = 0; son.face = { old: true, mouth: 'smile' };
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
      for (const [a, seat2] of [[son, -8], [rosa, -36]]) { await X.walk(a, 24, 56); if (a === son) son.prop = (g, j) => shawl(g, j, 1); await X.board(a, white, seat2); a.flip = true; }
      X.toll(3); await X.wait(0.8);
      await TALK.say('rosa', '이번엔 보내는 길이네.\n레오, 네가 대답해 줘.');
      T.announce('배웅. 종이 울린 차례를 거꾸로, 마지막 등불부터 대답한다.');
      await X.play(T.puzzle.bell({ rounds: [[0, 1, 2], [0, 2, 1, 3]], reverse: true }));
      A.score('farewell');
      [rosa, son].forEach((a) => X.gesture(a, 'wave', { hold: true, style: 'slow' }));
      X.gesture(leo, 'wave', { hold: true });
      X.sail(white, -1500, 34);
      T.announce('하얀 배가 구름바다 너머로 멀어진다.');
      X.cam(-260, 452, 1, 0.4);
      await X.wait(3);
      T.announce('구름바다 위에서 로사와 아들의 배가 빛으로 물든다. 배가 구름을 떠나고, 둘은 하나의 빛이 되어 하늘로 오른다.');
      W.S.hook.flags.rosaGone = true;
      await X.crossing([{ style: F.styles.rosa, s: 138 }, { style: F.styles.rosaSon, s: 144 }], { leoAge: 1, also: X.seeOff() });
      A.score(null);
      X.ungesture(leo, 'wave');

      /* ---- the quay again at dusk, and the two who are left on it. He remembers what she asked the year the
         captain went, and crouches by her crates; and she sees something in his hair ---- */
      white.hidden = true; leo.pose = null; leo.carry = null;
      cloud.lamp = false; cloud.look = true; cloud.face = { mouth: 'line' };   /* her lamp put by, her hands in her lap */
      const winter = T.look.get('winter'), dusk = T.look.get('dusk');
      S.lookAs = () => T.look.blend(EVE, winter, dusk, (S.eve || 0) * 0.85);
      X.tween(S, 'eve', 1, 7, T.ease.io); X.tween(ps, 'night', 0.22, 7, T.ease.io);
      X.bed(1, 0.11, 'night');   /* the evening coming on: piano and glass, slower */
      X.cam(cloud.x + 30, PIER - 170, 1.3, 0.5);
      await X.wait(2.4);
      T.announce('해가 진다. 구름이가 배가 사라진 쪽을 오래 본다.');
      await X.walk(leo, cloud.x + 58, 60);
      leo.flip = true; cloud.flip = false;
      X.cam(cloud.x + 30, PIER - 120, 1.75, 0.45);
      await X.gesture(leo, 'kneel', { with: cloud, hold: true, in: 1.5 });
      await TALK.say('leo', '구름아.\n너도 기다리는 사람 있을 거야.');
      cloud.face = { mouth: 'smile' };
      await TALK.say('cloud', '…나한테도 있어?', { slow: true });
      await TALK.say('leo', '그럼. 여기서 기다리는 사람은\n다 두고 온 사람이 있어.');
      await X.wait(1.0);
      /* the dusk catches one hair under the edge of his cap: white */
      const strand = { k: 0, glint: 0 };
      leo.style = F.leoAt(1);
      leo.prop = (g, j, o, a, t) => {
        const R = j.R, sx = j.sx, k = strand.k;
        g.save(); g.lineCap = 'round'; g.strokeStyle = '#fbf8f0'; g.lineWidth = Math.max(1.4, R * 0.1);
        if (k < 0.45 && strand.glint > 0.01) {   /* by his ear, under the cap */
          const x0 = j.head[0] - sx * 0.3 * R, y0 = j.head[1] + 0.05 * R;
          g.globalAlpha = strand.glint; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x0 - sx * 0.25 * R, y0 + 0.3 * R, x0 - sx * 0.1 * R, y0 + 0.62 * R); g.stroke();
          P.glow(g, x0 - sx * 0.12 * R, y0 + 0.4 * R, R * 0.8, '#fff8e8', 0.5 * strand.glint * (0.6 + 0.4 * Math.sin(t * 3)));
        } else if (k >= 0.45) {   /* between his fingers, held up to the last of the light */
          const x0 = j.handF[0], y0 = j.handF[1] - R * 0.15;
          g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x0 + sx * 0.4 * R, y0 - 0.5 * R, x0 + sx * 0.15 * R, y0 - 0.95 * R); g.stroke();
          P.glow(g, x0 + sx * 0.2 * R, y0 - 0.5 * R, R * 0.7, '#fff8e8', 0.4);
        }
        g.restore();
      };
      await X.tween(strand, 'glint', 1, 1.2);
      const onCrates = cloud.pose;
      cloud.pose = (q, a, t) => { onCrates(q, a, t); q.headTilt = -0.12; };   /* she looks up at it */
      await X.wait(0.6);
      await TALK.say('cloud', '아저씨 머리에… 하얀 거.');
      T.announce('레오의 모자 밑으로 하얀 머리카락 한 올이 보인다.');
      await X.tap(() => (leo.j ? [leo.j.head[0], leo.j.head[1] + 4, 30] : [leo.x, PIER - 120, 30]));
      leo.pluck = 0;
      X.gesture(leo, 'pluck-hair', { k: () => leo.pluck });
      await X.tween(leo, 'pluck', 0.45, 1.0, T.ease.lin);
      strand.k = 0.45;
      await X.wait(0.3);
      await X.tween(leo, 'pluck', 1, 1.2, T.ease.lin);
      T.announce('레오가 그 한 올을 뽑아 들여다본다.');
      X.notes(3, { voice: 'felt', vel: 0.3 });
      await X.wait(1.4);
      await TALK.say('leo', '…나도 하나 났네.', { slow: true });
      await X.wait(0.6);
      cloud.pose = onCrates; cloud.face = { mouth: 'smile', eye: 'happy' };
      await TALK.say('leo', '같이 늙자고 했거든.');
      await X.wait(4.5);
      X.end();
    },
  });
})();
