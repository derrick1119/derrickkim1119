'use strict';
/* =========================================================
 * 서든어택: 남겨진 자들 — 게임 로직
 * ========================================================= */

const SAVE_KEY = 'sa_leftbehind_save_v1';
const G = {};
window.G = G;
let S = null;

/* ---------- 유틸 ---------- */
const $ = (sel) => document.querySelector(sel);
const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const chance = (p) => Math.random() < p;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pct = (p) => Math.round(clamp(p, 0, 1) * 100) + '%';
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function itemsText(obj, sep = ' ') {
  return Object.entries(obj).filter(([, v]) => v > 0)
    .map(([k, v]) => `${ITEMS[k].icon}${ITEMS[k].name} ${v}`).join(sep) || '없음';
}
function addTo(target, obj, mul = 1) {
  for (const [k, v] of Object.entries(obj)) target[k] = (target[k] || 0) + v * mul;
}
function hasItems(obj) { return Object.entries(obj).every(([k, v]) => (S.inv[k] || 0) >= v); }
function weightOf(bag) { return Object.entries(bag).reduce((s, [k, v]) => s + ITEMS[k].w * v, 0); }
function valueOf(bag) { return Object.entries(bag).reduce((s, [k, v]) => s + ITEMS[k].val * v, 0); }

/* ---------- 생존자 ---------- */
function makeSurvivor(id, over = {}) {
  return Object.assign({
    ...SURVIVOR_DEFS[id],
    health: 100, hunger: 20, thirst: 20, fatigue: 15, morale: 62,
    sick: false, alive: true, gone: false, apUsed: 0, brokenDays: 0,
    night: null, room: pick(['workshop', 'kitchen', 'storage']), thought: '',
    joinedDay: S ? S.day : 1,
  }, over);
}
const active = (s) => s.alive && !s.gone;
const crew = () => S.survivors.filter(active);
const sv = (id) => S.survivors.find((s) => s.id === id);

function maxAP(s) {
  if (!active(s)) return 0;
  if (s.morale < 15) return 0;
  let ap = 3;
  if (s.morale < 35) ap--;
  if (s.sick) ap--;
  if (s.health < 30) ap = Math.min(ap, 1);
  return Math.max(0, ap);
}
const apLeft = (s) => maxAP(s) - s.apUsed;
function useAP(s, n) { s.apUsed += n; s.fatigue = clamp(s.fatigue + 7 * n, 0, 100); }
function canWork(s, n) { return apLeft(s) >= n && s.fatigue < 90; }

function hungerLabel(v) { return v < 25 ? '배부름' : v < 50 ? '약간 배고픔' : v < 75 ? '배고픔' : '굶주림'; }
function thirstLabel(v) { return v < 25 ? '갈증 없음' : v < 50 ? '목마름' : v < 75 ? '심한 갈증' : '탈수'; }
function fatigueLabel(v) { return v < 30 ? '활력' : v < 60 ? '약간 피곤' : v < 85 ? '피곤' : '탈진'; }
function moraleLabel(v) { return v >= 70 ? '안정' : v >= 45 ? '보통' : v >= 25 ? '우울' : v >= 15 ? '절망' : '붕괴'; }
function healthLabel(v) { return v >= 80 ? '건강' : v >= 55 ? '경상' : v >= 30 ? '중상' : '빈사'; }

function makeThought(s) {
  let key = 'ok';
  if (s.sick) key = 'sick';
  else if (s.health < 45) key = 'hurt';
  else if (s.thirst >= 70) key = 'thirsty';
  else if (s.hunger >= 70) key = 'hungry';
  else if (s.fatigue >= 80) key = 'tired';
  else if (s.morale < 35) key = 'sad';
  else if (s.morale >= 72) key = 'good';
  return pick(THOUGHTS[key]);
}

function changeMorale(s, d) { if (active(s)) s.morale = clamp(s.morale + d, 0, 100); }
function moraleAll(d, exceptId) { crew().forEach((s) => { if (s.id !== exceptId) changeMorale(s, d); }); }

/* ---------- 로그 ---------- */
function log(msg, type = '') {
  S.log.unshift({ day: S.day, msg, type });
  if (S.log.length > 150) S.log.length = 150;
}

/* ---------- 새 게임 / 저장 ---------- */
function newGame() {
  S = null;
  S = {
    day: 1, phase: 'day', selected: STARTING_CREW[0], tab: 'crew',
    survivors: [],
    inv: { ...START_INV },
    buildings: { bed: 0, stove: 0, collector: 0, garden: 0, barricade: 0, workbench: 1, heater: 0, radio: 0 },
    rubble: RUBBLE.map((r) => ({ id: r.id, cleared: false })),
    roofOpen: false,
    locs: {},
    log: [], flags: {}, joined: [...STARTING_CREW],
    raidTonight: false, radioForecast: null, protectedUntil: 0,
    stock: { trader: { ...TRADER_STOCK } },
    stats: { kills: 0, stolen: 0, helped: 0, raids: 0, repelled: 0, scavs: 0, deaths: 0 },
    scav: null, plan: null, modals: [], delayed: [],
    lastRain: false,
  };
  S.survivors = STARTING_CREW.map((id) => makeSurvivor(id));
  S.survivors.forEach((s) => (s.thought = makeThought(s)));
  log('포위된 도시의 낡은 건물에 몸을 숨겼다. 휴전까지 버텨야 한다.', 'story');
  rollRaid();
  pushModal({ type: 'intro' });
  render();
}

function saveGame(silent) {
  if (!S || S.phase !== 'day') return;
  try {
    const copy = { ...S, modals: [] };
    localStorage.setItem(SAVE_KEY, JSON.stringify(copy));
    if (!silent) toast('저장했습니다.');
  } catch (e) { toast('저장 실패: ' + e.message); }
}
function hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return toast('저장된 게임이 없습니다.');
    S = JSON.parse(raw);
    S.modals = [];
    S.phase = 'day';
    render();
    toast(`${S.day}일차 기록을 불러왔습니다.`);
  } catch (e) { toast('불러오기 실패'); }
}

let toastTimer = null;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ---------- 모달 큐 ---------- */
function pushModal(m) { S.modals.push(m); }
function closeModal() { S.modals.shift(); render(); }
G.closeModal = closeModal;

/* =========================================================
 * 낮 행동
 * ========================================================= */
function actor() { return sv(S.selected); }

G.select = (id) => { S.selected = id; S.tab = 'crew'; render(); };
G.tab = (t) => { S.tab = t; render(); };

G.eat = (id, item) => {
  const s = sv(id);
  if (!active(s) || (S.inv[item] || 0) < 1) return;
  S.inv[item]--;
  if (item === 'can') { s.hunger = clamp(s.hunger - 40, 0, 100); }
  else if (item === 'meal') { s.hunger = clamp(s.hunger - 50, 0, 100); changeMorale(s, 4); }
  else if (item === 'raw') {
    s.hunger = clamp(s.hunger - 20, 0, 100);
    if (chance(0.15)) { s.sick = true; log(`${s.name}이(가) 날음식을 먹고 배탈이 났다.`, 'bad'); }
  }
  s.thought = item === 'meal' ? '따뜻한 음식이라니, 살 것 같아.' : '조금은 허기가 가셨다.';
  render();
};
G.drink = (id) => {
  const s = sv(id);
  if (!active(s) || S.inv.water < 1) return;
  S.inv.water--;
  s.thirst = clamp(s.thirst - 50, 0, 100);
  s.thought = '물이 이렇게 달 줄이야.';
  render();
};
G.luxury = (id, item) => {
  const s = sv(id);
  if (!active(s) || (S.inv[item] || 0) < 1) return;
  S.inv[item]--;
  if (item === 'coffee') { s.fatigue = clamp(s.fatigue - 20, 0, 100); changeMorale(s, 8); s.thought = '쓰다. 그래도 정신이 든다.'; }
  if (item === 'cigarette') { changeMorale(s, 12); s.health = clamp(s.health - 2, 0, 100); s.thought = '후우… 잠깐이나마 잊을 수 있어.'; }
  render();
};
G.rest = (id) => {
  const s = sv(id);
  if (apLeft(s) < 1) return;
  s.apUsed += 1;
  s.fatigue = clamp(s.fatigue - 25, 0, 100);
  changeMorale(s, 4);
  s.room = 'bedroom';
  s.thought = '눈을 감으니 총소리가 조금 멀어진다.';
  render();
};
G.treat = (actorId, targetId, item) => {
  const a = sv(actorId), t = sv(targetId);
  if (!canWork(a, 1) || !active(t) || (S.inv[item] || 0) < 1) return;
  S.inv[item]--;
  useAP(a, 1);
  const mult = a.trait === 'medic' ? 2 : 1;
  if (item === 'bandage') {
    t.health = clamp(t.health + 20 * mult, 0, 100);
    log(`${a.name}이(가) ${t.name}의 상처에 붕대를 감았다. (체력 +${20 * mult})`, 'good');
  } else {
    const wasSick = t.sick;
    t.sick = false;
    t.health = clamp(t.health + 15 * mult, 0, 100);
    log(`${a.name}이(가) ${t.name}에게 의약품을 투여했다.${wasSick ? ' 병이 나았다.' : ''} (체력 +${15 * mult})`, 'good');
  }
  a.room = 'infirmary';
  t.thought = a.id === t.id ? '스스로라도 버텨야 해.' : `고마워, ${a.name}.`;
  render();
};
G.talk = (actorId, targetId) => {
  const a = sv(actorId), t = sv(targetId);
  if (!canWork(a, 1) || !active(t) || a.id === t.id) return;
  useAP(a, 1);
  const amt = a.trait === 'cheerful' ? 20 : a.trait === 'medic' ? 16 : 12;
  changeMorale(t, amt);
  changeMorale(a, 3);
  t.room = a.room;
  t.thought = `${a.name}와 이야기하니 조금 나아졌어.`;
  log(`${a.name}이(가) ${t.name}와 긴 이야기를 나눴다. (사기 +${amt})`, 'good');
  render();
};

function recipeAP(r, s) { return r.cat === 'build' || r.cat === 'craft' ? Math.max(1, r.ap - (s && s.trait === 'engineer' ? 1 : 0)) : r.ap; }
function recipeState(r) {
  if (r.req) for (const [k, v] of Object.entries(r.req)) if ((S.buildings[k] || 0) < v) return { ok: false, why: `${BUILD_NAMES[k]} ${v}단계 필요` };
  if (r.roof && !S.roofOpen) return { ok: false, why: '옥상 계단 잔해를 치워야 함' };
  if (r.cat === 'build' && (S.buildings[r.id] || 0) >= r.max) return { ok: false, why: '최대 단계', maxed: true };
  if (!hasItems(r.cost)) return { ok: false, why: '재료 부족' };
  return { ok: true };
}
G.craft = (rid) => {
  const r = RECIPES.find((x) => x.id === rid);
  const a = actor();
  if (!r || !a) return;
  const st = recipeState(r);
  const need = recipeAP(r, a);
  if (!st.ok) return toast(st.why);
  if (!canWork(a, need)) return toast(`${a.name}의 행동력이 부족합니다.`);
  addTo(S.inv, r.cost, -1);
  useAP(a, need);
  if (r.cat === 'build') {
    S.buildings[r.id] = (S.buildings[r.id] || 0) + 1;
    log(`${a.name}이(가) ${r.name}을(를) 완성했다.${r.max > 1 ? ` (${S.buildings[r.id]}단계)` : ''}`, 'good');
  } else {
    addTo(S.inv, r.give);
    log(`${a.name}: ${r.name} → ${itemsText(r.give)}`, '');
  }
  a.room = ['cook'].includes(r.id) || ['stove', 'heater'].includes(r.id) ? 'kitchen'
    : ['collector', 'garden', 'radio'].includes(r.id) ? 'roof'
    : r.id === 'barricade' ? 'entrance' : r.id === 'bed' ? 'bedroom' : 'workshop';
  a.thought = pick(['손이 바쁘면 잡생각이 줄어든다.', '이 정도면 쓸 만하겠지.', '하나씩, 하나씩.']);
  render();
};
G.clearRubble = (rid) => {
  const a = actor();
  const def = RUBBLE.find((r) => r.id === rid);
  const st = S.rubble.find((r) => r.id === rid);
  if (!a || !def || st.cleared) return;
  if (!canWork(a, def.ap)) return toast(`${a.name}의 행동력이 부족합니다. (필요 ${def.ap})`);
  useAP(a, def.ap);
  st.cleared = true;
  addTo(S.inv, def.loot);
  a.room = def.room;
  log(`${a.name}이(가) ${def.name}을(를) 치웠다. 획득: ${itemsText(def.loot)}`, 'good');
  if (def.unlocksRoof) { S.roofOpen = true; log('옥상으로 가는 길이 열렸다. 옥상 시설을 지을 수 있다.', 'story'); }
  render();
};

/* =========================================================
 * 밤 계획
 * ========================================================= */
function unlockedLocs() { return LOCATIONS.filter((l) => S.day >= l.unlockDay); }

function getLoc(id) {
  if (!S.locs[id]) {
    const def = LOCATIONS.find((l) => l.id === id);
    S.locs[id] = {
      visits: 0,
      enemyAlive: !!def.enemy,
      rooms: def.rooms.map((r) => {
        const loot = {};
        for (const [k, [a, b]] of Object.entries(r.loot)) { const n = rand(a, b); if (n > 0) loot[k] = n; }
        return { name: r.name, loot, searched: false, locked: !!r.locked, owned: !!r.owned, special: r.special || null,
          guard: !!r.guard, ownerMet: false, closed: false };
      }),
    };
  }
  return S.locs[id];
}
function locLootLeft(id) {
  const st = S.locs[id];
  if (!st) return null;
  return st.rooms.reduce((s, r) => s + Object.values(r.loot).reduce((a, b) => a + b, 0), 0);
}

G.openNight = () => {
  const c = crew();
  const assign = {};
  let beds = S.buildings.bed;
  c.forEach((s) => { assign[s.id] = beds > 0 ? 'bed' : 'floor'; if (beds > 0) beds--; });
  S.plan = { assign, loc: null };
  pushModal({ type: 'night' });
  render();
};
G.setNight = (id, task) => {
  const a = S.plan.assign;
  if (task === 'scav') for (const k in a) if (a[k] === 'scav') a[k] = 'floor';
  if (task === 'bed') {
    const used = Object.entries(a).filter(([k, v]) => v === 'bed' && k !== id).length;
    if (used >= S.buildings.bed) return toast('남은 침대가 없습니다.');
  }
  a[id] = task;
  if (!Object.values(a).includes('scav')) S.plan.loc = null;
  render();
};
G.setLoc = (id) => { S.plan.loc = id; render(); };
G.startNight = () => {
  const a = S.plan.assign;
  const scavId = Object.keys(a).find((k) => a[k] === 'scav');
  if (scavId && !S.plan.loc) return toast('수색할 지역을 선택하세요.');
  crew().forEach((s) => (s.night = a[s.id] || 'floor'));
  S.modals.shift();
  if (scavId) startScav(scavId, S.plan.loc);
  else resolveNight();
};

/* =========================================================
 * 야간 수색
 * ========================================================= */
function startScav(sid, locId) {
  const s = sv(sid);
  const def = LOCATIONS.find((l) => l.id === locId);
  const st = getLoc(locId);
  st.visits++;
  S.stats.scavs++;
  let weapon = null, ammo = 0;
  if (S.inv.rifle > 0 && S.inv.ammo > 0) weapon = 'rifle';
  else if (S.inv.pistol > 0 && S.inv.ammo > 0) weapon = 'pistol';
  else if (S.inv.knife > 0) weapon = 'knife';
  else if (S.inv.rifle > 0) weapon = 'rifle';
  else if (S.inv.pistol > 0) weapon = 'pistol';
  if (weapon) {
    S.inv[weapon]--;
    if (WEAPONS[weapon].gun) { ammo = Math.min(S.inv.ammo, 3); S.inv.ammo -= ammo; }
  }
  S.scav = {
    sid, locId, t: 0, noise: 0, pos: 0, pack: {}, cap: 12 + (s.trait === 'scout' ? 4 : 0),
    weapon, ammo, stole: false, threatened: false, helped: false, killed: 0, fought: false,
    ended: false, endReason: '', takenOwned: {}, msgs: [], died: false,
    enemyAlive: st.enemyAlive && !!def.enemy,
  };
  scMsg(`${s.name}이(가) 어둠을 틈타 ${def.name}(으)로 향했다.${weapon ? ` 장비: ${ITEMS[weapon].icon}${ITEMS[weapon].name}${ammo ? ` (탄약 ${ammo})` : ''}` : ' 무기 없음.'}`);
  S.phase = 'scav';
  render();
}
function scMsg(m, type = '') { S.scav.msgs.unshift({ m, type }); }
const scDef = () => LOCATIONS.find((l) => l.id === S.scav.locId);
const scLoc = () => S.locs[S.scav.locId];
const scRoom = () => scLoc().rooms[S.scav.pos];
const scSurv = () => sv(S.scav.sid);
const timeLeft = () => NIGHT_HOURS - S.scav.t;
function clockStr(t) { const h = (21 + t) % 24; return String(h).padStart(2, '0') + ':00'; }

function spendTime(h, noise) {
  const sc = S.scav;
  sc.t += h;
  sc.noise = clamp(sc.noise + noise, 0, 10);
  scSurv().fatigue = clamp(scSurv().fatigue + 3 * h, 0, 100);
}
function afterAction(forceEncounter) {
  const sc = S.scav;
  if (sc.ended) return render();
  const def = scDef();
  if (sc.enemyAlive && def.enemy) {
    const p = def.enemy.base + sc.noise * 0.035;
    if (forceEncounter || chance(p)) {
      pushModal({ type: 'encounter', kind: 'enemy', forced: !!forceEncounter });
      return render();
    }
  }
  if (timeLeft() <= 0) endScav('dawn');
  render();
}

G.scSearch = () => {
  const sc = S.scav, room = scRoom(), s = scSurv();
  if (room.searched || room.locked || timeLeft() < 1) return;
  spendTime(1, s.trait === 'scout' ? 0.5 : 1);
  room.searched = true;
  const n = Object.keys(room.loot).length;
  scMsg(`${room.name}을(를) 뒤졌다. ${n ? '쓸 만한 물건이 보인다.' : '텅 비어 있다.'}`);
  if (room.owned && !room.ownerMet && sc.noise >= 3) {
    room.ownerMet = true;
    pushModal({ type: 'encounter', kind: 'owner' });
    return render();
  }
  afterAction(false);
};
G.scMove = (dir) => {
  const sc = S.scav;
  const np = sc.pos + dir;
  if (np < 0 || np >= scLoc().rooms.length || timeLeft() < 1) return;
  spendTime(1, 0);
  sc.pos = np;
  const room = scRoom();
  scMsg(`${room.name}(으)로 이동했다.`);
  afterAction(room.guard && sc.enemyAlive);
};
G.scUnlock = (mode) => {
  const room = scRoom();
  if (!room.locked) return;
  const h = mode === 'quiet' ? 2 : 1;
  if (timeLeft() < h) return;
  spendTime(h, mode === 'quiet' ? 1 : 4);
  room.locked = false;
  scMsg(mode === 'quiet' ? '조심스럽게 자물쇠를 땄다.' : '쾅! 문을 부숴 열었다. 소리가 울려 퍼진다…', mode === 'quiet' ? '' : 'bad');
  afterAction(false);
};
G.scPick = (item) => {
  const sc = S.scav, room = scRoom();
  if (!room.searched || room.closed || !(room.loot[item] > 0)) return;
  if (weightOf(sc.pack) + ITEMS[item].w > sc.cap) return toast('배낭이 가득 찼습니다.');
  room.loot[item]--;
  if (!room.loot[item]) delete room.loot[item];
  sc.pack[item] = (sc.pack[item] || 0) + 1;
  if (room.owned) { sc.stole = true; sc.takenOwned[item] = (sc.takenOwned[item] || 0) + 1; }
  render();
};
G.scDrop = (item) => {
  const sc = S.scav, room = scRoom();
  if (!(sc.pack[item] > 0)) return;
  sc.pack[item]--;
  if (!sc.pack[item]) delete sc.pack[item];
  room.loot[item] = (room.loot[item] || 0) + 1;
  if (room.owned && sc.takenOwned[item] > 0) {
    sc.takenOwned[item]--;
    if (!Object.values(sc.takenOwned).some((v) => v > 0)) sc.stole = false;
  }
  render();
};
G.scHelp = (item) => {
  const sc = S.scav, room = scRoom();
  if (room.special !== 'wounded' || !(sc.pack[item] > 0)) return;
  sc.pack[item]--;
  if (!sc.pack[item]) delete sc.pack[item];
  room.special = 'helped';
  sc.helped = true;
  S.stats.helped++;
  scMsg(`성당 지하의 부상자에게 ${ITEMS[item].name}을(를) 건넸다. "신의 가호가 있기를…"`, 'good');
  render();
};
G.scTrade = () => {
  pushModal({ type: 'trade', src: 'pack', stockKey: 'trader', title: '드래곤로드 암시장', markup: 1.3, offer: {}, ask: {} });
  render();
};
G.scLeave = () => {
  if (!confirm('지금 은신처로 돌아갑니까?')) return;
  endScav('leave');
};

function endScav(reason) {
  const sc = S.scav;
  if (sc.ended) return;
  sc.ended = true;
  sc.endReason = reason;
  scLoc().enemyAlive = sc.enemyAlive;
  pushModal({ type: 'scavEnd' });
  render();
}

/* 전투 */
function fightPower(s, weapon, ammo) {
  let p = 1;
  if (weapon) {
    const w = WEAPONS[weapon];
    p += w.gun && ammo <= 0 ? 0.5 : w.power;
  }
  if (s.trait === 'sniper') p += 2;
  if (s.health < 50) p -= 1;
  if (s.fatigue > 70) p -= 0.7;
  return Math.max(0.5, p);
}
function winChance(s, weapon, ammo, enemyPower) {
  return clamp(0.5 + (fightPower(s, weapon, ammo) - enemyPower) * 0.13, 0.08, 0.92);
}
function fleeChance(s) {
  const sc = S.scav;
  return clamp(0.55 + (s.trait === 'scout' ? 0.2 : 0) - (weightOf(sc.pack) / sc.cap) * 0.2 - (s.health < 50 ? 0.1 : 0), 0.1, 0.95);
}
function hideChance(s) {
  return clamp(0.5 + (s.trait === 'scout' ? 0.2 : 0) - S.scav.noise * 0.05, 0.08, 0.9);
}
function losePack(frac) {
  const sc = S.scav;
  const lost = {};
  for (const k of Object.keys(sc.pack)) {
    const n = Math.ceil(sc.pack[k] * frac);
    if (n > 0) { lost[k] = n; sc.pack[k] -= n; if (sc.pack[k] <= 0) delete sc.pack[k]; }
  }
  return lost;
}
function hurtScav(n) {
  const s = scSurv();
  s.health = clamp(s.health - n, 0, 100);
  if (s.health <= 0) { S.scav.died = true; }
}

G.encounter = (choice) => {
  const m = S.modals[0];
  const sc = S.scav, s = scSurv(), def = scDef(), room = scRoom();
  S.modals.shift();

  if (m.kind === 'owner') {
    if (choice === 'apologize') {
      for (const [k, v] of Object.entries(sc.takenOwned)) {
        if (v > 0 && sc.pack[k] > 0) {
          const back = Math.min(v, sc.pack[k]);
          sc.pack[k] -= back; if (!sc.pack[k]) delete sc.pack[k];
          room.loot[k] = (room.loot[k] || 0) + back;
        }
      }
      sc.takenOwned = {}; sc.stole = false; room.closed = true;
      scMsg('노부부에게 고개를 숙이고 물러났다. 할머니가 떨리는 손으로 문을 닫았다.', '');
    } else {
      sc.threatened = true;
      scMsg('노인의 애원을 외면했다. "제발… 그건 우리 마지막 식량이야…"', 'bad');
    }
    return afterAction(false);
  }

  // 적 조우
  const enemy = def.enemy;
  sc.noise = clamp(sc.noise + 2, 0, 10);
  if (choice === 'fight') {
    sc.fought = true;
    const p = winChance(s, sc.weapon, sc.ammo, enemy.power + (m.ambushed ? 1 : 0));
    if (sc.weapon && WEAPONS[sc.weapon].gun && sc.ammo > 0) sc.ammo = Math.max(0, sc.ammo - rand(1, 2));
    if (chance(p)) {
      sc.enemyAlive = false;
      sc.killed++;
      S.stats.kills++;
      addTo(room.loot, enemy.drop);
      room.searched = true;
      let msg = `${enemy.name}와(과) 교전 끝에 쓰러뜨렸다. 시체 곁에 물자가 떨어져 있다.`;
      if (chance(0.35)) { const d = rand(8, 18); hurtScav(d); msg += ` 하지만 ${s.name}도 부상을 입었다. (체력 -${d})`; }
      scMsg(msg, 'warn');
      if (sc.died) return scavDeath();
      return afterAction(false);
    }
    const d = rand(25, 40);
    hurtScav(d);
    const lost = losePack(0.5);
    scMsg(`교전에서 밀렸다! 큰 부상을 입고 간신히 도망쳤다. (체력 -${d}) 잃어버린 물건: ${itemsText(lost)}`, 'bad');
    if (sc.died) return scavDeath();
    return endScav('beaten');
  }
  if (choice === 'flee') {
    if (chance(fleeChance(s))) {
      scMsg(`${enemy.name}을(를) 피해 전력으로 도망쳤다. 배낭은 무사하다.`, 'warn');
      return endScav('fled');
    }
    const d = rand(15, 25);
    hurtScav(d);
    const lost = losePack(0.34);
    scMsg(`도망치다 등 뒤에서 총격을 받았다! (체력 -${d}) 잃어버린 물건: ${itemsText(lost)}`, 'bad');
    if (sc.died) return scavDeath();
    return endScav('fled');
  }
  if (choice === 'hide') {
    if (chance(hideChance(s))) {
      sc.noise = Math.max(0, sc.noise - 4);
      scMsg(`숨을 죽이고 그림자 속에 숨었다. ${enemy.name}이(가) 지나갔다.`, '');
      if (room.guard) { room.guard = false; scMsg('검문소를 몰래 통과했다.', 'good'); }
      return afterAction(false);
    }
    scMsg('들켰다! 피할 수 없다.', 'bad');
    pushModal({ type: 'encounter', kind: 'enemy', forced: true, ambushed: true, noHide: true });
    return render();
  }
  if (choice === 'bribe') {
    const paid = payBribe(8);
    sc.enemyAlive = false;
    if (room.guard) room.guard = false;
    scMsg(`${enemy.name}에게 ${itemsText(paid)}을(를) 건네고 통과를 허락받았다. "밤새 조용히 다녀."`, 'warn');
    return afterAction(false);
  }
  render();
};
function payBribe(target) {
  const sc = S.scav;
  const paid = {};
  let v = 0;
  const keys = Object.keys(sc.pack).sort((a, b) => ITEMS[b].val - ITEMS[a].val);
  for (const k of keys) {
    while (sc.pack[k] > 0 && v < target) {
      sc.pack[k]--; v += ITEMS[k].val; paid[k] = (paid[k] || 0) + 1;
    }
    if (!sc.pack[k]) delete sc.pack[k];
    if (v >= target) break;
  }
  return paid;
}
function scavDeath() {
  const sc = S.scav, s = scSurv();
  scMsg(`${s.name}은(는) 끝내 돌아오지 못했다…`, 'bad');
  sc.pack = {};
  sc.weapon = null; sc.ammo = 0;
  endScav('died');
}

/* =========================================================
 * 거래
 * ========================================================= */
function tradeSrc(m) { return m.src === 'pack' ? S.scav.pack : S.inv; }
function tradeStock(m) { return S.stock[m.stockKey]; }
G.tradeAdj = (side, item, d) => {
  const m = S.modals[0];
  const bag = side === 'offer' ? m.offer : m.ask;
  const pool = side === 'offer' ? tradeSrc(m) : tradeStock(m);
  const n = clamp((bag[item] || 0) + d, 0, pool[item] || 0);
  if (n) bag[item] = n; else delete bag[item];
  render();
};
function tradeEval(m) {
  const give = valueOf(m.offer);
  const get = Math.ceil(valueOf(m.ask) * m.markup);
  let weightOk = true;
  if (m.src === 'pack') weightOk = weightOf(S.scav.pack) - weightOf(m.offer) + weightOf(m.ask) <= S.scav.cap;
  return { give, get, ok: give >= get && get > 0 && weightOk, weightOk };
}
G.tradeDo = () => {
  const m = S.modals[0];
  const ev = tradeEval(m);
  if (!ev.ok) return toast(ev.weightOk ? '대가가 부족합니다.' : '배낭 공간이 부족합니다.');
  const src = tradeSrc(m), stock = tradeStock(m);
  for (const [k, v] of Object.entries(m.offer)) { src[k] -= v; if (m.src === 'pack' && !src[k]) delete src[k]; stock[k] = (stock[k] || 0) + v; }
  for (const [k, v] of Object.entries(m.ask)) { stock[k] -= v; if (!stock[k]) delete stock[k]; src[k] = (src[k] || 0) + v; }
  const msg = `거래 성사: ${itemsText(m.offer)} → ${itemsText(m.ask)}`;
  if (m.src === 'pack') scMsg(msg, 'good'); else log(msg, 'good');
  m.offer = {}; m.ask = {};
  toast('거래 완료');
  render();
};

/* =========================================================
 * 밤 결과 → 아침
 * ========================================================= */
function rollRaid() {
  const p = S.day < 2 ? 0 : Math.min(0.12 + S.day * 0.016, 0.5);
  S.raidTonight = S.protectedUntil >= S.day ? false : chance(p);
  S.radioForecast = S.buildings.radio ? ((chance(0.8) ? S.raidTonight : !S.raidTonight) ? 'high' : 'low') : null;
}

function guardLoadout() {
  const pool = { rifle: S.inv.rifle, pistol: S.inv.pistol, knife: S.inv.knife };
  let ammo = S.inv.ammo;
  return crew().filter((s) => s.night === 'guard').map((s) => {
    let w = null;
    if (pool.rifle > 0 && ammo > 0) { w = 'rifle'; pool.rifle--; ammo--; }
    else if (pool.pistol > 0 && ammo > 0) { w = 'pistol'; pool.pistol--; ammo--; }
    else if (pool.knife > 0) { w = 'knife'; pool.knife--; }
    return { s, w, ammoUsed: w && WEAPONS[w].gun ? 1 : 0 };
  });
}

function resolveNight() {
  const R = [];  // 아침 보고
  const c = crew();
  const sc = S.scav;

  /* 1) 약탈 */
  if (S.raidTonight) {
    S.stats.raids++;
    const strength = rand(2, 4) + Math.floor(S.day / 5);
    const guards = guardLoadout();
    let defense = S.buildings.barricade * 2;
    guards.forEach((g) => { defense += 1 + (g.w ? WEAPONS[g.w].power : 0) + (g.s.trait === 'sniper' ? 2 : 0); });
    defense += c.filter((s) => s.night === 'bed' || s.night === 'floor').length * 0.3;
    guards.forEach((g) => (S.inv.ammo -= g.ammoUsed));
    if (defense >= strength) {
      S.stats.repelled++;
      R.push({ t: 'warn', m: `🌙 한밤중 약탈자들이 은신처를 습격했다! ${guards.length ? guards.map((g) => g.s.name).join(', ') + '이(가) 맞서 싸워' : '바리케이드 덕분에'} 물리쳤다.` });
      guards.forEach((g) => { if (chance(0.25)) { const d = rand(6, 14); g.s.health -= d; R.push({ t: 'bad', m: `${g.s.name}이(가) 교전 중 다쳤다. (체력 -${d})` }); } });
      moraleAll(3);
    } else {
      const gap = strength - defense;
      const frac = clamp(0.2 + gap * 0.08, 0.2, 0.65);
      const stolen = {};
      const keys = ITEM_ORDER.filter((k) => S.inv[k] > 0);
      keys.sort(() => Math.random() - 0.5).slice(0, rand(3, 5)).forEach((k) => {
        const n = Math.max(1, Math.floor(S.inv[k] * frac));
        S.inv[k] -= n; stolen[k] = n;
      });
      R.push({ t: 'bad', m: `🌙 약탈자들이 은신처를 덮쳤다! 막아내지 못했다. 빼앗긴 물자: ${itemsText(stolen)}` });
      const victims = guards.length ? guards.map((g) => g.s) : c.filter((s) => s.night !== 'scav');
      const v = victims.length ? pick(victims) : null;
      if (v) { const d = rand(15, 35); v.health -= d; R.push({ t: 'bad', m: `${v.name}이(가) 약탈자에게 크게 다쳤다. (체력 -${d})` }); }
      if (S.buildings.barricade > 0 && chance(0.4)) { S.buildings.barricade--; R.push({ t: 'bad', m: '바리케이드 일부가 부서졌다.' }); }
      moraleAll(-8);
    }
  } else if (c.some((s) => s.night === 'guard')) {
    R.push({ t: '', m: '조용한 밤이었다. 경계 근무자들은 뜬눈으로 밤을 지새웠다.' });
  }

  /* 2) 수색 귀환 */
  if (sc) {
    const s = sv(sc.sid);
    const def = LOCATIONS.find((l) => l.id === sc.locId);
    if (sc.died) {
      s.alive = false; s.health = 0;
      S.stats.deaths++;
      R.push({ t: 'bad', m: `☠ ${s.name}은(는) ${def.name}에서 돌아오지 못했다.` });
      moraleAll(-22, s.id);
    } else {
      if (sc.weapon) S.inv[sc.weapon] = (S.inv[sc.weapon] || 0) + 1;
      S.inv.ammo += sc.ammo;
      addTo(S.inv, sc.pack);
      R.push({ t: 'good', m: `🎒 ${s.name}이(가) ${def.name}에서 돌아왔다. 획득: ${itemsText(sc.pack)}` });
      if (sc.stole) {
        S.stats.stolen++;
        changeMorale(s, -15);
        moraleAll(-6, s.id);
        R.push({ t: 'bad', m: `${s.name}은(는) 노부부의 식량을 훔친 것을 괴로워한다. 동료들도 말이 없다. (사기 하락)` });
        S.delayed.push({ day: S.day + 3, id: 'elders' });
      }
      if (sc.threatened) { changeMorale(s, -10); moraleAll(-4, s.id); }
      if (sc.killed) {
        changeMorale(s, s.trait === 'sniper' ? -4 : -14);
        moraleAll(-3, s.id);
        R.push({ t: 'warn', m: `${s.name}: "${s.trait === 'sniper' ? '익숙해진다는 게 더 무섭군.' : '그 사람… 눈을 감지 못했어.'}"` });
      }
      if (sc.helped) { moraleAll(10); R.push({ t: 'good', m: '부상자를 도왔다는 소식에 모두의 표정이 조금 밝아졌다. (사기 +10)' }); }
    }
  }

  /* 3) 난방 */
  const winter = S.day >= WINTER_DAY;
  let cold = false;
  if (winter) {
    if (S.buildings.heater && S.inv.fuel >= 1) { S.inv.fuel--; R.push({ t: '', m: '♨️ 난로에 연료 1을 태워 밤을 버텼다.' }); }
    else if (S.buildings.heater && S.inv.wood >= 2) { S.inv.wood -= 2; R.push({ t: '', m: '♨️ 난로에 목재 2를 태워 밤을 버텼다.' }); }
    else { cold = true; R.push({ t: 'bad', m: '❄ 혹한의 밤. 난방 없이 모두가 떨며 지새웠다.' }); }
  }

  /* 4) 생존자 상태 */
  crew().forEach((s) => {
    if (sc && sc.died && s.id === sc.sid) return;
    switch (s.night) {
      case 'bed': s.fatigue -= 50; break;
      case 'floor': s.fatigue -= 30; changeMorale(s, -1); break;
      case 'guard': s.fatigue += 15; break;
      case 'scav': s.fatigue += 20; break;
    }
    s.fatigue = clamp(s.fatigue, 0, 100);
    s.hunger = clamp(s.hunger + 20, 0, 100);
    s.thirst = clamp(s.thirst + 25, 0, 100);

    if (s.hunger >= 100) { s.health -= 15; changeMorale(s, -6); }
    else if (s.hunger >= 75) { s.health -= 6; changeMorale(s, -4); }
    if (s.thirst >= 100) { s.health -= 20; changeMorale(s, -6); }
    else if (s.thirst >= 75) { s.health -= 8; changeMorale(s, -4); }

    if (s.sick) {
      s.health -= 7; changeMorale(s, -3);
      if (chance(0.18 + (s.night === 'bed' ? 0.15 : 0) + (s.hunger < 50 ? 0.07 : 0))) { s.sick = false; R.push({ t: 'good', m: `${s.name}의 열이 내렸다.` }); }
    } else {
      const p = 0.02 + (s.hunger >= 60 ? 0.05 : 0) + (s.thirst >= 60 ? 0.04 : 0) + (s.night === 'floor' ? 0.03 : 0)
        + (cold ? 0.1 : 0) + (s.health < 40 ? 0.05 : 0);
      if (chance(p)) { s.sick = true; R.push({ t: 'bad', m: `🤒 ${s.name}이(가) 병에 걸렸다.` }); }
    }
    if (!s.sick && s.hunger < 50 && s.thirst < 50) s.health += s.night === 'bed' ? 6 : s.night === 'floor' ? 2 : 0;
    if (s.fatigue >= 95) s.health -= 5;
    if (cold) changeMorale(s, -4);
    changeMorale(s, -2);  // 전쟁 스트레스
    if (S.buildings.radio) changeMorale(s, 2);
    s.health = clamp(s.health, 0, 100);
  });
  if (crew().some((s) => s.trait === 'cheerful')) {
    const d = crew().find((s) => s.trait === 'cheerful');
    moraleAll(3, d.id);
    R.push({ t: 'good', m: `🎸 ${d.name}의 서툰 기타 연주에 다들 피식 웃었다.` });
  }

  /* 5) 사망·이탈 */
  crew().forEach((s) => {
    if (s.health <= 0) {
      s.alive = false;
      S.stats.deaths++;
      R.push({ t: 'bad', m: `☠ ${s.name}이(가) 숨을 거뒀다. 남은 이들은 말없이 그를 묻었다.` });
      moraleAll(-22, s.id);
    }
  });
  crew().forEach((s) => {
    if (s.morale <= 0) {
      s.brokenDays++;
      if (s.brokenDays >= 2) {
        s.gone = true;
        const took = {};
        ITEM_ORDER.filter((k) => S.inv[k] > 0).sort(() => Math.random() - 0.5).slice(0, 2).forEach((k) => { S.inv[k]--; took[k] = 1; });
        R.push({ t: 'bad', m: `🚪 절망에 빠진 ${s.name}이(가) 밤사이 은신처를 떠났다. 가져간 물건: ${itemsText(took)}` });
        moraleAll(-10, s.id);
      } else {
        R.push({ t: 'bad', m: `${s.name}이(가) 완전히 무너졌다. 아무도 위로하지 않는다면 곧 떠날지도 모른다.` });
      }
    } else s.brokenDays = 0;
  });

  /* 6) 시설 생산 */
  if (S.buildings.collector) {
    const w = 2 * S.buildings.collector;
    S.inv.water += w;
    R.push({ t: '', m: `🪣 빗물 집수기에서 식수 ${w}을(를) 모았다.` });
  }
  if (S.buildings.garden) {
    if (S.inv.water >= 1) {
      const g = S.buildings.garden;
      S.inv.water--; S.inv.raw += g;
      let m = `🌱 텃밭에서 식재료 ${g}을(를) 수확했다.`;
      if (S.day % 2 === 0) { S.inv.herb++; m += ' 약초도 1 자랐다.'; }
      R.push({ t: '', m });
    } else R.push({ t: 'bad', m: '🌱 물이 없어 텃밭이 말라 간다.' });
  }

  /* 7) 하루 넘기기 */
  S.day++;
  S.scav = null;
  S.phase = 'day';
  S.lastRain = false;
  crew().forEach((s) => {
    s.apUsed = 0; s.night = null;
    s.room = s.sick || s.health < 40 ? 'infirmary' : pick(['workshop', 'kitchen', 'storage', 'bedroom']);
    s.thought = makeThought(s);
  });
  // 지역 물자 재유입
  for (const [id, st] of Object.entries(S.locs)) {
    if (chance(0.4)) {
      const def = LOCATIONS.find((l) => l.id === id);
      for (let i = rand(1, 2); i > 0; i--) {
        const ri = rand(0, st.rooms.length - 1);
        const keys = Object.keys(def.rooms[ri].loot);
        if (keys.length) { const k = pick(keys); st.rooms[ri].loot[k] = (st.rooms[ri].loot[k] || 0) + 1; }
      }
    }
    if (!st.enemyAlive && LOCATIONS.find((l) => l.id === id).enemy && chance(0.3)) st.enemyAlive = true;
  }
  // 상인 재고 보충
  if (S.day % 4 === 0) addTo(S.stock.trader, { can: 2, ammo: 1, medicine: 1, water: 1 });

  LOCATIONS.filter((l) => l.unlockDay === S.day).forEach((l) => R.push({ t: 'story', m: `📍 새로운 수색 지역 정보: ${l.name} — ${l.sub}` }));
  if (S.day === WINTER_DAY) R.push({ t: 'story', m: '❄ 첫눈이 내렸다. 오늘부터 혹한이 시작된다. 난방을 준비해야 한다.' });

  R.forEach((r) => log(r.m, r.t));

  if (!crew().length || S.day >= CEASEFIRE_DAY) {
    S.phase = 'end';
    S.ending = crew().length ? 'win' : 'dead';
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
    render();
    return;
  }

  rollRaid();
  pushModal({ type: 'report', lines: R });
  rollEvent();
  saveGame(true);
  render();
}

/* =========================================================
 * 이벤트
 * ========================================================= */
const EVENTS = {
  recruit_sora: {
    cond: () => S.day >= 3 && !S.joined.includes('sora'),
    weight: 4,
    make: () => ({
      title: '문 두드리는 소리', who: 'sora',
      text: '새벽녘, 누군가 문을 조용히 세 번 두드린다. 낡은 정찰복을 입은 젊은 여자다.\n"한소라, 정찰병이었어요. 부대는… 없어요. 사흘째 아무것도 못 먹었어요. 쓸모 있는 사람이 될게요."',
      options: [
        { label: '받아들인다 (식구 +1)', fn: () => { joinSurvivor('sora', { hunger: 65, morale: 50 }); return '한소라가 은신처에 합류했다.'; } },
        { label: '돌려보낸다', fn: () => { moraleAll(-6); S.joined.push('sora'); return '문을 닫았다. 발소리가 멀어진다. 누구도 그 얘기를 꺼내지 않았다.'; } },
      ],
    }),
  },
  recruit_doyun: {
    cond: () => S.day >= 8 && !S.joined.includes('doyun'),
    weight: 4,
    make: () => ({
      title: '기타를 멘 소년병', who: 'doyun',
      text: '군복이 헐렁한 소년병이 기타 하나를 메고 서 있다.\n"최도윤 이병입니다! 아니, 이제 이병도 아니겠네요… 혹시 여기 자리 있어요? 노래는 공짜로 해 드릴게요."',
      options: [
        { label: '받아들인다 (식구 +1)', fn: () => { joinSurvivor('doyun', { hunger: 50, morale: 75 }); moraleAll(5); return '최도윤이 합류했다. 은신처에 오랜만에 웃음소리가 났다.'; } },
        { label: '돌려보낸다', fn: () => { moraleAll(-6); S.joined.push('doyun'); return '소년은 고개를 꾸벅 숙이고 떠났다.'; } },
      ],
    }),
  },
  child: {
    cond: () => S.day >= 2, weight: 3,
    make: () => ({
      title: '문틈의 작은 손',
      text: '아이 하나가 문틈으로 손을 내민다.\n"아저씨… 엄마가 아파요. 약이나… 먹을 거 조금만 주시면 안 돼요?"',
      options: [
        { label: `💊 의약품을 준다 (보유 ${S.inv.medicine})`, cond: () => S.inv.medicine > 0,
          fn: () => { S.inv.medicine--; moraleAll(12); S.stats.helped++; return '아이는 약을 꼭 쥐고 달려갔다. 모두 오랜만에 사람다운 일을 했다고 느꼈다. (사기 +12)'; } },
        { label: `🥫 통조림을 준다 (보유 ${S.inv.can})`, cond: () => S.inv.can > 0,
          fn: () => { S.inv.can--; moraleAll(6); S.stats.helped++; return '아이는 통조림을 품에 안고 고맙다고 몇 번이나 말했다. (사기 +6)'; } },
        { label: '모른 척한다', fn: () => { moraleAll(-7); return '작은 손이 문틈에서 사라졌다. (사기 -7)'; } },
      ],
    }),
  },
  wanderer: {
    cond: () => S.day >= 3, weight: 3,
    make: () => {
      S.stock.wanderer = { ...WANDERER_STOCK };
      return {
        title: '떠돌이 상인',
        text: '배낭을 잔뜩 짊어진 노인이 손을 흔든다.\n"총 쏘지 마쇼! 장사하러 왔소. 물건 좋은 거 있으면 바꿉시다."',
        options: [
          { label: '거래한다', fn: () => { S.modals.splice(1, 0, { type: 'trade', src: 'inv', stockKey: 'wanderer', title: '떠돌이 상인', markup: 1.2, offer: {}, ask: {} }); return null; } },
          { label: '돌려보낸다', fn: () => '상인은 어깨를 으쓱하고 떠났다.' },
        ],
      };
    },
  },
  neighbors: {
    cond: () => S.day >= 4 && !S.flags.neighbors, weight: 2,
    make: () => ({
      title: '옆 건물 생존자들',
      text: '옆 건물에 숨어 사는 가족이 찾아왔다.\n"정수 장치가 고장 났어요. 부품 3개만 빌려주실 수 있을까요? 꼭 갚을게요."',
      options: [
        { label: `⚙️ 부품 3을 빌려준다 (보유 ${S.inv.parts})`, cond: () => S.inv.parts >= 3,
          fn: () => { S.inv.parts -= 3; S.flags.neighbors = 1; moraleAll(5); S.delayed.push({ day: S.day + 3, id: 'neighbors_return' }); return '가족은 연신 고개를 숙이며 돌아갔다. (사기 +5)'; } },
        { label: '거절한다', fn: () => { S.flags.neighbors = 1; moraleAll(-3); return '"…그렇겠죠. 다들 힘드니까요."'; } },
      ],
    }),
  },
  recruiter: {
    cond: () => S.day >= 5, weight: 2,
    make: () => ({
      title: '용병 순찰대',
      text: '완장을 찬 용병 순찰대가 문 앞에 섰다.\n"이 구역은 우리가 관리한다. 탄약 3발이나 담배 2갑이면, 사흘간 이 건물은 순찰에서 빼 주지."',
      options: [
        { label: `🔸 탄약 3을 낸다 (보유 ${S.inv.ammo})`, cond: () => S.inv.ammo >= 3,
          fn: () => { S.inv.ammo -= 3; protect(); return '순찰대는 탄약을 챙기고 떠났다. 사흘간 약탈 걱정은 덜었다.'; } },
        { label: `🚬 담배 2를 낸다 (보유 ${S.inv.cigarette})`, cond: () => S.inv.cigarette >= 2,
          fn: () => { S.inv.cigarette -= 2; protect(); return '"좋은 거 피우네." 순찰대는 웃으며 떠났다. 사흘간 약탈 걱정은 덜었다.'; } },
        { label: '거절한다', fn: () => { S.raidTonight = S.raidTonight || chance(0.5); if (S.buildings.radio) S.radioForecast = 'high'; return '"후회할 거다." 순찰대가 침을 뱉고 돌아섰다. 오늘 밤이 걱정된다.'; } },
      ],
    }),
  },
  rain: {
    cond: () => S.day >= 2 && S.day < WINTER_DAY, weight: 2,
    make: () => ({
      title: '폭우', text: '밤새 장대비가 쏟아졌다. 천장 틈으로 빗물이 샌다.',
      options: [{ label: '확인', fn: () => {
        const w = S.buildings.collector ? 3 * S.buildings.collector : 1;
        S.inv.water += w;
        return `양동이로 빗물을 받아 식수 ${w}을(를) 얻었다.${S.buildings.collector ? '' : ' (빗물 집수기가 있었다면 더 많이 모았을 텐데…)'}`;
      } }],
    }),
  },
  shelling: {
    cond: () => S.day >= 3, weight: 2,
    make: () => ({
      title: '포격', text: '새벽, 가까운 곳에 포탄이 떨어졌다. 건물 전체가 흔들리고 먼지가 쏟아진다.',
      options: [{ label: '확인', fn: () => {
        const r = rand(0, 2);
        if (r === 0 && S.buildings.barricade > 0) { S.buildings.barricade--; return '충격으로 바리케이드 한 단계가 무너졌다.'; }
        if (r === 1) { const v = pick(crew()); v.health = clamp(v.health - 12, 0, 100); return `떨어진 파편에 ${v.name}이(가) 다쳤다. (체력 -12)`; }
        moraleAll(-5); return '다친 사람은 없지만, 모두 한동안 말이 없었다. (사기 -5)';
      } }],
    }),
  },
  photo: {
    cond: () => S.day >= 2, weight: 2,
    make: () => {
      const v = pick(crew());
      return {
        title: '오래된 사진',
        text: `${v.name}이(가) 소지품에서 빛바랜 사진 한 장을 꺼내 오래도록 바라본다. 전쟁 전, 웃고 있는 사람들.`,
        options: [{ label: '확인', fn: () => { changeMorale(v, -10); v.thought = '다들 살아 있을까…'; return `${v.name}의 사기가 떨어졌다. 누군가 이야기를 들어 주면 좋겠다. (사기 -10)`; } }],
      };
    },
  },
  broadcast: {
    cond: () => S.buildings.radio > 0, weight: 3,
    make: () => ({
      title: '무전 방송',
      text: pick([
        '"…휴전 협상이 재개되었습니다. 양측 대표단은…" 잡음 너머로 희망적인 소식이 들린다.',
        '"…민간인 구호 물자가 곧 도시 외곽에…" 누군가 작게 환호했다.',
        '오래된 가요가 흘러나온다. 다 같이 작게 흥얼거렸다.',
      ]),
      options: [{ label: '확인', fn: () => { moraleAll(6); return '모두의 사기가 올랐다. (사기 +6)'; } }],
    }),
  },
};
const DELAYED = {
  neighbors_return: () => ({
    title: '빚을 갚으러 온 이웃', text: '옆 건물 가족이 다시 찾아왔다. "덕분에 물을 마실 수 있게 됐어요. 약소하지만…"',
    options: [{ label: '받는다', fn: () => { addTo(S.inv, { can: 3, water: 3, herb: 2 }); moraleAll(6); return '통조림 3, 식수 3, 약초 2를 받았다. 세상에 아직 좋은 사람들이 있다. (사기 +6)'; } }],
  }),
  elders: () => ({
    title: '프로방스의 소문', text: '무전기도 없이 소문은 빨리 돈다. 프로방스의 노부부가 식량을 도둑맞은 뒤 쓰러졌다고 한다.',
    options: [{ label: '…', fn: () => { moraleAll(-6); return '누구도 고개를 들지 못했다. (사기 -6)'; } }],
  }),
};

function protect() { S.protectedUntil = S.day + 2; S.raidTonight = false; if (S.buildings.radio) S.radioForecast = 'low'; }
function joinSurvivor(id, over) {
  if (!S.joined.includes(id)) S.joined.push(id);
  const s = makeSurvivor(id, { ...over, joinedDay: S.day });
  s.thought = '여기라면 버틸 수 있을지도 몰라.';
  S.survivors.push(s);
}

function rollEvent() {
  const due = S.delayed.filter((d) => d.day <= S.day);
  if (due.length) {
    S.delayed = S.delayed.filter((d) => d.day > S.day);
    due.forEach((d) => pushModal({ type: 'event', ev: DELAYED[d.id]() }));
    return;
  }
  if (!chance(0.6)) return;
  const pool = Object.entries(EVENTS).filter(([, e]) => e.cond());
  if (!pool.length) return;
  const total = pool.reduce((s, [, e]) => s + e.weight, 0);
  let r = Math.random() * total;
  for (const [, e] of pool) {
    r -= e.weight;
    if (r <= 0) { pushModal({ type: 'event', ev: e.make() }); return; }
  }
}
G.eventChoose = (i) => {
  const m = S.modals[0];
  const opt = m.ev.options[i];
  if (opt.cond && !opt.cond()) return;
  const res = opt.fn();
  S.modals.shift();
  if (res) { log(res, 'story'); pushModal({ type: 'eventResult', title: m.ev.title, text: res }); S.modals.unshift(S.modals.pop()); }
  render();
};

/* =========================================================
 * 시작
 * ========================================================= */
G.newGame = newGame;
G.load = loadGame;
G.save = () => saveGame(false);
G.help = () => { if (!S) { S = { modals: [], phase: 'title' }; } pushModal({ type: 'help' }); render(); };
G.toTitle = () => { if (S && S.phase === 'day' && !confirm('타이틀로 돌아갑니까? (자동 저장된 아침 기록은 남아 있습니다)')) return; S = null; render(); };

window.addEventListener('DOMContentLoaded', () => render());
