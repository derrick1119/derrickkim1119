/* Take Your Time — the stage the later chapters are played on.
   A chapter is a script: an async function handed a small toolbox (X). It places actors in the
   borrowed town, moves the camera, waits for the player's hand, cuts to other views (the lake,
   a dream), and ends on a card that leads to the next chapter. */
(function () {
  'use strict';
  const T = window.TYT, P = T.P, F = T.F, K = T.town;
  const TAU = Math.PI * 2;

  T.stage = function (name, def) {
    const S = (T.scenes[name] = { def, actors: [], boats: [], ps: null, camT: { x: 0, y: 0, z: 1 }, camK: 2, dip: { a: 0, color: '#fff6e6' }, cards: {}, yr: { a: 0, n: 0, from: 0, to: 0, age: 36, age0: 36, tick: null } });
    const TALK = T.talk(S);
    /* a name-and-age card ("로사의 아들, 72세") sits where the lines are written: a line waits until it has gone */
    const say0 = TALK.say;
    TALK.say = function () { const args = arguments; return S.ageHold ? S.ageHold.then(() => say0.apply(TALK, args)) : say0.apply(TALK, args); };
    const X = (S.X = { S, TALK, A: T.audio });
    const Wd = () => T.world;

    S.build = function () { T.scenes.harbor.build(); T.plot.build(); if (def.build) def.build(S); if (S.view && S.view.build) S.view.build(); };
    S.enter = function (args) {
      S.actors = []; S.boats = []; S.cross = null; S.spot = null; S.waitTap = null; S.waitAny = null; S.view = null; S.gest = null; S.paintG = null; S.sw = null; S.game = null; S.cardO = null; S.follow = null; S.drag0 = null;
      S.dip.a = 0; S.dip.color = '#fff6e6'; S.yr.a = 0; S.yr.tick = null;
      S.cards = { title: { a: 0 }, age: { a: 0, text: '' }, end: { a: 0 } }; S.tray = null; S.trayHold = false; S.ageHold = null;
      S.canNext = false; S.idle = 0; S.noteI = (def.chapter * 5) % T.audio.melodyLength; S.camK = 2;
      S.ps = T.plot.state(def.plot);
      Wd().borrow({ people: drawActors, plot: (g) => T.plot.draw(g, S.ps), beforeSea: drawBoats, screen: afterWorld, sky: (g) => { if (def.sky) def.sky(g, S); if (S.cross) crossSky(g, S.cross); }, flags: def.flags || {} });
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
    /* a shooting star across the sky of the screen: someone has crossed, and the living see it */
    X.star = function (o = {}) { const W = T.view.W; return T.fx && T.fx.star ? T.fx.star.add(Object.assign({ from: [W * 0.32, 70], to: [-W * 0.22, 380], dur: 1.8 }, o)) : Promise.resolve(); };
    /* ---------- a crossing ----------
       Someone has kept every promise, and goes the way Leo's mother went. Their boat, pulling away from the pier,
       sails on out over the cloud sea and gathers light; it lifts off the cloud, the boat and everyone in it go into
       the light, and one light rises; then it is a star, falling across the sky to the living world under the
       clouds. It all happens here, at the quay: whoever stays on the pier stays in the picture, waves, and looks up.
       riders: who is in the boat, used only if no boat is leaving yet (a white one is put at the pier's end for them).
       o: { boat (the one to go; else the one sailing out), hull, before, after (seconds), say(boat) }.
       leoAge, color and also were for the old landing at the falls of light, and are not needed any more. */
    function leaving() {
      const live = S.boats.filter((b) => !b.hidden && b.riders.some((a) => a.boat === b && !a.hidden));
      return live.find((b) => b.go && b.go.x < b.x) || live.sort((p, q) => p.x - q.x)[0] || null;
    }
    X.crossing = async function (riders, o = {}) {
      const k = S.clock, A = T.audio, W_ = Wd(), WC = W_.C;
      let b = o.boat || leaving();
      if (!b) {
        const crew = (riders || []).map((r, i) => X.actor('crossing' + i, Object.assign({ flip: true }, r)));
        b = X.boat({ x: -74, hull: o.hull || '#e9e2d6', lamp: false, riders: crew, alpha: 0 });
        k.tween(b, 'alpha', 1, 0.8);
        b.go = { x: -1500, v: 34, res: () => {} };
      }
      if (o.before) await X.wait(o.before);
      const v0 = b.go ? b.go.v || 60 : 30;
      if (b.go) { const r = b.go.res; b.go = null; r(); }   /* from here the crossing sails it */
      b.x = Math.max(b.x, -1000);
      const xL = T.clamp(b.x - 120, -720, -420);   /* where it leaves the cloud: well out, but where the quay can still see it */
      const C = (S.cross = { live: true, b, v: v0, xL, sailing: b.x > xL + 0.5, glow: 0, lift: 0, fade: 0, dusk: 0, look: 0, orb: null, motes: [], wisps: [], spawn: 0, r: T.rng(31 + Math.round(-b.x)) });
      /* the frame: the boat a fifth of the way in from the left, the sky above it, and everyone on the quay at the right */
      const stay = S.actors.filter((a) => !a.hidden && !a.boat && a.alpha > 0.05 && a.x > -60 && a.x < WC.QUAY + 200);
      const Wv = T.view.W, sxL = -0.2 * Wv, sxR = Wv / 2 - 90, xR = Math.max(WC.QUAY - 60, ...stay.map((a) => a.x));
      const z = T.clamp((sxR - sxL) / (xR - xL), 0.78, 1), camK0 = S.camK;
      X.cam(Math.max(xL - sxL / z, xR - sxR / z), WC.PIER_Y - 250 / z, z, 0.7);   /* if both will not fit, the quay wins */
      const wave = (q, a, t) => { q.armF = { a: 2.2 + Math.sin(t * 4 + a.x * 0.1) * 0.2, b: 0.3 }; };
      const waved = stay.filter((a) => !a.dog && !a.pose);
      waved.forEach((a) => { a.pose = wave; });
      /* out over the sea, the light gathering in it as it goes; the evening deepens round it */
      A.sfx('whoosh');
      k.tween(C, 'dusk', 1, 4.4, T.ease.io);
      k.tween(C, 'glow', 1, 2.8, T.ease.io);
      const t0 = k.t;
      while (C.sailing || k.t - t0 < 2.3) await k.wait(0.05);
      if (o.say) await o.say(b);
      /* it lets go of the cloud, and the boat and everyone in it go into the light */
      A.sfx('join'); A.note({ m: 76, vel: 0.2, voice: 'glass', dur: 3 });
      C.wisps = cloudWisps(C);
      k.tween(C, 'lift', 1, 2.6, T.ease.io);
      await k.wait(0.5);
      await k.tween(C, 'fade', 1, 1.4, T.ease.io);
      /* one light, rising, as she did */
      const p = glowAt(b), ct = S.camT;   /* it drifts a little in toward the middle of the sky as it goes up */
      const topY = ct.y + (T.view.H * 0.12 - 450) / ct.z, dx = T.clamp((ct.x - (Wv * 0.13) / ct.z - p[0]) * 0.8, 40, 120);
      C.orb = { x0: p[0], y0: p[1], tx: p[0] + dx, ty: topY, x: p[0], y: p[1], k: 0, a: 1 };
      b.hidden = true; b.riders.forEach((a) => { if (a.boat === b) a.hidden = true; });
      A.sfx('star', 0.3);
      k.tween(C, 'look', 1, 1.4, T.ease.io);
      await k.tween(C.orb, 'k', 1, 1.7, T.ease.in);
      /* and from the top of its rise, a star across the sky, down past the edge of the cloud */
      const from = W_.toScreen(C.orb.x, C.orb.y);
      T.announce('별 하나가 하늘을 가로질러, 구름 아래 산 사람들의 하늘로 떨어진다.');
      const star = T.fx && T.fx.star ? T.fx.star.add({ from, to: [-Wv / 2 - 40, 604], dur: 2.4, tail: 430, w: 4.2, bend: 0.1, note: 0.7 }) : Promise.resolve();
      k.tween(C.orb, 'a', 0, 0.3);
      X.notes(3, { voice: 'felt', vel: 0.32 });
      await star;
      C.orb = null; C.live = false;   /* what is left is afterglow: a cut to elsewhere takes it away */
      k.tween(C, 'look', 0, 2.4, T.ease.io);
      k.tween(C, 'dusk', 0, 4.2, T.ease.io).then(() => { if (S.cross === C) S.cross = null; });
      await X.wait(o.after == null ? 1 : o.after);
      waved.forEach((a) => { if (a.pose === wave) a.pose = null; });
      S.camK = camK0;
    };
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
    /* 구름이, who is always looking at the clouds. Unless placed elsewhere she sits on the crates at the land end of
       the pier with her face to the sky (a.look: she looks level instead; a.lamp: a little lamp in her hand) */
    X.cloudKid = function (o) {
      const c = X.actor('cloud', Object.assign({ x: 468, style: F.styles.cloud, s: 94, flip: true, chair: 1, chairH: 31 }, o));
      c.pose = (q, a, t) => {
        q.headTilt = a.look ? 0.04 : -0.38 + Math.sin(t * 0.5) * 0.04;
        if (!a.chair || a.moving) return;
        q.lean = -0.06;
        q.legF = { a: Math.PI / 2 - 0.1, b: Math.PI / 2 - 0.3 + Math.sin(t * 1.6) * 0.18 }; q.legB = { a: Math.PI / 2 - 0.2, b: Math.PI / 2 - 0.25 + Math.sin(t * 1.6 + 2) * 0.18 };
        if (!a.lamp) { q.armF = { a: -0.2, b: 0.2 }; q.armB = { a: -0.3, b: 0.2 }; }
      };
      return c;
    };
    /* 구름이 seeing someone off, as an actor for a place (X.crossing once put her on the landing at the falls with
       its o.also; a crossing now goes from the quay, where she already is) */
    X.seeOff = () => [{ id: 'cloud', style: F.styles.cloud, s: 100, at: 'landing', dx: -66, headTilt: -0.26, face: { mouth: 'smile' }, pose: (q, t) => { q.armF = { a: 2.2 + Math.sin(t * 4 + 2) * 0.22, b: 0.3 }; } }];
    /* gestures and idle life from the shared library (src/gestures.js): put on an actor, played on this chapter's
       clock, laid over whatever pose the actor already has. X.gesture(ana, 'hug', { with: leo, dur: 5 }) */
    X.gesture = (a, name, o) => T.gesture.play(a, name, Object.assign({ clock: S.clock }, o));
    X.ungesture = (a, name, alone) => T.gesture.stop(a, name, alone);
    X.idle = (a, on) => { a.idle = on == null ? true : on; };
    X.walk = function (a, x, v) { return new Promise((res) => { if (Math.abs(a.x - x) < 1) { res(); return; } if (a.go) a.go.res(); a.go = { x, v: v || 72, res }; }); };
    X.wait = (sec) => S.clock.wait(sec);
    X.tween = (o, key, to, dur, ease) => S.clock.tween(o, key, to, dur, ease);

    function boatY(b) { return Wd().surf(b.x) - 34 - (b.lift || 0); }   /* b.lift: off the cloud, crossing */
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
        const look = S.cross && !a.boat ? S.cross.look * 0.42 : 0;   /* he watches the light go up too */
        F.dog(g, { x, y: gy + 2 - (a.jump || 0), rot: a.rot != null ? a.rot : slope * 0.7, s: a.s, walk: a.moving ? a.ph : null, run: a.run || 0, sit: a.sit, flip: a.flip, wag: Math.sin(t * (a.wagRate || 10)) * (a.wag == null ? 1 : a.wag), headTilt: (a.headTilt || 0) - look });
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
      if (T.gesture && (a.idle || (a.gestures && a.gestures.length))) T.gesture.apply(o, a, t, { talking: !!(TALK.cur && TALK.cur.who === a.id && !TALK.cur.done) });
      if (S.cross) {   /* a crossing: those going are glad, and those staying look up after the light */
        const c = S.cross;
        if (a.boat === c.b && c.glow > 0.5) o.face = Object.assign({}, o.face, { eye: 'happy', mouth: 'smile' });
        else if (!a.boat && c.look > 0.01) o.headTilt = (o.headTilt || 0) - 0.3 * c.look;
      }
      if (a.armOver || o.armOver) o.skip = Object.assign({}, o.skip, { armF: true });
      a.lastO = o;   /* what it was drawn with: the other side of a two-person gesture reaches for these joints */
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
      list.forEach((a, i) => { a.drawN = i; });
      for (const a of list) { const o = drawOne(g, a, t); if (o && (a.armOver || o.armOver)) over.push([a, o]); }
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
      await S.clock.tween(a, 'hop', 0, 1.3, T.ease.io);   /* one careful step down into the boat */
      await S.clock.tween(a, 'stand', 0, 0.7, T.ease.io);
    };
    function drawBoats(g) {
      const t = T.time, W_ = Wd();
      for (const b of S.boats) {
        const al = (b.alpha == null ? 1 : b.alpha) * (1 - (b.fadeK || 0));
        if (b.hidden || al < 0.004) continue;
        const off = T.clamp((b.lift || 0) / 40);   /* off the cloud, the swell no longer rocks it */
        const y = boatY(b), tilt = (Math.atan2(W_.surf(b.x + 40) - W_.surf(b.x - 40), 80) * 0.7) * (1 - off) + Math.sin(t * 0.9 + b.x * 0.01) * 0.03;
        g.save(); g.globalAlpha *= al;
        g.save(); g.translate(b.x, y); g.rotate(tilt);
        if (b.big) K.bigBoat(g, 'back');
        else { P.line(g, 26, -8, 26, -92, 3.5, '#6f4a34'); if (b.lamp) { P.glow(g, 26, -98, 70, '#ffe6a0', 0.85); P.fill(g, P.rr(19, -108, 14, 18, 4), '#ffe9ae'); } }
        g.restore();
        for (const a of b.riders) if (a.boat === b && (a.hop || 0) < 0.4 && !a.hidden) drawOne(g, a, t);
        g.save(); g.translate(b.x, y); g.rotate(tilt);
        if (b.big) K.bigBoat(g, 'front');
        else {
          const hullP = P.soft([[-66, -22], [66, -22], [84, -30], [70, 4], [44, 16], [-44, 16], [-70, 4]]);
          const rgb = T.hex(b.hull), pale = rgb[0] + rgb[1] + rgb[2] > 620;
          if (pale) P.glow(g, 0, -6, 120, '#fff4dc', 0.4);   /* the white boat carries a little light of its own, so it shows on white cloud */
          P.fill(g, hullP, b.hull);
          if (pale) {
            g.save(); g.clip(hullP); P.fill(g, P.rr(-90, -2, 180, 30, 0), 'rgba(150,120,160,0.28)'); g.restore();   /* its belly in shadow */
            g.strokeStyle = 'rgba(120,96,130,0.55)'; g.lineWidth = 2.2; g.stroke(hullP);
          }
          P.fill(g, P.rr(-64, -24, 132, 7, 3), T.shade(b.hull, pale ? -0.12 : 0.18));
        }
        g.restore();
        g.restore();
      }
    }
    /* where the light of a crossing boat sits: about the middle of the people in it */
    function glowAt(b) { const y = boatY(b); return b.big ? [b.x + 6, y - 112] : [b.x + 6, y - 52]; }
    /* bits of the cloud it was resting in, let go as it lifts */
    function cloudWisps(C) {
      const b = C.b, r = C.r, w = b.big ? 170 : 74, y = boatY(b) + (b.big ? 14 : 12), out = [];
      for (let i = 0; i < 16; i++) out.push({ x: b.x + (r() * 2 - 1) * w, y: y + r() * 10, vx: (r() - 0.5) * 12, vy: 8 + r() * 14, rx: 12 + r() * 14, life: 0, max: 1.8 + r() * 1.2 });
      return out;
    }
    function crossUpdate(dt) {
      const C = S.cross, b = C.b, r = C.r;
      if (C.sailing) {   /* a breeze takes it out, and it slows as it comes to the place it will leave from */
        const d = b.x - C.xL;
        if (d <= 0.5) C.sailing = false;
        else {
          const want = T.clamp(Math.sqrt(2 * 60 * d) + 20, 20, 96);
          C.v += T.clamp(want - C.v, -60 * dt, 60 * dt);
          b.x -= Math.min(d, C.v * dt);
        }
      } else if (!b.hidden) { C.v += (12 + 12 * (1 - C.lift) - C.v) * Math.min(1, dt * 1.5); b.x -= C.v * dt; }   /* gliding on as it lifts */
      b.lift = 78 * C.lift + Math.sin(T.time * 1.6) * 3 * C.lift;
      b.fadeK = C.fade;
      /* light gathering: motes come in off the cloud to it; then sparks go up off it */
      if (!b.hidden) {
        C.spawn += dt * (6 + 18 * C.glow) * (C.fade < 0.95 ? 1 : 0);
        const c = glowAt(b), w = b.big ? 150 : 70;
        while (C.spawn >= 1) {
          C.spawn -= 1;
          if (C.lift < 0.3 && r() < 0.55) { const sx = b.x + (r() < 0.5 ? -1 : 1) * (w + 60 + r() * 220); C.motes.push({ kind: 'in', x0: sx, y0: Wd().surf(sx) + 6, x: sx, y: 0, t: 0, dur: 1.2 + r() * 0.8, r: 1.6 + r() * 1.6 }); }
          else C.motes.push({ kind: 'up', x: c[0] + (r() * 2 - 1) * w, y: c[1] + 20 + r() * (b.big ? 70 : 34), vx: (r() - 0.5) * 12, vy: -(34 + r() * 46), t: 0, dur: 1.3 + r() * 1.1, r: 1.6 + r() * 1.8 });
        }
        for (const m of C.motes) if (m.kind === 'in') {   /* each one homes in on the boat as it goes */
          const u = T.clamp(m.t / m.dur), e = T.ease.io(u);
          m.x = T.lerp(m.x0, c[0], e); m.y = T.lerp(m.y0, c[1], e) - Math.sin(u * Math.PI) * 70;
        }
      }
      for (let i = C.motes.length - 1; i >= 0; i--) {
        const m = C.motes[i]; m.t += dt;
        if (m.kind === 'up') { m.x += m.vx * dt; m.y += m.vy * dt; }
        if (m.t >= m.dur || (m.kind === 'in' && b.hidden)) C.motes.splice(i, 1);
      }
      for (const q of C.wisps) { q.life += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy *= 1 - dt * 0.6; q.rx += dt * 6; }
      if (C.orb) { const q = C.orb; q.x = T.lerp(q.x0, q.tx, T.smooth(q.k)); q.y = T.lerp(q.y0, q.ty, q.k); }
    }
    /* the sky deepens while they go, so that their light, and the star, are the brightest things in it (as at
       the end of chapter 1); by night it is dark already */
    function crossSky(g, C) {
      const W = T.view.W, t = T.time, d = T.ease.io(C.dusk) * (1 - (S.ps.night || 0));
      if (d < 0.004) return;
      const sk = g.createLinearGradient(0, 0, 0, 900);
      sk.addColorStop(0, '#1c2150'); sk.addColorStop(0.45, '#4a3f78'); sk.addColorStop(0.75, '#9c6f8e'); sk.addColorStop(1, '#d8a49a');
      g.save(); g.globalAlpha = 0.78 * d; g.fillStyle = sk; g.fillRect(-W / 2, 0, W, 900); g.restore();
      const r = T.rng(909);
      for (let i = 0; i < 64; i++) {
        const x = -W / 2 + r() * W, y = r() * 440, tw = 0.55 + 0.45 * Math.sin(t * (1 + r() * 2) + i);
        const a = d * tw * T.clamp((C.dusk - 0.25 - (i % 7) * 0.06) * 3) * (1 - y / 600);
        if (a > 0.01) { g.globalAlpha = a; P.fill(g, P.circle(x, y, 1.1 + (i % 5 === 0 ? 1 : 0)), '#fff6e0'); }
      }
      g.globalAlpha = 1;
    }
    /* over the world: the land dimmed with the sky, and the light of the boat, its sparks, and the one light it becomes */
    function crossLight(g, C) {
      const W = T.view.W, t = T.time, b = C.b, d = T.ease.io(C.dusk) * (1 - (S.ps.night || 0));
      if (d > 0.004) { g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = T.rgba('#5c5a92', 0.42 * d); g.fillRect(-W / 2, 0, W, 900); g.restore(); }
      Wd().layer(g, 1);
      const big = b.big ? 1.6 : 1, gl = C.glow, fd = C.fade;
      if (!b.hidden) {
        const c = glowAt(b), sea = Wd().surf(b.x) + 4, pool = gl * (1 - fd * 0.7);
        /* the cloud under it lit from above, the light going as the boat goes up */
        g.save(); g.translate(b.x, sea); g.scale(1, 0.26); P.glow(g, 0, 0, 280 * big, '#ffe6b8', 0.34 * pool); g.restore();
        P.glow(g, c[0], c[1], (130 + 70 * gl) * big * (1 - fd * 0.35), '#fff0c8', 0.22 + 0.36 * gl + 0.25 * fd);
        P.glow(g, c[0], c[1], (44 + 30 * fd) * big, '#ffffff', 0.25 * gl + 0.65 * fd);
        if (fd > 0.01) { g.save(); g.translate(c[0], c[1] + 12 * big); g.scale(1.7, 0.85); P.glow(g, 0, 0, 96 * big, '#fff6dc', 0.6 * T.smooth(fd)); g.restore(); }   /* washed in light as it goes */
      }
      /* the cloud it let go of */
      for (const q of C.wisps) {   /* soft puffs, thinning as they sink back */
        const u = q.life / q.max; if (u >= 1) continue;
        const a = 0.6 * Math.sin(Math.min(1, u * 3) * Math.PI / 2) * (1 - u);
        g.save(); g.translate(q.x, q.y); g.scale(1.5, 0.75);
        P.glow(g, 0, 0, q.rx * 1.6, '#fff6f0', a, 'source-over'); P.glow(g, q.rx * 0.5, -q.rx * 0.2, q.rx, '#ffffff', a * 0.7, 'source-over');
        g.restore();
      }
      for (const m of C.motes) {
        const u = m.t / m.dur, a = Math.sin(Math.min(1, u) * Math.PI) * (m.kind === 'in' ? 0.9 : 0.8);
        P.glow(g, m.x, m.y, m.r * 6, '#ffe9b0', 0.35 * a);
        g.globalAlpha = a; P.fill(g, P.circle(m.x, m.y, m.r), '#fff8e6'); g.globalAlpha = 1;
      }
      if (C.orb && C.orb.a > 0.01) {   /* one light: a soft halo, a white heart, a glint */
        const q = C.orb, a = q.a, pulse = 0.9 + 0.1 * Math.sin(t * 6);
        P.glow(g, q.x, q.y, 120 * pulse, '#fff0c0', 0.7 * a);
        P.glow(g, q.x, q.y, 30, '#ffffff', 0.95 * a);
        g.globalAlpha = a; P.fill(g, P.circle(q.x, q.y, 6), '#fffdf4');
        const sp = 16 + 5 * Math.sin(t * 9);
        g.strokeStyle = '#fffdf4'; g.lineWidth = 1.4; g.lineCap = 'round';
        g.beginPath(); g.moveTo(q.x - sp, q.y); g.lineTo(q.x + sp, q.y); g.moveTo(q.x, q.y - sp * 0.7); g.lineTo(q.x, q.y + sp * 0.7); g.stroke();
        g.globalAlpha = 1;
      }
      g.restore();
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
      if (s.rounds) X.play(T.puzzle.bell({ rounds: s.rounds, beat: s.beat, shuffle: s.shuffle, reverse: s.reverse })).then(open); else open();
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
    X.title = function () { const c = S.cards.title, k = S.clock; T.announce(def.title.join(', ')); return k.wait(0.5).then(() => k.tween(c, 'a', 1, 1.2)).then(() => k.wait(2.4)).then(() => k.tween(c, 'a', 0, 1.2)); };
    X.age = function (text) {
      const c = S.cards.age, k = S.clock;
      if (/, \d+$/.test(text)) text += '세';
      c.text = text; T.announce(text);
      const p = k.tween(c, 'a', 1, 1).then(() => k.wait(2.4)).then(() => k.tween(c, 'a', 0, 1));
      const hold = (S.ageHold = p.then(() => { if (S.ageHold === hold) S.ageHold = null; }));
      return p;
    };
    /* the years going by: the count of years since he came runs up from `from` to `to` over a sweep of seasons.
       o: { age: hers at the end, during(seconds): change the hill while it runs } */
    X.years = async function (from, to, o = {}) {
      const k = S.clock, y = S.yr;
      y.n = from; y.from = from; y.to = to; y.age = o.age || 36 + to; y.age0 = y.age - (to - from);
      T.announce(T.lang === 'en' ? `${to} ${to === 1 ? 'year' : 'years'} since he came. Ana is ${y.age}.` : `마중 나루에 온 지 ${to}년. 아나, ${y.age}.`);
      await k.tween(y, 'a', 1, 0.7);
      const dur = T.clamp((to - from) * 0.42, 1.5, 3.8);
      if (o.during) o.during(dur);
      let last = from;
      y.tick = () => { const n = Math.floor(y.n + 0.02); if (n > last) { last = n; T.audio.scaleStep(n % 14, { vel: 0.24, voice: 'box' }); } };
      await k.tween(y, 'n', to, dur, T.ease.io);
      y.tick(); y.tick = null;
      await k.wait(1.2);
      await k.tween(y, 'a', 0, 0.8);
    };
    function drawYears(g, y, W, t, dark) {
      const a = y.a, span = Math.max(1, y.to - y.from), u = T.clamp((y.n - y.from) / span);
      /* the seasons go round once a year, but never more than four times while we watch */
      const sp = (u * Math.min(span, 4) * 0.999) % 1, SEAS = ['#f7b9c8', '#9fcf86', '#e89a4e', '#ffffff'];
      const si = Math.floor(sp * 4) % 4, sc = T.mix(SEAS[si], SEAS[(si + 1) % 4], (sp * 4) % 1);
      g.save();
      g.fillStyle = T.rgba(dark ? T.mix('#1b2540', sc, 0.18) : T.mix('#fff6e6', sc, 0.42), 0.62 * a); g.fillRect(-W / 2, 0, W, 900);
      const r = T.rng(7);
      for (let i = 0; i < 80; i++) {
        const sx = r(), sy = r(), sz = 0.6 + r() * 0.9, ph = r() * 6.28;
        const x = -W / 2 - 40 + ((sx * W + t * 240 * sz + u * 1400) % (W + 80)), yy = -20 + ((sy * 900 + t * 110 * sz + Math.sin(t * 2 + ph) * 30) % 940);
        g.globalAlpha = a * 0.9; g.fillStyle = sc;
        g.beginPath(); g.ellipse(x, yy, 8 * sz, 4.4 * sz, t * 2 + ph, 0, TAU); g.fill();
      }
      g.restore();
      const ink = dark ? '#f1e8d6' : '#3d3a5c', halo = dark ? 'rgba(15,21,34,0.8)' : 'rgba(255,246,228,0.95)';
      g.save(); g.globalAlpha = a; const bk = g.createRadialGradient(0, 430, 40, 0, 430, 340); bk.addColorStop(0, dark ? 'rgba(20,28,48,0.75)' : 'rgba(255,248,234,0.9)'); bk.addColorStop(1, 'rgba(255,248,234,0)'); g.fillStyle = bk; g.fillRect(-360, 200, 720, 460); g.restore();
      P.text(g, '마중 나루에 온 지', 0, 292, { font: 'serif', size: 27, track: 8, color: ink, alpha: 0.85 * a, glow: halo });
      P.text(g, Math.round(y.n) + '년', 0, 440, { size: 196, color: ink, alpha: a, seed: 4, glow: halo });
      P.text(g, '아나, ' + Math.round(T.lerp(y.age0, y.age, u)) + '세', 0, 566, { font: 'serif', size: 42, track: 3, color: ink, alpha: 0.9 * a, glow: halo });
    }
    /* ---------- what a dream is made of ----------
       To go into someone's dream takes three things they know: a scent, a sound, and a light to find the way.
       They are given, one at a time, by the people he helps; the tray in the corner shows what he has. */
    const DREAM = ['scent', 'sound', 'light'];
    X.dreamHas = () => DREAM.every((k) => (T.state.dream || {})[k]);
    X.gift = async function (name, from) {
      const k = S.clock;
      T.state.dream = T.state.dream || {};
      S.tray = S.tray || { a: 0, fly: null };
      k.tween(S.tray, 'a', 1, 0.5);
      S.tray.fly = { name, x: from ? from[0] : 0, y: from ? from[1] : 450, k: 0 };
      T.audio.sfx('star', 0.7); T.audio.sfx('join');
      await k.tween(S.tray.fly, 'k', 1, 1.1, T.ease.io);
      T.state.dream[name] = true; S.tray.fly = null;
      T.audio.step(DREAM.indexOf(name) * 3 + 2, { voice: 'glass', vel: 0.4 });
      T.announce(T.lang === 'en' ? 'For a dream: ' + name + '.' : '꿈 재료: ' + { scent: '냄새', sound: '소리', light: '빛' }[name] + '.');
      await k.wait(1.8);
      if (!S.trayHold) k.tween(S.tray, 'a', 0, 0.8);
    };
    X.spendDream = function () { T.state.dream = {}; };

    function trayIcon(g, name, x, y, a, t) {
      g.save(); g.globalAlpha *= a; g.translate(x, y);
      if (name === 'scent') { P.fill(g, P.rr(-11, -6, 22, 22, 6), 'rgba(226,240,236,0.9)'); P.fill(g, P.rr(-9, -12, 18, 7, 3), '#b98a5a'); for (let i = 0; i < 3; i++) { const life = (t * 0.6 + i / 3) % 1; P.glow(g, Math.sin(t * 2 + i) * 4, -14 - life * 20, 5 + life * 6, '#fff3dc', Math.sin(life * Math.PI) * 0.8); } }
      else if (name === 'sound') { P.fill(g, P.soft([[-14, 8], [-10, -8], [0, -14], [10, -8], [14, 8]]), '#f2d6c9'); for (let i = 0; i < 4; i++) P.line(g, -10 + i * 7, 8, -2 + i * 1.5, -10, 1.2, '#c9a090'); P.fill(g, P.ellipse(16, -14, 4, 3, -0.3), '#5a4a6a'); P.line(g, 19, -14, 19, -26, 1.6, '#5a4a6a'); }
      else { P.glow(g, 0, 0, 22, '#d8ff9a', 0.6 + 0.3 * Math.sin(t * 5)); P.fill(g, P.circle(0, 0, 4), '#f4ffd6'); P.fill(g, P.ellipse(-5, -4, 5, 2.4, -0.6), 'rgba(255,255,255,0.6)'); }
      g.restore();
    }
    function drawTray(g, t) {
      const tr = S.tray, V = T.view;
      if (!tr || tr.a < 0.01) return;
      const x0 = -V.W / 2 + 70, y0 = 70, have = T.state.dream || {};
      g.save(); g.globalAlpha = tr.a;
      P.fill(g, P.rr(x0 - 34, y0 - 34, 196, 68, 34), 'rgba(20,26,44,0.5)');
      DREAM.forEach((n, i) => { const x = x0 + i * 64; P.fill(g, P.circle(x, y0, 24), 'rgba(243,234,216,0.16)'); if (have[n]) trayIcon(g, n, x, y0, 1, t); else { g.strokeStyle = 'rgba(243,234,216,0.4)'; g.setLineDash([4, 4]); g.lineWidth = 1.6; g.beginPath(); g.arc(x, y0, 18, 0, TAU); g.stroke(); g.setLineDash([]); } });
      if (tr.fly) { const f = tr.fly, i = DREAM.indexOf(f.name), k = T.ease.io(f.k); trayIcon(g, f.name, T.lerp(f.x, x0 + i * 64, k), T.lerp(f.y, y0, k) - Math.sin(k * Math.PI) * 80, 1, t); }
      g.restore();
    }
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
      if (S.cross && !S.cross.live) S.cross = null;
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
      if (S.yr.tick) S.yr.tick();
      T.gardenOn = !!(S.ps && (S.ps.patch || S.ps.site)) || !!(S.game && S.game.garden);
      T.rosaOut = S.actors.some((q) => q.id === 'rosa' && !q.hidden);
      if (S.game) S.game.update(dt);
      const W_ = Wd();
      for (const a of S.actors) {
        if (!a.go) continue;
        const d = a.go.x - a.x;
        const slope = a.boat ? 0 : Math.abs(W_.groundAt(a.x + 8) - W_.groundAt(a.x - 8)) / 16;
        const st = Math.sign(d) * Math.min(Math.abs(d), (a.go.v / (1 + slope * 0.9)) * dt);
        a.x += st; if (!a.keepFlip) a.flip = d < 0;
        a.ph += Math.abs(st) / (a.stride || (a.dog ? 18 * (a.s / 220) : 10 * (a.s / 150)));   /* a dog's legs, a calm walking pace */ a.moving = true;
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
      if (S.cross) crossUpdate(dt);
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
      if (S.cross) crossLight(g, S.cross);
      if (def.after) def.after(g, S);
    }
    S.draw = function (g) {
      const V = T.view, W = V.W, t = T.time;
      if (S.view) S.view.draw(g, t, S); else Wd().draw(g);
      /* invitations and hints */
      if (S.spot && !TALK.cur && !S.game && S.dip.a < 0.3) { const q = spotScreen(); P.beacon(g, q[0], q[1], q[2] * 0.8, t, 1, '#fff0c8'); }
      else if (S.sw && !S.sw.ok && !S.sw.asked && !S.view && !TALK.cur && S.dip.a < 0.3) { const q = lampSpot(); P.beacon(g, q[0], q[1], q[2] * 0.8, t, 1, '#fff0c8'); }
      const h = T.clamp((S.idle - 2.4) / 1.2) * (1 - S.dip.a);
      if (h > 0 && !TALK.cur) {
        if (S.gest && S.gest.hint) P.fingerHint(g, S.gest.hint(), (t * 0.5) % 1, h, S.gest.hintColor || '#fff6e0');
        else if (S.paintG) { const pts = []; for (let i = 0; i <= 20; i++) pts.push([-460 + i * 34, 220 + Math.sin(i * 0.5) * 56]); P.fingerHint(g, pts, (t * 0.33) % 1, h, '#c8ffe6'); }
      }
      const dark = S.ps.night > 0.5 || (S.view && S.view.dark);
      const ink = dark ? '#f1e8d6' : '#3d3a5c', ink2 = dark ? '#d9d2e4' : '#4a4468';
      if (S.yr.a > 0.01) drawYears(g, S.yr, W, t, dark);
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
      drawTray(g, t);
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
