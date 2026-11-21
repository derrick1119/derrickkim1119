// 전투 시뮬레이션 (DOM 비의존 — Node 에서도 돌아간다)
// 한 원정 동안 이어지는 하나의 전장: 아군은 왼쪽, 요괴 무리(물결)는 오른쪽 화면 밖에서 걸어 들어온다.
// 병력·영웅·전술이 모두 패이고, 손패에서 사기를 내고 쓴다.
import { W, H, FIELD, VIEW, CELL, BANNER_POS, spawnPos } from '../config.js';
import { UNITS, lvlMult, HERO_SKILLS, COMBOS, SYNERGIES, SYN_CLASS } from '../data/units.js';
import { TERRAINS } from '../data/terrain.js';
import { CARDS, cardVals, cardCost, isUnit } from '../data/cards.js';
import { WEAPONS, ARMS } from '../data/weapons.js';

const NC = Math.ceil((FIELD.x1 + 30) / CELL), NR = Math.ceil(H / CELL);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const PI = Math.PI, TAU = PI * 2;
const HC = 48; // 공간 해시 셀
export const PACE = 2.2; // 체력 배율 — 전투 호흡 조절

export const DEFAULT_MODS = {
  startMorale: 0, moraleRate: 1, flank: 1.5, chargeMult: 1, chargeDist: 1, grailHeal: 1, grailR: 1, rainDmg: 1, rainBurn: 0,
  hornDur: 0, hornCost: 0, hpInf: 1, rangeMul: 1, rangedAS: 1, priestHeal: 1, heroCd: 1, heroHp: 1, gold: 1, lastStand: 0,
  vanguard: 0, aoeR: 1, startShield: 0,
  // 병종 전용 배율 unit[type] = { hp, atk, as, range, cleave, block }
  unit: {}, hpAll: 1, heroAtk: 1, openGuard: 0, teleResist: 0, holdGuard: 0, debuff: 1, refund: 0, goldFlat: 0,
  // 패 관련: 영웅 패 비용 감소, 손패 보충 시간 배율, 전투마다 공짜로 쓰는 패 수, 패 위력
  heroCost: 0, drawRate: 1, freeFirst: 0, cardPow: 1, summonLife: 0, heroGauge: 1, killMorale: 0,
  // 패의 살림: 주머니 한도, 무리 몇을 물리칠 때마다 노획하는가, 그리고 이끄는 영웅의 병법
  pouch: 12, lootEvery: 3, rally: 0, keepSupport: 0, heroLoot: 0, scavAny: 0, killGold: 0, shopCard: 1, startCard: 0, tacDisc: 0,
};
export const HAND = 5, REFILL = 3.2, MAX_CAP = 9, ROUT = 0.12;
// 사기는 가만히 있어도 차오르는 자원이 아니다: 물결이 시작될 때 한 몫, 요괴 무리를 하나 물리칠 때마다 한 닢.
// 싸우는 동안에는 아주 천천히, 행군하며 숨을 고를 때는 조금 더 빨리 돌아온다. 아낀 사기는 다음 싸움으로 넘어간다
export const MORALE_RATE = 0.03, MARCH_RATE = 0.16, WAVE_MORALE = 2, SQUAD_MORALE = 1, BOSS_MORALE = 3;
export const GAUGE_RATE = 0.085, COMBO_TIME = 26;
// 요괴 쪽 보정 (강적 특성, 험로 단계)
export const DEFAULT_FOE = { hp: 1, atk: 1, as: 1, spd: 1, regen: 0 };

function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const hyp = Math.hypot;
// 무기를 끼운 병종 정의 (기본 정의를 복사해 무기 효과를 덧씌운다)
const DEFS = new Map();
export function defOf(type, wpn) {
  const base = UNITS[type], arm = ARMS[type]; if (!arm) return base;
  const wid = wpn && WEAPONS[wpn] ? wpn : arm.base, key = type + ':' + wid;
  let d = DEFS.get(key);
  if (!d) { d = Object.assign({}, base); const w = WEAPONS[wid]; if (w.mod) w.mod(d); d.wpn = wid; DEFS.set(key, d); }
  return d;
}
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
    this.foe = Object.assign({}, DEFAULT_FOE);
    this.rand = mulberry(o.seed || 1);
    this.time = 0; this.over = false;
    this.units = []; this.squads = []; this.proj = []; this.zones = []; this.corpses = []; this.events = [];
    this.power = o.power || 1; this.cap = o.cap || 5;
    this.moraleMax = 10; this.morale = clamp(4 + (o.morale || 0), 0, 10);
    this.lost = 0; this.kills = 0; this.pending = 0; this.uid = 1; this.sid = 1; this.auraT = 0;
    this.waveOn = false; this.waveT = 0; this.waveLost = 0; this.waves = 0;
    this.sky = 'day'; this.torch = 0; this.torchRange = 0; this.terrain = TERRAINS.open; this.terrainT = 0; this.scout = null; this.expose = 0; this.chase = null; this.chaseN = 0;
    this.syn = {}; this.synN = { inf: 0, rng: 0, cav: 0, heal: 0, beast: 0 }; this.combo = 0; this.sun = false;
    this.buildNav({});
    this.raiseBanner(true);
    // 패: 더미 → 손패. 전술 패는 한 번 쓰면 원정에서 사라지고(spent), 병력 패는 전장의 부대가 된다.
    // 전멸한 부대의 패는 싸움이 끝날 때까지 쉬고(bench), 새로 얻은 패(gained)는 원정 덱에 더해진다
    this.hand = new Array(HAND).fill(null); this.slotT = new Array(HAND).fill(0); this.drawPile = []; this.bench = []; this.rest = []; this.spent = []; this.gone = new Set(); this.gained = []; this.newN = 0; this.played = 0; this.free = 0;
    this.lootTable = o.loot || []; this.mastery = o.mastery || {}; this.lead = o.lead || null; this.lootN = 0; this.rallied = 0; this.heroLootN = 0; this.goldGain = 0; this.fullSaid = false;
    const deck = (o.deck || []).map(c => this.copyCard(c)), out = new Set();
    for (const [uid, x, y] of o.start || []) { const c = deck.find(q => q.uid === uid); if (c) { out.add(uid); this.deploy(c, x, y, true); } }
    this.drawPile = this.shuffle(deck.filter(c => !out.has(c.uid))); for (let i = 0; i < HAND; i++) this.hand[i] = this.drawCard();
    this.centroids();
  }
  copyCard(c) { const o = { uid: c.uid, id: c.id, up: !!c.up, lv: c.lv || 1, wpn: c.wpn }; if (c.free) o.free = 1; return o; }
  // 원정 덱이 바뀌면(새 패·익히기·무기·조련) 전장의 패에 반영한다
  syncDeck(deck) {
    const by = new Map(deck.map(c => [c.uid, c])), seen = new Set();
    const fix = c => { if (!c) return c; const r = by.get(c.uid); if (!r) return null; seen.add(c.uid); c.up = !!r.up; c.lv = r.lv || 1; c.wpn = r.wpn; return c; };
    this.drawPile = this.drawPile.map(fix).filter(Boolean); this.bench = this.bench.map(fix).filter(Boolean); this.rest = this.rest.map(fix).filter(Boolean);
    for (let i = 0; i < HAND; i++) if (this.hand[i]) { this.hand[i] = fix(this.hand[i]); if (!this.hand[i]) this.slotT[i] = 0.3; }
    for (const sq of this.squads) { if (!sq.card) continue; const c = fix(sq.card); sq.card = c; if (c && sq.alive > 0) this.refit(sq, c); }
    for (const c of deck) if (!seen.has(c.uid) && !this.gone.has(c.uid)) this.drawPile.splice((this.rand() * (this.drawPile.length + 1)) | 0, 0, this.copyCard(c));
  }
  // 전장에 선 부대의 조련 단계·무기를 바꾼다
  refit(sq, c) {
    const nd = defOf(sq.type, c.wpn), od = sq.def, k = lvlMult(c.lv) / lvlMult(sq.lvl);
    if (nd === od && k === 1) return;
    for (const u of sq.units) { if (u.dead) continue; const h = k * nd.hp / od.hp; u.maxHp *= h; u.hp *= h; if (od.atk) u.atk *= k * nd.atk / od.atk; if (od.heal) u.healAmt *= k * nd.heal / od.heal; u.def = nd; u.lvl = c.lv; }
    sq.def = nd; sq.lvl = c.lv;
  }
  shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = (this.rand() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }
  // 더미가 비면 더는 뽑을 패가 없다 (쓴 패는 돌아오지 않는다)
  drawCard() { return this.drawPile.length ? this.drawPile.pop() : null; }
  // 주머니에 든 전술 패 수
  pouchCount() { let n = 0; const f = c => { if (c && !isUnit(c) && CARDS[c.id].kind !== 'curse') n++; }; this.hand.forEach(f); this.drawPile.forEach(f); this.rest.forEach(f); return n; }
  lootPick() { const t = this.lootTable; if (!t.length) return 'sling'; let w = this.rand() * t.reduce((a, q) => a + q[1], 0); for (const q of t) if ((w -= q[1]) < 0) return q[0]; return t[0][0]; }
  // 새 패를 얻는다: 손에 빈 자리가 있고 더미가 비었으면 바로 손으로, 아니면 더미에 섞인다
  gainCard(id, x, y, why) {
    const c = { uid: 'n' + (++this.newN), id, up: !!this.mastery[id], lv: 1 }; this.gained.push(c);
    const slot = this.drawPile.length ? -1 : this.hand.findIndex(h => !h);
    if (slot >= 0) { this.hand[slot] = c; this.ev('draw', { slot }); } else this.drawPile.splice((this.rand() * (this.drawPile.length + 1)) | 0, 0, c);
    this.ev('loot', { id, x, y, why, up: c.up }); return c;
  }
  // 전장의 노획: 주머니가 가득하면 줍지 못한다
  loot(x, y) { if (this.pouchCount() >= this.mods.pouch) { if (!this.fullSaid) { this.fullSaid = true; this.ev('lootFull', { x, y }); } return null; } return this.gainCard(this.lootPick(), x, y, 'loot'); }
  // 패가 떨어졌을 때: 사기를 내고 돌을 줍는다 (상쇠는 언제든 아무 전술 패나 얻는다). 그렇게 얻은 패는 값 없이 낸다
  scavCost() { return 2; }
  canScavenge(i) { return !this.over && !this.hand[i] && (this.mods.scavAny ? this.pouchCount() < this.mods.pouch : !this.drawPile.length) && this.morale >= this.scavCost(); }
  scavenge(i) {
    if (!this.canScavenge(i)) return false; this.morale -= this.scavCost();
    const id = this.mods.scavAny ? this.lootPick() : 'sling', c = { uid: 'n' + (++this.newN), id, up: !!this.mods.scavAny || !!this.mastery[id], lv: 1, free: 1 }; this.gained.push(c); this.hand[i] = c;
    this.ev('scavenge', { slot: i, id }); return true;
  }
  // 싸움이 끝나면 쉬던 패가 돌아온다: 전멸했던 부대, (고승의) 지원 패
  regroup() { const back = this.bench.concat(this.rest); this.bench = []; this.rest = []; for (const c of back) this.drawPile.splice((this.rand() * (this.drawPile.length + 1)) | 0, 0, c); this.rallied = 0; this.heroLootN = 0; this.fullSaid = false; return back.length; }
  ev(type, o) { const e = o || {}; e.type = type; this.events.push(e); }
  count(team) { let n = 0; for (const u of this.units) if (!u.dead && u.team === team) n++; return n; }
  hpSum(team) { let n = 0; for (const u of this.units) if (!u.dead && u.team === team) n += u.hp; return n; }

  // ───────── 생성 ─────────
  addSquad(team, s) {
    const def = defOf(s.type, s.wpn), pos = { x: s.x, y: s.y }, n = s.n || def.n;
    const sq = { id: this.sid++, team, type: s.type, def, lvl: s.lvl || 1, units: [], alive: 0, total: n, order: { kind: 'auto' }, cx: pos.x, cy: pos.y, hero: !!def.hero, home: { x: pos.x, y: pos.y } };
    // 측면 돌격: 길 가장자리를 따라 들어와 후방을 노린다
    if (s.flank) { const y = s.flank === 'L' ? VIEW.y0 + 30 : VIEW.y1 - 30; sq.order = { kind: 'move', path: [[VIEW.x1 - 240, y], [VIEW.x0 + 330, y]], x: VIEW.x1 - 240, y, then: 'auto', wait: this.time + (s.wait || 0) }; pos.y = y; sq.cy = y; }
    this.squads.push(sq);
    const offs = formation(n);
    for (let i = 0; i < n; i++) { const o = [offs[i][1], offs[i][0]]; this.spawn(s.type, team, pos.x + o[0], pos.y + o[1], sq, sq.lvl, o); }
    return sq;
  }
  spawn(type, team, x, y, sq, lvl, off) {
    const def = sq && sq.type === type ? sq.def : defOf(type), m = lvlMult(lvl), md = this.mods;
    const um = team === 0 ? md.unit[type] : null;
    let hp = def.hp * m * PACE * (team === 0 ? md.hpAll * (um && um.hp || 1) : this.foe.hp);
    if (team === 0) { if (def.hero) hp *= md.heroHp; else if (!def.range && !def.mounted && !def.heal) hp *= md.hpInf; }
    const u = {
      id: this.uid++, team, type, def, squad: sq, lvl, x, y, px: x, py: y, vx: 0, vy: 0, r: def.r, hp, maxHp: hp,
      atk: (def.atk || 0) * m * (team === 0 ? (um && um.atk || 1) * (def.hero ? md.heroAtk : 1) : this.foe.atk), healAmt: (def.heal || 0) * m * (team === 0 && def.hero ? md.heroAtk : 1), facing: team === 0 ? 0 : PI,
      target: null, cd: 0.2 + this.rand() * 0.5, retarget: this.rand() * 0.3, swing: 0, swingTarget: null, atkT: -9, cast: 0,
      moving: false, walk: this.rand() * 10, still: 0, stuck: 0, run: 0, stun: 0, root: 0, haste: 0, weaken: 0, rage: 0, burn: 0, burnDmg: 0, burnAcc: 0,
      gauge: 0, skillI: 0, slow: 0, slowAmt: 0, guard: 0, guardAmt: 0, dmgUp: 0, dmgUpAmt: 0, regen: 0, regenAmt: 0, life: 0, temp: false, born: this.time,
      barrier: 0, barrierT: 0, auraDmg: 0, auraHaste: 0, mark: 0, markAmt: 0, taunt: def.taunt || 0, tauntT: 0, slot: { dx: off ? off[0] : 0, dy: off ? off[1] : 0 }, dead: false, hidden: 0, flash: 0, eng: 0,
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
      if (o.kind === 'wall' || o.kind === 'barricade' || o.kind === 'water') this.rects.push({ x: o.x, y: o.y, w: o.w, h: o.h, water: o.kind === 'water' });
      else this.circs.push({ x: o.x, y: o.y, r: o.r });
    }
    for (const f of map.slow || []) this.slow.push(f);
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
    this.time += dt; if (this.waveOn) this.waveT += dt;
    this.morale = Math.min(this.moraleMax, this.morale + dt * (this.waveOn ? MORALE_RATE : MARCH_RATE) * this.mods.moraleRate);
    if (this.torch > 0) this.torch -= dt;
    for (let i = 0; i < HAND; i++) if (!this.hand[i] && (this.slotT[i] -= dt) <= 0) { const c = this.drawCard(); if (c) { this.hand[i] = c; this.ev('draw', { slot: i }); } }
    this.hash(); this.centroids();
    for (const u of this.units) u.eng = 0;
    for (const u of this.units) if (!u.dead && u.target && !u.target.dead && !u.def.range && !u.def.heal) u.target.eng++;
    this.auraT -= dt; if (this.auraT <= 0) { this.auraT = 0.3; this.auras(); }
    this.updateOrders();
    for (let i = 0; i < this.units.length; i++) { const u = this.units[i]; if (!u.dead) { u.px = u.x; u.py = u.y; this.think(u, dt); } }
    this.collide(dt);
    this.updateProj(dt); this.updateZones(dt); this.updateCorpses(dt);
    if (this.waveOn) { this.pursue(); this.comboTick(dt); }
    if (this.units.length > 180) this.units = this.units.filter(u => !u.dead || this.time - u.deadT < 2);
    // 물결을 다 물리치면 다음 행군으로 (군기 수레는 그때마다 조금 수리된다 — 제대로 고치려면 주막에 들러야 한다)
    if (this.waveOn && this.count(1) + this.pending === 0) {
      this.waveOn = false; this.repair(0.06); this.setTerrain('open'); this.chase = null; this.regroup();
      this.ev('waveClear', { time: this.waveT, lost: this.waveLost });
    }
  }
  gain(n, x, y) { this.morale = Math.min(this.moraleMax, this.morale + n); if (x !== undefined) this.ev('morale', { x, y, n }); }
  // 싸움터를 차린다: 지형이 세워지고 하늘이 바뀐다 (요괴는 아직 오지 않았다)
  setTerrain(id) {
    const t = TERRAINS[id] || TERRAINS.open; if (t === this.terrain) return; this.terrain = t; this.terrainT = this.time; this.buildNav(t);
    for (const u of this.units) u.path = null;
    for (const sq of this.squads) if (sq.team === 0 && sq.alive > 0 && this.isBlocked(sq.home.x, sq.home.y)) { const [x, y] = this.spot(sq.home.x, sq.home.y); sq.home = { x, y }; if (sq.order.kind === 'hold') { sq.order.x = x; sq.order.y = y; } }
  }
  prepWave(o = {}) { this.setTerrain(o.terrain || 'open'); this.sky = o.sky || 'day'; }
  // 새 물결: [병종, 열, 줄, 옵션] 목록을 오른쪽 화면 밖에 세운다
  startWave(list, o = {}) {
    this.units = this.units.filter(u => !u.dead); this.squads = this.squads.filter(q => q.alive > 0);
    this.prepWave(o);
    this.foe = Object.assign({}, DEFAULT_FOE, o.foe || {}); this.waveOn = true; this.waveT = 0; this.waveLost = 0; this.waves++; this.waveLvl = o.lvl || 1;
    this.chase = o.chase || null; this.chaseN = 0;
    for (const [type, col, row, op] of list) { const p = spawnPos(col, row); if (UNITS[type].structure) p.x = VIEW.x1 - 80 - row * 34; this.addSquad(1, Object.assign({ type, x: p.x, y: p.y, lvl: o.lvl || 1 }, op || {})); }
    const md = this.mods; this.gain(WAVE_MORALE + md.startMorale); this.morale = Math.max(0, this.morale); this.free = md.freeFirst;
    // 척후를 미리 보냈다면: 사기를 더 얻고, 요괴는 허를 찔린 채 들어온다
    if (this.scout) { this.gain(this.scout.gain); this.expose = this.scout.expose / 100; this.scout = null; this.ev('text', { x: 640, y: 300, s: '척후의 보고 — 허를 찔렀다!', c: '#2f4d7e', big: true }); } else this.expose = 0;
    if (md.startShield) for (const u of this.units) if (u.team === 0 && !u.dead && !u.def.structure) { u.barrier = Math.max(u.barrier, md.startShield); u.barrierT = 30; }
    // 신선의 도술: 싸움마다 공격 패 한 장을 빚는다
    if (md.startCard) { const at = this.lootTable.filter(q => CARDS[q[0]].kind === 'attack'); if (at.length) this.gainCard(at[(this.rand() * at.length) | 0][0], undefined, undefined, 'craft'); }
    this.ev('waveStart');
  }
  // 본대: 정해진 때가 지나면 요괴 무리가 뒤에서 차례로 따라붙는다
  chaseLeft() { return this.chase && this.waveOn ? this.chase.at + this.chaseN * this.chase.every - this.waveT : Infinity; }
  pursue() {
    const c = this.chase; if (!c || this.chaseLeft() > 0) return;
    const type = c.types[(this.rand() * c.types.length) | 0], n = 1 + (this.chaseN >= 3 ? 1 : 0);
    for (let i = 0; i < n; i++) { const p = spawnPos((this.rand() * 6) | 0, i); const sq = this.addSquad(1, { type, x: p.x, y: p.y, lvl: this.waveLvl }); sq.chaser = true; }
    this.chaseN++; this.ev('chase', { n: this.chaseN });
  }
  // 진법: 전장에 선 부대 구성을 세어 켜고 끈다
  synergies() {
    const c = { inf: 0, rng: 0, cav: 0, heal: 0, beast: 0 };
    for (const q of this.squads) if (q.team === 0 && q.alive > 0 && !q.temp) { const k = SYN_CLASS(q.type); if (k) c[k]++; }
    this.synN = c;
    for (const sy of SYNERGIES) { const [n, need] = sy.n(c), on = n >= need; if (on !== !!this.syn[sy.id]) { this.syn[sy.id] = on; if (on) this.ev('synergy', { id: sy.id, name: sy.name, desc: sy.desc }); } }
  }
  repair(f) { for (const u of this.banner.units) if (!u.dead) u.hp = Math.min(u.maxHp, u.hp + u.maxHp * f); }
  bannerHp() { const u = this.banner.units[0]; return u && !u.dead ? u.hp / u.maxHp : 0; }
  // 군기 수레를 세운다. 쓰러진 뒤 다시 세울 때는 주변 요괴를 밀쳐 낸다
  raiseBanner(first) {
    this.banner = this.addSquad(0, { type: 'banner', x: BANNER_POS.x, y: BANNER_POS.y });
    if (first) return;
    for (const e of this.units) { if (e.dead || e.team !== 1) continue; const d = hyp(e.x - BANNER_POS.x, e.y - BANNER_POS.y); if (d > 420) continue; this.damage(e, 90 * this.power, null, 'aoe'); if (e.dead) continue; if (!e.def.structure) { e.stun = Math.max(e.stun, e.def.boss ? 1 : 2.5); if (!e.def.boss) e.x += (1 - d / 420) * 150 + 40; } }
    this.ev('impact', { x: BANNER_POS.x, y: BANNER_POS.y, r: 300, style: 'strike' });
  }
  // ───────── 행군 ─────────
  // 싸움이 끝나면 화면이 앞으로 나아간다: 앞서 나간 병사는 제자리에서 기다리고(화면에서는 뒤로 밀리고), 뒤처진 병사는 걸어서 따라붙는다
  beginMarch() {
    for (const sq of this.squads) { if (sq.team !== 0 || sq.alive <= 0 || sq.def.banner) continue; sq.home.x = clamp(sq.home.x, 130, sq.def.range > 0 || sq.def.heal ? 360 : 600); if (sq.order.kind !== 'auto') sq.order = { kind: 'hold', x: sq.home.x, y: sq.home.y }; for (const u of sq.units) { u.target = null; u.path = null; } }
  }
  march(dx, dt) {
    let ahead = 0;
    for (const u of this.units) {
      if (u.dead || u.team !== 0 || u.def.structure) continue; const sq = u.squad, tx = sq.home.x + u.slot.dx, ty = sq.home.y + u.slot.dy;
      if (u.x > tx + 1) { u.x = Math.max(tx, u.x - dx); u.waiting = true; ahead = Math.max(ahead, u.x - tx); } else { u.waiting = false; if (u.x < tx - 1) u.x = Math.min(tx, u.x + 70 * dt); }
      if (Math.abs(u.y - ty) > 1) u.y += clamp(ty - u.y, -50 * dt, 50 * dt);
      u.facing = 0; u.px = u.x; u.py = u.y;
    }
    for (const c of this.corpses) c.x -= dx; for (const z of this.zones) z.x -= dx;
    this.corpses = this.corpses.filter(c => c.x > -60); this.zones = this.zones.filter(z => z.x > -200);
    return ahead;
  }
  auras() {
    this.synergies();
    for (const u of this.units) { u.auraDmg = 0; u.auraHaste = 0; u.auraWard = 0; }
    // 삼족오가 떠 있으면 밤에도 해가 든다
    this.sun = false;
    for (const s of this.units) { if (s.dead) continue; if (s.def.sun && s.team === 0) this.sun = true; if (!s.def.aura) continue; const a = s.def.aura; this.near(s.x, s.y, a.r, o => { if (o.team === s.team && !o.dead && hyp(o.x - s.x, o.y - s.y) <= a.r) { if (a.dmg) o.auraDmg = a.dmg; if (a.haste && o !== s) o.auraHaste = a.haste; if (a.ward && o !== s) o.auraWard = Math.max(o.auraWard, a.ward); } }); }
  }
  atkSpeed(u) { let s = 1; if (u.haste > 0) s += 0.3; if (u.auraHaste) s += u.auraHaste; if (u.def.frenzy && u.hp < u.maxHp * 0.5) s += 0.5; if (u.team === 0) { if (u.def.range > 0) { s *= this.mods.rangedAS; if (this.syn.volley && !u.def.heal) s *= 1.15; } const um = this.mods.unit[u.type]; if (um && um.as) s *= um.as; } else s *= this.foe.as; return s; }
  updateOrders() {
    for (const sq of this.squads) {
      const o = sq.order; if (!sq.alive) continue;
      if (o.kind === 'focus' && (!o.target || o.target.alive <= 0)) sq.order = { kind: 'auto' };
      else if (o.kind === 'hold' && o.until !== undefined && this.time > o.until) sq.order = { kind: 'auto' };
      else if (o.kind === 'move') {
        if (o.wait && this.time < o.wait) { o.t0 = this.time; continue; }
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
    x = clamp(x, VIEW.x0 + 30, VIEW.x1 - 30); y = clamp(y, VIEW.y0 + 20, VIEW.y1 - 20); sq.home = { x, y };
    if (this.isBlocked(x, y)) { const c = this.freeCell((x / CELL) | 0, (y / CELL) | 0); if (c >= 0) { x = (c % NC + 0.5) * CELL; y = (((c / NC) | 0) + 0.5) * CELL; } }
    sq.order = { kind: 'move', x, y, t0: this.time }; for (const u of sq.units) { u.target = null; u.path = null; }
  }
  orderFocus(sq, target) { sq.order = { kind: 'focus', target }; for (const u of sq.units) { u.retarget = 0; u.path = null; } }
  orderAuto(sq) { sq.order = { kind: 'auto' }; for (const u of sq.units) u.retarget = 0; }
  orderHold(sq) { sq.home = { x: sq.cx, y: sq.cy }; sq.order = { kind: 'hold', x: sq.cx, y: sq.cy }; for (const u of sq.units) if (!u.dead) { u.slot.dx = u.x - sq.cx; u.slot.dy = u.y - sq.cy; u.target = null; } }
  squadNear(x, y, team, maxD) {
    let best = null, bd = maxD;
    for (const u of this.units) { if (u.dead || u.team !== team || u.hidden > 0) continue; const d = hyp(u.x - x, u.y - 14 - y) - u.r * 0.5; if (d < bd) { bd = d; best = u.squad; } }
    return best;
  }
  hero() { for (const u of this.units) if (!u.dead && u.def.hero && u.team === 0) return u; return null; }
  heroUnit(type) { for (const u of this.units) if (!u.dead && u.type === type && u.team === 0) return u; return null; }
  squadCount() { let n = 0; for (const q of this.squads) if (q.team === 0 && q.alive > 0 && !q.temp && !q.hero && !q.def.banner) n++; return n; }
  // 병력 패를 놓을 수 있는 오른쪽 한계 (요괴 전열 바로 앞까지)
  deployMaxX() { let m = 860; for (const e of this.units) if (!e.dead && e.team === 1 && e.hidden <= 0) m = Math.min(m, e.x - 150); return Math.max(260, m); }
  // ───────── 전술 패 ─────────
  costOf(c) {
    if (!c) return 99; if (c.free) return 0; const d = CARDS[c.id], k = Math.max(0, cardCost(c) - (c.id === 'horn' ? this.mods.hornCost : 0) - (d.hero ? this.mods.heroCost : 0));
    // 신선의 도술: 전술 패를 사기 1 덜 내고 쓴다 (1 아래로는 내려가지 않는다)
    return this.mods.tacDisc && !isUnit(c) && k > 1 ? Math.max(1, k - this.mods.tacDisc) : k;
  }
  // 못 쓰는 까닭: cap(부대 한도) / hero(영웅 없음) / morale(사기 부족)
  whyNot(i) {
    const c = this.hand[i]; if (!c || this.over) return 'none';
    const d = CARDS[c.id];
    if (d.kind === 'unit' && this.squadCount() >= this.cap) return 'cap';
    if (d.kind === 'lead' && this.heroUnit(d.unit)) return 'hero';
    if (d.hero && !this.heroUnit(d.hero)) return 'hero';
    return this.free > 0 || this.morale >= this.costOf(c) ? '' : 'morale';
  }
  canPlay(i) { return this.whyNot(i) === ''; }
  // 병력·영웅 패를 내면 그 자리에 부대가 선다. 전술 패는 쓰면 원정에서 사라진다
  deploy(c, x, y, quiet) {
    x = clamp(x, VIEW.x0 + 44, VIEW.x1 - 60); y = clamp(y, VIEW.y0 + 26, VIEW.y1 - 26);
    const sq = this.addSquad(0, { type: CARDS[c.id].unit, x, y, lvl: c.lv || 1, wpn: c.wpn }); sq.card = c;
    if (!quiet) { for (const u of sq.units) { u.stun = 0.3; u.cd = 0.5; } this.ev('appear', { x, y, summon: true, ally: true, r: 44 }); }
    return sq;
  }
  // 손패를 모두 버리고 새로 뽑는다 (사기 1)
  canRedraw() { return !this.over && this.morale >= 1 && this.hand.some(c => c) && this.drawPile.length > 0; }
  redraw() {
    if (!this.canRedraw()) return false; this.morale -= 1;
    for (let i = 0; i < HAND; i++) { if (this.hand[i]) this.drawPile.push(this.hand[i]); this.hand[i] = null; this.slotT[i] = 0.5 + i * 0.12; }
    this.shuffle(this.drawPile); this.ev('redraw'); return true;
  }
  spot(x, y) { if (this.isBlocked(x, y)) { const c = this.freeCell((x / CELL) | 0, (y / CELL) | 0); if (c >= 0) return [(c % NC + 0.5) * CELL, (((c / NC) | 0) + 0.5) * CELL]; } return [x, y]; }
  allies(x, y, r, fn) { for (const u of this.units) if (!u.dead && u.team === 0 && !u.def.structure && hyp(u.x - x, u.y - y) <= r + u.r) fn(u); }
  summon(type, x, y, n, life, P) {
    x = clamp(x, VIEW.x0 + 40, VIEW.x1 - 40); y = clamp(y, VIEW.y0 + 30, VIEW.y1 - 30);
    const sq = this.addSquad(0, { type, x, y, n, lvl: 1 }); sq.temp = true; sq.total = 0;
    for (const u of sq.units) { u.temp = true; u.life = life + this.mods.summonLife; u.hp = u.maxHp *= P; u.atk *= P; u.stun = 0.35; u.cd = 0.5; }
    this.ev('appear', { x, y, summon: true, ally: true, r: 44 });
    return sq;
  }
  play(i, x, y) {
    if (!this.canPlay(i)) return false;
    const c = this.hand[i], id = c.id, s = CARDS[id], v = cardVals(c), md = this.mods, P = this.power * md.cardPow, cost = this.costOf(c);
    x = clamp(x || 0, VIEW.x0, VIEW.x1); y = clamp(y || 0, VIEW.y0, VIEW.y1);
    if (this.free > 0) { this.free--; this.ev('text', { x: 640, y: 520, s: '공짜 패!', c: '#b8862a' }); }
    else { this.morale -= cost; if (cost > 0 && md.refund && this.rand() < md.refund) { this.morale = Math.min(this.moraleMax, this.morale + cost); this.ev('text', { x: 640, y: 520, s: '사기 환급!', c: '#b8862a' }); } }
    this.hand[i] = null; this.slotT[i] = REFILL * md.drawRate; this.played++;
    if (isUnit(c)) { x = Math.min(x, this.deployMaxX()); this.deploy(c, x, y); this.ev('cast', { id, x, y, r: 46, unit: true, slot: i }); return true; }
    // 전술 패는 쓰면 사라진다. 고승이 이끌면 지원 패만은 싸움이 끝난 뒤 돌아온다
    if (md.keepSupport && s.kind === 'support') this.rest.push(c); else { this.spent.push(c.uid); this.gone.add(c.uid); }
    const h = s.hero ? this.heroUnit(s.hero) : this.hero(), hm = h ? lvlMult(h.lvl) : 1;
    let r = s.r || 0;
    const wet = this.sky === 'rain'; let ex = null;
    if (id === 'sling') this.aoe(x, y, r, v.dmg * P, 1, null, { kb: 10 });
    else if (id === 'stakes') { x = clamp(x, VIEW.x0 + 60, VIEW.x1 - 60); y = clamp(y, VIEW.y0 + 44, VIEW.y1 - 44); const sq = this.addSquad(0, { type: 'stake', x: x - 5, y: y - 37.5, n: 1 }); sq.temp = true; sq.total = 0; for (let k = 1; k < 4; k++) this.spawn('stake', 0, x + (k % 2 ? 5 : -5), y + (k - 1.5) * 25, sq, 1, [0, 0]); for (const u of sq.units) { u.temp = true; u.life = v.life + this.mods.summonLife; u.hp = u.maxHp = v.hp * P; } }
    else if (id === 'scout') this.scout = { gain: v.gain, expose: v.expose };
    else if (id === 'torch') { this.torch = v.dur; this.torchRange = v.range / 100; }
    else if (id === 'rain') this.zones.push({ kind: 'rain', x, y, r, t: 0, dur: 2.0, acc: 0.25, dmg: v.tick * P * md.rainDmg, burn: md.rainBurn * P });
    else if (id === 'firerain') this.zones.push({ kind: 'rain', fire: true, x, y, r, t: 0, dur: 2.0, acc: 0.25, dmg: v.tick * P * md.rainDmg * (wet ? 0.7 : 1), burn: (v.burn + md.rainBurn * 0.5) * P });
    else if (id === 'thunder') {
      let best = null, bs = -1; for (const e of this.units) { if (e.dead || e.team !== 1 || e.hidden > 0) continue; const d = hyp(e.x - x, e.y - y); if (d > r + e.r) continue; if (e.hp > bs) { bs = e.hp; best = e; } }
      if (!best) { let bd = 190; for (const e of this.units) { if (e.dead || e.team !== 1 || e.hidden > 0) continue; const d = hyp(e.x - x, e.y - y); if (d < bd) { bd = d; best = e; } } }
      if (best) { x = best.x; y = best.y; this.damage(best, v.dmg * P * (wet ? 1.3 : 1), null, 'aoe'); if (!best.dead && !best.def.boss) best.stun = Math.max(best.stun, v.stun); }
      r = 40;
    } else if (id === 'volley') this.zones.push({ kind: 'tele', style: 'volley', ally: true, x, y, r, t: 0, delay: 1.4, hits: 1, dmg: v.dmg * P, stun: v.stun, kb: 18 });
    else if (id === 'caltrop') this.zones.push({ kind: 'caltrop', x, y, r, t: 0, dur: v.dur, acc: 0.4, slow: v.slow / 100, dmg: v.dps * 0.5 * P });
    else if (id === 'heal') this.allies(x, y, r, u => { const a = Math.min(u.maxHp - u.hp, u.maxHp * v.heal / 100); if (a > 0.5) { u.hp += a; this.ev('heal', { x: u.x, y: u.y, amt: a, team: 0, quiet: true }); } });
    else if (id === 'grail') { r *= md.grailR; this.zones.push({ kind: 'grail', x, y, r, t: 0, dur: 3.1, acc: 0.5, heal: v.heal / 100 / 6 * md.grailHeal }); }
    else if (id === 'wall') this.allies(x, y, r, u => { u.guard = v.dur; u.guardAmt = v.guard / 100; });
    else if (id === 'horn') { for (const u of this.units) if (!u.dead && u.team === 0) { u.haste = v.dur + md.hornDur; if (u.def.charge) u.run = 999; } }
    else if (id === 'cry') this.allies(x, y, r, u => { u.dmgUp = v.dur; u.dmgUpAmt = v.dmg / 100; });
    else if (id === 'ambush') this.summon('sword', x, y, v.n, v.life, P);
    else if (id === 'archers') this.summon('xbow', x, y, v.n, v.life, P);
    else if (id === 'decoy') { const sq = this.summon('decoy', x, y, 1, v.life, 1); for (const u of sq.units) { u.hp = u.maxHp = v.hp * P; u.taunt = r; u.stun = 0; } }
    else if (id === 'strike') { h.jump = { sx: h.x, sy: h.y, tx: x, ty: y, t: 0, dur: 0.42, dmg: v.dmg * hm, r, stun: v.stun }; h.swing = 0; h.target = null; }
    else if (id === 'order') { x = h.x; y = h.y; r = 150; this.allies(x, y, r, u => { u.haste = Math.max(u.haste, v.dur); u.dmgUp = Math.max(u.dmgUp, v.dur); u.dmgUpAmt = Math.max(u.dmgUpAmt, 0.2); }); }
    else if (id === 'sanctuary') this.allies(x, y, r, u => { u.barrier = v.barrier * hm; u.barrierT = 7; u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.15); u.root = 0; u.weaken = 0; u.slow = 0; });
    else if (id === 'sutra') { for (const u of this.units) if (!u.dead && u.team === 0 && !u.def.structure) { u.root = 0; u.weaken = 0; u.burn = 0; u.slow = 0; u.stun = 0; u.regen = v.dur; u.regenAmt = v.regen / 100; } }
    else if (id === 'meteor') this.zones.push({ kind: 'tele', style: 'meteor', ally: true, x, y, r, t: 0, delay: 1.1, hits: 1, dmg: v.dmg * hm * (wet ? 0.7 : 1), burn: 4, burnDmg: 20 * hm, kb: 20, src: h });
    else if (id === 'blink') {
      const moved = new Set();
      this.allies(x, y, r, u => { if (u.jump || u.temp && u.def.decoy) return; const fx = u.x, fy = u.y, nx = Math.max(VIEW.x0 + 60, u.x - 200); u.x = nx; u.px = nx; u.path = null; u.target = null; u.retarget = 0.6; u.root = 0; u.hp = Math.min(u.maxHp, u.hp + u.maxHp * v.heal / 100); moved.add(u.squad); this.ev('blink', { x: fx, y: fy, tx: nx, ty: u.y }); });
      for (const sq of moved) { const o = sq.order; if (o.kind === 'hold' || o.kind === 'move') { o.x = Math.max(VIEW.x0 + 60, o.x - 200); o.path = null; sq.home.x = o.x; } }
    }
    else if (id === 'flash') { const sx = h.x, sy = h.y; for (const e of this.foesOnLine(sx, sy, x, y, 34)) { this.damage(e, v.dmg * hm, h, 'aoe'); if (!e.dead) { e.mark = Math.max(e.mark, 5); e.markAmt = Math.max(e.markAmt, v.mark / 100); } } this.warp(h, x, y); x = h.x; y = h.y; ex = { sx, sy }; }
    else if (id === 'veil') { h.guard = Math.max(h.guard, v.dur); h.guardAmt = 1; h.haste = Math.max(h.haste, v.dur); x = h.x; y = h.y; r = 44; }
    else if (id === 'mark') { for (const e of this.foesIn(x, y, r)) { e.mark = Math.max(e.mark, v.dur); e.markAmt = Math.max(e.markAmt, v.amt / 100); } }
    else if (id === 'snare') this.aoe(x, y, r, v.dmg * hm, 1, h, { root: v.root, slow: 0.3, slowT: v.root });
    else if (id === 'pangut') { for (let k = 0; k < HAND; k++) { if (this.hand[k]) this.drawPile.push(this.hand[k]); this.hand[k] = null; this.slotT[k] = 0.4 + k * 0.1; } this.shuffle(this.drawPile); this.free += v.free; x = h.x; y = h.y; r = 120; }
    else if (id === 'deong') { for (const e of this.units) { if (e.dead || e.team !== 1 || e.x > VIEW.x1 + 6) continue; if (e.def.boss) { e.slow = Math.max(e.slow, v.stun + 1.5); e.slowAmt = 0.3; } else e.stun = Math.max(e.stun, v.stun); } for (const a of this.units) if (!a.dead && a.team === 0 && !a.def.structure) a.haste = Math.max(a.haste, v.dur); x = h.x; y = h.y; r = 300; }
    else if (id === 'bulwark') { h.guard = Math.max(h.guard, v.dur); h.guardAmt = v.guard / 100; h.taunt = 260; h.tauntT = v.dur; x = h.x; y = h.y; r = 130; }
    else if (id === 'raid') this.summon('berserk', x, y, v.n, v.life, P);
    this.ev('cast', Object.assign({ id, x, y, r, up: c.up, slot: i }, ex));
    return true;
  }

  // ───────── 영웅의 고유기 (자동) ─────────
  // 선분 위에서 너비 w 안에 든 적
  foesOnLine(x0, y0, x1, y1, w) { const dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1, out = []; for (const e of this.units) { if (e.dead || e.team !== 1 || e.hidden > 0 || e.jump || e.x > VIEW.x1 + 6) continue; const t = clamp(((e.x - x0) * dx + (e.y - y0) * dy) / L2, 0, 1); if (hyp(e.x - x0 - dx * t, e.y - y0 - dy * t) <= w + e.r) out.push(e); } return out; }
  // 한달음에 자리를 옮긴다
  warp(u, x, y) { [x, y] = this.spot(clamp(x, VIEW.x0 + 30, VIEW.x1 - 30), clamp(y, VIEW.y0 + 20, VIEW.y1 - 20)); this.ev('blink', { x: u.x, y: u.y, tx: x, ty: y }); u.x = x; u.y = y; u.px = x; u.py = y; u.path = null; u.target = null; u.retarget = 0; u.root = 0; }
  foesIn(x, y, r) { const out = []; for (const e of this.units) if (!e.dead && e.team === 1 && e.hidden <= 0 && !e.jump && e.x < VIEW.x1 + 6 && hyp(e.x - x, e.y - y) <= r + e.r) out.push(e); return out; }
  densest(list, rad) { let best = null, bs = -1; for (const e of list) { const s = this.clusterScore(e, rad) + (e.def.boss ? 3 : e.def.large ? 1 : 0); if (s > bs) { bs = s; best = e; } } return best; }
  heroAuto(u) {
    const sk = HERO_SKILLS[u.type][u.skillI], id = sk.id, hm = lvlMult(u.lvl) * this.mods.heroAtk, near = this.foesIn(u.x, u.y, 340);
    let tx = u.x, ty = u.y, pts = null;
    if (id === 'whirl') { if (!this.foesIn(u.x, u.y, 96).length) return false; this.aoe(u.x, u.y, 92, 125 * hm, 1, u, { kb: 18 }); }
    else if (id === 'roar') { if (!this.foesIn(u.x, u.y, 170).length) return false; for (const e of this.foesIn(u.x, u.y, 170)) e.weaken = Math.max(e.weaken, 6); this.allies(u.x, u.y, 170, a => { a.dmgUp = Math.max(a.dmgUp, 6); a.dmgUpAmt = Math.max(a.dmgUpAmt, 0.2); }); }
    else if (id === 'leap') { const t = this.densest(near, 80); if (!t) return false; [tx, ty] = this.spot(t.x, t.y); u.jump = { sx: u.x, sy: u.y, tx, ty, t: 0, dur: 0.42, dmg: 190 * hm, r: 82, stun: 1.2 }; u.swing = 0; u.target = null; }
    else if (id === 'wave') { let hurt = 0; this.allies(u.x, u.y, 240, a => { if (a.hp < a.maxHp * 0.9) hurt++; }); if (hurt < 2) return false; this.allies(u.x, u.y, 240, a => { const h = Math.min(a.maxHp - a.hp, a.maxHp * 0.16 * hm); if (h > 0.5) { a.hp += h; this.ev('heal', { x: a.x, y: a.y, amt: h, team: 0, quiet: true }); } }); }
    else if (id === 'ward') { if (!this.foesIn(u.x, u.y, 420).length) return false; this.allies(u.x, u.y, 200, a => { a.barrier = Math.max(a.barrier, 80 * hm); a.barrierT = 6; }); }
    else if (id === 'smite') { const t = this.densest(near, 90); if (!t) return false; tx = t.x; ty = t.y; for (const e of this.foesIn(tx, ty, 92)) { this.damage(e, 105 * hm * (e.def.revive || e.def.raise ? 1.5 : 1), u, 'aoe'); if (!e.dead && !e.def.boss) e.stun = Math.max(e.stun, 1); } }
    else if (id === 'chain') { let cur = null, bd = 1e9; for (const e of near) { const d = hyp(e.x - u.x, e.y - u.y); if (d < bd) { bd = d; cur = e; } } if (!cur) return false; pts = [u.x, u.y - 40]; const hit = new Set(), rain = this.sky === 'rain' ? 1.3 : 1; for (let k = 0; k < 5 && cur; k++) { hit.add(cur); pts.push(cur.x, cur.y - 14); this.damage(cur, 88 * hm * rain * Math.pow(0.86, k), u, 'aoe'); let nx = null; bd = 150; for (const e of this.foesIn(cur.x, cur.y, 150)) { if (hit.has(e)) continue; const d = hyp(e.x - cur.x, e.y - cur.y); if (d < bd) { bd = d; nx = e; } } cur = nx; } }
    else if (id === 'frost') { const t = this.densest(near, 100); if (!t) return false; tx = t.x; ty = t.y; this.zones.push({ kind: 'caltrop', ice: true, x: tx, y: ty, r: 108, t: 0, dur: 6, acc: 0.4, slow: 0.45, dmg: 7 * hm }); }
    else if (id === 'fire') { const t = this.densest(near, 90); if (!t) return false; tx = t.x; ty = t.y; this.zones.push({ kind: 'tele', style: 'meteor', ally: true, x: tx, y: ty, r: 90, t: 0, delay: 0.9, hits: 1, dmg: 250 * hm * (this.sky === 'rain' ? 0.7 : 1), burn: 4, burnDmg: 18 * hm, kb: 18, src: u }); }
    else if (id === 'dash') { const t = this.densest(near, 80); if (!t) return false; const d = hyp(t.x - u.x, t.y - u.y) || 1, sx = u.x, sy = u.y, ex = t.x + (t.x - u.x) / d * 56, ey = t.y + (t.y - u.y) / d * 56; for (const e of this.foesOnLine(sx, sy, ex, ey, 30)) this.damage(e, 120 * hm, u, 'aoe'); this.warp(u, ex, ey); tx = u.x; ty = u.y; pts = [sx, sy, tx, ty]; }
    else if (id === 'flurry') { const fs = this.foesIn(u.x, u.y, 96); if (!fs.length) return false; pts = []; for (let k = 0; k < 6; k++) { const live = fs.filter(e => !e.dead); if (!live.length) break; const e = live[k % live.length]; pts.push(e.x, e.y); this.damage(e, 50 * hm, u, 'aoe'); } }
    else if (id === 'shadow') { let t = null, bs = -1e9; for (const e of near) { const sc = (e.def.soft ? 300 : 0) - e.hp / e.maxHp * 100 - hyp(e.x - u.x, e.y - u.y) * 0.1 - (e.def.boss ? 150 : 0); if (sc > bs) { bs = sc; t = e; } } if (!t) return false; this.warp(u, t.x + t.r + u.r + 2, t.y); tx = t.x; ty = t.y; this.damage(t, 235 * hm, u, 'aoe'); if (!t.dead && !t.def.boss) t.stun = Math.max(t.stun, 1.2); u.target = t.dead ? null : t; }
    else if (id === 'pierce') { const t = this.densest(this.foesIn(u.x, u.y, 520), 80); if (!t) return false; const d = hyp(t.x - u.x, t.y - u.y) || 1, ex = u.x + (t.x - u.x) / d * 600, ey = u.y + (t.y - u.y) / d * 600; for (const e of this.foesOnLine(u.x, u.y, ex, ey, 22)) this.damage(e, 125 * hm, u, 'aoe'); tx = ex; ty = ey; pts = [u.x, u.y - 30, ex, ey - 30]; }
    else if (id === 'burst') { const fs = this.foesIn(u.x, u.y, 440).sort((a, b) => hyp(a.x - u.x, a.y - u.y) - hyp(b.x - u.x, b.y - u.y)).slice(0, 6); if (!fs.length) return false; pts = []; for (const e of fs) { pts.push(e.x, e.y); this.damage(e, 64 * hm, u, 'aoe'); } }
    else if (id === 'snipe') { let t = null, bs = -1; for (const e of this.foesIn(u.x, u.y, 600)) { const sc = e.def.boss ? 1e7 : e.maxHp; if (sc > bs) { bs = sc; t = e; } } if (!t) return false; tx = t.x; ty = t.y; pts = [u.x, u.y - 30, t.x, t.y - 16]; this.damage(t, 320 * hm, u, 'aoe'); if (!t.dead && !t.def.boss) t.stun = Math.max(t.stun, 1.5); }
    else if (id === 'jajin') { if (!this.foesIn(u.x, u.y, 460).length) return false; this.allies(u.x, u.y, 240, a => { a.haste = Math.max(a.haste, 7); }); }
    else if (id === 'sinmyeong') { this.gain(1.5, u.x, u.y - 40); this.allies(u.x, u.y, 240, a => { const h = Math.min(a.maxHp - a.hp, a.maxHp * 0.1 * hm); if (h > 0.5) { a.hp += h; this.ev('heal', { x: a.x, y: a.y, amt: h, team: 0, quiet: true }); } }); }
    else if (id === 'hwimori') { const fs = this.foesIn(u.x, u.y, 215); if (!fs.length) return false; for (const e of fs) { this.damage(e, 34 * hm, u, 'aoe'); if (e.dead) continue; if (e.def.boss) { e.slow = Math.max(e.slow, 2.5); e.slowAmt = 0.25; } else e.stun = Math.max(e.stun, 1.8); } }
    else if (id === 'quake') { if (!this.foesIn(u.x, u.y, 100).length) return false; this.aoe(u.x, u.y, 104, 118 * hm, 1, u, { slow: 0.45, slowT: 3, kb: 10 }); }
    else if (id === 'provoke') { if (!this.foesIn(u.x, u.y, 240).length) return false; u.taunt = 240; u.tauntT = 5; u.guard = Math.max(u.guard, 5); u.guardAmt = Math.max(u.guardAmt, 0.5); }
    else if (id === 'throw') { let t = null, bs = -1; for (const e of this.foesIn(u.x, u.y, u.r + 34)) { const sc = e.def.boss ? 1 : e.maxHp + 10; if (sc > bs) { bs = sc; t = e; } } if (!t) return false; tx = t.x; ty = t.y; this.damage(t, 215 * hm, u, 'aoe'); if (!t.dead && !t.def.boss && !t.def.structure) { const nx = Math.min(VIEW.x1 - 24, t.x + (t.def.large ? 50 : 140)); this.ev('blink', { x: t.x, y: t.y, tx: nx, ty: t.y }); t.x = nx; t.px = nx; t.path = null; t.stun = Math.max(t.stun, 2); this.aoe(nx, t.y, 50, 60 * hm, 1, u, {}); tx = nx; } }
    u.atkT = this.time; this.ev('heroSkill', { hero: u.type, id, name: sk.name, x: u.x, y: u.y, tx, ty, pts });
    return true;
  }
  // 영웅 둘이 함께 싸우면 합동기 기력이 찬다
  heroPair() { const hs = []; for (const u of this.units) if (!u.dead && u.team === 0 && u.def.hero && !hs.some(h => h.type === u.type)) hs.push(u); if (hs.length < 2) return null; hs.sort((a, b) => a.type < b.type ? -1 : 1); return { key: hs[0].type + '+' + hs[1].type, a: hs[0], b: hs[1] }; }
  comboTick(dt) {
    const p = this.heroPair(); if (!p || !COMBOS[p.key]) { this.combo = Math.max(0, this.combo - dt * 0.05); return; }
    this.combo += dt / COMBO_TIME; if (this.combo < 1) return;
    const foes = this.foesIn(640, 340, 1400); if (!foes.length) return;
    this.combo = 0; const c = COMBOS[p.key], hm = (lvlMult(p.a.lvl) + lvlMult(p.b.lvl)) / 2 * this.mods.heroAtk;
    const all = fn => { for (const a of this.units) if (!a.dead && a.team === 0 && !a.def.structure) fn(a); }, mend = (a, k) => { const h = Math.min(a.maxHp - a.hp, a.maxHp * k); if (h > 0.5) { a.hp += h; this.ev('heal', { x: a.x, y: a.y, amt: h, team: 0, quiet: true }); } };
    for (const part of c.parts) {
      const who = p.a.type === part ? p.a : p.b, live = foes.filter(e => !e.dead);
      if (part === 'commander') all(a => { a.haste = Math.max(a.haste, 8); a.dmgUp = Math.max(a.dmgUp, 8); a.dmgUpAmt = Math.max(a.dmgUpAmt, 0.25); if (a.def.charge) a.run = 999; });
      else if (part === 'bishop') all(a => { a.barrier = Math.max(a.barrier, 70 * hm); a.barrierT = 8; mend(a, 0.12); });
      else if (part === 'archmage') { const pts = []; this.shuffle(live).slice(0, 6).forEach(e => { pts.push([e.x, e.y]); this.damage(e, 135 * hm * (this.sky === 'rain' ? 1.3 : 1), who, 'aoe'); if (!e.dead && !e.def.boss) e.stun = Math.max(e.stun, 1.3); }); this.ev('comboFx', { pts }); }
      else if (part === 'blade') { const pts = []; live.sort((a, b) => b.hp - a.hp).slice(0, 3).forEach(e => { pts.push([e.x, e.y]); this.damage(e, 260 * hm, who, 'aoe'); }); this.ev('comboFx', { pts, style: 'slash' }); }
      else if (part === 'hunter') { const pts = []; for (const e of live) { pts.push([e.x, e.y]); this.damage(e, 62 * hm, who, 'aoe'); if (!e.dead) { e.slow = Math.max(e.slow, 3); e.slowAmt = e.def.boss ? 0.15 : 0.3; } } this.ev('comboFx', { pts, style: 'arrow' }); }
      else if (part === 'sangsoe') { this.gain(2, who.x, who.y - 40); all(a => mend(a, 0.08)); }
      else if (part === 'chief') all(a => { a.guard = Math.max(a.guard, 8); a.guardAmt = Math.max(a.guardAmt, 0.35); });
    }
    this.ev('combo', { id: c.id, name: c.name, ax: p.a.x, ay: p.a.y, bx: p.b.x, by: p.b.y });
  }

  // ───────── 유닛 AI ─────────
  think(u, dt) {
    const def = u.def, sq = u.squad;
    if (u.flash > 0) u.flash -= dt * 5;
    if (u.team === 1 && this.foe.regen && u.hp < u.maxHp) u.hp = Math.min(u.maxHp, u.hp + u.maxHp * this.foe.regen * dt);
    if (u.haste > 0) u.haste -= dt; if (u.weaken > 0) u.weaken -= dt; if (u.root > 0) u.root -= dt; if (u.rage > 0) u.rage -= dt;
    if (u.slow > 0) u.slow -= dt; if (u.guard > 0) u.guard -= dt; if (u.dmgUp > 0) u.dmgUp -= dt; if (u.mark > 0) u.mark -= dt;
    if (u.tauntT > 0) { u.tauntT -= dt; if (u.tauntT <= 0) u.taunt = def.taunt || 0; }
    if (u.regen > 0) { u.regen -= dt; u.hp = Math.min(u.maxHp, u.hp + u.maxHp * u.regenAmt * dt); }
    if (u.temp) { u.life -= dt; if (u.life <= 0) { this.ev('vanish', { x: u.x, y: u.y, ally: true }); this.kill(u, null, true); return; } if (u.def.decoy) { u.moving = false; return; } }
    if (u.barrierT > 0) { u.barrierT -= dt; if (u.barrierT <= 0) u.barrier = 0; }
    if (u.burn > 0 && def.fireproof) u.burn = 0;
    // 그슨대: 살려 둘수록 커지고 세진다
    if (def.grow && this.waveOn && u.x < VIEW.x1 && (u.grown || 0) < def.grow.max) { u.growT = (u.growT || 0) + dt; if (u.growT >= def.grow.every) { u.growT = 0; u.grown = (u.grown || 0) + 1; u.atk *= 1 + def.grow.atk; const add = u.maxHp * def.grow.hp; u.maxHp += add; u.hp += add; this.ev('grow', { x: u.x, y: u.y, n: u.grown }); } }
    if (u.burn > 0) { u.burn -= dt; u.burnAcc += dt; if (u.burnAcc >= 0.5) { u.burnAcc -= 0.5; this.damage(u, u.burnDmg * 0.5, null, 'burn'); if (u.dead) return; } }
    if (u.jump) { this.doJump(u, dt); return; }
    if (u.hidden > 0) { u.hidden -= dt; if (u.hidden <= 0) this.finishLeap(u); return; }
    if (u.stun > 0) { u.stun -= dt; u.moving = false; u.run = 0; return; }
    if (def.structure && !def.lob && !def.atk) { u.moving = false; return; }
    const as = this.atkSpeed(u);
    u.cd -= dt * as;
    if (u.cast > 0) { u.cast -= dt; u.moving = false; return; }
    if (u.swing > 0) { u.swing -= dt * as; u.moving = false; if (u.swing <= 0) this.resolveAttack(u); return; }
    if (u.abils) this.bossAbilities(u, dt);
    if (def.raise) this.necroRaise(u, dt);
    if (def.hero && u.team === 0 && this.waveOn) { u.gauge += dt * GAUGE_RATE * (this.mods.heroGauge || 1); if (u.gauge >= 1 && this.heroAuto(u)) { u.gauge = 0; u.skillI = (u.skillI + 1) % HERO_SKILLS[u.type].length; return; } }
    if (def.lob) { this.catapultAI(u); return; }
    if (def.bomber) { this.bomberAI(u, dt); return; }
    if (def.leap) { u.leapCd -= dt; if (u.leapCd <= 0 && this.tryLeap(u)) return; }
    // 요괴는 먼저 화면 안으로 걸어 들어온다 (치유·지원 요괴가 밖에 남아 싸움이 끝나지 않는 일을 막는다)
    if (u.team === 1 && u.x > VIEW.x1 - 24 && !def.structure && sq.order.kind !== 'move') { this.moveTo(u, VIEW.x1 - 110, u.y, dt); return; }
    const o = sq.order;
    u.retarget -= dt;
    if (u.retarget <= 0 || (u.target && (u.target.dead || u.target.hidden > 0))) { u.retarget = 0.3 + this.rand() * 0.15; u.target = def.heal ? this.pickHeal(u, o) : this.pickTarget(u, o); }
    if (o.kind === 'move' && o.wait && this.time < o.wait) { u.moving = false; return; }
    if (o.kind === 'move') {
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
    this.face(u, e ? Math.atan2(e.y - u.y, e.x - u.x) : (u.team === 0 ? 0 : PI), dt, 6);
  }
  toSlot(u, o, dt) { const gx = o.x + u.slot.dx, gy = o.y + u.slot.dy; if (hyp(gx - u.x, gy - u.y) > 6) this.moveTo(u, gx, gy, dt); else this.idle(u, dt); }
  face(u, a, dt, rate) { const d = angDiff(u.facing, a), m = rate * dt; u.facing += Math.abs(d) < m ? d : Math.sign(d) * m; }
  // 밤에는 망령과 도깨비불이 힘을 얻는다 (횃불이 켜져 있으면 아니다)
  nightFoe(u) { return this.sky === 'night' && this.torch <= 0 && !this.sun && u.team === 1 && (u.def.revive || u.def.raise || u.def.bomber || u.type === 'skelking'); }
  rangeOf(u) { const def = u.def; if (!(def.range > 0)) return 5 + (def.reach || 0); if (u.team !== 0) return def.range; const um = this.mods.unit[u.type]; return def.range * (def.heal ? 1 : this.mods.rangeMul * (this.torch > 0 ? 1 + this.torchRange : this.sky === 'night' && !this.sun ? 0.88 : 1)) * (um && um.range || 1); }
  engage(u, t, dt, o) {
    const def = u.def, dx = t.x - u.x, dy = t.y - u.y, d = hyp(dx, dy), gap = d - u.r - t.r, rng = this.rangeOf(u);
    // 요괴는 화면 안으로 들어온 뒤에야 싸운다
    if (u.team === 1 && u.x > VIEW.x1 - 14 && !def.structure) { this.moveTo(u, VIEW.x1 - 70, u.y, dt); return; }
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
      if (e.team === 1 && e.x > VIEW.x1 + 6) continue;
      const d = hyp(e.x - u.x, e.y - u.y) - e.r - u.r;
      if (hold) { if (melee) { if (hyp(e.x - sx, e.y - sy) > 105 + e.r) continue; } else if (d > rng) continue; }
      let s = d;
      if (melee) s += e.eng * 9;
      if (def.prefer === 'soft' && e.def.soft) s -= 120;
      if (def.antiCav && (e.def.mounted || e.def.large)) s -= 50;
      if (def.range > 0 && e.def.shield) s += 45;
      if (def.minRange && d + e.r + u.r < def.minRange) s += 500;
      if (e.taunt) { if (d < e.taunt) s -= 400; } else if (e.def.banner) s += 70; else if (e.def.stake) s += d < 26 ? -50 : 90; else if (melee && e.def.structure) s += 40;
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
          u.cd = def.as; u.atkT = this.time; this.heal(u, t); if (def.hero) u.gauge += 0.04;
          if (def.healN > 1) { const done = [t]; for (let k = 1; k < def.healN; k++) { let b = null, bs = 0.97; for (const e of this.units) if (!e.dead && e.team === u.team && !e.def.structure && !done.includes(e) && hyp(e.x - u.x, e.y - u.y) <= def.range + e.r && e.hp / e.maxHp < bs) { bs = e.hp / e.maxHp; b = e; } if (!b) break; done.push(b); this.heal(u, b); } }
        }
        return;
      }
      if (o.kind !== 'hold') { this.moveTo(u, t.x, t.y, dt); return; }
    }
    if (o.kind === 'hold') { this.toSlot(u, o, dt); return; }
    // 가장 가까운 전투 병력을 뒤따른다
    let a = null, bd = 1e9; for (const e of this.units) { if (e.dead || e.team !== u.team || e.def.support || e.def.structure) continue; const d = hyp(e.x - u.x, e.y - u.y); if (d < bd) { bd = d; a = e; } }
    if (a) { const gx = a.x + (u.team === 0 ? -74 : 74); if (hyp(gx - u.x, a.y - u.y) > 34) { this.moveTo(u, gx, a.y + u.slot.dy, dt); return; } }
    this.idle(u, dt);
  }
  heal(u, t) { const amt = u.healAmt * (u.team === 0 ? this.mods.priestHeal * (this.syn.rite ? 1.25 : 1) : 1); t.hp = Math.min(t.maxHp, t.hp + amt);
    if (u.def.healCleanse) { t.root = 0; t.weaken = 0; t.burn = 0; t.slow = 0; if (t.barrier < u.def.healCleanse * lvlMult(u.lvl)) { t.barrier = u.def.healCleanse * lvlMult(u.lvl); t.barrierT = Math.max(t.barrierT, 5); } }
    this.ev('heal', { x: t.x, y: t.y, fx: u.x, fy: u.y, amt, team: u.team }); }

  moveTo(u, gx, gy, dt) {
    if (u.root > 0 || u.def.structure) { u.moving = false; return; }
    let spd = u.def.spd * (u.team === 1 ? this.foe.spd * (this.nightFoe(u) ? 1.2 : 1) : 1); if (u.haste > 0) spd *= 1.35; if (u.slow > 0) spd *= 1 - u.slowAmt;
    if (u.team === 0 && this.mods.vanguard && this.waveOn && this.waveT < 10) spd *= 1.3;
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
    const def = u.def; u.atkT = this.time; u.cd = def.as; if (def.hero && u.team === 0) u.gauge += 0.03;
    if (this.sky === 'rain' && def.proj === 'bullet' && this.rand() < 0.34) { this.ev('text', { x: u.x, y: u.y - 50, s: '불발!', c: '#4f6f8f' }); return; }
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
    const mult = c.mult * (u.team === 0 ? this.mods.chargeMult * (this.syn.cav ? 1.25 : 1) : 1);
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
    this.damage(t, u.atk, u, 'melee'); this.onHit(u, t);
    this.ev('melee', { x: (t.x + u.x) / 2, y: (t.y + u.y) / 2 - 12, big: !!def.splash || !!def.cleave, team: u.team });
    if (def.cleave) { const um = u.team === 0 ? this.mods.unit[u.type] : null; let n = def.cleave - 1 + (um && um.cleave || 0); this.near(t.x, t.y, 44, e => { if (n > 0 && e !== t && e.team !== u.team && !e.dead && hyp(e.x - u.x, e.y - u.y) < u.r + e.r + 26) { n--; this.damage(e, u.atk * 0.8, u, 'melee'); } }); }
    if (def.splash) this.near(t.x, t.y, def.splash + 16, e => { if (e !== t && e.team !== u.team && !e.dead && hyp(e.x - t.x, e.y - t.y) < def.splash + e.r) this.damage(e, u.atk * 0.5, u, 'aoe'); });
  }
  // 무기에 붙은 타격 효과
  onHit(u, t) {
    const d = u.def; if (t.dead) return;
    if (d.stunHit && !t.def.boss && !t.def.structure && this.rand() < d.stunHit.p) t.stun = Math.max(t.stun, d.stunHit.t * (t.def.hero ? 0.5 : 1));
    if (d.burnHit) { t.burn = Math.max(t.burn, d.burnHit.t); t.burnDmg = Math.max(t.burnDmg, u.atk * d.burnHit.k); }
    if (d.slowHit) { t.slow = Math.max(t.slow, d.slowHit.t); t.slowAmt = d.slowHit.amt * (t.def.boss ? 0.5 : 1); }
    // 야광귀: 때릴 때마다 사기를 훔쳐 간다
    if (d.steal && u.team === 1 && t.team === 0 && this.morale > 0) { this.morale = Math.max(0, this.morale - d.steal); this.ev('steal', { x: t.x, y: t.y, n: d.steal }); }
  }
  fire(u, t) {
    const k = u.def.proj;
    if (u.def.aoe > 0 && (k === 'fireball' || k === 'shell' || k === 'iceball')) {
      const d = hyp(t.x - u.x, t.y - u.y); const dur = Math.max(0.35, Math.min(1.5, d / (k === 'shell' ? 400 : 330)));
      const lead = t.moving ? 0.55 * dur : 0;
      this.proj.push({ kind: k, lob: true, x: u.x, y: u.y, sx: u.x, sy: u.y, tx: t.x + t.vx * lead, ty: t.y + t.vy * lead, t: 0, dur, dmg: u.atk, aoe: u.def.aoe * (u.team === 0 ? this.mods.aoeR : 1), team: u.team, src: u, slow: u.def.slowHit });
    } else this.proj.push({ kind: k, x: u.x, y: u.y - 12, ox: u.x, oy: u.y, target: t, tx: t.x, ty: t.y - 12, spd: k === 'bullet' ? 1250 : k === 'spark' ? 900 : k === 'bolt' || k === 'firearrow' ? 640 : 520, dmg: u.atk, team: u.team, src: u });
    this.ev('shoot', { kind: k, x: u.x, y: u.y, team: u.team });
  }
  damage(t, amt, src, kind, ox, oy) {
    if (t.dead || t.jump) return 0;
    if (t.def.dodge && src && (kind === 'melee' || kind === 'proj') && this.rand() < t.def.dodge) { this.ev('hit', { x: t.x, y: t.y, amt: 0, block: true, dodge: true, team: t.team, kind }); return 0; }
    let mult = 1, flank = false, block = false;
    if (src && (kind === 'melee' || kind === 'proj')) {
      const ax = (ox === undefined ? src.x : ox) - t.x, ay = (oy === undefined ? src.y : oy) - t.y, al = hyp(ax, ay) || 1;
      const dot = (Math.cos(t.facing) * ax + Math.sin(t.facing) * ay) / al;
      if (dot < -0.3 && !t.def.structure) {
        flank = true; mult *= src.team === 0 ? this.mods.flank : 1.4;
        if (t.def.boss) mult = 1 + (mult - 1) * 0.5;
        if (src.stab) { mult *= src.def.backstab / 1.4; src.stab = false; }
      } else if (t.def.shield && dot > 0.1 && !src.def.pierce) { const tm = t.team === 0 ? this.mods.unit[t.type] : null; mult *= kind === 'proj' ? 0.3 : 0.75 - (tm && tm.block || 0); block = kind === 'proj'; }
      if (src.def.antiCav) { if (t.def.mounted) mult *= 2; else if (t.def.large) mult *= 1.5; }
      if (t.def.armor && kind === 'melee') mult *= 1 - t.def.armor;
      // 삽살개: 망령과 저승 요괴를 쫓는다
      if (src.def.bane && (t.def.revive || t.def.raise || t.summoned || t.type === 'skelking' || t.type === 'geuseun')) mult *= src.def.bane;
    }
    if (src) {
      if (src.weaken > 0) mult *= 0.7; if (src.auraDmg) mult *= 1 + src.auraDmg; if (src.rage > 0) mult *= 1.25; if (src.dmgUp > 0) mult *= 1 + src.dmgUpAmt;
      if (src.team === 0 && this.syn.three) mult *= 1.08; if (src.team === 0 && this.syn.spirit && src.def.beast) mult *= 1.15; if (this.nightFoe(src)) mult *= 1.2;
      if (this.sky === 'rain') { const pj = src.def.proj; if (pj === 'fireball' || pj === 'shell' || pj === 'firearrow' || pj === 'sunfire') mult *= 0.7; else if (pj === 'spark') mult *= 1.3; }
      if (src.team === 0) { const md = this.mods; if (md.lastStand && src.squad.alive <= src.squad.total / 2) mult *= 1 + md.lastStand; if (md.vanguard && this.waveOn && this.waveT < 10) mult *= 1.15; }
    }
    let d = amt * mult; if (t.guard > 0) d *= 1 - t.guardAmt; if (t.mark > 0) d *= 1 + t.markAmt; if (t.auraWard) d *= 1 - t.auraWard;
    // 불가사리: 쇠붙이(칼·화살)는 잘 통하지 않고, 불과 도술에는 크게 다친다
    if (t.def.iron) d *= kind === 'melee' || kind === 'proj' ? t.def.iron.cut : kind === 'aoe' || kind === 'burn' ? t.def.iron.fire : 1;
    if (t.team === 0 && this.syn.phalanx && SYN_CLASS(t.type) === 'inf') d *= 0.85;
    if (t.team === 1 && this.expose && this.waveT < 8) d *= 1 + this.expose;
    if (t.team === 0) { const md = this.mods; if (md.openGuard && this.waveOn && this.waveT < 6) d *= 1 - md.openGuard; if (md.holdGuard && t.squad.order.kind === 'hold') d *= 1 - md.holdGuard; }
    if (t.barrier > 0) { const a = Math.min(t.barrier, d); t.barrier -= a; d -= a; if (d <= 0) { this.ev('hit', { x: t.x, y: t.y, amt: 0, block: true, team: t.team, kind }); return 0; } }
    t.hp -= d; t.flash = 1;
    // 두목의 체력을 사분의 일 깎을 때마다 기세가 오른다
    if (t.def.boss && t.team === 1) { const q = Math.min(3, Math.floor((1 - Math.max(0, t.hp) / t.maxHp) * 4)); if (q > (t.q || 0)) { this.gain((q - (t.q || 0)) * 1.5, t.x, t.y - 40); t.q = q; } }
    this.ev('hit', { x: t.x, y: t.y, amt: d, flank, block, team: t.team, kind, big: d > 45 });
    if (t.hp <= 0) this.kill(t, src);
    return d;
  }
  kill(t, src, silent) {
    if (t.dead) return;
    t.dead = true; t.hp = 0; t.deadT = this.time; t.squad.alive--; t.moving = false;
    this.ev('death', { x: t.x, y: t.y, team: t.team, utype: t.type, boss: !!t.def.boss, r: t.r, last: !(t.def.revive && !t.revived) });
    if (t.team === 0) {
      if (t.def.banner) this.ev('bannerDown', { x: t.x, y: t.y }); else if (!t.temp) { this.lost++; this.waveLost++; }
      // 부대가 전멸하면 그 싸움에서는 다시 세울 수 없고, 군기가 흔들린다 (군기 수레 체력을 잃는다)
      const sq = t.squad; if (sq.alive <= 0 && sq.card) { const again = this.waveOn && this.mods.rally > this.rallied; if (again) { this.rallied++; this.drawPile.splice((this.rand() * (this.drawPile.length + 1)) | 0, 0, sq.card); } else if (this.waveOn) this.bench.push(sq.card); else this.drawPile.push(sq.card); this.ev('squadLost', { x: t.x, y: t.y, id: sq.card.id, again }); sq.card = null; const bu = this.banner.units[0]; if (bu && !bu.dead) this.damage(bu, bu.maxHp * (sq.hero ? ROUT * 2 : ROUT), null, 'rout'); }
    } else {
      // 요괴 무리 하나를 다 물리치면 사기가 오른다 (불러낸 무리·되살아난 무리는 한 번만 친다)
      this.kills++; const sq = t.squad;
      if (sq.alive <= 0 && !sq.paid && !sq.summonPool) {
        // 까치가 전장에 있으면 반가운 소식만큼 사기를 더 얻는다
        let omen = 0; for (const q of this.squads) if (q.team === 0 && q.alive > 0 && q.def.omen) omen = Math.max(omen, q.def.omen);
        sq.paid = true; const md = this.mods; this.gain(t.def.boss ? BOSS_MORALE : (sq.chaser ? SQUAD_MORALE * 0.5 : SQUAD_MORALE) + md.killMorale + omen, t.x, t.y);
        if (!sq.chaser) { if (++this.lootN >= md.lootEvery) { this.lootN = 0; this.loot(t.x, t.y); } if (md.killGold) { this.goldGain += md.killGold; this.ev('gold', { x: t.x, y: t.y, n: md.killGold }); } }
        if (md.heroLoot && src && src.def.hero && src.type === this.lead && this.heroLootN < 3 && this.pouchCount() < md.pouch + 2) { const hc = Object.keys(CARDS).filter(k => CARDS[k].hero === this.lead); if (hc.length) { this.heroLootN++; this.gainCard(hc[(this.rand() * hc.length) | 0], t.x, t.y, 'hero'); } }
      }
    }
    if (t.def.bomber && !t.exploded) this.zones.push({ kind: 'tele', style: 'bomb', x: t.x, y: t.y, r: t.def.bomber.r, t: 0, delay: 0.7, hits: 2, dmg: t.def.bomber.dmg * lvlMult(t.lvl), kb: 22 });
    else if (t.def.revive && !t.revived && !this.inGrail(t.x, t.y) && !(src && src.def.seal)) { this.corpses.push({ x: t.x, y: t.y, t: 3, revive: true, u: t }); this.pending++; }
    else if (!t.def.structure && !t.def.boss && !silent) this.corpses.push({ x: t.x, y: t.y, t: 12, raisable: true, type: t.type });
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
      if (o.burn && this.sky !== 'rain') { e.burn = Math.max(e.burn, o.burn); e.burnDmg = Math.max(e.burnDmg, o.burnDmg || 6); }
      if (o.slow) { e.slow = Math.max(e.slow, o.slowT || 2); e.slowAmt = o.slow * (e.def.boss ? 0.5 : 1); }
      if (o.kb && !e.def.boss && !e.def.structure && d > 0.5) { const k = o.kb * (e.def.large ? 0.3 : 1); e.x += (e.x - x) / d * k; e.y += (e.y - y) / d * k; }
    });
    return n;
  }

  // ───────── 특수 행동 ─────────
  doJump(u, dt) {
    const j = u.jump; j.t += dt; const k = Math.min(1, j.t / j.dur);
    u.x = j.sx + (j.tx - j.sx) * k; u.y = j.sy + (j.ty - j.sy) * k; u.moving = false; u.jumpH = Math.sin(k * PI) * 70;
    if (k >= 1) { u.jump = null; u.jumpH = 0; this.aoe(u.x, u.y, j.r, j.dmg, 1 - u.team, u, { stun: j.stun || 1.5, kb: 26 }); this.ev('impact', { x: u.x, y: u.y, r: j.r, style: 'strike' }); u.cd = 0.3; u.retarget = 0; }
  }
  tryLeap(u) {
    if (u.x > VIEW.x1 - 30) { u.leapCd = 0.4; return false; }
    let best = null, bs = -1e9;
    for (const e of this.units) { if (e.dead || e.team === u.team || !e.def.soft || e.def.structure || e.hidden > 0) continue; if (u.team === 0 && e.x > VIEW.x1 - 50) continue; const d = hyp(e.x - u.x, e.y - u.y); if (d < 150) continue; const s = (e.def.support ? 200 : 0) + d * 0.3 + this.rand() * 80; if (s > bs) { bs = s; best = e; } }
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
    this.ev('appear', { x: u.x, y: u.y, ally: u.team === 0, pounce: !!u.def.pounce });
    // 호랑이: 덮친 자리의 요괴가 얼어붙는다
    if (u.def.pounce) { const pc = u.def.pounce; this.near(u.x, u.y, pc.r + 20, e => { if (!e.dead && e.team !== u.team && !e.def.boss && !e.def.structure && hyp(e.x - u.x, e.y - u.y) < pc.r + e.r) e.stun = Math.max(e.stun, pc.stun); }); }
  }
  bomberAI(u, dt) {
    if (u.fuse > 0) { u.fuse -= dt; u.moving = false; if (u.fuse <= 0) { u.exploded = true; const b = u.def.bomber; this.aoe(u.x, u.y, b.r, b.dmg * lvlMult(u.lvl), 1 - u.team, u, { kb: 22 }); this.ev('impact', { x: u.x, y: u.y, r: b.r, style: 'bomb' }); this.kill(u, null, true); } return; }
    u.retarget -= dt;
    if (u.retarget <= 0 || !u.target || u.target.dead) { u.retarget = 0.4; let best = null, bs = 1e9; for (const e of this.units) { if (e.dead || e.team === u.team || e.hidden > 0) continue; const d0 = hyp(e.x - u.x, e.y - u.y), s = d0 - 12 * Math.min(4, this.clusterScore(e, 50)) - (e.taunt && d0 < e.taunt + 40 ? 400 : 0); if (s < bs) { bs = s; best = e; } } u.target = best; }
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
  playerSquads() { return this.squads.filter(s => s.team === 0 && s.alive > 0 && !s.temp && !s.def.banner); }
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
      u.x = clamp(u.x, FIELD.x0 + u.r, (u.team === 0 ? VIEW.x1 : FIELD.x1) - u.r); u.y = clamp(u.y, FIELD.y0 + 6, FIELD.y1 - 4);
      const mv = hyp(u.x - u.px, u.y - u.py);
      if (dt > 0) { u.vx = (u.x - u.px) / dt; u.vy = (u.y - u.py) / dt; if (u.moving && mv < u.def.spd * dt * 0.3) u.stuck += dt; else u.stuck = 0; }
    }
  }

  // ───────── 투사체 / 구역 / 시체 ─────────
  updateProj(dt) {
    for (const p of this.proj) {
      if (p.lob) {
        p.t += dt; const k = Math.min(1, p.t / p.dur); p.x = p.sx + (p.tx - p.sx) * k; p.y = p.sy + (p.ty - p.sy) * k; p.h = Math.sin(k * PI) * (p.kind === 'shell' ? 90 : 60) + 14 * (1 - k);
        if (k >= 1) { p.done = true; this.aoe(p.tx, p.ty, p.aoe, p.dmg, 1 - p.team, p.src, { kb: p.kind === 'shell' ? 14 : 0, slow: p.slow ? p.slow.amt : 0, slowT: p.slow ? p.slow.t : 0 }); this.ev('impact', { x: p.tx, y: p.ty, r: p.aoe, style: p.kind }); }
      } else {
        const t = p.target; if (t && !t.dead && t.hidden <= 0) { p.tx = t.x; p.ty = t.y - 12; }
        const dx = p.tx - p.x, dy = p.ty - p.y, d = hyp(dx, dy), s = p.spd * dt; p.ang = Math.atan2(dy, dx);
        if (d <= s + 6) { p.done = true; if (t && !t.dead && t.hidden <= 0) { this.damage(t, p.dmg, p.src, 'proj', p.ox, p.oy); if (p.src) this.onHit(p.src, t); } }
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
          if (!sq) { sq = { id: this.squads.length, team: z.team, type: z.utype, def: defOf(z.utype), lvl: z.lvl, units: [], alive: 0, total: 0, order: { kind: 'auto' }, cx: z.x, cy: z.y, summonPool: true }; this.squads.push(sq); }
          for (let i = 0; i < z.n; i++) { const u = this.spawn(z.utype, z.team, z.x + i * 6, z.y, sq, z.lvl, [0, 0]); u.summoned = true; u.revived = true; u.summoner = z.summoner || null; sq.total++; }
          this.ev('appear', { x: z.x, y: z.y, summon: true });
        }
      } else if (z.kind === 'rain') {
        z.acc += dt; if (z.acc >= 0.4 && z.t < z.dur) { z.acc -= 0.4; this.aoe(z.x, z.y, z.r, z.dmg, 1, null, z.burn ? { burn: 3, burnDmg: z.burn } : {}); this.ev('rainTick', { x: z.x, y: z.y, r: z.r, fire: z.fire }); }
        if (z.t >= z.dur) z.done = true;
      } else if (z.kind === 'grail') {
        z.acc += dt; if (z.acc >= 0.5 && z.t < z.dur) { z.acc -= 0.5; this.near(z.x, z.y, z.r + 20, u => { if (u.dead || u.team !== 0 || hyp(u.x - z.x, u.y - z.y) > z.r + u.r) return; const a = u.maxHp * z.heal; if (u.hp < u.maxHp) this.ev('heal', { x: u.x, y: u.y, amt: Math.min(a, u.maxHp - u.hp), team: 0, quiet: true }); u.hp = Math.min(u.maxHp, u.hp + a); u.root = 0; u.weaken = 0; u.burn = 0; u.slow = 0; }); }
        if (z.t >= z.dur) z.done = true;
      } else if (z.kind === 'caltrop') {
        z.acc += dt; if (z.acc >= 0.5) { z.acc -= 0.5; this.near(z.x, z.y, z.r + 20, u => { if (u.dead || u.team !== 1 || u.jump || hyp(u.x - z.x, u.y - z.y) > z.r + u.r * 0.5) return; u.slow = Math.max(u.slow, 0.8); u.slowAmt = z.slow * (u.def.boss ? 0.5 : 1); this.damage(u, z.dmg, null, 'aoe'); }); }
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
