/* 데이 & 나이트 — 게임 본체
 * 누르면 걷고, 등불을 다룬다: 들고 다니거나, 고리에 걸거나, 빛의 크기를 끌어서 바꾼다.
 * 등불 둘레의 동그란 빛 안은 낮, 밖은 밤, 가장자리는 황혼이다 (terrain.js 참고).
 */
(function (root) {
  'use strict';
  const DN = (root.DN = root.DN || {});
  const U = DN.U, T = DN.T, Art = DN.Art, R = DN.Render, UI = DN.UI, Au = DN.Audio;
  const TAU = Math.PI * 2;
  const SAVE_KEY = 'day-and-night-v2';
  const CANCEL = { cancelled: true };
  const R_OPEN = 190, R_MAX = 240, R_MIN = 52, REACH = 580;

  const G = (DN.Game = {
    mode: 'boot',           // boot | title | play | ending
    time: 0, tod: 1, todOverride: null,
    isNight: false, dayR: null, dayTod: 0.12,
    level: null, terrain: null,
    agents: [], things: [], triggers: [], particles: [], tweens: [], waits: [],
    player: null, day: null, hari: null, night: null,
    flags: {},
    cam: { x: 0, pan: 0, script: null },
    lan: { has: false, mode: 'held', hook: null, holder: null, x: 0, y: 0, r: 0, open: R_OPEN, closed: false, fly: null },
    busy: 0, paused: false, epoch: 0, speed: 1,
    S: null, meta: { runs: 0, endings: [] },
    pointer: null, tapMark: null,
    starAmount: 0, lastStar: null, sun: null, farLights: 1, eyes: 1,
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
    const again = G.meta.runs > 0;
    return {
      ci: 0, run: G.meta.runs + 1,
      A: {},                            // 빛의 행방: 정령 → 'human' | 'night'
      B: 0,                             // 나이트와의 관계 점수
      C: { hari: false, night: false }, // 고백
      bond: 0,                          // 하리와의 유대
      clues: [],                        // 황혼의 단서
      wish: null,                       // 최종장의 마지막 말
      // 배운 것들
      lantern: false,                   // 등불 (프롤로그)
      hooks: false,                     // 등불 걸기 (1장, 하리)
      shutter: false,                   // 빛을 줄이고 끄기 (2장)
      shadowWalk: false,                // 그림자 걸음 (3장)
      duskSight: false,                 // 가장자리에서 기억 조각 보기 (4장)
      duskWalk: again,                  // 황혼 걸음 — 지난 여정의 기억은 처음부터 남아 있다
      hari: false,
    };
  }
  G.newRun = newRun;

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
        if (q.get('run')) G.meta.runs = parseInt(q.get('run'), 10) - 1;
        G.S = newRun();
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
    refreshHud();
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
    G.snap = JSON.stringify(G.S);      // 이 장을 다시 시작할 때 돌아갈 상태
    G.save();
    const level = DN.LEVELS[DN.CHAPTERS[ci]];
    loadLevel(level);
    refreshHud();
    await UI.fade(false, instant ? 10 : 1100);
    if (ep !== G.epoch) return;
    if (level.title) UI.card(level.title, level.sub);
    if (level.intro) G.run(level.intro);
  };

  G.restartChapter = function () {
    if (!G.S) return;
    if (G.snap) G.S = JSON.parse(G.snap);   // 이 장에서 한 선택은 없던 일이 된다
    G.startChapter(G.S.ci);
  };

  G.nextChapter = function () {
    const ci = G.S.ci + 1;
    if (ci < DN.CHAPTERS.length) G.startChapter(ci);
  };

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

  G.loadEnding = function (cfg) { G.endingCfg = cfg; loadLevel(DN.LEVELS.ending); };

  /* ───────── 장면 불러오기 ───────── */
  function loadLevel(level) {
    G.level = level;
    G.terrain = new DN.Terrain(level);
    G.flags = {};
    G.terrain.flags = G.flags;
    if (G.S) { G.flags.run2 = G.S.run >= 2; for (const k in G.S.A) G.flags['A_' + k] = G.S.A[k]; }
    G.agents = []; G.things = []; G.triggers = []; G.particles = []; G.tweens = []; G.waits = [];
    G.day = G.hari = G.night = G.player = null;
    G.cam.pan = 0; G.cam.script = null;
    G.todOverride = null;
    G.sun = null; G.lastStar = null; G.starAmount = 0; G.farLights = 1; G.eyes = 1;
    G.pointer = null; G.tapMark = null; G.pendingThing = null;
    G.isNight = !!level.night; G.dayR = null; G.dayTod = level.dayTod === undefined ? 0.12 : level.dayTod;
    G.rMax = level.rMax || R_MAX;
    const sky = level.sky || {};
    if (sky.sun) G.sun = Object.assign({ a: 1 }, sky.sun);
    if (sky.lastStar) G.lastStar = Object.assign({ a: 0 }, sky.lastStar);
    if (sky.stars) G.starAmount = sky.stars;
    const lan = G.lan;
    lan.has = !!(G.S && G.S.lantern) && !level.noLantern;
    lan.mode = 'held'; lan.hook = null; lan.fly = null; lan.holder = null;
    lan.open = level.rOpen || R_OPEN; lan.closed = !!level.startClosed; lan.r = lan.closed || !lan.has ? 0 : lan.open;
    R.prepare(level, G.terrain);

    if (level.start) {
      const kind = level.startAs || 'day';
      const a = G.addAgent({ id: kind, kind, layer: level.start.layer, x: level.start.x, dir: level.start.dir || 1, h: level.start.h });
      G.player = a;
      if (kind === 'day') { G.day = a; lan.holder = a; } else G.night = a;
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
    placeLantern();
    G.lightSig = '';
    updateLight();
    const W = R.W;
    G.cam.x = U.clamp((G.player ? G.player.x : 0) - W * 0.4, 0, Math.max(0, level.width - W));
    if (level.camCenter !== undefined) G.cam.x = U.clamp(level.camCenter - W / 2, 0, Math.max(0, level.width - W));
  }

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
  const HEIGHT = { day: 104, night: 104, hari: 70, child: 62, keeper: 92, boat: 0 };
  G.addAgent = function (def) {
    const a = Object.assign({
      kind: 'day', dir: 1, phase: Math.random() * 6, moving: 0, path: [], speed: 118,
      visible: true, alpha: 1, goal: null, done: null, trail: [], ti: 0, emote: null,
    }, def);
    a.layer = G.terrain.layer(a.layer);
    a.y = G.terrain.yAt(a.layer, a.x);
    a.h = def.h || HEIGHT[a.kind];
    G.agents.push(a);
    return a;
  };
  G.agent = (id) => G.agents.find((a) => a.id === id);

  G.modeFor = function (a) {
    const S = G.S || {};
    if (a.kind === 'boat') return { water: true, star: !!(G.flags.starSeen && G.lan.r < 8) };
    return { shadow: !!S.shadowWalk, dusk: !!S.duskWalk && G.lan.mode === 'hung', shy: a.kind === 'night' && a === G.player };
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
      const n = ter.nearest(r, wx, wy, ter.hit(wx, wy + 4));
      node = n.node; exact = n.dist < 46;
    }
    a.path = ter.path(r, node);
    a.goal = { wx, wy, opt, version: ter.version, exact };
    return exact;
  };

  function updateAgent(a, dt) {
    const ter = G.terrain;
    if (a.follow) { updateFollower(a, dt); return; }
    if (a.goal && a.goal.version !== ter.version) G.goTo(a, a.goal.wx, a.goal.wy, a.goal.opt);   // 빛이 바뀌면 길을 다시 찾는다
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
    const tr = a.trail, last = tr[tr.length - 1];   // 따라오는 이를 위한 발자취
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
      if (p.layer !== a.layer) a.layer = p.layer;
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
    if (a.y >= T.ABSENT) a.y = lead.y;
    a.moving = U.approach(a.moving, walking ? 1 : 0, 10, dt);
    if (walking) a.phase += dt * 11;
    if (a.emote) { a.emote.t -= dt; if (a.emote.t <= 0) a.emote = null; }
  }

  /** 앞장서는 이를 바꾼다 (5장: 하리가 등불을 들고 데이를 이끈다) */
  G.setLead = function (lead, follower) {
    G.player = lead;
    lead.follow = null; lead.trail = []; lead.path = []; lead.goal = null;
    if (follower) { follower.follow = lead; follower.ti = 0; follower.path = []; follower.goal = null; }
    if (G.lan.mode === 'held') G.lan.holder = lead;
  };

  /* ───────── 사물 ───────── */
  G.addThing = function (def) {
    const t = Object.assign({ kind: 'spot', r: 46, dy: 30, visible: true, gone: false, seed: Math.random() * 100, vis: 1 }, def);
    t.layerRef = t.layer ? G.terrain.layer(t.layer) : null;
    G.things.push(t);
    return t;
  };
  G.thing = (id) => G.things.find((t) => t.id === id);

  /** 사물의 세계 좌표 (발치). up 이 있으면 능선에서 그만큼 위 */
  function thingPos(t) {
    if (t.layerRef) return { x: t.x, y: G.terrain.yAt(t.layerRef, t.x) };
    return { x: t.x, y: t.y };
  }
  /** 눌러야 하는 자리 / 빛을 재는 자리 */
  function thingPoint(t) {
    const p = thingPos(t);
    return { x: p.x, y: p.y - (t.layerRef ? (t.up !== undefined ? t.up : t.dy) : 0) };
  }
  G.thingPoint = thingPoint;

  function refreshBlocks() {
    const list = [];
    for (const t of G.things) {
      if (t.kind !== 'soot' || t.gone) continue;
      const span = { layer: t.layer, x0: t.x - t.rad * 0.8, x1: t.x + t.rad * 0.8 };
      if (t.type === 'eater') list.push(Object.assign(span, { when: 'day' }));       // 빛을 먹는 그을음: 빛 속에서 깨어나 막는다
      else if (t.type === 'dense') list.push(Object.assign(span, { dense: true }));  // 짙은 그을음: 모아진 빛에만 흩어진다
      else list.push(Object.assign(span, { when: 'night' }));                        // 두려움: 어둠 속에서만 버틴다
    }
    for (const b of (G.level.blocks || [])) if (!b.unless || !G.flags[b.unless]) list.push(Object.assign({ always: !b.when && !b.dense }, b));
    G.terrain.setBlocks(list);
  }
  G.refreshBlocks = refreshBlocks;

  G.sparkle = function (x, y, rgb, n, spread) {
    for (let i = 0; i < (n || 14); i++) {
      const a = Math.random() * TAU, sp = (spread || 60) * (0.3 + Math.random());
      G.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 20, life: 0, max: 0.6 + Math.random() * 0.9, r: 1 + Math.random() * 2, col: rgb || [255, 236, 180], add: true });
    }
  };

  /* ───────── 등불 ─────────
   * held : 누군가 들고 있다. 빛의 원이 그 사람을 따라다닌다.
   * hung : 고리에 걸려 있다. 원은 그 자리에 머문다. (황혼 걸음을 배웠다면 가장자리를 디딜 수 있다)
   * fly  : 고리로, 또는 손으로 날아가는 중. */
  function heldPoint(a) { return { x: a.x + a.dir * 15 * (a.h / 104 || 1), y: a.y - (a.kind === 'day' ? 46 : 30) * (a.kind === 'day' ? a.h / 104 : 1) }; }

  /** 등불의 자리를 정한다. dt 를 주면 돌아설 때 부드럽게 따라가고, 안 주면 곧바로 옮긴다. */
  function placeLantern(dt) {
    const lan = G.lan;
    if (lan.mode === 'fly' && lan.fly) {
      const f = lan.fly, k = U.easeInOut(f.k);
      const to = f.hook ? thingPoint(f.hook) : heldPoint(lan.holder);
      lan.x = U.lerp(f.x0, to.x, k); lan.y = U.lerp(f.y0, to.y, k) - Math.sin(k * Math.PI) * 46;
    } else if (lan.mode === 'hung' && lan.hook) {
      const p = thingPoint(lan.hook); lan.x = p.x; lan.y = p.y;
    } else if (lan.holder) {
      const p = heldPoint(lan.holder);
      lan.x = dt && !DN.AUTO ? U.approach(lan.x, p.x, 14, dt) : p.x; lan.y = p.y;
    }
  }

  /** 지금의 빛의 원들 (세계 좌표) */
  function bubbles() {
    const lan = G.lan, list = [];
    if (!G.isNight) return list;
    const r = Math.max(lan.has ? lan.r : 0, G.dayR || 0);
    if (r > 6) {
      const c = lan.has ? lan : (G.player ? { x: G.player.x, y: G.player.y - 46 } : { x: 0, y: 0 });
      list.push({ x: c.x, y: c.y, r, main: true });
    }
    for (const t of G.things) {
      if (t.light && (!t.light.flag || G.flags[t.light.flag]) && !t.gone) {
        const p = thingPoint(t);
        list.push({ x: p.x, y: p.y, r: t.light.r, soft: true, focus: !!t.light.focus });
      }
    }
    // 종과 거울: 빛을 받으면 모아서 다른 곳에 비춘다 (이어 비추기도 한다)
    for (const t of G.things) if (t.kind === 'mirror') t.on = false;
    for (let pass = 0; pass < 2; pass++) {
      for (const t of G.things) {
        if (t.kind !== 'mirror' || t.on) continue;
        const p = thingPoint(t);
        if (list.some((b) => Math.hypot(p.x - b.x, p.y - b.y) < b.r - T.RIM)) {
          t.on = true;
          list.push({ x: t.fx, y: t.fy, r: t.fr, focus: true, from: t });
        }
      }
    }
    if (G.level.bubbles) for (const b of G.level.bubbles(G)) list.push(b);
    return list;
  }

  function updateLight() {
    const lan = G.lan, ter = G.terrain;
    const list = bubbles();
    let sig = G.isNight ? 'N' : 'D';
    for (const b of list) sig += `|${Math.round(b.x / 2)},${Math.round(b.y / 2)},${Math.round(b.r / 2)}`;
    const arcOn = G.isNight && lan.has && lan.mode === 'hung' && G.dayR === null && G.S && G.S.duskWalk && lan.r > 40;
    sig += arcOn ? '|A' : '';
    if (sig === G.lightSig) return;
    G.lightSig = sig;
    G.bubbleList = list;
    ter.setLight(list, !G.isNight);
    if (arcOn) ter.setArc(lan.x, lan.y, lan.r); else if (ter.arc) ter.setArc(0, 0, 0);
  }
  G.updateLight = () => { G.lightSig = ''; updateLight(); };

  /** 화면 좌표의 빛의 원들 (렌더러가 쓴다) */
  G.screenBubbles = function () {
    const lan = G.lan, walk = G.terrain.arc !== null;
    return (G.bubbleList || []).map((b) => ({ x: b.x - G.cam.x, y: b.y, r: b.r, soft: b.soft, walk: walk && b.main }));
  };

  /** 서 있는 자리가 여전히 디딜 수 있는 곳인가 */
  function footOK() {
    const p = G.player;
    if (!p) return true;
    return G.terrain.standable(p.layer, Math.round(p.x / T.STEP), G.modeFor(p));
  }

  /** 등불을 바꿔 보고, 발밑이 사라지면 되돌린다 */
  function tryLantern(change, why) {
    const lan = G.lan;
    const keep = { mode: lan.mode, hook: lan.hook, r: lan.r, open: lan.open, closed: lan.closed, x: lan.x, y: lan.y, fly: lan.fly };
    const was = footOK();
    change();
    placeLantern();
    G.updateLight();
    if (was && !footOK()) {
      Object.assign(lan, keep);
      placeLantern();
      G.updateLight();
      if (why !== false) { UI.lanternShake(); Au.sfx('no'); UI.toast(why || '빛을 바꾸면 발밑의 길이 사라져요. 단단한 곳으로 먼저 옮겨 가세요.', 3600); }
      return false;
    }
    return true;
  }

  /** 빛의 크기를 정한다 (0 = 끔) */
  G.setRadius = function (r, quiet) {
    const lan = G.lan;
    if (!lan.has) return false;
    r = r < R_MIN * 0.75 ? 0 : U.clamp(r, R_MIN, G.rMax);
    const before = lan.closed;
    const ok = tryLantern(() => { lan.closed = r === 0; if (r > 0) lan.open = r; lan.r = r; }, quiet ? false : undefined);
    if (ok && before !== lan.closed) { Au.sfx(lan.closed ? 'off' : 'on'); if (G.level.onLantern) G.level.onLantern(makeApi(G.epoch), !lan.closed); }
    refreshHud();
    return ok;
  };

  G.toggleLantern = function () {
    const lan = G.lan;
    if (G.mode !== 'play' || G.paused || !lan.has) return;
    if (G.busy && !G.flags.lanternFree) return;
    if (!(G.S && G.S.shutter)) { UI.lanternShake(); return; }
    G.setRadius(lan.closed ? lan.open : 0);
  };

  /** 등불을 고리에 건다 */
  G.hangAt = function (hook) {
    const lan = G.lan;
    if (!lan.has || lan.mode === 'fly') return false;
    const from = { x: lan.x, y: lan.y };
    const ok = tryLantern(() => { lan.mode = 'hung'; lan.hook = hook; });
    if (!ok) return false;
    Au.sfx('chime');
    lan.mode = 'fly'; lan.fly = { x0: from.x, y0: from.y, hook, k: 0 };
    placeLantern(); G.updateLight();
    G.tween(lan.fly, 'k', 1, 0.5).then(() => {
      lan.mode = 'hung'; lan.hook = hook; lan.fly = null; placeLantern(); G.updateLight();
      if (G.level.openOnHang && lan.closed) G.setRadius(lan.open, true);   // 밤의 영역에서는 걸자마자 빛을 연다
      refreshHud();
    });
    refreshHud();
    return true;
  };

  /** 등불을 손으로 불러들인다. 들고 있으면 발밑이 사라질 때는 덮어서 불러온다. */
  G.recall = function () {
    const lan = G.lan;
    if (!lan.has || lan.mode !== 'hung') return false;
    const from = { x: lan.x, y: lan.y };
    let ok = tryLantern(() => { lan.mode = 'held'; lan.hook = null; }, false);
    if (!ok) ok = tryLantern(() => { lan.mode = 'held'; lan.hook = null; lan.closed = true; lan.r = 0; });
    if (!ok) return false;
    Au.sfx('pick');
    lan.mode = 'fly'; lan.fly = { x0: from.x, y0: from.y, hook: null, k: 0 };
    placeLantern(); G.updateLight();
    G.tween(lan.fly, 'k', 1, 0.45).then(() => { lan.mode = 'held'; lan.fly = null; placeLantern(); G.updateLight(); refreshHud(); });
    refreshHud();
    return true;
  };

  function refreshHud() {
    const lan = G.lan, S = G.S || {};
    UI.hud({
      show: G.mode === 'play',
      lantern: lan.has && !!S.shutter && !(G.level && G.level.lockLantern),
      on: !lan.closed,
      recall: lan.has && lan.mode === 'hung',
      nudge: !!G.flags.nudgeLantern,
    });
  }
  G.refreshHud = refreshHud;

  /* 밤이 온다: 낮이 등불 안으로 오므라든다 / 날이 샌다: 낮이 다시 온 세상으로 퍼진다 */
  G.nightfall = async function (dur) {
    G.todOverride = null;
    G.dayR = 1700; G.isNight = true;
    G.dayTod = G.tod;
    G.updateLight();
    Au.sfx('dark');
    const target = G.lan.has ? G.lan.r : 0;
    await Promise.all([G.tween(G, 'dayR', Math.max(target, 1), dur || 3.2, U.easeInOut), G.tween(G, 'dayTod', G.level.dayTod === undefined ? 0.12 : G.level.dayTod, dur || 3.2)]);
    G.dayR = null;
    G.updateLight();
  };
  G.daybreak = async function (dur) {
    G.dayR = Math.max(G.lan.has ? G.lan.r : 0, 1);
    await Promise.all([G.tween(G, 'dayR', 1900, dur || 3.4, U.easeInOut), G.tween(G, 'dayTod', 3, dur || 3.4)]);
    G.tod = 3; G.todOverride = 3;
    G.isNight = false; G.dayR = null;
    for (const a of G.agents) if (a.kind === 'night' && a !== G.player) a.visible = false;   // 나이트는 낮에 남지 않는다
    G.updateLight();
  };

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
      nightfall: wrap((dur) => G.nightfall(dur)),
      daybreak: wrap((dur) => G.daybreak(dur)),
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
      flag: (k, v) => { G.flags[k] = v === undefined ? true : v; refreshBlocks(); G.updateLight(); refreshHud(); },
      face: (a, dir) => { (typeof a === 'string' ? G.agent(a) : a).dir = dir; },
      /** 배운 것을 적어 둔다: lantern, hooks, shutter, shadowWalk, duskSight, duskWalk */
      learn: (what) => {
        G.S[what] = true;
        if (what === 'lantern') { G.lan.has = true; G.lan.closed = false; G.lan.r = G.lan.open; placeLantern(); }
        G.updateLight(); refreshHud();
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

    // 등불
    const lan = G.lan;
    const want = lan.has && !lan.closed ? lan.open : 0;
    if (!(G.pointer && G.pointer.kind === 'rim')) lan.r = DN.AUTO || Math.abs(lan.r - want) < 1 ? want : U.approach(lan.r, want, 9, dt);
    placeLantern(dt);
    updateLight();
    if (G.level.update) G.level.update(G.api(), dt);
    updateLight();

    // 발 디딘 곳에서 벌어지는 일
    const p = G.player;
    if (G.mode === 'play' && p && !G.busy) {
      for (const tr of G.triggers) {
        if (tr.done) continue;
        if (tr.if && !tr.if(G)) continue;
        if (tr.layers && !tr.layers.includes(p.layer.id)) continue;
        const hit = tr.x1 !== undefined ? (p.x >= tr.x0 && p.x <= tr.x1) : p.x >= tr.x;
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

    // 해가 떠 있는 동안의 하늘빛
    const todTarget = G.todOverride !== null ? G.todOverride : todFor(G.level, p ? p.x : 0);
    G.tod = G.todOverride !== null ? todTarget : U.approach(G.tod, todTarget, 1.2, dt);
    G.eyes = U.approach(G.eyes, (G.isNight && lan.r < 8 && G.dayR === null) ? 0.6 : 1, 1.6, dt);   // 불을 끄면 눈이 어둠에 익는다
    Au.setMood(G.isNight ? 2 : G.tod, G.level.theme, !G.isNight || lan.r > 8);

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

    for (let i = G.particles.length - 1; i >= 0; i--) {
      const q = G.particles[i];
      q.life += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += (q.g === undefined ? 30 : q.g) * dt; q.vx *= 0.985;
      if (q.life >= q.max) G.particles.splice(i, 1);
    }
    if (G.tapMark) { G.tapMark.t += dt; if (G.tapMark.t > 0.6) G.tapMark = null; }
  };

  /* ───────── 입력 ───────── */
  function toWorld(e) {
    const rect = R.canvas.getBoundingClientRect();
    const sx = (e.clientX - rect.left) / R.cssScale, sy = (e.clientY - rect.top) / R.cssScale;
    return { sx, sy, wx: sx + G.cam.x, wy: sy };
  }
  function canShape() { return G.lan.has && G.isNight && G.dayR === null && G.S && G.S.shutter && !G.level.lockLantern && G.lan.mode !== 'fly'; }

  function bindInput(canvas) {
    canvas.addEventListener('pointerdown', (e) => {
      Au.unlock();
      if (G.mode !== 'play' || G.busy || G.paused || !G.player) return;
      e.preventDefault();
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* 무시 */ }
      const w = toWorld(e), lan = G.lan;
      const p = (G.pointer = { id: e.pointerId, sx0: w.sx, sy0: w.sy, wx: w.wx, wy: w.wy, moved: false, kind: 'pan', pan0: G.cam.pan });
      if (canShape()) {
        // 빛의 가장자리를 잡았거나, 등불에서 바깥으로 끌기 시작했다
        const d = Math.hypot(w.wx - lan.x, w.wy - lan.y);
        if ((lan.r > 8 && Math.abs(d - lan.r) < 30) || d < 30) p.kind = 'rim';
      }
    });
    canvas.addEventListener('pointermove', (e) => {
      const w = toWorld(e), p = G.pointer, lan = G.lan;
      if (!p || p.id !== e.pointerId) {
        if (G.mode === 'play' && !G.busy && e.pointerType === 'mouse' && canShape()) {
          const d = Math.hypot(w.wx - lan.x, w.wy - lan.y);
          canvas.style.cursor = (lan.r > 8 && Math.abs(d - lan.r) < 30) || d < 30 ? 'grab' : 'pointer';
        }
        return;
      }
      const dx = w.sx - p.sx0, dy = w.sy - p.sy0;
      if (!p.moved && Math.hypot(dx, dy) > 7) p.moved = true;
      if (!p.moved || G.busy) return;
      if (p.kind === 'rim') {
        const ok = G.setRadius(Math.hypot(w.wx - lan.x, w.wy - lan.y), p.told);
        if (!ok) p.told = true;
      } else if (p.kind === 'pan') {
        const W = R.W, maxX = Math.max(0, G.level.width - W);
        G.cam.pan = U.clamp(p.pan0 - dx, -G.cam.x - 2000, maxX + 2000);
      }
    });
    const up = (e) => {
      const p = G.pointer;
      if (!p || p.id !== e.pointerId) return;
      G.pointer = null;
      if (G.mode !== 'play' || G.busy) return;
      if (!p.moved) { tap(p.wx, p.wy); return; }
      if (p.kind === 'rim') { G.flags.shaped = (G.flags.shaped || 0) + 1; Au.sfx('tap'); }
    };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', (e) => {
      if (G.mode !== 'play' || G.busy || !canShape()) return;
      e.preventDefault();
      const lan = G.lan, cur = lan.closed ? 0 : lan.open;
      G.setRadius(cur + (e.deltaY < 0 ? 14 : -14), true);
    }, { passive: false });
    root.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      if ((e.key === 'l' || e.key === 'L' || e.key === 'f' || e.key === 'F') && !UI.talking()) G.toggleLantern();
      if ((e.key === 'r' || e.key === 'R') && !UI.talking() && !G.busy) G.recall();
      if (e.key === 'Escape') UI.openMenu();
    });
  }

  /** 지금 이 사물을 누를 수 있는가 (황혼에만 있는 것은 가장자리가 닿아야 보인다) */
  function present(t) {
    if (!t.visible || t.gone) return false;
    if (t.if && !t.if(G)) return false;
    if (t.when === 'dusk') { const p = thingPoint(t); return G.isNight && G.terrain.zoneAt(p.x, p.y) === 'dusk'; }
    return true;
  }
  G.present = present;

  function tap(wx, wy) {
    const p = G.player, lan = G.lan;
    // 걸려 있는 등불이나 든 사람을 누르면 불러들인다
    if (lan.has && lan.mode === 'hung' && Math.hypot(wx - lan.x, wy - lan.y) < 34) { G.recall(); return; }
    let best = null, bd = Infinity;
    for (const t of G.things) {
      if (!(t.tap || t.kind === 'hook') || !present(t)) continue;
      if (t.kind === 'hook' && !(G.S && G.S.hooks && lan.has && G.isNight && G.dayR === null)) continue;
      const pt = t.sky ? { x: t.x - G.cam.x * (t.par || 0) + G.cam.x, y: t.y } : thingPoint(t);
      const d = Math.hypot(wx - pt.x, wy - pt.y);
      if (d < t.r && d < bd) { bd = d; best = t; }
    }
    G.tapMark = { x: wx, y: wy, t: 0, thing: !!best };
    Au.sfx('tap');
    if (best && best.kind === 'hook') {
      const pt = thingPoint(best);
      if (Math.hypot(pt.x - p.x, pt.y - (p.y - 40)) > REACH) { p.emote = { txt: '…', t: 1.4 }; UI.toast('너무 멀어요. 조금 더 가까이 가서 걸어 보세요.', 3000); return; }
      if (lan.mode === 'hung' && lan.hook === best) { G.recall(); return; }
      G.hangAt(best);
      return;
    }
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
    G.goTo(p, wx, wy);
    G.flags.walked = (G.flags.walked || 0) + 1;
  }
  G.tap = tap;

  /* ───────── 그리기 (렌더러가 구역마다 부른다) ───────── */
  G.drawLayerThings = function (ctx, L, env, camX) {
    const ter = G.terrain, t = G.time, pass = env.pass;
    for (const th of G.things) {
      if (th.layerRef !== L && !(th.layerRef === null && L.index === ter.layers.length - 1)) continue;
      if (!th.visible || th.gone) continue;
      if (th.if && !th.if(G)) continue;
      if (th.when && th.when !== pass && !(th.when === 'dusk' && th.glint && pass === 'night')) continue;
      const pos = thingPos(th), sx = pos.x - camX, y = pos.y;
      if (sx < -260 || sx > R.W + 260) continue;
      ctx.save();
      if (th.kind === 'soot') {
        if (th.type === 'eater') {
          // 빛 속에서는 깨어 커지고, 어둠 속에서는 웅크려 잔다
          Art.soot(ctx, sx, y + 4, th.rad, t, { awake: pass === 'day' ? 1 : 0.12, seed: th.seed, eater: true });
        } else if (th.type === 'dense') {
          const lit = ter.inFocus(th.x, y - th.rad * 0.8);
          th.vis = U.approach(th.vis, lit ? 0 : 1, 4, 0.016);
          if (th.vis > 0.02) Art.soot(ctx, sx, y + 4, th.rad, t, { awake: 1, fade: 1 - th.vis, seed: th.seed, dense: true });
        } else if (pass === 'night') {
          Art.soot(ctx, sx, y + 4, th.rad, t, { awake: 1, seed: th.seed });
        }
      } else if (th.kind === 'spirit') {
        Art.spirit(ctx, th.spirit, sx, y - (th.dy || 30), t, { tired: th.tired, scale: th.scale, alpha: th.alpha });
      } else if (th.kind === 'npc') {
        Art.folk(ctx, sx, y, { who: th.who, dir: th.dir || -1, t, tint: (c) => env.shade(c), shiver: th.shiver && pass === 'night', pole: th.pole, alpha: th.alpha });
      } else if (th.kind === 'girl') {
        if (!(th.who === 'night' && pass === 'day' && G.isNight && !th.anyZone)) Art.girl(ctx, th.who, sx, y, { h: th.h, dir: th.dir || 1, t, variant: th.variant, alpha: th.alpha });
      } else if (th.kind === 'hook') {
        const pt = thingPoint(th);
        const can = G.S && G.S.hooks && G.lan.has && G.isNight;
        ctx.translate(sx, pt.y);
        Art.prop(ctx, 'hook', env, { active: can, held: G.lan.mode === 'hung' && G.lan.hook === th, seed: th.x });
      } else if (th.kind === 'mirror') {
        const pt = thingPoint(th);
        ctx.translate(sx, pt.y);
        Art.prop(ctx, th.look || 'bell', env, { on: th.on });
      } else if (th.kind === 'shard') {
        const pt = thingPoint(th);
        ctx.translate(sx, pt.y);
        if (pass === 'dusk') Art.prop(ctx, 'shard', env, { seed: th.x });
        else Art.prop(ctx, 'glint', env, { seed: th.x });
      } else if (th.kind === 'clue') {
        const pt = thingPoint(th);
        ctx.translate(sx, pt.y);
        if (th.alpha !== undefined) ctx.globalAlpha = th.alpha;
        if (pass === 'night' && th.when === 'dusk') Art.prop(ctx, 'glint', env, { seed: th.x, violet: true });
        else Art.prop(ctx, 'clue', env, { seed: th.x, dy: 0 });
      } else {
        const pt = thingPoint(th);
        ctx.translate(sx, th.kind === 'spot' ? pt.y : y);
        env.layer = L; env.ax = th.x;
        if (th.alpha !== undefined) ctx.globalAlpha = th.alpha;
        Art.prop(ctx, th.kind === 'spot' ? (th.mark || 'spark') : th.kind, env, Object.assign({}, th, { dy: 0 }));
        env.layer = null;
      }
      ctx.restore();
    }
    for (const a of G.agents) {
      if (a.layer !== L || !a.visible) continue;
      drawAgent(ctx, a, env, camX);
    }
  };

  function drawAgent(ctx, a, env, camX) {
    const sx = a.x - camX, t = G.time, lan = G.lan;
    if (sx < -200 || sx > R.W + 200) return;
    if (a.kind === 'night' && env.pass === 'day' && G.isNight && !a.anyZone) return;   // 나이트는 빛 속에 서지 않는다
    const holds = lan.has && lan.mode === 'held' && lan.holder === a;
    ctx.save();
    if (a.alpha !== 1) ctx.globalAlpha = a.alpha;
    let hand = null;
    if (a.kind === 'day' || a.kind === 'night') {
      hand = Art.girl(ctx, a.kind, sx, a.y + 2, { h: a.h, dir: a.dir, phase: a.phase, moving: a.moving, t, variant: a.variant, hold: holds });
    } else if (a.kind === 'boat') {
      ctx.translate(sx, a.y + Math.sin(t * 1.5 + a.x * 0.01) * 2);
      Art.prop(ctx, 'boat', env, { dir: a.dir, seed: a.seed || 0, home: a.home, hull: a.hull, sail: a.sail, s: a.s || 1 });
    } else {
      hand = Art.folk(ctx, sx, a.y + 2, { who: a.kind, dir: a.dir, phase: a.phase, moving: a.moving, t, tint: (c) => env.shade(c), pole: a.pole && !holds, shiver: a.shiver });
    }
    ctx.restore();
    if (hand && holds) Art.lantern(ctx, hand.x, hand.y, lan.r > 8, t, Math.sin(a.phase) * 0.12 * a.moving);
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
    const lan = G.lan, t = G.time;
    if (G.level.drawOver) G.level.drawOver(ctx, G, env, camX);
    // 걸려 있거나 날아가는 등불
    if (lan.has && lan.mode !== 'held') Art.lantern(ctx, lan.x - camX, lan.y - 14, lan.r > 8, t, 0);
    // 종과 거울이 되비추는 빛줄기
    if (R.collect) {
      for (const th of G.things) {
        if (th.kind !== 'mirror' || !th.on) continue;
        const p = thingPoint(th);
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
        for (const [w, al] of [[9, 0.08], [3, 0.2], [1.2, 0.5]]) {
          ctx.strokeStyle = `rgba(255,232,170,${al * (0.8 + 0.2 * Math.sin(t * 8))})`; ctx.lineWidth = w;
          ctx.beginPath(); ctx.moveTo(p.x - camX, p.y); ctx.lineTo(th.fx - camX, th.fy); ctx.stroke();
        }
        ctx.restore();
      }
    }
    for (const q of G.particles) {
      if (q.add) continue;
      const k = 1 - q.life / q.max;
      ctx.fillStyle = `rgba(${q.col[0]},${q.col[1]},${q.col[2]},${0.7 * k})`;
      ctx.beginPath(); ctx.arc(q.x - camX, q.y, q.r * (0.6 + k), 0, TAU); ctx.fill();
    }
  };

  G.drawTop = function (ctx, env, camX) {
    const lan = G.lan, t = G.time;
    // 등불의 따스한 빛무리
    if (lan.has && lan.r > 8) {
      const gx = (lan.x - camX) * R.scale, gy = (lan.mode === 'held' ? lan.y + 12 : lan.y) * R.scale;
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'lighter';
      const fl = 1 + Math.sin(t * 9) * 0.03;
      const gr = ctx.createRadialGradient(gx, gy, 0, gx, gy, 44 * R.scale * fl);
      gr.addColorStop(0, `rgba(255,226,150,${G.isNight ? 0.5 : 0.18})`); gr.addColorStop(1, 'rgba(255,226,150,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(gx, gy, 44 * R.scale * fl, 0, TAU); ctx.fill();
      ctx.restore();
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const q of G.particles) {
      if (!q.add) continue;
      const k = 1 - q.life / q.max;
      ctx.fillStyle = `rgba(${q.col[0]},${q.col[1]},${q.col[2]},${k})`;
      ctx.beginPath(); ctx.arc(q.x - camX, q.y, q.r, 0, TAU); ctx.fill();
    }
    ctx.restore();
    if (G.level.drawTop) G.level.drawTop(ctx, G, env, camX);
    // 빛의 가장자리를 잡는 손잡이
    if (G.mode === 'play' && !G.busy && canShape() && lan.r > 8) {
      const a = (G.pointer && G.pointer.kind === 'rim') ? 0.95 : 0.4 + 0.25 * Math.sin(t * 2.4);
      const hx = lan.x - camX + lan.r * 0.74, hy = lan.y - lan.r * 0.67;
      ctx.save(); ctx.translate(hx, hy); ctx.rotate(-0.74);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const pass of [0, 1]) {
        ctx.strokeStyle = pass === 0 ? `rgba(40,30,44,${a * 0.5})` : `rgba(255,250,235,${a})`;
        ctx.lineWidth = pass === 0 ? 5 : 2.2;
        ctx.beginPath(); ctx.moveTo(-9, -7); ctx.lineTo(-15, 0); ctx.lineTo(-9, 7); ctx.moveTo(9, -7); ctx.lineTo(15, 0); ctx.lineTo(9, 7); ctx.stroke();
      }
      ctx.restore();
    }
    if (G.tapMark) {
      const k = G.tapMark.t / 0.6;
      ctx.strokeStyle = G.tapMark.thing ? `rgba(255,236,170,${1 - k})` : `rgba(255,252,240,${0.8 * (1 - k)})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(G.tapMark.x - camX, G.tapMark.y, 8 + k * 22, (8 + k * 22) * 0.7, 0, 0, TAU); ctx.stroke();
    }
  };

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
