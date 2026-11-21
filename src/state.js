// 원정(런) 상태: 덱(병력·영웅·전술 패), 노정(길 위에서 차례로 만나는 것들), 전리품, 장터, 공적(원정 사이 성장), 저장
import { UNITS, HEROES, lvlMult, BEAST_TYPES } from './data/units.js';
import { RELICS, CURSES } from './data/relics.js';
import { genEncounter } from './data/encounters.js';
import { DEFAULT_MODS, PACE, MAX_CAP, defOf } from './sim/battle.js';
import { CARDS, MAX_LV, starterDeck, cardName, isUnit, packN } from './data/cards.js';
import { WEAPONS, ARMS, LOOT_WEAPONS, CLS_NAME, canEquip } from './data/weapons.js';
import { VIEW, MID_Y } from './config.js';
import { TALES, TALE_BY_ID } from './data/story.js';

const KEY = 'gogae.save.v4';
export const meta = { best: 0, clears: 0, runs: 0, merit: 0, unlocked: {}, hard: 0, hardMax: 0, seen: {}, tales: [], deeds: {} };
export const G = { run: null };
const rnd = () => Math.random();
const pick = arr => arr[(rnd() * arr.length) | 0];

export function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (d) { Object.assign(meta, d.meta || {}); G.run = d.run && !d.run.done && d.run.flags > 0 ? d.run : null; }
    else for (const k of ['gogae.save.v3', 'gogae.save.v2']) { const old = JSON.parse(localStorage.getItem(k) || 'null'); if (old && old.meta) { Object.assign(meta, old.meta); break; } } // 예전 저장: 공적·이야기책만 잇는다 (패 규칙이 바뀌어 하던 원정은 버린다)
  } catch (e) { /* 저장소 없음 */ }
}
export function save() { try { localStorage.setItem(KEY, JSON.stringify({ meta, run: G.run })); } catch (e) { /* 무시 */ } }

// ───────── 주막의 옛이야기: 아직 못 들은 것부터, 지금 고개의 이야기를 먼저 ─────────
export function hearTale(ch) {
  const got = meta.tales || (meta.tales = []), left = TALES.filter(t => !got.includes(t.id)), t = left.find(x => x.ch === ch) || left[0];
  if (t) { got.push(t.id); save(); return { id: t.id, fresh: true }; }
  const pool = TALES.filter(x => x.ch === ch); return { id: (pool[(rnd() * pool.length) | 0] || TALES[0]).id, fresh: false };
}
export const taleView = p => ({ tale: TALE_BY_ID[p.id] || TALES[0], fresh: !!p.fresh, n: (meta.tales || []).length, of: TALES.length });

// ───────── 공적으로 여는 것들 ─────────
export const UNLOCKS = [
  { id: 'bishop', name: '영웅 · 고승', desc: '법력 결계로 군대를 지키는 치유 영웅', cost: 20, unit: 'bishop' },
  { id: 'archmage', name: '영웅 · 신선', desc: '불벼락을 내리는 도술 영웅', cost: 30, unit: 'archmage' },
  { id: 'sangsoe', name: '영웅 · 상쇠', desc: '사기를 돋우고 판을 흔드는 풍물 영웅', cost: 25, unit: 'sangsoe' },
  { id: 'chief', name: '영웅 · 두령', desc: '적을 끌어모아 버티는 녹림 영웅', cost: 35, unit: 'chief' },
  { id: 'berserk', name: '병력 · 철퇴 장사', desc: '전리품과 장터에 철퇴 장사 패가 나옵니다', cost: 25, unit: 'berserk' },
  { id: 'cannon', name: '병력 · 화차', desc: '전리품과 장터에 화차 패가 나옵니다', cost: 35, unit: 'cannon' },
  { id: 'p_gold', name: '노잣돈', desc: '엽전 60을 들고 출발합니다', cost: 20 },
  { id: 'p_reroll', name: '눈썰미', desc: '전리품 다시 뽑기가 싸움마다 한 번 무료', cost: 25 },
  { id: 'p_cap', name: '넉넉한 군량', desc: '부대 한도 +1 로 출발합니다', cost: 40 },
  { id: 'p_relic', name: '집안의 가보', desc: '무작위 보물 하나를 들고 출발합니다', cost: 50 },
];
export const has = id => !!meta.unlocked[id];
export function buyUnlock(id) { const u = UNLOCKS.find(x => x.id === id); if (!u || has(id) || meta.merit < u.cost) return false; meta.merit -= u.cost; meta.unlocked[id] = true; save(); return true; }
// 장군·검객·명궁은 처음부터 고를 수 있다
export const FREE_HEROES = ['commander', 'blade', 'hunter'];
export const heroOpen = h => FREE_HEROES.includes(h) || has(h);
const BASE_TYPES = ['sword', 'shield', 'spear', 'xbow', 'priest', 'knight', 'wizard'];
export const unitPool = () => BASE_TYPES.concat(['berserk', 'cannon'].filter(has), BEAST_TYPES.filter(has));
// ───────── 영물의 인연: 원정을 거듭하며 공을 쌓으면 영물이 군대에 합류한다 ─────────
// deed = 세는 공(tales 는 들은 옛이야기 수, 나머지는 meta.deeds 에 쌓인다), need = 채워야 하는 수
export const BEASTS = [
  { id: 'magpie', deed: 'tales', need: 3, how: '주막에서 옛이야기 세 편을 듣는다', lore: '반가운 이야기가 모이는 곳에 까치가 든다' },
  { id: 'sapsal', deed: 'boss', need: 2, how: '두목을 두 번 물리친다', lore: '귀신을 쫓아낸 군대를 삽살개가 따른다' },
  { id: 'samjoko', deed: 'night', need: 5, how: '밤 싸움을 다섯 번 이긴다', lore: '어둠을 견딘 군대에 해의 새가 내려앉는다' },
  { id: 'tiger', deed: 'elite', need: 4, how: '강적을 네 번 물리친다', lore: '센 놈을 꺾은 군대를 산군이 알아본다' },
  { id: 'haetae', deed: 'safe', need: 1, how: '깃발 셋을 모두 지닌 채 두목을 물리친다', lore: '지킬 줄 아는 군대 앞에 해태가 선다' },
];
export const deedCount = b => b.deed === 'tales' ? (meta.tales || []).length : (meta.deeds && meta.deeds[b.deed]) || 0;
// 공을 하나 적고(kind 없이 부르면 확인만), 그 공으로 새로 인연을 맺은 영물들을 돌려준다
export function noteDeed(kind, n = 1) {
  if (kind) { if (!meta.deeds) meta.deeds = {}; meta.deeds[kind] = (meta.deeds[kind] || 0) + n; }
  const fresh = BEASTS.filter(b => !has(b.id) && deedCount(b) >= b.need); for (const b of fresh) meta.unlocked[b.id] = true;
  if (kind || fresh.length) save(); return fresh;
}
export const HARD_DESC = ['', '요괴 체력 +8%', '요괴 체력 +16%, 수 +5%', '요괴 체력 +24%, 수 +10%', '요괴 체력 +32%, 수 +15%', '요괴 체력 +40%, 수 +20%'];

// ───────── 원정 시작 ─────────
export function newRun(hero) {
  const r = G.run = { hero, ch: 0, flags: 3, gold: has('p_gold') ? 60 : 0, deck: [], nextId: 1, items: [], relics: [], cap: 5 + (has('p_cap') ? 1 : 0) + (hero === 'commander' ? 1 : hero === 'blade' || hero === 'archmage' ? -1 : 0), wins: 0, merit: 0, kills: 0, lost: 0, bosses: 0, hard: Math.min(meta.hard || 0, meta.hardMax || 0), road: null, pending: null, evSeen: [], burns: 0, nextMorale: 0, seen: {}, mastery: {} };
  for (const c of starterDeck(hero)) r.deck.push(Object.assign({ uid: r.nextId++ }, c));
  if (has('p_relic')) { const id = pick(relicPool()); if (id) r.relics.push(id); }
  r.road = genRoad(0); meta.runs++;
  save(); return r;
}
export const cardOf = uid => G.run.deck.find(c => c.uid === uid) || null;
export const unitCards = () => G.run.deck.filter(isUnit);
export const ownedTypes = () => [...new Set(unitCards().filter(c => CARDS[c.id].kind === 'unit').map(c => CARDS[c.id].unit))];
// 이끄는 영웅의 병법이 원정의 규칙을 바꾼다 (설명은 data/units.js 의 HERO_TRAIT)
const TRAIT = {
  commander: m => { m.rally = 1; }, blade: m => { m.heroLoot = 1; m.heroAtk *= 1.3; m.heroHp *= 1.3; }, hunter: m => { m.lootEvery = 2; }, bishop: m => { m.keepSupport = 1; },
  archmage: m => { m.cardPow *= 1.3; m.pouch += 4; m.startCard = 1; m.tacDisc = 1; }, sangsoe: m => { m.scavAny = 1; }, chief: m => { m.killGold = 5; m.shopCard = 0.5; },
};
export function mods() { const r = G.run, m = Object.assign({}, DEFAULT_MODS); m.unit = {}; for (const id of r.relics) RELICS[id].mod(m); if (TRAIT[r.hero]) TRAIT[r.hero](m); return m; }
// ───────── 패의 살림: 전술 패는 쓰면 사라지고, 길 위에서 새로 얻는다 ─────────
export const tacticCards = () => G.run.deck.filter(c => !isUnit(c) && CARDS[c.id].kind !== 'curse');
export const pouchCap = () => mods().pouch;
// 전장에서 줍는 패: 흔한 패가 자주, 이끄는 영웅의 영웅기도 섞인다
export function lootTable() { const r = G.run; return cardPool().map(id => [id, CARDS[id].hero ? (CARDS[id].hero === r.hero ? 5 : 3) : [10, 5, 2][CARDS[id].rare || 0]]); }
// 싸움에서 쓴 패를 덱에서 지우고, 싸움에서 얻은 패와 엽전을 더한다 (전투 시뮬레이션은 원정 상태를 모른다)
export function settleBattle(b) {
  const r = G.run;
  if (b.spent.length) { const gone = new Set(b.spent); r.deck = r.deck.filter(c => !gone.has(c.uid)); b.spent.length = 0; }
  if (b.gained.length) { for (const c of b.gained) { c.uid = r.nextId++; const d = { uid: c.uid, id: c.id, up: !!c.up, lv: 1 }; if (c.free) d.free = 1; r.deck.push(d); } b.gained.length = 0; }
  if (b.goldGain) { r.gold += b.goldGain; b.goldGain = 0; }
}
// 강적·두목의 짐에서 패를 턴다
export function grantLoot(n) { const t = lootTable(), sum = t.reduce((a, q) => a + q[1], 0), out = []; for (let k = 0; k < n; k++) { let w = rnd() * sum, id = t[0][0]; for (const q of t) if ((w -= q[1]) < 0) { id = q[0]; break; } addCard(id); out.push(CARDS[id].name); } return out; }
// 한 종류의 전술 패를 익힌다: 지금 가진 것과 앞으로 얻는 것이 모두 강화판(+)이 된다
export function master(id) { const r = G.run; if (!r.mastery) r.mastery = {}; r.mastery[id] = true; for (const c of r.deck) if (c.id === id) c.up = true; save(); }
export const mastered = id => !!(G.run.mastery && G.run.mastery[id]);
export function unitStats(type, lvl, wpn) { const d = defOf(type, wpn), m = lvlMult(lvl || 1); return { hp: Math.round(d.hp * m * PACE), atk: Math.round((d.atk || d.heal || 0) * m), as: d.as, n: d.n }; }
export const depth = () => { const r = G.run; return r.ch * 6 + Math.min(5, r.road ? r.road.i : 0); };
export const powerNow = () => 1 + 0.085 * depth();

// ───────── 노정: 한 고개에서 차례로 만나는 것들 ─────────
// 지도를 펼쳐 고르지 않는다. 길을 걷다 보면 차례로 만나고, 갈림길에서는 길가 푯말 둘 중 하나를 고른다
export const STOP = {
  battle: { ch: '戰', name: '싸움', col: '#2f4d7e' }, elite: { ch: '强', name: '강적', col: '#c8402f' }, event: { ch: '?', name: '사건', col: '#6a5a8a' },
  shop: { ch: '場', name: '장터', col: '#b8742a' }, rest: { ch: '酒', name: '주막', col: '#2f6f5c' }, treasure: { ch: '寶', name: '보물', col: '#b8862a' }, boss: { ch: '頭', name: '두목', col: '#7a1f1c' }, fork: { ch: '岐', name: '갈림길', col: '#5a5346' },
};
const FORK_DESC = { battle: '요괴 무리가 지키는 길', elite: '강적이 버티는 험한 길 — 보물을 지키고 있다', event: '무언가 기다리는 샛길', shop: '장이 서는 길', treasure: '옛 보물이 묻혔다는 길' };
export function genRoad(ch) {
  const side = () => pick(['event', 'event', 'shop', 'treasure']), two = () => { const a = side(); let b = side(); for (let g = 0; b === a && g < 9; g++) b = pick(['event', 'shop', 'battle']); return [a, b]; };
  const [a, b] = two(), safe = pick(['event', 'shop', 'treasure']);
  const stops = [{ type: 'battle' }, { type: 'fork', a: { type: a }, b: { type: b } }, { type: 'battle' }, { type: 'fork', a: { type: 'elite' }, b: { type: safe } }, { type: 'battle' }, { type: 'rest' }, { type: 'boss' }];
  return { ch, stops, i: 0, state: 'march' };
}
export const forkDesc = t => FORK_DESC[t] || '';
export const curStop = () => { const rd = G.run.road; return rd.stops[rd.i]; };
// 싸움 칸에 닿았을 때 편성을 정한다 (다시 불러와도 같은 편성)
export function encounterHere() {
  const r = G.run, st = curStop(); if (!st.enc) { st.enc = genEncounter(r.ch, Math.min(4, r.road.i), st.type, rnd, r.hard); save(); }
  return st.enc;
}
export function chooseFork(which) { const rd = G.run.road, st = rd.stops[rd.i]; if (st.type !== 'fork') return; rd.stops[rd.i] = which === 'a' ? st.a : st.b; save(); }
// 지금 칸을 끝내고 다음 칸으로. 두목을 물리쳤으면 다음 고개로 넘어간다. 원정이 끝났으면 true
export function advance() {
  const r = G.run, rd = r.road, st = rd.stops[rd.i]; r.pending = null;
  meta.best = Math.max(meta.best, r.ch * 7 + rd.i + 1);
  if (st.type === 'boss') {
    r.bosses++; r.ch++; if (r.ch >= 3) { r.done = true; save(); return true; }
    // 고개를 넘으면: 깃발 하나를 되찾고, 부대 한도가 늘고, 모든 병력·영웅 패가 한 단계 단련된다
    r.flags = Math.min(3, r.flags + 1); r.cap = Math.min(MAX_CAP, r.cap + 1); for (const c of r.deck) if (isUnit(c) && (c.lv || 1) < MAX_LV) c.lv = (c.lv || 1) + 1;
    r.road = genRoad(r.ch);
  }
  else { rd.i++; rd.state = 'march'; }
  save(); return false;
}

// ───────── 싸움 준비 ─────────
// 원정을 시작하거나 이어 할 때 전장에 미리 서 있는 부대: 영웅과 병력 패 셋
export function startDeploy() {
  const r = G.run, out = [], lead = r.deck.find(c => CARDS[c.id].kind === 'lead'); if (lead) out.push([lead.uid, 330, MID_Y]);
  const units = r.deck.filter(c => CARDS[c.id].kind === 'unit').slice(0, Math.min(3, r.cap)), front = units.filter(c => !UNITS[CARDS[c.id].unit].soft), back = units.filter(c => UNITS[CARDS[c.id].unit].soft);
  front.forEach((c, n) => out.push([c.uid, 450, MID_Y + (n - (front.length - 1) / 2) * 150]));
  back.forEach((c, n) => out.push([c.uid, 210, MID_Y + (n - (back.length - 1) / 2) * 170 + (back.length % 2 ? 110 : 0)]));
  return out;
}
export function battleSetup(seed) { const r = G.run; return { mods: mods(), seed: seed || ((rnd() * 1e9) | 0), power: powerNow(), deck: r.deck, cap: r.cap, start: startDeploy(), morale: r.nextMorale || 0, loot: lootTable(), mastery: r.mastery || {}, lead: r.hero }; }
export function waveSetup(enc) { const r = G.run, foe = Object.assign({}, enc.foe || {}); foe.hp = (foe.hp || 1) * (1 + 0.08 * r.hard); return { foe, lvl: enc.lvl, terrain: enc.terrain, sky: enc.sky, chase: enc.chase }; }
export function goldFor(grade, kind) { const m = mods(); return Math.round((26 + grade * 8 + (kind === 'boss' ? 40 : kind === 'elite' ? 18 : 0)) * m.gold * (1 - 0.05 * G.run.hard) + m.goldFlat); }

// ───────── 패 다루기 ─────────
export function addCard(id, o = {}) { const r = G.run, c = { uid: r.nextId++, id, up: !!o.up || mastered(id), lv: o.lv || 1 }; r.deck.push(c); save(); return c; }
export function removeCard(uid) { const d = G.run.deck, i = d.findIndex(c => c.uid === uid); if (i < 0 || d.length <= 6 || CARDS[d[i].id].kind === 'lead') return null; const c = d.splice(i, 1)[0]; if (c.wpn) G.run.items.push(c.wpn); save(); return c; }
export const canUp = c => isUnit(c) ? (c.lv || 1) < MAX_LV : !mastered(c.id) && CARDS[c.id].kind !== 'curse';
// 전술 패는 익히기(그 종류가 모두 +), 병력·영웅 패는 조련(Lv +1: 체력·공격력 +20%)
export function upgradeCard(uid) { const c = cardOf(uid); if (!c || !canUp(c)) return null; if (isUnit(c)) { c.lv = (c.lv || 1) + 1; save(); } else master(c.id); return c; }
// 영웅기 패는 덱에 그 영웅 패가 있을 때만 나온다
export function cardPool() { const hs = G.run.deck.filter(c => CARDS[c.id].kind === 'lead').map(c => CARDS[c.id].unit); return Object.keys(CARDS).filter(id => !isUnit({ id }) && CARDS[id].kind !== 'curse' && (!CARDS[id].hero || hs.includes(CARDS[id].hero))); }
export function rollCards(kind, n = 3, keys) {
  const pool = cardPool().filter(id => !keys || !keys.has('cd' + id)), out = [], upP = kind === 'boss' ? 1 : kind === 'elite' ? 0.3 : kind === 'shop' ? 0.15 : 0.08;
  const w = id => CARDS[id].hero ? 4 : [10, 7, 3][CARDS[id].rare || 0] + (kind === 'boss' || kind === 'elite' ? (CARDS[id].rare || 0) * 2 : 0);
  for (let g = 0; out.length < n && g < 60; g++) { let x = rnd() * pool.reduce((a, id) => a + w(id), 0), id = pool[0]; for (const c of pool) { if ((x -= w(c)) < 0) { id = c; break; } } if (!id || out.some(o => o.id === id)) continue; out.push({ id, up: rnd() < upP }); }
  return out;
}

// ───────── 무기 ─────────
export const usersOf = wid => Object.keys(ARMS).filter(t => canEquip(t, wid)).map(t => UNITS[t].name);
export function weaponPool() { const types = [...new Set(unitCards().map(c => CARDS[c.id].unit))]; return LOOT_WEAPONS.filter(w => types.some(t => canEquip(t, w))); }
export const weaponOf = c => c.wpn || (ARMS[CARDS[c.id].unit] ? ARMS[CARDS[c.id].unit].base : null);
// 병력 패에 무기를 끼운다 (wid 가 없으면 기본 무기로). 쓰던 무기는 보관함으로 돌아간다
export function equip(uid, wid) {
  const r = G.run, c = cardOf(uid); if (!c || !isUnit(c)) return false;
  if (wid) { const i = r.items.indexOf(wid); if (i < 0 || !canEquip(CARDS[c.id].unit, wid)) return false; r.items.splice(i, 1); }
  if (c.wpn) r.items.push(c.wpn);
  if (wid) c.wpn = wid; else delete c.wpn;
  save(); return true;
}

// ───────── 전리품: 셋 중 하나 ─────────
export function relicPool() { const r = G.run, own = r ? ownedTypes() : []; return Object.keys(RELICS).filter(id => !RELICS[id].curse && !(r && r.relics.includes(id)) && (!RELICS[id].req || own.includes(RELICS[id].req))); }
export function describeReward(o) {
  if (o.kind === 'card') { const d = CARDS[o.id], u = isUnit(o); return { title: u ? (d.kind === 'lead' ? '영웅 합류' : '의병 모집') : '전술 패', n: o.n || 1, name: cardName(o) + (o.n > 1 ? ` ×${o.n}` : ''), desc: u ? `${d.name} 패를 덱에 넣습니다. ${UNITS[d.unit].tip}` : d.desc(Object.assign({}, d.v, o.up ? d.up : {})), col: u ? 'blue' : 'purple', card: o }; }
  if (o.kind === 'train') { const c = cardOf(o.uid) || { id: o.id, lv: 1 }, d = CARDS[c.id], l = c.lv || 1; return { title: '조련', name: `${d.name} Lv${l} → Lv${l + 1}`, desc: `이 패의 부대 체력과 ${UNITS[d.unit].heal ? '치유량' : '공격력'} +20%`, col: 'green', card: Object.assign({}, c, { lv: l + 1 }) }; }
  if (o.kind === 'upgrade') { const d = CARDS[o.id]; return { title: '전술 익히기', name: `${d.name} → ${d.name}+`, desc: `가진 것과 앞으로 얻는 [${d.name}] 이 모두 강화판이 됩니다.\n` + d.desc(Object.assign({}, d.v, d.up)), col: 'green', card: { id: o.id, up: true } }; }
  if (o.kind === 'supply') return { title: '보급', name: '기본 패 꾸러미', desc: o.ids.map(id => CARDS[id].name).join(' · ') + '\n흔하지만 쓸모 있는 패 넉 장', col: 'green', misc: 'supply', ids: o.ids };
  if (o.kind === 'relic') { const x = RELICS[o.id]; return { title: '보물', name: x.name, desc: x.desc, col: 'gold', relic: o.id }; }
  if (o.kind === 'weapon') { const w = WEAPONS[o.id]; return { title: '무기', name: w.name, desc: `${w.desc}\n${CLS_NAME[w.cls]} — ${usersOf(o.id).join('·')}`, col: 'blue', weapon: o.id }; }
  if (o.kind === 'cleanse') return { title: '부정 씻기', name: RELICS[o.id].name, desc: `부정 [${RELICS[o.id].name}] 을 씻어냅니다. (${RELICS[o.id].desc})`, col: 'gold', relic: o.id };
  if (o.kind === 'burn') return { title: '패 태우기', name: '패 한 장 없애기', desc: '덱에서 패 한 장을 골라 없앱니다. 덱이 얇을수록 좋은 패가 자주 손에 들어옵니다.', col: 'red', misc: 'burn' };
  if (o.kind === 'trainPick') return { title: '조련장', name: '병력 패 조련', desc: '병력·영웅 패 한 장을 골라 Lv +1 (체력·공격력 +20%)', col: 'green', misc: 'train' };
  return { title: '군량 수레', name: '부대 한도 +1', desc: `전장에 한꺼번에 세울 수 있는 부대가 ${G.run.cap} → ${G.run.cap + 1}개로 늘어납니다.`, col: 'gold', misc: 'cap' };
}
function makeReward(kind, keys) {
  const r = G.run, types = unitPool(), owned = ownedTypes();
  if (kind === 'unit') { const fresh = types.filter(t => !owned.includes(t)); const t = fresh.length && rnd() < 0.6 ? pick(fresh) : pick(types); return { kind: 'card', id: 'u_' + t, lv: 1, key: 'cd' + 'u_' + t }; }
  if (kind === 'lead') { const hs = HEROES.filter(h => !r.deck.some(c => c.id === 'h_' + h)); if (!hs.length) return null; const h = pick(hs); return { kind: 'card', id: 'h_' + h, lv: 1, key: 'cd' + 'h_' + h }; }
  if (kind === 'tactic') { const o = rollCards(keys.kind || 'battle', 1, keys)[0]; return o ? { kind: 'card', id: o.id, up: o.up, n: packN(o.id), key: 'cd' + o.id } : null; }
  if (kind === 'supply') return { kind: 'supply', ids: ['sling', 'sling', 'rain', pick(['heal', 'heal', 'horn', 'scout'])], key: 'supply' };
  if (kind === 'train') { const c = unitCards().filter(c => (c.lv || 1) < MAX_LV && !keys.has('tr' + c.uid)); if (!c.length) return null; const x = pick(c); return { kind, uid: x.uid, id: x.id, key: 'tr' + x.uid }; }
  if (kind === 'upgrade') { const c = r.deck.filter(c => !isUnit(c) && canUp(c) && !keys.has('up' + c.id)); if (!c.length) return null; const x = pick(c); return { kind, id: x.id, key: 'up' + x.id }; }
  if (kind === 'relic') { const pool = relicPool().filter(id => !keys.has('rl' + id)); if (!pool.length) return null; const id = pick(pool); return { kind, id, key: 'rl' + id }; }
  if (kind === 'weapon') { const pool = weaponPool().filter(id => !keys.has('wp' + id)); if (!pool.length) return null; const fresh = pool.filter(id => !r.items.includes(id) && !r.deck.some(q => q.wpn === id)); const id = pick(fresh.length ? fresh : pool); return { kind, id, key: 'wp' + id }; }
  if (kind === 'cap') { if (r.cap >= MAX_CAP) return null; return { kind: 'cap', key: 'cap' }; }
  return null;
}
const TABLE = [['unit', 18], ['tactic', 30], ['supply', 10], ['train', 15], ['upgrade', 8], ['weapon', 9], ['relic', 8], ['cap', 4], ['lead', 3]];
export function rollRewards(kind) {
  const r = G.run, out = [], keys = new Set(), total = TABLE.reduce((a, t) => a + t[1], 0); keys.kind = kind;
  const few = unitCards().length < 7;
  const solo = r.deck.filter(c => CARDS[c.id].kind === 'lead').length < 2;
  const forced = kind === 'boss' ? [solo ? 'lead' : 'relic', 'relic', 'relic'] : kind === 'treasure' ? ['relic', 'relic', 'relic'] : kind === 'elite' ? ['relic', 'weapon', null] : [few ? 'unit' : null, 'tactic', null];
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
  if (o.kind === 'card') { for (let k = 0; k < (o.n || 1); k++) addCard(o.id, { up: o.up, lv: o.lv }); }
  else if (o.kind === 'supply') { for (const id of o.ids) addCard(id); }
  else if (o.kind === 'train') upgradeCard(o.uid);
  else if (o.kind === 'upgrade') master(o.id);
  else if (o.kind === 'relic') r.relics.push(o.id);
  else if (o.kind === 'weapon') r.items.push(o.id);
  else if (o.kind === 'cleanse') r.relics = r.relics.filter(id => id !== o.id);
  else if (o.kind === 'burn') r.burns = (r.burns || 0) + 1;
  else if (o.kind === 'cap') r.cap = Math.min(MAX_CAP, r.cap + 1);
  save();
}
// 전리품 화면의 상태 (다시 불러와도 같은 선택지)
export function openReward(kind) { const r = G.run; if (!r.pending || r.pending.kind !== 'reward') r.pending = { kind: 'reward', of: kind, opts: rollRewards(kind), rerolls: 0, free: has('p_reroll') ? 1 : 0 }; save(); return r.pending; }

// ───────── 장터 ─────────
export function genShop() {
  const r = G.run, items = [], keys = new Set(); keys.kind = 'shop';
  const add = (kind, price) => { for (let g = 0; g < 20; g++) { const o = makeReward(kind, keys); if (o && !keys.has(o.key)) { keys.add(o.key); items.push(Object.assign(o, { price, sold: false })); return; } } };
  add('unit', 0); add('tactic', 0); add('tactic', 0); add('tactic', 0); add('supply', 34); add('relic', 90 + r.ch * 10); add('weapon', 56 + r.ch * 6);
  const curse = r.relics.find(id => RELICS[id].curse);
  if (curse) items.push({ kind: 'cleanse', id: curse, key: 'cl', price: 45, sold: false }); else items.push({ kind: 'trainPick', key: 'tp', price: 56 + r.ch * 8, sold: false });
  const k = mods().shopCard;
  for (const it of items) { if (it.kind === 'card') { const d = CARDS[it.id]; it.price = isUnit(it) ? 34 + d.cost * 10 : Math.round(((d.hero ? 44 : [30, 38, 46][d.rare || 0]) + (it.up ? 14 : 0)) * k); } else if (it.kind === 'supply') it.price = Math.round(it.price * k); }
  return items;
}
export function buyItem(it) { const r = G.run; if (!it || it.sold || r.gold < it.price) return false; r.gold -= it.price; it.sold = true; applyReward(it); return true; }

// ───────── 사건에서 쓰는 도우미 ─────────
export const EVENT_IDS = ['ssireum', 'axe', 'shrine', 'peddler', 'lost', 'bangmangi', 'boar', 'well', 'smith', 'sansam', 'fox', 'jangseung', 'scholar', 'tomb'];
const EVENT_MIN = { well: 1, tomb: 1 };
export function pickEvent() { const r = G.run, pool = EVENT_IDS.filter(e => !r.evSeen.includes(e) && (EVENT_MIN[e] || 0) <= r.ch), ev = pick(pool.length ? pool : EVENT_IDS); r.evSeen.push(ev); return ev; }
const lvUp = c => { c.lv = (c.lv || 1) + 1; return `${CARDS[c.id].name} Lv${c.lv}`; };
export const act = {
  gold(n) { const r = G.run; r.gold = Math.max(0, r.gold + n); return n >= 0 ? `엽전 +${n}` : `엽전 ${n}`; },
  flag(n) { const r = G.run; if (n > 0) { if (r.flags >= 3) { r.gold += 40; return '깃발이 가득해 엽전 +40'; } r.flags++; return '깃발 +1'; } if (r.flags > 1) { r.flags--; return '깃발 -1'; } return act.gold(-50); },
  relic(id) { const r = G.run; if (!id || r.relics.includes(id)) id = pick(relicPool()); if (!id) return act.gold(60); r.relics.push(id); return `보물 [${RELICS[id].name}] — ${RELICS[id].desc}`; },
  curse() { const r = G.run, pool = CURSES.filter(id => !r.relics.includes(id)); if (!pool.length) return act.gold(-20); const id = pick(pool); r.relics.push(id); return `부정 [${RELICS[id].name}] — ${RELICS[id].desc}`; },
  cleanse() { const r = G.run, id = r.relics.find(x => RELICS[x].curse); if (!id) return null; r.relics = r.relics.filter(x => x !== id); return `부정 [${RELICS[id].name}] 이 씻겨 나갔습니다`; },
  train(filter) { const c = unitCards().filter(c => CARDS[c.id].kind === 'unit' && (c.lv || 1) < MAX_LV && (!filter || filter(UNITS[CARDS[c.id].unit]))); if (!c.length) return act.hero(); return lvUp(pick(c)); },
  recruit() { const o = makeReward('unit', new Set()); if (!o) return act.gold(40); addCard(o.id); return `병력 패 [${CARDS[o.id].name}] 을 얻었습니다`; },
  hero() { const c = G.run.deck.filter(c => CARDS[c.id].kind === 'lead' && (c.lv || 1) < MAX_LV); if (!c.length) return act.gold(40); return lvUp(c[0]); },
  cap(n) { const r = G.run; r.cap = Math.max(3, Math.min(MAX_CAP, r.cap + n)); return n > 0 ? `부대 한도 +${n}` : `부대 한도 ${n}`; },
  morale(n) { G.run.nextMorale = n; return `다음 싸움을 사기 +${n} 로 시작`; },
  weapon(id) { const r = G.run; if (!id) { const pool = weaponPool(), fresh = pool.filter(w => !r.items.includes(w) && !r.deck.some(q => q.wpn === w)); id = pick(fresh.length ? fresh : pool); } if (!id) return act.gold(40); r.items.push(id); return `무기 [${WEAPONS[id].name}] — ${WEAPONS[id].desc}`; },
  card(id, up, n = 2) { if (!id) id = rollCards('battle', 1)[0].id; for (let k = 0; k < n; k++) addCard(id, { up }); return `패 [${CARDS[id].name}${up || mastered(id) ? '+' : ''}] ${n}장을 얻었습니다`; },
  cardUp() { const d = G.run.deck.filter(c => !isUnit(c) && canUp(c)); if (!d.length) return act.gold(30); const c = pick(d); master(c.id); return `전술을 익혔습니다: [${CARDS[c.id].name}] → [${CARDS[c.id].name}+]`; },
  supply(n) { const got = []; for (let k = 0; k < n; k++) { const id = pick(['sling', 'sling', 'rain', 'rain', 'heal', 'heal', 'horn', 'scout']); addCard(id); got.push(CARDS[id].name); } return `패 ${n}장: ${got.join(', ')}`; },
  doubt() { addCard('doubt'); return '부정 -1: 덱에 쓸모없는 패 [잡념] 이 섞였습니다'; },
  clearDoubt() { const d = G.run.deck, i = d.findIndex(c => c.id === 'doubt'); if (i < 0) return null; d.splice(i, 1); return '덱에서 [잡념] 이 사라졌습니다'; },
};

// ───────── 원정 끝: 공적 정산 ─────────
export function settleRun(win) {
  const r = G.run; if (!r || r.settled) return r ? r.gain || 0 : 0;
  const gain = Math.round((r.merit + r.bosses * 6 + (win ? 15 : 0)) * (1 + 0.25 * r.hard));
  meta.merit += gain; r.settled = true; r.gain = gain;
  if (win) { meta.clears++; meta.hardMax = Math.min(5, Math.max(meta.hardMax || 0, r.hard + 1)); }
  save(); return gain;
}
