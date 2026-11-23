/* Take Your Time — 물가의 손: someone walks home in the living world, and from the far bank of the mirror lake
   he clears the way without ever being seen.
   Above: the bank above the cloud sea at dusk. Leo walks along it, and a few things stand on it that can be
   moved: a lantern, a little cloud, a plank, Bean. Below: in the water, a rainy night street in the living world,
   where Lily (eleven, Bean's collar in her hand) walks home from the left. Whatever stands on the bank falls into
   her street at the same x: the lantern as a pool of light, the cloud as a dry patch under the rain, the plank as
   a way over a puddle, Bean as a white dog trotting at her side. Where the way ahead needs something, a badge
   says what; reach it unready and she stops and waits (afraid of the dark, huddled in the rain, at the edge of
   the water, or sad where Bean used to wait), and goes on as soon as it is there. Nothing is ever lost: things
   can be picked up again and carried ahead of her.

   T.lakeHelp(o) -> a view for X.view:
     o.level 1 | 2 | 3            a ready-made street (2 obstacles/2 helpers · 4/3 with two needs close together · 6/4 with one place needing two)
     o.who                        her look: an age (F.lilyAt), a style, or { style, s }; o.name for the captions (릴리); o.bag (a child's school bag)
     o.helpers  [{ kind: 'lantern'|'cloud'|'plank'|'bean', x }]   o.obstacles [{ x, need: kind | [kind, kind], w }] (street x, she starts at 120)
     o.len                        street length (home is at len - 150); o.caption the opening line; o.home: false (no one at the door) or a style
     o.homeS                      the size of the one at the door (a grown-up walker's own size; 188 when a child walks home)
     o.arrive                     the line when she gets there (릴리가 집에 왔어요)
     o.carry: 'basket'            a market basket in her hand instead of Bean's collar
     o.leo / o.leoAge             who walks the bank above her; o.speed her pace (1)
     o.friend                     a small one who walks the bank too, a little behind him: a style, or { style, s, beside }.
                                  When the walker stops afraid (in the dark, in the rain) she goes and stands over her, and a
                                  faint shadow of her stands beside the walker until it passes (beside: false — she only watches)
     V.start() · V.done() -> Promise (she is home) · V.star(opts) a shooting star in her sky · want() · hintAt()
     V.fright(on) before the start: she stands at the school gate afraid · V.call(): the friend may come to her then
     A need with no helper of its kind on the bank is dropped, so she can never be left waiting for ever. */
(function () {
  'use strict';
  const T = window.TYT, P = T.P, F = T.F, K = T.town;
  const TAU = Math.PI * 2;

  /* the frame: the bank, the water's edge, the picture in the water, her pavement */
  const BANK = 262, WATER = 300, PIC = 316, GROUND = 744, CLOUDY = BANK - 158;
  const KINDS = ['lantern', 'cloud', 'plank', 'bean'];
  const WIDTH = { lantern: 240, cloud: 240, plank: 140, bean: 70 };   /* how much of the street each need takes */
  const TOL = { lantern: 70, cloud: 80, plank: 36, bean: 60 };          /* how near its thing must stand */
  const SNAP = 56, STEP = 36;
  const NAME = { lantern: '등불', cloud: '구름', plank: '판자', bean: '빈' };
  const SAY = {
    lantern: '깜깜한 길이 무서워요. 등불을 그 위로 옮겨 주세요',
    cloud: '비가 너무 세요. 구름을 밀어 비를 가려 주세요',
    plank: '물웅덩이가 깊어요. 판자를 놓아 건너게 해 주세요',
    bean: '빈이 기다리던 자리예요. 빈을 그 위로 데려가 주세요',
    'lantern+cloud': '깜깜한 데다 비까지 와요. 등불과 구름을 함께 옮겨 주세요',
  };
  const LEVELS = {
    1: { len: 1900, helpers: [{ kind: 'lantern', x: 250 }, { kind: 'bean', x: 430 }], obstacles: [{ x: 760, need: 'lantern' }, { x: 1380, need: 'bean' }],
      caption: '물가의 것들을 옮기면, 그 그림자가 저 아래 길에 닿아요' },
    2: { len: 2650, helpers: [{ kind: 'cloud', x: 230 }, { kind: 'lantern', x: 380 }, { kind: 'plank', x: 530 }],
      obstacles: [{ x: 720, need: 'cloud' }, { x: 1200, need: 'lantern' }, { x: 1430, need: 'plank' }, { x: 2080, need: 'cloud' }],
      caption: '지나온 자리의 것은 다시 앞으로 옮길 수 있어요' },
    3: { len: 3520, helpers: [{ kind: 'lantern', x: 210 }, { kind: 'plank', x: 340 }, { kind: 'cloud', x: 470 }, { kind: 'bean', x: 600 }],
      obstacles: [{ x: 700, need: 'lantern' }, { x: 1100, need: 'plank' }, { x: 1660, need: ['lantern', 'cloud'] }, { x: 2200, need: 'bean' }, { x: 2620, need: 'plank' }, { x: 3060, need: 'lantern' }],
      caption: '두 가지가 한꺼번에 있어야 하는 곳도 있어요' },
  };
  const EN = {
    '등불': 'Lantern', '구름': 'Cloud', '판자': 'Plank', '빈': 'Bean', '릴리가 집에 왔어요': 'Lily is home',
    '물가의 것들을 옮기면, 그 그림자가 저 아래 길에 닿아요': 'Move the things on the bank, and their reflections fall on the street below',
    '지나온 자리의 것은 다시 앞으로 옮길 수 있어요': 'What she has passed can be carried ahead of her again',
    '두 가지가 한꺼번에 있어야 하는 곳도 있어요': 'Some places need two things at once',
    '깜깜한 길이 무서워요. 등불을 그 위로 옮겨 주세요': 'The dark street frightens her. Move the lantern over it',
    '비가 너무 세요. 구름을 밀어 비를 가려 주세요': 'The rain is too heavy. Push the cloud over to keep it off her',
    '물웅덩이가 깊어요. 판자를 놓아 건너게 해 주세요': 'The puddle is deep. Lay the plank so she can get across',
    '빈이 기다리던 자리예요. 빈을 그 위로 데려가 주세요': 'This is where Bean used to wait. Bring Bean over it',
    '깜깜한 데다 비까지 와요. 등불과 구름을 함께 옮겨 주세요': 'Dark, and raining too. Bring the lantern and the cloud together',
    '빈의 그림자가 릴리 곁을 따라 걸어요': "Bean's reflection walks along beside her",
    '끌어서 옮기거나, 숫자 키로 고르고 좌우 화살표로 옮겨요': 'Drag them, or pick one with a number key and move it with the arrow keys',
  };
  /* English for these lines, until they are in tools/make_i18n.py */
  const tr0 = T.tr;
  T.tr = function (s) { return T.lang === 'en' && typeof s === 'string' && EN[s] != null ? EN[s] : tr0(s); };

  /* ---------- small pictures of the four things: on the bank, as ghosts, and as badges ---------- */
  function cloudPuff(g, x, y, s, a, lit, shade) {
    g.save(); g.globalAlpha *= a;
    const B = [[-34, 4, 20], [-12, -8, 26], [14, -4, 24], [34, 6, 17], [0, 8, 22]];
    for (const q of B) P.fill(g, P.circle(x + q[0] * s, y + q[1] * s + 4 * s, q[2] * s), shade || '#c9a7c6');
    for (const q of B) P.fill(g, P.circle(x + q[0] * s - 2 * s, y + q[1] * s - 2 * s, q[2] * s * 0.9), lit || '#fff4e6');
    P.fill(g, P.circle(x - 6 * s, y - 12 * s, 12 * s), '#ffffff');
    g.restore();
  }
  function plankShape(g, x, y, len, a, tilt) {
    g.save(); g.globalAlpha *= a; g.translate(x, y); g.rotate(tilt || 0);
    P.fill(g, P.rr(-len / 2, -7, len, 13, 4), '#8a6440');
    P.fill(g, P.rr(-len / 2 + 2, -8, len - 4, 9, 4), '#b48658');
    g.fillStyle = 'rgba(255,236,206,0.35)'; g.fillRect(-len / 2 + 6, -7, len - 12, 2);
    g.strokeStyle = 'rgba(70,44,24,0.3)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-len / 2 + 10, -3); g.lineTo(len / 2 - 14, -4); g.stroke();
    [-len / 2 + 8, len / 2 - 8].forEach((nx) => P.fill(g, P.circle(nx, -4, 1.6), '#5a4030'));
    g.restore();
  }
  function icon(g, kind, x, y, s, t) {
    g.save(); g.translate(x, y); g.scale(s, s);
    if (kind === 'lantern') {
      P.glow(g, 0, 2, 26, '#ffd98a', 0.6);
      P.line(g, 0, -16, 0, -10, 2, '#433a4c');
      P.fill(g, P.poly([[-7, -8], [7, -8], [5, 8], [-5, 8]]), '#fff0b8');
      P.fill(g, P.poly([[-9, -7], [0, -14], [9, -7]]), '#433a4c'); P.fill(g, P.rr(-7, 7, 14, 3, 1.5), '#433a4c');
    } else if (kind === 'cloud') {
      cloudPuff(g, 0, 0, 0.42, 1, '#f6f2ff', '#a9a2d0');
      g.strokeStyle = '#a9c8ea'; g.lineWidth = 1.6; g.lineCap = 'round';
      for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-8 + i * 8, 14); g.lineTo(-10 + i * 8, 20); g.stroke(); }
    } else if (kind === 'plank') {
      plankShape(g, 0, 2, 38, 1, -0.15);
    } else {
      F.dog(g, { x: -2, y: 14, s: 86, sit: 1, wag: Math.sin(t * 8) * 0.6, flatLook: true });
    }
    g.restore();
  }

  /* ---------- the street in the living world: a deterministic row of houses, generated once ---------- */
  function street(len, seed, keep) {
    const r = T.rng(seed), out = [];
    const WALLS = ['#5d6690', '#6c5f86', '#536f84', '#7a6678', '#5b7096', '#6f6a8e'];
    for (let x = -1400; x < len + 1400;) {
      const w = 230 + r() * 120, kind = r() < 0.18 ? 'garden' : r() < 0.3 ? 'shop' : 'house';
      const clash = keep.find((q) => x < q[1] && x + w > q[0]);
      if (clash) { x = clash[1] + 30; continue; }   /* the school and her house stand there */
      const h = 196 + r() * 84, wins = [];
      const cols = Math.max(2, Math.floor(w / 92)), rows = h > 260 ? 2 : 1;
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) wins.push({ i, j, lit: r() < 0.55, warm: r() < 0.7 });
      out.push({ x, w, h, kind, c: WALLS[Math.floor(r() * WALLS.length)], roof: r() < 0.6 ? 'gable' : 'flat', cols, rows, wins, door: 0.2 + r() * 0.6, chim: r() < 0.5, seed: Math.floor(r() * 1e6) });
      x += w + 26 + r() * 50;
    }
    return out;
  }
  function roofs(seed) {
    const r = T.rng(seed), out = [];
    for (let i = 0; i < 70; i++) out.push({ x: i * 150 + r() * 60, w: 110 + r() * 90, h: 40 + r() * 90, chim: r() < 0.5, win: r() < 0.6 ? [r(), r()] : null });
    return out;
  }

  T.lakeHelp = function (o = {}) {
    const lv = LEVELS[o.level] || LEVELS[1];
    const LEN = o.len || lv.len, HOME = LEN - 150;
    const V = { dark: true, mood: 'still', chord: 2, level: o.level || 1, started: false, finished: false, res: null, camX: 0, idle: 0, said: '', amp: 0, rip: [], spark: [] };
    V.promise = new Promise((res) => { V.res = res; });
    V.sky = T.fx && T.fx.stars ? T.fx.stars() : null;   /* her own night sky, inside the water */

    /* who is walking home */
    let who = o.who, wst, ws = null;
    if (typeof who === 'number') wst = F.lilyAt(who);
    else if (who && who.skin) wst = who;
    else if (who && who.style) { wst = who.style; ws = who.s || null; }
    else wst = F.lilyAt(11);
    ws = ws || (wst.kid ? 160 : 188);   /* a child comes up to a grown-up's chest; a grown-up is the size of the one at the door */
    const NAME_ = o.name || '릴리', named = (s) => (NAME_ === '릴리' ? s : s.replace(/릴리/g, NAME_));
    const BAG = o.bag == null ? !!wst.kid : !!o.bag;
    const L = (V.lily = { x: o.startX || 120, ph: 0, v: 66, moving: false, wait: 0, mood: 'walk', relief: 0, home: 0, hop: 0, style: wst, s: ws });
    const homeWho = o.home === false ? null : o.home && o.home.skin ? o.home : F.anaAt(41);
    /* the one at the door is drawn to the same scale as the one coming home: a child comes up to her chest */
    const homeS = o.homeS || (wst.kid ? 188 : ws), ARRIVE = o.arrive || named('릴리가 집에 왔어요'), CARRY = o.carry || null;
    const leo = { x: L.x - 110, ph: 0, moving: false, style: o.leo || F.leoAt(o.leoAge == null ? 1 : o.leoAge) };
    const fo = o.friend, fr = (V.friend = fo ? { x: L.x - 190, ph: 0, moving: false, flip: false, near: 0, come: false, style: fo.skin ? fo : fo.style, s: (!fo.skin && fo.s) || 104, beside: fo.skin ? true : fo.beside !== false } : null);
    V.fright = function (on) { L.hold = !!on; };
    V.call = function () { if (fr) fr.come = true; };
    /* the friend keeps a little behind him; when the one in the water is afraid, she goes and stands over her */
    function friendStep(dt) {
      if (!fr) return;
      const afraid = fr.beside && !V.finished && (V.started || fr.come) && (L.mood === 'scared' || L.mood === 'huddle');
      const want = afraid ? L.x + 6 : leo.x - 72, d = want - fr.x;
      const st = Math.sign(d) * Math.min(Math.abs(d), (afraid ? 170 : Math.max(46, Math.abs(d) * 1.5)) * dt);
      fr.moving = Math.abs(d) > 1.5; fr.x += st; if (Math.abs(st) > 0.05) fr.flip = st < 0;
      fr.ph += Math.abs(st) / (10 * (fr.s / 150));
      fr.near += ((afraid && Math.abs(d) < 30 ? 1 : 0) - fr.near) * Math.min(1, dt * 1.8);
    }

    const helpers = (V.helpers = (o.helpers || lv.helpers).map((h, i) => ({ kind: h.kind, x: h.x, i, go: null, ph: 0, flip: false, held: false, run: 0, lift: 0, pop: 0, seen: 0 })));
    /* a need with nothing on the bank to meet it would leave her waiting for ever: such needs are dropped */
    const obs = (V.obstacles = (o.obstacles || lv.obstacles).map((q) => {
      const needs = (Array.isArray(q.need) ? q.need : [q.need]).filter((k) => KINDS.includes(k) && helpers.some((h) => h.kind === k));
      return { x: q.x, needs, w: q.w || Math.max(0, ...needs.map((k) => WIDTH[k])), passed: false, metK: 0, waited: 0 };
    }).filter((q) => q.needs.length).sort((a, b) => a.x - b.x));
    const SCHOOL = -470;
    const houses = street(LEN, (o.seed || 7) + V.level * 13, [[SCHOOL - 20, SCHOOL + 480], [HOME - 130, HOME + 210]]), far = roofs(31 + V.level);
    const lamps = [];
    for (let x = -300; x < LEN + 900; x += 400) { const inDark = obs.some((q) => q.needs.includes('lantern') && Math.abs(x - q.x) < q.w / 2 + 80); if (!inDark) lamps.push(x); }
    obs.forEach((q) => { if (q.needs.includes('lantern')) lamps.push(q.x); });
    let sel = -1, held = -1, dragDx = 0, moved = false, ptrX = 0, cursor = 'default';

    /* ---------- rules ---------- */
    const camL = () => V.camX - T.view.W / 2 + 50, camR = () => V.camX + T.view.W / 2 - 50;
    const clampX = (x) => T.clamp(x, camL(), camR());
    const bean = () => helpers.find((h) => h.kind === 'bean');
    const near = (h, q) => Math.abs(h.x - q.x) <= TOL[h.kind];
    function has(q, k) {
      if (k === 'bean') { const b = bean(); if (b && b.run > 0) return true; }
      return helpers.some((h) => h.kind === k && near(h, q));
    }
    const met = (q) => q.needs.every((k) => has(q, k));
    const nextObs = () => obs.find((q) => !q.passed) || null;
    const entryOf = (q) => (q.needs.length === 1 && q.needs[0] === 'bean' ? q.x - 26 : q.x - q.w / 2 - 16);
    /* the next thing worth doing, and which helper should do it */
    function nextNeed() {
      if (!V.started || V.finished) return null;
      for (let oi = 0; oi < obs.length; oi++) {
        const q = obs[oi];
        if (q.passed) continue;
        for (const k of q.needs) {
          if (has(q, k)) continue;
          let best = -1, bd = 1e9;
          helpers.forEach((h, i) => {
            if (h.kind !== k || (k === 'bean' && h.run > 0)) return;
            const busy = obs.some((p, pi) => pi < oi && !p.passed && p.needs.includes(k) && near(h, p));   /* still needed where it is */
            if (busy) return;
            const d = Math.abs(h.x - q.x);
            if (d < bd) { bd = d; best = i; }
          });
          if (best >= 0) return { q, k, h: best, tx: q.x };
        }
      }
      return null;
    }
    /* a thing let go near a place that wants it settles there */
    function settle(h, from) {
      let best = null, bd = 1e9;
      for (const q of obs) {
        if (q.passed || !q.needs.includes(h.kind)) continue;
        const d = Math.abs(h.x - q.x);
        if (from != null) {   /* moved by a key: only onto a place it is heading for, never back onto the one it left */
          const dir = Math.sign(h.x - from), d0 = (q.x - from) * dir, d1 = (q.x - h.x) * dir;
          if (!(d0 > 1 && d1 < 20)) continue;
        } else if (d > SNAP) continue;
        if (d < bd) { bd = d; best = q; }
      }
      if (!best || Math.abs(h.x - best.x) < 0.5) return;
      h.x = best.x; h.go = null; h.pop = 1;
      if (T.audio) { T.audio.sfx('join'); T.audio.step(KINDS.indexOf(h.kind) * 2 + 3, { voice: 'glass', vel: 0.34 }); }
    }
    function pick(i) {
      if (i < 0 || i >= helpers.length) return;
      sel = i; V.idle = 0;
      const h = helpers[i];
      if (h.kind === 'bean' && h.run > 0) h.run = 0;   /* picked up while walking with her: he comes back to the bank */
      if (T.audio) T.audio.sfx('step');
    }
    function nudge(dir) {
      const h = helpers[sel];
      if (!h) return;
      if (h.kind === 'bean' && h.run > 0) h.run = 0;
      const from = h.x;
      h.go = null; h.flip = dir < 0; h.x = clampX(h.x + dir * STEP); h.ph += 1.8; V.idle = 0;
      if (h.x !== from) settle(h, from);
    }

    /* ---------- the view's side of things ---------- */
    V.start = function () {
      if (V.started) return;
      V.started = true; V.idle = 0; V.t0 = 0; V.rh = { live: true };   /* (V.rh: the test menu's solver looks for it) */
    };
    V.done = function () { V.start(); return V.promise; };
    V.enter = function (S) { V.S = S; snapCam(); };
    function camTarget() { const W = T.view.W; return Math.min(L.x + W * 0.16, LEN + 120 - W / 2); }
    function snapCam() { V.camX = camTarget(); }
    snapCam();
    /* a star across her sky, behind the roofs: screen coordinates; the open sky is about y = PIC (316) to 420 */
    V.star = function (so = {}) { if (!V.sky) return Promise.resolve(); const W = T.view.W; return V.sky.add(Object.assign({ from: [W * 0.42, PIC + 26], to: [-W * 0.3, PIC + 104], dur: 1.8, tail: 300, bend: 0.03 }, so)); };

    V.touch = function (x, y) {
      if (y < WATER + 10) return;
      V.rip.push({ x, y, t: T.time }); if (V.rip.length > 6) V.rip.shift();
      V.amp = Math.min(1, V.amp + 0.5);
    };
    function hitHelper(x, y) {
      if (y > WATER + 24) return -1;
      let best = -1, bd = 1e9;
      helpers.forEach((h, i) => {
        const c = anchorBank(h), dx = Math.abs(x - (h.x - V.camX)), dy = Math.abs(y - c);
        if (dx < 62 && dy < 74) { const d = dx + dy * 0.6; if (d < bd) { bd = d; best = i; } }
      });
      return best;
    }
    V.pointer = function (type, x, y) {
      if (!V.started || V.finished) return false;
      if (type === 'down') {
        const i = hitHelper(x, y);
        if (i >= 0) { pick(i); held = i; dragDx = helpers[i].x - (x + V.camX); moved = false; ptrX = x; helpers[i].go = null; helpers[i].held = true; }
        else if (sel >= 0) { const h = helpers[sel]; if (h.kind === 'bean') h.run = 0; h.go = clampX(x + V.camX); V.idle = 0; }   /* picked up with one tap, sent with the next */
      } else if (type === 'move') {
        if (held >= 0) { ptrX = x; const h = helpers[held], nx = clampX(x + V.camX + dragDx); if (Math.abs(nx - h.x) > 0.5) { h.flip = nx < h.x; h.ph += Math.abs(nx - h.x) / 9; h.x = nx; moved = true; V.idle = 0; } }
        cursor = held >= 0 ? 'grabbing' : hitHelper(x, y) >= 0 ? 'grab' : sel >= 0 && y > 120 ? 'pointer' : 'default';
        T.cursor(cursor);
      } else if (type === 'up' && held >= 0) {
        const h = helpers[held]; h.held = false; held = -1;
        if (moved) settle(h);
      }
      return true;
    };
    V.key = function (key) {
      if (!V.started || V.finished) return false;
      if (key >= '1' && key <= String(helpers.length)) { pick(+key - 1); return true; }
      if ((key === 'ArrowLeft' || key === 'ArrowRight') && sel >= 0) { nudge(key === 'ArrowLeft' ? -1 : 1); return true; }
      return false;
    };
    V.want = function () {
      if (!V.started || V.finished) return null;
      const n = nextNeed();
      if (!n) return 'busy';
      if (sel !== n.h) return 'key:' + (n.h + 1);
      const h = helpers[n.h], d = n.tx - h.x;
      if (Math.abs(d) < 1) return 'busy';
      if ((d > 0 && h.x >= camR() - 0.5) || (d < 0 && h.x <= camL() + 0.5)) return 'busy';   /* as far as it goes for now */
      return 'key:' + (d < 0 ? 'ArrowLeft' : 'ArrowRight');
    };
    V.hintAt = function () {
      const n = nextNeed();
      if (!n) return null;
      const h = helpers[n.h];
      if (sel !== n.h) return [h.x - V.camX, anchorBank(h)];
      if (h.go != null) return null;
      return [clampX(n.tx) - V.camX, WATER + 70];
    };

    /* ---------- time passing ---------- */
    V.update = function (dt, S) {
      V.idle += dt; V.amp = Math.max(0, V.amp - dt * 0.5);
      if (V.sky) V.sky.update(dt);
      for (const h of helpers) {
        h.pop = Math.max(0, h.pop - dt * 1.8);
        h.lift += ((h.held || h.go != null ? 1 : 0) - h.lift) * Math.min(1, dt * 10);
        if (held >= 0 && helpers[held] === h) { const nx = clampX(ptrX + V.camX + dragDx); if (nx !== h.x) { h.ph += Math.abs(nx - h.x) / 9; h.x = nx; } }
        else if (h.go != null) {
          const d = h.go - h.x, st = Math.sign(d) * Math.min(Math.abs(d), 620 * dt);
          h.x += st; h.ph += Math.abs(st) / 9; if (st) h.flip = st < 0;
          if (Math.abs(h.go - h.x) < 0.5) { h.x = h.go; h.go = null; settle(h); }
        } else if (!(h.kind === 'bean' && h.run > 0)) {
          /* the edge of the picture nudges along whatever it reaches */
          const cx = clampX(h.x); if (cx !== h.x) { h.ph += Math.abs(cx - h.x) / 9; h.flip = cx < h.x; h.x = cx; }
        }
      }
      /* things left behind at that edge make room for each other instead of piling up */
      const spare = helpers.filter((h) => !h.held && h.go == null && !(h.run > 0) && h.x < camL() + 240 && !obs.some((q) => !q.passed && q.needs.includes(h.kind) && near(h, q))).sort((a, b) => a.x - b.x);
      for (let i = 1; i < spare.length; i++) if (spare[i].x < spare[i - 1].x + 70) { const nx = spare[i - 1].x + 70; spare[i].ph += (nx - spare[i].x) / 9; spare[i].x = nx; }
      if (!V.started) { L.mood = L.hold ? 'scared' : 'walk'; friendStep(dt); V.camX += (camTarget() - V.camX) * Math.min(1, dt * 3); return; }
      if (V.finished) { L.home = Math.min(1, L.home + dt / 2.4); L.moving = false; leo.moving = false; friendStep(dt); return; }
      /* where she may walk to */
      let q = nextObs();
      while (q && L.x > q.x + q.w / 2 + 4) { q.passed = true; q = nextObs(); }
      const b = bean();
      let limit = HOME - 46;   /* she stops just short of the door, beside whoever is waiting in it */
      if (q && !met(q)) limit = Math.max(L.x, entryOf(q));
      /* Bean comes to her where he used to wait, and walks along with her a while */
      if (q && b && b.run <= 0 && q.needs.includes('bean') && near(b, q) && L.x >= entryOf(q) - 30) {
        b.run = 380; b.held = false; if (held >= 0 && helpers[held] === b) held = -1; b.go = null;
        if (T.audio) { T.audio.sfx('bark', 0.4); T.audio.step(7, { voice: 'glass', vel: 0.36 }); }
        burst(L.x + 40, GROUND - 40, '#fff6e6');
      }
      const happy = b && b.run > 0;
      const v = L.v * (happy ? 1.12 : 1) * (o.speed || 1);
      const step = Math.max(0, Math.min(v * dt, limit - L.x));
      const was = L.moving;
      L.moving = step > 0.01;
      L.x += step; L.ph += step / (10 * (L.s / 150));
      if (L.moving) { L.wait = 0; if (q) q.waited = 0; } else if (q) { L.wait += dt; q.waited += dt; }
      if (!was && L.moving && L.stopQ) { L.relief = 1; burst(L.x, GROUND - 150, '#fff0c8'); if (T.audio) T.audio.sfx('star', 0.6); L.stopQ = null; }
      if (!L.moving && q && !met(q)) L.stopQ = q;
      L.relief = Math.max(0, L.relief - dt * 0.8);
      if (b && b.run > 0) { b.run -= step; b.x = L.x + 52; b.ph += step / 5; b.flip = false; if (b.run <= 0) { b.run = 0; burst(b.x, GROUND - 30, '#ffffff'); } }
      obs.forEach((p) => { p.metK += ((met(p) || p.passed ? 1 : 0) - p.metK) * Math.min(1, dt * 3); });
      /* Leo keeps pace above her, a little behind */
      const lt = L.x - 110, ld = lt - leo.x;
      leo.moving = Math.abs(ld) > 1;
      leo.x += Math.sign(ld) * Math.min(Math.abs(ld), Math.max(40, Math.abs(ld) * 2) * dt);
      leo.ph += Math.abs(ld) > 1 ? (Math.min(Math.abs(ld), 80 * dt)) / 10 : 0;
      /* her feeling, in a word */
      const firstUnmet = q && !met(q) ? q.needs.find((k) => !has(q, k)) : null;
      L.mood = !L.moving && firstUnmet ? { lantern: 'scared', cloud: 'huddle', plank: 'edge', bean: 'sad' }[firstUnmet] : happy ? 'happy' : L.relief > 0.3 ? 'relief' : 'walk';
      friendStep(dt);
      V.camX += (camTarget() - V.camX) * Math.min(1, dt * 2.2);
      if (L.x >= HOME - 46.5) {
        V.finished = true; V.rh = null; sel = -1; held = -1;
        if (T.audio) T.audio.promise();
        T.announce(ARRIVE);
        setTimeoutClock(2.6, () => V.res());
      }
      for (let i = V.spark.length - 1; i >= 0; i--) { const s = V.spark[i]; s.k += dt / 1.1; if (s.k >= 1) V.spark.splice(i, 1); }
      void S;
    };
    /* a wait on the stage's clock when there is one, so the end keeps pace with the scene */
    function setTimeoutClock(sec, fn) { const c = V.S && V.S.clock; if (c) c.wait(sec).then(fn); else setTimeout(fn, sec * 1000); }
    function burst(x, y, c) { V.spark.push({ x, y, c, k: 0 }); }

    /* ---------- drawing ---------- */
    let off = null, offGen = -1, farL = null;
    function build() {
      const Vw = T.view, ps = Vw.ps;
      off = document.createElement('canvas'); off.width = Math.ceil(Vw.W * ps); off.height = Math.ceil((900 - PIC) * ps); offGen = T.gen;
      /* the far bank: cloud sea and ruins adrift, slower than the near bank */
      const span = Vw.W + LEN * 0.2 + 400;
      farL = T.bake(-Vw.W / 2 - 200, 60, span, 230, (g) => {
        const r = T.rng(5);
        for (let i = 0; i < span / 460; i++) {   /* ruins adrift, far off and pale */
          const x = -Vw.W / 2 - 100 + i * 460 + r() * 200, y = 96 + r() * 36, w = 44 + r() * 46, c = '#c4a9cc';
          P.fill(g, P.soft([[x - w / 2, y - 2], [x - w * 0.36, y + w * 0.22], [x - w * 0.08, y + w * 0.44], [x + w * 0.12, y + w * 0.38], [x + w * 0.36, y + w * 0.16], [x + w / 2, y - 2]]), '#b89fc6');
          g.fillStyle = c; g.fillRect(x - w * 0.4, y - w * 0.34, w * 0.8, w * 0.34);
          if (r() < 0.6) g.fillRect(x + w * 0.18, y - w * 0.7, w * 0.16, w * 0.4);
          g.fillStyle = '#dcbfd6'; for (let k = 0; k < 3; k++) { const ax = x - w * 0.32 + k * w * 0.24; g.beginPath(); g.moveTo(ax, y); g.lineTo(ax, y - w * 0.14); g.arc(ax + w * 0.07, y - w * 0.14, w * 0.07, Math.PI, 0); g.lineTo(ax + w * 0.14, y); g.closePath(); g.fill(); }
          g.fillStyle = 'rgba(255,226,214,0.45)'; g.fillRect(x - w * 0.4, y - w * 0.34, w * 0.8, 2);
        }
        for (let x = -Vw.W / 2 - 200; x < -Vw.W / 2 - 200 + span + 200; x += 150 + r() * 80) P.cumulus(g, x, 252 + r() * 12, 170 + r() * 90, Math.floor(x) + 9, { lit: '#fff0e2', shade: '#c7a4c8', a: 0.95, sun: 1 });
      });
    }
    /* where a helper sits on the bank (its middle, for touching) */
    function anchorBank(h) { return h.kind === 'cloud' ? CLOUDY : h.kind === 'lantern' ? BANK - 60 : h.kind === 'plank' ? BANK - 14 : BANK - 30; }

    function drawBank(g, t, W) {
      const cam = V.camX;
      /* sky at dusk */
      const sky = g.createLinearGradient(0, 0, 0, WATER);
      sky.addColorStop(0, '#7470b2'); sky.addColorStop(0.55, '#d39ab8'); sky.addColorStop(1, '#f6c8a4');
      g.fillStyle = sky; g.fillRect(-W / 2, 0, W, WATER + 2);
      P.glow(g, W * 0.28, 210, 360, '#fff0c8', 0.6);
      T.blit(g, farL, -((cam * 0.2) % 1e9) + 0, 0);
      /* the bank: a lip of old stone, moss along the top */
      g.fillStyle = '#9d8aa6'; g.fillRect(-W / 2, BANK, W, WATER - BANK + 4);
      const x0 = Math.floor((cam - W / 2 - 80) / 64) * 64;
      for (let wx = x0; wx < cam + W / 2 + 80; wx += 64) {
        const r = T.rng(Math.abs(Math.floor(wx / 64)) * 7 + 3), sx = wx - cam;
        P.fill(g, P.rr(sx + 2, BANK + 4, 60 - r() * 6, 16, 4), T.shade('#b3a2b8', (r() - 0.5) * 0.14));
        P.fill(g, P.rr(sx + 30 - r() * 20, BANK + 21, 58, 15, 4), T.shade('#a493ac', (r() - 0.5) * 0.14));
        g.fillStyle = 'rgba(255,236,222,0.25)'; g.fillRect(sx + 5, BANK + 5, 50, 2);
        if (r() < 0.5) P.fill(g, P.ellipse(sx + r() * 60, BANK + 1, 16 + r() * 16, 4, 0), ['#8fa878', '#7f9a6c', '#a3b88a'][Math.floor(r() * 3)]);
        if (r() < 0.25) { g.strokeStyle = '#6f8f5e'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(sx + 20, BANK); g.lineTo(sx + 18, BANK - 10); g.moveTo(sx + 24, BANK); g.lineTo(sx + 27, BANK - 8); g.stroke(); }
      }
      g.fillStyle = '#8fa878'; g.fillRect(-W / 2, BANK - 3, W, 4);
    }
    function drawGhosts(g, t) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.6);
      for (const q of obs) {
        if (q.passed) continue;
        const sx = q.x - V.camX;
        if (sx < -T.view.W / 2 - 60 || sx > T.view.W / 2 + 60) continue;
        q.needs.forEach((k, j) => {
          if (has(q, k)) return;
          const gx = sx + (q.needs.length > 1 ? (j - 0.5) * 18 : 0);
          g.save(); g.globalAlpha = 0.16 + 0.14 * pulse;
          if (k === 'lantern') { P.line(g, gx, BANK, gx, BANK - 100, 4, '#fff3d6'); P.fill(g, P.rr(gx + 12, BANK - 104, 18, 26, 4), '#fff3d6'); }
          else if (k === 'cloud') cloudPuff(g, gx, CLOUDY, 1, 1, '#fff3d6', '#fff3d6');
          else if (k === 'plank') plankShape(g, gx, BANK - 8, 140, 1, 0);
          else F.dog(g, { x: gx, y: BANK + 2, s: 190, sit: 1, tintAll: '#fff3d6', flatLook: true });
          g.globalAlpha = 0.45 + 0.3 * pulse; g.setLineDash([7, 7]); g.lineDashOffset = -t * 18; g.lineWidth = 2.2; g.strokeStyle = '#ffe9c0';
          g.beginPath(); g.ellipse(gx, BANK + 1, 46, 9, 0, 0, TAU); g.stroke();
          g.restore();
        });
      }
    }
    function drawHelper(g, h, t, i) {
      const sx = h.x - V.camX, lift = h.lift * 10, s = sel === i;
      if (s && !V.finished) {   /* picked: arrows either side, and a warm ring at its foot */
        const pulse = 0.5 + 0.5 * Math.sin(t * 3);
        g.save(); g.globalAlpha = 0.9; g.fillStyle = '#fff6e0';
        for (const d of [-1, 1]) { const ax = sx + d * 64 + d * pulse * 6, ay = BANK - 40; g.beginPath(); g.moveTo(ax, ay - 13); g.lineTo(ax + d * 16, ay); g.lineTo(ax, ay + 13); g.closePath(); g.fill(); }
        g.restore();
        P.glow(g, sx, BANK, 70, '#ffe2a8', 0.35);
      }
      if (h.pop > 0) P.glow(g, sx, anchorBank(h), 90 * (1.4 - h.pop * 0.4), '#fff0c8', 0.6 * h.pop);
      if (h.kind === 'lantern') {
        g.save(); g.translate(sx, BANK + 2 - lift); g.rotate(h.lift * Math.sin(t * 6) * 0.04); K.lantern(g, 0, 0, t, { s: 1.12, lit: 1, seed: 5 }); g.restore();
      } else if (h.kind === 'cloud') {
        P.fill(g, P.ellipse(sx, BANK + 1, 46, 6), 'rgba(80,60,110,0.16)');
        cloudPuff(g, sx, CLOUDY + Math.sin(t * 1.4 + i) * 5 - lift, 1, 1);
      } else if (h.kind === 'plank') {
        plankShape(g, sx, BANK - 8 - lift * 1.4, 140, 1, h.lift * 0.05 + Math.sin(t * 7) * 0.02 * h.lift);
      } else {
        const walking = h.held || h.go != null || h.run > 0 || (held < 0 && h.lift > 0.2);
        F.dog(g, { x: sx, y: BANK + 2 - (h.held ? 4 : 0), s: 190, sit: walking ? 0 : 1, walk: walking ? h.ph : null, flip: h.flip, wag: Math.sin(t * 9) * 0.8, headTilt: walking ? 0 : 0.12 });
      }
      /* its number, for the keys */
      if (!V.finished) { P.fill(g, P.circle(sx, BANK + 22, 11), s ? 'rgba(255,233,192,0.95)' : 'rgba(40,34,62,0.45)'); P.text(g, String(i + 1), sx, BANK + 28, { font: 'serif', size: 16, color: s ? '#3d3a5c' : '#f3ead8' }); }
    }
    function drawLeo(g, t) {
      const sx = leo.x - V.camX, st = leo.style;
      if (sx < -T.view.W / 2 - 60) return;
      const sad = L.mood === 'scared' || L.mood === 'huddle' || L.mood === 'sad' || L.mood === 'edge';
      F.person(g, { x: sx, y: BANK - F.hipHeight(st, 150), s: 150, style: st, walk: leo.moving ? leo.ph : null, lean: 0.06 + (sad ? 0.1 : 0), headTilt: 0.32 + (sad ? 0.1 : 0),
        face: { blush: 0.16, mouth: L.mood === 'happy' || V.finished ? 'smile' : sad ? 'line' : null, eye: V.finished ? 'happy' : 'open' } });
    }
    function drawFriend(g) {
      if (!fr) return;
      const sx = fr.x - V.camX, st = fr.style, k = T.ease.io(fr.near);
      if (sx < -T.view.W / 2 - 60 || sx > T.view.W / 2 + 60) return;
      /* at the very edge, she leans out over the water to look down at her */
      const o = { x: sx, y: BANK - F.hipHeight(st, fr.s), s: fr.s, style: st, flip: fr.moving && fr.flip, lean: 0.05 + k * 0.18, headTilt: 0.26 + k * 0.26, face: { blush: 0.24, eye: V.finished ? 'happy' : 'open', mouth: V.finished ? 'smile' : null } };
      if (fr.moving) o.walk = fr.ph;
      if (k > 0.02) { o.armF = { a: 0.3 + 0.7 * k, b: 0.2 }; o.armB = { a: 0.2, b: 0.4 }; }
      F.person(g, o);
    }

    /* ---------- her street ---------- */
    function sx_(x) { return x - V.camX; }
    function drawHouse(g, h) {
      const x = sx_(h.x), W = T.view.W;
      if (x > W / 2 + 40 || x + h.w < -W / 2 - 40) return;
      const top = GROUND - h.h, r = T.rng(h.seed);
      if (h.kind === 'garden') {
        g.fillStyle = '#3c4f62'; for (let i = 0; i < 3; i++) P.fill(g, P.ellipse(x + h.w * (0.25 + i * 0.25), GROUND - 70 - r() * 30, 50 + r() * 20, 46 + r() * 16), ['#355266', '#3e5a6a', '#2f4a5e'][i]);
        g.fillStyle = '#8a7f9a'; for (let fx = x; fx < x + h.w; fx += 22) g.fillRect(fx, GROUND - 56, 9, 56);
        g.fillRect(x, GROUND - 46, h.w, 6); g.fillRect(x, GROUND - 22, h.w, 6);
        return;
      }
      g.fillStyle = h.c; g.fillRect(x, top, h.w, h.h);
      g.fillStyle = 'rgba(20,24,48,0.18)'; g.fillRect(x, top, 10, h.h);
      if (h.roof === 'gable') { P.fill(g, P.poly([[x - 14, top + 2], [x + h.w / 2, top - 70], [x + h.w + 14, top + 2]]), '#3a3d62'); g.fillStyle = 'rgba(160,170,220,0.2)'; g.fillRect(x - 14, top - 1, h.w + 28, 4); }
      else { P.fill(g, P.rr(x - 8, top - 14, h.w + 16, 16, 3), '#3a3d62'); }
      if (h.chim) P.fill(g, P.rr(x + h.w * 0.72, top - (h.roof === 'gable' ? 70 : 40), 22, 46, 2), '#43466c');
      const cw = h.w / h.cols;
      for (const wn of h.wins) {
        const wx = x + cw * wn.i + cw * 0.28, wy = top + 34 + wn.j * 110, ww = cw * 0.44, wh = 60;
        if (h.kind === 'shop' && wn.j === h.rows - 1 && h.rows > 1) continue;
        const darkHere = obs.some((q) => q.needs.includes('lantern') && !q.passed && Math.abs(h.x + cw * wn.i - q.x) < q.w / 2 + 40);
        const lit = wn.lit && !darkHere;
        P.fill(g, P.rr(wx, wy, ww, wh, 3), lit ? (wn.warm ? '#ffd58a' : '#cfe0f2') : '#2a3052');
        if (lit) P.glow(g, wx + ww / 2, wy + wh / 2, ww * 1.4, wn.warm ? '#ffcf7a' : '#cfe2f2', 0.35);
        g.fillStyle = 'rgba(30,30,60,0.55)'; g.fillRect(wx + ww / 2 - 1.5, wy, 3, wh); g.fillRect(wx, wy + wh / 2 - 1.5, ww, 3);
        P.fill(g, P.rr(wx - 4, wy + wh, ww + 8, 6, 2), '#8a86a6');
      }
      if (h.kind === 'shop') {   /* a shop front with a striped awning */
        const ay = GROUND - 120;
        P.fill(g, P.rr(x + 14, ay + 24, h.w - 28, 96, 4), '#3a4266');
        P.fill(g, P.rr(x + 22, ay + 32, h.w * 0.6, 70, 3), '#e9c98a'); P.glow(g, x + 22 + h.w * 0.3, ay + 66, h.w * 0.5, '#ffd58a', 0.4);
        for (let i = 0; i < 8; i++) P.fill(g, P.poly([[x + 6 + i * (h.w - 12) / 8, ay], [x + 6 + (i + 1) * (h.w - 12) / 8, ay], [x + 6 + (i + 1) * (h.w - 12) / 8, ay + 20], [x + 6 + i * (h.w - 12) / 8, ay + 26]]), i % 2 ? '#e9e2d8' : '#c9573f');
      } else {
        const dx = x + h.w * h.door - 24;
        P.fill(g, P.rr(dx, GROUND - 92, 48, 92, 4), '#3d3352'); P.fill(g, P.circle(dx + 38, GROUND - 46, 3), '#d7a23c');
        P.fill(g, P.rr(dx - 6, GROUND - 4, 60, 6, 2), '#7a7690');
      }
    }
    function drawLamp(g, x, t, broken) {
      const s = sx_(x), W = T.view.W;
      if (s < -W / 2 - 160 || s > W / 2 + 160) return;
      P.line(g, s, GROUND + 4, s, GROUND - 230, 6, '#2c3150');
      P.line(g, s, GROUND - 228, s + 26, GROUND - 236, 4, '#2c3150');
      const fl = broken ? (Math.sin(t * 23) > 0.93 ? 0.35 : 0.04) : 1;
      P.fill(g, P.rr(s + 16, GROUND - 238, 24, 16, 5), broken ? T.mix('#4a4f6a', '#fff0b8', fl) : '#fff0b8');
      if (fl > 0.03) { P.glow(g, s + 28, GROUND - 226, 150, '#ffd98a', 0.45 * fl); g.save(); g.translate(s + 28, GROUND + 8); g.scale(1, 0.18); P.glow(g, 0, 0, 160, '#ffd98a', 0.55 * fl); g.restore(); }
    }
    function sheltered(x) { return helpers.some((h) => h.kind === 'cloud' && Math.abs(h.x - x) < 140); }
    function paintStreet(g, t) {
      const W = T.view.W, cam = V.camX;
      /* the night sky over her street, and the far roofs */
      const sky = g.createLinearGradient(0, PIC, 0, GROUND);
      sky.addColorStop(0, '#1d2348'); sky.addColorStop(0.6, '#38426e'); sky.addColorStop(1, '#4a5582');
      g.fillStyle = sky; g.fillRect(-W / 2, PIC, W, 900 - PIC);
      P.glow(g, -W * 0.3 - cam * 0.03 % 200, PIC + 70, 180, '#c9d4f0', 0.25);
      if (V.sky) V.sky.draw(g, t, 'screen');
      g.fillStyle = '#2c335a';
      for (const q of far) {
        const x = q.x - cam * 0.55 - 600;
        const xx = ((x % 10500) + 10500) % 10500 - 1000;
        if (xx > W / 2 + 40 || xx + q.w < -W / 2 - 40) continue;
        g.fillStyle = '#2c335a'; g.fillRect(xx, GROUND - 170 - q.h, q.w, q.h + 40);
        if (q.chim) g.fillRect(xx + q.w * 0.7, GROUND - 200 - q.h, 16, 40);
        if (q.win) { P.fill(g, P.rr(xx + q.win[0] * (q.w - 20), GROUND - 150 - q.h + q.win[1] * (q.h - 20), 12, 16, 2), '#e9c27a'); }
      }
      for (const h of houses) drawHouse(g, h);
      /* the school she has come from, and home, with its door open */
      { const x = sx_(SCHOOL); if (x < W / 2 + 40 && x + 470 > -W / 2) {
        g.fillStyle = '#6b6a8e'; g.fillRect(x, GROUND - 330, 330, 330); P.fill(g, P.poly([[x - 16, GROUND - 328], [x + 165, GROUND - 400], [x + 346, GROUND - 328]]), '#3a3d62');
        D_clock(g, x + 165, GROUND - 350); for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) P.fill(g, P.rr(x + 22 + i * 78, GROUND - 300 + j * 110, 46, 64, 3), j ? '#2a3052' : '#cfe0f2');
        g.fillStyle = '#3b3f5c'; for (let k = 0; k < 9; k++) g.fillRect(x + 340 + k * 14, GROUND - 70, 5, 70); g.fillRect(x + 336, GROUND - 74, 130, 6);
      } }
      { const x = sx_(HOME - 110), lit = 0.8 + 0.2 * L.home;
        g.fillStyle = '#8a6f7e'; g.fillRect(x, GROUND - 290, 300, 290); P.fill(g, P.poly([[x - 18, GROUND - 288], [x + 150, GROUND - 380], [x + 318, GROUND - 288]]), '#4a3d5e');
        P.fill(g, P.rr(x + 180, GROUND - 230, 70, 70, 3), '#ffd58a'); P.glow(g, x + 215, GROUND - 195, 90, '#ffcf7a', 0.5);
        P.fill(g, P.rr(x + 80, GROUND - 120, 64, 120, 4), '#ffe2a0');
        P.glow(g, x + 112, GROUND - 60, 150 * lit, '#ffd98a', 0.75 * lit);
        g.save(); g.translate(x + 112, GROUND + 10); g.scale(1, 0.2); P.glow(g, 0, 0, 220, '#ffd98a', 0.6 * lit); g.restore();
        P.fill(g, P.rr(x + 70, GROUND - 4, 84, 6, 2), '#b9a58e');
        if (homeWho) {   /* someone at the door, watching for her */
          const near = T.clamp((L.x - (HOME - 500)) / 400), hug = T.ease.io(L.home), hk = homeS / 188;
          const a = { x: x + 112 + 44 * hk - hug * 30 * hk, y: GROUND - F.hipHeight(homeWho, homeS), s: homeS, style: homeWho, flip: true, lean: 0.04 + near * 0.06, headTilt: 0.14 - near * 0.1,
            face: { eye: hug > 0.3 ? 'happy' : 'open', mouth: near > 0.5 ? 'smile' : 'line', blush: 0.2 } };
          /* arms open for a child; for a grown-up of her own height, hands out to take hers */
          if (hug > 0.02) { a.armF = { a: hk < 1 ? 0.8 + hug * 0.4 : 1.2 + hug * 0.6, b: 0.3 }; a.armB = { a: hk < 1 ? 0.7 + hug * 0.35 : 1.0 + hug * 0.5, b: 0.4 }; }
          F.person(g, a);
        }
      }
      /* the pavement, wet */
      g.fillStyle = '#454b72'; g.fillRect(-W / 2, GROUND, W, 34);
      g.fillStyle = '#5a6088'; g.fillRect(-W / 2, GROUND, W, 3);
      g.fillStyle = '#2f3456'; g.fillRect(-W / 2, GROUND + 34, W, 900 - GROUND - 34);
      g.fillStyle = '#6a6f92'; g.fillRect(-W / 2, GROUND + 32, W, 4);
      for (let x = Math.floor((cam - W / 2) / 90) * 90; x < cam + W / 2 + 90; x += 90) { g.fillStyle = 'rgba(20,24,48,0.35)'; g.fillRect(sx_(x), GROUND + 3, 2, 30); }
      for (const lx of lamps) {
        const broken = obs.some((q) => q.x === lx && q.needs.includes('lantern'));
        drawLamp(g, lx, t, broken);
        if (!broken) { const s = sx_(lx) + 28; g.fillStyle = 'rgba(255,217,138,0.16)'; for (let k = 0; k < 6; k++) g.fillRect(s - 10 + Math.sin(t * 2 + k) * 4, GROUND + 40 + k * 14, 20 - k * 2, 6); }
      }
      /* the places on her way, as they are before anyone helps */
      for (const q of obs) {
        const s = sx_(q.x);
        if (s < -W / 2 - 300 || s > W / 2 + 300) continue;
        if (q.needs.includes('plank')) {
          g.save(); g.translate(s, GROUND + 16); g.scale(1, 0.16);
          P.fill(g, P.circle(0, 0, q.w / 2 + 16), '#2a3458'); P.fill(g, P.circle(0, 0, q.w / 2), '#3a4a7a');
          g.strokeStyle = 'rgba(200,220,255,0.35)'; g.lineWidth = 6;
          for (let k = 0; k < 3; k++) { const life = (t * 0.7 + k / 3) % 1; g.globalAlpha = 1 - life; g.beginPath(); g.arc(Math.sin(k * 2.1) * 30, 0, 8 + life * 50, 0, TAU); g.stroke(); }
          g.restore();
          P.glow(g, s + 20, GROUND + 14, 40, '#cfe0ff', 0.25);
        }
        if (q.needs.includes('bean')) {   /* where Bean used to wait for her: his little house, his bowl */
          const hx = s + 26;
          P.fill(g, P.rr(hx - 26, GROUND - 46, 52, 46, 3), '#9a6a50'); P.fill(g, P.poly([[hx - 32, GROUND - 44], [hx, GROUND - 70], [hx + 32, GROUND - 44]]), '#6a4038');
          P.fill(g, P.rr(hx - 11, GROUND - 30, 22, 30, 10), '#2a2238');
          P.fill(g, P.ellipse(s - 22, GROUND + 4, 15, 5), '#c4523f'); P.fill(g, P.ellipse(s - 22, GROUND + 2, 11, 3), '#7a3438');
        }
      }
      /* what the bank lends her: a plank over the water, Bean */
      for (const h of helpers) {
        const s = sx_(h.x);
        if (h.kind === 'plank') { g.save(); g.globalAlpha = 0.95; plankShape(g, s, GROUND + 14, 170, 1, 0); g.restore(); P.glow(g, s, GROUND + 10, 70, '#ffe2a8', 0.18); }
      }
      /* her */
      drawLily(g, t);
      const b = bean();
      if (b && !(b.run > 0)) { const s = sx_(b.x); g.save(); g.globalAlpha = 0.5 + 0.08 * Math.sin(t * 2); P.glow(g, s, GROUND - 30, 70, '#fff6e6', 0.3); F.dog(g, { x: s, y: GROUND + 2, s: 180, sit: 1, wag: Math.sin(t * 6) * 0.4, flatLook: true }); g.restore(); }
      /* the dark stretches: dark until a light comes, then a pool of it */
      for (const q of obs) {
        if (!q.needs.includes('lantern')) continue;
        const s = sx_(q.x), lit = T.clamp(q.metK), a = 0.82 * (1 - lit * 0.78);
        if (s < -W / 2 - 400 || s > W / 2 + 400 || a < 0.01) continue;
        /* a pool of dark, widest along the pavement */
        const rx = q.w / 2 + 150, ry = 360;
        g.save(); g.translate(s, GROUND - 150); g.scale(rx / ry, 1);
        const gr = g.createRadialGradient(0, 0, 0, 0, 0, ry);
        gr.addColorStop(0, T.rgba('#05081a', a)); gr.addColorStop(0.5, T.rgba('#05081a', a * 0.92)); gr.addColorStop(0.78, T.rgba('#05081a', a * 0.5)); gr.addColorStop(1, 'rgba(5,8,26,0)');
        g.fillStyle = gr; g.fillRect(-ry, -ry, ry * 2, ry * 2);
        g.restore();
      }
      for (const h of helpers) {
        const s = sx_(h.x);
        if (h.kind === 'lantern') {   /* the lantern: a warm light hanging over the street, and its pool on the ground */
          const fl = 0.92 + 0.08 * Math.sin(t * 5.3) * Math.sin(t * 1.7);
          g.save(); g.globalCompositeOperation = 'screen';
          g.fillStyle = 'rgba(255,214,150,0.07)'; g.beginPath(); g.moveTo(s - 10, GROUND - 262); g.lineTo(s + 10, GROUND - 262); g.lineTo(s + 150, GROUND + 20); g.lineTo(s - 150, GROUND + 20); g.closePath(); g.fill();
          g.restore();
          P.glow(g, s, GROUND - 120, 210 * fl, '#ffd98a', 0.42);
          g.save(); g.translate(s, GROUND + 10); g.scale(1, 0.2); P.glow(g, 0, 0, 240, '#ffe2a0', 0.75); g.restore();
          P.glow(g, s, GROUND - 266, 40 * fl, '#fff4d0', 0.9);
          P.fill(g, P.rr(s - 7, GROUND - 276, 14, 20, 4), 'rgba(255,246,214,0.9)');
        }
      }
      /* rain, everywhere but under the cloud; heavier where the sky opens */
      g.save(); g.strokeStyle = 'rgba(196,212,240,0.42)'; g.lineWidth = 1.3; g.beginPath();
      const span = W + 200, H = 900 - PIC;
      for (let i = 0; i < 150; i++) {
        const wx = i * 97.13 + (i % 7) * 13, x = ((wx - cam) % span + span) % span - W / 2 - 100, y = PIC + ((i * 53.7 + t * 560) % H);
        if (y > GROUND + 30 || sheltered(x + cam)) continue;
        g.moveTo(x, y); g.lineTo(x - 4, y + 18);
      }
      g.stroke();
      for (const q of obs) {
        if (!q.needs.includes('cloud')) continue;
        const s = sx_(q.x);
        if (s < -W / 2 - 300 || s > W / 2 + 300) continue;
        const cover = sheltered(q.x);
        if (!cover) { g.fillStyle = 'rgba(150,170,210,0.13)'; g.fillRect(s - q.w / 2, PIC, q.w, GROUND - PIC + 30); }
        g.strokeStyle = 'rgba(214,226,250,0.62)'; g.lineWidth = 1.8; g.beginPath();
        for (let i = 0; i < 90; i++) {
          const x = s - q.w / 2 + ((i * 37.7) % q.w), y = PIC + ((i * 71.3 + t * 820) % (GROUND - PIC + 20));
          if (cover && Math.abs(x + V.camX - helpers.find((h) => h.kind === 'cloud').x) < 140) continue;
          g.moveTo(x, y); g.lineTo(x - 6, y + 28);
        }
        g.stroke();
        if (!cover) for (let i = 0; i < 10; i++) { const x = s - q.w / 2 + ((i * 53.1 + Math.floor(t * 6) * 17) % q.w); g.strokeStyle = 'rgba(214,226,250,0.5)'; g.beginPath(); g.arc(x, GROUND + 6, 5, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
      }
      g.restore();
      /* the cloud: in her sky, a soft roof, and a dry patch under it */
      for (const h of helpers) {
        if (h.kind !== 'cloud') continue;
        const s = sx_(h.x);
        g.save(); g.translate(s, GROUND + 14); g.scale(1, 0.12); P.glow(g, 0, 0, 150, '#c8d6f0', 0.35); g.restore();
        cloudPuff(g, s, GROUND - 300 + Math.sin(t * 1.4) * 4, 1.9, 0.82, '#e8e6fa', '#9a96c6');
      }
      /* what each place still needs, over it */
      for (const q of obs) {
        if (q.passed || q.metK > 0.98) continue;
        const s = sx_(q.x), a = 1 - q.metK;
        if (s < -W / 2 - 60 || s > W / 2 + 60) continue;
        const waiting = !L.moving && nextObs() === q, pulse = 0.5 + 0.5 * Math.sin(t * (waiting ? 5 : 2.4));
        q.needs.forEach((k, j) => {
          const bx = s + (j - (q.needs.length - 1) / 2) * 64, by = GROUND - 236 - (waiting ? pulse * 6 : 0), ok = has(q, k);
          g.save(); g.globalAlpha = a * (ok ? 0.5 : 1);
          P.fill(g, P.circle(bx, by, 28), 'rgba(18,22,46,0.62)');
          g.strokeStyle = ok ? '#ffd98a' : T.rgba('#fff2d8', 0.6 + 0.4 * pulse); g.lineWidth = 2.4; g.setLineDash(ok ? [] : [5, 5]); g.lineDashOffset = -t * 10;
          g.beginPath(); g.arc(bx, by, 28, 0, TAU); g.stroke(); g.setLineDash([]);
          icon(g, k, bx, by, 0.9, t);
          g.restore();
        });
      }
      for (const s of V.spark) { const k = s.k; for (let i = 0; i < 8; i++) { const an = (i / 8) * TAU + k * 2, d = 20 + k * 60; P.glow(g, sx_(s.x) + Math.cos(an) * d, s.y + Math.sin(an) * d * 0.6, 9, s.c, 0.8 * (1 - k)); } }
    }
    function drawLily(g, t) {
      const s = sx_(L.x), st = L.style, u = L.s / 100, m = L.mood, b = bean();
      const onPlank = helpers.some((h) => h.kind === 'plank' && Math.abs(h.x - L.x) < 85);
      const hop = m === 'happy' && L.moving ? Math.abs(Math.sin(L.ph)) * 4 : 0;
      const calm = fr && fr.beside ? T.ease.io(fr.near) : 0;   /* someone is standing with her */
      const shiver = (m === 'huddle' || m === 'scared' ? Math.sin(t * 34) * 0.9 : 0) * (1 - 0.75 * calm);
      const y = GROUND - F.hipHeight(st, L.s) - (onPlank ? 5 : 0) - hop;
      /* the friend's shadow from the bank: a small girl at her back, a hand on her. Faint; it comes and goes */
      if (calm > 0.01) {
        const fst = fr.style, fs = 128, fx = sx_(fr.x) - 30 * u - 6, fy = GROUND - F.hipHeight(fst, fs);
        g.save(); g.globalAlpha = 0.4 * calm * (0.86 + 0.14 * Math.sin(t * 1.7));
        P.glow(g, fx, fy - 20, 80, '#fff6e6', 0.3);
        const fo2 = { x: fx, y: fy, s: fs, style: fst, lean: 0.08, headTilt: 0.06, face: { blush: 0.2, eye: 'closed', mouth: 'smile' }, flatLook: true };
        fo2.armF = { hand: F.local(fo2, s - 6 * u, y - 6 * u) }; fo2.armB = { a: 0.2, b: 0.3 };
        F.person(g, fo2);
        g.restore();
      }
      const o = { x: s + shiver, y, s: L.s, style: st, lean: 0.06, headTilt: 0.14, face: { blush: 0.3 } };
      if (L.moving) o.walk = L.ph;
      if (V.finished) { o.face = { eye: 'happy', mouth: 'open', blush: 0.4 }; o.headTilt = -0.05; o.armB = { a: 2.3 + Math.sin(t * 9) * 0.25, b: 0.3 }; }
      else if (m === 'scared') { o.lean = -0.08; o.headTilt = 0.02; o.face = { eye: 'open', mouth: 'line', blush: 0.2 }; }
      else if (m === 'huddle') { o.lean = 0.26; o.headTilt = 0.5; o.face = { eye: 'closed', mouth: 'line', blush: 0.2 }; }
      else if (m === 'edge') { o.lean = 0.16; o.headTilt = 0.55; o.face = { eye: 'open', mouth: 'line', blush: 0.24 }; }
      else if (m === 'sad') { o.lean = 0.12; o.headTilt = 0.4; o.face = { eye: 'closed', mouth: 'line', blush: 0.3, tear: 0.85, tearY: (t * 2) % 3 }; }
      else if (m === 'happy') { o.headTilt = 0.02; o.face = { eye: 'happy', mouth: 'smile', blush: 0.42 }; }
      else if (m === 'relief') { o.headTilt = -0.12; o.face = { eye: 'open', mouth: 'smile', blush: 0.34 }; }
      else if (!sheltered(L.x)) { o.headTilt = 0.22; }   /* head down in the drizzle */
      /* the collar: held out as she walks, hugged close when she is frightened or cold, looked at where Bean waited */
      const chest = [s + 6 * u + Math.sin(o.lean) * 14, y - 13 * u];
      if (!V.finished) {
        if (m === 'scared' || m === 'huddle') { o.armF = { hand: F.local(o, chest[0] + 2, chest[1]) }; o.armB = { hand: F.local(o, chest[0] - 1, chest[1] + 3) }; }
        else if (m === 'sad') { o.armF = { hand: F.local(o, s + 10 * u + Math.sin(o.lean) * 20, y - 20 * u) }; o.armB = { hand: F.local(o, s + 8 * u + Math.sin(o.lean) * 20, y - 18 * u) }; }
        else if (m === 'edge') o.armF = { a: 0.55, b: 0.3 };
      }
      /* her school bag, behind her */
      if (BAG) {
        const bl = Math.sin(o.lean) * 16;
        P.fill(g, P.rr(s - 15 * u + bl, y - 19 * u, 10 * u, 15 * u, 4), '#c9573f');
        P.fill(g, P.rr(s - 16 * u + bl, y - 20 * u, 11 * u, 5 * u, 3), '#a8452a');
      }
      const j = F.person(g, o);
      /* what she feels, drawn the way a picture book would */
      if (j && j.head) {
        const hx = j.head[0], hy = j.head[1];
        g.save(); g.lineCap = 'round';
        if (m === 'scared' || m === 'huddle') {   /* a shiver */
          g.strokeStyle = T.rgba('#f0f4ff', 0.75 * (1 - 0.7 * calm)); g.lineWidth = 2;
          for (const d of [-1, 1]) for (let k = 0; k < 2; k++) { const x = s + d * (30 + k * 8), y0 = y - 46 + k * 10, w = Math.sin(t * 30 + k) * 2; g.beginPath(); g.moveTo(x + w, y0); g.quadraticCurveTo(x + d * 4 - w, y0 + 7, x + w, y0 + 14); g.stroke(); }
        }
        if (m === 'huddle') {   /* the rain finding her */
          g.strokeStyle = 'rgba(214,228,252,0.8)'; g.lineWidth = 1.6;
          for (let k = 0; k < 4; k++) { const life = (t * 2.2 + k / 4) % 1, x = hx - 16 + k * 10; g.globalAlpha = 1 - life; g.beginPath(); g.arc(x, hy - 22 - life * 10, 3 + life * 4, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); }
          g.globalAlpha = 1;
        }
        if (m === 'happy' || V.finished) {   /* little hearts going up */
          for (let k = 0; k < 2; k++) {
            const life = (t * 0.55 + k * 0.5) % 1, x = hx + 18 + k * 12 + Math.sin(t * 3 + k) * 5, yy = hy - 30 - life * 46, sz = 5 + 2 * Math.sin(life * Math.PI);
            g.globalAlpha = Math.sin(life * Math.PI) * 0.95; g.fillStyle = k ? '#ffb7c8' : '#ff9eb6';
            g.beginPath(); g.moveTo(x, yy + sz * 0.9); g.bezierCurveTo(x - sz * 1.4, yy, x - sz * 0.7, yy - sz * 1.1, x, yy - sz * 0.35); g.bezierCurveTo(x + sz * 0.7, yy - sz * 1.1, x + sz * 1.4, yy, x, yy + sz * 0.9); g.fill();
          }
          g.globalAlpha = 1;
        }
        if (m === 'relief') { const k = L.relief, sp = 9 + 5 * k; g.strokeStyle = T.rgba('#fff6dc', k); g.lineWidth = 1.8; g.beginPath(); g.moveTo(hx + 22 - sp, hy - 26); g.lineTo(hx + 22 + sp, hy - 26); g.moveTo(hx + 22, hy - 26 - sp); g.lineTo(hx + 22, hy - 26 + sp); g.stroke(); }
        g.restore();
      }
      if (j && j.handF && CARRY === 'basket') basket(g, j.handF[0], j.handF[1], u);
      else if (j && j.handF && !V.finished) {
        const hx = j.handF[0], hy = j.handF[1] + 4;
        g.strokeStyle = '#c4523f'; g.lineWidth = 3.2; g.beginPath(); g.ellipse(hx + 2, hy + 6, 8, 5.5, 0.4, 0, TAU); g.stroke();
        P.fill(g, P.circle(hx + 8, hy + 11, 2.4), '#e3b64f');
      }
      if (b && b.run > 0) {   /* Bean, from the bank, trotting at her side */
        const bx = sx_(b.x), fade = T.clamp(b.run / 60) * T.clamp((380 - b.run) / 30 + 0.3);
        g.save(); g.globalAlpha = 0.9 * fade; P.glow(g, bx, GROUND - 30, 90, '#fff6e6', 0.35);
        F.dog(g, { x: bx, y: GROUND + 2, s: 180, walk: L.moving ? b.ph : null, sit: L.moving ? 0 : 1, wag: Math.sin(t * 12) * 0.9, headTilt: -0.15, flatLook: true });
        g.restore();
      }
    }
    /* a market basket hanging from her hand: tomatoes, and green tops showing (o.carry) */
    function basket(g, x, y, u) {
      const by = y + 9 * u, w = 17 * u, h = 10 * u;
      g.save(); g.lineCap = 'round';
      g.strokeStyle = '#7a5636'; g.lineWidth = 1.7 * u; g.beginPath(); g.ellipse(x, by, w * 0.42, 8.6 * u, 0, Math.PI, TAU); g.stroke();
      P.line(g, x + 3 * u, by + 1 * u, x + 9 * u, by - 9 * u, 2.4 * u, '#7fb36c'); P.line(g, x + 5 * u, by + 1 * u, x + 13 * u, by - 6 * u, 2 * u, '#9fc77e');
      P.fill(g, P.circle(x - 4.5 * u, by - 0.5 * u, 3.6 * u), '#d9584a'); P.fill(g, P.circle(x + 1.5 * u, by - 1.5 * u, 3.3 * u), '#c94a3c');
      P.fill(g, P.circle(x - 5.5 * u, by - 1.6 * u, 1 * u), 'rgba(255,255,255,0.4)');
      P.fill(g, P.poly([[x - w / 2, by], [x + w / 2, by], [x + w / 2 - 2 * u, by + h], [x - w / 2 + 2 * u, by + h]]), '#b48658');
      g.strokeStyle = 'rgba(90,60,34,0.45)'; g.lineWidth = 0.8 * u; g.beginPath();
      for (let k = 1; k < 3; k++) { g.moveTo(x - w / 2 + 1 * u, by + k * h / 3); g.lineTo(x + w / 2 - 1 * u, by + k * h / 3); }
      g.stroke();
      P.fill(g, P.rr(x - w / 2 - 0.6 * u, by - 0.8 * u, w + 1.2 * u, 2.2 * u, 1 * u), '#8a6440');
      g.restore();
    }
    function D_clock(g, x, y) { P.fill(g, P.circle(x, y, 20), '#efe6d6'); P.line(g, x, y, x, y - 13, 2.4, '#3d3a5c'); P.line(g, x, y, x + 9, y + 3, 2.4, '#3d3a5c'); }

    V.draw = function (g, t) {
      const W = T.view.W, ps = T.view.ps;
      if (!off || offGen !== T.gen || off.width !== Math.ceil(W * ps)) build();
      /* ---- above: the bank ---- */
      drawBank(g, t, W);
      if (V.started && !V.finished) drawGhosts(g, t);
      /* a cloud floats behind him; everything else stands in front, whatever is in hand on top */
      const order = helpers.map((h, i) => i).sort((a, b) => (a === held || a === sel ? 1 : 0) - (b === held || b === sel ? 1 : 0));
      for (const i of order) if (helpers[i].kind === 'cloud' && i !== held && i !== sel) drawHelper(g, helpers[i], t, i);
      drawLeo(g, t);
      drawFriend(g);
      for (const i of order) if (!(helpers[i].kind === 'cloud' && i !== held && i !== sel)) drawHelper(g, helpers[i], t, i);
      /* ---- below: the water, and her street in it ---- */
      const wg = g.createLinearGradient(0, WATER, 0, 900);
      wg.addColorStop(0, '#45608a'); wg.addColorStop(1, '#1a2c46');
      g.fillStyle = wg; g.fillRect(-W / 2, WATER, W, 900 - WATER);
      const og = off.getContext('2d');
      og.setTransform(1, 0, 0, 1, 0, 0); og.globalAlpha = 1; og.globalCompositeOperation = 'source-over';
      og.clearRect(0, 0, off.width, off.height);
      og.setTransform(ps, 0, 0, ps, (W / 2) * ps, -PIC * ps);
      paintStreet(og, t);
      og.setTransform(1, 0, 0, 1, 0, 0); og.globalCompositeOperation = 'source-atop';
      og.fillStyle = 'rgba(40,70,112,0.14)'; og.fillRect(0, 0, off.width, off.height);
      og.globalCompositeOperation = 'source-over';
      for (let y = PIC; y < 900; y += 6) {
        const dx = Math.sin(y * 0.045 + t * 1.5) * (1.1 + V.amp * 8) + Math.sin(y * 0.11 - t * 2.3) * V.amp * 4;
        g.drawImage(off, 0, (y - PIC) * ps, off.width, 6 * ps, -W / 2 + dx, y, W, 6.6);
      }
      /* the edges melt into the water */
      const ef = g.createLinearGradient(0, WATER, 0, PIC + 36);
      ef.addColorStop(0, 'rgba(69,96,138,1)'); ef.addColorStop(1, 'rgba(69,96,138,0)');
      g.fillStyle = ef; g.fillRect(-W / 2, WATER, W, PIC + 36 - WATER);
      g.fillStyle = 'rgba(255,236,214,0.35)'; g.fillRect(-W / 2, WATER, W, 2);
      /* glints on the water's skin, drifting */
      g.strokeStyle = 'rgba(230,240,255,0.16)'; g.lineWidth = 2; g.lineCap = 'round';
      const gr0 = T.rng(3);
      g.beginPath();
      for (let i = 0; i < 26; i++) { const y = PIC + 20 + gr0() * 520, x = ((gr0() * W + t * (8 + gr0() * 10)) % W) - W / 2, len = 30 + gr0() * 60, a = Math.sin(t * 0.9 + i); if (a < 0.2) continue; g.moveTo(x, y); g.quadraticCurveTo(x + len / 2, y - 2, x + len, y); }
      g.stroke();
      /* each thing on the bank, joined to its reflection by a thread of light */
      for (const h of helpers) {
        const s = h.x - V.camX, to = h.kind === 'cloud' ? GROUND - 300 : h.kind === 'lantern' ? GROUND - 266 : h.kind === 'plank' ? GROUND + 6 : GROUND - 30;
        const c = { lantern: '#ffd98a', cloud: '#dfe6ff', plank: '#f2c98e', bean: '#fff6e6' }[h.kind];
        const gr = g.createLinearGradient(0, WATER, 0, to);
        gr.addColorStop(0, T.rgba(c, 0.45 + 0.3 * h.lift)); gr.addColorStop(0.6, T.rgba(c, 0.12 + 0.1 * h.lift)); gr.addColorStop(1, T.rgba(c, 0));
        g.fillStyle = gr; g.fillRect(s - 2 - h.lift, WATER, 4 + h.lift * 2, to - WATER);
      }
      g.save(); g.lineWidth = 2;
      for (const r of V.rip) { const age = t - r.t; if (age > 2.4) continue; for (let k = 0; k < 3; k++) { const a = age - k * 0.3; if (a < 0) continue; g.strokeStyle = T.rgba('#dfeeff', 0.45 * (1 - a / 2.4)); g.beginPath(); g.ellipse(r.x, r.y, a * 100, a * 30, 0, 0, TAU); g.stroke(); } }
      g.restore();
      /* words */
      if (V.started && !V.finished) {
        const q = nextObs(), waiting = q && !L.moving && !met(q) && q.waited > 0.6;
        let line = o.caption || lv.caption;
        if (waiting) { const miss = q.needs.filter((k) => !has(q, k)); line = SAY[miss.length > 1 ? miss.join('+') : miss[0]] || SAY[miss[0]]; }
        else if (bean() && bean().run > 0) line = named('빈의 그림자가 릴리 곁을 따라 걸어요');
        else if (V.idle > 6 && sel < 0) line = '끌어서 옮기거나, 숫자 키로 고르고 좌우 화살표로 옮겨요';
        T.band(g, 1);
        P.text(g, line, 0, 866, { font: 'serif', size: 26, color: '#f3ead8', alpha: 0.95, glow: 'rgba(8,12,22,0.9)', fit: W - 120 });
        if (line !== V.said) { V.said = line; T.announce(line); }
        if (V.idle > 9 || (waiting && q.waited > 7 && V.idle > 4)) { const h = V.hintAt(); if (h) P.beacon(g, h[0], h[1], 46, t, 1, '#fff0c8'); }
      } else if (V.finished) {
        const a = T.clamp(L.home * 2);
        T.band(g, a);
        P.text(g, ARRIVE, 0, 866, { font: 'serif', size: 28, color: '#f3ead8', alpha: 0.95 * a, glow: 'rgba(8,12,22,0.9)' });
      }
    };
    V.LEVELS = LEVELS;
    return V;
  };
  T.lakeHelp.LEVELS = LEVELS;
})();
