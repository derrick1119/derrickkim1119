import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/game.js';
import { defaultState, sanitize, encodeSave, decodeSave } from '../src/core/state.js';
import { seededRng } from '../src/core/rng.js';
import { BAL } from '../src/core/balance.js';
import { CAUSES, CAUSE_BY_ID, MISSIONS, SPECIMEN_BY_ID } from '../src/data/content.js';
import { TRAITS, TRAIT_BY_ID, TWO_TRAITS_GEN, rollTraits } from '../src/features/progression/traits.js';
import {
  CARDS,
  cardDef,
  makeOffer,
  detectReduction,
  missionReduction,
  LESSON_DETECT_CAP,
  LESSON_MISSION_CAP,
  DRILL_MAX,
  CASH_ID,
} from '../src/features/progression/lessons.js';
import { MEMORIAL_SIZE } from '../src/features/progression/memorial.js';
import { EXCUSES, excuseOptions, excuseFit } from '../src/features/progression/excuses.js';

const always = (v) => () => v;
const newGame = (rng = always(0.999), patch = (s) => s) => new Game(patch(defaultState()), { rng, now: () => 1 });
/** 성격을 고정한다(보정 시험용). */
const withTraits = (g, list) => {
  g.state.ext.traits.list = list;
  return g;
};
const spot = (g) => {
  const r = g.rng;
  g.rng = always(0);
  const out = g.collect('dandelion', { watchers: ['farmer'] });
  g.rng = r;
  return out.report;
};

// ───────── 성격 ─────────

test('성격: 첫 대원부터 하나, 8대부터 둘, 서로 다르고 모두 아는 성격', () => {
  const g = newGame(seededRng(42));
  assert.equal(g.state.ext.traits.gen, 1);
  assert.equal(g.fx.traits.current().length, 1);
  assert.ok(TRAIT_BY_ID[g.fx.traits.current()[0]]);
  let prev = g.fx.traits.current();
  for (let i = 0; i < 40; i++) {
    g.state.phase = 'discovered';
    g.nextGeneration();
    const list = g.fx.traits.current();
    assert.equal(g.state.ext.traits.gen, g.state.gen);
    assert.equal(list.length, g.state.gen >= TWO_TRAITS_GEN ? 2 : 1, `${g.state.gen}대`);
    assert.equal(new Set(list).size, list.length, '같은 성격 두 번 없음');
    for (const id of list) assert.ok(TRAIT_BY_ID[id]);
    assert.notDeepEqual([...list].sort(), [...prev].sort(), '바로 앞 대원과 같은 조합은 피한다');
    prev = list;
  }
  assert.equal(TRAITS.length, 12);
  for (let k = 0; k < 200; k++) {
    const r = rollTraits(seededRng(k), 9, []);
    assert.equal(r.length, 2);
    assert.notEqual(r[0], r[1]);
  }
});

test('성격: 고정 난수(0 · 0.5 · 0.999)로 만든 첫 대원은 표본 성장·연료를 건드리지 않는다(core 시험 보호)', () => {
  for (const v of [0, 0.5, 0.999]) {
    const g = newGame(always(v));
    assert.equal(g.specimenGain('dandelion'), SPECIMEN_BY_ID.dandelion.gain, `rng ${v}`);
    assert.ok(Math.abs(g.fuelPerSpecimen - 100 / BAL.baseSpecimensPerMission) < 1e-9, `rng ${v}`);
  }
});

test('성격: 장점과 단점이 능력치에 걸린다', () => {
  const base = withTraits(newGame(), []);
  const scaredy = withTraits(newGame(), ['scaredy']);
  assert.ok(Math.abs(scaredy.noticeTime - (base.noticeTime + 0.4)) < 1e-9);
  assert.ok(Math.abs(scaredy.specimenGain('dandelion') - base.specimenGain('dandelion') * 0.9) < 1e-9);
  const keen = withTraits(newGame(), ['keen']);
  assert.ok(Math.abs(keen.chance('gaze_farmer') - base.chance('gaze_farmer') * 0.85) < 1e-9);
  assert.ok(Math.abs(keen.missionRisk('crop') - base.missionRisk('crop') * 0.85) < 1e-9, '임무 화면 확률에도 걸린다');
  assert.equal(keen.chance('crop_art'), base.chance('crop_art'), '임무 사건은 detect 로 두 번 줄이지 않는다');
  const sleepy = withTraits(newGame(), ['sleepy']);
  assert.ok(sleepy.cloakDuration > base.cloakDuration && sleepy.cloakCooldown > base.cloakCooldown);
  const glutton = withTraits(newGame(), ['glutton']);
  assert.ok(glutton.fuelPerSpecimen > base.fuelPerSpecimen);
  assert.ok(glutton.chance('balloon_kid') > base.chance('balloon_kid'));
  assert.equal(glutton.chance('gaze_farmer'), base.chance('gaze_farmer'));
  const smooth = withTraits(newGame(always(0)), ['smooth']);
  spot(smooth);
  const plain = withTraits(newGame(always(0)), ['sleepy']);
  spot(plain);
  assert.ok(smooth.excuseChance('birds') > plain.excuseChance('birds'));
});

// ───────── 교훈 카드 ─────────

test('교훈: 들키면 카드 세 장, 첫 장은 사건에 맞춘 카드, 고르면 영구히 쌓인다', () => {
  const g = newGame(seededRng(7));
  spot(g);
  const offer = g.fx.lessons.pending();
  assert.ok(offer);
  assert.equal(offer.ids.length, 3);
  assert.equal(new Set(offer.ids).size, 3);
  assert.equal(offer.themed, 0);
  assert.equal(cardDef(offer.ids[0]).theme, 'gaze', '시선 사건이면 시선 카드');
  assert.equal(g.fx.lessons.pick('없는카드').ok, false);
  const id = offer.ids[1];
  const r = g.fx.lessons.pick(id);
  assert.ok(r.ok);
  assert.equal(g.fx.lessons.level(id), 1);
  assert.equal(g.fx.lessons.pending(), null);
  assert.equal(g.fx.lessons.pick(id).ok, false, '두 번 고를 수 없다');
  const back = decodeSave(encodeSave(g.state));
  assert.equal(back.ext.lessons.stacks[id], 1, '저장된다');
});

test('교훈: 다 모은 카드는 다시 나오지 않고, 전부 모으면 비상금 카드', () => {
  const stacks = {};
  for (const c of CARDS) stacks[c.id] = c.max;
  stacks['drill:cow_moo'] = DRILL_MAX;
  const o = makeOffer(seededRng(1), stacks, 'cow_moo');
  assert.deepEqual(o.ids, [CASH_ID]);
  const partial = { ...stacks };
  delete partial.radar;
  for (let s = 0; s < 30; s++) {
    const p = makeOffer(seededRng(s), partial, 'gaze_kid');
    assert.ok(p.ids.includes('radar'));
    assert.ok(p.ids.every((id) => id === 'radar' || id === 'drill:gaze_kid' || id === CASH_ID), p.ids.join());
  }
  const g = newGame(always(0));
  for (const c of CARDS) g.state.ext.lessons.stacks[c.id] = c.max;
  for (const c of CAUSES) g.state.ext.lessons.stacks[`drill:${c.id}`] = DRILL_MAX;
  const before = g.state.grant;
  spot(g);
  const afterReport = g.state.grant;
  assert.ok(afterReport > before);
  const r = g.fx.lessons.pick(CASH_ID);
  assert.ok(r.ok && r.cash > 0);
  assert.equal(g.state.grant, afterReport + r.cash);
});

test('교훈: 발각 감소는 사건마다 25%, 임무 위험은 12% 를 넘지 않는다', () => {
  const g = newGame(always(0.999));
  const plain = newGame(always(0.999));
  const st = g.state.ext.lessons.stacks;
  for (const c of CARDS) st[c.id] = c.max;
  for (const c of CAUSES) st[`drill:${c.id}`] = DRILL_MAX;
  for (const c of CAUSES) {
    const red = detectReduction(st, c.id);
    assert.ok(red <= LESSON_DETECT_CAP + 1e-12, c.id);
    if (c.kind !== 'mission') {
      assert.ok(Math.abs(red - LESSON_DETECT_CAP) < 1e-12, `${c.id}: 다 모으면 상한까지`);
      assert.ok(g.chance(c.id) >= plain.chance(c.id) * (1 - LESSON_DETECT_CAP) - 1e-12, c.id);
    } else {
      assert.equal(red, 0, '임무 사건은 missionRisk 로만');
    }
  }
  for (const m of MISSIONS) {
    assert.ok(missionReduction(st, m.id) <= LESSON_MISSION_CAP + 1e-12);
    assert.ok(g.missionRisk(m.id) >= plain.missionRisk(m.id) * (1 - LESSON_MISSION_CAP) - 1e-12, m.id);
  }
  assert.equal(detectReduction(st, '없는사건'), 0);
  assert.equal(missionReduction(st, '없는임무'), 0);
});

test('교훈: 변명이 통하면 교훈 카드도 없다', () => {
  const g = newGame(always(0));
  spot(g);
  assert.ok(g.fx.lessons.pending());
  assert.ok(g.excuse('birds').success);
  assert.equal(g.fx.lessons.pending(), null);
  assert.equal(g.fx.memorial.pending(), null);
});

// ───────── 목표 ─────────

test('목표: 대원마다 세 가지(종류가 겹치지 않게), 다음 대원은 새 목표', () => {
  const g = newGame(seededRng(3));
  for (let i = 0; i < 30; i++) {
    const list = g.fx.goals.list();
    assert.equal(list.length, 3);
    assert.equal(new Set(list.map((x) => x.type)).size, 3);
    assert.ok(!(list.some((x) => x.type === 'collect') && list.some((x) => x.type === 'total')), '표본 목표는 하나만');
    for (const x of list) {
      assert.ok(x.target >= 1 && x.reward > 0 && x.n === 0 && !x.done);
      if (x.type === 'collect') assert.ok(g.isSpecimenUnlocked(x.param));
      if (x.type === 'formUp') assert.equal(Number(x.param), g.formIndex + 1);
      if (x.type === 'shiny') assert.ok(g.state.stats.shinies > 0);
      if (x.type === 'cloak') assert.ok(g.state.gen >= 2 || g.state.stats.cloaks > 0);
    }
    g.state.phase = 'discovered';
    g.nextGeneration();
    assert.equal(g.state.ext.goals.gen, g.state.gen);
  }
});

test('목표: 이벤트로 진행이 쌓이고, 채우면 연구비를 한 번 준다', () => {
  const g = newGame(always(0.5));
  const slot = g.state.ext.goals;
  slot.list = [
    { type: 'collect', param: 'dandelion', target: 3, n: 0, done: false, reward: 10 },
    { type: 'combo', param: null, target: 5, n: 0, done: false, reward: 20 },
    { type: 'cloak', param: null, target: 1, n: 0, done: false, reward: 7 },
  ];
  const events = [];
  g.on('progression:goal', (e) => events.push(e));
  const grant0 = g.state.grant;
  g.collect('dandelion');
  g.collect('dandelion', { auto: true });
  assert.equal(slot.list[0].n, 1, '드론이 모은 것은 세지 않는다');
  g.collect('dandelion');
  g.collect('dandelion');
  assert.ok(slot.list[0].done);
  assert.equal(events.length, 1);
  assert.equal(g.state.grant, grant0 + g.grantFor(10, 'goal'));
  g.collect('dandelion');
  assert.equal(slot.list[0].n, 3, '채운 목표는 더 오르지 않는다');
  assert.equal(slot.list[1].n, 4, '콤보는 최고 콤보');
  g.nearMiss(1);
  assert.ok(slot.list[1].done, '아슬아슬도 콤보를 올린다');
  assert.ok(g.activateCloak().ok);
  assert.ok(slot.list[2].done);
  assert.equal(events.length, 3);
  assert.equal(events[2].all, true);
  assert.equal(g.fx.goals.totals().perfect, 1);
  // 저장했다 불러도 그대로
  const back = decodeSave(encodeSave(g.state));
  assert.deepEqual(back.ext.goals.list, slot.list);
});

test('목표: 임무 대성공(점수 80%)과 승급', () => {
  const g = newGame(always(0.999));
  const slot = g.state.ext.goals;
  slot.list = [
    { type: 'mission', param: null, target: 1, n: 0, done: false, reward: 5 },
    { type: 'formUp', param: '1', target: 1, n: 0, done: false, reward: 5 },
  ];
  g.run.fuel = 100;
  assert.ok(g.resolveMission('crop', { score: 0.5 }).success);
  assert.equal(slot.list[0].done, false, '보통 점수는 아니다');
  g.run.fuel = 100;
  assert.ok(g.resolveMission('crop', { score: 0.85 }).success);
  assert.equal(slot.list[0].done, true);
  g.run.size = 99;
  g.collect('dandelion');
  assert.equal(g.formIndex, 1);
  assert.equal(slot.list[1].done, true);
});

// ───────── 명예의 전당 ─────────

test('명예의 전당: 귀환한 대원을 기록하고 30명만 남기며, 역대 기록을 지킨다', () => {
  const g = newGame(seededRng(11));
  const first = g.fx.traits.current();
  g.run.time = 123.4;
  const report = spot(g);
  const pend = g.fx.memorial.pending();
  assert.equal(pend.gen, 1);
  assert.deepEqual(pend.traits, first);
  assert.equal(pend.cause, report.cause);
  assert.equal(pend.time, 123);
  g.nextGeneration();
  assert.equal(g.fx.memorial.list().length, 1);
  assert.equal(g.fx.memorial.pending(), null);
  assert.equal(g.fx.memorial.records().time.gen, 1);
  for (let i = 0; i < 40; i++) {
    g.run.size = 30 + i;
    g.run.time = 10;
    g.state.phase = 'play';
    spot(g);
    g.nextGeneration();
  }
  const list = g.fx.memorial.list();
  assert.equal(list.length, MEMORIAL_SIZE);
  assert.equal(list[list.length - 1].gen, 41);
  assert.equal(g.fx.memorial.total(), 41);
  assert.equal(g.fx.memorial.records().time.gen, 1, '오래 버틴 기록은 벽에서 내려가도 남는다');
  assert.equal(g.fx.memorial.records().size.gen, 41);
  assert.deepEqual(g.fx.memorial.holds(list[list.length - 1]), ['size']);
});

// ───────── 변명 ─────────

test('변명: 보기 셋, 사건에 딱 맞는 변명이 들어가고 그럴듯할수록 잘 통한다. 같은 변명은 점점 안 통한다', () => {
  for (const c of CAUSES) {
    for (let s = 0; s < 5; s++) {
      const opts = excuseOptions(seededRng(s), c.id);
      assert.equal(opts.length, 3, c.id);
      assert.equal(new Set(opts).size, 3);
    }
  }
  assert.ok(excuseOptions(seededRng(1), 'balloon_kid').includes('balloon'));
  assert.ok(excuseFit('gaze_farmer', 'birds') > excuseFit('gaze_farmer', 'art'), '시선 사건에 새 떼 > 미술 작품');
  const g = newGame(always(0));
  assert.deepEqual(g.fx.excuses.options(), [], '들키기 전에는 변명할 게 없다');
  spot(g);
  const opts = g.fx.excuses.options();
  assert.equal(opts.length, 3);
  for (const o of opts) assert.ok(o.chance >= 0.05 && o.chance <= 0.95);
  const birds = g.excuseChance('birds');
  const art = g.excuseChance('art');
  assert.ok(birds > art);
  g.rng = always(0.999);
  assert.equal(g.excuse('birds').success, false);
  assert.deepEqual(g.fx.excuses.options(), [], '대원마다 한 번');
  g.nextGeneration();
  g.rng = always(0);
  spot(g);
  assert.ok(g.excuseChance('birds') < birds, '써먹은 변명은 덜 통한다');
  assert.equal(g.fx.excuses.stats().tries, 1);
  assert.ok(EXCUSES.length >= 12);
});

// ───────── 저장본 검증 ─────────

test('저장본 검증: 깨진 ext 슬롯을 걸러 낸다', () => {
  const s = sanitize({
    v: 1,
    gen: 5,
    ext: {
      traits: { gen: 'x', list: ['keen', 'keen', 'hacker', 7, 'nerd', 'lucky'], tally: { keen: -3, bogus: 2 }, announced: NaN },
      lessons: {
        stacks: { growth: 999, bogus: 3, constructor: 1, 'drill:nope': 2, 'drill:cow_moo': 9, radar: -1, cash: 4 },
        offer: { gen: 2, ids: ['growth', 'growth'], cash: 5 },
        picks: 'many',
      },
      goals: {
        gen: 5,
        list: [{ type: 'hack' }, { type: 'collect', param: 'cow', target: 1e9, n: -5, done: 'yes', reward: 3 }, { type: 'collect', param: 'unicorn' }, { type: 'formUp', param: '99' }, 'x'],
      },
      memorial: {
        list: [null, 'x', { gen: 0 }, { gen: 3, traits: ['bad', 'keen', 'keen'], size: 1e99, form: 99, cause: 'constructor', time: -4 }],
        rec: 5,
        pending: { gen: 2, cause: 'cow_moo' },
        total: -1,
      },
      excuses: { used: { balloon: 'a', birds: 2, hack: 3 }, offer: { cause: 'nope', ids: ['birds'] } },
      unknownFeature: { a: 1 },
    },
  });
  const e = s.ext;
  assert.equal(e.unknownFeature, undefined);
  assert.deepEqual(e.traits.list, ['keen', 'nerd']);
  assert.equal(e.traits.gen, 0);
  assert.deepEqual(e.traits.tally, { keen: 0 });
  assert.deepEqual(e.lessons.stacks, { growth: cardDef('growth').max, 'drill:cow_moo': DRILL_MAX });
  assert.equal(e.lessons.offer, null, '같은 카드가 두 번 든 묶음은 버린다');
  assert.equal(e.lessons.picks, 0);
  assert.equal(e.goals.list.length, 1);
  assert.equal(e.goals.list[0].target, 999);
  assert.equal(e.goals.list[0].n, 0);
  assert.equal(e.goals.list[0].done, false);
  assert.equal(e.memorial.list.length, 1);
  const m = e.memorial.list[0];
  assert.deepEqual(m.traits, ['keen']);
  assert.equal(m.cause, null);
  assert.equal(m.form, 7);
  assert.equal(m.time, 0);
  assert.ok(m.size <= 1500000);
  assert.deepEqual(e.memorial.rec, { size: null, time: null, specimens: null });
  assert.equal(e.memorial.pending.cause, 'cow_moo');
  assert.equal(e.memorial.total, 1);
  assert.deepEqual(e.excuses.used, { balloon: 0, birds: 2 });
  assert.equal(e.excuses.offer, null);
  // 아무 값이나 넣어도 게임이 만들어지고, 성격·목표가 지금 세대에 맞춰진다
  const g = new Game(s, { rng: seededRng(5), now: () => 1 });
  assert.equal(g.state.ext.traits.gen, 5);
  assert.equal(g.fx.traits.current().length, 1);
  assert.equal(g.fx.goals.list().length, 1, '이번 세대의 목표는 남은 것만이라도 이어 간다');
  for (const junk of [null, 'x', 7, [], { traits: [], lessons: 'x', goals: null, memorial: [], excuses: 0 }]) {
    const t2 = sanitize({ v: 1, ext: junk });
    assert.deepEqual(t2.ext, defaultState().ext);
  }
});

test('저장본 교체(replaced): 다른 세대의 저장본이면 성격·목표를 그 세대에 맞춘다', () => {
  const g = newGame(seededRng(9));
  const other = defaultState();
  other.gen = 12;
  g.replaceState(other);
  assert.equal(g.state.ext.traits.gen, 12);
  assert.equal(g.fx.traits.current().length, 2);
  assert.equal(g.state.ext.goals.gen, 12);
  assert.equal(g.fx.goals.list().length, 3);
  assert.ok(g.fx.traits.needsAnnounce());
  g.fx.traits.markAnnounced();
  assert.equal(g.fx.traits.needsAnnounce(), false);
});

test('모든 사건 id 가 사건 표에 있다(변명 짝·교훈 대비 카드)', () => {
  for (const c of CAUSES) {
    assert.ok(cardDef(`drill:${c.id}`), c.id);
    assert.ok(CAUSE_BY_ID[c.id]);
  }
  assert.equal(cardDef('drill:없는사건'), null);
});
