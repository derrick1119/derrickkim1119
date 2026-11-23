// 원정(런) 상태: 덱(병력·영웅·전술 패), 노정(길 위에서 차례로 만나는 것들), 전리품, 장터, 공적(원정 사이 성장), 저장
import { UNITS, HEROES, lvlMult, squadN, BEAST_TYPES } from './data/units.js';
import { RELICS, CURSES } from './data/relics.js';
import { genEncounter, AFFIX } from './data/encounters.js';
import { DEFAULT_MODS, PACE, MAX_CAP, defOf } from './sim/battle.js';
import { CARDS, MAX_LV, starterDeck, cardName, isUnit, packN } from './data/cards.js';
import { WEAPONS, ARMS, LOOT_WEAPONS, CLS_NAME, canEquip, applySets, setProgress } from './data/weapons.js';
import { branchOf, canBranch } from './data/branches.js';
import { VIEW, MID_Y } from './config.js';
import { TALES, TALE_BY_ID } from './data/story.js';
import { N_CH, chapterOf } from './data/stages.js';
import { masteryLv, paceAt, UNLOCK_PACE, DAILY_RULES, dayRng, today, VOWS, vowBonus } from './data/progress.js';
import { FORM_ORDER } from './data/formations.js';
import { FEATS } from './data/feats.js';
import { QUIZ } from './data/quiz.js';

const KEY = 'gogae.save.v4';
export const meta = { best: 0, clears: 0, runs: 0, merit: 0, unlocked: {}, hard: 0, hardMax: 0, seen: {}, tales: [], deeds: {}, heroXp: {}, alt: {}, daily: {}, codex: { foe: {}, relic: {}, card: {} } };
export const G = { run: null };
// 원정의 씨앗: 길·전리품·사건·장터가 씨앗(r.seed)을 따라 정해진다. 상태(r.rs)를 저장하므로 이어 해도 같은 길이 이어진다
// 오늘의 원정은 날짜로 씨앗을 정해 모두가 같은 길을 걷고, 끝 화면의 씨앗 글자를 영웅 고르기에 넣으면 그 길을 다시 걷는다
const rnd = () => { const r = G.run; if (!r || r.rs == null) return Math.random(); let t = (r.rs = (r.rs + 0x6D2B79F5) >>> 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
export const runRnd = rnd;
const SEED_ABC = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';   // 헷갈리는 0·1·I·O 는 뺀다
export const seedCode = n => { let s = ''; n = n >>> 0; for (let i = 0; i < 7; i++) { s = SEED_ABC[n % 32] + s; n = Math.floor(n / 32); } return s.slice(0, 3) + '-' + s.slice(3); };
export const parseSeed = code => { const s = String(code || '').toUpperCase().replace(/[^0-9A-Z]/g, ''); if (s.length !== 7) return null; let n = 0; for (const ch of s) { const v = SEED_ABC.indexOf(ch); if (v < 0) return null; n = n * 32 + v; } return n >>> 0; };
const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const pick = arr => arr[(rnd() * arr.length) | 0];

export function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || 'null');
    // 원정을 이어 하면: 깃발·수레 체력은 없어졌고(전군이 무너지면 끝), 영웅은 고른 한 명뿐
    if (d) { Object.assign(meta, d.meta || {}); G.run = d.run && !d.run.done && !d.run.fallen && !(d.run.flags === 0) ? d.run : null; if (G.run) { delete G.run.flags; G.run.deck = G.run.deck.filter(c => CARDS[c.id].kind !== 'lead' || c.id === 'h_' + G.run.hero); } }
    else for (const k of ['gogae.save.v3', 'gogae.save.v2']) { const old = JSON.parse(localStorage.getItem(k) || 'null'); if (old && old.meta) { Object.assign(meta, old.meta); break; } } // 예전 저장: 공적·이야기책만 잇는다 (패 규칙이 바뀌어 하던 원정은 버린다)
  } catch (e) { /* 저장소 없음 */ }
  // 해금 속도: 예전 저장은 시작한 원정 수만큼 끝낸 것으로 친다
  if (meta.ended == null) meta.ended = meta.runs || 0;
  for (const k of ['heroXp', 'alt', 'daily']) if (!meta[k]) meta[k] = {};
  if (!meta.codex) meta.codex = {}; for (const k of ['foe', 'relic', 'card']) if (!meta.codex[k]) meta.codex[k] = {};
}
// 도감: 덱에 들어온 패와 지닌 보물을 적어 둔다 (요괴는 싸움터에 나타날 때 seeFoe)
export function noteCodex() { const r = G.run, cx = meta.codex; if (!r || !cx) return; for (const c of r.deck) cx.card[c.id] = 1; for (const id of r.relics) cx.relic[id] = 1; }
export function seeFoe(type) { if (meta.codex && !meta.codex.foe[type]) { meta.codex.foe[type] = 1; return true; } return false; }
export function save() { noteCodex(); try { localStorage.setItem(KEY, JSON.stringify({ meta, run: G.run })); } catch (e) { /* 무시 */ } }

// ───────── 주막의 옛이야기: 아직 못 들은 것부터, 지금 고개의 이야기를 먼저 ─────────
export function hearTale(ch) {
  // 주막에서는 그 고개의 옛이야기를 듣는다 (두목의 수를 귀띔해 준다)
  ch = ch % N_CH; const got = meta.tales || (meta.tales = []), t = TALES.find(x => x.ch === ch && !got.includes(x.id));
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
  { id: 'p_cap', name: '넉넉한 군량', desc: '부대 한도 +1로 출발합니다', cost: 40 },
  { id: 'p_relic', name: '집안의 가보', desc: '무작위 보물 하나를 들고 출발합니다', cost: 50 },
];
export const has = id => !!meta.unlocked[id];
export function buyUnlock(id) { const u = UNLOCKS.find(x => x.id === id); if (!u || has(id) || meta.merit < u.cost) return false; meta.merit -= u.cost; meta.unlocked[id] = true; save(); return true; }
// 장군·검객·명궁은 처음부터 고를 수 있다
export const FREE_HEROES = ['commander', 'blade', 'hunter'];
export const heroOpen = h => FREE_HEROES.includes(h) || has(h);
const BASE_TYPES = ['sword', 'shield', 'spear', 'xbow', 'priest', 'knight', 'wizard'];
// (영물은 전리품·장터에 나오지 않는다: 저마다의 인연 사건으로만 합류한다)
export const unitPool = () => BASE_TYPES.concat(['berserk', 'cannon'].filter(has));
// ───────── 영물의 인연: 원정을 거듭하며 공을 쌓으면 영물이 군대에 합류한다 ─────────
// deed = 세는 공(tales 는 들은 옛이야기 수, 나머지는 meta.deeds 에 쌓인다), need = 채워야 하는 수
export const BEASTS = [
  { id: 'magpie', deed: 'tales', need: 3, how: '주막에서 옛이야기 세 편을 듣는다', lore: '반가운 이야기가 모이는 곳에 까치가 든다' },
  { id: 'sapsal', deed: 'boss', need: 5, how: '두목을 다섯 번 물리친다', lore: '귀신을 쫓아낸 군대를 삽살개가 따른다' },
  { id: 'samjoko', deed: 'night', need: 8, how: '밤 싸움을 여덟 번 이긴다', lore: '어둠을 견딘 군대에 해의 새가 내려앉는다' },
  { id: 'tiger', deed: 'elite', need: 6, how: '강적을 여섯 번 물리친다', lore: '센 놈을 꺾은 군대를 산군이 알아본다' },
  { id: 'haetae', deed: 'safe', need: 1, how: '부대를 하나도 잃지 않고 두목을 물리친다', lore: '지킬 줄 아는 군대 앞에 해태가 선다' },
];
export const deedCount = b => b.deed === 'tales' ? (meta.tales || []).length : (meta.deeds && meta.deeds[b.deed]) || 0;
// 공을 하나 적고(kind 없이 부르면 확인만), 그 공으로 새로 인연을 맺은 영물들을 돌려준다
export function noteDeed(kind, n = 1) {
  if (kind) { if (!meta.deeds) meta.deeds = {}; meta.deeds[kind] = (meta.deeds[kind] || 0) + n; }
  const fresh = BEASTS.filter(b => !has(b.id) && deedCount(b) >= b.need); for (const b of fresh) meta.unlocked[b.id] = true;
  if (kind || fresh.length) save(); return fresh;
}
// 험로: 열두 고개를 평정할 때마다 한 단계씩 열리는 더 험한 길. 단계마다 규칙이 하나씩 붙고, 아래 단계의 규칙도 모두 따라온다
export const HARD = [
  null,
  { name: '거센 요괴', desc: '요괴 체력 +12%' },
  { name: '사나운 강적', desc: '강적이 더 큰 무리를 이끈다' },
  { name: '빈 주머니', desc: '전술 패 주머니 한도 -2' },
  { name: '독한 두목', desc: '두목 체력 +20%' },
  { name: '주린 길', desc: '엽전 수입 -20%' },
  { name: '날랜 발', desc: '요괴 이동 속도 +12%' },
  { name: '큰 무리', desc: '요괴 무리 +10%' },
  { name: '매운 손', desc: '요괴 공격력 +12%' },
  { name: '성난 본대', desc: '본대가 15초 일찍 따라붙는다' },
  { name: '끝없는 무리', desc: '요괴 무리가 더 커진다 (+20%)' },
  { name: '짙은 안개', desc: '원거리 사거리 -10%' },
  { name: '바가지 장', desc: '장터 값 +25%' },
  { name: '단단한 강적', desc: '강적 무리 체력 +25%' },
  { name: '더딘 손', desc: '손패가 15% 늦게 찬다' },
  { name: '두목의 분노', desc: '두목 체력 +20% 더' },
  { name: '부정 탄 길', desc: '부정 하나를 지고 떠난다' },
  { name: '꺼진 기세', desc: '사기 회복 -15%' },
  { name: '좁은 군막', desc: '부대 한도 -1로 떠난다' },
  { name: '쇠가죽 요괴', desc: '요괴 체력 +12% 더' },
  { name: '긴 밤의 끝', desc: '요괴 공격력 +12% 더' },
];
export const HARD_MAX = HARD.length - 1;
// 고개마다의 세기 (밸런스는 tools/campaign.mjs 로 맞춘다): 요괴 체력·공격력 배율, 두목의 체력 배율
// 요괴 무리의 병사 수와 두목의 세기도 고개를 따라 자란다 (우리 군대가 작게 시작해 커지는 만큼): 무리 크기 배율 / 두목 체력·공격 배율
export const ENEMY_N = [0.6, 0.62, 0.62, 0.66, 0.7, 0.72, 0.75, 0.8, 0.82, 0.87, 0.92, 0.96], BOSS_K = [0.44, 0.54, 0.44, 0.52, 0.6, 0.58, 0.64, 0.74, 0.68, 0.8, 0.84, 0.86];
export const CH_HP = [1, 1, 1, 1.12, 1.18, 1.23, 1.27, 1.36, 1.44, 1.51, 1.59, 1.67], CH_ATK = [1, 1, 1, 1.06, 1.09, 1.12, 1.16, 1.2, 1.24, 1.27, 1.31, 1.34], BOSS_HP = [1, 1, 1.18, 1.31, 1.21, 1.21, 1.31, 1.52, 1.37, 1.31, 1.68, 1.63];   // 4단계 분량(패·보물·장소)이 늘어 넷째 고개부터 조금 더 세다
const chN = ch => Math.max(0, Math.min(N_CH - 1, ch | 0));
export const hardOf = lv => ({ hp: (lv >= 1 ? 1.12 : 1) * (lv >= 19 ? 1.12 : 1), elite: lv >= 2 ? 1.2 : 1, pouch: lv >= 3 ? -2 : 0, boss: (lv >= 4 ? 1.2 : 1) * (lv >= 15 ? 1.2 : 1), gold: lv >= 5 ? 0.8 : 1, spd: lv >= 6 ? 1.12 : 1, crowd: lv >= 10 ? 1.2 : lv >= 7 ? 1.1 : 1, atk: (lv >= 8 ? 1.12 : 1) * (lv >= 20 ? 1.12 : 1), chase: lv >= 9 ? -15 : 0,
  // 11단계부터: 사거리 · 장터 값 · 강적 체력 · 손패 · 부정 · 사기 · 부대 한도
  range: lv >= 11 ? 0.9 : 1, price: lv >= 12 ? 1.25 : 1, eliteHp: lv >= 13 ? 1.25 : 1, draw: lv >= 14 ? 1.15 : 1, curse: lv >= 16 ? 1 : 0, morale: lv >= 17 ? 0.85 : 1, cap: lv >= 18 ? -1 : 0 });

// ───────── 원정 시작 ─────────
// 부대 한도는 처음엔 작게(셋) 잡고 고개를 넘을 때마다 하나씩 는다
// o.daily: 오늘의 원정 (날짜로 정한 영웅·규칙 둘, 험로·숙련·공적 해금 없이 모두 같은 조건)
export function newRun(hero, o = {}) {
  const day = o.daily ? dailyOf(o.daily) : null; if (day) hero = day.hero;
  const lv = day ? 1 : masteryLv((meta.heroXp || {})[hero]), alt = !day && lv >= 2 && !!(meta.alt || {})[hero], hard = day ? 0 : Math.min(meta.hard || 0, meta.hardMax || 0), h = hardOf(hard), perk = id => !day && has(id);
  const capK = hero === 'commander' ? 1 : !alt && (hero === 'blade' || hero === 'archmage') ? -1 : 0;   // 장군은 어느 병법이든 +1, 검객·신선의 -1 은 첫 병법의 몫
  const seed = (o.seed != null ? o.seed : day ? hashStr('gogae:' + day.date) : (Math.random() * 4294967296)) >>> 0;
  const r = G.run = { hero, alt, lv, seed, rs: seed, ch: 0, gold: (perk('p_gold') ? 60 : 0) + (lv >= 3 ? 40 : 0), deck: [], nextId: 1, items: [], relics: [], cap: Math.max(2, 3 + (perk('p_cap') ? 1 : 0) + capK + h.cap), wins: 0, merit: 0, kills: 0, lost: 0, bosses: 0, hard, road: null, pending: null, evSeen: [], burns: 0, nextMorale: 0, seen: {}, mastery: {} };
  if (day) r.daily = { date: day.date, rules: day.rules };
  r.vows = day ? [] : (o.vows || (meta.clears ? Object.keys(meta.vowSel || {}).filter(k => meta.vowSel[k] && VOWS[k]) : []));
  for (const c of starterDeck(hero).filter(c => !(r.vows.includes('bare') && !isUnit(c)))) r.deck.push(Object.assign({ uid: r.nextId++ }, c, CARDS[c.id].kind === 'lead' && lv >= 4 ? { lv: 2 } : {}));
  // 두 번째 병법·오늘의 규칙이 쥐여 주는 시작 패
  const give = (id, n, up) => { for (let k = 0; k < n; k++) r.deck.push({ uid: r.nextId++, id, up: !!up, lv: 1 }); };
  if (alt && hero === 'hunter') give('caltrop', 2, true);
  if (alt && hero === 'chief') give('uibyeong', 3);
  if (day && day.rules.includes('militia')) give('uibyeong', 3);
  if (day && day.rules.includes('powder')) { give('jincheon', 2); give('u_cannon', 1); }
  if (day && day.rules.includes('lean')) r.gold += 80;
  if (perk('p_relic')) { const id = pick(relicPool()); if (id) r.relics.push(id); }
  if (h.curse) { const id = pick(CURSES); if (id) r.relics.push(id); }
  r.road = genRoad(0); meta.runs++;
  save(); return r;
}
// ───────── 오늘의 원정: 날짜로 영웅 하나와 규칙 둘을 정한다 ─────────
export function dailyOf(date = today()) { const R = dayRng('gogae:' + date), hero = HEROES[(R() * HEROES.length) | 0], keys = Object.keys(DAILY_RULES), a = keys[(R() * keys.length) | 0]; let b = a; for (let g = 0; b === a && g < 20; g++) b = keys[(R() * keys.length) | 0]; return { date, hero, rules: [a, b] }; }
export const dailyScore = (r, win) => (r.ch || 0) * 100 + (r.bosses || 0) * 60 + (r.wins || 0) * 10 + Math.min(300, r.kills || 0) + (win ? 600 : 0);
// ───────── 해금 속도: 끝낸 원정 수(meta.ended)에 따라 새 패·보물·대장간이 하나씩 열린다 (오늘의 원정은 모두 열린 채) ─────────
export const paced = (kind, id) => !!(G.run && G.run.daily) || paceAt(kind, id) <= (meta.ended || 0);
export const openedAt = n => { const p = UNLOCK_PACE.find(q => q.at === n); return p ? [...(p.cards || []).map(id => ({ kind: 'card', id, name: CARDS[id].name })), ...(p.relics || []).map(id => ({ kind: 'relic', id, name: RELICS[id].name })), ...(p.stops || []).map(id => ({ kind: 'stop', id, name: STOP[id] ? STOP[id].name : id }))] : []; };
export const cardOf = uid => G.run.deck.find(c => c.uid === uid) || null;
export const unitCards = () => G.run.deck.filter(isUnit);
export const ownedTypes = () => [...new Set(unitCards().filter(c => CARDS[c.id].kind === 'unit').map(c => CARDS[c.id].unit))];
// 이끄는 영웅의 병법이 원정의 규칙을 바꾼다 (설명은 data/units.js 의 HERO_TRAIT)
const TRAIT = {
  commander: m => { m.rally = 1; }, blade: m => { m.heroLoot = 1; m.heroAtk *= 1.4; m.heroHp *= 1.4; }, hunter: m => { m.lootEvery = 3; }, bishop: m => { m.keepSupport = 3; },
  archmage: m => { m.cardPow *= 1.3; m.pouch += 3; m.startCard = 1; m.tacDisc = 1; }, sangsoe: m => { m.scavAny = 1; }, chief: m => { m.killGold = 6; m.shopCard = 0.5; },
};
// 두 번째 병법 (숙련 2에 열림, data/progress.js 의 HERO_TRAIT2). 시작 패·부대 한도는 newRun 에서
const UM = (m, t) => (m.unit[t] || (m.unit[t] = {}));
const TRAIT2 = {
  commander: m => { m.forms = [...new Set(m.forms.concat('hakik'))]; m.formPow = 1.5; }, blade: m => { const u = UM(m, 'blade'); u.as = (u.as || 1) * 1.3; m.heroCost += 1; }, hunter: m => { m.cardPow *= 1.15; },
  bishop: m => { m.gold *= 1.4; m.killMorale += 0.5; }, archmage: m => { m.cardPow *= 1.15; }, sangsoe: m => { m.moraleRate *= 1.3; m.startMorale += 2; m.killMorale += 0.5; }, chief: m => { m.summonLife += 8; },
};
const DAILY_MOD = {
  mist: m => { m.rangeMul *= 0.85; m.hpInf *= 1.15; }, bloodmoon: m => { m.gold *= 1.5; }, tactics: m => { m.forms = FORM_ORDER.slice(); }, lean: m => { m.gold *= 0.7; },
  powder: m => { const u = UM(m, 'cannon'); u.as = (u.as || 1) * 1.2; },
};
export function mods() {
  const r = G.run, m = Object.assign({}, DEFAULT_MODS), h = hardOf(r.hard || 0); m.unit = {}; m.forms = m.forms.slice(); m.curses = r.relics.filter(id => RELICS[id] && RELICS[id].curse).length + r.deck.filter(c => c.id === 'doubt').length;
  for (const id of r.relics) RELICS[id].mod(m);
  applySets(m, r.deck);
  const tr = r.alt ? TRAIT2 : TRAIT; if (tr[r.hero]) tr[r.hero](m);
  if (r.daily) for (const k of r.daily.rules) if (DAILY_MOD[k]) DAILY_MOD[k](m);
  if ((r.lv || 1) >= 5) { m.heroHp *= 1.1; m.heroAtk *= 1.1; }   // 명장
  if ((r.vows || []).includes('pouch')) m.pouch -= 3;
  m.pouch = Math.max(4, m.pouch + h.pouch); m.rangeMul *= h.range; m.drawRate *= h.draw; m.moraleRate *= h.morale;
  return m;
}
// 장터 값 배율: 험로 12(바가지 장), 오늘의 규칙 '큰 장날'
export const priceMul = () => { const r = G.run; return hardOf(r.hard || 0).price * (r.daily && r.daily.rules.includes('market') ? 0.7 : 1) * mods().shopAll; };   // 군기 수레 보강마다 +15%
// ───────── 패의 살림: 전술 패는 쓰면 사라지고, 길 위에서 새로 얻는다 ─────────
export const tacticCards = () => G.run.deck.filter(c => !isUnit(c) && CARDS[c.id].kind !== 'curse');
export const pouchCap = () => mods().pouch;
// 전장에서 줍는 패: 흔한 패가 자주, 이끄는 영웅의 영웅기도 섞인다
export function lootTable() { const r = G.run, ax = runAxes(), pool = cardPool(), nh = Math.max(2, pool.filter(id => CARDS[id].hero).length); return pool.map(id => [id, (CARDS[id].hero ? (CARDS[id].hero === r.hero ? 16 : 6) / nh : [10, 5, 2][CARDS[id].rare || 0]) * (CARDS[id].axis && ax.has(CARDS[id].axis) ? 1.6 : 1)]); }
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
export function unitStats(type, lvl, wpn, br, tp) { const d = defOf(type, wpn, br, tp), m = lvlMult(lvl || 1); return { hp: Math.round(d.hp * m * PACE), atk: Math.round((d.atk || d.heal || 0) * m), as: d.as, n: d.hero || d.structure ? d.n : squadN(d.n, lvl || 1) }; }
export const depth = () => { const r = G.run; return r.ch * 6 + Math.min(5, r.road ? r.road.i : 0); };
// 전술 패의 위력: 고개마다 요괴가 한 단계씩 세지는 만큼 따라 오른다 (고개 안에서도 조금씩)
export const powerNow = () => { const r = G.run; return (1 + 0.2 * r.ch) * (1 + 0.025 * Math.min(5, r.road ? r.road.i : 0)); };

// ───────── 노정: 한 고개에서 차례로 만나는 것들 ─────────
// 지도를 펼쳐 고르지 않는다. 길을 걷다 보면 차례로 만나고, 갈림길에서는 길가 푯말 둘 중 하나를 고른다
export const STOP = {
  // ch = 도장에 찍는 그림 기호 (render/symbols.js 의 이름. 사건만 물음표 그대로)
  battle: { ch: 'battle', name: '싸움', col: '#2f4d7e' }, elite: { ch: 'elite', name: '강적', col: '#c8402f' }, event: { ch: '?', name: '사건', col: '#6a5a8a' },
  shop: { ch: 'shop', name: '장터', col: '#b8742a' }, rest: { ch: 'rest', name: '주막', col: '#2f6f5c' }, treasure: { ch: 'treasure', name: '보물', col: '#b8862a' }, boss: { ch: 'boss', name: '두목', col: '#7a1f1c' }, fork: { ch: 'fork', name: '갈림길', col: '#5a5346' }, forge: { ch: 'forge', name: '대장간', col: '#c8642a' },
  shaman: { ch: 'shaman', name: '무당집', col: '#a8325a' }, seodang: { ch: 'seodang', name: '서당', col: '#3f5f86' }, gamble: { ch: 'gamble', name: '투전판', col: '#6a3a7a' }, muster: { ch: 'muster', name: '의병 모집소', col: '#8a6a3a' }, hidden: { ch: 'hidden', name: '숨은 길', col: '#2f4a3a' },
};
const FORK_DESC = { shaman: '오색 천이 펄럭이는 무당집 — 부정을 씻는다', seodang: '글 읽는 소리가 들리는 서당 — 패를 익힌다', gamble: '왁자한 투전판 — 엽전을 걸어 본다', muster: '격문이 붙은 마을 — 의병을 모은다', hidden: '수풀에 가린 좁은 길 — 위험한 보물이 있다',
  forge: '대장간 연기가 오르는 길 — 무기를 벼린다', battle: '요괴 무리가 지키는 길', elite: '강적이 버티는 험한 길 — 보물을 지키고 있다', event: '무언가 기다리는 샛길', shop: '장이 서는 길', treasure: '옛 보물이 묻혔다는 길' };
// 새 장소(무당집·서당·투전판·의병 모집소·숨은 길)가 길에 나오는가 (해금 속도는 이 자리에서 정한다)
export const placeOpen = id => paced('stops', id);   // 새 장소도 끝낸 원정 수에 따라 하나씩 열린다 (data/progress.js 의 UNLOCK_PACE)
export const NEW_PLACES = ['shaman', 'seodang', 'gamble', 'muster'];
export function genRoad(ch) {
  const vw = (G.run && G.run.vows) || [], ns = t => vw.includes('noshop') && t === 'shop' ? 'event' : t;
  // 곁길: 열에 셋은 새 장소, 나머지는 사건·장터·보물·대장간
  const base = ['event', 'event', 'shop', 'treasure'].concat(paced('stops', 'forge') ? ['forge'] : []), fresh = NEW_PLACES.filter(placeOpen);
  const side = () => ns(fresh.length && rnd() < 0.3 ? pick(fresh) : pick(base)), two = () => { const a = side(); let b = side(); for (let g = 0; b === a && g < 9; g++) b = ns(pick(['event', 'shop', 'battle'])); return [a, b]; };
  const other = (...not) => { for (let g = 0; g < 20; g++) { const e = side(); if (!not.includes(e)) return e; } return null; };
  const [a, b] = two(), safe = ns(pick(['event', 'shop', 'treasure']));
  const f1 = { type: 'fork', a: { type: a }, b: { type: b } }, f2 = { type: 'fork', a: { type: 'elite' }, b: { type: safe } };
  // 가끔은 세 갈래 (첫 갈림길에 곁길 하나 더, 둘째 갈림길에도 가끔), 아주 가끔은 수풀 사이로 숨은 길이 보인다
  if (rnd() < 0.35) { const e = other(a, b); if (e) f1.c = { type: e }; }
  if (rnd() < 0.2) { const e = other('elite', safe); if (e) f2.c = { type: e }; }
  for (const f of [f1, f2]) if (ch >= 1 && placeOpen('hidden') && rnd() < 0.12) f.h = { type: 'hidden' };
  // 고개 하나는 여섯 칸: 싸움 · 갈림길 · 싸움 · 갈림길(강적이냐 쉬운 길이냐) · 주막(그 고개의 옛이야기를 듣는다) · 두목
  const stops = [{ type: 'battle' }, f1, { type: 'battle' }, f2, { type: vw.includes('norest') ? 'battle' : 'rest' }, { type: 'boss' }];
  return { ch, stops, i: 0, state: 'march' };
}
// 갈림길의 갈래들: a·b (·c) — 숨은 길(h)은 갈림길 앞에 서야 보인다
export const forkKeys = st => ['a', 'b', 'c'].filter(k => st[k]);
export const forkDesc = t => FORK_DESC[t] || '';
export const curStop = () => { const rd = G.run.road; return rd.stops[rd.i]; };
// 싸움 칸에 닿았을 때 편성을 정한다 (다시 불러와도 같은 편성)
export function encounterHere() {
  const r = G.run, st = curStop(); if (!st.enc) { st.enc = genEncounter(r.ch, Math.min(5, r.road.i), st.type, rnd, hardOf(r.hard || 0).elite); save(); }
  return st.enc;
}
export function chooseFork(which) { const rd = G.run.road, st = rd.stops[rd.i]; if (st.type !== 'fork') return; rd.stops[rd.i] = st[which] || st.a; save(); }
// 숨은 길에서 도깨비 굴로 들어가면 그 자리가 강적 싸움터가 된다 (이기면 강적의 전리품: 보물)
export function hiddenFight() { const rd = G.run.road; rd.stops[rd.i] = { type: 'elite', hidden: true }; save(); }
// 지금 칸을 끝내고 다음 칸으로. 두목을 물리쳤으면 다음 고개로 넘어간다. 원정이 끝났으면 true
export function advance() {
  const r = G.run, rd = r.road, st = rd.stops[rd.i]; r.pending = null;
  meta.best = Math.max(meta.best, r.ch * 6 + rd.i + 1); meta.bestCh = Math.max(meta.bestCh || 0, r.ch + (st.type === 'boss' ? 1 : 0));
  if (st.type === 'boss') {
    r.bosses++; r.ch++; if (r.ch >= N_CH && !r.endless) { r.done = true; save(); return true; }
    // 고개를 넘으면: 부대 한도가 늘고, 모든 병력·영웅 패가 한 단계 단련된다
    r.cap = Math.min(MAX_CAP, r.cap + 1); for (const c of r.deck) if (isUnit(c) && (c.lv || 1) < MAX_LV) c.lv = (c.lv || 1) + 1;
    r.road = genRoad(r.ch);
  }
  else { rd.i++; rd.state = 'march'; }
  save(); return false;
}

// ───────── 싸움 준비 ─────────
// 원정을 시작하거나 이어 할 때 전장에 미리 서 있는 부대: 영웅과 병력 패 셋
export function startDeploy() {
  const r = G.run, out = [], lead = r.deck.find(c => CARDS[c.id].kind === 'lead'); if (lead) out.push([lead.uid, 330, MID_Y]);
  const units = r.deck.filter(c => CARDS[c.id].kind === 'unit').slice(0, Math.min(2, r.cap)), front = units.filter(c => !UNITS[CARDS[c.id].unit].soft), back = units.filter(c => UNITS[CARDS[c.id].unit].soft);
  front.forEach((c, n) => out.push([c.uid, 450, MID_Y + (n - (front.length - 1) / 2) * 150]));
  back.forEach((c, n) => out.push([c.uid, 210, MID_Y + (n - (back.length - 1) / 2) * 170 + (back.length % 2 ? 110 : 0)]));
  return out;
}
export function battleSetup(seed) { const r = G.run, m = mods(); return { mods: m, seed: seed || ((rnd() * 1e9) | 0), power: powerNow(), deck: r.deck, cap: Math.max(2, Math.min(MAX_CAP, r.cap + m.capPlus)), start: startDeploy(), morale: r.nextMorale || 0, loot: lootTable(), mastery: r.mastery || {}, lead: r.hero }; }
export function waveSetup(enc) {
  const r = G.run, h = hardOf(r.hard || 0), foe = Object.assign({}, enc.foe || {});
  const c = chN(enc.ch); foe.nMul = ENEMY_N[c] * (h.crowd || 1); foe.bossK = BOSS_K[c];
  const vw = r.vows || [], ed = Math.max(0, enc.ch - (N_CH - 1)), ek = 1 + 0.12 * ed;   // 끝없는 고개: 열둘째 고개 너머로 갈수록 세진다
  if (vw.includes('elite') && !enc.affix && !enc.boss) { const ks = Object.keys(AFFIX), ak = ks[(enc.ch * 7 + enc.row * 3 + 1) % ks.length]; Object.assign(foe, AFFIX[ak].foe); }
  foe.hp = (foe.hp || 1) * ek * h.hp * CH_HP[c] * (enc.boss ? h.boss * BOSS_HP[c] : 1) * (enc.kind === 'elite' ? h.eliteHp : 1); foe.spd = (foe.spd || 1) * h.spd; foe.atk = (foe.atk || 1) * (1 + 0.06 * ed) * h.atk * CH_ATK[c] * (r.daily && r.daily.rules.includes('bloodmoon') ? 1.15 : 1);
  return { foe, lvl: enc.lvl, terrain: enc.terrain, sky: enc.sky, chase: enc.chase && (h.chase || vw.includes('chase')) ? Object.assign({}, enc.chase, { at: Math.max(20, enc.chase.at + h.chase + (vw.includes('chase') ? -20 : 0)) }) : enc.chase };
}
export function goldFor(grade, kind) { const m = mods(); return Math.round((26 + grade * 8 + (kind === 'boss' ? 40 : kind === 'elite' ? 18 : 0)) * m.gold * hardOf(G.run.hard || 0).gold + m.goldFlat); }

// ───────── 패 다루기 ─────────
export function addCard(id, o = {}) { const r = G.run, c = { uid: r.nextId++, id, up: !!o.up || mastered(id), lv: o.lv || 1 }; r.deck.push(c); save(); return c; }
export function removeCard(uid) { const d = G.run.deck, i = d.findIndex(c => c.uid === uid); if (i < 0 || d.length <= 6 || CARDS[d[i].id].kind === 'lead') return null; const c = d.splice(i, 1)[0]; if (c.wpn) G.run.items.push(c.wpn); save(); return c; }
export const canUp = c => isUnit(c) ? (c.lv || 1) < MAX_LV : !mastered(c.id) && CARDS[c.id].kind !== 'curse';
// 전술 패는 익히기(그 종류가 모두 +), 병력·영웅 패는 조련(+1단: 체력·공격력 +20%)
// 병과 승급: 4단에 오른 병력 패는 두 갈래 중 하나를 고른다 (data/branches.js)
export const pendingPromos = () => (G.run ? G.run.deck.filter(c => CARDS[c.id].kind === 'unit' && canBranch(CARDS[c.id].unit, c.lv, c.br)) : []);
export function promote(uid, br) { const c = cardOf(uid), B = branchOf(br); if (!c || !B || B.type !== CARDS[c.id].unit || c.br) return null; c.br = br; save(); return c; }
// 대장간: 병력 패 하나의 무기를 벼린다 (한 장에 한 번)
export const canTemper = c => CARDS[c.id].kind === 'unit' && !c.tp;
export function temper(uid) { const c = cardOf(uid); if (!c || !canTemper(c)) return null; c.tp = 1; save(); return c; }
export function upgradeCard(uid) { const c = cardOf(uid); if (!c || !canUp(c)) return null; if (isUnit(c)) { c.lv = (c.lv || 1) + 1; save(); } else master(c.id); return c; }
// 영웅기 패는 덱에 그 영웅 패가 있을 때만 나온다
export function cardPool() { const hs = G.run.deck.filter(c => CARDS[c.id].kind === 'lead').map(c => CARDS[c.id].unit); return Object.keys(CARDS).filter(id => !isUnit({ id }) && CARDS[id].kind !== 'curse' && (!CARDS[id].hero || hs.includes(CARDS[id].hero)) && paced('cards', id) && (!CARDS[id].mastery || G.run.daily || masteryLv((meta.heroXp || {})[CARDS[id].hero]) >= CARDS[id].mastery)); }
// 지금 원정이 키우는 빌드 축: 승급한 갈래와 지닌 보물의 축 (그 축의 패·보물이 더 자주 나온다)
export function runAxes() { const r = G.run, a = new Set(); if (!r) return a; for (const c of r.deck) { const B = branchOf(c.br); if (B) a.add(B.axis); } for (const id of r.relics) if (RELICS[id] && RELICS[id].axis) a.add(RELICS[id].axis); if (r.relics.some(id => RELICS[id] && RELICS[id].curse) || r.deck.some(c => c.id === 'doubt')) a.add('omen'); return a; }
export function rollCards(kind, n = 3, keys) {
  const pool = cardPool().filter(id => !keys || !keys.has('cd' + id)), out = [], upP = kind === 'boss' ? 1 : kind === 'elite' ? 0.3 : kind === 'shop' ? 0.15 : 0.08;
  const ax = runAxes(), nh = Math.max(2, pool.filter(id => CARDS[id].hero).length), w = id => (CARDS[id].hero ? 12.8 / nh : [10, 7, 3][CARDS[id].rare || 0] + (kind === 'boss' || kind === 'elite' ? (CARDS[id].rare || 0) * 2 : 0)) * (CARDS[id].axis && ax.has(CARDS[id].axis) ? 2 : 1);
  for (let g = 0; out.length < n && g < 60; g++) { let x = rnd() * pool.reduce((a, id) => a + w(id), 0), id = pool[0]; for (const c of pool) { if ((x -= w(c)) < 0) { id = c; break; } } if (!id || out.some(o => o.id === id)) continue; out.push({ id, up: rnd() < upP }); }
  return out;
}

// ───────── 무기 ─────────
export const usersOf = wid => Object.keys(ARMS).filter(t => canEquip(t, wid)).map(t => UNITS[t].name);
export function weaponPool() { const types = [...new Set(unitCards().map(c => CARDS[c.id].unit))]; return LOOT_WEAPONS.filter(w => types.some(t => canEquip(t, w))); }
// 부대가 전멸하면 그 패에 끼운 무기도 함께 사라진다 (보관함으로 돌아가지 않는다)
export function loseWeapon(uid) { const c = G.run.deck.find(q => q.uid === uid); if (!c || !c.wpn) return null; const w = c.wpn; delete c.wpn; save(); return w; }
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
export function relicPool() { const r = G.run, own = r ? ownedTypes() : []; return Object.keys(RELICS).filter(id => !RELICS[id].curse && !(r && r.relics.includes(id)) && (!RELICS[id].req || own.includes(RELICS[id].req)) && !RELICS[id].boss && (!RELICS[id].legend || runAxes().has(RELICS[id].axis)) && paced('relics', id)); }
export const bossRelicPool = () => Object.keys(RELICS).filter(id => RELICS[id].boss && !G.run.relics.includes(id));
export function describeReward(o) {
  if (o.kind === 'card') { const d = CARDS[o.id], u = isUnit(o); return { title: u ? (d.kind === 'lead' ? '영웅 합류' : '의병 모집') : '전술 패', n: o.n || 1, name: cardName(o) + (o.n > 1 ? ` ×${o.n}` : ''), desc: u ? UNITS[d.unit].tip : d.desc(Object.assign({}, d.v, o.up ? d.up : {})), col: u ? 'blue' : 'purple', card: o }; }
  // 조련은 새 패를 얻는 것이 아니라 덱에 있는 패를 한 단계 올린다: 패 그림 대신 조련 그림과 그 패 인물의 얼굴로 보여 준다
  if (o.kind === 'train') { const c = cardOf(o.uid) || { id: o.id, lv: 1 }, d = CARDS[c.id], l = c.lv || 1; return { title: '조련', name: `${d.name} ${l}단 → ${l + 1}단`, desc: `덱의 ${d.name} 패가 강해집니다\n체력·${UNITS[d.unit].heal ? '치유량' : '공격력'} +20%`, col: 'green', misc: 'trainOne', unit: d.unit, lv: l }; }
  if (o.kind === 'upgrade') { const d = CARDS[o.id]; return { title: '전술 익히기', name: `${d.name} → ${d.name}+`, desc: `[${d.name}] 모두 강화판(+)\n` + d.desc(Object.assign({}, d.v, d.up)), col: 'green', card: { id: o.id, up: true } }; }
  if (o.kind === 'supply') return { title: '보급', name: '기본 패 꾸러미', desc: [...new Set(o.ids)].map(id => CARDS[id].name + (o.ids.filter(q => q === id).length > 1 ? ' ×' + o.ids.filter(q => q === id).length : '')).join(' · ') + '\n흔하지만 쓸모 있는 패 석 장', col: 'green', misc: 'supply', ids: o.ids };
  if (o.kind === 'relic') { const x = RELICS[o.id]; return { title: x.boss ? '두목의 보물' : x.legend ? '전설의 보물' : '보물', name: x.name, desc: x.desc.replace(/^전설 — /, ''), col: 'gold', relic: o.id }; }
  if (o.kind === 'weapon') { const w = WEAPONS[o.id]; return { title: '무기', name: w.name, desc: `${w.desc}\n${CLS_NAME[w.cls]} — ${(u => u.length > 3 ? u.slice(0, 3).join('·') + ' 외 ' + (u.length - 3) : u.join('·'))(usersOf(o.id))}`, col: 'blue', weapon: o.id }; }
  if (o.kind === 'cleanse') return { title: '부정 씻기', name: RELICS[o.id].name, desc: `부정 [${RELICS[o.id].name}] 씻기 (${RELICS[o.id].desc})`, col: 'gold', relic: o.id };
  if (o.kind === 'burn') return { title: '패 태우기', name: '패 한 장 없애기', desc: '패 한 장을 덱에서 없앱니다. 덱이 얇으면 좋은 패가 자주 옵니다', col: 'red', misc: 'burn' };
  if (o.kind === 'trainPick') return { title: '조련장', name: '병력 패 조련', desc: '병력·영웅 패 하나 +1단 (체력·공격 +20%)', col: 'green', misc: 'train' };
  return { title: '군량 수레', name: '부대 한도 +1', desc: `부대 한도 ${G.run.cap} → ${G.run.cap + 1}`, col: 'gold', misc: 'cap' };
}
function makeReward(kind, keys) {
  const r = G.run, types = unitPool(), owned = ownedTypes(), vw = r.vows || [];
  if ((vw.includes('norelic') && (kind === 'relic' || kind === 'bossRelic')) || (vw.includes('onearm') && kind === 'unit')) return null;
  if (kind === 'unit') { const fresh = types.filter(t => !owned.includes(t)); const t = fresh.length && rnd() < 0.6 ? pick(fresh) : pick(types); return { kind: 'card', id: 'u_' + t, lv: 1 + Math.floor(r.ch * 0.8), key: 'cd' + 'u_' + t }; }
  if (kind === 'lead') { const hs = HEROES.filter(h => !r.deck.some(c => c.id === 'h_' + h)); if (!hs.length) return null; const h = pick(hs); return { kind: 'card', id: 'h_' + h, lv: 1, key: 'cd' + 'h_' + h }; }
  if (kind === 'tactic') { const o = rollCards(keys.kind || 'battle', 1, keys)[0]; return o ? { kind: 'card', id: o.id, up: o.up, n: packN(o.id), key: 'cd' + o.id } : null; }
  if (kind === 'supply') return { kind: 'supply', ids: ['sling', 'rain', pick(['heal', 'heal', 'horn', 'scout'])], key: 'supply' };
  if (kind === 'train') { const c = unitCards().filter(c => (c.lv || 1) < MAX_LV && !keys.has('tr' + c.uid)); if (!c.length) return null; const x = pick(c); return { kind, uid: x.uid, id: x.id, key: 'tr' + x.uid }; }
  if (kind === 'upgrade') { const c = r.deck.filter(c => !isUnit(c) && canUp(c) && !keys.has('up' + c.id)); if (!c.length) return null; const x = pick(c); return { kind, id: x.id, key: 'up' + x.id }; }
  if (kind === 'relic') { const pool = relicPool().filter(id => !keys.has('rl' + id)); if (!pool.length) return null; const ax = runAxes(), wl = pool.flatMap(id => RELICS[id].axis && ax.has(RELICS[id].axis) ? [id, id] : [id]), id = pick(wl); return { kind, id, key: 'rl' + id }; }
  if (kind === 'weapon') { const pool = weaponPool().filter(id => !keys.has('wp' + id)); if (!pool.length) return null; const fresh = pool.filter(id => !r.items.includes(id) && !r.deck.some(q => q.wpn === id)); const id = pick(fresh.length ? fresh : pool); return { kind, id, key: 'wp' + id }; }
  if (kind === 'cap') { if (r.cap >= MAX_CAP) return null; return { kind: 'cap', key: 'cap' }; }
  if (kind === 'bossRelic') { const pool = bossRelicPool().filter(id => !keys.has('rl' + id)); if (!pool.length) return makeReward('relic', keys); const id = pick(pool); return { kind: 'relic', id, boss: true, key: 'rl' + id }; }
  return null;
}
// (다른 영웅이 합류하는 보상은 없다: 원정 내내 고른 영웅 한 명만 이끈다)
const TABLE = [['unit', 18], ['tactic', 30], ['supply', 10], ['train', 15], ['upgrade', 8], ['weapon', 9], ['relic', 8], ['cap', 4]];
export function rollRewards(kind) {
  const r = G.run, out = [], keys = new Set(), total = TABLE.reduce((a, t) => a + t[1], 0); keys.kind = kind;
  const few = unitCards().length < 7;
  const forced = kind === 'boss' ? ['bossRelic', 'bossRelic', 'bossRelic'] : kind === 'treasure' ? ['relic', 'relic', 'relic'] : kind === 'elite' ? ['relic', 'weapon', null] : [few ? 'unit' : null, 'tactic', null];
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
export function openReward(kind) { const r = G.run; if (!r.pending || r.pending.kind !== 'reward') r.pending = { kind: 'reward', of: kind, opts: rollRewards(kind), rerolls: 0, free: (has('p_reroll') && !r.daily ? 1 : 0) + mods().freeReroll }; save(); return r.pending; }

// ───────── 장터 ─────────
export function genShop() {
  const r = G.run, items = [], keys = new Set(); keys.kind = 'shop';
  const add = (kind, price) => { for (let g = 0; g < 20; g++) { const o = makeReward(kind, keys); if (o && !keys.has(o.key)) { keys.add(o.key); items.push(Object.assign(o, { price, sold: false })); return; } } };
  add('unit', 0); add('tactic', 0); add('tactic', 0); add('tactic', 0); add('supply', 30); add('relic', 90 + Math.min(4, r.ch) * 10); add('weapon', 56 + Math.min(4, r.ch) * 6);
  const curse = r.relics.find(id => RELICS[id].curse);
  if (curse) items.push({ kind: 'cleanse', id: curse, key: 'cl', price: 45, sold: false }); else items.push({ kind: 'trainPick', key: 'tp', price: 56 + Math.min(4, r.ch) * 8, sold: false });
  const k = mods().shopCard;
  for (const it of items) { if (it.kind === 'card') { const d = CARDS[it.id]; it.price = isUnit(it) ? 34 + d.cost * 10 : Math.round(((d.hero ? 44 : [30, 38, 46][d.rare || 0]) + (it.up ? 14 : 0)) * k); } else if (it.kind === 'supply') it.price = Math.round(it.price * k); }
  const pm = priceMul(); if (pm !== 1) for (const it of items) it.price = Math.round(it.price * pm);
  return items;
}
export function buyItem(it) { const r = G.run; if (!it || it.sold || r.gold < it.price) return false; r.gold -= it.price; it.sold = true; applyReward(it); return true; }

// ───────── 길 위의 새 장소: 무당집 · 서당 · 투전판 · 의병 모집소 · 숨은 길 (그림은 ui/places2.js) ─────────
export const PLACE_COST = { gut: 40, naerim: 30, charm: 45, study: 25, call: 25, feed: 150, bet: 30 };   // 군량(부대 한도)은 원정에 한 번만
export const BET_WIN = 0.45;   // 투전 한 판에 이길 확률: 화면에 그대로 적는다 (이기면 건 돈의 두 배를 받는다)
export const curseCount = () => { const r = G.run; return r.relics.filter(id => RELICS[id] && RELICS[id].curse).length + r.deck.filter(c => c.id === 'doubt').length; };
export const place = {
  // 무당집: 굿으로 부정을 씻고, 신내림으로 기세를 올리고, 부적을 받는다
  gut() { const r = G.run; r.gold -= PLACE_COST.gut; const out = []; for (let k = 0; k < 4; k++) { const a = act.cleanse(); if (!a) break; out.push(a); } for (let k = 0; k < 4; k++) { const b = act.clearDoubt(); if (!b) break; out.push(b); } save(); return out; },
  naerim() { G.run.gold -= PLACE_COST.naerim; const s = act.morale(4); save(); return [s]; },
  charm() { const r = G.run; r.gold -= PLACE_COST.charm; const pool = ['amulet', 'obsidian'].filter(id => RELICS[id] && !r.relics.includes(id)), s = pool.length ? act.relic(pick(pool)) : act.card('bujeok', true, 2); save(); return [s]; },
  // 서당: 전술 하나를 익히고, 병법서로 패를 바꾸고, 훈장의 시험을 본다
  study(uid) { const c = cardOf(uid); if (!c || isUnit(c) || !canUp(c)) return null; G.run.gold -= PLACE_COST.study; master(c.id); save(); return `전술을 익혔습니다: [${CARDS[c.id].name}] → [${CARDS[c.id].name}+]`; },
  readOffer() { return rollCards('shop', 3).map(o => o.id); },
  read(uid, id) { const c = cardOf(uid), nm = c ? cardName(c) : ''; if (!c || !removeCard(uid)) return null; addCard(id); save(); return [`[${nm}] 를 덜어 냈습니다`, `패 [${CARDS[id].name}] 를 얻었습니다`]; },
  quiz() { const r = G.run, seen = r.quizSeen || (r.quizSeen = []), pool = QUIZ.filter((_, i) => !seen.includes(i)), q = pick(pool.length ? pool : QUIZ), i = QUIZ.indexOf(q); seen.push(i); const order = [0, 1, 2].sort(() => rnd() - 0.5); return { q: q.q, a: order.map(k => q.a[k]), right: order.indexOf(0) }; },
  quizWin() { const r = G.run; r.gold += 40; r.merit = (r.merit || 0) + 3; save(); return ['엽전 +40', '공적 +3']; },
  // 투전판: 엽전을 건다 (이길 확률은 숨기지 않는다) / 패 한 장을 걸고 도깨비와 내기
  bet() { const r = G.run, win = rnd() < BET_WIN; r.gold -= PLACE_COST.bet; if (win) r.gold += PLACE_COST.bet * 2; save(); return win; },
  wager(uid) { const c = cardOf(uid); if (!c || CARDS[c.id].kind === 'lead') return null; const nm = cardName(c); if (rnd() < 0.5) { const s = act.relic(); save(); return { win: true, lines: [s] }; } if (removeCard(uid)) { save(); return { win: false, lines: [`패 [${nm}] 를 잃었습니다`] }; } const s = act.gold(-20); save(); return { win: false, lines: [s] }; },
  // 의병 모집소: 병력 패 셋 중 하나를 데려가고, 격문을 붙여 의병 봉기 패를 얻고, 군량을 대어 부대를 늘린다
  musterOffer() { const r = G.run, types = unitPool(), owned = ownedTypes(), out = []; for (let g = 0; out.length < 3 && g < 60; g++) { const fresh = types.filter(t => !owned.includes(t) && !out.includes(t)), t = fresh.length && rnd() < 0.55 ? pick(fresh) : pick(types); if (!out.includes(t)) out.push(t); } return out.map(t => ({ id: 'u_' + t, lv: 1 + Math.floor(r.ch * 0.8) })); },
  recruit(o) { addCard(o.id, { lv: o.lv }); save(); return `병력 패 [${CARDS[o.id].name}]${o.lv > 1 ? ` ${o.lv}단` : ''}`; },
  call() { G.run.gold -= PLACE_COST.call; const s = act.card('uibyeong', false, 2); save(); return [s]; },
  feed() { G.run.gold -= PLACE_COST.feed; G.run.fed = true; const s = act.cap(1); save(); return [s]; },
  // 숨은 길: 금줄 너머의 보물 둘을 챙기면 부정도 함께 따라온다
  loot() { const a = act.relic(), b = act.relic(), c = act.curse(); save(); return [a, b, c]; },
};

// ───────── 사건에서 쓰는 도우미 ─────────
export const EVENT_IDS = ['ssireum', 'axe', 'shrine', 'peddler', 'lost', 'bangmangi', 'boar', 'well', 'smith', 'sansam', 'fox', 'jangseung', 'scholar', 'tomb', 'hokburi', 'heungbu', 'urung', 'seonnyeo', 'ojak', 'tiger', 'kongjwi', 'yagwang',
  'haedal', 'bangui', 'dokkaebibul', 'banjjogi', 'gureong', 'gureong2', 'jeoseung', 'dangsan', 'talchum', 'dure', 'sanjeok', 'sanjeok2', 'child', 'child2', 'seowon', 'trap', 'dokkaebisijang', 'flood', 'armory', 'sansa', 'sotdae', 'pansori', 'bongsu', 'madang', 'gutdang',
  'uturi', 'uturi2', 'brothers', 'brothers2', 'bari', 'bari2', 'cave', 'cave2', 'axe2', 'kongjwi2', 'oldhelm', 'fathersword', 'voice', 'soulpath', 'broom', 'nodance', 'sanchae', 'dokgamtu', 'debt', 'gongyang', 'patjuk', 'jopssal', 'foxbead'];
// 앞선 사건의 선택이 있어야 나오는 이어지는 사건
const EVENT_NEED = { gureong2: 'gureong', sanjeok2: 'sanjeok', child2: 'child', uturi2: 'uturi', brothers2: 'brothers', bari2: 'bari', cave2: 'cave', axe2: 'axe', kongjwi2: 'kongjwi' };
const EVENT_MIN = { well: 1, tomb: 1, jeoseung: 2, armory: 1, gureong2: 2, sanjeok2: 2, child2: 2, uturi2: 2, brothers2: 2, bari2: 2, cave2: 2, axe2: 1, kongjwi2: 1, dokgamtu: 1, debt: 1, oldhelm: 1, fathersword: 1, voice: 1, soulpath: 1, broom: 1, nodance: 1, sanchae: 1 };
// 이어지는 사건의 첫 갈래는 늦어도 이 고개까지만 (보답 받을 고개가 남아야 하므로)
const EVENT_MAX = { uturi: 8, brothers: 8, bari: 8, cave: 8 };
// 그 영웅이 이끌 때만 나오는 사건 (프롤로그의 사연과 이어진다)
export const EVENT_HERO = { oldhelm: 'commander', fathersword: 'blade', voice: 'hunter', soulpath: 'bishop', broom: 'archmage', nodance: 'sangsoe', sanchae: 'chief' };
// 드문 사건: 고를 때 절반은 건너뛴다
const EVENT_RARE = { dokgamtu: 1, debt: 1, foxbead: 1 };
// 인연을 맺은 영물이 이번 원정의 덱에 없으면, 사건 자리에서 가끔 그 영물을 다시 만난다 ('beast:까치' 처럼)
export function pickEvent() { const r = G.run, wait = BEASTS.filter(b => has(b.id) && !r.deck.some(c => c.id === 'u_' + b.id) && !(r.beastQ || []).includes(b.id)); if (wait.length && rnd() < 0.4) return 'beast:' + pick(wait).id; const ok = e => (!EVENT_NEED[e] || (r.flags || []).includes(EVENT_NEED[e])) && (!EVENT_HERO[e] || EVENT_HERO[e] === r.hero), pool = EVENT_IDS.filter(e => !r.evSeen.includes(e) && ok(e) && (EVENT_MIN[e] || 0) <= r.ch && (EVENT_MAX[e] === undefined || r.ch <= EVENT_MAX[e])),
    // 이어지는 사건이 기다리고 있으면 먼저 꺼내고, 그다음엔 이끄는 영웅의 사건을 자주 꺼낸다. 드문 사건은 절반만 후보에 든다
    chain = pool.filter(e => EVENT_NEED[e]), own = pool.filter(e => EVENT_HERO[e]), plain = pool.filter(e => !EVENT_RARE[e] || rnd() < 0.5),
    ev = chain.length && rnd() < 0.7 ? pick(chain) : own.length && rnd() < 0.1 ? pick(own) : pick(plain.length ? plain : pool.length ? pool : EVENT_IDS.filter(e => ok(e) && !EVENT_NEED[e])); r.evSeen.push(ev); return ev; }
const lvUp = c => { c.lv = (c.lv || 1) + 1; return `${CARDS[c.id].name} ${c.lv}단`; };
export const act = {
  gold(n) { const r = G.run; r.gold = Math.max(0, r.gold + n); return n >= 0 ? `엽전 +${n}` : `엽전 ${n}`; },
  relic(id) { const r = G.run; if ((r.vows || []).includes('norelic')) return act.gold(60); if (!id || r.relics.includes(id)) id = pick(relicPool()); if (!id) return act.gold(60); r.relics.push(id); return `보물 [${RELICS[id].name}] — ${RELICS[id].desc}`; },
  curse() { const r = G.run, pool = CURSES.filter(id => !r.relics.includes(id)); if (!pool.length) return act.gold(-20); const id = pick(pool); r.relics.push(id); return `부정 [${RELICS[id].name}] — ${RELICS[id].desc}`; },
  cleanse() { const r = G.run, id = r.relics.find(x => RELICS[x].curse); if (!id) return null; r.relics = r.relics.filter(x => x !== id); return `부정 [${RELICS[id].name}] 이 씻겨 나갔습니다`; },
  train(filter) { const c = unitCards().filter(c => CARDS[c.id].kind === 'unit' && (c.lv || 1) < MAX_LV && (!filter || filter(UNITS[CARDS[c.id].unit]))); if (!c.length) return act.hero(); return lvUp(pick(c)); },
  // 영물 패: 영물의 인연 사건으로만 얻는다 (up = 한 단 높여서)
  beast(id, up) { addCard('u_' + id, { lv: up ? 2 : 1 }); return `영물 패 [${UNITS[id].name}]${up ? ' +1단' : ''}`; },
  recruit() { if ((G.run.vows || []).includes('onearm')) return act.gold(40); const o = makeReward('unit', new Set()); if (!o) return act.gold(40); addCard(o.id); return `병력 패 [${CARDS[o.id].name}]`; },
  hero() { const c = G.run.deck.filter(c => CARDS[c.id].kind === 'lead' && (c.lv || 1) < MAX_LV); if (!c.length) return act.gold(40); return lvUp(c[0]); },
  cap(n) { const r = G.run; r.cap = Math.max(3, Math.min(MAX_CAP, r.cap + n)); return n > 0 ? `부대 한도 +${n}` : `부대 한도 ${n}`; },
  morale(n) { G.run.nextMorale = n; return `다음 싸움을 사기 +${n} 로 시작`; },
  weapon(id) { const r = G.run; if (!id) { const pool = weaponPool(), fresh = pool.filter(w => !r.items.includes(w) && !r.deck.some(q => q.wpn === w)); id = pick(fresh.length ? fresh : pool); } if (!id) return act.gold(40); r.items.push(id); return `무기 [${WEAPONS[id].name}] — ${WEAPONS[id].desc}`; },
  card(id, up, n = 2) { if (!id) id = rollCards('battle', 1)[0].id; for (let k = 0; k < n; k++) addCard(id, { up, lv: id.startsWith('u_') ? 1 + Math.floor(G.run.ch * 0.8) : 1 }); return `패 [${CARDS[id].name}${up || mastered(id) ? '+' : ''}] ${n}장을 얻었습니다`; },
  cardUp() { const d = G.run.deck.filter(c => !isUnit(c) && canUp(c)); if (!d.length) return act.gold(30); const c = pick(d); master(c.id); return `전술을 익혔습니다: [${CARDS[c.id].name}] → [${CARDS[c.id].name}+]`; },
  supply(n) { const got = []; for (let k = 0; k < n; k++) { const id = pick(['sling', 'sling', 'rain', 'rain', 'heal', 'heal', 'horn', 'scout']); addCard(id); got.push(CARDS[id].name); } return `패 ${n}장: ${got.join(', ')}`; },
  doubt() { addCard('doubt'); return '부정 -1: 덱에 쓸모없는 패 [잡념]이 섞였습니다'; },
  clearDoubt() { const d = G.run.deck, i = d.findIndex(c => c.id === 'doubt'); if (i < 0) return null; d.splice(i, 1); return '덱에서 [잡념]이 사라졌습니다'; },
};

// ───────── 원정 끝: 공적 정산 ─────────
// 끝없는 고개: 평정한 원정을 그대로 이어 열두 고개를 다시 돈다 (고개마다 요괴가 더 세진다)
export function goEndless() { const r = G.run; if (!r || !r.done || r.daily || r.endless) return false; r.done = false; r.endless = true; r.gainPrev = r.gain || 0; r.settled = false; r.cap = Math.min(MAX_CAP, r.cap + 1); for (const c of r.deck) if (isUnit(c) && (c.lv || 1) < MAX_LV) c.lv = (c.lv || 1) + 1; r.road = genRoad(r.ch); r.pending = null; save(); return true; }
export const chName = r => r.ch >= N_CH ? `끝없는 고개 ${r.ch - N_CH + 1}` : null;
export const chFull = r => r.ch >= N_CH ? `끝없는 고개 ${r.ch - N_CH + 1} · ${chapterOf(r.ch).name.split(' · ').pop()}` : chapterOf(r.ch).name;
// 전공첩: 원정을 마칠 때 새로 이룬 일을 찾아 도장을 찍고 공적을 준다
export function checkFeats(r, win) {
  const fe = meta.feats || (meta.feats = {}), hb = Object.values(meta.heroBest || {}), cx = meta.codex || { foe: {}, relic: {}, card: {} };
  const foeIds = Object.keys(UNITS).filter(k => UNITS[k].side === 1 && !UNITS[k].prop && UNITS[k].role !== '소품' && UNITS[k].name);
  const units = r.deck.filter(c => CARDS[c.id].kind === 'unit');
  const n = { heroWins: hb.filter(v => v >= 0).length, hardWin: hb.length ? Math.max(...hb) : -1, master5: Object.values(meta.heroXp || {}).some(x => masteryLv(x) >= 5), beasts: BEASTS.filter(b => has(b.id)).length,
    foes: foeIds.filter(k => cx.foe[k]).length, foeAll: foeIds.length, relics: Object.keys(cx.relic).length, cards: Object.keys(cx.card).length,
    legend: r.relics.filter(id => RELICS[id] && RELICS[id].legend).length, curses: r.relics.filter(id => RELICS[id] && RELICS[id].curse).length + r.deck.filter(c => c.id === 'doubt').length,
    branches: units.filter(c => c.br).length, unitMax: Math.max(0, ...units.map(c => c.lv || 1)), bossRelics: r.relics.filter(id => RELICS[id] && RELICS[id].boss).length, sets: setProgress(r.deck).filter(p => p.on[p.on.length - 1]).length };
  const got = FEATS.filter(f => !fe[f.id] && (() => { try { return f.ok({ r, win, meta, n }); } catch (e) { return false; } })());
  for (const f of got) fe[f.id] = Date.now(); const bonus = got.reduce((a, f) => a + f.merit, 0); meta.merit += bonus;
  r.newFeats = (r.newFeats || []).concat(got.map(f => f.id)); r.featMerit = (r.featMerit || 0) + bonus; return got;
}
export function settleRun(win) {
  const r = G.run; if (!r || r.settled) return r ? r.gain || 0 : 0;
  // 서약을 지면 공적을 더 받는다. 끝없는 고개는 평정 때 받은 몫을 빼고 더 넘은 만큼만 받는다
  const total = Math.round((r.merit * 0.6 + r.bosses * 4 + (win || r.endless ? 40 : 0)) * (1 + 0.2 * r.hard) * (1 + vowBonus(r.vows) / 100)), gain = Math.max(0, total - (r.gainPrev || 0));
  meta.merit += gain; r.settled = true; r.gain = gain;
  if (r.endless) { const n = r.ch - N_CH; r.endlessN = n; r.endlessBest = meta.endlessBest || 0; meta.endlessBest = Math.max(meta.endlessBest || 0, n); checkFeats(r, false); save(); return gain; }
  // 평정하면 다음 험로가 열리고, 그 영웅이 넘은 가장 험한 길이 기록된다
  if (win) { meta.clears++; const was = meta.hardMax || 0; meta.hardMax = Math.min(HARD_MAX, Math.max(was, r.hard + 1)); r.newHard = meta.hardMax > was ? meta.hardMax : 0; if (!meta.heroBest) meta.heroBest = {}; meta.heroBest[r.hero] = Math.max(meta.heroBest[r.hero] === undefined ? -1 : meta.heroBest[r.hero], r.hard); }
  // 끝낸 원정 수 → 새 것이 열린다 / 영웅 숙련이 쌓인다 / 오늘의 원정 점수
  const was = meta.ended || 0; meta.ended = was + 1; r.opened = openedAt(meta.ended);
  const xp0 = (meta.heroXp || (meta.heroXp = {}))[r.hero] || 0, xp = Math.min(12, r.ch || 0) + (win ? 6 : 0) + 1; meta.heroXp[r.hero] = xp0 + xp; r.xp = xp; r.lvFrom = masteryLv(xp0); r.lvTo = masteryLv(xp0 + xp);
  if (r.daily) { const sc = dailyScore(r, win), d = meta.daily || (meta.daily = {}); r.score = sc; r.bestBefore = d[r.daily.date] || 0; d[r.daily.date] = Math.max(r.bestBefore, sc); }
  // 이야기 열둘을 모두 듣고 평정하면, 숨은 열세 번째 고개가 열린다
  if (win && (meta.tales || []).length >= TALES.length && !meta.trueEnd) { meta.trueEnd = 1; r.trueEnd = true; }
  checkFeats(r, win);
  save(); return gain;
}
