import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/game.js';
import { defaultState, sanitize } from '../src/core/state.js';
import { CAUSE_BY_ID, SPECIMENS } from '../src/data/content.js';
import {
  SHELF_START,
  SHELF_MAX,
  SLOT_COSTS,
  ROOM_BONUS,
  ROOM_CAPS,
  ALBUM_GOALS,
  PHOTOBOMB_CHANCE,
  STAGE_IDS,
  shinyReward,
  sanitizeSlot,
  roomBonuses,
  initialSlot,
} from '../src/features/collection/index.js';

const always = (v) => () => v;
const newGame = (rng = always(0.999), patch = (s) => s) => new Game(patch(defaultState()), { rng, now: () => 1 });
/** 모든 표본을 해금하고 한 번씩 모은 상태. */
const collectedAll = (s) => {
  for (const sp of SPECIMENS) {
    s.unlocked.specimens[sp.id] = true;
    s.stats.bySpecimen[sp.id] = 1;
  }
  return s;
};

test('새 게임에는 빈 수집 슬롯이 있다', () => {
  const g = newGame();
  const slot = g.state.ext.collection;
  assert.deepEqual(slot.dex, {});
  assert.equal(slot.slots, SHELF_START);
  assert.deepEqual(slot.shelf, Array(SHELF_START).fill(null));
  assert.equal(g.fx.collection.shinyTotal(), 0);
});

test('반짝이를 모으면 도감에 남고, 종류마다 처음 한 번만 보상을 준다', () => {
  const g = newGame();
  g.state.gen = 4;
  const found = [];
  g.on('shinyFound', (e) => found.push(e));
  const before = g.state.grant;
  // 게임의 'collected' 이벤트를 거쳐 기록된다
  g.emit('collected', { id: 'dandelion', gain: 2, auto: false, shiny: true });
  g.emit('collected', { id: 'dandelion', gain: 2, auto: false, shiny: false });
  g.emit('collected', { id: 'dandelion', gain: 2, auto: false });
  assert.equal(g.fx.collection.shinyCount('dandelion'), 1, '반짝이가 아닌 수집은 세지 않는다');
  assert.equal(found.length, 1);
  assert.equal(found[0].first, true);
  assert.equal(found[0].reward, shinyReward('dandelion'));
  assert.equal(g.state.grant, before + shinyReward('dandelion'));
  assert.equal(g.state.ext.collection.dex.dandelion.gen, 4, '처음 찾은 세대');

  g.state.gen = 9;
  const r2 = g.fx.collection.recordShiny('dandelion');
  assert.equal(r2.first, false);
  assert.equal(r2.reward, 0);
  assert.equal(r2.count, 2);
  assert.equal(g.state.grant, before + shinyReward('dandelion'), '두 번째부터는 보상 없음');
  assert.equal(g.state.ext.collection.dex.dandelion.gen, 4, '처음 찾은 세대는 바뀌지 않는다');
  assert.equal(g.fx.collection.recordShiny('없는표본'), null);
  assert.ok(shinyReward('meteor') > shinyReward('dandelion'), '비싼 표본일수록 보상이 크다');
});

test('게임이 반짝이 수집을 알려 주면(collect 의 shiny) 도감이 채워진다', () => {
  const g = newGame(always(0.999), collectedAll);
  const res = g.collect('firefly', { shiny: true, bonus: 4 });
  assert.ok(res.ok);
  // 게임이 shiny 를 이벤트에 실어 보내는 판에서만 기록된다(그 전 판에서는 0)
  const n = g.fx.collection.shinyCount('firefly');
  assert.ok(n === 0 || n === 1);
});

test('진열 규칙: 모은 표본만, 종류마다 한 자리, 반짝이는 도감에 있어야 한다', () => {
  const g = newGame();
  const fx = g.fx.collection;
  g.state.stats.bySpecimen.dandelion = 3;
  g.state.stats.bySpecimen.firefly = 1;
  assert.equal(fx.display(0, 'cow'), false, '모으지 않은 표본');
  assert.equal(fx.display(0, 'dandelion', true), false, '도감에 없는 반짝이');
  assert.equal(fx.display(0, 'dandelion'), true);
  assert.equal(fx.display(1, 'dandelion'), false, '같은 종류는 한 자리에만');
  assert.equal(fx.display(0, 'dandelion'), true, '같은 자리에서는 다시 올려도 된다');
  assert.equal(fx.display(SHELF_START, 'firefly'), false, '없는 자리');
  assert.equal(fx.display(-1, 'firefly'), false);
  assert.equal(fx.display(1.5, 'firefly'), false);
  assert.equal(fx.display(1, 'firefly'), true);
  fx.recordShiny('dandelion');
  assert.equal(fx.display(0, 'dandelion', true), true, '반짝이로 바꿔 올리기');
  assert.deepEqual(fx.shelf()[0], { id: 'dandelion', shiny: true });
  assert.equal(fx.clearSlot(1), true);
  assert.equal(fx.clearSlot(1), false, '빈 자리는 내릴 것이 없다');
  assert.equal(fx.shelf()[1], null);
});

test('진열 자리는 연구비로 늘리고, 값은 오르며, 최대가 있다', () => {
  const g = newGame();
  const fx = g.fx.collection;
  assert.equal(fx.nextSlotCost(), SLOT_COSTS[0]);
  g.state.grant = SLOT_COSTS[0] - 1;
  assert.equal(fx.buySlot(), false, '연구비가 모자라면 못 산다');
  assert.equal(fx.slots(), SHELF_START);
  g.state.grant = 1e9;
  let prev = 0;
  for (let n = SHELF_START; n < SHELF_MAX; n++) {
    const cost = fx.nextSlotCost();
    assert.ok(cost > prev, '자리 값은 점점 오른다');
    prev = cost;
    const grant = g.state.grant;
    assert.equal(fx.buySlot(), true);
    assert.equal(g.state.grant, grant - cost);
    assert.equal(fx.slots(), n + 1);
    assert.equal(fx.shelf().length, n + 1);
  }
  assert.equal(fx.nextSlotCost(), null);
  assert.equal(fx.buySlot(), false);
  assert.equal(fx.slots(), SHELF_MAX);
});

test('진열 효과가 능력치 보정에 반영되고, 반짝이는 두 배다', () => {
  const g = newGame(always(0.999), collectedAll);
  const fx = g.fx.collection;
  const base = {
    gain: g.specimenGain('dandelion'),
    notice: g.noticeTime,
    detect: g.chance('cow_moo'),
    fuel: g.fuelPerSpecimen,
    combo: g.mod('comboWindow', 2.6),
    excuse: g.mod('excuseChance', 0.35),
    shiny: g.mod('shinyChance', 0.02),
  };
  fx.display(0, 'dandelion');
  fx.display(1, 'firefly');
  fx.display(2, 'satellite');
  assert.ok(Math.abs(g.specimenGain('dandelion') - base.gain * 1.03) < 1e-9);
  assert.ok(Math.abs(g.noticeTime - (base.notice + 0.05)) < 1e-9);
  assert.ok(Math.abs(g.chance('cow_moo') - base.detect * 0.98) < 1e-12);
  fx.recordShiny('dandelion');
  fx.display(0, 'dandelion', true);
  assert.ok(Math.abs(g.specimenGain('dandelion') - base.gain * 1.06) < 1e-9, '반짝이는 두 배');
  // 다른 키는 건드리지 않는다
  assert.equal(g.fuelPerSpecimen, base.fuel);
  assert.equal(g.mod('comboWindow', 2.6), base.combo);
  assert.equal(g.mod('excuseChance', 0.35), base.excuse);
  assert.equal(g.mod('shinyChance', 0.02), base.shiny);
  // 내리면 원래대로
  fx.clearSlot(0);
  fx.clearSlot(1);
  fx.clearSlot(2);
  assert.ok(Math.abs(g.specimenGain('dandelion') - base.gain) < 1e-9);
  assert.ok(Math.abs(g.noticeTime - base.notice) < 1e-9);
});

test('서식지 세트: 같은 서식지 세 종류를 올리면 덤 효과', () => {
  const g = newGame(always(0.999), collectedAll);
  const fx = g.fx.collection;
  const grant0 = g.grantFor(1000, 'report');
  fx.display(0, 'drone');
  fx.display(1, 'satellite');
  assert.equal(fx.bonuses().sets.find((s) => s.id === 'space').done, false);
  assert.equal(g.grantFor(1000, 'report'), grant0);
  fx.display(2, 'meteor');
  const space = fx.bonuses().sets.find((s) => s.id === 'space');
  assert.equal(space.done, true);
  assert.equal(space.have, 3);
  assert.equal(g.grantFor(1000, 'report'), Math.round(grant0 * 1.05));
});

test('관측실 보정에는 상한이 있다(깨진 저장본으로 같은 종류를 여러 번 올려도)', () => {
  const slot = initialSlot();
  slot.slots = SHELF_MAX;
  slot.dex = Object.fromEntries(SPECIMENS.map((s) => [s.id, { n: 1, gen: 1 }]));
  // 검증을 거치지 않은 슬롯: 같은 종류가 여러 자리에
  slot.shelf = Array(SHELF_MAX).fill(null).map(() => ({ id: 'meteor', shiny: true }));
  const res = roomBonuses(slot, () => true);
  assert.equal(res.items.filter((i) => i.active).length, 1, '같은 종류는 한 번만 센다');
  assert.ok(Math.abs(res.totals.shinyChance.v - ROOM_BONUS.meteor.v * 2) < 1e-12);
  // 모든 종류를 반짝이로 올려도 상한 안이다
  slot.shelf = SPECIMENS.slice(0, SHELF_MAX).map((s) => ({ id: s.id, shiny: true }));
  const all = roomBonuses(slot, () => true);
  for (const [key, { v }] of Object.entries(all.totals)) {
    assert.ok(Math.abs(v) <= ROOM_CAPS[key] + 1e-12, `${key} 상한`);
    // 비율은 10% 이하, 초 단위(눈치·콤보 시간)는 0.2초 이하
    assert.ok(Math.abs(v) <= (key === 'noticeTime' || key === 'comboWindow' ? 0.2 : 0.1) + 1e-12, `${key} 는 작은 보정`);
  }
  // 모으지 않은 종류는 효과가 없다
  const none = roomBonuses(slot, () => false);
  assert.deepEqual(none.totals, {});
  // 실제 게임에서도 발각 확률은 0..1 안에 있다
  const g = newGame(always(0.999), collectedAll);
  g.state.ext.collection = slot;
  for (const id of Object.keys(CAUSE_BY_ID)) {
    const p = g.chance(id);
    assert.ok(p >= 0 && p <= 1, id);
  }
});

test('저장본 검증: 깨진 값과 모르는 값을 걸러 낸다', () => {
  const garbage = [
    null,
    undefined,
    42,
    'x',
    [],
    { dex: 'nope', slots: 'many', shelf: 'shelf', album: 7 },
    {
      dex: { dandelion: { n: 3, gen: 2 }, cow: { n: -1, gen: 1 }, constructor: { n: 9 }, 없는표본: { n: 5 }, meteor: { n: 2.7, gen: 'x' }, kite: 'z' },
      slots: 99,
      shelf: [
        { id: 'dandelion', shiny: true },
        { id: 'dandelion', shiny: false },
        { id: 'cow', shiny: true },
        { id: '__proto__' },
        'kite',
        null,
        { id: 'meteor', shiny: 'yes' },
        { id: 'firefly', shiny: false },
        { id: 'balloon' },
        { id: 'kite' },
      ],
      album: { shots: -5, stages: ['farm', 'farm', 'mars', 3, 'orbit'], got: ['firstPhoto', 'cheat', 'firstPhoto'] },
    },
  ];
  for (const raw of garbage) {
    const s = sanitizeSlot(raw);
    assert.ok(s.slots >= SHELF_START && s.slots <= SHELF_MAX);
    assert.equal(s.shelf.length, s.slots);
    const ids = s.shelf.filter(Boolean).map((e) => e.id);
    assert.equal(new Set(ids).size, ids.length, '같은 종류는 한 번만');
    for (const e of s.shelf) if (e) assert.equal(typeof e.shiny, 'boolean');
    assert.ok(Number.isInteger(s.album.shots) && s.album.shots >= 0);
    assert.doesNotThrow(() => JSON.stringify(s));
  }
  const s = sanitizeSlot(garbage[6]);
  assert.deepEqual(Object.keys(s.dex).sort(), ['dandelion', 'meteor']);
  assert.deepEqual(s.dex.meteor, { n: 2, gen: 1 });
  assert.equal(s.slots, SHELF_MAX);
  assert.deepEqual(s.shelf[0], { id: 'dandelion', shiny: true });
  assert.equal(s.shelf[1], null, '중복');
  assert.deepEqual(s.shelf[2], { id: 'cow', shiny: false }, '도감에 없는 반짝이는 보통으로');
  assert.equal(s.shelf[3], null);
  assert.equal(s.shelf[4], null);
  assert.deepEqual(s.shelf[6], { id: 'meteor', shiny: false });
  assert.deepEqual(s.album.stages, ['farm', 'orbit']);
  assert.deepEqual(s.album.got, ['firstPhoto']);

  // 게임 저장본 전체를 거쳐도 슬롯이 살아남는다
  const st = defaultState();
  st.ext.collection = garbage[6];
  const loaded = sanitize(JSON.parse(JSON.stringify(st)));
  assert.equal(loaded.ext.collection.slots, SHELF_MAX);
  assert.equal(loaded.ext.collection.dex.dandelion.n, 3);
  const g = new Game(loaded, { rng: always(0.999), now: () => 1 });
  assert.doesNotThrow(() => g.fx.collection.bonuses());
});

test('저장본을 바꾸면(replaced) 새 슬롯을 읽는다', () => {
  const g = newGame(always(0.999), collectedAll);
  g.fx.collection.display(0, 'firefly');
  const n1 = g.noticeTime;
  const fresh = collectedAll(defaultState());
  g.replaceState(fresh);
  assert.equal(g.fx.collection.shelf()[0], null);
  assert.ok(g.noticeTime < n1, '새 저장본에는 진열 효과가 없다');
  // 슬롯이 아예 사라진 상태에서도 무너지지 않는다
  delete g.state.ext.collection;
  assert.doesNotThrow(() => g.noticeTime);
  assert.equal(g.fx.collection.slots(), SHELF_START);
});

test('앨범: 사진 수·관측지를 세고 업적은 한 번만 준다', () => {
  const g = newGame();
  const fx = g.fx.collection;
  const goals = [];
  g.on('albumGoal', (e) => goals.push(e.id));
  const grant0 = g.state.grant;
  const r1 = fx.recordPhoto('farm');
  assert.equal(r1.newStage, true);
  assert.deepEqual(goals, ['firstPhoto']);
  assert.equal(g.state.grant, grant0 + ALBUM_GOALS[0].reward);
  assert.equal(fx.recordPhoto('farm').newStage, false);
  fx.recordPhoto('없는무대');
  assert.deepEqual(fx.album().stages, ['farm']);
  for (const st of ['suburb', 'camp', 'city']) fx.recordPhoto(st);
  assert.deepEqual(goals, ['firstPhoto', 'tourist']);
  for (const st of STAGE_IDS) fx.recordPhoto(st);
  assert.deepEqual(goals, ['firstPhoto', 'tourist', 'globetrotter']);
  for (const st of STAGE_IDS) fx.recordPhoto(st);
  assert.equal(goals.length, 3, '업적은 한 번씩만');
  assert.equal(fx.album().shots, 1 + 1 + 1 + 3 + STAGE_IDS.length * 2);
});

test('사진 찍힘(photobomb): 누가 보고 있을 때만, 은폐 중에는 없다', () => {
  const g = newGame(always(0));
  const fx = g.fx.collection;
  assert.equal(fx.photoRisk({ watching: 0, cloaked: false }), 0);
  assert.equal(fx.photoRisk({ watching: 2, cloaked: true }), 0);
  assert.equal(fx.rollPhotobomb({ watching: 0, cloaked: false }), false);
  if (!CAUSE_BY_ID.photobomb) return; // 사건이 아직 없는 판
  const p = fx.photoRisk({ watching: 1, cloaked: false });
  assert.ok(p > 0 && p <= PHOTOBOMB_CHANCE + 1e-12);
  assert.equal(fx.rollPhotobomb({ watching: 1, cloaked: false }), true);
  const report = g.incident('photobomb', { photo: true });
  assert.ok(report && report.cause === 'photobomb');
  assert.ok(fx.photoRisk({ watching: 1, cloaked: false }) < p, '한 번 찍히면 다음에는 덜 찍힌다');
});
