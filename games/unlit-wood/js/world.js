// THE LAMP: 불 꺼진 숲 — 게임 규칙 (화면과 무관하게 Node 에서도 돌아간다)
// 단위는 타일, y 는 아래로 자란다. 고정 스텝 1/120 초.
export const DT = 1 / 120;

export const P = {
  W: 0.5, H: 1.25, HEAD: 1.0,              // 몸 상자, 머리(전구) 중심은 발에서 HEAD 위
  G: 38, JUMP: 13.2, JUMP_CUT: 0.45, TERMINAL: 24,
  RUN: 4.4, ACC: 30, DEC: 36, AIR: 16, PUSH: 2.2,
  COYOTE: 0.1, BUF: 0.12,
  CRACK: 4.3, SHATTER: 6.5, INV: 1.2,       // 떨어진 높이(타일)
  LIGHT_R: 4.6, LANTERN_R: 3.2, BLOOM_R: 2.4,
  MOTH_R: 7.5, MOTH_V: 3.3, MOTH_ALERT: 0.8, MOTH_LOST: 1.6, MOTH_LEASH: 15,
  STALK_V: 2.3, STALK_SENSE: 9, STALK_LEASH: 6, SINK_T: 0.3, SINK_HOLD: 0.8, RISE_T: 0.9,
  WATCH_T: 0.45, WATCH_HALF: 1.6,
  LIFT_UP: 2.2, LIFT_DOWN: 0.7, LIFT_H: 0.5,
  TIDE_MIN: 3.4, TIDE_MAX: 5.2, TIDE_BACK: 10,
  DEAD_T: 1.5,
};

const EPS = 1e-4;
export const CRATE = 0.96;
const CHW = CRATE / 2;
const HW = P.W / 2;

export class World {
  constructor(L, progress) {
    this.L = L; this.w = L.w; this.h = L.h; this.tiles = L.tiles;
    this.events = [];
    this.t = 0; this.playT = 0; this.deaths = 0;
    this.ended = false; this.endT = 0;
    this.cp = -1;
    this.lanterns = L.lanterns.map((l, i) => ({ x: l.x, y: l.y, lit: false, i }));
    this.flowers = L.flowers.map((f, i) => ({ x: f.x, y: f.y, on: false, i }));
    this.shards = L.shards;
    this.lamp = { x: L.lamp.x, y: L.lamp.y, lit: false };
    if (progress) {
      this.cp = Math.min(progress.cp ?? -1, this.lanterns.length - 1);
      for (let i = 0; i <= this.cp; i++) this.lanterns[i].lit = true;
      (progress.flowers || []).forEach((on, i) => { if (this.flowers[i]) this.flowers[i].on = !!on; });
      this.deaths = progress.deaths || 0; this.playT = progress.t || 0;
    }
    this.spawn();
  }

  progress() { return { cp: this.cp, flowers: this.flowers.map((f) => f.on), deaths: this.deaths, t: this.playT }; }
  get bloomed() { return this.flowers.reduce((n, f) => n + (f.on ? 1 : 0), 0); }
  emit(type, data) { this.events.push(data ? { type, ...data } : { type }); }

  // 마지막 등불(없으면 시작점)에서 다시 선다. 생물과 장치는 제자리로.
  spawn() {
    const L = this.L, c = this.cp >= 0 ? this.lanterns[this.cp] : L.start;
    this.p = {
      x: c.x, y: c.y, vx: 0, vy: 0, face: 1, ground: true, lit: this.cp >= 0,
      cracked: false, dead: false, deadT: 0, inv: 0, stun: 0, coyote: 0, buf: 0, peak: c.y,
      jumpHeld: false, lightHeld: false, jumping: false, grab: null, grabSide: 0, pushing: 0,
      stepAcc: 0, pushAcc: 0, cause: '',
    };
    this.crates = L.crates.map((c2) => ({ x: c2.x, y: c2.y, vy: 0, ground: true, ox: c2.x, oy: c2.y }));
    this.moths = L.roosts.map((r) => ({ rx: r.x, ry: r.y, x: r.x, y: r.y, state: 'roost', alert: 0, t: 0, lx: r.x, ly: r.y }));
    this.stalkers = L.stalkers.map((s) => ({ home: s.x, x: s.x, y: s.y, sink: 0, hold: 0, face: -1, lit: false, moving: false }));
    this.watchers = L.watchers.map((w) => ({ ...w, gx: w.x0, seen: 0, sees: false }));
    this.lifts = L.lifts.map((l) => ({ x: l.x, w: l.w, y: l.y0, y0: l.y0, y1: l.y1, lit: false, v: 0 }));
    this.tide = { on: false, x: -99, trigger: L.tide.trigger };
  }

  // ───── 타일 ─────
  solid(tx, ty) {
    if (tx < 0 || tx >= this.w) return true;
    if (ty < 0 || ty >= this.h) return false;
    return this.tiles[ty * this.w + tx] !== 0;
  }
  colSolid(tx, y0, y1) { for (let ty = Math.floor(y0); ty <= Math.floor(y1); ty++) if (this.solid(tx, ty)) return true; return false; }
  rowSolid(ty, x0, x1) { for (let tx = Math.floor(x0); tx <= Math.floor(x1); tx++) if (this.solid(tx, ty)) return true; return false; }
  los(x0, y0, x1, y1) {
    const d = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.ceil(d / 0.2));
    for (let i = 1; i < n; i++) { const k = i / n; if (this.solid(Math.floor(x0 + (x1 - x0) * k), Math.floor(y0 + (y1 - y0) * k))) return false; }
    return true;
  }
  // 그 자리에 빛이 닿는가 (전구의 빛은 벽에 막히고, 등불은 둘레를 밝힌다)
  litAt(x, y) {
    const p = this.p;
    if (p.lit && !p.dead) { const hx = p.x, hy = p.y - P.HEAD; if (Math.hypot(x - hx, y - hy) < P.LIGHT_R && this.los(hx, hy, x, y)) return true; }
    for (const l of this.lanterns) if (l.lit && Math.hypot(x - l.x, y - (l.y - 1.2)) < P.LANTERN_R) return true;
    return false;
  }

  // ───── 다침 ─────
  hurt(cause, fromX) {
    const p = this.p;
    if (p.dead || p.inv > 0 || this.ended) return;
    if (p.cracked) { this.shatter(cause); return; }
    p.cracked = true; p.inv = P.INV;
    this.emit('crack', { cause });
    if (fromX !== undefined) { p.vx = (p.x >= fromX ? 1 : -1) * 5; p.vy = -5.5; p.stun = 0.22; p.ground = false; }
  }
  shatter(cause) {
    const p = this.p;
    if (p.dead || this.ended) return;
    p.dead = true; p.deadT = P.DEAD_T; p.lit = false; p.cause = cause; p.grab = null; p.pushing = 0;
    this.deaths++;
    this.emit('shatter', { cause, x: p.x, y: p.y });
  }

  // ───── 상자 ─────
  moveCrateX(c, dx) {
    const x0 = c.x, top = c.y - CRATE;
    c.x += dx;
    if (dx > 0) { const tx = Math.floor(c.x + CHW); if (this.colSolid(tx, top + EPS, c.y - EPS)) c.x = tx - CHW - EPS; }
    else if (dx < 0) { const tx = Math.floor(c.x - CHW); if (this.colSolid(tx, top + EPS, c.y - EPS)) c.x = tx + 1 + CHW + EPS; }
    for (const o of this.crates) if (o !== c && Math.abs(o.x - c.x) < CRATE && Math.abs(o.y - c.y) < CRATE) { c.x = x0; break; }
    for (const lf of this.lifts) if (c.x + CHW > lf.x && c.x - CHW < lf.x + lf.w && c.y > lf.y + EPS && top < lf.y + P.LIFT_H) c.x = x0;
    const p = this.p;   // 끌 때 주인공을 파고들지 않게
    if (Math.abs(p.x - c.x) < HW + CHW - EPS && p.y > top + EPS && p.y - P.H < c.y - EPS) c.x = x0;
    return c.x - x0;
  }
  updCrates(dt) {
    for (const c of this.crates) {
      c.vy = Math.min(P.TERMINAL, c.vy + P.G * dt);
      const prev = c.y; c.y += c.vy * dt; c.ground = false;
      const ty = Math.floor(c.y);
      if (this.rowSolid(ty, c.x - CHW + EPS, c.x + CHW - EPS)) { c.y = ty; c.vy = 0; c.ground = true; }
      for (const o of this.crates) if (o !== c && Math.abs(o.x - c.x) < CRATE && prev <= o.y - CRATE + 0.06 && c.y >= o.y - CRATE) { c.y = o.y - CRATE; c.vy = 0; c.ground = true; }
      for (const lf of this.lifts) if (c.x + CHW > lf.x && c.x - CHW < lf.x + lf.w && prev <= lf.y + 0.06 && c.y >= lf.y) { c.y = lf.y; c.vy = 0; c.ground = true; }
      if (c.y > this.h + 3) { c.x = c.ox; c.y = c.oy; c.vy = 0; this.emit('crateReset', { x: c.x, y: c.y }); }
    }
  }

  // ───── 한 스텝 ─────
  step(inp, dt = DT) {
    const p = this.p;
    this.t += dt;
    if (this.ended) { this.endT += dt; this.updCrates(dt); return; }
    if (p.dead) {
      p.deadT -= dt;
      this.updCrates(dt); this.updLifts(dt); this.updMoths(dt); this.updStalkers(dt); this.updWatchers(dt); this.updTide(dt);
      if (p.deadT <= 0) { this.spawn(); this.emit('respawn'); }
      return;
    }
    this.playT += dt;
    if (p.inv > 0) p.inv -= dt;
    if (p.stun > 0) p.stun -= dt;

    // 스위치
    if (inp.light && !p.lightHeld) { p.lit = !p.lit; this.emit('light', { on: p.lit }); }
    p.lightHeld = !!inp.light;

    this.updLifts(dt);
    this.movePlayer(inp, dt);
    this.updCrates(dt);
    if (p.dead) return;

    // 유리 조각, 낭떠러지
    for (const s of this.shards) {
      if (p.x + HW > s.x + 0.08 && p.x - HW < s.x + 0.92 && p.y > s.y + 0.72 && p.y - P.H < s.y + 1) { this.shatter('shard'); return; }
    }
    if (p.y > this.h + 2) { this.shatter('fall'); return; }

    // 등불: 지나가면 불이 옮겨붙고, 금이 낫고, 그 자리가 다시 서는 곳이 된다
    for (const l of this.lanterns) {
      if (!l.lit && Math.abs(p.x - l.x) < 1.2 && Math.abs(p.y - l.y) < 2.2) {
        l.lit = true;
        if (l.i > this.cp) this.cp = l.i;
        this.emit('checkpoint', { i: l.i, x: l.x, y: l.y });
      }
      if (l.lit && p.cracked && Math.abs(p.x - l.x) < 1.2 && Math.abs(p.y - l.y) < 2.2) { p.cracked = false; this.emit('heal'); }
    }
    // 빛꽃
    if (p.lit) {
      const hx = p.x, hy = p.y - P.HEAD;
      for (const f of this.flowers) if (!f.on && Math.hypot(f.x - hx, f.y - 0.4 - hy) < P.BLOOM_R && this.los(hx, hy, f.x, f.y - 0.4)) { f.on = true; this.emit('bloom', { i: f.i, x: f.x, y: f.y }); }
    }

    this.updMoths(dt); this.updStalkers(dt); this.updWatchers(dt); this.updTide(dt);

    // 큰 등: 불을 켠 채 닿으면 끝
    const lm = this.lamp;
    if (!p.dead && p.lit && p.ground && Math.abs(p.x - lm.x) < 1.7 && Math.abs(p.y - lm.y) < 1) {
      lm.lit = true; this.ended = true; this.endT = 0; p.vx = 0; this.tide.on = false;
      this.emit('end');
    }
  }

  movePlayer(inp, dt) {
    const p = this.p;
    const ax = p.stun > 0 ? 0 : (inp.ax > 0.3 ? 1 : inp.ax < -0.3 ? -1 : 0);

    // 잡기
    p.grab = null; p.grabSide = 0;
    if (inp.grab && p.ground && p.stun <= 0) {
      for (const c of this.crates) {
        const gap = Math.abs(c.x - p.x) - (HW + CHW);
        if (gap > -0.03 && gap < 0.2 && Math.abs(c.y - p.y) < 0.3) { p.grab = c; p.grabSide = c.x > p.x ? 1 : -1; break; }
      }
    }
    const maxv = p.grab ? P.PUSH : P.RUN;
    const target = ax * maxv;
    const acc = p.ground ? (ax ? P.ACC : P.DEC) : (ax ? P.AIR : 3);
    if (p.vx < target) p.vx = Math.min(target, p.vx + acc * dt); else if (p.vx > target) p.vx = Math.max(target, p.vx - acc * dt);
    if (p.grab) p.face = p.grabSide; else if (ax) p.face = ax;

    // 가로
    const x0 = p.x, dx = p.vx * dt;
    p.x += dx; p.pushing = 0;
    const top = p.y - P.H;
    if (dx > 0) { const tx = Math.floor(p.x + HW); if (this.colSolid(tx, top + EPS, p.y - EPS)) { p.x = tx - HW - EPS; p.vx = 0; } }
    else if (dx < 0) { const tx = Math.floor(p.x - HW); if (this.colSolid(tx, top + EPS, p.y - EPS)) { p.x = tx + 1 + HW + EPS; p.vx = 0; } }
    for (const c of this.crates) {
      if (!(p.y > c.y - CRATE + EPS && top < c.y - EPS)) continue;
      let pen = HW + CHW - Math.abs(c.x - p.x);
      if (pen <= 0) continue;
      const dir = c.x > p.x ? 1 : -1;
      if (p.ground && c.ground && dx * dir > 0) {
        const moved = this.moveCrateX(c, dir * pen);
        if (Math.abs(moved) > 1e-6) { p.pushing = dir; p.pushAcc += Math.abs(moved); }
        pen = HW + CHW - Math.abs(c.x - p.x);
      }
      if (pen > 0) { p.x -= dir * (pen + EPS); if (p.vx * dir > 0) p.vx = 0; }
    }
    if (p.pushing) p.vx = Math.max(-P.PUSH, Math.min(P.PUSH, p.vx));
    for (const lf of this.lifts) {
      if (p.x + HW > lf.x && p.x - HW < lf.x + lf.w && p.y > lf.y + EPS && top < lf.y + P.LIFT_H - EPS) {
        if (p.x < lf.x + lf.w / 2) p.x = lf.x - HW - EPS; else p.x = lf.x + lf.w + HW + EPS;
        p.vx = 0;
      }
    }
    // 끌기: 내가 물러난 만큼 상자가 따라온다
    if (p.grab && ax === -p.grabSide) {
      const ddx = p.x - x0;
      if (ddx * p.grabSide < 0) { const moved = this.moveCrateX(p.grab, ddx); if (Math.abs(moved) > 1e-6) { p.pushing = -p.grabSide; p.pushAcc += Math.abs(moved); } }
    }
    if (p.pushAcc > 0.55) { p.pushAcc = 0; this.emit('push'); }

    // 세로
    p.coyote = p.ground ? P.COYOTE : Math.max(0, p.coyote - dt);
    if (inp.jump && !p.jumpHeld) p.buf = P.BUF; else p.buf = Math.max(0, p.buf - dt);
    p.jumpHeld = !!inp.jump;
    if (p.buf > 0 && p.coyote > 0 && p.stun <= 0) {
      p.vy = -P.JUMP; p.buf = 0; p.coyote = 0; p.ground = false; p.jumping = true; p.peak = p.y;
      this.emit('jump');
    }
    if (p.jumping && !inp.jump && p.vy < 0) { p.vy *= P.JUMP_CUT; p.jumping = false; }
    if (p.vy >= 0) p.jumping = false;
    p.vy = Math.min(P.TERMINAL, p.vy + P.G * dt);
    const prevY = p.y, was = p.ground;
    p.y += p.vy * dt;
    let landed = false;
    const xa = p.x - HW + EPS, xb = p.x + HW - EPS;
    if (p.vy > 0) { const ty = Math.floor(p.y); if (prevY <= ty + EPS && this.rowSolid(ty, xa, xb)) { p.y = ty; landed = true; } }
    else if (p.vy < 0) { const ty = Math.floor(p.y - P.H); if (this.rowSolid(ty, xa, xb)) { p.y = ty + 1 + P.H + EPS; p.vy = 0; } }
    const land = (yTop, yBot, bx0, bx1) => {
      if (!(p.x + HW > bx0 + EPS && p.x - HW < bx1 - EPS)) return;
      if (p.vy >= 0 && prevY <= yTop + 0.06 && p.y >= yTop) { p.y = yTop; landed = true; }
      else if (p.vy < 0 && prevY - P.H >= yBot - 0.06 && p.y - P.H < yBot) { p.y = yBot + P.H + EPS; p.vy = 0; }
    };
    for (const c of this.crates) land(c.y - CRATE, c.y, c.x - CHW, c.x + CHW);
    for (const lf of this.lifts) land(lf.y, lf.y + P.LIFT_H, lf.x, lf.x + lf.w);
    if (landed) {
      if (!was) {
        const drop = p.y - p.peak;
        const soft = this.tiles[Math.floor(p.y + 0.01) * this.w + Math.floor(p.x)] === 2;
        if (drop > 0.6) this.emit('land', { drop, soft });
        if (!soft) { if (drop > P.SHATTER) this.shatter('fall'); else if (drop > P.CRACK) this.hurt('fall'); }
      }
      p.vy = 0; p.ground = true; p.peak = p.y;
    } else { p.ground = false; if (p.y < p.peak) p.peak = p.y; }

    // 발소리
    if (p.ground) { p.stepAcc += Math.abs(p.x - x0); if (p.stepAcc > 0.85) { p.stepAcc = 0; this.emit('step'); } }
  }

  // ───── 빛을 먹고 오르는 승강대 ─────
  updLifts(dt) {
    const p = this.p;
    for (const lf of this.lifts) {
      const was = lf.lit;   // 켜진 전구가 발판 위에 있을 때만 빛을 먹는다
      lf.lit = !p.dead && p.lit && p.x > lf.x - 0.1 && p.x < lf.x + lf.w + 0.1 && p.y <= lf.y + 0.05 && p.y > lf.y - 3;
      if (lf.lit !== was) this.emit('lift', { on: lf.lit });
      let dy = 0;
      if (lf.lit && lf.y > lf.y1) dy = -Math.min(P.LIFT_UP * dt, lf.y - lf.y1);
      else if (!lf.lit && lf.y < lf.y0) dy = Math.min(P.LIFT_DOWN * dt, lf.y0 - lf.y);
      if (dy) {
        const over = p.x + HW > lf.x + EPS && p.x - HW < lf.x + lf.w - EPS;
        const riding = !p.dead && p.ground && over && Math.abs(p.y - lf.y) < 0.03 && p.vy >= 0;
        if (dy > 0) { if (!riding && over && p.y > lf.y + EPS && p.y - P.H < lf.y + P.LIFT_H + dy) dy = 0; }
        else if (riding && this.rowSolid(Math.floor(p.y + dy - P.H), p.x - HW + EPS, p.x + HW - EPS)) dy = 0;
        lf.y += dy;
        if (riding && dy) {   // 같이 움직이되, 옆 땅에 걸친 발이 땅속으로 끌려 들어가지 않게
          const ty = Math.floor(lf.y);
          p.y = dy > 0 && this.rowSolid(ty, p.x - HW + EPS, p.x + HW - EPS) ? Math.min(lf.y, ty) : lf.y;
          p.peak = p.y;
        }
      }
      lf.v = dy / dt;
    }
  }

  // ───── 나방: 켜진 불빛에 달려든다. 불을 끄면 길을 잃는다. ─────
  updMoths(dt) {
    const p = this.p, hx = p.x, hy = p.y - P.HEAD;
    const fly = (m, tx, ty, v) => {
      const d = Math.hypot(tx - m.x, ty - m.y);
      if (d < 1e-3) return d;
      const s = Math.min(d, v * dt), nx = m.x + (tx - m.x) / d * s, ny = m.y + (ty - m.y) / d * s;
      if (!this.solid(Math.floor(nx), Math.floor(m.y))) m.x = nx;
      if (!this.solid(Math.floor(m.x), Math.floor(ny))) m.y = ny;
      return d;
    };
    for (const m of this.moths) {
      const sees = !p.dead && !this.ended && p.lit && Math.hypot(hx - m.x, hy - m.y) < P.MOTH_R && Math.hypot(hx - m.rx, hy - m.ry) < P.MOTH_LEASH && this.los(m.x, m.y, hx, hy);
      if (sees) { m.lx = hx; m.ly = hy; }
      switch (m.state) {
        case 'roost':
          if (sees) { if (m.alert === 0) this.emit('mothStir', { x: m.x, y: m.y }); m.alert += dt; if (m.alert >= P.MOTH_ALERT) { m.state = 'chase'; this.emit('mothAlert', { x: m.x, y: m.y }); } }
          else m.alert = Math.max(0, m.alert - dt * 0.5);
          break;
        case 'chase':
          if (!sees) { m.state = 'lost'; m.t = P.MOTH_LOST; break; }
          if (fly(m, hx, hy, P.MOTH_V) < 0.5) { this.emit('bite', { x: hx, y: hy }); this.hurt('moth', m.x); m.state = 'lost'; m.t = P.MOTH_LOST; m.alert = 0; }
          break;
        case 'lost':
          fly(m, m.lx, m.ly - 0.6, 1.4);
          m.t -= dt;
          if (sees && m.t < P.MOTH_LOST - 0.35) { m.state = 'chase'; }
          else if (m.t <= 0) m.state = 'return';
          break;
        case 'return':
          if (sees) { m.alert += dt; if (m.alert >= 0.3) m.state = 'chase'; }
          else m.alert = 0;
          if (fly(m, m.rx, m.ry, 2.6) < 0.08) { m.state = 'roost'; m.alert = 0; m.x = m.rx; m.y = m.ry; }
          break;
      }
    }
  }

  // ───── 그림자: 어둠 속에서 다가오고, 빛을 받으면 땅에 가라앉는다 ─────
  updStalkers(dt) {
    const p = this.p;
    const canWalk = (x, y) => this.solid(Math.floor(x), Math.floor(y + 0.01)) && !this.solid(Math.floor(x), Math.floor(y - 0.5));
    for (const s of this.stalkers) {
      const lit = this.litAt(s.x, s.y - 0.8);
      if (lit) { if (!s.lit && s.sink < 0.5) this.emit('recoil', { x: s.x, y: s.y }); s.sink = Math.min(1, s.sink + dt / P.SINK_T); s.hold = P.SINK_HOLD; }
      else if (s.hold > 0) s.hold -= dt;
      else s.sink = Math.max(0, s.sink - dt / P.RISE_T);
      s.lit = lit; s.moving = false;
      if (s.sink <= 0) {
        const near = !p.dead && !this.ended && Math.abs(p.x - s.home) < P.STALK_SENSE && Math.abs(p.y - s.y) < 3;
        const tx = Math.max(s.home - P.STALK_LEASH, Math.min(s.home + P.STALK_LEASH, near ? p.x : s.home));
        const d = tx - s.x;
        if (Math.abs(d) > 0.05) {
          const dir = d > 0 ? 1 : -1, st = Math.min(Math.abs(d), (near ? P.STALK_V : P.STALK_V * 0.5) * dt);
          if (canWalk(s.x + dir * (st + 0.36), s.y)) { s.x += dir * st; s.moving = true; }
          s.face = dir;
        }
      }
      if (s.sink < 0.5 && !p.dead && Math.abs(p.x - s.x) < HW + 0.34 && p.y > s.y - 1.45 && p.y - P.H < s.y) {
        this.emit('grabbed', { x: s.x, y: s.y });
        this.hurt('stalker', s.x);
      }
    }
  }

  // ───── 감시자: 빛을 찾는 눈. 켜진 전구가 시선 안에 오래 머물면 끝. ─────
  updWatchers(dt) {
    const p = this.p;
    for (const wt of this.watchers) {
      const ph = (((this.t + wt.phase) / wt.period) % 1 + 1) % 1, tri = ph < 0.5 ? ph * 2 : 2 - ph * 2;
      wt.gx = wt.x0 + (wt.x1 - wt.x0) * tri;
      const hx = p.x, hy = p.y - P.HEAD;
      let sees = false;
      if (!p.dead && !this.ended && p.lit && hy > wt.y + 0.5) {
        const xh = wt.x + (hx - wt.x) * (wt.gy - wt.y) / (hy - wt.y);
        sees = Math.abs(xh - wt.gx) < P.WATCH_HALF && this.los(wt.x, wt.y, hx, hy);
      }
      if (sees) {
        if (!wt.sees) this.emit('watchSee');
        wt.seen += dt;
        if (wt.seen >= P.WATCH_T) { wt.seen = 0; this.emit('caught', { x: p.x, y: p.y }); this.shatter('watcher'); }
      } else wt.seen = Math.max(0, wt.seen - dt * 2);
      wt.sees = sees;
    }
  }

  // ───── 밀물: 다리 위에서 뒤쫓아 오는 어둠 ─────
  updTide(dt) {
    const p = this.p, td = this.tide;
    if (!td.on) {
      if (!p.dead && !this.ended && p.x > td.trigger) { td.on = true; td.x = p.x - P.TIDE_BACK; this.emit('tideStart'); }
      return;
    }
    const d = p.x - td.x;
    td.x += Math.max(P.TIDE_MIN, Math.min(P.TIDE_MAX, P.TIDE_MIN + 0.4 * (d - 5))) * dt;
    if (!p.dead && p.x - HW < td.x) this.shatter('tide');
  }
}
