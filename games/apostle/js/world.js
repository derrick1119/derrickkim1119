// THE LAMP: 빛의 사도 — 게임 규칙 (화면과 무관하게 Node 에서도 돌아간다)
// 단위는 타일, y 는 아래로 자란다. 고정 스텝 1/120 초.
// 움직이는 상태는 모두 this.S (순수한 자료) 에 있어서, 제단에서 통째로 적어 두었다가 되돌릴 수 있다.
export const DT = 1 / 120;

export const P = {
  G: 38, JUMP: 13.2, JUMP_CUT: 0.45, TERMINAL: 22, RUN: 4.4, ACC: 30, DEC: 36, AIR: 16, COYOTE: 0.1, BUF: 0.12,
  PIPS: 3, INV: 1.0, FADE_T: 1.4,
  WISP_V: 6, WISP_ACC: 44, TETHER: 10, ENTER_R: 1.15, WISP_R: 1.4,
  LANTERN_R: 4.2, FLASH_R: 2.7, FLASH_T: 0.25, CRYSTAL_NEAR: 2.2, CRYSTAL_T: 0.4, CRYSTAL_R: 2.6,
  SLASH_T: 0.22, SLASH_CD: 0.4, SLASH_REACH: 1.55, SLASH_R: 2.2,
  STICK_CD: 0.12, SLIDE: 2.2, LEDGE: 1.0,
  ARROW_V: 18, ARROW_RANGE: 16, ARROW_CD: 0.45, ARROW_R: 1.4, AIM: Math.PI / 6, PEG_W: 0.8, PEG_R: 2.2, PEGS: 3,
  DUSKY_V: 1.5, DUSKY_SENSE: 6.5, DUSKY_LEASH: 4, COWER_V: 1.8, CALM: 2.5,
  MOTH_R: 6, MOTH_V: 3, MOTH_ALERT: 0.9, MOTH_PEG_R: 3.5, MOTH_WISP_R: 3.5,
  LICHEN_T: 1.5, LICHEN_R: 4,
  GOAL_R: 1.8, GOAL_LIGHT: 6,
};
// 깃들 수 있는 것들: 크기만 다르고 걷고 뛰는 힘은 같다. 하는 일이 다르다.
export const VESSEL = { lantern: { w: 0.6, h: 0.7 }, sword: { w: 0.4, h: 1.15 }, bow: { w: 0.5, h: 1.0 } };
export const BODY = { dusky: { w: 0.6, h: 0.7 }, little: { w: 0.4, h: 0.4 }, guardian: { w: 1.0, h: 1.6 } };

const EPS = 1e-4;

export class World {
  constructor(L) {
    this.L = L; this.w = L.w; this.h = L.h; this.tiles = L.tiles;
    this.events = []; this.playT = 0; this.fades = 0;
    this.held = { jump: false, act: false, pos: false };
    this.lights = []; this.R = [];
    this.S = {
      t: 0, pips: P.PIPS, inv: 0, fade: 0, host: -1, anchorV: -1,
      wisp: { x: L.start.x, y: L.start.y, vx: 0, vy: 0 },
      vessels: L.vessels.map((v) => ({ kind: v.kind, x: v.x, y: v.y, vx: 0, vy: 0, face: v.face || 1, ground: true, on: !!v.on, stuck: 0, stickCd: 0, coyote: 0, buf: 0, jumping: false, slashT: 0, cd: 0, safeX: v.x, safeY: v.y, stepAcc: 0 })),
      day: L.day.map(() => false), night: L.night.map(() => true),
      crystals: L.crystals.map(() => ({ lit: false, near: 0 })), gates: L.gates.map(() => ({ open: false })),
      lichens: L.lichens.map(() => ({ t: 0, on: false })), ropes: L.ropes.map(() => ({ cut: false })),
      slabs: L.slabs.map((s) => ({ y: s.y, vy: 0, free: false, landed: false })),
      shrines: L.shrines.map(() => ({ lit: false })), cp: -1,
      creatures: L.creatures.map((c) => ({ alive: true, gone: false, hp: c.hp || 1, x: c.x, y: c.y, face: -1, state: c.sleep ? 'sleep' : 'idle', t: 0, alert: 0, calm: 0 })),
      pegs: [], arrows: [], flashes: [], done: false, doneT: 0,
    };
    this.refresh(); this.stepBlocks();
    this.snap = JSON.stringify(this.S);
  }

  emit(type, data) { this.events.push(data ? { type, ...data } : { type }); }
  get total() { return this.L.creatures.length; }
  get alive() { return this.S.creatures.reduce((n, c) => n + (c.alive ? 1 : 0), 0); }
  get host() { return this.S.host >= 0 ? this.S.vessels[this.S.host] : null; }
  // 사도가 지금 있는 자리 (깃든 몸의 한가운데, 아니면 빛 알갱이)
  pos() { const v = this.host; return v ? { x: v.x, y: v.y - VESSEL[v.kind].h / 2 } : { x: this.S.wisp.x, y: this.S.wisp.y }; }

  // ───── 타일 ─────  0 빈 곳, 1 흙·돌, 2 나무(검이 박히고 화살이 꽂힌다), 3 창살(몸은 못 지나가고 빛 알갱이만 지나간다)
  T(tx, ty) { if (tx < 0 || tx >= this.w) return 1; if (ty < 0 || ty >= this.h) return 0; return this.tiles[ty * this.w + tx]; }
  rowSolid(ty, x0, x1) { for (let tx = Math.floor(x0); tx <= Math.floor(x1); tx++) if (this.T(tx, ty)) return true; return false; }
  colHit(tx, y0, y1, yc) { let any = 0; for (let ty = Math.floor(y0); ty <= Math.floor(y1); ty++) if (this.T(tx, ty)) any = 1; return any ? (this.T(tx, Math.floor(yc)) === 2 ? 2 : 1) : 0; }
  los(x0, y0, x1, y1) {
    const d = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.ceil(d / 0.2));
    for (let i = 1; i < n; i++) { const k = i / n, t = this.T(Math.floor(x0 + (x1 - x0) * k), Math.floor(y0 + (y1 - y0) * k)); if (t === 1 || t === 2) return false; }
    return true;
  }

  // 이번 스텝의 빛과, 타일이 아닌 단단한 것들을 모아 둔다
  refresh() {
    const S = this.S, L = this.L, li = this.lights = [], R = this.R = [];
    for (const v of S.vessels) if (v.kind === 'lantern' && v.on) li.push({ x: v.x, y: v.y - 0.35, r: P.LANTERN_R, k: 'lantern' });
    if (S.host < 0 && !S.done) li.push({ x: S.wisp.x, y: S.wisp.y, r: P.WISP_R, k: 'wisp' });
    for (const p of S.pegs) li.push({ x: p.lx, y: p.ly, r: P.PEG_R, k: 'peg' });
    for (const a of S.arrows) li.push({ x: a.x, y: a.y, r: P.ARROW_R, k: 'arrow' });
    for (const f of S.flashes) li.push({ x: f.x, y: f.y, r: f.r, k: 'flash' });
    L.crystals.forEach((c, i) => { if (S.crystals[i].lit) li.push({ x: c.x, y: c.y, r: P.CRYSTAL_R, k: 'crystal' }); });
    if (S.done) li.push({ x: L.goal.x, y: L.goal.y - 2.4, r: P.GOAL_LIGHT, k: 'goal' });
    L.day.forEach((b, i) => { if (S.day[i]) R.push({ x0: b.x, y0: b.y, x1: b.x + 1, y1: b.y + 1 }); });
    L.night.forEach((b, i) => { if (S.night[i]) R.push({ x0: b.x, y0: b.y, x1: b.x + 1, y1: b.y + 1 }); });
    L.gates.forEach((g, i) => { if (!S.gates[i].open) R.push({ x0: g.x, y0: g.y, x1: g.x + g.w, y1: g.y + g.h }); });
    L.slabs.forEach((s, i) => R.push({ x0: s.x, y0: S.slabs[i].y, x1: s.x + s.w, y1: S.slabs[i].y + s.h }));
    L.creatures.forEach((c, i) => { const d = S.creatures[i]; if (c.kind === 'guardian' && d.alive && !d.gone) R.push({ x0: d.x - 0.5, y0: d.y - 1.6, x1: d.x + 0.5, y1: d.y, guard: true }); });
    for (const p of S.pegs) if (p.plat) R.push({ x0: p.x0, y0: p.y, x1: p.x1, y1: p.y + 0.2, ow: true });
    S.vessels.forEach((v, i) => {      // 벽에 박아 두고 떠난 검은 발판이 된다
      if (v.kind !== 'sword' || !v.stuck || i === S.host) return;
      const f = v.x + v.stuck * 0.2, y = v.y - 0.575;
      R.push(v.stuck > 0 ? { x0: f - P.LEDGE, y0: y, x1: f, y1: y + 0.2, ow: true } : { x0: f, y0: y, x1: f + P.LEDGE, y1: y + 0.2, ow: true });
    });
  }
  // 그 자리를 비추는 가장 가까운 빛 (없으면 null)
  lightAt(x, y) {
    let best = null, bd = 1e9;
    for (const l of this.lights) { const d = Math.hypot(x - l.x, y - l.y); if (d < l.r && d < bd && this.los(l.x, l.y, x, y)) { best = l; bd = d; } }
    return best;
  }

  // ───── 몸 움직이기 ─────
  moveX(b, hw, hgt, dx) {
    b.x += dx; let hit = 0;
    const top = b.y - hgt + EPS, bot = b.y - EPS, yc = b.y - hgt / 2;
    if (dx > 0) { const tx = Math.floor(b.x + hw), t = this.colHit(tx, top, bot, yc); if (t) { b.x = tx - hw - EPS; hit = t; } }
    else if (dx < 0) { const tx = Math.floor(b.x - hw), t = this.colHit(tx, top, bot, yc); if (t) { b.x = tx + 1 + hw + EPS; hit = t; } }
    for (const r of this.R) {
      if (r.ow || !(b.y > r.y0 + EPS && b.y - hgt < r.y1 - EPS) || !(b.x + hw > r.x0 && b.x - hw < r.x1)) continue;
      b.x = b.x < (r.x0 + r.x1) / 2 ? r.x0 - hw - EPS : r.x1 + hw + EPS; hit = hit || 1;
    }
    return hit;
  }
  moveY(b, hw, hgt, dt) {
    const prevY = b.y; b.y += b.vy * dt;
    let landed = false;
    const xa = b.x - hw + EPS, xb = b.x + hw - EPS;
    if (b.vy > 0) { const ty = Math.floor(b.y); if (prevY <= ty + EPS && this.rowSolid(ty, xa, xb)) { b.y = ty; landed = true; } }
    else if (b.vy < 0) { const ty = Math.floor(b.y - hgt); if (this.rowSolid(ty, xa, xb)) { b.y = ty + 1 + hgt + EPS; b.vy = 0; } }
    for (const r of this.R) {
      if (!(b.x + hw > r.x0 + EPS && b.x - hw < r.x1 - EPS)) continue;
      if (b.vy >= 0 && prevY <= r.y0 + 0.06 && b.y >= r.y0) { b.y = r.y0; landed = true; }
      else if (!r.ow && b.vy < 0 && prevY - hgt >= r.y1 - 0.06 && b.y - hgt < r.y1) { b.y = r.y1 + hgt + EPS; b.vy = 0; }
    }
    if (landed) b.vy = 0;
    return landed;
  }

  // ───── 한 스텝 ─────
  step(inp, dt = DT) {
    let S = this.S;
    S.t += dt;
    if (S.fade > 0) {        // 빛이 다 꺼졌다 → 마지막 제단의 순간으로 되돌아간다
      S.fade -= dt;
      if (S.fade <= 0) { S = this.S = JSON.parse(this.snap); this.refresh(); this.emit('respawn'); }
      this.hold(inp); return;
    }
    if (S.done) S.doneT += dt; else this.playT += dt;
    if (S.inv > 0) S.inv -= dt;
    this.refresh();
    if (!S.done) {
      if (inp.pos && !this.held.pos) this.possess();
      if (S.host >= 0 && inp.act && !this.held.act) this.act(S.vessels[S.host], inp);
    }
    S.vessels.forEach((v, i) => this.stepVessel(v, i, inp, dt));
    if (S.host < 0 && !S.done) this.stepWisp(inp, dt);
    this.stepArrows(dt);
    for (let i = S.flashes.length - 1; i >= 0; i--) if ((S.flashes[i].t -= dt) <= 0) S.flashes.splice(i, 1);
    this.stepBlocks(); this.stepSwitches(dt); this.stepSlabs(dt); this.stepCreatures(dt);
    this.hold(inp);
  }
  hold(inp) { this.held.jump = !!inp.jump; this.held.act = !!inp.act; this.held.pos = !!inp.pos; }

  // ───── 깃들기 · 나오기 ─────
  possess() {
    const S = this.S, L = this.L, g = L.goal;
    if (S.host >= 0) {
      const v = S.vessels[S.host], sz = VESSEL[v.kind];
      if (Math.hypot(v.x - g.x, v.y - sz.h / 2 - (g.y - 0.8)) < P.GOAL_R) { this.finish(); return; }
      S.wisp = { x: v.x, y: v.y - sz.h / 2, vx: 0, vy: -1.5 };
      S.anchorV = S.host; S.host = -1;
      this.emit('exit', { kind: v.kind });
    } else {
      // 가까운 몸으로 들어간다. 방금 나온 몸과 다른 몸이 함께 닿으면 다른 몸을 고른다.
      let best = -1, bd = P.ENTER_R, back = -1;
      S.vessels.forEach((v, i) => { const d = Math.hypot(v.x - S.wisp.x, v.y - VESSEL[v.kind].h / 2 - S.wisp.y); if (d >= P.ENTER_R) return; if (i === S.anchorV) back = i; else if (d < bd) { bd = d; best = i; } });
      if (best < 0) best = back;
      if (best >= 0) { S.host = best; S.anchorV = best; this.emit('enter', { kind: S.vessels[best].kind }); }
      else if (Math.hypot(S.wisp.x - g.x, S.wisp.y - (g.y - 0.8)) < P.GOAL_R + 0.6) this.finish();
      else this.emit('nope');
    }
  }
  finish() {         // 훔쳐 간 등에 깃든다 → 불이 켜진다
    const S = this.S;
    S.host = -1; S.done = true; S.doneT = 0; S.wisp = { x: this.L.goal.x, y: this.L.goal.y - 2.4, vx: 0, vy: 0 };
    this.emit('goal');
    this.L.creatures.forEach((c, i) => { const d = S.creatures[i]; if (d.alive && !d.gone && c.burrow !== undefined && c.kind !== 'moth' && Math.abs(d.x - this.L.goal.x) < 9) d.state = 'flee'; });
  }

  // ───── 깃든 몸마다 하는 일 ─────
  act(v, inp) {
    const S = this.S;
    if (v.kind === 'lantern') {
      v.on = !v.on; this.emit('light', { on: v.on });
      if (v.on) this.flash(v.x, v.y - 0.35);
    } else if (v.kind === 'sword') {
      if (v.cd > 0) return;
      v.cd = P.SLASH_CD; v.slashT = P.SLASH_T; if (v.stuck) v.face = -v.stuck;
      this.slash(v);
    } else if (v.kind === 'bow') {
      if (v.cd > 0) return;
      v.cd = P.ARROW_CD;
      const a = inp.ay < -0.3 ? P.AIM : inp.ay > 0.3 ? -P.AIM : 0;
      S.arrows.push({ x: v.x + v.face * 0.3, y: v.y - 0.55, dx: v.face * Math.cos(a), dy: -Math.sin(a), d: 0 });
      this.emit('shoot');
    }
  }
  // 등불을 켜는 순간의 섬광: 가까이 있는 어둠의 아이들이 꺼지고, 수정에 불이 붙는다
  flash(x, y) {
    const S = this.S, L = this.L;
    S.flashes.push({ x, y, r: P.FLASH_R, t: P.FLASH_T });
    this.emit('flash', { x, y });
    L.creatures.forEach((c, i) => { const d = S.creatures[i]; if (c.kind !== 'moth' && d.alive && !d.gone && Math.hypot(d.x - x, d.y - 0.3 - y) < P.FLASH_R && this.los(x, y, d.x, d.y - 0.3)) this.strike(i, 'flash'); });
    L.crystals.forEach((c, i) => { if (!S.crystals[i].lit && Math.hypot(c.x - x, c.y - y) < P.FLASH_R && this.los(x, y, c.x, c.y)) this.lightCrystal(i); });
  }
  slash(v) {
    const S = this.S, L = this.L;
    const x0 = Math.min(v.x, v.x + v.face * P.SLASH_REACH), x1 = Math.max(v.x, v.x + v.face * P.SLASH_REACH), y0 = v.y - 1.7, y1 = v.y + 0.15;
    this.emit('slash', { x: v.x + v.face * 0.8, y: v.y - 0.7, face: v.face });
    S.flashes.push({ x: v.x + v.face * 0.8, y: v.y - 0.7, r: P.SLASH_R, t: 0.2 });
    L.creatures.forEach((c, i) => {
      const d = S.creatures[i]; if (!d.alive || d.gone) return;
      if (c.kind === 'moth') { if (d.x > x0 - 0.3 && d.x < x1 + 0.3 && d.y > y0 - 0.3 && d.y < y1) this.putOut(i, 'slash'); return; }
      const b = BODY[c.kind];
      if (d.x + b.w / 2 > x0 && d.x - b.w / 2 < x1 && d.y > y0 && d.y - b.h < y1) this.strike(i, 'slash');
    });
    L.ropes.forEach((r, i) => { if (!S.ropes[i].cut && r.x > x0 && r.x < x1 && r.y1 > y0 && r.y0 < y1) this.cutRope(i); });
    L.crystals.forEach((c, i) => { if (!S.crystals[i].lit && c.x > x0 - 0.2 && c.x < x1 + 0.2 && c.y > y0 && c.y < y1) this.lightCrystal(i); });
  }
  strike(i, cause) {
    const c = this.L.creatures[i], d = this.S.creatures[i];
    if (c.kind === 'guardian') { d.hp--; d.t = 0.6; this.emit('guardHit', { x: d.x, y: d.y, hp: d.hp }); if (d.hp > 0) return; }
    this.putOut(i, cause);
  }
  putOut(i, cause) {
    const c = this.L.creatures[i], d = this.S.creatures[i];
    if (!d.alive) return;
    d.alive = false;
    this.emit('putOut', { i, kind: c.kind, x: d.x, y: d.y, cause });
    if (c.brood) for (const j of c.brood) { const b = this.S.creatures[j]; if (b.alive && !b.gone) b.state = 'flee'; }   // 지키던 것이 사라지면 새끼들은 달아난다
  }
  lightCrystal(i) {
    const S = this.S, c = this.L.crystals[i];
    S.crystals[i].lit = true; this.emit('crystal', { i, x: c.x, y: c.y });
    this.openGates(c.id);
  }
  openGates(id) { this.L.gates.forEach((g, j) => { if (g.id === id && !this.S.gates[j].open) { this.S.gates[j].open = true; this.emit('gate', { i: j, x: g.x, y: g.y }); } }); }
  cutRope(i) { const S = this.S, r = this.L.ropes[i]; S.ropes[i].cut = true; S.slabs[r.slab].free = true; this.emit('ropeCut', { i, x: r.x, y: (r.y0 + r.y1) / 2 }); }

  damage(n, fromX) {
    const S = this.S;
    if (S.inv > 0 || S.fade > 0 || S.done) return;
    S.pips -= n; S.inv = P.INV;
    this.emit('hurt', { pips: S.pips });
    const v = this.host;
    if (v && fromX !== undefined) { v.vx = (v.x >= fromX ? 1 : -1) * 5; v.vy = -5; v.ground = false; v.stuck = 0; }
    if (S.pips <= 0) { S.fade = P.FADE_T; this.fades++; this.emit('fade'); }
  }

  stepVessel(v, i, inp, dt) {
    const S = this.S, host = i === S.host && !S.done, sz = VESSEL[v.kind], hw = sz.w / 2;
    const ax = host ? (inp.ax > 0.3 ? 1 : inp.ax < -0.3 ? -1 : 0) : 0;
    if (v.cd > 0) v.cd -= dt;
    if (v.slashT > 0) v.slashT -= dt;
    if (v.stickCd > 0) v.stickCd -= dt;
    const jumpEdge = host && inp.jump && !this.held.jump;

    if (v.stuck) {       // 나무에 박힌 검
      v.vx = v.vy = 0; v.ground = false;
      if (this.T(Math.floor(v.x + v.stuck * (hw + 0.1)), Math.floor(v.y - sz.h / 2)) !== 2) v.stuck = 0;
      else if (host) {
        v.face = -v.stuck;
        if (inp.ay > 0.3) {
          v.y += P.SLIDE * dt;
          if (this.rowSolid(Math.floor(v.y), v.x - hw + EPS, v.x + hw - EPS)) { v.y = Math.floor(v.y); v.stuck = 0; v.ground = true; }
        }
        if (jumpEdge && v.stuck) {
          v.vy = -P.JUMP; v.vx = ax === v.stuck ? 0 : -v.stuck * P.RUN; v.stuck = 0; v.stickCd = P.STICK_CD; v.jumping = true;
          this.emit('jump');
        }
      }
      if (v.stuck) return;
    }

    // 가로
    const target = ax * P.RUN, acc = v.ground ? (ax ? P.ACC : P.DEC) : (ax ? P.AIR : 3);
    if (v.vx < target) v.vx = Math.min(target, v.vx + acc * dt); else if (v.vx > target) v.vx = Math.max(target, v.vx - acc * dt);
    if (ax && v.slashT <= 0) v.face = ax;
    const x0 = v.x, dir = v.vx > 0 ? 1 : v.vx < 0 ? -1 : 0;
    const hit = dir ? this.moveX(v, hw, sz.h, v.vx * dt) : 0;
    if (hit) {
      v.vx = 0;
      if (hit === 2 && v.kind === 'sword' && host && !v.ground && v.stickCd <= 0 && ax === dir) { v.stuck = dir; v.vy = 0; v.jumping = false; this.emit('stick', { x: v.x, y: v.y }); return; }
    }

    // 세로
    v.coyote = v.ground ? P.COYOTE : Math.max(0, v.coyote - dt);
    if (jumpEdge) v.buf = P.BUF; else v.buf = Math.max(0, v.buf - dt);
    if (host && v.buf > 0 && v.coyote > 0) {
      v.vy = -P.JUMP; v.buf = 0; v.coyote = 0; v.ground = false; v.jumping = true; v.stickCd = P.STICK_CD;
      this.emit('jump');
    }
    if (v.jumping && host && !inp.jump && v.vy < 0) { v.vy *= P.JUMP_CUT; v.jumping = false; }
    if (v.vy >= 0) v.jumping = false;
    v.vy = Math.min(P.TERMINAL, v.vy + P.G * dt);
    const was = v.ground, fall = v.vy;
    v.ground = this.moveY(v, hw, sz.h, dt);
    if (v.ground && !was && fall > 4) this.emit('land', { v: fall, host });
    if (v.ground && this.T(Math.floor(v.x), Math.floor(v.y + 0.01))) { v.safeX = v.x; v.safeY = v.y; }
    if (v.y > this.h + 2) {      // 낭떠러지: 마지막으로 디뎠던 땅으로
      if (host) this.damage(1);
      v.x = v.safeX; v.y = v.safeY; v.vx = v.vy = 0; v.stuck = 0;
      this.emit('pit', { host });
    }
    if (host && v.ground) { v.stepAcc += Math.abs(v.x - x0); if (v.stepAcc > 0.8) { v.stepAcc = 0; this.emit('step', { kind: v.kind }); } }

    // 제단
    if (host) this.L.shrines.forEach((s, k) => {
      if (Math.abs(v.x - s.x) < 1.1 && Math.abs(v.y - s.y) < 2) {
        if (S.pips < P.PIPS) { S.pips = P.PIPS; this.emit('heal'); }
        if (!S.shrines[k].lit) { S.shrines[k].lit = true; S.cp = k; this.emit('shrine', { i: k, x: s.x, y: s.y }); this.snap = JSON.stringify(S); }
      }
    });
  }

  // 빛 알갱이: 떠다니며 다른 몸을 찾는다. 떠나온 몸에서 실 한 가닥만큼만 멀어질 수 있다.
  stepWisp(inp, dt) {
    const S = this.S, w = S.wisp;
    const tx = (inp.ax > 0.3 ? 1 : inp.ax < -0.3 ? -1 : 0) * P.WISP_V;
    const ty = Math.max(-1, Math.min(1, (inp.ay > 0.3 ? 1 : inp.ay < -0.3 ? -1 : 0) + (inp.jump ? -1 : 0))) * P.WISP_V;
    const ap = (v, t) => (v < t ? Math.min(t, v + P.WISP_ACC * dt) : Math.max(t, v - P.WISP_ACC * dt));
    w.vx = ap(w.vx, tx); w.vy = ap(w.vy, ty);
    const blocked = (x, y) => {
      for (let cy = Math.floor(y - 0.15); cy <= Math.floor(y + 0.15); cy++) for (let cx = Math.floor(x - 0.15); cx <= Math.floor(x + 0.15); cx++) { const t = this.T(cx, cy); if (t === 1 || t === 2) return true; }
      for (const r of this.R) if (!r.ow && !r.guard && x + 0.15 > r.x0 && x - 0.15 < r.x1 && y + 0.15 > r.y0 && y - 0.15 < r.y1) return true;
      return false;
    };
    const nx = w.x + w.vx * dt; if (blocked(nx, w.y)) w.vx = 0; else w.x = nx;
    const ny = w.y + w.vy * dt; if (blocked(w.x, ny)) w.vy = 0; else w.y = ny;
    const a = this.anchor(), d = Math.hypot(w.x - a.x, w.y - a.y);
    if (d > P.TETHER) { w.x = a.x + (w.x - a.x) / d * P.TETHER; w.y = a.y + (w.y - a.y) / d * P.TETHER; w.vx *= 0.5; w.vy *= 0.5; }
  }
  anchor() { const S = this.S, v = S.anchorV >= 0 ? S.vessels[S.anchorV] : null; return v ? { x: v.x, y: v.y - VESSEL[v.kind].h / 2 } : this.L.start; }

  // ───── 빛의 화살 ─────
  stepArrows(dt) {
    const S = this.S, L = this.L;
    for (let k = S.arrows.length - 1; k >= 0; k--) {
      const a = S.arrows[k], px = a.x, py = a.y, st = P.ARROW_V * dt;
      a.x += a.dx * st; a.y += a.dy * st; a.d += st;
      let gone = a.d > P.ARROW_RANGE || a.y < -3 || a.y > this.h + 2;
      for (let i = 0; i < L.creatures.length && !gone; i++) {
        const c = L.creatures[i], d = S.creatures[i]; if (!d.alive || d.gone) continue;
        if (c.kind === 'moth') { if (Math.hypot(a.x - d.x, a.y - d.y) < 0.55) this.putOut(i, 'arrow'); continue; }   // 나방은 스치기만 해도
        const b = BODY[c.kind];
        if (a.x > d.x - b.w / 2 && a.x < d.x + b.w / 2 && a.y > d.y - b.h && a.y < d.y) { this.strike(i, 'arrow'); gone = true; }
      }
      for (let i = 0; i < L.crystals.length && !gone; i++) if (!S.crystals[i].lit && Math.hypot(a.x - L.crystals[i].x, a.y - L.crystals[i].y) < 0.45) { this.lightCrystal(i); gone = true; }
      for (let i = 0; i < L.ropes.length && !gone; i++) { const r = L.ropes[i]; if (!S.ropes[i].cut && Math.abs(a.x - r.x) < 0.13 && a.y > r.y0 && a.y < r.y1) this.cutRope(i); }
      if (!gone) for (const r of this.R) if (!r.ow && !r.guard && a.x > r.x0 && a.x < r.x1 && a.y > r.y0 && a.y < r.y1) { gone = true; this.emit('arrowBreak', { x: a.x, y: a.y }); break; }
      if (!gone) {
        const tx = Math.floor(a.x), ty = Math.floor(a.y), t = this.T(tx, ty);
        if (t === 2) {         // 나무에 꽂힌다: 옆에서 꽂히면 발판, 어디든 작은 등불
          const side = Math.floor(px) !== tx, sg = a.dx > 0 ? 1 : -1, face = sg > 0 ? tx : tx + 1;
          S.pegs.push(side ? { plat: true, x0: sg > 0 ? face - P.PEG_W : face, x1: sg > 0 ? face : face + P.PEG_W, y: py, lx: face - sg * 0.4, ly: py - 0.1, sg }
            : { plat: false, x0: px, x1: px, y: py, lx: px, ly: py, sg: 0 });
          this.emit('peg', { x: px, y: py });
          if (S.pegs.length > P.PEGS) { S.pegs.shift(); this.emit('pegFade'); }
          gone = true;
        } else if (t === 1) { gone = true; this.emit('arrowBreak', { x: px, y: py }); }
      }
      if (gone) S.arrows.splice(k, 1);
    }
  }

  // ───── 낮의 돌 · 밤의 돌 ─────
  stepBlocks() {
    const S = this.S, L = this.L;
    const over = (b) => S.vessels.some((v) => { const sz = VESSEL[v.kind]; return v.x + sz.w / 2 > b.x + EPS && v.x - sz.w / 2 < b.x + 1 - EPS && v.y > b.y + EPS && v.y - sz.h < b.y + 1 - EPS; });
    // 돌의 한가운데까지의 거리로 재되, 윗면이 보이기만 해도 빛이 닿은 것으로 친다 (받침 모서리에 가려지지 않게)
    const lit = (b) => { const cx = b.x + 0.5, cy = b.y + 0.5; for (const l of this.lights) if (Math.hypot(cx - l.x, cy - l.y) < l.r && (this.los(l.x, l.y, cx, b.y - 0.1) || this.los(l.x, l.y, cx, cy))) return true; return false; };
    L.day.forEach((b, i) => { const on = lit(b); if (on && !S.day[i]) { if (!over(b)) S.day[i] = true; } else if (!on && S.day[i]) S.day[i] = false; });
    L.night.forEach((b, i) => { const on = lit(b); if (!on && !S.night[i]) { if (!over(b)) S.night[i] = true; } else if (on && S.night[i]) S.night[i] = false; });
  }

  // 수정(빛을 받으면 켜진다) · 반딧불이 이끼(어둠 속에 가만히 있으면 모인다)
  stepSwitches(dt) {
    const S = this.S, L = this.L, hv = this.host;
    L.crystals.forEach((c, i) => {
      const d = S.crystals[i]; if (d.lit) return;
      const near = S.vessels.some((v) => v.kind === 'lantern' && v.on && Math.hypot(v.x - c.x, v.y - 0.35 - c.y) < P.CRYSTAL_NEAR && this.los(v.x, v.y - 0.35, c.x, c.y));
      d.near = near ? d.near + dt : 0;
      if (d.near >= P.CRYSTAL_T) this.lightCrystal(i);
    });
    L.lichens.forEach((c, i) => {
      const d = S.lichens[i]; if (d.on) return;
      const ok = hv && hv.ground && Math.abs(hv.vx) < 0.6 && Math.hypot(hv.x - c.x, hv.y - c.y) < P.LICHEN_R && !this.lightAt(c.x, c.y);
      d.t = ok ? d.t + dt : Math.max(0, d.t - dt * 2);
      if (d.t >= P.LICHEN_T) { d.on = true; this.emit('lichen', { i, x: c.x, y: c.y }); this.openGates(c.id); }
    });
  }

  // 밧줄이 끊기면 매달려 있던 것이 떨어진다
  stepSlabs(dt) {
    const S = this.S, L = this.L;
    L.slabs.forEach((s, i) => {
      const d = S.slabs[i]; if (!d.free) return;
      d.vy = Math.min(P.TERMINAL, d.vy + P.G * dt); d.y += d.vy * dt;
      const ty = Math.floor(d.y + s.h);
      if (this.rowSolid(ty, s.x + EPS, s.x + s.w - EPS)) { d.y = ty - s.h; d.vy = 0; d.free = false; d.landed = true; this.emit('slabLand', { i, x: s.x + s.w / 2, y: d.y }); }
      else if (d.y > this.h + 4) d.free = false;
    });
  }

  // ───── 어둠의 아이들 ─────
  stepCreatures(dt) {
    const S = this.S, L = this.L, hv = this.host;
    const canWalk = (x, y) => this.T(Math.floor(x), Math.floor(y + 0.01)) && !this.T(Math.floor(x), Math.floor(y - 0.3));
    L.creatures.forEach((c, i) => {
      const d = S.creatures[i]; if (!d.alive || d.gone) return;
      if (d.t > 0) d.t -= dt;
      if (c.kind === 'moth') { this.stepMoth(c, d, i, dt); return; }
      if (c.kind === 'guardian') { if (hv) d.face = hv.x < d.x ? -1 : 1; return; }
      const b = BODY[c.kind], little = c.kind === 'little', leash = c.leash ?? (little ? 2.2 : P.DUSKY_LEASH);
      const walk = (dir, v) => { const st = v * dt; d.face = dir; if (canWalk(d.x + dir * (st + b.w / 2), d.y) && Math.abs(d.x + dir * st - c.x) <= leash) { d.x += dir * st; return true; } return false; };
      if (d.state === 'flee') { const dir = c.burrow > d.x ? 1 : -1; d.x += dir * 3.4 * dt; d.face = dir; if (Math.abs(d.x - c.burrow) < 0.15) { d.gone = true; this.emit('hid', { x: d.x, y: d.y }); } return; }
      const l = this.lightAt(d.x, d.y - b.h / 2);
      if (l) {            // 빛이 닿으면 눈을 가리고 물러난다
        if (d.state !== 'cower') this.emit('cower', { i, x: d.x, y: d.y });
        d.state = 'cower'; d.calm = P.CALM;
        walk(d.x >= l.x ? 1 : -1, little ? 2.4 : P.COWER_V);
        return;
      }
      if (d.calm > 0) { d.calm -= dt; return; }
      if (d.state === 'cower') d.state = 'idle';
      if (c.hostile && hv && d.state !== 'retreat' && Math.abs(hv.x - d.x) < P.DUSKY_SENSE && Math.abs(hv.y - d.y) < 2.5) {
        d.state = 'stalk';
        const sz = VESSEL[hv.kind];
        if (Math.abs(hv.x - d.x) > 0.2) walk(hv.x > d.x ? 1 : -1, P.DUSKY_V);
        if (Math.abs(hv.x - d.x) < (sz.w + b.w) / 2 && hv.y > d.y - b.h && hv.y - sz.h < d.y) { this.emit('touch', { x: d.x, y: d.y }); this.damage(1, d.x); d.state = 'retreat'; d.t = 1.8; }
        return;
      }
      if (d.state === 'retreat') { if (d.t <= 0) d.state = 'idle'; else if (Math.abs(d.x - c.x) > 0.1) walk(c.x > d.x ? 1 : -1, 1.2); return; }
      if (d.state === 'stalk') d.state = 'idle';
      const hx = little && !c.sleep && !c.still ? c.x + Math.sin(S.t * 0.6 + i * 2.1) * Math.min(1.1, leash) : c.x;     // 새끼들은 놀고, 나머지는 제자리로
      if (Math.abs(d.x - hx) > 0.12) { walk(hx > d.x ? 1 : -1, 0.8); if (d.state === 'sleep') d.state = 'idle'; }
      else if (c.sleep) d.state = 'sleep';
    });
  }
  // 나방: 사도가 만든 불빛(등불, 꽂힌 화살)에 달려들어 타 버린다. 빛 알갱이는 뜨겁지 않아서 그냥 따라다닌다.
  stepMoth(c, d, i, dt) {
    let tgt = null, bd = 1e9;
    for (const l of this.lights) {
      const r = l.k === 'lantern' ? P.MOTH_R : l.k === 'peg' ? P.MOTH_PEG_R : l.k === 'wisp' ? (d.led ? 7.5 : P.MOTH_WISP_R) : 0;   // 한번 따라나서면 멀리까지 따라온다
      if (!r) continue;
      const dd = Math.hypot(l.x - d.x, l.y - d.y);
      if (dd < r && dd < bd && this.los(d.x, d.y, l.x, l.y)) { tgt = l; bd = dd; }
    }
    if (tgt && tgt.k !== 'wisp') { if (d.alert === 0) this.emit('mothStir', { x: d.x, y: d.y }); d.alert += dt; if (d.alert < P.MOTH_ALERT) tgt = null; }
    else if (!tgt) d.alert = Math.max(0, d.alert - dt * 0.5);
    const fly = (tx, ty, v) => { const dd = Math.hypot(tx - d.x, ty - d.y); if (dd < 1e-3) return dd; const s = Math.min(dd, v * dt); d.x += (tx - d.x) / dd * s; d.y += (ty - d.y) / dd * s; return dd; };
    d.led = !!tgt && tgt.k === 'wisp';
    if (tgt) {
      d.state = 'fly';
      if (tgt.k === 'wisp') fly(tgt.x, tgt.y - 0.7, 4.6);
      else if (fly(tgt.x, tgt.y, P.MOTH_V) < 0.45) this.putOut(i, tgt.k);
    } else if (d.state === 'fly') { if (fly(c.x, c.y, 2) < 0.08) { d.state = 'idle'; d.x = c.x; d.y = c.y; } }
  }
}
