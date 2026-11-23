import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/game.js';
import { World } from '../src/core/world.js';
import { defaultState, sanitize, encodeSave, decodeSave } from '../src/core/state.js';
import { seededRng } from '../src/core/rng.js';
import {
  BAL,
  detectChance,
  startSizeFor,
  formIndexForSize,
  offlineGrowth,
  gadgetCost,
  missionRisk,
} from '../src/core/balance.js';
import { formatSize, formatPercent, formatGain } from '../src/core/format.js';
import {
  FORMS,
  GOAL_SIZE,
  CAUSES,
  CAUSE_BY_ID,
  SPECIMENS,
  SPECIMEN_BY_ID,
  MISSIONS,
  MISSION_BY_ID,
  GADGETS,
  TICKLE_POKES,
} from '../src/data/content.js';

/** 항상 같은 값을 내는 난수. 0 = 반드시 들킴, 0.999 = 절대 안 들킴. */
const always = (v) => () => v;
const newGame = (rng = always(0.999), patch = (s) => s) => new Game(patch(defaultState()), { rng, now: () => 1 });

test('발각 확률은 들킬수록 내려가되 하한 아래로는 가지 않는다', () => {
  const p0 = detectChance('cow_moo', 0);
  const p1 = detectChance('cow_moo', 1);
  assert.equal(p0, CAUSE_BY_ID.cow_moo.base);
  assert.ok(Math.abs(p1 - p0 * BAL.decay.specimen) < 1e-12);
  assert.equal(detectChance('cow_moo', 200), BAL.floor.specimen);
  assert.equal(detectChance('gaze_kid', 200), BAL.floor.gaze);
  assert.equal(detectChance('없는사건', 0), 0);
  for (const c of CAUSES) {
    let prev = 2;
    for (let n = 0; n < 30; n++) {
      const p = detectChance(c.id, n);
      assert.ok(p > 0 && p <= 1, `${c.id} 확률 범위`);
      assert.ok(p <= prev, `${c.id} 는 단조 감소`);
      prev = p;
    }
  }
});

test('형태 경계와 시작 지름', () => {
  assert.equal(formIndexForSize(30), 0);
  assert.equal(formIndexForSize(99.9), 0);
  assert.equal(formIndexForSize(100), 1);
  assert.equal(formIndexForSize(GOAL_SIZE), FORMS.length - 1);
  assert.equal(startSizeFor(0), BAL.startSize);
  assert.ok(startSizeFor(5) > startSizeFor(4));
  assert.ok(startSizeFor(CAUSES.length) < FORMS[6].min, '도감을 다 채워도 마지막 두 형태는 직접 키운다');
});

test('표본을 모으면 자라고 연료가 찬다', () => {
  const g = newGame();
  const gain = SPECIMEN_BY_ID.dandelion.gain;
  assert.equal(g.run.fuel, 0, '새 대원은 빈 연료로 시작한다');
  const r = g.collect('dandelion');
  assert.ok(r.ok);
  assert.equal(r.gain, gain);
  assert.equal(g.run.size, 30 + gain);
  assert.equal(g.run.specimens, 1);
  assert.equal(g.state.stats.specimens, 1);
  assert.ok(Math.abs(g.run.fuel - 100 / BAL.baseSpecimensPerMission) < 1e-9);
  for (let i = 0; i < BAL.baseSpecimensPerMission + 3; i++) g.collect('dandelion');
  assert.equal(g.run.fuel, 100, '연료는 100 을 넘지 않는다');
});

test('해금하지 않은 표본은 모을 수 없다', () => {
  const g = newGame();
  assert.equal(g.collect('cow').ok, false);
  assert.equal(g.collect('없는표본').ok, false);
  assert.equal(g.run.size, 30);
});

test('시선 중에 빔을 쏘면 들키고, 다음 대원은 덜 들킨다', () => {
  const g = newGame(always(0));
  const before = g.chance('gaze_farmer');
  const r = g.collect('dandelion', { watchers: ['farmer'] });
  assert.ok(r.report);
  assert.equal(r.gain, 0);
  assert.equal(r.report.cause, 'gaze_farmer');
  assert.equal(r.report.isNew, true);
  assert.equal(g.phase, 'discovered');
  assert.equal(g.state.seen.gaze_farmer, 1);
  assert.ok(g.chance('gaze_farmer') < before);
  assert.ok(g.state.grant > 0);
  assert.equal(g.collect('dandelion').ok, false, '들킨 뒤에는 조작이 막힌다');
  assert.ok(g.nextGeneration());
  assert.equal(g.state.gen, 2);
  assert.equal(g.phase, 'play');
  assert.ok(Math.abs(g.run.size - startSizeFor(1)) < 1e-9, '새 사건 하나만큼 시작 지름이 커진다');
  assert.equal(g.nextGeneration(), false);
});

test('같은 사건으로 다시 들키면 신규 보너스가 없다', () => {
  const g = newGame(always(0));
  const a = g.collect('dandelion', { watchers: ['farmer'] }).report;
  g.nextGeneration();
  g.run.size = 30;
  g.run.form = 0;
  const b = g.collect('dandelion', { watchers: ['farmer'] }).report;
  assert.equal(b.isNew, false);
  assert.ok(a.grant >= b.grant * 2.5, '신규 사건은 약 3배');
  assert.equal(g.state.resist.gaze_farmer, 2);
  assert.equal(g.uniqueCauses, 1);
});

test('구름 은폐 중에는 시선에도 위험한 표본에도 들키지 않는다', () => {
  const g = newGame(always(0.5), (s) => {
    s.unlocked.specimens.firefly = true;
    s.unlocked.specimens.balloon = true;
    return s;
  });
  assert.ok(g.activateCloak().ok);
  assert.ok(g.cloaked);
  g.rng = always(0);
  const r = g.collect('balloon', { watchers: ['kid'] });
  assert.equal(r.report, null);
  assert.ok(r.gain > 0);
  g.tick(g.cloakDuration + 0.01);
  assert.equal(g.cloaked, false);
  assert.equal(g.cloakReady, false, '은폐가 끝나면 재사용 대기');
  assert.equal(g.activateCloak().ok, false);
  g.tick(g.cloakCooldown + 0.01);
  assert.ok(g.cloakReady);
  const r2 = g.collect('balloon');
  assert.equal(r2.report.cause, 'balloon_kid');
});

test('수집 드론은 들키지 않고, 조금만 얻고, 연료를 채우지 않는다', () => {
  const g = newGame(always(0), (s) => {
    s.unlocked.specimens.firefly = true;
    s.unlocked.specimens.balloon = true;
    return s;
  });
  g.run.fuel = 0;
  const r = g.collect('balloon', { watchers: ['kid'], auto: true });
  assert.equal(r.report, null);
  assert.ok(Math.abs(r.gain - SPECIMEN_BY_ID.balloon.gain * BAL.droneYield) < 1e-9);
  assert.equal(g.run.fuel, 0);
  assert.equal(g.run.specimens, 0);
});

test('임무: 연료가 차야 출동하고, 성공하면 자라고, 실패하면 들킨다', () => {
  const g = newGame();
  g.run.fuel = 50;
  assert.equal(g.canMission('crop').reason, 'fuel');
  assert.equal(g.canMission('cvs').reason, 'locked');
  assert.equal(g.resolveMission('crop').ok, false);
  g.run.fuel = 100;
  const ok = g.resolveMission('crop');
  assert.ok(ok.success);
  assert.equal(ok.gain, MISSION_BY_ID.crop.gain);
  assert.equal(g.run.fuel, 0);
  assert.equal(g.state.stats.missionsOk, 1);
  assert.ok(ok.grant > 0);

  const g2 = newGame(always(0));
  g2.run.fuel = 100;
  const fail = g2.resolveMission('crop');
  assert.equal(fail.success, false);
  assert.equal(fail.report.cause, 'crop_art');
  assert.equal(g2.phase, 'discovered');
  assert.equal(g2.state.stats.missionsFail, 1);
});

test('임무 발각 확률은 사건이 여럿이면 평균이다', () => {
  const resist = { crop_art: 3 };
  const expected = (detectChance('crop_art', 3) + detectChance('crop_typo', 0)) / 2;
  assert.ok(Math.abs(missionRisk('crop', resist) - expected) < 1e-12);
});

test('형태가 바뀌면 연구비를 받고, 승급 셀카로 들킬 수 있다', () => {
  const g = newGame();
  g.run.size = 99.5;
  let ups = 0;
  g.on('formUp', () => ups++);
  const r = g.collect('dandelion');
  assert.equal(r.formUps.length, 1);
  assert.equal(g.formIndex, 1);
  assert.equal(ups, 1);
  assert.ok(g.state.grant > 0);
  assert.equal(r.report, null);

  const g2 = newGame(always(0));
  g2.run.size = 99.5;
  const r2 = g2.collect('dandelion');
  assert.equal(r2.formUps.length, 1);
  assert.ok(r2.gain > 0);
  assert.equal(r2.report.cause, 'selfie');
});

test('목표 지름에 닿으면 관측 완료, 이어서 다음 세대', () => {
  const g = newGame(always(0.999), (s) => {
    for (const m of MISSIONS) s.unlocked.missions[m.id] = true;
    return s;
  });
  g.run.size = GOAL_SIZE - 10;
  g.run.form = 7;
  g.run.fuel = 100;
  let ending = null;
  g.on('ending', (e) => (ending = e));
  const r = g.resolveMission('moon');
  assert.ok(r.ending);
  assert.equal(ending.first, true);
  assert.equal(ending.isTrue, false);
  assert.equal(g.phase, 'ending');
  assert.equal(g.run.size, GOAL_SIZE);
  assert.equal(g.state.clears, 1);
  assert.ok(g.state.ach.clear_1);
  assert.ok(g.finishEnding());
  assert.equal(g.phase, 'play');
  assert.equal(g.state.gen, 2);
  assert.ok(g.gainMult > 1, '완료 보너스가 붙는다');
});

test('도감을 다 채우고 완료하면 진엔딩', () => {
  const g = newGame(always(0.999), (s) => {
    for (const c of CAUSES) {
      s.seen[c.id] = 1;
      s.resist[c.id] = 1;
    }
    return s;
  });
  g.run.size = GOAL_SIZE - 0.5;
  g.run.form = 7;
  const r = g.collect('dandelion');
  assert.equal(r.ending.isTrue, true);
  assert.ok(g.state.flags.trueEnding);
});

test('해금은 순서대로, 연구비가 있어야', () => {
  const g = newGame();
  assert.equal(g.buySpecimen('firefly'), false);
  g.state.grant = 1000;
  assert.equal(g.buySpecimen('balloon'), false, '건너뛸 수 없다');
  assert.ok(g.buySpecimen('firefly'));
  assert.equal(g.state.grant, 985);
  assert.ok(g.buySpecimen('balloon'));
  assert.ok(g.buyMission('cvs'));
  assert.equal(g.buyMission('cvs'), false);
  const cost = g.gadgetCost('beam');
  assert.equal(cost, gadgetCost('beam', 0));
  assert.ok(g.upgrade('beam'));
  assert.equal(g.state.gadgets.beam, 1);
  assert.ok(Math.abs(g.specimenGain('dandelion') - SPECIMEN_BY_ID.dandelion.gain * 1.1) < 1e-9);
  assert.equal(g.upgrade('없는장비'), false);
});

test('장비는 최대 레벨에서 멈춘다', () => {
  const g = newGame();
  g.state.grant = 1e12;
  for (const gd of GADGETS) {
    for (let i = 0; i < gd.max; i++) assert.ok(g.upgrade(gd.id), `${gd.id} ${i}`);
    assert.equal(g.gadgetCost(gd.id), null);
    assert.equal(g.upgrade(gd.id), false);
  }
  assert.ok(g.cloakCooldown > 0);
  assert.ok(g.specimensPerMission >= 1);
});

test('기체를 연달아 건드리면 간지럼 사건', () => {
  const g = newGame(always(0));
  let last = null;
  for (let i = 0; i < TICKLE_POKES; i++) last = g.poke();
  assert.equal(last.report.cause, 'tickle');

  const g2 = newGame(always(0));
  for (let i = 0; i < TICKLE_POKES - 1; i++) g2.poke();
  g2.tick(3); // 쉬면 횟수가 풀린다
  assert.equal(g2.poke().report, null);
  assert.equal(g2.phase, 'play');
});

test('자리 비움 성장은 장비가 있어야 하고, 상한과 목표 99% 를 넘지 않는다', () => {
  const g = newGame();
  assert.equal(g.applyOffline(3600), null);
  g.state.gadgets.autopilot = 1;
  assert.equal(g.applyOffline(30), null, '1분 미만은 무시');
  const r = g.applyOffline(3600);
  assert.ok(r.gained > 0);
  const capped = offlineGrowth(30, 1e9, 1, 1);
  const capSeconds = (BAL.offlineCapBaseHours + BAL.offlineCapPerLevelHours) * 3600;
  assert.ok(capped.seconds <= capSeconds + 1e-6);
  const nearGoal = offlineGrowth(GOAL_SIZE * 0.985, 1e9, 5, 100);
  assert.ok(nearGoal.size <= GOAL_SIZE * 0.99 + 1e-6);
  assert.equal(offlineGrowth(GOAL_SIZE, 1000, 5, 1).gained, 0);
});

test('출석 보급품: 하루 한 번, 연속 출석은 이어지고 끊기면 처음부터', () => {
  const g = newGame();
  const a = g.claimDaily('2026-03-01');
  assert.equal(a.streak, 1);
  assert.equal(g.claimDaily('2026-03-01'), null);
  assert.equal(g.claimDaily('2026-03-02').streak, 2);
  assert.equal(g.claimDaily('2026-03-05').streak, 1);
  assert.equal(g.claimDaily('2026-03-04'), null, '날짜를 되돌려도 받을 수 없다');
  assert.equal(g.claimDaily('엉터리'), null);
});

test('업적은 한 번만 지급된다', () => {
  const g = newGame(always(0));
  const got = [];
  g.on('achievement', (a) => got.push(a.id));
  g.collect('dandelion', { watchers: ['farmer'] });
  assert.ok(got.includes('first_contact'));
  const grant = g.state.grant;
  g.nextGeneration();
  g._checkAchievements();
  g._checkAchievements();
  assert.equal(got.filter((id) => id === 'first_contact').length, 1);
  assert.equal(g.state.grant, grant);
});

test('저장본 검증: 깨진 값과 모르는 키를 걸러 낸다', () => {
  assert.deepEqual(sanitize(null), defaultState());
  assert.deepEqual(sanitize('문자열'), defaultState());
  assert.deepEqual(sanitize({ nope: 1 }), defaultState());
  const s = sanitize({
    v: 1,
    grant: -50,
    gen: 'abc',
    run: { size: 1e30, fuel: 999 },
    resist: { cow_moo: 3, hacked: 9 },
    seen: { cow_moo: 2, hacked: 1, kite_string: 4 },
    unlocked: { specimens: { cow: true, bogus: true }, missions: { moon: true } },
    gadgets: { beam: 999, cloak: -3 },
    ach: { first_contact: 0, bogus: 5 },
    stats: { specimens: NaN },
    daily: { last: '2026/01/01', streak: 3 },
    phase: 'discovered',
    lastReport: { cause: 'nope' },
    __proto__: { polluted: true },
  });
  assert.equal(s.grant, 0);
  assert.equal(s.gen, 1);
  assert.equal(s.run.size, GOAL_SIZE);
  assert.equal(s.run.form, 7);
  assert.equal(s.run.fuel, 100);
  assert.deepEqual(Object.keys(s.resist).sort(), ['cow_moo', 'kite_string']);
  assert.equal(s.resist.kite_string, 1);
  assert.equal(s.unlocked.specimens.bogus, undefined);
  assert.ok(s.unlocked.specimens.cow && s.unlocked.specimens.dandelion);
  assert.equal(s.gadgets.beam, 15);
  assert.equal(s.gadgets.cloak, 0);
  assert.equal(s.ach.first_contact, 1);
  assert.equal(s.ach.bogus, undefined);
  assert.equal(s.stats.specimens, 0);
  assert.equal(s.daily.last, null);
  assert.equal(s.phase, 'play', '보고서가 깨졌으면 플레이 상태로 되돌린다');
});

test('저장 코드 왕복', () => {
  const g = newGame(always(0));
  g.collect('dandelion', { watchers: ['farmer'] });
  const code = encodeSave(g.state);
  const back = decodeSave(code);
  assert.deepEqual(back, sanitize(JSON.parse(JSON.stringify(g.state))));
  assert.equal(back.phase, 'discovered');
  assert.equal(back.lastReport.cause, 'gaze_farmer');
  assert.equal(decodeSave('엉터리'), null);
  assert.equal(decodeSave('SHHUFO1.!!!'), null);
  assert.equal(decodeSave(`SHHUFO1.${btoa('[1,2]')}`), null);
});

test('표기', () => {
  assert.equal(formatSize(30), '30.0 cm');
  assert.equal(formatSize(5.5), '5.50 cm');
  assert.equal(formatSize(342), '3.42 m');
  assert.equal(formatSize(12800), '128 m');
  assert.equal(formatSize(125000), '1.25 km');
  assert.equal(formatSize(1500000), '15.0 km');
  assert.equal(formatGain(0.03), '+0.03 cm');
  assert.equal(formatPercent(0.35), '35%');
  assert.equal(formatPercent(0.042), '4.2%');
  assert.equal(formatPercent(0.003), '0.3%');
});

test('콘텐츠 정합성', () => {
  assert.equal(new Set(CAUSES.map((c) => c.id)).size, CAUSES.length, '사건 id 중복 없음');
  assert.equal(CAUSES.length, 51);
  for (const c of CAUSES) assert.ok(['common', 'rare', 'legendary'].includes(c.tier), `${c.id} 등급`);
  for (let i = 1; i < SPECIMENS.length; i++) {
    assert.ok(SPECIMENS[i].cost > SPECIMENS[i - 1].cost);
    assert.ok(SPECIMENS[i].gain > SPECIMENS[i - 1].gain);
  }
  for (let i = 1; i < MISSIONS.length; i++) {
    assert.ok(MISSIONS[i].cost > MISSIONS[i - 1].cost);
    assert.ok(MISSIONS[i].gain > MISSIONS[i - 1].gain);
  }
  for (let i = 1; i < FORMS.length; i++) assert.ok(FORMS[i].min > FORMS[i - 1].min);
});

test('월드: 표본이 생기고, 누르면 모이고, 시선 중에 누르면 들킨다', () => {
  const rng = seededRng(7);
  const g = new Game(defaultState(), { rng: always(0.999), now: () => 1 });
  const w = new World(g, { rng });
  w.setLayout({ w: 390, h: 760, top: 110, groundY: 600, ufoX: 195, ufoY: 300, ufoR: 46 });
  assert.ok(w.specimens.length >= 1);
  assert.equal(w.humans.length, 1);
  const sp = w.specimens[0];
  const hit = w.tap(sp.x, sp.y);
  assert.equal(hit.type, 'specimen');
  assert.equal(sp.state, 'beam');
  assert.equal(g.run.specimens, 1);
  for (let i = 0; i < 40; i++) w.update(0.016);
  assert.ok(!w.specimens.includes(sp), '빔에 끌려온 표본은 사라진다');
  assert.equal(w.tap(-999, -999), null);

  // 농부가 올려다볼 때까지 시간을 돌린다.
  let looked = false;
  w.on('look', () => (looked = true));
  for (let i = 0; i < 4000 && !looked; i++) {
    g.tick(0.05);
    w.update(0.05);
  }
  assert.ok(looked);
  assert.equal(w.watchers.length, 1);
  w.humans[0].gx = w.ufoX; // 시선이 기체를 향하게
  g.rng = always(0);
  const target = w.specimens.find((s) => s.state === 'live');
  assert.ok(target, '화면에 표본이 남아 있다');
  const caught = w.tap(target.x, target.y);
  assert.equal(caught.result.report.cause, 'gaze_farmer');
  assert.equal(target.state, 'caught');
  assert.ok(w.humans[0].spotted);
  assert.equal(w.tap(target.x, target.y), null, '들킨 뒤에는 눌리지 않는다');

  g.nextGeneration();
  w.reset();
  assert.ok(w.specimens.every((s) => s.state === 'live'));
});

test('월드: 기체를 건드리면 반응한다', () => {
  const g = newGame();
  const w = new World(g, { rng: seededRng(3) });
  w.specimens = [];
  const r = w.tap(w.layout.ufoX, w.layout.ufoY);
  assert.equal(r.type, 'ufo');
  assert.equal(r.result.count, 1);
});

test('연료 압축기 레벨마다 정확히 그 개수로 연료가 찬다(소수점 오차 없음)', () => {
  for (let lv = 0; lv <= 5; lv++) {
    const g = newGame(always(0.999), (s) => {
      s.gadgets.tank = lv;
      return s;
    });
    const need = g.specimensPerMission;
    for (let i = 0; i < need - 1; i++) g.collect('dandelion');
    assert.equal(g.canMission('crop').reason, 'fuel', `Lv${lv}: ${need - 1}개로는 부족`);
    g.collect('dandelion');
    assert.ok(g.canMission('crop').ok, `Lv${lv}: ${need}개면 출동`);
  }
});

test('구름 은폐 중에는 승급 셀카로도 들키지 않는다', () => {
  const g = newGame(always(0.5));
  assert.ok(g.activateCloak().ok);
  g.rng = always(0);
  g.run.size = 99.5;
  const r = g.collect('dandelion');
  assert.equal(r.formUps.length, 1);
  assert.equal(r.report, null);
  assert.equal(g.phase, 'play');
});

test('저장본의 Object.prototype 이름은 사건·표본 id 로 받지 않는다', () => {
  const s = sanitize({
    v: 1,
    seen: { constructor: 1, toString: 2, hasOwnProperty: 1, cow_moo: 1 },
    resist: { valueOf: 3 },
    unlocked: { specimens: { constructor: true }, missions: { toString: true } },
    stats: { bySpecimen: { constructor: 9 } },
    phase: 'discovered',
    lastReport: { cause: 'toString' },
  });
  assert.deepEqual(Object.keys(s.seen), ['cow_moo']);
  assert.deepEqual(Object.keys(s.resist), ['cow_moo']);
  assert.deepEqual(Object.keys(s.unlocked.specimens), ['dandelion']);
  assert.deepEqual(Object.keys(s.unlocked.missions), ['crop']);
  assert.deepEqual(s.stats.bySpecimen, {});
  assert.equal(s.phase, 'play');
});
