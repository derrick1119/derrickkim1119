/* 데이 & 나이트 — 게임 본체
 * 입력(누르기 = 걷기, 끌기 = 언덕 움직이기), 인물 이동, 카메라, 장면 스크립트, 저장.
 */
(function (root) {
  'use strict';
  const DN = (root.DN = root.DN || {});
  const U = DN.U, T = DN.T, Art = DN.Art, R = DN.Render, UI = DN.UI, Au = DN.Audio;
  const TAU = Math.PI * 2;
  const SAVE_KEY = 'day-and-night-v1';
  const CANCEL = { cancelled: true };

  const G = (DN.Game = {
    mode: 'boot',           // boot | title | play | ending
    time: 0, tod: 1, todOverride: null,
    level: null, terrain: null,
    agents: [], things: [], triggers: [], particles: [], tweens: [], waits: [],
    player: null, day: null, hari: null, night: null,
    flags: {},
    cam: { x: 0, pan: 0, script: null },
    lantern: { has: false, on: false, canOff: false },
    lanternPos: null,
    busy: 0, paused: false, epoch: 0, speed: 1,
    S: null, meta: { runs: 0, endings: [] },
    pointer: null, hover: null, tapMark: null,
    starAmount: 0, lastStar: null, sun: null, farLights: 1, darkMul: 1, shadowSolid: 0,
  });

  /* ───────── 저장 ───────── */
  let memStore = null;
  function store(obj) {
    memStore = JSON.stringify(obj);
    try { root.localStorage.setItem(SAVE_KEY, memStore); } catch (e) { /* 저장소가 없으면 이번 방문 동안만 기억 */ }
  }
  function restore() {
    let raw = memStore;
    try { raw = root.localStorage.getItem(SAVE_KEY) || raw; } catch (e) { /* 무시 */ }
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }
  G.save = function () { store({ meta: G.meta, S: G.S }); };

  function newRun() {
    return {
      ci: 0, run: G.meta.runs + 1,
      A: {},                          // 빛의 행방: 정령 → 'human' | 'night'
      B: 0,                           // 나이트와의 관계 점수
      C: { hari: false, night: false }, // 고백
      bond: 0,                        // 하리와의 유대
      clues: [],                      // 황혼의 단서
      wish: null,                     // 최종장의 마지막 말
      lantern: { has: false, canOff: false },
      hari: false, shadowWalk: false,
    };
  }

  /* ───────── 시작 ───────── */
  G.boot = function () {
    const canvas = document.getElementById('view');
    R.init(canvas);
    UI.init(G);
    const saved = restore();
    if (saved && saved.meta) G.meta = saved.meta;
    G.saved = saved && saved.S ? saved.S : null;
    bindInput(canvas);
    root.addEventListener('resize', () => R.resize());
    Art.load().then(() => {
      const q = new URLSearchParams(root.location.search);
      if (q.get('wide')) { R.wideOverride = parseFloat(q.get('wide')); R.resize(); }
      if (q.get('auto')) DN.AUTO = {};          // 자동 검증용: 대사를 건너뛰고 첫 선택지를 고른다
      if (q.get('speed')) G.speed = parseInt(q.get('speed'), 10);
      if (q.get('level') && DN.LEVELS[q.get('level')]) {
        // 개발용: 특정 장면부터 시작
        const id = q.get('level');
        G.S = newRun();
        if (q.get('run')) G.S.run = parseInt(q.get('run'), 10);
        DN.Story.debugState(G.S, id);
        if (DN.CHAPTERS.includes(id)) G.startChapter(DN.CHAPTERS.indexOf(id), true);
        else { G.mode = 'play'; G.S.ci = DN.Story.sceneChapter(id); G.gotoScene(id); }
      } else {
        G.toTitle();
      }
      let last = performance.now();
      const loop = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        for (let i = 0; i < G.speed; i++) G.tick(dt);
        if (G.level) R.frame(G);
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    });
  };

  G.toTitle = function () {
    G.epoch++; G.busy = 0; G.paused = false;
    UI.closeAll();
    G.mode = 'title';
    G.S = null;
    loadLevel(DN.LEVELS.title);
    G.saved = (restore() || {}).S || G.saved;
    UI.hud({ show: false });
    UI.showTitle(G.meta, !!(G.saved && G.saved.ci > 0));
    UI.fade(false, 600);
  };

  G.titleAction = function (act) {
    if (act === 'new') { G.S = newRun(); }
    else if (act === 'continue') { G.S = G.saved || newRun(); }
    UI.hideTitle();
    G.startChapter(G.S.ci);
  };

  G.startChapter = async function (ci, instant) {
    G.epoch++; G.busy = 0;
    const ep = G.epoch;
    UI.closeAll();
    G.mode = 'play';
    if (!instant && !UI.faded) await UI.fade(true, 700);
    if (ep !== G.epoch) return;
    G.S.ci = ci;
    G.save();
    const level = DN.LEVELS[DN.CHAPTERS[ci]];
    loadLevel(level);
    refreshHud();
    await UI.fade(false, instant ? 10 : 1100);
    if (ep !== G.epoch) return;
    if (level.title) UI.card(level.title, level.sub);
    if (level.intro) G.run(level.intro);
  };

  G.restartChapter = function () { if (G.S) G.startChapter(G.S.ci); };

  G.nextChapter = function () {
    const ci = G.S.ci + 1;
    if (ci < DN.CHAPTERS.length) G.startChapter(ci);
  };

  /* ───────── 장면 불러오기 ───────── */
  function loadLevel(level) {
    G.level = level;
    G.terrain = new DN.Terrain(level);
    G.flags = {};
    if (G.S) { G.flags.run2 = G.S.run >= 2; for (const k in G.S.A) G.flags['A_' + k] = G.S.A[k]; }
    G.agents = []; G.things = []; G.triggers = []; G.particles = []; G.tweens = []; G.waits = [];
    G.day = G.hari = G.night = G.player = null;
    G.cam.pan = 0; G.cam.script = null;
    G.todOverride = null;
    G.sun = null; G.lastStar = null; G.starAmount = 0; G.farLights = 1; G.darkMul = 1;
    G.hover = null; G.pointer = null; G.tapMark = null; G.lanternPos = null;
    const sky = level.sky || {};
    if (sky.sun) G.sun = Object.assign({ a: 1 }, sky.sun);
    if (sky.lastStar) G.lastStar = Object.assign({ a: 0 }, sky.lastStar);
    if (sky.stars) G.starAmount = sky.stars;
    G.lantern.has = !!(G.S && G.S.lantern.has) && !level.noLantern;
    G.lantern.canOff = !!(G.S && G.S.lantern.canOff);
    G.lantern.on = G.lantern.has;
    R.prepare(level, G.terrain);

    if (level.start) {
      const kind = level.startAs || 'day';
      const a = G.addAgent({ id: kind, kind, layer: level.start.layer, x: level.start.x, dir: level.start.dir || 1, lantern: kind === 'day', h: level.start.h });
      G.player = a;
      if (kind === 'day') G.day = a; else G.night = a;
      if (kind === 'day' && G.S && G.S.hari && level.hari !== false) {
        G.hari = G.addAgent({ id: 'hari', kind: 'hari', layer: level.start.layer, x: level.start.x - 62, follow: G.day, pole: true });
      }
    }
    for (const t of level.things || []) {
      if (t.run2 && !(G.S && G.S.run >= 2)) continue;
      G.addThing(t);
    }
    for (const t of level.triggers || []) G.triggers.push(Object.assign({ done: false }, t));
    G.tod = todFor(level, G.player ? G.player.x : 0);
    if (level.setup) level.setup(makeApi(G.epoch));
    refreshBlocks();
    const W = R.W;
    G.cam.x = U.clamp((G.player ? G.player.x : 0) - W * 0.4, 0, Math.max(0, level.width - W));
    if (level.camCenter !== undefined) G.cam.x = U.clamp(level.camCenter - W / 2, 0, Math.max(0, level.width - W));
  }

  G.loadEnding = function (cfg) { G.endingCfg = cfg; loadLevel(DN.LEVELS.ending); };

  /** 장 안의 딸린 장면으로 넘어간다 (기억 속, 동굴 어귀 등). 저장 지점은 바뀌지 않는다. */
  G.gotoScene = async function (id) {
    G.epoch++; G.busy = 0;
    const ep = G.epoch;
    UI.closeAll();
    G.mode = 'play';
    if (!UI.faded) await UI.fade(true, 900);
    if (ep !== G.epoch) return;
    const level = DN.LEVELS[id];
    loadLevel(level);
    refreshHud();
    await UI.fade(false, 1200);
    if (ep !== G.epoch) return;
    if (level.title) UI.card(level.title, level.sub);
    if (level.intro) G.run(level.intro);
  };

  function todFor(level, x) {
    const k = level.tod;
    if (k === undefined) return 0;
    if (typeof k === 'number') return k;
    if (x <= k[0][0]) return k[0][1];
    for (let i = 0; i < k.length - 1; i++) {
      if (x <= k[i + 1][0]) return U.lerp(k[i][1], k[i + 1][1], (x - k[i][0]) / (k[i + 1][0] - k[i][0]));
    }
    return k[k.length - 1][1];
  }

  /* ───────── 인물 ───────── */
  const HEIGHT = { day: 112, night: 112, hari: 70, child: 62, keeper: 92, boat: 0 };
  G.addAgent = function (def) {
    const a = Object.assign({
      kind: 'day', dir: 1, phase: Math.random() * 6, moving: 0, path: [], speed: 118,
      visible: true, alpha: 1, goal: null, done: null, trail: [], ti: 0, rides: false, emote: null,
    }, def);
    a.layer = G.terrain.layer(a.layer);
    a.y = G.terrain.yAt(a.layer, a.x);
    a.h = def.h || HEIGHT[a.kind];
    a.speed = def.speed || (a.h && a.h < 100 && a.kind === 'day' ? 100 : a.speed);
    if (a.kind === 'boat' || a.follow) a.rides = true;
    G.agents.push(a);
    return a;
  };
  G.agent = (id) => G.agents.find((a) => a.id === id);
  G.removeAgent = function (a) { const i = G.agents.indexOf(a); if (i >= 0) G.agents.splice(i, 1); };

  G.modeFor = function (a) {
    return { water: a.kind === 'boat', dark: G.lantern.has && !G.lantern.on && G.S && G.S.shadowWalk };
  };

  /** (wx, wy) 쪽으로 걸어갈 수 있는 데까지 간다. 목표에 닿을 수 있으면 true */
  G.goTo = function (a, wx, wy, opt) {
    opt = opt || {};
    const ter = G.terrain;
    const r = ter.reach(a.layer, a.x, G.modeFor(a));
    let node, exact = false;
    if (opt.layer) {
      const L = ter.layer(opt.layer);
      node = ter.node(L, wx);
      if (r.prev[node] !== -2) exact = true;
      else node = ter.nearest(r, wx, ter.yAt(L, wx)).node;
    } else {
      const n = ter.nearest(r, wx, wy, null, ter.hit(wx, wy + 4));
      node = n.node; exact = n.dist < 46;
    }
    a.path = ter.path(r, node);
    a.goal = { wx, wy, opt, version: ter.version, exact };
    return exact;
  };

  function replan(a) {
    if (!a.goal) return;
    const g = a.goal;
    G.goTo(a, g.wx, g.wy, g.opt);
  }

  function updateAgent(a, dt) {
    const ter = G.terrain;
    if (a.follow) { updateFollower(a, dt); return; }
    if (a.goal && a.goal.version !== ter.version) replan(a);   // 지형이 바뀌면 길을 다시 찾는다
    let walking = false;
    if (a.path.length) {
      let budget = a.speed * dt;
      const slope = (ter.yAt(a.layer, a.x + a.dir * 6) - a.y) / 6;
      budget /= 1 + Math.max(0, -slope) * 0.55 + Math.abs(slope) * 0.12;
      let guard = 0;
      while (a.path.length && budget > 0 && guard++ < 64) {
        const n = a.path[0];
        const nl = ter.nodeLayer(n), nx = ter.nodeX(n);
        if (nl !== a.layer) { a.layer = nl; a.path.shift(); continue; }
        const dx = nx - a.x;
        if (Math.abs(dx) <= budget) { a.x = nx; budget -= Math.abs(dx); a.path.shift(); }
        else { a.x += Math.sign(dx) * budget; budget = 0; }
        if (dx !== 0) a.dir = Math.sign(dx);
        walking = true;
      }
      if (!a.path.length) {
        // 목표에 닿지 못하고 멈췄다면 목표를 기억해 둔다 (길이 열리면 다시 걷는다)
        const cb = a.done; a.done = null;
        if (!a.goal || a.goal.exact || cb) a.goal = null;
        if (cb) cb();
      }
    }
    a.y = ter.yAt(a.layer, a.x);
    a.moving = U.approach(a.moving, walking ? 1 : 0, 10, dt);
    if (walking) a.phase += dt * 8.6 * (a.speed / 118);
    // 따라오는 이를 위한 발자취
    const tr = a.trail, last = tr[tr.length - 1];
    if (!last || last.layer !== a.layer || Math.abs(last.x - a.x) >= 6) tr.push({ layer: a.layer, x: a.x });
    if (a.emote) { a.emote.t -= dt; if (a.emote.t <= 0) a.emote = null; }
  }

  function updateFollower(a, dt) {
    const ter = G.terrain, lead = a.follow, tr = lead.trail;
    const gap = a.gap || 11;
    let walking = false;
    let budget = lead.speed * 1.18 * dt;
    while (tr.length - a.ti > gap && budget > 0) {
      const p = tr[a.ti];
      if (p.layer !== a.layer) { a.layer = p.layer; }
      const dx = p.x - a.x;
      if (Math.abs(dx) > 400) { a.x = p.x; a.ti++; continue; }
      if (Math.abs(dx) <= budget) { a.x = p.x; budget -= Math.abs(dx); a.ti++; }
      else { a.x += Math.sign(dx) * budget; budget = 0; }
      if (Math.abs(dx) > 0.5) a.dir = Math.sign(dx);
      walking = true;
    }
    if (a.ti > 400) { tr.splice(0, 300); a.ti -= 300; }
    if (!walking && lead.moving < 0.2) a.dir = lead.x >= a.x ? 1 : -1;
    a.y = ter.yAt(a.layer, a.x);
    a.moving = U.approach(a.moving, walking ? 1 : 0, 10, dt);
    if (walking) a.phase += dt * 11;
    if (a.emote) { a.emote.t -= dt; if (a.emote.t <= 0) a.emote = null; }
  }

  /** 앞장서는 이를 바꾼다 (5장: 하리가 등불을 들고 데이를 이끈다) */
  G.setLead = function (lead, follower) {
    G.player = lead;
    lead.follow = null; lead.rides = false; lead.trail = []; lead.path = []; lead.goal = null; lead.lantern = true;
    if (follower) { follower.follow = lead; follower.rides = true; follower.ti = 0; follower.path = []; follower.goal = null; follower.lantern = false; }
  };

  /** 따라오는 이를 이끄는 이 곁으로 옮긴다 (장면 전환용) */
  G.snapFollower = function (a) {
    const lead = a.follow;
    a.layer = lead.layer; a.x = lead.x - lead.dir * 58; a.ti = lead.trail.length;
    a.y = G.terrain.yAt(a.layer, a.x);
  };

  /* ───────── 사물 ───────── */
  G.addThing = function (def) {
    const t = Object.assign({ kind: 'spot', r: 46, dy: 30, visible: true, fade: 0, awake: 1, gone: false, seed: Math.random() * 100 }, def);
    t.layerRef = t.layer ? G.terrain.layer(t.layer) : null;
    G.things.push(t);
    return t;
  };
  G.thing = (id) => G.things.find((t) => t.id === id);

  function thingPos(t) {
    if (t.sky) return { x: t.x, y: t.y };
    const y = t.layerRef ? G.terrain.yAt(t.layerRef, t.x) : t.y;
    return { x: t.x, y };
  }

  function refreshBlocks() {
    const list = [];
    for (const t of G.things) {
      if (t.kind !== 'soot' || t.gone) continue;
      const active = t.type === 'hungry' ? t.awake > 0.5 : true;
      if (active) list.push({ layer: t.layer, x0: t.x - t.rad * 0.8, x1: t.x + t.rad * 0.8 });
    }
    for (const b of (G.level.blocks || [])) if (!b.unless || !G.flags[b.unless]) list.push(b);
    G.terrain.setBlocks(list);
    G.terrain.version++;
  }
  G.refreshBlocks = refreshBlocks;

  function updateThings(dt) {
    const p = G.player;
    let changed = false;
    for (const t of G.things) {
      if (t.kind !== 'soot' || t.gone) continue;
      const pos = thingPos(t);
      if (t.type === 'hungry') {
        // 빛을 먹는 그을음: 등불이 켜져 있으면 깨어나 길을 막는다
        const want = G.lantern.on ? 1 : 0.12;
        const before = t.awake > 0.5;
        t.awake = U.approach(t.awake, want, 3.2, dt);
        if ((t.awake > 0.5) !== before) changed = true;
      } else if (!t.fading && p && G.lantern.has && G.lantern.on && !t.sturdy) {
        const lp = G.lanternPos || { x: p.x, y: p.y - 40 };
        if (Math.hypot(lp.x - pos.x, lp.y - (pos.y - t.rad * 0.8)) < (t.reach || 132)) G.disperse(t);
      }
      if (t.fading) {
        t.fade += dt * 1.25;
        if (t.fade >= 1) { t.gone = true; t.visible = false; changed = true; if (t.onGone) G.run(t.onGone); }
      }
    }
    if (changed) refreshBlocks();
  }

  G.disperse = function (t) {
    if (t.fading || t.gone) return;
    t.fading = true;
    const pos = thingPos(t);
    Au.sfx('poof');
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * TAU, sp = 30 + Math.random() * 90;
      G.particles.push({ x: pos.x + Math.cos(a) * t.rad * 0.5, y: pos.y - t.rad * 0.8 + Math.sin(a) * t.rad * 0.5, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, life: 0, max: 0.7 + Math.random() * 0.7, r: 2 + Math.random() * 4, col: [20, 15, 22], add: false });
    }
  };

  G.sparkle = function (x, y, rgb, n, spread) {
    for (let i = 0; i < (n || 14); i++) {
      const a = Math.random() * TAU, sp = (spread || 60) * (0.3 + Math.random());
      G.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 20, life: 0, max: 0.6 + Math.random() * 0.9, r: 1 + Math.random() * 2, col: rgb || [255, 236, 180], add: true });
    }
  };

  /* ───────── 등불 ───────── */
  G.toggleLantern = function () {
    if (G.mode !== 'play' || G.paused || !G.lantern.has) return;
    if (G.busy && !G.flags.lanternFree) return;
    if (!G.lantern.canOff) { UI.lanternShake(); return; }
    const p = G.player;
    if (!G.lantern.on && p && p.layer.shadow) {
      UI.lanternShake(); Au.sfx('no');
      UI.toast('그림자 위에서는 등불을 켤 수 없어요. 단단한 곳으로 먼저 건너가세요.', 3600);
      return;
    }
    G.setLantern(!G.lantern.on);
  };
  G.setLantern = function (on) {
    if (G.lantern.on === on) return;
    G.lantern.on = on;
    Au.sfx(on ? 'on' : 'off');
    G.terrain.version++;
    refreshHud();
    if (G.level.onLantern) G.level.onLantern(makeApi(G.epoch), on);
  };

  function refreshHud() {
    UI.hud({
      show: G.mode === 'play',
      lantern: G.lantern.has && G.lantern.canOff && !(G.level && G.level.lockLantern),
      on: G.lantern.on,
      nudge: !!G.flags.nudgeLantern,
    });
  }
  G.refreshHud = refreshHud;

  /* ───────── 스크립트 ───────── */
  function makeApi(ep) {
    const guard = () => { if (ep !== G.epoch) throw CANCEL; };
    const wrap = (fn) => async function () { guard(); const r = await fn.apply(null, arguments); guard(); return r; };
    const g = {
      G, get S() { return G.S; }, get flags() { return G.flags; }, get run2() { return G.S && G.S.run >= 2; },
      get player() { return G.player; }, get day() { return G.day; }, get hari() { return G.hari; }, get night() { return G.night; },
      say: wrap((who, text) => UI.say(who, text)),
      talk: wrap(async (lines) => { for (const [who, text] of lines) { guard(); await UI.say(who, text); } }),
      choose: wrap((opts) => UI.choose(opts.filter((o) => !o.extra || (G.S && G.S.run >= 2)))),
      wait: wrap((sec) => (DN.AUTO ? Promise.resolve() : new Promise((res) => G.waits.push({ t: sec, res })))),
      /** 조건이 될 때까지 기다린다. 기다리는 동안 플레이어는 자유롭게 움직인다. */
      until: wrap(async (fn) => {
        G.busy--;
        await new Promise((res) => G.waits.push({ cond: () => G.busy === 0 && fn(), res }));
        G.busy++;
      }),
      walk: wrap((agent, layer, x, opt) => new Promise((res) => {
        const a = typeof agent === 'string' ? G.agent(agent) : agent;
        opt = opt || {};
        if (opt.speed) a.speed = opt.speed;
        if (opt.force) {
          // 길찾기 없이 한 겹 위를 곧장 (연출용)
          const L = G.terrain.layer(layer);
          const path = [], S = T.STEP, i0 = Math.round(a.x / S), i1 = Math.round(x / S);
          a.layer = L;
          for (let i = i0; i !== i1; i += Math.sign(i1 - i0)) path.push(L.index * G.terrain.N + i);
          path.push(L.index * G.terrain.N + i1);
          a.path = path; a.goal = null;
        } else {
          G.goTo(a, x, 0, { layer });
        }
        if (!a.path.length) { res(); return; }
        a.done = res;
      })),
      tween: wrap((obj, key, to, dur, ease) => G.tween(obj, key, to, dur, ease)),
      tod: wrap((v, dur) => { if (G.todOverride === null) G.todOverride = G.tod; return G.tween(G, 'todOverride', v, dur || 2); }),
      todFree: () => { G.todOverride = null; },
      cam: wrap((x, dur) => {
        const tx = U.clamp(x - R.W / 2, 0, Math.max(0, G.level.width - R.W));
        if (!G.cam.script) G.cam.script = { x: G.cam.x };
        return G.tween(G.cam.script, 'x', tx, dur || 1.6, U.easeInOut);
      }),
      camFree: () => { G.cam.script = null; },
      fade: wrap((on, ms, white) => UI.fade(on, ms, white)),
      card: wrap((t, s, ms) => UI.card(t, s, ms)),
      toast: (text, ms) => UI.toast(text, ms),
      toastOff: () => UI.toastOff(),
      sfx: (n) => Au.sfx(n),
      emote: (a, txt, sec) => { (typeof a === 'string' ? G.agent(a) : a).emote = { txt, t: sec || 1.8 }; },
      thing: G.thing, agent: G.agent,
      flag: (k, v) => { G.flags[k] = v === undefined ? true : v; refreshBlocks(); refreshHud(); },
      face: (a, dir) => { (typeof a === 'string' ? G.agent(a) : a).dir = dir; },
      lantern: (on) => G.setLantern(on),
      give: (what) => {
        if (what === 'lantern') { G.S.lantern.has = true; G.lantern.has = true; G.lantern.on = true; }
        if (what === 'off') { G.S.lantern.canOff = true; G.lantern.canOff = true; }
        if (what === 'shadow') { G.S.shadowWalk = true; }
        refreshHud();
      },
      clue: (id) => { if (!G.S.clues.includes(id)) { G.S.clues.push(id); Au.sfx('star'); } },
      next: () => { guard(); G.nextChapter(); },
      scene: (id) => { guard(); G.gotoScene(id); },
      finish: () => { guard(); return G.finish(); },
      run: (fn) => G.run(fn),
    };
    return g;
  }
  G.api = () => makeApi(G.epoch);

  G.run = async function (fn) {
    const ep = G.epoch;
    G.busy++;
    try { await fn(makeApi(ep)); }
    catch (e) { if (e !== CANCEL) { console.error(e); if (DN.onError) DN.onError(e); } }
    finally { if (ep === G.epoch) G.busy = Math.max(0, G.busy - 1); }
  };

  G.tween = function (obj, key, to, dur, ease) {
    if (DN.AUTO) { obj[key] = to; return Promise.resolve(); }
    return new Promise((res) => G.tweens.push({ obj, key, from: obj[key], to, t: 0, dur: Math.max(0.001, dur), ease: ease || U.smooth, res }));
  };

  /* ───────── 한 틱 ───────── */
  G.tick = function (dt) {
    if (G.paused || !G.level) return;
    G.time += dt;
    UI.tick(dt);
    Au.tick();
    // 대기와 보간
    for (let i = G.waits.length - 1; i >= 0; i--) {
      const w = G.waits[i];
      let ok = false;
      if (w.cond) ok = w.cond(); else { w.t -= dt; ok = w.t <= 0; }
      if (ok) { G.waits.splice(i, 1); w.res(); }
    }
    for (let i = G.tweens.length - 1; i >= 0; i--) {
      const tw = G.tweens[i];
      tw.t += dt;
      const k = Math.min(1, tw.t / tw.dur);
      tw.obj[tw.key] = U.lerp(tw.from, tw.to, tw.ease(k));
      if (k >= 1) { G.tweens.splice(i, 1); tw.res(); }
    }
    for (const a of G.agents) updateAgent(a, dt);
    updateThings(dt);
    if (G.level.update) G.level.update(G.api(), dt);

    // 발 디딘 곳에서 벌어지는 일
    const p = G.player;
    if (G.mode === 'play' && p && !G.busy) {
      for (const tr of G.triggers) {
        if (tr.done) continue;
        if (tr.if && !tr.if(G)) continue;
        if (tr.layers && !tr.layers.includes(p.layer.id)) continue;
        const hit = tr.x1 !== undefined ? (p.x >= tr.x0 && p.x <= tr.x1) : (tr.dir === -1 ? p.x <= tr.x : p.x >= tr.x);
        if (!hit) continue;
        tr.done = true;
        // 대사가 끝나면 가던 길을 마저 간다 (장면이 바뀌거나 자리를 옮긴 경우는 빼고)
        const was = { goal: p.goal, thing: G.pendingThing, x: p.x, ep: G.epoch };
        p.path = []; p.goal = null; G.pendingThing = null;
        G.run(tr.run).then(() => {
          if (!was.goal || was.ep !== G.epoch || G.player !== p || G.mode !== 'play') return;
          if (p.path.length || p.goal || Math.abs(p.x - was.x) > 6) return;
          G.goTo(p, was.goal.wx, was.goal.wy, was.goal.opt);
          G.pendingThing = was.thing;
        });
        break;
      }
      // 눌러 둔 사물에 닿았는가
      if (G.pendingThing && !p.path.length) {
        const t = G.pendingThing; G.pendingThing = null;
        const pos = thingPos(t);
        const sx = t.standX === undefined ? pos.x : t.standX;
        if (t.visible && !t.gone && Math.abs(p.x - sx) < (t.touch || 54) && Math.abs(p.y - pos.y) < (t.touchY || 70)) {
          p.dir = pos.x >= p.x ? 1 : -1;
          G.run((g) => t.tap(g, t));
        } else {
          p.emote = { txt: '…', t: 1.4 };
        }
      }
    }

    // 시간대
    const todTarget = G.todOverride !== null ? G.todOverride : todFor(G.level, p ? p.x : 0);
    G.tod = G.todOverride !== null ? todTarget : U.approach(G.tod, todTarget, 1.2, dt);
    G.eyes = U.approach(G.eyes === undefined ? 1 : G.eyes, (G.lantern.has && !G.lantern.on) ? 0.66 : 1, 1.6, dt);   // 불을 끄면 눈이 어둠에 익는다
    G.shadowSolid = U.approach(G.shadowSolid, (G.lantern.has && !G.lantern.on && G.S && G.S.shadowWalk) ? 1 : 0, 5, dt);
    Au.setMood(G.tod, G.level.theme, G.lantern.on || !G.lantern.has);

    // 카메라
    const W = R.W, maxX = Math.max(0, G.level.width - W);
    if (G.cam.script) {
      G.cam.x = U.clamp(G.cam.script.x, 0, maxX);
    } else if (G.level.camCenter !== undefined) {
      G.cam.x = U.clamp(G.level.camCenter - W / 2, 0, maxX);
    } else if (p) {
      if (p.moving > 0.5 && !(G.pointer && G.pointer.kind === 'pan')) G.cam.pan = U.approach(G.cam.pan, 0, 1.6, dt);
      const lead = (G.level.camLead === undefined ? 0.42 : G.level.camLead);
      const tx = U.clamp(p.x - W * lead + p.dir * 50 + G.cam.pan, 0, maxX);
      G.cam.x = U.approach(G.cam.x, tx, 2.6, dt);
    }

    // 입자
    for (let i = G.particles.length - 1; i >= 0; i--) {
      const q = G.particles[i];
      q.life += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += (q.g === undefined ? 30 : q.g) * dt; q.vx *= 0.985;
      if (q.life >= q.max) G.particles.splice(i, 1);
    }
    if (G.tapMark) { G.tapMark.t += dt; if (G.tapMark.t > 0.6) G.tapMark = null; }
    Au.rumble(G.pointer && G.pointer.kind === 'knob' && G.pointer.moved ? Math.min(0.4, 0.1 + (G.pointer.vel || 0) * 0.01) : 0);
    if (G.pointer) G.pointer.vel = U.approach(G.pointer.vel || 0, 0, 6, dt);
  };

  /* ───────── 입력 ───────── */
  function toWorld(e) {
    const rect = R.canvas.getBoundingClientRect();
    const sx = (e.clientX - rect.left) / R.cssScale, sy = (e.clientY - rect.top) / R.cssScale;
    return { sx, sy, wx: sx + G.cam.x, wy: sy };
  }
  function dragAgents() { return G.agents.filter((a) => a.visible && a.layer && a.kind !== 'boat'); }
  function knobUnder(wx, wy) {
    const L = G.terrain.hit(wx, wy);
    if (!L) return null;
    const k = L.knobAt(wx);
    if (!k || (L.def.lock && !G.flags[L.def.lock])) return null;
    return { L, k };
  }

  function bindInput(canvas) {
    canvas.addEventListener('pointerdown', (e) => {
      Au.unlock();
      if (G.mode !== 'play' || G.busy || G.paused || !G.player) return;
      e.preventDefault();
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* 무시 */ }
      const w = toWorld(e);
      const p = (G.pointer = { id: e.pointerId, sx0: w.sx, sy0: w.sy, wx: w.wx, wy: w.wy, moved: false, kind: 'pan', pan0: G.cam.pan, vel: 0 });
      const hit = knobUnder(w.wx, w.wy);
      if (hit) {
        if (G.terrain.underfoot(hit.L, hit.k, G.agents.filter((a) => !a.rides && a.visible))) { p.kind = 'locked'; p.L = hit.L; p.k = hit.k; }
        else { p.kind = 'knob'; p.L = hit.L; p.k = hit.k; p.v0 = hit.k.v; p.bell = Math.max(0.45, hit.L.bell(hit.k, w.wx)); }
      }
    });
    canvas.addEventListener('pointermove', (e) => {
      const w = toWorld(e);
      const p = G.pointer;
      if (!p || p.id !== e.pointerId) {
        if (G.mode === 'play' && !G.busy && e.pointerType === 'mouse') {
          G.hover = knobUnder(w.wx, w.wy);
          canvas.style.cursor = G.hover ? 'ns-resize' : 'pointer';
        }
        return;
      }
      const dx = w.sx - p.sx0, dy = w.sy - p.sy0;
      if (!p.moved && Math.hypot(dx, dy) > 7) p.moved = true;
      if (!p.moved) return;
      if (p.kind === 'knob') {
        if (G.busy) return;
        const before = p.k.v;
        G.terrain.drag(p.L, p.k, p.v0 + dy / p.bell, dragAgents().concat(G.agents.filter((a) => a.kind === 'boat' && false)));
        p.vel = (p.vel || 0) + Math.abs(p.k.v - before);
        if (G.level.onDrag && p.k.v !== before) G.level.onDrag(G.api(), p.L, p.k);
      } else if (p.kind === 'pan') {
        const W = R.W, maxX = Math.max(0, G.level.width - W);
        G.cam.pan = U.clamp(p.pan0 - dx, -G.cam.x - 2000, maxX + 2000);
      } else if (p.kind === 'locked' && !p.told) {
        p.told = true;
        Au.sfx('no');
        UI.toast('발밑의 땅은 움직일 수 없어요. 다른 곳으로 옮겨 가서 끌어 보세요.', 3600);
      }
    });
    const up = (e) => {
      const p = G.pointer;
      if (!p || p.id !== e.pointerId) return;
      G.pointer = null;
      if (G.mode !== 'play' || G.busy) return;
      if (!p.moved) { tap(p.wx, p.wy); return; }
      if (p.kind === 'knob') {
        Au.sfx('tap');
        G.flags.dragged = (G.flags.dragged || 0) + 1;
        if (G.level.onDragEnd) G.level.onDragEnd(G.api(), p.L, p.k);
      }
    };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    root.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      if ((e.key === 'l' || e.key === 'L' || e.key === 'f' || e.key === 'F') && !UI.talking()) G.toggleLantern();
      if (e.key === 'Escape') UI.openMenu();
    });
  }

  function tap(wx, wy) {
    const p = G.player;
    // 누를 수 있는 사물
    let best = null, bd = Infinity;
    for (const t of G.things) {
      if (!t.tap || !t.visible || t.gone) continue;
      if (t.if && !t.if(G)) continue;
      const pos = thingPos(t);
      const cx = t.sky ? pos.x - G.cam.x * (t.par || 0) + G.cam.x : pos.x;
      const d = Math.hypot(wx - cx, wy - (pos.y - (t.sky ? 0 : t.dy)));
      if (d < t.r && d < bd) { bd = d; best = t; }
    }
    G.tapMark = { x: wx, y: wy, t: 0, thing: !!best };
    Au.sfx('tap');
    if (best) {
      if (best.sky || best.remote) {
        if (!best.zone || (p.x >= best.zone[0] && p.x <= best.zone[1])) { G.run((g) => best.tap(g, best)); return; }
        p.emote = { txt: '…', t: 1.4 };
        return;
      }
      const pos = thingPos(best);
      const sx = best.standX === undefined ? pos.x : best.standX;
      G.goTo(p, sx, pos.y, { layer: best.standLayer || best.layer });
      G.pendingThing = best;
      return;
    }
    G.pendingThing = null;
    const ok = G.goTo(p, wx, wy);
    G.flags.walked = (G.flags.walked || 0) + 1;
    if (!ok && G.level.onStuck) G.level.onStuck(G.api());
  }
  G.tap = tap;

  /* ───────── 그리기 (렌더러가 부른다) ───────── */
  G.drawLayerThings = function (ctx, L, env, camX) {
    const ter = G.terrain, t = G.time;
    for (const th of G.things) {
      if (th.layerRef !== L || !th.visible || th.gone) continue;
      if (th.if && !th.if(G)) continue;
      const sx = th.x - camX;
      if (sx < -200 || sx > R.W + 200) continue;
      const y = ter.yAt(L, th.x);
      ctx.save();
      if (th.kind === 'soot') {
        Art.soot(ctx, sx, y + 4, th.rad, t, { awake: th.awake, fade: th.fade, seed: th.seed });
      } else if (th.kind === 'spirit') {
        if (!th.hiddenBody) {
          Art.spirit(ctx, th.spirit, sx, y - (th.dy || 30), t, { tired: th.tired, scale: th.scale, alpha: th.alpha });
          R.lights.push({ x: sx, y: y - (th.dy || 30), r: 120 * (th.scale || 1), a: 0.85 });
        }
      } else if (th.kind === 'npc') {
        Art.folk(ctx, sx, y, { who: th.who, dir: th.dir || -1, t, tint: (c) => env.shade(c), shiver: th.shiver, pole: th.pole, alpha: th.alpha });
      } else if (th.kind === 'girl') {
        Art.girl(ctx, th.who, sx, y, { h: th.h || 112, dir: th.dir || 1, t, variant: th.variant, alpha: th.alpha });
      } else {
        ctx.translate(sx, y);
        env.layer = L; env.ax = th.x;
        if (th.alpha !== undefined) ctx.globalAlpha = th.alpha;
        Art.prop(ctx, th.kind === 'spot' ? (th.mark || 'spark') : th.kind, env, th);
        env.layer = null;
      }
      ctx.restore();
    }
    // 인물: 따르는 이 먼저, 이끄는 이 나중
    for (const a of G.agents) {
      if (a.layer !== L || !a.visible) continue;
      drawAgent(ctx, a, env, camX);
    }
  };

  function drawAgent(ctx, a, env, camX) {
    const sx = a.x - camX, t = G.time;
    if (sx < -200 || sx > R.W + 200) return;
    ctx.save();
    if (a.alpha !== 1) ctx.globalAlpha = a.alpha;
    let hand = null;
    if (a.kind === 'day' || a.kind === 'night') {
      hand = Art.girl(ctx, a.kind, sx, a.y + 3, { h: a.h, dir: a.dir, phase: a.phase, moving: a.moving, t, variant: a.variant });
    } else if (a.kind === 'boat') {
      ctx.translate(sx, a.y + Math.sin(t * 1.5 + a.x * 0.01) * 2);
      Art.prop(ctx, 'boat', env, { dir: a.dir, seed: a.seed || 0, home: a.home, hull: a.hull, sail: a.sail, s: a.s || 1 });
    } else {
      hand = Art.folk(ctx, sx, a.y + 2, { who: a.kind, dir: a.dir, phase: a.phase, moving: a.moving, t, tint: (c) => env.shade(c), pole: a.pole && !a.lantern, shiver: a.shiver });
    }
    ctx.restore();
    if (hand && a.lantern && G.lantern.has) {
      const lp = Art.lantern(ctx, hand.x, hand.y, G.lantern.on, t, Math.sin(a.phase) * 0.12 * a.moving);
      G.lanternPos = { x: lp.x + camX, y: lp.y };
      if (G.lantern.on) {
        const dark = U.clamp(R.pal.dark / 0.4, 0.25, 1);
        const flick = 1 + Math.sin(t * 9) * 0.012 + Math.sin(t * 23) * 0.008;
        R.lights.push({ x: lp.x, y: lp.y, r: (G.level.lightR || 250) * flick, a: 0.96, warm: dark });
        R.glows.push({ x: lp.x * R.scale, y: lp.y * R.scale, r: 26 * R.scale, rgb: [255, 226, 150], a: 0.55 * dark + 0.15 });
      }
    }
    if (a.emote) {
      const k = Math.min(1, a.emote.t * 3);
      ctx.save(); ctx.globalAlpha = k;
      ctx.fillStyle = 'rgba(250,244,230,0.92)';
      const ex = sx + a.dir * 16, ey = a.y - a.h - 14;
      ctx.beginPath(); ctx.arc(ex, ey, 13, 0, TAU); ctx.fill();
      ctx.fillStyle = '#3a2f2a'; ctx.font = '700 16px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(a.emote.txt, ex, ey + 1);
      ctx.restore();
    }
  }

  G.drawOver = function (ctx, env, camX) {
    if (G.level.drawOver) G.level.drawOver(ctx, G, env, camX);
    for (const q of G.particles) {
      if (q.add) continue;
      const k = 1 - q.life / q.max;
      ctx.fillStyle = `rgba(${q.col[0]},${q.col[1]},${q.col[2]},${0.7 * k})`;
      ctx.beginPath(); ctx.arc(q.x - camX, q.y, q.r * (0.6 + k), 0, TAU); ctx.fill();
    }
  };

  G.drawTop = function (ctx, env, camX) {
    const ter = G.terrain, t = G.time;
    // 빛나는 입자
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const q of G.particles) {
      if (!q.add) continue;
      const k = 1 - q.life / q.max;
      ctx.fillStyle = `rgba(${q.col[0]},${q.col[1]},${q.col[2]},${k})`;
      ctx.beginPath(); ctx.arc(q.x - camX, q.y, q.r, 0, TAU); ctx.fill();
    }
    ctx.restore();
    if (G.level.drawTop) G.level.drawTop(ctx, G, env, camX);

    // 끌 수 있는 언덕의 손잡이
    if (G.mode === 'play' && !G.busy) {
      const walkers = G.agents.filter((a) => !a.rides && a.visible);
      for (const L of ter.layers) {
        if (L.def.lock && !G.flags[L.def.lock]) continue;
        for (const k of L.knobs) {
          if (k.lo === k.hi || !k.hint) continue;
          const sx = k.c - camX;
          if (sx < 20 || sx > R.W - 20) continue;
          const i = Math.round(k.c / T.STEP);
          if (ter.hiddenAt(L, i)) continue;
          const y = L.ys[i];
          if (y > 690) continue;
          const active = (G.pointer && G.pointer.k === k) || (G.hover && G.hover.k === k);
          const locked = ter.underfoot(L, k, walkers);
          const pulse = 0.5 + 0.5 * Math.sin(t * 2.4 + k.c * 0.01);
          const a = locked ? 0.16 : active ? 0.95 : 0.34 + pulse * 0.3;
          const off = active ? 3 : pulse * 3;
          ctx.save();
          ctx.translate(sx, y);
          ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          for (const pass of [0, 1]) {
            ctx.strokeStyle = pass === 0 ? `rgba(40,30,44,${a * 0.55})` : `rgba(255,250,235,${a})`;
            ctx.lineWidth = pass === 0 ? 5 : 2.4;
            ctx.beginPath();
            if (k.v > k.lo + 1) { ctx.moveTo(-9, -15 - off); ctx.lineTo(0, -24 - off); ctx.lineTo(9, -15 - off); }
            if (k.v < k.hi - 1) { ctx.moveTo(-9, 15 + off); ctx.lineTo(0, 24 + off); ctx.lineTo(9, 15 + off); }
            ctx.stroke();
          }
          ctx.restore();
        }
      }
    }
    // 누른 자리
    if (G.tapMark) {
      const k = G.tapMark.t / 0.6;
      ctx.strokeStyle = G.tapMark.thing ? `rgba(255,236,170,${1 - k})` : `rgba(255,252,240,${0.8 * (1 - k)})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(G.tapMark.x - camX, G.tapMark.y, 8 + k * 22, (8 + k * 22) * 0.7, 0, 0, TAU); ctx.stroke();
    }
  };

  G.drawMural = function (ctx, b, ox, pal, t) { if (G.level.drawMural) G.level.drawMural(ctx, G, b, ox, pal, t); };

  /* ───────── 결말 ───────── */
  G.finish = async function () {
    const E = DN.Story.decide(G.S);
    G.mode = 'ending';
    refreshHud();
    if (!G.meta.endings.includes(E.id)) G.meta.endings.push(E.id);
    G.meta.runs++;
    G.lastEnding = E.id;
    const S = G.S;
    store({ meta: G.meta, S: null });
    G.saved = null;
    await DN.Story.playEnding(makeApi(G.epoch), E, S);
    Au.sfx('end');
    const act = await UI.ending(E, G.meta, DN.ENDINGS.length);
    if (act === 'again') {
      G.S = newRun();
      await UI.fade(true, 900);
      G.startChapter(0);
    } else {
      await UI.fade(true, 700);
      G.toTitle();
    }
  };

  if (root.document) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', G.boot);
    else G.boot();
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
