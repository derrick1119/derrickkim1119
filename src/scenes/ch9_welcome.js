/* The last chapter 「마중」, and the epilogue. The lake shows her saying it to Lily, and Lily saying it back;
   the bell rings; he walks down to the harbour, old, lamp in hand, the way he has for every boat, and this
   time it is her. The bell asks only what it asked the first time he stood here, 「천천히 와」, slowly: nothing
   hard, right before she comes. The little one in the pink hat turns out to be theirs: Lily's twin, who went on
   ahead before she was born, and has kept her promise to her sister from here all along. When the white boat
   comes for her she chooses to stay, to be the one who meets Lily. They walk home past everything he built; he
   cooks; at night the aurora comes out over the hill; they knit the story blanket together, a row each (his
   story of up here, then hers of the same days down below); Ana tells him what she promised Lily, they set the
   first stone of Lily's room, and at the list on the gate he crosses off the aurora and leaves growing old
   together to be kept slowly. Then the three of them say it to Lily, and two small clouds hold hands in the sky.
   Before the end card, the epilogue in letter.js: the player's own letter, if they want to write one. */
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

  /* ---------- the story blanket, knitted by two ----------
     Rosa said it on the quay: knit it together when Ana comes, a story to a row. He picks the yarn, in the order
     things happened, and knits his row from the left; then she takes the needles and knits the next row back from
     the right, in a paler run of the same yarn, telling what that same time was like down below (o.tell(i): the
     chapter's lines). A ball out of order, and she asks if that came first.
     o: { items: [{ name, c, icon }] in the order they happened, order (how the balls are laid out), tell(i) } */
  function knitTwo(o) {
    const Z = T.puzzle, ICON = Z.storyIcons, A = T.audio;
    const N = o.items.length, order = o.order, X0 = (n) => (n - (N - 1) / 2) * 150, BY = 706;
    const LH = 40, AH = 26, TOP = 96, HW = 200;   /* his row, her row; the blanket's half width */
    const G = Z.make({ i: 0, rows: [], used: [], phase: 'pick', balls: 0, rest: false });
    G.start = () => { G.clock.tween(G, 'balls', 1, 0.8); };
    G.hit = (x, y) => { if (G.phase !== 'pick') return -1; for (let n = 0; n < N; n++) if (!G.used.includes(n) && Math.hypot(x - X0(n), y - BY) < 54) return n; return -1; };
    function row(i, who) {
      const r = { k: 0, item: o.items[i], who };
      G.rows.push(r); A.sfx('knit', who === 'ana' ? 0.7 : 1);
      return G.clock.tween(r, 'k', 1, who === 'ana' ? 1.6 : 1, T.ease.io);
    }
    /* one story: his row, then hers, with what she says over it */
    async function pair(i) {
      G.used.push(order.indexOf(i));
      A.step(i + 3, { voice: 'felt', vel: 0.34 });
      await row(i, 'leo');
      await G.clock.wait(0.35);
      await Promise.all([row(i, 'ana'), o.tell ? o.tell(i) : null]);
    }
    async function run() {
      G.phase = 'tell'; G.say = ''; G.clock.tween(G, 'balls', 0, 0.5);
      await pair(G.i); G.i++;
      while (G.rest && G.i < N) { await G.clock.wait(0.4); await pair(G.i); G.i++; }   /* skipped: the rest, told in order */
      if (G.i >= N) { G.phase = 'done'; A.promise(); G.finish(1.8); return; }
      G.phase = 'pick'; G.idle = 0; G.clock.tween(G, 'balls', 1, 0.6);
    }
    G.tap = function (n) {
      if (G.done || G.phase !== 'pick' || n < 0 || n >= N || G.used.includes(n)) return;
      G.idle = 0;
      if (order[n] !== G.i) { G.wrong('아나: "어, 그게 먼저였어?" 있었던 차례를 다시 떠올려 봐요'); return; }
      run();
    };
    /* skipped: no more choosing, but every story is still told, his row and hers */
    G.solve = function () { G.rest = true; if (G.phase === 'pick') run(); };
    G.next = () => (G.phase === 'pick' && !G.done ? String(order.indexOf(G.i) + 1) : null);
    G.hintAt = () => (G.phase === 'pick' && !G.done ? [X0(order.indexOf(G.i)), BY] : null);
    G.keys = () => (G.phase === 'pick' ? 'pick' : null);
    G.tip = () => (G.phase === 'pick' ? '실타래를 하나씩 눌러 한 줄씩 떠요' : '');
    G.hintR = 60;
    G.spots = () => (G.phase !== 'pick' ? [] : order.map((idx, n) => (G.used.includes(n) ? null : [n, X0(n), BY, 54])));
    function needle(g, x, y, h, dir, col) {   /* the needle at the front of a row being knitted */
      g.save(); g.translate(x, y + h / 2); g.rotate(dir * 0.5);
      P.line(g, 0, -h / 2 - 16, 0, h / 2 + 16, 3.4, col);
      P.fill(g, P.circle(0, -h / 2 - 18, 4.2), T.shade(col, -0.2));
      g.restore();
    }
    G.draw = function (g, t) {
      if (G.a < 0.005) return;
      G.dim(g, 0.5);
      g.save(); g.globalAlpha = G.a;
      const full = N * (LH + AH);
      P.fill(g, P.rr(-HW - 12, TOP - 14, HW * 2 + 24, full + 28, 12), 'rgba(251,244,226,0.16)');
      let y = TOP;
      G.rows.forEach((r, n) => {
        const his = r.who === 'leo', h = his ? LH : AH, k = T.ease.out(r.k), c = his ? r.item.c : T.mix(r.item.c, '#fbf4e2', 0.55);
        const x0 = his ? -HW : HW - HW * 2 * k;   /* he knits from the left, she knits back from the right */
        g.save(); g.beginPath(); g.rect(x0, y, HW * 2 * k, h - 4); g.clip();
        P.fill(g, P.rr(-HW, y, HW * 2, h - 4, 6), c);
        g.strokeStyle = T.shade(c, -0.18); g.lineWidth = 2;
        if (his) for (let x = -HW + 4; x < HW; x += 12) { g.beginPath(); g.moveTo(x, y + 8); g.lineTo(x + 6, y + h - 12); g.lineTo(x + 12, y + 8); g.stroke(); }
        else { g.fillStyle = T.shade(c, -0.16); for (let x = -HW + 6; x < HW; x += 10) for (let j = 0; j < 2; j++) { g.beginPath(); g.arc(x + (j ? 5 : 0), y + 7 + j * 9, 1.9, 0, TAU); g.fill(); } }   /* her stitch: small and close */
        g.restore();
        if (r.k > 0.01 && r.k < 0.99) needle(g, his ? -HW + HW * 2 * k : HW - HW * 2 * k, y, h - 4, his ? 1 : -1, his ? '#e4b85a' : '#e8a0a0');
        if (his && k > 0.6) {
          g.save(); g.translate(-HW - 40, y + h / 2 - 2); ICON[r.item.icon](g, t); g.restore();
          P.text(g, r.item.name, HW + 92, y + h / 2 + 10, { size: 32, color: '#fbf4e2', alpha: T.clamp((k - 0.6) * 2.5), seed: 40 + n });
        }
        y += h;
      });
      P.line(g, -HW - 30, y + 6, HW + 30, y, 4, '#c9c3ba'); P.line(g, -HW - 26, y + 12, HW + 28, y + 8, 3, '#c9c3ba');
      /* the yarn, one ball for each story, put away while she talks */
      if (G.balls > 0.01) {
        g.globalAlpha = G.a * G.balls;
        order.forEach((idx, n) => {
          if (G.used.includes(n)) return;
          const it = o.items[idx], x = X0(n) + G.jig(t, n);
          P.fill(g, P.circle(x, BY, 38), it.c);
          g.strokeStyle = T.shade(it.c, -0.2); g.lineWidth = 2;
          for (let k = -2; k <= 2; k++) { g.beginPath(); g.ellipse(x, BY, 34, 12 + Math.abs(k) * 5, k * 0.5, 0, TAU); g.stroke(); }
          g.save(); g.translate(x, BY - 62); ICON[it.icon](g, t); g.restore();
          P.text(g, it.name, x, BY + 68, { font: 'serif', size: 22, fit: 140, color: '#fbf4e2', seed: 2 });
        });
      }
      g.restore();
      G.hintRing(g, t);
      if (G.phase === 'pick') G.caption(g, G.i === 0 ? '아나가 "처음부터" 들려 달래요. 있었던 차례대로 실을 골라 한 줄씩 뜨세요' : '아나가 물어요: "그다음엔?"');
    };
    return G;
  }

  /* two small clouds, one holding the other's hand: 구름이 saw them in the second year, and here they are again at
     the end. Nobody says what they are. Screen coordinates; a: how much they have come out */
  function twoClouds(g, x, y, s, a, t) {
    if (a < 0.01) return;
    const col = '#b4bcdc', lit = '#d8f2e8';
    g.save(); g.globalAlpha *= a; g.translate(x + Math.sin(t * 0.11) * 8, y + Math.sin(t * 0.17) * 3); g.scale(s, s);
    P.glow(g, 0, 0, 150, '#bfe8dc', 0.12);
    const puff = (cx, dir, sc) => {
      g.save(); g.translate(cx, 0); g.scale(sc * dir, sc);
      [[-22, 2, 15], [-6, -8, 18], [12, -2, 14], [-32, 8, 9]].forEach((q) => P.fill(g, P.circle(q[0], q[1], q[2]), col));
      P.fill(g, P.rr(-40, 4, 66, 14, 7), col);
      P.fill(g, P.ellipse(27, 7, 13, 7, -0.18), col);   /* an arm, reaching to the middle */
      g.globalAlpha *= 0.55; P.fill(g, P.circle(-8, -14, 9), lit); P.fill(g, P.circle(-26, -4, 6), lit);   /* where the aurora catches them */
      g.restore();
    };
    puff(-42, 1, 1); puff(40, -1, 0.9);
    P.fill(g, P.circle(0, 8, 6.5), col);   /* and the two hands, held */
    g.restore();
  }

  T.stage('ch9', {
    chapter: 9, title: ['마지막 장', '마중'], end: ['끝', '천천히 와', 'TAKE YOUR TIME'], endHand: true, endDim: 0.93, pad: 4, mood: 'still',
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
    /* at the very end, two small clouds in the night sky, hand in hand */
    after(g, S) {
      if (S.closeIn > 0.005) {   /* the quay darkening round them, so that the little lamp is the light on their faces */
        const W = T.view.W, gr = g.createRadialGradient(0, 480, 120, 0, 480, W * 0.58);
        gr.addColorStop(0, 'rgba(28,20,48,0)'); gr.addColorStop(1, T.rgba('#1c1430', 0.55 * S.closeIn));
        g.fillStyle = gr; g.fillRect(-W / 2, 0, W, 900);
      }
      if (S.pair) twoClouds(g, S.pair.x, S.pair.y, S.pair.s, S.pair.a, T.time);
    },
    onHill(g, h, S) {
      if (h === 1 && S.lampDown != null) K.lantern(g, S.lampDown, T.world.C.PIER_Y - 22, T.time, { bare: true, s: 0.85, lit: 1, seed: 3 });
      if (h === 1 && S.cLamp != null) K.lantern(g, S.cLamp, T.world.C.PIER_Y - 14, T.time, { bare: true, s: 0.55, lit: 1, seed: 6 });
      if (h === 3 && S.mem) memories(g, S.mem);
    },
    script: async function (X) {
      const W = T.world, C = W.C, PL = T.plot, S = X.S, ps = S.ps, A = X.A, TALK = X.TALK, PIER = C.PIER_Y;
      const [, py] = X.place.plot(), [qx, qy] = X.place.quay();
      S.track = null; S.swinging = false; S.lampDown = null; S.cLamp = null; S.mem = null; S.aur = null; S.pair = null; S.closeIn = 0;
      const real = (sec) => sec * (T.pace || 1);   /* the story's clock runs a little brisker than the music: sec of music, in its seconds */

      /* ---- the lake, the last time ---- */
      const lake = T.lake({ paint: T.vig.bed, leo: F.leoAt(4), said: { k: 0 }, mirror: 0.5, leoFace: { old: true }, fade: { a: 0 } });
      S.view = lake;
      X.title();
      await X.wait(4.6);
      await X.tween(lake.fade, 'a', 1, 2.6);
      X.age('아나, 81');
      T.announce('호수. 병상에 누운 아나가 쉰 살이 넘은 릴리의 손을 잡고 있다.');
      await X.wait(3.4);
      await TALK.say('ana', '엄마 먼저 가서,\n아빠랑 맛있는 거 해 놓을게.');
      X.tween(lake.said, 'k', 0.7, 2.4);
      await TALK.say('ana', '그러니까 천천히 와.', { slow: true });
      A.motif({ voice: 'felt', vel: 0.4, beat: 0.86 });
      await X.tween(lake.said, 'k', 1, 2.2);
      /* what he said to his mother on the quay, forty-five years ago */
      await TALK.say('lily', '…응. 천천히 갈게.', { slow: true });
      await X.wait(2.8);
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
        X.actor('v2', { x: 350, style: F.styles.villagerB, s: 134, flip: true }),
        /* the baker's husband, who came in chapter 7, beside her (no lines of his own here) */
        X.actor('v4', { x: 384, style: F.styles.baker, s: 140, lean: 0.1, flip: true, face: { old: true } }),
        X.actor('kid2', { x: 416, style: F.styles.kidB, s: 100, flip: true }),
        X.actor('v3', { x: 462, style: F.styles.villagerC, s: 142, flip: true }),
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
      /* the last question is the first one he ever heard on this quay: the four notes of 「천천히 와」, once, slowly.
         The mist starts to go as the fourth lamp answers */
      const pressed = X.seaLamp({ rounds: [[0, 1, 2, 3]], beat: 1.2, onRound: () => { if (S.sw) X.tween(S.sw, 'mist', 0, 2.6); } });
      const arrived = X.sail(boat, -74, 46);
      await pressed;
      /* the mist parts: one small boat, and someone in it with white hair */
      cloud.held = true;   /* she holds her lamp up for the boat, the way she always does */
      X.hush(); S.bedNow = null;   /* nothing now but the sea, until the first words */
      A.score('reunion');
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
      await X.wait(2.0);
      ana.laugh = true; ana.wet = 0.7;
      await TALK.say('ana', '…당신, 왜 이렇게 늙었어?');
      await X.wait(0.5);
      await TALK.say('leo', '같이 늙자며.', { slow: true });
      leo.wet = 0.6; ana.laugh = false; ana.wet = 0.85;
      await X.wait(0.8);
      await X.walk(ana, leo.x - 46, 34);
      await X.wait(0.8);
      await X.tap(() => [(ana.x + leo.x) / 2, PIER - 78, 56]);
      ana.z = 0; leo.z = 1;   /* he is nearer us: his face is the one we see, and the cap in his hand on her back */
      X.gesture(ana, 'sob-hug', { with: leo, hold: true, in: 1.4, out: 2.2, role: 'high' });   /* she sobs, bowed over him; his hand pats her back */
      await X.wait(1.4);
      T.announce('두 사람이 끌어안는다. 오래도록 아무 말이 없다.');
      bean.sit = 1;
      X.sail(boat, -1500, 20);   /* the boat that brought her goes back out into the mist */
      X.cam((ana.x + leo.x) / 2, 560, 1.95, 0.35);
      await X.wait(6.5);           /* the long quiet */
      A.theme({ voice: 'felt', vel: 0.36, beat: 0.74, left: true });
      /* the sobbing eases; they go on holding each other */
      X.gesture(ana, 'hug', { with: leo, hold: true, in: 2, out: 1.2, role: 'low' });
      X.ungesture(ana, 'sob-hug');
      /* the lullaby's first two bars are 「천천히 와」, the call: he speaks when it has been called */
      await X.wait(real(4.44));
      /* what he told her in the hospital, forty-five years ago, the other way round */
      await TALK.say('leo', '…천천히 왔네.', { slow: true });
      await TALK.say('ana', '천천히 오라며.');
      /* they lean back just far enough to see each other, and put their foreheads together */
      X.gesture(ana, 'forehead', { with: leo, hold: true, in: 1.8, out: 1.2, face: 'smileTears', partnerOpts: { face: 'smileTears' } });
      X.ungesture(ana, 'hug');
      await X.wait(1.2);
      await TALK.say('leo', '응.\n…고마워, 천천히 와 줘서.', { slow: true });
      await X.wait(0.8);
      await TALK.say('leo', '집 지어 놨어. 마당도 있어.\n스튜도 끓여 놨고.');
      /* he told her so in her dream, the third year; she woke up and thought it was a dream */
      await TALK.say('ana', '…꿈인 줄 알았는데.\n그 말, 진짜였네.', { slow: true });
      /* and it is what his own mother told him on this quay */
      await TALK.say('leo', '나도 몰랐어.\n와 보니까 정말 있더라.');
      await X.wait(0.6);

      /* ---- Bean has waited as long as anyone ---- */
      await X.ungesture(ana, 'forehead');
      leo.z = 0;
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
      [384, 418, 450, 480, 514].forEach((x, i) => X.walk(folk[i], x, 60).then(() => { folk[i].flip = true; }));   /* the neighbours step back up the quay */
      leo.flip = false; ana.wet = 0;
      bean.sit = 0; X.walk(bean, 112, 50).then(() => { bean.flip = false; bean.sit = 1; });
      ana.pose = (o) => { o.headTilt = 0.08; o.face.eye = 'open'; o.face.mouth = 'line'; };
      X.cam(180, 540, 1.4, 0.8);
      X.tween(S, 'closeIn', 1, 3);   /* the quay darkens a little round them: the little lamp is the light on her face */
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
      await X.gesture(ana, 'kneel', { with: cloud, hold: true, in: 1.4, out: 1.4 });
      X.gesture(ana, 'hand-on-head', { with: cloud, hold: true, in: 1.1, face: false, partnerOpts: { face: false } });   /* a hand on the hat */
      A.note({ m: 76, vel: 0.22, voice: 'glass', dur: 1.2 });
      await X.wait(1.4);
      await TALK.say('ana', '…이 모자, 어디서 났니?');
      await TALK.say('cloud', '몰라.\n처음부터 쓰고 있었어.');
      await X.wait(0.8);

      /* ---- what the hat remembers: a night fifty-one years ago ----
         she hummed the lullaby to the two of them; it plays the memory through, and its last bar carries her back */
      const mem = T.twins(), BEAT = 0.92;
      A.score('memory');
      const humAt = T.time + 1.2;   /* when its first note sounds, in the music's seconds */
      A.theme({ voice: 'hum', vel: 0.3, beat: BEAT, left: true, at: 1.2 });
      const humLast = humAt + BEAT * 21.21, humEnd = humAt + BEAT * 24.75;   /* its last bar, and its end (the last two bars slow down) */
      await X.view(mem, { color: '#f3ead8', out: 1.6, in: 2 });
      X.age('아나, 30');
      X.vcam(-30, 452, 1.05, 4);   /* the camera drifts in towards the two of them */
      T.announce('기억. 쉰한 해 전의 밤, 작은 침실. 배가 부른 아나가 레오와 침대 끝에 앉아 사진 한 장을 들여다본다. 탁자 위에는 똑같은 분홍 털모자 둘. 하나는 아직 바늘에 걸려 있다.');
      await X.wait(3.4);
      X.tween(mem.close, 'k', 1, 1.8, T.ease.io);
      X.vcam(-120, 380, 1.12, 2.4);   /* and in on the photograph as she holds it up */
      T.announce('초음파 사진. 까만 바탕에, 작은 아기 둘이 서로를 향해 웅크리고 있다.');
      await X.wait(2.4);
      X.tween(mem.shine, 'k', 1, 1.6);
      await TALK.say('ana', '둘이 사이좋게,\n서로 아껴 주고 지켜 주렴.', { slow: true });
      X.tween(mem.shine, 'k', 0, 1.2);
      X.vcam(-20, 470, 1.04, 2.2);   /* back to the two of them, laughing */
      await X.tween(mem.close, 'k', 0, 1.4, T.ease.io);
      X.tween(mem.belly, 'k', 1, 1.2, T.ease.io);
      X.tween(mem.lean, 'k', 1, 0.8);
      await TALK.say('leo', '…오늘만 열 번째야.');
      await TALK.say('ana', '날마다 할 거야.');
      X.vcam(-30, 452, 1.1, 5);
      await X.wait(Math.max(1.8, Math.min(6, real(humLast - T.time))));   /* until the tune comes to its last bar */
      await X.view(null, { color: '#f3ead8', out: 1.6, in: 1.8 });

      /* ---- back on the quay: the little one is looking up at her, head on one side ----
         the lullaby ends as the memory goes; a moment of nothing; then the child */
      A.score('reunion');
      X.cam(cloud.x - 24, 566, 2.2); X.camSnap();
      await X.wait(real(Math.max(1.5, Math.min(5, humEnd + 1.5 - T.time))));
      await TALK.say('cloud', '…아줌마 목소리, 알아.', { slow: true });
      A.motif({ voice: 'hum', vel: 0.24, beat: 0.9 });   /* what a child remembers of a song: how it calls */
      await TALK.say('cloud', '둘이 사이좋게,\n서로 아껴 주고 지켜 주렴.', { slow: true });
      /* the words she said over a photograph fifty-one years ago, said back to her: her hands go to her face */
      X.ungesture(ana, 'hand-on-head');
      X.gesture(ana, 'cry', { hands: 'both', hold: true, in: 1, out: 1.4 });
      await X.wait(2.8);
      /* and come down to the child's cheek; the little one leans into it, eyes closed */
      X.ungesture(ana, 'cry');
      X.gesture(ana, 'cheek', { with: cloud, hold: true, in: 1.5, out: 1.2, face: 'smileTears' });
      ana.wet = 0.9;
      await X.wait(1.4);
      await TALK.say('ana', '…릴리 동생이구나.\n우리 둘째.', { slow: true });
      /* the face she always pictured for her: so that is the face she has here */
      await TALK.say('ana', '…내가 늘 그려 보던 얼굴이네.', { slow: true });
      await X.wait(1);
      leo.wet = 0.5;
      /* he never saw her face; and the other hat, he never knew she had kept */
      await TALK.say('leo', '…얼굴도 못 보고 보냈는데.\n여기 와 있을 줄은 몰랐어.', { slow: true });
      await TALK.say('ana', '둘이 쓰라고 똑같이 두 개 떴었어.\n하나는… 당신 몰래 서랍에 넣어 두고.');
      await X.wait(0.6);
      /* who she is, said to her, plainly and gently */
      await TALK.say('ana', '너는 릴리랑 같이\n엄마 배 속에 있었어.');
      await TALK.say('ana', '그런데 세상에 나오기 전에,\n너 혼자 먼저 왔구나.', { slow: true });
      X.gesture(leo, 'kneel', { with: cloud, hold: true, in: 1.5, out: 1.3 });   /* he comes down to her height too */
      await X.wait(0.8);
      await TALK.say('leo', '…내가 오기 전부터,\n여기서 기다리고 있었구나.', { slow: true });
      await X.wait(0.6);
      /* what she has been asking since the year Bram went: and he said they would find it together */
      await TALK.say('cloud', '…그럼 내 약속은 뭐야?');
      await TALK.say('leo', '…찾았네.\n언니랑 서로 지켜 주는 거.');
      await TALK.say('leo', '…호수에서 릴리 옆에 있던 게,\n너였구나.', { slow: true });
      await TALK.say('ana', '릴리가 늘 그랬어.\n무서울 땐 누가 손 잡아 준다고.');
      await TALK.say('ana', '…네가 지켜 줬구나.', { slow: true });
      /* and with that, the promise she could not keep is kept: from here, all along */
      A.promise();
      T.announce('구름이에게 빛이 내려앉는다. 지키지 못한 약속이 지켜졌다. 등불 없는 하얀 배가 부두 끝으로 미끄러져 와서 기다린다.');
      X.ungesture(ana, 'cheek'); X.ungesture(leo, 'kneel');
      X.tween(S, 'closeIn', 0, 2.4);
      X.tween(cloud, 'kept', 1, 1.2).then(() => X.tween(cloud, 'kept', 0.25, 2.4));
      const white = X.boat({ x: -640, hull: '#e9e2d6', lamp: false, riders: [] });
      X.cam(70, 540, 1.5, 0.5);
      await X.sail(white, -74, 60);   /* it comes in slowly; nobody hurries this */
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
         at the boat, and then down, to where the ones who come are coming from. Wide: a small child, and all that cloud */
      cloud.z = 3; ana.flip = true;
      X.cam(40, 556, 1.6, 0.5);
      bean.sit = 0; X.walk(bean, 108, 34).then(() => { bean.flip = true; bean.sit = 1; });   /* Bean goes with her */
      await X.walk(cloud, 46, 40);
      cloud.flip = true; cloud.held = true;
      X.tween(cloud, 'still', 0, 1.1, T.ease.io);
      X.cam(30, 556, 1.1, 0.4);
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
      /* the first time he calls himself that to her: he goes down on one knee for it */
      X.gesture(leo, 'kneel', { with: cloud, hold: true, in: 1.5, out: 1.3 });
      await X.wait(0.6);
      await TALK.say('leo', '…아빠도 잘해.', { slow: true });
      await X.wait(0.6);
      await TALK.say('cloud', '언니 올 때까지,\n여기서 같이 기다릴래.');
      /* she sets her little lamp down on the boards, and Ana holds her */
      cloud.lamp = false; S.cLamp = cloud.x - 24;
      ana.z = 1; cloud.z = 2; leo.shoulder = true;
      await X.gesture(ana, 'hug', { with: cloud, hold: true, in: 1.3 });   /* Ana holds her, and she holds on */
      A.motif({ voice: 'box', vel: 0.34, beat: 0.74 });
      T.announce('아나가 아이를 꼭 끌어안는다. 레오가 아나의 어깨에 손을 얹는다. 빈 하얀 배가 안개 속으로 돌아간다.');
      /* the camera steps back: behind them the white boat goes back into the mist, empty. No star tonight */
      X.cam(ana.x - 190, 548, 1.6, 0.3);
      X.sail(white, -1500, 30);
      await X.wait(5.6);

      /* ---- home ---- */
      const homeWalk = (o, a) => {   /* Leo's hand in one of hers, the little one's in the other */
        if (a.hand) { const mx = (ana.x + leo.x) / 2; o.armF = { hand: F.local(o, mx, W.groundAt(mx) - 58) }; }
        if (cloud.hold) o.armB = { hand: F.local(o, (ana.x + cloud.x) / 2, W.groundAt(ana.x) - 44) };
      };
      await X.dip(async () => {
        S.actors = S.actors.filter((a) => !folk.includes(a)); S.boats = []; S.lampDown = null; S.cLamp = null;
        leo.go = ana.go = bean.go = cloud.go = null; leo.moving = ana.moving = bean.moving = cloud.moving = false;
        T.gesture.clear(ana); T.gesture.clear(cloud); T.gesture.clear(leo);
        ana.wet = 0; leo.shoulder = false; leo.smile = false; leo.wet = 0; S.closeIn = 0; A.score(null);
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
      await TALK.say('leo', '피피라는 꼬마랑 같이 키웠어.\n제일 먼저 얘기해 주기로 했거든.');
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
      await TALK.say('leo', '알아. 그래서 해마다 따라 끓였어.');
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
      /* the yarn he has been keeping for her, the way Rosa told him: knit it together when she comes, a story to a
         row. His stories are of up here; hers, row for row, are of the same days down below. It is also what he asked
         of her in her dream: tell me all of it, later */
      await TALK.say('leo', '당신 오면 같이 뜨려고\n실 모아 뒀어.');
      ana.look = true;
      await TALK.say('ana', '당신이 뜨개질을 해?');
      ana.look = false;
      await TALK.say('leo', '마흔다섯 해면 배워.\n한 줄에 이야기 하나씩 해 줄게.');
      ana.look = true;
      await TALK.say('ana', '그럼 한 줄씩 번갈아 뜨자.\n나도 저 아래 얘기 해 줄게.');
      ana.look = false;
      T.announce('이야기 담요, 둘이 뜨기. 레오가 그 일이 있었던 차례대로 실을 골라 한 줄을 뜨면, 아나가 다음 줄을 받아 뜨며 그 무렵 저 아래 이야기를 한다.');
      const told = [   /* hers, row for row: the other side of what he watched in the lake */
        async () => { await TALK.say('ana', '그해 처음 혼자 끓였어.\n…짰지.'); await TALK.say('leo', '알아. 봤어.'); },
        async () => { await TALK.say('ana', '그 별 보면서,\n당신 생각했어.', { slow: true }); },
        async () => { await TALK.say('ana', '그날 릴리가\n빈 목줄을 안고 잤어.'); },
        async () => { await TALK.say('ana', '릴리가 그러더라.\n아빠가 옆에 있었다고.', { slow: true }); await TALK.say('leo', '…응. 있었어.'); },
        async () => { await TALK.say('ana', '노라가 처음 웃던 밤,\n천장에 별이 돌았어.'); await TALK.say('leo', '…알아. 내가 달았어.'); },
        async () => { await TALK.say('ana', '그해 꿈에서 당신이 그랬지.\n아직은, 이라고.', { slow: true }); await TALK.say('leo', '…응. 그래서 이렇게 천천히 왔잖아.'); },
      ];
      await X.play(knitTwo({
        items: [{ name: '주춧돌', c: '#a9a39a', icon: 'stone' }, { name: '당신 소원', c: '#b8d88a', icon: 'firefly' }, { name: '빈이 온 날', c: '#f2ede4', icon: 'dog' },
          { name: '릴리 결혼식', c: '#f1b6c6', icon: 'bouquet' }, { name: '노라가 웃은 날', c: '#f3d36b', icon: 'mobile' }, { name: '아팠던 해', c: '#9fb4d8', icon: 'moon' }],
        order: [2, 5, 0, 4, 3, 1],
        tell: async (i) => { ana.look = true; await told[i](); ana.look = false; },
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
      /* and up in the sky, the last time: two small clouds, one holding the other's hand */
      S.pair = { x: 330, y: 270, s: 0.9, a: 0 };
      X.tween(S.pair, 'a', 1, 4.5);
      await X.wait(2.2);
      await TALK.say('all', '천천히 와.', { slow: true });
      X.bed(null);
      const tuneEnd = performance.now() + A.theme({ voice: 'box', vel: 0.36, beat: 0.66, left: true }) * 1000;
      await X.wait(3.2);
      /* and below, if the player wants: a letter of their own, which the wind takes up (letter.js) */
      if (T.letter) await T.letter.epilogue(X, { tuneEnd });
      X.end();
    },
  });
})();
