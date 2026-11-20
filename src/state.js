// 원정(런) 상태, 보상, 저장
import { UNITS, PLAYER_TYPES, lvlMult } from './data/units.js';
import { STAGES, MAPS, foodCap } from './data/stages.js';
import { RELICS } from './data/relics.js';
import { DEFAULT_MODS, PACE } from './sim/battle.js';
import { GRID } from './config.js';

const KEY = 'gogae.save.v1';
export const meta = { best: 0, clears: 0 };
export const G = { run: null };

function rnd() { return Math.random(); }
export function load() {
  try { const d = JSON.parse(localStorage.getItem(KEY) || 'null'); if (d) { Object.assign(meta, d.meta || {}); G.run = d.run && !d.run.done && d.run.crowns > 0 ? d.run : null; } } catch (e) { /* 저장소 없음 */ }
}
export function save() { try { localStorage.setItem(KEY, JSON.stringify({ meta, run: G.run })); } catch (e) { /* 무시 */ } }

export function newRun(hero) {
  const r = G.run = { hero, stage: 0, crowns: 3, gold: 0, squads: [], nextId: 1, lvl: {}, extra: {}, relics: [], capBonus: 0, merit: 0, kills: 0, lost: 0, rerolls: 0, tips: {} };
  const add = (type, col, row) => r.squads.push({ uid: r.nextId++, type, col, row, placed: true, hold: false });
  add(hero, UNITS[hero].range || UNITS[hero].heal ? 3 : 2, 1); add('shield', 2, 0); add('sword', 3, 0); add('xbow', UNITS[hero].range || UNITS[hero].heal ? 2 : 3, 2);
  save(); return r;
}
export const lvlOf = type => (G.run.lvl[type] || 1);
export const countOf = type => UNITS[type].n + (G.run.extra[type] || 0);
export const cap = () => foodCap(G.run.stage) + G.run.capBonus;
export const used = () => G.run.squads.reduce((a, s) => a + (s.placed ? UNITS[s.type].cost : 0), 0);
export function mods() { const m = Object.assign({}, DEFAULT_MODS); for (const id of G.run.relics) RELICS[id].mod(m); return m; }
export function unitStats(type, lvl) { const d = UNITS[type], m = lvlMult(lvl || lvlOf(type)); return { hp: Math.round(d.hp * m * PACE), atk: Math.round((d.atk || d.heal || 0) * m), n: d.side === 0 ? countOf(type) : d.n }; }
export function powerOf(list) { let p = 0; for (const s of list) { const d = UNITS[s.type], m = lvlMult(s.lvl || 1), n = s.n || d.n; p += n * (d.hp * m * 0.5 + ((d.atk || d.heal || 0) * m / d.as) * 9) * (d.boss ? 0.6 : 1); } return Math.round(p / 10); }

export function freeCell(exceptUid) {
  const occ = new Set(G.run.squads.filter(s => s.placed && s.uid !== exceptUid).map(s => s.col + ',' + s.row));
  for (const row of [1, 0, 2]) for (const col of [2, 3, 1, 4, 0, 5]) if (!occ.has(col + ',' + row)) return { col, row };
  return null;
}
export function squadAtCell(col, row) { return G.run.squads.find(s => s.placed && s.col === col && s.row === row) || null; }

// 전투 입력 만들기
export function battleSetup(seed) {
  const r = G.run, st = STAGES[r.stage];
  const player = r.squads.filter(s => s.placed).map(s => ({ type: s.type, col: s.col, row: s.row, n: countOf(s.type), lvl: lvlOf(s.type), hold: s.hold, uid: s.uid }));
  const enemy = st.enemy.map(([type, col, row, o]) => Object.assign({ type, col, row, lvl: st.lvl }, o || {}));
  return { map: MAPS[st.map], player, enemy, mods: mods(), seed: seed || ((rnd() * 1e9) | 0), timeLimit: st.time, power: 1 + 0.1 * r.stage, heroSkill: UNITS[r.hero].skill };
}

// ───────── 보상 ─────────
const UNLOCK = { sword: 0, shield: 0, spear: 0, xbow: 0, priest: 0, knight: 1, wizard: 1, berserk: 3, cannon: 4 };
function pick(arr) { return arr[(rnd() * arr.length) | 0]; }
export function describeReward(o) {
  const r = G.run;
  if (o.kind === 'recruit') { const d = UNITS[o.type]; return { title: `의병 모집`, name: d.name, desc: `${d.name} 부대 합류 (${countOf(o.type)}명, 군량 ${d.cost})\n${d.desc}`, tag: '부대', col: 'blue' }; }
  if (o.kind === 'train') { const d = UNITS[o.type]; const l = lvlOf(o.type); return { title: '조련', name: `${d.name} Lv${l} → Lv${l + 1}`, desc: `모든 ${d.name}의 체력과 ${d.heal ? '치유량' : '공격력'} +20%`, tag: '강화', col: 'green' }; }
  if (o.kind === 'reinforce') { const d = UNITS[o.type]; return { title: '증원', name: `${d.name} +${o.n}명`, desc: `${d.name} 부대 인원 ${countOf(o.type)} → ${countOf(o.type) + o.n}명\n군량은 그대로입니다.`, tag: '증원', col: 'green' }; }
  if (o.kind === 'relic') { const x = RELICS[o.id]; return { title: '보물', name: x.name, desc: x.desc, tag: '보물', col: 'purple' }; }
  if (o.kind === 'hero') { const d = UNITS[r.hero]; const l = lvlOf(r.hero); return { title: '영웅 수련', name: `${d.name} Lv${l} → Lv${l + 1}`, desc: `영웅의 체력·공격력·영웅기 위력 +20%`, tag: '영웅', col: 'gold' }; }
  return { title: '군량 수레', name: '군량 +1 · 엽전 +25', desc: '부대를 더 많이 배치할 수 있습니다.', tag: '보급', col: 'gold' };
}
export function rollRewards(boss) {
  const r = G.run, out = [], keys = new Set();
  const types = PLAYER_TYPES.filter(t => UNLOCK[t] <= r.stage);
  const owned = [...new Set(r.squads.map(s => s.type).filter(t => !UNITS[t].hero))];
  const relicPool = Object.keys(RELICS).filter(id => !r.relics.includes(id));
  const make = kind => {
    if (kind === 'recruit') { if (r.squads.length >= 13) return null; const fresh = types.filter(t => !owned.includes(t)); const t = fresh.length && rnd() < 0.65 ? pick(fresh) : pick(types); return { kind, type: t, key: 'rc' + t }; }
    if (kind === 'train') { if (!owned.length) return null; const t = pick(owned); if (lvlOf(t) >= 6) return null; return { kind, type: t, key: 'tr' + t }; }
    if (kind === 'reinforce') { if (!owned.length) return null; const t = pick(owned); if ((r.extra[t] || 0) >= 4) return null; return { kind, type: t, n: UNITS[t].n >= 5 ? 2 : 1, key: 'rf' + t }; }
    if (kind === 'relic') { if (!relicPool.length) return null; const id = pick(relicPool); return { kind, id, key: 'rl' + id }; }
    if (kind === 'hero') { if (lvlOf(r.hero) >= 6) return null; return { kind, key: 'hero' }; }
    return { kind: 'supply', key: 'supply' };
  };
  const table = [['recruit', 30], ['train', 30], ['reinforce', 14], ['relic', 14], ['hero', 7], ['supply', 5]];
  const total = table.reduce((a, t) => a + t[1], 0);
  const forced = boss ? ['relic', 'relic', null] : (r.stage < 3 ? ['recruit', null, null] : [null, null, null]);
  let guard = 0;
  while (out.length < 3 && guard++ < 200) {
    let kind = forced[out.length];
    if (!kind || guard > 40) { let x = rnd() * total; for (const [k, w] of table) { if ((x -= w) < 0) { kind = k; break; } } }
    const o = make(kind); if (!o || keys.has(o.key)) continue;
    keys.add(o.key); out.push(o);
  }
  return out;
}
export function applyReward(o) {
  const r = G.run;
  if (o.kind === 'recruit') { const s = { uid: r.nextId++, type: o.type, col: 0, row: 0, placed: false, hold: false }; r.squads.push(s); autoPlace(s, 1); }
  else if (o.kind === 'train') r.lvl[o.type] = lvlOf(o.type) + 1;
  else if (o.kind === 'reinforce') r.extra[o.type] = (r.extra[o.type] || 0) + o.n;
  else if (o.kind === 'relic') r.relics.push(o.id);
  else if (o.kind === 'hero') r.lvl[r.hero] = lvlOf(r.hero) + 1;
  else { r.capBonus += 1; r.gold += 25; }
  save();
}
// 다음 스테이지 기준 군량이 남으면 새 부대를 자동 배치
export function autoPlace(s, stageAhead = 0) {
  const r = G.run; const c = foodCap(Math.min(STAGES.length - 1, r.stage + stageAhead)) + r.capBonus;
  if (used() + UNITS[s.type].cost > c) return false;
  const d = UNITS[s.type]; const pref = d.soft ? [2, 1, 0] : d.mounted ? [1, 0, 2] : [0, 1, 2];
  const occ = new Set(r.squads.filter(q => q.placed).map(q => q.col + ',' + q.row));
  for (const row of pref) for (const col of [2, 3, 1, 4, 0, 5]) if (!occ.has(col + ',' + row)) { s.col = col; s.row = row; s.placed = true; return true; }
  return false;
}
export function goldFor(stars, boss) { return Math.round((30 + stars * 10 + (boss ? 30 : 0)) * mods().gold); }
export { GRID };
