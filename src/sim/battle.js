// 전투 시뮬레이션 (DOM 비의존 — Node 에서도 돌아간다)
import { W, H, FIELD, CELL, cellCenter } from '../config.js';
import { UNITS, SKILLS, lvlMult } from '../data/units.js';

const NC = Math.ceil(W / CELL), NR = Math.ceil(H / CELL);
const PI = Math.PI, TAU = PI * 2;
const HC = 48; // 공간 해시 셀
export const PACE = 2.2; // 체력 배율 — 전투 호흡 조절

export const DEFAULT_MODS = {
  startMorale: 0, moraleRate: 1, flank: 1.5, chargeMult: 1, chargeDist: 1, grailHeal: 1, grailR: 1, rainDmg: 1, rainBurn: 0,
  hornDur: 0, hornCost: 0, hpInf: 1, rangeMul: 1, rangedAS: 1, priestHeal: 1, heroCd: 1, heroHp: 1, gold: 1, lastStand: 0,
  vanguard: 0, aoeR: 1, startShield: 0,
  // 병종 전용 배율 unit[type] = { hp, atk, as, range, cleave, block }
  unit: {}, hpAll: 1, heroAtk: 1, openGuard: 0, teleResist: 0, holdGuard: 0, debuff: 1, refund: 0, goldFlat: 0,
};
// 요괴 쪽 보정 (강적 특성, 험로 단계)
export const DEFAULT_FOE = { hp: 1, atk: 1, as: 1, spd: 1, regen: 0 };

function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const hyp = Math.hypot;
function angDiff(a, b) { let d = (b - a) % TAU; if (d > PI) d -= TAU; if (d < -PI) d += TAU; return d; }

export function formation(n) {
  const per = n <= 3 ? n : n <= 8 ? Math.ceil(n / 2) : Math.ceil(n / 3);
  const rows = Math.ceil(n / per); const out = [];
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / per), col = i % per, cnt = Math.min(per, n - row * per);
    out.push([(col - (cnt - 1) / 2) * 27, (row - (rows - 1) / 2) * 26]);
  }
  return out;
}

class Heap {
  constructor() { this.a = []; }
  push(n, f) { const a = this.a; a.push([f, n]); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
  pop() { const a = this.a; const top = a[0]; const last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { let l = i * 2 + 1, r = l + 1, m = i; if (l < a.length && a[l][0] < a[m][0]) m = l; if (r < a.length && a[r][0] < a[m][0]) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return top[1]; }
  get size() { return this.a.length; }
}

export class Battle {
  constructor(o) {
    this.mods = Object.assign({}, DEFAULT_MODS, o.mods || {}); if (!o.mods || !o.mods.unit) this.mods.unit = {};
    this.foe = Object.assign({}, DEFAULT_FOE, o.foe || {});
    this.rand = mulberry(o.seed || 1);
    this.time = 0; this.over = false; this.winner = -1; this.reason = '';
    this.units = []; this.squads = []; this.proj = []; this.zones = []; this.corpses = []; this.events = [];
    this.timeLimit = o.timeLimit || 120;
    this.power = o.power || 1;
    this.moraleMax = 10; this.morale = Math.max(0, Math.min(10, 3 + this.mods.startMorale));
    this.heroSkill = o.heroSkill || null; this.heroCd = 5;
    this.lost = 0; this.kills = 0; this.pending = 0; this.uid = 1; this.auraT = 0;
    this.map = o.map || {};
    this.buildNav(this.map);
    for (const s of o.player || []) this.addSquad(0, s);
    for (const s of o.enemy || []) this.addSquad(1, s);
    this.startCount = [this.count(0), this.count(1)];
    if (this.mods.startShield) for (const u of this.units) if (u.team === 0) { u.barrier = this.mods.startShield; u.barrierT = 30; }
    this.centroids();
  }
  ev(type, o) { const e = o || {}; e.type = type; this.events.push(e); }
  count(team) { let n = 0; for (const u of this.units) if (!u.dead && u.team === team) n++; return n; }
  hpSum(team) { let n = 0; for (const u of this.units) if (!u.dead && u.team === team) n += u.hp; return n; }

  // ───────── 생성 ─────────
  addSquad(team, s) {
    const def = UNITS[s.type];
    const pos = s.x !== undefined ? { x: s.x, y: s.y } : cellCenter(team, s.col, s.row);
    const n = s.n || def.n;
    const sq = { id: this.squads.length, team, type: s.type, def, lvl: s.lvl || 1, units: [], alive: 0, total: n, order: { kind: 'auto' }, cx: pos.x, cy: pos.y, hero: !!def.hero, ref: s };
    if (s.hold) sq.order = { kind: 'hold', x: pos.x, y: pos.y, until: s.holdFor || Infinity };
    if (s.flank) { const L = s.flank === 'L'; sq.order = { kind: 'move', path: [[L ? 76 : 644, 640], [L ? 120 : 600, 950]], x: L ? 76 : 644, y: 640, then: 'auto', t0: 0, wait: s.wait || 0 }; }
    this.squads.push(sq);
    const offs = formation(n);
    for (let i = 0; i < n; i++) this.spawn(s.type, team, pos.x + offs[i][0], pos.y + offs[i][1], sq, sq.lvl, offs[i]);
    return sq;
  }
  spawn(type, team, x, y, sq, lvl, off) {
    const def = UNITS[type], m = lvlMult(lvl), md = this.mods;
    const um = team === 0 ? md.unit[type] : null;
    let hp = def.hp * m * PACE * (team === 0 ? md.hpAll * (um && um.hp || 1) : this.foe.hp);
    if (team === 0) { if (def.hero) hp *= md.heroHp; else if (!def.range && !def.mounted && !def.heal) hp *= md.hpInf; }
    const u = {
      id: this.uid++, team, type, def, squad: sq, lvl, x, y, px: x, py: y, vx: 0, vy: 0, r: def.r, hp, maxHp: hp,
      atk: (def.atk || 0) * m * (team === 0 ? (um && um.atk || 1) * (def.hero ? md.heroAtk : 1) : this.foe.atk), healAmt: (def.heal || 0) * m * (team === 0 && def.hero ? md.heroAtk : 1), facing: team === 0 ? -PI / 2 : PI / 2,
      target: null, cd: 0.2 + this.rand() * 0.5, retarget: this.rand() * 0.3, swing: 0, swingTarget: null, atkT: -9, cast: 0,
      moving: false, walk: this.rand() * 10, still: 0, stuck: 0, run: 0, stun: 0, root: 0, haste: 0, weaken: 0, rage: 0, burn: 0, burnDmg: 0, burnAcc: 0,
      barrier: 0, barrierT: 0, auraDmg: 0, auraHaste: 0, slot: { dx: off ? off[0] : 0, dy: off ? off[1] : 0 }, dead: false, hidden: 0, flash: 0, eng: 0,
      path: null, pi: 0, pathT: 0, pgx: 0, pgy: 0, leapCd: def.leap ? 1.1 + this.rand() * 0.7 : 0, fuse: 0, jump: null, jumpH: 0, stab: false, revived: false, summoned: false, chargeFx: 0,
    };
    if (def.abil) u.abils = def.abil.map(id => ({ id, t: ({ slam: 5, warcry: 1, roots: 4, saplings: 6.5, brand: 4, summon: 7 })[id], cd: ({ slam: 8, warcry: 1, roots: 7.5, saplings: 13, brand: 7, summon: 12 })[id] }));
    if (def.raise) u.raiseT = 3.5;
    if (def.lob) u.cd = 2.2 + this.rand() * 2.2;
    sq.units.push(u); sq.alive++;
    this.units.push(u);
    return u;
  }

  // ───────── 길찾기 격자 ─────────
  buildNav(map) {
    this.blocked = new Uint8Array(NC * NR); this.rects = []; this.circs = []; this.slow = [];
    for (const o of map.obstacles || []) {
      if (o.kind === 'wall' || o.kind === 'barricade') this.rects.push({ x: o.x, y: o.y, w: o.w, h: o.h });
      else this.circs.push({ x: o.x, y: o.y, r: o.r });
    }
    if (map.river) {
      const rv = map.river; const open = [...(rv.bridges || []), ...(rv.fords || [])].sort((a, b) => a.x - b.x);
      let x = 0; for (const b of open) { if (b.x > x) this.rects.push({ x, y: rv.y + 6, w: b.x - x, h: rv.h - 12, water: true }); x = b.x + b.w; }
      if (x < W) this.rects.push({ x, y: rv.y + 6, w: W - x, h: rv.h - 12, water: true });
      for (const f of rv.fords || []) this.slow.push({ x: f.x, y: rv.y, w: f.w, h: rv.h });
    }
    const inf = 11;
    for (let r = 0; r < NR; r++) for (let c = 0; c < NC; c++) {
      const x = (c + 0.5) * CELL, y = (r + 0.5) * CELL; let b = 0;
      if (x < FIELD.x0 || x > FIELD.x1 || y < FIELD.y0 || y > FIELD.y1) b = 1;
      else {
        for (const q of this.rects) { const dx = Math.max(q.x - x, 0, x - q.x - q.w), dy = Math.max(q.y - y, 0, y - q.y - q.h); if (dx * dx + dy * dy < inf * inf) { b = 1; break; } }
        if (!b) for (const q of this.circs) { if (hyp(q.x - x, q.y - y) < q.r + inf) { b = 1; break; } }
      }
      this.blocked[r * NC + c] = b;
    }
    this.hasObst = this.rects.length + this.circs.length > 0;
  }
  isBlocked(x, y) { const c = (x / CELL) | 0, r = (y / CELL) | 0; if (c < 0 || r < 0 || c >= NC || r >= NR) return true; return this.blocked[r * NC + c] === 1; }
  los(x0, y0, x1, y1) {
    const d = hyp(x1 - x0, y1 - y0); const n = Math.ceil(d / 9);
    for (let i = 1; i < n; i++) { const t = i / n; if (this.isBlocked(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false; }
    return true;
  }
  freeCell(c, r) {
    if (c >= 0 && r >= 0 && c < NC && r < NR && !this.blocked[r * NC + c]) return r * NC + c;
    for (let rad = 1; rad < 8; rad++) for (let dr = -rad; dr <= rad; dr++) for (let dc = -rad; dc <= rad; dc++) {
      if (Math.max(Math.abs(dr), Math.abs(dc)) !== rad) continue; const cc = c + dc, rr = r + dr;
      if (cc >= 0 && rr >= 0 && cc < NC && rr < NR && !this.blocked[rr * NC + cc]) return rr * NC + cc;
    }
    return -1;
  }
  findPath(sx, sy, gx, gy) {
    const s = this.freeCell((sx / CELL) | 0, (sy / CELL) | 0), g = this.freeCell((gx / CELL) | 0, (gy / CELL) | 0);
    if (s < 0 || g < 0) return null;
    if (s === g) return [[gx, gy]];
    const N = NC * NR; const gs = new Float32Array(N).fill(1e9); const from = new Int32Array(N).fill(-1); const closed = new Uint8Array(N);
    const gc = g % NC, gr = (g / NC) | 0; const heap = new Heap(); gs[s] = 0; heap.push(s, 0);
    let found = false, guard = 0;
    while (heap.size && guard++ < 4000) {
      const cur = heap.pop(); if (cur === g) { found = true; break; } if (closed[cur]) continue; closed[cur] = 1;
      const cc = cur % NC, cr = (cur / NC) | 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue; const nc = cc + dc, nr = cr + dr; if (nc < 0 || nr < 0 || nc >= NC || nr >= NR) continue;
        const ni = nr * NC + nc; if (this.blocked[ni] || closed[ni]) continue;
        if (dr && dc && (this.blocked[cr * NC + nc] || this.blocked[nr * NC + cc])) continue;
        const ng = gs[cur] + (dr && dc ? 1.414 : 1);
        if (ng < gs[ni]) { gs[ni] = ng; from[ni] = cur; heap.push(ni, ng + hyp(nc - gc, nr - gr)); }
      }
    }
    if (!found) return null;
    const path = []; let c = g; while (c !== s && c >= 0) { path.push([(c % NC + 0.5) * CELL, (((c / NC) | 0) + 0.5) * CELL]); c = from[c]; }
    path.reverse();
    if (!this.isBlocked(gx, gy)) path.push([gx, gy]);
    return path;
  }

  // ───────── 공간 해시 ─────────
  hash() {
    const m = this.hmap || (this.hmap = new Map()); m.clear();
    for (const u of this.units) { if (u.dead || u.hidden > 0) continue; const k = ((u.x / HC) | 0) + ((u.y / HC) | 0) * 64; let a = m.get(k); if (!a) { a = []; m.set(k, a); } a.push(u); }
  }
  near(x, y, rad, fn) {
    const c0 = ((x - rad) / HC) | 0, c1 = ((x + rad) / HC) | 0, r0 = ((y - rad) / HC) | 0, r1 = ((y + rad) / HC) | 0;
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) { const a = this.hmap.get(c + r * 64); if (a) for (let i = 0; i < a.length; i++) fn(a[i]); }
  }
  centroids() {
    for (const sq of this.squads) {
      let x = 0, y = 0, n = 0; for (const u of sq.units) if (!u.dead) { x += u.x; y += u.y; n++; }
      sq.alive = n; if (n) { sq.cx = x / n; sq.cy = y / n; }
    }
  }
  clusterScore(e, rad) { let n = 0; this.near(e.x, e.y, rad, o => { if (o.team === e.team && !o.dead && hyp(o.x - e.x, o.y - e.y) < rad) n++; }); return n; }

  // ───────── 메인 루프 ─────────
  step(dt) {
    if (this.over) return;
    this.time += dt;
    this.morale = Math.min(this.moraleMax, this.morale + dt * 0.33 * this.mods.moraleRate);
    if (this.heroCd > 0) this.heroCd -= dt;
    this.hash(); this.centroids();
    for (const u of this.units) u.eng = 0;
    for (const u of this.units) if (!u.dead && u.target && !u.target.dead && !u.def.range && !u.def.heal) u.target.eng++;
    this.auraT -= dt; if (this.auraT <= 0) { this.auraT = 0.3; this.auras(); }
    this.updateOrders();
    for (let i = 0; i < this.units.length; i++) { const u = this.units[i]; if (!u.dead) { u.px = u.x; u.py = u.y; this.think(u, dt); } }
    this.collide(dt);
    this.updateProj(dt); this.updateZones(dt); this.updateCorpses(dt);
    if (this.units.length > 160) this.units = this.units.filter(u => !u.dead || this.time - u.deadT < 2);
    const a0 = this.count(0), a1 = this.count(1) + this.pending;
    if (a1 === 0) this.finish(0, 'clear'); else if (a0 === 0) this.finish(1, 'wipe'); else if (this.time >= this.timeLimit) this.finish(1, 'time');
  }
  finish(w, reason) { this.over = true; this.winner = w; this.reason = reason; this.ev('end', { winner: w, reason }); }
  auras() {
    for (const u of this.units) { u.auraDmg = 0; u.auraHaste = 0; }
    for (const s of this.units) { if (s.dead || !s.def.aura) continue; const a = s.def.aura; this.near(s.x, s.y, a.r, o => { if (o.team === s.team && !o.dead && hyp(o.x - s.x, o.y - s.y) <= a.r) { if (a.dmg) o.auraDmg = a.dmg; if (a.haste && o !== s) o.auraHaste = a.haste; } }); }
  }
  atkSpeed(u) { let s = 1; if (u.haste > 0) s += 0.3; if (u.auraHaste) s += u.auraHaste; if (u.def.frenzy && u.hp < u.maxHp * 0.5) s += 0.5; if (u.team === 0) { if (u.def.range > 0) s *= this.mods.rangedAS; const um = this.mods.unit[u.type]; if (um && um.as) s *= um.as; } else s *= this.foe.as; return s; }
  updateOrders() {
    for (const sq of this.squads) {
      const o = sq.order; if (!sq.alive) continue;
      if (o.kind === 'focus' && (!o.target || o.target.alive <= 0)) sq.order = { kind: 'auto' };
      else if (o.kind === 'hold' && o.until !== undefined && this.time > o.until) sq.order = { kind: 'auto' };
      else if (o.kind === 'move') {
        if (o.wait && this.time < o.wait) continue;
        let arrived = 0; for (const u of sq.units) if (!u.dead && hyp(o.x + u.slot.dx - u.x, o.y + u.slot.dy - u.y) < 16) arrived++;
        if (o.t0 === undefined) o.t0 = this.time;
        const late = this.time - o.t0 > 9;
        if (arrived >= sq.alive * 0.7 || late) {
          if (o.path && o.path.length > 1 && !late) { o.path.shift(); o.x = o.path[0][0]; o.y = o.path[0][1]; o.t0 = this.time; }
          else if (o.then === 'auto') sq.order = { kind: 'auto' };
          else sq.order = late ? { kind: 'hold', x: sq.cx, y: sq.cy } : { kind: 'hold', x: o.x, y: o.y };
        }
      }
    }
  }

  // ───────── 플레이어 명령 ─────────
  orderMove(sq, x, y) {
    x = Math.max(FIELD.x0 + 30, Math.min(FIELD.x1 - 30, x)); y = Math.max(FIELD.y0 + 24, Math.min(FIELD.y1 - 24, y));
    if (this.isBlocked(x, y)) { const c = this.freeCell((x / CELL) | 0, (y / CELL) | 0); if (c >= 0) { x = (c % NC + 0.5) * CELL; y = (((c / NC) | 0) + 0.5) * CELL; } }
    sq.order = { kind: 'move', x, y, t0: this.time }; for (const u of sq.units) { u.target = null; u.path = null; }
  }
  orderFocus(sq, target) { sq.order = { kind: 'focus', target }; for (const u of sq.units) { u.retarget = 0; u.path = null; } }
  orderAuto(sq) { sq.order = { kind: 'auto' }; for (const u of sq.units) u.retarget = 0; }
  orderHold(sq) { sq.order = { kind: 'hold', x: sq.cx, y: sq.cy }; for (const u of sq.units) if (!u.dead) { u.slot.dx = u.x - sq.cx; u.slot.dy = u.y - sq.cy; u.target = null; } }
  squadNear(x, y, team, maxD) {
    let best = null, bd = maxD;
    for (const u of this.units) { if (u.dead || u.team !== team || u.hidden > 0) continue; const d = hyp(u.x - x, u.y - 14 - y) - u.r * 0.5; if (d < bd) { bd = d; best = u.squad; } }
    return best;
  }
  hero() { for (const u of this.units) if (!u.dead && u.def.hero && u.team === 0) return u; return null; }
  canCast(id) {
    const s = SKILLS[id]; if (!s || this.over) return false;
    if (s.hero) return this.heroCd <= 0 && !!this.hero();
    return this.morale >= this.costOf(id);
  }
  costOf(id) { const s = SKILLS[id]; return Math.max(1, s.cost - (id === 'horn' ? this.mods.hornCost : 0)); }
  cast(id, x, y) {
    if (!this.canCast(id)) return false;
    const s = SKILLS[id], P = this.power, md = this.mods;
    x = Math.max(FIELD.x0, Math.min(FIELD.x1, x || 0)); y = Math.max(FIELD.y0, Math.min(FIELD.y1, y || 0));
    if (s.hero) this.heroCd = s.cd * md.heroCd; else { this.morale -= this.costOf(id); if (md.refund && this.rand() < md.refund) { this.morale = Math.min(this.moraleMax, this.morale + 2); this.ev('text', { x: 360, y: 1040, s: '사기 환급!', c: '#b8862a' }); } }
    const h = this.hero(), hm = h ? lvlMult(h.lvl) : 1;
    if (id === 'rain') this.zones.push({ kind: 'rain', x, y, r: s.r, t: 0, dur: 2.3, acc: 0.25, dmg: 26 * P * md.rainDmg, burn: md.rainBurn });
    else if (id === 'grail') this.zones.push({ kind: 'grail', x, y, r: s.r * md.grailR, t: 0, dur: 3.1, acc: 0.5, heal: 0.36 / 6 * md.grailHeal });
    else if (id === 'horn') { for (const u of this.units) if (!u.dead && u.team === 0) { u.haste = 6 + md.hornDur; if (u.def.charge) u.run = 999; } }
    else if (id === 'strike') {
      if (this.isBlocked(x, y)) { const c = this.freeCell((x / CELL) | 0, (y / CELL) | 0); if (c >= 0) { x = (c % NC + 0.5) * CELL; y = (((c / NC) | 0) + 0.5) * CELL; } }
      h.jump = { sx: h.x, sy: h.y, tx: x, ty: y, t: 0, dur: 0.42, dmg: 250 * hm, r: s.r }; h.swing = 0; h.target = null;
    } else if (id === 'sanctuary') {
      for (const u of this.units) if (!u.dead && u.team === 0 && hyp(u.x - x, u.y - y) <= s.r + u.r) { u.barrier = 150 * hm; u.barrierT = 7; u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.15); u.root = 0; u.weaken = 0; }
    } else if (id === 'meteor') this.zones.push({ kind: 'tele', style: 'meteor', x, y, r: s.r, t: 0, delay: 1.1, hits: 1, dmg: 380 * hm, burn: 4, burnDmg: 20 * hm, kb: 20, src: h });
    this.ev('cast', { id, x, y, r: s.r });
    return true;
  }

  // ───────── 유닛 AI ─────────
  think(u, dt) {
    const def = u.def, sq = u.squad;
    if (u.flash > 0) u.flash -= dt * 5;
    if (u.team === 1 && this.foe.regen && u.hp < u.maxHp) u.hp = Math.min(u.maxHp, u.hp + u.maxHp * this.foe.regen * dt);
    if (u.haste > 0) u.haste -= dt; if (u.weaken > 0) u.weaken -= dt; if (u.root > 0) u.root -= dt; if (u.rage > 0) u.rage -= dt;
    if (u.barrierT > 0) { u.barrierT -= dt; if (u.barrierT <= 0) u.barrier = 0; }
    if (u.burn > 0) { u.burn -= dt; u.burnAcc += dt; if (u.burnAcc >= 0.5) { u.burnAcc -= 0.5; this.damage(u, u.burnDmg * 0.5, null, 'burn'); if (u.dead) return; } }
    if (u.jump) { this.doJump(u, dt); return; }
    if (u.hidden > 0) { u.hidden -= dt; if (u.hidden <= 0) this.finishLeap(u); return; }
    if (u.stun > 0) { u.stun -= dt; u.moving = false; u.run = 0; return; }
    const as = this.atkSpeed(u);
    u.cd -= dt * as;
    if (u.cast > 0) { u.cast -= dt; u.moving = false; return; }
    if (u.swing > 0) { u.swing -= dt * as; u.moving = false; if (u.swing <= 0) this.resolveAttack(u); return; }
    if (u.abils) this.bossAbilities(u, dt);
    if (def.raise) this.necroRaise(u, dt);
    if (def.lob) { this.catapultAI(u); return; }
    if (def.bomber) { this.bomberAI(u, dt); return; }
    if (def.leap) { u.leapCd -= dt; if (u.leapCd <= 0 && this.tryLeap(u)) return; }
    const o = sq.order;
    u.retarget -= dt;
    if (u.retarget <= 0 || (u.target && (u.target.dead || u.target.hidden > 0))) { u.retarget = 0.3 + this.rand() * 0.15; u.target = def.heal ? this.pickHeal(u, o) : this.pickTarget(u, o); }
    if (o.kind === 'move' && !(o.wait && this.time < o.wait)) {
      const gx = o.x + u.slot.dx, gy = o.y + u.slot.dy;
      if (u.stuck > 0.5 && !def.heal && !def.range) { // 길이 막히면 눈앞의 적과 싸운다
        let e = null, bd = 34; this.near(u.x, u.y, 60, n => { if (n.team !== u.team && !n.dead) { const d = hyp(n.x - u.x, n.y - u.y) - n.r - u.r; if (d < bd) { bd = d; e = n; } } });
        if (e) { this.engage(u, e, dt, o); return; }
      }
      if (hyp(gx - u.x, gy - u.y) > 5) this.moveTo(u, gx, gy, dt); else this.idle(u, dt);
      return;
    }
    if (def.heal) { this.healerAI(u, dt, o); return; }
    if (u.target) this.engage(u, u.target, dt, o);
    else if (o.kind === 'hold') this.toSlot(u, o, dt);
    else this.idle(u, dt);
  }
  idle(u, dt) {
    u.moving = false; u.still += dt; if (u.still > 0.4) u.run = 0;
    let e = null, bd = 260; this.near(u.x, u.y, 260, n => { if (n.team !== u.team && !n.dead) { const d = hyp(n.x - u.x, n.y - u.y); if (d < bd) { bd = d; e = n; } } });
    this.face(u, e ? Math.atan2(e.y - u.y, e.x - u.x) : (u.team === 0 ? -PI / 2 : PI / 2), dt, 6);
  }
  toSlot(u, o, dt) { const gx = o.x + u.slot.dx, gy = o.y + u.slot.dy; if (hyp(gx - u.x, gy - u.y) > 6) this.moveTo(u, gx, gy, dt); else this.idle(u, dt); }
  face(u, a, dt, rate) { const d = angDiff(u.facing, a), m = rate * dt; u.facing += Math.abs(d) < m ? d : Math.sign(d) * m; }
  rangeOf(u) { const def = u.def; if (!(def.range > 0)) return 5 + (def.reach || 0); if (u.team !== 0) return def.range; const um = this.mods.unit[u.type]; return def.range * (def.heal ? 1 : this.mods.rangeMul) * (um && um.range || 1); }
  engage(u, t, dt, o) {
    const def = u.def, dx = t.x - u.x, dy = t.y - u.y, d = hyp(dx, dy), gap = d - u.r - t.r, rng = this.rangeOf(u);
    if (def.minRange && d < def.minRange) { u.moving = false; this.face(u, Math.atan2(dy, dx), dt, 6); return; }
    if (gap <= rng) {
      this.face(u, Math.atan2(dy, dx), dt, 9); u.moving = false; u.still += dt;
      if (u.cd <= 0) this.startAttack(u, t); else if (u.still > 0.4) u.run = 0;
    } else if (o.kind === 'hold' && def.range > 0) this.toSlot(u, o, dt);
    else this.moveTo(u, t.x, t.y, dt);
  }
  pickTarget(u, o) {
    const def = u.def, melee = !def.range, rng = this.rangeOf(u);
    let pool = this.units, best = null, bs = 1e9;
    if (o.kind === 'focus' && o.target && o.target.alive > 0) pool = o.target.units;
    const hold = o.kind === 'hold'; const sx = hold ? o.x + u.slot.dx : 0, sy = hold ? o.y + u.slot.dy : 0;
    for (let i = 0; i < pool.length; i++) {
      const e = pool[i]; if (e.dead || e.team === u.team || e.hidden > 0 || e.jump) continue;
      const d = hyp(e.x - u.x, e.y - u.y) - e.r - u.r;
      if (hold) { if (melee) { if (hyp(e.x - sx, e.y - sy) > 105 + e.r) continue; } else if (d > rng) continue; }
      let s = d;
      if (melee) s += e.eng * 9;
      if (def.prefer === 'soft' && e.def.soft) s -= 120;
      if (def.antiCav && (e.def.mounted || e.def.large)) s -= 50;
      if (def.range > 0 && e.def.shield) s += 45;
      if (def.minRange && d + e.r + u.r < def.minRange) s += 500;
      if (melee && e.def.structure) s += 40;
      if (e === u.target) s -= 20;
      if (def.prefer === 'cluster' && d < rng + 60) s -= 16 * Math.min(4, this.clusterScore(e, 52));
      if (s < bs) { bs = s; best = e; }
    }
    return best;
  }
  pickHeal(u, o) {
    let best = null, bs = 0.97; const hold = o.kind === 'hold';
    for (const e of this.units) {
      if (e.dead || e.team !== u.team || e.hidden > 0 || e.def.structure) continue;
      const d = hyp(e.x - u.x, e.y - u.y); if (d > (hold ? u.def.range + e.r : 330)) continue;
      const ratio = e.hp / e.maxHp + (e === u ? 0.12 : 0) + (d > u.def.range ? 0.1 : 0);
      if (ratio < bs) { bs = ratio; best = e; }
    }
    return best;
  }
  healerAI(u, dt, o) {
    const def = u.def, t = u.target;
    if (t) {
      const d = hyp(t.x - u.x, t.y - u.y);
      if (d <= def.range + t.r) {
        this.face(u, Math.atan2(t.y - u.y, t.x - u.x), dt, 8); u.moving = false;
        if (u.cd <= 0) {
          u.cd = def.as; u.atkT = this.time; this.heal(u, t);
          if (def.healN > 1) { let b = null, bs = 0.97; for (const e of this.units) if (!e.dead && e.team === u.team && e !== t && hyp(e.x - u.x, e.y - u.y) <= def.range + e.r && e.hp / e.maxHp < bs) { bs = e.hp / e.maxHp; b = e; } if (b) this.heal(u, b); }
        }
        return;
      }
      if (o.kind !== 'hold') { this.moveTo(u, t.x, t.y, dt); return; }
    }
    if (o.kind === 'hold') { this.toSlot(u, o, dt); return; }
    // 가장 가까운 전투 병력을 뒤따른다
    let a = null, bd = 1e9; for (const e of this.units) { if (e.dead || e.team !== u.team || e.def.support || e.def.structure) continue; const d = hyp(e.x - u.x, e.y - u.y); if (d < bd) { bd = d; a = e; } }
    if (a) { const gy = a.y + (u.team === 0 ? 74 : -74); if (hyp(a.x - u.x, gy - u.y) > 34) { this.moveTo(u, a.x + u.slot.dx, gy, dt); return; } }
    this.idle(u, dt);
  }
  heal(u, t) { const amt = u.healAmt * (u.team === 0 ? this.mods.priestHeal : 1); t.hp = Math.min(t.maxHp, t.hp + amt); this.ev('heal', { x: t.x, y: t.y, fx: u.x, fy: u.y, amt, team: u.team }); }

  moveTo(u, gx, gy, dt) {
    if (u.root > 0 || u.def.structure) { u.moving = false; return; }
    let spd = u.def.spd * (u.team === 1 ? this.foe.spd : 1); if (u.haste > 0) spd *= 1.35;
    if (u.team === 0 && this.mods.vanguard && this.time < 8) spd *= 1.3;
    for (const s of this.slow) if (u.x > s.x && u.x < s.x + s.w && u.y > s.y && u.y < s.y + s.h) { spd *= 0.55; break; }
    let tx = gx, ty = gy;
    if (this.hasObst && !this.los(u.x, u.y, gx, gy)) {
      u.pathT -= dt;
      if (!u.path || u.pathT <= 0 || hyp(u.pgx - gx, u.pgy - gy) > 50) { u.path = this.findPath(u.x, u.y, gx, gy); u.pi = 0; u.pathT = 0.6 + this.rand() * 0.3; u.pgx = gx; u.pgy = gy; }
      if (u.path && u.path.length) {
        while (u.pi < u.path.length - 1 && (hyp(u.path[u.pi][0] - u.x, u.path[u.pi][1] - u.y) < 13 || this.los(u.x, u.y, u.path[u.pi + 1][0], u.path[u.pi + 1][1]))) u.pi++;
        tx = u.path[u.pi][0]; ty = u.path[u.pi][1];
      }
    } else u.path = null;
    let dx = tx - u.x, dy = ty - u.y; const d = hyp(dx, dy);
    if (d < 0.5) { u.moving = false; return; }
    dx /= d; dy /= d;
    // 앞을 막은 아군을 비켜 간다
    let ax = 0, ay = 0;
    this.near(u.x, u.y, 34, n => {
      if (n === u || n.team !== u.team || n.dead) return;
      const ox = n.x - u.x, oy = n.y - u.y, od = hyp(ox, oy), lim = u.r + n.r + 7; if (od >= lim || od < 0.01) return;
      const dot = (ox * dx + oy * dy) / od; if (dot < 0.3) return;
      let cross = dx * oy - dy * ox; if (Math.abs(cross) < 0.5) cross = (u.id & 1) ? 1 : -1;
      const w = (1 - od / lim) * 1.3 * (n.moving ? 0.6 : 1); const sgn = cross > 0 ? -1 : 1;
      ax += -dy * sgn * w; ay += dx * sgn * w;
    });
    dx += ax; dy += ay; const l = hyp(dx, dy) || 1; dx /= l; dy /= l;
    const step = Math.min(spd * dt, d + 4);
    u.x += dx * step; u.y += dy * step; u.moving = true; u.walk += step; u.still = 0;
    if (u.def.charge) u.run += step;
    this.face(u, Math.atan2(dy, dx), dt, 11);
  }

  // ───────── 공격 ─────────
  startAttack(u, t) {
    const def = u.def; u.atkT = this.time; u.cd = def.as;
    if (def.charge && u.run >= def.charge.dist * (u.team === 0 ? this.mods.chargeDist : 1)) { u.run = 0; this.chargeHit(u, t); return; }
    u.run = 0; u.swing = def.range > 0 ? 0.16 : 0.22; u.swingTarget = t;
  }
  chargeHit(u, t) {
    const c = u.def.charge; const ax = u.x - t.x, ay = u.y - t.y, al = hyp(ax, ay) || 1;
    const front = (Math.cos(t.facing) * ax + Math.sin(t.facing) * ay) / al > 0.2;
    if (t.def.brace && front && t.stun <= 0) { // 창 방벽
      this.ev('text', { x: t.x, y: t.y - 40, s: '창 방벽!', c: '#2f4d7e' });
      this.damage(u, t.atk * 4, t, 'melee'); if (!u.dead) u.stun = 0.6; this.damage(t, u.atk * 0.6, u, 'melee'); return;
    }
    const mult = c.mult * (u.team === 0 ? this.mods.chargeMult : 1);
    this.ev('charge', { x: t.x, y: t.y, team: u.team });
    const nx = -ax / al, ny = -ay / al;
    const hit = [t]; this.near(t.x, t.y, 30, n => { if (n.team !== u.team && !n.dead && n !== t && hyp(n.x - t.x, n.y - t.y) < 26 + n.r) hit.push(n); });
    hit.forEach((e, i) => { this.damage(e, u.atk * mult * (i ? 0.45 : 1), u, 'melee'); if (!e.dead && !e.def.boss && !e.def.structure) { const k = c.kb * (i ? 0.5 : 1) * (e.def.large ? 0.3 : 1); e.x += nx * k; e.y += ny * k; e.stun = Math.max(e.stun, 0.35); } });
  }
  resolveAttack(u) {
    const t = u.swingTarget, def = u.def; u.swingTarget = null;
    if (!t || t.dead || t.hidden > 0) return;
    if (def.range > 0) { this.fire(u, t); return; }
    if (hyp(t.x - u.x, t.y - u.y) - u.r - t.r > this.rangeOf(u) + 16) return;
    this.damage(t, u.atk, u, 'melee');
    this.ev('melee', { x: (t.x + u.x) / 2, y: (t.y + u.y) / 2 - 12, big: !!def.splash || !!def.cleave, team: u.team });
    if (def.cleave) { const um = u.team === 0 ? this.mods.unit[u.type] : null; let n = def.cleave - 1 + (um && um.cleave || 0); this.near(t.x, t.y, 44, e => { if (n > 0 && e !== t && e.team !== u.team && !e.dead && hyp(e.x - u.x, e.y - u.y) < u.r + e.r + 26) { n--; this.damage(e, u.atk * 0.8, u, 'melee'); } }); }
    if (def.splash) this.near(t.x, t.y, def.splash + 16, e => { if (e !== t && e.team !== u.team && !e.dead && hyp(e.x - t.x, e.y - t.y) < def.splash + e.r) this.damage(e, u.atk * 0.5, u, 'aoe'); });
  }
  fire(u, t) {
    const k = u.def.proj;
    if (k === 'fireball' || k === 'shell') {
      const d = hyp(t.x - u.x, t.y - u.y); const dur = Math.max(0.35, Math.min(1.5, d / (k === 'shell' ? 400 : 330)));
      const lead = t.moving ? 0.55 * dur : 0;
      this.proj.push({ kind: k, lob: true, x: u.x, y: u.y, sx: u.x, sy: u.y, tx: t.x + t.vx * lead, ty: t.y + t.vy * lead, t: 0, dur, dmg: u.atk, aoe: u.def.aoe * (u.team === 0 ? this.mods.aoeR : 1), team: u.team, src: u });
    } else this.proj.push({ kind: k, x: u.x, y: u.y - 12, ox: u.x, oy: u.y, target: t, tx: t.x, ty: t.y - 12, spd: k === 'bolt' ? 640 : 520, dmg: u.atk, team: u.team, src: u });
    this.ev('shoot', { kind: k, x: u.x, y: u.y, team: u.team });
  }
  damage(t, amt, src, kind, ox, oy) {
    if (t.dead || t.jump) return 0;
    let mult = 1, flank = false, block = false;
    if (src && (kind === 'melee' || kind === 'proj')) {
      const ax = (ox === undefined ? src.x : ox) - t.x, ay = (oy === undefined ? src.y : oy) - t.y, al = hyp(ax, ay) || 1;
      const dot = (Math.cos(t.facing) * ax + Math.sin(t.facing) * ay) / al;
      if (dot < -0.3 && !t.def.structure) {
        flank = true; mult *= src.team === 0 ? this.mods.flank : 1.4;
        if (t.def.boss) mult = 1 + (mult - 1) * 0.5;
        if (src.stab) { mult *= src.def.backstab / 1.4; src.stab = false; }
      } else if (t.def.shield && dot > 0.1) { const tm = t.team === 0 ? this.mods.unit[t.type] : null; mult *= kind === 'proj' ? 0.3 : 0.75 - (tm && tm.block || 0); block = kind === 'proj'; }
      if (src.def.antiCav) { if (t.def.mounted) mult *= 2; else if (t.def.large) mult *= 1.5; }
    }
    if (src) {
      if (src.weaken > 0) mult *= 0.7; if (src.auraDmg) mult *= 1 + src.auraDmg; if (src.rage > 0) mult *= 1.25;
      if (src.team === 0) { const md = this.mods; if (md.lastStand && src.squad.alive <= src.squad.total / 2) mult *= 1 + md.lastStand; if (md.vanguard && this.time < 8) mult *= 1.15; }
    }
    let d = amt * mult;
    if (t.team === 0) { const md = this.mods; if (md.openGuard && this.time < 5) d *= 1 - md.openGuard; if (md.holdGuard && t.squad.order.kind === 'hold') d *= 1 - md.holdGuard; }
    if (t.barrier > 0) { const a = Math.min(t.barrier, d); t.barrier -= a; d -= a; if (d <= 0) { this.ev('hit', { x: t.x, y: t.y, amt: 0, block: true, team: t.team, kind }); return 0; } }
    t.hp -= d; t.flash = 1;
    this.ev('hit', { x: t.x, y: t.y, amt: d, flank, block, team: t.team, kind, big: d > 45 });
    if (t.hp <= 0) this.kill(t, src);
    return d;
  }
  kill(t, src, silent) {
    if (t.dead) return;
    t.dead = true; t.hp = 0; t.deadT = this.time; t.squad.alive--; t.moving = false;
    this.ev('death', { x: t.x, y: t.y, team: t.team, utype: t.type, boss: !!t.def.boss, r: t.r });
    if (t.team === 0) this.lost++; else { this.kills++; this.morale = Math.min(this.moraleMax, this.morale + (t.def.boss ? 2 : t.def.large ? 0.3 : 0.12)); }
    if (t.def.bomber && !t.exploded) this.zones.push({ kind: 'tele', style: 'bomb', x: t.x, y: t.y, r: t.def.bomber.r, t: 0, delay: 0.7, hits: 2, dmg: t.def.bomber.dmg * lvlMult(t.lvl), kb: 22 });
    else if (t.def.revive && !t.revived && !this.inGrail(t.x, t.y)) { this.corpses.push({ x: t.x, y: t.y, t: 3, revive: true, u: t }); this.pending++; }
    else if (!t.def.structure && !t.def.boss && !silent) this.corpses.push({ x: t.x, y: t.y, t: 12, raisable: true });
  }
  inGrail(x, y) { for (const z of this.zones) if (z.kind === 'grail' && hyp(z.x - x, z.y - y) < z.r) return true; return false; }
  aoe(x, y, r, dmg, hits, src, o = {}) {
    let n = 0;
    this.near(x, y, r + 30, e => {
      if (e.dead || e.jump) return; if (hits !== 2 && e.team !== hits) return;
      const d = hyp(e.x - x, e.y - y); if (d > r + e.r * 0.6) return;
      n++; this.damage(e, dmg, src, 'aoe'); if (e.dead) return;
      const dk = e.team === 0 ? this.mods.debuff : 1;
      if (o.stun && !e.def.boss) e.stun = Math.max(e.stun, o.stun * dk);
      if (o.root && !e.def.boss) e.root = Math.max(e.root, o.root * dk);
      if (o.weaken) e.weaken = Math.max(e.weaken, o.weaken * dk);
      if (o.burn) { e.burn = Math.max(e.burn, o.burn); e.burnDmg = Math.max(e.burnDmg, o.burnDmg || 6); }
      if (o.kb && !e.def.boss && !e.def.structure && d > 0.5) { const k = o.kb * (e.def.large ? 0.3 : 1); e.x += (e.x - x) / d * k; e.y += (e.y - y) / d * k; }
    });
    return n;
  }

  // ───────── 특수 행동 ─────────
  doJump(u, dt) {
    const j = u.jump; j.t += dt; const k = Math.min(1, j.t / j.dur);
    u.x = j.sx + (j.tx - j.sx) * k; u.y = j.sy + (j.ty - j.sy) * k; u.moving = false; u.jumpH = Math.sin(k * PI) * 70;
    if (k >= 1) { u.jump = null; u.jumpH = 0; this.aoe(u.x, u.y, j.r, j.dmg, 1 - u.team, u, { stun: 1.5, kb: 26 }); this.ev('impact', { x: u.x, y: u.y, r: j.r, style: 'strike' }); u.cd = 0.3; u.retarget = 0; }
  }
  tryLeap(u) {
    if (this.time < 1) { u.leapCd = 0.2; return false; }
    let best = null, bs = -1e9;
    for (const e of this.units) { if (e.dead || e.team === u.team || !e.def.soft || e.def.structure || e.hidden > 0) continue; const d = hyp(e.x - u.x, e.y - u.y); if (d < 150) continue; const s = (e.def.support ? 200 : 0) + d * 0.3 + this.rand() * 80; if (s > bs) { bs = s; best = e; } }
    if (!best) { u.leapCd = 3; return false; }
    let x = best.x - Math.cos(best.facing) * 24, y = best.y - Math.sin(best.facing) * 24;
    x = Math.max(FIELD.x0 + 14, Math.min(FIELD.x1 - 14, x)); y = Math.max(FIELD.y0 + 14, Math.min(FIELD.y1 - 14, y));
    if (this.isBlocked(x, y)) { x = best.x; y = best.y + (u.team === 0 ? -22 : 22); }
    u.hidden = 0.75; u.leapTo = best; u.leapX = x; u.leapY = y; u.leapCd = 13 + this.rand() * 3; u.moving = false; u.target = null;
    this.ev('vanish', { x: u.x, y: u.y });
    this.zones.push({ kind: 'mark', x, y, r: 18, t: 0, delay: 0.75 });
    return true;
  }
  finishLeap(u) {
    u.x = u.leapX; u.y = u.leapY; u.hidden = 0; u.stab = true; u.cd = 0.3; u.retarget = 1.5;
    u.target = u.leapTo && !u.leapTo.dead ? u.leapTo : null; u.leapTo = null;
    this.ev('appear', { x: u.x, y: u.y });
  }
  bomberAI(u, dt) {
    if (u.fuse > 0) { u.fuse -= dt; u.moving = false; if (u.fuse <= 0) { u.exploded = true; const b = u.def.bomber; this.aoe(u.x, u.y, b.r, b.dmg * lvlMult(u.lvl), 1 - u.team, u, { kb: 22 }); this.ev('impact', { x: u.x, y: u.y, r: b.r, style: 'bomb' }); this.kill(u, null, true); } return; }
    u.retarget -= dt;
    if (u.retarget <= 0 || !u.target || u.target.dead) { u.retarget = 0.4; let best = null, bs = 1e9; for (const e of this.units) { if (e.dead || e.team === u.team || e.hidden > 0) continue; const s = hyp(e.x - u.x, e.y - u.y) - 12 * Math.min(4, this.clusterScore(e, 50)); if (s < bs) { bs = s; best = e; } } u.target = best; }
    const t = u.target; if (!t) { this.idle(u, dt); return; }
    if (hyp(t.x - u.x, t.y - u.y) - u.r - t.r <= 7) { u.fuse = 0.5; this.ev('fuse', { x: u.x, y: u.y }); } else this.moveTo(u, t.x, t.y, dt);
  }
  catapultAI(u) {
    u.moving = false; if (u.cd > 0) return;
    let best = null, bs = -1; for (const e of this.units) { if (e.dead || e.team === u.team || e.hidden > 0) continue; const s = this.clusterScore(e, 60) + this.rand() * 1.5; if (s > bs) { bs = s; best = e; } }
    if (!best) return;
    const lob = u.def.lob; u.cd = u.def.as; u.atkT = this.time; u.facing = Math.atan2(best.y - u.y, best.x - u.x);
    const z = { kind: 'tele', style: 'boulder', x: best.x, y: best.y, r: lob.r, t: 0, delay: lob.delay, hits: 1 - u.team, dmg: u.atk, kb: 24, src: u, fx: u.x, fy: u.y };
    this.zones.push(z); this.ev('lob', { x: u.x, y: u.y, tx: best.x, ty: best.y, dur: lob.delay });
  }
  necroRaise(u, dt) {
    u.raiseT -= dt; if (u.raiseT > 0) return; u.raiseT = 1;
    let n = 0; for (const e of this.units) if (!e.dead && e.summoner === u) n++;
    if (n >= u.def.raise.max) return;
    let best = null, bd = 420; for (const c of this.corpses) { if (!c.raisable) continue; const d = hyp(c.x - u.x, c.y - u.y); if (d < bd) { bd = d; best = c; } }
    if (!best) return;
    best.raisable = false; best.t = 0; u.raiseT = u.def.raise.cd; u.atkT = this.time;
    this.zones.push({ kind: 'spawn', x: best.x, y: best.y, r: 16, t: 0, delay: 0.9, utype: 'skel', n: 1, lvl: u.lvl, summoner: u, team: u.team, fx: u.x, fy: u.y });
    this.ev('raise', { x: best.x, y: best.y, fx: u.x, fy: u.y });
  }
  bossAbilities(u, dt) {
    for (const a of u.abils) { a.t -= dt; if (a.t <= 0) { if (this.useAbility(u, a.id)) { a.t = a.cd; break; } else a.t = 1; } }
  }
  playerSquads() { return this.squads.filter(s => s.team === 0 && s.alive > 0); }
  useAbility(u, id) {
    const m = lvlMult(u.lvl);
    if (id === 'slam') {
      let best = null, bs = -1; for (const e of this.units) { if (e.dead || e.team === u.team || e.hidden > 0) continue; const d = hyp(e.x - u.x, e.y - u.y); if (d > 300) continue; const s = this.clusterScore(e, 80) - d * 0.004; if (s > bs) { bs = s; best = e; } }
      if (!best) return false;
      this.zones.push({ kind: 'tele', style: 'slam', x: best.x, y: best.y, r: 95, t: 0, delay: 1.6, hits: 1 - u.team, dmg: 112 * m, stun: 0.9, kb: 30, src: u });
      u.cast = 1.0; u.atkT = this.time + 0.7; this.ev('text', { x: u.x, y: u.y - 90, s: '땅 가르기!', c: '#c8402f', big: true }); return true;
    }
    if (id === 'warcry') {
      if (u.hp > u.maxHp * 0.5 || u.cried) return false; u.cried = true;
      for (const e of this.units) if (!e.dead && e.team === u.team) { e.haste = 10; e.rage = 10; }
      u.cast = 0.8; this.ev('warcry', { x: u.x, y: u.y }); this.ev('text', { x: u.x, y: u.y - 90, s: '도깨비 함성!', c: '#c8402f', big: true }); u.abils = u.abils.filter(a => a.id !== 'warcry'); return true;
    }
    if (id === 'roots' || id === 'brand') {
      const sqs = this.playerSquads().sort((a, b) => b.alive - a.alive + (this.rand() - 0.5) * 3).slice(0, id === 'roots' ? 2 : 3); if (!sqs.length) return false;
      for (const s of sqs) this.zones.push(id === 'roots'
        ? { kind: 'tele', style: 'root', x: s.cx, y: s.cy, r: 72, t: 0, delay: 1.6, hits: 0, dmg: 40 * m, root: 3, src: u }
        : { kind: 'tele', style: 'dark', x: s.cx, y: s.cy, r: 60, t: 0, delay: 1.9, hits: 0, dmg: 36 * m, weaken: 4, src: u });
      u.cast = 0.7; this.ev('text', { x: u.x, y: u.y - 100, s: id === 'roots' ? '뿌리 감옥!' : '어둠의 낙인!', c: id === 'roots' ? '#3f7a3a' : '#5a4a8a', big: true }); return true;
    }
    if (id === 'saplings') {
      let n = 0; for (const e of this.units) if (!e.dead && e.type === 'sapling') n++; if (n >= 9) return false;
      for (let i = 0; i < 3; i++) { const a = this.rand() * TAU; this.zones.push({ kind: 'spawn', x: u.x + Math.cos(a) * 62, y: u.y + Math.sin(a) * 50 + 20, r: 14, t: 0, delay: 0.8 + i * 0.15, utype: 'sapling', n: 1, lvl: u.lvl, team: u.team }); }
      u.cast = 0.6; this.ev('text', { x: u.x, y: u.y - 100, s: '숲이여, 깨어나라!', c: '#3f7a3a', big: true }); return true;
    }
    if (id === 'summon') {
      const sqs = this.playerSquads(); if (!sqs.length) return false;
      const soft = sqs.filter(s => s.def.soft); const s = (soft.length ? soft : sqs)[(this.rand() * (soft.length || sqs.length)) | 0];
      for (let i = 0; i < 3; i++) { const a = i / 3 * TAU + this.rand(); let x = s.cx + Math.cos(a) * 58, y = s.cy + Math.sin(a) * 48; x = Math.max(FIELD.x0 + 20, Math.min(FIELD.x1 - 20, x)); y = Math.max(FIELD.y0 + 20, Math.min(FIELD.y1 - 20, y)); this.zones.push({ kind: 'spawn', x, y, r: 16, t: 0, delay: 1.5, utype: 'skel', n: 1, lvl: u.lvl, team: u.team, warn: true }); }
      u.cast = 0.7; this.ev('text', { x: u.x, y: u.y - 100, s: '일어나라, 망령들아!', c: '#2f6f9a', big: true }); return true;
    }
    return false;
  }

  // ───────── 충돌 ─────────
  collide(dt) {
    const us = this.units;
    for (let i = 0; i < us.length; i++) {
      const a = us[i]; if (a.dead || a.hidden > 0 || a.jump) continue;
      this.near(a.x, a.y, a.r + 32, b => {
        if (b.id <= a.id || b.dead || b.jump) return;
        const dx = b.x - a.x, dy = b.y - a.y; let d = hyp(dx, dy); const same = a.team === b.team; const min = (a.r + b.r) * (same ? 0.8 : 0.96);
        if (d >= min) return; let nx, ny; if (d < 0.01) { const an = (a.id * 2.4) % TAU; nx = Math.cos(an); ny = Math.sin(an); d = 0.01; } else { nx = dx / d; ny = dy / d; }
        const ma = a.def.structure ? 1e6 : a.r * a.r * (a.moving ? 1 : 2.6), mb = b.def.structure ? 1e6 : b.r * b.r * (b.moving ? 1 : 2.6);
        const push = (min - d) * (same ? 0.5 : 0.85), wa = mb / (ma + mb), wb = ma / (ma + mb);
        a.x -= nx * push * wa; a.y -= ny * push * wa; b.x += nx * push * wb; b.y += ny * push * wb;
      });
    }
    for (const u of us) {
      if (u.dead) continue;
      if (!u.jump && u.hidden <= 0) {
        for (const q of this.rects) { const cx = Math.max(q.x, Math.min(u.x, q.x + q.w)), cy = Math.max(q.y, Math.min(u.y, q.y + q.h)); let dx = u.x - cx, dy = u.y - cy; const d = hyp(dx, dy), rr = u.r * 0.8; if (d < rr) { if (d < 0.01) { const l = u.x - q.x, r = q.x + q.w - u.x, t = u.y - q.y, b = q.y + q.h - u.y, m = Math.min(l, r, t, b); if (m === t) u.y = q.y - rr; else if (m === b) u.y = q.y + q.h + rr; else if (m === l) u.x = q.x - rr; else u.x = q.x + q.w + rr; } else { u.x = cx + dx / d * rr; u.y = cy + dy / d * rr; } } }
        for (const q of this.circs) { const dx = u.x - q.x, dy = u.y - q.y, d = hyp(dx, dy), rr = q.r + u.r * 0.8; if (d < rr && d > 0.01) { u.x = q.x + dx / d * rr; u.y = q.y + dy / d * rr; } }
      }
      u.x = Math.max(FIELD.x0 + u.r, Math.min(FIELD.x1 - u.r, u.x)); u.y = Math.max(FIELD.y0 + u.r, Math.min(FIELD.y1 - u.r, u.y));
      const mv = hyp(u.x - u.px, u.y - u.py);
      if (dt > 0) { u.vx = (u.x - u.px) / dt; u.vy = (u.y - u.py) / dt; if (u.moving && mv < u.def.spd * dt * 0.3) u.stuck += dt; else u.stuck = 0; }
    }
  }

  // ───────── 투사체 / 구역 / 시체 ─────────
  updateProj(dt) {
    for (const p of this.proj) {
      if (p.lob) {
        p.t += dt; const k = Math.min(1, p.t / p.dur); p.x = p.sx + (p.tx - p.sx) * k; p.y = p.sy + (p.ty - p.sy) * k; p.h = Math.sin(k * PI) * (p.kind === 'shell' ? 90 : 60) + 14 * (1 - k);
        if (k >= 1) { p.done = true; this.aoe(p.tx, p.ty, p.aoe, p.dmg, 1 - p.team, p.src, { kb: p.kind === 'shell' ? 14 : 0 }); this.ev('impact', { x: p.tx, y: p.ty, r: p.aoe, style: p.kind }); }
      } else {
        const t = p.target; if (t && !t.dead && t.hidden <= 0) { p.tx = t.x; p.ty = t.y - 12; }
        const dx = p.tx - p.x, dy = p.ty - p.y, d = hyp(dx, dy), s = p.spd * dt; p.ang = Math.atan2(dy, dx);
        if (d <= s + 6) { p.done = true; if (t && !t.dead && t.hidden <= 0) this.damage(t, p.dmg, p.src, 'proj', p.ox, p.oy); }
        else { p.x += dx / d * s; p.y += dy / d * s; }
      }
    }
    if (this.proj.length) this.proj = this.proj.filter(p => !p.done);
  }
  updateZones(dt) {
    for (const z of this.zones) {
      z.t += dt;
      if (z.kind === 'tele') {
        if (z.t >= z.delay) { z.done = true; this.aoe(z.x, z.y, z.r, z.hits !== 1 ? z.dmg * (1 - this.mods.teleResist) : z.dmg, z.hits, z.src && !z.src.dead ? z.src : null, z); this.ev('impact', { x: z.x, y: z.y, r: z.r, style: z.style }); }
      } else if (z.kind === 'mark') { if (z.t >= z.delay) z.done = true; }
      else if (z.kind === 'spawn') {
        if (z.t >= z.delay) {
          z.done = true; let sq = this.squads.find(s => s.team === z.team && s.type === z.utype && s.summonPool);
          if (!sq) { sq = { id: this.squads.length, team: z.team, type: z.utype, def: UNITS[z.utype], lvl: z.lvl, units: [], alive: 0, total: 0, order: { kind: 'auto' }, cx: z.x, cy: z.y, summonPool: true }; this.squads.push(sq); }
          for (let i = 0; i < z.n; i++) { const u = this.spawn(z.utype, z.team, z.x + i * 6, z.y, sq, z.lvl, [0, 0]); u.summoned = true; u.revived = true; u.summoner = z.summoner || null; sq.total++; }
          this.ev('appear', { x: z.x, y: z.y, summon: true });
        }
      } else if (z.kind === 'rain') {
        z.acc += dt; if (z.acc >= 0.4 && z.t < z.dur) { z.acc -= 0.4; this.aoe(z.x, z.y, z.r, z.dmg, 1, null, z.burn ? { burn: 3, burnDmg: z.burn * this.power } : {}); this.ev('rainTick', { x: z.x, y: z.y, r: z.r }); }
        if (z.t >= z.dur) z.done = true;
      } else if (z.kind === 'grail') {
        z.acc += dt; if (z.acc >= 0.5 && z.t < z.dur) { z.acc -= 0.5; this.near(z.x, z.y, z.r + 20, u => { if (u.dead || u.team !== 0 || hyp(u.x - z.x, u.y - z.y) > z.r + u.r) return; const a = u.maxHp * z.heal; if (u.hp < u.maxHp) this.ev('heal', { x: u.x, y: u.y, amt: Math.min(a, u.maxHp - u.hp), team: 0, quiet: true }); u.hp = Math.min(u.maxHp, u.hp + a); u.root = 0; u.weaken = 0; u.burn = 0; }); }
        if (z.t >= z.dur) z.done = true;
      }
    }
    if (this.zones.length) this.zones = this.zones.filter(z => !z.done);
  }
  updateCorpses(dt) {
    for (const c of this.corpses) {
      c.t -= dt;
      if (c.revive && c.t <= 0) {
        this.pending--; c.done = true;
        if (this.inGrail(c.x, c.y)) { this.ev('text', { x: c.x, y: c.y - 30, s: '정화!', c: '#b8862a' }); continue; }
        const o = c.u, u = this.spawn(o.type, o.team, c.x, c.y, o.squad, o.lvl, [o.slot.dx, o.slot.dy]);
        u.revived = true; u.hp = u.maxHp * o.def.revive; u.stun = 0.4; this.ev('appear', { x: c.x, y: c.y, revive: true });
      } else if (c.t <= 0) c.done = true;
    }
    if (this.corpses.length) this.corpses = this.corpses.filter(c => !c.done);
  }
}
