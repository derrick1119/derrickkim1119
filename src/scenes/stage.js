/* Take Your Time — the stage the later chapters are played on.
   A chapter is a script: an async function handed a small toolbox (X). It places actors in the
   borrowed town, moves the camera, waits for the player's hand, cuts to other views (the lake,
   a dream), and ends on a card that leads to the next chapter. */
(function () {
  'use strict';
  const T = window.TYT, P = T.P, F = T.F, K = T.town;
  const TAU = Math.PI * 2;

  T.stage = function (name, def) {
    const S = (T.scenes[name] = { def, actors: [], boats: [], ps: null, camT: { x: 0, y: 0, z: 1 }, camK: 2, dip: { a: 0, color: '#fff6e6' }, cards: {} });
    const TALK = T.talk(S);
    const X = (S.X = { S, TALK, A: T.audio });
    const Wd = () => T.world;

    S.build = function () { T.scenes.harbor.build(); T.plot.build(); if (def.build) def.build(S); if (S.view && S.view.build) S.view.build(); };
    S.enter = function (args) {
      S.actors = []; S.boats = []; S.spot = null; S.waitTap = null; S.waitAny = null; S.view = null; S.gest = null; S.paintG = null; S.sw = null; S.game = null; S.cardO = null; S.follow = null; S.drag0 = null;
      S.dip.a = 0; S.dip.color = '#fff6e6';
      S.cards = { title: { a: 0 }, age: { a: 0, text: '' }, end: { a: 0 } };
      S.canNext = false; S.idle = 0; S.noteI = (def.chapter * 5) % T.audio.melodyLength; S.camK = 2;
      S.ps = T.plot.state(def.plot);
      Wd().borrow({ people: drawActors, plot: (g) => T.plot.draw(g, S.ps), beforeSea: drawBoats, screen: afterWorld, flags: def.flags || {} });
      S.cam = Wd().cam;
      T.state.chapter = def.chapter; T.state.cp = null;
      P.grainAmt = 0.15; P.vignette = 0.2; P.vignetteColor = '#4a3558';
      T.audio.ambience(0.3, 0.3, 0.15); S.bedNow = null; X.bed(def.pad == null ? 0 : def.pad, 0.12, def.mood);
      TALK.clear();
      Promise.resolve().then(() => def.script(X, args || {})).catch((e) => { T.report(e, name + ' script'); });
    };
    S.exit = function () { T.cursor('default'); if (def.exit) def.exit(S); };

    /* ---------- camera ---------- */
    X.cam = function (x, y, z, k) { const c = S.camT; c.x = x; c.y = y; c.z = z == null ? 1 : z; if (k) S.camK = k; S.follow = null; };
    X.camSnap = function () { if (S.follow) aim(); S.cam.x = S.camT.x; S.cam.y = S.camT.y; S.cam.z = S.camT.z; };
    X.follow = function (a, dx, k) { S.follow = { a, dx: dx || 0 }; S.camT.z = 1; if (k) S.camK = k; };
    X.place = {
      plot: () => [Wd().C.PLOT - 20, Wd().y3(Wd().C.PLOT) - 190],
      quay: () => [190, 452],
    };
    function aim() { const f = S.follow; if (f) { S.camT.x = f.a.x + f.dx; S.camT.y = Wd().groundAt(f.a.x) - 190; } }

    /* ---------- actors ---------- */
    X.actor = function (id, o) {
      const a = Object.assign({ id, x: 0, y: null, s: 150, style: F.styles.leoHome, flip: false, ph: 0, moving: false, alpha: 1, sit: 0, lamp: false, hidden: false, z: 0, lean: 0.04, face: {} }, o);
      S.actors.push(a);
      return a;
    };
    X.walk = function (a, x, v) { return new Promise((res) => { if (Math.abs(a.x - x) < 1) { res(); return; } if (a.go) a.go.res(); a.go = { x, v: v || 72, res }; }); };
    X.wait = (sec) => S.clock.wait(sec);
    X.tween = (o, key, to, dur, ease) => S.clock.tween(o, key, to, dur, ease);

    function boatY(b) { return Wd().surf(b.x) - 34; }
    function riderPos(a) {
      const b = a.boat, by = boatY(b), hh = a.dog ? 0 : F.hipHeight(a.style, a.s);
      const stand = T.ease.io(a.stand || 0), hp = T.ease.io(a.hop || 0);
      const deck = b.big ? 42 : 0;   /* the big boat rides higher */
      const x0 = b.x + a.seat, y0 = (a.dog ? by - 16 : by - 20 - stand * (hh - 30)) - deck;
      const PIER = Wd().C.PIER_Y;
      return { x: T.lerp(x0, a.landX == null ? x0 : a.landX, hp), y: T.lerp(y0, PIER - hh, hp) - Math.sin(hp * Math.PI) * 30, noLegs: stand < 0.3 && hp < 0.02 };
    }
    function drawOne(g, a, t) {
      const W_ = Wd();
      let x = a.x, gy = a.y != null ? a.y : W_.groundAt(a.x);
      if (a.dog) {
        if (a.boat) { const p = riderPos(a); x = p.x; gy = p.y; }
        g.save(); if (a.alpha < 1) g.globalAlpha = a.alpha;
        const slope = a.boat ? 0 : Math.atan2(W_.groundAt(x + 14) - W_.groundAt(x - 14), 28);
        F.dog(g, { x, y: gy + 2 - (a.jump || 0), rot: slope * 0.7, s: a.s, walk: a.moving ? a.ph : null, sit: a.sit, flip: a.flip, wag: Math.sin(t * (a.wagRate || 10)) * (a.wag == null ? 1 : a.wag), headTilt: a.headTilt || 0 });
        g.restore();
        return null;
      }
      const st = a.style, hh = F.hipHeight(st, a.s);
      let hipY = gy - hh * (1 - a.sit * 0.8), noLegs = false;
      if (a.chair) hipY = gy - (a.chairH || 30) - 12 * (a.s / 150);   /* on a seat, not the ground */
      if (a.boat) { const p = riderPos(a); x = p.x; hipY = p.y; noLegs = p.noLegs; }
      const o = { x, y: hipY, s: a.s, style: st, flip: a.flip, lean: a.lean, noLegs, face: Object.assign({ blush: 0.16, mouth: 'smile' }, a.face) };
      if (a.chair && !a.boat) o.sit = true;
      else if (a.sit > 0.02 && !a.boat) {
        const k = a.sit, kid = st.kid;
        o.legF = { foot: [T.lerp(1, kid ? 13 : 21, k), T.lerp(kid ? 29 : 49, kid ? 7 : 10, k)] };
        o.legB = { foot: [T.lerp(-1, kid ? 9 : 16, k), T.lerp(kid ? 29 : 49, kid ? 8 : 11, k)] };
        o.lean = a.lean - 0.14 * k; o.armF = { a: 0.75, b: 0.95 }; o.armB = { a: 0.7, b: 0.9 };
      } else if (a.moving || (a.boat && a.hop > 0.02 && a.hop < 0.98)) { o.walk = a.boat ? a.hop * 6 : a.ph; o.lean = a.lean + 0.06; }
      if (a.pose) a.pose(o, a, t);
      if (a.armOver) o.skip = Object.assign({}, o.skip, { armF: true });
      g.save(); if (a.alpha < 1) g.globalAlpha = a.alpha;
      const j = F.person(g, o);
      if (a.lamp) W_.handLamp(g, a.lampHand === 'F' ? j.handF : j.handB, 1);
      if (a.prop) a.prop(g, j, o, a, t);
      g.restore();
      a.j = j;
      return o;
    }
    function drawActors(g, h) {
      const t = T.time, W_ = Wd();
      const list = S.actors.filter((a) => !a.hidden && a.alpha > 0.01 && !(a.boat && (a.hop || 0) < 0.4) && (a.boat ? 1 : a.hill || W_.hillOf(a.x)) === h).sort((a, b) => a.z - b.z);
      const over = [];
      for (const a of list) { const o = drawOne(g, a, t); if (a.armOver && o) over.push([a, o]); }
      for (const q of over) { g.save(); if (q[0].alpha < 1) g.globalAlpha = q[0].alpha; F.person(g, Object.assign({}, q[1], { only: 'armF', skip: null })); g.restore(); }
      if (def.onHill) def.onHill(g, h, S);
    }

    /* ---------- boats ---------- */
    X.boat = function (o) {
      const b = Object.assign({ x: -900, hull: '#8a5a3b', lamp: true, riders: [], big: false, hidden: false }, o);
      S.boats.push(b);
      b.riders.forEach((a, i) => { a.boat = b; if (a.seat == null) a.seat = (b.big ? -66 : -14) + i * (b.big ? 100 : 26); a.hop = 0; a.stand = a.stand || 0; });
      return b;
    };
    X.sail = function (b, x, v) { return new Promise((res) => { b.go = { x, v: v || 60, res }; }); };
    X.land = async function (a, toX) {
      a.landX = toX;
      if (!a.dog) await S.clock.tween(a, 'stand', 1, 0.8, T.ease.io);
      await S.clock.tween(a, 'hop', 1, 1.0, T.ease.io);
      a.boat = null; a.x = toX; a.stand = 0; a.hop = 0;
    };
    /* stepping down into a moored boat */
    X.board = async function (a, b, seat) {
      a.seat = seat; a.landX = a.x; a.boat = b; a.hop = 1; a.stand = 1;
      if (!b.riders.includes(a)) b.riders.push(a);
      await S.clock.tween(a, 'hop', 0, 1.0, T.ease.io);
      await S.clock.tween(a, 'stand', 0, 0.7, T.ease.io);
    };
    function drawBoats(g) {
      const t = T.time, W_ = Wd();
      for (const b of S.boats) {
        if (b.hidden) continue;
        const y = boatY(b), tilt = Math.atan2(W_.surf(b.x + 40) - W_.surf(b.x - 40), 80) * 0.7 + Math.sin(t * 0.9 + b.x * 0.01) * 0.03;
        g.save(); g.translate(b.x, y); g.rotate(tilt);
        if (b.big) K.bigBoat(g, 'back');
        else { P.line(g, 26, -8, 26, -92, 3.5, '#6f4a34'); if (b.lamp) { P.glow(g, 26, -98, 70, '#ffe6a0', 0.85); P.fill(g, P.rr(19, -108, 14, 18, 4), '#ffe9ae'); } }
        g.restore();
        for (const a of b.riders) if (a.boat === b && (a.hop || 0) < 0.4 && !a.hidden) drawOne(g, a, t);
        g.save(); g.translate(b.x, y); g.rotate(tilt);
        if (b.big) K.bigBoat(g, 'front');
        else { P.fill(g, P.soft([[-66, -22], [66, -22], [84, -30], [70, 4], [44, 16], [-44, 16], [-70, 4]]), b.hull); P.fill(g, P.rr(-64, -24, 132, 7, 3), T.shade(b.hull, 0.18)); }
        g.restore();
      }
    }
    /* an unlit lamp out in the cloud sea: the boat waits in the mist before it. Resolves when the player has lit it */
    /* o: { rounds, beat }: once lit, the bell has a question for the lamps on the pier before anyone comes in */
    X.seaLamp = function (o) { return new Promise((res) => { S.sw = Object.assign({ x: Wd().C.SEA_LAMP, k: 0, ok: false, asked: false, mist: 1, res }, o || {}); Wd().S.lamps = [S.sw]; S.idle = 0; }); };
    function lightLamp() {
      const s = S.sw;
      if (!s || s.ok || s.asked) return;
      s.asked = true; S.idle = 0;
      S.clock.tween(s, 'k', 1, 0.8, T.ease.out);
      T.audio.sfx('join');
      const open = () => { s.ok = true; S.clock.tween(s, 'mist', 0, 1.2); X.notes(3); s.res(); };
      if (s.rounds) X.play(T.puzzle.bell({ rounds: s.rounds, beat: s.beat })).then(open); else open();
    }
    /* hand the scene to a puzzle until it is solved */
    X.play = async function (G) {
      S.game = G; S.idle = 0;
      if (G.quiet) T.audio.bed(null);
      await G.begin(S.clock);
      S.game = null; S.idle = 0;
      if (G.quiet && S.bedNow && !S.view) T.audio.bed(S.bedNow[0], S.bedNow[1], S.bedNow[2]);
    };
    const lampSpot = () => { const q = Wd().toScreen(S.sw.x + 24, Wd().surf(S.sw.x) - 96); return [q[0], q[1], 56 * S.cam.z]; };

    /* ---------- waiting for the player ---------- */
    /* spot: () => [x, y, r] in the world, or on the screen with { screen: true } */
    X.tap = function (spot, o) {
      return new Promise((res) => {
        S.spot = { fn: spot, screen: !!(o && o.screen) }; S.idle = 0;
        S.waitTap = () => { S.spot = null; S.waitTap = null; S.idle = 0; res(); };
      });
    };
    X.clearSpot = function () { S.spot = null; S.waitTap = null; };
    X.any = function () { return new Promise((res) => { S.waitAny = () => { S.waitAny = null; S.idle = 0; res(); }; }); };
    /* a pull in one direction. o: { axis:'x'|'y', sign, dist, on(p), hint: () => [[x,y],[x,y]] (screen) } */
    X.drag = function (o) { return new Promise((res) => { S.gest = Object.assign({ p: 0, res }, o); S.idle = 0; }); };
    function gestAdd(d) {
      const gq = S.gest;
      if (!gq) return;
      S.idle = 0;
      const before = gq.p;
      gq.p = T.clamp(gq.p + d / gq.dist);
      if (gq.on) gq.on(gq.p, before);
      if (gq.p >= 1) { S.gest = null; S.drag0 = null; gq.res(); }
    }
    /* painting light across the night sky. o: { goal, on(n) } */
    X.paint = function (o) { return new Promise((res) => { S.paintG = Object.assign({ len: 0, keyI: 0, res }, o); S.idle = 0; }); };
    function paintAt(x, y, fresh) {
      const pq = S.paintG, au = S.ps.aurora;
      if (!pq) return;
      y = Math.min(y, 330);
      const last = pq.last;
      if (last && !fresh) {
        const d = Math.hypot(x - last[0], y - last[1]);
        if (d < 13) return;
        const n = Math.min(12, Math.floor(d / 13));
        for (let i = 1; i <= n; i++) au.push([T.lerp(last[0], x, i / n), T.lerp(last[1], y, i / n)]);
        pq.len += d;
      } else au.push([x, y]);
      pq.last = [x, y];
      S.idle = 0;
      if (au.length > 460) au.splice(0, au.length - 460);
      const n = Math.floor(pq.len / 190);
      if (n > (pq.n || 0)) { pq.n = n; X.note({ voice: 'box', vel: 0.34 }); T.audio.sfx('star', (n * 0.31) % 1); }
      if (pq.len >= pq.goal) { S.paintG = null; S.drag0 = null; pq.res(); }
    }

    /* ---------- cards, cuts, sound ---------- */
    X.title = function () { const c = S.cards.title, k = S.clock; T.announce(def.title.join(', ')); return k.wait(0.8).then(() => k.tween(c, 'a', 1, 1.5)).then(() => k.wait(3)).then(() => k.tween(c, 'a', 0, 1.6)); };
    X.age = function (text) { const c = S.cards.age, k = S.clock; c.text = text; T.announce(text); return k.tween(c, 'a', 1, 1.2).then(() => k.wait(3.4)).then(() => k.tween(c, 'a', 0, 1.4)); };
    /* a page held up to read. draw(g, c) with c: { a, w, ready } */
    X.card = async function (draw, o = {}) {
      const k = S.clock, c = Object.assign({ a: 0, w: 0, ready: false }, o.init || {});
      S.cardO = { draw, c };
      T.audio.sfx('page');
      await k.tween(c, 'a', 1, 1.1, T.ease.out3);
      if (o.run) await o.run(c);
      c.ready = true;
      await Promise.race([X.any(), k.wait(o.max || 14)]);
      S.waitAny = null; c.ready = false;
      await k.tween(c, 'a', 0, 0.9, T.ease.io);
      S.cardO = null;
    };
    X.dip = async function (fn, o = {}) {
      const k = S.clock;
      S.dip.color = o.color || '#fff6e6';
      await k.tween(S.dip, 'a', 1, o.out || 1, T.ease.io);
      await fn();
      await k.wait(o.hold || 0.25);
      await k.tween(S.dip, 'a', 0, o.in || 1.2, T.ease.io);
    };
    /* the accompaniment: where in the tune, how loud, what kind of place. Views bring their own and hand it back */
    X.bed = function (i, level, mood) { if (i != null && !S.view) S.bedNow = [i, level, mood]; T.audio.bed(i, level, mood); };
    X.view = function (v, o) {
      return X.dip(() => {
        S.view = v; S.spot = null;
        if (v && v.enter) v.enter(S);
        if (v && v.quiet) T.audio.bed(null);
        else if (v && v.mood) T.audio.bed(v.chord == null ? 4 : v.chord, 0.13, v.mood);
        else if (!v && S.bedNow) T.audio.bed(S.bedNow[0], S.bedNow[1], S.bedNow[2]);
      }, o);
    };
    X.note = function (o) { T.audio.step(S.noteI++, Object.assign({ voice: 'box', vel: 0.38 }, o || {})); };
    X.notes = function (n, o) { for (let i = 0; i < n; i++) X.note(Object.assign({ at: 0.2 + i * 0.36 }, o || {})); };
    X.toll = function (i, vel) { T.audio.toll(i, vel); Wd().bell.k = 1; S.clock.tween(Wd().bell, 'k', 0, 3.2, T.ease.out); };
    X.end = async function () {
      const k = S.clock;
      T.announce(def.end.join('. '));
      await k.tween(S.cards.end, 'a', 1, 2, T.ease.io);
      S.canNext = true;
    };
    S.next = function () {
      if (!S.canNext || T.director.busy()) return;
      S.canNext = false;
      T.audio.pad(null);
      if (def.next) T.director.go(def.next, { style: 'fade', color: def.nextColor || '#fff6e6', out: 1.8, in: 1.6 });
      else {
        const st = T.state;
        Object.keys(st.done).forEach((id) => { st.done[id] = false; });
        st.count = 0; st.order = []; st.together = false; st.chapter = 0; st.cp = null;
        T.clearGame();   /* the story has been told: next time it starts from the beginning */
        T.director.go('room', { style: 'fade', color: '#161d2a', out: 1.8, in: 1.6, args: { title: true } });
      }
    };

    /* ---------- input ---------- */
    function spotScreen() {
      const q = S.spot.fn();
      if (S.spot.screen) return q;
      const s = Wd().toScreen(q[0], q[1]);
      return [s[0], s[1], q[2] * S.cam.z];
    }
    S.pointer = function (type, x, y) {
      if (type === 'down' && S.view && S.view.touch) S.view.touch(x, y);
      if (type === 'down' && TALK.tap()) return;
      if (S.game) { T.cursor('default'); S.game.pointer(type, x, y); return; }
      if (type === 'down' && S.waitAny) { S.waitAny(); return; }
      if (S.view && S.view.pointer && S.view.pointer(type, x, y) === true) return;   /* the view had something in hand */
      if (S.spot) {
        const q = spotScreen(), over = Math.hypot(x - q[0], y - q[1]) < q[2] + 26;
        T.cursor(over ? 'pointer' : 'default');
        if (type === 'down' && over && S.waitTap) S.waitTap();
        return;
      }
      if (S.cards.end.a > 0.5) { const o = S.canNext && Math.abs(x) < 190 && Math.abs(y - 792) < 44; T.cursor(o ? 'pointer' : 'default'); if (type === 'down' && o) S.next(); return; }
      if (S.sw && !S.sw.ok && !S.sw.asked && !S.view) {
        const q = lampSpot(), over = Math.hypot(x - q[0], y - q[1]) < q[2] + 26;
        T.cursor(over ? 'pointer' : 'default');
        if (type === 'down' && over) lightLamp();
        return;
      }
      if (S.gest || S.paintG) {
        T.cursor(S.paintG ? 'crosshair' : S.drag0 ? 'grabbing' : 'grab');
        if (type === 'down') { S.drag0 = [x, y]; S.idle = 0; if (S.paintG) paintAt(x, y, true); }
        else if (type === 'move' && S.drag0) {
          const dx = x - S.drag0[0], dy = y - S.drag0[1];
          S.drag0 = [x, y];
          if (S.paintG) paintAt(x, y);
          else if (S.gest) { const d = (S.gest.axis === 'x' ? dx : dy) * S.gest.sign; if (d > 0) gestAdd(d); }
        } else if (type === 'up') S.drag0 = null;
      } else { T.cursor('default'); if (type === 'up') S.drag0 = null; }
    };
    S.key = function (key) {
      const act = key === ' ' || key === 'Enter';
      if (act && TALK.tap()) return;
      if (S.game) return S.game.key(key);
      if (act && S.waitAny) { S.waitAny(); return; }
      if (!act && S.view && S.view.key && S.view.key(key) !== false) return;
      if (S.spot) { if (act && S.waitTap) S.waitTap(); else return false; return; }
      if (S.cards.end.a > 0.5) { if (act && S.canNext) S.next(); else return false; return; }
      if (S.view && S.view.key && S.view.key(key) !== false) return;
      if (S.sw && !S.sw.ok && !S.sw.asked) { if (act) lightLamp(); else return false; return; }
      if (S.gest) {
        const gk = S.gest.axis === 'x' ? (S.gest.sign > 0 ? 'ArrowRight' : 'ArrowLeft') : S.gest.sign > 0 ? 'ArrowDown' : 'ArrowUp';
        if (key === gk || act) gestAdd(S.gest.dist * 0.09); else return false;
        return;
      }
      if (S.paintG) {
        if (!act && !key.startsWith('Arrow')) return false;
        const pq = S.paintG; pq.keyI++;
        const u = (pq.keyI * 110) / 900, tri = Math.abs(((u + 1) % 2) - 1);
        paintAt(-480 + tri * 900, 210 + Math.sin(u * 5) * 60 + Math.floor(u) * 22, false);
        return;
      }
      return false;
    };
    /* what the scene is waiting for, in a word (tests drive the game with this) */
    S.want = function () {
      if (TALK.cur && TALK.cur.next) return 'talk';
      if (S.game) { const k = S.game.next(); return k ? 'key:' + k : null; }
      if (S.waitAny) return 'any';
      if (S.spot && S.waitTap) return 'tap';
      if (S.cards.end.a > 0.5) return S.canNext ? 'next' : null;
      if (S.view && S.view.want) { const w = S.view.want(); if (w) return w; }
      if (S.sw && !S.sw.ok && !S.sw.asked) return 'lamp';
      if (S.gest) return S.gest.axis === 'x' ? (S.gest.sign > 0 ? 'right' : 'left') : S.gest.sign > 0 ? 'down' : 'up';
      if (S.paintG) return 'paint';
      return null;
    };

    /* where on the screen the right move is just now (the tests click it) */
    S.hintAt = () => (S.game && S.game.hintAt ? S.game.hintAt() : S.view && S.view.hintAt ? S.view.hintAt() : null);
    S.update = function (dt) {
      S.idle += dt;
      if (S.game) S.game.update(dt);
      const W_ = Wd();
      for (const a of S.actors) {
        if (!a.go) continue;
        const d = a.go.x - a.x;
        const slope = a.boat ? 0 : Math.abs(W_.groundAt(a.x + 8) - W_.groundAt(a.x - 8)) / 16;
        const st = Math.sign(d) * Math.min(Math.abs(d), (a.go.v / (1 + slope * 0.9)) * dt);
        a.x += st; if (!a.keepFlip) a.flip = d < 0;
        a.ph += Math.abs(st) / (a.dog ? 5 : 10 * (a.s / 150)); a.moving = true;
        if (a.id === 'leo' && !S.view) { const n = Math.floor(a.ph / Math.PI); if (n !== a.stepN) { a.stepN = n; if (n % 2 === 0) T.audio.sfx('step'); } }
        if (Math.abs(a.go.x - a.x) < 0.5) { a.x = a.go.x; a.moving = false; const r = a.go.res; a.go = null; r(); }
      }
      for (const b of S.boats) {
        if (!b.go) continue;
        let lim = b.go.x;
        if (S.sw && !S.sw.ok && b.go.x > b.x && b.x < S.sw.x) lim = Math.min(lim, S.sw.x - 176);
        const d = lim - b.x;
        if (Math.abs(d) > 0.5) b.x += Math.sign(d) * Math.min(Math.abs(d), b.go.v * dt);
        if (Math.abs(b.go.x - b.x) < 0.6) { b.x = b.go.x; const r = b.go.res; b.go = null; r(); }
      }
      aim();
      const c = S.cam, t = S.camT, k = 1 - Math.exp(-dt * S.camK);
      c.x += (t.x - c.x) * k; c.y += (t.y - c.y) * k; c.z += (t.z - c.z) * k;
      if (S.view && S.view.update) S.view.update(dt, S);
      if (def.update) def.update(dt, S);
    };

    /* ---------- drawing ---------- */
    function afterWorld(g) {
      const ps = S.ps, n = ps.night, W = T.view.W;
      if (n > 0.01) {
        g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = T.mix('#ffffff', '#4a5794', n); g.fillRect(-W / 2, 0, W, 900); g.restore();
        T.plot.sky(g, ps);
        Wd().layer(g, 1); T.plot.glow(g, ps); g.restore();
      }
      if (def.after) def.after(g, S);
    }
    S.draw = function (g) {
      const V = T.view, W = V.W, t = T.time;
      if (S.view) S.view.draw(g, t, S); else Wd().draw(g);
      /* invitations and hints */
      if (S.spot && !TALK.cur && S.dip.a < 0.3) { const q = spotScreen(); P.beacon(g, q[0], q[1], q[2] * 0.8, t, 1, '#fff0c8'); }
      else if (S.sw && !S.sw.ok && !S.sw.asked && !S.view && !TALK.cur && S.dip.a < 0.3) { const q = lampSpot(); P.beacon(g, q[0], q[1], q[2] * 0.8, t, 1, '#fff0c8'); }
      const h = T.clamp((S.idle - 2.4) / 1.2) * (1 - S.dip.a);
      if (h > 0 && !TALK.cur) {
        if (S.gest && S.gest.hint) P.fingerHint(g, S.gest.hint(), (t * 0.5) % 1, h, S.gest.hintColor || '#fff6e0');
        else if (S.paintG) { const pts = []; for (let i = 0; i <= 20; i++) pts.push([-460 + i * 34, 220 + Math.sin(i * 0.5) * 56]); P.fingerHint(g, pts, (t * 0.33) % 1, h, '#c8ffe6'); }
      }
      const dark = S.ps.night > 0.5 || (S.view && S.view.dark);
      const ink = dark ? '#f1e8d6' : '#3d3a5c', ink2 = dark ? '#d9d2e4' : '#4a4468';
      if (S.cards.title.a > 0.01) {
        const a = S.cards.title.a;
        P.text(g, def.title[0], 0, 300, { font: 'serif', size: 26, track: 12, color: ink2, alpha: 0.8 * a });
        P.text(g, def.title[1], 0, 430, { size: def.title[1].length > 4 ? 124 : 150, color: ink, alpha: a, seed: 4 });
      }
      if (S.cards.age.a > 0.01) {
        const a = S.cards.age.a, x = -W / 2 + 96;
        P.text(g, S.cards.age.text, x, 792, { font: 'serif', size: 40, track: 3, color: dark || S.cards.age.light ? '#f1e8d6' : '#3d3a5c', alpha: a, align: 'left', glow: dark ? null : 'rgba(255,246,228,0.9)' });
        g.fillStyle = T.rgba(dark ? '#f1e8d6' : '#3d3a5c', 0.5 * a); g.fillRect(x + 2, 812, 150 * T.ease.out(a), 1.4);
      }
      if (S.cardO) { S.cardO.draw(g, S.cardO.c); if (S.cardO.c.ready) T.continueDot(g, 0, 866, '#f3ead8'); }
      if (S.game) { P.cray = P.look === 'crayon'; if (P.cray) P.crayonize(g); S.game.draw(g, t); P.cray = false; }
      TALK.draw(g);
      if (S.cards.end.a > 0.01) {
        const a = S.cards.end.a;
        if (def.endDim) { g.fillStyle = T.rgba('#0f1522', def.endDim * a); g.fillRect(-W / 2, 0, W, 900); }
        const c1 = def.endDim || dark ? '#d9d2e4' : '#4a4468', c2 = def.endDim || dark ? '#f7eeda' : '#3a3f5c';
        const halo = dark && !def.endDim ? 'rgba(15,21,34,0.8)' : null;   /* over a sky the player has painted */
        P.text(g, def.end[0], 0, 150, { font: 'serif', size: 22, track: 10, color: c1, alpha: 0.75 * a, glow: halo });
        if (def.endHand) P.text(g, def.end[1], 0, 300, { size: 150, color: c2, alpha: a, seed: 2, glow: 'rgba(255,214,150,0.3)' });
        else P.text(g, def.end[1], 0, 222, { font: 'serif', size: 46, track: 4, color: c2, alpha: a, glow: halo });
        if (def.end[2]) P.text(g, def.end[2], 0, def.endHand ? 372 : 276, { font: 'serif', size: 24, track: 11, color: c1, alpha: 0.8 * a });
        g.save(); g.globalAlpha = a; P.fill(g, P.rr(-150, 760, 300, 62, 31), def.endDim || dark ? 'rgba(243,234,216,0.16)' : 'rgba(58,63,92,0.78)'); g.restore();
        P.text(g, def.next ? '이어서 보기' : '처음으로 돌아가기', 0, 800, { font: 'serif', size: 26, color: '#fff6e4', alpha: a });
      }
      if (S.dip.a > 0.003) { g.fillStyle = T.rgba(S.dip.color, S.dip.a); g.fillRect(-W / 2, 0, W, V.H); }
    };
    return S;
  };

  /* two people holding each other. Call from both actors' pose with the same k (0..1). */
  T.embrace = function (o, me, other, k, front) {
    if (k <= 0.01) return;
    const hh = F.hipHeight(other.style, other.s), oy = (other.y != null ? other.y : T.world.groundAt(other.x)) - hh;
    const dir = other.x > me.x ? 1 : -1;
    o.lean = (o.lean || 0) + 0.1 * k; o.headTilt = (o.headTilt || 0) + 0.2 * k;
    o.face = Object.assign({}, o.face, { eye: k > 0.5 ? 'closed' : (o.face && o.face.eye) });
    const hx = T.lerp(me.x + dir * 10, other.x + dir * 12, k);
    o.armF = { hand: F.local(o, hx, T.lerp(oy - 20, oy - (front ? 40 : 46) * (other.s / 150), k) + Math.sin(T.time * 5) * 2 * k), bend: front ? 1 : undefined };
    o.armB = { hand: F.local(o, other.x + dir * 8, oy - 24 * (other.s / 150)) };
  };
})();
