// 화면 속 세계: 걸어 다니며 가끔 하늘을 올려다보는 지구인, 떠다니는 표본, 구름 같은 엄폐물, 날씨.
// 좌표는 CSS 픽셀. 그리기는 render/scene.js(2D)·render3d/scene3d.js(3D) 가 이 객체를 읽어서 한다.
//
// 시선 규칙
//   지구인은 걷다가 고개를 들 준비(notice)를 하고, 그다음 하늘을 본다(look).
//   시선은 기체가 떠 있는 높이에서 [gx - gw, gx + gw] 구간을 본다. 준비 단계부터 그 자리가 표시되므로
//   기체를 끌어 옆으로 피하거나, 구름 뒤에 숨거나, 은폐를 켜면 된다.
//   기체가 시선 안에 있을 때 빔을 쏘면 들킬 수 있고, 가만히 있어도 의심 게이지가 찬다.
//   무대마다 사람 말고도 시선을 보내는 것(창문·천문대 돔·우주 정거장·손전등)이 있다.
import { FORMS, WATCHERS, AIRBORNE_STAGES, WEATHERS, STAGE_WEATHER, STAGE_RULES } from '../data/content.js';
import { SUPPLY } from '../features/monetize/catalog.js';
import { Emitter } from './emitter.js';
import { rand, pickWeighted } from './rng.js';

const MAX_SPECIMENS = 6;
const BEAM_TIME = 0.34;
const FADE_TIME = 0.4;
const HIT_RADIUS = { default: 36, meteor: 46, cow: 42, weather: 40, chicken: 38 };
/** 한 사람이 고개를 내린 뒤 다른 사람이 올려다보기까지의 최소 숨 돌릴 틈(초). */
const BREATHER = 1.6;
/** 의심 게이지: 발각 확률 0.6 인 시선이 이만큼(초) 기체를 보면 가득 찬다. */
const SUSPECT_TIME = 3.2;
/** 무대 시선(창문 등)이 기체를 보면 이만큼(초) 만에 가득 찬다. */
const SOURCE_SUSPECT_TIME = 1.5;
const SUSPECT_DECAY = 0.55;
/** 시선 가장자리에서 이만큼(px) 안쪽으로 비켜서 빔을 쏘면 '아슬아슬'. */
const NEAR_MARGIN = 34;
const NEAR_COOLDOWN = 1.2;
/** 꾹 눌러야 하는 표본(초). */
const HOLD_TIME = { cow: 0.65, balloon: 0.32 };
/** 이보다 짧게 누르면 '톡' 친 것으로 본다(초). */
const QUICK_TAP = 0.14;
const CHICKEN_FLEE = 1.3;
const METEOR_PERFECT = 1.15;
const SWARM_TIME = 2.2;
const DRAG_SLOP = 8;
const SHINY_BASE = 0.02;
const SHINY_BONUS = 4;
const LIGHTNING_WARN = 1.2;
const HUNTER_STAY = 32;

let nextId = 1;

const clampN = (v, a, b) => Math.min(Math.max(v, a), b);

/** 선분 (a→b) 와 (c→d) 가 만나는지. */
function crosses(ax, ay, bx, by, cx, cy, dx, dy) {
  const d = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
  if (Math.abs(d) < 1e-9) return false;
  const u = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / d;
  const v = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / d;
  return u >= 0 && u <= 1 && v >= 0 && v <= 1;
}

export class World extends Emitter {
  /**
   * @param {import('./game.js').Game} game
   * @param {{rng?: () => number}} [deps]
   */
  constructor(game, { rng = Math.random } = {}) {
    super();
    this.game = game;
    this.rng = rng;
    this.layout = { w: 390, h: 760, top: 110, groundY: 600, ufoX: 195, ufoY: 300, ufoR: 46 };
    this.humans = [];
    this.specimens = [];
    this.covers = [];
    this.sources = [];
    this.spawnT = 0.4;
    this.droneT = 0;
    this.formIndex = -1;
    this.stageId = null;
    this.time = 0;
    this.ufoX = this.layout.ufoX;
    this.ufoTarget = this.ufoX;
    this.ufoVX = 0;
    this.suspicion = 0;
    this.suspectBy = null;
    this.hidden = false;
    this.pointer = null;
    this.weather = { kind: 'clear', t: 90 };
    this.reset();
  }

  get airborne() {
    return AIRBORNE_STAGES.has(FORMS[this.game.formIndex].stage);
  }

  get stage() {
    return FORMS[this.game.formIndex].stage;
  }

  /** 지금 하늘을 올려다보고 있는 지구인들(기체를 보든 말든). */
  get watchers() {
    return this.humans.filter((h) => h.state === 'look');
  }

  /** 누군가 올려다보려는 참인지(경고 단계). */
  get noticing() {
    return this.humans.some((h) => h.state === 'notice') || this.sources.some((s) => s.phase === 'warn');
  }

  /** 기체가 엄폐물 뒤에 숨을 수 있는 반지름(가운데 몸통). */
  get core() {
    return this.layout.ufoR * 0.45;
  }

  /** 기체가 움직일 수 있는 가로 범위. */
  get lane() {
    const { w, ufoR } = this.layout;
    const m = Math.min(ufoR * 0.75 + 6, w * 0.3);
    return [m, w - m];
  }

  setLayout(layout) {
    const oldW = this.layout.w;
    this.layout = { ...this.layout, ...layout };
    const { w, groundY } = this.layout;
    if (oldW && Math.abs(oldW - w) > 0.5) {
      const k = w / oldW;
      this.ufoX *= k;
      this.ufoTarget *= k;
      for (const c of this.covers) c.x *= k;
      for (const h of this.humans) if (h.gx != null) h.gx *= k;
    }
    const [a, b] = this.lane;
    this.ufoX = clampN(this.ufoX, a, b);
    this.ufoTarget = clampN(this.ufoTarget, a, b);
    for (const h of this.humans) if (!h.leaving) h.x = Math.min(Math.max(h.x, 24), w - 24);
    for (const sp of this.specimens) {
      if (sp.mode !== 'drift' && sp.mode !== 'streak') sp.x = Math.min(Math.max(sp.x, 20), w - 20);
      if (sp.mode === 'ground') sp.y = groundY - 4;
    }
  }

  /** 새 대원이 도착했을 때: 세계를 비우고 다시 채운다. */
  reset() {
    this.specimens = [];
    this.covers = [];
    this.sources = [];
    this.spawnT = 0.3;
    this.droneT = 0;
    this.suspicion = 0;
    this.suspectBy = null;
    this.hidden = false;
    this.pointer = null;
    this.groups = new Map();
    this.recentBeams = [];
    this.cowTimes = [];
    this.nearT = 0;
    this.supply = null;
    this.supplyT = SUPPLY.firstAfter;
    this.ufoX = this.ufoTarget = this.layout.w / 2;
    this.ufoVX = 0;
    this.stageId = this.stage;
    this._buildHumans();
    this._rollWeather(true);
    this._resetStageTimers();
    this._rollHunter();
    for (let i = 0; i < 3; i++) this._spawn();
  }

  _resetStageTimers() {
    const rule = STAGE_RULES[this.stage] || {};
    this.coverT = rule.covers ? rand(this.rng, 5, 9) : Infinity;
    this.sourceT = rule.source ? rand(this.rng, rule.source.every[0], rule.source.every[1]) : Infinity;
    this.flashT = rand(this.rng, 8, 13);
    this.flashWarned = false;
    this.lightT = rand(this.rng, 12, 20); // 밤 손전등
  }

  _buildHumans() {
    const { w } = this.layout;
    this.formIndex = this.game.formIndex;
    const types = FORMS[this.formIndex].watchers;
    const firstEver = this.game.state.gen === 1 && this.game.state.stats.discoveries === 0;
    this.humans = types.map((type, i) => {
      const cfg = WATCHERS[type];
      const dir = this.rng() < 0.5 ? -1 : 1;
      return {
        id: nextId++,
        type,
        x: (w * (i + 0.5)) / types.length + rand(this.rng, -30, 30),
        dir,
        state: 'walk',
        // 첫 판에서는 몇 번 모아 볼 시간을 준다.
        t: rand(this.rng, cfg.walk[0], cfg.walk[1]) * (firstEver ? 1 : 0.6) + (firstEver ? 3 : 1) + i * 2.2,
        phase: this.rng() * 10,
        spotted: false,
        gx: null,
        gw: 0,
        gv: 0,
        lookDur: 0,
        sees: false,
        flash: 0,
      };
    });
  }

  // ───────── 날씨·무대·손님 ─────────

  _rollWeather(arrival = false) {
    const s = this.game.state;
    const table = STAGE_WEATHER[this.stage] || { clear: 1 };
    let kind = 'clear';
    // 첫 대원의 첫 판은 맑은 날
    if (!(s.gen === 1 && s.stats.discoveries === 0)) {
      const entries = Object.entries(table).map(([id, weight]) => ({ id, weight }));
      kind = pickWeighted(this.rng, entries, (e) => e.weight).id;
    }
    const prev = this.weather?.kind;
    this.weather = { kind, t: rand(this.rng, 70, 120) };
    if (!arrival && kind !== prev) this.emit('weather', { kind });
    else if (arrival && kind !== 'clear') this.emit('weather', { kind, arrival: true });
  }

  _rollHunter() {
    const s = this.game.state;
    this.hunter = { state: 'idle', t: 0 };
    if (s.gen >= 3 && !this.airborne && this.game.formIndex >= 1 && this.rng() < 0.3) {
      this.hunter = { state: 'waiting', t: rand(this.rng, 35, 80) };
    }
  }

  _updateHunter(dt) {
    const hu = this.hunter;
    if (hu.state === 'idle' || hu.state === 'gone') return;
    hu.t -= dt;
    if (hu.state === 'waiting' && hu.t <= 0) {
      const { w } = this.layout;
      const fromLeft = this.rng() < 0.5;
      this.humans.push({
        id: nextId++,
        type: 'hunter',
        guest: true,
        x: fromLeft ? -20 : w + 20,
        dir: fromLeft ? 1 : -1,
        state: 'walk',
        t: rand(this.rng, 2, 3.2),
        phase: this.rng() * 10,
        spotted: false,
        gx: null,
        gw: 0,
        gv: 0,
        lookDur: 0,
        sees: false,
        flash: 0,
      });
      hu.state = 'active';
      hu.t = HUNTER_STAY;
      this.emit('hunter', { on: true });
    } else if (hu.state === 'active' && hu.t <= 0) {
      const h = this.humans.find((x) => x.type === 'hunter');
      if (h && h.state !== 'look' && h.state !== 'notice') {
        h.leaving = true;
        h.state = 'walk';
        h.dir = h.x < this.layout.w / 2 ? -1 : 1;
        hu.state = 'gone';
        this.emit('hunter', { on: false });
      }
    }
  }

  get weatherCfg() {
    return WEATHERS[this.weather.kind] || WEATHERS.clear;
  }

  _updateEnv(dt) {
    const { w, top, groundY, ufoY, ufoR } = this.layout;
    const rule = STAGE_RULES[this.stage] || {};

    // 날씨가 가끔 바뀐다
    this.weather.t -= dt;
    if (this.weather.t <= 0) this._rollWeather();

    // 엄폐물: 구름(가로로 흐른다)·모닥불 연기(위로 오른다)
    if (rule.covers) {
      this.coverT -= dt * (this.weather.kind === 'storm' ? 1.6 : 1);
      if (this.coverT <= 0) {
        this.coverT = rand(this.rng, rule.covers[0], rule.covers[1]);
        if (this.covers.length < 3) this._spawnCover(rule.smoke && this.rng() < 0.5 ? 'smoke' : 'cloud');
      }
    }

    // 무대 고유 시선(창문·천문대 돔·우주 정거장)
    if (rule.source) {
      this.sourceT -= dt;
      if (this.sourceT <= 0 && !this.sources.some((s) => s.kind === rule.source.kind)) {
        this.sourceT = rand(this.rng, rule.source.every[0], rule.source.every[1]);
        this._spawnSource(rule.source);
      }
    }
    // 밤: 순찰 손전등이 하늘을 훑는다
    if (this.weather.kind === 'night' && !this.airborne) {
      this.lightT -= dt;
      if (this.lightT <= 0 && !this.sources.some((s) => s.kind === 'flashlight')) {
        this.lightT = rand(this.rng, 14, 22);
        this._spawnSource({ kind: 'flashlight', cause: 'flashlight', warn: 0.9, on: 2.4, w: 0.07 });
      }
    }
    // 뇌우: 번개 예고 → 번쩍
    if (this.weather.kind === 'storm') {
      this.flashT -= dt;
      if (!this.flashWarned && this.flashT <= LIGHTNING_WARN) {
        this.flashWarned = true;
        this.emit('lightningWarn');
      }
      if (this.flashT <= 0) {
        this.flashT = rand(this.rng, 9, 16);
        this.flashWarned = false;
        this.emit('lightning');
        const game = this.game;
        if (game.playing && !this.hidden && !game.cloaked && game.rng() < game.chance('lightning')) {
          game.incident('lightning', {});
        }
      }
    }

    // 엄폐물 움직임
    for (const c of this.covers) {
      c.age += dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      if (c.kind === 'smoke') {
        c.rx = Math.min(c.rx + dt * 5, c.maxRx);
        if (c.y < top - c.ry) c.dead = true;
      } else if (c.x < -c.rx * 1.5 || c.x > w + c.rx * 1.5) {
        c.dead = true;
      }
      c.a = Math.min(1, c.age / 1.2);
    }
    this.covers = this.covers.filter((c) => !c.dead);

    // 무대 시선 움직임
    for (const s of this.sources) {
      s.t -= dt;
      if (s.phase === 'warn' && s.t <= 0) {
        s.phase = 'on';
        s.t = s.on;
        this.emit('sourceOn', s);
      } else if (s.phase === 'on') {
        s.gx += s.vx * dt;
        if (s.kind === 'iss') s.ox = s.gx;
        if (s.t <= 0) s.dead = true;
      }
    }
    this.sources = this.sources.filter((s) => !s.dead);

    // 숨었는지
    const core = this.core;
    this.hidden = this.covers.some((c) => {
      if (c.a < 0.6) return false;
      const dx = Math.abs(this.ufoX - c.x);
      const dy = Math.abs(ufoY - c.y);
      return dx < c.rx * 0.82 - core * 0.3 && dy < c.ry * 1.1 + ufoR * 0.1;
    });
    void groundY;
  }

  _spawnCover(kind) {
    const { w, ufoY, ufoR, groundY } = this.layout;
    if (kind === 'smoke') {
      const rx = Math.max(ufoR * 1.2, rand(this.rng, w * 0.13, w * 0.18));
      this.covers.push({
        id: nextId++,
        kind,
        x: rand(this.rng, w * 0.2, w * 0.8),
        y: groundY - 20,
        rx: rx * 0.5,
        maxRx: rx,
        ry: rx * 0.9,
        vx: rand(this.rng, -6, 6),
        vy: -rand(this.rng, 22, 30),
        age: 0,
        a: 0,
      });
      return;
    }
    const rx = Math.max(ufoR * 1.55, rand(this.rng, w * 0.19, w * 0.26));
    const fromLeft = this.rng() < 0.5;
    const fast = this.stage === 'cloudsea';
    this.covers.push({
      id: nextId++,
      kind,
      x: fromLeft ? -rx : w + rx,
      y: ufoY + rand(this.rng, -10, 10),
      rx,
      ry: rx * 0.46,
      vx: (fromLeft ? 1 : -1) * rand(this.rng, fast ? 16 : 11, fast ? 26 : 19),
      vy: 0,
      age: 0,
      a: 0,
    });
  }

  _spawnSource(def) {
    const { w, top, groundY } = this.layout;
    const gw = Math.max(16, this.game.mod('gazeWidth', w * def.w * this.weatherCfg.gaze, { type: def.kind }));
    const [a, b] = this.lane;
    const s = { id: nextId++, kind: def.kind, cause: def.cause, phase: 'warn', t: def.warn, warn: def.warn, on: def.on, gw, gx: 0, vx: 0, ox: 0, oy: 0, spotted: false, sees: false };
    if (def.kind === 'window') {
      s.gx = rand(this.rng, a, b);
      s.ox = clampN(s.gx + rand(this.rng, -40, 40), 30, w - 30);
      s.oy = groundY - rand(this.rng, 90, 170);
    } else if (def.kind === 'dome') {
      const ltr = this.rng() < 0.5;
      s.gx = ltr ? a - gw : b + gw;
      s.vx = ((ltr ? 1 : -1) * (b - a + gw * 2)) / def.on;
      s.ox = w * 0.78;
      s.oy = groundY - 40;
    } else if (def.kind === 'iss') {
      const ltr = this.rng() < 0.5;
      s.gx = ltr ? -gw : w + gw;
      s.vx = ((ltr ? 1 : -1) * (w + gw * 2)) / def.on;
      s.ox = s.gx;
      s.oy = top + 34;
    } else {
      // 손전등: 땅에서 하늘을 한 번 훑는다
      const ltr = this.rng() < 0.5;
      s.gx = ltr ? a - gw : b + gw;
      s.vx = ((ltr ? 1 : -1) * (b - a + gw * 2)) / def.on;
      s.ox = rand(this.rng, w * 0.2, w * 0.8);
      s.oy = groundY - 16;
    }
    this.sources.push(s);
    this.emit('sourceWarn', s);
  }

  // ───────── 시선 ─────────

  /** 시선 구간과 기체 사이의 여유(px). 0 보다 작으면 보인다. */
  _margin(gx, gw) {
    return Math.abs(this.ufoX - gx) - (gw + this.core);
  }

  _gazeWidth(type) {
    const cfg = WATCHERS[type];
    const { w } = this.layout;
    return Math.max(16, this.game.mod('gazeWidth', w * cfg.gaze.w * this.weatherCfg.gaze, { type }));
  }

  /** 고개를 들 준비: 어디를 볼지 정한다. 준비하는 동안 그 자리가 화면에 표시된다. */
  _beginNotice(h) {
    const cfg = WATCHERS[h.type];
    const gz = cfg.gaze;
    const { w } = this.layout;
    const [a, b] = this.lane;
    h.gw = this._gazeWidth(h.type);
    h.lookDur = rand(this.rng, cfg.look[0], cfg.look[1]);
    h.gv = 0;
    h.flash = 0;
    const aimed = this.rng() < gz.aim;
    let gx = aimed ? this.ufoX : rand(this.rng, a, b);
    switch (gz.kind) {
      case 'sudden':
        gx = aimed ? this.ufoX + rand(this.rng, -w * 0.12, w * 0.12) : gx;
        break;
      case 'selfie':
        // 등지고 서서 자기 뒤쪽 하늘을 화면에 담는다
        gx = h.x - h.dir * w * 0.26;
        break;
      case 'sweep': {
        const ltr = this.rng() < 0.5;
        gx = ltr ? a : b;
        h.gv = ((ltr ? 1 : -1) * (b - a)) / h.lookDur;
        break;
      }
      case 'track':
        gx = this.ufoX;
        break;
    }
    h.gx = clampN(gx, a - h.gw * 0.5, b + h.gw * 0.5);
    return this.game.noticeTime * (gz.notice || 1);
  }

  _updateGaze(h, dt) {
    const gz = WATCHERS[h.type].gaze;
    const { w } = this.layout;
    if (h.gx == null) {
      // 밖에서 상태를 바꾼 경우(시험 등): 기체를 본다
      h.gx = this.ufoX;
      h.gw = this._gazeWidth(h.type);
    }
    if (gz.kind === 'sweep') h.gx += h.gv * dt;
    else if (gz.kind === 'drift') h.gx += clampN(this.ufoX - h.gx, -1, 1) * w * 0.07 * dt;
    else if (gz.kind === 'track') h.gx += clampN(this.ufoX - h.gx, -w * 0.21 * dt, w * 0.21 * dt);
    h.sees = !this.game.cloaked && !this.hidden && this._margin(h.gx, h.gw) < 0;
  }

  /** 지금 기체를 보고 있는 것들. game.collect 의 watchers 로 넘긴다. */
  seers() {
    if (this.game.cloaked || this.hidden) return [];
    const out = [];
    for (const h of this.humans) {
      if (h.state !== 'look' || h.leaving) continue;
      if (h.gx == null) this._updateGaze(h, 0);
      if (this._margin(h.gx, h.gw) < 0) out.push({ who: h.type, cause: WATCHERS[h.type].cause, human: h });
    }
    for (const s of this.sources) {
      if (s.phase === 'on' && this._margin(s.gx, s.gw) < 0) out.push({ who: s.cause, cause: s.cause, source: s });
    }
    return out;
  }

  _updateSuspicion(dt) {
    const game = this.game;
    let rate = 0;
    let by = null;
    if (!game.cloaked && !this.hidden) {
      for (const h of this.humans) {
        if (h.state !== 'look' || !h.sees || h.leaving) continue;
        const cfg = WATCHERS[h.type];
        if (cfg.gaze.kind === 'frame') continue; // 사진작가는 플래시 순간에만 찍힌다
        const r = cfg.detect / 0.6 / SUSPECT_TIME;
        if (r > rate) {
          rate = r;
          by = { cause: cfg.cause, human: h };
        }
      }
      for (const s of this.sources) {
        s.sees = s.phase === 'on' && this._margin(s.gx, s.gw) < 0;
        if (s.sees && 1 / SOURCE_SUSPECT_TIME > rate) {
          rate = 1 / SOURCE_SUSPECT_TIME;
          by = { cause: s.cause, source: s };
        }
      }
    }
    if (rate > 0) {
      this.suspicion = Math.min(1, this.suspicion + rate * dt);
      this.suspectBy = by;
      if (this.suspicion >= 1) {
        this.suspicion = 0;
        if (by.human) by.human.spotted = true;
        if (by.source) by.source.spotted = true;
        game.incident(by.cause, { watcher: by.human?.type, suspicion: true });
      }
    } else {
      this.suspicion = Math.max(0, this.suspicion - SUSPECT_DECAY * dt);
      if (this.suspicion === 0) this.suspectBy = null;
    }
  }

  // ───────── 매 프레임 ─────────

  update(dt) {
    const game = this.game;
    if (game.formIndex !== this.formIndex) {
      this._buildHumans();
      if (this.stage !== this.stageId) {
        this.stageId = this.stage;
        this.covers = [];
        this.sources = [];
        this._resetStageTimers();
        this._rollWeather();
      }
      this.emit('stage', { form: game.formIndex });
    }
    this.time += dt;
    // 기체는 손가락이 가리키는 자리로 미끄러진다
    const prevX = this.ufoX;
    this.ufoX += (this.ufoTarget - this.ufoX) * (1 - Math.exp(-14 * dt));
    this.ufoVX = dt > 0 ? (this.ufoX - prevX) / dt : 0;
    // 빔에 끌려오는 표본은 게임이 멈춰 있어도 끝까지 끌려온다.
    for (const sp of this.specimens) {
      if (sp.state === 'beam') {
        sp.bt += dt / BEAM_TIME;
        if (sp.bt >= 1) {
          sp.dead = true;
          this.emit('absorbed', sp);
        }
      }
    }
    if (game.playing) {
      this.nearT = Math.max(0, this.nearT - dt);
      this._updateEnv(dt);
      this._updateHunter(dt);
      this._updateHumans(dt);
      this._updateSuspicion(dt);
      this._updateSpecimens(dt);
      this._updateHold(dt);
      this._updateDrone(dt);
      this._updateSupply(dt);
    } else if (this.pointer?.mode === 'hold') {
      this.pointer = null;
    }
    this.specimens = this.specimens.filter((sp) => !sp.dead);
  }

  _walkTime(h) {
    const cfg = WATCHERS[h.type];
    return rand(this.rng, cfg.walk[0], cfg.walk[1]) * this.weatherCfg.look * this.game.mod('lookDelay', 1, { type: h.type });
  }

  _updateHumans(dt) {
    const { w } = this.layout;
    for (const h of this.humans) {
      const cfg = WATCHERS[h.type];
      h.t -= dt;
      if (h.state === 'walk') {
        h.x += h.dir * cfg.speed * (h.leaving ? 2.2 : 1) * dt;
        if (h.leaving) {
          if (h.x < -40 || h.x > w + 40) h.dead = true;
          continue;
        }
        if (h.x < 26) {
          h.x = 26;
          h.dir = 1;
        } else if (h.x > w - 26) {
          h.x = w - 26;
          h.dir = -1;
        }
        if (h.t <= 0) {
          h.state = 'notice';
          h.t = this._beginNotice(h);
          // 한 번에 한 사람만 올려다보게 해서 화면을 읽기 쉽게 한다(특별 손님은 따로 논다).
          if (!h.guest) {
            const hold = h.t + h.lookDur + BREATHER;
            for (const o of this.humans) if (o !== h && !o.guest && o.state === 'walk') o.t = Math.max(o.t, hold);
          }
          this.emit('notice', h);
        }
      } else if (h.state === 'notice') {
        if (h.gx != null && WATCHERS[h.type].gaze.kind === 'track') h.gx += clampN(this.ufoX - h.gx, -w * 0.12 * dt, w * 0.12 * dt);
        if (h.t <= 0) {
          h.state = 'look';
          h.t = h.lookDur || rand(this.rng, cfg.look[0], cfg.look[1]);
          this.emit('look', h);
        }
      } else if (h.state === 'look') {
        this._updateGaze(h, dt);
        if (cfg.gaze.kind === 'frame') {
          h.flash = Math.max(0, 1 - h.t / Math.max(0.1, h.lookDur)); // 3·2·1 진행도
        }
        if (h.t <= 0) {
          if (cfg.gaze.kind === 'frame') this._flash(h);
          if (this.game.phase !== 'play') continue;
          h.state = 'walk';
          h.t = this._walkTime(h);
          if (this.rng() < 0.4) h.dir *= -1;
          if (!h.guest) for (const o of this.humans) if (o !== h && !o.guest && o.state === 'walk') o.t = Math.max(o.t, BREATHER);
          h.sees = false;
          this.emit('lookEnd', h);
        }
      }
    }
    this.humans = this.humans.filter((h) => !h.dead);
  }

  /** 사진작가의 셔터: 그 순간 기체가 화면(시선) 안이면 찍힌다. */
  _flash(h) {
    const game = this.game;
    const m = this._margin(h.gx, h.gw);
    this.emit('flash', h);
    if (game.cloaked || this.hidden) return;
    if (m < 0) {
      if (game.rng() < game.chance(WATCHERS[h.type].cause)) {
        h.spotted = true;
        game.incident(WATCHERS[h.type].cause, { watcher: h.type, flash: true });
      }
    } else if (m < NEAR_MARGIN) {
      this._nearMiss(this.ufoX, this.layout.ufoY, game.specimenGain('dandelion') * 3);
    }
  }

  _updateSpecimens(dt) {
    const { w, h, top, groundY } = this.layout;
    for (const sp of this.specimens) {
      if (sp.state === 'beam') continue;
      sp.age += dt;
      if (sp.state === 'fade') {
        sp.fade -= dt / FADE_TIME;
        if (sp.fade <= 0) sp.dead = true;
        continue;
      }
      if (sp.state !== 'live') continue;
      if (sp.held) continue; // 꾹 누르는 중에는 제자리
      const a = sp.age;
      if (sp.kind === 'drone') sp.rec = (sp.age + sp.phase) % 2.4 < 1.3;
      switch (sp.mode) {
        case 'float':
          sp.y -= sp.speed * dt;
          sp.x += Math.sin(a * 1.3 + sp.phase) * 10 * dt;
          if (sp.y < top + 6) sp.life = 0;
          break;
        case 'free': // 연줄이 끊긴 연: 바람 타고 천천히 날아간다
          sp.y -= 16 * dt;
          sp.x += sp.dir * 14 * dt + Math.sin(a * 2.2 + sp.phase) * 18 * dt;
          if (sp.y < top + 6) sp.life = 0;
          break;
        case 'wander':
          sp.x += Math.cos(a * 0.9 + sp.phase) * 22 * dt;
          sp.y += Math.sin(a * 1.4 + sp.phase * 2) * 18 * dt;
          break;
        case 'sway':
          sp.x = sp.ax + Math.sin(a * 0.8 + sp.phase) * 24;
          sp.y = sp.ay + Math.cos(a * 1.1 + sp.phase) * 9;
          break;
        case 'ground': {
          const fleeing = sp.flee > 0;
          if (fleeing) sp.flee = Math.max(0, sp.flee - dt);
          sp.x += sp.dir * (fleeing ? 120 : sp.speed) * dt;
          if (sp.x < 30 || sp.x > w - 30) sp.dir *= -1;
          sp.y = groundY - 4;
          break;
        }
        case 'drift':
          sp.x += sp.vx * dt;
          sp.y += Math.sin(a * 2 + sp.phase) * 5 * dt;
          if (sp.x < -50 || sp.x > w + 50) sp.dead = true;
          break;
        case 'streak':
          sp.x += sp.vx * dt;
          sp.y += sp.vy * dt;
          if (sp.x < -60 || sp.x > w + 60 || sp.y > groundY - 30) sp.dead = true;
          break;
      }
      sp.x = sp.mode === 'drift' || sp.mode === 'streak' ? sp.x : Math.min(Math.max(sp.x, 22), w - 22);
      if (sp.mode !== 'ground') sp.y = Math.min(Math.max(sp.y, top - 10), h);
      if (sp.age >= sp.life) {
        sp.state = 'fade';
        sp.fade = 1;
      }
    }
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      const live = this.specimens.filter((sp) => sp.state === 'live').length;
      if (live < MAX_SPECIMENS) this._spawn();
      this.spawnT = rand(this.rng, 0.75, 1.25) / Math.max(0.2, this.game.mod('spawnRate', 1));
    }
  }

  _updateDrone(dt) {
    const interval = this.game.droneInterval;
    if (!Number.isFinite(interval)) return;
    this.droneT = Math.min(this.droneT + dt, interval);
    if (this.droneT < interval) return;
    // 드론은 작아서 눈에 띄지 않는다. 대신 조금씩만 떼어 온다.
    // 반짝이는 대원이 직접 데려가도록 남겨 둔다
    const pool = this.specimens.filter((sp) => sp.state === 'live' && !sp.held && !sp.shiny && sp.age > 0.5 && sp.mode !== 'streak');
    if (!pool.length) return;
    const sp = pool[Math.floor(this.rng() * pool.length)];
    const res = this.game.collect(sp.kind, { auto: true });
    if (!res.ok) return;
    this.droneT = 0;
    this._beam(sp, true);
    this.emit('collect', { specimen: sp, result: res, auto: true, tags: [] });
  }

  _freeSpot(minY, maxY) {
    const { w, ufoY, ufoR } = this.layout;
    let x = 0;
    let y = 0;
    for (let i = 0; i < 10; i++) {
      x = rand(this.rng, 34, w - 34);
      y = rand(this.rng, minY, maxY);
      const nearUfo = Math.hypot(x - this.ufoX, y - ufoY) < ufoR + 44;
      const crowded = this.specimens.some((sp) => Math.hypot(x - sp.x, y - sp.y) < 58);
      if (!nearUfo && !crowded) break;
    }
    return { x, y };
  }

  _spawn(forceKind = null, near = null, group = 0) {
    const { w, top, groundY } = this.layout;
    let def;
    if (forceKind) {
      def = { id: forceKind, mode: this.game.spawnTable().find((e) => e.spec.id === forceKind)?.spec.mode || 'wander' };
    } else {
      const table = this.game.spawnTable();
      if (!table.length) return null;
      // 같은 종류가 화면을 덮지 않도록, 이미 떠 있는 종류는 가중치를 낮춘다.
      const count = {};
      for (const sp of this.specimens) count[sp.kind] = (count[sp.kind] || 0) + 1;
      def = pickWeighted(this.rng, table, (e) => e.weight / (1 + 0.6 * (count[e.spec.id] || 0))).spec;
    }
    let mode = def.mode;
    if (mode === 'ground' && this.airborne) mode = 'wander';
    const skyTop = top + 26;
    const skyBottom = Math.max(skyTop + 60, groundY - 74);
    const sp = {
      id: nextId++,
      kind: def.id,
      mode,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      ax: 0,
      ay: 0,
      dir: this.rng() < 0.5 ? -1 : 1,
      speed: 0,
      age: 0,
      life: rand(this.rng, 7.5, 10.5),
      phase: this.rng() * Math.PI * 2,
      state: 'live',
      fade: 1,
      bt: 0,
      bx: 0,
      by: 0,
      auto: false,
      dead: false,
      shiny: this._rollShiny(),
      group,
      hold: 0,
      held: false,
      cut: false,
      flee: 0,
      fled: false,
      rec: false,
    };
    switch (mode) {
      case 'float': {
        const p = this._freeSpot(skyTop + (skyBottom - skyTop) * 0.35, skyBottom);
        sp.x = p.x;
        sp.y = p.y;
        sp.speed = rand(this.rng, 9, 17);
        break;
      }
      case 'wander': {
        const p = near ? { x: clampN(near.x + rand(this.rng, -50, 50), 30, w - 30), y: clampN(near.y + rand(this.rng, -40, 40), skyTop, skyBottom) } : this._freeSpot(skyTop + 10, skyBottom);
        sp.x = p.x;
        sp.y = p.y;
        break;
      }
      case 'sway': {
        const p = this._freeSpot(skyTop + 20, skyTop + (skyBottom - skyTop) * 0.6);
        sp.ax = sp.x = Math.min(Math.max(p.x, 50), w - 50);
        sp.ay = sp.y = p.y;
        break;
      }
      case 'ground': {
        sp.x = rand(this.rng, 40, w - 40);
        sp.y = groundY - 4;
        sp.speed = rand(this.rng, 5, 10);
        break;
      }
      case 'drift': {
        const fromLeft = this.rng() < 0.5;
        const band = def.id === 'satellite' ? 0.22 : 0.6;
        sp.x = fromLeft ? -30 : w + 30;
        sp.y = rand(this.rng, skyTop, skyTop + (skyBottom - skyTop) * band);
        sp.vx = (fromLeft ? 1 : -1) * rand(this.rng, 30, 44);
        sp.dir = fromLeft ? 1 : -1;
        sp.life = 60;
        break;
      }
      case 'streak': {
        const fromLeft = this.rng() < 0.5;
        sp.x = fromLeft ? -30 : w + 30;
        sp.y = rand(this.rng, skyTop - 10, skyTop + 50);
        sp.vx = (fromLeft ? 1 : -1) * rand(this.rng, 80, 105);
        sp.vy = rand(this.rng, 26, 40);
        sp.dir = fromLeft ? 1 : -1;
        sp.life = 60;
        break;
      }
    }
    this.specimens.push(sp);
    this.emit('spawn', sp);
    // 반딧불은 셋이 무리 지어 나온다. 셋을 재빨리 모으면 반딧불 콤보.
    if (!forceKind && sp.kind === 'firefly' && this.specimens.length <= MAX_SPECIMENS + 1) {
      const g = nextId++;
      sp.group = g;
      this.groups.set(g, { n: 3, got: 0, t: 0 });
      this._spawn('firefly', sp, g);
      this._spawn('firefly', sp, g);
    }
    return sp;
  }

  /** 반짝이 판정. 확정 보상(도장)은 확률이 1 로 온다. */
  _rollShiny() {
    const p = this.game.mod('shinyChance', SHINY_BASE, { spawn: true });
    return p >= 1 || this.rng() < Math.min(0.5, p);
  }

  // ───────── 본부 보급 풍선(보상형 광고) ─────────

  /** 낙하산 캡슐이 하늘로 천천히 내려온다. 누르면 'supplyTap' — 열지 말지는 UI 가 정한다. */
  _updateSupply(dt) {
    const fx = this.game.fx.monetize;
    const sp = this.supply;
    if (sp) {
      sp.age += dt;
      if (sp.state === 'drop') {
        sp.y = Math.min(sp.y + dt * 22, sp.ty);
        sp.x = sp.ax + Math.sin(sp.age * 0.9 + sp.phase) * 18;
        if (sp.age > SUPPLY.life) sp.state = 'leave';
      } else if (sp.state === 'leave') {
        sp.y -= dt * 70;
        sp.x += dt * 12;
        if (sp.y < -60) this.supply = null;
      } else if (sp.state === 'open') {
        sp.openT += dt;
        if (sp.openT > 0.9) this.supply = null;
      }
      return;
    }
    if (!fx) return;
    this.supplyT -= dt;
    if (this.supplyT > 0) return;
    this.supplyT = rand(this.rng, SUPPLY.every[0], SUPPLY.every[1]);
    if (!fx.canWatch('supply').ok) return;
    const { w, top, groundY } = this.layout;
    const [a, b] = this.lane;
    const x = rand(this.rng, a + 10, b - 10);
    this.supply = { id: nextId++, x, ax: x, y: top - 30, ty: top + (groundY - top) * rand(this.rng, 0.18, 0.32), age: 0, phase: this.rng() * 6, state: 'drop', openT: 0 };
    void w;
    this.emit('supplySpawn', this.supply);
  }

  /** 보급 캡슐을 연다(광고를 끝까지 본 뒤 UI 가 부른다). */
  openSupply() {
    if (!this.supply) return;
    this.supply.state = 'open';
    this.supply.openT = 0;
    this.emit('supplyOpen', this.supply);
  }

  /** 보급 캡슐을 그냥 보낸다(안 열기). */
  dismissSupply() {
    if (this.supply && this.supply.state === 'drop') this.supply.state = 'leave';
  }

  _beam(sp, auto) {
    sp.state = 'beam';
    sp.bt = 0;
    sp.bx = sp.x;
    sp.by = sp.y;
    sp.auto = auto;
    sp.held = false;
  }

  // ───────── 조작 ─────────

  _hit(x, y) {
    let best = null;
    let bestD = Infinity;
    for (const sp of this.specimens) {
      if (sp.state !== 'live') continue;
      const r = HIT_RADIUS[sp.kind] || HIT_RADIUS.default;
      const d = Math.hypot(x - sp.x, y - (sp.mode === 'ground' ? sp.y - 14 : sp.y));
      if (d <= r && d < bestD) {
        best = sp;
        bestD = d;
      }
    }
    return best;
  }

  _onUfo(x, y) {
    const { ufoY, ufoR } = this.layout;
    return Math.hypot(x - this.ufoX, y - ufoY) <= ufoR;
  }

  /** 손가락이 닿았을 때. 표본이면 바로 모으거나(톡) 꾹 누르기를 시작하고, 빈 곳이면 기체 끌기를 시작한다. */
  pointerDown(x, y) {
    if (!this.game.playing) return null;
    this.pointer = null;
    const su = this.supply;
    if (su && su.state === 'drop' && Math.hypot(x - su.x, y - (su.y + 8)) < 46) {
      this.emit('supplyTap', su);
      return { type: 'supply', supply: su };
    }
    const sp = this._hit(x, y);
    if (sp) {
      if (HOLD_TIME[sp.kind]) {
        sp.held = true;
        sp.hold = 0;
        this.pointer = { mode: 'hold', sp, t: 0, x, y };
        this.emit('holdStart', sp);
        return { type: 'hold', specimen: sp };
      }
      if (sp.kind === 'chicken' && !sp.fled) {
        // 첫 번째 톡: 닭이 놀라 달아난다. 달아나는 동안 한 번 더 누르면 잡는다(보너스).
        sp.fled = true;
        sp.flee = CHICKEN_FLEE;
        sp.dir = x < sp.x ? 1 : -1;
        this.emit('flee', sp);
        return { type: 'flee', specimen: sp };
      }
      return this._grab(sp);
    }
    this.pointer = { mode: 'drag', x0: x, y0: y, lx: x, ly: y, ufo0: this.ufoTarget, moved: false };
    return { type: 'drag' };
  }

  pointerMove(x, y) {
    const p = this.pointer;
    if (!p) return;
    if (p.mode === 'hold') {
      const sp = p.sp;
      if (Math.hypot(x - sp.x, y - (sp.mode === 'ground' ? sp.y - 14 : sp.y)) > 90) this._releaseHold();
      return;
    }
    if (p.mode === 'drag') {
      if (!p.moved && Math.hypot(x - p.x0, y - p.y0) > DRAG_SLOP) p.moved = true;
      if (p.moved && this.game.playing) {
        const [a, b] = this.lane;
        this.ufoTarget = clampN(p.ufo0 + (x - p.x0), a, b);
        this._cutStrings(p.lx, p.ly, x, y);
      }
      p.lx = x;
      p.ly = y;
    }
  }

  pointerUp(x, y) {
    const p = this.pointer;
    this.pointer = null;
    if (!p) return null;
    if (p.mode === 'hold') {
      this.pointer = p;
      this._releaseHold();
      return null;
    }
    if (p.mode === 'drag' && !p.moved && this._onUfo(x, y) && this.game.playing) {
      const result = this.game.poke();
      this.emit('poke', result);
      return { type: 'ufo', result };
    }
    return null;
  }

  pointerCancel() {
    if (this.pointer?.mode === 'hold') this._releaseHold();
    this.pointer = null;
  }

  /** 화면의 (x, y) 를 톡 눌렀을 때(누르자마자 뗀 것과 같다). 눌린 것이 없으면 null. */
  tap(x, y) {
    const down = this.pointerDown(x, y);
    if (!down) return null;
    const up = this.pointerUp(x, y);
    return down.type === 'drag' ? up : down;
  }

  _updateHold(dt) {
    const p = this.pointer;
    if (!p || p.mode !== 'hold') return;
    const sp = p.sp;
    if (sp.state !== 'live') {
      this.pointer = null;
      return;
    }
    p.t += dt;
    sp.hold = Math.min(1, p.t / HOLD_TIME[sp.kind]);
    if (sp.hold >= 1) {
      this.pointer = null;
      sp.held = false;
      this._grab(sp, { tags: ['lift'] });
    }
  }

  /** 꾹 누르다 손을 뗐다. 소는 떨어뜨리고, 풍선은 너무 세게(톡) 누르면 터진다. */
  _releaseHold() {
    const p = this.pointer;
    this.pointer = null;
    if (!p || p.mode !== 'hold') return;
    const sp = p.sp;
    sp.held = false;
    const lifted = sp.hold;
    sp.hold = 0;
    if (sp.state !== 'live' || !this.game.playing) return;
    const game = this.game;
    const tut = game.state.tutorial;
    if (sp.kind === 'balloon') {
      if (p.t >= QUICK_TAP) return; // 살살 누르다 뗐다: 아무 일 없음
      // 톡 쳐서 터뜨렸다
      sp.state = 'fade';
      sp.fade = 0.25;
      this.emit('pop', sp);
      this._alertNearest(sp.x);
      if (!tut.balloonPop) {
        tut.balloonPop = true; // 처음 한 번은 가르쳐 준다
        this.emit('hint', { key: 'holdBalloon', specimen: sp });
      } else if (!game.cloaked && game.rng() < game.chance('balloon_pop')) {
        game.incident('balloon_pop', { specimen: 'balloon' });
      }
      return;
    }
    if (sp.kind === 'cow') {
      if (p.t < QUICK_TAP) {
        this.emit('hint', { key: 'holdCow', specimen: sp });
        this.emit('moo', sp);
        return;
      }
      this.emit('drop', { specimen: sp, lifted });
      this._alertNearest(sp.x);
      if (!tut.cowDrop) {
        tut.cowDrop = true;
        this.emit('hint', { key: 'holdCow', specimen: sp });
      } else if (!game.cloaked && game.rng() < game.chance('cow_drop') * (0.5 + lifted)) {
        game.incident('cow_drop', { specimen: 'cow' });
      }
    }
  }

  /** 큰 소리가 나면 가장 가까운 지구인이 곧 고개를 든다. */
  _alertNearest(x) {
    let best = null;
    for (const h of this.humans) {
      if (h.state !== 'walk' || h.leaving) continue;
      if (!best || Math.abs(h.x - x) < Math.abs(best.x - x)) best = h;
    }
    if (best) best.t = Math.min(best.t, 0.25);
  }

  /** 끌던 손가락이 연줄을 가로지르면 줄이 끊긴다. */
  _cutStrings(x0, y0, x1, y1) {
    if (this.airborne) return;
    const { groundY } = this.layout;
    for (const sp of this.specimens) {
      if (sp.kind !== 'kite' || sp.cut || sp.state !== 'live') continue;
      const ex = sp.ax + sp.dir * 90;
      if (crosses(x0, y0, x1, y1, sp.x, sp.y + 10, ex, groundY)) {
        sp.cut = true;
        sp.mode = 'free';
        sp.life = Math.max(sp.life, sp.age + 6);
        this.emit('cut', sp);
      }
    }
  }

  /** 표본 하나를 빔으로 데려간다(표본별 손맛 규칙 포함). */
  _grab(sp, { tags = [] } = {}) {
    const game = this.game;
    let bonus = 1;
    let specRisk = 1;
    tags = [...tags];
    switch (sp.kind) {
      case 'kite':
        if (sp.cut) {
          bonus *= 1.5;
          tags.push('cut');
        } else if (!game.cloaked && !this.airborne && game.rng() < game.chance('kite_tangle')) {
          sp.state = 'caught';
          const report = game.incident('kite_tangle', { specimen: 'kite' });
          const result = { ok: true, gain: 0, formUps: [], report, ending: null };
          this.emit('collect', { specimen: sp, result, auto: false, tags });
          return { type: 'specimen', specimen: sp, result, tags };
        }
        break;
      case 'chicken':
        if (sp.flee > 0) {
          bonus *= 1.5;
          tags.push('caught');
        }
        break;
      case 'drone':
        if (sp.rec) specRisk = 3;
        else {
          specRisk = 0.3;
          bonus *= 1.3;
          tags.push('recOff');
        }
        break;
      case 'meteor':
        if (sp.age < METEOR_PERFECT) {
          bonus *= 2;
          tags.push('perfect');
        }
        break;
      case 'firefly': {
        const g = this.groups.get(sp.group);
        if (g) {
          g.got++;
          if (g.got === 1) g.t = this.time;
          if (g.got >= g.n) {
            if (this.time - g.t <= SWARM_TIME) {
              bonus *= 2;
              tags.push('swarm');
            }
            this.groups.delete(sp.group);
          }
        }
        break;
      }
    }
    if (sp.shiny) {
      bonus *= SHINY_BONUS;
      tags.push('shiny');
    }
    const seers = this.seers();
    // 시선이 오기 직전·가장자리에서 빔을 쏘면 '아슬아슬'
    const near = this._nearCheck();
    const res = game.collect(sp.kind, {
      watchers: seers.map((s) => s.who),
      bonus,
      perfect: tags.includes('perfect'),
      shiny: !!sp.shiny,
      specRisk,
    });
    if (!res.ok) return null;
    if (res.report && res.gain === 0) {
      // 빔을 쏘는 순간 들켰다. 표본은 공중에 멈춘다.
      sp.state = 'caught';
      const culprit = seers.find((s) => s.who === res.report.ctx?.watcher) || seers[0];
      if (culprit?.human) culprit.human.spotted = true;
      if (culprit?.source) culprit.source.spotted = true;
    } else {
      this._beam(sp, false);
      if (near && game.phase === 'play') this._nearMiss(sp.x, sp.y, res.gain);
      this._afterGrab(sp);
    }
    this.emit('collect', { specimen: sp, result: res, auto: false, tags, bonus });
    return { type: 'specimen', specimen: sp, result: res, tags };
  }

  /** 지금 빔을 쏘면 '아슬아슬' 인지. */
  _nearCheck() {
    if (this.nearT > 0 || this.game.cloaked || this.hidden) return false;
    for (const h of this.humans) {
      if (h.leaving) continue;
      if (h.state === 'notice' && h.t < 0.4) return true;
      if (h.state === 'look' && h.gx != null) {
        const m = this._margin(h.gx, h.gw);
        if (m >= 0 && m < NEAR_MARGIN) return true;
      }
    }
    for (const s of this.sources) {
      if (s.phase === 'warn' && s.t < 0.35) return true;
      if (s.phase === 'on') {
        const m = this._margin(s.gx, s.gw);
        if (m >= 0 && m < NEAR_MARGIN) return true;
      }
    }
    return false;
  }

  _nearMiss(x, y, gain) {
    if (this.nearT > 0) return;
    this.nearT = NEAR_COOLDOWN;
    const r = this.game.nearMiss(gain);
    if (r) this.emit('nearMiss', { x, y, gain });
  }

  /** 빔을 쏜 뒤의 숨은 사건 판정: 욕심쟁이 빔, 소 노동조합. */
  _afterGrab(sp) {
    const game = this.game;
    const now = this.time;
    this.recentBeams = this.recentBeams.filter((t) => now - t < 0.9);
    this.recentBeams.push(now);
    if (this.recentBeams.length >= 5 && !game.cloaked) {
      this.recentBeams = [];
      if (game.rng() < game.chance('greedy')) {
        game.incident('greedy', { specimen: sp.kind });
        return;
      }
    }
    if (sp.kind === 'cow') {
      this.cowTimes = this.cowTimes.filter((t) => now - t < 30);
      this.cowTimes.push(now);
      if (this.cowTimes.length >= 3) {
        this.cowTimes = [];
        if (game.rng() < game.chance('cow_union')) game.incident('cow_union', { specimen: 'cow' });
      }
    }
  }

  /** 변명이 통했을 때: 들킨 흔적을 치우고 이어 간다. */
  recover() {
    for (const sp of this.specimens) {
      if (sp.state === 'caught') {
        sp.state = 'fade';
        sp.fade = 1;
      }
    }
    for (const h of this.humans) {
      h.spotted = false;
      if (h.state !== 'walk') {
        h.state = 'walk';
        h.t = BREATHER + this._walkTime(h) * 0.5;
        h.sees = false;
      }
    }
    this.sources = [];
    this.suspicion = 0;
    this.suspectBy = null;
    this.pointer = null;
  }
}
