// THE LAMP: 마지막 불씨 — 게임 로직 (DOM 없이 동작: 브라우저와 tools/sim.mjs 가 같이 쓴다)
import { BASE, WORLD, ENEMIES, NIGHTS, UPG, EVO, xpForLevel, spawnRate, hpScale, speedScale } from './config.js';
import { RNG } from './rng.js';

const TAU = Math.PI * 2;
const CELL = 72;
const COLS = Math.ceil(WORLD.w / CELL) + 1;
const ROWS = Math.ceil(WORLD.h / CELL) + 1;
const MAX_R = 48; // 가장 큰 적의 반지름 (격자 조회 여유분)

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export class Game {
  constructor({ night = 0, meta = {}, seed } = {}) {
    this.nightIndex = night;
    this.night = NIGHTS[night];
    this.meta = meta;
    this.seed = seed ?? ((Math.random() * 0xffffffff) >>> 0);
    this.rng = new RNG(this.seed);
    this.events = [];
    this.t = 0;
    this.state = 'playing'; // playing | levelup | dawn | won | dead
    this.input = { mx: 0, my: 0, toggle: false };

    this.up = { spark: 1 };
    this.evo = {};
    this.stat = {};
    this.enemies = [];
    this.bullets = [];
    this.ebullets = [];
    this.pickups = [];
    this.patches = [];
    this.decoys = [];
    this.lamps = [];
    this.choices = null;
    this.pending = 0;

    this.kills = 0;
    this.lampsLit = 0;
    this.litCount = 0;
    this.allLit = false;
    this.lumenBonus = 0;
    this.boss = null;
    this.bossSpawned = false;
    this.bossKilled = false;
    this.dawnT = 0;
    this.dawnDelay = -1;
    this.dmgBy = {};
    this.dmgTaken = 0;
    this.takenBy = {};
    this.flares = 0;

    this.spawnAcc = 0;
    this.eliteT = 60;
    this.tideIdx = 0;
    this.mothT = 38;
    this.stalkT = 75;
    this.snuffT = 95;
    this.nextId = 1;
    this.tm = { spark: 0.3, lance: 1.2, echo: 0, trail: 0, halo: 0 };

    this.grid = new Array(COLS * ROWS);
    for (let i = 0; i < this.grid.length; i++) this.grid[i] = [];
    this.used = [];
    this._bufs = [[], [], [], []];

    this.p = {
      x: WORLD.w / 2, y: WORLD.h / 2, vx: 0, vy: 0, r: BASE.playerR,
      face: -Math.PI / 2, walk: 0, moving: false,
      oil: 100, lit: true, charge: 0, toggleCd: 0, inv: 0,
      darkTime: 0, sinceDark: 99, lastX: 0, lastY: 0, lr: BASE.lightR, inLamp: false,
      level: 1, xp: 0, xpNeed: xpForLevel(1),
      rerolls: 1 + (meta.reroll || 0),
      revives: meta.revive || 0,
    };
    this.recalc();
    this.p.oil = this.stat.maxOil;
    this.p.lr = this.stat.lightR;
    this.makeLamps();
  }

  emit(type, data) {
    if (this.events.length > 1500) return;
    const ev = data || {};
    ev.type = type;
    this.events.push(ev);
  }

  // ---------- 능력치 ----------
  recalc() {
    const m = this.meta, u = this.up, s = this.stat;
    const L = (id) => u[id] || 0;
    const M = (id) => m[id] || 0;
    s.maxOil = BASE.maxOil + 10 * M('glass') + 20 * L('tank');
    s.lightR = BASE.lightR * (1 + 0.04 * M('wick') + 0.1 * L('wick'));
    s.speed = BASE.speed * (1 + 0.03 * M('feet') + 0.07 * L('boots'));
    s.dmg = (1 + 0.05 * M('hand') + 0.12 * L('heat')) * (1 + BASE.levelDmg * ((this.p ? this.p.level : 1) - 1));
    s.cd = Math.pow(0.93, L('hands'));
    s.drain = BASE.drain * Math.pow(0.86, L('trim'));
    s.magnet = BASE.magnet * (1 + 0.35 * L('magnet'));
    s.chargeRate = (1 / BASE.chargeTime) * (1 + 0.22 * L('dusk'));
    s.darkSpeed = BASE.darkSpeedMul + 0.04 * L('dusk');
    s.armor = Math.min(0.5, 0.08 * L('shade'));
    s.xp = 1 + 0.05 * M('ember') + 0.08 * L('luck');
    s.oilDrop = 0.06 + 0.02 * L('luck');
  }

  wpn(id) {
    const lvl = this.up[id] || 0;
    return lvl > 0 ? UPG[id].lv[lvl - 1] : null;
  }

  // ---------- 가로등 배치 ----------
  makeLamps() {
    const n = this.night.lamps, rng = this.rng;
    const cx = WORLD.w / 2, cy = WORLD.h / 2;
    const a0 = rng.next() * TAU;
    const first = this.newLamp(cx + Math.cos(a0) * 230, cy + Math.sin(a0) * 230);
    first.guarded = true; // 첫 가로등은 지키는 그림자가 없다 (배우는 용도)
    this.lamps.push(first);
    let tries = 0;
    while (this.lamps.length < n && tries++ < 4000) {
      const a = rng.next() * TAU, r = 420 + rng.next() * 1050;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      const minD = tries < 2500 ? 520 : 380;
      let ok = true;
      for (const L of this.lamps) {
        if (Math.hypot(L.x - x, L.y - y) < minD) { ok = false; break; }
      }
      if (ok) this.lamps.push(this.newLamp(x, y));
    }
  }

  newLamp(x, y) {
    return { x, y, lit: false, ever: false, prog: 0, snuff: 0, litT: 0, guarded: false, crowd: 0 };
  }

  // ---------- 격자 ----------
  buildGrid() {
    const used = this.used, grid = this.grid;
    for (let i = 0; i < used.length; i++) grid[used[i]].length = 0;
    used.length = 0;
    const es = this.enemies;
    for (let i = 0; i < es.length; i++) {
      const e = es[i];
      e.inLamp = false;
      const cx = clamp((e.x / CELL) | 0, 0, COLS - 1);
      const cy = clamp((e.y / CELL) | 0, 0, ROWS - 1);
      const k = cy * COLS + cx;
      const c = grid[k];
      if (c.length === 0) used.push(k);
      c.push(e);
    }
  }

  near(x, y, r, slot = 0) {
    const out = this._bufs[slot];
    out.length = 0;
    const R = r + MAX_R;
    const x0 = clamp(((x - R) / CELL) | 0, 0, COLS - 1);
    const x1 = clamp(((x + R) / CELL) | 0, 0, COLS - 1);
    const y0 = clamp(((y - R) / CELL) | 0, 0, ROWS - 1);
    const y1 = clamp(((y + R) / CELL) | 0, 0, ROWS - 1);
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const c = this.grid[cy * COLS + cx];
        for (let i = 0; i < c.length; i++) out.push(c[i]);
      }
    }
    return out;
  }

  // ---------- 메인 업데이트 ----------
  update(dt) {
    if (this.state === 'dawn') { this.updateDawn(dt); return; }
    if (this.state !== 'playing') return;
    this.t += dt;

    this.buildGrid();
    this.updatePlayer(dt);
    this.updateLamps(dt);
    this.updateWeapons(dt);
    this.updatePatches(dt);
    this.updateDecoys(dt);
    this.updateEnemies(dt);
    this.separate();
    this.updateBullets(dt);
    this.updateEnemyBullets(dt);
    this.updatePickups(dt);
    this.sweep();
    this.director(dt);

    if (this.state !== 'playing') return;

    if (this.dawnDelay >= 0) {
      this.dawnDelay -= dt;
      if (this.dawnDelay < 0) { this.startDawn(); return; }
    } else if (this.t >= this.night.duration) {
      const bossAlive = this.boss && !this.boss.dead;
      if (!(this.night.requireBoss && bossAlive)) { this.startDawn(); return; }
    }

    if (this.pending > 0) {
      this.state = 'levelup';
      this.choices = this.rollChoices();
      this.emit('levelup', { level: this.p.level });
    }
  }

  get clock() { return Math.min(this.t, this.night.duration); }
  get held() { // 월식이 살아 있어 새벽이 오지 못하는 상태
    return this.t >= this.night.duration && this.state === 'playing';
  }

  // ---------- 플레이어 ----------
  updatePlayer(dt) {
    const p = this.p, s = this.stat, inp = this.input;
    p.toggleCd -= dt;
    p.inv -= dt;
    if (inp.toggle) {
      inp.toggle = false;
      if (p.toggleCd <= 0) this.toggleLamp();
    }
    let mx = inp.mx, my = inp.my;
    const len = Math.hypot(mx, my);
    if (len > 1) { mx /= len; my /= len; }
    const sp = s.speed * (p.lit ? 1 : s.darkSpeed);
    p.vx = mx * sp; p.vy = my * sp;
    p.x = clamp(p.x + p.vx * dt, 30, WORLD.w - 30);
    p.y = clamp(p.y + p.vy * dt, 30, WORLD.h - 30);
    p.moving = len > 0.08;
    if (p.moving) {
      p.face = Math.atan2(my, mx);
      p.walk += dt * sp / 24;
    }

    if (p.lit) {
      const floor = s.maxOil * BASE.drainFloor;
      if (p.oil > floor) p.oil = Math.max(floor, p.oil - s.drain * dt);
      p.darkTime = Math.max(0, p.darkTime - dt * 2);
      p.sinceDark = 99;
    } else {
      p.charge = Math.min(1, p.charge + dt * s.chargeRate);
      p.darkTime += dt;
      p.sinceDark += dt;
    }
    if (p.oil > s.maxOil) p.oil = s.maxOil;

    const f = clamp(p.oil / s.maxOil, 0, 1);
    let target = p.lit ? s.lightR * (0.42 + 0.58 * Math.pow(f, 0.75)) : BASE.darkR;
    const b = this.boss;
    if (p.lit && b && !b.dead && b.stun <= 0) {
      const d = Math.hypot(b.x - p.x, b.y - p.y);
      if (d < 330) target *= 0.72 + 0.28 * (d / 330);
    }
    p.lr += (target - p.lr) * Math.min(1, dt * (p.lit ? 9 : 13));
  }

  toggleLamp() {
    const p = this.p;
    p.toggleCd = BASE.toggleCd;
    p.lit = !p.lit;
    if (!p.lit) {
      p.sinceDark = 0;
      p.lastX = p.x; p.lastY = p.y;
      this.emit('dark', { x: p.x, y: p.y });
      this.dropDecoy();
    } else {
      const c = p.charge;
      p.charge = 0;
      this.emit('ignite', { x: p.x, y: p.y, charge: c });
      if (c >= BASE.flareMinCharge) this.flare(c);
    }
  }

  flare(c, bonus = 1) {
    const p = this.p, s = this.stat;
    const lvl = this.up.flare || 0, sup = !!this.evo.supernova;
    const R = (BASE.flareR + BASE.flareRCharge * c) * (1 + 0.12 * lvl) * (sup ? 1.35 : 1) * bonus;
    const D = BASE.flareDmg * (0.3 + 0.7 * c) * (1 + 0.3 * lvl) * (sup ? 1.4 : 1) * s.dmg * bonus;
    const stun = (BASE.flareStun + 0.15 * lvl) * (0.5 + 0.5 * c);
    this.flares++;
    const res = this.near(p.x, p.y, R, 2);
    for (let i = 0; i < res.length; i++) {
      const e = res[i];
      if (e.dead) continue;
      const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1;
      if (d > R + e.r) continue;
      if (e.kind === 'boss' && e.shield > 0) {
        if (c >= 0.5) {
          e.shield = 0; e.stun = 2.6; e.vuln = 4;
          this.emit('shieldBreak', { x: e.x, y: e.y });
        } else {
          this.emit('block', { x: e.x, y: e.y });
          continue;
        }
      }
      if (e.kind !== 'boss') e.stun = Math.max(e.stun, stun);
      const k = 300 * e.kb * (0.5 + 0.5 * c);
      e.kx += (dx / d) * k; e.ky += (dy / d) * k;
      this.hit(e, D, 'flare');
    }
    // 섬광은 어둠의 탄환을 지운다
    const eb = this.ebullets;
    for (let i = 0; i < eb.length; i++) {
      const b = eb[i];
      if (Math.hypot(b.x - p.x, b.y - p.y) < R) b.life = 0;
    }
    const mb = this.wpn('moonbolt');
    if (mb) {
      const n = Math.max(1, Math.round(mb.n * c));
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + this.rng.next() * 0.6;
        this.bullets.push({
          kind: 'moon', x: p.x, y: p.y, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260,
          dmg: mb.d * s.dmg, pierce: 0, life: 2.4, r: 6, hits: null, target: null, src: 'moonbolt',
        });
      }
    }
    if (sup) {
      const n = 10;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU;
        this.patches.push({ x: p.x + Math.cos(a) * R * 0.62, y: p.y + Math.sin(a) * R * 0.62, r: 32, life: 2.6, max: 2.6, dps: 26 * s.dmg, src: 'flare' });
      }
      p.oil = Math.min(s.maxOil, p.oil + 6);
    }
    this.emit('flare', { x: p.x, y: p.y, r: R, charge: c });
  }

  dropDecoy() {
    const w = this.wpn('echo');
    if (!w || this.tm.echo > 0) return;
    const p = this.p;
    this.tm.echo = w.cd * this.stat.cd;
    this.decoys.push({ x: p.x, y: p.y, life: w.lure, max: w.lure, dmg: w.d * this.stat.dmg, r: w.r });
    this.emit('decoy', { x: p.x, y: p.y });
  }

  hurtPlayer(dmg, src = 'other') {
    const p = this.p, s = this.stat;
    if (p.inv > 0 || this.state !== 'playing') return;
    dmg *= (1 - s.armor) * (p.lit ? 1 : BASE.darkDmgMul);
    p.oil -= dmg;
    p.inv = BASE.iframes;
    this.dmgTaken += dmg;
    this.takenBy[src] = (this.takenBy[src] || 0) + dmg;
    this.emit('hurt', { x: p.x, y: p.y, v: dmg });
    const res = this.near(p.x, p.y, 80, 3);
    for (let i = 0; i < res.length; i++) {
      const e = res[i];
      const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1;
      if (d < 80 + e.r) { e.kx += (dx / d) * 170 * e.kb; e.ky += (dy / d) * 170 * e.kb; }
    }
    if (p.oil <= 0) {
      if (p.revives > 0) {
        p.revives--;
        p.oil = s.maxOil * 0.6;
        p.inv = 2.2;
        p.lit = true; p.charge = 0; p.sinceDark = 99;
        this.emit('revive', { x: p.x, y: p.y });
        this.flare(1, 1.6);
      } else {
        p.oil = 0;
        this.state = 'dead';
        this.emit('dead', { x: p.x, y: p.y });
      }
    }
  }

  // ---------- 가로등 ----------
  updateLamps(dt) {
    const p = this.p, s = this.stat;
    let lit = 0;
    p.inLamp = false;
    for (const L of this.lamps) {
      if (L.lit) {
        lit++;
        L.litT += dt;
        const res = this.near(L.x, L.y, BASE.lampR, 0);
        let crowd = 0;
        for (let i = 0; i < res.length; i++) {
          const e = res[i];
          const d = Math.hypot(e.x - L.x, e.y - L.y);
          if (d < BASE.lampR) {
            e.inLamp = true;
            if (e.kind === 'moth') e.burnL = BASE.lampBurn;
            else if (e.kind !== 'stalker') crowd++;
          }
        }
        L.crowd = crowd;
        if (Math.hypot(p.x - L.x, p.y - L.y) < BASE.lampR) {
          p.inLamp = true;
          // 빛 안에 그림자가 몰려 있으면 기름이 차지 않는다
          const k = Math.max(0, 1 - crowd / 4);
          if (k > 0) p.oil = Math.min(s.maxOil, p.oil + BASE.lampRegen * k * dt);
        }
      } else {
        const d = Math.hypot(p.x - L.x, p.y - L.y);
        if (!L.guarded && d < 620) { L.guarded = true; this.spawnGuards(L); }
        if (p.lit && d < BASE.lampIgniteDist) {
          L.prog += dt / BASE.lampIgniteTime;
          if (L.prog >= 1) this.lightLamp(L);
        } else if (L.prog > 0) {
          L.prog = Math.max(0, L.prog - dt * 1.5);
        }
      }
    }
    this.litCount = lit;
  }

  // 꺼진 가로등 곁에는 잠든 그림자가 웅크리고 있다. 가로등을 켤수록 다음 무리는 커진다.
  spawnGuards(L) {
    const rng = this.rng, k = this.lampsLit;
    const n = Math.min(16, 4 + k * 2);
    for (let i = 0; i < n; i++) {
      const a = rng.next() * TAU, r = 46 + rng.next() * 74;
      this.spawnEnemy('soot', L.x + Math.cos(a) * r, L.y + Math.sin(a) * r).mode = 'sleep';
    }
    const spit = Math.floor((k - 1) / 2);
    for (let i = 0; i < spit; i++) {
      const a = rng.next() * TAU;
      this.spawnEnemy('spitter', L.x + Math.cos(a) * 130, L.y + Math.sin(a) * 130).mode = 'sleep';
    }
    if (k >= 5) this.spawnEnemy('brute', L.x + rng.range(-40, 40), L.y - 70).mode = 'sleep';
  }

  lightLamp(L) {
    const p = this.p, s = this.stat;
    L.lit = true; L.prog = 0; L.snuff = 0; L.litT = 0;
    const first = !L.ever;
    if (first) {
      L.ever = true;
      this.lampsLit++;
      this.dropXp(L.x, L.y + 18, 7 + p.level * 2, 8);
      p.oil = Math.min(s.maxOil, p.oil + 22);
    }
    this.emit('lampLit', { x: L.x, y: L.y, first });
    // 불이 붙는 순간 주변의 그림자를 밀어낸다
    const res = this.near(L.x, L.y, BASE.lampR, 0);
    for (let i = 0; i < res.length; i++) {
      const e = res[i];
      const dx = e.x - L.x, dy = e.y - L.y, d = Math.hypot(dx, dy) || 1;
      if (d < BASE.lampR) {
        if (e.kind !== 'boss') e.stun = Math.max(e.stun, 0.6);
        e.kx += (dx / d) * 220 * e.kb; e.ky += (dy / d) * 220 * e.kb;
        this.hit(e, 18 * s.dmg, 'lamp');
      }
    }
    if (!this.allLit && this.lamps.every((l) => l.lit)) {
      this.allLit = true;
      this.lumenBonus += 40;
      this.pending++;
      for (const e of this.enemies) {
        if (e.dead || e.kind === 'boss') continue;
        e.stun = Math.max(e.stun, 2.5);
        this.hit(e, 90 * s.dmg, 'lamp');
      }
      this.emit('allLit', {});
    }
  }

  // ---------- 무기 ----------
  updateWeapons(dt) {
    const p = this.p, s = this.stat, tm = this.tm;
    tm.spark -= dt; tm.lance -= dt; tm.echo -= dt;
    if (!p.lit) return;

    // 불씨탄: 빛 안의 가장 가까운 그림자에게
    const sw = this.wpn('spark');
    if (sw && tm.spark <= 0) {
      const sun = !!this.evo.sunspark;
      const n = sw.n + (sun ? 1 : 0);
      const tg = this.nearestEnemies(n, p.lr + 6);
      if (tg.length) {
        for (let i = 0; i < n; i++) {
          const e = tg[i % tg.length];
          let a = Math.atan2(e.y - p.y, e.x - p.x);
          if (i >= tg.length) a += (this.rng.next() - 0.5) * 0.5;
          this.bullets.push({
            kind: 'spark', x: p.x, y: p.y, vx: Math.cos(a) * 450, vy: Math.sin(a) * 450,
            dmg: sw.d * s.dmg, pierce: sw.p, life: 0.85, r: 5, hits: null, boom: sun, src: 'spark',
          });
        }
        tm.spark = sw.cd * s.cd;
        this.emit('shoot', { x: p.x, y: p.y });
      } else {
        tm.spark = 0.08;
      }
    }

    // 반딧불 고리
    const hw = this.wpn('halo');
    if (hw) {
      const cor = !!this.evo.corona;
      const n = cor ? 8 : hw.n, R = hw.r * (cor ? 1.3 : 1), D = hw.d * (cor ? 1.5 : 1) * s.dmg;
      tm.halo += dt * 2.7;
      for (let i = 0; i < n; i++) {
        const a = tm.halo + (i / n) * TAU;
        const ox = p.x + Math.cos(a) * R, oy = p.y + Math.sin(a) * R;
        const res = this.near(ox, oy, 10, 0);
        for (let j = 0; j < res.length; j++) {
          const e = res[j];
          if (e.dead || e.hcd > 0) continue;
          const d = Math.hypot(e.x - ox, e.y - oy);
          if (d < 10 + e.r) {
            e.hcd = 0.42;
            const dx = e.x - p.x, dy = e.y - p.y, dd = Math.hypot(dx, dy) || 1;
            e.kx += (dx / dd) * 90 * e.kb; e.ky += (dy / dd) * 90 * e.kb;
            this.hit(e, D, 'halo');
          }
        }
      }
    }

    // 빛줄기
    const lw = this.wpn('lance');
    if (lw && tm.lance <= 0) {
      const len = Math.max(210, p.lr * 1.6);
      const tg = this.nearestEnemies(1, len);
      if (tg.length) {
        const a0 = Math.atan2(tg[0].y - p.y, tg[0].x - p.x);
        for (let k = 0; k < lw.n; k++) {
          const a = a0 + k * Math.PI;
          const ux = Math.cos(a), uy = Math.sin(a);
          const es = this.enemies;
          for (let i = 0; i < es.length; i++) {
            const e = es[i];
            if (e.dead) continue;
            const rx = e.x - p.x, ry = e.y - p.y;
            const along = rx * ux + ry * uy;
            if (along < -e.r || along > len + e.r) continue;
            const perp = Math.abs(rx * uy - ry * ux);
            if (perp < lw.w / 2 + e.r) this.hit(e, lw.d * s.dmg, 'lance');
          }
          this.emit('beam', { x: p.x, y: p.y, a, len, w: lw.w });
        }
        tm.lance = lw.cd * s.cd;
      } else {
        tm.lance = 0.2;
      }
    }

    // 잉걸불 길
    const tw = this.wpn('trail');
    if (tw && p.moving) {
      tm.trail += Math.hypot(p.vx, p.vy) * dt;
      if (tm.trail >= 26) {
        tm.trail = 0;
        this.patches.push({ x: p.x, y: p.y, r: tw.r, life: tw.life, max: tw.life, dps: tw.dps * s.dmg, src: 'trail' });
      }
    }
  }

  nearestEnemies(n, range) {
    const p = this.p, es = this.enemies, out = [];
    // 작은 n 에 대한 삽입 정렬
    for (let i = 0; i < es.length; i++) {
      const e = es[i];
      if (e.dead) continue;
      if (e.kind === 'boss' && e.shield > 0) continue;
      const d = Math.hypot(e.x - p.x, e.y - p.y) - e.r;
      if (d > range) continue;
      let j = out.length;
      if (j < n) { out.push(e); e._d = d; }
      else if (d < out[n - 1]._d) { out[n - 1] = e; e._d = d; j = n - 1; }
      else continue;
      while (j > 0 && out[j - 1]._d > out[j]._d) {
        const tmp = out[j - 1]; out[j - 1] = out[j]; out[j] = tmp; j--;
      }
    }
    return out;
  }

  updatePatches(dt) {
    const ps = this.patches;
    for (let i = ps.length - 1; i >= 0; i--) {
      const q = ps[i];
      q.life -= dt;
      if (q.life <= 0) { ps[i] = ps[ps.length - 1]; ps.pop(); continue; }
      const res = this.near(q.x, q.y, q.r, 0);
      for (let j = 0; j < res.length; j++) {
        const e = res[j];
        if (Math.hypot(e.x - q.x, e.y - q.y) < q.r + e.r && e.burnP < q.dps) { e.burnP = q.dps; e.burnSrc = q.src; }
      }
    }
  }

  updateDecoys(dt) {
    const ds = this.decoys;
    for (let i = ds.length - 1; i >= 0; i--) {
      const d = ds[i];
      d.life -= dt;
      if (d.life <= 0) {
        const res = this.near(d.x, d.y, d.r, 0);
        for (let j = 0; j < res.length; j++) {
          const e = res[j];
          const dx = e.x - d.x, dy = e.y - d.y, dd = Math.hypot(dx, dy) || 1;
          if (dd < d.r + e.r) {
            e.kx += (dx / dd) * 200 * e.kb; e.ky += (dy / dd) * 200 * e.kb;
            if (e.kind !== 'boss') e.stun = Math.max(e.stun, 0.4);
            this.hit(e, d.dmg, 'echo');
          }
        }
        this.emit('boom', { x: d.x, y: d.y, r: d.r });
        ds.splice(i, 1);
      }
    }
  }

  // ---------- 피해 ----------
  hit(e, dmg, src, quiet) {
    if (e.dead) return;
    if (e.shield > 0) return;
    if (e.frozen) dmg *= 1.5;
    if (e.vuln > 0) dmg *= 1.6;
    e.hp -= dmg;
    e.flash = 0.12;
    this.dmgBy[src] = (this.dmgBy[src] || 0) + dmg;
    if (quiet) e.dotAcc += dmg;
    else this.emit('hit', { x: e.x, y: e.y - e.r, v: dmg, big: dmg >= 40 });
    if (e.hp <= 0) this.kill(e);
  }

  kill(e) {
    if (e.dead) return;
    e.dead = true;
    this.kills++;
    const p = this.p, s = this.stat;
    this.emit('kill', { x: e.x, y: e.y, r: e.r, kind: e.type, elite: e.elite });
    if (e.kind === 'boss') {
      this.bossKilled = true;
      this.dropXp(e.x, e.y, e.xp, 24);
      this.pickups.push({ kind: 'chest', x: e.x, y: e.y, v: 1, vx: 0, vy: 0, t: 0, mag: false, ms: 0 });
      this.dawnDelay = 2.2;
      this.emit('bossDead', { x: e.x, y: e.y });
      return;
    }
    this.dropXp(e.x, e.y, e.xp, e.elite ? 8 : e.xp >= 8 ? 4 : 1);
    const f = clamp(p.oil / s.maxOil, 0, 1);
    let chance = s.oilDrop * (1 + (1 - f) * 1.6);
    if (e.type === 'brute') chance *= 4;
    if (e.elite || this.rng.next() < chance) {
      this.pickups.push({ kind: 'oil', x: e.x, y: e.y, v: e.elite ? 22 : 8, vx: 0, vy: 0, t: 0, mag: false, ms: 0 });
    }
    if (e.elite) {
      this.pickups.push({ kind: 'chest', x: e.x, y: e.y - 14, v: 1, vx: 0, vy: 0, t: 0, mag: false, ms: 0 });
    }
  }

  dropXp(x, y, total, pieces) {
    const ps = this.pickups, rng = this.rng;
    if (ps.length > BASE.maxPickups) {
      // 너무 많으면 기존 불씨에 합친다
      for (let i = 0; i < 8; i++) {
        const k = ps[(rng.next() * ps.length) | 0];
        if (k.kind === 'xp') { k.v += total; return; }
      }
    }
    const each = total / pieces;
    for (let i = 0; i < pieces; i++) {
      const a = rng.next() * TAU, sp = pieces > 1 ? 60 + rng.next() * 150 : 20 * rng.next();
      ps.push({ kind: 'xp', x, y, v: each, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0, mag: false, ms: 0 });
    }
  }

  gainXp(v) {
    const p = this.p;
    p.xp += v * this.stat.xp;
    while (p.xp >= p.xpNeed) {
      p.xp -= p.xpNeed;
      p.level++;
      p.xpNeed = xpForLevel(p.level);
      this.pending++;
      this.stat.dmg = 0; this.recalc();
    }
  }

  // ---------- 적 ----------
  spawnEnemy(type, x, y, elite) {
    const def = ENEMIES[type], n = this.night, rng = this.rng;
    const hs = hpScale(this.t, n);
    const e = {
      id: this.nextId++, type, kind: def.kind,
      x: clamp(x, 8, WORLD.w - 8), y: clamp(y, 8, WORLD.h - 8),
      r: def.r, hp: def.hp * hs, maxHp: 0,
      speed: def.speed * speedScale(this.t, n) * (0.92 + rng.next() * 0.16),
      dmg: def.dmg * n.dmgMul, xp: def.xp, kb: def.kb, lampImmune: !!def.lampImmune,
      mode: 'chase', memT: 0, tx: 0, ty: 0, wanderT: 0, wa: 0,
      stun: 0, flash: 0, hcd: 0, burnL: 0, burnP: 0, burnSrc: 'trail', dotAcc: 0, dotT: 0,
      kx: 0, ky: 0, cd: 1 + rng.next() * 1.5, phase: rng.next() * TAU,
      frozen: false, inLamp: false, elite: !!elite, dead: false, age: 0,
      shield: 0, vuln: 0, lamp: null, lampT: 0, face: 0, _d: 0,
      charger: !!def.charge, cs: 0, ct: 0, cdx: 0, cdy: 0,
    };
    if (elite) { e.hp *= 6; e.r *= 1.45; e.xp *= 6; e.dmg *= 1.3; e.kb *= 0.4; }
    e.maxHp = e.hp;
    this.enemies.push(e);
    return e;
  }

  // 플레이어 둘레의 한 점. ahead 확률로 진행 방향 앞쪽에 잡아 달아나는 길을 막는다.
  ringPos(rmin, rmax, ahead = 0) {
    const p = this.p, rng = this.rng;
    let x = p.x, y = p.y;
    const bias = ahead > 0 && p.moving && rng.next() < ahead;
    for (let i = 0; i < 14; i++) {
      const a = bias && i < 6 ? p.face + (rng.next() - 0.5) * 2.2 : rng.next() * TAU;
      const r = rmin + rng.next() * (rmax - rmin);
      x = p.x + Math.cos(a) * r; y = p.y + Math.sin(a) * r;
      if (x > 10 && y > 10 && x < WORLD.w - 10 && y < WORLD.h - 10) break;
    }
    return [x, y];
  }

  director(dt) {
    const n = this.night, t = this.t, rng = this.rng, p = this.p;
    const bossAlive = this.boss && !this.boss.dead;

    if (this.enemies.length < BASE.maxEnemies) {
      this.spawnAcc += spawnRate(t, n) * (bossAlive ? 0.55 : 1) * dt;
      while (this.spawnAcc >= 1) {
        this.spawnAcc -= 1;
        let type = 'soot';
        const r = rng.next();
        const wBrute = t > 185 ? 0.05 + Math.min(0.07, (t - 185) / 3000) : 0;
        const wSpit = t > 135 ? 0.11 : 0;
        if (r < wBrute) type = 'brute';
        else if (r < wBrute + wSpit) type = 'spitter';
        const [x, y] = this.ringPos(700, 830, 0.4);
        this.spawnEnemy(type, x, y);
      }
    }

    // 나방 떼
    this.mothT -= dt;
    if (this.mothT <= 0 && this.enemies.length < BASE.maxEnemies) {
      this.mothT = 11 + rng.next() * 6;
      const [x, y] = this.ringPos(700, 800);
      const cnt = 5 + Math.min(9, Math.floor(t / 55));
      for (let i = 0; i < cnt; i++) this.spawnEnemy('moth', x + rng.range(-50, 50), y + rng.range(-50, 50));
    }

    // 추적자: 어둠에 오래 머물수록 더 자주 나타난다
    this.stalkT -= dt * (p.lit ? 1 : 1 + Math.min(5, p.darkTime * 0.7));
    if (this.stalkT <= 0) {
      this.stalkT = Math.max(4.5, 13 - t / 55);
      const [x, y] = this.ringPos(640, 780);
      this.spawnEnemy('stalker', x, y);
    }

    // 소등꾼
    if (n.snuffers) {
      this.snuffT -= dt;
      if (this.snuffT <= 0) {
        this.snuffT = 26 + rng.next() * 12;
        // 동시에 둘까지만: 손쓸 수 없이 가로등이 줄줄이 꺼지지 않도록
        let alive = 0;
        for (const e of this.enemies) if (e.kind === 'snuffer' && !e.dead) alive++;
        if (this.litCount > 0 && alive < 2) {
          const [x, y] = this.ringPos(700, 800);
          this.spawnEnemy('snuffer', x, y);
        }
      }
    }

    // 정예
    if (t >= this.eliteT) {
      this.eliteT += 70;
      const [x, y] = this.ringPos(640, 720);
      this.spawnEnemy(t < 120 ? 'soot' : 'brute', x, y, true);
      this.emit('elite', {});
    }

    // 어둠의 파도: 플레이어를 둘러싼다
    if (this.tideIdx < n.tides.length && t >= n.tides[this.tideIdx]) {
      const k = this.tideIdx++;
      const cnt = 20 + k * 8;
      const a0 = rng.next() * TAU;
      for (let i = 0; i < cnt; i++) {
        const a = a0 + (i / cnt) * TAU, r = 430 + rng.next() * 50;
        this.spawnEnemy('soot', p.x + Math.cos(a) * r, p.y + Math.sin(a) * r);
      }
      this.emit('tide', {});
    }

    // 월식
    if (!this.bossSpawned && t >= n.bossAt) {
      this.bossSpawned = true;
      const [x, y] = this.ringPos(560, 620);
      const b = this.spawnEnemy('eclipse', x, y);
      b.hp = ENEMIES.eclipse.hp * n.bossHp; b.maxHp = b.hp;
      b.ringCd = 3; b.sumCd = 7; b.shieldCd = 9;
      this.boss = b;
      this.emit('boss', { x, y });
    }
  }

  updateEnemies(dt) {
    const p = this.p, es = this.enemies, rng = this.rng;
    const seen = p.lit || p.sinceDark < BASE.loseTrackTime;
    const decoy = this.decoys.length ? this.decoys[this.decoys.length - 1] : null;
    const kdecay = Math.pow(0.004, dt); // 넉백 감쇠
    for (let i = 0; i < es.length; i++) {
      const e = es[i];
      if (e.dead) continue;
      e.age += dt;
      e.hcd -= dt;
      if (e.flash > 0) e.flash -= dt;
      if (e.vuln > 0) e.vuln -= dt;

      // 지속 피해
      const burn = e.burnL + e.burnP;
      if (burn > 0) {
        if (e.burnL > 0) this.hit(e, e.burnL * dt, 'lamp', true);
        if (e.burnP > 0 && !e.dead) this.hit(e, e.burnP * dt, e.burnSrc, true);
        e.burnL = 0; e.burnP = 0;
        if (e.dead) continue;
      }
      if (e.dotAcc > 0) {
        e.dotT += dt;
        if (e.dotT > 0.4) {
          this.emit('hit', { x: e.x, y: e.y - e.r, v: e.dotAcc, dot: true });
          e.dotAcc = 0; e.dotT = 0;
        }
      }

      const dx = p.x - e.x, dy = p.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      let vx = 0, vy = 0;
      e.frozen = false;

      if (e.stun > 0) {
        e.stun -= dt;
      } else if (e.mode === 'sleep') {
        if ((p.lit && d < p.lr + 24) || d < BASE.guardWakeDark + e.r || e.hp < e.maxHp) {
          e.mode = 'chase';
          this.emit('wake', { x: e.x, y: e.y });
        }
      } else if (e.kind === 'stalker') {
        // 빛을 받으면 굳는다. 어둠 속에서는 언제나 당신을 안다.
        const illum = (p.lit && d < p.lr - 2) || e.inLamp;
        if (illum) e.frozen = true;
        else { vx = (dx / d) * e.speed; vy = (dy / d) * e.speed; }
      } else if (e.kind === 'boss') {
        this.bossAI(e, dt, dx, dy, d);
        if (e.stun <= 0) { vx = (dx / d) * e.speed; vy = (dy / d) * e.speed; }
      } else {
        // 너무 멀어진 그림자는 다시 둘레로 돌아와 포위를 유지한다
        if (seen && d > 1000 && e.kind !== 'snuffer') {
          const [nx, ny] = this.ringPos(700, 830, 0.5);
          e.x = nx; e.y = ny; e.kx = 0; e.ky = 0; e.cs = 0;
          continue;
        }
        // 시야: 램프가 켜져 있으면 어디서든 보인다
        if (seen) {
          e.mode = 'chase'; e.memT = 0;
        } else if (d < BASE.senseR + e.r) {
          e.mode = 'chase'; e.memT = 0.7;
        } else if (e.mode === 'chase') {
          if (e.memT > 0) e.memT -= dt;
          else {
            e.mode = 'search';
            e.tx = p.lastX + rng.range(-46, 46); e.ty = p.lastY + rng.range(-46, 46);
          }
        }
        let lured = false;
        if (e.mode !== 'chase' && decoy && e.kind !== 'snuffer') {
          const dd = Math.hypot(decoy.x - e.x, decoy.y - e.y);
          if (dd < 430) {
            lured = true;
            e.mode = 'search';
            if (Math.hypot(e.tx - decoy.x, e.ty - decoy.y) > 50) {
              e.tx = decoy.x + rng.range(-30, 30); e.ty = decoy.y + rng.range(-30, 30);
            }
          }
        }

        if (e.kind === 'snuffer' && this.snufferAI(e, dt)) {
          vx = e.kvx; vy = e.kvy;
        } else if (e.kind === 'moth' && e.mode !== 'chase' && !lured) {
          // 나방은 어둠 속에서 가장 가까운 가로등 불빛으로 날아든다
          e.lampT -= dt;
          if (e.lampT <= 0) { e.lampT = 0.8; e.lamp = this.nearestLitLamp(e.x, e.y, 720); }
          const L = e.lamp;
          if (L && L.lit) {
            const lx = L.x - e.x, ly = L.y - e.y, ld = Math.hypot(lx, ly) || 1;
            if (ld > 42) { vx = (lx / ld) * e.speed; vy = (ly / ld) * e.speed; }
            else { vx = (-ly / ld) * e.speed * 0.8; vy = (lx / ld) * e.speed * 0.8; }
          } else {
            this.wander(e, dt);
            vx = Math.cos(e.wa) * e.speed * 0.5; vy = Math.sin(e.wa) * e.speed * 0.5;
          }
        } else if (e.mode === 'chase') {
          if (e.kind === 'spitter') {
            let m = 0;
            if (d > 310) m = 1; else if (d < 180) m = -0.7;
            vx = (dx / d) * e.speed * m; vy = (dy / d) * e.speed * m;
            e.cd -= dt;
            if (e.cd <= 0 && d < 400) {
              e.cd = 2.5 + rng.next() * 0.6;
              this.ebullets.push({ x: e.x, y: e.y, vx: (dx / d) * 172, vy: (dy / d) * 172, dmg: e.dmg, life: 3.2, r: 7 });
              this.emit('spit', { x: e.x, y: e.y });
            }
          } else if (e.charger && e.cs > 0) {
            // 돌진: 잠깐 웅크렸다가 정해진 방향으로 내달린다
            e.ct -= dt;
            if (e.cs === 1) {
              if (e.ct <= 0) { e.cs = 2; e.ct = 0.5; }
            } else {
              vx = e.cdx * 410; vy = e.cdy * 410;
              if (e.ct <= 0) { e.cs = 0; e.cd = 2.4 + rng.next(); }
            }
          } else {
            vx = (dx / d) * e.speed; vy = (dy / d) * e.speed;
            if (e.charger) {
              e.cd -= dt;
              if (e.cd <= 0 && d < 250 && d > 70) {
                e.cs = 1; e.ct = 0.7; e.cdx = dx / d; e.cdy = dy / d;
                vx = 0; vy = 0;
                this.emit('windup', { x: e.x, y: e.y });
              }
            }
            if (e.kind === 'moth') {
              const w = Math.sin(e.age * 7 + e.phase) * 0.9;
              vx += (-dy / d) * e.speed * w; vy += (dx / d) * e.speed * w;
            }
          }
        } else if (e.mode === 'search') {
          const sx = e.tx - e.x, sy = e.ty - e.y, sd = Math.hypot(sx, sy) || 1;
          if (sd < 22) { e.mode = 'wander'; e.wanderT = 0; }
          else { vx = (sx / sd) * e.speed * 0.9; vy = (sy / sd) * e.speed * 0.9; }
        } else {
          this.wander(e, dt);
          vx = Math.cos(e.wa) * e.speed * 0.42; vy = Math.sin(e.wa) * e.speed * 0.42;
        }
      }

      if (vx || vy) {
        e.face = Math.atan2(vy, vx);
        if (e.inLamp && !e.lampImmune) { vx *= BASE.lampSlow; vy *= BASE.lampSlow; }
      }
      e.x = clamp(e.x + (vx + e.kx) * dt, 4, WORLD.w - 4);
      e.y = clamp(e.y + (vy + e.ky) * dt, 4, WORLD.h - 4);
      e.kx *= kdecay; e.ky *= kdecay;

      if (!e.frozen && e.stun <= 0 && p.inv <= 0 && e.mode !== 'sleep') {
        const cd = Math.hypot(p.x - e.x, p.y - e.y);
        if (cd < e.r + p.r - 3) {
          this.hurtPlayer(e.dmg, e.type);
          if (this.state !== 'playing') return;
        }
      }
    }
  }

  wander(e, dt) {
    e.wanderT -= dt;
    if (e.wanderT <= 0) {
      e.wanderT = 1 + this.rng.next() * 1.6;
      e.wa = this.rng.next() * TAU;
    }
  }

  nearestLitLamp(x, y, range) {
    let best = null, bd = range;
    for (const L of this.lamps) {
      if (!L.lit) continue;
      const d = Math.hypot(L.x - x, L.y - y);
      if (d < bd) { bd = d; best = L; }
    }
    return best;
  }

  // 소등꾼: 켜진 가로등을 찾아가 끈다. 처리했으면 true
  snufferAI(e, dt) {
    e.lampT -= dt;
    if (e.lampT <= 0 || (e.lamp && !e.lamp.lit)) {
      e.lampT = 1;
      e.lamp = this.nearestLitLamp(e.x, e.y, 1e9);
    }
    const L = e.lamp;
    if (!L) return false;
    const lx = L.x - e.x, ly = L.y - e.y, ld = Math.hypot(lx, ly) || 1;
    if (ld > 30) {
      e.kvx = (lx / ld) * e.speed; e.kvy = (ly / ld) * e.speed;
    } else {
      e.kvx = 0; e.kvy = 0;
      L.snuff += dt / 3.4;
      if (L.snuff >= 1) {
        L.lit = false; L.snuff = 0; L.prog = 0;
        e.lamp = null;
        this.emit('lampOut', { x: L.x, y: L.y });
      }
    }
    return true;
  }

  bossAI(e, dt, dx, dy, d) {
    const rng = this.rng, n = this.night;
    if (e.shield > 0) e.shield -= dt;
    if (e.stun > 0) return;
    e.ringCd -= dt; e.sumCd -= dt; e.shieldCd -= dt;
    if (e.ringCd <= 0) {
      e.ringCd = 4.2;
      const cnt = 12 + this.nightIndex * 2, a0 = rng.next() * TAU;
      for (let i = 0; i < cnt; i++) {
        const a = a0 + (i / cnt) * TAU;
        this.ebullets.push({ x: e.x + Math.cos(a) * e.r, y: e.y + Math.sin(a) * e.r, vx: Math.cos(a) * 128, vy: Math.sin(a) * 128, dmg: 10 * n.dmgMul, life: 4.5, r: 8 });
      }
      this.emit('bossRing', { x: e.x, y: e.y });
    }
    if (e.sumCd <= 0) {
      e.sumCd = 9.5;
      for (let i = 0; i < 6; i++) {
        const a = rng.next() * TAU;
        this.spawnEnemy('soot', e.x + Math.cos(a) * 70, e.y + Math.sin(a) * 70);
      }
      this.spawnEnemy('stalker', e.x, e.y + 60);
      this.emit('summon', { x: e.x, y: e.y });
    }
    if (e.shieldCd <= 0) {
      e.shieldCd = 17;
      e.shield = 7;
      this.emit('shield', { x: e.x, y: e.y });
    }
  }

  // 겹침 풀기
  separate() {
    const es = this.enemies;
    for (let i = 0; i < es.length; i++) {
      const e = es[i];
      if (e.dead || e.frozen) continue;
      const res = this.near(e.x, e.y, e.r, 0);
      for (let j = 0; j < res.length; j++) {
        const o = res[j];
        if (o.id <= e.id || o.dead) continue;
        const dx = o.x - e.x, dy = o.y - e.y;
        const rr = e.r + o.r;
        const d2 = dx * dx + dy * dy;
        if (d2 >= rr * rr || d2 === 0) continue;
        const d = Math.sqrt(d2);
        const push = (rr - d) * 0.5;
        const nx = dx / d, ny = dy / d;
        const we = o.r / rr, wo = e.r / rr;
        if (e.kind !== 'boss') { e.x -= nx * push * we; e.y -= ny * push * we; }
        if (!o.frozen && o.kind !== 'boss') { o.x += nx * push * wo; o.y += ny * push * wo; }
      }
    }
  }

  // ---------- 탄환 ----------
  updateBullets(dt) {
    const bs = this.bullets;
    for (let i = bs.length - 1; i >= 0; i--) {
      const b = bs[i];
      b.life -= dt;
      if (b.kind === 'moon') {
        // 유도
        if (!b.target || b.target.dead) b.target = this.randomEnemyNear(b.x, b.y, 520);
        const tg = b.target;
        if (tg) {
          const dx = tg.x - b.x, dy = tg.y - b.y, d = Math.hypot(dx, dy) || 1;
          b.vx += (dx / d) * 1500 * dt; b.vy += (dy / d) * 1500 * dt;
          const sp = Math.hypot(b.vx, b.vy);
          if (sp > 400) { b.vx = (b.vx / sp) * 400; b.vy = (b.vy / sp) * 400; }
        }
      }
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.life > 0) {
        const res = this.near(b.x, b.y, b.r, 0);
        for (let j = 0; j < res.length; j++) {
          const e = res[j];
          if (e.dead) continue;
          if (b.hits && b.hits.indexOf(e.id) >= 0) continue;
          if (Math.hypot(e.x - b.x, e.y - b.y) < b.r + e.r) {
            if (e.shield > 0) { b.life = 0; this.emit('block', { x: b.x, y: b.y }); break; }
            e.kx += b.vx * 0.12 * e.kb; e.ky += b.vy * 0.12 * e.kb;
            this.hit(e, b.dmg, b.src);
            if (b.boom) {
              const rr = this.near(b.x, b.y, 48, 1);
              for (let k = 0; k < rr.length; k++) {
                const o = rr[k];
                if (o === e || o.dead) continue;
                if (Math.hypot(o.x - b.x, o.y - b.y) < 48 + o.r) this.hit(o, b.dmg * 0.65, b.src);
              }
              this.emit('pop', { x: b.x, y: b.y, r: 48 });
            }
            if (b.pierce > 0) {
              b.pierce--;
              (b.hits || (b.hits = [])).push(e.id);
            } else {
              b.life = 0;
              break;
            }
          }
        }
      }
      if (b.life <= 0) { bs[i] = bs[bs.length - 1]; bs.pop(); }
    }
  }

  randomEnemyNear(x, y, range) {
    const es = this.enemies;
    if (!es.length) return null;
    for (let k = 0; k < 10; k++) {
      const e = es[(this.rng.next() * es.length) | 0];
      if (!e.dead && e.shield <= 0 && Math.hypot(e.x - x, e.y - y) < range) return e;
    }
    return null;
  }

  updateEnemyBullets(dt) {
    const bs = this.ebullets, p = this.p;
    for (let i = bs.length - 1; i >= 0; i--) {
      const b = bs[i];
      b.life -= dt;
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.life > 0 && Math.hypot(b.x - p.x, b.y - p.y) < b.r + p.r - 2) {
        if (p.inv <= 0) this.hurtPlayer(b.dmg, 'orb');
        b.life = 0;
      }
      if (b.life <= 0) { bs[i] = bs[bs.length - 1]; bs.pop(); }
    }
  }

  // ---------- 줍기 ----------
  updatePickups(dt) {
    const ps = this.pickups, p = this.p, s = this.stat;
    const mag = s.magnet * (p.lit ? 1 : BASE.darkMagnetMul);
    for (let i = ps.length - 1; i >= 0; i--) {
      const k = ps[i];
      k.t += dt;
      if (k.vx || k.vy) {
        k.x += k.vx * dt; k.y += k.vy * dt;
        k.vx *= 0.9; k.vy *= 0.9;
        if (Math.abs(k.vx) + Math.abs(k.vy) < 2) { k.vx = 0; k.vy = 0; }
      }
      const dx = p.x - k.x, dy = p.y - k.y, d = Math.hypot(dx, dy) || 1;
      if (!k.mag && k.t > 0.25 && d < (k.kind === 'chest' ? 40 : mag)) k.mag = true;
      if (k.mag) {
        k.ms = Math.min(900, (k.ms || 200) + 1100 * dt);
        k.x += (dx / d) * k.ms * dt; k.y += (dy / d) * k.ms * dt;
      }
      if (d < p.r + 13) {
        if (k.kind === 'xp') {
          this.gainXp(k.v);
          this.emit('xp', { x: k.x, y: k.y });
        } else if (k.kind === 'oil') {
          p.oil = Math.min(s.maxOil, p.oil + k.v);
          this.emit('oil', { x: k.x, y: k.y, v: k.v });
        } else if (k.kind === 'chest') {
          this.pending++;
          p.oil = Math.min(s.maxOil, p.oil + 20);
          this.emit('chest', { x: k.x, y: k.y });
        }
        ps[i] = ps[ps.length - 1]; ps.pop();
      }
    }
  }

  sweep() {
    const es = this.enemies;
    let w = 0;
    for (let i = 0; i < es.length; i++) {
      if (!es[i].dead) es[w++] = es[i];
    }
    es.length = w;
  }

  // ---------- 새벽 ----------
  startDawn() {
    this.state = 'dawn';
    this.dawnT = 0;
    this.won = true;
    this.ebullets.length = 0;
    this.emit('dawn', {});
  }

  updateDawn(dt) {
    this.dawnT += dt;
    const p = this.p;
    p.inv = 1;
    // 햇빛이 번지며 그림자가 타 없어진다
    const reach = this.dawnT * 520;
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (Math.hypot(e.x - p.x, e.y - p.y) < reach) {
        e.dead = true;
        this.emit('kill', { x: e.x, y: e.y, r: e.r, kind: e.type, dawn: true });
      }
    }
    this.sweep();
    // 남은 것들을 끌어당긴다
    for (const k of this.pickups) k.mag = true;
    this.updatePickups(dt);
    let mx = this.input.mx, my = this.input.my;
    const len = Math.hypot(mx, my);
    if (len > 1) { mx /= len; my /= len; }
    p.x = clamp(p.x + mx * this.stat.speed * dt, 30, WORLD.w - 30);
    p.y = clamp(p.y + my * this.stat.speed * dt, 30, WORLD.h - 30);
    p.moving = len > 0.08;
    if (p.moving) { p.face = Math.atan2(my, mx); p.walk += dt * 7; }
    p.lr += (this.stat.lightR * 1.6 - p.lr) * Math.min(1, dt * 2);
    if (this.dawnT > 4) {
      this.pending = 0;
      this.state = 'won';
      this.emit('won', {});
    }
  }

  // ---------- 레벨업 ----------
  rollChoices() {
    const rng = this.rng, u = this.up, lvlNow = this.p.level;
    const out = [];
    for (const id in EVO) {
      const ev = EVO[id];
      if (this.evo[id]) continue;
      if ((u[ev.from] || 0) >= UPG[ev.from].max && (u[ev.needs] || 0) >= 1) {
        out.push({ id, kind: 'evo', level: 1 });
        break;
      }
    }
    const pool = [];
    for (const id in UPG) {
      const def = UPG[id], lvl = u[id] || 0;
      if (lvl >= def.max) continue;
      let w = 1;
      if (lvl > 0) w *= 1.7;
      if (def.type !== 'passive' && lvl === 0 && lvlNow <= 4) w *= 2.2;
      pool.push({ id, w, level: lvl + 1 });
    }
    while (out.length < 3 && pool.length) {
      let tot = 0;
      for (const c of pool) tot += c.w;
      let r = rng.next() * tot, idx = 0;
      for (; idx < pool.length - 1; idx++) { r -= pool[idx].w; if (r <= 0) break; }
      const c = pool.splice(idx, 1)[0];
      out.push({ id: c.id, kind: 'upg', level: c.level });
    }
    const fill = ['refill', 'lumen', 'refill'];
    while (out.length < 3) out.push({ id: fill[out.length], kind: 'bonus', level: 1 });
    return out;
  }

  choose(i) {
    if (this.state !== 'levelup' || !this.choices) return;
    const c = this.choices[i];
    if (!c) return;
    const p = this.p, s = this.stat;
    if (c.kind === 'evo') {
      this.evo[c.id] = true;
    } else if (c.kind === 'upg') {
      this.up[c.id] = (this.up[c.id] || 0) + 1;
      this.recalc();
      if (c.id === 'tank') p.oil = Math.min(s.maxOil, p.oil + 20);
    } else if (c.id === 'refill') {
      p.oil = Math.min(s.maxOil, p.oil + s.maxOil * 0.5);
    } else if (c.id === 'lumen') {
      this.lumenBonus += 10;
    }
    p.oil = Math.min(s.maxOil, p.oil + 6);
    p.inv = Math.max(p.inv, 0.6);
    this.emit('upgrade', { id: c.id, kind: c.kind });
    this.pending--;
    if (this.pending > 0) {
      this.choices = this.rollChoices();
    } else {
      this.choices = null;
      this.state = 'playing';
    }
  }

  reroll() {
    if (this.state !== 'levelup' || this.p.rerolls <= 0) return false;
    this.p.rerolls--;
    this.choices = this.rollChoices();
    return true;
  }

  // ---------- 결산 ----------
  lumenEarned() {
    let v = Math.floor(this.clock / 8) + Math.floor(this.kills / 20) + this.lampsLit * 4 + this.lumenBonus;
    if (this.bossKilled) v += 50;
    if (this.won) v += 40 + 30 * this.nightIndex;
    v *= (1 + 0.25 * this.nightIndex) * (1 + 0.1 * (this.meta.purse || 0));
    return Math.floor(v);
  }

  score() {
    return Math.floor(this.kills * 10 + this.lampsLit * 200 + this.clock * 5 + this.p.level * 50
      + (this.bossKilled ? 3000 : 0) + (this.won ? 2000 * (this.nightIndex + 1) : 0));
  }
}
