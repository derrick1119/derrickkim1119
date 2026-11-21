// 화면 속 세계: 걸어 다니며 가끔 하늘을 올려다보는 지구인, 떠다니는 표본.
// 좌표는 CSS 픽셀. 그리기는 render/scene.js 가 이 객체를 읽어서 한다.
import { FORMS, WATCHERS, AIRBORNE_STAGES } from '../data/content.js';
import { Emitter } from './emitter.js';
import { rand, pickWeighted } from './rng.js';

const MAX_SPECIMENS = 6;
const BEAM_TIME = 0.34;
const FADE_TIME = 0.4;
const HIT_RADIUS = { default: 36, meteor: 46, cow: 40, weather: 40 };
/** 한 사람이 고개를 내린 뒤 다른 사람이 올려다보기까지의 최소 숨 돌릴 틈(초). */
const BREATHER = 1.6;

let nextId = 1;

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
    this.spawnT = 0.4;
    this.droneT = 0;
    this.formIndex = -1;
    this.reset();
  }

  get airborne() {
    return AIRBORNE_STAGES.has(FORMS[this.game.formIndex].stage);
  }

  /** 지금 하늘을 올려다보고 있는 지구인들. */
  get watchers() {
    return this.humans.filter((h) => h.state === 'look');
  }

  /** 누군가 올려다보려는 참인지(경고 단계). */
  get noticing() {
    return this.humans.some((h) => h.state === 'notice');
  }

  setLayout(layout) {
    this.layout = { ...this.layout, ...layout };
    const { w, groundY } = this.layout;
    for (const h of this.humans) h.x = Math.min(Math.max(h.x, 24), w - 24);
    for (const sp of this.specimens) {
      sp.x = Math.min(Math.max(sp.x, 20), w - 20);
      if (sp.mode === 'ground') sp.y = groundY - 4;
    }
  }

  /** 새 대원이 도착했을 때: 세계를 비우고 다시 채운다. */
  reset() {
    this.specimens = [];
    this.spawnT = 0.3;
    this.droneT = 0;
    this._buildHumans();
    for (let i = 0; i < 3; i++) this._spawn();
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
      };
    });
  }

  update(dt) {
    const game = this.game;
    if (game.formIndex !== this.formIndex) {
      this._buildHumans();
      this.emit('stage', { form: game.formIndex });
    }
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
      this._updateHumans(dt);
      this._updateSpecimens(dt);
      this._updateDrone(dt);
    }
    this.specimens = this.specimens.filter((sp) => !sp.dead);
  }

  _updateHumans(dt) {
    const { w } = this.layout;
    for (const h of this.humans) {
      const cfg = WATCHERS[h.type];
      h.t -= dt;
      if (h.state === 'walk') {
        h.x += h.dir * cfg.speed * dt;
        if (h.x < 26) {
          h.x = 26;
          h.dir = 1;
        } else if (h.x > w - 26) {
          h.x = w - 26;
          h.dir = -1;
        }
        if (h.t <= 0) {
          h.state = 'notice';
          h.t = this.game.noticeTime;
          // 한 번에 한 사람만 올려다보게 해서 화면을 읽기 쉽게 한다.
          const hold = h.t + cfg.look[1] + BREATHER;
          for (const o of this.humans) if (o !== h && o.state === 'walk') o.t = Math.max(o.t, hold);
          this.emit('notice', h);
        }
      } else if (h.state === 'notice') {
        if (h.t <= 0) {
          h.state = 'look';
          h.t = rand(this.rng, cfg.look[0], cfg.look[1]);
          this.emit('look', h);
        }
      } else if (h.state === 'look') {
        if (h.t <= 0) {
          h.state = 'walk';
          h.t = rand(this.rng, cfg.walk[0], cfg.walk[1]);
          if (this.rng() < 0.4) h.dir *= -1;
          for (const o of this.humans) if (o !== h && o.state === 'walk') o.t = Math.max(o.t, BREATHER);
          this.emit('lookEnd', h);
        }
      }
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
      const a = sp.age;
      switch (sp.mode) {
        case 'float':
          sp.y -= sp.speed * dt;
          sp.x += Math.sin(a * 1.3 + sp.phase) * 10 * dt;
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
        case 'ground':
          sp.x += sp.dir * sp.speed * dt;
          if (sp.x < 30 || sp.x > w - 30) sp.dir *= -1;
          sp.y = groundY - 4;
          break;
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
      this.spawnT = rand(this.rng, 0.75, 1.25);
    }
  }

  _updateDrone(dt) {
    const interval = this.game.droneInterval;
    if (!Number.isFinite(interval)) return;
    this.droneT = Math.min(this.droneT + dt, interval);
    if (this.droneT < interval) return;
    // 드론은 작아서 눈에 띄지 않는다. 대신 조금씩만 떼어 온다.
    const pool = this.specimens.filter((sp) => sp.state === 'live' && sp.age > 0.5 && sp.mode !== 'streak');
    if (!pool.length) return;
    const sp = pool[Math.floor(this.rng() * pool.length)];
    const res = this.game.collect(sp.kind, { auto: true });
    if (!res.ok) return;
    this.droneT = 0;
    this._beam(sp, true);
    this.emit('collect', { specimen: sp, result: res, auto: true });
  }

  _freeSpot(minY, maxY) {
    const { w, ufoX, ufoY, ufoR } = this.layout;
    let x = 0;
    let y = 0;
    for (let i = 0; i < 10; i++) {
      x = rand(this.rng, 34, w - 34);
      y = rand(this.rng, minY, maxY);
      const nearUfo = Math.hypot(x - ufoX, y - ufoY) < ufoR + 44;
      const crowded = this.specimens.some((sp) => Math.hypot(x - sp.x, y - sp.y) < 58);
      if (!nearUfo && !crowded) break;
    }
    return { x, y };
  }

  _spawn() {
    const { w, top, groundY } = this.layout;
    const table = this.game.spawnTable();
    if (!table.length) return;
    // 같은 종류가 화면을 덮지 않도록, 이미 떠 있는 종류는 가중치를 낮춘다.
    const count = {};
    for (const sp of this.specimens) count[sp.kind] = (count[sp.kind] || 0) + 1;
    const def = pickWeighted(this.rng, table, (e) => e.weight / (1 + 0.6 * (count[e.spec.id] || 0))).spec;
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
        const p = this._freeSpot(skyTop + 10, skyBottom);
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
  }

  _beam(sp, auto) {
    sp.state = 'beam';
    sp.bt = 0;
    sp.bx = sp.x;
    sp.by = sp.y;
    sp.auto = auto;
  }

  /** 화면의 (x, y) 를 눌렀을 때. 눌린 것이 없으면 null. */
  tap(x, y) {
    if (!this.game.playing) return null;
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
    if (best) {
      const looking = this.watchers;
      const res = this.game.collect(best.kind, { watchers: looking.map((h) => h.type) });
      if (!res.ok) return null;
      if (res.report && res.gain === 0) {
        // 빔을 쏘는 순간 들켰다. 표본은 공중에 멈춘다.
        best.state = 'caught';
        const who = looking.find((h) => h.type === res.report.ctx?.watcher);
        if (who) who.spotted = true;
      } else {
        this._beam(best, false);
      }
      this.emit('collect', { specimen: best, result: res, auto: false });
      return { type: 'specimen', specimen: best, result: res };
    }
    const { ufoX, ufoY, ufoR } = this.layout;
    if (Math.hypot(x - ufoX, y - ufoY) <= ufoR) {
      const result = this.game.poke();
      this.emit('poke', result);
      return { type: 'ufo', result };
    }
    return null;
  }
}
