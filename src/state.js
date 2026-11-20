// 원정(런) 상태: 갈림길 지도, 싸움 준비, 전리품, 장터, 공적(원정 사이 성장), 저장
import { UNITS, lvlMult } from './data/units.js';
import { MAPS } from './data/stages.js';
import { RELICS, CURSES } from './data/relics.js';
import { genEncounter, ROWS } from './data/encounters.js';
import { DEFAULT_MODS, PACE } from './sim/battle.js';

const KEY = 'gogae.save.v2';
export const meta = { best: 0, clears: 0, runs: 0, merit: 0, unlocked: {}, hard: 0, hardMax: 0, seen: {} };
export const G = { run: null };
const rnd = () => Math.random();
const pick = arr => arr[(rnd() * arr.length) | 0];

export function load() {
  try { const d = JSON.parse(localStorage.getItem(KEY) || 'null'); if (d) { Object.assign(meta, d.meta || {}); G.run = d.run && !d.run.done && d.run.crowns > 0 ? d.run : null; } } catch (e) { /* 저장소 없음 */ }
}
export function save() { try { localStorage.setItem(KEY, JSON.stringify({ meta, run: G.run })); } catch (e) { /* 무시 */ } }

// ───────── 공적으로 여는 것들 ─────────
export const UNLOCKS = [
  { id: 'bishop', name: '영웅 · 고승', desc: '법력 결계로 군대를 지키는 치유 영웅', cost: 20, unit: 'bishop' },
  { id: 'archmage', name: '영웅 · 신선', desc: '불벼락을 내리는 도술 영웅', cost: 30, unit: 'archmage' },
  { id: 'berserk', name: '병종 · 철퇴 장사', desc: '전리품과 장터에 철퇴 장사가 나옵니다', cost: 25, unit: 'berserk' },
  { id: 'cannon', name: '병종 · 화차', desc: '전리품과 장터에 화차가 나옵니다', cost: 35, unit: 'cannon' },
  { id: 'p_gold', name: '노잣돈', desc: '엽전 60을 들고 출발합니다', cost: 20 },
  { id: 'p_reroll', name: '눈썰미', desc: '전리품 다시 뽑기가 싸움마다 한 번 무료', cost: 25 },
  { id: 'p_cap', name: '넉넉한 군량', desc: '군량 +1 로 출발합니다', cost: 40 },
  { id: 'p_relic', name: '집안의 가보', desc: '무작위 보물 하나를 들고 출발합니다', cost: 50 },
];
export const has = id => !!meta.unlocked[id];
export function buyUnlock(id) { const u = UNLOCKS.find(x => x.id === id); if (!u || has(id) || meta.merit < u.cost) return false; meta.merit -= u.cost; meta.unlocked[id] = true; save(); return true; }
export const heroOpen = h => h === 'commander' || has(h);
const BASE_TYPES = ['sword', 'shield', 'spear', 'xbow', 'priest', 'knight', 'wizard'];
export const unitPool = () => BASE_TYPES.concat(['berserk', 'cannon'].filter(has));
export const HARD_DESC = ['', '요괴 체력 +8%', '요괴 체력 +16%, 수 +5%', '요괴 체력 +24%, 수 +10%', '요괴 체력 +32%, 수 +15%', '요괴 체력 +40%, 수 +20%'];

// ───────── 원정 시작 ─────────
export function newRun(hero) {
  const r = G.run = { hero, ch: 0, crowns: 3, gold: has('p_gold') ? 60 : 0, squads: [], nextId: 1, lvl: {}, extra: {}, relics: [], capBonus: has('p_cap') ? 1 : 0, wins: 0, merit: 0, kills: 0, lost: 0, bosses: 0, hard: Math.min(meta.hard || 0, meta.hardMax || 0), map: null, enc: null, pending: null, rewardPending: null, evSeen: [], nextMorale: 0 };
  const add = (type, col, row) => r.squads.push({ uid: r.nextId++, type, col, row, placed: true, hold: false });
  const back = UNITS[hero].range || UNITS[hero].heal;
  add(hero, back ? 3 : 2, 1); add('shield', 2, 0); add('sword', 3, 0); add('xbow', back ? 2 : 3, 2);
  if (has('p_relic')) { const id = pick(relicPool()); if (id) r.relics.push(id); }
  r.map = genMap(0); meta.runs++;
  save(); return r;
}
export const lvlOf = type => (G.run.lvl[type] || 1);
export const countOf = type => UNITS[type].n + (G.run.extra[type] || 0);
export const cap = () => 8 + Math.min(G.run.wins, 12) + G.run.capBonus;
export const used = () => G.run.squads.reduce((a, s) => a + (s.placed ? UNITS[s.type].cost : 0), 0);
export function mods() { const m = Object.assign({}, DEFAULT_MODS); m.unit = {}; for (const id of G.run.relics) RELICS[id].mod(m); return m; }
export function unitStats(type, lvl) { const d = UNITS[type], m = lvlMult(lvl || lvlOf(type)); return { hp: Math.round(d.hp * m * PACE), atk: Math.round((d.atk || d.heal || 0) * m), n: d.side === 0 ? countOf(type) : d.n }; }
export function squadAtCell(col, row) { return G.run.squads.find(s => s.placed && s.col === col && s.row === row) || null; }
export const depth = () => { const r = G.run, n = r.map.cur === null ? null : r.map.nodes[r.map.cur]; return r.ch * (ROWS + 1) + (n ? n.r : 0); };

// ───────── 갈림길 지도 ─────────
// 줄 0: 싸움 / 줄 1·3: 섞임 / 줄 2: 싸움 또는 강적 / 줄 4: 주막 / 그 위: 두목
const COLS = 4;
export function genMap(ch) {
  const at = new Map(), nodes = [], node = (r, c) => { const k = r + ':' + c; if (!at.has(k)) { at.set(k, nodes.length); nodes.push({ id: nodes.length, r, c, type: 'battle', next: [] }); } return at.get(k); };
  const starts = [0, 1, 2, 3].sort(() => rnd() - 0.5).slice(0, 3);
  for (const s of starts) {
    let c = s, prev = node(0, c);
    for (let r = 1; r < ROWS; r++) {
      let nc = Math.max(0, Math.min(COLS - 1, c + pick([-1, 0, 0, 1])));
      // 길이 서로 엇갈리지 않게
      if (nc !== c && nodes.some(n => n.r === r - 1 && n.c === nc && n.next.some(id => nodes[id].c === c))) nc = c;
      const cur = node(r, nc); if (!nodes[prev].next.includes(cur)) nodes[prev].next.push(cur); prev = cur; c = nc;
    }
  }
  const mixed = r => { const x = rnd(); if (r === 3) return x < 0.28 ? 'battle' : x < 0.48 ? 'event' : x < 0.64 ? 'elite' : x < 0.88 ? 'shop' : 'treasure'; return x < 0.38 ? 'battle' : x < 0.66 ? 'event' : x < 0.88 ? 'shop' : 'treasure'; };
  for (const n of nodes) n.type = n.r === 0 || n.r === 2 ? 'battle' : n.r === ROWS - 1 ? 'rest' : mixed(n.r);
  // 가운데 줄에는 강적이 한 곳만 — 피해 갈 길이 늘 있다
  const mid = nodes.filter(n => n.r === 2); if (mid.length >= 2) pick(mid).type = 'elite';
  const ensure = (type, rows) => { if (nodes.some(n => n.type === type)) return; const c = nodes.filter(n => rows.includes(n.r) && n.type !== 'elite'); if (c.length) pick(c).type = type; };
  ensure('shop', [1, 3]); ensure('event', [1, 3]);
  const boss = { id: nodes.length, r: ROWS, c: 1.5, type: 'boss', next: [] };
  for (const n of nodes) if (n.r === ROWS - 1) n.next.push(boss.id);
  nodes.push(boss);
  for (const n of nodes) n.next.sort((a, b) => nodes[a].c - nodes[b].c);
  return { ch, nodes, cur: null, done: [] };
}
export function openNodes() { const m = G.run.map; if (m.cur === null) return m.nodes.filter(n => n.r === 0).map(n => n.id); return m.done.includes(m.cur) ? m.nodes[m.cur].next : []; }
export function enterNode(id) {
  const r = G.run, n = r.map.nodes[id]; r.map.cur = id; r.pending = null; r.rewardPending = null; r.enc = null;
  if (n.type === 'battle' || n.type === 'elite' || n.type === 'boss') { r.enc = genEncounter(r.ch, n.r, n.type, rnd, r.hard); r.pending = { kind: 'battle' }; }
  else if (n.type === 'event') { const pool = EVENT_IDS.filter(e => !r.evSeen.includes(e) && (EVENT_MIN[e] || 0) <= r.ch); const ev = pick(pool.length ? pool : EVENT_IDS); r.evSeen.push(ev); r.pending = { kind: 'event', id: ev }; }
  else if (n.type === 'rest') { const own = ownedTypes().filter(t => lvlOf(t) < 6); r.pending = { kind: 'event', id: 'rest', train: own.length ? pick(own) : null }; }
  else if (n.type === 'shop') r.pending = { kind: 'shop', items: genShop() };
  else if (n.type === 'treasure') { r.rewardPending = { kind: 'treasure' }; r.pending = { kind: 'reward' }; }
  save(); return r.pending.kind;
}
// 칸을 끝냈다: 두목이었다면 다음 고개로. 원정이 끝났으면 true
export function finishNode() {
  const r = G.run, m = r.map, n = m.nodes[m.cur]; if (!m.done.includes(m.cur)) m.done.push(m.cur);
  r.pending = null; r.rewardPending = null; r.enc = null;
  meta.best = Math.max(meta.best, r.ch * (ROWS + 1) + n.r + 1);
  if (n.type === 'boss') { r.bosses++; r.ch++; if (r.ch >= 3) { r.done = true; save(); return true; } r.crowns = Math.min(3, r.crowns + 1); r.map = genMap(r.ch); }
  fitCap(); for (const s of r.squads) if (!s.placed) autoPlace(s);
  save(); return false;
}
// 군량이 줄었으면 넘치는 부대를 대기로 돌린다 (영웅 제외, 나중에 들어온 부대부터)
export function fitCap() { const r = G.run; for (let i = r.squads.length - 1; i >= 0 && used() > cap(); i--) { const s = r.squads[i]; if (s.placed && !UNITS[s.type].hero) s.placed = false; } }
export function sceneFor() { const r = G.run; if (!r.pending) return 'map'; return r.pending.kind === 'battle' ? (r.rewardPending ? 'reward' : 'battle') : r.pending.kind; }

// ───────── 싸움 준비 ─────────
export function battleSetup(seed) {
  const r = G.run, e = r.enc, m = mods(); m.startMorale += r.nextMorale || 0;
  const player = r.squads.filter(s => s.placed).map(s => ({ type: s.type, col: s.col, row: s.row, n: countOf(s.type), lvl: lvlOf(s.type), hold: s.hold, uid: s.uid }));
  const enemy = e.enemy.map(([type, col, row, o]) => Object.assign({ type, col, row, lvl: e.lvl }, o || {}));
  const foe = Object.assign({}, e.foe || {}); foe.hp = (foe.hp || 1) * (1 + 0.08 * r.hard);
  return { map: MAPS[e.map], player, enemy, mods: m, foe, seed: seed || ((rnd() * 1e9) | 0), timeLimit: e.time, power: 1 + 0.085 * depth(), heroSkill: UNITS[r.hero].skill };
}
export function goldFor(grade, kind) { const m = mods(); return Math.round((28 + grade * 9 + (kind === 'boss' ? 40 : kind === 'elite' ? 18 : 0)) * m.gold * (1 - 0.05 * G.run.hard) + m.goldFlat); }

// ───────── 전리품 ─────────
export const ownedTypes = () => [...new Set(G.run.squads.map(s => s.type).filter(t => !UNITS[t].hero))];
export function relicPool() { const r = G.run, own = r ? ownedTypes() : []; return Object.keys(RELICS).filter(id => !RELICS[id].curse && !(r && r.relics.includes(id)) && (!RELICS[id].req || own.includes(RELICS[id].req))); }
export function describeReward(o) {
  const r = G.run;
  if (o.kind === 'recruit') { const d = UNITS[o.type]; return { title: '의병 모집', name: d.name, desc: `${d.name} 부대 합류 (${countOf(o.type)}명, 군량 ${d.cost})\n${d.desc}`, col: 'blue' }; }
  if (o.kind === 'train') { const d = UNITS[o.type], l = lvlOf(o.type); return { title: '조련', name: `${d.name} Lv${l} → Lv${l + 1}`, desc: `모든 ${d.name}의 체력과 ${d.heal ? '치유량' : '공격력'} +20%`, col: 'green' }; }
  if (o.kind === 'reinforce') { const d = UNITS[o.type]; return { title: '증원', name: `${d.name} +${o.n}명`, desc: `${d.name} 부대 인원 ${countOf(o.type)} → ${countOf(o.type) + o.n}명\n군량은 그대로입니다.`, col: 'green' }; }
  if (o.kind === 'relic') { const x = RELICS[o.id]; return { title: '보물', name: x.name, desc: x.desc, col: 'purple' }; }
  if (o.kind === 'hero') { const d = UNITS[r.hero], l = lvlOf(r.hero); return { title: '영웅 수련', name: `${d.name} Lv${l} → Lv${l + 1}`, desc: '영웅의 체력·공격력·영웅기 위력 +20%', col: 'gold' }; }
  if (o.kind === 'cleanse') return { title: '부정 씻기', name: RELICS[o.id].name, desc: `부정 [${RELICS[o.id].name}] 을 씻어냅니다.\n(${RELICS[o.id].desc})`, col: 'gold' };
  return { title: '군량 수레', name: '군량 +1', desc: '부대를 더 많이 배치할 수 있습니다.', col: 'gold' };
}
function makeReward(kind, keys) {
  const r = G.run, types = unitPool(), owned = ownedTypes();
  if (kind === 'recruit') { if (r.squads.length >= 13) return null; const fresh = types.filter(t => !owned.includes(t)); const t = fresh.length && rnd() < 0.65 ? pick(fresh) : pick(types); return { kind, type: t, key: 'rc' + t }; }
  if (kind === 'train') { const c = owned.filter(t => lvlOf(t) < 6); if (!c.length) return null; const t = pick(c); return { kind, type: t, key: 'tr' + t }; }
  if (kind === 'reinforce') { const c = owned.filter(t => (r.extra[t] || 0) < 4); if (!c.length) return null; const t = pick(c); return { kind, type: t, n: UNITS[t].n >= 5 ? 2 : 1, key: 'rf' + t }; }
  if (kind === 'relic') { const pool = relicPool().filter(id => !keys.has('rl' + id)); if (!pool.length) return null; const id = pick(pool); return { kind, id, key: 'rl' + id }; }
  if (kind === 'hero') { if (lvlOf(r.hero) >= 6) return null; return { kind, key: 'hero' }; }
  return { kind: 'supply', key: 'supply' };
}
const TABLE = [['recruit', 30], ['train', 30], ['reinforce', 14], ['relic', 14], ['hero', 7], ['supply', 5]];
export function rollRewards(kind) {
  const r = G.run, out = [], keys = new Set(), total = TABLE.reduce((a, t) => a + t[1], 0);
  const forced = kind === 'boss' || kind === 'treasure' ? ['relic', 'relic', 'relic'] : kind === 'elite' ? ['relic', 'relic', null] : (r.squads.length < 6 ? ['recruit', null, null] : [null, null, null]);
  for (let guard = 0; out.length < 3 && guard < 200; guard++) {
    let k = forced[out.length];
    if (!k || guard > 40) { let x = rnd() * total; for (const [name, w] of TABLE) { if ((x -= w) < 0) { k = name; break; } } }
    const o = makeReward(k, keys); if (!o || keys.has(o.key)) continue;
    keys.add(o.key); out.push(o);
  }
  return out;
}
export function applyReward(o) {
  const r = G.run;
  if (o.kind === 'recruit') { const s = { uid: r.nextId++, type: o.type, col: 0, row: 0, placed: false, hold: false }; r.squads.push(s); autoPlace(s); }
  else if (o.kind === 'train') r.lvl[o.type] = lvlOf(o.type) + 1;
  else if (o.kind === 'reinforce') r.extra[o.type] = (r.extra[o.type] || 0) + o.n;
  else if (o.kind === 'relic') r.relics.push(o.id);
  else if (o.kind === 'hero') r.lvl[r.hero] = lvlOf(r.hero) + 1;
  else if (o.kind === 'cleanse') r.relics = r.relics.filter(id => id !== o.id);
  else r.capBonus += 1;
  save();
}
// 군량이 남으면 대기 중인 부대를 빈 칸에 세운다 (extra: 곧 늘어날 군량)
export function autoPlace(s, extra = 0) {
  const r = G.run; if (used() + UNITS[s.type].cost > cap() + extra) return false;
  const d = UNITS[s.type], pref = d.soft ? [2, 1, 0] : d.mounted ? [1, 0, 2] : [0, 1, 2];
  const occ = new Set(r.squads.filter(q => q.placed).map(q => q.col + ',' + q.row));
  for (const row of pref) for (const col of [2, 3, 1, 4, 0, 5]) if (!occ.has(col + ',' + row)) { s.col = col; s.row = row; s.placed = true; return true; }
  return false;
}

// ───────── 장터 ─────────
export function genShop() {
  const r = G.run, items = [], keys = new Set(), add = (kind, price) => { for (let g = 0; g < 20; g++) { const o = makeReward(kind, keys); if (o && !keys.has(o.key)) { keys.add(o.key); items.push(Object.assign(o, { price, sold: false })); return; } } };
  add('recruit', 58); add('recruit', 58); add('relic', 92 + r.ch * 10); add('relic', 104 + r.ch * 10); add('train', 62 + r.ch * 8);
  const curse = r.relics.find(id => RELICS[id].curse);
  if (curse) items.push({ kind: 'cleanse', id: curse, key: 'cl', price: 45, sold: false }); else add(rnd() < 0.5 ? 'reinforce' : 'supply', 60);
  for (const it of items) if (it.kind === 'recruit') it.price = 36 + UNITS[it.type].cost * 11;
  return items;
}
export function buyItem(i) { const r = G.run, it = r.pending.items[i]; if (!it || it.sold || r.gold < it.price) return false; r.gold -= it.price; it.sold = true; applyReward(it); return true; }

// ───────── 사건에서 쓰는 도우미 ─────────
export const EVENT_IDS = ['ssireum', 'axe', 'shrine', 'peddler', 'lost', 'bangmangi', 'boar', 'well', 'smith', 'sansam', 'fox', 'jangseung'];
const EVENT_MIN = { well: 1, smith: 1 };
export const act = {
  gold(n) { const r = G.run; r.gold = Math.max(0, r.gold + n); return n >= 0 ? `엽전 +${n}` : `엽전 ${n}`; },
  flag(n) { const r = G.run; if (n > 0) { if (r.crowns >= 3) { r.capBonus++; return '깃발이 가득해 군량 +1'; } r.crowns++; return '깃발 +1'; } if (r.crowns > 1) { r.crowns--; return '깃발 -1'; } return act.gold(-50); },
  relic(id) { const r = G.run; if (!id || r.relics.includes(id)) id = pick(relicPool()); if (!id) return act.gold(60); r.relics.push(id); return `보물 [${RELICS[id].name}] — ${RELICS[id].desc}`; },
  curse() { const r = G.run, pool = CURSES.filter(id => !r.relics.includes(id)); if (!pool.length) return act.gold(-20); const id = pick(pool); r.relics.push(id); return `부정 [${RELICS[id].name}] — ${RELICS[id].desc}`; },
  cleanse() { const r = G.run, id = r.relics.find(x => RELICS[x].curse); if (!id) return null; r.relics = r.relics.filter(x => x !== id); return `부정 [${RELICS[id].name}] 이 씻겨 나갔습니다`; },
  train(filter) { const c = ownedTypes().filter(t => lvlOf(t) < 6 && (!filter || filter(UNITS[t]))); if (!c.length) return act.hero(); const t = pick(c); G.run.lvl[t] = lvlOf(t) + 1; return `${UNITS[t].name} Lv${lvlOf(t)}`; },
  trainType(t) { G.run.lvl[t] = lvlOf(t) + 1; return `${UNITS[t].name} Lv${lvlOf(t)}`; },
  reinforce() { const r = G.run, c = ownedTypes().filter(t => (r.extra[t] || 0) < 4); if (!c.length) return act.gold(30); const t = pick(c), n = UNITS[t].n >= 5 ? 2 : 1; r.extra[t] = (r.extra[t] || 0) + n; return `${UNITS[t].name} +${n}명`; },
  recruit() { const o = makeReward('recruit', new Set()); if (!o) return act.gold(40); applyReward(o); return `${UNITS[o.type].name} 부대 합류`; },
  hero() { const r = G.run; if (lvlOf(r.hero) >= 6) return act.gold(40); r.lvl[r.hero] = lvlOf(r.hero) + 1; return `${UNITS[r.hero].name} Lv${lvlOf(r.hero)}`; },
  cap(n) { G.run.capBonus += n; fitCap(); return n > 0 ? `군량 +${n}` : `군량 ${n}`; },
  morale(n) { G.run.nextMorale = n; return `다음 싸움 시작 사기 +${n}`; },
};

// ───────── 원정 끝: 공적 정산 ─────────
export function settleRun(win) {
  const r = G.run; if (!r || r.settled) return r ? r.gain || 0 : 0;
  const gain = Math.round((r.merit + r.bosses * 6 + (win ? 15 : 0)) * (1 + 0.25 * r.hard));
  meta.merit += gain; r.settled = true; r.gain = gain;
  if (win) { meta.clears++; meta.hardMax = Math.min(5, Math.max(meta.hardMax || 0, r.hard + 1)); }
  save(); return gain;
}
